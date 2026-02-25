// Shop overlay — opens when a player clicks an owned building
// Redesigned: preview area + stats + icon grid layout
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  AnimatedSprite,
  Texture,
  RenderTexture,
  Sprite,
  type Renderer,
} from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BuildingType, BuildingState, UnitType, UnitState } from "@/types";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { animationManager } from "@view/animation/AnimationManager";
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { WallRenderer } from "@view/entities/WallRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { FrontViewStablesRenderer } from "@view/entities/FrontViewStablesRenderer";
import { SiegeWorkshopRenderer } from "@view/entities/SiegeWorkshopRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { HamletRenderer } from "@view/entities/HamletRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_W = 286;
const PANEL_PAD = 15;
const CORNER_R = 8;

const BG_COLOR = 0x0d0d1e;
const BG_ALPHA = 0.93;
const BORDER_COLOR = 0xffd700;
const BORDER_W = 1.5;

const HEADER_H = 42;
const PREVIEW_H = 88;
const STATS_H = 77;
const DESC_H = 26;
const FIXED_TOP_H = HEADER_H + PREVIEW_H + STATS_H + DESC_H;

const ICONS_PER_ROW = 4;
const ICON_GAP = 5;
const ICON_SIZE = Math.floor(
  (PANEL_W - 2 * PANEL_PAD - ICON_GAP * (ICONS_PER_ROW - 1)) / ICONS_PER_ROW,
);

const SECTION_LABEL_H = 24;
const CLOSE_SIZE = 20;

const MAX_PANEL_H = 440;
const SCROLL_WIDTH = 10;
const SCROLL_MARGIN = 4;

// Text styles
const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});
const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x778899,
  letterSpacing: 2,
});
const STYLE_CLOSE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xaaaaaa,
  fontWeight: "bold",
});
const STYLE_PREVIEW_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xdddddd,
  fontWeight: "bold",
});
const STYLE_STAT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xbbccdd,
});
const STYLE_SPAWN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x668866,
});
const STYLE_DESC = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x556677,
  fontStyle: "italic",
});
const STYLE_ICON_COST = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xffd700,
  fontWeight: "bold",
});
const STYLE_ICON_COST_UNAFFORDABLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0x885522,
  fontWeight: "bold",
});

// Building display names
const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "Castle",
  [BuildingType.BARRACKS]: "Barracks",
  [BuildingType.STABLES]: "Stables",
  [BuildingType.MAGE_TOWER]: "Mage Tower",
  [BuildingType.ARCHERY_RANGE]: "Archery Range",
  [BuildingType.SIEGE_WORKSHOP]: "Siege Workshop",
  [BuildingType.BLACKSMITH]: "Blacksmith",
  [BuildingType.TOWN]: "Town",
  [BuildingType.CREATURE_DEN]: "Creature Den",
  [BuildingType.TOWER]: "Tower",
  [BuildingType.FARM]: "Farm",
  [BuildingType.HAMLET]: "Hamlet",
  [BuildingType.EMBASSY]: "Embassy",
  [BuildingType.TEMPLE]: "Temple",
  [BuildingType.WALL]: "Wall",
  [BuildingType.FIREPIT]: "Firepit",
  [BuildingType.MILL]: "Mill",
  [BuildingType.ELITE_HALL]: "Elite Hall",
  [BuildingType.MARKET]: "Market",
};

