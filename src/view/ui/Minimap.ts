// Minimap — zoomed-out overview of the entire battlefield.
// Shows tile zones, buildings, units, and the camera viewport rectangle.
// Clicking on the minimap pans the camera to that position.
// Fixed display size regardless of map dimensions.

import { Container, Graphics } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import type { Camera } from "@view/Camera";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingState } from "@/types";
import type { MapType } from "@/types";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PAD = 12;
const HUD_PANEL_W = 220;
const GAP = 8; // gap between HUD panel and minimap

// Fixed minimap display size (pixels) — same on all map sizes
const MM_DISPLAY_W = 264;
const MM_DISPLAY_H = 150;

// Minimap border
const BORDER_COLOR = 0xffd700;
const BORDER_ALPHA = 0.5;
const BORDER_W = 1.5;
const BG_COLOR = 0x0a0a18;
const BG_ALPHA = 0.78;

// Viewport rectangle on minimap
const VP_COLOR = 0xffffff;
const VP_ALPHA = 0.7;

// ---------------------------------------------------------------------------
// Tile color palette for minimap (simplified, per-zone)
// ---------------------------------------------------------------------------

interface MinimapColors {
  west: number;
  neutral: number;
  east: number;
  westUnwalkable: number;
  neutralUnwalkable: number;
  eastUnwalkable: number;
}

const MAP_COLORS: Record<string, MinimapColors> = {
  meadow: {
    west: 0x2d4c2d,
    neutral: 0x3a5a30,
    east: 0x5c4d2d,
    westUnwalkable: 0x1e331e,
    neutralUnwalkable: 0x203518,
    eastUnwalkable: 0x3d331e,
  },
  grass: {
    west: 0x3a6b2a,
    neutral: 0x4a8035,
    east: 0x3d7030,
    westUnwalkable: 0x2a5020,
    neutralUnwalkable: 0x2d5a1e,
    eastUnwalkable: 0x2c5522,
  },
  plains: {
    west: 0x8a7d48,
    neutral: 0x9c8e52,
    east: 0x7d7040,
    westUnwalkable: 0x6b5f38,
    neutralUnwalkable: 0x746840,
    eastUnwalkable: 0x5e5430,
  },
  forest: {
    west: 0x1a3318,
    neutral: 0x1e3a1a,
    east: 0x1d3520,
    westUnwalkable: 0x0f1f0e,
    neutralUnwalkable: 0x122210,
    eastUnwalkable: 0x112015,
  },
  fantasia: {
    west: 0x3a6a35,
    neutral: 0x4a7a45,
    east: 0x4a6a40,
    westUnwalkable: 0x2a4a28,
    neutralUnwalkable: 0x2a4a28,
    eastUnwalkable: 0x2a4a30,
  },
};

const DEFAULT_COLORS = MAP_COLORS.meadow;

// Building / unit dot colors
const BUILDING_P1 = 0x4488ff;
const BUILDING_P2 = 0xff4444;
const BUILDING_NEUTRAL = 0xcccc88;
const UNIT_P1 = 0x66aaff;
const UNIT_P2 = 0xff6666;

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

export class Minimap {
  readonly container = new Container();

  private _bg = new Graphics();
  private _tiles = new Graphics();
  private _entities = new Graphics();
  private _viewport = new Graphics();

  private _camera!: Camera;
  private _mapW = 0;
  private _mapH = 0;
  private _scaleX = 1; // pixels per tile (horizontal)
  private _scaleY = 1; // pixels per tile (vertical)
  private _colors: MinimapColors = DEFAULT_COLORS;

  init(vm: ViewManager, state: GameState, camera: Camera, mapType: MapType): void {
    this._camera = camera;
    this._mapW = state.battlefield.width;
    this._mapH = state.battlefield.height;

    // Compute scale so the entire map fits in the fixed display size
    this._scaleX = MM_DISPLAY_W / this._mapW;
    this._scaleY = MM_DISPLAY_H / this._mapH;

    this._colors = MAP_COLORS[mapType] ?? DEFAULT_COLORS;

    // Background panel
    this._bg
      .roundRect(0, 0, MM_DISPLAY_W + 4, MM_DISPLAY_H + 4, 3)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, MM_DISPLAY_W + 4, MM_DISPLAY_H + 4, 3)
      .stroke({ color: BORDER_COLOR, alpha: BORDER_ALPHA, width: BORDER_W });

    this.container.addChild(this._bg);

    // Tile graphics layer (offset by 2px for border padding)
    this._tiles.position.set(2, 2);
    this.container.addChild(this._tiles);

