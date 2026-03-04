// Grid, tile ownership, territory zones
import type { PlayerId } from "@/types";

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

export interface Tile {
  x: number;
  y: number;
  walkable: boolean;
  owner: PlayerId | null;
  buildingId: string | null;
  zone: TileZone;
}

/**
 * Territory zones.
 * 2-player: "west" | "east" | "neutral" (thirds split)
 * 3-4 player: "nw" | "ne" | "sw" | "se" | "neutral" (corner quadrants + cross-shaped neutral)
 */
export type TileZone = "west" | "east" | "nw" | "ne" | "sw" | "se" | "neutral";

// ---------------------------------------------------------------------------
// BattlefieldState
// ---------------------------------------------------------------------------

export interface BattlefieldState {
  grid: Tile[][];
  width: number;
  height: number;
}

/**
 * Create a battlefield grid, automatically assigning territory zones.
 * - 2 players: split into thirds (west | neutral | east).
 * - 3-4 players: corner quadrants with cross-shaped neutral zone.
 *
 * @param width       - Total tile columns.
 * @param height      - Total tile rows.
 * @param playerCount - Number of players (2, 3, or 4). Default 2.
 */
export function createBattlefieldState(
  width: number,
  height: number,
  playerCount: number = 2,
): BattlefieldState {
  const grid: Tile[][] = playerCount <= 2
    ? _buildGrid2P(width, height)
    : _buildGridMP(width, height, playerCount);

  return { grid, width, height };
}

/** 2-player: thirds split (west | neutral | east). */
function _buildGrid2P(width: number, height: number): Tile[][] {
  const westEnd = Math.floor(width / 3);
  const eastStart = Math.ceil((width * 2) / 3);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      walkable: true,
      owner: null,
      buildingId: null,
      zone: _zoneFor2P(x, westEnd, eastStart),
    })),
  );
}

function _zoneFor2P(x: number, westEnd: number, eastStart: number): TileZone {
  if (x < westEnd) return "west";
  if (x >= eastStart) return "east";
  return "neutral";
}

/** 3-4 player: corner quadrants with cross-shaped neutral zone. */
function _buildGridMP(width: number, height: number, playerCount: number): Tile[][] {
  const xThird = Math.floor(width / 3);
  const x2Third = Math.ceil((width * 2) / 3);
  const yThird = Math.floor(height / 3);
  const y2Third = Math.ceil((height * 2) / 3);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      walkable: true,
      owner: null,
      buildingId: null,
      zone: _zoneForMP(x, y, xThird, x2Third, yThird, y2Third, playerCount),
    })),
  );
}

function _zoneForMP(
  x: number, y: number,
  xThird: number, x2Third: number,
  yThird: number, y2Third: number,
  playerCount: number,
): TileZone {
  if (x < xThird && y < yThird) return "nw";
  if (x >= x2Third && y < yThird) return playerCount >= 3 ? "ne" : "neutral";
  if (x < xThird && y >= y2Third) return playerCount >= 4 ? "sw" : "neutral";
  if (x >= x2Third && y >= y2Third) return "se";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

/** Returns all tiles belonging to a given zone. */
export function getTilesInZone(
  state: BattlefieldState,
  zone: TileZone,
): Tile[] {
  const result: Tile[] = [];
  for (const row of state.grid)
    for (const tile of row) if (tile.zone === zone) result.push(tile);
  return result;
}

/** Returns the zone of a tile at (x, y), or null if out of bounds. */
export function getZoneAt(
  state: BattlefieldState,
  x: number,
  y: number,
): TileZone | null {
  const row = state.grid[y];
  if (!row) return null;
  return row[x]?.zone ?? null;
}
