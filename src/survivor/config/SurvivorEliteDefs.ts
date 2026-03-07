// ---------------------------------------------------------------------------
// Elite enemy type definitions
// ---------------------------------------------------------------------------

export type EliteType = "charger" | "ranged" | "shielded" | "summoner";

export interface SurvivorEliteDef {
  type: EliteType;
  name: string;
  hpMultiplier: number;
  tintColor: number;
  abilityCooldown: number; // seconds between ability uses
}

export const ELITE_DEFS: Record<EliteType, SurvivorEliteDef> = {
  charger: {
    type: "charger",
    name: "Charger",
    hpMultiplier: 2.0,
    tintColor: 0xff6644,
    abilityCooldown: 4.0,
  },
  ranged: {
    type: "ranged",
    name: "Ranged",
    hpMultiplier: 1.5,
    tintColor: 0x44aaff,
    abilityCooldown: 3.0,
  },
  shielded: {
    type: "shielded",
    name: "Shielded",
    hpMultiplier: 3.0,
    tintColor: 0x8888ff,
    abilityCooldown: 0, // passive ability
  },
  summoner: {
    type: "summoner",
    name: "Summoner",
    hpMultiplier: 1.8,
    tintColor: 0xaa44ff,
    abilityCooldown: 8.0,
  },
};

// Elite spawn configuration
export const ELITE_CONFIG = {
  MIN_MINUTE: 5,         // elites don't spawn before minute 5
  BASE_CHANCE: 0.05,     // 5% base chance per enemy spawn
  CHANCE_PER_MIN: 0.005, // +0.5% per minute
  MAX_CHANCE: 0.15,      // 15% cap
  GEM_TIER_BONUS: 1,     // drop gems one tier higher
} as const;
