// ---------------------------------------------------------------------------
// Terraria – Crafting recipes
// ---------------------------------------------------------------------------

import { BlockType, ToolType, ToolMaterial } from "./TerrariaBlockDefs";
import { ItemCategory } from "../state/TerrariaInventory";
import type { ItemStack } from "../state/TerrariaInventory";
import { createBlockItem, createToolItem } from "../state/TerrariaInventory";

// ---------------------------------------------------------------------------
// Recipe types
// ---------------------------------------------------------------------------

export interface CraftingRecipe {
  id: string;
  inputs: RecipeInput[];
  output: ItemStack;
  station: "none" | "round_table" | "forge";
}

export interface RecipeInput {
  category: ItemCategory;
  blockType?: BlockType;
  toolType?: ToolType;
  toolMaterial?: ToolMaterial;
  specialId?: string;
  displayName?: string;
  count: number;
}

export interface SmeltingRecipe {
  inputBlockType: BlockType;
  outputBlockType: BlockType;
  outputName: string;
  outputColor: number;
  burnTime: number;
}

// ---------------------------------------------------------------------------
// Block input helper
// ---------------------------------------------------------------------------

function blockInput(bt: BlockType, count: number): RecipeInput {
  return { category: ItemCategory.BLOCK, blockType: bt, count };
}

function _armor(name: string, defense: number, color: number, slot: string): ItemStack {
  return { category: ItemCategory.ARMOR, specialId: `armor_${slot}_${name.toLowerCase().replace(/\s/g, "_")}`, count: 1, displayName: name, color, defense };
}

