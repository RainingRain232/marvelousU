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
import { DeerRenderer } from "@view/environment/DeerRenderer";
import { FirepitRenderer } from "@view/entities/FirepitRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { EliteBarracksRenderer } from "@view/entities/EliteBarracksRenderer";
import { EliteStableRenderer } from "@view/entities/EliteStableRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";

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
  private _neutralBuildingRenderers: { renderer: { container: Container }; tick: (dt: number) => void }[] = [];

  // Grassland deer
  private _deerContainer = new Container();
  private _deer: { renderer: DeerRenderer; homeX: number; homeY: number }[] = [];

  // Forest creatures (princess & rabbit in large forest clusters)
  private _forestCreatureContainer = new Container();
  private _forestCreatures: {
    gfx: Graphics;
    type: "princess" | "rabbit";
    clusterCenters: HexPixel[];
    currentIdx: number;
    targetX: number;
    targetY: number;
    x: number;
    y: number;
    phase: number;
    waitTimer: number;
  }[] = [];

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
    this._container.addChild(this._deerContainer);
    this._container.addChild(this._forestCreatureContainer);
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
      // Animate grassland deer
      for (const d of this._deer) {
        d.renderer.update(dt);
        // Clamp deer near its home hex
        const dx = d.renderer.container.x - d.homeX;
        const dy = d.renderer.container.y - d.homeY;
        const maxDrift = HEX_SIZE * 1.2;
        if (dx * dx + dy * dy > maxDrift * maxDrift) {
          const ang = Math.atan2(dy, dx);
          d.renderer.container.x = d.homeX + Math.cos(ang) * maxDrift;
          d.renderer.container.y = d.homeY + Math.sin(ang) * maxDrift;
        }
      }
      // Animate forest creatures
      this._tickForestCreatures(dt);
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

  /** Remove and destroy all children of a container. */
  private _destroyChildren(container: Container): void {
    for (const child of container.children) {
      child.destroy();
    }
    container.removeChildren();
  }

  /** Render the entire hex grid. Call once after map generation. */
  drawMap(grid: HexGrid): void {
    this._grid = grid;
    this._destroyChildren(this._hexContainer);
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

    // Place creatures in terrain clusters
    this.drawForestCreatures(grid);

    // Place deer on ~5% of forest tiles
    this._destroyChildren(this._deerContainer);
    this._deer = [];
    const deerScale = (HEX_SIZE / 60) * 0.3;
    for (const tile of grid.allTiles()) {
      if (tile.terrain !== TerrainType.FOREST) continue;
      if (_tileHash(tile.q, tile.r, 777) % 20 !== 0) continue;
      const center = hexToPixel(tile, HEX_SIZE);
      const bounds = { w: HEX_SIZE * 2, h: HEX_SIZE * 2 };
      const deer = new DeerRenderer(center.x, center.y, bounds, tile.q * 1000 + tile.r);
      deer.container.scale.set(deerScale);
      this._deerContainer.addChild(deer.container);
      this._deer.push({ renderer: deer, homeX: center.x, homeY: center.y });
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
    this._destroyChildren(this._highlightContainer);
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
    this._destroyChildren(this._fogContainer);

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
    this._destroyChildren(this._fogContainer);
  }

  /** Draw territory border lines where ownership changes between adjacent hexes. */
  drawBorders(_grid: HexGrid): void {
    this._destroyChildren(this._borderContainer);
  }

  /** Clear territory borders. */
  clearBorders(): void {
    this._destroyChildren(this._borderContainer);
  }

  /** Draw camp icons on the map using firepit animation. Only shows uncleared camps in visible/explored tiles. */
  drawCamps(camps: Iterable<WorldCamp>, localPlayer?: WorldPlayer): void {
    this._destroyChildren(this._campContainer);
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
    this._destroyChildren(this._neutralBuildingContainer);
    this._neutralBuildingRenderers = [];

    const FARM_SCALE = (HEX_SIZE * 2 * 0.7) / 128;
    const MILL_SCALE = (HEX_SIZE * 2 * 0.7) / 128;
    // Tower is 64×64 natively. Use same scale as castle (256×256) to keep proportions.
    const TOWER_SCALE = (HEX_SIZE * 2 * 0.7) / 256;
    const MAGE_TOWER_SCALE = (HEX_SIZE * 2 * 0.7) / 128;
    const BLACKSMITH_SCALE = (HEX_SIZE * 2 * 0.7) / 128;

    for (const building of buildings) {
      // Hide in fog
      if (localPlayer) {
        const key = hexKey(building.position.q, building.position.r);
        if (!localPlayer.exploredTiles.has(key)) continue;
      }

      const center = hexToPixel(building.position, HEX_SIZE);

      const wrapper = new Container();

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
          center.x - 32 * TOWER_SCALE + HEX_SIZE * 0.3,
          center.y - 32 * TOWER_SCALE,
        );
        wrapper.addChild(tr.container);
        this._neutralBuildingRenderers.push({ renderer: tr, tick: (dt) => tr.tick(dt, 0 as any) });
      } else if (building.type === "mage_tower") {
        const mt = new MageTowerRenderer(ownerStr);
        mt.container.scale.set(MAGE_TOWER_SCALE);
        mt.container.position.set(
          center.x - 64 * MAGE_TOWER_SCALE,
          center.y - 64 * MAGE_TOWER_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(mt.container);
        this._neutralBuildingRenderers.push({ renderer: mt, tick: (dt) => mt.tick(dt, 0 as any) });
      } else if (building.type === "blacksmith") {
        const HALF = BLACKSMITH_SCALE * 0.5;
        const bs = new BlacksmithRenderer(ownerStr);
        bs.container.scale.set(HALF);
        bs.container.position.set(
          center.x - 64 * HALF + HEX_SIZE * 0.3,
          center.y - 64 * HALF + HEX_SIZE * 0.1,
        );
        wrapper.addChild(bs.container);
        this._neutralBuildingRenderers.push({ renderer: bs, tick: (dt) => bs.tick(dt, 0 as any) });
      } else if (building.type === "market") {
        const MARKET_SCALE = BLACKSMITH_SCALE * 0.5;
        const mk = new MarketRenderer(ownerStr);
        mk.container.scale.set(MARKET_SCALE);
        mk.container.position.set(
          center.x - 64 * MARKET_SCALE - HEX_SIZE * 0.3,
          center.y - 64 * MARKET_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(mk.container);
        this._neutralBuildingRenderers.push({ renderer: mk, tick: (dt) => mk.tick(dt, 0 as any) });
      } else if (building.type === "temple") {
        const TEMPLE_SCALE = (HEX_SIZE * 2 * 0.7) / 192;
        const tp = new TempleRenderer(ownerStr);
        tp.container.scale.set(TEMPLE_SCALE);
        tp.container.position.set(
          center.x - 64 * TEMPLE_SCALE,
          center.y - 96 * TEMPLE_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(tp.container);
        this._neutralBuildingRenderers.push({ renderer: tp, tick: (dt) => tp.tick(dt, 0 as any) });
      } else if (building.type === "embassy") {
        const HALF = BLACKSMITH_SCALE * 0.5;
        const eb = new EmbassyRenderer(ownerStr);
        eb.container.scale.set(HALF);
        eb.container.position.set(
          center.x - 64 * HALF,
          center.y - 64 * HALF + HEX_SIZE * 0.1,
        );
        wrapper.addChild(eb.container);
        this._neutralBuildingRenderers.push({ renderer: eb, tick: (dt) => eb.tick(dt, 0 as any) });
      } else if (building.type === "faction_hall" || building.type === "elite_hall") {
        const HALF = BLACKSMITH_SCALE * 0.5;
        const Ctor = building.type === "elite_hall" ? EliteHallRenderer : FactionHallRenderer;
        const fh = new Ctor(ownerStr);
        fh.container.scale.set(HALF);
        fh.container.position.set(
          center.x - 64 * HALF - HEX_SIZE * 0.3,
          center.y - 64 * HALF + HEX_SIZE * 0.1,
        );
        wrapper.addChild(fh.container);
        this._neutralBuildingRenderers.push({ renderer: fh, tick: (dt) => fh.tick(dt, 0 as any) });
      } else if (building.type === "stables" || building.type === "elite_stables") {
        const STABLE_SCALE = building.type === "stables" ? (HEX_SIZE * 2 * 0.7) / 192 : BLACKSMITH_SCALE;
        const halfW = building.type === "stables" ? 96 : 64;
        const halfH = building.type === "stables" ? 64 : 64;
        const Ctor = building.type === "elite_stables" ? EliteStableRenderer : StableRenderer;
        const st = new Ctor(ownerStr);
        st.container.scale.set(STABLE_SCALE);
        st.container.position.set(
          center.x - halfW * STABLE_SCALE,
          center.y - halfH * STABLE_SCALE + HEX_SIZE * 0.1,
        );
        wrapper.addChild(st.container);
        this._neutralBuildingRenderers.push({ renderer: st, tick: (dt) => st.tick(dt, 0 as any) });
      } else if (building.type === "barracks" || building.type === "elite_barracks") {
        const Ctor = building.type === "elite_barracks" ? EliteBarracksRenderer : BarracksRenderer;
        const br = new Ctor(ownerStr);
        br.container.scale.set(BLACKSMITH_SCALE * 0.5);
        br.container.position.set(
          center.x - 64 * BLACKSMITH_SCALE * 0.5 - HEX_SIZE * 0.3,
          center.y - 64 * BLACKSMITH_SCALE * 0.5 + HEX_SIZE * 0.1,
        );
        wrapper.addChild(br.container);
        this._neutralBuildingRenderers.push({ renderer: br, tick: (dt) => br.tick(dt, 0 as any) });
      }

      this._neutralBuildingContainer.addChild(wrapper);
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

    const g = new Graphics();

    // Minimal gap-prevention fill (slightly oversized, dark)
    const baseCorners = hexCorners(center, HEX_SIZE + 2);
    g.moveTo(baseCorners[0].x, baseCorners[0].y);
    for (let i = 1; i < baseCorners.length; i++) {
      g.lineTo(baseCorners[i].x, baseCorners[i].y);
    }
    g.closePath();
    g.fill({ color: terrainDef.color });

    // AoW v3 terrain decorations (rich base + decorations + border)
    _drawTerrainDecoration(g, tile.terrain, center);

    // Owner territory tint overlay
    if (tile.owner) {
      const playerIndex = parseInt(tile.owner.replace("p", "")) - 1;
      const ownerColor = PLAYER_COLORS[playerIndex] ?? 0xffffff;
      _fillHexPoly(g, center.x, center.y, HEX_SIZE, ownerColor, 0.12);
    }

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
    // City tiles also draw road connections to neighboring road tiles
    if (tile.cityId) {
      this._drawRoadConnections(g, tile, center);
    }

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

    for (let ni = 0; ni < neighbors.length; ni++) {
      const n = neighbors[ni];
      const nTile = grid.getTile(n.q, n.r);
      if (!nTile) continue;

      const isRoad = nTile.improvement === "road";
      const isCity = !!nTile.cityId;

      if (isRoad || isCity) {
        const nCenter = hexToPixel(n, HEX_SIZE);
        // Roads to cities extend all the way to the city center
        const endX = isCity ? nCenter.x : (center.x + nCenter.x) / 2;
        const endY = isCity ? nCenter.y : (center.y + nCenter.y) / 2;

        // Perpendicular offset for a winding curve, deterministic per tile+direction
        const h = _tileHash(Math.round(center.x), Math.round(center.y), ni + 500);
        const curveAmount = ((h % 200) - 100) / 100 * HEX_SIZE * 0.12;
        const dx = endX - center.x;
        const dy = endY - center.y;
        // Perpendicular direction
        const px = -dy;
        const py = dx;
        const pLen = Math.sqrt(px * px + py * py) || 1;
        const cpx = (center.x + endX) / 2 + (px / pLen) * curveAmount;
        const cpy = (center.y + endY) / 2 + (py / pLen) * curveAmount;

        // Road outline (darker)
        g.moveTo(center.x, center.y);
        g.quadraticCurveTo(cpx, cpy, endX, endY);
        g.stroke({ color: 0x665533, width: HEX_SIZE * 0.08, alpha: 0.7 });

        // Road fill (lighter)
        g.moveTo(center.x, center.y);
        g.quadraticCurveTo(cpx, cpy, endX, endY);
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
  // Forest creatures — princess & rabbit in large forest clusters
  // -----------------------------------------------------------------------

  /** Find forest clusters of 4+ tiles and place a princess & rabbit in each. */
  drawForestCreatures(grid: HexGrid): void {
    this._destroyChildren(this._forestCreatureContainer);
    this._forestCreatures = [];

    const findClusters = (terrainType: TerrainType, minSize: number): HexCoord[][] => {
      const visited = new Set<string>();
      const clusters: HexCoord[][] = [];
      for (const tile of grid.allTiles()) {
        if (tile.terrain !== terrainType) continue;
        const key = hexKey(tile.q, tile.r);
        if (visited.has(key)) continue;
        const cluster: HexCoord[] = [];
        const queue: HexCoord[] = [{ q: tile.q, r: tile.r }];
        visited.add(key);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          cluster.push(cur);
          for (const n of hexNeighbors(cur)) {
            const nk = hexKey(n.q, n.r);
            if (visited.has(nk)) continue;
            const nTile = grid.getTile(n.q, n.r);
            if (!nTile || nTile.terrain !== terrainType) continue;
            visited.add(nk);
            queue.push(n);
          }
        }
        if (cluster.length >= minSize) clusters.push(cluster);
      }
      return clusters;
    };

    const addCreature = (type: "princess" | "rabbit", centers: { x: number; y: number }[], idx: number) => {
      const gfx = new Graphics();
      const start = centers[idx];
      if (type === "princess") this._drawPrincess(gfx, 0, 0);
      else this._drawRabbit(gfx, 0, 0);
      gfx.position.set(start.x, start.y);
      this._forestCreatureContainer.addChild(gfx);
      this._forestCreatures.push({
        gfx, type, clusterCenters: centers, currentIdx: idx,
        targetX: start.x, targetY: start.y, x: start.x, y: start.y,
        phase: Math.random() * Math.PI * 2,
        waitTimer: type === "rabbit" ? 0.5 + Math.random() * 2 : 1 + Math.random() * 3,
      });
    };

    // Forest clusters: 2-3 rabbits each
    for (const cluster of findClusters(TerrainType.FOREST, 4)) {
      const centers = cluster.map((h) => hexToPixel(h, HEX_SIZE));
      const rabbitCount = 2 + ((_tileHash(cluster[0].q, cluster[0].r, 555) % 2));
      for (let i = 0; i < rabbitCount; i++) {
        addCreature("rabbit", centers, Math.min(i, centers.length - 1));
      }
    }

    // Grassland clusters: princess + 1-2 rabbits each
    for (const cluster of findClusters(TerrainType.GRASSLAND, 4)) {
      const centers = cluster.map((h) => hexToPixel(h, HEX_SIZE));
      addCreature("princess", centers, 0);
      const rabbitCount = 1 + ((_tileHash(cluster[0].q, cluster[0].r, 556) % 2));
      for (let i = 0; i < rabbitCount; i++) {
        addCreature("rabbit", centers, Math.min(i + 1, centers.length - 1));
      }
    }
  }

  /** Draw a small princess figure at local coordinates. */
  private _drawPrincess(g: Graphics, x: number, y: number): void {
    const s = HEX_SIZE * 0.018;

    // Skirt (flared with curved hem)
    const waistW = s * 1.2;
    const hemW = s * 3;
    const skirtTop = y - s * 3;
    const skirtBot = y + s * 2;
    g.moveTo(x - waistW, skirtTop);
    g.bezierCurveTo(x - waistW * 1.2, skirtTop + (skirtBot - skirtTop) * 0.5,
                     x - hemW * 0.9, skirtBot - s * 1,
                     x - hemW, skirtBot);
    // Curved hem
    g.quadraticCurveTo(x, skirtBot + s * 0.6, x + hemW, skirtBot);
    g.bezierCurveTo(x + hemW * 0.9, skirtBot - s * 1,
                     x + waistW * 1.2, skirtTop + (skirtBot - skirtTop) * 0.5,
                     x + waistW, skirtTop);
    g.closePath();
    g.fill({ color: 0xdd66aa, alpha: 0.9 });

    // Skirt fold lines
    g.moveTo(x - s * 0.5, skirtTop + s * 0.5);
    g.quadraticCurveTo(x - s * 1, skirtBot - s * 0.5, x - s * 1.8, skirtBot);
    g.stroke({ color: 0xcc5599, width: 0.5, alpha: 0.5 });
    g.moveTo(x + s * 0.5, skirtTop + s * 0.5);
    g.quadraticCurveTo(x + s * 1, skirtBot - s * 0.5, x + s * 1.8, skirtBot);
    g.stroke({ color: 0xcc5599, width: 0.5, alpha: 0.5 });

    // Skirt highlight
    g.moveTo(x + s * 0.3, skirtTop + s * 0.5);
    g.bezierCurveTo(x + s * 1, skirtTop + (skirtBot - skirtTop) * 0.5,
                     x + hemW * 0.6, skirtBot - s * 0.5,
                     x + hemW * 0.8, skirtBot);
    g.lineTo(x + hemW, skirtBot);
    g.bezierCurveTo(x + hemW * 0.9, skirtBot - s * 1,
                     x + waistW * 1.2, skirtTop + (skirtBot - skirtTop) * 0.5,
                     x + waistW, skirtTop);
    g.closePath();
    g.fill({ color: 0xee88cc, alpha: 0.35 });

    // Gold trim at hem
    g.moveTo(x - hemW, skirtBot);
    g.quadraticCurveTo(x, skirtBot + s * 0.6, x + hemW, skirtBot);
    g.stroke({ color: 0xf0c070, width: 0.8, alpha: 0.7 });

    // Bodice
    g.moveTo(x - waistW, skirtTop);
    g.lineTo(x - s * 1.4, y - s * 4.5);
    g.lineTo(x + s * 1.4, y - s * 4.5);
    g.lineTo(x + waistW, skirtTop);
    g.closePath();
    g.fill({ color: 0xcc5599, alpha: 0.9 });
    // Neckline V detail
    g.moveTo(x - s * 0.8, y - s * 4.5);
    g.lineTo(x, y - s * 3.5);
    g.lineTo(x + s * 0.8, y - s * 4.5);
    g.stroke({ color: 0xf0c070, width: 0.5, alpha: 0.6 });

    // Head
    g.circle(x, y - s * 6, s * 1.5);
    g.fill({ color: 0xffddbb });

    // Hair
    g.circle(x, y - s * 7.2, s * 1.8);
    g.fill({ color: 0xffcc44, alpha: 0.85 });
    // Side hair
    g.ellipse(x - s * 1.2, y - s * 5.5, s * 0.6, s * 2);
    g.fill({ color: 0xffcc44, alpha: 0.7 });
    g.ellipse(x + s * 1.2, y - s * 5.5, s * 0.6, s * 2);
    g.fill({ color: 0xffcc44, alpha: 0.7 });

    // Crown (3 small triangles)
    for (let i = -1; i <= 1; i++) {
      g.moveTo(x + i * s * 0.8, y - s * 8.5);
      g.lineTo(x + i * s * 0.8 - s * 0.4, y - s * 7.5);
      g.lineTo(x + i * s * 0.8 + s * 0.4, y - s * 7.5);
      g.closePath();
      g.fill({ color: 0xffdd22 });
    }

    // Eyes
    g.circle(x - s * 0.5, y - s * 6, s * 0.3);
    g.fill({ color: 0x334466 });
    g.circle(x + s * 0.5, y - s * 6, s * 0.3);
    g.fill({ color: 0x334466 });
  }

  /** Draw a small rabbit at local coordinates. */
  private _drawRabbit(g: Graphics, x: number, y: number): void {
    const s = HEX_SIZE * 0.015;

    // Body (oval)
    g.ellipse(x, y - s * 1.5, s * 2, s * 1.5);
    g.fill({ color: 0xddccbb });

    // Head
    g.circle(x + s * 1.8, y - s * 2.5, s * 1.2);
    g.fill({ color: 0xddccbb });

    // Ears (two tall ellipses)
    g.ellipse(x + s * 1.2, y - s * 5.5, s * 0.5, s * 2);
    g.fill({ color: 0xddccbb });
    g.ellipse(x + s * 1.2, y - s * 5.5, s * 0.3, s * 1.5);
    g.fill({ color: 0xeebb99, alpha: 0.6 }); // inner ear
    g.ellipse(x + s * 2.2, y - s * 5, s * 0.5, s * 1.8);
    g.fill({ color: 0xddccbb });
    g.ellipse(x + s * 2.2, y - s * 5, s * 0.3, s * 1.3);
    g.fill({ color: 0xeebb99, alpha: 0.6 });

    // Eye
    g.circle(x + s * 2.2, y - s * 2.7, s * 0.3);
    g.fill({ color: 0x332222 });

    // Nose
    g.circle(x + s * 2.8, y - s * 2.2, s * 0.2);
    g.fill({ color: 0xcc8877 });

    // Tail (small puff)
    g.circle(x - s * 2, y - s * 1.5, s * 0.7);
    g.fill({ color: 0xeeddcc });

    // Front legs
    g.ellipse(x + s * 1, y - s * 0.2, s * 0.3, s * 0.7);
    g.fill({ color: 0xccbbaa });
    // Back legs
    g.ellipse(x - s * 1, y - s * 0.2, s * 0.4, s * 0.8);
    g.fill({ color: 0xccbbaa });
  }

  /** Tick forest creature wandering animation. */
  private _tickForestCreatures(dt: number): void {
    for (const c of this._forestCreatures) {
      c.phase += dt;

      // Wait before picking a new target
      if (c.waitTimer > 0) {
        c.waitTimer -= dt;
        // Idle bobbing
        const bob = Math.sin(c.phase * 2) * 1.5;
        c.gfx.position.set(c.x, c.y + bob);
        continue;
      }

      // Move toward target
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const speed = c.type === "rabbit" ? 25 : 12;

      if (dist < 2) {
        // Arrived — pick a new random target within the same cluster
        c.x = c.targetX;
        c.y = c.targetY;
        c.waitTimer = c.type === "rabbit"
          ? 0.5 + Math.random() * 2
          : 2 + Math.random() * 4;

        // Pick a random hex in the cluster
        const nextIdx = Math.floor(Math.random() * c.clusterCenters.length);
        c.currentIdx = nextIdx;
        const next = c.clusterCenters[nextIdx];
        // Add some offset within the hex so they don't just go to center
        c.targetX = next.x + (Math.random() - 0.5) * HEX_SIZE * 0.5;
        c.targetY = next.y + (Math.random() - 0.5) * HEX_SIZE * 0.4;
      } else {
        // Move
        const step = Math.min(speed * dt, dist);
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;

        // Flip based on movement direction
        c.gfx.scale.x = dx < 0 ? -1 : 1;
      }

      // Bobbing while moving
      const bob = Math.sin(c.phase * (c.type === "rabbit" ? 6 : 3)) * (c.type === "rabbit" ? 2 : 1);
      c.gfx.position.set(c.x, c.y + bob);
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
    this._destroyChildren(this._swordContainer);
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
// Deterministic hash helpers
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

// ---------------------------------------------------------------------------
// AoW-style terrain decorations (rich hex tiles with variants)
// ---------------------------------------------------------------------------

// --- AoW Hex Tile Helpers ---

// Sequential RNG wrapper using indexed hash
class TileRng {
  private _cx: number;
  private _cy: number;
  private _idx = 0;
  constructor(cx: number, cy: number) {
    this._cx = cx;
    this._cy = cy;
  }
  next(): number {
    return _hashFloat(this._cx, this._cy, 9999 + this._idx++);
  }
  nextInt(max: number): number {
    return _tileHash(this._cx, this._cy, 9999 + this._idx++) % max;
  }
}

function _rotatePoint(
  px: number, py: number, cx: number, cy: number, angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function _darken(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (Math.min(r, 255) << 16) | (Math.min(g, 255) << 8) | Math.min(b, 255);
}

function _lighten(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// Draw a filled hex polygon at given size (for gradient simulation)
function _fillHexPoly(
  g: Graphics, cx: number, cy: number, size: number, color: number, alpha: number,
): void {
  const corners = hexCorners({ x: cx, y: cy } as HexPixel, size);
  g.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) g.lineTo(corners[i].x, corners[i].y);
  g.closePath();
  g.fill({ color, alpha });
}

// --- AoW Terrain Base Painting (PixiJS port) ---
// Flat base fill + organic splotches for color variation

function _paintTerrainBase(
  g: Graphics, cx: number, cy: number, terrain: TerrainType, rng: TileRng,
): void {
  switch (terrain) {
    case TerrainType.GRASSLAND:
      _paintGrassBase(g, cx, cy, rng);
      break;
    case TerrainType.FOREST:
      _paintForestBase(g, cx, cy, rng);
      break;
    case TerrainType.PLAINS:
      _paintPlainsBase(g, cx, cy, rng);
      break;
    case TerrainType.HILLS:
      _paintHillsBase(g, cx, cy, rng);
      break;
    case TerrainType.MOUNTAINS:
      _paintMountainBase(g, cx, cy, rng);
      break;
    case TerrainType.WATER:
      _paintWaterBase(g, cx, cy, rng);
      break;
    case TerrainType.DESERT:
      _paintDesertBase(g, cx, cy, rng);
      break;
    case TerrainType.SWAMP:
      _paintSwampBase(g, cx, cy, rng);
      break;
    case TerrainType.TUNDRA:
      _paintTundraBase(g, cx, cy, rng);
      break;
  }
}

function _paintGrassBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x4a9933, 1.0);
  // Organic color splotches
  const splotchColors = [0x327020, 0x55aa3d, 0x62b848, 0x4a9030, 0x3a7a22, 0x68c050, 0x388826];
  for (let i = 0; i < 30; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 50;
    const col = splotchColors[rng.nextInt(splotchColors.length)];
    g.circle(ax, ay, r);
    g.fill({ color: col, alpha: 0.1 + rng.next() * 0.18 });
  }
  // Fine texture
  for (let i = 0; i < 40; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.7;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.7;
    const s = 2 + rng.next() * 5;
    g.rect(ax, ay, s, s * 0.6);
    g.fill({ color: rng.next() < 0.5 ? 0x2a6a1a : 0x6abb50, alpha: 0.04 + rng.next() * 0.04 });
  }
  // Soil patches
  for (let i = 0; i < 8; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.ellipse(ax, ay, 8 + rng.next() * 20, 5 + rng.next() * 14);
    g.fill({ color: rng.next() < 0.5 ? 0x6a5a3a : 0x5a4a2a, alpha: 0.06 + rng.next() * 0.06 });
  }
}

function _paintForestBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x2a5a25, 1.0);
  const splotchColors = [0x142a12, 0x1e4a1a, 0x2a5a25, 0x357a30, 0x1a3a18];
  for (let i = 0; i < 30; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 12 + rng.next() * 45;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.15 + rng.next() * 0.18 });
  }
  // Dappled sunlight
  for (let i = 0; i < 15; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.ellipse(ax, ay, 3 + rng.next() * 12, 2 + rng.next() * 8);
    g.fill({ color: 0x88cc55, alpha: 0.04 + rng.next() * 0.06 });
  }
  // Dark leaf litter
  for (let i = 0; i < 15; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.6;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.6;
    const v = rng.next();
    g.ellipse(ax, ay, 4 + rng.next() * 14, 2 + rng.next() * 8);
    g.fill({ color: v < 0.4 ? 0x2a1a0a : v < 0.7 ? 0x1a2a12 : 0x3a2a18, alpha: 0.06 + rng.next() * 0.06 });
  }
}

function _paintHillsBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x8a7a4a, 1.0);
  const splotchColors = [0x6a5a2a, 0x9a8a5a, 0x8a7a48, 0x7a6a38, 0xa49460];
  for (let i = 0; i < 28; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 40;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.12 + rng.next() * 0.14 });
  }
  for (let i = 0; i < 12; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.ellipse(ax, ay, 8 + rng.next() * 22, 5 + rng.next() * 14);
    g.fill({ color: 0x5a8a3a, alpha: 0.07 + rng.next() * 0.06 });
  }
}

