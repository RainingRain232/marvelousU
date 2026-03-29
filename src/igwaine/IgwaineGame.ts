// ---------------------------------------------------------------------------
// Igwaine — Main Game Orchestrator
// Solar knight arena survival: your power waxes and wanes with the sun
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";
import { IgwainePhase, Difficulty } from "./types";
import type { IgwaineState } from "./types";
import { createIgwaineState, loadIgwaineBest, saveIgwaineBest } from "./state/IgwaineState";
import {
  movePlayer, playerAttack, startCharge, updateCharge, fireChargedShot,
  tryDash, trySolarFlare, selectPerk,
  updateEnemies, updateProjectiles, updateShockwaves, updateEclipse, updateHazards,
  updateVirtuePickups, updateHpOrbs, updateTimers, updateParticles, updateWaveLogic, checkDeath,
} from "./systems/IgwaineSystem";
import { IgwaineRenderer } from "./view/IgwaineRenderer";
import { IGB } from "./config/IgwaineBalance";

export class IgwaineGame {
  private _state!: IgwaineState;
  private _renderer = new IgwaineRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keys = new Set<string>();
  private _arrowHeld = false;
  private _selectedDifficulty: Difficulty = Difficulty.NORMAL;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    audioManager.playGameMusic();
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const best = loadIgwaineBest();
    this._state = createIgwaineState(sw, sh, best.bestWave, best.bestScore);
    this._renderer.build();
    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._tickerCb = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._destroyInput();
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      const s = this._state;

      if (s.phase === IgwainePhase.START) {
        if (e.code === "Digit1") { this._selectedDifficulty = Difficulty.EASY; s.difficulty = Difficulty.EASY; e.preventDefault(); return; }
        if (e.code === "Digit2") { this._selectedDifficulty = Difficulty.NORMAL; s.difficulty = Difficulty.NORMAL; e.preventDefault(); return; }
        if (e.code === "Digit3") { this._selectedDifficulty = Difficulty.HARD; s.difficulty = Difficulty.HARD; e.preventDefault(); return; }
        if (e.code === "Enter" || e.code === "Space") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === IgwainePhase.DEAD) {
        if (e.code === "Enter" || e.code === "Space") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === IgwainePhase.PLAYING) {
        // Perk selection intercept
        if (s.perkChoice) {
          if (e.code === "Digit1" || e.code === "Numpad1") { selectPerk(s, 0); e.preventDefault(); return; }
          if (e.code === "Digit2" || e.code === "Numpad2") { selectPerk(s, 1); e.preventDefault(); return; }
          if (e.code === "Digit3" || e.code === "Numpad3") { selectPerk(s, 2); e.preventDefault(); return; }
          return; // block all other input during perk selection
        }
        if (e.code === "Escape") { s.phase = IgwainePhase.PAUSED; e.preventDefault(); return; }
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") { tryDash(s); e.preventDefault(); return; }
        if (e.code === "Space") { s.shielding = true; s.riposteWindow = IGB.RIPOSTE_WINDOW; e.preventDefault(); return; }
        if (e.code === "KeyR") { trySolarFlare(s); e.preventDefault(); return; }
        // Arrow key pressed — start charge timer
        if (e.code.startsWith("Arrow") && !this._arrowHeld) {
          this._arrowHeld = true;
          // Fire a normal shot immediately
          const adx = this._getAimX(), ady = this._getAimY();
          if (adx !== 0 || ady !== 0) playerAttack(s, adx, ady);
          // Begin charge tracking
          s.chargeTime = 0.01;
          startCharge(s, adx || 1, ady);
        }
      }
      if (s.phase === IgwainePhase.PAUSED) {
        if (e.code === "Escape") { s.phase = IgwainePhase.PLAYING; e.preventDefault(); }
        else if (e.code === "KeyQ") { this._exit(); e.preventDefault(); }
      }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
      const s = this._state;
      if (e.code === "Space" && s.phase === IgwainePhase.PLAYING) s.shielding = false;
      // Arrow released — fire charged shot if charged enough
      if (e.code.startsWith("Arrow") && this._arrowHeld) {
        if (!this._keys.has("ArrowUp") && !this._keys.has("ArrowDown") && !this._keys.has("ArrowLeft") && !this._keys.has("ArrowRight")) {
          this._arrowHeld = false;
          if (s.phase === IgwainePhase.PLAYING && s.chargeTime >= IGB.CHARGE_TIME_MIN) {
            fireChargedShot(s);
          }
          s.chargeTime = 0;
        }
      }
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _getAimX(): number {
    let x = 0;
    if (this._keys.has("ArrowLeft")) x -= 1;
    if (this._keys.has("ArrowRight")) x += 1;
    return x;
  }
  private _getAimY(): number {
    let y = 0;
    if (this._keys.has("ArrowUp")) y -= 1;
    if (this._keys.has("ArrowDown")) y += 1;
    return y;
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    this._keys.clear();
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const best = loadIgwaineBest();
    this._state = createIgwaineState(sw, sh, best.bestWave, best.bestScore, this._selectedDifficulty);
    this._state.phase = IgwainePhase.PLAYING;
    this._state.waveDelay = 0.5;
    this._arrowHeld = false;
  }

  private _exit(): void {
    window.dispatchEvent(new Event("igwaineExit"));
  }

  private _loop(dt: number): void {
    dt = Math.min(dt, 0.1);
    const s = this._state;

    if (s.phase === IgwainePhase.PLAYING) {
      // Apply slow-motion
      const effectiveDt = dt * (s.slowMoTimer > 0 ? s.slowMoFactor : 1);

      // Skip input during player stun (from Dark Knight bash)
      const stunned = s.stunTimer > 0;

      // Movement (WASD)
      if (!stunned && !s.perkChoice) {
        let mdx = 0, mdy = 0;
        if (this._keys.has("KeyW")) mdy = -1;
        if (this._keys.has("KeyS")) mdy = 1;
        if (this._keys.has("KeyA")) mdx = -1;
        if (this._keys.has("KeyD")) mdx = 1;
        movePlayer(s, mdx, mdy, effectiveDt);
      }

      // Continuous fire while arrow held
      if (!stunned) {
        const adx = this._getAimX(), ady = this._getAimY();
        if (this._arrowHeld && (adx !== 0 || ady !== 0)) {
          playerAttack(s, adx, ady);
          updateCharge(s, adx, ady, effectiveDt);
        }
      }

      updateTimers(s, effectiveDt);
      updateEclipse(s, effectiveDt);
      updateHazards(s, effectiveDt);
      updateEnemies(s, effectiveDt);
      updateProjectiles(s, effectiveDt);
      updateShockwaves(s, effectiveDt);
      updateVirtuePickups(s, effectiveDt);
      updateHpOrbs(s, effectiveDt);
      updateParticles(s, effectiveDt);
      updateWaveLogic(s, effectiveDt);

      if (checkDeath(s, effectiveDt)) {
        saveIgwaineBest(s.wave, s.score);
        const best = loadIgwaineBest();
        s.bestWave = best.bestWave;
        s.bestScore = best.bestScore;
      }
    }

    // Death animation still runs after hp hits 0
    if (s.deathTimer > 0 && s.phase === IgwainePhase.PLAYING) {
      const deathDt = dt * 0.2; // slow
      updateParticles(s, deathDt);
      s.deathTimer -= dt;
      s.screenShake = Math.max(0, s.screenShake - IGB.SHAKE_DECAY * dt);
      if (s.deathTimer <= 0) s.phase = IgwainePhase.DEAD;
    }

    this._renderer.render(s);
  }
}
