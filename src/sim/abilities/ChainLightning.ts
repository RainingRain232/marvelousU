// Recursive bounce targeting within range
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitState } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { distanceSq } from "@sim/utils/math";
import { killUnit } from "@sim/systems/CombatSystem";
import { EventBus } from "@sim/core/EventBus";

export function createChainLightning(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.CHAIN_LIGHTNING];
  return {
    id,
    type: AbilityType.CHAIN_LIGHTNING,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: false,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      // Resolve primary target unit
      const primaryUnit: Unit | null =
        "hp" in target
          ? target
          : _findNearestEnemy(state, caster, target, def.range);

      if (!primaryUnit) return;

      const hitIds = new Set<string>();
      const chainPath: Vec2[] = [{ ...caster.position }];

      _bounce(
        state,
        caster,
        primaryUnit,
        hitIds,
        chainPath,
        def.damage,
        def.maxBounces ?? 4,
        def.bounceRange ?? 3,
      );

      // Emit abilityUsed with full chain path so view can draw bolts
      EventBus.emit("abilityUsed", {
        casterId: caster.id,
        abilityId: id,
        targets: chainPath,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Bounce logic
// ---------------------------------------------------------------------------

function _bounce(
  state: GameState,
  caster: Unit,
  target: Unit,
  hitIds: Set<string>,
  chainPath: Vec2[],
  damage: number,
  bouncesRemaining: number,
  bounceRange: number,
): void {
  // Damage this target
  hitIds.add(target.id);
  chainPath.push({ ...target.position });

  target.hp -= damage;
  EventBus.emit("unitDamaged", {
    unitId: target.id,
    amount: damage,
    attackerId: caster.id,
  });

  if (target.hp <= 0) {
    target.hp = 0;
    killUnit(target, caster.id);
  }

  if (bouncesRemaining <= 0) return;

  // Find next bounce target: nearest living enemy within bounceRange, not yet hit
  const next = _findNextBounceTarget(
    state,
    caster,
    target,
    hitIds,
    bounceRange,
  );
  if (!next) return;

  _bounce(
    state,
    caster,
    next,
    hitIds,
    chainPath,
    damage,
    bouncesRemaining - 1,
    bounceRange,
  );
}

// ---------------------------------------------------------------------------
// Target finders
// ---------------------------------------------------------------------------

/** Find nearest living enemy to `from` within `range` tiles (excluding hitIds). */
function _findNextBounceTarget(
  state: GameState,
  caster: Unit,
  from: Unit,
  hitIds: Set<string>,
  range: number,
): Unit | null {
  const rangeSq = range * range;
  let nearest: Unit | null = null;
  let nearestDsq = Infinity;

  for (const unit of state.units.values()) {
    if (unit.owner === caster.owner) continue;
    if (unit.state === UnitState.DIE) continue;
    if (hitIds.has(unit.id)) continue;

    const dsq = distanceSq(from.position, unit.position);
    if (dsq <= rangeSq && dsq < nearestDsq) {
      nearest = unit;
      nearestDsq = dsq;
    }
  }

  return nearest;
}

/** Find nearest living enemy to a Vec2 position within range (for initial cast). */
function _findNearestEnemy(
  state: GameState,
  caster: Unit,
  pos: Vec2,
  range: number,
): Unit | null {
  const rangeSq = range * range;
  let nearest: Unit | null = null;
  let nearestDsq = Infinity;

  for (const unit of state.units.values()) {
    if (unit.owner === caster.owner) continue;
    if (unit.state === UnitState.DIE) continue;

    const dsq = distanceSq(pos, unit.position);
    if (dsq <= rangeSq && dsq < nearestDsq) {
      nearest = unit;
      nearestDsq = dsq;
    }
  }

  return nearest;
}
