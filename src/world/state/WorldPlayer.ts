// Per-player state for world mode.

import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldPlayer {
  id: string; // "p1", "p2", etc.
  raceId: RaceId;
  leaderId: LeaderId | null;
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

  /** Hex keys ("q,r") the player has ever seen. Persists across turns. */
  exploredTiles: Set<string>;
  /** Hex keys ("q,r") currently in sight range. Recalculated each turn. */
  visibleTiles: Set<string>;
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
  leaderId: LeaderId | null = null,
): WorldPlayer {
  return {
    id,
    raceId,
    leaderId,
    gold: startingGold,
    food: startingFood,
    isAI,
    isAlive: true,
    activeResearch: null,
    researchTurnsLeft: 0,
    completedResearch: new Set(),
    exploredTiles: new Set(),
    visibleTiles: new Set(),
  };
}
