// Multiplayer lobby screen — create/join rooms, see connected players, ready up.
//
// Shown when the player selects "Online Multiplayer" from the menu.
// Once all players are ready, the game starts.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { RoomPlayer } from "@net/protocol";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 28,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xaabbcc,
  letterSpacing: 1,
});

const STYLE_CODE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 32,
  fill: 0x88ccff,
  fontWeight: "bold",
  letterSpacing: 6,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_PLAYER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xccddee,
  letterSpacing: 1,
});

const STYLE_STATUS = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x888888,
  letterSpacing: 1,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 420;
const CARD_H = 380;

// ---------------------------------------------------------------------------
// LobbyScreen
// ---------------------------------------------------------------------------

export class LobbyScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Container;
  private _cardBg!: Graphics;

  // UI elements
  private _titleText!: Text;
  private _roomCodeText!: Text;
  private _roomCodeLabel!: Text;
  private _playerTexts: Text[] = [];
  private _statusText!: Text;
  private _readyBtn!: Container;
  private _backBtn!: Container;

  // State
  private _roomId: string | null = null;
  private _localPlayerId: string | null = null;

  // Callbacks
  onReady: (() => void) | null = null;
  onBack: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Semi-transparent overlay
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    // Card
    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    // Title
    this._titleText = new Text({ text: "MULTIPLAYER LOBBY", style: STYLE_TITLE });
    this._titleText.anchor.set(0.5, 0);
    this._titleText.position.set(CARD_W / 2, 20);
    this._card.addChild(this._titleText);

    // Room code label
    this._roomCodeLabel = new Text({ text: "ROOM CODE:", style: STYLE_LABEL });
    this._roomCodeLabel.anchor.set(0.5, 0);
    this._roomCodeLabel.position.set(CARD_W / 2, 65);
    this._card.addChild(this._roomCodeLabel);

    // Room code
    this._roomCodeText = new Text({ text: "----", style: STYLE_CODE });
    this._roomCodeText.anchor.set(0.5, 0);
    this._roomCodeText.position.set(CARD_W / 2, 85);
    this._card.addChild(this._roomCodeText);

    // Player slots (max 4)
    for (let i = 0; i < 4; i++) {
      const txt = new Text({ text: "", style: STYLE_PLAYER });
      txt.position.set(40, 140 + i * 28);
      this._card.addChild(txt);
      this._playerTexts.push(txt);
    }

    // Status text
    this._statusText = new Text({ text: "Waiting for players...", style: STYLE_STATUS });
    this._statusText.anchor.set(0.5, 0);
    this._statusText.position.set(CARD_W / 2, 260);
    this._card.addChild(this._statusText);

    // Ready button
    this._readyBtn = this._createButton("READY", CARD_W / 2 - 75, 295, 150, 36, () => {
      this.onReady?.();
    });
    this._card.addChild(this._readyBtn);

    // Back button
    this._backBtn = this._createButton("BACK", CARD_W / 2 - 75, 340, 150, 36, () => {
      this.onBack?.();
    });
    this._card.addChild(this._backBtn);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._drawCard();
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  show(roomId: string, localPlayerId: string): void {
    this._roomId = roomId;
    this._localPlayerId = localPlayerId;
    this._roomCodeText.text = roomId;
    this._statusText.text = "Waiting for players...";
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  updatePlayers(players: RoomPlayer[]): void {
    for (let i = 0; i < this._playerTexts.length; i++) {
      if (i < players.length) {
        const p = players[i];
        const isLocal = p.playerId === this._localPlayerId;
        const status = p.ready ? " [READY]" : p.connected ? "" : " [DISCONNECTED]";
        const marker = isLocal ? " (you)" : "";
        this._playerTexts[i].text = `Player ${i + 1}: ${p.playerId}${marker}${status}`;
        this._playerTexts[i].style.fill = p.ready ? 0x44bb44 : 0xccddee;
      } else {
        this._playerTexts[i].text = `Player ${i + 1}: waiting...`;
        this._playerTexts[i].style.fill = 0x555555;
      }
    }
  }

  setStatus(text: string): void {
    this._statusText.text = text;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _createButton(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: () => void,
  ): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(x, y);

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: STYLE_BTN });
    txt.style.fill = 0x88ccff;
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    btn.on("pointerdown", onClick);

    return btn;
  }

  private _drawCard(): void {
    this._cardBg.clear();
    this._cardBg
      .roundRect(0, 0, CARD_W, CARD_H, 10)
      .fill({ color: 0x0a0a18, alpha: 0.96 })
      .roundRect(0, 0, CARD_W, CARD_H, 10)
      .stroke({ color: 0x4488cc, alpha: 0.6, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });

    this._card.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const lobbyScreen = new LobbyScreen();
