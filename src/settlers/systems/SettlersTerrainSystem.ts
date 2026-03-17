// ---------------------------------------------------------------------------
// Settlers – Procedural terrain generation
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { Biome, Deposit, getVertex, tileIdx } from "../state/SettlersMap";
import type { SettlersMap } from "../state/SettlersMap";
import type { SettlersMapMode } from "../state/SettlersState";

/** Simple seeded PRNG */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Hash-based pseudo-random for 2D lattice points (better than sin-based) */
function _hash(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

/** Smooth interpolation */
function _smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise at any 2D coordinate – smooth lattice-based noise */
function _valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = _smoothstep(x - ix);
  const fz = _smoothstep(z - iz);
  const v00 = _hash(ix, iz, seed) * 2 - 1;
  const v10 = _hash(ix + 1, iz, seed) * 2 - 1;
  const v01 = _hash(ix, iz + 1, seed) * 2 - 1;
  const v11 = _hash(ix + 1, iz + 1, seed) * 2 - 1;
  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fz;
}

/** Multi-octave fractal noise with proper frequency/amplitude falloff */
function noise2D(x: number, z: number, seed: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;
  // 6 octaves for rich terrain detail
  for (let i = 0; i < 6; i++) {
    value += _valueNoise(x * frequency * 0.06, z * frequency * 0.06, seed + i * 31) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.48;  // persistence
    frequency *= 2.1;   // lacunarity
  }
  return value / maxAmp; // normalize to roughly -1..1
}

/** High-frequency detail noise for micro-terrain variation */
export function detailNoise(x: number, z: number, seed: number): number {
  return (
    _valueNoise(x * 0.5, z * 0.5, seed + 777) * 0.6 +
    _valueNoise(x * 1.1, z * 1.1, seed + 888) * 0.3 +
    _valueNoise(x * 2.3, z * 2.3, seed + 999) * 0.1
  );
}

// ---------------------------------------------------------------------------
// Map mode parameters
// ---------------------------------------------------------------------------

interface MapModeParams {
  waterLevel: number;
  mountainLevel: number;
  edgeFadeStrength: number;
  /** Extra height modifier applied per-vertex after base noise */
  heightModifier: (nx: number, nz: number, baseHeight: number, seed: number) => number;
}

function getMapModeParams(mode: SettlersMapMode): MapModeParams {
  switch (mode) {
    case "ARCHIPELAGO":
      return {
        waterLevel: 0.30,
        mountainLevel: 0.70,
        edgeFadeStrength: 3,
        heightModifier: (nx, nz, h, seed) => {
          // Create island clusters using high-frequency noise
          const islands = Math.sin(nx * 18 + seed * 0.03) * Math.cos(nz * 18 + seed * 0.07);
          return h * 0.5 + (islands > 0.1 ? 0.4 : -0.15);
        },
      };
    case "MOUNTAIN_PASS":
      return {
        waterLevel: 0.12,
        mountainLevel: 0.50,
        edgeFadeStrength: 5,
        heightModifier: (nx, nz, h, _seed) => {
          // Mountains along center band, with a narrow pass
          const centerDist = Math.abs(nz - 0.5);
          const passX = Math.abs(nx - 0.5);
          const mountainRidge = centerDist < 0.12 ? 0.35 : 0;
          // Carve a pass near the center
          const passGap = passX < 0.08 && centerDist < 0.12 ? -0.45 : 0;
          return h + mountainRidge + passGap;
        },
      };
    case "LAKES":
      return {
        waterLevel: 0.22,
        mountainLevel: 0.68,
        edgeFadeStrength: 6,
        heightModifier: (nx, nz, h, seed) => {
          // Reduce edge fade (mostly land), add scattered depressions for lakes
          const lake1 = Math.sin(nx * 12 + seed * 0.05) * Math.sin(nz * 10 + seed * 0.08);
          const lake2 = Math.cos(nx * 8 - nz * 6 + seed * 0.12);
          const depression = lake1 > 0.5 || lake2 > 0.7 ? -0.25 : 0;
          return h + depression;
        },
      };
    case "CONTINENTAL":
    default:
      return {
        waterLevel: SB.WATER_LEVEL,
        mountainLevel: SB.MOUNTAIN_LEVEL,
        edgeFadeStrength: 5,
        heightModifier: (_nx, _nz, h, _seed) => h,
      };
  }
}

