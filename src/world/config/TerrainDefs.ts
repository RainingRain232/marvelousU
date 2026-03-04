// Terrain type definitions for the world hex map.
//
// Each terrain type has movement costs, resource yields, and rendering colors.
// Yields are per-tile-per-turn when a city is working the tile.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum TerrainType {
  PLAINS    = "plains",
  GRASSLAND = "grassland",
  FOREST    = "forest",
  HILLS     = "hills",
  MOUNTAINS = "mountains",
  WATER     = "water",
  DESERT    = "desert",
  TUNDRA    = "tundra",
  SWAMP     = "swamp",
}

export interface TerrainDef {
  type: TerrainType;
  /** Movement points consumed to enter this tile. Infinity = impassable. */
  movementCost: number;
  /** Defense bonus percentage for armies on this terrain (0–50). */
  defenseBonus: number;
  /** Gold yield per turn when worked by a city. */
  goldYield: number;
  /** Production yield per turn when worked by a city. */
  productionYield: number;
  /** Food yield per turn when worked by a city. */
  foodYield: number;
  /** Can a city be founded on this terrain? */
  buildable: boolean;
  /** Fill color for hex rendering. */
  color: number;
  /** Darker border color for hex rendering. */
  borderColor: number;
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const TERRAIN_DEFINITIONS: Record<TerrainType, TerrainDef> = {
  [TerrainType.PLAINS]: {
    type: TerrainType.PLAINS,
    movementCost: 1,
    defenseBonus: 0,
    goldYield: 1,
    productionYield: 1,
    foodYield: 2,
    buildable: true,
    color: 0xc8b464,
    borderColor: 0xa89444,
  },
  [TerrainType.GRASSLAND]: {
    type: TerrainType.GRASSLAND,
    movementCost: 1,
    defenseBonus: 0,
    goldYield: 1,
    productionYield: 0,
    foodYield: 3,
    buildable: true,
    color: 0x6aaa3a,
    borderColor: 0x4a8a2a,
  },
  [TerrainType.FOREST]: {
    type: TerrainType.FOREST,
    movementCost: 2,
    defenseBonus: 25,
    goldYield: 0,
    productionYield: 2,
    foodYield: 1,
    buildable: true,
    color: 0x2d7a3a,
    borderColor: 0x1d5a2a,
  },
  [TerrainType.HILLS]: {
    type: TerrainType.HILLS,
    movementCost: 2,
    defenseBonus: 30,
    goldYield: 0,
    productionYield: 3,
    foodYield: 1,
    buildable: true,
    color: 0x8a7a4a,
    borderColor: 0x6a5a3a,
  },
  [TerrainType.MOUNTAINS]: {
    type: TerrainType.MOUNTAINS,
    movementCost: Infinity,
    defenseBonus: 50,
    goldYield: 1,
    productionYield: 1,
    foodYield: 0,
    buildable: false,
    color: 0x888888,
    borderColor: 0x666666,
  },
  [TerrainType.WATER]: {
    type: TerrainType.WATER,
    movementCost: Infinity,
    defenseBonus: 0,
    goldYield: 0,
    productionYield: 0,
    foodYield: 2,
    buildable: false,
    color: 0x3366aa,
    borderColor: 0x224488,
  },
  [TerrainType.DESERT]: {
    type: TerrainType.DESERT,
    movementCost: 1,
    defenseBonus: 0,
    goldYield: 0,
    productionYield: 0,
    foodYield: 0,
    buildable: true,
    color: 0xd4b866,
    borderColor: 0xb49846,
  },
  [TerrainType.TUNDRA]: {
    type: TerrainType.TUNDRA,
    movementCost: 2,
    defenseBonus: 0,
    goldYield: 0,
    productionYield: 0,
    foodYield: 1,
    buildable: false,
    color: 0xaabbcc,
    borderColor: 0x8899aa,
  },
  [TerrainType.SWAMP]: {
    type: TerrainType.SWAMP,
    movementCost: 2,
    defenseBonus: 10,
    goldYield: 0,
    productionYield: 0,
    foodYield: 1,
    buildable: true,
    color: 0x5a7a4a,
    borderColor: 0x3a5a2a,
  },
};
