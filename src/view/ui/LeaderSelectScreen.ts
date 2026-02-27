// Leader selection screen — choose a leader before the game starts.
// Layout: left scrollable grid of leader cards + right detail panel.
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  AnimatedSprite,
  Texture,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { LEADER_DEFINITIONS } from "@sim/config/LeaderDefs";
import type { LeaderDef, LeaderId } from "@sim/config/LeaderDefs";
import { animationManager } from "@view/animation/AnimationManager";
import { UnitState, UnitType } from "@/types";

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

const STYLE_LEADER_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_LEADER_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
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

const STYLE_BONUS_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88ff88,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_BONUS_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x88ffaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 220,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_SELECTED_BORDER = 0xffd700;
const CARD_NORMAL_BORDER = 0x334455;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_W = 110;
const CARD_H = 80;
const CARD_GAP = 8;
const GRID_COLS = 4;
const GRID_PAD = 16;

const DETAIL_W = 260;
const DETAIL_PAD = 16;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class LeaderSelectScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  private _selectedId: LeaderId = LEADER_DEFINITIONS[0].id; // Arthur by default

  // Card button entries
  private _cards: Array<{
    id: LeaderId;
    bg: Graphics;
    container: Container;
    portraitSprite?: AnimatedSprite;
  }> = [];

  // Detail panel elements
  private _detailPanel!: Container;
  private _detailName!: Text;
  private _detailTitle!: Text;
  private _detailFlavor!: Text;
  private _detailBonus!: Text;
  private _detailPortrait!: Graphics;

  // Main layout container (card + detail side by side)
  private _mainCard!: Container;
  private _mainCardW = 0;

  // Scrollable grid
  private _gridScroll!: Container;
  private _gridMask!: Graphics;
  private _gridScrollY = 0;
  private _gridContentH = 0;
  private _gridViewH = 0;

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

    // Full-screen background
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
  // Build UI
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const gridW =
      GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + GRID_PAD * 2;
    const totalW = gridW + DETAIL_W + 24; // 24 = gap between grid and detail

    // We'll calculate height properly during layout, use a placeholder
    const mainCard = new Container();
    mainCard.addChild(
      new Graphics()
        .roundRect(0, 0, totalW, 500, 8)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, totalW, 500, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );
    this._mainCard = mainCard;
    this._mainCardW = totalW;
    this.container.addChild(mainCard);

    // Screen title
    const title = new Text({
      text: "CHOOSE YOUR LEADER",
      style: STYLE_SCREEN_TITLE,
    });
    title.anchor.set(0.5, 0);
    title.position.set(totalW / 2, 14);
    mainCard.addChild(title);

    // Divider
    mainCard.addChild(
      new Graphics()
        .rect(16, 48, totalW - 32, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Back button (top-left)
    const backBtn = this._makeNavBtn("< BACK", 80, 28);
    backBtn.position.set(16, 14);
    backBtn.on("pointerdown", () => this.onBack?.());
    mainCard.addChild(backBtn);

    // --- Grid area (left) ---
    const gridAreaX = GRID_PAD;
    const gridAreaY = 60;

    // Scrollable container for the grid
    this._gridScroll = new Container();
    this._gridScroll.position.set(gridAreaX, gridAreaY);

    // Build leader cards
    this._cards = [];
    for (let i = 0; i < LEADER_DEFINITIONS.length; i++) {
      const leader = LEADER_DEFINITIONS[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = col * (CARD_W + CARD_GAP);
      const cy = row * (CARD_H + CARD_GAP);

      const card = this._makeLeaderCard(leader, cx, cy);
      this._gridScroll.addChild(card.container);
      this._cards.push(card);
    }

    const rows = Math.ceil(LEADER_DEFINITIONS.length / GRID_COLS);
    this._gridContentH = rows * (CARD_H + CARD_GAP) - CARD_GAP + 8;

    mainCard.addChild(this._gridScroll);

    // Mask for grid scroll area (height set in layout)
    this._gridMask = new Graphics();
    mainCard.addChild(this._gridMask);
    this._gridScroll.mask = this._gridMask;

    // Wheel scroll on grid
    this._gridScroll.eventMode = "static";
    this._gridScroll.on("wheel", (e) => this._onGridWheel(e));

    // --- Detail panel (right) ---
    const detailX = gridW + 8;
    const detailY = 60;
    this._detailPanel = new Container();
    this._detailPanel.position.set(detailX, detailY);
    mainCard.addChild(this._detailPanel);

    // Build detail panel structure
    this._buildDetailPanel();

    // --- Bottom navigation ---
    const nextBtn = this._makeNavBtn("SELECT RACE  >", 160, 34, true);
    nextBtn.on("pointerdown", () => this.onNext?.());
    this._nextBtn = nextBtn;
    mainCard.addChild(nextBtn);

    // Select first leader (Arthur)
    this._selectLeader(this._selectedId);
  }

  private _nextBtn!: Container;

  private _makeLeaderCard(
    leader: LeaderDef,
    x: number,
    y: number,
  ): {
    id: LeaderId;
    bg: Graphics;
    container: Container;
    portraitSprite?: AnimatedSprite;
  } {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = "pointer";

    const bg = new Graphics();
    c.addChild(bg);

    // Portrait placeholder (coloured square with initial)
    const portrait = new Graphics()
      .roundRect(6, 6, CARD_W - 12, CARD_H - 36, 3)
      .fill({ color: 0x1a1e2e });
    c.addChild(portrait);

    let portraitSprite: AnimatedSprite | undefined;
    const portraitW = CARD_W - 12;
    const portraitH = CARD_H - 36;

    if (leader.id === "arthur") {
      const frames = animationManager.getFrames(
        UnitType.SWORDSMAN,
        UnitState.IDLE,
      );
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 1);
        sprite.width = portraitW - 4;
        sprite.height = portraitH - 4;
        sprite.position.set(CARD_W / 2, portraitH + 2);
        const fs = animationManager.getFrameSet(
          UnitType.SWORDSMAN,
          UnitState.IDLE,
        );
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        c.addChild(sprite);
        portraitSprite = sprite;
        portrait.visible = false;
      }
    }

    if (!portraitSprite) {
      const initial = new Text({
        text: leader.name.charAt(0),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 22,
          fill: 0xffd700,
          fontWeight: "bold",
        }),
      });
      initial.anchor.set(0.5, 0.5);
      initial.position.set(CARD_W / 2, (CARD_H - 30) / 2 + 6);
      c.addChild(initial);
    }

    const nameText = new Text({
      text: leader.name.toUpperCase(),
      style: STYLE_LEADER_NAME,
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(CARD_W / 2, CARD_H - 30);
    c.addChild(nameText);

    const titleText = new Text({
      text: leader.title,
      style: STYLE_LEADER_TITLE,
    });
    titleText.anchor.set(0.5, 0);
    titleText.position.set(CARD_W / 2, CARD_H - 17);
    c.addChild(titleText);

    c.on("pointerdown", () => this._selectLeader(leader.id));

    this._refreshCard(bg, false);

    return { id: leader.id, bg, container: c, portraitSprite };
  }

  private _buildDetailPanel(): void {
    const dp = this._detailPanel;
    dp.removeChildren();

    const panelBg = new Graphics()
      .roundRect(0, 0, DETAIL_W - DETAIL_PAD, 380, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.8 })
      .roundRect(0, 0, DETAIL_W - DETAIL_PAD, 380, 6)
      .stroke({ color: 0x334466, width: 1 });
    dp.addChild(panelBg);

    // Portrait area
    this._detailPortrait = new Graphics()
      .roundRect(8, 8, DETAIL_W - DETAIL_PAD - 16, 90, 4)
      .fill({ color: 0x151525 });
    dp.addChild(this._detailPortrait);

    // Portrait initial text (updated on select)
    const portraitInitial = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 48,
        fill: 0xffd700,
        fontWeight: "bold",
      }),
    });
    portraitInitial.anchor.set(0.5, 0.5);
    portraitInitial.position.set((DETAIL_W - DETAIL_PAD) / 2, 53);
    dp.addChild(portraitInitial);
    this._portraitInitial = portraitInitial;

    // Name
    this._detailName = new Text({ text: "", style: STYLE_DETAIL_NAME });
    this._detailName.anchor.set(0.5, 0);
    this._detailName.position.set((DETAIL_W - DETAIL_PAD) / 2, 106);
    dp.addChild(this._detailName);

    // Title
    this._detailTitle = new Text({ text: "", style: STYLE_DETAIL_TITLE });
    this._detailTitle.anchor.set(0.5, 0);
    this._detailTitle.position.set((DETAIL_W - DETAIL_PAD) / 2, 126);
    dp.addChild(this._detailTitle);

    // Divider
    dp.addChild(
      new Graphics()
        .rect(8, 146, DETAIL_W - DETAIL_PAD - 16, 1)
        .fill({ color: 0x334466 }),
    );

    // Flavor
    const flavorLabel = new Text({
      text: "LORE",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0x556677,
        letterSpacing: 2,
      }),
    });
    flavorLabel.position.set(10, 154);
    dp.addChild(flavorLabel);

    this._detailFlavor = new Text({ text: "", style: STYLE_DETAIL_FLAVOR });
    this._detailFlavor.position.set(10, 166);
    dp.addChild(this._detailFlavor);

    // Divider
    dp.addChild(
      new Graphics()
        .rect(8, 224, DETAIL_W - DETAIL_PAD - 16, 1)
        .fill({ color: 0x334466 }),
    );

    // Bonus
    const bonusLabel = new Text({ text: "BONUS", style: STYLE_BONUS_LABEL });
    bonusLabel.position.set(10, 232);
    dp.addChild(bonusLabel);

    this._detailBonus = new Text({ text: "", style: STYLE_BONUS_TEXT });
    this._detailBonus.position.set(10, 248);
    dp.addChild(this._detailBonus);
  }

  private _portraitInitial!: Text;
  private _detailPortraitSprite?: AnimatedSprite;

  private _selectLeader(id: LeaderId): void {
    this._selectedId = id;

    // Refresh card borders
    for (const card of this._cards) {
      this._refreshCard(card.bg, card.id === id);
    }

    // Update detail panel
    const leader = LEADER_DEFINITIONS.find((l) => l.id === id);
    if (!leader) return;

    // Clean up previous portrait sprite
    if (this._detailPortraitSprite) {
      this._detailPortraitSprite.stop();
      this._detailPortraitSprite.destroy();
      this._detailPortraitSprite = undefined;
    }

    // Show swordsman sprite for Arthur, initial for others
    if (leader.id === "arthur") {
      this._portraitInitial.visible = false;
      this._detailPortrait.visible = false;
      const frames = animationManager.getFrames(
        UnitType.SWORDSMAN,
        UnitState.IDLE,
      );
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 1);
        sprite.width = 70;
        sprite.height = 70;
        sprite.position.set((DETAIL_W - DETAIL_PAD) / 2, 96);
        const fs = animationManager.getFrameSet(
          UnitType.SWORDSMAN,
          UnitState.IDLE,
        );
        sprite.animationSpeed = fs.fps / 60;
        sprite.loop = true;
        sprite.play();
        this._detailPanel.addChild(sprite);
        this._detailPortraitSprite = sprite;
      }
    } else {
      this._portraitInitial.visible = true;
      this._portraitInitial.text = leader.name.charAt(0);
    }

    this._detailName.text = leader.name.toUpperCase();
    this._detailTitle.text = leader.title;
    this._detailFlavor.text = leader.flavor;
    this._detailBonus.text = leader.bonusLabel;
  }

  private _refreshCard(bg: Graphics, selected: boolean): void {
    bg.clear();
    bg.roundRect(0, 0, CARD_W, CARD_H, 6)
      .fill({ color: selected ? 0x1a1e32 : 0x10101e })
      .roundRect(0, 0, CARD_W, CARD_H, 6)
      .stroke({
        color: selected ? CARD_SELECTED_BORDER : CARD_NORMAL_BORDER,
        width: selected ? 2 : 1,
      });
  }

  private _makeNavBtn(
    label: string,
    w: number,
    h: number,
    primary = false,
  ): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: primary ? 13 : 11,
        fill: primary ? 0x88ffaa : 0x88bbff,
        fontWeight: "bold",
        letterSpacing: 1,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => {
      bg.tint = primary ? 0xaaffcc : 0xaaddff;
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
    });

    return btn;
  }

  private _onGridWheel(e: any): void {
    const maxScroll = Math.max(0, this._gridContentH - this._gridViewH);
    this._gridScrollY = Math.max(
      0,
      Math.min(maxScroll, this._gridScrollY + e.deltaY * 0.5),
    );
    this._gridScroll.position.y = 60 - this._gridScrollY;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    // Dynamic card height: use most of screen height with padding
    const cardH = Math.min(540, sh - 60);
    const gridViewH = cardH - 60 - 60; // top header + bottom buttons
    this._gridViewH = gridViewH;
    // Rebuild background rect
    const mc = this._mainCard;
    const bg = mc.children[0] as Graphics;
    bg.clear();
    bg.roundRect(0, 0, this._mainCardW, cardH, 8)
      .fill({ color: 0x10102a, alpha: 0.97 })
      .roundRect(0, 0, this._mainCardW, cardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

    // Update grid mask to match view area
    const gridAreaX = GRID_PAD;
    const gridAreaY = 60;
    this._gridMask.clear();
    this._gridMask
      .rect(gridAreaX, gridAreaY, GRID_COLS * (CARD_W + CARD_GAP), gridViewH)
      .fill({ color: 0xffffff });

    // Position "Next" button at the bottom-right
    const nextBtn = this._nextBtn;
    nextBtn.position.set(this._mainCardW - 176, cardH - 50);

    // Center card on screen
    mc.position.set(
      Math.floor((sw - this._mainCardW) / 2),
      Math.floor((sh - cardH) / 2),
    );
  }
}

export const leaderSelectScreen = new LeaderSelectScreen();
