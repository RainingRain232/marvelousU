// Grail Blocks – PixiJS Renderer (medieval Tetris visuals)

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { GBState, GBPhase, PieceType } from "../types.ts";
import {
  GB_BALANCE as B,
  PIECE_COLORS,
  PIECE_COLOR_INDEX,
} from "../config/GBBalance.ts";
import { getMatrix, ghostY } from "../systems/GBPieceSystem.ts";
import { loadGBMeta } from "../state/GBState.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const C = B.CELL_SIZE;
const GRID_PX_W = B.GRID_W * C;
const GRID_PX_H = B.GRID_H * C;
const PANEL_W = 130; // side-panel width
const BORDER = 4;

// Colors
const COL_STONE_BG = 0x2a2a3a;
const COL_STONE_DARK = 0x1e1e2c;
const COL_GRID_LINE = 0x3a3a4e;
const COL_PARCHMENT = 0xd4c39a;
const COL_PARCHMENT_DARK = 0x8b7d5e;
const COL_WOOD = 0x5c3a1e;
const COL_GOLD = 0xffd700;
const COL_GOLD_DIM = 0x8b7500;
const COL_WHITE = 0xffffff;
const COL_GHOST = 0xffffff;

// Text styles
const TITLE_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 36,
  fontWeight: "bold",
  fill: COL_GOLD,
  stroke: { color: 0x000000, width: 4 },
  align: "center",
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 16,
  fill: COL_PARCHMENT,
  align: "center",
});

const HUD_LABEL_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 12,
  fontWeight: "bold",
  fill: COL_PARCHMENT_DARK,
});

const HUD_VALUE_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 18,
  fontWeight: "bold",
  fill: COL_PARCHMENT,
});

const GAMEOVER_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 40,
  fontWeight: "bold",
  fill: 0xff4444,
  stroke: { color: 0x000000, width: 5 },
  align: "center",
});

