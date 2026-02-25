// Procedural mill renderer for BuildingView.
//
// Draws a fantasy medieval windmill (~1x2 tiles) with:
//   • Stone mill building with wooden door
//   • Four rotating windmill blades
//   • Farmer stacking hay in front
//   • His son helping
//   • Hay bales and pitchforks
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const MH = 2 * TS; // 128px tall

// Palette — rustic mill
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_ROOF = 0x8b4513;
const COL_ROOF_DK = 0x5a2d0a;
const COL_HAY = 0xd4a830;
const COL_HAY_DK = 0xb48820;

// Character palettes
const COL_SKIN = 0xf0c8a0;
const COL_SHIRT = 0x4488aa;
const COL_SHIRT_DK = 0x336688;
const COL_PANTS = 0x554433;
const COL_HAIR = 0x4a3020;
const COL_HAIR_LT = 0x6a5040;

// Animation timing
const MILL_BLADE_SPEED = 4.0;
const FARMER_WORK = 2.0;
const SON_WORK = 1.8;

// ---------------------------------------------------------------------------
// MillRenderer
// ---------------------------------------------------------------------------

export class MillRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _blades = new Graphics();
  private _farmer = new Graphics();
  private _son = new Graphics();
  private _hayBales = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBuilding();
    this._drawHayBales();

    this.container.addChild(this._building);
    this.container.addChild(this._blades);
    this.container.addChild(this._hayBales);
    this.container.addChild(this._farmer);
    this.container.addChild(this._son);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateBlades(this._time);
    this._updateFarmer(this._time);
    this._updateSon(this._time);
  }

  // ── Building ───────────────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    const bx = 10;
    const by = 45;
    const bw = 44;
    const bh = MH - 50;

    // Main stone building (circular mill)
    g.circle(bx + bw / 2, by + bh / 2, bw / 2).fill({ color: COL_STONE });
    g.circle(bx + bw / 2, by + bh / 2, bw / 2).stroke({
      color: COL_STONE_DK,
      width: 1.5,
    });

    // Stone brick pattern
    for (let row = 0; row < 5; row++) {
      const offset = (row % 2) * 8;
      for (let col = 0; col < 4; col++) {
        g.rect(bx + 4 + col * 11 + offset, by + 4 + row * 10, 9, 8)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.5 });
      }
    }

    // Wooden door (centered at bottom)
    const doorW = 14;
    const doorH = 22;
    g.rect(bx + bw / 2 - doorW / 2, by + bh - doorH - 4, doorW, doorH)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD, width: 1 });

    // Door cross pattern
    g.moveTo(bx + bw / 2 - doorW / 2 + 3, by + bh - doorH - 4)
      .lineTo(bx + bw / 2 + doorW / 2 - 3, by + bh - 4)
      .stroke({ color: COL_WOOD, width: 1 });
    g.moveTo(bx + bw / 2 + doorW / 2 - 3, by + bh - doorH - 4)
      .lineTo(bx + bw / 2 - doorW / 2 + 3, by + bh - 4)
      .stroke({ color: COL_WOOD, width: 1 });

    // Door frame
    g.rect(
      bx + bw / 2 - doorW / 2 - 2,
      by + bh - doorH - 6,
      doorW + 4,
      doorH + 6,
    ).stroke({ color: COL_STONE_DK, width: 1 });

    // Small window
    g.rect(bx + bw / 2 - 4, by + 20, 8, 10).fill({ color: 0x2a2a3e });
    g.rect(bx + bw / 2 - 5, by + 19, 10, 12).stroke({
      color: COL_STONE_DK,
      width: 0.5,
    });

    // Roof (conical top)
    g.moveTo(bx + bw / 2 - 2, by - 5)
      .lineTo(bx + bw / 2, by - 25)
      .lineTo(bx + bw / 2 + 2, by - 5)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });

    // Cap on top
    g.circle(bx + bw / 2, by - 25, 4).fill({ color: COL_WOOD });
  }

  // ── Windmill Blades ─────────────────────────────────────────────────────

  private _updateBlades(time: number): void {
    const g = this._blades;
    g.clear();

    const centerX = 32;
    const centerY = 45;

    // Blade hub
    g.circle(centerX, centerY, 5)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD, width: 1 });

    // Four blades
    const rotation = time * MILL_BLADE_SPEED;

    for (let i = 0; i < 4; i++) {
      const angle = rotation + (i * Math.PI) / 2;
      const bladeLen = 28;
      const bladeW = 8;

      // Blade frame
      const bx1 = centerX + Math.cos(angle) * 4;
      const by1 = centerY + Math.sin(angle) * 4;
      const bx2 = centerX + Math.cos(angle) * bladeLen;
      const by2 = centerY + Math.sin(angle) * bladeLen;

      // Perpendicular points for blade width
      const perpAngle = angle + Math.PI / 2;
      const wx = (Math.cos(perpAngle) * bladeW) / 2;
      const wy = (Math.sin(perpAngle) * bladeW) / 2;

      g.moveTo(bx1 - wx, by1 - wy)
        .lineTo(bx2 - wx, by2 - wy)
        .lineTo(bx2 + wx, by2 + wy)
        .lineTo(bx1 + wx, by1 + wy)
        .closePath()
        .fill({ color: COL_WOOD_LT })
        .stroke({ color: COL_WOOD, width: 0.5 });

      // Cloth sail on blade
      const sailIn = 6;
      const sailOut = bladeLen - 4;
      const sailW = bladeW - 2;
      const sailBx1 = centerX + Math.cos(angle) * sailIn;
      const sailBy1 = centerY + Math.sin(angle) * sailIn;
      const sailBx2 = centerX + Math.cos(angle) * sailOut;
      const sailBy2 = centerY + Math.sin(angle) * sailOut;
      const sailWx = (Math.cos(perpAngle) * sailW) / 2;
      const sailWy = (Math.sin(perpAngle) * sailW) / 2;

      g.moveTo(sailBx1 - sailWx * 0.5, sailBy1 - sailWy * 0.5)
        .lineTo(sailBx2 - sailWx * 0.5, sailBy2 - sailWy * 0.5)
        .lineTo(sailBx2 + sailWx * 0.5, sailBy2 + sailWy * 0.5)
        .lineTo(sailBx1 + sailWx * 0.5, sailBy1 + sailWy * 0.5)
        .closePath()
        .fill({ color: 0xf5f5dc });
    }

    // Center cap detail
    g.circle(centerX, centerY, 3).fill({ color: COL_WOOD });
  }

  // ── Hay Bales ────────────────────────────────────────────────────────────

  private _drawHayBales(): void {
    const g = this._hayBales;

    // Hay bale 1 (small)
    g.ellipse(8, MH - 12, 8, 6).fill({ color: COL_HAY });
    g.ellipse(8, MH - 12, 6, 4).fill({ color: COL_HAY_DK });

    // Hay bale 2 (medium)
    g.ellipse(50, MH - 8, 10, 7).fill({ color: COL_HAY });
    g.ellipse(50, MH - 8, 8, 5).fill({ color: COL_HAY_DK });

    // Hay pile (large, stacked)
    g.ellipse(28, MH - 6, 14, 8).fill({ color: COL_HAY });
    g.ellipse(25, MH - 10, 12, 7).fill({ color: COL_HAY });
    g.ellipse(30, MH - 14, 10, 6).fill({ color: COL_HAY_DK });
  }

  // ── Farmer ───────────────────────────────────────────────────────────────

  private _updateFarmer(time: number): void {
    const g = this._farmer;
    g.clear();

    const fx = 15;
    const fy = MH - 15;

    // Work animation
    const workCycle = (time * FARMER_WORK) % 1;
    const bend = Math.sin(workCycle * Math.PI) * 3;

    // Legs
    g.rect(fx - 4, fy - 4, 4, 8).fill({ color: COL_PANTS });
    g.rect(fx, fy - 4, 4, 8).fill({ color: COL_PANTS });

    // Body (bent forward slightly)
    g.rect(fx - 5, fy - 18 + bend, 10, 14).fill({ color: COL_SHIRT });
    g.rect(fx - 5, fy - 14, 10, 3).fill({ color: COL_SHIRT_DK });

    // Arms (reaching up to stack hay)
    const armReach = Math.sin(workCycle * Math.PI) * 4;
    g.rect(fx - 8, fy - 20 + bend + armReach, 4, 10).fill({ color: COL_SHIRT });
    g.rect(fx + 4, fy - 20 + bend - armReach, 4, 10).fill({ color: COL_SHIRT });

    // Head
    g.circle(fx, fy - 24 + bend, 6).fill({ color: COL_SKIN });

    // Hair
    g.circle(fx, fy - 28 + bend, 5).fill({ color: COL_HAIR });

    // Hat
    g.rect(fx - 7, fy - 30 + bend, 14, 3).fill({ color: COL_HAIR_LT });
    g.rect(fx - 4, fy - 34 + bend, 8, 5).fill({ color: COL_HAIR_LT });

    // Pitchfork in hand
    const forkX = fx - 10;
    const forkY = fy - 25 + bend + armReach;
    g.moveTo(forkX, forkY)
      .lineTo(forkX, forkY - 15)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(forkX - 3, forkY - 15)
      .lineTo(forkX, forkY - 12)
      .lineTo(forkX + 3, forkY - 15)
      .stroke({ color: 0x666666, width: 1 });
  }

  // ── Son ─────────────────────────────────────────────────────────────────

  private _updateSon(time: number): void {
    const g = this._son;
    g.clear();

    const sx = 45;
    const sy = MH - 12;

    // Work animation (slightly different timing)
    const workCycle = (time * SON_WORK + 0.5) % 1;
    const bend = Math.sin(workCycle * Math.PI) * 2;

    // Smaller body
    // Legs
    g.rect(sx - 3, sy - 3, 3, 6).fill({ color: 0x665544 });
    g.rect(sx, sy - 3, 3, 6).fill({ color: 0x665544 });

    // Body
    g.rect(sx - 4, sy - 14 + bend, 8, 11).fill({ color: 0x88aacc });

    // Arms (helping)
    const armReach = Math.sin(workCycle * Math.PI) * 3;
    g.rect(sx - 6, sy - 16 + bend + armReach, 3, 8).fill({ color: 0x88aacc });
    g.rect(sx + 3, sy - 16 + bend - armReach, 3, 8).fill({ color: 0x88aacc });

    // Head (smaller)
    g.circle(sx, sy - 19 + bend, 5).fill({ color: COL_SKIN });

    // Hair (lighter, child)
    g.circle(sx, sy - 23 + bend, 4).fill({ color: COL_HAIR_LT });

    // Small hat
    g.rect(sx - 5, sy - 25 + bend, 10, 2).fill({ color: COL_HAIR_LT });

    // Holding small pitchfork
    const forkX = sx + 8;
    const forkY = sy - 15 + bend - armReach;
    g.moveTo(forkX, forkY)
      .lineTo(forkX, forkY - 10)
      .stroke({ color: COL_WOOD, width: 1 });
    g.moveTo(forkX - 2, forkY - 10)
      .lineTo(forkX, forkY - 8)
      .lineTo(forkX + 2, forkY - 10)
      .stroke({ color: 0x666666, width: 0.8 });
  }
}
