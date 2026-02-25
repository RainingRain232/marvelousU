// Archery range renderer for BuildingView.
//
// Draws a medieval fantasy archery range (~2x2 tiles) with:
//   • Tower and buildings to the left side
//   • Archery range with targets on the right side
//   • 2 archers shooting arrows at targets
//   • Ownership banner on the tower
//   • Medieval fantasy style
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
// const TW = 2 * TS;   // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — medieval archery range
const COL_STONE = 0x8b7d6b;
const COL_STONE_DK = 0x5a4a3a;
const COL_WOOD = 0x60451e;
const COL_WOOD_DK = 0x402510;
// const COL_WOOD_LT = 0x8b6014;
const COL_ROOF = 0x4a3018;
const COL_ROOF_DK = 0x2a1008;
// const COL_BANNER = 0x8b4513;
const COL_BANNER_LT = 0xc8512e;
const COL_ARROW_SHAFT = 0x8b6914;
const COL_ARROW_FLETCH = 0x006400;

// Animation timing
const FLAG_SPEED = 2.5;
// const ARCHER_SPEED = 1.0;
const ARROW_SPEED = 3.0;
const TARGET_RECOIL = 0.15;

// ---------------------------------------------------------------------------
// ArcheryRangeRenderer
// ---------------------------------------------------------------------------

export class ArcheryRangeRenderer {
  readonly container = new Container();

  private _tower = new Graphics();
  private _range = new Graphics();
  private _flag = new Graphics();
  private _target1 = new Graphics();
  private _target2 = new Graphics();
  private _archer1 = new Graphics();
  private _archer2 = new Graphics();
  private _arrows = new Graphics();

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawTower();
    this._drawRange();
    this._drawTargets();
    this._drawArchers();
    this._drawFlag();

    this.container.addChild(this._tower);
    this.container.addChild(this._range);
    this.container.addChild(this._flag);
    this.container.addChild(this._target1);
    this.container.addChild(this._target2);
    this.container.addChild(this._archer1);
    this.container.addChild(this._archer2);
    this.container.addChild(this._arrows);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // Update flag
    this._updateFlag(this._time);

