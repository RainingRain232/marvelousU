// ---------------------------------------------------------------------------
// Settlers – Random terrain events system
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { Biome, Deposit, inBounds, tileIdx } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export enum SettlersEventType {
  FOREST_FIRE = "FOREST_FIRE",
  MINE_COLLAPSE = "MINE_COLLAPSE",
  BOUNTIFUL_HARVEST = "BOUNTIFUL_HARVEST",
  GOLD_RUSH = "GOLD_RUSH",
}

export interface SettlersEvent {
  type: SettlersEventType;
  tileX: number;
  tileZ: number;
  startTick: number;
  duration: number; // in ticks
  /** For MINE_COLLAPSE: the building id of the disabled mine */
  targetBuildingId?: string;
  /** For BOUNTIFUL_HARVEST: the building id of the boosted farm */
  targetFarmId?: string;
  /** Track whether initial effect has been applied */
  applied: boolean;
}

// ---------------------------------------------------------------------------
// State extension – stored on SettlersState via the events field
// ---------------------------------------------------------------------------

export interface SettlersEventState {
  events: SettlersEvent[];
  nextEventTick: number;
}

/** Create initial event state */
export function createEventState(): SettlersEventState {
  // First event fires after the minimum interval
  return {
    events: [],
    nextEventTick: SB.EVENT_MIN_INTERVAL * SB.SIM_TPS,
  };
}

// ---------------------------------------------------------------------------
// Update – call every sim tick
// ---------------------------------------------------------------------------

export function updateEvents(state: SettlersState, dt: number): string | null {
  const es = state.eventState;
  if (!es) return null;

  let toast: string | null = null;

  // --- 1. Check if it's time to fire a new event ---
  if (state.tick >= es.nextEventTick) {
    toast = fireRandomEvent(state);
    // Schedule next event
    const minTicks = SB.EVENT_MIN_INTERVAL * SB.SIM_TPS;
    const maxTicks = SB.EVENT_MAX_INTERVAL * SB.SIM_TPS;
    es.nextEventTick = state.tick + minTicks + Math.floor(Math.random() * (maxTicks - minTicks));
  }

  // --- 2. Apply ongoing effects ---
  applyOngoingEffects(state, dt);

  // --- 3. Clean up expired events ---
  es.events = es.events.filter((e) => state.tick < e.startTick + e.duration);

  return toast;
}

// ---------------------------------------------------------------------------
// Fire a random event
// ---------------------------------------------------------------------------

function fireRandomEvent(state: SettlersState): string | null {
  const roll = Math.random();
  if (roll < 0.30) return fireForestFire(state);
  if (roll < 0.55) return fireMineCollapse(state);
  if (roll < 0.80) return fireBountifulHarvest(state);
  return fireGoldRush(state);
}

// ---------------------------------------------------------------------------
// FOREST_FIRE – destroy trees in a 3x3 area, damage woodcutters
// ---------------------------------------------------------------------------

function fireForestFire(state: SettlersState): string | null {
  const map = state.map;
  // Find a random forest tile
  const forestTiles: { x: number; z: number }[] = [];
  for (let tz = 2; tz < map.height - 2; tz++) {
    for (let tx = 2; tx < map.width - 2; tx++) {
      if (map.biomes[tileIdx(map, tx, tz)] === Biome.FOREST) {
        forestTiles.push({ x: tx, z: tz });
      }
    }
  }
  if (forestTiles.length === 0) return null;

  const center = forestTiles[Math.floor(Math.random() * forestTiles.length)];

  // Remove trees in 3x3 area
  const ts = map.tileSize;
  const minX = (center.x - 1) * ts;
  const maxX = (center.x + 2) * ts;
  const minZ = (center.z - 1) * ts;
  const maxZ = (center.z + 2) * ts;
  map.trees = map.trees.filter(
    (t) => t.x < minX || t.x > maxX || t.z < minZ || t.z > maxZ,
  );

  // Change forest biome to meadow in the 3x3 area
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = center.x + dx;
      const tz = center.z + dz;
      if (inBounds(map, tx, tz)) {
        const idx = tileIdx(map, tx, tz);
        if (map.biomes[idx] === Biome.FOREST) {
          map.biomes[idx] = Biome.MEADOW;
        }
      }
    }
  }

  // Damage/destroy woodcutters in the area
  for (const [, building] of state.buildings) {
    if (building.type !== SettlersBuildingType.WOODCUTTER) continue;
    if (
      building.tileX >= center.x - 1 && building.tileX <= center.x + 1 &&
      building.tileZ >= center.z - 1 && building.tileZ <= center.z + 1
    ) {
      // Deal heavy damage
      building.hp = Math.max(0, building.hp - Math.floor(building.maxHp * 0.6));
    }
  }

  const evt: SettlersEvent = {
    type: SettlersEventType.FOREST_FIRE,
    tileX: center.x,
    tileZ: center.z,
    startTick: state.tick,
    duration: 5 * SB.SIM_TPS, // visual only, effect is instant
    applied: true,
  };
  state.eventState!.events.push(evt);

  return "A forest fire broke out!";
}

