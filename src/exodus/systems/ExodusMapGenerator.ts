// ---------------------------------------------------------------------------
// Exodus mode — procedural hex map generator
// ---------------------------------------------------------------------------

import { hexKey, hexDistance, hexNeighbors } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import { ExodusConfig } from "../config/ExodusConfig";
import type { ExodusHex, ExodusTerrainType, ExodusState } from "../state/ExodusState";
import { exodusRng } from "../state/ExodusState";

// ---------------------------------------------------------------------------
// Generate all hex coords within a radius (flat hex spiral)
// ---------------------------------------------------------------------------

function hexesInRadius(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Determine region for a hex based on distance from start
// ---------------------------------------------------------------------------

function assignRegion(hex: HexCoord, start: HexCoord, goal: HexCoord, _mapRadius: number): number {
  const dist = hexDistance(hex, start);
  const maxDist = hexDistance(start, goal);
  const ratio = dist / Math.max(maxDist, 1);
  const regionCount = ExodusConfig.REGIONS;
  return Math.min(Math.floor(ratio * regionCount), regionCount - 1);
}

// ---------------------------------------------------------------------------
// Pick terrain type based on region weights
// ---------------------------------------------------------------------------

function pickTerrain(
  regionIndex: number,
  rng: () => number,
): ExodusTerrainType {
  const regionDef = ExodusConfig.REGION_DEFS[regionIndex];
  const weights = regionDef.terrainWeights as Record<string, number>;
  const entries = Object.entries(weights);
  let total = 0;
  for (const [, w] of entries) total += w;

  let roll = rng() * total;
  for (const [terrain, w] of entries) {
    roll -= w;
    if (roll <= 0) return terrain as ExodusTerrainType;
  }
  return entries[0][0] as ExodusTerrainType;
}

// ---------------------------------------------------------------------------
// Pre-place events on the map
// ---------------------------------------------------------------------------

function assignEvents(
  hexes: Map<string, ExodusHex>,
  rng: () => number,
): void {
  const allHexes = Array.from(hexes.values()).filter(
    (h) => h.terrain !== "water" && !h.visited,
  );

  // ~30% of hexes get pre-placed events
  for (const hex of allHexes) {
    if (rng() < 0.30) {
      // Event will be resolved by ExodusEventSystem at runtime
      hex.eventId = `region_${hex.region}_${Math.floor(rng() * 1000)}`;
    }

    // ~15% chance of loot
    if (rng() < 0.15) {
      hex.loot = {};
      const roll = rng();
      if (roll < 0.4) hex.loot.food = 5 + Math.floor(rng() * 15);
      else if (roll < 0.7) hex.loot.supplies = 3 + Math.floor(rng() * 10);
      else if (roll < 0.9) hex.loot.members = [rng() < 0.5 ? "soldier" : "peasant"];
      // 10% chance of relic on ruins
      else if (hex.terrain === "ruins") hex.loot.relic = "minor_relic";
    }
  }
}

// ---------------------------------------------------------------------------
// Sprinkle water hexes along edges and as natural barriers
// ---------------------------------------------------------------------------

function addWaterBarriers(
  hexes: Map<string, ExodusHex>,
  mapRadius: number,
  rng: () => number,
): void {
  for (const [_key, hex] of hexes) {
    const dist = hexDistance(hex.coord, { q: 0, r: 0 });
    // Edge hexes become water
    if (dist >= mapRadius) {
      hex.terrain = "water";
      continue;
    }
    // Random rivers through interior
    if (dist > 3 && rng() < 0.04) {
      hex.terrain = "water";
    }
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateExodusMap(state: ExodusState): void {
  const rng = exodusRng(state.seed + 7777);
  const radius = state.mapRadius;

  // Determine start and goal positions
  // Start at east, goal at west (caravan moves westward toward Avalon)
  const startQ = radius - 2;
  const startR = 0;
  const goalQ = -(radius - 2);
  const goalR = 0;

  state.startHex = { q: startQ, r: startR };
  state.goalHex = { q: goalQ, r: goalR };
  state.caravanPosition = { q: startQ, r: startR };

  // Pursuer starts behind the caravan (further east)
  state.pursuer.position = { q: radius - 1, r: 0 };

  // Generate all hexes
  const allCoords = hexesInRadius({ q: 0, r: 0 }, radius);

  for (const coord of allCoords) {
    const key = hexKey(coord.q, coord.r);
    const region = assignRegion(coord, state.startHex, state.goalHex, radius);
    const terrain = pickTerrain(region, rng);

    const hex: ExodusHex = {
      coord,
      key,
      terrain,
      region,
      revealed: false,
      visited: false,
      consumed: false,
      eventId: null,
      loot: null,
      dangerLevel: ExodusConfig.REGION_DEFS[region].dangerBase,
    };

    state.hexes.set(key, hex);
  }

  // Add water barriers
  addWaterBarriers(state.hexes, radius, rng);

  // Ensure start and goal hexes are walkable
  const startKey = hexKey(startQ, startR);
  const goalKey = hexKey(goalQ, goalR);
  const startHex = state.hexes.get(startKey);
  const goalHex = state.hexes.get(goalKey);
  if (startHex) {
    startHex.terrain = "plains";
    startHex.revealed = true;
    startHex.visited = true;
    startHex.region = 0;
  }
  if (goalHex) {
    goalHex.terrain = "coast";
    goalHex.region = 4;
  }

  // Ensure a path exists from start to goal by carving plains through water
  ensurePath(state.hexes, state.startHex, state.goalHex, rng);

  // Assign events to hexes
  assignEvents(state.hexes, rng);

  // Reveal starting area
  revealAround(state, state.startHex, 2);

  // Calculate initial adjacent hexes
  updateAdjacentHexes(state);
}

// ---------------------------------------------------------------------------
// Ensure at least one path exists (simple flood-fill + carve)
// ---------------------------------------------------------------------------

function ensurePath(
  hexes: Map<string, ExodusHex>,
  start: HexCoord,
  goal: HexCoord,
  rng: () => number,
): void {
  // Simple: walk from start toward goal, clearing any water in the way
  let current = { ...start };
  const maxSteps = 100;

  for (let step = 0; step < maxSteps; step++) {
    if (current.q === goal.q && current.r === goal.r) break;

    const neighbors = hexNeighbors(current);
    // Pick neighbor closest to goal
    let best: HexCoord | null = null;
    let bestDist = Infinity;

    for (const n of neighbors) {
      const d = hexDistance(n, goal);
      // Add some randomness so the path isn't a straight line
      const jitter = rng() * 2;
      if (d + jitter < bestDist) {
        bestDist = d + jitter;
        best = n;
      }
    }

    if (!best) break;
    const key = hexKey(best.q, best.r);
    const hex = hexes.get(key);
    if (hex && hex.terrain === "water") {
      hex.terrain = "plains";
    }
    current = best;
  }
}

// ---------------------------------------------------------------------------
// Reveal hexes around a position
// ---------------------------------------------------------------------------

export function revealAround(state: ExodusState, center: HexCoord, radius: number): void {
  const coords = hexesInRadius(center, radius);
  for (const c of coords) {
    const key = hexKey(c.q, c.r);
    const hex = state.hexes.get(key);
    if (hex) {
      hex.revealed = true;
      state.revealedKeys.add(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Update adjacent hex options for movement
// ---------------------------------------------------------------------------

export function updateAdjacentHexes(state: ExodusState): void {
  const neighbors = hexNeighbors(state.caravanPosition);
  state.adjacentHexes = neighbors.filter((n) => {
    const key = hexKey(n.q, n.r);
    const hex = state.hexes.get(key);
    if (!hex) return false;
    if (hex.terrain === "water") return false;
    if (hex.consumed) return false;
    return true;
  });
}
