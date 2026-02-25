// Stats, costs, animation keys for all unit types
import { UnitType, AbilityType } from "@/types";

export interface UnitDef {
  type: UnitType;
  cost: number; // gold cost to train
  hp: number;
  atk: number; // damage per hit
  attackSpeed: number; // attacks per second
  speed: number; // tiles per second
  range: number; // attack range in tiles
  spawnTime: number; // seconds to train
  abilityTypes: AbilityType[];
  spriteKey: string;
  /** If true, unit ignores enemy units and only attacks buildings/bases. */
  siegeOnly?: boolean;
  /** If set, unit always prefers the nearest enemy of these types over all others. */
  huntTargets?: UnitType[];
  /** If true, unit ignores all combat and only seeks neutral buildings to capture. */
  diplomatOnly?: boolean;
  /** Visual size properties for rendering */
  size?: {
    width: number; // multiplier for sprite width (1.0 = normal)
    height: number; // multiplier for sprite height (1.0 = normal)
    healthBarOffset?: number; // Y offset for health bar (negative = higher)
  };
  /** If true, the unit deals 5x damage on its first hit. */
  isChargeUnit?: boolean;
  /** If true, the unit targets and heals friendly units instead of attacking enemies. */
  isHealer?: boolean;
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDef> = {
  [UnitType.SWORDSMAN]: {
    type: UnitType.SWORDSMAN,
    cost: 30,
    hp: 100,
    atk: 15,
    attackSpeed: 1.0,
    speed: 1,
    range: 1,
    spawnTime: 3,
    abilityTypes: [],
    spriteKey: "swordsman",
  },
  [UnitType.ARCHER]: {
    type: UnitType.ARCHER,
    cost: 40,
    hp: 70,
    atk: 20,
    attackSpeed: 0.8,
    speed: 1,
    range: 4,
    spawnTime: 4,
    abilityTypes: [],
    spriteKey: "archer",
  },
  [UnitType.LONGBOWMAN]: {
    type: UnitType.LONGBOWMAN,
    cost: 55,
    hp: 65,
    atk: 14,
    attackSpeed: 0.7,
    speed: 0.9,
    range: 6,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "archer",
  },
  [UnitType.CROSSBOWMAN]: {
    type: UnitType.CROSSBOWMAN,
    cost: 60,
    hp: 75,
    atk: 30,
    attackSpeed: 0.5,
    speed: 0.9,
    range: 3,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "archer",
  },
  [UnitType.KNIGHT]: {
    type: UnitType.KNIGHT,
    cost: 60,
    hp: 180,
    atk: 25,
    attackSpeed: 0.7,
    speed: 1.5,
    range: 1,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "knight",
  },
  [UnitType.FIRE_MAGE]: {
    type: UnitType.FIRE_MAGE,
    cost: 80,
    hp: 60,
    atk: 10,
    attackSpeed: 0.5,
    speed: 0.75,
    range: 5,
    spawnTime: 6,
    abilityTypes: [AbilityType.FIREBALL],
    spriteKey: "mage",
  },
  [UnitType.STORM_MAGE]: {
    type: UnitType.STORM_MAGE,
    cost: 80,
    hp: 60,
    atk: 10,
    attackSpeed: 0.5,
    speed: 0.75,
    range: 5,
    spawnTime: 6,
    abilityTypes: [AbilityType.CHAIN_LIGHTNING],
    spriteKey: "mage",
  },
  [UnitType.PIKEMAN]: {
    type: UnitType.PIKEMAN,
    cost: 35,
    hp: 90,
    atk: 18,
    attackSpeed: 0.9,
    speed: 0.9,
    range: 2,
    spawnTime: 3,
    abilityTypes: [],
    spriteKey: "pikeman",
  },
  [UnitType.SUMMONED]: {
    type: UnitType.SUMMONED,
    cost: 0,
    hp: 40,
    atk: 10,
    attackSpeed: 1.2,
    speed: 1.25,
    range: 1,
    spawnTime: 0,
    abilityTypes: [],
    spriteKey: "summoned",
  },
  [UnitType.BATTERING_RAM]: {
    type: UnitType.BATTERING_RAM,
    cost: 80,
    hp: 300,
    atk: 60,
    attackSpeed: 0.4,
    speed: 0.5,
    range: 1,
    spawnTime: 8,
    abilityTypes: [],
    spriteKey: "battering_ram",
    siegeOnly: true,
  },
  [UnitType.MAGE_HUNTER]: {
    type: UnitType.MAGE_HUNTER,
    cost: 50,
    hp: 80,
    atk: 22,
    attackSpeed: 1.1,
    speed: 1.25,
    range: 1,
    spawnTime: 4,
    abilityTypes: [],
    spriteKey: "mage_hunter",
    huntTargets: [UnitType.FIRE_MAGE, UnitType.STORM_MAGE],
  },
  [UnitType.SIEGE_HUNTER]: {
    type: UnitType.SIEGE_HUNTER,
    cost: 60,
    hp: 120,
    atk: 35,
    attackSpeed: 0.9,
    speed: 1.5,
    range: 1,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "siege_hunter",
    huntTargets: [UnitType.BATTERING_RAM],
  },
  [UnitType.SUMMONER]: {
    type: UnitType.SUMMONER,
    cost: 120,
    hp: 55,
    atk: 5,
    attackSpeed: 0.4,
    speed: 0.75,
    range: 6,
    spawnTime: 8,
    abilityTypes: [AbilityType.SUMMON],
    spriteKey: "mage",
  },
  [UnitType.COLD_MAGE]: {
    type: UnitType.COLD_MAGE,
    cost: 100,
    hp: 55,
    atk: 5,
    attackSpeed: 0.4,
    speed: 0.75,
    range: 6,
    spawnTime: 7,
    abilityTypes: [AbilityType.ICE_BALL],
    spriteKey: "cold_mage",
  },
  [UnitType.SPIDER]: {
    type: UnitType.SPIDER,
    cost: 60,
    hp: 65,
    atk: 8,
    attackSpeed: 0.7,
    speed: 1.1,
    range: 4,
    spawnTime: 5,
    abilityTypes: [AbilityType.WEB],
    spriteKey: "spider",
  },
  [UnitType.GLADIATOR]: {
    type: UnitType.GLADIATOR,
    cost: 70,
    hp: 140,
    atk: 20,
    attackSpeed: 0.8,
    speed: 1.0,
    range: 4,
    spawnTime: 6,
    abilityTypes: [AbilityType.GLADIATOR_NET],
    spriteKey: "gladiator",
  },
  [UnitType.DIPLOMAT]: {
    type: UnitType.DIPLOMAT,
    cost: 60,
    hp: 80,
    atk: 0,
    attackSpeed: 0,
    speed: 1.25,
    range: 0,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "diplomat",
    diplomatOnly: true,
  },
  [UnitType.DISTORTION_MAGE]: {
    type: UnitType.DISTORTION_MAGE,
    cost: 90,
    hp: 65,
    atk: 10,
    attackSpeed: 0.6,
    speed: 0.8,
    range: 5,
    spawnTime: 6,
    abilityTypes: [AbilityType.DISTORTION_BLAST],
    spriteKey: "mage",
  },
  [UnitType.VOID_SNAIL]: {
    type: UnitType.VOID_SNAIL,
    cost: 50,
    hp: 120,
    atk: 5,
    attackSpeed: 0.4,
    speed: 0.5,
    range: 3,
    spawnTime: 5,
    abilityTypes: [AbilityType.VOID_DISTORTION],
    spriteKey: "spider", // placeholder or snail-like
  },
  [UnitType.FAERY_QUEEN]: {
    type: UnitType.FAERY_QUEEN,
    cost: 150,
    hp: 80,
    atk: 15,
    attackSpeed: 0.7,
    speed: 1.1,
    range: 6,
    spawnTime: 10,
    abilityTypes: [AbilityType.FAERY_DISTORTION],
    spriteKey: "cold_mage", // placeholder or fairy-like
  },
  [UnitType.GIANT_FROG]: {
    type: UnitType.GIANT_FROG,
    cost: 100,
    hp: 200,
    atk: 10,
    attackSpeed: 0.6,
    speed: 0.9,
    range: 7,
    spawnTime: 6,
    abilityTypes: [AbilityType.FROG_TONGUE],
    spriteKey: "spider", // placeholder (spider-like legs/movement)
  },
  [UnitType.DEVOURER]: {
    type: UnitType.DEVOURER,
    cost: 130,
    hp: 350,
    atk: 15,
    attackSpeed: 0.5,
    speed: 0.6,
    range: 3,
    spawnTime: 8,
    abilityTypes: [AbilityType.DEVOUR_PULL],
    spriteKey: "swordsman", // placeholder (tanky humanoid)
  },
  [UnitType.HORSE_ARCHER]: {
    type: UnitType.HORSE_ARCHER,
    cost: 70,
    hp: 100,
    atk: 15,
    attackSpeed: 0.8,
    speed: 1.75,
    range: 4,
    spawnTime: 6,
    abilityTypes: [],
    spriteKey: "knight", // placeholder (mounted)
  },
  [UnitType.SHORTBOW]: {
    type: UnitType.SHORTBOW,
    cost: 30,
    hp: 60,
    atk: 10,
    attackSpeed: 1.2,
    speed: 1.1,
    range: 3,
    spawnTime: 3,
    abilityTypes: [],
    spriteKey: "archer", // placeholder
  },
  [UnitType.BALLISTA]: {
    type: UnitType.BALLISTA,
    cost: 100,
    hp: 120,
    atk: 50,
    attackSpeed: 0.3,
    speed: 0.5,
    range: 5,
    spawnTime: 8,
    abilityTypes: [],
    spriteKey: "battering_ram", // placeholder (siege)
  },
  [UnitType.BOLT_THROWER]: {
    type: UnitType.BOLT_THROWER,
    cost: 120,
    hp: 100,
    atk: 30,
    attackSpeed: 0.2, // slow but long range
    speed: 0.5,
    range: 8,
    spawnTime: 10,
    abilityTypes: [],
    spriteKey: "battering_ram", // placeholder (siege)
  },
  [UnitType.SCOUT_CAVALRY]: {
    type: UnitType.SCOUT_CAVALRY,
    cost: 40,
    hp: 60,
    atk: 10,
    attackSpeed: 1.0,
    speed: 1.6,
    range: 1,
    spawnTime: 3,
    abilityTypes: [],
    spriteKey: "knight",
    isChargeUnit: true,
  },
  [UnitType.LANCER]: {
    type: UnitType.LANCER,
    cost: 70,
    hp: 120,
    atk: 20,
    attackSpeed: 0.8,
    speed: 1.5,
    range: 1,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "knight",
    isChargeUnit: true,
  },
  [UnitType.ELITE_LANCER]: {
    type: UnitType.ELITE_LANCER,
    cost: 100,
    hp: 180,
    atk: 25,
    attackSpeed: 0.8,
    speed: 1.4,
    range: 1,
    spawnTime: 7,
    abilityTypes: [],
    spriteKey: "knight",
    isChargeUnit: true,
  },
  [UnitType.KNIGHT_LANCER]: {
    type: UnitType.KNIGHT_LANCER,
    cost: 130,
    hp: 250,
    atk: 30,
    attackSpeed: 0.6,
    speed: 1.1,
    range: 1,
    spawnTime: 8,
    abilityTypes: [],
    spriteKey: "knight",
    isChargeUnit: true,
  },
  [UnitType.MONK]: {
    type: UnitType.MONK,
    cost: 50,
    hp: 80,
    atk: 0,
    attackSpeed: 0.8,
    speed: 1,
    range: 1.5,
    spawnTime: 4,
    abilityTypes: [AbilityType.HEAL],
    spriteKey: "diplomat", // placeholder (religious robes)
    isHealer: true,
  },
  [UnitType.CLERIC]: {
    type: UnitType.CLERIC,
    cost: 90,
    hp: 120,
    atk: 0,
    attackSpeed: 0.6,
    speed: 0.9,
    range: 3,
    spawnTime: 7,
    abilityTypes: [AbilityType.HEAL],
    spriteKey: "mage", // placeholder
    isHealer: true,
  },
  [UnitType.SAINT]: {
    type: UnitType.SAINT,
    cost: 150,
    hp: 200,
    atk: 0,
    attackSpeed: 0.5,
    speed: 0.75,
    range: 5,
    spawnTime: 10,
    abilityTypes: [AbilityType.HEAL],
    spriteKey: "faery_queen", // placeholder (ethereal/divine)
    isHealer: true,
  },
  [UnitType.RED_DRAGON]: {
    type: UnitType.RED_DRAGON,
    cost: 250,
    hp: 500,
    atk: 35,
    attackSpeed: 0.8,
    speed: 1.2,
    range: 2,
    spawnTime: 15,
    abilityTypes: [AbilityType.FIRE_BREATH],
    spriteKey: "red_dragon",
    size: {
      width: 1.0, // normal width
      height: 2.0, // 2x taller than normal
      healthBarOffset: -0.8, // health bar positioned higher
    },
  },
  [UnitType.FROST_DRAGON]: {
    type: UnitType.FROST_DRAGON,
    cost: 240,
    hp: 480,
    atk: 30,
    attackSpeed: 0.8,
    speed: 1.2,
    range: 2,
    spawnTime: 15,
    abilityTypes: [AbilityType.FROST_BREATH],
    spriteKey: "frost_dragon",
    size: {
      width: 1.0, // normal width
      height: 2.0, // 2x taller than normal
      healthBarOffset: -0.8, // health bar positioned higher
    },
  },
  [UnitType.CYCLOPS]: {
    type: UnitType.CYCLOPS,
    cost: 350, // Very expensive
    hp: 800, // Very high hitpoints
    atk: 60, // Very high attack
    attackSpeed: 0.6, // Slow but devastating attacks
    speed: 0.8, // Slow movement
    range: 1.5, // Melee with slightly extended reach due to club
    spawnTime: 20, // Long training time
    abilityTypes: [], // Basic melee attacks only
    spriteKey: "cyclops",
    size: {
      width: 2.0, // 2 tiles wide
      height: 3.0, // 3 tiles tall
      healthBarOffset: -2.0, // Health bar positioned very high
    },
  },
};
