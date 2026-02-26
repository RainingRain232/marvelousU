// Race selection screen — choose a race/faction before the game starts.
// Layout mirrors LeaderSelectScreen: left scrollable grid of race cards
// + right detail panel.  Unimplemented races show "COMING SOON".
import { Container, Graphics, Text, TextStyle, AnimatedSprite, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { RACE_DEFINITIONS } from "@sim/config/RaceDefs";
import type { RaceDef, RaceId } from "@sim/config/RaceDefs";
import { animationManager } from "@view/animation/AnimationManager";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_RACE_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_RACE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0x8899bb,
  letterSpacing: 1,
});

const STYLE_DETAIL_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_DETAIL_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x99aabb,
  letterSpacing: 1,
});

const STYLE_DETAIL_FLAVOR = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaabbcc,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 220,
});

const STYLE_UNIT_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88ff88,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_UNIT_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x88ffaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 220,
});

const STYLE_COMING_SOON = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x556677,
  letterSpacing: 2,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_SELECTED_BORDER = 0xffd700;
const CARD_NORMAL_BORDER = 0x334455;
const CARD_DISABLED_BORDER = 0x1a2a3a;

// Grid card sizing
const GRID_COLS     = 2;
const CARD_W        = 130;
const CARD_H        = 80;
const CARD_GAP      = 8;
const GRID_PAD      = 14;

// Detail panel
const DETAIL_W      = 256;

// Overall card dimensions (computed)
const GRID_W  = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + GRID_PAD * 2;
const CARD_TOTAL_W  = GRID_W + DETAIL_W + 24;   // 24 = gap between sections
const CARD_TOTAL_H  = 420;

// ---------------------------------------------------------------------------
// RaceSelectScreen
// ---------------------------------------------------------------------------

