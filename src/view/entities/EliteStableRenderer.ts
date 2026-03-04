// Procedural Elite War Stable renderer for BuildingView.
//
// Draws a detailed 2×2 tile medieval fantasy elite war stable with:
//   • Dark obsidian-tinted stone walls with reinforced iron plating
//   • Dark slate roof with iron ridge spines and gold finials
//   • Carved stone horse-head gargoyles on the corners
//   • Three armored warhorse stalls with gold-trimmed doors
//   • Armored warhorses with barding (plate + chainmail)
//   • Elite stable master in plate armor with gold buckle
//   • Ornate iron gates at the arched entrance with gold accents
//   • Braziers with animated fire glow (instead of lanterns)
//   • Elite war banners with gold fringe
//   • Gold horseshoe decorations on walls
//   • Gold-accented saddle rack with ornate tack
//   • Darker, more imposing aesthetic throughout
//
// All drawing uses PixiJS Graphics.  2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const PW = 2 * TS; // 128px
const PH = 2 * TS; // 128px

// --- Dark Obsidian Palette (~30% darker than StableRenderer) ---
const COL_STONE = 0x585248;
const COL_STONE_LT = 0x6e6a5e;
const COL_STONE_DK = 0x3e3b34;
const COL_MORTAR = 0x4a4840;
const COL_WOOD = 0x4a3318;
const COL_WOOD_DK = 0x2a170a;
const COL_WOOD_LT = 0x634720;
const COL_ROOF = 0x2a2a30; // dark slate
const COL_ROOF_DK = 0x18181e;
const COL_ROOF_LT = 0x3a3a44;
const COL_WINDOW = 0x0e0e1e;
const COL_WINDOW_FRAME = 0x3a3a3a;
const COL_WINDOW_GLOW = 0x223344;
const COL_MOSS = 0x2a3a1e;
const COL_IVY = 0x283e1a;
const COL_IVY_LT = 0x3a5228;
const COL_HAY = 0xa08040;
const COL_HAY_DK = 0x886830;
const COL_WATER = 0x3a5a78;
const COL_WATER_LT = 0x5a7a9a;
const COL_SKIN = 0xd0a880;
const COL_SKIN_DK = 0xb08860;
const COL_CLOTH = 0x3a3040;
const COL_CLOTH_DK = 0x221828;
const COL_LEATHER = 0x5a3a18;
const COL_LEATHER_DK = 0x3a2810;
const COL_IRON = 0x444444;
const COL_IRON_DK = 0x222222;
const COL_IRON_LT = 0x5e5e5e;
const COL_GOLD = 0xddaa22;
const COL_GOLD_DK = 0xaa8818;
const COL_GOLD_LT = 0xffcc44;

// Brazier / fire palette
const COL_FIRE = 0xff6622;
const COL_FIRE_INNER = 0xffaa44;
const COL_EMBER = 0xcc3300;
const COL_BRAZIER = 0x3a3030;

// Horse palette (darker, armored warhorses)
const COL_HORSE_BROWN = 0x5a3818;
const COL_HORSE_BROWN_DK = 0x3a2410;
const COL_HORSE_BLACK = 0x1a1a1a;
const COL_HORSE_BLACK_DK = 0x0e0e0e;
const COL_HORSE_WHITE = 0xb0a898;
const COL_HORSE_WHITE_DK = 0x908880;
const COL_MANE_BROWN = 0x281808;
const COL_MANE_BLACK = 0x101010;
const COL_MANE_WHITE = 0x888070;
const COL_HOOF = 0x282018;
const COL_NOSTRIL = 0x331818;
const COL_BARDING = 0x555555; // plate barding
const COL_BARDING_DK = 0x333333;
const COL_CHAINMAIL = 0x6a6a6a;

// Animation timing
const FLAG_SPEED = 3.0;
const HORSE_BOB_SPEED = 2.0;
const MASTER_CYCLE = 6.0;
const BRAZIER_SPEED = 4.0;

// ---------------------------------------------------------------------------
// EliteStableRenderer
// ---------------------------------------------------------------------------

export class EliteStableRenderer {
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
  private _braziers = new Graphics();

  // State
  private _time = 0;
  private _ownerColor: number;

