// ---------------------------------------------------------------------------
// Camelot Craft – Biome definitions
// ---------------------------------------------------------------------------

import { BlockType } from "./CraftBlockDefs";

export enum BiomeType {
  SACRED_HILLS = "sacred_hills",        // Glastonbury Tor – rolling green hills
  ENCHANTED_FOREST = "enchanted_forest", // Brocéliande – dense magical forest
  MISTY_MARSHLANDS = "misty_marshlands", // Avalon approach – foggy wetlands
  DARK_CAVERNS = "dark_caverns",         // Morgan le Fay's domain – deep ravines
  CRYSTAL_LAKE = "crystal_lake",         // Lady of the Lake – sparkling waters
  SAXON_WASTES = "saxon_wastes",         // Barren, war-scarred lands
  SNOW_PEAKS = "snow_peaks",             // Northern mountains
  ANCIENT_RUINS = "ancient_ruins",       // Roman/Celtic ruins
}

export interface BiomeDef {
  id: BiomeType;
  name: string;
  surfaceBlock: BlockType;
  subsurfaceBlock: BlockType;
  stoneBlock: BlockType;
  waterBlock: BlockType;
  treeLogBlock: BlockType;
  treeLeafBlock: BlockType;
  foliageBlocks: BlockType[];
  temperatureRange: [number, number]; // noise value range
  moistureRange: [number, number];
  heightMod: number;       // added to base terrain height
  heightScale: number;     // multiplied with terrain noise
  treeDensity: number;     // multiplier on base tree density
  oreDensityMult: number;  // multiplier for ore generation
  fogColor: number;
  fogDensity: number;
  ambientLight: number;    // 0-1
  skyColor: number;
}

