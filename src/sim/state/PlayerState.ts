// Per-player state: gold, owned buildings, base, direction
import type { Direction, PlayerId } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";

export interface PlayerState {
  id: PlayerId;
  gold: number; // Always a whole integer — spend/receive in whole gold only
  goldAccum: number; // Sub-integer accumulator for income ticks (not displayed)
  direction: Direction; // Which side of the battlefield this player controls
  ownedBaseId: string | null; // The player's main Base ID
  ownedBuildings: string[]; // Building IDs this player owns
}

/**
 * @param id        - Unique player identifier.
 * @param direction - Side the player controls (WEST or EAST).
 * @param startGold - Starting gold (defaults to BalanceConfig.START_GOLD).
 */
export function createPlayerState(
  id: PlayerId,
  direction: Direction,
  startGold: number = BalanceConfig.START_GOLD,
): PlayerState {
  return {
    id,
    gold: Math.floor(startGold),
    goldAccum: 0,
    direction,
    ownedBaseId: null,
    ownedBuildings: [],
  };
}
