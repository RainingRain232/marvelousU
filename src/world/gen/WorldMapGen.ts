// Procedural hex world map generator.
//
// Uses seeded value noise to create terrain distribution across a hex grid.
// Ensures starting positions are spread out and on buildable terrain.

import type { HexCoord } from "@world/hex/HexCoord";
import { hexDistance, hexKey, hexSpiral } from "@world/hex/HexCoord";
import { HexGrid, type HexTile } from "@world/hex/HexGrid";
import { TerrainType, TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { WorldBalance, type WorldGameSettings } from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Simple 2D value noise (seeded)
// ---------------------------------------------------------------------------

function createNoise2D(seed: number): (x: number, y: number) => number {
  const rng = mulberry32(seed);
  // Create a 256×256 hash table
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    grad[i] = rng() * 2 - 1;
  }
  // Shuffle
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    [grad[i], grad[j]] = [grad[j], grad[i]];
  }
  for (let i = 0; i < 256; i++) {
    perm[i + 256] = perm[i];
    grad[i + 256] = grad[i];
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  function hash(x: number, y: number): number {
    return perm[(perm[x & 255] + y) & 511];
  }

  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);

    const aa = grad[hash(xi, yi)];
    const ab = grad[hash(xi, yi + 1)];
    const ba = grad[hash(xi + 1, yi)];
    const bb = grad[hash(xi + 1, yi + 1)];

    return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
  };
}

// ---------------------------------------------------------------------------
// Terrain selection from noise values
// ---------------------------------------------------------------------------

function selectTerrain(
  elevation: number,
  moisture: number,
  distFromCenter: number,
  mapRadius: number,
): TerrainType {
  // Edge of map tends toward water/mountains
  const edgeFactor = distFromCenter / mapRadius;

  // Deep water at edges and low elevation
  if (edgeFactor > 0.85 || elevation < -0.4) return TerrainType.WATER;
  if (elevation < -0.2 && edgeFactor > 0.6) return TerrainType.WATER;

  // Mountains at high elevation
  if (elevation > 0.6) return TerrainType.MOUNTAINS;
  if (elevation > 0.4) return TerrainType.HILLS;

  // Moisture determines vegetation
  if (moisture < -0.3) return TerrainType.DESERT;
  if (moisture > 0.5 && elevation < 0) return TerrainType.SWAMP;
  if (moisture > 0.3) return TerrainType.FOREST;
  if (moisture > 0) return TerrainType.GRASSLAND;

  // Default
  return TerrainType.PLAINS;
}

// ---------------------------------------------------------------------------
// Map generation
// ---------------------------------------------------------------------------

