// ---------------------------------------------------------------------------
// Settlers – Territory system (compute territory from military buildings)
// ---------------------------------------------------------------------------

import { BUILDING_DEFS } from "../config/SettlersBuildingDefs";
import { tileIdx, inBounds } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";

/** Recalculate territory for all players */
export function recalculateTerritory(state: SettlersState): void {
  const map = state.map;
  // Reset all territory
  map.territory.fill(-1);

  // For each building with territory radius, flood-fill
  for (const [, building] of state.buildings) {
    const def = BUILDING_DEFS[building.type];
    if (def.territoryRadius <= 0) continue;
    if (building.constructionProgress < 1) continue;

    const player = state.players.get(building.owner);
    if (!player) continue;
    const playerIdx = building.owner === "p0" ? 0 : 1;

    const cx = building.tileX + Math.floor(def.footprint.w / 2);
    const cz = building.tileZ + Math.floor(def.footprint.h / 2);
    const r = def.territoryRadius;
    const r2 = r * r;

    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r2) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        if (!inBounds(map, tx, tz)) continue;
        const idx = tileIdx(map, tx, tz);
        // Don't overwrite if already owned by same player (union)
        // Overwrite neutral or enemy territory
        map.territory[idx] = playerIdx;
      }
    }
  }
}

/** Check if a military building change requires territory recalc */
let _lastTerritoryTick = -1;

export function updateTerritory(state: SettlersState): void {
  // Recalculate every 60 ticks (~1 second) or on first tick
  if (state.tick - _lastTerritoryTick < 60 && _lastTerritoryTick >= 0) return;
  _lastTerritoryTick = state.tick;
  recalculateTerritory(state);
}
