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

  // =========================================================================
  // NEW SPELLS
  // =========================================================================

  // --- Tier 1 (3 SP) ---
  spark: {
    id: "spark",
    name: "Spark",
    school: SpellSchool.LIGHTNING,
    spCost: 3,
    baseCharges: 22,
    damage: 12,
    range: 5,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A quick jolt of lightning that never misses its mark.",
    animationType: RWAnimationType.CHAIN_LIGHTNING,
    upgrades: [
      { id: "spark_dmg", name: "Overcharge", spCost: 1, description: "+6 damage", bonusDamage: 6 },
      { id: "spark_range", name: "Long Spark", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "spark_charges", name: "Static Reserve", spCost: 1, description: "+10 charges", bonusCharges: 10 },
    ],
  },
  shadow_bolt: {
    id: "shadow_bolt",
    name: "Shadow Bolt",
    school: SpellSchool.DARK,
    spCost: 3,
    baseCharges: 18,
    damage: 14,
    range: 6,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A shard of condensed darkness that eats through armor.",
    animationType: RWAnimationType.DEATH_BOLT,
    upgrades: [
      { id: "sb_dmg", name: "Umbral Piercing", spCost: 1, description: "+8 damage", bonusDamage: 8 },
      { id: "sb_range", name: "Creeping Shadow", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "sb_charges", name: "Shadow Well", spCost: 1, description: "+8 charges", bonusCharges: 8 },
    ],
  },
  vine_grasp: {
    id: "vine_grasp",
    name: "Vine Grasp",
    school: SpellSchool.NATURE,
    spCost: 3,
    baseCharges: 15,
    damage: 8,
    range: 4,
    aoeRadius: 1,
    mechanic: "aoe_slow",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 2,
    slowFactor: 0.0,
    description: "Thorned vines erupt from the ground, entangling all who stand upon them.",
    animationType: RWAnimationType.WEB,
    upgrades: [
      { id: "vg_dmg", name: "Barbed Vines", spCost: 1, description: "+6 damage", bonusDamage: 6 },
      { id: "vg_aoe", name: "Overgrowth", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "vg_dur", name: "Deep Roots", spCost: 1, description: "+2 turns duration", special: "slow_duration_2" },
    ],
  },

  // --- Tier 2 (4 SP) ---
  flame_lance: {
    id: "flame_lance",
    name: "Flame Lance",
    school: SpellSchool.FIRE,
    spCost: 4,
    baseCharges: 14,
    damage: 30,
    range: 5,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A concentrated beam of white-hot fire that bores through flesh and stone.",
    animationType: RWAnimationType.FIREBALL,
    upgrades: [
      { id: "fl_dmg", name: "Searing Intensity", spCost: 1, description: "+12 damage", bonusDamage: 12 },
      { id: "fl_range", name: "Extended Burn", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "fl_charges", name: "Fuel Reserve", spCost: 1, description: "+6 charges", bonusCharges: 6 },
      { id: "fl_ignite", name: "Lingering Flames", spCost: 2, description: "Target burns for 5 damage over 3 turns", special: "burn_5_3t" },
    ],
  },
  glacial_spike: {
    id: "glacial_spike",
    name: "Glacial Spike",
    school: SpellSchool.ICE,
    spCost: 4,
    baseCharges: 14,
    damage: 28,
    range: 5,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "A razor-sharp shard of enchanted ice that pierces through the target's core.",
    animationType: RWAnimationType.ICE_BALL,
    upgrades: [
      { id: "gs_dmg", name: "Glacial Core", spCost: 1, description: "+12 damage", bonusDamage: 12 },
      { id: "gs_range", name: "Frozen Reach", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "gs_shatter", name: "Shatter", spCost: 2, description: "Frozen targets take double damage", special: "shatter_frozen" },
    ],
  },
  thunderstorm: {
    id: "thunderstorm",
    name: "Thunderstorm",
    school: SpellSchool.LIGHTNING,
    spCost: 4,
    baseCharges: 10,
    damage: 20,
    range: 5,
    aoeRadius: 1,
    mechanic: "projectile_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "Calls down a crackling storm of lightning upon the battlefield.",
    animationType: RWAnimationType.CHAIN_LIGHTNING,
    upgrades: [
      { id: "ts_dmg", name: "Thunder God", spCost: 1, description: "+10 damage", bonusDamage: 10 },
      { id: "ts_aoe", name: "Wide Storm", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "ts_charges", name: "Storm Cache", spCost: 1, description: "+5 charges", bonusCharges: 5 },
    ],
  },
  summon_skeleton: {
    id: "summon_skeleton",
    name: "Raise Dead",
    school: SpellSchool.DARK,
    spCost: 4,
    baseCharges: 8,
    damage: 0,
    range: 4,
    aoeRadius: 0,
    mechanic: "summon",
    maxBounces: 0,
    summonCount: 2,
    summonUnitType: "skeleton",
    description: "Wrench the bones of the fallen from the earth to serve your will.",
    animationType: RWAnimationType.SUMMON,
    upgrades: [
      { id: "sk_count", name: "Mass Grave", spCost: 2, description: "+1 skeleton per cast", bonusSummonCount: 1 },
      { id: "sk_charges", name: "Charnel Pact", spCost: 1, description: "+4 charges", bonusCharges: 4 },
      { id: "sk_elite", name: "Skeleton Knights", spCost: 2, description: "Summon armored skeletons with more HP", special: "elite_skeletons" },
    ],
  },
  divine_smite: {
    id: "divine_smite",
    name: "Divine Smite",
    school: SpellSchool.HOLY,
    spCost: 4,
    baseCharges: 10,
    damage: 35,
    range: 4,
    aoeRadius: 0,
    mechanic: "holy_blast",
    maxBounces: 0,
    summonCount: 0,
    description: "Channel the fury of the heavens into a single devastating strike. Deals double damage to undead.",
    animationType: RWAnimationType.HOLY_LIGHT,
    upgrades: [
      { id: "ds_dmg", name: "Wrath of the Just", spCost: 1, description: "+15 damage", bonusDamage: 15 },
      { id: "ds_range", name: "Heaven's Reach", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "ds_charges", name: "Zealot's Fervor", spCost: 1, description: "+5 charges", bonusCharges: 5 },
      { id: "ds_cascade", name: "Judgment Chain", spCost: 3, description: "Killing an undead blasts all nearby undead for half damage", special: "holy_cascade" },
    ],
  },

  // --- Tier 2 (5 SP) ---
  poison_cloud: {
    id: "poison_cloud",
    name: "Poison Cloud",
    school: SpellSchool.NATURE,
    spCost: 5,
    baseCharges: 8,
    damage: 10,
    range: 5,
    aoeRadius: 2,
    mechanic: "aoe_slow",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 2,
    slowFactor: 0.0,
    description: "A billowing cloud of noxious gas that chokes and sickens all who breathe it.",
    animationType: RWAnimationType.WEB,
    upgrades: [
      { id: "pc_dmg", name: "Virulent Toxin", spCost: 1, description: "+8 damage", bonusDamage: 8 },
      { id: "pc_aoe", name: "Spreading Miasma", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "pc_dur", name: "Persistent Fumes", spCost: 1, description: "+2 turns slow duration", special: "slow_duration_2" },
      { id: "pc_charges", name: "Alchemist's Stock", spCost: 1, description: "+4 charges", bonusCharges: 4 },
    ],
  },
  soul_bolt: {
    id: "soul_bolt",
    name: "Soul Bolt",
    school: SpellSchool.DARK,
    spCost: 5,
    baseCharges: 10,
    damage: 15,
    range: 5,
    aoeRadius: 0,
    mechanic: "chain",
    maxBounces: 3,
    summonCount: 0,
    description: "A shrieking bolt of spectral energy that leaps between victims, tearing at their souls.",
    animationType: RWAnimationType.DEATH_BOLT,
    upgrades: [
      { id: "slb_bounces", name: "Soul Harvest", spCost: 1, description: "+2 bounces", bonusBounces: 2 },
      { id: "slb_dmg", name: "Tormented Spirits", spCost: 2, description: "+10 damage", bonusDamage: 10 },
      { id: "slb_drain", name: "Soul Siphon", spCost: 2, description: "Heal 3 HP per enemy hit", special: "soul_siphon_3" },
    ],
  },
  arcane_orb: {
    id: "arcane_orb",
    name: "Arcane Orb",
    school: SpellSchool.ARCANE,
    spCost: 5,
    baseCharges: 10,
    damage: 24,
    range: 7,
    aoeRadius: 1,
    mechanic: "projectile_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "A pulsing sphere of raw arcane power, hurled across vast distances to detonate in a shower of eldritch sparks.",
    animationType: RWAnimationType.MAGIC_MISSILE,
    upgrades: [
      { id: "ao_dmg", name: "Eldritch Might", spCost: 1, description: "+10 damage", bonusDamage: 10 },
      { id: "ao_range", name: "Astral Trajectory", spCost: 1, description: "+4 range", bonusRange: 4 },
      { id: "ao_aoe", name: "Arcane Detonation", spCost: 2, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "ao_charges", name: "Mana Surplus", spCost: 1, description: "+5 charges", bonusCharges: 5 },
    ],
  },
  summon_wolves: {
    id: "summon_wolves",
    name: "Summon Wolf Pack",
    school: SpellSchool.NATURE,
    spCost: 5,
    baseCharges: 5,
    damage: 0,
    range: 4,
    aoeRadius: 0,
    mechanic: "summon",
    maxBounces: 0,
    summonCount: 3,
    summonUnitType: "wolf",
    description: "Howl into the void and call forth a ravenous pack of spectral wolves.",
    animationType: RWAnimationType.SUMMON,
    upgrades: [
      { id: "sw_count", name: "Alpha's Call", spCost: 2, description: "+2 wolves per cast", bonusSummonCount: 2 },
      { id: "sw_charges", name: "Endless Hunt", spCost: 1, description: "+3 charges", bonusCharges: 3 },
      { id: "sw_dire", name: "Dire Wolves", spCost: 2, description: "Summon dire wolves with increased damage and HP", special: "dire_wolves" },
    ],
  },
  blizzard: {
    id: "blizzard",
    name: "Blizzard",
    school: SpellSchool.ICE,
    spCost: 5,
    baseCharges: 3,
    damage: 15,
    range: 0,
    aoeRadius: 99,
    mechanic: "global_aoe",
    maxBounces: 0,
    summonCount: 0,
    slowDuration: 2,
    slowFactor: 0.0,
    description: "Unleash a howling blizzard that blankets the entire rift in killing frost.",
    animationType: RWAnimationType.FROST_BREATH,
    upgrades: [
      { id: "blz_dmg", name: "Absolute Zero", spCost: 2, description: "+10 damage", bonusDamage: 10 },
      { id: "blz_charges", name: "Endless Winter", spCost: 2, description: "+2 charges", bonusCharges: 2 },
      { id: "blz_dur", name: "Glacial Epoch", spCost: 2, description: "+2 turns freeze duration", special: "freeze_duration_2" },
    ],
  },

  // --- Tier 3 (6 SP) ---
  meteor: {
    id: "meteor",
    name: "Meteor",
    school: SpellSchool.FIRE,
    spCost: 6,
    baseCharges: 4,
    damage: 40,
    range: 5,
    aoeRadius: 2,
    mechanic: "projectile_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "Tear a blazing rock from the heavens and hurl it earthward. The impact is catastrophic.",
    animationType: RWAnimationType.FIREBALL,
    upgrades: [
      { id: "met_dmg", name: "Cataclysm", spCost: 2, description: "+20 damage", bonusDamage: 20 },
      { id: "met_aoe", name: "Extinction Event", spCost: 3, description: "+1 AoE radius", bonusAoeRadius: 1 },
      { id: "met_charges", name: "Asteroid Belt", spCost: 2, description: "+2 charges", bonusCharges: 2 },
      { id: "met_burn", name: "Molten Crater", spCost: 2, description: "Impact zone burns for 8 damage over 3 turns", special: "ground_fire_8_3t" },
    ],
  },
  summon_golem: {
    id: "summon_golem",
    name: "Summon Golem",
    school: SpellSchool.ARCANE,
    spCost: 6,
    baseCharges: 3,
    damage: 0,
    range: 3,
    aoeRadius: 0,
    mechanic: "summon",
    maxBounces: 0,
    summonCount: 1,
    summonUnitType: "golem",
    description: "Assemble a towering construct of stone and magic to crush your enemies underfoot.",
    animationType: RWAnimationType.SUMMON,
    upgrades: [
      { id: "sg_charges", name: "Assembly Line", spCost: 2, description: "+2 charges", bonusCharges: 2 },
      { id: "sg_steel", name: "Steel Golem", spCost: 3, description: "Golem gains double HP and thorns damage", special: "steel_golem" },
      { id: "sg_count", name: "Twin Constructs", spCost: 3, description: "+1 golem per cast", bonusSummonCount: 1 },
    ],
  },
  lightning_storm: {
    id: "lightning_storm",
    name: "Lightning Storm",
    school: SpellSchool.LIGHTNING,
    spCost: 6,
    baseCharges: 5,
    damage: 30,
    range: 4,
    aoeRadius: 2,
    mechanic: "cone",
    maxBounces: 0,
    summonCount: 0,
    description: "Discharge a massive cone of forked lightning that arcs through everything in its path.",
    animationType: RWAnimationType.CHAIN_LIGHTNING,
    upgrades: [
      { id: "ls_dmg", name: "Megavolt", spCost: 2, description: "+15 damage", bonusDamage: 15 },
      { id: "ls_range", name: "Storm Front", spCost: 1, description: "+2 cone range", bonusRange: 2 },
      { id: "ls_charges", name: "Capacitor Bank", spCost: 1, description: "+3 charges", bonusCharges: 3 },
      { id: "ls_stun", name: "Paralysis", spCost: 3, description: "Stun all hit enemies for 1 turn", special: "stun_1" },
    ],
  },
  banish: {
    id: "banish",
    name: "Banish",
    school: SpellSchool.ARCANE,
    spCost: 6,
    baseCharges: 4,
    damage: 50,
    range: 4,
    aoeRadius: 0,
    mechanic: "single_target",
    maxBounces: 0,
    summonCount: 0,
    description: "Unravel a creature's very existence and cast it into the void between worlds.",
    animationType: RWAnimationType.DISTORTION,
    upgrades: [
      { id: "ban_dmg", name: "Obliterate", spCost: 2, description: "+25 damage", bonusDamage: 25 },
      { id: "ban_range", name: "Far Banishment", spCost: 1, description: "+3 range", bonusRange: 3 },
      { id: "ban_charges", name: "Void Pact", spCost: 2, description: "+2 charges", bonusCharges: 2 },
    ],
  },

  // --- Tier 3 (7 SP) ---
  summon_dragon: {
    id: "summon_dragon",
    name: "Summon Dragon",
    school: SpellSchool.FIRE,
    spCost: 7,
    baseCharges: 2,
    damage: 0,
    range: 3,
    aoeRadius: 0,
    mechanic: "summon",
    maxBounces: 0,
    summonCount: 1,
    summonUnitType: "dragon",
    description: "Rip open a portal to the Ember Realm and summon forth a terrible dragon wreathed in flame.",
    animationType: RWAnimationType.SUMMON,
    upgrades: [
      { id: "sd_charges", name: "Dragon Covenant", spCost: 2, description: "+1 charge", bonusCharges: 1 },
      { id: "sd_elder", name: "Elder Dragon", spCost: 3, description: "Summon an elder dragon with breath attack and massive HP", special: "elder_dragon" },
      { id: "sd_twin", name: "Twin Wyrms", spCost: 4, description: "+1 dragon per cast", bonusSummonCount: 1 },
    ],
  },
  annihilate: {
    id: "annihilate",
    name: "Annihilate",
    school: SpellSchool.DARK,
    spCost: 7,
    baseCharges: 2,
    damage: 25,
    range: 0,
    aoeRadius: 99,
    mechanic: "global_aoe",
    maxBounces: 0,
    summonCount: 0,
    description: "Open the maw of the abyss and let oblivion wash over every living thing in the rift.",
    animationType: RWAnimationType.DEATH_BOLT,
    upgrades: [
      { id: "ann_dmg", name: "Total Oblivion", spCost: 2, description: "+15 damage", bonusDamage: 15 },
      { id: "ann_charges", name: "Abyssal Pact", spCost: 3, description: "+1 charge", bonusCharges: 1 },
      { id: "ann_drain", name: "Feast of Souls", spCost: 3, description: "Heal 5 HP for each enemy killed", special: "kill_heal_5" },
    ],
  },
  divine_chorus: {
    id: "divine_chorus",
    name: "Divine Chorus",
    school: SpellSchool.HOLY,
    spCost: 7,
    baseCharges: 3,
    damage: -20,
    range: 0,
    aoeRadius: 3,
    mechanic: "self_aura",
    maxBounces: 0,
    summonCount: 0,
    description: "A choir of celestial voices surrounds you, mending your wounds and searing the undead with holy resonance.",
    animationType: RWAnimationType.HEAL,
    upgrades: [
      { id: "dc_heal", name: "Angelic Harmony", spCost: 2, description: "+10 healing per turn", bonusDamage: -10 },
      { id: "dc_aoe", name: "Cathedral of Light", spCost: 2, description: "+2 aura radius", bonusAoeRadius: 2 },
      { id: "dc_charges", name: "Eternal Hymn", spCost: 2, description: "+2 charges", bonusCharges: 2 },
      { id: "dc_smite", name: "Wrathful Chorus", spCost: 3, description: "Also deals 15 holy damage to undead in range", special: "aura_smite_15" },
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
