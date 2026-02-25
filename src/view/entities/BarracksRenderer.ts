// Procedural barracks renderer for BuildingView.
//
// Draws a medieval fantasy barracks (~2x2 tiles) with:
//   • Stone building with small smithy opening (smaller than siege workshop)
//   • Guardhouse with guard
//   • Tower with flag
//   • Arrow slits similar to castle
//   • Stone brick pattern
//   • Waving banners
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const BW = 2 * TS; // 128px wide
const BH = 2 * TS; // 128px tall

// Palette — stone & medieval
const COL_STONE = 0x6b6560;
const COL_STONE_DK = 0x4a4540;
const COL_STONE_LT = 0x8b8580;
const COL_STONE_MORTAR = 0x555048;
const COL_ROOF = 0x3d2817;
const COL_ROOF_DK = 0x2a1a0f;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_IRON = 0x444444;
const COL_FIRE = 0xff4400;
const COL_FIRE_CORE = 0xffff44;

// Character palettes
const COL_SKIN = 0xd4a574;
const COL_HAIR = 0x3a2510;
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_SWORD = 0xcccccc;
const COL_HELMET = 0x777788;

// Banner
const COL_BANNER = 0xcc3344;
const COL_BANNER_2 = 0x3388cc;

// Animation timing
const HAMMER_SPEED = 3.5;
const FIRE_FLICKER = 8.0;
const GUARD_BREATHE = 2.0;
const FLAG_WAVE = 3.0;

// ---------------------------------------------------------------------------
// BarracksRenderer
// ---------------------------------------------------------------------------

