// Central world state — single source of truth for a world game session.

import { HexGrid } from "@world/hex/HexGrid";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldArmy } from "@world/state/WorldArmy";
import type { WorldCamp } from "@world/state/WorldCamp";
import type { NeutralBuilding } from "@world/state/NeutralBuilding";
import type { HexCoord } from "@world/hex/HexCoord";

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export enum WorldPhase {
  /** Waiting for player to take actions (move armies, manage cities, etc.). */
  PLAYER_TURN = "player_turn",
  /** Resolving battles from collisions this turn. */
  BATTLE = "battle",
  /** AI players are taking their turns. */
  AI_TURN = "ai_turn",
  /** Game over — a winner has been determined. */
  GAME_OVER = "game_over",
}

// ---------------------------------------------------------------------------
// Pending battle
// ---------------------------------------------------------------------------

export interface PendingBattle {
  type: "field" | "siege";
  attackerArmyId: string;
  defenderArmyId: string | null;
  defenderCityId: string | null;
  hex: HexCoord;
}

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

export interface WorldState {
  turn: number;
  currentPlayerIndex: number;
  playerOrder: string[]; // player ids in turn order
  phase: WorldPhase;
  grid: HexGrid;

  cities: Map<string, WorldCity>;
  armies: Map<string, WorldArmy>;
  players: Map<string, WorldPlayer>;
  camps: Map<string, WorldCamp>;
  neutralBuildings: Map<string, NeutralBuilding>;

  pendingBattles: PendingBattle[];
  winnerId: string | null;

  /** Hex position of the Sword in the Stone (null if not placed or already claimed). */
  swordHex: { q: number; r: number } | null;
  /** Whether the sword has been claimed by Arthur. */
  swordClaimed: boolean;

  /** Fake sword trap tiles — look like real swords but hide a dark savant + fire elemental. */
  fakeSwordHexes: { q: number; r: number }[];

  /** Auto-incrementing ID counter for cities/armies. */
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorldState(grid: HexGrid, playerOrder: string[]): WorldState {
  return {
    turn: 1,
    currentPlayerIndex: 0,
    playerOrder,
    phase: WorldPhase.PLAYER_TURN,
    grid,
    cities: new Map(),
    armies: new Map(),
    players: new Map(),
    camps: new Map(),
    neutralBuildings: new Map(),
    pendingBattles: [],
    winnerId: null,
    swordHex: null,
    swordClaimed: false,
    fakeSwordHexes: [],
    nextEntityId: 1,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the player whose turn it currently is. */
export function currentPlayer(state: WorldState): WorldPlayer {
  const id = state.playerOrder[state.currentPlayerIndex];
  return state.players.get(id)!;
}

/** Generate a unique entity ID. */
export function nextId(state: WorldState, prefix: string): string {
  const id = `${prefix}_${state.nextEntityId}`;
  state.nextEntityId++;
  return id;
}
