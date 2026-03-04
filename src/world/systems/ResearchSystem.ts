// Research system for world mode.
//
// Advances one tech at a time per player. Completion unlocks
// buildings, unit tiers, and spell tiers.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import {
  getResearchDef,
  getAvailableResearch,
  type ResearchDef,
} from "@world/config/ResearchDefs";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Set the active research for a player. Returns true if valid. */
export function setActiveResearch(
  player: WorldPlayer,
  researchId: string,
): boolean {
  const def = getResearchDef(researchId);
  if (!def) return false;

  // Already completed
  if (player.completedResearch.has(researchId)) return false;

  // Check prerequisites
  for (const prereq of def.prerequisites) {
    if (!player.completedResearch.has(prereq)) return false;
  }

  player.activeResearch = researchId;
  player.researchTurnsLeft = def.turnsToComplete;

  // Apply Library bonus (if player has a city with Library)
  // This will be checked from state when needed

  return true;
}

/** Advance research by one turn. Returns completed ResearchDef if finished, null otherwise. */
export function advanceResearch(
  player: WorldPlayer,
  state: WorldState,
): ResearchDef | null {
  if (!player.activeResearch) return null;

  // Library bonus: -1 turn if any owned city has a Library
  let libraryBonus = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    if (city.buildings.some((b) => b.type === "library")) {
      libraryBonus = 1;
      break;
    }
  }

  player.researchTurnsLeft -= (1 + libraryBonus);

  if (player.researchTurnsLeft <= 0) {
    const completedId = player.activeResearch;
    player.completedResearch.add(completedId);
    player.activeResearch = null;
    player.researchTurnsLeft = 0;

    const def = getResearchDef(completedId);
    return def;
  }

  return null;
}

/** Check if a player has completed a specific research. */
export function hasResearch(player: WorldPlayer, researchId: string): boolean {
  return player.completedResearch.has(researchId);
}

/** Get all available research for a player. */
export function getPlayerAvailableResearch(player: WorldPlayer): ResearchDef[] {
  return getAvailableResearch(player.completedResearch);
}
