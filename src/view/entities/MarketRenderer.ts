// Procedural market renderer for BuildingView.
//
// Draws a bustling medieval market (~2x2 tiles) with:
//   • Grand arched entrance (Temple-inspired)
//   • Castle-like stone walls with banners
//   • Multiple market stalls with colorful awnings
//   • Detailed merchants and customers with faces, clothing folds
//   • Street performer / juggler
//   • Guard at entrance with armor detail
//   • Goods: fruit baskets, bread loaves, hanging cloth, swords on racks
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
const COL_APPLE_HL = 0xee5555;
const COL_GRAPE = 0x6633aa;
const COL_GRAPE_HL = 0x8855cc;
const COL_ORANGE = 0xe88a28;
const COL_BREAD = 0xd4a574;
const COL_BREAD_DK = 0xb88a56;
const COL_BREAD_CRUST = 0x8a6030;
const COL_CLOTH_GREEN = 0x44aa44;
const COL_CLOTH_RED = 0xaa3333;
const COL_CLOTH_BLUE = 0x3355aa;
const COL_CLOTH_PURPLE = 0x7733aa;
const COL_SWORD_BLADE = 0xccccdd;
const COL_SWORD_GUARD = 0x998866;
const COL_SWORD_GRIP = 0x5a3a1a;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xccaa00;
const COL_CHEESE = 0xeedd44;

// Character colors
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_SHADOW = 0xd4a878;
const COL_SKIN_DK = 0xa67c52;
const COL_SKIN_DK_SHADOW = 0x886040;
const COL_HAIR_BROWN = 0x4a3020;
const COL_HAIR_BLACK = 0x221111;
const COL_HAIR_RED = 0x8a3318;
const COL_HAIR_WHITE = 0xdddddd;
const COL_EYE = 0x222222;
const COL_MOUTH = 0x884444;
const COL_BOOT = 0x3a2a1a;
const COL_BOOT_HL = 0x4a3a2a;

