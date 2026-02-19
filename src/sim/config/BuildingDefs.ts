// Building types, costs, shop inventories, placement rules
import { BuildingType, UnitType } from "@/types";

/** Which territory zone a building may be placed in. */
export type PlacementZone = "own" | "neutral" | "any";

export interface BuildingDef {
  type: BuildingType;
  cost: number; // gold cost (0 = starting/Castle)
  hp: number;
  goldIncome: number; // additional gold/sec this building contributes when owned/captured
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
    goldIncome: 2,
    shopInventory: [UnitType.SWORDSMAN, UnitType.ARCHER],
    blueprints: [
      BuildingType.BARRACKS,
      BuildingType.STABLES,
      BuildingType.MAGE_TOWER,
      BuildingType.ARCHERY_RANGE,
      BuildingType.SIEGE_WORKSHOP,
    ],
    footprint: { w: 3, h: 3 },
    placementZone: "own",
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    cost: 100,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.SWORDSMAN, UnitType.PIKEMAN, UnitType.KNIGHT],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    cost: 120,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.KNIGHT],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    cost: 150,
    hp: 150,
    goldIncome: 2,
    shopInventory: [UnitType.MAGE],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE,
    cost: 100,
    hp: 180,
    goldIncome: 1,
    shopInventory: [UnitType.ARCHER],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.SIEGE_WORKSHOP]: {
    type: BuildingType.SIEGE_WORKSHOP,
    cost: 150,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.BATTERING_RAM],
    blueprints: [],
    footprint: { w: 2, h: 3 },
    placementZone: "own",
  },
};
