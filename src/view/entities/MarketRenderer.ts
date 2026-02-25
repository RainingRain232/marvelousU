// Procedural market renderer for BuildingView.
//
// Draws a bustling medieval market (~2x2 tiles) with:
//   • Grand arched entrance (Temple-inspired)
//   • Castle-like stone walls with banners
//   • Multiple market stalls with colorful awnings
//   • Many merchants and customers
//   • Street performer / juggler
//   • Guard at entrance
//   • Goods: fruits, weapons, cloth, jewelry
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const MW = 2 * TS; // 128px wide
const MH = 2 * TS; // 128px tall

// Palette — rich marketplace
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_MARBLE = 0xf5efe0;
const COL_MARBLE_DK = 0xd4cbb8;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_ROOF = 0x8b4513;

// Banners
const COL_BANNER1 = 0xcc2244;
const COL_BANNER2 = 0x2244cc;
const COL_BANNER3 = 0xccaa22;

// Stalls awnings
const COL_AWNING1 = 0xcc3333;
const COL_AWNING2 = 0x33cc33;
const COL_AWNING3 = 0x3333cc;
const COL_AWNING4 = 0xcccc33;

// Goods
const COL_APPLE = 0xcc3333;
const COL_GRAPE = 0x6633aa;
const COL_BREAD = 0xd4a574;
const COL_CLOTH = 0x44aa44;
const COL_SWORD = 0xccccdd;
const COL_GOLD = 0xffd700;

// Character colors
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xa67c52;
const COL_HAIR = 0x4a3020;
const COL_HAIR_WHITE = 0xdddddd;
const COL_CLOTH_CUSTOMER = 0xaa4444;
const COL_CLOTH_GUARD = 0x667788;

// Animation timing
const JUGGLE_SPEED = 1.5;
const CROWD_BOB = 2.0;
const BANNER_WAVE = 3.0;
const GUARD_BREATHE = 2.5;

// ---------------------------------------------------------------------------
// MarketRenderer
// ---------------------------------------------------------------------------

