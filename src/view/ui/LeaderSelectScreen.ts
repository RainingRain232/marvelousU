// Leader selection screen — choose a leader before the game starts.
// Layout: 1622×980 card (matching other screens) with throne.png banner
// (image left, text right), leader grid, and detail panel with leader portraits.
import {
  Container, Graphics, Text, TextStyle, AnimatedSprite, Texture,
  Sprite, Assets,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { LEADER_DEFINITIONS } from "@sim/config/LeaderDefs";
import type { LeaderDef, LeaderId } from "@sim/config/LeaderDefs";
import { animationManager } from "@view/animation/AnimationManager";
import { UnitState, UnitType } from "@/types";

// Vite static image imports
import throneImgUrl from "@/img/throne.png";
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";

const LEADER_IMAGES: Record<string, string> = {
  arthur: arthurImgUrl,
  merlin: merlinImgUrl,
};

/** Map leader IDs to unit types for animated sprite previews. */
const LEADER_UNIT_MAP: Record<string, UnitType> = {
  arthur: UnitType.SWORDSMAN,
  merlin: UnitType.STORM_MAGE,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_LEADER_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xeeeeff,
  fontWeight: "bold", letterSpacing: 1,
});

const STYLE_LEADER_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 9, fill: 0x8899bb,
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
  wordWrap: true, wordWrapWidth: 420,
});

const STYLE_BONUS_LABEL = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x88ff88,
  letterSpacing: 1, fontWeight: "bold",
});

const STYLE_BONUS_TEXT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x88ffaa,
  wordWrap: true, wordWrapWidth: 420,
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

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const MAIN_W = 1622;
const MAIN_H = 980;
const CORNER_R = 10;

// Banner (throne.png — image left, text right)
const BANNER_Y = 75;
const BANNER_IMG_W = MAIN_W - 52;   // full width minus padding
const BANNER_IMG_H = 355;

// Content (below banner)
const CONTENT_Y = BANNER_Y + BANNER_IMG_H + 12;
const FOOTER_Y = MAIN_H - 68;
const CONTENT_H = FOOTER_Y - CONTENT_Y;

// Leader card grid (left side) — compact 4-col grid to give portrait more room
const GRID_X = 26;
const GRID_COLS = 4;
const LEADER_CARD_W = 130;
const LEADER_CARD_H = 96;
const LEADER_CARD_GAP = 10;
const GRID_W = GRID_COLS * LEADER_CARD_W + (GRID_COLS - 1) * LEADER_CARD_GAP;

// Detail panel (right side)
const DETAIL_X = GRID_X + GRID_W + 20;
const DETAIL_W = MAIN_W - DETAIL_X - 26;

