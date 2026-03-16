// ---------------------------------------------------------------------------
// Rift Wizard spell definitions
// ---------------------------------------------------------------------------

import { SpellSchool, RWAnimationType } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpellMechanic =
  | "projectile_aoe" // Fireball, Ice Ball
  | "chain" // Chain Lightning
  | "cone" // Fire Breath, Frost Breath
  | "teleport" // Warp
  | "summon" // Summon Imps
  | "single_target" // Magic Missile, Death Bolt
  | "self_heal" // Heal
  | "aoe_slow" // Web
  | "aoe_knockback" // Distortion Blast
  | "self_aura" // Aura of Fire
  | "global_aoe" // Earthquake
  | "holy_blast"; // Holy Light (damage undead + heal self)

export interface SpellUpgradeDef {
  id: string;
  name: string;
  spCost: number;
  description: string;
  // Fields to override/add on the base spell
  bonusDamage?: number;
  bonusRange?: number;
  bonusAoeRadius?: number;
  bonusCharges?: number;
  bonusBounces?: number;
  bonusSummonCount?: number;
  // Special flags
  special?: string;
}

export interface SpellDef {
  id: string;
  name: string;
  school: SpellSchool;
  spCost: number; // skill points to learn
  baseCharges: number;
  damage: number;
  range: number; // 0 = self-targeted
  aoeRadius: number; // 0 = single target
  mechanic: SpellMechanic;
  maxBounces: number;
  summonCount: number;
  summonUnitType?: string; // UnitType for summon spells
  slowDuration?: number; // turns of slow
  slowFactor?: number;
  description: string;
  animationType: RWAnimationType;
  upgrades: SpellUpgradeDef[];
}

// ---------------------------------------------------------------------------
// Spell catalog
// ---------------------------------------------------------------------------

