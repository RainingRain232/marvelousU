// Procedural blacksmith renderer for BuildingView.
//
// Draws "Grimbold's Workspace" — a cluttered medieval forge (~2×2 tiles) with:
//   • Stone walls with golden window light
//   • Wooden workbench with tools and half-finished projects
//   • Open leather-bound tomes on the bench
//   • Massive wooden anvil in the center
//   • Grimbold (blacksmith) working with glowing hammer
//   • Half-finished pieces (sword hilt, armor, plowshare)
//   • Hot metal glow and coal fire
//   • Cluttered tools scattered about
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — warm forge & stone
const COL_STONE = 0x6b5a4a;
const COL_STONE_DK = 0x4a3d30;
const COL_STONE_LT = 0x8b7a6a;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_COAL = 0x1a1a1a;
const COL_FIRE = 0xff4400;
const COL_FIRE_CORE = 0xffff66;
const COL_IRON = 0x555555;
const COL_IRON_HOT = 0xff6633;
const COL_GLOW = 0xffaa33;
const COL_LEATHER = 0x8b4513;
const COL_PAPER = 0xd4c4a0;

// Animation timing
const HAMMER_SPEED = 3.5;
const FIRE_FLICKER = 10.0;
const GLOW_PULSE = 2.0;

// ---------------------------------------------------------------------------
// BlacksmithRenderer
// ---------------------------------------------------------------------------

export class BlacksmithRenderer {
  readonly container = new Container();

  private _walls = new Graphics();
  private _workbench = new Graphics();
  private _anvil = new Graphics();
  private _grimbold = new Graphics();
  private _projects = new Graphics();
  private _fire = new Graphics();
  private _tools = new Graphics();
  private _tomes = new Graphics();
  private _windowLight = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawWalls();
    this._drawWorkbench();
    this._drawAnvil();
    this._drawProjects();
    this._drawTomes();
    this._drawTools();
    this._drawWindows();

