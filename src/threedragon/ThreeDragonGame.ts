// ---------------------------------------------------------------------------
// 3Dragon mode orchestrator
// Arthur rides a great white eagle through beautiful 3D skies,
// wielding a magic wand against waves of enemies and colossal bosses.
// Uses Three.js for 3D rendering with an HTML HUD overlay.
// ---------------------------------------------------------------------------

import { audioManager } from "@audio/AudioManager";
import { createThreeDragonState } from "./state/ThreeDragonState";
import type { ThreeDragonState } from "./state/ThreeDragonState";
import { TDBalance } from "./config/ThreeDragonConfig";
import { ThreeDragonInputSystem } from "./systems/ThreeDragonInputSystem";
import { ThreeDragonWaveSystem } from "./systems/ThreeDragonWaveSystem";
import { ThreeDragonCombatSystem } from "./systems/ThreeDragonCombatSystem";
import { ThreeDragonRenderer } from "./view/ThreeDragonRenderer";
import { ThreeDragonHUD } from "./view/ThreeDragonHUD";

const DT = TDBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// ThreeDragonGame
// ---------------------------------------------------------------------------

export class ThreeDragonGame {
  private _state!: ThreeDragonState;
  private _rafId: number | null = null;
  private _simAccumulator = 0;
  private _lastTime = 0;

  // View delegates
  private _renderer = new ThreeDragonRenderer();
  private _hud = new ThreeDragonHUD();

  // Camera shake state
  private _shakeTimer = 0;
  private _shakeMag = 0;

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    audioManager.playGameMusic();

    this._state = createThreeDragonState(sw, sh);

    // Initialize Three.js renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(sw, sh);

    // Input
    ThreeDragonInputSystem.init(this._state);
    ThreeDragonInputSystem.setPauseCallback((paused) => {
      if (paused && !this._state.gameOver && !this._state.victory) {
        this._hud.showNotification("PAUSED", "#cccccc");
      }
    });

    // Combat callbacks → 3D FX
    ThreeDragonCombatSystem.setExplosionCallback((x, y, z, radius, color) => {
      this._renderer.addExplosion(x, y, z, radius, color);
      this._shake(radius > 5 ? 0.8 : 0.3, 0.2);
    });
    ThreeDragonCombatSystem.setHitCallback((_x, _y, _z, _damage, _isCrit) => {
      // Hit effects handled by trail particles in renderer
    });
    ThreeDragonCombatSystem.setPlayerHitCallback(() => {
      this._shake(1.5, 0.3);
    });
    ThreeDragonCombatSystem.setLightningCallback((x, y, z) => {
      this._renderer.addLightning(x, y, z);
      this._shake(0.5, 0.15);
    });

    // Music
    audioManager.switchTrack("battle");

    // Handle window resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);

    // Start game loop
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Game Loop (uses requestAnimationFrame directly for Three.js)
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._state.screenW = sw;
    this._state.screenH = sh;

    // Game over / victory
    if (this._state.gameOver) {
      this._handleGameOver();
    }
    if (this._state.victory) {
      this._handleVictory();
    }

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.gameOver && !this._state.victory) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._state.gameTime += DT;
        this._state.dayPhase += DT * 0.01;

        ThreeDragonInputSystem.update(this._state, DT);
        ThreeDragonWaveSystem.update(this._state, DT);
        ThreeDragonCombatSystem.update(this._state, DT);
      }
    }

    // Render (always)
    this._render(rawDt);

    // Continue loop
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const state = this._state;

    // Apply camera shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const intensity = this._shakeTimer > 0 ? this._shakeMag * (this._shakeTimer / 0.2) : 0;
      this._renderer.shake(intensity, this._shakeTimer);
      if (this._shakeTimer <= 0) {
        this._shakeMag = 0;
      }
    }

    // Render 3D world
    this._renderer.render(state, dt);

    // Update HUD
    this._hud.update(state, state.screenW, state.screenH, dt);
  }

  private _shake(magnitude: number, duration: number): void {
    this._shakeMag = Math.max(this._shakeMag, magnitude);
    this._shakeTimer = Math.max(this._shakeTimer, duration);
  }

  // ---------------------------------------------------------------------------
  // Game Over / Victory
  // ---------------------------------------------------------------------------

  private _gameOverShown = false;
  private _victoryShown = false;

  private _handleGameOver(): void {
    if (this._gameOverShown) return;
    this._gameOverShown = true;
    audioManager.switchTrack("game_over");

    this._hud.showNotification("GAME OVER", "#ff4444");

    setTimeout(() => {
      this._showRestartPrompt();
    }, 2000);
  }

  private _handleVictory(): void {
    if (this._victoryShown) return;
    this._victoryShown = true;

    this._hud.showNotification("VICTORY!", "#ffd700");

    setTimeout(() => {
      this._hud.showNotification(
        `Final Score: ${this._state.player.score.toLocaleString()}`,
        "#ffffff",
      );
    }, 1500);

    setTimeout(() => {
      this._showRestartPrompt();
    }, 3000);
  }

  private _showRestartPrompt(): void {
    this._hud.showNotification("Press any key to retry / ESC to exit", "#aaaaaa");
    const handler = (e: KeyboardEvent) => {
      window.removeEventListener("keydown", handler);
      if (e.code === "Escape") {
        window.dispatchEvent(new Event("threeDragonExit"));
      } else {
        this._restart();
      }
    };
    window.addEventListener("keydown", handler);
  }

  private _restart(): void {
    this._cleanup();
    this._gameOverShown = false;
    this._victoryShown = false;
    this.boot();
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._renderer.resize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    ThreeDragonInputSystem.destroy();
    ThreeDragonCombatSystem.setExplosionCallback(null);
    ThreeDragonCombatSystem.setHitCallback(null);
    ThreeDragonCombatSystem.setPlayerHitCallback(null);
    ThreeDragonCombatSystem.setLightningCallback(null);
    ThreeDragonWaveSystem.reset();

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    window.removeEventListener("resize", this._onResize);

    this._renderer.cleanup();
    this._hud.cleanup();
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._cleanup();
  }
}
