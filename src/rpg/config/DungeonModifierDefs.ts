// Procedural dungeon modifiers — random rules applied per dungeon run
import type { SeededRandom } from "@sim/utils/random";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DungeonModifierCategory = "enemy" | "loot" | "environment" | "party";

export interface DungeonModifierDef {
  id: string;
  name: string;
  description: string;
  category: DungeonModifierCategory;
  /** Icon hint for the UI. */
  icon: string;
  /** Multiplier adjustments applied during generation / combat. */
  effects: DungeonModifierEffects;
}

export interface DungeonModifierEffects {
  /** Enemy HP multiplier (1.0 = unchanged). */
  enemyHpMult?: number;
  /** Enemy ATK multiplier. */
  enemyAtkMult?: number;
  /** Enemy DEF multiplier. */
  enemyDefMult?: number;
  /** Gold drop multiplier. */
  goldDropMult?: number;
  /** XP gain multiplier. */
  xpGainMult?: number;
  /** Party sight radius override (tiles). Undefined = no change. */
  sightRadius?: number;
  /** Extra encounter rate multiplier. */
  encounterRateMult?: number;
  /** Trap damage multiplier. */
  trapDamageMult?: number;
  /** Party HP regen per step (can be negative for drain). */
  partyRegenPerStep?: number;
  /** Enemy regen per turn in combat (flat HP). */
  enemyRegenPerTurn?: number;
  /** Extra treasure chance additive (0..1). */
  treasureChanceBonus?: number;
  /** Party max HP multiplier applied at dungeon entry. */
  partyMaxHpMult?: number;
  /** Poison duration multiplier on traps. */
  poisonDurationMult?: number;
}

// ---------------------------------------------------------------------------
// Modifier Definitions
// ---------------------------------------------------------------------------

export const DUNGEON_MODIFIER_DEFS: DungeonModifierDef[] = [
  // --- Enemy modifiers ---
  {
    id: "mod_enemy_regen",
    name: "Regeneration",
    description: "All enemies regenerate 3 HP per turn.",
    category: "enemy",
    icon: "heart_pulse",
    effects: { enemyRegenPerTurn: 3 },
  },
  {
    id: "mod_enemy_armored",
    name: "Armored Foes",
    description: "All enemies have +30% defense.",
    category: "enemy",
    icon: "shield",
    effects: { enemyDefMult: 1.3 },
  },
  {
    id: "mod_enemy_berserk",
    name: "Berserker Horde",
    description: "Enemies deal +25% damage but have -20% HP.",
    category: "enemy",
    icon: "crossed_swords",
    effects: { enemyAtkMult: 1.25, enemyHpMult: 0.8 },
  },
  {
    id: "mod_enemy_swarm",
    name: "Swarm",
    description: "Encounter rate doubled — more enemies per room.",
    category: "enemy",
    icon: "bug",
    effects: { encounterRateMult: 2.0 },
  },
  {
    id: "mod_enemy_elite",
    name: "Elite Forces",
    description: "All enemies have +20% HP and +15% ATK.",
    category: "enemy",
    icon: "crown",
    effects: { enemyHpMult: 1.2, enemyAtkMult: 1.15 },
  },

  // --- Loot modifiers ---
  {
    id: "mod_gold_doubled",
    name: "Golden Halls",
    description: "Gold drops are doubled throughout the dungeon.",
    category: "loot",
    icon: "coin",
    effects: { goldDropMult: 2.0 },
  },
  {
    id: "mod_xp_boost",
    name: "Wisdom of the Ancients",
    description: "+50% XP from all encounters.",
    category: "loot",
    icon: "star",
    effects: { xpGainMult: 1.5 },
  },
  {
    id: "mod_treasure_aplenty",
    name: "Treasure Aplenty",
    description: "Treasure rooms appear more frequently.",
    category: "loot",
    icon: "chest",
    effects: { treasureChanceBonus: 0.25 },
  },
  {
    id: "mod_gold_scarce",
    name: "Barren Halls",
    description: "Gold drops reduced by 50%, but XP +25%.",
    category: "loot",
    icon: "empty_purse",
    effects: { goldDropMult: 0.5, xpGainMult: 1.25 },
  },

  // --- Environment modifiers ---
  {
    id: "mod_darkness",
    name: "Darkness",
    description: "Reduced vision radius — only 3 tiles of sight.",
    category: "environment",
    icon: "moon",
    effects: { sightRadius: 3 },
  },
  {
    id: "mod_toxic_air",
    name: "Toxic Air",
    description: "The party loses 2 HP per step from poisonous fumes.",
    category: "environment",
    icon: "skull",
    effects: { partyRegenPerStep: -2 },
  },
  {
    id: "mod_trapped_halls",
    name: "Trapped Halls",
    description: "Traps deal double damage.",
    category: "environment",
    icon: "trap",
    effects: { trapDamageMult: 2.0 },
  },
  {
    id: "mod_lingering_poison",
    name: "Lingering Poison",
    description: "Poison effects from traps last 50% longer.",
    category: "environment",
    icon: "poison",
    effects: { poisonDurationMult: 1.5 },
  },
  {
    id: "mod_healing_springs",
    name: "Healing Springs",
    description: "The party regenerates 1 HP per step.",
    category: "environment",
    icon: "spring",
    effects: { partyRegenPerStep: 1 },
  },

  // --- Party modifiers ---
  {
    id: "mod_fragile",
    name: "Fragile",
    description: "Party max HP reduced by 20%.",
    category: "party",
    icon: "broken_heart",
    effects: { partyMaxHpMult: 0.8 },
  },
  {
    id: "mod_fortified",
    name: "Fortified",
    description: "Party max HP increased by 15%.",
    category: "party",
    icon: "fortress",
    effects: { partyMaxHpMult: 1.15 },
  },
];

