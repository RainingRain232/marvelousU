// Renders the hex world map using PixiJS.
//
// Draws terrain-colored hexagons into the ViewManager's background layer.
// Handles hover highlighting and click-to-select.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { HexGrid, type HexTile } from "@world/hex/HexGrid";
import {
  hexToPixel,
  pixelToHex,
  hexCorners,
  hexKey,
  type HexCoord,
  type HexPixel,
} from "@world/hex/HexCoord";
import { TERRAIN_DEFINITIONS, TerrainType } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = WorldBalance.HEX_SIZE;
const HOVER_COLOR = 0xffffff;
const HOVER_ALPHA = 0.2;

// Player colors for territory overlay
const PLAYER_COLORS: number[] = [
  0x4466cc, // p1 blue
  0xcc4444, // p2 red
  0x44aa44, // p3 green
  0xccaa22, // p4 yellow
];

// ---------------------------------------------------------------------------
// WorldMapRenderer
// ---------------------------------------------------------------------------

export class WorldMapRenderer {
  private _vm!: ViewManager;
  private _container = new Container();
  private _hexContainer = new Container();
  private _highlightContainer = new Container();
  private _labelContainer = new Container();
  private _hoverGraphics = new Graphics();

  private _grid: HexGrid | null = null;
  private _hexGraphics = new Map<string, Graphics>();

  /** Currently hovered hex (null = none). */
  private _hoveredHex: HexCoord | null = null;

  /** Callback when a hex is clicked. */
  onHexClick: ((hex: HexCoord) => void) | null = null;

  /** Callback when a hex is hovered. */
  onHexHover: ((hex: HexCoord | null) => void) | null = null;

  /** If set, called before processing a hex click. Return true to block. */
  shouldBlockClick: ((screenX: number, screenY: number) => boolean) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._container.addChild(this._hexContainer);
    this._container.addChild(this._highlightContainer);
    this._container.addChild(this._labelContainer);
    this._container.addChild(this._hoverGraphics);

    vm.layers.background.addChild(this._container);

    // Input handling on the canvas
    const canvas = vm.app.canvas as HTMLCanvasElement;
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerdown", this._onPointerDown);
  }

  destroy(): void {
    const canvas = this._vm?.app?.canvas as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.removeEventListener("pointermove", this._onPointerMove);
      canvas.removeEventListener("pointerdown", this._onPointerDown);
    }

    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._hexGraphics.clear();
    this._grid = null;
  }

  // -----------------------------------------------------------------------
  // Drawing
  // -----------------------------------------------------------------------

  /** Render the entire hex grid. Call once after map generation. */
  drawMap(grid: HexGrid): void {
    this._grid = grid;
    this._hexContainer.removeChildren();
    this._hexGraphics.clear();

    for (const tile of grid.allTiles()) {
      const g = this._drawHexTile(tile);
      this._hexContainer.addChild(g);
      this._hexGraphics.set(hexKey(tile.q, tile.r), g);
    }
  }

  /** Redraw a single tile (e.g., after ownership change). */
  updateTile(tile: HexTile): void {
    const key = hexKey(tile.q, tile.r);
    const existing = this._hexGraphics.get(key);
    if (existing) {
      existing.removeFromParent();
      existing.destroy();
    }

    const g = this._drawHexTile(tile);
    this._hexContainer.addChild(g);
    this._hexGraphics.set(key, g);
  }

  /** Highlight specific hexes (e.g., movement range). */
  highlightHexes(hexes: HexCoord[], color: number, alpha = 0.3): void {
    this.clearHighlights();

    for (const hex of hexes) {
      const center = hexToPixel(hex, HEX_SIZE);
      const corners = hexCorners(center, HEX_SIZE - 1);

      const g = new Graphics();
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        g.lineTo(corners[i].x, corners[i].y);
      }
      g.closePath();
      g.fill({ color, alpha });
      this._highlightContainer.addChild(g);
    }
  }

  /** Clear all hex highlights. */
  clearHighlights(): void {
    this._highlightContainer.removeChildren();
  }

  // -----------------------------------------------------------------------
  // Private — hex drawing
  // -----------------------------------------------------------------------

  private _drawHexTile(tile: HexTile): Graphics {
    const terrainDef = TERRAIN_DEFINITIONS[tile.terrain];
    const center = hexToPixel(tile, HEX_SIZE);
    const corners = hexCorners(center, HEX_SIZE - 1);

    const g = new Graphics();

    // Fill hex with terrain color
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      g.lineTo(corners[i].x, corners[i].y);
    }
    g.closePath();
    g.fill({ color: terrainDef.color });
    g.stroke({ color: terrainDef.borderColor, width: 1, alpha: 0.5 });

    // Owner territory overlay
    if (tile.owner) {
      const playerIndex = parseInt(tile.owner.replace("p", "")) - 1;
      const ownerColor = PLAYER_COLORS[playerIndex] ?? 0xffffff;
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        g.lineTo(corners[i].x, corners[i].y);
      }
      g.closePath();
      g.fill({ color: ownerColor, alpha: 0.15 });
    }

    // Terrain decorations
    _drawTerrainDecoration(g, tile.terrain, center);

    return g;
  }

  // -----------------------------------------------------------------------
  // Private — hover
  // -----------------------------------------------------------------------

  private _updateHover(hex: HexCoord | null): void {
    this._hoverGraphics.clear();

    if (hex && this._grid?.getTile(hex.q, hex.r)) {
      const center = hexToPixel(hex, HEX_SIZE);
      const corners = hexCorners(center, HEX_SIZE - 1);

      this._hoverGraphics.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        this._hoverGraphics.lineTo(corners[i].x, corners[i].y);
      }
      this._hoverGraphics.closePath();
      this._hoverGraphics.fill({ color: HOVER_COLOR, alpha: HOVER_ALPHA });
      this._hoverGraphics.stroke({ color: HOVER_COLOR, width: 2, alpha: 0.5 });
    }

    if (
      hex?.q !== this._hoveredHex?.q ||
      hex?.r !== this._hoveredHex?.r
    ) {
      this._hoveredHex = hex;
      this.onHexHover?.(hex);
    }
  }

  // -----------------------------------------------------------------------
  // Private — input
  // -----------------------------------------------------------------------

  /** Convert screen pixel position to hex coordinate. */
  private _screenToHex(screenX: number, screenY: number): HexCoord | null {
    if (!this._grid) return null;

    // Screen → world pixel (undo camera transform)
    // Camera: worldContainer.position = camera.xy * zoom, worldContainer.scale = zoom
    // So worldPx = screenPx / zoom - camera.x
    const cam = this._vm.camera;
    const worldPx = screenX / cam.zoom - cam.x;
    const worldPy = screenY / cam.zoom - cam.y;

    const hex = pixelToHex(worldPx, worldPy, HEX_SIZE);

    // Check if this hex exists on the grid
    if (!this._grid.hasTile(hex.q, hex.r)) return null;
    return hex;
  }

  private _onPointerMove = (e: PointerEvent): void => {
    const hex = this._screenToHex(e.clientX, e.clientY);
    this._updateHover(hex);
  };

  private _onPointerDown = (e: PointerEvent): void => {
    // Only handle left-click, and only if camera isn't dragging
    if (e.button !== 0) return;

    // Let UI panels handle clicks first
    if (this.shouldBlockClick?.(e.clientX, e.clientY)) return;

    const hex = this._screenToHex(e.clientX, e.clientY);
    if (hex) {
      this.onHexClick?.(hex);
    }
  };
}

