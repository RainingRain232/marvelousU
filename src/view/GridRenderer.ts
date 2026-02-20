// Background grid rendering — zone colors, walkability, grid lines
import { Graphics } from "pixi.js";
import type { BattlefieldState } from "@sim/state/BattlefieldState";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Tile color palette (placeholder — real art replaces these later)
// ---------------------------------------------------------------------------

/** Fill colors per zone × walkability combination (0xRRGGBB). */
const TILE_COLORS = {
  west_walkable: 0x2d4c2d, // muted green — west territory
  west_unwalkable: 0x1e331e, // dark muted green — impassable west
  neutral_walkable: 0x3a5a30, // vibrant green — contested zone
  neutral_unwalkable: 0x203518, // dark green — impassable neutral
  east_walkable: 0x5c4d2d, // brownish green — east territory
  east_unwalkable: 0x3d331e, // dark brownish green — impassable east
} as const;

/** Tint applied over a tile occupied by a building (additive alpha blend). */
const BUILDING_TINT_COLOR = 0x000000; // darker footprint
const BUILDING_TINT_ALPHA = 0.15;

// ---------------------------------------------------------------------------
// GridRenderer
// ---------------------------------------------------------------------------

/**
 * Renders the tile grid as two stacked Graphics objects in the "background"
 * layer:
 *   1. `_tiles`  — solid colored rectangles per tile (zone + walkability)
 *   2. `_lines`  — hairline grid overlay
 *
 * The grid is static — call `draw(battlefield)` once at startup and again
 * whenever the battlefield state changes (e.g., a building is placed).
 */
export class GridRenderer {
  private _tiles = new Graphics();
  private _lines = new Graphics();
  private _tints = new Graphics(); // building footprint highlights

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Add the grid graphics to the ViewManager background layer. */
  init(vm: ViewManager): void {
    vm.addToLayer("background", this._tiles);
    vm.addToLayer("background", this._tints);
    vm.addToLayer("background", this._lines);
  }

  /** Remove from the scene and free GPU resources. */
  destroy(): void {
    this._tiles.destroy();
    this._tints.destroy();
    this._lines.destroy();
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  /**
   * (Re-)draw the entire grid from the given battlefield state.
   * Safe to call every time buildings change.
   */
  draw(battlefield: BattlefieldState): void {
    this._drawTiles(battlefield);
    this._drawBuildingTints(battlefield);
    this._drawLines(battlefield);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _drawTiles(bf: BattlefieldState): void {
    const g = this._tiles;
    const ts = BalanceConfig.TILE_SIZE;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        const key = `${tile.zone}_${tile.walkable ? "walkable" : "unwalkable"}` as keyof typeof TILE_COLORS;
        const color = TILE_COLORS[key];
        g.rect(tile.x * ts, tile.y * ts, ts, ts).fill({ color });
      }
    }
  }

  private _drawBuildingTints(bf: BattlefieldState): void {
    const g = this._tints;
    const ts = BalanceConfig.TILE_SIZE;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        if (tile.buildingId !== null) {
          g.rect(tile.x * ts, tile.y * ts, ts, ts)
            .fill({ color: BUILDING_TINT_COLOR, alpha: BUILDING_TINT_ALPHA });
        }
      }
    }
  }

  private _drawLines(_bf: BattlefieldState): void {
    this._lines.clear();
  }
}

/** Singleton — one GridRenderer per application. */
export const gridRenderer = new GridRenderer();
