// ELO ranking and season system for the Colosseum
import { SEASON_REWARDS } from "../config/ColosseumDefs";
import type { SeasonReward } from "../config/ColosseumDefs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const K_FACTOR = 32;
const STARTING_ELO = 1000;

// ---------------------------------------------------------------------------
// ELO calculation
// ---------------------------------------------------------------------------

export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  won: boolean,
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actual = won ? 1 : 0;
  return Math.round(K_FACTOR * (actual - expected));
}

/** Estimate opponent ELO from average team level + tier. */
export function getOpponentElo(averageTeamLevel: number, tierIndex: number): number {
  return STARTING_ELO + averageTeamLevel * 20 + tierIndex * 200;
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

/** Soft reset: move halfway back to starting ELO. */
export function resetSeason(currentElo: number): number {
  return Math.round((currentElo + STARTING_ELO) / 2);
}

export function getSeasonRewards(elo: number): SeasonReward | null {
  let best: SeasonReward | null = null;
  for (const reward of SEASON_REWARDS) {
    if (elo >= reward.minElo) {
      if (!best || reward.minElo > best.minElo) best = reward;
    }
  }
  return best;
}

export function getEloRankTitle(elo: number): string {
  if (elo >= 2500) return "Legendary";
  if (elo >= 2000) return "Gold";
  if (elo >= 1500) return "Silver";
  if (elo >= 1200) return "Bronze";
  return "Unranked";
}
