// Recursive bounce targeting within range
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";

export function createChainLightning(id: string): Ability {
  return {
    id,
    type: AbilityType.CHAIN_LIGHTNING,
    cooldown: 6,
    currentCooldown: 0,
    range: 5,
    castTime: 0.3,
    targetPosition: null,
    execute(_caster: Unit, _target: Vec2 | Unit, _state: GameState): void {
      // TODO: find primary target, bounce up to maxBounces within bounceRange
    },
  };
}
