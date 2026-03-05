// Fog of war system for world mode.
//
// Computes visibility for a player based on army and city positions.
// Armies reveal 3 hexes, cities reveal 4 hexes.
// "Explored" tiles persist; "visible" tiles are recalculated each update.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { hexSpiral, hexKey } from "@world/hex/HexCoord";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARMY_SIGHT = 2;
const CITY_SIGHT = 3;

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Recalculate visible tiles for a player, merging into explored. */
export function updateVisibility(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  player.visibleTiles.clear();

  // Armies grant sight
  for (const army of state.armies.values()) {
    if (army.owner !== playerId) continue;
    const hexes = hexSpiral(army.position, ARMY_SIGHT);
    for (const h of hexes) {
      if (!state.grid.hasTile(h.q, h.r)) continue;
      const key = hexKey(h.q, h.r);
      player.visibleTiles.add(key);
      player.exploredTiles.add(key);
    }
  }

  // Cities grant sight
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    const hexes = hexSpiral(city.position, CITY_SIGHT);
    for (const h of hexes) {
      if (!state.grid.hasTile(h.q, h.r)) continue;
      const key = hexKey(h.q, h.r);
      player.visibleTiles.add(key);
      player.exploredTiles.add(key);
    }
  }
}

/** Check if a hex is currently visible to a player. */
export function isVisible(player: WorldPlayer, q: number, r: number): boolean {
  return player.visibleTiles.has(hexKey(q, r));
}

/** Check if a hex has been explored (ever seen) by a player. */
export function isExplored(player: WorldPlayer, q: number, r: number): boolean {
  return player.exploredTiles.has(hexKey(q, r));
}
