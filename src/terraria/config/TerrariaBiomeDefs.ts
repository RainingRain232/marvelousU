// ---------------------------------------------------------------------------
// Terraria – Biome definitions
// ---------------------------------------------------------------------------

import { BlockType } from "./TerrariaBlockDefs";

export enum BiomeType {
  ENCHANTED_FOREST = 0,
  SACRED_MEADOW,
  MISTY_MARSHLANDS,
  SNOW_PEAKS,
  SAXON_WASTES,
  CRYSTAL_CAVERNS,
  VOLCANIC_BADLANDS,
  ANCIENT_RUINS,
}

export interface BiomeDef {
  type: BiomeType;
  name: string;
  surfaceBlock: BlockType;
  subsurfaceBlock: BlockType;
  heightMod: number;      // added to base surface height
  heightScale: number;    // multiplier for terrain variation
  treeDensity: number;    // multiplier for tree spawn chance
  treeLog: BlockType;
  treeLeaves: BlockType;
  skyTint: number;        // color tint for sky
}

export const BIOME_DEFS: BiomeDef[] = [
  {
    type: BiomeType.ENCHANTED_FOREST,
    name: "Enchanted Forest",
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    heightMod: 2, heightScale: 1.2,
    treeDensity: 2.0,
    treeLog: BlockType.DARK_OAK_LOG,
    treeLeaves: BlockType.DARK_OAK_LEAVES,
    skyTint: 0x1a3a1a,
  },
  {
    type: BiomeType.SACRED_MEADOW,
    name: "Sacred Meadow",
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    heightMod: 0, heightScale: 0.6,
    treeDensity: 0.5,
    treeLog: BlockType.OAK_LOG,
    treeLeaves: BlockType.OAK_LEAVES,
    skyTint: 0x2a3a1a,
  },
  {
    type: BiomeType.MISTY_MARSHLANDS,
    name: "Misty Marshlands",
    surfaceBlock: BlockType.MUD,
    subsurfaceBlock: BlockType.CLAY,
    heightMod: -4, heightScale: 0.4,
    treeDensity: 1.0,
    treeLog: BlockType.WILLOW_LOG,
    treeLeaves: BlockType.WILLOW_LEAVES,
    skyTint: 0x1a2a2a,
  },
  {
    type: BiomeType.SNOW_PEAKS,
    name: "Snow Peaks",
    surfaceBlock: BlockType.SNOW,
    subsurfaceBlock: BlockType.DIRT,
    heightMod: 8, heightScale: 1.8,
    treeDensity: 0.3,
    treeLog: BlockType.OAK_LOG,
    treeLeaves: BlockType.OAK_LEAVES,
    skyTint: 0x2a3a4a,
  },
  {
    type: BiomeType.SAXON_WASTES,
    name: "Saxon Wastes",
    surfaceBlock: BlockType.SAND,
    subsurfaceBlock: BlockType.SAND,
    heightMod: -2, heightScale: 0.8,
    treeDensity: 0.1,
    treeLog: BlockType.OAK_LOG,
    treeLeaves: BlockType.OAK_LEAVES,
    skyTint: 0x3a2a1a,
  },
  {
    type: BiomeType.CRYSTAL_CAVERNS,
    name: "Crystal Caverns",
    surfaceBlock: BlockType.STONE,
    subsurfaceBlock: BlockType.STONE,
    heightMod: -6, heightScale: 1.5,
    treeDensity: 0.0,
    treeLog: BlockType.OAK_LOG,
    treeLeaves: BlockType.OAK_LEAVES,
    skyTint: 0x2a1a3a,
  },
  {
    type: BiomeType.VOLCANIC_BADLANDS,
    name: "Volcanic Badlands",
    surfaceBlock: BlockType.GRAVEL,
    subsurfaceBlock: BlockType.STONE,
    heightMod: 4, heightScale: 2.0,
    treeDensity: 0.0,
    treeLog: BlockType.DARK_OAK_LOG,
    treeLeaves: BlockType.DARK_OAK_LEAVES,
    skyTint: 0x3a1a0a,
  },
  {
    type: BiomeType.ANCIENT_RUINS,
    name: "Ancient Ruins",
    surfaceBlock: BlockType.COBBLESTONE,
    subsurfaceBlock: BlockType.STONE_BRICKS,
    heightMod: 1, heightScale: 0.7,
    treeDensity: 0.3,
    treeLog: BlockType.DARK_OAK_LOG,
    treeLeaves: BlockType.DARK_OAK_LEAVES,
    skyTint: 0x2a2a1a,
  },
];

/** Get biome at a world X position using noise. */
export function getBiomeAt(noiseValue: number): BiomeDef {
  // Map noise (-1 to 1) to biome index
  const n = (noiseValue + 1) / 2; // 0 to 1
  const idx = Math.min(BIOME_DEFS.length - 1, Math.floor(n * BIOME_DEFS.length));
  return BIOME_DEFS[idx];
}
