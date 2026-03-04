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
  GRANARY = "granary",
  LIBRARY = "library",
  MARKETPLACE = "marketplace",
  CITY_WALLS = "city_walls",
  WORKSHOP = "workshop",
  AQUEDUCT = "aqueduct",
  MILITARY_ACADEMY = "military_academy",
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
  [WorldBuildingType.GRANARY]: {
    type: WorldBuildingType.GRANARY,
    name: "Granary",
    productionCost: 30,
    goldBonus: 0,
    foodBonus: 3,
    productionBonus: 0,
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
    effect: "-1 turn from research",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.MARKETPLACE]: {
    type: WorldBuildingType.MARKETPLACE,
    name: "Marketplace",
    productionCost: 50,
    goldBonus: 5,
    foodBonus: 0,
    productionBonus: 0,
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
    effect: "+50% population growth speed",
    unlocksUnits: [],
    researchRequired: null,
  },
  [WorldBuildingType.MILITARY_ACADEMY]: {
    type: WorldBuildingType.MILITARY_ACADEMY,
    name: "Military Academy",
    productionCost: 80,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Recruited units start veteran",
    unlocksUnits: [],
    researchRequired: null,
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
    effect: "Train melee units",
    unlocksUnits: [UnitType.SWORDSMAN, UnitType.SHIELD_BEARER, UnitType.PIKEMAN],
    researchRequired: null,
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE,
    name: "Archery Range",
    productionCost: 45,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train ranged units",
    unlocksUnits: [UnitType.ARCHER, UnitType.CROSSBOWMAN],
    researchRequired: null,
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    name: "Stables",
    productionCost: 50,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train cavalry units",
    unlocksUnits: [UnitType.KNIGHT, UnitType.QUESTING_KNIGHT],
    researchRequired: null,
  },
  [BuildingType.SIEGE_WORKSHOP]: {
    type: BuildingType.SIEGE_WORKSHOP,
    name: "Siege Workshop",
    productionCost: 60,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train siege units",
    unlocksUnits: [UnitType.CATAPULT],
    researchRequired: null,
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    name: "Mage Tower",
    productionCost: 55,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train mage units",
    unlocksUnits: [UnitType.STORM_MAGE],
    researchRequired: null,
  },
  [BuildingType.CREATURE_DEN]: {
    type: BuildingType.CREATURE_DEN,
    name: "Creature Den",
    productionCost: 50,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train creature units",
    unlocksUnits: [UnitType.WOLF],
    researchRequired: null,
  },
  [BuildingType.TEMPLE]: {
    type: BuildingType.TEMPLE,
    name: "Temple",
    productionCost: 45,
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 0,
    effect: "Train holy units",
    unlocksUnits: [UnitType.PRIEST],
    researchRequired: null,
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
