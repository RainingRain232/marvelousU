// Procedural blacksmith renderer for BuildingView.
//
// Draws a detailed 2×2 tile medieval fantasy forge / smithy with:
//   • Rugged stone walls with brick pattern, stone variation, and mortar
//   • Large chimney with smoke wisps rising from the forge
//   • Open-front smithy with heavy timber beams and slate roof
//   • Massive iron anvil on oak stump with hot-metal glow
//   • Stone forge hearth with animated coal fire, bellows, and tongs
//   • Grimbold the blacksmith: stocky, bearded, leather apron, hammer animation
//   • Workbench with tomes, scattered blueprints, sword hilt, armor piece
//   • Tool wall: hanging hammers, tongs, chisels, files on pegs
//   • Water quench barrel with steam, grinding wheel, bucket of coal
//   • Horseshoes nailed above door, iron chandelier, wall-mounted torches
//   • Moss on stonework, soot stains, spark particles on hammer strike
//   • Player-colored banner above the entrance
//
// All drawing uses PixiJS Graphics.  2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px
const TH = 2 * TS; // 128px

// --- Palette ---
const COL_STONE = 0x6b5a4a;
const COL_STONE_DK = 0x4a3d30;
const COL_STONE_LT = 0x8b7a6a;
const COL_MORTAR = 0x7a6a5a;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_COAL = 0x1a1a1a;
const COL_FIRE = 0xff4400;
const COL_FIRE_MID = 0xff8800;
const COL_FIRE_CORE = 0xffff66;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_IRON_HOT = 0xff6633;
const COL_GLOW = 0xffaa33;
const COL_LEATHER = 0x8b4513;
const COL_LEATHER_DK = 0x5a2a08;
const COL_PAPER = 0xd4c4a0;
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb08050;
const COL_HAIR = 0x6a5a4a;
const COL_MOSS = 0x4a6b3a;
const COL_SOOT = 0x2a2520;
const COL_GOLD = 0xccaa44;

// Animation timing
const HAMMER_SPEED = 3.5;
const FIRE_FLICKER = 10.0;
const GLOW_PULSE = 2.0;
const FLAG_SPEED = 3.0;

// ---------------------------------------------------------------------------
// BlacksmithRenderer
// ---------------------------------------------------------------------------

