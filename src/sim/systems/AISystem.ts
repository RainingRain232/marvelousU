// Auto-battle unit AI — march-to-base, building diversion.
//
// Runs AFTER CombatSystem in the tick order so it only acts on units that
// combat did not already engage:
//
//   1. IDLE + no targetId → start marching toward enemy base (MOVE).
//   2. MOVE + no combat target → if an enemy building is within
//      BUILDING_AGGRO_RANGE, redirect toward it (record targetId = buildingId,
//      re-path to building tile).
//   3. ATTACK — CombatSystem owns unit-vs-unit targeting (nearest enemy).
//      AISystem only clears stale references so the unit can resume marching.
//
// Building diversion:
//   Enemy *buildings* (not bases) within BUILDING_AGGRO_RANGE take precedence
//   over the march-to-base default goal. Units attack buildings the same way
//   they attack units — CombatSystem handles the actual damage; AISystem only
//   sets the targetId and re-paths the unit.

import type { GameState } from "@sim/state/GameState";
import { isEnemy, isAlly } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import { UnitState, UnitType, BuildingState, AIPersonality } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { startMoving } from "@sim/systems/MovementSystem";
import { findPath } from "@sim/core/Grid";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tiles — how far a unit scans for enemy buildings to divert toward. */
const BUILDING_AGGRO_RANGE = 5;
const BUILDING_AGGRO_RANGE_SQ = BUILDING_AGGRO_RANGE * BUILDING_AGGRO_RANGE;

/** Tiles — used to validate unit targets in aggro range. */
const AGGRO_RANGE_SQ = BalanceConfig.AGGRO_RANGE * BalanceConfig.AGGRO_RANGE;

/** Tiles — how far homeguard units patrol from their origin. */
const HOMEGUARD_PATROL_RANGE = 5;
const HOMEGUARD_PATROL_RANGE_SQ = HOMEGUARD_PATROL_RANGE * HOMEGUARD_PATROL_RANGE;

// ---------------------------------------------------------------------------
// Personality helpers
// ---------------------------------------------------------------------------

/**
 * Returns the AI personality for a given unit's owner. Falls back to BALANCED
 * if the player state does not exist or if the player is not AI-controlled.
 */
function _getPersonality(state: GameState, owner: string): AIPersonality {
  const player = state.players.get(owner);
  if (!player || !player.isAI) return AIPersonality.BALANCED;
  return player.aiPersonality;
}

/**
 * Returns the effective aggro range squared, adjusted for personality.
 * AGGRESSIVE units scan further for enemies to pick fights earlier.
 */
function _effectiveAggroRangeSq(personality: AIPersonality): number {
  if (personality === AIPersonality.AGGRESSIVE) {
    const r = BalanceConfig.AGGRO_RANGE + BalanceConfig.AI_AGGRESSIVE_AGGRO_RANGE_BONUS;
    return r * r;
  }
  return AGGRO_RANGE_SQ;
}

/**
 * Returns the effective building aggro range squared, adjusted for personality.
 * AGGRESSIVE units detect buildings from further away to destroy them sooner.
 * DEFENSIVE units ignore enemy buildings unless very close.
 */
function _effectiveBuildingAggroRangeSq(personality: AIPersonality): number {
  if (personality === AIPersonality.AGGRESSIVE) {
    const r = BUILDING_AGGRO_RANGE + 3;
    return r * r;
  }
  if (personality === AIPersonality.DEFENSIVE) {
    const r = BUILDING_AGGRO_RANGE - 2;
    return Math.max(4, r * r);
  }
  return BUILDING_AGGRO_RANGE_SQ;
}

// ---------------------------------------------------------------------------
// Main system
// ---------------------------------------------------------------------------

export const AISystem = {
  update(state: GameState, _dt: number): void {
    for (const unit of state.units.values()) {
      // Skip dead / casting / interrupted units — nothing to decide
      if (unit.state === UnitState.DIE) continue;
      if (unit.state === UnitState.CAST) continue;
      if (unit.idleInterruptionTimer > 0) continue;

      if (unit.diplomatOnly) {
        // Settler/Engineer movement is handled by SimLoop override, not AI
        if (unit.type === UnitType.SETTLER || unit.type === UnitType.ENGINEER) continue;
        _handleDiplomat(state, unit);
        continue;
      }

      switch (unit.state) {
        case UnitState.IDLE:
          _handleIdle(state, unit);
          break;
        case UnitState.MOVE:
          _handleMove(state, unit);
          break;
        case UnitState.ATTACK:
          _handleAttack(state, unit);
          break;
      }
    }
  },
};

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