export class MarketRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _stalls = new Graphics();
  private _merchants = new Graphics();
  private _crowd = new Graphics();
  private _juggler = new Graphics();
  private _guard = new Graphics();
  private _banners = new Graphics();
  private _goods = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBuilding();
    this._drawStalls();
    this._drawGoods();

    this.container.addChild(this._building);
    this.container.addChild(this._stalls);
    this.container.addChild(this._goods);
    this.container.addChild(this._merchants);
    this.container.addChild(this._crowd);
    this.container.addChild(this._juggler);
    this.container.addChild(this._guard);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateMerchants(this._time);
    this._updateCrowd(this._time);
    this._updateJuggler(this._time);
    this._updateGuard(this._time);
    this._updateBanners(this._time);
  }

  // ── Building ───────────────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    // Ground / cobblestones
    g.rect(0, MH - 8, MW, 8).fill({ color: 0x8a8078 });

    // Main walls (castle-like stone)
    const wallX = 15;
    const wallW = MW - 30;
    const wallY = 35;
    const wallH = MH - wallY - 12;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone brick pattern
    for (let row = 0; row < 6; row++) {
      const offset = (row % 2) * 8;
      for (let col = 0; col < 6; col++) {
        g.rect(wallX + 4 + col * 16 + offset, wallY + 4 + row * 12, 12, 10)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
      }
    }

    // Decorative columns (Temple-inspired)
    const colW = 6;
    g.rect(wallX - 4, wallY, colW, wallH)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    g.rect(wallX + wallW - 2, wallY, colW, wallH)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });

    // Grand arched entrance (center)
    const doorW = 24;
    const doorH = 40;
    const doorX = MW / 2 - doorW / 2;
    const doorY = MH - doorH - 10;

    g.moveTo(doorX, doorY + doorH)
      .lineTo(doorX, doorY + 15)
      .quadraticCurveTo(doorX + doorW / 2, doorY - 5, doorX + doorW, doorY + 15)
      .lineTo(doorX + doorW, doorY + doorH)
      .closePath()
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_GOLD, width: 1.5 });

    // Door panels
    g.rect(doorX + 3, doorY + 18, 8, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD, width: 0.5 });
    g.rect(doorX + doorW - 11, doorY + 18, 8, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD, width: 0.5 });

    // Ornate roof
    g.moveTo(10, 38)
      .quadraticCurveTo(MW / 2, 15, MW - 10, 38)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: 0x5a2d0a, width: 1 });

    // Crenellations
    for (let i = 0; i < 8; i++) {
      g.rect(wallX + 8 + i * 14, wallY - 5, 8, 5)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }
  }

  // ── Market Stalls ─────────────────────────────────────────────────

  private _drawStalls(): void {
    const g = this._stalls;

    // Stall 1 (left back)
    this._drawStall(g, 8, 45, 30, 28, COL_AWNING1);
    // Stall 2 (right back)
    this._drawStall(g, 88, 45, 30, 28, COL_AWNING2);
    // Stall 3 (front left)
    this._drawStall(g, 5, 80, 35, 30, COL_AWNING3);
    // Stall 4 (front right)
    this._drawStall(g, 85, 80, 35, 30, COL_AWNING4);
  }

  private _drawStall(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    awningColor: number,
  ): void {
    // Stall base
    g.rect(x, y, w, h)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // Counter
    g.rect(x, y + h - 12, w, 12).fill({ color: COL_WOOD_DK });

    // Awning (striped)
    const stripeH = 4;
    for (let i = 0; i < 4; i++) {
      g.rect(x, y - 8 + i * stripeH * 2, w, stripeH).fill({
        color: i % 2 === 0 ? awningColor : 0xffffff,
      });
    }

    // Poles
    g.rect(x, y - 12, 3, h + 12).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 3, y - 12, 3, h + 12).fill({ color: COL_WOOD_DK });
  }

  // ── Goods ─────────────────────────────────────────────────────────

  private _drawGoods(): void {
    const g = this._goods;

    // Fruits (stall 1)
    g.circle(15, 68, 4).fill({ color: COL_APPLE });
    g.circle(23, 68, 4).fill({ color: COL_APPLE });
    g.circle(31, 68, 4).fill({ color: COL_GRAPE });

    // Bread (stall 2)
    g.ellipse(95, 66, 6, 4).fill({ color: COL_BREAD });
    g.ellipse(105, 66, 6, 4).fill({ color: COL_BREAD });
    g.ellipse(110, 64, 5, 3).fill({ color: COL_BREAD });

    // Cloth (stall 3)
    g.rect(10, 92, 10, 8).fill({ color: COL_CLOTH });
    g.rect(22, 92, 10, 8).fill({ color: COL_CLOTH_CUSTOMER });

    // Weapons (stall 4)
    g.moveTo(90, 95).lineTo(90, 85).stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(87, 85)
      .lineTo(90, 82)
      .lineTo(93, 85)
      .closePath()
      .fill({ color: COL_SWORD });
    g.moveTo(100, 95).lineTo(100, 88).stroke({ color: COL_WOOD, width: 1.5 });
    g.circle(100, 87, 3).fill({ color: COL_GOLD });
  }

  // ── Merchants ─────────────────────────────────────────────────

  private _updateMerchants(time: number): void {
    const g = this._merchants;
    g.clear();

    // Merchant 1 (at stall 1)
    this._drawMerchant(g, 23, 75, time, COL_AWNING1);
    //at stall 2 Merchant 2 ()
    this._drawMerchant(g, 103, 75, time, COL_AWNING2);
    // Merchant 3 (at stall 3)
    this._drawMerchant(g, 22, 105, time, COL_AWNING3);
    // Merchant 4 (at stall 4)
    this._drawMerchant(g, 102, 105, time, COL_AWNING4);
  }

  private _drawMerchant(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    clothColor: number,
  ): void {
    const bob = Math.sin(time * CROWD_BOB) * 0.5;

    // Body
    g.rect(x - 4, y - 14 + bob, 8, 14).fill({ color: clothColor });
    g.rect(x - 3, y - 10 + bob, 6, 3).fill({ color: COL_GOLD });

    // Head
    g.circle(x, y - 18 + bob, 4).fill({ color: COL_SKIN });

    // Hair
    g.circle(x, y - 21 + bob, 3).fill({ color: COL_HAIR });

    // Arms (gesturing)
    const wave = Math.sin(time * 2) * 2;
    g.rect(x - 8, y - 12 + bob + wave * 0.3, 4, 3).fill({ color: COL_SKIN });
    g.rect(x + 4, y - 12 + bob - wave * 0.3, 4, 3).fill({ color: COL_SKIN });
  }

  // ── Crowd / Customers ─────────────────────────────────────────────

  private _updateCrowd(time: number): void {
    const g = this._crowd;
    g.clear();

    // Customer 1 (looking at stall 1)
    this._drawPerson(g, 38, 95, time, 0xaa4444, false);
    // Customer 2 (looking at stall 2)
    this._drawPerson(g, 75, 90, time, 0x446688, true);
    // Customer 3 (child running)
    this._drawChild(g, 55, 105, time);
    // Customer 4 (elderly person)
    this._drawElder(g, 88, 92, time);
    // Customer 5 (noble with hat)
    this._drawNoble(g, 45, 88, time);
  }

  private _drawPerson(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    clothColor: number,
    hasHat: boolean,
  ): void {
    const bob = Math.sin(time * CROWD_BOB + x * 0.1) * 0.4;

    // Body
    g.rect(x - 3, y - 12 + bob, 6, 12).fill({ color: clothColor });

    // Head
    g.circle(x, y - 16 + bob, 3).fill({ color: COL_SKIN });

    // Hair
    g.circle(x, y - 18 + bob, 3).fill({ color: COL_HAIR });

    // Hat
    if (hasHat) {
      g.rect(x - 4, y - 21 + bob, 8, 2).fill({ color: 0x3a2510 });
      g.rect(x - 2, y - 24 + bob, 4, 3).fill({ color: 0x3a2510 });
    }

    // Legs
    g.rect(x - 2, y + bob, 2, 5).fill({ color: 0x4a4030 });
    g.rect(x, y + bob, 2, 5).fill({ color: 0x4a4030 });
  }

  private _drawChild(g: Graphics, x: number, y: number, time: number): void {
    const run = Math.sin(time * 4) * 3;

    // Smaller body
    g.rect(x - 2 + run, y - 8, 5, 8).fill({ color: 0x44aa44 });

    // Head
    g.circle(x + run, y - 12, 3).fill({ color: COL_SKIN });

    // Hair (lighter)
    g.circle(x + run, y - 14, 2).fill({ color: COL_HAIR_WHITE });

    // Running legs
    g.rect(x - 2 + run, y, 2, 4).fill({ color: 0x4a4030 });
    g.rect(x + run, y + 1, 2, 4).fill({ color: 0x4a4030 });
  }

  private _drawElder(g: Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time * CROWD_BOB * 0.8) * 0.3;

    // Body (robe)
    g.rect(x - 3, y - 12 + bob, 6, 12).fill({ color: 0x666688 });

    // Head
    g.circle(x, y - 16 + bob, 3).fill({ color: COL_SKIN });

    // White hair / beard
    g.circle(x, y - 18 + bob, 3).fill({ color: COL_HAIR_WHITE });
    g.moveTo(x - 2, y - 13 + bob)
      .quadraticCurveTo(x, y - 10, x + 2, y - 13 + bob)
      .fill({ color: COL_HAIR_WHITE });

    // Hat
    g.rect(x - 3, y - 21 + bob, 6, 2).fill({ color: 0x333333 });
  }

  private _drawNoble(g: Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time * CROWD_BOB + 2) * 0.4;

    // Fancy coat
    g.rect(x - 4, y - 14 + bob, 8, 14).fill({ color: 0x442266 });
    g.rect(x - 3, y - 10 + bob, 6, 3).fill({ color: COL_GOLD });

    // Head
    g.circle(x, y - 18 + bob, 4).fill({ color: COL_SKIN });

    // Fancy hat
    g.rect(x - 5, y - 22 + bob, 10, 3).fill({ color: 0x442266 });
    g.rect(x - 3, y - 26 + bob, 6, 5).fill({ color: 0x442266 });
    g.circle(x, y - 27 + bob, 2).fill({ color: COL_GOLD });

    // Legs
    g.rect(x - 2, y + bob, 2, 5).fill({ color: 0x332244 });
    g.rect(x, y + bob, 2, 5).fill({ color: 0x332244 });
  }

  // ── Juggler / Street Performer ────────────────────────────────

  private _updateJuggler(time: number): void {
    const g = this._juggler;
    g.clear();

    const jx = 64;
    const jy = 100;

    // Juggling balls (arc motion)
    for (let i = 0; i < 3; i++) {
      const phase = time * JUGGLE_SPEED + (i * Math.PI * 2) / 3;
      const ballX = jx + Math.sin(phase) * 12;
      const ballY = jy - 35 - Math.abs(Math.cos(phase)) * 15;
      const colors = [0xff4444, 0x44ff44, 0x4444ff];
      g.circle(ballX, ballY, 4).fill({ color: colors[i] });
    }

    // Juggler body
    g.rect(jx - 3, jy - 18, 6, 14).fill({ color: 0xcc8844 });

    // Head
    g.circle(jx, jy - 22, 4).fill({ color: COL_SKIN });
    g.circle(jx, jy - 25, 3).fill({ color: 0x4a3020 });

    // Arms raised
    g.moveTo(jx - 4, jy - 15)
      .lineTo(jx - 10, jy - 25)
      .stroke({ color: COL_SKIN, width: 2 });
    g.moveTo(jx + 4, jy - 15)
      .lineTo(jx + 10, jy - 25)
      .stroke({ color: COL_SKIN, width: 2 });

    // Legs
    g.rect(jx - 2, jy - 4, 2, 6).fill({ color: 0x554433 });
    g.rect(jx, jy - 4, 2, 6).fill({ color: 0x554433 });
  }

  // ── Guard ───────────────────────────────────────────────────────

  private _updateGuard(time: number): void {
    const g = this._guard;
    g.clear();

    const gx = MW / 2 + 30;
    const gy = MH - 20;
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.5;

    // Shield
    g.ellipse(gx - 8, gy - 5 + breathe, 5, 8).fill({ color: 0x8899aa });
    g.ellipse(gx - 8, gy - 5 + breathe, 3, 6).fill({ color: 0x667788 });

    // Body
    g.rect(gx - 4, gy - 18 + breathe, 8, 16).fill({ color: COL_CLOTH_GUARD });

    // Head
    g.circle(gx, gy - 22 + breathe, 4).fill({ color: COL_SKIN_DK });

    // Helmet
    g.rect(gx - 5, gy - 27 + breathe, 10, 6).fill({ color: 0x555566 });
    g.rect(gx - 6, gy - 22 + breathe, 12, 2).fill({ color: 0x555566 });

    // Spear
    g.moveTo(gx + 8, gy + 5)
      .lineTo(gx + 8, gy - 30)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(gx + 6, gy - 33)
      .lineTo(gx + 8, gy - 38)
      .lineTo(gx + 10, gy - 33)
      .closePath()
      .fill({ color: COL_SWORD });

    // Legs
    g.rect(gx - 3, gy + breathe, 3, 6).fill({ color: 0x3a3a3a });
    g.rect(gx, gy + breathe, 3, 6).fill({ color: 0x3a3a3a });
  }

  // ── Banners ────────────────────────────────────────────────────

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Left banner
    this._drawBanner(g, 15, 38, time, COL_BANNER1);
    // Right banner
    this._drawBanner(g, MW - 18, 38, time + 1, COL_BANNER2);
    // Center banner
    this._drawBanner(g, MW / 2, 20, time + 2, COL_BANNER3);
  }

  private _drawBanner(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    color: number,
  ): void {
    const wave = Math.sin(time * BANNER_WAVE) * 2;

    g.rect(x, y, 2, 12).fill({ color: COL_WOOD });

    g.moveTo(x + 2, y)
      .bezierCurveTo(x + 8 + wave, y + 2, x + 12 + wave, y + 8, x + 2, y + 14)
      .closePath()
      .fill({ color: color });
  }
}