    // Update archers and arrows
    this._updateArchers(this._time);
  }

  // ── Tower ────────────────────────────────────────────────────────────────

  private _drawTower(): void {
    const g = this._tower;

    // Tower base
    g.rect(0, 0, TS, TH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Roof
    g.moveTo(TS, 0)
      .lineTo(TS / 2, -TS / 3)
      .lineTo(0, 0)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 2 });

    // Windows
    g.rect(TS / 4, TH / 3, TS / 2, TH / 3)
      .fill({ color: 0x1a1a2e })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(TS / 4, (TH * 2) / 3, TS / 2, TH / 6)
      .fill({ color: 0x1a1a2e })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Decorative window frames like castle
    g.rect(TS / 4 - 1, TH / 3 - 1, TS / 2 + 2, TH / 3 + 2).stroke({
      color: COL_STONE_DK,
      width: 1,
      alpha: 0.7,
    });
    g.rect(TS / 4 - 1, (TH * 2) / 3 - 1, TS / 2 + 2, TH / 6 + 2).stroke({
      color: COL_STONE_DK,
      width: 1,
      alpha: 0.7,
    });
    // Additional window below top and above middle
    g.rect(TS / 4, TH / 8, TS / 2, TH / 6)
      .fill({ color: 0x1a1a2e })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(TS / 4 - 1, TH / 8 - 1, TS / 2 + 2, TH / 6 + 2).stroke({
      color: COL_STONE_DK,
      width: 1,
      alpha: 0.7,
    });
    g.rect(TS / 4 - 1, (TH * 2) / 3 - 1, TS / 2 + 2, TH / 6 + 2).stroke({
      color: COL_STONE_DK,
      width: 1,
      alpha: 0.7,
    });

    // Door
    g.rect(TS / 3, TH - TS / 2, TS / 3, TS / 2)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 2 });
  }

  // ── Archery Range ─────────────────────────────────────────────────────────

  private _drawRange(): void {
    const g = this._range;

    // Shooting lane
    g.rect(TS, 0, TS, TH)
      .fill({ color: 0x90ee90 })
      .stroke({ color: COL_WOOD, width: 2 });

    // Ground texture
    for (let i = 0; i < 4; i++) {
      g.moveTo(TS + (i * TS) / 4, 0)
        .lineTo(TS + (i * TS) / 4, TH)
        .stroke({ color: COL_WOOD_DK, width: 0.5, alpha: 0.3 });
    }
  }

  // ── Targets ──────────────────────────────────────────────────────────────

  private _drawTargets(): void {
    this._drawTarget(this._target1, TS + 50, TH / 4);
    this._drawTarget(this._target2, TS + 50, (TH * 3) / 4);
  }

  private _drawTarget(g: Graphics, x: number, y: number): void {
    g.clear();

    // Target post
    g.rect(x - 2, y - 20, 4, 40)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // Traditional archery target: white, black, blue, red, gold (center)
    // Outer white ring
    g.circle(x, y, 18)
      .fill({ color: 0xffffff })
      .stroke({ color: 0xcccccc, width: 1 });
    // Black ring
    g.circle(x, y, 14)
      .fill({ color: 0x1a1a1a })
      .stroke({ color: 0x000000, width: 0.5 });
    // Blue ring
    g.circle(x, y, 10)
      .fill({ color: 0x2255aa })
      .stroke({ color: 0x1144aa, width: 0.5 });
    // Red ring
    g.circle(x, y, 6)
      .fill({ color: 0xcc2222 })
      .stroke({ color: 0xaa1111, width: 0.5 });
    // Gold center (bullseye)
    g.circle(x, y, 2).fill({ color: 0xffdd00 });
  }

  // ── Archers ──────────────────────────────────────────────────────────────

  private _drawArchers(): void {
    this._drawArcher(this._archer1, TS + 10, TH / 4);
    this._drawArcher(this._archer2, TS + 10, (TH * 3) / 4);
  }

  private _drawArcher(
    g: Graphics,
    x: number,
    y: number,
    bowDraw: number = 0,
  ): void {
    g.clear();

    // Legs
    g.rect(x - 4, y - 2, 3, 14)
      .fill({ color: 0x3d2817 })
      .stroke({ color: 0x2a1a0f, width: 0.5 });
    g.rect(x + 1, y - 2, 3, 14)
      .fill({ color: 0x3d2817 })
      .stroke({ color: 0x2a1a0f, width: 0.5 });

    // Boots
    g.rect(x - 5, y + 10, 5, 4).fill({ color: 0x2a1a0f });
    g.rect(x + 1, y + 10, 5, 4).fill({ color: 0x2a1a0f });

    // Torso / tunic
    g.ellipse(x, y - 10, 7, 10)
      .fill({ color: 0x4a7c3f })
      .stroke({ color: 0x3a5c2f, width: 0.5 });

    // Belt
    g.rect(x - 7, y - 4, 14, 2).fill({ color: 0x5a3a1a });

    // Belt buckle
    g.rect(x - 2, y - 5, 4, 3).fill({ color: 0xc9a227 });

    // Arms - holding bow in front
    g.rect(x + 2, y - 12, 10, 3)
      .fill({ color: 0x4a7c3f })
      .stroke({ color: 0x3a5c2f, width: 0.5 });
    g.rect(x + 9, y - 9, 3, 6).fill({ color: 0xf0c8a0 });

    // Head
    g.circle(x, y - 18, 5)
      .fill({ color: 0xf0c8a0 })
      .stroke({ color: 0xd4a574, width: 0.5 });

    // Hair
    g.circle(x, y - 20, 4).fill({ color: 0x4a3020 });

    // Hood
    g.moveTo(x - 6, y - 18)
      .quadraticCurveTo(x - 7, y - 24, x, y - 25)
      .quadraticCurveTo(x + 7, y - 24, x + 6, y - 18)
      .fill({ color: 0x3a5c2f, alpha: 0.8 });

    // Face details
    g.circle(x - 2, y - 18, 0.8).fill({ color: 0x2a1a0f });
    g.circle(x + 2, y - 18, 0.8).fill({ color: 0x2a1a0f });

    // Bow animation - pointing forward (to the right)
    const bowBend = bowDraw * 4; // How much the bow bends

    // Bow arc - curved to the right
    g.moveTo(x + 8, y - 16 + bowBend)
      .quadraticCurveTo(x + 20 + bowBend * 2, y - 8, x + 8, y + 16 - bowBend)
      .stroke({ color: COL_WOOD, width: 2.5 });

    // Bow string - pulled back towards the archer when drawing
    const stringTop = y - 16 + bowBend - 2;
    const stringBottom = y + 16 - bowBend + 2;
    g.moveTo(x + 8, stringTop)
      .lineTo(x + 8 - bowDraw * 12, y - 8) // String pulled back to arrow nock
      .lineTo(x + 8, stringBottom)
      .stroke({ color: 0x8b8378, width: 0.5 });
  }

  private _updateArchers(time: number): void {
    const g = this._arrows;
    g.clear();

    // Animate two archers shooting asynchronously (different cycle lengths)
    const cycle1 = 1.8; // First archer cycle
    const cycle2 = 2.3; // Second archer cycle (different speed)

    for (let i = 0; i < 2; i++) {
      const archerX = TS + 10;
      const archerY = i === 0 ? TH / 4 : (TH * 3) / 4;
      const targetX = TS + 50;

      // Different timing offsets for async shooting
      const cycle = i === 0 ? cycle1 : cycle2;
      const offset = i === 0 ? 0 : 0.7;
      const arrowTime = (time * ARROW_SPEED + offset) % cycle;

      // Bow draw state: 0 = relaxed, 1 = fully drawn
      let bowDraw = 0;

      if (arrowTime < 0.3) {
        // Drawing the bow (first 0.3 seconds)
        bowDraw = arrowTime / 0.3;
      } else if (arrowTime < 0.5) {
        // Holding at full draw (0.3 to 0.5)
        bowDraw = 1;
      } else if (arrowTime < 1.0) {
        // Arrow in flight (0.5 to 1.0) - bow relaxes
        bowDraw = 1 - (arrowTime - 0.5) / 0.5;
      }

      if (arrowTime < 1) {
        const progress = (arrowTime - 0.3) / 0.7; // Normalize flight time
        const arrowX = archerX + (targetX - archerX) * Math.max(0, progress);
        const arrowY = archerY;

        // Draw arrow shaft
        g.moveTo(arrowX, arrowY)
          .lineTo(arrowX + 15, arrowY)
          .stroke({ color: COL_ARROW_SHAFT, width: 1 });

        // Draw arrow fletching
        g.moveTo(arrowX + 12, arrowY - 2)
          .lineTo(arrowX + 15, arrowY)
          .lineTo(arrowX + 12, arrowY + 2)
          .fill({ color: COL_ARROW_FLETCH });

        // Draw arrow tip
        g.moveTo(arrowX + 15, arrowY - 1)
          .lineTo(arrowX + 18, arrowY)
          .lineTo(arrowX + 15, arrowY + 1)
          .fill({ color: 0x000000 });
      }

      // Draw archer with bow animation
      if (i === 0) {
        this._drawArcher(this._archer1, archerX, archerY, bowDraw);
      } else {
        this._drawArcher(this._archer2, archerX, archerY, bowDraw);
      }
    }

    // Target recoil animation
    const recoilTime = (time * 2) % 1;
    if (recoilTime < TARGET_RECOIL) {
      const recoil = Math.sin((recoilTime / TARGET_RECOIL) * Math.PI) * 2;
      this._target1.position.set(TS + 50 + recoil, TH / 4);
      this._target2.position.set(TS + 50 + recoil, (TH * 3) / 4);
    } else {
      this._target1.position.set(TS + 50, TH / 4);
      this._target2.position.set(TS + 50, (TH * 3) / 4);
    }
  }

  // ── Flag ────────────────────────────────────────────────────────────────

  private _drawFlag(): void {
    this._flag.position.set(TS - 6, 0);
  }

  private _updateFlag(time: number): void {
    const g = this._flag;
    g.clear();

    const w1 = Math.sin(time * FLAG_SPEED) * 2;
    const w2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 3;
    const w3 = Math.sin(time * FLAG_SPEED * 0.9 + 2) * 2;
    const fW = 14;
    const fH = 10;

    g.moveTo(0, 0)
      .bezierCurveTo(fW * 0.3, w1, fW * 0.7, w2, fW, w3)
      .lineTo(fW, fH + w3)
      .bezierCurveTo(fW * 0.7, fH + w2, fW * 0.3, fH + w1, 0, fH)
      .closePath()
      .fill({ color: this._playerColor });
    // Cross on flag
    g.rect(fW / 2 - 0.5, 2 + (w1 + w3) / 4, 1, fH - 4).fill({
      color: COL_BANNER_LT,
      alpha: 0.5,
    });
    g.rect(fW / 2 - 3, fH / 2 - 0.5 + (w1 + w3) / 4, 6, 1).fill({
      color: COL_BANNER_LT,
      alpha: 0.5,
    });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
