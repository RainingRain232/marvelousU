// One-time initialisation: create bases and wire them to players.
//
// Call once at match start, before the SimLoop begins.
// BaseSetup is NOT a tick-based system — it has no update() function.

import { Direction } from "@/types";
import type { PlayerId, PlayerSlot } from "@/types";
import { createBase } from "@sim/entities/Base";
import type { GameState } from "@sim/state/GameState";
import { getPlayer } from "@sim/state/GameState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { spawnCastle } from "@sim/systems/CastleInit";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Config for a single player's base. */
export interface PlayerBaseConfig {
  playerId: PlayerId;
  slot: PlayerSlot;
  direction: Direction;
  position: { x: number; y: number };
  spawnOffset: { x: number; y: number };
}

/** Legacy 2-player options (backward-compatible). */
export interface BaseInitOptions {
  westPlayerId: PlayerId;
  eastPlayerId: PlayerId;
  westPosition?: { x: number; y: number };
  eastPosition?: { x: number; y: number };
  westSpawnOffset?: { x: number; y: number };
  eastSpawnOffset?: { x: number; y: number };
}

/**
 * Create bases for N players, register them on `state`, link to owning players,
 * and auto-spawn castles.
 */
export function initBasesMulti(state: GameState, configs: PlayerBaseConfig[]): void {
  for (const cfg of configs) {
    const baseId = `base-${cfg.slot}`;
    const base = createBase({
      id: baseId,
      direction: cfg.direction,
      owner: cfg.playerId,
      position: { ...cfg.position },
      spawnOffset: { ...cfg.spawnOffset },
    });

    state.bases.set(baseId, base);

    const player = getPlayer(state, cfg.playerId);
    player.ownedBaseId = baseId;

    spawnCastle(state, base);
  }
}

/**
 * Legacy 2-player init — delegates to initBasesMulti.
 */
export function initBases(state: GameState, opts: BaseInitOptions): void {
  initBasesMulti(state, [
    {
      playerId: opts.westPlayerId,
      slot: "nw",
      direction: Direction.WEST,
      position: opts.westPosition ?? { ...BalanceConfig.BASE_WEST_POSITION },
      spawnOffset: opts.westSpawnOffset ?? { ...BalanceConfig.BASE_WEST_SPAWN_OFFSET },
    },
    {
      playerId: opts.eastPlayerId,
      slot: "se",
      direction: Direction.EAST,
      position: opts.eastPosition ?? { ...BalanceConfig.BASE_EAST_POSITION },
      spawnOffset: opts.eastSpawnOffset ?? { ...BalanceConfig.BASE_EAST_SPAWN_OFFSET },
    },
  ]);
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
