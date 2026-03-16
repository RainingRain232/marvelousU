// ---------------------------------------------------------------------------
// Survivor biome progression system — shifts arena theme based on game time
// ---------------------------------------------------------------------------

import { BIOME_DEFS, getBiomeIndex, getActiveBiome } from "../config/SurvivorBiomeDefs";
import type { SurvivorBiomeDef } from "../config/SurvivorBiomeDefs";
import type { SurvivorState } from "../state/SurvivorState";

type BiomeTransitionCallback = ((biome: SurvivorBiomeDef) => void) | null;
let _transitionCallback: BiomeTransitionCallback = null;

export const SurvivorBiomeSystem = {
  setTransitionCallback(cb: BiomeTransitionCallback): void {
    _transitionCallback = cb;
  },

  update(state: SurvivorState, _dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    const newIndex = getBiomeIndex(state.gameTime);
    if (newIndex !== state.biomeIndex) {
      const newBiome = BIOME_DEFS[newIndex];
      state.biomeIndex = newIndex;
      state.currentBiome = newBiome.id;
      state.biomeTransitioning = true;

      // Notify the game to handle visual transition
      _transitionCallback?.(newBiome);

      // Transitioning flag cleared after a short delay (handled by caller)
      setTimeout(() => {
        state.biomeTransitioning = false;
      }, 2000);
    }
  },

  /** Get spawn rate multiplier from the current biome */
  getSpawnRateMultiplier(state: SurvivorState): number {
    const biome = getActiveBiome(state.gameTime);
    return biome.spawnRateMultiplier;
  },

  /** Get enemy HP multiplier from the current biome */
  getEnemyHpMultiplier(state: SurvivorState): number {
    const biome = getActiveBiome(state.gameTime);
    return biome.enemyHpMultiplier;
  },

  /** Get enemy speed multiplier from the current biome */
  getEnemySpeedMultiplier(state: SurvivorState): number {
    const biome = getActiveBiome(state.gameTime);
    return biome.enemySpeedMultiplier;
  },

  /** Get the current biome's extra enemy pool */
  getBiomeEnemyPool(state: SurvivorState): SurvivorBiomeDef["biomeEnemies"] {
    const biome = getActiveBiome(state.gameTime);
    return biome.biomeEnemies;
  },

  cleanup(): void {
    _transitionCallback = null;
  },
};
