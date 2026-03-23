// ---------------------------------------------------------------------------
// Hunt mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createHuntState } from "./state/HuntState";
import type { HuntState } from "./state/HuntState";
import { HuntConfig, BOWS } from "./config/HuntConfig";
import { updateHunt, shootArrow } from "./systems/HuntSystem";
import { HuntRenderer } from "./view/HuntRenderer";

export class HuntGame {
  private _state!: HuntState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new HuntRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerDown: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _pointerMove: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _pointerUp: (() => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _bowIndex = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showStartScreen();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    this._removePointers();
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _removePointers(): void {
    if (this._pointerDown) { viewManager.app.stage.off("pointerdown", this._pointerDown); this._pointerDown = null; }
    if (this._pointerMove) { viewManager.app.stage.off("pointermove", this._pointerMove); this._pointerMove = null; }
    if (this._pointerUp) { viewManager.app.stage.off("pointerup", this._pointerUp); this._pointerUp = null; }
  }

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x1a2a1a });
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("\u{1F3F9} HUNT \u{1F3F9}", this._sw / 2, 40, { fontSize: 28, fill: 0x88aa44, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("Medieval Archery Hunting", this._sw / 2, 75, { fontSize: 12, fill: 0x667755, fontStyle: "italic" }, true);
    addText("Aim with mouse. Hold click to draw bow.\nRelease to shoot. Hit prey for gold!\n3 rounds of 90 seconds each.", this._sw / 2, 110, { fontSize: 11, fill: 0x889977, align: "center", wordWrap: true, wordWrapWidth: 350, lineHeight: 18 }, true);

    const btn = new Graphics();
    btn.roundRect(this._sw / 2 - 70, this._sh * 0.55, 140, 40, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    btn.roundRect(this._sw / 2 - 70, this._sh * 0.55, 140, 40, 5).stroke({ color: 0x88aa44, width: 2, alpha: 0.6 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._startRound();
    });
    c.addChild(btn);
    addText("BEGIN HUNT", this._sw / 2, this._sh * 0.55 + 12, { fontSize: 13, fill: 0x88aa44, fontWeight: "bold", letterSpacing: 2 }, true);

    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 45, this._sh * 0.65, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 45, this._sh * 0.65, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("huntExit"));
    });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, this._sh * 0.65 + 6, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }

  private _startRound(): void {
    this._state = createHuntState(this._bowIndex);

    this._renderer.init(this._sw, this._sh);
    viewManager.addToLayer("ui", this._renderer.container);

    const ox = (this._sw - HuntConfig.FIELD_WIDTH) / 2, oy = 50;

    // Aim with mouse movement
    this._pointerMove = (e: { global: { x: number; y: number } }) => {
      const mx = e.global.x - ox - this._state.playerX;
      const my = e.global.y - oy - this._state.playerY;
      this._state.aimAngle = Math.atan2(my, mx);
    };

    // Hold to draw
    this._pointerDown = () => { this._state.isDrawing = true; };
    this._pointerUp = () => {
      if (this._state.isDrawing && this._state.drawProgress > 0) {
        shootArrow(this._state);
      }
      this._state.isDrawing = false;
    };

    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointermove", this._pointerMove);
    viewManager.app.stage.on("pointerdown", this._pointerDown);
    viewManager.app.stage.on("pointerup", this._pointerUp);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("huntExit")); }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _update(dt: number): void {
    updateHunt(this._state, dt);
    this._renderer.draw(this._state, this._sw, this._sh);

    if (this._state.roundOver) {
      this._state.roundOver = false;
      if (this._state.round < 2) {
        // Next round
        this._state.round++;
        this._state.elapsedTime = 0;
        this._state.prey = [];
        this._state.arrows = [];
        this._state.spawnTimer = 1;
        this._state.announcements.push({ text: `Round ${this._state.round + 1}!`, color: 0xffaa44, timer: 2 });
        this._state.log.push(`Round ${this._state.round + 1} begins.`);
      } else {
        this._showResults();
      }
    }
  }

  private _showResults(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    this._removePointers();

    audioManager.playJingle("level_up");

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const pw = 380, ph = 300, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x1a2a1a, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0x88aa44, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    let y = py + 16;
    addText("\u{1F3F9} HUNT COMPLETE \u{1F3F9}", this._sw / 2, y, { fontSize: 20, fill: 0x88aa44, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 36;

    const accuracy = this._state.kills + this._state.misses > 0 ? Math.round(this._state.kills / (this._state.kills + this._state.misses) * 100) : 0;
    const stats: [string, string, number][] = [
      ["Total Kills", `${this._state.kills}`, 0xcc6644],
      ["Accuracy", `${accuracy}%`, accuracy > 60 ? 0x44cc44 : 0xffaa44],
      ["Gold Earned", `${this._state.gold}g`, 0xffd700],
      ["Score", `${this._state.score}`, 0x44ccaa],
      ["Misses", `${this._state.misses}`, 0xff6644],
    ];

    for (const [label, value, color] of stats) {
      addText(label, px + 35, y, { fontSize: 11, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 35, y); c.addChild(vt);
      y += 18;
    }

    y += 20;
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 60, y, 120, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 60, y, 120, 34, 5).stroke({ color: 0x88aa44, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true }); this._renderer.destroy();
      this._startRound();
    });
    c.addChild(retryBtn);
    addText("HUNT AGAIN", this._sw / 2, y + 9, { fontSize: 11, fill: 0x88aa44, fontWeight: "bold" }, true);

    y += 44;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).stroke({ color: 0x555555, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("huntExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 5, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