// Unit display names
const UNIT_LABELS: Record<UnitType, string> = {
  [UnitType.SWORDSMAN]: "Swordsman",
  [UnitType.ARCHER]: "Archer",
  [UnitType.KNIGHT]: "Knight",
  [UnitType.FIRE_MAGE]: "Fire Mage",
  [UnitType.STORM_MAGE]: "Storm Mage",
  [UnitType.PIKEMAN]: "Pikeman",
  [UnitType.SUMMONED]: "Summoned",
  [UnitType.BATTERING_RAM]: "Battering Ram",
  [UnitType.MAGE_HUNTER]: "Mage Hunter",
  [UnitType.SIEGE_HUNTER]: "Siege Hunter",
  [UnitType.SUMMONER]: "Summoner",
  [UnitType.COLD_MAGE]: "Cold Mage",
  [UnitType.SPIDER]: "Spider",
  [UnitType.GLADIATOR]: "Gladiator",
  [UnitType.DIPLOMAT]: "Diplomat",
  [UnitType.DISTORTION_MAGE]: "Distortion Mage",
  [UnitType.VOID_SNAIL]: "Void Snail",
  [UnitType.FAERY_QUEEN]: "Faery Queen",
  [UnitType.GIANT_FROG]: "Giant Frog",
  [UnitType.LONGBOWMAN]: "Longbowman",
  [UnitType.CROSSBOWMAN]: "Crossbowman",
  [UnitType.DEVOURER]: "Devourer",
  [UnitType.HORSE_ARCHER]: "Horse Archer",
  [UnitType.SHORTBOW]: "Shortbow",
  [UnitType.BALLISTA]: "Ballista",
  [UnitType.BOLT_THROWER]: "Bolt Thrower",
  [UnitType.SCOUT_CAVALRY]: "Scout Cavalry",
  [UnitType.LANCER]: "Lancer",
  [UnitType.ELITE_LANCER]: "Elite Lancer",
  [UnitType.KNIGHT_LANCER]: "Knight Lancer",
  [UnitType.MONK]: "Monk",
  [UnitType.CLERIC]: "Cleric",
  [UnitType.SAINT]: "Saint",
  [UnitType.RED_DRAGON]: "Red Dragon",
  [UnitType.FROST_DRAGON]: "Frost Dragon",
  [UnitType.CYCLOPS]: "Cyclops",
};

// ---------------------------------------------------------------------------
// ShopPanel
// ---------------------------------------------------------------------------

export class ShopPanel {
  readonly container = new Container();

  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;

  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId = "";

  private _openBuildingId: string | null = null;

  // Preview + stats (fixed area)
  private _previewContainer = new Container();
  private _previewSprite: AnimatedSprite | null = null;
  private _statsContainer = new Container();
  private _descContainer = new Container();
  private _defaultBuildingType: BuildingType | null = null;

  // Cache of rendered building textures (castle, tower) keyed by BuildingType
  private _buildingTextureCache = new Map<BuildingType, RenderTexture>();

  // Icon button refs for affordability
  private _unitIcons: { type: UnitType; costText: Text; bg: Graphics }[] = [];
  private _bpIcons: {
    type: BuildingType;
    costText: Text;
    bg: Graphics;
    locked: boolean;
  }[] = [];