function _paintPlainsBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0xb8a84e, 1.0);
  const splotchColors = [0xd8c870, 0xa89840, 0xc0b058, 0x98883a, 0xb0a048];
  for (let i = 0; i < 28; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 45;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.1 + rng.next() * 0.14 });
  }
  for (let i = 0; i < 10; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.ellipse(ax, ay, 6 + rng.next() * 16, 4 + rng.next() * 10);
    g.fill({ color: 0x8aaa5a, alpha: 0.06 });
  }
}

function _paintMountainBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x6e6e78, 1.0);
  const splotchColors = [0x44444e, 0x7a7a84, 0x5a5a64, 0x8a8a92, 0x626268];
  for (let i = 0; i < 25; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 35;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.12 + rng.next() * 0.12 });
  }
  // Rock grain lines
  for (let i = 0; i < 12; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const w = 12 + rng.next() * 35;
    g.moveTo(ax - w, ay);
    g.lineTo(ax + w, ay + rng.next() * 8 - 4);
    g.stroke({ color: 0x3a3a44, width: 0.8 + rng.next() * 0.8, alpha: 0.08 + rng.next() * 0.06 });
  }
}

function _paintWaterBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x2860a8, 1.0);
  const splotchColors = [0x1e3a70, 0x3060a0, 0x4488cc, 0x205088];
  for (let i = 0; i < 22; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 12 + rng.next() * 45;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.08 + rng.next() * 0.12 });
  }
  // Caustic light patterns
  for (let i = 0; i < 10; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    g.moveTo(ax, ay);
    g.bezierCurveTo(
      ax + rng.next() * 20, ay + rng.next() * 15,
      ax - rng.next() * 15, ay + rng.next() * 20,
      ax + rng.next() * 10 - 5, ay + rng.next() * 10,
    );
    g.stroke({ color: 0x77bbee, width: 1 + rng.next() * 2, alpha: 0.04 });
  }
}