/**
 * IDLE units: if CombatSystem found no target, start marching toward the
 * enemy base. This keeps units moving even when no enemies are in sight.
 */
function _handleIdle(state: GameState, unit: Unit): void {
  // CombatSystem already transitioned the unit to MOVE when it found a target
  // out of range. Only act if there's still no target.
  if (unit.targetId) return;

  // Player command override — prioritise manual commands over AI goals
  if (unit.playerControlled) {
    if (unit.playerCommandTargetId) {
      const target = state.units.get(unit.playerCommandTargetId)
                  ?? state.buildings.get(unit.playerCommandTargetId);
      if (target) {
        unit.targetId = unit.playerCommandTargetId;
        startMoving(state, unit, target.position);
        return;
      }
      // Target gone — clear command, revert to AI
      unit.playerCommandTargetId = null;
      unit.playerControlled = false;
    } else if (unit.playerCommandGoal) {
      startMoving(state, unit, unit.playerCommandGoal);
      return;
    }
  }

  const def = UNIT_DEFINITIONS[unit.type];
  const personality = _getPersonality(state, unit.owner);
  let goal: { x: number; y: number } | null;

  if (def.isHealer) {
    goal = _healerGoal(state, unit);
  } else if (unit.homeguard) {
    goal = _homeguardGoal(state, unit);
  } else {
    goal = _personalityGoal(state, unit, personality);
  }
  if (!goal) return;

  startMoving(state, unit, goal);
}

/**
 * MOVE units: check for nearby enemy buildings and divert if one is closer
 * than BUILDING_AGGRO_RANGE. CombatSystem owns unit-vs-unit targeting.
 */
function _handleMove(state: GameState, unit: Unit): void {
  // Player command override — skip AI re-pathing while moving to player goal
  if (unit.playerControlled && !unit.playerCommandTargetId) {
    if (!unit.path || unit.pathIndex >= unit.path.length) {
      // Reached destination — revert to AI
      unit.playerControlled = false;
      unit.playerCommandGoal = null;
    } else {
      return; // Still moving to player goal
    }
  }

  const def = UNIT_DEFINITIONS[unit.type];

  if (unit.targetId) {
    if (def.isHealer) {
      // Healers target friendly units — check their target is still valid
      const unitTarget = state.units.get(unit.targetId);
      if (
        unitTarget &&
        unitTarget.state !== UnitState.DIE &&
        isAlly(state, unitTarget.owner, unit.owner) &&
        distanceSq(unit.position, unitTarget.position) <= AGGRO_RANGE_SQ
      ) {
        return;
      }
    } else {
      // Check if it's a valid building target first.
      const buildingTarget = state.buildings.get(unit.targetId);
      if (
        buildingTarget &&
        buildingTarget.state === BuildingState.ACTIVE &&
        buildingTarget.owner !== null &&
        isEnemy(state, unit.owner, buildingTarget.owner)
      ) {
        // Still heading toward a valid enemy building — leave path alone.
        return;
      }

      if (!unit.siegeOnly) {
        // Check if it's a valid unit target — if so, leave it for CombatSystem.
        const unitTarget = state.units.get(unit.targetId);
        if (
          unitTarget &&
          unitTarget.state !== UnitState.DIE &&
          isEnemy(state, unit.owner, unitTarget.owner) &&
          distanceSq(unit.position, unitTarget.position) <= AGGRO_RANGE_SQ
        ) {
          return;
        }
      }
    }

    // Target gone / dead / destroyed / out of range — clear it.
    unit.targetId = null;
    unit.path = null;
    unit.pathIndex = 0;
  }

  if (def.isHealer) {
    // Healers never divert to buildings — always head toward friendlies or own castle.
    if (!unit.path || unit.pathIndex >= unit.path.length) {
      const goal = _healerGoal(state, unit);
      if (goal) startMoving(state, unit, goal);
    }
    return;
  }

  const personality = _getPersonality(state, unit.owner);

  // DEFENSIVE personality: skip building diversion if close to own base
  // (stay near base to defend). ECONOMY personality also skips diversion
  // in favor of capturing neutral buildings.
  if (personality !== AIPersonality.ECONOMY) {
    // Try to divert toward a nearby enemy building.
    const nearbyBuilding = _findNearbyEnemyBuilding(state, unit, personality);
    if (nearbyBuilding) {
      _divertToBuilding(state, unit, nearbyBuilding);
      return;
    }
  }

  // Otherwise ensure we're still heading somewhere. If path is
  // already set and leading somewhere, leave it alone — MovementSystem owns it.
  if (!unit.path || unit.pathIndex >= unit.path.length) {
    let goal: { x: number; y: number } | null;
    if (unit.homeguard) {
      goal = _homeguardGoal(state, unit);
    } else {
      goal = _personalityGoal(state, unit, personality);
    }
    if (goal) startMoving(state, unit, goal);
  }
}

