// Procedural ELITE siege workshop renderer for BuildingView.
//
// An imposing, darker, more ornamented version of the SiegeWorkshopRenderer:
//   • Much darker stone palette (~30% darker throughout)
//   • Reinforced dark iron walls instead of timber framing
//   • Active forge with glowing embers (animated orange glow)
//   • Heavier equipment: giant chains, massive gears
//   • Ornate iron gates at entrance
//   • Dark banners with siege emblems
//   • Skulls / trophies mounted on walls
//   • Animated smoke rising from chimneys (thicker wisps)
//   • Gold-accented iron bands on everything
//   • More imposing roof with dark slate tiles
//   • Half-built trebuchet (heavier, iron-reinforced)
//   • Completed ballista (bigger, iron-plated)
//   • Master siege engineer, animated
//   • Raven perched on roof
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

// --- Darker Palette (shifted ~30% darker than regular) ---
const COL_STONE = 0x4a4540;
const COL_STONE_DK = 0x302b28;
const COL_STONE_LT = 0x605a55;
const COL_MORTAR = 0x3a3530;
const COL_WOOD = 0x3e2810;
const COL_WOOD_DK = 0x28190a;
const COL_WOOD_LT = 0x554028;
const COL_ROOF = 0x252020;       // dark slate
const COL_ROOF_DK = 0x181414;
const COL_ROOF_LT = 0x3a3030;
const COL_IRON = 0x3a3a3a;
const COL_IRON_DK = 0x222222;
const COL_IRON_LT = 0x555555;
const COL_FIRE = 0xff4400;
const COL_FIRE_MID = 0xff8800;
const COL_FIRE_CORE = 0xffff44;
const COL_COAL = 0x121212;
const COL_GLOW = 0xffaa33;
const COL_EMBER = 0xff5500;
const COL_LEATHER = 0x6a3510;
const COL_LEATHER_DK = 0x421e06;
const COL_ROPE = 0x8a7050;
const COL_ROPE_DK = 0x6a5030;
const COL_PAPER = 0xb0a480;
const COL_SKIN = 0xc09060;
const COL_SKIN_DK = 0x906840;
const _COL_CLOTH = 0x3a3a48;
const COL_CLOTH_DK = 0x222232;
const COL_PITCH = 0x121008;
const COL_MOSS = 0x3a5a2a;
const COL_IVY = 0x2e4a22;
const COL_IVY_LT = 0x4a6a3a;
const COL_SOOT = 0x1a1510;
const COL_GOLD = 0xccaa44;
const COL_GOLD_DK = 0x997722;
const COL_BONE = 0xd4c8b0;
const COL_BONE_DK = 0xa89880;
const COL_SKULL = 0xc8bca4;
const COL_DARK_BANNER = 0x1a1018;

// Raven
const COL_RAVEN = 0x141414;
const COL_RAVEN_BEAK = 0xaa7022;
const COL_RAVEN_EYE = 0xffcc00;

// Ballista
const COL_BALLISTA = 0x44300e;
const COL_BALLISTA_DK = 0x2a1c08;

// Animation timing
const HAMMER_SPEED = 3.5;
const FIRE_FLICKER = 10.0;
const GLOW_PULSE = 2.0;
const EMBER_PULSE = 1.4;
const RAVEN_LOOK_SPEED = 1.5;
const FLAG_SPEED = 3.0;
const SMOKE_SPEED = 0.4;
const _GEAR_SPEED = 0.6;
const _CHAIN_SWAY = 1.2;

// ---------------------------------------------------------------------------
// EliteSiegeWorkshopRenderer
// ---------------------------------------------------------------------------

export class EliteSiegeWorkshopRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();     // Walls, roof, chimney, floor, iron gates
  private _forge = new Graphics();    // Forge fire, coals, bellows, embers
  private _machines = new Graphics(); // Trebuchet, ballista (static)
  private _props = new Graphics();    // Blueprint table, barrels, chains, gears, skulls
  private _engineer = new Graphics(); // Siege engineer, animated
  private _sparks = new Graphics();   // Anvil sparks
  private _smoke = new Graphics();    // Chimney smoke (thicker)
  private _raven = new Graphics();    // Raven on roof
  private _banner = new Graphics();   // Player banner
  private _embers = new Graphics();   // Floating embers from forge

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
    this.container.addChild(this._embers);
    this.container.addChild(this._smoke);
    this.container.addChild(this._raven);
    this.container.addChild(this._banner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateForge(this._time);
    this._updateEngineer(this._time);
    this._updateSparks(this._time);
    this._updateEmbers(this._time);
    this._updateSmoke(this._time);
    this._updateRaven(this._time);
    this._updateBanner(this._time);
  }

  // =========================================================================
  // Static base — walls, pillars, roof, chimney, floor, iron gates, skulls
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation ──
    g.rect(0, TH - 10, TW, 10).fill({ color: COL_STONE_DK });
    // Dark stone flagstone floor
    for (let i = 0; i < 8; i++) {
      g.rect(2 + i * 16, TH - 9, 14, 7)
        .fill({ color: i % 2 === 0 ? COL_STONE : COL_STONE_DK, alpha: 0.3 })
        .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.35 });
    }
    // Iron grate in floor (drainage)
    g.rect(50, TH - 8, 12, 6)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.4 });
    for (let i = 0; i < 4; i++) {
      g.rect(51 + i * 3, TH - 7, 1, 4).fill({ color: COL_IRON });
    }

    // ── Back wall (darker, iron-reinforced) ──
    const wallY = 22;
    const wallH = TH - wallY - 14;
    g.rect(0, wallY, TW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.2 });
    // Dark inner shadow
    g.rect(1, wallY + 1, 5, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.25 });

    this._drawBrickPattern(g, 2, wallY + 2, TW - 4, wallH - 4);
    this._drawStoneVariation(g, 6, wallY + 6, TW - 12, wallH - 12);

    // ── Horizontal iron reinforcement bands across back wall ──
    for (let row = 0; row < 3; row++) {
      const bandY = wallY + 10 + row * 24;
      if (bandY < wallY + wallH - 6) {
        g.rect(0, bandY, TW, 2)
          .fill({ color: COL_IRON_DK })
          .stroke({ color: COL_IRON, width: 0.3 });
        // Gold-accented rivet heads
        for (let rx = 8; rx < TW; rx += 20) {
          g.circle(rx, bandY + 1, 1.2).fill({ color: COL_GOLD });
          g.circle(rx, bandY + 1, 0.6).fill({ color: COL_GOLD_DK });
        }
      }
    }

    // ── Side walls / buttresses (reinforced iron) ──
    // Left wall (thick, dark iron plating)
    g.rect(0, wallY, 18, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Iron plating lines
    for (let row = 0; row < wallH; row += 6) {
      g.moveTo(0, wallY + row)
        .lineTo(18, wallY + row)
        .stroke({ color: COL_IRON_DK, width: 0.4, alpha: 0.4 });
    }
    // Vertical iron bands
    g.rect(6, wallY, 2, wallH).fill({ color: COL_IRON_DK, alpha: 0.3 });
    g.rect(12, wallY, 2, wallH).fill({ color: COL_IRON_DK, alpha: 0.3 });

    // Left buttress (reinforced)
    g.moveTo(18, wallY + 10)
      .lineTo(26, wallY + 4)
      .lineTo(26, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(18, wallY + 10, 8, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Iron bracket on buttress
    g.rect(18, wallY + 14, 8, 2).fill({ color: COL_IRON });
    g.rect(18, wallY + 30, 8, 2).fill({ color: COL_IRON });

    // Right wall (thick, dark iron plating)
    g.rect(TW - 18, wallY, 18, wallH)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    for (let row = 0; row < wallH; row += 6) {
      g.moveTo(TW - 18, wallY + row)
        .lineTo(TW, wallY + row)
        .stroke({ color: COL_IRON_DK, width: 0.4, alpha: 0.4 });
    }
    g.rect(TW - 14, wallY, 2, wallH).fill({ color: COL_IRON_DK, alpha: 0.3 });
    g.rect(TW - 8, wallY, 2, wallH).fill({ color: COL_IRON_DK, alpha: 0.3 });

    // Right buttress (reinforced)
    g.moveTo(TW - 18, wallY + 10)
      .lineTo(TW - 26, wallY + 4)
      .lineTo(TW - 26, wallY + 10)
      .closePath()
      .fill({ color: COL_STONE_DK });
    g.rect(TW - 26, wallY + 10, 8, wallH - 14)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.rect(TW - 26, wallY + 14, 8, 2).fill({ color: COL_IRON });
    g.rect(TW - 26, wallY + 30, 8, 2).fill({ color: COL_IRON });

    // ── Stone pillars (darker, iron-capped) ──
    this._drawPillar(g, 18, wallY, wallH);
    this._drawPillar(g, TW - 24, wallY, wallH);

    // ── Heavy iron ceiling beam (replaces timber) ──
    g.rect(0, wallY - 4, TW, 6)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.6 });
    // Gold accent strip along beam
    g.rect(0, wallY - 2, TW, 1).fill({ color: COL_GOLD, alpha: 0.3 });
    g.rect(0, wallY + 1, TW, 1).fill({ color: COL_GOLD, alpha: 0.2 });
    // Rivet details on beam
    for (let rx = 8; rx < TW; rx += 16) {
      g.circle(rx, wallY - 1, 1).fill({ color: COL_IRON_LT });
    }

    // ── Imposing roof (dark slate tiles) ──
    const roofBaseY = wallY - 4;
    // Main roof shape
    g.moveTo(-4, roofBaseY + 2)
      .lineTo(TW / 2, roofBaseY - 26)
      .lineTo(TW + 4, roofBaseY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.8 });
    // Subtle highlight on right slope
    g.moveTo(TW / 2, roofBaseY - 26)
      .lineTo(TW + 4, roofBaseY + 2)
      .lineTo(TW / 2 + 1, roofBaseY - 25)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.15 });
    // Dark slate tile lines (more detailed)
    for (let i = 1; i <= 5; i++) {
      const frac = i / 6;
      const ly = roofBaseY - 26 + frac * 28;
      const halfW = ((TW + 8) / 2) * frac;
      g.moveTo(TW / 2 - halfW, ly)
        .lineTo(TW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.6, alpha: 0.6 });
    }
    // Individual slate tile marks
    for (let row = 1; row <= 4; row++) {
      const frac = row / 5;
      const ly = roofBaseY - 26 + frac * 28;
      const halfW = ((TW + 8) / 2) * frac;
      for (let col = 0; col < halfW * 2; col += 10) {
        const tx = TW / 2 - halfW + col;
        g.moveTo(tx, ly)
          .lineTo(tx, ly + 4)
          .stroke({ color: COL_ROOF_DK, width: 0.3, alpha: 0.3 });
      }
    }

    // Iron ridge cap along roof peak
    g.moveTo(-4, roofBaseY + 2)
      .lineTo(TW / 2, roofBaseY - 26)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(TW / 2, roofBaseY - 26)
      .lineTo(TW + 4, roofBaseY + 2)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Gold finial at peak
    g.circle(TW / 2, roofBaseY - 27, 2.5).fill({ color: COL_GOLD });
    g.circle(TW / 2, roofBaseY - 27, 1.2).fill({ color: COL_GOLD_DK });

    // Roof overhang board (iron)
    g.rect(-4, roofBaseY, TW + 8, 3)
      .fill({ color: COL_IRON_DK });

    // ── Chimney (right side, taller, with iron cap) ──
    const chimX = TW - 30;
    const chimW = 14;
    const chimY = roofBaseY - 36;
    g.rect(chimX, chimY, chimW, 36)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.2 });
    this._drawBrickPattern(g, chimX + 1, chimY + 1, chimW - 2, 34);
    // Iron chimney cap (elaborate)
    g.rect(chimX - 3, chimY - 4, chimW + 6, 5)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    // Gold accents on cap
    g.rect(chimX - 2, chimY - 2, chimW + 4, 1).fill({ color: COL_GOLD, alpha: 0.4 });
    // Soot staining
    g.rect(chimX + 2, chimY + 4, 10, 12).fill({ color: COL_SOOT, alpha: 0.3 });

    // ── Dormer vent (left side of roof) ──
    const ventX = 20;
    const ventY = roofBaseY - 14;
    g.rect(ventX, ventY, 16, 10)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    g.moveTo(ventX - 2, ventY)
      .lineTo(ventX + 8, ventY - 6)
      .lineTo(ventX + 18, ventY)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Iron vent bars
    for (let i = 0; i < 4; i++) {
      g.rect(ventX + 1 + i * 4, ventY + 1, 1.5, 8)
        .fill({ color: COL_IRON });
    }

    // ── Wall torches (both sides, with iron sconces) ──
    this._drawWallTorch(g, 22, wallY + 14);
    this._drawWallTorch(g, TW - 22, wallY + 14);

    // ── Heavy iron chandelier chains (thicker) ──
    g.moveTo(TW / 2 - 18, wallY - 2)
      .lineTo(TW / 2 - 18, wallY + 10)
      .stroke({ color: COL_IRON_DK, width: 1.2 });
    g.moveTo(TW / 2 + 18, wallY - 2)
      .lineTo(TW / 2 + 18, wallY + 10)
      .stroke({ color: COL_IRON_DK, width: 1.2 });
    // Thick crossbar
    g.rect(TW / 2 - 19, wallY + 10, 38, 3).fill({ color: COL_IRON });
    // Additional chain drops
    g.moveTo(TW / 2 - 10, wallY + 13)
      .lineTo(TW / 2 - 10, wallY + 18)
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    g.moveTo(TW / 2 + 10, wallY + 13)
      .lineTo(TW / 2 + 10, wallY + 18)
      .stroke({ color: COL_IRON_DK, width: 0.8 });

    // ── Ornate iron gates at entrance (bottom-center) ──
    this._drawIronGate(g, TW / 2 - 16, TH - 26, 32, 18);

    // ── Skulls / trophies on walls ──
    this._drawSkull(g, 30, wallY + 28);
    this._drawSkull(g, TW - 32, wallY + 28);
    // Trophy rack (broken shields)
    this._drawTrophy(g, TW / 2, wallY + 8);

    // ── Moss and ivy (less, on dark stone) ──
    this._drawMoss(g, 4, TH - 12, 8);
    this._drawMoss(g, TW - 12, TH - 11, 6);
    this._drawIvy(g, 4, wallY + 8, 40);
    this._drawIvy(g, TW - 6, wallY + 12, 35);
  }

  // =========================================================================
  // Siege machines — trebuchet + ballista (heavier, iron-reinforced)
  // =========================================================================

  private _drawMachines(): void {
    const g = this._machines;

    // ── Half-built trebuchet (center, heavier frame) ──
    const tx = TW / 2 - 6;
    const ty = TH - 14;

    // Iron-reinforced cradle / base frame
    g.rect(tx - 20, ty - 2, 40, 4)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.8 });
    g.rect(tx - 22, ty + 2, 44, 3).fill({ color: COL_IRON_DK });
    // Gold-accented iron bands on base
    g.rect(tx - 20, ty - 1, 40, 1).fill({ color: COL_GOLD, alpha: 0.3 });
    // Cross braces (iron)
    g.moveTo(tx - 18, ty - 2)
      .lineTo(tx - 10, ty + 2)
      .stroke({ color: COL_IRON, width: 0.8 });
    g.moveTo(tx + 10, ty - 2)
      .lineTo(tx + 18, ty + 2)
      .stroke({ color: COL_IRON, width: 0.8 });

    // A-frame uprights (thicker, darker wood with iron bindings)
    g.moveTo(tx - 8, ty - 2)
      .lineTo(tx - 2, ty - 42)
      .stroke({ color: COL_WOOD_DK, width: 3.5 });
    g.moveTo(tx + 8, ty - 2)
      .lineTo(tx + 2, ty - 42)
      .stroke({ color: COL_WOOD_DK, width: 3.5 });
    // Iron binding strips on uprights
    g.moveTo(tx - 6, ty - 12)
      .lineTo(tx - 3, ty - 24)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(tx + 6, ty - 12)
      .lineTo(tx + 3, ty - 24)
      .stroke({ color: COL_IRON, width: 1.5 });

    // Cross brace (iron)
    g.moveTo(tx - 5, ty - 22)
      .lineTo(tx + 5, ty - 22)
      .stroke({ color: COL_IRON, width: 2.5 });

    // Axle beam (heavy iron, at top of A-frame)
    g.rect(tx - 5, ty - 44, 10, 5)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Gold rivet on axle
    g.circle(tx, ty - 42, 1.5).fill({ color: COL_GOLD });

    // Throwing arm (heavier, iron-banded)
    g.moveTo(tx, ty - 42)
      .lineTo(tx - 24, ty - 32)
      .stroke({ color: COL_WOOD, width: 3 });
    g.moveTo(tx, ty - 42)
      .lineTo(tx + 18, ty - 54)
      .stroke({ color: COL_WOOD, width: 3 });
    // Iron reinforcements on throwing arm
    g.rect(tx - 14, ty - 37, 4, 2).fill({ color: COL_IRON });
    g.rect(tx + 8, ty - 50, 4, 2).fill({ color: COL_IRON });

    // Counterweight bucket (bigger, iron-plated)
    g.moveTo(tx - 24, ty - 32)
      .lineTo(tx - 24, ty - 24)
      .stroke({ color: COL_ROPE, width: 1.5 });
    g.moveTo(tx - 28, ty - 24)
      .lineTo(tx - 28, ty - 16)
      .lineTo(tx - 18, ty - 16)
      .lineTo(tx - 18, ty - 24)
      .closePath()
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.8 });
    // Iron bands on bucket
    g.rect(tx - 28, ty - 22, 10, 1).fill({ color: COL_IRON });
    g.rect(tx - 28, ty - 18, 10, 1).fill({ color: COL_IRON });
    // Rocks inside
    g.circle(tx - 26, ty - 19, 2.5).fill({ color: COL_STONE });
    g.circle(tx - 22, ty - 20, 2).fill({ color: COL_STONE_LT });
    g.circle(tx - 24, ty - 18, 1.5).fill({ color: COL_STONE_DK });

    // Sling (rope, from long arm)
    g.moveTo(tx + 18, ty - 54)
      .quadraticCurveTo(tx + 22, ty - 48, tx + 20, ty - 44)
      .stroke({ color: COL_ROPE, width: 1.2 });

    // Iron reinforcement bands on frame
    g.rect(tx - 4, ty - 24, 8, 2).fill({ color: COL_IRON });
    g.rect(tx - 4, ty - 36, 8, 2).fill({ color: COL_IRON });
    // Gold accent on frame bands
    g.rect(tx - 3, ty - 23, 6, 0.8).fill({ color: COL_GOLD, alpha: 0.4 });
    g.rect(tx - 3, ty - 35, 6, 0.8).fill({ color: COL_GOLD, alpha: 0.4 });

    // ── Completed ballista (right side, bigger) ──
    this._drawBallista(g, TW - 50, TH - 34);

    // ── Heavy timber stack ──
    const lx = 30;
    const ly = TH - 16;
    for (let i = 0; i < 5; i++) {
      g.rect(lx, ly - i * 3, 22, 2.5)
        .fill({ color: i % 2 === 0 ? COL_WOOD_DK : COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
    }
    // Iron bindings on stack
    g.rect(lx, ly - 2, 22, 1).fill({ color: COL_IRON, alpha: 0.5 });
    g.rect(lx, ly - 8, 22, 1).fill({ color: COL_IRON, alpha: 0.5 });
    // End grain
    g.circle(lx, ly - 1, 1.2).fill({ color: COL_WOOD_LT });
    g.circle(lx, ly - 4, 1).fill({ color: COL_WOOD_LT });
    g.circle(lx, ly - 7, 1.2).fill({ color: COL_WOOD_LT });
    g.circle(lx, ly - 10, 1).fill({ color: COL_WOOD_LT });
  }

  private _drawBallista(g: Graphics, x: number, y: number): void {
    // Heavier base platform (iron-plated)
    g.rect(x, y + 8, 24, 5)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.6 });
    // Gold accent on platform
    g.rect(x + 1, y + 9, 22, 1).fill({ color: COL_GOLD, alpha: 0.3 });

    // Heavy wheels (larger, iron-rimmed)
    for (const wx of [x + 3, x + 21]) {
      g.circle(wx, y + 15, 6)
        .fill({ color: COL_WOOD_DK })
        .stroke({ color: COL_IRON, width: 1.2 });
      g.circle(wx, y + 15, 1.5).fill({ color: COL_IRON }); // hub
      // Spokes
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        g.moveTo(wx, y + 15)
          .lineTo(wx + Math.cos(angle) * 5, y + 15 + Math.sin(angle) * 5)
          .stroke({ color: COL_WOOD, width: 0.6 });
      }
    }

    // Main frame (iron-reinforced)
    g.rect(x + 4, y - 8, 16, 18)
      .fill({ color: COL_BALLISTA })
      .stroke({ color: COL_IRON, width: 1 });
    // Iron plating on frame
    g.rect(x + 4, y - 6, 16, 2).fill({ color: COL_IRON, alpha: 0.5 });
    g.rect(x + 4, y + 4, 16, 2).fill({ color: COL_IRON, alpha: 0.5 });
    // Groove for bolt
    g.rect(x + 8, y - 6, 8, 2).fill({ color: COL_BALLISTA_DK });

    // Bow arms (heavier, iron)
    g.moveTo(x + 12, y - 6)
      .quadraticCurveTo(x - 6, y - 12, x - 4, y - 18)
      .stroke({ color: COL_IRON, width: 2.5 });
    g.moveTo(x + 12, y - 6)
      .quadraticCurveTo(x + 28, y - 12, x + 26, y - 18)
      .stroke({ color: COL_IRON, width: 2.5 });

    // Bowstring (thicker)
    g.moveTo(x - 4, y - 18)
      .lineTo(x + 12, y - 8)
      .lineTo(x + 26, y - 18)
      .stroke({ color: 0x888877, width: 1 });

    // Iron nut mechanism
    g.circle(x + 12, y - 6, 3.5)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    g.circle(x + 12, y - 6, 1.5).fill({ color: COL_GOLD }); // gold center

    // Bolt loaded
    g.moveTo(x + 12, y - 8)
      .lineTo(x + 12, y - 22)
      .stroke({ color: COL_WOOD, width: 1.8 });
    // Bolt head (larger, iron)
    g.moveTo(x + 10.5, y - 22)
      .lineTo(x + 12, y - 26)
      .lineTo(x + 13.5, y - 22)
      .fill({ color: COL_IRON });
    // Fletching
    g.moveTo(x + 10.5, y - 9)
      .lineTo(x + 8, y - 7)
      .stroke({ color: 0xcccccc, width: 0.6 });
    g.moveTo(x + 13.5, y - 9)
      .lineTo(x + 16, y - 7)
      .stroke({ color: 0xcccccc, width: 0.6 });

    // Bolt rack (bigger, more bolts)
    g.rect(x + 26, y, 8, 18)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    for (let i = 0; i < 4; i++) {
      g.moveTo(x + 30, y + 3 + i * 4)
        .lineTo(x + 30, y + i * 4)
        .stroke({ color: COL_WOOD_LT, width: 1.2 });
      g.moveTo(x + 29.5, y + i * 4)
        .lineTo(x + 30, y - 2 + i * 4)
        .lineTo(x + 30.5, y + i * 4)
        .fill({ color: COL_IRON, alpha: 0.7 });
    }
  }

  // =========================================================================
  // Props — blueprint table, barrels, chains, gears, skulls, tools
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Blueprint table (left side, against buttress) ──
    const btx = 28;
    const bty = 58;
    // Heavy iron-legged table
    g.rect(btx, bty, 24, 6)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.8 });
    // Iron legs
    g.rect(btx + 1, bty + 6, 3, 10).fill({ color: COL_IRON_DK });
    g.rect(btx + 20, bty + 6, 3, 10).fill({ color: COL_IRON_DK });

    // Siege plans (unrolled scroll)
    g.rect(btx + 2, bty - 4, 18, 7)
      .fill({ color: COL_PAPER })
      .stroke({ color: COL_PAPER, width: 0.3 });
    g.ellipse(btx + 11, bty - 4, 9, 1.5).fill({ color: COL_PAPER });
    // Blueprint lines
    g.moveTo(btx + 5, bty - 2)
      .lineTo(btx + 8, bty - 2)
      .stroke({ color: 0x223366, width: 0.4 });
    g.moveTo(btx + 5, bty)
      .lineTo(btx + 15, bty)
      .stroke({ color: 0x223366, width: 0.3 });
    g.moveTo(btx + 10, bty - 3)
      .lineTo(btx + 10, bty + 1)
      .stroke({ color: 0x223366, width: 0.3 });
    g.moveTo(btx + 12, bty - 2)
      .lineTo(btx + 14, bty + 1)
      .lineTo(btx + 16, bty - 2)
      .stroke({ color: 0x223366, width: 0.3 });

    // Iron calipers on table
    g.moveTo(btx + 18, bty - 1)
      .lineTo(btx + 20, bty - 5)
      .stroke({ color: COL_IRON, width: 1 });
    g.moveTo(btx + 18, bty - 1)
      .lineTo(btx + 22, bty - 4)
      .stroke({ color: COL_IRON, width: 1 });
    g.circle(btx + 18, bty - 1, 1.2).fill({ color: COL_IRON_DK });

    // ── Barrel of pitch (right side, near forge) ──
    const bpx = TW - 48;
    const bpy = TH - 16;
    g.ellipse(bpx, bpy + 8, 7, 3)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.3 });
    g.rect(bpx - 7, bpy, 14, 8)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    g.ellipse(bpx, bpy, 7, 3).fill({ color: COL_PITCH });
    // Iron hoops (thicker, gold-accented)
    g.rect(bpx - 7, bpy + 2, 14, 2).fill({ color: COL_IRON });
    g.rect(bpx - 7, bpy + 6, 14, 2).fill({ color: COL_IRON });
    g.rect(bpx - 7, bpy + 2.5, 14, 0.5).fill({ color: COL_GOLD, alpha: 0.3 });
    g.rect(bpx - 7, bpy + 6.5, 14, 0.5).fill({ color: COL_GOLD, alpha: 0.3 });

    // ── Giant chains (hanging from ceiling, near center) ──
    this._drawChain(g, TW / 2 - 8, 26, 40);
    this._drawChain(g, TW / 2 + 12, 28, 35);

    // ── Massive gears (on back wall, decorative) ──
    this._drawGear(g, 42, 38, 8, 8);
    this._drawGear(g, 52, 42, 6, 6);

    // ── Rope coils (near trebuchet) ──
    const rcx = 56;
    const rcy = TH - 12;
    g.ellipse(rcx, rcy, 6, 3)
      .fill({ color: COL_ROPE })
      .stroke({ color: COL_ROPE_DK, width: 0.8 });
    g.ellipse(rcx, rcy, 4, 2).fill({ color: COL_ROPE_DK, alpha: 0.3 });
    g.ellipse(rcx, rcy, 2, 1).fill({ color: COL_ROPE, alpha: 0.5 });
    g.moveTo(rcx + 6, rcy)
      .quadraticCurveTo(rcx + 10, rcy - 2, rcx + 12, rcy + 1)
      .stroke({ color: COL_ROPE, width: 1 });

    // ── Scaffolding (iron-braced) ──
    g.rect(TW / 2 - 22, 36, 2, 50).fill({ color: COL_WOOD_DK });
    g.rect(TW / 2 + 20, 36, 2, 50).fill({ color: COL_WOOD_DK });
    g.rect(TW / 2 - 22, 50, 44, 2).fill({ color: COL_IRON_DK });
    g.rect(TW / 2 - 22, 70, 44, 2).fill({ color: COL_IRON_DK });
    // Iron diagonal brace
    g.moveTo(TW / 2 - 22, 52)
      .lineTo(TW / 2 + 22, 70)
      .stroke({ color: COL_IRON, width: 1, alpha: 0.5 });
    // Iron brackets at joints
    g.rect(TW / 2 - 23, 49, 4, 4).fill({ color: COL_IRON });
    g.rect(TW / 2 + 19, 49, 4, 4).fill({ color: COL_IRON });

    // ── Anvil (near forge, heavier) ──
    const avx = TW - 36;
    const avy = TH - 20;
    // Iron stump
    g.rect(avx - 7, avy, 14, 9)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.5 });
    g.ellipse(avx, avy, 7, 2.5).fill({ color: COL_IRON });
    // Massive anvil body
    g.rect(avx - 6, avy - 9, 12, 9).fill({ color: COL_IRON });
    g.rect(avx - 8, avy - 11, 16, 3).fill({ color: COL_IRON });
    // Gold accent on anvil face
    g.rect(avx - 7, avy - 10, 14, 0.8).fill({ color: COL_GOLD, alpha: 0.5 });
    // Horn (longer)
    g.moveTo(avx - 8, avy - 9)
      .lineTo(avx - 16, avy - 7)
      .lineTo(avx - 8, avy - 5)
      .closePath()
      .fill({ color: COL_IRON });
    // Tail
    g.moveTo(avx + 8, avy - 9)
      .lineTo(avx + 12, avy - 8)
      .lineTo(avx + 8, avy - 6)
      .closePath()
      .fill({ color: COL_IRON });

    // ── Dark banner on left wall (with siege emblem) ──
    this._drawDarkBanner(g, 8, 30, 12, 22);

    // ── Dark banner on right wall (with siege emblem) ──
    this._drawDarkBanner(g, TW - 16, 30, 12, 22);
  }

  // =========================================================================
  // Forge — animated fire, coals, bellows, glowing embers
  // =========================================================================

  private _updateForge(time: number): void {
    const g = this._forge;
    g.clear();

    const fx = TW - 20;
    const fy = TH - 18;

    // Heavy stone hearth (darker)
    g.rect(fx - 14, fy, 28, 9)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.rect(fx - 12, fy - 4, 24, 6).fill({ color: COL_STONE });
    g.rect(fx - 14, fy - 2, 28, 3).fill({ color: COL_STONE_LT });
    // Iron grate over hearth
    for (let i = 0; i < 5; i++) {
      g.rect(fx - 10 + i * 5, fy - 4, 1, 6).fill({ color: COL_IRON, alpha: 0.5 });
    }

    // Coal bed (larger)
    g.circle(fx - 5, fy - 7, 3.5).fill({ color: COL_COAL });
    g.circle(fx + 2, fy - 6, 4).fill({ color: COL_COAL });
    g.circle(fx + 7, fy - 7, 3).fill({ color: COL_COAL });
    g.circle(fx - 1, fy - 8, 2.5).fill({ color: COL_COAL });

    // Animated ember glow (pulsing orange through coals)
    const eg1 = 0.35 + Math.sin(time * EMBER_PULSE) * 0.25;
    const eg2 = 0.3 + Math.sin(time * EMBER_PULSE * 1.3 + 1) * 0.2;
    const eg3 = 0.4 + Math.sin(time * EMBER_PULSE * 0.8 + 2) * 0.22;
    g.circle(fx - 3, fy - 7, 2.5).fill({ color: COL_EMBER, alpha: eg1 });
    g.circle(fx + 4, fy - 6, 3).fill({ color: COL_EMBER, alpha: eg2 });
    g.circle(fx + 1, fy - 8, 2).fill({ color: COL_FIRE, alpha: eg3 });
    g.circle(fx + 7, fy - 6, 2).fill({ color: COL_EMBER, alpha: eg1 * 0.7 });
    // White-hot center
    g.circle(fx + 1, fy - 7, 1.2).fill({ color: COL_FIRE_CORE, alpha: eg3 * 0.6 });

    // Flames (bigger, more intense)
    const f1 = Math.sin(time * FIRE_FLICKER) * 2.5;
    const f2 = Math.sin(time * FIRE_FLICKER * 1.3 + 1) * 2;
    const f3 = Math.sin(time * FIRE_FLICKER * 0.7 + 2) * 1.5;

    // Outer flame
    g.moveTo(fx, fy - 8)
      .bezierCurveTo(fx - 6 + f1, fy - 16, fx + 3 + f2, fy - 24, fx, fy - 8)
      .fill({ color: COL_FIRE, alpha: 0.7 });
    // Middle flame
    g.moveTo(fx, fy - 7)
      .bezierCurveTo(fx - 3 + f3, fy - 13, fx + 4 + f1, fy - 20, fx, fy - 7)
      .fill({ color: COL_FIRE_MID, alpha: 0.8 });
    // Inner flame (core)
    g.moveTo(fx, fy - 6)
      .bezierCurveTo(fx - 1 + f2, fy - 10, fx + 2 + f3, fy - 15, fx, fy - 6)
      .fill({ color: COL_FIRE_CORE, alpha: 0.85 });
    // Secondary flame (left)
    g.moveTo(fx - 4, fy - 7)
      .bezierCurveTo(fx - 7 + f2, fy - 12, fx - 2 + f3, fy - 16, fx - 4, fy - 7)
      .fill({ color: COL_FIRE, alpha: 0.5 });

    // Ambient glow (larger for elite)
    const gp = 0.55 + Math.sin(time * GLOW_PULSE) * 0.15;
    g.circle(fx, fy - 10, 22).fill({ color: COL_GLOW, alpha: gp * 0.06 });
    g.circle(fx, fy - 10, 12).fill({ color: COL_GLOW, alpha: gp * 0.1 });
    g.circle(fx, fy - 10, 6).fill({ color: COL_GLOW, alpha: gp * 0.14 });

    // Bellows (larger, iron-reinforced)
    const bellowsX = fx - 18;
    const bellowsY = fy - 4;
    const pump = Math.sin(time * 1.5) * 2.5;
    // Nozzle (iron)
    g.rect(bellowsX + 6, bellowsY + 2, 8, 2).fill({ color: COL_IRON });
    // Bellows body
    g.moveTo(bellowsX, bellowsY - pump)
      .lineTo(bellowsX + 6, bellowsY + 1)
      .lineTo(bellowsX + 6, bellowsY + 4)
      .lineTo(bellowsX, bellowsY + 6 + pump)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_IRON, width: 0.8 });
    // Iron bands on bellows
    g.moveTo(bellowsX + 1, bellowsY + 1)
      .lineTo(bellowsX + 5, bellowsY + 2)
      .stroke({ color: COL_IRON, width: 0.5 });
    g.moveTo(bellowsX + 1, bellowsY + 4)
      .lineTo(bellowsX + 5, bellowsY + 3)
      .stroke({ color: COL_IRON, width: 0.5 });
    // Handle (iron)
    g.rect(bellowsX - 4, bellowsY + 1, 5, 2.5).fill({ color: COL_IRON_DK });
  }

  // =========================================================================
  // Floating embers — rising from forge
  // =========================================================================

  private _updateEmbers(time: number): void {
    const g = this._embers;
    g.clear();

    const fx = TW - 20;
    const fy = TH - 28;

    for (let i = 0; i < 8; i++) {
      const phase = (time * 0.5 + i * 0.45) % 3.0;
      if (phase > 2.4) continue;
      const rise = phase * 16;
      const drift = Math.sin(time * 0.7 + i * 1.8) * 6;
      const flicker = 0.5 + Math.sin(time * 4 + i * 3.2) * 0.3;
      const alpha = 0.6 * (1 - phase / 2.4) * flicker;
      const size = 0.8 + (1 - phase / 2.4) * 0.8;

      g.circle(fx + drift + (i % 3) * 4 - 4, fy - rise, size).fill({
        color: i % 2 === 0 ? COL_EMBER : COL_FIRE_CORE,
        alpha,
      });
    }
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
    const armLift = Math.sin(time * 0.8) * 3;

    // ── Legs ──
    g.rect(ex - 4, ey + bob, 3, 8).fill({ color: COL_CLOTH_DK });
    g.rect(ex + 1, ey + bob, 3, 8).fill({ color: COL_CLOTH_DK });
    // Heavy iron-toed boots
    g.rect(ex - 5, ey + 7 + bob, 5, 3)
      .fill({ color: COL_LEATHER_DK })
      .stroke({ color: COL_IRON_DK, width: 0.3 });
    g.rect(ex, ey + 7 + bob, 5, 3)
      .fill({ color: COL_LEATHER_DK })
      .stroke({ color: COL_IRON_DK, width: 0.3 });
    // Iron toe caps
    g.rect(ex - 5, ey + 8 + bob, 2, 1.5).fill({ color: COL_IRON });
    g.rect(ex + 3, ey + 8 + bob, 2, 1.5).fill({ color: COL_IRON });

    // ── Torso (darker, heavier armor-like apron) ──
    g.rect(ex - 5, ey - 12 + bob, 10, 12)
      .fill({ color: COL_CLOTH_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Heavy leather apron
    g.rect(ex - 4, ey - 8 + bob, 8, 10)
      .fill({ color: COL_LEATHER_DK })
      .stroke({ color: COL_LEATHER, width: 0.3 });
    // Iron-buckled belt
    g.rect(ex - 5, ey - 2 + bob, 10, 2).fill({ color: COL_IRON_DK });
    g.rect(ex - 1, ey - 2 + bob, 2, 2).fill({ color: COL_GOLD }); // gold buckle
    // Heavy tool pouch
    g.rect(ex + 3, ey - 4 + bob, 4, 4)
      .fill({ color: COL_LEATHER_DK })
      .stroke({ color: COL_IRON, width: 0.3 });

    // ── Head ──
    g.circle(ex, ey - 16 + bob, 5)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Iron helm / visor
    g.moveTo(ex - 5, ey - 18 + bob)
      .quadraticCurveTo(ex, ey - 24 + bob, ex + 5, ey - 18 + bob)
      .fill({ color: COL_IRON_DK });
    // Helm ridge
    g.moveTo(ex, ey - 24 + bob)
      .lineTo(ex, ey - 17 + bob)
      .stroke({ color: COL_IRON, width: 1 });
    // Eye (glint under visor)
    g.circle(ex + 3, ey - 17 + bob, 0.8).fill({ color: 0x222222 });
    // Beard
    g.moveTo(ex - 2, ey - 13 + bob)
      .quadraticCurveTo(ex, ey - 10 + bob, ex + 3, ey - 13 + bob)
      .stroke({ color: 0x3a3028, width: 1.5 });

    // ── Right arm (reaching up to adjust trebuchet) ──
    g.moveTo(ex + 5, ey - 10 + bob)
      .lineTo(ex + 12, ey - 16 + bob - armLift)
      .stroke({ color: COL_CLOTH_DK, width: 3 });
    g.circle(ex + 12, ey - 16 + bob - armLift, 2).fill({ color: COL_SKIN });
    // Iron gauntlet
    g.circle(ex + 12, ey - 16 + bob - armLift, 2.5)
      .stroke({ color: COL_IRON, width: 0.6 });

    // ── Left arm (holding measuring stick) ──
    g.moveTo(ex - 5, ey - 10 + bob)
      .lineTo(ex - 10, ey - 6 + bob)
      .stroke({ color: COL_CLOTH_DK, width: 3 });
    g.circle(ex - 10, ey - 6 + bob, 2).fill({ color: COL_SKIN });
    // Measuring stick (iron ruler)
    g.moveTo(ex - 10, ey - 6 + bob)
      .lineTo(ex - 10, ey - 28 + bob)
      .stroke({ color: COL_IRON, width: 1.8 });
    // Iron markings
    for (let i = 0; i < 4; i++) {
      g.moveTo(ex - 11.5, ey - 10 - i * 5 + bob)
        .lineTo(ex - 8.5, ey - 10 - i * 5 + bob)
        .stroke({ color: COL_GOLD, width: 0.5 });
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

      // More sparks for elite
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI - Math.PI * 0.7;
        const dist = 5 + progress * 18;
        const sx = avx + Math.cos(angle) * dist + Math.sin(i * 3.7) * 4;
        const sy = avy + Math.sin(angle) * dist - progress * 8;
        const alpha = 1 - progress;
        const size = 1.5 * (1 - progress * 0.3);

        g.circle(sx, sy, size).fill({ color: COL_FIRE_CORE, alpha });
        g.circle(sx - Math.cos(angle) * 2, sy - Math.sin(angle) * 2, size * 0.5)
          .fill({ color: COL_GLOW, alpha: alpha * 0.5 });
      }
    }
  }

  // =========================================================================
  // Smoke — chimney wisps (thicker, more atmospheric)
  // =========================================================================

  private _updateSmoke(time: number): void {
    const g = this._smoke;
    g.clear();

    const chimX = TW - 23;
    const chimTop = -22;

    // Main smoke plume (thicker, darker)
    for (let i = 0; i < 6; i++) {
      const phase = (time * SMOKE_SPEED + i * 0.7) % 4.0;
      if (phase > 3.2) continue;
      const rise = phase * 12;
      const drift = Math.sin(time * 0.4 + i * 2.1) * 7;
      const alpha = 0.22 * (1 - phase / 3.2);
      const size = 4 + phase * 3;

      g.circle(chimX + drift, chimTop - rise, size).fill({
        color: 0x555555,
        alpha,
      });
    }

    // Secondary wisp (lighter, faster)
    for (let i = 0; i < 3; i++) {
      const phase = (time * SMOKE_SPEED * 1.3 + i * 1.2 + 0.5) % 3.0;
      if (phase > 2.5) continue;
      const rise = phase * 10;
      const drift = Math.sin(time * 0.6 + i * 3.0) * 5 + 3;
      const alpha = 0.12 * (1 - phase / 2.5);
      const size = 2.5 + phase * 2;

      g.circle(chimX + drift, chimTop - rise, size).fill({
        color: 0x777777,
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
    const ry = -8;

    const lookCycle = (time * RAVEN_LOOK_SPEED) % 4;
    let headTurn = 0;
    if (lookCycle < 1) {
      headTurn = Math.sin(lookCycle * Math.PI) * 2.5;
    } else if (lookCycle < 2) {
      headTurn = -Math.sin((lookCycle - 1) * Math.PI) * 2.5;
    } else if (lookCycle < 3) {
      headTurn = 0;
    } else {
      headTurn = Math.sin((lookCycle - 3) * Math.PI * 2) * 1;
    }

    const breathe = Math.sin(time * 2) * 0.3;

    // ── Body ──
    g.ellipse(rx, ry + breathe, 8, 6)
      .fill({ color: COL_RAVEN })
      .stroke({ color: 0x0a0a0a, width: 0.3 });
    g.ellipse(rx - 2, ry - 1 + breathe, 6, 4).fill({ color: 0x1a1a1a });

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
      .fill({ color: 0x282828 });

    // ── Head ──
    g.circle(rx + headTurn, ry - 6 + breathe, 5)
      .fill({ color: COL_RAVEN })
      .stroke({ color: 0x0a0a0a, width: 0.3 });

    // ── Beak ──
    g.moveTo(rx + headTurn + 4, ry - 6 + breathe)
      .lineTo(rx + headTurn + 11, ry - 5 + breathe)
      .lineTo(rx + headTurn + 4, ry - 4 + breathe)
      .closePath()
      .fill({ color: COL_RAVEN_BEAK });
    g.moveTo(rx + headTurn + 5, ry - 5 + breathe)
      .lineTo(rx + headTurn + 9, ry - 4.5 + breathe)
      .lineTo(rx + headTurn + 5, ry - 4 + breathe)
      .closePath()
      .fill({ color: 0x805518 });

    // ── Eye ──
    g.circle(rx + headTurn + 2, ry - 7 + breathe, 1.8).fill({
      color: COL_RAVEN_EYE,
    });
    g.circle(rx + headTurn + 2, ry - 7 + breathe, 0.8).fill({ color: 0x141414 });
    g.circle(rx + headTurn + 2.3, ry - 7.3 + breathe, 0.3).fill({
      color: 0xffffff,
      alpha: 0.4,
    });

    // ── Legs ──
    g.moveTo(rx - 2, ry + 5 + breathe)
      .lineTo(rx - 2, ry + 9)
      .stroke({ color: 0x282828, width: 1 });
    g.moveTo(rx + 2, ry + 5 + breathe)
      .lineTo(rx + 2, ry + 9)
      .stroke({ color: 0x282828, width: 1 });

    // Talons
    for (const lx of [rx - 2, rx + 2]) {
      g.moveTo(lx, ry + 9)
        .lineTo(lx - 2, ry + 11)
        .stroke({ color: 0x282828, width: 0.8 });
      g.moveTo(lx, ry + 9)
        .lineTo(lx, ry + 11)
        .stroke({ color: 0x282828, width: 0.8 });
      g.moveTo(lx, ry + 9)
        .lineTo(lx + 2, ry + 11)
        .stroke({ color: 0x282828, width: 0.8 });
    }

    // ── Feather detail ──
    g.moveTo(rx - 4, ry - 2 + breathe)
      .lineTo(rx - 6, ry + breathe)
      .stroke({ color: 0x1a1a1a, width: 0.3 });
    g.moveTo(rx - 2, ry - 2 + breathe)
      .lineTo(rx - 4, ry + 1 + breathe)
      .stroke({ color: 0x1a1a1a, width: 0.3 });
  }

  // =========================================================================
  // Player banner (larger, with more detail)
  // =========================================================================

  private _updateBanner(time: number): void {
    const g = this._banner;
    g.clear();

    const bx = TW / 2;
    const by = -22;
    const wave = Math.sin(time * FLAG_SPEED) * 3;
    const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 1.5;

    // Iron pole (thicker, on roof ridge)
    g.rect(bx - 1.5, by, 3, 20)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.3 });
    // Gold finial (spear tip)
    g.moveTo(bx - 2, by)
      .lineTo(bx, by - 5)
      .lineTo(bx + 2, by)
      .closePath()
      .fill({ color: COL_GOLD });
    g.circle(bx, by - 1, 1).fill({ color: COL_GOLD_DK });

    // War banner (larger)
    g.moveTo(bx + 1.5, by + 2)
      .bezierCurveTo(
        bx + 14 + wave,
        by + 3 + wave2,
        bx + 18 + wave * 0.7,
        by + 10 + wave2 * 0.5,
        bx + 2.5,
        by + 18,
      )
      .lineTo(bx + 1.5, by + 16)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: this._playerColor, width: 0.4, alpha: 0.5 });

    // Siege emblem (more detailed - trebuchet silhouette with stars)
    const emx = bx + 8 + wave * 0.3;
    const emy = by + 9 + wave2 * 0.2;
    // Trebuchet triangle
    g.moveTo(emx - 3, emy + 3)
      .lineTo(emx, emy - 3)
      .lineTo(emx + 3, emy + 3)
      .stroke({ color: 0xffffff, width: 0.6, alpha: 0.4 });
    // Cross bar
    g.moveTo(emx - 2, emy)
      .lineTo(emx + 2, emy)
      .stroke({ color: 0xffffff, width: 0.5, alpha: 0.35 });
    // Star accents
    g.circle(emx - 3, emy - 2, 0.6).fill({ color: COL_GOLD, alpha: 0.4 });
    g.circle(emx + 3, emy - 2, 0.6).fill({ color: COL_GOLD, alpha: 0.4 });

    // Banner fringe (gold)
    for (let i = 0; i < 4; i++) {
      const frac = (i + 1) / 5;
      const fx = bx + 1.5 + frac * (wave * 0.3 + 8);
      const ffy = by + 2 + frac * 16;
      g.moveTo(fx, ffy)
        .lineTo(fx + 1, ffy + 2)
        .stroke({ color: COL_GOLD, width: 0.4, alpha: 0.5 });
    }
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawPillar(g: Graphics, x: number, y: number, h: number): void {
    g.rect(x, y, 6, h)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_IRON_DK, width: 1 });
    g.rect(x + 1, y + 1, 2, h - 2).fill({ color: COL_STONE_DK, alpha: 0.2 });
    // Iron cap (elaborate)
    g.rect(x - 2, y - 3, 10, 4)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.3 });
    g.rect(x - 1, y - 2, 8, 1).fill({ color: COL_GOLD, alpha: 0.35 });
    // Iron base
    g.rect(x - 2, y + h - 3, 10, 4)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.3 });
    // Iron bands along pillar
    g.rect(x - 1, y + h / 3, 8, 1.5).fill({ color: COL_IRON, alpha: 0.4 });
    g.rect(x - 1, y + (2 * h) / 3, 8, 1.5).fill({ color: COL_IRON, alpha: 0.4 });
  }

  private _drawWallTorch(g: Graphics, x: number, y: number): void {
    // Iron sconce (ornate)
    g.rect(x - 2, y, 4, 3).fill({ color: COL_IRON_DK });
    g.rect(x - 4, y + 3, 8, 2).fill({ color: COL_IRON });
    // Gold accent on sconce
    g.rect(x - 3, y + 3.5, 6, 0.6).fill({ color: COL_GOLD, alpha: 0.4 });
    g.rect(x - 3, y + 5, 6, 8)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_IRON, width: 0.3 });
    g.rect(x - 3, y + 7, 6, 1.5).fill({ color: COL_IRON });
    // Flame
    g.moveTo(x, y + 4)
      .quadraticCurveTo(x - 3, y, x, y - 3)
      .quadraticCurveTo(x + 3, y, x, y + 4)
      .fill({ color: COL_FIRE, alpha: 0.75 });
    g.moveTo(x, y + 3)
      .quadraticCurveTo(x - 1.5, y + 1, x, y - 1)
      .quadraticCurveTo(x + 1.5, y + 1, x, y + 3)
      .fill({ color: COL_FIRE_CORE, alpha: 0.65 });
    g.circle(x, y, 6).fill({ color: COL_GLOW, alpha: 0.08 });
  }

  private _drawIronGate(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Gate frame (heavy iron)
    g.rect(x, y, w, h)
      .stroke({ color: COL_IRON, width: 2 });
    // Vertical bars
    const barCount = 6;
    for (let i = 0; i < barCount; i++) {
      const bx = x + 3 + i * ((w - 6) / (barCount - 1));
      g.rect(bx - 0.8, y + 2, 1.6, h - 4).fill({ color: COL_IRON_DK });
      // Point at top of each bar
      g.moveTo(bx - 1.2, y + 2)
        .lineTo(bx, y - 1)
        .lineTo(bx + 1.2, y + 2)
        .fill({ color: COL_IRON });
    }
    // Horizontal cross bars
    g.rect(x + 1, y + h / 3, w - 2, 1.5).fill({ color: COL_IRON });
    g.rect(x + 1, y + (2 * h) / 3, w - 2, 1.5).fill({ color: COL_IRON });
    // Gold accented lock / center medallion
    g.circle(x + w / 2, y + h / 2, 3)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_GOLD, width: 0.8 });
    g.circle(x + w / 2, y + h / 2, 1.2).fill({ color: COL_GOLD });
    // Corner ornaments
    for (const cx of [x + 3, x + w - 3]) {
      for (const cy of [y + 3, y + h - 3]) {
        g.circle(cx, cy, 1.5).fill({ color: COL_GOLD, alpha: 0.5 });
      }
    }
  }

  private _drawSkull(g: Graphics, x: number, y: number): void {
    // Skull mounted on wall
    // Cranium
    g.circle(x, y, 4)
      .fill({ color: COL_SKULL })
      .stroke({ color: COL_BONE_DK, width: 0.5 });
    // Jaw
    g.moveTo(x - 3, y + 2)
      .quadraticCurveTo(x, y + 6, x + 3, y + 2)
      .fill({ color: COL_BONE });
    // Eye sockets
    g.circle(x - 1.5, y - 0.5, 1.2).fill({ color: 0x1a1510 });
    g.circle(x + 1.5, y - 0.5, 1.2).fill({ color: 0x1a1510 });
    // Nasal cavity
    g.moveTo(x - 0.5, y + 1)
      .lineTo(x, y + 2.5)
      .lineTo(x + 0.5, y + 1)
      .fill({ color: 0x1a1510 });
    // Teeth
    for (let i = -2; i <= 2; i++) {
      g.rect(x + i * 1 - 0.3, y + 3, 0.6, 1).fill({ color: COL_BONE });
    }
    // Iron mount bracket
    g.rect(x - 2, y - 5, 4, 2).fill({ color: COL_IRON_DK });
    g.moveTo(x, y - 5)
      .lineTo(x, y - 4)
      .stroke({ color: COL_IRON, width: 1.5 });
  }

  private _drawTrophy(g: Graphics, x: number, y: number): void {
    // Broken shield mounted on back wall
    // Shield shape (partial)
    g.moveTo(x - 6, y)
      .lineTo(x, y + 10)
      .lineTo(x + 6, y)
      .lineTo(x + 5, y - 4)
      .lineTo(x - 5, y - 4)
      .closePath()
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 0.6 });
    // Crossed swords behind shield
    g.moveTo(x - 8, y - 6)
      .lineTo(x + 8, y + 6)
      .stroke({ color: COL_IRON, width: 1 });
    g.moveTo(x + 8, y - 6)
      .lineTo(x - 8, y + 6)
      .stroke({ color: COL_IRON, width: 1 });
    // Shield emblem (simple X or cross)
    g.moveTo(x - 3, y - 1)
      .lineTo(x + 3, y + 5)
      .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });
    g.moveTo(x + 3, y - 1)
      .lineTo(x - 3, y + 5)
      .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });
    // Crack in shield
    g.moveTo(x + 3, y)
      .lineTo(x + 5, y + 3)
      .lineTo(x + 4, y + 5)
      .stroke({ color: 0x1a1a1a, width: 0.4 });
  }

  private _drawDarkBanner(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Dark banner hanging on wall
    // Iron rod at top
    g.rect(x - 1, y, w + 2, 2).fill({ color: COL_IRON });
    g.circle(x - 1, y + 1, 1.5).fill({ color: COL_GOLD });
    g.circle(x + w + 1, y + 1, 1.5).fill({ color: COL_GOLD });
    // Banner cloth (dark with torn bottom)
    g.moveTo(x, y + 2)
      .lineTo(x, y + h - 3)
      .lineTo(x + 2, y + h)
      .lineTo(x + w / 2, y + h - 4)
      .lineTo(x + w - 2, y + h)
      .lineTo(x + w, y + h - 3)
      .lineTo(x + w, y + 2)
      .closePath()
      .fill({ color: COL_DARK_BANNER })
      .stroke({ color: COL_IRON_DK, width: 0.4 });
    // Siege emblem on banner (simple trebuchet)
    const cx = x + w / 2;
    const cy = y + h / 2;
    g.moveTo(cx - 3, cy + 3)
      .lineTo(cx, cy - 3)
      .lineTo(cx + 3, cy + 3)
      .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.6 });
    g.moveTo(cx - 2, cy)
      .lineTo(cx + 2, cy)
      .stroke({ color: COL_GOLD, width: 0.4, alpha: 0.5 });
    // Gold border accent
    g.rect(x + 1, y + 3, w - 2, 0.6).fill({ color: COL_GOLD, alpha: 0.3 });
    g.rect(x + 1, y + h - 6, w - 2, 0.6).fill({ color: COL_GOLD, alpha: 0.3 });
  }

  private _drawChain(g: Graphics, x: number, y: number, h: number): void {
    // Giant chain hanging from ceiling
    for (let i = 0; i < h; i += 4) {
      const linkW = 3;
      const linkH = 4;
      if (i % 8 < 4) {
        // Vertical link
        g.ellipse(x, y + i + 2, linkW / 2, linkH / 2)
          .stroke({ color: COL_IRON, width: 1.2 });
      } else {
        // Horizontal link (perspective)
        g.ellipse(x, y + i + 2, linkW / 2 + 0.5, linkH / 2 - 0.5)
          .stroke({ color: COL_IRON_DK, width: 1.2 });
      }
    }
    // Hook at bottom
    g.moveTo(x, y + h)
      .quadraticCurveTo(x + 4, y + h + 4, x, y + h + 6)
      .stroke({ color: COL_IRON, width: 1.5 });
  }

  private _drawGear(
    g: Graphics,
    x: number,
    y: number,
    radius: number,
    teeth: number,
  ): void {
    // Massive gear on wall
    g.circle(x, y, radius)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 1 });
    // Gear teeth
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const tx = x + Math.cos(angle) * radius;
      const ty = y + Math.sin(angle) * radius;
      const outerX = x + Math.cos(angle) * (radius + 2.5);
      const outerY = y + Math.sin(angle) * (radius + 2.5);
      const perpX = Math.cos(angle + Math.PI / 2) * 1.5;
      const perpY = Math.sin(angle + Math.PI / 2) * 1.5;
      g.moveTo(tx + perpX, ty + perpY)
        .lineTo(outerX + perpX, outerY + perpY)
        .lineTo(outerX - perpX, outerY - perpY)
        .lineTo(tx - perpX, ty - perpY)
        .closePath()
        .fill({ color: COL_IRON });
    }
    // Hub
    g.circle(x, y, radius * 0.4)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Gold center rivet
    g.circle(x, y, 1.5).fill({ color: COL_GOLD });
    // Spokes
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      g.moveTo(x + Math.cos(angle) * radius * 0.4, y + Math.sin(angle) * radius * 0.4)
        .lineTo(x + Math.cos(angle) * radius * 0.85, y + Math.sin(angle) * radius * 0.85)
        .stroke({ color: COL_IRON, width: 1 });
    }
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
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.5 });
      for (let col = offset; col < w; col += 20) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.4 });
      }
      for (let col = offset; col < w - 6; col += 20) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 16, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.15 });
        g.moveTo(x + col + 1, y + row + 7)
          .lineTo(x + col + 16, y + row + 7)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.2 });
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
    const light: number[][] = [
      [0.1, 0.2],
      [0.5, 0.5],
      [0.25, 0.8],
      [0.75, 0.15],
      [0.6, 0.65],
    ];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({
        color: COL_STONE_LT,
        alpha: 0.15,
      });
    }
    const dark: number[][] = [
      [0.3, 0.1],
      [0.7, 0.4],
      [0.15, 0.6],
      [0.55, 0.85],
      [0.85, 0.3],
    ];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 8, 5).fill({
        color: COL_STONE_DK,
        alpha: 0.2,
      });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2).fill({ color: COL_MOSS, alpha: 0.3 });
    g.circle(x + 2, y - 1, 1).fill({ color: COL_MOSS, alpha: 0.2 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    for (let iy = 0; iy < h; iy += 5) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 0.8).fill({ color: COL_IVY });
    }
    for (let iy = 3; iy < h; iy += 8) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 16 < 8 ? -1 : 1;
      g.circle(x + wobble + dir * 3, y + iy, 1.8).fill({
        color: COL_IVY_LT,
        alpha: 0.5,
      });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.2).fill({
        color: COL_IVY,
        alpha: 0.4,
      });
    }
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
