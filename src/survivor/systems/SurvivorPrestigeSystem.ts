// ---------------------------------------------------------------------------
// Survivor prestige system — restart with permanent bonuses after wave X
// ---------------------------------------------------------------------------

import { SurvivorPersistence } from "../state/SurvivorPersistence";
import type { SurvivorState } from "../state/SurvivorState";

type PrestigeCallback = ((newLevel: number) => void) | null;
let _prestigeCallback: PrestigeCallback = null;

export const SurvivorPrestigeSystem = {
  setPrestigeCallback(cb: PrestigeCallback): void {
    _prestigeCallback = cb;
  },

  /** Check if the player can prestige this run */
  canPrestige(state: SurvivorState): boolean {
    return SurvivorPersistence.canPrestige(state.gameTime);
  },

  /** Get seconds remaining until prestige is available */
  getTimeUntilPrestige(state: SurvivorState): number {
    const threshold = SurvivorPersistence.getPrestigeThreshold();
    return Math.max(0, threshold - state.gameTime);
  },

  /** Execute prestige: saves the new prestige level and notifies the game */
  executePrestige(state: SurvivorState): boolean {
    if (!this.canPrestige(state)) return false;

    // Save gold from this run
    SurvivorPersistence.addGold(state.gold);

    // Increment prestige level
    const newLevel = SurvivorPersistence.applyPrestige();

    // Notify callback (game will handle restart)
    _prestigeCallback?.(newLevel);

    return true;
  },

  /** Get a description of the next prestige bonus */
  getNextPrestigeBonus(): string {
    const current = SurvivorPersistence.getPrestigeLevel();
    const next = current + 1;
    return `Prestige ${next}: +${next * 10} HP, +${next * 3}% ATK, +${next * 2}% XP, +${next}% Speed`;
  },

  /** Get current prestige level */
  getCurrentLevel(): number {
    return SurvivorPersistence.getPrestigeLevel();
  },

  cleanup(): void {
    _prestigeCallback = null;
  },
};
