// ---------------------------------------------------------------------------
// Caesar – 2D Pixi.js Renderer
// ---------------------------------------------------------------------------

import * as PIXI from "pixi.js";
import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS, HOUSING_TIER_NAMES } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";
import type { CaesarWalker } from "../state/CaesarWalker";
import { tileAt, type CaesarTerrain } from "../state/CaesarMap";
import { canPlaceBuilding } from "../systems/CaesarBuildingSystem";

const TERRAIN_COLORS: Record<CaesarTerrain, number> = {
  grass: 0x5a8f3c,
  water: 0x3a7bd5,
  forest: 0x2d6b1e,
  hill: 0x8b7355,
  stone_deposit: 0x9e9e9e,
  iron_deposit: 0x607d8b,
};

const BUILDING_COLORS: Partial<Record<CaesarBuildingType, number>> = {
  [CaesarBuildingType.HOUSING]: 0xc2956b,
  [CaesarBuildingType.ROAD]: 0xa08060,
  [CaesarBuildingType.WELL]: 0x64b5f6,
  [CaesarBuildingType.FARM]: 0xcddc39,
  [CaesarBuildingType.MILL]: 0xfff9c4,
  [CaesarBuildingType.BAKERY]: 0xd4a057,
  [CaesarBuildingType.BUTCHER]: 0xc62828,
  [CaesarBuildingType.GRANARY]: 0x8d6e63,
  [CaesarBuildingType.MARKET]: 0xff9800,
  [CaesarBuildingType.LUMBER_CAMP]: 0x795548,
  [CaesarBuildingType.QUARRY]: 0x757575,
  [CaesarBuildingType.IRON_MINE]: 0x455a64,
  [CaesarBuildingType.BLACKSMITH]: 0x37474f,
  [CaesarBuildingType.WEAVER]: 0xce93d8,
  [CaesarBuildingType.CHAPEL]: 0xffffff,
  [CaesarBuildingType.CHURCH]: 0xfff8e1,
  [CaesarBuildingType.CATHEDRAL]: 0xffe082,
  [CaesarBuildingType.WATCHPOST]: 0xd32f2f,
  [CaesarBuildingType.BARRACKS]: 0xb71c1c,
  [CaesarBuildingType.WALL]: 0x616161,
  [CaesarBuildingType.GATE]: 0x8d6e63,
  [CaesarBuildingType.TOWER]: 0x424242,
  [CaesarBuildingType.TAVERN]: 0xffab40,
  [CaesarBuildingType.FESTIVAL_GROUND]: 0xff6f00,
  [CaesarBuildingType.JOUSTING_ARENA]: 0xe65100,
  [CaesarBuildingType.GUILD_HALL]: 0x1565c0,
  [CaesarBuildingType.WAREHOUSE]: 0x5d4037,
};

const HOUSING_TIER_COLORS = [
  0xa0876e, // Hovel
  0xb89f85, // Cottage
  0xd4b896, // House
  0xe8cfa8, // Manor
  0xfff3c4, // Estate
];

const WALKER_COLORS: Record<string, number> = {
  service: 0x00bcd4,
  immigrant: 0x4caf50,
  bandit: 0xf44336,
  militia: 0x2196f3,
};

export class CaesarRenderer {
  private _app: PIXI.Application | null = null;
  private _terrainLayer = new PIXI.Container();
  private _buildingLayer = new PIXI.Container();
  private _walkerLayer = new PIXI.Container();
  private _overlayLayer = new PIXI.Container();
  private _uiLayer = new PIXI.Container();

  // Camera
  private _cameraX = 0;
  private _cameraY = 0;
  private _zoom = 1;
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _camStartX = 0;
  private _camStartY = 0;

  // Terrain graphics (cached)
  private _terrainGraphics: PIXI.Graphics | null = null;
  private _terrainDirty = true;

  // Tile highlight
  private _highlightGraphics = new PIXI.Graphics();

  get canvas(): HTMLCanvasElement | null {
    return this._app?.canvas as HTMLCanvasElement ?? null;
  }

