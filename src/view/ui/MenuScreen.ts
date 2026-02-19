// Menu screen: AI toggle + Start Game button (enters PREP phase)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 28,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

function makePanel(w: number, h: number): Graphics {
  return new Graphics()
    .roundRect(0, 0, w, h, 8)
    .fill({ color: 0x10102a, alpha: 0.95 })
    .roundRect(0, 0, w, h, 8)
    .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });
}

export class MenuScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  // AI toggle state
  private _p2IsAI = true;
  private _aiToggleBg!: Graphics;
  private _aiToggleLabel!: Text;

  onAIToggle: ((isAI: boolean) => void) | null = null;
  onStartGame: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Full-screen background
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Card panel
    const CARD_W = 320;
    const CARD_H = 240;
    const card = makePanel(CARD_W, CARD_H);
    this.container.addChild(card);

    // "MENU" title inside card
    const title = new Text({ text: "MENU", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 20);
    card.addChild(title);

    // Divider
    const divider = new Graphics()
      .rect(20, 60, CARD_W - 40, 1)
      .fill({ color: BORDER_COLOR, alpha: 0.2 });
    card.addChild(divider);

    // AI toggle section label
    const aiSectionLabel = new Text({ text: "P2 CONTROL", style: STYLE_LABEL });
    aiSectionLabel.position.set(20, 76);
    card.addChild(aiSectionLabel);

    // AI toggle button
    const TW = CARD_W - 40;
    const TH = 34;
    const toggleBtn = new Container();
    toggleBtn.eventMode = "static";
    toggleBtn.cursor = "pointer";
    toggleBtn.position.set(20, 100);

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

    // START GAME button
    const BW = CARD_W - 40;
    const BH = 42;
    const startBtn = new Container();
    startBtn.eventMode = "static";
    startBtn.cursor = "pointer";
    startBtn.position.set(20, 170);

    const startBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    startBtn.addChild(startBg);

    const startLabel = new Text({ text: "START GAME", style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 15,
      fill: 0x88ffaa,
      fontWeight: "bold",
      letterSpacing: 2,
    }) });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.position.set(BW / 2, BH / 2);
    startBtn.addChild(startLabel);

    startBtn.on("pointerover", () => { startBg.tint = 0xaaffcc; });
    startBtn.on("pointerout", () => { startBg.tint = 0xffffff; });
    startBtn.on("pointerdown", () => { this.onStartGame?.(); });

    card.addChild(startBtn);

    // Store card ref for layout
    this._card = card;
    this._cardW = CARD_W;
    this._cardH = CARD_H;

    vm.addToLayer("ui", this.container);
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());
  }

  // card is stored for centering
  private _card!: Graphics;
  private _cardW = 320;
  private _cardH = 240;

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
