// ---------------------------------------------------------------------------
// Duel mode – in-fight pause menu (ESC to toggle)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, Ticker } from "pixi.js";
import { duelAudio } from "../../duel/systems/DuelAudioSystem";

const PAUSE_ITEMS = [
  "RESUME",
  "RESTART MATCH",
  "CHARACTER SELECT",
  "MAIN MENU",
] as const;

export type PauseMenuChoice = (typeof PAUSE_ITEMS)[number];

const COL_OVERLAY = 0x000000;
const COL_PANEL_LIGHT = 0x222244;
const COL_BORDER = 0x444466;
const COL_ACCENT = 0xe94560;
const COL_GOLD = 0xd4af37;
const COL_GOLD_BRIGHT = 0xffd700;
const COL_TEXT_SELECTED = 0xffffff;
const COL_TEXT_NORMAL = 0x888899;
const COL_DARK_PURPLE = 0x0f0f1e;
const COL_ITEM_BG = 0x14142a;

export class DuelPauseMenu {
  readonly container = new Container();

  private _selection = 0;
  private _onSelect: ((choice: PauseMenuChoice) => void) | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _screenW = 0;
  private _screenH = 0;
  private _tickerCb: (() => void) | null = null;
  private _animTime = 0;

  setSelectCallback(cb: (choice: PauseMenuChoice) => void): void {
    this._onSelect = cb;
  }

  show(sw: number, sh: number): void {
    this._screenW = sw;
    this._screenH = sh;
    this._selection = 0;
    this._animTime = 0;
    this._draw();

    // Start animation ticker for pulse/scanline effects
    this._tickerCb = () => {
      this._animTime += Ticker.shared.deltaMS / 1000;
      this._updateAnimations();
    };
    Ticker.shared.add(this._tickerCb);

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

  // Refs to animated elements (set in _draw, used in _updateAnimations)
  private _scanLines: Graphics | null = null;
  private _selectedGlow: Graphics | null = null;
  private _titleGlow: Text | null = null;
  private _selectedChevronL: Text | null = null;
  private _selectedChevronR: Text | null = null;

  private _draw(): void {
    this.container.removeChildren();
    this._scanLines = null;
    this._selectedGlow = null;
    this._titleGlow = null;
    this._selectedChevronL = null;
    this._selectedChevronR = null;

    const sw = this._screenW;
    const sh = this._screenH;

    // ── Layered overlay for faux-blur depth ──
    // Base dark layer
    const overlayBase = new Graphics();
    overlayBase.rect(0, 0, sw, sh);
    overlayBase.fill({ color: COL_OVERLAY, alpha: 0.6 });
    this.container.addChild(overlayBase);

    // Second layer - subtle purple tint
    const overlayTint = new Graphics();
    overlayTint.rect(0, 0, sw, sh);
    overlayTint.fill({ color: 0x1a0a2e, alpha: 0.25 });
    this.container.addChild(overlayTint);

    // Third layer - slight vignette darkening at edges
    const overlayEdge = new Graphics();
    overlayEdge.rect(0, 0, sw, Math.round(sh * 0.15));
    overlayEdge.fill({ color: COL_OVERLAY, alpha: 0.3 });
    overlayEdge.rect(0, sh - Math.round(sh * 0.15), sw, Math.round(sh * 0.15));
    overlayEdge.fill({ color: COL_OVERLAY, alpha: 0.3 });
    this.container.addChild(overlayEdge);

    // Animated diagonal scan lines overlay
    const scanLines = new Graphics();
    this._scanLines = scanLines;
    this._drawScanLines(scanLines, sw, sh, 0);
    scanLines.alpha = 0.04;
    this.container.addChild(scanLines);

    // ── Center panel (slightly larger for decorations) ──
    const panelW = 370;
    const panelH = 340;
    const panelX = (sw - panelW) / 2;
    const panelY = (sh - panelH) / 2;

    // Outer glow shadow
    const panelShadow = new Graphics();
    panelShadow.roundRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8, 14);
    panelShadow.fill({ color: COL_GOLD, alpha: 0.06 });
    this.container.addChild(panelShadow);

    // Panel body - dark fill
    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 12);
    panel.fill({ color: COL_DARK_PURPLE });
    this.container.addChild(panel);

