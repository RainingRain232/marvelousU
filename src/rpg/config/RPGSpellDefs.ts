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
