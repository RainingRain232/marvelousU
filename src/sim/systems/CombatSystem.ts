// Damage calc, targeting priority, attack resolution
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import { UnitState, BuildingState, UnitType } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { destroyBuilding } from "@sim/systems/BuildingSystem";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGGRO_RANGE_SQ = BalanceConfig.AGGRO_RANGE * BalanceConfig.AGGRO_RANGE;

/** Unit types that fire arrow projectiles (visual only). */
const ARROW_UNIT_TYPES: ReadonlySet<UnitType> = new Set([
  UnitType.ARCHER,
  UnitType.LONGBOWMAN,
  UnitType.CROSSBOWMAN,
  UnitType.HORSE_ARCHER,
  UnitType.SHORTBOW,
]);

// ---------------------------------------------------------------------------
// Main system
// ---------------------------------------------------------------------------

export const CombatSystem = {
  update(state: GameState, dt: number): void {
    const toRemove: string[] = [];

    for (const unit of state.units.values()) {
      // Tick dying units and schedule removal
      if (unit.state === UnitState.DIE) {
        unit.deathTimer -= dt;
        if (unit.deathTimer <= 0) toRemove.push(unit.id);
        continue;
      }

      // Tick lifespan for temporary units (lifespanTimer === -1 means immortal)
      if (unit.lifespanTimer >= 0) {
        unit.lifespanTimer -= dt;
        if (unit.lifespanTimer <= 0) {
          unit.lifespanTimer = 0;
          killUnit(unit);
          continue;
        }
      }

      // Skip units that can't participate in combat
      if (unit.state === UnitState.CAST || unit.idleInterruptionTimer > 0) continue;

      // Tick attack cooldown
      if (unit.attackTimer > 0) unit.attackTimer -= dt;

      // --- Building target: if targetId points to a building, handle separately ---
      if (unit.targetId && !state.units.has(unit.targetId)) {
        const building = state.buildings.get(unit.targetId);
        if (
          building &&
          building.state === BuildingState.ACTIVE &&
          building.owner !== unit.owner
        ) {
          _attackBuilding(state, unit, building, dt);
          continue;
        }
        // Building gone or invalid — clear targetId, let normal flow reassign
        unit.targetId = null;
      }

      // --- Diplomat units never engage in combat ---
      if (unit.diplomatOnly) continue;

      // --- Unit target selection (skipped for siege-only units) ---
      if (unit.siegeOnly) {
        // If no building target remains, drop out of ATTACK state so AISystem
        // can route to the next building/base.
        if (!unit.targetId && unit.state === UnitState.ATTACK) {
          unit.stateMachine.setState(UnitState.MOVE) ||
            unit.stateMachine.forceState(UnitState.MOVE);
          unit.state = UnitState.MOVE;
          unit.path = null;
          unit.pathIndex = 0;
          EventBus.emit("unitStateChanged", {
            unitId: unit.id,
            from: UnitState.ATTACK,
            to: UnitState.MOVE,
          });
        }
        continue;
      }

      const def = UNIT_DEFINITIONS[unit.type];
      const target = def.isHealer
        ? resolveFriendlyTarget(state, unit)
        : resolveTarget(state, unit);

      if (!target) {
        // No enemy in aggro range — clear target and drop out of ATTACK state
        unit.targetId = null;
        if (unit.state === UnitState.ATTACK) {
          unit.stateMachine.setState(UnitState.MOVE) ||
            unit.stateMachine.forceState(UnitState.MOVE);
          unit.state = UnitState.MOVE;
          unit.path = null;
          unit.pathIndex = 0;
          EventBus.emit("unitStateChanged", {
            unitId: unit.id,
            from: UnitState.ATTACK,
            to: UnitState.MOVE,
          });
        }
        continue;
      }

      unit.targetId = target.id;

      const dist = Math.sqrt(distanceSq(unit.position, target.position));

      if (dist <= unit.range) {
        // --- In attack range: enter ATTACK state and strike ---
        if (unit.state !== UnitState.ATTACK) {
          const prev = unit.state;
          unit.stateMachine.forceState(UnitState.ATTACK);
          unit.state = UnitState.ATTACK;
          EventBus.emit("unitStateChanged", {
            unitId: unit.id,
            from: prev,
            to: UnitState.ATTACK,
          });
        }

        if (unit.attackTimer <= 0 && !def.isHealer) {
          applyDamage(unit, target, state);
        }
      } else {
        // --- Out of range: ensure unit is moving toward target ---
        if (unit.state === UnitState.ATTACK) {
          unit.stateMachine.setState(UnitState.MOVE) ||
            unit.stateMachine.forceState(UnitState.MOVE);
          unit.state = UnitState.MOVE;
          // Clear path so MovementSystem re-routes toward the new target tile
          unit.path = null;
          unit.pathIndex = 0;
          EventBus.emit("unitStateChanged", {
            unitId: unit.id,
            from: UnitState.ATTACK,
            to: UnitState.MOVE,
          });
        } else if (unit.state === UnitState.IDLE) {
          unit.stateMachine.setState(UnitState.MOVE) ||
            unit.stateMachine.forceState(UnitState.MOVE);
          unit.state = UnitState.MOVE;
          unit.path = null;
          unit.pathIndex = 0;
          EventBus.emit("unitStateChanged", {
            unitId: unit.id,
            from: UnitState.IDLE,
            to: UnitState.MOVE,
          });
        }
      }
    }

    // Remove dead units from state
    for (const id of toRemove) {
      state.units.delete(id);
    }
  },
};

