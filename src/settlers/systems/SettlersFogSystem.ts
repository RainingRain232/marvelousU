// ---------------------------------------------------------------------------
// Settlers – Fog of war system
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { BUILDING_DEFS } from "../config/SettlersBuildingDefs";
import { Visibility, inBounds, tileIdx } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";

/** Sight range per military building type */
const SIGHT_RANGES: Partial<Record<SettlersBuildingType, number>> = {
  [SettlersBuildingType.HEADQUARTERS]: SB.HQ_SIGHT_RANGE,
  [SettlersBuildingType.GUARD_HOUSE]: SB.GUARD_HOUSE_SIGHT_RANGE,
  [SettlersBuildingType.WATCHTOWER]: SB.WATCHTOWER_SIGHT_RANGE,
  [SettlersBuildingType.FORTRESS]: SB.FORTRESS_SIGHT_RANGE,
};

/**
 * Recalculate visibility for all players.
 *
 * Strategy:
 *  1. Downgrade every VISIBLE tile to EXPLORED (keep previously seen terrain).
 *  2. For each completed military/HQ building, mark tiles within sight range as VISIBLE.
 *  3. Additionally, all tiles inside owned territory are VISIBLE.
 */
export function recalculateFog(state: SettlersState): void {
  const map = state.map;
  const totalTiles = map.width * map.height;

  for (let pi = 0; pi < map.visibility.length; pi++) {
    const vis = map.visibility[pi];
    const playerId = pi === 0 ? "p0" : "p1";

    // Step 1: demote VISIBLE -> EXPLORED (keeps terrain revealed)
    for (let i = 0; i < totalTiles; i++) {
      if (vis[i] === Visibility.VISIBLE) {
        vis[i] = Visibility.EXPLORED;
      }
    }

    // Step 2: territory tiles -> VISIBLE
    for (let i = 0; i < totalTiles; i++) {
      if (map.territory[i] === pi) {
        vis[i] = Visibility.VISIBLE;
      }
    }

    // Step 3: buildings with sight ranges
    for (const [, building] of state.buildings) {
      if (building.owner !== playerId) continue;
      if (building.constructionProgress < 1) continue;

      const range = SIGHT_RANGES[building.type];
      if (range === undefined) continue;

      const def = BUILDING_DEFS[building.type];
      const cx = building.tileX + Math.floor(def.footprint.w / 2);
      const cz = building.tileZ + Math.floor(def.footprint.h / 2);
      const r2 = range * range;

      for (let dz = -range; dz <= range; dz++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx * dx + dz * dz > r2) continue;
          const tx = cx + dx;
          const tz = cz + dz;
          if (!inBounds(map, tx, tz)) continue;
          vis[tileIdx(map, tx, tz)] = Visibility.VISIBLE;
        }
      }
    }
  }
}

/**
 * Event-driven fog update: only recalculates when the dirty flag is set.
 * The dirty flag should be set whenever territory changes (same trigger as territoryDirty).
 */
export function updateFog(state: SettlersState): void {
  if (!state.fogDirty) return;
  state.fogDirty = false;
  recalculateFog(state);
}

/**
 * Check if a world position is visible to a given player.
 * Used by the renderer to hide enemy units in fog.
 */
export function isWorldPosVisible(
  state: SettlersState,
  worldX: number,
  worldZ: number,
  playerIndex: number,
): boolean {
  const map = state.map;
  const tx = Math.floor(worldX / map.tileSize);
  const tz = Math.floor(worldZ / map.tileSize);
  if (!inBounds(map, tx, tz)) return false;
  return map.visibility[playerIndex][tileIdx(map, tx, tz)] === Visibility.VISIBLE;
}
