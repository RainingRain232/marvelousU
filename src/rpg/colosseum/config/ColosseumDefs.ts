// Colosseum configuration — tiers, AI team names, unit pools, season rewards
import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Tournament tiers
// ---------------------------------------------------------------------------

export interface ColosseumTier {
  name: string;
  levelRange: [number, number];
  entryFee: number;
  baseXPReward: number;
  baseGoldReward: number;
  eloRange: [number, number];
}

export const COLOSSEUM_TIERS: ColosseumTier[] = [
  { name: "Bronze Cup", levelRange: [1, 10], entryFee: 100, baseXPReward: 200, baseGoldReward: 300, eloRange: [0, 1200] },
  { name: "Silver Cup", levelRange: [8, 18], entryFee: 250, baseXPReward: 500, baseGoldReward: 800, eloRange: [1000, 1600] },
  { name: "Gold Cup", levelRange: [15, 25], entryFee: 500, baseXPReward: 1000, baseGoldReward: 1500, eloRange: [1400, 2000] },
  { name: "Champion Cup", levelRange: [22, 30], entryFee: 1000, baseXPReward: 2000, baseGoldReward: 3000, eloRange: [1800, 9999] },
];

export function getAvailableColosseumTiers(elo: number): ColosseumTier[] {
  return COLOSSEUM_TIERS.filter(t => elo >= t.eloRange[0]);
}

// ---------------------------------------------------------------------------
// AI team names
// ---------------------------------------------------------------------------

export const AI_TEAM_NAMES: string[] = [
  "Iron Wolves", "Shadow Blades", "Storm Hawks", "Blood Lions",
  "Frost Giants", "Thunder Bears", "Dark Ravens", "Golden Eagles",
  "Silver Serpents", "Crimson Flames", "Night Stalkers", "War Hammers",
  "Stone Guardians", "Wild Fangs", "Ember Knights", "Bone Crushers",
  "Sky Raiders", "Pale Riders", "Black Thorns", "Steel Vipers",
  "Ghost Walkers", "Fire Breathers", "Ice Reapers", "Sand Scorpions",
];

// ---------------------------------------------------------------------------
// Unit type pools for AI team generation
// ---------------------------------------------------------------------------

export const ARENA_UNIT_POOLS = {
  melee: [UnitType.KNIGHT, UnitType.SWORDSMAN, UnitType.GLADIATOR, UnitType.PIKEMAN, UnitType.TEMPLAR],
  ranged: [UnitType.ARCHER, UnitType.CROSSBOWMAN, UnitType.LONGBOWMAN],
  mage: [UnitType.FIRE_MAGE, UnitType.STORM_MAGE, UnitType.COLD_MAGE],
  healer: [UnitType.CLERIC, UnitType.MONK],
};

// ---------------------------------------------------------------------------
// Season rewards
// ---------------------------------------------------------------------------

export interface SeasonReward {
  minElo: number;
  gold: number;
  title: string;
}

export const SEASON_REWARDS: SeasonReward[] = [
  { minElo: 1200, gold: 500, title: "Bronze Champion" },
  { minElo: 1500, gold: 2000, title: "Silver Champion" },
  { minElo: 2000, gold: 5000, title: "Gold Champion" },
  { minElo: 2500, gold: 10000, title: "Legendary Champion" },
];

// ---------------------------------------------------------------------------
// Bet amounts per tier
// ---------------------------------------------------------------------------

export const COLOSSEUM_BET_AMOUNTS = [50, 100, 200, 500, 1000];