/**
 * ATTACK units: CombatSystem owns damage and nearest-enemy selection.
 * AISystem only clears stale building/unit references so the unit can
 * resume marching when the target is gone.
 */
function _handleAttack(state: GameState, unit: Unit): void {
  if (!unit.targetId) return; // CombatSystem will transition to MOVE if needed

  const def = UNIT_DEFINITIONS[unit.type];
  const personality = _getPersonality(state, unit.owner);
  const aggroRangeSq = _effectiveAggroRangeSq(personality);

  if (def.isHealer) {
    // Healers target friendly units — validate accordingly
    const currentTarget = state.units.get(unit.targetId);
    if (
      currentTarget &&
      currentTarget.state !== UnitState.DIE &&
      isAlly(state, currentTarget.owner, unit.owner) &&
      distanceSq(unit.position, currentTarget.position) <= aggroRangeSq
    ) {
      return;
    }
    unit.targetId = null;
    return;
  }

  // If targeting a building, leave it alone — CombatSystem handles damage
  const buildingTarget = state.buildings.get(unit.targetId);
  if (
    buildingTarget &&
    buildingTarget.state === BuildingState.ACTIVE &&
    buildingTarget.owner !== null &&
    isEnemy(state, unit.owner, buildingTarget.owner)
  ) {
    return;
  }

  if (unit.siegeOnly) {
    // Siege units never target units — clear any stale unit target and re-march
    unit.targetId = null;
    return;
  }

  // Check if current unit target is still valid (personality-adjusted aggro range)
  const currentTarget = state.units.get(unit.targetId);
  if (
    currentTarget &&
    currentTarget.state !== UnitState.DIE &&
    isEnemy(state, unit.owner, currentTarget.owner) &&
    distanceSq(unit.position, currentTarget.position) <= aggroRangeSq
  ) {
    return; // Target still valid — CombatSystem handles it
  }

  // Target is gone — clear so CombatSystem picks a new nearest on next tick
  unit.targetId = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the nearest active enemy building within aggro range (personality-adjusted).
 * Ignores the unit's own-side buildings.
 */
function _findNearbyEnemyBuilding(
  state: GameState,
  unit: Unit,
  personality: AIPersonality = AIPersonality.BALANCED,
): Building | null {
  const personalityRangeSq = _effectiveBuildingAggroRangeSq(personality);
  // Long-range siege units can spot buildings at their full attack range.
  const rangeSq = Math.max(personalityRangeSq, unit.range * unit.range);
  let nearest: Building | null = null;
  let nearestDsq = rangeSq + 1;

  for (const building of state.buildings.values()) {
    if (building.owner === null) continue; // neutral — ignore
    if (!isEnemy(state, unit.owner, building.owner)) continue;
    if (building.state !== BuildingState.ACTIVE) continue;

    const dsq = distanceSq(unit.position, building.position);
    if (dsq <= rangeSq && dsq < nearestDsq) {
      nearest = building;
      nearestDsq = dsq;
    }
  }

  return nearest;
}

/**
 * Redirect a unit toward an enemy building: set targetId and re-path.
 * Uses the building's top-left tile as the path goal.
 */
function _divertToBuilding(
  state: GameState,
  unit: Unit,
  building: Building,
): void {
  if (
    unit.targetId === building.id &&
    unit.path &&
    unit.pathIndex < unit.path.length
  ) {
    return; // Already heading here
  }

  unit.targetId = building.id;
  unit.path = findPath(
    state.battlefield,
    { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
    building.position,
  );
  unit.pathIndex = 0;
}

/**
 * Diplomat units ignore all combat and seek the nearest neutral building to
 * stand on and capture. Once a target is claimed, they hold position until it
 * is captured or taken by someone else, then find the next neutral building.
 */
function _handleDiplomat(state: GameState, unit: Unit): void {
  // If already heading to a valid neutral building target, leave path alone.
  if (unit.targetId) {
    const target = state.buildings.get(unit.targetId);
    if (target && target.state === BuildingState.ACTIVE && target.owner === null) {
      // Still valid — MovementSystem/BuildingSystem handle the rest.
      return;
    }
    // Target gone or no longer neutral — clear and find another.
    unit.targetId = null;
    unit.path = null;
    unit.pathIndex = 0;
  }

  const neutral = _findNearestNeutralBuilding(state, unit);
  if (!neutral) return;

  unit.targetId = neutral.id;
  unit.path = findPath(
    state.battlefield,
    { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
    neutral.position,
  );
  unit.pathIndex = 0;
  if (unit.state === UnitState.IDLE) {
    startMoving(state, unit, neutral.position);
  }
}

/** Find the nearest active neutral building (owner === null). */
function _findNearestNeutralBuilding(
  state: GameState,
  unit: Unit,
): Building | null {
  let nearest: Building | null = null;
  let nearestDsq = Infinity;

  for (const building of state.buildings.values()) {
    if (building.owner !== null) continue;
    if (building.state !== BuildingState.ACTIVE) continue;

    const dsq = distanceSq(unit.position, building.position);
    if (dsq < nearestDsq) {
      nearest = building;
      nearestDsq = dsq;
    }
  }

  return nearest;
}

/**
 * Goal for healer units: position of the nearest friendly unit, or the
 * healer's own castle spawn point as a fallback.
 */
function _healerGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  // Find nearest friendly unit (any alive friendly, not just injured)
  let nearest: Unit | null = null;
  let nearestDsq = Infinity;

  for (const candidate of state.units.values()) {
    if (candidate.id === unit.id) continue;
    if (candidate.owner !== unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;

    const dsq = distanceSq(unit.position, candidate.position);
    if (dsq < nearestDsq) {
      nearest = candidate;
      nearestDsq = dsq;
    }
  }

  if (nearest) return { ...nearest.position };

  // Fallback: own castle spawn point
  const ownBase = [...state.bases.values()].find((b) => b.owner === unit.owner);
  if (!ownBase) return null;
  return {
    x: ownBase.position.x + ownBase.spawnOffset.x,
    y: ownBase.position.y + ownBase.spawnOffset.y,
  };
}

/**
 * Patrol goal for homeguard units: pick a random friendly building within
 * HOMEGUARD_PATROL_RANGE of the unit's origin, with a small random offset
 * for natural-looking movement. Falls back to the origin itself.
 */
function _homeguardGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  const origin = unit.homeguardOrigin;
  if (!origin) return null;

  // Collect friendly buildings within patrol range of origin
  const nearby: Building[] = [];
  for (const building of state.buildings.values()) {
    if (building.owner !== unit.owner) continue;
    if (building.state !== BuildingState.ACTIVE) continue;
    if (distanceSq(origin, building.position) <= HOMEGUARD_PATROL_RANGE_SQ) {
      nearby.push(building);
    }
  }

  // Random offset for natural patrol (±2 tiles)
  const offsetX = (Math.random() - 0.5) * 4;
  const offsetY = (Math.random() - 0.5) * 4;

  if (nearby.length > 0) {
    const target = nearby[Math.floor(Math.random() * nearby.length)];
    return {
      x: target.position.x + offsetX,
      y: target.position.y + offsetY,
    };
  }

  // Fallback: wander around origin
  return {
    x: origin.x + offsetX,
    y: origin.y + offsetY,
  };
}

/**
 * Returns the player's rally flag position, or null if no flag is set.
 * Siege-only units ignore the flag (they always target buildings/bases).
 */
function _rallyFlagGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  if (unit.siegeOnly) return null;
  const flag = state.rallyFlags.get(unit.owner);
  if (!flag) return null;
  return { x: flag.x, y: flag.y };
}

// ---------------------------------------------------------------------------
// Personality-driven goal selection
// ---------------------------------------------------------------------------

/**
 * Selects the goal for a unit based on its owner's AI personality.
 *
 * - AGGRESSIVE: Always pushes toward the enemy base. Ignores rally flag.
 * - DEFENSIVE: Stays near own base until enemies approach, then engages.
 *              Uses a wider patrol area around own base.
 * - ECONOMY: Prioritises capturing neutral buildings. Falls back to
 *            the enemy base when none are available.
 * - BALANCED: Default behavior — rally flag > enemy base.
 */
function _personalityGoal(
  state: GameState,
  unit: Unit,
  personality: AIPersonality,
): { x: number; y: number } | null {
  switch (personality) {
    case AIPersonality.AGGRESSIVE:
      return _aggressiveGoal(state, unit);
    case AIPersonality.DEFENSIVE:
      return _defensiveGoal(state, unit);
    case AIPersonality.ECONOMY:
      return _economyGoal(state, unit);
    case AIPersonality.BALANCED:
    default:
      return _rallyFlagGoal(state, unit) ?? _enemyBaseGoal(state, unit);
  }
}

/**
 * AGGRESSIVE: Skip rally flag, always march straight to the enemy base.
 * Aggressive AI pushes early and hard.
 */
function _aggressiveGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  // Aggressive AI ignores rally flags — always pushes toward enemy base.
  return _enemyBaseGoal(state, unit);
}

