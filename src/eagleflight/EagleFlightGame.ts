// ---------------------------------------------------------------------------
// Eagle Flight mode orchestrator
// Merlin rides a majestic eagle soaring over the medieval city of Camelot.
// Pure flight simulator — explore the castle, city, and countryside.
// Uses Three.js for 3D rendering with an HTML HUD overlay.
// ---------------------------------------------------------------------------

import { audioManager } from "@audio/AudioManager";
import { createEagleFlightState, EFBalance } from "./state/EagleFlightState";
import type { EagleFlightState } from "./state/EagleFlightState";
import { EagleFlightInputSystem } from "./systems/EagleFlightInputSystem";
import { EagleFlightRenderer } from "./view/EagleFlightRenderer";
import { EagleFlightHUD } from "./view/EagleFlightHUD";

const DT = EFBalance.SIM_TICK_MS / 1000;

// ---------------------------------------------------------------------------
// EagleFlightGame
// ---------------------------------------------------------------------------

export class EagleFlightGame {
  private _state!: EagleFlightState;
  private _rafId: number | null = null;
  private _simAccumulator = 0;
  private _lastTime = 0;

  private _renderer = new EagleFlightRenderer();
  private _hud = new EagleFlightHUD();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    audioManager.playGameMusic();

    const sw = window.innerWidth;
    const sh = window.innerHeight;

    this._state = createEagleFlightState(sw, sh);

    // Initialize Three.js renderer
    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    // Build HUD
    this._hud.build(sw, sh);

    // Input
    EagleFlightInputSystem.init(this._state);
    EagleFlightInputSystem.setPauseCallback((paused) => {
      if (paused) {
        this._state.paused = true;
        this._hud.showPauseMenu();
      } else {
        this._state.paused = false;
        this._hud.hidePauseMenu();
      }
    });

    // Pause menu callbacks
    this._hud.setPauseCallbacks(
      () => {
        // Resume
        this._state.paused = false;
        this._hud.hidePauseMenu();
      },
      () => {
        // Quit
        this._hud.hidePauseMenu();
        window.dispatchEvent(new Event("eagleFlightExit"));
      },
    );

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
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._state.screenW = sw;
    this._state.screenH = sh;

    // Fixed timestep simulation
    if (!this._state.paused) {
      this._simAccumulator += rawDt;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._state.gameTime += DT;
        this._state.dayPhase += DT * 0.005;

        EagleFlightInputSystem.update(this._state, DT);
      }
    }

    // Always render
    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state, rawDt);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    this._renderer.resize(sw, sh);
    this._hud.resize(sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    window.removeEventListener("resize", this._onResize);
    EagleFlightInputSystem.destroy();
    this._renderer.destroy();
    this._hud.destroy();
  }
}
