// Procedural Royal Stable renderer for BuildingView.
//
// Draws an impressive 3x2 medieval stone royal stable:
//   • Main stone building with crenellated roof
//   • Multiple horse stalls with animated horses
//   • Stable master tending to horses
//   • Hay bales and water troughs
//   • Waving banners with player color
//   • Stone buttresses and decorative arches
//
// Animations:
//   - Horse head bobbing and tail swishing
//   - Banner waving
//   - Stable master movement
//   - Ambient dust particles

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

const TS = 64;
const PW = 3 * TS; // 192px wide
const PH = 2 * TS; // 128px tall

// Stone palette
const COL_STONE = 0x8a8378;
const COL_STONE_DK = 0x5a554d;
const COL_STONE_LT = 0xa8a298;

// Roof and wood
const COL_ROOF = 0x5c3d2e;
const COL_ROOF_DK = 0x3d2510;
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4a3020;

// Accents
const COL_HAY = 0xc9a85c;
const COL_WATER = 0x4a7a9a;
const COL_BANNER1 = 0xcc2244;

// Horse colors
const COL_HORSE_BROWN = 0x8b5a2b;
const COL_HORSE_BLACK = 0x2a2a2a;
const COL_HORSE_WHITE = 0xd8d0c8;

// Character colors
const COL_SKIN = 0xe8c8a0;
const COL_CLOTH_STABLE = 0x8b6a4a;
const COL_HAIR = 0x4a3020;

