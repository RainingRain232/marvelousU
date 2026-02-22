// Cooldowns, casting, ability resolution — delegates execute() to abilities/
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Ability } from "@sim/abilities/Ability";
import { createAbility } from "@sim/abilities/index";
import { UnitState, UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { inRange } from "@sim/utils/math";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// AbilitySystem
// ---------------------------------------------------------------------------

/**
 * Manages the full ability lifecycle for all units:
 *
 *   1. Tick `currentCooldown` on every ability in `state.abilities`.
 *   2. For units in CAST state: tick `castTimer`. On completion, execute
 *      the ability and transition back to IDLE.
 *   3. For mage units in ATTACK state with a ready ability and a target in
 *      range: initiate a cast (transition to CAST, set castTimer, store
 *      targetPosition on the ability).
 *
 * AbilitySystem only touches units whose `abilityIds` list is non-empty.
 * Non-mage units are ignored.
 *
 * Ability lookup:
 *   Each `unit.abilityIds[i]` maps to a key in `state.abilities`.
 *   Abilities are added to `state.abilities` (and `unit.abilityIds`) when
 *   a mage unit is created via `ensureAbilities()`.
 */
export const AbilitySystem = {
  update(state: GameState, dt: number): void {
    // 1. Tick all ability cooldowns
    for (const ability of state.abilities.values()) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown = Math.max(0, ability.currentCooldown - dt);
      }
    }

    // 2. Process each unit that has abilities (or should have them)
    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;

      // Lazy-init: populate abilityIds for units that haven't been set up yet
      const def = UNIT_DEFINITIONS[unit.type];
      if (def.abilityTypes.length > 0) {
        ensureAbilities(state, unit);
      }

      if (unit.abilityIds.length === 0) continue;

      if (unit.state === UnitState.CAST) {
        _tickCast(state, unit, dt);
      } else if (unit.state === UnitState.ATTACK) {
        _tryInitiateCast(state, unit);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Cast ticking
// ---------------------------------------------------------------------------

/**
 * Advance the cast timer for a unit in CAST state.
 * When the timer expires: execute the ability, start its cooldown,
 * clear targetPosition, and return the unit to IDLE.
 */
function _tickCast(state: GameState, unit: Unit, dt: number): void {
  unit.castTimer -= dt;
  if (unit.castTimer > 0) return;

  unit.castTimer = 0;

  // Find the ability that was being cast (first one with a targetPosition set)
  const ability = _getActiveCastAbility(state, unit);
  if (ability && ability.targetPosition) {
    // Resolve the target: prefer a living unit at that position, else use Vec2
    const targetUnit = _findUnitAt(state, unit, ability);
    const target = targetUnit ?? ability.targetPosition;

    ability.execute(unit, target, state);

    EventBus.emit("abilityUsed", {
      casterId: unit.id,
      abilityId: ability.id,
      targets: [{ ...ability.targetPosition }],
    });

    ability.currentCooldown = ability.cooldown;
    ability.targetPosition = null;
  }

  // Return to IDLE
  unit.stateMachine.setState(UnitState.IDLE) ||
    unit.stateMachine.forceState(UnitState.IDLE);
  const prev = unit.state;
  unit.state = UnitState.IDLE;
  unit.targetId = null;

  EventBus.emit("unitStateChanged", {
    unitId: unit.id,
    from: prev,
    to: UnitState.IDLE,
  });
}

// ---------------------------------------------------------------------------
// Cast initiation
// ---------------------------------------------------------------------------

/**
 * For a mage unit in ATTACK state: check if any ability is off cooldown
 * and the current target is within that ability's range.
 * If so, enter CAST state and set the ability's targetPosition.
 */
function _tryInitiateCast(state: GameState, unit: Unit): void {
  if (!unit.targetId) return;

  const target = state.units.get(unit.targetId);
  if (!target || target.state === UnitState.DIE) return;

  for (const abilityId of unit.abilityIds) {
    const ability = state.abilities.get(abilityId);
    if (!ability) continue;
    if (ability.currentCooldown > 0) continue;
    if (!inRange(unit.position, target.position, ability.range)) continue;

    // Initiate cast
    ability.targetPosition = { ...target.position };
    unit.castTimer = ability.castTime;

    const prev = unit.state;
    unit.stateMachine.setState(UnitState.CAST) ||
      unit.stateMachine.forceState(UnitState.CAST);
    unit.state = UnitState.CAST;

    EventBus.emit("unitStateChanged", {
      unitId: unit.id,
      from: prev,
      to: UnitState.CAST,
    });

    EventBus.emit("castStarted", {
      casterId: unit.id,
      abilityId: ability.id,
      abilityType: ability.type,
      position: { ...unit.position },
      castTime: ability.castTime,
    });

    return; // only initiate one cast per frame
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Lazy-initialise ability instances in `state.abilities` for a unit.
 * Only called for units with non-empty `abilityIds` that may still have
 * placeholder IDs that haven't been registered yet.
 */
function ensureAbilities(state: GameState, unit: Unit): void {
  const def = UNIT_DEFINITIONS[unit.type];
  if (def.abilityTypes.length === 0) return;

  // Already initialised — all ids present in state, do not overwrite
  if (
    unit.abilityIds.length > 0 &&
    unit.abilityIds.every((id) => state.abilities.has(id))
  ) {
    return;
  }

  // Only populate when abilityIds is empty (first-time init).
  // Do not overwrite manually-registered abilities (e.g. from tests).
  if (unit.abilityIds.length === 0) {
    unit.abilityIds = def.abilityTypes.map((abilityType, i) => {
      const id = `${unit.id}-ability-${i}`;
      if (!state.abilities.has(id)) {
        const ability = createAbility(abilityType, id);
        state.abilities.set(id, ability);
      }
      return id;
    });
  }
}

/**
 * Find the ability currently being cast: first ability with a non-null
 * `targetPosition`. Falls back to first ability overall.
 */
function _getActiveCastAbility(state: GameState, unit: Unit): Ability | null {
  for (const id of unit.abilityIds) {
    const ab = state.abilities.get(id);
    if (ab && ab.targetPosition !== null) return ab;
  }
  // Fallback: return first ability
  const firstId = unit.abilityIds[0];
  return firstId ? (state.abilities.get(firstId) ?? null) : null;
}

/**
 * Find a living enemy unit whose position matches the stored targetPosition.
 * Returns null if no such unit exists (target may have moved or died).
 */
function _findUnitAt(
  state: GameState,
  caster: Unit,
  ability: Ability,
): Unit | null {
  if (!ability.targetPosition) return null;
  const tp = ability.targetPosition;
  const SNAP = 1.5; // tiles — target may have moved slightly during cast

  for (const candidate of state.units.values()) {
    const isFriendly = candidate.owner === caster.owner;
    if (ability.targetsFriendlies !== isFriendly) continue;

    if (candidate.state === UnitState.DIE) continue;
    const dx = candidate.position.x - tp.x;
    const dy = candidate.position.y - tp.y;
    if (Math.sqrt(dx * dx + dy * dy) <= SNAP) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public helper: attach abilities to a freshly created mage unit
// ---------------------------------------------------------------------------

/**
 * Call this right after `createUnit()` for mage-type units to pre-populate
 * `unit.abilityIds` and register abilities in `state.abilities`.
 * AbilitySystem.update() also calls `ensureAbilities()` lazily, so this
 * is optional but recommended for immediate availability.
 */
export function attachAbilities(state: GameState, unit: Unit): void {
  if (
    unit.type !== UnitType.FIRE_MAGE &&
    unit.type !== UnitType.STORM_MAGE &&
    unit.type !== UnitType.SUMMONER &&
    unit.type !== UnitType.COLD_MAGE &&
    unit.type !== UnitType.MONK &&
    unit.type !== UnitType.CLERIC &&
    unit.type !== UnitType.SAINT
  ) return;
  ensureAbilities(state, unit);
}
