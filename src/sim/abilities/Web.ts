// Web / Net: AoE slow projectile with minor damage on hit.
// Used by Spider (WEB) and Gladiator (GLADIATOR_NET).
// Both share identical behaviour — only the stats differ (see AbilityDefs.ts).
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";

let _webCounter = 0;

export function _resetWebCounter(): void {
  _webCounter = 0;
}

function createWebAbility(type: AbilityType.WEB | AbilityType.GLADIATOR_NET, id: string): Ability {
  const def = ABILITY_DEFINITIONS[type];
  const prefix = type === AbilityType.WEB ? "web" : "net";

  return {
    id,
    type,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      const projectileId = `${prefix}-${++_webCounter}`;

      state.projectiles.set(projectileId, {
        id: projectileId,
        abilityId: id,
        ownerId: caster.id,
        origin: { ...caster.position },
        target: targetPos,
        position: { ...caster.position },
        speed: 7, // tiles/second — slightly slower, lobbed feel
        damage: def.damage,
        aoeRadius: def.aoeRadius ?? 1.5,
        bounceTargets: [],
        maxBounces: 0,
        bounceRange: 0,
        targetId: "position" in target ? target.id : null,
        hitIds: new Set(),
        slowDuration: def.slowDuration ?? 4,
        slowFactor: def.slowFactor ?? 0.35,
      });

      EventBus.emit("projectileCreated", {
        projectileId,
        origin: { ...caster.position },
        target: targetPos,
      });
    },
  };
}

export function createWeb(id: string): Ability {
  return createWebAbility(AbilityType.WEB, id);
}

export function createGladiatorNet(id: string): Ability {
  return createWebAbility(AbilityType.GLADIATOR_NET, id);
}
