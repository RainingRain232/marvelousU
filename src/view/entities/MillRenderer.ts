// Procedural mill renderer for BuildingView.
//
// Draws a detailed 1×2 tile (64×128) medieval fantasy windmill with:
//   • Round stone tower with ashlar brick pattern, mortar, stone variation
//   • Conical thatched/shingled roof with weathervane on top
//   • Four detailed rotating windmill blades with timber frames & cloth sails
//   • Blade hub with iron axle cap and wooden boss
//   • Arched oak door with iron bands, ring pull, stone frame
//   • Small arched window with shutters and warm interior glow
//   • Flour sack display at base: stacked burlap sacks with grain spill
//   • Millstone visible through doorway
//   • Farmer (Hank): straw hat, suspenders, leather apron, pitchfork
//     — scooping hay with bending cycle
//   • Son (Tom): smaller, lighter hair, child hat, small pitchfork
//     — helping with offset rhythm
//   • Scattered hay bales (rectangular with twine), loose hay strands
//   • Cat napping on a hay bale (tail flick)
//   • Chickens pecking near the base (2, bobbing)
//   • Moss on lower courses, wildflowers, wooden bucket
//   • Grain chute extending from side with falling grain particles
//
// All drawing uses PixiJS Graphics. 1×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const MW = 1 * TS;  // 64px
const MH = 2 * TS;  // 128px

// --- Palette: rustic mill ---
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_MORTAR = 0x7a7668;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_ROOF = 0x8b6530;
const COL_ROOF_DK = 0x5a4020;
const COL_ROOF_LT = 0xa87840;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_HAY = 0xd4a830;
const COL_HAY_DK = 0xb48820;
const COL_HAY_LT = 0xe8c040;
const COL_SACK = 0xc8b888;
const COL_SACK_DK = 0xa89868;
const COL_SAIL = 0xf0ead8;
const COL_SAIL_DK = 0xd8d0c0;
const COL_MOSS = 0x4a6b3a;
const COL_GLOW = 0xffaa44;
const COL_WINDOW = 0x1a1a2e;

// Character palettes
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd4a880;
const COL_SHIRT = 0x4488aa;
const COL_SHIRT_DK = 0x336688;
const COL_PANTS = 0x554433;
const COL_HAIR = 0x4a3020;
const COL_HAIR_LT = 0x8a7050;
const COL_APRON = 0x8b6540;
const COL_CAT = 0xff8833;
const COL_CAT_DK = 0xcc6622;
const COL_CHICKEN = 0xeedd99;
const COL_CHICKEN_DK = 0xccbb77;
const COL_COMB = 0xcc3333;
const COL_BEAK = 0xdd9922;
const COL_FLOWER_R = 0xdd4466;
const COL_FLOWER_Y = 0xeecc33;
const COL_FLOWER_B = 0x5588cc;

// Animation timing
const BLADE_SPEED = 0.8;
const FARMER_WORK = 2.0;
const SON_WORK = 1.8;
const CAT_TAIL = 1.2;
const CHICKEN_BOB = 3.5;

// ---------------------------------------------------------------------------
// MillRenderer
// ---------------------------------------------------------------------------

