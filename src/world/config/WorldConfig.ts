// World mode balance constants and configuration.

import { TerrainType } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// World game settings (chosen at game start)
// ---------------------------------------------------------------------------

export interface WorldGameSettings {
  /** Hex radius of the map (total hexes ≈ 3r²+3r+1). */
  mapRadius: number;
  /** Number of human + AI players. */
  numPlayers: number;
  /** Number of AI-controlled players. */
  numAIPlayers: number;
  /** RNG seed for map generation (0 = random). */
  seed: number;
}

export const DEFAULT_WORLD_SETTINGS: WorldGameSettings = {
  mapRadius: 15,
  numPlayers: 2,
  numAIPlayers: 1,
  seed: 0,
};

// ---------------------------------------------------------------------------
// Balance constants
// ---------------------------------------------------------------------------

export const WorldBalance = {
  // -- Rendering --
  /** Hex size in pixels (center to corner). */
  HEX_SIZE: 32,

  // -- City --
  /** Hexes around city that count as territory at population 1. */
  BASE_CITY_TERRITORY_RADIUS: 2,
  /** Maximum territory radius at high population. */
  MAX_CITY_TERRITORY_RADIUS: 3,
  /** Population threshold to expand territory to max radius. */
  TERRITORY_EXPAND_POP: 6,
  /** Food consumed per population per turn. */
  FOOD_PER_POPULATION: 2,
  /** Food needed for the first population growth. */
  FOOD_FOR_GROWTH_BASE: 15,
  /** Additional food needed per existing population level. */
  FOOD_FOR_GROWTH_SCALE: 8,
  /** Starting population for a new city. */
  STARTING_POPULATION: 1,
  /** Base production points per turn for a city (before tile yields). */
  BASE_PRODUCTION: 2,
  /** Base gold income per turn for a city. */
  BASE_GOLD_INCOME: 3,

  // -- Army --
  /** Default movement points per turn for an army. */
  BASE_MOVEMENT_POINTS: 3,
  /** Unit recruitment delay in turns (1 = available next turn). */
  RECRUITMENT_DELAY_TURNS: 1,

  // -- Economy --
  /** Starting gold for each player. */
  STARTING_GOLD: 1000,
  /** Starting food for each player. */
  STARTING_FOOD: 20,
  /** Gold maintenance cost per unit per turn. */
  ARMY_MAINTENANCE_PER_UNIT: 1,

  // -- Map generation --
  /** Terrain weight distribution for procedural generation. */
  TERRAIN_WEIGHTS: {
    [TerrainType.PLAINS]:    30,
    [TerrainType.GRASSLAND]: 25,
    [TerrainType.FOREST]:    15,
    [TerrainType.HILLS]:     12,
    [TerrainType.MOUNTAINS]:  5,
    [TerrainType.WATER]:      8,
    [TerrainType.DESERT]:     3,
    [TerrainType.TUNDRA]:     1,
    [TerrainType.SWAMP]:      1,
  } as Record<TerrainType, number>,

  /** Number of neutral city-states on the map. */
  NEUTRAL_CITY_COUNT: 3,

  // -- Settlers --
  /** Gold cost to recruit a settler. */
  SETTLER_COST: 250,
  /** Minimum hex distance between cities. */
  MIN_CITY_DISTANCE: 4,
} as const;