// Portrait within detail
const PORTRAIT_W = 364;
const PORTRAIT_H = 403;
const TEXT_IN_DETAIL_X = PORTRAIT_W + 16;
const TEXT_IN_DETAIL_W = DETAIL_W - TEXT_IN_DETAIL_X - 10;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class LeaderSelectScreen {
  readonly container = (() => { const c = new Container(); c.visible = false; return c; })();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _particles!: AmbientParticles;
  private _mainCard!: Container;

  private _selectedId: LeaderId = LEADER_DEFINITIONS[0].id;

  // Card entries
  private _cards: Array<{
    id: LeaderId;
    bg: Graphics;
    container: Container;
  }> = [];

  // Detail panel
  private _detailContainer!: Container;

  // Scrollable grid
  private _gridContainer!: Container;
  private _gridMask!: Graphics;
  private _scrollY = 0;

  // UI elements for view-only mode
  private _nextBtn!: Container;
  private _title!: Text;
  private _separatorLine!: Graphics;
  private _viewOnly = false;

  // Callbacks
  onNext: (() => void) | null = null;
  onBack: (() => void) | null = null;

  get selectedLeaderId(): LeaderId {
    return this._selectedId;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    // Preload images
    void Assets.load([throneImgUrl, arthurImgUrl, merlinImgUrl]);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
    vm.app.ticker.add((ticker) => {
      if (this.container.visible) this._particles.update(ticker.deltaMS / 1000);
    });
  }

  show(): void {
    this._viewOnly = false;
    this._gridContainer.visible = true;
    this._gridMask.visible = true;
    this._separatorLine.visible = true;
    this._title.text = "CHOOSE YOUR LEADER";
    // Restore next button text
    const nextLabel = this._nextBtn.getChildAt(this._nextBtn.children.length - 1) as Text;
    if (nextLabel instanceof Text) nextLabel.text = "SELECT RACE  >";
    this.container.visible = true;
  }

  /** Show in view-only mode — displays only the current leader info with a CONTINUE button. */
  showInfo(leaderId: LeaderId): void {
    this._viewOnly = true;
    this._selectedId = leaderId;
    this._selectLeader(leaderId);
    this._gridContainer.visible = false;
    this._gridMask.visible = false;
    this._separatorLine.visible = false;
    this._title.text = "YOUR LEADER";
    // Change next button text to CONTINUE
    const nextLabel = this._nextBtn.getChildAt(this._nextBtn.children.length - 1) as Text;
    if (nextLabel instanceof Text) nextLabel.text = "CONTINUE";
    // Center the detail panel
    this._detailContainer.position.set(MAIN_W / 2 - 200, this._detailContainer.y);
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
    // Restore detail panel position
    if (this._viewOnly) {
      this._detailContainer.position.set(DETAIL_X, this._detailContainer.y);
      this._viewOnly = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Build UI
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
    this._title = new Text({ text: "CHOOSE YOUR LEADER", style: STYLE_SCREEN_TITLE });
    this._title.anchor.set(0.5, 0);
    this._title.position.set(MAIN_W / 2, 18);
    card.addChild(this._title);

    // Header divider
    card.addChild(
      new Graphics().rect(21, 65, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Banner: throne.png (left) + flavor text (right) ---
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

    // Build leader cards
    this._cards = [];
    for (let i = 0; i < LEADER_DEFINITIONS.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = col * (LEADER_CARD_W + LEADER_CARD_GAP);
      const y = row * (LEADER_CARD_H + LEADER_CARD_GAP);
      this._makeLeaderCard(LEADER_DEFINITIONS[i], x, y);
    }

    // Wheel scroll
    card.eventMode = "static";
    card.on("wheel", (e) => this._onGridWheel(e));

    // Vertical separator
    this._separatorLine = new Graphics()
      .rect(DETAIL_X - 10, CONTENT_Y, 1, CONTENT_H)
      .fill({ color: BORDER_COLOR, alpha: 0.15 });
    card.addChild(this._separatorLine);

    // --- Detail panel (right) ---
    this._detailContainer = new Container();
    this._detailContainer.position.set(DETAIL_X, CONTENT_Y);
    card.addChild(this._detailContainer);

    // Footer divider
    card.addChild(
      new Graphics().rect(21, FOOTER_Y, MAIN_W - 42, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Next button
    this._nextBtn = this._makeNavBtn("SELECT RACE  >", 195, 44, true);
    this._nextBtn.position.set(MAIN_W - 221, MAIN_H - 57);
    this._nextBtn.on("pointerdown", () => {
      if (this._viewOnly) {
        this.onBack?.();
      } else {
        this.onNext?.();
      }
    });
    card.addChild(this._nextBtn);

    // Select default leader
    this._selectLeader(this._selectedId);
  }

  // ---------------------------------------------------------------------------
  // Banner (throne.png left, flavor text right — matching race select pattern)
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

    // Image frame on the left with gold outline
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

    void Assets.load(throneImgUrl).then((tex: Texture) => {
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

    const bannerTitle = new Text({ text: "THE THRONE ROOM", style: STYLE_BANNER_TITLE });
    bannerTitle.position.set(textX, 20);
    bannerBox.addChild(bannerTitle);

    bannerBox.addChild(
      new Graphics().rect(textX, 42, textW, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    const flavorText = new Text({
      text: "Every leader brings a unique bonus to your campaign. Choose wisely — the right commander can turn the tide of battle before a single sword is drawn.\n\nStudy their strengths and pick the one that best complements your strategy.",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 11, fill: 0x99aabb,
        wordWrap: true, wordWrapWidth: textW,
      }),
    });
    flavorText.position.set(textX, 52);
    bannerBox.addChild(flavorText);
  }

  // ---------------------------------------------------------------------------
  // Leader card
  // ---------------------------------------------------------------------------

  private _makeLeaderCard(leader: LeaderDef, x: number, y: number): void {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = "pointer";

    const bg = new Graphics();
    c.addChild(bg);

    // Portrait area
    const portraitW = LEADER_CARD_W - 12;
    const portraitH = LEADER_CARD_H - 30;

    c.addChild(
      new Graphics()
        .roundRect(6, 6, portraitW, portraitH, 3)
        .fill({ color: 0x1a1e2e }),
    );

    // Try animated sprite for known leaders
    const unitType = LEADER_UNIT_MAP[leader.id];
    if (unitType) {
      const frames = animationManager.getFrames(unitType, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 0.5);
        sprite.width = portraitW - 8;
        sprite.height = portraitH - 8;
        sprite.position.set(LEADER_CARD_W / 2, 6 + portraitH / 2);
        const fs = animationManager.getFrameSet(unitType, UnitState.IDLE);
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        c.addChild(sprite);
      }
    } else {
      // Fallback: letter initial
      const initial = new Text({
        text: leader.name.charAt(0),
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 20, fill: 0xffd700, fontWeight: "bold",
        }),
      });
      initial.anchor.set(0.5, 0.5);
      initial.position.set(LEADER_CARD_W / 2, 6 + portraitH / 2);
      c.addChild(initial);
    }

    // Name
    const nameText = new Text({ text: leader.name.toUpperCase(), style: STYLE_LEADER_NAME });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(LEADER_CARD_W / 2, LEADER_CARD_H - 26);
    c.addChild(nameText);

    // Title
    const titleText = new Text({ text: leader.title, style: STYLE_LEADER_TITLE });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(LEADER_CARD_W / 2, LEADER_CARD_H - 14);
    c.addChild(titleText);

    this._refreshCard(bg, leader.id === this._selectedId);

    c.on("pointerdown", () => this._selectLeader(leader.id));

    this._gridContainer.addChild(c);
    this._cards.push({ id: leader.id, bg, container: c });
  }

  // ---------------------------------------------------------------------------
  // Detail panel (rebuilt on each selection)
  // ---------------------------------------------------------------------------

  private _buildDetailPanel(leader: LeaderDef): void {
    const d = this._detailContainer;
    d.removeChildren();

    // Panel background
    d.addChild(
      new Graphics()
        .roundRect(0, 0, DETAIL_W, CONTENT_H, 6)
        .fill({ color: 0x0d0d1e, alpha: 0.6 })
        .roundRect(0, 0, DETAIL_W, CONTENT_H, 6)
        .stroke({ color: 0x334466, width: 1 }),
    );

    // --- Portrait image (left side) ---
    const portraitContainer = new Container();
    portraitContainer.position.set(10, 10);
    d.addChild(portraitContainer);

    // Portrait frame with gold outline
    portraitContainer.addChild(
      new Graphics()
        .roundRect(0, 0, PORTRAIT_W, PORTRAIT_H, 6)
        .fill({ color: 0x080818 })
        .roundRect(0, 0, PORTRAIT_W, PORTRAIT_H, 6)
        .stroke({ color: BORDER_COLOR, alpha: 0.5, width: 1.5 }),
    );

    // Load leader image or show placeholder
    const imgUrl = LEADER_IMAGES[leader.id];
    if (imgUrl) {
      void Assets.load(imgUrl).then((tex: Texture) => {
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
      // Throne room placeholder for leaders without a portrait
      void Assets.load(throneImgUrl).then((tex: Texture) => {
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
    }

    // --- Text info (right of portrait) ---
    const tx = TEXT_IN_DETAIL_X;
    let ty = 14;

    // Name
    const nameT = new Text({ text: leader.name.toUpperCase(), style: STYLE_DETAIL_NAME });
    nameT.position.set(tx, ty);
    d.addChild(nameT);
    ty += 28;

    // Title
    const titleT = new Text({ text: leader.title, style: STYLE_DETAIL_TITLE });
    titleT.position.set(tx, ty);
    d.addChild(titleT);
    ty += 22;

    // Divider
    d.addChild(new Graphics().rect(tx, ty, TEXT_IN_DETAIL_W, 1).fill({ color: 0x334455 }));
    ty += 10;

    // Lore label
    const loreLabel = new Text({
      text: "LORE",
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0x556677, letterSpacing: 2,
      }),
    });
    loreLabel.position.set(tx, ty);
    d.addChild(loreLabel);
    ty += 16;

    // Flavor text
    const flavorT = new Text({ text: leader.flavor, style: STYLE_DETAIL_FLAVOR });
    flavorT.position.set(tx, ty);
    d.addChild(flavorT);
    ty += flavorT.height + 14;

    // Divider
    d.addChild(new Graphics().rect(tx, ty, TEXT_IN_DETAIL_W, 1).fill({ color: 0x334455 }));
    ty += 10;

    // Bonus label
    const bonusLabel = new Text({ text: "BONUS", style: STYLE_BONUS_LABEL });
    bonusLabel.position.set(tx, ty);
    d.addChild(bonusLabel);
    ty += 16;

    // Bonus text
    const bonusT = new Text({ text: leader.bonusLabel, style: STYLE_BONUS_TEXT });
    bonusT.position.set(tx, ty);
    d.addChild(bonusT);
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  private _selectLeader(id: LeaderId): void {
    this._selectedId = id;

    for (const card of this._cards) {
      this._refreshCard(card.bg, card.id === id);
    }

    const leader = LEADER_DEFINITIONS.find((l) => l.id === id);
    if (leader) this._buildDetailPanel(leader);
  }

  private _refreshCard(bg: Graphics, selected: boolean): void {
    bg.clear();
    bg.roundRect(0, 0, LEADER_CARD_W, LEADER_CARD_H, 6)
      .fill({ color: selected ? 0x1a1e32 : 0x10101e })
      .roundRect(0, 0, LEADER_CARD_W, LEADER_CARD_H, 6)
      .stroke({
        color: selected ? CARD_SELECTED_BORDER : CARD_NORMAL_BORDER,
        width: selected ? 2 : 1,
      });
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onGridWheel(e: WheelEvent): void {
    const maxRows = Math.ceil(LEADER_DEFINITIONS.length / GRID_COLS);
    const totalH = maxRows * (LEADER_CARD_H + LEADER_CARD_GAP);
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
    this._particles.resize(sw, sh);
    this._mainCard.position.set(
      Math.floor((sw - MAIN_W) / 2),
      Math.floor((sh - MAIN_H) / 2),
    );
  }
}

export const leaderSelectScreen = new LeaderSelectScreen();
