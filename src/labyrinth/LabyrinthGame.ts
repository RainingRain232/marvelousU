// ---------------------------------------------------------------------------
// Labyrinth mode — main orchestrator (multi-floor progression)
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createLabyrinthState } from "./state/LabyrinthState";
import type { LabyrinthState } from "./state/LabyrinthState";
import { LabyrinthConfig, FLOORS, ITEMS, DIFFICULTIES, type DifficultyId } from "./config/LabyrinthConfig";
import { generateMaze, updateLabyrinth, useInventoryItem, dropInventoryItem } from "./systems/LabyrinthSystem";
import { LabyrinthRenderer } from "./view/LabyrinthRenderer";

export class LabyrinthGame {
  private _state!: LabyrinthState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new LabyrinthRenderer();
  private _keyDown: ((e: KeyboardEvent) => void) | null = null;
  private _keyUp: ((e: KeyboardEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _persistScore = 0;
  private _persistRelics = 0;
  private _persistInventory: { type: string }[] = [];
  private _difficulty: DifficultyId = "normal";

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._persistScore = 0;
    this._persistRelics = 0;
    this._persistInventory = [];
    this._showStartScreen();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyDown) { window.removeEventListener("keydown", this._keyDown); this._keyDown = null; }
    if (this._keyUp) { window.removeEventListener("keyup", this._keyUp); this._keyUp = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  // ---- Start screen ---------------------------------------------------------

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x050308 });
    c.addChild(bg);

