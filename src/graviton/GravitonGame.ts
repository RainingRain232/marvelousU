// ---------------------------------------------------------------------------
// Graviton — Main Game Orchestrator
// Pull asteroids into orbit, fling them at enemies
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { GPhase } from "./types";
import type { GState } from "./types";
import { createGState, loadGMeta, saveGMeta } from "./state/GravitonState";
import {
  updatePlayer, updateBodies, tryFling, tryFlingPartial, updateEnemies,
  updateWave, updateTimers, updateParticles, updateFloatTexts,
  spawnDeathEffect, checkUnlocks, spawnFloatText, applyMutation, getMutationNames,
} from "./systems/GravitonSystem";
import { G } from "./config/GravitonBalance";
import {
  playGCapture, playGFling, playGKill, playGHit, playGDeath, playGWave,
  startGDrone, stopGDrone, updateGAudio,
} from "./systems/GravitonAudio";
import { GravitonRenderer } from "./view/GravitonRenderer";

export class GravitonGame {
  private _state!: GState;
  private _renderer = new GravitonRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadGMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _prevKills = 0; private _prevCaptures = 0; private _prevWave = 0; private _prevHp = 0;
  private _selectedMutation = "";

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadGMeta();
    this._state = createGState(sw, sh, this._meta);
    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._tickerCb = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._destroyInput(); this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.repeat) return;
      const s = this._state;
      if (s.phase === GPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        // Mutation selection with number keys
        else if (e.code >= "Digit1" && e.code <= "Digit4") {
          const idx = parseInt(e.code.charAt(5)) - 1;
          const mutations = getMutationNames();
          const unlocked = this._meta.unlocks || [];
          if (idx < mutations.length && unlocked.includes(mutations[idx].id)) {
            this._selectedMutation = this._selectedMutation === mutations[idx].id ? "" : mutations[idx].id;
          }
          e.preventDefault();
        }
        return;
      }
      if (s.phase === GPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") { s.phase = s.phase === GPhase.PLAYING ? GPhase.PAUSED : GPhase.PLAYING; e.preventDefault(); return; }
      if (s.phase !== GPhase.PLAYING) return;
      // Fling: Shift press starts hold timer
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        s.flingHeld = true; s.flingHoldTimer = 0;
        e.preventDefault();
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
      // Fling on Shift release — tap=snipe, hold=volley
      if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && this._state.flingHeld) {
        const s = this._state;
        s.flingHeld = false;
        if (s.phase === GPhase.PLAYING) {
          if (s.flingHoldTimer >= G.FLING_HOLD_THRESHOLD) {
            if (tryFling(s)) playGFling();
          } else {
            if (tryFlingPartial(s)) playGFling();
          }
        }
      }
    };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    this._keys.clear();
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === GPhase.PLAYING) {
      this._prevKills = s.enemiesKilled; this._prevCaptures = s.asteroidsCaptured;
      this._prevWave = s.wave; this._prevHp = s.hp;

      // Hitstop: skip gameplay for a few frames on multi-kill
      if (s.hitstopFrames > 0) {
        updateTimers(s, dt);
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      // Pull = holding space (only if energy available)
      s.pulling = this._keys.has("Space") && s.pullEnergy > 0;
      if (s.flingHeld) s.flingHoldTimer += dt;

      updatePlayer(s, dt, this._keys);
      updateBodies(s, dt);
      const died = updateEnemies(s, dt);

      if (died) { this._die(); }
      else {
        updateWave(s, dt);
        updateTimers(s, dt);
        // Audio
        if (s.enemiesKilled > this._prevKills) playGKill();
        if (s.asteroidsCaptured > this._prevCaptures) playGCapture();
        if (s.wave > this._prevWave) playGWave();
        if (s.hp < this._prevHp) { playGHit(); s.comboCount = 0; s.comboTimer = 0; } // reset combo on hit
        updateGAudio(s.pulling, s.orbitCount, s.wave, s.threatLevel, s.hp, s.maxHp);
      }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    if (s.phase !== GPhase.PLAYING) s.time += dt;
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _start(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadGMeta();
    this._state = createGState(sw, sh, this._meta);
    this._state.phase = GPhase.PLAYING;
    // Apply selected mutation
    if (this._selectedMutation) {
      this._state.activeMutation = this._selectedMutation;
      applyMutation(this._state);
    }
    this._prevKills = 0; this._prevCaptures = 0; this._prevWave = 0; this._prevHp = this._state.hp;
    startGDrone();
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === GPhase.DEAD) return;
    s.phase = GPhase.DEAD;
    spawnDeathEffect(s); playGDeath(); stopGDrone();
    const meta = loadGMeta();
    meta.gamesPlayed++; meta.totalKills += s.enemiesKilled;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    const newUnlocks = checkUnlocks(meta);
    for (const u of newUnlocks) spawnFloatText(s, s.arenaCX, s.arenaCY + 30, `UNLOCKED: ${u}`, 0xffd700, 2.0);
    saveGMeta(meta); this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("gravitonExit")); }
}
