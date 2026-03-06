// Turn transition overlay — shows "TURN X" with a fade animation.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

const TURN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 48,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const PHASE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xaaaacc,
});

export class TurnTransition {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _turnText!: Text;
  private _phaseText!: Text;

  init(vm: ViewManager): void {
    this._vm = vm;
    this.container.visible = false;
    this.container.eventMode = "static";

    this._bg = new Graphics();
    this._bg.rect(0, 0, vm.screenWidth, vm.screenHeight);
    this._bg.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(this._bg);

    this._turnText = new Text({ text: "", style: TURN_STYLE });
    this._turnText.anchor.set(0.5, 0.5);
    this._turnText.x = vm.screenWidth / 2;
    this._turnText.y = vm.screenHeight / 2 - 16;
    this.container.addChild(this._turnText);

    this._phaseText = new Text({ text: "Your Turn", style: PHASE_STYLE });
    this._phaseText.anchor.set(0.5, 0);
    this._phaseText.x = vm.screenWidth / 2;
    this._phaseText.y = vm.screenHeight / 2 + 20;
    this.container.addChild(this._phaseText);

    vm.addToLayer("ui", this.container);
  }

  show(turnNumber: number): Promise<void> {
    this._turnText.text = `TURN ${turnNumber}`;
    this.container.visible = true;
    this.container.alpha = 0;

    return new Promise<void>((resolve) => {
      const duration = 1.5; // seconds
      let elapsed = 0;

      const tick = () => {
        elapsed += this._vm.app.ticker.deltaMS / 1000;
        const t = Math.min(1, elapsed / duration);

        // Fade in then out: peak at 0.3s
        if (t < 0.2) {
          this.container.alpha = t / 0.2;
        } else if (t < 0.7) {
          this.container.alpha = 1;
        } else {
          this.container.alpha = 1 - (t - 0.7) / 0.3;
        }

        if (t >= 1) {
          this._vm.app.ticker.remove(tick);
          this.container.visible = false;
          this.container.alpha = 1;
          resolve();
        }
      };

      this._vm.app.ticker.add(tick);
    });
  }
}

export const turnTransition = new TurnTransition();
