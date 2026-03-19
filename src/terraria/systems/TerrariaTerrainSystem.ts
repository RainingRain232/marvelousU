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

  // === Surface structures (per-chunk) ===
  _placeSurfaceFeatures(chunk, baseX);

  chunk.rebuildHeightMap();
  chunk.populated = true;
  chunk.dirty = true;
  chunk.lightDirty = true;
  return chunk;
}

function _placeSurfaceFeatures(chunk: TerrariaChunk, baseX: number): void {
  // Surface lake (1 per ~6 chunks)
  if (hashPos(_seed + 1100, baseX, 0) < 0.16) {
    const lakeStart = 2 + Math.floor(hashPos(_seed + 1101, baseX, 0) * 6);
    const lakeW = 4 + Math.floor(hashPos(_seed + 1102, baseX, 0) * 5);
    const lakeDepth = 2 + Math.floor(hashPos(_seed + 1103, baseX, 0) * 2);
    for (let lx = lakeStart; lx < Math.min(lakeStart + lakeW, CW - 1); lx++) {
      const wx = baseX + lx;
      const surfY = getSurfaceHeight(wx);
      for (let dy = 0; dy < lakeDepth; dy++) {
        const y = surfY - dy;
        if (y > 0) {
          chunk.setBlock(lx, y, BlockType.WATER);
        }
      }
      // Sand border at water edges
      if (dy === 0) {} // just the water fill above
      const belowY = surfY - lakeDepth;
      if (belowY > 0) chunk.setBlock(lx, belowY, BlockType.SAND);
    }
  }

  // Boulder cluster (1 per ~5 chunks)
  if (hashPos(_seed + 1200, baseX, 0) < 0.2) {
    const bx = 3 + Math.floor(hashPos(_seed + 1201, baseX, 0) * (CW - 6));
    const wx = baseX + bx;
    const surfY = getSurfaceHeight(wx);
    const boulderW = 2 + Math.floor(hashPos(_seed + 1202, baseX, 0) * 3);
    const boulderH = 2 + Math.floor(hashPos(_seed + 1203, baseX, 0) * 2);
    for (let dx = 0; dx < boulderW; dx++) {
      for (let dy = 0; dy < boulderH; dy++) {
        const tlx = bx + dx;
        if (tlx >= 0 && tlx < CW) {
          // Round the top corners
          if (dy === boulderH - 1 && (dx === 0 || dx === boulderW - 1)) continue;
          chunk.setBlock(tlx, surfY + 1 + dy, BlockType.COBBLESTONE);
        }
      }
    }
    // Occasional moss on boulders
    if (hashPos(_seed + 1204, baseX, 0) < 0.5 && bx < CW) {
      chunk.setBlock(bx, surfY + boulderH + 1, BlockType.MOSS_STONE);
    }
  }

  // Exposed ore vein on surface (1 per ~8 chunks)
  if (hashPos(_seed + 1300, baseX, 0) < 0.12) {
    const ox = 2 + Math.floor(hashPos(_seed + 1301, baseX, 0) * (CW - 4));
    const wx = baseX + ox;
    const surfY = getSurfaceHeight(wx);
    const oreLen = 2 + Math.floor(hashPos(_seed + 1302, baseX, 0) * 3);
    for (let dx = 0; dx < oreLen; dx++) {
      const tlx = ox + dx;
      if (tlx >= 0 && tlx < CW) {
        // Place ore just below surface (visible on cliff face)
        chunk.setBlock(tlx, surfY - 1, BlockType.IRON_ORE);
        if (hashPos(_seed + 1303 + dx, baseX, 0) < 0.3) {
          chunk.setBlock(tlx, surfY - 2, BlockType.IRON_ORE);
        }
      }
    }
  }

  // Stone cliff/overhang (1 per ~10 chunks) — creates a horizontal ledge
  if (hashPos(_seed + 1400, baseX, 0) < 0.1) {
    const clx = 1 + Math.floor(hashPos(_seed + 1401, baseX, 0) * (CW - 4));
    const wx = baseX + clx;
    const surfY = getSurfaceHeight(wx);
    const ledgeLen = 3 + Math.floor(hashPos(_seed + 1402, baseX, 0) * 4);
    const ledgeH = surfY + 3 + Math.floor(hashPos(_seed + 1403, baseX, 0) * 2);
    for (let dx = 0; dx < ledgeLen; dx++) {
      const tlx = clx + dx;
      if (tlx >= 0 && tlx < CW) {
        chunk.setBlock(tlx, ledgeH, BlockType.STONE);
        chunk.setBlock(tlx, ledgeH + 1, BlockType.GRASS);
        // Support column on edges
        if (dx === 0 || dx === ledgeLen - 1) {
          for (let dy = surfY + 1; dy < ledgeH; dy++) {
            chunk.setBlock(tlx, dy, BlockType.STONE);
          }
        }
      }
    }
  }

  // Small surface ruin (1 per ~8 chunks)
  if (hashPos(_seed + 1500, baseX, 0) < 0.12) {
    const rx = 2 + Math.floor(hashPos(_seed + 1501, baseX, 0) * (CW - 8));
    const wx = baseX + rx;
    const surfY = getSurfaceHeight(wx);
    const wallH = 2 + Math.floor(hashPos(_seed + 1502, baseX, 0) * 3);
    // Left wall (partially broken)
    for (let dy = 1; dy <= wallH; dy++) {
      if (rx < CW && hashPos(_seed + 1503 + dy, baseX, 0) < 0.75) {
        chunk.setBlock(rx, surfY + dy, BlockType.COBBLESTONE);
      }
    }
    // Right wall
    const rw = 3 + Math.floor(hashPos(_seed + 1504, baseX, 0) * 3);
    for (let dy = 1; dy <= wallH; dy++) {
      const rlx = rx + rw;
      if (rlx < CW && hashPos(_seed + 1505 + dy, baseX, 0) < 0.6) {
        chunk.setBlock(rlx, surfY + dy, BlockType.COBBLESTONE);
      }
    }
    // Floor
    for (let dx = 1; dx < rw; dx++) {
      if (rx + dx < CW) {
        chunk.setBlock(rx + dx, surfY, BlockType.STONE_BRICKS);
      }
    }
    // Chest inside
    if (rx + Math.floor(rw / 2) < CW) {
      chunk.setBlock(rx + Math.floor(rw / 2), surfY + 1, BlockType.CHEST);
    }
    // Torch on wall
    if (rx + 1 < CW) {
      chunk.setBlock(rx + 1, surfY + wallH, BlockType.TORCH);
    }
  }
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

export function placeSpecialStructures(chunks: Map<number, TerrariaChunk>, seed: number, worldWidth: number = TB.WORLD_WIDTH): { excaliburX: number; excaliburY: number; grailX: number; grailY: number } {
  // Excalibur shrine: deep underground (y ~ 60-80), somewhere in middle third of world
  const excX = Math.floor(worldWidth * 0.3 + hashPos(seed + 2000, 0, 0) * worldWidth * 0.4);
  const excY = Math.floor(TB.CAVERN_Y + 10 + hashPos(seed + 2001, 0, 0) * 20);

  // Place a small shrine room (7 wide x 5 tall)
  _placeRoom(chunks, excX - 3, excY, 7, 5, BlockType.HOLY_STONE);
  _setBlock(chunks, excX, excY + 1, BlockType.GRAIL_PEDESTAL); // Excalibur on pedestal
  _setBlock(chunks, excX - 1, excY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, excX + 1, excY + 1, BlockType.ENCHANTED_TORCH);

  // Grail chamber: very deep (y ~ 20-35)
  const grailX = Math.floor(worldWidth * 0.5 + hashPos(seed + 3000, 0, 0) * worldWidth * 0.3);
  const grailY = Math.floor(TB.UNDERWORLD_Y + 5 + hashPos(seed + 3001, 0, 0) * 15);

  _placeRoom(chunks, grailX - 4, grailY, 9, 6, BlockType.ENCHANTED_STONE);
  _setBlock(chunks, grailX, grailY + 1, BlockType.GRAIL_PEDESTAL);
  _setBlock(chunks, grailX - 2, grailY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, grailX + 2, grailY + 1, BlockType.ENCHANTED_TORCH);
  _setBlock(chunks, grailX, grailY + 3, BlockType.THRONE);

  // --- Scatter additional structures throughout the underground ---
  _placeUndergroundStructures(chunks, seed, worldWidth);

  return { excaliburX: excX, excaliburY: excY + 1, grailX, grailY: grailY + 1 };
}

function _placeUndergroundStructures(chunks: Map<number, TerrariaChunk>, seed: number, worldWidth: number): void {
  // Treasure rooms (small rooms with chests and torches)
  const numTreasure = Math.floor(worldWidth / 40);
  for (let i = 0; i < numTreasure; i++) {
    const tx = Math.floor(hashPos(seed + 4000 + i, i, 0) * (worldWidth - 20) + 10);
    const ty = Math.floor(TB.CAVERN_Y + hashPos(seed + 4100 + i, i, 0) * (TB.UNDERGROUND_Y - TB.CAVERN_Y - 10));
    _placeRoom(chunks, tx - 3, ty, 7, 5, BlockType.STONE_BRICKS);
    _setBlock(chunks, tx, ty + 1, BlockType.CHEST);
    _setBlock(chunks, tx - 1, ty + 3, BlockType.TORCH);
    _setBlock(chunks, tx + 1, ty + 3, BlockType.TORCH);
  }

  // Mushroom caves (larger caverns with mushrooms and glowing crystals)
  const numMushroom = Math.floor(worldWidth / 80);
  for (let i = 0; i < numMushroom; i++) {
    const mx = Math.floor(hashPos(seed + 5000 + i, i, 0) * (worldWidth - 30) + 15);
    const my = Math.floor(TB.UNDERGROUND_Y - 10 + hashPos(seed + 5100 + i, i, 0) * 20);
    const rw = 9 + Math.floor(hashPos(seed + 5200 + i, i, 0) * 6);
    const rh = 6 + Math.floor(hashPos(seed + 5300 + i, i, 0) * 3);
    _placeRoom(chunks, mx - Math.floor(rw / 2), my, rw, rh, BlockType.MOSS_STONE);
    // Mushrooms on floor
    for (let dx = 2; dx < rw - 2; dx++) {
      if (hashPos(seed + 5400 + i * 10 + dx, my, 0) < 0.4) {
        _setBlock(chunks, mx - Math.floor(rw / 2) + dx, my + 1, BlockType.MUSHROOM);
      }
    }
    // Glow crystals on ceiling
    for (let dx = 1; dx < rw - 1; dx += 2) {
      if (hashPos(seed + 5500 + i * 10 + dx, my, 0) < 0.3) {
        _setBlock(chunks, mx - Math.floor(rw / 2) + dx, my + rh - 2, BlockType.CRYSTAL_ORE);
      }
    }
  }

  // Dungeon corridors (long horizontal tunnels with stone brick walls)
  const numDungeons = Math.floor(worldWidth / 100);
  for (let i = 0; i < numDungeons; i++) {
    const dx = Math.floor(hashPos(seed + 6000 + i, i, 0) * (worldWidth - 50) + 25);
    const dy = Math.floor(TB.CAVERN_Y + 5 + hashPos(seed + 6100 + i, i, 0) * 30);
    const corridorLen = 15 + Math.floor(hashPos(seed + 6200 + i, i, 0) * 20);
    for (let cx = 0; cx < corridorLen; cx++) {
      _setBlock(chunks, dx + cx, dy, BlockType.STONE_BRICKS);
      _setBlock(chunks, dx + cx, dy + 1, BlockType.AIR);
      _setBlock(chunks, dx + cx, dy + 2, BlockType.AIR);
      _setBlock(chunks, dx + cx, dy + 3, BlockType.AIR);
      _setBlock(chunks, dx + cx, dy + 4, BlockType.STONE_BRICKS);
    }
    // Torches every 5 blocks
    for (let cx = 2; cx < corridorLen - 2; cx += 5) {
      _setBlock(chunks, dx + cx, dy + 3, BlockType.TORCH);
    }
    // Occasional room branching off corridor
    if (hashPos(seed + 6300 + i, i, 0) < 0.6) {
      const roomX = dx + Math.floor(corridorLen * 0.5);
      _placeRoom(chunks, roomX - 3, dy + 4, 7, 5, BlockType.CASTLE_WALL);
      _setBlock(chunks, roomX, dy + 5, BlockType.CHEST);
      _setBlock(chunks, roomX - 2, dy + 7, BlockType.ENCHANTED_TORCH);
    }
  }

  // Lava pools in underworld
  const numLavaPools = Math.floor(worldWidth / 30);
  for (let i = 0; i < numLavaPools; i++) {
    const lx = Math.floor(hashPos(seed + 7000 + i, i, 0) * (worldWidth - 10) + 5);
    const ly = Math.floor(2 + hashPos(seed + 7100 + i, i, 0) * (TB.UNDERWORLD_Y - 4));
    const lw = 3 + Math.floor(hashPos(seed + 7200 + i, i, 0) * 6);
    for (let dx = 0; dx < lw; dx++) {
      _setBlock(chunks, lx + dx, ly, BlockType.LAVA);
      _setBlock(chunks, lx + dx, ly + 1, BlockType.LAVA);
    }
  }

  // Surface ruins (scattered cobblestone structures)
  const numRuins = Math.floor(worldWidth / 60);
  for (let i = 0; i < numRuins; i++) {
    const rx = Math.floor(hashPos(seed + 8000 + i, i, 0) * (worldWidth - 20) + 10);
    const ry = getSurfaceHeight(rx);
    // Small ruined walls
    const wallH = 3 + Math.floor(hashPos(seed + 8100 + i, i, 0) * 3);
    for (let dy = 1; dy <= wallH; dy++) {
      if (hashPos(seed + 8200 + i, dy, 0) < 0.7) {
        _setBlock(chunks, rx, ry + dy, BlockType.COBBLESTONE);
      }
      if (hashPos(seed + 8300 + i, dy, 0) < 0.5) {
        _setBlock(chunks, rx + 4, ry + dy, BlockType.COBBLESTONE);
      }
    }
    // Chest inside
    _setBlock(chunks, rx + 2, ry + 1, BlockType.CHEST);
  }
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
