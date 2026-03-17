// ---------------------------------------------------------------------------
// Settlers – Resource definitions
// ---------------------------------------------------------------------------

export enum ResourceType {
  // Raw
  WOOD = "wood",
  STONE = "stone",
  IRON_ORE = "iron_ore",
  GOLD_ORE = "gold_ore",
  COAL = "coal",
  WHEAT = "wheat",
  WATER = "water",
  FISH = "fish",

  // Processed
  PLANKS = "planks",
  IRON = "iron",
  GOLD = "gold",
  FLOUR = "flour",
  BREAD = "bread",
  MEAT = "meat",
  BEER = "beer",

  // Military
  SWORD = "sword",
  SHIELD = "shield",
  BOW = "bow",
}

/** Visual metadata for each resource */
export interface ResourceMeta {
  label: string;
  color: number; // hex for 3D mesh tint
}

export const RESOURCE_META: Record<ResourceType, ResourceMeta> = {
  [ResourceType.WOOD]:     { label: "Wood",     color: 0x8b5e3c },
  [ResourceType.STONE]:    { label: "Stone",    color: 0x9e9e9e },
  [ResourceType.IRON_ORE]: { label: "Iron Ore", color: 0x7a4e2e },
  [ResourceType.GOLD_ORE]: { label: "Gold Ore", color: 0xc4a32e },
  [ResourceType.COAL]:     { label: "Coal",     color: 0x2c2c2c },
  [ResourceType.WHEAT]:    { label: "Wheat",    color: 0xd4b844 },
  [ResourceType.WATER]:    { label: "Water",    color: 0x4488cc },
  [ResourceType.FISH]:     { label: "Fish",     color: 0x5599bb },

  [ResourceType.PLANKS]:   { label: "Planks",   color: 0xc49a5c },
  [ResourceType.IRON]:     { label: "Iron",     color: 0x888888 },
  [ResourceType.GOLD]:     { label: "Gold",     color: 0xffd700 },
  [ResourceType.FLOUR]:    { label: "Flour",    color: 0xf0e6c0 },
  [ResourceType.BREAD]:    { label: "Bread",    color: 0xc89050 },
  [ResourceType.MEAT]:     { label: "Meat",     color: 0xb04040 },
  [ResourceType.BEER]:     { label: "Beer",     color: 0xcc8822 },

  [ResourceType.SWORD]:    { label: "Sword",    color: 0xaaaacc },
  [ResourceType.SHIELD]:   { label: "Shield",   color: 0x886633 },
  [ResourceType.BOW]:      { label: "Bow",      color: 0x8b6914 },
};

/** Food types accepted by mines */
export const FOOD_TYPES: ReadonlySet<ResourceType> = new Set([
  ResourceType.FISH,
  ResourceType.BREAD,
  ResourceType.MEAT,
]);