export const SPELL_DEFS: Record<string, SpellDef> = {
  // --- Tier 1 (3 SP) ---
  magic_missile: {
    id: "magic_missile",
    name: "Magic Missile",
    school: SpellSchool.ARCANE,
    spCost: 3,
    baseCharges: 20,
    damage: 15,
    range: 6,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A reliable bolt of arcane energy.",
    animationType: RWAnimationType.MAGIC_MISSILE,
    upgrades: [
      { id: "mm_dmg", name: "Piercing Bolt", spCost: 1, description: "+8 damage", bonusDamage: 8 },
      { id: "mm_range", name: "Far Reach", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "mm_charges", name: "Deep Reserve", spCost: 1, description: "+8 charges", bonusCharges: 8 },
    ],
  },
  web: {
    id: "web",
    name: "Web",
    school: SpellSchool.NATURE,
    spCost: 3,
    baseCharges: 15,
    damage: 5,
    range: 5,
    aoeRadius: 1,
    mechanic: "aoe_slow",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 3,
    slowFactor: 0.0, // full root
    description: "Ensnares enemies in sticky webbing.",
    animationType: RWAnimationType.WEB,
    upgrades: [
      { id: "web_aoe", name: "Wide Web", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "web_dur", name: "Sticky Silk", spCost: 1, description: "+2 turns duration", special: "slow_duration_2" },
      { id: "web_charges", name: "Spider Nest", spCost: 1, description: "+6 charges", bonusCharges: 6 },
    ],
  },
  warp: {
    id: "warp",
    name: "Warp",
    school: SpellSchool.ARCANE,
    spCost: 3,
    baseCharges: 8,
    damage: 0,
    range: 8,
    aoeRadius: 0,
    mechanic: "teleport",
    maxBounces: 0,
    summonCount: 0,
    description: "Teleport to a visible floor tile.",
    animationType: RWAnimationType.WARP,
    upgrades: [
      { id: "warp_range", name: "Long Jump", spCost: 1, description: "+4 range", bonusRange: 4 },
      { id: "warp_charges", name: "Frequent Flyer", spCost: 1, description: "+4 charges", bonusCharges: 4 },
      { id: "warp_shield", name: "Phase Shield", spCost: 2, description: "Gain 10 shields on warp", special: "warp_shield_10" },
    ],
  },

  // --- Tier 2 (4 SP) ---
  fireball: {
    id: "fireball",
    name: "Fireball",
    school: SpellSchool.FIRE,
    spCost: 4,
    baseCharges: 12,
    damage: 25,
    range: 6,
    aoeRadius: 1,
    mechanic: "projectile_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "Hurls an explosive ball of fire.",
    animationType: RWAnimationType.FIREBALL,
    upgrades: [
      { id: "fb_dmg", name: "Inferno", spCost: 1, description: "+10 damage", bonusDamage: 10 },
      { id: "fb_aoe", name: "Conflagration", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "fb_charges", name: "Fire Cache", spCost: 1, description: "+5 charges", bonusCharges: 5 },
      { id: "fb_cascade", name: "Fire Cascade", spCost: 3, description: "Kills spread fire to adjacent tiles", special: "fire_cascade" },
    ],
  },
  ice_ball: {
    id: "ice_ball",
    name: "Ice Ball",
    school: SpellSchool.ICE,
    spCost: 4,
    baseCharges: 12,
    damage: 20,
    range: 6,
    aoeRadius: 1,
    mechanic: "projectile_aoe",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 2,
    slowFactor: 0.0, // freeze
    description: "A freezing orb that slows enemies.",
    animationType: RWAnimationType.ICE_BALL,
    upgrades: [
      { id: "ib_dmg", name: "Deep Freeze", spCost: 1, description: "+10 damage", bonusDamage: 10 },
      { id: "ib_aoe", name: "Blizzard", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "ib_charges", name: "Cold Storage", spCost: 1, description: "+5 charges", bonusCharges: 5 },
      { id: "ib_freeze", name: "Permafrost", spCost: 2, description: "+1 turn freeze duration", special: "freeze_duration_1" },
    ],
  },
  heal: {
    id: "heal",
    name: "Heal",
    school: SpellSchool.HOLY,
    spCost: 4,
    baseCharges: 8,
    damage: -30, // negative = healing
    range: 0,
    aoeRadius: 0,
    mechanic: "self_heal",
    maxBounces: 0,
    summonCount: 0,
    description: "Restore health to yourself.",
    animationType: RWAnimationType.HEAL,
    upgrades: [
      { id: "heal_amt", name: "Greater Heal", spCost: 1, description: "+15 healing", bonusDamage: -15 },
      { id: "heal_charges", name: "Devotion", spCost: 1, description: "+4 charges", bonusCharges: 4 },
      { id: "heal_cleanse", name: "Purify", spCost: 2, description: "Remove all negative status effects", special: "cleanse" },
    ],
  },
  holy_light: {
    id: "holy_light",
    name: "Holy Light",
    school: SpellSchool.HOLY,
    spCost: 4,
    baseCharges: 10,
    damage: 20,
    range: 5,
    aoeRadius: 0,
    mechanic: "holy_blast",
    maxBounces: 0,
    summonCount: 0,
    description: "Searing light. Deals double damage to undead.",
    animationType: RWAnimationType.HOLY_LIGHT,
    upgrades: [
      { id: "hl_dmg", name: "Radiance", spCost: 1, description: "+10 damage", bonusDamage: 10 },
      { id: "hl_heal", name: "Restorative Light", spCost: 2, description: "Also heals wizard for 10 HP", special: "holy_self_heal_10" },
      { id: "hl_charges", name: "Eternal Light", spCost: 1, description: "+5 charges", bonusCharges: 5 },
    ],
  },

  // --- Tier 2 (5 SP) ---
  chain_lightning: {
    id: "chain_lightning",
    name: "Chain Lightning",
    school: SpellSchool.LIGHTNING,
    spCost: 5,
    baseCharges: 10,
    damage: 18,
    range: 5,
    aoeRadius: 0,
    mechanic: "chain",
    maxBounces: 4,
    summonCount: 0,
    description: "Lightning that arcs between enemies.",
    animationType: RWAnimationType.CHAIN_LIGHTNING,
    upgrades: [
      { id: "cl_bounces", name: "Storm Network", spCost: 1, description: "+2 bounces", bonusBounces: 2 },
      { id: "cl_dmg", name: "High Voltage", spCost: 2, description: "+12 damage", bonusDamage: 12 },
      { id: "cl_range", name: "Long Arc", spCost: 1, description: "+3 range", bonusRange: 3 },
    ],
  },
  summon_imps: {
    id: "summon_imps",
    name: "Summon Imps",
    school: SpellSchool.NATURE,
    spCost: 5,
    baseCharges: 6,
    damage: 0,
    range: 4,
    aoeRadius: 0,
    mechanic: "summon",
    maxBounces: 0,
    summonCount: 2,
    summonUnitType: "fire_imp",
    description: "Summon fiery imps to fight for you.",
    animationType: RWAnimationType.SUMMON,
    upgrades: [
      { id: "si_count", name: "Imp Swarm", spCost: 2, description: "+1 imp per cast", bonusSummonCount: 1 },
      { id: "si_charges", name: "Imp Pact", spCost: 1, description: "+3 charges", bonusCharges: 3 },
      { id: "si_ice", name: "Ice Imps", spCost: 1, description: "Summon ice imps instead", special: "ice_imps" },
    ],
  },
  distortion_blast: {
    id: "distortion_blast",
    name: "Distortion Blast",
    school: SpellSchool.ARCANE,
    spCost: 5,
    baseCharges: 10,
    damage: 22,
    range: 5,
    aoeRadius: 1,
    mechanic: "aoe_knockback",
    maxBounces: 0,
    summonCount: 0,
    description: "A burst of warped space that knocks enemies away.",
    animationType: RWAnimationType.DISTORTION,
    upgrades: [
      { id: "db_dmg", name: "Reality Shatter", spCost: 2, description: "+12 damage", bonusDamage: 12 },
      { id: "db_aoe", name: "Wide Rift", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "db_charges", name: "Rift Reserves", spCost: 1, description: "+4 charges", bonusCharges: 4 },
    ],
  },

  // --- Tier 3 (6 SP) ---
  fire_breath: {
    id: "fire_breath",
    name: "Fire Breath",
    school: SpellSchool.FIRE,
    spCost: 6,
    baseCharges: 5,
    damage: 35,
    range: 3,
    aoeRadius: 2,
    mechanic: "cone",
    maxBounces: 0,
    summonCount: 0,
    description: "Exhale a devastating cone of flame.",
    animationType: RWAnimationType.FIRE_BREATH,
    upgrades: [
      { id: "fbreath_dmg", name: "Dragonfire", spCost: 2, description: "+15 damage", bonusDamage: 15 },
      { id: "fbreath_range", name: "Long Flame", spCost: 1, description: "+1 cone range", bonusRange: 1 },
      { id: "fbreath_charges", name: "Dragon Lungs", spCost: 1, description: "+3 charges", bonusCharges: 3 },
    ],
  },
  frost_breath: {
    id: "frost_breath",
    name: "Frost Breath",
    school: SpellSchool.ICE,
    spCost: 6,
    baseCharges: 5,
    damage: 28,
    range: 3,
    aoeRadius: 2,
    mechanic: "cone",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 3,
    slowFactor: 0.0,
    description: "Exhale a cone of frost that freezes enemies.",
    animationType: RWAnimationType.FROST_BREATH,
    upgrades: [
      { id: "frbreath_dmg", name: "Arctic Blast", spCost: 2, description: "+15 damage", bonusDamage: 15 },
      { id: "frbreath_charges", name: "Glacial Reserve", spCost: 1, description: "+3 charges", bonusCharges: 3 },
    ],
  },
  death_bolt: {
    id: "death_bolt",
    name: "Death Bolt",
    school: SpellSchool.DARK,
    spCost: 6,
    baseCharges: 6,
    damage: 45,
    range: 7,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A devastating bolt of dark energy.",
    animationType: RWAnimationType.DEATH_BOLT,
    upgrades: [
      { id: "db2_dmg", name: "Soul Rend", spCost: 2, description: "+20 damage", bonusDamage: 20 },
      { id: "db2_range", name: "Dark Reach", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "db2_charges", name: "Death Pact", spCost: 1, description: "+3 charges", bonusCharges: 3 },
      { id: "db2_drain", name: "Life Drain", spCost: 3, description: "Heal for 50% of damage dealt", special: "life_drain_50" },
    ],
  },

  // --- Tier 3 (7 SP) ---
  earthquake: {
    id: "earthquake",
    name: "Earthquake",
    school: SpellSchool.NATURE,
    spCost: 7,
    baseCharges: 3,
    damage: 30,
    range: 0,
    aoeRadius: 99, // hits all grounded
    mechanic: "global_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "Shakes the earth, damaging all grounded enemies.",
    animationType: RWAnimationType.EARTHQUAKE,
    upgrades: [
      { id: "eq_dmg", name: "Tectonic Force", spCost: 2, description: "+15 damage", bonusDamage: 15 },
      { id: "eq_charges", name: "Seismic Reserve", spCost: 2, description: "+2 charges", bonusCharges: 2 },
      { id: "eq_stun", name: "Aftershock", spCost: 3, description: "Stun all hit enemies for 1 turn", special: "stun_1" },
    ],
  },
  fire_aura: {
    id: "fire_aura",
    name: "Aura of Fire",
    school: SpellSchool.FIRE,
    spCost: 7,
    baseCharges: 3,
    damage: 12,
    range: 0,
    aoeRadius: 2,
    mechanic: "self_aura",
    maxBounces: 0,
    summonCount: 0,
    description: "Emanate a ring of fire around yourself for several turns.",
    animationType: RWAnimationType.FIRE_AURA,
    upgrades: [
      { id: "fa_dmg", name: "Blazing Aura", spCost: 2, description: "+8 damage per turn", bonusDamage: 8 },
      { id: "fa_aoe", name: "Wide Flames", spCost: 2, description: "+1 aura radius", bonusAoeRadius: 1 },
      { id: "fa_charges", name: "Eternal Flame", spCost: 2, description: "+2 charges", bonusCharges: 2 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all spells available for purchase, optionally filtered by school. */
export function getSpellsBySchool(school?: SpellSchool): SpellDef[] {
  const all = Object.values(SPELL_DEFS);
  if (!school) return all;
  return all.filter((s) => s.school === school);
}

/** Get spells sorted by SP cost (cheapest first). */
export function getSpellsSortedByCost(): SpellDef[] {
  return Object.values(SPELL_DEFS).sort((a, b) => a.spCost - b.spCost);
}
