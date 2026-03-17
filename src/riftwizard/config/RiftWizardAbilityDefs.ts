// ---------------------------------------------------------------------------
// Rift Wizard ability definitions – passive/triggered abilities
// Abilities compete with spells for SP. They provide permanent bonuses
// or triggered effects that fire automatically during gameplay.
// ---------------------------------------------------------------------------

import { SpellSchool } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AbilityTrigger =
  | "on_spell_cast"      // fires after any spell is cast
  | "on_fire_cast"       // fires after a fire spell is cast
  | "on_ice_cast"        // fires after an ice spell is cast
  | "on_lightning_cast"  // fires after a lightning spell
  | "on_kill"            // fires when wizard kills an enemy
  | "on_take_damage"     // fires when wizard takes damage
  | "on_turn_start"      // fires at the start of each wizard turn
  | "passive";           // always active, no trigger

export interface AbilityDef {
  id: string;
  name: string;
  school: SpellSchool;
  spCost: number;
  description: string;
  trigger: AbilityTrigger;
  // Effect parameters (interpretation depends on trigger/effect combo)
  effect: AbilityEffect;
}

export type AbilityEffect =
  | { type: "bonus_missile"; damage: number }          // fire a magic missile at the target
  | { type: "chain_frost"; damage: number; radius: number } // ice nova on cast
  | { type: "static_discharge"; damage: number }       // lightning zap on cast
  | { type: "soul_siphon"; healPercent: number }       // heal % of damage on kill
  | { type: "arcane_shield"; amount: number }          // gain shields on cast
  | { type: "thorns"; damage: number }                 // reflect damage when hit
  | { type: "regeneration"; amount: number }           // heal each turn
  | { type: "mana_siphon"; chargeCount: number }       // restore charges on kill
  | { type: "fire_trail"; damage: number; duration: number } // leave fire on tiles you walk from
  | { type: "max_hp"; amount: number }                 // passive HP bonus
  | { type: "spell_range"; amount: number }            // passive range bonus to all spells
  | { type: "damage_amp"; percent: number };            // passive damage increase

// ---------------------------------------------------------------------------
// Ability catalog
// ---------------------------------------------------------------------------

