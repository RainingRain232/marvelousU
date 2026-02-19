// Overlay shown during RESOLVE phase: winner announcement + return-to-menu button
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { GamePhase } from "@/types";

const STYLE_WINNER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 36,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
  dropShadow: {
    color: 0x000000,
    blur: 10,
    distance: 3,
    angle: Math.PI / 4,
    alpha: 0.9,
  },
});

const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xaabbcc,
  letterSpacing: 2,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

export class VictoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Graphics;
  private _winnerText!: Text;
  private _subtitleText!: Text;

  private readonly _CARD_W = 360;
  private readonly _CARD_H = 200;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    // Semi-transparent full-screen overlay
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    // Card
    this._card = new Graphics();
    this.container.addChild(this._card);
    this._drawCard();

    // Winner text
    this._winnerText = new Text({ text: "", style: STYLE_WINNER });
    this._winnerText.anchor.set(0.5, 0.5);
    this._winnerText.position.set(this._CARD_W / 2, 62);
    this._card.addChild(this._winnerText);

    // Subtitle
    this._subtitleText = new Text({ text: "VICTORY", style: STYLE_SUBTITLE });
    this._subtitleText.anchor.set(0.5, 0.5);
    this._subtitleText.position.set(this._CARD_W / 2, 104);
    this._card.addChild(this._subtitleText);

    // Return to Menu button
    const BW = this._CARD_W - 60;
    const BH = 40;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(30, 138);

    const btnBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(btnBg);

    const btnLabel = new Text({ text: "RETURN TO MENU", style: STYLE_BTN });
    btnLabel.style.fill = 0x88ccff;
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    btn.addChild(btnLabel);

    btn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    btn.on("pointerdown", () => { window.location.reload(); });

    this._card.addChild(btn);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());

    // React to phase changes
    EventBus.on("phaseChanged", ({ phase }) => {
      if (phase === GamePhase.RESOLVE) {
        this._show(state);
      } else {
        this.container.visible = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _show(state: GameState): void {
    if (state.winnerId === null) {
      this._winnerText.text = "DRAW";
      this._subtitleText.text = "MUTUAL DESTRUCTION";
    } else {
      const label = state.winnerId === "p1" ? "PLAYER 1" : "PLAYER 2";
      this._winnerText.text = label;
      this._subtitleText.text = "WINS THE ROUND";
    }
    this.container.visible = true;
  }

  private _drawCard(): void {
    this._card.clear();
    this._card
      .roundRect(0, 0, this._CARD_W, this._CARD_H, 10)
      .fill({ color: 0x0a0a18, alpha: 0.96 })
      .roundRect(0, 0, this._CARD_W, this._CARD_H, 10)
      .stroke({ color: 0xffd700, alpha: 0.6, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });

    this._card.position.set(
      Math.floor((sw - this._CARD_W) / 2),
      Math.floor((sh - this._CARD_H) / 2),
    );
  }
}

export const victoryScreen = new VictoryScreen();
