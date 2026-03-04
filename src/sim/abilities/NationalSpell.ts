// Generic projectile-based AoE ability for national mages.
// Reads damage/aoeRadius from ABILITY_DEFINITIONS (overwritten at runtime
// based on the player's spell selections on the MagicScreen).
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitState } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { isAlly } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";

let _projectileCounter = 0;

export function createNationalSpell(
  id: string,
  abilityType: AbilityType,
): Ability {
  const def = ABILITY_DEFINITIONS[abilityType];
  const isHeal = def.damage < 0;

  return {
    id,
    type: abilityType,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: isHeal,

    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      // Re-read def at execute time (values may have been patched at runtime)
      const liveDef = ABILITY_DEFINITIONS[abilityType];
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      if (liveDef.damage < 0) {
        // Heal: AoE heal allies around target position
        const healAmount = Math.abs(liveDef.damage);
        const radius = liveDef.aoeRadius ?? 2;
        const radiusSq = radius * radius;

        for (const unit of state.units.values()) {
          if (unit.state === UnitState.DIE) continue;
          if (!isAlly(state, unit.owner, caster.owner)) continue;
          const dx = unit.position.x - targetPos.x;
          const dy = unit.position.y - targetPos.y;
          if (dx * dx + dy * dy > radiusSq) continue;

          const actual = Math.min(unit.maxHp - unit.hp, healAmount);
          if (actual > 0) {
            unit.hp += actual;
            EventBus.emit("unitHealed", {
              unitId: unit.id,
              amount: actual,
              position: { ...unit.position },
            });
          }
        }
      } else {
        // Damage: launch a projectile (reuses the projectile system)
        const projectileId = `ns-${++_projectileCounter}`;

        state.projectiles.set(projectileId, {
          id: projectileId,
          abilityId: id,
          ownerId: caster.id,
          ownerPlayerId: caster.owner,
          origin: { ...caster.position },
          target: targetPos,
          position: { ...caster.position },
          speed: 10,
          damage: liveDef.damage,
          aoeRadius: liveDef.aoeRadius ?? 2,
          bounceTargets: [],
          maxBounces: 0,
          bounceRange: 0,
          targetId: "position" in target ? target.id : null,
          hitIds: new Set(),
          slowDuration: liveDef.slowDuration ?? 0,
          slowFactor: liveDef.slowFactor ?? 1,
          teleportDistance: liveDef.teleportDistance ?? 0,
        });

        EventBus.emit("projectileCreated", {
          projectileId,
          origin: { ...caster.position },
          target: targetPos,
        });
      }
    },
  };
}
