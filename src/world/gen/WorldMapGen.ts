// Procedural hex world map generator.
//
// Uses seeded value noise to create terrain distribution across a hex grid.
// Ensures starting positions are spread out and on buildable terrain.

import type { HexCoord } from "@world/hex/HexCoord";
import { hexDistance, hexKey, hexSpiral } from "@world/hex/HexCoord";
import { HexGrid, type HexTile } from "@world/hex/HexGrid";
import { TerrainType, TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import type { WorldGameSettings } from "@world/config/WorldConfig";
import { createWorldCamp, type WorldCamp } from "@world/state/WorldCamp";
import { createNeutralBuilding, type NeutralBuilding } from "@world/state/NeutralBuilding";
import type { ArmyUnit } from "@world/state/WorldArmy";
import { RESOURCE_DEFINITIONS } from "@world/config/ResourceDefs";

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
      campId: null,
      resource: null,
      improvement: null,
      neutralBuildingId: null,
    };
    grid.setTile(tile);
  }

  // Place natural resources on ~12% of eligible tiles
  _placeResources(grid, seed);

  return grid;
}

/** Scatter resources across eligible tiles. */
function _placeResources(grid: HexGrid, seed: number): void {
  const rng = mulberry32(seed + 77777);
  const resourceTypes = Object.values(RESOURCE_DEFINITIONS);

  for (const tile of grid.allTiles()) {
    if (rng() > 0.12) continue; // ~12% chance

    // Find which resources are valid for this terrain
    const valid = resourceTypes.filter((r) =>
      r.validTerrain.includes(tile.terrain),
    );
    if (valid.length === 0) continue;

    // Pick a random valid resource
    const chosen = valid[Math.floor(rng() * valid.length)];
    tile.resource = chosen.type;
  }
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
    // Fallback: relax constraints and just pick any buildable tile
    const existing = new Set(candidates.map((c) => hexKey(c.q, c.r)));
    for (const tile of grid.allTiles()) {
      if (existing.has(hexKey(tile.q, tile.r))) continue;
      if (TERRAIN_DEFINITIONS[tile.terrain].buildable) {
        candidates.push({ q: tile.q, r: tile.r });
      }
    }
  }

  // Last resort: if still not enough, add any passable tile
  if (candidates.length < numPlayers) {
    const existing = new Set(candidates.map((c) => hexKey(c.q, c.r)));
    for (const tile of grid.allTiles()) {
      if (existing.has(hexKey(tile.q, tile.r))) continue;
      if (isFinite(TERRAIN_DEFINITIONS[tile.terrain].movementCost)) {
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
  const minDistFromPlayers = 8;
  const minDistBetween = 8;

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

// ---------------------------------------------------------------------------
// Neutral camps placement
// ---------------------------------------------------------------------------

/**
 * Place neutral camps scattered across the map.
 * Tier is based on distance from player starts:
 *   - Close (dist < 5): tier 1
 *   - Mid (dist 5-8): tier 2
 *   - Far (dist > 8): tier 3
 */
export function placeCamps(
  grid: HexGrid,
  playerStarts: HexCoord[],
  count: number,
  seed: number,
): WorldCamp[] {
  const rng = mulberry32(seed + 99999);
  const minDistFromStart = 3;
  const minDistBetween = 3;

  // Collect passable, unoccupied candidate tiles
  const candidates: HexCoord[] = [];
  for (const tile of grid.allTiles()) {
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    if (!isFinite(terrain.movementCost)) continue;
    if (tile.cityId || tile.armyId) continue;

    // Not too close to any player start
    let tooClose = false;
    for (const ps of playerStarts) {
      if (hexDistance(tile, ps) < minDistFromStart) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    candidates.push({ q: tile.q, r: tile.r });
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Pick camps maintaining minimum distance
  const camps: WorldCamp[] = [];
  const chosen = new Set<string>();

  for (const c of candidates) {
    if (camps.length >= count) break;

    // Check distance to already-chosen camps
    let farEnough = true;
    for (const existing of camps) {
      if (hexDistance(c, existing.position) < minDistBetween) {
        farEnough = false;
        break;
      }
    }
    if (!farEnough) continue;

    // Determine tier based on nearest player start
    let minDist = Infinity;
    for (const ps of playerStarts) {
      const d = hexDistance(c, ps);
      if (d < minDist) minDist = d;
    }

    let tier: 1 | 2 | 3;
    if (minDist < 6) tier = 1;
    else if (minDist < 9) tier = 2;
    else tier = 3;

    const campId = `camp_${camps.length + 1}`;
    const camp = createWorldCamp(campId, c, tier);
    camps.push(camp);
    chosen.add(hexKey(c.q, c.r));
  }

  return camps;
}

// ---------------------------------------------------------------------------
// Neutral buildings placement (farms, mills, towers)
// ---------------------------------------------------------------------------

/** Random defenders for a neutral building based on tier (1-6). */
function _neutralBuildingDefenders(tier: number, _rng: () => number): ArmyUnit[] {
  // Tier 1-4: random small armies for farms
  // Tier 5: mill army
  // Tier 6: tower army
  switch (tier) {
    case 1:
      return [{ unitType: "swordsman", count: 2, hpPerUnit: 100 }];
    case 2:
      return [
        { unitType: "swordsman", count: 3, hpPerUnit: 100 },
        { unitType: "archer", count: 1, hpPerUnit: 100 },
      ];
    case 3:
      return [
        { unitType: "swordsman", count: 4, hpPerUnit: 100 },
        { unitType: "archer", count: 2, hpPerUnit: 100 },
      ];
    case 4:
      return [
        { unitType: "swordsman", count: 5, hpPerUnit: 100 },
        { unitType: "archer", count: 3, hpPerUnit: 100 },
        { unitType: "knight", count: 1, hpPerUnit: 100 },
      ];
    case 5:
      return [
        { unitType: "swordsman", count: 6, hpPerUnit: 100 },
        { unitType: "archer", count: 4, hpPerUnit: 100 },
        { unitType: "knight", count: 2, hpPerUnit: 100 },
      ];
    case 6:
      return [
        { unitType: "swordsman", count: 8, hpPerUnit: 100 },
        { unitType: "archer", count: 5, hpPerUnit: 100 },
        { unitType: "knight", count: 3, hpPerUnit: 100 },
        { unitType: "crossbowman", count: 2, hpPerUnit: 100 },
      ];
    default:
      return [{ unitType: "swordsman", count: 2, hpPerUnit: 100 }];
  }
}

/**
 * Place neutral farms, mills, and towers on the map.
 *
 * Farms: ~10% of grassland tiles, spawned in clusters of 1-2 adjacent tiles.
 *        Each farm cluster has a 50% chance of an adjacent mill.
 *        Farms are defended by random t1-t4 armies, mills by t5.
 *
 * Towers: ~10% of other (non-grassland, non-water, non-mountain) tiles.
 *         Defended by t6 armies and give 2 gold.
 */
export function placeNeutralBuildings(
  grid: HexGrid,
  playerStarts: HexCoord[],
  neutralCityPositions: HexCoord[],
  seed: number,
): NeutralBuilding[] {
  const rng = mulberry32(seed + 55555);
  const minDistFromStart = 4;
  const buildings: NeutralBuilding[] = [];
  const usedTiles = new Set<string>();

  // Ensure grassland near player starts and neutral cities so farms/mills can spawn
  const allCityPositions = [...playerStarts, ...neutralCityPositions];
  for (const pos of allCityPositions) {
    const nearby = hexSpiral(pos, 5);
    let convertedCount = 0;
    for (const h of nearby) {
      const tile = grid.getTile(h.q, h.r);
      if (!tile) continue;
      if (tile.cityId || tile.campId) continue;
      const dist = hexDistance(h, pos);
      if (dist < 3) continue; // don't convert tiles right next to city
      if (tile.terrain === TerrainType.PLAINS || tile.terrain === TerrainType.FOREST) {
        if (rng() < 0.3 && convertedCount < 4) {
          tile.terrain = TerrainType.GRASSLAND;
          convertedCount++;
        }
      }
    }
  }

  // Collect grassland tiles for farms/mills
  const grasslandTiles: HexTile[] = [];
  // Collect other eligible tiles for towers
  const otherTiles: HexTile[] = [];

  for (const tile of grid.allTiles()) {
    // Skip occupied tiles
    if (tile.cityId || tile.campId) continue;

    // Skip tiles too close to player starts
    let tooClose = false;
    for (const ps of playerStarts) {
      if (hexDistance(tile, ps) < minDistFromStart) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    if (tile.terrain === TerrainType.GRASSLAND) {
      grasslandTiles.push(tile);
    } else if (
      tile.terrain !== TerrainType.WATER &&
      tile.terrain !== TerrainType.MOUNTAINS &&
      isFinite(TERRAIN_DEFINITIONS[tile.terrain].movementCost)
    ) {
      otherTiles.push(tile);
    }
  }

  // Shuffle grassland tiles
  for (let i = grasslandTiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [grasslandTiles[i], grasslandTiles[j]] = [grasslandTiles[j], grasslandTiles[i]];
  }

  // --- Guaranteed farms & mills near each player start ---
  // Ensure at least 2 farms and 1 mill within ~4-6 tiles of each player.
  for (const ps of playerStarts) {
    let farmsNear = 0;
    let millNear = false;

    // Gather grassland candidates at distance 4-6 from this player start
    const nearGrass: HexTile[] = [];
    const ring = hexSpiral(ps, 6);
    for (const h of ring) {
      const tile = grid.getTile(h.q, h.r);
      if (!tile) continue;
      const d = hexDistance(h, ps);
      if (d < 4) continue;
      if (tile.terrain !== TerrainType.GRASSLAND) continue;
      if (tile.cityId || tile.campId) continue;
      if (usedTiles.has(hexKey(tile.q, tile.r))) continue;
      nearGrass.push(tile);
    }

    // Shuffle
    for (let i = nearGrass.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [nearGrass[i], nearGrass[j]] = [nearGrass[j], nearGrass[i]];
    }

    for (const tile of nearGrass) {
      if (farmsNear >= 2 && millNear) break;
      const key = hexKey(tile.q, tile.r);
      if (usedTiles.has(key)) continue;

      if (farmsNear < 2) {
        const farmTier = (1 + Math.floor(rng() * 4)) as 1 | 2 | 3 | 4;
        const farmId = `nb_${buildings.length + 1}`;
        const farm = createNeutralBuilding(farmId, "farm", { q: tile.q, r: tile.r }, _neutralBuildingDefenders(farmTier, rng));
        buildings.push(farm);
        usedTiles.add(key);
        tile.neutralBuildingId = farmId;
        farmsNear++;
      } else if (!millNear) {
        const millId = `nb_${buildings.length + 1}`;
        const mill = createNeutralBuilding(millId, "mill", { q: tile.q, r: tile.r }, _neutralBuildingDefenders(5, rng));
        buildings.push(mill);
        usedTiles.add(key);
        tile.neutralBuildingId = millId;
        millNear = true;
      }
    }
  }

  // Place farms on ~10% of grassland tiles in clusters of 1-2
  const targetFarmTiles = Math.floor(grasslandTiles.length * 0.10);
  let farmTilesPlaced = 0;

  for (const tile of grasslandTiles) {
    if (farmTilesPlaced >= targetFarmTiles) break;
    const key = hexKey(tile.q, tile.r);
    if (usedTiles.has(key)) continue;
    if (tile.cityId || tile.campId) continue;

    // Place first farm
    const farmTier = (1 + Math.floor(rng() * 4)) as 1 | 2 | 3 | 4;
    const farmId = `nb_${buildings.length + 1}`;
    const farm = createNeutralBuilding(
      farmId,
      "farm",
      { q: tile.q, r: tile.r },
      _neutralBuildingDefenders(farmTier, rng),
    );
    buildings.push(farm);
    usedTiles.add(key);
    tile.neutralBuildingId = farmId;
    farmTilesPlaced++;

    // Try to place 1 adjacent farm (cluster of 2)
    const neighbors = grid.getNeighbors(tile.q, tile.r);
    const grassNeighbors = neighbors.filter(
      (n) => n.terrain === TerrainType.GRASSLAND &&
             !usedTiles.has(hexKey(n.q, n.r)) &&
             !n.cityId && !n.campId,
    );

    if (grassNeighbors.length > 0 && rng() < 0.6) {
      const adjTile = grassNeighbors[Math.floor(rng() * grassNeighbors.length)];
      const adjKey = hexKey(adjTile.q, adjTile.r);
      const adjTier = (1 + Math.floor(rng() * 4)) as 1 | 2 | 3 | 4;
      const adjId = `nb_${buildings.length + 1}`;
      const adjFarm = createNeutralBuilding(
        adjId,
        "farm",
        { q: adjTile.q, r: adjTile.r },
        _neutralBuildingDefenders(adjTier, rng),
      );
      buildings.push(adjFarm);
      usedTiles.add(adjKey);
      adjTile.neutralBuildingId = adjId;
      farmTilesPlaced++;
    }

    // 50% chance of an adjacent mill
    if (rng() < 0.5) {
      const millNeighbors = grid.getNeighbors(tile.q, tile.r).filter(
        (n) => n.terrain === TerrainType.GRASSLAND &&
               !usedTiles.has(hexKey(n.q, n.r)) &&
               !n.cityId && !n.campId,
      );
      if (millNeighbors.length > 0) {
        const millTile = millNeighbors[Math.floor(rng() * millNeighbors.length)];
        const millKey = hexKey(millTile.q, millTile.r);
        const millId = `nb_${buildings.length + 1}`;
        const mill = createNeutralBuilding(
          millId,
          "mill",
          { q: millTile.q, r: millTile.r },
          _neutralBuildingDefenders(5, rng),
        );
        buildings.push(mill);
        usedTiles.add(millKey);
        millTile.neutralBuildingId = millId;
      }
    }
  }

  // Shuffle other tiles for towers
  for (let i = otherTiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [otherTiles[i], otherTiles[j]] = [otherTiles[j], otherTiles[i]];
  }

  // Place towers on ~10% of other tiles with minimum 3-tile distance between them
  const targetTowers = Math.floor(otherTiles.length * 0.10);
  let towersPlaced = 0;
  const towerPositions: HexCoord[] = [];
  const minTowerDist = 3;

  for (const tile of otherTiles) {
    if (towersPlaced >= targetTowers) break;
    const key = hexKey(tile.q, tile.r);
    if (usedTiles.has(key)) continue;
    if (tile.cityId || tile.campId) continue;

    // Check minimum distance to other towers
    let tooCloseToTower = false;
    for (const tp of towerPositions) {
      if (hexDistance(tile, tp) < minTowerDist) {
        tooCloseToTower = true;
        break;
      }
    }
    if (tooCloseToTower) continue;

    const towerId = `nb_${buildings.length + 1}`;
    const tower = createNeutralBuilding(
      towerId,
      "tower",
      { q: tile.q, r: tile.r },
      _neutralBuildingDefenders(6, rng),
    );
    buildings.push(tower);
    usedTiles.add(key);
    tile.neutralBuildingId = towerId;
    towerPositions.push({ q: tile.q, r: tile.r });
    towersPlaced++;
  }

  // ------------------------------------------------------------------
  // Place mage towers on ~5% of remaining passable tiles (3-tile spacing)
  // ------------------------------------------------------------------
  const allPassable: HexTile[] = [];
  for (const tile of grid.allTiles()) {
    if (!isFinite(TERRAIN_DEFINITIONS[tile.terrain].movementCost)) continue;
    if (tile.cityId || tile.campId) continue;
    if (usedTiles.has(hexKey(tile.q, tile.r))) continue;
    let tooClose = false;
    for (const ps of playerStarts) {
      if (hexDistance(tile, ps) < minDistFromStart) { tooClose = true; break; }
    }
    if (!tooClose) allPassable.push(tile);
  }

  // Shuffle
  for (let i = allPassable.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allPassable[i], allPassable[j]] = [allPassable[j], allPassable[i]];
  }

  const targetMageTowers = Math.floor(allPassable.length * 0.05);
  let mageTowersPlaced = 0;
  const mageTowerPositions: HexCoord[] = [];

  for (const tile of allPassable) {
    if (mageTowersPlaced >= targetMageTowers) break;
    const key = hexKey(tile.q, tile.r);
    if (usedTiles.has(key)) continue;

    let tooCloseToOther = false;
    for (const mp of mageTowerPositions) {
      if (hexDistance(tile, mp) < 3) { tooCloseToOther = true; break; }
    }
    if (tooCloseToOther) continue;

    const mtId = `nb_${buildings.length + 1}`;
    const mt = createNeutralBuilding(mtId, "mage_tower", { q: tile.q, r: tile.r }, _neutralBuildingDefenders(5, rng));
    buildings.push(mt);
    usedTiles.add(key);
    tile.neutralBuildingId = mtId;
    mageTowerPositions.push({ q: tile.q, r: tile.r });
    mageTowersPlaced++;
  }

  // ------------------------------------------------------------------
  // Place blacksmiths on ~5% of remaining passable tiles (3-tile spacing)
  // ------------------------------------------------------------------
  const remainingPassable: HexTile[] = [];
  for (const tile of grid.allTiles()) {
    if (!isFinite(TERRAIN_DEFINITIONS[tile.terrain].movementCost)) continue;
    if (tile.cityId || tile.campId) continue;
    if (usedTiles.has(hexKey(tile.q, tile.r))) continue;
    let tooClose = false;
    for (const ps of playerStarts) {
      if (hexDistance(tile, ps) < minDistFromStart) { tooClose = true; break; }
    }
    if (!tooClose) remainingPassable.push(tile);
  }

  for (let i = remainingPassable.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [remainingPassable[i], remainingPassable[j]] = [remainingPassable[j], remainingPassable[i]];
  }

  const targetBlacksmiths = Math.floor(remainingPassable.length * 0.05);
  let blacksmithsPlaced = 0;
  const blacksmithPositions: HexCoord[] = [];

  for (const tile of remainingPassable) {
    if (blacksmithsPlaced >= targetBlacksmiths) break;
    const key = hexKey(tile.q, tile.r);
    if (usedTiles.has(key)) continue;

    let tooCloseToOther = false;
    for (const bp of blacksmithPositions) {
      if (hexDistance(tile, bp) < 3) { tooCloseToOther = true; break; }
    }
    if (tooCloseToOther) continue;

    const bsId = `nb_${buildings.length + 1}`;
    const bs = createNeutralBuilding(bsId, "blacksmith", { q: tile.q, r: tile.r }, _neutralBuildingDefenders(4, rng));
    buildings.push(bs);
    usedTiles.add(key);
    tile.neutralBuildingId = bsId;
    blacksmithPositions.push({ q: tile.q, r: tile.r });
    blacksmithsPlaced++;
  }

  // ------------------------------------------------------------------
  // Guaranteed placement helper
  // ------------------------------------------------------------------
  const _placeGuaranteed = (
    type: NeutralBuilding["type"],
    needed: number,
    positions: HexCoord[],
    defTier: number,
  ) => {
    if (positions.length >= needed) return;
    const remaining = needed - positions.length;
    const candidates: HexTile[] = [];
    for (const tile of grid.allTiles()) {
      if (!isFinite(TERRAIN_DEFINITIONS[tile.terrain].movementCost)) continue;
      if (tile.cityId || tile.campId) continue;
      if (usedTiles.has(hexKey(tile.q, tile.r))) continue;
      candidates.push(tile);
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    let placed = 0;
    for (const tile of candidates) {
      if (placed >= remaining) break;
      const key = hexKey(tile.q, tile.r);
      if (usedTiles.has(key)) continue;
      let tooClose = false;
      for (const p of positions) {
        if (hexDistance(tile, p) < 3) { tooClose = true; break; }
      }
      if (tooClose) continue;
      const id = `nb_${buildings.length + 1}`;
      const b = createNeutralBuilding(id, type, { q: tile.q, r: tile.r }, _neutralBuildingDefenders(defTier, rng));
      buildings.push(b);
      usedTiles.add(key);
      tile.neutralBuildingId = id;
      positions.push({ q: tile.q, r: tile.r });
      placed++;
    }
  };

  // ------------------------------------------------------------------
  // Guaranteed minimum counts based on map radius
  // ------------------------------------------------------------------
  const radius = grid.radius;

  // Mage towers & blacksmiths: radius ≤8→1, 9-10→2, 11+→3/4
  const minMT = radius >= 11 ? 3 : radius >= 9 ? 2 : 1;
  const minBS = radius >= 11 ? 4 : radius >= 9 ? 2 : 1;
  _placeGuaranteed("mage_tower", minMT, mageTowerPositions, 5);
  _placeGuaranteed("blacksmith", minBS, blacksmithPositions, 4);

  // Markets, temples, embassies: 2 at radius 9, +2 per radius above 9
  const marketPositions: HexCoord[] = [];
  const templePositions: HexCoord[] = [];
  const embassyPositions: HexCoord[] = [];

  const minSpecial = radius >= 9 ? 2 + 2 * (radius - 9) : 0;
  const minHalf = Math.max(0, Math.floor(minSpecial / 2));
  _placeGuaranteed("market", minSpecial, marketPositions, 6);
  _placeGuaranteed("temple", minHalf, templePositions, 5);
  _placeGuaranteed("embassy", minHalf, embassyPositions, 5);

  // Faction hall, stables, barracks
  const factionHallPos: HexCoord[] = [];
  const stablesPos: HexCoord[] = [];
  const barracksPos: HexCoord[] = [];
  _placeGuaranteed("faction_hall", minSpecial, factionHallPos, 5);
  _placeGuaranteed("stables", minHalf, stablesPos, 5);
  _placeGuaranteed("barracks", minHalf, barracksPos, 5);

  // Elite buildings: 1 of each from radius 11+
  if (radius >= 11) {
    const eliteBarracksPos: HexCoord[] = [];
    const eliteStablesPos: HexCoord[] = [];
    const eliteHallPos: HexCoord[] = [];
    _placeGuaranteed("elite_barracks", 1, eliteBarracksPos, 6);
    _placeGuaranteed("elite_stables", 1, eliteStablesPos, 6);
    _placeGuaranteed("elite_hall", 1, eliteHallPos, 6);
  }

  return buildings;
}
