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

export type BuildingSize = "small" | "medium" | "large";

export interface CaesarBuildingDef {
  type: CaesarBuildingType;
  label: string;
  description: string;
  category: CaesarBuildingCategory;
  size: BuildingSize;
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

  // Material costs (in addition to gold)
  woodCost: number;
  stoneCost: number;

  // Military
  garrisonSlots: number;
  hp: number;

  // Blocks walker/bandit movement (walls)
  blocksMovement: boolean;
}

function def(
  type: CaesarBuildingType,
  label: string,
  desc: string,
  category: CaesarBuildingCategory,
  size: BuildingSize,
  footprint: { w: number; h: number },
  cost: number,
  buildTime: number,
  opts: Partial<Omit<CaesarBuildingDef, "type" | "label" | "description" | "category" | "size" | "footprint" | "cost" | "buildTime">> = {},
): CaesarBuildingDef {
  return {
    type, label, description: desc, category, size, footprint, cost, buildTime,
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
    woodCost: opts.woodCost ?? (size === "large" ? 10 : size === "medium" ? 5 : 2),
    stoneCost: opts.stoneCost ?? (size === "large" ? 6 : size === "medium" ? 3 : 1),
    garrisonSlots: opts.garrisonSlots ?? 0,
    hp: opts.hp ?? 0,
    blocksMovement: opts.blocksMovement ?? false,
  };
}

