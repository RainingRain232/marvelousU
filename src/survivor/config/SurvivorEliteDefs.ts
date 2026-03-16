// ---------------------------------------------------------------------------
// Elite enemy type definitions
// ---------------------------------------------------------------------------

export type EliteType = "charger" | "ranged" | "shielded" | "summoner";

export interface SurvivorEliteDef {
  type: EliteType;
  name: string;
  description: string;
  hpMultiplier: number;
  tintColor: number;
  abilityCooldown: number; // seconds between ability uses
  shieldHpRatio: number; // shield HP as a ratio of max HP (shielded only)
}

export const ELITE_DEFS: Record<EliteType, SurvivorEliteDef> = {
  charger: {
    type: "charger",
    name: "Charger",
    description: "Dashes toward the player at 3x speed, dealing 2x bonus damage on impact",
    hpMultiplier: 2.0,
    tintColor: 0xff6644,
    abilityCooldown: 4.0,
    shieldHpRatio: 0,
  },
  ranged: {
    type: "ranged",
    name: "Ranged",
    description: "Fires projectiles from distance and kites away when the player gets close",
    hpMultiplier: 1.5,
    tintColor: 0x44aaff,
    abilityCooldown: 3.0,
    shieldHpRatio: 0,
  },
  shielded: {
    type: "shielded",
    name: "Shielded",
    description: "Has a shield absorbing 30% max HP in damage; slowly regenerates over time",
    hpMultiplier: 3.0,
    tintColor: 0x8888ff,
    abilityCooldown: 5.0, // shield regen ticks every 5 seconds
    shieldHpRatio: 0.3,
  },
  summoner: {
    type: "summoner",
    name: "Summoner",
    description: "Periodically spawns weaker minions to overwhelm the player",
    hpMultiplier: 1.8,
    tintColor: 0xaa44ff,
    abilityCooldown: 8.0,
    shieldHpRatio: 0,
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
