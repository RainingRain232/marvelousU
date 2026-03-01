// Hover tooltip — shown when the cursor rests over a unit or building on the
// battlefield. Mirrors the ShopPanel's fixed preview+stats section.
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
import type { Unit } from "@sim/entities/Unit";
import type { ViewManager } from "@view/ViewManager";
import type { Camera } from "@view/Camera";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BuildingType, BuildingState, UnitType, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { LightningTowerRenderer } from "@view/entities/LightningTowerRenderer";
import { IceTowerRenderer } from "@view/entities/IceTowerRenderer";
import { FireTowerRenderer } from "@view/entities/FireTowerRenderer";
import { WarpTowerRenderer } from "@view/entities/WarpTowerRenderer";
import { HealingTowerRenderer } from "@view/entities/HealingTowerRenderer";
import { BallistaTowerRenderer } from "@view/entities/BallistaTowerRenderer";
import { RepeaterTowerRenderer } from "@view/entities/RepeaterTowerRenderer";
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
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";

// ---------------------------------------------------------------------------
// Layout — mirrors ShopPanel's fixed-top area (no icon grid / no header)
// ---------------------------------------------------------------------------

const PANEL_W = 240;
const PANEL_PAD = 12;
const CORNER_R = 8;

const BG_COLOR = 0x0d0d1e;
const BG_ALPHA = 0.93;
const BORDER_COLOR = 0xffd700;
const BORDER_W = 1.5;

const PREVIEW_H = 88;
const STATS_H = 90; // a bit taller than ShopPanel to fit description lines

// Cursor offset so the tooltip doesn't sit on top of the entity
const OFFSET_X = 16;
const OFFSET_Y = -20;

// Text styles (same palette as ShopPanel)
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

// Building body colors (same palette as BuildingView)
const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.CASTLE]: 0x8b6914,
  [BuildingType.BARRACKS]: 0x3a5c8b,
  [BuildingType.STABLES]: 0x5c3a1e,
  [BuildingType.MAGE_TOWER]: 0x6a1e8b,
  [BuildingType.ARCHERY_RANGE]: 0x2e6b2e,
  [BuildingType.SIEGE_WORKSHOP]: 0x7a5c2e,
  [BuildingType.BLACKSMITH]: 0x6b4a3a,
  [BuildingType.TOWN]: 0x6b8c3a,
  [BuildingType.CREATURE_DEN]: 0x3d2b1f,
  [BuildingType.TOWER]: 0x8b8b6e,
  [BuildingType.FARM]: 0x5a8a2e,
  [BuildingType.HAMLET]: 0x7aaa3e,
  [BuildingType.EMBASSY]: 0x3a6b8b,
  [BuildingType.TEMPLE]: 0xd8bfd8,
  [BuildingType.WALL]: 0x777777,
  [BuildingType.FIREPIT]: 0x333333,
  [BuildingType.MILL]: 0x8b7355,
  [BuildingType.ELITE_HALL]: 0xaa8844,
  [BuildingType.MARKET]: 0xaa7733,
  [BuildingType.FACTION_HALL]: 0x6655aa,
  [BuildingType.LIGHTNING_TOWER]: 0x4488ff,
  [BuildingType.ICE_TOWER]: 0xaaddff,
  [BuildingType.FIRE_TOWER]: 0xff6622,
  [BuildingType.WARP_TOWER]: 0x9966cc,
  [BuildingType.HEALING_TOWER]: 0x2ecc71,
  [BuildingType.BALLISTA_TOWER]: 0x8b6339,
  [BuildingType.REPEATER_TOWER]: 0x996633,
};

// Building / unit display names (duplicated from ShopPanel which keeps them private)
// Note: BUILDING_LABELS and UNIT_LABELS are exported so RaceSelectScreen can import them
export const BUILDING_LABELS: Record<BuildingType, string> = {
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
  [BuildingType.FACTION_HALL]: "Faction Hall",
  [BuildingType.LIGHTNING_TOWER]: "Lightning Tower",
  [BuildingType.ICE_TOWER]: "Ice Tower",
  [BuildingType.FIRE_TOWER]: "Fire Tower",
  [BuildingType.WARP_TOWER]: "Warp Tower",
  [BuildingType.HEALING_TOWER]: "Healing Tower",
  [BuildingType.BALLISTA_TOWER]: "Ballista Tower",
  [BuildingType.REPEATER_TOWER]: "Repeater Tower",
};