// ---------------------------------------------------------------------------
// Crafting recipes
// ---------------------------------------------------------------------------

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Basic materials
  {
    id: "planks", station: "none",
    inputs: [blockInput(BlockType.OAK_LOG, 1)],
    output: createBlockItem(BlockType.PLANKS, "Planks", 0xC4A35A, 4),
  },
  {
    id: "round_table", station: "none",
    inputs: [blockInput(BlockType.PLANKS, 4)],
    output: createBlockItem(BlockType.ROUND_TABLE, "Round Table", 0xA0785A),
  },
  {
    id: "chest", station: "none",
    inputs: [blockInput(BlockType.PLANKS, 8)],
    output: createBlockItem(BlockType.CHEST, "Chest", 0xB8860B),
  },
  {
    id: "wooden_door", station: "none",
    inputs: [blockInput(BlockType.PLANKS, 6)],
    output: createBlockItem(BlockType.WOODEN_DOOR, "Wooden Door", 0x8B6914),
  },
  {
    id: "torch", station: "none",
    inputs: [blockInput(BlockType.OAK_LOG, 1), blockInput(BlockType.COBBLESTONE, 1)],
    output: createBlockItem(BlockType.TORCH, "Torch", 0xFFAA00, 4),
  },

  // Workbench recipes
  {
    id: "forge", station: "round_table",
    inputs: [blockInput(BlockType.COBBLESTONE, 8), blockInput(BlockType.OAK_LOG, 2)],
    output: createBlockItem(BlockType.FORGE, "Forge", 0x8B4513),
  },
  {
    id: "stone_bricks", station: "round_table",
    inputs: [blockInput(BlockType.COBBLESTONE, 4)],
    output: createBlockItem(BlockType.STONE_BRICKS, "Stone Bricks", 0x7A7A7A, 4),
  },
  {
    id: "castle_wall", station: "round_table",
    inputs: [blockInput(BlockType.STONE_BRICKS, 2), blockInput(BlockType.COBBLESTONE, 2)],
    output: createBlockItem(BlockType.CASTLE_WALL, "Castle Wall", 0xA0A0B0, 4),
  },
  {
    id: "banner", station: "round_table",
    inputs: [blockInput(BlockType.PLANKS, 2)],
    output: createBlockItem(BlockType.BANNER, "Banner", 0xCC0000, 2),
  },
  {
    id: "enchanted_torch", station: "round_table",
    inputs: [blockInput(BlockType.TORCH, 1), blockInput(BlockType.CRYSTAL_ORE, 1)],
    output: createBlockItem(BlockType.ENCHANTED_TORCH, "Enchanted Torch", 0xAA55FF, 4),
  },
  {
    id: "throne", station: "round_table",
    inputs: [blockInput(BlockType.GOLD_ORE, 8), blockInput(BlockType.PLANKS, 4)],
    output: createBlockItem(BlockType.THRONE, "Throne", 0x800080),
  },

  // Wooden tools
  {
    id: "wood_pickaxe", station: "round_table",
    inputs: [blockInput(BlockType.PLANKS, 3), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.PICKAXE, ToolMaterial.WOOD, "Wooden Pickaxe", 0xC4A35A, 3),
  },
  {
    id: "wood_axe", station: "round_table",
    inputs: [blockInput(BlockType.PLANKS, 3), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.AXE, ToolMaterial.WOOD, "Wooden Axe", 0xC4A35A, 3),
  },
  {
    id: "wood_sword", station: "round_table",
    inputs: [blockInput(BlockType.PLANKS, 5), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.SWORD, ToolMaterial.WOOD, "Wooden Sword", 0xC4A35A, 5),
  },
  {
    id: "wood_hammer", station: "round_table",
    inputs: [blockInput(BlockType.PLANKS, 4), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.HAMMER, ToolMaterial.WOOD, "Wooden Hammer", 0xC4A35A, 3),
  },

  // Stone tools
  {
    id: "stone_pickaxe", station: "round_table",
    inputs: [blockInput(BlockType.COBBLESTONE, 3), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.PICKAXE, ToolMaterial.STONE, "Stone Pickaxe", 0x808080, 5),
  },
  {
    id: "stone_axe", station: "round_table",
    inputs: [blockInput(BlockType.COBBLESTONE, 3), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.AXE, ToolMaterial.STONE, "Stone Axe", 0x808080, 5),
  },
  {
    id: "stone_sword", station: "round_table",
    inputs: [blockInput(BlockType.COBBLESTONE, 5), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.SWORD, ToolMaterial.STONE, "Stone Sword", 0x808080, 8),
  },

  // Iron tools (require forge smelted iron ingots = iron ore at forge)
  {
    id: "iron_pickaxe", station: "forge",
    inputs: [blockInput(BlockType.IRON_ORE, 6), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.PICKAXE, ToolMaterial.IRON, "Iron Pickaxe", 0xB0B0B0, 8),
  },
  {
    id: "iron_axe", station: "forge",
    inputs: [blockInput(BlockType.IRON_ORE, 6), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.AXE, ToolMaterial.IRON, "Iron Axe", 0xB0B0B0, 8),
  },
  {
    id: "iron_sword", station: "forge",
    inputs: [blockInput(BlockType.IRON_ORE, 8), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.SWORD, ToolMaterial.IRON, "Iron Sword", 0xB0B0B0, 12),
  },
  {
    id: "iron_door", station: "forge",
    inputs: [blockInput(BlockType.IRON_ORE, 6)],
    output: createBlockItem(BlockType.IRON_DOOR, "Iron Door", 0xAAAAAA),
  },

  // Gold tools
  {
    id: "gold_pickaxe", station: "forge",
    inputs: [blockInput(BlockType.GOLD_ORE, 8), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.PICKAXE, ToolMaterial.GOLD, "Gold Pickaxe", 0xFFD700, 7),
  },
  {
    id: "gold_sword", station: "forge",
    inputs: [blockInput(BlockType.GOLD_ORE, 10), blockInput(BlockType.OAK_LOG, 2)],
    output: createToolItem(ToolType.SWORD, ToolMaterial.GOLD, "Gold Sword", 0xFFD700, 10),
  },

  // Crystal tools
  {
    id: "crystal_pickaxe", station: "forge",
    inputs: [blockInput(BlockType.CRYSTAL_ORE, 10), blockInput(BlockType.IRON_ORE, 4)],
    output: createToolItem(ToolType.PICKAXE, ToolMaterial.CRYSTAL, "Crystal Pickaxe", 0xAA44FF, 12),
  },
  {
    id: "crystal_sword", station: "forge",
    inputs: [blockInput(BlockType.CRYSTAL_ORE, 12), blockInput(BlockType.IRON_ORE, 4)],
    output: createToolItem(ToolType.SWORD, ToolMaterial.CRYSTAL, "Crystal Sword", 0xAA44FF, 18),
  },
  {
    id: "crystal_staff", station: "forge",
    inputs: [blockInput(BlockType.CRYSTAL_ORE, 15), blockInput(BlockType.GOLD_ORE, 5)],
    output: createToolItem(ToolType.STAFF, ToolMaterial.CRYSTAL, "Crystal Staff", 0xAA44FF, 22),
  },

  // Special blocks
  {
    id: "holy_stone", station: "forge",
    inputs: [blockInput(BlockType.STONE_BRICKS, 4), blockInput(BlockType.CRYSTAL_ORE, 2)],
    output: createBlockItem(BlockType.HOLY_STONE, "Holy Stone", 0xFFF8DC, 4),
  },
  {
    id: "enchanted_stone", station: "forge",
    inputs: [blockInput(BlockType.STONE_BRICKS, 4), blockInput(BlockType.CRYSTAL_ORE, 4)],
    output: createBlockItem(BlockType.ENCHANTED_STONE, "Enchanted Stone", 0x9966FF, 4),
  },
  {
    id: "marble", station: "forge",
    inputs: [blockInput(BlockType.COBBLESTONE, 4), blockInput(BlockType.SAND, 2)],
    output: createBlockItem(BlockType.MARBLE, "Marble", 0xE8E8E0, 4),
  },

  // --- Armor recipes ---
  // Leather (basic, from wood)
  { id: "leather_helm", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 5)], output: _armor("Leather Cap", 1, 0x8B6914, "helmet") },
  { id: "leather_chest", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 8)], output: _armor("Leather Tunic", 2, 0x8B6914, "chest") },
  { id: "leather_legs", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 6)], output: _armor("Leather Leggings", 1, 0x8B6914, "legs") },
  { id: "leather_boots", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 4)], output: _armor("Leather Boots", 1, 0x8B6914, "boots") },

  // Iron Knight armor
  { id: "knight_helm", station: "forge", inputs: [blockInput(BlockType.IRON_ORE, 8)], output: _armor("Knight's Helm", 3, 0xB0B0B0, "helmet") },
  { id: "knight_chest", station: "forge", inputs: [blockInput(BlockType.IRON_ORE, 12)], output: _armor("Knight's Chestplate", 5, 0xB0B0B0, "chest") },
  { id: "knight_legs", station: "forge", inputs: [blockInput(BlockType.IRON_ORE, 10)], output: _armor("Knight's Greaves", 3, 0xB0B0B0, "legs") },
  { id: "knight_boots", station: "forge", inputs: [blockInput(BlockType.IRON_ORE, 6)], output: _armor("Knight's Sabatons", 2, 0xB0B0B0, "boots") },

  // Gold Royal armor
  { id: "gold_helm", station: "forge", inputs: [blockInput(BlockType.GOLD_ORE, 10)], output: _armor("Royal Crown", 4, 0xFFD700, "helmet") },
  { id: "gold_chest", station: "forge", inputs: [blockInput(BlockType.GOLD_ORE, 16)], output: _armor("Royal Breastplate", 6, 0xFFD700, "chest") },
  { id: "gold_legs", station: "forge", inputs: [blockInput(BlockType.GOLD_ORE, 12)], output: _armor("Royal Cuisses", 4, 0xFFD700, "legs") },
  { id: "gold_boots", station: "forge", inputs: [blockInput(BlockType.GOLD_ORE, 8)], output: _armor("Royal Greaves", 3, 0xFFD700, "boots") },

  // Crystal armor
  { id: "crystal_helm", station: "forge", inputs: [blockInput(BlockType.CRYSTAL_ORE, 12), blockInput(BlockType.IRON_ORE, 4)], output: _armor("Crystal Circlet", 5, 0xAA44FF, "helmet") },
  { id: "crystal_chest", station: "forge", inputs: [blockInput(BlockType.CRYSTAL_ORE, 18), blockInput(BlockType.IRON_ORE, 6)], output: _armor("Crystal Mail", 8, 0xAA44FF, "chest") },
  { id: "crystal_legs", station: "forge", inputs: [blockInput(BlockType.CRYSTAL_ORE, 14), blockInput(BlockType.IRON_ORE, 4)], output: _armor("Crystal Greaves", 5, 0xAA44FF, "legs") },
  { id: "crystal_boots", station: "forge", inputs: [blockInput(BlockType.CRYSTAL_ORE, 10), blockInput(BlockType.IRON_ORE, 3)], output: _armor("Crystal Sabatons", 4, 0xAA44FF, "boots") },

  // Dragon bone armor (endgame)
  { id: "dragon_helm", station: "forge", inputs: [blockInput(BlockType.DRAGON_BONE_ORE, 10), blockInput(BlockType.CRYSTAL_ORE, 5)], output: _armor("Dragon Helm", 7, 0xCC2222, "helmet") },
  { id: "dragon_chest", station: "forge", inputs: [blockInput(BlockType.DRAGON_BONE_ORE, 16), blockInput(BlockType.CRYSTAL_ORE, 8)], output: _armor("Dragon Mail", 10, 0xCC2222, "chest") },
  { id: "dragon_legs", station: "forge", inputs: [blockInput(BlockType.DRAGON_BONE_ORE, 12), blockInput(BlockType.CRYSTAL_ORE, 6)], output: _armor("Dragon Greaves", 7, 0xCC2222, "legs") },
  { id: "dragon_boots", station: "forge", inputs: [blockInput(BlockType.DRAGON_BONE_ORE, 8), blockInput(BlockType.CRYSTAL_ORE, 4)], output: _armor("Dragon Boots", 5, 0xCC2222, "boots") },

  // Bow
  { id: "wood_bow", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 4), blockInput(BlockType.PLANKS, 2)], output: createToolItem(ToolType.BOW, ToolMaterial.WOOD, "Wooden Bow", 0xC4A35A, 6) },
  { id: "iron_bow", station: "forge", inputs: [blockInput(BlockType.IRON_ORE, 6), blockInput(BlockType.OAK_LOG, 3)], output: createToolItem(ToolType.BOW, ToolMaterial.IRON, "Iron Bow", 0xB0B0B0, 10) },

  // Staff
  { id: "wood_staff", station: "round_table", inputs: [blockInput(BlockType.OAK_LOG, 6), blockInput(BlockType.CRYSTAL_ORE, 1)], output: createToolItem(ToolType.STAFF, ToolMaterial.WOOD, "Apprentice Staff", 0xC4A35A, 8) },
];

// ---------------------------------------------------------------------------
// Smelting recipes (Forge only)
// ---------------------------------------------------------------------------

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { inputBlockType: BlockType.SAND, outputBlockType: BlockType.ICE, outputName: "Glass", outputColor: 0xAADDFF, burnTime: 3 },
  { inputBlockType: BlockType.COBBLESTONE, outputBlockType: BlockType.STONE, outputName: "Stone", outputColor: 0x808080, burnTime: 5 },
  { inputBlockType: BlockType.CLAY, outputBlockType: BlockType.STONE_BRICKS, outputName: "Bricks", outputColor: 0x7A7A7A, burnTime: 4 },
];
