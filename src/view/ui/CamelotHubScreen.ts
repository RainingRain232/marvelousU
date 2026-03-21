// CamelotHubScreen — Illuminated manuscript parchment map of Camelot.
// Buildings correspond to game modes. Compass rose opens the classic menu.

import { Container, Graphics, Text, TextStyle, Ticker } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { GameMode, GamePhase } from "@/types";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { RuneCorners } from "@view/fx/RuneCorners";

// Building renderers (animated previews for tooltip)
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";
import { ArchiveRenderer } from "@view/entities/ArchiveRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { HamletRenderer } from "@view/entities/HamletRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { House1Renderer } from "@view/entities/House1Renderer";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_LABEL = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 11,
  fill: 0x2a1a0a,
  fontWeight: "bold",
});

const STYLE_LABEL_HOVER = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 12,
  fill: 0xdaa520,
  fontWeight: "bold",
});

const STYLE_MODE = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 9,
  fill: 0x604020,
  fontStyle: "italic",
});

const STYLE_MODE_HOVER = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 9,
  fill: 0xdaa520,
  fontStyle: "italic",
});

const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 22,
  fill: 0x2a1a0a,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_TITLE_INITIAL = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 36,
  fill: 0xdaa520,
  fontWeight: "bold",
});

const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 11,
  fill: 0x604830,
  fontStyle: "italic",
});

const STYLE_COMPASS = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 10,
  fill: 0xdaa520,
  fontWeight: "bold",
});

const STYLE_COMPASS_DIR = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 7,
  fill: 0x2a1a0a,
});

const STYLE_TOOLTIP_TITLE = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 14,
  fill: 0xdaa520,
  fontWeight: "bold",
});

const STYLE_TOOLTIP_MODE = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 11,
  fill: 0xaaaaaa,
  fontStyle: "italic",
});

// "Coming Soon" gets a dimmer, silver-tinted style
const STYLE_TOOLTIP_MODE_COMING_SOON = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 11,
  fill: 0x888899,
  fontStyle: "italic",
});

const STYLE_TOOLTIP_TITLE_COMING_SOON = new TextStyle({
  fontFamily: "Georgia, serif",
  fontSize: 14,
  fill: 0x999999,
  fontWeight: "bold",
});

// ---------------------------------------------------------------------------
// Map data
// ---------------------------------------------------------------------------

interface MapBuilding {
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  mode: GameMode | null;
  type: string;
}

const MAP_BUILDINGS: MapBuilding[] = [
  { id: "castle", x: 480, y: 160, w: 240, h: 180, label: "Castle Keep", mode: GameMode.STANDARD, type: "castle" },
  { id: "barracks", x: 740, y: 180, w: 170, h: 120, label: "Royal Barracks", mode: GameMode.DUEL, type: "barracks" },
  { id: "market", x: 420, y: 420, w: 200, h: 160, label: "Market Square", mode: GameMode.MEDIEVAL_GTA, type: "market" },
  { id: "library", x: 270, y: 200, w: 150, h: 130, label: "Grand Library", mode: GameMode.CAMPAIGN, type: "library" },
  { id: "colosseum", x: 980, y: 500, w: 180, h: 170, label: "The Colosseum", mode: GameMode.COLOSSEUM, type: "colosseum" },
  { id: "gate", x: 540, y: 680, w: 120, h: 70, label: "Southern Gate", mode: GameMode.RPG, type: "gate" },
  { id: "mage_tower", x: 870, y: 300, w: 70, h: 90, label: "Mage Tower", mode: GameMode.WAVE, type: "tower" },
  { id: "tavern", x: 640, y: 500, w: 140, h: 100, label: "The Prancing Pony", mode: GameMode.SURVIVOR, type: "tavern" },
  { id: "docks", x: 850, y: 750, w: 160, h: 70, label: "River Docks", mode: GameMode.WORLD, type: "docks" },
  { id: "training", x: 1000, y: 300, w: 140, h: 110, label: "Training Grounds", mode: GameMode.DEATHMATCH, type: "training" },
  { id: "church", x: 300, y: 400, w: 100, h: 150, label: "Cathedral", mode: GameMode.RIFT_WIZARD, type: "church" },
  { id: "grail_pitch", x: 750, y: 580, w: 140, h: 100, label: "Grail Ball Arena", mode: GameMode.GRAIL_BALL, type: "colosseum" },
  { id: "prison", x: 270, y: 560, w: 110, h: 90, label: "The Dungeon", mode: GameMode.DIABLO, type: "prison" },
  { id: "forge", x: 660, y: 340, w: 100, h: 80, label: "Blacksmith's Forge", mode: GameMode.CAMELOT_CRAFT, type: "forge" },
  { id: "observatory", x: 100, y: 280, w: 80, h: 80, label: "Observatory — 3Dragon", mode: GameMode.THREE_DRAGON, type: "tower" },
  { id: "guild_hall", x: 420, y: 340, w: 100, h: 80, label: "Manager's Guild", mode: GameMode.GRAIL_MANAGER, type: "library" },
  { id: "grail_chapel", x: 300, y: 280, w: 100, h: 100, label: "Grail Chapel", mode: GameMode.ARTHURIAN_RPG, type: "church" },
  { id: "harbor", x: 1050, y: 700, w: 100, h: 80, label: "Harbor Master", mode: GameMode.SETTLERS, type: "harbor" },
  { id: "farm", x: 80, y: 600, w: 120, h: 90, label: "Farmstead", mode: GameMode.CAESAR, type: "farm" },
  { id: "tourney", x: 100, y: 380, w: 150, h: 120, label: "Tournament Grounds", mode: GameMode.WARBAND, type: "training" },
  { id: "fighting_pit", x: 130, y: 680, w: 120, h: 110, label: "The Fighting Pit", mode: GameMode.TEKKEN, type: "colosseum" },
  { id: "eagle_roost", x: 950, y: 160, w: 140, h: 120, label: "The Eagle Roost", mode: GameMode.DRAGOON, type: "tower" },
  { id: "arcane_arena", x: 180, y: 480, w: 140, h: 110, label: "Arcane Battlegrounds", mode: GameMode.MAGE_WARS, type: "tower" },
  { id: "mineshaft", x: 780, y: 460, w: 120, h: 90, label: "The Mineshaft", mode: GameMode.TERRARIA, type: "forge" },
  { id: "throne_room", x: 560, y: 200, w: 130, h: 100, label: "The Throne Room", mode: GameMode.CIVILIZATION, type: "library" },
  { id: "war_tent", x: 1100, y: 440, w: 80, h: 60, label: "War Tent", mode: GameMode.BATTLEFIELD, type: "training" },
  { id: "stable", x: 750, y: 700, w: 90, h: 60, label: "The Stables", mode: GameMode.MEDIEVAL_GTA_3D, type: "barracks" },
  { id: "crypt", x: 400, y: 600, w: 80, h: 70, label: "The Crypt", mode: GameMode.GAME, type: "church" },
  { id: "aviary", x: 1100, y: 220, w: 80, h: 60, label: "The Aviary", mode: GameMode.EAGLE_FLIGHT, type: "tower" },
  { id: "witch_hut", x: 80, y: 480, w: 80, h: 60, label: "Witch's Hut", mode: GameMode.MORGAN, type: "tower" },
];

const CITY = { x: 250, y: 150, w: 700, h: 580 };
const WALL_THICKNESS = 14;
const GATES = {
  north: { x: 600, y: 150, w: 70 },
  south: { x: 600, y: 730, w: 80 },
  east: { x: 950, y: 420, w: 70 },
  west: { x: 250, y: 440, w: 70 },
};

const RIVER = [
  { x: 0, y: 800 }, { x: 100, y: 780 }, { x: 250, y: 760 },
  { x: 400, y: 770 }, { x: 550, y: 800 }, { x: 700, y: 830 },
  { x: 850, y: 810 }, { x: 1000, y: 780 }, { x: 1100, y: 790 }, { x: 1200, y: 770 },
];

const ROADS = [
  [{ x: 600, y: 0 }, { x: 600, y: 150 }, { x: 600, y: 420 }, { x: 600, y: 730 }, { x: 600, y: 900 }],
  [{ x: 0, y: 440 }, { x: 250, y: 440 }, { x: 600, y: 420 }, { x: 950, y: 420 }, { x: 1200, y: 420 }],
  [{ x: 600, y: 340 }, { x: 600, y: 160 }],
  [{ x: 950, y: 420 }, { x: 980, y: 500 }, { x: 1060, y: 580 }],
  [{ x: 950, y: 580 }, { x: 930, y: 750 }],
  [{ x: 950, y: 350 }, { x: 1060, y: 350 }],
  [{ x: 420, y: 500 }, { x: 520, y: 580 }, { x: 620, y: 500 }, { x: 520, y: 420 }, { x: 420, y: 500 }],
];

