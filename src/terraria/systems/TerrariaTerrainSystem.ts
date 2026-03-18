// ---------------------------------------------------------------------------
// Terraria – Procedural terrain generation (2D)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BlockType, WallType } from "../config/TerrariaBlockDefs";
import { TerrariaChunk } from "../state/TerrariaChunk";
import { getBiomeAt } from "../config/TerrariaBiomeDefs";
import type { BiomeDef } from "../config/TerrariaBiomeDefs";

const CW = TB.CHUNK_W;
const WH = TB.WORLD_HEIGHT;

// ---------------------------------------------------------------------------
// Inline Perlin noise (adapted from CamelotCraft)
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

function fractal2D(perm: Uint8Array, x: number, y: number, scale: number, octaves = TB.TERRAIN_OCTAVES): number {
  let val = 0, amp = 1, freq = 1/scale, maxAmp = 0;
  for (let o = 0; o < octaves; o++) {
    val += noise2D(perm, x*freq, y*freq) * amp;
    maxAmp += amp;
    amp *= TB.TERRAIN_PERSISTENCE;
    freq *= TB.TERRAIN_LACUNARITY;
  }
  return val / maxAmp;
}

function hashPos(seed: number, x: number, y: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Terrain generation
// ---------------------------------------------------------------------------

let _perm: Uint8Array;
let _seed: number;

export function initTerrain(seed: number): void {
  _seed = seed;
  _perm = buildPerm(seed);
}

/** Get the biome at a world X position. */
export function getBiome(wx: number): BiomeDef {
  const biomeNoise = noise2D(_perm, wx * 0.005 + 500, 100);
  return getBiomeAt(biomeNoise);
}

export function getSurfaceHeight(wx: number): number {
  const biome = getBiome(wx);
  const n = fractal2D(_perm, wx, 0, 1 / TB.TERRAIN_SCALE);
  return Math.round(TB.SEA_LEVEL + biome.heightMod + n * TB.TERRAIN_HEIGHT_RANGE * biome.heightScale);
}

export function generateChunk(cx: number): TerrariaChunk {
  const chunk = new TerrariaChunk(cx);
  const baseX = cx * CW;

  for (let lx = 0; lx < CW; lx++) {
    const wx = baseX + lx;
    if (wx < 0 || wx >= TB.WORLD_WIDTH) continue;

    const biome = getBiome(wx);
    const surfaceY = getSurfaceHeight(wx);

    for (let y = 0; y < WH; y++) {
      if (y === 0) {
        chunk.setBlock(lx, y, BlockType.BEDROCK);
        continue;
      }

      if (y > surfaceY + 1) continue; // Sky

      // Cave carving
      const caveVal = noise2D(_perm, wx * TB.CAVE_SCALE, y * TB.CAVE_SCALE);
      const largeCaveVal = noise2D(_perm, wx * TB.LARGE_CAVE_SCALE, y * TB.LARGE_CAVE_SCALE);
      const isCave = y < surfaceY - 2 && (caveVal > TB.CAVE_THRESHOLD || (y < TB.CAVERN_Y && largeCaveVal > TB.LARGE_CAVE_THRESHOLD));

      if (isCave) {
        if (y < surfaceY - 4) chunk.setWall(lx, y, WallType.STONE_WALL);
        // Puddles at cave floors
        if (y > 1 && !isCave) {
          const belowCave = noise2D(_perm, wx * TB.CAVE_SCALE, (y - 1) * TB.CAVE_SCALE) > TB.CAVE_THRESHOLD;
          if (!belowCave && hashPos(_seed + 900, wx, y) < 0.1) {
            chunk.setBlock(lx, y, BlockType.WATER);
          }
        }
        continue;
      }

      // Surface layer — use biome blocks
      if (y === surfaceY) {
        chunk.setBlock(lx, y, biome.surfaceBlock);
      } else if (y > surfaceY - 4 && y < surfaceY) {
        chunk.setBlock(lx, y, biome.subsurfaceBlock);
        if (y < surfaceY - 2) chunk.setWall(lx, y, WallType.DIRT_WALL);
      } else if (y <= surfaceY - 4) {
        // Underground: depth-based ore distribution
        let block = BlockType.STONE;

        if (y < TB.UNDERWORLD_Y) {
          if (hashPos(_seed + 400, wx, y) < 0.01) block = BlockType.DRAGON_BONE_ORE;
          else if (y < 5 && hashPos(_seed + 500, wx, y) < 0.3) block = BlockType.LAVA;
        } else if (y < TB.CAVERN_Y) {
          if (hashPos(_seed + 300, wx, y) < 0.003) block = BlockType.CRYSTAL_ORE;
          else if (hashPos(_seed + 200, wx, y) < 0.008) block = BlockType.GOLD_ORE;
          else if (hashPos(_seed + 100, wx, y) < 0.02) block = BlockType.IRON_ORE;
        } else if (y < TB.UNDERGROUND_Y) {
          if (hashPos(_seed + 200, wx, y) < 0.005) block = BlockType.GOLD_ORE;
          else if (hashPos(_seed + 100, wx, y) < 0.02) block = BlockType.IRON_ORE;
        } else {
          if (hashPos(_seed + 100, wx, y) < 0.01) block = BlockType.IRON_ORE;
        }

        chunk.setBlock(lx, y, block);
        chunk.setWall(lx, y, WallType.STONE_WALL);
      }
    }
  }

  // Trees (biome-dependent)
  for (let lx = 2; lx < CW - 2; lx++) {
    const wx = baseX + lx;
    if (wx < 2 || wx >= TB.WORLD_WIDTH - 2) continue;
    const biome = getBiome(wx);
    const surfaceY = getSurfaceHeight(wx);
    if (hashPos(_seed + 700, wx, surfaceY) < TB.TREE_CHANCE * biome.treeDensity) {
      _placeTree(chunk, lx, surfaceY + 1, biome.treeLog, biome.treeLeaves);
    }
  }

  // Surface decorations (biome-aware)
  for (let lx = 0; lx < CW; lx++) {
    const wx = baseX + lx;
    if (wx < 0 || wx >= TB.WORLD_WIDTH) continue;
    const surfaceY = getSurfaceHeight(wx);
    const above = surfaceY + 1;
    const surfBlock = chunk.getBlock(lx, surfaceY);
    if (above < WH && chunk.getBlock(lx, above) === BlockType.AIR &&
        (surfBlock === BlockType.GRASS || surfBlock === BlockType.MUD || surfBlock === BlockType.SNOW)) {
      const r = hashPos(_seed + 800, wx, surfaceY);
      if (surfBlock === BlockType.SNOW) {
        // Snow biome: no flowers, just occasional snow-covered rocks
      } else if (surfBlock === BlockType.MUD) {
        if (r < 0.1) chunk.setBlock(lx, above, BlockType.MUSHROOM);
        else if (r < 0.2) chunk.setBlock(lx, above, BlockType.TALL_GRASS);
      } else {
        if (r < 0.15) chunk.setBlock(lx, above, BlockType.TALL_GRASS);
        else if (r < 0.18) chunk.setBlock(lx, above, BlockType.RED_FLOWER);
        else if (r < 0.21) chunk.setBlock(lx, above, BlockType.BLUE_FLOWER);
      }
    }
  }

  // Underground water pools (small)
  for (let lx = 1; lx < CW - 1; lx++) {
    const wx = baseX + lx;
    for (let y = TB.UNDERWORLD_Y + 5; y < TB.UNDERGROUND_Y; y++) {
      if (chunk.getBlock(lx, y) === BlockType.AIR && chunk.getBlock(lx, y - 1) !== BlockType.AIR) {
        if (hashPos(_seed + 900, wx, y) < 0.02) {
          // Small pool: fill a few air blocks with water
          if (chunk.getBlock(lx, y) === BlockType.AIR) chunk.setBlock(lx, y, BlockType.WATER);
        }
      }
    }
  }

  chunk.rebuildHeightMap();
  chunk.populated = true;
  chunk.dirty = true;
  chunk.lightDirty = true;
  return chunk;
}

function _placeTree(chunk: TerrariaChunk, lx: number, baseY: number, logType = BlockType.OAK_LOG, leafType = BlockType.OAK_LEAVES): void {
  const height = 4 + Math.floor(hashPos(_seed + 701, chunk.cx * CW + lx, baseY) * 4);

  // Trunk
  for (let dy = 0; dy < height; dy++) {
    const y = baseY + dy;
    if (y >= WH) break;
    chunk.setBlock(lx, y, logType);
  }

  // Canopy (leaves)
  const topY = baseY + height;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -1; dy <= 2; dy++) {
      const tx = lx + dx;
      const ty = topY + dy;
      if (tx < 0 || tx >= CW || ty < 0 || ty >= WH) continue;
      if (chunk.getBlock(tx, ty) !== BlockType.AIR) continue;
      // Circular-ish shape
      if (Math.abs(dx) === 2 && dy === 2) continue;
      if (Math.abs(dx) === 2 && dy === -1) continue;
      chunk.setBlock(tx, ty, leafType);
    }
  }
}

