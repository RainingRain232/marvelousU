// ---------------------------------------------------------------------------
// Settlers – Save / Load system (JSON serialization)
// ---------------------------------------------------------------------------

import type { SettlersState } from "../state/SettlersState";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersPlayer } from "../state/SettlersPlayer";
import type { SettlersCarrier, SettlersSoldier, SettlersCombat } from "../state/SettlersUnit";
import type { SettlersFlag, SettlersRoadSegment } from "../state/SettlersRoad";
import type { ResourceType } from "../config/SettlersResourceDefs";

// ---------------------------------------------------------------------------
// Serializable types (Maps → plain objects)
// ---------------------------------------------------------------------------

interface SaveData {
  version: 1;
  timestamp: number;
  state: SerializedState;
}

interface SerializedState {
  tick: number;
  paused: boolean;
  gameOver: boolean;
  winner: string | null;
  nextId: number;
  screenW: number;
  screenH: number;

  map: {
    width: number;
    height: number;
    tileSize: number;
    heightmap: number[];
    biomes: number[];
    deposits: number[];
    territory: number[];
    buildable: number[];
    occupied: string[];
    visibility?: number[][];
    trees: { x: number; z: number; scale: number; variant: number }[];
    rocks: { x: number; z: number; scale: number }[];
  };

  players: Record<string, SettlersPlayer & { storage: Record<string, number> }>;
  buildings: Record<string, SettlersBuilding>;
  flags: Record<string, SerializedFlag>;
  roads: Record<string, SettlersRoadSegment>;
  carriers: Record<string, SettlersCarrier>;
  soldiers: Record<string, SettlersSoldier>;
  combats: SettlersCombat[];
}

