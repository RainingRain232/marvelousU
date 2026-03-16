// Pathfinding, group movement, formation
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import { UnitState, Direction } from "@/types";
import { findPath, getTerrainSpeedMultiplier } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Formation helpers
// ---------------------------------------------------------------------------

/**
 * Given a group of unit IDs (in insertion order) and a path direction, return
 * a perpendicular formation offset for each unit so the group spreads out
 * sideways rather than stacking on the same tile.
 *
 * Layout (odd unit is centred, evens spread out):
 *   index 0 → offset  0
 *   index 1 → offset +1
 *   index 2 → offset -1
 *   index 3 → offset +2
 *   index 4 → offset -2
 *   …
 *
 * The perpendicular axis is Y when moving mainly horizontally, X otherwise.
 */
function formationOffset(slotIndex: number, pathDir: Vec2): Vec2 {
  const slot =
    slotIndex === 0
      ? 0
      : slotIndex % 2 === 1
        ? Math.ceil(slotIndex / 2)
        : -Math.ceil(slotIndex / 2);

  // Perpendicular to movement direction
  const mainlyHorizontal = Math.abs(pathDir.x) >= Math.abs(pathDir.y);
  return mainlyHorizontal ? { x: 0, y: slot } : { x: slot, y: 0 };
}

// ---------------------------------------------------------------------------
// Goal resolution
// ---------------------------------------------------------------------------

/**
 * Find the position the unit should be moving toward by default:
 * the spawn point of the opposing base.
 */
function defaultGoal(state: GameState, unit: Unit): Vec2 | null {
  // Find the base owned by this unit's player
  const ownerBase = [...state.bases.values()].find(
    (b) => b.owner === unit.owner,
  );
  if (!ownerBase) return null;

  // Opposing direction
  const oppositeDir =
    ownerBase.direction === Direction.WEST ? Direction.EAST : Direction.WEST;

  const opposingBase = [...state.bases.values()].find(
    (b) => b.direction === oppositeDir,
  );
  if (!opposingBase) return null;

  return {
    x: opposingBase.position.x + opposingBase.spawnOffset.x,
    y: opposingBase.position.y + opposingBase.spawnOffset.y,
  };
}

// ---------------------------------------------------------------------------
// Group path cache
// Shared paths for a group are computed once and stored here each frame.
// Key: groupId, Value: the computed path (tile waypoints).
// ---------------------------------------------------------------------------

const _groupPathCache = new Map<string, Vec2[] | null>();

// ---------------------------------------------------------------------------
// Main system
// ---------------------------------------------------------------------------

export const MovementSystem = {
  update(state: GameState, dt: number): void {
    _groupPathCache.clear();

    // Collect group slot assignments so formation offsets are stable
    const groupSlots = new Map<string, string[]>(); // groupId → ordered unitIds
    for (const unit of state.units.values()) {
      if (unit.state !== UnitState.MOVE) continue;
      if (unit.groupId) {
        if (!groupSlots.has(unit.groupId)) groupSlots.set(unit.groupId, []);
        groupSlots.get(unit.groupId)!.push(unit.id);
      }
    }

    for (const unit of state.units.values()) {
      // Tick slow timer on all living units regardless of move state
      if (unit.state !== UnitState.DIE && unit.slowTimer > 0) {
        unit.slowTimer = Math.max(0, unit.slowTimer - dt);
        if (unit.slowTimer === 0) unit.slowFactor = 1;
      }

      if (unit.state !== UnitState.MOVE || unit.idleInterruptionTimer > 0) continue;
      tickUnit(state, unit, dt, groupSlots);
    }
  },
};

// ---------------------------------------------------------------------------
// Per-unit tick
// ---------------------------------------------------------------------------

