// Projectile-based AoE damage ability
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";

export function createFireball(id: string): Ability {
  return {
    id,
    type: AbilityType.FIREBALL,
    cooldown: 5,
    currentCooldown: 0,
    range: 6,
    castTime: 0.5,
    targetPosition: null,
    execute(_caster: Unit, _target: Vec2 | Unit, _state: GameState): void {
      // TODO: spawn projectile, on impact deal AoE damage
    },
  };
}