function _paintDesertBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0xd4b866, 1.0);
  const splotchColors = [0xccaa50, 0xe8d080, 0xb89844, 0xd0bc60, 0xc0a848];
  for (let i = 0; i < 28; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 40;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.1 + rng.next() * 0.12 });
  }
  // Heat shimmer
  for (let i = 0; i < 18; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const w = 8 + rng.next() * 20;
    g.moveTo(ax, ay);
    g.quadraticCurveTo(ax + w * 0.5, ay - 2 - rng.next() * 3, ax + w, ay);
    g.stroke({ color: 0xeedd88, width: 0.5, alpha: 0.06 });
  }
}

function _paintSwampBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0x3d5a30, 1.0);
  const splotchColors = [0x1e3a18, 0x3a5a2a, 0x4a6a3a, 0x2a4a22, 0x3e6840];
  for (let i = 0; i < 28; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 40;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.12 + rng.next() * 0.15 });
  }
  // Murky stain patches
  for (let i = 0; i < 10; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.ellipse(ax, ay, 8 + rng.next() * 22, 5 + rng.next() * 14);
    g.fill({ color: rng.next() < 0.5 ? 0x2a2a18 : 0x1a3a20, alpha: 0.08 + rng.next() * 0.06 });
  }
}

function _paintTundraBase(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  _fillHexPoly(g, cx, cy, HEX_SIZE, 0xaabccc, 1.0);
  const splotchColors = [0x99aabb, 0xbbccdd, 0xaabbcc];
  for (let i = 0; i < 22; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.8;
    const r = 10 + rng.next() * 40;
    g.circle(ax, ay, r);
    g.fill({ color: splotchColors[rng.nextInt(splotchColors.length)], alpha: 0.1 + rng.next() * 0.12 });
  }
  // Frost crystals
  for (let i = 0; i < 25; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.5;
    g.circle(ax, ay, 1 + rng.next() * 2);
    g.fill({ color: 0xffffff, alpha: 0.08 + rng.next() * 0.08 });
  }
}
// --- AoW Natural Decoration Functions (PixiJS port) ---

function _drawGrassTufts(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const grassColors = [0x3d8829, 0x55aa3d, 0x4a9930, 0x62b848, 0x358822, 0x48a035];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.55;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.55;
    const h = 8 + rng.next() * 16;
    const w = 4 + rng.next() * 6;
    const blades = 3 + Math.floor(rng.next() * 4);
    const alpha = 0.4 + rng.next() * 0.4;
    const gc = grassColors[rng.nextInt(grassColors.length)];
    for (let b = 0; b < blades; b++) {
      const bOff = (b - (blades - 1) / 2) * (w / blades);
      const tipSway = (rng.next() - 0.5) * w * 1.5;
      g.moveTo(ax + bOff * 0.3, ay);
      g.bezierCurveTo(
        ax + bOff * 0.6, ay - h * 0.3,
        ax + bOff + tipSway * 0.5, ay - h * 0.65,
        ax + tipSway, ay - h,
      );
      g.stroke({ color: _lighten(gc, 0.9 + rng.next() * 0.35), width: 1.0 + rng.next() * 0.8, alpha });
    }
    // Ground shadow
    g.ellipse(ax, ay + 1, w * 0.5, 1.5);
    g.fill({ color: 0x000000, alpha: 0.05 });
  }
}

function _drawScatteredFlowers(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const palettes = [
    [0xff6688, 0xff4466], [0xffaa44, 0xff8822], [0xffee55, 0xddcc33],
    [0xcc88ff, 0xaa66dd], [0xffffff, 0xdddddd], [0xff88aa, 0xdd6688],
  ];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.45;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.45;
    const r = 2.5 + rng.next() * 4;
    const pal = palettes[rng.nextInt(palettes.length)];
    const petals = 4 + Math.floor(rng.next() * 3);
    const alpha = 0.7 + rng.next() * 0.3;
    // Stem
    const stemH = 5 + rng.next() * 10;
    g.moveTo(ax, ay + r);
    g.bezierCurveTo(
      ax + (rng.next() - 0.5) * 3, ay + r + stemH * 0.4,
      ax + (rng.next() - 0.5) * 2, ay + r + stemH * 0.7,
      ax + (rng.next() - 0.5) * 3, ay + r + stemH,
    );
    g.stroke({ color: 0x3a7a22, width: 0.8, alpha: alpha });
    // Petals
    for (let p = 0; p < petals; p++) {
      const pa = (Math.PI * 2 / petals) * p + rng.next() * 0.4;
      const pr = r * (0.55 + rng.next() * 0.15);
      g.ellipse(ax + Math.cos(pa) * pr, ay + Math.sin(pa) * pr, r * 0.5, r * 0.3);
      g.fill({ color: rng.next() < 0.6 ? pal[0] : pal[1], alpha });
    }
    // Center
    g.circle(ax, ay, r * 0.3);
    g.fill({ color: 0xffdd44, alpha });
  }
}

function _drawScatteredRocks(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const rockColors = [0x888888, 0x777772, 0x8a8a80, 0x6e6e68, 0x7a7a74];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const w = 7 + rng.next() * 18;
    const h = 5 + rng.next() * 11;
    const col = rockColors[rng.nextInt(rockColors.length)];
    // Drop shadow
    g.ellipse(ax + 3, ay + 2, w * 1.1, h * 0.4);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Main rock
    g.ellipse(ax, ay, w, h);
    g.fill({ color: col, alpha: 0.7 + rng.next() * 0.25 });
    // Bump highlight
    g.ellipse(ax + w * 0.15 * (rng.next() - 0.5), ay - h * 0.15, w * 0.55, h * 0.65);
    g.fill({ color: _lighten(col, 1.1), alpha: 0.35 });
    // Top highlight
    g.ellipse(ax - w * 0.15, ay - h * 0.3, w * 0.35, h * 0.25);
    g.fill({ color: _lighten(col, 1.5), alpha: 0.18 });
    // Moss spot
    if (rng.next() < 0.3) {
      g.ellipse(ax + (rng.next() - 0.5) * w * 0.4, ay + (rng.next() - 0.5) * h * 0.3, 3 + rng.next() * 4, 2 + rng.next() * 3);
      g.fill({ color: 0x5a8a3a, alpha: 0.25 });
    }
  }
}

function _drawFerns(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const size = 10 + rng.next() * 16;
    const angle = (rng.next() - 0.5) * 0.6;
    const alpha = 0.5 + rng.next() * 0.3;
    const gc = [0x3a8a28, 0x4a9a35, 0x2a7a20][rng.nextInt(3)];
    // Central stem (rotated inline)
    const tipX = ax + Math.sin(angle) * 2;
    const tipY = ay - size;
    const rTip = _rotatePoint(tipX, tipY, ax, ay, angle);
    g.moveTo(ax, ay);
    g.lineTo(rTip.x, rTip.y);
    g.stroke({ color: gc, width: 1.2, alpha });
    // Fronds
    const fronds = 5 + Math.floor(rng.next() * 4);
    for (let f = 0; f < fronds; f++) {
      const fy = -size * (0.15 + f * 0.7 / fronds);
      const fLen = size * (0.3 + 0.2 * (1 - f / fronds)) * (0.8 + rng.next() * 0.4);
      for (const dir of [-1, 1]) {
        const baseY = ay + fy;
        const endX = ax + dir * fLen;
        const endY = baseY + fLen * 0.1;
        const rBase = _rotatePoint(ax, baseY, ax, ay, angle);
        const rEnd = _rotatePoint(endX, endY, ax, ay, angle);
        const cpX = ax + dir * fLen * 0.5;
        const cpY = baseY - fLen * 0.2;
        const rCp = _rotatePoint(cpX, cpY, ax, ay, angle);
        g.moveTo(rBase.x, rBase.y);
        g.quadraticCurveTo(rCp.x, rCp.y, rEnd.x, rEnd.y);
        g.stroke({ color: _lighten(gc, 1 + rng.next() * 0.2), width: 0.8, alpha });
        // Tiny leaflets
        for (let l = 0; l < 3; l++) {
          const t = (l + 1) / 4;
          const lx = ax + dir * fLen * t * 0.8;
          const ly = baseY + (fLen * 0.1 - fLen * 0.2) * t;
          const rL = _rotatePoint(lx, ly, ax, ay, angle);
          g.ellipse(rL.x, rL.y, 2 + rng.next() * 2, 1);
          g.fill({ color: _lighten(gc, 1.1 + rng.next() * 0.2), alpha: 0.3 + rng.next() * 0.2 });
        }
      }
    }
  }
}

