// ---------------------------------------------------------------------------
// Terraria – Block type definitions
// ---------------------------------------------------------------------------

export enum BlockType {
  AIR = 0,
  STONE,
  DIRT,
  GRASS,
  SAND,
  GRAVEL,
  CLAY,
  SNOW,
  ICE,
  MUD,
  COBBLESTONE,
  MOSS_STONE,

  // Ores
  IRON_ORE,
  GOLD_ORE,
  CRYSTAL_ORE,
  DRAGON_BONE_ORE,

  // Wood & plants
  OAK_LOG,
  OAK_LEAVES,
  WILLOW_LOG,
  WILLOW_LEAVES,
  DARK_OAK_LOG,
  DARK_OAK_LEAVES,
  PLANKS,

  // Crafted stone
  STONE_BRICKS,
  CASTLE_WALL,
  MARBLE,
  HOLY_STONE,
  ENCHANTED_STONE,

  // Functional
  ROUND_TABLE,     // workbench
  FORGE,           // furnace
  CHEST,
  WOODEN_DOOR,
  IRON_DOOR,
  TORCH,
  ENCHANTED_TORCH,

  // Special
  GRAIL_PEDESTAL,
  THRONE,
  BANNER,
  BEDROCK,

  // Liquids
  WATER,
  LAVA,

  // Decoration
  TALL_GRASS,
  RED_FLOWER,
  BLUE_FLOWER,
  MUSHROOM,

  // Background walls (used in wall layer, not block layer)
  // ... walls are separate, using WallType enum

  _COUNT,
}

export enum WallType {
  NONE = 0,
  DIRT_WALL,
  STONE_WALL,
  WOOD_WALL,
  CASTLE_WALL,
  _COUNT,
}

export enum ToolType {
  NONE = 0,
  PICKAXE,
  AXE,
  SHOVEL,
  SWORD,
  HAMMER,
  BOW,
  STAFF,
}

export enum ToolMaterial {
  WOOD = 0,
  STONE,
  IRON,
  GOLD,
  CRYSTAL,
  EXCALIBUR,
}

export interface BlockDef {
  id: BlockType;
  name: string;
  hardness: number;    // seconds to mine bare-hand; 0 = instant; -1 = unbreakable
  bestTool: ToolType;
  transparent: boolean;
  solid: boolean;
  lightEmit: number;   // 0-15
  color: number;       // hex RGB
  drops?: BlockType;
  stackable: boolean;
  hasGravity?: boolean;
  liquid?: boolean;
}

