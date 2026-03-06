// Settings screen — accessible from main menu
// Persists: music volume, game speed, camera scroll speed to localStorage.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 28,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_BTN_ACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_BTN_INACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
});

// ---------------------------------------------------------------------------
// Persistence key / defaults
// ---------------------------------------------------------------------------

const LS_KEY = "game_settings";

interface SavedSettings {
  musicVolume?: number;
  gameSpeed?: number;
  scrollSpeed?: number;
}

const GAME_SPEEDS = [1, 1.5, 2, 3];
const GAME_SPEED_LABELS = ["1x", "1.5x", "2x", "3x"];

const SCROLL_SPEEDS = [0.5, 1, 1.5];
const SCROLL_SPEED_LABELS = ["Slow", "Normal", "Fast"];

// ---------------------------------------------------------------------------
// Local helper: panel container with rounded-rect dark background
// ---------------------------------------------------------------------------

function makePanel(w: number, h: number): Container {
  const c = new Container();
  c.addChild(
    new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
  );
  return c;
}

// ---------------------------------------------------------------------------
// Local helper: action / navigation button (matches MenuScreen pattern)
// ---------------------------------------------------------------------------

function makeActionBtn(
  w: number,
  h: number,
  label: string,
  fillColor: number,
  strokeColor: number,
  textColor: number,
  onClick: () => void,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics()
    .roundRect(0, 0, w, h, 6)
    .fill({ color: fillColor })
    .roundRect(0, 0, w, h, 6)
    .stroke({ color: strokeColor, width: 2 });
  btn.addChild(bg);

  const lbl = new Text({
    text: label,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: textColor,
      fontWeight: "bold",
      letterSpacing: 2,
    }),
  });
  lbl.anchor.set(0.5, 0.5);
  lbl.position.set(w / 2, h / 2);
  btn.addChild(lbl);

  btn.on("pointerover", () => { bg.tint = textColor; });
  btn.on("pointerout",  () => { bg.tint = 0xffffff; });
  btn.on("pointerdown", onClick);

  return btn;
}

// ---------------------------------------------------------------------------
// Local helper: small selector button (active / inactive state)
// ---------------------------------------------------------------------------

interface SelectorBtn {
  container: Container;
  bg: Graphics;
  label: Text;
}

function makeSelectorBtn(w: number, h: number, label: string): SelectorBtn {
  const container = new Container();
  container.eventMode = "static";
  container.cursor = "pointer";

  const bg = new Graphics();
  container.addChild(bg);

  const lbl = new Text({ text: label, style: STYLE_BTN_INACTIVE });
  lbl.anchor.set(0.5, 0.5);
  lbl.position.set(w / 2, h / 2);
  container.addChild(lbl);

  return { container, bg, label: lbl };
}

function refreshSelectorBtn(
  btn: SelectorBtn,
  w: number,
  h: number,
  active: boolean,
): void {
  btn.bg.clear();
  btn.bg
    .roundRect(0, 0, w, h, 4)
    .fill({ color: active ? 0x1a2e1a : 0x12121e })
    .roundRect(0, 0, w, h, 4)
    .stroke({ color: active ? 0xffd700 : 0x334455, width: active ? 1.5 : 1 });
  btn.label.style = active ? STYLE_BTN_ACTIVE : STYLE_BTN_INACTIVE;
}

// ---------------------------------------------------------------------------
// SettingsScreen
// ---------------------------------------------------------------------------

