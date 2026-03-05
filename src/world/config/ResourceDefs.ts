// Resource and improvement definitions for world hex tiles.

import { TerrainType } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type ResourceType = "iron" | "horses" | "gems" | "marble" | "wheat" | "game";

export interface ResourceDef {
  type: ResourceType;
  /** Display name. */
  label: string;
  /** Bonus gold when worked. */
  goldBonus: number;
  /** Bonus food when worked. */
  foodBonus: number;
  /** Bonus production when worked. */
  productionBonus: number;
  /** Terrain types this resource can appear on. */
  validTerrain: TerrainType[];
  /** Hex color for the resource icon. */
  color: number;
}

export const RESOURCE_DEFINITIONS: Record<ResourceType, ResourceDef> = {
  iron: {
    type: "iron",
    label: "Iron",
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 2,
    validTerrain: [TerrainType.HILLS, TerrainType.MOUNTAINS],
    color: 0x889999,
  },
  horses: {
    type: "horses",
    label: "Horses",
    goldBonus: 1,
    foodBonus: 1,
    productionBonus: 0,
    validTerrain: [TerrainType.PLAINS, TerrainType.GRASSLAND],
    color: 0xcc8844,
  },
  gems: {
    type: "gems",
    label: "Gems",
    goldBonus: 3,
    foodBonus: 0,
    productionBonus: 0,
    validTerrain: [TerrainType.HILLS, TerrainType.MOUNTAINS, TerrainType.DESERT],
    color: 0x44cccc,
  },
  marble: {
    type: "marble",
    label: "Marble",
    goldBonus: 1,
    foodBonus: 0,
    productionBonus: 1,
    validTerrain: [TerrainType.PLAINS, TerrainType.HILLS],
    color: 0xdddddd,
  },
  wheat: {
    type: "wheat",
    label: "Wheat",
    goldBonus: 0,
    foodBonus: 3,
    productionBonus: 0,
    validTerrain: [TerrainType.PLAINS, TerrainType.GRASSLAND],
    color: 0xddcc44,
  },
  game: {
    type: "game",
    label: "Game",
    goldBonus: 1,
    foodBonus: 2,
    productionBonus: 0,
    validTerrain: [TerrainType.FOREST, TerrainType.SWAMP],
    color: 0x88aa44,
  },
};

// ---------------------------------------------------------------------------
// Improvements
// ---------------------------------------------------------------------------

export type ImprovementType = "farm" | "mine" | "road" | "lumber_camp";

export interface ImprovementDef {
  type: ImprovementType;
  label: string;
  goldBonus: number;
  foodBonus: number;
  productionBonus: number;
  /** Terrain types this improvement can be built on. */
  validTerrain: TerrainType[];
  /** Hex color for the improvement marker. */
  color: number;
}

export const IMPROVEMENT_DEFINITIONS: Record<ImprovementType, ImprovementDef> = {
  farm: {
    type: "farm",
    label: "Farm",
    goldBonus: 0,
    foodBonus: 2,
    productionBonus: 0,
    validTerrain: [TerrainType.PLAINS, TerrainType.GRASSLAND],
    color: 0xaadd44,
  },
  mine: {
    type: "mine",
    label: "Mine",
    goldBonus: 0,
    foodBonus: 0,
    productionBonus: 2,
    validTerrain: [TerrainType.HILLS],
    color: 0x888888,
  },
  road: {
    type: "road",
    label: "Road",
    goldBonus: 1,
    foodBonus: 0,
    productionBonus: 0,
    validTerrain: [
      TerrainType.PLAINS, TerrainType.GRASSLAND, TerrainType.FOREST,
      TerrainType.HILLS, TerrainType.DESERT, TerrainType.SWAMP,
    ],
    color: 0x999966,
  },
  lumber_camp: {
    type: "lumber_camp",
    label: "Lumber Camp",
    goldBonus: 1,
    foodBonus: 0,
    productionBonus: 1,
    validTerrain: [TerrainType.FOREST],
    color: 0x996633,
  },
};

export function getAllImprovementDefs(): ImprovementDef[] {
  return Object.values(IMPROVEMENT_DEFINITIONS);
}
