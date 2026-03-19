// ---------------------------------------------------------------------------
// Caesar – Building definitions
// ---------------------------------------------------------------------------

import { CaesarResourceType } from "./CaesarResourceDefs";
import { CB } from "./CaesarBalance";

export enum CaesarBuildingType {
  // Housing
  HOUSING = "housing",

  // Infrastructure
  ROAD = "road",
  WELL = "well",

  // Food production
  FARM = "farm",
  MILL = "mill",
  BAKERY = "bakery",
  BUTCHER = "butcher",

  // Food distribution
  GRANARY = "granary",
  MARKET = "market",

  // Industry
  LUMBER_CAMP = "lumber_camp",
  QUARRY = "quarry",
  IRON_MINE = "iron_mine",
  BLACKSMITH = "blacksmith",
  WEAVER = "weaver",

  // Religion
  CHAPEL = "chapel",
  CHURCH = "church",
  CATHEDRAL = "cathedral",

  // Safety
  WATCHPOST = "watchpost",
  BARRACKS = "barracks",
  WALL = "wall",
  GATE = "gate",
  TOWER = "tower",

  // Entertainment
  TAVERN = "tavern",
  FESTIVAL_GROUND = "festival_ground",
  JOUSTING_ARENA = "jousting_arena",

  // Commerce
  GUILD_HALL = "guild_hall",
  WAREHOUSE = "warehouse",
}

export type CaesarServiceType =
  | "food"
  | "religion"
  | "safety"
  | "entertainment"
  | "commerce"
  | "water";

export type CaesarBuildingCategory =
  | "housing"
  | "infrastructure"
  | "food"
  | "industry"
  | "religion"
  | "safety"
  | "entertainment"
  | "commerce";

export interface CaesarBuildingDef {
  type: CaesarBuildingType;
  label: string;
  category: CaesarBuildingCategory;
  footprint: { w: number; h: number };
  cost: number;                          // gold
  buildTime: number;                     // seconds
  maxWorkers: number;

  // Production
  inputs: { type: CaesarResourceType; amount: number }[];
  outputs: { type: CaesarResourceType; amount: number }[];
  productionTime: number;                // seconds (0 = no production)

  // Service walker
  walkerService: CaesarServiceType | null;
  walkerRange: number;                   // tiles

  // Desirability effect on surroundings
  desirability: number;
  desirabilityRange: number;             // tiles

  // Terrain requirement
  requiresTerrain?: "forest" | "hill" | "stone_deposit" | "iron_deposit" | "meadow";

  // Storage capacity (for granary/warehouse)
  storageCapacity: number;

  // Military
  garrisonSlots: number;
  hp: number;
}

function def(
  type: CaesarBuildingType,
  label: string,
  category: CaesarBuildingCategory,
  footprint: { w: number; h: number },
  cost: number,
  buildTime: number,
  opts: Partial<Omit<CaesarBuildingDef, "type" | "label" | "category" | "footprint" | "cost" | "buildTime">> = {},
): CaesarBuildingDef {
  return {
    type, label, category, footprint, cost, buildTime,
    maxWorkers: opts.maxWorkers ?? 0,
    inputs: opts.inputs ?? [],
    outputs: opts.outputs ?? [],
    productionTime: opts.productionTime ?? 0,
    walkerService: opts.walkerService ?? null,
    walkerRange: opts.walkerRange ?? 0,
    desirability: opts.desirability ?? 0,
    desirabilityRange: opts.desirabilityRange ?? 0,
    requiresTerrain: opts.requiresTerrain,
    storageCapacity: opts.storageCapacity ?? 0,
    garrisonSlots: opts.garrisonSlots ?? 0,
    hp: opts.hp ?? 0,
  };
}

