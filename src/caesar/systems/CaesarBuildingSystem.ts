// ---------------------------------------------------------------------------
// Caesar – Building placement, construction, production
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";
import { nextEntityId } from "../state/CaesarState";
import { createBuilding, type CaesarBuilding } from "../state/CaesarBuilding";
import { tileAt, inBounds, tileIdx, type CaesarMapData } from "../state/CaesarMap";

// ---- Placement validation ----

export function canPlaceBuilding(
  state: CaesarState,
  type: CaesarBuildingType,
  tileX: number,
  tileY: number,
): boolean {
  const bdef = CAESAR_BUILDING_DEFS[type];
  const { w, h } = bdef.footprint;
  const map = state.map;

  // Check bounds
  if (!inBounds(map, tileX, tileY) || !inBounds(map, tileX + w - 1, tileY + h - 1)) {
    return false;
  }

  // Check terrain requirements
  if (bdef.requiresTerrain) {
    let hasRequired = false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tile = tileAt(map, tileX + dx, tileY + dy);
        if (tile && tile.terrain === bdef.requiresTerrain) hasRequired = true;
      }
    }
    if (!hasRequired && bdef.requiresTerrain === "meadow") {
      // Meadow = any grass tile
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const tile = tileAt(map, tileX + dx, tileY + dy);
          if (tile && tile.terrain === "grass") hasRequired = true;
        }
      }
    }
    if (!hasRequired) return false;
  }

  // Check all tiles are buildable (not water, not occupied)
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tile = tileAt(map, tileX + dx, tileY + dy);
      if (!tile) return false;
      if (tile.terrain === "water") return false;

      // Check no existing building occupies this tile
      if (isTileOccupied(state, tileX + dx, tileY + dy)) return false;
    }
  }

  // Check gold
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  if (gold < bdef.cost) return false;

  // Roads and walls don't need road adjacency; others need at least one adjacent road
  if (type !== CaesarBuildingType.ROAD && type !== CaesarBuildingType.WALL) {
    if (!hasAdjacentRoad(state, tileX, tileY, w, h)) return false;
  }

  return true;
}

function isTileOccupied(state: CaesarState, tx: number, ty: number): boolean {
  for (const b of state.buildings.values()) {
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const { w, h } = bdef.footprint;
    if (tx >= b.tileX && tx < b.tileX + w && ty >= b.tileY && ty < b.tileY + h) {
      return true;
    }
  }
  return false;
}

function hasAdjacentRoad(state: CaesarState, tx: number, ty: number, fw: number, fh: number): boolean {
  // Check all perimeter tiles for adjacent road
  for (let dy = -1; dy <= fh; dy++) {
    for (let dx = -1; dx <= fw; dx++) {
      // Only check perimeter
      if (dx >= 0 && dx < fw && dy >= 0 && dy < fh) continue;
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(state.map, nx, ny)) continue;
      for (const b of state.buildings.values()) {
        if (b.type === CaesarBuildingType.ROAD && b.tileX === nx && b.tileY === ny) {
          return true;
        }
      }
    }
  }
  return false;
}

// ---- Place building ----

export function placeBuilding(
  state: CaesarState,
  type: CaesarBuildingType,
  tileX: number,
  tileY: number,
): CaesarBuilding | null {
  if (!canPlaceBuilding(state, type, tileX, tileY)) return null;

  const bdef = CAESAR_BUILDING_DEFS[type];

  // Deduct cost
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold - bdef.cost);

  const id = nextEntityId(state);
  const building = createBuilding(id, type, tileX, tileY, bdef.hp || 30);

  // Roads and walls are instantly built
  if (type === CaesarBuildingType.ROAD || type === CaesarBuildingType.WALL ||
      type === CaesarBuildingType.GATE) {
    building.built = true;
    building.constructionProgress = 1;
  }

  state.buildings.set(id, building);

  // Mark road connectivity and desirability as dirty
  if (type === CaesarBuildingType.ROAD) state.roadDirty = true;
  state.desirabilityDirty = true;

  return building;
}

// ---- Demolish ----