export const CAESAR_BUILDING_DEFS: Record<CaesarBuildingType, CaesarBuildingDef> = {
  // ---- Housing ----
  [CaesarBuildingType.HOUSING]: def(
    CaesarBuildingType.HOUSING, "Housing Plot",
    "Attract residents. Evolves with nearby services.",
    "housing", "small", { w: 1, h: 1 }, CB.COST_HOUSING, 2,
    { hp: 30, woodCost: 2, stoneCost: 0 },
  ),

  // ---- Infrastructure ----
  [CaesarBuildingType.ROAD]: def(
    CaesarBuildingType.ROAD, "Road",
    "Connect buildings. Walkers travel along roads.",
    "infrastructure", "small", { w: 1, h: 1 }, CB.COST_ROAD, 0,
    { woodCost: 0, stoneCost: 1 },
  ),
  [CaesarBuildingType.WELL]: def(
    CaesarBuildingType.WELL, "Well",
    "Provides water service to nearby housing.",
    "infrastructure", "small", { w: 1, h: 1 }, CB.COST_WELL, CB.BUILD_TIME_SMALL,
    { walkerService: "water", walkerRange: 12, desirability: CB.WELL_DESIRABILITY, desirabilityRange: 4 },
  ),

  // ---- Food Production ----
  [CaesarBuildingType.FARM]: def(
    CaesarBuildingType.FARM, "Farm",
    "Grows wheat on meadow tiles. Requires grass terrain.",
    "food", "large", { w: 3, h: 3 }, CB.COST_FARM, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.WHEAT, amount: 3 }],
      productionTime: CB.PROD_FARM,
      requiresTerrain: "meadow",
      desirability: CB.FARM_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.MILL]: def(
    CaesarBuildingType.MILL, "Mill",
    "Grinds wheat into flour.",
    "food", "medium", { w: 2, h: 2 }, CB.COST_MILL, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.WHEAT, amount: 3 }],
      outputs: [{ type: CaesarResourceType.FLOUR, amount: 3 }],
      productionTime: CB.PROD_MILL,
    },
  ),
  [CaesarBuildingType.BAKERY]: def(
    CaesarBuildingType.BAKERY, "Bakery",
    "Bakes flour into food for the population.",
    "food", "medium", { w: 2, h: 2 }, CB.COST_BAKERY, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.FLOUR, amount: 2 }],
      outputs: [{ type: CaesarResourceType.FOOD, amount: 4 }],
      productionTime: CB.PROD_BAKERY,
    },
  ),
  [CaesarBuildingType.BUTCHER]: def(
    CaesarBuildingType.BUTCHER, "Butcher",
    "Produces meat from livestock. Requires wheat to feed animals.",
    "food", "medium", { w: 2, h: 2 }, CB.COST_BUTCHER, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.WHEAT, amount: 2 }],  // FIX: now requires wheat
      outputs: [{ type: CaesarResourceType.FOOD, amount: 3 }],
      productionTime: CB.PROD_BUTCHER,
    },
  ),

  // ---- Food Distribution ----
  [CaesarBuildingType.GRANARY]: def(
    CaesarBuildingType.GRANARY, "Granary",
    "Stores food and wheat. Increases food storage capacity by 200.",
    "food", "large", { w: 3, h: 3 }, CB.COST_GRANARY, CB.BUILD_TIME_LARGE,
    { maxWorkers: 2, storageCapacity: 200, hp: 60 },
  ),
  [CaesarBuildingType.MARKET]: def(
    CaesarBuildingType.MARKET, "Market",
    "Distributes food to housing via market traders.",
    "food", "medium", { w: 2, h: 2 }, CB.COST_MARKET, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 3,
      walkerService: "food", walkerRange: 18,
      desirability: CB.MARKET_DESIRABILITY, desirabilityRange: 6,
    },
  ),

  // ---- Industry ----
  [CaesarBuildingType.LUMBER_CAMP]: def(
    CaesarBuildingType.LUMBER_CAMP, "Lumber Camp",
    "Harvests wood from nearby forest tiles.",
    "industry", "medium", { w: 2, h: 2 }, CB.COST_LUMBER_CAMP, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 3,
      outputs: [{ type: CaesarResourceType.WOOD, amount: 2 }],
      productionTime: CB.PROD_LUMBER,
      requiresTerrain: "forest",
    },
  ),
  [CaesarBuildingType.QUARRY]: def(
    CaesarBuildingType.QUARRY, "Quarry",
    "Extracts stone from deposits. Reduces nearby desirability.",
    "industry", "medium", { w: 2, h: 2 }, CB.COST_QUARRY, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.STONE, amount: 2 }],
      productionTime: CB.PROD_QUARRY,
      requiresTerrain: "stone_deposit",
      desirability: CB.QUARRY_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.IRON_MINE]: def(
    CaesarBuildingType.IRON_MINE, "Iron Mine",
    "Mines iron ore from deposits. Reduces nearby desirability.",
    "industry", "medium", { w: 2, h: 2 }, CB.COST_IRON_MINE, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 4,
      outputs: [{ type: CaesarResourceType.IRON, amount: 1 }],
      productionTime: CB.PROD_IRON_MINE,
      requiresTerrain: "iron_deposit",
      desirability: CB.IRON_MINE_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.BLACKSMITH]: def(
    CaesarBuildingType.BLACKSMITH, "Blacksmith",
    "Forges iron into tools. Useful for construction and trade.",
    "industry", "medium", { w: 2, h: 2 }, CB.COST_BLACKSMITH, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.IRON, amount: 1 }],
      outputs: [{ type: CaesarResourceType.TOOLS, amount: 2 }],
      productionTime: CB.PROD_BLACKSMITH,
      desirability: CB.BLACKSMITH_DESIRABILITY, desirabilityRange: 3,
    },
  ),
  [CaesarBuildingType.WEAVER]: def(
    CaesarBuildingType.WEAVER, "Weaver",
    "Spins wheat fibers into cloth for Manors and Estates.",
    "industry", "medium", { w: 2, h: 2 }, CB.COST_WEAVER, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      inputs: [{ type: CaesarResourceType.WHEAT, amount: 2 }],
      outputs: [{ type: CaesarResourceType.CLOTH, amount: 2 }],
      productionTime: CB.PROD_WEAVER,
    },
  ),

  // ---- Religion ----
  [CaesarBuildingType.CHAPEL]: def(
    CaesarBuildingType.CHAPEL, "Chapel",
    "Small place of worship. Provides religion service.",
    "religion", "small", { w: 1, h: 1 }, CB.COST_CHAPEL, CB.BUILD_TIME_SMALL,
    {
      maxWorkers: 1,
      walkerService: "religion", walkerRange: 14,
      desirability: CB.CHAPEL_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.CHURCH]: def(
    CaesarBuildingType.CHURCH, "Church",
    "Larger place of worship with wider service range.",
    "religion", "medium", { w: 2, h: 2 }, CB.COST_CHURCH, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 2,
      walkerService: "religion", walkerRange: 20,
      desirability: CB.CHURCH_DESIRABILITY, desirabilityRange: 6,
    },
  ),
  [CaesarBuildingType.CATHEDRAL]: def(
    CaesarBuildingType.CATHEDRAL, "Cathedral",
    "Grand place of worship. Huge desirability and culture boost.",
    "religion", "large", { w: 3, h: 3 }, CB.COST_CATHEDRAL, CB.BUILD_TIME_LARGE * 2,
    {
      maxWorkers: 4,
      walkerService: "religion", walkerRange: 28,
      desirability: CB.CATHEDRAL_DESIRABILITY, desirabilityRange: 8,
    },
  ),

  // ---- Safety ----
  [CaesarBuildingType.WATCHPOST]: def(
    CaesarBuildingType.WATCHPOST, "Watchpost",
    "Small guard post. Sends patrols and spawns militia during raids.",
    "safety", "small", { w: 1, h: 1 }, CB.COST_WATCHPOST, CB.BUILD_TIME_SMALL,
    {
      maxWorkers: 2,
      walkerService: "safety", walkerRange: 14,
      garrisonSlots: 2,
    },
  ),
  [CaesarBuildingType.BARRACKS]: def(
    CaesarBuildingType.BARRACKS, "Barracks",
    "Trains militia. More garrison slots and wider patrol range.",
    "safety", "large", { w: 3, h: 3 }, CB.COST_BARRACKS, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 6,
      walkerService: "safety", walkerRange: 22,
      garrisonSlots: 6,
      desirability: CB.BARRACKS_DESIRABILITY, desirabilityRange: 4,
      hp: 80,
    },
  ),
  [CaesarBuildingType.WALL]: def(
    CaesarBuildingType.WALL, "Wall",
    "Blocks bandit movement. Bandits must destroy walls to pass.",
    "safety", "small", { w: 1, h: 1 }, CB.COST_WALL, CB.BUILD_TIME_SMALL,
    { hp: CB.WALL_HP, blocksMovement: true },
  ),
  [CaesarBuildingType.GATE]: def(
    CaesarBuildingType.GATE, "Gate",
    "Passable opening in walls. Also connects roads.",
    "safety", "small", { w: 1, h: 1 }, CB.COST_GATE, CB.BUILD_TIME_SMALL,
    { hp: CB.WALL_HP * 0.8 },
  ),
  [CaesarBuildingType.TOWER]: def(
    CaesarBuildingType.TOWER, "Tower",
    "Fires at bandits within range. Strong defensive structure.",
    "safety", "medium", { w: 2, h: 2 }, CB.COST_TOWER, CB.BUILD_TIME_LARGE,
    { garrisonSlots: 4, hp: 120 },
  ),

  // ---- Entertainment ----
  [CaesarBuildingType.TAVERN]: def(
    CaesarBuildingType.TAVERN, "Tavern",
    "Provides entertainment to nearby housing.",
    "entertainment", "medium", { w: 2, h: 2 }, CB.COST_TAVERN, CB.BUILD_TIME_MEDIUM,
    {
      maxWorkers: 2,
      walkerService: "entertainment", walkerRange: 14,
      desirability: CB.TAVERN_DESIRABILITY, desirabilityRange: 4,
    },
  ),
  [CaesarBuildingType.FESTIVAL_GROUND]: def(
    CaesarBuildingType.FESTIVAL_GROUND, "Festival Ground",
    "Hosts festivals. Wide entertainment coverage.",
    "entertainment", "large", { w: 3, h: 3 }, CB.COST_FESTIVAL_GROUND, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 3,
      walkerService: "entertainment", walkerRange: 20,
      desirability: CB.FESTIVAL_DESIRABILITY, desirabilityRange: 6,
    },
  ),
  [CaesarBuildingType.JOUSTING_ARENA]: def(
    CaesarBuildingType.JOUSTING_ARENA, "Jousting Arena",
    "Grand entertainment. Huge desirability and culture boost.",
    "entertainment", "large", { w: 4, h: 3 }, CB.COST_JOUSTING_ARENA, CB.BUILD_TIME_LARGE * 1.5,
    {
      maxWorkers: 4,
      walkerService: "entertainment", walkerRange: 26,
      desirability: CB.JOUSTING_DESIRABILITY, desirabilityRange: 8,
    },
  ),

  // ---- Commerce ----
  [CaesarBuildingType.GUILD_HALL]: def(
    CaesarBuildingType.GUILD_HALL, "Guild Hall",
    "Provides commerce service. Boosts prosperity in nearby housing.",
    "commerce", "medium", { w: 2, h: 2 }, CB.COST_GUILD_HALL, CB.BUILD_TIME_LARGE,
    {
      maxWorkers: 3,
      walkerService: "commerce", walkerRange: 18,
      desirability: CB.GUILD_DESIRABILITY, desirabilityRange: 5,
    },
  ),
  [CaesarBuildingType.WAREHOUSE]: def(
    CaesarBuildingType.WAREHOUSE, "Warehouse",
    "Stores goods. Increases resource storage cap by 400.",
    "commerce", "large", { w: 3, h: 3 }, CB.COST_WAREHOUSE, CB.BUILD_TIME_LARGE,
    { maxWorkers: 3, storageCapacity: 400, hp: 50 },
  ),
};

