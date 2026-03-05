// Magic research definitions — per-school tier research for world mode.

import { getRace, SPELL_MAGIC_TO_TIER, type RaceTiers } from "@sim/config/RaceDefs";

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

/** All researchable magic schools (11 magic types + conjuration). */
export const MAGIC_SCHOOLS = [
  "fire", "ice", "lightning", "earth", "nature",
  "arcane", "holy", "shadow", "poison", "void", "death",
  "conjuration",
] as const;

export type MagicSchoolId = (typeof MAGIC_SCHOOLS)[number];

export const MAGIC_SCHOOL_LABELS: Record<string, string> = {
  fire: "Fire", ice: "Ice", lightning: "Lightning", earth: "Earth",
  nature: "Nature", arcane: "Arcane", holy: "Holy", shadow: "Shadow",
  poison: "Poison", void: "Void", death: "Death", conjuration: "Conjuration",
};

export const MAGIC_SCHOOL_COLORS: Record<string, number> = {
  fire: 0xff4422, ice: 0x44aaff, lightning: 0xffff44, earth: 0x886633,
  nature: 0x44cc44, arcane: 0xaa44ff, holy: 0xffffaa, shadow: 0x666688,
  poison: 0x88cc22, void: 0x8844aa, death: 0x888888, conjuration: 0xcc8844,
};

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

/** Turns to complete a given tier of magic research. */
export function magicTierCost(tier: number): number {
  return 2 + tier * 2;
}

// ---------------------------------------------------------------------------
// Race tier caps
// ---------------------------------------------------------------------------

/** Maps a magic school id to the corresponding RaceTiers key. */
function schoolToTierKey(school: string): keyof RaceTiers | null {
  if (school === "conjuration") return "summon";
  return SPELL_MAGIC_TO_TIER[school] ?? null;
}

/** Get the maximum tier a race can research for a given school. */
export function getMaxSchoolTier(raceId: string, school: string): number {
  const race = getRace(raceId);
  if (!race?.tiers) return 0;
  const key = schoolToTierKey(school);
  if (!key) return 0;
  return race.tiers[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Spell unlock check
// ---------------------------------------------------------------------------

/**
 * Check if a spell is unlocked given the player's completed magic research.
 * Conjuration spells (summons) require both their magic type tier AND
 * the conjuration tier to meet the spell's tier.
 */
export function isSpellMagicUnlocked(
  completedMagicResearch: Map<string, number>,
  spellMagicType: string,
  spellTier: number,
  isConjuration: boolean,
): boolean {
  const schoolTier = completedMagicResearch.get(spellMagicType) ?? 0;
  if (schoolTier < spellTier) return false;
  if (isConjuration) {
    const conjTier = completedMagicResearch.get("conjuration") ?? 0;
    if (conjTier < spellTier) return false;
  }
  return true;
}
