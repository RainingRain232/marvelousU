// Pre-game setup screen for world mode.
//
// Allows the player to configure map radius, number of players, and AI count
// before starting a world game. Rendered as PixiJS UI on the stage.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import {
  type WorldGameSettings,
  DEFAULT_WORLD_SETTINGS,
} from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xcccccc,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xffffff,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xffffff,
});

const BORDER = 0x555577;

// ---------------------------------------------------------------------------
// WorldSetupScreen
// ---------------------------------------------------------------------------

export class WorldSetupScreen {
  readonly container = new Container();

  private _settings: WorldGameSettings = { ...DEFAULT_WORLD_SETTINGS };
  private _radiusText!: Text;
  private _playersText!: Text;
  private _aiText!: Text;

  /** Called when player clicks START. */
  onStart: ((settings: WorldGameSettings) => void) | null = null;
  /** Called when player clicks BACK. */
  onBack: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    const screenW = vm.screenWidth;
    const screenH = vm.screenHeight;

    // Fullscreen semi-transparent backdrop
    const bg = new Graphics();
    bg.rect(0, 0, screenW, screenH);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static"; // block clicks through
    this.container.addChild(bg);

    // Card
    const cardW = 360;
    const cardH = 340;
    const cardX = (screenW - cardW) / 2;
    const cardY = (screenH - cardH) / 2;

    const card = new Graphics();
    card.roundRect(cardX, cardY, cardW, cardH, 8);
    card.fill({ color: 0x10102a, alpha: 0.95 });
    card.stroke({ color: BORDER, width: 1.5 });
    this.container.addChild(card);

    // Title
    const title = new Text({ text: "WORLD MODE", style: TITLE_STYLE });
    title.x = cardX + (cardW - title.width) / 2;
    title.y = cardY + 16;
    this.container.addChild(title);

    let y = cardY + 60;

    // Map Radius
    y = this._addRow("Map Radius", y, cardX, cardW, () => {
      return this._settings.mapRadius.toString();
    }, (dir) => {
      this._settings.mapRadius = _clamp(this._settings.mapRadius + dir * 3, 6, 30);
      this._refresh();
    }, (t) => this._radiusText = t);

    // Num Players
    y = this._addRow("Players", y, cardX, cardW, () => {
      return this._settings.numPlayers.toString();
    }, (dir) => {
      this._settings.numPlayers = _clamp(this._settings.numPlayers + dir, 2, 4);
      if (this._settings.numAIPlayers >= this._settings.numPlayers) {
        this._settings.numAIPlayers = this._settings.numPlayers - 1;
      }
      this._refresh();
    }, (t) => this._playersText = t);

    // AI Players
    y = this._addRow("AI Players", y, cardX, cardW, () => {
      return this._settings.numAIPlayers.toString();
    }, (dir) => {
      this._settings.numAIPlayers = _clamp(
        this._settings.numAIPlayers + dir,
        0,
        this._settings.numPlayers - 1,
      );
      this._refresh();
    }, (t) => this._aiText = t);

    y += 20;

    // START button
    this._addButton("START GAME", cardX + 40, y, cardW - 80, 0x336633, 0x55aa55, () => {
      this.onStart?.(this._settings);
    });
    y += 50;

    // BACK button
    this._addButton("BACK", cardX + 40, y, cardW - 80, 0x333344, BORDER, () => {
      this.onBack?.();
    });

    vm.app.stage.addChild(this.container);
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private _refresh(): void {
    this._radiusText.text = this._settings.mapRadius.toString();
    this._playersText.text = this._settings.numPlayers.toString();
    this._aiText.text = this._settings.numAIPlayers.toString();
  }

  /** Add a label + value + [-] [+] row. Returns new Y. */
  private _addRow(
    label: string,
    y: number,
    cardX: number,
    cardW: number,
    getValue: () => string,
    onChange: (dir: number) => void,
    saveText: (t: Text) => void,
  ): number {
    const lbl = new Text({ text: label, style: LABEL_STYLE });
    lbl.x = cardX + 30;
    lbl.y = y + 8;
    this.container.addChild(lbl);

    const val = new Text({ text: getValue(), style: VALUE_STYLE });
    val.x = cardX + cardW / 2 + 10;
    val.y = y + 6;
    this.container.addChild(val);
    saveText(val);

    // [-] button
    this._addSmallBtn("-", cardX + cardW - 90, y + 4, () => onChange(-1));
    // [+] button
    this._addSmallBtn("+", cardX + cardW - 50, y + 4, () => onChange(1));

    return y + 50;
  }

  private _addSmallBtn(label: string, x: number, y: number, onClick: () => void): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 30, 28, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: BORDER, width: 1 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.x = (30 - txt.width) / 2;
    txt.y = 4;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", onClick);
    this.container.addChild(btn);
  }

  private _addButton(
    label: string,
    x: number,
    y: number,
    w: number,
    fillColor: number,
    strokeColor: number,
    onClick: () => void,
  ): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, w, 38, 6);
    bg.fill({ color: fillColor });
    bg.stroke({ color: strokeColor, width: 2 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.x = (w - txt.width) / 2;
    txt.y = 9;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", onClick);
    this.container.addChild(btn);
  }
}

function _clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