  // Scrolling
  private _scrollContainer = new Container();
  private _mask = new Graphics();
  private _scrollbarTrack = new Graphics();
  private _scrollbarThumb = new Graphics();
  private _scrollY = 0;
  private _isDragging = false;
  private _dragStartY = 0;
  private _thumbStartY = 0;
  private _contentH = 0;
  private _viewH = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, localPlayerId: string): void {
    this._vm = vm;
    this._state = state;
    this._localPlayerId = localPlayerId;

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    this._scrollContainer.label = "scrollContent";
    this._scrollContainer.mask = this._mask;
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);

    this._scrollbarTrack.label = "scrollTrack";
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    this.container.eventMode = "static";
    this.container.on("wheel", (e) => {
      if (!this.container.visible || this._contentH <= this._scrollableH())
        return;
      this._scrollY = Math.max(
        0,
        Math.min(
          this._contentH - this._scrollableH(),
          this._scrollY + e.deltaY,
        ),
      );
      this._applyScroll();
    });
  }

  setPlayerId(playerId: string): void {
    this._localPlayerId = playerId;
    this.close();
  }

  destroy(): void {
    this._clearPreview();
    for (const rt of this._buildingTextureCache.values()) rt.destroy();
    this._buildingTextureCache.clear();
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------

  open(buildingId: string): void {
    this._openBuildingId = buildingId;
    this._rebuild();
    this.container.visible = true;
    this.onOpen?.();
  }

  close(): void {
    const wasOpen = this._openBuildingId !== null;
    this._openBuildingId = null;
    this._clearPreview();
    this.container.visible = false;
    if (wasOpen) this.onClose?.();
  }

  readonly update = (_state: GameState): void => {
    if (!this.container.visible || !this._openBuildingId) return;
    this._updateAffordability();
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _scrollableH(): number {
    return this._viewH - FIXED_TOP_H;
  }

  // ---------------------------------------------------------------------------
  // Panel construction
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    this._unitIcons = [];
    this._bpIcons = [];
    this._scrollContainer.removeChildren();
    this.container.removeChildren();
    this._clearPreview();

    const building = this._openBuildingId
      ? this._state.buildings.get(this._openBuildingId)
      : null;
    if (!building) return;

    this._defaultBuildingType = building.type;

    // Re-add persistent scroll components
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    // Calculate icon grid content height
    const unitCount = building.shopInventory.length;
    const bpCount = building.blueprints.length;
    const unitRowCount = Math.ceil(unitCount / ICONS_PER_ROW);
    const bpRowCount = Math.ceil(bpCount / ICONS_PER_ROW);
    const unitSectionH =
      unitCount > 0
        ? SECTION_LABEL_H + unitRowCount * (ICON_SIZE + ICON_GAP)
        : 0;
    const bpSectionH =
      bpCount > 0 ? SECTION_LABEL_H + bpRowCount * (ICON_SIZE + ICON_GAP) : 0;

    this._contentH = unitSectionH + bpSectionH + PANEL_PAD;
    const maxScrollableH = MAX_PANEL_H - FIXED_TOP_H;
    const scrollableH = Math.min(maxScrollableH, this._contentH);
    this._viewH = FIXED_TOP_H + scrollableH;

    // Background + border
    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .stroke({ color: BORDER_COLOR, alpha: 0.55, width: BORDER_W });
    this.container.addChildAt(bg, 0);

    // Title
    const title = new Text({
      text: BUILDING_LABELS[building.type],
      style: STYLE_TITLE,
    });
    title.position.set(PANEL_PAD, 10);
    this.container.addChild(title);

    // Close button
    const closeBtn = new Text({ text: "✕", style: STYLE_CLOSE });
    closeBtn.position.set(PANEL_W - CLOSE_SIZE - 6, 8);
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.container.addChild(closeBtn);

    // Divider under header
    this.container.addChild(
      new Graphics()
        .rect(PANEL_PAD, HEADER_H - 4, PANEL_W - PANEL_PAD * 2, 1)
        .fill({ color: 0x334455 }),
    );

    // ---- Preview area ----
    this._previewContainer = new Container();
    this._previewContainer.position.set(0, HEADER_H);
    this.container.addChild(this._previewContainer);
    this._showBuildingPreview(building.type);

    // ---- Stats area ----
    this._statsContainer = new Container();
    this._statsContainer.position.set(0, HEADER_H + PREVIEW_H);
    this.container.addChild(this._statsContainer);
    this._showBuildingStats(building.type);

    // ---- Description area ----
    this._descContainer = new Container();
    this._descContainer.position.set(0, HEADER_H + PREVIEW_H + STATS_H);
    this.container.addChild(this._descContainer);
    const descText = new Text({
      text: "  (description coming soon)",
      style: STYLE_DESC,
    });
    descText.position.set(PANEL_PAD, 2);
    this._descContainer.addChild(descText);

    // Divider above scroll area
    this.container.addChild(
      new Graphics()
        .rect(PANEL_PAD, FIXED_TOP_H - 2, PANEL_W - PANEL_PAD * 2, 1)
        .fill({ color: 0x334455 }),
    );

    // Mask for scroll area
    this._mask
      .clear()
      .rect(0, FIXED_TOP_H, PANEL_W, scrollableH)
      .fill({ color: 0x000000 });

    // ---- Icon grid (scrollable) ----
    let cursorY = 0;

    // TRAIN section
    if (unitCount > 0) {
      const label = new Text({ text: "TRAIN", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (let i = 0; i < unitCount; i++) {
        const col = i % ICONS_PER_ROW;
        const row = Math.floor(i / ICONS_PER_ROW);
        const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
        const y = cursorY + row * (ICON_SIZE + ICON_GAP);
        const icon = this._makeUnitIcon(
          building.id,
          building.shopInventory[i],
          x,
          y,
        );
        this._scrollContainer.addChild(icon);
      }
      cursorY += unitRowCount * (ICON_SIZE + ICON_GAP);
    }

    // BUILD section
    if (bpCount > 0) {
      const label = new Text({ text: "BUILD", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (let i = 0; i < bpCount; i++) {
        const col = i % ICONS_PER_ROW;
        const row = Math.floor(i / ICONS_PER_ROW);
        const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
        const y = cursorY + row * (ICON_SIZE + ICON_GAP);
        const icon = this._makeBuildingIcon(building.blueprints[i], x, y);
        this._scrollContainer.addChild(icon);
      }
    }

    this._scrollContainer.position.y = FIXED_TOP_H;

    // Scrollbar
    const hasScroll = this._contentH > scrollableH;
    this._scrollbarTrack.visible = hasScroll;
    this._scrollbarThumb.visible = hasScroll;

    if (hasScroll) {
      const trackX = PANEL_W - SCROLL_WIDTH - SCROLL_MARGIN;
      const trackY = FIXED_TOP_H + SCROLL_MARGIN;
      const trackH = scrollableH - SCROLL_MARGIN * 2;

      this._scrollbarTrack
        .clear()
        .roundRect(0, 0, SCROLL_WIDTH, trackH, SCROLL_WIDTH / 2)
        .fill({ color: 0x000000, alpha: 0.3 });
      this._scrollbarTrack.position.set(trackX, trackY);

      const thumbH = Math.max(20, (scrollableH / this._contentH) * trackH);
      this._scrollbarThumb
        .clear()
        .roundRect(0, 0, SCROLL_WIDTH, thumbH, SCROLL_WIDTH / 2)
        .fill({ color: 0x556677 });
      this._scrollbarThumb.position.x = trackX;

      this._scrollbarThumb.eventMode = "static";
      this._scrollbarThumb.cursor = "pointer";
      this._scrollbarThumb.removeAllListeners();
      this._scrollbarThumb.on("pointerdown", (e) => this._onThumbDragStart(e));
    }

    // Reset scroll
    this._scrollY = 0;
    this._applyScroll();

    // Position panel: bottom-left of screen
    const screenH = this._vm.screenHeight;
    this.container.position.set(PANEL_PAD, screenH - this._viewH - PANEL_PAD);

    this._updateAffordability();
  }

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  private _showUnitPreview(unitType: UnitType): void {
    this._clearPreview();

    const frames = animationManager.getFrames(unitType, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 64;
      sprite.height = 64;
      sprite.position.set(PANEL_W / 2, PREVIEW_H / 2);
      const frameSet = animationManager.getFrameSet(unitType, UnitState.IDLE);
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true;
      sprite.play();
      this._previewSprite = sprite;
      this._previewContainer.addChild(sprite);
    } else {
      // Fallback: colored circle with first letter
      const g = new Graphics()
        .circle(PANEL_W / 2, PREVIEW_H / 2, 24)
        .fill({ color: 0x334466 })
        .circle(PANEL_W / 2, PREVIEW_H / 2, 24)
        .stroke({ color: 0x5588aa, width: 1 });
      this._previewContainer.addChild(g);
      const letter = new Text({
        text: UNIT_LABELS[unitType].charAt(0),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 20,
          fill: 0xdddddd,
          fontWeight: "bold",
        }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(PANEL_W / 2, PREVIEW_H / 2);
      this._previewContainer.addChild(letter);
    }
  }

  private _showBuildingPreview(buildingType: BuildingType): void {
    this._clearPreview();

    const tex = this._getBuildingTexture(buildingType);
    if (tex) {
      const sprite = new Sprite(tex);
      // Scale to fit within PREVIEW_H - 8px padding, keep aspect ratio
      const maxSize = PREVIEW_H - 8;
      const scale = Math.min(maxSize / tex.width, maxSize / tex.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(PANEL_W / 2, PREVIEW_H / 2);
      this._previewContainer.addChild(sprite);
      return;
    }

    // Fallback: letter placeholder for buildings without a renderer
    const g = new Graphics()
      .roundRect(PANEL_W / 2 - 24, PREVIEW_H / 2 - 24, 48, 48, 6)
      .fill({ color: 0x334466 })
      .roundRect(PANEL_W / 2 - 24, PREVIEW_H / 2 - 24, 48, 48, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1 });
    this._previewContainer.addChild(g);

    const letter = new Text({
      text: BUILDING_LABELS[buildingType].charAt(0),
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 22,
        fill: 0xffd700,
        fontWeight: "bold",
      }),
    });
    letter.anchor.set(0.5, 0.5);
    letter.position.set(PANEL_W / 2, PREVIEW_H / 2);
    this._previewContainer.addChild(letter);
  }

  /** Render a building container to a cached RenderTexture for preview use. */
  private _getBuildingTexture(
    buildingType: BuildingType,
  ): RenderTexture | null {
    if (this._buildingTextureCache.has(buildingType)) {
      return this._buildingTextureCache.get(buildingType)!;
    }

    const renderer = this._vm.app.renderer as Renderer;
    let buildingContainer: Container | null = null;
    let texW = 64;
    let texH = 64;

    if (buildingType === BuildingType.CASTLE) {
      const cr = new CastleRenderer(null);
      buildingContainer = cr.container;
      texW = 256;
      texH = 256;
    } else if (buildingType === BuildingType.TOWER) {
      const tr = new TowerRenderer(null);
      buildingContainer = tr.container;
      texW = 64;
      texH = 64;
    } else if (buildingType === BuildingType.FARM) {
      const fr = new FarmRenderer(null);
      buildingContainer = fr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.HAMLET) {
      const hr = new HamletRenderer(null);
      buildingContainer = hr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.WALL) {
      const wr = new WallRenderer();
      buildingContainer = wr.container;
      texW = 64;
      texH = 192;
    } else if (buildingType === BuildingType.TEMPLE) {
      const tr = new TempleRenderer(null);
      buildingContainer = tr.container;
      texW = 128;
      texH = 192;
    } else if (buildingType === BuildingType.EMBASSY) {
      const er = new EmbassyRenderer(null);
      buildingContainer = er.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BLACKSMITH) {
      const bsr = new BlacksmithRenderer(null);
      buildingContainer = bsr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.CREATURE_DEN) {
      const cdr = new CreatureDenRenderer(null);
      buildingContainer = cdr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MILL) {
      const mr = new MillRenderer(null);
      buildingContainer = mr.container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_HALL) {
      const ehr = new EliteHallRenderer(null);
      buildingContainer = ehr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MAGE_TOWER) {
      const mtr = new MageTowerRenderer(null);
      buildingContainer = mtr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.SIEGE_WORKSHOP) {
      const swr = new SiegeWorkshopRenderer(null);
      buildingContainer = swr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ARCHERY_RANGE) {
      const arr = new ArcheryRangeRenderer(null);
      buildingContainer = arr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.STABLES) {
      const sr = new FrontViewStablesRenderer(null);
      buildingContainer = sr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BARRACKS) {
      const br = new BarracksRenderer(null);
      buildingContainer = br.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MARKET) {
      const mr = new MarketRenderer(null);
      buildingContainer = mr.container;
      texW = 128;
      texH = 128;
    }

    if (!buildingContainer) return null;

    const rt = RenderTexture.create({ width: texW, height: texH });
    renderer.render({ container: buildingContainer, target: rt });
    buildingContainer.destroy({ children: true });

    this._buildingTextureCache.set(buildingType, rt);
    return rt;
  }

  private _clearPreview(): void {
    if (this._previewSprite) {
      this._previewSprite.stop();
      this._previewSprite.destroy();
      this._previewSprite = null;
    }
    this._previewContainer.removeChildren();
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  private _showUnitStats(unitType: UnitType): void {
    this._statsContainer.removeChildren();
    const def = UNIT_DEFINITIONS[unitType];

    const name = new Text({
      text: UNIT_LABELS[unitType],
      style: STYLE_PREVIEW_NAME,
    });
    name.position.set(PANEL_PAD, 0);
    this._statsContainer.addChild(name);

    const line1 = new Text({
      text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed}`,
      style: STYLE_STAT,
    });
    line1.position.set(PANEL_PAD, 16);
    this._statsContainer.addChild(line1);

    const line2 = new Text({
      text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
      style: STYLE_STAT,
    });
    line2.position.set(PANEL_PAD, 28);
    this._statsContainer.addChild(line2);

    let extraLine = `Spawn: ${def.spawnTime}s`;
    if (def.abilityTypes.length > 0) {
      extraLine += `  ${def.abilityTypes.join(", ")}`;
    }
    const line3 = new Text({ text: extraLine, style: STYLE_SPAWN });
    line3.position.set(PANEL_PAD, 40);
    this._statsContainer.addChild(line3);
  }

  private _showBuildingStats(buildingType: BuildingType): void {
    this._statsContainer.removeChildren();
    const def = BUILDING_DEFINITIONS[buildingType];

    const name = new Text({
      text: BUILDING_LABELS[buildingType],
      style: STYLE_PREVIEW_NAME,
    });
    name.position.set(PANEL_PAD, 0);
    this._statsContainer.addChild(name);

    const line1 = new Text({
      text: `HP:${def.hp}  COST:${def.cost}g  INCOME:${def.goldIncome}g/s`,
      style: STYLE_STAT,
    });
    line1.position.set(PANEL_PAD, 16);
    this._statsContainer.addChild(line1);

    const line2 = new Text({
      text: `Size: ${def.footprint.w}×${def.footprint.h}`,
      style: STYLE_STAT,
    });
    line2.position.set(PANEL_PAD, 28);
    this._statsContainer.addChild(line2);
  }

  private _showDefaultPreviewAndStats(): void {
    if (this._defaultBuildingType !== null) {
      this._showBuildingPreview(this._defaultBuildingType);
      this._showBuildingStats(this._defaultBuildingType);
    }
  }

  // ---------------------------------------------------------------------------
  // Icon button factories
  // ---------------------------------------------------------------------------

  private _makeUnitIcon(
    buildingId: string,
    unitType: UnitType,
    x: number,
    y: number,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .stroke({ color: 0x334455, width: 1 });
    btn.addChild(bg);

    // Unit sprite icon
    if (animationManager.isLoaded) {
      const frames = animationManager.getFrames(unitType, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const icon = new AnimatedSprite(frames);
        icon.anchor.set(0.5, 0.5);
        icon.width = ICON_SIZE - 8;
        icon.height = ICON_SIZE - 8;
        icon.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
        icon.animationSpeed = 0.1;
        icon.loop = true;
        icon.play();
        btn.addChild(icon);
      }
    }

    // Cost text at bottom
    const def = UNIT_DEFINITIONS[unitType];
    const costText = new Text({ text: `${def.cost}g`, style: STYLE_ICON_COST });
    costText.anchor.set(0.5, 1);
    costText.position.set(ICON_SIZE / 2, ICON_SIZE - 1);
    btn.addChild(costText);

    // Hover: show preview + stats
    btn.on("pointerover", () => {
      bg.tint = 0x334466;
      this._showUnitPreview(unitType);
      this._showUnitStats(unitType);
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
      this._showDefaultPreviewAndStats();
    });
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      this._buyUnit(buildingId, unitType);
    });

    this._unitIcons.push({ type: unitType, costText, bg });
    return btn;
  }

  private _makeBuildingIcon(
    bpType: BuildingType,
    x: number,
    y: number,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const def = BUILDING_DEFINITIONS[bpType];

    // Check build constraints
    const maxCount = def.maxCount;
    const prereq = def.prerequisite;
    const ownedCount =
      maxCount !== undefined ? this._countOwnedType(bpType) : 0;
    const prereqMet =
      !prereq ||
      prereq.types.every(
        (type) => this._countOwnedType(type) >= prereq.minCount,
      );
    const atMax = maxCount !== undefined && ownedCount >= maxCount;
    const locked = atMax || !prereqMet;

    const bg = new Graphics()
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .stroke({ color: locked ? 0x443322 : 0x334455, width: 1 });
    btn.addChild(bg);

    // Building icon: use rendered texture if available, else letter placeholder
    const tex = this._getBuildingTexture(bpType);
    if (tex) {
      const iconSprite = new Sprite(tex);
      const iconArea = ICON_SIZE - 10;
      const scale = Math.min(iconArea / tex.width, iconArea / tex.height);
      iconSprite.scale.set(scale);
      iconSprite.anchor.set(0.5, 0.5);
      iconSprite.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
      if (locked) iconSprite.alpha = 0.5;
      btn.addChild(iconSprite);
    } else {
      const iconG = new Graphics()
        .roundRect(8, 4, ICON_SIZE - 16, ICON_SIZE - 16, 3)
        .fill({ color: locked ? 0x222222 : 0x223344 });
      btn.addChild(iconG);

      const letter = new Text({
        text: BUILDING_LABELS[bpType].charAt(0),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fill: locked ? 0x667788 : 0xdddddd,
          fontWeight: "bold",
        }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
      btn.addChild(letter);
    }

    // Cost text
    const costText = new Text({
      text: `${def.cost}g`,
      style: locked ? STYLE_ICON_COST_UNAFFORDABLE : STYLE_ICON_COST,
    });
    costText.anchor.set(0.5, 1);
    costText.position.set(ICON_SIZE / 2, ICON_SIZE - 1);
    btn.addChild(costText);

    if (locked) btn.alpha = 0.5;

    btn.on("pointerover", () => {
      bg.tint = 0x334466;
      this._showBuildingPreview(bpType);
      this._showBuildingStats(bpType);
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
      this._showDefaultPreviewAndStats();
    });
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      if (!locked) this._buyBlueprint(bpType);
    });

    this._bpIcons.push({ type: bpType, costText, bg, locked });
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _applyScroll(): void {
    const scrollableH = this._scrollableH();
    const maxScroll = Math.max(0, this._contentH - scrollableH);
    this._scrollY = Math.max(0, Math.min(maxScroll, this._scrollY));

    this._scrollContainer.position.y = FIXED_TOP_H - this._scrollY;

    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const thumbY = maxScroll > 0 ? (this._scrollY / maxScroll) * maxThumbY : 0;

    this._scrollbarThumb.position.y = FIXED_TOP_H + SCROLL_MARGIN + thumbY;
  }

  private _onThumbDragStart(e: any): void {
    e.stopPropagation();
    this._isDragging = true;
    this._dragStartY = e.global.y;
    this._thumbStartY = this._scrollY;

    const stage = this._vm.app.stage;
    stage.on("pointermove", (e) => this._onThumbDragMove(e));
    stage.on("pointerup", () => this._onThumbDragEnd());
    stage.on("pointerupoutside", () => this._onThumbDragEnd());
  }

  private _onThumbDragMove(e: any): void {
    if (!this._isDragging) return;

    const deltaY = e.global.y - this._dragStartY;
    const scrollableH = this._scrollableH();
    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const maxScroll = Math.max(0, this._contentH - scrollableH);

    if (maxThumbY > 0) {
      const scrollDelta = (deltaY / maxThumbY) * maxScroll;
      this._scrollY = this._thumbStartY + scrollDelta;
      this._applyScroll();
    }
  }

  private _onThumbDragEnd(): void {
    this._isDragging = false;
    const stage = this._vm.app.stage;
    stage.off("pointermove");
    stage.off("pointerup");
    stage.off("pointerupoutside");
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _countOwnedType(type: BuildingType): number {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return 0;
    let count = 0;
    for (const id of player.ownedBuildings) {
      const b = this._state.buildings.get(id);
      if (b && b.type === type && b.state !== BuildingState.DESTROYED) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Sim commands
  // ---------------------------------------------------------------------------

  private _buyUnit(buildingId: string, unitType: UnitType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const cost = UNIT_DEFINITIONS[unitType].cost;
    if (player.gold < cost) return;

    player.gold -= cost;
    addToQueue(this._state, buildingId, unitType);

    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this._updateAffordability();
  }

  private _buyBlueprint(bpType: BuildingType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const cost = BUILDING_DEFINITIONS[bpType].cost;
    if (player.gold < cost) return;

    player.gold -= cost;
    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this.close();
    buildingPlacer.activate(bpType);
  }

  // ---------------------------------------------------------------------------
  // Affordability tints
  // ---------------------------------------------------------------------------

  private _updateAffordability(): void {
    const player = this._state.players.get(this._localPlayerId);
    const gold = player?.gold ?? 0;

    for (const entry of this._unitIcons) {
      const cost = UNIT_DEFINITIONS[entry.type].cost;
      entry.costText.style =
        cost <= gold ? STYLE_ICON_COST : STYLE_ICON_COST_UNAFFORDABLE;
    }

    for (const entry of this._bpIcons) {
      if (entry.locked) continue;
      const cost = BUILDING_DEFINITIONS[entry.type].cost;
      entry.costText.style =
        cost <= gold ? STYLE_ICON_COST : STYLE_ICON_COST_UNAFFORDABLE;
    }
  }
}

export const shopPanel = new ShopPanel();