function tickUnit(
  state: GameState,
  unit: Unit,
  dt: number,
  groupSlots: Map<string, string[]>,
): void {
  // 1. Ensure we have a path.
  //    If chasing a unit target, re-path toward it each tick so units chase
  //    enemies rather than marching past them. Otherwise use the base goal.
  if (unit.targetId && state.units.has(unit.targetId)) {
    const targetUnit = state.units.get(unit.targetId)!;
    if (targetUnit.state !== UnitState.DIE) {
      const tx = Math.floor(targetUnit.position.x);
      const ty = Math.floor(targetUnit.position.y);
      // Re-path whenever the target tile changed or path is exhausted
      const lastWp = unit.path ? unit.path[unit.path.length - 1] : null;
      const needsRepath = !unit.path || unit.pathIndex >= unit.path.length ||
        !lastWp || lastWp.x !== tx || lastWp.y !== ty;
      // Throttle chase re-pathing: immediately if no path, otherwise every 10 ticks
      // to avoid massive allocation pressure in tight headless battle loops
      if (needsRepath && (!unit.path || unit.pathIndex >= unit.path.length || state.tick % 10 === 0)) {
        unit.path = findPath(
          state.battlefield,
          { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
          { x: tx, y: ty },
        );
        unit.pathIndex = 0;
        unit.formationOffset = { x: 0, y: 0 };
      }
    }
  }

  if (!unit.path || unit.pathIndex >= unit.path.length) {
    // No unit target (or target is a building/base) — use default base goal
    const goal = defaultGoal(state, unit);
    if (!goal) return;

    if (unit.groupId) {
      // Use or compute the shared group path
      if (!_groupPathCache.has(unit.groupId)) {
        const sharedPath = findPath(
          state.battlefield,
          { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
          goal,
        );
        _groupPathCache.set(unit.groupId, sharedPath);
      }
      const sharedPath = _groupPathCache.get(unit.groupId)!;
      unit.path = sharedPath ? [...sharedPath] : null;

      // If the group path failed, try from this unit's own position
      if (!unit.path) {
        unit.path = findPath(
          state.battlefield,
          { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
          goal,
        );
      }

      // Assign formation offset based on slot index
      const slots = groupSlots.get(unit.groupId) ?? [];
      const slotIdx = slots.indexOf(unit.id);
      if (unit.path && unit.path.length >= 2) {
        const first = unit.path[0];
        const second = unit.path[1];
        const dir = { x: second.x - first.x, y: second.y - first.y };
        unit.formationOffset = formationOffset(slotIdx, dir);
      }
    } else {
      unit.path = findPath(
        state.battlefield,
        { x: Math.floor(unit.position.x), y: Math.floor(unit.position.y) },
        goal,
      );
      unit.formationOffset = { x: 0, y: 0 };
    }

    unit.pathIndex = 0;
    if (!unit.path) {
      // No path found — track consecutive failures and break out of group
      // after too many so the unit can re-path independently.
      unit.pathFailCount = (unit.pathFailCount ?? 0) + 1;
      if (unit.pathFailCount > 3 && unit.groupId) {
        unit.groupId = null;
      }
      return;
    }
    unit.pathFailCount = 0;
  }

  // 2. Walk along path
  // The formation offset is a fixed lateral displacement baked into the unit's
  // starting position (applied once in startGroupMoving). While following the
  // path the unit targets the *centerline* waypoints — the offset is already
  // reflected in its current position relative to its group-mates.
  const terrainMult = getTerrainSpeedMultiplier(
    state.battlefield,
    unit.position.x,
    unit.position.y,
  );
  const effectiveSpeed = unit.speed * (unit.slowTimer > 0 ? unit.slowFactor : 1) * terrainMult;
  let remaining = effectiveSpeed * dt;

  while (remaining > 0 && unit.pathIndex < unit.path.length) {
    const waypoint = unit.path[unit.pathIndex];

    const dx = waypoint.x - (unit.position.x - unit.formationOffset.x);
    const dy = waypoint.y - (unit.position.y - unit.formationOffset.y);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= remaining) {
      // Arrive at waypoint — snap centerline coord, keep offset
      unit.position.x = waypoint.x + unit.formationOffset.x;
      unit.position.y = waypoint.y + unit.formationOffset.y;
      remaining -= dist;
      unit.pathIndex++;
    } else {
      // Move toward waypoint
      const ratio = remaining / dist;
      unit.position.x += dx * ratio;
      unit.position.y += dy * ratio;
      remaining = 0;
    }
  }

  // 3. Update facing direction
  if (unit.path && unit.path.length > 0) {
    const goal = defaultGoal(state, unit);
    if (goal) {
      unit.facingDirection =
        goal.x > unit.position.x ? Direction.EAST : Direction.WEST;
    }
  }

  // 4. Transition to IDLE when path is exhausted
  if (!unit.path || unit.pathIndex >= unit.path.length) {
    const prev = unit.state;
    if (unit.stateMachine.canTransition(UnitState.IDLE)) {
      unit.stateMachine.setState(UnitState.IDLE);
      unit.state = UnitState.IDLE;
      EventBus.emit("unitStateChanged", {
        unitId: unit.id,
        from: prev,
        to: UnitState.IDLE,
      });
    }
    unit.path = null;
    unit.pathIndex = 0;
  }
}

// ---------------------------------------------------------------------------
// Public helpers (used by other systems & tests)
// ---------------------------------------------------------------------------

/**
 * Put a unit into MOVE state with an explicit destination.
 * Clears any existing path so MovementSystem recomputes from current position.
 */
export function startMoving(state: GameState, unit: Unit, goal?: Vec2): void {
  if (unit.stateMachine.canTransition(UnitState.MOVE)) {
    const prev = unit.state;
    unit.stateMachine.setState(UnitState.MOVE);
    unit.state = UnitState.MOVE;

    // Compute path immediately if goal supplied
    if (goal) {
      unit.path = findPath(state.battlefield, unit.position, goal);
    } else {
      unit.path = null; // MovementSystem will compute default goal next tick
    }
    unit.pathIndex = 0;

    EventBus.emit("unitStateChanged", {
      unitId: unit.id,
      from: prev,
      to: UnitState.MOVE,
    });
  }
}

/**
 * Assign a group of units to move together.
 * All units get the same groupId and have their formation offsets set.
 * The first unit's position is used to compute the shared path.
 */
export function startGroupMoving(
  state: GameState,
  unitIds: string[],
  groupId: string,
  goal?: Vec2,
): void {
  if (unitIds.length === 0) return;

  // Compute shared path from first unit's position
  const firstUnit = state.units.get(unitIds[0]);
  if (!firstUnit) return;

  const resolvedGoal = goal ?? defaultGoal(state, firstUnit);
  const sharedPath = resolvedGoal
    ? findPath(state.battlefield, firstUnit.position, resolvedGoal)
    : null;

  // Determine initial path direction for formation layout
  let initialDir: Vec2 = { x: 1, y: 0 };
  if (sharedPath && sharedPath.length >= 2) {
    initialDir = {
      x: sharedPath[1].x - sharedPath[0].x,
      y: sharedPath[1].y - sharedPath[0].y,
    };
  }

  unitIds.forEach((id, slotIdx) => {
    const unit = state.units.get(id);
    if (!unit) return;

    const prev = unit.state;
    if (unit.stateMachine.canTransition(UnitState.MOVE)) {
      unit.stateMachine.setState(UnitState.MOVE);
      unit.state = UnitState.MOVE;
    }

    const offset = formationOffset(slotIdx, initialDir);
    unit.groupId = groupId;
    unit.path = sharedPath ? [...sharedPath] : null;
    unit.pathIndex = 0;
    unit.formationOffset = offset;
    // Bake the lateral offset into the unit's starting position so movement
    // toward path centerline waypoints moves the unit in the right direction.
    unit.position.x += offset.x;
    unit.position.y += offset.y;

    EventBus.emit("unitStateChanged", {
      unitId: unit.id,
      from: prev,
      to: UnitState.MOVE,
    });
  });
}