interface SerializedFlag extends Omit<SettlersFlag, "inventory"> {
  inventory: { type: string; targetBuildingId: string; nextFlagId: string }[];
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export function saveGame(state: SettlersState): string {
  const data: SaveData = {
    version: 1,
    timestamp: Date.now(),
    state: serializeState(state),
  };
  return JSON.stringify(data);
}

export function saveToLocalStorage(state: SettlersState, slot: string = "settlers_save"): void {
  const json = saveGame(state);
  localStorage.setItem(slot, json);
}

function serializeState(state: SettlersState): SerializedState {
  // Players: convert Map<ResourceType, number> to Record
  const players: Record<string, any> = {};
  for (const [id, p] of state.players) {
    const storageObj: Record<string, number> = {};
    for (const [res, count] of p.storage) {
      storageObj[res] = count;
    }
    players[id] = { ...p, storage: storageObj };
  }

  // Flags: inventory items
  const flags: Record<string, any> = {};
  for (const [id, f] of state.flags) {
    flags[id] = {
      ...f,
      inventory: f.inventory.map((item) => ({
        type: item.type,
        targetBuildingId: item.targetBuildingId,
        nextFlagId: item.nextFlagId,
      })),
    };
  }

  // Simple Map -> Record conversions
  const buildings: Record<string, SettlersBuilding> = {};
  for (const [id, b] of state.buildings) buildings[id] = b;

  const roads: Record<string, SettlersRoadSegment> = {};
  for (const [id, r] of state.roads) roads[id] = r;

  const carriers: Record<string, SettlersCarrier> = {};
  for (const [id, c] of state.carriers) carriers[id] = c;

  const soldiers: Record<string, SettlersSoldier> = {};
  for (const [id, s] of state.soldiers) soldiers[id] = s;

  return {
    tick: state.tick,
    paused: state.paused,
    gameOver: state.gameOver,
    winner: state.winner,
    nextId: state.nextId,
    screenW: state.screenW,
    screenH: state.screenH,
    map: {
      width: state.map.width,
      height: state.map.height,
      tileSize: state.map.tileSize,
      heightmap: Array.from(state.map.heightmap),
      biomes: Array.from(state.map.biomes),
      deposits: Array.from(state.map.deposits),
      territory: Array.from(state.map.territory),
      buildable: Array.from(state.map.buildable),
      occupied: [...state.map.occupied],
      visibility: state.map.visibility.map(v => Array.from(v)),
      trees: state.map.trees,
      rocks: state.map.rocks,
    },
    players,
    buildings,
    flags,
    roads,
    carriers,
    soldiers,
    combats: state.combats,
  };
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export function loadFromLocalStorage(slot: string = "settlers_save"): SettlersState | null {
  const json = localStorage.getItem(slot);
  if (!json) return null;
  return loadGame(json);
}

export function loadGame(json: string): SettlersState | null {
  try {
    const data: SaveData = JSON.parse(json);
    if (data.version !== 1) return null;
    return deserializeState(data.state);
  } catch {
    return null;
  }
}

function deserializeState(s: SerializedState): SettlersState {
  const map = {
    width: s.map.width,
    height: s.map.height,
    tileSize: s.map.tileSize,
    heightmap: new Float32Array(s.map.heightmap),
    biomes: new Uint8Array(s.map.biomes),
    deposits: new Uint8Array(s.map.deposits),
    territory: new Int8Array(s.map.territory),
    buildable: new Uint8Array(s.map.buildable),
    occupied: s.map.occupied,
    visibility: s.map.visibility
      ? s.map.visibility.map(v => new Uint8Array(v))
      : [
          new Uint8Array(s.map.width * s.map.height),
          new Uint8Array(s.map.width * s.map.height),
        ],
    trees: s.map.trees,
    rocks: s.map.rocks,
  };

  // Players
  const players = new Map<string, SettlersPlayer>();
  for (const [id, p] of Object.entries(s.players)) {
    const storage = new Map<ResourceType, number>();
    for (const [res, count] of Object.entries((p as any).storage)) {
      storage.set(res as ResourceType, count as number);
    }
    const player = { ...p, storage } as SettlersPlayer;
    // Backward compat: old saves won't have personality fields
    if (player.aiPersonality === undefined) player.aiPersonality = null;
    if (player.aiPersonalityRevealed === undefined) player.aiPersonalityRevealed = false;
    players.set(id, player);
  }

  // Simple Record -> Map conversions
  const buildings = new Map<string, SettlersBuilding>();
  for (const [id, b] of Object.entries(s.buildings)) {
    // Ensure new fields exist (backward compat with old saves)
    if (!(b as any).productionQueue) (b as any).productionQueue = [];
    if ((b as any).level === undefined) (b as any).level = 1;
    if ((b as any).upgradeProgress === undefined) (b as any).upgradeProgress = 0;
    if ((b as any).marketSellResource === undefined) (b as any).marketSellResource = null;
    if ((b as any).marketBuyResource === undefined) (b as any).marketBuyResource = null;
    buildings.set(id, b);
  }

  const flags = new Map<string, SettlersFlag>();
  for (const [id, f] of Object.entries(s.flags)) {
    flags.set(id, {
      ...f,
      inventory: f.inventory.map((item: any) => ({
        type: item.type as ResourceType,
        targetBuildingId: item.targetBuildingId,
        nextFlagId: item.nextFlagId,
      })),
    } as SettlersFlag);
  }

  const roads = new Map<string, SettlersRoadSegment>();
  for (const [id, r] of Object.entries(s.roads)) roads.set(id, r);

  const carriers = new Map<string, SettlersCarrier>();
  for (const [id, c] of Object.entries(s.carriers)) carriers.set(id, c);

  const soldiers = new Map<string, SettlersSoldier>();
  for (const [id, sol] of Object.entries(s.soldiers)) {
    // Migrate old saves that lack pathWaypoints
    if (!sol.pathWaypoints) sol.pathWaypoints = [];
    // Migration: add fields introduced with archer/knight unit types
    if (!sol.unitType) sol.unitType = "swordsman";
    if (!sol.attackRange) sol.attackRange = 1;
    if (!sol.moveSpeed) sol.moveSpeed = 1.5;
    soldiers.set(id, sol);
  }

  return {
    tick: s.tick,
    paused: s.paused,
    gameOver: s.gameOver,
    winner: s.winner,
    map,
    players,
    buildings,
    flags,
    roads,
    carriers,
    soldiers,
    combats: s.combats,
    nextId: s.nextId,
    selectedTool: "select",
    selectedBuildingType: null,
    hoveredTile: null,
    selectedBuildingId: null,
    roadDrawing: { active: false, startFlagId: null, path: [] },
    screenW: s.screenW,
    screenH: s.screenH,
    territoryDirty: true, // recalculate territory on load
    fogDirty: true, // recalculate fog on load
    difficulty: (s as any).difficulty || "normal",
    gameSpeed: (s as any).gameSpeed || 1,
    mapMode: (s as any).mapMode || "CONTINENTAL",
    eventState: (s as any).eventState || null,
  };
}

export function hasSavedGame(slot: string = "settlers_save"): boolean {
  return localStorage.getItem(slot) !== null;
}
