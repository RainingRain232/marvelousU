// Procedural embassy renderer for BuildingView.
//
// Draws a detailed 2×2 tile elegant diplomatic embassy with:
//   • Cream-and-gold neoclassical façade with ashlar block pattern
//   • Triangular pediment roof with tympanum relief (dove of peace)
//   • Four fluted Corinthian columns with acanthus capitals
//   • Grand brass double doors with carved panels, lion-head knockers
//   • Stone arch above door with voussoirs, keystone with laurel wreath
//   • Two tall arched windows with stained-glass diplomatic panes, glow
//   • Heraldic diplomatic crest: shield with dove, laurel branches, crown
//   • Ornate cornice with dentil moulding and egg-and-dart frieze
//   • Broad marble steps (5 tiers) with balustrade newel posts
//   • Two waving player-colored banners on rooftop flagpoles
//   • Diplomat character at entrance: robed, scroll in hand, gentle sway
//   • Wall-mounted brass lanterns with warm flickering glow
//   • Potted cypress topiary flanking the steps
//   • Moss on lower courses, ivy on side walls
//   • Pigeons on the pediment
//
// All drawing uses PixiJS Graphics. 2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const DW = 2 * TS; // 128px
const DH = 2 * TS; // 128px

// --- Palette: elegant cream/gold/marble ---
const COL_STONE = 0xf0ebe0;
const COL_STONE_DK = 0xc8c0b0;
const COL_STONE_LT = 0xfaf6f0;
const COL_MARBLE = 0xe8e0d8;
const COL_MARBLE_DK = 0xd0c8bc;
const COL_MARBLE_LT = 0xf5f0e8;
const COL_MORTAR = 0xd8d0c0;
const COL_ROOF = 0x4a3020;
const COL_ROOF_DK = 0x2a1810;
const COL_ROOF_LT = 0x6a4a38;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_BRASS = 0xb5882a;
const COL_BRASS_DK = 0x8a6420;
const COL_BRASS_LT = 0xd4a840;
const COL_IRON_DK = 0x333333;
const COL_WOOD = 0x4a2a10;
const COL_WOOD_DK = 0x321a08;
const COL_WINDOW = 0x1a1a2e;
const COL_GLASS_B = 0x4488cc;
const COL_GLASS_G = 0x44aa66;
const COL_GLASS_Y = 0xeebb44;
const COL_GLASS_LEAD = 0x444444;
const COL_GLOW = 0xffcc66;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb08050;
const COL_ROBE = 0x224488;
const COL_ROBE_DK = 0x163060;
const COL_ROBE_TRIM = 0xccaa44;
const COL_SCROLL = 0xe8dcc0;
const COL_PIGEON = 0x7a7a88;
const COL_PIGEON_DK = 0x5a5a66;
const COL_PIGEON_NECK = 0x66aa77;
const COL_CYPRESS = 0x2a5a22;
const COL_CYPRESS_DK = 0x1a3a14;
const COL_POT = 0x8a5a3a;

// Animation timing
const FLAG_SPEED = 2.5;
const GLOW_PULSE = 2.0;
const DIPLOMAT_SWAY = 1.0;
const PIGEON_BOB = 2.5;

// ---------------------------------------------------------------------------
// EmbassyRenderer
// ---------------------------------------------------------------------------

