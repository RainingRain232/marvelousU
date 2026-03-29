// ---------------------------------------------------------------------------
// Plague Doctor — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createPlagueState, PlaguePhase, TileType } from "./state/PlagueState";
import type { PlagueState } from "./state/PlagueState";
import {
  tryMove, moveAlongPath, endTurn, treatHouse, gatherHerbs, craftRemedy,
  restAtChurch, quarantineHouse, fumigate, killRat, buyFromMarket, findPath,
  undoTurn, selectPerk, resolveEventChoice, updateVisibility, saveUndoSnapshot,
  useAbility, warnHouse, attackHarbinger, updateTutorialHints, dismissTutorial,
} from "./systems/PlagueSystem";
import type { MarketItem } from "./systems/PlagueSystem";
import { PlagueRenderer } from "./view/PlagueRenderer";
import { PlagueConfig, UNLOCK_MILESTONES } from "./config/PlagueConfig";

export class PlagueGame {
  private _state!: PlagueState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new PlagueRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _difficulty = 1;
  private _selectContainer: Container | null = null;
  private _pauseMenu: Container | null = null;
  private _paused = false;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showDifficultySelect();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    if (this._selectContainer) {
      viewManager.removeFromLayer("ui", this._selectContainer);
      this._selectContainer.destroy({ children: true });
      this._selectContainer = null;
    }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _showDifficultySelect(): void {
    const c = new Container();
    this._selectContainer = c;
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x0d0d0a });
    for (let i = 0; i < 3; i++) {
      bg.rect(10 + i * 6, 10 + i * 6, this._sw - 20 - i * 12, this._sh - 20 - i * 12)
        .stroke({ color: 0x443322, width: 1, alpha: 0.15 - i * 0.04 });
    }
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y); c.addChild(t);
    };

    addText("PLAGUE DOCTOR", this._sw / 2, 50, { fontSize: 30, fill: 0xccaa55, fontWeight: "bold", letterSpacing: 6 }, true);
    addText("A Medieval Pandemic Strategy Game", this._sw / 2, 88, { fontSize: 13, fill: 0x887766, fontStyle: "italic" }, true);

    const desc = [
      "Navigate a plague-ravaged city as the lone doctor.",
      "Treat the sick, gather herbs, craft remedies, stop the spread.",
      "Use powerful abilities: Holy Water, Bonfire, and Barricade.",
      "Beware of rats, plague mutations, and the dreaded Harbinger.",
      "Earn perks every 5 days. Survive plague waves. Conquer the weather.",
    ];
    let dy = 118;
    for (const line of desc) { addText(line, this._sw / 2, dy, { fontSize: 10, fill: 0x998877 }, true); dy += 15; }

    dy += 10;
    addText("Choose Difficulty:", this._sw / 2, dy, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold" }, true);
    dy += 26;

    const colors = [0x44aa44, 0xddaa33, 0xff4444];
    const diffs = PlagueConfig.DIFFICULTIES;
    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const g = new Graphics();
      const bw = 300, bh = 46;
      g.roundRect(this._sw / 2 - bw / 2, dy, bw, bh, 6).fill({ color: 0x0a0806, alpha: 0.85 });
      g.roundRect(this._sw / 2 - bw / 2, dy, bw, bh, 6).stroke({ color: colors[i], width: 1.5, alpha: 0.5 });
      g.eventMode = "static"; g.cursor = "pointer";
      const idx = i;
      g.on("pointerdown", () => {
        viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
        this._selectContainer = null;
        this._difficulty = idx;
        this._startGame();
      });
      c.addChild(g);
      addText(d.name, this._sw / 2, dy + 7, { fontSize: 14, fill: colors[i], fontWeight: "bold" }, true);
      addText(d.desc, this._sw / 2, dy + 26, { fontSize: 9, fill: 0x888877 }, true);
      dy += bh + 8;
    }

    // High score display
    try {
      const bestScore = parseInt(localStorage.getItem("plague_best_score") ?? "0") || 0;
      const bestCured = parseInt(localStorage.getItem("plague_best_cured") ?? "0") || 0;
      if (bestScore > 0) { dy += 8; addText(`Best: ${bestScore} pts | ${bestCured} cured`, this._sw / 2, dy, { fontSize: 10, fill: 0x776655 }, true); dy += 18; }
    } catch { /* ignore */ }

    // Unlock milestones
    try {
      const totalWins = parseInt(localStorage.getItem("plague_total_wins") ?? "0") || 0;
      if (UNLOCK_MILESTONES.length > 0) {
        dy += 6;
        addText("Milestones:", this._sw / 2, dy, { fontSize: 10, fill: 0x998866, fontWeight: "bold" }, true);
        dy += 16;
        for (const milestone of UNLOCK_MILESTONES) {
          const unlocked = totalWins >= milestone.wins;
          const icon = unlocked ? "\u2713" : "\u2022";
          const color = unlocked ? 0x66aa66 : 0x554433;
          addText(`${icon} ${milestone.label} (${milestone.wins}W) — ${milestone.reward}`, this._sw / 2, dy, { fontSize: 9, fill: color }, true);
          dy += 14;
        }
      }
    } catch { /* ignore */ }

    dy += 10;
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 55, dy, 110, 30, 5).fill({ color: 0x0a0a0a, alpha: 0.7 });
    backBtn.roundRect(this._sw / 2 - 55, dy, 110, 30, 5).stroke({ color: 0x555544, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this._selectContainer = null;
      this.destroy(); window.dispatchEvent(new Event("plagueExit"));
    });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, dy + 8, { fontSize: 11, fill: 0x888877, fontWeight: "bold" }, true);

    viewManager.addToLayer("ui", c);
  }

  private _startGame(): void {
    this._state = createPlagueState(this._difficulty + 1, this._difficulty);

    const diff = PlagueConfig.DIFFICULTIES[this._difficulty];
    this._state.maxMoves += diff.movesBonus;
    this._state.movesLeft = this._state.maxMoves;

    // Initial visibility
    updateVisibility(this._state);
    updateTutorialHints(this._state);
    saveUndoSnapshot(this._state);

    this._renderer.init(this._sw, this._sh);
    this._renderer.setCallbacks({
      endTurn: () => endTurn(this._state),
      treat: () => treatHouse(this._state),
      gather: () => gatherHerbs(this._state),
      craft: () => craftRemedy(this._state),
      rest: () => restAtChurch(this._state),
      quarantine: () => quarantineHouse(this._state),
      fumigate: () => fumigate(this._state),
      killRat: () => killRat(this._state),
      buy: (item: string) => buyFromMarket(this._state, item as MarketItem),
      undo: () => undoTurn(this._state),
      exit: () => this._exitToSelect(),
      tileClick: (gx, gy) => this._handleTileClick(gx, gy),
      hover: (gx, gy) => { this._state.hoverX = gx; this._state.hoverY = gy; },
      perkSelect: (idx) => selectPerk(this._state, idx),
      eventChoice: (idx) => resolveEventChoice(this._state, idx),
      useAbility: (id: string) => useAbility(this._state, id),
      warn: () => warnHouse(this._state),
      attackHarbinger: () => attackHarbinger(this._state),
      toggleLog: () => { this._state.showLog = !this._state.showLog; },
      dismissTutorial: () => dismissTutorial(this._state),
    });
    viewManager.addToLayer("ui", this._renderer.container);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (this._paused) this._hidePauseMenu(); else this._showPauseMenu();
        return;
      }

      // Perk selection
      if (this._state.phase === PlaguePhase.PERK_SELECT) {
        if (e.key === "1" && this._state.perkChoices.length > 0) selectPerk(this._state, 0);
        if (e.key === "2" && this._state.perkChoices.length > 1) selectPerk(this._state, 1);
        if (e.key === "3" && this._state.perkChoices.length > 2) selectPerk(this._state, 2);
        return;
      }

      // Event choice
      if (this._state.phase === PlaguePhase.EVENT_CHOICE && this._state.currentEvent) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < this._state.currentEvent.choices.length) resolveEventChoice(this._state, idx);
        return;
      }

      if (this._state.phase !== PlaguePhase.PLAYING) return;

      // Movement
      let moved = false;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") moved = tryMove(this._state, 0, -1);
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") moved = tryMove(this._state, 0, 1);
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") moved = tryMove(this._state, -1, 0);
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") moved = tryMove(this._state, 1, 0);
      if (moved) this._state.movePath = [];

      // Actions
      if (e.key === "t" || e.key === "T") treatHouse(this._state);
      if (e.key === "g" || e.key === "G") gatherHerbs(this._state);
      if (e.key === "c" || e.key === "C") craftRemedy(this._state);
      if (e.key === "r" || e.key === "R") restAtChurch(this._state);
      if (e.key === "q" || e.key === "Q") quarantineHouse(this._state);
      if (e.key === "f" || e.key === "F") fumigate(this._state);
      if (e.key === "k" || e.key === "K") killRat(this._state);
      if (e.key === "u" || e.key === "U") undoTurn(this._state);
      if (e.key === "Enter" || e.key === " ") endTurn(this._state);

      // Warn house
      if (e.key === "n" || e.key === "N") warnHouse(this._state);

      // Attack harbinger
      if (e.key === "x" || e.key === "X") attackHarbinger(this._state);

      // Toggle log
      if (e.key === "l" || e.key === "L") { this._state.showLog = !this._state.showLog; }
      if (e.key === "h" || e.key === "H") dismissTutorial(this._state);

      // Number keys: context-sensitive (market buy vs ability use)
      if (e.key >= "1" && e.key <= "3") {
        const tile = this._state.grid[this._state.py]?.[this._state.px];
        if (tile && tile.type === TileType.MARKET) {
          const items: MarketItem[] = ["herbs", "mask", "leech"];
          buyFromMarket(this._state, items[parseInt(e.key) - 1]);
        } else {
          const abilityIds = ["holy_water", "bonfire", "barricade"];
          const idx = parseInt(e.key) - 1;
          if (idx < abilityIds.length) useAbility(this._state, abilityIds[idx]);
        }
      }
      if (e.key === "4") {
        const tile = this._state.grid[this._state.py]?.[this._state.px];
        if (tile && tile.type === TileType.MARKET) {
          buyFromMarket(this._state, "remedy");
        }
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _handleTileClick(gx: number, gy: number): void {
    if (this._state.phase !== PlaguePhase.PLAYING) return;
    if (gx < 0 || gx >= this._state.cols || gy < 0 || gy >= this._state.rows) return;
    if (gx === this._state.px && gy === this._state.py) { this._state.movePath = []; return; }
    const path = findPath(this._state, gx, gy);
    if (path.length > 0) { this._state.movePath = path; moveAlongPath(this._state); }
  }

  private _update(dt: number): void {
    if (this._paused) return;
    const state = this._state;
    state.time += dt;
    if (state.turnFlashTimer > 0) state.turnFlashTimer -= dt;
    if (state.deathShake > 0) state.deathShake -= dt * 2;
    if (state.waveFlash > 0) state.waveFlash -= dt * 2;

    for (let i = state.announcements.length - 1; i >= 0; i--) {
      state.announcements[i].timer -= dt;
      if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
    }

    // Auto-walk
    if (state.movePath.length > 0 && state.movesLeft > 0 && state.phase === PlaguePhase.PLAYING) {
      if (Math.abs(state.animPx - state.px) < 0.3 && Math.abs(state.animPy - state.py) < 0.3) {
        moveAlongPath(state);
      }
    }

    this._renderer.draw(state, this._sw, this._sh, dt);

    if (state.phase === PlaguePhase.WON || state.phase === PlaguePhase.LOST) {
      try {
        const prevScore = parseInt(localStorage.getItem("plague_best_score") ?? "0") || 0;
        const prevCured = parseInt(localStorage.getItem("plague_best_cured") ?? "0") || 0;
        if (state.score > prevScore) localStorage.setItem("plague_best_score", `${state.score}`);
        if (state.cured > prevCured) localStorage.setItem("plague_best_cured", `${state.cured}`);
        if (state.phase === PlaguePhase.WON) {
          const totalWins = parseInt(localStorage.getItem("plague_total_wins") ?? "0") || 0;
          localStorage.setItem("plague_total_wins", `${totalWins + 1}`);
        }
      } catch { /* ignore */ }
    }
  }

  private _showPauseMenu(): void {
    this._paused = true;
    const sw = this._sw, sh = this._sh;
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    bg.eventMode = "static";
    c.addChild(bg);

    const pw = 520, ph = 460, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x0a0806, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0x44aa44, width: 2, alpha: 0.5 });
    panel.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8).stroke({ color: 0x44aa44, width: 0.5, alpha: 0.15 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y);
      c.addChild(t);
      return t;
    };
    addText("PAUSED", sw / 2, py + 16, { fontSize: 22, fill: 0x44aa44, fontWeight: "bold", letterSpacing: 4 }, true);

    // Tab state
    const tabContainer = new Container();
    c.addChild(tabContainer);
    const contentContainer = new Container();
    c.addChild(contentContainer);
    const clearContent = () => { while (contentContainer.children.length > 0) { const ch = contentContainer.removeChildAt(0); ch.destroy(); } };
    const clearTabs = () => { while (tabContainer.children.length > 0) { const ch = tabContainer.removeChildAt(0); ch.destroy(); } };

    let activeTab = 0;
    const tabNames = ["Controls", "Introduction", "Game Concepts"];
    const tabY = py + 50;
    const contentY = tabY + 38;

    const drawTabs = () => {
      clearTabs();
      const tabW = Math.floor((pw - 30) / tabNames.length);
      for (let i = 0; i < tabNames.length; i++) {
        const tx = px + 12 + i * (tabW + 3);
        const isActive = i === activeTab;
        const btn = new Graphics();
        btn.roundRect(tx, tabY, tabW, 30, 4).fill({ color: isActive ? 0x1a1a14 : 0x0a0a06, alpha: 0.95 });
        btn.roundRect(tx, tabY, tabW, 30, 4).stroke({ color: isActive ? 0x44aa44 : 0x555544, width: isActive ? 1.5 : 0.8, alpha: isActive ? 0.7 : 0.3 });
        if (isActive) btn.rect(tx + 2, tabY + 28, tabW - 4, 2).fill({ color: 0x44aa44, alpha: 0.6 });
        btn.eventMode = "static"; btn.cursor = "pointer";
        const idx = i;
        btn.on("pointerdown", () => { activeTab = idx; drawTabs(); showTabContent(idx); });
        tabContainer.addChild(btn);
        const label = new Text({ text: tabNames[i], style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: isActive ? 0x44aa44 : 0x888877, fontWeight: isActive ? "bold" : "normal", letterSpacing: 1 } as any) });
        label.anchor.set(0.5, 0.5); label.position.set(tx + tabW / 2, tabY + 15);
        tabContainer.addChild(label);
      }
    };

    const showTabContent = (tab: number) => {
      clearContent();
      const cy = contentY + 8;

      if (tab === 0) {
        // Controls tab
        const controls = [
          ["WASD / Arrow Keys", "Move around the city"],
          ["Click tile", "Move along path to tile"],
          ["F", "Fumigate adjacent tiles"],
          ["T", "Treat infected house"],
          ["G", "Gather herbs from herb garden"],
          ["C", "Craft remedy (requires herbs)"],
          ["R", "Rest at church (restore health)"],
          ["Q", "Quarantine an infected house"],
          ["K", "Kill a rat on your tile"],
          ["N", "Warn a healthy house"],
          ["X", "Attack the Harbinger"],
          ["U", "Undo last turn"],
          ["Space / Enter", "End current turn"],
          ["1 / 2 / 3", "Use ability or buy at market"],
          ["L", "Toggle event log"],
          ["Esc", "Pause / Resume"],
        ];
        let row = 0;
        for (const [key, desc] of controls) {
          const ky = cy + row * 18;
          const kt = new Text({ text: key, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0xccaa44, fontWeight: "bold" } as any) });
          kt.position.set(px + 30, ky);
          contentContainer.addChild(kt);
          const dt = new Text({ text: desc, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0xbbbbaa } as any) });
          dt.position.set(px + 170, ky);
          contentContainer.addChild(dt);
          row++;
        }
      } else if (tab === 1) {
        // Introduction tab
        const introLines = [
          "You are a Plague Doctor, the last hope of a medieval town",
          "ravaged by the Black Death. The pestilence spreads through",
          "the districts, infecting homes and killing the innocent.",
          "",
          "Your mission: move through the city streets, treating the",
          "sick, gathering medicinal herbs, and crafting remedies to",
          "save as many citizens as possible before the plague",
          "consumes the entire settlement.",
          "",
          "Each day you have limited moves. Spend them wisely --",
          "treat the critically ill first, gather herbs when you can,",
          "and use your special abilities (Holy Water, Bonfire,",
          "Barricade) to contain outbreaks.",
          "",
          "Beware: rats carry the plague to new houses, storms",
          "worsen the spread, and the dreaded Harbinger -- a dark",
          "figure -- accelerates death wherever it roams.",
          "",
          "Survive the waves. Earn perks. Save the town.",
        ];
        let row = 0;
        for (const line of introLines) {
          const lt = new Text({ text: line, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 11, fill: line === "" ? 0x000000 : 0xccccaa, lineHeight: 18 } as any) });
          lt.position.set(px + 24, cy + row * 17);
          contentContainer.addChild(lt);
          row++;
        }
      } else if (tab === 2) {
        // Game Concepts tab
        const concepts = [
          { title: "Infection Levels", text: "Healthy > Exposed > Infected > Dying > Dead. Treat before it's too late." },
          { title: "Districts", text: "The city is divided into districts. Plague spreads faster within a district than across boundaries." },
          { title: "Fumigation (F)", text: "Costs 1 herb. Slows infection on all adjacent tiles for several turns. Essential for containment." },
          { title: "Herbs & Remedies", text: "Gather herbs at herb gardens (G). Craft remedies (C) from herbs for more effective treatment of severe cases." },
          { title: "Quarantine (Q)", text: "Seal off an infected house to prevent spread. The occupants may die, but the plague stays contained." },
          { title: "Abilities (1/2/3)", text: "Holy Water: purify area. Bonfire: burn plague from tiles. Barricade: block a road to stop rat movement." },
          { title: "Rats", text: "Rats carry plague to healthy houses. Kill them (K) when adjacent. They multiply if left unchecked." },
          { title: "Weather", text: "Sun is neutral. Rain slows you. Storms accelerate plague spread and reduce visibility." },
          { title: "Perks", text: "Every 5 days, choose a perk to help you. Perks stack and persist for the rest of the run." },
          { title: "The Harbinger", text: "A cloaked figure that appears on later waves. It accelerates death in nearby houses. Attack it (X) to drive it away." },
        ];
        let row = 0;
        for (const concept of concepts) {
          const titleT = new Text({ text: concept.title, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0xccaa44, fontWeight: "bold" } as any) });
          titleT.position.set(px + 24, cy + row);
          contentContainer.addChild(titleT);
          row += 15;
          const descT = new Text({ text: concept.text, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 9, fill: 0xaaaaaa, wordWrap: true, wordWrapWidth: pw - 50 } as any) });
          descT.position.set(px + 24, cy + row);
          contentContainer.addChild(descT);
          row += descT.height + 6;
        }
      }
    };

    // Bottom buttons: RESUME and EXIT TO MENU
    const btnY = py + ph - 50;
    const makeBottomBtn = (label: string, x: number, w: number, color: number, cb: () => void) => {
      const btn = new Graphics();
      btn.roundRect(x, btnY, w, 36, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
      btn.roundRect(x, btnY, w, 36, 5).stroke({ color, width: 1.5, alpha: 0.6 });
      btn.eventMode = "static"; btn.cursor = "pointer";
      btn.on("pointerdown", cb);
      c.addChild(btn);
      const t = new Text({ text: label, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: color, fontWeight: "bold", letterSpacing: 1 } as any) });
      t.anchor.set(0.5, 0.5); t.position.set(x + w / 2, btnY + 18);
      c.addChild(t);
    };
    makeBottomBtn("RESUME", sw / 2 - 160, 150, 0x44cc66, () => this._hidePauseMenu());
    makeBottomBtn("EXIT TO MENU", sw / 2 + 10, 150, 0xcc4444, () => {
      this._hidePauseMenu();
      this.destroy();
      window.dispatchEvent(new Event("plagueExit"));
    });

    drawTabs();
    showTabContent(0);
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

  private _exitToSelect(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
    this._renderer = new PlagueRenderer();
    this._showDifficultySelect();
  }
}
