// ---------------------------------------------------------------------------
// Caesar – Terrain generation
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import type { CaesarMapData, CaesarTerrain } from "../state/CaesarMap";

// Simple seeded noise (value noise with interpolation)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Generate a 2D value noise field */
function generateNoise(
  w: number,
  h: number,
  cellSize: number,
  rng: () => number,
): Float32Array {
  // Grid of random values
  const gridW = Math.ceil(w / cellSize) + 2;
  const gridH = Math.ceil(h / cellSize) + 2;
  const grid = new Float32Array(gridW * gridH);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x / cellSize;
      const gy = y / cellSize;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = smoothstep(gx - ix);
      const fy = smoothstep(gy - iy);

      const v00 = grid[iy * gridW + ix];
      const v10 = grid[iy * gridW + ix + 1];
      const v01 = grid[(iy + 1) * gridW + ix];
      const v11 = grid[(iy + 1) * gridW + ix + 1];

      out[y * w + x] = lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
    }
  }
  return out;
}

/** Multi-octave noise */
function fbm(
  w: number,
  h: number,
  rng: () => number,
  octaves: number = 4,
  baseCell: number = 12,
): Float32Array {
  const result = new Float32Array(w * h);
  let amp = 1;
  let totalAmp = 0;

  for (let oct = 0; oct < octaves; oct++) {
    const cellSize = Math.max(2, baseCell >> oct);
    const noise = generateNoise(w, h, cellSize, rng);
    for (let i = 0; i < result.length; i++) {
      result[i] += noise[i] * amp;
    }
    totalAmp += amp;
    amp *= 0.5;
  }

  // Normalize to 0-1
  for (let i = 0; i < result.length; i++) {
    result[i] /= totalAmp;
  }
  return result;
}

export function generateTerrain(map: CaesarMapData, seed: number): void {
  const rng = seededRandom(seed);
  const { width: w, height: h } = map;

  // Generate elevation
  const elevation = fbm(w, h, rng, 4, 14);

  // Generate moisture (for forest placement)
  const moisture = fbm(w, h, rng, 3, 10);

  // Apply island mask (keep edges as water)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // Distance from center, normalized 0-1
      const dx = (x / w - 0.5) * 2;
      const dy = (y / h - 0.5) * 2;
      const edgeDist = 1 - Math.max(Math.abs(dx), Math.abs(dy));
      // Push edges toward water
      elevation[i] *= smoothstep(Math.min(1, edgeDist * 2.5));
    }
  }

  // Assign terrain types
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const e = elevation[i];
      const m = moisture[i];
      const tile = map.tiles[i];

      tile.elevation = e;

      let terrain: CaesarTerrain = "grass";
      if (e < CB.WATER_LEVEL) {
        terrain = "water";
      } else if (e > CB.HILL_LEVEL) {
        terrain = "hill";
      } else if (m > (1 - CB.FOREST_DENSITY) && e > CB.WATER_LEVEL + 0.05) {
        terrain = "forest";
      }

      tile.terrain = terrain;
    }
  }

  // Place stone and iron deposits on hills
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const tile = map.tiles[i];
      if (tile.terrain === "hill") {
        const r = rng();
        if (r < CB.IRON_DEPOSIT_CHANCE) {
          tile.terrain = "iron_deposit";
        } else if (r < CB.IRON_DEPOSIT_CHANCE + CB.STONE_DEPOSIT_CHANCE) {
          tile.terrain = "stone_deposit";
        }
      }
    }
  }

  // Ensure a clear grass area near center for player start
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const clearRadius = 6;
  for (let dy = -clearRadius; dy <= clearRadius; dy++) {
    for (let dx = -clearRadius; dx <= clearRadius; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx >= 0 && ty >= 0 && tx < w && ty < h) {
        const i = ty * w + tx;
        if (dx * dx + dy * dy <= clearRadius * clearRadius) {
          map.tiles[i].terrain = "grass";
          map.tiles[i].elevation = Math.max(map.tiles[i].elevation, CB.WATER_LEVEL + 0.05);
        }
      }
    }
  }
}

/** Find a good starting position near center on grass */
export function findStartPosition(map: CaesarMapData): { x: number; y: number } {
  return { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) };
}
