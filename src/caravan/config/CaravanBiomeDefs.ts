// ---------------------------------------------------------------------------
// Caravan biome definitions — visual themes per segment
// ---------------------------------------------------------------------------

import { MapType } from "@/types";

export interface BiomeDef {
  id: string;
  name: string;
  mapType: MapType;
  roadColor: number;
  roadWornColor: number;
  roadEdgeColor: number;
  treeCanopyColor: number;
  treeTrunkColor: number;
  grassColor: number;
  rockColor: number;
  flowerColors: number[];
  ambientTint: number; // overall tint for mood
}

export const BIOMES: BiomeDef[] = [
  {
    id: "meadow", name: "Green Meadows",
    mapType: MapType.MEADOW,
    roadColor: 0x7A6544, roadWornColor: 0x8B7B5A, roadEdgeColor: 0x777766,
    treeCanopyColor: 0x2D6B1E, treeTrunkColor: 0x5C4A2E,
    grassColor: 0x4A8A2A, rockColor: 0x888877,
    flowerColors: [0xff6688, 0xffaa44, 0x88aaff, 0xff88ff, 0xffff66],
    ambientTint: 0xffffff,
  },
  {
    id: "forest", name: "Dark Forest",
    mapType: MapType.FOREST,
    roadColor: 0x5A4A30, roadWornColor: 0x6B5B3A, roadEdgeColor: 0x555544,
    treeCanopyColor: 0x1A4A12, treeTrunkColor: 0x3A2A18,
    grassColor: 0x2A5A1A, rockColor: 0x555544,
    flowerColors: [0x6688aa, 0x88aa88, 0xaabb99],
    ambientTint: 0xccddcc,
  },
  {
    id: "tundra", name: "Frozen Wastes",
    mapType: MapType.TUNDRA,
    roadColor: 0x8899aa, roadWornColor: 0x99aabb, roadEdgeColor: 0x99aabb,
    treeCanopyColor: 0x3A6655, treeTrunkColor: 0x4A3A2A,
    grassColor: 0x6699aa, rockColor: 0xaabbcc,
    flowerColors: [0xaaccff, 0xccddff, 0xeeeeff],
    ambientTint: 0xccddff,
  },
  {
    id: "desert", name: "Scorched Sands",
    mapType: MapType.PLAINS,
    roadColor: 0xAA9966, roadWornColor: 0xBBAA77, roadEdgeColor: 0x998866,
    treeCanopyColor: 0x6B8833, treeTrunkColor: 0x7A5533,
    grassColor: 0x8B9944, rockColor: 0xBBAA88,
    flowerColors: [0xff8844, 0xffaa22, 0xccaa44],
    ambientTint: 0xffeedd,
  },
  {
    id: "volcanic", name: "Ashlands",
    mapType: MapType.VOLCANIC,
    roadColor: 0x444433, roadWornColor: 0x555544, roadEdgeColor: 0x333322,
    treeCanopyColor: 0x332211, treeTrunkColor: 0x222211,
    grassColor: 0x554422, rockColor: 0x555544,
    flowerColors: [0xff4422, 0xff6633, 0xffaa44],
    ambientTint: 0xffddcc,
  },
];

/** Get biome for a given segment index */
export function getBiome(segment: number): BiomeDef {
  return BIOMES[segment % BIOMES.length];
}
