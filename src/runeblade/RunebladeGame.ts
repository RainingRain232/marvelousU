// ---------------------------------------------------------------------------
// Runeblade — Main Game Orchestrator
// Rune-enchanted melee combat: chain combos with Fire, Ice, Lightning & Shadow
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { RBPhase } from "./types";
import type { RBState } from "./types";
import { createRBState, loadRBMeta, saveRBMeta, awardShards } from "./state/RunebladeState";
import { RB } from "./config/RunebladeBalance";
import {
  updatePlayer, tryAttack, tryDodge, updateSlashes, updateEnemies,
  updateProjectiles, updateFireTrails, updateLightningChains, updateWave,
  updateTimers, updateParticles, updateFloatTexts, switchToRune,
  spawnDeathEffect, tryUltimate, updateShockwaves,
  updateBoss, checkBossSlashHits, updateHazards, updatePickups,
} from "./systems/RunebladeSystem";
import { RunebladeRenderer } from "./view/RunebladeRenderer";

export class RunebladeGame {
  private _state!: RBState;
  private _renderer = new RunebladeRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadRBMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _pointerHandler: ((e: PointerEvent) => void) | null = null;
  private _clickHandler: ((e: PointerEvent) => void) | null = null;

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadRBMeta();
    this._state = createRBState(sw, sh, this._meta);
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
      if (s.phase === RBPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Death screen
      if (s.phase === RBPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        // Upgrade shop keys [1]-[5]
        else if (e.code === "Digit1") { this._buyUpgrade("maxHP", 3); e.preventDefault(); }
        else if (e.code === "Digit2") { this._buyUpgrade("attackSpeed", 3); e.preventDefault(); }
        else if (e.code === "Digit3") { this._buyUpgrade("dodgeCooldown", 3); e.preventDefault(); }
        else if (e.code === "Digit4") { this._buyUpgrade("runepower", 3); e.preventDefault(); }
        else if (e.code === "Digit5") { this._buyUpgrade("ultCharge", 2); e.preventDefault(); }
        return;
      }

      // Pause toggle
      if (e.code === "Escape") {
        s.phase = s.phase === RBPhase.PLAYING ? RBPhase.PAUSED : RBPhase.PLAYING;
        e.preventDefault();
        return;
      }

      if (s.phase !== RBPhase.PLAYING) return;

      // Dodge on Shift
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        tryDodge(s);
        e.preventDefault();
      }
      // Rune switching 1-4
      if (e.code === "Digit1") { switchToRune(s, "fire"); e.preventDefault(); }
      if (e.code === "Digit2") { switchToRune(s, "ice"); e.preventDefault(); }
      if (e.code === "Digit3") { switchToRune(s, "lightning"); e.preventDefault(); }
      if (e.code === "Digit4") { switchToRune(s, "shadow"); e.preventDefault(); }
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

    // Click to attack
    this._clickHandler = (_e: PointerEvent) => {
      const s = this._state;
      if (s && s.phase === RBPhase.PLAYING) {
        tryAttack(s);
      }
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    window.addEventListener("pointermove", this._pointerHandler);
    window.addEventListener("pointerdown", this._clickHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    if (this._pointerHandler) { window.removeEventListener("pointermove", this._pointerHandler); this._pointerHandler = null; }
    if (this._clickHandler) { window.removeEventListener("pointerdown", this._clickHandler); this._clickHandler = null; }
    this._keys.clear();
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === RBPhase.PLAYING) {
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

      // Perfect dodge slow time
      const effectiveDt = s.slowTimer > 0 ? dt * 0.3 : dt;

      updatePlayer(s, effectiveDt, this._keys);
      tryAttack(s); // continuous attack while holding
      updateSlashes(s, effectiveDt);
      checkBossSlashHits(s);
      const died = updateEnemies(s, effectiveDt);
      const hitByProj = updateProjectiles(s, effectiveDt);
      const hitByBoss = updateBoss(s, effectiveDt);
      const hitByHazard = updateHazards(s, effectiveDt);
      updateFireTrails(s, effectiveDt);
      updateLightningChains(s, effectiveDt);
      updateShockwaves(s, effectiveDt);
      updatePickups(s, effectiveDt);
      updateWave(s, effectiveDt);
      updateTimers(s, dt); // timers always run at real time

      if (died || hitByProj || hitByBoss || hitByHazard) { this._die(); }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    updateShockwaves(s, dt);
    if (s.phase !== RBPhase.PLAYING) s.time += dt;
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadRBMeta();
    this._state = createRBState(sw, sh, this._meta);
    this._state.phase = RBPhase.PLAYING;
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === RBPhase.DEAD) return;
    s.phase = RBPhase.DEAD;
    spawnDeathEffect(s);
    const meta = loadRBMeta();
    meta.gamesPlayed++;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    // Award rune shards based on score
    awardShards(meta, score);
    saveRBMeta(meta); this._meta = meta;
  }

  private _buyUpgrade(key: string, maxLevel: number): void {
    const meta = this._meta;
    if (!meta.upgrades) meta.upgrades = { maxHP: 0, attackSpeed: 0, dodgeCooldown: 0, runepower: 0, ultCharge: 0 };
    const upg = meta.upgrades as Record<string, number>;
    const level = upg[key] || 0;
    if (level >= maxLevel) return;
    const costs = (RB as Record<string, unknown>).UPGRADE_COSTS as Record<string, number[]>;
    const cost = costs[key]?.[level];
    if (cost === undefined || (meta.shards || 0) < cost) return;
    meta.shards -= cost;
    upg[key] = level + 1;
    saveRBMeta(meta);
    this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("runebladeExit")); }
}