    // Entity dots layer
    this._entities.position.set(2, 2);
    this.container.addChild(this._entities);

    // Viewport rectangle layer
    this._viewport.position.set(2, 2);
    this.container.addChild(this._viewport);

    // Position: right of P1 HUD panel
    this.container.position.set(PAD + HUD_PANEL_W + GAP, PAD);

    // Draw initial terrain
    this._drawTerrain(state);

    // Click to pan camera
    this.container.eventMode = "static";
    this.container.cursor = "pointer";
    this.container.on("pointerdown", (e) => {
      const local = this.container.toLocal(e.global);
      // Convert minimap pixel to tile coords (accounting for 2px border offset)
      const tileX = (local.x - 2) / this._scaleX;
      const tileY = (local.y - 2) / this._scaleY;
      this._panCameraTo(tileX, tileY);
    });

    vm.addToLayer("ui", this.container);
  }

  update(state: GameState): void {
    this._drawEntities(state);
    this._drawViewport();
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private _drawTerrain(state: GameState): void {
    const g = this._tiles;
    g.clear();

    const bf = state.battlefield;
    const c = this._colors;
    const sx = this._scaleX;
    const sy = this._scaleY;

    for (let y = 0; y < bf.height; y++) {
      const row = bf.grid[y];
      for (let x = 0; x < bf.width; x++) {
        const tile = row[x];
        let color: number;
        if (tile.walkable) {
          color =
            tile.zone === "west"
              ? c.west
              : tile.zone === "east"
                ? c.east
                : c.neutral;
        } else {
          color =
            tile.zone === "west"
              ? c.westUnwalkable
              : tile.zone === "east"
                ? c.eastUnwalkable
                : c.neutralUnwalkable;
        }
        g.rect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy)).fill({ color });
      }
    }
  }

  private _drawEntities(state: GameState): void {
    const g = this._entities;
    g.clear();

    const sx = this._scaleX;
    const sy = this._scaleY;

    // Buildings — draw as small rectangles
    for (const b of state.buildings.values()) {
      if (b.state === BuildingState.DESTROYED) continue;
      const color =
        b.owner === "p1"
          ? BUILDING_P1
          : b.owner === "p2"
            ? BUILDING_P2
            : BUILDING_NEUTRAL;
      g.rect(
        b.position.x * sx,
        b.position.y * sy,
        Math.max(2, sx * 0.8),
        Math.max(2, sy * 0.8),
      ).fill({ color });
    }

    // Units — draw as small dots
    for (const u of state.units.values()) {
      const color = u.owner === "p1" ? UNIT_P1 : UNIT_P2;
      g.rect(
        u.position.x * sx - 0.5,
        u.position.y * sy - 0.5,
        Math.max(1.5, sx * 0.4),
        Math.max(1.5, sy * 0.4),
      ).fill({ color });
    }
  }

  private _drawViewport(): void {
    const g = this._viewport;
    g.clear();

    const cam = this._camera;
    const ts = BalanceConfig.TILE_SIZE;
    const sx = this._scaleX;
    const sy = this._scaleY;

    // Visible area in world pixels
    const visW = cam.screenW / cam.zoom;
    const visH = cam.screenH / cam.zoom;

    // Top-left tile of the visible area
    const leftTile = -cam.x / ts;
    const topTile = -cam.y / ts;

    // Dimensions in tiles
    const wTiles = visW / ts;
    const hTiles = visH / ts;

    // Clamp to minimap bounds
    const x = Math.max(0, leftTile * sx);
    const y = Math.max(0, topTile * sy);
    const w = Math.min(MM_DISPLAY_W - x, wTiles * sx);
    const h = Math.min(MM_DISPLAY_H - y, hTiles * sy);

    g.rect(x, y, w, h).stroke({ color: VP_COLOR, alpha: VP_ALPHA, width: 1.5 });
  }

  // ---------------------------------------------------------------------------
  // Camera panning
  // ---------------------------------------------------------------------------

  private _panCameraTo(tileX: number, tileY: number): void {
    const ts = BalanceConfig.TILE_SIZE;
    const cam = this._camera;

    // Centre the camera on the clicked tile
    const visW = cam.screenW / cam.zoom;
    const visH = cam.screenH / cam.zoom;

    cam.x = -(tileX * ts) + visW / 2;
    cam.y = -(tileY * ts) + visH / 2;

    // Trigger clamping by calling a minimal update
    cam.update(0);
  }

  /** Redraw terrain (call after buildings placed / destroyed change walkability). */
  redrawTerrain(state: GameState): void {
    this._drawTerrain(state);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

export const minimap = new Minimap();
