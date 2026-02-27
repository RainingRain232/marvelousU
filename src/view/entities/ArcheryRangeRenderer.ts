// Archery range renderer for BuildingView.
//
// Draws a medieval fantasy archery range (~2x2 tiles) with:
//   • Stone building with wooden roof
//   • 2 archers shooting arrows at targets
//   • Wooden target stands
//   • Waving banners
//   • Hay bales and equipment
//
// Animations:
//   - Archers shooting arrows at targets
//   - Target recoil when hit
//   - Banner waving
//   - Bow draw animation

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

const TS = 64;
const PW = 4 * TS;
const PH = 2 * TS;

const COL_STONE = 0x8a8278;
const COL_STONE_DK = 0x5a5248;
const COL_STONE_LT = 0xa8a298;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_ROOF = 0x6b4a2a;
const COL_ROOF_DK = 0x4b2a1a;
const COL_BANNER = 0xcc2244;
const COL_HAY = 0xc9a85c;
const COL_SKIN = 0xf0c8a0;
const COL_CLOTH = 0x4a7a3a;
const COL_ARROW = 0x8b6914;
const COL_FLETCH = 0x226622;

export class ArcheryRangeRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _targets = new Graphics();
  private _archers = new Graphics();
  private _arrows = new Graphics();
  private _banners: Graphics[] = [];
  private _props = new Graphics();

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBuilding();
    this._drawTargets();
    this._drawProps();

    this.container.addChild(this._building);
    this.container.addChild(this._targets);
    this.container.addChild(this._props);
    this.container.addChild(this._archers);
    this.container.addChild(this._arrows);

    for (let i = 0; i < 2; i++) {
      const banner = new Graphics();
      this._banners.push(banner);
      this.container.addChild(banner);
    }
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateArchers(this._time);
    this._updateBanners(this._time);
  }

  private _drawBuilding(): void {
    const g = this._building;

    g.rect(0, PH - 8, PW, 8).fill({ color: 0x7a756d });

    const wallX = 8;
    const wallW = PW - 16;
    const wallY = 35;
    const wallH = PH - wallY - 12;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    for (let row = 0; row < 5; row++) {
      const offset = (row % 2) * 10;
      for (let col = 0; col < 11; col++) {
        g.rect(wallX + 4 + col * 16 + offset, wallY + 4 + row * 14, 12, 11)
          .fill({ color: row % 2 === 0 ? COL_STONE_LT : COL_STONE })
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.4 });
      }
    }

    g.rect(wallX - 4, wallY, 6, wallH).fill({ color: COL_STONE_DK });
    g.rect(wallX + wallW - 2, wallY, 6, wallH).fill({ color: COL_STONE_DK });

    g.moveTo(4, 38)
      .quadraticCurveTo(PW / 2, 15, PW - 4, 38)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.5 });

    for (let i = 0; i < 16; i++) {
      g.rect(wallX + 4 + i * 14, wallY - 5, 8, 5)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }

    for (let i = 0; i < 2; i++) {
      const doorW = 18;
      const doorH = 35;
      const doorX = 50 + i * 140;
      const doorY = PH - doorH - 8;

      g.rect(doorX, doorY, doorW, doorH)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 1.5 });
      g.rect(doorX + 2, doorY + 5, 4, doorH - 10).fill({ color: COL_WOOD_DK });
      g.rect(doorX + doorW - 6, doorY + 5, 4, doorH - 10).fill({
        color: COL_WOOD_DK,
      });
    }

    for (let i = 0; i < 5; i++) {
      const wx = wallX + 20 + i * 50;
      const wy = wallY + 12;
      g.moveTo(wx, wy + 18)
        .lineTo(wx, wy + 5)
        .quadraticCurveTo(wx + 10, wy - 2, wx + 20, wy + 5)
        .lineTo(wx + 20, wy + 18)
        .closePath()
        .fill({ color: 0x2a2520 });
    }
  }

  private _drawTargets(): void {
    const g = this._targets;
    g.clear();

    const targetPositions = [
      { x: PW - 40, y: 45 },
      { x: PW - 40, y: PH - 45 },
    ];

    for (const pos of targetPositions) {
      g.rect(pos.x - 3, pos.y - 30, 6, 60)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 1 });

      g.circle(pos.x, pos.y, 16)
        .fill({ color: 0xffffff })
        .stroke({ color: 0xcccccc, width: 1 });
      g.circle(pos.x, pos.y, 12).fill({ color: 0x1a1a1a });
      g.circle(pos.x, pos.y, 8).fill({ color: 0x2255aa });
      g.circle(pos.x, pos.y, 4).fill({ color: 0xcc2222 });
      g.circle(pos.x, pos.y, 2).fill({ color: 0xffdd00 });
    }
  }

  private _drawProps(): void {
    const g = this._props;

    g.rect(15, PH - 14, 16, 10)
      .fill({ color: COL_HAY })
      .stroke({ color: 0xa88a40, width: 1 });
    g.rect(45, PH - 12, 14, 8)
      .fill({ color: 0xb89850 })
      .stroke({ color: 0xa88a40, width: 1 });
    g.rect(75, PH - 14, 16, 10)
      .fill({ color: COL_HAY })
      .stroke({ color: 0xa88a40, width: 1 });

    g.rect(180, PH - 20, 8, 16)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });
    g.rect(178, PH - 22, 12, 4).fill({ color: COL_WOOD });
  }

  private _updateArchers(time: number): void {
    const g = this._arrows;
    g.clear();

    const archers = [
      { x: 100, y: 60, targetX: PW - 40, cycle: 1.8, offset: 0 },
      { x: 130, y: 60, targetX: PW - 40, cycle: 2.2, offset: 0.8 },
    ];

    for (let i = 0; i < 2; i++) {
      const archer = archers[i];
      const arrowTime = (time * 1.2 + archer.offset) % archer.cycle;

      let bowDraw = 0;
      if (arrowTime < 0.3) {
        bowDraw = arrowTime / 0.3;
      } else if (arrowTime < 0.5) {
        bowDraw = 1;
      } else if (arrowTime < archer.cycle) {
        bowDraw = 1 - (arrowTime - 0.5) / (archer.cycle - 0.5);
      }

      const ag = i === 0 ? this._archers : this._archers;
      ag.clear();

      ag.rect(archer.x - 3, archer.y + 2, 2, 10).fill({ color: 0x3a2a1a });
      ag.rect(archer.x + 1, archer.y + 2, 2, 10).fill({ color: 0x3a2a1a });

      ag.rect(archer.x - 5, archer.y - 10, 10, 12).fill({ color: COL_CLOTH });

      ag.rect(archer.x - 6, archer.y - 2, 12, 2).fill({ color: 0x5a3a1a });

      ag.circle(archer.x, archer.y - 15, 4).fill({ color: COL_SKIN });
      ag.circle(archer.x, archer.y - 18, 3).fill({ color: 0x4a3020 });

      const bowX = archer.x + 6;
      const bowBend = bowDraw * 3;
      ag.moveTo(bowX, archer.y - 14 + bowBend)
        .quadraticCurveTo(
          bowX + 12 + bowBend * 2,
          archer.y - 8,
          bowX,
          archer.y + 14 - bowBend,
        )
        .stroke({ color: COL_WOOD, width: 2 });

      if (arrowTime >= 0.3 && arrowTime < archer.cycle) {
        const progress = (arrowTime - 0.3) / (archer.cycle - 0.3);
        const arrowX =
          archer.x +
          10 +
          (archer.targetX - archer.x - 20) * Math.max(0, progress);

        g.moveTo(arrowX, archer.y)
          .lineTo(arrowX + 12, archer.y)
          .stroke({ color: COL_ARROW, width: 1.5 });
        g.moveTo(arrowX + 9, archer.y - 2)
          .lineTo(arrowX + 12, archer.y)
          .lineTo(arrowX + 9, archer.y + 2)
          .fill({ color: COL_FLETCH });
        g.moveTo(arrowX + 12, archer.y - 1)
          .lineTo(arrowX + 15, archer.y)
          .lineTo(arrowX + 12, archer.y + 1)
          .fill({ color: 0x333333 });
      }
    }

    const recoilTime = (time * 2) % 1;
    if (recoilTime < 0.15) {
      const recoil = Math.sin((recoilTime / 0.15) * Math.PI) * 2;
      this._targets.position.set(recoil, 0);
    } else {
      this._targets.position.set(0, 0);
    }
  }

  private _updateBanners(time: number): void {
    const positions = [
      { x: 10, y: 38 },
      { x: PW - 10, y: 38 },
    ];

    for (let i = 0; i < 2; i++) {
      const banner = this._banners[i];
      banner.clear();

      const pos = positions[i];
      const wave = Math.sin(time * 2.5 + i) * 3;

      banner.rect(pos.x, pos.y, 2, 10).fill({ color: COL_WOOD });
      banner
        .moveTo(pos.x + 2, pos.y)
        .bezierCurveTo(
          pos.x + 10 + wave,
          pos.y + 2,
          pos.x + 14 + wave,
          pos.y + 10,
          pos.x + 2,
          pos.y + 14,
        )
        .closePath()
        .fill({ color: i === 0 ? this._playerColor : COL_BANNER });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