export class EmbassyRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();       // Steps, ground
  private _building = new Graphics();   // Façade, columns, roof, pediment
  private _windows = new Graphics();    // Arched windows + glow
  private _door = new Graphics();       // Brass doors, arch, crest
  private _props = new Graphics();      // Topiary, lanterns static
  private _diplomat = new Graphics();   // Diplomat character
  private _pigeons = new Graphics();    // Pediment pigeons
  private _effects = new Graphics();    // Lantern glow, flickering
  private _banners = new Graphics();    // Rooftop flags

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBase();
    this._drawBuilding();
    this._drawDoor();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._windows);
    this.container.addChild(this._door);
    this.container.addChild(this._props);
    this.container.addChild(this._diplomat);
    this.container.addChild(this._pigeons);
    this.container.addChild(this._effects);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateWindows(t);
    this._updateDiplomat(t);
    this._updatePigeons(t);
    this._updateEffects(t);
    this._updateBanners(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground / steps
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // Ground
    g.rect(0, DH - 12, DW, 12).fill({ color: COL_STONE_DK });

    // Broad marble steps (5 tiers)
    const stairCx = DW / 2;
    const stairW = 50;
    for (let i = 0; i < 5; i++) {
      const sy = DH - 12 - i * 3;
      const sw = stairW + i * 4;
      g.rect(stairCx - sw / 2, sy, sw, 3)
        .fill({ color: i % 2 === 0 ? COL_MARBLE : COL_MARBLE_LT })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }

    // Newel posts (balustrade ends)
    for (const nx of [stairCx - stairW / 2 - 4, stairCx + stairW / 2 + 1]) {
      g.rect(nx, DH - 24, 4, 14).fill({ color: COL_MARBLE_DK });
      g.rect(nx - 1, DH - 26, 6, 2).fill({ color: COL_MARBLE });
      g.circle(nx + 2, DH - 27, 2).fill({ color: COL_GOLD_DK });
    }
  }

  // =========================================================================
  // Main building façade
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    const bx = 10;
    const by = 26;
    const bw = DW - 20;
    const bh = DH - 38;

    // ── Side walls (depth, slightly darker) ──
    g.rect(0, by + 4, 12, bh - 4).fill({ color: COL_STONE_DK });
    g.rect(DW - 12, by + 4, 12, bh - 4).fill({ color: COL_STONE_DK });

    // ── Main façade ──
    g.rect(bx, by, bw, bh).fill({ color: COL_STONE });

    // ── Ashlar block pattern ──
    for (let row = 0; row < Math.floor(bh / 10); row++) {
      const yy = by + row * 10;
      g.moveTo(bx, yy).lineTo(bx + bw, yy).stroke({ color: COL_MORTAR, width: 0.3 });
      const xOff = row % 2 === 0 ? 0 : 14;
      for (let x = bx + xOff; x < bx + bw; x += 28) {
        g.moveTo(x, yy).lineTo(x, yy + 10).stroke({ color: COL_MORTAR, width: 0.2 });
      }
    }

    // ── Stone variation ──
    for (let i = 0; i < 8; i++) {
      const sx = bx + 4 + ((i * 31 + 5) % (bw - 8));
      const sy = by + 4 + ((i * 47 + 11) % (bh - 8));
      g.rect(sx, sy, 6 + (i % 3) * 2, 4 + (i % 2) * 2).fill({
        color: i % 2 === 0 ? COL_STONE_LT : COL_STONE_DK,
        alpha: 0.15,
      });
    }

    // ── Four fluted Corinthian columns ──
    const colPositions = [bx + 4, bx + 28, bx + bw - 34, bx + bw - 10];
    for (const cx of colPositions) {
      this._drawColumn(g, cx, by + 4, 6, bh - 6);
    }

    // ── Ornate cornice with dentils ──
    g.rect(bx - 4, by - 2, bw + 8, 4)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    // Dentil moulding
    for (let i = 0; i < 16; i++) {
      g.rect(bx - 2 + i * 7, by + 2, 4, 2).fill({ color: COL_MARBLE_DK });
    }
    // Egg-and-dart frieze (simplified)
    for (let i = 0; i < 11; i++) {
      const fx = bx + 2 + i * 10;
      g.ellipse(fx + 3, by - 3, 2.5, 1.5).fill({ color: COL_MARBLE_LT });
      g.moveTo(fx + 8, by - 4).lineTo(fx + 8.5, by - 1).stroke({ color: COL_MARBLE_DK, width: 0.4 });
    }

    // ── Triangular pediment ──
    const pedL = bx - 6;
    const pedR = bx + bw + 6;
    const pedBase = by - 2;
    const pedPeak = 6;

    g.moveTo(pedL, pedBase)
      .lineTo(DW / 2, pedPeak)
      .lineTo(pedR, pedBase)
      .closePath()
      .fill({ color: COL_ROOF });
    // Highlight right slope
    g.moveTo(DW / 2, pedPeak)
      .lineTo(pedR, pedBase)
      .lineTo(pedR - 4, pedBase)
      .lineTo(DW / 2, pedPeak + 3)
      .closePath()
      .fill({ color: COL_ROOF_LT });
    // Roof tile lines
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      const ly = pedPeak + (pedBase - pedPeak) * t;
      const lx1 = pedL + (DW / 2 - pedL) * (1 - t);
      const lx2 = pedR - (pedR - DW / 2) * (1 - t);
      g.moveTo(lx1, ly).lineTo(lx2, ly).stroke({ color: COL_ROOF_DK, width: 0.4 });
    }

    // Gold edge trim
    g.moveTo(pedL, pedBase)
      .lineTo(DW / 2, pedPeak)
      .lineTo(pedR, pedBase)
      .stroke({ color: COL_GOLD, width: 1.2 });

    // ── Tympanum relief: dove of peace ──
    const tx = DW / 2;
    const ty = pedPeak + 8;
    // Dove body
    g.ellipse(tx, ty, 5, 3).fill({ color: COL_MARBLE_LT });
    // Wing (left)
    g.moveTo(tx - 3, ty - 1)
      .quadraticCurveTo(tx - 8, ty - 5, tx - 4, ty - 6)
      .lineTo(tx - 2, ty - 2)
      .closePath()
      .fill({ color: COL_MARBLE });
    // Wing (right)
    g.moveTo(tx + 3, ty - 1)
      .quadraticCurveTo(tx + 8, ty - 5, tx + 4, ty - 6)
      .lineTo(tx + 2, ty - 2)
      .closePath()
      .fill({ color: COL_MARBLE });
    // Head
    g.circle(tx + 4, ty - 1, 2).fill({ color: COL_MARBLE_LT });
    // Beak (olive branch)
    g.moveTo(tx + 6, ty - 1).lineTo(tx + 9, ty - 2).stroke({ color: COL_GOLD_DK, width: 0.6 });
    // Olive branch leaf
    g.ellipse(tx + 10, ty - 2, 2, 1).fill({ color: 0x558833 });
    // Tail
    g.moveTo(tx - 5, ty).lineTo(tx - 8, ty + 1).lineTo(tx - 7, ty - 1).closePath().fill({ color: COL_MARBLE });

    // ── Pediment peak acroterion ──
    g.moveTo(DW / 2, pedPeak - 4)
      .lineTo(DW / 2 - 2.5, pedPeak)
      .lineTo(DW / 2 + 2.5, pedPeak)
      .closePath()
      .fill({ color: COL_GOLD });
    g.circle(DW / 2, pedPeak - 5, 1.5).fill({ color: COL_GOLD_DK });

    // ── Moss & ivy ──
    this._drawMoss(g, 2, DH - 14, 5);
    this._drawMoss(g, DW - 10, DH - 13, 4);
    this._drawIvy(g, 2, by + 10, 36);
    this._drawIvy(g, DW - 4, by + 14, 30);
  }

  // =========================================================================
  // Brass doors, arch, diplomatic crest
  // =========================================================================

  private _drawDoor(): void {
    const g = this._door;

    const doorCx = DW / 2;
    const doorW = 28;
    const doorH = 38;
    const doorX = doorCx - doorW / 2;
    const doorY = DH - 12 - doorH - 14;

    // ── Stone arch with voussoirs ──
    const archR = doorW / 2 + 3;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const a2 = Math.PI + ((i + 1) / 6) * Math.PI;
      g.moveTo(doorCx + Math.cos(a) * (archR - 4), doorY + Math.sin(a) * (archR - 4))
        .lineTo(doorCx + Math.cos(a) * archR, doorY + Math.sin(a) * archR)
        .lineTo(doorCx + Math.cos(a2) * archR, doorY + Math.sin(a2) * archR)
        .lineTo(doorCx + Math.cos(a2) * (archR - 4), doorY + Math.sin(a2) * (archR - 4))
        .closePath()
        .fill({ color: i % 2 === 0 ? COL_MARBLE_LT : COL_MARBLE })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }
    // Keystone with laurel wreath
    g.moveTo(doorCx - 3, doorY - archR - 2)
      .lineTo(doorCx + 3, doorY - archR - 2)
      .lineTo(doorCx + 2, doorY - archR + 3)
      .lineTo(doorCx - 2, doorY - archR + 3)
      .closePath()
      .fill({ color: COL_GOLD_DK });
    // Tiny laurel on keystone
    g.arc(doorCx, doorY - archR, 2, Math.PI + 0.5, -0.5).stroke({ color: 0x558833, width: 0.6 });

    // Door recess
    g.rect(doorX - 1, doorY, doorW + 2, doorH + 1).fill({ color: 0x1a1208 });

    // ── Brass double doors ──
    const halfW = doorW / 2 - 1;
    // Left door
    g.rect(doorX, doorY, halfW, doorH).fill({ color: COL_BRASS });
    g.rect(doorX + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: COL_BRASS_LT });
    // Carved panels (left)
    g.rect(doorX + 3, doorY + 4, halfW - 6, 12)
      .fill({ color: COL_BRASS_DK, alpha: 0.4 })
      .stroke({ color: COL_BRASS_DK, width: 0.3 });
    g.rect(doorX + 3, doorY + 20, halfW - 6, 14)
      .fill({ color: COL_BRASS_DK, alpha: 0.4 })
      .stroke({ color: COL_BRASS_DK, width: 0.3 });

    // Right door
    const rdx = doorX + halfW + 2;
    g.rect(rdx, doorY, halfW, doorH).fill({ color: COL_BRASS });
    g.rect(rdx + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: COL_BRASS_LT });
    g.rect(rdx + 3, doorY + 4, halfW - 6, 12)
      .fill({ color: COL_BRASS_DK, alpha: 0.4 })
      .stroke({ color: COL_BRASS_DK, width: 0.3 });
    g.rect(rdx + 3, doorY + 20, halfW - 6, 14)
      .fill({ color: COL_BRASS_DK, alpha: 0.4 })
      .stroke({ color: COL_BRASS_DK, width: 0.3 });

    // Centre seam
    g.moveTo(doorCx, doorY).lineTo(doorCx, doorY + doorH).stroke({ color: COL_BRASS_DK, width: 0.8 });

    // Lion-head knockers
    for (const kx of [doorCx - 5, doorCx + 5]) {
      g.circle(kx, doorY + doorH / 2, 3)
        .fill({ color: COL_GOLD })
        .stroke({ color: COL_GOLD_DK, width: 0.5 });
      // Mane ring
      g.circle(kx, doorY + doorH / 2, 3.5).stroke({ color: COL_GOLD_DK, width: 0.3 });
      // Eyes
      g.circle(kx - 1, doorY + doorH / 2 - 1, 0.4).fill({ color: COL_IRON_DK });
      g.circle(kx + 1, doorY + doorH / 2 - 1, 0.4).fill({ color: COL_IRON_DK });
      // Ring
      g.arc(kx, doorY + doorH / 2 + 2, 2, 0, Math.PI).stroke({ color: COL_GOLD, width: 0.8 });
    }

    // ── Diplomatic crest above door ──
    const cx = doorCx;
    const cy = doorY - 20;

    // Shield shape
    g.moveTo(cx - 8, cy - 6)
      .lineTo(cx + 8, cy - 6)
      .lineTo(cx + 8, cy + 2)
      .quadraticCurveTo(cx, cy + 10, cx - 8, cy + 2)
      .closePath()
      .fill({ color: COL_ROBE })
      .stroke({ color: COL_GOLD, width: 1 });
    // Shield division
    g.moveTo(cx, cy - 6).lineTo(cx, cy + 6).stroke({ color: COL_GOLD, width: 0.5 });

    // Dove on shield
    g.ellipse(cx, cy - 1, 3, 2).fill({ color: COL_STONE_LT });
    g.moveTo(cx - 2, cy - 2)
      .quadraticCurveTo(cx - 4, cy - 4, cx - 2, cy - 4)
      .fill({ color: COL_STONE_LT });
    g.moveTo(cx + 2, cy - 2)
      .quadraticCurveTo(cx + 4, cy - 4, cx + 2, cy - 4)
      .fill({ color: COL_STONE_LT });

    // Laurel branches flanking shield
    for (const dir of [-1, 1]) {
      g.moveTo(cx + dir * 8, cy + 4)
        .quadraticCurveTo(cx + dir * 12, cy - 4, cx + dir * 6, cy - 8)
        .stroke({ color: 0x558833, width: 1 });
      // Leaves
      for (let i = 0; i < 4; i++) {
        const t = 0.2 + i * 0.2;
        const lx = cx + dir * (8 + (6 - 8) * t * t);
        const ly = cy + 4 + (-4 - 4) * t;
        g.ellipse(lx + dir * 2, ly, 2, 1).fill({ color: 0x558833, alpha: 0.7 });
      }
    }

    // Crown atop crest
    g.moveTo(cx - 5, cy - 8)
      .lineTo(cx - 5, cy - 11)
      .lineTo(cx - 2, cy - 9)
      .lineTo(cx, cy - 12)
      .lineTo(cx + 2, cy - 9)
      .lineTo(cx + 5, cy - 11)
      .lineTo(cx + 5, cy - 8)
      .closePath()
      .fill({ color: COL_GOLD });

    // Threshold
    g.rect(doorX - 2, doorY + doorH, doorW + 4, 2)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MORTAR, width: 0.3 });
  }

  // =========================================================================
  // Static props — topiary, lantern brackets
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Potted cypress topiary (flanking steps) ──
    for (const tx of [16, DW - 20]) {
      // Terracotta pot
      g.moveTo(tx, DH - 12)
        .lineTo(tx - 3, DH - 22)
        .lineTo(tx + 7, DH - 22)
        .lineTo(tx + 4, DH - 12)
        .closePath()
        .fill({ color: COL_POT });
      g.rect(tx - 4, DH - 24, 12, 3).fill({ color: COL_POT });
      // Cypress tree (conical)
      g.moveTo(tx + 2, DH - 24)
        .lineTo(tx - 2, DH - 34)
        .quadraticCurveTo(tx + 2, DH - 44, tx + 6, DH - 34)
        .closePath()
        .fill({ color: COL_CYPRESS });
      g.moveTo(tx + 2, DH - 28)
        .lineTo(tx, DH - 36)
        .quadraticCurveTo(tx + 2, DH - 42, tx + 4, DH - 36)
        .closePath()
        .fill({ color: COL_CYPRESS_DK });
    }

    // ── Brass lantern brackets (on façade, flanking door) ──
    for (const lx of [22, DW - 22]) {
      const ly = 62;
      // Bracket arm
      g.moveTo(lx, ly + 8).lineTo(lx, ly).stroke({ color: COL_BRASS_DK, width: 1.5 });
      g.moveTo(lx - 2, ly + 8).lineTo(lx + 2, ly + 8).stroke({ color: COL_BRASS_DK, width: 1 });
      // Lantern body
      g.moveTo(lx - 3, ly)
        .lineTo(lx - 4, ly + 6)
        .lineTo(lx + 4, ly + 6)
        .lineTo(lx + 3, ly)
        .closePath()
        .fill({ color: COL_BRASS })
        .stroke({ color: COL_BRASS_DK, width: 0.4 });
      // Lantern cap
      g.moveTo(lx - 3, ly).lineTo(lx, ly - 3).lineTo(lx + 3, ly).fill({ color: COL_BRASS_DK });
      g.circle(lx, ly - 3, 0.8).fill({ color: COL_GOLD });
    }
  }

  // =========================================================================
  // Arched windows with stained-glass + glow
  // =========================================================================

  private _updateWindows(time: number): void {
    const g = this._windows;
    g.clear();

    const glow = 0.35 + Math.sin(time * GLOW_PULSE) * 0.15;

    for (const wx of [36, DW - 36]) {
      const wy = 44;
      const ww = 14;
      const wh = 28;

      // Window recess
      g.rect(wx - ww / 2, wy, ww, wh).fill({ color: COL_WINDOW });
      // Arched top
      g.arc(wx, wy, ww / 2, Math.PI, 0).fill({ color: COL_WINDOW });

      // Stained-glass panes (3 rows)
      const pw = ww - 2;
      const ph = wh / 3;
      g.rect(wx - pw / 2, wy + 1, pw, ph).fill({ color: COL_GLASS_B, alpha: 0.6 });
      g.rect(wx - pw / 2, wy + 1 + ph, pw, ph).fill({ color: COL_GLASS_G, alpha: 0.6 });
      g.rect(wx - pw / 2, wy + 1 + ph * 2, pw, ph).fill({ color: COL_GLASS_Y, alpha: 0.6 });

      // Lead caming
      for (let i = 1; i <= 2; i++) {
        g.moveTo(wx - ww / 2, wy + i * ph)
          .lineTo(wx + ww / 2, wy + i * ph)
          .stroke({ color: COL_GLASS_LEAD, width: 0.4 });
      }
      g.moveTo(wx, wy).lineTo(wx, wy + wh).stroke({ color: COL_GLASS_LEAD, width: 0.4 });

      // Frame
      g.rect(wx - ww / 2, wy, ww, wh).stroke({ color: COL_BRASS, width: 1 });
      // Arch frame
      g.arc(wx, wy, ww / 2, Math.PI, 0).stroke({ color: COL_BRASS, width: 1 });

      // Sill
      g.rect(wx - ww / 2 - 2, wy + wh, ww + 4, 2).fill({ color: COL_MARBLE });

      // Warm interior glow
      g.rect(wx - ww / 2 - 2, wy - 2, ww + 4, wh + 6).fill({ color: COL_GLOW, alpha: glow * 0.06 });

      // Small player-colored pennant below window
      const py = wy + wh + 6;
      g.moveTo(wx - 4, py)
        .lineTo(wx + 4, py)
        .lineTo(wx, py + 8)
        .closePath()
        .fill({ color: this._playerColor, alpha: 0.6 });
    }
  }

  // =========================================================================
  // Diplomat character
  // =========================================================================

  private _updateDiplomat(time: number): void {
    const g = this._diplomat;
    g.clear();

    const dx = DW / 2 + 18;
    const dy = DH - 28;
    const sway = Math.sin(time * DIPLOMAT_SWAY) * 1;

    // ── Scroll (held in left hand) ──
    const scrollX = dx - 6 + sway * 0.2;
    g.rect(scrollX - 1, dy - 4, 3, 10).fill({ color: COL_SCROLL });
    g.rect(scrollX - 2, dy - 5, 5, 1.5).fill({ color: COL_WOOD });
    g.rect(scrollX - 2, dy + 5, 5, 1.5).fill({ color: COL_WOOD });

    // ── Robe (long, flowing diplomatic blue) ──
    g.moveTo(dx - 4 + sway * 0.15, dy - 8)
      .lineTo(dx + 5 + sway * 0.15, dy - 8)
      .lineTo(dx + 7, dy + 10)
      .lineTo(dx - 6, dy + 10)
      .closePath()
      .fill({ color: COL_ROBE });
    // Robe highlight
    g.moveTo(dx - 2 + sway * 0.15, dy - 6)
      .lineTo(dx + 2 + sway * 0.15, dy - 6)
      .lineTo(dx + 3, dy + 8)
      .lineTo(dx - 3, dy + 8)
      .closePath()
      .fill({ color: COL_ROBE_DK });
    // Gold hem
    g.moveTo(dx - 6, dy + 9).lineTo(dx + 7, dy + 9).stroke({ color: COL_ROBE_TRIM, width: 1 });
    // Sash / belt
    g.rect(dx - 4 + sway * 0.15, dy - 2, 9, 1.5).fill({ color: COL_ROBE_TRIM });

    // ── Head ──
    g.circle(dx + sway * 0.2, dy - 12, 4).fill({ color: COL_SKIN });
    // Eyes
    g.circle(dx - 1.5 + sway * 0.2, dy - 12.5, 0.5).fill({ color: 0x222222 });
    g.circle(dx + 1.5 + sway * 0.2, dy - 12.5, 0.5).fill({ color: 0x222222 });
    // Neat beard
    g.moveTo(dx - 2 + sway * 0.2, dy - 10)
      .lineTo(dx + 2 + sway * 0.2, dy - 10)
      .lineTo(dx + 1 + sway * 0.2, dy - 7)
      .lineTo(dx - 1 + sway * 0.2, dy - 7)
      .closePath()
      .fill({ color: 0x3a2a1a });
    // Hair (dark, neat)
    g.arc(dx + sway * 0.2, dy - 12, 4.5, Math.PI + 0.4, -0.4)
      .stroke({ color: 0x3a2a1a, width: 1.2 });

    // ── Diplomat hat (flat beret) ──
    g.ellipse(dx + sway * 0.2, dy - 16, 5, 2).fill({ color: COL_ROBE });
    g.ellipse(dx + sway * 0.2, dy - 16.5, 4, 1.5).fill({ color: COL_ROBE_DK });

    // Hand holding scroll
    g.circle(scrollX + 0.5, dy - 2, 1.5).fill({ color: COL_SKIN_DK });

    // Feet
    g.rect(dx - 4, dy + 9, 3.5, 2).fill({ color: COL_WOOD });
    g.rect(dx + 1, dy + 9, 3.5, 2).fill({ color: COL_WOOD });
  }

  // =========================================================================
  // Pigeons on pediment
  // =========================================================================

  private _updatePigeons(time: number): void {
    const g = this._pigeons;
    g.clear();

    const pigeons = [
      { x: 38, y: 17 },
      { x: 86, y: 18 },
    ];

    for (let i = 0; i < pigeons.length; i++) {
      const p = pigeons[i];
      const bob = Math.sin(time * PIGEON_BOB + i * 3.5) * 0.8;
      const headTurn = Math.sin(time * 0.9 + i * 4) * 0.7;
      const py = p.y + bob;

      // Body
      g.ellipse(p.x, py, 3.5, 2).fill({ color: COL_PIGEON });
      g.ellipse(p.x + 0.5, py - 0.5, 2.5, 1.2).fill({ color: COL_PIGEON_DK });
      // Neck
      g.circle(p.x - 2 + headTurn, py - 1.5, 1.5).fill({ color: COL_PIGEON_NECK });
      // Head
      g.circle(p.x - 2 + headTurn, py - 3, 1.3).fill({ color: COL_PIGEON });
      // Beak
      g.moveTo(p.x - 3.5 + headTurn, py - 3)
        .lineTo(p.x - 5 + headTurn, py - 2.5)
        .lineTo(p.x - 3.5 + headTurn, py - 2.5)
        .fill({ color: COL_GOLD_DK });
      // Eye
      g.circle(p.x - 2.5 + headTurn, py - 3.5, 0.3).fill({ color: 0xff4400 });
      // Tail
      g.moveTo(p.x + 3.5, py)
        .lineTo(p.x + 6, py + 0.5)
        .lineTo(p.x + 6, py - 0.5)
        .closePath()
        .fill({ color: COL_PIGEON_DK });
      // Feet
      g.moveTo(p.x - 0.5, py + 2).lineTo(p.x - 0.5, py + 3.5).stroke({ color: 0x884444, width: 0.3 });
      g.moveTo(p.x + 1, py + 2).lineTo(p.x + 1, py + 3.5).stroke({ color: 0x884444, width: 0.3 });
    }
  }

  // =========================================================================
  // Effects — lantern glow, door glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    const flick = Math.sin(time * 6);

    // ── Lantern flames & glow ──
    for (const lx of [22, DW - 22]) {
      const ly = 62;
      // Candle flame inside lantern
      const fh = 3 + flick * 0.5;
      g.moveTo(lx - 1, ly + 2)
        .quadraticCurveTo(lx + flick * 0.3, ly + 2 - fh, lx + 1, ly + 2)
        .fill({ color: 0xffcc44 });
      // Glow through glass
      g.rect(lx - 2, ly + 1, 4, 4).fill({ color: COL_GLOW, alpha: 0.3 + flick * 0.05 });
      // Halo
      g.circle(lx, ly + 3, 7).fill({ color: COL_GLOW, alpha: 0.05 + flick * 0.01 });
    }

    // ── Interior warm glow through doorway ──
    const doorGlow = 0.05 + Math.sin(time * 1.5) * 0.02;
    g.rect(DW / 2 - 12, 66, 24, DH - 78).fill({ color: COL_GLOW, alpha: doorGlow });
  }

  // =========================================================================
  // Rooftop banners
  // =========================================================================

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    for (let i = 0; i < 2; i++) {
      const fx = i === 0 ? 26 : DW - 26;
      const fy = 10;
      const dir = i === 0 ? -1 : 1;
      const wave = Math.sin(time * FLAG_SPEED + i * 1.5) * 3;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + i * 1.5 + 1) * 1.5;

      // Pole
      g.rect(fx - 1, fy - 4, 2, 14)
        .fill({ color: COL_BRASS_DK })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      g.circle(fx, fy - 5, 1.5).fill({ color: COL_GOLD });

      // Banner cloth (rectangular, waving)
      g.moveTo(fx + dir, fy - 2)
        .bezierCurveTo(
          fx + dir * 6 + wave * dir * 0.3,
          fy - 1 + wave2 * 0.3,
          fx + dir * 10 + wave * dir * 0.5,
          fy + 2 + wave2 * 0.3,
          fx + dir * 14 + wave * dir,
          fy + 4 + wave2,
        )
        .lineTo(fx + dir * 13 + wave * dir * 0.8, fy + 16 + wave2 * 0.5)
        .bezierCurveTo(
          fx + dir * 9 + wave * dir * 0.4,
          fy + 15 + wave2 * 0.2,
          fx + dir * 4,
          fy + 14,
          fx + dir,
          fy + 14,
        )
        .closePath()
        .fill({ color: this._playerColor });
      // Gold trim
      g.moveTo(fx + dir, fy - 2)
        .bezierCurveTo(
          fx + dir * 6 + wave * dir * 0.3,
          fy - 1 + wave2 * 0.3,
          fx + dir * 10 + wave * dir * 0.5,
          fy + 2 + wave2 * 0.3,
          fx + dir * 14 + wave * dir,
          fy + 4 + wave2,
        )
        .stroke({ color: COL_GOLD, width: 0.5 });

      // Fringe
      for (let f = 0; f < 4; f++) {
        const ffx = fx + dir * (2 + f * 3);
        const ffy = fy + 14 + Math.sin(time * 2 + f) * 0.4;
        g.moveTo(ffx, ffy).lineTo(ffx, ffy + 2).stroke({ color: COL_GOLD, width: 0.4 });
      }
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private _drawColumn(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    // Shaft
    g.rect(x, y, w, h).fill({ color: COL_MARBLE });
    // Fluting
    for (let i = 0; i < 2; i++) {
      g.rect(x + 1 + i * 3, y + 6, 0.8, h - 10).fill({ color: COL_MARBLE_DK, alpha: 0.3 });
    }
    // Corinthian capital (ornate top)
    g.rect(x - 2, y, w + 4, 3)
      .fill({ color: COL_MARBLE_LT })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    // Acanthus leaf suggestion
    g.moveTo(x - 1, y + 3).lineTo(x + w / 2, y + 5).lineTo(x + w + 1, y + 3)
      .stroke({ color: COL_MARBLE_DK, width: 0.4 });
    // Volute
    g.circle(x, y + 1, 1.5).stroke({ color: COL_MARBLE_DK, width: 0.3 });
    g.circle(x + w, y + 1, 1.5).stroke({ color: COL_MARBLE_DK, width: 0.3 });
    // Base (Attic base)
    g.rect(x - 1, y + h - 3, w + 2, 3)
      .fill({ color: COL_MARBLE_LT })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    g.rect(x - 2, y + h - 1, w + 4, 1).fill({ color: COL_MARBLE_DK });
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    for (let i = 0; i < w; i++) {
      const h = 1 + Math.sin(i * 2.3) * 1.5;
      g.rect(x + i * 1.2, y - h, 1.2, h + 0.5).fill({ color: COL_MOSS, alpha: 0.5 });
    }
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    for (let i = 0; i < h; i++) {
      const dx = Math.sin(i * 0.8) * 2;
      g.rect(x + dx, y + i, 1, 1.5).fill({ color: COL_IVY, alpha: 0.6 });
    }
    for (let i = 3; i < h; i += 4) {
      const dx = Math.sin(i * 0.8) * 2;
      const leafDir = i % 8 < 4 ? -1 : 1;
      g.ellipse(x + dx + leafDir * 2.5, y + i, 2, 1.5).fill({ color: COL_IVY_LT, alpha: 0.5 });
    }
  }
}
