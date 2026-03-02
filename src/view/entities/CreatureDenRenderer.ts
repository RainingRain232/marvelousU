// Procedural creature den renderer for BuildingView.
//
// Draws a detailed 2×2 tile exotic creature marketplace with:
//   • Ornate marble-and-gold building with domed roof, pillars, and arched entrance
//   • Stained-glass rose window with animated dragon silhouette
//   • Outdoor field with exotic creatures: basilisk (serpentine, glowing eyes),
//     griffin (eagle-lion hybrid), and a caged fire imp
//   • Wealthy merchant in turban & rich robes negotiating with a hooded buyer
//   • Sturdy wooden stockade fence separating field from building
//   • Iron cages, heavy chains, and enchanted shackles with rune glow
//   • Hanging lanterns (pulsing warm glow), draped carpets, jewelled banner
//   • Exotic goods: scroll rack, potion bottles, gemstone display
//   • Incense brazier with rising wisps, potted exotic plants
//   • Brick pattern, stone variation, moss, cobblestone path
//   • Player-colored pennant
//
// All drawing uses PixiJS Graphics.  2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const DW = 2 * TS; // 128px
const DH = 2 * TS; // 128px

// --- Palette ---
const COL_MARBLE = 0xf5efe0;
const COL_MARBLE_DK = 0xd4cbb8;
const COL_MARBLE_WARM = 0xefe3cc;
const COL_STONE = 0xb8a88a;
const COL_STONE_DK = 0x8a7d66;
const COL_STONE_LT = 0xccc0a8;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_PURPLE = 0x6b1a6b;
const COL_PURPLE_LT = 0x9b4a9b;
const COL_RUBY = 0xaa1133;
const COL_EMERALD = 0x22aa55;
const COL_SAPPHIRE = 0x2244cc;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_CHAIN = 0x666666;
const COL_MOSS = 0x4a6b3a;

// Stained glass / Dragon window
const COL_GLASS_SKY = 0x1a0a2e;
const COL_DRAGON_BODY = 0x22aa44;
const COL_DRAGON_BELLY = 0xccaa44;
const COL_DRAGON_EYE = 0xffcc00;
const COL_GLASS_FIRE = 0xff4400;

// Creature colors
const COL_BASILISK = 0x33aa55;
const COL_BASILISK_DK = 0x228844;
const COL_BASILISK_BELLY = 0x88cc66;
const COL_BASILISK_EYE = 0xff0000;
const COL_GRIFFIN_BODY = 0x8b6a3a;
const COL_GRIFFIN_FEATHER = 0xddcc88;
const COL_GRIFFIN_BEAK = 0xff9922;
const COL_IMP = 0xcc3322;
const COL_IMP_DK = 0x992211;

// Character palettes
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xa67c52;
const COL_ROBE_RED = 0xaa2244;
const COL_ROBE_BLUE = 0x2244aa;
const COL_BEARD = 0xdddddd;

const COL_LANTERN_GLOW = 0xffaa44;
const COL_INCENSE = 0xccbbaa;
const COL_RUNE_GLOW = 0x44ddff;

// Animation timing
const MERCHANT_BOB = 1.5;
const CREATURE_MOVE = 3.0;
const DRAGON_GLOW = 2.0;
const FLAG_SPEED = 3.0;

// ---------------------------------------------------------------------------
// CreatureDenRenderer
// ---------------------------------------------------------------------------