function _drawBushes(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const w = 12 + rng.next() * 18;
    const h = 8 + rng.next() * 12;
    const gc = [0x3a7a28, 0x4a8a35, 0x2a6a20, 0x458a30][rng.nextInt(4)];
    // Shadow
    g.ellipse(ax + 2, ay + 2, w * 1.05, h * 0.4);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Main bush blobs
    for (let b = 0; b < 5; b++) {
      const bx = ax + (rng.next() - 0.5) * w * 0.5;
      const by = ay - h * 0.3 + (rng.next() - 0.5) * h * 0.3;
      const br = w * 0.35 + rng.next() * w * 0.25;
      g.ellipse(bx, by, br, br * 0.7);
      g.fill({ color: _lighten(gc, 0.9 + rng.next() * 0.3), alpha: 0.4 + rng.next() * 0.3 });
    }
    // Highlight
    g.ellipse(ax - w * 0.15, ay - h * 0.4, w * 0.35, h * 0.3);
    g.fill({ color: _lighten(gc, 1.4), alpha: 0.15 });
    // Berries
    if (rng.next() < 0.4) {
      const bc = rng.next() < 0.5 ? 0xcc3344 : 0x4444cc;
      for (let b = 0; b < 4 + Math.floor(rng.next() * 5); b++) {
        g.circle(ax + (rng.next() - 0.5) * w * 0.7, ay - h * rng.next() * 0.5, 1.5 + rng.next());
        g.fill({ color: bc, alpha: 0.6 + rng.next() * 0.3 });
      }
    }
  }
}

function _drawStumps(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const w = 5 + rng.next() * 6;
    const h = 6 + rng.next() * 8;
    // Shadow
    g.ellipse(ax + 2, ay + 1, w * 1.2, 3);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Stump body
    g.rect(ax - w / 2, ay - h, w, h);
    g.fill({ color: 0x5a3a1a });
    // Bark texture
    g.rect(ax - w / 2, ay - h, w * 0.3, h);
    g.fill({ color: 0x4a2a12, alpha: 0.4 });
    // Top ring
    g.ellipse(ax, ay - h, w / 2 + 1, 3);
    g.fill({ color: 0x7a5a3a });
    // Ring detail
    g.ellipse(ax, ay - h, w / 2 - 1, 2);
    g.stroke({ color: 0x6a4a2a, width: 0.5, alpha: 0.5 });
    // Moss
    if (rng.next() < 0.5) {
      g.ellipse(ax - w * 0.2, ay - h * 0.3, w * 0.4, h * 0.2);
      g.fill({ color: 0x4a8a2a, alpha: 0.35 });
    }
  }
}

function _drawFallenLogs(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.0;
    const len = 25 + rng.next() * 40;
    const thick = 4 + rng.next() * 4;
    const angle = (rng.next() - 0.5) * 0.8;
    const cosA = Math.cos(angle);
    // Shadow
    g.ellipse(ax + 2, ay + 2, len / 2, thick * 0.6);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // Log body (rotated ellipse approximated as non-rotated for simplicity)
    g.ellipse(ax, ay, len / 2, thick);
    g.fill({ color: 0x5a3a1a });
    // Bark highlight
    g.ellipse(ax - len * 0.1 * cosA, ay - thick * 0.3, len * 0.35, thick * 0.4);
    g.fill({ color: 0x6a4a2a, alpha: 0.4 });
    // Moss
    if (rng.next() < 0.6) {
      g.ellipse(ax + (rng.next() - 0.5) * len * 0.4, ay - thick * 0.2, 6 + rng.next() * 8, 3 + rng.next() * 4);
      g.fill({ color: 0x4a8a2a, alpha: 0.3 });
    }
  }
}

function _drawWheatField(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const stalkColors = [0xc8a844, 0xd4b855, 0xb89838, 0xc0a840];
  for (let i = 0; i < 35; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const h = 14 + rng.next() * 20;
    const sway = (rng.next() - 0.5) * 6;
    const alpha = 0.4 + rng.next() * 0.35;
    g.moveTo(ax, ay);
    g.bezierCurveTo(ax + sway * 0.3, ay - h * 0.3, ax + sway * 0.7, ay - h * 0.65, ax + sway, ay - h);
    g.stroke({ color: stalkColors[rng.nextInt(stalkColors.length)], width: 0.8 + rng.next() * 0.6, alpha });
    // Wheat head
    g.ellipse(ax + sway, ay - h - 2, 1.5 + rng.next(), 4 + rng.next() * 3);
    g.fill({ color: 0xd8c060, alpha });
  }
}
// --- AoW Trees (PixiJS port) ---

function _drawTreeAoW(
  g: Graphics, x: number, y: number, rng: TileRng, type: string, scale: number,
): void {
  const sc = scale;
  if (type === "pine") {
    const trunkH = (18 + rng.next() * 14) * sc;
    const trunkW = (3 + rng.next() * 2) * sc;
    // Ground shadow
    g.ellipse(x + 3 * sc, y + 2, trunkW * 2.5, 4 * sc);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Trunk
    g.moveTo(x - trunkW * 0.6, y);
    g.bezierCurveTo(x - trunkW * 0.45, y - trunkH * 0.5, x - trunkW * 0.5, y - trunkH * 0.9, x - trunkW * 0.2, y - trunkH);
    g.lineTo(x + trunkW * 0.2, y - trunkH);
    g.bezierCurveTo(x + trunkW * 0.5, y - trunkH * 0.85, x + trunkW * 0.4, y - trunkH * 0.4, x + trunkW * 0.6, y);
    g.closePath();
    g.fill({ color: 0x5a3a1a });
    // Bark shadow
    g.rect(x + trunkW * 0.1, y - trunkH, trunkW * 0.25, trunkH);
    g.fill({ color: 0x4a2a12, alpha: 0.35 });
    // Layers
    const layers = 3 + (rng.next() < 0.4 ? 1 : 0);
    for (let l = 0; l < layers; l++) {
      const lw = (18 + (layers - l) * 12 + rng.next() * 8) * sc;
      const lh = (16 + rng.next() * 10) * sc;
      const ly = y - trunkH - l * (14 * sc) + 5 * sc;
      const gc = [0x1a5520, 0x2a6628, 0x1a4a1e, 0x226622, 0x1e5e22][rng.nextInt(5)];
      // Shadow
      g.moveTo(x, ly - lh);
      g.lineTo(x - lw / 2 + 3, ly + 3);
      g.lineTo(x + lw / 2 + 3, ly + 3);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.06 });
      // Main triangle
      g.moveTo(x, ly - lh);
      g.lineTo(x - lw / 2, ly);
      g.lineTo(x + lw / 2, ly);
      g.closePath();
      g.fill({ color: gc });
      // Right shadow face
      g.moveTo(x, ly - lh);
      g.lineTo(x + lw * 0.1, ly);
      g.lineTo(x + lw / 2, ly);
      g.closePath();
      g.fill({ color: _darken(gc, 0.7), alpha: 0.25 });
      // Highlight face
      g.moveTo(x, ly - lh);
      g.lineTo(x - lw * 0.4, ly - lh * 0.1);
      g.lineTo(x - lw * 0.2, ly - lh * 0.45);
      g.closePath();
      g.fill({ color: _lighten(gc, 1.5), alpha: 0.12 });
    }
  } else if (type === "dark") {
    const trunkH = (20 + rng.next() * 16) * sc;
    const trunkW = (4 + rng.next() * 3) * sc;
    g.ellipse(x + 3, y + 2, trunkW * 3, 5 * sc);
    g.fill({ color: 0x000000, alpha: 0.12 });
    // Gnarled trunk
    g.moveTo(x - trunkW * 0.8, y);
    g.bezierCurveTo(x - trunkW * 0.6, y - trunkH * 0.2, x - trunkW, y - trunkH * 0.5, x - trunkW * 0.3, y - trunkH);
    g.lineTo(x + trunkW * 0.3, y - trunkH);
    g.bezierCurveTo(x + trunkW * 0.8, y - trunkH * 0.4, x + trunkW * 0.5, y - trunkH * 0.2, x + trunkW * 0.8, y);
    g.closePath();
    g.fill({ color: 0x2a1a0a });
    // Branches
    for (let b = 0; b < 3; b++) {
      const by = y - trunkH * (0.4 + b * 0.2);
      const bdir = b % 2 === 0 ? -1 : 1;
      const blen = (10 + rng.next() * 15) * sc;
      g.moveTo(x, by);
      g.quadraticCurveTo(x + bdir * blen * 0.5, by - blen * 0.3, x + bdir * blen, by - blen * 0.1 + rng.next() * blen * 0.3);
      g.stroke({ color: 0x2a1a0a, width: 1.5 + rng.next(), alpha: 0.7 });
    }
    // Canopy
    const canopyR = (20 + rng.next() * 16) * sc;
    const ty = y - trunkH - canopyR * 0.35;
    const darkFoliage = [0x142a10, 0x1a3218, 0x1e3a1a, 0x102810];
    for (let b = 0; b < 7; b++) {
      const ba = rng.next() * Math.PI * 2;
      const bd = canopyR * 0.4 * rng.next();
      const br = canopyR * (0.35 + rng.next() * 0.35);
      g.circle(x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, br);
      g.fill({ color: darkFoliage[rng.nextInt(darkFoliage.length)], alpha: 0.5 + rng.next() * 0.3 });
    }
    // Eerie glow
    for (let b = 0; b < 3; b++) {
      const ba = rng.next() * Math.PI * 2;
      const bd = canopyR * 0.3 * rng.next();
      g.circle(x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, 3 + rng.next() * 5);
      g.fill({ color: 0x66ff44, alpha: 0.06 });
    }
    // Exposed roots
    for (let r = 0; r < 3; r++) {
      const rx = x + (rng.next() - 0.5) * trunkW * 3;
      const ry = y + 2 + rng.next() * 6;
      g.moveTo(x + (rng.next() - 0.5) * trunkW * 0.5, y);
      g.quadraticCurveTo(rx * 0.5 + x * 0.5, ry + 3, rx, ry);
      g.stroke({ color: 0x2a1a0a, width: 1.2 + rng.next(), alpha: 0.5 });
    }
  } else if (type === "willow") {
    const trunkH = (22 + rng.next() * 14) * sc;
    const trunkW = (4 + rng.next() * 3) * sc;
    g.ellipse(x + 3, y + 2, trunkW * 3.5, 6 * sc);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Trunk
    g.moveTo(x - trunkW * 0.7, y);
    g.bezierCurveTo(x - trunkW * 0.5, y - trunkH * 0.4, x - trunkW * 0.6, y - trunkH * 0.8, x - trunkW * 0.2, y - trunkH);
    g.lineTo(x + trunkW * 0.2, y - trunkH);
    g.bezierCurveTo(x + trunkW * 0.6, y - trunkH * 0.7, x + trunkW * 0.4, y - trunkH * 0.3, x + trunkW * 0.7, y);
    g.closePath();
    g.fill({ color: 0x5a4a2a });
    // Drooping strands
    const canopyTop = y - trunkH - 8 * sc;
    const strandCount = 10 + Math.floor(rng.next() * 6);
    const willowColors = [0x4a8a28, 0x5a9a35, 0x3a7a20, 0x55a830];
    for (let s = 0; s < strandCount; s++) {
      const sa = (Math.PI * 2 * s / strandCount) + rng.next() * 0.3;
      const sreach = (18 + rng.next() * 14) * sc;
      const sdrop = (20 + rng.next() * 20) * sc;
      const sx = x + Math.cos(sa) * sreach;
      const sy = canopyTop + Math.sin(sa) * sreach * 0.4;
      const gc = willowColors[rng.nextInt(willowColors.length)];
      g.moveTo(sx, sy);
      g.bezierCurveTo(
        sx + (rng.next() - 0.5) * 8, sy + sdrop * 0.3,
        sx + (rng.next() - 0.5) * 10, sy + sdrop * 0.6,
        sx + (rng.next() - 0.5) * 12, sy + sdrop,
      );
      g.stroke({ color: gc, width: 0.8 + rng.next() * 0.8, alpha: 0.4 + rng.next() * 0.3 });
    }
    // Central canopy mass
    g.ellipse(x, canopyTop + 5 * sc, 16 * sc, 10 * sc);
    g.fill({ color: 0x3a7a22, alpha: 0.5 });
  } else if (type === "birch") {
    const trunkH = (20 + rng.next() * 14) * sc;
    const trunkW = (2.5 + rng.next() * 1.5) * sc;
    g.ellipse(x + 3, y + 2, trunkW * 2.5, 4 * sc);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // White bark trunk
    g.moveTo(x - trunkW * 0.5, y);
    g.lineTo(x - trunkW * 0.4, y - trunkH);
    g.lineTo(x + trunkW * 0.4, y - trunkH);
    g.lineTo(x + trunkW * 0.5, y);
    g.closePath();
    g.fill({ color: 0xe8e0d0 });
    // Black bark marks
    for (let m = 0; m < 5; m++) {
      const my = y - trunkH * (0.1 + m * 0.18) + rng.next() * trunkH * 0.05;
      const mw = trunkW * (0.3 + rng.next() * 0.5);
      g.rect(x - mw / 2, my, mw, 1.5 + rng.next());
      g.fill({ color: 0x2a2a2a, alpha: 0.25 + rng.next() * 0.2 });
    }
    // Delicate canopy
    const canopyR = (14 + rng.next() * 10) * sc;
    const ty = y - trunkH - canopyR * 0.5;
    for (let b = 0; b < 8; b++) {
      const ba = rng.next() * Math.PI * 2;
      const bd = canopyR * 0.4 * rng.next();
      const br = canopyR * (0.35 + rng.next() * 0.3);
      g.circle(x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, br);
      g.fill({ color: rng.next() < 0.5 ? 0x6aaa48 : 0x7abb55, alpha: 0.25 + rng.next() * 0.2 });
    }
  } else if (type === "autumn") {
    const trunkH = (16 + rng.next() * 12) * sc;
    const trunkW = (3.5 + rng.next() * 2.5) * sc;
    const canopyR = (18 + rng.next() * 14) * sc;
    const ty = y - trunkH - canopyR * 0.5;
    g.ellipse(x + 4 * sc, y + 2, canopyR * 1.1, 6 * sc);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Trunk
    g.moveTo(x - trunkW * 0.6, y);
    g.bezierCurveTo(x - trunkW * 0.4, y - trunkH * 0.5, x - trunkW * 0.5, y - trunkH * 0.8, x - trunkW * 0.15, y - trunkH);
    g.lineTo(x + trunkW * 0.15, y - trunkH);
    g.bezierCurveTo(x + trunkW * 0.5, y - trunkH * 0.7, x + trunkW * 0.35, y - trunkH * 0.4, x + trunkW * 0.6, y);
    g.closePath();
    g.fill({ color: 0x5a3a1a });
    // Autumn canopy
    const autumnColors = [0xcc4422, 0xdd6633, 0xeeaa33, 0xcc7722, 0xbb3318, 0xdd8844, 0xffbb44, 0xcc5533];
    for (let b = 0; b < 10; b++) {
      const ba = rng.next() * Math.PI * 2;
      const bd = canopyR * 0.35 * rng.next();
      const br = canopyR * (0.4 + rng.next() * 0.35);
      g.circle(x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, br);
      g.fill({ color: autumnColors[rng.nextInt(autumnColors.length)], alpha: 0.25 + rng.next() * 0.25 });
    }
    // Edge bumps
    for (let b = 0; b < 8; b++) {
      const la = rng.next() * Math.PI * 2;
      const lr = canopyR * (0.75 + rng.next() * 0.3);
      g.circle(x + Math.cos(la) * lr, ty + Math.sin(la) * lr, 3 + rng.next() * 5);
      g.fill({ color: autumnColors[rng.nextInt(autumnColors.length)], alpha: 0.3 + rng.next() * 0.2 });
    }
    // Falling leaves
    for (let l = 0; l < 3; l++) {
      const lx = x + (rng.next() - 0.5) * canopyR * 2;
      const ly = ty + canopyR * 0.5 + rng.next() * canopyR * 1.5;
      g.ellipse(lx, ly, 2 + rng.next() * 2, 1 + rng.next());
      g.fill({ color: autumnColors[rng.nextInt(autumnColors.length)], alpha: 0.35 + rng.next() * 0.25 });
    }
  } else {
    // Deciduous
    const trunkH = (16 + rng.next() * 14) * sc;
    const trunkW = (3.5 + rng.next() * 2.5) * sc;
    const canopyR = (18 + rng.next() * 15) * sc;
    const ty = y - trunkH - canopyR * 0.5;
    g.ellipse(x + 4 * sc, y + 2, canopyR * 1.1, 6 * sc);
    g.fill({ color: 0x000000, alpha: 0.1 });
    // Trunk
    g.moveTo(x - trunkW * 0.6, y);
    g.bezierCurveTo(x - trunkW * 0.4, y - trunkH * 0.5, x - trunkW * 0.5, y - trunkH * 0.8, x - trunkW * 0.15, y - trunkH);
    g.lineTo(x + trunkW * 0.15, y - trunkH);
    g.bezierCurveTo(x + trunkW * 0.5, y - trunkH * 0.7, x + trunkW * 0.35, y - trunkH * 0.4, x + trunkW * 0.6, y);
    g.closePath();
    g.fill({ color: 0x6b4a2a });
    // Shadow
    g.circle(x + 3 * sc, ty + 4 * sc, canopyR * 1.05);
    g.fill({ color: 0x0a1a08, alpha: 0.15 });
    const gc = [0x3a8a2e, 0x4a9a38, 0x55a844, 0x408a32, 0x358828, 0x4aa040][rng.nextInt(6)];
    // Blobs
    const blobs = 7 + Math.floor(rng.next() * 5);
    for (let b = 0; b < blobs; b++) {
      const ba = rng.next() * Math.PI * 2;
      const bd = canopyR * 0.35 * rng.next();
      const br = canopyR * (0.45 + rng.next() * 0.4);
      g.circle(x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, br);
      g.fill({ color: _lighten(gc, 0.85 + rng.next() * 0.4), alpha: 0.25 + rng.next() * 0.2 });
    }
    // Solid core
    g.circle(x, ty, canopyR * 0.8);
    g.fill({ color: gc, alpha: 0.6 });
    // Highlight
    for (let b = 0; b < 3; b++) {
      const lx = x - canopyR * (0.1 + rng.next() * 0.35);
      const ly = ty - canopyR * (0.1 + rng.next() * 0.35);
      g.circle(lx, ly, canopyR * (0.18 + rng.next() * 0.2));
      g.fill({ color: _lighten(gc, 1.3 + rng.next() * 0.3), alpha: 0.15 + rng.next() * 0.1 });
    }
    // Edge bumps
    for (let b = 0; b < 8; b++) {
      const la = rng.next() * Math.PI * 2;
      const lr = canopyR * (0.75 + rng.next() * 0.3);
      g.circle(x + Math.cos(la) * lr, ty + Math.sin(la) * lr, 3 + rng.next() * 6);
      g.fill({ color: _lighten(gc, 1 + rng.next() * 0.25), alpha: 0.3 + rng.next() * 0.2 });
    }
  }
}