/** Generate the full map terrain */
export function generateTerrain(map: SettlersMap, seed: number = 42, mode: SettlersMapMode = "CONTINENTAL"): void {
  const rng = seededRandom(seed);
  const w = map.width;
  const h = map.height;
  const params = getMapModeParams(mode);

  // --- 1. Generate heightmap vertices ---
  for (let vz = 0; vz <= h; vz++) {
    for (let vx = 0; vx <= w; vx++) {
      const nx = vx / w;
      const nz = vz / h;

      // Base terrain from multi-octave fractal noise
      let height = noise2D(vx, vz, seed);

      // Normalize to 0..1
      height = (height + 1) * 0.5;
      height = Math.max(0, Math.min(1, height));

      // Add gentle rolling hills at medium frequency
      const hills = _valueNoise(vx * 0.12, vz * 0.12, seed + 500) * 0.15;
      height += hills;

      // Add fine micro-detail for realistic surface texture
      const micro = _valueNoise(vx * 0.4, vz * 0.4, seed + 600) * 0.04;
      height += micro;

      // Push edges down toward water
      const edgeDist = Math.min(nx, 1 - nx, nz, 1 - nz);
      const edgeFade = Math.min(1, edgeDist * params.edgeFadeStrength);
      height *= edgeFade;

      // Apply map-mode-specific height modifier
      height = params.heightModifier(nx, nz, height, seed);
      height = Math.max(0, Math.min(1, height));

      // Terracing effect on mountains for more interesting cliffs
      if (height > params.mountainLevel * 0.8) {
        const terraceScale = 8;
        const terraced = Math.round(height * terraceScale) / terraceScale;
        height = height * 0.6 + terraced * 0.4; // blend for softer steps
      }

      map.heightmap[vz * (w + 1) + vx] = height * SB.MAX_HEIGHT;
    }
  }

  // --- 2. Assign biomes per tile ---
  for (let tz = 0; tz < h; tz++) {
    for (let tx = 0; tx < w; tx++) {
      const idx = tileIdx(map, tx, tz);
      // Average the 4 corner vertices
      const avg = (
        getVertex(map, tx, tz) +
        getVertex(map, tx + 1, tz) +
        getVertex(map, tx, tz + 1) +
        getVertex(map, tx + 1, tz + 1)
      ) / 4;

      const normalizedH = avg / SB.MAX_HEIGHT;

      if (normalizedH < params.waterLevel) {
        map.biomes[idx] = Biome.WATER;
      } else if (normalizedH > params.mountainLevel) {
        map.biomes[idx] = Biome.MOUNTAIN;
      } else {
        // Mix forest and meadow using noise
        const forestNoise = noise2D(tx * 3, tz * 3, seed + 100);
        if (forestNoise > 0.3) {
          map.biomes[idx] = Biome.FOREST;
        } else {
          map.biomes[idx] = Biome.MEADOW;
        }
      }
    }
  }

  // --- 3. Place resource deposits ---
  for (let tz = 0; tz < h; tz++) {
    for (let tx = 0; tx < w; tx++) {
      const idx = tileIdx(map, tx, tz);
      const biome = map.biomes[idx];

      if (biome === Biome.MOUNTAIN) {
        const r = rng();
        if (r < 0.12) map.deposits[idx] = Deposit.IRON;
        else if (r < 0.20) map.deposits[idx] = Deposit.COAL;
        else if (r < 0.25) map.deposits[idx] = Deposit.GOLD;
        else if (r < 0.35) map.deposits[idx] = Deposit.STONE;
      } else if (biome === Biome.WATER) {
        if (rng() < 0.15) map.deposits[idx] = Deposit.FISH;
      }
    }
  }

  // --- 4. Calculate buildability per tile ---
  for (let tz = 0; tz < h; tz++) {
    for (let tx = 0; tx < w; tx++) {
      const idx = tileIdx(map, tx, tz);
      const biome = map.biomes[idx];

      if (biome === Biome.WATER) {
        map.buildable[idx] = 0;
        continue;
      }

      // Check slope: max height difference among 4 corners
      const h00 = getVertex(map, tx, tz);
      const h10 = getVertex(map, tx + 1, tz);
      const h01 = getVertex(map, tx, tz + 1);
      const h11 = getVertex(map, tx + 1, tz + 1);
      const maxH = Math.max(h00, h10, h01, h11);
      const minH = Math.min(h00, h10, h01, h11);
      const slope = maxH - minH;

      if (slope > 2.0) {
        map.buildable[idx] = 0; // too steep
      } else if (slope > 1.2) {
        map.buildable[idx] = 1; // small only
      } else if (slope > 0.6) {
        map.buildable[idx] = 2; // small or medium
      } else {
        map.buildable[idx] = 3; // any size
      }
    }
  }

  // --- 5. Generate decorative trees and rocks ---
  map.trees = [];
  map.rocks = [];
  for (let tz = 0; tz < h; tz++) {
    for (let tx = 0; tx < w; tx++) {
      const idx = tileIdx(map, tx, tz);
      const biome = map.biomes[idx];

      if (biome === Biome.FOREST && rng() < SB.TREE_DENSITY) {
        map.trees.push({
          x: (tx + 0.2 + rng() * 0.6) * map.tileSize,
          z: (tz + 0.2 + rng() * 0.6) * map.tileSize,
          scale: 0.6 + rng() * 0.6,
          variant: Math.floor(rng() * 3),
        });
      }
      if (biome === Biome.MOUNTAIN && rng() < 0.15) {
        map.rocks.push({
          x: (tx + 0.3 + rng() * 0.4) * map.tileSize,
          z: (tz + 0.3 + rng() * 0.4) * map.tileSize,
          scale: 0.4 + rng() * 0.5,
        });
      }
    }
  }
}

