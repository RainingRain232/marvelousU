// Passive AoE aura ability — pulses damage (and optionally slow) around the caster.
// Unlike projectile-based abilities, auras are self-centred and execute instantly
// when their cooldown expires. The AbilitySystem handles the auto-trigger.

import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitState } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { EventBus } from "@sim/core/EventBus";
import { killUnit } from "@sim/systems/CombatSystem";

export function createAura(id: string, abilityType: AbilityType): Ability {
  const def = ABILITY_DEFINITIONS[abilityType];
  const radius = def.aoeRadius ?? 2.5;
  const radiusSq = radius * radius;

  return {
    id,
    type: abilityType,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: 0,
    castTime: 0,
    targetPosition: null,
    targetsFriendlies: false,

    execute(caster: Unit, _target: Vec2 | Unit, state: GameState): void {
      const cx = caster.position.x;
      const cy = caster.position.y;

      // Damage all enemy units within radius
      for (const unit of state.units.values()) {
        if (unit.state === UnitState.DIE) continue;
        if (unit.owner === caster.owner) continue;

        const dx = unit.position.x - cx;
        const dy = unit.position.y - cy;
        if (dx * dx + dy * dy > radiusSq) continue;

        unit.hp -= def.damage;

        // Apply slow if defined
        if (def.slowDuration && def.slowDuration > 0 && def.slowFactor !== undefined) {
          unit.slowFactor = def.slowFactor;
          unit.slowTimer = Math.max(unit.slowTimer, def.slowDuration);
        }

        EventBus.emit("unitDamaged", {
          unitId: unit.id,
          amount: def.damage,
          attackerId: caster.id,
        });

        if (unit.hp <= 0) {
          unit.hp = 0;
          killUnit(unit, caster.id, state);
        }
      }

      // Emit aura pulse event for VFX
      EventBus.emit("auraPulse", {
        casterId: caster.id,
        abilityType,
        position: { x: cx, y: cy },
        radius,
      });
    },
  };
}