function _drawScatteredTrees(
  g: Graphics, cx: number, cy: number, rng: TileRng, count: number, type?: string,
): void {
  const trees: { x: number; y: number; type: string; scale: number }[] = [];
  const defaultTypes = ["deciduous", "deciduous", "pine", "birch", "deciduous"];
  for (let i = 0; i < count; i++) {
    trees.push({
      x: cx + (rng.next() - 0.5) * HEX_SIZE * 1.35,
      y: cy + (rng.next() - 0.5) * HEX_SIZE * 1.2,
      type: type || defaultTypes[rng.nextInt(defaultTypes.length)],
      scale: 0.75 + rng.next() * 0.55,
    });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) _drawTreeAoW(g, t.x, t.y, rng, t.type, t.scale);
}
// --- AoW Fantasy & Atmospheric Elements (PixiJS port) ---

function _drawStandingStones(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const stones: { x: number; y: number; w: number; h: number; lean: number }[] = [];
  for (let i = 0; i < count; i++) {
    stones.push({
      x: cx + (rng.next() - 0.5) * HEX_SIZE * 1.1,
      y: cy + (rng.next() - 0.5) * HEX_SIZE * 0.9,
      w: 6 + rng.next() * 8,
      h: 18 + rng.next() * 25,
      lean: (rng.next() - 0.5) * 0.15,
    });
  }
  stones.sort((a, b) => a.y - b.y);
  for (const s of stones) {
    // Shadow
    g.ellipse(s.x + 3, s.y + 2, s.w * 1.2, 3);
    g.fill({ color: 0x000000, alpha: 0.12 });
    // Stone body — tapered shape using bezier
    g.moveTo(s.x - s.w / 2, s.y);
    g.bezierCurveTo(s.x - s.w / 2 - 1, s.y - s.h * 0.3, s.x - s.w * 0.4, s.y - s.h * 0.8, s.x - s.w * 0.15, s.y - s.h);
    g.bezierCurveTo(s.x, s.y - s.h * 1.05, s.x + s.w * 0.15, s.y - s.h, s.x + s.w * 0.3, s.y - s.h * 0.9);
    g.bezierCurveTo(s.x + s.w / 2, s.y - s.h * 0.7, s.x + s.w / 2 + 1, s.y - s.h * 0.3, s.x + s.w / 2, s.y);
    g.closePath();
    g.fill({ color: 0x7a7a82 });
    // Light side
    g.moveTo(s.x - s.w / 2, s.y);
    g.bezierCurveTo(s.x - s.w / 2 - 1, s.y - s.h * 0.3, s.x - s.w * 0.4, s.y - s.h * 0.8, s.x - s.w * 0.15, s.y - s.h);
    g.lineTo(s.x, s.y - s.h * 0.95);
    g.lineTo(s.x, s.y);
    g.closePath();
    g.fill({ color: 0x9090a0, alpha: 0.35 });
    // Rune carvings
    if (rng.next() < 0.6) {
      const ry = s.y - s.h * (0.3 + rng.next() * 0.4);
      g.moveTo(s.x - s.w * 0.2, ry);
      g.lineTo(s.x, ry - s.h * 0.12);
      g.lineTo(s.x + s.w * 0.2, ry);
      g.stroke({ color: 0x5a5a68, width: 1, alpha: 0.4 });
      g.moveTo(s.x, ry - s.h * 0.12);
      g.lineTo(s.x, ry + s.h * 0.08);
      g.stroke({ color: 0x5a5a68, width: 1, alpha: 0.4 });
      // Faint glow
      g.circle(s.x, ry - s.h * 0.02, s.w * 0.4);
      g.fill({ color: 0x88aaff, alpha: 0.05 });
    }
    // Lichen
    g.ellipse(s.x - s.w * 0.1, s.y - s.h * 0.15, s.w * 0.3, s.h * 0.08);
    g.fill({ color: 0x6a8a4a, alpha: 0.25 });
  }
}

function _drawFairyRing(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const ringR = 20 + rng.next() * 25;
  const mushCount = 6 + Math.floor(rng.next() * 5);
  // Magical ring
  g.circle(cx, cy, ringR);
  g.stroke({ color: 0x88cc88, width: 8, alpha: 0.04 });
  g.circle(cx, cy, ringR);
  g.stroke({ color: 0xaaffaa, width: 3, alpha: 0.06 });
  // Darker grass inside
  g.circle(cx, cy, ringR - 2);
  g.fill({ color: 0x2a6a1a, alpha: 0.08 });
  // Mushrooms
  for (let i = 0; i < mushCount; i++) {
    const a = (Math.PI * 2 / mushCount) * i + rng.next() * 0.3;
    const mx = cx + Math.cos(a) * (ringR + (rng.next() - 0.5) * 6);
    const my = cy + Math.sin(a) * (ringR + (rng.next() - 0.5) * 6);
    const ms = 2 + rng.next() * 3;
    // Stem
    g.rect(mx - 0.8, my - ms * 1.8, 1.6, ms * 1.8);
    g.fill({ color: 0xddccaa, alpha: 0.7 });
    // Cap (half circle approximated with ellipse)
    g.ellipse(mx, my - ms * 1.8, ms * 1.3, ms * 0.8);
    const mc = rng.next() < 0.4 ? 0xcc4444 : rng.next() < 0.7 ? 0xffaa44 : 0xeedd88;
    g.fill({ color: mc, alpha: 0.7 });
    // Spots on red caps
    if (mc === 0xcc4444) {
      for (let s = 0; s < 2; s++) {
        g.circle(mx + (rng.next() - 0.5) * ms, my - ms * 2 + rng.next() * ms * 0.3, ms * 0.2);
        g.fill({ color: 0xffffff, alpha: 0.5 });
      }
    }
  }
  // Sparkle particles
  for (let i = 0; i < 6; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = rng.next() * ringR * 0.8;
    g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + rng.next());
    g.fill({ color: 0xaaffaa, alpha: 0.15 + rng.next() * 0.15 });
  }
}

function _drawGlowingMushrooms(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const ms = 3 + rng.next() * 5;
    const glowCol = rng.next() < 0.5 ? 0x44ddff : 0x88ff88;
    // Glow rings
    g.circle(ax, ay - ms * 1.5, ms * 3);
    g.fill({ color: glowCol, alpha: 0.04 });
    g.circle(ax, ay - ms * 1.5, ms * 1.8);
    g.fill({ color: glowCol, alpha: 0.06 });
    // Stem
    g.rect(ax - 1, ay - ms * 2, 2, ms * 2);
    g.fill({ color: 0xaaccaa, alpha: 0.7 });
    // Cap
    g.ellipse(ax, ay - ms * 2, ms * 1.5, ms);
    g.fill({ color: glowCol, alpha: 0.6 });
    // Cap highlight
    g.ellipse(ax - ms * 0.3, ay - ms * 2.2, ms * 0.5, ms * 0.3);
    g.fill({ color: _lighten(glowCol, 1.5), alpha: 0.3 });
  }
}

