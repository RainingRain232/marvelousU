// Per-player state for world mode.

import type { RaceId } from "@sim/config/RaceDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldPlayer {
  id: string; // "p1", "p2", etc.
  raceId: RaceId;
  gold: number;
  food: number;
  isAI: boolean;
  isAlive: boolean;

  /** Currently researching tech (null = none). */
  activeResearch: string | null;
  /** Turns remaining on active research. */
  researchTurnsLeft: number;
  /** Set of completed research IDs. */
  completedResearch: Set<string>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorldPlayer(
  id: string,
  raceId: RaceId,
  isAI: boolean,
  startingGold: number,
  startingFood: number,
): WorldPlayer {
  return {
    id,
    raceId,
    gold: startingGold,
    food: startingFood,
    isAI,
    isAlive: true,
    activeResearch: null,
    researchTurnsLeft: 0,
    completedResearch: new Set(),
  };
}
