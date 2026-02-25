// Procedural hamlet renderer for BuildingView.
//
// Draws a cozy medieval hamlet (~2x2 tiles) with:
//   • Multiple small thatched cottages
//   • A small inn/tavern with sign
//   • A village well in the center
//   • Chickens pecking around
//   • A merchant at a market stall
//   • Villagers chatting
//   • Smoke rising from chimneys
//
// Animations driven by `tick(dt)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const HW = 2 * TS; // 128px wide
const HH = 2 * TS; // 128px tall

// Palette
const COL_THATCH = 0xc4a35a;
const COL_THATCH_DK = 0x9a7a3a;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STUCCO = 0xd4c4a4;
const COL_PAVEMENT = 0x9a9688;
const COL_GRASS = 0x4a6a3a;

// Inn sign
const COL_SIGN = 0x8b4513;
const COL_SIGN_TEXT = 0xffd700;

// Character colors
const COL_SKIN = 0xf0c8a0;
const COL_HAIR = 0x4a3020;
const COL_CLOTH1 = 0x4466aa;
const COL_CLOTH2 = 0xaa4444;
const COL_CLOTH3 = 0x44aa44;
const COL_CHICKEN = 0xffffff;
const COL_CHICKEN_BEAK = 0xffaa00;

// Animation timing
const SMOKE_SPEED = 1.5;
const CHICKEN_PECK = 2.5;
const VILLAGER_BOB = 1.8;

// ---------------------------------------------------------------------------
// HamletRenderer
// ---------------------------------------------------------------------------

export class HamletRenderer {
  readonly container = new Container();

  private _ground = new Graphics();
  private _buildings = new Graphics();
  private _innSign = new Graphics();
  private _well = new Graphics();
  private _market = new Graphics();
  private _villagers = new Graphics();
  private _chickens = new Graphics();
  private _smoke = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawGround();
    this._drawBuildings();
    this._drawWell();
    this._drawMarket();

