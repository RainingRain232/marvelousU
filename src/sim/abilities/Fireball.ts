// Projectile-based AoE damage ability
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";

let _projectileCounter = 0;

export function _resetFireballCounter(): void {
  _projectileCounter = 0;
}

export function createFireball(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.FIREBALL];
  return {
    id,
    type: AbilityType.FIREBALL,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      const projectileId = `fb-${++_projectileCounter}`;

      state.projectiles.set(projectileId, {
        id: projectileId,
        abilityId: id,
        ownerId: caster.id,
        ownerPlayerId: caster.owner,
        origin: { ...caster.position },
        target: targetPos,
        position: { ...caster.position },
        speed: 10, // tiles/second
        damage: def.damage,
        aoeRadius: def.aoeRadius ?? 2,
        bounceTargets: [],
        maxBounces: 0,
        bounceRange: 0,
        targetId: "position" in target ? target.id : null,
        hitIds: new Set(),
        slowDuration: 0,
        slowFactor: 1,
      });

      EventBus.emit("projectileCreated", {
        projectileId,
        origin: { ...caster.position },
        target: targetPos,
      });
    },
  };
}
