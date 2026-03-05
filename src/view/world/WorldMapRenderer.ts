// Renders the hex world map using PixiJS.
//
// Draws terrain-colored hexagons into the ViewManager's background layer.
// Handles hover highlighting and click-to-select.

import { Container, Graphics } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { HexGrid, type HexTile } from "@world/hex/HexGrid";
import {
  hexToPixel,
  pixelToHex,
  hexCorners,
  hexKey,
  hexNeighbors,
  type HexCoord,
  type HexPixel,
} from "@world/hex/HexCoord";
import { TERRAIN_DEFINITIONS, TerrainType } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCamp } from "@world/state/WorldCamp";
import type { NeutralBuilding } from "@world/state/NeutralBuilding";
import { RESOURCE_DEFINITIONS, IMPROVEMENT_DEFINITIONS } from "@world/config/ResourceDefs";
import { FirepitRenderer } from "@view/entities/FirepitRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";

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
  private _campContainer = new Container();
  private _swordContainer = new Container();
  private _highlightContainer = new Container();
  private _fogContainer = new Container();
  private _borderContainer = new Container();
  private _labelContainer = new Container();
  private _waterContainer = new Container();
  private _hoverGraphics = new Graphics();

  private _grassContainer = new Container();
  private _grid: HexGrid | null = null;
  private _hexGraphics = new Map<string, Graphics>();
  private _waterTiles: HexCoord[] = [];
  private _grassTiles: { hex: HexCoord; terrain: TerrainType }[] = [];
  private _grassGfx: Graphics | null = null;
  private _grassPhase = 0;
  private _grassRedrawTimer = 0;
  private _waterPhase = 0;
  private _waterRedrawTimer = 0;
  private _swordHex: HexCoord | null = null;
  private _fakeSwordHexes: HexCoord[] = [];
  private _tickerCb: (() => void) | null = null;

  // Camp firepit renderers (animated)
  private _campFirepits: FirepitRenderer[] = [];

  // Neutral building renderers (animated)
  private _neutralBuildingContainer = new Container();
  private _neutralBuildingRenderers: { renderer: FirepitRenderer | FarmRenderer | MillRenderer | TowerRenderer; tick: (dt: number) => void }[] = [];

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
    this._container.addChild(this._waterContainer);
    this._container.addChild(this._grassContainer);
    this._container.addChild(this._campContainer);
    this._container.addChild(this._neutralBuildingContainer);
    this._container.addChild(this._swordContainer);
    this._container.addChild(this._highlightContainer);
    this._container.addChild(this._borderContainer);
    this._container.addChild(this._fogContainer);
    this._container.addChild(this._labelContainer);
    this._container.addChild(this._hoverGraphics);

    vm.layers.background.addChild(this._container);

    // Water animation ticker — redraw every ~150ms for performance
    const cb = () => {
      const dt = vm.app.ticker.deltaMS / 1000;
      this._waterPhase += dt;
      this._grassPhase += dt;
      this._waterRedrawTimer += dt;
      this._grassRedrawTimer += dt;
      if (this._waterRedrawTimer >= 0.15 && this._waterTiles.length > 0) {
        this._waterRedrawTimer = 0;
        this._drawWaterOverlay();
      }
      if (this._grassRedrawTimer >= 0.1 && this._grassTiles.length > 0) {
        this._grassRedrawTimer = 0;
        this._drawGrassOverlay();
      }
      if (this._swordHex || this._fakeSwordHexes.length > 0) this._drawSwordFlicker();
      // Animate camp firepits
      for (const fp of this._campFirepits) fp.tick(dt);
      // Animate neutral building renderers
      for (const entry of this._neutralBuildingRenderers) entry.tick(dt);
    };
    vm.app.ticker.add(cb);
    this._tickerCb = cb;

    // Input handling on the canvas
    const canvas = vm.app.canvas as HTMLCanvasElement;
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerdown", this._onPointerDown);
  }

  destroy(): void {
    if (this._tickerCb) this._vm.app.ticker.remove(this._tickerCb);
    const canvas = this._vm?.app?.canvas as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.removeEventListener("pointermove", this._onPointerMove);
      canvas.removeEventListener("pointerdown", this._onPointerDown);
    }

    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._hexGraphics.clear();
    this._waterTiles = [];
    this._grassTiles = [];
    this._waterGraphics = null;
    this._grassGfx = null;
    this._swordGraphics = null;
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
    this._waterTiles = [];

    this._grassTiles = [];
    for (const tile of grid.allTiles()) {
      const g = this._drawHexTile(tile);
      this._hexContainer.addChild(g);
      this._hexGraphics.set(hexKey(tile.q, tile.r), g);
      if (tile.terrain === TerrainType.WATER) {
        this._waterTiles.push({ q: tile.q, r: tile.r });
      }
      if (tile.terrain === TerrainType.PLAINS || tile.terrain === TerrainType.GRASSLAND) {
        this._grassTiles.push({ hex: { q: tile.q, r: tile.r }, terrain: tile.terrain });
      }
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
      g.stroke({ color, width: HEX_SIZE * 0.02, alpha: Math.min(alpha + 0.3, 0.8) });
      this._highlightContainer.addChild(g);
    }
  }

  /** Clear all hex highlights. */
  clearHighlights(): void {
    this._highlightContainer.removeChildren();
  }

  /** Draw a path preview as dotted arrows between hexes. */
  drawPathPreview(path: HexCoord[]): void {
    // Remove old preview (tagged with name)
    for (let i = this._highlightContainer.children.length - 1; i >= 0; i--) {
      const child = this._highlightContainer.children[i];
      if (child.label === "path_preview") {
        child.removeFromParent();
        child.destroy();
      }
    }

    if (path.length < 2) return;

    const g = new Graphics();
    g.label = "path_preview";

    // Draw dotted line segments between path hexes
    for (let i = 0; i < path.length - 1; i++) {
      const from = hexToPixel(path[i], HEX_SIZE);
      const to = hexToPixel(path[i + 1], HEX_SIZE);

      // Dashed line
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dashLen = 4;
      const gapLen = 4;
      const steps = Math.floor(dist / (dashLen + gapLen));

      for (let s = 0; s < steps; s++) {
        const t0 = (s * (dashLen + gapLen)) / dist;
        const t1 = Math.min(1, (s * (dashLen + gapLen) + dashLen) / dist);
        g.moveTo(from.x + dx * t0, from.y + dy * t0);
        g.lineTo(from.x + dx * t1, from.y + dy * t1);
      }
    }
    g.stroke({ color: 0xffff88, width: HEX_SIZE * 0.04, alpha: 0.7 });

    // Arrow at destination
    const last = hexToPixel(path[path.length - 1], HEX_SIZE);
    const prev = hexToPixel(path[path.length - 2], HEX_SIZE);
    const adx = last.x - prev.x;
    const ady = last.y - prev.y;
    const alen = Math.sqrt(adx * adx + ady * ady);
    if (alen > 0) {
      const nx = adx / alen;
      const ny = ady / alen;
      const tipX = last.x;
      const tipY = last.y;
      const arrowS = HEX_SIZE * 0.12;
      g.moveTo(tipX - nx * arrowS - ny * arrowS * 0.6, tipY - ny * arrowS + nx * arrowS * 0.6);
      g.lineTo(tipX, tipY);
      g.lineTo(tipX - nx * arrowS + ny * arrowS * 0.6, tipY - ny * arrowS - nx * arrowS * 0.6);
      g.stroke({ color: 0xffff88, width: HEX_SIZE * 0.04, alpha: 0.8 });
    }

    this._highlightContainer.addChild(g);
  }

  /** Clear only path preview graphics. */
  clearPathPreview(): void {
    for (let i = this._highlightContainer.children.length - 1; i >= 0; i--) {
      const child = this._highlightContainer.children[i];
      if (child.label === "path_preview") {
        child.removeFromParent();
        child.destroy();
      }
    }
  }

  /** Draw fog of war overlay based on a player's explored/visible tiles. */
  drawFog(grid: HexGrid, player: WorldPlayer): void {
    this._fogContainer.removeChildren();

    for (const tile of grid.allTiles()) {
      const key = hexKey(tile.q, tile.r);
      const explored = player.exploredTiles.has(key);
      const visible = player.visibleTiles.has(key);

      if (visible) continue; // fully visible — no overlay

      const center = hexToPixel(tile, HEX_SIZE);
      const corners = hexCorners(center, HEX_SIZE);

      const g = new Graphics();
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        g.lineTo(corners[i].x, corners[i].y);
      }
      g.closePath();

      if (!explored) {
        // Never seen — solid black
        g.fill({ color: 0x000000, alpha: 0.95 });
      } else {
        // Explored but not currently visible — dark shroud
        g.fill({ color: 0x000000, alpha: 0.55 });
      }

      this._fogContainer.addChild(g);
    }
  }

  /** Clear fog overlay. */
  clearFog(): void {
    this._fogContainer.removeChildren();
  }

  /** Draw territory border lines where ownership changes between adjacent hexes. */
  drawBorders(grid: HexGrid): void {
    this._borderContainer.removeChildren();
    const g = new Graphics();

    // For each tile with an owner, check each of its 6 edges.
    // If the neighbor has a different owner (or no owner), draw that edge.
    // Hex corners are indexed 0-5 (pointy-top, starting at 30deg).
    // Edge i connects corner[i] to corner[(i+1)%6].
    // HEX_DIRECTIONS[i] corresponds to the neighbor across edge i.
    for (const tile of grid.allTiles()) {
      if (!tile.owner) continue;

      const playerIndex = parseInt(tile.owner.replace("p", "")) - 1;
      const color = PLAYER_COLORS[playerIndex] ?? 0xffffff;
      const center = hexToPixel(tile, HEX_SIZE);
      const corners = hexCorners(center, HEX_SIZE - 1);

      const neighbors = hexNeighbors(tile);
      for (let i = 0; i < 6; i++) {
        const n = neighbors[i];
        const nTile = grid.getTile(n.q, n.r);
        const nOwner = nTile?.owner ?? null;
        if (nOwner === tile.owner) continue;

        // Draw this edge segment
        const c1 = corners[i];
        const c2 = corners[(i + 1) % 6];
        g.moveTo(c1.x, c1.y);
        g.lineTo(c2.x, c2.y);
        g.stroke({ color, width: HEX_SIZE * 0.04, alpha: 0.7 });
      }
    }

    this._borderContainer.addChild(g);
  }

  /** Clear territory borders. */
  clearBorders(): void {
    this._borderContainer.removeChildren();
  }

  /** Draw camp icons on the map using firepit animation. Only shows uncleared camps in visible/explored tiles. */
  drawCamps(camps: Iterable<WorldCamp>, localPlayer?: WorldPlayer): void {
    this._campContainer.removeChildren();
    this._campFirepits = [];

    // FirepitRenderer is 2×TS (128×128). Scale to fit hex.
    const FIREPIT_SCALE = (HEX_SIZE * 2 * 0.7) / 128;

    for (const camp of camps) {
      if (camp.cleared) continue;

      // Hide camps in fog
      if (localPlayer) {
        const key = hexKey(camp.position.q, camp.position.r);
        if (!localPlayer.exploredTiles.has(key)) continue;
      }

      const center = hexToPixel(camp.position, HEX_SIZE);

      // Hex mask so the firepit doesn't overflow
      const wrapper = new Container();
      const mask = new Graphics();
      const corners = hexCorners(center, HEX_SIZE - 2);
      mask.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) mask.lineTo(corners[i].x, corners[i].y);
      mask.closePath();
      mask.fill({ color: 0xffffff });
      wrapper.addChild(mask);
      wrapper.mask = mask;

      const fp = new FirepitRenderer();
      fp.container.scale.set(FIREPIT_SCALE);
      fp.container.position.set(
        center.x - 64 * FIREPIT_SCALE,
        center.y - 64 * FIREPIT_SCALE + HEX_SIZE * 0.1,
      );
      wrapper.addChild(fp.container);
      this._campFirepits.push(fp);

      // Tier indicator — small colored diamond
      const s = HEX_SIZE * 0.15;
      const tierColor = camp.tier === 1 ? 0xaa7744 : camp.tier === 2 ? 0xcc5533 : 0xcc2222;
      const badge = new Graphics();
      badge.moveTo(center.x, center.y - HEX_SIZE * 0.75 - s);
      badge.lineTo(center.x + s * 0.7, center.y - HEX_SIZE * 0.75);
      badge.lineTo(center.x, center.y - HEX_SIZE * 0.75 + s);
      badge.lineTo(center.x - s * 0.7, center.y - HEX_SIZE * 0.75);
      badge.closePath();
      badge.fill({ color: tierColor, alpha: 0.9 });
      badge.stroke({ color: 0x000000, width: 1, alpha: 0.6 });

      this._campContainer.addChild(wrapper);
      this._campContainer.addChild(badge);
    }
  }

  /** Draw neutral buildings (farms, mills, towers) on the map. */
  drawNeutralBuildings(buildings: Iterable<NeutralBuilding>, localPlayer?: WorldPlayer): void {
    this._neutralBuildingContainer.removeChildren();
    this._neutralBuildingRenderers = [];

    const FARM_SCALE = (HEX_SIZE * 2 * 0.7) / 128;
    const MILL_SCALE = (HEX_SIZE * 2 * 0.7) / 128;
    // Tower is 64×64 natively. Use same scale as castle (256×256) to keep proportions.
    const TOWER_SCALE = (HEX_SIZE * 2 * 0.7) / 256;

    for (const building of buildings) {
      // Hide in fog
      if (localPlayer) {
        const key = hexKey(building.position.q, building.position.r);
        if (!localPlayer.exploredTiles.has(key)) continue;
      }

      const center = hexToPixel(building.position, HEX_SIZE);

      // Hex mask
      const wrapper = new Container();
      const mask = new Graphics();
      const corners = hexCorners(center, HEX_SIZE - 2);
      mask.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) mask.lineTo(corners[i].x, corners[i].y);
      mask.closePath();
      mask.fill({ color: 0xffffff });
      wrapper.addChild(mask);
      wrapper.mask = mask;

      const ownerStr = building.owner;

      if (building.type === "farm") {
        const fr = new FarmRenderer(ownerStr);
        fr.container.scale.set(FARM_SCALE);
        fr.container.position.set(
          center.x - 64 * FARM_SCALE,
          center.y - 64 * FARM_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(fr.container);
        this._neutralBuildingRenderers.push({ renderer: fr, tick: (dt) => fr.tick(dt, 0 as any) });
      } else if (building.type === "mill") {
        const mr = new MillRenderer(ownerStr);
        mr.container.scale.set(MILL_SCALE);
        mr.container.position.set(
          center.x - 32 * MILL_SCALE,
          center.y - 64 * MILL_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(mr.container);
        this._neutralBuildingRenderers.push({ renderer: mr, tick: (dt) => mr.tick(dt, 0 as any) });
      } else if (building.type === "tower") {
        const tr = new TowerRenderer(ownerStr);
        tr.container.scale.set(TOWER_SCALE);
        tr.container.position.set(
          center.x - 32 * TOWER_SCALE,
          center.y - 32 * TOWER_SCALE,
        );
        wrapper.addChild(tr.container);
        this._neutralBuildingRenderers.push({ renderer: tr, tick: (dt) => tr.tick(dt, 0 as any) });
      }

      // Gold income badge
      const badge = new Graphics();
      const bx = center.x + HEX_SIZE * 0.45;
      const by = center.y - HEX_SIZE * 0.65;
      badge.circle(bx, by, HEX_SIZE * 0.1);
      badge.fill({ color: 0xffcc00, alpha: 0.9 });
      badge.stroke({ color: 0x886600, width: 1 });

      this._neutralBuildingContainer.addChild(wrapper);
      this._neutralBuildingContainer.addChild(badge);
    }
  }

  // -----------------------------------------------------------------------
  // Private — water animation
  // -----------------------------------------------------------------------

  private _waterGraphics: Graphics | null = null;

  private _drawWaterOverlay(): void {
    if (!this._waterGraphics) {
      this._waterGraphics = new Graphics();
      this._waterContainer.addChild(this._waterGraphics);
    }
    const g = this._waterGraphics;
    g.clear();
    const t = this._waterPhase;

    for (const hex of this._waterTiles) {
      const center = hexToPixel(hex, HEX_SIZE);
      const cx = center.x;
      const cy = center.y;
      const s = HEX_SIZE * 0.35;

      // Animated wave highlights that shift over time
      for (let i = -3; i <= 3; i++) {
        const wy = cy + i * s * 0.22;
        const phase = t * 1.5 + hex.q * 0.7 + hex.r * 0.5 + i * 1.2;
        const shimmer = Math.sin(phase) * 0.15 + 0.1;
        const dx = Math.sin(phase * 0.7) * s * 0.15;

        g.moveTo(cx - s * 0.65 + dx, wy);
        g.bezierCurveTo(
          cx - s * 0.2 + dx, wy - s * 0.1,
          cx + s * 0.2 + dx, wy + s * 0.1,
          cx + s * 0.65 + dx, wy,
        );
        g.stroke({ color: 0x88bbff, width: 1.5, alpha: Math.max(0, shimmer) });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private — grass animation
  // -----------------------------------------------------------------------

  private _drawGrassOverlay(): void {
    if (!this._grassGfx) {
      this._grassGfx = new Graphics();
      this._grassContainer.addChild(this._grassGfx);
    }
    const g = this._grassGfx;
    g.clear();
    const t = this._grassPhase;

    for (const { hex, terrain } of this._grassTiles) {
      const center = hexToPixel(hex, HEX_SIZE);
      const cx = center.x;
      const cy = center.y;
      const isLush = terrain === TerrainType.GRASSLAND;
      const count = isLush ? 12 : 8;
      const baseColor = isLush ? 0x448833 : 0x5a8a3a;
      const altColor = isLush ? 0x55aa44 : 0x6a9a4a;

      for (let i = 0; i < count; i++) {
        const ox = ((_tileHash(cx, cy, i * 5 + 500) % 130) - 65);
        const oy = ((_tileHash(cx, cy, i * 5 + 501) % 110) - 55);
        const phase = t * (1.5 + (_tileHash(cx, cy, i * 5 + 502) % 10) * 0.15)
          + hex.q * 0.5 + hex.r * 0.3 + i * 0.8;
        const sway = Math.sin(phase) * 4;
        const bh = 10 + (_tileHash(cx, cy, i * 5 + 503) % 10);
        const color = (_tileHash(cx, cy, i + 510) % 2 === 0) ? baseColor : altColor;

        for (let b = -1; b <= 1; b++) {
          const bOff = b * 2;
          const bSway = sway + b * 0.5;
          g.moveTo(cx + ox + bOff, cy + oy);
          g.bezierCurveTo(
            cx + ox + bOff + bSway * 0.3, cy + oy - bh * 0.4,
            cx + ox + bOff + bSway * 0.7, cy + oy - bh * 0.75,
            cx + ox + bOff + bSway, cy + oy - bh,
          );
          g.stroke({ color, width: 1.3, alpha: 0.5 });
        }
      }
    }
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
    g.stroke({ color: terrainDef.borderColor, width: HEX_SIZE * 0.01, alpha: 0.5 });

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

    // Resource icon (bottom-right area of hex, unique shape per type)
    if (tile.resource) {
      const resDef = RESOURCE_DEFINITIONS[tile.resource];
      if (resDef) {
        const rx = center.x + HEX_SIZE * 0.25;
        const ry = center.y + HEX_SIZE * 0.2;
        _drawResourceIcon(g, tile.resource, rx, ry, resDef.color);
      }
    }

    // Improvement marker
    if (tile.improvement) {
      if (tile.improvement === "road") {
        // Roads draw connecting lines to neighboring roads and cities
        this._drawRoadConnections(g, tile, center);
      } else {
        const impDef = IMPROVEMENT_DEFINITIONS[tile.improvement];
        if (impDef) {
          const ix = center.x - HEX_SIZE * 0.25;
          const iy = center.y + HEX_SIZE * 0.2;
          const impS = HEX_SIZE * 0.06;
          g.rect(ix - impS, iy - impS, impS * 2, impS * 2);
          g.fill({ color: impDef.color, alpha: 0.9 });
          g.stroke({ color: 0x000000, width: 1, alpha: 0.5 });
        }
      }
    }

    return g;
  }

  // -----------------------------------------------------------------------
  // Private — road rendering
  // -----------------------------------------------------------------------

  /** Draw road connections from this tile's center to neighboring roads/cities. */
  private _drawRoadConnections(g: Graphics, tile: HexTile, center: HexPixel): void {
    const grid = this._grid;
    if (!grid) return;

    const neighbors = hexNeighbors(tile);
    let hasConnection = false;

    for (const n of neighbors) {
      const nTile = grid.getTile(n.q, n.r);
      if (!nTile) continue;

      const isRoad = nTile.improvement === "road";
      const isCity = !!nTile.cityId;

      if (isRoad || isCity) {
        // Draw road segment from center toward neighbor center
        const nCenter = hexToPixel(n, HEX_SIZE);
        // Draw to the midpoint between centers (each tile draws its half)
        const midX = (center.x + nCenter.x) / 2;
        const midY = (center.y + nCenter.y) / 2;

        // Road outline (darker)
        g.moveTo(center.x, center.y);
        g.lineTo(midX, midY);
        g.stroke({ color: 0x665533, width: HEX_SIZE * 0.08, alpha: 0.7 });

        // Road fill (lighter)
        g.moveTo(center.x, center.y);
        g.lineTo(midX, midY);
        g.stroke({ color: 0xbbaa77, width: HEX_SIZE * 0.04, alpha: 0.9 });

        hasConnection = true;
      }
    }

    // If no connections, draw a small road marker dot
    if (!hasConnection) {
      g.circle(center.x, center.y, HEX_SIZE * 0.04);
      g.fill({ color: 0xbbaa77, alpha: 0.9 });
      g.stroke({ color: 0x665533, width: 2, alpha: 0.7 });
    }
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
      this._hoverGraphics.stroke({ color: HOVER_COLOR, width: HEX_SIZE * 0.02, alpha: 0.5 });
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

  // -----------------------------------------------------------------------
  // Sword in the Stone
  // -----------------------------------------------------------------------

  /** Set the hex where the sword in the stone should be drawn. */
  setSwordHex(hex: HexCoord): void {
    this._swordHex = hex;
    this._drawSwordFlicker();
  }

  /** Remove the sword in the stone visual. */
  clearSword(): void {
    this._swordHex = null;
    this._swordContainer.removeChildren();
  }

  /** Set fake sword trap hexes (drawn identically to real sword). */
  setFakeSwordHexes(hexes: HexCoord[]): void {
    this._fakeSwordHexes = hexes;
    this._drawSwordFlicker();
  }

  /** Remove a single fake sword hex (after trap is sprung). */
  removeFakeSwordHex(hex: HexCoord): void {
    this._fakeSwordHexes = this._fakeSwordHexes.filter(
      (h) => h.q !== hex.q || h.r !== hex.r,
    );
    this._drawSwordFlicker();
  }

  /** Redraw the flickering sword in stone. Called each ticker frame. */
  private _swordGraphics: Graphics | null = null;

  private _drawSwordFlicker(): void {
    // Collect all hexes that should show a sword (real + fakes)
    const allSwordHexes: HexCoord[] = [];
    if (this._swordHex) allSwordHexes.push(this._swordHex);
    allSwordHexes.push(...this._fakeSwordHexes);
    if (allSwordHexes.length === 0) return;

    if (!this._swordGraphics) {
      this._swordGraphics = new Graphics();
      this._swordContainer.addChild(this._swordGraphics);
    }
    const g = this._swordGraphics;
    g.clear();

    for (const swordHex of allSwordHexes) {
      const center = hexToPixel(swordHex, HEX_SIZE);
      const cx = center.x;
      const cy = center.y;
      const s = HEX_SIZE * 0.35;
      const t = this._waterPhase; // reuse water animation phase for flickering

      // Stone base (grey rock)
      g.ellipse(cx, cy + s * 0.3, s * 0.55, s * 0.3);
      g.fill({ color: 0x666677, alpha: 0.9 });
      g.stroke({ color: 0x444455, width: s * 0.06 });

      // Stone top (darker cap)
      g.ellipse(cx, cy + s * 0.15, s * 0.4, s * 0.2);
      g.fill({ color: 0x555566, alpha: 0.9 });

      // Sword blade
      const bladeFlicker = 0.7 + 0.3 * Math.sin(t * 4.0);
      g.moveTo(cx, cy - s * 1.2);
      g.lineTo(cx - s * 0.08, cy + s * 0.1);
      g.lineTo(cx + s * 0.08, cy + s * 0.1);
      g.closePath();
      g.fill({ color: 0xccccdd, alpha: bladeFlicker });
      g.stroke({ color: 0xffffff, width: s * 0.04, alpha: bladeFlicker * 0.8 });

      // Cross guard
      g.moveTo(cx - s * 0.25, cy - s * 0.15);
      g.lineTo(cx + s * 0.25, cy - s * 0.15);
      g.stroke({ color: 0xddaa44, width: s * 0.1, alpha: bladeFlicker });

      // Pommel (golden circle)
      g.circle(cx, cy - s * 1.25, s * 0.08);
      g.fill({ color: 0xffdd44, alpha: bladeFlicker });

      // Flickering glow effect around the sword
      const glowAlpha = 0.15 + 0.15 * Math.sin(t * 3.0 + 1.5);
      g.circle(cx, cy - s * 0.4, s * 0.7);
      g.fill({ color: 0xffdd88, alpha: glowAlpha });

      // Sparkles
      for (let i = 0; i < 3; i++) {
        const angle = t * 2.0 + i * 2.1;
        const dist = s * 0.5 + s * 0.2 * Math.sin(t * 1.5 + i);
        const sx = cx + Math.cos(angle) * dist;
        const sy = (cy - s * 0.4) + Math.sin(angle) * dist * 0.6;
        const sparkleAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 5.0 + i * 1.7));
        g.circle(sx, sy, s * 0.06);
        g.fill({ color: 0xffffaa, alpha: sparkleAlpha });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Terrain decorations
// ---------------------------------------------------------------------------

// Use tile coordinates as a simple deterministic hash for per-hex variation
function _tileHash(cx: number, cy: number, seed = 0): number {
  let h = (cx * 374761 + cy * 668265 + seed) | 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  return ((h >>> 16) ^ h) >>> 0;
}

function _hashFloat(cx: number, cy: number, seed = 0): number {
  return (_tileHash(cx, cy, seed) % 10000) / 10000;
}

function _drawTerrainDecoration(
  g: Graphics,
  terrain: TerrainType,
  center: HexPixel,
): void {
  const cx = center.x;
  const cy = center.y;
  const s = HEX_SIZE * 0.35;

  switch (terrain) {
    case TerrainType.PLAINS: {
      // Dense grass tufts filling the hex
      for (let i = 0; i < 25; i++) {
        const ox = ((_tileHash(cx, cy, i * 3 + 10) % 120) - 60);
        const oy = ((_tileHash(cx, cy, i * 3 + 11) % 100) - 50);
        const lean = ((_tileHash(cx, cy, i * 3 + 12) % 10) - 5) * 0.5;
        const bh = 8 + (_tileHash(cx, cy, i * 3 + 13) % 12);
        const grassColor = [0x5a8a3a, 0x6a9a4a, 0x4a7a2a, 0x7aaa5a][_tileHash(cx, cy, i + 200) % 4];
        // 3 blades per clump
        for (let b = -1; b <= 1; b++) {
          g.moveTo(cx + ox + b * 2, cy + oy);
          g.bezierCurveTo(
            cx + ox + b * 2 + lean, cy + oy - bh * 0.5,
            cx + ox + lean * 1.5 + b * 1.5, cy + oy - bh * 0.8,
            cx + ox + lean * 2 + b, cy + oy - bh,
          );
          g.stroke({ color: grassColor, width: 1.2, alpha: 0.55 });
        }
      }
      // Wildflowers scattered
      for (let i = 0; i < 6; i++) {
        if (_hashFloat(cx, cy, i + 50) > 0.4) {
          const fx = cx + (_hashFloat(cx, cy, i * 2 + 51) - 0.5) * 100;
          const fy = cy + (_hashFloat(cx, cy, i * 2 + 52) - 0.5) * 80;
          const flowerColor = [0xdd5555, 0xdddd44, 0xaa44dd, 0xffaa44, 0xff88aa][_tileHash(cx, cy, i + 55) % 5];
          g.circle(fx, fy, 3);
          g.fill({ color: flowerColor, alpha: 0.7 });
          g.circle(fx, fy, 1.5);
          g.fill({ color: 0xffff88, alpha: 0.5 });
          g.moveTo(fx, fy + 3);
          g.lineTo(fx, fy + 10);
          g.stroke({ color: 0x447722, width: 1, alpha: 0.5 });
        }
      }
      break;
    }
    case TerrainType.GRASSLAND: {
      // Dense lush grass patches filling hex
      for (let i = 0; i < 20; i++) {
        const ox = ((_tileHash(cx, cy, i * 4 + 20) % 120) - 60);
        const oy = ((_tileHash(cx, cy, i * 4 + 21) % 100) - 50);
        // Thick grass clump (4 blades)
        for (let b = -2; b <= 1; b++) {
          const lean = b * 1.8 + ((_tileHash(cx, cy, i * 4 + 22 + b) % 6) - 3) * 0.5;
          const bh = 10 + (_tileHash(cx, cy, i * 4 + 25 + b) % 8);
          const grassColor = [0x448833, 0x338822, 0x55aa44, 0x3d7a2d][_tileHash(cx, cy, i + 300) % 4];
          g.moveTo(cx + ox + b * 2.5, cy + oy);
          g.bezierCurveTo(
            cx + ox + b * 2.5 + lean, cy + oy - bh * 0.4,
            cx + ox + lean * 1.3, cy + oy - bh * 0.7,
            cx + ox + lean * 1.5, cy + oy - bh,
          );
          g.stroke({ color: grassColor, width: 1.4, alpha: 0.6 });
        }
      }
      // Bushes
      for (let i = 0; i < 4; i++) {
        if (_hashFloat(cx, cy, i + 30) > 0.3) {
          const bx = cx + (_hashFloat(cx, cy, i * 2 + 31) - 0.5) * 90;
          const by = cy + (_hashFloat(cx, cy, i * 2 + 32) - 0.5) * 70;
          g.ellipse(bx, by, 8, 5);
          g.fill({ color: 0x337722, alpha: 0.45 });
          g.ellipse(bx + 2, by - 1, 6, 4);
          g.fill({ color: 0x449933, alpha: 0.35 });
        }
      }
      break;
    }
    case TerrainType.FOREST: {
      // Dense forest with many multi-layered trees
      const treePositions: [number, number][] = [];
      for (let i = 0; i < 15; i++) {
        treePositions.push([
          ((_tileHash(cx, cy, i * 2 + 40) % 130) - 65),
          ((_tileHash(cx, cy, i * 2 + 41) % 110) - 55),
        ]);
      }
      // Sort by Y for depth
      treePositions.sort((a, b) => a[1] - b[1]);

      for (let i = 0; i < treePositions.length; i++) {
        const [ox, oy] = treePositions[i];
        const scale = 0.8 + (_hashFloat(cx, cy, i + 45) * 0.6);
        const ts = s * 0.35 * scale;
        const shade = _tileHash(cx, cy, i + 50) % 3;
        const leafColor = shade === 0 ? 0x1a6b1a : shade === 1 ? 0x226622 : 0x1a5a22;
        const darkLeaf = shade === 0 ? 0x0f4f0f : shade === 1 ? 0x154415 : 0x0f440f;

        // Shadow on ground
        g.ellipse(cx + ox, cy + oy + ts * 0.4, ts * 0.5, ts * 0.15);
        g.fill({ color: 0x0a3a0a, alpha: 0.12 });

        // Trunk
        const trunkW = 2 + scale * 1.5;
        g.rect(cx + ox - trunkW / 2, cy + oy - ts * 0.2, trunkW, ts * 1.0);
        g.fill({ color: 0x5a3a1a, alpha: 0.65 });

        // Back canopy (darker, wider)
        g.moveTo(cx + ox, cy + oy - ts * 1.5);
        g.lineTo(cx + ox - ts * 0.65, cy + oy + ts * 0.15);
        g.lineTo(cx + ox + ts * 0.65, cy + oy + ts * 0.15);
        g.closePath();
        g.fill({ color: darkLeaf, alpha: 0.6 });

        // Middle canopy
        g.moveTo(cx + ox, cy + oy - ts * 1.7);
        g.lineTo(cx + ox - ts * 0.5, cy + oy - ts * 0.3);
        g.lineTo(cx + ox + ts * 0.5, cy + oy - ts * 0.3);
        g.closePath();
        g.fill({ color: leafColor, alpha: 0.65 });

        // Front canopy (lighter, narrower)
        g.moveTo(cx + ox, cy + oy - ts * 1.3);
        g.lineTo(cx + ox - ts * 0.4, cy + oy + ts * 0.1);
        g.lineTo(cx + ox + ts * 0.4, cy + oy + ts * 0.1);
        g.closePath();
        g.fill({ color: leafColor, alpha: 0.7 });

        // Highlight
        g.moveTo(cx + ox + ts * 0.05, cy + oy - ts * 1.0);
        g.lineTo(cx + ox + ts * 0.3, cy + oy);
        g.lineTo(cx + ox + ts * 0.1, cy + oy);
        g.closePath();
        g.fill({ color: 0x2a8a2a, alpha: 0.2 });
      }
      break;
    }
    case TerrainType.MOUNTAINS: {
      // Multiple mountain peaks filling hex
      // Far back mountain (left)
      g.moveTo(cx - s * 0.5, cy + s * 0.5);
      g.lineTo(cx - s * 0.2, cy - s * 0.3);
      g.lineTo(cx + s * 0.1, cy + s * 0.5);
      g.closePath();
      g.fill({ color: 0x6a6a6a, alpha: 0.45 });
      g.moveTo(cx - s * 0.3, cy - s * 0.05);
      g.lineTo(cx - s * 0.2, cy - s * 0.3);
      g.lineTo(cx - s * 0.1, cy - s * 0.05);
      g.closePath();
      g.fill({ color: 0xddddee, alpha: 0.45 });

      // Back mountain (right)
      g.moveTo(cx + s * 0.15, cy + s * 0.5);
      g.lineTo(cx + s * 0.55, cy - s * 0.4);
      g.lineTo(cx + s * 0.9, cy + s * 0.5);
      g.closePath();
      g.fill({ color: 0x7a7a7a, alpha: 0.55 });
      g.moveTo(cx + s * 0.4, cy - s * 0.1);
      g.lineTo(cx + s * 0.55, cy - s * 0.4);
      g.lineTo(cx + s * 0.7, cy - s * 0.1);
      g.closePath();
      g.fill({ color: 0xddddee, alpha: 0.55 });

      // Main mountain (front, largest)
      g.moveTo(cx - s * 0.7, cy + s * 0.55);
      g.lineTo(cx - s * 0.05, cy - s * 0.85);
      g.lineTo(cx + s * 0.6, cy + s * 0.55);
      g.closePath();
      g.fill({ color: 0x888888, alpha: 0.7 });
      // Left face shadow
      g.moveTo(cx - s * 0.7, cy + s * 0.55);
      g.lineTo(cx - s * 0.05, cy - s * 0.85);
      g.lineTo(cx - s * 0.2, cy + s * 0.55);
      g.closePath();
      g.fill({ color: 0x555555, alpha: 0.3 });
      // Snow cap
      g.moveTo(cx - s * 0.25, cy - s * 0.35);
      g.lineTo(cx - s * 0.05, cy - s * 0.85);
      g.lineTo(cx + s * 0.15, cy - s * 0.35);
      g.closePath();
      g.fill({ color: 0xeeeeff, alpha: 0.7 });
      // Snow drip edge
      g.moveTo(cx - s * 0.25, cy - s * 0.35);
      g.bezierCurveTo(cx - s * 0.12, cy - s * 0.28, cx + s * 0.05, cy - s * 0.4, cx + s * 0.15, cy - s * 0.35);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });

      // Rock texture lines
      for (let i = 0; i < 6; i++) {
        const ry = cy + s * (-0.1 + i * 0.1);
        const spread = s * (0.12 + i * 0.06);
        g.moveTo(cx - spread, ry);
        g.lineTo(cx - spread + s * 0.06, ry - s * 0.03);
        g.stroke({ color: 0x666666, width: 0.8, alpha: 0.3 });
      }
      // Scattered rocks at base
      for (let i = 0; i < 4; i++) {
        const rx = cx + ((_tileHash(cx, cy, i + 170) % 80) - 40);
        const ry = cy + s * 0.35 + (_tileHash(cx, cy, i + 175) % 15);
        g.ellipse(rx, ry, 4 + (_tileHash(cx, cy, i + 180) % 3), 2.5);
        g.fill({ color: 0x777777, alpha: 0.4 });
      }
      break;
    }
    case TerrainType.WATER: {
      // Deep water with many wave lines
      g.ellipse(cx, cy, s * 0.6, s * 0.4);
      g.fill({ color: 0x1a3388, alpha: 0.12 });

      for (let i = -4; i <= 4; i++) {
        const wy = cy + i * s * 0.18;
        const phase = (_tileHash(cx, cy, i + 60) % 10) * 0.3;
        const wAlpha = 0.3 + Math.abs(i) * 0.03;
        g.moveTo(cx - s * 0.75, wy);
        g.bezierCurveTo(
          cx - s * 0.3 + phase, wy - s * 0.1,
          cx + s * 0.2 - phase, wy + s * 0.1,
          cx + s * 0.75, wy,
        );
        g.stroke({ color: 0x2244aa, width: 1.5, alpha: wAlpha });
      }
      // Multiple light reflections
      for (let i = 0; i < 4; i++) {
        const rx = cx + (_hashFloat(cx, cy, i * 2 + 65) - 0.5) * 60;
        const ry = cy + (_hashFloat(cx, cy, i * 2 + 66) - 0.5) * 50;
        const rw = 5 + (_tileHash(cx, cy, i + 69) % 8);
        g.moveTo(rx - rw, ry);
        g.lineTo(rx + rw, ry);
        g.stroke({ color: 0xaabbee, width: 2, alpha: 0.25 });
      }
      break;
    }
    case TerrainType.HILLS: {
      // Multiple rolling hills filling hex
      // Far back hill
      g.moveTo(cx + s * 0.3, cy + s * 0.3);
      g.bezierCurveTo(cx + s * 0.45, cy - s * 0.2, cx + s * 0.7, cy - s * 0.2, cx + s * 0.85, cy + s * 0.3);
      g.fill({ color: 0x6a8844, alpha: 0.3 });

      // Back hill (left)
      g.moveTo(cx - s * 0.8, cy + s * 0.35);
      g.bezierCurveTo(cx - s * 0.5, cy - s * 0.1, cx - s * 0.2, cy - s * 0.15, cx + s * 0.1, cy + s * 0.35);
      g.fill({ color: 0x7a9955, alpha: 0.35 });

      // Main hill (front center)
      g.moveTo(cx - s * 0.65, cy + s * 0.45);
      g.bezierCurveTo(cx - s * 0.25, cy - s * 0.4, cx + s * 0.35, cy - s * 0.4, cx + s * 0.65, cy + s * 0.45);
      g.fill({ color: 0x8aaa66, alpha: 0.4 });
      // Hill shadow (left side)
      g.moveTo(cx - s * 0.65, cy + s * 0.45);
      g.bezierCurveTo(cx - s * 0.4, cy - s * 0.1, cx - s * 0.2, cy - s * 0.2, cx - s * 0.05, cy + s * 0.15);
      g.fill({ color: 0x556633, alpha: 0.2 });
      // Hill outline
      g.moveTo(cx - s * 0.65, cy + s * 0.45);
      g.bezierCurveTo(cx - s * 0.25, cy - s * 0.4, cx + s * 0.35, cy - s * 0.4, cx + s * 0.65, cy + s * 0.45);
      g.stroke({ color: 0x667744, width: 1.5, alpha: 0.4 });

      // Scattered rocks
      for (let i = 0; i < 6; i++) {
        const rx = cx + ((_tileHash(cx, cy, i + 70) % 80) - 40);
        const ry = cy + ((_tileHash(cx, cy, i + 73) % 40) - 10);
        g.ellipse(rx, ry, 3 + (_tileHash(cx, cy, i + 76) % 2), 2);
        g.fill({ color: 0x887766, alpha: 0.4 });
      }
      // Grass on hills
      for (let i = 0; i < 8; i++) {
        const gx = cx + ((_tileHash(cx, cy, i + 150) % 100) - 50);
        const gy = cy + ((_tileHash(cx, cy, i + 151) % 60) - 20);
        const bh = 6 + (_tileHash(cx, cy, i + 152) % 6);
        g.moveTo(gx, gy);
        g.bezierCurveTo(gx + 1, gy - bh * 0.5, gx + 2, gy - bh * 0.8, gx + 3, gy - bh);
        g.stroke({ color: 0x6a9944, width: 1, alpha: 0.4 });
      }
      break;
    }
    case TerrainType.SWAMP: {
      // Multiple murky puddles filling hex
      for (let i = 0; i < 5; i++) {
        const px = cx + ((_tileHash(cx, cy, i + 80) % 100) - 50);
        const py = cy + ((_tileHash(cx, cy, i + 81) % 80) - 40);
        const pw = 8 + (_tileHash(cx, cy, i + 82) % 10);
        const ph = 5 + (_tileHash(cx, cy, i + 83) % 6);
        g.ellipse(px, py, pw, ph);
        g.fill({ color: 0x334422, alpha: 0.2 + (_tileHash(cx, cy, i + 84) % 10) * 0.01 });
      }

      // Reeds scattered across hex
      for (let i = 0; i < 10; i++) {
        const rx = cx + ((_tileHash(cx, cy, i + 90) % 120) - 60);
        const ry = cy + ((_tileHash(cx, cy, i + 91) % 100) - 50);
        const rh = 8 + (_tileHash(cx, cy, i + 92) % 10);
        const lean = ((_tileHash(cx, cy, i + 93) % 6) - 3) * 0.8;
        g.moveTo(rx, ry);
        g.bezierCurveTo(rx + lean * 0.3, ry - rh * 0.4, rx + lean * 0.7, ry - rh * 0.8, rx + lean, ry - rh);
        g.stroke({ color: 0x5a6633, width: 1.2, alpha: 0.55 });
        g.ellipse(rx + lean, ry - rh, 1.5, 3);
        g.fill({ color: 0x776633, alpha: 0.45 });
      }

      // Lily pads
      for (let i = 0; i < 4; i++) {
        if (_hashFloat(cx, cy, i + 100) > 0.35) {
          const lx = cx + (_hashFloat(cx, cy, i * 2 + 101) - 0.5) * 80;
          const ly = cy + (_hashFloat(cx, cy, i * 2 + 102) - 0.5) * 60;
          g.ellipse(lx, ly, 5, 3.5);
          g.fill({ color: 0x448833, alpha: 0.5 });
          g.moveTo(lx, ly);
          g.lineTo(lx + 4, ly - 2);
          g.stroke({ color: 0x334422, width: 0.8, alpha: 0.4 });
        }
      }

      // Fog wisps
      for (let i = 0; i < 3; i++) {
        const fy = cy + (i - 1) * s * 0.3;
        const fOff = ((_tileHash(cx, cy, i + 110) % 20) - 10);
        g.moveTo(cx - s * 0.5 + fOff, fy);
        g.bezierCurveTo(cx - s * 0.15 + fOff, fy - s * 0.1, cx + s * 0.15 + fOff, fy + s * 0.05, cx + s * 0.5 + fOff, fy - s * 0.05);
        g.stroke({ color: 0x99aa88, width: 1.5, alpha: 0.12 });
      }
      break;
    }
    case TerrainType.DESERT: {
      // Large sand dunes filling hex
      // Multiple dune curves
      for (let i = 0; i < 4; i++) {
        const dy = cy + (i - 1.5) * s * 0.3;
        const dx = ((_tileHash(cx, cy, i + 100) % 20) - 10);
        g.moveTo(cx - s * 0.7 + dx, dy + s * 0.15);
        g.bezierCurveTo(cx - s * 0.25 + dx, dy - s * 0.2, cx + s * 0.25 + dx, dy + s * 0.1, cx + s * 0.7 + dx, dy - s * 0.1);
        g.stroke({ color: 0xccaa55, width: 1.5 + i * 0.3, alpha: 0.35 });
      }

      // Wind ripple lines
      for (let i = 0; i < 8; i++) {
        const ry = cy + ((_tileHash(cx, cy, i + 105) % 100) - 50);
        const rx = cx + ((_tileHash(cx, cy, i + 106) % 80) - 40);
        const rw = 6 + (_tileHash(cx, cy, i + 107) % 10);
        g.moveTo(rx - rw, ry);
        g.lineTo(rx + rw, ry);
        g.stroke({ color: 0xddbb66, width: 0.8, alpha: 0.25 });
      }

      // Cacti and rocks
      for (let i = 0; i < 3; i++) {
        if (_hashFloat(cx, cy, i + 115) > 0.5) {
          const px = cx + (_hashFloat(cx, cy, i * 2 + 116) - 0.5) * 80;
          const py = cy + (_hashFloat(cx, cy, i * 2 + 117) - 0.5) * 60;
          if (_tileHash(cx, cy, i + 118) % 2 === 0) {
            // Cactus (scaled up)
            const ch = 12 + (_tileHash(cx, cy, i + 119) % 8);
            g.rect(px - 2, py - ch, 4, ch);
            g.fill({ color: 0x448833, alpha: 0.55 });
            // Arms
            g.rect(px - 7, py - ch * 0.6, 5, 2);
            g.fill({ color: 0x448833, alpha: 0.5 });
            g.rect(px - 7, py - ch * 0.6 - 6, 2, 7);
            g.fill({ color: 0x448833, alpha: 0.5 });
            g.rect(px + 3, py - ch * 0.4, 5, 2);
            g.fill({ color: 0x448833, alpha: 0.5 });
            g.rect(px + 6, py - ch * 0.4 - 5, 2, 6);
            g.fill({ color: 0x448833, alpha: 0.5 });
          } else {
            // Rocks
            g.ellipse(px, py, 6, 3.5);
            g.fill({ color: 0xaa9977, alpha: 0.5 });
            g.ellipse(px + 1, py - 1, 4.5, 2.5);
            g.fill({ color: 0xbbaa88, alpha: 0.3 });
          }
        }
      }
      break;
    }
    case TerrainType.TUNDRA: {
      // Snow patches filling hex
      for (let i = 0; i < 6; i++) {
        const sx = cx + ((_tileHash(cx, cy, i + 120) % 100) - 50);
        const sy = cy + ((_tileHash(cx, cy, i + 121) % 80) - 40);
        const sw = 8 + (_tileHash(cx, cy, i + 122) % 10);
        const sh = 4 + (_tileHash(cx, cy, i + 123) % 5);
        g.ellipse(sx, sy, sw, sh);
        g.fill({ color: 0xddddee, alpha: 0.25 + (_tileHash(cx, cy, i + 124) % 10) * 0.01 });
      }
      // Bare shrubs
      for (let i = 0; i < 4; i++) {
        if (_hashFloat(cx, cy, i + 130) > 0.4) {
          const bx = cx + (_hashFloat(cx, cy, i * 2 + 131) - 0.5) * 80;
          const by = cy + (_hashFloat(cx, cy, i * 2 + 132) - 0.5) * 60;
          for (let b = 0; b < 3; b++) {
            const angle = (b - 1) * 0.6 + (_hashFloat(cx, cy, i * 3 + b + 133) - 0.5) * 0.4;
            const bh = 8 + (_tileHash(cx, cy, i * 3 + b + 136) % 6);
            g.moveTo(bx, by);
            g.lineTo(bx + Math.sin(angle) * bh, by - Math.cos(angle) * bh);
            g.stroke({ color: 0x665544, width: 1, alpha: 0.5 });
          }
        }
      }
      // Frost lines
      for (let i = 0; i < 4; i++) {
        const fy = cy + (i - 1.5) * s * 0.2;
        g.moveTo(cx - s * 0.4, fy);
        g.lineTo(cx + s * 0.4, fy + 2);
        g.stroke({ color: 0xbbbbcc, width: 0.7, alpha: 0.18 });
      }
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Resource icons — unique shape per resource type
// ---------------------------------------------------------------------------

function _drawResourceIcon(
  g: Graphics,
  resource: string,
  cx: number,
  cy: number,
  color: number,
): void {
  switch (resource) {
    case "gems": {
      // Multi-faceted gem with glow
      // Outer glow
      g.circle(cx, cy, 7);
      g.fill({ color, alpha: 0.15 });
      g.circle(cx, cy, 5);
      g.fill({ color, alpha: 0.12 });
      // Gem body — hexagonal cut
      const r = 4.5;
      for (let layer = 0; layer < 2; layer++) {
        const lr = layer === 0 ? r : r * 0.6;
        const lc = layer === 0 ? color : 0xeeffff;
        const la = layer === 0 ? 0.9 : 0.4;
        g.moveTo(cx, cy - lr);
        g.lineTo(cx + lr * 0.87, cy - lr * 0.5);
        g.lineTo(cx + lr * 0.87, cy + lr * 0.5);
        g.lineTo(cx, cy + lr);
        g.lineTo(cx - lr * 0.87, cy + lr * 0.5);
        g.lineTo(cx - lr * 0.87, cy - lr * 0.5);
        g.closePath();
        g.fill({ color: lc, alpha: la });
      }
      // Facet lines
      g.moveTo(cx, cy - r);
      g.lineTo(cx, cy + r);
      g.stroke({ color: 0xffffff, width: 0.4, alpha: 0.3 });
      g.moveTo(cx - r * 0.87, cy - r * 0.5);
      g.lineTo(cx + r * 0.87, cy + r * 0.5);
      g.stroke({ color: 0xffffff, width: 0.4, alpha: 0.3 });
      // Sparkle
      g.star(cx + 2, cy - 2.5, 4, 1.2, 0.4);
      g.fill({ color: 0xffffff, alpha: 0.7 });
      g.stroke({ color, width: 1, alpha: 0.5 });
      break;
    }
    case "iron": {
      // Ingot / anvil shape
      // Bottom bar
      g.roundRect(cx - 5, cy + 1, 10, 3, 0.5);
      g.fill({ color, alpha: 0.9 });
      // Top bar (narrower)
      g.roundRect(cx - 3.5, cy - 3, 7, 3.5, 0.5);
      g.fill({ color: 0xaabbbb, alpha: 0.85 });
      // Highlight
      g.rect(cx - 2.5, cy - 2.5, 5, 1);
      g.fill({ color: 0xccdddd, alpha: 0.4 });
      g.stroke({ color: 0x556666, width: 0.5, alpha: 0.6 });
      break;
    }
    case "horses": {
      // Horse head silhouette
      // Neck/body
      g.moveTo(cx - 3, cy + 4);
      g.lineTo(cx - 2, cy);
      g.lineTo(cx - 1, cy - 2);
      // Head
      g.lineTo(cx + 1, cy - 4);
      g.lineTo(cx + 3, cy - 4.5);
      // Ear
      g.lineTo(cx + 3.5, cy - 6);
      g.lineTo(cx + 4, cy - 4);
      // Muzzle
      g.lineTo(cx + 5, cy - 3);
      g.lineTo(cx + 4, cy - 1.5);
      g.lineTo(cx + 2, cy - 1);
      // Back down
      g.lineTo(cx + 1, cy + 1);
      g.lineTo(cx + 2, cy + 4);
      g.closePath();
      g.fill({ color, alpha: 0.85 });
      g.stroke({ color: 0x663311, width: 0.5, alpha: 0.5 });
      // Eye dot
      g.circle(cx + 2.5, cy - 3, 0.6);
      g.fill({ color: 0x221100, alpha: 0.8 });
      break;
    }
    case "marble": {
      // Column / pillar
      // Glow
      g.circle(cx, cy, 6);
      g.fill({ color, alpha: 0.08 });
      // Base
      g.roundRect(cx - 4, cy + 2, 8, 2, 0.5);
      g.fill({ color: 0xcccccc, alpha: 0.8 });
      // Shaft
      g.roundRect(cx - 2.5, cy - 4, 5, 6, 0.5);
      g.fill({ color, alpha: 0.85 });
      // Capital (top)
      g.roundRect(cx - 3.5, cy - 5, 7, 1.5, 0.5);
      g.fill({ color: 0xeeeeee, alpha: 0.8 });
      // Fluting lines
      g.moveTo(cx - 1, cy - 3.5);
      g.lineTo(cx - 1, cy + 1.5);
      g.stroke({ color: 0xbbbbbb, width: 0.4, alpha: 0.4 });
      g.moveTo(cx + 1, cy - 3.5);
      g.lineTo(cx + 1, cy + 1.5);
      g.stroke({ color: 0xbbbbbb, width: 0.4, alpha: 0.4 });
      break;
    }
    case "wheat": {
      // Wheat stalks
      for (let i = -1; i <= 1; i++) {
        const sx = cx + i * 3;
        const lean = i * 0.8;
        // Stem
        g.moveTo(sx, cy + 4);
        g.lineTo(sx + lean, cy - 3);
        g.stroke({ color: 0x998822, width: 0.7, alpha: 0.7 });
        // Wheat head (oval at top)
        g.ellipse(sx + lean, cy - 4.5, 1.2, 2.5);
        g.fill({ color, alpha: 0.85 });
        // Grain details
        g.moveTo(sx + lean - 0.8, cy - 5.5);
        g.lineTo(sx + lean - 1.8, cy - 7);
        g.stroke({ color, width: 0.5, alpha: 0.6 });
        g.moveTo(sx + lean + 0.8, cy - 5.5);
        g.lineTo(sx + lean + 1.8, cy - 7);
        g.stroke({ color, width: 0.5, alpha: 0.6 });
      }
      break;
    }
    case "game": {
      // Deer antler / game animal
      // Body oval
      g.ellipse(cx, cy + 1, 4, 2.5);
      g.fill({ color, alpha: 0.8 });
      // Head
      g.circle(cx + 3.5, cy - 1, 1.8);
      g.fill({ color: 0x99bb55, alpha: 0.8 });
      // Antlers
      g.moveTo(cx + 3, cy - 2.5);
      g.lineTo(cx + 1.5, cy - 5);
      g.lineTo(cx + 0.5, cy - 5.5);
      g.stroke({ color: 0x664422, width: 0.7, alpha: 0.7 });
      g.moveTo(cx + 1.5, cy - 5);
      g.lineTo(cx + 2.5, cy - 6);
      g.stroke({ color: 0x664422, width: 0.7, alpha: 0.7 });
      g.moveTo(cx + 4, cy - 2.5);
      g.lineTo(cx + 5.5, cy - 5);
      g.lineTo(cx + 6.5, cy - 5.5);
      g.stroke({ color: 0x664422, width: 0.7, alpha: 0.7 });
      g.moveTo(cx + 5.5, cy - 5);
      g.lineTo(cx + 5, cy - 6);
      g.stroke({ color: 0x664422, width: 0.7, alpha: 0.7 });
      // Legs
      g.moveTo(cx - 2, cy + 3);
      g.lineTo(cx - 2.5, cy + 5);
      g.stroke({ color: 0x667733, width: 0.6, alpha: 0.6 });
      g.moveTo(cx + 2, cy + 3);
      g.lineTo(cx + 2.5, cy + 5);
      g.stroke({ color: 0x667733, width: 0.6, alpha: 0.6 });
      break;
    }
    default: {
      // Fallback diamond
      const rs = 4;
      g.moveTo(cx, cy - rs);
      g.lineTo(cx + rs, cy);
      g.lineTo(cx, cy + rs);
      g.lineTo(cx - rs, cy);
      g.closePath();
      g.fill({ color, alpha: 0.9 });
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.5 });
      break;
    }
  }
}

/** Singleton instance. */
export const worldMapRenderer = new WorldMapRenderer();