// ---------------------------------------------------------------------------
// MINE_COLLAPSE – disable one mine for 30 seconds
// ---------------------------------------------------------------------------

function fireMineCollapse(state: SettlersState): string | null {
  const mines: string[] = [];
  for (const [, building] of state.buildings) {
    if (
      building.active &&
      (building.type === SettlersBuildingType.IRON_MINE ||
       building.type === SettlersBuildingType.GOLD_MINE ||
       building.type === SettlersBuildingType.COAL_MINE)
    ) {
      mines.push(building.id);
    }
  }
  if (mines.length === 0) return null;

  const mineId = mines[Math.floor(Math.random() * mines.length)];
  const mine = state.buildings.get(mineId)!;

  // Disable the mine
  mine.active = false;

  const durationTicks = SB.EVENT_MINE_COLLAPSE_DURATION * SB.SIM_TPS;
  const evt: SettlersEvent = {
    type: SettlersEventType.MINE_COLLAPSE,
    tileX: mine.tileX,
    tileZ: mine.tileZ,
    startTick: state.tick,
    duration: durationTicks,
    targetBuildingId: mineId,
    applied: true,
  };
  state.eventState!.events.push(evt);

  return "A mine has collapsed!";
}

// ---------------------------------------------------------------------------
// BOUNTIFUL_HARVEST – one farm produces double for 30 seconds
// ---------------------------------------------------------------------------

function fireBountifulHarvest(state: SettlersState): string | null {
  const farms: string[] = [];
  for (const [id, building] of state.buildings) {
    if (building.active && building.type === SettlersBuildingType.FARM) {
      farms.push(id);
    }
  }
  if (farms.length === 0) return null;

  const farmId = farms[Math.floor(Math.random() * farms.length)];
  const farm = state.buildings.get(farmId)!;

  const durationTicks = SB.EVENT_HARVEST_DURATION * SB.SIM_TPS;
  const evt: SettlersEvent = {
    type: SettlersEventType.BOUNTIFUL_HARVEST,
    tileX: farm.tileX,
    tileZ: farm.tileZ,
    startTick: state.tick,
    duration: durationTicks,
    targetFarmId: farmId,
    applied: true,
  };
  state.eventState!.events.push(evt);

  return "Bountiful harvest!";
}

// ---------------------------------------------------------------------------
// GOLD_RUSH – new gold deposit on a random mountain tile
// ---------------------------------------------------------------------------

function fireGoldRush(state: SettlersState): string | null {
  const map = state.map;
  const candidates: { x: number; z: number }[] = [];
  for (let tz = 0; tz < map.height; tz++) {
    for (let tx = 0; tx < map.width; tx++) {
      const idx = tileIdx(map, tx, tz);
      if (map.biomes[idx] === Biome.MOUNTAIN && map.deposits[idx] === Deposit.NONE) {
        candidates.push({ x: tx, z: tz });
      }
    }
  }
  if (candidates.length === 0) return null;

  const tile = candidates[Math.floor(Math.random() * candidates.length)];
  map.deposits[tileIdx(map, tile.x, tile.z)] = Deposit.GOLD;

  const evt: SettlersEvent = {
    type: SettlersEventType.GOLD_RUSH,
    tileX: tile.x,
    tileZ: tile.z,
    startTick: state.tick,
    duration: 5 * SB.SIM_TPS, // toast display duration only
    applied: true,
  };
  state.eventState!.events.push(evt);

  return "Gold discovered!";
}

// ---------------------------------------------------------------------------
// Apply ongoing effects (BOUNTIFUL_HARVEST doubles production speed)
// ---------------------------------------------------------------------------

function applyOngoingEffects(state: SettlersState, dt: number): void {
  const es = state.eventState;
  if (!es) return;

  for (const evt of es.events) {
    if (evt.type === SettlersEventType.BOUNTIFUL_HARVEST && evt.targetFarmId) {
      const farm = state.buildings.get(evt.targetFarmId);
      if (farm && farm.active) {
        // Tick the production timer an extra time (effectively doubling speed)
        farm.productionTimer -= dt;
      }
    }

    // Re-enable mine when collapse expires
    if (evt.type === SettlersEventType.MINE_COLLAPSE && evt.targetBuildingId) {
      if (state.tick >= evt.startTick + evt.duration - 1) {
        const mine = state.buildings.get(evt.targetBuildingId);
        if (mine && mine.constructionProgress >= 1) {
          mine.active = true;
        }
      }
    }
  }
}