function _drawCrystalFormation(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const ox = cx + (rng.next() - 0.5) * HEX_SIZE * 0.5;
  const oy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.4;
  const crystalCol = rng.next() < 0.3 ? 0x88aaff : rng.next() < 0.6 ? 0xaa66ff : 0x66ffcc;
  const crystals = 3 + Math.floor(rng.next() * 4);
  // Base rock
  g.ellipse(ox, oy + 3, 15 + rng.next() * 10, 6 + rng.next() * 4);
  g.fill({ color: 0x5a5a64, alpha: 0.6 });
  // Glow
  g.circle(ox, oy - 8, 25);
  g.fill({ color: crystalCol, alpha: 0.04 });
  for (let i = 0; i < crystals; i++) {
    const cx2 = ox + (rng.next() - 0.5) * 18;
    const ch = 12 + rng.next() * 22;
    const cw = 3 + rng.next() * 4;
    // Crystal body
    g.moveTo(cx2 - cw / 2, oy);
    g.lineTo(cx2 - cw * 0.3, oy - ch * 0.8);
    g.lineTo(cx2, oy - ch);
    g.lineTo(cx2 + cw * 0.3, oy - ch * 0.8);
    g.lineTo(cx2 + cw / 2, oy);
    g.closePath();
    g.fill({ color: crystalCol, alpha: 0.5 + rng.next() * 0.2 });
    // Light face
    g.moveTo(cx2 - cw / 2, oy);
    g.lineTo(cx2 - cw * 0.3, oy - ch * 0.8);
    g.lineTo(cx2, oy - ch);
    g.lineTo(cx2, oy);
    g.closePath();
    g.fill({ color: _lighten(crystalCol, 1.4), alpha: 0.25 });
    // Edge highlight
    g.moveTo(cx2, oy - ch);
    g.lineTo(cx2 + cw * 0.3, oy - ch * 0.8);
    g.stroke({ color: _lighten(crystalCol, 1.8), width: 0.8, alpha: 0.4 });
  }
}

function _drawAncientRuins(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const ox = cx + (rng.next() - 0.5) * HEX_SIZE * 0.4;
  const oy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.3;
  const segments = 2 + Math.floor(rng.next() * 3);
  for (let i = 0; i < segments; i++) {
    const sx = ox + (rng.next() - 0.5) * 40;
    const sy = oy + (rng.next() - 0.5) * 20;
    const sw = 8 + rng.next() * 15;
    const sh = 12 + rng.next() * 20;
    // Shadow
    g.ellipse(sx + 2, sy + 2, sw * 0.8, 3);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // Jagged wall
    g.moveTo(sx - sw / 2, sy);
    g.lineTo(sx - sw / 2, sy - sh * 0.7);
    g.lineTo(sx - sw * 0.2, sy - sh);
    g.lineTo(sx, sy - sh * 0.85);
    g.lineTo(sx + sw * 0.2, sy - sh * 0.95);
    g.lineTo(sx + sw / 2, sy - sh * 0.6);
    g.lineTo(sx + sw / 2, sy);
    g.closePath();
    g.fill({ color: 0x8a8a7a, alpha: 0.7 });
    // Stone lines
    for (let r = 0; r < 3; r++) {
      const ry = sy - sh * (0.15 + r * 0.25);
      g.moveTo(sx - sw / 2 + 1, ry);
      g.lineTo(sx + sw / 2 - 1, ry);
      g.stroke({ color: 0x7a7a6a, width: 0.5, alpha: 0.3 });
    }
    // Vine/moss
    if (rng.next() < 0.6) {
      g.ellipse(sx + (rng.next() - 0.5) * sw * 0.3, sy - sh * 0.5, sw * 0.25, sh * 0.15);
      g.fill({ color: 0x4a8a2a, alpha: 0.3 });
    }
  }
  // Fallen column
  if (rng.next() < 0.5) {
    const fx = ox + (rng.next() - 0.5) * 30;
    const fy = oy + 5 + rng.next() * 10;
    const flen = 20 + rng.next() * 25;
    g.ellipse(fx, fy, flen / 2, 4);
    g.fill({ color: 0x9a9a8a, alpha: 0.55 });
    // Column rings
    g.ellipse(fx - flen * 0.3, fy, 4, 4);
    g.stroke({ color: 0x8a8a7a, width: 0.6, alpha: 0.3 });
    g.ellipse(fx + flen * 0.3, fy, 4, 4);
    g.stroke({ color: 0x8a8a7a, width: 0.6, alpha: 0.3 });
  }
}

function _drawButterflies(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const colors = [0xffaa44, 0xff6688, 0x88ccff, 0xffee55, 0xcc88ff, 0xffffff];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.0;
    const col = colors[rng.nextInt(colors.length)];
    const wingW = 3 + rng.next() * 3;
    const wingH = 2 + rng.next() * 2;
    const alpha = 0.5 + rng.next() * 0.3;
    // Left wing
    g.ellipse(ax - wingW * 0.5, ay, wingW, wingH);
    g.fill({ color: col, alpha });
    // Right wing
    g.ellipse(ax + wingW * 0.5, ay, wingW, wingH);
    g.fill({ color: col, alpha });
    // Body
    g.rect(ax - 0.5, ay - wingH * 0.3, 1, wingH * 0.6);
    g.fill({ color: 0x222222, alpha: 0.5 });
  }
}

function _drawFireflies(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    // Outer glow
    g.circle(ax, ay, 6 + rng.next() * 4);
    g.fill({ color: 0xaaff44, alpha: 0.06 + rng.next() * 0.04 });
    // Inner glow
    g.circle(ax, ay, 2 + rng.next() * 2);
    g.fill({ color: 0xddff88, alpha: 0.15 + rng.next() * 0.15 });
    // Core
    g.circle(ax, ay, 1 + rng.next());
    g.fill({ color: 0xffffcc, alpha: 0.4 + rng.next() * 0.3 });
  }
}

function _drawLightRays(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const rays = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < rays; i++) {
    const rx = cx + (rng.next() - 0.5) * HEX_SIZE * 0.8;
    const ry = cy - HEX_SIZE * 0.5;
    const rw = 15 + rng.next() * 25;
    const rh = HEX_SIZE * 1.2;
    // Trapezoid light shaft
    g.moveTo(rx - rw / 2, ry);
    g.lineTo(rx - rw * 0.8, ry + rh);
    g.lineTo(rx + rw * 0.8, ry + rh);
    g.lineTo(rx + rw / 2, ry);
    g.closePath();
    g.fill({ color: 0xffffc8, alpha: 0.03 });
  }
  // Dust motes
  for (let i = 0; i < 6; i++) {
    const dx = cx + (rng.next() - 0.5) * HEX_SIZE * 0.8;
    const dy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.8;
    g.circle(dx, dy, 0.8 + rng.next());
    g.fill({ color: 0xffffcc, alpha: 0.12 + rng.next() * 0.1 });
  }
}

function _drawMistLayer(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  for (let i = 0; i < 5; i++) {
    const fx = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const fy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.6 + HEX_SIZE * 0.2;
    const fw = 30 + rng.next() * 50;
    const fh = 8 + rng.next() * 14;
    g.ellipse(fx, fy, fw, fh);
    g.fill({ color: 0xccddcc, alpha: 0.04 + rng.next() * 0.04 });
  }
}

function _drawBirds(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const bx = cx + (rng.next() - 0.5) * HEX_SIZE * 1.0;
    const by = cy + (rng.next() - 0.5) * HEX_SIZE * 0.7 - HEX_SIZE * 0.2;
    const ws = 4 + rng.next() * 5;
    // V-shape bird
    g.moveTo(bx - ws, by + ws * 0.3);
    g.quadraticCurveTo(bx - ws * 0.3, by - ws * 0.2, bx, by);
    g.quadraticCurveTo(bx + ws * 0.3, by - ws * 0.2, bx + ws, by + ws * 0.3);
    g.stroke({ color: 0x222222, width: 0.8, alpha: 0.3 + rng.next() * 0.2 });
  }
}
// --- AoW Terrain-Specific Decorations (PixiJS port) ---

function _drawHillMounds(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const mounds: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    mounds.push({
      x: cx + (rng.next() - 0.5) * HEX_SIZE * 1.3,
      y: cy + (rng.next() - 0.5) * HEX_SIZE * 0.9 + HEX_SIZE * 0.1,
      w: 35 + rng.next() * 60,
      h: 22 + rng.next() * 35,
    });
  }
  mounds.sort((a, b) => a.y - b.y);
  for (const m of mounds) {
    // Shadow
    g.ellipse(m.x + 4, m.y + 4, m.w * 1.02, m.h * 0.5);
    g.fill({ color: 0x000000, alpha: 0.1 });
    const hc = rng.next() < 0.5 ? 0x8a7a4a : 0x9a8a5a;
    // Main mound (half ellipse approximated)
    g.ellipse(m.x, m.y, m.w, m.h);
    g.fill({ color: hc, alpha: 0.5 });
    // Light top
    g.ellipse(m.x - m.w * 0.15, m.y - m.h * 0.2, m.w * 0.6, m.h * 0.5);
    g.fill({ color: _lighten(hc, 1.3), alpha: 0.2 });
    // Grass patches
    g.ellipse(m.x - m.w * 0.05, m.y, m.w * 0.85, m.h * 0.5);
    g.fill({ color: 0x5a8a3a, alpha: 0.15 });
    // Contour lines
    for (let t = 0; t < 4; t++) {
      const ty = m.y - m.h * (0.05 + t * 0.15);
      const tw = m.w * (0.9 - t * 0.12);
      g.ellipse(m.x, ty, tw, 2);
      g.stroke({ color: _darken(hc, 0.65), width: 0.6, alpha: 0.08 + t * 0.02 });
    }
    // Grass tufts on hill
    for (let t = 0; t < 3; t++) {
      const gx = m.x + (rng.next() - 0.5) * m.w * 0.6;
      const gy = m.y - m.h * (0.15 + rng.next() * 0.6);
      for (let b = -1; b <= 1; b++) {
        g.moveTo(gx + b * 2, gy);
        g.quadraticCurveTo(gx + b * 3.5, gy - 4, gx + b * 2.5 + (rng.next() - 0.5) * 2, gy - 7 - rng.next() * 5);
        g.stroke({ color: 0x5a9a3a, width: 0.8, alpha: 0.3 });
      }
    }
    // Exposed rock face
    if (rng.next() < 0.4) {
      g.ellipse(m.x + m.w * 0.2, m.y - m.h * 0.3, m.w * 0.15, m.h * 0.2);
      g.fill({ color: 0x7a7a72, alpha: 0.35 });
    }
  }
}

function _drawMountainPeaks(g: Graphics, cx: number, cy: number, rng: TileRng, count: number): void {
  const peaks: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    peaks.push({
      x: cx + (rng.next() - 0.5) * HEX_SIZE * 1.1,
      y: cy + (rng.next() - 0.5) * HEX_SIZE * 0.8,
      w: 35 + rng.next() * 55,
      h: 55 + rng.next() * 70,
    });
  }
  peaks.sort((a, b) => a.y - b.y);
  for (const p of peaks) {
    // Scree at base
    for (let r = 0; r < 4; r++) {
      const rx = p.x + (rng.next() - 0.5) * p.w * 0.9;
      const ry = p.y - rng.next() * p.h * 0.08;
      g.ellipse(rx, ry, 3 + rng.next() * 5, 2 + rng.next() * 3);
      g.fill({ color: 0x5a5a62, alpha: 0.35 });
    }
    // Drop shadow
    g.moveTo(p.x - p.w / 2 + 5, p.y + 5);
    g.lineTo(p.x + 4, p.y - p.h + 5);
    g.lineTo(p.x + p.w / 2 + 5, p.y + 5);
    g.closePath();
    g.fill({ color: 0x000000, alpha: 0.12 });
    const mc = [0x6a6a72, 0x7a7a82, 0x626268, 0x727278, 0x5e5e68][rng.nextInt(5)];
    // Right face (lighter)
    g.moveTo(p.x + p.w * 0.05, p.y);
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w / 2, p.y);
    g.closePath();
    g.fill({ color: _lighten(mc, 1.15), alpha: 0.9 });
    // Left face (shadow)
    g.moveTo(p.x - p.w / 2, p.y);
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * 0.05, p.y);
    g.closePath();
    g.fill({ color: _darken(mc, 0.75), alpha: 0.9 });
    // Ridge
    g.moveTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * 0.05, p.y);
    g.stroke({ color: _darken(mc, 0.5), width: 1.2, alpha: 0.3 });
    // Rock cracks
    for (let c = 0; c < 4; c++) {
      const cy2 = p.y - p.h * (0.1 + rng.next() * 0.55);
      const cxO = (rng.next() - 0.5) * p.w * 0.35;
      g.moveTo(p.x + cxO, cy2);
      g.lineTo(p.x + cxO + (rng.next() - 0.5) * 12, cy2 + rng.next() * 12);
      g.stroke({ color: _darken(mc, 0.5), width: 0.6, alpha: 0.18 });
    }
    // Snow cap
    const snowH = 0.22 + rng.next() * 0.18;
    g.moveTo(p.x - p.w * snowH * 0.65, p.y - p.h * (1 - snowH));
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * snowH * 0.55, p.y - p.h * (1 - snowH * 0.85));
    g.quadraticCurveTo(p.x + p.w * snowH * 0.35, p.y - p.h * (1 - snowH * 1.15), p.x + p.w * snowH * 0.1, p.y - p.h * (1 - snowH * 0.9));
    g.quadraticCurveTo(p.x - p.w * snowH * 0.1, p.y - p.h * (1 - snowH * 1.2), p.x - p.w * snowH * 0.35, p.y - p.h * (1 - snowH * 1.05));
    g.quadraticCurveTo(p.x - p.w * snowH * 0.5, p.y - p.h * (1 - snowH * 0.85), p.x - p.w * snowH * 0.65, p.y - p.h * (1 - snowH));
    g.closePath();
    g.fill({ color: 0xeeeef4, alpha: 0.85 });
    // Snow highlight
    g.moveTo(p.x - p.w * snowH * 0.2, p.y - p.h * (1 - snowH * 0.4));
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * snowH * 0.15, p.y - p.h * (1 - snowH * 0.35));
    g.closePath();
    g.fill({ color: 0xffffff, alpha: 0.25 });
  }
}

