// Procedural Royal Stable renderer for BuildingView.
//
// Draws a detailed 3×2 tile medieval fantasy royal stable with:
//   • Grand stone stable hall with timber-frame upper storey
//   • Peaked slate roof with dormer windows, ridge finials, and tile lines
//   • Two squat corner turrets with conical roofs
//   • Three horse stalls with richly animated horses (brown, black, white)
//   • Stable master with pitchfork, grooming / feeding animation
//   • Stone buttresses, arched entrance with keystone and voussoirs
//   • Stained-glass horseshoe emblem above the gate
//   • Brick pattern, stone variation, moss, and climbing ivy
//   • Hay bales, water trough, feed buckets, saddle rack, horseshoes on wall
//   • Warm lantern glow inside the stalls
//   • Waving player-colored pennants on turrets and roof ridge
//
// All drawing uses PixiJS Graphics.  3×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const PW = 3 * TS; // 192px
const PH = 2 * TS; // 128px

// --- Palette ---
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x8a6636;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_FRAME = 0x555555;
const COL_WINDOW_GLOW = 0x334466;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_HAY = 0xc9a85c;
const COL_HAY_DK = 0xa88a40;
const COL_WATER = 0x4a7a9a;
const COL_WATER_LT = 0x6a9abb;
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd0a878;
const COL_CLOTH = 0x8b6a4a;
const COL_CLOTH_DK = 0x6a4a30;
const COL_LEATHER = 0x7a5a30;
const COL_LEATHER_DK = 0x5a4020;
const COL_LANTERN_GLOW = 0xffaa44;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_GOLD = 0xccaa44;

// Horse palette
const COL_HORSE_BROWN = 0x8b5a2b;
const COL_HORSE_BROWN_DK = 0x6a4420;
const COL_HORSE_BLACK = 0x2a2a2a;
const COL_HORSE_BLACK_DK = 0x1a1a1a;
const COL_HORSE_WHITE = 0xd8d0c8;
const COL_HORSE_WHITE_DK = 0xb8b0a8;
const COL_MANE_BROWN = 0x3a2818;
const COL_MANE_BLACK = 0x1a1a1a;
const COL_MANE_WHITE = 0xaaa89a;
const COL_HOOF = 0x3a3020;
const COL_NOSTRIL = 0x442222;

// Animation timing
const FLAG_SPEED = 3.0;
const HORSE_BOB_SPEED = 2.0;
const MASTER_CYCLE = 6.0;

// ---------------------------------------------------------------------------
// StableRenderer
// ---------------------------------------------------------------------------

