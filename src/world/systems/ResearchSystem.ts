// Research system for world mode.
//
// Advances one tech at a time per player. Completion unlocks
// buildings, unit tiers, and spell tiers.
// Also handles per-school magic research with fractional progress.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import {
  getResearchDef,
  getAvailableResearch,
  type ResearchDef,
} from "@world/config/ResearchDefs";
import {
  getMaxSchoolTier,
  magicTierCost,
} from "@world/config/MagicResearchDefs";
import { getRace } from "@sim/config/RaceDefs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _getLibraryBonus(player: WorldPlayer, state: WorldState): number {
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    if (city.buildings.some((b) => (b.type as string) === "library")) {
      return 1;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Normal research
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
  player.researchProgress = 0;

  return true;
}

/** Advance research by one turn. Uses fractional progress based on magicResearchRatio. */
export function advanceResearch(
  player: WorldPlayer,
  state: WorldState,
): ResearchDef | null {
  if (!player.activeResearch) return null;

  const def = getResearchDef(player.activeResearch);
  if (!def) return null;

  const libraryBonus = _getLibraryBonus(player, state);
  const crystalBonus = player.morgaineCrystals * 10;
  const scienceRatio = 1 - player.magicResearchRatio;
  const progress = scienceRatio * (1 + libraryBonus) + crystalBonus;

  player.researchProgress += progress;

  if (player.researchProgress >= def.turnsToComplete) {
    const completedId = player.activeResearch;
    player.completedResearch.add(completedId);
    player.activeResearch = null;
    player.researchTurnsLeft = 0;
    player.researchProgress = 0;

    return def;
  }

  // Update turnsLeft estimate for display
  const remaining = def.turnsToComplete - player.researchProgress;
  const perTurn = scienceRatio * (1 + libraryBonus) + crystalBonus;
  player.researchTurnsLeft = perTurn > 0 ? Math.ceil(remaining / perTurn) : 999;

  return null;
}

/** Check if a player has completed a specific research. */
export function hasResearch(player: WorldPlayer, researchId: string): boolean {
  return player.completedResearch.has(researchId);
}

/** Get all available research for a player. */
export function getPlayerAvailableResearch(player: WorldPlayer): ResearchDef[] {
  const race = player.raceId ? getRace(player.raceId) : null;
  return getAvailableResearch(player.completedResearch, player.raceId, race?.tiers as Record<string, number> | undefined);
}

// ---------------------------------------------------------------------------
// Magic research
// ---------------------------------------------------------------------------

/** Set the active magic research for a player. Returns true if valid. */
export function setActiveMagicResearch(
  player: WorldPlayer,
  school: string,
  tier: number,
): boolean {
  // Must be the next tier (current + 1)
  const currentTier = player.completedMagicResearch.get(school) ?? 0;
  if (tier !== currentTier + 1) return false;

  // Must not exceed race cap
  const maxTier = getMaxSchoolTier(player.raceId, school);
  if (tier > maxTier) return false;

  // Can only research one magic school at a time
  if (player.activeMagicResearch) return false;

  player.activeMagicResearch = { school, tier };
  player.magicResearchProgress = 0;

  return true;
}

/** Advance magic research by one turn. Returns completed {school, tier} if finished. */
export function advanceMagicResearch(
  player: WorldPlayer,
  state: WorldState,
): { school: string; tier: number } | null {
  if (!player.activeMagicResearch) return null;

  const { school, tier } = player.activeMagicResearch;
  const cost = magicTierCost(tier);

  const libraryBonus = _getLibraryBonus(player, state);
  const crystalBonus = player.morgaineCrystals * 10;
  const magicRatio = player.magicResearchRatio;
  const progress = magicRatio * (1 + libraryBonus) + crystalBonus;

  player.magicResearchProgress += progress;

  if (player.magicResearchProgress >= cost) {
    player.completedMagicResearch.set(school, tier);
    const completed = { ...player.activeMagicResearch };
    player.activeMagicResearch = null;
    player.magicResearchProgress = 0;
    return completed;
  }

  return null;
}
