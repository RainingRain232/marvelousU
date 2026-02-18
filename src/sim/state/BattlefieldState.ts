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
 * - "west"    — belongs to the west player's base territory
 * - "east"    — belongs to the east player's base territory
 * - "neutral" — contested middle ground
 */
export type TileZone = "west" | "east" | "neutral";

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
 * The grid is split into thirds: west | neutral | east.
 *
 * @param width  - Total tile columns.
 * @param height - Total tile rows.
 */
export function createBattlefieldState(
  width: number,
  height: number,
): BattlefieldState {
  const westEnd = Math.floor(width / 3);
  const eastStart = Math.ceil((width * 2) / 3);

  const grid: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      walkable: true,
      owner: null,
      buildingId: null,
      zone: zoneFor(x, westEnd, eastStart),
    })),
  );

  return { grid, width, height };
}

function zoneFor(x: number, westEnd: number, eastStart: number): TileZone {
  if (x < westEnd) return "west";
  if (x >= eastStart) return "east";
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
