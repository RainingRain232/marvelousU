// ---------------------------------------------------------------------------
// Voidwalker — Main Game Orchestrator
// Place void portals, teleport through space, devastate enemies with shadow magic
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { VWPhase } from "./types";
import type { VWState } from "./types";
import { createVWState, loadVWMeta, saveVWMeta, awardVWShards } from "./state/VoidwalkerState";
import { VW } from "./config/VoidwalkerBalance";
import {
  updatePlayer, tryShoot, tryPlacePortal, tryDash, tryPulse, tryStorm,
  updateProjectiles, updateEnemies, updatePortals,
  checkBossHits, updateBoss, updateWave, updateTimers,
  updateParticles, updateFloatTexts, updateShockwaves, updatePickups,
  updateHazards, spawnDeathEffect,
} from "./systems/VoidwalkerSystem";
import { VoidwalkerRenderer } from "./view/VoidwalkerRenderer";

export class VoidwalkerGame {
  private _state!: VWState;
  private _renderer = new VoidwalkerRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadVWMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerDownHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerUpHandler: ((e: PointerEvent) => void) | null = null;
  private _contextMenuHandler: ((e: Event) => void) | null = null;
  private _leftMouseDown = false;

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVWMeta();
    this._state = createVWState(sw, sh, this._meta);
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

      // Start screen
      if (s.phase === VWPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Death screen
      if (s.phase === VWPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        else if (e.code === "Digit1") { this._buyUpgrade("maxHP", 3); e.preventDefault(); }
        else if (e.code === "Digit2") { this._buyUpgrade("boltPower", 3); e.preventDefault(); }
        else if (e.code === "Digit3") { this._buyUpgrade("dashPower", 3); e.preventDefault(); }
        else if (e.code === "Digit4") { this._buyUpgrade("portalPower", 3); e.preventDefault(); }
        else if (e.code === "Digit5") { this._buyUpgrade("stormPower", 2); e.preventDefault(); }
        return;
      }

      // Pause toggle
      if (e.code === "Escape") {
        s.phase = s.phase === VWPhase.PLAYING ? VWPhase.PAUSED : VWPhase.PLAYING;
        e.preventDefault();
        return;
      }

      if (s.phase !== VWPhase.PLAYING) return;

      // Void Dash — Shift
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        tryDash(s);
        e.preventDefault();
      }
      // Void Pulse — Space
      if (e.code === "Space") { tryPulse(s); e.preventDefault(); }
      // Shadow Storm — Q
      if (e.code === "KeyQ") { tryStorm(s); e.preventDefault(); }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
    };

    // Mouse move: track aim angle
    this._pointerMoveHandler = (e: PointerEvent) => {
      const s = this._state;
      if (!s) return;
      const rect = viewManager.app.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      s.aimAngle = Math.atan2(my - s.playerY, mx - s.playerX);
    };

    // Mouse down: left = shoot, right = place portal
    this._pointerDownHandler = (e: PointerEvent) => {
      const s = this._state;
      if (!s) return;

      if (e.button === 0) {
        this._leftMouseDown = true;
        if (s.phase === VWPhase.PLAYING) tryShoot(s);
      } else if (e.button === 2) {
        if (s.phase === VWPhase.PLAYING) tryPlacePortal(s);
      }
    };

    // Mouse up: release left mouse hold
    this._pointerUpHandler = (e: PointerEvent) => {
      if (e.button === 0) {
        this._leftMouseDown = false;
      }
    };

    // Prevent context menu on right click
    this._contextMenuHandler = (e: Event) => { e.preventDefault(); };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    window.addEventListener("pointermove", this._pointerMoveHandler);
    window.addEventListener("pointerdown", this._pointerDownHandler);
    window.addEventListener("pointerup", this._pointerUpHandler);
    window.addEventListener("contextmenu", this._contextMenuHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    if (this._pointerMoveHandler) { window.removeEventListener("pointermove", this._pointerMoveHandler); this._pointerMoveHandler = null; }
    if (this._pointerDownHandler) { window.removeEventListener("pointerdown", this._pointerDownHandler); this._pointerDownHandler = null; }
    if (this._pointerUpHandler) { window.removeEventListener("pointerup", this._pointerUpHandler); this._pointerUpHandler = null; }
    if (this._contextMenuHandler) { window.removeEventListener("contextmenu", this._contextMenuHandler); this._contextMenuHandler = null; }
    this._keys.clear();
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === VWPhase.PLAYING) {
      // Hitstop: skip gameplay for hitstop frames
      if (s.hitstopFrames > 0) {
        s.hitstopFrames--;
        updateTimers(s, dt);
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        updateShockwaves(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      // Core gameplay loop
      updatePlayer(s, dt, this._keys);

      // Auto-fire shadow bolt while left mouse held
      if (this._leftMouseDown) {
        tryShoot(s);
      }

      updateProjectiles(s, dt);
      updateEnemies(s, dt);
      updatePortals(s, dt);
      checkBossHits(s);
      const diedFromBoss = updateBoss(s, dt);
      const diedFromEnemies = updateEnemies(s, dt);
      updatePickups(s, dt);
      const diedFromHazards = updateHazards(s, dt);
      updateWave(s, dt);
      updateTimers(s, dt);

      if (diedFromEnemies || diedFromBoss || diedFromHazards) { this._die(); }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    updateShockwaves(s, dt);
    if (s.phase !== VWPhase.PLAYING) s.time += dt;
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVWMeta();
    this._state = createVWState(sw, sh, this._meta);
    this._state.phase = VWPhase.PLAYING;
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === VWPhase.DEAD) return;
    s.phase = VWPhase.DEAD;
    spawnDeathEffect(s, s.playerX, s.playerY, s.playerRadius, VW.COLOR_VOID);
    const meta = loadVWMeta();
    meta.gamesPlayed++;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    awardVWShards(meta, score);
    saveVWMeta(meta); this._meta = meta;
  }

  private _buyUpgrade(key: string, maxLevel: number): void {
    const meta = this._meta;
    if (!meta.upgrades) meta.upgrades = { maxHP: 0, boltPower: 0, dashPower: 0, portalPower: 0, stormPower: 0 };
    const upg = meta.upgrades as Record<string, number>;
    const level = upg[key] || 0;
    if (level >= maxLevel) return;
    const costs = (VW as Record<string, unknown>).UPGRADE_COSTS as Record<string, number[]>;
    const cost = costs[key]?.[level];
    if (cost === undefined || (meta.shards || 0) < cost) return;
    meta.shards -= cost;
    upg[key] = level + 1;
    saveVWMeta(meta);
    this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("voidwalkerExit")); }
}
