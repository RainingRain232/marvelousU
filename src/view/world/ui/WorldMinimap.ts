// World minimap showing the entire hex grid at a glance.
//
// Small overview in the bottom-right corner. Terrain colors + owner overlay.
// Click to pan the camera to that location.

import { Container, Graphics } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { HexGrid } from "@world/hex/HexGrid";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAP_SIZE = 150;
const BORDER = 0x555577;

// Player colors for territory overlay
const PLAYER_COLORS: number[] = [
  0x4466cc, // p1 blue
  0xcc4444, // p2 red
  0x44aa44, // p3 green
  0xccaa22, // p4 yellow
];

// ---------------------------------------------------------------------------
// WorldMinimap
// ---------------------------------------------------------------------------

export class WorldMinimap {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _mapGraphics = new Graphics();
  private _viewportGraphics = new Graphics();
  private _screenW = 800;
  private _screenH = 600;

  // Grid bounds for scaling
  private _minPx = 0;
  private _minPy = 0;
  private _rangePx = 1;
  private _rangePy = 1;

  /** Callback when the player clicks the minimap. */
  onClickPosition: ((worldX: number, worldY: number) => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this._screenW = vm.screenWidth;
    this._screenH = vm.screenHeight;

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, MAP_SIZE + 4, MAP_SIZE + 4, 4);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    bg.stroke({ color: BORDER, width: 1 });
    this.container.addChild(bg);

    this.container.addChild(this._mapGraphics);
    this.container.addChild(this._viewportGraphics);

    this._layout();
    vm.addToLayer("ui", this.container);

    // Click handler
    this.container.eventMode = "static";
    this.container.on("pointerdown", (e) => {
      const local = this.container.toLocal(e.global);
      // Convert minimap coords to world coords
      const worldX = (local.x - 2) / MAP_SIZE * this._rangePx + this._minPx;
      const worldY = (local.y - 2) / MAP_SIZE * this._rangePy + this._minPy;
      this.onClickPosition?.(worldX, worldY);
    });

    vm.app.renderer.on("resize", (w: number, h: number) => {
      this._screenW = w;
      this._screenH = h;
      this._layout();
    });
  }

  /** Render the minimap from grid data. */
  drawMap(grid: HexGrid): void {
    this._mapGraphics.clear();

    // Calculate pixel bounds of the grid
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const tiles: Array<{ px: number; py: number; color: number; ownerColor: number | null }> = [];

    for (const tile of grid.allTiles()) {
      // Simple axial → pixel for minimap (flat positioning)
      const px = tile.q * 1.5;
      const py = tile.r + tile.q * 0.5;

      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);

      const terrain = TERRAIN_DEFINITIONS[tile.terrain];
      let ownerColor: number | null = null;
      if (tile.owner) {
        const idx = parseInt(tile.owner.replace("p", "")) - 1;
        ownerColor = PLAYER_COLORS[idx] ?? null;
      }

      tiles.push({ px, py, color: terrain.color, ownerColor });
    }

    this._minPx = minX;
    this._minPy = minY;
    this._rangePx = maxX - minX || 1;
    this._rangePy = maxY - minY || 1;

    // Scale to fit
    const scale = MAP_SIZE / Math.max(this._rangePx, this._rangePy);
    const dotSize = Math.max(2, scale * 0.7);

    for (const t of tiles) {
      const sx = (t.px - minX) * scale + 2;
      const sy = (t.py - minY) * scale + 2;

      this._mapGraphics.rect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
      this._mapGraphics.fill({ color: t.color });

      if (t.ownerColor !== null) {
        this._mapGraphics.rect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
        this._mapGraphics.fill({ color: t.ownerColor, alpha: 0.4 });
      }
    }
  }

  /** Update the viewport rectangle to match camera. */
  updateViewport(): void {
    this._viewportGraphics.clear();

    const cam = this._vm.camera;
    const scale = MAP_SIZE / Math.max(this._rangePx, this._rangePy);

    // Camera shows: screen coords / zoom - cam offset
    const viewLeft = -cam.x;
    const viewTop = -cam.y;
    const viewW = this._screenW / cam.zoom;
    const viewH = this._screenH / cam.zoom;

    // These are in "hex pixel" units from WorldMapRenderer. We need a rough mapping.
    // The minimap uses simplified q*1.5 / r+q*0.5, but the actual renderer uses hexToPixel.
    // For a rough viewport, just scale from world pixel to minimap coords.
    // HEX_SIZE is 32, so world pixel = hex_unit * ~32.
    const HEX_APPROX = 32;
    const mLeft = (viewLeft / HEX_APPROX - this._minPx) * scale + 2;
    const mTop = (viewTop / HEX_APPROX - this._minPy) * scale + 2;
    const mW = viewW / HEX_APPROX * scale;
    const mH = viewH / HEX_APPROX * scale;

    this._viewportGraphics.rect(mLeft, mTop, mW, mH);
    this._viewportGraphics.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _layout(): void {
    this.container.x = this._screenW - MAP_SIZE - 14;
    this.container.y = this._screenH - MAP_SIZE - 14;
  }
}

/** Singleton instance. */
export const worldMinimap = new WorldMinimap();
