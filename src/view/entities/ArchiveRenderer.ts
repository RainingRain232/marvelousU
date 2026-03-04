// Procedural archive renderer for BuildingView.
//
// Draws "The Arcane Archive" — a wide 2-story stone library (~2x2 tiles) with:
//   * Stone foundation with rune-inscribed pillars flanking the entrance
//   * Wide peaked-roof library structure with arched central doorway
//   * Tall narrow stained-glass windows showing book/scroll patterns
//   * Small observatory dome on the right corner of the roof
//   * Bookshelves visible through windows (brown shelves, colored spines)
//   * Floating magical tomes/scrolls orbiting above the building
//   * Glowing arcane circle on the ground in front of the entrance
//   * Arcane antenna / weathervane on the roof peak
//   * Mana particles/sparkles drifting upward
//
// All drawing uses PixiJS Graphics. Animations driven by tick(dt, phase).

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — stone structure
const COL_STONE = 0x6b6b6b;
const COL_STONE_LT = 0x7e7e7e;
const COL_STONE_DK = 0x4a4a4a;
const COL_STONE_BASE = 0x555555;
const COL_MORTAR = 0x5a5a5a;

// Palette — arcane / magical
const COL_ARCANE_DEEP = 0x2a1050;
const COL_ARCANE_PURPLE = 0x6633aa;
const COL_ARCANE_GLOW = 0x8866dd;
const COL_RUNE_GOLD = 0xddaa33;
const COL_MANA_SPARKLE = 0xaabbff;

// Palette — books and shelves
const COL_SHELF = 0x5c3a1e;
const COL_BOOK_RED = 0x993333;
const COL_BOOK_BLUE = 0x334499;
const COL_BOOK_GREEN = 0x336633;
const COL_BOOK_GOLD = 0xccaa44;
const COL_BOOK_PURPLE = 0x663388;

// Palette — roof and dome
const COL_ROOF = 0x3d3050;
const COL_ROOF_DK = 0x2a2040;
const COL_DOME = 0x556688;
const COL_DOME_LT = 0x7799aa;
const COL_DOME_GLASS = 0x88aacc;

// Palette — window glass
const COL_GLASS_BLUE = 0x223366;
const COL_GLASS_PURPLE = 0x332255;

// Gold accents
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;

// Animation timing
const TOME_ORBIT_SPEED = 0.4; // rads/sec for floating tomes
const CIRCLE_PULSE_SPEED = 1.2; // rads/sec for arcane circle breathing
const WINDOW_GLOW_SPEED = 1.8; // rads/sec for window glow pulse
const DOME_LIGHT_SPEED = 0.7; // rads/sec for observatory rotating light

// ---------------------------------------------------------------------------
// ArchiveRenderer
// ---------------------------------------------------------------------------

