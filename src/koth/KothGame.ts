// ---------------------------------------------------------------------------
// King of the Hill — main orchestrator (v2: rally points, high scores, stats)
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createKothState, KothPhase } from "./state/KothState";
import type { KothState } from "./state/KothState";
import { KothConfig, ALL_UNIT_TYPES, DIFFICULTIES, type UnitType, type Difficulty } from "./config/KothConfig";
import { spawnUnit, updateKoth, useWarHorn, purchaseUpgrade } from "./systems/KothSystem";
import { KothRenderer } from "./view/KothRenderer";

export class KothGame {
  private _state!: KothState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new KothRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: { global: { x: number; y: number }; button: number }) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _resultShown = false;

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
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  // -------------------------------------------------------------------------
  // Start screen
  // -------------------------------------------------------------------------

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0806 });
    c.addChild(bg);

    const title = new Text({ text: "KING OF THE HILL", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 48, fill: 0xccaa44, fontWeight: "bold", letterSpacing: 6 }) });
    title.anchor.set(0.5, 0); title.position.set(this._sw / 2, this._sh * 0.06);
    c.addChild(title);

    const sub = new Text({ text: "Seize the Sacred Ground", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 20, fill: 0x887766, fontStyle: "italic" }) });
    sub.anchor.set(0.5, 0); sub.position.set(this._sw / 2, this._sh * 0.06 + 54);
    c.addChild(sub);

    const desc = new Text({
      text: [
        "Hold the sacred hill to earn points. First to the limit wins!",
        "Domination streaks multiply points. Guardians defend the hill.",
        "Collect relics, survive cataclysms, and upgrade your army.",
      ].join("\n"),
      style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0x998877, wordWrap: true, wordWrapWidth: 520, align: "center", lineHeight: 22 }),
    });
    desc.anchor.set(0.5, 0); desc.position.set(this._sw / 2, this._sh * 0.18);
    c.addChild(desc);

    // High score
    try {
      const prev = parseInt(localStorage.getItem("koth_best_time") ?? "0") || 0;
      if (prev > 0) {
        const m = Math.floor(prev / 60), s = Math.floor(prev % 60);
        const hsTxt = new Text({ text: `Best Victory: ${m}:${s.toString().padStart(2, "0")}`, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xffd700 }) });
        hsTxt.anchor.set(0.5, 0); hsTxt.position.set(this._sw / 2, this._sh * 0.28);
        c.addChild(hsTxt);
      }
    } catch { /* ignore */ }

    // Difficulty selection
    const diffs: Difficulty[] = ["easy", "normal", "hard"];
    let dx = this._sw / 2 - (diffs.length * 150) / 2;
    for (const diff of diffs) {
      const dm = DIFFICULTIES[diff];
      const btn = new Graphics();
      btn.roundRect(dx, this._sh * 0.36, 140, 80, 6).fill({ color: 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(dx, this._sh * 0.36, 140, 80, 6).stroke({ color: dm.color, width: 2, alpha: 0.6 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      const d = diff;
      btn.on("pointerdown", () => {
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._startGame(d);
      });
      c.addChild(btn);
      const lbl = new Text({ text: dm.label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 20, fill: dm.color, fontWeight: "bold" }) });
      lbl.anchor.set(0.5, 0); lbl.position.set(dx + 70, this._sh * 0.36 + 10); c.addChild(lbl);
      const info = new Text({
        text: `Score: ${dm.scoreLimit}\nAI: ${dm.aiSpawnMult < 1 ? "Fast" : dm.aiSpawnMult > 1 ? "Slow" : "Normal"}\nGuardians: ${dm.guardianHpMult > 1 ? "Tough" : dm.guardianHpMult < 1 ? "Weak" : "Normal"}`,
        style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x887766, align: "center", lineHeight: 15 }),
      });
      info.anchor.set(0.5, 0); info.position.set(dx + 70, this._sh * 0.36 + 36); c.addChild(info);
      dx += 150;
    }

    // Controls summary
    const controls = new Text({
      text: "Click: spawn unit | Right-click: rally point | Space: rapid spawn | H: war horn\nP: pause | 1/2/3: speed | C: clear rally | Q-I: select unit",
      style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0x666655, align: "center", lineHeight: 18 }),
    });
    controls.anchor.set(0.5, 0); controls.position.set(this._sw / 2, this._sh * 0.56);
    c.addChild(controls);

    // Back button
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 70, this._sh * 0.68, 140, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 70, this._sh * 0.68, 140, 36, 5).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("kothExit"));
    });
    c.addChild(backBtn);
    const backLabel = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: 0x888888 }) });
    backLabel.anchor.set(0.5, 0.5); backLabel.position.set(this._sw / 2, this._sh * 0.68 + 18);
    c.addChild(backLabel);

    viewManager.addToLayer("ui", c);
  }

  // -------------------------------------------------------------------------
  // Game loop
  // -------------------------------------------------------------------------

  private _startGame(difficulty: Difficulty = "normal"): void {
    this._state = createKothState(difficulty);
    this._resultShown = false;

    this._renderer.init(this._sw, this._sh);
    this._renderer.setSpawnCallback((type: UnitType) => {
      if (this._state.phase !== KothPhase.PLAYING) return;
      this._state.selectedUnit = type;
      spawnUnit(this._state, 0, type);
    });
    this._renderer.setWarHornCallback(() => {
      if (this._state.phase === KothPhase.PLAYING && !this._state.paused) useWarHorn(this._state);
    });
    this._renderer.setUpgradeCallback((id) => {
      if (this._state.phase === KothPhase.PLAYING && !this._state.paused) purchaseUpgrade(this._state, id);
    });
    viewManager.addToLayer("ui", this._renderer.container);

    // Right-click rally point
    this._pointerHandler = (e: { global: { x: number; y: number }; button: number }) => {
      if (this._state.phase !== KothPhase.PLAYING) return;
      if (e.button !== 2) return; // right click only
      const { ox, oy } = this._renderer.getArenaOffset(this._sw);
      const rx = e.global.x - ox, ry = e.global.y - oy;
      if (rx >= 0 && rx <= KothConfig.ARENA_W && ry >= 0 && ry <= KothConfig.ARENA_H) {
        this._state.rallyX = rx;
        this._state.rallyY = ry;
        this._state.hasRallyPoint = true;
        // Redirect idle units to new rally point
        for (const u of this._state.units) {
          if (u.alive && u.owner === 0 && !u.targetId) {
            u.goalX = rx + (Math.random() - 0.5) * 30;
            u.goalY = ry + (Math.random() - 0.5) * 30;
          }
        }
        this._state.announcements.push({ text: "Rally point set!", color: 0x4488cc, timer: 1 });
      }
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    // Disable browser context menu on canvas
    const canvas = viewManager.app.canvas;
    const ctxHandler = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", ctxHandler);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        canvas.removeEventListener("contextmenu", ctxHandler);
        this.destroy(); window.dispatchEvent(new Event("kothExit"));
        return;
      }
      if (this._state.phase !== KothPhase.PLAYING) return;
      if (e.key === "1") this._state.speedMult = 1;
      if (e.key === "2") this._state.speedMult = 2;
      if (e.key === "3") this._state.speedMult = 3;
      if (e.key === " ") {
        e.preventDefault();
        this._state.spaceHeld = true;
        spawnUnit(this._state, 0, this._state.selectedUnit);
      }
      // Pause
      if (e.key === "p" || e.key === "P") {
        this._state.paused = !this._state.paused;
        return;
      }
      if (this._state.paused) return; // ignore other keys while paused
      // War Horn
      if (e.key === "h" || e.key === "H") {
        useWarHorn(this._state);
      }
      // Clear rally point
      if (e.key === "c" || e.key === "C") {
        this._state.hasRallyPoint = false;
      }
      // Q-W-E-R-T-Y-U-I for unit select
      const qwerty = ["q", "w", "e", "r", "t", "y", "u", "i"];
      const idx = qwerty.indexOf(e.key.toLowerCase());
      if (idx >= 0 && idx < ALL_UNIT_TYPES.length) {
        this._state.selectedUnit = ALL_UNIT_TYPES[idx];
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === " ") this._state.spaceHeld = false;
    };
    window.addEventListener("keyup", this._keyUpHandler);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _update(dt: number): void {
    updateKoth(this._state, dt);
    this._renderer.draw(this._state, this._sw, this._sh);

    if (this._state.phase === KothPhase.VICTORY && !this._resultShown) {
      this._resultShown = true;
      if (this._state.winner === 0) {
        audioManager.playJingle("victory");
        // Save high score (fastest victory time)
        try {
          const prev = parseInt(localStorage.getItem("koth_best_time") ?? "0") || 0;
          const time = Math.floor(this._state.elapsed);
          if (prev === 0 || time < prev) {
            localStorage.setItem("koth_best_time", `${time}`);
          }
        } catch { /* ignore */ }
      }
      setTimeout(() => this._showResults(), 2000);
    }
  }

  // -------------------------------------------------------------------------
  // Results screen
  // -------------------------------------------------------------------------

  private _showResults(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const isVictory = this._state.winner === 0;
    const accent = isVictory ? 0xffd700 : 0xff4444;

    const pw = 560, ph = 520, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0a06, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); c.addChild(t);
    };

    let y = py + 20;
    addText(isVictory ? "VICTORY! THE HILL IS YOURS!" : "DEFEAT! THE HILL IS LOST!", this._sw / 2, y, { fontSize: 26, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);

    // High score notice
    try {
      const best = parseInt(localStorage.getItem("koth_best_time") ?? "0") || 0;
      if (isVictory && best === Math.floor(this._state.elapsed)) {
        y += 30;
        addText("NEW FASTEST VICTORY!", this._sw / 2, y, { fontSize: 15, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    } catch { /* ignore */ }
    y += 42;

    const p0 = this._state.players[0], p1 = this._state.players[1];
    const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

    const stats: [string, string, number][] = [
      ["Your Score", `${Math.floor(p0.score)}`, p0.color],
      ["Enemy Score", `${Math.floor(p1.score)}`, p1.color],
      ["", "", 0], // spacer
      ["Your Kills", `${this._state.kills[0]}`, 0xff8844],
      ["Enemy Kills", `${this._state.kills[1]}`, 0xff8844],
      ["Units Produced", `${this._state.unitsProduced[0]}`, 0x88aacc],
      ["Gold Spent", `${this._state.goldSpent[0]}`, 0xffd700],
      ["Guardians Slain", `${this._state.guardiansKilled[0]}`, 0x888877],
      ["", "", 0],
      ["Hill Time Held", fmtTime(this._state.hillTimeHeld[0]), p0.color],
      ["Longest Streak", fmtTime(this._state.longestStreak[0]), 0xccaa44],
      ["Match Time", fmtTime(this._state.elapsed), 0xccddcc],
    ];

    for (const [label, value, color] of stats) {
      if (label === "") { y += 6; continue; }
      addText(label, px + 50, y, { fontSize: 15, fill: 0x887766 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 50, y); c.addChild(vt);
      y += 24;
    }

    y += 12;
    // Retry
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 90, y, 180, 44, 6).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 90, y, 180, 44, 6).stroke({ color: accent, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true }); this._renderer.destroy();
      this._renderer = new KothRenderer();
      this._startGame(this._state.difficulty);
    });
    c.addChild(retryBtn);
    addText("FIGHT AGAIN", this._sw / 2, y + 12, { fontSize: 18, fill: accent, fontWeight: "bold", letterSpacing: 2 }, true);

    y += 54;
    // Menu
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 70, y, 140, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 70, y, 140, 36, 5).stroke({ color: 0x666655, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("kothExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 8, { fontSize: 16, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
