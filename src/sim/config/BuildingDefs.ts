// Building types, costs, shop inventories, placement rules
import { BuildingType, UnitType } from "@/types";
import type { BuildingTurret } from "@sim/entities/Building";

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
  /** If true, enemy units can recapture this building even after it is owned. */
  capturable?: boolean;
  /** Turrets the building starts with (omit attackTimer/targetId — set to 0/null at spawn). */
  defaultTurrets?: Omit<BuildingTurret, "attackTimer" | "targetId">[];
  /** Maximum number of this building type a single player may own at once. */
  maxCount?: number;
  /** Blueprint is only purchasable once the player owns at least minCount of the given type. */
  prerequisite?: { type: BuildingType; minCount: number };
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
      BuildingType.CREATURE_DEN,
      BuildingType.TOWER,
      BuildingType.FARM,
      BuildingType.HAMLET,
    ],
    footprint: { w: 3, h: 3 },
    placementZone: "own",
    defaultTurrets: [
      { projectileTag: "arrow", damage: 12, range: 6, attackSpeed: 1.0 },
    ],
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    cost: 100,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.SWORDSMAN, UnitType.PIKEMAN, UnitType.KNIGHT, UnitType.MAGE_HUNTER, UnitType.GLADIATOR],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    cost: 120,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.KNIGHT, UnitType.SIEGE_HUNTER],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    cost: 150,
    hp: 150,
    goldIncome: 2,
    shopInventory: [UnitType.FIRE_MAGE, UnitType.STORM_MAGE, UnitType.SUMMONER, UnitType.COLD_MAGE],
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
  [BuildingType.TOWN]: {
    type: BuildingType.TOWN,
    cost: 0,
    hp: 200,
    goldIncome: 3,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "neutral",
    capturable: true,
  },
  [BuildingType.CREATURE_DEN]: {
    type: BuildingType.CREATURE_DEN,
    cost: 130,
    hp: 200,
    goldIncome: 1,
    shopInventory: [UnitType.SPIDER],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
  },
  [BuildingType.TOWER]: {
    type: BuildingType.TOWER,
    cost: 80,
    hp: 250,
    goldIncome: 0,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 1, h: 1 },
    placementZone: "own",
    capturable: true,
    defaultTurrets: [
      { projectileTag: "arrow", damage: 9, range: 6, attackSpeed: 1.0 },
    ],
  },
  [BuildingType.FARM]: {
    type: BuildingType.FARM,
    cost: 120,
    hp: 150,
    goldIncome: 3,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    capturable: true,
    maxCount: 5,
  },
  [BuildingType.HAMLET]: {
    type: BuildingType.HAMLET,
    cost: 200,
    hp: 200,
    goldIncome: 5,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    maxCount: 1,
    prerequisite: { type: BuildingType.FARM, minCount: 5 },
  },
};