export class BlacksmithRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics(); // Walls, roof, chimney
  private _forge = new Graphics(); // Forge hearth, fire, coals
  private _workbench = new Graphics(); // Bench, tomes, projects
  private _toolWall = new Graphics(); // Hanging tools
  private _anvil = new Graphics(); // Anvil on stump
  private _grimbold = new Graphics(); // The blacksmith
  private _sparks = new Graphics(); // Spark particles
  private _smoke = new Graphics(); // Chimney smoke
  private _banner = new Graphics(); // Player banner

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);

    this._drawBase();
    this._drawToolWall();
    this._drawWorkbench();

    this.container.addChild(this._base);
    this.container.addChild(this._forge);
    this.container.addChild(this._toolWall);
    this.container.addChild(this._workbench);
    this.container.addChild(this._anvil);
    this.container.addChild(this._grimbold);
    this.container.addChild(this._sparks);
    this.container.addChild(this._smoke);
    this.container.addChild(this._banner);
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateForge(this._time);
    this._updateAnvil(this._time);
    this._updateGrimbold(this._time);
    this._updateSparks(this._time);
    this._updateSmoke(this._time);
    this._updateBanner(this._time);
  }

  // =========================================================================
  // Static base — walls, roof, chimney, floor, windows
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Stone floor ──
    g.rect(0, TH - 12, TW, 12).fill({ color: COL_STONE_DK });
    // Floor flagstones
    for (let i = 0; i < 8; i++) {
      const fx = 2 + i * 16;
      g.rect(fx, TH - 11, 14, 9)
        .fill({ color: i % 2 === 0 ? COL_STONE : COL_STONE_LT, alpha: 0.3 })
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.3 });
    }
    // Soot stains on floor near forge
    g.ellipse(TW - 24, TH - 8, 12, 4).fill({ color: COL_SOOT, alpha: 0.2 });

    // ── Back wall ──
    const wallY = 18;
    const wallH = TH - wallY - 12;
    g.rect(0, wallY, TW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(1, wallY + 1, 5, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Brick pattern
    this._drawBrickPattern(g, 2, wallY + 2, TW - 4, wallH - 4);
    // Stone variation
    this._drawStoneVariation(g, 6, wallY + 6, TW - 12, wallH - 12);

    // ── Side walls (thicker, like pillars) ──
    g.rect(0, wallY, 14, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.rect(TW - 14, wallY, 14, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Stone texture on side walls
    for (let row = 0; row < wallH; row += 10) {
      g.moveTo(0, wallY + row)
        .lineTo(14, wallY + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
      g.moveTo(TW - 14, wallY + row)
        .lineTo(TW, wallY + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
    }

    // ── Heavy timber ceiling beam ──
    g.rect(0, wallY - 2, TW, 5)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Wood grain
    g.moveTo(4, wallY - 1)
      .lineTo(TW - 4, wallY)
      .stroke({ color: COL_WOOD, width: 0.3, alpha: 0.4 });
    g.moveTo(8, wallY + 1)
      .lineTo(TW - 8, wallY + 2)
      .stroke({ color: COL_WOOD, width: 0.3, alpha: 0.3 });

    // ── Roof (slate, peaked) ──
    g.moveTo(-4, wallY)
      .lineTo(TW / 2, wallY - 20)
      .lineTo(TW + 4, wallY)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Highlight
    g.moveTo(TW / 2, wallY - 20)
      .lineTo(TW + 4, wallY)
      .lineTo(TW / 2 + 1, wallY - 19)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });
    // Tile lines
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const ly = wallY - 20 + frac * 20;
      const halfW = ((TW + 8) / 2) * frac;
      g.moveTo(TW / 2 - halfW, ly)
        .lineTo(TW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // ── Chimney (right side, tall) ──
    const chimX = TW - 26;
    const chimW = 18;
    const chimY = wallY - 30;
    const chimH = 30;
    g.rect(chimX, chimY, chimW, chimH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    this._drawBrickPattern(g, chimX + 1, chimY + 1, chimW - 2, chimH - 2);
    // Chimney cap
    g.rect(chimX - 2, chimY - 3, chimW + 4, 4)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Soot stain on chimney
    g.rect(chimX + 4, chimY + 4, 10, 8).fill({ color: COL_SOOT, alpha: 0.2 });

    // ── Windows (golden forge-light inside) ──
    this._drawForgeWindow(g, 20, wallY + 8, 18, 24);
    this._drawForgeWindow(g, TW - 38, wallY + 8, 18, 24);

    // ── Horseshoes nailed above entrance (good luck) ──
    this._drawHorseshoe(g, TW / 2 - 12, wallY + 6);
    this._drawHorseshoe(g, TW / 2, wallY + 4);
    this._drawHorseshoe(g, TW / 2 + 12, wallY + 6);

    // ── Wall-mounted torch (left side) ──
    this._drawWallTorch(g, 16, wallY + 18);

    // ── Moss on stonework ──
    this._drawMoss(g, 4, TH - 14, 10);
    this._drawMoss(g, TW - 12, TH - 13, 8);
    this._drawMoss(g, 2, wallY + wallH - 3, 8);
    this._drawMoss(g, TW - 10, wallY + wallH - 2, 6);

    // ── Soot stains on wall near forge ──
    g.ellipse(TW - 28, wallY + 20, 10, 14).fill({ color: COL_SOOT, alpha: 0.12 });
    g.ellipse(TW - 22, wallY + 14, 8, 10).fill({ color: COL_SOOT, alpha: 0.08 });
  }

  // =========================================================================
  // Forge hearth — animated fire, coals, bellows, tongs
  // =========================================================================

  private _updateForge(time: number): void {
    const g = this._forge;
    g.clear();

    const fx = TW - 24;
    const fy = TH - 18;

    // ── Stone hearth (raised platform) ──
    g.rect(fx - 16, fy + 2, 32, 10)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.rect(fx - 14, fy - 2, 28, 6).fill({ color: COL_STONE });
    // Hearth lip
    g.rect(fx - 16, fy, 32, 3).fill({ color: COL_STONE_LT });

    // ── Coal bed ──
    const coalPositions = [
      [-6, -4, 3.5],
      [0, -5, 3],
      [5, -3, 4],
      [-3, -6, 2.5],
      [3, -6, 2],
      [7, -5, 2.5],
    ];
    for (const [cx, cy, cr] of coalPositions) {
      g.circle(fx + cx, fy + cy, cr).fill({ color: COL_COAL });
      // Hot coal glow
      const glint = Math.sin(time * 3 + cx * 2) * 0.2 + 0.3;
      g.circle(fx + cx, fy + cy, cr * 0.6).fill({
        color: COL_FIRE,
        alpha: glint,
      });
    }

    // ── Flames ──
    const f1 = Math.sin(time * FIRE_FLICKER) * 2;
    const f2 = Math.sin(time * FIRE_FLICKER * 1.3 + 1) * 1.5;
    const f3 = Math.sin(time * FIRE_FLICKER * 0.7 + 2) * 1;
    const f4 = Math.sin(time * FIRE_FLICKER * 1.6 + 3) * 1.2;

    // Outer flame
    g.moveTo(fx - 2, fy - 6)
      .bezierCurveTo(fx - 6 + f1, fy - 16, fx + 2 + f2, fy - 22, fx + 1, fy - 6)
      .fill({ color: COL_FIRE, alpha: 0.75 });
    // Mid flame
    g.moveTo(fx, fy - 5)
      .bezierCurveTo(fx - 3 + f3, fy - 12, fx + 3 + f4, fy - 18, fx + 1, fy - 5)
      .fill({ color: COL_FIRE_MID, alpha: 0.8 });
    // Core flame
    g.moveTo(fx, fy - 4)
      .bezierCurveTo(fx - 1 + f2, fy - 9, fx + 2 + f1, fy - 14, fx, fy - 4)
      .fill({ color: COL_FIRE_CORE, alpha: 0.85 });

    // Side lick flames
    g.moveTo(fx - 5, fy - 5)
      .quadraticCurveTo(fx - 8 + f4, fy - 12, fx - 4, fy - 5)
      .fill({ color: COL_FIRE, alpha: 0.5 });
    g.moveTo(fx + 5, fy - 4)
      .quadraticCurveTo(fx + 9 + f3, fy - 10, fx + 5, fy - 4)
      .fill({ color: COL_FIRE_MID, alpha: 0.45 });

    // ── Forge glow on surroundings ──
    const glowPulse = 0.5 + Math.sin(time * GLOW_PULSE) * 0.15;
    g.circle(fx, fy - 8, 22).fill({ color: COL_GLOW, alpha: glowPulse * 0.08 });
    g.circle(fx, fy - 8, 12).fill({ color: COL_GLOW, alpha: glowPulse * 0.12 });

    // ── Bellows (left of forge) ──
    const bellowsX = fx - 20;
    const bellowsY = fy - 4;
    const bellowsPump = Math.sin(time * 1.5) * 2;
    // Nozzle
    g.rect(bellowsX + 8, bellowsY + 2, 8, 2).fill({ color: COL_IRON });
    // Body (accordion shape)
    g.moveTo(bellowsX, bellowsY - 2 - bellowsPump)
      .lineTo(bellowsX + 8, bellowsY)
      .lineTo(bellowsX + 8, bellowsY + 6)
      .lineTo(bellowsX, bellowsY + 8 + bellowsPump)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 0.8 });
    // Folds
    g.moveTo(bellowsX + 2, bellowsY + 1 - bellowsPump * 0.3)
      .lineTo(bellowsX + 6, bellowsY + 2)
      .stroke({ color: COL_LEATHER_DK, width: 0.4 });
    g.moveTo(bellowsX + 2, bellowsY + 5 + bellowsPump * 0.3)
      .lineTo(bellowsX + 6, bellowsY + 4)
      .stroke({ color: COL_LEATHER_DK, width: 0.4 });
    // Handle
    g.rect(bellowsX - 4, bellowsY + 1, 5, 3)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });

    // ── Tongs (resting near forge) ──
    g.moveTo(fx + 12, fy - 2)
      .lineTo(fx + 18, fy - 14)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(fx + 13, fy - 2)
      .lineTo(fx + 20, fy - 12)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Pivot
    g.circle(fx + 15, fy - 8, 1.5).fill({ color: COL_IRON_DK });
    // Handles
    g.rect(fx + 11, fy - 2, 4, 8).fill({ color: COL_WOOD });
  }

  // =========================================================================
  // Workbench — tomes, blueprints, projects
  // =========================================================================

  private _drawWorkbench(): void {
    const g = this._workbench;

    // ── Workbench along left wall ──
    const bx = 14;
    const by = 54;
    const bw = 36;
    const bh = 10;

    // Table top
    g.rect(bx, by, bw, bh)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 1 });
    // Surface scratches
    g.moveTo(bx + 4, by + 3)
      .lineTo(bx + 18, by + 4)
      .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.4 });
    g.moveTo(bx + 10, by + 7)
      .lineTo(bx + 30, by + 6)
      .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.3 });
    // Legs
    g.rect(bx + 2, by + bh, 4, 14)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(bw + bx - 6, by + bh, 4, 14)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Cross brace between legs
    g.moveTo(bx + 4, by + bh + 8)
      .lineTo(bw + bx - 4, by + bh + 8)
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // ── Open tome on bench ──
    // Left page
    g.moveTo(bx + 6, by - 2)
      .lineTo(bx + 14, by - 3)
      .lineTo(bx + 14, by + 3)
      .lineTo(bx + 6, by + 4)
      .closePath()
      .fill({ color: COL_LEATHER });
    // Right page
    g.moveTo(bx + 14, by - 3)
      .lineTo(bx + 22, by - 2)
      .lineTo(bx + 22, by + 4)
      .lineTo(bx + 14, by + 3)
      .closePath()
      .fill({ color: COL_LEATHER });
    // Pages
    g.rect(bx + 7, by - 1, 5, 3).fill({ color: COL_PAPER });
    g.rect(bx + 16, by - 1, 5, 3).fill({ color: COL_PAPER });
    // Text lines
    for (let i = 0; i < 3; i++) {
      g.moveTo(bx + 8, by + i * 1)
        .lineTo(bx + 11, by + i * 1)
        .stroke({ color: 0x444444, width: 0.3, alpha: 0.4 });
    }
    // Spine
    g.moveTo(bx + 14, by - 3)
      .lineTo(bx + 14, by + 3)
      .stroke({ color: COL_LEATHER_DK, width: 1 });

    // ── Stacked book ──
    g.rect(bx + 25, by - 3, 8, 3)
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 0.5 });
    g.rect(bx + 25, by, 8, 2).fill({ color: 0x6b3513 });

    // ── Scattered blueprints / notes ──
    g.rect(bx + 16, by + 1, 6, 4).fill({ color: COL_PAPER, alpha: 0.7 });
    g.rect(bx + 28, by + 2, 5, 3).fill({ color: COL_PAPER, alpha: 0.6 });

    // ── Sword hilt (half-finished on bench) ──
    g.rect(bx + 2, by - 4, 7, 1.5).fill({ color: COL_IRON });
    g.rect(bx + 4, by - 6, 2, 4).fill({ color: COL_WOOD });
    g.circle(bx + 5, by - 6, 1.5).fill({ color: COL_GOLD }); // pommel

    // ── Armor piece (pauldron) ──
    g.ellipse(bx + 34, by + 1, 5, 3)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.ellipse(bx + 34, by + 1, 3, 2).fill({ color: COL_IRON_HOT, alpha: 0.3 });

    // ── Water quench barrel (below bench) ──
    const barrelX = bx + 12;
    const barrelY = by + bh + 4;
    g.ellipse(barrelX, barrelY + 12, 7, 4)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(barrelX - 7, barrelY, 14, 12)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.ellipse(barrelX, barrelY, 7, 3).fill({ color: 0x2a3a4a }); // dark water
    // Iron hoops
    g.rect(barrelX - 7, barrelY + 3, 14, 1.5).fill({ color: COL_IRON });
    g.rect(barrelX - 7, barrelY + 9, 14, 1.5).fill({ color: COL_IRON });
    // Water surface glint
    g.ellipse(barrelX - 2, barrelY - 1, 3, 1).fill({ color: 0x5a8aaa, alpha: 0.4 });

    // ── Coal bucket (near forge) ──
    const cbx = TW - 44;
    const cby = TH - 16;
    g.moveTo(cbx, cby)
      .lineTo(cbx - 2, cby + 10)
      .lineTo(cbx + 10, cby + 10)
      .lineTo(cbx + 8, cby)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Handle
    g.moveTo(cbx, cby)
      .quadraticCurveTo(cbx + 4, cby - 5, cbx + 8, cby)
      .stroke({ color: COL_IRON, width: 0.8 });
    // Coal pieces
    g.circle(cbx + 2, cby + 2, 1.5).fill({ color: COL_COAL });
    g.circle(cbx + 5, cby + 1, 2).fill({ color: COL_COAL });
    g.circle(cbx + 7, cby + 3, 1.5).fill({ color: COL_COAL });

    // ── Grinding wheel (floor, left side) ──
    const gwx = 20;
    const gwy = TH - 16;
    // Frame
    g.rect(gwx - 1, gwy - 8, 2, 12).fill({ color: COL_WOOD_DK });
    g.rect(gwx + 9, gwy - 8, 2, 12).fill({ color: COL_WOOD_DK });
    // Wheel
    g.circle(gwx + 5, gwy - 4, 6)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.circle(gwx + 5, gwy - 4, 2).fill({ color: COL_IRON }); // axle
    // Handle
    g.moveTo(gwx + 9, gwy - 4)
      .lineTo(gwx + 14, gwy - 6)
      .stroke({ color: COL_WOOD, width: 1.2 });
  }

  // =========================================================================
  // Tool wall — hanging hammers, chisels, files
  // =========================================================================

  private _drawToolWall(): void {
    const g = this._toolWall;

    // Peg board
    const pegY = 28;
    g.rect(54, pegY, 50, 3).fill({ color: COL_WOOD_DK });

    // Pegs
    const pegs = [58, 66, 74, 82, 90, 98];
    for (const px of pegs) {
      g.rect(px, pegY + 3, 2, 3).fill({ color: COL_WOOD });
    }

    // ── Hammer 1 (claw hammer) ──
    g.moveTo(59, pegY + 6)
      .lineTo(59, pegY + 20)
      .stroke({ color: COL_WOOD, width: 2 });
    g.rect(56, pegY + 18, 6, 4).fill({ color: COL_IRON });

    // ── Hammer 2 (ball peen) ──
    g.moveTo(67, pegY + 6)
      .lineTo(67, pegY + 18)
      .stroke({ color: COL_WOOD, width: 2 });
    g.rect(64, pegY + 16, 6, 3).fill({ color: COL_IRON });
    g.circle(64, pegY + 17, 1.5).fill({ color: COL_IRON });

    // ── Tongs ──
    g.moveTo(75, pegY + 6)
      .lineTo(73, pegY + 22)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.moveTo(75, pegY + 6)
      .lineTo(77, pegY + 22)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.circle(75, pegY + 12, 1).fill({ color: COL_IRON_DK }); // pivot

    // ── Chisels (3 sizes) ──
    g.moveTo(83, pegY + 6)
      .lineTo(83, pegY + 18)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.rect(82, pegY + 16, 2, 4).fill({ color: COL_IRON });

    g.moveTo(87, pegY + 6)
      .lineTo(87, pegY + 16)
      .stroke({ color: COL_WOOD, width: 1.2 });
    g.rect(86, pegY + 14, 2, 3).fill({ color: COL_IRON });

    // ── File ──
    g.moveTo(91, pegY + 6)
      .lineTo(91, pegY + 22)
      .stroke({ color: COL_IRON, width: 1 });
    g.rect(90, pegY + 6, 2, 4).fill({ color: COL_WOOD });

    // ── Horseshoe on peg ──
    this._drawHorseshoe(g, 99, pegY + 10);
  }

  // =========================================================================
  // Anvil — massive iron on oak stump
  // =========================================================================

  private _updateAnvil(time: number): void {
    const g = this._anvil;
    g.clear();

    const ax = TW / 2 + 6;
    const ay = TH - 22;

    // ── Oak stump base ──
    g.ellipse(ax, ay + 10, 14, 5)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(ax - 14, ay, 28, 10)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.8 });
    g.ellipse(ax, ay, 14, 4).fill({ color: COL_WOOD_LT });
    // Tree rings
    g.ellipse(ax, ay, 10, 3).stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.4 });
    g.ellipse(ax, ay, 6, 2).stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.3 });
    g.circle(ax, ay, 1).fill({ color: COL_WOOD_DK });

    // ── Anvil body ──
    // Base
    g.rect(ax - 10, ay - 14, 20, 14)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Face (wider top)
    g.rect(ax - 14, ay - 18, 28, 5)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Working surface highlight
    g.rect(ax - 12, ay - 18, 24, 2).fill({ color: COL_STONE_LT, alpha: 0.15 });

    // Horn (pointed end)
    g.moveTo(ax - 14, ay - 16)
      .lineTo(ax - 26, ay - 14)
      .lineTo(ax - 14, ay - 12)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });

    // Hardy hole (square)
    g.rect(ax + 6, ay - 18, 3, 3).fill({ color: COL_IRON_DK });
    // Pritchel hole (round)
    g.circle(ax + 12, ay - 16, 1).fill({ color: COL_IRON_DK });

    // Hot metal piece on anvil (glowing)
    const glowP = 0.5 + Math.sin(time * GLOW_PULSE) * 0.2;
    g.rect(ax - 6, ay - 20, 12, 3)
      .fill({ color: COL_IRON_HOT, alpha: glowP })
      .stroke({ color: COL_FIRE, width: 0.5, alpha: glowP * 0.5 });
    // Glow aura around hot metal
    g.ellipse(ax, ay - 19, 10, 5).fill({ color: COL_GLOW, alpha: glowP * 0.1 });
  }

  // =========================================================================
  // Grimbold — animated blacksmith
  // =========================================================================

  private _updateGrimbold(time: number): void {
    const g = this._grimbold;
    g.clear();

    const gx = TW / 2 - 12;
    const gy = TH - 22;

    // ── Hammer animation cycle ──
    const hammerCycle = (time * HAMMER_SPEED) % 1;
    let hammerLift = 0;
    if (hammerCycle < 0.3) {
      hammerLift = (hammerCycle / 0.3) * 16;
    } else if (hammerCycle < 0.45) {
      hammerLift = 16;
    } else if (hammerCycle < 0.65) {
      hammerLift = 16 * (1 - (hammerCycle - 0.45) / 0.2);
    } else {
      hammerLift = 0;
    }
    const bodyLean = hammerLift > 8 ? -1 : 0;

    // ── Legs (heavy boots) ──
    g.rect(gx - 5, gy + 2, 5, 10).fill({ color: COL_WOOD_DK });
    g.rect(gx + 2, gy + 2, 5, 10).fill({ color: COL_WOOD_DK });
    // Boot tops
    g.rect(gx - 5, gy + 2, 5, 2).fill({ color: COL_LEATHER });
    g.rect(gx + 2, gy + 2, 5, 2).fill({ color: COL_LEATHER });
    // Soles
    g.rect(gx - 6, gy + 11, 7, 2).fill({ color: COL_IRON_DK });
    g.rect(gx + 1, gy + 11, 7, 2).fill({ color: COL_IRON_DK });

    // ── Torso (stocky, barrel-chested) ──
    g.rect(gx - 8, gy - 18 + bodyLean, 16, 20)
      .fill({ color: 0x5a4030 }) // dark tunic
      .stroke({ color: 0x4a3020, width: 0.5 });

    // ── Leather apron ──
    g.rect(gx - 7, gy - 16 + bodyLean, 14, 18)
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 0.8 });
    // Apron pocket
    g.rect(gx - 4, gy - 6 + bodyLean, 8, 5)
      .stroke({ color: COL_LEATHER_DK, width: 0.5 });
    // Apron strap
    g.moveTo(gx - 6, gy - 16 + bodyLean)
      .lineTo(gx - 2, gy - 22 + bodyLean)
      .stroke({ color: COL_LEATHER_DK, width: 1.5 });
    g.moveTo(gx + 6, gy - 16 + bodyLean)
      .lineTo(gx + 2, gy - 22 + bodyLean)
      .stroke({ color: COL_LEATHER_DK, width: 1.5 });

    // Belt with tools
    g.rect(gx - 9, gy - 4 + bodyLean, 18, 3).fill({ color: COL_LEATHER_DK });
    g.circle(gx, gy - 3 + bodyLean, 1.5).fill({ color: COL_GOLD }); // buckle
    // Small hammer in belt
    g.rect(gx + 6, gy - 6 + bodyLean, 1.5, 6).fill({ color: COL_WOOD });
    g.rect(gx + 5, gy - 7 + bodyLean, 3, 2).fill({ color: COL_IRON });

    // ── Head ──
    const headY = gy - 28 + bodyLean;
    g.circle(gx, headY, 7)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.5 });

    // Hair (wild, graying)
    g.moveTo(gx - 6, headY - 2)
      .quadraticCurveTo(gx - 8, headY - 8, gx - 3, headY - 7)
      .fill({ color: COL_HAIR });
    g.moveTo(gx + 3, headY - 7)
      .quadraticCurveTo(gx + 8, headY - 8, gx + 6, headY - 2)
      .fill({ color: COL_HAIR });
    g.moveTo(gx - 3, headY - 7)
      .quadraticCurveTo(gx, headY - 9, gx + 3, headY - 7)
      .fill({ color: 0x7a6a5a });

    // Beard (thick, forked)
    g.moveTo(gx - 5, headY + 3)
      .quadraticCurveTo(gx - 4, headY + 10, gx - 2, headY + 12)
      .stroke({ color: COL_HAIR, width: 3 });
    g.moveTo(gx + 5, headY + 3)
      .quadraticCurveTo(gx + 4, headY + 10, gx + 2, headY + 12)
      .stroke({ color: COL_HAIR, width: 3 });
    // Mustache
    g.moveTo(gx - 4, headY + 2)
      .quadraticCurveTo(gx, headY + 4, gx + 4, headY + 2)
      .stroke({ color: COL_HAIR, width: 1.5 });

    // Eyes (focused, intense)
    g.circle(gx - 3, headY - 1, 1.2).fill({ color: 0x2a1a0f });
    g.circle(gx + 3, headY - 1, 1.2).fill({ color: 0x2a1a0f });
    g.circle(gx - 2.7, headY - 1.3, 0.4).fill({ color: 0xffffff, alpha: 0.5 });
    g.circle(gx + 3.3, headY - 1.3, 0.4).fill({ color: 0xffffff, alpha: 0.5 });
    // Bushy brows
    g.moveTo(gx - 5, headY - 3)
      .lineTo(gx - 1, headY - 3)
      .stroke({ color: COL_HAIR, width: 1.2 });
    g.moveTo(gx + 1, headY - 3)
      .lineTo(gx + 5, headY - 3)
      .stroke({ color: COL_HAIR, width: 1.2 });
    // Nose
    g.circle(gx + 1, headY + 1, 1.8).fill({ color: COL_SKIN_DK });

    // ── Right arm (hammer arm) ──
    const shoulderX = gx + 8;
    const shoulderY = gy - 16 + bodyLean;
    g.moveTo(shoulderX, shoulderY)
      .lineTo(shoulderX + 8, shoulderY - 2 - hammerLift * 0.3)
      .stroke({ color: 0x5a4030, width: 4 });
    // Forearm
    g.moveTo(shoulderX + 8, shoulderY - 2 - hammerLift * 0.3)
      .lineTo(shoulderX + 12, shoulderY - hammerLift * 0.6)
      .stroke({ color: COL_SKIN, width: 3 });
    // Glove
    g.circle(shoulderX + 12, shoulderY - hammerLift * 0.6, 2.5).fill({
      color: COL_LEATHER,
    });

    // Hammer
    const hammerX = shoulderX + 12;
    const hammerY = shoulderY - hammerLift * 0.6;
    // Handle
    g.moveTo(hammerX, hammerY)
      .lineTo(hammerX + 6, hammerY - 12 - hammerLift * 0.4)
      .stroke({ color: COL_WOOD, width: 2.5 });
    // Head
    const hhx = hammerX + 6;
    const hhy = hammerY - 12 - hammerLift * 0.4;
    g.rect(hhx - 2, hhy - 4, 10, 6)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Hammer glow
    const glowI = (Math.sin(time * GLOW_PULSE) + 1) / 2;
    g.rect(hhx, hhy - 3, 6, 4).fill({
      color: COL_IRON_HOT,
      alpha: 0.3 + glowI * 0.3,
    });

    // ── Left arm (steadying piece on anvil) ──
    g.moveTo(gx - 8, gy - 16 + bodyLean)
      .lineTo(gx - 16, gy - 20 + bodyLean)
      .stroke({ color: 0x5a4030, width: 4 });
    g.moveTo(gx - 16, gy - 20 + bodyLean)
      .lineTo(gx - 18, gy - 22 + bodyLean)
      .stroke({ color: COL_SKIN, width: 3 });
    // Tongs in left hand
    g.moveTo(gx - 18, gy - 22 + bodyLean)
      .lineTo(gx - 14, gy - 30 + bodyLean)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.moveTo(gx - 18, gy - 22 + bodyLean)
      .lineTo(gx - 12, gy - 28 + bodyLean)
      .stroke({ color: COL_IRON, width: 1.2 });
  }

  // =========================================================================
  // Sparks — on hammer strike
  // =========================================================================

  private _updateSparks(time: number): void {
    const g = this._sparks;
    g.clear();

    const hammerCycle = (time * HAMMER_SPEED) % 1;
    // Sparks fly on the strike (0.6–0.7 of cycle)
    if (hammerCycle > 0.6 && hammerCycle < 0.75) {
      const progress = (hammerCycle - 0.6) / 0.15;
      const ax = TW / 2 + 6;
      const ay = TH - 40;

      // 6 spark particles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI - Math.PI * 0.8;
        const dist = 6 + progress * 18;
        const sx = ax + Math.cos(angle) * dist + Math.sin(i * 3.7) * 4;
        const sy = ay + Math.sin(angle) * dist - progress * 8;
        const alpha = 1 - progress;
        const size = 1.5 * (1 - progress * 0.5);

        g.circle(sx, sy, size).fill({ color: COL_FIRE_CORE, alpha });
        // Trailing glow
        g.circle(sx - Math.cos(angle) * 2, sy - Math.sin(angle) * 2, size * 0.6).fill({
          color: COL_GLOW,
          alpha: alpha * 0.5,
        });
      }
    }
  }

  // =========================================================================
  // Smoke — chimney wisps
  // =========================================================================

  private _updateSmoke(time: number): void {
    const g = this._smoke;
    g.clear();

    const chimX = TW - 17;
    const chimTop = -14;

    // 4 smoke puffs at different phases
    for (let i = 0; i < 4; i++) {
      const phase = (time * 0.4 + i * 0.8) % 3.2;
      if (phase > 2.5) continue; // gap between puffs
      const rise = phase * 12;
      const drift = Math.sin(time * 0.6 + i * 2) * 4;
      const alpha = 0.2 * (1 - phase / 2.5);
      const size = 3 + phase * 2;

      g.circle(chimX + drift, chimTop - rise, size).fill({
        color: 0x888888,
        alpha,
      });
    }
  }

  // =========================================================================
  // Player banner
  // =========================================================================

  private _updateBanner(time: number): void {
    const g = this._banner;
    g.clear();

    const bx = TW / 2;
    const by = 2;
    const wave = Math.sin(time * FLAG_SPEED) * 3;
    const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 1.5;

    // Pole
    g.rect(bx - 1, by, 2, 16)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.circle(bx, by, 1.5).fill({ color: COL_GOLD });

    // Banner (wider, rectangular with pointed end)
    g.moveTo(bx + 1, by + 2)
      .bezierCurveTo(
        bx + 10 + wave,
        by + 3 + wave2,
        bx + 14 + wave * 0.7,
        by + 7 + wave2 * 0.5,
        bx + 2,
        by + 14,
      )
      .lineTo(bx + 1, by + 12)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: this._playerColor, width: 0.3, alpha: 0.4 });

    // Anvil emblem on banner
    const ex = bx + 6 + wave * 0.3;
    const ey = by + 7 + wave2 * 0.2;
    g.rect(ex - 2, ey, 4, 2).fill({ color: 0xffffff, alpha: 0.3 });
    g.rect(ex - 3, ey - 1, 6, 1).fill({ color: 0xffffff, alpha: 0.25 });
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawForgeWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Frame
    g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_STONE_DK });
    g.rect(x, y, w, h).fill({ color: COL_FIRE_CORE, alpha: 0.2 });
    // Wooden frame
    g.rect(x, y, w, h).stroke({ color: COL_WOOD, width: 2 });
    // Cross mullion
    g.moveTo(x + w / 2, y)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(x, y + h / 2)
      .lineTo(x + w, y + h / 2)
      .stroke({ color: COL_WOOD, width: 1.5 });
    // Warm glow
    g.rect(x + 1, y + 1, w / 2 - 1, h / 2 - 1).fill({
      color: COL_GLOW,
      alpha: 0.15,
    });
    // Sill
    g.rect(x - 2, y + h + 1, w + 4, 2).fill({ color: COL_STONE_LT });
  }

  private _drawHorseshoe(g: Graphics, x: number, y: number): void {
    g.moveTo(x - 4, y)
      .bezierCurveTo(x - 4, y - 5, x + 4, y - 5, x + 4, y)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(x - 4, y)
      .lineTo(x - 4, y + 3)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(x + 4, y)
      .lineTo(x + 4, y + 3)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Nail
    g.circle(x, y - 5, 0.8).fill({ color: COL_IRON_DK });
  }

  private _drawWallTorch(g: Graphics, x: number, y: number): void {
    // Bracket
    g.rect(x - 1, y, 2, 4).fill({ color: COL_IRON });
    g.rect(x - 3, y + 4, 6, 2).fill({ color: COL_IRON });
    // Torch body
    g.rect(x - 2, y + 6, 4, 10)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Wrap
    g.rect(x - 2, y + 8, 4, 2).fill({ color: COL_LEATHER });
    // Flame (static)
    g.moveTo(x, y + 5)
      .quadraticCurveTo(x - 3, y, x, y - 4)
      .quadraticCurveTo(x + 3, y, x, y + 5)
      .fill({ color: COL_FIRE, alpha: 0.7 });
    g.moveTo(x, y + 4)
      .quadraticCurveTo(x - 1, y + 1, x, y - 1)
      .quadraticCurveTo(x + 1, y + 1, x, y + 4)
      .fill({ color: COL_FIRE_CORE, alpha: 0.6 });
    // Glow
    g.circle(x, y, 6).fill({ color: COL_GLOW, alpha: 0.08 });
  }

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 10;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      for (let col = offset; col < w; col += 20) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.35 });
      }
      for (let col = offset; col < w - 6; col += 20) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 16, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.2 });
        g.moveTo(x + col + 1, y + row + 7)
          .lineTo(x + col + 16, y + row + 7)
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
    const light = [[0.1, 0.2], [0.5, 0.5], [0.25, 0.8], [0.75, 0.15], [0.6, 0.65]];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({ color: COL_STONE_LT, alpha: 0.2 });
    }
    const dark = [[0.3, 0.1], [0.7, 0.4], [0.15, 0.6], [0.55, 0.85], [0.85, 0.3]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({ color: COL_STONE_DK, alpha: 0.15 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2).fill({ color: COL_MOSS, alpha: 0.4 });
    g.circle(x + 2, y - 1, 1.2).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