  constructor(owner: string | null) {
    this._ownerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBase();
    this._drawStalls();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._stalls);
    this.container.addChild(this._props);
    this.container.addChild(this._horses);
    this.container.addChild(this._chars);
    this.container.addChild(this._braziers);
    this.container.addChild(this._flagL);
    this.container.addChild(this._flagR);
    this.container.addChild(this._flagC);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateHorses(this._time);
    this._updateStableMaster(this._time);
    this._updateFlags(this._time);
    this._updateBraziers(this._time);
  }

  // =========================================================================
  // Static base — dark stone walls, gargoyles, iron-reinforced roof, entrance
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation ──
    g.rect(0, PH - 10, PW, 10).fill({ color: 0x3a3530 });
    // Dark cobblestone path in front of entrance
    const pathX = PW / 2 - 16;
    g.rect(pathX, PH - 12, 32, 4).fill({ color: COL_STONE_DK });
    for (let i = 0; i < 4; i++) {
      g.rect(pathX + 2 + i * 8, PH - 11, 5, 2).fill({
        color: COL_STONE_LT,
        alpha: 0.25,
      });
    }
    // Scattered straw on ground
    const straw = [[10, PH - 11], [35, PH - 12], [95, PH - 11], [115, PH - 12]];
    for (const [sx, sy] of straw) {
      g.moveTo(sx, sy).lineTo(sx + 5, sy - 1).stroke({ color: COL_HAY, width: 0.5, alpha: 0.4 });
      g.moveTo(sx + 2, sy).lineTo(sx + 7, sy + 1).stroke({ color: COL_HAY_DK, width: 0.4, alpha: 0.35 });
    }

    // ── Main dark stone wall ──
    const wallX = 14;
    const wallW = PW - 28;
    const wallY = 30;
    const wallH = PH - wallY - 14;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(wallX + 1, wallY + 1, 4, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.2 });

    // Brick pattern
    this._drawBrickPattern(g, wallX + 2, wallY + 2, wallW - 4, wallH - 4);
    // Stone variation
    this._drawStoneVariation(g, wallX + 4, wallY + 4, wallW - 8, wallH - 8);

    // ── Iron reinforcement bands on walls ──
    g.rect(wallX, wallY + 12, wallW, 2).fill({ color: COL_IRON_DK });
    g.rect(wallX, wallY + 12, wallW, 1).fill({ color: COL_IRON_LT, alpha: 0.2 });
    g.rect(wallX, wallY + wallH - 8, wallW, 2).fill({ color: COL_IRON_DK });

    // Iron rivets along bands
    for (let rx = wallX + 6; rx < wallX + wallW - 4; rx += 12) {
      g.circle(rx, wallY + 13, 1).fill({ color: COL_IRON_LT, alpha: 0.5 });
      g.circle(rx, wallY + wallH - 7, 1).fill({ color: COL_IRON_LT, alpha: 0.5 });
    }

    // ── Dark timber-frame upper section ──
    const timberY = wallY;
    const timberH = 12;
    g.rect(wallX, timberY - timberH, wallW, timberH)
      .fill({ color: 0x3a3428 }) // dark wattle/plaster
      .stroke({ color: COL_WOOD_DK, width: 1 });
    // Timber beams (half-timbered, dark)
    g.rect(wallX, timberY - timberH, wallW, 2).fill({ color: COL_WOOD_DK });
    g.rect(wallX, timberY - 2, wallW, 2).fill({ color: COL_WOOD_DK });
    // Vertical beams
    for (let i = 0; i <= 5; i++) {
      const bx = wallX + i * (wallW / 5);
      g.rect(bx - 1, timberY - timberH, 2, timberH).fill({ color: COL_WOOD_DK });
    }
    // Cross-braces
    for (let i = 0; i < 5; i++) {
      const bx = wallX + i * (wallW / 5);
      const bw = wallW / 5;
      g.moveTo(bx, timberY - timberH + 2)
        .lineTo(bx + bw, timberY - 2)
        .stroke({ color: COL_WOOD, width: 1, alpha: 0.6 });
      g.moveTo(bx + bw, timberY - timberH + 2)
        .lineTo(bx, timberY - 2)
        .stroke({ color: COL_WOOD, width: 1, alpha: 0.6 });
    }

    // ── Dark slate roof ──
    const roofBaseY = timberY - timberH;
    g.moveTo(wallX - 6, roofBaseY + 2)
      .lineTo(PW / 2, roofBaseY - 20)
      .lineTo(wallX + wallW + 6, roofBaseY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof subtle highlight
    g.moveTo(PW / 2, roofBaseY - 20)
      .lineTo(wallX + wallW + 6, roofBaseY + 2)
      .lineTo(PW / 2 + 1, roofBaseY - 19)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.2 });
    // Tile lines
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = roofBaseY - 20 + frac * 22;
      const halfW = ((wallW + 12) / 2) * frac;
      g.moveTo(PW / 2 - halfW, ly)
        .lineTo(PW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.4 });
    }
    // Iron ridge spine
    g.moveTo(PW / 2 - 20, roofBaseY - 2)
      .lineTo(PW / 2, roofBaseY - 20)
      .lineTo(PW / 2 + 20, roofBaseY - 2)
      .stroke({ color: COL_IRON_DK, width: 1.5 });
    // Gold ridge finial
    g.circle(PW / 2, roofBaseY - 20, 3).fill({ color: COL_GOLD });
    g.circle(PW / 2, roofBaseY - 20, 1.5).fill({ color: COL_GOLD_LT });

    // ── Dormer window (center of roof) ──
    const dormerX = PW / 2 - 8;
    const dormerY = roofBaseY - 12;
    g.rect(dormerX, dormerY, 16, 10)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    g.moveTo(dormerX - 2, dormerY)
      .lineTo(dormerX + 8, dormerY - 7)
      .lineTo(dormerX + 18, dormerY)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Window pane (dark)
    g.rect(dormerX + 3, dormerY + 2, 10, 6).fill({ color: COL_WINDOW });
    g.moveTo(dormerX + 8, dormerY + 2)
      .lineTo(dormerX + 8, dormerY + 8)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.moveTo(dormerX + 3, dormerY + 5)
      .lineTo(dormerX + 13, dormerY + 5)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.rect(dormerX + 4, dormerY + 3, 3, 2).fill({ color: COL_WINDOW_GLOW, alpha: 0.25 });

    // ── Horse-head gargoyles on corners ──
    this._drawGargoyle(g, wallX - 4, roofBaseY - 2, 1);
    this._drawGargoyle(g, wallX + wallW + 4, roofBaseY - 2, -1);

    // ── Central arched entrance with ornate iron gates ──
    const archCX = PW / 2;
    const archW = 24;
    const archTop = wallY + 8;
    const archBot = PH - 14;
    // Arch recess
    g.rect(archCX - archW / 2, archTop + 10, archW, archBot - archTop - 10)
      .fill({ color: COL_WOOD_DK });
    g.ellipse(archCX, archTop + 10, archW / 2, 10)
      .fill({ color: COL_WOOD_DK });
    // Voussoirs (arch stones)
    for (let va = -0.8; va <= 0.8; va += 0.3) {
      const vx = archCX + Math.sin(va) * (archW / 2 + 2);
      const vy = archTop + 10 - Math.cos(va) * 12;
      g.circle(vx, vy, 1.8).fill({ color: COL_STONE_LT, alpha: 0.35 });
    }
    // Gold-trimmed keystone
    g.moveTo(archCX - 4, archTop + 1)
      .lineTo(archCX, archTop - 4)
      .lineTo(archCX + 4, archTop + 1)
      .closePath()
      .fill({ color: COL_STONE_LT });
    g.moveTo(archCX - 4, archTop + 1)
      .lineTo(archCX, archTop - 4)
      .lineTo(archCX + 4, archTop + 1)
      .stroke({ color: COL_GOLD, width: 0.8 });

    // ── Ornate iron gates (open outward) ──
    const doorH = archBot - archTop - 8;
    // Left gate (iron with gold accents)
    g.moveTo(archCX - archW / 2, archTop + 12)
      .lineTo(archCX - archW / 2 - 5, archTop + 14)
      .lineTo(archCX - archW / 2 - 5, archTop + 12 + doorH)
      .lineTo(archCX - archW / 2, archTop + 12 + doorH)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 1 });
    // Iron gate bars
    for (let b = 1; b < 5; b++) {
      const bx = archCX - archW / 2 - b;
      g.moveTo(bx, archTop + 14)
        .lineTo(bx, archTop + 12 + doorH)
        .stroke({ color: COL_IRON_DK, width: 0.5 });
    }
    // Gold gate hinges
    g.rect(archCX - archW / 2 - 1, archTop + 18, 3, 2).fill({ color: COL_GOLD });
    g.rect(archCX - archW / 2 - 1, archTop + 12 + doorH - 8, 3, 2).fill({ color: COL_GOLD });

    // Right gate
    g.moveTo(archCX + archW / 2, archTop + 12)
      .lineTo(archCX + archW / 2 + 5, archTop + 14)
      .lineTo(archCX + archW / 2 + 5, archTop + 12 + doorH)
      .lineTo(archCX + archW / 2, archTop + 12 + doorH)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 1 });
    for (let b = 1; b < 5; b++) {
      const bx = archCX + archW / 2 + b;
      g.moveTo(bx, archTop + 14)
        .lineTo(bx, archTop + 12 + doorH)
        .stroke({ color: COL_IRON_DK, width: 0.5 });
    }
    g.rect(archCX + archW / 2 - 2, archTop + 18, 3, 2).fill({ color: COL_GOLD });
    g.rect(archCX + archW / 2 - 2, archTop + 12 + doorH - 8, 3, 2).fill({ color: COL_GOLD });

    // ── Gold horseshoe emblem above entrance ──
    this._drawHorseshoeEmblem(g, archCX, wallY - 2);

    // ── Stone buttresses (darker, heavier) ──
    g.rect(wallX - 3, wallY + 8, 5, wallH - 12)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(wallX - 3, wallY + 8)
      .lineTo(wallX + 3, wallY + 3)
      .lineTo(wallX + 3, wallY + 8)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(wallX + wallW - 2, wallY + 8, 5, wallH - 12)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(wallX + wallW + 3, wallY + 8)
      .lineTo(wallX + wallW - 3, wallY + 3)
      .lineTo(wallX + wallW - 3, wallY + 8)
      .closePath()
      .fill({ color: COL_STONE_DK });

    // ── Arched windows (flanking entrance) ──
    this._drawArchedWindow(g, wallX + 6, wallY + 10, 12, 18);
    this._drawArchedWindow(g, wallX + wallW - 18, wallY + 10, 12, 18);

    // ── Gold horseshoe decorations on wall ──
    this._drawGoldHorseshoe(g, wallX + 24, wallY + 14, 4);
    this._drawGoldHorseshoe(g, wallX + wallW - 28, wallY + 14, 4);

    // ── Moss and ivy (darker) ──
    this._drawMoss(g, 4, PH - 18, 8);
    this._drawMoss(g, PW - 12, PH - 16, 7);
    this._drawMoss(g, wallX + 3, wallY + wallH - 2, 8);
    this._drawMoss(g, wallX + wallW - 12, wallY + wallH - 3, 7);

    // Ivy on buttresses
    this._drawIvy(g, wallX - 1, wallY + 16, 28);
    this._drawIvy(g, wallX + wallW + 2, wallY + 18, 24);
  }

  // =========================================================================
  // Horse-head gargoyle (carved stone)
  // =========================================================================

  private _drawGargoyle(g: Graphics, x: number, y: number, dir: number): void {
    // Stone bracket
    g.rect(x - dir * 2, y, 4, 6).fill({ color: COL_STONE_DK });

    // Horse head shape
    const hx = x + dir * 6;
    const hy = y + 2;
    // Neck extension
    g.moveTo(x, y + 1)
      .lineTo(hx - dir * 2, hy - 3)
      .lineTo(hx - dir * 2, hy + 4)
      .lineTo(x, y + 5)
      .closePath()
      .fill({ color: COL_STONE_DK });
    // Head
    g.ellipse(hx, hy, 4, 5)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: 0x2a2820, width: 0.5 });
    // Muzzle
    g.ellipse(hx + dir * 3, hy + 2, 2, 2.5).fill({ color: COL_STONE });
    // Nostril
    g.circle(hx + dir * 4, hy + 2, 0.7).fill({ color: 0x1a1a1a });
    // Eye
    g.circle(hx + dir * 1, hy - 1, 0.8).fill({ color: 0x1a1a1a });
    // Ear
    g.moveTo(hx - dir * 1, hy - 4)
      .lineTo(hx, hy - 8)
      .lineTo(hx + dir * 1, hy - 4)
      .closePath()
      .fill({ color: COL_STONE_DK });
    // Gold eye accent
    g.circle(hx + dir * 1, hy - 1, 0.4).fill({ color: COL_GOLD, alpha: 0.5 });
  }

  // =========================================================================
  // Stalls — gold-trimmed doors with iron fittings
  // =========================================================================

  private _drawStalls(): void {
    const g = this._stalls;

    const stallX = 18;
    const stallW = 30;
    const stallY = PH - 50;
    const stallH = 38;

    for (let i = 0; i < 3; i++) {
      const sx = stallX + i * stallW;

      // Stall back wall (dark wood panels)
      g.rect(sx, stallY, stallW, stallH)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 1 });

      // Wood grain lines
      for (let j = 0; j < stallH; j += 5) {
        g.moveTo(sx + 2, stallY + j)
          .lineTo(sx + stallW - 2, stallY + j)
          .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.3 });
      }

      // Upper half-door (gold-trimmed)
      g.rect(sx + 2, stallY, stallW - 4, stallH / 2)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: COL_GOLD_DK, width: 1 }); // gold trim!
      // Door panels
      g.rect(sx + 4, stallY + 2, (stallW - 8) / 2 - 1, stallH / 2 - 4)
        .stroke({ color: COL_WOOD, width: 0.5 });
      g.rect(sx + stallW / 2, stallY + 2, (stallW - 8) / 2 - 1, stallH / 2 - 4)
        .stroke({ color: COL_WOOD, width: 0.5 });

      // Gold corner studs on door
      g.circle(sx + 4, stallY + 3, 0.8).fill({ color: COL_GOLD });
      g.circle(sx + stallW - 4, stallY + 3, 0.8).fill({ color: COL_GOLD });
      g.circle(sx + 4, stallY + stallH / 2 - 3, 0.8).fill({ color: COL_GOLD });
      g.circle(sx + stallW - 4, stallY + stallH / 2 - 3, 0.8).fill({ color: COL_GOLD });

      // Horizontal beam
      g.rect(sx, stallY + stallH / 2 - 2, stallW, 4)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: COL_GOLD_DK, width: 0.5 }); // gold edge

      // Ornate iron latch with gold accent
      g.rect(sx + stallW / 2 - 3, stallY + stallH / 2 - 4, 6, 3).fill({ color: COL_IRON });
      g.circle(sx + stallW / 2, stallY + stallH / 2 - 3, 1.2).fill({ color: COL_GOLD });

      // Iron reinforcement straps on door
      g.rect(sx + 2, stallY + 6, stallW - 4, 1).fill({ color: COL_IRON_DK, alpha: 0.5 });
      g.rect(sx + 2, stallY + stallH / 2 - 6, stallW - 4, 1).fill({ color: COL_IRON_DK, alpha: 0.5 });

      // Divider post
      if (i < 2) {
        g.rect(sx + stallW - 2, stallY, 4, stallH)
          .fill({ color: COL_WOOD_LT })
          .stroke({ color: COL_WOOD_DK, width: 0.5 });
        // Iron cap on post
        g.rect(sx + stallW - 2, stallY - 2, 4, 3).fill({ color: COL_IRON });
      }

      // Name plaque (gold-bordered)
      g.rect(sx + stallW / 2 - 8, stallY - 6, 16, 6)
        .fill({ color: 0x2a170a })
        .stroke({ color: COL_GOLD, width: 0.8 });
      // Gold horseshoe icon on plaque
      g.moveTo(sx + stallW / 2 - 3, stallY - 4)
        .bezierCurveTo(sx + stallW / 2 - 3, stallY - 6, sx + stallW / 2 + 3, stallY - 6, sx + stallW / 2 + 3, stallY - 4)
        .lineTo(sx + stallW / 2 + 3, stallY - 2)
        .stroke({ color: COL_GOLD_LT, width: 0.6 });
      g.moveTo(sx + stallW / 2 - 3, stallY - 4)
        .lineTo(sx + stallW / 2 - 3, stallY - 2)
        .stroke({ color: COL_GOLD_LT, width: 0.6 });
    }
  }

  // =========================================================================
  // Props — hay, trough, feed, ornate saddle rack, gold horseshoes
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Hay bales (stacked, right side) ──
    g.roundRect(100, PH - 26, 16, 12, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    g.roundRect(114, PH - 24, 12, 10, 2)
      .fill({ color: 0x907838 })
      .stroke({ color: COL_HAY_DK, width: 1 });
    // Hay strands
    for (let i = 0; i < 3; i++) {
      g.moveTo(102 + i * 5, PH - 23)
        .lineTo(104 + i * 5, PH - 26)
        .stroke({ color: COL_HAY_DK, width: 0.3, alpha: 0.5 });
    }

    // ── Water trough (dark stone) ──
    g.rect(2, PH - 18, 18, 8)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: 0x2a2820, width: 1 });
    g.rect(4, PH - 17, 14, 5).fill({ color: COL_WATER });
    g.rect(6, PH - 16, 6, 1).fill({ color: COL_WATER_LT, alpha: 0.4 });
    // Support legs
    g.rect(4, PH - 10, 3, 3).fill({ color: COL_STONE_DK });
    g.rect(15, PH - 10, 3, 3).fill({ color: COL_STONE_DK });

    // ── Feed buckets (iron, by stalls) ──
    for (let i = 0; i < 3; i++) {
      const bx = 24 + i * 30;
      const by = PH - 18;
      // Dark iron bucket
      g.moveTo(bx, by)
        .lineTo(bx - 2, by + 6)
        .lineTo(bx + 7, by + 6)
        .lineTo(bx + 5, by)
        .closePath()
        .fill({ color: COL_IRON })
        .stroke({ color: COL_IRON_DK, width: 0.8 });
      // Iron rim
      g.rect(bx - 2, by + 1, 9, 1.2).fill({ color: COL_IRON_LT });
      // Handle
      g.moveTo(bx, by)
        .quadraticCurveTo(bx + 2.5, by - 3, bx + 5, by)
        .stroke({ color: COL_IRON_DK, width: 0.8 });
      // Grain
      g.rect(bx, by + 2, 5, 2).fill({ color: COL_HAY_DK, alpha: 0.5 });
    }

    // ── Gold-accented saddle rack (far right) ──
    const srx = PW - 18;
    const sry = PH - 44;
    // Rack frame (dark wood)
    g.rect(srx, sry, 3, 32)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(srx + 10, sry, 3, 32)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Gold-capped top
    g.rect(srx - 1, sry - 1, 5, 2).fill({ color: COL_GOLD });
    g.rect(srx + 9, sry - 1, 5, 2).fill({ color: COL_GOLD });
    // Cross bar
    g.rect(srx, sry + 10, 13, 2).fill({ color: COL_WOOD_DK });
    // Ornate saddle (gold-trimmed leather)
    g.moveTo(srx - 2, sry + 6)
      .quadraticCurveTo(srx + 6, sry + 2, srx + 15, sry + 6)
      .lineTo(srx + 13, sry + 10)
      .lineTo(srx, sry + 10)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_GOLD_DK, width: 0.8 }); // gold trim!
    // Saddle flap
    g.rect(srx + 1, sry + 10, 4, 7).fill({ color: COL_LEATHER_DK });
    // Gold saddle stud
    g.circle(srx + 6, sry + 5, 1).fill({ color: COL_GOLD_LT });
    // Stirrup (gold-tinted iron)
    g.moveTo(srx + 2, sry + 17)
      .lineTo(srx + 2, sry + 22)
      .quadraticCurveTo(srx + 4, sry + 24, srx + 6, sry + 22)
      .stroke({ color: COL_GOLD_DK, width: 1 });
    // Ornate bridle with gold bit
    g.moveTo(srx + 11, sry + 13)
      .quadraticCurveTo(srx + 13, sry + 18, srx + 9, sry + 24)
      .stroke({ color: COL_LEATHER, width: 1 });
    g.circle(srx + 9, sry + 24, 1).fill({ color: COL_GOLD }); // gold bit ring

    // ── Gold horseshoes hung on wall (decorative) ──
    this._drawGoldHorseshoe(g, 28, PH - 54, 3.5);
    this._drawGoldHorseshoe(g, 58, PH - 56, 3.5);
    this._drawGoldHorseshoe(g, 88, PH - 54, 3.5);
  }

  // =========================================================================
  // Animated armored warhorses (3 stalls)
  // =========================================================================

  private _updateHorses(time: number): void {
    const g = this._horses;
    g.clear();

    const stallX = 18;
    const stallW = 30;
    const colors: [number, number, number][] = [
      [COL_HORSE_BROWN, COL_HORSE_BROWN_DK, COL_MANE_BROWN],
      [COL_HORSE_BLACK, COL_HORSE_BLACK_DK, COL_MANE_BLACK],
      [COL_HORSE_WHITE, COL_HORSE_WHITE_DK, COL_MANE_WHITE],
    ];

    for (let i = 0; i < 3; i++) {
      const hx = stallX + i * stallW + stallW / 2;
      const hy = PH - 34;
      const [body, bodyDk, mane] = colors[i];

      const headBob = Math.sin(time * HORSE_BOB_SPEED + i * 1.8) * 2;
      const earFlick = Math.sin(time * 3.5 + i * 2) * 1;
      const tailSwish = Math.sin(time * 1.8 + i * 1.2) * 3;
      const breathe = Math.sin(time * 1.5 + i) * 0.4;

      // ── Body (elliptical barrel) ──
      g.ellipse(hx, hy + 6 + breathe, 11, 8)
        .fill({ color: body })
        .stroke({ color: bodyDk, width: 0.5 });
      // Belly shadow
      g.ellipse(hx - 1, hy + 8 + breathe, 6, 3).fill({
        color: bodyDk,
        alpha: 0.15,
      });

      // ── Plate barding on body ──
      g.ellipse(hx, hy + 5 + breathe, 10, 6)
        .fill({ color: COL_BARDING, alpha: 0.35 })
        .stroke({ color: COL_BARDING_DK, width: 0.5 });
      // Chainmail skirt
      g.rect(hx - 8, hy + 10 + breathe, 16, 3).fill({ color: COL_CHAINMAIL, alpha: 0.3 });
      // Gold trim on barding
      g.ellipse(hx, hy + 5 + breathe, 10, 6)
        .stroke({ color: COL_GOLD_DK, width: 0.4, alpha: 0.5 });

      // ── Legs (4, with armored hooves) ──
      const legPositions = [-7, -3, 2, 6];
      for (let l = 0; l < 4; l++) {
        const lx = hx + legPositions[l];
        const slight = l < 2 ? 0 : breathe * 0.3;
        g.rect(lx, hy + 12 + slight, 2.5, 10).fill({ color: body });
        // Armored greave
        g.rect(lx - 0.5, hy + 12 + slight, 3.5, 4).fill({ color: COL_BARDING, alpha: 0.4 });
        // Hoof
        g.rect(lx - 0.5, hy + 21 + slight, 3.5, 2.5)
          .fill({ color: COL_HOOF })
          .stroke({ color: COL_HOOF, width: 0.3 });
      }

      // ── Neck ──
      g.moveTo(hx + 8, hy + 1 + headBob)
        .lineTo(hx + 12, hy - 7 + headBob)
        .lineTo(hx + 14, hy - 7 + headBob)
        .lineTo(hx + 10, hy + 3 + headBob)
        .closePath()
        .fill({ color: body });
      // Neck armor (plate)
      g.moveTo(hx + 9, hy + 1 + headBob)
        .lineTo(hx + 12, hy - 5 + headBob)
        .lineTo(hx + 13, hy - 5 + headBob)
        .lineTo(hx + 10, hy + 2 + headBob)
        .closePath()
        .fill({ color: COL_BARDING, alpha: 0.4 });

      // ── Head ──
      const headX = hx + 12;
      const headY = hy - 10 + headBob;
      g.ellipse(headX, headY, 4, 5.5)
        .fill({ color: body })
        .stroke({ color: bodyDk, width: 0.5 });
      // Chanfron (head armor)
      g.ellipse(headX, headY - 1, 3, 4)
        .fill({ color: COL_BARDING, alpha: 0.35 })
        .stroke({ color: COL_BARDING_DK, width: 0.3 });
      // Gold stripe on chanfron
      g.moveTo(headX, headY - 5)
        .lineTo(headX, headY + 1)
        .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.6 });
      // Muzzle
      g.ellipse(headX + 1, headY + 3, 2.5, 2.5).fill({ color: bodyDk });
      // Nostril
      g.circle(headX + 2, headY + 4, 0.7).fill({ color: COL_NOSTRIL });
      // Eye
      g.circle(headX + 2, headY - 2, 1).fill({ color: 0x111111 });
      g.circle(headX + 2.2, headY - 2.2, 0.3).fill({ color: 0xffffff, alpha: 0.5 });

      // ── Ears ──
      g.moveTo(headX - 2, headY - 5)
        .lineTo(headX - 3 + earFlick, headY - 10)
        .lineTo(headX, headY - 6)
        .closePath()
        .fill({ color: body });
      g.moveTo(headX + 1, headY - 5)
        .lineTo(headX + earFlick, headY - 9)
        .lineTo(headX + 3, headY - 6)
        .closePath()
        .fill({ color: body });
      // Inner ear
      g.moveTo(headX - 1.5, headY - 6)
        .lineTo(headX - 2 + earFlick, headY - 9)
        .lineTo(headX - 0.5, headY - 6.5)
        .closePath()
        .fill({ color: COL_SKIN_DK, alpha: 0.3 });

      // ── Mane ──
      g.moveTo(headX - 1, headY - 6)
        .quadraticCurveTo(headX + 1, headY - 3 + headBob * 0.3, headX + 1.5, headY - 1)
        .stroke({ color: mane, width: 1.5 });
      for (let m = 0; m < 3; m++) {
        const mx = hx + 9 + m * 1.2;
        const my = hy - 2 + m * 2.5 + headBob * (1 - m / 3);
        g.moveTo(mx, my)
          .quadraticCurveTo(mx - 2.5, my + 2.5, mx - 3, my + 5)
          .stroke({ color: mane, width: 1.2, alpha: 0.8 });
      }

      // ── Tail ──
      g.moveTo(hx - 11, hy + 3)
        .bezierCurveTo(
          hx - 15 + tailSwish * 0.5,
          hy + 8,
          hx - 17 + tailSwish,
          hy + 15,
          hx - 14 + tailSwish,
          hy + 22,
        )
        .stroke({ color: mane, width: 2.5 });
      g.moveTo(hx - 14 + tailSwish, hy + 22)
        .lineTo(hx - 16 + tailSwish * 1.1, hy + 25)
        .stroke({ color: mane, width: 1.8, alpha: 0.6 });

      // ── Bridle / halter (gold-accented) ──
      g.moveTo(headX - 2.5, headY - 3)
        .lineTo(headX + 2.5, headY - 3)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      g.moveTo(headX + 2.5, headY - 3)
        .lineTo(headX + 2.5, headY + 1.5)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      g.moveTo(headX - 2.5, headY + 1.5)
        .lineTo(headX + 2.5, headY + 1.5)
        .stroke({ color: COL_LEATHER, width: 0.8 });
      // Gold bit ring
      g.circle(headX + 2.5, headY + 1.5, 0.8).fill({ color: COL_GOLD });
    }
  }

  // =========================================================================
  // Stable master — armored elite, animated
  // =========================================================================

  private _updateStableMaster(time: number): void {
    const g = this._chars;
    g.clear();

    const mx = PW / 2 + 22;
    const my = PH - 20;

    const cycleT = (time % MASTER_CYCLE) / MASTER_CYCLE;
    const bob = Math.sin(time * 1.5) * 0.7;
    const armSwing = Math.sin(time * 1.2) * 2.5;

    // ── Legs (armored boots) ──
    g.rect(mx - 3, my + 2 + bob, 3, 7).fill({ color: COL_IRON });
    g.rect(mx + 1, my + 2 + bob, 3, 7).fill({ color: COL_IRON });
    // Boot soles
    g.rect(mx - 3, my + 8 + bob, 3, 1).fill({ color: COL_IRON_DK });
    g.rect(mx + 1, my + 8 + bob, 3, 1).fill({ color: COL_IRON_DK });

    // ── Torso (dark plate armor) ──
    g.rect(mx - 5, my - 11 + bob, 10, 13)
      .fill({ color: COL_CLOTH })
      .stroke({ color: COL_CLOTH_DK, width: 0.5 });
    // Chest plate
    g.rect(mx - 4, my - 10 + bob, 8, 8)
      .fill({ color: COL_IRON, alpha: 0.5 })
      .stroke({ color: COL_IRON_DK, width: 0.3 });
    // Gold belt
    g.rect(mx - 5, my - 1 + bob, 10, 2).fill({ color: COL_GOLD_DK });
    g.circle(mx, my + bob, 1.2).fill({ color: COL_GOLD_LT }); // gold buckle
    // Shoulder pauldrons
    g.ellipse(mx - 5, my - 9 + bob, 3, 2).fill({ color: COL_IRON });
    g.ellipse(mx + 5, my - 9 + bob, 3, 2).fill({ color: COL_IRON });
    // Gold trim on pauldrons
    g.ellipse(mx - 5, my - 9 + bob, 3, 2).stroke({ color: COL_GOLD_DK, width: 0.4 });
    g.ellipse(mx + 5, my - 9 + bob, 3, 2).stroke({ color: COL_GOLD_DK, width: 0.4 });

    // ── Head ──
    g.circle(mx, my - 15 + bob, 4.5)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Helm (open-face)
    g.moveTo(mx - 5, my - 16 + bob)
      .quadraticCurveTo(mx, my - 22 + bob, mx + 5, my - 16 + bob)
      .closePath()
      .fill({ color: COL_IRON });
    g.rect(mx - 5, my - 17 + bob, 10, 2).fill({ color: COL_IRON_DK });
    // Gold crest on helm
    g.moveTo(mx, my - 22 + bob)
      .lineTo(mx, my - 24 + bob)
      .stroke({ color: COL_GOLD, width: 1.2 });
    g.circle(mx, my - 24 + bob, 1).fill({ color: COL_GOLD_LT });
    // Eye
    g.circle(mx + 2.5, my - 15.5 + bob, 0.7).fill({ color: 0x222222 });

    // ── Arms ──
    // Pitchfork arm (left)
    const pfAngle = armSwing * 0.3;
    g.moveTo(mx - 5, my - 9 + bob)
      .lineTo(mx - 9, my - 7 + bob + pfAngle)
      .stroke({ color: COL_SKIN, width: 2 });

    // Right arm
    g.moveTo(mx + 5, my - 9 + bob)
      .lineTo(mx + 8, my - 5 + bob - pfAngle * 0.5)
      .stroke({ color: COL_SKIN, width: 2 });

    // ── Pitchfork ──
    const pfx = mx - 9;
    const pfy = my - 7 + bob + pfAngle;
    g.moveTo(pfx, pfy)
      .lineTo(pfx, pfy - 24)
      .stroke({ color: COL_WOOD, width: 1.5 });
    // Tines (iron)
    const isScooping = cycleT > 0.3 && cycleT < 0.6;
    const tineAngle = isScooping ? Math.sin((cycleT - 0.3) / 0.3 * Math.PI) * 0.2 : 0;
    g.moveTo(pfx - 3, pfy - 24 - tineAngle * 7)
      .lineTo(pfx - 3, pfy - 30 - tineAngle * 3)
      .stroke({ color: COL_IRON, width: 1 });
    g.moveTo(pfx, pfy - 24)
      .lineTo(pfx, pfy - 31)
      .stroke({ color: COL_IRON, width: 1 });
    g.moveTo(pfx + 3, pfy - 24 + tineAngle * 7)
      .lineTo(pfx + 3, pfy - 30 + tineAngle * 3)
      .stroke({ color: COL_IRON, width: 1 });

    // Hay on pitchfork when scooping
    if (isScooping) {
      g.moveTo(pfx - 4, pfy - 29)
        .quadraticCurveTo(pfx, pfy - 33, pfx + 4, pfy - 29)
        .fill({ color: COL_HAY, alpha: 0.7 });
    }
  }

  // =========================================================================
  // Flags / elite war banners (with gold fringe)
  // =========================================================================

  private _updateFlags(time: number): void {
    const flagDefs = [
      { g: this._flagL, x: wallLeftEdge(), y: -2 },
      { g: this._flagR, x: wallRightEdge(), y: -2 },
      { g: this._flagC, x: PW / 2, y: -14 },
    ];

    for (let i = 0; i < flagDefs.length; i++) {
      const { g, x, y } = flagDefs[i];
      g.clear();

      const wave = Math.sin(time * FLAG_SPEED + i * 2.2) * 4;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.4 + i * 2.2 + 1) * 2;

      // Dark iron pole
      g.rect(x - 1, y, 2, 16)
        .fill({ color: COL_IRON })
        .stroke({ color: COL_IRON_DK, width: 0.3 });
      // Gold finial on pole
      g.circle(x, y, 2).fill({ color: COL_GOLD });
      g.circle(x, y, 1).fill({ color: COL_GOLD_LT });

      // War banner (larger, more dramatic)
      const dir = i === 1 ? -1 : 1;
      const color = i === 2 ? 0x881122 : this._ownerColor; // darker red for center

      g.moveTo(x + dir * 1, y + 2)
        .bezierCurveTo(
          x + dir * 12 + wave,
          y + 4 + wave2,
          x + dir * 16 + wave * 0.7,
          y + 9 + wave2 * 0.5,
          x + dir * 2,
          y + 16,
        )
        .lineTo(x + dir * 1, y + 14)
        .closePath()
        .fill({ color })
        .stroke({ color, width: 0.3, alpha: 0.4 });

      // Gold fringe on banner bottom edge
      const fringeSteps = 5;
      for (let f = 0; f < fringeSteps; f++) {
        const t = f / (fringeSteps - 1);
        const fx = x + dir * (1 + t * 1);
        const fy = y + 14 + t * 2;
        const fWave = Math.sin(time * 5 + f * 1.5) * 0.5;
        g.circle(fx + wave * t * 0.1, fy + fWave, 0.6).fill({ color: COL_GOLD, alpha: 0.7 });
      }

      // Emblem — gold horseshoe
      const ex = x + dir * 7 + wave * 0.3;
      const ey = y + 8 + wave2 * 0.2;
      g.moveTo(ex - 2, ey - 1)
        .bezierCurveTo(ex - 2, ey - 3, ex + 2, ey - 3, ex + 2, ey - 1)
        .lineTo(ex + 2, ey + 1)
        .stroke({ color: COL_GOLD_LT, width: 0.8, alpha: 0.6 });
      g.moveTo(ex - 2, ey - 1)
        .lineTo(ex - 2, ey + 1)
        .stroke({ color: COL_GOLD_LT, width: 0.8, alpha: 0.6 });
    }
  }

  // =========================================================================
  // Braziers (animated fire glow — replaces lanterns)
  // =========================================================================

  private _updateBraziers(time: number): void {
    const g = this._braziers;
    g.clear();

    const brazierPositions = [
      { x: 33, y: PH - 54 },
      { x: 63, y: PH - 56 },
      { x: 93, y: PH - 54 },
    ];

    for (let i = 0; i < brazierPositions.length; i++) {
      const { x, y } = brazierPositions[i];
      const pulse = 0.6 + Math.sin(time * BRAZIER_SPEED + i * 1.5) * 0.2;
      const flicker = Math.sin(time * 7 + i * 3.3) * 0.08;
      const flame1 = Math.sin(time * 5 + i * 2) * 1.5;
      const flame2 = Math.sin(time * 6.5 + i * 1.8 + 1) * 1;

      // ── Wide fire glow ──
      g.circle(x, y - 3, 14).fill({ color: COL_FIRE, alpha: (pulse + flicker) * 0.06 });
      g.circle(x, y - 3, 8).fill({ color: COL_FIRE_INNER, alpha: (pulse + flicker) * 0.1 });
      g.circle(x, y - 3, 4).fill({ color: COL_FIRE_INNER, alpha: (pulse + flicker) * 0.15 });

      // ── Brazier bowl ──
      // Iron stand
      g.moveTo(x - 2, y + 4)
        .lineTo(x - 4, y + 10)
        .stroke({ color: COL_IRON_DK, width: 1 });
      g.moveTo(x + 2, y + 4)
        .lineTo(x + 4, y + 10)
        .stroke({ color: COL_IRON_DK, width: 1 });
      g.moveTo(x, y + 4)
        .lineTo(x, y + 8)
        .stroke({ color: COL_IRON_DK, width: 1 });
      // Bowl
      g.moveTo(x - 4, y)
        .lineTo(x - 3, y + 4)
        .lineTo(x + 3, y + 4)
        .lineTo(x + 4, y)
        .closePath()
        .fill({ color: COL_BRAZIER })
        .stroke({ color: COL_IRON_DK, width: 0.8 });
      // Coals
      g.rect(x - 2.5, y + 1, 5, 2).fill({ color: COL_EMBER, alpha: pulse });

      // ── Flames ──
      // Main flame
      g.moveTo(x - 2, y)
        .quadraticCurveTo(x + flame1 * 0.5, y - 6 - pulse * 3, x + 1, y)
        .fill({ color: COL_FIRE, alpha: pulse * 0.8 });
      // Inner flame
      g.moveTo(x - 1, y)
        .quadraticCurveTo(x + flame2 * 0.3, y - 4 - pulse * 2, x + 0.5, y)
        .fill({ color: COL_FIRE_INNER, alpha: pulse * 0.9 });
      // Spark tips
      g.circle(x + flame1 * 0.4, y - 5 - pulse * 3, 0.5).fill({ color: COL_GOLD_LT, alpha: pulse * 0.6 });
      g.circle(x - flame2 * 0.3, y - 3 - pulse * 2, 0.4).fill({ color: COL_GOLD_LT, alpha: pulse * 0.4 });

      // ── Gold rim on brazier ──
      g.moveTo(x - 4, y)
        .lineTo(x + 4, y)
        .stroke({ color: COL_GOLD_DK, width: 0.6 });
    }
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawHorseshoeEmblem(g: Graphics, cx: number, cy: number): void {
    const r = 7;
    // Background circle (darker)
    g.circle(cx, cy, r + 3).fill({ color: 0x1a1818 });
    g.circle(cx, cy, r + 1).fill({ color: COL_IRON_DK });
    g.circle(cx, cy, r).fill({ color: 0x182244 }); // dark blue glass

    // Gold horseshoe
    g.moveTo(cx - 4, cy - 3)
      .bezierCurveTo(cx - 4, cy - 7, cx + 4, cy - 7, cx + 4, cy - 3)
      .lineTo(cx + 4, cy + 2)
      .lineTo(cx + 2.5, cy + 2)
      .lineTo(cx + 2.5, cy - 3)
      .bezierCurveTo(cx + 2.5, cy - 5, cx - 2.5, cy - 5, cx - 2.5, cy - 3)
      .lineTo(cx - 2.5, cy + 2)
      .lineTo(cx - 4, cy + 2)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.9 });

    // Nail holes
    g.circle(cx - 3, cy - 1.5, 0.7).fill({ color: 0x182244, alpha: 0.6 });
    g.circle(cx + 3, cy - 1.5, 0.7).fill({ color: 0x182244, alpha: 0.6 });
    g.circle(cx - 3, cy + 0.5, 0.7).fill({ color: 0x182244, alpha: 0.6 });
    g.circle(cx + 3, cy + 0.5, 0.7).fill({ color: 0x182244, alpha: 0.6 });

    // Gold caming
    g.circle(cx, cy, r + 3).stroke({ color: COL_GOLD_DK, width: 1 });
    // Keystone
    g.moveTo(cx - 3, cy - r - 3)
      .lineTo(cx, cy - r - 5)
      .lineTo(cx + 3, cy - r - 3)
      .fill({ color: COL_STONE });
  }

  private _drawGoldHorseshoe(g: Graphics, x: number, y: number, r: number): void {
    // Gold horseshoe with dark iron nails
    g.moveTo(x - r, y - r * 0.3)
      .bezierCurveTo(x - r, y - r, x + r, y - r, x + r, y - r * 0.3)
      .lineTo(x + r, y + r * 0.5)
      .stroke({ color: COL_GOLD, width: 1.5 });
    g.moveTo(x - r, y - r * 0.3)
      .lineTo(x - r, y + r * 0.5)
      .stroke({ color: COL_GOLD, width: 1.5 });
    // Iron nail dots
    g.circle(x - r + 1, y - r * 0.1, 0.6).fill({ color: COL_IRON_DK });
    g.circle(x + r - 1, y - r * 0.1, 0.6).fill({ color: COL_IRON_DK });
    // Gold highlight
    g.circle(x, y - r * 0.8, 0.5).fill({ color: COL_GOLD_LT, alpha: 0.4 });
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
    g.ellipse(x + w / 2, y + 2, w / 2, 3.5).fill({ color: COL_WINDOW_FRAME });
    g.ellipse(x + w / 2, y + 2, w / 2 - 1.5, 2).fill({ color: COL_WINDOW });
    // Mullion
    g.moveTo(x + w / 2, y + 2)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.moveTo(x, y + h * 0.5)
      .lineTo(x + w, y + h * 0.5)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    // Dark interior glow
    g.rect(x + 1, y + 3, w / 2 - 1, h * 0.4).fill({ color: COL_WINDOW_GLOW, alpha: 0.2 });
    // Iron window bars
    g.moveTo(x + w / 4, y)
      .lineTo(x + w / 4, y + h)
      .stroke({ color: COL_IRON_DK, width: 0.4, alpha: 0.4 });
    g.moveTo(x + (3 * w) / 4, y)
      .lineTo(x + (3 * w) / 4, y + h)
      .stroke({ color: COL_IRON_DK, width: 0.4, alpha: 0.4 });
    // Sill
    g.rect(x - 2, y + h + 1, w + 4, 2).fill({ color: COL_STONE });
  }

  // =========================================================================
  // Stone texture helpers
  // =========================================================================

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 7) {
      const offset = (Math.floor(row / 7) % 2) * 10;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.35 });
      for (let col = offset; col < w; col += 20) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 7)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.3 });
      }
      for (let col = offset; col < w - 6; col += 20) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 16, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.15 });
        g.moveTo(x + col + 1, y + row + 6)
          .lineTo(x + col + 16, y + row + 6)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.12 });
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
    const light = [[0.1, 0.2], [0.5, 0.4], [0.25, 0.7], [0.8, 0.6], [0.6, 0.1]];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({ color: COL_STONE_LT, alpha: 0.18 });
    }
    const dark = [[0.3, 0.15], [0.7, 0.5], [0.1, 0.45], [0.55, 0.75]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({ color: COL_STONE_DK, alpha: 0.15 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2).fill({ color: COL_MOSS, alpha: 0.35 });
    g.circle(x + 2, y - 1, 1.2).fill({ color: COL_MOSS, alpha: 0.25 });
    g.circle(x + w - 2, y - 0.5, 1).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    for (let iy = 0; iy < h; iy += 4) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 0.8).fill({ color: COL_IVY });
    }
    for (let iy = 3; iy < h; iy += 7) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 14 < 7 ? -1 : 1;
      g.circle(x + wobble + dir * 2.5, y + iy, 1.8).fill({ color: COL_IVY_LT, alpha: 0.6 });
      g.circle(x + wobble + dir * 1.5, y + iy + 1, 1.2).fill({ color: COL_IVY, alpha: 0.45 });
    }
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// ---------------------------------------------------------------------------
// Helper functions for flag positioning (gargoyle/corner positions)
// ---------------------------------------------------------------------------

function wallLeftEdge(): number {
  return 10;
}

function wallRightEdge(): number {
  return PW - 10;
}
