// ---------------------------------------------------------------------------
// Alchemist mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createAlchemistState, AlchemistPhase, spawnCustomer } from "./state/AlchemistState";
import type { AlchemistState } from "./state/AlchemistState";
import { AlchemistConfig, RECIPES } from "./config/AlchemistConfig";
import { trySwap, processMatches, collapseGrid, updateFalling, serveCustomer } from "./systems/GridSystem";
import { AlchemistRenderer } from "./view/AlchemistRenderer";

export class AlchemistGame {
  private _state!: AlchemistState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new AlchemistRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: { global: { x: number; y: number } }) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _matchCooldown = 0;
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

  // ---------------------------------------------------------------------------
  // Start screen (simple)
  // ---------------------------------------------------------------------------

  private _showStartScreen(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0806 });
    c.addChild(bg);

    const title = new Text({ text: "\u2697 ALCHEMIST \u2697", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0xaa8844, fontWeight: "bold", letterSpacing: 6 }) });
    title.anchor.set(0.5, 0); title.position.set(this._sw / 2, this._sh * 0.15);
    c.addChild(title);

    const sub = new Text({ text: "A Medieval Potion Puzzle Game", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0x887766, fontStyle: "italic" }) });
    sub.anchor.set(0.5, 0); sub.position.set(this._sw / 2, this._sh * 0.15 + 42);
    c.addChild(sub);

    const desc = new Text({ text: "Match ingredients on the grid to collect them.\nFulfill customer potion orders before they leave.\nBrew as many potions as you can in 5 minutes!", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: 0x998877, wordWrap: true, wordWrapWidth: 400, align: "center", lineHeight: 18 }) });
    desc.anchor.set(0.5, 0); desc.position.set(this._sw / 2, this._sh * 0.3);
    c.addChild(desc);

    const controls = new Text({ text: "Click: select tile | Click adjacent: swap | Click BREW: serve customer", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x776655 }) });
    controls.anchor.set(0.5, 0); controls.position.set(this._sw / 2, this._sh * 0.5);
    c.addChild(controls);

    // Start button
    const btn = new Graphics();
    btn.roundRect(this._sw / 2 - 80, this._sh * 0.6, 160, 42, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    btn.roundRect(this._sw / 2 - 80, this._sh * 0.6, 160, 42, 5).stroke({ color: 0xaa8844, width: 2, alpha: 0.6 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c);
      c.destroy({ children: true });
      this._startGame();
    });
    c.addChild(btn);
    const btnLabel = new Text({ text: "BEGIN BREWING", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xaa8844, fontWeight: "bold", letterSpacing: 2 }) });
    btnLabel.anchor.set(0.5, 0); btnLabel.position.set(this._sw / 2, this._sh * 0.6 + 12);
    c.addChild(btnLabel);

    // Back button
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 50, this._sh * 0.7, 100, 30, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 50, this._sh * 0.7, 100, 30, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c);
      c.destroy({ children: true });
      this.destroy();
      window.dispatchEvent(new Event("alchemistExit"));
    });
    c.addChild(backBtn);
    const backLabel = new Text({ text: "BACK", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x888888 }) });
    backLabel.anchor.set(0.5, 0); backLabel.position.set(this._sw / 2, this._sh * 0.7 + 8);
    c.addChild(backLabel);

    viewManager.addToLayer("ui", c);
  }

  // ---------------------------------------------------------------------------
  // Game
  // ---------------------------------------------------------------------------

  private _startGame(): void {
    const seed = Date.now() % 2147483647;
    this._state = createAlchemistState(seed);
    this._resultShown = false;
    this._matchCooldown = 0;

    this._renderer.init(this._sw, this._sh);
    this._renderer.setServeCallback((id) => serveCustomer(this._state, id));
    viewManager.addToLayer("ui", this._renderer.container);

    // Input
    this._pointerHandler = (e: { global: { x: number; y: number } }) => {
      if (this._state.phase !== AlchemistPhase.PLAYING) return;
      if (this._state.swapping || this._state.matching) return;

      const offset = this._renderer.getGridOffset(this._sw, this._sh);
      const col = Math.floor((e.global.x - offset.x) / AlchemistConfig.TILE_SIZE);
      const row = Math.floor((e.global.y - offset.y) / AlchemistConfig.TILE_SIZE);

      if (col < 0 || col >= AlchemistConfig.GRID_COLS || row < 0 || row >= AlchemistConfig.GRID_ROWS) return;

      if (this._state.selectedTile) {
        const sx = this._state.selectedTile.x, sy = this._state.selectedTile.y;
        // Deselect if clicking same tile
        if (sx === col && sy === row) {
          this._state.grid[sy][sx].selected = false;
          this._state.selectedTile = null;
          return;
        }
        // Try swap if adjacent
        if (Math.abs(sx - col) + Math.abs(sy - row) === 1) {
          this._state.grid[sy][sx].selected = false;
          this._state.selectedTile = null;
          trySwap(this._state, sx, sy, col, row);
          return;
        }
        // Deselect old, select new
        this._state.grid[sy][sx].selected = false;
      }
      this._state.grid[row][col].selected = true;
      this._state.selectedTile = { x: col, y: row };
    };
    viewManager.app.stage.eventMode = "static";
    viewManager.app.stage.on("pointerdown", this._pointerHandler);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.destroy();
        window.dispatchEvent(new Event("alchemistExit"));
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    // Game loop
    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _update(dt: number): void {
    if (this._state.phase !== AlchemistPhase.PLAYING) return;

    this._state.elapsedTime += dt;

    // Match processing cooldown
    if (this._matchCooldown > 0) {
      this._matchCooldown -= dt;
      if (this._matchCooldown <= 0) {
        // Process matches after tiles settled
        const cleared = processMatches(this._state);
        if (cleared > 0) {
          this._matchCooldown = 0.2; // brief pause before collapse
          setTimeout(() => {
            collapseGrid(this._state);
            this._matchCooldown = 0.3; // time for tiles to fall
          }, 200);
        }
      }
    }

    // Update falling tiles
    const falling = updateFalling(this._state, dt);
    if (!falling && this._matchCooldown <= 0 && !this._state.swapping) {
      // Check for new matches after tiles settle (cascading)
      const cleared = processMatches(this._state);
      if (cleared > 0) {
        this._matchCooldown = 0.25;
        setTimeout(() => collapseGrid(this._state), 200);
      }
    }

    // Swap animation
    if (this._state.swapping) {
      this._state.swapping.progress += dt * 5;
      if (this._state.swapping.progress >= 1) {
        this._state.swapping = null;
        this._matchCooldown = 0.15;
      }
    }

    // Customer timer
    this._state.customerTimer -= dt;
    if (this._state.customerTimer <= 0) {
      spawnCustomer(this._state, RECIPES);
      this._state.customerTimer = AlchemistConfig.CUSTOMER_INTERVAL;
    }

    // Customer patience decay
    for (const cust of this._state.customers) {
      if (cust.served || cust.left) continue;
      cust.patience -= dt;
      if (cust.patience <= 0) {
        cust.left = true;
        this._state.customersLost++;
        this._state.reputation += AlchemistConfig.REPUTATION_PER_FAIL;
        this._state.log.push(`${cust.name} left unsatisfied!`);
        this._state.announcements.push({ text: `${cust.name} left!`, color: 0xff4444, timer: 2 });
      }
    }

    // Update announcements & particles
    for (let i = this._state.announcements.length - 1; i >= 0; i--) {
      this._state.announcements[i].timer -= dt;
      if (this._state.announcements[i].timer <= 0) this._state.announcements.splice(i, 1);
    }
    for (let i = this._state.particles.length - 1; i >= 0; i--) {
      const p = this._state.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt;
      p.life -= dt;
      if (p.life <= 0) this._state.particles.splice(i, 1);
    }

    // Time up
    if (this._state.elapsedTime >= this._state.timeLimit && !this._resultShown) {
      this._resultShown = true;
      this._state.phase = AlchemistPhase.RESULTS;
      this._state.announcements.push({ text: "TIME'S UP!", color: 0xffaa44, timer: 3 });
      audioManager.playJingle("level_up");
      setTimeout(() => this._showResults(), 2000);
    }

    // Render
    this._renderer.draw(this._state, this._sw, this._sh);
  }

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------

  private _showResults(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._pointerHandler) { viewManager.app.stage.off("pointerdown", this._pointerHandler); this._pointerHandler = null; }

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static";
    c.addChild(ov);

    const pw = 450, ph = 380, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0806, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0xaa8844, width: 2, alpha: 0.5 });
    c.addChild(panel);

    let y = py + 16;
    const addText = (str: string, tx: number, ty: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(tx, ty); c.addChild(t);
    };

    addText("\u2697 SHOP CLOSED \u2697", this._sw / 2, y, { fontSize: 22, fill: 0xaa8844, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 36;

    const stats: [string, string, number][] = [
      ["Score", `${this._state.score}`, 0xffd700],
      ["Gold Earned", `${this._state.gold - AlchemistConfig.STARTING_GOLD}g`, 0xffd700],
      ["Potions Brewed", `${this._state.potionsBrewed}`, 0x44ccaa],
      ["Customers Served", `${this._state.customersServed}`, 0x44aa44],
      ["Customers Lost", `${this._state.customersLost}`, 0xff6644],
      ["Best Combo", `${this._state.bestCombo}x`, 0xffaa44],
      ["Reputation", `${this._state.reputation}`, 0x88aaff],
      ["Tier", `${this._state.tier}`, 0xccaa88],
    ];

    for (const [label, value, color] of stats) {
      addText(label, px + 40, y, { fontSize: 11, fill: 0x887766 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 40, y); c.addChild(vt);
      y += 18;
    }

    y += 15;

    // Buttons
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 80, y, 160, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 80, y, 160, 36, 5).stroke({ color: 0xaa8844, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c);
      viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true });
      this._renderer.destroy();
      this._startGame();
    });
    c.addChild(retryBtn);
    addText("BREW AGAIN", this._sw / 2, y + 10, { fontSize: 12, fill: 0xaa8844, fontWeight: "bold", letterSpacing: 2 }, true);

    y += 46;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).stroke({ color: 0x666655, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c);
      c.destroy({ children: true });
      this.destroy();
      window.dispatchEvent(new Event("alchemistExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 7, { fontSize: 10, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