    // Decorative maze pattern in background
    const decor = new Graphics();
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * this._sw;
      const y = Math.random() * this._sh;
      const w = 20 + Math.random() * 40;
      const h = 2;
      decor.rect(x, y, w, h).fill({ color: 0x221133, alpha: 0.15 });
      decor.rect(x, y, h, w).fill({ color: 0x221133, alpha: 0.1 });
    }
    c.addChild(decor);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("\u{1F3DB}\uFE0F LABYRINTH \u{1F3DB}\uFE0F", this._sw / 2, 30, { fontSize: 48, fill: 0x9977cc, fontWeight: "bold", letterSpacing: 6 }, true);
    addText("The Shifting Maze of the Minotaur", this._sw / 2, 68, { fontSize: 19, fill: 0x776699, fontStyle: "italic" }, true);

    // Floor descriptions
    let y = 100;
    addText("3 FLOORS OF INCREASING PERIL", this._sw / 2, y, { fontSize: 16, fill: 0x998877, fontWeight: "bold", letterSpacing: 2 }, true);
    y += 22;
    for (let fi = 0; fi < FLOORS.length; fi++) {
      const f = FLOORS[fi];
      addText(`Floor ${fi + 1}: ${f.name}  (${f.cols}x${f.rows}, ${f.relicCount} relics)`, this._sw / 2, y, { fontSize: 14, fill: 0x778866 }, true);
      y += 14;
    }

    y += 8;
    const rules = [
      "Collect relics to open each floor's exit. Escape all 3 floors to win.",
      "A Minotaur hunts by sound and smell — it follows your footprints.",
      "Hold Shift to sprint (faster but LOUDER — the Minotaur hears further).",
      "Beware traps: spikes, alarms, webs, and crumbling floors.",
      "Bump into walls repeatedly to find secret passages with bonus items.",
      "Floor 3: a second Minotaur — The Shadow — joins the hunt.",
    ];
    for (const line of rules) {
      addText(line, this._sw / 2, y, { fontSize: 14, fill: 0x889977, align: "center", wordWrap: true, wordWrapWidth: 480, lineHeight: 15 }, true);
      y += 14;
    }

    y += 6;
    addText("Items:", this._sw / 2, y, { fontSize: 14, fill: 0xaa9988, fontWeight: "bold" }, true);
    y += 14;
    const itemList = Object.values(ITEMS);
    for (let ii = 0; ii < itemList.length; ii += 2) {
      const left = itemList[ii];
      const right = itemList[ii + 1];
      let line = `${left.icon} ${left.name}: ${left.desc}`;
      if (right) line += `   |   ${right.icon} ${right.name}: ${right.desc}`;
      addText(line, this._sw / 2, y, { fontSize: 13, fill: 0x778866 }, true);
      y += 12;
    }

    y += 6;
    addText("WASD: move | Shift: sprint | 1/2/3: items | Tab: minimap | Esc: quit", this._sw / 2, y, { fontSize: 14, fill: 0x556655 }, true);

    // Best time
    try {
      const best = localStorage.getItem("labyrinth_best_time");
      if (best) {
        const t = parseFloat(best);
        const bm = Math.floor(t / 60), bs = Math.floor(t % 60);
        addText(`Best time: ${bm}:${bs.toString().padStart(2, "0")}`, this._sw / 2, y + 16, { fontSize: 14, fill: 0xffd700 }, true);
      }
    } catch { /* */ }

    // Difficulty selection
    y += 10;
    addText("DIFFICULTY:", this._sw / 2, y, { fontSize: 16, fill: 0x998877, fontWeight: "bold", letterSpacing: 1 }, true);
    y += 16;
    for (const diff of DIFFICULTIES) {
      const isSel = diff.id === this._difficulty;
      const dbtn = new Graphics();
      const bw = 200, bh = 24;
      dbtn.roundRect(this._sw / 2 - bw / 2, y, bw, bh, 4).fill({ color: isSel ? 0x1a1428 : 0x0a0a0a, alpha: 0.8 });
      dbtn.roundRect(this._sw / 2 - bw / 2, y, bw, bh, 4).stroke({ color: isSel ? diff.color : 0x444444, width: isSel ? 2 : 1, alpha: isSel ? 0.8 : 0.4 });
      dbtn.eventMode = "static"; dbtn.cursor = "pointer";
      const diffId = diff.id;
      dbtn.on("pointerdown", () => {
        this._difficulty = diffId;
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._showStartScreen();
      });
      c.addChild(dbtn);
      addText(`${diff.name}${isSel ? " \u25C0" : ""}`, this._sw / 2 - bw / 2 + 10, y + 5, { fontSize: 16, fill: diff.color, fontWeight: isSel ? "bold" : "normal" });
      addText(diff.desc, this._sw / 2 + bw / 2 - 10, y + 7, { fontSize: 11, fill: 0x777766 });
      // Right-align the desc
      const descT = new Text({ text: diff.desc, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x777766 } as any) });
      descT.anchor.set(1, 0); descT.position.set(this._sw / 2 + bw / 2 - 8, y + 7); c.addChild(descT);
      y += 28;
    }

    y += 4;
    // Start button
    const btnY = y;
    const btn = new Graphics();
    btn.roundRect(this._sw / 2 - 90, btnY, 180, 42, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    btn.roundRect(this._sw / 2 - 90, btnY, 180, 42, 5).stroke({ color: 0x9977cc, width: 2, alpha: 0.6 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._startFloor(0);
    });
    c.addChild(btn);
    addText("ENTER THE LABYRINTH", this._sw / 2, btnY + 13, { fontSize: 19, fill: 0x9977cc, fontWeight: "bold", letterSpacing: 2 }, true);

    // Back button
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 45, btnY + 52, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 45, btnY + 52, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("labyrinthExit"));
    });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, btnY + 58, { fontSize: 14, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }

  // ---- Start a floor --------------------------------------------------------

  private _startFloor(floor: number): void {
    this._state = createLabyrinthState(floor, this._difficulty);
    this._state.score = this._persistScore;
    this._state.totalRelicsCollected = this._persistRelics;

    // Restore inventory from previous floor
    for (const slot of this._persistInventory) {
      if (this._state.inventory.length < LabyrinthConfig.MAX_INVENTORY) {
        this._state.inventory.push({ type: slot.type as any });
      }
    }

    generateMaze(this._state);

    this._renderer.init(this._sw, this._sh);
    viewManager.addToLayer("ui", this._renderer.container);

    this._keyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("labyrinthExit")); return; }
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") this._state.moveUp = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") this._state.moveDown = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this._state.moveLeft = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this._state.moveRight = true;
      if (e.key === "Shift") this._state.sprinting = true;
      if (e.key === "Tab") { e.preventDefault(); this._state.minimapVisible = !this._state.minimapVisible; }
      if (e.key === "1") useInventoryItem(this._state, 0);
      if (e.key === "2") useInventoryItem(this._state, 1);
      if (e.key === "3") useInventoryItem(this._state, 2);
      if (e.key === "q" || e.key === "Q") dropInventoryItem(this._state, 0);
    };
    this._keyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") this._state.moveUp = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") this._state.moveDown = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this._state.moveLeft = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this._state.moveRight = false;
      if (e.key === "Shift") this._state.sprinting = false;
    };
    window.addEventListener("keydown", this._keyDown);
    window.addEventListener("keyup", this._keyUp);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---- Update ---------------------------------------------------------------

  private _update(dt: number): void {
    updateLabyrinth(this._state, dt);
    this._renderer.draw(this._state, this._sw, this._sh);

    if (this._state.floorComplete) {
      this._stopLoop();
      this._persistScore = this._state.score;
      this._persistRelics = this._state.totalRelicsCollected;
      this._persistInventory = this._state.inventory.map(s => ({ type: s.type }));
      setTimeout(() => this._showFloorClear(), 800);
    } else if (this._state.gameOver) {
      this._stopLoop();
      setTimeout(() => this._showResults(), 1200);
    }
  }

  private _stopLoop(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyDown) { window.removeEventListener("keydown", this._keyDown); this._keyDown = null; }
    if (this._keyUp) { window.removeEventListener("keyup", this._keyUp); this._keyUp = null; }
  }

  // ---- Floor clear screen (inter-floor) -------------------------------------

  private _showFloorClear(): void {
    // Clean up old renderer
    viewManager.removeFromLayer("ui", this._renderer.container);
    this._renderer.destroy();

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.9 });
    ov.eventMode = "static"; c.addChild(ov);

    const pw = 400, ph = 320, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0e0a18, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0x44ff88, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    const fc = FLOORS[Math.min(this._state.floor, FLOORS.length - 1)];
    let y = py + 16;
    addText(`\u2705 Floor ${this._state.floor + 1} Cleared!`, this._sw / 2, y, { fontSize: 32, fill: 0x44ff88, fontWeight: "bold", letterSpacing: 2 }, true);
    y += 28;
    addText(fc.name, this._sw / 2, y, { fontSize: 18, fill: 0x778866, fontStyle: "italic" }, true);
    y += 24;

    const mins = Math.floor(this._state.floorElapsed / 60);
    const secs = Math.floor(this._state.floorElapsed % 60);
    const parTime = LabyrinthConfig.PAR_TIME_PER_FLOOR;
    const timeBonus = Math.max(0, Math.floor((parTime - this._state.floorElapsed) * LabyrinthConfig.SCORE_TIME_BONUS));

    const stats: [string, string, number][] = [
      ["Time", `${mins}:${secs.toString().padStart(2, "0")}`, 0xaaaaaa],
      ["Par Time", `${Math.floor(parTime / 60)}:${(parTime % 60).toString().padStart(2, "0")}`, 0x667766],
      ["Time Bonus", timeBonus > 0 ? `+${timeBonus}` : "---", timeBonus > 0 ? 0x44ff88 : 0x666666],
      ["Relics", `${this._state.relicsCollected}/${fc.relicCount}`, 0xffd700],
      ["Traps Triggered", `${this._state.trapsTriggered}`, this._state.trapsTriggered === 0 ? 0x44ff88 : 0xff6644],
      ["Traps Avoided", `${this._state.trapsAvoided}`, this._state.trapsAvoided > 0 ? 0x44ccaa : 0x666666],
      ["Hits Taken", `${this._state.hitsTaken}`, this._state.hitsTaken === 0 ? 0x44ff88 : 0xff4444],
      ["Score", `${this._state.score}`, 0x44ccaa],
    ];
    for (const [label, value, color] of stats) {
      addText(label, px + 40, y, { fontSize: 16, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 40, y); c.addChild(vt);
      y += 17;
    }

    // Show inventory carrying forward
    y += 10;
    if (this._state.inventory.length > 0) {
      addText("Carrying forward:", px + 40, y, { fontSize: 14, fill: 0x667766 });
      y += 14;
      for (const slot of this._state.inventory) {
        const def = ITEMS[slot.type];
        addText(`  ${def.icon} ${def.name}`, px + 40, y, { fontSize: 14, fill: def.color });
        y += 13;
      }
    }

    // Torch refill notice
    y += 8;
    addText("Torch refilled for next floor.", this._sw / 2, y, { fontSize: 14, fill: 0xffaa44, fontStyle: "italic" }, true);

    y += 22;
    const nextFloor = this._state.floor + 1;
    const nfc = FLOORS[Math.min(nextFloor, FLOORS.length - 1)];
    const btn = new Graphics();
    btn.roundRect(this._sw / 2 - 90, y, 180, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    btn.roundRect(this._sw / 2 - 90, y, 180, 36, 5).stroke({ color: 0x9977cc, width: 2, alpha: 0.6 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._startFloor(nextFloor);
    });
    c.addChild(btn);
    addText(`Descend to ${nfc.name}`, this._sw / 2, y + 10, { fontSize: 18, fill: 0x9977cc, fontWeight: "bold" }, true);

    viewManager.addToLayer("ui", c);
  }

  // ---- Results screen -------------------------------------------------------

  private _showResults(): void {
    audioManager.playJingle("level_up");

    viewManager.removeFromLayer("ui", this._renderer.container);
    this._renderer.destroy();

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.9 });
    ov.eventMode = "static"; c.addChild(ov);

    const pw = 400, ph = 360, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0e0a18, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: this._state.won ? 0x44ff88 : 0xcc2222, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    let y = py + 16;
    const title = this._state.won ? "\u{1F3DB}\uFE0F ESCAPED THE LABYRINTH! \u{1F3DB}\uFE0F" : "\u2620\uFE0F LOST IN THE DARK \u2620\uFE0F";
    const titleColor = this._state.won ? 0x44ff88 : 0xcc2222;
    addText(title, this._sw / 2, y, { fontSize: 32, fill: titleColor, fontWeight: "bold", letterSpacing: 2 }, true);

    // High score (per difficulty)
    const diffSuffix = `_${this._state.difficulty}`;
    try {
      if (this._state.won) {
        const scoreKey = `labyrinth_best_time${diffSuffix}`;
        const prev = parseFloat(localStorage.getItem(scoreKey) ?? "999999");
        if (this._state.elapsed < prev) {
          localStorage.setItem(scoreKey, `${this._state.elapsed}`);
          addText("\u2605 NEW BEST TIME! \u2605", this._sw / 2, y + 24, { fontSize: 18, fill: 0xffd700, fontWeight: "bold" }, true);
        }
      }
      const hiKey = `labyrinth_highscore${diffSuffix}`;
      const prevHi = parseInt(localStorage.getItem(hiKey) ?? "0") || 0;
      if (this._state.score > prevHi) {
        localStorage.setItem(hiKey, `${this._state.score}`);
        if (!this._state.won) addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, y + 24, { fontSize: 18, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    } catch { /* */ }
    y += 44;

    // Death context
    if (!this._state.won && this._state.deathCause) {
      const torchStr = this._state.deathTorchPct <= 0 ? "no torch" : `${Math.round(this._state.deathTorchPct * 100)}% torch`;
      addText(`${this._state.deathCause} (${torchStr})`, this._sw / 2, y - 4, { fontSize: 14, fill: 0xaa6644, fontStyle: "italic" }, true);
      y += 14;
    }

    const totalMins = Math.floor(this._state.elapsed / 60);
    const totalSecs = Math.floor(this._state.elapsed % 60);
    const diffDef = DIFFICULTIES.find(d => d.id === this._state.difficulty) ?? DIFFICULTIES[1];
    const streakSecs = Math.floor(this._state.bestNoHitStreak);
    const stats: [string, string, number][] = [
      ["Difficulty", diffDef.name, diffDef.color],
      ["Outcome", this._state.won ? "Escaped all 3 floors!" : `Fell on Floor ${this._state.floor + 1}`, titleColor],
      ["Total Time", `${totalMins}:${totalSecs.toString().padStart(2, "0")}`, 0xaaaaaa],
      ["Floors Cleared", `${this._state.won ? 3 : this._state.floor}/${FLOORS.length}`, 0x9977cc],
      ["Relics", `${this._state.totalRelicsCollected}`, 0xffd700],
      ["Best No-Hit", `${streakSecs}s`, streakSecs >= 60 ? 0xffd700 : 0x44ccaa],
      ["Secrets", `${this._state.secretsFound}`, this._state.secretsFound > 0 ? 0xffaa44 : 0x666666],
      ["Score [${diffDef.name}]", `${this._state.score}`, 0x44ccaa],
    ];

    for (const [label, value, color] of stats) {
      addText(label, px + 35, y, { fontSize: 16, fill: 0x778866 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 35, y); c.addChild(vt);
      y += 16;
    }

    // Achievements
    if (this._state.achievements.length > 0) {
      y += 6;
      const achStr = this._state.achievements.map(a => {
        switch (a) {
          case "Flawless": return "\u2B50 Flawless";
          case "Speed Clear": return "\u26A1 Speed Clear";
          case "Secret Hunter": return "\u{1F5DD}\uFE0F Secret Hunter";
          case "Trap Dodger": return "\u{1F6E1}\uFE0F Trap Dodger";
          case "Ghost": return "\u{1F47B} Ghost";
          default: return a;
        }
      }).join("  ");
      addText(achStr, this._sw / 2, y, { fontSize: 14, fill: 0xffd700, fontWeight: "bold" }, true);
      y += 14;
    }

    y += 10;
    // Retry
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 70, y, 140, 34, 5).stroke({ color: 0x9977cc, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._persistScore = 0;
      this._persistRelics = 0;
      this._persistInventory = [];
      this._startFloor(0);
    });
    c.addChild(retryBtn);
    addText("TRY AGAIN [Enter]", this._sw / 2, y + 9, { fontSize: 18, fill: 0x9977cc, fontWeight: "bold" }, true);

    // Endless mode button (only after winning)
    if (this._state.won) {
      y += 40;
      const endlessBtn = new Graphics();
      endlessBtn.roundRect(this._sw / 2 - 70, y, 140, 30, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
      endlessBtn.roundRect(this._sw / 2 - 70, y, 140, 30, 5).stroke({ color: 0xcc8844, width: 1.5, alpha: 0.5 });
      endlessBtn.eventMode = "static"; endlessBtn.cursor = "pointer";
      endlessBtn.on("pointerdown", () => {
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._persistScore = this._state.score;
        this._persistRelics = this._state.totalRelicsCollected;
        this._persistInventory = this._state.inventory.map(s => ({ type: s.type }));
        this._startEndless();
      });
      c.addChild(endlessBtn);
      addText("ENDLESS MODE", this._sw / 2, y + 8, { fontSize: 16, fill: 0xcc8844, fontWeight: "bold" }, true);
      y += 36;
    } else {
      y += 40;
    }

    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 40, y, 80, 24, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 45, y, 90, 26, 4).stroke({ color: 0x555555, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("labyrinthExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 5, { fontSize: 14, fill: 0x888888 }, true);

    // Fast retry hotkey (Enter)
    const retryKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        window.removeEventListener("keydown", retryKey);
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._persistScore = 0; this._persistRelics = 0; this._persistInventory = [];
        this._startFloor(0);
      }
    };
    window.addEventListener("keydown", retryKey);

    viewManager.addToLayer("ui", c);
  }

  // ---- Endless mode: infinite floors with scaling difficulty ----

  private _endlessFloor = 0;

  private _startEndless(): void {
    this._endlessFloor++;
    // Each endless floor uses floor 3 template but with increasing scaling
    const state = createLabyrinthState(2, this._difficulty); // always floor 3 template
    state.floor = 2; // display as floor 3+
    state.totalFloors = 999; // infinite
    state.score = this._persistScore;
    state.totalRelicsCollected = this._persistRelics;
    state.endless = true;
    for (const slot of this._persistInventory) {
      if (state.inventory.length < LabyrinthConfig.MAX_INVENTORY) {
        state.inventory.push({ type: slot.type as any });
      }
    }
    // Scale difficulty with each endless floor
    state.minoSpeed *= 1 + this._endlessFloor * 0.1;

    this._state = state;
    generateMaze(this._state);

    this._state.announcements = [{ text: `Endless Floor ${this._endlessFloor + 3}`, color: 0xcc8844, timer: 3 }];

    this._renderer.init(this._sw, this._sh);
    viewManager.addToLayer("ui", this._renderer.container);

    this._keyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { this.destroy(); window.dispatchEvent(new Event("labyrinthExit")); return; }
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") this._state.moveUp = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") this._state.moveDown = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this._state.moveLeft = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this._state.moveRight = true;
      if (e.key === "Shift") this._state.sprinting = true;
      if (e.key === "Tab") { e.preventDefault(); this._state.minimapVisible = !this._state.minimapVisible; }
      if (e.key === "1") useInventoryItem(this._state, 0);
      if (e.key === "2") useInventoryItem(this._state, 1);
      if (e.key === "3") useInventoryItem(this._state, 2);
      if (e.key === "q" || e.key === "Q") dropInventoryItem(this._state, 0);
    };
    this._keyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") this._state.moveUp = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") this._state.moveDown = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") this._state.moveLeft = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") this._state.moveRight = false;
      if (e.key === "Shift") this._state.sprinting = false;
    };
    window.addEventListener("keydown", this._keyDown);
    window.addEventListener("keyup", this._keyUp);

    this._tickerCb = (ticker: Ticker) => {
      updateLabyrinth(this._state, ticker.deltaMS / 1000);
      this._renderer.draw(this._state, this._sw, this._sh);

      if (this._state.floorComplete) {
        this._stopLoop();
        this._persistScore = this._state.score;
        this._persistRelics = this._state.totalRelicsCollected;
        this._persistInventory = this._state.inventory.map(s => ({ type: s.type }));
        viewManager.removeFromLayer("ui", this._renderer.container);
        this._renderer.destroy();
        setTimeout(() => this._startEndless(), 500);
      } else if (this._state.gameOver) {
        this._stopLoop();
        setTimeout(() => this._showResults(), 1200);
      }
    };
    viewManager.app.ticker.add(this._tickerCb);
  }
}
