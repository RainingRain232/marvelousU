// ---------------------------------------------------------------------------
// Camelot Craft – Block definitions
// ---------------------------------------------------------------------------

export enum BlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  OAK_LOG = 4,
  OAK_LEAVES = 5,
  SAND = 6,
  WATER = 7,
  COBBLESTONE = 8,
  OAK_PLANKS = 9,
  IRON_ORE = 10,
  GOLD_ORE = 11,
  ENCHANTED_CRYSTAL_ORE = 12,
  DRAGON_BONE_ORE = 13,
  BEDROCK = 14,
  GRAVEL = 15,
  CLAY = 16,
  SNOW = 17,
  ICE = 18,
  MOSS_STONE = 19,

  // Crafted / building blocks
  STONE_BRICKS = 20,
  CASTLE_WALL = 21,
  CASTLE_BATTLEMENT = 22,
  MARBLE = 23,
  MARBLE_PILLAR = 24,
  DARK_STONE = 25,
  ENCHANTED_STONE = 26,
  HOLY_STONE = 27,
  STAINED_GLASS = 28,
  IRON_BLOCK = 29,
  GOLD_BLOCK = 30,
  CRYSTAL_BLOCK = 31,
  ROUND_TABLE = 32,
  THRONE = 33,
  BANNER_BLOCK = 34,
  TORCH = 35,
  ENCHANTED_TORCH = 36,
  CRAFTING_TABLE = 37,
  FURNACE = 38,
  ANVIL = 39,
  CHEST = 40,
  HOLY_WATER_SOURCE = 41,
  GRAIL_PEDESTAL = 42,
  WOODEN_DOOR = 43,
  IRON_DOOR = 44,

  // Nature
  TALL_GRASS = 45,
  FLOWER_RED = 46,
  FLOWER_BLUE = 47,
  MUSHROOM = 48,
  ENCHANTED_FLOWER = 49,
  WILLOW_LOG = 50,
  WILLOW_LEAVES = 51,
  DARK_OAK_LOG = 52,
  DARK_OAK_LEAVES = 53,
  MARSH_GRASS = 54,
  LILY_PAD = 55,
}

export enum ToolType {
  NONE = "none",
  PICKAXE = "pickaxe",
  AXE = "axe",
  SHOVEL = "shovel",
  SWORD = "sword",
  HOE = "hoe",
}

export enum ToolMaterial {
  WOOD = "wood",
  STONE = "stone",
  IRON = "iron",
  GOLD = "gold",
  CRYSTAL = "crystal",
  EXCALIBUR = "excalibur",
}

