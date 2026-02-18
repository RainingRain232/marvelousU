// Per-player state: gold, owned buildings, faction, direction
import type { Direction, PlayerId } from "@/types";

export interface PlayerState {
  id:              PlayerId;
  gold:            number;
  direction:       Direction;
  ownedBuildings:  string[];  // Building IDs
}

export function createPlayerState(id: PlayerId, direction: Direction, startGold = 100): PlayerState {
  return { id, gold: startGold, direction, ownedBuildings: [] };
}