/**
 * DEFENSIVE: Stay near own base. Only push when enemies are detected
 * within the defensive patrol range around the unit's own base.
 * If no enemies are near, patrol near own base buildings.
 */
function _defensiveGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  const defRange = BalanceConfig.AI_DEFENSIVE_PATROL_RANGE;
  const defRangeSq = defRange * defRange;

  // Find own base position
  const ownBase = [...state.bases.values()].find((b) => b.owner === unit.owner);
  if (!ownBase) return _enemyBaseGoal(state, unit);

  const basePos = {
    x: ownBase.position.x + ownBase.spawnOffset.x,
    y: ownBase.position.y + ownBase.spawnOffset.y,
  };

  // Check if any enemy units are near our base — if so, engage them
  for (const candidate of state.units.values()) {
    if (candidate.owner === unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;
    if (!isEnemy(state, unit.owner, candidate.owner)) continue;

    if (distanceSq(basePos, candidate.position) <= defRangeSq) {
      // Enemy near base — march toward them
      return { ...candidate.position };
    }
  }

  // No enemies near base — patrol near own base with random offset
  const offsetX = (Math.random() - 0.5) * 6;
  const offsetY = (Math.random() - 0.5) * 6;
  return {
    x: basePos.x + offsetX,
    y: basePos.y + offsetY,
  };
}

