// Save/load world game state to/from localStorage.

import { HexGrid } from "@world/hex/HexGrid";
import type { HexTile } from "@world/hex/HexGrid";
import type { WorldState } from "@world/state/WorldState";
import { WorldPhase } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldArmy } from "@world/state/WorldArmy";
import type { WorldCamp } from "@world/state/WorldCamp";
import type { PendingBattle } from "@world/state/WorldState";
import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const WORLD_SAVE_KEY = "world_save_v1";

// ---------------------------------------------------------------------------
// Serialized interfaces (JSON-safe — no Maps, Sets, or class instances)
// ---------------------------------------------------------------------------

interface SerializedWorldPlayer {
  id: string;
  raceId: string;
  leaderId: string | null;
  gold: number;
  food: number;
  isAI: boolean;
  isAlive: boolean;
  armoryItems: string[];
  activeResearch: string | null;
  researchTurnsLeft: number;
  completedResearch: string[];
  exploredTiles: string[];
}

interface SerializedWorldState {
  version: 1;
  turn: number;
  currentPlayerIndex: number;
  playerOrder: string[];
  phase: string;
  gridRadius: number;
  tiles: HexTile[];
  cities: Record<string, WorldCity>;
  armies: Record<string, WorldArmy>;
  players: Record<string, SerializedWorldPlayer>;
  camps: Record<string, WorldCamp>;
  pendingBattles: PendingBattle[];
  winnerId: string | null;
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

function serializeWorldState(state: WorldState): SerializedWorldState {
  const tiles: HexTile[] = [];
  for (const tile of state.grid.allTiles()) {
    tiles.push({ ...tile });
  }

  const players: Record<string, SerializedWorldPlayer> = {};
  for (const [id, p] of state.players) {
    players[id] = {
      id: p.id,
      raceId: p.raceId,
      leaderId: p.leaderId,
      gold: p.gold,
      food: p.food,
      isAI: p.isAI,
      isAlive: p.isAlive,
      armoryItems: [...p.armoryItems],
      activeResearch: p.activeResearch,
      researchTurnsLeft: p.researchTurnsLeft,
      completedResearch: [...p.completedResearch],
      exploredTiles: [...p.exploredTiles],
    };
  }

  const cities: Record<string, WorldCity> = {};
  for (const [id, c] of state.cities) cities[id] = c;

  const armies: Record<string, WorldArmy> = {};
  for (const [id, a] of state.armies) armies[id] = a;

  const camps: Record<string, WorldCamp> = {};
  for (const [id, c] of state.camps) camps[id] = c;

  return {
    version: 1,
    turn: state.turn,
    currentPlayerIndex: state.currentPlayerIndex,
    playerOrder: [...state.playerOrder],
    phase: state.phase,
    gridRadius: state.grid.radius,
    tiles,
    cities,
    armies,
    players,
    camps,
    pendingBattles: [...state.pendingBattles],
    winnerId: state.winnerId,
    nextEntityId: state.nextEntityId,
  };
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

function deserializeWorldState(data: SerializedWorldState): WorldState {
  const grid = new HexGrid(data.gridRadius);
  for (const t of data.tiles) {
    grid.setTile(t);
  }

  const players = new Map<string, WorldPlayer>();
  for (const [id, sp] of Object.entries(data.players)) {
    players.set(id, {
      id: sp.id,
      raceId: sp.raceId as RaceId,
      leaderId: sp.leaderId as LeaderId | null,
      gold: sp.gold,
      food: sp.food,
      isAI: sp.isAI,
      isAlive: sp.isAlive,
      armoryItems: [...sp.armoryItems],
      activeResearch: sp.activeResearch,
      researchTurnsLeft: sp.researchTurnsLeft,
      completedResearch: new Set(sp.completedResearch),
      exploredTiles: new Set(sp.exploredTiles),
      visibleTiles: new Set(), // recalculated on load
    });
  }

  const cities = new Map<string, WorldCity>();
  for (const [id, c] of Object.entries(data.cities)) cities.set(id, c);

  const armies = new Map<string, WorldArmy>();
  for (const [id, a] of Object.entries(data.armies)) armies.set(id, a);

  const camps = new Map<string, WorldCamp>();
  for (const [id, c] of Object.entries(data.camps)) camps.set(id, c);

  return {
    turn: data.turn,
    currentPlayerIndex: data.currentPlayerIndex,
    playerOrder: [...data.playerOrder],
    phase: data.phase as WorldPhase,
    grid,
    cities,
    armies,
    players,
    camps,
    pendingBattles: [...data.pendingBattles],
    winnerId: data.winnerId,
    nextEntityId: data.nextEntityId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function saveWorldGame(state: WorldState): void {
  try {
    const serialized = serializeWorldState(state);
    localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(serialized));
  } catch { /* storage unavailable or quota exceeded */ }
}

export function loadWorldGame(): WorldState | null {
  try {
    const raw = localStorage.getItem(WORLD_SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SerializedWorldState;
    if (data.version !== 1) return null;
    return deserializeWorldState(data);
  } catch {
    return null;
  }
}

export function hasWorldSave(): boolean {
  return localStorage.getItem(WORLD_SAVE_KEY) !== null;
}

export function deleteWorldSave(): void {
  localStorage.removeItem(WORLD_SAVE_KEY);
}
