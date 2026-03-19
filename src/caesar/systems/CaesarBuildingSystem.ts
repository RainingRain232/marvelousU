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
import { getProductionMultiplier } from "./CaesarEventSystem";
import { getMoraleProductionMult } from "./CaesarMoraleSystem";
import { getLevelSpeedMult, getLevelOutputMult } from "./CaesarUpgradeSystem";

// ---- Placement validation ----

export function canPlaceBuilding(
  state: CaesarState,
  type: CaesarBuildingType,
  tileX: number,
  tileY: number,
): { ok: boolean; reason: string } {
  const bdef = CAESAR_BUILDING_DEFS[type];
  const { w, h } = bdef.footprint;
  const map = state.map;

  // Check bounds
  if (!inBounds(map, tileX, tileY) || !inBounds(map, tileX + w - 1, tileY + h - 1)) {
    return { ok: false, reason: "Out of bounds" };
  }

  // Check all tiles are buildable (not water, not occupied)
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tile = tileAt(map, tileX + dx, tileY + dy);
      if (!tile) return { ok: false, reason: "Invalid tile" };
      if (tile.terrain === "water") return { ok: false, reason: "Cannot build on water" };
      if (isTileOccupied(state, tileX + dx, tileY + dy)) {
        return { ok: false, reason: "Tile is occupied" };
      }
    }
  }

  // Check terrain requirements
  if (bdef.requiresTerrain) {
    let hasRequired = false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tile = tileAt(map, tileX + dx, tileY + dy);
        if (!tile) continue;
        if (tile.terrain === bdef.requiresTerrain) hasRequired = true;
        if (bdef.requiresTerrain === "meadow" && tile.terrain === "grass") hasRequired = true;
      }
    }
    if (!hasRequired) return { ok: false, reason: `Requires ${bdef.requiresTerrain} terrain` };
  }

  // Check gold
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  if (gold < bdef.cost) return { ok: false, reason: `Need ${bdef.cost} gold (have ${Math.floor(gold)})` };

  // Check material costs
  if (bdef.woodCost > 0) {
    const wood = state.resources.get(CaesarResourceType.WOOD) ?? 0;
    if (wood < bdef.woodCost) return { ok: false, reason: `Need ${bdef.woodCost} wood (have ${Math.floor(wood)})` };
  }
  if (bdef.stoneCost > 0) {
    const stone = state.resources.get(CaesarResourceType.STONE) ?? 0;
    if (stone < bdef.stoneCost) return { ok: false, reason: `Need ${bdef.stoneCost} stone (have ${Math.floor(stone)})` };
  }

  // Roads, walls, and gates don't need road adjacency
  if (type !== CaesarBuildingType.ROAD && type !== CaesarBuildingType.WALL &&
      type !== CaesarBuildingType.GATE) {
    if (!hasAdjacentRoad(state, tileX, tileY, w, h)) {
      return { ok: false, reason: "Must be adjacent to a road" };
    }
  }

  return { ok: true, reason: "" };
}

/** Simple boolean check for backward compat */
export function canPlace(state: CaesarState, type: CaesarBuildingType, tileX: number, tileY: number): boolean {
  return canPlaceBuilding(state, type, tileX, tileY).ok;
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
  for (let dy = -1; dy <= fh; dy++) {
    for (let dx = -1; dx <= fw; dx++) {
      if (dx >= 0 && dx < fw && dy >= 0 && dy < fh) continue;
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(state.map, nx, ny)) continue;
      for (const b of state.buildings.values()) {
        if ((b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.GATE) &&
            b.tileX === nx && b.tileY === ny) {
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
  if (!canPlace(state, type, tileX, tileY)) return null;

  const bdef = CAESAR_BUILDING_DEFS[type];

  // Deduct costs
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold - bdef.cost);
  if (bdef.woodCost > 0) {
    const wood = state.resources.get(CaesarResourceType.WOOD) ?? 0;
    state.resources.set(CaesarResourceType.WOOD, wood - bdef.woodCost);
  }
  if (bdef.stoneCost > 0) {
    const stone = state.resources.get(CaesarResourceType.STONE) ?? 0;
    state.resources.set(CaesarResourceType.STONE, stone - bdef.stoneCost);
  }

  const id = nextEntityId(state);
  const building = createBuilding(id, type, tileX, tileY, bdef.hp || 30);

  // Roads, walls, and gates are instantly built
  if (type === CaesarBuildingType.ROAD || type === CaesarBuildingType.WALL ||
      type === CaesarBuildingType.GATE) {
    building.built = true;
    building.constructionProgress = 1;
  }

  state.buildings.set(id, building);

  if (type === CaesarBuildingType.ROAD || type === CaesarBuildingType.GATE) {
    state.roadDirty = true;
  }
  state.desirabilityDirty = true;

  return building;
}

// ---- Demolish ----

export function demolishBuilding(state: CaesarState, buildingId: number): void {
  const b = state.buildings.get(buildingId);
  if (!b) return;

  const bdef = CAESAR_BUILDING_DEFS[b.type];

  // Refund: 50% if built, 75% if still under construction
  const refundRate = b.built ? 0.5 : 0.75;
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold + Math.floor(bdef.cost * refundRate));

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

    // Skip burning/disconnected buildings
    if (b.onFire) continue;
    if (!isBuildingRoadConnected(state, b)) continue;

    // Workers affect production speed: 0 workers = no production
    const workerEfficiency = bdef.maxWorkers > 0
      ? b.workers / bdef.maxWorkers
      : 1;
    if (workerEfficiency <= 0) continue;

    // Level and morale multipliers
    const levelSpeed = getLevelSpeedMult(b.level);
    const moraleMult = getMoraleProductionMult(state);

    // Check if inputs are available
    let hasInputs = true;
    for (const inp of bdef.inputs) {
      const available = state.resources.get(inp.type) ?? 0;
      if (available < inp.amount) {
        hasInputs = false;
        break;
      }
    }
    if (!hasInputs) continue;

    // Check if output would exceed storage cap
    let hasStorageRoom = true;
    for (const out of bdef.outputs) {
      const current = state.resources.get(out.type) ?? 0;
      const cap = state.resourceCaps.get(out.type) ?? CB.BASE_STORAGE_CAP;
      if (current >= cap) { hasStorageRoom = false; break; }
    }
    if (!hasStorageRoom) continue;

    b.productionTimer += dt * workerEfficiency * levelSpeed * moraleMult;
    if (b.productionTimer >= bdef.productionTime) {
      b.productionTimer -= bdef.productionTime;

      for (const inp of bdef.inputs) {
        const current = state.resources.get(inp.type) ?? 0;
        state.resources.set(inp.type, current - inp.amount);
      }

      for (const out of bdef.outputs) {
        const eventMult = getProductionMultiplier(state, out.type);
        const lvlMult = getLevelOutputMult(b.level);
        const amount = Math.max(1, Math.floor(out.amount * eventMult * lvlMult));
        const current = state.resources.get(out.type) ?? 0;
        const cap = state.resourceCaps.get(out.type) ?? CB.BASE_STORAGE_CAP;
        const added = Math.min(cap - current, amount);
        state.resources.set(out.type, current + added);
        state.goodsProduced += added;
      }
    }
  }
}

