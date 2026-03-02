// Procedural siege workshop renderer for BuildingView.
//
// Draws a detailed 2×2 tile medieval fantasy siege workshop with:
//   • Heavy stone-and-timber open-front workshop hall
//   • Massive buttressed walls with brick pattern, stone variation, moss, ivy
//   • Tiled roof with chimney, smoke wisps, and dormer vent
//   • A half-built trebuchet on a wooden cradle (center-piece)
//   • A completed ballista on wheels with bolt rack
//   • Siege engineer at the trebuchet, measuring and adjusting
//   • Forge hearth with animated fire, bellows, and glowing coals
//   • Anvil with hot metal piece, tongs, and sparks on strike
//   • Raven perched on the roof ridge, looking around
//   • Wooden scaffolding, rope coils, timber stacks, barrel of pitch
//   • Blueprint table with siege plans and calipers
//   • Wall-mounted torches, iron chandelier chains
//   • Player-colored war banner
//
// All drawing uses PixiJS Graphics.  2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px
const TH = 2 * TS; // 128px

// --- Palette ---
const COL_STONE = 0x6b6560;
const COL_STONE_DK = 0x4a4540;
const COL_STONE_LT = 0x8b8580;
const COL_MORTAR = 0x555048;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_ROOF = 0x3d2817;
const COL_ROOF_DK = 0x2a1a0f;
const COL_ROOF_LT = 0x553828;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_FIRE = 0xff4400;
const COL_FIRE_MID = 0xff8800;
const COL_FIRE_CORE = 0xffff44;
const COL_COAL = 0x1a1a1a;
const COL_GLOW = 0xffaa33;
const COL_LEATHER = 0x8b4513;
const COL_LEATHER_DK = 0x5a2a08;
const COL_ROPE = 0xa89060;
const COL_ROPE_DK = 0x887040;
const COL_PAPER = 0xd4c4a0;
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb08050;
const COL_CLOTH = 0x5a5a6a;
const COL_CLOTH_DK = 0x3a3a4a;
const COL_PITCH = 0x1a1510;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_SOOT = 0x2a2520;
const COL_GOLD = 0xccaa44;

// Raven
const COL_RAVEN = 0x1a1a1a;
const COL_RAVEN_BEAK = 0xcc8833;
const COL_RAVEN_EYE = 0xffcc00;

// Ballista
const COL_BALLISTA = 0x60451e;
const COL_BALLISTA_DK = 0x402a10;

// Animation timing
const HAMMER_SPEED = 3.5;
const FIRE_FLICKER = 10.0;
const GLOW_PULSE = 2.0;
const RAVEN_LOOK_SPEED = 1.5;
const FLAG_SPEED = 3.0;

// ---------------------------------------------------------------------------
// SiegeWorkshopRenderer
// ---------------------------------------------------------------------------

