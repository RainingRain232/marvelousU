// ---------------------------------------------------------------------------
// Void Knight — Main Game Orchestrator (v2)
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { VKPhase } from "./types";
import type { VKState } from "./types";
import { createVKState, loadVKMeta, saveVKMeta } from "./state/VoidKnightState";
import {
  updatePlayer, tryDash, tryGrazeBurst, updateSpawners, updateProjectiles,
  updateOrbs, updateWave, updateTimers, updateMultiplier,
  updateParticles, updateFloatTexts, updateShockwaves, updateStreak,
  spawnWave, spawnDeathEffect, preparePerkChoice, selectPerk,
  checkUnlocks, spawnFloatText,
  startTutorial, updateTutorial,
} from "./systems/VoidKnightSystem";
import { VK } from "./config/VoidKnightBalance";
import {
  playVKDash, playVKCollect, playVKNearMiss, playVKHit, playVKDeath,
  playVKWave, playVKDashReady, playVKMultMilestone,
  startVKDrone, stopVKDrone, updateVKAudio,
} from "./systems/VoidKnightAudio";
import { VoidKnightRenderer } from "./view/VoidKnightRenderer";

export class VoidKnightGame {
  private _state!: VKState;
  private _renderer = new VoidKnightRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadVKMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private _prevNearMisses = 0;
  private _prevOrbCount = 0;
  private _prevWave = 0;
  private _prevShield = 0;
  private _prevDashCD = 0;
  private _prevMultFloor = 1;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVKMeta();
    this._state = createVKState(sw, sh, this._meta);
    this._renderer.build(sw, sh);
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
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.repeat) return;
      const s = this._state;

      if (s.phase === VKPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === VKPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      // Perk selection
      if (s.phase === VKPhase.UPGRADE) {
        if (e.code === "Digit1") { selectPerk(s, 0); playVKCollect(); e.preventDefault(); }
        else if (e.code === "Digit2") { selectPerk(s, 1); playVKCollect(); e.preventDefault(); }
        else if (e.code === "Digit3") { selectPerk(s, 2); playVKCollect(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") {
        s.phase = s.phase === VKPhase.PLAYING ? VKPhase.PAUSED : VKPhase.PLAYING;
        e.preventDefault(); return;
      }
      if (s.phase !== VKPhase.PLAYING) return;

      // Dash
      if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (tryDash(s, this._keys)) playVKDash();
        e.preventDefault();
      }
      // Graze burst
      if (e.code === "KeyE" || e.code === "KeyQ") {
        if (tryGrazeBurst(s)) playVKWave();
        e.preventDefault();
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => { this._keys.delete(e.code); };
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

    if (s.phase === VKPhase.PLAYING) {
      // Hitstop: skip gameplay but still render
      if (s.hitstopTimer > 0) {
        s.hitstopTimer -= dt;
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      // Death replay slow-motion
      if (s.deathSlowTimer > 0) {
        const slowDt = dt * VK.DEATH_SLOW_FACTOR;
        updatePlayer(s, slowDt, this._keys);
        updateProjectiles(s, slowDt);
        updateParticles(s, slowDt);
        updateFloatTexts(s, slowDt);
        updateShockwaves(s, slowDt);
        updateTimers(s, dt); // real dt for the death timer itself
        this._renderer.render(s, sw, sh, this._meta);
        if (s.deathSlowTimer <= 0) {
          this._die();
        }
        return;
      }

      // Tutorial
      if (s.tutorialStep > 0 && s.tutorialStep <= 3) {
        updatePlayer(s, dt, this._keys);
        updateProjectiles(s, dt);
        updateSpawners(s, dt);
        updateTutorial(s, dt);
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        updateTimers(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      this._prevNearMisses = s.nearMisses;
      this._prevOrbCount = s.orbsCollected;
      this._prevWave = s.wave;
      this._prevShield = s.shieldHits;
      this._prevDashCD = s.dashCooldown;
      this._prevMultFloor = Math.floor(s.multiplier);

      updatePlayer(s, dt, this._keys);
      const died = updateProjectiles(s, dt);

      if (died) {
        // Don't immediately die — enter death slow-mo first
        if (s.deathSlowTimer <= 0) {
          spawnDeathEffect(s);
          playVKDeath();
          // deathSlowTimer was set by triggerDeathReplay in updateProjectiles
          // If it somehow wasn't set, die immediately
          if (s.deathSlowTimer <= 0) this._die();
        }
      } else {
        updateSpawners(s, dt);
        updateOrbs(s, dt);
        updateWave(s, dt);
        updateMultiplier(s, dt);
        updateShockwaves(s, dt);
        updateStreak(s, dt);
        updateTimers(s, dt);
        this._audio(s);
        const hasBoss = s.spawners.some(sp => sp.alive && sp.isBoss);
        updateVKAudio(s.multiplier, s.projectiles.length, s.wave, hasBoss, s.slowTimer > 0);
        if (s.wavesCleared > 0 && s.wavesCleared % 2 === 0 && s.perkChoices.length === 0 && s.wave > this._prevWave) {
          preparePerkChoice(s);
        }
      }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    if (s.phase !== VKPhase.PLAYING) s.time += dt;

    this._renderer.render(s, sw, sh, this._meta);
  }

  private _audio(s: VKState): void {
    if (s.nearMisses > this._prevNearMisses) playVKNearMiss();
    if (s.orbsCollected > this._prevOrbCount) playVKCollect();
    if (s.wave > this._prevWave) playVKWave();
    if (s.shieldHits < this._prevShield && this._prevShield > 0) playVKHit();
    // Dash ready audio cue
    if (s.dashCooldown <= 0 && this._prevDashCD > 0) playVKDashReady();
    // Multiplier milestone audio
    const multFloor = Math.floor(s.multiplier);
    if (multFloor > this._prevMultFloor && multFloor >= 2) playVKMultMilestone(multFloor);
  }

  private _start(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVKMeta();
    this._state = createVKState(sw, sh, this._meta);
    this._state.phase = VKPhase.PLAYING;
    this._prevNearMisses = 0; this._prevOrbCount = 0; this._prevWave = 0; this._prevShield = 0;
    // Tutorial for first-time players
    if (this._meta.gamesPlayed === 0) {
      startTutorial(this._state);
    } else {
      spawnWave(this._state);
    }
    startVKDrone();
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === VKPhase.DEAD) return;
    s.phase = VKPhase.DEAD;
    spawnDeathEffect(s);
    playVKDeath();
    stopVKDrone();

    const meta = loadVKMeta();
    meta.gamesPlayed++;
    meta.totalNearMisses += s.nearMisses;
    meta.totalOrbsCollected += s.orbsCollected;
    meta.totalSpawnersDestroyed += s.spawnersDestroyed;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    if (s.peakMultiplier > meta.bestMultiplier) meta.bestMultiplier = s.peakMultiplier;
    // Check for new unlocks
    const newUnlocks = checkUnlocks(meta);
    for (const u of newUnlocks) {
      spawnFloatText(s, s.arenaCenterX, s.arenaCenterY + 40, `UNLOCKED: ${u}`, 0xffd700, 2.0);
    }
    saveVKMeta(meta);
    this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("voidknightExit")); }
}
