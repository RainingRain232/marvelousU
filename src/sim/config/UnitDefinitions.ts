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
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDef> = {
  [UnitType.SWORDSMAN]: {
    type: UnitType.SWORDSMAN,
    cost: 30,
    hp: 100,
    atk: 15,
    attackSpeed: 1.0,
    speed: 2,
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
    speed: 2,
    range: 4,
    spawnTime: 4,
    abilityTypes: [],
    spriteKey: "archer",
  },
  [UnitType.KNIGHT]: {
    type: UnitType.KNIGHT,
    cost: 60,
    hp: 180,
    atk: 25,
    attackSpeed: 0.7,
    speed: 3,
    range: 1,
    spawnTime: 5,
    abilityTypes: [],
    spriteKey: "knight",
  },
  [UnitType.MAGE]: {
    type: UnitType.MAGE,
    cost: 80,
    hp: 60,
    atk: 10,
    attackSpeed: 0.5,
    speed: 1.5,
    range: 5,
    spawnTime: 6,
    abilityTypes: [AbilityType.FIREBALL, AbilityType.CHAIN_LIGHTNING],
    spriteKey: "mage",
  },
  [UnitType.PIKEMAN]: {
    type: UnitType.PIKEMAN,
    cost: 35,
    hp: 90,
    atk: 18,
    attackSpeed: 0.9,
    speed: 1.8,
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
    speed: 2.5,
    range: 1,
    spawnTime: 0,
    abilityTypes: [],
    spriteKey: "summoned",
  },
};
