// ---------------------------------------------------------------------------
// Survivor challenge modifier system — applies mutator effects to gameplay
// ---------------------------------------------------------------------------

import type { ChallengeEffect } from "../config/SurvivorChallengeDefs";
import type { SurvivorState } from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Query helpers — check active challenge effects
// ---------------------------------------------------------------------------

function _hasEffect(state: SurvivorState, type: ChallengeEffect["type"]): boolean {
  return state.challengeEffects.some((e) => e.type === type);
}

function _getEffects<T extends ChallengeEffect["type"]>(
  state: SurvivorState,
  type: T,
): Extract<ChallengeEffect, { type: T }>[] {
  return state.challengeEffects.filter((e) => e.type === type) as Extract<ChallengeEffect, { type: T }>[];
}

export const SurvivorChallengeSystem = {
  /** Whether healing is disabled by a challenge modifier */
  isHealingDisabled(state: SurvivorState): boolean {
    return _hasEffect(state, "no_healing");
  },

  /** Whether bosses spawn at double frequency */
  isDoubleBossFrequency(state: SurvivorState): boolean {
    return _hasEffect(state, "double_boss_frequency");
  },

  /** Whether enemies explode on death (challenge version — damages player too) */
  getExplosionOnDeath(state: SurvivorState): { radius: number; damagePct: number } | null {
    const effects = _getEffects(state, "enemies_explode_on_death");
    if (effects.length === 0) return null;
    return { radius: effects[0].radius, damagePct: effects[0].damagePct };
  },

  /** Get the combined enemy HP multiplier from challenge effects */
  getEnemyHpMultiplier(state: SurvivorState): number {
    let mult = 1.0;
    for (const effect of state.challengeEffects) {
      if (effect.type === "enemy_hp_multiplier") mult *= effect.multiplier;
    }
    return mult;
  },

  /** Get the combined enemy speed multiplier from challenge effects */
  getEnemySpeedMultiplier(state: SurvivorState): number {
    let mult = 1.0;
    for (const effect of state.challengeEffects) {
      if (effect.type === "enemy_speed_multiplier") mult *= effect.multiplier;
    }
    return mult;
  },

  /** Get the combined spawn rate multiplier from challenge effects */
  getSpawnRateMultiplier(state: SurvivorState): number {
    let mult = 1.0;
    for (const effect of state.challengeEffects) {
      if (effect.type === "enemy_spawn_rate_multiplier") mult *= effect.multiplier;
    }
    return mult;
  },

  /** Apply challenge-based healing block — returns the actual heal amount */
  filterHeal(state: SurvivorState, amount: number): number {
    if (_hasEffect(state, "no_healing")) return 0;
    return amount;
  },
};
