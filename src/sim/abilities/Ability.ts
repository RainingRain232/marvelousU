// Base Ability interface
import type { AbilityType, Vec2 } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";

export interface Ability {
  id: string;
  type: AbilityType;
  cooldown: number; // Full cooldown duration in seconds
  currentCooldown: number; // Remaining cooldown; 0 = ready to use
  range: number; // Tile range for targeting
  castTime: number; // Seconds to channel before execute() fires
  targetsFriendlies: boolean; // If true, ability resolves on allies instead of enemies

  /** Where the ability is aimed. Set by AbilitySystem before castTimer starts. */
  targetPosition: Vec2 | null;

  /**
   * Execute the ability effect.
   * Called by AbilitySystem once castTimer reaches 0.
   * Implementations must NOT import PixiJS — emit EventBus events for visuals.
   */
  execute(caster: Unit, target: Vec2 | Unit, state: GameState): void;
}
