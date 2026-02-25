// Dragon Fire Breath: Large AoE cone damage ability
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";

let _fireBreathCounter = 0;

export function _resetFireBreathCounter(): void {
  _fireBreathCounter = 0;
}

export function createFireBreath(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.FIRE_BREATH];
  return {
    id,
    type: AbilityType.FIRE_BREATH,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: false,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      const projectileId = `fbreath-${++_fireBreathCounter}`;

      state.projectiles.set(projectileId, {
        id: projectileId,
        abilityId: id,
        ownerId: caster.id,
        ownerPlayerId: caster.owner,
        origin: { ...caster.position },
        target: targetPos,
        position: { ...caster.position },
        speed: 12, // tiles/second - faster than regular fireball
        damage: def.damage,
        aoeRadius: def.aoeRadius ?? 3.5,
        bounceTargets: [],
        maxBounces: 0,
        bounceRange: 0,
        targetId: "position" in target ? target.id : null,
        hitIds: new Set(),
        slowDuration: 0,
        slowFactor: 1,
        teleportDistance: 0,
        pullDistance: 0,
        pullChance: 0,
      });

      EventBus.emit("projectileCreated", {
        projectileId,
        origin: { ...caster.position },
        target: targetPos,
      });
    },
  };
}
