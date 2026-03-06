// Fade-to-black screen transition overlay
import { Graphics } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

const FADE_HALF_MS = 300;

export class TransitionOverlay {
  private _graphic = new Graphics();
  private _vm: ViewManager;

  constructor(vm: ViewManager) {
    this._vm = vm;
  }

  /** Fade out to black, call onMidpoint, then fade back in. */
  transition(onMidpoint: () => void): void {
    const W = this._vm.screenWidth;
    const H = this._vm.screenHeight;

    this._graphic.rect(0, 0, W, H);
    this._graphic.fill({ color: 0x000000 });
    this._graphic.alpha = 0;
    this._vm.addToLayer("ui", this._graphic);

    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;

      if (elapsed < FADE_HALF_MS) {
        // Fading out (0 → 1)
        this._graphic.alpha = elapsed / FADE_HALF_MS;
        requestAnimationFrame(animate);
      } else if (elapsed < FADE_HALF_MS + 50) {
        // Hold at black briefly, execute midpoint
        this._graphic.alpha = 1;
        if (elapsed >= FADE_HALF_MS && elapsed < FADE_HALF_MS + 20) {
          onMidpoint();
        }
        requestAnimationFrame(animate);
      } else if (elapsed < FADE_HALF_MS * 2 + 50) {
        // Fading in (1 → 0)
        const fadeInElapsed = elapsed - FADE_HALF_MS - 50;
        this._graphic.alpha = 1 - fadeInElapsed / FADE_HALF_MS;
        requestAnimationFrame(animate);
      } else {
        // Done
        this._cleanup();
      }
    };

    requestAnimationFrame(animate);
  }

  private _cleanup(): void {
    this._vm.removeFromLayer("ui", this._graphic);
    this._graphic.destroy();
  }
}