export class CreatureDenRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics(); // Ground, fence, field
  private _building = new Graphics(); // Ornate marble building
  private _dragonWindow = new Graphics(); // Stained glass
  private _props = new Graphics(); // Carpets, goods, cages, brazier
  private _creatures = new Graphics(); // Exotic beasts
  private _characters = new Graphics(); // Merchant + buyer
  private _effects = new Graphics(); // Lanterns, incense, rune glow
  private _banner = new Graphics(); // Player pennant

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBase();
    this._drawBuilding();
    this._drawProps();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._dragonWindow);
    this.container.addChild(this._props);
    this.container.addChild(this._creatures);
    this.container.addChild(this._characters);
    this.container.addChild(this._effects);
    this.container.addChild(this._banner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateDragonWindow(this._time);
    this._updateCreatures(this._time);
    this._updateCharacters(this._time);
    this._updateEffects(this._time);
    this._updateBanner(this._time);
  }

  // =========================================================================
  // Base — ground, field, fence, cobblestone path
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground ──
    g.rect(0, DH - 10, DW, 10).fill({ color: 0x4a3a2a });

    // Cobblestone path (center)
    g.rect(35, DH - 10, 58, 8).fill({ color: COL_STONE_DK });
    for (let i = 0; i < 7; i++) {
      g.rect(37 + i * 8, DH - 9, 6, 3)
        .fill({ color: COL_STONE, alpha: 0.3 })
        .stroke({ color: COL_STONE_DK, width: 0.2, alpha: 0.3 });
    }

    // ── Outdoor field (left side) ──
    g.rect(0, 48, 54, DH - 58).fill({ color: 0x3a5a3a });
    // Dirt patches
    g.ellipse(15, 78, 8, 4).fill({ color: 0x4a3a2a, alpha: 0.3 });
    g.ellipse(38, 92, 6, 3).fill({ color: 0x4a3a2a, alpha: 0.25 });

    // Grass tufts
    for (let i = 0; i < 10; i++) {
      const gx = 3 + i * 5;
      const gy = 50 + (i % 3) * 2;
      g.moveTo(gx, gy + 3)
        .lineTo(gx + 1, gy)
        .stroke({ color: 0x5a7a4a, width: 0.8 });
      g.moveTo(gx + 2, gy + 3)
        .lineTo(gx + 3, gy - 1)
        .stroke({ color: 0x4a6a3a, width: 0.6 });
    }

    // ── Stockade fence ──
    for (let i = 0; i < 7; i++) {
      const fx = 52;
      const fy = 42 + i * 12;
      g.rect(fx, fy, 3, 10)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      // Pointed top
      g.moveTo(fx, fy)
        .lineTo(fx + 1.5, fy - 3)
        .lineTo(fx + 3, fy)
        .fill({ color: COL_WOOD });
    }
    // Horizontal rails
    g.rect(50, 55, 6, 2).fill({ color: COL_WOOD_DK });
    g.rect(50, 80, 6, 2).fill({ color: COL_WOOD_DK });
    g.rect(50, 105, 6, 2).fill({ color: COL_WOOD_DK });

    // ── Moss on fence posts ──
    this._drawMoss(g, 51, 68, 5);
    this._drawMoss(g, 51, 95, 4);
  }

  // =========================================================================
  // Ornate marble building — domed roof, pillars, arched entrance
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    const bx = 56;
    const by = 28;
    const bw = 68;
    const bh = DH - by - 12;

    // ── Main body ──
    g.rect(bx, by, bw, bh)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 1 });
    // Wall shadow
    g.rect(bx + 1, by + 1, 4, bh - 2).fill({ color: COL_MARBLE_DK, alpha: 0.15 });

    // Marble veining / tile pattern
    for (let row = 0; row < bh; row += 10) {
      g.moveTo(bx + 2, by + row)
        .lineTo(bx + bw - 2, by + row)
        .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.25 });
    }
    // Stone variation highlights
    const marbleSpots = [[0.15, 0.2], [0.5, 0.4], [0.75, 0.7], [0.3, 0.8], [0.6, 0.15]];
    for (const [fx, fy] of marbleSpots) {
      g.rect(bx + fx * bw, by + fy * bh, 8, 5).fill({
        color: COL_MARBLE_WARM,
        alpha: 0.2,
      });
    }

    // ── Decorative fluted columns ──
    const colW = 6;
    this._drawColumn(g, bx + 5, by, colW, bh);
    this._drawColumn(g, bx + bw - 11, by, colW, bh);

    // ── Ornate cornice with dentils ──
    g.rect(bx - 3, by - 2, bw + 6, 4)
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_GOLD, width: 0.5 });
    g.rect(bx - 2, by - 4, bw + 4, 3).fill({ color: COL_GOLD });
    // Dentils
    for (let i = 0; i < 10; i++) {
      g.rect(bx + 2 + i * 7, by - 6, 4, 2).fill({ color: COL_GOLD_DK });
    }

    // ── Domed roof ──
    g.moveTo(bx - 5, by - 2)
      .quadraticCurveTo(bx + bw / 2, by - 30, bx + bw + 5, by - 2)
      .closePath()
      .fill({ color: COL_PURPLE })
      .stroke({ color: COL_PURPLE_LT, width: 1 });
    // Dome highlight
    g.moveTo(bx + bw / 2, by - 28)
      .quadraticCurveTo(bx + bw * 0.7, by - 18, bx + bw + 3, by - 4)
      .lineTo(bx + bw + 5, by - 2)
      .quadraticCurveTo(bx + bw / 2, by - 30, bx + bw / 2, by - 28)
      .fill({ color: COL_PURPLE_LT, alpha: 0.15 });
    // Dome tile bands
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const bandY = by - 2 - (28 * (1 - frac * frac));
      const halfW = (bw / 2 + 5) * frac;
      g.moveTo(bx + bw / 2 - halfW, by - 2 + (28 * frac * frac - 28) * 0)
        .stroke({ color: COL_PURPLE_LT, width: 0.5, alpha: 0 }); // placeholder
      g.moveTo(bx + bw / 2 - halfW * 0.95, bandY)
        .lineTo(bx + bw / 2 + halfW * 0.95, bandY)
        .stroke({ color: COL_PURPLE_LT, width: 0.4, alpha: 0.3 });
    }

    // ── Finial (crescent moon + jewel) ──
    const finX = bx + bw / 2;
    const finY = by - 30;
    g.rect(finX - 1, finY - 6, 2, 8).fill({ color: COL_GOLD });
    // Crescent
    g.circle(finX, finY - 9, 4).fill({ color: COL_GOLD });
    g.circle(finX + 2, finY - 9, 3).fill({ color: COL_PURPLE }); // cutout
    // Jewel
    g.circle(finX, finY - 14, 2.5)
      .fill({ color: COL_RUBY })
      .stroke({ color: COL_GOLD, width: 0.5 });

    // ── Arched entrance ──
    const doorX = bx + bw / 2 - 12;
    const doorY = by + bh - 46;
    const doorW = 24;
    const doorH = 42;
    // Arch
    g.rect(doorX, doorY + 14, doorW, doorH - 14)
      .fill({ color: COL_WOOD_DK });
    g.ellipse(doorX + doorW / 2, doorY + 14, doorW / 2, 14)
      .fill({ color: COL_WOOD_DK });
    // Arch voussoirs
    for (let va = -0.8; va <= 0.8; va += 0.35) {
      const vx = doorX + doorW / 2 + Math.sin(va) * (doorW / 2 + 2);
      const vy = doorY + 14 - Math.cos(va) * 16;
      g.circle(vx, vy, 1.5).fill({ color: COL_STONE_LT, alpha: 0.35 });
    }
    // Keystone
    g.moveTo(doorX + doorW / 2 - 3, doorY + 2)
      .lineTo(doorX + doorW / 2, doorY - 3)
      .lineTo(doorX + doorW / 2 + 3, doorY + 2)
      .fill({ color: COL_GOLD });

    // Door frame (gold)
    g.rect(doorX, doorY + 14, doorW, doorH - 14)
      .stroke({ color: COL_GOLD, width: 1 });
    // Door handle
    g.circle(doorX + doorW - 4, doorY + 30, 1.5).fill({ color: COL_GOLD });

    // Door panels
    g.rect(doorX + 2, doorY + 16, doorW / 2 - 3, doorH - 18)
      .stroke({ color: COL_WOOD, width: 0.5 });
    g.rect(doorX + doorW / 2 + 1, doorY + 16, doorW / 2 - 3, doorH - 18)
      .stroke({ color: COL_WOOD, width: 0.5 });

    // ── Small windows flanking entrance ──
    this._drawOrnateWindow(g, bx + 14, by + 20, 10, 16);
    this._drawOrnateWindow(g, bx + bw - 24, by + 20, 10, 16);
  }

  // =========================================================================
  // Stained glass dragon window — animated glow
  // =========================================================================

  private _updateDragonWindow(time: number): void {
    const g = this._dragonWindow;
    g.clear();

    const wx = 90;
    const wy = 46;
    const wr = 16;

    // Frame (gold, ornate)
    g.circle(wx, wy, wr + 3)
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_GOLD, width: 1 });
    g.circle(wx, wy, wr + 1).fill({ color: COL_GOLD });

    // Background — pulsing between dark sky and fire
    const glow = (Math.sin(time * DRAGON_GLOW) + 1) / 2;
    g.circle(wx, wy, wr).fill({ color: COL_GLASS_SKY });
    g.circle(wx, wy, wr).fill({ color: COL_GLASS_FIRE, alpha: glow * 0.4 });

    // ── Dragon silhouette ──
    // Body
    g.moveTo(wx - 5, wy + 10)
      .bezierCurveTo(wx - 8, wy + 4, wx - 6, wy - 4, wx - 1, wy - 2)
      .lineTo(wx + 2, wy)
      .bezierCurveTo(wx - 1, wy + 4, wx - 3, wy + 8, wx - 5, wy + 10)
      .fill({ color: COL_DRAGON_BODY, alpha: 0.9 });
    // Belly
    g.moveTo(wx - 3, wy + 8)
      .bezierCurveTo(wx - 2, wy + 4, wx, wy + 2, wx + 1, wy + 1)
      .lineTo(wx, wy + 3)
      .bezierCurveTo(wx - 1, wy + 5, wx - 2, wy + 7, wx - 3, wy + 8)
      .fill({ color: COL_DRAGON_BELLY, alpha: 0.7 });
    // Neck + head
    g.moveTo(wx - 1, wy - 2)
      .bezierCurveTo(wx, wy - 6, wx + 2, wy - 4, wx + 3, wy - 2)
      .lineTo(wx + 2, wy)
      .fill({ color: COL_DRAGON_BODY, alpha: 0.85 });
    g.ellipse(wx + 3, wy - 3, 3, 2.5).fill({ color: COL_DRAGON_BODY, alpha: 0.9 });
    // Eye (glowing)
    const eyeBlink = Math.sin(time * 4) > 0;
    g.circle(wx + 3, wy - 4, 1.2).fill({
      color: eyeBlink ? COL_DRAGON_EYE : 0x880000,
    });
    // Snout
    g.moveTo(wx + 5, wy - 3)
      .lineTo(wx + 8, wy - 2)
      .lineTo(wx + 5, wy - 1)
      .fill({ color: COL_DRAGON_BODY });

    // Wings
    g.moveTo(wx - 3, wy)
      .lineTo(wx - 10, wy - 8)
      .lineTo(wx - 7, wy + 1)
      .closePath()
      .fill({ color: COL_DRAGON_BODY, alpha: 0.7 });
    g.moveTo(wx + 1, wy - 1)
      .lineTo(wx + 9, wy - 8)
      .lineTo(wx + 6, wy + 1)
      .closePath()
      .fill({ color: COL_DRAGON_BODY, alpha: 0.65 });
    // Wing membrane
    g.moveTo(wx - 3, wy)
      .lineTo(wx - 8, wy - 6)
      .stroke({ color: 0x222222, width: 0.4, alpha: 0.5 });

    // Fire breath
    g.moveTo(wx + 7, wy - 2)
      .bezierCurveTo(wx + 10, wy - 6, wx + 12, wy - 4, wx + 11, wy - 1)
      .fill({ color: COL_GLASS_FIRE, alpha: 0.6 + glow * 0.3 });
    g.moveTo(wx + 8, wy - 2)
      .bezierCurveTo(wx + 10, wy - 4, wx + 11, wy - 3, wx + 10, wy - 1)
      .fill({ color: 0xffcc00, alpha: 0.5 + glow * 0.2 });

    // Tail
    g.moveTo(wx - 5, wy + 10)
      .bezierCurveTo(wx - 3, wy + 13, wx, wy + 14, wx + 2, wy + 12)
      .stroke({ color: COL_DRAGON_BODY, width: 1.5 });

    // Lead caming (radial lines)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.moveTo(wx, wy)
        .lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr)
        .stroke({ color: 0x222222, width: 0.5, alpha: 0.3 });
    }

    // Frame detail — gems at cardinal points
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const gx = wx + Math.cos(a) * (wr + 2);
      const gy = wy + Math.sin(a) * (wr + 2);
      g.circle(gx, gy, 1.5).fill({
        color: [COL_RUBY, COL_EMERALD, COL_SAPPHIRE, COL_GOLD][i],
      });
    }
  }

  // =========================================================================
  // Props — static decorations drawn once (carpets, goods drawn in effects)
  // =========================================================================

  private _drawProps(): void {
    // Static props are drawn as part of the animated effects layer
    // so they can share the same redraw cycle. This layer is reserved
    // for future static-only additions.
  }

  // =========================================================================
  // Creatures — basilisk, griffin, caged fire imp
  // =========================================================================

  private _updateCreatures(time: number): void {
    const g = this._creatures;
    g.clear();

    // ── Basilisk (serpentine, left field) ──
    const bsx = 18 + Math.sin(time * CREATURE_MOVE) * 3;
    const bsy = 82;

    // Serpentine body segments
    for (let i = 0; i < 6; i++) {
      const sx = bsx - i * 4;
      const sy = bsy + Math.sin(time * 2.5 + i * 0.8) * 2;
      const r = 4.5 - i * 0.4;
      g.circle(sx, sy, r).fill({ color: COL_BASILISK });
      // Belly markings
      g.circle(sx, sy + r * 0.4, r * 0.6).fill({ color: COL_BASILISK_BELLY, alpha: 0.4 });
    }
    // Scale pattern (dorsal ridge)
    for (let i = 0; i < 4; i++) {
      const sx = bsx - 2 - i * 4;
      const sy = bsy - 3 + Math.sin(time * 2.5 + (i + 1) * 0.8) * 2;
      g.moveTo(sx, sy)
        .lineTo(sx + 1, sy - 2)
        .lineTo(sx + 2, sy)
        .fill({ color: COL_BASILISK_DK, alpha: 0.5 });
    }

    // Head (wider, reptilian)
    g.ellipse(bsx + 7, bsy, 6, 5)
      .fill({ color: COL_BASILISK })
      .stroke({ color: COL_BASILISK_DK, width: 0.5 });
    // Snout
    g.ellipse(bsx + 12, bsy + 1, 3, 2.5).fill({ color: COL_BASILISK });
    // Nostril
    g.circle(bsx + 14, bsy, 0.6).fill({ color: COL_BASILISK_DK });
    // Crown / crest (basilisk is king of serpents)
    g.moveTo(bsx + 4, bsy - 4)
      .lineTo(bsx + 3, bsy - 9)
      .lineTo(bsx + 6, bsy - 6)
      .lineTo(bsx + 5, bsy - 10)
      .lineTo(bsx + 8, bsy - 6)
      .lineTo(bsx + 7, bsy - 9)
      .lineTo(bsx + 10, bsy - 4)
      .fill({ color: COL_GOLD, alpha: 0.7 });

    // Eyes (glowing red — petrifying gaze)
    const eyePulse = 0.6 + Math.sin(time * 3) * 0.3;
    g.circle(bsx + 6, bsy - 2, 2)
      .fill({ color: COL_BASILISK_EYE, alpha: eyePulse });
    g.circle(bsx + 10, bsy - 2, 2)
      .fill({ color: COL_BASILISK_EYE, alpha: eyePulse });
    // Pupil slits
    g.rect(bsx + 5.5, bsy - 3, 1, 2).fill({ color: 0x220000 });
    g.rect(bsx + 9.5, bsy - 3, 1, 2).fill({ color: 0x220000 });
    // Eye glow aura
    g.circle(bsx + 8, bsy - 2, 6).fill({ color: COL_BASILISK_EYE, alpha: eyePulse * 0.08 });

    // Forked tongue
    const tongueFlick = Math.sin(time * 6) > 0.5;
    if (tongueFlick) {
      g.moveTo(bsx + 14, bsy + 1)
        .lineTo(bsx + 18, bsy)
        .stroke({ color: 0xcc2244, width: 0.6 });
      g.moveTo(bsx + 14, bsy + 1)
        .lineTo(bsx + 17, bsy + 2)
        .stroke({ color: 0xcc2244, width: 0.6 });
    }

    // Small legs
    g.rect(bsx - 1, bsy + 4, 2, 5).fill({ color: COL_BASILISK });
    g.rect(bsx + 4, bsy + 4, 2, 5).fill({ color: COL_BASILISK });
    // Claws
    g.moveTo(bsx - 1, bsy + 9).lineTo(bsx - 2, bsy + 10).stroke({ color: COL_BASILISK_DK, width: 0.5 });
    g.moveTo(bsx + 6, bsy + 9).lineTo(bsx + 7, bsy + 10).stroke({ color: COL_BASILISK_DK, width: 0.5 });

    // Enchanted shackle (with rune glow)
    g.ellipse(bsx - 4, bsy + 10, 5, 3)
      .stroke({ color: COL_CHAIN, width: 1.5 });
    const runeGlow = 0.3 + Math.sin(time * 2) * 0.2;
    g.ellipse(bsx - 4, bsy + 10, 5, 3)
      .stroke({ color: COL_RUNE_GLOW, width: 0.8, alpha: runeGlow });
    // Chain to stake
    g.moveTo(bsx - 9, bsy + 10)
      .lineTo(5, 90)
      .stroke({ color: COL_CHAIN, width: 1 });
    // Iron stake
    g.rect(3, 85, 4, 15).fill({ color: COL_IRON_DK });

    // ── Griffin (eagle-lion, upper field) ──
    const grx = 35 + Math.sin(time * CREATURE_MOVE * 0.6 + 1) * 2;
    const gry = 66;

    // Lion body
    g.ellipse(grx, gry + 3, 9, 6)
      .fill({ color: COL_GRIFFIN_BODY })
      .stroke({ color: 0x6a5a2a, width: 0.5 });
    // Lion hindquarters
    g.ellipse(grx - 6, gry + 4, 5, 5).fill({ color: COL_GRIFFIN_BODY });
    // Legs
    g.rect(grx - 8, gry + 7, 2, 6).fill({ color: COL_GRIFFIN_BODY });
    g.rect(grx - 4, gry + 8, 2, 5).fill({ color: COL_GRIFFIN_BODY });
    g.rect(grx + 4, gry + 7, 2, 6).fill({ color: COL_GRIFFIN_BODY });
    g.rect(grx + 7, gry + 8, 2, 5).fill({ color: COL_GRIFFIN_BODY });
    // Talons on front feet
    g.moveTo(grx + 4, gry + 13).lineTo(grx + 3, gry + 14).stroke({ color: 0x333333, width: 0.5 });
    g.moveTo(grx + 9, gry + 13).lineTo(grx + 10, gry + 14).stroke({ color: 0x333333, width: 0.5 });

    // Eagle head
    g.circle(grx + 8, gry - 3, 4)
      .fill({ color: COL_GRIFFIN_FEATHER })
      .stroke({ color: 0xaa9a68, width: 0.5 });
    // Beak
    g.moveTo(grx + 11, gry - 4)
      .lineTo(grx + 16, gry - 2)
      .lineTo(grx + 11, gry - 1)
      .closePath()
      .fill({ color: COL_GRIFFIN_BEAK });
    // Eye
    g.circle(grx + 10, gry - 4, 1).fill({ color: 0xffaa00 });
    g.circle(grx + 10, gry - 4, 0.4).fill({ color: 0x111111 });

    // Wings (folded, feathered)
    g.moveTo(grx - 2, gry)
      .bezierCurveTo(grx - 6, gry - 8, grx + 2, gry - 12, grx + 6, gry - 6)
      .stroke({ color: COL_GRIFFIN_FEATHER, width: 1.5 });
    // Feather lines
    g.moveTo(grx - 1, gry - 1)
      .lineTo(grx - 4, gry - 6)
      .stroke({ color: 0xaa9a68, width: 0.4, alpha: 0.5 });
    g.moveTo(grx + 1, gry - 2)
      .lineTo(grx - 1, gry - 8)
      .stroke({ color: 0xaa9a68, width: 0.4, alpha: 0.5 });

    // Lion tail (tufted)
    const tailSwish = Math.sin(time * 1.5) * 3;
    g.moveTo(grx - 10, gry + 2)
      .bezierCurveTo(grx - 14 + tailSwish, gry - 2, grx - 16 + tailSwish, gry - 6, grx - 14 + tailSwish, gry - 8)
      .stroke({ color: COL_GRIFFIN_BODY, width: 1.5 });
    // Tuft
    g.circle(grx - 14 + tailSwish, gry - 8, 2.5).fill({ color: COL_GRIFFIN_BODY });

    // Chain
    g.moveTo(grx - 8, gry + 10)
      .lineTo(8, 72)
      .stroke({ color: COL_CHAIN, width: 1, alpha: 0.7 });
    // Shackle on leg
    g.ellipse(grx - 7, gry + 10, 3, 2).stroke({ color: COL_CHAIN, width: 1.2 });

    // ── Caged fire imp (small cage, near fence) ──
    const cx = 44;
    const cy = 100;

    // Cage bars
    g.rect(cx - 8, cy - 10, 16, 18)
      .stroke({ color: COL_IRON, width: 0.8 });
    for (let i = 0; i < 4; i++) {
      g.moveTo(cx - 6 + i * 4, cy - 10)
        .lineTo(cx - 6 + i * 4, cy + 8)
        .stroke({ color: COL_IRON, width: 0.8 });
    }
    // Cage top
    g.rect(cx - 8, cy - 10, 16, 2).fill({ color: COL_IRON });

    // Fire imp (small, glowing)
    const impBob = Math.sin(time * 3) * 1;
    g.circle(cx, cy + impBob, 4)
      .fill({ color: COL_IMP })
      .stroke({ color: COL_IMP_DK, width: 0.5 });
    // Head
    g.circle(cx, cy - 5 + impBob, 3).fill({ color: COL_IMP });
    // Horns
    g.moveTo(cx - 2, cy - 7 + impBob)
      .lineTo(cx - 4, cy - 11 + impBob)
      .stroke({ color: COL_IMP_DK, width: 1 });
    g.moveTo(cx + 2, cy - 7 + impBob)
      .lineTo(cx + 4, cy - 11 + impBob)
      .stroke({ color: COL_IMP_DK, width: 1 });
    // Glowing eyes
    g.circle(cx - 1, cy - 6 + impBob, 0.8).fill({ color: 0xffcc00 });
    g.circle(cx + 1, cy - 6 + impBob, 0.8).fill({ color: 0xffcc00 });
    // Flame aura
    const flameAlpha = 0.15 + Math.sin(time * 5) * 0.08;
    g.circle(cx, cy - 2 + impBob, 8).fill({ color: 0xff4400, alpha: flameAlpha });
    // Tiny flames on hands
    g.moveTo(cx - 4, cy - 1 + impBob)
      .quadraticCurveTo(cx - 6, cy - 4 + impBob, cx - 4, cy - 3 + impBob)
      .fill({ color: 0xff6600, alpha: 0.5 });
    g.moveTo(cx + 4, cy - 1 + impBob)
      .quadraticCurveTo(cx + 6, cy - 4 + impBob, cx + 4, cy - 3 + impBob)
      .fill({ color: 0xff6600, alpha: 0.5 });
  }

  // =========================================================================
  // Characters — merchant + buyer
  // =========================================================================

  private _updateCharacters(time: number): void {
    const g = this._characters;
    g.clear();

    // ── Wealthy merchant ──
    const mx = 62;
    const my = DH - 16;
    const bob = Math.sin(time * MERCHANT_BOB) * 1;

    // Robes (rich, flowing)
    g.moveTo(mx - 7, my + bob)
      .lineTo(mx + 7, my + bob)
      .lineTo(mx + 6, my - 22 + bob)
      .lineTo(mx - 6, my - 22 + bob)
      .closePath()
      .fill({ color: COL_ROBE_RED })
      .stroke({ color: 0x881133, width: 0.5 });
    // Gold trim
    g.rect(mx - 6, my - 18 + bob, 12, 2).fill({ color: COL_GOLD });
    g.rect(mx - 6, my - 6 + bob, 12, 1.5).fill({ color: COL_GOLD });
    // Sash
    g.moveTo(mx - 4, my - 14 + bob)
      .lineTo(mx + 5, my - 10 + bob)
      .stroke({ color: COL_GOLD_DK, width: 1.5 });

    // Head
    g.circle(mx, my - 27 + bob, 6)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.4 });
    // Turban (elaborate)
    g.ellipse(mx, my - 34 + bob, 8, 4).fill({ color: COL_PURPLE });
    g.ellipse(mx, my - 36 + bob, 5, 3).fill({ color: COL_PURPLE_LT });
    g.ellipse(mx, my - 35 + bob, 3, 2).fill({ color: COL_PURPLE });
    // Turban jewel
    g.circle(mx, my - 34 + bob, 2)
      .fill({ color: COL_RUBY })
      .stroke({ color: COL_GOLD, width: 0.5 });

    // Beard (long, white, distinguished)
    g.moveTo(mx - 4, my - 24 + bob)
      .quadraticCurveTo(mx - 3, my - 18 + bob, mx - 1, my - 16 + bob)
      .stroke({ color: COL_BEARD, width: 2.5 });
    g.moveTo(mx + 4, my - 24 + bob)
      .quadraticCurveTo(mx + 3, my - 18 + bob, mx + 1, my - 16 + bob)
      .stroke({ color: COL_BEARD, width: 2.5 });

    // Eyes
    g.circle(mx - 2, my - 28 + bob, 0.8).fill({ color: 0x222222 });
    g.circle(mx + 2, my - 28 + bob, 0.8).fill({ color: 0x222222 });

    // Gesture (hand wave, negotiating)
    const handWave = Math.sin(time * MERCHANT_BOB * 2) * 3;
    g.moveTo(mx + 6, my - 20 + bob)
      .lineTo(mx + 12, my - 18 + bob + handWave)
      .stroke({ color: COL_SKIN, width: 2 });
    g.circle(mx + 12, my - 18 + bob + handWave, 2).fill({ color: COL_SKIN });
    // Rings on fingers
    g.circle(mx + 12, my - 18 + bob + handWave, 2.5).stroke({
      color: COL_GOLD,
      width: 0.5,
    });

    // ── Hooded buyer ──
    const nx = 82;
    const ny = DH - 14;
    const nbob = Math.sin(time * MERCHANT_BOB + Math.PI) * 1;

    // Dark cloak
    g.moveTo(nx - 6, ny + nbob)
      .lineTo(nx + 6, ny + nbob)
      .lineTo(nx + 5, ny - 20 + nbob)
      .lineTo(nx - 5, ny - 20 + nbob)
      .closePath()
      .fill({ color: COL_ROBE_BLUE })
      .stroke({ color: 0x1a2a66, width: 0.5 });

    // Hood
    g.circle(nx, ny - 24 + nbob, 6).fill({ color: COL_ROBE_BLUE });
    g.moveTo(nx - 6, ny - 24 + nbob)
      .quadraticCurveTo(nx, ny - 32 + nbob, nx + 6, ny - 24 + nbob)
      .fill({ color: 0x1a2a66 });
    // Face in shadow
    g.circle(nx, ny - 24 + nbob, 4).fill({ color: COL_SKIN_DK });
    // Eye glint
    g.circle(nx + 1, ny - 25 + nbob, 0.6).fill({ color: 0xffffff, alpha: 0.5 });

    // Arms crossed / clutching coin purse
    g.moveTo(nx - 5, ny - 16 + nbob)
      .lineTo(nx - 8, ny - 12 + nbob)
      .stroke({ color: COL_ROBE_BLUE, width: 3 });
    // Coin purse
    g.ellipse(nx - 8, ny - 10 + nbob, 3, 2)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.circle(nx - 8, ny - 10 + nbob, 0.8).fill({ color: COL_GOLD });
  }

  // =========================================================================
  // Effects — lanterns, incense, rune glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // ── Hanging lantern (near entrance) ──
    const lx = 77;
    const ly = 38;
    const pulse = 0.55 + Math.sin(time * 2.5) * 0.18;

    // Chain
    g.moveTo(lx, ly - 6).lineTo(lx, ly).stroke({ color: COL_IRON, width: 0.6 });
    // Lantern body (ornate, gold)
    g.moveTo(lx - 4, ly)
      .lineTo(lx - 5, ly + 8)
      .lineTo(lx + 5, ly + 8)
      .lineTo(lx + 4, ly)
      .closePath()
      .fill({ color: COL_GOLD_DK })
      .stroke({ color: COL_GOLD, width: 0.5 });
    // Glass
    g.rect(lx - 3, ly + 1, 6, 6).fill({ color: COL_LANTERN_GLOW, alpha: pulse });
    // Glow
    g.circle(lx, ly + 4, 8).fill({ color: COL_LANTERN_GLOW, alpha: pulse * 0.1 });
    // Cap
    g.moveTo(lx - 4, ly)
      .lineTo(lx, ly - 3)
      .lineTo(lx + 4, ly)
      .fill({ color: COL_GOLD });

    // ── Incense brazier (near entrance) ──
    const bx = 100;
    const by = DH - 14;
    // Tripod base
    g.moveTo(bx - 4, by + 4).lineTo(bx - 2, by - 2).stroke({ color: COL_IRON, width: 1 });
    g.moveTo(bx + 4, by + 4).lineTo(bx + 2, by - 2).stroke({ color: COL_IRON, width: 1 });
    g.moveTo(bx, by + 4).lineTo(bx, by - 2).stroke({ color: COL_IRON, width: 1 });
    // Bowl
    g.moveTo(bx - 4, by - 2)
      .quadraticCurveTo(bx, by + 2, bx + 4, by - 2)
      .stroke({ color: COL_GOLD_DK, width: 1.5 });
    g.ellipse(bx, by - 2, 4, 1.5).fill({ color: COL_GOLD_DK });
    // Embers
    g.circle(bx, by - 2, 1).fill({ color: 0xff4400, alpha: 0.5 + Math.sin(time * 4) * 0.2 });

    // Incense smoke wisps
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.5 + i * 0.6) % 2.5;
      if (phase > 2) continue;
      const rise = phase * 8;
      const drift = Math.sin(time * 0.8 + i * 2) * 3;
      const alpha = 0.12 * (1 - phase / 2);
      g.circle(bx + drift, by - 4 - rise, 2 + phase).fill({
        color: COL_INCENSE,
        alpha,
      });
    }

    // ── Draped carpets on building wall ──
    // Carpet 1 (ruby)
    g.rect(60, 56, 10, 22).fill({ color: COL_RUBY });
    g.rect(61, 60, 8, 2).fill({ color: COL_GOLD });
    g.rect(61, 66, 8, 2).fill({ color: COL_GOLD });
    g.rect(61, 72, 8, 2).fill({ color: COL_GOLD });
    // Fringe
    for (let i = 0; i < 5; i++) {
      g.moveTo(61 + i * 2, 78).lineTo(61 + i * 2, 80).stroke({ color: COL_GOLD, width: 0.5 });
    }

    // Carpet 2 (emerald)
    g.rect(108, 56, 10, 22).fill({ color: COL_EMERALD });
    g.rect(109, 60, 8, 2).fill({ color: COL_GOLD });
    g.rect(109, 66, 8, 2).fill({ color: COL_GOLD });
    g.rect(109, 72, 8, 2).fill({ color: COL_GOLD });
    for (let i = 0; i < 5; i++) {
      g.moveTo(109 + i * 2, 78).lineTo(109 + i * 2, 80).stroke({ color: COL_GOLD, width: 0.5 });
    }

    // ── Gemstone display (small table near door) ──
    g.rect(94, DH - 22, 12, 4)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(96, DH - 26, 3, 4).fill({ color: COL_WOOD_DK });
    g.rect(103, DH - 26, 3, 4).fill({ color: COL_WOOD_DK });
    // Gems
    g.circle(96, DH - 23, 1.5).fill({ color: COL_RUBY });
    g.circle(99, DH - 23, 1.2).fill({ color: COL_EMERALD });
    g.circle(102, DH - 23, 1.5).fill({ color: COL_SAPPHIRE });
    g.circle(104, DH - 24, 1).fill({ color: COL_GOLD });

    // ── Potion bottles (on display) ──
    g.rect(96, DH - 28, 2, 4).fill({ color: 0xaaddaa, alpha: 0.5 });
    g.circle(97, DH - 28, 1.5).fill({ color: 0xaaddaa, alpha: 0.4 });
    g.rect(100, DH - 29, 2, 5).fill({ color: 0xaa88dd, alpha: 0.5 });
    g.circle(101, DH - 29, 1.5).fill({ color: 0xaa88dd, alpha: 0.4 });
  }

  // =========================================================================
  // Player banner
  // =========================================================================

  private _updateBanner(time: number): void {
    const g = this._banner;
    g.clear();

    const bx = 58;
    const by = 28;
    const wave = Math.sin(time * FLAG_SPEED) * 3;
    const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + 1) * 1.5;

    // Pole
    g.rect(bx - 1, by, 2, 14)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.circle(bx, by, 1.5).fill({ color: COL_GOLD });

    // Pennant
    g.moveTo(bx - 1, by + 2)
      .bezierCurveTo(
        bx - 10 - wave,
        by + 3 + wave2,
        bx - 14 - wave * 0.7,
        by + 7 + wave2 * 0.5,
        bx - 1,
        by + 12,
      )
      .lineTo(bx - 1, by + 10)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: this._playerColor, width: 0.3, alpha: 0.4 });

    // Dragon emblem
    g.circle(bx - 6 - wave * 0.3, by + 6 + wave2 * 0.2, 2).fill({
      color: 0xffffff,
      alpha: 0.3,
    });
  }

  // =========================================================================
  // Decorative helpers
  // =========================================================================

  private _drawColumn(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    g.rect(x, y, w, h)
      .fill({ color: COL_MARBLE_WARM })
      .stroke({ color: COL_MARBLE_DK, width: 0.5 });
    // Fluting lines
    g.moveTo(x + 1, y + 4)
      .lineTo(x + 1, y + h - 4)
      .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.3 });
    g.moveTo(x + w / 2, y + 4)
      .lineTo(x + w / 2, y + h - 4)
      .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.2 });
    g.moveTo(x + w - 1, y + 4)
      .lineTo(x + w - 1, y + h - 4)
      .stroke({ color: COL_MARBLE_DK, width: 0.3, alpha: 0.3 });
    // Ionic capital
    g.rect(x - 1, y - 2, w + 2, 3).fill({ color: COL_MARBLE_DK });
    g.circle(x, y - 1, 2).fill({ color: COL_MARBLE_DK, alpha: 0.5 });
    g.circle(x + w, y - 1, 2).fill({ color: COL_MARBLE_DK, alpha: 0.5 });
    // Base
    g.rect(x - 1, y + h - 2, w + 2, 3).fill({ color: COL_MARBLE_DK });
  }

  private _drawOrnateWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Recess
    g.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: COL_MARBLE_DK });
    g.rect(x, y, w, h).fill({ color: 0x1a1a2e });
    // Arched top
    g.ellipse(x + w / 2, y + 2, w / 2, 3).fill({ color: COL_MARBLE_DK });
    g.ellipse(x + w / 2, y + 2, w / 2 - 1, 2).fill({ color: 0x1a1a2e });
    // Mullion
    g.moveTo(x + w / 2, y + 1)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_GOLD, width: 0.8 });
    // Warm glow
    g.rect(x + 1, y + 3, w / 2 - 1, h * 0.4).fill({ color: 0x334466, alpha: 0.25 });
    // Gold frame
    g.rect(x, y, w, h).stroke({ color: COL_GOLD, width: 0.5 });
    // Sill
    g.rect(x - 1, y + h, w + 2, 2).fill({ color: COL_MARBLE_DK });
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2).fill({ color: COL_MOSS, alpha: 0.4 });
    g.circle(x + 1, y - 0.5, 1).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  // =========================================================================
  // Cleanup — not explicitly needed but good practice
  // =========================================================================
}
