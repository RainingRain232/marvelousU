// Per-player state for world mode.

import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";
import type { ArmoryItemId } from "@sim/config/ArmoryItemDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldPlayer {
  id: string; // "p1", "p2", etc.
  raceId: RaceId;
  leaderId: LeaderId | null;
  gold: number;
  food: number;
  mana: number;
  isAI: boolean;
  isAlive: boolean;

  /** Currently researching tech (null = none). */
  activeResearch: string | null;
  /** Turns remaining on active research. */
  researchTurnsLeft: number;
  /** Accumulated fractional progress toward current normal research. */
  researchProgress: number;
  /** Set of completed research IDs. */
  completedResearch: Set<string>;

  /** Currently researching magic school tier (null = none). */
  activeMagicResearch: { school: string; tier: number } | null;
  /** Accumulated fractional progress toward current magic research. */
  magicResearchProgress: number;
  /** School → highest completed tier. */
  completedMagicResearch: Map<string, number>;
  /** Fraction of research effort devoted to magic (0.0–1.0). */
  magicResearchRatio: number;

  /** Equipped armory items (hero stat bonuses). */
  armoryItems: ArmoryItemId[];

  /** Diplomatic relations: playerId → "war" | "peace". All start at war. */
  diplomacy: Map<string, "war" | "peace">;

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
  armoryItems: ArmoryItemId[] = [],
): WorldPlayer {
  return {
    id,
    raceId,
    leaderId,
    gold: startingGold,
    food: startingFood,
    mana: 0,
    isAI,
    isAlive: true,
    armoryItems,
    activeResearch: null,
    researchTurnsLeft: 0,
    researchProgress: 0,
    completedResearch: new Set(),
    activeMagicResearch: null,
    magicResearchProgress: 0,
    completedMagicResearch: new Map(),
    magicResearchRatio: 0.5,
    diplomacy: new Map(),
    exploredTiles: new Set(),
    visibleTiles: new Set(),
  };
}
