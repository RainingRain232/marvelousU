// Overlay shown during RESOLVE phase: winner announcement + return-to-menu button
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { GamePhase, GameMode } from "@/types";

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
  private _card!: Container;
  private _cardBg!: Graphics;
  private _winnerText!: Text;
  private _subtitleText!: Text;
  private _nextWaveBtn!: Container;
  private _menuBtn!: Container;

  private readonly _CARD_W = 360;
  private readonly _CARD_H_NORMAL = 200;
  private readonly _CARD_H_WAVE = 250;

  /** If > 0, this is a wave mode battle. Set before init or before phase resolves. */
  waveNumber = 0;

  /** Called when the player clicks "NEXT WAVE" in wave mode. */
  onNextWave: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private _unsubscribers: Array<() => void> = [];
  private _onResize: (() => void) | null = null;

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    // Semi-transparent full-screen overlay
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    // Card
    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

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

    this._menuBtn = new Container();
    this._menuBtn.eventMode = "static";
    this._menuBtn.cursor = "pointer";
    this._menuBtn.position.set(30, 138);

    const btnBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    this._menuBtn.addChild(btnBg);

    const btnLabel = new Text({ text: "RETURN TO MENU", style: STYLE_BTN });
    btnLabel.style.fill = 0x88ccff;
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    this._menuBtn.addChild(btnLabel);

    this._menuBtn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    this._menuBtn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    this._menuBtn.on("pointerdown", () => { window.location.reload(); });

    this._card.addChild(this._menuBtn);

    // Next Wave button (wave mode only)
    this._nextWaveBtn = new Container();
    this._nextWaveBtn.eventMode = "static";
    this._nextWaveBtn.cursor = "pointer";
    this._nextWaveBtn.position.set(30, 138);
    this._nextWaveBtn.visible = false;

    const nwBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    this._nextWaveBtn.addChild(nwBg);

    const nwLabel = new Text({ text: "NEXT WAVE  >", style: STYLE_BTN });
    nwLabel.style.fill = 0x88ffaa;
    nwLabel.anchor.set(0.5, 0.5);
    nwLabel.position.set(BW / 2, BH / 2);
    this._nextWaveBtn.addChild(nwLabel);

    this._nextWaveBtn.on("pointerover", () => { nwBg.tint = 0xaaffcc; });
    this._nextWaveBtn.on("pointerout", () => { nwBg.tint = 0xffffff; });
    this._nextWaveBtn.on("pointerdown", () => { this.onNextWave?.(); });

    this._card.addChild(this._nextWaveBtn);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();

    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);

    // React to phase changes
    this._unsubscribers.push(
      EventBus.on("phaseChanged", ({ phase }) => {
        if (phase === GamePhase.RESOLVE) {
          // Campaign mode P1 victory is handled by CampaignVictoryScreen instead
          if (state.gameMode === GameMode.CAMPAIGN && state.winnerId === "p1") return;
          this._show(state);
        }
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _show(state: GameState): void {
    const isWave = this.waveNumber > 0;
    const p1Won = state.winnerId === "p1";

    if (state.winnerId === null) {
      this._winnerText.text = "DRAW";
      this._subtitleText.text = isWave
        ? `WAVE ${this.waveNumber} — MUTUAL DESTRUCTION`
        : "MUTUAL DESTRUCTION";
    } else {
      const playerLabels: Record<string, string> = {
        p1: "PLAYER 1",
        p2: "PLAYER 2",
        p3: "PLAYER 3",
        p4: "PLAYER 4",
      };
      const label = playerLabels[state.winnerId] ?? state.winnerId.toUpperCase();
      this._winnerText.text = label;
      this._subtitleText.text = isWave
        ? `WAVE ${this.waveNumber} ${p1Won ? "COMPLETE" : "— DEFEATED"}`
        : "WINS THE ROUND";
    }

    // In wave mode, show "NEXT WAVE" if p1 won, otherwise just "RETURN TO MENU"
    if (isWave && p1Won) {
      this._nextWaveBtn.visible = true;
      this._nextWaveBtn.position.set(30, 138);
      this._menuBtn.position.set(30, 188);
      this._drawCard(this._CARD_H_WAVE);
    } else {
      this._nextWaveBtn.visible = false;
      this._menuBtn.position.set(30, 138);
      this._drawCard(this._CARD_H_NORMAL);
    }

    this.container.visible = true;
    this._layout();
  }

  private _drawCard(h?: number): void {
    const cardH = h ?? this._CARD_H_NORMAL;
    this._cardBg.clear();
    this._cardBg
      .roundRect(0, 0, this._CARD_W, cardH, 10)
      .fill({ color: 0x0a0a18, alpha: 0.96 })
      .roundRect(0, 0, this._CARD_W, cardH, 10)
      .stroke({ color: 0xffd700, alpha: 0.6, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });

    const cardH = this._nextWaveBtn.visible ? this._CARD_H_WAVE : this._CARD_H_NORMAL;
    this._card.position.set(
      Math.floor((sw - this._CARD_W) / 2),
      Math.floor((sh - cardH) / 2),
    );
  }
}

export const victoryScreen = new VictoryScreen();