// Maintenance cost per building size
export function getMaintenanceCost(type: CaesarBuildingType): number {
  const bdef = CAESAR_BUILDING_DEFS[type];
  if (type === CaesarBuildingType.ROAD || type === CaesarBuildingType.HOUSING ||
      type === CaesarBuildingType.WALL || type === CaesarBuildingType.GATE) return 0;
  if (bdef.category === "safety") return CB.MAINTENANCE_MILITARY;
  switch (bdef.size) {
    case "small": return CB.MAINTENANCE_SMALL;
    case "medium": return CB.MAINTENANCE_MEDIUM;
    case "large": return CB.MAINTENANCE_LARGE;
  }
}

// Service requirements per housing tier (cumulative)
// Tier 0 (Hovel): no requirements (just a road connection)
// Tier 1 (Cottage): water
// Tier 2 (House): water + food + religion
// Tier 3 (Manor): water + food + religion + entertainment + safety + cloth supply
// Tier 4 (Estate): all services + commerce + cloth + tools + high desirability
export const HOUSING_REQUIREMENTS: {
  services: CaesarServiceType[];
  minDesirability: number;
  requiresGoods: ("cloth" | "tools")[];  // goods consumed periodically to maintain tier
}[] = [
  { services: [],                                                          minDesirability: -999, requiresGoods: [] },
  { services: ["water"],                                                   minDesirability: -5,   requiresGoods: [] },
  { services: ["water", "food", "religion"],                               minDesirability: 0,    requiresGoods: [] },
  { services: ["water", "food", "religion", "entertainment", "safety"],    minDesirability: 4,    requiresGoods: ["cloth"] },
  { services: ["water", "food", "religion", "entertainment", "safety", "commerce"], minDesirability: 8, requiresGoods: ["cloth", "tools"] },
];

export const HOUSING_TIER_NAMES = ["Hovel", "Cottage", "House", "Manor", "Estate"];
