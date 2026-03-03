// Race selection screen — choose a race/faction before the game starts.
// Layout: 1248×754 card (matching RaceDetailScreen / ArmoryScreen) with a
// banner showing the races.png image and flavor text, a left race grid,
// and a right detail panel with per-race portrait images.
import {
  Container, Graphics, Text, TextStyle, AnimatedSprite, Texture,
  Sprite, Assets,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { RACE_DEFINITIONS } from "@sim/config/RaceDefs";
import type { RaceDef, RaceId } from "@sim/config/RaceDefs";
import { animationManager } from "@view/animation/AnimationManager";
import { UnitState } from "@/types";

// Vite static image imports
import racesImgUrl from "@/img/races.png";
import elfPImgUrl from "@/img/elfP.png";
import manPImgUrl from "@/img/manP.png";
import hordePImgUrl from "@/img/hordeP.png";
import adeptPImgUrl from "@/img/adeptP.png";

const RACE_PORTRAITS: Record<string, string> = {
  elf: elfPImgUrl,
  man: manPImgUrl,
  horde: hordePImgUrl,
  adept: adeptPImgUrl,
  elements: manPImgUrl,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_RACE_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xeeeeff,
  fontWeight: "bold", letterSpacing: 1,
});

const STYLE_RACE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 10, fill: 0x8899bb,
  letterSpacing: 1,
});

const STYLE_DETAIL_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 22, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

const STYLE_DETAIL_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0x99aabb,
  letterSpacing: 1,
});

const STYLE_DETAIL_FLAVOR = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc,
  wordWrap: true, wordWrapWidth: 320,
});

const STYLE_UNIT_LABEL = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x88ff88,
  letterSpacing: 1, fontWeight: "bold",
});

const STYLE_UNIT_TEXT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x88ffaa,
  wordWrap: true, wordWrapWidth: 320,
});

const STYLE_COMING_SOON = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x556677,
  letterSpacing: 2,
});

const STYLE_BANNER_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

// Colors
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_SELECTED_BORDER = 0xffd700;
const CARD_NORMAL_BORDER = 0x334455;
const CARD_DISABLED_BORDER = 0x1a2a3a;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const MAIN_W = 1248;
const MAIN_H = 754;
const CORNER_R = 10;

// Banner (top area with races.png — full width)
const BANNER_Y = 75;
const BANNER_IMG_W = MAIN_W - 52;   // 1196 (full width minus padding)
const BANNER_IMG_H = 290;

// Content (below banner)
const CONTENT_Y = BANNER_Y + BANNER_IMG_H + 12;  // 377
const FOOTER_Y = MAIN_H - 68;                     // 686
const CONTENT_H = FOOTER_Y - CONTENT_Y;           // 309

// Grid (left side)
const GRID_X = 26;
const GRID_COLS = 4;
const RACE_CARD_W = 140;
const RACE_CARD_H = 80;
const RACE_CARD_GAP = 10;
const GRID_W = GRID_COLS * RACE_CARD_W + (GRID_COLS - 1) * RACE_CARD_GAP; // 590

// Detail panel (right side)
const DETAIL_X = GRID_X + GRID_W + 20;    // 636
const DETAIL_W = MAIN_W - DETAIL_X - 26;  // 586

