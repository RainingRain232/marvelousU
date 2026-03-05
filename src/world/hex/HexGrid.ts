// Hex grid data structure for the world map.
//
// Stores tiles in a Map keyed by "q,r" strings for O(1) lookup.
// Supports hexagonal maps of arbitrary radius.

import type { HexCoord } from "@world/hex/HexCoord";
import { hexKey, hexNeighbors, hexSpiral } from "@world/hex/HexCoord";
import type { TerrainType } from "@world/config/TerrainDefs";
import type { ResourceType, ImprovementType } from "@world/config/ResourceDefs";

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

export interface HexTile {
  q: number;
  r: number;
  terrain: TerrainType;
  /** Which player controls this hex (null = unclaimed). */
  owner: string | null;
  /** City occupying this hex (null = none). */
  cityId: string | null;
  /** Army standing on this hex (null = none). */
  armyId: string | null;
  /** Neutral camp on this hex (null = none). */
  campId: string | null;
  /** Natural resource on this hex (null = none). */
  resource: ResourceType | null;
  /** Player-built improvement on this hex (null = none). */
  improvement: ImprovementType | null;
  /** Neutral building on this hex (null = none). */
  neutralBuildingId: string | null;
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export class HexGrid {
  private _tiles = new Map<string, HexTile>();
  /** Map radius in hexes from center (0,0). Total hex count ≈ 3r²+3r+1. */
  readonly radius: number;

  constructor(radius: number) {
    this.radius = radius;
  }

  // -----------------------------------------------------------------------
  // Basic access
  // -----------------------------------------------------------------------

  /** Get the tile at (q, r), or null if out of bounds. */
  getTile(q: number, r: number): HexTile | null {
    return this._tiles.get(hexKey(q, r)) ?? null;
  }

  /** Get the tile for a HexCoord, or null if out of bounds. */
  getTileAt(hex: HexCoord): HexTile | null {
    return this._tiles.get(hexKey(hex.q, hex.r)) ?? null;
  }

  /** Set (or overwrite) a tile. */
  setTile(tile: HexTile): void {
    this._tiles.set(hexKey(tile.q, tile.r), tile);
  }

  /** Check if the grid contains a tile at (q, r). */
  hasTile(q: number, r: number): boolean {
    return this._tiles.has(hexKey(q, r));
  }

  /** Total number of tiles. */
  get size(): number {
    return this._tiles.size;
  }

  // -----------------------------------------------------------------------
  // Iteration
  // -----------------------------------------------------------------------

  /** Iterate over all tiles. */
  allTiles(): IterableIterator<HexTile> {
    return this._tiles.values();
  }

  /** Get all tiles as an array. */
  allTilesArray(): HexTile[] {
    return [...this._tiles.values()];
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get existing neighbor tiles (filters out off-grid hexes). */
  getNeighbors(q: number, r: number): HexTile[] {
    const coords = hexNeighbors({ q, r });
    const result: HexTile[] = [];
    for (const c of coords) {
      const t = this._tiles.get(hexKey(c.q, c.r));
      if (t) result.push(t);
    }
    return result;
  }

  /** Get all tiles within `range` steps of (q, r), including center. */
  getTilesInRange(center: HexCoord, range: number): HexTile[] {
    const coords = hexSpiral(center, range);
    const result: HexTile[] = [];
    for (const c of coords) {
      const t = this._tiles.get(hexKey(c.q, c.r));
      if (t) result.push(t);
    }
    return result;
  }

  /** Get all tiles owned by a specific player. */
  getTilesOwnedBy(playerId: string): HexTile[] {
    const result: HexTile[] = [];
    for (const t of this._tiles.values()) {
      if (t.owner === playerId) result.push(t);
    }
    return result;
  }

  /** Find the tile containing a given city. */
  findCityTile(cityId: string): HexTile | null {
    for (const t of this._tiles.values()) {
      if (t.cityId === cityId) return t;
    }
    return null;
  }

  /** Find the tile containing a given army. */
  findArmyTile(armyId: string): HexTile | null {
    for (const t of this._tiles.values()) {
      if (t.armyId === armyId) return t;
    }
    return null;
  }
}