export const BLOCK_DEFS: Record<number, BlockDef> = {
  [BlockType.AIR]:              { id: BlockType.AIR, name: "Air", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0x000000, stackable: false },
  [BlockType.STONE]:            { id: BlockType.STONE, name: "Stone", hardness: 1.5, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0x808080, drops: BlockType.COBBLESTONE, stackable: true },
  [BlockType.DIRT]:             { id: BlockType.DIRT, name: "Dirt", hardness: 0.5, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0x8B6914, stackable: true },
  [BlockType.GRASS]:            { id: BlockType.GRASS, name: "Grass", hardness: 0.6, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0x4CAF50, drops: BlockType.DIRT, stackable: true },
  [BlockType.SAND]:             { id: BlockType.SAND, name: "Sand", hardness: 0.4, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0xD2B48C, stackable: true, hasGravity: true },
  [BlockType.GRAVEL]:           { id: BlockType.GRAVEL, name: "Gravel", hardness: 0.6, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0x9E9E9E, stackable: true, hasGravity: true },
  [BlockType.CLAY]:             { id: BlockType.CLAY, name: "Clay", hardness: 0.6, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0xB0846A, stackable: true },
  [BlockType.SNOW]:             { id: BlockType.SNOW, name: "Snow", hardness: 0.3, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0xF0F0FF, stackable: true },
  [BlockType.ICE]:              { id: BlockType.ICE, name: "Ice", hardness: 0.8, bestTool: ToolType.PICKAXE, transparent: true, solid: true, lightEmit: 0, color: 0xAADDFF, stackable: true },
  [BlockType.MUD]:              { id: BlockType.MUD, name: "Mud", hardness: 0.4, bestTool: ToolType.SHOVEL, transparent: false, solid: true, lightEmit: 0, color: 0x5C4033, stackable: true },
  [BlockType.COBBLESTONE]:      { id: BlockType.COBBLESTONE, name: "Cobblestone", hardness: 1.2, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0x6B6B6B, stackable: true },
  [BlockType.MOSS_STONE]:       { id: BlockType.MOSS_STONE, name: "Moss Stone", hardness: 1.2, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0x5A7A50, stackable: true },

  // Ores
  [BlockType.IRON_ORE]:         { id: BlockType.IRON_ORE, name: "Iron Ore", hardness: 2.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0xB87333, stackable: true },
  [BlockType.GOLD_ORE]:         { id: BlockType.GOLD_ORE, name: "Gold Ore", hardness: 2.5, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0xFFD700, stackable: true },
  [BlockType.CRYSTAL_ORE]:      { id: BlockType.CRYSTAL_ORE, name: "Enchanted Crystal", hardness: 3.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 4, color: 0xAA44FF, stackable: true },
  [BlockType.DRAGON_BONE_ORE]:  { id: BlockType.DRAGON_BONE_ORE, name: "Dragon Bone Ore", hardness: 4.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 2, color: 0xCC2222, stackable: true },

  // Wood & plants
  [BlockType.OAK_LOG]:          { id: BlockType.OAK_LOG, name: "Oak Log", hardness: 1.0, bestTool: ToolType.AXE, transparent: false, solid: true, lightEmit: 0, color: 0x6B4226, stackable: true },
  [BlockType.OAK_LEAVES]:       { id: BlockType.OAK_LEAVES, name: "Oak Leaves", hardness: 0.2, bestTool: ToolType.AXE, transparent: true, solid: false, lightEmit: 0, color: 0x228B22, stackable: true },
  [BlockType.WILLOW_LOG]:       { id: BlockType.WILLOW_LOG, name: "Willow Log", hardness: 1.0, bestTool: ToolType.AXE, transparent: false, solid: true, lightEmit: 0, color: 0x5C4033, stackable: true },
  [BlockType.WILLOW_LEAVES]:    { id: BlockType.WILLOW_LEAVES, name: "Willow Leaves", hardness: 0.2, bestTool: ToolType.AXE, transparent: true, solid: false, lightEmit: 0, color: 0x3CB371, stackable: true },
  [BlockType.DARK_OAK_LOG]:     { id: BlockType.DARK_OAK_LOG, name: "Dark Oak Log", hardness: 1.2, bestTool: ToolType.AXE, transparent: false, solid: true, lightEmit: 0, color: 0x3E2723, stackable: true },
  [BlockType.DARK_OAK_LEAVES]:  { id: BlockType.DARK_OAK_LEAVES, name: "Dark Oak Leaves", hardness: 0.2, bestTool: ToolType.AXE, transparent: true, solid: false, lightEmit: 0, color: 0x1B5E20, stackable: true },
  [BlockType.PLANKS]:           { id: BlockType.PLANKS, name: "Planks", hardness: 0.8, bestTool: ToolType.AXE, transparent: false, solid: true, lightEmit: 0, color: 0xC4A35A, stackable: true },

  // Crafted stone
  [BlockType.STONE_BRICKS]:     { id: BlockType.STONE_BRICKS, name: "Stone Bricks", hardness: 1.5, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0x7A7A7A, stackable: true },
  [BlockType.CASTLE_WALL]:      { id: BlockType.CASTLE_WALL, name: "Castle Wall", hardness: 2.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0xA0A0B0, stackable: true },
  [BlockType.MARBLE]:           { id: BlockType.MARBLE, name: "Marble", hardness: 2.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 0, color: 0xE8E8E0, stackable: true },
  [BlockType.HOLY_STONE]:       { id: BlockType.HOLY_STONE, name: "Holy Stone", hardness: 3.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 6, color: 0xFFF8DC, stackable: true },
  [BlockType.ENCHANTED_STONE]:  { id: BlockType.ENCHANTED_STONE, name: "Enchanted Stone", hardness: 3.0, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 5, color: 0x9966FF, stackable: true },

  // Functional
  [BlockType.ROUND_TABLE]:      { id: BlockType.ROUND_TABLE, name: "Round Table", hardness: 1.0, bestTool: ToolType.AXE, transparent: true, solid: true, lightEmit: 0, color: 0xA0785A, stackable: true },
  [BlockType.FORGE]:            { id: BlockType.FORGE, name: "Forge", hardness: 1.5, bestTool: ToolType.PICKAXE, transparent: false, solid: true, lightEmit: 8, color: 0x8B4513, stackable: true },
  [BlockType.CHEST]:            { id: BlockType.CHEST, name: "Chest", hardness: 0.8, bestTool: ToolType.AXE, transparent: true, solid: true, lightEmit: 0, color: 0xB8860B, stackable: true },
  [BlockType.WOODEN_DOOR]:      { id: BlockType.WOODEN_DOOR, name: "Wooden Door", hardness: 0.8, bestTool: ToolType.AXE, transparent: true, solid: false, lightEmit: 0, color: 0x8B6914, stackable: true },
  [BlockType.IRON_DOOR]:        { id: BlockType.IRON_DOOR, name: "Iron Door", hardness: 1.5, bestTool: ToolType.PICKAXE, transparent: true, solid: false, lightEmit: 0, color: 0xAAAAAA, stackable: true },
  [BlockType.TORCH]:            { id: BlockType.TORCH, name: "Torch", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 12, color: 0xFFAA00, stackable: true },
  [BlockType.ENCHANTED_TORCH]:  { id: BlockType.ENCHANTED_TORCH, name: "Enchanted Torch", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 15, color: 0xAA55FF, stackable: true },

  // Special
  [BlockType.GRAIL_PEDESTAL]:   { id: BlockType.GRAIL_PEDESTAL, name: "Grail Pedestal", hardness: -1, bestTool: ToolType.NONE, transparent: true, solid: true, lightEmit: 12, color: 0xFFD700, stackable: false },
  [BlockType.THRONE]:           { id: BlockType.THRONE, name: "Throne", hardness: 2.0, bestTool: ToolType.AXE, transparent: true, solid: true, lightEmit: 0, color: 0x800080, stackable: false },
  [BlockType.BANNER]:           { id: BlockType.BANNER, name: "Banner", hardness: 0.2, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0xCC0000, stackable: true },
  [BlockType.BEDROCK]:          { id: BlockType.BEDROCK, name: "Bedrock", hardness: -1, bestTool: ToolType.NONE, transparent: false, solid: true, lightEmit: 0, color: 0x333333, stackable: false },

  // Liquids
  [BlockType.WATER]:            { id: BlockType.WATER, name: "Water", hardness: -1, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0x2244AA, stackable: false, liquid: true },
  [BlockType.LAVA]:             { id: BlockType.LAVA, name: "Lava", hardness: -1, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 12, color: 0xFF4400, stackable: false, liquid: true },

  // Decoration
  [BlockType.TALL_GRASS]:       { id: BlockType.TALL_GRASS, name: "Tall Grass", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0x5BAF50, stackable: false },
  [BlockType.RED_FLOWER]:       { id: BlockType.RED_FLOWER, name: "Red Flower", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0xFF4444, stackable: true },
  [BlockType.BLUE_FLOWER]:      { id: BlockType.BLUE_FLOWER, name: "Blue Flower", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0x4488FF, stackable: true },
  [BlockType.MUSHROOM]:         { id: BlockType.MUSHROOM, name: "Mushroom", hardness: 0, bestTool: ToolType.NONE, transparent: true, solid: false, lightEmit: 0, color: 0xCC8844, stackable: true },
};

export function getBlockDef(bt: BlockType): BlockDef {
  return BLOCK_DEFS[bt] ?? BLOCK_DEFS[BlockType.AIR];
}
