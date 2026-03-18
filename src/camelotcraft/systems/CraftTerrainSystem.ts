// ---------------------------------------------------------------------------
// Camelot Craft – Procedural terrain generation
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BlockType } from "../config/CraftBlockDefs";
import { BIOME_DEFS, getBiome, type BiomeType } from "../config/CraftBiomeDefs";
import { CraftChunk } from "../state/CraftChunk";

const S = CB.CHUNK_SIZE;
const H = CB.CHUNK_HEIGHT;

// ---------------------------------------------------------------------------
// Inline Perlin noise (no external deps)
// ---------------------------------------------------------------------------

const GRAD3: [number, number, number][] = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

function buildPerm(seed: number): Uint8Array {
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  let s = seed | 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) | 0;
    const j = (s >>> 0) % (i + 1);
    const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lrp(a: number, b: number, t: number): number { return a + t * (b - a); }
function dot2(g: [number, number, number], x: number, y: number): number { return g[0]*x + g[1]*y; }
function dot3(g: [number, number, number], x: number, y: number, z: number): number { return g[0]*x + g[1]*y + g[2]*z; }

function noise2D(perm: Uint8Array, x: number, y: number): number {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = perm[perm[X]+Y], ab = perm[perm[X]+Y+1];
  const ba = perm[perm[X+1]+Y], bb = perm[perm[X+1]+Y+1];
  return lrp(
    lrp(dot2(GRAD3[aa%12],xf,yf), dot2(GRAD3[ba%12],xf-1,yf), u),
    lrp(dot2(GRAD3[ab%12],xf,yf-1), dot2(GRAD3[bb%12],xf-1,yf-1), u), v,
  );
}

function noise3D(perm: Uint8Array, x: number, y: number, z: number): number {
  const X = Math.floor(x)&255, Y = Math.floor(y)&255, Z = Math.floor(z)&255;
  const xf = x-Math.floor(x), yf = y-Math.floor(y), zf = z-Math.floor(z);
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const A = perm[X]+Y, AA = perm[A]+Z, AB = perm[A+1]+Z;
  const B = perm[X+1]+Y, BA = perm[B]+Z, BB = perm[B+1]+Z;
  return lrp(
    lrp(lrp(dot3(GRAD3[perm[AA]%12],xf,yf,zf), dot3(GRAD3[perm[BA]%12],xf-1,yf,zf),u),
        lrp(dot3(GRAD3[perm[AB]%12],xf,yf-1,zf), dot3(GRAD3[perm[BB]%12],xf-1,yf-1,zf),u),v),
    lrp(lrp(dot3(GRAD3[perm[AA+1]%12],xf,yf,zf-1), dot3(GRAD3[perm[BA+1]%12],xf-1,yf,zf-1),u),
        lrp(dot3(GRAD3[perm[AB+1]%12],xf,yf-1,zf-1), dot3(GRAD3[perm[BB+1]%12],xf-1,yf-1,zf-1),u),v),
    w);
}

function fractal2D(perm: Uint8Array, x: number, y: number, scale: number): number {
  let val = 0, amp = 1, freq = 1/scale, maxAmp = 0;
  for (let o = 0; o < CB.TERRAIN_OCTAVES; o++) {
    val += noise2D(perm, x*freq, y*freq) * amp;
    maxAmp += amp;
    amp *= CB.TERRAIN_PERSISTENCE;
    freq *= CB.TERRAIN_LACUNARITY;
  }
  return val / maxAmp;
}

