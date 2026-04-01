// ---------------------------------------------------------------------------
// Owls: Night Hunter — main game orchestrator
// Soar as a great horned owl through an enchanted moonlit forest at night.
// Dive, swoop, and hunt prey under the stars.
// ---------------------------------------------------------------------------

import { OWL } from "./config/OwlsConfig";
import { createOwlsState } from "./state/OwlsState";
import type { OwlsState } from "./state/OwlsState";
import {
  updateOwl, useAbilities, updatePrey, checkCatches,
  updateFireflies, updateAmbientLeaves, updateParticles, updateScorePopups,
  updateNotifications, updateShootingStars, updatePhase, updateOrbs,
  updateAlertPulses, updateCameraShake, updateHitStop, updateScreenEffects,
  updateDawnProgress, checkTreeCollisions, startHunting,
} from "./systems/OwlsSystem";
import { OwlsRenderer } from "./view/OwlsRenderer";
import { OwlsHUD } from "./view/OwlsHUD";

const DT = OWL.SIM_TICK_MS / 1000;

export class OwlsGame {
  private _state!: OwlsState;
  private _renderer = new OwlsRenderer();
  private _hud = new OwlsHUD();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;
  private _bestWave = 0;

  // Event handlers
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onPointerLockChange: (() => void) | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onStartHunt: (() => void) | null = null;
  private _onRestart: (() => void) | null = null;
  private _onBackToMenu: (() => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createOwlsState(sw, sh);
    this._state.bestWave = this._bestWave;

    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    this._hud.build(() => this.destroy());

    this._registerInput();
    this._registerGameEvents();

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    this._state.gameTime += rawDt;

    // Update hit stop (runs at real time, not sim time)
    updateHitStop(this._state, rawDt);
    updateCameraShake(this._state, rawDt);
    updateScreenEffects(this._state, rawDt);

    if (this._state.phase === "hunting" && !this._state.paused) {
      // Hit stop slows sim time
      const timeScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : 1;
      this._simAccumulator += rawDt * timeScale;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
    } else if (this._state.phase === "rest") {
      this._state.nightTimer -= rawDt;
      if (this._state.nightTimer <= 0) {
        startHunting(this._state);
      }
      // Still update ambient systems during rest
      updateFireflies(this._state, rawDt);
      updateAmbientLeaves(this._state, rawDt);
      updateShootingStars(this._state, rawDt);
    } else if (this._state.phase === "menu") {
      // Ambient updates for menu scene
      updateFireflies(this._state, rawDt);
      updateAmbientLeaves(this._state, rawDt);
      updateShootingStars(this._state, rawDt);
    }

    // Dawn progress during game over (sky keeps lightening)
    if (this._state.phase === "game_over") {
      updateDawnProgress(this._state);
    }

    if (this._state.phase !== "hunting" && document.pointerLockElement) {
      document.exitPointerLock();
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const state = this._state;

    updateOwl(state, dt);
    useAbilities(state);
    updatePrey(state, dt);
    checkCatches(state);
    checkTreeCollisions(state);
    updateOrbs(state, dt);
    updateAlertPulses(state, dt);
    updateFireflies(state, dt);
    updateAmbientLeaves(state, dt);
    updateParticles(state, dt);
    updateScorePopups(state, dt);
    updateNotifications(state, dt);
    updateShootingStars(state, dt);
    updateDawnProgress(state);
    updatePhase(state, dt);

    state.tick++;
  }

  private _registerInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this._state.keys.add(key === " " ? " " : key);
      if (key === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (this._state.phase === "hunting") {
          this._state.paused = !this._state.paused;
        }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this._state.keys.delete(key === " " ? " " : key);
    };
    this._onMouseMove = (e: MouseEvent) => {
      this._state.mouseX = e.clientX;
      this._state.mouseY = e.clientY;
      if (this._state.pointerLocked) {
        this._state.mouseDX += e.movementX;
        this._state.mouseDY += e.movementY;
      }
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this._state.mouseDown = true;
      if (e.button === 2) this._state.rightMouseDown = true;
    };
    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this._state.mouseDown = false;
      if (e.button === 2) this._state.rightMouseDown = false;
    };
    this._onContextMenu = (e: Event) => e.preventDefault();
    this._onClick = () => {
      if (this._state.phase === "hunting" && this._state.gameTime > 0.5) {
        this._renderer.canvas.requestPointerLock();
      }
    };
    this._onPointerLockChange = () => {
      this._state.pointerLocked = document.pointerLockElement === this._renderer.canvas;
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

  private _registerGameEvents(): void {
    this._onStartHunt = () => {
      if (this._state.phase === "menu" || this._state.phase === "rest") {
        startHunting(this._state);
      }
    };
    this._onRestart = () => {
      this._bestWave = Math.max(this._bestWave, this._state.bestWave, this._state.wave);
      const sw = this._state.screenW, sh = this._state.screenH;
      this._state = createOwlsState(sw, sh);
      this._state.bestWave = this._bestWave;
      this._simAccumulator = 0;
    };
    this._onBackToMenu = () => {
      this._bestWave = Math.max(this._bestWave, this._state.bestWave, this._state.wave);
      const sw = this._state.screenW, sh = this._state.screenH;
      this._state = createOwlsState(sw, sh);
      this._state.bestWave = this._bestWave;
      this._state.phase = "menu";
      this._simAccumulator = 0;
    };

    window.addEventListener("owlsStartHunt", this._onStartHunt);
    window.addEventListener("owlsRestart", this._onRestart);
    window.addEventListener("owlsBackToMenu", this._onBackToMenu);
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
    if (this._onStartHunt) window.removeEventListener("owlsStartHunt", this._onStartHunt);
    if (this._onRestart) window.removeEventListener("owlsRestart", this._onRestart);
    if (this._onBackToMenu) window.removeEventListener("owlsBackToMenu", this._onBackToMenu);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("owlsExit"));
  }
}
