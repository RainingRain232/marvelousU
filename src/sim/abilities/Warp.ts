// Teleport friendly units to target location
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";

export function createWarp(id: string): Ability {
  return {
    id,
    type:            AbilityType.WARP,
    cooldown:        10,
    currentCooldown: 0,
    range:           8,
    castTime:        0.8,
    execute(_caster: Unit, _target: Vec2 | Unit, _state: GameState): void {
      // TODO: select friendly units in area, update simPosition, emit event
    },
  };
}
