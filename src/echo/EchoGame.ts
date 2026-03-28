// ---------------------------------------------------------------------------
// Echo — Main Game Orchestrator
// Time-loop arena: record actions, replay as ghosts
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { EchoPhase } from "./types";
import type { EchoState } from "./types";
import { createEchoState, loadEchoMeta, saveEchoMeta } from "./state/EchoState";
import {
  movePlayer, setAim, playerShoot, recordFrame,
  updateGhosts, updateLoop, startNextLoop, applyLoopUpgrade, tryTimeStop,
  updateEnemies, updateBullets,
  updateTimers, updateParticles, updateFloatingTexts,
} from "./systems/EchoGameSystem";
import {
  playShoot, playDamage, playLoopComplete, playLoopStart, playDeath, playVictory,
} from "./systems/EchoAudio";
import { EchoRenderer } from "./view/EchoRenderer";
import { ECHO_BALANCE as B } from "./config/EchoBalance";

export class EchoGame {
  private _state!: EchoState;
  private _renderer = new EchoRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadEchoMeta();
  private _kdh: ((e: KeyboardEvent) => void) | null = null;
  private _kuh: ((e: KeyboardEvent) => void) | null = null;
  private _keys = new Set<string>();
  private _prevHp = 0;
  private _prevLoop = 0;
  private _recordAccum = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadEchoMeta();
    this._state = createEchoState(sw, sh, this._meta);
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
    this._kdh = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      const s = this._state;
      if (s.phase === EchoPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === EchoPhase.DEAD || s.phase === EchoPhase.VICTORY) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === EchoPhase.LOOP_COMPLETE) {
        // Upgrade selection
        if (e.code >= "Digit1" && e.code <= "Digit6") {
          applyLoopUpgrade(s, parseInt(e.code.charAt(5)) - 1);
          startNextLoop(s); playLoopStart();
          e.preventDefault(); return;
        }
        if (e.code === "Space" || e.code === "Enter") { startNextLoop(s); playLoopStart(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      // Time stop (Q key, requires 3+ ghosts)
      if (e.code === "KeyQ" && s.phase === EchoPhase.RECORDING) {
        if (!tryTimeStop(s)) {
          // Feedback for why it failed
          if (s.ghosts.length < 3) {
            s.screenFlashColor = 0x4444ff; s.screenFlashTimer = 0.05;
          }
        }
        e.preventDefault(); return;
      }
      if (e.code === "Escape") {
        if (s.phase === EchoPhase.RECORDING) s.phase = EchoPhase.PAUSED;
        else if (s.phase === EchoPhase.PAUSED) s.phase = EchoPhase.RECORDING;
        e.preventDefault(); return;
      }
      // Q to quit from pause
      if (e.code === "KeyQ" && s.phase === EchoPhase.PAUSED) {
        this._exit(); e.preventDefault(); return;
      }
    };
    this._kuh = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    window.addEventListener("keydown", this._kdh);
    window.addEventListener("keyup", this._kuh);
  }

  private _destroyInput(): void {
    if (this._kdh) { window.removeEventListener("keydown", this._kdh); this._kdh = null; }
    if (this._kuh) { window.removeEventListener("keyup", this._kuh); this._kuh = null; }
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === EchoPhase.RECORDING) {
      // WASD movement
      let mx = 0, my = 0;
      if (this._keys.has("KeyW")) my -= 1;
      if (this._keys.has("KeyS")) my += 1;
      if (this._keys.has("KeyA")) mx -= 1;
      if (this._keys.has("KeyD")) mx += 1;
      movePlayer(s, mx, my, dt);

      // Arrow aiming
      let ax = 0, ay = 0;
      if (this._keys.has("ArrowUp")) ay -= 1;
      if (this._keys.has("ArrowDown")) ay += 1;
      if (this._keys.has("ArrowLeft")) ax -= 1;
      if (this._keys.has("ArrowRight")) ax += 1;
      if (ax !== 0 || ay !== 0) setAim(s, ax, ay);
      else if (mx !== 0 || my !== 0) setAim(s, mx, my);

      // Shooting (hold space for auto-fire)
      const isShooting = this._keys.has("Space");
      if (isShooting && playerShoot(s)) playShoot();

      // Record at fixed FPS
      this._recordAccum += dt;
      const frameInterval = 1 / B.RECORD_FPS;
      while (this._recordAccum >= frameInterval) {
        this._recordAccum -= frameInterval;
        recordFrame(s, isShooting && s.shootCooldown <= frameInterval);
      }

      // Ghost replay
      updateGhosts(s);

      this._prevHp = s.hp;
      this._prevLoop = s.loopNumber;
      updateLoop(s, dt);
      updateEnemies(s, dt);
      updateBullets(s, dt);

      if (s.hp < this._prevHp) playDamage();
      if (s.loopNumber > this._prevLoop) playLoopComplete();
    }

    if (s.phase === EchoPhase.DEAD && this._prevHp > 0) { playDeath(); this._saveMeta(); this._prevHp = 0; }
    if (s.phase === EchoPhase.VICTORY && this._prevLoop <= B.MAX_LOOPS) { playVictory(); this._saveMeta(); this._prevLoop = B.MAX_LOOPS + 1; }

    updateTimers(s, dt); updateParticles(s, dt); updateFloatingTexts(s, dt);
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadEchoMeta();
    this._state = createEchoState(sw, sh, this._meta);
    startNextLoop(this._state);
    this._prevHp = this._state.hp; this._prevLoop = 1; this._recordAccum = 0;
    playLoopStart();
  }

  private _saveMeta(): void {
    const s = this._state; const meta = loadEchoMeta();
    meta.gamesPlayed++;
    if (Math.floor(s.score) > meta.highScore) meta.highScore = Math.floor(s.score);
    if (s.loopNumber - 1 > meta.bestLoop) meta.bestLoop = s.loopNumber - 1;
    meta.totalKills += s.totalKills;
    saveEchoMeta(meta); this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("echoExit")); }
}
