// ---------------------------------------------------------------------------
// Race mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createRaceState, RacePhase } from "./state/RaceState";
import type { RaceState } from "./state/RaceState";
import { HORSES, TRACKS, RaceConfig } from "./config/RaceConfig";
import { updateRace } from "./systems/RaceSystem";
import { RaceRenderer } from "./view/RaceRenderer";

export class RaceGame {
  private _state!: RaceState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new RaceRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _gold = RaceConfig.STARTING_GOLD;
  private _horseIndex = 0;
  private _resultShown = false;
  private _pauseMenu: Container | null = null;
  private _paused = false;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showTrackSelect();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _showTrackSelect(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x1a2a1a });
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("\u{1F3C7} RACE \u{1F3C7}", this._sw / 2, 25, { fontSize: 28, fill: 0xaa8844, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("Medieval Horse Racing", this._sw / 2, 58, { fontSize: 12, fill: 0x887766, fontStyle: "italic" }, true);
    addText(`Gold: ${this._gold}g`, this._sw / 2, 80, { fontSize: 12, fill: 0xffd700 }, true);

    // Track selection
    addText("Choose Track:", this._sw / 2, 105, { fontSize: 12, fill: 0xccaa88 }, true);
    let y = 125;
    for (let ti = 0; ti < TRACKS.length; ti++) {
      const trk = TRACKS[ti];
      const btn = new Graphics();
      btn.roundRect(this._sw / 2 - 120, y, 240, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.7 });
      btn.roundRect(this._sw / 2 - 120, y, 240, 34, 5).stroke({ color: trk.color, width: 1, alpha: 0.4 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      const idx = ti;
      btn.on("pointerdown", () => { this._showBetScreen(idx); viewManager.removeFromLayer("ui", c); c.destroy({ children: true }); });
      c.addChild(btn);
      addText(trk.name, this._sw / 2, y + 4, { fontSize: 11, fill: 0xccbbaa, fontWeight: "bold" }, true);
      addText(`${trk.laps} laps | ${trk.obstacles.length} obstacles`, this._sw / 2, y + 18, { fontSize: 8, fill: 0x889988 }, true);
      y += 40;
    }

    // Horse selection
    y += 10;
    addText("Choose Horse:", this._sw / 2, y, { fontSize: 12, fill: 0xccaa88 }, true);
    y += 18;
    for (let hi = 0; hi < HORSES.length; hi++) {
      const horse = HORSES[hi];
      const owned = hi === 0 || this._gold >= horse.cost;
      const sel = hi === this._horseIndex;
      const btn = new Graphics();
      btn.roundRect(this._sw / 2 - 120, y, 240, 34, 5).fill({ color: sel ? 0x1a1a08 : 0x0a0a0a, alpha: 0.7 });
      btn.roundRect(this._sw / 2 - 120, y, 240, 34, 5).stroke({ color: sel ? horse.color : owned ? 0x444433 : 0x222222, width: sel ? 2 : 0.5, alpha: 0.5 });
      if (owned) {
        btn.eventMode = "static"; btn.cursor = "pointer";
        const hIdx = hi;
        btn.on("pointerdown", () => { this._horseIndex = hIdx; viewManager.removeFromLayer("ui", c); c.destroy({ children: true }); this._showTrackSelect(); });
      }
      c.addChild(btn);
      addText(`${sel ? "\u2713 " : ""}${horse.name}`, this._sw / 2 - 100, y + 4, { fontSize: 10, fill: owned ? horse.color : 0x555555, fontWeight: sel ? "bold" : "normal" });
      addText(`SPD:${horse.maxSpeed} ACC:${horse.acceleration} HDL:${horse.handling} STA:${horse.stamina}`, this._sw / 2 - 100, y + 18, { fontSize: 7, fill: 0x889988 });
      if (hi > 0) addText(`${horse.cost}g`, this._sw / 2 + 90, y + 8, { fontSize: 9, fill: owned ? 0xffd700 : 0x554444 });
      y += 38;
    }

    // Back button
    y += 10;
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 45, y, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 45, y, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => { viewManager.removeFromLayer("ui", c); c.destroy({ children: true }); this.destroy(); window.dispatchEvent(new Event("raceExit")); });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, y + 6, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }

  private _showBetScreen(trackIndex: number): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0a06, alpha: 0.9 });
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("Place Your Bet", this._sw / 2, this._sh * 0.3, { fontSize: 18, fill: 0xccaa88, fontWeight: "bold" }, true);
    addText(`Gold: ${this._gold}g`, this._sw / 2, this._sh * 0.35, { fontSize: 12, fill: 0xffd700 }, true);

    let bx = this._sw / 2 - (RaceConfig.BET_OPTIONS.length * 65) / 2;
    for (const bet of RaceConfig.BET_OPTIONS) {
      if (bet <= this._gold) {
        const btn = new Graphics();
        btn.roundRect(bx, this._sh * 0.45, 60, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
        btn.roundRect(bx, this._sh * 0.45, 60, 36, 5).stroke({ color: 0xffd700, width: 1.5, alpha: 0.5 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        btn.on("pointerdown", () => { viewManager.removeFromLayer("ui", c); c.destroy({ children: true }); this._startRace(trackIndex, bet); });
        c.addChild(btn);
        addText(`${bet}g`, bx + 30, this._sh * 0.45 + 10, { fontSize: 12, fill: 0xffd700, fontWeight: "bold" }, true);
      }
      bx += 65;
    }

    viewManager.addToLayer("ui", c);
  }

  private _startRace(trackIndex: number, bet: number): void {
    this._state = createRaceState(trackIndex, this._horseIndex, this._gold);
    this._state.currentBet = bet;
    this._resultShown = false;

    this._renderer.init(this._sw, this._sh);
    viewManager.addToLayer("ui", this._renderer.container);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (this._paused) this._hidePauseMenu(); else this._showPauseMenu();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        const player = this._state.racers.find(r => r.isPlayer);
        if (player) player.galloping = true;
      }
      // Steering
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this._state.playerSteerInput = -1;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this._state.playerSteerInput = 1;
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === " ") {
        const player = this._state.racers.find(r => r.isPlayer);
        if (player) player.galloping = false;
      }
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft" || e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        this._state.playerSteerInput = 0;
      }
    };
    window.addEventListener("keydown", this._keyHandler);
    window.addEventListener("keyup", this._keyUpHandler);

    this._tickerCb = (ticker: Ticker) => {
      if (this._paused) return;
      updateRace(this._state, ticker.deltaMS / 1000);
      this._renderer.draw(this._state, this._sw, this._sh);
      if (this._state.phase === RacePhase.FINISHED && !this._resultShown) {
        this._resultShown = true;
        this._gold = this._state.gold;
        audioManager.playJingle("level_up");
        setTimeout(() => this._showResults(), 2500);
      }
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _showPauseMenu(): void {
    this._paused = true;
    const sw = this._sw, sh = this._sh;
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    bg.eventMode = "static";
    c.addChild(bg);

    const pw = 420, ph = 340, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0806, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0xcc8844, width: 2, alpha: 0.5 });
    panel.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8).stroke({ color: 0xcc8844, width: 0.5, alpha: 0.15 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y);
      c.addChild(t);
    };
    addText("PAUSED", sw / 2, py + 16, { fontSize: 22, fill: 0xcc8844, fontWeight: "bold", letterSpacing: 4 }, true);

    const contentContainer = new Container();
    c.addChild(contentContainer);
    const clearContent = () => { while (contentContainer.children.length > 0) { const ch = contentContainer.removeChildAt(0); ch.destroy(); } };

    const showButtons = () => {
      clearContent();
      const makeBtn = (label: string, y: number, color: number, cb: () => void) => {
        const btn = new Graphics();
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
        btn.roundRect(sw / 2 - 100, y, 200, 36, 5).stroke({ color, width: 1.5, alpha: 0.6 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        btn.on("pointerdown", cb);
        contentContainer.addChild(btn);
        const t = new Text({ text: label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: color, fontWeight: "bold", letterSpacing: 1 } as any) });
        t.anchor.set(0.5, 0.5); t.position.set(sw / 2, y + 18);
        contentContainer.addChild(t);
      };
      makeBtn("RESUME", py + 70, 0x44cc66, () => this._hidePauseMenu());
      makeBtn("CONTROLS", py + 120, 0xccaa44, () => {
        clearContent();
        const t = new Text({ text: "Space: Gallop (spend stamina)\nA / Left Arrow: Steer left\nD / Right Arrow: Steer right\nAvoid obstacles on the track!", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xccccaa, align: "center", lineHeight: 22 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("INSTRUCTIONS", py + 170, 0xccaa44, () => {
        clearContent();
        const t = new Text({ text: "Medieval horse racing across multiple tracks.\nManage your stamina — galloping is fast but tiring.\nSteer to avoid obstacles and stay on the track.\nFinish first to win gold and advance!", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xccccaa, align: "center", wordWrap: true, wordWrapWidth: 380, lineHeight: 20 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("MAIN MENU", py + 250, 0xcc4444, () => {
        this._hidePauseMenu();
        this.destroy();
        window.dispatchEvent(new Event("raceExit"));
      });
    };

    const makeBackBtn = () => {
      const btn = new Graphics();
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).fill({ color: 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(sw / 2 - 60, py + ph - 60, 120, 32, 4).stroke({ color: 0x888866, width: 1, alpha: 0.5 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      btn.on("pointerdown", () => showButtons());
      contentContainer.addChild(btn);
      const t = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x888888, fontWeight: "bold" } as any) });
      t.anchor.set(0.5, 0.5); t.position.set(sw / 2, py + ph - 44);
      contentContainer.addChild(t);
    };

    showButtons();
    this._pauseMenu = c;
    viewManager.addToLayer("ui", c);
  }

  private _hidePauseMenu(): void {
    this._paused = false;
    if (this._pauseMenu) {
      viewManager.removeFromLayer("ui", this._pauseMenu);
      this._pauseMenu.destroy({ children: true });
      this._pauseMenu = null;
    }
  }

  private _showResults(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const playerPlace = this._state.finishOrder.indexOf("player") + 1;
    const won = playerPlace === 1;
    const accent = won ? 0xffd700 : 0xcccccc;

    const pw = 400, ph = 300, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x1a2a1a, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    let y = py + 16;
    addText(won ? "\u{1F3C6} WINNER! \u{1F3C6}" : `\u{1F3C7} ${playerPlace}${playerPlace === 2 ? "nd" : playerPlace === 3 ? "rd" : "th"} Place`, this._sw / 2, y, { fontSize: 20, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);
    try {
      const prev = parseInt(localStorage.getItem("race_highgold") ?? "0") || 0;
      if (this._gold > prev) { localStorage.setItem("race_highgold", `${this._gold}`); addText("\u2605 NEW GOLD RECORD! \u2605", this._sw / 2, y + 24, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true); }
    } catch { /* ignore */ }
    y += 36;

    // Finish order
    for (let i = 0; i < this._state.finishOrder.length; i++) {
      const r = this._state.racers.find(rc => rc.id === this._state.finishOrder[i]);
      if (!r) continue;
      const color = r.isPlayer ? 0x44ccaa : 0xccddcc;
      addText(`${i + 1}. ${r.name} (${r.horse.name}) — ${r.finishTime.toFixed(1)}s`, this._sw / 2, y, { fontSize: 10, fill: color }, true);
      y += 16;
    }
    y += 10;

    addText(`Gold: ${this._gold}g`, this._sw / 2, y, { fontSize: 14, fill: 0xffd700, fontWeight: "bold" }, true);
    y += 25;

    // Buttons
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 60, y, 120, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 60, y, 120, 34, 5).stroke({ color: accent, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => { viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container); c.destroy({ children: true }); this._renderer.destroy(); this._showTrackSelect(); });
    c.addChild(retryBtn);
    addText("RACE AGAIN", this._sw / 2, y + 9, { fontSize: 11, fill: accent, fontWeight: "bold" }, true);

    y += 44;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).stroke({ color: 0x555555, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => { viewManager.removeFromLayer("ui", c); c.destroy({ children: true }); this.destroy(); window.dispatchEvent(new Event("raceExit")); });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 5, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