// ---------------------------------------------------------------------------
// Terrain decorations
// ---------------------------------------------------------------------------

function _drawTerrainDecoration(
  g: Graphics,
  terrain: TerrainType,
  center: HexPixel,
): void {
  const cx = center.x;
  const cy = center.y;
  const s = HEX_SIZE * 0.3; // decoration scale

  switch (terrain) {
    case TerrainType.FOREST: {
      // Small triangle trees
      for (const [ox, oy] of [[-4, 2], [3, -2], [0, 5]] as const) {
        g.moveTo(cx + ox, cy + oy - s * 0.6);
        g.lineTo(cx + ox - s * 0.35, cy + oy + s * 0.3);
        g.lineTo(cx + ox + s * 0.35, cy + oy + s * 0.3);
        g.closePath();
        g.fill({ color: 0x1a5c1a, alpha: 0.7 });
      }
      break;
    }
    case TerrainType.MOUNTAINS: {
      // Triangle peaks
      g.moveTo(cx - s * 0.5, cy + s * 0.4);
      g.lineTo(cx, cy - s * 0.6);
      g.lineTo(cx + s * 0.5, cy + s * 0.4);
      g.closePath();
      g.fill({ color: 0x888888, alpha: 0.6 });
      // Snow cap
      g.moveTo(cx - s * 0.15, cy - s * 0.2);
      g.lineTo(cx, cy - s * 0.6);
      g.lineTo(cx + s * 0.15, cy - s * 0.2);
      g.closePath();
      g.fill({ color: 0xeeeeee, alpha: 0.6 });
      break;
    }
    case TerrainType.WATER: {
      // Wavy lines
      for (let i = -1; i <= 1; i++) {
        const wy = cy + i * s * 0.4;
        g.moveTo(cx - s * 0.6, wy);
        g.bezierCurveTo(cx - s * 0.2, wy - s * 0.2, cx + s * 0.2, wy + s * 0.2, cx + s * 0.6, wy);
        g.stroke({ color: 0x2244aa, width: 1, alpha: 0.5 });
      }
      break;
    }
    case TerrainType.HILLS: {
      // Small bumps
      g.moveTo(cx - s * 0.5, cy + s * 0.2);
      g.bezierCurveTo(cx - s * 0.25, cy - s * 0.3, cx + s * 0.25, cy - s * 0.3, cx + s * 0.5, cy + s * 0.2);
      g.stroke({ color: 0x886633, width: 1.5, alpha: 0.5 });
      break;
    }
    case TerrainType.SWAMP: {
      // Small dots for swamp
      for (const [ox, oy] of [[-3, -2], [4, 1], [-1, 4], [2, -3]] as const) {
        g.circle(cx + ox, cy + oy, 1.5);
        g.fill({ color: 0x446622, alpha: 0.6 });
      }
      break;
    }
    case TerrainType.DESERT: {
      // Small dots for sand dunes
      g.moveTo(cx - s * 0.4, cy + s * 0.1);
      g.bezierCurveTo(cx - s * 0.1, cy - s * 0.15, cx + s * 0.1, cy + s * 0.15, cx + s * 0.4, cy);
      g.stroke({ color: 0xcc9944, width: 1, alpha: 0.4 });
      break;
    }
    default:
      break;
  }
}

/** Singleton instance. */
export const worldMapRenderer = new WorldMapRenderer();
