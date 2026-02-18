// Building types, costs, shop inventories, placement rules
import { BuildingType, UnitType } from "@/types";

/** Which territory zone a building may be placed in. */
export type PlacementZone = "own" | "neutral" | "any";

export interface BuildingDef {
  type: BuildingType;
  cost: number; // gold cost (0 = starting/Castle)
  hp: number;
  shopInventory: UnitType[]; // unit types this building can train
  blueprints: BuildingType[]; // building blueprints sold from this building's shop
  footprint: { w: number; h: number };
  placementZone: PlacementZone;
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDef> = {
  [BuildingType.CASTLE]: {
    type: BuildingType.CASTLE,
    cost: 0,
    hp: 500,
    shopInventory: [UnitType.SWORDSMAN, UnitType.ARCHER],
    blueprints: [
      BuildingType.BARRACKS,
      BuildingType.STABLES,
      BuildingType.MAGE_TOWER,
      BuildingType.ARCHERY_RANGE,
    ],
    footprint: { w: 3, h: 3 },
    placementZone: "own",
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    cost: 100,
    hp: 200,
    shopInventory: [UnitType.SWORDSMAN, UnitType.PIKEMAN, UnitType.KNIGHT],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    cost: 120,
    hp: 200,
    shopInventory: [UnitType.KNIGHT],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    cost: 150,
    hp: 150,
    shopInventory: [UnitType.MAGE],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE,
    cost: 100,
    hp: 180,
    shopInventory: [UnitType.ARCHER],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
};