// ---------------------------------------------------------------------------
// Building attack
// ---------------------------------------------------------------------------

/**
 * Handle a unit attacking a building it is already pathing toward.
 * Enters ATTACK state when in range, deals damage each attackTimer cycle,
 * and calls destroyBuilding when hp reaches 0.
 */
function _attackBuilding(
  state: GameState,
  unit: Unit,
  building: Building,
  _dt: number,
): void {
  const dist = Math.sqrt(distanceSq(unit.position, building.position));

  if (dist <= unit.range + 1) {
    // In range — enter ATTACK state
    if (unit.state !== UnitState.ATTACK) {
      const prev = unit.state;
      unit.stateMachine.forceState(UnitState.ATTACK);
      unit.state = UnitState.ATTACK;
      EventBus.emit("unitStateChanged", {
        unitId: unit.id,
        from: prev,
        to: UnitState.ATTACK,
      });
    }

    if (unit.attackTimer <= 0) {
      const def = UNIT_DEFINITIONS[unit.type];
      const attackInterval = 1 / def.attackSpeed;

      let damage = unit.atk;
      if (def.isChargeUnit && !unit.hasCharged) {
        damage *= 5;
        unit.hasCharged = true;
      }

      building.health -= damage;
      unit.attackTimer = attackInterval;

      if (building.health <= 0) {
        building.health = 0;
        destroyBuilding(state, building.id);
        unit.targetId = null;
      }
    }
  } else {
    // Out of range — keep moving (path already set by AISystem)
    if (unit.state === UnitState.ATTACK) {
      unit.stateMachine.setState(UnitState.MOVE) ||
        unit.stateMachine.forceState(UnitState.MOVE);
      unit.state = UnitState.MOVE;
      unit.path = null;
      unit.pathIndex = 0;
      EventBus.emit("unitStateChanged", {
        unitId: unit.id,
        from: UnitState.ATTACK,
        to: UnitState.MOVE,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

/**
 * Find the best living enemy unit within aggro range.
 *
 * If the unit has huntTargets, always prefer the nearest enemy of those types.
 * If no hunt target is in range, fall back to the nearest enemy.
 */
function resolveTarget(state: GameState, unit: Unit): Unit | null {
  const hasHunt = unit.huntTargets.length > 0;

  // If we already have a valid target, only keep it if it's still the best choice.
  // For hunters: if the current target is a hunt type and still valid, keep it.
  // For normal units: keep the current target if still alive and in range.
  if (unit.targetId) {
    const existing = state.units.get(unit.targetId);
    if (
      existing &&
      existing.state !== UnitState.DIE &&
      existing.owner !== unit.owner &&
      distanceSq(unit.position, existing.position) <= AGGRO_RANGE_SQ
    ) {
      // For hunters: only keep current target if it is a hunt type, or if there
      // are no hunt targets in range (will be determined below).
      if (!hasHunt || unit.huntTargets.includes(existing.type)) {
        return existing;
      }
      // Current target is not a hunt type — fall through to scan for a hunt target
    }
  }

  // Scan all enemies in aggro range
  let nearestHunt: Unit | null = null;
  let nearestHuntDsq = AGGRO_RANGE_SQ + 1;
  let nearest: Unit | null = null;
  let nearestDistSq = AGGRO_RANGE_SQ + 1;

  for (const candidate of state.units.values()) {
    if (candidate.id === unit.id) continue;
    if (candidate.owner === unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;

    const dsq = distanceSq(unit.position, candidate.position);
    if (dsq > AGGRO_RANGE_SQ) continue;

    if (hasHunt && unit.huntTargets.includes(candidate.type)) {
      if (dsq < nearestHuntDsq) {
        nearestHunt = candidate;
        nearestHuntDsq = dsq;
      }
    }
    if (dsq < nearestDistSq) {
      nearest = candidate;
      nearestDistSq = dsq;
    }
  }

  // Prefer hunt target if one is in range, otherwise nearest
  return nearestHunt ?? nearest;
}

/**
 * Find the nearest living friendly unit that is below its max HP.
 */
function resolveFriendlyTarget(state: GameState, unit: Unit): Unit | null {
  let nearest: Unit | null = null;
  let nearestDistSq = AGGRO_RANGE_SQ + 1;

  for (const candidate of state.units.values()) {
    if (candidate.owner !== unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;
    if (candidate.hp >= candidate.maxHp) continue;

    const dsq = distanceSq(unit.position, candidate.position);
    if (dsq > AGGRO_RANGE_SQ) continue;
    if (dsq < nearestDistSq) {
      nearest = candidate;
      nearestDistSq = dsq;
    }
  }

  return nearest;
}

// ---------------------------------------------------------------------------
// Damage application
// ---------------------------------------------------------------------------

function applyDamage(attacker: Unit, target: Unit, state: GameState): void {
  const def = UNIT_DEFINITIONS[attacker.type];
  const attackInterval = 1 / def.attackSpeed;

  let damage = attacker.atk;
  if (def.isChargeUnit && !attacker.hasCharged) {
    damage *= 5;
    attacker.hasCharged = true;
  }

  target.hp -= damage;

  EventBus.emit("unitDamaged", {
    unitId: target.id,
    amount: damage,
    attackerId: attacker.id,
  });

  // Emit arrow projectile event for archer-type units (visual only)
  if (ARROW_UNIT_TYPES.has(attacker.type)) {
    EventBus.emit("unitAttacked", {
      attackerId: attacker.id,
      targetId: target.id,
      attackerPos: { x: attacker.position.x, y: attacker.position.y },
      targetPos: { x: target.position.x, y: target.position.y },
    });
  }

  // Reset cooldown
  attacker.attackTimer = attackInterval;

  // Handle death
  if (target.hp <= 0) {
    target.hp = 0;
    killUnit(target, attacker.id, state);
  }
}

// ---------------------------------------------------------------------------
// Kill resolution
// ---------------------------------------------------------------------------

export function killUnit(unit: Unit, killerUnitId?: string, state?: GameState): void {
  if (unit.state === UnitState.DIE) return; // already dying

  const prev = unit.state;
  unit.stateMachine.forceState(UnitState.DIE);
  unit.state = UnitState.DIE;
  unit.deathTimer = BalanceConfig.UNIT_DEATH_LINGER;
  unit.targetId = null;
  unit.path = null;

  EventBus.emit("unitStateChanged", {
    unitId: unit.id,
    from: prev,
    to: UnitState.DIE,
  });

  // Award XP to the killer
  if (killerUnitId && state) {
    const killer = state.units.get(killerUnitId);
    if (killer && killer.state !== UnitState.DIE) {
      _awardXp(killer, unit);
    }
  }

  EventBus.emit("unitDied", {
    unitId: unit.id,
    killerUnitId,
  });
}

// ---------------------------------------------------------------------------
// Experience & levelling
// ---------------------------------------------------------------------------

/**
 * Returns the XP required to reach the next level for a unit.
 *
 * Level 1 costs = unit's own gold cost.
 * Each subsequent level costs 30% more than the previous level cost.
 * So level N cost = baseCost * 1.3^(level)  (level is 0-indexed current level)
 */
function _xpForNextLevel(unit: Unit): number {
  const def = UNIT_DEFINITIONS[unit.type];
  const baseCost = def.cost;
  return Math.floor(baseCost * Math.pow(1.3, unit.level));
}

/**
 * Award XP equal to the killed unit's gold cost to the killer.
 * Handles multi-level-ups if enough XP is accumulated.
 */
function _awardXp(killer: Unit, killed: Unit): void {
  const killedDef = UNIT_DEFINITIONS[killed.type];
  const xpGain = killedDef.cost;
  if (xpGain <= 0) return;

  killer.xp += xpGain;

  // Check for level-up(s) — a single kill could grant multiple levels
  let levelled = false;
  while (killer.xp >= _xpForNextLevel(killer)) {
    killer.xp -= _xpForNextLevel(killer);
    _applyLevelUp(killer);
    levelled = true;
  }

  if (levelled) {
    EventBus.emit("unitLevelUp", { unitId: killer.id, newLevel: killer.level });
  }
}

/** Apply stat bonuses for gaining one level. */
function _applyLevelUp(unit: Unit): void {
  unit.level += 1;

  const BOOST = 1.2;
  unit.maxHp = Math.floor(unit.maxHp * BOOST);
  unit.hp = Math.min(unit.hp + Math.floor(unit.maxHp * (BOOST - 1)), unit.maxHp);
  unit.atk = Math.floor(unit.atk * BOOST);
  unit.speed = unit.speed * BOOST;
}
