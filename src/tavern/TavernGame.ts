// ---------------------------------------------------------------------------
// Tavern mode — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker, Graphics, Container, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import { createTavernState, TavernPhase } from "./state/TavernState";
import type { TavernState } from "./state/TavernState";
import { OPPONENTS } from "./config/TavernConfig";
import { placeBet, playerHit, playerStand, playerDoubleDown, playerInsurance, playerSplit } from "./systems/CardSystem";
import { TavernRenderer } from "./view/TavernRenderer";

// Track unlocked opponents (persisted via localStorage)
function getUnlockedLevel(): number {
  try { return parseInt(localStorage.getItem("tavern_unlocked") ?? "0") || 0; } catch { return 0; }
}
function setUnlockedLevel(level: number): void {
  try { localStorage.setItem("tavern_unlocked", `${level}`); } catch { /* ignore */ }
}

export class TavernGame {
  private _state!: TavernState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new TavernRenderer();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _sw = 0;
  private _sh = 0;
  private _pauseMenu: Container | null = null;
  private _paused = false;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;
    this._showOpponentSelect();
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    if (this._keyHandler) { window.removeEventListener("keydown", this._keyHandler); this._keyHandler = null; }
    this._renderer.destroy();
    viewManager.removeFromLayer("ui", this._renderer.container);
  }

  private _showOpponentSelect(): void {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x1a1208 });
    // Wood texture
    for (let py = 0; py < this._sh; py += 18) bg.moveTo(0, py).lineTo(this._sw, py).stroke({ color: 0x221a0e, width: 0.3, alpha: 0.1 });
    for (let v = 0; v < 5; v++) { const i = v * 40; bg.rect(0, 0, i, this._sh).fill({ color: 0x000000, alpha: 0.02 }); bg.rect(this._sw - i, 0, i, this._sh).fill({ color: 0x000000, alpha: 0.02 }); }
    c.addChild(bg);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    addText("\u{1F3BA} TAVERN \u{1F3BA}", this._sw / 2, 30, { fontSize: 28, fill: 0xcc8844, fontWeight: "bold", letterSpacing: 5 }, true);
    addText("A Medieval Card Game", this._sw / 2, 65, { fontSize: 12, fill: 0x887766, fontStyle: "italic" }, true);
    addText("Choose your opponent:", this._sw / 2, 100, { fontSize: 13, fill: 0xccaa88 }, true);

    const unlocked = getUnlockedLevel();
    let y = 125;
    for (let i = 0; i < OPPONENTS.length; i++) {
      const opp = OPPONENTS[i];
      const isLocked = i > unlocked;
      const g = new Graphics();
      g.roundRect(this._sw / 2 - 130, y, 260, 40, 5).fill({ color: isLocked ? 0x080808 : 0x0a0806, alpha: 0.7 });
      g.roundRect(this._sw / 2 - 130, y, 260, 40, 5).stroke({ color: isLocked ? 0x333333 : opp.color, width: 1, alpha: isLocked ? 0.2 : 0.4 });
      if (!isLocked) {
        g.eventMode = "static"; g.cursor = "pointer";
        const idx = i;
        g.on("pointerdown", () => {
          viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
          this._startGame(idx);
        });
      }
      c.addChild(g);
      if (isLocked) {
        addText(`\u{1F512} ${opp.name} ${opp.title}`, this._sw / 2, y + 5, { fontSize: 11, fill: 0x555555 }, true);
        addText(`Beat ${OPPONENTS[i - 1]?.name ?? "?"} to unlock`, this._sw / 2, y + 22, { fontSize: 9, fill: 0x554444 }, true);
      } else {
        addText(`${i <= unlocked - 1 ? "\u2713 " : ""}${opp.name} ${opp.title}`, this._sw / 2, y + 5, { fontSize: 11, fill: opp.color, fontWeight: "bold" }, true);
        addText(`Min bet: ${opp.minBet}g | Tier ${opp.tier + 1}`, this._sw / 2, y + 22, { fontSize: 9, fill: 0x888877 }, true);
      }
      y += 46;
    }

    y += 10;
    const backBtn = new Graphics();
    backBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    backBtn.roundRect(this._sw / 2 - 50, y, 100, 28, 4).stroke({ color: 0x555555, width: 1 });
    backBtn.eventMode = "static"; backBtn.cursor = "pointer";
    backBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("tavernExit"));
    });
    c.addChild(backBtn);
    addText("BACK", this._sw / 2, y + 7, { fontSize: 10, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }

  private _startGame(opponentIndex: number): void {
    this._state = createTavernState(opponentIndex);

    this._renderer.init(this._sw, this._sh);
    this._renderer.setCallbacks(
      () => { playerHit(this._state); },
      () => { playerStand(this._state); },
      () => { playerDoubleDown(this._state); },
      (amount) => { placeBet(this._state, amount); },
      () => { this._nextRound(); },
      () => { playerInsurance(this._state); },
      () => { playerSplit(this._state); },
    );
    viewManager.addToLayer("ui", this._renderer.container);

    this._keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (this._pauseMenu) { this._hidePauseMenu(); } else { this._showPauseMenu(); } return; }
      if (this._state.phase === TavernPhase.PLAYER_TURN) {
        if (e.key === "h" || e.key === "H") playerHit(this._state);
        if (e.key === "s" || e.key === "S") playerStand(this._state);
        if (e.key === "d" || e.key === "D") playerDoubleDown(this._state);
        if (e.key === "i" || e.key === "I") playerInsurance(this._state);
        if (e.key === "p" || e.key === "P") playerSplit(this._state);
      }
      if (this._state.phase === TavernPhase.BETTING && (e.key === "Enter" || e.key === " ")) {
        placeBet(this._state, this._state.opponent.minBet);
      }
      if (this._state.phase === TavernPhase.RESULT && (e.key === "Enter" || e.key === " ")) {
        this._nextRound();
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _update(dt: number): void {
    if (this._paused) return;
    // Update announcements
    for (let i = this._state.announcements.length - 1; i >= 0; i--) {
      this._state.announcements[i].timer -= dt;
      if (this._state.announcements[i].timer <= 0) this._state.announcements.splice(i, 1);
    }

    this._renderer.draw(this._state, this._sw, this._sh);

    if (this._state.phase === TavernPhase.GAME_OVER) {
      // Auto-show results after delay
      if (!this._state.announcements.some(a => a.text.includes("SESSION"))) {
        this._state.announcements.push({ text: "SESSION OVER", color: 0xffaa44, timer: 3 });
        setTimeout(() => this._showResults(), 2000);
      }
    }
  }

  private _nextRound(): void {
    if (this._state.phase === TavernPhase.GAME_OVER) {
      this._showResults();
      return;
    }
    this._state.phase = TavernPhase.BETTING;
    this._state.playerHand = [];
    this._state.dealerHand = [];
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
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x1a1208, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: 0xcc9944, width: 2, alpha: 0.5 });
    panel.roundRect(px + 4, py + 4, pw - 8, ph - 8, 8).stroke({ color: 0xcc9944, width: 0.5, alpha: 0.15 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0);
      t.position.set(x, y);
      c.addChild(t);
    };
    addText("PAUSED", sw / 2, py + 16, { fontSize: 22, fill: 0xcc9944, fontWeight: "bold", letterSpacing: 4 }, true);

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
        const t = new Text({ text: "H: Hit (draw another card)\nS: Stand (end your turn)\nD: Double Down\nI: Insurance (when dealer shows Ace)\nP: Split (matching cards)\nEnter/Space: Place bet / Continue", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xccccaa, align: "center", lineHeight: 22 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("INSTRUCTIONS", py + 170, 0xccaa44, () => {
        clearContent();
        const t = new Text({ text: "Medieval Blackjack at the tavern.\nGet as close to 21 as possible without going over.\nFace cards are worth 10, Aces are 1 or 11.\nBeat the dealer to win your bet.\nDouble down for bigger risk and reward.", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xccccaa, align: "center", wordWrap: true, wordWrapWidth: 380, lineHeight: 20 } as any) });
        t.anchor.set(0.5, 0); t.position.set(sw / 2, py + 70);
        contentContainer.addChild(t);
        makeBackBtn();
      });
      makeBtn("MAIN MENU", py + 250, 0xcc4444, () => {
        this._hidePauseMenu();
        this.destroy();
        window.dispatchEvent(new Event("tavernExit"));
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

    const c = new Container();
    const ov = new Graphics();
    ov.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.88 });
    ov.eventMode = "static"; c.addChild(ov);

    const won = this._state.totalWinnings > 0;
    const accent = won ? 0xffd700 : 0xff6644;
    const pw = 400, ph = 320, px = (this._sw - pw) / 2, py = (this._sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x1a1208, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 2, alpha: 0.5 });
    c.addChild(panel);

    const addText = (str: string, x: number, y: number, opts: Partial<TextStyle>, center = false) => {
      const t = new Text({ text: str, style: new TextStyle({ fontFamily: "Georgia, serif", ...opts } as any) });
      if (center) t.anchor.set(0.5, 0); t.position.set(x, y); c.addChild(t);
    };

    let y = py + 16;
    addText(won ? "\u{1F3BA} PROFITABLE NIGHT \u{1F3BA}" : "\u{1F3BA} TOUGH LUCK \u{1F3BA}", this._sw / 2, y, { fontSize: 20, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);

    // Unlock next opponent if won
    if (won && this._state.opponentIndex >= getUnlockedLevel()) {
      setUnlockedLevel(this._state.opponentIndex + 1);
      if (this._state.opponentIndex + 1 < OPPONENTS.length) {
        const next = OPPONENTS[this._state.opponentIndex + 1];
        addText(`\u{1F513} Unlocked: ${next.name} ${next.title}!`, this._sw / 2, y + 24, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    }
    // Save high score
    try {
      const prev = parseInt(localStorage.getItem("tavern_highscore") ?? "0") || 0;
      if (this._state.gold > prev) {
        localStorage.setItem("tavern_highscore", `${this._state.gold}`);
        addText("\u2605 NEW HIGH SCORE! \u2605", this._sw / 2, y + 24, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true);
      }
    } catch { /* ignore */ }
    y += 36;

    const stats: [string, string, number][] = [
      ["Opponent", `${this._state.opponent.name}`, this._state.opponent.color],
      ["Rounds Played", `${this._state.round}`, 0xccddcc],
      ["Wins", `${this._state.wins}`, 0x44cc44],
      ["Losses", `${this._state.losses}`, 0xff6644],
      ["Pushes", `${this._state.pushes}`, 0xcccccc],
      ["Best Streak", `${this._state.bestStreak}`, 0xffd700],
      ["Net Winnings", `${this._state.totalWinnings >= 0 ? "+" : ""}${this._state.totalWinnings}g`, this._state.totalWinnings >= 0 ? 0x44cc44 : 0xff6644],
      ["Final Gold", `${this._state.gold}g`, 0xffd700],
    ];

    for (const [label, value, color] of stats) {
      addText(label, px + 35, y, { fontSize: 10, fill: 0x887766 });
      const vt = new Text({ text: value, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: color, fontWeight: "bold" } as any) });
      vt.anchor.set(1, 0); vt.position.set(px + pw - 35, y); c.addChild(vt);
      y += 17;
    }

    y += 15;
    const retryBtn = new Graphics();
    retryBtn.roundRect(this._sw / 2 - 65, y, 130, 34, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    retryBtn.roundRect(this._sw / 2 - 65, y, 130, 34, 5).stroke({ color: accent, width: 2, alpha: 0.5 });
    retryBtn.eventMode = "static"; retryBtn.cursor = "pointer";
    retryBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); viewManager.removeFromLayer("ui", this._renderer.container);
      c.destroy({ children: true }); this._renderer.destroy();
      this._showOpponentSelect();
    });
    c.addChild(retryBtn);
    addText("PLAY AGAIN", this._sw / 2, y + 9, { fontSize: 11, fill: accent, fontWeight: "bold", letterSpacing: 2 }, true);

    y += 44;
    const menuBtn = new Graphics();
    menuBtn.roundRect(this._sw / 2 - 45, y, 90, 26, 4).fill({ color: 0x0a0a0a, alpha: 0.6 });
    menuBtn.roundRect(this._sw / 2 - 45, y, 90, 26, 4).stroke({ color: 0x666655, width: 1 });
    menuBtn.eventMode = "static"; menuBtn.cursor = "pointer";
    menuBtn.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", c); c.destroy({ children: true });
      this.destroy(); window.dispatchEvent(new Event("tavernExit"));
    });
    c.addChild(menuBtn);
    addText("MENU", this._sw / 2, y + 6, { fontSize: 9, fill: 0x888888 }, true);

    viewManager.addToLayer("ui", c);
  }
}