function _drawWaterWaves(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  // Deep caustic shapes
  for (let i = 0; i < 8; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    g.moveTo(ax, ay);
    const pts = 4 + Math.floor(rng.next() * 3);
    for (let p = 0; p < pts; p++) {
      g.lineTo(ax + (rng.next() - 0.5) * 30, ay + (rng.next() - 0.5) * 20);
    }
    g.closePath();
    g.fill({ color: rng.next() < 0.5 ? 0x1a3a70 : 0x2a5090, alpha: 0.06 });
  }
  // Wave ripples
  const waveColors = [0x5588cc, 0x77aadd, 0x4477bb, 0x6699cc];
  for (let i = 0; i < 14; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.55;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.45;
    const w = 10 + rng.next() * 40;
    g.moveTo(ax - w, ay);
    g.bezierCurveTo(ax - w * 0.4, ay - 3 - rng.next() * 5, ax - w * 0.1, ay - 2 - rng.next() * 4, ax, ay);
    g.bezierCurveTo(ax + w * 0.3, ay + 2 + rng.next() * 3, ax + w * 0.6, ay + 1 + rng.next() * 3, ax + w, ay);
    g.stroke({ color: waveColors[rng.nextInt(waveColors.length)], width: 0.7 + rng.next() * 1.3, alpha: 0.15 + rng.next() * 0.18 });
  }
  // Foam patches
  for (let i = 0; i < 6; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const w = 5 + rng.next() * 18;
    g.ellipse(ax, ay, w, w * 0.25);
    g.fill({ color: 0xffffff, alpha: 0.04 + rng.next() * 0.05 });
  }
  // Sparkles
  for (let i = 0; i < 12; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    g.circle(ax, ay, 0.8 + rng.next() * 2.5);
    g.fill({ color: 0xffffff, alpha: 0.1 + rng.next() * 0.25 });
  }
}

function _drawDesertDeco(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  // Sand dunes
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const w = 30 + rng.next() * 65;
    const h = 8 + rng.next() * 18;
    g.ellipse(ax, ay, w, h);
    g.fill({ color: 0xe8d080, alpha: 0.15 + rng.next() * 0.12 });
    // Shadow underneath
    g.ellipse(ax, ay + h * 0.3, w * 0.95, h * 0.5);
    g.fill({ color: 0xb89844, alpha: 0.1 });
  }
  // Wind streaks
  for (let i = 0; i < 10; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.45;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const w = 12 + rng.next() * 35;
    g.moveTo(ax - w, ay);
    g.quadraticCurveTo(ax, ay - 1 - rng.next() * 3, ax + w, ay);
    g.stroke({ color: rng.next() < 0.5 ? 0xd0b860 : 0xc0a850, width: 0.4 + rng.next() * 0.7, alpha: 0.1 + rng.next() * 0.08 });
  }
  // Features: cacti, rocks, dry bushes, skulls, bones
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.25;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.15;
    const feat = rng.next();
    if (feat < 0.25) {
      // Cactus
      const ch = 14 + rng.next() * 20;
      g.moveTo(ax - 3, ay);
      g.lineTo(ax - 2.5, ay - ch);
      g.lineTo(ax + 2.5, ay - ch);
      g.lineTo(ax + 3, ay);
      g.closePath();
      g.fill({ color: 0x4a8a30, alpha: 0.8 });
      // Arms
      const armH = ch * (0.35 + rng.next() * 0.25);
      g.rect(ax - 10, ay - armH, 7, 2);
      g.fill({ color: 0x4a8a30, alpha: 0.8 });
      g.rect(ax - 10, ay - armH - 8, 2, 9);
      g.fill({ color: 0x4a8a30, alpha: 0.8 });
      g.rect(ax + 3, ay - armH * 0.8, 6, 2);
      g.fill({ color: 0x4a8a30, alpha: 0.8 });
      g.rect(ax + 7, ay - armH * 0.8 - 6, 2, 7);
      g.fill({ color: 0x4a8a30, alpha: 0.8 });
      // Shadow
      g.ellipse(ax + 3, ay + 1, 6, 2);
      g.fill({ color: 0x000000, alpha: 0.08 });
    } else if (feat < 0.45) {
      // Rock cluster
      for (let r = 0; r < 2 + Math.floor(rng.next() * 3); r++) {
        const rx = ax + (rng.next() - 0.5) * 14;
        const ry = ay + (rng.next() - 0.5) * 8;
        const rw = 4 + rng.next() * 9;
        const rh = 3 + rng.next() * 5;
        g.ellipse(rx, ry, rw, rh);
        g.fill({ color: rng.next() < 0.5 ? 0xaa9966 : 0x998855, alpha: 0.5 + rng.next() * 0.3 });
      }
    } else if (feat < 0.6) {
      // Dry bush
      const br = 6 + rng.next() * 10;
      for (let b = 0; b < 8; b++) {
        const ba = rng.next() * Math.PI * 2;
        g.moveTo(ax, ay);
        g.lineTo(ax + Math.cos(ba) * br, ay + Math.sin(ba) * br);
        g.stroke({ color: 0x8a7a4a, width: 0.7, alpha: 0.45 });
      }
    } else if (feat < 0.72) {
      // Skull
      g.ellipse(ax, ay - 3, 5, 4);
      g.fill({ color: 0xe0d8c8, alpha: 0.55 });
      g.ellipse(ax, ay, 4, 3);
      g.fill({ color: 0xe0d8c8, alpha: 0.55 });
      g.circle(ax - 2, ay - 3.5, 1.2);
      g.fill({ color: 0x3a3a3a, alpha: 0.55 });
      g.circle(ax + 2, ay - 3.5, 1.2);
      g.fill({ color: 0x3a3a3a, alpha: 0.55 });
    } else {
      // Bone
      g.moveTo(ax - 8, ay);
      g.quadraticCurveTo(ax, ay - 3 - rng.next() * 4, ax + 8 + rng.next() * 8, ay + rng.next() * 3);
      g.stroke({ color: 0xddccbb, width: 1.5, alpha: 0.35 });
    }
  }
}

function _drawSwampDeco(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  // Murky water pools
  for (let i = 0; i < 7; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.35;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.25;
    const w = 12 + rng.next() * 32;
    const h = 8 + rng.next() * 20;
    // Pool
    g.ellipse(ax, ay, w, h);
    g.fill({ color: 0x1a3a2a, alpha: 0.35 });
    g.ellipse(ax, ay, w * 0.8, h * 0.7);
    g.fill({ color: 0x2a4a38, alpha: 0.15 });
    // Reflection
    g.ellipse(ax - w * 0.2, ay - h * 0.2, w * 0.3, h * 0.2);
    g.fill({ color: 0x5a9a6a, alpha: 0.08 });
    // Lily pads
    if (rng.next() < 0.45) {
      const lx = ax + (rng.next() - 0.5) * w * 0.5;
      const ly = ay + (rng.next() - 0.5) * h * 0.4;
      const lr = 3 + rng.next() * 5;
      g.circle(lx, ly, lr);
      g.fill({ color: 0x3a8a3a, alpha: 0.55 });
      // Flower on lily pad
      if (rng.next() < 0.35) {
        g.circle(lx + lr * 0.2, ly - lr * 0.1, 1.5 + rng.next());
        g.fill({ color: rng.next() < 0.5 ? 0xffaacc : 0xffffff, alpha: 0.6 });
      }
    }
  }
  // Reeds
  const reedColors = [0x5a7a3a, 0x6a8a4a, 0x4a6a30, 0x558a38];
  for (let i = 0; i < 12; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const h = 14 + rng.next() * 25;
    const sway = (rng.next() - 0.5) * 8;
    g.moveTo(ax, ay);
    g.bezierCurveTo(ax + sway * 0.3, ay - h * 0.3, ax + sway * 0.7, ay - h * 0.6, ax + sway, ay - h);
    g.stroke({ color: reedColors[rng.nextInt(reedColors.length)], width: 1 + rng.next() * 0.8, alpha: 0.5 + rng.next() * 0.3 });
    // Cattail
    if (rng.next() < 0.3) {
      g.ellipse(ax + sway, ay - h - 4, 2.5, 6.5);
      g.fill({ color: 0x5a3a1a, alpha: 0.65 });
    }
  }
  // Mushrooms
  for (let i = 0; i < 4; i++) {
    const mx = cx + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const my = cy + (rng.next() - 0.5) * HEX_SIZE * 1.1;
    const ms = 2 + rng.next() * 4;
    const glowing = rng.next() < 0.3;
    if (glowing) {
      g.circle(mx, my - ms * 1.5, ms * 2.5);
      g.fill({ color: 0x88ff88, alpha: 0.04 });
    }
    g.rect(mx - 0.8, my - ms * 1.8, 1.6, ms * 1.8);
    g.fill({ color: 0xccbb99, alpha: 0.6 });
    g.ellipse(mx, my - ms * 1.8, ms * 1.3, ms * 0.8);
    const mc = glowing ? 0x66dd88 : rng.next() < 0.5 ? 0xcc4444 : 0xdd8844;
    g.fill({ color: mc, alpha: glowing ? 0.5 : 0.6 });
  }
  // Fog wisps
  for (let i = 0; i < 4; i++) {
    const fx = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const fy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.7 + HEX_SIZE * 0.15;
    g.ellipse(fx, fy, 25 + rng.next() * 40, 6 + rng.next() * 12);
    g.fill({ color: 0xaaccaa, alpha: 0.035 + rng.next() * 0.035 });
  }
}

function _drawPathTrail(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const sx = cx + (rng.next() - 0.5) * HEX_SIZE * 1.2;
  const sy = cy + HEX_SIZE * 0.7;
  const ex = cx + (rng.next() - 0.5) * HEX_SIZE * 0.8;
  const ey = cy - HEX_SIZE * 0.7;
  const mx = cx + (rng.next() - 0.5) * HEX_SIZE * 0.4;
  const my = cy + (rng.next() - 0.5) * HEX_SIZE * 0.3;
  // Wide path
  g.moveTo(sx, sy);
  g.bezierCurveTo(sx + (rng.next() - 0.5) * 30, sy - HEX_SIZE * 0.3, mx - 20, my + 20, mx, my);
  g.bezierCurveTo(mx + 20, my - 20, ex + (rng.next() - 0.5) * 30, ey + HEX_SIZE * 0.3, ex, ey);
  g.stroke({ color: 0x7a6a4a, width: 10 + rng.next() * 6, alpha: 0.12 });
  // Narrower path center
  g.moveTo(sx, sy);
  g.bezierCurveTo(sx + (rng.next() - 0.5) * 30, sy - HEX_SIZE * 0.3, mx - 20, my + 20, mx, my);
  g.bezierCurveTo(mx + 20, my - 20, ex + (rng.next() - 0.5) * 30, ey + HEX_SIZE * 0.3, ex, ey);
  g.stroke({ color: 0x8a7a5a, width: 5 + rng.next() * 4, alpha: 0.08 });
}

