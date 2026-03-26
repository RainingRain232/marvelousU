// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — main game orchestrator
// Tend an enchanted garden in the starlit void. Plant, grow, defend, harvest.
// ---------------------------------------------------------------------------

import { GUIN } from "./config/GuinevereConfig";
import { createGuinevereState } from "./state/GuinevereState";
import type { GuinevereState } from "./state/GuinevereState";
import {
  updatePlayer, useAbilities, updatePlants, updateEnemies, updateSpawnQueue,
  updateProjectiles, updateThornWalls, updateParticles, updateDamageNumbers,
  updateNotifications, updateDayNight, updateWaves, updatePhase, updateSynergies,
  updateSentinels, updateArtifacts, updateTelegraphs, updateWaveCountdown,
  startGame, purchaseUpgrade,
} from "./systems/GuinevereSystem";
import { GuinevereRenderer } from "./view/GuinevereRenderer";
import { GuinevereHUD } from "./view/GuinevereHUD";

const DT = GUIN.SIM_TICK_MS / 1000;

export class GuinevereGame {
  private _state!: GuinevereState;
  private _renderer = new GuinevereRenderer();
  private _hud = new GuinevereHUD();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;
  private _bestWave = 0;

  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onPointerLockChange: (() => void) | null = null;
  private _onStartHandler: (() => void) | null = null;
  private _onRestartHandler: (() => void) | null = null;
  private _onPurchaseUpgradeHandler: ((e: Event) => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createGuinevereState(sw, sh);
    this._state.bestWave = this._bestWave;

    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    this._hud.build(() => this.destroy());

    this._registerInput();

    this._onStartHandler = () => this._startGame();
    this._onRestartHandler = () => this._restart();
    this._onPurchaseUpgradeHandler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      purchaseUpgrade(this._state, id);
    };
    window.addEventListener("guinevereStartGame", this._onStartHandler);
    window.addEventListener("guinevereRestart", this._onRestartHandler);
    window.addEventListener("guineverePurchaseUpgrade", this._onPurchaseUpgradeHandler);

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _startGame(): void {
    startGame(this._state);
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this._state.phase !== "menu" && this._state.phase !== "game_over" && !this._state.paused) {
      const hitStopScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : 1;
      const slowMoScale = this._state.slowMotionTimer > 0 ? this._state.slowMotionScale : 1;
      const timeScale = Math.min(hitStopScale, slowMoScale);
      this._simAccumulator += rawDt * timeScale;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
      this._state.gameTime += rawDt;
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const state = this._state;
    updatePlayer(state, dt);
    useAbilities(state, dt);
    updatePlants(state, dt);
    updateSynergies(state, dt);
    updateSentinels(state, dt);
    updateEnemies(state, dt);
    updateSpawnQueue(state, dt);
    updateProjectiles(state, dt);
    updateThornWalls(state, dt);
    updateParticles(state, dt);
    updateDamageNumbers(state, dt);
    updateNotifications(state, dt);
    updateDayNight(state, dt);
    updateWaves(state, dt);
    updateArtifacts(state, dt);
    updateTelegraphs(state, dt);
    updateWaveCountdown(state, dt);
    updatePhase(state, dt);
    state.tick++;
  }

  private _registerInput(): void {
    const state = this._state;

    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      state.keys.add(key);
      if (key === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (state.phase !== "menu" && state.phase !== "game_over") {
          state.paused = !state.paused;
        }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => { state.keys.delete(e.key.toLowerCase()); };
    this._onMouseMove = (e: MouseEvent) => {
      state.mouseX = e.clientX; state.mouseY = e.clientY;
      if (state.pointerLocked) { state.mouseDX += e.movementX; state.mouseDY += e.movementY; }
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
      if (state.phase !== "menu" && state.phase !== "game_over") {
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
    if (this._onStartHandler) window.removeEventListener("guinevereStartGame", this._onStartHandler);
    if (this._onRestartHandler) window.removeEventListener("guinevereRestart", this._onRestartHandler);
    if (this._onPurchaseUpgradeHandler) window.removeEventListener("guineverePurchaseUpgrade", this._onPurchaseUpgradeHandler);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _restart(): void {
    this._bestWave = Math.max(this._bestWave, this._state.bestWave, this._state.wave);
    const sw = this._state.screenW, sh = this._state.screenH;
    this._state = createGuinevereState(sw, sh);
    this._state.bestWave = this._bestWave;
    startGame(this._state);
    this._simAccumulator = 0;
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("guinevereExit"));
  }
}
