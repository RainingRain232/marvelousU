// Toast-style notification popups for important world events.
//
// Shows brief, prominent popups that slide in from the top-right and
// auto-dismiss after a few seconds. Used for research complete, city
// growth, enemy spotted, random events, etc.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOAST_W = 300;
const TOAST_H = 50;
const TOAST_GAP = 6;
const TOAST_DURATION = 4; // seconds before fade starts
const TOAST_FADE = 1; // seconds to fade out
const MAX_TOASTS = 5;

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: "bold",
  fill: 0xffffff,
});

const BODY_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xcccccc,
});

// ---------------------------------------------------------------------------
// Toast data
// ---------------------------------------------------------------------------

interface Toast {
  container: Container;
  elapsed: number;
}

// ---------------------------------------------------------------------------
// WorldNotification
// ---------------------------------------------------------------------------

export class WorldNotification {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _toasts: Toast[] = [];
  private _tickerCb: (() => void) | null = null;
  private _screenW = 800;

  init(vm: ViewManager): void {
    this._vm = vm;
    this._screenW = vm.screenWidth;
    vm.addToLayer("ui", this.container);

    vm.app.renderer.on("resize", (w: number) => {
      this._screenW = w;
      this._layoutToasts();
    });

    const cb = () => {
      const dt = vm.app.ticker.deltaMS / 1000;
      this._updateToasts(dt);
    };
    vm.app.ticker.add(cb);
    this._tickerCb = cb;
  }

  destroy(): void {
    if (this._tickerCb) this._vm.app.ticker.remove(this._tickerCb);
    this.container.removeFromParent();
    this.container.destroy({ children: true });
    this._toasts = [];
  }

  /** Show a toast notification. */
  show(title: string, body: string, color = 0x4466cc): void {
    const c = new Container();

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, TOAST_W, TOAST_H, 6);
    bg.fill({ color: 0x0a0a1a, alpha: 0.9 });
    bg.stroke({ color, width: 2 });
    c.addChild(bg);

    // Color accent bar
    const accent = new Graphics();
    accent.roundRect(0, 0, 4, TOAST_H, 2);
    accent.fill({ color });
    c.addChild(accent);

    // Title
    const titleText = new Text({ text: title, style: TITLE_STYLE });
    titleText.x = 12;
    titleText.y = 6;
    c.addChild(titleText);

    // Body
    const bodyText = new Text({ text: body, style: BODY_STYLE });
    bodyText.x = 12;
    bodyText.y = 26;
    c.addChild(bodyText);

    this.container.addChild(c);
    this._toasts.push({ container: c, elapsed: 0 });

    // Trim old toasts
    while (this._toasts.length > MAX_TOASTS) {
      const old = this._toasts.shift()!;
      old.container.removeFromParent();
      old.container.destroy({ children: true });
    }

    this._layoutToasts();
  }

  private _updateToasts(dt: number): void {
    for (let i = this._toasts.length - 1; i >= 0; i--) {
      const toast = this._toasts[i];
      toast.elapsed += dt;

      if (toast.elapsed > TOAST_DURATION) {
        const fadeProgress = (toast.elapsed - TOAST_DURATION) / TOAST_FADE;
        toast.container.alpha = Math.max(0, 1 - fadeProgress);

        if (fadeProgress >= 1) {
          toast.container.removeFromParent();
          toast.container.destroy({ children: true });
          this._toasts.splice(i, 1);
        }
      }
    }
  }

  private _layoutToasts(): void {
    let y = 60; // below the HUD top bar
    for (const toast of this._toasts) {
      toast.container.x = this._screenW - TOAST_W - 10;
      toast.container.y = y;
      y += TOAST_H + TOAST_GAP;
    }
  }
}

/** Singleton instance. */
export const worldNotification = new WorldNotification();
