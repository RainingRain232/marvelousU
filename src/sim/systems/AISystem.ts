// Auto-battle unit AI — target selection, march-to-base, building diversion.
//
// Runs AFTER CombatSystem in the tick order so it only acts on units that
// combat did not already engage:
//
//   1. IDLE + no targetId → start marching toward enemy base (MOVE).
//   2. MOVE + no combat target → if an enemy building is within
//      BUILDING_AGGRO_RANGE, redirect toward it (record targetId = buildingId,
//      re-path to building tile).
//   3. ATTACK + targetId still set → replace CombatSystem's nearest-enemy
//      selection with the highest-priority enemy in aggro range when the
//      current target dies or is out of range.
//
// Priority order (highest first):
//   MAGE → ARCHER → PIKEMAN → SWORDSMAN → KNIGHT → SUMMONED
//
// Building diversion:
//   Enemy *buildings* (not bases) within BUILDING_AGGRO_RANGE take precedence
//   over the march-to-base default goal. Units attack buildings the same way
//   they attack units — CombatSystem handles the actual damage; AISystem only
//   sets the targetId and re-paths the unit.

import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import { UnitState, UnitType, Direction, BuildingState } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { startMoving } from "@sim/systems/MovementSystem";
import { findPath } from "@sim/core/Grid";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tiles — how far a unit scans for enemy buildings to divert toward. */
const BUILDING_AGGRO_RANGE = 5;
const BUILDING_AGGRO_RANGE_SQ = BUILDING_AGGRO_RANGE * BUILDING_AGGRO_RANGE;

/** Tiles — used to check CombatSystem's aggro range for priority targeting. */
const AGGRO_RANGE_SQ = BalanceConfig.AGGRO_RANGE * BalanceConfig.AGGRO_RANGE;

// ---------------------------------------------------------------------------
// Priority table — lower index = higher priority target
// ---------------------------------------------------------------------------

const TARGET_PRIORITY: UnitType[] = [
  UnitType.MAGE,
  UnitType.ARCHER,
  UnitType.PIKEMAN,
  UnitType.SWORDSMAN,
  UnitType.KNIGHT,
  UnitType.SUMMONED,
];

function unitPriority(type: UnitType): number {
  const idx = TARGET_PRIORITY.indexOf(type);
  return idx === -1 ? TARGET_PRIORITY.length : idx;
}

// ---------------------------------------------------------------------------
// Main system
// ---------------------------------------------------------------------------