export class RaceSelectScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;

  // Grid
  private _gridContainer!: Container;
  private _gridMask!: Graphics;
  private _scrollY = 0;

  // Cards (border Graphics per race id)
  private _cardBorders = new Map<RaceId, Graphics>();

  // Detail panel
  private _detailContainer!: Container;
  private _detailPreviewContainer!: Container;
  private _detailPreviewSprite: AnimatedSprite | null = null;

  // Selection
  private _selectedId: RaceId = RACE_DEFINITIONS[0].id;  // Man selected by default

  onNext: (() => void) | null = null;
  onBack: (() => void) | null = null;

  get selectedRaceId(): RaceId {
    return this._selectedId;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // UI construction
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const CW = CARD_TOTAL_W;
    const CH = CARD_TOTAL_H;

    const card = new Container();
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CW, CH, 8)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CW, CH, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );
    this._mainCard = card;
    this.container.addChild(card);

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 80, 28, false);
    backBtn.position.set(16, 14);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Title
    const title = new Text({ text: "SELECT YOUR RACE", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 14);
    card.addChild(title);

    // Divider under header
    card.addChild(
      new Graphics().rect(16, 50, CW - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // ---- Left: scrollable race grid ----
    this._gridContainer = new Container();
    this._gridContainer.position.set(GRID_PAD, 58);

    this._gridMask = new Graphics()
      .rect(0, 58, GRID_W, CH - 70)
      .fill({ color: 0xffffff });
    card.addChild(this._gridMask);
    this._gridContainer.mask = this._gridMask;
    card.addChild(this._gridContainer);

    // ---- Right: detail panel ----
    this._detailContainer = new Container();
    this._detailContainer.position.set(GRID_W + 16, 58);
    card.addChild(this._detailContainer);

    // Vertical separator
    card.addChild(
      new Graphics()
        .rect(GRID_W + 8, 58, 1, CH - 70)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Build race cards
    for (let i = 0; i < RACE_DEFINITIONS.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * (CARD_W + CARD_GAP);
      const y = row * (CARD_H + CARD_GAP);
      this._makeRaceCard(RACE_DEFINITIONS[i], x, y);
    }

    // Wheel scroll
    card.eventMode = "static";
    card.on("wheel", (e) => this._onGridWheel(e));

    // Divider above bottom buttons
    card.addChild(
      new Graphics().rect(16, CH - 52, CW - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Next button
    const nextBtn = this._makeNavBtn("ARMORY  >", 140, 34, true);
    nextBtn.position.set(CW - 156, CH - 44);
    nextBtn.on("pointerdown", () => this.onNext?.());
    card.addChild(nextBtn);

    // Select default race
    this._selectRace(this._selectedId);
  }

  // ---------------------------------------------------------------------------
  // Race card
  // ---------------------------------------------------------------------------

  private _makeRaceCard(race: RaceDef, x: number, y: number): void {
    const card = new Container();
    card.position.set(x, y);
    card.eventMode = "static";
    card.cursor = race.implemented ? "pointer" : "default";

    const isSelected = race.id === this._selectedId;
    const borderColor = !race.implemented ? CARD_DISABLED_BORDER
                      : isSelected ? CARD_SELECTED_BORDER
                      : CARD_NORMAL_BORDER;

    const bg = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, 6)
      .fill({ color: isSelected ? 0x1a2a4a : 0x0d0d20 })
      .roundRect(0, 0, CARD_W, CARD_H, 6)
      .stroke({ color: borderColor, alpha: race.implemented ? 0.9 : 0.4, width: 1.5 });
    card.addChild(bg);
    this._cardBorders.set(race.id, bg);

    // Unit preview (animated sprite or letter placeholder)
    const previewContainer = new Container();
    previewContainer.position.set(4, 8);
    card.addChild(previewContainer);
    this._drawCardPreview(previewContainer, race, 48, 48);

    // Race name
    const nameText = new Text({ text: race.name, style: STYLE_RACE_NAME });
    nameText.position.set(58, 10);
    if (!race.implemented) nameText.alpha = 0.45;
    card.addChild(nameText);

    // Race subtitle
    const titleText = new Text({ text: race.title, style: STYLE_RACE_TITLE });
    titleText.position.set(58, 26);
    if (!race.implemented) titleText.alpha = 0.35;
    card.addChild(titleText);

    // "Coming soon" badge for unimplemented races
    if (!race.implemented) {
      const soon = new Text({ text: "COMING SOON", style: STYLE_COMING_SOON });
      soon.position.set(58, 48);
      card.addChild(soon);
    }

    if (race.implemented) {
      card.on("pointerover", () => {
        if (race.id !== this._selectedId) {
          bg.clear()
            .roundRect(0, 0, CARD_W, CARD_H, 6)
            .fill({ color: 0x152035 })
            .roundRect(0, 0, CARD_W, CARD_H, 6)
            .stroke({ color: 0x4466aa, alpha: 0.8, width: 1.5 });
        }
      });
      card.on("pointerout", () => {
        if (race.id !== this._selectedId) {
          bg.clear()
            .roundRect(0, 0, CARD_W, CARD_H, 6)
            .fill({ color: 0x0d0d20 })
            .roundRect(0, 0, CARD_W, CARD_H, 6)
            .stroke({ color: CARD_NORMAL_BORDER, alpha: 0.9, width: 1.5 });
        }
      });
      card.on("pointerdown", () => this._selectRace(race.id));
    }

    this._gridContainer.addChild(card);
  }

  /** Draw a small animated unit preview inside a race card (or a letter placeholder). */
  private _drawCardPreview(
    container: Container,
    race: RaceDef,
    w: number,
    h: number,
  ): void {
    if (!race.implemented) {
      // Greyed-out question mark
      const g = new Graphics()
        .roundRect(0, 0, w, h, 4)
        .fill({ color: 0x111122 })
        .roundRect(0, 0, w, h, 4)
        .stroke({ color: 0x223344, width: 1 });
      container.addChild(g);
      const qm = new Text({ text: "?", style: new TextStyle({
        fontFamily: "monospace", fontSize: 26, fill: 0x334455, fontWeight: "bold",
      }) });
      qm.anchor.set(0.5, 0.5);
      qm.position.set(w / 2, h / 2);
      container.addChild(qm);
      return;
    }

    // Try animated sprite
    const frames = animationManager.getFrames(race.factionUnit, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width  = w - 8;
      sprite.height = h - 8;
      sprite.position.set(w / 2, h / 2);
      const fs = animationManager.getFrameSet(race.factionUnit, UnitState.IDLE);
      sprite.animationSpeed = fs.fps / 60;
      sprite.loop = true;
      sprite.play();
      container.addChild(sprite);
    } else {
      // Fallback: coloured circle with initial
      const g = new Graphics()
        .circle(w / 2, h / 2, 20)
        .fill({ color: race.accentColor, alpha: 0.4 })
        .circle(w / 2, h / 2, 20)
        .stroke({ color: race.accentColor, width: 1 });
      container.addChild(g);
      const ltr = new Text({ text: race.name.charAt(0), style: new TextStyle({
        fontFamily: "monospace", fontSize: 18, fill: 0xdddddd, fontWeight: "bold",
      }) });
      ltr.anchor.set(0.5, 0.5);
      ltr.position.set(w / 2, h / 2);
      container.addChild(ltr);
    }
  }

  // ---------------------------------------------------------------------------
  // Detail panel
  // ---------------------------------------------------------------------------

  private _buildDetailPanel(race: RaceDef): void {
    const d = this._detailContainer;
    d.removeChildren();
    if (this._detailPreviewSprite) {
      this._detailPreviewSprite.stop();
      this._detailPreviewSprite.destroy();
      this._detailPreviewSprite = null;
    }

    const DW = DETAIL_W;
    let y = 4;

    // Accent bar
    d.addChild(
      new Graphics()
        .rect(0, y, DW, 3)
        .fill({ color: race.accentColor, alpha: 0.6 }),
    );
    y += 10;

    // Unit preview (large, centered)
    this._detailPreviewContainer = new Container();
    this._detailPreviewContainer.position.set(0, y);
    d.addChild(this._detailPreviewContainer);
    const prevH = 80;

    if (race.implemented) {
      const frames = animationManager.getFrames(race.factionUnit, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 0.5);
        sprite.width  = 64;
        sprite.height = 64;
        sprite.position.set(DW / 2, prevH / 2);
        const fs = animationManager.getFrameSet(race.factionUnit, UnitState.IDLE);
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        this._detailPreviewSprite = sprite;
        this._detailPreviewContainer.addChild(sprite);
      } else {
        // Fallback circle
        const g = new Graphics()
          .circle(DW / 2, prevH / 2, 28)
          .fill({ color: race.accentColor, alpha: 0.3 })
          .circle(DW / 2, prevH / 2, 28)
          .stroke({ color: race.accentColor, width: 1.5 });
        this._detailPreviewContainer.addChild(g);
        const ltr = new Text({ text: race.name.charAt(0), style: new TextStyle({
          fontFamily: "monospace", fontSize: 28, fill: 0xdddddd, fontWeight: "bold",
        }) });
        ltr.anchor.set(0.5, 0.5);
        ltr.position.set(DW / 2, prevH / 2);
        this._detailPreviewContainer.addChild(ltr);
      }
    } else {
      // Coming soon placeholder
      const g = new Graphics()
        .roundRect(DW / 2 - 30, prevH / 2 - 30, 60, 60, 6)
        .fill({ color: 0x111122 })
        .roundRect(DW / 2 - 30, prevH / 2 - 30, 60, 60, 6)
        .stroke({ color: 0x223344, width: 1 });
      this._detailPreviewContainer.addChild(g);
      const qm = new Text({ text: "?", style: new TextStyle({
        fontFamily: "monospace", fontSize: 36, fill: 0x334455, fontWeight: "bold",
      }) });
      qm.anchor.set(0.5, 0.5);
      qm.position.set(DW / 2, prevH / 2);
      this._detailPreviewContainer.addChild(qm);
    }
    y += prevH + 6;

    // Divider
    d.addChild(new Graphics().rect(0, y, DW, 1).fill({ color: race.accentColor, alpha: 0.3 }));
    y += 8;

    // Race name
    const nameT = new Text({ text: race.name, style: STYLE_DETAIL_NAME });
    nameT.position.set(0, y);
    d.addChild(nameT);
    y += 24;

    // Race title
    const titleT = new Text({ text: race.title, style: STYLE_DETAIL_TITLE });
    titleT.position.set(0, y);
    d.addChild(titleT);
    y += 18;

    // Divider
    d.addChild(new Graphics().rect(0, y, DW, 1).fill({ color: 0x334455 }));
    y += 8;

    // Flavor text
    const flavorT = new Text({ text: race.flavor, style: STYLE_DETAIL_FLAVOR });
    flavorT.position.set(0, y);
    d.addChild(flavorT);
    y += flavorT.height + 10;

    if (race.implemented) {
      // Divider
      d.addChild(new Graphics().rect(0, y, DW, 1).fill({ color: 0x334455 }));
      y += 8;

      // Faction unit label
      const unitLabel = new Text({ text: "FACTION UNIT", style: STYLE_UNIT_LABEL });
      unitLabel.position.set(0, y);
      d.addChild(unitLabel);
      y += 16;

      const unitText = new Text({ text: race.factionUnitLabel, style: STYLE_UNIT_TEXT });
      unitText.position.set(0, y);
      d.addChild(unitText);
    } else {
      const soonT = new Text({ text: "COMING SOON", style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: 0x334455, letterSpacing: 3,
      }) });
      soonT.anchor.set(0.5, 0);
      soonT.position.set(DW / 2, y);
      d.addChild(soonT);
    }
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  private _selectRace(id: RaceId): void {
    const prev = this._selectedId;
    this._selectedId = id;

    // Update card borders
    for (const [raceId, bg] of this._cardBorders) {
      const race = RACE_DEFINITIONS.find((r) => r.id === raceId)!;
      const selected = raceId === id;
      bg.clear()
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .fill({ color: selected ? 0x1a2a4a : 0x0d0d20 })
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .stroke({
          color: !race.implemented ? CARD_DISABLED_BORDER
               : selected ? CARD_SELECTED_BORDER
               : CARD_NORMAL_BORDER,
          alpha: race.implemented ? 0.9 : 0.4,
          width: 1.5,
        });
    }

    void prev; // suppress unused warning
    const raceDef = RACE_DEFINITIONS.find((r) => r.id === id)!;
    this._buildDetailPanel(raceDef);
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onGridWheel(e: WheelEvent): void {
    const maxRows  = Math.ceil(RACE_DEFINITIONS.length / GRID_COLS);
    const visibleH = CARD_TOTAL_H - 70;
    const totalH   = maxRows * (CARD_H + CARD_GAP);
    if (totalH <= visibleH) return;
    const maxScroll = totalH - visibleH;
    this._scrollY = Math.max(0, Math.min(maxScroll, this._scrollY + e.deltaY));
    this._gridContainer.position.y = 58 - this._scrollY;
  }

  // ---------------------------------------------------------------------------
  // Nav button
  // ---------------------------------------------------------------------------

  private _makeNavBtn(label: string, w: number, h: number, primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({ text: label, style: new TextStyle({
      fontFamily: "monospace",
      fontSize: primary ? 13 : 11,
      fill: primary ? 0x88ffaa : 0x88bbff,
      fontWeight: "bold",
      letterSpacing: 1,
    }) });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout",  () => { bg.tint = 0xffffff; });
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR });
    this._mainCard.position.set(
      Math.floor((sw - CARD_TOTAL_W) / 2),
      Math.floor((sh - CARD_TOTAL_H) / 2),
    );
  }
}

export const raceSelectScreen = new RaceSelectScreen();