export const UNIT_LABELS: Record<UnitType, string> = {
  [UnitType.SWORDSMAN]: "Swordsman",
  [UnitType.TEMPLAR]: "Templar",
  [UnitType.ASSASSIN]: "Assassin",
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
  [UnitType.CONSTRUCTIONIST]: "Constructionist",
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
  [UnitType.REPEATER]: "Repeater",
  [UnitType.DEVOURER]: "Devourer",
  [UnitType.TROLL]: "Troll",
  [UnitType.BAT]: "Bat",
  [UnitType.HORSE_ARCHER]: "Horse Archer",
  [UnitType.SHORTBOW]: "Shortbow",
  [UnitType.BALLISTA]: "Ballista",
  [UnitType.BOLT_THROWER]: "Bolt Thrower",
  [UnitType.SCOUT_CAVALRY]: "Scout Cavalry",
  [UnitType.LANCER]: "Lancer",
  [UnitType.ELITE_LANCER]: "Elite Lancer",
  [UnitType.KNIGHT_LANCER]: "Knight Lancer",
  [UnitType.ROYAL_LANCER]: "Royal Lancer",
  [UnitType.MONK]: "Monk",
  [UnitType.CLERIC]: "Cleric",
  [UnitType.SAINT]: "Saint",
  [UnitType.RED_DRAGON]: "Red Dragon",
  [UnitType.FROST_DRAGON]: "Frost Dragon",
  [UnitType.CYCLOPS]: "Cyclops",
  [UnitType.HALBERDIER]: "Halberdier",
  [UnitType.ELVEN_ARCHER]: "Elven Archer",
  [UnitType.HERO]: "Hero",
  [UnitType.QUESTING_KNIGHT]: "Questing Knight",
  [UnitType.ANGEL]: "Angel",
  [UnitType.DARK_SAVANT]: "Dark Savant",
};

// ---------------------------------------------------------------------------
// HoverTooltip
// ---------------------------------------------------------------------------

export class HoverTooltip {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _state!: GameState;
  private _camera!: Camera;
  private _canvas!: HTMLCanvasElement;

  private _previewContainer = new Container();
  private _statsContainer = new Container();
  private _previewSprite: AnimatedSprite | null = null;
  private _bg!: Graphics;

  private _buildingTextureCache = new Map<BuildingType, RenderTexture>();

  // What is currently shown (null = hidden)
  private _shownBuildingId: string | null = null;

