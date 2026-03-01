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
const COL_STUCCO_SHADE = 0xd5cfc0;
const COL_ROOF = 0xc05028; // Terracotta orange
const COL_ROOF_SHADE = 0xa04020;
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x555555;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_LT = 0x7a5030;
const COL_PAVEMENT = 0x9a9688;
const COL_FLAG_P1 = 0x4488ff;
const COL_FLAG_P2 = 0xff4444;
const COL_SKIN = 0xffdbac;
const COL_HAIR_DK = 0x3a2510;
const COL_HAIR_LT = 0x8b6530;
const COL_CLOTH1 = 0x4466aa;
const COL_CLOTH2 = 0xaa4444;
const COL_CLOTH3 = 0x44884a;
const COL_WINDOW = 0x88bbdd;
const COL_WINDOW_DK = 0x223344;
const COL_SHUTTER = 0x446644;
const COL_FLOWER = 0xdd4466;
const COL_FLOWER2 = 0xeebb33;
const COL_LEAF = 0x447744;
const COL_CHIMNEY = 0x665544;

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

    // Pavement pattern — cobblestone grid with offset rows
    for (let row = 0; row < 4; row++) {
      const offsetX = row % 2 === 0 ? 0 : 6;
      for (let col = 0; col < 4; col++) {
        const px = 42 + col * 12 + offsetX;
        const py = 42 + row * 12;
        g.rect(px, py, 10, 10)
          .fill({ color: 0x8b8678, alpha: 0.3 })
          .stroke({ color: 0x777766, width: 0.5, alpha: 0.2 });
      }
    }

    // Small well / fountain in the corner of piazza
    g.circle(50, 50, 4)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.circle(50, 50, 2).fill({ color: 0x4488aa });
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
    // Shadow under the roof overhang
    g.rect(x - 1, y, w + 2, 3).fill({ color: 0x00000, alpha: 0.1 });

    // Walls with subtle shading (lighter top, darker bottom)
    g.rect(x, y, w, h)
      .fill({ color: COL_STUCCO })
      .stroke({ color: 0xaaaaaa, width: 1 });
    // Lower wall darkened slightly
    g.rect(x + 1, y + h * 0.6, w - 2, h * 0.4 - 1).fill({
      color: COL_STUCCO_SHADE,
      alpha: 0.4,
    });

    // Roof
    if (isChurch) {
      // Church: steeper slate roof with ridge line
      g.moveTo(x - 4, y + 2)
        .lineTo(x + w / 2, y - 15)
        .lineTo(x + w + 4, y + 2)
        .closePath()
        .fill({ color: 0x444444 });
      // Ridge highlight
      g.moveTo(x + w / 2, y - 15)
        .lineTo(x + w / 2 + 1, y - 14)
        .lineTo(x + w + 4, y + 2)
        .closePath()
        .fill({ color: 0x555555 });
      // Cross on top
      g.moveTo(x + w / 2, y - 20)
        .lineTo(x + w / 2, y - 14)
        .stroke({ color: 0xccaa00, width: 1.5 });
      g.moveTo(x + w / 2 - 3, y - 18)
        .lineTo(x + w / 2 + 3, y - 18)
        .stroke({ color: 0xccaa00, width: 1.5 });
      // Rose window (circular stained glass)
      const rwX = x + w / 2;
      const rwY = y + 8;
      g.circle(rwX, rwY, 5)
        .fill({ color: 0x334466 })
        .stroke({ color: COL_STONE, width: 1 });
      // Stained glass cross pattern
      g.moveTo(rwX - 4, rwY)
        .lineTo(rwX + 4, rwY)
        .stroke({ color: 0xccaa44, width: 0.5 });
      g.moveTo(rwX, rwY - 4)
        .lineTo(rwX, rwY + 4)
        .stroke({ color: 0xccaa44, width: 0.5 });
      // Arched church door
      const dX = x + w / 2 - 5;
      const dY = y + h - 14;
      g.rect(dX, dY + 4, 10, 10).fill({ color: COL_WOOD });
      g.moveTo(dX, dY + 4)
        .bezierCurveTo(dX, dY - 2, dX + 10, dY - 2, dX + 10, dY + 4)
        .fill({ color: COL_WOOD });
      g.stroke({ color: COL_WOOD_LT, width: 0.5 });
      // Door handle
      g.circle(dX + 7, dY + 9, 0.8).fill({ color: 0xccaa44 });
    } else {
      // Residential roof with tiles texture
      g.moveTo(x - 2, y + 2)
        .lineTo(x + w / 2, y - 8)
        .lineTo(x + w + 2, y + 2)
        .closePath()
        .fill({ color: COL_ROOF });
      // Roof shading (darker right side)
      g.moveTo(x + w / 2, y - 8)
        .lineTo(x + w + 2, y + 2)
        .lineTo(x + w / 2 + 1, y - 7)
        .closePath()
        .fill({ color: COL_ROOF_SHADE, alpha: 0.4 });
      // Tile lines on roof
      for (let i = 1; i <= 2; i++) {
        const ly = y - 8 + i * 3.5;
        const lx1 = x - 2 + i * 2;
        const lx2 = x + w + 2 - i * 2;
        g.moveTo(lx1, ly)
          .lineTo(lx2, ly)
          .stroke({ color: COL_ROOF_SHADE, width: 0.5, alpha: 0.5 });
      }

      // Chimney on one side
      g.rect(x + w - 7, y - 6, 4, 8).fill({ color: COL_CHIMNEY });
      g.rect(x + w - 8, y - 7, 6, 2).fill({ color: COL_CHIMNEY });

      // Door with frame
      const doorX = x + w / 2 - 4;
      const doorY = y + h - 10;
      g.rect(doorX - 1, doorY - 1, 10, 12).fill({ color: COL_WOOD_LT });
      g.rect(doorX, doorY, 8, 10).fill({ color: COL_WOOD });
      // Door planks
      g.moveTo(doorX + 4, doorY)
        .lineTo(doorX + 4, doorY + 10)
        .stroke({ color: 0x4a2a10, width: 0.5 });
      // Door handle
      g.circle(doorX + 6, doorY + 5, 0.7).fill({ color: 0xccaa44 });
      // Step
      g.rect(doorX - 1, doorY + 10, 10, 2).fill({ color: COL_STONE });

      // Windows with shutters and sills
      this._drawWindow(g, x + 3, y + 5, w > 24);
      this._drawWindow(g, x + w - 10, y + 5, w > 24);

      // Flower box under one window (only on bigger houses)
      if (w > 24) {
        this._drawFlowerBox(g, x + 3, y + 12);
      }
    }
  }

  /** Draws a window with frame, shutters, and sill */
  private _drawWindow(
    g: Graphics,
    x: number,
    y: number,
    hasShutters: boolean,
  ): void {
    // Window opening
    g.rect(x, y, 6, 6)
      .fill({ color: COL_WINDOW_DK })
      .stroke({ color: COL_STONE, width: 0.5 });
    // Glass panes (cross pattern)
    g.rect(x + 0.5, y + 0.5, 2.5, 2.5).fill({ color: COL_WINDOW, alpha: 0.6 });
    g.rect(x + 3, y + 0.5, 2.5, 2.5).fill({ color: COL_WINDOW, alpha: 0.5 });
    g.rect(x + 0.5, y + 3, 2.5, 2.5).fill({ color: COL_WINDOW, alpha: 0.5 });
    g.rect(x + 3, y + 3, 2.5, 2.5).fill({ color: COL_WINDOW, alpha: 0.4 });
    // Mullion (cross)
    g.moveTo(x + 3, y)
      .lineTo(x + 3, y + 6)
      .stroke({ color: COL_WOOD, width: 0.5 });
    g.moveTo(x, y + 3)
      .lineTo(x + 6, y + 3)
      .stroke({ color: COL_WOOD, width: 0.5 });
    // Sill
    g.rect(x - 1, y + 6, 8, 1.5).fill({ color: COL_STONE });
    // Shutters
    if (hasShutters) {
      g.rect(x - 3, y, 3, 6).fill({ color: COL_SHUTTER });
      g.rect(x + 6, y, 3, 6).fill({ color: COL_SHUTTER });
      // Shutter slats
      for (let sy = 1; sy < 6; sy += 2) {
        g.moveTo(x - 3, y + sy)
          .lineTo(x, y + sy)
          .stroke({ color: 0x335533, width: 0.3 });
        g.moveTo(x + 6, y + sy)
          .lineTo(x + 9, y + sy)
          .stroke({ color: 0x335533, width: 0.3 });
      }
    }
  }

  /** Draws a small flower box under a window */
  private _drawFlowerBox(g: Graphics, x: number, y: number): void {
    g.rect(x - 1, y, 8, 3).fill({ color: COL_WOOD_LT });
    // Flowers (small dots)
    g.circle(x + 1, y - 1, 1).fill({ color: COL_FLOWER });
    g.circle(x + 3.5, y - 1.5, 1).fill({ color: COL_FLOWER2 });
    g.circle(x + 6, y - 1, 1).fill({ color: COL_FLOWER });
    // Leaves
    g.circle(x + 2.2, y - 0.5, 0.8).fill({ color: COL_LEAF });
    g.circle(x + 4.8, y - 0.5, 0.8).fill({ color: COL_LEAF });
  }

  private _drawBellTower(g: Graphics, x: number, y: number): void {
    const w = 15,
      h = 50;
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Vertical mortar lines
    g.moveTo(x + w / 2, y + 10)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });

    // Horizontal course lines
    for (let ly = y + 8; ly < y + h; ly += 6) {
      g.moveTo(x + 1, ly)
        .lineTo(x + w - 1, ly)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
    }

    // Bell opening (arched window near top)
    const bx = x + w / 2 - 3;
    const by = y + 6;
    g.rect(bx, by + 3, 6, 6).fill({ color: 0x222222 });
    g.moveTo(bx, by + 3)
      .bezierCurveTo(bx, by - 1, bx + 6, by - 1, bx + 6, by + 3)
      .fill({ color: 0x222222 });
    // Bell inside
    g.moveTo(x + w / 2 - 2, by + 4)
      .bezierCurveTo(
        x + w / 2 - 2,
        by + 2,
        x + w / 2 + 2,
        by + 2,
        x + w / 2 + 2,
        by + 4,
      )
      .lineTo(x + w / 2 + 2.5, by + 5)
      .lineTo(x + w / 2 - 2.5, by + 5)
      .closePath()
      .fill({ color: 0xccaa44 });
    // Bell clapper
    g.circle(x + w / 2, by + 5.5, 0.5).fill({ color: 0x886622 });

    // Clock face
    const clockY = y + 20;
    g.circle(x + w / 2, clockY, 4)
      .fill({ color: 0xeeeedd })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    // Clock hands
    g.moveTo(x + w / 2, clockY)
      .lineTo(x + w / 2, clockY - 3)
      .stroke({ color: 0x222222, width: 0.8 });
    g.moveTo(x + w / 2, clockY)
      .lineTo(x + w / 2 + 2, clockY + 1)
      .stroke({ color: 0x222222, width: 0.6 });

    // Domed top with finial
    g.moveTo(x - 2, y + 2)
      .bezierCurveTo(x + w / 2, y - 15, x + w / 2, y - 15, x + w + 2, y + 2)
      .fill({ color: 0x1a1a2e });
    // Finial (small ball on top)
    g.circle(x + w / 2, y - 12, 1.5).fill({ color: 0xccaa44 });
  }

  private _drawGate(g: Graphics, x: number, y: number): void {
    const w = 40,
      h = 25;
    // Side walls with stone texture
    g.rect(x - 30, y + 5, 30, 15)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });
    g.rect(x + w, y + 5, 30, 15)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Wall stone courses
    for (let wy = y + 8; wy < y + 18; wy += 4) {
      g.moveTo(x - 28, wy)
        .lineTo(x - 2, wy)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
      g.moveTo(x + w + 2, wy)
        .lineTo(x + w + 28, wy)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
    }

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

    // Decorative towers with crenellations
    this._drawSmallTower(g, x - 5, y - 20);
    this._drawSmallTower(g, x + w - 10, y - 20);
  }

  private _drawSmallTower(g: Graphics, x: number, y: number): void {
    g.rect(x, y, 15, 30)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Crenellations (battlements)
    for (let cx = 0; cx < 15; cx += 5) {
      g.rect(x + cx, y - 4, 3, 4).fill({ color: COL_STONE });
    }

    // Arrow slit
    g.rect(x + 6, y + 10, 2, 8).fill({ color: 0x222222 });
    g.rect(x + 4, y + 14, 6, 2).fill({ color: 0x222222 });

    // Stone course lines
    for (let ly = y + 6; ly < y + 28; ly += 6) {
      g.moveTo(x + 1, ly)
        .lineTo(x + 14, ly)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
    }
  }

  private _drawStaticChars(): void {
    // Static chars are redrawn in _updateChildren, this is just first frame
  }

  /** Draws a detailed merchant with cart */
  private _drawMerchant(g: Graphics): void {
    const cX = 95,
      cY = 105;

    // Cart body with planks
    g.rect(cX, cY, 20, 12)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3d2510, width: 0.5 });
    // Plank lines
    g.moveTo(cX, cY + 4)
      .lineTo(cX + 20, cY + 4)
      .stroke({ color: 0x4a2a10, width: 0.3 });
    g.moveTo(cX, cY + 8)
      .lineTo(cX + 20, cY + 8)
      .stroke({ color: 0x4a2a10, width: 0.3 });
    // Goods in cart (colorful sacks/bundles)
    g.rect(cX + 2, cY - 3, 5, 5).fill({ color: 0xcc9944 }); // sack
    g.rect(cX + 8, cY - 4, 6, 6).fill({ color: 0x884422 }); // barrel
    g.rect(cX + 15, cY - 2, 4, 4).fill({ color: 0x88aa44 }); // bundle

    // Wheels with spokes
    for (const wx of [cX + 4, cX + 16]) {
      g.circle(wx, cY + 12, 4)
        .fill({ color: COL_WOOD_LT })
        .stroke({ color: 0x444444, width: 1.5 });
      // Hub
      g.circle(wx, cY + 12, 1).fill({ color: 0x444444 });
      // Spokes
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        g.moveTo(wx + Math.cos(a) * 1, cY + 12 + Math.sin(a) * 1)
          .lineTo(wx + Math.cos(a) * 3.5, cY + 12 + Math.sin(a) * 3.5)
          .stroke({ color: 0x444444, width: 0.5 });
      }
    }

    // Cart handle
    g.moveTo(cX - 2, cY + 6)
      .lineTo(cX - 10, cY + 10)
      .stroke({ color: COL_WOOD, width: 1.5 });

    // Merchant figure — detailed
    const mx = cX - 10;
    const my = cY + 2;
    // Legs
    g.rect(mx - 1, my + 8, 3, 6).fill({ color: 0x554433 }); // left leg
    g.rect(mx + 3, my + 8, 3, 6).fill({ color: 0x554433 }); // right leg
    // Boots
    g.rect(mx - 1, my + 13, 4, 2).fill({ color: 0x332211 });
    g.rect(mx + 3, my + 13, 4, 2).fill({ color: 0x332211 });
    // Body (tunic)
    g.rect(mx - 1, my, 8, 9).fill({ color: COL_CLOTH1 });
    // Belt
    g.rect(mx - 1, my + 6, 8, 1.5).fill({ color: 0x664422 });
    g.circle(mx + 3, my + 6.5, 0.8).fill({ color: 0xccaa44 }); // buckle
    // Arms
    g.rect(mx - 3, my + 1, 3, 7).fill({ color: COL_CLOTH1 }); // left arm
    g.rect(mx + 6, my + 1, 3, 7).fill({ color: COL_CLOTH1 }); // right arm
    // Hands
    g.circle(mx - 2, my + 8, 1.2).fill({ color: COL_SKIN });
    g.circle(mx + 8, my + 8, 1.2).fill({ color: COL_SKIN });
    // Head
    g.circle(mx + 3, my - 2, 3.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(mx + 1.5, my - 2.5, 0.5).fill({ color: 0x222222 });
    g.circle(mx + 4.5, my - 2.5, 0.5).fill({ color: 0x222222 });
    // Beard
    g.moveTo(mx + 1, my)
      .bezierCurveTo(mx + 1, my + 2, mx + 5, my + 2, mx + 5, my)
      .fill({ color: COL_HAIR_DK });
    // Hat (wide brim merchant cap)
    g.rect(mx, my - 5, 6, 2).fill({ color: COL_CLOTH3 });
    g.rect(mx + 1, my - 7, 4, 3).fill({ color: COL_CLOTH3 });
  }

  /** Draws the sleeping guard with detail */
  private _drawGuard(g: Graphics, time: number): void {
    const sX = TW / 2 - 35;
    const sY = TH - 12;
    const breathe = Math.sin(time * 1.5) * 0.8;

    // Legs stretched out
    g.rect(sX - 2, sY + 1, 10, 3).fill({ color: 0x334455 });
    // Boots
    g.rect(sX + 7, sY, 4, 4).fill({ color: 0x332211 });

    // Body (seated, leaning against wall)
    g.rect(sX, sY - 8 - breathe, 7, 9 + breathe).fill({ color: 0x334455 });
    // Chainmail pattern on torso
    for (let cy = sY - 6; cy < sY; cy += 2) {
      g.moveTo(sX + 1, cy)
        .lineTo(sX + 6, cy)
        .stroke({ color: 0x556677, width: 0.3 });
    }
    // Belt
    g.rect(sX, sY - 2, 7, 1.5).fill({ color: 0x664422 });

    // Arms (folded across body)
    g.rect(sX - 1, sY - 5 - breathe, 3, 6).fill({ color: 0x334455 });
    g.rect(sX + 5, sY - 5 - breathe, 3, 6).fill({ color: 0x334455 });
    // Hands
    g.circle(sX + 0.5, sY, 1).fill({ color: COL_SKIN });
    g.circle(sX + 6.5, sY, 1).fill({ color: COL_SKIN });

    // Head (tilted to one side)
    g.circle(sX + 3.5, sY - 10 - breathe, 3.5).fill({ color: COL_SKIN });
    // Closed eyes (lines instead of dots)
    g.moveTo(sX + 1.5, sY - 10.5 - breathe)
      .lineTo(sX + 3, sY - 10.5 - breathe)
      .stroke({ color: 0x222222, width: 0.7 });
    g.moveTo(sX + 4, sY - 10.5 - breathe)
      .lineTo(sX + 5.5, sY - 10.5 - breathe)
      .stroke({ color: 0x222222, width: 0.7 });
    // Open mouth (snoring)
    g.circle(sX + 3.5, sY - 8.5 - breathe, 1).fill({ color: 0x442222 });
    // Helmet
    g.moveTo(sX, sY - 12 - breathe)
      .bezierCurveTo(
        sX,
        sY - 16 - breathe,
        sX + 7,
        sY - 16 - breathe,
        sX + 7,
        sY - 12 - breathe,
      )
      .fill({ color: 0x888888 });
    // Nose guard on helmet
    g.rect(sX + 3, sY - 12 - breathe, 1, 3).fill({ color: 0x888888 });

    // Spear leaning against wall next to him
    g.moveTo(sX + 10, sY + 3)
      .lineTo(sX + 12, sY - 18)
      .stroke({ color: COL_WOOD, width: 1.5 });
    // Spear tip
    g.moveTo(sX + 11, sY - 18)
      .lineTo(sX + 12, sY - 22)
      .lineTo(sX + 13, sY - 18)
      .closePath()
      .fill({ color: 0xaaaaaa });
  }

  /** Draws a child figure with body, limbs, and running pose */
  private _drawChild(
    g: Graphics,
    cx: number,
    cy: number,
    color: number,
    hairColor: number,
    angle: number,
    hasStick: boolean,
  ): void {
    // Running leg animation based on angle
    const legSwing = Math.sin(angle * 4) * 3;

    // Direction the child faces (based on movement angle)
    const facingRight = Math.cos(angle) > 0;
    const fDir = facingRight ? 1 : -1;

    // Legs
    g.moveTo(cx - 1, cy + 3)
      .lineTo(cx - 1 + legSwing * 0.5, cy + 7)
      .stroke({ color: 0x554433, width: 1.5 });
    g.moveTo(cx + 1, cy + 3)
      .lineTo(cx + 1 - legSwing * 0.5, cy + 7)
      .stroke({ color: 0x554433, width: 1.5 });
    // Feet
    g.circle(cx - 1 + legSwing * 0.5, cy + 7, 0.8).fill({ color: 0x332211 });
    g.circle(cx + 1 - legSwing * 0.5, cy + 7, 0.8).fill({ color: 0x332211 });

    // Body
    g.rect(cx - 2, cy - 2, 4, 6).fill({ color });

    // Arms
    const armSwing = Math.sin(angle * 4 + Math.PI) * 2;
    // Back arm
    g.moveTo(cx - 2 * fDir, cy - 1)
      .lineTo(cx - 2 * fDir - armSwing * 0.4, cy + 2)
      .stroke({ color, width: 1.5 });
    // Front arm (possibly holding stick)
    if (hasStick) {
      g.moveTo(cx + 2 * fDir, cy - 1)
        .lineTo(cx + 3 * fDir, cy + 1)
        .stroke({ color, width: 1.5 });
      // Hand
      g.circle(cx + 3 * fDir, cy + 1, 0.8).fill({ color: COL_SKIN });
    } else {
      g.moveTo(cx + 2 * fDir, cy - 1)
        .lineTo(cx + 2 * fDir + armSwing * 0.4, cy + 2)
        .stroke({ color, width: 1.5 });
      // Hand
      g.circle(cx + 2 * fDir + armSwing * 0.4, cy + 2, 0.8).fill({
        color: COL_SKIN,
      });
    }
    // Back hand
    g.circle(cx - 2 * fDir - armSwing * 0.4, cy + 2, 0.8).fill({
      color: COL_SKIN,
    });

    // Head
    g.circle(cx, cy - 4, 2.5).fill({ color: COL_SKIN });
    // Hair
    g.moveTo(cx - 2, cy - 5)
      .bezierCurveTo(cx - 2, cy - 7, cx + 2, cy - 7, cx + 2, cy - 5)
      .fill({ color: hairColor });
    // Eye (on facing side)
    g.circle(cx + fDir * 0.8, cy - 4.5, 0.5).fill({ color: 0x222222 });
    // Smile
    g.moveTo(cx + fDir * 0.3, cy - 3)
      .lineTo(cx + fDir * 1.5, cy - 3.2)
      .stroke({ color: 0x884444, width: 0.4 });
  }

  private _updateFlags(time: number): void {
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

      // Flag pole
      f.moveTo(0, 0).lineTo(0, -12).stroke({ color: 0x888888, width: 1.2 });
      // Pole cap
      f.circle(0, -12, 1).fill({ color: 0xccaa44 });

      // Waving flag with more segments for cloth-like effect
      const wave1 = Math.sin(time * 3 + i) * 2;
      const wave2 = Math.sin(time * 3.5 + i + 1) * 1.5;
      f.moveTo(0, -12)
        .bezierCurveTo(4, -11 + wave1, 7, -10 + wave2, 12, -10 + wave1)
        .lineTo(12, -6 + wave1)
        .bezierCurveTo(7, -6 + wave2, 4, -7 + wave1, 0, -7)
        .closePath()
        .fill({ color: this._playerColor });
      // Flag emblem (small dot/stripe)
      f.circle(6, -8.5 + (wave1 + wave2) / 2, 1).fill({
        color: 0xffffff,
        alpha: 0.6,
      });
    }
  }

  private _updateSnoring(time: number, _dt: number): void {
    const sX = TW / 2 - 35,
      sY = TH - 12;

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

    // Children move in a circle
    const r = 15;
    const angle1 = time * 0.8;
    const angle2 = time * 0.8 + Math.PI;

    const c1X = pX + Math.cos(angle1) * r;
    const c1Y = pY + Math.sin(angle1) * r;

    const c2X = pX + Math.cos(angle2) * r;
    const c2Y = pY + Math.sin(angle2) * r;

    g.clear();

    // Redraw merchant (static)
    this._drawMerchant(g);

    // Snoring guard (with breathing)
    this._drawGuard(g, time);

    // Child 1 — blue tunic, dark hair, holding stick for hoop
    this._drawChild(g, c1X, c1Y, COL_CLOTH1, COL_HAIR_DK, angle1, true);

    // Child 2 — red tunic, light hair, running after hoop
    this._drawChild(g, c2X, c2Y, COL_CLOTH2, COL_HAIR_LT, angle2, false);

    // The Hoop (rolling ahead of child 1)
    const hAngle = time * 0.8 + 0.4;
    const hX = pX + Math.cos(hAngle) * (r + 2);
    const hY = pY + Math.sin(hAngle) * (r + 2);
    // Outer ring
    g.circle(hX, hY, 5).stroke({ color: 0xccaa44, width: 1.5 });
    // Inner ring for depth
    g.circle(hX, hY, 3.5).stroke({ color: 0xbbaa55, width: 0.5 });
    // Rotation marks on hoop (spins as it rolls)
    const hoopRot = time * 3;
    for (let s = 0; s < 4; s++) {
      const a = hoopRot + (s * Math.PI) / 2;
      g.circle(hX + Math.cos(a) * 4, hY + Math.sin(a) * 4, 0.6).fill({
        color: 0xddbb44,
      });
    }

    // Stick from child 1 to hoop
    const stickEndX = c1X + (Math.cos(angle1) > 0 ? 3 : -3);
    const stickEndY = c1Y + 1;
    g.moveTo(stickEndX, stickEndY)
      .lineTo(hX, hY + 3)
      .stroke({ color: COL_WOOD, width: 1 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