/**
 * ECONOMY: Prioritise capturing neutral buildings within range.
 * Falls back to rally flag → enemy base when no neutrals remain.
 */
function _economyGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  const captureRange = BalanceConfig.AI_ECONOMY_CAPTURE_PRIORITY_RANGE;
  const captureRangeSq = captureRange * captureRange;

  // Find nearest uncaptured neutral building within priority range
  let nearestNeutral: Building | null = null;
  let nearestDsq = captureRangeSq + 1;

  for (const building of state.buildings.values()) {
    if (building.owner !== null) continue; // already captured
    if (building.state !== BuildingState.ACTIVE) continue;

    const dsq = distanceSq(unit.position, building.position);
    if (dsq <= captureRangeSq && dsq < nearestDsq) {
      nearestNeutral = building;
      nearestDsq = dsq;
    }
  }

  if (nearestNeutral) {
    return { ...nearestNeutral.position };
  }

  // No neutrals left — fall back to default behavior
  return _rallyFlagGoal(state, unit) ?? _enemyBaseGoal(state, unit);
}

/**
 * Returns the enemy base's spawn-point tile — the default march destination.
 *
 * Priority targeting (3-4 player): if the unit's owner has a priority target
 * set, head toward that player's base. Otherwise pick the nearest enemy base.
 *
 * 2-player fallback: opposite direction (west↔east) as before.
 */
function _enemyBaseGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  // Check priority target first
  const priorityTarget = state.priorityTargets.get(unit.owner);
  if (priorityTarget) {
    const priorityBase = [...state.bases.values()].find(
      (b) => b.owner === priorityTarget,
    );
    // Only use priority target if that player's base still exists
    if (priorityBase) {
      return {
        x: priorityBase.position.x + priorityBase.spawnOffset.x,
        y: priorityBase.position.y + priorityBase.spawnOffset.y,
      };
    }
  }

  // Find nearest enemy base
  let nearestBase: { x: number; y: number } | null = null;
  let nearestDsq = Infinity;

  for (const base of state.bases.values()) {
    if (base.owner === unit.owner) continue;
    if (!isEnemy(state, unit.owner, base.owner)) continue;

    const spawnPos = {
      x: base.position.x + base.spawnOffset.x,
      y: base.position.y + base.spawnOffset.y,
    };
    const dsq = distanceSq(unit.position, spawnPos);
    if (dsq < nearestDsq) {
      nearestBase = spawnPos;
      nearestDsq = dsq;
    }
  }

  return nearestBase;
}
