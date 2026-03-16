// ---------------------------------------------------------------------------
// Tekken mode – Ranked progression / ELO system
// ---------------------------------------------------------------------------

export type TekkenRankTier = "iron" | "bronze" | "silver" | "gold" | "diamond";

export interface TekkenRankDef {
  tier: TekkenRankTier;
  name: string;
  minRating: number;
  color: number;
  icon: string; // emoji/text icon for HUD display
}

export const TEKKEN_RANKS: TekkenRankDef[] = [
  { tier: "iron",    name: "Iron",    minRating: 0,    color: 0x888888, icon: "\u2699" },
  { tier: "bronze",  name: "Bronze",  minRating: 800,  color: 0xcc8844, icon: "\u2694" },
  { tier: "silver",  name: "Silver",  minRating: 1200, color: 0xcccccc, icon: "\u269C" },
  { tier: "gold",    name: "Gold",    minRating: 1600, color: 0xffcc00, icon: "\u2655" },
  { tier: "diamond", name: "Diamond", minRating: 2000, color: 0x44ddff, icon: "\u2666" },
];

export interface TekkenRankedProfile {
  rating: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  rankTier: TekkenRankTier;
  /** Track per-character wins for character-specific stats */
  characterWins: Record<string, number>;
  characterLosses: Record<string, number>;
  /** Recent match history (last 20) */
  recentMatches: TekkenMatchResult[];
}

export interface TekkenMatchResult {
  opponentCharacterId: string;
  playerCharacterId: string;
  won: boolean;
  ratingChange: number;
  timestamp: number;
}

/** ELO K-factor: higher at low ratings for faster placement */
function getKFactor(rating: number): number {
  if (rating < 800) return 40;
  if (rating < 1200) return 32;
  if (rating < 1600) return 24;
  return 16;
}

/** Calculate expected win probability (standard ELO formula) */
function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/** Calculate rating change after a match */
export function calculateRatingChange(
  playerRating: number,
  opponentRating: number,
  won: boolean,
  winStreak: number,
): number {
  const expected = expectedScore(playerRating, opponentRating);
  const actual = won ? 1 : 0;
  const k = getKFactor(playerRating);
  // Win streak bonus: +2 per consecutive win beyond 3
  const streakBonus = won && winStreak >= 3 ? (winStreak - 2) * 2 : 0;
  const change = Math.round(k * (actual - expected) + streakBonus);
  return change;
}

/** Get the rank definition for a given rating */
export function getRankForRating(rating: number): TekkenRankDef {
  let rank = TEKKEN_RANKS[0];
  for (const r of TEKKEN_RANKS) {
    if (rating >= r.minRating) rank = r;
  }
  return rank;
}

/** Check if a rank transition occurred (promotion or demotion) */
export function checkRankTransition(
  oldRating: number,
  newRating: number,
): { promoted: boolean; demoted: boolean; newRank: TekkenRankDef } {
  const oldRank = getRankForRating(oldRating);
  const newRank = getRankForRating(newRating);
  return {
    promoted: newRank.minRating > oldRank.minRating,
    demoted: newRank.minRating < oldRank.minRating,
    newRank,
  };
}

/** Create a fresh ranked profile */
export function createRankedProfile(): TekkenRankedProfile {
  return {
    rating: 500,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    rankTier: "iron",
    characterWins: {},
    characterLosses: {},
    recentMatches: [],
  };
}

/** Apply a match result to the ranked profile and return the updated profile */
export function applyMatchResult(
  profile: TekkenRankedProfile,
  playerCharId: string,
  opponentCharId: string,
  won: boolean,
  opponentRating: number,
): { profile: TekkenRankedProfile; ratingChange: number; rankTransition: ReturnType<typeof checkRankTransition> | null } {
  const oldRating = profile.rating;
  const streak = won ? profile.winStreak + 1 : 0;
  const ratingChange = calculateRatingChange(profile.rating, opponentRating, won, streak);
  const newRating = Math.max(0, profile.rating + ratingChange);

  const updated: TekkenRankedProfile = {
    ...profile,
    rating: newRating,
    wins: profile.wins + (won ? 1 : 0),
    losses: profile.losses + (won ? 0 : 1),
    winStreak: won ? streak : 0,
    bestWinStreak: Math.max(profile.bestWinStreak, won ? streak : 0),
    rankTier: getRankForRating(newRating).tier,
    characterWins: { ...profile.characterWins },
    characterLosses: { ...profile.characterLosses },
    recentMatches: [
      {
        opponentCharacterId: opponentCharId,
        playerCharacterId: playerCharId,
        won,
        ratingChange,
        timestamp: Date.now(),
      },
      ...profile.recentMatches.slice(0, 19),
    ],
  };

  if (won) {
    updated.characterWins[playerCharId] = (updated.characterWins[playerCharId] ?? 0) + 1;
  } else {
    updated.characterLosses[playerCharId] = (updated.characterLosses[playerCharId] ?? 0) + 1;
  }

  const transition = checkRankTransition(oldRating, newRating);
  const hasTransition = transition.promoted || transition.demoted;

  return {
    profile: updated,
    ratingChange,
    rankTransition: hasTransition ? transition : null,
  };
}