export class ArchiveRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // static stone body, pillars, foundation
  private _studyHall = new Graphics(); // study hall opening above door (mages + bookshelves)
  private _windows = new Graphics(); // stained glass windows with bookshelves
  private _roof = new Graphics(); // peaked roof + dome (semi-static)
  private _doorway = new Graphics(); // arched doorway with owner-colored glow
  private _arcaneCircle = new Graphics(); // pulsing ground circle
  private _tomes = new Graphics(); // floating orbiting tomes/scrolls
  private _sparkles = new Graphics(); // mana particles drifting upward
  private _antenna = new Graphics(); // arcane antenna / weathervane
  private _domeLightGfx = new Graphics(); // rotating observatory dome light

  private _time = 0;
  private _playerColor: number;

  // Sparkle particles state
  private _sparkleParticles: { x: number; y: number; speed: number; phase: number; size: number }[] = [];

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);

    // Initialize sparkle particles
    for (let i = 0; i < 12; i++) {
      this._sparkleParticles.push({
        x: 20 + Math.random() * (TW - 40),
        y: TH * 0.3 + Math.random() * TH * 0.5,
        speed: 10 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 1.2,
      });
    }

    this._drawBase();
    this._drawStudyHall();
    this._drawRoof();
    this._drawWindowsStatic();
    this._drawAntenna();

    this.container.addChild(this._base);
    this.container.addChild(this._studyHall);
    this.container.addChild(this._windows);
    this.container.addChild(this._roof);
    this.container.addChild(this._doorway);
    this.container.addChild(this._arcaneCircle);
    this.container.addChild(this._tomes);
    this.container.addChild(this._sparkles);
    this.container.addChild(this._antenna);
    this.container.addChild(this._domeLightGfx);
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // 1. Floating tomes orbit slowly
    this._updateTomes(this._time);

    // 2. Arcane circle pulses with breathing glow
    this._updateArcaneCircle(this._time);

    // 3. Mana sparkles drift upward
    this._updateSparkles(this._time, dt);

    // 4. Window glow subtly pulses
    this._updateWindows(this._time);

    // 5. Observatory dome rotating light
    this._updateDomeLight(this._time);

    // 6. Doorway glow pulse
    this._updateDoorway(this._time);

    // 7. Study hall candle flicker
    this._updateStudyHallGlow(this._time);
  }

  // == Base Structure =======================================================

  private _drawBase(): void {
    const g = this._base;
    const cx = TW / 2;

    // -- Ground platform / foundation --
    g.rect(4, TH - 8, TW - 8, 8).fill({ color: COL_STONE_BASE });
    g.rect(8, TH - 12, TW - 16, 4).fill({ color: COL_STONE_DK });
    // Step line
    g.moveTo(8, TH - 9)
      .lineTo(TW - 8, TH - 9)
      .stroke({ color: COL_MORTAR, width: 0.5 });

    // -- Main library body (wide, 2-story) --
    const bodyL = 14;
    const bodyR = TW - 14;
    const bodyTop = 38;
    const bodyBot = TH - 12;
    const bodyW = bodyR - bodyL;
    const bodyH = bodyBot - bodyTop;

    g.rect(bodyL, bodyTop, bodyW, bodyH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Brick / block pattern
    this._drawBlockPattern(g, bodyL + 1, bodyTop + 1, bodyW - 2, bodyH - 2);

    // -- Floor division line (between 1st and 2nd story) --
    const floorY = bodyTop + bodyH * 0.48;
    g.rect(bodyL - 2, floorY - 1, bodyW + 4, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.4 });

    // -- Cornice at top of walls --
    g.rect(bodyL - 3, bodyTop - 2, bodyW + 6, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.4 });

    // -- Rune-inscribed pillars flanking the entrance --
    this._drawPillar(g, cx - 18, bodyBot, 28);
    this._drawPillar(g, cx + 14, bodyBot, 28);

    // -- Doorway arch frame (static stone) --
    const doorW = 22;
    const doorH = 30;
    const doorY = bodyBot - doorH;

    // Dark interior
    g.rect(cx - doorW / 2, doorY + 8, doorW, doorH - 8).fill({
      color: 0x0a0a18,
    });
    g.ellipse(cx, doorY + 8, doorW / 2, 8).fill({ color: 0x0a0a18 });

    // Stone arch frame
    g.moveTo(cx - doorW / 2 - 3, bodyBot)
      .lineTo(cx - doorW / 2 - 3, doorY + 10)
      .quadraticCurveTo(cx, doorY - 6, cx + doorW / 2 + 3, doorY + 10)
      .lineTo(cx + doorW / 2 + 3, bodyBot)
      .stroke({ color: COL_STONE_LT, width: 2.5 });

    // Keystone at arch apex
    g.moveTo(cx - 4, doorY - 2)
      .lineTo(cx, doorY - 6)
      .lineTo(cx + 4, doorY - 2)
      .closePath()
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_GOLD, width: 0.5 });

    // -- Weathering / moss --
    g.ellipse(bodyL + 6, bodyBot - 4, 4, 2).fill({
      color: 0x3a5530,
      alpha: 0.35,
    });
    g.ellipse(bodyR - 5, bodyBot - 8, 3, 1.5).fill({
      color: 0x3a5530,
      alpha: 0.3,
    });

    this._doorway.position.set(0, 0);
  }

  private _drawPillar(
    g: Graphics,
    x: number,
    botY: number,
    height: number,
  ): void {
    const pillarW = 6;
    const topY = botY - height;

    // Pillar body
    g.rect(x, topY, pillarW, height)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });

    // Base cap
    g.rect(x - 1, botY - 3, pillarW + 2, 3).fill({ color: COL_STONE_DK });

    // Top cap
    g.rect(x - 1, topY, pillarW + 2, 3).fill({ color: COL_STONE_DK });

    // Rune inscriptions on pillar (gold)
    const runeCount = 4;
    for (let i = 0; i < runeCount; i++) {
      const ry = topY + 8 + i * (height - 16) / runeCount;
      // Diamond rune
      g.moveTo(x + pillarW / 2, ry - 3)
        .lineTo(x + pillarW / 2 + 2, ry)
        .lineTo(x + pillarW / 2, ry + 3)
        .lineTo(x + pillarW / 2 - 2, ry)
        .closePath()
        .stroke({ color: COL_RUNE_GOLD, width: 0.6, alpha: 0.6 });
    }
  }

  private _drawBlockPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 12;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.2 });
      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.2 });
      }
    }
  }

  // == Study Hall (opening above door, 2nd floor) ===========================

  private _drawStudyHall(): void {
    const g = this._studyHall;
    const cx = TW / 2;

    // The study hall opening sits on the second floor, centered above the doorway
    const openL = cx - 24;
    const openR = cx + 24;
    const openW = openR - openL;
    const openTop = 42;
    const openBot = 60;
    const openH = openBot - openTop;

    // Dark interior background
    g.rect(openL, openTop, openW, openH).fill({ color: 0x1a1020 });

    // Bookshelves along the back wall (3 tall shelves)
    const shelfColors = [COL_SHELF, 0x4d2e15, 0x6b4422];
    for (let s = 0; s < 3; s++) {
      const shelfX = openL + 2 + s * 16;
      const shelfW = 14;
      // Shelf frame
      g.rect(shelfX, openTop + 1, shelfW, openH - 2).fill({
        color: shelfColors[s % 3],
        alpha: 0.9,
      });
      // Individual shelf planks (4 rows)
      for (let row = 0; row < 4; row++) {
        const rowY = openTop + 2 + row * ((openH - 4) / 4);
        const rowH = (openH - 4) / 4;
        // Shelf plank
        g.rect(shelfX + 1, rowY + rowH - 1.5, shelfW - 2, 1.5).fill({
          color: 0x3d2010,
        });
        // Book spines
        const bookPalette = [COL_BOOK_RED, COL_BOOK_BLUE, COL_BOOK_GREEN, COL_BOOK_GOLD, COL_BOOK_PURPLE, 0x884422, 0x228844];
        let bx = shelfX + 2;
        for (let b = 0; b < 6 && bx < shelfX + shelfW - 2; b++) {
          const bw = 1.0 + Math.random() * 0.5;
          const bh = rowH - 3.5 + Math.random() * 1.5;
          g.rect(bx, rowY + rowH - 1.5 - bh, bw, bh).fill({
            color: bookPalette[(s * 4 + row + b) % bookPalette.length],
            alpha: 0.8,
          });
          bx += bw + 0.2;
        }
      }
    }

    // Two mages studying at desks (small seated figures in front of bookshelves)
    this._drawStudyMage(g, cx - 14, openBot - 4, 0x3344aa); // left mage (blue robe)
    this._drawStudyMage(g, cx + 8, openBot - 4, 0x882244); // right mage (red robe)

    // Desk/table between the mages
    g.rect(cx - 6, openBot - 5, 12, 2).fill({ color: COL_SHELF });
    // Open book on desk
    g.rect(cx - 3, openBot - 7, 6, 2).fill({ color: 0xddcc99, alpha: 0.7 });
    // Candle on desk
    g.rect(cx + 5, openBot - 9, 1, 4).fill({ color: 0xccaa44 });
    g.circle(cx + 5.5, openBot - 9.5, 1.2).fill({ color: 0xffdd44, alpha: 0.8 });

    // Stone frame around the opening (arch top)
    g.moveTo(openL - 2, openBot)
      .lineTo(openL - 2, openTop + 4)
      .quadraticCurveTo(cx, openTop - 4, openR + 2, openTop + 4)
      .lineTo(openR + 2, openBot)
      .stroke({ color: COL_STONE_LT, width: 2 });

    // Stone sill at bottom
    g.rect(openL - 3, openBot, openW + 6, 2).fill({ color: COL_STONE_DK });

    // Warm interior glow
    g.rect(openL + 1, openTop + 1, openW - 2, openH - 2).fill({
      color: 0xffcc66,
      alpha: 0.06,
    });
  }

  private _drawStudyMage(g: Graphics, x: number, baseY: number, robeColor: number): void {
    // Seated mage silhouette (simplified)
    // Body/robe
    g.rect(x - 2, baseY - 6, 5, 6).fill({ color: robeColor, alpha: 0.85 });
    // Head
    g.circle(x + 0.5, baseY - 7.5, 2).fill({ color: 0xddbb88 });
    // Hood/hat
    g.moveTo(x - 1.5, baseY - 8)
      .lineTo(x + 0.5, baseY - 11)
      .lineTo(x + 2.5, baseY - 8)
      .closePath()
      .fill({ color: robeColor, alpha: 0.9 });
  }

  // == Roof ==================================================================

  private _drawRoof(): void {
    const g = this._roof;
    const cx = TW / 2;

    const bodyL = 14;
    const bodyR = TW - 14;
    const roofTop = 18;
    const roofBase = 38;

    // -- Main peaked roof --
    g.moveTo(bodyL - 6, roofBase + 2)
      .lineTo(cx, roofTop)
      .lineTo(bodyR + 6, roofBase + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.2 });

    // Roof tile lines
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const ly = roofBase + 2 - (roofBase + 2 - roofTop) * t;
      const lxL = bodyL - 6 + (cx - bodyL + 6) * t;
      const lxR = bodyR + 6 - (bodyR + 6 - cx) * t;
      g.moveTo(lxL - 1, ly)
        .lineTo(lxR + 1, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.4, alpha: 0.4 });
    }

    // Ridge cap
    g.moveTo(cx - 3, roofTop + 1)
      .lineTo(cx + 3, roofTop + 1)
      .stroke({ color: COL_STONE_LT, width: 1.5 });

    // -- Observatory dome (right corner of roof) --
    const domeX = bodyR - 8;
    const domeY = roofBase - 4;
    const domeR = 10;

    // Dome base platform
    g.rect(domeX - domeR - 2, domeY, domeR * 2 + 4, 4)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });

    // Dome hemisphere
    g.moveTo(domeX - domeR, domeY)
      .quadraticCurveTo(domeX - domeR, domeY - domeR * 1.2, domeX, domeY - domeR * 1.1)
      .quadraticCurveTo(domeX + domeR, domeY - domeR * 1.2, domeX + domeR, domeY)
      .closePath()
      .fill({ color: COL_DOME })
      .stroke({ color: COL_DOME_LT, width: 0.8 });

    // Dome glass panels (vertical ribs)
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const rx = domeX - domeR + domeR * 2 * t;
      g.moveTo(rx, domeY)
        .lineTo(rx + (domeX - rx) * 0.15, domeY - domeR * 0.9)
        .stroke({ color: COL_DOME_GLASS, width: 0.4, alpha: 0.5 });
    }

    // Dome apex finial
    g.circle(domeX, domeY - domeR * 1.1, 1.5).fill({ color: COL_GOLD });
  }

  // == Antenna / Weathervane =================================================

  private _drawAntenna(): void {
    const g = this._antenna;
    const cx = TW / 2;
    const roofTop = 18;

    // Vertical mast
    g.moveTo(cx, roofTop)
      .lineTo(cx, roofTop - 14)
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Arcane crystal at tip
    g.moveTo(cx, roofTop - 18)
      .lineTo(cx - 3, roofTop - 14)
      .lineTo(cx + 3, roofTop - 14)
      .closePath()
      .fill({ color: COL_ARCANE_PURPLE, alpha: 0.8 })
      .stroke({ color: COL_ARCANE_GLOW, width: 0.6 });

    // Cross-bar (weathervane arm)
    g.moveTo(cx - 8, roofTop - 12)
      .lineTo(cx + 8, roofTop - 12)
      .stroke({ color: COL_STONE_DK, width: 1 });

    // Directional arrow
    g.moveTo(cx + 8, roofTop - 12)
      .lineTo(cx + 5, roofTop - 14)
      .stroke({ color: COL_GOLD_DK, width: 0.8 });
    g.moveTo(cx + 8, roofTop - 12)
      .lineTo(cx + 5, roofTop - 10)
      .stroke({ color: COL_GOLD_DK, width: 0.8 });

    // Gold accent rings on mast
    g.circle(cx, roofTop - 6, 1.5).stroke({ color: COL_GOLD, width: 0.6 });
    g.circle(cx, roofTop - 10, 1).stroke({ color: COL_GOLD, width: 0.5 });
  }

  // == Windows (stained glass with book/scroll patterns) ====================

  private _drawWindowsStatic(): void {
    // Draw initial static state — animated glow will overlay
    const g = this._windows;

    // Upper story windows (taller, showing scroll patterns)
    this._drawArchiveWindow(g, 22, 44, 12, 20, "scroll");
    this._drawArchiveWindow(g, 94, 44, 12, 20, "scroll");

    // Lower story windows (wider, showing bookshelves)
    this._drawArchiveWindow(g, 20, 78, 14, 18, "books");
    this._drawArchiveWindow(g, 94, 78, 14, 18, "books");
  }

  private _drawArchiveWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    pattern: "scroll" | "books",
  ): void {
    // Dark frame
    g.rect(x - 1, y + 4, w + 2, h - 4).fill({ color: COL_GLASS_BLUE });
    // Pointed arch top
    g.moveTo(x - 1, y + 4)
      .quadraticCurveTo(x + w / 2, y - 2, x + w + 1, y + 4)
      .lineTo(x + w + 1, y + 4)
      .lineTo(x - 1, y + 4)
      .closePath()
      .fill({ color: COL_GLASS_PURPLE });

    // Stained glass background
    g.rect(x, y + 5, w, h - 5).fill({ color: COL_GLASS_BLUE, alpha: 0.8 });

    if (pattern === "books") {
      // Bookshelves visible through window
      const shelfCount = 3;
      const shelfH = (h - 5) / shelfCount;
      for (let s = 0; s < shelfCount; s++) {
        const sy = y + 5 + s * shelfH;
        // Shelf plank
        g.rect(x + 1, sy + shelfH - 2, w - 2, 2).fill({ color: COL_SHELF });
        // Book spines
        const bookColors = [COL_BOOK_RED, COL_BOOK_BLUE, COL_BOOK_GREEN, COL_BOOK_GOLD, COL_BOOK_PURPLE];
        let bx = x + 2;
        for (let b = 0; b < 5 && bx < x + w - 2; b++) {
          const bw = 1.2 + Math.random() * 0.6;
          const bh = shelfH - 4 + Math.random() * 2;
          g.rect(bx, sy + shelfH - 2 - bh, bw, bh).fill({
            color: bookColors[b % bookColors.length],
            alpha: 0.7,
          });
          bx += bw + 0.3;
        }
      }
    } else {
      // Scroll pattern in stained glass
      // Large central scroll shape
      const scrollCx = x + w / 2;
      const scrollCy = y + h / 2 + 2;
      // Scroll body (rectangle)
      g.rect(scrollCx - 3, scrollCy - 5, 6, 10).fill({
        color: 0xddcc99,
        alpha: 0.5,
      });
      // Scroll roll tops
      g.ellipse(scrollCx, scrollCy - 5, 4, 1.5).fill({
        color: 0xccbb88,
        alpha: 0.5,
      });
      g.ellipse(scrollCx, scrollCy + 5, 4, 1.5).fill({
        color: 0xccbb88,
        alpha: 0.5,
      });
      // Tiny text lines on scroll
      for (let tl = 0; tl < 4; tl++) {
        g.moveTo(scrollCx - 2, scrollCy - 3 + tl * 2.2)
          .lineTo(scrollCx + 2, scrollCy - 3 + tl * 2.2)
          .stroke({ color: 0x554433, width: 0.4, alpha: 0.4 });
      }
      // Decorative star dots around scroll
      g.circle(x + 2, y + 8, 0.8).fill({ color: 0xffffcc, alpha: 0.6 });
      g.circle(x + w - 2, y + 10, 0.8).fill({ color: 0xffffcc, alpha: 0.6 });
      g.circle(x + 3, y + h - 4, 0.7).fill({ color: 0xffffcc, alpha: 0.5 });
      g.circle(x + w - 3, y + h - 6, 0.7).fill({ color: 0xffffcc, alpha: 0.5 });
    }

    // Lead frame lines (vertical mullion)
    g.moveTo(x + w / 2, y + 2)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: 0x333333, width: 0.6, alpha: 0.5 });

    // Stone sill below window
    g.rect(x - 2, y + h, w + 4, 2).fill({ color: COL_STONE_DK });
  }

  // == Animated Windows (glow overlay) ======================================

  private _updateWindows(time: number): void {
    // We overlay a subtle pulsing glow on top of the static windows
    // by re-drawing the glow rects each frame
    const g = this._windows;
    g.clear();

    // Re-draw the static window content
    this._drawArchiveWindow(g, 22, 44, 12, 20, "scroll");
    this._drawArchiveWindow(g, 94, 44, 12, 20, "scroll");
    this._drawArchiveWindow(g, 20, 78, 14, 18, "books");
    this._drawArchiveWindow(g, 94, 78, 14, 18, "books");

    // Animated glow overlay on each window
    const pulse = (Math.sin(time * WINDOW_GLOW_SPEED) + 1) / 2;
    const glowAlpha = 0.05 + pulse * 0.1;

    const windowPositions = [
      { x: 22, y: 44, w: 12, h: 20 },
      { x: 94, y: 44, w: 12, h: 20 },
      { x: 20, y: 78, w: 14, h: 18 },
      { x: 94, y: 78, w: 14, h: 18 },
    ];

    for (const wp of windowPositions) {
      g.rect(wp.x, wp.y + 5, wp.w, wp.h - 5).fill({
        color: COL_ARCANE_GLOW,
        alpha: glowAlpha,
      });
    }
  }

  // == Doorway (owner-colored glow) =========================================

  private _updateDoorway(time: number): void {
    const g = this._doorway;
    g.clear();

    const cx = TW / 2;
    const doorW = 20;
    const doorH = 26;
    const bodyBot = TH - 12;
    const doorY = bodyBot - doorH - 4 + 8;

    const pulse = (Math.sin(time * CIRCLE_PULSE_SPEED * 0.8) + 1) / 2;
    const alpha = 0.25 + pulse * 0.35;

    // Glowing magical energy fill inside the doorway
    g.rect(cx - doorW / 2 + 1, doorY + 2, doorW - 2, doorH - 2).fill({
      color: this._playerColor,
      alpha: alpha * 0.35,
    });
    g.ellipse(cx, doorY + 2, doorW / 2 - 1, 6).fill({
      color: this._playerColor,
      alpha: alpha * 0.35,
    });

    // Rim glow (tinted by owner color)
    g.moveTo(cx - doorW / 2, bodyBot)
      .lineTo(cx - doorW / 2, doorY + 4)
      .quadraticCurveTo(cx, doorY - 8, cx + doorW / 2, doorY + 4)
      .lineTo(cx + doorW / 2, bodyBot)
      .stroke({ color: this._playerColor, width: 2, alpha: alpha * 0.7 });

    // Central energy pillar
    g.moveTo(cx, bodyBot - 2)
      .lineTo(cx, doorY + 6)
      .stroke({ color: COL_ARCANE_GLOW, width: 1, alpha: alpha * 0.25 });
  }

  // == Arcane Circle (pulsing ground circle) ================================

  private _updateArcaneCircle(time: number): void {
    const g = this._arcaneCircle;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 5;

    const pulse = (Math.sin(time * CIRCLE_PULSE_SPEED) + 1) / 2;
    const alpha = 0.2 + pulse * 0.4;

    // Outer circle
    g.ellipse(cx, cy, 22, 6).stroke({ color: COL_ARCANE_PURPLE, width: 1.2, alpha });

    // Inner circle
    g.ellipse(cx, cy, 14, 4).stroke({ color: COL_ARCANE_GLOW, width: 0.8, alpha: alpha * 0.8 });

    // Innermost circle
    g.ellipse(cx, cy, 7, 2).stroke({ color: this._playerColor, width: 0.6, alpha: alpha * 0.6 });

    // Radiating rune points around outer circle
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.2;
      const rx = cx + Math.cos(a) * 22;
      const ry = cy + Math.sin(a) * 6;
      g.circle(rx, ry, 1).fill({ color: COL_RUNE_GOLD, alpha: alpha * 0.5 });
    }

    // Cross-lines (cardinal directions)
    g.moveTo(cx - 14, cy)
      .lineTo(cx + 14, cy)
      .stroke({ color: COL_ARCANE_PURPLE, width: 0.5, alpha: alpha * 0.3 });
    g.moveTo(cx, cy - 4)
      .lineTo(cx, cy + 4)
      .stroke({ color: COL_ARCANE_PURPLE, width: 0.5, alpha: alpha * 0.3 });

    // Faint filled glow on ground
    g.ellipse(cx, cy, 20, 5).fill({ color: COL_ARCANE_DEEP, alpha: alpha * 0.15 });
  }

  // == Floating Tomes (orbiting above building) =============================

  private _updateTomes(time: number): void {
    const g = this._tomes;
    g.clear();

    const cx = TW / 2;
    const baseY = 10;
    const angle = time * TOME_ORBIT_SPEED;

    // Five floating tomes orbiting slowly
    const tomeColors = [COL_BOOK_RED, COL_BOOK_BLUE, COL_BOOK_GOLD, COL_BOOK_PURPLE, COL_BOOK_GREEN];

    for (let i = 0; i < 5; i++) {
      const a = angle + (i * Math.PI * 2) / 5;
      const orbitRx = 28;
      const orbitRy = 8;
      const ox = cx + Math.cos(a) * orbitRx;
      const oy = baseY + Math.sin(a) * orbitRy;
      const bob = Math.sin(time * 1.5 + i * 1.3) * 2;

      // Tome (small rectangle book shape)
      const tW = 6;
      const tH = 5;

      // Book body
      g.rect(ox - tW / 2, oy - tH / 2 + bob, tW, tH)
        .fill({ color: tomeColors[i] })
        .stroke({ color: 0x222222, width: 0.5 });

      // Book spine (left edge)
      g.moveTo(ox - tW / 2, oy - tH / 2 + bob)
        .lineTo(ox - tW / 2, oy + tH / 2 + bob)
        .stroke({ color: COL_GOLD_DK, width: 1 });

      // Page edges (white line on right)
      g.moveTo(ox + tW / 2 - 1, oy - tH / 2 + bob + 1)
        .lineTo(ox + tW / 2 - 1, oy + tH / 2 + bob - 1)
        .stroke({ color: 0xeeeedd, width: 0.6 });

      // Faint magical glow around tome
      g.circle(ox, oy + bob, tW * 0.8).stroke({
        color: COL_ARCANE_GLOW,
        width: 0.6,
        alpha: 0.2 + (Math.sin(time * 2 + i) + 1) / 2 * 0.15,
      });
    }

    // One floating scroll among the tomes
    const scrollA = angle * 0.7 + Math.PI;
    const scrollX = cx + Math.cos(scrollA) * 20;
    const scrollY = baseY + 3 + Math.sin(scrollA) * 6 + Math.sin(time * 1.2) * 2;

    // Scroll cylinder
    g.rect(scrollX - 2, scrollY - 4, 4, 8).fill({
      color: 0xddcc99,
      alpha: 0.8,
    });
    // Scroll roll caps
    g.ellipse(scrollX, scrollY - 4, 3, 1).fill({ color: 0xccbb88 });
    g.ellipse(scrollX, scrollY + 4, 3, 1).fill({ color: 0xccbb88 });
    // Glow
    g.circle(scrollX, scrollY, 4).stroke({
      color: COL_ARCANE_GLOW,
      width: 0.5,
      alpha: 0.15,
    });
  }

  // == Mana Sparkles (drifting upward) ======================================

  private _updateSparkles(time: number, dt: number): void {
    const g = this._sparkles;
    g.clear();

    for (const p of this._sparkleParticles) {
      // Move upward
      p.y -= p.speed * dt;

      // Reset when off-screen top
      if (p.y < -5) {
        p.y = TH * 0.4 + Math.random() * TH * 0.5;
        p.x = 20 + Math.random() * (TW - 40);
        p.speed = 10 + Math.random() * 14;
      }

      // Slight horizontal drift
      const drift = Math.sin(time * 1.5 + p.phase) * 0.3;
      const drawX = p.x + drift;

      // Flicker alpha
      const flicker = (Math.sin(time * 4 + p.phase) + 1) / 2;
      const alpha = 0.3 + flicker * 0.5;

      g.circle(drawX, p.y, p.size).fill({
        color: COL_MANA_SPARKLE,
        alpha,
      });

      // Tiny bright core
      if (p.size > 1) {
        g.circle(drawX, p.y, p.size * 0.4).fill({
          color: 0xffffff,
          alpha: alpha * 0.5,
        });
      }
    }
  }

  // == Observatory Dome Light (rotating) ====================================

  private _updateDomeLight(time: number): void {
    const g = this._domeLightGfx;
    g.clear();

    const bodyR = TW - 14;
    const domeX = bodyR - 8;
    const domeY = 34; // roofBase - 4
    const domeR = 10;

    const spin = time * DOME_LIGHT_SPEED;
    const beamAlpha = 0.15 + (Math.sin(time * 2) + 1) / 2 * 0.1;

    // Faint rotating light beam from dome
    const beamAngle = spin;
    const beamLen = 16;
    const beamX = domeX + Math.cos(beamAngle) * beamLen;
    const beamY = domeY - domeR * 0.6 + Math.sin(beamAngle) * 4;

    g.moveTo(domeX, domeY - domeR * 0.6)
      .lineTo(beamX, beamY - 2)
      .lineTo(beamX, beamY + 2)
      .closePath()
      .fill({ color: COL_DOME_GLASS, alpha: beamAlpha });

    // Light source glow at dome center
    g.circle(domeX, domeY - domeR * 0.5, 2).fill({
      color: 0xaaccee,
      alpha: 0.3 + (Math.sin(time * 3) + 1) / 2 * 0.2,
    });
  }

  // == Study Hall candle flicker =============================================

  private _updateStudyHallGlow(time: number): void {
    // Subtle warm glow flicker overlay on the study hall opening
    const cx = TW / 2;
    const openL = cx - 24;
    const openTop = 42;
    const openW = 48;
    const openH = 18;

    const flicker = (Math.sin(time * 5.3) + Math.sin(time * 7.1 + 1.2) + 2) / 4;
    const alpha = 0.03 + flicker * 0.05;

    // Redraw candle flame (animated)
    const candleX = cx + 5.5;
    const candleY = openTop + openH - 9.5;
    const flameSize = 1.0 + flicker * 0.5;

    // We can't clear _studyHall each frame without redrawing everything,
    // so we use a separate overlay on the sparkles layer (which clears each frame)
    this._sparkles
      .circle(candleX, candleY, flameSize)
      .fill({ color: 0xffdd44, alpha: 0.4 + flicker * 0.3 });
    // Warm ambient glow in the opening
    this._sparkles
      .rect(openL + 1, openTop + 1, openW - 2, openH - 2)
      .fill({ color: 0xffcc66, alpha });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