export class StableRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _stalls = new Graphics();
  private _horses = new Graphics();
  private _chars = new Graphics();
  private _banners = new Graphics();
  private _props = new Graphics();

  private _time = 0;
  private _ownerColor: number;

  constructor(owner: string | null) {
    this._ownerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBuilding();
    this._drawStalls();
    this._drawProps();

    this.container.addChild(this._building);
    this.container.addChild(this._stalls);
    this.container.addChild(this._props);
    this.container.addChild(this._horses);
    this.container.addChild(this._chars);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateHorses(this._time);
    this._updateBanners(this._time);
    this._updateStableMaster(this._time);
  }

  private _drawBuilding(): void {
    const g = this._building;

    // Ground
    g.rect(0, PH - 8, PW, 8).fill({ color: 0x7a756d });

    // Main stone walls
    const wallX = 12;
    const wallW = PW - 24;
    const wallY = 30;
    const wallH = PH - wallY - 12;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone brick pattern
    for (let row = 0; row < 5; row++) {
      const offset = (row % 2) * 10;
      for (let col = 0; col < 8; col++) {
        g.rect(wallX + 4 + col * 18 + offset, wallY + 4 + row * 14, 14, 11)
          .fill({ color: row % 2 === 0 ? COL_STONE_LT : COL_STONE })
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.5 });
      }
    }

    // Buttresses
    g.rect(wallX - 6, wallY, 8, wallH).fill({ color: COL_STONE_DK });
    g.rect(wallX + wallW - 2, wallY, 8, wallH).fill({ color: COL_STONE_DK });

    // Central archway entrance
    const doorW = 28;
    const doorH = 45;
    const doorX = PW / 2 - doorW / 2;
    const doorY = PH - doorH - 8;

    g.moveTo(doorX, doorY + doorH)
      .lineTo(doorX, doorY + 12)
      .quadraticCurveTo(doorX + doorW / 2, doorY - 5, doorX + doorW, doorY + 12)
      .lineTo(doorX + doorW, doorY + doorH)
      .closePath()
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: 0x3a2510, width: 2 });

    // Door details
    g.rect(doorX + 4, doorY + 18, 8, 20)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3a2510, width: 1 });
    g.rect(doorX + doorW - 12, doorY + 18, 8, 20)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3a2510, width: 1 });

    // Decorative arched windows
    for (let i = 0; i < 3; i++) {
      const wx = wallX + 20 + i * 55;
      const wy = wallY + 15;
      g.moveTo(wx, wy + 18)
        .lineTo(wx, wy + 6)
        .quadraticCurveTo(wx + 10, wy - 2, wx + 20, wy + 6)
        .lineTo(wx + 20, wy + 18)
        .closePath()
        .fill({ color: 0x2a2520 });
      g.moveTo(wx + 2, wy + 16)
        .lineTo(wx + 2, wy + 8)
        .quadraticCurveTo(wx + 10, wy + 2, wx + 18, wy + 8)
        .lineTo(wx + 18, wy + 16)
        .closePath()
        .fill({ color: 0x4a4540 });
    }

    // Main roof
    g.moveTo(8, 33)
      .lineTo(PW / 2, 15)
      .lineTo(PW - 8, 33)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.5 });

    // Crenellations
    for (let i = 0; i < 12; i++) {
      g.rect(wallX + 4 + i * 13, wallY - 6, 8, 6)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }

    // Side tower on left
    g.rect(4, 20, 20, 55)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.moveTo(2, 22)
      .quadraticCurveTo(14, 8, 26, 22)
      .closePath()
      .fill({ color: COL_ROOF_DK });

    // Side tower on right
    g.rect(PW - 24, 20, 20, 55)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.moveTo(PW - 26, 22)
      .quadraticCurveTo(PW - 14, 8, PW - 2, 22)
      .closePath()
      .fill({ color: COL_ROOF_DK });
  }

  private _drawStalls(): void {
    const g = this._stalls;

    // Stall dividers (wooden)
    const stallStartX = 25;
    const stallW = 45;
    const stallY = PH - 50;
    const stallH = 42;

    for (let i = 0; i < 3; i++) {
      const sx = stallStartX + i * stallW;
      // Stall back wall
      g.rect(sx, stallY, stallW, stallH)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 1 });
      // Stall door (half height)
      g.rect(sx + 2, stallY, stallW - 4, stallH / 2)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: 0x3a2510, width: 1 });
      // Horizontal beam
      g.rect(sx, stallY + stallH / 2 - 3, stallW, 4).fill({
        color: COL_WOOD_DK,
      });
    }

    // Stable name plaque above entrance
    g.rect(PW / 2 - 25, PH - 75, 50, 12).fill({ color: 0x3a2510 });
  }

  private _drawProps(): void {
    const g = this._props;

    // Hay bales in front
    g.rect(145, PH - 18, 18, 12)
      .fill({ color: COL_HAY })
      .stroke({ color: 0xa88a40, width: 1 });
    g.rect(160, PH - 20, 16, 14)
      .fill({ color: 0xb89850 })
      .stroke({ color: 0xa88a40, width: 1 });

    // Water trough
    g.rect(8, PH - 15, 25, 8)
      .fill({ color: COL_WATER })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(10, PH - 16, 21, 3).fill({ color: 0x5a8aaa });

    // Stable lantern
    g.rect(135, 40, 4, 10).fill({ color: 0x333333 });
    g.circle(137, 38, 6).fill({ color: 0x443311 });
    g.circle(137, 38, 4).fill({ color: 0xffaa44, alpha: 0.8 });
  }

  private _updateHorses(time: number): void {
    const g = this._horses;
    g.clear();

    const stallStartX = 30;
    const stallW = 45;
    const stallY = PH - 48;
    const horseColors = [COL_HORSE_BROWN, COL_HORSE_BLACK, COL_HORSE_WHITE];

    for (let i = 0; i < 3; i++) {
      const hx = stallStartX + i * stallW + stallW / 2;
      const hy = stallY + 20;

      const headBob = Math.sin(time * 2 + i * 0.5) * 2;
      const tailSwish = Math.sin(time * 1.5 + i) * 3;

      const horseColor = horseColors[i];

      // Horse body
      g.ellipse(hx, hy + 8, 14, 9).fill({ color: horseColor });

      // Horse legs
      g.rect(hx - 10, hy + 14, 4, 12).fill({ color: horseColor });
      g.rect(hx - 4, hy + 14, 4, 12).fill({ color: horseColor });
      g.rect(hx + 2, hy + 14, 4, 12).fill({ color: horseColor });
      g.rect(hx + 8, hy + 14, 4, 12).fill({ color: horseColor });

      // Horse neck
      g.rect(hx + 8, hy - 4 + headBob, 6, 14).fill({ color: horseColor });

      // Horse head
      g.ellipse(hx + 12, hy - 8 + headBob, 5, 7).fill({ color: horseColor });

      // Horse ear
      g.moveTo(hx + 10, hy - 13 + headBob)
        .lineTo(hx + 12, hy - 18 + headBob)
        .lineTo(hx + 14, hy - 13 + headBob)
        .fill({ color: horseColor });

      // Eye
      g.circle(hx + 14, hy - 9 + headBob, 1).fill({ color: 0x000000 });

      // Mane
      g.moveTo(hx + 6, hy - 12 + headBob)
        .lineTo(hx + 8, hy + 2)
        .stroke({ color: 0x2a2020, width: 2 });

      // Tail
      g.moveTo(hx - 14, hy + 5)
        .quadraticCurveTo(
          hx - 20 + tailSwish,
          hy + 15,
          hx - 16 + tailSwish,
          hy + 25,
        )
        .stroke({ color: 0x2a2020, width: 3 });
    }
  }

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Left tower banner
    const wave1 = Math.sin(time * 2.5) * 3;
    g.rect(8, 18, 2, 12).fill({ color: COL_WOOD });
    g.moveTo(10, 18)
      .bezierCurveTo(18 + wave1, 20, 22 + wave1, 28, 10, 32)
      .closePath()
      .fill({ color: this._ownerColor });

    // Right tower banner
    const wave2 = Math.sin(time * 2.5 + 1) * 3;
    g.rect(PW - 10, 18, 2, 12).fill({ color: COL_WOOD });
    g.moveTo(PW - 8, 18)
      .bezierCurveTo(PW - 16 + wave2, 20, PW - 20 + wave2, 28, PW - 8, 32)
      .closePath()
      .fill({ color: this._ownerColor });

    // Center banner on roof
    const wave3 = Math.sin(time * 3) * 2;
    g.rect(PW / 2 - 1, 16, 2, 8).fill({ color: COL_WOOD });
    g.moveTo(PW / 2 + 1, 16)
      .bezierCurveTo(
        PW / 2 + 6 + wave3,
        18,
        PW / 2 + 8 + wave3,
        22,
        PW / 2 + 1,
        24,
      )
      .closePath()
      .fill({ color: COL_BANNER1 });
  }

  private _updateStableMaster(time: number): void {
    const g = this._chars;
    g.clear();

    // Stable master near the entrance
    const mx = PW / 2 + 35;
    const my = PH - 25;

    const bob = Math.sin(time * 1.2) * 0.5;

    // Body
    g.rect(mx - 4, my - 16 + bob, 8, 16).fill({ color: COL_CLOTH_STABLE });

    // Head
    g.circle(mx, my - 20 + bob, 4).fill({ color: COL_SKIN });

    // Hair
    g.circle(mx, my - 23 + bob, 3).fill({ color: COL_HAIR });

    // Arms holding pitchfork
    const armSwing = Math.sin(time * 0.8) * 2;
    g.rect(mx - 8, my - 14 + bob + armSwing * 0.3, 4, 3).fill({
      color: COL_SKIN,
    });
    g.rect(mx + 4, my - 14 + bob - armSwing * 0.3, 4, 3).fill({
      color: COL_SKIN,
    });

    // Pitchfork
    g.moveTo(mx - 6, my - 20 + bob)
      .lineTo(mx - 6, my - 35 + bob)
      .stroke({ color: 0x4a4030, width: 1.5 });
    g.moveTo(mx - 9, my - 35 + bob)
      .lineTo(mx - 6, my - 32 + bob)
      .lineTo(mx - 3, my - 35 + bob)
      .stroke({ color: 0x4a4030, width: 1.5 });
    g.moveTo(mx - 6, my - 35 + bob)
      .lineTo(mx - 6, my - 38 + bob)
      .stroke({ color: 0x4a4030, width: 1.5 });

    // Legs
    g.rect(mx - 3, my + bob, 2, 6).fill({ color: 0x3a3025 });
    g.rect(mx + 1, my + bob, 2, 6).fill({ color: 0x3a3025 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
