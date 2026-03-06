// Enemy encounter definitions for RPG mode
import { UnitType } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";
import {
  // Consumables
  ITEM_HEALTH_POTION,
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MEGA_HEALTH_POTION,
  ITEM_FULL_RESTORE,
  ITEM_MANA_POTION,
  ITEM_GREATER_MANA_POTION,
  ITEM_GRAND_ELIXIR,
  ITEM_ANTIDOTE,
  ITEM_PHOENIX_DOWN,
  // Weapons T1–T3
  ITEM_IRON_SWORD,
  ITEM_STEEL_SWORD,
  ITEM_BATTLE_HAMMER,
  ITEM_MAGIC_STAFF,
  ITEM_RAPIER,
  ITEM_WAR_AXE,
  ITEM_FLAMEBLADE,
  ITEM_FROST_STAFF,
  ITEM_COMPOSITE_BOW,
  ITEM_MITHRIL_DAGGER,
  // Weapons T4–T5
  ITEM_DRAGONSLAYER,
  ITEM_ARCHMAGE_STAFF,
  ITEM_VOIDCLEAVER,
  ITEM_SOULREAPER,
  ITEM_EXCALIBUR,
  ITEM_RAGNAROK,
  ITEM_STAFF_OF_ETERNITY,
  // Armor
  ITEM_LEATHER_ARMOR,
  ITEM_CHAINMAIL,
  ITEM_PLATE_ARMOR,
  ITEM_MAGE_ROBES,
  ITEM_DRAGONSCALE_ARMOR,
  ITEM_SHADOW_CLOAK,
  ITEM_MYTHRIL_MAIL,
  ITEM_DIVINE_PLATE,
  // Helmets
  ITEM_LEATHER_CAP,
  ITEM_IRON_HELM,
  ITEM_STEEL_HELM,
  ITEM_WIZARD_HAT,
  ITEM_GREAT_HELM,
  ITEM_HORNED_HELM,
  ITEM_CROWN_OF_THORNS,
  ITEM_DRAGON_CROWN,
  ITEM_DIADEM_OF_STARS,
  ITEM_HELM_OF_DOMINION,
  // Shields
  ITEM_WOODEN_SHIELD,
  ITEM_IRON_SHIELD,
  ITEM_STEEL_SHIELD,
  ITEM_TOWER_SHIELD,
  ITEM_SPIKED_SHIELD,
  ITEM_INFERNAL_WARD,
  ITEM_MIRROR_SHIELD,
  // Legs
  ITEM_CHAIN_LEGGINGS,
  ITEM_STUDDED_LEGGINGS,
  ITEM_PLATE_GREAVES,
  ITEM_ENCHANTED_SKIRT,
  ITEM_DRAGON_TASSETS,
  ITEM_PHANTOM_LEGGINGS,
  ITEM_CELESTIAL_GREAVES,
  // Boots
  ITEM_LEATHER_BOOTS,
  ITEM_RANGER_BOOTS,
  ITEM_WINGED_BOOTS,
  ITEM_KNIGHTS_GREAVES,
  ITEM_SHADOWSTEP_BOOTS,
  ITEM_TITAN_STOMPERS,
  ITEM_BOOTS_OF_THE_WIND,
  // Rings
  ITEM_COPPER_RING,
  ITEM_SILVER_RING,
  ITEM_RUBY_RING,
  ITEM_SAPPHIRE_RING,
  ITEM_GOLD_RING,
  ITEM_EMERALD_RING,
  ITEM_DRAGON_RING,
  ITEM_LICH_RING,
  ITEM_BAND_OF_ETERNITY,
  // Accessories
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
  ITEM_WAR_PENDANT,
  ITEM_IRON_TALISMAN,
  ITEM_CRYSTAL_PENDANT,
  ITEM_BERSERKER_CHARM,
  ITEM_GUARDIAN_BROOCH,
  ITEM_PHOENIX_FEATHER_ACC,
  ITEM_DEMON_FANG,
  ITEM_HOLY_SYMBOL,
  ITEM_ORB_OF_DOMINION,
  ITEM_COSMIC_PENDANT,
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
  // =========================================================================
  // Overworld random encounters — easy (T1 loot)
  // =========================================================================
  forest_wolves: {
    id: "forest_wolves",
    name: "Pack of Wolves",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 1, count: 3 },
    ],
    isBoss: false,
    xpReward: 30,
    goldReward: 15,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.2 },
      { item: ITEM_LEATHER_CAP, chance: 0.08 },
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
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.15 },
      { item: ITEM_COPPER_RING, chance: 0.1 },
      { item: ITEM_WOODEN_SHIELD, chance: 0.06 },
    ],
  },
  slime_swarm: {
    id: "slime_swarm",
    name: "Slime Swarm",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 1, count: 5, overrides: { hp: 25, atk: 5, def: 1 } },
    ],
    isBoss: false,
    xpReward: 25,
    goldReward: 12,
    lootTable: [
      { item: ITEM_ANTIDOTE, chance: 0.2 },
      { item: ITEM_HEALTH_AMULET, chance: 0.06 },
    ],
  },

  // =========================================================================
  // Overworld random encounters — mid (T1–T2 loot)
  // =========================================================================
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
      { item: ITEM_WOODEN_SHIELD, chance: 0.08 },
      { item: ITEM_LEATHER_BOOTS, chance: 0.08 },
    ],
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
      { item: ITEM_LEATHER_ARMOR, chance: 0.12 },
      { item: ITEM_IRON_HELM, chance: 0.1 },
      { item: ITEM_IRON_SHIELD, chance: 0.08 },
    ],
  },
  highway_robbers: {
    id: "highway_robbers",
    name: "Highway Robbers",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 3, count: 3 },
      { unitType: UnitType.CROSSBOWMAN, level: 3, count: 1 },
    ],
    isBoss: false,
    xpReward: 65,
    goldReward: 45,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.2 },
      { item: ITEM_RAPIER, chance: 0.08 },
      { item: ITEM_SILVER_RING, chance: 0.08 },
      { item: ITEM_RANGER_BOOTS, chance: 0.06 },
    ],
  },
  wolf_pack_alpha: {
    id: "wolf_pack_alpha",
    name: "Alpha Wolf Pack",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 4, count: 4, overrides: { hp: 80, atk: 18, speed: 2.5 } },
      { unitType: UnitType.SWORDSMAN, level: 5, count: 1, overrides: { hp: 200, atk: 30, speed: 3.0 } },
    ],
    isBoss: false,
    xpReward: 85,
    goldReward: 40,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.3 },
      { item: ITEM_SPEED_RING, chance: 0.1 },
      { item: ITEM_STUDDED_LEGGINGS, chance: 0.08 },
    ],
  },

  // =========================================================================
  // Overworld random encounters — hard (T2–T3 loot)
  // =========================================================================
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
      { item: ITEM_BATTLE_HAMMER, chance: 0.1 },
      { item: ITEM_IRON_SHIELD, chance: 0.1 },
      { item: ITEM_CHAIN_LEGGINGS, chance: 0.08 },
      { item: ITEM_WAR_PENDANT, chance: 0.06 },
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
      { item: ITEM_CHAIN_LEGGINGS, chance: 0.1 },
      { item: ITEM_RUBY_RING, chance: 0.08 },
      { item: ITEM_STEEL_HELM, chance: 0.08 },
    ],
  },
  dark_knight_squad: {
    id: "dark_knight_squad",
    name: "Dark Knight Squad",
    enemies: [
      { unitType: UnitType.KNIGHT, level: 5, count: 3 },
      { unitType: UnitType.PIKEMAN, level: 5, count: 2 },
    ],
    isBoss: false,
    xpReward: 140,
    goldReward: 70,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.25 },
      { item: ITEM_STEEL_SWORD, chance: 0.12 },
      { item: ITEM_STEEL_SHIELD, chance: 0.1 },
      { item: ITEM_IRON_TALISMAN, chance: 0.08 },
      { item: ITEM_KNIGHTS_GREAVES, chance: 0.06 },
    ],
  },
  wyvern_flight: {
    id: "wyvern_flight",
    name: "Wyvern Flight",
    enemies: [
      { unitType: UnitType.ARCHER, level: 6, count: 3, overrides: { hp: 150, atk: 25, speed: 3.0 } },
    ],
    isBoss: false,
    xpReward: 150,
    goldReward: 75,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.3 },
      { item: ITEM_WINGED_BOOTS, chance: 0.1 },
      { item: ITEM_COMPOSITE_BOW, chance: 0.08 },
      { item: ITEM_EMERALD_RING, chance: 0.06 },
    ],
  },
  warlock_coven: {
    id: "warlock_coven",
    name: "Warlock Coven",
    enemies: [
      { unitType: UnitType.FIRE_MAGE, level: 5, count: 3 },
      { unitType: UnitType.NECROMANCER, level: 5, count: 1, overrides: { hp: 200, atk: 22 } },
    ],
    isBoss: false,
    xpReward: 160,
    goldReward: 80,
    lootTable: [
      { item: ITEM_GREATER_MANA_POTION, chance: 0.25 },
      { item: ITEM_FROST_STAFF, chance: 0.1 },
      { item: ITEM_WIZARD_HAT, chance: 0.1 },
      { item: ITEM_MAGE_ROBES, chance: 0.06 },
      { item: ITEM_SAPPHIRE_RING, chance: 0.08 },
    ],
  },
  elite_mercenaries: {
    id: "elite_mercenaries",
    name: "Elite Mercenaries",
    enemies: [
      { unitType: UnitType.KNIGHT, level: 6, count: 2 },
      { unitType: UnitType.CROSSBOWMAN, level: 6, count: 2 },
      { unitType: UnitType.SWORDSMAN, level: 6, count: 3 },
    ],
    isBoss: false,
    xpReward: 180,
    goldReward: 90,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.3 },
      { item: ITEM_MITHRIL_DAGGER, chance: 0.08 },
      { item: ITEM_PLATE_ARMOR, chance: 0.06 },
      { item: ITEM_GREAT_HELM, chance: 0.06 },
      { item: ITEM_SPIKED_SHIELD, chance: 0.06 },
      { item: ITEM_BERSERKER_CHARM, chance: 0.05 },
    ],
  },

  // =========================================================================
  // Dungeon encounters — T1–T2 loot
  // =========================================================================
  dungeon_rats: {
    id: "dungeon_rats",
    name: "Giant Rats",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 2, count: 4, overrides: { hp: 40, atk: 8 } },
    ],
    isBoss: false,
    xpReward: 35,
    goldReward: 10,
    lootTable: [
      { item: ITEM_HEALTH_POTION, chance: 0.15 },
      { item: ITEM_LEATHER_BOOTS, chance: 0.06 },
    ],
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
      { item: ITEM_SPEED_RING, chance: 0.12 },
      { item: ITEM_RANGER_BOOTS, chance: 0.08 },
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
      { item: ITEM_CHAINMAIL, chance: 0.12 },
      { item: ITEM_IRON_SHIELD, chance: 0.1 },
      { item: ITEM_STUDDED_LEGGINGS, chance: 0.08 },
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
      { item: ITEM_GREATER_MANA_POTION, chance: 0.2 },
      { item: ITEM_MAGIC_STAFF, chance: 0.12 },
      { item: ITEM_WIZARD_HAT, chance: 0.08 },
      { item: ITEM_SAPPHIRE_RING, chance: 0.06 },
    ],
  },

  // =========================================================================
  // Dungeon encounters — hard (T2–T3 loot)
  // =========================================================================
  dungeon_golems: {
    id: "dungeon_golems",
    name: "Stone Golems",
    enemies: [
      { unitType: UnitType.TROLL, level: 5, count: 2, overrides: { hp: 300, atk: 25, def: 15 } },
    ],
    isBoss: false,
    xpReward: 130,
    goldReward: 60,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.25 },
      { item: ITEM_TOWER_SHIELD, chance: 0.1 },
      { item: ITEM_PLATE_GREAVES, chance: 0.08 },
      { item: ITEM_GUARDIAN_BROOCH, chance: 0.06 },
    ],
  },
  dungeon_vampires: {
    id: "dungeon_vampires",
    name: "Vampire Nest",
    enemies: [
      { unitType: UnitType.SWORDSMAN, level: 6, count: 3, overrides: { hp: 180, atk: 28, speed: 2.8 } },
    ],
    isBoss: false,
    xpReward: 140,
    goldReward: 65,
    lootTable: [
      { item: ITEM_GREATER_HEALTH_POTION, chance: 0.25 },
      { item: ITEM_MITHRIL_DAGGER, chance: 0.1 },
      { item: ITEM_HORNED_HELM, chance: 0.08 },
      { item: ITEM_GOLD_RING, chance: 0.06 },
    ],
  },
  dungeon_demon_guard: {
    id: "dungeon_demon_guard",
    name: "Demon Guard",
    enemies: [
      { unitType: UnitType.KNIGHT, level: 7, count: 2, overrides: { hp: 250, atk: 35, def: 18 } },
      { unitType: UnitType.FIRE_MAGE, level: 7, count: 2, overrides: { hp: 150, atk: 30 } },
    ],
    isBoss: false,
    xpReward: 180,
    goldReward: 85,
    lootTable: [
      { item: ITEM_MEGA_HEALTH_POTION, chance: 0.2 },
      { item: ITEM_FLAMEBLADE, chance: 0.08 },
      { item: ITEM_PLATE_ARMOR, chance: 0.06 },
      { item: ITEM_SPIKED_SHIELD, chance: 0.06 },
      { item: ITEM_ENCHANTED_SKIRT, chance: 0.06 },
    ],
  },
  dungeon_lich_servants: {
    id: "dungeon_lich_servants",
    name: "Lich Servants",
    enemies: [
      { unitType: UnitType.NECROMANCER, level: 7, count: 2, overrides: { hp: 200, atk: 25 } },
      { unitType: UnitType.SWORDSMAN, level: 6, count: 4 },
    ],
    isBoss: false,
    xpReward: 170,
    goldReward: 80,
    lootTable: [
      { item: ITEM_GREATER_MANA_POTION, chance: 0.25 },
      { item: ITEM_FROST_STAFF, chance: 0.08 },
      { item: ITEM_MAGE_ROBES, chance: 0.06 },
      { item: ITEM_CRYSTAL_PENDANT, chance: 0.05 },
    ],
  },

  // =========================================================================
  // Bosses — T3 guaranteed + T4 chance
  // =========================================================================
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
      { item: ITEM_GREAT_HELM, chance: 0.5 },
      { item: ITEM_SOULREAPER, chance: 0.3 },
      { item: ITEM_CROWN_OF_THORNS, chance: 0.25 },
      { item: ITEM_TITAN_STOMPERS, chance: 0.2 },
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
      { item: ITEM_DRAGONSLAYER, chance: 0.5 },
      { item: ITEM_DRAGONSCALE_ARMOR, chance: 0.4 },
      { item: ITEM_DRAGON_CROWN, chance: 0.4 },
      { item: ITEM_DRAGON_TASSETS, chance: 0.35 },
      { item: ITEM_DRAGON_RING, chance: 0.35 },
      { item: ITEM_MEGA_HEALTH_POTION, chance: 1.0 },
      { item: ITEM_PHOENIX_DOWN, chance: 1.0 },
      { item: ITEM_PHOENIX_FEATHER_ACC, chance: 0.3 },
      { item: ITEM_WINGED_BOOTS, chance: 0.5 },
      // T5 rare
      { item: ITEM_EXCALIBUR, chance: 0.08 },
      { item: ITEM_MYTHRIL_MAIL, chance: 0.08 },
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
      { item: ITEM_ARCHMAGE_STAFF, chance: 0.5 },
      { item: ITEM_SHADOW_CLOAK, chance: 0.4 },
      { item: ITEM_LICH_RING, chance: 0.4 },
      { item: ITEM_PHANTOM_LEGGINGS, chance: 0.35 },
      { item: ITEM_DIADEM_OF_STARS, chance: 0.3 },
      { item: ITEM_MEGA_HEALTH_POTION, chance: 1.0 },
      { item: ITEM_SPEED_RING, chance: 1.0 },
      { item: ITEM_DEMON_FANG, chance: 0.3 },
      // T5 rare
      { item: ITEM_STAFF_OF_ETERNITY, chance: 0.08 },
      { item: ITEM_COSMIC_PENDANT, chance: 0.06 },
    ],
  },
  boss_demon_lord: {
    id: "boss_demon_lord",
    name: "Demon Lord Azgaroth",
    enemies: [
      { unitType: UnitType.KNIGHT, level: 14, count: 1, overrides: { hp: 2000, atk: 90, def: 30 } },
      { unitType: UnitType.FIRE_MAGE, level: 10, count: 2, overrides: { hp: 400, atk: 40 } },
      { unitType: UnitType.SWORDSMAN, level: 8, count: 3 },
    ],
    isBoss: true,
    xpReward: 700,
    goldReward: 500,
    lootTable: [
      { item: ITEM_VOIDCLEAVER, chance: 0.5 },
      { item: ITEM_INFERNAL_WARD, chance: 0.4 },
      { item: ITEM_DEMON_FANG, chance: 0.5 },
      { item: ITEM_SHADOWSTEP_BOOTS, chance: 0.35 },
      { item: ITEM_CROWN_OF_THORNS, chance: 0.4 },
      { item: ITEM_FULL_RESTORE, chance: 1.0 },
      { item: ITEM_PHOENIX_DOWN, chance: 1.0 },
      { item: ITEM_HOLY_SYMBOL, chance: 0.3 },
      // T5 rare
      { item: ITEM_RAGNAROK, chance: 0.1 },
      { item: ITEM_DIVINE_PLATE, chance: 0.08 },
      { item: ITEM_ORB_OF_DOMINION, chance: 0.06 },
    ],
  },
  boss_ancient_wyrm: {
    id: "boss_ancient_wyrm",
    name: "Ancient Wyrm",
    enemies: [
      { unitType: UnitType.RED_DRAGON, level: 15, count: 1, overrides: { hp: 2500, atk: 100, def: 35 } },
      { unitType: UnitType.RED_DRAGON, level: 8, count: 2, overrides: { hp: 500, atk: 40 } },
    ],
    isBoss: true,
    xpReward: 900,
    goldReward: 600,
    lootTable: [
      { item: ITEM_DRAGONSLAYER, chance: 1.0 },
      { item: ITEM_DRAGONSCALE_ARMOR, chance: 0.6 },
      { item: ITEM_DRAGON_CROWN, chance: 0.5 },
      { item: ITEM_DRAGON_TASSETS, chance: 0.5 },
      { item: ITEM_DRAGON_RING, chance: 0.5 },
      { item: ITEM_FULL_RESTORE, chance: 1.0 },
      { item: ITEM_GRAND_ELIXIR, chance: 1.0 },
      { item: ITEM_PHOENIX_DOWN, chance: 1.0 },
      // T5
      { item: ITEM_EXCALIBUR, chance: 0.15 },
      { item: ITEM_MYTHRIL_MAIL, chance: 0.15 },
      { item: ITEM_BOOTS_OF_THE_WIND, chance: 0.12 },
      { item: ITEM_MIRROR_SHIELD, chance: 0.12 },
      { item: ITEM_BAND_OF_ETERNITY, chance: 0.1 },
    ],
  },
  boss_final: {
    id: "boss_final",
    name: "The Dark One",
    enemies: [
      { unitType: UnitType.NECROMANCER, level: 18, count: 1, overrides: { hp: 3500, atk: 120, def: 40 } },
      { unitType: UnitType.KNIGHT, level: 12, count: 2, overrides: { hp: 600, atk: 50, def: 25 } },
      { unitType: UnitType.FIRE_MAGE, level: 12, count: 2, overrides: { hp: 400, atk: 55 } },
    ],
    isBoss: true,
    xpReward: 1200,
    goldReward: 800,
    lootTable: [
      // Guaranteed T5
      { item: ITEM_GRAND_ELIXIR, chance: 1.0 },
      { item: ITEM_FULL_RESTORE, chance: 1.0 },
      { item: ITEM_PHOENIX_DOWN, chance: 1.0 },
      // T5 — high chance from final boss
      { item: ITEM_EXCALIBUR, chance: 0.3 },
      { item: ITEM_RAGNAROK, chance: 0.3 },
      { item: ITEM_STAFF_OF_ETERNITY, chance: 0.3 },
      { item: ITEM_DIVINE_PLATE, chance: 0.25 },
      { item: ITEM_MYTHRIL_MAIL, chance: 0.25 },
      { item: ITEM_HELM_OF_DOMINION, chance: 0.25 },
      { item: ITEM_MIRROR_SHIELD, chance: 0.2 },
      { item: ITEM_CELESTIAL_GREAVES, chance: 0.2 },
      { item: ITEM_BOOTS_OF_THE_WIND, chance: 0.2 },
      { item: ITEM_BAND_OF_ETERNITY, chance: 0.2 },
      { item: ITEM_ORB_OF_DOMINION, chance: 0.2 },
      { item: ITEM_COSMIC_PENDANT, chance: 0.15 },
      { item: ITEM_DIADEM_OF_STARS, chance: 0.2 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Encounter tables by area
// ---------------------------------------------------------------------------

export const OVERWORLD_ENCOUNTERS: Record<string, string[]> = {
  grass: ["forest_wolves", "slime_swarm", "bandit_ambush", "orc_warband"],
  forest: ["forest_wolves", "goblin_patrol", "bandit_ambush", "wolf_pack_alpha", "orc_warband"],
  sand: ["bandit_ambush", "skeleton_patrol", "desert_raiders", "highway_robbers"],
  snow: ["skeleton_patrol", "goblin_patrol", "orc_warband", "dark_knight_squad", "wyvern_flight"],
  mountain: ["dark_knight_squad", "wyvern_flight", "elite_mercenaries", "warlock_coven"],
};

export const DUNGEON_ENCOUNTER_TABLES: Record<string, string[]> = {
  goblin_caves: ["dungeon_rats", "dungeon_spiders", "goblin_patrol"],
  dark_crypt: ["dungeon_undead", "skeleton_patrol", "dungeon_mages", "dungeon_lich_servants"],
  dragon_lair: ["dungeon_mages", "dungeon_undead", "dungeon_demon_guard", "dungeon_vampires"],
  demon_fortress: ["dungeon_demon_guard", "dungeon_vampires", "dungeon_golems", "dungeon_lich_servants"],
};