export const BIOME_DEFS: Record<BiomeType, BiomeDef> = {
  [BiomeType.SACRED_HILLS]: {
    id: BiomeType.SACRED_HILLS,
    name: "Sacred Hills of Glastonbury",
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    stoneBlock: BlockType.STONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.OAK_LOG,
    treeLeafBlock: BlockType.OAK_LEAVES,
    foliageBlocks: [BlockType.TALL_GRASS, BlockType.FLOWER_RED, BlockType.FLOWER_BLUE],
    temperatureRange: [0.3, 0.7],
    moistureRange: [0.3, 0.6],
    heightMod: 4,
    heightScale: 1.3,
    treeDensity: 0.6,
    oreDensityMult: 1.0,
    fogColor: 0xC8D8E8,
    fogDensity: 0.001,
    ambientLight: 0.7,
    skyColor: 0x87CEEB,
  },

  [BiomeType.ENCHANTED_FOREST]: {
    id: BiomeType.ENCHANTED_FOREST,
    name: "Enchanted Forest of Brocéliande",
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.DIRT,
    stoneBlock: BlockType.MOSS_STONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.DARK_OAK_LOG,
    treeLeafBlock: BlockType.DARK_OAK_LEAVES,
    foliageBlocks: [BlockType.TALL_GRASS, BlockType.MUSHROOM, BlockType.ENCHANTED_FLOWER],
    temperatureRange: [0.4, 0.8],
    moistureRange: [0.6, 1.0],
    heightMod: 0,
    heightScale: 0.8,
    treeDensity: 3.0,
    oreDensityMult: 1.5,
    fogColor: 0x2E4A2E,
    fogDensity: 0.008,
    ambientLight: 0.4,
    skyColor: 0x4A6A4A,
  },

  [BiomeType.MISTY_MARSHLANDS]: {
    id: BiomeType.MISTY_MARSHLANDS,
    name: "Misty Marshlands of Avalon",
    surfaceBlock: BlockType.MARSH_GRASS,
    subsurfaceBlock: BlockType.CLAY,
    stoneBlock: BlockType.STONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.WILLOW_LOG,
    treeLeafBlock: BlockType.WILLOW_LEAVES,
    foliageBlocks: [BlockType.MARSH_GRASS, BlockType.LILY_PAD, BlockType.MUSHROOM],
    temperatureRange: [0.3, 0.6],
    moistureRange: [0.8, 1.0],
    heightMod: -4,
    heightScale: 0.4,
    treeDensity: 0.8,
    oreDensityMult: 0.5,
    fogColor: 0xB8C8D0,
    fogDensity: 0.015,
    ambientLight: 0.5,
    skyColor: 0x9EB0B8,
  },

  [BiomeType.DARK_CAVERNS]: {
    id: BiomeType.DARK_CAVERNS,
    name: "Dark Caverns of Morgan le Fay",
    surfaceBlock: BlockType.DARK_STONE,
    subsurfaceBlock: BlockType.DARK_STONE,
    stoneBlock: BlockType.DARK_STONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.DARK_OAK_LOG,
    treeLeafBlock: BlockType.DARK_OAK_LEAVES,
    foliageBlocks: [BlockType.MUSHROOM, BlockType.ENCHANTED_FLOWER],
    temperatureRange: [0.0, 0.3],
    moistureRange: [0.0, 0.4],
    heightMod: 8,
    heightScale: 2.0,
    treeDensity: 0.2,
    oreDensityMult: 2.5,
    fogColor: 0x1A1020,
    fogDensity: 0.01,
    ambientLight: 0.25,
    skyColor: 0x2A1A3A,
  },

  [BiomeType.CRYSTAL_LAKE]: {
    id: BiomeType.CRYSTAL_LAKE,
    name: "Crystal Lake of the Lady",
    surfaceBlock: BlockType.SAND,
    subsurfaceBlock: BlockType.SAND,
    stoneBlock: BlockType.STONE,
    waterBlock: BlockType.HOLY_WATER_SOURCE,
    treeLogBlock: BlockType.WILLOW_LOG,
    treeLeafBlock: BlockType.WILLOW_LEAVES,
    foliageBlocks: [BlockType.FLOWER_BLUE, BlockType.ENCHANTED_FLOWER, BlockType.LILY_PAD],
    temperatureRange: [0.4, 0.7],
    moistureRange: [0.7, 1.0],
    heightMod: -6,
    heightScale: 0.3,
    treeDensity: 0.4,
    oreDensityMult: 1.2,
    fogColor: 0xC8E0F0,
    fogDensity: 0.005,
    ambientLight: 0.8,
    skyColor: 0xB0D8F0,
  },

  [BiomeType.SAXON_WASTES]: {
    id: BiomeType.SAXON_WASTES,
    name: "Saxon Wastes",
    surfaceBlock: BlockType.GRAVEL,
    subsurfaceBlock: BlockType.DIRT,
    stoneBlock: BlockType.COBBLESTONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.OAK_LOG,
    treeLeafBlock: BlockType.OAK_LEAVES,
    foliageBlocks: [BlockType.TALL_GRASS],
    temperatureRange: [0.2, 0.5],
    moistureRange: [0.0, 0.3],
    heightMod: 0,
    heightScale: 1.0,
    treeDensity: 0.1,
    oreDensityMult: 0.8,
    fogColor: 0x8A8070,
    fogDensity: 0.003,
    ambientLight: 0.6,
    skyColor: 0xA09888,
  },

  [BiomeType.SNOW_PEAKS]: {
    id: BiomeType.SNOW_PEAKS,
    name: "Northern Snow Peaks",
    surfaceBlock: BlockType.SNOW,
    subsurfaceBlock: BlockType.DIRT,
    stoneBlock: BlockType.STONE,
    waterBlock: BlockType.ICE,
    treeLogBlock: BlockType.OAK_LOG,
    treeLeafBlock: BlockType.OAK_LEAVES,
    foliageBlocks: [],
    temperatureRange: [0.0, 0.2],
    moistureRange: [0.3, 0.7],
    heightMod: 12,
    heightScale: 2.5,
    treeDensity: 0.15,
    oreDensityMult: 1.8,
    fogColor: 0xE0E8F0,
    fogDensity: 0.002,
    ambientLight: 0.75,
    skyColor: 0xD0E0F0,
  },

  [BiomeType.ANCIENT_RUINS]: {
    id: BiomeType.ANCIENT_RUINS,
    name: "Ancient Roman Ruins",
    surfaceBlock: BlockType.GRASS,
    subsurfaceBlock: BlockType.COBBLESTONE,
    stoneBlock: BlockType.MOSS_STONE,
    waterBlock: BlockType.WATER,
    treeLogBlock: BlockType.OAK_LOG,
    treeLeafBlock: BlockType.OAK_LEAVES,
    foliageBlocks: [BlockType.TALL_GRASS, BlockType.FLOWER_RED, BlockType.MUSHROOM],
    temperatureRange: [0.5, 0.8],
    moistureRange: [0.3, 0.6],
    heightMod: 2,
    heightScale: 1.0,
    treeDensity: 0.4,
    oreDensityMult: 1.3,
    fogColor: 0xC0C8B0,
    fogDensity: 0.002,
    ambientLight: 0.65,
    skyColor: 0x90A888,
  },
};

/** Get biome for temperature/moisture values (both 0-1). */
export function getBiome(temperature: number, moisture: number): BiomeType {
  let best: BiomeType = BiomeType.SACRED_HILLS;
  let bestDist = Infinity;

  for (const [type, def] of Object.entries(BIOME_DEFS)) {
    const tMid = (def.temperatureRange[0] + def.temperatureRange[1]) / 2;
    const mMid = (def.moistureRange[0] + def.moistureRange[1]) / 2;

    // Check if within range
    if (
      temperature >= def.temperatureRange[0] &&
      temperature <= def.temperatureRange[1] &&
      moisture >= def.moistureRange[0] &&
      moisture <= def.moistureRange[1]
    ) {
      const d = (temperature - tMid) ** 2 + (moisture - mMid) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = type as BiomeType;
      }
    }
  }

  // Fallback: find closest biome center
  if (bestDist === Infinity) {
    for (const [type, def] of Object.entries(BIOME_DEFS)) {
      const tMid = (def.temperatureRange[0] + def.temperatureRange[1]) / 2;
      const mMid = (def.moistureRange[0] + def.moistureRange[1]) / 2;
      const d = (temperature - tMid) ** 2 + (moisture - mMid) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = type as BiomeType;
      }
    }
  }

  return best;
}
