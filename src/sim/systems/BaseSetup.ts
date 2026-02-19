// One-time initialisation: create WEST and EAST bases and wire them to players.
//
// Call once at match start, before the SimLoop begins.
// BaseSetup is NOT a tick-based system — it has no update() function.

import { Direction } from "@/types";
import type { PlayerId } from "@/types";
import { createBase } from "@sim/entities/Base";
import type { GameState } from "@sim/state/GameState";
import { getPlayer } from "@sim/state/GameState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { spawnCastle } from "@sim/systems/CastleInit";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BaseInitOptions {
  westPlayerId: PlayerId;
  eastPlayerId: PlayerId;
  /** Override west base tile position. Defaults to BalanceConfig value. */
  westPosition?: { x: number; y: number };
  /** Override east base tile position. Defaults to BalanceConfig value. */
  eastPosition?: { x: number; y: number };
  /** Override west spawn offset. Defaults to BalanceConfig value. */
  westSpawnOffset?: { x: number; y: number };
  /** Override east spawn offset. Defaults to BalanceConfig value. */
  eastSpawnOffset?: { x: number; y: number };
}

/**
 * Create WEST and EAST bases, register them on `state`, and link each base
 * to its owning player (sets `player.ownedBaseId`).
 *
 * Positions default to BalanceConfig values but can be overridden via opts
 * (e.g. when the map size differs from the standard 30×20 grid).
 */
export function initBases(state: GameState, opts: BaseInitOptions): void {
  const westBase = createBase({
    id: "base-west",
    direction: Direction.WEST,
    owner: opts.westPlayerId,
    position: opts.westPosition ?? { ...BalanceConfig.BASE_WEST_POSITION },
    spawnOffset: opts.westSpawnOffset ?? { ...BalanceConfig.BASE_WEST_SPAWN_OFFSET },
  });

  const eastBase = createBase({
    id: "base-east",
    direction: Direction.EAST,
    owner: opts.eastPlayerId,
    position: opts.eastPosition ?? { ...BalanceConfig.BASE_EAST_POSITION },
    spawnOffset: opts.eastSpawnOffset ?? { ...BalanceConfig.BASE_EAST_SPAWN_OFFSET },
  });

  // Register on state
  state.bases.set(westBase.id, westBase);
  state.bases.set(eastBase.id, eastBase);

  // Link to players
  const westPlayer = getPlayer(state, opts.westPlayerId);
  const eastPlayer = getPlayer(state, opts.eastPlayerId);
  westPlayer.ownedBaseId = westBase.id;
  eastPlayer.ownedBaseId = eastBase.id;

  // Auto-spawn castles at each base
  spawnCastle(state, westBase);
  spawnCastle(state, eastBase);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the spawn position (tile coords) for a base: position + spawnOffset. */
export function getBaseSpawnPosition(
  state: GameState,
  baseId: string,
): { x: number; y: number } {
  const base = state.bases.get(baseId);
  if (!base) throw new Error(`Base not found: ${baseId}`);
  return {
    x: base.position.x + base.spawnOffset.x,
    y: base.position.y + base.spawnOffset.y,
  };
}

/** Return the base owned by a player, or null if none yet assigned. */
export function getPlayerBase(state: GameState, playerId: PlayerId) {
  const player = getPlayer(state, playerId);
  if (!player.ownedBaseId) return null;
  return state.bases.get(player.ownedBaseId) ?? null;
}