export interface BlockDef {
  id: BlockType;
  name: string;
  hardness: number;       // seconds to mine bare-hand (0 = instant, -1 = unbreakable)
  bestTool: ToolType;
  transparent: boolean;
  solid: boolean;         // has collision
  lightEmit: number;      // 0-15 light level emitted
  color: number;          // hex color for rendering
  topColor?: number;      // optional different top face color
  sideColor?: number;     // optional different side face color
  drops?: BlockType;      // what item drops (defaults to self)
  stackable: boolean;
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]: {
    id: BlockType.AIR, name: "Air", hardness: 0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x000000, stackable: false,
  },
  [BlockType.STONE]: {
    id: BlockType.STONE, name: "Stone", hardness: 1.5, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x808080, drops: BlockType.COBBLESTONE, stackable: true,
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT, name: "Dirt", hardness: 0.5, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0x8B6914, stackable: true,
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS, name: "Grass", hardness: 0.6, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0x567D46,
    topColor: 0x4CAF50, sideColor: 0x8B6914, drops: BlockType.DIRT, stackable: true,
  },
  [BlockType.OAK_LOG]: {
    id: BlockType.OAK_LOG, name: "Oak Log", hardness: 2.0, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x6B4226, topColor: 0x9E7B4F, stackable: true,
  },
  [BlockType.OAK_LEAVES]: {
    id: BlockType.OAK_LEAVES, name: "Oak Leaves", hardness: 0.2, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x2E7D32, stackable: true,
  },
  [BlockType.SAND]: {
    id: BlockType.SAND, name: "Sand", hardness: 0.5, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0xC2B280, stackable: true,
  },
  [BlockType.WATER]: {
    id: BlockType.WATER, name: "Water", hardness: -1, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x2196F3, stackable: false,
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE, name: "Cobblestone", hardness: 2.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x6B6B6B, stackable: true,
  },
  [BlockType.OAK_PLANKS]: {
    id: BlockType.OAK_PLANKS, name: "Oak Planks", hardness: 2.0, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xB8860B, stackable: true,
  },
  [BlockType.IRON_ORE]: {
    id: BlockType.IRON_ORE, name: "Iron Ore", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xA0826D, stackable: true,
  },
  [BlockType.GOLD_ORE]: {
    id: BlockType.GOLD_ORE, name: "Gold Ore", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xD4AF37, stackable: true,
  },
  [BlockType.ENCHANTED_CRYSTAL_ORE]: {
    id: BlockType.ENCHANTED_CRYSTAL_ORE, name: "Enchanted Crystal", hardness: 4.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 6, color: 0x9C27B0, stackable: true,
  },
  [BlockType.DRAGON_BONE_ORE]: {
    id: BlockType.DRAGON_BONE_ORE, name: "Dragon Bone", hardness: 5.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 2, color: 0xE0D8C8, stackable: true,
  },
  [BlockType.BEDROCK]: {
    id: BlockType.BEDROCK, name: "Bedrock", hardness: -1, bestTool: ToolType.NONE,
    transparent: false, solid: true, lightEmit: 0, color: 0x333333, stackable: false,
  },
  [BlockType.GRAVEL]: {
    id: BlockType.GRAVEL, name: "Gravel", hardness: 0.6, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0x7A7A7A, stackable: true,
  },
  [BlockType.CLAY]: {
    id: BlockType.CLAY, name: "Clay", hardness: 0.6, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0xA4A4B8, stackable: true,
  },
  [BlockType.SNOW]: {
    id: BlockType.SNOW, name: "Snow", hardness: 0.2, bestTool: ToolType.SHOVEL,
    transparent: false, solid: true, lightEmit: 0, color: 0xF5F5F5, stackable: true,
  },
  [BlockType.ICE]: {
    id: BlockType.ICE, name: "Ice", hardness: 0.5, bestTool: ToolType.PICKAXE,
    transparent: true, solid: true, lightEmit: 0, color: 0xB3E5FC, stackable: true,
  },
  [BlockType.MOSS_STONE]: {
    id: BlockType.MOSS_STONE, name: "Mossy Stone", hardness: 2.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x5E7D5E, stackable: true,
  },

  // --- Crafted / building ---
  [BlockType.STONE_BRICKS]: {
    id: BlockType.STONE_BRICKS, name: "Stone Bricks", hardness: 2.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x909090, stackable: true,
  },
  [BlockType.CASTLE_WALL]: {
    id: BlockType.CASTLE_WALL, name: "Castle Wall", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xA0A0A0, stackable: true,
  },
  [BlockType.CASTLE_BATTLEMENT]: {
    id: BlockType.CASTLE_BATTLEMENT, name: "Battlement", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x989898, stackable: true,
  },
  [BlockType.MARBLE]: {
    id: BlockType.MARBLE, name: "Marble", hardness: 2.5, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xE8E8E8, stackable: true,
  },
  [BlockType.MARBLE_PILLAR]: {
    id: BlockType.MARBLE_PILLAR, name: "Marble Pillar", hardness: 2.5, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xF0F0E8, stackable: true,
  },
  [BlockType.DARK_STONE]: {
    id: BlockType.DARK_STONE, name: "Dark Stone", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x3A3A3A, stackable: true,
  },
  [BlockType.ENCHANTED_STONE]: {
    id: BlockType.ENCHANTED_STONE, name: "Enchanted Stone", hardness: 4.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 8, color: 0x7B68EE, stackable: true,
  },
  [BlockType.HOLY_STONE]: {
    id: BlockType.HOLY_STONE, name: "Holy Stone", hardness: 4.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 10, color: 0xFFF8DC, stackable: true,
  },
  [BlockType.STAINED_GLASS]: {
    id: BlockType.STAINED_GLASS, name: "Stained Glass", hardness: 0.3, bestTool: ToolType.NONE,
    transparent: true, solid: true, lightEmit: 0, color: 0xE91E63, stackable: true,
  },
  [BlockType.IRON_BLOCK]: {
    id: BlockType.IRON_BLOCK, name: "Iron Block", hardness: 5.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xC0C0C0, stackable: true,
  },
  [BlockType.GOLD_BLOCK]: {
    id: BlockType.GOLD_BLOCK, name: "Gold Block", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xFFD700, stackable: true,
  },
  [BlockType.CRYSTAL_BLOCK]: {
    id: BlockType.CRYSTAL_BLOCK, name: "Crystal Block", hardness: 5.0, bestTool: ToolType.PICKAXE,
    transparent: true, solid: true, lightEmit: 12, color: 0xCE93D8, stackable: true,
  },
  [BlockType.ROUND_TABLE]: {
    id: BlockType.ROUND_TABLE, name: "Round Table", hardness: 2.5, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x8B4513, stackable: false,
  },
  [BlockType.THRONE]: {
    id: BlockType.THRONE, name: "Throne", hardness: 3.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xDAA520, stackable: false,
  },
  [BlockType.BANNER_BLOCK]: {
    id: BlockType.BANNER_BLOCK, name: "Pendragon Banner", hardness: 0.5, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0xB71C1C, stackable: true,
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH, name: "Torch", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 14, color: 0xFFA726, stackable: true,
  },
  [BlockType.ENCHANTED_TORCH]: {
    id: BlockType.ENCHANTED_TORCH, name: "Enchanted Torch", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 15, color: 0xAB47BC, stackable: true,
  },
  [BlockType.CRAFTING_TABLE]: {
    id: BlockType.CRAFTING_TABLE, name: "Crafting Table", hardness: 2.5, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xA0522D, topColor: 0xCD853F, stackable: true,
  },
  [BlockType.FURNACE]: {
    id: BlockType.FURNACE, name: "Furnace", hardness: 3.5, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 4, color: 0x696969, stackable: true,
  },
  [BlockType.ANVIL]: {
    id: BlockType.ANVIL, name: "Anvil", hardness: 5.0, bestTool: ToolType.PICKAXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x484848, stackable: true,
  },
  [BlockType.CHEST]: {
    id: BlockType.CHEST, name: "Chest", hardness: 2.5, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0xA0522D, stackable: false,
  },
  [BlockType.HOLY_WATER_SOURCE]: {
    id: BlockType.HOLY_WATER_SOURCE, name: "Holy Water", hardness: -1, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 8, color: 0x80D8FF, stackable: false,
  },
  [BlockType.GRAIL_PEDESTAL]: {
    id: BlockType.GRAIL_PEDESTAL, name: "Grail Pedestal", hardness: -1, bestTool: ToolType.NONE,
    transparent: false, solid: true, lightEmit: 15, color: 0xFFEB3B, stackable: false,
  },
  [BlockType.WOODEN_DOOR]: {
    id: BlockType.WOODEN_DOOR, name: "Wooden Door", hardness: 3.0, bestTool: ToolType.AXE,
    transparent: true, solid: true, lightEmit: 0, color: 0x8B6914, stackable: true,
  },
  [BlockType.IRON_DOOR]: {
    id: BlockType.IRON_DOOR, name: "Iron Door", hardness: 5.0, bestTool: ToolType.PICKAXE,
    transparent: true, solid: true, lightEmit: 0, color: 0xB0B0B0, stackable: true,
  },

  // --- Nature ---
  [BlockType.TALL_GRASS]: {
    id: BlockType.TALL_GRASS, name: "Tall Grass", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x66BB6A, stackable: true,
  },
  [BlockType.FLOWER_RED]: {
    id: BlockType.FLOWER_RED, name: "Red Rose", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0xE53935, stackable: true,
  },
  [BlockType.FLOWER_BLUE]: {
    id: BlockType.FLOWER_BLUE, name: "Bluebell", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x42A5F5, stackable: true,
  },
  [BlockType.MUSHROOM]: {
    id: BlockType.MUSHROOM, name: "Mushroom", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x8D6E63, stackable: true,
  },
  [BlockType.ENCHANTED_FLOWER]: {
    id: BlockType.ENCHANTED_FLOWER, name: "Enchanted Flower", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 6, color: 0xE040FB, stackable: true,
  },
  [BlockType.WILLOW_LOG]: {
    id: BlockType.WILLOW_LOG, name: "Willow Log", hardness: 2.0, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x5D4037, topColor: 0x7B6B4E, stackable: true,
  },
  [BlockType.WILLOW_LEAVES]: {
    id: BlockType.WILLOW_LEAVES, name: "Willow Leaves", hardness: 0.2, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x558B2F, stackable: true,
  },
  [BlockType.DARK_OAK_LOG]: {
    id: BlockType.DARK_OAK_LOG, name: "Dark Oak Log", hardness: 2.5, bestTool: ToolType.AXE,
    transparent: false, solid: true, lightEmit: 0, color: 0x3E2723, topColor: 0x5D4037, stackable: true,
  },
  [BlockType.DARK_OAK_LEAVES]: {
    id: BlockType.DARK_OAK_LEAVES, name: "Dark Oak Leaves", hardness: 0.2, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x1B5E20, stackable: true,
  },
  [BlockType.MARSH_GRASS]: {
    id: BlockType.MARSH_GRASS, name: "Marsh Grass", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x6D7B3C, stackable: true,
  },
  [BlockType.LILY_PAD]: {
    id: BlockType.LILY_PAD, name: "Lily Pad", hardness: 0.0, bestTool: ToolType.NONE,
    transparent: true, solid: false, lightEmit: 0, color: 0x33691E, stackable: true,
  },
};

/** Check if a block is see-through for meshing purposes. */
export function isTransparent(block: BlockType): boolean {
  return BLOCK_DEFS[block]?.transparent ?? true;
}

/** Check if a block has collision. */
export function isSolid(block: BlockType): boolean {
  return BLOCK_DEFS[block]?.solid ?? false;
}

/** Get what a block drops when mined. */
export function getBlockDrop(block: BlockType): BlockType {
  const def = BLOCK_DEFS[block];
  return def?.drops ?? block;
}
