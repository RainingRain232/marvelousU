// ---------------------------------------------------------------------------
// Flux — Main Game Orchestrator
// Gravity manipulation arena — no weapons, only physics
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { FluxPhase } from "./types";
import type { FluxState } from "./types";
import { createFluxState, loadFluxMeta, saveFluxMeta, calcVoidShards } from "./state/FluxState";
import {
  applyPlayerInput, applyGravityToPlayer, placeWell, slingshot, tryGravBomb, tryRepulsor,
  updateWaves, updateEnemies, updateProjectiles, updateWells, checkWellMerge,
  updateTimers, updateParticles, updateFloatingTexts, applyWaveUpgrade,
} from "./systems/FluxGameSystem";
import { FLUX_BALANCE as B } from "./config/FluxBalance";
import {
  playPlaceWell, playSlingshot, playDamage, playWaveClear, playDeath, playVictory, playRecharge,
  playCollision, playRedirect, playKill, playExplosion,
} from "./systems/FluxAudio";

function playRepulsor() {
  // Inline: reuse existing audio context pattern
  try {
    const c = new AudioContext();
    const o = c.createOscillator(); const g2 = c.createGain();
    o.type = "sine"; o.frequency.value = 300;
    g2.gain.setValueAtTime(0.1, c.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    o.connect(g2); g2.connect(c.destination); o.start(); o.stop(c.currentTime + 0.2);
    const o2 = c.createOscillator(); const g3 = c.createGain();
    o2.type = "triangle"; o2.frequency.value = 500;
    g3.gain.setValueAtTime(0.06, c.currentTime + 0.05);
    g3.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    o2.connect(g3); g3.connect(c.destination); o2.start(c.currentTime + 0.05); o2.stop(c.currentTime + 0.15);
  } catch { /* ignore */ }
}
import { FluxRenderer } from "./view/FluxRenderer";

export class FluxGame {
  private _state!: FluxState;
  private _renderer = new FluxRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadFluxMeta();
  private _kdh: ((e: KeyboardEvent) => void) | null = null;
  private _kuh: ((e: KeyboardEvent) => void) | null = null;
  private _keys = new Set<string>();
  private _prevHp = 0; private _prevWave = 0; private _prevCharges = 0;
  private _aimAngle = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld(); viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadFluxMeta();
    this._state = createFluxState(sw, sh, this._meta);
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
      if (s.phase === FluxPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === FluxPhase.DEAD || s.phase === FluxPhase.VICTORY) {
        if (e.code >= "Digit1" && e.code <= "Digit4") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault(); return;
        }
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      // Wave clear: pick upgrade (1-4)
      if (s.phase === FluxPhase.WAVE_CLEAR) {
        if (e.code >= "Digit1" && e.code <= "Digit4") {
          applyWaveUpgrade(s, parseInt(e.code.charAt(5)) - 1);
          e.preventDefault(); return;
        }
        return;
      }
      if (e.code === "Escape") {
        if (s.phase === FluxPhase.PLAYING) s.phase = FluxPhase.PAUSED;
        else if (s.phase === FluxPhase.PAUSED) s.phase = FluxPhase.PLAYING;
        e.preventDefault(); return;
      }
      if (s.phase !== FluxPhase.PLAYING) return;
      if (e.code === "Space") { if (placeWell(s, this._aimAngle)) playPlaceWell(); e.preventDefault(); return; }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") { if (slingshot(s)) playSlingshot(); e.preventDefault(); return; }
      if (e.code === "KeyR") { if (tryGravBomb(s)) playExplosion(); e.preventDefault(); return; }
      if (e.code === "KeyE") { if (tryRepulsor(s)) playRepulsor(); e.preventDefault(); return; }
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

    if (s.phase === FluxPhase.PLAYING) {
      // WASD = movement, Arrows = aiming (independent)
      let mx = 0, my = 0;
      if (this._keys.has("KeyW")) my -= 1;
      if (this._keys.has("KeyS")) my += 1;
      if (this._keys.has("KeyA")) mx -= 1;
      if (this._keys.has("KeyD")) mx += 1;

      // Arrows = aim (if no WASD, arrows also move)
      let ax = 0, ay = 0;
      if (this._keys.has("ArrowUp")) ay -= 1;
      if (this._keys.has("ArrowDown")) ay += 1;
      if (this._keys.has("ArrowLeft")) ax -= 1;
      if (this._keys.has("ArrowRight")) ax += 1;

      const hasWASD = mx !== 0 || my !== 0;
      const hasArrows = ax !== 0 || ay !== 0;

      if (hasWASD) {
        applyPlayerInput(s, mx, my, dt);
        if (hasArrows) {
          // WASD moves, arrows aim
          this._aimAngle = Math.atan2(ay, ax);
        } else {
          // WASD moves and aims
          this._aimAngle = Math.atan2(my, mx);
        }
      } else if (hasArrows) {
        // Arrows move and aim
        applyPlayerInput(s, ax, ay, dt);
        this._aimAngle = Math.atan2(ay, ax);
      } else {
        applyPlayerInput(s, 0, 0, dt); // apply friction
        // Auto-aim toward nearest enemy
        if (s.enemies.length > 0) {
          let nearest = s.enemies[0], nd = Infinity;
          for (const e of s.enemies) {
            if (!e.alive) continue;
            const d = Math.sqrt((e.x - s.px) ** 2 + (e.y - s.py) ** 2);
            if (d < nd) { nd = d; nearest = e; }
          }
          this._aimAngle = Math.atan2(nearest.y - s.py, nearest.x - s.px);
        }
      }
      s.aimAngle = this._aimAngle;

      // Clear frame event flags
      s.frameKills = 0; s.frameCollisions = 0; s.frameRedirects = 0; s.frameExplosions = 0;

      applyGravityToPlayer(s, dt);
      this._prevHp = s.hp; this._prevWave = s.wave; this._prevCharges = s.wellCharges;
      updateWaves(s, dt); updateEnemies(s, dt); updateProjectiles(s, dt); updateWells(s, dt);
      checkWellMerge(s);

      // Audio from frame events
      if (s.hp < this._prevHp) playDamage();
      if (s.wave > this._prevWave && s.wave > 1) playWaveClear();
      if (s.wellCharges > this._prevCharges) playRecharge();
      if (s.frameCollisions > 0) playCollision();
      if (s.frameRedirects > 0) playRedirect();
      if (s.frameKills > 0) playKill();
      if (s.frameExplosions > 0) playExplosion();
    }

    if (s.phase === FluxPhase.DEAD && this._prevHp > 0) { playDeath(); this._saveMeta(); this._prevHp = 0; }
    if (s.phase === FluxPhase.VICTORY) { playVictory(); this._saveMeta(); }

    updateTimers(s, dt); updateParticles(s, dt); updateFloatingTexts(s, dt);
    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadFluxMeta();
    this._state = createFluxState(sw, sh, this._meta);
    this._state.phase = FluxPhase.PLAYING;
    this._prevHp = this._state.hp; this._prevWave = 0; this._prevCharges = this._state.wellCharges;
  }

  private _saveMeta(): void {
    const s = this._state; const meta = loadFluxMeta();
    meta.gamesPlayed++;
    if (Math.floor(s.score) > meta.highScore) meta.highScore = Math.floor(s.score);
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    if (s.bestCombo > meta.bestCombo) meta.bestCombo = s.bestCombo;
    meta.totalKills += s.totalKills;
    meta.voidShards += calcVoidShards(s);
    saveFluxMeta(meta); this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    const keys = ["maxHp", "wellPower", "extraCharge", "bombCharge"] as const;
    const key = keys[index];
    if (!key) return;
    const costs = (B.UPGRADE_COSTS as Record<string, number[]>)[key];
    if (!costs) return;
    const lvl = (meta.upgrades as unknown as Record<string, number>)[key] || 0;
    if (lvl >= costs.length) return;
    if (meta.voidShards < costs[lvl]) return;
    meta.voidShards -= costs[lvl];
    (meta.upgrades as unknown as Record<string, number>)[key] = lvl + 1;
    saveFluxMeta(meta);
  }

  private _exit(): void { window.dispatchEvent(new Event("fluxExit")); }
}
