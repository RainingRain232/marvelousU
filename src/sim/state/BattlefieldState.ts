// Grid, tile ownership, territory zones
import type { PlayerId, UnitType } from "@/types";
import { TerrainType } from "@/types";

// ---------------------------------------------------------------------------
// Map obstacle types (Battlefield mode)
// ---------------------------------------------------------------------------

export enum ObstacleType {
  NONE = "none",
  WALL = "wall", // Blocks movement entirely
  RIVER = "river", // Slows movement by 40%
}

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
  terrain: TerrainType;
  obstacle: ObstacleType; // Map obstacle at this tile (Battlefield mode)
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

// ---------------------------------------------------------------------------
// Battlefield draft state (Battlefield mode — DRAFT phase)
// ---------------------------------------------------------------------------

export interface BattlefieldDraftPick {
  unitType: UnitType;
  count: number;
}

export interface BattlefieldDraftState {
  /** Whether the draft phase is active. */
  active: boolean;
  /** Per-player remaining budget (gold). */
  budgets: Map<PlayerId, number>;
  /** Per-player selected unit picks. */
  picks: Map<PlayerId, BattlefieldDraftPick[]>;
  /** Timer countdown for the draft phase (seconds). */
  timer: number;
}

// ---------------------------------------------------------------------------
// Shrink boundary (Battlefield mode — arena shrinking)
// ---------------------------------------------------------------------------

export interface ShrinkBoundary {
  /** Number of tiles inset from each edge of the map. */
  inset: number;
  /** Time elapsed since battle started (seconds), used to determine shrink steps. */
  battleElapsed: number;
  /** Timestamp of the last shrink step (seconds of battleElapsed). */
  lastShrinkTime: number;
}

// ---------------------------------------------------------------------------
// BattlefieldState
// ---------------------------------------------------------------------------

export interface BattlefieldState {
  grid: Tile[][];
  width: number;
  height: number;
  /** Battlefield mode: draft state for the DRAFT phase. */
  draft: BattlefieldDraftState;
  /** Battlefield mode: shrinking arena boundary. */
  shrinkBoundary: ShrinkBoundary;
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

  return {
    grid,
    width,
    height,
    draft: {
      active: false,
      budgets: new Map(),
      picks: new Map(),
      timer: 0,
    },
    shrinkBoundary: {
      inset: 0,
      battleElapsed: 0,
      lastShrinkTime: 0,
    },
  };
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
      terrain: TerrainType.PLAINS,
      obstacle: ObstacleType.NONE,
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
      terrain: TerrainType.PLAINS,
      obstacle: ObstacleType.NONE,
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

// ---------------------------------------------------------------------------
// Obstacle helpers (Battlefield mode)
// ---------------------------------------------------------------------------

/**
 * Place a wall obstacle on a tile. Walls block movement (tile becomes non-walkable).
 */
export function placeWall(state: BattlefieldState, x: number, y: number): void {
  const row = state.grid[y];
  if (!row) return;
  const tile = row[x];
  if (!tile) return;
  tile.obstacle = ObstacleType.WALL;
  tile.walkable = false;
}

/**
 * Place a river obstacle on a tile. Rivers slow movement by 40% but remain walkable.
 */
export function placeRiver(state: BattlefieldState, x: number, y: number): void {
  const row = state.grid[y];
  if (!row) return;
  const tile = row[x];
  if (!tile) return;
  tile.obstacle = ObstacleType.RIVER;
  // River tiles remain walkable but impose a speed penalty (checked in MovementSystem)
}

/**
 * Remove an obstacle from a tile, restoring it to normal.
 */
export function removeObstacle(state: BattlefieldState, x: number, y: number): void {
  const row = state.grid[y];
  if (!row) return;
  const tile = row[x];
  if (!tile) return;
  if (tile.obstacle === ObstacleType.WALL) {
    tile.walkable = true;
  }
  tile.obstacle = ObstacleType.NONE;
}

/**
 * Check if a tile position is within the current shrink boundary.
 * Returns true if the tile is inside the safe zone, false if outside.
 */
export function isInsideShrinkBoundary(state: BattlefieldState, x: number, y: number): boolean {
  const inset = state.shrinkBoundary.inset;
  if (inset <= 0) return true; // No shrinking yet
  return x >= inset && x < state.width - inset && y >= inset && y < state.height - inset;
}

/**
 * Place a predefined set of walls and rivers on the battlefield for Battlefield mode.
 * Creates a symmetrical layout with walls in the center and rivers along natural lines.
 */
export function placeBattlefieldObstacles(state: BattlefieldState): void {
  const midX = Math.floor(state.width / 2);
  const midY = Math.floor(state.height / 2);

  // Place a few wall clusters in the centre (symmetrical)
  const wallOffsets = [
    { x: 0, y: -3 }, { x: 0, y: -2 }, { x: 0, y: -1 },
    { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
  ];
  for (const off of wallOffsets) {
    placeWall(state, midX + off.x, midY + off.y);
  }

  // Place rivers running horizontally across the map at 1/3 and 2/3 height
  const riverY1 = Math.floor(state.height / 3);
  const riverY2 = Math.ceil((state.height * 2) / 3);
  const riverStartX = Math.floor(state.width * 0.25);
  const riverEndX = Math.ceil(state.width * 0.75);
  for (let x = riverStartX; x <= riverEndX; x++) {
    // Skip the very centre column (walls are there)
    if (x === midX) continue;
    placeRiver(state, x, riverY1);
    placeRiver(state, x, riverY2);
  }
}
