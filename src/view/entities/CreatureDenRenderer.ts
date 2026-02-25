// Procedural creature den renderer for BuildingView.
//
// Draws an exotic creature marketplace (~2x2 tiles) with:
//   • Rich ornate building (right side) - extravagantly decorated like temple
//   • Field area with exotic creatures in shackles (left side)
//   • Wealthy merchant negotiating with another man
//   • Stained glass window with dragon
//   • Basilisk and other exotic creatures
//   • Rich Arabian/Eastern marketplace aesthetic
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const DW = 2 * TS; // 128px wide
const DH = 2 * TS; // 128px tall

// Palette — rich Eastern/Arabian marketplace
const COL_MARBLE = 0xf5efe0;
const COL_MARBLE_DK = 0xd4cbb8;
const COL_MARBLE_WARM = 0xefe3cc;
const COL_STONE = 0xb8a88a;
const COL_STONE_DK = 0x8a7d66;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_PURPLE = 0x6b1a6b;
const COL_PURPLE_LT = 0x9b4a9b;
const COL_RUBY = 0xaa1133;
const COL_EMERALD = 0x22aa55;

// Stained glass / Dragon window
const COL_GLASS_SKY = 0x1a0a2e;
const COL_GLASS_FIRE = 0xff4400;
const COL_DRAGON_BODY = 0x22aa44;
const COL_DRAGON_BELLY = 0xccaa44;
const COL_DRAGON_EYE = 0xffcc00;

// Creature colors
const COL_BASILISK = 0x33aa55;
const COL_BASILISK_EYE = 0xff0000;
const COL_CREATURE2 = 0x6644aa;
const COL_CHAIN = 0x555555;
const COL_SHACKLE = 0x8b7355;

// Character palettes
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xa67c52;
const COL_ROBE = 0xaa2244;
const COL_ROBE_2 = 0x2244aa;
const COL_BEARD = 0xdddddd;

// Animation timing
const MERCHANT_BOB = 1.5;
const CREATURE_MOVE = 3.0;
const DRAGON_GLOW = 2.0;
const FLAG_WAVE = 2.5;

// ---------------------------------------------------------------------------
// CreatureDenRenderer
// ---------------------------------------------------------------------------

export class CreatureDenRenderer {
  readonly container = new Container();

  private _ground = new Graphics();
  private _richBuilding = new Graphics();
  private _field = new Graphics();
  private _creatures = new Graphics();
  private _merchant = new Graphics();
  private _dragonWindow = new Graphics();
  private _decorations = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawGround();
    this._drawField();
    this._drawRichBuilding();
    this._drawDragonWindow();
    this._drawCreatures();
    this._drawMerchant();
    this._drawDecorations();

