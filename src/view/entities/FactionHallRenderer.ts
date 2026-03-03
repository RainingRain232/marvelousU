// Procedural Faction Hall renderer for BuildingView.
//
// Draws a detailed 2×2 tile grand faction hall with:
//   • Imposing stone hall with brick pattern, stone variation, mortar
//   • Vaulted gabled roof with ridge tiles, dormer vent, chimney
//   • Grand arched entrance with carved voussoirs, iron-bound oak doors
//   • Stained-glass rose window above entrance with animated glow
//   • Two flanking buttress-pillars with carved capitals and torch brackets
//   • Heraldic shield above door with player-colored crest & crossed swords
//   • Interior warm glow flickering through windows and doorway
//   • Council elder at entrance: robed scholar with staff, gentle sway
//   • Two stained-glass lancet windows with colored panes
//   • Stone steps leading to entrance, cobblestone courtyard
//   • Moss on lower stones, ivy creeping up buttresses
//   • Iron chandelier chain visible through dormer, wall-mounted torches
//   • Waving player-colored pennants on two roof finials
//   • Pigeons on the rooftop that occasionally coo/bob
//
// All drawing uses PixiJS Graphics. 2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt)`.

import { Container, Graphics } from "pixi.js";
import type { PlayerId } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const DW = 2 * TS; // 128px
const DH = 2 * TS; // 128px

// --- Palette ---
const COL_STONE = 0x7a6a58;
const COL_STONE_DK = 0x544838;
const COL_STONE_LT = 0x9a8a78;
const COL_MORTAR = 0x685a4a;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_ROOF = 0x3a2828;
const COL_ROOF_DK = 0x281818;
const COL_ROOF_LT = 0x5a3838;
const COL_ROOF_TILE = 0x4a3030;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_DOOR = 0x3a2010;
const COL_DOOR_LT = 0x5a3820;
const COL_DOOR_BAND = 0x444444;
const COL_WINDOW = 0x1a1a2e;
const COL_GLASS_R = 0xcc3344;
const COL_GLASS_B = 0x3366bb;
const COL_GLASS_G = 0x33aa55;
const COL_GLASS_Y = 0xeebb33;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb08050;
const COL_ROBE = 0x4a3060;
const COL_ROBE_DK = 0x2a1840;
const COL_ROBE_TRIM = 0xccaa44;
const COL_STAFF = 0x6a5030;
const COL_STAFF_GEM = 0x44ddff;
const COL_HAIR_GRAY = 0xbbbbbb;
const COL_PIGEON = 0x7a7a88;
const COL_PIGEON_DK = 0x5a5a66;
const COL_PIGEON_NECK = 0x66aa77;
const COL_COBBLE = 0x6a6a5a;
const COL_COBBLE_DK = 0x4a4a3a;
const COL_BANNER_NEU = 0x888844;

// Animation timing
const FLAG_SPEED = 3.0;
const GLOW_PULSE = 2.0;
const TORCH_FLICKER = 8.0;
const ELDER_SWAY = 1.2;
const PIGEON_BOB = 2.5;

// ---------------------------------------------------------------------------
// FactionHallRenderer
// ---------------------------------------------------------------------------