/**
 * Find a suitable flat starting position for a player's HQ.
 * Returns tile coords {x, z} in the desired quadrant.
 */
export function findStartPosition(
  map: SettlersMap,
  quadrant: "nw" | "ne" | "sw" | "se",
): { x: number; z: number } {
  const hw = Math.floor(map.width / 2);
  const hh = Math.floor(map.height / 2);
  let sx: number, sz: number, ex: number, ez: number;
  switch (quadrant) {
    case "nw": sx = 4; sz = 4; ex = hw - 2; ez = hh - 2; break;
    case "ne": sx = hw + 2; sz = 4; ex = map.width - 6; ez = hh - 2; break;
    case "sw": sx = 4; sz = hh + 2; ex = hw - 2; ez = map.height - 6; break;
    case "se": sx = hw + 2; sz = hh + 2; ex = map.width - 6; ez = map.height - 6; break;
  }

  // Find the flattest 3x3 area in the quadrant
  let bestX = Math.floor((sx + ex) / 2);
  let bestZ = Math.floor((sz + ez) / 2);
  let bestSlope = Infinity;

  for (let tz = sz; tz < ez - 2; tz++) {
    for (let tx = sx; tx < ex - 2; tx++) {
      // Check that all 9 tiles are meadow or forest and buildable
      let valid = true;
      let maxSlope = 0;
      for (let dz = 0; dz < 3 && valid; dz++) {
        for (let dx = 0; dx < 3 && valid; dx++) {
          const idx = tileIdx(map, tx + dx, tz + dz);
          const biome = map.biomes[idx];
          if (biome === Biome.WATER || biome === Biome.MOUNTAIN) valid = false;
          if (map.buildable[idx] < 3) valid = false;
        }
      }
      if (!valid) continue;

      // Calculate max slope across the area
      for (let vz = tz; vz <= tz + 3; vz++) {
        for (let vx = tx; vx <= tx + 3; vx++) {
          const h = getVertex(map, vx, vz);
          for (let dvz = -1; dvz <= 1; dvz++) {
            for (let dvx = -1; dvx <= 1; dvx++) {
              if (dvx === 0 && dvz === 0) continue;
              const nvx = vx + dvx;
              const nvz = vz + dvz;
              if (nvx < 0 || nvx > map.width || nvz < 0 || nvz > map.height) continue;
              maxSlope = Math.max(maxSlope, Math.abs(h - getVertex(map, nvx, nvz)));
            }
          }
        }
      }

      if (maxSlope < bestSlope) {
        bestSlope = maxSlope;
        bestX = tx;
        bestZ = tz;
      }
    }
  }

  // Flatten the area around the HQ for easier building
  for (let vz = bestZ; vz <= bestZ + 3; vz++) {
    for (let vx = bestX; vx <= bestX + 3; vx++) {
      map.heightmap[vz * (map.width + 1) + vx] =
        getVertex(map, bestX + 1, bestZ + 1); // flatten to center height
    }
  }
  // Set biome to meadow
  for (let dz = 0; dz < 3; dz++) {
    for (let dx = 0; dx < 3; dx++) {
      map.biomes[tileIdx(map, bestX + dx, bestZ + dz)] = Biome.MEADOW;
      map.buildable[tileIdx(map, bestX + dx, bestZ + dz)] = 3;
    }
  }
  // Remove trees in the area
  const minWx = bestX * map.tileSize;
  const maxWx = (bestX + 3) * map.tileSize;
  const minWz = bestZ * map.tileSize;
  const maxWz = (bestZ + 3) * map.tileSize;
  map.trees = map.trees.filter(
    (t) => t.x < minWx || t.x > maxWx || t.z < minWz || t.z > maxWz,
  );

  return { x: bestX, z: bestZ };
}