// ---------------------------------------------------------------------------
// Roll modifiers for a dungeon run
// ---------------------------------------------------------------------------

/**
 * Pick 1-3 random modifiers for a dungeon run using the provided seeded RNG.
 * Avoids picking conflicting modifiers (e.g. two sight modifiers).
 */
export function rollDungeonModifiers(rng: SeededRandom, count?: number): DungeonModifierDef[] {
  const numModifiers = count ?? (rng.int(1, 4)); // 1-3 modifiers
  const pool = [...DUNGEON_MODIFIER_DEFS];
  const selected: DungeonModifierDef[] = [];
  const usedCategories = new Set<string>();

  for (let i = 0; i < numModifiers && pool.length > 0; i++) {
    const idx = rng.int(0, pool.length - 1);
    const mod = pool[idx];

    // Avoid stacking too many of the same category (max 2 per category)
    const catCount = selected.filter(s => s.category === mod.category).length;
    if (catCount >= 2) {
      pool.splice(idx, 1);
      i--; // retry
      continue;
    }

    selected.push(mod);
    pool.splice(idx, 1);
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Merge modifier effects into a single combined effects object
// ---------------------------------------------------------------------------

export function mergeModifierEffects(modifiers: DungeonModifierDef[]): DungeonModifierEffects {
  const merged: DungeonModifierEffects = {};

  for (const mod of modifiers) {
    const e = mod.effects;

    // Multiplicative stacking
    if (e.enemyHpMult !== undefined) merged.enemyHpMult = (merged.enemyHpMult ?? 1) * e.enemyHpMult;
    if (e.enemyAtkMult !== undefined) merged.enemyAtkMult = (merged.enemyAtkMult ?? 1) * e.enemyAtkMult;
    if (e.enemyDefMult !== undefined) merged.enemyDefMult = (merged.enemyDefMult ?? 1) * e.enemyDefMult;
    if (e.goldDropMult !== undefined) merged.goldDropMult = (merged.goldDropMult ?? 1) * e.goldDropMult;
    if (e.xpGainMult !== undefined) merged.xpGainMult = (merged.xpGainMult ?? 1) * e.xpGainMult;
    if (e.encounterRateMult !== undefined) merged.encounterRateMult = (merged.encounterRateMult ?? 1) * e.encounterRateMult;
    if (e.trapDamageMult !== undefined) merged.trapDamageMult = (merged.trapDamageMult ?? 1) * e.trapDamageMult;
    if (e.partyMaxHpMult !== undefined) merged.partyMaxHpMult = (merged.partyMaxHpMult ?? 1) * e.partyMaxHpMult;
    if (e.poisonDurationMult !== undefined) merged.poisonDurationMult = (merged.poisonDurationMult ?? 1) * e.poisonDurationMult;

    // Additive stacking
    if (e.partyRegenPerStep !== undefined) merged.partyRegenPerStep = (merged.partyRegenPerStep ?? 0) + e.partyRegenPerStep;
    if (e.enemyRegenPerTurn !== undefined) merged.enemyRegenPerTurn = (merged.enemyRegenPerTurn ?? 0) + e.enemyRegenPerTurn;
    if (e.treasureChanceBonus !== undefined) merged.treasureChanceBonus = (merged.treasureChanceBonus ?? 0) + e.treasureChanceBonus;

    // Last-write-wins for overrides
    if (e.sightRadius !== undefined) merged.sightRadius = Math.min(merged.sightRadius ?? 99, e.sightRadius);
  }

  return merged;
}
