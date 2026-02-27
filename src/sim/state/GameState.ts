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
import type { PlayerState } from "@sim/state/PlayerState";
import { createBattlefieldState } from "@sim/state/BattlefieldState";
import type { BattlefieldState } from "@sim/state/BattlefieldState";
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

  // Rally flags — per-player flag position set via the Flag upgrade ability
  rallyFlags: Map<PlayerId, Vec2>;

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
): GameState {
  return {
    phase: GamePhase.PREP,
    gameMode,
    tick: 0,
    rngSeed,
    phaseTimer: BalanceConfig.PREP_DURATION,
    eventTimer: BalanceConfig.RANDOM_EVENT_INTERVAL,
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
    rallyFlags: new Map(),
    battlefield: createBattlefieldState(width, height),
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
