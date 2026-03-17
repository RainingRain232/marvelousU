// Full-screen title screen: "Rain's Autobattler" + START button
// Enhanced with ornate decorations, arcane circles, and rich polygon detail.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { AmbientParticles } from "@view/fx/AmbientParticles";
import { RuneCorners } from "@view/fx/RuneCorners";
import { drawOrnateButton } from "@view/fx/OrnateFrame";
import { t } from "@/i18n/i18n";

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 48,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 6,
  dropShadow: {
    color: 0x000000,
    blur: 12,
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
  letterSpacing: 4,
});

export class StartScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _decorGfx!: Graphics;
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

    // Static decorations layer (arcane circles, border patterns)
    this._decorGfx = new Graphics();
    this.container.addChild(this._decorGfx);

    // Ambient floating particles (more for richer effect)
    this._particles = new AmbientParticles(160);
    this.container.addChild(this._particles.container);

    // Title text
    this._titleText = new Text({ text: t("start_screen.title"), style: STYLE_TITLE });
    this._titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this._titleText);

    // START button
    const BW = 220;
    const BH = 48;
    this._btn = new Container();
    this._btn.eventMode = "static";
    this._btn.cursor = "pointer";

    this._btnBg = new Graphics();
    this._btn.addChild(this._btnBg);

    const btnLabel = new Text({ text: t("start"), style: STYLE_BTN });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    this._btn.addChild(btnLabel);

    this._btn.on("pointerover", () => {
      this._drawBtn(BW, BH, true);
    });
    this._btn.on("pointerout", () => {
      this._drawBtn(BW, BH, false);
    });
    this._btn.on("pointerdown", () => {
      this.onStart?.();
    });

    this._drawBtn(BW, BH, false);
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

  private _drawBtn(w: number, h: number, hover: boolean): void {
    this._btnBg.clear();
    drawOrnateButton(this._btnBg, 0, 0, w, h, 0x4488cc, { selected: hover });
    // Extra glow on hover
    if (hover) {
      this._btnBg.roundRect(-2, -2, w + 4, h + 4, 10);
      this._btnBg.fill({ color: 0x4488cc, alpha: 0.08 });
    }
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Redraw background to fill screen
    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: 0x0a0a18 });

    // Draw static decorations
    this._decorGfx.clear();
    this._drawDecorations(sw, sh);

    this._particles.resize(sw, sh);

    this._titleText.position.set(sw / 2, sh / 2 - 60);

    const BW = 220;
    this._btn.position.set(sw / 2 - BW / 2, sh / 2 + 20);

    // Rune diamonds around the title + button area
    const runeW = 540;
    const runeH = 220;
    this._runeContainer.position.set(
      Math.floor((sw - runeW) / 2),
      Math.floor(sh / 2 - 130),
    );
    this._runes.build(runeW, runeH);
  }

  /** Draw background decorative elements: arcane circles, border patterns */
  private _drawDecorations(sw: number, sh: number): void {
    const g = this._decorGfx;
    const cx = sw / 2;
    const cy = sh / 2;

    // === Large arcane circle behind the title area ===
    const mainR = 200;
    g.circle(cx, cy - 20, mainR);
    g.stroke({ color: 0xffd700, alpha: 0.04, width: 1.5 });
    // Second ring
    g.circle(cx, cy - 20, mainR - 15);
    g.stroke({ color: 0xffd700, alpha: 0.03, width: 0.8 });
    // Tick marks on outer ring (24 ticks)
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      const innerR = mainR - 8;
      g.moveTo(cx + Math.cos(a) * innerR, cy - 20 + Math.sin(a) * innerR);
      g.lineTo(cx + Math.cos(a) * mainR, cy - 20 + Math.sin(a) * mainR);
      g.stroke({ color: 0xffd700, alpha: 0.025, width: 0.5 });
    }
    // Cardinal cross lines
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      g.moveTo(cx + Math.cos(a) * 80, cy - 20 + Math.sin(a) * 80);
      g.lineTo(cx + Math.cos(a) * (mainR - 20), cy - 20 + Math.sin(a) * (mainR - 20));
      g.stroke({ color: 0xffd700, alpha: 0.02, width: 0.5 });
    }
    // Inner hexagon
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const na = ((i + 1) * Math.PI) / 3;
      const r = 100;
      g.moveTo(cx + Math.cos(a) * r, cy - 20 + Math.sin(a) * r);
      g.lineTo(cx + Math.cos(na) * r, cy - 20 + Math.sin(na) * r);
      g.stroke({ color: 0xffd700, alpha: 0.025, width: 0.5 });
    }
    // Inner triangle
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const na = ((i + 1) * Math.PI * 2) / 3 - Math.PI / 2;
      const r = 130;
      g.moveTo(cx + Math.cos(a) * r, cy - 20 + Math.sin(a) * r);
      g.lineTo(cx + Math.cos(na) * r, cy - 20 + Math.sin(na) * r);
      g.stroke({ color: 0xffd700, alpha: 0.02, width: 0.5 });
    }

    // === Border frame around the screen ===
    const pad = 30;
    // Outer border
    g.rect(pad, pad, sw - pad * 2, sh - pad * 2);
    g.stroke({ color: 0xffd700, alpha: 0.04, width: 1 });
    // Inner border
    g.rect(pad + 4, pad + 4, sw - pad * 2 - 8, sh - pad * 2 - 8);
    g.stroke({ color: 0xffd700, alpha: 0.025, width: 0.5 });

    // Corner ornaments on screen border
    const corners: [number, number, number, number][] = [
      [pad, pad, 1, 1],
      [sw - pad, pad, -1, 1],
      [pad, sh - pad, 1, -1],
      [sw - pad, sh - pad, -1, -1],
    ];
    for (const [ccx, ccy, dx, dy] of corners) {
      // L-shaped bracket
      const bLen = 40;
      g.moveTo(ccx, ccy + dy * bLen);
      g.lineTo(ccx, ccy);
      g.lineTo(ccx + dx * bLen, ccy);
      g.stroke({ color: 0xffd700, alpha: 0.06, width: 1.5 });
      // Inner L bracket
      g.moveTo(ccx + dx * 4, ccy + dy * (bLen - 10));
      g.lineTo(ccx + dx * 4, ccy + dy * 4);
      g.lineTo(ccx + dx * (bLen - 10), ccy + dy * 4);
      g.stroke({ color: 0xffd700, alpha: 0.03, width: 0.8 });
      // Diamond at corner
      const ds = 5;
      g.moveTo(ccx + dx * 8, ccy + dy * 8 - ds);
      g.lineTo(ccx + dx * 8 + ds, ccy + dy * 8);
      g.lineTo(ccx + dx * 8, ccy + dy * 8 + ds);
      g.lineTo(ccx + dx * 8 - ds, ccy + dy * 8);
      g.closePath();
      g.fill({ color: 0xffd700, alpha: 0.04 });
    }

    // Edge midpoint diamonds
    const ds = 4;
    // Top
    g.moveTo(cx, pad - ds); g.lineTo(cx + ds, pad); g.lineTo(cx, pad + ds); g.lineTo(cx - ds, pad);
    g.closePath(); g.fill({ color: 0xffd700, alpha: 0.04 });
    // Bottom
    g.moveTo(cx, sh - pad - ds); g.lineTo(cx + ds, sh - pad); g.lineTo(cx, sh - pad + ds); g.lineTo(cx - ds, sh - pad);
    g.closePath(); g.fill({ color: 0xffd700, alpha: 0.04 });
    // Left
    g.moveTo(pad - ds, cy); g.lineTo(pad, cy - ds); g.lineTo(pad + ds, cy); g.lineTo(pad, cy + ds);
    g.closePath(); g.fill({ color: 0xffd700, alpha: 0.04 });
    // Right
    g.moveTo(sw - pad - ds, cy); g.lineTo(sw - pad, cy - ds); g.lineTo(sw - pad + ds, cy); g.lineTo(sw - pad, cy + ds);
    g.closePath(); g.fill({ color: 0xffd700, alpha: 0.04 });
  }
}

export const startScreen = new StartScreen();