// ---------------------------------------------------------------------------
// Special structure placement (called once after all chunks generated)
// ---------------------------------------------------------------------------

export function placeSpecialStructures(chunks: Map<number, TerrariaChunk>, seed: number): { excaliburX: number; excaliburY: number; grailX: number; grailY: number } {
  // Excalibur shrine: deep underground (y ~ 60-80), somewhere in middle third of world
  const excX = Math.floor(TB.WORLD_WIDTH * 0.3 + hashPos(seed + 2000, 0, 0) * TB.WORLD_WIDTH * 0.4);
  const excY = Math.floor(TB.CAVERN_Y + 10 + hashPos(seed + 2001, 0, 0) * 20);

  // Place a small shrine room (7 wide x 5 tall)
  _placeRoom(chunks, excX - 3, excY, 7, 5, BlockType.HOLY_STONE);
  _setBlock(chunks, excX, excY + 1, BlockType.GRAIL_PEDESTAL); // Excalibur on pedestal
  _setBlock(chunks, excX - 1, excY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, excX + 1, excY + 1, BlockType.ENCHANTED_TORCH);

  // Grail chamber: very deep (y ~ 20-35)
  const grailX = Math.floor(TB.WORLD_WIDTH * 0.5 + hashPos(seed + 3000, 0, 0) * TB.WORLD_WIDTH * 0.3);
  const grailY = Math.floor(TB.UNDERWORLD_Y + 5 + hashPos(seed + 3001, 0, 0) * 15);

  _placeRoom(chunks, grailX - 4, grailY, 9, 6, BlockType.ENCHANTED_STONE);
  _setBlock(chunks, grailX, grailY + 1, BlockType.GRAIL_PEDESTAL);
  _setBlock(chunks, grailX - 2, grailY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, grailX + 2, grailY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, grailX, grailY + 3, BlockType.THRONE);

  return { excaliburX: excX, excaliburY: excY + 1, grailX, grailY: grailY + 1 };
}

function _placeRoom(chunks: Map<number, TerrariaChunk>, startX: number, startY: number, w: number, h: number, wallBlock: BlockType): void {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      const wx = startX + dx;
      const wy = startY + dy;
      const isEdge = dx === 0 || dx === w - 1 || dy === 0 || dy === h - 1;
      _setBlock(chunks, wx, wy, isEdge ? wallBlock : BlockType.AIR);
    }
  }
}

function _setBlock(chunks: Map<number, TerrariaChunk>, wx: number, wy: number, block: BlockType): void {
  const cx = Math.floor(wx / CW);
  const chunk = chunks.get(cx);
  if (!chunk) return;
  const lx = ((wx % CW) + CW) % CW;
  chunk.setBlock(lx, wy, block);
}