const HOUSES = [
  { x: 530, y: 350, w: 45, h: 35 }, { x: 580, y: 345, w: 40, h: 40 },
  { x: 500, y: 600, w: 50, h: 35 }, { x: 780, y: 450, w: 45, h: 40 },
  { x: 825, y: 440, w: 35, h: 35 }, { x: 810, y: 490, w: 40, h: 35 },
  { x: 350, y: 500, w: 40, h: 45 }, { x: 400, y: 510, w: 35, h: 35 },
  { x: 690, y: 620, w: 45, h: 35 }, { x: 300, y: 350, w: 35, h: 30 },
  { x: 770, y: 350, w: 40, h: 30 },
  { x: 120, y: 450, w: 50, h: 40 }, { x: 180, y: 480, w: 40, h: 35 },
  { x: 1060, y: 200, w: 45, h: 40 }, { x: 1100, y: 250, w: 40, h: 35 },
  { x: 150, y: 700, w: 45, h: 40 }, { x: 1000, y: 650, w: 40, h: 35 },
];

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Generate trees
// ---------------------------------------------------------------------------

interface TreeData { x: number; y: number; size: number; shade: number; }

function generateTrees(): TreeData[] {
  const rng = seededRandom(42);
  const trees: TreeData[] = [];
  const areas = [
    { cx: 100, cy: 150, r: 120, count: 30 }, { cx: 1100, cy: 130, r: 100, count: 25 },
    { cx: 60, cy: 500, r: 80, count: 15 }, { cx: 150, cy: 800, r: 100, count: 20 },
    { cx: 1100, cy: 850, r: 80, count: 15 }, { cx: 1150, cy: 450, r: 60, count: 10 },
    { cx: 455, cy: 370, r: 30, count: 6 }, { cx: 320, cy: 480, r: 20, count: 4 },
    { cx: 680, cy: 260, r: 25, count: 5 },
  ];
  for (const a of areas) {
    for (let i = 0; i < a.count; i++) {
      const ang = rng() * Math.PI * 2, d = rng() * a.r;
      trees.push({ x: a.cx + Math.cos(ang) * d, y: a.cy + Math.sin(ang) * d, size: 8 + rng() * 10, shade: rng() * 0.3 });
    }
  }
  for (let i = 0; i < 40; i++) {
    const tx = rng() * 1200, ty = rng() * 900;
    if (tx > 260 && tx < 940 && ty > 160 && ty < 720) continue;
    trees.push({ x: tx, y: ty, size: 6 + rng() * 8, shade: rng() * 0.3 });
  }
  return trees;
}

// ---------------------------------------------------------------------------
// Constellation data (seeded for consistency)
// ---------------------------------------------------------------------------

interface StarData { x: number; y: number; size: number; brightness: number; }

function generateConstellations(): { stars: StarData[]; lines: [number, number][] } {
  const rng = seededRandom(777);
  const stars: StarData[] = [];
  const lines: [number, number][] = [];

  // Scatter 60 background stars
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: rng(), y: rng(),
      size: 0.5 + rng() * 1.5,
      brightness: 0.15 + rng() * 0.35,
    });
  }

  // 3 constellation patterns (groups of connected stars)
  const constellations = [
    // Top-left: Orion-like
    [[0.08, 0.12], [0.12, 0.08], [0.15, 0.14], [0.11, 0.18], [0.14, 0.22]],
    // Top-right: Crown
    [[0.82, 0.06], [0.86, 0.04], [0.90, 0.06], [0.92, 0.10], [0.88, 0.12], [0.84, 0.12]],
    // Bottom-left: Sword
    [[0.06, 0.82], [0.08, 0.86], [0.10, 0.90], [0.09, 0.94], [0.12, 0.88]],
  ];

  for (const cons of constellations) {
    const startIdx = stars.length;
    for (const [x, y] of cons) {
      stars.push({ x, y, size: 1.5 + rng() * 1.0, brightness: 0.4 + rng() * 0.3 });
    }
    // Connect sequentially
    for (let i = 0; i < cons.length - 1; i++) {
      lines.push([startIdx + i, startIdx + i + 1]);
    }
  }

  return { stars, lines };
}

const CONSTELLATION_DATA = generateConstellations();

// ---------------------------------------------------------------------------
// Wall towers
// ---------------------------------------------------------------------------

interface TowerData { x: number; y: number; s: number; }

function getWallTowers(): TowerData[] {
  const c = CITY;
  return [
    { x: c.x, y: c.y, s: 22 }, { x: c.x + c.w, y: c.y, s: 22 },
    { x: c.x, y: c.y + c.h, s: 22 }, { x: c.x + c.w, y: c.y + c.h, s: 22 },
    { x: c.x + c.w * 0.3, y: c.y, s: 16 }, { x: c.x + c.w * 0.7, y: c.y, s: 16 },
    { x: c.x + c.w * 0.3, y: c.y + c.h, s: 16 }, { x: c.x + c.w * 0.7, y: c.y + c.h, s: 16 },
    { x: c.x + c.w, y: c.y + c.h * 0.3, s: 16 }, { x: c.x + c.w, y: c.y + c.h * 0.7, s: 16 },
    { x: c.x, y: c.y + c.h * 0.3, s: 16 }, { x: c.x, y: c.y + c.h * 0.7, s: 16 },
  ];
}

// ---------------------------------------------------------------------------
// LRU Renderer Cache
// ---------------------------------------------------------------------------

interface RendererEntry {
  type: string;
  renderer: { container: Container; tick(dt: number, phase: GamePhase): void };
  lastUsed: number;
}

const LRU_MAX = 4;

// ---------------------------------------------------------------------------
// CamelotHubScreen
// ---------------------------------------------------------------------------