export class BarracksRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _smither = new Graphics();
  private _guard = new Graphics();
  private _tower = new Graphics();
  private _roof = new Graphics();
  private _flag = new Graphics();
  private _banners = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBuilding();
    this._drawTower();
    this._drawRoof();

    this.container.addChild(this._building);
    this.container.addChild(this._smither);
    this.container.addChild(this._guard);
    this.container.addChild(this._tower);
    this.container.addChild(this._roof);
    this.container.addChild(this._flag);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateSmither(this._time);
    this._updateGuard(this._time);
    this._updateFlag(this._time);
    this._updateBanners(this._time);
  }

  // ── Building ────────────────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    // Ground
    g.rect(0, BH - 6, BW, 6).fill({ color: COL_STONE_DK });

    // Main walls - stone building similar to castle
    const wallY = 25;
    const wallH = BH - wallY - 10;

    // Left wall
    g.rect(0, wallY, 18, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Right wall
    g.rect(BW - 18, wallY, 18, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Back wall (visible through small opening)
    g.rect(18, wallY + 10, BW - 36, wallH - 10)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_MORTAR, width: 1 });

    // Stone brick pattern on walls
    this._drawBrickPattern(g, 2, wallY + 2, 14, wallH - 4, 0);
    this._drawBrickPattern(g, BW - 16, wallY + 2, 14, wallH - 4, 1);

    // Arrow slits on left wall (like castle)
    g.rect(6, wallY + 30, 2, 12).fill({ color: 0x1a1a2e });
    g.rect(6, wallY + 55, 2, 12).fill({ color: 0x1a1a2e });

    // Arrow slits on right wall (like castle)
    g.rect(BW - 8, wallY + 30, 2, 12).fill({ color: 0x1a1a2e });
    g.rect(BW - 8, wallY + 55, 2, 12).fill({ color: 0x1a1a2e });

    // Small smithy opening (much smaller than siege workshop - focus is on barracks)
    const openingW = 28;
    const openingH = 35;
    const openingX = BW / 2 - openingW / 2;
    const openingY = BH - openingH - 8;

    // Opening frame
    g.rect(openingX - 2, openingY - 2, openingW + 4, openingH + 4)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Black background for smithy interior
    g.rect(openingX, openingY, openingW, openingH).fill({ color: 0x1a1510 });

    // Wooden lintel
    g.rect(openingX - 4, openingY - 6, openingW + 8, 6).fill({
      color: COL_WOOD_DK,
    });

    // Support beam for roof
    g.rect(0, 18, BW, 8).fill({ color: COL_WOOD_DK });
    g.rect(0, 18, BW, 3).fill({ color: COL_WOOD });

    // Crenellations on main wall
    const merlonW = 10,
      merlonH = 6,
      gap = 8;
    for (let mx = 20; mx < BW - 20 - merlonW; mx += merlonW + gap) {
      g.rect(mx, wallY - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }
  }

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    offset: number,
  ): void {
    for (let row = 0; row < h / 12; row++) {
      const rowOffset = (row % 2) * 6 + offset * 8;
      for (let col = 0; col < w / 12; col++) {
        g.rect(x + col * 12 + rowOffset, y + row * 12, 10, 10)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_MORTAR, width: 0.3, alpha: 0.4 });
      }
    }
  }

  // ── Tower ─────────────────────────────────────────────────────────────────

  private _drawTower(): void {
    const g = this._tower;
    const towerW = 24;
    const towerH = BH - 15;
    const towerX = BW - towerW - 5;
    const towerY = 8;

    // Tower base
    g.rect(towerX, towerY, towerW, towerH)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Brick pattern on tower
    this._drawBrickPattern(
      g,
      towerX + 2,
      towerY + 2,
      towerW - 4,
      towerH - 4,
      0,
    );

    // Tower roof
    g.moveTo(towerX - 4, towerY)
      .lineTo(towerX + towerW / 2, towerY - 20)
      .lineTo(towerX + towerW + 4, towerY)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });

    // Crenellations
    for (let i = 0; i < 3; i++) {
      g.rect(towerX + 2 + i * 8, towerY - 8, 6, 6)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }

    // Window in tower
    g.rect(towerX + towerW / 2 - 6, towerY + 30, 12, 16).fill({
      color: 0x1a1a2e,
    });
    g.rect(towerX + towerW / 2 - 8, towerY + 28, 16, 20).fill({
      color: COL_STONE_DK,
    });
  }

  // ── Roof ───────────────────────────────────────────────────────────────────

  private _drawRoof(): void {
    const g = this._roof;

    // Main roof section
    g.moveTo(-5, 25)
      .lineTo(BW / 2, 5)
      .lineTo(BW + 5, 25)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });

    // Roof beams
    g.rect(BW / 2 - 3, 8, 6, 18).fill({ color: COL_WOOD_DK });
  }

  // ── Smither (Blacksmith) ─────────────────────────────────────────────────

  private _updateSmither(time: number): void {
    const g = this._smither;
    g.clear();

    const openingX = BW / 2 - 14;
    const openingY = BH - 35;

    // Forge fire (small)
    const fireFlicker =
      Math.sin(time * FIRE_FLICKER) * 2 + Math.sin(time * 7) * 1;
    g.ellipse(openingX + 8, openingY + 28, 8 + fireFlicker, 4).fill({
      color: COL_FIRE,
    });
    g.ellipse(openingX + 8, openingY + 28, 4, 2).fill({ color: COL_FIRE_CORE });

    // Anvil
    g.rect(openingX + 18, openingY + 20, 8, 10).fill({ color: COL_IRON });
    g.rect(openingX + 17, openingY + 18, 10, 3).fill({ color: COL_STONE_DK });

    // Hammer animation
    const hammerCycle = (time * HAMMER_SPEED) % 1;
    let hammerOffset = 0;
    if (hammerCycle < 0.6) {
      const swingProgress = hammerCycle / 0.6;
      hammerOffset = Math.sin(swingProgress * Math.PI) * 6;
    }

    // Small blacksmith figure
    const bx = openingX + 10;
    const by = openingY + 25;

    // Body
    g.ellipse(bx, by, 5, 7).fill({ color: 0x4a3020 });

    // Head
    g.circle(bx, by - 10, 4).fill({ color: COL_SKIN });

    // Hair
    g.circle(bx, by - 13, 3).fill({ color: COL_HAIR });

    // Arm with hammer
    g.moveTo(bx + 3, by - 8)
      .lineTo(bx + 8, by - 10 + hammerOffset)
      .stroke({ color: COL_SKIN, width: 2 });

    // Hammer
    g.rect(bx + 7, by - 14 + hammerOffset, 6, 4).fill({ color: COL_IRON });
    g.rect(bx + 9, by - 12 + hammerOffset, 2, 6).fill({ color: COL_WOOD });
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  private _updateGuard(time: number): void {
    const g = this._guard;
    g.clear();

    const guardX = 35;
    const guardY = BH - 18;

    // Breathe animation
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.5;

    // Shield (left side)
    g.ellipse(guardX - 8, guardY + breathe - 5, 5, 8)
      .fill({ color: COL_ARMOR_DK })
      .stroke({ color: COL_ARMOR, width: 0.5 });

    // Body
    g.rect(guardX - 4, guardY - 18 + breathe, 8, 18)
      .fill({ color: COL_ARMOR })
      .stroke({ color: COL_ARMOR_DK, width: 0.5 });

    // Belt
    g.rect(guardX - 5, guardY - 8 + breathe, 10, 2).fill({
      color: COL_WOOD_DK,
    });

    // Head
    g.circle(guardX, guardY - 22 + breathe, 5).fill({ color: COL_SKIN });

    // Helmet
    g.rect(guardX - 6, guardY - 28 + breathe, 12, 7).fill({
      color: COL_HELMET,
    });
    g.rect(guardX - 7, guardY - 22 + breathe, 14, 2).fill({
      color: COL_HELMET,
    });

    // Eyes
    g.circle(guardX - 2, guardY - 22 + breathe, 0.8).fill({ color: 0x000000 });
    g.circle(guardX + 2, guardY - 22 + breathe, 0.8).fill({ color: 0x000000 });

    // Sword arm
    g.rect(guardX + 2, guardY - 16 + breathe, 10, 3).fill({ color: COL_ARMOR });
    g.rect(guardX + 10, guardY - 18 + breathe, 2, 8).fill({ color: COL_SKIN });

    // Sword
    g.rect(guardX + 10, guardY - 26 + breathe, 2, 10).fill({
      color: COL_SWORD,
    });
    g.rect(guardX + 9, guardY - 17 + breathe, 4, 2).fill({ color: COL_SWORD });

    // Legs
    g.rect(guardX - 3, guardY + breathe, 3, 8).fill({ color: 0x3a3a3a });
    g.rect(guardX, guardY + breathe, 3, 8).fill({ color: 0x3a3a3a });

    // Spear
    g.moveTo(guardX + 15, guardY + 5)
      .lineTo(guardX + 15, guardY - 35)
      .stroke({ color: COL_WOOD_DK, width: 2 });
    g.moveTo(guardX + 15, guardY - 38)
      .lineTo(guardX + 13, guardY - 35)
      .lineTo(guardX + 17, guardY - 35)
      .closePath()
      .fill({ color: COL_SWORD });
  }

  // ── Flag ───────────────────────────────────────────────────────────────────

  private _updateFlag(time: number): void {
    const g = this._flag;
    g.clear();

    const flagX = BW - 15;
    const flagY = 8 - 20 - 2;

    g.moveTo(flagX, flagY)
      .lineTo(flagX, flagY - 16)
      .stroke({ color: 0x666666, width: 2 });

    const w1 = Math.sin(time) * 2;
    const w2 = Math.sin(time * 1.3 + 1) * 3;
    const w3 = Math.sin(time * 0.9 + 2) * 2;
    g.moveTo(flagX, flagY - 16)
      .bezierCurveTo(
        flagX + 8,
        flagY - 16 + w1,
        flagX + 14,
        flagY - 16 + w2,
        flagX + 20,
        flagY - 16 + w3,
      )
      .lineTo(flagX + 20, flagY - 4 + w3)
      .bezierCurveTo(
        flagX + 14,
        flagY - 4 + w2,
        flagX + 8,
        flagY - 4 + w1,
        flagX,
        flagY - 4,
      )
      .closePath()
      .fill({ color: COL_BANNER })
      .stroke({ color: 0xaa2233, width: 0.5 });
  }

  // ── Banners ───────────────────────────────────────────────────────────────

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Banner on left side
    const bannerX = 12;
    const bannerY = 28;
    const wave = Math.sin(time * FLAG_WAVE) * 2;

    g.rect(bannerX, bannerY, 3, 15).fill({ color: COL_WOOD });
    g.moveTo(bannerX + 3, bannerY)
      .bezierCurveTo(
        bannerX + 10 + wave,
        bannerY + 2,
        bannerX + 12 + wave,
        bannerY + 8,
        bannerX + 3,
        bannerY + 14,
      )
      .closePath()
      .fill({ color: COL_BANNER_2 });
  }
}
