// Fog of war system for world mode.
//
// Computes visibility for a player based on army and city positions.
// Armies reveal 2 hexes (scouts reveal 5), cities reveal 3 hexes.
// "Explored" tiles persist; "visible" tiles are recalculated each update.
//
// Enhancements:
// - Mountains and forests block line of sight (can't see behind them)
// - Scout units have extended vision range (radius 5)
// - Visibility decay: previously-seen hexes show stale info (last-known state)
// - Eagle Eye spell counters sight blocking

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { hexSpiral, hexKey, hexDistance, hexLinedraw } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import { TerrainType } from "@world/config/TerrainDefs";
import type { HexTile } from "@world/hex/HexGrid";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARMY_SIGHT = 2;
const SCOUT_SIGHT = 5;
const CITY_SIGHT = 3;

/** Unit types considered scouts (extended vision). */
const SCOUT_UNIT_TYPES = new Set(["scout", "ranger", "mounted_scout", "outrider"]);

// ---------------------------------------------------------------------------
// Stale tile data — stores last-known state for explored-but-not-visible hexes
// ---------------------------------------------------------------------------

/** Per-player map of hex key → last known tile snapshot. */
const _staleTileData = new Map<string, Map<string, StaleTileInfo>>();

export interface StaleTileInfo {
  terrain: TerrainType;
  owner: string | null;
  cityId: string | null;
  armyId: string | null;
  campId: string | null;
  resource: string | null;
  /** Turn when this info was last updated. */
  lastSeenTurn: number;
}

/** Get stale (last-known) tile info for a player at a given hex. */
export function getStaleTileInfo(playerId: string, q: number, r: number): StaleTileInfo | null {
  const playerMap = _staleTileData.get(playerId);
  if (!playerMap) return null;
  return playerMap.get(hexKey(q, r)) ?? null;
}

/** Clear all stale data (for game reset). */
export function clearStaleTileData(): void {
  _staleTileData.clear();
}

// ---------------------------------------------------------------------------
// Line of sight checking
// ---------------------------------------------------------------------------

/**
 * Check if a hex blocks line of sight (mountains and forests).
 * Mountains always block. Forests block unless the viewer is on a hill or mountain.
 */
function doesTileBlockSight(tile: HexTile, viewerTerrain: TerrainType): boolean {
  if (tile.terrain === TerrainType.MOUNTAINS) return true;
  if (tile.terrain === TerrainType.FOREST) {
    // Forests block sight unless the viewer is on elevated terrain
    if (viewerTerrain !== TerrainType.HILLS && viewerTerrain !== TerrainType.MOUNTAINS) {
      return true;
    }
  }
  return false;
}

/**
 * Check if there is a clear line of sight from origin to target.
 * Returns true if the target hex is visible (no blocking terrain in between).
 * The origin and target hexes themselves don't block — only intermediate hexes.
 */
function hasLineOfSight(
  state: WorldState,
  origin: HexCoord,
  target: HexCoord,
  ignoreBlocking: boolean,
): boolean {
  if (ignoreBlocking) return true;

  const dist = hexDistance(origin, target);
  if (dist <= 1) return true; // Adjacent hexes always visible

  const line = hexLinedraw(origin, target);
  const originTile = state.grid.getTile(origin.q, origin.r);
  const viewerTerrain = originTile?.terrain ?? TerrainType.PLAINS;

  // Check intermediate hexes (skip first = origin and last = target)
  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i];
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) continue;
    if (doesTileBlockSight(tile, viewerTerrain)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Check if an army contains scout units (for extended vision).
 */
function armyHasScout(state: WorldState, armyId: string): boolean {
  const army = state.armies.get(armyId);
  if (!army) return false;
  return army.units.some((u) => SCOUT_UNIT_TYPES.has(u.unitType));
}

/** Recalculate visible tiles for a player, merging into explored. */
export function updateVisibility(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  // Check if Eagle Eye is active (counters sight blocking)
  const eagleEyeActive = player.activeSpells.has("eagle_eye");

  // Store current visible tiles before clearing (for stale data update)
  const previouslyVisible = new Set(player.visibleTiles);
  player.visibleTiles.clear();

  // Ensure stale data map exists for this player
  if (!_staleTileData.has(playerId)) {
    _staleTileData.set(playerId, new Map());
  }
  const staleMap = _staleTileData.get(playerId)!;

  // Armies grant sight
  for (const army of state.armies.values()) {
    if (army.owner !== playerId) continue;
    const isScout = armyHasScout(state, army.id);
    const sightRange = isScout ? SCOUT_SIGHT : ARMY_SIGHT;
    const hexes = hexSpiral(army.position, sightRange);
    for (const h of hexes) {
      if (!state.grid.hasTile(h.q, h.r)) continue;
      // Check line of sight (Eagle Eye bypasses blocking)
      if (!hasLineOfSight(state, army.position, h, eagleEyeActive)) continue;
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
      // Check line of sight (Eagle Eye bypasses blocking)
      if (!hasLineOfSight(state, city.position, h, eagleEyeActive)) continue;
      const key = hexKey(h.q, h.r);
      player.visibleTiles.add(key);
      player.exploredTiles.add(key);
    }
  }

  // Update stale tile data for all currently visible tiles
  for (const key of player.visibleTiles) {
    const [q, r] = key.split(",").map(Number);
    const tile = state.grid.getTile(q, r);
    if (tile) {
      staleMap.set(key, {
        terrain: tile.terrain,
        owner: tile.owner,
        cityId: tile.cityId,
        armyId: tile.armyId,
        campId: tile.campId,
        resource: tile.resource,
        lastSeenTurn: state.turn,
      });
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

/**
 * Check if a hex has stale (outdated) info — explored but not currently visible.
 * UI can use this to dim the tile and show last-known state.
 */
export function isStale(player: WorldPlayer, q: number, r: number): boolean {
  const key = hexKey(q, r);
  return player.exploredTiles.has(key) && !player.visibleTiles.has(key);
}
