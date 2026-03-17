// ---------------------------------------------------------------------------
// Rift Wizard enemy definitions
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";
import { SpellSchool, RWEnemyAIType } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RWEnemyDef {
  id: string;
  name: string;
  unitType: UnitType;
  hp: number;
  damage: number;
  range: number; // 1 = melee
  moveSpeed: number; // tiles per turn
  aiType: RWEnemyAIType;
  school: SpellSchool | null;
  abilities: string[]; // spell defIds
  isBoss: boolean;
  /** Tags for special interactions (e.g. "undead" for holy bonus). */
  tags: string[];
  /** Override drop chance (default uses RWBalance.ENEMY_DROP_CHANCE). */
  dropChance?: number;
}

// ---------------------------------------------------------------------------
// Enemy catalog
// ---------------------------------------------------------------------------

export const ENEMY_DEFS: Record<string, RWEnemyDef> = {
  // --- Tier 1 (levels 0-4) ---
  spider: {
    id: "spider",
    name: "Spider",
    unitType: UnitType.SPIDER,
    hp: 25,
    damage: 8,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.NATURE,
    abilities: [],
    isBoss: false,
    tags: ["beast"],
  },
  swordsman: {
    id: "swordsman",
    name: "Swordsman",
    unitType: UnitType.SWORDSMAN,
    hp: 40,
    damage: 10,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: null,
    abilities: [],
    isBoss: false,
    tags: ["humanoid"],
  },
  archer: {
    id: "archer",
    name: "Archer",
    unitType: UnitType.ARCHER,
    hp: 25,
    damage: 12,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.RANGED,
    school: null,
    abilities: [],
    isBoss: false,
    tags: ["humanoid"],
  },
  bat: {
    id: "bat",
    name: "Bat",
    unitType: UnitType.BAT,
    hp: 15,
    damage: 6,
    range: 1,
    moveSpeed: 2,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.DARK,
    abilities: [],
    isBoss: false,
    tags: ["beast"],
  },

  // --- Tier 2 (levels 5-9) ---
  fire_mage: {
    id: "fire_mage",
    name: "Fire Mage",
    unitType: UnitType.FIRE_MAGE,
    hp: 30,
    damage: 20,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.FIRE,
    abilities: ["fireball"],
    isBoss: false,
    tags: ["humanoid", "mage"],
  },
  cold_mage: {
    id: "cold_mage",
    name: "Ice Mage",
    unitType: UnitType.COLD_MAGE,
    hp: 30,
    damage: 18,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.ICE,
    abilities: ["ice_ball"],
    isBoss: false,
    tags: ["humanoid", "mage"],
  },
  storm_mage: {
    id: "storm_mage",
    name: "Storm Mage",
    unitType: UnitType.STORM_MAGE,
    hp: 28,
    damage: 15,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.LIGHTNING,
    abilities: ["chain_lightning"],
    isBoss: false,
    tags: ["humanoid", "mage"],
  },
  troll: {
    id: "troll",
    name: "Troll",
    unitType: UnitType.TROLL,
    hp: 80,
    damage: 18,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.NATURE,
    abilities: [],
    isBoss: false,
    tags: ["beast"],
  },
  vampire_bat: {
    id: "vampire_bat",
    name: "Vampire Bat",
    unitType: UnitType.VAMPIRE_BAT,
    hp: 35,
    damage: 12,
    range: 1,
    moveSpeed: 2,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.DARK,
    abilities: [],
    isBoss: false,
    tags: ["beast", "undead"],
  },

  // --- Tier 3 (levels 10-14) ---
  minor_fire_elemental: {
    id: "minor_fire_elemental",
    name: "Fire Elemental",
    unitType: UnitType.MINOR_FIRE_ELEMENTAL,
    hp: 55,
    damage: 20,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.FIRE,
    abilities: [],
    isBoss: false,
    tags: ["elemental"],
  },
  minor_ice_elemental: {
    id: "minor_ice_elemental",
    name: "Ice Elemental",
    unitType: UnitType.MINOR_ICE_ELEMENTAL,
    hp: 50,
    damage: 18,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.ICE,
    abilities: [],
    isBoss: false,
    tags: ["elemental"],
  },
  minor_lightning_elemental: {
    id: "minor_lightning_elemental",
    name: "Lightning Elemental",
    unitType: UnitType.MINOR_LIGHTNING_ELEMENTAL,
    hp: 45,
    damage: 22,
    range: 2,
    moveSpeed: 1,
    aiType: RWEnemyAIType.RANGED,
    school: SpellSchool.LIGHTNING,
    abilities: [],
    isBoss: false,
    tags: ["elemental"],
  },
  banshee: {
    id: "banshee",
    name: "Banshee",
    unitType: UnitType.BANSHEE,
    hp: 40,
    damage: 25,
    range: 3,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.DARK,
    abilities: [],
    isBoss: false,
    tags: ["undead"],
  },
  necromancer: {
    id: "necromancer",
    name: "Necromancer",
    unitType: UnitType.NECROMANCER,
    hp: 35,
    damage: 15,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.DARK,
    abilities: ["death_bolt"],
    isBoss: false,
    tags: ["humanoid", "mage", "undead"],
  },

  // --- Tier 4 (levels 15-19) ---
  fire_elemental: {
    id: "fire_elemental",
    name: "Greater Fire Elemental",
    unitType: UnitType.FIRE_ELEMENTAL,
    hp: 90,
    damage: 30,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.FIRE,
    abilities: [],
    isBoss: false,
    tags: ["elemental"],
    dropChance: 0.3,
  },
  death_knight: {
    id: "death_knight",
    name: "Death Knight",
    unitType: UnitType.DEATH_KNIGHT,
    hp: 100,
    damage: 28,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.DARK,
    abilities: [],
    isBoss: false,
    tags: ["undead", "elite"],
    dropChance: 0.3,
  },
  distortion_mage: {
    id: "distortion_mage",
    name: "Distortion Mage",
    unitType: UnitType.DISTORTION_MAGE,
    hp: 35,
    damage: 22,
    range: 5,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.ARCANE,
    abilities: ["distortion_blast"],
    isBoss: false,
    tags: ["humanoid", "mage"],
    dropChance: 0.3,
  },
  pit_lord: {
    id: "pit_lord",
    name: "Pit Lord",
    unitType: UnitType.PIT_LORD,
    hp: 120,
    damage: 32,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.MELEE,
    school: SpellSchool.FIRE,
    abilities: [],
    isBoss: false,
    tags: ["demon"],
    dropChance: 0.3,
  },

  // --- Tier 5 (levels 20-24) ---
  archmage: {
    id: "archmage",
    name: "Archmage",
    unitType: UnitType.ARCHMAGE,
    hp: 50,
    damage: 30,
    range: 6,
    moveSpeed: 1,
    aiType: RWEnemyAIType.CASTER,
    school: SpellSchool.ARCANE,
    abilities: ["fireball", "chain_lightning"],
    isBoss: false,
    tags: ["humanoid", "mage"],
    dropChance: 0.3,
  },
  seraphim: {
    id: "seraphim",
    name: "Seraphim",
    unitType: UnitType.SERAPHIM,
    hp: 80,
    damage: 35,
    range: 3,
    moveSpeed: 1,
    aiType: RWEnemyAIType.RANGED,
    school: SpellSchool.HOLY,
    abilities: ["holy_light"],
    isBoss: false,
    tags: ["angel"],
    dropChance: 0.3,
  },

  // --- Bosses ---
  boss_troll_king: {
    id: "boss_troll_king",
    name: "Troll King",
    unitType: UnitType.TROLL,
    hp: 200,
    damage: 25,
    range: 1,
    moveSpeed: 1,
    aiType: RWEnemyAIType.BOSS,
    school: SpellSchool.NATURE,
    abilities: [],
    isBoss: true,
    tags: ["beast", "boss"],
    dropChance: 1.0,
  },
  boss_fire_lord: {
    id: "boss_fire_lord",
    name: "Fire Lord",
    unitType: UnitType.FIRE_ELEMENTAL,
    hp: 250,
    damage: 35,
    range: 2,
    moveSpeed: 1,
    aiType: RWEnemyAIType.BOSS,
    school: SpellSchool.FIRE,
    abilities: ["fireball", "fire_breath"],
    isBoss: true,
    tags: ["elemental", "boss"],
    dropChance: 1.0,
  },
  boss_lich: {
    id: "boss_lich",
    name: "Lich",
    unitType: UnitType.NECROMANCER,
    hp: 220,
    damage: 30,
    range: 6,
    moveSpeed: 1,
    aiType: RWEnemyAIType.BOSS,
    school: SpellSchool.DARK,
    abilities: ["death_bolt", "summon_imps"],
    isBoss: true,
    tags: ["undead", "boss"],
    dropChance: 1.0,
  },
  boss_storm_titan: {
    id: "boss_storm_titan",
    name: "Storm Titan",
    unitType: UnitType.LIGHTNING_ELEMENTAL,
    hp: 300,
    damage: 40,
    range: 4,
    moveSpeed: 1,
    aiType: RWEnemyAIType.BOSS,
    school: SpellSchool.LIGHTNING,
    abilities: ["chain_lightning"],
    isBoss: true,
    tags: ["elemental", "boss"],
    dropChance: 1.0,
  },
  boss_mordred: {
    id: "boss_mordred",
    name: "Mordred the Betrayer",
    unitType: UnitType.ARCHMAGE,
    hp: 400,
    damage: 45,
    range: 7,
    moveSpeed: 1,
    aiType: RWEnemyAIType.BOSS,
    school: SpellSchool.ARCANE,
    abilities: ["fireball", "chain_lightning", "death_bolt", "warp"],
    isBoss: true,
    tags: ["humanoid", "mage", "boss"],
    dropChance: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Enemy pools by level tier
// ---------------------------------------------------------------------------

const TIER_1_ENEMIES = ["spider", "swordsman", "archer", "bat"];
const TIER_2_ENEMIES = ["fire_mage", "cold_mage", "storm_mage", "troll", "vampire_bat"];
const TIER_3_ENEMIES = ["minor_fire_elemental", "minor_ice_elemental", "minor_lightning_elemental", "banshee", "necromancer"];
const TIER_4_ENEMIES = ["fire_elemental", "death_knight", "distortion_mage", "pit_lord"];
const TIER_5_ENEMIES = ["archmage", "seraphim"];

/** The spawner enemy (used by spawner buildings). */
export const SPAWNER_ENEMY_IDS: Record<number, string[]> = {
  0: ["spider", "bat"],
  1: ["swordsman", "archer"],
  2: ["fire_mage", "cold_mage"],
  3: ["minor_fire_elemental", "minor_ice_elemental"],
  4: ["death_knight"],
};

/** Get the boss defId for a boss level index (0-4). */
export function getBossForLevel(levelNum: number): string {
  const bossMap: Record<number, string> = {
    4: "boss_troll_king",
    9: "boss_fire_lord",
    14: "boss_lich",
    19: "boss_storm_titan",
    24: "boss_mordred",
  };
  return bossMap[levelNum] ?? "boss_troll_king";
}

/**
 * Get the available enemy pool for a given level.
 * Higher levels include enemies from all lower tiers.
 */
export function getEnemyPoolForLevel(levelNum: number): string[] {
  const pool = [...TIER_1_ENEMIES];
  if (levelNum >= 5) pool.push(...TIER_2_ENEMIES);
  if (levelNum >= 10) pool.push(...TIER_3_ENEMIES);
  if (levelNum >= 15) pool.push(...TIER_4_ENEMIES);
  if (levelNum >= 20) pool.push(...TIER_5_ENEMIES);
  return pool;
}

/**
 * Scale enemy stats based on level progression.
 * Enemies get tougher in later levels.
 */
export function scaleEnemyStats(
  def: RWEnemyDef,
  levelNum: number,
): { hp: number; damage: number } {
  const scale = 1 + levelNum * 0.06; // +6% per level
  return {
    hp: Math.floor(def.hp * scale),
    damage: Math.floor(def.damage * scale),
  };
}