    this.container.addChild(this._walls);
    this.container.addChild(this._windowLight);
    this.container.addChild(this._fire);
    this.container.addChild(this._workbench);
    this.container.addChild(this._tomes);
    this.container.addChild(this._projects);
    this.container.addChild(this._tools);
    this.container.addChild(this._anvil);
    this.container.addChild(this._grimbold);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateFire(this._time);
    this._updateGrimbold(this._time);
    this._updateProjects(this._time);
    this._updateTomes(this._time);
    this._updateWindowLight(this._time);
  }

  // ── Walls & Floor ────────────────────────────────────────────────────────

  private _drawWalls(): void {
    const g = this._walls;

    // Stone floor
    g.rect(0, TH - 12, TW, 12).fill({ color: COL_STONE_DK });

    // Back wall
    g.rect(0, 0, TW, TH - 12)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone brick pattern on back wall
    for (let row = 0; row < 5; row++) {
      const offset = (row % 2) * 12;
      for (let col = 0; col < 6; col++) {
        g.rect(8 + col * 20 + offset, 8 + row * 22, 16, 18)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_DK, width: 0.5, alpha: 0.4 });
      }
    }

    // Left wall (partial, like a corner)
    g.rect(0, 0, 12, TH - 12)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Right wall (partial)
    g.rect(TW - 12, 0, 12, TH - 12)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Ceiling beam
    g.rect(0, 8, TW, 6).fill({ color: COL_WOOD_DK });
  }

  private _drawWindows(): void {
    // Windows with golden light - drawn in _updateWindowLight
  }

  private _updateWindowLight(time: number): void {
    const g = this._windowLight;
    g.clear();

    // Golden glow from windows
    const pulse = (Math.sin(time * GLOW_PULSE) + 1) / 2;
    const alpha = 0.15 + pulse * 0.1;

    // Window 1 (left)
    g.rect(20, 20, 20, 28).fill({ color: COL_FIRE_CORE, alpha: alpha * 1.5 });
    g.rect(20, 20, 20, 28).stroke({ color: COL_WOOD, width: 2 });
    // Window cross
    g.moveTo(30, 20).lineTo(30, 48).stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(20, 34).lineTo(40, 34).stroke({ color: COL_WOOD, width: 1.5 });

    // Window 2 (right)
    g.rect(TW - 40, 20, 20, 28).fill({
      color: COL_FIRE_CORE,
      alpha: alpha * 1.5,
    });
    g.rect(TW - 40, 20, 20, 28).stroke({ color: COL_WOOD, width: 2 });
    g.moveTo(TW - 30, 20)
      .lineTo(TW - 30, 48)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(TW - 40, 34)
      .lineTo(TW - 20, 34)
      .stroke({ color: COL_WOOD, width: 1.5 });

    // Golden light beams on floor
    g.moveTo(20, 48)
      .lineTo(10, TH - 12)
      .stroke({ color: COL_GLOW, width: 1, alpha: alpha });
    g.moveTo(40, 48)
      .lineTo(50, TH - 12)
      .stroke({ color: COL_GLOW, width: 1, alpha: alpha });
    g.moveTo(TW - 40, 48)
      .lineTo(TW - 50, TH - 12)
      .stroke({ color: COL_GLOW, width: 1, alpha: alpha });
    g.moveTo(TW - 20, 48)
      .lineTo(TW - 10, TH - 12)
      .stroke({ color: COL_GLOW, width: 1, alpha: alpha });
  }

  // ── Workbench ────────────────────────────────────────────────────────────

  private _drawWorkbench(): void {
    const g = this._workbench;

    // Workbench along left wall
    g.rect(14, 50, 35, 12)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 1 });

    // Workbench surface scratches
    g.moveTo(18, 54)
      .lineTo(30, 55)
      .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.5 });
    g.moveTo(25, 58)
      .lineTo(40, 57)
      .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.5 });
    g.moveTo(15, 60)
      .lineTo(25, 61)
      .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.5 });

    // Workbench legs
    g.rect(16, 62, 4, 12).fill({ color: COL_WOOD_DK });
    g.rect(42, 62, 4, 12).fill({ color: COL_WOOD_DK });
  }

  // ── Tomes ────────────────────────────────────────────────────────────────

  private _drawTomes(): void {
    // Initial draw - will be animated
  }

  private _updateTomes(time: number): void {
    const g = this._tomes;
    g.clear();

    // Open books/tomes on workbench
    const pageTurn = Math.sin(time * 0.5) * 0.02;

    // Book 1 - open on bench
    g.moveTo(20, 54 + pageTurn)
      .lineTo(28, 53)
      .lineTo(28, 58)
      .lineTo(20, 59 + pageTurn)
      .closePath()
      .fill({ color: COL_LEATHER });
    g.moveTo(28, 53)
      .lineTo(36, 52 + pageTurn)
      .lineTo(36, 57 + pageTurn)
      .lineTo(28, 58)
      .closePath()
      .fill({ color: COL_LEATHER });

    // Pages
    g.rect(22, 55, 4, 3).fill({ color: COL_PAPER });
    g.rect(30, 54, 4, 3).fill({ color: COL_PAPER });

    // Book 2 - slightly stacked
    g.rect(38, 52, 8, 3).fill({ color: COL_LEATHER });
    g.rect(38, 55, 8, 2).fill({ color: 0x6b3513 });

    // Scattered notes
    g.rect(25, 56, 4, 3).fill({ color: COL_PAPER, alpha: 0.8 });
    g.rect(35, 55, 3, 4).fill({ color: COL_PAPER, alpha: 0.7 });
  }

  // ── Projects (half-finished pieces) ───────────────────────────────────

  private _drawProjects(): void {
    // Will be animated
  }

  private _updateProjects(_time: number): void {
    const g = this._projects;
    g.clear();

    // Sword hilt on workbench
    g.rect(16, 48, 6, 2).fill({ color: COL_WOOD });
    g.rect(19, 46, 2, 4).fill({ color: COL_IRON });
    g.circle(20, 46, 1.5).fill({ color: COL_IRON_HOT });

    // Armor piece (pauldron shape)
    g.ellipse(42, 56, 5, 3).fill({ color: COL_IRON });
    g.ellipse(42, 56, 3, 2).fill({ color: COL_IRON_HOT });

    // Plowshare
    g.moveTo(45, 49)
      .lineTo(48, 49)
      .lineTo(50, 51)
      .lineTo(45, 51)
      .closePath()
      .fill({ color: COL_IRON });

    // Half-finished gear/cog on floor
    g.circle(80, TH - 18, 6).fill({ color: COL_IRON });
    g.circle(80, TH - 18, 4).fill({ color: COL_STONE_DK });
    g.circle(80, TH - 18, 2).fill({ color: COL_IRON });

    // Hammer head glowing
    const glowPulse = (Math.sin(_time * GLOW_PULSE) + 1) / 2;
    g.circle(35, 51, 3 + glowPulse).fill({
      color: COL_IRON_HOT,
      alpha: 0.3 + glowPulse * 0.3,
    });
  }

  // ── Tools (scattered) ─────────────────────────────────────────────────

  private _drawTools(): void {
    const g = this._tools;

    // Tongs on wall
    g.moveTo(55, 25).lineTo(55, 45).stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(52, 45).lineTo(58, 45).stroke({ color: COL_IRON, width: 2 });

    // Chisel rack
    g.rect(70, 30, 2, 15).fill({ color: COL_WOOD_DK });
    g.rect(75, 32, 2, 12).fill({ color: COL_WOOD_DK });
    g.rect(80, 28, 2, 14).fill({ color: COL_WOOD_DK });

    // Files
    g.rect(85, 40, 8, 1).fill({ color: COL_IRON });
    g.rect(90, 38, 10, 1).fill({ color: COL_IRON });

    // Bucket
    g.ellipse(100, TH - 16, 6, 4).fill({ color: COL_WOOD });
    g.rect(94, TH - 20, 12, 8).fill({ color: COL_WOOD });
    g.ellipse(100, TH - 20, 6, 3).fill({ color: 0x333333 });
  }

  // ── Anvil ────────────────────────────────────────────────────────────────

  private _drawAnvil(): void {
    // Will be animated
    this._updateAnvil(0);
  }

  private _updateAnvil(_time: number): void {
    const g = this._anvil;
    g.clear();

    const ax = TW / 2 + 10;
    const ay = TH - 20;

    // Anvil base
    g.rect(ax - 12, ay, 24, 8).fill({ color: COL_WOOD_DK });

    // Anvil body
    g.rect(ax - 8, ay - 18, 16, 18).fill({ color: COL_IRON });
    g.rect(ax - 14, ay - 20, 28, 4).fill({ color: COL_IRON });

    // Anvil horn
    g.moveTo(ax - 14, ay - 18)
      .lineTo(ax - 24, ay - 16)
      .lineTo(ax - 14, ay - 14)
      .closePath()
      .fill({ color: COL_IRON });

    // Anvil face (working surface)
    g.rect(ax - 8, ay - 22, 16, 4).fill({ color: COL_IRON_HOT, alpha: 0.3 });

    // Anvil stand
    g.rect(ax - 6, ay + 8, 12, 4).fill({ color: COL_WOOD });
  }

  // ── Fire/Forge ─────────────────────────────────────────────────────────

  private _updateFire(time: number): void {
    const g = this._fire;
    g.clear();

    // Forge fire in corner
    const fx = TW - 20;
    const fy = TH - 18;

    // Fire pit base
    g.rect(fx - 10, fy, 20, 8).fill({ color: COL_STONE_DK });

    // Coals
    g.circle(fx - 4, fy - 2, 3).fill({ color: COL_COAL });
    g.circle(fx + 3, fy - 1, 4).fill({ color: COL_COAL });
    g.circle(fx, fy - 3, 3).fill({ color: COL_COAL });

    // Flames
    const f1 = Math.sin(time * FIRE_FLICKER) * 2;
    const f2 = Math.sin(time * FIRE_FLICKER * 1.3 + 1) * 1.5;
    const f3 = Math.sin(time * FIRE_FLICKER * 0.7 + 2) * 1;

    g.moveTo(fx, fy - 5)
      .quadraticCurveTo(fx - 4 + f1, fy - 15, fx, fy - 22)
      .quadraticCurveTo(fx + 4 + f2, fy - 15, fx, fy - 5)
      .fill({ color: COL_FIRE, alpha: 0.8 });

    g.moveTo(fx, fy - 3)
      .quadraticCurveTo(fx - 2 + f3, fy - 10, fx, fy - 16)
      .quadraticCurveTo(fx + 2 + f1, fy - 10, fx, fy - 3)
      .fill({ color: COL_FIRE_CORE, alpha: 0.9 });

    // Glow on nearby surfaces
    g.circle(fx - 25, fy - 10, 15).fill({ color: COL_GLOW, alpha: 0.1 });
  }

  // ── Grimbold (Blacksmith) ─────────────────────────────────────────────

  private _updateGrimbold(time: number): void {
    const g = this._grimbold;
    g.clear();

    const gx = TW / 2 - 15;
    const gy = TH - 22;

    // Hammer animation
    const hammerCycle = (time * HAMMER_SPEED) % 1;
    let hammerLift = 0;
    if (hammerCycle < 0.3) {
      // Raise hammer
      hammerLift = (hammerCycle / 0.3) * 15;
    } else if (hammerCycle < 0.5) {
      // Hold at top briefly
      hammerLift = 15;
    } else if (hammerCycle < 0.7) {
      // Strike down
      const progress = (hammerCycle - 0.5) / 0.2;
      hammerLift = 15 * (1 - progress);
    } else {
      // Reset
      hammerLift = 0;
    }

    // Grimbold's body (stocky, muscular)
    g.ellipse(gx, gy - 20, 10, 14).fill({ color: 0x4a3020 });
    g.ellipse(gx, gy - 20, 8, 12).fill({ color: 0x5a4030 });

    // Leather apron
    g.rect(gx - 8, gy - 28, 16, 20).fill({ color: 0x5a3a1a });
    g.rect(gx - 6, gy - 26, 12, 3).fill({ color: 0x4a2a10 });

    // Belt
    g.rect(gx - 10, gy - 8, 20, 3).fill({ color: 0x3a2510 });

    // Head
    g.circle(gx, gy - 36, 8).fill({ color: 0xd4a574 });
    g.circle(gx, gy - 36, 8).stroke({ color: 0x8b6914, width: 0.5 });

    // Hair (wild, graying)
    g.circle(gx - 4, gy - 42, 5).fill({ color: 0x6a5a4a });
    g.circle(gx + 4, gy - 42, 5).fill({ color: 0x6a5a4a });
    g.circle(gx, gy - 43, 4).fill({ color: 0x7a6a5a });

    // Beard
    g.ellipse(gx, gy - 28, 5, 6).fill({ color: 0x6a5a4a });

    // Eyes (focused on work)
    g.circle(gx - 3, gy - 37, 1.2).fill({ color: 0x2a1a0f });
    g.circle(gx + 3, gy - 37, 1.2).fill({ color: 0x2a1a0f });
    g.circle(gx - 3, gy - 37, 0.5).fill({ color: 0xffffff, alpha: 0.5 });
    g.circle(gx + 3, gy - 37, 0.5).fill({ color: 0xffffff, alpha: 0.5 });

    // Nose
    g.circle(gx, gy - 34, 1.5).fill({ color: 0xc49464 });

    // Arms
    // Right arm (holding hammer)
    g.rect(gx + 8, gy - 28, 12, 4).fill({ color: 0x5a4030 });
    g.rect(gx + 18, gy - 30, 4, 6).fill({ color: 0xd4a574 });

    // Hammer handle
    g.moveTo(gx + 20, gy - 30 - hammerLift)
      .lineTo(gx + 28, gy - 42 - hammerLift)
      .stroke({ color: COL_WOOD, width: 3 });

    // Hammer head with inner glow
    const glowIntensity = (Math.sin(time * GLOW_PULSE) + 1) / 2;
    g.rect(gx + 26, gy - 50 - hammerLift, 10, 7).fill({ color: COL_IRON });
    g.rect(gx + 28, gy - 49 - hammerLift, 6, 5).fill({
      color: COL_IRON_HOT,
      alpha: 0.5 + glowIntensity * 0.5,
    });
    g.circle(gx + 31, gy - 46 - hammerLift, 2).fill({
      color: COL_FIRE_CORE,
      alpha: 0.3 + glowIntensity * 0.4,
    });

    // Left arm (reaching toward anvil)
    g.rect(gx - 18, gy - 26, 10, 4).fill({ color: 0x5a4030 });
    g.rect(gx - 22, gy - 24, 4, 6).fill({ color: 0xd4a574 });

    // Legs
    g.rect(gx - 6, gy - 8, 5, 14).fill({ color: 0x3a2510 });
    g.rect(gx + 2, gy - 8, 5, 14).fill({ color: 0x3a2510 });

    // Boots
    g.rect(gx - 7, gy + 4, 7, 4).fill({ color: COL_WOOD_DK });
    g.rect(gx + 1, gy + 4, 7, 4).fill({ color: COL_WOOD_DK });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
