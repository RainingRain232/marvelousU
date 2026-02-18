// Base Ability interface
import type { AbilityType, Vec2 } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";

export interface Ability {
  id:              string;
  type:            AbilityType;
  cooldown:        number;
  currentCooldown: number;
  range:           number;
  castTime:        number;
  execute(caster: Unit, target: Vec2 | Unit, state: GameState): void;
}
