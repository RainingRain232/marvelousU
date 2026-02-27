// Procedural town renderer for BuildingView.
//
// Draws a detailed 2x2 medieval fantasy town inspired by old Italian settlements:
//   • Clusters of orange-roofed houses with stucco/stone walls
//   • Small church with bell tower
//   • Stone-paved piazza (square)
//   • Defensive towers with player-colored waving flags
//   • Gateway with stone walls and a snoring guard
//   • Merchant with a cart
//   • Two children playing with a hoop in the square
//
// Animations:
//   - Hoop rotation and figure movement
//   - Guard breathing and Zzz particles
//   - Flag waving
//   - Slow wing flap for distant birds or similar details

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS;
const TH = 2 * TS;

// Palette
const COL_STUCCO = 0xe8e2d0;
const COL_ROOF = 0xc05028; // Terracotta orange
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x555555;
const COL_WOOD = 0x5d3a1a;
const COL_PAVEMENT = 0x9a9688;
const COL_FLAG_P1 = 0x4488ff;
const COL_FLAG_P2 = 0xff4444;
const COL_SKIN = 0xffdbac;
const COL_CLOTH1 = 0x4466aa;
const COL_CLOTH2 = 0xaa4444;

// ---------------------------------------------------------------------------
// TownRenderer
// ---------------------------------------------------------------------------

export class TownRenderer {
  readonly container = new Container();

  private _ground = new Graphics();
  private _houses = new Graphics();
  private _towers = new Graphics();
  private _gateway = new Graphics();
  private _piazza = new Graphics();
  private _chars = new Graphics();
  private _flags: Graphics[] = [];
  private _zzz: Graphics[] = [];

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? COL_FLAG_P1 : COL_FLAG_P2;

    this._drawStaticPavement();
    this._drawArchitecture();
    this._drawStaticChars();

    this.container.addChild(this._ground);
    this.container.addChild(this._piazza);
    this.container.addChild(this._houses);
    this.container.addChild(this._gateway);
    this.container.addChild(this._towers);
    this.container.addChild(this._chars);

    // Add 2 flags
    for (let i = 0; i < 2; i++) {
      const f = new Graphics();
      this._flags.push(f);
      this.container.addChild(f);
    }

    // Add 3 Zzz particles (hidden initially)
    for (let i = 0; i < 3; i++) {
      const z = new Graphics();
      this._zzz.push(z);
      this.container.addChild(z);
    }
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // 1. Flags
    this._updateFlags(this._time);

    // 2. Snoring Guard
    this._updateSnoring(this._time, dt);