    // Inner gradient simulation: lighter center band
    const innerGradient = new Graphics();
    const gInset = 8;
    innerGradient.roundRect(panelX + gInset, panelY + gInset, panelW - gInset * 2, panelH - gInset * 2, 8);
    innerGradient.fill({ color: COL_PANEL_LIGHT, alpha: 0.35 });
    this.container.addChild(innerGradient);

    // Darkened edges (top and bottom strips inside panel)
    const edgeStrip = new Graphics();
    edgeStrip.roundRect(panelX + 4, panelY + 4, panelW - 8, 30, 8);
    edgeStrip.fill({ color: COL_OVERLAY, alpha: 0.25 });
    edgeStrip.roundRect(panelX + 4, panelY + panelH - 34, panelW - 8, 30, 8);
    edgeStrip.fill({ color: COL_OVERLAY, alpha: 0.25 });
    this.container.addChild(edgeStrip);

    // Outer border - gold/accent
    const outerBorder = new Graphics();
    outerBorder.roundRect(panelX, panelY, panelW, panelH, 12);
    outerBorder.stroke({ color: COL_GOLD, width: 2.5, alpha: 0.7 });
    this.container.addChild(outerBorder);

    // Inner border - dark
    const innerBorder = new Graphics();
    innerBorder.roundRect(panelX + 5, panelY + 5, panelW - 10, panelH - 10, 8);
    innerBorder.stroke({ color: COL_BORDER, width: 1, alpha: 0.5 });
    this.container.addChild(innerBorder);

    // ── Corner ornaments (L-shaped brackets) ──
    const cornerSize = 18;
    const cornerThick = 2.5;
    const cornerInset = 2;
    const cornerColor = COL_GOLD_BRIGHT;
    const cornerAlpha = 0.6;

    const corners = new Graphics();
    // Top-left
    corners.moveTo(panelX + cornerInset, panelY + cornerInset + cornerSize);
    corners.lineTo(panelX + cornerInset, panelY + cornerInset);
    corners.lineTo(panelX + cornerInset + cornerSize, panelY + cornerInset);
    corners.stroke({ color: cornerColor, width: cornerThick, alpha: cornerAlpha });

    // Top-right
    corners.moveTo(panelX + panelW - cornerInset - cornerSize, panelY + cornerInset);
    corners.lineTo(panelX + panelW - cornerInset, panelY + cornerInset);
    corners.lineTo(panelX + panelW - cornerInset, panelY + cornerInset + cornerSize);
    corners.stroke({ color: cornerColor, width: cornerThick, alpha: cornerAlpha });

    // Bottom-left
    corners.moveTo(panelX + cornerInset, panelY + panelH - cornerInset - cornerSize);
    corners.lineTo(panelX + cornerInset, panelY + panelH - cornerInset);
    corners.lineTo(panelX + cornerInset + cornerSize, panelY + panelH - cornerInset);
    corners.stroke({ color: cornerColor, width: cornerThick, alpha: cornerAlpha });

    // Bottom-right
    corners.moveTo(panelX + panelW - cornerInset - cornerSize, panelY + panelH - cornerInset);
    corners.lineTo(panelX + panelW - cornerInset, panelY + panelH - cornerInset);
    corners.lineTo(panelX + panelW - cornerInset, panelY + panelH - cornerInset - cornerSize);
    corners.stroke({ color: cornerColor, width: cornerThick, alpha: cornerAlpha });

    // Small diamond accents at each corner
    const diamondOff = 10;
    for (const [cx, cy] of [
      [panelX + cornerInset + diamondOff, panelY + cornerInset + diamondOff],
      [panelX + panelW - cornerInset - diamondOff, panelY + cornerInset + diamondOff],
      [panelX + cornerInset + diamondOff, panelY + panelH - cornerInset - diamondOff],
      [panelX + panelW - cornerInset - diamondOff, panelY + panelH - cornerInset - diamondOff],
    ]) {
      const ds = 3;
      corners.moveTo(cx, cy - ds);
      corners.lineTo(cx + ds, cy);
      corners.lineTo(cx, cy + ds);
      corners.lineTo(cx - ds, cy);
      corners.closePath();
      corners.fill({ color: COL_GOLD, alpha: 0.5 });
    }
    this.container.addChild(corners);

    // ── Title "PAUSED" with golden glow ──
    const titleY = panelY + 28;