export class FactionHallRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();       // Ground, courtyard
  private _building = new Graphics();   // Walls, roof, pillars
  private _windows = new Graphics();    // Stained glass + glow
  private _door = new Graphics();       // Door, heraldic shield
  private _elder = new Graphics();      // Council elder
  private _effects = new Graphics();    // Torches, chandelier, glow
  private _pigeons = new Graphics();    // Rooftop pigeons
  private _banner = new Graphics();     // Player pennants

  private _time = 0;
  private _playerColor: number;

  constructor(owner: PlayerId | null) {
    this._playerColor =
      owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : COL_BANNER_NEU;

    this._drawBase();
    this._drawBuilding();
    this._drawDoor();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._windows);
    this.container.addChild(this._door);
    this.container.addChild(this._elder);
    this.container.addChild(this._effects);
    this.container.addChild(this._pigeons);
    this.container.addChild(this._banner);
  }

  tick(dt: number): void {
    this._time += dt;
    const t = this._time;

    this._updateWindows(t);
    this._updateElder(t);
    this._updateEffects(t);
    this._updatePigeons(t);
    this._updateBanner(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground / courtyard
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // Earth/ground base
    g.rect(0, DH - 18, DW, 18).fill({ color: COL_STONE_DK });

    // Cobblestone courtyard
    for (let row = 0; row < 3; row++) {
      const yy = DH - 16 + row * 5;
      const xOff = row % 2 === 0 ? 0 : 6;
      for (let x = xOff; x < DW; x += 12) {
        const w = 10 + Math.sin(x * 7 + row * 3) * 2;
        g.roundRect(x, yy, w, 4, 1).fill({
          color: (x + row) % 3 === 0 ? COL_COBBLE_DK : COL_COBBLE,
        });
        g.roundRect(x, yy, w, 4, 1).stroke({ color: COL_STONE_DK, width: 0.3 });
      }
    }

    // Stone steps (3 steps)
    const sx = DW / 2 - 18;
    const sw = 36;
    for (let i = 0; i < 3; i++) {
      const sy = DH - 18 - i * 3;
      g.rect(sx - i * 2, sy, sw + i * 4, 3)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }

    // Moss on base stones
    this._drawMoss(g, 8, DH - 20, 6);
    this._drawMoss(g, 105, DH - 19, 5);
    this._drawMoss(g, 22, DH - 18, 4);
  }

  // =========================================================================
  // Main building structure
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    const bx = 10;
    const by = 30;
    const bw = DW - 20;
    const bh = DH - 48;

    // ── Main stone walls ──
    g.rect(bx, by, bw, bh).fill({ color: COL_STONE });

    // Left highlight edge
    g.rect(bx, by, 4, bh).fill({ color: COL_STONE_LT });

    // Right shadow edge
    g.rect(bx + bw - 3, by, 3, bh).fill({ color: COL_STONE_DK });

    // ── Brick pattern ──
    this._drawBrickPattern(g, bx, by, bw, bh);

    // ── Stone variation ──
    this._drawStoneVariation(g, bx, by, bw, bh);

    // ── Buttress pillars (flanking entrance) ──
    // Left buttress
    this._drawButtress(g, bx - 2, by + 10, 12, bh - 10);
    // Right buttress
    this._drawButtress(g, bx + bw - 10, by + 10, 12, bh - 10);

    // ── Gabled roof ──
    const roofPeak = 10;
    const roofLeft = bx - 4;
    const roofRight = bx + bw + 4;
    const roofBase = by + 2;

    // Main roof shape
    g.moveTo(roofLeft, roofBase)
      .lineTo(DW / 2, roofPeak)
      .lineTo(roofRight, roofBase)
      .closePath()
      .fill({ color: COL_ROOF });

    // Roof highlight (right half)
    g.moveTo(DW / 2, roofPeak)
      .lineTo(roofRight, roofBase)
      .lineTo(roofRight - 4, roofBase)
      .lineTo(DW / 2, roofPeak + 3)
      .closePath()
      .fill({ color: COL_ROOF_LT });

    // Roof tile lines
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const ly = roofPeak + (roofBase - roofPeak) * t;
      const lx1 = roofLeft + (DW / 2 - roofLeft) * (1 - t);
      const lx2 = roofRight - (roofRight - DW / 2) * (1 - t);
      g.moveTo(lx1, ly).lineTo(lx2, ly).stroke({ color: COL_ROOF_TILE, width: 0.5 });
    }

    // Ridge beam
    g.rect(DW / 2 - 1, roofPeak - 1, 2, 4).fill({ color: COL_ROOF_DK });

    // ── Roof finial left ──
    const finLx = roofLeft + 14;
    const finLy = roofPeak + 6;
    g.rect(finLx - 1, finLy - 6, 2, 8).fill({ color: COL_IRON });
    g.circle(finLx, finLy - 7, 1.5).fill({ color: COL_GOLD });

    // ── Roof finial right ──
    const finRx = roofRight - 14;
    const finRy = roofPeak + 6;
    g.rect(finRx - 1, finRy - 6, 2, 8).fill({ color: COL_IRON });
    g.circle(finRx, finRy - 7, 1.5).fill({ color: COL_GOLD });

    // ── Chimney (right side) ──
    const cx = bx + bw - 8;
    const cy = roofPeak + 4;
    g.rect(cx, cy, 8, 14).fill({ color: COL_STONE_DK });
    g.rect(cx - 1, cy, 10, 2).fill({ color: COL_STONE }); // cap
    g.rect(cx + 1, cy + 4, 6, 1).fill({ color: COL_MORTAR });
    g.rect(cx + 1, cy + 8, 6, 1).fill({ color: COL_MORTAR });

    // ── Dormer vent ──
    const dx = DW / 2;
    const dy = roofPeak + 7;
    g.moveTo(dx - 6, dy + 6)
      .lineTo(dx, dy)
      .lineTo(dx + 6, dy + 6)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Vent slats
    for (let i = 0; i < 3; i++) {
      g.moveTo(dx - 3 + i, dy + 2 + i)
        .lineTo(dx + 3 - i, dy + 2 + i)
        .stroke({ color: COL_WOOD_DK, width: 0.5 });
    }

    // ── Cornice / lintel ──
    g.rect(bx - 2, by, bw + 4, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });

    // Dentil pattern
    for (let i = 0; i < 16; i++) {
      g.rect(bx + i * 7, by + 3, 4, 2).fill({ color: COL_STONE_DK });
    }

    // ── Moss & ivy ──
    this._drawMoss(g, bx + 2, by + bh - 6, 5);
    this._drawMoss(g, bx + bw - 8, by + bh - 4, 4);
    this._drawIvy(g, bx + 2, by + 15, 22);
    this._drawIvy(g, bx + bw - 4, by + 18, 18);
  }

  // =========================================================================
  // Door & heraldic shield
  // =========================================================================

  private _drawDoor(): void {
    const g = this._door;

    const doorX = DW / 2 - 14;
    const doorY = 68;
    const doorW = 28;
    const doorH = DH - 68 - 18;

    // ── Arched doorway ──
    // Voussoirs (arch stones)
    const archCx = DW / 2;
    const archCy = doorY;
    const archR = doorW / 2 + 2;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const a2 = Math.PI + ((i + 1) / 6) * Math.PI;
      g.moveTo(archCx + Math.cos(a) * (archR - 4), archCy + Math.sin(a) * (archR - 4))
        .lineTo(archCx + Math.cos(a) * archR, archCy + Math.sin(a) * archR)
        .lineTo(archCx + Math.cos(a2) * archR, archCy + Math.sin(a2) * archR)
        .lineTo(archCx + Math.cos(a2) * (archR - 4), archCy + Math.sin(a2) * (archR - 4))
        .closePath()
        .fill({ color: i % 2 === 0 ? COL_STONE_LT : COL_STONE })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }

    // Keystone
    g.moveTo(archCx - 3, archCy - archR - 2)
      .lineTo(archCx + 3, archCy - archR - 2)
      .lineTo(archCx + 2, archCy - archR + 3)
      .lineTo(archCx - 2, archCy - archR + 3)
      .closePath()
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_MORTAR, width: 0.3 });

    // Door recess shadow
    g.rect(doorX - 1, doorY, doorW + 2, doorH + 1).fill({ color: 0x1a1208 });

    // ── Oak doors (double) ──
    const halfW = doorW / 2 - 1;
    // Left door
    g.rect(doorX, doorY, halfW, doorH).fill({ color: COL_DOOR });
    g.rect(doorX + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: COL_DOOR_LT });
    // Vertical planks
    for (let i = 1; i < 3; i++) {
      g.rect(doorX + i * 4, doorY, 0.5, doorH).fill({ color: COL_WOOD_DK });
    }
    // Right door
    const rdx = doorX + halfW + 2;
    g.rect(rdx, doorY, halfW, doorH).fill({ color: COL_DOOR });
    g.rect(rdx + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: COL_DOOR_LT });
    for (let i = 1; i < 3; i++) {
      g.rect(rdx + i * 4, doorY, 0.5, doorH).fill({ color: COL_WOOD_DK });
    }

    // Iron bands
    for (let i = 0; i < 3; i++) {
      const by = doorY + 6 + i * 12;
      g.rect(doorX, by, doorW, 2).fill({ color: COL_DOOR_BAND });
      // Studs
      g.circle(doorX + 3, by + 1, 1).fill({ color: COL_IRON_DK });
      g.circle(doorX + doorW - 3, by + 1, 1).fill({ color: COL_IRON_DK });
    }

    // Door handles (ring pulls)
    g.circle(DW / 2 - 4, doorY + doorH / 2 + 4, 2)
      .stroke({ color: COL_GOLD, width: 1 });
    g.circle(DW / 2 + 4, doorY + doorH / 2 + 4, 2)
      .stroke({ color: COL_GOLD, width: 1 });

    // ── Heraldic shield above door ──
    const sx = DW / 2;
    const sy = 52;

    // Shield shape (heater shield)
    g.moveTo(sx - 8, sy - 6)
      .lineTo(sx + 8, sy - 6)
      .lineTo(sx + 8, sy + 2)
      .quadraticCurveTo(sx, sy + 10, sx - 8, sy + 2)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: COL_GOLD, width: 1 });

    // Shield division (per pale)
    g.moveTo(sx, sy - 6).lineTo(sx, sy + 6).stroke({ color: COL_GOLD, width: 0.5 });
    g.moveTo(sx - 8, sy - 1).lineTo(sx + 8, sy - 1).stroke({ color: COL_GOLD, width: 0.5 });

    // Shield emblem: small crown
    g.moveTo(sx - 3, sy - 3)
      .lineTo(sx - 3, sy - 5)
      .lineTo(sx - 1, sy - 4)
      .lineTo(sx, sy - 6)
      .lineTo(sx + 1, sy - 4)
      .lineTo(sx + 3, sy - 5)
      .lineTo(sx + 3, sy - 3)
      .closePath()
      .fill({ color: COL_GOLD });

    // Crossed swords behind shield
    g.moveTo(sx - 12, sy - 2)
      .lineTo(sx + 12, sy + 6)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(sx + 12, sy - 2)
      .lineTo(sx - 12, sy + 6)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Hilts
    g.circle(sx - 11, sy - 1, 1.5).fill({ color: COL_GOLD_DK });
    g.circle(sx + 11, sy - 1, 1.5).fill({ color: COL_GOLD_DK });
  }

  // =========================================================================
  // Stained-glass windows (animated glow)
  // =========================================================================

  private _updateWindows(time: number): void {
    const g = this._windows;
    g.clear();

    const glow = 0.4 + Math.sin(time * GLOW_PULSE) * 0.15;

    // ── Left lancet window ──
    this._drawLancetWindow(g, 22, 46, 10, 22, glow);

    // ── Right lancet window ──
    this._drawLancetWindow(g, DW - 32, 46, 10, 22, glow);

    // ── Rose window above door ──
    const rx = DW / 2;
    const ry = 42;
    const rr = 7;

    // Window recess
    g.circle(rx, ry, rr + 1).fill({ color: COL_WINDOW });
    // Colored panes (quadrants)
    g.moveTo(rx + rr, ry).arc(rx, ry, rr, 0, Math.PI / 2).lineTo(rx, ry).closePath().fill({ color: COL_GLASS_R, alpha: 0.7 });
    g.moveTo(rx, ry + rr).arc(rx, ry, rr, Math.PI / 2, Math.PI).lineTo(rx, ry).closePath().fill({ color: COL_GLASS_B, alpha: 0.7 });
    g.moveTo(rx - rr, ry).arc(rx, ry, rr, Math.PI, Math.PI * 1.5).lineTo(rx, ry).closePath().fill({ color: COL_GLASS_G, alpha: 0.7 });
    g.moveTo(rx, ry - rr).arc(rx, ry, rr, Math.PI * 1.5, Math.PI * 2).lineTo(rx, ry).closePath().fill({ color: COL_GLASS_Y, alpha: 0.7 });
    // Lead caming
    g.moveTo(rx - rr, ry).lineTo(rx + rr, ry).stroke({ color: COL_IRON_DK, width: 0.6 });
    g.moveTo(rx, ry - rr).lineTo(rx, ry + rr).stroke({ color: COL_IRON_DK, width: 0.6 });
    g.circle(rx, ry, rr).stroke({ color: COL_IRON, width: 0.8 });
    g.circle(rx, ry, rr * 0.5).stroke({ color: COL_IRON_DK, width: 0.4 });
    // Centre gem
    g.circle(rx, ry, 1.5).fill({ color: COL_GOLD });

    // Warm glow from inside
    g.circle(rx, ry, rr + 4).fill({ color: COL_GLOW, alpha: glow * 0.08 });
  }

  private _drawLancetWindow(
    g: Graphics, x: number, y: number, w: number, h: number, glow: number,
  ): void {
    // Frame
    g.rect(x, y, w, h).fill({ color: COL_WINDOW });
    g.moveTo(x, y).arc(x + w / 2, y, w / 2, Math.PI, 0).fill({ color: COL_WINDOW });

    // Colored panes
    const pw = w - 2;
    const ph = h / 3;
    g.rect(x + 1, y + 1, pw, ph).fill({ color: COL_GLASS_R, alpha: 0.6 });
    g.rect(x + 1, y + 1 + ph, pw, ph).fill({ color: COL_GLASS_B, alpha: 0.6 });
    g.rect(x + 1, y + 1 + ph * 2, pw, ph).fill({ color: COL_GLASS_Y, alpha: 0.6 });

    // Lead caming (horizontal)
    for (let i = 1; i <= 2; i++) {
      g.moveTo(x, y + i * ph).lineTo(x + w, y + i * ph).stroke({ color: COL_IRON_DK, width: 0.4 });
    }
    // Lead caming (vertical centre)
    g.moveTo(x + w / 2, y).lineTo(x + w / 2, y + h).stroke({ color: COL_IRON_DK, width: 0.4 });

    // Frame border
    g.rect(x, y, w, h).stroke({ color: COL_STONE_DK, width: 0.5 });

    // Inner glow
    g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_GLOW, alpha: glow * 0.06 });
  }

  // =========================================================================
  // Council elder
  // =========================================================================

  private _updateElder(time: number): void {
    const g = this._elder;
    g.clear();

    const ex = 28;
    const ey = DH - 32;
    const sway = Math.sin(time * ELDER_SWAY) * 1.5;

    // Staff (held in right hand)
    const staffX = ex + 8 + sway * 0.3;
    g.moveTo(staffX, ey - 20).lineTo(staffX + 1, ey + 12).stroke({ color: COL_STAFF, width: 1.5 });
    // Staff gem
    const gemPulse = 0.6 + Math.sin(time * 1.8) * 0.3;
    g.circle(staffX + 0.5, ey - 21, 2).fill({ color: COL_STAFF_GEM, alpha: gemPulse });
    g.circle(staffX + 0.5, ey - 21, 4).fill({ color: COL_STAFF_GEM, alpha: gemPulse * 0.15 });

    // Robe (long flowing)
    g.moveTo(ex - 4 + sway * 0.2, ey - 6)
      .lineTo(ex + 6 + sway * 0.2, ey - 6)
      .lineTo(ex + 8, ey + 12)
      .lineTo(ex - 6, ey + 12)
      .closePath()
      .fill({ color: COL_ROBE });
    // Robe highlight
    g.moveTo(ex - 2 + sway * 0.2, ey - 4)
      .lineTo(ex + 2 + sway * 0.2, ey - 4)
      .lineTo(ex + 3, ey + 10)
      .lineTo(ex - 3, ey + 10)
      .closePath()
      .fill({ color: COL_ROBE_DK });
    // Robe trim (gold hem)
    g.moveTo(ex - 6, ey + 11).lineTo(ex + 8, ey + 11).stroke({ color: COL_ROBE_TRIM, width: 1 });
    // Belt / sash
    g.rect(ex - 4 + sway * 0.2, ey, 10, 1.5).fill({ color: COL_ROBE_TRIM });

    // Head
    g.circle(ex + 1 + sway * 0.3, ey - 10, 4).fill({ color: COL_SKIN });
    // Eyes
    g.circle(ex - 0.5 + sway * 0.3, ey - 11, 0.5).fill({ color: 0x222222 });
    g.circle(ex + 2.5 + sway * 0.3, ey - 11, 0.5).fill({ color: 0x222222 });
    // Beard (long white)
    g.moveTo(ex - 1 + sway * 0.3, ey - 8)
      .lineTo(ex + 3 + sway * 0.3, ey - 8)
      .lineTo(ex + 2 + sway * 0.3, ey - 2)
      .lineTo(ex + sway * 0.3, ey - 2)
      .closePath()
      .fill({ color: COL_HAIR_GRAY });
    // Bushy eyebrows
    g.rect(ex - 1.5 + sway * 0.3, ey - 12.5, 2.5, 0.8).fill({ color: COL_HAIR_GRAY });
    g.rect(ex + 1.5 + sway * 0.3, ey - 12.5, 2.5, 0.8).fill({ color: COL_HAIR_GRAY });

    // Hair (receding, gray)
    g.moveTo(ex + 1 + sway * 0.3 + 4.5 * Math.cos(Math.PI + 0.3), ey - 10 + 4.5 * Math.sin(Math.PI + 0.3))
      .arc(ex + 1 + sway * 0.3, ey - 10, 4.5, Math.PI + 0.3, -0.3)
      .stroke({ color: COL_HAIR_GRAY, width: 1.2 });

    // Hand holding staff
    g.circle(staffX, ey - 4, 1.5).fill({ color: COL_SKIN_DK });

    // Feet (sandals)
    g.rect(ex - 4, ey + 11, 4, 2).fill({ color: COL_WOOD });
    g.rect(ex + 2, ey + 11, 4, 2).fill({ color: COL_WOOD });
  }

  // =========================================================================
  // Effects — torches, chimney smoke, interior glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // ── Wall torches (on buttresses) ──
    const torchFlick = Math.sin(time * TORCH_FLICKER);
    for (const tx of [16, DW - 16]) {
      const ty = 62;
      // Bracket
      g.moveTo(tx, ty + 6).lineTo(tx, ty).stroke({ color: COL_IRON, width: 1.5 });
      g.moveTo(tx - 2, ty + 6).lineTo(tx + 2, ty + 6).stroke({ color: COL_IRON, width: 1 });
      // Flame
      const fh = 4 + torchFlick * 1;
      g.moveTo(tx - 2, ty)
        .quadraticCurveTo(tx + torchFlick * 0.5, ty - fh, tx + 2, ty)
        .fill({ color: 0xff6622 });
      g.moveTo(tx - 1, ty)
        .quadraticCurveTo(tx - torchFlick * 0.3, ty - fh + 1, tx + 1, ty)
        .fill({ color: 0xffaa44 });
      // Glow
      g.circle(tx, ty - 1, 5).fill({ color: COL_GLOW, alpha: 0.08 + torchFlick * 0.02 });
    }

    // ── Chimney smoke ──
    const chimX = DW - 18;
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.4 + i * 0.8) % 3.0;
      if (phase > 2.5) continue;
      const rise = phase * 10;
      const drift = Math.sin(time * 0.6 + i * 2) * 4;
      const alpha = 0.12 * (1 - phase / 2.5);
      g.circle(chimX + 4 + drift, 14 - rise, 2.5 + phase * 1.5).fill({
        color: 0x888888,
        alpha,
      });
    }

    // ── Interior glow through doorway ──
    const doorGlow = 0.06 + Math.sin(time * 1.5) * 0.02;
    g.rect(DW / 2 - 12, 70, 24, DH - 88).fill({ color: COL_GLOW, alpha: doorGlow });

    // ── Iron chandelier chains visible through dormer ──
    const dx = DW / 2;
    const dy = 19;
    g.moveTo(dx - 3, dy).lineTo(dx - 3, dy + 4).stroke({ color: COL_IRON_DK, width: 0.4 });
    g.moveTo(dx + 3, dy).lineTo(dx + 3, dy + 4).stroke({ color: COL_IRON_DK, width: 0.4 });
    g.moveTo(dx - 3, dy + 4).lineTo(dx + 3, dy + 4).stroke({ color: COL_IRON_DK, width: 0.5 });
    // Tiny candle glow
    g.circle(dx, dy + 4, 1).fill({ color: COL_GLOW, alpha: 0.5 + Math.sin(time * 6) * 0.2 });
  }

  // =========================================================================
  // Pigeons on rooftop
  // =========================================================================

  private _updatePigeons(time: number): void {
    const g = this._pigeons;
    g.clear();

    const pigeons = [
      { x: 34, y: 24 },
      { x: 88, y: 22 },
    ];

    for (let i = 0; i < pigeons.length; i++) {
      const p = pigeons[i];
      const bob = Math.sin(time * PIGEON_BOB + i * 3) * 1;
      const headTurn = Math.sin(time * 1.0 + i * 4) * 0.8;
      const py = p.y + bob;

      // Body
      g.ellipse(p.x, py, 4, 2.5).fill({ color: COL_PIGEON });
      // Wing sheen
      g.ellipse(p.x + 1, py - 0.5, 3, 1.5).fill({ color: COL_PIGEON_DK });
      // Iridescent neck
      g.circle(p.x - 2.5 + headTurn, py - 2, 1.8).fill({ color: COL_PIGEON_NECK });
      // Head
      g.circle(p.x - 2.5 + headTurn, py - 3.5, 1.5).fill({ color: COL_PIGEON });
      // Beak
      g.moveTo(p.x - 4 + headTurn, py - 3.5)
        .lineTo(p.x - 5.5 + headTurn, py - 3)
        .lineTo(p.x - 4 + headTurn, py - 3)
        .fill({ color: COL_GOLD_DK });
      // Eye
      g.circle(p.x - 3 + headTurn, py - 4, 0.4).fill({ color: 0xff4400 });
      // Tail feathers
      g.moveTo(p.x + 4, py)
        .lineTo(p.x + 7, py + 1)
        .lineTo(p.x + 7, py - 0.5)
        .closePath()
        .fill({ color: COL_PIGEON_DK });
      // Feet
      g.moveTo(p.x - 1, py + 2).lineTo(p.x - 1, py + 4).stroke({ color: 0x884444, width: 0.4 });
      g.moveTo(p.x + 1, py + 2).lineTo(p.x + 1, py + 4).stroke({ color: 0x884444, width: 0.4 });
    }
  }

  // =========================================================================
  // Player pennants
  // =========================================================================

  private _updateBanner(time: number): void {
    const g = this._banner;
    g.clear();

    const finials = [
      { x: 24, y: 16 },
      { x: DW - 24, y: 16 },
    ];

    for (let i = 0; i < finials.length; i++) {
      const f = finials[i];
      const wave = Math.sin(time * FLAG_SPEED + i * 1.5) * 3;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + i * 1.5 + 1) * 1.5;
      const dir = i === 0 ? -1 : 1;

      // Pole
      g.rect(f.x - 1, f.y - 2, 2, 10)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      g.circle(f.x, f.y - 3, 1.5).fill({ color: COL_GOLD });

      // Pennant (triangular, streaming away from centre)
      g.moveTo(f.x, f.y)
        .bezierCurveTo(
          f.x + dir * 8 + wave * dir * 0.3,
          f.y + 1 + wave2 * 0.4,
          f.x + dir * 12 + wave * dir * 0.6,
          f.y + 3 + wave2 * 0.3,
          f.x + dir * 14 + wave * dir,
          f.y + 4 + wave2,
        )
        .lineTo(f.x, f.y + 8)
        .closePath()
        .fill({ color: this._playerColor });
      // Pennant trim
      g.moveTo(f.x, f.y)
        .bezierCurveTo(
          f.x + dir * 8 + wave * dir * 0.3,
          f.y + 1 + wave2 * 0.4,
          f.x + dir * 12 + wave * dir * 0.6,
          f.y + 3 + wave2 * 0.3,
          f.x + dir * 14 + wave * dir,
          f.y + 4 + wave2,
        )
        .stroke({ color: COL_GOLD, width: 0.5 });
    }
  }

  // =========================================================================
  // Helpers — stone texture, moss, ivy, buttress
  // =========================================================================

  private _drawBrickPattern(
    g: Graphics, bx: number, by: number, bw: number, bh: number,
  ): void {
    for (let row = 0; row < Math.floor(bh / 8); row++) {
      const yy = by + row * 8;
      g.moveTo(bx, yy).lineTo(bx + bw, yy).stroke({ color: COL_MORTAR, width: 0.4 });
      const xOff = row % 2 === 0 ? 0 : 10;
      for (let x = bx + xOff; x < bx + bw; x += 20) {
        g.moveTo(x, yy).lineTo(x, yy + 8).stroke({ color: COL_MORTAR, width: 0.3 });
      }
    }
  }

  private _drawStoneVariation(
    g: Graphics, bx: number, by: number, bw: number, bh: number,
  ): void {
    const seed = bx * 7 + by * 13;
    for (let i = 0; i < 12; i++) {
      const sx = bx + 4 + ((seed + i * 37) % (bw - 8));
      const sy = by + 4 + ((seed + i * 53) % (bh - 8));
      const sw = 4 + (i % 3) * 2;
      const sh = 3 + (i % 2) * 2;
      const col = i % 3 === 0 ? COL_STONE_LT : COL_STONE_DK;
      g.rect(sx, sy, sw, sh).fill({ color: col, alpha: 0.25 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    for (let i = 0; i < w; i++) {
      const h = 1 + Math.sin(i * 2.3) * 1.5;
      g.rect(x + i * 1.2, y - h, 1.2, h + 0.5).fill({ color: COL_MOSS, alpha: 0.5 });
    }
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    // Main vine
    for (let i = 0; i < h; i++) {
      const dx = Math.sin(i * 0.8) * 2;
      g.rect(x + dx, y + i, 1, 1.5).fill({ color: COL_IVY, alpha: 0.6 });
    }
    // Leaves
    for (let i = 3; i < h; i += 4) {
      const dx = Math.sin(i * 0.8) * 2;
      const dir = i % 8 < 4 ? -1 : 1;
      g.ellipse(x + dx + dir * 2.5, y + i, 2, 1.5).fill({ color: COL_IVY_LT, alpha: 0.5 });
    }
  }

  private _drawButtress(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    // Main pillar
    g.rect(x, y, w, h).fill({ color: COL_STONE_DK });
    // Highlight
    g.rect(x + 1, y, 2, h).fill({ color: COL_STONE });
    // Capital (top decoration)
    g.rect(x - 1, y, w + 2, 3).fill({ color: COL_STONE_LT });
    g.rect(x - 2, y, w + 4, 1.5)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    // Base
    g.rect(x - 1, y + h - 3, w + 2, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    // Torch bracket slot
    g.rect(x + w / 2 - 1, y + 20, 2, 3).fill({ color: COL_IRON });
  }
}
