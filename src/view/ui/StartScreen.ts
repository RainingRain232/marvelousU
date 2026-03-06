// Full-screen title screen: "Rain's Autobattler" + START button
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { RuneCorners } from "@view/fx/RuneCorners";

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 48,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 4,
  dropShadow: {
    color: 0x000000,
    blur: 8,
    distance: 4,
    angle: Math.PI / 4,
    alpha: 0.8,
  },
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 3,
});

export class StartScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _particles!: AmbientParticles;
  private _runes!: RuneCorners;
  private _runeContainer!: Container;
  private _titleText!: Text;
  private _btn!: Container;
  private _btnBg!: Graphics;

  onStart: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Full-screen dark background
    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Ambient floating particles
    this._particles = new AmbientParticles(120);
    this.container.addChild(this._particles.container);

    // Title text
    this._titleText = new Text({ text: "Rain's Autobattler", style: STYLE_TITLE });
    this._titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this._titleText);

    // START button
    const BW = 200;
    const BH = 48;
    this._btn = new Container();
    this._btn.eventMode = "static";
    this._btn.cursor = "pointer";

    this._btnBg = new Graphics();
    this._btn.addChild(this._btnBg);

    const btnLabel = new Text({ text: "START", style: STYLE_BTN });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    this._btn.addChild(btnLabel);

    this._btn.on("pointerover", () => {
      this._btnBg.tint = 0xaaddff;
    });
    this._btn.on("pointerout", () => {
      this._btnBg.tint = 0xffffff;
    });
    this._btn.on("pointerdown", () => {
      this.onStart?.();
    });

    this._drawBtn(BW, BH);
    this.container.addChild(this._btn);

    // Rune corner diamonds around the title area
    this._runeContainer = new Container();
    this._runes = new RuneCorners();
    this._runeContainer.addChild(this._runes.container);
    this.container.addChild(this._runeContainer);

    vm.addToLayer("ui", this.container);
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());
    vm.app.ticker.add((ticker) => {
      if (this.container.visible) {
        const dt = ticker.deltaMS / 1000;
        this._particles.update(dt);
        this._runes.update(dt);
      }
    });
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

  private _drawBtn(w: number, h: number): void {
    this._btnBg.clear();
    this._btnBg
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: 0x4488cc, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Redraw background to fill screen
    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: 0x0a0a18 });

    this._particles.resize(sw, sh);

    this._titleText.position.set(sw / 2, sh / 2 - 60);

    const BW = 200;
    this._btn.position.set(sw / 2 - BW / 2, sh / 2 + 20);

    // Rune diamonds around the title + button area
    const runeW = 500;
    const runeH = 200;
    this._runeContainer.position.set(
      Math.floor((sw - runeW) / 2),
      Math.floor(sh / 2 - 120),
    );
    this._runes.build(runeW, runeH);
  }
}

export const startScreen = new StartScreen();
