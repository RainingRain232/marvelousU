// ---------------------------------------------------------------------------
// Duel mode – in-fight pause menu (ESC to toggle)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

const PAUSE_ITEMS = [
  "RESUME",
  "RESTART MATCH",
  "CHARACTER SELECT",
  "MAIN MENU",
] as const;

export type PauseMenuChoice = (typeof PAUSE_ITEMS)[number];

const COL_OVERLAY = 0x000000;
const COL_PANEL = 0x1a1a2e;
const COL_BORDER = 0x444466;
const COL_ACCENT = 0xe94560;
const COL_TEXT_SELECTED = 0xffffff;
const COL_TEXT_NORMAL = 0x888899;

export class DuelPauseMenu {
  readonly container = new Container();

  private _selection = 0;
  private _onSelect: ((choice: PauseMenuChoice) => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _screenW = 0;
  private _screenH = 0;

  setSelectCallback(cb: (choice: PauseMenuChoice) => void): void {
    this._onSelect = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._selection = 0;
    this._draw();

    this._onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
          this._selection = (this._selection - 1 + PAUSE_ITEMS.length) % PAUSE_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "ArrowDown":
          this._selection = (this._selection + 1) % PAUSE_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "Enter":
        case "Space":
          duelAudio.playConfirm();
          this._onSelect?.(PAUSE_ITEMS[this._selection]);
          return;
        case "Escape":
          duelAudio.playCancel();
          this._onSelect?.("RESUME");
          return;
        default:
          return;
      }
      e.preventDefault();
      this._draw();
    };
    window.addEventListener("keydown", this._onKeyDown);

    this.container.visible = true;
  }

  hide(): void {
    this._cleanup();
    this.container.visible = false;
    this.container.removeChildren();
  }

  private _draw(): void {
    this.container.removeChildren();
    const sw = this._screenW;
    const sh = this._screenH;

    // Semi-transparent overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, sw, sh);
    overlay.fill({ color: COL_OVERLAY, alpha: 0.7 });
    this.container.addChild(overlay);

    // Center panel
    const panelW = 320;
    const panelH = 280;
    const panelX = (sw - panelW) / 2;
    const panelY = (sh - panelH) / 2;

    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 12);
    panel.fill({ color: COL_PANEL });
    panel.stroke({ color: COL_BORDER, width: 2 });
    this.container.addChild(panel);

    // Title
    const title = new Text({
      text: "PAUSED",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 36,
        fill: COL_ACCENT,
        fontWeight: "bold",
        letterSpacing: 4,
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, panelY + 20);
    this.container.addChild(title);

    // Menu items
    const startY = panelY + 80;
    const gap = 45;

    for (let i = 0; i < PAUSE_ITEMS.length; i++) {
      const y = startY + i * gap;
      const isSelected = i === this._selection;

      if (isSelected) {
        // Highlight bar
        const bar = new Graphics();
        bar.roundRect(panelX + 15, y - 16, panelW - 30, 36, 6);
        bar.fill({ color: COL_ACCENT, alpha: 0.2 });
        bar.stroke({ color: COL_ACCENT, width: 1, alpha: 0.5 });
        this.container.addChild(bar);
      }

      const text = new Text({
        text: PAUSE_ITEMS[i],
        style: {
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: isSelected ? 24 : 20,
          fill: isSelected ? COL_TEXT_SELECTED : COL_TEXT_NORMAL,
          fontWeight: "bold",
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(sw / 2, y);
      this.container.addChild(text);
    }

    // Footer
    const footer = new Text({
      text: "[\u2191/\u2193] Navigate   [ENTER] Select   [ESC] Resume",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0x555566 },
    });
    footer.anchor.set(0.5, 0);
    footer.position.set(sw / 2, panelY + panelH - 30);
    this.container.addChild(footer);
  }

  private _cleanup(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  destroy(): void {
    this._cleanup();
    this.container.destroy({ children: true });
  }
}
