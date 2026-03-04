// Procedural elite hall renderer for BuildingView.
//
// Draws a grand 2×2 tile elite warrior hall with:
//   • Imposing marble-and-stone façade with fluted pilasters, cornices, dentils
//   • Vaulted gabled roof with dark slate tiles, ridge cap, golden acroteria
//   • Crenellated parapet with arrow slits between merlons
//   • Grand gothic arched entrance: carved voussoirs, keystone, iron-bound doors
//   • Large stained-glass rose window with winged-sword warrior emblem, pulsing glow
//   • Two elite guards with full plate armour, plume helmets, spears, kite shields
//     — subtle breathing sway, occasional spear shift
//   • Golden throne visible through doorway with red carpet runner
//   • Weapon trophy displays: crossed swords, ornate shield, war hammer
//   • Two waving clan banners on poles (player-colored + crimson)
//   • Stone steps, cobblestone base, moss on lower courses, ivy on corners
//   • Wall-mounted iron torch brackets with flickering flames
//   • Gargoyle heads on roof corners
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

// --- Palette: marble & elite ---
const COL_MARBLE = 0xf0eadc;
const COL_MARBLE_DK = 0xc8c0ae;
const COL_MARBLE_LT = 0xfaf6ec;
const COL_MARBLE_WARM = 0xe8dcc8;
const COL_STONE = 0x8a7d66;
const COL_STONE_DK = 0x6a5d46;
const COL_MORTAR = 0x7a6d56;
const COL_WOOD = 0x4a2a10;
const COL_WOOD_DK = 0x321a08;
const COL_ROOF = 0x3a2828;
const COL_ROOF_DK = 0x281818;
const COL_ROOF_LT = 0x5a3838;
const COL_ROOF_TILE = 0x4a3030;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_CARPET = 0xaa2233;
const COL_CARPET_DK = 0x881122;

// Stained glass
const COL_GLASS_SKY = 0x4a6bff;
const COL_GLASS_GOLD = 0xffdd44;
const COL_GLASS_RED = 0xcc3333;
const COL_GLASS_SILVER = 0xaaaacc;
const COL_GLASS_LEAD = 0x333333;

// Guard armour
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_ARMOR_LT = 0x99aabb;
const COL_SHIELD = 0xcc3344;
const COL_SPEAR = 0x8b7355;
const COL_SWORD = 0xccccdd;
const COL_SKIN = 0xd4a574;
const COL_PLUME = 0xcc2244;

// Banner & effects
const COL_BANNER_2 = 0x2244aa;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_GARGOYLE = 0x6a6a60;
const COL_GARGOYLE_DK = 0x4a4a42;
const COL_COBBLE = 0x6a6a5a;
const COL_COBBLE_DK = 0x4a4a3a;

// Animation timing
const GUARD_BREATHE = 2.5;
const FLAG_WAVE = 3.0;
const WINDOW_GLOW = 1.5;
const TORCH_FLICKER = 8.0;

// ---------------------------------------------------------------------------
// EliteHallRenderer
// ---------------------------------------------------------------------------

