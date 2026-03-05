// World mode building definitions.
//
// Cities can build both existing game buildings (Barracks, Mage Tower, etc.)
// and new civ-style buildings (Granary, Library, etc.).
//
// Production costs are in "production points" accumulated per turn, not gold.
// Some buildings also have a gold cost for immediate purchase.

import { BuildingType, UnitType } from "@/types";

// ---------------------------------------------------------------------------
// World building IDs (for civ-style buildings not in the base game)
// ---------------------------------------------------------------------------

/** Civ-style building identifiers. These extend the concept of BuildingType. */
export enum WorldBuildingType {
  CASTLE = "castle",
  GRANARY = "granary",
  LIBRARY = "library",
  MARKETPLACE = "marketplace",
  CITY_WALLS = "city_walls",
  WORKSHOP = "workshop",
  AQUEDUCT = "aqueduct",
  MILITARY_ACADEMY = "military_academy",
  SHIPWRIGHT = "shipwright",
}

// ---------------------------------------------------------------------------
// World building definition
// ---------------------------------------------------------------------------

export interface WorldBuildingDef {
  type: string; // WorldBuildingType or BuildingType
  name: string;
  /** Production points needed to complete. */
  productionCost: number;
  /** Per-turn yield bonuses when built. */
  goldBonus: number;
  foodBonus: number;
  productionBonus: number;
  manaBonus: number;
  scienceBonus: number;
  /** Descriptive effect text. */
  effect: string;
  /** Unit types this building unlocks for recruitment (empty = none). */
  unlocksUnits: string[];
  /** Research prerequisite (null = none). */
  researchRequired: string | null;
}

// ---------------------------------------------------------------------------
// Definitions — Civ-style buildings
// ---------------------------------------------------------------------------

export const WORLD_BUILDING_DEFS: Record<string, WorldBuildingDef> = {
  [WorldBuildingType.CASTLE]: {
    type: WorldBuildingType.CASTLE,
    name: "Castle",
    productionCost: 0,
    goldBonus: 2000,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 10,
    scienceBonus: 10,
    effect: "+2000 gold, +10 mana, +10 research/turn",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.GRANARY]: {
    type: WorldBuildingType.GRANARY,
    name: "Granary",
    productionCost: 30,
    goldBonus: 0,
    foodBonus: 3,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "+3 food/turn",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.LIBRARY]: {
    type: WorldBuildingType.LIBRARY,
    name: "Library",
    productionCost: 40,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "-1 turn from research",
    unlocksUnits: [],
    researchRequired: "scholarship",
  },
  [WorldBuildingType.MARKETPLACE]: {
    type: WorldBuildingType.MARKETPLACE,
    name: "Marketplace",
    productionCost: 50,
    goldBonus: 5,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "+5 gold/turn",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.CITY_WALLS]: {
    type: WorldBuildingType.CITY_WALLS,
    name: "City Walls",
    productionCost: 60,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "+50% city defense in sieges",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.WORKSHOP]: {
    type: WorldBuildingType.WORKSHOP,
    name: "Workshop",
    productionCost: 50,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 3,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "+3 production/turn",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.AQUEDUCT]: {
    type: WorldBuildingType.AQUEDUCT,
    name: "Aqueduct",
    productionCost: 70,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "+50% population growth speed",
    unlocksUnits: [],
    researchRequired: "industrialization",
  },
  [WorldBuildingType.MILITARY_ACADEMY]: {
    type: WorldBuildingType.MILITARY_ACADEMY,
    name: "Military Academy",
    productionCost: 80,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Recruited units start veteran",
    unlocksUnits: [],
    researchRequired: "industrialization",
  },
  [WorldBuildingType.SHIPWRIGHT]: {
    type: WorldBuildingType.SHIPWRIGHT,
    name: "Shipwright",
    productionCost: 65,
    goldBonus: 1,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Armies can embark and cross water tiles",
    unlocksUnits: [],
    researchRequired: "sea_travel",
  },
};

// ---------------------------------------------------------------------------
// Game building → world building mapping
// ---------------------------------------------------------------------------

