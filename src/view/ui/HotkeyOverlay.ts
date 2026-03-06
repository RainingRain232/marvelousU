// Overlay that shows keyboard shortcuts when the user presses "?" or "H".
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 4,
  dropShadow: {
    color: 0x000000,
    blur: 8,
    distance: 2,
    angle: Math.PI / 4,
    alpha: 0.9,
  },
});

const STYLE_KEY = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_DESC = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xdddddd,
  letterSpacing: 1,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

// ---------------------------------------------------------------------------
// Keybinding definitions
// ---------------------------------------------------------------------------

const KEYBINDINGS: Array<{ key: string; desc: string }> = [
  { key: "F",        desc: "Place Rally Flag (costs 100g)" },
  { key: "ESC",      desc: "Cancel Placement" },
  { key: "H / ?",   desc: "Toggle This Help" },
  { key: "Mouse",   desc: "Select / Pan Camera" },
  { key: "Scroll",  desc: "Zoom In / Out" },
];

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_W        = 340;
const CARD_PAD      = 24;
const TITLE_H       = 52;       // space from card top to first row
const ROW_H         = 28;       // height per keybinding row
const DIVIDER_GAP   = 12;       // gap between last row and divider
const DIVIDER_H     = 1;        // divider line height
const BTN_H         = 38;
const BTN_MARGIN_V  = 14;       // gap between divider and button

const CARD_H =
  TITLE_H +
  KEYBINDINGS.length * ROW_H +
  DIVIDER_GAP +
  DIVIDER_H +
  BTN_MARGIN_V +
  BTN_H +
  CARD_PAD;

// ---------------------------------------------------------------------------
// HotkeyOverlay class
// ---------------------------------------------------------------------------

export class HotkeyOverlay {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Container;
  private _cardBg!: Graphics;
  private _onResize: (() => void) | null = null;
  private _onKeydown: ((e: KeyboardEvent) => void) | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    // Full-screen semi-transparent backdrop — clicking it dismisses the overlay
    this._overlay = new Graphics();
    this._overlay.eventMode = "static";
    this._overlay.cursor = "default";
    this._overlay.on("pointerdown", () => this.hide());
    this.container.addChild(this._overlay);

    // Card
    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    // Stop pointer events on the card from bubbling to the backdrop
    this._card.eventMode = "static";
    this._card.on("pointerdown", (e) => e.stopPropagation());

    // Draw the static card background
    this._drawCard();

    // Title
    const title = new Text({ text: "KEYBOARD SHORTCUTS", style: STYLE_TITLE });
    title.anchor.set(0.5, 0.5);
    title.position.set(CARD_W / 2, TITLE_H / 2);
    this._card.addChild(title);

    // Separator beneath title
    const titleSep = new Graphics()
      .rect(CARD_PAD, TITLE_H - 2, CARD_W - CARD_PAD * 2, 1)
      .fill({ color: 0xffd700, alpha: 0.35 });
    this._card.addChild(titleSep);

    // Keybinding rows
    const KEY_COL_X  = CARD_PAD;
    const DESC_COL_X = CARD_PAD + 90;   // fixed offset so descriptions align

    KEYBINDINGS.forEach((binding, i) => {
      const rowY = TITLE_H + i * ROW_H + ROW_H / 2;

      const keyText = new Text({ text: binding.key, style: STYLE_KEY });
      keyText.anchor.set(0, 0.5);
      keyText.position.set(KEY_COL_X, rowY);
      this._card.addChild(keyText);

      const descText = new Text({ text: binding.desc, style: STYLE_DESC });
      descText.anchor.set(0, 0.5);
      descText.position.set(DESC_COL_X, rowY);
      this._card.addChild(descText);
    });

    // Divider above button
    const dividerY = TITLE_H + KEYBINDINGS.length * ROW_H + DIVIDER_GAP;
    const divider = new Graphics()
      .rect(CARD_PAD, dividerY, CARD_W - CARD_PAD * 2, DIVIDER_H)
      .fill({ color: 0x4488cc, alpha: 0.4 });
    this._card.addChild(divider);

    // CLOSE button
    const btnY    = dividerY + DIVIDER_H + BTN_MARGIN_V;
    const BW      = CARD_W - CARD_PAD * 2;

    const closeBtn = new Container();
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.position.set(CARD_PAD, btnY);

    const closeBg = new Graphics()
      .roundRect(0, 0, BW, BTN_H, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BTN_H, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    closeBtn.addChild(closeBg);

    const closeLabel = new Text({ text: "CLOSE", style: STYLE_BTN });
    closeLabel.style.fill = 0x88ccff;
    closeLabel.anchor.set(0.5, 0.5);
    closeLabel.position.set(BW / 2, BTN_H / 2);
    closeBtn.addChild(closeLabel);

    closeBtn.on("pointerover", () => { closeBg.tint = 0xaaddff; });
    closeBtn.on("pointerout",  () => { closeBg.tint = 0xffffff; });
    closeBtn.on("pointerdown", () => this.hide());

    this._card.addChild(closeBtn);

    // Start hidden
    this.container.visible = false;

    vm.addToLayer("ui", this.container);
    this._layout();

    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);

    // Keyboard shortcut listener
    this._onKeydown = (e: KeyboardEvent) => {
      if (e.key === "?" || e.key === "h" || e.key === "H") {
        this.toggle();
      }
    };
    document.addEventListener("keydown", this._onKeydown);
  }

  destroy(): void {
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    if (this._onKeydown) {
      document.removeEventListener("keydown", this._onKeydown);
      this._onKeydown = null;
    }
    this.container.destroy({ children: true });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  toggle(): void {
    if (this.container.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private _drawCard(): void {
    this._cardBg.clear();
    this._cardBg
      .roundRect(0, 0, CARD_W, CARD_H, 10)
      .fill({ color: 0x0a0a18, alpha: 0.97 })
      .roundRect(0, 0, CARD_W, CARD_H, 10)
      .stroke({ color: 0xffd700, alpha: 0.55, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay
      .rect(0, 0, sw, sh)
      .fill({ color: 0x000000, alpha: 0.6 });

    this._card.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const hotkeyOverlay = new HotkeyOverlay();
