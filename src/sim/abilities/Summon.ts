// Spawns temporary units at target location
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";

export function createSummon(id: string): Ability {
  return {
    id,
    type: AbilityType.SUMMON,
    cooldown: 12,
    currentCooldown: 0,
    range: 6,
    castTime: 1.0,
    targetPosition: null,
    execute(_caster: Unit, _target: Vec2 | Unit, _state: GameState): void {
      // TODO: spawn SUMMONED units at target position with limited lifespan
    },
  };
}