const NEWBEST_STYLE = new TextStyle({
  fontFamily: "serif",
  fontSize: 20,
  fontWeight: "bold",
  fill: COL_GOLD,
  align: "center",
});

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class GBRenderer {
  readonly root = new Container();

  // Layers
  private _bgLayer = new Container();
  private _ambientLayer = new Container(); // floating dust particles
  private _gridLayer = new Container();
  private _pieceLayer = new Container();
  private _fxLayer = new Container();
  private _uiLayer = new Container();
  private _lastDustTime = 0;

  // Cached dimensions
  private _sw = 0;
  private _sh = 0;
  private _gridX = 0;
  private _gridY = 0;

  // Line-clear flash state
  private _flashRows: number[] = [];
  private _flashAlpha = 0;

  // Grail power FX
  private _grailFlashAlpha = 0;

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  build(sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;
    this._gridX = Math.floor((sw - GRID_PX_W) / 2);
    this._gridY = Math.floor((sh - GRID_PX_H) / 2);

    this.root.removeChildren();
    this.root.addChild(this._bgLayer, this._ambientLayer, this._gridLayer, this._pieceLayer, this._fxLayer, this._uiLayer);

    this._drawBackground();
  }

  // -------------------------------------------------------------------------
  // Static background
  // -------------------------------------------------------------------------

  private _drawBackground(): void {
    this._bgLayer.removeChildren();
    const g = new Graphics();

    // Overall dark backdrop
    g.rect(0, 0, this._sw, this._sh).fill(0x111122);

    // Castle-wall stone pattern behind grid
    const gx = this._gridX - BORDER;
    const gy = this._gridY - BORDER;
    const gw = GRID_PX_W + BORDER * 2;
    const gh = GRID_PX_H + BORDER * 2;

    // ── Ornamental grid frame (matching side panel style) ──
    // Outer shadow
    g.roundRect(gx - 7, gy - 7, gw + 14, gh + 14, 4).fill({ color: 0x000000, alpha: 0.35 });
    // Wood frame
    g.roundRect(gx - 5, gy - 5, gw + 10, gh + 10, 3).fill(COL_WOOD);
    g.roundRect(gx - 5, gy - 5, gw + 10, gh + 10, 3).stroke({ color: 0x5a3a1a, width: 1 });
    // Frame highlight (top/left)
    g.rect(gx - 4, gy - 4, gw + 8, 2).fill({ color: 0x8b6914, alpha: 0.4 });
    g.rect(gx - 4, gy - 4, 2, gh + 8).fill({ color: 0x8b6914, alpha: 0.3 });
    // Frame shadow (bottom/right)
    g.rect(gx - 4, gy + gh + 2, gw + 8, 2).fill({ color: 0x2a1a08, alpha: 0.4 });
    g.rect(gx + gw + 2, gy - 4, 2, gh + 8).fill({ color: 0x2a1a08, alpha: 0.3 });
    // Inner fill (stone)
    g.roundRect(gx, gy, gw, gh, 2).fill(COL_STONE_BG);
    // Inner bevel
    g.rect(gx + 1, gy + 1, gw - 2, 1).fill({ color: 0x4a4550, alpha: 0.4 });
    g.rect(gx + 1, gy + 1, 1, gh - 2).fill({ color: 0x4a4550, alpha: 0.3 });
    // Corner studs (golden rivets)
    for (const [sx, sy] of [[gx - 2, gy - 2], [gx + gw - 1, gy - 2], [gx - 2, gy + gh - 1], [gx + gw - 1, gy + gh - 1]]) {
      g.circle(sx + 1, sy + 1, 3.5).fill({ color: 0xddaa44, alpha: 0.7 });
      g.circle(sx + 1, sy + 1, 3.5).stroke({ color: 0xffcc66, width: 0.6, alpha: 0.5 });
      g.circle(sx + 0.5, sy + 0.5, 1.2).fill({ color: 0xffee88, alpha: 0.4 });
    }
    // Midpoint studs (4 more along edges)
    for (const [sx, sy] of [[gx + gw / 2, gy - 3], [gx + gw / 2, gy + gh], [gx - 3, gy + gh / 2], [gx + gw, gy + gh / 2]]) {
      g.circle(sx, sy, 2.5).fill({ color: 0xcc9944, alpha: 0.5 });
      g.circle(sx, sy, 2.5).stroke({ color: 0xddaa66, width: 0.5, alpha: 0.4 });
    }

    // Stone pattern: draw subtle horizontal lines for mortar
    for (let row = 0; row < B.GRID_H; row++) {
      const cy = this._gridY + row * C;
      // Alternate offset for brick pattern
      const offset = row % 2 === 0 ? 0 : C / 2;
      for (let col = -1; col <= B.GRID_W; col++) {
        const cx = this._gridX + col * C + offset;
        g.rect(cx + 1, cy + 1, C - 2, C - 2).fill(COL_STONE_DARK);
      }
    }

    // Left panel frame (hold piece)
    const lpx = this._gridX - PANEL_W - 16;
    const lpy = this._gridY;
    this._drawPanelFrame(g, lpx, lpy, PANEL_W, 160);

    // Right panel frame (next + HUD)
    const rpx = this._gridX + GRID_PX_W + 16;
    const rpy = this._gridY;
    this._drawPanelFrame(g, rpx, rpy, PANEL_W, GRID_PX_H);

    this._bgLayer.addChild(g);
  }

  private _drawPanelFrame(g: Graphics, x: number, y: number, w: number, h: number): void {
    // Outer shadow
    g.roundRect(x - 5, y - 5, w + 10, h + 10, 4).fill({ color: 0x000000, alpha: 0.3 });
    // Wood frame (layered for depth)
    g.roundRect(x - 4, y - 4, w + 8, h + 8, 3).fill(COL_WOOD);
    g.roundRect(x - 4, y - 4, w + 8, h + 8, 3).stroke({ color: 0x5a3a1a, width: 1 });
    // Inner wood highlight (top/left)
    g.rect(x - 3, y - 3, w + 6, 2).fill({ color: 0x8b6914, alpha: 0.4 });
    g.rect(x - 3, y - 3, 2, h + 6).fill({ color: 0x8b6914, alpha: 0.3 });
    // Inner wood shadow (bottom/right)
    g.rect(x - 3, y + h + 1, w + 6, 2).fill({ color: 0x2a1a08, alpha: 0.4 });
    g.rect(x + w + 1, y - 3, 2, h + 6).fill({ color: 0x2a1a08, alpha: 0.3 });
    // Parchment/stone inner
    g.roundRect(x, y, w, h, 2).fill(0x3a3540);
    // Inner bevel (subtle)
    g.rect(x + 1, y + 1, w - 2, 1).fill({ color: 0x4a4550, alpha: 0.5 });
    g.rect(x + 1, y + 1, 1, h - 2).fill({ color: 0x4a4550, alpha: 0.4 });
    // Corner studs (golden rivets)
    const stud = 3;
    for (const [sx, sy] of [[x - 1, y - 1], [x + w - 2, y - 1], [x - 1, y + h - 2], [x + w - 2, y + h - 2]]) {
      g.circle(sx + 1, sy + 1, stud).fill({ color: 0xddaa44, alpha: 0.7 });
      g.circle(sx + 1, sy + 1, stud).stroke({ color: 0xffcc66, width: 0.6, alpha: 0.5 });
      g.circle(sx + 0.5, sy + 0.5, 1).fill({ color: 0xffee88, alpha: 0.4 }); // highlight dot
    }
    // Decorative horizontal groove near top
    g.moveTo(x + 8, y + 6).lineTo(x + w - 8, y + 6).stroke({ color: 0x4a4550, width: 0.8, alpha: 0.3 });
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  render(state: GBState): void {
    this._gridLayer.removeChildren();
    this._pieceLayer.removeChildren();
    this._uiLayer.removeChildren();

    // Ambient dust particles (spawn continuously, managed by gsap lifecycle)
    if (state.phase === GBPhase.PLAYING && state.time - this._lastDustTime > 0.4 && this._ambientLayer.children.length < 12) {
      this._lastDustTime = state.time;
      const dust = new Graphics();
      const dx = this._gridX + Math.random() * GRID_PX_W;
      const dy = this._gridY - 5;
      dust.circle(0, 0, 1 + Math.random() * 1.5);
      dust.fill({ color: [0xaabb99, 0x99aa88, 0xbbccaa][Math.floor(Math.random() * 3)], alpha: 0.06 + Math.random() * 0.06 });
      dust.position.set(dx, dy);
      this._ambientLayer.addChild(dust);
      gsap.to(dust, {
        y: dy + GRID_PX_H + 10,
        x: dx + (Math.random() - 0.5) * 30,
        duration: 3 + Math.random() * 2,
        ease: "none",
        onComplete: () => { this._ambientLayer.removeChild(dust); },
      });
    }

    if (state.phase === GBPhase.MENU) {
      this._renderMenu(state);
      return;
    }

    this._renderGrid(state);
    this._renderActivePiece(state);
    this._renderNextPiece(state);
    this._renderHeldPiece(state);
    this._renderHUD(state);
    this._renderFX();

    if (state.phase === GBPhase.PAUSED) {
      this._renderPauseOverlay();
    } else if (state.phase === GBPhase.GAME_OVER) {
      this._renderGameOver(state);
    }
  }

  // -------------------------------------------------------------------------
  // Grid
  // -------------------------------------------------------------------------

  private _renderGrid(state: GBState): void {
    const g = new Graphics();
    const gx = this._gridX;
    const gy = this._gridY;

    for (let r = 0; r < B.GRID_H; r++) {
      for (let c = 0; c < B.GRID_W; c++) {
        const val = state.grid[r][c];
        const cx = gx + c * C;
        const cy = gy + r * C;

        if (val === 0) {
          // Empty cell: dark with subtle grid lines
          g.rect(cx, cy, C, C).fill(COL_STONE_DARK);
          g.rect(cx, cy, C, 1).fill({ color: COL_GRID_LINE, alpha: 0.3 });
          g.rect(cx, cy, 1, C).fill({ color: COL_GRID_LINE, alpha: 0.3 });
        } else {
          // Filled cell: colored stone block with bevel
          this._drawBlock(g, cx, cy, PIECE_COLORS[val]);
        }
      }
    }

    // Danger zone: red tint on top 4 rows when stack is high
    let dangerActive = false;
    for (let r = 0; r < 4; r++) {
      if (state.grid[r].some(cell => cell !== 0)) { dangerActive = true; break; }
    }
    if (dangerActive) {
      const dangerG = new Graphics();
      for (let r = 0; r < 4; r++) {
        const alpha = 0.12 - r * 0.025;
        dangerG.rect(gx, gy + r * C, B.GRID_W * C, C).fill({ color: 0xff0000, alpha });
      }
      // Pulsing border at top
      const pulseAlpha = 0.3 + Math.sin(state.time * 6) * 0.15;
      dangerG.rect(gx, gy, B.GRID_W * C, 2).fill({ color: 0xff2222, alpha: pulseAlpha });
      this._gridLayer.addChild(dangerG);
    }

    this._gridLayer.addChild(g);
  }

  /** Draw a single beveled block (3D stone look). */
  private _drawBlock(g: Graphics, x: number, y: number, color: number, alpha = 1): void {
    const size = C;
    const bevel = 3;

    // Main face
    g.rect(x, y, size, size).fill({ color, alpha });

    // Highlight edge (top + left)
    const light = this._lighten(color, 0.4);
    g.rect(x, y, size, bevel).fill({ color: light, alpha: alpha * 0.8 });
    g.rect(x, y, bevel, size).fill({ color: light, alpha: alpha * 0.6 });

    // Shadow edge (bottom + right)
    const dark = this._darken(color, 0.4);
    g.rect(x, y + size - bevel, size, bevel).fill({ color: dark, alpha: alpha * 0.8 });
    g.rect(x + size - bevel, y, bevel, size).fill({ color: dark, alpha: alpha * 0.6 });

    // Inner detail (slight inset)
    g.rect(x + bevel, y + bevel, size - bevel * 2, size - bevel * 2).fill({ color, alpha });
  }

  // -------------------------------------------------------------------------
  // Active piece + ghost
  // -------------------------------------------------------------------------

  private _renderActivePiece(state: GBState): void {
    const p = state.activePiece;
    if (!p) return;

    const g = new Graphics();
    const mat = getMatrix(p.type, p.rotation);
    const colorIdx = PIECE_COLOR_INDEX[p.type];
    const color = PIECE_COLORS[colorIdx];

    // Ghost piece (stronger visibility — tinted by piece color)
    const gY = ghostY(state.grid, p);
    if (gY !== p.y) {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (!mat[r][c]) continue;
          const cx = this._gridX + (p.x + c) * C;
          const cy = this._gridY + (gY + r) * C;
          // Colored ghost fill + dashed border
          g.rect(cx + 1, cy + 1, C - 2, C - 2).fill({ color, alpha: 0.12 });
          g.rect(cx + 1, cy + 1, C - 2, C - 2).stroke({ color, alpha: 0.4, width: 1.5 });
          // Corner dots for dotted-border feel
          g.circle(cx + 2, cy + 2, 1).fill({ color: COL_GHOST, alpha: 0.3 });
          g.circle(cx + C - 3, cy + 2, 1).fill({ color: COL_GHOST, alpha: 0.3 });
          g.circle(cx + 2, cy + C - 3, 1).fill({ color: COL_GHOST, alpha: 0.3 });
          g.circle(cx + C - 3, cy + C - 3, 1).fill({ color: COL_GHOST, alpha: 0.3 });
        }
      }
    }

    // Active piece
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!mat[r][c]) continue;
        const cx = this._gridX + (p.x + c) * C;
        const cy = this._gridY + (p.y + r) * C;
        this._drawBlock(g, cx, cy, color);
      }
    }

    this._pieceLayer.addChild(g);
  }

  // -------------------------------------------------------------------------
  // Next piece preview
  // -------------------------------------------------------------------------

  private _renderNextPiece(state: GBState): void {
    const rpx = this._gridX + GRID_PX_W + 16;
    const rpy = this._gridY;

    const label = new Text({ text: "NEXT", style: HUD_LABEL_STYLE });
    label.x = rpx + 10;
    label.y = rpy + 10;
    this._uiLayer.addChild(label);

    // Show 3 upcoming pieces stacked vertically
    for (let i = 0; i < Math.min(state.nextQueue.length, 3); i++) {
      this._drawMiniPiece(state.nextQueue[i], rpx + 20, rpy + 35 + i * 55);
      // Dim pieces further in queue
      if (i > 0) {
        const dimOverlay = new Graphics();
        dimOverlay.rect(rpx + 10, rpy + 30 + i * 55, 50, 45).fill({ color: 0x000000, alpha: 0.15 * i });
        this._uiLayer.addChild(dimOverlay);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Held piece
  // -------------------------------------------------------------------------

  private _renderHeldPiece(state: GBState): void {
    const lpx = this._gridX - PANEL_W - 16;
    const lpy = this._gridY;

    const label = new Text({ text: "HOLD", style: HUD_LABEL_STYLE });
    label.x = lpx + 10;
    label.y = lpy + 10;
    this._uiLayer.addChild(label);

    if (state.heldPiece) {
      const alpha = state.canHold ? 1 : 0.4;
      this._drawMiniPiece(state.heldPiece, lpx + 20, lpy + 35, alpha);
    }
  }

  /** Draw a small piece preview in a side panel. */
  private _drawMiniPiece(type: PieceType, px: number, py: number, alpha = 1): void {
    const g = new Graphics();
    const mat = getMatrix(type, 0);
    const colorIdx = PIECE_COLOR_INDEX[type];
    const color = PIECE_COLORS[colorIdx];
    const miniC = C * 0.75;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!mat[r][c]) continue;
        const cx = px + c * miniC;
        const cy = py + r * miniC;
        // Simplified bevel for mini blocks
        g.rect(cx, cy, miniC, miniC).fill({ color, alpha });
        const light = this._lighten(color, 0.3);
        g.rect(cx, cy, miniC, 2).fill({ color: light, alpha: alpha * 0.7 });
        g.rect(cx, cy, 2, miniC).fill({ color: light, alpha: alpha * 0.5 });
        const dark = this._darken(color, 0.3);
        g.rect(cx, cy + miniC - 2, miniC, 2).fill({ color: dark, alpha: alpha * 0.7 });
        g.rect(cx + miniC - 2, cy, 2, miniC).fill({ color: dark, alpha: alpha * 0.5 });
      }
    }

    this._uiLayer.addChild(g);
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------

  private _renderHUD(state: GBState): void {
    const rpx = this._gridX + GRID_PX_W + 16;
    const rpy = this._gridY;

    let yOff = 130;
    const linesDisplay = state.mode === "sprint"
      ? `${state.linesCleared}/${state.sprintTarget}`
      : `${state.linesCleared}`;
    const entries: [string, string | number][] = [
      ["SCORE", state.score],
      ["LEVEL", state.level],
      ["LINES", linesDisplay],
      ["COMBO", state.combo > 0 ? `x${state.combo}` : "-"],
      ["B2B", state.b2bCount > 1 ? `x${state.b2bCount}` : "-"],
    ];

    for (const [label, value] of entries) {
      const lbl = new Text({ text: label, style: HUD_LABEL_STYLE });
      lbl.x = rpx + 10;
      lbl.y = rpy + yOff;
      this._uiLayer.addChild(lbl);

      const val = new Text({ text: String(value), style: HUD_VALUE_STYLE });
      val.x = rpx + 10;
      val.y = rpy + yOff + 16;
      this._uiLayer.addChild(val);

      yOff += 50;
    }

    // High score
    yOff += 10;
    const hsLbl = new Text({ text: "HIGH", style: HUD_LABEL_STYLE });
    hsLbl.x = rpx + 10;
    hsLbl.y = rpy + yOff;
    this._uiLayer.addChild(hsLbl);

    const hsVal = new Text({ text: String(state.highScore), style: HUD_VALUE_STYLE });
    hsVal.x = rpx + 10;
    hsVal.y = rpy + yOff + 16;
    this._uiLayer.addChild(hsVal);

    // Grail Power meter
    yOff += 60;
    this._renderGrailMeter(state, rpx + 10, rpy + yOff);
  }

  private _renderGrailMeter(state: GBState, x: number, y: number): void {
    const meterW = PANEL_W - 20;
    const meterH = 20;
    const fill = state.grailPower / state.grailPowerMax;

    const g = new Graphics();

    // Label
    const lbl = new Text({ text: "GRAIL POWER", style: HUD_LABEL_STYLE });
    lbl.x = x;
    lbl.y = y - 16;
    this._uiLayer.addChild(lbl);

    // Background
    g.rect(x, y, meterW, meterH).fill(0x222233);
    g.rect(x, y, meterW, meterH).stroke({ color: COL_WOOD, width: 2 });

    // Fill bar
    if (fill > 0) {
      const barColor = fill >= 1.0 ? COL_GOLD : COL_GOLD_DIM;
      g.rect(x + 2, y + 2, (meterW - 4) * fill, meterH - 4).fill(barColor);
      // Highlight shine on fill bar
      g.rect(x + 3, y + 3, (meterW - 6) * fill, 3).fill({ color: 0xffffff, alpha: 0.15 });
    }

    // Pulsing glow when full
    if (state.grailPower >= state.grailPowerMax) {
      const pulseAlpha = 0.15 + Math.sin(state.time * 5) * 0.1;
      g.rect(x - 2, y - 2, meterW + 4, meterH + 4).fill({ color: COL_GOLD, alpha: pulseAlpha });
      // "READY" text
      const ready = new Text({
        text: "[G] READY!",
        style: new TextStyle({ fontFamily: "serif", fontSize: 11, fontWeight: "bold", fill: 0x000000 }),
      });
      ready.x = x + meterW / 2 - ready.width / 2;
      ready.y = y + 2;
      this._uiLayer.addChild(ready);
    }

    this._uiLayer.addChild(g);

    // Controls hint at bottom of right panel
    const rpx = this._gridX + GRID_PX_W + 16;
    const hintY = this._gridY + GRID_PX_H - 80;
    const hints = [
      "Arrows: Move/Drop",
      "Up: Rotate",
      "Space: Hard Drop",
      "C: Hold | G: Grail",
      "Esc: Pause",
    ];
    for (let i = 0; i < hints.length; i++) {
      const t = new Text({
        text: hints[i],
        style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0x888888 }),
      });
      t.x = rpx + 10;
      t.y = hintY + i * 14;
      this._uiLayer.addChild(t);
    }
  }

  // -------------------------------------------------------------------------
  // Menu screen
  // -------------------------------------------------------------------------

  private _renderMenu(state: GBState): void {
    const cx = this._sw / 2;
    const cy = this._sh / 2;

    // Darken background
    const overlay = new Graphics();
    overlay.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.7 });
    this._uiLayer.addChild(overlay);

    // ── Decorative medieval art ──
    const deco = new Graphics();

    // Grail chalice icon (center above title)
    const gx = cx;
    const gy = cy - 130;
    // Cup
    deco.moveTo(gx - 12, gy - 4);
    deco.quadraticCurveTo(gx - 14, gy + 4, gx - 10, gy + 16);
    deco.lineTo(gx + 10, gy + 16);
    deco.quadraticCurveTo(gx + 14, gy + 4, gx + 12, gy - 4);
    deco.closePath();
    deco.fill({ color: COL_GOLD, alpha: 0.6 });
    deco.stroke({ color: COL_GOLD, width: 1 });
    // Rim
    deco.ellipse(gx, gy - 4, 13, 3).stroke({ color: COL_GOLD, width: 1, alpha: 0.5 });
    // Stem
    deco.rect(gx - 2, gy + 16, 4, 8).fill({ color: COL_GOLD_DIM, alpha: 0.5 });
    // Base
    deco.ellipse(gx, gy + 26, 10, 3).fill({ color: COL_GOLD_DIM, alpha: 0.5 });
    // Light rays
    for (let r = 0; r < 6; r++) {
      const angle = (-Math.PI * 0.85) + (r / 5) * Math.PI * 0.7;
      deco.moveTo(gx, gy - 6);
      deco.lineTo(gx + Math.cos(angle) * 22, gy - 6 + Math.sin(angle) * 22);
      deco.stroke({ color: COL_GOLD, width: 1, alpha: 0.15 });
    }

    // Decorative divider lines (above and below title)
    const lineW = 140;
    // Top line
    deco.moveTo(cx - lineW, cy - 95).lineTo(cx + lineW, cy - 95).stroke({ color: COL_GOLD_DIM, width: 0.8, alpha: 0.3 });
    // Diamond endpoints
    for (const dx of [-lineW, lineW]) {
      deco.moveTo(cx + dx, cy - 95 - 4).lineTo(cx + dx + 4, cy - 95).lineTo(cx + dx, cy - 95 + 4).lineTo(cx + dx - 4, cy - 95).closePath();
      deco.fill({ color: COL_GOLD_DIM, alpha: 0.3 });
    }
    // Bottom line
    deco.moveTo(cx - lineW, cy - 60).lineTo(cx + lineW, cy - 60).stroke({ color: COL_GOLD_DIM, width: 0.8, alpha: 0.3 });
    for (const dx of [-lineW, lineW]) {
      deco.moveTo(cx + dx, cy - 60 - 4).lineTo(cx + dx + 4, cy - 60).lineTo(cx + dx, cy - 60 + 4).lineTo(cx + dx - 4, cy - 60).closePath();
      deco.fill({ color: COL_GOLD_DIM, alpha: 0.3 });
    }

    // Corner shields (small kite shields in corners)
    for (const [sx, sy] of [[cx - 180, cy - 100], [cx + 180, cy - 100]]) {
      deco.moveTo(sx, sy - 8).lineTo(sx + 6, sy - 4).lineTo(sx + 5, sy + 4).lineTo(sx, sy + 8).lineTo(sx - 5, sy + 4).lineTo(sx - 6, sy - 4).closePath();
      deco.fill({ color: 0x3355aa, alpha: 0.3 });
      deco.stroke({ color: 0x5577cc, width: 0.8, alpha: 0.3 });
      // Cross on shield
      deco.rect(sx - 0.5, sy - 4, 1, 8).fill({ color: 0xdddddd, alpha: 0.2 });
      deco.rect(sx - 3, sy - 0.5, 6, 1).fill({ color: 0xdddddd, alpha: 0.2 });
    }

    this._uiLayer.addChild(deco);

    // Title
    const title = new Text({ text: "GRAIL BLOCKS", style: TITLE_STYLE });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 80;
    this._uiLayer.addChild(title);

    // Subtitle
    const sub = new Text({
      text: "A Medieval Puzzle",
      style: new TextStyle({ fontFamily: "serif", fontSize: 18, fontStyle: "italic", fill: COL_PARCHMENT_DARK }),
    });
    sub.anchor.set(0.5);
    sub.x = cx;
    sub.y = cy - 40;
    this._uiLayer.addChild(sub);

    // High score + sprint best
    const menuMeta = loadGBMeta();
    const bestTexts: string[] = [];
    if (state.highScore > 0) bestTexts.push(`Best Score: ${state.highScore}`);
    if (menuMeta.sprintBestTime > 0) {
      const bm = Math.floor(menuMeta.sprintBestTime / 60);
      const bs = Math.floor(menuMeta.sprintBestTime % 60);
      bestTexts.push(`Sprint Best: ${bm > 0 ? bm + "m " : ""}${bs}s`);
    }
    if (bestTexts.length > 0) {
      const hs = new Text({
        text: bestTexts.join("  |  "),
        style: new TextStyle({ fontFamily: "serif", fontSize: 14, fill: COL_GOLD }),
      });
      hs.anchor.set(0.5);
      hs.x = cx;
      hs.y = cy;
      this._uiLayer.addChild(hs);
    }

    // Prompt
    const prompt = new Text({ text: "PRESS SPACE TO START", style: SUBTITLE_STYLE });
    prompt.anchor.set(0.5);
    prompt.x = cx;
    prompt.y = cy + 40;
    prompt.alpha = 0.7 + 0.3 * Math.sin(Date.now() / 400);
    this._uiLayer.addChild(prompt);

    // Mode selector
    const modeLabel = state.mode === "marathon" ? "MARATHON (Endless)" : `SPRINT (${state.sprintTarget} Lines)`;
    const modeTxt = new Text({
      text: `Mode: ${modeLabel}   [M to toggle]`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: state.mode === "marathon" ? 0x88aacc : 0xffaa44, align: "center" }),
    });
    modeTxt.anchor.set(0.5);
    modeTxt.x = cx;
    modeTxt.y = cy + 65;
    this._uiLayer.addChild(modeTxt);

    // Controls
    const controls = new Text({
      text: "Arrows: Move | Up/Z: Rotate CW/CCW | Space: Drop\nC: Hold | G: Grail Power | M: Mode | Esc: Pause\nMarathon: Garbage lines rise from Lv.5!",
      style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x888888, align: "center" }),
    });
    controls.anchor.set(0.5);
    controls.x = cx;
    controls.y = cy + 90;
    this._uiLayer.addChild(controls);
  }

  // -------------------------------------------------------------------------
  // Pause overlay
  // -------------------------------------------------------------------------

  private _renderPauseOverlay(): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.5 });
    this._uiLayer.addChild(overlay);

    const text = new Text({
      text: "PAUSED",
      style: new TextStyle({
        fontFamily: "serif", fontSize: 36, fontWeight: "bold",
        fill: COL_PARCHMENT, stroke: { color: 0x000000, width: 4 },
      }),
    });
    text.anchor.set(0.5);
    text.x = this._sw / 2;
    text.y = this._sh / 2;
    this._uiLayer.addChild(text);

    const hint = new Text({ text: "Press Escape to resume", style: SUBTITLE_STYLE });
    hint.anchor.set(0.5);
    hint.x = this._sw / 2;
    hint.y = this._sh / 2 + 40;
    this._uiLayer.addChild(hint);
  }

  // -------------------------------------------------------------------------
  // Game over screen
  // -------------------------------------------------------------------------

  private _renderGameOver(state: GBState): void {
    const cx = this._sw / 2;
    const cy = this._sh / 2;

    const overlay = new Graphics();
    overlay.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.65 });
    // Red vignette tint (defeat mood)
    overlay.rect(0, 0, this._sw, 30).fill({ color: 0x880000, alpha: 0.12 });
    overlay.rect(0, this._sh - 30, this._sw, 30).fill({ color: 0x880000, alpha: 0.12 });
    this._uiLayer.addChild(overlay);

    // Decorative broken sword icon
    const deco = new Graphics();
    const ix = cx;
    const iy = cy - 100;
    // Lower blade
    deco.rect(ix - 2, iy + 4, 4, 16).fill({ color: 0x888899, alpha: 0.5 });
    // Crossguard
    deco.moveTo(ix - 8, iy + 18).lineTo(ix - 10, iy + 20).lineTo(ix - 8, iy + 22).lineTo(ix + 8, iy + 22).lineTo(ix + 10, iy + 20).lineTo(ix + 8, iy + 18).closePath().fill({ color: 0x8b6914, alpha: 0.5 });
    // Grip
    deco.rect(ix - 1.5, iy + 22, 3, 8).fill({ color: 0x5d3a1a, alpha: 0.4 });
    // Pommel
    deco.circle(ix, iy + 32, 2.5).fill({ color: 0x888888, alpha: 0.4 });
    // Broken upper blade (tilted)
    deco.moveTo(ix - 1, iy + 2).lineTo(ix + 4, iy - 10).lineTo(ix + 6, iy - 8).lineTo(ix + 3, iy + 2).closePath().fill({ color: 0x777788, alpha: 0.4 });
    // Break sparks
    deco.circle(ix + 1, iy + 3, 2).fill({ color: 0xffaa44, alpha: 0.3 });
    // Divider line
    deco.moveTo(cx - 80, cy - 78).lineTo(cx + 80, cy - 78).stroke({ color: 0xff4444, width: 0.8, alpha: 0.3 });
    this._uiLayer.addChild(deco);

    const title = new Text({ text: "GAME OVER", style: GAMEOVER_STYLE });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = cy - 65;
    this._uiLayer.addChild(title);

    // Sprint mode victory check
    const sprintWon = state.mode === "sprint" && state.linesCleared >= state.sprintTarget;
    if (sprintWon) {
      title.text = "SPRINT COMPLETE!";
      title.style.fill = 0xffd700;
    }

    // Stats
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const lpm = state.time > 0 ? (state.linesCleared / (state.time / 60)).toFixed(1) : "0.0";
    const pps = state.time > 0 ? (state.piecesPlaced / state.time).toFixed(1) : "0.0";
    // Sprint best time comparison
    const meta = loadGBMeta();
    let sprintBestStr = "";
    if (sprintWon && meta.sprintBestTime > 0) {
      const bm = Math.floor(meta.sprintBestTime / 60);
      const bs = Math.floor(meta.sprintBestTime % 60);
      sprintBestStr = bm > 0 ? `${bm}m ${bs}s` : `${bs}s`;
      const isNewBestTime = state.time <= meta.sprintBestTime;
      if (isNewBestTime) sprintBestStr = `${sprintBestStr} NEW BEST!`;
    }

    const stats = [
      `Score: ${state.score}`,
      `Level: ${state.level}`,
      `Lines: ${state.linesCleared}${state.mode === "sprint" ? " / " + state.sprintTarget : ""}`,
      `Pieces: ${state.piecesPlaced}  Time: ${timeStr}`,
      `${lpm} Lines/Min  ${pps} Pieces/Sec`,
      ...(sprintWon && meta.sprintBestTime > 0 ? [`Best Sprint: ${sprintBestStr}`] : []),
    ];
    for (let i = 0; i < stats.length; i++) {
      const t = new Text({
        text: stats[i],
        style: new TextStyle({ fontFamily: "serif", fontSize: 18, fill: COL_PARCHMENT }),
      });
      t.anchor.set(0.5);
      t.x = cx;
      t.y = cy - 15 + i * 28;
      this._uiLayer.addChild(t);
    }

    // New best
    if (state.score >= state.highScore && state.score > 0) {
      const best = new Text({ text: "NEW BEST!", style: NEWBEST_STYLE });
      best.anchor.set(0.5);
      best.x = cx;
      best.y = cy + 75;
      best.alpha = 0.6 + 0.4 * Math.sin(Date.now() / 300);
      this._uiLayer.addChild(best);
    }

    // Restart prompt
    const prompt = new Text({ text: "PRESS SPACE TO RESTART", style: SUBTITLE_STYLE });
    prompt.anchor.set(0.5);
    prompt.x = cx;
    prompt.y = cy + 110;
    prompt.alpha = 0.7 + 0.3 * Math.sin(Date.now() / 400);
    this._uiLayer.addChild(prompt);
  }

  // -------------------------------------------------------------------------
  // FX: line clear flash & grail power
  // -------------------------------------------------------------------------

  /** Trigger a line-clear flash for the given rows. */
  triggerLineClearFX(rows: number[]): void {
    this._flashRows = rows;
    this._flashAlpha = 1;
    gsap.to(this, { _flashAlpha: 0, duration: 0.3, ease: "power2.out" });
  }

  /** Show line clear text popup (T-SPIN, TETRIS, B2B, etc.) */
  spawnClearText(text: string, lines: number): void {
    const colors = [0xffffff, 0xffee44, 0xff8844, 0xff4444, 0xffd700];
    const color = lines >= 4 ? colors[4] : text.includes("T-SPIN") ? colors[3] : text.includes("B2B") ? colors[4] : colors[Math.min(lines, 4)];
    const size = 14 + lines * 3;
    const txt = new Text({
      text,
      style: new TextStyle({ fontFamily: "monospace", fontSize: size, fill: color, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    const cx = this._gridX + (B.GRID_W * B.CELL_SIZE) / 2;
    const cy = this._gridY + B.GRID_H * B.CELL_SIZE * 0.4;
    txt.position.set(cx, cy);
    txt.scale.set(0.4);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.3, y: 1.3, duration: 0.15, ease: "back.out(3)" });
    gsap.to(txt, { y: cy - 30, alpha: 0, duration: 0.8, delay: 0.3, onComplete: () => { this._fxLayer.removeChild(txt); } });

    // Sparkle particles for big clears
    if (lines >= 3 || text.includes("T-SPIN")) {
      for (let i = 0; i < lines * 3; i++) {
        const p = new Graphics();
        p.circle(0, 0, 2).fill({ color, alpha: 0.7 });
        p.position.set(cx + (Math.random() - 0.5) * 80, cy);
        this._fxLayer.addChild(p);
        gsap.to(p, { x: p.x + (Math.random() - 0.5) * 60, y: p.y - 20 - Math.random() * 30, alpha: 0, duration: 0.4 + Math.random() * 0.2,
          onComplete: () => { this._fxLayer.removeChild(p); } });
      }
    }
  }

  /** Particles when a piece locks into place. */
  /** Floating score popup near the right HUD panel. */
  spawnScorePopup(points: number): void {
    if (points <= 0) return;
    const rpx = this._gridX + GRID_PX_W + 24;
    const rpy = this._gridY + 140;
    const color = points >= 800 ? 0xffd700 : points >= 300 ? 0xffaa44 : 0xffffff;
    const size = points >= 800 ? 16 : points >= 300 ? 14 : 12;
    const txt = new Text({
      text: `+${points}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: size, fill: color, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }),
    });
    txt.anchor.set(0, 0.5);
    txt.position.set(rpx, rpy);
    txt.scale.set(0.5);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.1, y: 1.1, duration: 0.1, ease: "back.out(2)" });
    gsap.to(txt, { y: rpy - 20, alpha: 0, duration: 0.6, delay: 0.15, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  spawnLockParticles(gridPxX: number, gridPxY: number): void {
    const x = this._gridX + gridPxX;
    const y = this._gridY + gridPxY;
    for (let i = 0; i < 6; i++) {
      const p = new Graphics();
      p.circle(0, 0, 1.5 + Math.random()).fill({ color: [0xaabbcc, 0x8899aa, 0xccddee][i % 3], alpha: 0.6 });
      p.position.set(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20);
      this._fxLayer.addChild(p);
      gsap.to(p, { y: p.y + 5 + Math.random() * 8, x: p.x + (Math.random() - 0.5) * 12, alpha: 0, duration: 0.25 + Math.random() * 0.15,
        onComplete: () => { this._fxLayer.removeChild(p); } });
    }
  }

  /** Level-up celebration text + flash. */
  spawnLevelUp(level: number): void {
    const cx = this._gridX + GRID_PX_W / 2;
    const cy = this._gridY + GRID_PX_H * 0.3;
    // Flash
    const flash = new Graphics();
    flash.rect(this._gridX, this._gridY, GRID_PX_W, GRID_PX_H).fill({ color: 0xffd700, alpha: 0.15 });
    this._fxLayer.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(flash); } });
    // Text
    const txt = new Text({
      text: `LEVEL ${level}!`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffd700, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 4, distance: 1, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(cx, cy);
    txt.scale.set(0.4);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.4, y: 1.4, duration: 0.2, ease: "back.out(3)" });
    gsap.to(txt, { y: cy - 25, alpha: 0, duration: 1.0, delay: 0.4, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  /** New high score notification during gameplay. */
  spawnNewRecord(): void {
    const cx = this._gridX + GRID_PX_W / 2;
    const cy = this._gridY + GRID_PX_H * 0.2;
    // Crown icon
    const crown = new Graphics();
    crown.moveTo(cx - 12, cy - 20).lineTo(cx - 12, cy - 30).lineTo(cx - 6, cy - 25).lineTo(cx, cy - 32).lineTo(cx + 6, cy - 25).lineTo(cx + 12, cy - 30).lineTo(cx + 12, cy - 20).closePath();
    crown.fill({ color: 0xffd700, alpha: 0.8 });
    this._fxLayer.addChild(crown);
    gsap.to(crown, { y: cy - 35, alpha: 0, duration: 1.5, delay: 0.5, onComplete: () => { this._fxLayer.removeChild(crown); } });
    // Text
    const txt = new Text({
      text: "NEW RECORD!",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(cx, cy);
    txt.scale.set(0.3);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.2, y: 1.2, duration: 0.2, ease: "back.out(3)" });
    gsap.to(txt, { y: cy - 20, alpha: 0, duration: 1.5, delay: 0.6, onComplete: () => { this._fxLayer.removeChild(txt); } });
    // Sparkles
    for (let i = 0; i < 8; i++) {
      const s = new Graphics();
      s.circle(0, 0, 2).fill({ color: [0xffd700, 0xffee88][i % 2], alpha: 0.8 });
      s.position.set(cx + (Math.random() - 0.5) * 60, cy);
      this._fxLayer.addChild(s);
      gsap.to(s, { y: s.y - 15 - Math.random() * 20, x: s.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 0.5 + Math.random() * 0.3,
        onComplete: () => { this._fxLayer.removeChild(s); } });
    }
  }

  /** Hard drop trail — streak from start Y to landing Y. */
  spawnHardDropTrail(pieceX: number, startRow: number, endRow: number, type: PieceType, rotation: number): void {
    const mat = getMatrix(type, rotation);
    const colorIdx = PIECE_COLOR_INDEX[type];
    const trailColor = PIECE_COLORS[colorIdx];
    const g = new Graphics();

    for (let c = 0; c < 4; c++) {
      // Find topmost filled cell in this column
      let topR = -1;
      for (let r = 0; r < 4; r++) {
        if (mat[r][c]) { topR = r; break; }
      }
      if (topR < 0) continue;

      const cx = this._gridX + (pieceX + c) * C + C / 2;
      const startY = this._gridY + (startRow + topR) * C;
      const endY = this._gridY + (endRow + topR) * C;
      const trailH = endY - startY;
      if (trailH <= 0) continue;

      // Trail streak (fading gradient from top to bottom)
      g.rect(cx - 2, startY, 4, trailH).fill({ color: trailColor, alpha: 0.25 });
      g.rect(cx - 1, startY, 2, trailH).fill({ color: 0xffffff, alpha: 0.12 });
    }

    this._fxLayer.addChild(g);
    gsap.to(g, { alpha: 0, duration: 0.2, ease: "power2.out", onComplete: () => { this._fxLayer.removeChild(g); } });
  }

  /** Trigger a golden grail power flash across the screen. */
  triggerGrailFX(): void {
    this._grailFlashAlpha = 0.8;
    gsap.to(this, { _grailFlashAlpha: 0, duration: 0.6, ease: "power2.out" });

    // Golden particle burst
    const cx = this._gridX + GRID_PX_W / 2;
    const cy = this._gridY + GRID_PX_H * 0.7;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const p = new Graphics();
      p.circle(0, 0, 2 + Math.random() * 2).fill({ color: [0xffd700, 0xffee88, 0xffaa44, 0xffffff][i % 4], alpha: 0.8 });
      p.position.set(cx, cy);
      this._fxLayer.addChild(p);
      gsap.to(p, { x: cx + Math.cos(angle) * speed, y: cy + Math.sin(angle) * speed, alpha: 0, duration: 0.5 + Math.random() * 0.3,
        onComplete: () => { this._fxLayer.removeChild(p); } });
    }

    // "GRAIL POWER!" text
    const txt = new Text({
      text: "GRAIL POWER!",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xffd700, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 4, distance: 1, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(cx, cy - 20);
    txt.scale.set(0.4);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.3, y: 1.3, duration: 0.15, ease: "back.out(3)" });
    gsap.to(txt, { y: cy - 50, alpha: 0, duration: 0.8, delay: 0.3, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  private _renderFX(): void {
    this._fxLayer.removeChildren();
    const g = new Graphics();

    // Line-clear flash
    if (this._flashAlpha > 0.01 && this._flashRows.length > 0) {
      for (const row of this._flashRows) {
        g.rect(this._gridX, this._gridY + row * C, GRID_PX_W, C)
          .fill({ color: COL_WHITE, alpha: this._flashAlpha });
      }
    }

    // Grail power flash
    if (this._grailFlashAlpha > 0.01) {
      g.rect(0, 0, this._sw, this._sh)
        .fill({ color: COL_GOLD, alpha: this._grailFlashAlpha });
    }

    this._fxLayer.addChild(g);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    gsap.killTweensOf(this);
    this.root.removeChildren();
    this._bgLayer.removeChildren();
    this._gridLayer.removeChildren();
    this._pieceLayer.removeChildren();
    this._fxLayer.removeChildren();
    this._uiLayer.removeChildren();
  }

  // -------------------------------------------------------------------------
  // Color utilities
  // -------------------------------------------------------------------------

  private _lighten(color: number, amount: number): number {
    let r = (color >> 16) & 0xff;
    let g = (color >> 8) & 0xff;
    let b = color & 0xff;
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return (r << 16) | (g << 8) | b;
  }

  private _darken(color: number, amount: number): number {
    let r = (color >> 16) & 0xff;
    let g = (color >> 8) & 0xff;
    let b = color & 0xff;
    r = Math.round(r * (1 - amount));
    g = Math.round(g * (1 - amount));
    b = Math.round(b * (1 - amount));
    return (r << 16) | (g << 8) | b;
  }
}