// Armor
const COL_ARMOR = 0x667788;
const COL_ARMOR_DK = 0x556677;
const COL_ARMOR_HL = 0x8899aa;
const COL_HELMET = 0x555566;
const COL_HELMET_HL = 0x777788;

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
    // Individual cobble details
    for (let cx = 2; cx < MW - 4; cx += 10) {
      for (let cy = MH - 7; cy < MH - 1; cy += 4) {
        const offset = (Math.floor(cy / 4) % 2) * 5;
        g.roundRect(cx + offset, cy, 7, 3, 1).fill({ color: 0x7a7068, alpha: 0.5 });
      }
    }

    // Main walls (castle-like stone)
    const wallX = 15;
    const wallW = MW - 30;
    const wallY = 35;
    const wallH = MH - wallY - 12;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone brick pattern with mortar
    for (let row = 0; row < 6; row++) {
      const offset = (row % 2) * 8;
      for (let col = 0; col < 6; col++) {
        const bx = wallX + 4 + col * 16 + offset;
        const by = wallY + 4 + row * 12;
        g.rect(bx, by, 12, 10)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
        // Highlight on top edge of each brick
        g.rect(bx + 1, by, 10, 1).fill({ color: 0xb0ada0, alpha: 0.3 });
      }
    }

    // Decorative columns (Temple-inspired) with fluting
    const colW = 6;
    g.rect(wallX - 4, wallY, colW, wallH)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    // Column fluting lines
    g.rect(wallX - 3, wallY + 2, 1, wallH - 4).fill({ color: COL_MARBLE_DK, alpha: 0.3 });
    g.rect(wallX - 1, wallY + 2, 1, wallH - 4).fill({ color: COL_MARBLE_DK, alpha: 0.3 });

    g.rect(wallX + wallW - 2, wallY, colW, wallH)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    g.rect(wallX + wallW - 1, wallY + 2, 1, wallH - 4).fill({ color: COL_MARBLE_DK, alpha: 0.3 });
    g.rect(wallX + wallW + 1, wallY + 2, 1, wallH - 4).fill({ color: COL_MARBLE_DK, alpha: 0.3 });

    // Column capitals (top decoration)
    g.rect(wallX - 5, wallY - 2, colW + 2, 3).fill({ color: COL_MARBLE });
    g.rect(wallX + wallW - 3, wallY - 2, colW + 2, 3).fill({ color: COL_MARBLE });

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

    // Door panels with grain lines
    g.rect(doorX + 3, doorY + 18, 8, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD, width: 0.5 });
    g.rect(doorX + 5, doorY + 20, 1, 14).fill({ color: COL_WOOD_DK, alpha: 0.3 });
    g.rect(doorX + 8, doorY + 20, 1, 14).fill({ color: COL_WOOD_DK, alpha: 0.3 });

    g.rect(doorX + doorW - 11, doorY + 18, 8, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD, width: 0.5 });
    g.rect(doorX + doorW - 9, doorY + 20, 1, 14).fill({ color: COL_WOOD_DK, alpha: 0.3 });
    g.rect(doorX + doorW - 6, doorY + 20, 1, 14).fill({ color: COL_WOOD_DK, alpha: 0.3 });

    // Door handles
    g.circle(doorX + 9, doorY + 28, 1.5).fill({ color: COL_GOLD });
    g.circle(doorX + doorW - 9, doorY + 28, 1.5).fill({ color: COL_GOLD });

    // Keystone above arch
    g.moveTo(MW / 2 - 4, doorY + 4)
      .lineTo(MW / 2, doorY - 2)
      .lineTo(MW / 2 + 4, doorY + 4)
      .closePath()
      .fill({ color: COL_GOLD_DK });

    // Ornate roof
    g.moveTo(10, 38)
      .quadraticCurveTo(MW / 2, 15, MW - 10, 38)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: 0x5a2d0a, width: 1 });

    // Roof tile lines
    for (let i = 0; i < 4; i++) {
      const ry = 28 + i * 3;
      g.moveTo(20 + i * 5, ry).lineTo(MW - 20 - i * 5, ry).stroke({ color: 0x6a3510, width: 0.5, alpha: 0.4 });
    }

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

    // Wood plank lines
    for (let i = 1; i < 3; i++) {
      g.rect(x + 1, y + i * Math.floor(h / 3), w - 2, 0.5).fill({ color: COL_WOOD_DK, alpha: 0.4 });
    }

    // Counter with slight depth
    g.rect(x, y + h - 12, w, 12).fill({ color: COL_WOOD_DK });
    g.rect(x, y + h - 12, w, 2).fill({ color: 0x4d3018, alpha: 0.5 }); // top edge shadow
    g.rect(x + 1, y + h - 10, w - 2, 1).fill({ color: 0x6a4a28, alpha: 0.3 }); // highlight

    // Awning (striped with scalloped edge)
    const awningH = 10;
    for (let i = 0; i < 3; i++) {
      const stripeY = y - awningH + i * 3;
      g.rect(x - 2, stripeY, w + 4, 3).fill({
        color: i % 2 === 0 ? awningColor : 0xffffff,
        alpha: i % 2 === 0 ? 1 : 0.85,
      });
    }
    // Scalloped bottom edge
    for (let sx = x - 2; sx < x + w + 2; sx += 6) {
      g.moveTo(sx, y - 1)
        .quadraticCurveTo(sx + 3, y + 3, sx + 6, y - 1)
        .fill({ color: awningColor, alpha: 0.8 });
    }

    // Poles with detail
    g.rect(x, y - awningH, 3, h + awningH).fill({ color: COL_WOOD_DK });
    g.rect(x + 1, y - awningH, 1, h + awningH).fill({ color: 0x5a3a1a, alpha: 0.3 }); // highlight
    g.rect(x + w - 3, y - awningH, 3, h + awningH).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 2, y - awningH, 1, h + awningH).fill({ color: 0x5a3a1a, alpha: 0.3 });
  }

  // ── Goods ─────────────────────────────────────────────────────────

  private _drawGoods(): void {
    const g = this._goods;

    // ─── Fruit basket (stall 1) ───
    // Basket
    g.moveTo(11, 71).lineTo(13, 63).lineTo(33, 63).lineTo(35, 71).closePath()
      .fill({ color: 0x8a6830 })
      .stroke({ color: 0x6a4818, width: 0.5 });
    // Basket weave lines
    g.rect(14, 64, 0.5, 6).fill({ color: 0x6a4818, alpha: 0.4 });
    g.rect(19, 64, 0.5, 6).fill({ color: 0x6a4818, alpha: 0.4 });
    g.rect(24, 64, 0.5, 6).fill({ color: 0x6a4818, alpha: 0.4 });
    g.rect(29, 64, 0.5, 6).fill({ color: 0x6a4818, alpha: 0.4 });

    // Apples with highlights
    this._drawFruit(g, 16, 63, 3.5, COL_APPLE, COL_APPLE_HL);
    this._drawFruit(g, 23, 62, 3.5, COL_APPLE, COL_APPLE_HL);
    this._drawFruit(g, 30, 63, 3, COL_GRAPE, COL_GRAPE_HL);
    // Orange
    this._drawFruit(g, 19, 65, 2.5, COL_ORANGE, 0xffaa44);
    // Apple stems
    g.rect(15.5, 59.5, 1, 2).fill({ color: 0x3a2510 });
    g.rect(22.5, 58.5, 1, 2).fill({ color: 0x3a2510 });
    // Tiny leaves
    g.moveTo(16.5, 59.5).lineTo(18, 59).lineTo(17, 60).fill({ color: 0x44aa22 });
    g.moveTo(23.5, 58.5).lineTo(25, 58).lineTo(24, 59).fill({ color: 0x44aa22 });

    // ─── Bread & cheese (stall 2) ───
    // Bread loaf 1 — rounded with scoring
    g.ellipse(95, 66, 7, 4)
      .fill({ color: COL_BREAD })
      .stroke({ color: COL_BREAD_CRUST, width: 0.5 });
    g.ellipse(95, 65, 5, 2).fill({ color: COL_BREAD_DK, alpha: 0.3 }); // shading
    // Score marks on bread
    g.moveTo(91, 65).lineTo(93, 64).stroke({ color: COL_BREAD_CRUST, width: 0.5, alpha: 0.5 });
    g.moveTo(95, 64).lineTo(97, 63).stroke({ color: COL_BREAD_CRUST, width: 0.5, alpha: 0.5 });

    // Bread loaf 2
    g.ellipse(107, 66, 6, 3.5)
      .fill({ color: COL_BREAD })
      .stroke({ color: COL_BREAD_CRUST, width: 0.5 });

    // Cheese wedge
    g.moveTo(112, 68).lineTo(112, 62).lineTo(118, 68).closePath()
      .fill({ color: COL_CHEESE })
      .stroke({ color: COL_GOLD_DK, width: 0.5 });
    // Cheese holes
    g.circle(114, 66, 1).fill({ color: 0xddcc33 });
    g.circle(116, 67, 0.7).fill({ color: 0xddcc33 });

    // ─── Cloth rolls & hanging fabric (stall 3) ───
    // Rolled cloth bolts
    this._drawClothRoll(g, 10, 93, 8, 6, COL_CLOTH_GREEN, 0x338833);
    this._drawClothRoll(g, 22, 93, 8, 6, COL_CLOTH_RED, 0x882222);
    this._drawClothRoll(g, 13, 99, 7, 5, COL_CLOTH_BLUE, 0x223388);
    // Folded cloth stack
    g.rect(26, 99, 8, 2).fill({ color: COL_CLOTH_PURPLE });
    g.rect(26, 97, 8, 2).fill({ color: COL_CLOTH_GREEN });
    g.rect(26, 95, 8, 2).fill({ color: 0xcc8844 });
    // Hanging cloth from awning
    g.moveTo(8, 80).lineTo(8, 72).stroke({ color: COL_CLOTH_GREEN, width: 2 });
    g.moveTo(12, 80).lineTo(12, 74).stroke({ color: COL_CLOTH_RED, width: 2 });

    // ─── Weapons display (stall 4) ───
    // Sword rack (horizontal bar)
    g.rect(88, 85, 25, 2).fill({ color: COL_WOOD_DK });

    // Sword 1 — detailed
    g.rect(90, 86, 1.5, 12).fill({ color: COL_SWORD_GRIP }); // grip
    g.rect(88, 86, 5, 1.5).fill({ color: COL_SWORD_GUARD }); // crossguard
    g.rect(90.2, 76, 1, 10).fill({ color: COL_SWORD_BLADE }); // blade
    g.rect(90.2, 76, 1, 1).fill({ color: 0xffffff, alpha: 0.4 }); // tip highlight
    g.circle(90.7, 98.5, 1.2).fill({ color: COL_GOLD_DK }); // pommel

    // Sword 2
    g.rect(99, 86, 1.5, 12).fill({ color: COL_SWORD_GRIP });
    g.rect(97, 86, 5, 1.5).fill({ color: COL_SWORD_GUARD });
    g.rect(99.2, 78, 1, 8).fill({ color: COL_SWORD_BLADE });
    g.circle(99.7, 98.5, 1.2).fill({ color: COL_GOLD_DK });

    // Dagger
    g.rect(107, 88, 1, 8).fill({ color: COL_SWORD_GRIP });
    g.rect(105.5, 88, 4, 1).fill({ color: COL_SWORD_GUARD });
    g.moveTo(107, 82).lineTo(107.5, 88).lineTo(108, 82).closePath().fill({ color: COL_SWORD_BLADE });

    // Shield on wall
    g.ellipse(114, 92, 5, 7)
      .fill({ color: COL_ARMOR })
      .stroke({ color: COL_ARMOR_DK, width: 0.8 });
    g.ellipse(114, 92, 3, 5).fill({ color: COL_ARMOR_HL, alpha: 0.3 });
    g.circle(114, 92, 1.5).fill({ color: COL_GOLD });
  }

  private _drawFruit(
    g: Graphics,
    x: number,
    y: number,
    r: number,
    color: number,
    highlight: number,
  ): void {
    g.circle(x, y, r).fill({ color: color });
    // Specular highlight
    g.circle(x - r * 0.3, y - r * 0.3, r * 0.4).fill({ color: highlight, alpha: 0.5 });
  }

  private _drawClothRoll(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    darkColor: number,
  ): void {
    g.roundRect(x, y, w, h, 2).fill({ color: color });
    // Roll shadow on bottom
    g.rect(x, y + h - 2, w, 2).fill({ color: darkColor, alpha: 0.4 });
    // Visible roll end (circle)
    g.ellipse(x + w, y + h / 2, 2, h / 2 - 0.5)
      .fill({ color: darkColor })
      .stroke({ color: color, width: 0.5 });
  }

  // ── Merchants ─────────────────────────────────────────────────

  private _updateMerchants(time: number): void {
    const g = this._merchants;
    g.clear();

    // Merchant 1 (stall 1 — fruit seller, stocky, apron)
    this._drawDetailedPerson(g, 23, 75, time, 0, {
      bodyColor: 0xaa6633,
      apron: true,
      apronColor: 0xddccaa,
      skin: COL_SKIN,
      hair: COL_HAIR_BROWN,
      gesture: true,
    });
    // Merchant 2 (stall 2 — baker, white hat)
    this._drawDetailedPerson(g, 103, 75, time, 0.5, {
      bodyColor: 0xeeddcc,
      skin: COL_SKIN,
      hair: COL_HAIR_BLACK,
      bakerHat: true,
      gesture: true,
    });
    // Merchant 3 (stall 3 — cloth trader, colorful)
    this._drawDetailedPerson(g, 22, 105, time, 1.0, {
      bodyColor: COL_CLOTH_PURPLE,
      skin: COL_SKIN_DK,
      hair: COL_HAIR_BLACK,
      gesture: true,
      sash: true,
      sashColor: COL_GOLD,
    });
    // Merchant 4 (stall 4 — weaponsmith, leather)
    this._drawDetailedPerson(g, 102, 105, time, 1.5, {
      bodyColor: 0x6a4a2a,
      skin: COL_SKIN,
      hair: COL_HAIR_RED,
      gesture: true,
      apron: true,
      apronColor: 0x3a3a3a,
    });
  }

  private _drawDetailedPerson(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    phase: number,
    opts: {
      bodyColor: number;
      skin: number;
      hair: number;
      apron?: boolean;
      apronColor?: number;
      bakerHat?: boolean;
      gesture?: boolean;
      sash?: boolean;
      sashColor?: number;
    },
  ): void {
    const bob = Math.sin(time * CROWD_BOB + phase) * 0.5;
    const skinShadow = opts.skin === COL_SKIN ? COL_SKIN_SHADOW : COL_SKIN_DK_SHADOW;

    // Legs with boots
    g.rect(x - 2, y + bob, 2.5, 5).fill({ color: COL_BOOT });
    g.rect(x + 0.5, y + bob, 2.5, 5).fill({ color: COL_BOOT });
    g.rect(x - 2.5, y + 4 + bob, 3.5, 1.5).fill({ color: COL_BOOT_HL }); // boot toe
    g.rect(x, y + 4 + bob, 3.5, 1.5).fill({ color: COL_BOOT_HL });

    // Body (tunic)
    g.roundRect(x - 4, y - 14 + bob, 9, 15, 1).fill({ color: opts.bodyColor });
    // Body shadow on side
    g.rect(x - 4, y - 14 + bob, 2, 15).fill({ color: 0x000000, alpha: 0.1 });

    // Apron
    if (opts.apron) {
      g.rect(x - 3, y - 8 + bob, 7, 9).fill({ color: opts.apronColor ?? 0xddccaa });
      g.rect(x - 1, y - 10 + bob, 3, 2).fill({ color: opts.apronColor ?? 0xddccaa }); // bib
    }

    // Sash
    if (opts.sash) {
      g.moveTo(x - 3, y - 12 + bob).lineTo(x + 4, y - 6 + bob)
        .stroke({ color: opts.sashColor ?? COL_GOLD, width: 2 });
    }

    // Neck
    g.rect(x - 1, y - 16 + bob, 3, 3).fill({ color: opts.skin });

    // Head (slightly oval)
    g.ellipse(x + 0.5, y - 19 + bob, 4, 4.5).fill({ color: opts.skin });
    // Face shadow
    g.ellipse(x + 0.5, y - 18 + bob, 3.5, 3).fill({ color: skinShadow, alpha: 0.15 });

    // Eyes
    g.circle(x - 1.2, y - 19.5 + bob, 0.7).fill({ color: COL_EYE });
    g.circle(x + 2.2, y - 19.5 + bob, 0.7).fill({ color: COL_EYE });
    // Eye whites
    g.circle(x - 1.2, y - 19.5 + bob, 0.4).fill({ color: 0xffffff, alpha: 0.3 });
    g.circle(x + 2.2, y - 19.5 + bob, 0.4).fill({ color: 0xffffff, alpha: 0.3 });

    // Mouth
    g.moveTo(x - 0.5, y - 16.5 + bob)
      .quadraticCurveTo(x + 0.5, y - 15.5 + bob, x + 1.5, y - 16.5 + bob)
      .stroke({ color: COL_MOUTH, width: 0.5 });

    // Hair
    g.ellipse(x + 0.5, y - 22 + bob, 4, 3).fill({ color: opts.hair });

    // Baker hat
    if (opts.bakerHat) {
      g.roundRect(x - 3, y - 27 + bob, 7, 5, 2).fill({ color: 0xffffff });
      g.rect(x - 4, y - 22 + bob, 9, 1.5).fill({ color: 0xeeeeee });
    }

    // Arms
    if (opts.gesture) {
      const wave = Math.sin(time * 2 + phase) * 3;
      // Left arm
      g.moveTo(x - 4, y - 11 + bob)
        .lineTo(x - 9, y - 16 + bob + wave * 0.3)
        .stroke({ color: opts.bodyColor, width: 2.5 });
      g.circle(x - 9, y - 16 + bob + wave * 0.3, 2).fill({ color: opts.skin }); // hand

      // Right arm
      g.moveTo(x + 5, y - 11 + bob)
        .lineTo(x + 10, y - 16 + bob - wave * 0.3)
        .stroke({ color: opts.bodyColor, width: 2.5 });
      g.circle(x + 10, y - 16 + bob - wave * 0.3, 2).fill({ color: opts.skin });
    }
  }

  // ── Crowd / Customers ─────────────────────────────────────────────

  private _updateCrowd(time: number): void {
    const g = this._crowd;
    g.clear();

    // Customer 1 (woman browsing fruit)
    this._drawCustomer(g, 38, 95, time, {
      bodyColor: 0xaa4444,
      skin: COL_SKIN,
      hair: COL_HAIR_RED,
      longHair: true,
      carrying: true,
    });
    // Customer 2 (man with hat browsing bread)
    this._drawCustomer(g, 75, 90, time, {
      bodyColor: 0x446688,
      skin: COL_SKIN,
      hair: COL_HAIR_BROWN,
      hat: true,
    });
    // Child running
    this._drawChild(g, 55, 105, time);
    // Elder with staff
    this._drawElder(g, 88, 92, time);
    // Noble with fancy outfit
    this._drawNoble(g, 45, 88, time);
  }

  private _drawCustomer(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    opts: {
      bodyColor: number;
      skin: number;
      hair: number;
      hat?: boolean;
      longHair?: boolean;
      carrying?: boolean;
    },
  ): void {
    const bob = Math.sin(time * CROWD_BOB + x * 0.1) * 0.4;
    const skinShadow = opts.skin === COL_SKIN ? COL_SKIN_SHADOW : COL_SKIN_DK_SHADOW;

    // Legs
    g.rect(x - 2, y + bob, 2, 5).fill({ color: 0x4a4030 });
    g.rect(x + 0.5, y + bob, 2, 5).fill({ color: 0x4a4030 });
    g.rect(x - 2.5, y + 4 + bob, 3, 1.5).fill({ color: COL_BOOT });
    g.rect(x, y + 4 + bob, 3, 1.5).fill({ color: COL_BOOT });

    // Body
    g.roundRect(x - 3.5, y - 12 + bob, 7, 13, 1).fill({ color: opts.bodyColor });
    // Belt
    g.rect(x - 3.5, y - 4 + bob, 7, 1.5).fill({ color: 0x3a2a1a });

    // Neck & head
    g.rect(x - 1, y - 14 + bob, 2.5, 2.5).fill({ color: opts.skin });
    g.ellipse(x, y - 17 + bob, 3.5, 4).fill({ color: opts.skin });
    g.ellipse(x, y - 16.5 + bob, 3, 2.5).fill({ color: skinShadow, alpha: 0.1 });

    // Eyes
    g.circle(x - 1, y - 17.5 + bob, 0.6).fill({ color: COL_EYE });
    g.circle(x + 1.5, y - 17.5 + bob, 0.6).fill({ color: COL_EYE });

    // Hair
    if (opts.longHair) {
      g.ellipse(x, y - 19 + bob, 4, 3).fill({ color: opts.hair });
      // Long hair sides
      g.rect(x - 4, y - 18 + bob, 2, 8).fill({ color: opts.hair });
      g.rect(x + 2.5, y - 18 + bob, 2, 8).fill({ color: opts.hair });
    } else {
      g.ellipse(x, y - 19 + bob, 3.5, 2.5).fill({ color: opts.hair });
    }

    // Hat
    if (opts.hat) {
      g.rect(x - 4.5, y - 21 + bob, 9, 2).fill({ color: 0x3a2510 });
      g.roundRect(x - 2.5, y - 25 + bob, 5, 4, 1).fill({ color: 0x3a2510 });
    }

    // Arms
    const armY = y - 8 + bob;
    g.moveTo(x - 3.5, y - 10 + bob).lineTo(x - 6, armY).stroke({ color: opts.bodyColor, width: 2 });
    g.circle(x - 6, armY, 1.5).fill({ color: opts.skin });

    if (opts.carrying) {
      // Carrying a small basket
      g.moveTo(x + 3.5, y - 10 + bob).lineTo(x + 7, armY - 2).stroke({ color: opts.bodyColor, width: 2 });
      g.roundRect(x + 5, armY - 4, 5, 4, 1).fill({ color: 0x8a6830 });
      g.circle(x + 7, armY - 5, 1.5).fill({ color: COL_APPLE }); // fruit in basket
    } else {
      g.moveTo(x + 3.5, y - 10 + bob).lineTo(x + 6, armY).stroke({ color: opts.bodyColor, width: 2 });
      g.circle(x + 6, armY, 1.5).fill({ color: opts.skin });
    }
  }

  private _drawChild(g: Graphics, x: number, y: number, time: number): void {
    const run = Math.sin(time * 4) * 3;
    const cx = x + run;

    // Legs (animated running)
    const legPhase = Math.sin(time * 8) * 2;
    g.rect(cx - 1.5, y + legPhase * 0.3, 2, 4).fill({ color: 0x4a4030 });
    g.rect(cx + 0.5, y - legPhase * 0.3, 2, 4).fill({ color: 0x4a4030 });

    // Body
    g.roundRect(cx - 2.5, y - 8, 5.5, 8, 1).fill({ color: 0x44aa44 });

    // Head
    g.ellipse(cx, y - 11, 3, 3.5).fill({ color: COL_SKIN });

    // Eyes (wide, childlike)
    g.circle(cx - 1, y - 11.5, 0.8).fill({ color: COL_EYE });
    g.circle(cx + 1.5, y - 11.5, 0.8).fill({ color: COL_EYE });

    // Hair
    g.ellipse(cx, y - 13, 3.5, 2).fill({ color: COL_HAIR_WHITE });

    // Arms (swinging while running)
    const armSwing = Math.sin(time * 8 + 1) * 3;
    g.moveTo(cx - 2.5, y - 5).lineTo(cx - 4 - armSwing * 0.3, y - 3)
      .stroke({ color: 0x44aa44, width: 1.5 });
    g.moveTo(cx + 3, y - 5).lineTo(cx + 5 + armSwing * 0.3, y - 3)
      .stroke({ color: 0x44aa44, width: 1.5 });
  }

  private _drawElder(g: Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time * CROWD_BOB * 0.8) * 0.3;

    // Walking stick
    g.moveTo(x + 7, y + 5 + bob).lineTo(x + 5, y - 14 + bob)
      .stroke({ color: COL_WOOD, width: 1.5 });

    // Legs
    g.rect(x - 2, y + bob, 2, 5).fill({ color: 0x555566 });
    g.rect(x + 0.5, y + bob, 2, 5).fill({ color: 0x555566 });

    // Body (robe)
    g.roundRect(x - 3.5, y - 12 + bob, 7, 13, 1).fill({ color: 0x666688 });
    // Robe belt
    g.rect(x - 3, y - 4 + bob, 6, 1).fill({ color: 0x887766 });

    // Neck & head
    g.rect(x - 1, y - 14 + bob, 2.5, 2.5).fill({ color: COL_SKIN });
    g.ellipse(x, y - 17 + bob, 3.5, 4).fill({ color: COL_SKIN });

    // Eyes (squinting)
    g.rect(x - 2, y - 17.5 + bob, 2, 0.5).fill({ color: COL_EYE });
    g.rect(x + 0.5, y - 17.5 + bob, 2, 0.5).fill({ color: COL_EYE });

    // White hair & beard
    g.ellipse(x, y - 20 + bob, 4, 2.5).fill({ color: COL_HAIR_WHITE });
    // Beard — fuller with shape
    g.moveTo(x - 2.5, y - 14 + bob)
      .quadraticCurveTo(x, y - 10 + bob, x + 2.5, y - 14 + bob)
      .fill({ color: COL_HAIR_WHITE });
    g.moveTo(x - 1.5, y - 14 + bob)
      .quadraticCurveTo(x, y - 11.5 + bob, x + 1.5, y - 14 + bob)
      .fill({ color: 0xcccccc, alpha: 0.5 });

    // Cap
    g.roundRect(x - 3.5, y - 22 + bob, 7, 3, 1).fill({ color: 0x444455 });
  }

  private _drawNoble(g: Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time * CROWD_BOB + 2) * 0.4;

    // Legs (fine trousers)
    g.rect(x - 2, y + bob, 2.5, 5).fill({ color: 0x332244 });
    g.rect(x + 0.5, y + bob, 2.5, 5).fill({ color: 0x332244 });
    // Fine boots
    g.rect(x - 2.5, y + 4 + bob, 3.5, 2).fill({ color: 0x2a1a0a });
    g.rect(x, y + 4 + bob, 3.5, 2).fill({ color: 0x2a1a0a });

    // Body (fancy coat with trim)
    g.roundRect(x - 4.5, y - 14 + bob, 9.5, 15, 1).fill({ color: 0x442266 });
    // Gold trim on coat edges
    g.rect(x - 4.5, y - 14 + bob, 1.5, 15).fill({ color: COL_GOLD, alpha: 0.5 });
    g.rect(x + 3.5, y - 14 + bob, 1.5, 15).fill({ color: COL_GOLD, alpha: 0.5 });
    // Belt with buckle
    g.rect(x - 4, y - 5 + bob, 8.5, 1.5).fill({ color: COL_GOLD_DK });
    g.rect(x - 0.5, y - 5.5 + bob, 2, 2.5).fill({ color: COL_GOLD });

    // Neck & head
    g.rect(x - 1, y - 16 + bob, 2.5, 2.5).fill({ color: COL_SKIN });
    g.ellipse(x + 0.5, y - 19 + bob, 4, 4.5).fill({ color: COL_SKIN });

    // Eyes
    g.circle(x - 0.8, y - 19.5 + bob, 0.6).fill({ color: COL_EYE });
    g.circle(x + 2, y - 19.5 + bob, 0.6).fill({ color: COL_EYE });

    // Nose (small triangle)
    g.moveTo(x + 0.2, y - 18 + bob).lineTo(x + 0.7, y - 17 + bob).lineTo(x + 1.2, y - 18 + bob)
      .stroke({ color: COL_SKIN_SHADOW, width: 0.5 });

    // Hair
    g.ellipse(x + 0.5, y - 22 + bob, 4, 2.5).fill({ color: COL_HAIR_BLACK });

    // Fancy hat (feathered)
    g.rect(x - 5.5, y - 24 + bob, 12, 2.5).fill({ color: 0x442266 });
    g.roundRect(x - 3.5, y - 29 + bob, 8, 6, 2).fill({ color: 0x442266 });
    // Feather
    g.moveTo(x + 4, y - 28 + bob)
      .quadraticCurveTo(x + 10, y - 34 + bob, x + 8, y - 27 + bob)
      .stroke({ color: 0xcc4444, width: 1 });
    // Hat jewel
    g.circle(x + 0.5, y - 26 + bob, 1.5).fill({ color: COL_GOLD });

    // Arms at sides
    g.moveTo(x - 4.5, y - 11 + bob).lineTo(x - 7, y - 5 + bob)
      .stroke({ color: 0x442266, width: 2.5 });
    g.circle(x - 7, y - 5 + bob, 1.5).fill({ color: COL_SKIN });
    g.moveTo(x + 5, y - 11 + bob).lineTo(x + 7, y - 5 + bob)
      .stroke({ color: 0x442266, width: 2.5 });
    g.circle(x + 7, y - 5 + bob, 1.5).fill({ color: COL_SKIN });
  }

  // ── Juggler / Street Performer ────────────────────────────────

  private _updateJuggler(time: number): void {
    const g = this._juggler;
    g.clear();

    const jx = 64;
    const jy = 100;

    // Juggling balls (arc motion with trail effect)
    for (let i = 0; i < 3; i++) {
      const phase = time * JUGGLE_SPEED + (i * Math.PI * 2) / 3;
      const ballX = jx + Math.sin(phase) * 12;
      const ballY = jy - 35 - Math.abs(Math.cos(phase)) * 15;
      const colors = [0xff4444, 0x44ff44, 0x4444ff];
      const highlights = [0xff8888, 0x88ff88, 0x8888ff];
      // Shadow
      g.circle(ballX + 0.5, ballY + 0.5, 4).fill({ color: 0x000000, alpha: 0.15 });
      // Ball
      g.circle(ballX, ballY, 4).fill({ color: colors[i] });
      // Highlight
      g.circle(ballX - 1, ballY - 1, 1.5).fill({ color: highlights[i], alpha: 0.5 });
    }

    // Legs
    g.rect(jx - 2, jy - 4, 2, 6).fill({ color: 0x554433 });
    g.rect(jx, jy - 4, 2, 6).fill({ color: 0x554433 });
    g.rect(jx - 2.5, jy + 1.5, 3, 1.5).fill({ color: COL_BOOT });
    g.rect(jx, jy + 1.5, 3, 1.5).fill({ color: COL_BOOT });

    // Body (jester-like tunic, two-toned)
    g.roundRect(jx - 4, jy - 18, 4, 14, 1).fill({ color: 0xcc8844 });
    g.roundRect(jx, jy - 18, 4, 14, 1).fill({ color: 0x44aa88 });
    // Belt
    g.rect(jx - 4, jy - 8, 8, 1.5).fill({ color: 0x3a2a1a });

    // Neck & head
    g.rect(jx - 1, jy - 20, 2.5, 2.5).fill({ color: COL_SKIN });
    g.ellipse(jx, jy - 23, 4, 4.5).fill({ color: COL_SKIN });

    // Face
    g.circle(jx - 1.2, jy - 23.5, 0.7).fill({ color: COL_EYE });
    g.circle(jx + 1.5, jy - 23.5, 0.7).fill({ color: COL_EYE });
    // Big smile
    g.moveTo(jx - 1.5, jy - 21)
      .quadraticCurveTo(jx, jy - 19.5, jx + 1.5, jy - 21)
      .stroke({ color: COL_MOUTH, width: 0.7 });

    // Hair / jester cap
    g.ellipse(jx, jy - 26, 4, 2.5).fill({ color: 0x4a3020 });
    // Jester cap points
    g.moveTo(jx - 3, jy - 27)
      .quadraticCurveTo(jx - 6, jy - 34, jx - 2, jy - 30)
      .fill({ color: 0xcc8844 });
    g.moveTo(jx + 3, jy - 27)
      .quadraticCurveTo(jx + 6, jy - 34, jx + 2, jy - 30)
      .fill({ color: 0x44aa88 });
    // Bells on cap tips
    g.circle(jx - 2, jy - 30, 1.2).fill({ color: COL_GOLD });
    g.circle(jx + 2, jy - 30, 1.2).fill({ color: COL_GOLD });

    // Arms raised (follow juggling motion)
    const armWave = Math.sin(time * JUGGLE_SPEED * 0.5) * 2;
    g.moveTo(jx - 4, jy - 15)
      .lineTo(jx - 10, jy - 25 - armWave)
      .stroke({ color: 0xcc8844, width: 2.5 });
    g.circle(jx - 10, jy - 25 - armWave, 2).fill({ color: COL_SKIN });

    g.moveTo(jx + 4, jy - 15)
      .lineTo(jx + 10, jy - 25 + armWave)
      .stroke({ color: 0x44aa88, width: 2.5 });
    g.circle(jx + 10, jy - 25 + armWave, 2).fill({ color: COL_SKIN });
  }

  // ── Guard ───────────────────────────────────────────────────────

  private _updateGuard(time: number): void {
    const g = this._guard;
    g.clear();

    const gx = MW / 2 + 30;
    const gy = MH - 20;
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.5;

    // Shield (detailed)
    g.ellipse(gx - 9, gy - 4 + breathe, 6, 9)
      .fill({ color: COL_ARMOR })
      .stroke({ color: COL_ARMOR_DK, width: 0.8 });
    g.ellipse(gx - 9, gy - 4 + breathe, 4, 7).fill({ color: COL_ARMOR_HL, alpha: 0.2 });
    // Shield boss (center knob)
    g.circle(gx - 9, gy - 4 + breathe, 2).fill({ color: COL_ARMOR_DK });
    g.circle(gx - 9, gy - 4 + breathe, 1).fill({ color: COL_ARMOR_HL });
    // Shield cross emblem
    g.rect(gx - 10, gy - 9 + breathe, 2, 10).fill({ color: COL_BANNER1, alpha: 0.5 });
    g.rect(gx - 13, gy - 4 + breathe, 8, 1.5).fill({ color: COL_BANNER1, alpha: 0.5 });

    // Legs (armored)
    g.rect(gx - 3, gy + breathe, 3, 6).fill({ color: 0x3a3a3a });
    g.rect(gx + 0.5, gy + breathe, 3, 6).fill({ color: 0x3a3a3a });
    // Greaves (shin armor)
    g.rect(gx - 3, gy + breathe, 3, 3).fill({ color: COL_ARMOR_DK });
    g.rect(gx + 0.5, gy + breathe, 3, 3).fill({ color: COL_ARMOR_DK });
    // Boots
    g.rect(gx - 3.5, gy + 5 + breathe, 4, 2).fill({ color: 0x2a2a2a });
    g.rect(gx, gy + 5 + breathe, 4, 2).fill({ color: 0x2a2a2a });

    // Body (chainmail)
    g.roundRect(gx - 4.5, gy - 18 + breathe, 9.5, 18, 1).fill({ color: COL_ARMOR });
    // Chainmail texture (horizontal lines)
    for (let i = 0; i < 5; i++) {
      g.rect(gx - 4, gy - 16 + i * 3 + breathe, 8.5, 0.5)
        .fill({ color: COL_ARMOR_DK, alpha: 0.4 });
    }
    // Tabard (cloth over armor)
    g.rect(gx - 2, gy - 12 + breathe, 5, 12).fill({ color: COL_BANNER1, alpha: 0.4 });

    // Neck & head
    g.rect(gx - 1, gy - 20 + breathe, 3, 2.5).fill({ color: COL_SKIN_DK });
    g.ellipse(gx + 0.5, gy - 23 + breathe, 4, 4.5).fill({ color: COL_SKIN_DK });
    // Face shadow
    g.ellipse(gx + 0.5, gy - 22 + breathe, 3.5, 3).fill({ color: COL_SKIN_DK_SHADOW, alpha: 0.15 });

    // Eyes (stern)
    g.rect(gx - 1.5, gy - 24 + breathe, 2, 0.8).fill({ color: COL_EYE });
    g.rect(gx + 1, gy - 24 + breathe, 2, 0.8).fill({ color: COL_EYE });

    // Mouth (thin line)
    g.rect(gx - 1, gy - 20.5 + breathe, 2.5, 0.5).fill({ color: 0x664444 });

    // Helmet (detailed)
    g.roundRect(gx - 5, gy - 29 + breathe, 11, 7, 2).fill({ color: COL_HELMET });
    // Helmet ridge
    g.rect(gx + 0.2, gy - 29 + breathe, 1, 7).fill({ color: COL_HELMET_HL, alpha: 0.4 });
    // Nose guard
    g.rect(gx, gy - 24 + breathe, 1, 3).fill({ color: COL_HELMET });
    // Helmet brim
    g.rect(gx - 6, gy - 23 + breathe, 13, 2).fill({ color: COL_HELMET });
    g.rect(gx - 6, gy - 23 + breathe, 13, 0.5).fill({ color: COL_HELMET_HL, alpha: 0.3 });

    // Spear (detailed)
    g.moveTo(gx + 8, gy + 5)
      .lineTo(gx + 8, gy - 32)
      .stroke({ color: COL_WOOD, width: 2 });
    // Spear head
    g.moveTo(gx + 5.5, gy - 35)
      .lineTo(gx + 8, gy - 42)
      .lineTo(gx + 10.5, gy - 35)
      .closePath()
      .fill({ color: COL_SWORD_BLADE });
    // Spear head highlight
    g.moveTo(gx + 7, gy - 40).lineTo(gx + 8, gy - 42).lineTo(gx + 8.5, gy - 38)
      .fill({ color: 0xffffff, alpha: 0.2 });
    // Spear crossguard
    g.rect(gx + 6, gy - 35, 4, 1.5).fill({ color: COL_SWORD_GUARD });
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
    const wave2 = Math.sin(time * BANNER_WAVE * 0.7 + 1) * 1;

    // Pole
    g.rect(x, y, 2, 14).fill({ color: COL_WOOD });
    g.rect(x, y, 2, 1).fill({ color: COL_GOLD, alpha: 0.5 }); // gold cap

    // Banner cloth with more natural wave
    g.moveTo(x + 2, y)
      .bezierCurveTo(x + 8 + wave, y + 3, x + 12 + wave + wave2, y + 8, x + 2, y + 14)
      .closePath()
      .fill({ color: color });

    // Banner emblem (small gold diamond)
    const embX = x + 5 + wave * 0.4;
    const embY = y + 7;
    g.moveTo(embX, embY - 2)
      .lineTo(embX + 2, embY)
      .lineTo(embX, embY + 2)
      .lineTo(embX - 2, embY)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.6 });
  }
}