// Portrait within detail
const PORTRAIT_W = 210;
const PORTRAIT_H = 240;
const TEXT_IN_DETAIL_X = PORTRAIT_W + 16;  // 226
const TEXT_IN_DETAIL_W = DETAIL_W - TEXT_IN_DETAIL_X - 10; // 350

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
  private _detailPreviewSprite: AnimatedSprite | null = null;

  // Selection
  private _selectedId: RaceId = RACE_DEFINITIONS[0].id;

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

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    // Preload images
    void Assets.load([racesImgUrl, elfPImgUrl, manPImgUrl, hordePImgUrl, adeptPImgUrl]);

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
    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 104, 36, false);
    backBtn.position.set(21, 18);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Title
    const title = new Text({ text: "SELECT YOUR RACE", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(MAIN_W / 2, 18);
    card.addChild(title);

    // Header divider
    card.addChild(
      new Graphics().rect(21, 65, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Banner: races.png + flavor text ---
    this._buildBanner(card);

    // Banner divider
    card.addChild(
      new Graphics().rect(21, CONTENT_Y - 8, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // --- Grid area (left) ---
    this._gridContainer = new Container();
    this._gridContainer.position.set(GRID_X, CONTENT_Y);
    card.addChild(this._gridContainer);

    this._gridMask = new Graphics()
      .rect(GRID_X, CONTENT_Y, GRID_W, CONTENT_H)
      .fill({ color: 0xffffff });
    card.addChild(this._gridMask);
    this._gridContainer.mask = this._gridMask;

    // Build race cards
    for (let i = 0; i < RACE_DEFINITIONS.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * (RACE_CARD_W + RACE_CARD_GAP);
      const y = row * (RACE_CARD_H + RACE_CARD_GAP);
      this._makeRaceCard(RACE_DEFINITIONS[i], x, y);
    }

    // Wheel scroll
    card.eventMode = "static";
    card.on("wheel", (e) => this._onGridWheel(e));

    // Vertical separator
    card.addChild(
      new Graphics()
        .rect(DETAIL_X - 10, CONTENT_Y, 1, CONTENT_H)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // --- Detail panel (right) ---
    this._detailContainer = new Container();
    this._detailContainer.position.set(DETAIL_X, CONTENT_Y);
    card.addChild(this._detailContainer);

    // Footer divider
    card.addChild(
      new Graphics().rect(21, FOOTER_Y, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Next button
    const nextBtn = this._makeNavBtn("ARMORY  >", 195, 44, true);
    nextBtn.position.set(MAIN_W - 221, MAIN_H - 57);
    nextBtn.on("pointerdown", () => this.onNext?.());
    card.addChild(nextBtn);

    // Select default race
    this._selectRace(this._selectedId);
  }

  // ---------------------------------------------------------------------------
  // Banner (races.png + flavor text)
  // ---------------------------------------------------------------------------

  private _buildBanner(parent: Container): void {
    const bannerBox = new Container();
    bannerBox.position.set(26, BANNER_Y);
    parent.addChild(bannerBox);

    // Outer box background
    bannerBox.addChild(
      new Graphics()
        .roundRect(0, 0, BANNER_IMG_W, BANNER_IMG_H, 6)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, BANNER_IMG_W, BANNER_IMG_H, 6)
        .stroke({ color: 0x334466, alpha: 0.6, width: 1 }),
    );

    // Image frame on the left with gold outline (like RaceDetailScreen portrait)
    const imgFrameX = 10;
    const imgFrameY = 10;
    const imgFrameW = 780;
    const imgFrameH = BANNER_IMG_H - 20;

    bannerBox.addChild(
      new Graphics()
        .roundRect(imgFrameX, imgFrameY, imgFrameW, imgFrameH, 6)
        .fill({ color: 0x060612 })
        .roundRect(imgFrameX, imgFrameY, imgFrameW, imgFrameH, 6)
        .stroke({ color: BORDER_COLOR, alpha: 0.5, width: 1.5 }),
    );

    void Assets.load(racesImgUrl).then((tex: Texture) => {
      const sprite = new Sprite(tex);
      const maxW = imgFrameW - 10;
      const maxH = imgFrameH - 10;
      const scale = Math.min(maxW / tex.width, maxH / tex.height);
      sprite.scale.set(scale);
      sprite.position.set(
        imgFrameX + 5 + (maxW - tex.width * scale) / 2,
        imgFrameY + 5 + (maxH - tex.height * scale) / 2,
      );
      bannerBox.addChild(sprite);
    });

    // Text area on the right of the image
    const textX = imgFrameX + imgFrameW + 16;
    const textW = BANNER_IMG_W - textX - 10;

    const bannerTitle = new Text({ text: "THE RACES OF RAIN", style: STYLE_BANNER_TITLE });
    bannerTitle.position.set(textX, 20);
    bannerBox.addChild(bannerTitle);

    bannerBox.addChild(
      new Graphics().rect(textX, 42, textW, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const flavorText = new Text({
      text: "The races of Rain are varied and do not all get along. Ancient grudges and clashing ambitions ensure that peace is a rare and fragile thing.\n\nChoose your faction wisely.",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 11, fill: 0x99aabb,
        wordWrap: true, wordWrapWidth: textW,
      }),
    });
    flavorText.position.set(textX, 52);
    bannerBox.addChild(flavorText);
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
      .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
      .fill({ color: isSelected ? 0x1a2a4a : 0x0d0d20 })
      .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
      .stroke({ color: borderColor, alpha: race.implemented ? 0.9 : 0.4, width: 1.5 });
    card.addChild(bg);
    this._cardBorders.set(race.id, bg);

    // Unit preview (animated sprite or letter placeholder)
    const previewContainer = new Container();
    previewContainer.position.set(4, 8);
    card.addChild(previewContainer);
    this._drawCardPreview(previewContainer, race, 50, 50);

    // Race name
    const nameText = new Text({ text: race.name, style: STYLE_RACE_NAME });
    nameText.position.set(60, 12);
    if (!race.implemented) nameText.alpha = 0.45;
    card.addChild(nameText);

    // Race subtitle
    const titleText = new Text({ text: race.title, style: STYLE_RACE_TITLE });
    titleText.position.set(60, 28);
    if (!race.implemented) titleText.alpha = 0.35;
    card.addChild(titleText);

    // "Coming soon" badge for unimplemented races
    if (!race.implemented) {
      const soon = new Text({ text: "COMING SOON", style: STYLE_COMING_SOON });
      soon.position.set(60, 50);
      card.addChild(soon);
    }

    if (race.implemented) {
      card.on("pointerover", () => {
        if (race.id !== this._selectedId) {
          bg.clear()
            .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
            .fill({ color: 0x152035 })
            .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
            .stroke({ color: 0x4466aa, alpha: 0.8, width: 1.5 });
        }
      });
      card.on("pointerout", () => {
        if (race.id !== this._selectedId) {
          bg.clear()
            .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
            .fill({ color: 0x0d0d20 })
            .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
            .stroke({ color: CARD_NORMAL_BORDER, alpha: 0.9, width: 1.5 });
        }
      });
      card.on("pointerdown", () => this._selectRace(race.id));
    }

    this._gridContainer.addChild(card);
  }

  /** Draw a small animated unit preview inside a race card (or a letter placeholder). */
  private _drawCardPreview(
    container: Container, race: RaceDef, w: number, h: number,
  ): void {
    if (!race.implemented) {
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

    const frames = animationManager.getFrames(race.factionUnit, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = w - 8;
      sprite.height = h - 8;
      sprite.position.set(w / 2, h / 2);
      const fs = animationManager.getFrameSet(race.factionUnit, UnitState.IDLE);
      sprite.animationSpeed = fs.fps / 60;
      sprite.loop = true;
      sprite.play();
      container.addChild(sprite);
    } else {
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

    // Panel background
    d.addChild(
      new Graphics()
        .roundRect(0, 0, DETAIL_W, CONTENT_H, 6)
        .fill({ color: 0x0d0d1e, alpha: 0.6 })
        .roundRect(0, 0, DETAIL_W, CONTENT_H, 6)
        .stroke({ color: 0x334466, width: 1 }),
    );

    // Accent bar
    d.addChild(
      new Graphics()
        .rect(8, 8, DETAIL_W - 16, 3)
        .fill({ color: race.accentColor, alpha: 0.6 }),
    );

    // --- Portrait image (left side of detail) ---
    const portraitContainer = new Container();
    portraitContainer.position.set(10, 20);
    d.addChild(portraitContainer);

    // Portrait frame
    portraitContainer.addChild(
      new Graphics()
        .roundRect(0, 0, PORTRAIT_W, PORTRAIT_H, 6)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, PORTRAIT_W, PORTRAIT_H, 6)
        .stroke({ color: race.accentColor, alpha: 0.5, width: 1 }),
    );

    // Load portrait image
    const portraitUrl = RACE_PORTRAITS[race.id];
    if (portraitUrl) {
      void Assets.load(portraitUrl).then((tex: Texture) => {
        if (!this.container.visible) return;
        const sprite = new Sprite(tex);
        const maxW = PORTRAIT_W - 10;
        const maxH = PORTRAIT_H - 10;
        const scale = Math.min(maxW / tex.width, maxH / tex.height);
        sprite.scale.set(scale);
        sprite.position.set(
          5 + (maxW - tex.width * scale) / 2,
          5 + (maxH - tex.height * scale) / 2,
        );
        portraitContainer.addChild(sprite);
      });
    } else {
      // Placeholder for races without portraits
      const qm = new Text({ text: "?", style: new TextStyle({
        fontFamily: "monospace", fontSize: 48, fill: 0x334455, fontWeight: "bold",
      }) });
      qm.anchor.set(0.5, 0.5);
      qm.position.set(PORTRAIT_W / 2, PORTRAIT_H / 2);
      portraitContainer.addChild(qm);
    }

    // --- Text info (right side of detail) ---
    const tx = TEXT_IN_DETAIL_X;
    let ty = 24;

    // Race name
    const nameT = new Text({ text: race.name, style: STYLE_DETAIL_NAME });
    nameT.position.set(tx, ty);
    d.addChild(nameT);
    ty += 28;

    // Race title
    const titleT = new Text({ text: race.title, style: STYLE_DETAIL_TITLE });
    titleT.position.set(tx, ty);
    d.addChild(titleT);
    ty += 22;

    // Divider
    d.addChild(new Graphics().rect(tx, ty, TEXT_IN_DETAIL_W, 1).fill({ color: 0x334455 }));
    ty += 10;

    // Flavor text
    const flavorT = new Text({ text: race.flavor, style: STYLE_DETAIL_FLAVOR });
    flavorT.position.set(tx, ty);
    d.addChild(flavorT);
    ty += flavorT.height + 12;

    if (race.implemented) {
      // Divider
      d.addChild(new Graphics().rect(tx, ty, TEXT_IN_DETAIL_W, 1).fill({ color: 0x334455 }));
      ty += 10;

      // Faction unit label
      const unitLabel = new Text({ text: "FACTION UNIT", style: STYLE_UNIT_LABEL });
      unitLabel.position.set(tx, ty);
      d.addChild(unitLabel);
      ty += 18;

      const unitText = new Text({ text: race.factionUnitLabel, style: STYLE_UNIT_TEXT });
      unitText.position.set(tx, ty);
      d.addChild(unitText);
      ty += unitText.height + 12;

      // Animated unit preview below text
      const prevSize = 64;
      const previewBg = new Graphics()
        .roundRect(tx, ty, prevSize, prevSize, 4)
        .fill({ color: 0x111122 })
        .roundRect(tx, ty, prevSize, prevSize, 4)
        .stroke({ color: race.accentColor, alpha: 0.4, width: 1 });
      d.addChild(previewBg);

      const frames = animationManager.getFrames(race.factionUnit, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 0.5);
        sprite.width = prevSize - 10;
        sprite.height = prevSize - 10;
        sprite.position.set(tx + prevSize / 2, ty + prevSize / 2);
        const fs = animationManager.getFrameSet(race.factionUnit, UnitState.IDLE);
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        this._detailPreviewSprite = sprite;
        d.addChild(sprite);
      }
    } else {
      const soonT = new Text({ text: "COMING SOON", style: new TextStyle({
        fontFamily: "monospace", fontSize: 14, fill: 0x334455, letterSpacing: 3,
      }) });
      soonT.position.set(tx, ty);
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
        .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
        .fill({ color: selected ? 0x1a2a4a : 0x0d0d20 })
        .roundRect(0, 0, RACE_CARD_W, RACE_CARD_H, 6)
        .stroke({
          color: !race.implemented ? CARD_DISABLED_BORDER
               : selected ? CARD_SELECTED_BORDER
               : CARD_NORMAL_BORDER,
          alpha: race.implemented ? 0.9 : 0.4,
          width: 1.5,
        });
    }

    void prev;
    const raceDef = RACE_DEFINITIONS.find((r) => r.id === id)!;
    this._buildDetailPanel(raceDef);
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onGridWheel(e: WheelEvent): void {
    const maxRows = Math.ceil(RACE_DEFINITIONS.length / GRID_COLS);
    const totalH = maxRows * (RACE_CARD_H + RACE_CARD_GAP);
    if (totalH <= CONTENT_H) return;
    const maxScroll = totalH - CONTENT_H;
    this._scrollY = Math.max(0, Math.min(maxScroll, this._scrollY + e.deltaY));
    this._gridContainer.position.y = CONTENT_Y - this._scrollY;
  }

  // ---------------------------------------------------------------------------
  // Nav button
  // ---------------------------------------------------------------------------

  private _makeNavBtn(label: string, w: number, h: number, primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({ text: label, style: new TextStyle({
      fontFamily: "monospace",
      fontSize: primary ? 17 : 14,
      fill: primary ? 0x88ffaa : 0x88bbff,
      fontWeight: "bold", letterSpacing: 1,
    }) });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
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
      Math.floor((sw - MAIN_W) / 2),
      Math.floor((sh - MAIN_H) / 2),
    );
  }
}

export const raceSelectScreen = new RaceSelectScreen();
