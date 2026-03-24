// ---------------------------------------------------------------------------
// The Last Flame — Main Game Orchestrator
// A darkness-survival game where your light is your lifeline
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { LFPhase } from "./types";
import type { LFState } from "./types";
import { createLFState, loadLFMeta, saveLFMeta } from "./state/LastFlameState";
import {
  updatePlayer, updateFuel, tryFlare, updateShadows, updateOil,
  updateWave, updateTimers, updateParticles, updateFloatTexts,
  spawnDeathEffect, selectMutator, generateMutatorChoices, applyKindlingTrail, transitionRoom,
  checkMilestones, recordRun, spawnFloatText,
} from "./systems/LastFlameSystem";
import {
  playLFFlare, playLFCollect, playLFDeath, playLFWave,
  startLFDrone, stopLFDrone, updateLFAudio,
} from "./systems/LastFlameAudio";
import { LastFlameRenderer } from "./view/LastFlameRenderer";
import { LF } from "./config/LastFlameBalance";

export class LastFlameGame {
  private _state!: LFState;
  private _renderer = new LastFlameRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadLFMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private _prevOil = 0;
  private _prevWave = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadLFMeta();
    this._state = createLFState(sw, sh, this._meta);
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
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.repeat) return;
      const s = this._state;

      if (s.phase === LFPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === LFPhase.DEAD) {
        // Upgrade shop
        if (e.code >= "Digit1" && e.code <= "Digit7") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault();
          return;
        }
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") {
        s.phase = s.phase === LFPhase.PLAYING ? LFPhase.PAUSED : LFPhase.PLAYING;
        e.preventDefault(); return;
      }
      if (s.phase !== LFPhase.PLAYING) return;

      // Mutator choice during Respite
      if (s.choosingMutator) {
        if (e.code === "Digit1") { selectMutator(s, 0); playLFCollect(); e.preventDefault(); }
        else if (e.code === "Digit2") { selectMutator(s, 1); playLFCollect(); e.preventDefault(); }
        return;
      }

      // Only Space triggers flare — Shift is for sprint
      if (e.code === "Space") {
        if (tryFlare(s)) playLFFlare();
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

    if (s.phase === LFPhase.PLAYING) {
      this._prevOil = s.oilCollected;
      this._prevWave = s.wave;


      updatePlayer(s, dt, this._keys);
      const fuelDead = updateFuel(s, dt, this._keys);
      const shadowHit = updateShadows(s, dt);

      if (fuelDead || shadowHit) {
        s.deathCause = fuelDead ? "Fuel exhaustion" : `Shadow strike (Wave ${s.wave})`;
        s.phase = LFPhase.DYING;
        s.dyingTimer = LF.DYING_DURATION;
        spawnDeathEffect(s);
        playLFDeath();
        stopLFDrone();
      } else {
        updateOil(s, dt);
        updateWave(s, dt);
        updateTimers(s, dt);
        applyKindlingTrail(s, dt);

        // Room transition
        if (s.roomTransitionTimer > 0) {
          s.roomTransitionTimer -= dt;
          // Collapse light during first half
          if (s.roomTransitionTimer > 0.75) {
            s.lightRadius = Math.max(0, s.lightRadius - 300 * dt);
          }
          // At midpoint, regenerate room
          if (s.roomTransitionTimer <= 0.75 && s.roomTransitionTimer + dt > 0.75) {
            transitionRoom(s);
            playLFWave(); // audio cue for room transition
          }
          // Expand light during second half
          if (s.roomTransitionTimer <= 0.75 && s.roomTransitionTimer > 0) {
            // lightRadius will naturally restore from updateFuel on next frame
          }
        }
        this._audio(s);
        const nearestDist = s.shadows.reduce((min, sh) => {
          if (!sh.alive) return min;
          const d = Math.sqrt((sh.x - s.playerX) ** 2 + (sh.y - s.playerY) ** 2);
          return d < min ? d : min;
        }, 9999);
        const hasStalker = s.shadows.some(sh => sh.alive && sh.variant === "stalker");
        updateLFAudio(s.fuel, s.wave, nearestDist, hasStalker);
      }
    }

    // DYING phase — animate flame extinguishing, then transition to DEAD
    if (s.phase === LFPhase.DYING) {
      s.dyingTimer -= dt;
      // Collapse light radius to zero
      s.lightRadius = Math.max(0, s.lightRadius - (LF.LIGHT_RADIUS_MAX / LF.DYING_DURATION) * dt);
      s.fuel = Math.max(0, s.fuel - dt * 0.5);
      // Shadows rush inward
      for (const sh of s.shadows) {
        if (!sh.alive) continue;
        const dx = s.playerX - sh.x, dy = s.playerY - sh.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        sh.x += (dx / dist) * 80 * dt;
        sh.y += (dy / dist) * 80 * dt;
      }
      if (s.dyingTimer <= 0) {
        this._die();
      }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    if (s.phase !== LFPhase.PLAYING && s.phase !== LFPhase.DYING) s.time += dt;

    this._renderer.render(s, sw, sh, this._meta);
  }

  private _audio(s: LFState): void {
    if (s.oilCollected > this._prevOil) playLFCollect();
    if (s.wave > this._prevWave) playLFWave();
    // Note: shadow burns already trigger playLFFlare() via tryFlare, no extra sound needed
    // playLFHit is reserved for player taking damage
  }

  private _start(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadLFMeta();
    this._state = createLFState(sw, sh, this._meta);
    this._state.phase = LFPhase.PLAYING;
    this._prevOil = 0; this._prevWave = 0;
    // startingMutator upgrade: begin with a random mutator
    if ((this._meta.upgrades?.startingMutator ?? 0) > 0) {
      generateMutatorChoices(this._state);
      if (this._state.mutatorChoices.length > 0) {
        selectMutator(this._state, 0);
        this._state.roomTransitionTimer = 0; // don't trigger room transition on start
      }
    }
    startLFDrone();
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === LFPhase.DEAD) return;
    s.phase = LFPhase.DEAD;

    const meta = loadLFMeta();
    meta.gamesPlayed++;
    meta.totalShadowsBurned += s.shadowsBurned;
    meta.totalOilCollected += s.oilCollected;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.time > meta.bestTime) meta.bestTime = Math.floor(s.time);
    // Award embers
    const embers = Math.floor(score / 10) * LF.EMBERS_PER_10_SCORE;
    meta.embers += embers;
    // Record run history
    recordRun(meta, s);
    // Check milestones
    const newMilestones = checkMilestones(meta);
    for (const ms of newMilestones) {
      spawnFloatText(s, s.playerX, s.playerY + 30, `MILESTONE: ${ms}`, 0xffd700, 1.8);
    }
    saveLFMeta(meta);
    this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    if (!meta.upgrades) return;
    const keys = ["startFuel", "flareCooldown", "lightRecovery", "oilMagnet", "doubleFlare", "oilFrequency", "startingMutator"] as const;
    const key = keys[index];
    if (!key) return;
    const costTable = LF.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const level = meta.upgrades[key];
    if (level >= costs.length) return;
    const cost = costs[level];
    if (meta.embers < cost) return;
    meta.embers -= cost;
    meta.upgrades[key] = level + 1;
    saveLFMeta(meta);
    playLFCollect();
  }

  private _exit(): void { window.dispatchEvent(new Event("lastflameExit")); }
}
