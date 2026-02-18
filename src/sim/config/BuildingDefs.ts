// Building types, costs, shop inventories, placement rules
import { BuildingType, UnitType } from "@/types";

export interface BuildingDef {
  type:          BuildingType;
  cost:          number;
  hp:            number;
  shopInventory: UnitType[];
  footprint:     { w: number; h: number };
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDef> = {
  [BuildingType.CASTLE]: {
    type: BuildingType.CASTLE, cost: 0, hp: 500,
    shopInventory: [UnitType.SWORDSMAN, UnitType.ARCHER],
    footprint: { w: 3, h: 3 },
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS, cost: 100, hp: 200,
    shopInventory: [UnitType.SWORDSMAN, UnitType.PIKEMAN, UnitType.KNIGHT],
    footprint: { w: 2, h: 2 },
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES, cost: 120, hp: 200,
    shopInventory: [UnitType.KNIGHT],
    footprint: { w: 2, h: 2 },
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER, cost: 150, hp: 150,
    shopInventory: [UnitType.MAGE],
    footprint: { w: 2, h: 2 },
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE, cost: 100, hp: 180,
    shopInventory: [UnitType.ARCHER],
    footprint: { w: 2, h: 2 },
  },
};
