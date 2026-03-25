// ---------------------------------------------------------------------------
// Shapeshifter — Main Game Orchestrator
// Transform between Wolf, Eagle, and Bear forms mid-combat
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { SSPhase } from "./types";
import type { SSState } from "./types";
import { createSSState, loadSSMeta, saveSSMeta, awardSSShards } from "./state/ShapeshifterState";
import { SS } from "./config/ShapeshifterBalance";
import {
  updatePlayer, switchForm, tryAttack, tryAbility, tryUltimate,
  updateSlashes, updateEnemies, updateProjectiles, updateAllies,
  updateWave, updateTimers, updateParticles, updateFloatTexts,
  updateShockwaves, updatePickups, spawnDeathEffect,
  updateBoss, checkBossHits, updateHazards,
} from "./systems/ShapeshifterSystem";
import { ShapeshifterRenderer } from "./view/ShapeshifterRenderer";

export class ShapeshifterGame {
  private _state!: SSState;
  private _renderer = new ShapeshifterRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadSSMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: PointerEvent) => void) | null = null;
  private _clickHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerUpHandler: ((e: PointerEvent) => void) | null = null;
  private _contextMenuHandler: ((e: Event) => void) | null = null;
  private _leftMouseDown = false;

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadSSMeta();
    this._state = createSSState(sw, sh, this._meta);
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
      if (s.phase === SSPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Death screen
      if (s.phase === SSPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        // Upgrade shop keys [1]-[5]
        else if (e.code === "Digit1") { this._buyUpgrade("maxHP", 3); e.preventDefault(); }
        else if (e.code === "Digit2") { this._buyUpgrade("wolfPower", 3); e.preventDefault(); }
        else if (e.code === "Digit3") { this._buyUpgrade("eaglePower", 3); e.preventDefault(); }
        else if (e.code === "Digit4") { this._buyUpgrade("bearPower", 3); e.preventDefault(); }
        else if (e.code === "Digit5") { this._buyUpgrade("allyDuration", 2); e.preventDefault(); }
        return;
      }

      // Pause toggle
      if (e.code === "Escape") {
        s.phase = s.phase === SSPhase.PLAYING ? SSPhase.PAUSED : SSPhase.PLAYING;
        e.preventDefault();
        return;
      }

      if (s.phase !== SSPhase.PLAYING) return;

      // Form switching on Digit1/2/3
      if (e.code === "Digit1") { switchForm(s, "wolf"); e.preventDefault(); }
      if (e.code === "Digit2") { switchForm(s, "eagle"); e.preventDefault(); }
      if (e.code === "Digit3") { switchForm(s, "bear"); e.preventDefault(); }

      // Ability on Shift
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        tryAbility(s);
        e.preventDefault();
      }
      // Ultimate on Q
      if (e.code === "KeyQ") { tryUltimate(s); e.preventDefault(); }
      // Attack on Space
      if (e.code === "Space") { tryAttack(s); e.preventDefault(); }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
    };

    // Mouse: track pointer position for aim angle
    this._pointerHandler = (e: PointerEvent) => {
      const s = this._state;
      if (!s) return;
      const rect = viewManager.app.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      s.aimAngle = Math.atan2(my - s.playerY, mx - s.playerX);
    };

    // Left click: attack
    this._clickHandler = (e: PointerEvent) => {
      const s = this._state;
      if (!s || s.phase !== SSPhase.PLAYING) return;
      if (e.button === 0) {
        this._leftMouseDown = true;
        tryAttack(s);
      }
    };

    // Release: stop holding left mouse
    this._pointerUpHandler = (e: PointerEvent) => {
      if (e.button === 0) {
        this._leftMouseDown = false;
      }
    };

    // Prevent context menu on right click
    this._contextMenuHandler = (e: Event) => { e.preventDefault(); };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    window.addEventListener("pointermove", this._pointerHandler);
    window.addEventListener("pointerdown", this._clickHandler);
    window.addEventListener("pointerup", this._pointerUpHandler);
    window.addEventListener("contextmenu", this._contextMenuHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    if (this._pointerHandler) { window.removeEventListener("pointermove", this._pointerHandler); this._pointerHandler = null; }
    if (this._clickHandler) { window.removeEventListener("pointerdown", this._clickHandler); this._clickHandler = null; }
    if (this._pointerUpHandler) { window.removeEventListener("pointerup", this._pointerUpHandler); this._pointerUpHandler = null; }
    if (this._contextMenuHandler) { window.removeEventListener("contextmenu", this._contextMenuHandler); this._contextMenuHandler = null; }
    this._keys.clear();
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === SSPhase.PLAYING) {
      // Hitstop: skip gameplay for a few frames
      if (s.hitstopFrames > 0) {
        s.hitstopFrames--;
        updateTimers(s, dt);
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        updateShockwaves(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      updatePlayer(s, dt, this._keys);
      // Continuous attack while left mouse held
      if (this._leftMouseDown) {
        tryAttack(s);
      }
      updateSlashes(s, dt);
      checkBossHits(s);
      const diedFromBoss = updateBoss(s, dt);
      const diedFromEnemies = updateEnemies(s, dt);
      const diedFromProj = updateProjectiles(s, dt);
      const diedFromHazards = updateHazards(s, dt);
      updateAllies(s, dt);
      updateShockwaves(s, dt);
      updatePickups(s, dt);
      updateWave(s, dt);
      updateTimers(s, dt);

      if (diedFromEnemies || diedFromProj || diedFromBoss || diedFromHazards) { this._die(); }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    updateShockwaves(s, dt);
    if (s.phase !== SSPhase.PLAYING) s.time += dt;
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadSSMeta();
    this._state = createSSState(sw, sh, this._meta);
    this._state.phase = SSPhase.PLAYING;
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === SSPhase.DEAD) return;
    s.phase = SSPhase.DEAD;
    spawnDeathEffect(s, s.playerX, s.playerY, 0x885533);
    const meta = loadSSMeta();
    meta.gamesPlayed++;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    awardSSShards(meta, score);
    saveSSMeta(meta); this._meta = meta;
  }

  private _buyUpgrade(key: string, maxLevel: number): void {
    const meta = this._meta;
    if (!meta.upgrades) meta.upgrades = { maxHP: 0, wolfPower: 0, eaglePower: 0, bearPower: 0, allyDuration: 0 };
    const upg = meta.upgrades as Record<string, number>;
    const level = upg[key] || 0;
    if (level >= maxLevel) return;
    const costs = (SS as Record<string, unknown>).UPGRADE_COSTS as Record<string, number[]>;
    const cost = costs[key]?.[level];
    if (cost === undefined || (meta.shards || 0) < cost) return;
    meta.shards -= cost;
    upg[key] = level + 1;
    saveSSMeta(meta);
    this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("shapeshifterExit")); }
}