export class EliteHallRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();       // Ground, steps, cobblestones
  private _building = new Graphics();   // Walls, roof, pillars, gargoyles
  private _window = new Graphics();     // Stained-glass rose window
  private _throne = new Graphics();     // Throne + carpet (static)
  private _weapons = new Graphics();    // Trophy weapon displays
  private _guards = new Graphics();     // Elite guards
  private _effects = new Graphics();    // Torches, glow
  private _banners = new Graphics();    // Clan banners

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;

    this._drawBase();
    this._drawBuilding();
    this._drawThrone();
    this._drawWeapons();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._window);
    this.container.addChild(this._throne);
    this.container.addChild(this._weapons);
    this.container.addChild(this._guards);
    this.container.addChild(this._effects);
    this.container.addChild(this._banners);
  }

  setOwner(owner: string | null): void {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateWindow(t);
    this._updateGuards(t);
    this._updateEffects(t);
    this._updateBanners(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground / base
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // Earth base
    g.rect(0, DH - 16, DW, 16).fill({ color: COL_STONE_DK });

    // Cobblestone courtyard
    for (let row = 0; row < 3; row++) {
      const yy = DH - 14 + row * 5;
      const xOff = row % 2 === 0 ? 0 : 6;
      for (let x = xOff; x < DW; x += 12) {
        const w = 10 + Math.sin(x * 7 + row * 3) * 2;
        g.roundRect(x, yy, w, 4, 1).fill({
          color: (x + row) % 3 === 0 ? COL_COBBLE_DK : COL_COBBLE,
        });
        g.roundRect(x, yy, w, 4, 1).stroke({ color: COL_STONE_DK, width: 0.3 });
      }
    }

    // Stone steps (3 tiers)
    const sx = DW / 2 - 20;
    const sw = 40;
    for (let i = 0; i < 3; i++) {
      const sy = DH - 16 - i * 3;
      g.rect(sx - i * 3, sy, sw + i * 6, 3)
        .fill({ color: i === 0 ? COL_STONE : COL_MARBLE_DK })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }

    // Moss on base
    this._drawMoss(g, 6, DH - 18, 6);
    this._drawMoss(g, 108, DH - 17, 5);
  }

  // =========================================================================
  // Main building structure
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    const bx = 12;
    const by = 32;
    const bw = DW - 24;
    const bh = DH - 48;

    // ── Main marble façade ──
    g.rect(bx, by, bw, bh).fill({ color: COL_MARBLE });
    // Left highlight
    g.rect(bx, by, 4, bh).fill({ color: COL_MARBLE_LT });
    // Right shadow
    g.rect(bx + bw - 3, by, 3, bh).fill({ color: COL_MARBLE_DK });

    // ── Brick / block pattern ──
    for (let row = 0; row < Math.floor(bh / 10); row++) {
      const yy = by + row * 10;
      g.moveTo(bx, yy).lineTo(bx + bw, yy).stroke({ color: COL_MARBLE_DK, width: 0.3 });
      const xOff = row % 2 === 0 ? 0 : 12;
      for (let x = bx + xOff; x < bx + bw; x += 24) {
        g.moveTo(x, yy).lineTo(x, yy + 10).stroke({ color: COL_MARBLE_DK, width: 0.2 });
      }
    }

    // ── Stone variation patches ──
    const seed = 42;
    for (let i = 0; i < 10; i++) {
      const sx = bx + 4 + ((seed + i * 37) % (bw - 8));
      const sy = by + 4 + ((seed + i * 53) % (bh - 8));
      const sw = 5 + (i % 3) * 2;
      const sh = 4 + (i % 2) * 2;
      g.rect(sx, sy, sw, sh).fill({
        color: i % 3 === 0 ? COL_MARBLE_WARM : COL_MARBLE_DK,
        alpha: 0.2,
      });
    }

    // ── Fluted pilasters (flanking façade) ──
    this._drawPilaster(g, bx - 2, by, 10, bh);
    this._drawPilaster(g, bx + bw - 8, by, 10, bh);

    // ── Cornices ──
    // Upper cornice with dentils
    g.rect(bx - 4, by, bw + 8, 3)
      .fill({ color: COL_MARBLE_LT })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    for (let i = 0; i < 14; i++) {
      g.rect(bx - 2 + i * 8, by + 3, 5, 2).fill({ color: COL_MARBLE_DK });
    }
    // Mid cornice
    g.rect(bx, by + 18, bw, 2).fill({ color: COL_MARBLE_DK });
    g.rect(bx, by + 16, bw, 2).fill({ color: COL_MARBLE_LT });

    // ── Crenellated parapet ──
    const merlonW = 7;
    const merlonH = 5;
    const gap = 5;
    for (let mx = bx + 6; mx < bx + bw - 6; mx += merlonW + gap) {
      g.rect(mx, by - merlonH, merlonW, merlonH)
        .fill({ color: COL_MARBLE_LT })
        .stroke({ color: COL_MARBLE_DK, width: 0.4 });
      // Arrow slit in each merlon
      g.rect(mx + 2.5, by - merlonH + 1, 1.5, 3).fill({ color: COL_IRON_DK });
    }

    // ── Gabled roof ──
    const roofPeak = 8;
    const roofL = bx - 6;
    const roofR = bx + bw + 6;
    const roofBase = by - merlonH + 2;

    g.moveTo(roofL, roofBase)
      .lineTo(DW / 2, roofPeak)
      .lineTo(roofR, roofBase)
      .closePath()
      .fill({ color: COL_ROOF });
    // Highlight right slope
    g.moveTo(DW / 2, roofPeak)
      .lineTo(roofR, roofBase)
      .lineTo(roofR - 4, roofBase)
      .lineTo(DW / 2, roofPeak + 3)
      .closePath()
      .fill({ color: COL_ROOF_LT });
    // Tile lines
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      const ly = roofPeak + (roofBase - roofPeak) * t;
      const lx1 = roofL + (DW / 2 - roofL) * (1 - t);
      const lx2 = roofR - (roofR - DW / 2) * (1 - t);
      g.moveTo(lx1, ly).lineTo(lx2, ly).stroke({ color: COL_ROOF_TILE, width: 0.5 });
    }
    // Ridge cap
    g.rect(DW / 2 - 1, roofPeak - 1, 2, 4).fill({ color: COL_ROOF_DK });

    // ── Golden acroteria (roof peak ornament) ──
    g.moveTo(DW / 2, roofPeak - 5)
      .lineTo(DW / 2 - 3, roofPeak - 1)
      .lineTo(DW / 2 + 3, roofPeak - 1)
      .closePath()
      .fill({ color: COL_GOLD });
    g.circle(DW / 2, roofPeak - 6, 1.5).fill({ color: COL_GOLD_DK });

    // ── Gargoyle heads on roof corners ──
    this._drawGargoyle(g, roofL + 6, roofBase - 2, -1);
    this._drawGargoyle(g, roofR - 6, roofBase - 2, 1);

    // ── Grand arched entrance ──
    const doorW = 26;
    const doorH = DH - 70 - 16;
    const doorX = DW / 2 - doorW / 2;
    const doorY = 70;

    // Voussoirs
    const archCx = DW / 2;
    const archCy = doorY;
    const archR = doorW / 2 + 3;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const a2 = Math.PI + ((i + 1) / 6) * Math.PI;
      g.moveTo(archCx + Math.cos(a) * (archR - 4), archCy + Math.sin(a) * (archR - 4))
        .lineTo(archCx + Math.cos(a) * archR, archCy + Math.sin(a) * archR)
        .lineTo(archCx + Math.cos(a2) * archR, archCy + Math.sin(a2) * archR)
        .lineTo(archCx + Math.cos(a2) * (archR - 4), archCy + Math.sin(a2) * (archR - 4))
        .closePath()
        .fill({ color: i % 2 === 0 ? COL_MARBLE_LT : COL_MARBLE_WARM })
        .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    }
    // Keystone
    g.moveTo(archCx - 3, archCy - archR - 2)
      .lineTo(archCx + 3, archCy - archR - 2)
      .lineTo(archCx + 2, archCy - archR + 3)
      .lineTo(archCx - 2, archCy - archR + 3)
      .closePath()
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });

    // Door recess shadow
    g.rect(doorX - 1, doorY, doorW + 2, doorH + 1).fill({ color: 0x1a1208 });

    // ── Iron-bound oak double doors ──
    const halfW = doorW / 2 - 1;
    // Left door
    g.rect(doorX, doorY, halfW, doorH).fill({ color: COL_WOOD });
    g.rect(doorX + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: 0x5a3a18 });
    for (let i = 1; i < 3; i++) {
      g.rect(doorX + i * 4, doorY, 0.5, doorH).fill({ color: COL_WOOD_DK });
    }
    // Right door
    const rdx = doorX + halfW + 2;
    g.rect(rdx, doorY, halfW, doorH).fill({ color: COL_WOOD });
    g.rect(rdx + 1, doorY + 2, halfW - 2, doorH - 4).fill({ color: 0x5a3a18 });
    for (let i = 1; i < 3; i++) {
      g.rect(rdx + i * 4, doorY, 0.5, doorH).fill({ color: COL_WOOD_DK });
    }
    // Iron bands + studs
    for (let i = 0; i < 3; i++) {
      const bandY = doorY + 5 + i * 10;
      g.rect(doorX, bandY, doorW, 2).fill({ color: COL_IRON });
      g.circle(doorX + 3, bandY + 1, 1).fill({ color: COL_IRON_DK });
      g.circle(doorX + doorW - 3, bandY + 1, 1).fill({ color: COL_IRON_DK });
    }
    // Ring-pull handles
    g.circle(DW / 2 - 4, doorY + doorH / 2 + 2, 2).stroke({ color: COL_GOLD, width: 1 });
    g.circle(DW / 2 + 4, doorY + doorH / 2 + 2, 2).stroke({ color: COL_GOLD, width: 1 });

    // ── Decorative columns flanking door ──
    this._drawColumn(g, doorX - 10, doorY - 6, 6, doorH + 8);
    this._drawColumn(g, doorX + doorW + 4, doorY - 6, 6, doorH + 8);

    // ── Moss & ivy ──
    this._drawMoss(g, bx + 2, by + bh - 4, 5);
    this._drawMoss(g, bx + bw - 8, by + bh - 3, 4);
    this._drawIvy(g, bx + 2, by + 10, 30);
    this._drawIvy(g, bx + bw - 4, by + 14, 26);
  }

  // =========================================================================
  // Stained-glass rose window
  // =========================================================================

  private _updateWindow(time: number): void {
    const g = this._window;
    g.clear();

    const wx = DW / 2;
    const wy = 48;
    const wr = 12;
    const glow = 0.4 + Math.sin(time * WINDOW_GLOW) * 0.18;

    // Outer frame (gold)
    g.circle(wx, wy, wr + 3).fill({ color: COL_GOLD_DK });
    g.circle(wx, wy, wr + 1.5).fill({ color: COL_GOLD });

    // Background sky
    g.circle(wx, wy, wr).fill({ color: COL_GLASS_SKY });

    // ── Warrior emblem: winged sword with shield ──
    // Central sword blade
    g.rect(wx - 1, wy - 8, 2, 16).fill({ color: COL_GLASS_SILVER });
    // Sword point
    g.moveTo(wx - 2, wy + 8)
      .lineTo(wx, wy + 12)
      .lineTo(wx + 2, wy + 8)
      .closePath()
      .fill({ color: COL_GLASS_SILVER });
    // Cross-guard
    g.rect(wx - 4, wy - 9, 8, 2).fill({ color: COL_GLASS_GOLD });
    // Grip
    g.rect(wx - 1.5, wy - 13, 3, 5).fill({ color: 0x885522 });
    // Pommel
    g.circle(wx, wy - 14, 1.5).fill({ color: COL_GLASS_GOLD });

    // Wings (feathered)
    for (let f = 0; f < 4; f++) {
      const spread = 3 + f * 2;
      const fy = wy - 4 + f * 1.5;
      // Left wing feathers
      g.moveTo(wx - 3, fy)
        .lineTo(wx - 3 - spread, fy - 2)
        .lineTo(wx - 3 - spread + 1, fy + 1)
        .closePath()
        .fill({ color: COL_GLASS_GOLD, alpha: 0.8 - f * 0.1 });
      // Right wing feathers
      g.moveTo(wx + 3, fy)
        .lineTo(wx + 3 + spread, fy - 2)
        .lineTo(wx + 3 + spread - 1, fy + 1)
        .closePath()
        .fill({ color: COL_GLASS_GOLD, alpha: 0.8 - f * 0.1 });
    }

    // Small shield below sword
    g.moveTo(wx - 4, wy + 3)
      .lineTo(wx + 4, wy + 3)
      .lineTo(wx + 3, wy + 8)
      .quadraticCurveTo(wx, wy + 11, wx - 3, wy + 8)
      .closePath()
      .fill({ color: COL_GLASS_RED });
    // Shield cross
    g.moveTo(wx, wy + 4).lineTo(wx, wy + 9).stroke({ color: COL_GLASS_GOLD, width: 0.8 });
    g.moveTo(wx - 3, wy + 6).lineTo(wx + 3, wy + 6).stroke({ color: COL_GLASS_GOLD, width: 0.8 });

    // ── Radial lead caming ──
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.moveTo(wx, wy)
        .lineTo(wx + Math.cos(angle) * wr * 0.95, wy + Math.sin(angle) * wr * 0.95)
        .stroke({ color: COL_GLASS_LEAD, width: 0.5 });
    }
    // Concentric ring
    g.circle(wx, wy, wr * 0.55).stroke({ color: COL_GLASS_LEAD, width: 0.4 });

    // Cardinal gems
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const gx = wx + Math.cos(a) * (wr - 2);
      const gy = wy + Math.sin(a) * (wr - 2);
      g.circle(gx, gy, 1.2).fill({
        color: [COL_GLASS_RED, COL_GLASS_GOLD, 0x33dd66, COL_GLASS_SKY][i],
      });
    }

    // Pulsing glow
    g.circle(wx, wy, wr + 6).fill({ color: COL_GLOW, alpha: glow * 0.08 });
  }

  // =========================================================================
  // Golden throne (static, visible through doorway)
  // =========================================================================

  private _drawThrone(): void {
    const g = this._throne;

    const tx = DW / 2;
    const ty = DH - 28;

    // Red carpet runner through door
    g.rect(tx - 6, 72, 12, DH - 72 - 16).fill({ color: COL_CARPET });
    g.rect(tx - 6, 72, 12, DH - 72 - 16).stroke({ color: COL_CARPET_DK, width: 0.3 });
    // Carpet gold trim
    g.rect(tx - 6, 72, 1, DH - 72 - 16).fill({ color: COL_GOLD_DK, alpha: 0.4 });
    g.rect(tx + 5, 72, 1, DH - 72 - 16).fill({ color: COL_GOLD_DK, alpha: 0.4 });

    // Throne base platform
    g.rect(tx - 10, ty, 20, 4).fill({ color: COL_STONE });
    g.rect(tx - 10, ty, 20, 4).stroke({ color: COL_GOLD_DK, width: 0.5 });

    // Throne back (tall, ornate)
    g.rect(tx - 6, ty - 22, 12, 22).fill({ color: COL_CARPET });
    g.rect(tx - 6, ty - 22, 12, 22).stroke({ color: COL_GOLD_DK, width: 0.5 });
    // Back peak
    g.moveTo(tx - 7, ty - 22)
      .lineTo(tx, ty - 28)
      .lineTo(tx + 7, ty - 22)
      .closePath()
      .fill({ color: COL_GOLD });
    // Crown emblem on throne back
    g.moveTo(tx - 3, ty - 18)
      .lineTo(tx - 3, ty - 20)
      .lineTo(tx - 1, ty - 19)
      .lineTo(tx, ty - 21)
      .lineTo(tx + 1, ty - 19)
      .lineTo(tx + 3, ty - 20)
      .lineTo(tx + 3, ty - 18)
      .closePath()
      .fill({ color: COL_GOLD });

    // Armrests
    g.rect(tx - 10, ty - 12, 4, 14).fill({ color: COL_WOOD });
    g.rect(tx - 10, ty - 12, 4, 14).stroke({ color: COL_GOLD_DK, width: 0.3 });
    g.rect(tx + 6, ty - 12, 4, 14).fill({ color: COL_WOOD });
    g.rect(tx + 6, ty - 12, 4, 14).stroke({ color: COL_GOLD_DK, width: 0.3 });

    // Seat cushion
    g.rect(tx - 6, ty - 4, 12, 4).fill({ color: COL_CARPET_DK });
    g.rect(tx - 6, ty - 4, 12, 4).stroke({ color: COL_GOLD_DK, width: 0.3 });
  }

  // =========================================================================
  // Weapon trophy displays
  // =========================================================================

  private _drawWeapons(): void {
    const g = this._weapons;

    // ── Crossed swords (left wall) ──
    const sx = 26;
    const sy = 56;
    // Mounting plaque
    g.ellipse(sx, sy, 8, 10).fill({ color: COL_WOOD });
    g.ellipse(sx, sy, 8, 10).stroke({ color: COL_GOLD_DK, width: 0.5 });
    // Sword 1 (top-left to bottom-right)
    g.moveTo(sx - 6, sy - 8).lineTo(sx + 6, sy + 8).stroke({ color: COL_SWORD, width: 1.5 });
    g.moveTo(sx - 7, sy - 9).lineTo(sx - 5, sy - 11).lineTo(sx - 4, sy - 7).closePath().fill({ color: COL_SWORD });
    g.rect(sx - 1 - 5, sy - 5, 2, 4).fill({ color: COL_GOLD_DK }); // cross-guard
    // Sword 2 (top-right to bottom-left)
    g.moveTo(sx + 6, sy - 8).lineTo(sx - 6, sy + 8).stroke({ color: COL_SWORD, width: 1.5 });
    g.moveTo(sx + 7, sy - 9).lineTo(sx + 5, sy - 11).lineTo(sx + 4, sy - 7).closePath().fill({ color: COL_SWORD });
    g.rect(sx + 4, sy - 5, 2, 4).fill({ color: COL_GOLD_DK }); // cross-guard

    // ── Ornate shield (right wall) ──
    const shx = DW - 26;
    const shy = 58;
    // Shield shape (heater)
    g.moveTo(shx - 8, shy - 8)
      .lineTo(shx + 8, shy - 8)
      .lineTo(shx + 8, shy + 2)
      .quadraticCurveTo(shx, shy + 12, shx - 8, shy + 2)
      .closePath()
      .fill({ color: COL_SHIELD })
      .stroke({ color: COL_GOLD, width: 1 });
    // Shield boss
    g.circle(shx, shy, 3)
      .fill({ color: COL_GOLD })
      .stroke({ color: COL_GOLD_DK, width: 0.5 });
    // Shield cross
    g.moveTo(shx, shy - 6).lineTo(shx, shy + 6).stroke({ color: COL_GOLD, width: 0.8 });
    g.moveTo(shx - 6, shy).lineTo(shx + 6, shy).stroke({ color: COL_GOLD, width: 0.8 });
    // Border detail
    g.moveTo(shx - 6, shy - 6)
      .lineTo(shx + 6, shy - 6)
      .lineTo(shx + 6, shy + 1)
      .quadraticCurveTo(shx, shy + 9, shx - 6, shy + 1)
      .closePath()
      .stroke({ color: COL_GOLD_DK, width: 0.5 });

    // ── War hammer (on peg, left lower wall) ──
    const hx = 20;
    const hy = 78;
    // Peg
    g.rect(hx, hy, 2, 3).fill({ color: COL_IRON });
    // Handle
    g.moveTo(hx, hy + 1).lineTo(hx + 14, hy - 8).stroke({ color: COL_WOOD, width: 1.5 });
    // Hammer head
    g.rect(hx + 12, hy - 12, 6, 8).fill({ color: COL_IRON });
    g.rect(hx + 12, hy - 12, 6, 8).stroke({ color: COL_IRON_DK, width: 0.3 });
    // Spike on back
    g.moveTo(hx + 12, hy - 9)
      .lineTo(hx + 9, hy - 8)
      .lineTo(hx + 12, hy - 7)
      .closePath()
      .fill({ color: COL_IRON });
  }

  // =========================================================================
  // Elite guards
  // =========================================================================

  private _updateGuards(time: number): void {
    const g = this._guards;
    g.clear();

    this._drawGuard(g, 38, DH - 18, time, -1);
    this._drawGuard(g, DW - 38, DH - 18, time + 0.5, 1);
  }

  private _drawGuard(
    g: Graphics, x: number, y: number, time: number, dir: number,
  ): void {
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.6;

    // ── Spear (behind body) ──
    const spearX = x + dir * 10;
    g.moveTo(spearX, y + 6).lineTo(spearX, y - 38).stroke({ color: COL_SPEAR, width: 2 });
    // Spear tip (leaf-blade)
    g.moveTo(spearX - 2, y - 38)
      .lineTo(spearX, y - 45)
      .lineTo(spearX + 2, y - 38)
      .closePath()
      .fill({ color: COL_SWORD });
    g.moveTo(spearX, y - 44).lineTo(spearX, y - 38).stroke({ color: COL_SWORD, width: 0.4 });
    // Cross-bar
    g.rect(spearX - 2, y - 37, 4, 1).fill({ color: COL_IRON });

    // ── Kite shield (facing outward) ──
    const shX = x + dir * 7;
    const shY = y - 10 + breathe;
    g.moveTo(shX - 5, shY - 8)
      .lineTo(shX + 5, shY - 8)
      .lineTo(shX + 5, shY)
      .quadraticCurveTo(shX, shY + 8, shX - 5, shY)
      .closePath()
      .fill({ color: COL_SHIELD });
    g.moveTo(shX - 4, shY - 7)
      .lineTo(shX + 4, shY - 7)
      .lineTo(shX + 4, shY - 1)
      .quadraticCurveTo(shX, shY + 6, shX - 4, shY - 1)
      .closePath()
      .stroke({ color: COL_GOLD, width: 0.5 });
    g.circle(shX, shY - 3, 2).fill({ color: COL_GOLD });
    // Shield pattern
    g.moveTo(shX, shY - 6).lineTo(shX, shY + 2).stroke({ color: COL_GOLD_DK, width: 0.5 });

    // ── Legs (armoured greaves) ──
    g.rect(x - 3, y + breathe, 3, 8).fill({ color: COL_ARMOR_DK });
    g.rect(x + 1, y + breathe, 3, 8).fill({ color: COL_ARMOR_DK });
    // Knee guard
    g.rect(x - 3.5, y + breathe, 4, 2).fill({ color: COL_ARMOR });
    g.rect(x + 0.5, y + breathe, 4, 2).fill({ color: COL_ARMOR });
    // Boots
    g.rect(x - 4, y + 7 + breathe, 4, 2).fill({ color: COL_WOOD_DK });
    g.rect(x + 1, y + 7 + breathe, 4, 2).fill({ color: COL_WOOD_DK });

    // ── Body (plate armour) ──
    g.rect(x - 5, y - 20 + breathe, 10, 20).fill({ color: COL_ARMOR });
    // Breastplate highlight
    g.rect(x - 4, y - 18 + breathe, 3, 14).fill({ color: COL_ARMOR_LT });
    // Belt
    g.rect(x - 5, y - 4 + breathe, 10, 2).fill({ color: COL_WOOD });
    g.circle(x, y - 3 + breathe, 1).fill({ color: COL_GOLD_DK });
    // Pauldrons (shoulder plates)
    g.ellipse(x - 5, y - 18 + breathe, 3.5, 2.5).fill({ color: COL_ARMOR_DK });
    g.ellipse(x + 5, y - 18 + breathe, 3.5, 2.5).fill({ color: COL_ARMOR_DK });
    // Chainmail skirt
    g.rect(x - 5, y - 2 + breathe, 10, 3).fill({ color: COL_IRON });
    for (let i = 0; i < 5; i++) {
      g.circle(x - 4 + i * 2, y - 1 + breathe, 0.4).fill({ color: COL_IRON_DK });
    }

    // ── Head ──
    g.circle(x, y - 24 + breathe, 5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(x - 2, y - 24.5 + breathe, 0.7).fill({ color: 0x222222 });
    g.circle(x + 2, y - 24.5 + breathe, 0.7).fill({ color: 0x222222 });
    // Stern mouth
    g.moveTo(x - 1.5, y - 22 + breathe).lineTo(x + 1.5, y - 22 + breathe)
      .stroke({ color: COL_SKIN, width: 0.5 });

    // ── Helmet (great helm with visor) ──
    g.rect(x - 6, y - 30 + breathe, 12, 8).fill({ color: COL_ARMOR_DK });
    // Helmet top (domed)
    g.moveTo(x - 6, y - 30 + breathe).arc(x, y - 30 + breathe, 6, Math.PI, 0).fill({ color: COL_ARMOR });
    // Visor slit
    g.rect(x - 4, y - 27 + breathe, 8, 1.5).fill({ color: 0x1a1a1a });
    // Nose guard
    g.rect(x - 0.5, y - 28 + breathe, 1, 4).fill({ color: COL_ARMOR_LT });
    // Brim
    g.rect(x - 7, y - 23 + breathe, 14, 2).fill({ color: COL_ARMOR_DK });

    // ── Plume (on helmet top) ──
    const plumeWave = Math.sin(time * 2.5 + x) * 1.5;
    g.moveTo(x, y - 36 + breathe)
      .quadraticCurveTo(x + dir * 4 + plumeWave, y - 40 + breathe, x + dir * 8, y - 36 + breathe)
      .quadraticCurveTo(x + dir * 5 + plumeWave * 0.5, y - 38 + breathe, x, y - 34 + breathe)
      .closePath()
      .fill({ color: COL_PLUME });
  }

  // =========================================================================
  // Effects — torches, glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    const flick = Math.sin(time * TORCH_FLICKER);

    // ── Wall torches (on pilasters) ──
    for (const tx of [18, DW - 18]) {
      const ty = 64;
      // Bracket
      g.moveTo(tx, ty + 6).lineTo(tx, ty).stroke({ color: COL_IRON, width: 1.5 });
      g.moveTo(tx - 2, ty + 6).lineTo(tx + 2, ty + 6).stroke({ color: COL_IRON, width: 1 });
      // Handle
      g.rect(tx - 1, ty + 6, 2, 4).fill({ color: COL_WOOD });
      // Flame
      const fh = 4 + flick * 1;
      g.moveTo(tx - 2, ty)
        .quadraticCurveTo(tx + flick * 0.5, ty - fh, tx + 2, ty)
        .fill({ color: 0xff6622 });
      g.moveTo(tx - 1, ty)
        .quadraticCurveTo(tx - flick * 0.3, ty - fh + 1, tx + 1, ty)
        .fill({ color: 0xffaa44 });
      // Glow halo
      g.circle(tx, ty - 1, 6).fill({ color: COL_GLOW, alpha: 0.07 + flick * 0.02 });
    }

    // ── Interior warm glow through doorway ──
    const doorGlow = 0.06 + Math.sin(time * 1.5) * 0.02;
    g.rect(DW / 2 - 11, 72, 22, DH - 72 - 16).fill({ color: COL_GLOW, alpha: doorGlow });
  }

  // =========================================================================
  // Clan banners
  // =========================================================================

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Left banner (player-colored)
    this._drawBannerFlag(g, 24, 34, time, this._playerColor, -1);
    // Right banner (crimson)
    this._drawBannerFlag(g, DW - 24, 34, time + 1.5, COL_BANNER_2, 1);
  }

  private _drawBannerFlag(
    g: Graphics, x: number, y: number, time: number, color: number, dir: number,
  ): void {
    const wave = Math.sin(time * FLAG_WAVE) * 3;
    const wave2 = Math.sin(time * FLAG_WAVE * 1.3 + 1) * 1.5;

    // Pole
    g.rect(x - 1, y - 4, 2, 16)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.circle(x, y - 5, 1.5).fill({ color: COL_GOLD });

    // Banner cloth
    g.moveTo(x + dir, y - 2)
      .bezierCurveTo(
        x + dir * 8 + wave * dir * 0.3,
        y - 1 + wave2 * 0.3,
        x + dir * 12 + wave * dir * 0.5,
        y + 3 + wave2 * 0.3,
        x + dir * 14 + wave * dir,
        y + 5 + wave2,
      )
      .lineTo(x + dir * 12 + wave * dir * 0.8, y + 12 + wave2 * 0.5)
      .bezierCurveTo(
        x + dir * 10 + wave * dir * 0.4,
        y + 11 + wave2 * 0.2,
        x + dir * 4,
        y + 10,
        x + dir,
        y + 10,
      )
      .closePath()
      .fill({ color });
    // Gold trim
    g.moveTo(x + dir, y - 2)
      .bezierCurveTo(
        x + dir * 8 + wave * dir * 0.3,
        y - 1 + wave2 * 0.3,
        x + dir * 12 + wave * dir * 0.5,
        y + 3 + wave2 * 0.3,
        x + dir * 14 + wave * dir,
        y + 5 + wave2,
      )
      .stroke({ color: COL_GOLD, width: 0.5 });

    // Fringe at bottom
    for (let i = 0; i < 4; i++) {
      const fx = x + dir * (2 + i * 3);
      const fy = y + 10 + Math.sin(time * 2 + i) * 0.5;
      g.moveTo(fx, fy).lineTo(fx, fy + 2).stroke({ color: COL_GOLD, width: 0.4 });
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private _drawPilaster(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    g.rect(x, y, w, h).fill({ color: COL_MARBLE_WARM });
    // Fluting (vertical grooves)
    for (let i = 0; i < 3; i++) {
      g.rect(x + 2 + i * 3, y + 6, 0.8, h - 10).fill({ color: COL_MARBLE_DK, alpha: 0.3 });
    }
    // Capital (Ionic style)
    g.rect(x - 2, y, w + 4, 3)
      .fill({ color: COL_MARBLE_LT })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
    // Volutes
    g.circle(x, y + 1, 2).stroke({ color: COL_MARBLE_DK, width: 0.4 });
    g.circle(x + w, y + 1, 2).stroke({ color: COL_MARBLE_DK, width: 0.4 });
    // Base
    g.rect(x - 1, y + h - 3, w + 2, 3)
      .fill({ color: COL_MARBLE_LT })
      .stroke({ color: COL_MARBLE_DK, width: 0.3 });
  }

  private _drawColumn(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    g.rect(x, y, w, h).fill({ color: COL_MARBLE_WARM });
    g.rect(x + 1, y, 1.5, h).fill({ color: COL_MARBLE_LT });
    // Capital
    g.rect(x - 1, y, w + 2, 3).fill({ color: COL_GOLD_DK });
    // Base
    g.rect(x - 1, y + h - 2, w + 2, 2).fill({ color: COL_GOLD_DK });
  }

  private _drawGargoyle(g: Graphics, x: number, y: number, dir: number): void {
    // Head
    g.ellipse(x + dir * 4, y, 4, 3).fill({ color: COL_GARGOYLE });
    // Snout
    g.moveTo(x + dir * 7, y - 1)
      .lineTo(x + dir * 10, y)
      .lineTo(x + dir * 7, y + 1)
      .closePath()
      .fill({ color: COL_GARGOYLE_DK });
    // Eye
    g.circle(x + dir * 5, y - 1, 0.8).fill({ color: 0xdddd00 });
    // Horns
    g.moveTo(x + dir * 2, y - 3)
      .lineTo(x + dir * 1, y - 6)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });
    g.moveTo(x + dir * 5, y - 3)
      .lineTo(x + dir * 6, y - 6)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });
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
