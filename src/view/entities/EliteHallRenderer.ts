// Procedural elite hall renderer for BuildingView.
//
// Draws a grand elite warrior hall (~2x2 tiles) with:
//   • Rich marble facade (Temple-inspired)
//   • Stained glass window with warrior emblem
//   • Castle-like stone construction with crenellations
//   • Two elite guards with spears and shields
//   • Displayed weapons (swords, shields)
//   • Golden throne visible through entrance
//   • Waving banners with clan symbols
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const EW = 2 * TS; // 128px wide
const EH = 2 * TS; // 128px tall

// Palette — rich marble & elite
const COL_MARBLE = 0xf5efe0;
const COL_MARBLE_DK = 0xd4cbb8;
const COL_MARBLE_LT = 0xfaf6ec;
const COL_MARBLE_WARM = 0xefe3cc;
const COL_STONE = 0x8a7d66;
const COL_STONE_DK = 0x6a5d46;
const COL_ROOF = 0x4a3028;
const COL_WOOD = 0x3d2510;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_CARPET = 0xaa2233;

// Stained glass
const COL_GLASS_SKY = 0x4a6bff;
const COL_GLASS_GOLD = 0xffdd44;
const COL_GLASS_RED = 0xcc3333;
const COL_GLASS_SILVER = 0xaaaacc;
const COL_GLASS_LEAD = 0x333333;

// Guard armor
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_SHIELD = 0xcc3344;
const COL_SPEAR = 0x8b7355;
const COL_SWORD = 0xccccdd;

// Banner
const COL_BANNER = 0xcc2244;
const COL_BANNER_2 = 0x2244aa;

// Animation timing
const GUARD_BREATHE = 2.5;
const FLAG_WAVE = 3.0;
const WINDOW_GLOW = 1.5;

// ---------------------------------------------------------------------------
// EliteHallRenderer
// ---------------------------------------------------------------------------