/** Generate a procedural hex world map. */
export function generateWorldMap(settings: WorldGameSettings): HexGrid {
  const { mapRadius } = settings;
  const seed = settings.seed || (Date.now() & 0xffffffff);
  const grid = new HexGrid(mapRadius);

  const elevationNoise = createNoise2D(seed);
  const moistureNoise = createNoise2D(seed + 12345);

  const scale1 = 0.12;
  const scale2 = 0.06;

  // Generate all hex tiles
  const allCoords = hexSpiral({ q: 0, r: 0 }, mapRadius);
  for (const coord of allCoords) {
    const dist = hexDistance(coord, { q: 0, r: 0 });

    // Multi-octave noise for elevation
    const e1 = elevationNoise(coord.q * scale1, coord.r * scale1);
    const e2 = elevationNoise(coord.q * scale2 + 100, coord.r * scale2 + 100) * 0.5;
    const elevation = e1 + e2;

    // Moisture noise
    const m1 = moistureNoise(coord.q * scale1, coord.r * scale1);
    const m2 = moistureNoise(coord.q * scale2 + 200, coord.r * scale2 + 200) * 0.5;
    const moisture = m1 + m2;

    const terrain = selectTerrain(elevation, moisture, dist, mapRadius);

    const tile: HexTile = {
      q: coord.q,
      r: coord.r,
      terrain,
      owner: null,
      cityId: null,
      armyId: null,
    };
    grid.setTile(tile);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Starting position selection
// ---------------------------------------------------------------------------

/**
 * Find N starting positions spread maximally across the map.
 * Each position must be on buildable terrain (plains/grassland) with at least
 * 2 buildable neighbors.
 */
export function findStartPositions(
  grid: HexGrid,
  numPlayers: number,
): HexCoord[] {
  // Collect all candidate tiles (buildable, not on edge)
  const candidates: HexCoord[] = [];
  for (const tile of grid.allTiles()) {
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    if (!terrain.buildable) continue;
    if (tile.terrain === TerrainType.DESERT || tile.terrain === TerrainType.SWAMP) continue;

    const dist = hexDistance(tile, { q: 0, r: 0 });
    if (dist > grid.radius * 0.75) continue; // not too close to edge
    if (dist < 3) continue; // not right in the center

    // Must have at least 2 buildable neighbors
    const neighbors = grid.getNeighbors(tile.q, tile.r);
    const buildableNeighbors = neighbors.filter(
      (n) => TERRAIN_DEFINITIONS[n.terrain].buildable,
    );
    if (buildableNeighbors.length < 2) continue;

    candidates.push({ q: tile.q, r: tile.r });
  }

  if (candidates.length < numPlayers) {
    // Fallback: relax constraints and just pick any buildable
    for (const tile of grid.allTiles()) {
      if (TERRAIN_DEFINITIONS[tile.terrain].buildable) {
        candidates.push({ q: tile.q, r: tile.r });
      }
    }
  }

  // Greedy farthest-first placement
  const positions: HexCoord[] = [];

  if (candidates.length === 0) return positions;

  // First player: pick the candidate farthest from center
  let best = candidates[0];
  let bestDist = 0;
  for (const c of candidates) {
    const d = hexDistance(c, { q: 0, r: 0 });
    if (d > bestDist) {
      bestDist = d;
      best = c;
    }
  }
  positions.push(best);

  // Remaining players: pick the candidate maximizing min-distance to all chosen
  for (let p = 1; p < numPlayers && p < candidates.length; p++) {
    let bestCandidate = candidates[0];
    let bestMinDist = -1;

    for (const c of candidates) {
      // Skip if too close to any existing position
      let minDist = Infinity;
      for (const pos of positions) {
        const d = hexDistance(c, pos);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestCandidate = c;
      }
    }

    positions.push(bestCandidate);
  }

  return positions;
}

/**
 * Find positions for neutral city-states.
 * Spread across the map, not too close to player starts.
 */
export function findNeutralCityPositions(
  grid: HexGrid,
  playerStarts: HexCoord[],
  count: number,
): HexCoord[] {
  const minDistFromPlayers = 5;
  const minDistBetween = 4;

  const candidates: HexCoord[] = [];
  for (const tile of grid.allTiles()) {
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    if (!terrain.buildable) continue;
    if (tile.terrain === TerrainType.DESERT) continue;

    // Not too close to player starts
    let tooClose = false;
    for (const ps of playerStarts) {
      if (hexDistance(tile, ps) < minDistFromPlayers) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    candidates.push({ q: tile.q, r: tile.r });
  }

  // Greedy selection spread out
  const chosen: HexCoord[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count && candidates.length > 0; i++) {
    let bestCandidate = candidates[0];
    let bestScore = -Infinity;

    for (const c of candidates) {
      const ck = hexKey(c.q, c.r);
      if (used.has(ck)) continue;

      let minDist = Infinity;
      for (const ch of chosen) {
        const d = hexDistance(c, ch);
        if (d < minDist) minDist = d;
      }
      if (chosen.length > 0 && minDist < minDistBetween) continue;

      // Prefer tiles near the center-ish
      const centerDist = hexDistance(c, { q: 0, r: 0 });
      const score = chosen.length > 0 ? minDist : -centerDist;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = c;
      }
    }

    chosen.push(bestCandidate);
    used.add(hexKey(bestCandidate.q, bestCandidate.r));
  }

  return chosen;
}
