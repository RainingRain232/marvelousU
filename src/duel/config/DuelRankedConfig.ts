// ---------------------------------------------------------------------------
// Duel mode – ranked progression system
// ---------------------------------------------------------------------------

export interface DuelRankTier {
  id: string;
  name: string;
  color: number;
  /** Minimum RP to reach this tier */
  minRP: number;
  /** Division count within the tier (1-3, or 0 for top tier) */
  divisions: number;
  /** RP per division within the tier */
  rpPerDivision: number;
}

export const DUEL_RANK_TIERS: DuelRankTier[] = [
  { id: "iron",    name: "Iron",    color: 0x8a8a8a, minRP: 0,    divisions: 3, rpPerDivision: 100 },
  { id: "bronze",  name: "Bronze",  color: 0xcd7f32, minRP: 300,  divisions: 3, rpPerDivision: 150 },
  { id: "silver",  name: "Silver",  color: 0xc0c0c0, minRP: 750,  divisions: 3, rpPerDivision: 200 },
  { id: "gold",    name: "Gold",    color: 0xffd700, minRP: 1350, divisions: 3, rpPerDivision: 250 },
  { id: "diamond", name: "Diamond", color: 0x44ddff, minRP: 2100, divisions: 0, rpPerDivision: 0 },
];

export interface DuelRankInfo {
  tier: DuelRankTier;
  division: number;       // 1-3 (3 = lowest in tier), 0 for diamond
  rp: number;             // total rank points
  rpInDivision: number;   // progress within current division
  rpForNextDiv: number;   // RP needed for next division
}

/** Resolve a rank from total RP. */
export function resolveRank(rp: number): DuelRankInfo {
  let tier = DUEL_RANK_TIERS[0];
  for (const t of DUEL_RANK_TIERS) {
    if (rp >= t.minRP) tier = t;
  }

  if (tier.divisions === 0) {
    // Top tier (diamond) — no divisions
    return { tier, division: 0, rp, rpInDivision: 0, rpForNextDiv: 0 };
  }

  const rpInTier = rp - tier.minRP;
  const division = Math.min(tier.divisions, Math.floor(rpInTier / tier.rpPerDivision) + 1);
  const rpInDivision = rpInTier - (division - 1) * tier.rpPerDivision;
  const rpForNextDiv = tier.rpPerDivision;

  return { tier, division, rp, rpInDivision, rpForNextDiv };
}

/** Format rank as a display string. */
export function formatRank(info: DuelRankInfo): string {
  if (info.tier.divisions === 0) return info.tier.name;
  const romanDiv = ["I", "II", "III"][info.division - 1] ?? "I";
  return `${info.tier.name} ${romanDiv}`;
}

/** Calculate RP change for a match result. */
export function calculateRPChange(
  currentRP: number,
  opponentRP: number,
  won: boolean,
): number {
  const rpDiff = opponentRP - currentRP;
  const base = won ? 25 : -20;
  // Bonus/penalty based on RP differential
  const diffBonus = Math.round(rpDiff * 0.1);
  const change = base + (won ? Math.max(0, diffBonus) : Math.min(0, diffBonus));
  // Never go below 0 RP
  if (!won && currentRP + change < 0) return -currentRP;
  return change;
}

export interface DuelRankedState {
  rp: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  matchHistory: DuelRankedMatchResult[];
}

export interface DuelRankedMatchResult {
  opponentCharId: string;
  won: boolean;
  rpChange: number;
  timestamp: number;
}

export function createDuelRankedState(): DuelRankedState {
  return {
    rp: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    matchHistory: [],
  };
}
