// Central simulation state — single source of truth
import { GamePhase, GameMode } from "@/types";
import type { PlayerId, Vec2 } from "@/types";
import type { LeaderId } from "@sim/config/LeaderDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import type { ArmoryItemId } from "@sim/config/ArmoryItemDefs";
import type { Base } from "@sim/entities/Base";
import type { Building } from "@sim/entities/Building";
import type { Unit } from "@sim/entities/Unit";
import type { Projectile } from "@sim/entities/Projectile";
import type { Ability } from "@sim/abilities/Ability";
import type { ResourceNode } from "@sim/entities/ResourceNode";
import type { SelectionState } from "@sim/state/SelectionState";
import type { PlayerState } from "@sim/state/PlayerState";
import { createBattlefieldState } from "@sim/state/BattlefieldState";
import type { BattlefieldState } from "@sim/state/BattlefieldState";
import type { TileZone } from "@sim/state/BattlefieldState";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// GameState interface
// ---------------------------------------------------------------------------

export interface GameState {
  // Game flow
  phase: GamePhase;
  gameMode: GameMode; // Active game mode for this session
  tick: number; // Incremented each simulation tick
  rngSeed: number; // Seed passed to SeededRandom for determinism
  phaseTimer: number; // Countdown (seconds) until current phase ends; -1 = no timer
  eventTimer: number; // Countdown (seconds) until the next random event fires during BATTLE
  winnerId: string | null; // PlayerId of the winner set during RESOLVE, null otherwise
  /** For ROGUELIKE: building type IDs that are disabled this round (50% random subset). */
  roguelikeDisabledBuildings: string[];
  /** The leader chosen by P1 for this session. null = no leader. */
  p1LeaderId: LeaderId | null;
  /** The race chosen by P1 for this session. null = no race (uses generic units). */
  p1RaceId: RaceId | null;
  /** For CAMPAIGN mode: which scenario number is being played. null = not a campaign game. */
  campaignScenario: number | null;
  /** Armory items equipped by P1 for this session (hero stat bonuses). */
  p1ArmoryItems: ArmoryItemId[];

  // Entity maps — keyed by ID
  bases: Map<string, Base>;
  buildings: Map<string, Building>;
  units: Map<string, Unit>;
  projectiles: Map<string, Projectile>;
  abilities: Map<string, Ability>; // Active ability instances (per-unit)

  // Players
  players: Map<PlayerId, PlayerState>;
  playerCount: number; // Number of active players (2, 3, or 4)

  // Alliances — set of sorted "pA:pB" pairs (bidirectional)
  alliances: Set<string>;

  // AI priority targets — AI player → preferred enemy to march toward
  priorityTargets: Map<PlayerId, PlayerId>;

  // Rally flags — per-player flag position set via the Flag upgrade ability
  rallyFlags: Map<PlayerId, Vec2>;

  // RTS resources
  resourceNodes: Map<string, ResourceNode>;

  // RTS selection (per-player, keyed by PlayerId)
  selection: Map<PlayerId, SelectionState>;

  // World
  battlefield: BattlefieldState;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh GameState ready for initialisation.
 *
 * @param width   - Grid width in tiles  (default: BalanceConfig.GRID_WIDTH).
 * @param height  - Grid height in tiles (default: BalanceConfig.GRID_HEIGHT).
 * @param rngSeed - Seed for deterministic RNG (default: 0).
 */
export function createGameState(
  width: number = BalanceConfig.GRID_WIDTH,
  height: number = BalanceConfig.GRID_HEIGHT,
  rngSeed: number = 0,
  gameMode: GameMode = GameMode.STANDARD,
  playerCount: number = 2,
): GameState {
  const isRTS = gameMode === GameMode.RTS;
  return {
    phase: isRTS ? GamePhase.RTS_ACTIVE : GamePhase.PREP,
    gameMode,
    tick: 0,
    rngSeed,
    phaseTimer: isRTS ? -1 : BalanceConfig.PREP_DURATION,
    eventTimer: isRTS ? Infinity : BalanceConfig.RANDOM_EVENT_INTERVAL,
    winnerId: null,
    roguelikeDisabledBuildings: [],
    p1LeaderId: null,
    p1RaceId: null,
    campaignScenario: null,
    p1ArmoryItems: [],
    bases: new Map(),
    buildings: new Map(),
    units: new Map(),
    projectiles: new Map(),
    abilities: new Map(),
    players: new Map(),
    playerCount,
    alliances: new Set(),
    priorityTargets: new Map(),
    rallyFlags: new Map(),
    resourceNodes: new Map(),
    selection: new Map(),
    battlefield: createBattlefieldState(width, height, playerCount),
  };
}

// ---------------------------------------------------------------------------
// Typed accessors — throw on missing ID for fast failure in debug
// ---------------------------------------------------------------------------

export function getUnit(state: GameState, id: string): Unit {
  const u = state.units.get(id);
  if (!u) throw new Error(`Unit not found: ${id}`);
  return u;
}

export function getBuilding(state: GameState, id: string): Building {
  const b = state.buildings.get(id);
  if (!b) throw new Error(`Building not found: ${id}`);
  return b;
}

export function getBase(state: GameState, id: string): Base {
  const b = state.bases.get(id);
  if (!b) throw new Error(`Base not found: ${id}`);
  return b;
}

export function getPlayer(state: GameState, id: PlayerId): PlayerState {
  const p = state.players.get(id);
  if (!p) throw new Error(`Player not found: ${id}`);
  return p;
}

// ---------------------------------------------------------------------------
// Alliance helpers
// ---------------------------------------------------------------------------

function allianceKey(a: PlayerId, b: PlayerId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Returns true if players a and b are enemies (not allied and not the same). */
export function isEnemy(state: GameState, a: PlayerId, b: PlayerId): boolean {
  if (a === b) return false;
  return !state.alliances.has(allianceKey(a, b));
}

/** Returns true if players a and b are allied (or the same player). */
export function isAlly(state: GameState, a: PlayerId, b: PlayerId): boolean {
  if (a === b) return true;
  return state.alliances.has(allianceKey(a, b));
}

/** Set two players as allied. */
export function setAlliance(state: GameState, a: PlayerId, b: PlayerId): void {
  if (a !== b) state.alliances.add(allianceKey(a, b));
}

/** Remove an alliance between two players. */
export function removeAlliance(state: GameState, a: PlayerId, b: PlayerId): void {
  state.alliances.delete(allianceKey(a, b));
}

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

/** Returns the tile zone owned by a given player (based on slot and player count). */
export function getPlayerZone(state: GameState, playerId: PlayerId): TileZone {
  const player = state.players.get(playerId);
  if (!player) return "neutral";
  if (state.playerCount <= 2) {
    // 2-player: direction maps directly to zone ("west" | "east")
    return player.direction as unknown as TileZone;
  }
  // 3-4 player: slot maps to zone ("nw" | "ne" | "sw" | "se")
  return player.slot as TileZone;
}