/** Check if a building is adjacent to a connected road */
export function isBuildingRoadConnected(state: CaesarState, b: CaesarBuilding): boolean {
  const bdef = CAESAR_BUILDING_DEFS[b.type];
  // Roads/walls are always "connected" to themselves
  if (b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.WALL ||
      b.type === CaesarBuildingType.GATE) return true;

  const { w, h } = bdef.footprint;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      for (const [ddx, ddy] of dirs) {
        const nx = b.tileX + dx + ddx;
        const ny = b.tileY + dy + ddy;
        if (!inBounds(state.map, nx, ny)) continue;
        const tile = tileAt(state.map, nx, ny);
        if (tile && tile.roadConnected) return true;
      }
    }
  }
  return false;
}

/** Recalculate storage caps based on granaries/warehouses */
export function recalculateStorageCaps(state: CaesarState): void {
  // Reset to base
  for (const rt of Object.values(CaesarResourceType)) {
    state.resourceCaps.set(
      rt as CaesarResourceType,
      rt === CaesarResourceType.GOLD ? 99999 : CB.BASE_STORAGE_CAP,
    );
  }

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type === CaesarBuildingType.GRANARY) {
      const foodCap = state.resourceCaps.get(CaesarResourceType.FOOD) ?? CB.BASE_STORAGE_CAP;
      state.resourceCaps.set(CaesarResourceType.FOOD, foodCap + CB.GRANARY_FOOD_BONUS);
      const wheatCap = state.resourceCaps.get(CaesarResourceType.WHEAT) ?? CB.BASE_STORAGE_CAP;
      state.resourceCaps.set(CaesarResourceType.WHEAT, wheatCap + CB.GRANARY_WHEAT_BONUS);
      const flourCap = state.resourceCaps.get(CaesarResourceType.FLOUR) ?? CB.BASE_STORAGE_CAP;
      state.resourceCaps.set(CaesarResourceType.FLOUR, flourCap + CB.GRANARY_WHEAT_BONUS);
    }
    if (b.type === CaesarBuildingType.WAREHOUSE) {
      for (const rt of [CaesarResourceType.WOOD, CaesarResourceType.STONE, CaesarResourceType.IRON,
                         CaesarResourceType.TOOLS, CaesarResourceType.CLOTH]) {
        const cap = state.resourceCaps.get(rt) ?? CB.BASE_STORAGE_CAP;
        state.resourceCaps.set(rt, cap + CB.WAREHOUSE_BONUS);
      }
    }
  }
}

// ---- Road connectivity (BFS) ----

export function recalculateRoadConnectivity(state: CaesarState): void {
  if (!state.roadDirty) return;
  state.roadDirty = false;

  const map = state.map;
  for (const tile of map.tiles) {
    tile.roadConnected = false;
  }

  const roadSet = new Set<number>();
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.GATE) {
      const idx = tileIdx(map, b.tileX, b.tileY);
      roadSet.add(idx);
    }
  }

  if (roadSet.size === 0) return;

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
}

// ---- Desirability recalculation (Euclidean distance) ----

export function recalculateDesirability(state: CaesarState): void {
  if (!state.desirabilityDirty) return;
  state.desirabilityDirty = false;

  const map = state.map;

  for (const tile of map.tiles) {
    tile.desirability = 0;
  }

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
        const dist = Math.sqrt(dx * dx + dy * dy); // Euclidean
        if (dist > range) continue;
        const falloff = 1 - (dist / range);
        map.tiles[tileIdx(map, tx, ty)].desirability += bdef.desirability * falloff;
      }
    }
  }
}
