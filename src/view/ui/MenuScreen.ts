// Menu screen: AI toggle + map size selector + Start Game button
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";

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

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SIZE_ACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SIZE_INACTIVE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

export interface MapSize {
  label: string;
  width: number;
  height: number;
}

const BASE_W = BalanceConfig.GRID_WIDTH;
const BASE_H = BalanceConfig.GRID_HEIGHT;

export const MAP_SIZES: MapSize[] = [
  { label: "STANDARD",  width: BASE_W,     height: BASE_H     },
  { label: "DOUBLE",    width: BASE_W * 2, height: BASE_H * 2 },
  { label: "TRIPLE",    width: BASE_W * 3, height: BASE_H * 3 },
  { label: "QUADRUPLE", width: BASE_W * 4, height: BASE_H * 4 },
];

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

export class MenuScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  // AI toggle state
  private _p2IsAI = true;
  private _aiToggleBg!: Graphics;
  private _aiToggleLabel!: Text;

  // Map size state
  private _selectedSizeIndex = 0;
  private _sizeBtns: Array<{ bg: Graphics; label: Text }> = [];

  // card stored for layout
  private _card!: Container;
  private _cardW = 360;
  private _cardH = 320;

  onAIToggle: ((isAI: boolean) => void) | null = null;
  onStartGame: (() => void) | null = null;

  get selectedMapSize(): MapSize {
    return MAP_SIZES[this._selectedSizeIndex];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Full-screen background
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Card panel
    const CW = this._cardW;
    const CH = this._cardH;
    const card = makePanel(CW, CH);
    this.container.addChild(card);
    this._card = card;

    // Title
    const title = new Text({ text: "MENU", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 18);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics().rect(20, 58, CW - 40, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- AI toggle ---
    const aiLabel = new Text({ text: "P2 CONTROL", style: STYLE_LABEL });
    aiLabel.position.set(20, 70);
    card.addChild(aiLabel);

    const TW = CW - 40;
    const TH = 32;
    const toggleBtn = new Container();
    toggleBtn.eventMode = "static";
    toggleBtn.cursor = "pointer";
    toggleBtn.position.set(20, 90);

    const toggleBg = new Graphics();
    toggleBtn.addChild(toggleBg);

    const toggleLabel = new Text({ text: "", style: STYLE_BTN });
    toggleLabel.anchor.set(0.5, 0.5);
    toggleLabel.position.set(TW / 2, TH / 2);
    toggleBtn.addChild(toggleLabel);

    this._aiToggleBg = toggleBg;
    this._aiToggleLabel = toggleLabel;

    toggleBtn.on("pointerdown", () => {
      this._p2IsAI = !this._p2IsAI;
      this._refreshAIToggle(TW, TH);
      this.onAIToggle?.(this._p2IsAI);
    });

    card.addChild(toggleBtn);
    this._refreshAIToggle(TW, TH);

    // Divider
    card.addChild(
      new Graphics().rect(20, 136, CW - 40, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- Map size selector ---
    const mapLabel = new Text({ text: "MAP SIZE", style: STYLE_LABEL });
    mapLabel.position.set(20, 148);
    card.addChild(mapLabel);

    // 4 buttons in a row
    const btnCount = MAP_SIZES.length;
    const gap = 6;
    const totalGap = gap * (btnCount - 1);
    const sbW = Math.floor((CW - 40 - totalGap) / btnCount);
    const sbH = 30;

    this._sizeBtns = [];
    for (let i = 0; i < btnCount; i++) {
      const sizeBtn = new Container();
      sizeBtn.eventMode = "static";
      sizeBtn.cursor = "pointer";
      sizeBtn.position.set(20 + i * (sbW + gap), 168);

      const sizeBg = new Graphics();
      sizeBtn.addChild(sizeBg);

      const dims = `${MAP_SIZES[i].width}×${MAP_SIZES[i].height}`;
      const topLabel = new Text({ text: MAP_SIZES[i].label, style: STYLE_SIZE_INACTIVE });
      topLabel.anchor.set(0.5, 0);
      topLabel.position.set(sbW / 2, 4);
      sizeBtn.addChild(topLabel);

      const dimLabel = new Text({ text: dims, style: STYLE_SIZE_INACTIVE });
      dimLabel.anchor.set(0.5, 1);
      dimLabel.position.set(sbW / 2, sbH - 3);
      sizeBtn.addChild(dimLabel);

      const idx = i;
      sizeBtn.on("pointerdown", () => {
        this._selectedSizeIndex = idx;
        this._refreshSizeBtns(sbW, sbH);
      });

      card.addChild(sizeBtn);
      this._sizeBtns.push({ bg: sizeBg, label: topLabel });
      // store dim label too for style refresh
      (this._sizeBtns[i] as typeof this._sizeBtns[0] & { dim: Text }).dim = dimLabel;
    }
    this._refreshSizeBtns(sbW, sbH);

    // Divider
    card.addChild(
      new Graphics().rect(20, 212, CW - 40, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // --- START GAME button ---
    const BW = CW - 40;
    const BH = 42;
    const startBtn = new Container();
    startBtn.eventMode = "static";
    startBtn.cursor = "pointer";
    startBtn.position.set(20, 226);

    const startBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    startBtn.addChild(startBg);

    const startLabel = new Text({
      text: "START GAME",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x88ffaa,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.position.set(BW / 2, BH / 2);
    startBtn.addChild(startLabel);

    startBtn.on("pointerover", () => { startBg.tint = 0xaaffcc; });
    startBtn.on("pointerout", () => { startBg.tint = 0xffffff; });
    startBtn.on("pointerdown", () => { this.onStartGame?.(); });

    card.addChild(startBtn);

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
  // Private
  // ---------------------------------------------------------------------------

  private _refreshAIToggle(w: number, h: number): void {
    const active = this._p2IsAI;
    this._aiToggleBg.clear();
    this._aiToggleBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: active ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: active ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._aiToggleLabel.text = active
      ? "P2: AI  [click to disable]"
      : "P2: HUMAN  [click to enable AI]";
    this._aiToggleLabel.style.fill = active ? 0x88ffaa : 0xff8888;
  }

  private _refreshSizeBtns(w: number, h: number): void {
    for (let i = 0; i < this._sizeBtns.length; i++) {
      const entry = this._sizeBtns[i] as { bg: Graphics; label: Text; dim: Text };
      const selected = i === this._selectedSizeIndex;

      entry.bg.clear();
      entry.bg
        .roundRect(0, 0, w, h, 4)
        .fill({ color: selected ? 0x1a2e1a : 0x12121e })
        .roundRect(0, 0, w, h, 4)
        .stroke({ color: selected ? 0xffd700 : 0x334455, width: selected ? 1.5 : 1 });

      const style = selected ? STYLE_SIZE_ACTIVE : STYLE_SIZE_INACTIVE;
      entry.label.style = style;
      entry.dim.style = style;
    }
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    this._card.position.set(
      Math.floor((sw - this._cardW) / 2),
      Math.floor((sh - this._cardH) / 2),
    );
  }
}

export const menuScreen = new MenuScreen();
