// Damage calc, targeting priority, attack resolution
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import { UnitState, BuildingState } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { destroyBuilding } from "@sim/systems/BuildingSystem";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGGRO_RANGE_SQ = BalanceConfig.AGGRO_RANGE * BalanceConfig.AGGRO_RANGE;

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
      if (unit.state === UnitState.CAST) continue;

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

      // --- Unit target selection ---
      const target = resolveTarget(state, unit);

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

        if (unit.attackTimer <= 0) {
          applyDamage(unit, target);
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
      building.health -= unit.atk;
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
 * Find the nearest living enemy unit within aggro range.
 * Returns null if no valid target exists.
 */
function resolveTarget(state: GameState, unit: Unit): Unit | null {
  // Prefer existing target if still alive and in aggro range
  if (unit.targetId) {
    const existing = state.units.get(unit.targetId);
    if (
      existing &&
      existing.state !== UnitState.DIE &&
      existing.owner !== unit.owner &&
      distanceSq(unit.position, existing.position) <= AGGRO_RANGE_SQ
    ) {
      return existing;
    }
  }

  // Scan for nearest enemy
  let nearest: Unit | null = null;
  let nearestDistSq = AGGRO_RANGE_SQ + 1; // just outside aggro range

  for (const candidate of state.units.values()) {
    if (candidate.id === unit.id) continue;
    if (candidate.owner === unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;

    const dsq = distanceSq(unit.position, candidate.position);
    if (dsq <= AGGRO_RANGE_SQ && dsq < nearestDistSq) {
      nearest = candidate;
      nearestDistSq = dsq;
    }
  }

  return nearest;
}

// ---------------------------------------------------------------------------
// Damage application
// ---------------------------------------------------------------------------

function applyDamage(attacker: Unit, target: Unit): void {
  const def = UNIT_DEFINITIONS[attacker.type];
  const attackInterval = 1 / def.attackSpeed;

  target.hp -= attacker.atk;

  EventBus.emit("unitDamaged", {
    unitId: target.id,
    amount: attacker.atk,
    attackerId: attacker.id,
  });

  // Reset cooldown
  attacker.attackTimer = attackInterval;

  // Handle death
  if (target.hp <= 0) {
    target.hp = 0;
    killUnit(target, attacker.id);
  }
}

// ---------------------------------------------------------------------------
// Kill resolution
// ---------------------------------------------------------------------------

export function killUnit(unit: Unit, killerUnitId?: string): void {
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

  EventBus.emit("unitDied", {
    unitId: unit.id,
    killerUnitId,
  });
}