export function demolishBuilding(state: CaesarState, buildingId: number): void {
  const b = state.buildings.get(buildingId);
  if (!b) return;

  // Refund 50% of cost
  const bdef = CAESAR_BUILDING_DEFS[b.type];
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold + Math.floor(bdef.cost * 0.5));

  // If housing, reduce population
  if (b.type === CaesarBuildingType.HOUSING) {
    state.population = Math.max(0, state.population - b.residents);
  }

  state.buildings.delete(buildingId);

  // Remove walkers from this building
  for (const [wid, w] of state.walkers) {
    if (w.sourceBuilding === buildingId) {
      state.walkers.delete(wid);
    }
  }

  state.roadDirty = true;
  state.desirabilityDirty = true;
}

// ---- Construction update ----

export function updateConstruction(state: CaesarState, dt: number): void {
  for (const b of state.buildings.values()) {
    if (b.built) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const buildTime = bdef.buildTime;
    if (buildTime <= 0) {
      b.built = true;
      b.constructionProgress = 1;
      continue;
    }

    b.constructionProgress += dt / buildTime;
    if (b.constructionProgress >= 1) {
      b.constructionProgress = 1;
      b.built = true;
    }
  }
}

// ---- Production update ----

export function updateProduction(state: CaesarState, dt: number): void {
  for (const b of state.buildings.values()) {
    if (!b.built) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (bdef.productionTime <= 0) continue;
    if (bdef.outputs.length === 0) continue;

    // Check if inputs are available (from global resources)
    let hasInputs = true;
    for (const inp of bdef.inputs) {
      const available = state.resources.get(inp.type) ?? 0;
      if (available < inp.amount) {
        hasInputs = false;
        break;
      }
    }
    if (!hasInputs) continue;

    b.productionTimer += dt;
    if (b.productionTimer >= bdef.productionTime) {
      b.productionTimer -= bdef.productionTime;

      // Consume inputs
      for (const inp of bdef.inputs) {
        const current = state.resources.get(inp.type) ?? 0;
        state.resources.set(inp.type, current - inp.amount);
      }

      // Produce outputs
      for (const out of bdef.outputs) {
        const current = state.resources.get(out.type) ?? 0;
        state.resources.set(out.type, current + out.amount);
      }
    }
  }
}

// ---- Road connectivity (BFS from center of map) ----

export function recalculateRoadConnectivity(state: CaesarState): void {
  if (!state.roadDirty) return;
  state.roadDirty = false;

  const map = state.map;
  // Reset all
  for (const tile of map.tiles) {
    tile.roadConnected = false;
  }

  // Find all road tiles
  const roadSet = new Set<number>();
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.GATE) {
      const idx = tileIdx(map, b.tileX, b.tileY);
      roadSet.add(idx);
    }
  }

  if (roadSet.size === 0) return;

  // BFS from the first road tile (or town center area)
  const startIdx = roadSet.values().next().value!;
  const visited = new Set<number>();
  const queue: number[] = [startIdx];
  visited.add(startIdx);

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const idx = queue.shift()!;
    const x = idx % map.width;
    const y = Math.floor(idx / map.width);
    map.tiles[idx].roadConnected = true;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(map, nx, ny)) continue;
      const nIdx = tileIdx(map, nx, ny);
      if (visited.has(nIdx)) continue;
      if (!roadSet.has(nIdx)) continue;
      visited.add(nIdx);
      queue.push(nIdx);
    }
  }

  // Also mark tiles adjacent to connected roads as "reachable" for building purposes
  for (const idx of visited) {
    const x = idx % map.width;
    const y = Math.floor(idx / map.width);
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(map, nx, ny)) {
        // Buildings on these tiles can be considered road-connected
      }
    }
  }
}

// ---- Desirability recalculation ----

export function recalculateDesirability(state: CaesarState): void {
  if (!state.desirabilityDirty) return;
  state.desirabilityDirty = false;

  const map = state.map;

  // Reset
  for (const tile of map.tiles) {
    tile.desirability = 0;
  }

  // Accumulate from all buildings
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (bdef.desirability === 0) continue;

    const range = bdef.desirabilityRange;
    const cx = b.tileX + Math.floor(bdef.footprint.w / 2);
    const cy = b.tileY + Math.floor(bdef.footprint.h / 2);

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (!inBounds(map, tx, ty)) continue;
        const dist = Math.abs(dx) + Math.abs(dy); // manhattan distance
        if (dist > range) continue;
        const falloff = 1 - dist * CB.DESIRABILITY_DECAY;
        if (falloff <= 0) continue;
        map.tiles[tileIdx(map, tx, ty)].desirability += bdef.desirability * falloff;
      }
    }
  }
}