  async init(screenW: number, screenH: number): Promise<void> {
    this._app = new PIXI.Application();
    await this._app.init({
      width: screenW,
      height: screenH,
      backgroundColor: 0x1a1a2e,
      antialias: false,
      resolution: 1,
    });

    document.body.appendChild(this._app.canvas as HTMLCanvasElement);

    const stage = this._app.stage;
    stage.addChild(this._terrainLayer);
    stage.addChild(this._buildingLayer);
    stage.addChild(this._walkerLayer);
    stage.addChild(this._overlayLayer);
    stage.addChild(this._uiLayer);

    this._overlayLayer.addChild(this._highlightGraphics);

    // Center camera
    this._cameraX = -(screenW / 2);
    this._cameraY = -(screenH / 2);

    // Input: scroll to zoom, drag to pan
    this._setupInput();
  }

  private _setupInput(): void {
    const canvas = this._app!.canvas as HTMLCanvasElement;

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this._zoom = Math.max(0.3, Math.min(3, this._zoom * zoomDelta));
    });

    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this._isDragging = true;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this._camStartX = this._cameraX;
        this._camStartY = this._cameraY;
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (this._isDragging) {
        const dx = e.clientX - this._dragStartX;
        const dy = e.clientY - this._dragStartY;
        this._cameraX = this._camStartX - dx / this._zoom;
        this._cameraY = this._camStartY - dy / this._zoom;
      }
    });

    canvas.addEventListener("mouseup", () => {
      this._isDragging = false;
    });

    // Keyboard panning
    const moveSpeed = 8;
    const keys = new Set<string>();
    window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

    const _panLoop = (): void => {
      if (keys.has("a") || keys.has("arrowleft")) this._cameraX -= moveSpeed / this._zoom;
      if (keys.has("d") || keys.has("arrowright")) this._cameraX += moveSpeed / this._zoom;
      if (keys.has("w") || keys.has("arrowup")) this._cameraY -= moveSpeed / this._zoom;
      if (keys.has("s") || keys.has("arrowdown")) this._cameraY += moveSpeed / this._zoom;
      requestAnimationFrame(_panLoop);
    };
    _panLoop();
  }

  /** Convert screen coords to tile coords */
  screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = screenX / this._zoom + this._cameraX;
    const worldY = screenY / this._zoom + this._cameraY;
    return {
      x: Math.floor(worldX / CB.TILE_SIZE),
      y: Math.floor(worldY / CB.TILE_SIZE),
    };
  }

  /** Center camera on tile */
  centerOn(tileX: number, tileY: number): void {
    const screenW = this._app?.screen.width ?? 800;
    const screenH = this._app?.screen.height ?? 600;
    this._cameraX = tileX * CB.TILE_SIZE - screenW / (2 * this._zoom);
    this._cameraY = tileY * CB.TILE_SIZE - screenH / (2 * this._zoom);
  }

  markTerrainDirty(): void {
    this._terrainDirty = true;
  }

  render(state: CaesarState, _dt: number): void {
    if (!this._app) return;

    const stage = this._app.stage;
    stage.scale.set(this._zoom);
    stage.position.set(-this._cameraX * this._zoom, -this._cameraY * this._zoom);

    this._renderTerrain(state);
    this._renderBuildings(state);
    this._renderWalkers(state);
    this._renderHighlight(state);
  }

  private _renderTerrain(state: CaesarState): void {
    if (!this._terrainDirty) return;
    this._terrainDirty = false;

    if (this._terrainGraphics) {
      this._terrainLayer.removeChild(this._terrainGraphics);
      this._terrainGraphics.destroy();
    }

    const g = new PIXI.Graphics();
    const map = state.map;
    const ts = CB.TILE_SIZE;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y * map.width + x];
        let color = TERRAIN_COLORS[tile.terrain] ?? 0x5a8f3c;

        // Slight elevation-based shading
        const shade = 0.85 + tile.elevation * 0.3;
        color = shadeColor(color, shade);

        g.rect(x * ts, y * ts, ts, ts);
        g.fill(color);
      }
    }

    this._terrainGraphics = g;
    this._terrainLayer.addChild(g);
  }

  private _renderBuildings(state: CaesarState): void {
    // Clear and redraw every frame (simple approach)
    this._buildingLayer.removeChildren();

    const ts = CB.TILE_SIZE;

    for (const b of state.buildings.values()) {
      const bdef = CAESAR_BUILDING_DEFS[b.type];
      const g = new PIXI.Graphics();

      let color: number;
      if (b.type === CaesarBuildingType.HOUSING) {
        color = HOUSING_TIER_COLORS[b.housingTier] ?? HOUSING_TIER_COLORS[0];
      } else {
        color = BUILDING_COLORS[b.type] ?? 0x888888;
      }

      // Dim if under construction
      if (!b.built) {
        color = shadeColor(color, 0.5 + b.constructionProgress * 0.5);
      }

      const px = b.tileX * ts;
      const py = b.tileY * ts;
      const pw = bdef.footprint.w * ts;
      const ph = bdef.footprint.h * ts;

      g.rect(px + 1, py + 1, pw - 2, ph - 2);
      g.fill(color);

      // Border
      g.rect(px + 1, py + 1, pw - 2, ph - 2);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });

      // Label for larger buildings
      if (bdef.footprint.w >= 2) {
        const label = b.type === CaesarBuildingType.HOUSING
          ? HOUSING_TIER_NAMES[b.housingTier][0] // First letter
          : bdef.label[0];
        const text = new PIXI.Text({
          text: label,
          style: { fontSize: ts * 0.6, fill: 0x000000, fontFamily: "monospace" },
        });
        text.position.set(px + pw / 2 - text.width / 2, py + ph / 2 - text.height / 2);
        g.addChild(text);
      }

      // Construction progress bar
      if (!b.built) {
        g.rect(px + 2, py + ph - 4, (pw - 4) * b.constructionProgress, 3);
        g.fill(0x4caf50);
      }

      // Residents count for housing
      if (b.type === CaesarBuildingType.HOUSING && b.residents > 0) {
        const resText = new PIXI.Text({
          text: `${b.residents}`,
          style: { fontSize: ts * 0.4, fill: 0x333333, fontFamily: "monospace" },
        });
        resText.position.set(px + 1, py + 1);
        g.addChild(resText);
      }

      // Selection highlight
      if (state.selectedBuildingId === b.id) {
        g.rect(px, py, pw, ph);
        g.stroke({ color: 0xffff00, width: 2 });
      }

      this._buildingLayer.addChild(g);
    }
  }

  private _renderWalkers(state: CaesarState): void {
    this._walkerLayer.removeChildren();

    const ts = CB.TILE_SIZE;

    for (const w of state.walkers.values()) {
      if (!w.alive) continue;

      const g = new PIXI.Graphics();
      const color = WALKER_COLORS[w.walkerType] ?? 0xffffff;
      const size = w.walkerType === "bandit" ? ts * 0.4 : ts * 0.3;

      g.circle(w.x * ts, w.y * ts, size);
      g.fill(color);

      // Health bar for combat walkers
      if ((w.walkerType === "bandit" || w.walkerType === "militia") && w.hp < w.maxHp) {
        const barW = ts * 0.8;
        const barH = 2;
        const hpRatio = w.hp / w.maxHp;
        g.rect(w.x * ts - barW / 2, w.y * ts - size - 4, barW, barH);
        g.fill(0x333333);
        g.rect(w.x * ts - barW / 2, w.y * ts - size - 4, barW * hpRatio, barH);
        g.fill(hpRatio > 0.5 ? 0x4caf50 : 0xf44336);
      }

      this._walkerLayer.addChild(g);
    }
  }

  private _renderHighlight(state: CaesarState): void {
    this._highlightGraphics.clear();

    if (state.hoveredTileX < 0 || state.hoveredTileY < 0) return;

    const ts = CB.TILE_SIZE;
    let w = 1;
    let h = 1;

    if (state.selectedTool === "build" && state.selectedBuildingType) {
      const bdef = CAESAR_BUILDING_DEFS[state.selectedBuildingType];
      w = bdef.footprint.w;
      h = bdef.footprint.h;
    }

    const px = state.hoveredTileX * ts;
    const py = state.hoveredTileY * ts;

    // Check if placement is valid
    let valid = true;
    if (state.selectedTool === "build" && state.selectedBuildingType) {
      valid = canPlaceBuilding(state, state.selectedBuildingType, state.hoveredTileX, state.hoveredTileY);
    }

    this._highlightGraphics.rect(px, py, w * ts, h * ts);
    this._highlightGraphics.stroke({ color: valid ? 0x00ff00 : 0xff0000, width: 2, alpha: 0.8 });
    this._highlightGraphics.rect(px, py, w * ts, h * ts);
    this._highlightGraphics.fill({ color: valid ? 0x00ff00 : 0xff0000, alpha: 0.15 });
  }

  destroy(): void {
    if (this._app) {
      const canvas = this._app.canvas as HTMLCanvasElement;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      this._app.destroy(true);
      this._app = null;
    }
  }
}

// ---- Helpers ----

function shadeColor(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}