export class EliteHallRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _window = new Graphics();
  private _guards = new Graphics();
  private _throne = new Graphics();
  private _weapons = new Graphics();
  private _banners = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBuilding();
    this._drawThrone();
    this._drawWeapons();

    this.container.addChild(this._building);
    this.container.addChild(this._window);
    this.container.addChild(this._throne);
    this.container.addChild(this._guards);
    this.container.addChild(this._weapons);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateWindow(this._time);
    this._updateGuards(this._time);
    this._updateBanners(this._time);
  }

  // ── Building ───────────────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    // Ground / steps
    g.rect(8, EH - 10, EW - 16, 10).fill({ color: COL_STONE });
    g.rect(4, EH - 6, EW - 8, 6).fill({ color: COL_STONE_DK });

    // Main facade - rich marble like Temple
    const facadeX = 18;
    const facadeW = EW - 36;
    const facadeY = 35;
    const facadeH = EH - facadeY - 15;

    g.rect(facadeX, facadeY, facadeW, facadeH)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 1 });

    // Horizontal cornices
    this._drawCornice(g, facadeX, facadeY + 15, facadeW);
    this._drawCornice(g, facadeX, facadeY + facadeH * 0.6, facadeW);

    // Vertical pilasters
    const pilW = 6;
    for (const px of [facadeX, facadeX + facadeW - pilW]) {
      g.rect(px, facadeY, pilW, facadeH)
        .fill({ color: COL_MARBLE_WARM })
        .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    }

    // Center pilasters
    const centerX = EW / 2;
    g.rect(centerX - pilW - 2, facadeY, pilW, facadeH)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    g.rect(centerX + 2, facadeY, pilW, facadeH)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });

    // Ornate entrance door (Gothic arch like Temple)
    const doorW = 28;
    const doorH = 45;
    const doorX = EW / 2 - doorW / 2;
    const doorY = EH - doorH - 15;

    g.moveTo(doorX, doorY + doorH)
      .lineTo(doorX, doorY + 15)
      .quadraticCurveTo(doorX + doorW / 2, doorY - 5, doorX + doorW, doorY + 15)
      .lineTo(doorX + doorW, doorY + doorH)
      .closePath()
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD, width: 1.5 });

    // Door panels
    g.rect(doorX + 4, doorY + 20, 8, 20)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD_DK, width: 0.5 });
    g.rect(doorX + doorW - 12, doorY + 20, 8, 20)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD_DK, width: 0.5 });

    // Door handle
    g.circle(doorX + doorW - 8, doorY + 30, 2).fill({ color: COL_GOLD });

    // Golden frame around door
    g.rect(doorX - 4, doorY + doorH + 2, doorW + 8, 4).fill({
      color: COL_GOLD_DK,
    });
    g.rect(doorX - 4, doorY - 8, doorW + 8, 4).fill({ color: COL_GOLD_DK });

    // Roof - steep triangular like Castle
    g.moveTo(10, 38)
      .lineTo(EW / 2, 10)
      .lineTo(EW - 10, 38)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: 0x2a1818, width: 1 });

    // Crenellations on facade
    const merlonW = 8,
      merlonH = 5,
      gap = 6;
    for (
      let mx = facadeX + 8;
      mx < facadeX + facadeW - merlonW - 8;
      mx += merlonW + gap
    ) {
      g.rect(mx, facadeY - merlonH, merlonW, merlonH)
        .fill({ color: COL_MARBLE_LT })
        .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    }

    // Decorative columns flanking door
    const colH = doorH + 10;
    g.rect(doorX - 12, doorY - 8, 6, colH)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    g.rect(doorX + doorW + 6, doorY - 8, 6, colH)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });

    // Column capitals
    g.rect(doorX - 14, doorY - 12, 10, 4).fill({ color: COL_GOLD_DK });
    g.rect(doorX + doorW + 4, doorY - 12, 10, 4).fill({ color: COL_GOLD_DK });
  }

  private _drawCornice(g: Graphics, x: number, y: number, w: number): void {
    g.rect(x, y, w, 3).fill({ color: COL_MARBLE_DK });
    g.rect(x, y - 2, w, 2).fill({ color: COL_MARBLE_LT });
  }

  // ── Stained Glass Window ────────────────────────────────────────────────

  private _updateWindow(time: number): void {
    const g = this._window;
    g.clear();

    const wx = EW / 2;
    const wy = 58;
    const wr = 16;

    // Window frame
    g.circle(wx, wy, wr + 3).fill({ color: COL_GOLD_DK });
    g.circle(wx, wy, wr + 1).fill({ color: COL_GOLD });

    // Glowing background
    const glow = (Math.sin(time * WINDOW_GLOW) + 1) / 2;
    const bgColor = glow > 0.3 ? COL_GLASS_SKY : 0x2a3a5a;
    g.circle(wx, wy, wr).fill({ color: bgColor });

    // Warrior emblem (sword pointing down with wings)
    // Central sword
    g.moveTo(wx, wy - 8)
      .lineTo(wx, wy + 10)
      .stroke({ color: COL_GLASS_SILVER, width: 2 });
    // Sword handle
    g.rect(wx - 3, wy - 12, 6, 4).fill({ color: COL_GLASS_GOLD });
    // Sword pommel
    g.circle(wx, wy - 13, 2).fill({ color: COL_GLASS_GOLD });
    // Sword tip
    g.moveTo(wx - 3, wy + 10)
      .lineTo(wx, wy + 14)
      .lineTo(wx + 3, wy + 10)
      .closePath()
      .fill({ color: COL_GLASS_SILVER });

    // Wings
    g.moveTo(wx - 4, wy - 2)
      .lineTo(wx - 12, wy - 6)
      .lineTo(wx - 8, wy)
      .closePath()
      .fill({ color: COL_GLASS_GOLD });
    g.moveTo(wx + 4, wy - 2)
      .lineTo(wx + 12, wy - 6)
      .lineTo(wx + 8, wy)
      .closePath()
      .fill({ color: COL_GLASS_GOLD });

    // Shield emblem below sword
    g.moveTo(wx - 5, wy + 4)
      .lineTo(wx + 5, wy + 4)
      .lineTo(wx + 4, wy + 10)
      .lineTo(wx - 4, wy + 10)
      .closePath()
      .fill({ color: COL_GLASS_RED });
    g.moveTo(wx, wy + 5)
      .lineTo(wx, wy + 9)
      .stroke({ color: COL_GLASS_GOLD, width: 1 });

    // Radial lead lines
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.moveTo(wx, wy)
        .lineTo(
          wx + Math.cos(angle) * wr * 0.9,
          wy + Math.sin(angle) * wr * 0.9,
        )
        .stroke({ color: COL_GLASS_LEAD, width: 0.5, alpha: 0.5 });
    }
  }

  // ── Throne ───────────────────────────────────────────────────────────────

  private _drawThrone(): void {
    const g = this._throne;

    const tx = EW / 2;
    const ty = EH - 25;

    // Throne base
    g.rect(tx - 8, ty - 5, 16, 8).fill({ color: COL_WOOD });
    g.rect(tx - 10, ty - 8, 20, 4).fill({ color: COL_GOLD_DK });

    // Throne back
    g.rect(tx - 6, ty - 35, 12, 30).fill({ color: COL_CARPET });
    g.rect(tx - 8, ty - 38, 16, 4).fill({ color: COL_GOLD });

    // Throne armrests
    g.rect(tx - 12, ty - 25, 4, 20).fill({ color: COL_WOOD });
    g.rect(tx + 8, ty - 25, 4, 20).fill({ color: COL_WOOD });

    // Golden trim
    g.rect(tx - 7, ty - 34, 14, 2).fill({ color: COL_GOLD });
  }

  // ── Weapons Display ────────────────────────────────────────────────────

  private _drawWeapons(): void {
    const g = this._weapons;

    // Sword display left
    const sx1 = 30;
    const sy1 = EH - 35;
    g.moveTo(sx1, sy1)
      .lineTo(sx1, sy1 - 25)
      .stroke({ color: COL_WOOD, width: 2 });
    g.moveTo(sx1 - 8, sy1 - 20)
      .lineTo(sx1, sy1 - 25)
      .lineTo(sx1 + 8, sy1 - 20)
      .closePath()
      .fill({ color: COL_SWORD });
    g.rect(sx1 - 2, sy1 - 12, 4, 10).fill({ color: COL_WOOD });
    g.rect(sx1 - 4, sy1 - 14, 8, 3).fill({ color: COL_GOLD });

    // Shield display right
    const sx2 = EW - 30;
    const sy2 = EH - 40;
    g.ellipse(sx2, sy2, 10, 14).fill({ color: COL_SHIELD });
    g.ellipse(sx2, sy2, 8, 12).stroke({ color: COL_GOLD, width: 1 });
    g.circle(sx2, sy2, 3).fill({ color: COL_GOLD });
  }

  // ── Guards ─────────────────────────────────────────────────────────────

  private _updateGuards(time: number): void {
    const g = this._guards;
    g.clear();

    // Left guard
    this._drawGuard(g, 35, EH - 18, time, false);
    // Right guard
    this._drawGuard(g, EW - 35, EH - 18, time, true);
  }

  private _drawGuard(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    facingRight: boolean,
  ): void {
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.5;
    const dir = facingRight ? 1 : -1;

    // Shield (facing outward)
    const shieldX = x + dir * 8;
    g.ellipse(shieldX, y - 8 + breathe, 6, 10).fill({ color: COL_SHIELD });
    g.ellipse(shieldX, y - 8 + breathe, 4, 8).stroke({
      color: COL_GOLD,
      width: 0.5,
    });
    g.circle(shieldX, y - 8 + breathe, 2).fill({ color: COL_GOLD });

    // Body / armor
    g.rect(x - 4, y - 20 + breathe, 8, 18).fill({ color: COL_ARMOR });
    g.rect(x - 4, y - 14 + breathe, 8, 2).fill({ color: COL_ARMOR_DK });

    // Belt
    g.rect(x - 5, y - 8 + breathe, 10, 2).fill({ color: COL_WOOD });

    // Head
    g.circle(x, y - 24 + breathe, 5).fill({ color: 0xd4a574 });

    // Helmet
    g.rect(x - 6, y - 30 + breathe, 12, 7).fill({ color: COL_ARMOR_DK });
    g.rect(x - 7, y - 24 + breathe, 14, 2).fill({ color: COL_ARMOR_DK });
    g.rect(x - 1, y - 28 + breathe, 2, 4).fill({ color: 0x333333 });

    // Eyes
    g.circle(x - 2, y - 24 + breathe, 0.8).fill({ color: 0x000000 });
    g.circle(x + 2, y - 24 + breathe, 0.8).fill({ color: 0x000000 });

    // Legs
    g.rect(x - 3, y + breathe, 3, 8).fill({ color: 0x3a3a3a });
    g.rect(x, y + breathe, 3, 8).fill({ color: 0x3a3a3a });

    // Spear
    const spearX = x + dir * 10;
    g.moveTo(spearX, y + 5)
      .lineTo(spearX, y - 35)
      .stroke({ color: COL_SPEAR, width: 2 });
    // Spear tip
    g.moveTo(spearX - 2, y - 38)
      .lineTo(spearX, y - 44)
      .lineTo(spearX + 2, y - 38)
      .closePath()
      .fill({ color: COL_SWORD });
  }

  // ── Banners ────────────────────────────────────────────────────────────

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Left banner
    this._drawBanner(g, 22, 40, time, COL_BANNER);
    // Right banner
    this._drawBanner(g, EW - 22, 40, time + 1.5, COL_BANNER_2);
  }

  private _drawBanner(
    g: Graphics,
    x: number,
    y: number,
    time: number,
    color: number,
  ): void {
    const wave = Math.sin(time * FLAG_WAVE) * 2;

    g.rect(x, y, 3, 14).fill({ color: COL_WOOD });

    g.moveTo(x + 3, y)
      .bezierCurveTo(x + 10 + wave, y + 2, x + 14 + wave, y + 8, x + 3, y + 16)
      .closePath()
      .fill({ color });
    g.stroke({ color: COL_GOLD_DK, width: 0.5 });
  }
}
