// Armory screen — placeholder for future equipment/upgrade content.
// Contains the final "START GAME" button that actually boots the simulation.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_COMING_SOON = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0x556677,
  letterSpacing: 2,
});

const STYLE_SUB = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x445566,
  letterSpacing: 1,
  wordWrap: true,
  wordWrapWidth: 340,
});

export class ArmoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _card!: Container;
  private _cardW = 440;
  private _cardH = 340;

  onStartGame: (() => void) | null = null;
  onBack: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    const CW = this._cardW;
    const CH = this._cardH;

    const card = new Container();
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CW, CH, 8)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CW, CH, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );
    this._card = card;
    this.container.addChild(card);

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 80, 28, false);
    backBtn.position.set(16, 14);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Title
    const title = new Text({ text: "ARMORY", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 14);
    card.addChild(title);

    // Divider
    card.addChild(
      new Graphics().rect(16, 50, CW - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Icon placeholder
    const iconBg = new Graphics()
      .roundRect(CW / 2 - 40, 80, 80, 80, 8)
      .fill({ color: 0x111122 })
      .roundRect(CW / 2 - 40, 80, 80, 80, 8)
      .stroke({ color: 0x223344, width: 1 });
    card.addChild(iconBg);

    const iconText = new Text({ text: "⚔", style: new TextStyle({
      fontFamily: "monospace", fontSize: 36, fill: 0x334455, fontWeight: "bold",
    })});
    iconText.anchor.set(0.5, 0.5);
    iconText.position.set(CW / 2, 120);
    card.addChild(iconText);

    // Coming soon label
    const comingSoon = new Text({ text: "COMING SOON", style: STYLE_COMING_SOON });
    comingSoon.anchor.set(0.5, 0);
    comingSoon.position.set(CW / 2, 174);
    card.addChild(comingSoon);

    // Description
    const desc = new Text({
      text: "The Armory will let you equip relics, upgrades, and artifacts to power up your forces before battle.",
      style: STYLE_SUB,
    });
    desc.anchor.set(0.5, 0);
    desc.position.set(CW / 2, 198);
    card.addChild(desc);

    // Divider
    card.addChild(
      new Graphics().rect(16, CH - 56, CW - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // START GAME button (primary green — this is the real launch button)
    const startBtn = this._makeStartBtn(CW - 56, 38);
    startBtn.position.set(28, CH - 48);
    startBtn.on("pointerdown", () => this.onStartGame?.());
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

  private _makeStartBtn(w: number, h: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    btn.addChild(bg);

    const txt = new Text({ text: "START GAME", style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 15,
      fill: 0x88ffaa,
      fontWeight: "bold",
      letterSpacing: 2,
    })});
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaffcc; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
  }

  private _makeNavBtn(label: string, w: number, h: number, _primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: new TextStyle({
      fontFamily: "monospace", fontSize: 11, fill: 0x88bbff, fontWeight: "bold", letterSpacing: 1,
    })});
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
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

export const armoryScreen = new ArmoryScreen();
