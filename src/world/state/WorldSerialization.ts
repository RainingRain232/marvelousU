// Save/load world game state to/from localStorage.

import { HexGrid } from "@world/hex/HexGrid";
import type { HexTile } from "@world/hex/HexGrid";
import type { WorldState } from "@world/state/WorldState";
import { WorldPhase } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldArmy } from "@world/state/WorldArmy";
import type { WorldCamp } from "@world/state/WorldCamp";
import type { NeutralBuilding } from "@world/state/NeutralBuilding";
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
  mana: number;
  isAI: boolean;
  isAlive: boolean;
  morgaineCrystals: number;
  armoryItems: string[];
  activeResearch: string | null;
  researchTurnsLeft: number;
  researchProgress: number;
  completedResearch: string[];
  activeMagicResearch: { school: string; tier: number } | null;
  magicResearchProgress: number;
  completedMagicResearch: Record<string, number>;
  magicResearchRatio: number;
  diplomacy: Record<string, string>;
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
  neutralBuildings: Record<string, NeutralBuilding>;
  pendingBattles: PendingBattle[];
  winnerId: string | null;
  swordHex: { q: number; r: number } | null;
  swordClaimed: boolean;
  fakeSwordHexes: { q: number; r: number }[];
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
      mana: p.mana,
      isAI: p.isAI,
      isAlive: p.isAlive,
      morgaineCrystals: p.morgaineCrystals,
      armoryItems: [...p.armoryItems],
      activeResearch: p.activeResearch,
      researchTurnsLeft: p.researchTurnsLeft,
      researchProgress: p.researchProgress,
      completedResearch: [...p.completedResearch],
      activeMagicResearch: p.activeMagicResearch ? { ...p.activeMagicResearch } : null,
      magicResearchProgress: p.magicResearchProgress,
      completedMagicResearch: Object.fromEntries(p.completedMagicResearch),
      magicResearchRatio: p.magicResearchRatio,
      diplomacy: Object.fromEntries(p.diplomacy),
      exploredTiles: [...p.exploredTiles],
    };
  }

  const cities: Record<string, WorldCity> = {};
  for (const [id, c] of state.cities) cities[id] = c;

  const armies: Record<string, WorldArmy> = {};
  for (const [id, a] of state.armies) armies[id] = a;

  const camps: Record<string, WorldCamp> = {};
  for (const [id, c] of state.camps) camps[id] = c;

  const neutralBuildings: Record<string, NeutralBuilding> = {};
  for (const [id, nb] of state.neutralBuildings) neutralBuildings[id] = nb;

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
    neutralBuildings,
    pendingBattles: [...state.pendingBattles],
    winnerId: state.winnerId,
    swordHex: state.swordHex,
    swordClaimed: state.swordClaimed,
    fakeSwordHexes: state.fakeSwordHexes ? [...state.fakeSwordHexes] : [],
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
      mana: sp.mana ?? 0,
      isAI: sp.isAI,
      isAlive: sp.isAlive,
      morgaineCrystals: sp.morgaineCrystals ?? 0,
      armoryItems: [...sp.armoryItems],
      activeResearch: sp.activeResearch,
      researchTurnsLeft: sp.researchTurnsLeft,
      researchProgress: sp.researchProgress ?? 0,
      completedResearch: new Set(sp.completedResearch),
      activeMagicResearch: sp.activeMagicResearch ?? null,
      magicResearchProgress: sp.magicResearchProgress ?? 0,
      completedMagicResearch: new Map(Object.entries(sp.completedMagicResearch ?? {})),
      magicResearchRatio: sp.magicResearchRatio ?? 0.5,
      diplomacy: new Map(Object.entries(sp.diplomacy ?? {})) as Map<string, "war" | "peace">,
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

  const neutralBuildings = new Map<string, NeutralBuilding>();
  if (data.neutralBuildings) {
    for (const [id, nb] of Object.entries(data.neutralBuildings)) neutralBuildings.set(id, nb);
  }

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
    neutralBuildings,
    pendingBattles: [...data.pendingBattles],
    winnerId: data.winnerId,
    swordHex: data.swordHex ?? null,
    swordClaimed: data.swordClaimed ?? false,
    fakeSwordHexes: data.fakeSwordHexes ?? [],
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
