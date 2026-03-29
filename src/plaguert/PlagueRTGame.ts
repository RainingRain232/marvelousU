// ---------------------------------------------------------------------------
// Plague Doctor RT — main orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";

import { PlagueRTPhase } from "./types";
import type { PlagueRTState } from "./types";
import { createPlagueRTState, loadPlagueRTMeta, savePlagueRTMeta, calculateScore } from "./state/PlagueRTState";
import { updatePlagueSpread } from "./systems/PlagueRTSpreadSystem";
import {
  updateDayNight, updateHerbSpawning, updateHerbPull,
  updateRatSpawning, updateRatMovement,
} from "./systems/PlagueRTEntitySystem";
import {
  updatePlayerMovement, updateHerbCollection, tryTreatHouse,
  updateTreatment, updateWellFeedback,
  craftRemedy, craftSmokeBomb, craftIncense, craftRatTrap,
  useSmokeBomb, useIncense, useRatTrap, useGarlic, useMandrake,
} from "./systems/PlagueRTInteractionSystem";
import { PlagueRTRenderer } from "./view/PlagueRTRenderer";

// ---------------------------------------------------------------------------
// Game class
// ---------------------------------------------------------------------------

export class PlagueRTGame {
  private _state!: PlagueRTState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new PlagueRTRenderer();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keys: Record<string, boolean> = {};
  private _sw = 0;
  private _sh = 0;
  private _metaSaved = false;
  private _pauseDiv: HTMLDivElement | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._sw = viewManager.screenWidth;
    this._sh = viewManager.screenHeight;

    this._state = createPlagueRTState();
    this._renderer.build(this._sw, this._sh);
    this._renderer.setCallbacks({
      start: () => this._startPlaying(),
      exit: () => this._exit(),
      resume: () => this._resume(),
    });

    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._metaSaved = false;

