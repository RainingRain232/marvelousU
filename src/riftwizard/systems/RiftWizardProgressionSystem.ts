// ---------------------------------------------------------------------------
// Rift Wizard progression — SP, spell shop, upgrades
// ---------------------------------------------------------------------------

import {
  type RiftWizardState,
  type SpellInstance,
} from "../state/RiftWizardState";
import { SPELL_DEFS, type SpellDef, type SpellUpgradeDef } from "../config/RiftWizardSpellDefs";
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