/** Maps existing game BuildingTypes to world building defs for city construction. */
export const GAME_BUILDING_WORLD_DEFS: Record<string, WorldBuildingDef> = {
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    name: "Barracks",
    productionCost: 40,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train melee units",
    unlocksUnits: [
      UnitType.SWORDSMAN, UnitType.PIKEMAN, UnitType.ASSASSIN, UnitType.MAGE_HUNTER,
      UnitType.GLADIATOR, UnitType.DEFENDER, UnitType.PHALANX, UnitType.ROYAL_PHALANX,
      UnitType.ROYAL_DEFENDER, UnitType.AXEMAN, UnitType.BERSERKER,
      UnitType.ANCIENT_DEFENDER, UnitType.ANCIENT_PHALANX, UnitType.ANCIENT_AXEMAN,
      UnitType.ELDER_DEFENDER, UnitType.ELDER_PHALANX, UnitType.ELDER_AXEMAN,
    ],
    researchRequired: null,
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE,
    name: "Archery Range",
    productionCost: 45,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train ranged units",
    unlocksUnits: [
      UnitType.ARCHER, UnitType.CROSSBOWMAN, UnitType.LONGBOWMAN, UnitType.REPEATER,
      UnitType.JAVELINEER, UnitType.ARBALESTIER,
      UnitType.ANCIENT_ARCHER, UnitType.ANCIENT_LONGBOWMAN, UnitType.ANCIENT_CROSSBOWMAN,
    ],
    researchRequired: null,
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    name: "Stables",
    productionCost: 50,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train cavalry units",
    unlocksUnits: [
      UnitType.KNIGHT, UnitType.QUESTING_KNIGHT, UnitType.SIEGE_HUNTER, UnitType.HORSE_ARCHER,
      UnitType.SCOUT_CAVALRY, UnitType.LANCER, UnitType.ELITE_LANCER,
      UnitType.KNIGHT_LANCER, UnitType.ROYAL_LANCER,
    ],
    researchRequired: "horsemanship",
  },
  [BuildingType.SIEGE_WORKSHOP]: {
    type: BuildingType.SIEGE_WORKSHOP,
    name: "Siege Workshop",
    productionCost: 60,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train siege units",
    unlocksUnits: [
      UnitType.BALLISTA, UnitType.BATTERING_RAM, UnitType.BOLT_THROWER,
      UnitType.CATAPULT, UnitType.SIEGE_CATAPULT, UnitType.TREBUCHET,
      UnitType.WAR_WAGON, UnitType.BOMBARD,
    ],
    researchRequired: "engineering",
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    name: "Mage Tower",
    productionCost: 55,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train mage units",
    unlocksUnits: [
      UnitType.FIRE_MAGE, UnitType.STORM_MAGE, UnitType.COLD_MAGE, UnitType.DISTORTION_MAGE,
      UnitType.FIRE_ADEPT_MAGE, UnitType.COLD_ADEPT_MAGE,
      UnitType.LIGHTNING_ADEPT_MAGE, UnitType.DISTORTION_ADEPT_MAGE,
      UnitType.FIRE_MASTER_MAGE, UnitType.COLD_MASTER_MAGE,
      UnitType.LIGHTNING_MASTER_MAGE, UnitType.DISTORTION_MASTER_MAGE,
      UnitType.SUMMONER, UnitType.CONSTRUCTIONIST, UnitType.DARK_SAVANT,
    ],
    researchRequired: "arcane_study",
  },
  [BuildingType.CREATURE_DEN]: {
    type: BuildingType.CREATURE_DEN,
    name: "Creature Den",
    productionCost: 50,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train creature units",
    unlocksUnits: [
      UnitType.SPIDER, UnitType.VOID_SNAIL, UnitType.FAERY_QUEEN, UnitType.GIANT_FROG,
      UnitType.DEVOURER, UnitType.RED_DRAGON, UnitType.FROST_DRAGON, UnitType.CYCLOPS,
      UnitType.TROLL, UnitType.BAT, UnitType.VAMPIRE_BAT, UnitType.RHINO, UnitType.PIXIE,
      UnitType.FIRE_IMP, UnitType.ICE_IMP, UnitType.LIGHTNING_IMP, UnitType.DISTORTION_IMP,
      UnitType.MINOR_FIRE_ELEMENTAL, UnitType.MINOR_ICE_ELEMENTAL,
      UnitType.MINOR_LIGHTNING_ELEMENTAL, UnitType.MINOR_DISTORTION_ELEMENTAL,
      UnitType.FIRE_ELEMENTAL, UnitType.ICE_ELEMENTAL,
      UnitType.LIGHTNING_ELEMENTAL, UnitType.DISTORTION_ELEMENTAL,
      UnitType.MINOR_EARTH_ELEMENTAL, UnitType.EARTH_ELEMENTAL,
    ],
    researchRequired: "conjuration",
  },
  [BuildingType.TEMPLE]: {
    type: BuildingType.TEMPLE,
    name: "Temple",
    productionCost: 45,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train holy units",
    unlocksUnits: [
      UnitType.MONK, UnitType.CLERIC, UnitType.SAINT, UnitType.TEMPLAR, UnitType.ANGEL,
    ],
    researchRequired: "divine_blessing",
  },
  [BuildingType.FACTION_HALL]: {
    type: BuildingType.FACTION_HALL,
    name: "Faction Hall",
    productionCost: 70,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train faction-exclusive units",
    unlocksUnits: [], // populated at runtime based on player race
    researchRequired: "divine_blessing",
  },
  [BuildingType.EMBASSY]: {
    type: BuildingType.EMBASSY,
    name: "Embassy",
    productionCost: 55,
    goldBonus: 3,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train diplomats and deploy settlers",
    unlocksUnits: [UnitType.DIPLOMAT],
    researchRequired: null,
  },
  [BuildingType.ELITE_BARRACKS]: {
    type: BuildingType.ELITE_BARRACKS,
    name: "Elite Barracks",
    productionCost: 90,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train elite melee units",
    unlocksUnits: [UnitType.ROYAL_GUARD, UnitType.GIANT_WARRIOR],
    researchRequired: "mithril_forging",
  },
  [BuildingType.ELITE_ARCHERY_RANGE]: {
    type: BuildingType.ELITE_ARCHERY_RANGE,
    name: "Elite Archery Range",
    productionCost: 90,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train elite ranged units",
    unlocksUnits: [
      UnitType.ELDER_ARCHER, UnitType.ELDER_REPEATER, UnitType.ELDER_JAVELINEER,
      UnitType.MARKSMAN, UnitType.GIANT_ARCHER,
    ],
    researchRequired: "mithril_forging",
  },
  [BuildingType.ELITE_SIEGE_WORKSHOP]: {
    type: BuildingType.ELITE_SIEGE_WORKSHOP,
    name: "Elite Siege Workshop",
    productionCost: 90,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train elite siege units",
    unlocksUnits: [UnitType.SIEGE_TOWER, UnitType.HELLFIRE_MORTAR, UnitType.CANNON, UnitType.GIANT_SIEGE],
    researchRequired: "heavy_artillery",
  },
  [BuildingType.ELITE_MAGE_TOWER]: {
    type: BuildingType.ELITE_MAGE_TOWER,
    name: "Elite Mage Tower",
    productionCost: 90,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train elite mage units",
    unlocksUnits: [UnitType.BATTLEMAGE, UnitType.GIANT_MAGE],
    researchRequired: "archmage_arts",
  },
  [BuildingType.ELITE_STABLES]: {
    type: BuildingType.ELITE_STABLES,
    name: "Elite Stables",
    productionCost: 90,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train elite cavalry units",
    unlocksUnits: [UnitType.ELDER_HORSE_ARCHER, UnitType.CATAPHRACT, UnitType.GIANT_CAVALRY],
    researchRequired: "mithril_forging",
  },
  [BuildingType.ELITE_HALL]: {
    type: BuildingType.ELITE_HALL,
    name: "Elite Hall",
    productionCost: 100,
    goldBonus: 5,
    foodBonus: 0,
    productionBonus: 0,
    manaBonus: 0,
    scienceBonus: 0,
    effect: "Train heroes, unlocks elite buildings",
    unlocksUnits: [UnitType.HERO],
    researchRequired: "mithril_forging",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all buildable buildings for a city (civ + game buildings). */
export function getAllWorldBuildingDefs(): WorldBuildingDef[] {
  return [
    ...Object.values(WORLD_BUILDING_DEFS),
    ...Object.values(GAME_BUILDING_WORLD_DEFS),
  ];
}

/** Look up a world building def by type key. */
export function getWorldBuildingDef(type: string): WorldBuildingDef | null {
  return WORLD_BUILDING_DEFS[type] ?? GAME_BUILDING_WORLD_DEFS[type] ?? null;
}
