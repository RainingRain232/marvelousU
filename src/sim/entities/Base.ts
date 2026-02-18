// Base data: direction, health, owner, linked castle building
import type { Direction, PlayerId, Vec2 } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface Base {
  id: string;
  direction: Direction;
  owner: PlayerId;
  health: number;
  maxHealth: number;
  position: Vec2; // Tile coord of the base top-left (3×3 footprint)
  spawnOffset: Vec2; // Tile offset from position where units appear
  castleId: string | null; // ID of the linked Castle building (set after building placement)
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateBaseOptions {
  id: string;
  direction: Direction;
  owner: PlayerId;
  position: Vec2;
  spawnOffset: Vec2;
  maxHealth?: number; // defaults to BalanceConfig.BASE_HEALTH
}

export function createBase(opts: CreateBaseOptions): Base {
  const maxHealth = opts.maxHealth ?? BalanceConfig.BASE_HEALTH;
  return {
    id: opts.id,
    direction: opts.direction,
    owner: opts.owner,
    health: maxHealth,
    maxHealth,
    position: { ...opts.position },
    spawnOffset: { ...opts.spawnOffset },
    castleId: null,
  };
}
