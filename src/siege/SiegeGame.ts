// ---------------------------------------------------------------------------
// Siege mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createSiegeState, SiegePhase } from "./state/SiegeState";
import type { SiegeState } from "./state/SiegeState";
import { SiegeConfig, WAVES, DIFFICULTY_MULT, type TowerType, type Difficulty } from "./config/SiegeConfig";
import { placeTower, sellTower, updateSiege, startWave, useFreeze, useMeteor } from "./systems/SiegeSystem";
import { SiegeRenderer } from "./view/SiegeRenderer";

export class SiegeGame {
  private _state!: SiegeState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new SiegeRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: { global: { x: number; y: number } }) => void) | null = null;
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
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0806 });
    c.addChild(bg);

    const title = new Text({ text: "\u{1F3F0} SIEGE \u{1F3F0}", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0xcc8844, fontWeight: "bold", letterSpacing: 6 }) });
    title.anchor.set(0.5, 0); title.position.set(this._sw / 2, this._sh * 0.15);
    c.addChild(title);

    const sub = new Text({ text: "A Medieval Tower Defense Game", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0x887766, fontStyle: "italic" }) });
    sub.anchor.set(0.5, 0); sub.position.set(this._sw / 2, this._sh * 0.15 + 42);
    c.addChild(sub);

    const desc = new Text({ text: `Defend your castle against ${WAVES.length} waves of enemies!\nPlace towers on the green tiles to block their advance.\nEarn gold from kills to build more defenses.\nDon't let enemies reach your castle!`, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x998877, wordWrap: true, wordWrapWidth: 400, align: "center", lineHeight: 18 }) });
    desc.anchor.set(0.5, 0); desc.position.set(this._sw / 2, this._sh * 0.3);
    c.addChild(desc);

    // Difficulty selection
    const diffs: Difficulty[] = ["easy", "normal", "hard"];
    let dx = this._sw / 2 - (diffs.length * 75) / 2;
    for (const diff of diffs) {
      const dm = DIFFICULTY_MULT[diff];
      const btn = new Graphics();
      btn.roundRect(dx, this._sh * 0.52, 70, 50, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(dx, this._sh * 0.52, 70, 50, 5).stroke({ color: dm.color, width: 2, alpha: 0.6 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      const d = diff;
      btn.on("pointerdown", () => {
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._startGame(d);
      });
      c.addChild(btn);
      const lbl = new Text({ text: dm.label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: dm.color, fontWeight: "bold" }) });
      lbl.anchor.set(0.5, 0); lbl.position.set(dx + 35, this._sh * 0.52 + 6); c.addChild(lbl);
      const sub2 = new Text({ text: `HP x${dm.hp}\nSpd x${dm.speed}`, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 7, fill: 0x887766, align: "center" }) });
      sub2.anchor.set(0.5, 0); sub2.position.set(dx + 35, this._sh * 0.52 + 22); c.addChild(sub2);
      dx += 75;
    }

    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 50, this._sh * 0.65, 100, 30, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 50, this._sh * 0.65, 100, 30, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("siegeExit"));
    });
    c.addChild(backBtn);
    const backLabel = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x888888 }) });
    backLabel.anchor.set(0.5, 0); backLabel.position.set(this._sw / 2, this._sh * 0.65 + 8);
    c.addChild(backLabel);

    viewManager.addToLayer("ui", c);
  }

  private _startGame(difficulty: Difficulty = "normal"): void {
    this._state = createSiegeState(difficulty);
    this._resultShown = false;

    this._renderer.init(this._sw, this._sh);
    this._renderer.setTowerSelectCallback((type) => { this._state.selectedTower = type; });
    viewManager.addToLayer("ui", this._renderer.container);

    // Click: place tower or inspect existing tower
    this._pointerHandler = (e: { global: { x: number; y: number } }) => {
      if (this._state.phase !== SiegePhase.BUILDING && this._state.phase !== SiegePhase.WAVE) return;
      const offset = this._renderer.getGridOffset();
      const col = Math.floor((e.global.x - offset.x) / SiegeConfig.TILE_SIZE);
      const row = Math.floor((e.global.y - offset.y) / SiegeConfig.TILE_SIZE);
      if (col < 0 || col >= SiegeConfig.GRID_COLS || row < 0 || row >= SiegeConfig.GRID_ROWS) return;

      const cell = this._state.grid[row]?.[col];
      if (cell?.towerId) {
        // Click on existing tower — toggle inspect
        this._state.inspectedTowerId = this._state.inspectedTowerId === cell.towerId ? null : cell.towerId;
        this._state.selectedTower = null;
      } else if (this._state.selectedTower) {
        // Place new tower
        if (placeTower(this._state, this._state.selectedTower, col, row)) {
          this._state.announcements.push({ text: "Tower placed!", color: 0x44aa44, timer: 1 });
        }
        this._state.inspectedTowerId = null;
      }
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (this._state.inspectedTowerId) { this._state.inspectedTowerId = null; return; }
        this.destroy(); window.dispatchEvent(new Event("siegeExit"));
      }
      // Space to start wave early
      if (e.key === " " && this._state.phase === SiegePhase.BUILDING) {
        e.preventDefault(); startWave(this._state);
      }
      // Speed control: 1/2/3
      if (e.key === "1") this._state.speedMult = 1;
      if (e.key === "2") this._state.speedMult = 2;
      if (e.key === "3") this._state.speedMult = 3;
      // Sell tower: X key while inspecting
      if ((e.key === "x" || e.key === "X") && this._state.inspectedTowerId) {
        sellTower(this._state, this._state.inspectedTowerId);
        this._state.announcements.push({ text: "Tower sold!", color: 0xffaa44, timer: 1 });
        this._state.inspectedTowerId = null;
      }
      // Power-ups: F = freeze, M = meteor
      if (e.key === "f" || e.key === "F") useFreeze(this._state);
      if (e.key === "m" || e.key === "M") {
        // Meteor at center of screen (simple targeting)
        const cx = SiegeConfig.GRID_COLS * SiegeConfig.TILE_SIZE / 2;
        const cy = SiegeConfig.GRID_ROWS * SiegeConfig.TILE_SIZE / 2;
        useMeteor(this._state, cx, cy);
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _update(dt: number): void {
    updateSiege(this._state, dt);
    this._renderer.draw(this._state, this._sw, this._sh);

    if ((this._state.phase === SiegePhase.VICTORY || this._state.phase === SiegePhase.DEFEAT) && !this._resultShown) {
      this._resultShown = true;
      if (this._state.phase === SiegePhase.VICTORY) audioManager.playJingle("victory");
      setTimeout(() => this._showResults(), 2500);
    }
  }

  private _showResults(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const isVictory = this._state.phase === SiegePhase.VICTORY;
    const accent = isVictory ? 0xffd700 : 0xff4444;

    const pw = 420, ph = 340, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0a06, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); c.addChild(t);
    };

    let y = py + 16;
    addText(isVictory ? "\u2726 CASTLE DEFENDED! \u2726" : "\u2620 CASTLE FALLEN \u2620", this._sw / 2, y, { fontSize: 22, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 40;

    const stats: [string, string, number][] = [
      ["Waves Survived", `${this._state.wave}/${WAVES.length}`, 0xccddcc],
      ["Total Kills", `${this._state.totalKills}`, 0xff8844],
      ["Score", `${this._state.score}`, 0xffd700],
      ["Gold Remaining", `${this._state.gold}`, 0xffd700],
      ["Lives Remaining", `${this._state.lives}/${SiegeConfig.STARTING_LIVES}`, this._state.lives > 0 ? 0x44cc44 : 0xff4444],
      ["Towers Built", `${this._state.towers.length}`, 0x88aacc],
      ["Time", `${Math.floor(this._state.elapsedTime / 60)}:${Math.floor(this._state.elapsedTime % 60).toString().padStart(2, "0")}`, 0xccddcc],
    ];

    for (const [label, value, color] of stats) {
      addText(label, px + 40, y, { fontSize: 11, fill: 0x887766 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 40, y); c.addChild(vt);
      y += 18;
    }

    y += 15;
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 36, 5).stroke({ color: accent, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true }); this._renderer.destroy();
      this._startGame();
    });
    c.addChild(retryBtn);
    addText("DEFEND AGAIN", this._sw / 2, y + 10, { fontSize: 12, fill: accent, fontWeight: "bold", letterSpacing: 2 }, true);

    y += 46;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).stroke({ color: 0x666655, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("siegeExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 7, { fontSize: 10, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
