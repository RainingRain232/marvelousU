// Procedural wall renderer for BuildingView.
//
// Draws a 1x3 stone wall section with animated rising effect:
//   • Stone wall that rises up from the ground
//   • Medieval crenellated battlements
//   • Wooden gate/door section option
//   • Torch flames at the top
//   • Stone block texture with moss
//
// Animation: Wall rises from ground to full height on placement

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

const TS = 64;
const WW = 1 * TS;
const WH = 3 * TS;

const COL_STONE = 0x7a756d;
const COL_STONE_LT = 0x9a9688;
const COL_STONE_DK = 0x5a554d;
const COL_MOSS = 0x3a5a2a;
const COL_WOOD = 0x5d3a1a;
const COL_TORCH = 0xff6622;
const COL_TORCH_CORE = 0xffaa44;

export class WallRenderer {
  readonly container = new Container();
  private _wall = new Graphics();
  private _torches: Graphics[] = [];
  private _time = 0;
  private _wallY = WH;
  private _targetY = 0;
  private _rising = true;

  constructor() {
    this._drawWall();
    this.container.addChild(this._wall);

    for (let i = 0; i < 2; i++) {
      const torch = new Graphics();
      this._torches.push(torch);
      this.container.addChild(torch);
    }
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    if (this._rising) {
      this._wallY -= dt * 120;
      if (this._wallY <= this._targetY) {
        this._wallY = this._targetY;
        this._rising = false;
      }
      this._wall.position.y = this._wallY;
    }

    this._updateTorches(this._time);
  }

  private _drawWall(): void {
    const g = this._wall;

    const bX = 8;
    const bW = WW - 16;
    const bH = WH;
    const bY = 0;

    g.rect(bX, bY, bW, bH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    for (let row = 0; row < 12; row++) {
      const offset = (row % 2) * 18;
      for (let col = 0; col < 3; col++) {
        const brickX = bX + 4 + col * 16 + offset;
        if (brickX + 14 > bX + bW - 2) continue;
        g.rect(brickX, bY + row * 16 + 2, 14, 13)
          .fill({ color: row % 2 === 0 ? COL_STONE_LT : COL_STONE })
          .stroke({ color: COL_STONE_DK, width: 0.5, alpha: 0.4 });
      }
    }

    for (let i = 0; i < 4; i++) {
      g.rect(bX + 2 + i * 12, bY - 8, 8, 8)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 1 });
    }

    g.rect(bX + bW / 2 - 6, bH - 30, 12, 30)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(bX + bW / 2 - 4, bH - 28, 3, 26).fill({ color: 0x3d2510 });
    g.rect(bX + bW / 2 + 1, bH - 28, 3, 26).fill({ color: 0x3d2510 });

    g.ellipse(bX + 8, bH - 8, 10, 4).fill({ color: COL_MOSS, alpha: 0.6 });
    g.ellipse(bX + bW - 12, bH - 5, 8, 3).fill({ color: COL_MOSS, alpha: 0.5 });
  }

  private _updateTorches(time: number): void {
    const positions = [
      { x: 16, y: 8 },
      { x: WW - 16, y: 8 },
    ];

    for (let i = 0; i < 2; i++) {
      const t = this._torches[i];
      t.clear();

      const pos = positions[i];
      const flicker = Math.sin(time * 8 + i * 2) * 2;
      const flicker2 = Math.cos(time * 12 + i) * 1.5;

      t.rect(pos.x - 2, pos.y - 4, 4, 6).fill({ color: 0x333333 });

      t.moveTo(pos.x, pos.y - 4)
        .lineTo(pos.x - 4 + flicker2, pos.y - 14)
        .lineTo(pos.x + flicker, pos.y - 10)
        .lineTo(pos.x + 4 + flicker2, pos.y - 14)
        .closePath()
        .fill({ color: COL_TORCH, alpha: 0.8 });

      t.circle(pos.x + flicker * 0.5, pos.y - 12, 3).fill({
        color: COL_TORCH_CORE,
      });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
