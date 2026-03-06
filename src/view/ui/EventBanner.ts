// EventBanner — displays a centered notification when a random event fires.
//
// Shows a styled panel (dark bg, gold border) in the center of the screen
// with the event title and description. Fades in quickly and fades out after
// a few seconds. Lives in the ui layer (no camera transform).

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const BANNER_W = 420;
const BANNER_H = 80;
const CORNER_R = 8;
const DISPLAY_DURATION = 4; // seconds before fade begins
const FADE_DURATION = 0.6; // seconds for the fade-out

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_DESC = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xdddddd,
  wordWrap: true,
  wordWrapWidth: BANNER_W - 24,
});

// ---------------------------------------------------------------------------
// EventBanner
// ---------------------------------------------------------------------------

export class EventBanner {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _titleText!: Text;
  private _descText!: Text;
  private _screenW = 800;
  private _screenH = 600;
  private _tween: gsap.core.Tween | null = null;
  private _unsubscribers: Array<() => void> = [];
  private _onResize: (() => void) | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this._screenW = vm.screenWidth;
    this._screenH = vm.screenHeight;

    this._build();
    vm.addToLayer("ui", this.container);

    // Hide by default
    this.container.visible = false;

    // Listen for events
    this._unsubscribers.push(
      EventBus.on("randomEvent", ({ title, description }) => {
        this._show(title, description);
      }),
    );

    // Reposition on resize
    this._onResize = () => {
      this._screenW = vm.screenWidth;
      this._screenH = vm.screenHeight;
      this._reposition();
    };
    vm.app.renderer.on("resize", this._onResize);
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this._tween) { this._tween.kill(); this._tween = null; }
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    this.container.destroy({ children: true });
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  private _build(): void {
    this._bg = new Graphics();
    this._drawBg(1);
    this.container.addChild(this._bg);

    // Icon / decorative star
    const star = new Text({ text: "★", style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700 }) });
    star.anchor.set(0, 0.5);
    star.position.set(14, BANNER_H / 2);
    this.container.addChild(star);

    this._titleText = new Text({ text: "", style: STYLE_TITLE });
    this._titleText.anchor.set(0, 0);
    this._titleText.position.set(38, 12);
    this.container.addChild(this._titleText);

    this._descText = new Text({ text: "", style: STYLE_DESC });
    this._descText.anchor.set(0, 0);
    this._descText.position.set(38, 32);
    this.container.addChild(this._descText);

    this._reposition();
  }

  private _drawBg(alpha: number): void {
    this._bg.clear();
    this._bg
      .roundRect(0, 0, BANNER_W, BANNER_H, CORNER_R)
      .fill({ color: 0x07070f, alpha: 0.92 * alpha })
      .roundRect(0, 0, BANNER_W, BANNER_H, CORNER_R)
      .stroke({ color: 0xffd700, alpha: 0.8 * alpha, width: 1.5 });
  }

  private _reposition(): void {
    this.container.position.set(
      Math.floor((this._screenW - BANNER_W) / 2),
      Math.floor(this._screenH * 0.38),
    );
  }

  // -------------------------------------------------------------------------
  // Show
  // -------------------------------------------------------------------------

  private _show(title: string, description: string): void {
    // Kill any running tween
    if (this._tween) {
      this._tween.kill();
      this._tween = null;
    }

    this._titleText.text = title;
    this._descText.text = description;

    // Reset state
    this.container.alpha = 0;
    this.container.visible = true;
    this._drawBg(1);

    // Fade in, hold, fade out
    this._tween = gsap.to(this.container, {
      alpha: 1,
      duration: 0.25,
      ease: "power1.out",
      onComplete: () => {
        // Hold at full opacity, then fade out
        this._tween = gsap.to(this.container, {
          alpha: 1,
          duration: DISPLAY_DURATION,
          onComplete: () => {
            this._tween = gsap.to(this.container, {
              alpha: 0,
              duration: FADE_DURATION,
              ease: "power1.in",
              onComplete: () => {
                this.container.visible = false;
              },
            });
          },
        });
      },
    });
  }
}

export const eventBanner = new EventBanner();