    this.container.addChild(this._ground);
    this.container.addChild(this._field);
    this.container.addChild(this._richBuilding);
    this.container.addChild(this._dragonWindow);
    this.container.addChild(this._creatures);
    this.container.addChild(this._merchant);
    this.container.addChild(this._decorations);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateCreatures(this._time);
    this._updateMerchant(this._time);
    this._updateDragonGlow(this._time);
    this._updateDecorations(this._time);
  }

  // ── Ground ─────────────────────────────────────────────────────────────────

  private _drawGround(): void {
    const g = this._ground;

    // Main ground
    g.rect(0, DH - 10, DW, 10).fill({ color: 0x4a3a2a });

    // Stone path
    g.rect(35, DH - 8, 58, 6).fill({ color: COL_STONE_DK });
    g.rect(38, DH - 8, 52, 2).fill({ color: COL_STONE });
  }

  // ── Field (left side) ────────────────────────────────────────────────────

  private _drawField(): void {
    const g = this._field;

    // Grass/dirt field area
    g.rect(0, 50, 55, DH - 60).fill({ color: 0x3a5a3a });

    // Some grass tufts
    for (let i = 0; i < 8; i++) {
      const gx = 5 + i * 6;
      g.moveTo(gx, 55)
        .lineTo(gx + 1, 50)
        .lineTo(gx + 2, 55)
        .stroke({ color: 0x4a6a4a, width: 1 });
    }

    // Fence posts separating field from building
    g.rect(52, 45, 3, 40).fill({ color: COL_WOOD_DK });
  }

  // ── Rich Building (right side) ───────────────────────────────────────────

  private _drawRichBuilding(): void {
    const g = this._richBuilding;

    const bx = 55;
    const by = 25;
    const bw = 70;
    const bh = DH - 30;

    // Main rich building body
    g.rect(bx, by, bw, bh)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 1 });

    // Decorative columns
    const colW = 6;
    g.rect(bx + 5, by, colW, bh)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    g.rect(bx + bw - 11, by, colW, bh)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });

    // Ornate cornice
    g.rect(bx - 3, by - 4, bw + 6, 6).fill({ color: COL_GOLD_DK });
    g.rect(bx - 2, by - 5, bw + 4, 2).fill({ color: COL_GOLD });

    // Rich door with arch
    const doorX = bx + bw / 2 - 12;
    const doorY = by + bh - 45;
    g.moveTo(doorX, doorY + 40)
      .lineTo(doorX, doorY + 15)
      .quadraticCurveTo(doorX + 12, doorY, doorX + 24, doorY + 15)
      .lineTo(doorX + 24, doorY + 40)
      .closePath()
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_GOLD, width: 1 });

    // Door decorations
    g.rect(doorX + 8, doorY + 20, 8, 2).fill({ color: COL_GOLD });

    // Roof - ornate domed top
    g.moveTo(bx - 5, by)
      .quadraticCurveTo(bx + bw / 2, by - 25, bx + bw + 5, by)
      .closePath()
      .fill({ color: COL_PURPLE })
      .stroke({ color: COL_PURPLE_LT, width: 1 });

    // Decorative dome finial
    g.rect(bx + bw / 2 - 2, by - 30, 4, 8).fill({ color: COL_GOLD });
    g.circle(bx + bw / 2, by - 34, 4).fill({ color: COL_RUBY });
  }

  // ── Dragon Window ─────────────────────────────────────────────────────────

  private _drawDragonWindow(): void {
    const g = this._dragonWindow;

    const wx = 90;
    const wy = 45;
    const wr = 18;

    // Window frame
    g.circle(wx, wy, wr + 3).fill({ color: COL_GOLD_DK });
    g.circle(wx, wy, wr + 1).fill({ color: COL_GOLD });

    // Dark background
    g.circle(wx, wy, wr).fill({ color: COL_GLASS_SKY });

    // Dragon will be animated
  }

  private _updateDragonGlow(time: number): void {
    const g = this._dragonWindow;
    g.clear();

    const wx = 90;
    const wy = 45;
    const wr = 18;

    // Window frame
    g.circle(wx, wy, wr + 3).fill({ color: COL_GOLD_DK });
    g.circle(wx, wy, wr + 1).fill({ color: COL_GOLD });

    // Glowing background
    const glow = (Math.sin(time * DRAGON_GLOW) + 1) / 2;
    const bgColor = glow > 0.5 ? COL_GLASS_FIRE : COL_GLASS_SKY;
    g.circle(wx, wy, wr).fill({ color: bgColor });

    // Dragon silhouette
    // Body
    g.ellipse(wx, wy + 2, 8, 12).fill({ color: COL_DRAGON_BODY });
    // Belly
    g.ellipse(wx, wy + 4, 5, 8).fill({ color: COL_DRAGON_BELLY });
    // Head
    g.circle(wx, wy - 8, 6).fill({ color: COL_DRAGON_BODY });
    // Snout
    g.ellipse(wx + 5, wy - 7, 4, 3).fill({ color: COL_DRAGON_BODY });
    // Eye (glowing)
    const eyeGlow = Math.sin(time * 4) > 0;
    g.circle(wx + 3, wy - 9, 2).fill({
      color: eyeGlow ? COL_DRAGON_EYE : 0x880000,
    });
    // Wings
    g.moveTo(wx - 6, wy - 2)
      .lineTo(wx - 14, wy - 10)
      .lineTo(wx - 10, wy)
      .closePath()
      .fill({ color: COL_DRAGON_BODY });
    g.moveTo(wx + 6, wy - 2)
      .lineTo(wx + 14, wy - 10)
      .lineTo(wx + 10, wy)
      .closePath()
      .fill({ color: COL_DRAGON_BODY });
    // Tail
    g.moveTo(wx, wy + 10)
      .lineTo(wx - 4, wy + 16)
      .lineTo(wx, wy + 12)
      .closePath()
      .fill({ color: COL_DRAGON_BODY });
  }

  // ── Creatures ─────────────────────────────────────────────────────────────

  private _drawCreatures(): void {
    // Initial draw
    this._updateCreatures(0);
  }

  private _updateCreatures(time: number): void {
    const g = this._creatures;
    g.clear();

    // Basilisk (main creature) - serpent-like with legs
    const basiliskX = 15 + Math.sin(time * CREATURE_MOVE) * 3;
    const basiliskY = 85;

    // Body (serpentine)
    for (let i = 0; i < 5; i++) {
      const bx = basiliskX - i * 5;
      const by = basiliskY + Math.sin(time * 2 + i) * 2;
      g.circle(bx, by, 5 - i * 0.5).fill({ color: COL_BASILISK });
    }
    // Head
    g.ellipse(basiliskX + 6, basiliskY, 6, 5).fill({ color: COL_BASILISK });
    // Eyes (glowing red - basilisk petrifying gaze)
    g.circle(basiliskX + 4, basiliskY - 2, 1.5).fill({
      color: COL_BASILISK_EYE,
    });
    g.circle(basiliskX + 8, basiliskY - 2, 1.5).fill({
      color: COL_BASILISK_EYE,
    });
    // Legs
    g.rect(basiliskX - 2, basiliskY + 3, 2, 4).fill({ color: COL_BASILISK });
    g.rect(basiliskX + 3, basiliskY + 3, 2, 4).fill({ color: COL_BASILISK });

    // Shackles on basilisk
    g.ellipse(basiliskX - 3, basiliskY + 8, 4, 3)
      .fill({ color: COL_CHAIN })
      .stroke({ color: COL_SHACKLE, width: 0.5 });

    // Second creature (mystical beast) - left field
    const creature2X = 40 + Math.sin(time * CREATURE_MOVE * 0.7 + 1) * 2;
    const creature2Y = 95;
    g.ellipse(creature2X, creature2Y, 8, 6).fill({ color: COL_CREATURE2 });
    g.circle(creature2X - 6, creature2Y - 3, 3).fill({ color: COL_CREATURE2 });
    // Horn
    g.moveTo(creature2X - 8, creature2Y - 5)
      .lineTo(creature2X - 12, creature2Y - 12)
      .lineTo(creature2X - 6, creature2Y - 6)
      .closePath()
      .fill({ color: COL_GOLD });
    // Shackle
    g.ellipse(creature2X, creature2Y + 4, 3, 2)
      .fill({ color: COL_CHAIN })
      .stroke({ color: COL_SHACKLE, width: 0.5 });

    // Chain connecting creatures
    g.moveTo(basiliskX, basiliskY + 10)
      .lineTo(creature2X, creature2Y + 5)
      .stroke({ color: COL_CHAIN, width: 1.5, alpha: 0.7 });
  }

  // ── Merchant & Negotiator ────────────────────────────────────────────────

  private _drawMerchant(): void {
    // Initial draw
    this._updateMerchant(0);
  }

  private _updateMerchant(time: number): void {
    const g = this._merchant;
    g.clear();

    // Merchant (wealthy, elaborate robes)
    const mx = 60;
    const my = DH - 20;
    const bob = Math.sin(time * MERCHANT_BOB) * 1;

    // Robes
    g.moveTo(mx - 8, my + bob)
      .lineTo(mx + 8, my + bob)
      .lineTo(mx + 6, my - 25 + bob)
      .lineTo(mx - 6, my - 25 + bob)
      .closePath()
      .fill({ color: COL_ROBE });
    // Robe trim
    g.rect(mx - 6, my - 20 + bob, 12, 3).fill({ color: COL_GOLD });

    // Head
    g.circle(mx, my - 30 + bob, 7).fill({ color: COL_SKIN });
    // Turban
    g.ellipse(mx, my - 38 + bob, 9, 5).fill({ color: COL_PURPLE });
    g.ellipse(mx, my - 40 + bob, 5, 3).fill({ color: COL_PURPLE_LT });
    // Turban jewel
    g.circle(mx, my - 38 + bob, 2).fill({ color: COL_RUBY });

    // Beard
    g.moveTo(mx - 3, my - 26 + bob)
      .quadraticCurveTo(mx, my - 20, mx + 3, my - 26 + bob)
      .fill({ color: COL_BEARD });

    // Gesture (talking)
    const handWave = Math.sin(time * MERCHANT_BOB * 2) * 3;
    g.rect(mx + 8, my - 22 + bob + handWave, 8, 2).fill({ color: COL_SKIN });
    g.circle(mx + 16, my - 22 + bob + handWave, 2).fill({ color: COL_SKIN });

    // Negotiator (buyer)
    const nx = 80;
    const ny = DH - 18;
    const nbob = Math.sin(time * MERCHANT_BOB + Math.PI) * 1;

    // Simpler robes
    g.moveTo(nx - 6, ny + nbob)
      .lineTo(nx + 6, ny + nbob)
      .lineTo(nx + 5, ny - 20 + nbob)
      .lineTo(nx - 5, ny - 20 + nbob)
      .closePath()
      .fill({ color: COL_ROBE_2 });

    // Head
    g.circle(nx, ny - 25 + nbob, 6).fill({ color: COL_SKIN_DK });
    // Hat
    g.rect(nx - 5, ny - 34 + nbob, 10, 4).fill({ color: COL_WOOD_DK });
    g.rect(nx - 3, ny - 38 + nbob, 6, 5).fill({ color: COL_WOOD_DK });

    // Gesture (listening)
    g.rect(nx - 12, ny - 18 + nbob, -6, 2).fill({ color: COL_SKIN_DK });
  }

  // ── Decorations ──────────────────────────────────────────────────────────

  private _drawDecorations(): void {
    // Initial draw
    this._updateDecorations(0);
  }

  private _updateDecorations(time: number): void {
    const g = this._decorations;
    g.clear();

    // Rich carpets hanging on building

    // Carpet 1
    g.rect(60, 55, 12, 25).fill({ color: COL_RUBY });
    g.rect(62, 58, 8, 3).fill({ color: COL_GOLD });
    g.rect(62, 65, 8, 3).fill({ color: COL_GOLD });
    g.rect(62, 72, 8, 3).fill({ color: COL_GOLD });

    // Carpet 2
    g.rect(105, 55, 12, 25).fill({ color: COL_EMERALD });
    g.rect(107, 58, 8, 3).fill({ color: COL_GOLD });
    g.rect(107, 65, 8, 3).fill({ color: COL_GOLD });
    g.rect(107, 72, 8, 3).fill({ color: COL_GOLD });

    // Hanging lantern
    const lx = 75,
      ly = 40;
    g.rect(lx - 1, ly, 2, 8).fill({ color: COL_WOOD });
    g.moveTo(lx, ly + 8)
      .lineTo(lx - 5, ly + 15)
      .lineTo(lx + 5, ly + 15)
      .closePath()
      .fill({ color: COL_GOLD_DK });
    const flameGlow = (Math.sin(time * 6) + 1) / 2;
    g.circle(lx, ly + 12, 2 + flameGlow).fill({
      color: flameGlow > 0.5 ? 0xffaa00 : 0xff6600,
    });

    // Banner with emblem
    const bx = 58,
      by = 30;
    const wave = Math.sin(time * FLAG_WAVE) * 2;
    g.rect(bx, by, 3, 12).fill({ color: COL_WOOD });
    g.moveTo(bx + 3, by)
      .bezierCurveTo(
        bx + 10 + wave,
        by + 2,
        bx + 12 + wave,
        by + 8,
        bx + 3,
        by + 14,
      )
      .closePath()
      .fill({ color: COL_PURPLE });
    g.circle(bx + 6, by + 7, 3).fill({ color: COL_GOLD });
  }
}
