// ---------------------------------------------------------------------------
// Duel mode – main menu screen (fantasiaCup-style)
// Shows mode options: ARCADE, VS MODE, VS CPU, TRAINING, CONTROLS, HOW TO PLAY, SETTINGS
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

// ---- Menu items ------------------------------------------------------------

const MENU_ITEMS = [
  "ARCADE",
  "VS MODE",
  "VS CPU",
  "TRAINING",
  "CONTROLS",
  "HOW TO PLAY",
  "SETTINGS",
] as const;

export type DuelMenuChoice = (typeof MENU_ITEMS)[number];

// ---- Styles ----------------------------------------------------------------

const COL_ACCENT = 0xe94560;
const COL_TEXT_SELECTED = 0xffffff;
const COL_TEXT_NORMAL = 0x555555;
const COL_BG_TOP = 0x0a0015;
const COL_BG_MID = 0x1a0a30;

// ---- Menu view class -------------------------------------------------------

export class DuelMenuView {
  readonly container = new Container();

  private _selection = 0;
  private _onSelect: ((choice: DuelMenuChoice) => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _screenW = 0;
  private _screenH = 0;
  private _animFrame = 0;
  private _animRAF = 0;

  setSelectCallback(cb: (choice: DuelMenuChoice) => void): void {
    this._onSelect = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._selection = 2; // default to VS CPU
    this._draw();

    this._onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this._selection = (this._selection - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "ArrowDown":
        case "KeyS":
          this._selection = (this._selection + 1) % MENU_ITEMS.length;
          duelAudio.playSelect();
          break;
        case "Enter":
        case "Space":
          duelAudio.playConfirm();
          this._onSelect?.(MENU_ITEMS[this._selection]);
          return;
        case "Escape":
          duelAudio.playCancel();
          window.dispatchEvent(new CustomEvent("duelExit"));
          return;
        default:
          return;
      }
      e.preventDefault();
      this._draw();
    };
    window.addEventListener("keydown", this._onKeyDown);

    // Animation loop
    const animate = () => {
      this._animFrame++;
      if (this._animFrame % 3 === 0) this._draw();
      this._animRAF = requestAnimationFrame(animate);
    };
    this._animRAF = requestAnimationFrame(animate);
  }

  hide(): void {
    this._cleanup();
    this.container.removeChildren();
  }

  private _draw(): void {
    this.container.removeChildren();
    const sw = this._screenW;
    const sh = this._screenH;
    const time = this._animFrame / 60;

    // ===== Background (gradient + animated lines) =====
    const bg = new Graphics();

    // Gradient background
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: COL_BG_TOP });

    // Middle gradient band
    bg.rect(0, sh * 0.3, sw, sh * 0.4);
    bg.fill({ color: COL_BG_MID, alpha: 0.5 });

    // Horizontal animated lines
    for (let i = 0; i < 20; i++) {
      const y = ((i * 60 + time * 30) % sh);
      const wobble = Math.sin(time + i) * 50;
      bg.moveTo(0, y);
      bg.lineTo(sw, y + wobble);
      bg.stroke({ color: COL_ACCENT, width: 2, alpha: 0.1 });
    }

    // Vertical animated lines
    for (let i = 0; i < 15; i++) {
      const x = ((i * 140 + time * 20) % sw);
      const wobble = Math.sin(time + i) * 30;
      bg.moveTo(x, 0);
      bg.lineTo(x + wobble, sh);
      bg.stroke({ color: 0x6432c8, width: 2, alpha: 0.08 });
    }

    this.container.addChild(bg);

    // ===== Logo =====
    const bounce = Math.sin(time * 2) * 5;

    // Logo glow text
    const logoGlow = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 100,
        fill: COL_ACCENT,
        fontWeight: "bold",
        letterSpacing: 4,
      },
    });
    logoGlow.anchor.set(0.5);
    logoGlow.position.set(sw / 2, 160 + bounce);
    logoGlow.alpha = 0.6;
    this.container.addChild(logoGlow);

    // Logo main text
    const logoMain = new Text({
      text: "DUEL MODE",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 96,
        fill: COL_TEXT_SELECTED,
        fontWeight: "bold",
        letterSpacing: 4,
      },
    });
    logoMain.anchor.set(0.5);
    logoMain.position.set(sw / 2, 160 + bounce);
    this.container.addChild(logoMain);

    // Subtitle
    const subtitle = new Text({
      text: "- ULTIMATE SHOWDOWN -",
      style: {
        fontFamily: '"Segoe UI", sans-serif',
        fontSize: 24,
        fill: COL_ACCENT,
        fontWeight: "bold",
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(sw / 2, 220 + bounce);
    this.container.addChild(subtitle);

    // ===== Menu items =====
    const startY = 340;
    const gap = 55;

    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const y = startY + i * gap;
      const isSelected = i === this._selection;

      if (isSelected) {
        // Selection indicators (chevrons)
        const bob = Math.sin(time * 4) * 3;
        const item = MENU_ITEMS[i];

        const chevronL = new Text({
          text: "\u00BB",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 40,
            fill: COL_ACCENT,
            fontWeight: "bold",
          },
        });
        chevronL.anchor.set(0.5);
        chevronL.position.set(sw / 2 - 150 + bob, y);
        this.container.addChild(chevronL);

        const chevronR = new Text({
          text: "\u00AB",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 40,
            fill: COL_ACCENT,
            fontWeight: "bold",
          },
        });
        chevronR.anchor.set(0.5);
        chevronR.position.set(sw / 2 + 150 - bob, y);
        this.container.addChild(chevronR);

        const text = new Text({
          text: item,
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 40,
            fill: COL_TEXT_SELECTED,
            fontWeight: "bold",
          },
        });
        text.anchor.set(0.5);
        text.position.set(sw / 2, y);
        this.container.addChild(text);
      } else {
        const text = new Text({
          text: MENU_ITEMS[i],
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 36,
            fill: COL_TEXT_NORMAL,
            fontWeight: "bold",
          },
        });
        text.anchor.set(0.5);
        text.position.set(sw / 2, y);
        this.container.addChild(text);
      }
    }

    // ===== Footer hint =====
    const footer = new Text({
      text: "[W/S or \u2191/\u2193] Navigate    [ENTER] Select    [ESC] Back",
      style: {
        fontFamily: '"Segoe UI", sans-serif',
        fontSize: 14,
        fill: 0x444444,
      },
    });
    footer.anchor.set(0.5);
    footer.position.set(sw / 2, sh - 35);
    this.container.addChild(footer);
  }

  private _cleanup(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._animRAF) {
      cancelAnimationFrame(this._animRAF);
      this._animRAF = 0;
    }
  }

  destroy(): void {
    this._cleanup();
    this.container.destroy({ children: true });
  }
}