export class SiegeWorkshopRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics(); // Walls, roof, chimney, floor
  private _forge = new Graphics(); // Forge fire, coals, bellows
  private _machines = new Graphics(); // Trebuchet, ballista (static)
  private _props = new Graphics(); // Blueprint table, barrels, ropes, tools
  private _engineer = new Graphics(); // Siege engineer, animated
  private _sparks = new Graphics(); // Anvil sparks
  private _smoke = new Graphics(); // Chimney smoke
  private _raven = new Graphics(); // Raven on roof
  private _banner = new Graphics(); // Player banner

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBase();
    this._drawMachines();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._forge);
    this.container.addChild(this._machines);
    this.container.addChild(this._props);
    this.container.addChild(this._engineer);
    this.container.addChild(this._sparks);
    this.container.addChild(this._smoke);
    this.container.addChild(this._raven);
    this.container.addChild(this._banner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateForge(this._time);
    this._updateEngineer(this._time);
    this._updateSparks(this._time);
    this._updateSmoke(this._time);
    this._updateRaven(this._time);
    this._updateBanner(this._time);
  }

  // =========================================================================
  // Static base — walls, pillars, roof, chimney, floor
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation ──
    g.rect(0, TH - 10, TW, 10).fill({ color: COL_STONE_DK });
    // Stone flagstone floor
    for (let i = 0; i < 8; i++) {
      g.rect(2 + i * 16, TH - 9, 14, 7)
        .fill({ color: i % 2 === 0 ? COL_STONE : COL_STONE_LT, alpha: 0.25 })
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.25 });
    }
    // Sawdust / wood shavings on floor
    g.ellipse(40, TH - 8, 10, 3).fill({ color: COL_WOOD_LT, alpha: 0.12 });
    g.ellipse(90, TH - 7, 8, 2).fill({ color: COL_WOOD_LT, alpha: 0.1 });

    // ── Back wall ──
    const wallY = 22;
    const wallH = TH - wallY - 14;
    g.rect(0, wallY, TW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.rect(1, wallY + 1, 5, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });

    this._drawBrickPattern(g, 2, wallY + 2, TW - 4, wallH - 4);
    this._drawStoneVariation(g, 6, wallY + 6, TW - 12, wallH - 12);

    // ── Side walls / buttresses ──
    // Left wall (thick)
    g.rect(0, wallY, 18, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    for (let row = 0; row < wallH; row += 8) {
      g.moveTo(0, wallY + row)
        .lineTo(18, wallY + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
    }
    // Left buttress
    g.moveTo(18, wallY + 10)
      .lineTo(26, wallY + 4)
      .lineTo(26, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(18, wallY + 10, 8, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.3 });

    // Right wall
    g.rect(TW - 18, wallY, 18, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    for (let row = 0; row < wallH; row += 8) {
      g.moveTo(TW - 18, wallY + row)
        .lineTo(TW, wallY + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
    }
    // Right buttress
    g.moveTo(TW - 18, wallY + 10)
      .lineTo(TW - 26, wallY + 4)
      .lineTo(TW - 26, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(TW - 26, wallY + 10, 8, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.3 });

    // ── Stone pillars ──
    this._drawPillar(g, 18, wallY, wallH);
    this._drawPillar(g, TW - 24, wallY, wallH);

    // ── Heavy timber ceiling beam ──
    g.rect(0, wallY - 4, TW, 6)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.moveTo(4, wallY - 3)
      .lineTo(TW - 4, wallY - 2)
      .stroke({ color: COL_WOOD, width: 0.3, alpha: 0.4 });
    g.moveTo(8, wallY)
      .lineTo(TW - 8, wallY + 1)
      .stroke({ color: COL_WOOD, width: 0.3, alpha: 0.3 });

    // ── Roof (steep, dark timber with tiles) ──
    const roofBaseY = wallY - 4;
    g.moveTo(-4, roofBaseY + 2)
      .lineTo(TW / 2, roofBaseY - 24)
      .lineTo(TW + 4, roofBaseY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.5 });
    // Highlight
    g.moveTo(TW / 2, roofBaseY - 24)
      .lineTo(TW + 4, roofBaseY + 2)
      .lineTo(TW / 2 + 1, roofBaseY - 23)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.2 });
    // Tile lines
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = roofBaseY - 24 + frac * 26;
      const halfW = ((TW + 8) / 2) * frac;
      g.moveTo(TW / 2 - halfW, ly)
        .lineTo(TW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // Roof overhang board
    g.rect(-4, roofBaseY, TW + 8, 3)
      .fill({ color: COL_ROOF_DK });

    // ── Chimney (right side) ──
    const chimX = TW - 30;
    const chimW = 14;
    const chimY = roofBaseY - 32;
    g.rect(chimX, chimY, chimW, 32)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    this._drawBrickPattern(g, chimX + 1, chimY + 1, chimW - 2, 30);
    // Chimney cap
    g.rect(chimX - 2, chimY - 3, chimW + 4, 4)
      .fill({ color: COL_STONE_DK });
    // Soot
    g.rect(chimX + 3, chimY + 4, 8, 8).fill({ color: COL_SOOT, alpha: 0.2 });

    // ── Dormer vent (left side of roof) ──
    const ventX = 20;
    const ventY = roofBaseY - 14;
    g.rect(ventX, ventY, 16, 10)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.moveTo(ventX - 2, ventY)
      .lineTo(ventX + 8, ventY - 6)
      .lineTo(ventX + 18, ventY)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Vent slats
    for (let i = 0; i < 3; i++) {
      g.rect(ventX + 2 + i * 5, ventY + 2, 3, 6)
        .fill({ color: 0x1a1a1a, alpha: 0.5 });
    }

    // ── Wall torch (left) ──
    this._drawWallTorch(g, 22, wallY + 14);

    // ── Iron chandelier chains (hanging from beam) ──
    g.moveTo(TW / 2 - 15, wallY - 2)
      .lineTo(TW / 2 - 15, wallY + 8)
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    g.moveTo(TW / 2 + 15, wallY - 2)
      .lineTo(TW / 2 + 15, wallY + 8)
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Crossbar
    g.rect(TW / 2 - 16, wallY + 8, 32, 2).fill({ color: COL_IRON });

    // ── Moss and ivy ──
    this._drawMoss(g, 4, TH - 12, 10);
    this._drawMoss(g, TW - 14, TH - 11, 8);
    this._drawMoss(g, 2, wallY + wallH - 2, 7);
    this._drawIvy(g, 4, wallY + 8, 45);
    this._drawIvy(g, TW - 6, wallY + 12, 40);
  }

  // =========================================================================
  // Siege machines — trebuchet + ballista (static)
  // =========================================================================

  private _drawMachines(): void {
    const g = this._machines;

    // ── Half-built trebuchet (center) ──
    const tx = TW / 2 - 6;
    const ty = TH - 14;

    // Wooden cradle / base frame
    g.rect(tx - 18, ty - 2, 36, 4)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.8 });
    g.rect(tx - 20, ty + 2, 40, 3).fill({ color: COL_WOOD_DK });
    // Cross braces on base
    g.moveTo(tx - 16, ty - 2)
      .lineTo(tx - 10, ty + 2)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.moveTo(tx + 10, ty - 2)
      .lineTo(tx + 16, ty + 2)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // A-frame uprights
    g.moveTo(tx - 8, ty - 2)
      .lineTo(tx - 2, ty - 40)
      .stroke({ color: COL_WOOD, width: 3 });
    g.moveTo(tx + 8, ty - 2)
      .lineTo(tx + 2, ty - 40)
      .stroke({ color: COL_WOOD, width: 3 });
    // Cross brace
    g.moveTo(tx - 5, ty - 20)
      .lineTo(tx + 5, ty - 20)
      .stroke({ color: COL_WOOD_DK, width: 2 });

    // Axle beam (horizontal, at top of A-frame)
    g.rect(tx - 4, ty - 42, 8, 4)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });

    // Throwing arm (long beam, resting at angle — not yet complete)
    g.moveTo(tx, ty - 40)
      .lineTo(tx - 22, ty - 30)
      .stroke({ color: COL_WOOD_LT, width: 2.5 });
    g.moveTo(tx, ty - 40)
      .lineTo(tx + 16, ty - 52)
      .stroke({ color: COL_WOOD_LT, width: 2.5 });

    // Counterweight bucket (partial, dangling from short arm)
    g.moveTo(tx - 22, ty - 30)
      .lineTo(tx - 22, ty - 24)
      .stroke({ color: COL_ROPE, width: 1 });
    g.moveTo(tx - 26, ty - 24)
      .lineTo(tx - 26, ty - 18)
      .lineTo(tx - 18, ty - 18)
      .lineTo(tx - 18, ty - 24)
      .closePath()
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    // Rocks visible inside
    g.circle(tx - 24, ty - 20, 2).fill({ color: COL_STONE_LT });
    g.circle(tx - 21, ty - 21, 1.5).fill({ color: COL_STONE });

    // Sling (rope, hanging from long arm end)
    g.moveTo(tx + 16, ty - 52)
      .quadraticCurveTo(tx + 20, ty - 46, tx + 18, ty - 42)
      .stroke({ color: COL_ROPE, width: 1 });

    // Iron reinforcement bands on frame
    g.rect(tx - 3, ty - 22, 6, 2).fill({ color: COL_IRON });
    g.rect(tx - 3, ty - 34, 6, 2).fill({ color: COL_IRON });

    // ── Completed ballista (right side) ──
    this._drawBallista(g, TW - 48, TH - 32);

    // ── Timber stack (leftover lumber) ──
    const lx = 30;
    const ly = TH - 16;
    for (let i = 0; i < 4; i++) {
      g.rect(lx, ly - i * 3, 20, 2.5)
        .fill({ color: i % 2 === 0 ? COL_WOOD : COL_WOOD_LT })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
    }
    // End grain circles
    g.circle(lx, ly - 1, 1.2).fill({ color: COL_WOOD_LT });
    g.circle(lx, ly - 4, 1).fill({ color: COL_WOOD_LT });
    g.circle(lx, ly - 7, 1.2).fill({ color: COL_WOOD_LT });
  }

  private _drawBallista(g: Graphics, x: number, y: number): void {
    // Base platform
    g.rect(x, y + 8, 22, 4)
      .fill({ color: COL_BALLISTA })
      .stroke({ color: COL_BALLISTA_DK, width: 0.5 });

    // Wheels (spoked)
    for (const wx of [x + 3, x + 19]) {
      g.circle(wx, y + 14, 5)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: COL_IRON, width: 0.8 });
      g.circle(wx, y + 14, 1).fill({ color: COL_IRON }); // hub
      // Spokes
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2;
        g.moveTo(wx, y + 14)
          .lineTo(wx + Math.cos(angle) * 4, y + 14 + Math.sin(angle) * 4)
          .stroke({ color: COL_WOOD, width: 0.5 });
      }
    }

    // Main frame (upright)
    g.rect(x + 4, y - 6, 14, 16)
      .fill({ color: COL_BALLISTA })
      .stroke({ color: COL_BALLISTA_DK, width: 0.8 });
    // Groove for bolt
    g.rect(x + 8, y - 4, 6, 2).fill({ color: COL_BALLISTA_DK });

    // Bow arms (curved)
    g.moveTo(x + 11, y - 4)
      .quadraticCurveTo(x - 4, y - 10, x - 2, y - 16)
      .stroke({ color: COL_IRON, width: 2 });
    g.moveTo(x + 11, y - 4)
      .quadraticCurveTo(x + 26, y - 10, x + 24, y - 16)
      .stroke({ color: COL_IRON, width: 2 });

    // Bowstring
    g.moveTo(x - 2, y - 16)
      .lineTo(x + 11, y - 6)
      .lineTo(x + 24, y - 16)
      .stroke({ color: 0x999988, width: 0.8 });

    // Nut mechanism
    g.circle(x + 11, y - 4, 3)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });

    // Bolt loaded
    g.moveTo(x + 11, y - 6)
      .lineTo(x + 11, y - 18)
      .stroke({ color: COL_WOOD, width: 1.5 });
    // Bolt head
    g.moveTo(x + 10, y - 18)
      .lineTo(x + 11, y - 22)
      .lineTo(x + 12, y - 18)
      .fill({ color: COL_IRON });
    // Fletching
    g.moveTo(x + 10, y - 7)
      .lineTo(x + 8, y - 5)
      .stroke({ color: 0xdddddd, width: 0.5 });
    g.moveTo(x + 12, y - 7)
      .lineTo(x + 14, y - 5)
      .stroke({ color: 0xdddddd, width: 0.5 });

    // Bolt rack (beside ballista)
    g.rect(x + 24, y + 2, 6, 16)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Bolts in rack
    for (let i = 0; i < 3; i++) {
      g.moveTo(x + 27, y + 4 + i * 5)
        .lineTo(x + 27, y + 1 + i * 5)
        .stroke({ color: COL_WOOD_LT, width: 1 });
      g.moveTo(x + 26.5, y + 1 + i * 5)
        .lineTo(x + 27, y - 1 + i * 5)
        .lineTo(x + 27.5, y + 1 + i * 5)
        .fill({ color: COL_IRON, alpha: 0.6 });
    }
  }

  // =========================================================================
  // Props — blueprint table, barrels, ropes, tools
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Blueprint table (left side, against buttress) ──
    const btx = 28;
    const bty = 58;
    // Table
    g.rect(btx, bty, 24, 6)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.8 });
    // Legs
    g.rect(btx + 2, bty + 6, 3, 10).fill({ color: COL_WOOD_DK });
    g.rect(btx + 19, bty + 6, 3, 10).fill({ color: COL_WOOD_DK });

    // Siege plans (unrolled scroll)
    g.rect(btx + 2, bty - 4, 18, 7)
      .fill({ color: COL_PAPER })
      .stroke({ color: COL_PAPER, width: 0.3 });
    // Scroll roll at top
    g.ellipse(btx + 11, bty - 4, 9, 1.5).fill({ color: COL_PAPER });
    // Blueprint lines (siege weapon sketch)
    g.moveTo(btx + 5, bty - 2)
      .lineTo(btx + 8, bty - 2)
      .stroke({ color: 0x334488, width: 0.4 });
    g.moveTo(btx + 5, bty)
      .lineTo(btx + 15, bty)
      .stroke({ color: 0x334488, width: 0.3 });
    g.moveTo(btx + 10, bty - 3)
      .lineTo(btx + 10, bty + 1)
      .stroke({ color: 0x334488, width: 0.3 });
    // Small triangle (trebuchet sketch)
    g.moveTo(btx + 12, bty - 2)
      .lineTo(btx + 14, bty + 1)
      .lineTo(btx + 16, bty - 2)
      .stroke({ color: 0x334488, width: 0.3 });

    // Calipers on table
    g.moveTo(btx + 18, bty - 1)
      .lineTo(btx + 20, bty - 5)
      .stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(btx + 18, bty - 1)
      .lineTo(btx + 22, bty - 4)
      .stroke({ color: COL_IRON, width: 0.8 });
    g.circle(btx + 18, bty - 1, 1).fill({ color: COL_IRON_DK });

    // ── Barrel of pitch (right side, near forge) ──
    const bpx = TW - 48;
    const bpy = TH - 16;
    g.ellipse(bpx, bpy + 8, 7, 3)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(bpx - 7, bpy, 14, 8)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.ellipse(bpx, bpy, 7, 3).fill({ color: COL_PITCH });
    // Iron hoops
    g.rect(bpx - 7, bpy + 2, 14, 1.5).fill({ color: COL_IRON });
    g.rect(bpx - 7, bpy + 6, 14, 1.5).fill({ color: COL_IRON });

    // ── Rope coils (near trebuchet base) ──
    const rcx = 56;
    const rcy = TH - 12;
    // Coil (concentric ellipses)
    g.ellipse(rcx, rcy, 6, 3)
      .fill({ color: COL_ROPE })
      .stroke({ color: COL_ROPE_DK, width: 0.8 });
    g.ellipse(rcx, rcy, 4, 2).fill({ color: COL_ROPE_DK, alpha: 0.3 });
    g.ellipse(rcx, rcy, 2, 1).fill({ color: COL_ROPE, alpha: 0.5 });
    // Loose rope end
    g.moveTo(rcx + 6, rcy)
      .quadraticCurveTo(rcx + 10, rcy - 2, rcx + 12, rcy + 1)
      .stroke({ color: COL_ROPE, width: 1 });

    // ── Scaffolding (simple, behind trebuchet) ──
    g.rect(TW / 2 - 22, 36, 2, 50).fill({ color: COL_WOOD });
    g.rect(TW / 2 + 20, 36, 2, 50).fill({ color: COL_WOOD });
    g.rect(TW / 2 - 22, 50, 44, 2).fill({ color: COL_WOOD_DK });
    g.rect(TW / 2 - 22, 70, 44, 2).fill({ color: COL_WOOD_DK });
    // Diagonal brace
    g.moveTo(TW / 2 - 22, 52)
      .lineTo(TW / 2 + 22, 70)
      .stroke({ color: COL_WOOD_DK, width: 0.8, alpha: 0.5 });

    // ── Anvil (near forge) ──
    const avx = TW - 36;
    const avy = TH - 20;
    // Stump
    g.rect(avx - 6, avy, 12, 8)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.ellipse(avx, avy, 6, 2).fill({ color: COL_WOOD_LT });
    // Anvil body
    g.rect(avx - 5, avy - 8, 10, 8).fill({ color: COL_IRON });
    g.rect(avx - 7, avy - 10, 14, 3).fill({ color: COL_IRON });
    // Horn
    g.moveTo(avx - 7, avy - 8)
      .lineTo(avx - 14, avy - 6)
      .lineTo(avx - 7, avy - 5)
      .closePath()
      .fill({ color: COL_IRON });
  }

  // =========================================================================
  // Forge — animated fire, bellows
  // =========================================================================

  private _updateForge(time: number): void {
    const g = this._forge;
    g.clear();

    const fx = TW - 20;
    const fy = TH - 18;

    // Stone hearth
    g.rect(fx - 12, fy, 24, 8)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.3 });
    g.rect(fx - 10, fy - 4, 20, 6).fill({ color: COL_STONE });
    g.rect(fx - 12, fy - 2, 24, 3).fill({ color: COL_STONE_LT });

    // Coal bed
    g.circle(fx - 4, fy - 6, 3).fill({ color: COL_COAL });
    g.circle(fx + 2, fy - 5, 3.5).fill({ color: COL_COAL });
    g.circle(fx + 6, fy - 6, 2.5).fill({ color: COL_COAL });
    // Hot coal glow
    const cg = 0.3 + Math.sin(time * 3) * 0.2;
    g.circle(fx - 2, fy - 6, 2).fill({ color: COL_FIRE, alpha: cg });
    g.circle(fx + 4, fy - 5, 2.5).fill({ color: COL_FIRE, alpha: cg * 0.8 });

    // Flames
    const f1 = Math.sin(time * FIRE_FLICKER) * 2;
    const f2 = Math.sin(time * FIRE_FLICKER * 1.3 + 1) * 1.5;
    const f3 = Math.sin(time * FIRE_FLICKER * 0.7 + 2) * 1;

    g.moveTo(fx, fy - 7)
      .bezierCurveTo(fx - 5 + f1, fy - 14, fx + 2 + f2, fy - 20, fx, fy - 7)
      .fill({ color: COL_FIRE, alpha: 0.75 });
    g.moveTo(fx, fy - 6)
      .bezierCurveTo(fx - 2 + f3, fy - 11, fx + 3 + f1, fy - 16, fx, fy - 6)
      .fill({ color: COL_FIRE_MID, alpha: 0.8 });
    g.moveTo(fx, fy - 5)
      .bezierCurveTo(fx - 1 + f2, fy - 8, fx + 1 + f3, fy - 12, fx, fy - 5)
      .fill({ color: COL_FIRE_CORE, alpha: 0.85 });

    // Glow
    const gp = 0.5 + Math.sin(time * GLOW_PULSE) * 0.12;
    g.circle(fx, fy - 8, 16).fill({ color: COL_GLOW, alpha: gp * 0.07 });
    g.circle(fx, fy - 8, 8).fill({ color: COL_GLOW, alpha: gp * 0.12 });

    // Bellows
    const bellowsX = fx - 16;
    const bellowsY = fy - 4;
    const pump = Math.sin(time * 1.5) * 2;
    g.rect(bellowsX + 6, bellowsY + 2, 6, 1.5).fill({ color: COL_IRON });
    g.moveTo(bellowsX, bellowsY - pump)
      .lineTo(bellowsX + 6, bellowsY + 1)
      .lineTo(bellowsX + 6, bellowsY + 4)
      .lineTo(bellowsX, bellowsY + 6 + pump)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 0.6 });
    g.rect(bellowsX - 3, bellowsY + 1, 4, 2).fill({ color: COL_WOOD });
  }

  // =========================================================================
  // Siege engineer — animated
  // =========================================================================

  private _updateEngineer(time: number): void {
    const g = this._engineer;
    g.clear();

    const ex = TW / 2 + 10;
    const ey = TH - 14;
    const bob = Math.sin(time * 1.2) * 0.6;

    // Measuring phase: engineer looks up at trebuchet, adjusts
    const armLift = Math.sin(time * 0.8) * 3;

    // ── Legs ──
    g.rect(ex - 4, ey + bob, 3, 8).fill({ color: COL_CLOTH_DK });
    g.rect(ex + 1, ey + bob, 3, 8).fill({ color: COL_CLOTH_DK });
    // Boots
    g.rect(ex - 4, ey + 7 + bob, 4, 2).fill({ color: COL_LEATHER_DK });
    g.rect(ex + 1, ey + 7 + bob, 4, 2).fill({ color: COL_LEATHER_DK });

    // ── Torso ──
    g.rect(ex - 5, ey - 12 + bob, 10, 12)
      .fill({ color: COL_CLOTH })
      .stroke({ color: COL_CLOTH_DK, width: 0.5 });
    // Belt with tool pouches
    g.rect(ex - 5, ey - 2 + bob, 10, 2).fill({ color: COL_LEATHER });
    g.circle(ex, ey - 1 + bob, 1).fill({ color: COL_GOLD });
    // Pouch
    g.rect(ex + 3, ey - 4 + bob, 3, 3)
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 0.3 });

    // ── Head ──
    g.circle(ex, ey - 16 + bob, 5)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.4 });
    // Hood / cap
    g.moveTo(ex - 5, ey - 17 + bob)
      .quadraticCurveTo(ex, ey - 23 + bob, ex + 5, ey - 17 + bob)
      .fill({ color: COL_CLOTH_DK });
    // Eye
    g.circle(ex + 3, ey - 17 + bob, 0.8).fill({ color: 0x222222 });
    // Short beard
    g.moveTo(ex - 2, ey - 13 + bob)
      .quadraticCurveTo(ex, ey - 10 + bob, ex + 3, ey - 13 + bob)
      .stroke({ color: 0x5a4a3a, width: 1.5 });

    // ── Right arm (reaching up to adjust trebuchet) ──
    g.moveTo(ex + 5, ey - 10 + bob)
      .lineTo(ex + 12, ey - 16 + bob - armLift)
      .stroke({ color: COL_CLOTH, width: 3 });
    g.circle(ex + 12, ey - 16 + bob - armLift, 2).fill({ color: COL_SKIN });

    // ── Left arm (holding measuring stick) ──
    g.moveTo(ex - 5, ey - 10 + bob)
      .lineTo(ex - 10, ey - 6 + bob)
      .stroke({ color: COL_CLOTH, width: 3 });
    g.circle(ex - 10, ey - 6 + bob, 2).fill({ color: COL_SKIN });
    // Measuring stick
    g.moveTo(ex - 10, ey - 6 + bob)
      .lineTo(ex - 10, ey - 28 + bob)
      .stroke({ color: COL_WOOD_LT, width: 1.5 });
    // Markings on stick
    for (let i = 0; i < 4; i++) {
      g.moveTo(ex - 11, ey - 10 - i * 5 + bob)
        .lineTo(ex - 9, ey - 10 - i * 5 + bob)
        .stroke({ color: COL_IRON, width: 0.5 });
    }
  }

  // =========================================================================
  // Sparks — on anvil strike
  // =========================================================================

  private _updateSparks(time: number): void {
    const g = this._sparks;
    g.clear();

    const hammerCycle = (time * HAMMER_SPEED) % 1;
    if (hammerCycle > 0.6 && hammerCycle < 0.75) {
      const progress = (hammerCycle - 0.6) / 0.15;
      const avx = TW - 36;
      const avy = TH - 30;

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI - Math.PI * 0.7;
        const dist = 4 + progress * 14;
        const sx = avx + Math.cos(angle) * dist + Math.sin(i * 4.1) * 3;
        const sy = avy + Math.sin(angle) * dist - progress * 6;
        const alpha = 1 - progress;
        const size = 1.2 * (1 - progress * 0.4);

        g.circle(sx, sy, size).fill({ color: COL_FIRE_CORE, alpha });
        g.circle(sx - Math.cos(angle) * 1.5, sy - Math.sin(angle) * 1.5, size * 0.5)
          .fill({ color: COL_GLOW, alpha: alpha * 0.4 });
      }
    }
  }

  // =========================================================================
  // Smoke — chimney wisps
  // =========================================================================

  private _updateSmoke(time: number): void {
    const g = this._smoke;
    g.clear();

    const chimX = TW - 23;
    const chimTop = -18;

    for (let i = 0; i < 4; i++) {
      const phase = (time * 0.35 + i * 0.9) % 3.6;
      if (phase > 2.8) continue;
      const rise = phase * 10;
      const drift = Math.sin(time * 0.5 + i * 2.3) * 5;
      const alpha = 0.18 * (1 - phase / 2.8);
      const size = 3 + phase * 2.5;

      g.circle(chimX + drift, chimTop - rise, size).fill({
        color: 0x888888,
        alpha,
      });
    }
  }

  // =========================================================================
  // Raven — perched on roof ridge
  // =========================================================================

  private _updateRaven(time: number): void {
    const g = this._raven;
    g.clear();

    const rx = 50;
    const ry = -6;

    const lookCycle = (time * RAVEN_LOOK_SPEED) % 4;
    let headTurn = 0;
    if (lookCycle < 1) {
      headTurn = Math.sin(lookCycle * Math.PI) * 2.5;
    } else if (lookCycle < 2) {
      headTurn = -Math.sin((lookCycle - 1) * Math.PI) * 2.5;
    } else if (lookCycle < 3) {
      headTurn = 0; // resting
    } else {
      // Quick head bob
      headTurn = Math.sin((lookCycle - 3) * Math.PI * 2) * 1;
    }

    const breathe = Math.sin(time * 2) * 0.3;

    // ── Body ──
    g.ellipse(rx, ry + breathe, 8, 6)
      .fill({ color: COL_RAVEN })
      .stroke({ color: 0x111111, width: 0.3 });
    // Wing folded
    g.ellipse(rx - 2, ry - 1 + breathe, 6, 4).fill({ color: 0x222222 });

    // ── Tail feathers ──
    g.moveTo(rx - 8, ry + breathe)
      .lineTo(rx - 15, ry + 2 + breathe)
      .lineTo(rx - 13, ry + 3 + breathe)
      .lineTo(rx - 8, ry + 2 + breathe)
      .closePath()
      .fill({ color: COL_RAVEN });
    g.moveTo(rx - 8, ry - 1 + breathe)
      .lineTo(rx - 13, ry - 2 + breathe)
      .lineTo(rx - 8, ry - 1 + breathe)
      .closePath()
      .fill({ color: 0x333333 });

    // ── Head ──
    g.circle(rx + headTurn, ry - 6 + breathe, 5)
      .fill({ color: COL_RAVEN })
      .stroke({ color: 0x111111, width: 0.3 });

    // ── Beak ──
    g.moveTo(rx + headTurn + 4, ry - 6 + breathe)
      .lineTo(rx + headTurn + 11, ry - 5 + breathe)
      .lineTo(rx + headTurn + 4, ry - 4 + breathe)
      .closePath()
      .fill({ color: COL_RAVEN_BEAK });
    // Lower beak
    g.moveTo(rx + headTurn + 5, ry - 5 + breathe)
      .lineTo(rx + headTurn + 9, ry - 4.5 + breathe)
      .lineTo(rx + headTurn + 5, ry - 4 + breathe)
      .closePath()
      .fill({ color: 0x996622 });

    // ── Eye ──
    g.circle(rx + headTurn + 2, ry - 7 + breathe, 1.8).fill({
      color: COL_RAVEN_EYE,
    });
    g.circle(rx + headTurn + 2, ry - 7 + breathe, 0.8).fill({ color: 0x1a1a1a });
    // Eye highlight
    g.circle(rx + headTurn + 2.3, ry - 7.3 + breathe, 0.3).fill({
      color: 0xffffff,
      alpha: 0.4,
    });

    // ── Legs ──
    g.moveTo(rx - 2, ry + 5 + breathe)
      .lineTo(rx - 2, ry + 9)
      .stroke({ color: 0x333333, width: 1 });
    g.moveTo(rx + 2, ry + 5 + breathe)
      .lineTo(rx + 2, ry + 9)
      .stroke({ color: 0x333333, width: 1 });

    // Feet (talons)
    for (const lx of [rx - 2, rx + 2]) {
      g.moveTo(lx, ry + 9)
        .lineTo(lx - 2, ry + 11)
        .stroke({ color: 0x333333, width: 0.8 });
      g.moveTo(lx, ry + 9)
        .lineTo(lx, ry + 11)
        .stroke({ color: 0x333333, width: 0.8 });
      g.moveTo(lx, ry + 9)
        .lineTo(lx + 2, ry + 11)
        .stroke({ color: 0x333333, width: 0.8 });
    }

    // ── Feather detail ──
    g.moveTo(rx - 4, ry - 2 + breathe)
      .lineTo(rx - 6, ry + breathe)
      .stroke({ color: 0x222222, width: 0.3 });
    g.moveTo(rx - 2, ry - 2 + breathe)
      .lineTo(rx - 4, ry + 1 + breathe)
      .stroke({ color: 0x222222, width: 0.3 });
  }

  // =========================================================================
  // Player banner
  // =========================================================================

  private _updateBanner(time: number): void {
    const g = this._banner;
    g.clear();

    const bx = TW / 2;
    const by = -20;
    const wave = Math.sin(time * FLAG_SPEED) * 3;
    const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 1.5;

    // Pole (on roof ridge)
    g.rect(bx - 1, by, 2, 18)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.circle(bx, by, 1.5).fill({ color: COL_GOLD });

    // War banner
    g.moveTo(bx + 1, by + 2)
      .bezierCurveTo(
        bx + 12 + wave,
        by + 3 + wave2,
        bx + 16 + wave * 0.7,
        by + 8 + wave2 * 0.5,
        bx + 2,
        by + 16,
      )
      .lineTo(bx + 1, by + 14)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: this._playerColor, width: 0.3, alpha: 0.4 });

    // Siege emblem (crossed swords / trebuchet silhouette)
    const emx = bx + 7 + wave * 0.3;
    const emy = by + 8 + wave2 * 0.2;
    g.moveTo(emx - 2, emy + 2)
      .lineTo(emx, emy - 2)
      .lineTo(emx + 2, emy + 2)
      .stroke({ color: 0xffffff, width: 0.5, alpha: 0.35 });
    g.moveTo(emx - 2, emy)
      .lineTo(emx + 2, emy)
      .stroke({ color: 0xffffff, width: 0.4, alpha: 0.3 });
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawPillar(g: Graphics, x: number, y: number, h: number): void {
    g.rect(x, y, 6, h)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    g.rect(x + 1, y + 1, 2, h - 2).fill({ color: COL_STONE_DK, alpha: 0.12 });
    // Cap
    g.rect(x - 1, y - 2, 8, 3).fill({ color: COL_STONE_DK });
    // Base
    g.rect(x - 1, y + h - 2, 8, 3).fill({ color: COL_STONE_DK });
  }

  private _drawWallTorch(g: Graphics, x: number, y: number): void {
    g.rect(x - 1, y, 2, 3).fill({ color: COL_IRON });
    g.rect(x - 3, y + 3, 6, 2).fill({ color: COL_IRON });
    g.rect(x - 2, y + 5, 4, 8)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(x - 2, y + 7, 4, 1.5).fill({ color: COL_LEATHER });
    // Flame
    g.moveTo(x, y + 4)
      .quadraticCurveTo(x - 3, y, x, y - 3)
      .quadraticCurveTo(x + 3, y, x, y + 4)
      .fill({ color: COL_FIRE, alpha: 0.7 });
    g.moveTo(x, y + 3)
      .quadraticCurveTo(x - 1, y + 1, x, y)
      .quadraticCurveTo(x + 1, y + 1, x, y + 3)
      .fill({ color: COL_FIRE_CORE, alpha: 0.6 });
    g.circle(x, y, 5).fill({ color: COL_GLOW, alpha: 0.07 });
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
    const dark = [[0.3, 0.1], [0.7, 0.4], [0.15, 0.6], [0.55, 0.85]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({ color: COL_STONE_DK, alpha: 0.15 });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2).fill({ color: COL_MOSS, alpha: 0.4 });
    g.circle(x + 2, y - 1, 1.2).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    for (let iy = 0; iy < h; iy += 4) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 1).fill({ color: COL_IVY });
    }
    for (let iy = 3; iy < h; iy += 7) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 14 < 7 ? -1 : 1;
      g.circle(x + wobble + dir * 3, y + iy, 2).fill({ color: COL_IVY_LT, alpha: 0.65 });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.4).fill({ color: COL_IVY, alpha: 0.5 });
    }
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
