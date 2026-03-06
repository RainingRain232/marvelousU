// Enemy encounter definitions for RPG mode
import { UnitType } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";
import {
  ITEM_HEALTH_POTION,
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_ANTIDOTE,
  ITEM_IRON_SWORD,
  ITEM_MAGIC_STAFF,
  ITEM_WAR_AXE,
  ITEM_LEATHER_ARMOR,
  ITEM_CHAINMAIL,
  ITEM_PLATE_ARMOR,
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
} from "@rpg/config/RPGItemDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnemyDef {
  unitType: UnitType;
  level: number;
  count: number;
  overrides?: Partial<{ hp: number; atk: number; def: number; speed: number }>;
  /** Override battle line placement (1=front, 2=back). Auto-assigned by range if omitted. */
  line?: 1 | 2;
}

export interface EncounterDef {
  id: string;
  name: string;
  enemies: EnemyDef[];
  isBoss: boolean;
  xpReward: number;
  goldReward: number;
  lootTable: { item: RPGItem; chance: number }[];
}

// ---------------------------------------------------------------------------
// Encounter registry
// ---------------------------------------------------------------------------

export const ENCOUNTER_DEFS: Record<string, EncounterDef> = {
  // --- Overworld random encounters ---
  forest_wolves: {
    id: "forest_wolves",
    name: "Pack of Wolves",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 1, count: 3 },
    ],
    isBoss: false,
    xpReward: 30,
    goldReward: 15,
    lootTable: [{ item: ITEM_HEALTH_POTION, chance: 0.2 }],
  },
  bandit_ambush: {
    id: "bandit_ambush",
    name: "Bandit Ambush",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 2, count: 2 },
      { unitType: UnitType.ARCHER, level: 2, count: 1 },
    ],
    isBoss: false,
    xpReward: 50,
    goldReward: 30,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.25 },
      { item: ITEM_IRON_SWORD, chance: 0.1 },
    ],
  },
  goblin_patrol: {
    id: "goblin_patrol",
    name: "Goblin Patrol",
    enemies: [
      { unitType: UnitType.PIKEMAN, level: 1, count: 2 },
      { unitType: UnitType.SWORDSMAN, level: 1, count: 2 },
    ],
    isBoss: false,
    xpReward: 40,
    goldReward: 20,
    lootTable: [{ item: ITEM_HEALTH_POTION, chance: 0.15 }],
  },
  skeleton_patrol: {
    id: "skeleton_patrol",
    name: "Skeleton Patrol",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 3, count: 2 },
      { unitType: UnitType.ARCHER, level: 3, count: 2 },
    ],
    isBoss: false,
    xpReward: 70,
    goldReward: 35,
    lootTable: [
      { item: ITEM_MANA_POTION, chance: 0.2 },
      { item: ITEM_LEATHER_ARMOR, chance: 0.15 },
    ],
  },

  orc_warband: {
    id: "orc_warband",
    name: "Orc Warband",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 3, count: 4 },
      { unitType: UnitType.ARCHER, level: 3, count: 3 },
      { unitType: UnitType.PIKEMAN, level: 3, count: 2 },
    ],
    isBoss: false,
    xpReward: 100,
    goldReward: 50,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.3 },
      { item: ITEM_IRON_SWORD, chance: 0.15 },
    ],
  },
  desert_raiders: {
    id: "desert_raiders",
    name: "Desert Raiders",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 4, count: 3 },
      { unitType: UnitType.ARCHER, level: 4, count: 3 },
      { unitType: UnitType.CROSSBOWMAN, level: 4, count: 2 },
    ],
    isBoss: false,
    xpReward: 120,
    goldReward: 60,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.2 },
      { item: ITEM_CHAINMAIL, chance: 0.1 },
    ],
  },

  // --- Dungeon encounters ---
  dungeon_rats: {
    id: "dungeon_rats",
    name: "Giant Rats",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 2, count: 4, overrides: { hp: 40, atk: 8 } },
    ],
    isBoss: false,
    xpReward: 35,
    goldReward: 10,
    lootTable: [{ item: ITEM_HEALTH_POTION, chance: 0.15 }],
  },
  dungeon_spiders: {
    id: "dungeon_spiders",
    name: "Cave Spiders",
    enemies: [
      { unitType: UnitType.SPIDER, level: 3, count: 3 },
    ],
    isBoss: false,
    xpReward: 60,
    goldReward: 25,
    lootTable: [
      { item: ITEM_ANTIDOTE, chance: 0.2 },
      { item: ITEM_SPEED_RING, chance: 0.15 },
    ],
  },
  dungeon_undead: {
    id: "dungeon_undead",
    name: "Undead Horde",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 4, count: 3 },
      { unitType: UnitType.PIKEMAN, level: 4, count: 2 },
    ],
    isBoss: false,
    xpReward: 90,
    goldReward: 45,
    lootTable: [
      { item: ITEM_MANA_POTION, chance: 0.2 },
      { item: ITEM_CHAINMAIL, chance: 0.15 },
    ],
  },
  dungeon_mages: {
    id: "dungeon_mages",
    name: "Dark Acolytes",
    enemies: [
      { unitType: UnitType.FIRE_MAGE, level: 5, count: 2 },
      { unitType: UnitType.SWORDSMAN, level: 4, count: 2 },
    ],
    isBoss: false,
    xpReward: 110,
    goldReward: 55,
    lootTable: [
      { item: ITEM_MANA_POTION, chance: 0.25 },
      { item: ITEM_MAGIC_STAFF, chance: 0.15 },
    ],
  },

  // --- Bosses ---
  boss_troll_king: {
    id: "boss_troll_king",
    name: "Troll King",
    enemies: [
      { unitType: UnitType.TROLL, level: 8, count: 1, overrides: { hp: 800, atk: 60, def: 20 } },
      { unitType: UnitType.SWORDSMAN, level: 5, count: 2 },
    ],
    isBoss: true,
    xpReward: 300,
    goldReward: 200,
    lootTable: [
      { item: ITEM_WAR_AXE, chance: 1.0 },
      { item: ITEM_PLATE_ARMOR, chance: 0.5 },
      { item: ITEM_GREATER_HEALTH_POTION, chance: 1.0 },
    ],
  },
  boss_dragon: {
    id: "boss_dragon",
    name: "Red Dragon",
    enemies: [
      { unitType: UnitType.RED_DRAGON, level: 12, count: 1, overrides: { hp: 1500, atk: 80 } },
    ],
    isBoss: true,
    xpReward: 500,
    goldReward: 400,
    lootTable: [
      { item: ITEM_PLATE_ARMOR, chance: 1.0 },
      { item: ITEM_HEALTH_AMULET, chance: 1.0 },
      { item: ITEM_GREATER_HEALTH_POTION, chance: 1.0 },
    ],
  },
  boss_lich: {
    id: "boss_lich",
    name: "The Lich Lord",
    enemies: [
      { unitType: UnitType.NECROMANCER, level: 10, count: 1, overrides: { hp: 1000, atk: 50 } },
      { unitType: UnitType.SWORDSMAN, level: 6, count: 4 },
    ],
    isBoss: true,
    xpReward: 400,
    goldReward: 300,
    lootTable: [
      { item: ITEM_MAGIC_STAFF, chance: 1.0 },
      { item: ITEM_SPEED_RING, chance: 1.0 },
      { item: ITEM_GREATER_HEALTH_POTION, chance: 1.0 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Encounter tables by area
// ---------------------------------------------------------------------------

export const OVERWORLD_ENCOUNTERS: Record<string, string[]> = {
  grass: ["forest_wolves", "bandit_ambush", "orc_warband"],
  forest: ["forest_wolves", "goblin_patrol", "bandit_ambush", "orc_warband"],
  sand: ["bandit_ambush", "skeleton_patrol", "desert_raiders"],
  snow: ["skeleton_patrol", "goblin_patrol", "orc_warband"],
};

export const DUNGEON_ENCOUNTER_TABLES: Record<string, string[]> = {
  goblin_caves: ["dungeon_rats", "dungeon_spiders", "goblin_patrol"],
  dark_crypt: ["dungeon_undead", "skeleton_patrol", "dungeon_mages"],
  dragon_lair: ["dungeon_mages", "dungeon_undead", "dungeon_spiders"],
};
