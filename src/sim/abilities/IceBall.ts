// AoE iceball: slows all enemies in radius + small damage on hit.
// The slowDuration / slowFactor are baked into the Projectile so
// ProjectileSystem can apply them generically — making the slow reusable.
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";

let _iceBallCounter = 0;

export function _resetIceBallCounter(): void {
  _iceBallCounter = 0;
}

export function createIceBall(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.ICE_BALL];
  return {
    id,
    type: AbilityType.ICE_BALL,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      const projectileId = `ib-${++_iceBallCounter}`;

      state.projectiles.set(projectileId, {
        id: projectileId,
        abilityId: id,
        ownerId: caster.id,
        origin: { ...caster.position },
        target: targetPos,
        position: { ...caster.position },
        speed: 8, // tiles/second — slightly slower than fireball
        damage: def.damage,
        aoeRadius: def.aoeRadius ?? 2.5,
        bounceTargets: [],
        maxBounces: 0,
        bounceRange: 0,
        targetId: "position" in target ? target.id : null,
        hitIds: new Set(),
        slowDuration: def.slowDuration ?? 3,
        slowFactor: def.slowFactor ?? 0.4,
      });

      EventBus.emit("projectileCreated", {
        projectileId,
        origin: { ...caster.position },
        target: targetPos,
      });
    },
  };
}
