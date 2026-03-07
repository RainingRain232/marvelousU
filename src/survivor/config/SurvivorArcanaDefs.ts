// ---------------------------------------------------------------------------
// Arcana / relic definitions — powerful one-time pickups
// ---------------------------------------------------------------------------

export interface SurvivorArcanaDef {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "legendary";
  // Stat modifiers (multiplicative)
  damageMultiplier: number;   // 1.0 = no change
  cooldownMultiplier: number; // <1 = faster
  areaMultiplier: number;
  // Special rule keys checked by game systems
  specialRule: string | null;
}

export const ARCANA_DEFS: SurvivorArcanaDef[] = [
  {
    id: "bloodlust",
    name: "Bloodlust",
    description: "Kill streaks (5+ in 3s) grant 50% attack speed for 5s",
    rarity: "rare",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "bloodlust",
  },
  {
    id: "glass_cannon",
    name: "Glass Cannon",
    description: "+100% damage, -50% max HP",
    rarity: "legendary",
    damageMultiplier: 2.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "glass_cannon",
  },
  {
    id: "eternal_frost",
    name: "Eternal Frost",
    description: "All attacks have 20% chance to freeze enemies for 1s",
    rarity: "rare",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "eternal_frost",
  },
  {
    id: "golden_touch",
    name: "Golden Touch",
    description: "+200% gold gain",
    rarity: "common",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "golden_touch",
  },
  {
    id: "resurrection",
    name: "Resurrection",
    description: "Survive one lethal hit (restore to 30% HP)",
    rarity: "legendary",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "resurrection",
  },
  {
    id: "vampiric_aura",
    name: "Vampiric Aura",
    description: "All damage heals 3% of damage dealt",
    rarity: "rare",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "vampiric_aura",
  },
  {
    id: "rapid_fire",
    name: "Rapid Fire",
    description: "-30% cooldown on all weapons",
    rarity: "common",
    damageMultiplier: 1.0,
    cooldownMultiplier: 0.7,
    areaMultiplier: 1.0,
    specialRule: null,
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    description: "+100% damage to bosses and elites",
    rarity: "rare",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "giant_slayer",
  },
  {
    id: "wide_reach",
    name: "Wide Reach",
    description: "+50% area of effect",
    rarity: "common",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.5,
    specialRule: null,
  },
  {
    id: "chain_explosion",
    name: "Chain Explosion",
    description: "Enemies explode on death, dealing 20% of their max HP to nearby enemies",
    rarity: "legendary",
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    areaMultiplier: 1.0,
    specialRule: "chain_explosion",
  },
];

export const MAX_ARCANA = 3;
export const ARCANA_CHOICES = 3;