    // 3. Children playing with hoop
    this._updateChildren(this._time);
  }

  private _drawStaticPavement(): void {
    const g = this._piazza;
    // Central square background
    g.rect(40, 40, 48, 48).fill({ color: COL_PAVEMENT });

    // Pavement pattern
    for (let x = 44; x < 84; x += 12) {
      for (let y = 44; y < 84; y += 12) {
        g.rect(x, y, 10, 10).fill({ color: 0x8b8678, alpha: 0.3 });
      }
    }
  }

  private _drawArchitecture(): void {
    const g = this._houses;

    // --- 1. Church ---
    this._drawHouse(g, 70, 20, 35, 40, true); // church body
    this._drawBellTower(g, 105, 10);

    // --- 2. Piazza Houses ---
    this._drawHouse(g, 30, 15, 25, 30);
    this._drawHouse(g, 15, 45, 22, 28);
    this._drawHouse(g, 15, 75, 28, 30);

    // --- 3. Gateway Walls ---
    const gateX = TW / 2 - 20;
    const gateY = TH - 25;
    this._drawGate(g, gateX, gateY);
  }

  private _drawHouse(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    isChurch = false,
  ): void {
    // Walls
    g.rect(x, y, w, h)
      .fill({ color: COL_STUCCO })
      .stroke({ color: 0xaaaaaa, width: 1 });

    // Roof
    if (isChurch) {
      g.moveTo(x - 4, y + 2)
        .lineTo(x + w / 2, y - 15)
        .lineTo(x + w + 4, y + 2)
        .closePath()
        .fill({ color: 0x444444 });
    } else {
      g.moveTo(x - 2, y + 2)
        .lineTo(x + w / 2, y - 8)
        .lineTo(x + w + 2, y + 2)
        .closePath()
        .fill({ color: COL_ROOF });
    }

    // Door
    g.rect(x + w / 2 - 4, y + h - 10, 8, 10).fill({ color: COL_WOOD });

    // Random windows
    g.rect(x + 4, y + 6, 5, 5).fill({ color: 0x222222 });
    g.rect(x + w - 9, y + 6, 5, 5).fill({ color: 0x222222 });
  }

  private _drawBellTower(g: Graphics, x: number, y: number): void {
    const w = 15,
      h = 50;
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });
    // Domed top
    g.moveTo(x - 2, y + 2)
      .bezierCurveTo(x + w / 2, y - 15, x + w / 2, y - 15, x + w + 2, y + 2)
      .fill({ color: 0x1a1a2e });
  }

  private _drawGate(g: Graphics, x: number, y: number): void {
    const w = 40,
      h = 25;
    // Side walls
    g.rect(x - 30, y + 5, 30, 15)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });
    g.rect(x + w, y + 5, 30, 15)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Archway
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2.5 });

    // Wooden gate doors (two panels)
    const doorX = x + 3;
    const doorW = w / 2 - 5;
    const doorY = y + 5;
    const doorH = h - 5;

    // Left door
    g.rect(doorX, doorY, doorW, doorH)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left door cross-bracing
    g.moveTo(doorX, doorY)
      .lineTo(doorX + doorW, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.moveTo(doorX + doorW, doorY)
      .lineTo(doorX, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    // Left door iron bands
    g.rect(doorX + 1, doorY + doorH / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });
    g.rect(doorX + 1, doorY + (doorH * 2) / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });

    // Right door
    const rightDoorX = x + w - doorW - 3;
    g.rect(rightDoorX, doorY, doorW, doorH)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Right door cross-bracing
    g.moveTo(rightDoorX, doorY)
      .lineTo(rightDoorX + doorW, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.moveTo(rightDoorX + doorW, doorY)
      .lineTo(rightDoorX, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    // Right door iron bands
    g.rect(rightDoorX + 1, doorY + doorH / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });
    g.rect(rightDoorX + 1, doorY + (doorH * 2) / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });

    // Decorative towers
    this._drawSmallTower(g, x - 5, y - 20);
    this._drawSmallTower(g, x + w - 10, y - 20);
  }

  private _drawSmallTower(g: Graphics, x: number, y: number): void {
    g.rect(x, y, 15, 30)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });
  }

  private _drawStaticChars(): void {
    const g = this._chars;

    // --- Merchant Cart ---
    const cX = 95,
      cY = 105;
    g.rect(cX, cY, 20, 12).fill({ color: COL_WOOD });
    g.circle(cX + 4, cY + 12, 4).stroke({ color: 0x000000, width: 2 });
    g.circle(cX + 16, cY + 12, 4).stroke({ color: 0x000000, width: 2 });

    // Merchant figure
    g.rect(cX - 8, cY + 2, 6, 12).fill({ color: COL_CLOTH1 });
    g.circle(cX - 5, cY, 3).fill({ color: COL_SKIN });
  }

  private _updateFlags(time: number): void {
    // Towers are at (TW/2-5, TH-25-20) and (TW/2+40-10, TH-25-20)
    // Adjust indices for drawSmallTower calls in _drawGate:
    // tower1: x - 5, y - 20  =>  (TW/2-25, TH-45)
    // tower2: x + 40 - 10, y - 20  =>  (TW/2+30, TH-45)

    const gateX = TW / 2 - 20;
    const gateY = TH - 25;

    const pos = [
      { x: gateX + 2, y: gateY - 20 },
      { x: gateX + 40 - 2, y: gateY - 20 },
    ];

    for (let i = 0; i < 2; i++) {
      const f = this._flags[i];
      f.clear();
      f.position.set(pos[i].x, pos[i].y);

      f.moveTo(0, 0).lineTo(0, -10).stroke({ color: 0x888888, width: 1 });

      const wave = Math.sin(time * 3 + i) * 2;
      f.moveTo(0, -10)
        .lineTo(10, -8 + wave)
        .lineTo(0, -5)
        .fill({ color: this._playerColor });
    }
  }

  private _updateSnoring(time: number, _dt: number): void {
    const sX = TW / 2 - 35,
      sY = TH - 12;

    // We need to re-draw the guard part each time or separate it
    // For simplicity, let's just draw the "Zzz" separate

    // Breathing guard (body shrinks/grows slightly)

    // He is sitting against the wall
    // Drawing him as part of static chars but with a dynamic Zzz
    // Wait, better to clear chars? No, too expensive.
    // Let's just animate the Zzz particles.

    for (let i = 0; i < 3; i++) {
      const z = this._zzz[i];
      z.clear();
      const zLife = (time * 0.5 + i * 0.3) % 1.0;
      const zY = sY - 10 - zLife * 25;
      const zX = sX + Math.sin(time * 2 + i) * 5;
      z.position.set(zX, zY);

      const scale = 0.5 + zLife * 0.5;
      z.scale.set(scale);
      z.alpha = 1.0 - zLife;

      // Draw a small "Z"
      z.moveTo(0, 0)
        .lineTo(6, 0)
        .lineTo(0, 6)
        .lineTo(6, 6)
        .stroke({ color: 0xffffff, width: 1.5 });
    }
  }

  private _updateChildren(time: number): void {
    const g = this._chars;
    // Children playing in the piazza (40, 40, 48, 48)
    const pX = 64,
      pY = 64;

    // Children are two points moving in a circle
    const r = 15;
    const c1X = pX + Math.cos(time * 0.8) * r;
    const c1Y = pY + Math.sin(time * 0.8) * r;

    const c2X = pX + Math.cos(time * 0.8 + Math.PI) * r;
    const c2Y = pY + Math.sin(time * 0.8 + Math.PI) * r;

    // Clear a subsection of chars? No, let's just redraw chars every tick?
    // Actually, we should probably have _charsDynamic as a separate Graphics child.
    // I will re-implement _chars as dynamic and _charsStatic as static.

    g.clear();
    // Redraw merchant (static)
    const mcX = 95,
      mcY = 105;
    g.rect(mcX, mcY, 20, 12).fill({ color: COL_WOOD });
    g.circle(mcX + 4, mcY + 12, 4).stroke({ color: 0x000000, width: 2 });
    g.circle(mcX + 16, mcY + 12, 4).stroke({ color: 0x000000, width: 2 });
    g.rect(mcX - 8, mcY + 2, 6, 12).fill({ color: COL_CLOTH1 });
    g.circle(mcX - 5, mcY, 3).fill({ color: COL_SKIN });

    // Snoring guard (static sitting)
    const sX = TW / 2 - 35,
      sY = TH - 12;
    const breathe = Math.sin(time * 1.5) * 0.8;
    g.rect(sX, sY - 8 - breathe, 6, 8 + breathe).fill({ color: 0x334455 }); // body
    g.circle(sX + 3, sY - 10 - breathe, 3).fill({ color: COL_SKIN }); // head

    // Children (dynamic)
    g.circle(c1X, c1Y, 3).fill({ color: COL_CLOTH1 });
    g.circle(c2X, c2Y, 3).fill({ color: COL_CLOTH2 });

    // The Hoop (rolling between/around them)
    const hX = pX + Math.cos(time * 0.8 + 0.4) * (r + 2);
    const hY = pY + Math.sin(time * 0.8 + 0.4) * (r + 2);
    g.circle(hX, hY, 5).stroke({ color: 0xccaa44, width: 1 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
