// Projectile-based directional pull ability
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";

let _projectileCounter = 0;

/**
 * Creates a "Pull" ability (e.g. Gladiator Net) that fires a projectile 
 * which pulls targets closer on hit.
 */
export function createNetPull(id: string, type: AbilityType = AbilityType.GLADIATOR_NET): Ability {
    const def = ABILITY_DEFINITIONS[type];
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

            const projectileId = `pull-${++_projectileCounter}`;

            state.projectiles.set(projectileId, {
                id: projectileId,
                abilityId: id,
                ownerId: caster.id,
                ownerPlayerId: caster.owner,
                origin: { ...caster.position },
                target: targetPos,
                position: { ...caster.position },
                speed: 10,
                damage: def.damage,
                aoeRadius: def.aoeRadius ?? 0.8,
                bounceTargets: [],
                maxBounces: 0,
                bounceRange: 0,
                targetId: "position" in target ? target.id : null,
                hitIds: new Set(),
                slowDuration: def.slowDuration ?? 0,
                slowFactor: def.slowFactor ?? 1,
                teleportDistance: 0,
                pullDistance: def.pullDistance ?? 2,
                pullChance: def.pullChance ?? 0.5,
            });

            EventBus.emit("projectileCreated", {
                projectileId,
                origin: { ...caster.position },
                target: targetPos,
            });
        },
    };
}
