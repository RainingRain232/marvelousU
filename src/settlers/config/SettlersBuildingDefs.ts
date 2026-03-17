// ---------------------------------------------------------------------------
// Settlers – Building definitions
// ---------------------------------------------------------------------------

import { ResourceType } from "./SettlersResourceDefs";
import { SB } from "./SettlersBalance";

export enum SettlersBuildingType {
  // Core
  HEADQUARTERS = "headquarters",
  STOREHOUSE = "storehouse",

  // Economy – raw
  WOODCUTTER = "woodcutter",
  QUARRY = "quarry",
  FISHER = "fisher",
  HUNTER = "hunter",
  FARM = "farm",

  // Economy – processed
  SAWMILL = "sawmill",
  MILL = "mill",
  BAKERY = "bakery",
  BREWERY = "brewery",

  // Mining
  IRON_MINE = "iron_mine",
  GOLD_MINE = "gold_mine",
  COAL_MINE = "coal_mine",

  // Industry
  SMELTER = "smelter",
  MINT = "mint",
  SWORD_SMITH = "sword_smith",
  SHIELD_SMITH = "shield_smith",

  // Military production
  BARRACKS = "barracks",
  BOWYER = "bowyer",
  ARCHERY_RANGE = "archery_range",
  STABLE = "stable",

  // Military territory
  GUARD_HOUSE = "guard_house",
  WATCHTOWER = "watchtower",
  FORTRESS = "fortress",

  // Defensive structures
  WALL = "wall",
  GATE = "gate",
  CATAPULT_TOWER = "catapult_tower",
}

export type BuildingSize = "small" | "medium" | "large";

export interface ResourceStack {
  type: ResourceType;
  amount: number;
}

export interface SettlersBuildingDef {
  type: SettlersBuildingType;
  label: string;
  size: BuildingSize;
  footprint: { w: number; h: number }; // tiles
  constructionCost: ResourceStack[];
  hp: number;

  // Production
  inputs: ResourceStack[];             // consumed per cycle
  outputs: ResourceStack[];            // produced per cycle
  productionTime: number;              // seconds per cycle (0 = no production)
  requiresTerrain?: "mountain" | "water" | "forest" | "meadow";

  // Military
  garrisonSlots: number;               // 0 = non-military
  territoryRadius: number;             // 0 = no territory projection

  // Category for build menu
  category: "economy" | "military" | "infrastructure";
}

function cost(size: BuildingSize): ResourceStack[] {
  const c = size === "small" ? SB.COST_SMALL : size === "medium" ? SB.COST_MEDIUM : SB.COST_LARGE;
  return [
    { type: ResourceType.PLANKS, amount: c.planks },
    { type: ResourceType.STONE, amount: c.stone },
  ];
}

