// ---------------------------------------------------------------------------
// Depths of Avalon — main game orchestrator
// Dive beneath the Lake of Avalon to recover the sunken relics of Camelot.
// ---------------------------------------------------------------------------

import { DEPTHS } from "./config/DepthsConfig";
import { createDepthsState } from "./state/DepthsState";
import type { DepthsState } from "./state/DepthsState";
import {
  updatePlayer, updateOxygen, updatePressure, playerAttack,
  tryDash, tryHarpoon, updateHarpoons, updateChargedAttack,
  updateEnemySpawning, updateBossSpawning, updateEnemies,
  updateAirBubbles, updateTreasures, updateParticles,
  spawnAmbientBubbles, updateDamageNumbers, updateNotifications,
  updateCombo, updateScreenShake, updateDamageIndicators,
  updateWhirlpools, updateSirenProjectiles, updateRelics, updateDrops, updateFishSchools,
  updateJellyfish, updateExcalibur, checkAchievements, updateScreenFlash,
  updateDeathAnimation, updateDepthMomentum, updateWaveEvents, checkDepthRecord, updateEndlessMode,
  updateDiveAbilities, applyCurseEffects, updateRelicSynergies, updateTutorial, updateEliteEffects,
  updatePhase, startDive, loadAchievements, saveProgress,
} from "./systems/DepthsSystem";
import { DepthsRenderer } from "./view/DepthsRenderer";
import { DepthsHUD } from "./view/DepthsHUD";
import { DepthsAudio } from "./audio/DepthsAudio";

const DT = DEPTHS.SIM_TICK_MS / 1000;

export class DepthsGame {
  private _state!: DepthsState;
  private _renderer = new DepthsRenderer();
  private _hud = new DepthsHUD();
  private _audio = new DepthsAudio();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onPointerLockChange: (() => void) | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createDepthsState(sw, sh);
    loadAchievements(this._state);

    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    this._renderer.buildWorldProps(this._state.worldProps);

    this._hud.build(() => this.destroy());
    this._hud.bindStartButton(
      () => {
        startDive(this._state);
        this._renderer.buildWorldProps(this._state.worldProps);
        this._renderer.canvas.requestPointerLock();
        this._audio.start();
      },
      () => {
        this._state.paused = false;
        this._renderer.canvas.requestPointerLock();
      },
      () => this._state,
    );

    this._registerInput();

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this._state.phase === "diving" && !this._state.paused) {
      const timeScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : 1;
      this._simAccumulator += rawDt * timeScale;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
      this._state.gameTime += rawDt;

      if (this._state.hitStopTimer > 0) {
        this._state.hitStopTimer -= rawDt;
      }
    }

    // Updates that run regardless of hit-stop
    updateDeathAnimation(this._state, rawDt);
    updateScreenShake(this._state, rawDt);
    updateScreenFlash(this._state, rawDt);

    // Audio: find nearest enemy distance
    let nearestDist = 999;
    for (const e of this._state.enemies) {
      if (!e.alive) continue;
      const dx = this._state.player.x - e.x;
      const dy = this._state.player.y - e.y;
      const dz = this._state.player.z - e.z;
      nearestDist = Math.min(nearestDist, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    const hpRatio = this._state.player.hp / this._state.player.maxHp;
    this._audio.update(this._state.currentDepth, nearestDist, rawDt, hpRatio);

    // Consume audio event flags
    if (this._state.audioHit) { this._audio.playHit(); this._state.audioHit = false; }
    if (this._state.audioCritHit) { this._audio.playCritHit(); this._state.audioCritHit = false; }
    if (this._state.audioCollect) { this._audio.playCollect(); this._state.audioCollect = false; }
    if (this._state.audioDash) { this._audio.playDash(); this._state.audioDash = false; }
    if (this._state.audioHarpoon) { this._audio.playHarpoon(); this._state.audioHarpoon = false; }
    if (this._state.audioChargeRelease) { this._audio.playChargeRelease(); this._state.audioChargeRelease = false; }
    if (this._state.audioBossSpawn) { this._audio.playBossSpawn(); this._state.audioBossSpawn = false; }
    if (this._state.audioRelic) { this._audio.playRelic(); this._state.audioRelic = false; }
    if (this._state.audioExcalibur) { this._audio.playExcalibur(); this._state.audioExcalibur = false; }
    if (this._state.audioZoneTransition) { this._audio.playZoneTransition(); this._state.audioZoneTransition = false; }

    // Release pointer lock on game over so player can click UI buttons
    if (this._state.phase === "game_over" && document.pointerLockElement) {
      document.exitPointerLock();
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const state = this._state;

    updatePlayer(state, dt);
    updateOxygen(state, dt);
    updatePressure(state, dt);
    tryDash(state);
    tryHarpoon(state);
    playerAttack(state);
    updateHarpoons(state, dt);
    updateEnemySpawning(state, dt);
    updateBossSpawning(state);
    updateEnemies(state, dt);
    updateAirBubbles(state, dt);
    updateTreasures(state, dt);
    updateParticles(state, dt);
    spawnAmbientBubbles(state, dt);
    updateDamageNumbers(state, dt);
    updateNotifications(state, dt);
    updateChargedAttack(state, dt);
    updateDrops(state, dt);
    updateWhirlpools(state, dt);
    updateSirenProjectiles(state, dt);
    updateRelics(state, dt);
    updateFishSchools(state, dt);
    updateJellyfish(state, dt);
    updateExcalibur(state, dt);
    updateDepthMomentum(state);
    updateWaveEvents(state, dt);
    checkDepthRecord(state);
    updateEndlessMode(state);
    updateDiveAbilities(state);
    applyCurseEffects(state);
    updateRelicSynergies(state);
    updateTutorial(state);
    updateEliteEffects(state, dt);
    updateCombo(state, dt);
    updateDamageIndicators(state, dt);
    checkAchievements(state);
    updatePhase(state);

    state.tick++;
  }

  private _registerInput(): void {
    const state = this._state;

    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      state.keys.add(key);
      if (key === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (state.phase === "diving") {
          state.paused = !state.paused;
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      state.keys.delete(e.key.toLowerCase());
    };

    this._onMouseMove = (e: MouseEvent) => {
      if (state.pointerLocked) {
        state.mouseDX += e.movementX;
        state.mouseDY += e.movementY;
      }
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) state.mouseDown = true;
      if (e.button === 2) state.rightMouseDown = true;
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) state.mouseDown = false;
      if (e.button === 2) state.rightMouseDown = false;
    };

    this._onContextMenu = (e: Event) => e.preventDefault();

    this._onClick = () => {
      if (state.phase === "diving") {
        this._renderer.canvas.requestPointerLock();
      }
    };

    this._onPointerLockChange = () => {
      state.pointerLocked = document.pointerLockElement === this._renderer.canvas;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("contextmenu", this._onContextMenu);
    this._renderer.canvas.addEventListener("click", this._onClick);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  private _unregisterInput(): void {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseDown) window.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
    if (this._onContextMenu) window.removeEventListener("contextmenu", this._onContextMenu);
    if (this._onClick) this._renderer.canvas.removeEventListener("click", this._onClick);
    if (this._onPointerLockChange) document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    saveProgress(this._state);
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    this._audio.destroy();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("depthsExit"));
  }
}
