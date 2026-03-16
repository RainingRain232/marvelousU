// Spell learning system — determines which spells a character can learn on level-up
// and manages the D&D-style tier progression.

import { UnitType, UpgradeType } from "@/types";
import type { PartyMember } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import {
  RPG_SPELL_DEFS,
  SPELLS_BY_TIER,
  type RPGSpellDef,
  type SpellSchool,
  type SpellTier,
} from "@rpg/config/RPGSpellDefs";

// ---------------------------------------------------------------------------
// Class classification
// ---------------------------------------------------------------------------

const MAGE_UNIT_TYPES: Set<UnitType> = new Set([
  UnitType.FIRE_MAGE,
  UnitType.STORM_MAGE,
  UnitType.COLD_MAGE,
  UnitType.DISTORTION_MAGE,
  UnitType.FIRE_ADEPT_MAGE,
  UnitType.COLD_ADEPT_MAGE,
  UnitType.LIGHTNING_ADEPT_MAGE,
  UnitType.DISTORTION_ADEPT_MAGE,
  UnitType.FIRE_MASTER_MAGE,
  UnitType.COLD_MASTER_MAGE,
  UnitType.LIGHTNING_MASTER_MAGE,
  UnitType.DISTORTION_MASTER_MAGE,
  UnitType.ARCHMAGE,
  UnitType.DARK_SAVANT,
  UnitType.BATTLEMAGE,
  UnitType.GIANT_MAGE,
  UnitType.SPELL_WEAVER,
  UnitType.SUMMONER,
  UnitType.CONSTRUCTIONIST,
]);

const HEALER_UNIT_TYPES: Set<UnitType> = new Set([
  UnitType.MONK,
  UnitType.CLERIC,
  UnitType.SAINT,
  UnitType.TEMPLAR,
  UnitType.KNIGHT,
  UnitType.ANGEL,
]);

// School access per class type
const MAGE_SCHOOLS: SpellSchool[] = ["elemental", "arcane", "shadow", "conjuration"];
const HEALER_SCHOOLS: SpellSchool[] = ["divine", "arcane"];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isMageCaster(unitType: UnitType): boolean {
  return MAGE_UNIT_TYPES.has(unitType);
}

export function isHealerCaster(unitType: UnitType): boolean {
  return HEALER_UNIT_TYPES.has(unitType);
}

export function isCaster(unitType: UnitType): boolean {
  return isMageCaster(unitType) || isHealerCaster(unitType);
}

/** Returns the highest spell tier a character of this level can learn. */
export function maxTierForLevel(level: number): SpellTier {
  // Levels 1-2 → T1, 3-4 → T2, ... 13-14 → T7
  const tier = Math.min(7, Math.max(1, Math.ceil(level / 2))) as SpellTier;
  return tier;
}

/** How many spells can this member pick on a single level-up? */
export function spellPicksOnLevelUp(member: PartyMember): number {
  if (isMageCaster(member.unitType)) return RPGBalance.MAGE_SPELLS_PER_LEVEL;
  if (isHealerCaster(member.unitType)) return RPGBalance.HEALER_SPELLS_PER_LEVEL;
  return 0;
}

/** Maximum number of spells this member can know at their current level. */
export function maxKnownSpells(member: PartyMember): number {
  if (isMageCaster(member.unitType)) {
    return RPGBalance.MAGE_MAX_SPELLS_BASE + member.level;
  }
  if (isHealerCaster(member.unitType)) {
    return RPGBalance.HEALER_MAX_SPELLS_BASE + Math.floor(member.level / 2);
  }
  return 0;
}

/** Which spell schools can this member learn from? */
export function accessibleSchools(unitType: UnitType): SpellSchool[] {
  if (isMageCaster(unitType)) return MAGE_SCHOOLS;
  if (isHealerCaster(unitType)) return HEALER_SCHOOLS;
  return [];
}

/**
 * Returns all spells eligible for learning by this member right now.
 * Filters by: tier ≤ max for level, school access, not already known,
 * and respects max known cap.
 */
export function getSpellChoices(member: PartyMember): RPGSpellDef[] {
  const known = new Set(member.knownSpells);
  if (known.size >= maxKnownSpells(member)) return [];

  const maxTier = maxTierForLevel(member.level);
  const schools = new Set(accessibleSchools(member.unitType));

  const choices: RPGSpellDef[] = [];
  for (let t = 1; t <= maxTier; t++) {
    const tierSpells = SPELLS_BY_TIER[t as SpellTier];
    for (const spell of tierSpells) {
      if (!schools.has(spell.school)) continue;
      if (known.has(spell.id)) continue;
      choices.push(spell);
    }
  }
  return choices;
}

/**
 * Apply selected spells to member's known list.
 * Returns the spells actually learned (capped by max known).
 * Newly learned spells are also auto-equipped if there are free slots.
 */
export function learnSpells(member: PartyMember, spellIds: UpgradeType[]): UpgradeType[] {
  const max = maxKnownSpells(member);
  const learned: UpgradeType[] = [];
  for (const id of spellIds) {
    if (member.knownSpells.length >= max) break;
    if (member.knownSpells.includes(id)) continue;
    const def = RPG_SPELL_DEFS[id];
    if (!def) continue;
    member.knownSpells.push(id);
    learned.push(id);
    // Auto-equip if there's room
    const maxSlots = maxEquippedSpells(member);
    if (member.equippedSpells.length < maxSlots) {
      member.equippedSpells.push(id);
    }
  }
  return learned;
}

// ---------------------------------------------------------------------------
// Spell slot limits — equipped vs. known
// ---------------------------------------------------------------------------

/** Maximum number of spells that can be equipped at once (usable in battle). */
export function maxEquippedSpells(member: PartyMember): number {
  if (isMageCaster(member.unitType)) return 6;
  if (isHealerCaster(member.unitType)) return 4;
  return 2;
}

/**
 * Equip a known spell into a battle slot.
 * Returns true if successful.
 */
export function equipSpell(member: PartyMember, spellId: UpgradeType): boolean {
  if (!member.knownSpells.includes(spellId)) return false;
  if (member.equippedSpells.includes(spellId)) return false;
  const max = maxEquippedSpells(member);
  if (member.equippedSpells.length >= max) return false;
  member.equippedSpells.push(spellId);
  return true;
}

/**
 * Unequip a spell from battle slots.
 * Returns true if it was equipped and successfully removed.
 */
export function unequipSpell(member: PartyMember, spellId: UpgradeType): boolean {
  const idx = member.equippedSpells.indexOf(spellId);
  if (idx === -1) return false;
  member.equippedSpells.splice(idx, 1);
  return true;
}

/**
 * Swap an equipped spell for a known (but unequipped) spell.
 * Returns true if successful.
 */
export function swapEquippedSpell(
  member: PartyMember,
  unequipId: UpgradeType,
  equipId: UpgradeType,
): boolean {
  const idx = member.equippedSpells.indexOf(unequipId);
  if (idx === -1) return false;
  if (!member.knownSpells.includes(equipId)) return false;
  if (member.equippedSpells.includes(equipId)) return false;
  member.equippedSpells[idx] = equipId;
  return true;
}
