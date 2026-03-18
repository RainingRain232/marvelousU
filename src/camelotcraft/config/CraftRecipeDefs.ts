// ---------------------------------------------------------------------------
// Camelot Craft – Crafting recipe definitions
// ---------------------------------------------------------------------------

import { BlockType, ToolType, ToolMaterial } from "./CraftBlockDefs";

// ---------------------------------------------------------------------------
// Item system — blocks are items, plus tools/specials
// ---------------------------------------------------------------------------

export enum ItemType {
  BLOCK = "block",
  TOOL = "tool",
  WEAPON = "weapon",
  FOOD = "food",
  SPECIAL = "special",
}

export interface ItemStack {
  itemType: ItemType;
  blockType?: BlockType;
  toolType?: ToolType;
  toolMaterial?: ToolMaterial;
  specialId?: string;
  count: number;
  durability?: number;
  maxDurability?: number;
  displayName: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Recipe types
// ---------------------------------------------------------------------------

/** A 3x3 shaped recipe (null = empty slot). Items are identified by blockType. */
export interface ShapedRecipe {
  type: "shaped";
  pattern: (BlockType | null)[][]; // 1x1 to 3x3
  result: ItemStack;
}

/** A shapeless recipe — order doesn't matter. */
export interface ShapelessRecipe {
  type: "shapeless";
  ingredients: BlockType[];
  result: ItemStack;
}

/** Furnace smelting recipe */
export interface SmeltRecipe {
  type: "smelt";
  input: BlockType;
  result: ItemStack;
  time: number; // seconds
}

export type CraftRecipe = ShapedRecipe | ShapelessRecipe | SmeltRecipe;

// ---------------------------------------------------------------------------
// Helper to create item stacks
// ---------------------------------------------------------------------------

function blockItem(bt: BlockType, count: number, name: string, color: number): ItemStack {
  return { itemType: ItemType.BLOCK, blockType: bt, count, displayName: name, color };
}

function toolItem(tool: ToolType, mat: ToolMaterial, name: string, color: number, durability: number): ItemStack {
  return {
    itemType: ItemType.TOOL, toolType: tool, toolMaterial: mat,
    count: 1, displayName: name, color, durability, maxDurability: durability,
  };
}

function weaponItem(id: string, name: string, color: number, durability: number): ItemStack {
  return {
    itemType: ItemType.WEAPON, specialId: id,
    count: 1, displayName: name, color, durability, maxDurability: durability,
  };
}

function foodItem(id: string, name: string, color: number, count: number): ItemStack {
  return { itemType: ItemType.FOOD, specialId: id, count, displayName: name, color };
}

// ---------------------------------------------------------------------------
// All recipes
// ---------------------------------------------------------------------------

const _ = null; // shorthand for empty slot

export const RECIPES: CraftRecipe[] = [
  // ===== Basic crafting =====
  // Oak Log → 4 Planks
  {
    type: "shaped", pattern: [[BlockType.OAK_LOG]],
    result: blockItem(BlockType.OAK_PLANKS, 4, "Oak Planks", 0xB8860B),
  },
  // 4 Planks → Crafting Table
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
    ],
    result: blockItem(BlockType.CRAFTING_TABLE, 1, "Crafting Table", 0xA0522D),
  },
  // 2 Planks → 4 Sticks (represented as special item)
  {
    type: "shaped",
    pattern: [[BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS]],
    result: { itemType: ItemType.SPECIAL, specialId: "stick", count: 4, displayName: "Stick", color: 0xA0522D },
  },
  // 8 Cobblestone → Furnace
  {
    type: "shaped",
    pattern: [
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE],
      [BlockType.COBBLESTONE, _, BlockType.COBBLESTONE],
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE],
    ],
    result: blockItem(BlockType.FURNACE, 1, "Furnace", 0x696969),
  },
  // Chest
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [BlockType.OAK_PLANKS, _, BlockType.OAK_PLANKS],
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
    ],
    result: blockItem(BlockType.CHEST, 1, "Chest", 0xA0522D),
  },
  // Torch (coal/charcoal + stick — simplified to cobblestone + planks)
  {
    type: "shaped",
    pattern: [[BlockType.COBBLESTONE], [BlockType.OAK_PLANKS]],
    result: blockItem(BlockType.TORCH, 4, "Torch", 0xFFA726),
  },

  // ===== Stone / Castle building =====
  // 4 Stone → Stone Bricks
  {
    type: "shaped",
    pattern: [
      [BlockType.STONE, BlockType.STONE],
      [BlockType.STONE, BlockType.STONE],
    ],
    result: blockItem(BlockType.STONE_BRICKS, 4, "Stone Bricks", 0x909090),
  },
  // Stone Bricks + Iron → Castle Wall
  {
    type: "shaped",
    pattern: [
      [BlockType.STONE_BRICKS, BlockType.IRON_ORE, BlockType.STONE_BRICKS],
      [BlockType.STONE_BRICKS, BlockType.STONE_BRICKS, BlockType.STONE_BRICKS],
    ],
    result: blockItem(BlockType.CASTLE_WALL, 6, "Castle Wall", 0xA0A0A0),
  },
  // Castle Battlement
  {
    type: "shaped",
    pattern: [
      [BlockType.CASTLE_WALL, _, BlockType.CASTLE_WALL],
      [BlockType.CASTLE_WALL, BlockType.CASTLE_WALL, BlockType.CASTLE_WALL],
    ],
    result: blockItem(BlockType.CASTLE_BATTLEMENT, 4, "Battlement", 0x989898),
  },
  // Marble (clay + stone)
  {
    type: "shaped",
    pattern: [
      [BlockType.CLAY, BlockType.STONE],
      [BlockType.STONE, BlockType.CLAY],
    ],
    result: blockItem(BlockType.MARBLE, 4, "Marble", 0xE8E8E8),
  },
  // Marble Pillar
  {
    type: "shaped",
    pattern: [[BlockType.MARBLE], [BlockType.MARBLE], [BlockType.MARBLE]],
    result: blockItem(BlockType.MARBLE_PILLAR, 3, "Marble Pillar", 0xF0F0E8),
  },
  // Stained Glass
  {
    type: "shaped",
    pattern: [
      [BlockType.SAND, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.SAND],
    ],
    result: blockItem(BlockType.STAINED_GLASS, 4, "Stained Glass", 0xE91E63),
  },
  // Enchanted Stone
  {
    type: "shapeless",
    ingredients: [BlockType.STONE, BlockType.ENCHANTED_CRYSTAL_ORE],
    result: blockItem(BlockType.ENCHANTED_STONE, 2, "Enchanted Stone", 0x7B68EE),
  },
  // Holy Stone
  {
    type: "shapeless",
    ingredients: [BlockType.MARBLE, BlockType.GOLD_ORE],
    result: blockItem(BlockType.HOLY_STONE, 2, "Holy Stone", 0xFFF8DC),
  },
  // Enchanted Torch
  {
    type: "shaped",
    pattern: [[BlockType.ENCHANTED_CRYSTAL_ORE], [BlockType.OAK_PLANKS]],
    result: blockItem(BlockType.ENCHANTED_TORCH, 4, "Enchanted Torch", 0xAB47BC),
  },

  // ===== Metal blocks =====
  // 9 Iron Ore → Iron Block
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
    ],
    result: blockItem(BlockType.IRON_BLOCK, 1, "Iron Block", 0xC0C0C0),
  },
  // 9 Gold Ore → Gold Block
  {
    type: "shaped",
    pattern: [
      [BlockType.GOLD_ORE, BlockType.GOLD_ORE, BlockType.GOLD_ORE],
      [BlockType.GOLD_ORE, BlockType.GOLD_ORE, BlockType.GOLD_ORE],
      [BlockType.GOLD_ORE, BlockType.GOLD_ORE, BlockType.GOLD_ORE],
    ],
    result: blockItem(BlockType.GOLD_BLOCK, 1, "Gold Block", 0xFFD700),
  },
  // Crystal Block
  {
    type: "shaped",
    pattern: [
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
    ],
    result: blockItem(BlockType.CRYSTAL_BLOCK, 1, "Crystal Block", 0xCE93D8),
  },

  // ===== Special Arthurian blocks =====
  // Round Table
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [BlockType.GOLD_ORE, BlockType.OAK_PLANKS, BlockType.GOLD_ORE],
      [BlockType.OAK_PLANKS, _, BlockType.OAK_PLANKS],
    ],
    result: blockItem(BlockType.ROUND_TABLE, 1, "Round Table", 0x8B4513),
  },
  // Throne
  {
    type: "shaped",
    pattern: [
      [BlockType.GOLD_ORE, _, BlockType.GOLD_ORE],
      [BlockType.GOLD_ORE, BlockType.IRON_ORE, BlockType.GOLD_ORE],
      [_, BlockType.STONE_BRICKS, _],
    ],
    result: blockItem(BlockType.THRONE, 1, "Throne", 0xDAA520),
  },
  // Pendragon Banner
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS, _],
    ],
    result: blockItem(BlockType.BANNER_BLOCK, 2, "Pendragon Banner", 0xB71C1C),
  },
  // Anvil
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [_, BlockType.IRON_ORE, _],
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
    ],
    result: blockItem(BlockType.ANVIL, 1, "Anvil", 0x484848),
  },
  // Grail Pedestal
  {
    type: "shaped",
    pattern: [
      [BlockType.GOLD_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.GOLD_ORE],
      [_, BlockType.HOLY_STONE, _],
      [BlockType.MARBLE, BlockType.MARBLE, BlockType.MARBLE],
    ],
    result: blockItem(BlockType.GRAIL_PEDESTAL, 1, "Grail Pedestal", 0xFFEB3B),
  },
  // Doors
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
    ],
    result: blockItem(BlockType.WOODEN_DOOR, 1, "Wooden Door", 0x8B6914),
  },
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE],
    ],
    result: blockItem(BlockType.IRON_DOOR, 1, "Iron Door", 0xB0B0B0),
  },

  // ===== Tools =====
  // Wood tools (planks + planks-as-sticks)
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS],
    ],
    result: toolItem(ToolType.AXE, ToolMaterial.WOOD, "Wooden Axe", 0xB8860B, 60),
  },
  {
    type: "shaped",
    pattern: [
      [BlockType.OAK_PLANKS, BlockType.OAK_PLANKS, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS, _],
      [_, BlockType.OAK_PLANKS, _],
    ],
    result: toolItem(ToolType.PICKAXE, ToolMaterial.WOOD, "Wooden Pickaxe", 0xB8860B, 60),
  },
  {
    type: "shaped",
    pattern: [[BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS]],
    result: toolItem(ToolType.SHOVEL, ToolMaterial.WOOD, "Wooden Shovel", 0xB8860B, 60),
  },
  // Stone tools
  {
    type: "shaped",
    pattern: [
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE],
      [_, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS],
    ],
    result: toolItem(ToolType.AXE, ToolMaterial.STONE, "Stone Axe", 0x808080, 132),
  },
  {
    type: "shaped",
    pattern: [
      [BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE],
      [_, BlockType.OAK_PLANKS, _],
      [_, BlockType.OAK_PLANKS, _],
    ],
    result: toolItem(ToolType.PICKAXE, ToolMaterial.STONE, "Stone Pickaxe", 0x808080, 132),
  },
  {
    type: "shaped",
    pattern: [[BlockType.COBBLESTONE], [BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS]],
    result: toolItem(ToolType.SHOVEL, ToolMaterial.STONE, "Stone Shovel", 0x808080, 132),
  },
  // Iron tools
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE],
      [_, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS],
    ],
    result: toolItem(ToolType.AXE, ToolMaterial.IRON, "Iron Axe", 0xC0C0C0, 251),
  },
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [_, BlockType.OAK_PLANKS, _],
      [_, BlockType.OAK_PLANKS, _],
    ],
    result: toolItem(ToolType.PICKAXE, ToolMaterial.IRON, "Iron Pickaxe", 0xC0C0C0, 251),
  },
  {
    type: "shaped",
    pattern: [[BlockType.IRON_ORE], [BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS]],
    result: toolItem(ToolType.SHOVEL, ToolMaterial.IRON, "Iron Shovel", 0xC0C0C0, 251),
  },
  // Crystal tools
  {
    type: "shaped",
    pattern: [
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [_, BlockType.OAK_PLANKS],
      [_, BlockType.OAK_PLANKS],
    ],
    result: toolItem(ToolType.AXE, ToolMaterial.CRYSTAL, "Crystal Axe", 0xCE93D8, 500),
  },
  {
    type: "shaped",
    pattern: [
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [_, BlockType.OAK_PLANKS, _],
      [_, BlockType.OAK_PLANKS, _],
    ],
    result: toolItem(ToolType.PICKAXE, ToolMaterial.CRYSTAL, "Crystal Pickaxe", 0xCE93D8, 500),
  },

  // ===== Weapons =====
  // Wooden Sword
  {
    type: "shaped",
    pattern: [[BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS], [BlockType.OAK_PLANKS]],
    result: weaponItem("wooden_sword", "Wooden Sword", 0xB8860B, 60),
  },
  // Stone Sword
  {
    type: "shaped",
    pattern: [[BlockType.COBBLESTONE], [BlockType.COBBLESTONE], [BlockType.OAK_PLANKS]],
    result: weaponItem("stone_sword", "Stone Sword", 0x808080, 132),
  },
  // Iron Sword
  {
    type: "shaped",
    pattern: [[BlockType.IRON_ORE], [BlockType.IRON_ORE], [BlockType.OAK_PLANKS]],
    result: weaponItem("iron_sword", "Iron Sword", 0xC0C0C0, 251),
  },
  // Crystal Sword
  {
    type: "shaped",
    pattern: [[BlockType.ENCHANTED_CRYSTAL_ORE], [BlockType.ENCHANTED_CRYSTAL_ORE], [BlockType.OAK_PLANKS]],
    result: weaponItem("crystal_sword", "Crystal Sword", 0xCE93D8, 500),
  },

  // ===== Armor =====
  // Iron Helmet
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "iron_helmet", count: 1, displayName: "Iron Helmet", color: 0xC0C0C0, durability: 165, maxDurability: 165 },
  },
  // Iron Chestplate
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "iron_chestplate", count: 1, displayName: "Iron Chestplate", color: 0xC0C0C0, durability: 240, maxDurability: 240 },
  },
  // Iron Leggings
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, BlockType.IRON_ORE, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "iron_leggings", count: 1, displayName: "Iron Leggings", color: 0xC0C0C0, durability: 225, maxDurability: 225 },
  },
  // Iron Boots
  {
    type: "shaped",
    pattern: [
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
      [BlockType.IRON_ORE, _, BlockType.IRON_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "iron_boots", count: 1, displayName: "Iron Boots", color: 0xC0C0C0, durability: 195, maxDurability: 195 },
  },
  // Crystal Helmet
  {
    type: "shaped",
    pattern: [
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [BlockType.ENCHANTED_CRYSTAL_ORE, _, BlockType.ENCHANTED_CRYSTAL_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "crystal_helmet", count: 1, displayName: "Crystal Helmet", color: 0xCE93D8, durability: 363, maxDurability: 363 },
  },
  // Crystal Chestplate
  {
    type: "shaped",
    pattern: [
      [BlockType.ENCHANTED_CRYSTAL_ORE, _, BlockType.ENCHANTED_CRYSTAL_ORE],
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
      [BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE, BlockType.ENCHANTED_CRYSTAL_ORE],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "crystal_chestplate", count: 1, displayName: "Crystal Chestplate", color: 0xCE93D8, durability: 528, maxDurability: 528 },
  },
  // Shield (iron + planks)
  {
    type: "shaped",
    pattern: [
      [_, BlockType.IRON_ORE, _],
      [BlockType.IRON_ORE, BlockType.OAK_PLANKS, BlockType.IRON_ORE],
      [_, BlockType.IRON_ORE, _],
    ],
    result: { itemType: ItemType.SPECIAL, specialId: "iron_shield", count: 1, displayName: "Iron Shield", color: 0xB0B0B0, durability: 336, maxDurability: 336 },
  },

  // ===== Smelting =====
  { type: "smelt", input: BlockType.IRON_ORE, result: blockItem(BlockType.IRON_BLOCK, 1, "Iron Ingot", 0xC0C0C0), time: 10 },
  { type: "smelt", input: BlockType.GOLD_ORE, result: blockItem(BlockType.GOLD_BLOCK, 1, "Gold Ingot", 0xFFD700), time: 10 },
  { type: "smelt", input: BlockType.SAND, result: blockItem(BlockType.STAINED_GLASS, 1, "Glass", 0xE0E0E0), time: 8 },
  { type: "smelt", input: BlockType.COBBLESTONE, result: blockItem(BlockType.STONE, 1, "Stone", 0x808080), time: 8 },
  { type: "smelt", input: BlockType.CLAY, result: blockItem(BlockType.STONE_BRICKS, 1, "Brick", 0xB07050), time: 8 },

  // ===== Food (shapeless) =====
  { type: "shapeless", ingredients: [BlockType.OAK_LEAVES], result: foodItem("apple", "Apple", 0xE53935, 1) },
  { type: "shapeless", ingredients: [BlockType.MUSHROOM, BlockType.MUSHROOM], result: foodItem("stew", "Mushroom Stew", 0x8D6E63, 1) },
  // Bread (3 wheat/grass → bread)
  { type: "shaped", pattern: [[BlockType.TALL_GRASS, BlockType.TALL_GRASS, BlockType.TALL_GRASS]],
    result: foodItem("bread", "Bread", 0xD4A574, 2) },
  // Golden Apple (apple + gold = powerful healing)
  { type: "shapeless", ingredients: [BlockType.OAK_LEAVES, BlockType.GOLD_ORE],
    result: foodItem("golden_apple", "Golden Apple", 0xFFD700, 1) },
  // Roast Meat (cook raw food in furnace — smelting recipe)
  { type: "smelt", input: BlockType.OAK_LOG, // simplified: log → charcoal → use as fuel
    result: { itemType: ItemType.SPECIAL, specialId: "charcoal", count: 1, displayName: "Charcoal", color: 0x333333 }, time: 5 },
  // Enchanted Berry (enchanted flower → magic food)
  { type: "shapeless", ingredients: [BlockType.ENCHANTED_FLOWER],
    result: foodItem("enchanted_berry", "Enchanted Berry", 0xE040FB, 1) },
  // Feast (mushroom stew + bread + apple → full feast)
  { type: "shaped", pattern: [
    [BlockType.MUSHROOM, BlockType.OAK_LEAVES, BlockType.MUSHROOM],
    [_, BlockType.TALL_GRASS, _],
  ], result: foodItem("feast", "Royal Feast", 0xDAA520, 1) },
];

// ---------------------------------------------------------------------------
// Weapon damage lookup
// ---------------------------------------------------------------------------

export const WEAPON_DAMAGE: Record<string, number> = {
  wooden_sword: 4,
  stone_sword: 5,
  iron_sword: 6,
  crystal_sword: 8,
  excalibur: 15,
};

// ---------------------------------------------------------------------------
// Tool speed multipliers by material
// ---------------------------------------------------------------------------

export const TOOL_SPEED: Record<ToolMaterial, number> = {
  [ToolMaterial.WOOD]: 2,
  [ToolMaterial.STONE]: 4,
  [ToolMaterial.IRON]: 6,
  [ToolMaterial.GOLD]: 8,
  [ToolMaterial.CRYSTAL]: 10,
  [ToolMaterial.EXCALIBUR]: 30,
};