function hashPos(seed: number, x: number, y: number, z: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (z * 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Tree generation
// ---------------------------------------------------------------------------

function generateTree(chunk: CraftChunk, lx: number, ly: number, lz: number, log: BlockType, leaf: BlockType): void {
  const th = 4 + Math.floor(hashPos(42, lx, ly, lz) * 3);
  // Trunk
  for (let dy = 0; dy < th; dy++) {
    if (ly + dy < H) chunk.setBlock(lx, ly + dy, lz, log);
  }
  // Canopy
  const leafBase = ly + th - 1;
  for (let dy = 0; dy <= 3; dy++) {
    const r = dy <= 2 ? 2 - Math.floor(dy / 2) : 0;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx*dx + dz*dz > r*r + 1) continue;
        const nx = lx+dx, ny = leafBase+dy, nz = lz+dz;
        if (nx >= 0 && nx < S && nz >= 0 && nz < S && ny >= 0 && ny < H) {
          if (chunk.getBlock(nx, ny, nz) === BlockType.AIR) {
            chunk.setBlock(nx, ny, nz, leaf);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// River carving
// ---------------------------------------------------------------------------

function carveRivers(
  chunk: CraftChunk, seed: number, heights: number[], biomes: BiomeType[],
): void {
  const cx = chunk.worldX;
  const cz = chunk.worldZ;

  // Use chunk Z coordinate to determine if a river crosses this chunk (~15% chance)
  const chunkZIdx = Math.floor(cz / S);
  const riverRoll = hashPos(seed + 777, 0, 0, chunkZIdx);
  if (riverRoll > 0.15) return;

  // River seed determines the sinusoidal offset
  const riverSeed = hashPos(seed + 888, 0, 0, chunkZIdx) * Math.PI * 2 * 100;

  // River width varies between 2-4 blocks
  const riverWidth = 2 + Math.floor(hashPos(seed + 999, 0, 0, chunkZIdx) * 3); // 2, 3, or 4

  for (let lx = 0; lx < S; lx++) {
    const wx = cx + lx;

    // Sinusoidal river path across the chunk in X direction
    const centerZ = S / 2 + Math.sin(wx * 0.05 + riverSeed) * 4;

    for (let lz = 0; lz < S; lz++) {
      const distFromCenter = Math.abs(lz - centerZ);
      if (distFromCenter > riverWidth / 2) continue;

      const idx = lx * S + lz;
      const height = heights[idx];

      // Don't generate rivers below sea level
      if (height <= CB.SEA_LEVEL) continue;

      const biomeDef = BIOME_DEFS[biomes[idx]];

      // Carve the river: set surface and 2 blocks below to water
      for (let dy = 0; dy <= 2; dy++) {
        const ly = height - dy;
        if (ly < 1 || ly >= H) continue;
        chunk.setBlock(lx, ly, lz, biomeDef.waterBlock);
      }

      // Carve banks down: the blocks just outside the river center get carved 1 block
      if (distFromCenter > riverWidth / 2 - 1) {
        const bankY = height;
        if (bankY >= 1 && bankY < H) {
          chunk.setBlock(lx, bankY, lz, biomeDef.waterBlock);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

export function generateChunkTerrain(chunk: CraftChunk, seed: number): void {
  const perm = buildPerm(seed);
  const permTemp = buildPerm(seed + 31337);
  const permMoist = buildPerm(seed + 71491);
  const permCave = buildPerm(seed + 99817);

  const cx = chunk.worldX;
  const cz = chunk.worldZ;

  // Per-column data
  const heights: number[] = new Array(S * S);
  const biomes: BiomeType[] = new Array(S * S);

  for (let lx = 0; lx < S; lx++) {
    for (let lz = 0; lz < S; lz++) {
      const wx = cx + lx;
      const wz = cz + lz;
      const idx = lx * S + lz;

      // Base terrain height from fractal noise
      const raw = fractal2D(perm, wx, wz, 1 / CB.TERRAIN_SCALE);
      const norm = (raw + 1) * 0.5;
      let height = Math.floor(norm * (H * 0.5)) + Math.floor(H * 0.15);

      // Mountain layer: sharp peaks using ridged noise
      const mountainNoise = Math.abs(noise2D(perm, wx * 0.008, wz * 0.008));
      const ridged = 1.0 - mountainNoise; // ridged noise: peaks where noise = 0
      const mountainHeight = Math.pow(ridged, 3) * 20; // sharp peaks up to +20 blocks
      height += Math.floor(mountainHeight);

      // Guarantee minimum ground level: every column is at least SEA_LEVEL
      height = Math.max(CB.SEA_LEVEL, Math.min(H - 3, height));

      heights[idx] = height;

      const temp = (noise2D(permTemp, wx * CB.BIOME_SCALE, wz * CB.BIOME_SCALE) + 1) * 0.5;
      const moist = (noise2D(permMoist, wx * CB.BIOME_SCALE, wz * CB.BIOME_SCALE) + 1) * 0.5;
      biomes[idx] = getBiome(temp, moist);
    }
  }

  // Fill columns
  for (let lx = 0; lx < S; lx++) {
    for (let lz = 0; lz < S; lz++) {
      const wx = cx + lx;
      const wz = cz + lz;
      const idx = lx * S + lz;
      const height = heights[idx];
      const biomeDef = BIOME_DEFS[biomes[idx]];

      // Smooth biome transitions: check if adjacent columns (±2) have different biomes
      let surfaceBlock = biomeDef.surfaceBlock;
      if (height > CB.SEA_LEVEL) {
        let hasTransition = false;
        for (const off of [-2, 2]) {
          const adjX = lx + off;
          const adjZ = lz + off;
          if (adjX >= 0 && adjX < S) {
            const adjIdx = adjX * S + lz;
            if (biomes[adjIdx] !== biomes[idx]) { hasTransition = true; break; }
          }
          if (adjZ >= 0 && adjZ < S) {
            const adjIdx = lx * S + adjZ;
            if (biomes[adjIdx] !== biomes[idx]) { hasTransition = true; break; }
          }
        }
        if (hasTransition) {
          // 50% chance to use a neighboring biome's surface block
          const blendRoll = hashPos(seed + 53, wx, 0, wz);
          if (blendRoll < 0.5) {
            // Pick the first different neighbor's surface block
            for (const off of [-2, 2]) {
              const adjX = lx + off;
              const adjZ = lz + off;
              if (adjX >= 0 && adjX < S) {
                const adjIdx = adjX * S + lz;
                if (biomes[adjIdx] !== biomes[idx]) {
                  surfaceBlock = BIOME_DEFS[biomes[adjIdx]].surfaceBlock;
                  break;
                }
              }
              if (adjZ >= 0 && adjZ < S) {
                const adjIdx = lx * S + adjZ;
                if (biomes[adjIdx] !== biomes[idx]) {
                  surfaceBlock = BIOME_DEFS[biomes[adjIdx]].surfaceBlock;
                  break;
                }
              }
            }
          }
        }
      }

      for (let ly = 0; ly < H; ly++) {
        if (ly === 0) { chunk.setBlock(lx, ly, lz, BlockType.BEDROCK); continue; }

        // Cave carving
        const caveVal = Math.abs(noise3D(permCave, wx * CB.CAVE_SCALE, ly * CB.CAVE_SCALE, wz * CB.CAVE_SCALE));
        const isCave = caveVal < CB.CAVE_THRESHOLD && ly > 1 && ly < height - 2;

        if (ly > height) {
          chunk.setBlock(lx, ly, lz, ly <= CB.SEA_LEVEL ? biomeDef.waterBlock : BlockType.AIR);
        } else if (isCave) {
          chunk.setBlock(lx, ly, lz, BlockType.AIR);
        } else if (ly === height) {
          chunk.setBlock(lx, ly, lz, height <= CB.SEA_LEVEL ? biomeDef.subsurfaceBlock : surfaceBlock);
        } else if (ly > height - 4) {
          chunk.setBlock(lx, ly, lz, biomeDef.subsurfaceBlock);
        } else {
          // Deep stone with ore
          let block = biomeDef.stoneBlock;
          const ore = hashPos(seed, wx, ly, wz);
          if (ore < CB.ORE_RARITY_DRAGON_BONE && ly < 16) block = BlockType.DRAGON_BONE_ORE;
          else if (ore < CB.ORE_RARITY_CRYSTAL && ly < 32) block = BlockType.ENCHANTED_CRYSTAL_ORE;
          else if (ore < CB.ORE_RARITY_GOLD && ly < 48) block = BlockType.GOLD_ORE;
          else if (ore < CB.ORE_RARITY_IRON) block = BlockType.IRON_ORE;
          chunk.setBlock(lx, ly, lz, block);
        }
      }
    }
  }

  // River carving pass
  carveRivers(chunk, seed, heights, biomes);

  // Decoration: trees & foliage
  for (let lx = 2; lx < S - 2; lx++) {
    for (let lz = 2; lz < S - 2; lz++) {
      const wx = cx + lx;
      const wz = cz + lz;
      const idx = lx * S + lz;
      const height = heights[idx];
      const biomeDef = BIOME_DEFS[biomes[idx]];

      if (height <= CB.SEA_LEVEL) continue;
      const surfY = height + 1;

      // Trees
      const treeRoll = hashPos(seed + 7, wx, 0, wz);
      if (treeRoll < CB.TREE_DENSITY * biomeDef.treeDensity && surfY + 7 < H) {
        generateTree(chunk, lx, surfY, lz, biomeDef.treeLogBlock, biomeDef.treeLeafBlock);
      }

      // Foliage
      if (biomeDef.foliageBlocks.length > 0) {
        const folRoll = hashPos(seed + 13, wx, 0, wz);
        if (folRoll < 0.3) {
          const fi = Math.floor(hashPos(seed + 19, wx, 1, wz) * biomeDef.foliageBlocks.length);
          if (surfY < H && chunk.getBlock(lx, surfY, lz) === BlockType.AIR) {
            chunk.setBlock(lx, surfY, lz, biomeDef.foliageBlocks[fi]);
          }
        }
      }
    }
  }
}
