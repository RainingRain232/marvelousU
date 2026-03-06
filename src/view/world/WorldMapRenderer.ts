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
    const corners = hexCorners(center, HEX_SIZE + 0.5);

    const g = new Graphics();

    // Fill hex with terrain color, blended with owner color if owned
    let fillColor = terrainDef.color;
    if (tile.owner) {
      const playerIndex = parseInt(tile.owner.replace("p", "")) - 1;
      const ownerColor = PLAYER_COLORS[playerIndex] ?? 0xffffff;
      const t = 0.15;
      const tR = (terrainDef.color >> 16) & 0xff;
      const tG = (terrainDef.color >> 8) & 0xff;
      const tB = terrainDef.color & 0xff;
      const oR = (ownerColor >> 16) & 0xff;
      const oG = (ownerColor >> 8) & 0xff;
      const oB = ownerColor & 0xff;
      const r = Math.round(tR * (1 - t) + oR * t);
      const g2 = Math.round(tG * (1 - t) + oG * t);
      const b = Math.round(tB * (1 - t) + oB * t);
      fillColor = (r << 16) | (g2 << 8) | b;
    }
    // Base fill slightly oversized to prevent gaps between wobbly edges
    const baseCorners = hexCorners(center, HEX_SIZE + 2);
    g.moveTo(baseCorners[0].x, baseCorners[0].y);
    for (let i = 1; i < baseCorners.length; i++) {
      g.lineTo(baseCorners[i].x, baseCorners[i].y);
    }
    g.closePath();
    g.fill({ color: fillColor });

    // Draw hex with wobbly edges for organic look
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 0; i < 6; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 6];
      // Deterministic seed per edge: use sorted endpoint coords so both tiles sharing this edge get the same wobble
      const edgeSeed = Math.round(c1.x + c2.x) * 7919 + Math.round(c1.y + c2.y) * 104729;
      // Perpendicular direction to edge
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / len;
      const py = dx / len;
      const wobble = HEX_SIZE * 0.06;
      // Two control points for a natural curve
      const h1 = _tileHash(edgeSeed, 0, 1);
      const h2 = _tileHash(edgeSeed, 0, 2);
      const off1 = ((h1 % 1000) / 500 - 1) * wobble;
      const off2 = ((h2 % 1000) / 500 - 1) * wobble;
      const cp1x = c1.x + dx * 0.33 + px * off1;
      const cp1y = c1.y + dy * 0.33 + py * off1;
      const cp2x = c1.x + dx * 0.66 + px * off2;
      const cp2y = c1.y + dy * 0.66 + py * off2;
      g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c2.x, c2.y);
    }
    g.closePath();
    g.fill({ color: fillColor });

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
      // Occasional trees (~25% of tiles, 1-3 trees)
      if (_hashFloat(cx, cy, 900) < 0.25) {
        const treeCount = 1 + (_tileHash(cx, cy, 901) % 3);
        for (let t = 0; t < treeCount; t++) {
          const tx = cx + (_hashFloat(cx, cy, t * 5 + 910) - 0.5) * 90;
          const ty = cy + (_hashFloat(cx, cy, t * 5 + 911) - 0.5) * 70;
          const sc = 0.5 + _hashFloat(cx, cy, t + 912) * 0.3;
          const tw = 3 + sc * 2;
          const th = 8 + sc * 6;
          const cr = 6 + sc * 5;
          const trunkC = [0x3d2a15, 0x4a3320, 0x33200d][_tileHash(cx, cy, t + 920) % 3];
          const foliageC = [0x2a6630, 0x337733, 0x1f5528, 0x448833][_tileHash(cx, cy, t + 921) % 4];
          // Shadow
          g.ellipse(tx, ty + 2, cr * 0.5, cr * 0.12);
          g.fill({ color: 0x0a3a0a, alpha: 0.12 });
          // Trunk
          g.rect(tx - tw / 2, ty - th, tw, th);
          g.fill({ color: trunkC });
          // Canopy
          const canopyY = ty - th - cr * 0.3;
          for (let c = 0; c < 3; c++) {
            const ccx = tx + (_hashFloat(cx, cy, t * 10 + c + 930) - 0.5) * cr * 0.6;
            const ccy = canopyY + (_hashFloat(cx, cy, t * 10 + c + 931) - 0.5) * cr * 0.4;
            const ccr = cr * (0.4 + _hashFloat(cx, cy, t * 10 + c + 932) * 0.35);
            g.circle(ccx, ccy, ccr);
            g.fill({ color: foliageC, alpha: 0.8 });
          }
          // Highlight
          g.circle(tx - cr * 0.15, canopyY - cr * 0.1, cr * 0.25);
          g.fill({ color: 0x55aa44, alpha: 0.35 });
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
      // Occasional trees (~20% of tiles, 1-3 trees)
      if (_hashFloat(cx, cy, 950) < 0.2) {
        const treeCount = 1 + (_tileHash(cx, cy, 951) % 3);
        for (let t = 0; t < treeCount; t++) {
          const tx = cx + (_hashFloat(cx, cy, t * 5 + 952) - 0.5) * 80;
          const ty = cy + (_hashFloat(cx, cy, t * 5 + 953) - 0.5) * 60;
          const sc = 0.5 + _hashFloat(cx, cy, t + 954) * 0.35;
          const tw = 3 + sc * 2;
          const th = 8 + sc * 6;
          const cr = 6 + sc * 5;
          const trunkC = [0x3d2a15, 0x4a3320, 0x33200d][_tileHash(cx, cy, t + 960) % 3];
          const foliageC = [0x1a4420, 0x1f5528, 0x245530, 0x337733][_tileHash(cx, cy, t + 961) % 4];
          // Shadow
          g.ellipse(tx, ty + 2, cr * 0.5, cr * 0.12);
          g.fill({ color: 0x0a3a0a, alpha: 0.12 });
          // Trunk
          g.rect(tx - tw / 2, ty - th, tw, th);
          g.fill({ color: trunkC });
          // Canopy
          const canopyY = ty - th - cr * 0.3;
          for (let c = 0; c < 3; c++) {
            const ccx = tx + (_hashFloat(cx, cy, t * 10 + c + 970) - 0.5) * cr * 0.6;
            const ccy = canopyY + (_hashFloat(cx, cy, t * 10 + c + 971) - 0.5) * cr * 0.4;
            const ccr = cr * (0.4 + _hashFloat(cx, cy, t * 10 + c + 972) * 0.35);
            g.circle(ccx, ccy, ccr);
            g.fill({ color: foliageC, alpha: 0.8 });
          }
          // Highlight
          g.circle(tx - cr * 0.15, canopyY - cr * 0.1, cr * 0.25);
          g.fill({ color: 0x44aa33, alpha: 0.35 });
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
      // Fantasia-style ancient gnarled trees with round canopies — dense forest
      const treePositions: [number, number][] = [];
      const treeCount = 20;
      for (let i = 0; i < treeCount; i++) {
        treePositions.push([
          ((_tileHash(cx, cy, i * 2 + 40) % 140) - 70),
          ((_tileHash(cx, cy, i * 2 + 41) % 120) - 60),
        ]);
      }
      treePositions.sort((a, b) => a[1] - b[1]);

      const trunkColors = [0x3d2a15, 0x4a3320, 0x33200d];
      const foliageColors = [0x1a4420, 0x1f5528, 0x163a18, 0x245530];
      const highlightColors = [0x2a6635, 0x348840, 0x1e553a];
      const mossColors = [0x3a6630, 0x2d5525, 0x4a7a3a];

      for (let i = 0; i < treePositions.length; i++) {
        const [ox, oy] = treePositions[i];
        const scale = 0.7 + (_hashFloat(cx, cy, i + 45) * 0.5);
        const tx = cx + ox;
        const ty = cy + oy;
        const trunkW = (4 + scale * 3);
        const trunkH = (10 + scale * 8);
        const canopyR = (8 + scale * 7);
        const trunkColor = trunkColors[_tileHash(cx, cy, i + 60) % trunkColors.length];
        const twist = ((_hashFloat(cx, cy, i + 70) - 0.5) * 4);

        // Ground shadow
        g.ellipse(tx, ty + 2, canopyR * 0.6, canopyR * 0.15);
        g.fill({ color: 0x0a3a0a, alpha: 0.15 });

        // Exposed roots
        const rootCount = 2 + (_tileHash(cx, cy, i + 80) % 3);
        for (let r = 0; r < rootCount; r++) {
          const side = r < rootCount / 2 ? -1 : 1;
          const rootLen = 4 + _hashFloat(cx, cy, i * 10 + r + 90) * 6;
          const rootW = 1 + _hashFloat(cx, cy, i * 10 + r + 91);
          g.moveTo(tx + side * trunkW * 0.2, ty);
          g.bezierCurveTo(
            tx + side * rootLen * 0.4, ty + 1,
            tx + side * rootLen * 0.7, ty + 2,
            tx + side * rootLen, ty + 2 + _hashFloat(cx, cy, i * 10 + r + 92) * 2,
          );
          g.stroke({ color: trunkColor, width: rootW, cap: "round" });
        }

        // Twisted trunk
        g.moveTo(tx - trunkW / 2, ty);
        g.bezierCurveTo(
          tx - trunkW / 2 + twist * 0.3, ty - trunkH * 0.3,
          tx - trunkW / 2 - twist * 0.2, ty - trunkH * 0.7,
          tx - trunkW * 0.35, ty - trunkH,
        );
        g.lineTo(tx + trunkW * 0.35, ty - trunkH);
        g.bezierCurveTo(
          tx + trunkW / 2 + twist * 0.2, ty - trunkH * 0.7,
          tx + trunkW / 2 - twist * 0.3, ty - trunkH * 0.3,
          tx + trunkW / 2, ty,
        );
        g.closePath();
        g.fill({ color: trunkColor });

        // Bark lines
        for (let b = 0; b < 2; b++) {
          const bx = tx + (_hashFloat(cx, cy, i * 10 + b + 100) - 0.5) * trunkW * 0.4;
          const by1 = ty - _hashFloat(cx, cy, i * 10 + b + 101) * trunkH * 0.3;
          const by2 = by1 - trunkH * 0.3;
          g.moveTo(bx, by1);
          g.lineTo(bx, by2);
          g.stroke({ color: 0x1a1008, width: 0.8, alpha: 0.35 });
        }

        // Moss patches
        if (_hashFloat(cx, cy, i + 110) > 0.4) {
          const mx = tx + (_hashFloat(cx, cy, i + 111) - 0.5) * trunkW * 0.3;
          const my = ty - _hashFloat(cx, cy, i + 112) * trunkH * 0.6;
          const mc = mossColors[_tileHash(cx, cy, i + 113) % mossColors.length];
          g.ellipse(mx, my, 2 + scale, 1 + scale * 0.5);
          g.fill({ color: mc, alpha: 0.55 });
        }

        // Dense round canopy (overlapping circles like ForestTreeRenderer)
        const canopyCenterY = ty - trunkH - canopyR * 0.3;
        const cCount = 4 + (_tileHash(cx, cy, i + 120) % 3);
        for (let c = 0; c < cCount; c++) {
          const ccx = tx + (_hashFloat(cx, cy, i * 10 + c + 130) - 0.5) * canopyR * 0.8;
          const ccy = canopyCenterY + (_hashFloat(cx, cy, i * 10 + c + 131) - 0.5) * canopyR * 0.5;
          const ccr = canopyR * (0.4 + _hashFloat(cx, cy, i * 10 + c + 132) * 0.4);
          const fColor = foliageColors[_tileHash(cx, cy, i * 10 + c + 133) % foliageColors.length];
          g.circle(ccx, ccy, ccr);
          g.fill({ color: fColor, alpha: 0.8 });
        }

        // Highlight clusters
        for (let h = 0; h < 2; h++) {
          const hx = tx + (_hashFloat(cx, cy, i * 10 + h + 140) - 0.5) * canopyR * 0.5;
          const hy = canopyCenterY - canopyR * 0.1 + (_hashFloat(cx, cy, i * 10 + h + 141) - 0.5) * canopyR * 0.3;
          const hr = canopyR * (0.2 + _hashFloat(cx, cy, i * 10 + h + 142) * 0.2);
          const hc = highlightColors[_tileHash(cx, cy, i * 10 + h + 143) % highlightColors.length];
          g.circle(hx, hy, hr);
          g.fill({ color: hc, alpha: 0.45 });
        }

        // Dappled light
        if (_hashFloat(cx, cy, i + 150) > 0.5) {
          const lx = tx + (_hashFloat(cx, cy, i + 151) - 0.5) * canopyR * 0.4;
          const ly = canopyCenterY - _hashFloat(cx, cy, i + 152) * canopyR * 0.3;
          g.circle(lx, ly, 1.5 + scale);
          g.fill({ color: 0x88cc66, alpha: 0.15 });
        }

        // Hanging vine (1 per tree, static)
        if (_hashFloat(cx, cy, i + 160) > 0.4) {
          const vx = tx + (_hashFloat(cx, cy, i + 161) - 0.5) * canopyR * 0.6;
          const vy = canopyCenterY + canopyR * 0.2;
          const vLen = 6 + _hashFloat(cx, cy, i + 162) * 8;
          g.moveTo(vx, vy);
          g.bezierCurveTo(vx + 2, vy + vLen * 0.3, vx - 1, vy + vLen * 0.7, vx + 1, vy + vLen);
          g.stroke({ color: 0x2a5520, width: 1, cap: "round" });
          // Tiny leaf at end
          g.moveTo(vx + 1, vy + vLen);
          g.lineTo(vx + 4, vy + vLen + 2);
          g.lineTo(vx + 1, vy + vLen + 3);
          g.closePath();
          g.fill({ color: 0x336633, alpha: 0.7 });
        }
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
