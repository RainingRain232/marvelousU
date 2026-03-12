// ---------------------------------------------------------------------------
// Panzer Dragoon mode orchestrator
// Arthur rides a great white eagle through the skies, wielding a magic wand
// against waves of enemies and colossal bosses.
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";
import { createDragoonState } from "./state/DragoonState";
import type { DragoonState } from "./state/DragoonState";
import { DragoonBalance } from "./config/DragoonConfig";
import { DragoonInputSystem } from "./systems/DragoonInputSystem";
import { DragoonWaveSystem } from "./systems/DragoonWaveSystem";
import { DragoonCombatSystem } from "./systems/DragoonCombatSystem";
import { DragoonRenderer } from "./view/DragoonRenderer";
import { DragoonFX } from "./view/DragoonFX";
import { DragoonHUD } from "./view/DragoonHUD";

const DT = DragoonBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// DragoonGame
// ---------------------------------------------------------------------------

export class DragoonGame {
  private _state!: DragoonState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  // View delegates
  private _renderer = new DragoonRenderer();
  private _fx = new DragoonFX();
  private _hud = new DragoonHUD();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._state = createDragoonState(sw, sh);

    // Renderer
    this._renderer.init(sw, sh);
    viewManager.addToLayer("units", this._renderer.worldLayer);

    // FX
    this._fx.init();
    viewManager.addToLayer("fx", this._fx.container);

    // HUD
    this._hud.build(sw, sh);
    viewManager.addToLayer("ui", this._hud.container);

    // Input
    DragoonInputSystem.init(this._state);
    DragoonInputSystem.setPauseCallback((paused) => {
      if (paused && !this._state.gameOver && !this._state.victory) {
        this._hud.showNotification("PAUSED", 0xcccccc, sw, sh);
      }
    });

    // Combat callbacks → FX
    DragoonCombatSystem.setExplosionCallback((x, y, radius, color) => {
      this._fx.pendingExplosions.push({ x, y, radius, color });
    });
    DragoonCombatSystem.setHitCallback((x, y, damage, isCrit) => {
      this._fx.pendingHits.push({ x, y, damage, isCrit });
    });
    DragoonCombatSystem.setPlayerHitCallback(() => {
      this._fx.shake(10, 0.3);
      this._fx.screenFlash(0xff0000, 0.2);
    });
    DragoonCombatSystem.setLightningCallback((x, y) => {
      this._fx.pendingLightning.push({ x, y });
    });

    // Music
    audioManager.switchTrack("battle");

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const state = this._state;

    // Update screen dims (in case of resize)
    state.screenW = sw;
    state.screenH = sh;

    // Game over / victory
    if (state.gameOver) {
      this._handleGameOver(sw, sh);
    }
    if (state.victory) {
      this._handleVictory(sw, sh);
    }

    // Boss wave warning
    if (!state.betweenWaves && state.bossActive) {
      // Already showing boss
    }

    // Fixed timestep simulation
    if (!state.paused && !state.gameOver && !state.victory) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        state.gameTime += DT;

        // Systems
        DragoonInputSystem.update(state, DT);
        DragoonWaveSystem.update(state, DT);
        DragoonCombatSystem.update(state, DT);

        // Sky scroll
        for (const layer of state.skyLayers) {
          layer.offset += layer.speed * DT;
        }
      }
    }

    // Render (always, even when paused)
    this._render(rawDt);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const state = this._state;
    const sw = state.screenW;
    const sh = state.screenH;

    // Render world
    this._renderer.render(state, dt);

    // FX
    this._fx.update(state, dt);

    // Apply camera shake
    this._renderer.worldLayer.position.set(this._fx.shakeX, this._fx.shakeY);

    // HUD
    this._hud.update(state, sw, sh, dt);
  }

  // ---------------------------------------------------------------------------
  // Game Over / Victory
  // ---------------------------------------------------------------------------

  private _gameOverShown = false;
  private _victoryShown = false;

  private _handleGameOver(sw: number, sh: number): void {
    if (this._gameOverShown) return;
    this._gameOverShown = true;
    audioManager.switchTrack("game_over");

    this._hud.showNotification("GAME OVER", 0xff4444, sw, sh);

    // Restart after delay
    setTimeout(() => {
      this._showRestartPrompt(sw, sh);
    }, 2000);
  }

  private _handleVictory(sw: number, sh: number): void {
    if (this._victoryShown) return;
    this._victoryShown = true;

    this._hud.showNotification("VICTORY!", 0xffd700, sw, sh);
    this._fx.screenFlash(0xffd700, 0.5);

    setTimeout(() => {
      this._hud.showNotification(`Final Score: ${this._state.player.score.toLocaleString()}`, 0xffffff, sw, sh);
    }, 1500);

    setTimeout(() => {
      this._showRestartPrompt(sw, sh);
    }, 3000);
  }

  private _showRestartPrompt(sw: number, sh: number): void {
    // Listen for any key to restart or Escape to exit
    const handler = (e: KeyboardEvent) => {
      window.removeEventListener("keydown", handler);
      if (e.code === "Escape") {
        window.dispatchEvent(new Event("dragoonExit"));
      } else {
        this._restart();
      }
    };
    window.addEventListener("keydown", handler);
    this._hud.showNotification("Press any key to retry / ESC to exit", 0xaaaaaa, sw, sh);
  }

  private _restart(): void {
    this._cleanup();
    this._gameOverShown = false;
    this._victoryShown = false;
    this.boot();
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    DragoonInputSystem.destroy();
    DragoonCombatSystem.setExplosionCallback(null);
    DragoonCombatSystem.setHitCallback(null);
    DragoonCombatSystem.setPlayerHitCallback(null);
    DragoonCombatSystem.setLightningCallback(null);
    DragoonWaveSystem.reset();

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.cleanup();
    this._fx.cleanup();
    this._hud.cleanup();
    viewManager.removeFromLayer("ui", this._hud.container);
    viewManager.removeFromLayer("fx", this._fx.container);
    viewManager.clearWorld();
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this._cleanup();
  }
}