    this._tickerCb = (ticker: Ticker) => this._update(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    this._hidePauseOverlay();
    this._destroyInput();
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.clearWorld();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _initInput(): void {
    this._keys = {};

    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys[e.key] = true;
      this._handleKeyAction(e.key);
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys[e.key] = false;
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) {
      window.removeEventListener("keydown", this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler) {
      window.removeEventListener("keyup", this._keyUpHandler);
      this._keyUpHandler = null;
    }
    this._keys = {};
  }

  private _handleKeyAction(key: string): void {
    const state = this._state;

    // ESC — pause/menu
    if (key === "Escape") {
      if (state.phase === PlagueRTPhase.PLAYING) {
        state.phase = PlagueRTPhase.PAUSED;
        this._showPauseOverlay();
      } else if (state.phase === PlagueRTPhase.PAUSED) {
        this._hidePauseOverlay();
        this._resume();
      } else if (state.phase === PlagueRTPhase.MENU) {
        this._exit();
      }
      return;
    }

    if (state.phase === PlagueRTPhase.MENU || state.phase === PlagueRTPhase.WON || state.phase === PlagueRTPhase.LOST) {
      return;
    }

    if (state.phase === PlagueRTPhase.PAUSED) {
      return;
    }

    // Playing actions
    if (state.phase === PlagueRTPhase.PLAYING) {
      // Space — treat
      if (key === " ") tryTreatHouse(state);

      // 1-4 craft
      if (key === "1") craftRemedy(state);
      if (key === "2") craftSmokeBomb(state);
      if (key === "3") craftIncense(state);
      if (key === "4") craftRatTrap(state);

      // Q — smoke
      if (key === "q" || key === "Q") useSmokeBomb(state);
      // E — incense
      if (key === "e" || key === "E") useIncense(state);
      // R — trap
      if (key === "r" || key === "R") useRatTrap(state);
      // G — garlic
      if (key === "g" || key === "G") useGarlic(state);
      // M — mandrake
      if (key === "m" || key === "M") useMandrake(state);
    }
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  private _startPlaying(): void {
    this._state = createPlagueRTState();
    this._state.phase = PlagueRTPhase.PLAYING;
    this._metaSaved = false;
  }

  private _resume(): void {
    if (this._state.phase === PlagueRTPhase.PAUSED) {
      this._state.phase = PlagueRTPhase.PLAYING;
    }
  }

  private _exit(): void {
    this._hidePauseOverlay();
    this.destroy();
    window.dispatchEvent(new Event("plagueRTExit"));
  }

  private _showPauseOverlay(): void {
    if (this._pauseDiv) return;

    const div = document.createElement("div");
    div.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); z-index: 9999;
      display: flex; flex-direction: column; align-items: center;
      font-family: Georgia, serif; color: #ccaa55; overflow-y: auto;
    `;

    // Title
    const title = document.createElement("h1");
    title.textContent = "PAUSED";
    title.style.cssText = "margin: 24px 0 8px; font-size: 32px; letter-spacing: 6px; color: #ccaa55;";
    div.appendChild(title);

    // Tabs container
    const tabBar = document.createElement("div");
    tabBar.style.cssText = "display: flex; gap: 4px; margin: 8px 0 0;";
    div.appendChild(tabBar);

    const contentBox = document.createElement("div");
    contentBox.style.cssText = `
      width: 600px; max-width: 90vw; min-height: 300px;
      background: rgba(30,25,15,0.95); border: 1px solid #665533;
      border-radius: 0 0 8px 8px; padding: 20px 28px;
      font-size: 14px; line-height: 1.7; color: #bba977;
    `;
    div.appendChild(contentBox);

    const tabs = ["Controls", "Introduction", "Game Concepts"];
    const tabContents: Record<string, string> = {
      Controls: `
        <h3 style="color:#ccaa55;margin:0 0 12px">Controls</h3>
        <table style="width:100%;border-collapse:collapse;color:#bba977">
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88;width:100px"><b>W A S D</b></td><td>Move the Plague Doctor</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>Space</b></td><td>Treat nearest infected house</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>Q</b></td><td>Use Smoke Bomb (slows rats in area)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>E</b></td><td>Use Incense (protects nearby houses)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>R</b></td><td>Place Rat Trap</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>G</b></td><td>Use Garlic (repels rats)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>M</b></td><td>Use Mandrake (powerful blast cure)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>1</b></td><td>Craft Remedy (1 Lavender)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>2</b></td><td>Craft Smoke Bomb (1 Wormwood + 1 Garlic)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>3</b></td><td>Craft Incense (1 Lavender + 1 Wormwood)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>4</b></td><td>Craft Rat Trap (2 Garlic)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#ddcc88"><b>ESC</b></td><td>Pause / Resume</td></tr>
        </table>
      `,
      Introduction: `
        <h3 style="color:#ccaa55;margin:0 0 12px">Introduction</h3>
        <p>You are a <b style="color:#ddcc88">Plague Doctor</b>, roaming a medieval village in real time. The Black Death spreads from house to house, and only you can stop it.</p>
        <p>Move through the village, <b style="color:#ddcc88">collect herbs</b> that sprout from the ground, and use them to <b style="color:#ddcc88">treat infected houses</b> before the plague kills the villagers inside.</p>
        <p>As days pass, <b style="color:#ddcc88">rats</b> emerge in waves, spreading infection faster. Craft items from your herbs to fight back. Use the <b style="color:#ddcc88">Well</b> to passively heal nearby houses and the <b style="color:#ddcc88">Church</b> to slow plague spread.</p>
        <p>Survive the nights. Save as many villagers as you can. If too many are lost, the village falls.</p>
      `,
      "Game Concepts": `
        <h3 style="color:#ccaa55;margin:0 0 12px">Game Concepts</h3>
        <p><b style="color:#bb88ff">Lavender</b> &mdash; Common herb. Used in Remedies and Incense.</p>
        <p><b style="color:#88cc44">Wormwood</b> &mdash; Used in Smoke Bombs and Incense. Bitter but effective.</p>
        <p><b style="color:#eeeecc">Garlic</b> &mdash; Repels rats. Used in Smoke Bombs and Rat Traps.</p>
        <p><b style="color:#aa44dd">Mandrake</b> &mdash; Rare. Unleashes a powerful blast that cures nearby houses instantly.</p>
        <hr style="border-color:#44382a;margin:12px 0">
        <p><b style="color:#ddcc88">Day / Night Cycle</b> &mdash; Plague spreads faster at night. Herbs spawn during the day. Rat waves intensify over time.</p>
        <p><b style="color:#ddcc88">Infection</b> &mdash; Houses go from Healthy to Infected to Critical (70%+) to Dead. Treat them before it is too late. Infection spreads to neighboring houses.</p>
        <p><b style="color:#3366aa">Well</b> &mdash; Stand near the well to activate passive healing for nearby infected houses.</p>
        <p><b style="color:#aa9977">Church</b> &mdash; Slows plague spread within its radius.</p>
        <p><b style="color:#ff6644">Rats</b> &mdash; Spawn in waves, spreading infection. They swarm and get faster in groups. Kill them with traps or repel with garlic.</p>
      `,
    };

    let activeTab = "Controls";

    const renderTab = () => {
      contentBox.innerHTML = tabContents[activeTab];
      tabButtons.forEach((btn, i) => {
        btn.style.background = tabs[i] === activeTab ? "rgba(30,25,15,0.95)" : "rgba(20,18,10,0.6)";
        btn.style.borderBottom = tabs[i] === activeTab ? "1px solid rgba(30,25,15,0.95)" : "1px solid #665533";
        btn.style.color = tabs[i] === activeTab ? "#ccaa55" : "#887755";
      });
    };

    const tabButtons: HTMLButtonElement[] = [];
    for (const tab of tabs) {
      const btn = document.createElement("button");
      btn.textContent = tab;
      btn.style.cssText = `
        padding: 8px 20px; font-family: Georgia, serif; font-size: 13px;
        border: 1px solid #665533; border-bottom: none;
        border-radius: 6px 6px 0 0; cursor: pointer;
        background: rgba(20,18,10,0.6); color: #887755;
      `;
      btn.addEventListener("click", () => { activeTab = tab; renderTab(); });
      tabBar.appendChild(btn);
      tabButtons.push(btn);
    }
    renderTab();

    // Buttons row
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display: flex; gap: 16px; margin: 24px 0 32px;";
    div.appendChild(btnRow);

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "RESUME";
    resumeBtn.style.cssText = `
      padding: 10px 36px; font-family: Georgia, serif; font-size: 15px; font-weight: bold;
      background: #224422; color: #44ff44; border: 1px solid #44aa44;
      border-radius: 6px; cursor: pointer; letter-spacing: 2px;
    `;
    resumeBtn.addEventListener("click", () => { this._hidePauseOverlay(); this._resume(); });
    btnRow.appendChild(resumeBtn);

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "EXIT";
    exitBtn.style.cssText = `
      padding: 10px 36px; font-family: Georgia, serif; font-size: 15px; font-weight: bold;
      background: #1a0a0a; color: #ff6644; border: 1px solid #555544;
      border-radius: 6px; cursor: pointer; letter-spacing: 2px;
    `;
    exitBtn.addEventListener("click", () => { this._hidePauseOverlay(); this._exit(); });
    btnRow.appendChild(exitBtn);

    document.body.appendChild(div);
    this._pauseDiv = div;
  }

  private _hidePauseOverlay(): void {
    if (this._pauseDiv) {
      this._pauseDiv.remove();
      this._pauseDiv = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  private _update(dt: number): void {
    const state = this._state;

    // Clamp dt for tab-away
    const clampedDt = Math.min(dt, 0.1);

    switch (state.phase) {
      case PlagueRTPhase.MENU:
      case PlagueRTPhase.PAUSED:
        // Just render
        break;

      case PlagueRTPhase.PLAYING:
        state.time += clampedDt;
        // Update all systems in order
        updateDayNight(state, clampedDt);
        updatePlayerMovement(state, clampedDt, this._keys);
        updateHerbPull(state, clampedDt);
        updateHerbCollection(state);
        updateTreatment(state, clampedDt);
        updateWellFeedback(state);
        updateHerbSpawning(state, clampedDt);
        updateRatSpawning(state, clampedDt);
        updateRatMovement(state, clampedDt);
        updatePlagueSpread(state, clampedDt);
        break;

      case PlagueRTPhase.WON:
      case PlagueRTPhase.LOST:
        if (!this._metaSaved) {
          this._saveMeta();
          this._metaSaved = true;
        }
        break;
    }

    this._renderer.draw(state, this._sw, this._sh, clampedDt);
  }

  // ---------------------------------------------------------------------------
  // Meta persistence
  // ---------------------------------------------------------------------------

  private _saveMeta(): void {
    const state = this._state;
    const score = calculateScore(state);
    const meta = loadPlagueRTMeta();

    meta.totalGames++;
    if (score > meta.highScore) meta.highScore = score;
    if (state.player.villagersSaved > meta.bestSaved) meta.bestSaved = state.player.villagersSaved;
    if (state.day > meta.bestDay) meta.bestDay = state.day;
    meta.totalSaved += state.player.villagersSaved;
    if (state.player.bestStreak > meta.bestStreak) meta.bestStreak = state.player.bestStreak;

    savePlagueRTMeta(meta);
  }
}