export const BUILDING_DEFS: Record<SettlersBuildingType, SettlersBuildingDef> = {
  // ---- Core ----
  [SettlersBuildingType.HEADQUARTERS]: {
    type: SettlersBuildingType.HEADQUARTERS,
    label: "Headquarters",
    size: "large",
    footprint: { w: 3, h: 3 },
    constructionCost: [],
    hp: SB.HP_HQ,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 0,
    territoryRadius: SB.HQ_RADIUS,
    category: "infrastructure",
  },
  [SettlersBuildingType.STOREHOUSE]: {
    type: SettlersBuildingType.STOREHOUSE,
    label: "Storehouse",
    size: "large",
    footprint: { w: 3, h: 3 },
    constructionCost: cost("large"),
    hp: SB.HP_LARGE,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 0,
    territoryRadius: 0,
    category: "infrastructure",
  },

  // ---- Economy: raw ----
  [SettlersBuildingType.WOODCUTTER]: {
    type: SettlersBuildingType.WOODCUTTER,
    label: "Woodcutter",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [],
    outputs: [{ type: ResourceType.WOOD, amount: 1 }],
    productionTime: SB.PROD_WOODCUTTER,
    requiresTerrain: "forest",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.QUARRY]: {
    type: SettlersBuildingType.QUARRY,
    label: "Quarry",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [],
    outputs: [{ type: ResourceType.STONE, amount: 1 }],
    productionTime: SB.PROD_QUARRY,
    requiresTerrain: "mountain",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.FISHER]: {
    type: SettlersBuildingType.FISHER,
    label: "Fisher",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [],
    outputs: [{ type: ResourceType.FISH, amount: 1 }],
    productionTime: SB.PROD_FISHER,
    requiresTerrain: "water",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.HUNTER]: {
    type: SettlersBuildingType.HUNTER,
    label: "Hunter",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [],
    outputs: [{ type: ResourceType.MEAT, amount: 1 }],
    productionTime: SB.PROD_HUNTER,
    requiresTerrain: "forest",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.FARM]: {
    type: SettlersBuildingType.FARM,
    label: "Farm",
    size: "large",
    footprint: { w: 3, h: 3 },
    constructionCost: cost("large"),
    hp: SB.HP_LARGE,
    inputs: [],
    outputs: [{ type: ResourceType.WHEAT, amount: 1 }],
    productionTime: SB.PROD_FARM,
    requiresTerrain: "meadow",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },

  // ---- Economy: processed ----
  [SettlersBuildingType.SAWMILL]: {
    type: SettlersBuildingType.SAWMILL,
    label: "Sawmill",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [{ type: ResourceType.WOOD, amount: 1 }],
    outputs: [{ type: ResourceType.PLANKS, amount: 1 }],
    productionTime: SB.PROD_SAWMILL,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.MILL]: {
    type: SettlersBuildingType.MILL,
    label: "Mill",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [{ type: ResourceType.WHEAT, amount: 1 }],
    outputs: [{ type: ResourceType.FLOUR, amount: 1 }],
    productionTime: SB.PROD_MILL,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.BAKERY]: {
    type: SettlersBuildingType.BAKERY,
    label: "Bakery",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.FLOUR, amount: 1 },
      { type: ResourceType.WATER, amount: 1 },
    ],
    outputs: [{ type: ResourceType.BREAD, amount: 1 }],
    productionTime: SB.PROD_BAKERY,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.BREWERY]: {
    type: SettlersBuildingType.BREWERY,
    label: "Brewery",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.WHEAT, amount: 1 },
      { type: ResourceType.WATER, amount: 1 },
    ],
    outputs: [{ type: ResourceType.BEER, amount: 1 }],
    productionTime: SB.PROD_BREWERY,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },

  // ---- Mining ----
  [SettlersBuildingType.IRON_MINE]: {
    type: SettlersBuildingType.IRON_MINE,
    label: "Iron Mine",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [{ type: ResourceType.FISH, amount: 1 }], // any food accepted at runtime
    outputs: [{ type: ResourceType.IRON_ORE, amount: 1 }],
    productionTime: SB.PROD_IRON_MINE,
    requiresTerrain: "mountain",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.GOLD_MINE]: {
    type: SettlersBuildingType.GOLD_MINE,
    label: "Gold Mine",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [{ type: ResourceType.FISH, amount: 1 }],
    outputs: [{ type: ResourceType.GOLD_ORE, amount: 1 }],
    productionTime: SB.PROD_GOLD_MINE,
    requiresTerrain: "mountain",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.COAL_MINE]: {
    type: SettlersBuildingType.COAL_MINE,
    label: "Coal Mine",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [{ type: ResourceType.FISH, amount: 1 }],
    outputs: [{ type: ResourceType.COAL, amount: 1 }],
    productionTime: SB.PROD_COAL_MINE,
    requiresTerrain: "mountain",
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },

  // ---- Industry ----
  [SettlersBuildingType.SMELTER]: {
    type: SettlersBuildingType.SMELTER,
    label: "Smelter",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.IRON_ORE, amount: 1 },
      { type: ResourceType.COAL, amount: 1 },
    ],
    outputs: [{ type: ResourceType.IRON, amount: 1 }],
    productionTime: SB.PROD_SMELTER,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.MINT]: {
    type: SettlersBuildingType.MINT,
    label: "Mint",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.GOLD_ORE, amount: 1 },
      { type: ResourceType.COAL, amount: 1 },
    ],
    outputs: [{ type: ResourceType.GOLD, amount: 1 }],
    productionTime: SB.PROD_MINT,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.SWORD_SMITH]: {
    type: SettlersBuildingType.SWORD_SMITH,
    label: "Swordsmith",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.IRON, amount: 1 },
      { type: ResourceType.COAL, amount: 1 },
    ],
    outputs: [{ type: ResourceType.SWORD, amount: 1 }],
    productionTime: SB.PROD_SWORD_SMITH,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.SHIELD_SMITH]: {
    type: SettlersBuildingType.SHIELD_SMITH,
    label: "Shieldsmith",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.IRON, amount: 1 },
      { type: ResourceType.COAL, amount: 1 },
    ],
    outputs: [{ type: ResourceType.SHIELD, amount: 1 }],
    productionTime: SB.PROD_SHIELD_SMITH,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },

  // ---- Military production ----
  [SettlersBuildingType.BARRACKS]: {
    type: SettlersBuildingType.BARRACKS,
    label: "Barracks",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_MEDIUM,
    inputs: [
      { type: ResourceType.SWORD, amount: 1 },
      { type: ResourceType.SHIELD, amount: 1 },
      { type: ResourceType.BEER, amount: 1 },
    ],
    outputs: [], // produces soldiers, handled by military system
    productionTime: SB.PROD_BARRACKS,
    garrisonSlots: 0, territoryRadius: 0,
    category: "military",
  },

  [SettlersBuildingType.BOWYER]: {
    type: SettlersBuildingType.BOWYER,
    label: "Bowyer",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [
      { type: ResourceType.PLANKS, amount: 1 },
      { type: ResourceType.IRON, amount: 1 },
    ],
    outputs: [{ type: ResourceType.BOW, amount: 1 }],
    productionTime: SB.PROD_BOWYER,
    garrisonSlots: 0, territoryRadius: 0,
    category: "economy",
  },
  [SettlersBuildingType.ARCHERY_RANGE]: {
    type: SettlersBuildingType.ARCHERY_RANGE,
    label: "Archery Range",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_SMALL,
    inputs: [
      { type: ResourceType.BOW, amount: 1 },
      { type: ResourceType.BEER, amount: 1 },
    ],
    outputs: [], // produces archers, handled by military system
    productionTime: SB.PROD_ARCHERY_RANGE,
    garrisonSlots: 0, territoryRadius: 0,
    category: "military",
  },
  [SettlersBuildingType.STABLE]: {
    type: SettlersBuildingType.STABLE,
    label: "Stable",
    size: "large",
    footprint: { w: 3, h: 3 },
    constructionCost: cost("large"),
    hp: SB.HP_LARGE,
    inputs: [
      { type: ResourceType.SWORD, amount: 1 },
      { type: ResourceType.SHIELD, amount: 1 },
      { type: ResourceType.BEER, amount: 1 },
      { type: ResourceType.BREAD, amount: 2 },
    ],
    outputs: [], // produces knights, handled by military system
    productionTime: SB.PROD_STABLE,
    garrisonSlots: 0, territoryRadius: 0,
    category: "military",
  },

  // ---- Military territory ----
  [SettlersBuildingType.GUARD_HOUSE]: {
    type: SettlersBuildingType.GUARD_HOUSE,
    label: "Guard House",
    size: "small",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("small"),
    hp: SB.HP_GUARD_HOUSE,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 3,
    territoryRadius: SB.GUARD_HOUSE_RADIUS,
    category: "military",
  },
  [SettlersBuildingType.WATCHTOWER]: {
    type: SettlersBuildingType.WATCHTOWER,
    label: "Watchtower",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_WATCHTOWER,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 6,
    territoryRadius: SB.WATCHTOWER_RADIUS,
    category: "military",
  },
  [SettlersBuildingType.FORTRESS]: {
    type: SettlersBuildingType.FORTRESS,
    label: "Fortress",
    size: "large",
    footprint: { w: 3, h: 3 },
    constructionCost: cost("large"),
    hp: SB.HP_FORTRESS,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 9,
    territoryRadius: SB.FORTRESS_RADIUS,
    category: "military",
  },

  // ---- Defensive structures ----
  [SettlersBuildingType.WALL]: {
    type: SettlersBuildingType.WALL,
    label: "Wall",
    size: "small",
    footprint: { w: 1, h: 1 },
    constructionCost: [{ type: ResourceType.STONE, amount: 2 }],
    hp: SB.HP_WALL,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 0,
    territoryRadius: 0,
    category: "military",
  },
  [SettlersBuildingType.GATE]: {
    type: SettlersBuildingType.GATE,
    label: "Gate",
    size: "small",
    footprint: { w: 1, h: 1 },
    constructionCost: [
      { type: ResourceType.STONE, amount: 2 },
      { type: ResourceType.IRON, amount: 1 },
    ],
    hp: SB.HP_GATE,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 0,
    territoryRadius: 0,
    category: "military",
  },
  [SettlersBuildingType.CATAPULT_TOWER]: {
    type: SettlersBuildingType.CATAPULT_TOWER,
    label: "Catapult Tower",
    size: "medium",
    footprint: { w: 2, h: 2 },
    constructionCost: cost("medium"),
    hp: SB.HP_CATAPULT_TOWER,
    inputs: [], outputs: [],
    productionTime: 0,
    garrisonSlots: 2,
    territoryRadius: 0,
    category: "military",
  },
};
