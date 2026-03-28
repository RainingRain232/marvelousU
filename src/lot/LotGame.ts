// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — main game orchestrator
// Draw lots. Face fate. Survive the arena.
// ---------------------------------------------------------------------------

import { LOT } from "./config/LotConfig";
import { createLotState } from "./state/LotState";
import type { LotState, BuffType, UpgradeId } from "./state/LotState";
import {
  updatePlayer, updatePlayerAttacks, updateAbilities, updateEnemies, updateSpawnQueue,
  updateProjectiles, updateShockwaves,
  updateObstacles, updateTreasures, updateCurseArena, updateObstacleTimer,
  updateRunicExplosions, updatePillars, updateParticles,
  updatePhase, beginDrawPhase, rerollLot, selectBuff, purchaseUpgrade,
} from "./systems/LotSystem";
import { LotRenderer } from "./view/LotRenderer";
import { LotHUD } from "./view/LotHUD";

const DT = LOT.SIM_TICK_MS / 1000;

export class LotGame {
  private _state!: LotState;
  private _renderer = new LotRenderer();
  private _hud = new LotHUD();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onPointerLockChange: (() => void) | null = null;
  private _onStartHandler: (() => void) | null = null;
  private _onRerollHandler: (() => void) | null = null;
  private _onRestartHandler: (() => void) | null = null;
  private _onSelectBuffHandler: ((e: Event) => void) | null = null;
  private _onPurchaseUpgradeHandler: ((e: Event) => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createLotState(sw, sh);

    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    this._hud.build(() => this.destroy());

    this._registerInput();

    this._onStartHandler = () => this._startGame();
    this._onRerollHandler = () => rerollLot(this._state);
    this._onRestartHandler = () => this._restart();
    this._onSelectBuffHandler = (e: Event) => {
      const type = (e as CustomEvent).detail as BuffType;
      selectBuff(this._state, type);
    };
    this._onPurchaseUpgradeHandler = (e: Event) => {
      const id = (e as CustomEvent).detail as UpgradeId;
      purchaseUpgrade(this._state, id);
    };
    window.addEventListener("lotStartGame", this._onStartHandler);
    window.addEventListener("lotReroll", this._onRerollHandler);
    window.addEventListener("lotRestart", this._onRestartHandler);
    window.addEventListener("lotSelectBuff", this._onSelectBuffHandler);
    window.addEventListener("lotPurchaseUpgrade", this._onPurchaseUpgradeHandler);

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _startGame(): void {
    beginDrawPhase(this._state);
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this._state.phase !== "menu" && this._state.phase !== "game_over" && !this._state.paused) {
      const timeScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : this._state.slowMotionScale;
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
    const state = this._state;
    updatePlayer(state, dt);
    updatePlayerAttacks(state, dt);
    updateAbilities(state, dt);
    updateEnemies(state, dt);
    updateSpawnQueue(state, dt);
    updateProjectiles(state, dt);
    updateShockwaves(state, dt);
    updateObstacles(state, dt);
    updateTreasures(state, dt);
    updateCurseArena(state, dt);
    updateObstacleTimer(state, dt);
    updateRunicExplosions(state, dt);
    updatePillars(state, dt);
    updateParticles(state, dt);
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
        if (state.phase === "active" || state.phase === "intermission") {
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
      if (state.phase === "active" || state.phase === "intermission" || state.phase === "draw") {
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
    if (this._onStartHandler) window.removeEventListener("lotStartGame", this._onStartHandler);
    if (this._onRerollHandler) window.removeEventListener("lotReroll", this._onRerollHandler);
    if (this._onRestartHandler) window.removeEventListener("lotRestart", this._onRestartHandler);
    if (this._onSelectBuffHandler) window.removeEventListener("lotSelectBuff", this._onSelectBuffHandler);
    if (this._onPurchaseUpgradeHandler) window.removeEventListener("lotPurchaseUpgrade", this._onPurchaseUpgradeHandler);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _restart(): void {
    const sw = this._state.screenW, sh = this._state.screenH;
    const bestRound = Math.max(this._state.bestRound, this._state.round);
    this._state = createLotState(sw, sh);
    this._state.bestRound = bestRound;
    beginDrawPhase(this._state);
    this._simAccumulator = 0;
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("lotExit"));
  }
}