function _drawStream(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  const sx = cx - HEX_SIZE * 0.65;
  const sy = cy + (rng.next() - 0.5) * HEX_SIZE * 0.6;
  const ex = cx + HEX_SIZE * 0.65;
  const ey = cy + (rng.next() - 0.5) * HEX_SIZE * 0.6;
  g.moveTo(sx, sy);
  g.bezierCurveTo(sx + HEX_SIZE * 0.3, sy + (rng.next() - 0.5) * HEX_SIZE * 0.4, ex - HEX_SIZE * 0.3, ey + (rng.next() - 0.5) * HEX_SIZE * 0.4, ex, ey);
  g.stroke({ color: 0x3878b8, width: 7 + rng.next() * 5, alpha: 0.3 });
  g.moveTo(sx, sy);
  g.bezierCurveTo(sx + HEX_SIZE * 0.3, sy + (rng.next() - 0.5) * HEX_SIZE * 0.4, ex - HEX_SIZE * 0.3, ey + (rng.next() - 0.5) * HEX_SIZE * 0.4, ex, ey);
  g.stroke({ color: 0x5599dd, width: 3 + rng.next() * 3, alpha: 0.2 });
  // Sparkles
  for (let i = 0; i < 4; i++) {
    const t = rng.next();
    const px = sx + (ex - sx) * t + (rng.next() - 0.5) * 4;
    const py = sy + (ey - sy) * t + (rng.next() - 0.5) * 4;
    g.circle(px, py, 1 + rng.next());
    g.fill({ color: 0xffffff, alpha: 0.15 + rng.next() * 0.15 });
  }
}

function _drawTundraFeatures(g: Graphics, cx: number, cy: number, rng: TileRng): void {
  // Snow drifts
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.1;
    const w = 25 + rng.next() * 45;
    const h = 6 + rng.next() * 12;
    g.ellipse(ax, ay, w, h);
    g.fill({ color: 0xdde8f0, alpha: 0.15 + rng.next() * 0.1 });
  }
  // Sparse dead grass
  for (let i = 0; i < 8; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.4;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.3;
    const h = 5 + rng.next() * 8;
    for (let b = -1; b <= 1; b++) {
      g.moveTo(ax + b * 2, ay);
      g.quadraticCurveTo(ax + b * 3, ay - h * 0.6, ax + b * 2.5, ay - h);
      g.stroke({ color: 0x8a7a5a, width: 0.8, alpha: 0.3 });
    }
  }
  // Frost-covered rocks
  for (let i = 0; i < 3; i++) {
    const ax = cx + (rng.next() - 0.5) * HEX_SIZE * 1.2;
    const ay = cy + (rng.next() - 0.5) * HEX_SIZE * 1.1;
    const rw = 6 + rng.next() * 12;
    const rh = 4 + rng.next() * 7;
    g.ellipse(ax, ay, rw, rh);
    g.fill({ color: 0x8a8a8a, alpha: 0.5 });
    // Frost
    g.ellipse(ax - rw * 0.15, ay - rh * 0.3, rw * 0.5, rh * 0.35);
    g.fill({ color: 0xdde8f0, alpha: 0.3 });
  }
}
// --- AoW Border ---

function _drawAoWBorder(g: Graphics, cx: number, cy: number, color: number): void {
  const corners = hexCorners({ x: cx, y: cy } as HexPixel, HEX_SIZE - 1);
  // Dark outer stroke
  g.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(corners[i].x, corners[i].y);
  g.closePath();
  g.stroke({ color: _darken(color, 0.4), width: 3.5, alpha: 0.55 });
  // Top-left highlight (corners 5→0→1→2)
  g.moveTo(corners[5].x, corners[5].y);
  g.lineTo(corners[0].x, corners[0].y);
  g.lineTo(corners[1].x, corners[1].y);
  g.lineTo(corners[2].x, corners[2].y);
  g.stroke({ color: _lighten(color, 1.5), width: 2, alpha: 0.2 });
  // Bottom-right shadow (corners 2→3→4→5)
  g.moveTo(corners[2].x, corners[2].y);
  g.lineTo(corners[3].x, corners[3].y);
  g.lineTo(corners[4].x, corners[4].y);
  g.lineTo(corners[5].x, corners[5].y);
  g.stroke({ color: _darken(color, 0.3), width: 2, alpha: 0.3 });
}

// --- AoW Terrain Decoration Dispatcher (replaces _drawTerrainDecoration) ---

function _drawTerrainDecoration(
  g: Graphics,
  terrain: TerrainType,
  center: HexPixel,
): void {
  const cx = center.x;
  const cy = center.y;
  const rng = new TileRng(cx, cy);

  // Paint rich terrain base
  _paintTerrainBase(g, cx, cy, terrain, rng);

  // Pick tile variant based on hash
  const variant = _tileHash(Math.round(cx), Math.round(cy), 0);

  switch (terrain) {
    case TerrainType.GRASSLAND: {
      const v = variant % 5;
      if (v === 0) {
        // Lush Meadow
        _drawGrassTufts(g, cx, cy, rng, 25);
        _drawScatteredFlowers(g, cx, cy, rng, 12);
        _drawScatteredRocks(g, cx, cy, rng, 3);
        _drawButterflies(g, cx, cy, rng, 3);
      } else if (v === 1) {
        // Scattered Oaks
        _drawGrassTufts(g, cx, cy, rng, 14);
        _drawScatteredTrees(g, cx, cy, rng, 4, "deciduous");
        _drawScatteredFlowers(g, cx, cy, rng, 6);
        _drawFerns(g, cx, cy, rng, 2);
        _drawBirds(g, cx, cy, rng, 2);
      } else if (v === 2) {
        // Brook & Flowers
        _drawStream(g, cx, cy, rng);
        _drawGrassTufts(g, cx, cy, rng, 18);
        _drawScatteredFlowers(g, cx, cy, rng, 8);
        _drawScatteredRocks(g, cx, cy, rng, 4);
      } else if (v === 3) {
        // Fairy Ring
        _drawGrassTufts(g, cx, cy, rng, 16);
        _drawFairyRing(g, cx, cy, rng);
        _drawScatteredFlowers(g, cx, cy, rng, 4);
        _drawButterflies(g, cx, cy, rng, 2);
      } else {
        // Crystal Field
        _drawGrassTufts(g, cx, cy, rng, 16);
        _drawCrystalFormation(g, cx, cy, rng);
        _drawScatteredFlowers(g, cx, cy, rng, 5);
        _drawScatteredRocks(g, cx, cy, rng, 2);
      }
      break;
    }
    case TerrainType.FOREST: {
      const v = variant % 5;
      if (v === 0) {
        // Dense Canopy
        _drawFallenLogs(g, cx, cy, rng, 1);
        _drawFerns(g, cx, cy, rng, 4);
        _drawScatteredTrees(g, cx, cy, rng, 8, "deciduous");
        _drawGrassTufts(g, cx, cy, rng, 6);
        _drawLightRays(g, cx, cy, rng);
      } else if (v === 1) {
        // Pine Grove
        _drawScatteredTrees(g, cx, cy, rng, 7, "pine");
        _drawFerns(g, cx, cy, rng, 3);
        _drawStumps(g, cx, cy, rng, 1);
        _drawScatteredRocks(g, cx, cy, rng, 3);
        _drawGrassTufts(g, cx, cy, rng, 8);
      } else if (v === 2) {
        // Enchanted Path
        _drawPathTrail(g, cx, cy, rng);
        _drawScatteredTrees(g, cx, cy, rng, 5);
        _drawFerns(g, cx, cy, rng, 3);
        _drawGlowingMushrooms(g, cx, cy, rng, 2);
        _drawGrassTufts(g, cx, cy, rng, 8);
        _drawLightRays(g, cx, cy, rng);
        _drawFireflies(g, cx, cy, rng, 4);
      } else if (v === 3) {
        // Autumn
        _drawScatteredTrees(g, cx, cy, rng, 6, "autumn");
        _drawFerns(g, cx, cy, rng, 2);
        _drawFallenLogs(g, cx, cy, rng, 1);
        _drawScatteredRocks(g, cx, cy, rng, 2);
        _drawGrassTufts(g, cx, cy, rng, 6);
      } else {
        // Birch Grove
        _drawScatteredTrees(g, cx, cy, rng, 6, "birch");
        _drawFerns(g, cx, cy, rng, 3);
        _drawScatteredFlowers(g, cx, cy, rng, 4);
        _drawGrassTufts(g, cx, cy, rng, 8);
        _drawLightRays(g, cx, cy, rng);
        _drawButterflies(g, cx, cy, rng, 2);
      }
      break;
    }
    case TerrainType.PLAINS: {
      const v = variant % 3;
      if (v === 0) {
        // Wheat Fields
        _drawWheatField(g, cx, cy, rng);
        _drawScatteredRocks(g, cx, cy, rng, 2);
        _drawBirds(g, cx, cy, rng, 2);
      } else if (v === 1) {
        // Windswept
        _drawGrassTufts(g, cx, cy, rng, 22);
        _drawScatteredRocks(g, cx, cy, rng, 5);
        _drawScatteredFlowers(g, cx, cy, rng, 4);
        _drawBushes(g, cx, cy, rng, 2);
        _drawButterflies(g, cx, cy, rng, 2);
      } else {
        // Standing Stones
        _drawGrassTufts(g, cx, cy, rng, 14);
        _drawStandingStones(g, cx, cy, rng, 2);
        _drawScatteredFlowers(g, cx, cy, rng, 3);
        _drawScatteredRocks(g, cx, cy, rng, 2);
      }
      break;
    }
    case TerrainType.HILLS: {
      const v = variant % 2;
      if (v === 0) {
        // Rolling Green
        _drawHillMounds(g, cx, cy, rng, 4);
        _drawScatteredRocks(g, cx, cy, rng, 4);
        _drawGrassTufts(g, cx, cy, rng, 10);
        _drawScatteredTrees(g, cx, cy, rng, 2, "deciduous");
        _drawBushes(g, cx, cy, rng, 1);
      } else {
        // Ancient Ruins
        _drawHillMounds(g, cx, cy, rng, 2);
        _drawAncientRuins(g, cx, cy, rng);
        _drawScatteredRocks(g, cx, cy, rng, 4);
        _drawGrassTufts(g, cx, cy, rng, 8);
        _drawFerns(g, cx, cy, rng, 1);
      }
      break;
    }
    case TerrainType.MOUNTAINS: {
      const v = variant % 2;
      if (v === 0) {
        // Jagged Peaks
        _drawMountainPeaks(g, cx, cy, rng, 4);
        _drawScatteredRocks(g, cx, cy, rng, 6);
        _drawBirds(g, cx, cy, rng, 2);
      } else {
        // Crystal Cave
        _drawMountainPeaks(g, cx, cy, rng, 2);
        _drawCrystalFormation(g, cx, cy, rng);
        _drawScatteredRocks(g, cx, cy, rng, 4);
        _drawMistLayer(g, cx, cy, rng);
      }
      break;
    }
    case TerrainType.WATER: {
      _drawWaterWaves(g, cx, cy, rng);
      break;
    }
    case TerrainType.DESERT: {
      _drawDesertDeco(g, cx, cy, rng);
      break;
    }
    case TerrainType.SWAMP: {
      const v = variant % 2;
      if (v === 0) {
        // Murky Bog
        _drawSwampDeco(g, cx, cy, rng);
        _drawScatteredTrees(g, cx, cy, rng, 3, "dark");
        _drawFireflies(g, cx, cy, rng, 4);
        _drawMistLayer(g, cx, cy, rng);
      } else {
        // Willow Hollow
        _drawSwampDeco(g, cx, cy, rng);
        _drawScatteredTrees(g, cx, cy, rng, 2, "willow");
        _drawFireflies(g, cx, cy, rng, 3);
        _drawMistLayer(g, cx, cy, rng);
      }
      break;
    }
    case TerrainType.TUNDRA: {
      const v = variant % 2;
      if (v === 0) {
        // Frozen Waste
        _drawTundraFeatures(g, cx, cy, rng);
        _drawScatteredTrees(g, cx, cy, rng, 2, "pine");
        _drawBirds(g, cx, cy, rng, 1);
      } else {
        // Standing Stones
        _drawTundraFeatures(g, cx, cy, rng);
        _drawStandingStones(g, cx, cy, rng, 2);
        _drawMistLayer(g, cx, cy, rng);
      }
      break;
    }
    default:
      break;
  }

  // Draw AoW border
  const terrainBorderColors: Record<string, number> = {
    [TerrainType.GRASSLAND]: 0x4a9933,
    [TerrainType.FOREST]: 0x2d6b2a,
    [TerrainType.PLAINS]: 0xb8a84e,
    [TerrainType.HILLS]: 0x8a7a4a,
    [TerrainType.MOUNTAINS]: 0x6a6a72,
    [TerrainType.WATER]: 0x2855a0,
    [TerrainType.DESERT]: 0xd4b866,
    [TerrainType.SWAMP]: 0x4a6a3a,
    [TerrainType.TUNDRA]: 0x8899aa,
  };
  _drawAoWBorder(g, cx, cy, terrainBorderColors[terrain] ?? 0x888888);
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

/**
 * Draw terrain decoration at a given point (for use outside the hex map,
 * e.g. RPG battle backgrounds). The decoration fills roughly a HEX_SIZE
 * radius around (cx, cy).
 */
export function drawTerrainDecorationAt(
  g: Graphics,
  terrain: TerrainType,
  cx: number,
  cy: number,
): void {
  _drawTerrainDecoration(g, terrain, { x: cx, y: cy } as HexPixel);
}