export const CAESAR_BUILDING_DEFS: Record<CaesarBuildingType, CaesarBuildingDef> = {
  // ---- Housing ----
  [CaesarBuildingType.HOUSING]: def(
    CaesarBuildingType.HOUSING, "Housing Plot", "housing",
    { w: 1, h: 1 }, CB.COST_HOUSING, 2,
    { hp: 30 },
  ),

  // ---- Infrastructure ----
  [CaesarBuildingType.ROAD]: def(
    CaesarBuildingType.ROAD, "Road", "infrastructure",
    { w: 1, h: 1 }, CB.COST_ROAD, 0,
  ),
  [CaesarBuildingType.WELL]: def(
    CaesarBuildingType.WELL, "Well", "infrastructure",
    { w: 1, h: 1 }, CB.COST_WELL, CB.BUILD_TIME_SMALL,
    { walkerService: "water", walkerRange: 12, desirability: CB.WELL_DESIRABILITY, desirabilityRange: 4 },
  ),

  // ---- Food Production ----
  [CaesarBuildingType.FARM]: def(
    CaesarBuildingType.FARM, "Farm", "food",
    { w: 3, h: 3 }, CB.COST_FARM, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.WHEAT, amount: 3 }],
      productionTime: CB.PROD_FARM,
      requiresTerrain: "meadow",
      desirability: CB.FARM_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.MILL]: def(
    CaesarBuildingType.MILL, "Mill", "food",
    { w: 2, h: 2 }, CB.COST_MILL, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.WHEAT, amount: 3 }],
      outputs: [{ type: CaesarResourceType.FLOUR, amount: 3 }],
      productionTime: CB.PROD_MILL,
    },
  ),
  [CaesarBuildingType.BAKERY]: def(
    CaesarBuildingType.BAKERY, "Bakery", "food",
    { w: 2, h: 2 }, CB.COST_BAKERY, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.FLOUR, amount: 2 }],
      outputs: [{ type: CaesarResourceType.FOOD, amount: 4 }],
      productionTime: CB.PROD_BAKERY,
    },
  ),
  [CaesarBuildingType.BUTCHER]: def(
    CaesarBuildingType.BUTCHER, "Butcher", "food",
    { w: 2, h: 2 }, CB.COST_BUTCHER, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      outputs: [{ type: CaesarResourceType.FOOD, amount: 3 }],
      productionTime: CB.PROD_BUTCHER,
    },
  ),

  // ---- Food Distribution ----
  [CaesarBuildingType.GRANARY]: def(
    CaesarBuildingType.GRANARY, "Granary", "food",
    { w: 3, h: 3 }, CB.COST_GRANARY, CB.BUILD_TIME_LARGE,
    { maxWorkers: 2, storageCapacity: 200, hp: 60 },
  ),
  [CaesarBuildingType.MARKET]: def(
    CaesarBuildingType.MARKET, "Market", "food",
    { w: 2, h: 2 }, CB.COST_MARKET, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 3,
      walkerService: "food", walkerRange: 18,
      desirability: CB.MARKET_DESIRABILITY, desirabilityRange: 6,
    },
  ),

  // ---- Industry ----
  [CaesarBuildingType.LUMBER_CAMP]: def(
    CaesarBuildingType.LUMBER_CAMP, "Lumber Camp", "industry",
    { w: 2, h: 2 }, CB.COST_LUMBER_CAMP, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 3,
      outputs: [{ type: CaesarResourceType.WOOD, amount: 2 }],
      productionTime: CB.PROD_LUMBER,
      requiresTerrain: "forest",
    },
  ),
  [CaesarBuildingType.QUARRY]: def(
    CaesarBuildingType.QUARRY, "Quarry", "industry",
    { w: 2, h: 2 }, CB.COST_QUARRY, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.STONE, amount: 2 }],
      productionTime: CB.PROD_QUARRY,
      requiresTerrain: "stone_deposit",
      desirability: CB.QUARRY_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.IRON_MINE]: def(
    CaesarBuildingType.IRON_MINE, "Iron Mine", "industry",
    { w: 2, h: 2 }, CB.COST_IRON_MINE, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.IRON, amount: 1 }],
      productionTime: CB.PROD_IRON_MINE,
      requiresTerrain: "iron_deposit",
      desirability: CB.IRON_MINE_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.BLACKSMITH]: def(
    CaesarBuildingType.BLACKSMITH, "Blacksmith", "industry",
    { w: 2, h: 2 }, CB.COST_BLACKSMITH, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.IRON, amount: 1 }],
      outputs: [{ type: CaesarResourceType.TOOLS, amount: 2 }],
      productionTime: CB.PROD_BLACKSMITH,
      desirability: CB.BLACKSMITH_DESIRABILITY, desirabilityRange: 3,
    },
  ),
  [CaesarBuildingType.WEAVER]: def(
    CaesarBuildingType.WEAVER, "Weaver", "industry",
    { w: 2, h: 2 }, CB.COST_WEAVER, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      outputs: [{ type: CaesarResourceType.CLOTH, amount: 2 }],
      productionTime: CB.PROD_WEAVER,
    },
  ),

  // ---- Religion ----
  [CaesarBuildingType.CHAPEL]: def(
    CaesarBuildingType.CHAPEL, "Chapel", "religion",
    { w: 1, h: 1 }, CB.COST_CHAPEL, CB.BUILD_TIME_SMALL,
    {
      maxWorkers: 1,
      walkerService: "religion", walkerRange: 14,
      desirability: CB.CHAPEL_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.CHURCH]: def(
    CaesarBuildingType.CHURCH, "Church", "religion",
    { w: 2, h: 2 }, CB.COST_CHURCH, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 2,
      walkerService: "religion", walkerRange: 20,
      desirability: CB.CHURCH_DESIRABILITY, desirabilityRange: 6,
    },
  ),
  [CaesarBuildingType.CATHEDRAL]: def(
    CaesarBuildingType.CATHEDRAL, "Cathedral", "religion",
    { w: 3, h: 3 }, CB.COST_CATHEDRAL, CB.BUILD_TIME_LARGE * 2,
    {
      maxWorkers: 4,
      walkerService: "religion", walkerRange: 28,
      desirability: CB.CATHEDRAL_DESIRABILITY, desirabilityRange: 8,
    },
  ),

  // ---- Safety ----
  [CaesarBuildingType.WATCHPOST]: def(
    CaesarBuildingType.WATCHPOST, "Watchpost", "safety",
    { w: 1, h: 1 }, CB.COST_WATCHPOST, CB.BUILD_TIME_SMALL,
    {
      maxWorkers: 2,
      walkerService: "safety", walkerRange: 14,
      garrisonSlots: 2,
    },
  ),
  [CaesarBuildingType.BARRACKS]: def(
    CaesarBuildingType.BARRACKS, "Barracks", "safety",
    { w: 3, h: 3 }, CB.COST_BARRACKS, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 6,
      walkerService: "safety", walkerRange: 22,
      garrisonSlots: 8,
      desirability: CB.BARRACKS_DESIRABILITY, desirabilityRange: 4,
      hp: 80,
    },
  ),
  [CaesarBuildingType.WALL]: def(
    CaesarBuildingType.WALL, "Wall", "safety",
    { w: 1, h: 1 }, CB.COST_WALL, CB.BUILD_TIME_SMALL,
    { hp: CB.WALL_HP },
  ),
  [CaesarBuildingType.GATE]: def(
    CaesarBuildingType.GATE, "Gate", "safety",
    { w: 1, h: 1 }, CB.COST_GATE, CB.BUILD_TIME_SMALL,
    { hp: CB.WALL_HP * 0.8 },
  ),
  [CaesarBuildingType.TOWER]: def(
    CaesarBuildingType.TOWER, "Tower", "safety",
    { w: 2, h: 2 }, CB.COST_TOWER, CB.BUILD_TIME_LARGE,
    { garrisonSlots: 4, hp: 120 },
  ),

  // ---- Entertainment ----
  [CaesarBuildingType.TAVERN]: def(
    CaesarBuildingType.TAVERN, "Tavern", "entertainment",
    { w: 2, h: 2 }, CB.COST_TAVERN, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      walkerService: "entertainment", walkerRange: 14,
      desirability: CB.TAVERN_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.FESTIVAL_GROUND]: def(
    CaesarBuildingType.FESTIVAL_GROUND, "Festival Ground", "entertainment",
    { w: 3, h: 3 }, CB.COST_FESTIVAL_GROUND, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 3,
      walkerService: "entertainment", walkerRange: 20,
      desirability: CB.FESTIVAL_DESIRABILITY, desirabilityRange: 6,
    },
  ),
  [CaesarBuildingType.JOUSTING_ARENA]: def(
    CaesarBuildingType.JOUSTING_ARENA, "Jousting Arena", "entertainment",
    { w: 4, h: 3 }, CB.COST_JOUSTING_ARENA, CB.BUILD_TIME_LARGE * 1.5,
    {
      maxWorkers: 4,
      walkerService: "entertainment", walkerRange: 26,
      desirability: CB.JOUSTING_DESIRABILITY, desirabilityRange: 8,
    },
  ),

  // ---- Commerce ----
  [CaesarBuildingType.GUILD_HALL]: def(
    CaesarBuildingType.GUILD_HALL, "Guild Hall", "commerce",
    { w: 2, h: 2 }, CB.COST_GUILD_HALL, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 3,
      walkerService: "commerce", walkerRange: 18,
      desirability: CB.GUILD_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.WAREHOUSE]: def(
    CaesarBuildingType.WAREHOUSE, "Warehouse", "commerce",
    { w: 3, h: 3 }, CB.COST_WAREHOUSE, CB.BUILD_TIME_LARGE,
    { maxWorkers: 3, storageCapacity: 400, hp: 50 },
  ),
};

// Service requirements per housing tier (cumulative – must have ALL previous tiers' services too)
// Tier 0 (Hovel): no requirements (just a road connection)
// Tier 1 (Cottage): water
// Tier 2 (House): water + food + religion
// Tier 3 (Manor): water + food + religion + entertainment + safety
// Tier 4 (Estate): water + food + religion + entertainment + safety + commerce + desirability >= 8
export const HOUSING_REQUIREMENTS: {
  services: CaesarServiceType[];
  minDesirability: number;
}[] = [
  { services: [],                                                          minDesirability: -999 }, // Tier 0 Hovel
  { services: ["water"],                                                   minDesirability: -5 },   // Tier 1 Cottage
  { services: ["water", "food", "religion"],                               minDesirability: 0 },    // Tier 2 House
  { services: ["water", "food", "religion", "entertainment", "safety"],    minDesirability: 4 },    // Tier 3 Manor
  { services: ["water", "food", "religion", "entertainment", "safety", "commerce"], minDesirability: 8 }, // Tier 4 Estate
];

export const HOUSING_TIER_NAMES = ["Hovel", "Cottage", "House", "Manor", "Estate"];