    // Glow layer 1 - wide soft
    const titleGlow1 = new Text({
      text: "PAUSED",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 40,
        fill: COL_GOLD,
        fontWeight: "bold",
        letterSpacing: 6,
      },
    });
    titleGlow1.anchor.set(0.5, 0);
    titleGlow1.position.set(sw / 2, titleY);
    titleGlow1.alpha = 0.25;
    this._titleGlow = titleGlow1;
    this.container.addChild(titleGlow1);

    // Glow layer 2 - medium
    const titleGlow2 = new Text({
      text: "PAUSED",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 38,
        fill: COL_GOLD_BRIGHT,
        fontWeight: "bold",
        letterSpacing: 5,
      },
    });
    titleGlow2.anchor.set(0.5, 0);
    titleGlow2.position.set(sw / 2, titleY + 1);
    titleGlow2.alpha = 0.35;
    this.container.addChild(titleGlow2);

    // Main title text
    const title = new Text({
      text: "PAUSED",
      style: {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: 38,
        fill: COL_GOLD_BRIGHT,
        fontWeight: "bold",
        letterSpacing: 5,
      },
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, titleY + 1);
    this.container.addChild(title);

    // ── Ornamental line below title ──
    const lineY = titleY + 52;
    const lineW = panelW * 0.6;
    const lineXStart = sw / 2 - lineW / 2;
    const lineXEnd = sw / 2 + lineW / 2;
    const ornLine = new Graphics();

    // Left segment
    ornLine.moveTo(lineXStart, lineY);
    ornLine.lineTo(sw / 2 - 10, lineY);
    ornLine.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.5 });

    // Right segment
    ornLine.moveTo(sw / 2 + 10, lineY);
    ornLine.lineTo(lineXEnd, lineY);
    ornLine.stroke({ color: COL_GOLD, width: 1.5, alpha: 0.5 });

    // Center diamond accent
    const dSize = 5;
    ornLine.moveTo(sw / 2, lineY - dSize);
    ornLine.lineTo(sw / 2 + dSize, lineY);
    ornLine.lineTo(sw / 2, lineY + dSize);
    ornLine.lineTo(sw / 2 - dSize, lineY);
    ornLine.closePath();
    ornLine.fill({ color: COL_GOLD_BRIGHT, alpha: 0.7 });

    // Small end caps
    for (const ex of [lineXStart, lineXEnd]) {
      ornLine.circle(ex, lineY, 2);
      ornLine.fill({ color: COL_GOLD, alpha: 0.4 });
    }
    this.container.addChild(ornLine);

    // ── Menu items ──
    const startY = panelY + 100;
    const gap = 48;

    for (let i = 0; i < PAUSE_ITEMS.length; i++) {
      const y = startY + i * gap;
      const isSelected = i === this._selection;

      const barX = panelX + 20;
      const barW = panelW - 40;
      const barH = 38;
      const barY = y - barH / 2;

      if (isSelected) {
        // Selected item glow background
        const glowBg = new Graphics();
        glowBg.roundRect(barX - 3, barY - 3, barW + 6, barH + 6, 8);
        glowBg.fill({ color: COL_GOLD, alpha: 0.06 });
        this.container.addChild(glowBg);

        // Gradient-like fill: layered rects getting lighter toward center
        const gradBar = new Graphics();
        gradBar.roundRect(barX, barY, barW, barH, 6);
        gradBar.fill({ color: COL_ACCENT, alpha: 0.18 });
        gradBar.roundRect(barX + 4, barY + 3, barW - 8, barH - 6, 4);
        gradBar.fill({ color: COL_ACCENT, alpha: 0.08 });
        this.container.addChild(gradBar);

        // Animated gold border (pulsing)
        const glowBorder = new Graphics();
        glowBorder.roundRect(barX, barY, barW, barH, 6);
        glowBorder.stroke({ color: COL_GOLD_BRIGHT, width: 1.8, alpha: 0.7 });
        this._selectedGlow = glowBorder;
        this.container.addChild(glowBorder);

        // Chevron indicators
        const chevronL = new Text({
          text: "\u25B8",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 20,
            fill: COL_GOLD_BRIGHT,
            fontWeight: "bold",
          },
        });
        chevronL.anchor.set(0.5, 0.5);
        chevronL.position.set(barX + 16, y);
        this._selectedChevronL = chevronL;
        this.container.addChild(chevronL);

        const chevronR = new Text({
          text: "\u25C2",
          style: {
            fontFamily: 'Impact, "Arial Black", sans-serif',
            fontSize: 20,
            fill: COL_GOLD_BRIGHT,
            fontWeight: "bold",
          },
        });
        chevronR.anchor.set(0.5, 0.5);
        chevronR.position.set(barX + barW - 16, y);
        this._selectedChevronR = chevronR;
        this.container.addChild(chevronR);
      } else {
        // Unselected item - subtle dark panel
        const itemBg = new Graphics();
        itemBg.roundRect(barX, barY, barW, barH, 6);
        itemBg.fill({ color: COL_ITEM_BG, alpha: 0.6 });
        itemBg.stroke({ color: COL_BORDER, width: 1, alpha: 0.2 });
        this.container.addChild(itemBg);
      }

      const text = new Text({
        text: PAUSE_ITEMS[i],
        style: {
          fontFamily: 'Impact, "Arial Black", sans-serif',
          fontSize: isSelected ? 24 : 20,
          fill: isSelected ? COL_TEXT_SELECTED : COL_TEXT_NORMAL,
          fontWeight: "bold",
          letterSpacing: isSelected ? 2 : 0,
        },
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(sw / 2, y);
      this.container.addChild(text);
    }

    // ── Footer with panel background ──
    const footerPanelH = 28;
    const footerY = panelY + panelH - 38;

    const footerBg = new Graphics();
    footerBg.roundRect(panelX + 15, footerY - 4, panelW - 30, footerPanelH, 4);
    footerBg.fill({ color: COL_OVERLAY, alpha: 0.35 });
    footerBg.stroke({ color: COL_BORDER, width: 1, alpha: 0.15 });
    this.container.addChild(footerBg);

    const footer = new Text({
      text: "[\u2191/\u2193] Navigate   [ENTER] Select   [ESC] Resume",
      style: {
        fontFamily: "monospace",
        fontSize: 11,
        fill: 0x8888aa,
        letterSpacing: 0.5,
      },
    });
    footer.anchor.set(0.5, 0.5);
    footer.position.set(sw / 2, footerY + footerPanelH / 2 - 2);
    this.container.addChild(footer);
  }

  /** Draw diagonal scan lines pattern */
  private _drawScanLines(g: Graphics, sw: number, sh: number, offset: number): void {
    const spacing = 6;
    const diag = sw + sh;
    g.clear();
    for (let d = -sh + (offset % spacing); d < diag; d += spacing) {
      g.moveTo(d, 0);
      g.lineTo(d + sh, sh);
      g.stroke({ color: 0xffffff, width: 1, alpha: 1 });
    }
  }

  /** Update animated elements each frame */
  private _updateAnimations(): void {
    const t = this._animTime;

    // Pulse the selected item glow border alpha
    if (this._selectedGlow) {
      const pulse = 0.45 + 0.35 * Math.sin(t * 3.5);
      this._selectedGlow.alpha = pulse;
    }

    // Subtle chevron horizontal oscillation
    if (this._selectedChevronL) {
      this._selectedChevronL.x += Math.sin(t * 4) * 0.15 - Math.sin((t - Ticker.shared.deltaMS / 1000) * 4) * 0.15;
    }
    if (this._selectedChevronR) {
      this._selectedChevronR.x -= Math.sin(t * 4) * 0.15 - Math.sin((t - Ticker.shared.deltaMS / 1000) * 4) * 0.15;
    }

    // Animate scan lines by redrawing with offset
    if (this._scanLines) {
      const offset = (t * 15) % 6;
      this._drawScanLines(this._scanLines, this._screenW, this._screenH, offset);
    }

    // Title glow pulse
    if (this._titleGlow) {
      this._titleGlow.alpha = 0.15 + 0.12 * Math.sin(t * 2);
    }
  }

  private _cleanup(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._tickerCb) {
      Ticker.shared.remove(this._tickerCb);
      this._tickerCb = null;
    }
    this._scanLines = null;
    this._selectedGlow = null;
    this._titleGlow = null;
    this._selectedChevronL = null;
    this._selectedChevronR = null;
  }

  destroy(): void {
    this._cleanup();
    this.container.destroy({ children: true });
  }
}
