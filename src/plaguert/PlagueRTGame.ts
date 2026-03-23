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
      } else if (state.phase === PlagueRTPhase.PAUSED) {
        this._exit();
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
    this.destroy();
    window.dispatchEvent(new Event("plagueRTExit"));
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
