// RPG spell definitions — auto-derived from strategy mode UpgradeDefs.
// Each spell references an existing UpgradeType and adds RPG-specific stats
// (MP cost, atk multiplier, target count) for the turn-based battle system.

import { UpgradeType, UnitType } from "@/types";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import type { UpgradeDef } from "@sim/config/UpgradeDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpellSchool = "elemental" | "arcane" | "divine" | "shadow" | "conjuration";
export type SpellTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RPGSpellDef {
  id: UpgradeType;
  name: string;
  description: string;
  tier: SpellTier;
  school: SpellSchool;
  magicType: string;
  mpCost: number;
  /** Base damage (positive) or healing (negative). 0 for summons. */
  basePower: number;
  /** ATK multiplier used by RPG damage formula. */
  multiplier: number;
  /** Number of targets hit (1 = single, 2+ = multi-target). */
  targets: number;
  isHeal: boolean;
  isSummon: boolean;
  summonUnitType?: UnitType;
  /** Key for SpellFX.playDamage / playHeal. */
  fxKey: string;
  /** Optional status effect on hit. */
  statusEffect?: { type: "slow" | "poison"; duration: number; magnitude: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert strategy mana cost to RPG MP cost (scaled down, min 4). */
function toMpCost(manaCost: number): number {
  return Math.max(4, Math.round(manaCost / 6));
}

/** Derive atk multiplier from spell tier. */
function tierMultiplier(tier: SpellTier): number {
  return [0, 1.2, 1.6, 2.0, 2.5, 3.0, 3.6, 4.2][tier];
}

/** Estimate target count from spell radius. */
function radiusToTargets(radius: number): number {
  if (radius <= 1.0) return 1;
  if (radius <= 2.0) return 2;
  if (radius <= 3.0) return 3;
  if (radius <= 4.0) return 4;
  return 5; // massive AoE
}

/** Pretty-print an UpgradeType key into a display name. */
function spellName(type: UpgradeType): string {
  return (type as string)
    .replace(/^spell_/, "")
    .replace(/^summon_/, "Summon ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Derive the SpellFX key from the UpgradeType. */
function fxKeyFromType(type: UpgradeType, def: UpgradeDef): string {
  // Strip "spell_" prefix for FX lookup — matches SpellFX.playDamage switch cases
  const key = (type as string).replace(/^spell_/, "");
  // Summons use a generic effect
  if (def.spellType === "summon") return "arcane_missile";
  // Heals
  if (def.spellType === "heal") return key;
  return key;
}

// ---------------------------------------------------------------------------
// Build the catalog from UPGRADE_DEFINITIONS
// ---------------------------------------------------------------------------

export const RPG_SPELL_DEFS: Record<string, RPGSpellDef> = {};

/** All RPG spells grouped by tier for quick lookup. */
export const SPELLS_BY_TIER: Record<SpellTier, RPGSpellDef[]> = {
  1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
};

/** All RPG spells grouped by school. */
export const SPELLS_BY_SCHOOL: Record<SpellSchool, RPGSpellDef[]> = {
  elemental: [], arcane: [], divine: [], shadow: [], conjuration: [],
};

/** Max spells sold in a town magic shop. */
export const MAGIC_SHOP_MAX_SPELLS = 5;
/** Max tier sold in regular magic shops (T1–T3). */
export const MAGIC_SHOP_MAX_TIER: SpellTier = 3;
/** Max spells sold at the arcane library. */
export const ARCANE_LIBRARY_MAX_SPELLS = 8;

for (const [key, def] of Object.entries(UPGRADE_DEFINITIONS)) {
  if (!def.isSpell) continue;
  if (!def.spellTier || !def.spellSchool) continue;

  const tier = def.spellTier as SpellTier;
  const school = def.spellSchool as SpellSchool;
  const isHeal = def.spellType === "heal";
  const isSummon = def.spellType === "summon";
  const basePower = isHeal
    ? -(def.spellHeal ?? 0)
    : (def.spellDamage ?? 0);

  let statusEffect: RPGSpellDef["statusEffect"] | undefined;
  if (def.spellSlowDuration && def.spellSlowFactor) {
    statusEffect = {
      type: "slow",
      duration: Math.ceil(def.spellSlowDuration),
      magnitude: def.spellSlowFactor,
    };
  }

  const spell: RPGSpellDef = {
    id: key as UpgradeType,
    name: spellName(key as UpgradeType),
    description: def.description,
    tier,
    school,
    magicType: def.spellMagicType ?? "arcane",
    mpCost: toMpCost(def.manaCost ?? 30),
    basePower,
    multiplier: tierMultiplier(tier),
    targets: isSummon ? 0 : radiusToTargets(def.spellRadius ?? 1),
    isHeal,
    isSummon,
    summonUnitType: def.summonUnit,
    fxKey: fxKeyFromType(key as UpgradeType, def),
    statusEffect,
  };

  RPG_SPELL_DEFS[key] = spell;
  SPELLS_BY_TIER[tier].push(spell);
  SPELLS_BY_SCHOOL[school].push(spell);
}

// ---------------------------------------------------------------------------
// Magic shop / arcane library spell generation
// ---------------------------------------------------------------------------

/**
 * Generate spells for a town magic shop (max 5, tiers 1–3).
 * Higher tiers are rarer: T1 common, T2 uncommon, T3 rare (~15% chance).
 */
export function generateMagicShopSpells(seed: number): string[] {
  let s = seed | 0;
  function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const result: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < MAGIC_SHOP_MAX_SPELLS; i++) {
    // Tier weighting: 50% T1, 35% T2, 15% T3
    const roll = next();
    const tier: SpellTier = roll < 0.50 ? 1 : roll < 0.85 ? 2 : 3;
    const pool = SPELLS_BY_TIER[tier];
    if (pool.length === 0) continue;

    let picked = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const spell = pool[Math.floor(next() * pool.length)];
      if (!used.has(spell.id) && !spell.isSummon) {
        result.push(spell.id);
        used.add(spell.id);
        picked = true;
        break;
      }
    }
    // Fallback to any T1 spell
    if (!picked) {
      for (const spell of SPELLS_BY_TIER[1]) {
        if (!used.has(spell.id) && !spell.isSummon) {
          result.push(spell.id);
          used.add(spell.id);
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Generate spells for the Arcane Library (up to 8, tiers 4–7).
 */
export function generateArcaneLibrarySpells(seed: number): string[] {
  let s = seed | 0;
  function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const result: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < ARCANE_LIBRARY_MAX_SPELLS; i++) {
    // Tier weighting: 40% T4, 30% T5, 20% T6, 10% T7
    const roll = next();
    const tier: SpellTier = roll < 0.40 ? 4 : roll < 0.70 ? 5 : roll < 0.90 ? 6 : 7;
    const pool = SPELLS_BY_TIER[tier];
    if (pool.length === 0) continue;

    for (let attempt = 0; attempt < 20; attempt++) {
      const spell = pool[Math.floor(next() * pool.length)];
      if (!used.has(spell.id)) {
        result.push(spell.id);
        used.add(spell.id);
        break;
      }
    }
  }

  return result;
}

/** Price for buying a spell (based on tier). */
export function spellPrice(spellId: string): number {
  const spell = RPG_SPELL_DEFS[spellId];
  if (!spell) return 100;
  return [0, 50, 100, 200, 350, 550, 800, 1200][spell.tier];
}