export const ABILITY_DEFS: Record<string, AbilityDef> = {
  // --- Fire school ---
  arcane_combustion: {
    id: "arcane_combustion",
    name: "Arcane Combustion",
    school: SpellSchool.FIRE,
    spCost: 4,
    description: "Casting a fire spell also fires a magic missile at the target.",
    trigger: "on_fire_cast",
    effect: { type: "bonus_missile", damage: 15 },
  },
  fire_trail: {
    id: "fire_trail",
    name: "Scorched Earth",
    school: SpellSchool.FIRE,
    spCost: 5,
    description: "Leave a trail of fire behind you that burns enemies for 8 damage.",
    trigger: "on_turn_start",
    effect: { type: "fire_trail", damage: 8, duration: 3 },
  },

  // --- Ice school ---
  frost_nova: {
    id: "frost_nova",
    name: "Frost Nova",
    school: SpellSchool.ICE,
    spCost: 4,
    description: "Casting an ice spell sends out a frost pulse dealing 10 damage in radius 2.",
    trigger: "on_ice_cast",
    effect: { type: "chain_frost", damage: 10, radius: 2 },
  },

  // --- Lightning school ---
  static_discharge: {
    id: "static_discharge",
    name: "Static Discharge",
    school: SpellSchool.LIGHTNING,
    spCost: 4,
    description: "Casting a lightning spell zaps a random nearby enemy for 12 damage.",
    trigger: "on_lightning_cast",
    effect: { type: "static_discharge", damage: 12 },
  },

  // --- Arcane school ---
  arcane_shield: {
    id: "arcane_shield",
    name: "Arcane Aegis",
    school: SpellSchool.ARCANE,
    spCost: 5,
    description: "Gain 5 shields each time you cast any spell.",
    trigger: "on_spell_cast",
    effect: { type: "arcane_shield", amount: 5 },
  },
  spell_reach: {
    id: "spell_reach",
    name: "Spell Reach",
    school: SpellSchool.ARCANE,
    spCost: 3,
    description: "All spells gain +1 range.",
    trigger: "passive",
    effect: { type: "spell_range", amount: 1 },
  },

  // --- Nature school ---
  regeneration: {
    id: "regeneration",
    name: "Regeneration",
    school: SpellSchool.NATURE,
    spCost: 4,
    description: "Heal 3 HP at the start of each turn.",
    trigger: "on_turn_start",
    effect: { type: "regeneration", amount: 3 },
  },
  mana_siphon: {
    id: "mana_siphon",
    name: "Mana Siphon",
    school: SpellSchool.NATURE,
    spCost: 5,
    description: "Killing an enemy restores 1 charge to a random spell.",
    trigger: "on_kill",
    effect: { type: "mana_siphon", chargeCount: 1 },
  },

  // --- Dark school ---
  soul_siphon: {
    id: "soul_siphon",
    name: "Soul Siphon",
    school: SpellSchool.DARK,
    spCost: 5,
    description: "Killing an enemy heals you for 20% of their max HP.",
    trigger: "on_kill",
    effect: { type: "soul_siphon", healPercent: 20 },
  },
  thorns: {
    id: "thorns",
    name: "Dark Thorns",
    school: SpellSchool.DARK,
    spCost: 3,
    description: "When you take damage, deal 8 damage back to the attacker.",
    trigger: "on_take_damage",
    effect: { type: "thorns", damage: 8 },
  },

  // --- Holy school ---
  fortitude: {
    id: "fortitude",
    name: "Fortitude",
    school: SpellSchool.HOLY,
    spCost: 4,
    description: "Permanently gain +25 max HP.",
    trigger: "passive",
    effect: { type: "max_hp", amount: 25 },
  },
  damage_amp: {
    id: "damage_amp",
    name: "Divine Wrath",
    school: SpellSchool.HOLY,
    spCost: 6,
    description: "All spells deal 15% more damage.",
    trigger: "passive",
    effect: { type: "damage_amp", percent: 15 },
  },

  // --- New abilities ---

  // --- Lightning school ---
  lightning_reflexes: {
    id: "lightning_reflexes",
    name: "Lightning Reflexes",
    school: SpellSchool.LIGHTNING,
    spCost: 4,
    description: "When hit, zap the attacker for 15 damage.",
    trigger: "on_take_damage",
    effect: { type: "static_discharge", damage: 15 },
  },

  // --- Ice school ---
  ice_armor: {
    id: "ice_armor",
    name: "Ice Armor",
    school: SpellSchool.ICE,
    spCost: 5,
    description: "When hit, gain 8 shields.",
    trigger: "on_take_damage",
    effect: { type: "arcane_shield", amount: 8 },
  },

  // --- Dark school ---
  blood_magic: {
    id: "blood_magic",
    name: "Blood Magic",
    school: SpellSchool.DARK,
    spCost: 5,
    description: "Each spell cast heals you for 3 HP.",
    trigger: "on_spell_cast",
    effect: { type: "regeneration", amount: 3 },
  },

  // --- Fire school ---
  phoenix_flame: {
    id: "phoenix_flame",
    name: "Phoenix Flame",
    school: SpellSchool.FIRE,
    spCost: 4,
    description: "Killing an enemy creates a fire burst dealing 10 damage in radius 2.",
    trigger: "on_kill",
    effect: { type: "chain_frost", damage: 10, radius: 2 },
  },

  // --- Nature school (summon-related) ---
  nature_bond: {
    id: "nature_bond",
    name: "Nature's Bond",
    school: SpellSchool.NATURE,
    spCost: 4,
    description: "Heal 2 HP and restore 1 charge to a random spell each turn. Summoned allies benefit from your regeneration.",
    trigger: "on_turn_start",
    effect: { type: "mana_siphon", chargeCount: 1 },
  },

  // --- Arcane school ---
  arcane_fury: {
    id: "arcane_fury",
    name: "Arcane Fury",
    school: SpellSchool.ARCANE,
    spCost: 6,
    description: "All spells deal 20% more damage.",
    trigger: "passive",
    effect: { type: "damage_amp", percent: 20 },
  },

  // --- Holy school ---
  holy_ward: {
    id: "holy_ward",
    name: "Holy Ward",
    school: SpellSchool.HOLY,
    spCost: 5,
    description: "When hit, heal 5 HP through divine light.",
    trigger: "on_take_damage",
    effect: { type: "regeneration", amount: 5 },
  },

  // --- Lightning school (summon-related) ---
  storm_caller: {
    id: "storm_caller",
    name: "Storm Caller",
    school: SpellSchool.LIGHTNING,
    spCost: 5,
    description: "Lightning spells also zap 2 additional random enemies for 8 damage. Summoned storm elementals gain chain lightning.",
    trigger: "on_lightning_cast",
    effect: { type: "static_discharge", damage: 8 },
  },

  // --- Dark school ---
  shadow_step: {
    id: "shadow_step",
    name: "Shadow Step",
    school: SpellSchool.DARK,
    spCost: 3,
    description: "All spells gain +2 range.",
    trigger: "passive",
    effect: { type: "spell_range", amount: 2 },
  },

  // --- Nature school ---
  verdant_growth: {
    id: "verdant_growth",
    name: "Verdant Growth",
    school: SpellSchool.NATURE,
    spCost: 4,
    description: "Permanently gain +20 max HP.",
    trigger: "passive",
    effect: { type: "max_hp", amount: 20 },
  },

  // --- NEW ABILITIES ---

  // --- Fire school ---
  inferno_mastery: {
    id: "inferno_mastery",
    name: "Inferno Mastery",
    school: SpellSchool.FIRE,
    spCost: 5,
    description: "Fire spells leave smoldering ground that burns enemies for 12 damage over 4 turns.",
    trigger: "on_fire_cast",
    effect: { type: "fire_trail", damage: 12, duration: 4 },
  },
  pyromaniac: {
    id: "pyromaniac",
    name: "Pyromaniac",
    school: SpellSchool.FIRE,
    spCost: 4,
    description: "Killing an enemy with any spell fuels your pyromaniac rage, launching a searing missile for 18 damage at the nearest foe.",
    trigger: "on_kill",
    effect: { type: "bonus_missile", damage: 18 },
  },
  ashen_rebuke: {
    id: "ashen_rebuke",
    name: "Ashen Rebuke",
    school: SpellSchool.FIRE,
    spCost: 3,
    description: "When struck, retaliate with a burst of cinders dealing 10 damage to the attacker.",
    trigger: "on_take_damage",
    effect: { type: "thorns", damage: 10 },
  },

  // --- Ice school ---
  permafrost: {
    id: "permafrost",
    name: "Permafrost",
    school: SpellSchool.ICE,
    spCost: 5,
    description: "Ice spells radiate a freezing pulse that deals 14 damage to all enemies within 3 tiles.",
    trigger: "on_ice_cast",
    effect: { type: "chain_frost", damage: 14, radius: 3 },
  },
  glacial_barrier: {
    id: "glacial_barrier",
    name: "Glacial Barrier",
    school: SpellSchool.ICE,
    spCost: 4,
    description: "Casting an ice spell encases you in frost, granting 6 shields.",
    trigger: "on_ice_cast",
    effect: { type: "arcane_shield", amount: 6 },
  },
  winters_grasp: {
    id: "winters_grasp",
    name: "Winter's Grasp",
    school: SpellSchool.ICE,
    spCost: 6,
    description: "At the start of each turn, a wave of bitter cold deals 8 damage to all enemies within 2 tiles.",
    trigger: "on_turn_start",
    effect: { type: "chain_frost", damage: 8, radius: 2 },
  },

  // --- Lightning school ---
  overcharge: {
    id: "overcharge",
    name: "Overcharge",
    school: SpellSchool.LIGHTNING,
    spCost: 4,
    description: "Crackling energy saturates your spells, permanently granting +2 range to all casts.",
    trigger: "passive",
    effect: { type: "spell_range", amount: 2 },
  },
  thunderous_impact: {
    id: "thunderous_impact",
    name: "Thunderous Impact",
    school: SpellSchool.LIGHTNING,
    spCost: 5,
    description: "Slaying an enemy discharges a thunderbolt that arcs to a nearby foe for 20 damage.",
    trigger: "on_kill",
    effect: { type: "static_discharge", damage: 20 },
  },

  // --- Arcane school ---
  spell_echo: {
    id: "spell_echo",
    name: "Spell Echo",
    school: SpellSchool.ARCANE,
    spCost: 6,
    description: "Arcane reverberations restore 1 spell charge each time you cast, as if the spell echoes through the rift.",
    trigger: "on_spell_cast",
    effect: { type: "mana_siphon", chargeCount: 1 },
  },
  arcane_resonance: {
    id: "arcane_resonance",
    name: "Arcane Resonance",
    school: SpellSchool.ARCANE,
    spCost: 5,
    description: "Each spell you cast amplifies the next, increasing all damage by 10%.",
    trigger: "passive",
    effect: { type: "damage_amp", percent: 10 },
  },
  rift_bolts: {
    id: "rift_bolts",
    name: "Rift Bolts",
    school: SpellSchool.ARCANE,
    spCost: 3,
    description: "Casting any spell tears open a small rift that fires a magic missile for 10 damage.",
    trigger: "on_spell_cast",
    effect: { type: "bonus_missile", damage: 10 },
  },

  // --- Nature school ---
  symbiosis: {
    id: "symbiosis",
    name: "Symbiosis",
    school: SpellSchool.NATURE,
    spCost: 4,
    description: "The bond between caster and earth mends your wounds, healing 5 HP at the start of each turn.",
    trigger: "on_turn_start",
    effect: { type: "regeneration", amount: 5 },
  },
  overgrowth: {
    id: "overgrowth",
    name: "Overgrowth",
    school: SpellSchool.NATURE,
    spCost: 5,
    description: "Killing an enemy causes vines to erupt, healing you for 25% of the slain foe's max HP.",
    trigger: "on_kill",
    effect: { type: "soul_siphon", healPercent: 25 },
  },
  barkskin: {
    id: "barkskin",
    name: "Barkskin",
    school: SpellSchool.NATURE,
    spCost: 3,
    description: "Permanently gain +15 max HP as living bark hardens across your skin.",
    trigger: "passive",
    effect: { type: "max_hp", amount: 15 },
  },

  // --- Dark school ---
  necrotic_aura: {
    id: "necrotic_aura",
    name: "Necrotic Aura",
    school: SpellSchool.DARK,
    spCost: 5,
    description: "A miasma of decay surrounds you, dealing 6 damage to all nearby enemies at the start of each turn.",
    trigger: "on_turn_start",
    effect: { type: "chain_frost", damage: 6, radius: 2 },
  },
  grave_harvest: {
    id: "grave_harvest",
    name: "Grave Harvest",
    school: SpellSchool.DARK,
    spCost: 6,
    description: "Each kill reaps dark energy, restoring 2 charges to a random spell from the stolen life force.",
    trigger: "on_kill",
    effect: { type: "mana_siphon", chargeCount: 2 },
  },
  hex_of_agony: {
    id: "hex_of_agony",
    name: "Hex of Agony",
    school: SpellSchool.DARK,
    spCost: 4,
    description: "When you take damage, a vengeful hex fires a dark missile at the attacker for 14 damage.",
    trigger: "on_take_damage",
    effect: { type: "bonus_missile", damage: 14 },
  },

  // --- Holy school ---
  martyrs_gift: {
    id: "martyrs_gift",
    name: "Martyr's Gift",
    school: SpellSchool.HOLY,
    spCost: 5,
    description: "Suffering fuels your radiance; taking damage grants 7 shields of holy light.",
    trigger: "on_take_damage",
    effect: { type: "arcane_shield", amount: 7 },
  },
  consecration: {
    id: "consecration",
    name: "Consecration",
    school: SpellSchool.HOLY,
    spCost: 6,
    description: "Every spell you cast sanctifies the ground, leaving consecrated fire that burns the unholy for 10 damage over 3 turns.",
    trigger: "on_spell_cast",
    effect: { type: "fire_trail", damage: 10, duration: 3 },
  },
  divine_vigor: {
    id: "divine_vigor",
    name: "Divine Vigor",
    school: SpellSchool.HOLY,
    spCost: 3,
    description: "Holy energy suffuses your body, permanently granting +30 max HP.",
    trigger: "passive",
    effect: { type: "max_hp", amount: 30 },
  },
};
