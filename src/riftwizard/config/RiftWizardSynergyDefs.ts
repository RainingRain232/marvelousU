// ---------------------------------------------------------------------------
// Rift Wizard mode – spell school synergy definitions
// ---------------------------------------------------------------------------

import { SpellSchool } from "../state/RiftWizardState";

export interface SpellSynergy {
  id: string;
  name: string;
  description: string;
  schools: [SpellSchool, SpellSchool];
  effect: {
    type: "damage_bonus" | "aoe_bonus" | "range_bonus" | "max_hp" | "charge_bonus";
    amount: number; // percent for damage, flat for others
  };
}

export const SPELL_SYNERGIES: SpellSynergy[] = [
  {
    id: "steam_burst",
    name: "Steam Burst",
    description: "Fire + Ice: +15% AoE radius",
    schools: [SpellSchool.FIRE, SpellSchool.ICE],
    effect: { type: "aoe_bonus", amount: 1 },
  },
  {
    id: "arcane_surge",
    name: "Arcane Surge",
    description: "Lightning + Arcane: +10% spell damage",
    schools: [SpellSchool.LIGHTNING, SpellSchool.ARCANE],
    effect: { type: "damage_bonus", amount: 10 },
  },
  {
    id: "balance",
    name: "Balance",
    description: "Dark + Holy: +25 max HP",
    schools: [SpellSchool.DARK, SpellSchool.HOLY],
    effect: { type: "max_hp", amount: 25 },
  },
  {
    id: "storm_caller",
    name: "Storm Caller",
    description: "Lightning + Nature: +2 spell range",
    schools: [SpellSchool.LIGHTNING, SpellSchool.NATURE],
    effect: { type: "range_bonus", amount: 2 },
  },
  {
    id: "shadow_fire",
    name: "Shadow Fire",
    description: "Fire + Dark: +20% spell damage",
    schools: [SpellSchool.FIRE, SpellSchool.DARK],
    effect: { type: "damage_bonus", amount: 20 },
  },
  {
    id: "natures_grace",
    name: "Nature's Grace",
    description: "Nature + Holy: +3 charges to all spells",
    schools: [SpellSchool.NATURE, SpellSchool.HOLY],
    effect: { type: "charge_bonus", amount: 3 },
  },
  {
    id: "frozen_arcana",
    name: "Frozen Arcana",
    description: "Ice + Arcane: +15% spell damage",
    schools: [SpellSchool.ICE, SpellSchool.ARCANE],
    effect: { type: "damage_bonus", amount: 15 },
  },
];

/** Get active synergies based on which schools the wizard has spells from */
export function getActiveSynergies(spellSchools: Set<SpellSchool>): SpellSynergy[] {
  return SPELL_SYNERGIES.filter(
    (s) => spellSchools.has(s.schools[0]) && spellSchools.has(s.schools[1]),
  );
}
