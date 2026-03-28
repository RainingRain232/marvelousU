// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — main game orchestrator
// Descend into a sunken cathedral. Recover Excalibur. Survive the abyss.
// ---------------------------------------------------------------------------

import { LEVIATHAN } from "./config/LeviathanConfig";
import { createLeviathanState } from "./state/LeviathanState";
import type { LeviathanState } from "./state/LeviathanState";
import {
  updatePlayer, useAbilities, updateEnemies, updateProjectiles,
  updateRelicShards, updateSonarPings, updateParticles,
  updateDamageNumbers, updateNotifications, updateScreenEffects, updatePhase,
} from "./systems/LeviathanSystem";
import { LeviathanRenderer } from "./view/LeviathanRenderer";
import { LeviathanHUD } from "./view/LeviathanHUD";

const DT = LEVIATHAN.SIM_TICK_MS / 1000;

export class LeviathanGame {
  private _state!: LeviathanState;
  private _renderer = new LeviathanRenderer();
  private _hud = new LeviathanHUD();
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
  private _onRestartHandler: (() => void) | null = null;
  private _onResizeHandler: (() => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth, sh = window.innerHeight;
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createLeviathanState(sw, sh);
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);
    this._hud.build(() => this.destroy());
    this._registerInput();

    this._onRestartHandler = () => this._restart();
    window.addEventListener("leviathanRestart", this._onRestartHandler);
    this._onResizeHandler = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._renderer.resize(w, h);
      this._state.screenW = w; this._state.screenH = h;
    };
    window.addEventListener("resize", this._onResizeHandler);

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;
    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this._state.phase === "playing" && !this._state.paused) {
      const timeScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : 1;
      this._simAccumulator += rawDt * timeScale;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
      this._state.gameTime += rawDt;
    }

    // Release pointer lock on game over so player can click UI buttons
    if (this._state.phase === "game_over" && document.pointerLockElement) {
      document.exitPointerLock();
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const s = this._state;
    updatePlayer(s, dt);
    useAbilities(s);
    updateEnemies(s, dt);
    updateProjectiles(s, dt);
    updateRelicShards(s, dt);
    updateSonarPings(s, dt);
    updateParticles(s, dt);
    updateDamageNumbers(s, dt);
    updateNotifications(s, dt);
    updateScreenEffects(s, dt);
    updatePhase(s, dt);
    s.tick++;
  }

  private _registerInput(): void {
    const s = this._state;
    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      s.keys.add(key);
      if (key === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (s.phase === "playing") {
          if (s.upgradeMenuOpen) { s.upgradeMenuOpen = false; }
          else { s.paused = !s.paused; }
        }
      }
      if (key === "tab") {
        e.preventDefault();
        if (s.phase === "playing" && s.nearAltar && !s.escaping) {
          s.upgradeMenuOpen = !s.upgradeMenuOpen;
          if (s.upgradeMenuOpen && document.pointerLockElement) document.exitPointerLock();
        }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => { s.keys.delete(e.key.toLowerCase()); };
    this._onMouseMove = (e: MouseEvent) => {
      s.mouseX = e.clientX; s.mouseY = e.clientY;
      if (s.pointerLocked) { s.mouseDX += e.movementX; s.mouseDY += e.movementY; }
    };
    this._onMouseDown = (e: MouseEvent) => { if (e.button === 0) s.mouseDown = true; if (e.button === 2) s.rightMouseDown = true; };
    this._onMouseUp = (e: MouseEvent) => { if (e.button === 0) s.mouseDown = false; if (e.button === 2) s.rightMouseDown = false; };
    this._onContextMenu = (e: Event) => e.preventDefault();
    this._onClick = () => { if (s.phase === "playing") this._renderer.canvas.requestPointerLock(); };
    this._onPointerLockChange = () => { s.pointerLocked = document.pointerLockElement === this._renderer.canvas; };

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
    if (this._onRestartHandler) window.removeEventListener("leviathanRestart", this._onRestartHandler);
    if (this._onResizeHandler) window.removeEventListener("resize", this._onResizeHandler);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _restart(): void {
    const sw = this._state.screenW, sh = this._state.screenH;
    this._state = createLeviathanState(sw, sh);
    this._state.phase = "playing";
    this._simAccumulator = 0;
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("leviathanExit"));
  }
}