    this.container.addChild(this._ground);
    this.container.addChild(this._buildings);
    this.container.addChild(this._innSign);
    this.container.addChild(this._well);
    this.container.addChild(this._market);
    this.container.addChild(this._chickens);
    this.container.addChild(this._villagers);
    this.container.addChild(this._smoke);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateSmoke(this._time);
    this._updateChickens(this._time);
    this._updateVillagers(this._time);
    this._updateSign(this._time);
  }

  // ── Ground ───────────────────────────────────────────────────────────────

  private _drawGround(): void {
    const g = this._ground;

    // Main grass area
    g.rect(0, HH - 10, HW, 10).fill({ color: COL_GRASS });

    // Stone path (winding through)
    g.moveTo(30, HH)
      .lineTo(40, HH - 20)
      .lineTo(50, HH - 10)
      .lineTo(45, HH)
      .fill({ color: COL_PAVEMENT });
    g.moveTo(80, HH)
      .lineTo(90, HH - 25)
      .lineTo(100, HH - 15)
      .lineTo(95, HH)
      .fill({ color: COL_PAVEMENT });

    // Central paved area around well
    g.ellipse(64, HH - 50, 25, 15).fill({ color: COL_PAVEMENT });
  }

  // ── Buildings ────────────────────────────────────────────────────────────

  private _drawBuildings(): void {
    const g = this._buildings;

    // Cottage 1 (left back)
    this._drawCottage(g, 8, 35, 28, 35);

    // Cottage 2 (right back)
    this._drawCottage(g, 90, 38, 26, 32);

    // Inn/Tavern (center back - larger)
    this._drawInn(g, 40, 25, 48, 45);
  }

  private _drawCottage(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Walls (stucco/wood)
    g.rect(x, y, w, h)
      .fill({ color: COL_STUCCO })
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // Wooden beams
    g.rect(x + 3, y, 2, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 5, y, 2, h).fill({ color: COL_WOOD_DK });

    // Door
    const doorW = 8;
    g.rect(x + w / 2 - doorW / 2, y + h - 18, doorW, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Window
    g.rect(x + 4, y + 8, 8, 8)
      .fill({ color: 0x2a2a3e })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(x + w - 12, y + 8, 8, 8)
      .fill({ color: 0x2a2a3e })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Thatched roof
    g.moveTo(x - 4, y)
      .quadraticCurveTo(x + w / 2, y - 15, x + w + 4, y)
      .closePath()
      .fill({ color: COL_THATCH })
      .stroke({ color: COL_THATCH_DK, width: 1 });

    // Chimney
    g.rect(x + w - 12, y - 15, 6, 12).fill({ color: COL_STONE_DK });
  }

  private _drawInn(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Larger walls
    g.rect(x, y, w, h)
      .fill({ color: COL_STUCCO })
      .stroke({ color: COL_WOOD_DK, width: 1.5 });

    // Wooden beams (more prominent)
    g.rect(x + 5, y, 3, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w / 2 - 2, y, 4, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 8, y, 3, h).fill({ color: COL_WOOD_DK });

    // Large door (tavern entrance)
    g.rect(x + w / 2 - 10, y + h - 25, 20, 25)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // Windows with shutters
    g.rect(x + 6, y + 12, 12, 14)
      .fill({ color: 0x2a2a3e })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(x + w - 18, y + 12, 12, 14)
      .fill({ color: 0x2a2a3e })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Shutter lines
    g.moveTo(x + 6, y + 12)
      .lineTo(x + 18, y + 26)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.moveTo(x + w - 18, y + 12)
      .lineTo(x + w - 6, y + 26)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Better roof
    g.moveTo(x - 5, y)
      .quadraticCurveTo(x + w / 2, y - 20, x + w + 5, y)
      .closePath()
      .fill({ color: COL_THATCH })
      .stroke({ color: COL_THATCH_DK, width: 1 });

    // Chimney with smoke (larger)
    g.rect(x + w - 15, y - 18, 8, 16).fill({ color: COL_STONE_DK });

    // Inn sign bracket (will be animated)
    g.rect(x - 8, y + 20, 3, 20).fill({ color: COL_WOOD });
  }

  // ── Inn Sign ───────────────────────────────────────────────────────────

  private _drawWell(): void {
    const g = this._well;

    // Well base (stone)
    g.ellipse(64, HH - 50, 12, 6).fill({ color: COL_STONE });
    g.ellipse(64, HH - 50, 10, 5).fill({ color: COL_STONE_DK });

    // Well posts
    g.rect(56, HH - 70, 3, 22).fill({ color: COL_WOOD });
    g.rect(69, HH - 70, 3, 22).fill({ color: COL_WOOD });

    // Roof over well
    g.moveTo(52, HH - 72)
      .lineTo(64, HH - 85)
      .lineTo(76, HH - 72)
      .closePath()
      .fill({ color: COL_THATCH });

    // Bucket
    g.rect(61, HH - 65, 6, 8).fill({ color: COL_WOOD });
  }

  private _updateSign(_time: number): void {
    const g = this._innSign;
    g.clear();

    const signX = 32;
    const signY = 55;

    g.rect(signX - 1, signY, 3, 18).fill({ color: COL_WOOD });

    // Sign board
    g.rect(signX, signY, 24, 14)
      .fill({ color: COL_SIGN })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Simple "INN" text representation
    g.moveTo(signX + 4, signY + 4)
      .lineTo(signX + 4, signY + 10)
      .stroke({ color: COL_SIGN_TEXT, width: 1.5 });
    g.moveTo(signX + 6, signY + 4)
      .lineTo(signX + 10, signY + 4)
      .lineTo(signX + 8, signY + 10)
      .closePath()
      .fill({ color: COL_SIGN_TEXT });
    g.moveTo(signX + 12, signY + 4)
      .lineTo(signX + 12, signY + 10)
      .lineTo(signX + 16, signY + 10)
      .stroke({ color: COL_SIGN_TEXT, width: 1.5 });
    g.moveTo(signX + 14, signY + 4)
      .lineTo(signX + 18, signY + 10)
      .stroke({ color: COL_SIGN_TEXT, width: 1.5 });
  }

  // ── Market Stall ───────────────────────────────────────────────────────

  private _drawMarket(): void {
    const g = this._market;

    const mx = 95;
    const my = HH - 35;

    // Stall structure
    g.rect(mx, my, 25, 20).fill({ color: COL_WOOD });
    g.rect(mx + 2, my - 15, 21, 15).fill({ color: COL_WOOD_LT || COL_WOOD });

    // Awning (striped)
    g.rect(mx, my - 18, 25, 4).fill({ color: COL_CLOTH1 });
    g.rect(mx, my - 14, 25, 4).fill({ color: COL_CLOTH2 });
    g.rect(mx, my - 10, 25, 4).fill({ color: COL_CLOTH1 });

    // Goods on display
    g.circle(mx + 6, my + 5, 4).fill({ color: 0xaa4444 }); // apples
    g.circle(mx + 12, my + 5, 4).fill({ color: 0x44aa44 }); // pears
    g.circle(mx + 18, my + 5, 4).fill({ color: 0xaaaa44 }); // cheese
  }

  // ── Smoke ───────────────────────────────────────────────────────────────

  private _updateSmoke(time: number): void {
    const g = this._smoke;
    g.clear();

    // Smoke from inn chimney
    const baseX = 85;
    const baseY = 10;

    for (let i = 0; i < 3; i++) {
      const offset = (time * SMOKE_SPEED + i * 0.8) % 3;
      const sx = baseX + Math.sin(time * 2 + i) * (3 + offset);
      const sy = baseY - offset * 8 - i * 5;
      const size = 3 + offset * 1.5;

      g.circle(sx, sy, size).fill({
        color: 0xaaaaaa,
        alpha: 0.4 - offset * 0.1,
      });
    }
  }

  // ── Chickens ───────────────────────────────────────────────────────────

  private _updateChickens(time: number): void {
    const g = this._chickens;
    g.clear();

    // Chicken 1
    const c1x = 20 + Math.sin(time * 0.5) * 5;
    const c1y = HH - 8;
    this._drawChicken(g, c1x, c1y, time);

    // Chicken 2
    const c2x = 50 + Math.sin(time * 0.7 + 1) * 4;
    const c2y = HH - 12;
    this._drawChicken(g, c2x, c2y, time + 1);

    // Chicken 3 (near market)
    const c3x = 105 + Math.sin(time * 0.4 + 2) * 3;
    const c3y = HH - 8;
    this._drawChicken(g, c3x, c3y, time + 2);
  }

  private _drawChicken(g: Graphics, x: number, y: number, time: number): void {
    const peck = Math.sin(time * CHICKEN_PECK) > 0.8 ? 2 : 0;

    // Body
    g.ellipse(x, y, 5, 4).fill({ color: COL_CHICKEN });

    // Head
    g.circle(x - 4, y - 3 + peck * 0.5, 2.5).fill({ color: COL_CHICKEN });

    // Beak
    g.moveTo(x - 6, y - 3 + peck * 0.5)
      .lineTo(x - 8, y - 2 + peck)
      .lineTo(x - 6, y - 1 + peck * 0.5)
      .closePath()
      .fill({ color: COL_CHICKEN_BEAK });

    // Comb (red thing on head)
    g.circle(x - 4, y - 5 + peck * 0.5, 1).fill({ color: 0xff0000 });

    // Legs
    g.moveTo(x - 2, y + 3)
      .lineTo(x - 2, y + 6)
      .stroke({ color: 0xffaa00, width: 0.5 });
    g.moveTo(x + 2, y + 3)
      .lineTo(x + 2, y + 6)
      .stroke({ color: 0xffaa00, width: 0.5 });
  }

  // ── Villagers ───────────────────────────────────────────────────────────

  private _updateVillagers(time: number): void {
    const g = this._villagers;
    g.clear();

    // Villager 1 (near well)
    const v1x = 55;
    const v1y = HH - 25;
    const bob1 = Math.sin(time * VILLAGER_BOB) * 0.5;
    this._drawVillager(g, v1x, v1y + bob1, COL_CLOTH1, false);

    // Villager 2 (chatting)
    const v2x = 75;
    const v2y = HH - 28;
    const bob2 = Math.sin(time * VILLAGER_BOB + 1) * 0.5;
    this._drawVillager(g, v2x, v2y + bob2, COL_CLOTH2, true);

    // Merchant at market
    const mx = 100;
    const my = HH - 30;
    this._drawMerchant(g, mx, my, time);
  }

  private _drawVillager(
    g: Graphics,
    x: number,
    y: number,
    clothColor: number,
    hasHat: boolean,
  ): void {
    // Body
    g.rect(x - 3, y - 10, 6, 10).fill({ color: clothColor });

    // Head
    g.circle(x, y - 14, 3).fill({ color: COL_SKIN });

    // Hair
    g.circle(x, y - 16, 3).fill({ color: COL_HAIR });

    // Hat (optional)
    if (hasHat) {
      g.rect(x - 4, y - 19, 8, 2).fill({ color: 0x4a3020 });
      g.rect(x - 2, y - 22, 4, 3).fill({ color: 0x4a3020 });
    }

    // Legs
    g.rect(x - 2, y, 2, 5).fill({ color: 0x554433 });
    g.rect(x, y, 2, 5).fill({ color: 0x554433 });
  }

  private _drawMerchant(g: Graphics, x: number, y: number, time: number): void {
    const bob = Math.sin(time * VILLAGER_BOB + 2) * 0.5;

    // Body (fancy vest)
    g.rect(x - 4, y - 12 + bob, 8, 12).fill({ color: COL_CLOTH3 });
    g.rect(x - 2, y - 10 + bob, 4, 3).fill({ color: COL_SIGN_TEXT }); // gold trim

    // Head
    g.circle(x, y - 16 + bob, 4).fill({ color: COL_SKIN });

    // Cap
    g.rect(x - 4, y - 20 + bob, 8, 3).fill({ color: 0x4a3020 });

    // Legs
    g.rect(x - 2, y + bob, 2, 6).fill({ color: 0x554433 });
    g.rect(x, y + bob, 2, 6).fill({ color: 0x554433 });

    // Arms (gesturing)
    const wave = Math.sin(time * 2) * 2;
    g.rect(x + 3, y - 10 + bob + wave, 6, 2).fill({ color: COL_SKIN });
  }
}
