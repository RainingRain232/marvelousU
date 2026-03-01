// Background grid rendering — zone colors, walkability, grid lines
import { Graphics } from "pixi.js";
import type { BattlefieldState } from "@sim/state/BattlefieldState";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { MapType } from "@/types";

// ---------------------------------------------------------------------------
// Tile color palette (placeholder — real art replaces these later)
// ---------------------------------------------------------------------------

type TileColorSet = {
  west_walkable: number;
  west_unwalkable: number;
  neutral_walkable: number;
  neutral_unwalkable: number;
  east_walkable: number;
  east_unwalkable: number;
};

/** Fill colors per zone × walkability combination (0xRRGGBB). */
const TILE_COLORS_MEADOW: TileColorSet = {
  west_walkable: 0x2d4c2d, // muted green — west territory
  west_unwalkable: 0x1e331e, // dark muted green — impassable west
  neutral_walkable: 0x3a5a30, // vibrant green — contested zone
  neutral_unwalkable: 0x203518, // dark green — impassable neutral
  east_walkable: 0x5c4d2d, // brownish green — east territory
  east_unwalkable: 0x3d331e, // dark brownish green — impassable east
};

const TILE_COLORS_GRASS: TileColorSet = {
  west_walkable: 0x3a6b2a, // lush green — west territory
  west_unwalkable: 0x2a5020, // deep green — impassable west
  neutral_walkable: 0x4a8035, // bright verdant — contested zone
  neutral_unwalkable: 0x2d5a1e, // deep verdant — impassable neutral
  east_walkable: 0x3d7030, // rich green — east territory
  east_unwalkable: 0x2c5522, // dark rich green — impassable east
};

const TILE_COLORS_PLAINS: TileColorSet = {
  west_walkable: 0x8a7d48, // warm golden tan — west territory
  west_unwalkable: 0x6b5f38, // darker tan — impassable west
  neutral_walkable: 0x9c8e52, // sun-bleached gold — contested zone
  neutral_unwalkable: 0x746840, // dusty brown — impassable neutral
  east_walkable: 0x7d7040, // dry straw — east territory
  east_unwalkable: 0x5e5430, // deep straw — impassable east
};

const TILE_COLORS_FOREST: TileColorSet = {
  west_walkable: 0x1a3318, // deep shadowed moss
  west_unwalkable: 0x0f1f0e, // near-black undergrowth
  neutral_walkable: 0x1e3a1a, // dark emerald floor
  neutral_unwalkable: 0x122210, // pitch-dark thicket
  east_walkable: 0x1d3520, // twilight green
  east_unwalkable: 0x112015, // deep shadow
};

const TILE_COLORS_FANTASIA: TileColorSet = {
  west_walkable: 0x3a6a35, // enchanted forest green
  west_unwalkable: 0x2a4a28, // mystical woodland
  neutral_walkable: 0x4a7a45, // glowing emerald floor
  neutral_unwalkable: 0x2a4a28, // enchanted thicket
  east_walkable: 0x4a6a40, // magical twilight green
  east_unwalkable: 0x2a4a30, // ethereal shadow
};

const TILE_COLORS: Record<string, TileColorSet> = {
  [MapType.MEADOW]: TILE_COLORS_MEADOW,
  [MapType.GRASS]: TILE_COLORS_GRASS,
  [MapType.PLAINS]: TILE_COLORS_PLAINS,
  [MapType.FOREST]: TILE_COLORS_FOREST,
  [MapType.FANTASIA]: TILE_COLORS_FANTASIA,
};

const TILE_COLORS_DEFAULT = TILE_COLORS_MEADOW;

/** Tint applied over a tile occupied by a building (additive alpha blend). */
const BUILDING_TINT_COLOR = 0x000000; // darker footprint
const BUILDING_TINT_ALPHA = 0; // Set to 0 to keep background visible

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
  draw(battlefield: BattlefieldState, mapType: MapType = MapType.MEADOW): void {
    this._drawTiles(battlefield, mapType);
    this._drawBuildingTints(battlefield);
    this._drawLines(battlefield);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _drawTiles(bf: BattlefieldState, mapType: MapType): void {
    const g = this._tiles;
    const ts = BalanceConfig.TILE_SIZE;
    const palette = TILE_COLORS[mapType] ?? TILE_COLORS_DEFAULT;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        // Use "walkable" color even for buildings so the terrain looks consistent
        const isActuallyWalkable = tile.walkable || tile.buildingId !== null;
        const key =
          `${tile.zone}_${isActuallyWalkable ? "walkable" : "unwalkable"}` as keyof TileColorSet;
        const color = palette[key];
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
          g.rect(tile.x * ts, tile.y * ts, ts, ts).fill({
            color: BUILDING_TINT_COLOR,
            alpha: BUILDING_TINT_ALPHA,
          });
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
