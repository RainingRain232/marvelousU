// Procedural town renderer for BuildingView.
//
// Draws a detailed 3x3 medieval fantasy town inspired by old Italian settlements:
//   • Clusters of orange-roofed houses with stucco/stone walls
//   • Small church with bell tower
//   • Stone-paved piazza (square) with fountain
//   • Defensive towers with player-colored waving flags
//   • Gateway with stone walls and a snoring guard
//   • Merchant with a cart
//   • Two children playing with a hoop in the square
//   • Additional houses, tavern, and market stalls
//
// Animations:
//   - Hoop rotation and figure movement
//   - Guard breathing and Zzz particles
//   - Flag waving

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 3 * TS; // 192px
const TH = 3 * TS; // 192px

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
    this._playerColor = getPlayerColor(owner);

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

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
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

  // -------------------------------------------------------------------------
  // Static drawing
  // -------------------------------------------------------------------------

  private _drawStaticPavement(): void {
    const g = this._piazza;
    // Central piazza — larger area in the middle of the 3x3 grid
    const pxX = 50;
    const pxY = 55;
    const pxW = 90;
    const pxH = 80;
    g.rect(pxX, pxY, pxW, pxH).fill({ color: COL_PAVEMENT });

    // Cobblestone pattern with offset rows
    for (let row = 0; row < 6; row++) {
      const offsetX = row % 2 === 0 ? 0 : 7;
      for (let col = 0; col < 6; col++) {
        const px = pxX + 4 + col * 14 + offsetX;
        const py = pxY + 4 + row * 13;
        if (px + 12 < pxX + pxW && py + 11 < pxY + pxH) {
          g.rect(px, py, 12, 11)
            .fill({ color: 0x8b8678, alpha: 0.3 })
            .stroke({ color: 0x777766, width: 0.5, alpha: 0.2 });
        }
      }
    }

    // Fountain in center of piazza
    const fX = pxX + pxW / 2;
    const fY = pxY + pxH / 2;
    // Basin
    g.circle(fX, fY, 10)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });
    g.circle(fX, fY, 8).fill({ color: 0x4488aa });
    // Central pillar
    g.rect(fX - 2, fY - 8, 4, 10).fill({ color: COL_STONE });
    // Water spout bowl
    g.circle(fX, fY - 8, 4)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    g.circle(fX, fY - 8, 2.5).fill({ color: 0x4488aa });

    // Road from gate to piazza
    g.rect(TW / 2 - 12, pxY + pxH, 24, TH - pxY - pxH).fill({
      color: COL_PAVEMENT,
    });
    // Road cobbles
    for (let ry = pxY + pxH + 3; ry < TH - 30; ry += 10) {
      g.rect(TW / 2 - 10, ry, 8, 8).fill({ color: 0x8b8678, alpha: 0.2 });
      g.rect(TW / 2 + 2, ry, 8, 8).fill({ color: 0x8b8678, alpha: 0.2 });
    }
  }

  private _drawArchitecture(): void {
    const g = this._houses;

    // --- 1. Church (top-right area) ---
    this._drawHouse(g, 110, 25, 45, 55, true);
    this._drawBellTower(g, 155, 10);

    // --- 2. Houses around the piazza ---
    // Left side houses (stacked)
    this._drawHouse(g, 8, 20, 35, 40);
    this._drawHouse(g, 5, 65, 40, 35);
    this._drawHouse(g, 8, 108, 35, 38);

    // Top houses
    this._drawHouse(g, 50, 10, 30, 38);
    this._drawHouse(g, 82, 5, 25, 30);

    // Right side houses
    this._drawHouse(g, 148, 75, 35, 40);
    this._drawHouse(g, 150, 120, 32, 35);

    // --- 3. Tavern (bottom-left, with sign) ---
    this._drawTavern(g, 10, 152, 42, 35);

    // --- 4. Market stalls (right of piazza) ---
    this._drawMarketStall(g, 145, 58, 0xcc4444);
    this._drawMarketStall(g, 145, 48, 0x4488cc);

    // --- 5. Gateway (bottom-center) ---
    const gateX = TW / 2 - 22;
    const gateY = TH - 30;
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
    g.rect(x - 1, y, w + 2, 3).fill({ color: 0x000000, alpha: 0.1 });

    // Walls with subtle shading
    g.rect(x, y, w, h)
      .fill({ color: COL_STUCCO })
      .stroke({ color: 0xaaaaaa, width: 1 });
    // Lower wall darkened slightly
    g.rect(x + 1, y + h * 0.6, w - 2, h * 0.4 - 1).fill({
      color: COL_STUCCO_SHADE,
      alpha: 0.4,
    });

    if (isChurch) {
      // Church: steeper slate roof with ridge line
      g.moveTo(x - 5, y + 2)
        .lineTo(x + w / 2, y - 20)
        .lineTo(x + w + 5, y + 2)
        .closePath()
        .fill({ color: 0x444444 });
      // Ridge highlight
      g.moveTo(x + w / 2, y - 20)
        .lineTo(x + w / 2 + 1, y - 19)
        .lineTo(x + w + 5, y + 2)
        .closePath()
        .fill({ color: 0x555555 });
      // Cross on top
      g.moveTo(x + w / 2, y - 26)
        .lineTo(x + w / 2, y - 19)
        .stroke({ color: 0xccaa00, width: 1.5 });
      g.moveTo(x + w / 2 - 4, y - 24)
        .lineTo(x + w / 2 + 4, y - 24)
        .stroke({ color: 0xccaa00, width: 1.5 });
      // Rose window (circular stained glass)
      const rwX = x + w / 2;
      const rwY = y + 12;
      g.circle(rwX, rwY, 7)
        .fill({ color: 0x334466 })
        .stroke({ color: COL_STONE, width: 1.2 });
      // Stained glass pattern
      g.moveTo(rwX - 5, rwY)
        .lineTo(rwX + 5, rwY)
        .stroke({ color: 0xccaa44, width: 0.5 });
      g.moveTo(rwX, rwY - 5)
        .lineTo(rwX, rwY + 5)
        .stroke({ color: 0xccaa44, width: 0.5 });
      // Smaller stained glass panes
      g.circle(rwX - 3, rwY - 3, 1.5).fill({ color: 0x884422, alpha: 0.5 });
      g.circle(rwX + 3, rwY - 3, 1.5).fill({ color: 0x224488, alpha: 0.5 });
      g.circle(rwX - 3, rwY + 3, 1.5).fill({ color: 0x224488, alpha: 0.5 });
      g.circle(rwX + 3, rwY + 3, 1.5).fill({ color: 0x884422, alpha: 0.5 });
      // Side windows
      this._drawWindow(g, x + 5, y + 15, false);
      this._drawWindow(g, x + w - 12, y + 15, false);
      // Arched church door
      const dX = x + w / 2 - 7;
      const dY = y + h - 20;
      g.rect(dX, dY + 6, 14, 14).fill({ color: COL_WOOD });
      g.moveTo(dX, dY + 6)
        .bezierCurveTo(dX, dY - 3, dX + 14, dY - 3, dX + 14, dY + 6)
        .fill({ color: COL_WOOD });
      g.stroke({ color: COL_WOOD_LT, width: 0.5 });
      // Door divider
      g.moveTo(dX + 7, dY)
        .lineTo(dX + 7, dY + 20)
        .stroke({ color: 0x4a2a10, width: 0.8 });
      // Door handles
      g.circle(dX + 5, dY + 12, 0.8).fill({ color: 0xccaa44 });
      g.circle(dX + 9, dY + 12, 0.8).fill({ color: 0xccaa44 });
      // Steps
      g.rect(dX - 3, dY + 20, 20, 2).fill({ color: COL_STONE });
      g.rect(dX - 5, dY + 22, 24, 2).fill({ color: COL_STONE });
    } else {
      // Residential roof with tiles texture
      const roofH = Math.min(12, h * 0.25);
      g.moveTo(x - 3, y + 2)
        .lineTo(x + w / 2, y - roofH)
        .lineTo(x + w + 3, y + 2)
        .closePath()
        .fill({ color: COL_ROOF });
      // Roof shading (darker right side)
      g.moveTo(x + w / 2, y - roofH)
        .lineTo(x + w + 3, y + 2)
        .lineTo(x + w / 2 + 1, y - roofH + 1)
        .closePath()
        .fill({ color: COL_ROOF_SHADE, alpha: 0.4 });
      // Tile lines on roof
      for (let i = 1; i <= 3; i++) {
        const ly = y - roofH + i * (roofH / 3.5);
        const frac = i / 4;
        const lx1 = x - 3 + frac * (w / 2 + 3);
        const lx2 = x + w + 3 - frac * (w / 2 + 3);
        g.moveTo(lx1, ly)
          .lineTo(lx2, ly)
          .stroke({ color: COL_ROOF_SHADE, width: 0.5, alpha: 0.5 });
      }

      // Chimney on one side
      g.rect(x + w - 9, y - roofH + 2, 5, roofH).fill({ color: COL_CHIMNEY });
      g.rect(x + w - 10, y - roofH + 1, 7, 2).fill({ color: COL_CHIMNEY });

      // Door with frame
      const doorX = x + w / 2 - 5;
      const doorY = y + h - 14;
      g.rect(doorX - 1, doorY - 1, 12, 16).fill({ color: COL_WOOD_LT });
      g.rect(doorX, doorY, 10, 14).fill({ color: COL_WOOD });
      // Door planks
      g.moveTo(doorX + 5, doorY)
        .lineTo(doorX + 5, doorY + 14)
        .stroke({ color: 0x4a2a10, width: 0.5 });
      // Door handle
      g.circle(doorX + 7, doorY + 7, 0.8).fill({ color: 0xccaa44 });
      // Step
      g.rect(doorX - 1, doorY + 14, 12, 2).fill({ color: COL_STONE });

      // Windows — two rows if house is tall enough
      this._drawWindow(g, x + 4, y + 6, w > 28);
      this._drawWindow(g, x + w - 12, y + 6, w > 28);
      if (h > 34) {
        this._drawWindow(g, x + 4, y + h / 2 - 2, w > 28);
        this._drawWindow(g, x + w - 12, y + h / 2 - 2, w > 28);
      }

      // Flower box under one window (on bigger houses)
      if (w > 28) {
        this._drawFlowerBox(g, x + 4, y + 14);
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
    g.rect(x, y, 7, 7)
      .fill({ color: COL_WINDOW_DK })
      .stroke({ color: COL_STONE, width: 0.5 });
    // Glass panes (cross pattern)
    g.rect(x + 0.5, y + 0.5, 3, 3).fill({ color: COL_WINDOW, alpha: 0.6 });
    g.rect(x + 3.5, y + 0.5, 3, 3).fill({ color: COL_WINDOW, alpha: 0.5 });
    g.rect(x + 0.5, y + 3.5, 3, 3).fill({ color: COL_WINDOW, alpha: 0.5 });
    g.rect(x + 3.5, y + 3.5, 3, 3).fill({ color: COL_WINDOW, alpha: 0.4 });
    // Mullion (cross)
    g.moveTo(x + 3.5, y)
      .lineTo(x + 3.5, y + 7)
      .stroke({ color: COL_WOOD, width: 0.5 });
    g.moveTo(x, y + 3.5)
      .lineTo(x + 7, y + 3.5)
      .stroke({ color: COL_WOOD, width: 0.5 });
    // Sill
    g.rect(x - 1, y + 7, 9, 1.5).fill({ color: COL_STONE });
    // Shutters
    if (hasShutters) {
      g.rect(x - 3, y, 3, 7).fill({ color: COL_SHUTTER });
      g.rect(x + 7, y, 3, 7).fill({ color: COL_SHUTTER });
      for (let sy = 1; sy < 7; sy += 2) {
        g.moveTo(x - 3, y + sy)
          .lineTo(x, y + sy)
          .stroke({ color: 0x335533, width: 0.3 });
        g.moveTo(x + 7, y + sy)
          .lineTo(x + 10, y + sy)
          .stroke({ color: 0x335533, width: 0.3 });
      }
    }
  }

  /** Draws a small flower box under a window */
  private _drawFlowerBox(g: Graphics, x: number, y: number): void {
    g.rect(x - 1, y, 9, 3).fill({ color: COL_WOOD_LT });
    g.circle(x + 1, y - 1, 1).fill({ color: COL_FLOWER });
    g.circle(x + 4, y - 1.5, 1).fill({ color: COL_FLOWER2 });
    g.circle(x + 7, y - 1, 1).fill({ color: COL_FLOWER });
    g.circle(x + 2.5, y - 0.5, 0.8).fill({ color: COL_LEAF });
    g.circle(x + 5.5, y - 0.5, 0.8).fill({ color: COL_LEAF });
  }

  /** Draws a tavern with a hanging sign */
  private _drawTavern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Main building
    g.rect(x, y, w, h)
      .fill({ color: 0xd8ceb0 })
      .stroke({ color: 0xaaaaaa, width: 1 });
    // Lower wall
    g.rect(x + 1, y + h * 0.5, w - 2, h * 0.5 - 1).fill({
      color: COL_STUCCO_SHADE,
      alpha: 0.4,
    });
    // Roof
    g.moveTo(x - 3, y + 2)
      .lineTo(x + w / 2, y - 10)
      .lineTo(x + w + 3, y + 2)
      .closePath()
      .fill({ color: COL_ROOF });
    g.moveTo(x + w / 2, y - 10)
      .lineTo(x + w + 3, y + 2)
      .lineTo(x + w / 2 + 1, y - 9)
      .closePath()
      .fill({ color: COL_ROOF_SHADE, alpha: 0.4 });
    // Chimney (with smoke area — animated separately if desired)
    g.rect(x + w - 10, y - 8, 6, 10).fill({ color: COL_CHIMNEY });
    g.rect(x + w - 11, y - 9, 8, 2).fill({ color: COL_CHIMNEY });

    // Wide door
    g.rect(x + w / 2 - 7, y + h - 16, 14, 16).fill({ color: COL_WOOD });
    g.moveTo(x + w / 2, y + h - 16)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: 0x4a2a10, width: 0.8 });
    g.circle(x + w / 2 - 2, y + h - 8, 0.8).fill({ color: 0xccaa44 });
    g.circle(x + w / 2 + 2, y + h - 8, 0.8).fill({ color: 0xccaa44 });

    // Windows
    this._drawWindow(g, x + 3, y + 6, true);
    this._drawWindow(g, x + w - 11, y + 6, true);

    // Hanging sign bracket
    const signX = x + w + 2;
    const signY = y + 8;
    g.moveTo(signX - 4, signY - 2)
      .lineTo(signX + 8, signY - 2)
      .stroke({ color: 0x444444, width: 1.5 });
    // Sign board
    g.rect(signX, signY, 12, 10)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD, width: 1 });
    // Mug icon on sign
    g.rect(signX + 3, signY + 2, 5, 5).fill({ color: 0xccaa44 });
    g.rect(signX + 8, signY + 3, 2, 3)
      .stroke({ color: 0xccaa44, width: 0.8 });
    // Chain links
    g.moveTo(signX + 2, signY - 2)
      .lineTo(signX + 2, signY)
      .stroke({ color: 0x444444, width: 0.8 });
    g.moveTo(signX + 10, signY - 2)
      .lineTo(signX + 10, signY)
      .stroke({ color: 0x444444, width: 0.8 });
  }

  /** Draws a small market stall with awning */
  private _drawMarketStall(
    g: Graphics,
    x: number,
    y: number,
    awningColor: number,
  ): void {
    // Counter
    g.rect(x, y + 6, 18, 6)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3d2510, width: 0.5 });
    // Goods on counter
    g.circle(x + 4, y + 4, 2).fill({ color: 0xcc9944 });
    g.circle(x + 9, y + 3, 2.5).fill({ color: 0x88aa44 });
    g.circle(x + 14, y + 4, 2).fill({ color: 0xaa6633 });
    // Support poles
    g.rect(x, y - 2, 2, 14).fill({ color: COL_WOOD });
    g.rect(x + 16, y - 2, 2, 14).fill({ color: COL_WOOD });
    // Awning (striped)
    g.rect(x - 2, y - 4, 22, 4).fill({ color: awningColor });
    for (let sx = x; sx < x + 18; sx += 6) {
      g.rect(sx, y - 4, 3, 4).fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  private _drawBellTower(g: Graphics, x: number, y: number): void {
    const w = 18;
    const h = 65;
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Vertical mortar lines
    g.moveTo(x + w / 2, y + 12)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });

    // Horizontal course lines
    for (let ly = y + 10; ly < y + h; ly += 7) {
      g.moveTo(x + 1, ly)
        .lineTo(x + w - 1, ly)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
    }

    // Bell opening (arched window near top)
    const bx = x + w / 2 - 4;
    const by = y + 8;
    g.rect(bx, by + 4, 8, 8).fill({ color: 0x222222 });
    g.moveTo(bx, by + 4)
      .bezierCurveTo(bx, by - 2, bx + 8, by - 2, bx + 8, by + 4)
      .fill({ color: 0x222222 });
    // Bell inside
    g.moveTo(x + w / 2 - 3, by + 5)
      .bezierCurveTo(
        x + w / 2 - 3,
        by + 3,
        x + w / 2 + 3,
        by + 3,
        x + w / 2 + 3,
        by + 5,
      )
      .lineTo(x + w / 2 + 3.5, by + 6.5)
      .lineTo(x + w / 2 - 3.5, by + 6.5)
      .closePath()
      .fill({ color: 0xccaa44 });
    // Bell clapper
    g.circle(x + w / 2, by + 7, 0.7).fill({ color: 0x886622 });

    // Clock face
    const clockY = y + 28;
    g.circle(x + w / 2, clockY, 5)
      .fill({ color: 0xeeeedd })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Clock numerals (dots at 12, 3, 6, 9)
    for (let n = 0; n < 4; n++) {
      const na = (n * Math.PI) / 2 - Math.PI / 2;
      g.circle(x + w / 2 + Math.cos(na) * 3.5, clockY + Math.sin(na) * 3.5, 0.5).fill({
        color: 0x222222,
      });
    }
    // Clock hands
    g.moveTo(x + w / 2, clockY)
      .lineTo(x + w / 2, clockY - 4)
      .stroke({ color: 0x222222, width: 1 });
    g.moveTo(x + w / 2, clockY)
      .lineTo(x + w / 2 + 2.5, clockY + 1)
      .stroke({ color: 0x222222, width: 0.7 });

    // Small window below clock
    g.rect(x + w / 2 - 3, y + 40, 6, 8).fill({ color: 0x222222 });
    g.rect(x + w / 2 - 3, y + 40, 6, 8).stroke({
      color: COL_STONE_DK,
      width: 0.5,
    });

    // Domed top with finial
    g.moveTo(x - 2, y + 2)
      .bezierCurveTo(x + w / 2, y - 18, x + w / 2, y - 18, x + w + 2, y + 2)
      .fill({ color: 0x1a1a2e });
    // Finial (small ball on top)
    g.circle(x + w / 2, y - 15, 2).fill({ color: 0xccaa44 });
  }

  private _drawGate(g: Graphics, x: number, y: number): void {
    const w = 44;
    const h = 30;
    // Side walls with stone texture
    g.rect(x - 40, y + 5, 40, 20)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });
    g.rect(x + w, y + 5, 40, 20)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Wall stone courses
    for (let wy = y + 8; wy < y + 23; wy += 5) {
      g.moveTo(x - 38, wy)
        .lineTo(x - 2, wy)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
      g.moveTo(x + w + 2, wy)
        .lineTo(x + w + 38, wy)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
    }

    // Wall crenellations
    for (let cx = x - 38; cx < x - 2; cx += 7) {
      g.rect(cx, y + 2, 4, 4).fill({ color: COL_STONE });
    }
    for (let cx = x + w + 2; cx < x + w + 38; cx += 7) {
      g.rect(cx, y + 2, 4, 4).fill({ color: COL_STONE });
    }

    // Archway
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2.5 });

    // Wooden gate doors (two panels)
    const doorX = x + 4;
    const doorW = w / 2 - 6;
    const doorY = y + 6;
    const doorH = h - 6;

    // Left door
    g.rect(doorX, doorY, doorW, doorH)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.moveTo(doorX, doorY)
      .lineTo(doorX + doorW, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.moveTo(doorX + doorW, doorY)
      .lineTo(doorX, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.rect(doorX + 1, doorY + doorH / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });
    g.rect(doorX + 1, doorY + (doorH * 2) / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });

    // Right door
    const rightDoorX = x + w - doorW - 4;
    g.rect(rightDoorX, doorY, doorW, doorH)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.moveTo(rightDoorX, doorY)
      .lineTo(rightDoorX + doorW, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.moveTo(rightDoorX + doorW, doorY)
      .lineTo(rightDoorX, doorY + doorH)
      .stroke({ color: 0x3d2510, width: 1.5 });
    g.rect(rightDoorX + 1, doorY + doorH / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });
    g.rect(rightDoorX + 1, doorY + (doorH * 2) / 3, doorW - 2, 2).fill({
      color: 0x444444,
    });

    // Decorative towers with crenellations
    this._drawSmallTower(g, x - 6, y - 28);
    this._drawSmallTower(g, x + w - 12, y - 28);
  }

  private _drawSmallTower(g: Graphics, x: number, y: number): void {
    g.rect(x, y, 18, 38)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 2 });

    // Crenellations (battlements)
    for (let cx = 0; cx < 18; cx += 6) {
      g.rect(x + cx, y - 5, 4, 5).fill({ color: COL_STONE });
    }

    // Arrow slit
    g.rect(x + 7, y + 12, 3, 10).fill({ color: 0x222222 });
    g.rect(x + 5, y + 17, 7, 2).fill({ color: 0x222222 });

    // Stone course lines
    for (let ly = y + 7; ly < y + 36; ly += 7) {
      g.moveTo(x + 1, ly)
        .lineTo(x + 17, ly)
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
    }
  }

  private _drawStaticChars(): void {
    // Static chars are redrawn in _updateChildren, this is just first frame
  }

  // -------------------------------------------------------------------------
  // Character drawing helpers
  // -------------------------------------------------------------------------

  /** Draws a detailed merchant with cart */
  private _drawMerchant(g: Graphics): void {
    const cX = 62;
    const cY = 145;

    // Cart body with planks
    g.rect(cX, cY, 24, 14)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3d2510, width: 0.5 });
    // Plank lines
    g.moveTo(cX, cY + 5)
      .lineTo(cX + 24, cY + 5)
      .stroke({ color: 0x4a2a10, width: 0.3 });
    g.moveTo(cX, cY + 10)
      .lineTo(cX + 24, cY + 10)
      .stroke({ color: 0x4a2a10, width: 0.3 });
    // Goods in cart
    g.rect(cX + 2, cY - 4, 6, 6).fill({ color: 0xcc9944 });
    g.rect(cX + 9, cY - 5, 7, 7).fill({ color: 0x884422 });
    g.rect(cX + 17, cY - 3, 5, 5).fill({ color: 0x88aa44 });

    // Wheels with spokes
    for (const wx of [cX + 5, cX + 19]) {
      g.circle(wx, cY + 14, 5)
        .fill({ color: COL_WOOD_LT })
        .stroke({ color: 0x444444, width: 1.5 });
      g.circle(wx, cY + 14, 1.2).fill({ color: 0x444444 });
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        g.moveTo(wx + Math.cos(a) * 1.2, cY + 14 + Math.sin(a) * 1.2)
          .lineTo(wx + Math.cos(a) * 4, cY + 14 + Math.sin(a) * 4)
          .stroke({ color: 0x444444, width: 0.5 });
      }
    }

    // Cart handle
    g.moveTo(cX - 2, cY + 8)
      .lineTo(cX - 12, cY + 12)
      .stroke({ color: COL_WOOD, width: 1.5 });

    // Merchant figure
    const mx = cX - 12;
    const my = cY + 2;
    // Legs
    g.rect(mx - 1, my + 10, 3, 7).fill({ color: 0x554433 });
    g.rect(mx + 3, my + 10, 3, 7).fill({ color: 0x554433 });
    // Boots
    g.rect(mx - 1, my + 16, 4, 2).fill({ color: 0x332211 });
    g.rect(mx + 3, my + 16, 4, 2).fill({ color: 0x332211 });
    // Body (tunic)
    g.rect(mx - 1, my, 8, 11).fill({ color: COL_CLOTH1 });
    // Belt
    g.rect(mx - 1, my + 7, 8, 2).fill({ color: 0x664422 });
    g.circle(mx + 3, my + 8, 0.8).fill({ color: 0xccaa44 });
    // Arms
    g.rect(mx - 3, my + 1, 3, 8).fill({ color: COL_CLOTH1 });
    g.rect(mx + 6, my + 1, 3, 8).fill({ color: COL_CLOTH1 });
    // Hands
    g.circle(mx - 2, my + 9, 1.2).fill({ color: COL_SKIN });
    g.circle(mx + 8, my + 9, 1.2).fill({ color: COL_SKIN });
    // Head
    g.circle(mx + 3, my - 3, 3.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(mx + 1.5, my - 3.5, 0.5).fill({ color: 0x222222 });
    g.circle(mx + 4.5, my - 3.5, 0.5).fill({ color: 0x222222 });
    // Beard
    g.moveTo(mx + 1, my - 1)
      .bezierCurveTo(mx + 1, my + 1.5, mx + 5, my + 1.5, mx + 5, my - 1)
      .fill({ color: COL_HAIR_DK });
    // Hat
    g.rect(mx, my - 6, 6, 2).fill({ color: COL_CLOTH3 });
    g.rect(mx + 1, my - 8, 4, 3).fill({ color: COL_CLOTH3 });
  }

  /** Draws the sleeping guard with detail */
  private _drawGuard(g: Graphics, time: number): void {
    const sX = TW / 2 - 45;
    const sY = TH - 15;
    const breathe = Math.sin(time * 1.5) * 0.8;

    // Legs stretched out
    g.rect(sX - 2, sY + 1, 12, 3).fill({ color: 0x334455 });
    // Boots
    g.rect(sX + 9, sY, 5, 4).fill({ color: 0x332211 });

    // Body (seated, leaning against wall)
    g.rect(sX, sY - 9 - breathe, 8, 10 + breathe).fill({ color: 0x334455 });
    // Chainmail pattern
    for (let cy = sY - 7; cy < sY; cy += 2) {
      g.moveTo(sX + 1, cy)
        .lineTo(sX + 7, cy)
        .stroke({ color: 0x556677, width: 0.3 });
    }
    // Belt
    g.rect(sX, sY - 2, 8, 1.5).fill({ color: 0x664422 });

    // Arms (folded across body)
    g.rect(sX - 1, sY - 6 - breathe, 3, 7).fill({ color: 0x334455 });
    g.rect(sX + 6, sY - 6 - breathe, 3, 7).fill({ color: 0x334455 });
    // Hands
    g.circle(sX + 0.5, sY, 1.2).fill({ color: COL_SKIN });
    g.circle(sX + 7.5, sY, 1.2).fill({ color: COL_SKIN });

    // Head (tilted)
    g.circle(sX + 4, sY - 11 - breathe, 4).fill({ color: COL_SKIN });
    // Closed eyes
    g.moveTo(sX + 1.5, sY - 11.5 - breathe)
      .lineTo(sX + 3.5, sY - 11.5 - breathe)
      .stroke({ color: 0x222222, width: 0.7 });
    g.moveTo(sX + 4.5, sY - 11.5 - breathe)
      .lineTo(sX + 6.5, sY - 11.5 - breathe)
      .stroke({ color: 0x222222, width: 0.7 });
    // Snoring mouth
    g.circle(sX + 4, sY - 9 - breathe, 1.2).fill({ color: 0x442222 });
    // Helmet
    g.moveTo(sX, sY - 13.5 - breathe)
      .bezierCurveTo(
        sX,
        sY - 18 - breathe,
        sX + 8,
        sY - 18 - breathe,
        sX + 8,
        sY - 13.5 - breathe,
      )
      .fill({ color: 0x888888 });
    // Nose guard
    g.rect(sX + 3.5, sY - 13.5 - breathe, 1.5, 3.5).fill({ color: 0x888888 });

    // Spear leaning against wall
    g.moveTo(sX + 12, sY + 3)
      .lineTo(sX + 14, sY - 22)
      .stroke({ color: COL_WOOD, width: 1.5 });
    // Spear tip
    g.moveTo(sX + 13, sY - 22)
      .lineTo(sX + 14, sY - 27)
      .lineTo(sX + 15, sY - 22)
      .closePath()
      .fill({ color: 0xaaaaaa });

    // Shield leaning on the other side
    g.moveTo(sX - 5, sY - 4)
      .bezierCurveTo(sX - 10, sY - 4, sX - 10, sY + 5, sX - 5, sY + 5)
      .lineTo(sX - 7, sY + 8)
      .closePath()
      .fill({ color: 0x554433 })
      .stroke({ color: 0x444444, width: 0.8 });
    // Shield boss
    g.circle(sX - 7, sY + 1, 1.5).fill({ color: 0x888888 });
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
    const legSwing = Math.sin(angle * 4) * 3;
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
    g.moveTo(cx - 2 * fDir, cy - 1)
      .lineTo(cx - 2 * fDir - armSwing * 0.4, cy + 2)
      .stroke({ color, width: 1.5 });
    if (hasStick) {
      g.moveTo(cx + 2 * fDir, cy - 1)
        .lineTo(cx + 3 * fDir, cy + 1)
        .stroke({ color, width: 1.5 });
      g.circle(cx + 3 * fDir, cy + 1, 0.8).fill({ color: COL_SKIN });
    } else {
      g.moveTo(cx + 2 * fDir, cy - 1)
        .lineTo(cx + 2 * fDir + armSwing * 0.4, cy + 2)
        .stroke({ color, width: 1.5 });
      g.circle(cx + 2 * fDir + armSwing * 0.4, cy + 2, 0.8).fill({
        color: COL_SKIN,
      });
    }
    g.circle(cx - 2 * fDir - armSwing * 0.4, cy + 2, 0.8).fill({
      color: COL_SKIN,
    });

    // Head
    g.circle(cx, cy - 4, 2.5).fill({ color: COL_SKIN });
    // Hair
    g.moveTo(cx - 2, cy - 5)
      .bezierCurveTo(cx - 2, cy - 7, cx + 2, cy - 7, cx + 2, cy - 5)
      .fill({ color: hairColor });
    // Eye
    g.circle(cx + fDir * 0.8, cy - 4.5, 0.5).fill({ color: 0x222222 });
    // Smile
    g.moveTo(cx + fDir * 0.3, cy - 3)
      .lineTo(cx + fDir * 1.5, cy - 3.2)
      .stroke({ color: 0x884444, width: 0.4 });
  }

  // -------------------------------------------------------------------------
  // Animated updates
  // -------------------------------------------------------------------------

  private _updateFlags(time: number): void {
    const gateX = TW / 2 - 22;
    const gateY = TH - 30;

    const pos = [
      { x: gateX, y: gateY - 28 },
      { x: gateX + 44 - 4, y: gateY - 28 },
    ];

    for (let i = 0; i < 2; i++) {
      const f = this._flags[i];
      f.clear();
      f.position.set(pos[i].x, pos[i].y);

      // Flag pole
      f.moveTo(0, 0).lineTo(0, -14).stroke({ color: 0x888888, width: 1.2 });
      // Pole cap
      f.circle(0, -14, 1.2).fill({ color: 0xccaa44 });

      // Waving flag
      const wave1 = Math.sin(time * 3 + i) * 2;
      const wave2 = Math.sin(time * 3.5 + i + 1) * 1.5;
      f.moveTo(0, -14)
        .bezierCurveTo(4, -13 + wave1, 8, -12 + wave2, 14, -12 + wave1)
        .lineTo(14, -7 + wave1)
        .bezierCurveTo(8, -7 + wave2, 4, -8 + wave1, 0, -8)
        .closePath()
        .fill({ color: this._playerColor });
      // Flag emblem
      f.circle(7, -9.5 + (wave1 + wave2) / 2, 1.2).fill({
        color: 0xffffff,
        alpha: 0.6,
      });
    }
  }

  private _updateSnoring(time: number, _dt: number): void {
    const sX = TW / 2 - 45;
    const sY = TH - 15;

    for (let i = 0; i < 3; i++) {
      const z = this._zzz[i];
      z.clear();
      const zLife = (time * 0.5 + i * 0.3) % 1.0;
      const zY = sY - 12 - zLife * 30;
      const zX = sX + Math.sin(time * 2 + i) * 6;
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
    // Children playing in the piazza center
    const pX = 95;
    const pY = 95;

    // Children move in a circle
    const r = 18;
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
    const hX = pX + Math.cos(hAngle) * (r + 3);
    const hY = pY + Math.sin(hAngle) * (r + 3);
    // Outer ring
    g.circle(hX, hY, 6).stroke({ color: 0xccaa44, width: 1.5 });
    // Inner ring for depth
    g.circle(hX, hY, 4).stroke({ color: 0xbbaa55, width: 0.5 });
    // Rotation marks on hoop
    const hoopRot = time * 3;
    for (let s = 0; s < 4; s++) {
      const a = hoopRot + (s * Math.PI) / 2;
      g.circle(hX + Math.cos(a) * 5, hY + Math.sin(a) * 5, 0.7).fill({
        color: 0xddbb44,
      });
    }

    // Stick from child 1 to hoop
    const stickEndX = c1X + (Math.cos(angle1) > 0 ? 3 : -3);
    const stickEndY = c1Y + 1;
    g.moveTo(stickEndX, stickEndY)
      .lineTo(hX, hY + 4)
      .stroke({ color: COL_WOOD, width: 1 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