export const AISystem = {
  update(state: GameState, _dt: number): void {
    for (const unit of state.units.values()) {
      // Skip dead / casting units — nothing to decide
      if (unit.state === UnitState.DIE) continue;
      if (unit.state === UnitState.CAST) continue;

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

  const goal = _enemyBaseGoal(state, unit);
  if (!goal) return;

  startMoving(state, unit, goal);
}

/**
 * MOVE units: check for nearby enemy buildings and divert if one is closer
 * than BUILDING_AGGRO_RANGE. Also upgrade to a priority target if a high-
 * value enemy unit enters aggro range (CombatSystem will take over once the
 * unit is in range).
 */
function _handleMove(state: GameState, unit: Unit): void {
  if (unit.targetId) {
    // Check if it's a valid building target first.
    const buildingTarget = state.buildings.get(unit.targetId);
    if (
      buildingTarget &&
      buildingTarget.state === BuildingState.ACTIVE &&
      buildingTarget.owner !== unit.owner &&
      buildingTarget.owner !== null
    ) {
      // Still heading toward a valid enemy building — leave path alone.
      return;
    }

    // Check if it's a valid unit target.
    const unitTarget = state.units.get(unit.targetId);
    if (
      unitTarget &&
      unitTarget.state !== UnitState.DIE &&
      unitTarget.owner !== unit.owner &&
      distanceSq(unit.position, unitTarget.position) <= AGGRO_RANGE_SQ
    ) {
      // Current unit target is still valid — possibly upgrade to higher priority.
      const better = _findPriorityTarget(state, unit);
      if (better && unitPriority(better.type) < unitPriority(unitTarget.type)) {
        unit.targetId = better.id;
        unit.path = null;
        unit.pathIndex = 0;
      }
      return;
    }

    // Target gone / dead / destroyed / out of range — clear it.
    unit.targetId = null;
    unit.path = null;
    unit.pathIndex = 0;
  }

  // Try to divert toward a nearby enemy building.
  const nearbyBuilding = _findNearbyEnemyBuilding(state, unit);
  if (nearbyBuilding) {
    _divertToBuilding(state, unit, nearbyBuilding);
    return;
  }

  // Otherwise ensure we're still heading toward the enemy base. If path is
  // already set and leading somewhere, leave it alone — MovementSystem owns it.
  if (!unit.path || unit.pathIndex >= unit.path.length) {
    const goal = _enemyBaseGoal(state, unit);
    if (goal) startMoving(state, unit, goal);
  }
}

/**
 * ATTACK units: if the current target died or left range, pick the highest-
 * priority enemy in aggro range. CombatSystem already handles damage; this
 * only upgrades the target selection.
 */
function _handleAttack(state: GameState, unit: Unit): void {
  if (!unit.targetId) return;

  // Check if current target is still valid
  const currentTarget = state.units.get(unit.targetId);
  if (
    currentTarget &&
    currentTarget.state !== UnitState.DIE &&
    currentTarget.owner !== unit.owner &&
    distanceSq(unit.position, currentTarget.position) <= AGGRO_RANGE_SQ
  ) {
    // Target is valid — upgrade to higher priority if one is available
    const better = _findPriorityTarget(state, unit);
    if (
      better &&
      better.id !== unit.targetId &&
      unitPriority(better.type) < unitPriority(currentTarget.type)
    ) {
      unit.targetId = better.id;
    }
    return;
  }

  // Target is gone — fall back to best available target. CombatSystem will
  // pick it up on the next tick; we just clear the stale reference.
  unit.targetId = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the highest-priority living enemy unit within aggro range.
 */
function _findPriorityTarget(state: GameState, unit: Unit): Unit | null {
  let best: Unit | null = null;
  let bestPriority = Infinity;

  for (const candidate of state.units.values()) {
    if (candidate.owner === unit.owner) continue;
    if (candidate.state === UnitState.DIE) continue;
    if (distanceSq(unit.position, candidate.position) > AGGRO_RANGE_SQ)
      continue;

    const p = unitPriority(candidate.type);
    if (p < bestPriority) {
      best = candidate;
      bestPriority = p;
    }
  }

  return best;
}

/**
 * Find the nearest active enemy building within BUILDING_AGGRO_RANGE.
 * Ignores the unit's own-side buildings.
 */
function _findNearbyEnemyBuilding(
  state: GameState,
  unit: Unit,
): Building | null {
  let nearest: Building | null = null;
  let nearestDsq = BUILDING_AGGRO_RANGE_SQ + 1;

  for (const building of state.buildings.values()) {
    if (building.owner === unit.owner) continue;
    if (building.owner === null) continue; // neutral — ignore
    if (building.state !== BuildingState.ACTIVE) continue;

    const dsq = distanceSq(unit.position, building.position);
    if (dsq <= BUILDING_AGGRO_RANGE_SQ && dsq < nearestDsq) {
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
 * Returns the enemy base's spawn-point tile — the default march destination.
 */
function _enemyBaseGoal(
  state: GameState,
  unit: Unit,
): { x: number; y: number } | null {
  // Find the base owned by this unit's player
  const ownerBase = [...state.bases.values()].find(
    (b) => b.owner === unit.owner,
  );
  if (!ownerBase) return null;

  const oppositeDir =
    ownerBase.direction === Direction.WEST ? Direction.EAST : Direction.WEST;
  const enemyBase = [...state.bases.values()].find(
    (b) => b.direction === oppositeDir,
  );
  if (!enemyBase) return null;

  return {
    x: enemyBase.position.x + enemyBase.spawnOffset.x,
    y: enemyBase.position.y + enemyBase.spawnOffset.y,
  };
}
