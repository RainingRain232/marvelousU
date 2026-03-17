// ---------------------------------------------------------------------------
// Rift Wizard progression — SP, spell shop, upgrades
// ---------------------------------------------------------------------------

import {
  type RiftWizardState,
  type SpellInstance,
} from "../state/RiftWizardState";
import { SPELL_DEFS, type SpellDef, type SpellUpgradeDef } from "../config/RiftWizardSpellDefs";
import { ABILITY_DEFS, type AbilityDef } from "../config/RiftWizardAbilityDefs";
import { createSpellInstance, computeSpellStats } from "./RiftWizardCombatSystem";

// ---------------------------------------------------------------------------
// Spell shop queries
// ---------------------------------------------------------------------------

/** Get spells the wizard hasn't learned yet. */
export function getAvailableSpells(state: RiftWizardState): SpellDef[] {
  const learnedIds = new Set(state.spells.map((s) => s.defId));
  return Object.values(SPELL_DEFS).filter((def) => !learnedIds.has(def.id));
}

/** Get upgrades available for a specific spell. */
export function getAvailableUpgrades(
  spell: SpellInstance,
): SpellUpgradeDef[] {
  const def = SPELL_DEFS[spell.defId];
  if (!def) return [];
  return def.upgrades.filter((u) => !spell.upgrades.includes(u.id));
}

/**
 * Get the effective SP cost of a spell, considering spell circles.
 * If the wizard is standing on a spell circle matching the spell's school,
 * cost is reduced by 1 (minimum 1).
 */
export function getEffectiveSpellCost(
  state: RiftWizardState,
  def: SpellDef,
): number {
  let cost = def.spCost;

  // Check if standing on matching spell circle
  for (const circle of state.level.spellCircles) {
    if (
      circle.col === state.wizard.col &&
      circle.row === state.wizard.row &&
      circle.school === def.school
    ) {
      cost = Math.max(1, cost - 1);
      break;
    }
  }

  return cost;
}

/** Get effective upgrade cost (same spell circle logic). */
export function getEffectiveUpgradeCost(
  state: RiftWizardState,
  spell: SpellInstance,
  upgrade: SpellUpgradeDef,
): number {
  let cost = upgrade.spCost;

  for (const circle of state.level.spellCircles) {
    if (
      circle.col === state.wizard.col &&
      circle.row === state.wizard.row &&
      circle.school === spell.school
    ) {
      cost = Math.max(1, cost - 1);
      break;
    }
  }

  return cost;
}

// ---------------------------------------------------------------------------
// Spell shop actions
// ---------------------------------------------------------------------------

/** Learn a new spell. Returns true if successful. */
export function learnSpell(
  state: RiftWizardState,
  defId: string,
): boolean {
  const def = SPELL_DEFS[defId];
  if (!def) return false;

  // Already learned?
  if (state.spells.some((s) => s.defId === defId)) return false;

  // Check cost
  const cost = getEffectiveSpellCost(state, def);
  if (state.skillPoints < cost) return false;

  state.skillPoints -= cost;
  const instance = createSpellInstance(defId);
  state.spells.push(instance);

  return true;
}

/** Buy a spell upgrade. Returns true if successful. */
export function buyUpgrade(
  state: RiftWizardState,
  spellIndex: number,
  upgradeId: string,
): boolean {
  const spell = state.spells[spellIndex];
  if (!spell) return false;

  const def = SPELL_DEFS[spell.defId];
  if (!def) return false;

  const upgrade = def.upgrades.find((u) => u.id === upgradeId);
  if (!upgrade) return false;

  // Already purchased?
  if (spell.upgrades.includes(upgradeId)) return false;

  // Check cost
  const cost = getEffectiveUpgradeCost(state, spell, upgrade);
  if (state.skillPoints < cost) return false;

  state.skillPoints -= cost;
  spell.upgrades.push(upgradeId);

  // Recompute stats
  computeSpellStats(spell);

  // Refresh charges to new max
  spell.charges = spell.maxCharges;

  return true;
}

// ---------------------------------------------------------------------------
// Ability shop queries & actions
// ---------------------------------------------------------------------------

/** Get abilities the wizard hasn't learned yet. */
export function getAvailableAbilities(state: RiftWizardState): AbilityDef[] {
  const learnedIds = new Set(state.abilities);
  return Object.values(ABILITY_DEFS).filter((def) => !learnedIds.has(def.id));
}

/** Get effective ability cost (spell circle discount applies). */
export function getEffectiveAbilityCost(
  state: RiftWizardState,
  def: AbilityDef,
): number {
  let cost = def.spCost;
  for (const circle of state.level.spellCircles) {
    if (
      circle.col === state.wizard.col &&
      circle.row === state.wizard.row &&
      circle.school === def.school
    ) {
      cost = Math.max(1, cost - 1);
      break;
    }
  }
  return cost;
}

/** Learn an ability. Returns true if successful. */
export function learnAbility(
  state: RiftWizardState,
  abilityId: string,
): boolean {
  const def = ABILITY_DEFS[abilityId];
  if (!def) return false;
  if (state.abilities.includes(abilityId)) return false;

  const cost = getEffectiveAbilityCost(state, def);
  if (state.skillPoints < cost) return false;

  state.skillPoints -= cost;
  state.abilities.push(abilityId);

  // Apply immediate passive effects
  if (def.effect.type === "max_hp") {
    state.wizard.maxHp += def.effect.amount;
    state.wizard.hp += def.effect.amount;
  }

  return true;
}

/** Check if wizard has a specific ability. */
export function hasAbility(state: RiftWizardState, abilityId: string): boolean {
  return state.abilities.includes(abilityId);
}