export class SettingsScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  // Card geometry
  private readonly _cardW = 380;
  private _cardH = 0;
  private _card!: Container;

  // Settings state
  private _musicVolume = 50;   // 0-100
  private _gameSpeedIdx = 0;   // index into GAME_SPEEDS
  private _scrollSpeedIdx = 1; // index into SCROLL_SPEEDS

  // UI references for volume row
  private _volValueLabel!: Text;

  // UI references for selector rows
  private _speedBtns: SelectorBtn[] = [];
  private _scrollBtns: SelectorBtn[] = [];

  // Callbacks
  onBack: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Public getters
  // ---------------------------------------------------------------------------

  get musicVolume(): number {
    return this._musicVolume;
  }

  get gameSpeed(): number {
    return GAME_SPEEDS[this._gameSpeedIdx];
  }

  get scrollSpeed(): number {
    return SCROLL_SPEEDS[this._scrollSpeedIdx];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._loadFromStorage();
    this._buildCard();

    this.container.visible = false;

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const saved: SavedSettings = raw ? JSON.parse(raw) : {};

      if (typeof saved.musicVolume === "number") {
        this._musicVolume = Math.max(0, Math.min(100, saved.musicVolume));
      }

      if (typeof saved.gameSpeed === "number") {
        const idx = GAME_SPEEDS.indexOf(saved.gameSpeed);
        if (idx !== -1) this._gameSpeedIdx = idx;
      }

      if (typeof saved.scrollSpeed === "number") {
        const idx = SCROLL_SPEEDS.indexOf(saved.scrollSpeed);
        if (idx !== -1) this._scrollSpeedIdx = idx;
      }
    } catch {
      // Corrupted localStorage — use defaults silently
    }
  }

  private _saveToStorage(): void {
    const data: SavedSettings = {
      musicVolume: this._musicVolume,
      gameSpeed: GAME_SPEEDS[this._gameSpeedIdx],
      scrollSpeed: SCROLL_SPEEDS[this._scrollSpeedIdx],
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  // ---------------------------------------------------------------------------
  // Build card UI
  // ---------------------------------------------------------------------------

  private _buildCard(): void {
    const CW = this._cardW;
    let curY = 0;

    // We will set final card height after all rows are placed and then redraw
    // the background. Use a placeholder height of 600 for now.
    const card = makePanel(CW, 600);
    this._card = card;
    this.container.addChild(card);

    // --- Title ---
    const title = new Text({ text: "SETTINGS", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 18);
    card.addChild(title);

    curY = 58;

    // Divider under title
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    curY += 14;

    // --- Music Volume row ---
    curY = this._buildVolumeRow(card, CW, curY);
    curY += 12;

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );
    curY += 14;

    // --- Game Speed row ---
    curY = this._buildGameSpeedRow(card, CW, curY);
    curY += 12;

    // Divider
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );
    curY += 14;

    // --- Camera Scroll Speed row ---
    curY = this._buildScrollSpeedRow(card, CW, curY);
    curY += 16;

    // Divider before BACK
    card.addChild(
      new Graphics()
        .rect(20, curY, CW - 40, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );
    curY += 12;

    // --- BACK button ---
    const backBtn = makeActionBtn(
      CW - 40,
      40,
      "<  BACK",
      0x1a1a2a,
      0x4466aa,
      0x88aadd,
      () => {
        this.onBack?.();
      },
    );
    backBtn.position.set(20, curY);
    card.addChild(backBtn);
    curY += 40 + 14;

    // Final card height — redraw background to correct size
    this._cardH = curY;
    const cardBg = card.getChildAt(0) as Graphics;
    cardBg.clear();
    cardBg
      .roundRect(0, 0, CW, this._cardH, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, CW, this._cardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
  }

  // ---------------------------------------------------------------------------
  // Row builders
  // ---------------------------------------------------------------------------

  /**
   * Builds the Music Volume row: label, minus button, value text, plus button.
   * Returns the new curY after the row.
   */
  private _buildVolumeRow(card: Container, CW: number, curY: number): number {
    const STEP = 10;
    const ROW_H = 32;
    const BTN_W = 34;
    const BTN_H = 28;

    // Section label
    const sectionLabel = new Text({ text: "MUSIC VOLUME", style: STYLE_LABEL });
    sectionLabel.position.set(20, curY);
    card.addChild(sectionLabel);
    curY += 20;

    // --- Minus button ---
    const minusBtn = new Container();
    minusBtn.eventMode = "static";
    minusBtn.cursor = "pointer";
    minusBtn.position.set(20, curY + (ROW_H - BTN_H) / 2);

    const minusBg = new Graphics()
      .roundRect(0, 0, BTN_W, BTN_H, 4)
      .fill({ color: 0x1a1a2e })
      .roundRect(0, 0, BTN_W, BTN_H, 4)
      .stroke({ color: 0x445566, width: 1 });
    minusBtn.addChild(minusBg);

    const minusLbl = new Text({
      text: "-",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xaabbcc,
        fontWeight: "bold",
      }),
    });
    minusLbl.anchor.set(0.5, 0.5);
    minusLbl.position.set(BTN_W / 2, BTN_H / 2);
    minusBtn.addChild(minusLbl);

    minusBtn.on("pointerover", () => { minusBg.tint = 0xaabbcc; });
    minusBtn.on("pointerout",  () => { minusBg.tint = 0xffffff; });
    minusBtn.on("pointerdown", () => {
      this._musicVolume = Math.max(0, this._musicVolume - STEP);
      this._volValueLabel.text = `${this._musicVolume}%`;
      this._saveToStorage();
    });
    card.addChild(minusBtn);

    // --- Value label (centered between buttons) ---
    const valLabel = new Text({
      text: `${this._musicVolume}%`,
      style: STYLE_VALUE,
    });
    valLabel.anchor.set(0.5, 0.5);
    valLabel.position.set(CW / 2, curY + ROW_H / 2);
    card.addChild(valLabel);
    this._volValueLabel = valLabel;

    // --- Plus button ---
    const plusBtn = new Container();
    plusBtn.eventMode = "static";
    plusBtn.cursor = "pointer";
    plusBtn.position.set(CW - 20 - BTN_W, curY + (ROW_H - BTN_H) / 2);

    const plusBg = new Graphics()
      .roundRect(0, 0, BTN_W, BTN_H, 4)
      .fill({ color: 0x1a1a2e })
      .roundRect(0, 0, BTN_W, BTN_H, 4)
      .stroke({ color: 0x445566, width: 1 });
    plusBtn.addChild(plusBg);

    const plusLbl = new Text({
      text: "+",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xaabbcc,
        fontWeight: "bold",
      }),
    });
    plusLbl.anchor.set(0.5, 0.5);
    plusLbl.position.set(BTN_W / 2, BTN_H / 2);
    plusBtn.addChild(plusLbl);

    plusBtn.on("pointerover", () => { plusBg.tint = 0xaabbcc; });
    plusBtn.on("pointerout",  () => { plusBg.tint = 0xffffff; });
    plusBtn.on("pointerdown", () => {
      this._musicVolume = Math.min(100, this._musicVolume + STEP);
      this._volValueLabel.text = `${this._musicVolume}%`;
      this._saveToStorage();
    });
    card.addChild(plusBtn);

    curY += ROW_H;
    return curY;
  }

  /**
   * Builds the Game Speed row: label + 4 selector buttons (1x / 1.5x / 2x / 3x).
   * Returns the new curY after the row.
   */
  private _buildGameSpeedRow(card: Container, CW: number, curY: number): number {
    const BTN_H = 30;
    const GAP = 6;
    const count = GAME_SPEED_LABELS.length;
    const totalGap = GAP * (count - 1);
    const btnW = Math.floor((CW - 40 - totalGap) / count);

    // Section label
    const sectionLabel = new Text({ text: "GAME SPEED", style: STYLE_LABEL });
    sectionLabel.position.set(20, curY);
    card.addChild(sectionLabel);
    curY += 20;

    this._speedBtns = [];
    for (let i = 0; i < count; i++) {
      const btn = makeSelectorBtn(btnW, BTN_H, GAME_SPEED_LABELS[i]);
      btn.container.position.set(20 + i * (btnW + GAP), curY);

      const idx = i;
      btn.container.on("pointerover", () => {
        if (idx !== this._gameSpeedIdx) {
          btn.bg.tint = 0x6688aa;
        }
      });
      btn.container.on("pointerout", () => {
        btn.bg.tint = 0xffffff;
      });
      btn.container.on("pointerdown", () => {
        this._gameSpeedIdx = idx;
        this._refreshSpeedBtns(btnW, BTN_H);
        this._saveToStorage();
      });

      card.addChild(btn.container);
      this._speedBtns.push(btn);
    }

    this._refreshSpeedBtns(btnW, BTN_H);
    curY += BTN_H;
    return curY;
  }

  /**
   * Builds the Camera Scroll Speed row: label + 3 selector buttons.
   * Returns the new curY after the row.
   */
  private _buildScrollSpeedRow(card: Container, CW: number, curY: number): number {
    const BTN_H = 30;
    const GAP = 6;
    const count = SCROLL_SPEED_LABELS.length;
    const totalGap = GAP * (count - 1);
    const btnW = Math.floor((CW - 40 - totalGap) / count);

    // Section label
    const sectionLabel = new Text({ text: "CAMERA SCROLL SPEED", style: STYLE_LABEL });
    sectionLabel.position.set(20, curY);
    card.addChild(sectionLabel);
    curY += 20;

    this._scrollBtns = [];
    for (let i = 0; i < count; i++) {
      const btn = makeSelectorBtn(btnW, BTN_H, SCROLL_SPEED_LABELS[i]);
      btn.container.position.set(20 + i * (btnW + GAP), curY);

      const idx = i;
      btn.container.on("pointerover", () => {
        if (idx !== this._scrollSpeedIdx) {
          btn.bg.tint = 0x6688aa;
        }
      });
      btn.container.on("pointerout", () => {
        btn.bg.tint = 0xffffff;
      });
      btn.container.on("pointerdown", () => {
        this._scrollSpeedIdx = idx;
        this._refreshScrollBtns(btnW, BTN_H);
        this._saveToStorage();
      });

      card.addChild(btn.container);
      this._scrollBtns.push(btn);
    }

    this._refreshScrollBtns(btnW, BTN_H);
    curY += BTN_H;
    return curY;
  }

  // ---------------------------------------------------------------------------
  // Refresh helpers
  // ---------------------------------------------------------------------------

  private _refreshSpeedBtns(btnW: number, btnH: number): void {
    for (let i = 0; i < this._speedBtns.length; i++) {
      refreshSelectorBtn(this._speedBtns[i], btnW, btnH, i === this._gameSpeedIdx);
    }
  }

  private _refreshScrollBtns(btnW: number, btnH: number): void {
    for (let i = 0; i < this._scrollBtns.length; i++) {
      refreshSelectorBtn(this._scrollBtns[i], btnW, btnH, i === this._scrollSpeedIdx);
    }
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Full-screen dark overlay
    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    // Center the card
    if (this._card) {
      this._card.position.set(
        Math.floor((sw - this._cardW) / 2),
        Math.floor((sh - this._cardH) / 2),
      );
    }
  }
}

export const settingsScreen: SettingsScreen = new SettingsScreen();