export class MillRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();       // Ground, flowers, bucket
  private _building = new Graphics();   // Stone tower, roof, door, window
  private _props = new Graphics();      // Hay bales, sacks, grain chute
  private _blades = new Graphics();     // Rotating windmill blades
  private _farmer = new Graphics();     // Farmer Hank
  private _son = new Graphics();        // Son Tom
  private _animals = new Graphics();    // Cat, chickens
  private _effects = new Graphics();    // Window glow, grain particles

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBase();
    this._drawBuilding();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._props);
    this.container.addChild(this._blades);
    this.container.addChild(this._farmer);
    this.container.addChild(this._son);
    this.container.addChild(this._animals);
    this.container.addChild(this._effects);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateBlades(t);
    this._updateFarmer(t);
    this._updateSon(t);
    this._updateAnimals(t);
    this._updateEffects(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground / base
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // Earth
    g.rect(0, MH - 10, MW, 10).fill({ color: COL_STONE_DK });

    // Dirt path to door
    g.ellipse(MW / 2 - 4, MH - 8, 10, 3).fill({ color: 0x8a7a60 });

    // Wildflowers
    const flowers = [
      { x: 4, y: MH - 12, col: COL_FLOWER_R },
      { x: 8, y: MH - 14, col: COL_FLOWER_Y },
      { x: 56, y: MH - 11, col: COL_FLOWER_B },
      { x: 52, y: MH - 13, col: COL_FLOWER_Y },
      { x: 2, y: MH - 10, col: COL_FLOWER_B },
    ];
    for (const f of flowers) {
      // Stem
      g.moveTo(f.x, f.y + 3).lineTo(f.x, f.y).stroke({ color: 0x448833, width: 0.5 });
      // Petals
      g.circle(f.x, f.y, 1.5).fill({ color: f.col });
      g.circle(f.x, f.y, 0.6).fill({ color: 0xffffcc });
    }

    // Wooden bucket (near door)
    g.moveTo(50, MH - 10)
      .lineTo(48, MH - 18)
      .lineTo(56, MH - 18)
      .lineTo(54, MH - 10)
      .closePath()
      .fill({ color: COL_WOOD });
    g.moveTo(48, MH - 18).lineTo(56, MH - 18).stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(48, MH - 14, 8, 1).fill({ color: COL_IRON });
    // Bucket handle
    g.moveTo(49, MH - 18).arc(52, MH - 18, 3, Math.PI, 0).stroke({ color: COL_IRON_DK, width: 0.6 });
  }

  // =========================================================================
  // Stone tower building
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    // Mill is a round stone tower
    const cx = MW / 2 - 2;
    const cy = 68;
    const rx = 22;
    const ry = 48;

    // ── Tower body (elliptical to suggest roundness) ──
    g.ellipse(cx, cy, rx, ry).fill({ color: COL_STONE });
    g.ellipse(cx, cy, rx, ry).stroke({ color: COL_STONE_DK, width: 1 });

    // Left highlight (roundness)
    g.ellipse(cx - rx + 5, cy, 4, ry - 4).fill({ color: COL_STONE_LT, alpha: 0.3 });
    // Right shadow
    g.ellipse(cx + rx - 4, cy, 3, ry - 4).fill({ color: COL_STONE_DK, alpha: 0.3 });

    // ── Brick pattern (curved rows) ──
    for (let row = 0; row < 8; row++) {
      const yy = cy - ry + 10 + row * 11;
      // Horizontal mortar
      const rowW = rx * Math.sqrt(1 - Math.pow((yy - cy) / ry, 2)) * 2;
      const rowX = cx - rowW / 2;
      g.moveTo(rowX, yy).lineTo(rowX + rowW, yy).stroke({ color: COL_MORTAR, width: 0.4 });
      // Vertical mortar (offset)
      const xOff = row % 2 === 0 ? 0 : 8;
      for (let x = rowX + xOff + 4; x < rowX + rowW - 4; x += 16) {
        g.moveTo(x, yy).lineTo(x, yy + 11).stroke({ color: COL_MORTAR, width: 0.3 });
      }
    }

    // ── Stone variation patches ──
    for (let i = 0; i < 6; i++) {
      const sx = cx - 14 + ((i * 29 + 5) % 28);
      const sy = cy - 30 + ((i * 41 + 7) % 60);
      g.rect(sx, sy, 5 + (i % 2) * 2, 4 + (i % 3)).fill({
        color: i % 2 === 0 ? COL_STONE_LT : COL_STONE_DK,
        alpha: 0.2,
      });
    }

    // ── Conical thatched roof ──
    const roofBase = cy - ry + 4;
    const roofPeak = roofBase - 28;
    const roofW = rx + 4;

    g.moveTo(cx - roofW, roofBase)
      .lineTo(cx, roofPeak)
      .lineTo(cx + roofW, roofBase)
      .closePath()
      .fill({ color: COL_ROOF });
    // Highlight
    g.moveTo(cx, roofPeak)
      .lineTo(cx + roofW, roofBase)
      .lineTo(cx + roofW - 3, roofBase)
      .lineTo(cx, roofPeak + 3)
      .closePath()
      .fill({ color: COL_ROOF_LT });
    // Thatch lines
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const ly = roofPeak + (roofBase - roofPeak) * t;
      const lw = roofW * t;
      g.moveTo(cx - lw, ly).lineTo(cx + lw, ly).stroke({ color: COL_ROOF_DK, width: 0.5 });
    }

    // ── Weathervane on peak ──
    g.rect(cx - 0.5, roofPeak - 8, 1, 9).fill({ color: COL_IRON });
    // Arrow
    g.moveTo(cx - 5, roofPeak - 7)
      .lineTo(cx + 5, roofPeak - 7)
      .stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(cx + 5, roofPeak - 7)
      .lineTo(cx + 3, roofPeak - 9)
      .lineTo(cx + 3, roofPeak - 5)
      .closePath()
      .fill({ color: COL_IRON });
    // Rooster silhouette
    g.ellipse(cx - 1, roofPeak - 10, 2, 1.5).fill({ color: COL_IRON_DK });
    g.moveTo(cx - 2, roofPeak - 11)
      .lineTo(cx - 1, roofPeak - 13)
      .lineTo(cx, roofPeak - 11)
      .fill({ color: COL_IRON_DK });

    // ── Blade hub mount (on tower face) ──
    const hubX = cx + 2;
    const hubY = roofBase + 6;
    g.circle(hubX, hubY, 5).fill({ color: COL_WOOD_DK });
    g.circle(hubX, hubY, 5).stroke({ color: COL_IRON, width: 1 });
    g.circle(hubX, hubY, 2).fill({ color: COL_IRON });

    // ── Arched door ──
    const doorX = cx - 7;
    const doorY = cy + ry - 30;
    const doorW = 14;
    const doorH = 24;

    // Stone frame
    g.rect(doorX - 2, doorY - 2, doorW + 4, doorH + 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    // Arch top
    g.moveTo(doorX - 1, doorY).arc(doorX + doorW / 2, doorY, doorW / 2 + 1, Math.PI, 0).fill({ color: COL_STONE_LT });
    g.moveTo(doorX - 1, doorY).arc(doorX + doorW / 2, doorY, doorW / 2 + 1, Math.PI, 0).stroke({ color: COL_MORTAR, width: 0.3 });

    // Door recess
    g.rect(doorX, doorY, doorW, doorH).fill({ color: 0x1a1208 });
    // Oak planks
    for (let i = 0; i < 3; i++) {
      g.rect(doorX + 1 + i * 4, doorY + 1, 3.5, doorH - 2)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
    }
    // Iron bands
    g.rect(doorX, doorY + 5, doorW, 1.5).fill({ color: COL_IRON });
    g.rect(doorX, doorY + 14, doorW, 1.5).fill({ color: COL_IRON });
    // Ring pull
    g.circle(doorX + doorW - 4, doorY + doorH / 2, 1.5).stroke({ color: COL_IRON, width: 0.7 });

    // ── Small arched window (above door) ──
    const winX = cx - 4;
    const winY = cy - 14;
    const winW = 8;
    const winH = 10;

    g.rect(winX, winY, winW, winH).fill({ color: COL_WINDOW });
    g.moveTo(winX, winY).arc(winX + winW / 2, winY, winW / 2, Math.PI, 0).fill({ color: COL_WINDOW });
    g.rect(winX, winY, winW, winH).stroke({ color: COL_STONE_DK, width: 0.5 });
    // Mullion
    g.moveTo(winX + winW / 2, winY - 2).lineTo(winX + winW / 2, winY + winH)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Shutters (open, wooden)
    g.rect(winX - 3, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(winX + winW, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });

    // ── Moss on lower stones ──
    this._drawMoss(g, cx - 18, cy + ry - 8, 6);
    this._drawMoss(g, cx + 8, cy + ry - 6, 5);
  }

  // =========================================================================
  // Props — hay bales, flour sacks, grain chute
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Hay bales (rectangular with twine) ──
    // Bale 1 (left, on ground)
    this._drawHayBale(g, 2, MH - 20, 12, 8);
    // Bale 2 (stacked on bale 1)
    this._drawHayBale(g, 4, MH - 28, 10, 7);
    // Bale 3 (right side)
    this._drawHayBale(g, 48, MH - 22, 14, 10);

    // Loose hay strands
    for (let i = 0; i < 6; i++) {
      const hx = 6 + i * 4;
      const hy = MH - 10 - Math.random() * 4;
      g.moveTo(hx, hy)
        .quadraticCurveTo(hx + 2, hy - 3, hx + 4, hy - 1)
        .stroke({ color: COL_HAY_LT, width: 0.4 });
    }

    // ── Flour sacks (stacked near door) ──
    // Bottom sack
    g.roundRect(36, MH - 18, 10, 8, 1).fill({ color: COL_SACK });
    g.roundRect(36, MH - 18, 10, 8, 1).stroke({ color: COL_SACK_DK, width: 0.3 });
    g.moveTo(38, MH - 18).lineTo(38, MH - 10).stroke({ color: COL_SACK_DK, width: 0.3 });
    // Top sack (slightly offset)
    g.roundRect(37, MH - 25, 9, 7, 1).fill({ color: COL_SACK });
    g.roundRect(37, MH - 25, 9, 7, 1).stroke({ color: COL_SACK_DK, width: 0.3 });
    // Tied top
    g.moveTo(41, MH - 25).lineTo(42, MH - 27).stroke({ color: COL_SACK_DK, width: 0.6 });
    // Grain spill from sack
    for (let i = 0; i < 4; i++) {
      g.circle(44 + i * 1.5, MH - 10 + i * 0.5, 0.6).fill({ color: COL_HAY });
    }

    // ── Grain chute (wooden, from side of building) ──
    g.moveTo(MW / 2 + 18, 78)
      .lineTo(MW / 2 + 22, 78)
      .lineTo(MW - 2, MH - 24)
      .lineTo(MW - 6, MH - 24)
      .closePath()
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.4 });
    // Chute supports
    g.moveTo(MW / 2 + 20, 82).lineTo(MW / 2 + 22, 78).stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.moveTo(MW - 4, MH - 28).lineTo(MW - 2, MH - 24).stroke({ color: COL_WOOD_DK, width: 0.5 });

    // ── Pitchfork leaning against wall ──
    const pfx = MW / 2 + 14;
    const pfy = 88;
    g.moveTo(pfx, pfy).lineTo(pfx - 3, pfy + 28).stroke({ color: COL_WOOD, width: 1.2 });
    g.moveTo(pfx - 1, pfy).lineTo(pfx + 1, pfy - 5).stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(pfx - 3, pfy).lineTo(pfx - 1, pfy - 5).stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(pfx + 1, pfy).lineTo(pfx + 3, pfy - 5).stroke({ color: COL_IRON, width: 0.8 });
  }

  // =========================================================================
  // Rotating windmill blades
  // =========================================================================

  private _updateBlades(time: number): void {
    const g = this._blades;
    g.clear();

    const hubX = MW / 2;
    const hubY = 26;
    const rotation = time * BLADE_SPEED;

    for (let i = 0; i < 4; i++) {
      const angle = rotation + (i * Math.PI) / 2;
      const bladeLen = 30;
      const bladeW = 7;

      const bx1 = hubX + Math.cos(angle) * 5;
      const by1 = hubY + Math.sin(angle) * 5;
      const bx2 = hubX + Math.cos(angle) * bladeLen;
      const by2 = hubY + Math.sin(angle) * bladeLen;

      const perpAngle = angle + Math.PI / 2;
      const wx = (Math.cos(perpAngle) * bladeW) / 2;
      const wy = (Math.sin(perpAngle) * bladeW) / 2;

      // Timber frame
      g.moveTo(bx1 - wx, by1 - wy)
        .lineTo(bx2 - wx * 0.6, by2 - wy * 0.6)
        .lineTo(bx2 + wx * 0.6, by2 + wy * 0.6)
        .lineTo(bx1 + wx, by1 + wy)
        .closePath()
        .fill({ color: COL_WOOD_LT })
        .stroke({ color: COL_WOOD_DK, width: 0.5 });

      // Cross braces on frame
      const midX = (bx1 + bx2) / 2;
      const midY = (by1 + by2) / 2;
      g.moveTo(bx1 - wx * 0.5, by1 - wy * 0.5)
        .lineTo(midX + wx * 0.3, midY + wy * 0.3)
        .stroke({ color: COL_WOOD_DK, width: 0.4 });
      g.moveTo(bx1 + wx * 0.5, by1 + wy * 0.5)
        .lineTo(midX - wx * 0.3, midY - wy * 0.3)
        .stroke({ color: COL_WOOD_DK, width: 0.4 });

      // Cloth sail (slightly inset, one side of frame)
      const sailIn = 7;
      const sailOut = bladeLen - 3;
      const sailW = bladeW - 2;
      const sx1 = hubX + Math.cos(angle) * sailIn;
      const sy1 = hubY + Math.sin(angle) * sailIn;
      const sx2 = hubX + Math.cos(angle) * sailOut;
      const sy2 = hubY + Math.sin(angle) * sailOut;
      const swx = (Math.cos(perpAngle) * sailW) / 2;
      const swy = (Math.sin(perpAngle) * sailW) / 2;

      // Sail billows slightly
      const billow = Math.sin(time * 3 + i * 1.5) * 0.15;
      g.moveTo(sx1, sy1)
        .lineTo(sx2, sy2)
        .lineTo(sx2 + swx * (1 + billow), sy2 + swy * (1 + billow))
        .lineTo(sx1 + swx * (1 + billow), sy1 + swy * (1 + billow))
        .closePath()
        .fill({ color: COL_SAIL });
      // Sail stitch
      g.moveTo((sx1 + sx2) / 2, (sy1 + sy2) / 2)
        .lineTo((sx1 + sx2) / 2 + swx * (1 + billow), (sy1 + sy2) / 2 + swy * (1 + billow))
        .stroke({ color: COL_SAIL_DK, width: 0.3 });
    }

    // Hub boss
    g.circle(hubX, hubY, 5).fill({ color: COL_WOOD_DK });
    g.circle(hubX, hubY, 5).stroke({ color: COL_IRON, width: 1 });
    // Axle cap
    g.circle(hubX, hubY, 2.5).fill({ color: COL_IRON });
    g.circle(hubX, hubY, 1).fill({ color: COL_IRON_DK });
  }

  // =========================================================================
  // Farmer Hank
  // =========================================================================

  private _updateFarmer(time: number): void {
    const g = this._farmer;
    g.clear();

    const fx = 14;
    const fy = MH - 14;
    const workCycle = (time * FARMER_WORK) % 1;
    const bend = Math.sin(workCycle * Math.PI) * 3;
    const armReach = Math.sin(workCycle * Math.PI) * 4;

    // Legs
    g.rect(fx - 3, fy - 2, 3, 6).fill({ color: COL_PANTS });
    g.rect(fx + 1, fy - 2, 3, 6).fill({ color: COL_PANTS });
    // Boots
    g.rect(fx - 4, fy + 3, 4, 2).fill({ color: COL_WOOD_DK });
    g.rect(fx + 1, fy + 3, 4, 2).fill({ color: COL_WOOD_DK });

    // Body
    g.rect(fx - 4, fy - 16 + bend, 9, 14).fill({ color: COL_SHIRT });
    g.rect(fx - 4, fy - 12 + bend, 9, 2).fill({ color: COL_SHIRT_DK });
    // Leather apron
    g.rect(fx - 3, fy - 10 + bend, 7, 10).fill({ color: COL_APRON });
    g.rect(fx - 3, fy - 10 + bend, 7, 10).stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Suspender straps
    g.moveTo(fx - 2, fy - 10 + bend).lineTo(fx - 1, fy - 16 + bend)
      .stroke({ color: COL_APRON, width: 0.8 });
    g.moveTo(fx + 3, fy - 10 + bend).lineTo(fx + 2, fy - 16 + bend)
      .stroke({ color: COL_APRON, width: 0.8 });

    // Arms
    g.rect(fx - 7, fy - 18 + bend + armReach, 3, 8).fill({ color: COL_SHIRT });
    g.rect(fx + 5, fy - 18 + bend - armReach, 3, 8).fill({ color: COL_SHIRT });
    // Hands
    g.circle(fx - 6, fy - 10 + bend + armReach, 1.5).fill({ color: COL_SKIN_DK });
    g.circle(fx + 6, fy - 10 + bend - armReach, 1.5).fill({ color: COL_SKIN_DK });

    // Head
    g.circle(fx, fy - 22 + bend, 5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(fx - 2, fy - 22.5 + bend, 0.6).fill({ color: 0x222222 });
    g.circle(fx + 2, fy - 22.5 + bend, 0.6).fill({ color: 0x222222 });
    // Nose
    g.moveTo(fx, fy - 21 + bend).lineTo(fx + 1, fy - 20 + bend)
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Stubble
    for (let i = 0; i < 3; i++) {
      g.circle(fx - 1.5 + i * 1.5, fy - 19 + bend, 0.2).fill({ color: COL_HAIR });
    }

    // Hair
    g.moveTo(fx + 5.5 * Math.cos(Math.PI + 0.3), fy - 22 + bend + 5.5 * Math.sin(Math.PI + 0.3))
      .arc(fx, fy - 22 + bend, 5.5, Math.PI + 0.3, -0.3).stroke({ color: COL_HAIR, width: 1.5 });

    // Straw hat (wide-brim)
    g.rect(fx - 8, fy - 28 + bend, 16, 2).fill({ color: COL_HAY });
    g.rect(fx - 8, fy - 28 + bend, 16, 2).stroke({ color: COL_HAY_DK, width: 0.3 });
    g.rect(fx - 4, fy - 32 + bend, 8, 5).fill({ color: COL_HAY });
    g.rect(fx - 4, fy - 32 + bend, 8, 5).stroke({ color: COL_HAY_DK, width: 0.3 });
    // Hat band
    g.rect(fx - 4, fy - 28 + bend, 8, 1).fill({ color: COL_WOOD });

    // Pitchfork in hand
    const pfX = fx - 8;
    const pfY = fy - 24 + bend + armReach;
    g.moveTo(pfX, pfY).lineTo(pfX, pfY + 16).stroke({ color: COL_WOOD, width: 1.2 });
    g.moveTo(pfX - 2, pfY).lineTo(pfX, pfY + 3).stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(pfX, pfY).lineTo(pfX, pfY + 3).stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(pfX + 2, pfY).lineTo(pfX, pfY + 3).stroke({ color: COL_IRON, width: 0.8 });
  }

  // =========================================================================
  // Son Tom
  // =========================================================================

  private _updateSon(time: number): void {
    const g = this._son;
    g.clear();

    const sx = 44;
    const sy = MH - 12;
    const workCycle = (time * SON_WORK + 0.5) % 1;
    const bend = Math.sin(workCycle * Math.PI) * 2;
    const armReach = Math.sin(workCycle * Math.PI) * 3;

    // Legs
    g.rect(sx - 2, sy - 2, 2.5, 5).fill({ color: 0x665544 });
    g.rect(sx + 1, sy - 2, 2.5, 5).fill({ color: 0x665544 });
    // Boots
    g.rect(sx - 3, sy + 2, 3, 1.5).fill({ color: COL_WOOD_DK });
    g.rect(sx + 1, sy + 2, 3, 1.5).fill({ color: COL_WOOD_DK });

    // Body (smaller)
    g.rect(sx - 3, sy - 12 + bend, 7, 10).fill({ color: 0x88aacc });
    g.rect(sx - 3, sy - 8 + bend, 7, 2).fill({ color: 0x7799bb });

    // Arms
    g.rect(sx - 5, sy - 14 + bend + armReach, 2.5, 7).fill({ color: 0x88aacc });
    g.rect(sx + 4, sy - 14 + bend - armReach, 2.5, 7).fill({ color: 0x88aacc });
    // Hands
    g.circle(sx - 4, sy - 7 + bend + armReach, 1.2).fill({ color: COL_SKIN_DK });
    g.circle(sx + 5, sy - 7 + bend - armReach, 1.2).fill({ color: COL_SKIN_DK });

    // Head
    g.circle(sx, sy - 17 + bend, 4.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(sx - 1.5, sy - 17.5 + bend, 0.5).fill({ color: 0x222222 });
    g.circle(sx + 1.5, sy - 17.5 + bend, 0.5).fill({ color: 0x222222 });
    // Smile
    g.moveTo(sx + 1.5, sy - 15.5 + bend).arc(sx, sy - 15.5 + bend, 1.5, 0, Math.PI).stroke({ color: COL_SKIN_DK, width: 0.4 });

    // Hair (lighter, child)
    g.moveTo(sx + 5 * Math.cos(Math.PI + 0.4), sy - 17 + bend + 5 * Math.sin(Math.PI + 0.4))
      .arc(sx, sy - 17 + bend, 5, Math.PI + 0.4, -0.4).stroke({ color: COL_HAIR_LT, width: 1.2 });

    // Small cap
    g.rect(sx - 5, sy - 22 + bend, 10, 2).fill({ color: COL_HAIR_LT });
    g.rect(sx - 3, sy - 25 + bend, 6, 4).fill({ color: COL_HAIR_LT });
    g.rect(sx - 3, sy - 25 + bend, 6, 4).stroke({ color: COL_HAY_DK, width: 0.3 });

    // Small pitchfork
    const pfX = sx + 7;
    const pfY = sy - 13 + bend - armReach;
    g.moveTo(pfX, pfY).lineTo(pfX, pfY + 12).stroke({ color: COL_WOOD, width: 0.8 });
    g.moveTo(pfX - 1.5, pfY).lineTo(pfX, pfY + 2).stroke({ color: COL_IRON, width: 0.6 });
    g.moveTo(pfX + 1.5, pfY).lineTo(pfX, pfY + 2).stroke({ color: COL_IRON, width: 0.6 });
  }

  // =========================================================================
  // Animals — cat on hay bale, chickens
  // =========================================================================

  private _updateAnimals(time: number): void {
    const g = this._animals;
    g.clear();

    // ── Cat napping on hay bale ──
    const catX = 8;
    const catY = MH - 30;
    const tailFlick = Math.sin(time * CAT_TAIL) * 3;

    // Body (curled)
    g.ellipse(catX, catY, 4, 2.5).fill({ color: COL_CAT });
    // Darker stripe
    g.ellipse(catX, catY - 0.5, 3, 1.5).fill({ color: COL_CAT_DK });
    // Head (tucked)
    g.circle(catX + 3, catY - 1, 2).fill({ color: COL_CAT });
    // Ears
    g.moveTo(catX + 2, catY - 3).lineTo(catX + 1.5, catY - 5).lineTo(catX + 3, catY - 3)
      .fill({ color: COL_CAT });
    g.moveTo(catX + 4, catY - 3).lineTo(catX + 4, catY - 5).lineTo(catX + 5, catY - 3)
      .fill({ color: COL_CAT });
    // Closed eyes (sleeping)
    g.moveTo(catX + 2, catY - 1.5).lineTo(catX + 3, catY - 1).stroke({ color: 0x222222, width: 0.3 });
    g.moveTo(catX + 4, catY - 1.5).lineTo(catX + 4.5, catY - 1).stroke({ color: 0x222222, width: 0.3 });
    // Nose
    g.circle(catX + 4.5, catY - 0.5, 0.3).fill({ color: 0xff8888 });
    // Tail (curled, flicking)
    g.moveTo(catX - 4, catY)
      .quadraticCurveTo(catX - 6, catY - 2 + tailFlick, catX - 5, catY - 4 + tailFlick)
      .stroke({ color: COL_CAT, width: 1 });

    // ── Chickens (2, pecking near base) ──
    const chickens = [
      { x: 28, y: MH - 8 },
      { x: 36, y: MH - 6 },
    ];
    for (let i = 0; i < chickens.length; i++) {
      const c = chickens[i];
      const bob = Math.sin(time * CHICKEN_BOB + i * 2.5) * 1;
      const peck = Math.sin(time * CHICKEN_BOB * 1.5 + i * 3);
      const cy = c.y + bob;
      const headDip = peck > 0.7 ? 2 : 0;

      // Body
      g.ellipse(c.x, cy, 3, 2).fill({ color: COL_CHICKEN });
      g.ellipse(c.x, cy + 0.5, 2, 1).fill({ color: COL_CHICKEN_DK });
      // Wing
      g.ellipse(c.x + 1, cy - 0.5, 2, 1.5).fill({ color: COL_CHICKEN_DK });
      // Head
      g.circle(c.x - 2, cy - 2 + headDip, 1.5).fill({ color: COL_CHICKEN });
      // Comb
      g.moveTo(c.x - 2.5, cy - 3.5 + headDip)
        .lineTo(c.x - 2, cy - 4.5 + headDip)
        .lineTo(c.x - 1.5, cy - 3.5 + headDip)
        .fill({ color: COL_COMB });
      // Beak
      g.moveTo(c.x - 3, cy - 1.5 + headDip)
        .lineTo(c.x - 4.5, cy - 1 + headDip)
        .lineTo(c.x - 3, cy - 0.8 + headDip)
        .fill({ color: COL_BEAK });
      // Eye
      g.circle(c.x - 2.5, cy - 2.5 + headDip, 0.3).fill({ color: 0x111111 });
      // Tail feathers
      g.moveTo(c.x + 3, cy)
        .lineTo(c.x + 5, cy - 2)
        .lineTo(c.x + 5, cy + 0.5)
        .closePath()
        .fill({ color: COL_CHICKEN_DK });
      // Feet
      g.moveTo(c.x - 1, cy + 2).lineTo(c.x - 1, cy + 3).stroke({ color: COL_BEAK, width: 0.3 });
      g.moveTo(c.x + 1, cy + 2).lineTo(c.x + 1, cy + 3).stroke({ color: COL_BEAK, width: 0.3 });
    }
  }

  // =========================================================================
  // Effects — window glow, grain particles
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // ── Warm interior glow through window ──
    const glow = 0.25 + Math.sin(time * 1.8) * 0.1;
    g.rect(MW / 2 - 6, 54, 8, 10).fill({ color: COL_GLOW, alpha: glow * 0.3 });
    g.circle(MW / 2 - 2, 58, 6).fill({ color: COL_GLOW, alpha: glow * 0.06 });

    // ── Grain particles falling from chute ──
    for (let i = 0; i < 4; i++) {
      const phase = (time * 2.0 + i * 0.5) % 2.0;
      if (phase > 1.5) continue;
      const fall = phase * 12;
      const drift = Math.sin(time * 2 + i * 3) * 1.5;
      const alpha = 0.5 * (1 - phase / 1.5);
      g.circle(MW - 4 + drift, MH - 24 + fall, 0.7).fill({
        color: COL_HAY,
        alpha,
      });
    }

    // ── Dust motes near blades (2) ──
    for (let i = 0; i < 2; i++) {
      const dustPhase = (time * 0.3 + i * 1.2) % 3.0;
      if (dustPhase > 2.0) continue;
      const dx = MW / 2 + Math.sin(time * 0.5 + i * 4) * 18;
      const dy = 26 + Math.cos(time * 0.4 + i * 3) * 14;
      g.circle(dx, dy, 0.8).fill({ color: COL_HAY_LT, alpha: 0.2 * (1 - dustPhase / 2) });
    }
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private _drawHayBale(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    g.roundRect(x, y, w, h, 1).fill({ color: COL_HAY });
    g.roundRect(x, y, w, h, 1).stroke({ color: COL_HAY_DK, width: 0.4 });
    // Twine bands
    g.rect(x + 2, y, w - 4, 0.6).fill({ color: COL_WOOD });
    g.rect(x + 2, y + h - 1, w - 4, 0.6).fill({ color: COL_WOOD });
    // Hay texture lines
    for (let i = 0; i < 3; i++) {
      g.moveTo(x + 2 + i * (w / 3), y + 1)
        .lineTo(x + 1 + i * (w / 3), y + h - 1)
        .stroke({ color: COL_HAY_DK, width: 0.3 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    for (let i = 0; i < w; i++) {
      const h = 1 + Math.sin(i * 2.3) * 1.5;
      g.rect(x + i * 1.2, y - h, 1.2, h + 0.5).fill({ color: COL_MOSS, alpha: 0.55 });
    }
  }
}