  // Bound event handler
  private _onPointerMove!: (e: PointerEvent) => void;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, camera: Camera): void {
    this._vm = vm;
    this._state = state;
    this._camera = camera;
    this._canvas = vm.app.canvas as HTMLCanvasElement;

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    // Background (will be redrawn when tooltip opens)
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._previewContainer.position.set(0, 0);
    this.container.addChild(this._previewContainer);

    this._statsContainer.position.set(0, PREVIEW_H);
    this.container.addChild(this._statsContainer);

    // Draw initial bg
    this._drawBg();

    // Hover listener (no button required — pure mouse-move)
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._canvas.addEventListener("pointermove", this._onPointerMove);
  }

  destroy(): void {
    this._canvas.removeEventListener("pointermove", this._onPointerMove);
    this._clearPreview();
    for (const rt of this._buildingTextureCache.values()) rt.destroy();
    this._buildingTextureCache.clear();
    this.container.destroy({ children: true });
  }

  hide(): void {
    this._shownBuildingId = null;
    this._clearPreview();
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Pointer move handler
  // ---------------------------------------------------------------------------

  private _handlePointerMove(e: PointerEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const world = this._camera.screenToWorld(sx, sy);
    const wx = world.x;
    const wy = world.y;

    // --- Hit-test units (circle, radius ~0.6 tiles) ---
    const UNIT_RADIUS = 0.6;
    let hitUnitId: string | null = null;
    for (const unit of this._state.units.values()) {
      if (unit.hp <= 0) continue;
      const cx = unit.position.x + 0.5;
      const cy = unit.position.y + 0.5;
      const dx = wx - cx;
      const dy = wy - cy;
      if (dx * dx + dy * dy <= UNIT_RADIUS * UNIT_RADIUS) {
        hitUnitId = unit.id;
        break;
      }
    }

    if (hitUnitId) {
      // Always refresh so live stats (hp, atk, level) stay current
      this._shownBuildingId = null;
      const unit = this._state.units.get(hitUnitId)!;
      this._showUnit(unit);
      this._positionNear(sx, sy);
      return;
    }

    // --- Hit-test buildings (AABB) ---
    const tx = Math.floor(wx);
    const ty = Math.floor(wy);
    let hitBuildingId: string | null = null;
    for (const building of this._state.buildings.values()) {
      if (building.state === BuildingState.DESTROYED) continue;
      const def = BUILDING_DEFINITIONS[building.type];
      if (
        tx >= building.position.x &&
        tx < building.position.x + def.footprint.w &&
        ty >= building.position.y &&
        ty < building.position.y + def.footprint.h
      ) {
        hitBuildingId = building.id;
        break;
      }
    }

    if (hitBuildingId) {
      if (hitBuildingId !== this._shownBuildingId) {
        this._shownBuildingId = hitBuildingId;
        const building = this._state.buildings.get(hitBuildingId)!;
        this._showBuilding(building.type);
      }
      this._positionNear(sx, sy);
      return;
    }

    // Nothing hovered
    this.hide();
  }

  // ---------------------------------------------------------------------------
  // Show helpers
  // ---------------------------------------------------------------------------

  private _showUnit(unit: Unit): void {
    this._clearPreview();
    this._statsContainer.removeChildren();

    this._showUnitPreview(unit.type);
    this._showUnitStats(unit);

    this.container.visible = true;
  }

  private _showBuilding(buildingType: BuildingType): void {
    this._clearPreview();
    this._statsContainer.removeChildren();

    this._showBuildingPreview(buildingType);
    this._showBuildingStats(buildingType);

    this.container.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Preview renderers (mirrors ShopPanel)
  // ---------------------------------------------------------------------------

  private _showUnitPreview(unitType: UnitType): void {
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
    const tex = this._getBuildingTexture(buildingType);
    if (tex) {
      const sprite = new Sprite(tex);
      const maxSize = PREVIEW_H - 8;
      const scale = Math.min(maxSize / tex.width, maxSize / tex.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(PANEL_W / 2, PREVIEW_H / 2);
      this._previewContainer.addChild(sprite);
      return;
    }

    // Fallback letter
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

  private _clearPreview(): void {
    if (this._previewSprite) {
      this._previewSprite.stop();
      this._previewSprite.destroy();
      this._previewSprite = null;
    }
    this._previewContainer.removeChildren();
  }

  // ---------------------------------------------------------------------------
  // Stats renderers (mirrors ShopPanel)
  // ---------------------------------------------------------------------------

  private _showUnitStats(unit: Unit): void {
    const def = UNIT_DEFINITIONS[unit.type];
    let y = 4;

    // Name + level badge if levelled up
    let nameText = UNIT_LABELS[unit.type];
    if (unit.level > 0) nameText += `  [Lv ${unit.level}]`;
    const name = new Text({ text: nameText, style: STYLE_PREVIEW_NAME });
    name.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(name);
    y += 16;

    if (def.description) {
      y = this._addWrappedText(def.description, y);
      y += 4;
    }

    // Show current/max HP so damage is visible; use live atk/speed
    const hpText =
      unit.hp < unit.maxHp
        ? `HP:${Math.ceil(unit.hp)}/${unit.maxHp}`
        : `HP:${unit.maxHp}`;
    const line1 = new Text({
      text: `${hpText}  ATK:${unit.atk}  SPD:${unit.speed.toFixed(1)}`,
      style: STYLE_STAT,
    });
    line1.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(line1);
    y += 12;

    const line2 = new Text({
      text: `RNG:${unit.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
      style: STYLE_STAT,
    });
    line2.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(line2);
    y += 12;

    let extraLine = `Spawn: ${def.spawnTime}s`;
    if (def.abilityTypes.length > 0)
      extraLine += `  ${def.abilityTypes.join(", ")}`;
    const line3 = new Text({ text: extraLine, style: STYLE_SPAWN });
    line3.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(line3);
    y += 12;

    this._resizeBg(PREVIEW_H + y + PANEL_PAD);
  }

  private _showBuildingStats(buildingType: BuildingType): void {
    const def = BUILDING_DEFINITIONS[buildingType];
    let y = 4;

    const name = new Text({
      text: BUILDING_LABELS[buildingType],
      style: STYLE_PREVIEW_NAME,
    });
    name.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(name);
    y += 16;

    if (def.description) {
      y = this._addWrappedText(def.description, y);
      y += 4;
    }

    const line1 = new Text({
      text: `HP:${def.hp}  COST:${def.cost}g  INCOME:${def.goldIncome}g/s`,
      style: STYLE_STAT,
    });
    line1.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(line1);
    y += 12;

    const line2 = new Text({
      text: `Size: ${def.footprint.w}×${def.footprint.h}`,
      style: STYLE_STAT,
    });
    line2.position.set(PANEL_PAD, y);
    this._statsContainer.addChild(line2);
    y += 12;

    this._resizeBg(PREVIEW_H + y + PANEL_PAD);
  }

  /** Word-wrap helper — appends text lines to statsContainer, returns new y. */
  private _addWrappedText(text: string, startY: number): number {
    const maxLineLength = 30;
    const words = text.split(" ");
    let currentLine = "";
    let y = startY;

    for (const word of words) {
      if (
        (currentLine + word).length > maxLineLength &&
        currentLine.length > 0
      ) {
        const t = new Text({
          text: currentLine.trim(),
          style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
        });
        t.position.set(PANEL_PAD, y);
        this._statsContainer.addChild(t);
        currentLine = word + " ";
        y += 12;
      } else {
        currentLine += word + " ";
      }
    }
    if (currentLine.trim().length > 0) {
      const t = new Text({
        text: currentLine.trim(),
        style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
      });
      t.position.set(PANEL_PAD, y);
      this._statsContainer.addChild(t);
      y += 12;
    }
    return y;
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  private _drawBg(h: number = PREVIEW_H + STATS_H): void {
    this._bg
      .clear()
      .roundRect(0, 0, PANEL_W, h, CORNER_R)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, PANEL_W, h, CORNER_R)
      .stroke({ color: BORDER_COLOR, alpha: 0.55, width: BORDER_W });
  }

  private _resizeBg(h: number): void {
    this._drawBg(h);
  }

  // ---------------------------------------------------------------------------
  // Position tooltip near cursor, clamped to screen
  // ---------------------------------------------------------------------------

  private _positionNear(sx: number, sy: number): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    const bounds = this._bg.getBounds();
    const w = bounds.width || PANEL_W;
    const h = bounds.height || PREVIEW_H + STATS_H;

    let x = sx + OFFSET_X;
    let y = sy + OFFSET_Y;

    // Clamp to screen
    if (x + w > sw) x = sx - w - 4;
    if (x < 0) x = 0;
    if (y + h > sh) y = sh - h - 4;
    if (y < 0) y = 0;

    this.container.position.set(x, y);
  }

  // ---------------------------------------------------------------------------
  // Building texture cache (same logic as ShopPanel)
  // ---------------------------------------------------------------------------

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
      buildingContainer = new CastleRenderer(null).container;
      texW = 256;
      texH = 256;
    } else if (buildingType === BuildingType.TOWER) {
      buildingContainer = new TowerRenderer(null).container;
      texW = 64;
      texH = 64;
    } else if (buildingType === BuildingType.FARM) {
      buildingContainer = new FarmRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.HAMLET) {
      buildingContainer = new HamletRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.WALL) {
      buildingContainer = new WallRenderer().container;
      texW = 64;
      texH = 192;
    } else if (buildingType === BuildingType.TEMPLE) {
      buildingContainer = new TempleRenderer(null).container;
      texW = 128;
      texH = 192;
    } else if (buildingType === BuildingType.EMBASSY) {
      buildingContainer = new EmbassyRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BLACKSMITH) {
      buildingContainer = new BlacksmithRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.CREATURE_DEN) {
      buildingContainer = new CreatureDenRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MILL) {
      buildingContainer = new MillRenderer(null).container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_HALL) {
      buildingContainer = new EliteHallRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MAGE_TOWER) {
      buildingContainer = new MageTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.SIEGE_WORKSHOP) {
      buildingContainer = new SiegeWorkshopRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ARCHERY_RANGE) {
      buildingContainer = new ArcheryRangeRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.STABLES) {
      buildingContainer = new FrontViewStablesRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BARRACKS) {
      buildingContainer = new BarracksRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MARKET) {
      buildingContainer = new MarketRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.FACTION_HALL) {
      buildingContainer = new FactionHallRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.LIGHTNING_TOWER) {
      buildingContainer = new LightningTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ICE_TOWER) {
      buildingContainer = new IceTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.FIRE_TOWER) {
      buildingContainer = new FireTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.WARP_TOWER) {
      buildingContainer = new WarpTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.HEALING_TOWER) {
      buildingContainer = new HealingTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BALLISTA_TOWER) {
      buildingContainer = new BallistaTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.REPEATER_TOWER) {
      buildingContainer = new RepeaterTowerRenderer(null).container;
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
}

export const hoverTooltip = new HoverTooltip();
