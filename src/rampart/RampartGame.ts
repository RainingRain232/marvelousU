// ---------------------------------------------------------------------------
// Rampart — 3D Castle Tower Defense
// Place towers to defend your castle against 25 waves of medieval invaders.
// ---------------------------------------------------------------------------

import { RAMPART, TOWER_DEFS, DIFFICULTIES } from "./config/RampartConfig";
import { createRampartState } from "./state/RampartState";
import type { RampartState } from "./state/RampartState";
import {
  placeTower, updateWaveTimer, updateEnemies,
  updateTowers, updateProjectiles, updateParticles, updateDamageNumbers,
  cleanupDead, startGame, startWave, sellTower, upgradeTower, cycleTowerTargetMode,
} from "./systems/RampartSystem";
import { RampartRenderer } from "./view/RampartRenderer";
import { RampartHUD } from "./view/RampartHUD";
import { RampartAudio } from "./audio/RampartAudio";

const DT = RAMPART.SIM_TICK_MS / 1000;

export class RampartGame {
  private _state!: RampartState;
  private _renderer = new RampartRenderer();
  private _hud = new RampartHUD();
  private _audio = new RampartAudio();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;

  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onWheel: ((e: WheelEvent) => void) | null = null;
  private _onResize: (() => void) | null = null;
  private _rightMouseDown = false;
  private _lastMouseX = 0;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // Hide pixi canvas
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createRampartState(sw, sh);

    // Init renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(() => this.destroy());
    this._hud.bindStart(() => {
      startGame(this._state);
      this._audio.start();
    });
    this._hud.bindSelectTower((id: string) => {
      this._state.selectedTower = id;
    });
    this._hud.bindToggleSpeed(() => {
      if (this._state.gameSpeed === 1) this._state.gameSpeed = 2;
      else if (this._state.gameSpeed === 2) this._state.gameSpeed = 3;
      else this._state.gameSpeed = 1;
    });
    this._hud.bindSellTower((towerId: number) => {
      sellTower(this._state, towerId);
    });
    this._hud.bindUpgradeTower((towerId: number) => {
      upgradeTower(this._state, towerId);
    });
    this._hud.bindResume(() => {
      this._state.paused = false;
    });
    this._hud.bindSetDifficulty((id: string) => {
      const diff = DIFFICULTIES.find(d => d.id === id);
      if (diff) this._state.difficulty = diff;
    });
    this._hud.bindProjector((x, y, z, sw, sh) => this._renderer.projectToScreen(x, y, z, sw, sh));

    this._registerInput();

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if ((this._state.phase === "prep" || this._state.phase === "wave") && !this._state.paused) {
      const scaledDt = rawDt * this._state.gameSpeed;
      this._simAccumulator += scaledDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
      this._state.gameTime += scaledDt;
    }

    // Consume audio flags
    if (this._state.audioShoot) { this._audio.playShoot(); this._state.audioShoot = false; }
    if (this._state.audioHit) { this._audio.playHit(); this._state.audioHit = false; }
    if (this._state.audioKill) { this._audio.playKill(); this._state.audioKill = false; }
    if (this._state.audioWaveStart) { this._audio.playWaveStart(); this._state.audioWaveStart = false; }
    if (this._state.audioBuild) { this._audio.playBuild(); this._state.audioBuild = false; }
    if (this._state.audioCastleDamage) { this._audio.playCastleDamage(); this._state.audioCastleDamage = false; }
    if (this._state.audioSell) { this._audio.playSell(); this._state.audioSell = false; }
    if (this._state.audioUpgrade) { this._audio.playUpgrade(); this._state.audioUpgrade = false; }

    // Update hover from mouse position
    const hit = this._renderer.raycastGrid(this._state.mouseX, this._state.mouseY, this._state.sw, this._state.sh);
    if (hit) {
      this._state.hoverCol = hit.col;
      this._state.hoverRow = hit.row;
    } else {
      this._state.hoverCol = -1;
      this._state.hoverRow = -1;
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    updateWaveTimer(this._state, dt);
    updateTowers(this._state, dt);
    updateEnemies(this._state, dt);
    updateProjectiles(this._state, dt);
    updateParticles(this._state, dt);
    updateDamageNumbers(this._state, dt);
    cleanupDead(this._state);
    this._state.tick++;
  }