export class CamelotHubScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _constellationGfx!: Graphics;
  private _particles!: AmbientParticles;
  private _runes!: RuneCorners;
  private _mapContainer!: Container;  // holds the parchment map (scaled to fit)
  private _mapGfx!: Graphics;
  private _mapAnimGfx!: Graphics;     // animated overlay (river ripples, torches)
  private _hoveredBuilding: MapBuilding | null = null;
  private _tooltip!: Container;
  private _tooltipTitle!: Text;
  private _tooltipMode!: Text;
  private _tooltipPreview!: Graphics;
  private _tooltipBg!: Graphics;
  private _tooltipDivider!: Graphics;
  private _tooltipVignette!: Graphics;
  private _compassContainer!: Container;
  private _compassGlow!: Graphics;
  private _compassTime = 0;
  private _compassHovered = false;
  private _tickerFn: ((ticker: Ticker) => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

  // Tooltip fade-in animation
  private _tooltipFadeT = 0;
  private _tooltipFading = false;
  private static readonly TOOLTIP_FADE_DURATION = 0.15; // seconds

  // Animated building preview in tooltip
  private _previewRenderer: { container: Container; tick(dt: number, phase: GamePhase): void } | null = null;
  private _previewContainer!: Container;
  private _previewParticles!: AmbientParticles;
  private _previewMask!: Graphics;

  // LRU renderer cache
  private _rendererCache: RendererEntry[] = [];
  private _cacheCounter = 0;

  private _treesData: TreeData[] = [];
  private _wallTowers: TowerData[] = [];

  // Map dimensions (logical)
  private readonly MW = 1200;
  private readonly MH = 900;

  // Callbacks
  onSelectMode: ((mode: GameMode) => void) | null = null;
  onOpenMenu: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this._treesData = generateTrees();
    this._wallTowers = getWallTowers();

    // Dark background (full screen, drawn in _layout)
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Constellation patterns in the dark border area
    this._constellationGfx = new Graphics();
    this.container.addChild(this._constellationGfx);

    // Ambient floating particles (same as menu screen)
    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);

    // Rune corners
    this._runes = new RuneCorners();
    this.container.addChild(this._runes.container);

    // Map sub-container — holds the 1200x900 parchment, scaled to fit
    this._mapContainer = new Container();
    this._mapContainer.eventMode = "static";
    this.container.addChild(this._mapContainer);

    // Map graphics layer
    this._mapGfx = new Graphics();
    this._mapContainer.addChild(this._mapGfx);

    // Animated map overlay (river ripples, torch flickers, flag waving)
    this._mapAnimGfx = new Graphics();
    this._mapContainer.addChild(this._mapAnimGfx);

    // Tooltip (on the map container so it scales with it)
    this._tooltip = new Container();
    this._tooltip.visible = false;
    this._tooltip.alpha = 0;
    this._tooltipBg = new Graphics();
    this._tooltip.addChild(this._tooltipBg);
    this._tooltipTitle = new Text({ text: "", style: STYLE_TOOLTIP_TITLE });
    this._tooltipTitle.position.set(10, 8);
    this._tooltip.addChild(this._tooltipTitle);
    this._tooltipMode = new Text({ text: "", style: STYLE_TOOLTIP_MODE });
    this._tooltipMode.position.set(10, 28);
    this._tooltip.addChild(this._tooltipMode);

    // Gold divider line between text and preview
    this._tooltipDivider = new Graphics();
    this._tooltipDivider.position.set(10, 46);
    this._tooltip.addChild(this._tooltipDivider);

    this._tooltipPreview = new Graphics();
    this._tooltipPreview.position.set(10, 52);
    this._tooltip.addChild(this._tooltipPreview);
    this._previewContainer = new Container();
    this._previewContainer.position.set(10, 52);
    // Mask so particles + building don't overflow the preview area
    this._previewMask = new Graphics().rect(0, 0, 180, 136).fill({ color: 0xffffff });
    this._previewContainer.addChild(this._previewMask);
    this._previewContainer.mask = this._previewMask;
    // Ambient particles inside preview — only in the dark sky area (top 70%)
    this._previewParticles = new AmbientParticles(20);
    this._previewParticles.resize(180, 136 * 0.7);
    this._previewContainer.addChild(this._previewParticles.container);
    this._tooltip.addChild(this._previewContainer);

    // Inner vignette overlay on the preview area
    this._tooltipVignette = new Graphics();
    this._tooltipVignette.position.set(10, 52);
    this._tooltip.addChild(this._tooltipVignette);

    this._mapContainer.addChild(this._tooltip);

    // Compass rose interactive area (on map container)
    this._compassContainer = new Container();
    this._compassContainer.eventMode = "static";
    this._compassContainer.cursor = "pointer";
    this._compassGlow = new Graphics();
    this._compassContainer.addChild(this._compassGlow);
    this._compassContainer.on("pointerdown", () => {
      this.onOpenMenu?.();
    });
    this._compassContainer.on("pointerover", () => {
      this._compassHovered = true;
      // Clear any building hover
      if (this._hoveredBuilding) {
        this._hoveredBuilding = null;
        this._drawMap();
      }
      this._showCompassTooltip();
    });
    this._compassContainer.on("pointerout", () => {
      this._compassHovered = false;
      this._tooltip.visible = false;
      this._tooltipFading = false;
      this._detachPreviewRenderer();
    });
    this._mapContainer.addChild(this._compassContainer);

    // Interaction on map container
    this._mapContainer.on("pointermove", (e) => this._onPointerMove(e));
    this._mapContainer.on("pointerdown", (e) => this._onPointerDown(e));

    vm.addToLayer("ui", this.container);

    this._tickerFn = (ticker) => {
      if (!this.container.visible) return;
      const dt = ticker.deltaMS / 1000;
      this._compassTime += dt;
      this._drawCompassGlow();
      this._drawMapAnimations();
      this._drawConstellations();
      this._particles.update(dt);
      this._runes.update(dt);

      // Tooltip fade-in animation
      if (this._tooltipFading && this._tooltip.visible) {
        this._tooltipFadeT += dt;
        const progress = Math.min(this._tooltipFadeT / CamelotHubScreen.TOOLTIP_FADE_DURATION, 1);
        // Ease out quad
        const ease = 1 - (1 - progress) * (1 - progress);
        this._tooltip.alpha = ease;
        this._tooltip.scale.set(0.95 + 0.05 * ease);
        if (progress >= 1) {
          this._tooltipFading = false;
        }
      }

      if (this._tooltip.visible) {
        this._previewParticles.update(dt);
        if (this._previewRenderer) {
          this._previewRenderer.tick(dt, GamePhase.PREP);
        }
      }
    };
    vm.app.ticker.add(this._tickerFn);

    this._onKeyDown = (e: KeyboardEvent) => {
      if (!this.container.visible) return;
      if (e.key === "Escape") {
        this.onOpenMenu?.();
      }
    };
    window.addEventListener("keydown", this._onKeyDown);

    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._drawMap();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
    this._tooltip.visible = false;
    this._hoveredBuilding = null;
    this._detachPreviewRenderer();
  }

  destroy(): void {
    this._detachPreviewRenderer();
    this._destroyRendererCache();
    if (this._tickerFn) this._vm.app.ticker.remove(this._tickerFn);
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    this.container.removeFromParent();
  }

  // ---------------------------------------------------------------------------
  // Layout — dark bg fills screen, map scaled to fit with padding
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Full-screen dark background (same as old menu)
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: 0x0a0a18 });

    // Resize particles to screen
    this._particles.resize(sw, sh);

    // Scale the 1200x900 map to fit with padding (40px on each side)
    const pad = 40;
    const availW = sw - pad * 2;
    const availH = sh - pad * 2;
    const scaleX = availW / this.MW;
    const scaleY = availH / this.MH;
    const scale = Math.min(scaleX, scaleY); // fit, don't crop
    const mapScreenW = this.MW * scale;
    const mapScreenH = this.MH * scale;
    const mapX = Math.floor((sw - mapScreenW) / 2);
    const mapY = Math.floor((sh - mapScreenH) / 2);
    this._mapContainer.scale.set(scale);
    this._mapContainer.x = mapX;
    this._mapContainer.y = mapY;

    // Rune corners around the map border
    this._runes.build(mapScreenW, mapScreenH);
    this._runes.container.position.set(mapX, mapY);

    // Compass position (top-right of map)
    this._compassContainer.position.set(this.MW - 70, 70);

    // Redraw compass glow
    this._compassGlow.clear();
    this._drawCompassGlow();

    // Draw constellations
    this._drawConstellations();
  }

  // ---------------------------------------------------------------------------
  // Constellation patterns in the dark border
  // ---------------------------------------------------------------------------

  private _drawConstellations(): void {
    const g = this._constellationGfx;
    g.clear();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    const t = this._compassTime;

    const { stars, lines } = CONSTELLATION_DATA;

    // Draw constellation lines first (behind stars)
    for (const [a, b] of lines) {
      const sa = stars[a], sb = stars[b];
      const twinkleA = 0.06 + 0.04 * Math.sin(t * 0.5 + a * 1.3);
      g.moveTo(sa.x * sw, sa.y * sh).lineTo(sb.x * sw, sb.y * sh)
        .stroke({ color: 0x6688cc, width: 0.5, alpha: twinkleA });
    }

    // Draw stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      // Subtle twinkle
      const twinkle = s.brightness * (0.6 + 0.4 * Math.sin(t * (1.0 + i * 0.17) + i * 2.1));
      g.circle(s.x * sw, s.y * sh, s.size).fill({ color: 0xccddff, alpha: twinkle });
    }
  }

  // ---------------------------------------------------------------------------
  // Pointer handling
  // ---------------------------------------------------------------------------

  private _getMapCoords(e: { global: { x: number; y: number } }): { mx: number; my: number } {
    const local = this._mapContainer.toLocal(e.global);
    return { mx: local.x, my: local.y };
  }

  private _hitTestBuilding(mx: number, my: number): MapBuilding | null {
    for (const b of MAP_BUILDINGS) {
      if (b.type === "colosseum") {
        const dx = mx - (b.x + b.w / 2), dy = my - (b.y + b.h / 2);
        if (dx * dx / (b.w * b.w / 4) + dy * dy / (b.h * b.h / 4) <= 1) return b;
      } else {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b;
      }
    }
    return null;
  }

  private _onPointerMove(e: { global: { x: number; y: number } }): void {
    const { mx, my } = this._getMapCoords(e);
    const hit = this._hitTestBuilding(mx, my);

    // Update cursor based on what we're hovering
    if (hit) {
      this._mapContainer.cursor = hit.mode ? "pointer" : "help";
    } else {
      this._mapContainer.cursor = "default";
    }

    if (hit !== this._hoveredBuilding) {
      this._hoveredBuilding = hit;
      this._drawMap();
      if (hit) {
        this._showTooltip(hit, mx, my);
      } else if (!this._compassHovered) {
        // Don't hide tooltip if the compass hover is active
        this._tooltip.visible = false;
        this._tooltipFading = false;
        this._detachPreviewRenderer();
      }
    } else if (hit) {
      this._positionTooltip(mx, my);
    }
  }

  private _onPointerDown(e: { global: { x: number; y: number } }): void {
    const { mx, my } = this._getMapCoords(e);
    const hit = this._hitTestBuilding(mx, my);
    if (hit && hit.mode) {
      this.onSelectMode?.(hit.mode);
    }
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _showTooltip(b: MapBuilding, mx: number, my: number): void {
    const isComingSoon = !b.mode;

    this._tooltipTitle.text = b.label;
    this._tooltipTitle.style = isComingSoon ? STYLE_TOOLTIP_TITLE_COMING_SOON : STYLE_TOOLTIP_TITLE;
    this._tooltipMode.text = b.mode ? "\u25b6 " + this._modeLabel(b.mode) : "Coming Soon";
    this._tooltipMode.style = isComingSoon ? STYLE_TOOLTIP_MODE_COMING_SOON : STYLE_TOOLTIP_MODE;
    this._drawBuildingPreview(b);

    const tw = 200, th = 200;
    const borderColor = isComingSoon ? 0x888899 : 0xdaa520;
    const bgAlpha = isComingSoon ? 0.88 : 0.95;
    this._tooltipBg.clear()
      .roundRect(0, 0, tw, th, 6)
      .fill({ color: 0x1e190f, alpha: bgAlpha })
      .roundRect(0, 0, tw, th, 6)
      .stroke({ color: borderColor, width: 2 });

    // Gold divider line between text area and preview
    const dividerColor = isComingSoon ? 0x666677 : 0xdaa520;
    this._tooltipDivider.clear()
      .moveTo(0, 0).lineTo(180, 0)
      .stroke({ color: dividerColor, width: 1, alpha: 0.5 });

    // Inner vignette overlay on preview
    this._drawPreviewVignette();

    // Fade-in animation: start from alpha=0, scale=0.95
    this._tooltip.alpha = 0;
    this._tooltip.scale.set(0.95);
    this._tooltipFadeT = 0;
    this._tooltipFading = true;

    this._tooltip.visible = true;
    this._positionTooltip(mx, my);
  }

  private _drawPreviewVignette(): void {
    const g = this._tooltipVignette;
    g.clear();
    const pw = 180, ph = 136;
    // Dark edges (top, bottom, left, right) — subtle inner shadow
    const vigSize = 18;
    // Top
    g.rect(0, 0, pw, vigSize).fill({ color: 0x000000, alpha: 0.3 });
    // Bottom
    g.rect(0, ph - vigSize, pw, vigSize).fill({ color: 0x000000, alpha: 0.25 });
    // Left
    g.rect(0, 0, vigSize, ph).fill({ color: 0x000000, alpha: 0.2 });
    // Right
    g.rect(pw - vigSize, 0, vigSize, ph).fill({ color: 0x000000, alpha: 0.2 });
  }

  private _showCompassTooltip(): void {
    this._tooltipTitle.text = "House";
    this._tooltipTitle.style = STYLE_TOOLTIP_TITLE;
    this._tooltipMode.text = "\u25b6 Main Menu";
    this._tooltipMode.style = STYLE_TOOLTIP_MODE;

    // Draw preview with the hamlet (house) renderer
    this._drawCompassPreview();

    const tw = 200, th = 200;
    this._tooltipBg.clear()
      .roundRect(0, 0, tw, th, 6)
      .fill({ color: 0x1e190f, alpha: 0.95 })
      .roundRect(0, 0, tw, th, 6)
      .stroke({ color: 0xdaa520, width: 2 });

    this._tooltipDivider.clear()
      .moveTo(0, 0).lineTo(180, 0)
      .stroke({ color: 0xdaa520, width: 1, alpha: 0.5 });

    this._drawPreviewVignette();

    // Fade-in
    this._tooltip.alpha = 0;
    this._tooltip.scale.set(0.95);
    this._tooltipFadeT = 0;
    this._tooltipFading = true;

    this._tooltip.visible = true;
    // Position to the left of the compass
    const compassX = this.MW - 70;
    const compassY = 70;
    this._tooltip.position.set(compassX - 220, compassY - 10);
  }

  private _drawCompassPreview(): void {
    const g = this._tooltipPreview;
    g.clear();
    const pw = 180, ph = 136;

    g.rect(0, 0, pw, ph).fill({ color: 0x0a0a18 });

    // Ground plane with gradient
    const groundY = ph * 0.7;
    const groundH = ph * 0.3;
    const strips = 6;
    for (let i = 0; i < strips; i++) {
      const t = i / strips;
      const stripY = groundY + groundH * t;
      const stripH = groundH / strips + 1;
      const alpha = 0.5 + t * 0.3;
      g.rect(0, stripY, pw, stripH).fill({ color: 0x2a3a1a, alpha });
    }
    g.moveTo(0, groundY).lineTo(pw, groundY).stroke({ color: 0x4a6a2a, width: 1, alpha: 0.6 });

    // Grass blades
    const grassRng = seededRandom(999);
    for (let i = 0; i < 30; i++) {
      const gx = grassRng() * pw;
      const gy = groundY + grassRng() * groundH * 0.5;
      const gh = 3 + grassRng() * 5;
      const lean = (grassRng() - 0.5) * 4;
      g.moveTo(gx, gy).lineTo(gx + lean, gy - gh)
        .stroke({ color: 0x4a7a2a, width: 0.5, alpha: 0.4 + grassRng() * 0.3 });
    }

    this._detachPreviewRenderer();

    // Use House1Renderer (Peasant's Cottage)
    const renderer = this._getOrCreateRenderer("house1");
    if (renderer) {
      this._previewRenderer = renderer;
      const rc = renderer.container;
      const bounds = rc.getLocalBounds();
      const bw = bounds.width || 128;
      const bh = bounds.height || 128;
      const fitW = pw - 10;
      const fitH = ph - 10;
      const scale = Math.min(fitW / bw, fitH / bh, 1.2);
      rc.scale.set(scale);
      rc.x = (pw - bw * scale) / 2 - bounds.x * scale;
      rc.y = (ph - bh * scale) / 2 - bounds.y * scale;
      this._previewContainer.addChild(rc);
    }
  }

  private _positionTooltip(mx: number, my: number): void {
    let tx = mx + 15;
    let ty = my - 10;
    if (tx + 210 > this.MW) tx = mx - 215;
    if (ty + 210 > this.MH) ty = this.MH - 210;
    if (ty < 0) ty = 0;
    this._tooltip.position.set(tx, ty);
  }

  private _modeLabel(mode: GameMode): string {
    const labels: Record<string, string> = {
      [GameMode.STANDARD]: "Standard / Battlefield",
      [GameMode.DUEL]: "Duel",
      [GameMode.MEDIEVAL_GTA]: "Medieval GTA",
      [GameMode.CAMPAIGN]: "Campaign",
      [GameMode.COLOSSEUM]: "Colosseum",
      [GameMode.RPG]: "RPG",
      [GameMode.WAVE]: "Wave",
      [GameMode.SURVIVOR]: "Survivor",
      [GameMode.WORLD]: "World",

      [GameMode.WARBAND]: "Warband",
      [GameMode.DRAGOON]: "Panzer Dragoon",
      [GameMode.THREE_DRAGON]: "3Dragon",
      [GameMode.GRAIL_BALL]: "Grail Ball",
      [GameMode.GRAIL_MANAGER]: "Grail Ball Manager",
      [GameMode.ARTHURIAN_RPG]: "The Quest for the Holy Grail - 3D Arthurian RPG",
      [GameMode.TEKKEN]: "Fighter",
      [GameMode.MAGE_WARS]: "Mage Wars",
      [GameMode.TERRARIA]: "Camelot Dig",
      [GameMode.CIVILIZATION]: "Arthurian Civ",
      [GameMode.DEATHMATCH]: "Deathmatch",
      [GameMode.RIFT_WIZARD]: "Rift Wizard",
      [GameMode.DIABLO]: "Diablo",
      [GameMode.CAMELOT_CRAFT]: "Camelot Craft",
      [GameMode.SETTLERS]: "Settlers",
      [GameMode.CAESAR]: "Medieval Caesar",
      [GameMode.BATTLEFIELD]: "Battlefield",
      [GameMode.MEDIEVAL_GTA_3D]: "GTA 3D",
      [GameMode.GAME]: "Quest for the Grail",
      [GameMode.EAGLE_FLIGHT]: "Eagle Flight",
      [GameMode.MORGAN]: "Morgan",
    };
    return labels[mode] || mode;
  }

  // ---------------------------------------------------------------------------
  // Building preview in tooltip
  // ---------------------------------------------------------------------------

  private _drawBuildingPreview(b: MapBuilding): void {
    const g = this._tooltipPreview;
    g.clear();
    const pw = 180, ph = 136;

    // Dark background matching the menu's night sky
    g.rect(0, 0, pw, ph).fill({ color: 0x0a0a18 });

    // Ground plane with gradient effect (multiple strips fading from dark to green)
    const groundY = ph * 0.7;
    const groundH = ph * 0.3;
    const strips = 6;
    for (let i = 0; i < strips; i++) {
      const t = i / strips;
      const stripY = groundY + groundH * t;
      const stripH = groundH / strips + 1;
      // Blend from dark earth to green
      const alpha = 0.5 + t * 0.3;
      g.rect(0, stripY, pw, stripH).fill({ color: 0x2a3a1a, alpha });
    }
    // Subtle horizon line
    g.moveTo(0, groundY).lineTo(pw, groundY).stroke({ color: 0x4a6a2a, width: 1, alpha: 0.6 });

    // Grass blade strokes
    const grassRng = seededRandom(b.id.length * 13 + 99);
    for (let i = 0; i < 30; i++) {
      const gx = grassRng() * pw;
      const gy = groundY + grassRng() * groundH * 0.5;
      const gh = 3 + grassRng() * 5;
      const lean = (grassRng() - 0.5) * 4;
      g.moveTo(gx, gy).lineTo(gx + lean, gy - gh)
        .stroke({ color: 0x4a7a2a, width: 0.5, alpha: 0.4 + grassRng() * 0.3 });
    }
    // Ground dots (pebbles/texture)
    for (let i = 0; i < 12; i++) {
      const dx = grassRng() * pw;
      const dy = groundY + 4 + grassRng() * (groundH - 8);
      g.circle(dx, dy, 0.5 + grassRng() * 1).fill({ color: 0x1a2a0a, alpha: 0.3 });
    }

    // Detach previous renderer (back to cache)
    this._detachPreviewRenderer();

    // Get renderer from cache or create new one
    const renderer = this._getOrCreateRenderer(b.type);
    if (renderer) {
      this._previewRenderer = renderer;
      const rc = renderer.container;

      // Get the renderer's natural bounds to compute scale
      const bounds = rc.getLocalBounds();
      const bw = bounds.width || 128;
      const bh = bounds.height || 128;

      // Scale to fit in the preview area with some padding
      const fitW = pw - 10;
      const fitH = ph - 10;
      const scale = Math.min(fitW / bw, fitH / bh, 1.2);
      rc.scale.set(scale);

      // Center in preview area
      rc.x = (pw - bw * scale) / 2 - bounds.x * scale;
      rc.y = (ph - bh * scale) / 2 - bounds.y * scale;

      this._previewContainer.addChild(rc);
    }
  }

  private _createRendererForType(type: string): { container: Container; tick(dt: number, phase: GamePhase): void } | null {
    switch (type) {
      case "castle":    return new CastleRenderer(null);
      case "barracks":  return new BarracksRenderer(null);
      case "market":    return new MarketRenderer(null);
      case "library":   return new ArchiveRenderer(null);
      case "colosseum": return new EliteHallRenderer(null);
      case "gate":      return new TowerRenderer(null);
      case "tower":     return new MageTowerRenderer(null);
      case "tavern":    return new HamletRenderer(null);
      case "docks":     return new MillRenderer(null);
      case "training":  return new ArcheryRangeRenderer(null);
      case "church":    return new TempleRenderer(null);
      case "stable":    return new StableRenderer(null);
      case "prison":    return new CreatureDenRenderer(null);
      case "forge":     return new BlacksmithRenderer(null);
      case "garden":    return new FarmRenderer(null);
      case "harbor":    return new EmbassyRenderer(null);
      case "farm":      return new FarmRenderer(null);
      case "house1":    return new House1Renderer(null);
      default:          return null;
    }
  }

  // --- LRU renderer cache ---

  private _getOrCreateRenderer(type: string): { container: Container; tick(dt: number, phase: GamePhase): void } | null {
    // Check cache first
    const cached = this._rendererCache.find(e => e.type === type);
    if (cached) {
      cached.lastUsed = ++this._cacheCounter;
      return cached.renderer;
    }

    // Create new
    const renderer = this._createRendererForType(type);
    if (!renderer) return null;

    // Evict LRU if at capacity
    if (this._rendererCache.length >= LRU_MAX) {
      // Find least recently used
      let lruIdx = 0;
      for (let i = 1; i < this._rendererCache.length; i++) {
        if (this._rendererCache[i].lastUsed < this._rendererCache[lruIdx].lastUsed) {
          lruIdx = i;
        }
      }
      const evicted = this._rendererCache.splice(lruIdx, 1)[0];
      evicted.renderer.container.removeFromParent();
      evicted.renderer.container.destroy({ children: true });
    }

    this._rendererCache.push({ type, renderer, lastUsed: ++this._cacheCounter });
    return renderer;
  }

  private _detachPreviewRenderer(): void {
    if (this._previewRenderer) {
      this._previewRenderer.container.removeFromParent();
      this._previewRenderer = null;
    }
  }

  private _destroyRendererCache(): void {
    for (const entry of this._rendererCache) {
      entry.renderer.container.removeFromParent();
      entry.renderer.container.destroy({ children: true });
    }
    this._rendererCache = [];
  }

  // ---------------------------------------------------------------------------
  // Compass glow (flickers)
  // ---------------------------------------------------------------------------

  private _drawCompassGlow(): void {
    const g = this._compassGlow;
    g.clear();
    const t = this._compassTime;
    const flicker = 0.4 + 0.3 * Math.sin(t * 2.5) + 0.15 * Math.sin(t * 7.3) + 0.1 * Math.sin(t * 13.1);

    // Subtle shimmer ring (no big yellow circles)
    g.circle(0, 0, 42).stroke({ color: 0xdaa520, width: 0.5, alpha: flicker * 0.15 });

    // Hit area (invisible)
    g.circle(0, 0, 40).fill({ color: 0x000000, alpha: 0.001 });
  }

  // ---------------------------------------------------------------------------
  // Animated map overlay (river ripples, torch flickers, castle flag)
  // ---------------------------------------------------------------------------

  private _drawMapAnimations(): void {
    const g = this._mapAnimGfx;
    g.clear();
    const t = this._compassTime;

    // --- Animated river wave lines ---
    for (let wy = 785; wy < 900; wy += 12) {
      for (let wx = 0; wx < 1200; wx += 20) {
        const phase = t * 1.5; // slow drift
        const y = wy + Math.sin(wx * 0.04 + wy * 0.1 + phase) * 3;
        const y2 = wy + Math.sin((wx + 10) * 0.04 + wy * 0.1 + phase) * 3;
        g.moveTo(wx, y).lineTo(wx + 10, y2);
      }
      g.stroke({ color: 0x3c5078, width: 0.5, alpha: 0.15 + 0.05 * Math.sin(t * 0.8 + wy * 0.01) });
    }

    // --- Flickering torches near gates ---
    const torchPositions = [
      { x: GATES.south.x - 35, y: GATES.south.y - 10 },
      { x: GATES.south.x + 35, y: GATES.south.y - 10 },
      { x: GATES.north.x - 30, y: GATES.north.y + 5 },
      { x: GATES.north.x + 30, y: GATES.north.y + 5 },
    ];

    for (let i = 0; i < torchPositions.length; i++) {
      const tp = torchPositions[i];
      const flicker = 0.5 + 0.3 * Math.sin(t * 8 + i * 2.3) + 0.2 * Math.sin(t * 13 + i * 4.1);
      // Flame glow
      g.circle(tp.x, tp.y - 6, 6).fill({ color: 0xff8800, alpha: flicker * 0.12 });
      g.circle(tp.x, tp.y - 6, 3).fill({ color: 0xffcc00, alpha: flicker * 0.2 });
      // Torch body (small line)
      g.moveTo(tp.x, tp.y).lineTo(tp.x, tp.y - 4).stroke({ color: 0x2a1a0a, width: 1.5 });
      // Flame tip
      g.circle(tp.x, tp.y - 5, 1.5).fill({ color: 0xffdd44, alpha: flicker * 0.6 });
    }

    // --- Tiny flag on castle ---
    const flagX = 600, flagBaseY = 155;
    const flagWave = Math.sin(t * 3.5) * 4;
    const flagWave2 = Math.sin(t * 3.5 + 0.5) * 3;
    // Pole
    g.moveTo(flagX, flagBaseY).lineTo(flagX, flagBaseY - 18).stroke({ color: 0x2a1a0a, width: 1 });
    // Flag shape (waving pennant)
    g.moveTo(flagX, flagBaseY - 18)
      .lineTo(flagX + 12 + flagWave, flagBaseY - 15 + flagWave2 * 0.3)
      .lineTo(flagX + 10 + flagWave * 0.7, flagBaseY - 12)
      .lineTo(flagX, flagBaseY - 12)
      .closePath()
      .fill({ color: 0xaa2222, alpha: 0.7 });
    g.moveTo(flagX, flagBaseY - 18)
      .lineTo(flagX + 12 + flagWave, flagBaseY - 15 + flagWave2 * 0.3)
      .lineTo(flagX + 10 + flagWave * 0.7, flagBaseY - 12)
      .lineTo(flagX, flagBaseY - 12)
      .closePath()
      .stroke({ color: 0x2a1a0a, width: 0.5 });

    // --- Castle Keep subtle blink (ambient glow breathing) ---
    const castleB = MAP_BUILDINGS[0]; // Castle Keep
    const castleCx = castleB.x + castleB.w / 2;
    const castleCy = castleB.y + castleB.h / 2;
    const blink = 0.03 + 0.025 * Math.sin(t * 1.8) + 0.015 * Math.sin(t * 4.3);
    g.circle(castleCx, castleCy, 90).fill({ color: 0xdaa520, alpha: blink });
    g.circle(castleCx, castleCy, 55).fill({ color: 0xdaa520, alpha: blink * 0.6 });
  }

  // ---------------------------------------------------------------------------
  // Draw the complete map (Canvas2D-style using PixiJS Graphics)
  // ---------------------------------------------------------------------------

  private _drawMap(): void {
    const g = this._mapGfx;
    g.clear();
    const rng = seededRandom(400);

    // --- Parchment background ---
    g.rect(0, 0, this.MW, this.MH).fill({ color: 0xe8d8b8 });

    // Paper texture spots
    for (let i = 0; i < 800; i++) {
      const x = rng() * this.MW, y = rng() * this.MH;
      g.rect(x, y, 2 + rng() * 4, 2 + rng() * 3).fill({ color: 0xc8b898, alpha: 0.15 + rng() * 0.1 });
    }

    // Age stains
    for (let i = 0; i < 6; i++) {
      const sx = rng() * this.MW, sy = rng() * this.MH;
      g.circle(sx, sy, 30 + rng() * 60).fill({ color: 0xa08860, alpha: 0.04 });
    }

    // --- Farmland outside walls ---
    const farms = [{ x: 30, y: 580, w: 160, h: 120 }, { x: 50, y: 720, w: 120, h: 80 }, { x: 1020, y: 100, w: 130, h: 90 }];
    for (const f of farms) {
      for (let row = 0; row < f.h; row += 4) {
        g.moveTo(f.x, f.y + row).lineTo(f.x + f.w, f.y + row).stroke({ color: 0x2a1a0a, width: 0.3, alpha: 0.3 });
      }
      g.rect(f.x, f.y, f.w, f.h).stroke({ color: 0x2a1a0a, width: 1, alpha: 0.4 });
    }

    // --- River (static part — bank line and fill) ---
    const rp = RIVER;
    g.moveTo(rp[0].x, rp[0].y);
    for (let i = 1; i < rp.length; i++) g.lineTo(rp[i].x, rp[i].y);
    g.lineTo(this.MW, this.MH).lineTo(0, this.MH).closePath();
    g.fill({ color: 0x3c5078, alpha: 0.15 });

    // Bank line
    g.moveTo(rp[0].x, rp[0].y);
    for (let i = 1; i < rp.length; i++) g.lineTo(rp[i].x, rp[i].y);
    g.stroke({ color: 0x2a1a0a, width: 2 });

    // Static wave lines removed — now animated in _drawMapAnimations

    // --- Roads ---
    for (const road of ROADS) {
      g.moveTo(road[0].x, road[0].y);
      for (let i = 1; i < road.length; i++) g.lineTo(road[i].x, road[i].y);
      g.stroke({ color: 0x2a1a0a, width: 3, alpha: 0.4 });
    }

    // --- City interior wash ---
    g.rect(CITY.x + WALL_THICKNESS, CITY.y + WALL_THICKNESS,
      CITY.w - WALL_THICKNESS * 2, CITY.h - WALL_THICKNESS * 2)
      .fill({ color: 0xdab98c, alpha: 0.2 });

    // --- Walls ---
    this._drawWalls(g);

    // --- Trees ---
    for (const tree of this._treesData) {
      g.circle(tree.x, tree.y, tree.size * 0.5)
        .fill({ color: 0x3c5020, alpha: 0.2 })
        .circle(tree.x, tree.y, tree.size * 0.5)
        .stroke({ color: 0x2a1a0a, width: 0.8 });
    }

    // --- Small houses ---
    for (const h of HOUSES) {
      g.rect(h.x, h.y, h.w, h.h)
        .fill({ color: 0xbea880, alpha: 0.15 })
        .rect(h.x, h.y, h.w, h.h)
        .stroke({ color: 0x2a1a0a, width: 0.8 });
    }

    // --- Main buildings ---
    this._drawBuildings(g, rng);

    // --- Ornate gold border ---
    g.rect(12, 12, this.MW - 24, this.MH - 24).stroke({ color: 0xdaa520, width: 4 });
    g.rect(20, 20, this.MW - 40, this.MH - 40).stroke({ color: 0xdaa520, width: 2 });

    // Border fill between
    g.rect(12, 12, this.MW - 24, 10).fill({ color: 0xdaa520, alpha: 0.08 });
    g.rect(12, this.MH - 22, this.MW - 24, 10).fill({ color: 0xdaa520, alpha: 0.08 });
    g.rect(12, 12, 10, this.MH - 24).fill({ color: 0xdaa520, alpha: 0.08 });
    g.rect(this.MW - 22, 12, 10, this.MH - 24).fill({ color: 0xdaa520, alpha: 0.08 });

    // Corner medallions
    for (const [cx, cy] of [[30, 30], [this.MW - 30, 30], [30, this.MH - 30], [this.MW - 30, this.MH - 30]]) {
      g.circle(cx, cy, 14).fill({ color: 0xdaa520 });
      g.circle(cx, cy, 10).fill({ color: 0xaa2222 });
      g.circle(cx, cy, 6).fill({ color: 0xdaa520 });
    }

    // Side medallions
    for (const [sx, sy] of [[this.MW / 2, 18], [this.MW / 2, this.MH - 18], [18, this.MH / 2], [this.MW - 18, this.MH / 2]]) {
      g.circle(sx, sy, 10).fill({ color: 0xdaa520 });
      g.circle(sx, sy, 6).fill({ color: 0x2244aa });
    }

    // --- Compass rose ---
    this._drawCompass(g, this.MW - 70, 70);

    // --- Title ---
    // Done with Text objects in a separate container for crispness
    this._drawTitleOverlay();
  }

  private _drawWalls(g: Graphics): void {
    const c = CITY, wt = WALL_THICKNESS;
    const gN = GATES.north, gS = GATES.south, gE = GATES.east, gW = GATES.west;
    const wallColor = 0x50402a;
    const wallAlpha = 0.3;

    // N
    g.rect(c.x, c.y, gN.x - gN.w / 2 - c.x, wt).fill({ color: wallColor, alpha: wallAlpha });
    g.rect(gN.x + gN.w / 2, c.y, c.x + c.w - gN.x - gN.w / 2, wt).fill({ color: wallColor, alpha: wallAlpha });
    // S
    g.rect(c.x, c.y + c.h - wt, gS.x - gS.w / 2 - c.x, wt).fill({ color: wallColor, alpha: wallAlpha });
    g.rect(gS.x + gS.w / 2, c.y + c.h - wt, c.x + c.w - gS.x - gS.w / 2, wt).fill({ color: wallColor, alpha: wallAlpha });
    // W
    g.rect(c.x, c.y, wt, gW.y - gW.w / 2 - c.y).fill({ color: wallColor, alpha: wallAlpha });
    g.rect(c.x, gW.y + gW.w / 2, wt, c.y + c.h - gW.y - gW.w / 2).fill({ color: wallColor, alpha: wallAlpha });
    // E
    g.rect(c.x + c.w - wt, c.y, wt, gE.y - gE.w / 2 - c.y).fill({ color: wallColor, alpha: wallAlpha });
    g.rect(c.x + c.w - wt, gE.y + gE.w / 2, wt, c.y + c.h - gE.y - gE.w / 2).fill({ color: wallColor, alpha: wallAlpha });

    // Outline
    g.rect(c.x, c.y, c.w, c.h).stroke({ color: 0x2a1a0a, width: 1.5 });

    // Crenellations
    const crenColor = 0xdaa520;
    const crenAlpha = 0.4;
    for (let x = c.x; x < c.x + c.w; x += 12) {
      if (x > gN.x - gN.w / 2 - 8 && x < gN.x + gN.w / 2 + 8) continue;
      g.rect(x, c.y - 4, 6, 5).fill({ color: crenColor, alpha: crenAlpha });
    }
    for (let x = c.x; x < c.x + c.w; x += 12) {
      if (x > gS.x - gS.w / 2 - 8 && x < gS.x + gS.w / 2 + 8) continue;
      g.rect(x, c.y + c.h - 1, 6, 5).fill({ color: crenColor, alpha: crenAlpha });
    }
    for (let y = c.y; y < c.y + c.h; y += 12) {
      if (y > gW.y - gW.w / 2 - 8 && y < gW.y + gW.w / 2 + 8) continue;
      g.rect(c.x - 4, y, 5, 6).fill({ color: crenColor, alpha: crenAlpha });
    }
    for (let y = c.y; y < c.y + c.h; y += 12) {
      if (y > gE.y - gE.w / 2 - 8 && y < gE.y + gE.w / 2 + 8) continue;
      g.rect(c.x + c.w - 1, y, 5, 6).fill({ color: crenColor, alpha: crenAlpha });
    }

    // Wall towers
    for (const t of this._wallTowers) {
      g.circle(t.x, t.y, t.s).fill({ color: wallColor, alpha: wallAlpha })
        .circle(t.x, t.y, t.s).stroke({ color: 0x2a1a0a, width: 1.5 })
        .circle(t.x, t.y, t.s * 0.6).stroke({ color: 0x2a1a0a, width: 0.8 });
    }
  }

  private _drawBuildings(g: Graphics, rng: () => number): void {
    const ink = 0x2a1a0a;
    const gold = 0xdaa520;
    const t = this._compassTime;

    for (const b of MAP_BUILDINGS) {
      const isHovered = this._hoveredBuilding?.id === b.id;
      const lineW = isHovered ? 3 : 2;

      // Hover glow — pulsing breathing animation
      if (isHovered) {
        const pulse = 0.12 + 0.06 * Math.sin(t * 3.0);
        const glowRadius = Math.max(b.w, b.h) * 0.65;
        g.circle(b.x + b.w / 2, b.y + b.h / 2, glowRadius)
          .fill({ color: gold, alpha: pulse });
        g.circle(b.x + b.w / 2, b.y + b.h / 2, glowRadius * 0.7)
          .fill({ color: gold, alpha: pulse * 0.5 });
      }

      // --- Ink-wash fills for all buildings ---
      if (b.type === "colosseum") {
        // Stipple fill inside colosseum
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        this._drawStippleFill(g, cx, cy, b.w / 2 - 5, b.h / 2 - 5, rng, 0.06);
        g.ellipse(cx, cy, b.w / 2, b.h / 2).stroke({ color: ink, width: lineW });
        g.ellipse(cx, cy, b.w / 2 - 15, b.h / 2 - 12).stroke({ color: ink, width: 1 });
        g.ellipse(cx, cy, b.w / 2 - 30, b.h / 2 - 25).fill({ color: 0xb4a078, alpha: 0.3 });
        // Arches
        for (let a = 0; a < 12; a++) {
          const ang = a * Math.PI * 2 / 12;
          g.circle(cx + Math.cos(ang) * (b.w / 2 - 7), cy + Math.sin(ang) * (b.h / 2 - 6), 3)
            .fill({ color: ink });
        }
      } else if (b.type === "castle") {
        // Cross-hatching fill for the keep
        this._drawCrossHatchRect(g, b.x + 3, b.y + 3, b.w - 6, b.h - 6, 8, 0.08);
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        g.rect(b.x + b.w / 2 - 50, b.y + 20, 100, 80).stroke({ color: ink, width: 1 });
        g.rect(b.x + b.w / 2 - 50, b.y + 20, 100, 80).fill({ color: 0xb4a078, alpha: 0.15 });
        // Turrets
        for (const [tx, ty] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) {
          g.circle(tx, ty, 14).stroke({ color: ink, width: 1.5 });
          g.circle(tx, ty, 8).fill({ color: gold });
        }
      } else if (b.type === "tower") {
        // Watercolor wash fill for towers
        g.circle(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 - 2)
          .fill({ color: 0x8a7a5a, alpha: 0.12 });
        g.circle(b.x + b.w / 2, b.y + b.h / 2, b.w / 2).stroke({ color: ink, width: lineW });
        // Cone
        g.moveTo(b.x + b.w / 2, b.y - 5).lineTo(b.x, b.y + b.h / 2).stroke({ color: ink, width: 1 });
        g.moveTo(b.x + b.w / 2, b.y - 5).lineTo(b.x + b.w, b.y + b.h / 2).stroke({ color: ink, width: 1 });
        g.circle(b.x + b.w / 2, b.y - 5, 4).fill({ color: gold });
      } else if (b.type === "gate") {
        // Light wash fill
        g.rect(b.x + 1, b.y + 1, 28, b.h - 2).fill({ color: 0x8a7a5a, alpha: 0.1 });
        g.rect(b.x + b.w - 29, b.y + 1, 28, b.h - 2).fill({ color: 0x8a7a5a, alpha: 0.1 });
        g.rect(b.x, b.y, 30, b.h).stroke({ color: ink, width: lineW });
        g.rect(b.x + b.w - 30, b.y, 30, b.h).stroke({ color: ink, width: lineW });
        g.moveTo(b.x + b.w / 2 - 20, b.y + b.h * 0.6)
          .arc(b.x + b.w / 2, b.y + b.h * 0.6, 20, Math.PI, 0)
          .stroke({ color: ink, width: lineW });
      } else if (b.type === "market") {
        // Stipple fill for market plaza
        this._drawStippleRect(g, b.x + 2, b.y + 2, b.w - 4, b.h - 4, rng, 0.05);
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        // Stall outlines
        for (let sx = b.x + 15; sx < b.x + b.w - 15; sx += 40) {
          for (let sy = b.y + 15; sy < b.y + b.h - 15; sy += 50) {
            g.rect(sx, sy, 30, 20).fill({ color: 0x9a8a6a, alpha: 0.08 });
            g.rect(sx, sy, 30, 20).stroke({ color: ink, width: 0.8 });
          }
        }
        g.circle(b.x + b.w / 2, b.y + b.h / 2, 15).stroke({ color: ink, width: 1.5 });
      } else if (b.type === "church") {
        // Cross-hatching for cathedral
        this._drawCrossHatchRect(g, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 6, 0.06);
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        g.poly([b.x + b.w / 2, b.y - 25, b.x + b.w / 2 - 12, b.y, b.x + b.w / 2 + 12, b.y]).stroke({ color: ink, width: 1.5 });
        // Stained glass wash
        g.circle(b.x + b.w / 2, b.y + 30, 10).fill({ color: 0x4466aa, alpha: 0.12 });
        g.circle(b.x + b.w / 2, b.y + 30, 10).stroke({ color: ink, width: 1 });
        // Cross
        g.moveTo(b.x + b.w / 2, b.y - 35).lineTo(b.x + b.w / 2, b.y - 25).stroke({ color: ink, width: 2 });
        g.moveTo(b.x + b.w / 2 - 5, b.y - 32).lineTo(b.x + b.w / 2 + 5, b.y - 32).stroke({ color: ink, width: 2 });
      } else if (b.type === "garden") {
        // Watercolor wash for gardens
        g.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2).fill({ color: 0x5a7a3a, alpha: 0.08 });
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        for (let i = 0; i < 5; i++) {
          const cx = b.x + 15 + rng() * 60, cy = b.y + 15 + rng() * 40;
          const cr = 6 + rng() * 4;
          g.circle(cx, cy, cr).fill({ color: 0x5a8a3a, alpha: 0.1 });
          g.circle(cx, cy, cr).stroke({ color: ink, width: 0.8 });
        }
      } else if (b.type === "training") {
        // Stipple fill
        this._drawStippleRect(g, b.x + 2, b.y + 2, b.w - 4, b.h - 4, rng, 0.04);
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        for (let fx = b.x + 8; fx < b.x + b.w - 5; fx += 12) {
          g.moveTo(fx, b.y).lineTo(fx, b.y + 8).stroke({ color: ink, width: 0.5 });
        }
      } else {
        // Default: light wash + divider
        g.rect(b.x + 1, b.y + 1, b.w - 2, b.h - 2).fill({ color: 0x9a8a6a, alpha: 0.08 });
        g.rect(b.x, b.y, b.w, b.h).stroke({ color: ink, width: lineW });
        g.moveTo(b.x, b.y + b.h * 0.35).lineTo(b.x + b.w, b.y + b.h * 0.35).stroke({ color: ink, width: 0.8 });
      }

      // Gold dot on buildings with modes
      if (b.mode) {
        g.circle(b.x + b.w / 2, b.y - 8, 5).fill({ color: gold }).circle(b.x + b.w / 2, b.y - 8, 5).stroke({ color: ink, width: 0.5 });
      }
    }
  }

  // --- Ink-wash helpers ---

  /** Draw cross-hatching lines inside a rectangle */
  private _drawCrossHatchRect(g: Graphics, x: number, y: number, w: number, h: number, spacing: number, alpha: number): void {
    const ink = 0x2a1a0a;
    // Diagonal lines (top-left to bottom-right)
    for (let d = -h; d < w; d += spacing) {
      const x1 = Math.max(0, d) + x;
      const y1 = Math.max(0, -d) + y;
      const x2 = Math.min(w, d + h) + x;
      const y2 = Math.min(h, -d + w) + y;
      g.moveTo(x1, y1).lineTo(x2, y2);
    }
    g.stroke({ color: ink, width: 0.3, alpha });

    // Opposite diagonal (top-right to bottom-left)
    for (let d = -h; d < w; d += spacing) {
      const x1 = x + w - Math.max(0, d);
      const y1 = y + Math.max(0, -d);
      const x2 = x + w - Math.min(w, d + h);
      const y2 = y + Math.min(h, -d + w);
      g.moveTo(x1, y1).lineTo(x2, y2);
    }
    g.stroke({ color: ink, width: 0.3, alpha });
  }

  /** Draw stipple dots inside a rectangle */
  private _drawStippleRect(g: Graphics, x: number, y: number, w: number, h: number, rng: () => number, alpha: number): void {
    const ink = 0x2a1a0a;
    const count = Math.floor(w * h / 80);
    for (let i = 0; i < count; i++) {
      const dx = x + rng() * w;
      const dy = y + rng() * h;
      g.circle(dx, dy, 0.5 + rng() * 0.8).fill({ color: ink, alpha: alpha + rng() * 0.04 });
    }
  }

  /** Draw stipple dots inside an ellipse */
  private _drawStippleFill(g: Graphics, cx: number, cy: number, rx: number, ry: number, rng: () => number, alpha: number): void {
    const ink = 0x2a1a0a;
    const count = Math.floor(rx * ry * Math.PI / 100);
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()); // uniform distribution in circle
      const dx = cx + Math.cos(angle) * r * rx;
      const dy = cy + Math.sin(angle) * r * ry;
      g.circle(dx, dy, 0.5 + rng() * 0.8).fill({ color: ink, alpha: alpha + rng() * 0.04 });
    }
  }

  private _drawCompass(g: Graphics, x: number, y: number): void {
    const size = 40;
    const ink = 0x2a1a0a;
    const gold = 0xdaa520;

    // Outer circle
    g.circle(x, y, size).stroke({ color: ink, width: 2 });
    g.circle(x, y, size * 0.3).stroke({ color: ink, width: 1 });

    // Cardinal points
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 - Math.PI / 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      // Main point
      const tipX = x + cos * size * 0.95;
      const tipY = y + sin * size * 0.95;
      const lx = x + Math.cos(angle - 0.3) * size * 0.3;
      const ly = y + Math.sin(angle - 0.3) * size * 0.3;
      const rx = x + Math.cos(angle + 0.3) * size * 0.3;
      const ry = y + Math.sin(angle + 0.3) * size * 0.3;

      g.poly([tipX, tipY, lx, ly, rx, ry]).fill({ color: i % 2 === 0 ? gold : ink });
      g.poly([tipX, tipY, lx, ly, rx, ry]).stroke({ color: ink, width: 0.8 });
    }
  }

  // Title text overlay (separate container for crisp text)
  private _titleContainer: Container | null = null;

  private _drawTitleOverlay(): void {
    if (this._titleContainer) {
      this._titleContainer.removeFromParent();
    }
    this._titleContainer = new Container();

    // "C" in red box
    const initial = new Text({ text: "C", style: STYLE_TITLE_INITIAL });
    initial.anchor.set(0.5, 0.5);
    initial.position.set(530, 52);
    this._titleContainer.addChild(initial);

    // Red box behind C
    const redBox = new Graphics().roundRect(515, 35, 30, 38, 3).fill({ color: 0xaa2222 });
    this._titleContainer.addChildAt(redBox, 0);

    // "AMELOT"
    const rest = new Text({ text: "AMELOT", style: STYLE_TITLE });
    rest.anchor.set(0, 0.5);
    rest.position.set(545, 53);
    this._titleContainer.addChild(rest);

    // Subtitle
    const sub = new Text({ text: "Kingdom of Arthur Pendragon", style: STYLE_SUBTITLE });
    sub.anchor.set(0.5, 0);
    sub.position.set(600, 72);
    this._titleContainer.addChild(sub);

    // Decorative dividers
    const divGfx = new Graphics();
    divGfx.moveTo(450, 88).lineTo(550, 88).stroke({ color: 0xdaa520, width: 1 });
    divGfx.moveTo(650, 88).lineTo(750, 88).stroke({ color: 0xdaa520, width: 1 });
    divGfx.circle(600, 88, 3).fill({ color: 0xdaa520 });
    this._titleContainer.addChild(divGfx);

    // Building labels
    for (const b of MAP_BUILDINGS) {
      const isHovered = this._hoveredBuilding?.id === b.id;
      const labelY = b.type === "church" ? b.y + b.h + 18 : b.y + b.h + 14;

      const lbl = new Text({ text: b.label, style: isHovered ? STYLE_LABEL_HOVER : STYLE_LABEL });
      lbl.anchor.set(0.5, 0);
      lbl.position.set(b.x + b.w / 2, labelY);
      this._titleContainer.addChild(lbl);

      // Hover underline decoration
      if (isHovered) {
        const underGfx = new Graphics();
        const tw = lbl.width;
        underGfx.moveTo(b.x + b.w / 2 - tw / 2, labelY + 14)
          .lineTo(b.x + b.w / 2 + tw / 2, labelY + 14)
          .stroke({ color: 0xdaa520, width: 1, alpha: 0.6 });
        this._titleContainer.addChild(underGfx);
      }

      if (b.mode) {
        const mLbl = new Text({
          text: "[ " + this._modeLabel(b.mode) + " ]",
          style: isHovered ? STYLE_MODE_HOVER : STYLE_MODE,
        });
        mLbl.anchor.set(0.5, 0);
        mLbl.position.set(b.x + b.w / 2, labelY + (isHovered ? 16 : 12));
        this._titleContainer.addChild(mLbl);
      }
    }

    // Compass labels
    const compassX = this.MW - 70, compassY = 70;
    const nLabel = new Text({ text: "N", style: STYLE_COMPASS });
    nLabel.anchor.set(0.5, 1);
    nLabel.position.set(compassX, compassY - 48);
    this._titleContainer.addChild(nLabel);

    for (const [dir, dx, dy] of [["S", 0, 48], ["E", 48, 2], ["W", -48, 2]] as const) {
      const dLbl = new Text({ text: dir, style: STYLE_COMPASS_DIR });
      dLbl.anchor.set(0.5, 0.5);
      dLbl.position.set(compassX + dx, compassY + dy);
      this._titleContainer.addChild(dLbl);
    }

    // "MENU" label under compass
    const menuLabel = new Text({
      text: "MENU",
      style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 9, fill: 0xdaa520, letterSpacing: 2 }),
    });
    menuLabel.anchor.set(0.5, 0);
    menuLabel.position.set(compassX, compassY + 48);
    this._titleContainer.addChild(menuLabel);

    // Add before tooltip
    const tooltipIdx = this._mapContainer.getChildIndex(this._tooltip);
    this._mapContainer.addChildAt(this._titleContainer, tooltipIdx);
  }
}

export const camelotHubScreen = new CamelotHubScreen();
