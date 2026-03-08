// ---------------------------------------------------------------------------
// Duel mode – procedural arena background renderer
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  DUEL_ARENAS,
  type DuelArenaDef,
} from "../../duel/config/DuelArenaDefs";

export class DuelArenaRenderer {
  readonly container = new Container();

  build(arenaId: string, sw: number, sh: number): void {
    this.container.removeChildren();
    const arena = DUEL_ARENAS[arenaId];
    if (!arena) return;

    switch (arenaId) {
      case "camelot":
        this._drawCamelot(arena, sw, sh);
        break;
      case "avalon":
        this._drawAvalon(arena, sw, sh);
        break;
      case "excalibur":
        this._drawExcalibur(arena, sw, sh);
        break;
      default:
        this._drawGeneric(arena, sw, sh);
        break;
    }
  }

  // ---- Camelot Courtyard ---------------------------------------------------

  private _drawCamelot(a: DuelArenaDef, sw: number, sh: number): void {
    const g = new Graphics();

    // Sky gradient (simple two-tone)
    const floorY = a.stageFloorY;
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Lighter sky near horizon
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.skyBottom, alpha: 0.5 });

    // Castle wall background
    const wallH = floorY * 0.6;
    const wallY = floorY - wallH;
    g.rect(0, wallY, sw, wallH);
    g.fill({ color: 0x666660 });
    g.rect(0, wallY, sw, wallH);
    g.stroke({ color: 0x555550, width: 2 });

    // Crenellations
    const crenW = 25;
    const crenH = 20;
    for (let x = 0; x < sw; x += crenW * 2) {
      g.rect(x, wallY - crenH, crenW, crenH);
      g.fill({ color: 0x666660 });
      g.stroke({ color: 0x555550, width: 1 });
    }

    // Windows
    for (let i = 0; i < 5; i++) {
      const wx = 80 + i * 160;
      const wy = wallY + 40;
      g.roundRect(wx, wy, 20, 35, 10);
      g.fill({ color: 0x223344 });
      g.stroke({ color: 0x444440, width: 1 });
    }

    // Banners
    for (let i = 0; i < 3; i++) {
      const bx = 150 + i * 250;
      const by = wallY + 20;
      // Pole
      g.rect(bx, by - 60, 3, 80);
      g.fill({ color: 0x8b7355 });
      // Banner cloth
      g.rect(bx + 3, by - 55, 30, 50);
      g.fill({ color: a.accentColor });
      g.stroke({ color: 0x991111, width: 1 });
      // Gold trim
      g.rect(bx + 3, by - 55, 30, 5);
      g.fill({ color: 0xddaa33 });
    }

    // Torch sconces
    for (let i = 0; i < 4; i++) {
      const tx = 60 + i * 200;
      const ty = wallY + 80;
      // Bracket
      g.rect(tx, ty, 6, 15);
      g.fill({ color: 0x554433 });
      // Flame
      g.circle(tx + 3, ty - 5, 6);
      g.fill({ color: 0xff8822, alpha: 0.8 });
      g.circle(tx + 3, ty - 5, 3);
      g.fill({ color: 0xffdd44, alpha: 0.9 });
    }

    // Stone floor
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Floor tile lines
    for (let x = 0; x < sw; x += 40) {
      g.moveTo(x, floorY).lineTo(x, sh);
      g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.3 });
    }
    for (let y = floorY; y < sh; y += 20) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.3 });
    }

    this.container.addChild(g);
  }

  // ---- Avalon Shore --------------------------------------------------------

  private _drawAvalon(a: DuelArenaDef, sw: number, sh: number): void {
    const g = new Graphics();
    const floorY = a.stageFloorY;

    // Misty sky
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.skyBottom, alpha: 0.4 });

    // Distant tree silhouettes
    for (let i = 0; i < 8; i++) {
      const tx = 30 + i * 110 + Math.sin(i * 3) * 30;
      const th = 60 + (i % 3) * 30;
      // Trunk
      g.rect(tx - 3, floorY - th, 6, th);
      g.fill({ color: 0x334433, alpha: 0.5 });
      // Canopy
      g.circle(tx, floorY - th - 15, 25 + (i % 2) * 10);
      g.fill({ color: 0x334433, alpha: 0.4 });
    }

    // Magical glow spots
    for (let i = 0; i < 5; i++) {
      const gx = 100 + i * 170;
      const gy = floorY - 20;
      g.circle(gx, gy, 15);
      g.fill({ color: a.accentColor, alpha: 0.1 });
      g.circle(gx, gy, 6);
      g.fill({ color: a.accentColor, alpha: 0.2 });
    }

    // Shore/ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Water at bottom
    const waterY = floorY + 30;
    g.rect(0, waterY, sw, sh - waterY);
    g.fill({ color: 0x335566, alpha: 0.6 });

    // Water ripples
    for (let i = 0; i < 6; i++) {
      const ry = waterY + 10 + i * 12;
      g.moveTo(0, ry);
      for (let x = 0; x < sw; x += 30) {
        g.lineTo(x + 15, ry + 2);
        g.lineTo(x + 30, ry);
      }
      g.stroke({ color: 0x6699aa, width: 0.8, alpha: 0.3 });
    }

    // Fog overlay
    g.rect(0, floorY * 0.3, sw, floorY * 0.7);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    this.container.addChild(g);
  }

  // ---- Excalibur's Stone ---------------------------------------------------

  private _drawExcalibur(a: DuelArenaDef, sw: number, sh: number): void {
    const g = new Graphics();
    const floorY = a.stageFloorY;

    // Dark night sky
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });

    // Stars
    for (let i = 0; i < 30; i++) {
      const sx = Math.sin(i * 7.3) * sw * 0.5 + sw * 0.5;
      const sy = Math.cos(i * 4.1) * floorY * 0.4 + floorY * 0.2;
      g.circle(sx, sy, 1);
      g.fill({ color: 0xffffff, alpha: 0.5 + Math.sin(i) * 0.3 });
    }

    // Moon
    g.circle(sw * 0.75, floorY * 0.2, 25);
    g.fill({ color: 0xeeeedd, alpha: 0.8 });
    g.circle(sw * 0.75 + 8, floorY * 0.2 - 5, 20);
    g.fill({ color: a.skyTop }); // crescent effect

    // Dark forest backdrop
    for (let i = 0; i < 12; i++) {
      const tx = i * 70 + Math.sin(i * 2) * 20;
      const th = 80 + (i % 4) * 25;
      // Tree trunk
      g.rect(tx - 4, floorY - th, 8, th);
      g.fill({ color: 0x1a2a1a });
      // Tree top (triangular)
      g.moveTo(tx, floorY - th - 35);
      g.lineTo(tx - 25, floorY - th + 10);
      g.lineTo(tx + 25, floorY - th + 10);
      g.closePath();
      g.fill({ color: 0x1a331a });
    }

    // Moonbeam (center, on the stone)
    const beamCX = sw / 2;
    g.moveTo(beamCX - 20, 0);
    g.lineTo(beamCX + 20, 0);
    g.lineTo(beamCX + 40, floorY);
    g.lineTo(beamCX - 40, floorY);
    g.closePath();
    g.fill({ color: a.accentColor, alpha: 0.06 });

    // Sword in stone (background element, center)
    const stoneX = sw / 2;
    const stoneY = floorY - 5;
    // Stone base
    g.roundRect(stoneX - 20, stoneY - 25, 40, 30, 4);
    g.fill({ color: 0x556655 });
    g.stroke({ color: 0x445544, width: 1 });
    // Sword blade
    g.rect(stoneX - 2, stoneY - 65, 4, 40);
    g.fill({ color: 0xccccdd });
    g.stroke({ color: 0xaaaabb, width: 0.5 });
    // Crossguard
    g.rect(stoneX - 10, stoneY - 30, 20, 4);
    g.fill({ color: 0xddaa33 });
    // Pommel
    g.circle(stoneX, stoneY - 68, 3);
    g.fill({ color: 0xddaa33 });
    // Glow around sword
    g.circle(stoneX, stoneY - 45, 20);
    g.fill({ color: a.accentColor, alpha: 0.08 });

    // Moss-covered rocks
    for (const rx of [80, 200, 600, 720]) {
      g.ellipse(rx, floorY, 25, 12);
      g.fill({ color: 0x445544 });
      g.ellipse(rx, floorY - 4, 18, 6);
      g.fill({ color: 0x336633, alpha: 0.6 });
    }

    // Forest floor
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Leaf litter
    for (let i = 0; i < 20; i++) {
      const lx = Math.sin(i * 5.7) * sw * 0.5 + sw * 0.5;
      const ly = floorY + 5 + (i % 5) * 8;
      g.ellipse(lx, ly, 4, 2);
      g.fill({ color: 0x554422, alpha: 0.4 });
    }

    // Fog
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    this.container.addChild(g);
  }

  // ---- Generic fallback ----------------------------------------------------

  private _drawGeneric(a: DuelArenaDef, sw: number, sh: number): void {
    const g = new Graphics();
    g.rect(0, 0, sw, a.stageFloorY);
    g.fill({ color: a.skyTop });
    g.rect(0, a.stageFloorY, sw, sh - a.stageFloorY);
    g.fill({ color: a.groundColor });
    this.container.addChild(g);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