export class StableRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();
  private _stalls = new Graphics();
  private _props = new Graphics();
  private _horses = new Graphics();
  private _chars = new Graphics();
  private _flagL = new Graphics();
  private _flagR = new Graphics();
  private _flagC = new Graphics();
  private _lanterns = new Graphics();

  // State
  private _time = 0;
  private _ownerColor: number;

  constructor(owner: string | null) {
    this._ownerColor = getPlayerColor(owner);

    this._drawBase();
    this._drawStalls();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._stalls);
    this.container.addChild(this._props);
    this.container.addChild(this._horses);
    this.container.addChild(this._chars);
    this.container.addChild(this._lanterns);
    this.container.addChild(this._flagL);
    this.container.addChild(this._flagR);
    this.container.addChild(this._flagC);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateHorses(this._time);
    this._updateStableMaster(this._time);
    this._updateFlags(this._time);
    this._updateLanterns(this._time);
  }

  // =========================================================================
  // Static base — stone walls, turrets, roof, entrance
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation ──
    g.rect(0, PH - 10, PW, 10).fill({ color: 0x7a756d });
    // Cobblestone path in front of entrance
    const pathX = PW / 2 - 20;
    g.rect(pathX, PH - 12, 40, 4).fill({ color: COL_STONE_DK });
    for (let i = 0; i < 5; i++) {
      g.rect(pathX + 2 + i * 8, PH - 11, 6, 2).fill({
        color: COL_STONE_LT,
        alpha: 0.3,
      });
    }
    // Scattered straw on ground
    const straw = [[14, PH - 11], [45, PH - 12], [150, PH - 11], [170, PH - 12]];
    for (const [sx, sy] of straw) {
      g.moveTo(sx, sy).lineTo(sx + 6, sy - 1).stroke({ color: COL_HAY, width: 0.5, alpha: 0.5 });
      g.moveTo(sx + 2, sy).lineTo(sx + 8, sy + 1).stroke({ color: COL_HAY_DK, width: 0.4, alpha: 0.4 });
    }

    // ── Main stone wall ──
    const wallX = 20;
    const wallW = PW - 40;
    const wallY = 32;
    const wallH = PH - wallY - 14;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(wallX + 1, wallY + 1, 5, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Brick pattern
    this._drawBrickPattern(g, wallX + 2, wallY + 2, wallW - 4, wallH - 4);
    // Stone variation
    this._drawStoneVariation(g, wallX + 6, wallY + 6, wallW - 12, wallH - 12);

    // ── Timber-frame upper section ──
    const timberY = wallY;
    const timberH = 14;
    g.rect(wallX, timberY - timberH, wallW, timberH)
      .fill({ color: 0xd4c4a0 }) // plaster/wattle
      .stroke({ color: COL_WOOD_DK, width: 1 });
    // Timber beams (half-timbered)
    // Horizontal beams
    g.rect(wallX, timberY - timberH, wallW, 2).fill({ color: COL_WOOD_DK });
    g.rect(wallX, timberY - 2, wallW, 2).fill({ color: COL_WOOD_DK });
    // Vertical beams
    for (let i = 0; i <= 6; i++) {
      const bx = wallX + i * (wallW / 6);
      g.rect(bx - 1, timberY - timberH, 2, timberH).fill({ color: COL_WOOD_DK });
    }
    // Cross-braces (X pattern in each bay)
    for (let i = 0; i < 6; i++) {
      const bx = wallX + i * (wallW / 6);
      const bw = wallW / 6;
      g.moveTo(bx, timberY - timberH + 2)
        .lineTo(bx + bw, timberY - 2)
        .stroke({ color: COL_WOOD, width: 1, alpha: 0.7 });
      g.moveTo(bx + bw, timberY - timberH + 2)
        .lineTo(bx, timberY - 2)
        .stroke({ color: COL_WOOD, width: 1, alpha: 0.7 });
    }

    // ── Roof ──
    const roofBaseY = timberY - timberH;
    g.moveTo(wallX - 6, roofBaseY + 2)
      .lineTo(PW / 2, roofBaseY - 22)
      .lineTo(wallX + wallW + 6, roofBaseY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(PW / 2, roofBaseY - 22)
      .lineTo(wallX + wallW + 6, roofBaseY + 2)
      .lineTo(PW / 2 + 1, roofBaseY - 21)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });
    // Tile lines
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = roofBaseY - 22 + frac * 24;
      const halfW = ((wallW + 12) / 2) * frac;
      g.moveTo(PW / 2 - halfW, ly)
        .lineTo(PW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }
    // Ridge finial
    g.circle(PW / 2, roofBaseY - 22, 2.5).fill({ color: COL_GOLD });

    // ── Dormer window (center of roof) ──
    const dormerX = PW / 2 - 10;
    const dormerY = roofBaseY - 14;
    g.rect(dormerX, dormerY, 20, 12)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    g.moveTo(dormerX - 2, dormerY)
      .lineTo(dormerX + 10, dormerY - 8)
      .lineTo(dormerX + 22, dormerY)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Window pane
    g.rect(dormerX + 4, dormerY + 2, 12, 8).fill({ color: COL_WINDOW });
    g.moveTo(dormerX + 10, dormerY + 2)
      .lineTo(dormerX + 10, dormerY + 10)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.moveTo(dormerX + 4, dormerY + 6)
      .lineTo(dormerX + 16, dormerY + 6)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    // Warm glow
    g.rect(dormerX + 5, dormerY + 3, 4, 3).fill({ color: COL_WINDOW_GLOW, alpha: 0.3 });

    // ── Corner turrets ──
    this._drawTurret(g, 2, 14, 22, PH - 24);
    this._drawTurret(g, PW - 24, 14, 22, PH - 24);

    // ── Central arched entrance ──
    const archCX = PW / 2;
    const archW = 30;
    const archTop = wallY + 8;
    const archBot = PH - 14;
    // Arch recess
    g.rect(archCX - archW / 2, archTop + 12, archW, archBot - archTop - 12)
      .fill({ color: COL_WOOD_DK });
    g.ellipse(archCX, archTop + 12, archW / 2, 12)
      .fill({ color: COL_WOOD_DK });
    // Voussoirs (arch stones)
    for (let va = -0.8; va <= 0.8; va += 0.3) {
      const vx = archCX + Math.sin(va) * (archW / 2 + 2);
      const vy = archTop + 12 - Math.cos(va) * 14;
      g.circle(vx, vy, 2).fill({ color: COL_STONE_LT, alpha: 0.4 });
    }
    // Keystone
    g.moveTo(archCX - 4, archTop + 2)
      .lineTo(archCX, archTop - 3)
      .lineTo(archCX + 4, archTop + 2)
      .closePath()
      .fill({ color: COL_STONE_LT });

    // Wooden doors (open, showing interior)
    const doorH = archBot - archTop - 6;
    // Left door (open outward)
    g.moveTo(archCX - archW / 2, archTop + 14)
      .lineTo(archCX - archW / 2 - 6, archTop + 16)
      .lineTo(archCX - archW / 2 - 6, archTop + 14 + doorH)
      .lineTo(archCX - archW / 2, archTop + 14 + doorH)
      .closePath()
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });
    // Door hinges
    g.rect(archCX - archW / 2 - 1, archTop + 20, 3, 2).fill({ color: COL_IRON });
    g.rect(archCX - archW / 2 - 1, archTop + 14 + doorH - 10, 3, 2).fill({ color: COL_IRON });
    // Right door
    g.moveTo(archCX + archW / 2, archTop + 14)
      .lineTo(archCX + archW / 2 + 6, archTop + 16)
      .lineTo(archCX + archW / 2 + 6, archTop + 14 + doorH)
      .lineTo(archCX + archW / 2, archTop + 14 + doorH)
      .closePath()
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 1 });
    g.rect(archCX + archW / 2 - 2, archTop + 20, 3, 2).fill({ color: COL_IRON });
    g.rect(archCX + archW / 2 - 2, archTop + 14 + doorH - 10, 3, 2).fill({ color: COL_IRON });

    // ── Horseshoe emblem above entrance ──
    this._drawHorseshoeEmblem(g, archCX, wallY - 2);

    // ── Stone buttresses ──
    g.rect(wallX - 4, wallY + 10, 6, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(wallX - 4, wallY + 10)
      .lineTo(wallX + 4, wallY + 4)
      .lineTo(wallX + 4, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(wallX + wallW - 2, wallY + 10, 6, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(wallX + wallW + 4, wallY + 10)
      .lineTo(wallX + wallW - 4, wallY + 4)
      .lineTo(wallX + wallW - 4, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });

    // ── Arched windows on the wall (flanking the entrance) ──
    this._drawArchedWindow(g, wallX + 10, wallY + 10, 16, 22);
    this._drawArchedWindow(g, wallX + wallW - 26, wallY + 10, 16, 22);

    // ── Horseshoes nailed to wall (good luck) ──
    this._drawHorseshoe(g, wallX + 34, wallY + 16, 5);
    this._drawHorseshoe(g, wallX + wallW - 40, wallY + 16, 5);

    // ── Moss and ivy ──
    this._drawMoss(g, 6, PH - 20, 10);
    this._drawMoss(g, PW - 16, PH - 18, 8);
    this._drawMoss(g, wallX + 5, wallY + wallH - 2, 10);
    this._drawMoss(g, wallX + wallW - 15, wallY + wallH - 3, 8);
    this._drawMoss(g, 8, 36, 6);
    this._drawMoss(g, PW - 14, 38, 5);

    // Ivy on turrets
    this._drawIvy(g, 8, 22, 55);
    this._drawIvy(g, PW - 10, 26, 50);
    // Ivy on buttresses
    this._drawIvy(g, wallX - 2, wallY + 20, 30);
  }

  // =========================================================================
  // Turret helper
  // =========================================================================

  private _drawTurret(g: Graphics, x: number, y: number, w: number, h: number): void {
    // Main shaft
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(x + 1, y + 1, 4, h - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Brick pattern
    this._drawBrickPattern(g, x + 2, y + 2, w - 4, h - 4);

    // Conical roof
    g.moveTo(x - 3, y)
      .lineTo(x + w / 2, y - 18)
      .lineTo(x + w + 3, y)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 0.8 });
    // Roof highlight
    g.moveTo(x + w / 2, y - 18)
      .lineTo(x + w + 3, y)
      .lineTo(x + w / 2 + 1, y - 17)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });
    // Finial
    g.circle(x + w / 2, y - 18, 1.8).fill({ color: COL_GOLD });

    // Crenellations
    const merlonW = 5;
    const merlonH = 4;
    const gap = 4;
    const step = merlonW + gap;
    for (let mx = x + 1; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.4 });
    }

    // Arrow slit
    g.rect(x + w / 2 - 1, y + 20, 2, 12).fill({ color: COL_WINDOW });
    g.rect(x + w / 2 - 3, y + 24, 6, 2).fill({ color: COL_WINDOW });
    g.rect(x + w / 2 - 2, y + 19, 4, 14).stroke({ color: COL_STONE_DK, width: 0.5 });

    // Small window
    g.rect(x + w / 2 - 4, y + 44, 8, 10).fill({ color: COL_STONE_DK });
    g.rect(x + w / 2 - 3, y + 45, 6, 8).fill({ color: COL_WINDOW });
    g.moveTo(x + w / 2, y + 45)
      .lineTo(x + w / 2, y + 53)
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    g.rect(x + w / 2 - 4, y + 54, 8, 1.5).fill({ color: COL_STONE_LT });

    // Stone band
    g.rect(x - 1, y + 38, w + 2, 2).fill({ color: COL_STONE_DK });

    // Moss on base
    this._drawMoss(g, x + 3, y + h - 3, 8);
  }

  // =========================================================================
  // Stalls — wooden partitions
  // =========================================================================

  private _drawStalls(): void {
    const g = this._stalls;

    const stallX = 28;
    const stallW = 42;
    const stallY = PH - 55;
    const stallH = 43;

    for (let i = 0; i < 3; i++) {
      const sx = stallX + i * stallW;

      // Stall back wall (wood panels)
      g.rect(sx, stallY, stallW, stallH)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 1 });

      // Wood grain lines
      for (let j = 0; j < stallH; j += 5) {
        g.moveTo(sx + 2, stallY + j)
          .lineTo(sx + stallW - 2, stallY + j)
          .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.3 });
      }

      // Upper half-door (closed)
      g.rect(sx + 2, stallY, stallW - 4, stallH / 2)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: 0x3a2510, width: 1 });
      // Door panels
      g.rect(sx + 4, stallY + 2, (stallW - 8) / 2 - 1, stallH / 2 - 4)
        .stroke({ color: COL_WOOD, width: 0.5 });
      g.rect(sx + (stallW) / 2, stallY + 2, (stallW - 8) / 2 - 1, stallH / 2 - 4)
        .stroke({ color: COL_WOOD, width: 0.5 });

      // Horizontal beam
      g.rect(sx, stallY + stallH / 2 - 2, stallW, 4)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: 0x3a2510, width: 0.5 });

      // Iron latch
      g.rect(sx + stallW / 2 - 3, stallY + stallH / 2 - 4, 6, 3).fill({ color: COL_IRON });
      g.circle(sx + stallW / 2, stallY + stallH / 2 - 3, 1).fill({ color: COL_IRON_DK });

      // Divider post
      if (i < 2) {
        g.rect(sx + stallW - 2, stallY, 4, stallH)
          .fill({ color: COL_WOOD_LT })
          .stroke({ color: COL_WOOD_DK, width: 0.5 });
      }

      // Name plaque above stall
      g.rect(sx + stallW / 2 - 10, stallY - 6, 20, 6)
        .fill({ color: 0x3a2510 })
        .stroke({ color: COL_GOLD, width: 0.5 });
      // Little gold dots as decoration
      g.circle(sx + stallW / 2 - 5, stallY - 3, 0.8).fill({ color: COL_GOLD });
      g.circle(sx + stallW / 2 + 5, stallY - 3, 0.8).fill({ color: COL_GOLD });
    }
  }

  // =========================================================================
  // Props — hay, water trough, feed buckets, saddle rack
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Hay bales (stacked, right side) ──
    g.roundRect(150, PH - 28, 20, 14, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    g.roundRect(168, PH - 26, 16, 12, 2)
      .fill({ color: 0xb89850 })
      .stroke({ color: COL_HAY_DK, width: 1 });
    // Top bale
    g.roundRect(154, PH - 40, 18, 14, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    // Hay strands
    for (let i = 0; i < 3; i++) {
      g.moveTo(152 + i * 6, PH - 25)
        .lineTo(154 + i * 6, PH - 28)
        .stroke({ color: COL_HAY_DK, width: 0.3, alpha: 0.5 });
    }

    // ── Water trough (stone, left side) ──
    g.rect(6, PH - 20, 22, 10)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(8, PH - 19, 18, 7).fill({ color: COL_WATER });
    // Water surface highlight
    g.rect(10, PH - 18, 8, 1).fill({ color: COL_WATER_LT, alpha: 0.5 });
    // Support legs
    g.rect(8, PH - 10, 3, 4).fill({ color: COL_STONE_DK });
    g.rect(23, PH - 10, 3, 4).fill({ color: COL_STONE_DK });

    // ── Feed buckets (hanging by stalls) ──
    for (let i = 0; i < 3; i++) {
      const bx = 35 + i * 42;
      const by = PH - 20;
      // Bucket body
      g.moveTo(bx, by)
        .lineTo(bx - 2, by + 8)
        .lineTo(bx + 8, by + 8)
        .lineTo(bx + 6, by)
        .closePath()
        .fill({ color: COL_WOOD_LT })
        .stroke({ color: COL_WOOD_DK, width: 0.8 });
      // Iron rim
      g.rect(bx - 2, by + 1, 10, 1.5).fill({ color: COL_IRON });
      // Handle
      g.moveTo(bx, by)
        .quadraticCurveTo(bx + 3, by - 4, bx + 6, by)
        .stroke({ color: COL_IRON, width: 0.8 });
      // Grain inside
      g.rect(bx, by + 2, 6, 3).fill({ color: COL_HAY_DK, alpha: 0.5 });
    }

    // ── Saddle rack (far right) ──
    const srx = PW - 22;
    const sry = PH - 48;
    // Rack frame
    g.rect(srx, sry, 4, 36)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(srx + 12, sry, 4, 36)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Cross bar
    g.rect(srx, sry + 12, 16, 3).fill({ color: COL_WOOD_DK });
    // Saddle draped over bar
    g.moveTo(srx - 2, sry + 8)
      .quadraticCurveTo(srx + 8, sry + 4, srx + 18, sry + 8)
      .lineTo(srx + 16, sry + 12)
      .lineTo(srx, sry + 12)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 1 });
    // Saddle flap
    g.rect(srx + 2, sry + 12, 5, 8).fill({ color: COL_LEATHER_DK });
    // Stirrup
    g.moveTo(srx + 3, sry + 20)
      .lineTo(srx + 3, sry + 26)
      .quadraticCurveTo(srx + 5, sry + 28, srx + 7, sry + 26)
      .stroke({ color: COL_IRON, width: 1 });
    // Bridle hanging below
    g.moveTo(srx + 14, sry + 15)
      .quadraticCurveTo(srx + 16, sry + 22, srx + 12, sry + 28)
      .stroke({ color: COL_LEATHER, width: 1 });

    // ── Horseshoes hung on wall (decorative, above stalls) ──
    this._drawHorseshoe(g, 38, PH - 60, 4);
    this._drawHorseshoe(g, 80, PH - 62, 4);
    this._drawHorseshoe(g, 120, PH - 60, 4);
  }

  // =========================================================================
  // Animated horses (3 stalls)
  // =========================================================================

  private _updateHorses(time: number): void {
    const g = this._horses;
    g.clear();

    const stallX = 28;
    const stallW = 42;
    const colors: [number, number, number][] = [
      [COL_HORSE_BROWN, COL_HORSE_BROWN_DK, COL_MANE_BROWN],
      [COL_HORSE_BLACK, COL_HORSE_BLACK_DK, COL_MANE_BLACK],
      [COL_HORSE_WHITE, COL_HORSE_WHITE_DK, COL_MANE_WHITE],
    ];

    for (let i = 0; i < 3; i++) {
      const hx = stallX + i * stallW + stallW / 2;
      const hy = PH - 38;
      const [body, bodyDk, mane] = colors[i];

      const headBob = Math.sin(time * HORSE_BOB_SPEED + i * 1.8) * 2.5;
      const earFlick = Math.sin(time * 3.5 + i * 2) * 1;
      const tailSwish = Math.sin(time * 1.8 + i * 1.2) * 4;
      const breathe = Math.sin(time * 1.5 + i) * 0.5;

      // ── Body (elliptical barrel) ──
      g.ellipse(hx, hy + 8 + breathe, 15, 10)
        .fill({ color: body })
        .stroke({ color: bodyDk, width: 0.5 });
      // Belly highlight
      g.ellipse(hx - 2, hy + 10 + breathe, 8, 4).fill({
        color: bodyDk,
        alpha: 0.15,
      });

      // ── Legs (4, with hooves) ──
      const legPositions = [-10, -4, 3, 9];
      for (let l = 0; l < 4; l++) {
        const lx = hx + legPositions[l];
        const slight = l < 2 ? 0 : breathe * 0.3;
        g.rect(lx, hy + 15 + slight, 3, 12).fill({ color: body });
        // Hoof
        g.rect(lx - 0.5, hy + 26 + slight, 4, 3)
          .fill({ color: COL_HOOF })
          .stroke({ color: COL_HOOF, width: 0.3 });
      }

      // ── Neck ──
      g.moveTo(hx + 10, hy + 2 + headBob)
        .lineTo(hx + 16, hy - 8 + headBob)
        .lineTo(hx + 18, hy - 8 + headBob)
        .lineTo(hx + 12, hy + 4 + headBob)
        .closePath()
        .fill({ color: body });
      // Neck shading
      g.moveTo(hx + 11, hy + 2 + headBob)
        .lineTo(hx + 16, hy - 6 + headBob)
        .stroke({ color: bodyDk, width: 0.5, alpha: 0.3 });

      // ── Head ──
      const headX = hx + 16;
      const headY = hy - 12 + headBob;
      g.ellipse(headX, headY, 5, 7)
        .fill({ color: body })
        .stroke({ color: bodyDk, width: 0.5 });
      // Muzzle (lighter)
      g.ellipse(headX + 1, headY + 4, 3, 3).fill({ color: bodyDk });
      // Nostril
      g.circle(headX + 2, headY + 5, 0.8).fill({ color: COL_NOSTRIL });
      // Eye
      g.circle(headX + 2, headY - 2, 1.2).fill({ color: 0x111111 });
      // Eye highlight
      g.circle(headX + 2.3, headY - 2.3, 0.4).fill({ color: 0xffffff, alpha: 0.5 });

      // ── Ears ──
      g.moveTo(headX - 2, headY - 6)
        .lineTo(headX - 3 + earFlick, headY - 12)
        .lineTo(headX, headY - 7)
        .closePath()
        .fill({ color: body });
      g.moveTo(headX + 2, headY - 6)
        .lineTo(headX + 1 + earFlick, headY - 11)
        .lineTo(headX + 4, headY - 7)
        .closePath()
        .fill({ color: body });
      // Inner ear
      g.moveTo(headX - 1.5, headY - 7)
        .lineTo(headX - 2 + earFlick, headY - 10)
        .lineTo(headX - 0.5, headY - 7.5)
        .closePath()
        .fill({ color: COL_SKIN_DK, alpha: 0.4 });

      // ── Mane ──
      // Forelock (between ears)
      g.moveTo(headX - 1, headY - 7)
        .quadraticCurveTo(headX + 1, headY - 4 + headBob * 0.3, headX + 2, headY - 2)
        .stroke({ color: mane, width: 2 });
      // Mane along neck
      for (let m = 0; m < 4; m++) {
        const mx = hx + 11 + m * 1.5;
        const my = hy - 2 + m * 3 + headBob * (1 - m / 4);
        g.moveTo(mx, my)
          .quadraticCurveTo(mx - 3, my + 3, mx - 4, my + 6)
          .stroke({ color: mane, width: 1.5, alpha: 0.8 });
      }

      // ── Tail ──
      g.moveTo(hx - 15, hy + 4)
        .bezierCurveTo(
          hx - 20 + tailSwish * 0.5,
          hy + 10,
          hx - 22 + tailSwish,
          hy + 18,
          hx - 18 + tailSwish,
          hy + 26,
        )
        .stroke({ color: mane, width: 3 });
      // Tail tip strands
      g.moveTo(hx - 18 + tailSwish, hy + 26)
        .lineTo(hx - 20 + tailSwish * 1.1, hy + 30)
        .stroke({ color: mane, width: 2, alpha: 0.6 });
      g.moveTo(hx - 18 + tailSwish, hy + 26)
        .lineTo(hx - 16 + tailSwish * 0.9, hy + 30)
        .stroke({ color: mane, width: 1.5, alpha: 0.5 });

      // ── Bridle / halter ──
      g.moveTo(headX - 3, headY - 4)
        .lineTo(headX + 3, headY - 4)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      g.moveTo(headX + 3, headY - 4)
        .lineTo(headX + 3, headY + 2)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      g.moveTo(headX - 3, headY + 2)
        .lineTo(headX + 3, headY + 2)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      // Bit ring
      g.circle(headX + 3, headY + 2, 1).fill({ color: COL_IRON });
    }
  }

  // =========================================================================
  // Stable master — animated
  // =========================================================================

  private _updateStableMaster(time: number): void {
    const g = this._chars;
    g.clear();

    const mx = PW / 2 + 32;
    const my = PH - 22;

    const cycleT = (time % MASTER_CYCLE) / MASTER_CYCLE;
    const bob = Math.sin(time * 1.5) * 0.8;
    const armSwing = Math.sin(time * 1.2) * 3;

    // ── Legs (boots) ──
    g.rect(mx - 3, my + 2 + bob, 3, 8).fill({ color: COL_LEATHER_DK });
    g.rect(mx + 1, my + 2 + bob, 3, 8).fill({ color: COL_LEATHER_DK });
    // Boot tops
    g.rect(mx - 3, my + 2 + bob, 3, 2).fill({ color: COL_LEATHER });

    // ── Torso (stable tunic) ──
    g.rect(mx - 5, my - 12 + bob, 10, 14)
      .fill({ color: COL_CLOTH })
      .stroke({ color: COL_CLOTH_DK, width: 0.5 });
    // Belt
    g.rect(mx - 5, my - 2 + bob, 10, 2).fill({ color: COL_LEATHER });
    g.circle(mx, my - 1 + bob, 1).fill({ color: COL_GOLD }); // buckle
    // Apron
    g.rect(mx - 4, my - 1 + bob, 8, 4).fill({ color: COL_LEATHER, alpha: 0.5 });

    // ── Head ──
    g.circle(mx, my - 16 + bob, 5)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Hat (flat cap)
    g.moveTo(mx - 6, my - 18 + bob)
      .quadraticCurveTo(mx, my - 24 + bob, mx + 6, my - 18 + bob)
      .closePath()
      .fill({ color: COL_CLOTH_DK });
    g.rect(mx - 6, my - 19 + bob, 12, 2).fill({ color: COL_CLOTH });
    // Eye
    g.circle(mx + 3, my - 17 + bob, 0.8).fill({ color: 0x222222 });

    // ── Arms ──
    // Pitchfork arm (left)
    const pfAngle = armSwing * 0.3;
    g.moveTo(mx - 5, my - 10 + bob)
      .lineTo(mx - 10, my - 8 + bob + pfAngle)
      .stroke({ color: COL_SKIN, width: 2.5 });

    // Right arm (resting / holding)
    g.moveTo(mx + 5, my - 10 + bob)
      .lineTo(mx + 9, my - 6 + bob - pfAngle * 0.5)
      .stroke({ color: COL_SKIN, width: 2.5 });

    // ── Pitchfork ──
    const pfx = mx - 10;
    const pfy = my - 8 + bob + pfAngle;
    // Handle
    g.moveTo(pfx, pfy)
      .lineTo(pfx, pfy - 28)
      .stroke({ color: COL_WOOD, width: 1.8 });
    // Tines
    const isScooping = cycleT > 0.3 && cycleT < 0.6;
    const tineAngle = isScooping ? Math.sin((cycleT - 0.3) / 0.3 * Math.PI) * 0.2 : 0;
    g.moveTo(pfx - 4, pfy - 28 - tineAngle * 8)
      .lineTo(pfx - 4, pfy - 35 - tineAngle * 4)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.moveTo(pfx, pfy - 28)
      .lineTo(pfx, pfy - 36)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.moveTo(pfx + 4, pfy - 28 + tineAngle * 8)
      .lineTo(pfx + 4, pfy - 35 + tineAngle * 4)
      .stroke({ color: COL_IRON, width: 1.2 });

    // Hay on pitchfork when scooping
    if (isScooping) {
      g.moveTo(pfx - 5, pfy - 34)
        .quadraticCurveTo(pfx, pfy - 38, pfx + 5, pfy - 34)
        .fill({ color: COL_HAY, alpha: 0.7 });
    }
  }

  // =========================================================================
  // Flags / pennants
  // =========================================================================

  private _updateFlags(time: number): void {
    const flagDefs = [
      { g: this._flagL, x: 13, y: 0 },
      { g: this._flagR, x: PW - 13, y: 0 },
      { g: this._flagC, x: PW / 2, y: -12 },
    ];

    for (let i = 0; i < flagDefs.length; i++) {
      const { g, x, y } = flagDefs[i];
      g.clear();

      const wave = Math.sin(time * FLAG_SPEED + i * 2.2) * 4;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.4 + i * 2.2 + 1) * 2;

      // Pole
      g.rect(x - 1, y, 2, 16)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      g.circle(x, y, 1.5).fill({ color: COL_GOLD });

      // Pennant
      const dir = i === 1 ? -1 : 1;
      const color = i === 2 ? 0xcc2244 : this._ownerColor;

      g.moveTo(x + dir * 1, y + 2)
        .bezierCurveTo(
          x + dir * 10 + wave,
          y + 4 + wave2,
          x + dir * 14 + wave * 0.7,
          y + 8 + wave2 * 0.5,
          x + dir * 2,
          y + 14,
        )
        .lineTo(x + dir * 1, y + 12)
        .closePath()
        .fill({ color })
        .stroke({ color, width: 0.3, alpha: 0.4 });

      // Emblem dot
      g.circle(x + dir * 6 + wave * 0.3, y + 7 + wave2 * 0.2, 1.5).fill({
        color: 0xffffff,
        alpha: 0.35,
      });
    }
  }

  // =========================================================================
  // Lanterns (warm pulsing glow inside stalls)
  // =========================================================================

  private _updateLanterns(time: number): void {
    const g = this._lanterns;
    g.clear();

    const lanternPositions = [
      { x: 49, y: PH - 60 },
      { x: 91, y: PH - 62 },
      { x: 133, y: PH - 60 },
    ];

    for (let i = 0; i < lanternPositions.length; i++) {
      const { x, y } = lanternPositions[i];
      const pulse = 0.55 + Math.sin(time * 2.2 + i * 1.5) * 0.18;

      // Glow
      g.circle(x, y, 10).fill({ color: COL_LANTERN_GLOW, alpha: pulse * 0.12 });
      g.circle(x, y, 5).fill({ color: COL_LANTERN_GLOW, alpha: pulse * 0.2 });

      // Body
      g.rect(x - 2, y - 3, 4, 6)
        .fill({ color: 0x886622 })
        .stroke({ color: COL_WOOD_DK, width: 0.4 });
      // Glass
      g.rect(x - 1.5, y - 2, 3, 4).fill({ color: COL_LANTERN_GLOW, alpha: pulse });
      // Cap
      g.moveTo(x - 2.5, y - 3)
        .lineTo(x, y - 5)
        .lineTo(x + 2.5, y - 3)
        .closePath()
        .fill({ color: COL_IRON });
      // Hook
      g.moveTo(x, y - 5)
        .lineTo(x, y - 8)
        .stroke({ color: COL_IRON, width: 0.6 });
    }
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawHorseshoeEmblem(g: Graphics, cx: number, cy: number): void {
    // Stained glass horseshoe emblem above entrance
    const r = 8;
    // Background circle
    g.circle(cx, cy, r + 3).fill({ color: COL_STONE_DK });
    g.circle(cx, cy, r + 1).fill({ color: COL_WINDOW_FRAME });
    g.circle(cx, cy, r).fill({ color: 0x2244aa }); // blue glass background

    // Horseshoe shape in gold glass
    g.moveTo(cx - 5, cy - 4)
      .bezierCurveTo(cx - 5, cy - 8, cx + 5, cy - 8, cx + 5, cy - 4)
      .lineTo(cx + 5, cy + 3)
      .lineTo(cx + 3, cy + 3)
      .lineTo(cx + 3, cy - 4)
      .bezierCurveTo(cx + 3, cy - 6, cx - 3, cy - 6, cx - 3, cy - 4)
      .lineTo(cx - 3, cy + 3)
      .lineTo(cx - 5, cy + 3)
      .closePath()
      .fill({ color: 0xffcc00, alpha: 0.8 });

    // Nail holes on horseshoe
    g.circle(cx - 4, cy - 2, 0.8).fill({ color: 0x2244aa, alpha: 0.6 });
    g.circle(cx + 4, cy - 2, 0.8).fill({ color: 0x2244aa, alpha: 0.6 });
    g.circle(cx - 4, cy + 1, 0.8).fill({ color: 0x2244aa, alpha: 0.6 });
    g.circle(cx + 4, cy + 1, 0.8).fill({ color: 0x2244aa, alpha: 0.6 });

    // Lead caming circle
    g.circle(cx, cy, r + 3).stroke({ color: COL_STONE_DK, width: 1.2 });
    // Keystone
    g.moveTo(cx - 3, cy - r - 3)
      .lineTo(cx, cy - r - 5)
      .lineTo(cx + 3, cy - r - 3)
      .fill({ color: COL_STONE_LT });
  }

  private _drawHorseshoe(g: Graphics, x: number, y: number, r: number): void {
    g.moveTo(x - r, y - r * 0.3)
      .bezierCurveTo(x - r, y - r, x + r, y - r, x + r, y - r * 0.3)
      .lineTo(x + r, y + r * 0.5)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(x - r, y - r * 0.3)
      .lineTo(x - r, y + r * 0.5)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Nail dots
    g.circle(x - r + 1, y - r * 0.1, 0.6).fill({ color: COL_IRON_DK });
    g.circle(x + r - 1, y - r * 0.1, 0.6).fill({ color: COL_IRON_DK });
  }

  private _drawArchedWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Deep recess
    g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_STONE_DK });
    g.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: COL_WINDOW_FRAME });
    g.rect(x, y, w, h).fill({ color: COL_WINDOW });
    // Arched top
    g.ellipse(x + w / 2, y + 2, w / 2, 4).fill({ color: COL_WINDOW_FRAME });
    g.ellipse(x + w / 2, y + 2, w / 2 - 1.5, 2.5).fill({ color: COL_WINDOW });
    // Mullion
    g.moveTo(x + w / 2, y + 2)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.moveTo(x, y + h * 0.5)
      .lineTo(x + w, y + h * 0.5)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    // Warm interior glow
    g.rect(x + 1, y + 4, w / 2 - 1, h * 0.4).fill({ color: COL_WINDOW_GLOW, alpha: 0.25 });
    // Sill
    g.rect(x - 2, y + h + 1, w + 4, 2).fill({ color: COL_STONE_LT });
  }

  // =========================================================================
  // Stone texture helpers (matching Castle style)
  // =========================================================================

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 12;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.35 });
      }
      for (let col = offset; col < w - 8; col += 24) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 20, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.2 });
        g.moveTo(x + col + 1, y + row + 7)
          .lineTo(x + col + 20, y + row + 7)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.15 });
      }
    }
  }

  private _drawStoneVariation(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const light = [[0.1, 0.2], [0.5, 0.4], [0.25, 0.7], [0.8, 0.6], [0.6, 0.1], [0.15, 0.9]];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_LT, alpha: 0.25 });
    }
    const dark = [[0.3, 0.15], [0.7, 0.5], [0.1, 0.45], [0.55, 0.75], [0.85, 0.3]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_DK, alpha: 0.18 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2.5).fill({ color: COL_MOSS, alpha: 0.45 });
    g.circle(x + 2, y - 1, 1.5).fill({ color: COL_MOSS, alpha: 0.3 });
    g.circle(x + w - 2, y - 0.5, 1.2).fill({ color: COL_MOSS, alpha: 0.3 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    for (let iy = 0; iy < h; iy += 4) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 1).fill({ color: COL_IVY });
    }
    for (let iy = 3; iy < h; iy += 7) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 14 < 7 ? -1 : 1;
      g.circle(x + wobble + dir * 3, y + iy, 2.2).fill({ color: COL_IVY_LT, alpha: 0.7 });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.5).fill({ color: COL_IVY, alpha: 0.55 });
    }
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