  private _registerInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this._state.keys.add(key);

      if (key === "escape") {
        if (this._state.phase === "prep" || this._state.phase === "wave") {
          this._state.paused = !this._state.paused;
        }
      }

      // Tower hotkeys 1-5
      const towerIds = Object.keys(TOWER_DEFS);
      const num = parseInt(key);
      if (num >= 1 && num <= towerIds.length) {
        this._state.selectedTower = towerIds[num - 1];
      }

      // Space to start next wave early
      if (key === " " && this._state.phase === "prep") {
        e.preventDefault();
        this._state.phase = "wave";
        startWave(this._state);
      }

      // U to upgrade selected placed tower
      if (key === "u" && this._state.selectedPlacedTower !== null) {
        upgradeTower(this._state, this._state.selectedPlacedTower);
      }

      // X to sell selected placed tower
      if (key === "x" && this._state.selectedPlacedTower !== null) {
        sellTower(this._state, this._state.selectedPlacedTower);
      }

      // T to cycle targeting mode on selected tower
      if (key === "t" && this._state.selectedPlacedTower !== null) {
        const tower = this._state.towers.find(t => t.id === this._state.selectedPlacedTower);
        if (tower) cycleTowerTargetMode(tower);
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._state.keys.delete(e.key.toLowerCase());
    };

    this._onMouseMove = (e: MouseEvent) => {
      this._state.mouseX = e.clientX;
      this._state.mouseY = e.clientY;

      // Right-drag to rotate camera
      if (this._rightMouseDown) {
        const dx = e.clientX - this._lastMouseX;
        this._state.camAngle += dx * RAMPART.CAM_ROTATE_SPEED;
      }
      this._lastMouseX = e.clientX;
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        this._state.mouseDown = true;
        if (this._state.phase === "prep" || this._state.phase === "wave") {
          if (this._state.hoverCol >= 0 && this._state.hoverRow >= 0) {
            const cell = this._state.grid[this._state.hoverRow]?.[this._state.hoverCol];
            if (cell === 2) {
              // Clicked on a tower — select it for inspection
              const tower = this._state.towers.find(
                t => t.col === this._state.hoverCol && t.row === this._state.hoverRow
              );
              if (tower) {
                this._state.selectedPlacedTower = tower.id;
              }
            } else if (cell === 0 && this._state.selectedTower) {
              // Place tower on empty buildable cell
              placeTower(this._state, this._state.selectedTower, this._state.hoverCol, this._state.hoverRow);
              this._state.selectedPlacedTower = null;
            } else {
              // Clicked on path/castle/spawn — deselect placed tower
              this._state.selectedPlacedTower = null;
            }
          } else {
            // Clicked outside grid — deselect
            this._state.selectedPlacedTower = null;
          }
        }
      }
      if (e.button === 2) {
        this._rightMouseDown = true;
        this._lastMouseX = e.clientX;
      }
    };

    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this._state.mouseDown = false;
      if (e.button === 2) this._rightMouseDown = false;
    };

    this._onContextMenu = (e: Event) => e.preventDefault();

    this._onWheel = (e: WheelEvent) => {
      this._state.camDistance += e.deltaY > 0 ? RAMPART.CAM_ZOOM_SPEED : -RAMPART.CAM_ZOOM_SPEED;
      this._state.camDistance = Math.max(RAMPART.CAM_MIN_DIST, Math.min(RAMPART.CAM_MAX_DIST, this._state.camDistance));
    };

    this._onResize = () => {
      this._state.sw = window.innerWidth;
      this._state.sh = window.innerHeight;
      this._renderer.resize(this._state.sw, this._state.sh);
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("contextmenu", this._onContextMenu);
    window.addEventListener("wheel", this._onWheel, { passive: true });
    window.addEventListener("resize", this._onResize);
  }

  private _unregisterInput(): void {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseDown) window.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
    if (this._onContextMenu) window.removeEventListener("contextmenu", this._onContextMenu);
    if (this._onWheel) window.removeEventListener("wheel", this._onWheel);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }

  destroy(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    this._audio.destroy();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("rampartExit"));
  }
}
