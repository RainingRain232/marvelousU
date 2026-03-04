// Procedural elite barracks renderer for BuildingView.
//
// A darker, grander, more ornamented version of the BarracksRenderer.
// Draws a detailed 2x2 tile prestige barracks with:
//   - Darker stone palette with carved stone details
//   - Gold/gilt trim and ornamental iron work
//   - Larger, more imposing watchtower with extra crenellations
//   - Gold-trimmed archway with carved pillars
//   - Elite warrior training inside (bigger sword swings)
//   - Additional weapon displays (greataxe, warhammer alongside swords)
//   - More elaborate banners with gold fringe
//   - Glowing braziers instead of simple torches (orange-red glow)
//   - Stone gargoyle decorations on the tower
//   - Ornamental iron gate in the archway
//   - Gold leaf accents on the roof ridge
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const BW = 2 * TS; // 128px wide
const BH = 2 * TS; // 128px tall

// Dark stone palette (prestige / elite feel)
const COL_STONE = 0x5a584d;
const COL_STONE_LT = 0x706d62;
const COL_STONE_DK = 0x3a3830;
const COL_MORTAR = 0x4a4840;
const COL_ROOF = 0x401a1a;
const COL_ROOF_DK = 0x2a0d0d;
const COL_ROOF_LT = 0x582828;
const COL_WOOD = 0x4a3218;
const COL_WOOD_DK = 0x2d1508;
const COL_IRON = 0x484848;
const COL_IRON_DK = 0x2a2a2a;
const COL_IRON_LT = 0x606060;
const COL_WINDOW = 0x0e0e1e;
const COL_MOSS = 0x3a5a2a;
const COL_IVY = 0x2e4a22;

// Gold / gilt accents
const COL_GOLD = 0xccaa44;
const COL_GOLD_DK = 0x997722;
const COL_GOLD_LT = 0xeedd66;

// Brazier fire (richer orange-red glow)
const COL_BRAZIER = 0xff4400;
const COL_BRAZIER_CORE = 0xffaa22;
const COL_BRAZIER_DIM = 0xaa2200;
const COL_EMBER = 0xff6622;

// Character palettes
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_ARMOR = 0x667788;
const COL_ARMOR_DK = 0x4a5a6a;
const COL_CHAINMAIL = 0x8888aa;
const COL_HELMET = 0x606070;
const COL_HELMET_DK = 0x444455;
const COL_SWORD = 0xc0c8d0;
const COL_SWORD_GUARD = 0x886622;
const COL_SHIELD = 0x5a4422;
const COL_SHIELD_RIM = 0x887744;
const COL_BOOTS = 0x2a1808;
const COL_PANTS = 0x2a2a2a;

// Dummy
const COL_STRAW = 0xc9a85c;
const COL_STRAW_DK = 0xa88a40;
const COL_DUMMY_POST = 0x4a2a10;

// Animation timing
const TORCH_FLICKER = 8.0;
const GUARD_BREATHE = 2.0;
const FLAG_WAVE = 2.8;
const SOLDIER_CYCLE = 3.0;

// ---------------------------------------------------------------------------
// EliteBarracksRenderer
// ---------------------------------------------------------------------------

export class EliteBarracksRenderer {
  readonly container = new Container();

  private _base = new Graphics();       // static building structure
  private _torches = new Graphics();    // glowing braziers
  private _guard = new Graphics();      // guard on duty
  private _soldier = new Graphics();    // elite soldier training
  private _banners = new Graphics();    // waving banners with gold fringe

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBuilding();

    this.container.addChild(this._base);
    this.container.addChild(this._torches);
    this.container.addChild(this._guard);
    this.container.addChild(this._soldier);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateTorches(this._time);
    this._updateGuard(this._time);
    this._updateSoldier(this._time);
    this._updateBanners(this._time);
  }

  // == Static Building ======================================================

  private _drawBuilding(): void {
    const g = this._base;

    // Ground / cobblestones (darker, polished)
    g.rect(0, BH - 8, BW, 8).fill({ color: 0x5a554d });
    for (let cx = 4; cx < BW - 4; cx += 10) {
      g.rect(cx, BH - 7, 8, 6)
        .fill({ color: 0x4a453d })
        .stroke({ color: 0x3a352d, width: 0.3 });
    }
    // Gold inlay strips between cobbles near entrance
    g.rect(33, BH - 7, 32, 0.8).fill({ color: COL_GOLD_DK, alpha: 0.4 });

    // === Main wall structure ===
    const wallY = 32;
    const wallH = BH - wallY - 10;

    // Back wall (full width) -- darker stone
    g.rect(4, wallY, BW - 8, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Left wall shadow
    g.rect(5, wallY + 1, 4, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.2 });

    // Brick pattern on main wall
    this._drawBrickPattern(g, 6, wallY + 2, BW - 12, wallH - 4);
    this._drawStoneVariation(g, 8, wallY + 6, BW - 16, wallH - 12);

    // Carved stone band across main wall (elite detail)
    g.rect(4, wallY + 46, BW - 8, 3).fill({ color: COL_STONE_DK });
    g.rect(4, wallY + 47, BW - 8, 1).fill({ color: COL_GOLD_DK, alpha: 0.35 });

    // === Watchtower (right side) -- taller, more imposing ===
    const towerW = 30;
    const towerH = BH - 8;
    const towerX = BW - towerW - 2;
    const towerY = 6;

    g.rect(towerX, towerY, towerW, towerH)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1.5 });
    g.rect(towerX + 1, towerY + 1, 4, towerH - 2).fill({ color: COL_STONE_DK, alpha: 0.2 });
    this._drawBrickPattern(g, towerX + 2, towerY + 2, towerW - 4, towerH - 4);
    this._drawStoneVariation(g, towerX + 4, towerY + 8, towerW - 8, towerH - 16);

    // Tower roof -- pointed, taller
    g.moveTo(towerX - 4, towerY)
      .lineTo(towerX + towerW / 2, towerY - 26)
      .lineTo(towerX + towerW + 4, towerY)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(towerX + towerW / 2, towerY - 26)
      .lineTo(towerX + towerW + 4, towerY)
      .lineTo(towerX + towerW / 2 + 1, towerY - 25)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.3 });
    // Roof tile lines
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = towerY - 26 + frac * 26;
      const halfW = (towerW / 2 + 4) * frac;
      g.moveTo(towerX + towerW / 2 - halfW, ly)
        .lineTo(towerX + towerW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }
    // Gold leaf ridge line on tower roof
    g.moveTo(towerX + towerW / 2, towerY - 26)
      .lineTo(towerX + towerW + 4, towerY)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.6 });
    g.moveTo(towerX + towerW / 2, towerY - 26)
      .lineTo(towerX - 4, towerY)
      .stroke({ color: COL_GOLD_DK, width: 0.8, alpha: 0.4 });

    // Ornate finial (gold, larger)
    g.circle(towerX + towerW / 2, towerY - 26, 3).fill({ color: COL_GOLD });
    g.circle(towerX + towerW / 2, towerY - 26, 2).fill({ color: COL_GOLD_LT });
    // Spike on top of finial
    g.moveTo(towerX + towerW / 2, towerY - 32)
      .lineTo(towerX + towerW / 2 - 1.5, towerY - 27)
      .lineTo(towerX + towerW / 2 + 1.5, towerY - 27)
      .closePath()
      .fill({ color: COL_GOLD });

    // Tower crenellations (extra merlons for elite look)
    this._drawCrenellations(g, towerX, towerY, towerW);

    // Gold trim on crenellations
    const merlonW = 6, gap = 4, step = merlonW + gap;
    for (let mx = towerX + 2; mx < towerX + towerW - merlonW; mx += step) {
      g.rect(mx, towerY - 6, merlonW, 0.8).fill({ color: COL_GOLD, alpha: 0.5 });
    }

    // Tower window -- arched, with gold frame
    const twx = towerX + towerW / 2 - 5;
    const twy = towerY + 26;
    g.rect(twx - 3, twy - 3, 16, 20).fill({ color: COL_STONE_DK });
    g.rect(twx - 2, twy - 2, 14, 18).fill({ color: COL_GOLD_DK, alpha: 0.4 }); // gold frame accent
    g.rect(twx, twy, 10, 14).fill({ color: COL_WINDOW });
    g.ellipse(twx + 5, twy + 1, 5, 4).fill({ color: COL_STONE_DK });
    g.ellipse(twx + 5, twy + 1, 4, 3).fill({ color: COL_WINDOW });
    // Ornate mullion (cross pattern)
    g.moveTo(twx + 5, twy).lineTo(twx + 5, twy + 14)
      .stroke({ color: COL_IRON, width: 1 });
    g.moveTo(twx, twy + 7).lineTo(twx + 10, twy + 7)
      .stroke({ color: COL_IRON, width: 0.8 });
    // Sill with gold accent
    g.rect(twx - 2, twy + 15, 14, 2).fill({ color: COL_STONE_LT });
    g.rect(twx - 2, twy + 16, 14, 0.8).fill({ color: COL_GOLD_DK, alpha: 0.3 });

    // Arrow slits on tower
    this._drawArrowSlit(g, towerX + 7, towerY + 52);
    this._drawArrowSlit(g, towerX + 17, towerY + 66);
    this._drawArrowSlit(g, towerX + 7, towerY + 78);

    // === Stone gargoyles on tower ===
    this._drawGargoyle(g, towerX - 4, towerY + 18, false);
    this._drawGargoyle(g, towerX + towerW + 2, towerY + 18, true);

    // Decorative stone band on tower (double band for elite)
    g.rect(towerX - 1, towerY + 46, towerW + 2, 3).fill({ color: COL_STONE_DK });
    g.rect(towerX - 1, towerY + 47, towerW + 2, 1).fill({ color: COL_GOLD_DK, alpha: 0.3 });
    g.rect(towerX - 1, towerY + 62, towerW + 2, 2).fill({ color: COL_STONE_DK });

    // === Main building roof ===
    g.moveTo(0, wallY + 2)
      .lineTo(48, wallY - 22)
      .lineTo(towerX - 2, wallY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(48, wallY - 22)
      .lineTo(towerX - 2, wallY + 2)
      .lineTo(49, wallY - 21)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });
    // Roof tile lines
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const ly = wallY - 22 + frac * 24;
      const leftX = 48 - 48 * frac;
      const rightX = 48 + (towerX - 50) * frac;
      g.moveTo(leftX, ly).lineTo(rightX, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }
    // Gold leaf ridge on main roof
    g.moveTo(48, wallY - 22).lineTo(towerX - 2, wallY + 2)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.5 });
    g.moveTo(48, wallY - 22).lineTo(0, wallY + 2)
      .stroke({ color: COL_GOLD_DK, width: 0.8, alpha: 0.35 });
    // Main roof finial
    g.circle(48, wallY - 22, 2.5).fill({ color: COL_GOLD });
    g.circle(48, wallY - 22, 1.5).fill({ color: COL_GOLD_LT });

    // Support beam under roof (darker, with gold trim)
    g.rect(2, wallY - 1, towerX - 4, 4).fill({ color: COL_WOOD_DK });
    g.rect(2, wallY - 1, towerX - 4, 2).fill({ color: COL_WOOD });
    g.rect(2, wallY + 2, towerX - 4, 0.8).fill({ color: COL_GOLD_DK, alpha: 0.3 });

    // Wall crenellations
    this._drawCrenellations(g, 4, wallY, towerX - 6);

    // === Arched entrance (center of main wall) -- gold-trimmed with carved pillars ===
    const archW = 32;
    const archH = 50;
    const archX = 33;
    const archY = BH - archH - 10;

    // Carved pillar left
    g.rect(archX - 6, archY + 6, 5, archH - 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    // Pillar fluting (carved lines)
    for (let fy = archY + 10; fy < archY + archH - 2; fy += 4) {
      g.moveTo(archX - 5, fy).lineTo(archX - 2, fy)
        .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.5 });
    }
    // Pillar capital (top ornament)
    g.rect(archX - 8, archY + 4, 9, 3).fill({ color: COL_STONE_LT });
    g.rect(archX - 8, archY + 4, 9, 1).fill({ color: COL_GOLD_DK, alpha: 0.4 });
    // Pillar base
    g.rect(archX - 8, BH - 12, 9, 3).fill({ color: COL_STONE_LT });

    // Carved pillar right
    g.rect(archX + archW + 1, archY + 6, 5, archH - 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    for (let fy = archY + 10; fy < archY + archH - 2; fy += 4) {
      g.moveTo(archX + archW + 2, fy).lineTo(archX + archW + 5, fy)
        .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.5 });
    }
    g.rect(archX + archW - 1, archY + 4, 9, 3).fill({ color: COL_STONE_LT });
    g.rect(archX + archW - 1, archY + 4, 9, 1).fill({ color: COL_GOLD_DK, alpha: 0.4 });
    g.rect(archX + archW - 1, BH - 12, 9, 3).fill({ color: COL_STONE_LT });

    // Arch stone frame
    g.rect(archX - 3, archY + 10, archW + 6, archH - 8)
      .fill({ color: COL_STONE_DK });
    // Arch top
    g.ellipse(archX + archW / 2, archY + 12, archW / 2 + 3, 15)
      .fill({ color: COL_STONE_DK });

    // Gold trim around arch
    g.rect(archX - 3, archY + 10, archW + 6, 1.2).fill({ color: COL_GOLD, alpha: 0.5 });

    // Interior darkness
    g.rect(archX, archY + 12, archW, archH - 10).fill({ color: 0x100d08 });
    g.ellipse(archX + archW / 2, archY + 12, archW / 2, 13).fill({ color: 0x100d08 });

    // Voussoir stones around arch
    for (let va = -0.9; va <= 0.9; va += 0.3) {
      const vx = archX + archW / 2 + Math.sin(va) * (archW / 2 + 1);
      const vy = archY + 12 - Math.cos(va) * 14;
      g.circle(vx, vy, 1.8).fill({ color: COL_STONE_LT, alpha: 0.5 });
    }
    // Gold accent line on voussoirs
    for (let va = -0.85; va <= 0.85; va += 0.25) {
      const vx = archX + archW / 2 + Math.sin(va) * (archW / 2 - 1);
      const vy = archY + 12 - Math.cos(va) * 12;
      g.circle(vx, vy, 0.8).fill({ color: COL_GOLD, alpha: 0.4 });
    }
    // Keystone (larger, gold-accented)
    g.moveTo(archX + archW / 2 - 4, archY + 2)
      .lineTo(archX + archW / 2, archY - 5)
      .lineTo(archX + archW / 2 + 4, archY + 2)
      .closePath()
      .fill({ color: COL_STONE_LT });
    g.moveTo(archX + archW / 2 - 2, archY)
      .lineTo(archX + archW / 2, archY - 3)
      .lineTo(archX + archW / 2 + 2, archY)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.5 });

    // === Ornamental iron gate in the archway ===
    // Vertical bars
    for (let bx = archX + 3; bx < archX + archW - 2; bx += 5) {
      g.moveTo(bx, archY + 14).lineTo(bx, BH - 12)
        .stroke({ color: COL_IRON_DK, width: 1, alpha: 0.5 });
    }
    // Horizontal cross-bars
    g.moveTo(archX + 1, archY + 28).lineTo(archX + archW - 1, archY + 28)
      .stroke({ color: COL_IRON, width: 1, alpha: 0.4 });
    g.moveTo(archX + 1, archY + 42).lineTo(archX + archW - 1, archY + 42)
      .stroke({ color: COL_IRON, width: 1, alpha: 0.4 });
    // Ornamental scroll at top of gate
    g.ellipse(archX + archW / 2, archY + 20, 6, 4)
      .stroke({ color: COL_IRON_LT, width: 0.8, alpha: 0.5 });
    g.circle(archX + archW / 2, archY + 20, 1.5).fill({ color: COL_GOLD, alpha: 0.5 });

    // Wooden lintel / beam above arch (darker, gold-studded)
    g.rect(archX - 8, archY - 7, archW + 16, 5).fill({ color: COL_WOOD_DK });
    g.rect(archX - 8, archY - 7, archW + 16, 2).fill({ color: COL_WOOD });
    // Gold studs on lintel
    for (let sx = archX - 5; sx < archX + archW + 5; sx += 6) {
      g.circle(sx, archY - 4, 1.2).fill({ color: COL_GOLD });
    }

    // === Training dummy (visible inside arch, behind gate) ===
    const dx = archX + 10;
    const dy = archY + 24;

    // Post
    g.rect(dx + 2, dy, 3, 30).fill({ color: COL_DUMMY_POST });
    // Cross-beam (wider for elite training)
    g.rect(dx - 8, dy + 6, 24, 3).fill({ color: COL_DUMMY_POST });
    // Straw body (larger)
    g.ellipse(dx + 3, dy + 10, 7, 9).fill({ color: COL_STRAW });
    g.ellipse(dx + 3, dy + 10, 6, 8)
      .stroke({ color: COL_STRAW_DK, width: 0.5 });
    // Straw head
    g.circle(dx + 3, dy + 1, 4.5).fill({ color: COL_STRAW });
    g.circle(dx + 3, dy + 1, 3.5).stroke({ color: COL_STRAW_DK, width: 0.5 });
    // Target painted on body (larger, with gold ring)
    g.circle(dx + 3, dy + 10, 4).stroke({ color: 0xcc3333, width: 1 });
    g.circle(dx + 3, dy + 10, 2).stroke({ color: COL_GOLD_DK, width: 0.8 });
    g.circle(dx + 3, dy + 10, 1).fill({ color: 0xcc3333 });

    // === Arrow slits on main wall ===
    this._drawArrowSlit(g, 12, wallY + 22);
    this._drawArrowSlit(g, 12, wallY + 44);
    this._drawArrowSlit(g, 74, wallY + 30);

    // === Weapon rack on left wall (outside) -- expanded with more weapons ===
    const rackX = 6;
    const rackY = wallY + 54;

    // Rack frame (sturdier)
    g.rect(rackX, rackY, 22, 3).fill({ color: COL_WOOD_DK });
    g.rect(rackX, rackY + 24, 22, 3).fill({ color: COL_WOOD_DK });
    g.rect(rackX, rackY, 3, 27).fill({ color: COL_WOOD });
    g.rect(rackX + 19, rackY, 3, 27).fill({ color: COL_WOOD });
    // Middle support
    g.rect(rackX + 10, rackY, 2, 27).fill({ color: COL_WOOD_DK, alpha: 0.6 });

    // Sword #1
    g.rect(rackX + 3, rackY - 8, 2, 14).fill({ color: COL_SWORD });
    g.rect(rackX + 2, rackY + 4, 4, 2).fill({ color: COL_SWORD_GUARD });

    // Sword #2
    g.rect(rackX + 7, rackY - 6, 2, 12).fill({ color: COL_SWORD });
    g.rect(rackX + 6, rackY + 4, 4, 2).fill({ color: COL_SWORD_GUARD });

    // Greataxe
    g.rect(rackX + 12, rackY - 10, 2, 18).fill({ color: COL_WOOD_DK }); // shaft
    // Axe head (double-bit)
    g.moveTo(rackX + 11, rackY - 8)
      .lineTo(rackX + 8, rackY - 5)
      .lineTo(rackX + 11, rackY - 2)
      .closePath()
      .fill({ color: COL_IRON });
    g.moveTo(rackX + 15, rackY - 8)
      .lineTo(rackX + 18, rackY - 5)
      .lineTo(rackX + 15, rackY - 2)
      .closePath()
      .fill({ color: COL_IRON });
    // Axe edge highlights
    g.moveTo(rackX + 8, rackY - 5).lineTo(rackX + 11, rackY - 8)
      .stroke({ color: COL_IRON_LT, width: 0.5 });
    g.moveTo(rackX + 18, rackY - 5).lineTo(rackX + 15, rackY - 8)
      .stroke({ color: COL_IRON_LT, width: 0.5 });

    // Warhammer
    g.rect(rackX + 17, rackY - 6, 2, 14).fill({ color: COL_WOOD_DK }); // shaft
    // Hammer head
    g.rect(rackX + 15, rackY - 8, 6, 4)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Spike on back of hammer
    g.moveTo(rackX + 15, rackY - 7)
      .lineTo(rackX + 13, rackY - 6)
      .lineTo(rackX + 15, rackY - 5)
      .closePath()
      .fill({ color: COL_IRON });

    // Shield below rack (larger, more ornate)
    g.ellipse(rackX + 11, rackY + 34, 8, 9)
      .fill({ color: COL_SHIELD })
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    g.moveTo(rackX + 11, rackY + 27)
      .lineTo(rackX + 11, rackY + 41)
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    g.moveTo(rackX + 4, rackY + 34)
      .lineTo(rackX + 18, rackY + 34)
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    // Shield emblem (player color, with gold rim)
    g.circle(rackX + 11, rackY + 34, 4).stroke({ color: COL_GOLD_DK, width: 0.8 });
    g.circle(rackX + 11, rackY + 34, 3).fill({ color: this._playerColor, alpha: 0.7 });

    // === Brazier mounts (instead of simple torch brackets) ===
    // Left brazier mount
    g.rect(archX - 12, archY + 6, 5, 14).fill({ color: COL_IRON_DK });
    g.rect(archX - 14, archY + 4, 9, 3).fill({ color: COL_IRON });
    // Brazier bowl left
    g.moveTo(archX - 15, archY + 2)
      .lineTo(archX - 14, archY - 2)
      .lineTo(archX - 6, archY - 2)
      .lineTo(archX - 5, archY + 2)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Gold trim on brazier
    g.rect(archX - 14, archY - 2, 8, 0.8).fill({ color: COL_GOLD, alpha: 0.4 });

    // Right brazier mount
    g.rect(archX + archW + 7, archY + 6, 5, 14).fill({ color: COL_IRON_DK });
    g.rect(archX + archW + 5, archY + 4, 9, 3).fill({ color: COL_IRON });
    // Brazier bowl right
    g.moveTo(archX + archW + 4, archY + 2)
      .lineTo(archX + archW + 5, archY - 2)
      .lineTo(archX + archW + 13, archY - 2)
      .lineTo(archX + archW + 14, archY + 2)
      .closePath()
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.rect(archX + archW + 5, archY - 2, 8, 0.8).fill({ color: COL_GOLD, alpha: 0.4 });

    // === Moss patches (subtler on elite building) ===
    this._drawMoss(g, 6, BH - 14, 8);
    this._drawMoss(g, towerX + 2, BH - 12, 6);
    this._drawMoss(g, towerX + 6, towerY + towerH - 8, 5);

    // === Ivy vines (less overgrown, more maintained) ===
    this._drawIvy(g, 6, wallY + 14, wallH - 20);
    this._drawIvy(g, towerX + 2, towerY + 44, 40);

    // === Doorstep / threshold (grander, with gold inlay) ===
    g.rect(archX - 6, BH - 10, archW + 12, 3).fill({ color: COL_STONE_LT });
    g.rect(archX - 6, BH - 10, archW + 12, 1).fill({ color: COL_STONE_DK, alpha: 0.3 });
    g.rect(archX - 4, BH - 9, archW + 8, 0.8).fill({ color: COL_GOLD_DK, alpha: 0.3 });

    // === Carved stone detail above entrance ===
    // Small skull / emblem above keystone
    g.circle(archX + archW / 2, archY - 10, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Eyes of emblem
    g.circle(archX + archW / 2 - 1, archY - 10.5, 0.6).fill({ color: COL_STONE_DK });
    g.circle(archX + archW / 2 + 1, archY - 10.5, 0.6).fill({ color: COL_STONE_DK });
    // Crossed swords emblem behind skull
    g.moveTo(archX + archW / 2 - 6, archY - 14)
      .lineTo(archX + archW / 2 + 6, archY - 6)
      .stroke({ color: COL_IRON_LT, width: 1 });
    g.moveTo(archX + archW / 2 + 6, archY - 14)
      .lineTo(archX + archW / 2 - 6, archY - 6)
      .stroke({ color: COL_IRON_LT, width: 1 });
  }

  // == Brick / Stone helpers ================================================

  private _drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 12;
      // Horizontal mortar
      g.moveTo(x, y + row).lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      // Vertical mortar joints
      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row).lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.35 });
      }
      // Stone face shading
      for (let col = offset; col < w - 8; col += 24) {
        g.moveTo(x + col + 1, y + row + 1).lineTo(x + col + 22, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.14 });
        g.moveTo(x + col + 1, y + row + 7).lineTo(x + col + 22, y + row + 7)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.2 });
      }
    }
  }

  private _drawStoneVariation(g: Graphics, x: number, y: number, w: number, h: number): void {
    const light = [[0.1, 0.15], [0.6, 0.3], [0.3, 0.7], [0.8, 0.5], [0.5, 0.9]];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_LT, alpha: 0.2 });
    }
    const dark = [[0.3, 0.1], [0.7, 0.6], [0.15, 0.5], [0.55, 0.8], [0.85, 0.2]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_DK, alpha: 0.22 });
    }
  }

  private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
    const merlonW = 6, merlonH = 7, gap = 4, step = merlonW + gap;
    for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Cap stone (darker)
      g.rect(mx - 0.5, y - merlonH - 1.5, merlonW + 1, 2).fill({ color: COL_STONE_DK });
    }
  }

  private _drawArrowSlit(g: Graphics, x: number, y: number): void {
    g.rect(x, y - 1, 4, 14).fill({ color: COL_STONE_DK });
    g.rect(x + 1, y, 2, 12).fill({ color: COL_WINDOW });
    g.rect(x - 1, y + 4, 6, 2).fill({ color: COL_WINDOW });
    g.rect(x, y - 1, 4, 14).stroke({ color: COL_STONE_DK, width: 0.4 });
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    for (let i = 0; i < w; i += 3) {
      const h = 2 + (i * 7 + x) % 3;
      g.rect(x + i, y - h, 2, h).fill({ color: COL_MOSS, alpha: 0.4 + (i % 2) * 0.15 });
    }
  }

  private _drawIvy(g: Graphics, x: number, startY: number, length: number): void {
    let cy = startY;
    let cx = x;
    for (let i = 0; i < length; i += 4) {
      cx += ((i * 3 + x) % 5) - 2;
      cy += 4;
      if (cy > startY + length) break;
      g.circle(cx, cy, 1.5).fill({ color: COL_IVY, alpha: 0.5 });
      if (i % 8 === 0) {
        g.circle(cx + 2, cy - 1, 2).fill({ color: COL_IVY, alpha: 0.35 });
      }
    }
  }

  private _drawGargoyle(g: Graphics, x: number, y: number, flipped: boolean): void {
    const dir = flipped ? -1 : 1;
    // Body / perch
    g.rect(x, y, 4 * dir, 4)
      .fill({ color: COL_STONE_DK });
    // Head / snout (protruding)
    g.moveTo(x + 4 * dir, y)
      .lineTo(x + 9 * dir, y + 1)
      .lineTo(x + 8 * dir, y + 4)
      .lineTo(x + 4 * dir, y + 4)
      .closePath()
      .fill({ color: COL_STONE });
    // Jaw
    g.moveTo(x + 5 * dir, y + 4)
      .lineTo(x + 8 * dir, y + 5)
      .lineTo(x + 5 * dir, y + 6)
      .closePath()
      .fill({ color: COL_STONE_DK });
    // Eye
    g.circle(x + 6 * dir, y + 1.5, 0.8).fill({ color: 0xaa2200, alpha: 0.6 });
    // Wing stub
    g.moveTo(x + 2 * dir, y)
      .lineTo(x + 4 * dir, y - 3)
      .lineTo(x + 6 * dir, y)
      .closePath()
      .fill({ color: COL_STONE, alpha: 0.7 });
  }

  // == Braziers / Torches (animated) ========================================

  private _updateTorches(time: number): void {
    const g = this._torches;
    g.clear();

    const flicker1 = Math.sin(time * TORCH_FLICKER) * 2 + Math.sin(time * 11) * 1;
    const flicker2 = Math.sin(time * TORCH_FLICKER + 1.5) * 2 + Math.cos(time * 9) * 1;

    // Left brazier glow
    this._drawBrazier(g, 24, 60, flicker1, time);
    // Right brazier glow
    this._drawBrazier(g, 75, 60, flicker2, time);
  }

  private _drawBrazier(g: Graphics, x: number, y: number, flicker: number, time: number): void {
    // Wide ambient glow (bigger than a torch)
    g.circle(x, y - 6, 14 + flicker * 0.5).fill({ color: COL_BRAZIER, alpha: 0.05 });
    g.circle(x, y - 6, 10 + flicker * 0.4).fill({ color: COL_BRAZIER, alpha: 0.08 });

    // Embers (scattered sparks)
    const spark1 = Math.sin(time * 6 + x) * 3;
    const spark2 = Math.cos(time * 7.5 + x) * 2;
    g.circle(x + spark1, y - 10 - Math.abs(flicker), 0.8)
      .fill({ color: COL_EMBER, alpha: 0.6 });
    g.circle(x - spark2, y - 12 - Math.abs(flicker) * 0.5, 0.6)
      .fill({ color: COL_GOLD_LT, alpha: 0.5 });

    // Outer flames (wider, more intense than a torch)
    g.ellipse(x - 2, y - 6 - flicker * 0.2, 3 + flicker * 0.2, 5 + flicker * 0.4)
      .fill({ color: COL_BRAZIER_DIM, alpha: 0.65 });
    g.ellipse(x + 2, y - 7 - flicker * 0.3, 3 + flicker * 0.3, 6 + flicker * 0.5)
      .fill({ color: COL_BRAZIER_DIM, alpha: 0.6 });

    // Main flame
    g.ellipse(x, y - 6, 3.5, 5 + flicker * 0.4).fill({ color: COL_BRAZIER });

    // Inner flame
    g.ellipse(x, y - 5, 2, 3 + flicker * 0.3).fill({ color: COL_EMBER });

    // Core (bright hot)
    g.ellipse(x, y - 4, 1.2, 2).fill({ color: COL_BRAZIER_CORE });
  }

  // == Guard (right side, on duty) ==========================================

  private _updateGuard(time: number): void {
    const g = this._guard;
    g.clear();

    const gx = BW - 20;
    const gy = BH - 16;
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.6;

    // Halberd (behind guard -- elite weapon)
    g.moveTo(gx + 10, gy + 6)
      .lineTo(gx + 10, gy - 42)
      .stroke({ color: COL_WOOD_DK, width: 2 });
    // Halberd head (axe + spear)
    g.moveTo(gx + 10, gy - 46)
      .lineTo(gx + 7, gy - 40)
      .lineTo(gx + 13, gy - 40)
      .closePath()
      .fill({ color: COL_SWORD });
    // Axe blade on halberd
    g.moveTo(gx + 13, gy - 42)
      .lineTo(gx + 18, gy - 38)
      .lineTo(gx + 13, gy - 36)
      .closePath()
      .fill({ color: COL_IRON });

    // Legs
    g.rect(gx - 2, gy + breathe, 3, 7).fill({ color: COL_PANTS });
    g.rect(gx + 2, gy + breathe, 3, 7).fill({ color: COL_PANTS });
    // Boots (darker)
    g.rect(gx - 3, gy + 6 + breathe, 4, 3).fill({ color: COL_BOOTS });
    g.rect(gx + 1, gy + 6 + breathe, 4, 3).fill({ color: COL_BOOTS });

    // Body (heavier plate armor)
    g.rect(gx - 4, gy - 16 + breathe, 10, 16)
      .fill({ color: COL_ARMOR })
      .stroke({ color: COL_ARMOR_DK, width: 0.5 });
    // Chainmail texture
    for (let row = 0; row < 3; row++) {
      g.moveTo(gx - 3, gy - 14 + row * 5 + breathe)
        .lineTo(gx + 5, gy - 14 + row * 5 + breathe)
        .stroke({ color: COL_CHAINMAIL, width: 0.4, alpha: 0.4 });
    }
    // Shoulder pauldrons
    g.ellipse(gx - 5, gy - 14 + breathe, 3, 4)
      .fill({ color: COL_ARMOR_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.ellipse(gx + 7, gy - 14 + breathe, 3, 4)
      .fill({ color: COL_ARMOR_DK })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Gold trim on pauldrons
    g.ellipse(gx - 5, gy - 14 + breathe, 3, 4)
      .stroke({ color: COL_GOLD_DK, width: 0.5, alpha: 0.4 });
    g.ellipse(gx + 7, gy - 14 + breathe, 3, 4)
      .stroke({ color: COL_GOLD_DK, width: 0.5, alpha: 0.4 });

    // Belt with gold buckle
    g.rect(gx - 5, gy - 5 + breathe, 12, 2).fill({ color: COL_WOOD_DK });
    g.circle(gx + 1, gy - 4 + breathe, 1.2).fill({ color: COL_GOLD });

    // Shield arm (left) -- larger shield
    g.ellipse(gx - 7, gy - 5 + breathe, 6, 8)
      .fill({ color: COL_SHIELD })
      .stroke({ color: COL_SHIELD_RIM, width: 0.8 });
    g.ellipse(gx - 7, gy - 5 + breathe, 6, 8)
      .stroke({ color: COL_GOLD_DK, width: 0.6, alpha: 0.4 });
    g.circle(gx - 7, gy - 5 + breathe, 2.5).fill({ color: this._playerColor, alpha: 0.6 });

    // Right arm (holding halberd)
    g.rect(gx + 4, gy - 14 + breathe, 4, 10).fill({ color: COL_ARMOR });
    g.rect(gx + 5, gy - 6 + breathe, 3, 4).fill({ color: COL_SKIN_DK });

    // Head
    g.circle(gx + 1, gy - 20 + breathe, 4.5).fill({ color: COL_SKIN });

    // Helmet (grander, with plume)
    g.rect(gx - 5, gy - 26 + breathe, 12, 7)
      .fill({ color: COL_HELMET })
      .stroke({ color: COL_HELMET_DK, width: 0.5 });
    // Helmet rim
    g.rect(gx - 6, gy - 20 + breathe, 14, 2).fill({ color: COL_HELMET_DK });
    // Nose guard
    g.rect(gx, gy - 20 + breathe, 2, 4).fill({ color: COL_HELMET_DK });
    // Gold trim on helmet
    g.rect(gx - 5, gy - 26 + breathe, 12, 1).fill({ color: COL_GOLD_DK, alpha: 0.5 });
    // Plume on helmet (player color)
    g.moveTo(gx + 1, gy - 26 + breathe)
      .bezierCurveTo(
        gx - 4, gy - 34 + breathe,
        gx + 8, gy - 36 + breathe,
        gx + 10, gy - 28 + breathe
      )
      .stroke({ color: this._playerColor, width: 2.5 });
    g.moveTo(gx + 1, gy - 26 + breathe)
      .bezierCurveTo(
        gx - 3, gy - 33 + breathe,
        gx + 7, gy - 35 + breathe,
        gx + 9, gy - 28 + breathe
      )
      .stroke({ color: this._playerColor, width: 1.5, alpha: 0.6 });

    // Eyes (peeking under helmet)
    g.circle(gx - 1, gy - 19 + breathe, 0.7).fill({ color: 0x222222 });
    g.circle(gx + 3, gy - 19 + breathe, 0.7).fill({ color: 0x222222 });
  }

  // == Elite Soldier training (inside archway) ==============================

  private _updateSoldier(time: number): void {
    const g = this._soldier;
    g.clear();

    const sx = 53;
    const sy = BH - 30;
    const cycle = (time * SOLDIER_CYCLE) % 1;

    // Bigger swing animation for elite warrior
    let swordAngle: number;
    let bodyLean: number;
    if (cycle < 0.25) {
      // Wind up (deeper)
      const t = cycle / 0.25;
      swordAngle = -0.3 - t * 1.6;
      bodyLean = -t * 2;
    } else if (cycle < 0.45) {
      // Strike (faster, more powerful)
      const t = (cycle - 0.25) / 0.2;
      swordAngle = -1.9 + t * 2.8;
      bodyLean = -2 + t * 2.8;
    } else {
      // Recovery
      const t = (cycle - 0.45) / 0.55;
      swordAngle = 0.9 - t * 1.2;
      bodyLean = 0.8 - t * 0.8;
    }

    // Legs (wider stance)
    g.rect(sx - 3, sy + 4, 3, 6).fill({ color: COL_PANTS });
    g.rect(sx + 3, sy + 4, 3, 6).fill({ color: COL_PANTS });
    g.rect(sx - 4, sy + 9, 4, 2).fill({ color: COL_BOOTS });
    g.rect(sx + 2, sy + 9, 4, 2).fill({ color: COL_BOOTS });

    // Body (heavier armor)
    g.rect(sx - 4 + bodyLean, sy - 10, 10, 14)
      .fill({ color: COL_ARMOR_DK })
      .stroke({ color: COL_ARMOR_DK, width: 0.3 });
    // Gold trim on chest
    g.rect(sx - 3 + bodyLean, sy - 9, 8, 1).fill({ color: COL_GOLD_DK, alpha: 0.4 });

    // Sword arm + greatsword (bigger blade)
    const armX = sx + 5 + bodyLean;
    const armY = sy - 6;
    const swordLen = 18; // longer blade for elite
    const swordEndX = armX + Math.cos(swordAngle) * swordLen;
    const swordEndY = armY + Math.sin(swordAngle) * swordLen;

    // Arm
    g.moveTo(armX, armY)
      .lineTo(armX + Math.cos(swordAngle) * 4, armY + Math.sin(swordAngle) * 4)
      .stroke({ color: COL_SKIN, width: 2.5 });
    // Sword blade (wider for greatsword)
    g.moveTo(armX + Math.cos(swordAngle) * 3, armY + Math.sin(swordAngle) * 3)
      .lineTo(swordEndX, swordEndY)
      .stroke({ color: COL_SWORD, width: 2.2 });
    // Blade gleam
    g.moveTo(armX + Math.cos(swordAngle) * 6, armY + Math.sin(swordAngle) * 6)
      .lineTo(armX + Math.cos(swordAngle) * 12, armY + Math.sin(swordAngle) * 12)
      .stroke({ color: 0xffffff, width: 0.6, alpha: 0.3 });
    // Guard (larger cross-guard)
    const guardX = armX + Math.cos(swordAngle) * 3;
    const guardY = armY + Math.sin(swordAngle) * 3;
    g.moveTo(guardX - Math.sin(swordAngle) * 3, guardY + Math.cos(swordAngle) * 3)
      .lineTo(guardX + Math.sin(swordAngle) * 3, guardY - Math.cos(swordAngle) * 3)
      .stroke({ color: COL_GOLD_DK, width: 2.5 });

    // Head
    g.circle(sx + 1 + bodyLean * 0.5, sy - 14, 4).fill({ color: COL_SKIN });
    // Heavier helmet
    g.rect(sx - 4 + bodyLean * 0.5, sy - 19, 10, 6).fill({ color: COL_HELMET });
    g.rect(sx - 5 + bodyLean * 0.5, sy - 14, 12, 1.5).fill({ color: COL_HELMET_DK });
    // Gold trim on helmet
    g.rect(sx - 4 + bodyLean * 0.5, sy - 19, 10, 0.8).fill({ color: COL_GOLD_DK, alpha: 0.4 });
  }

  // == Banners (animated, with gold fringe) =================================

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Tower top banner (flag pole) -- larger flag
    const flagX = BW - 17;
    const flagY = 6 - 26 - 4;

    // Pole (gold-tipped)
    g.moveTo(flagX, flagY + 4).lineTo(flagX, flagY - 16)
      .stroke({ color: 0x555555, width: 2 });
    g.circle(flagX, flagY - 16, 1.5).fill({ color: COL_GOLD });

    // Waving flag (larger)
    const w1 = Math.sin(time * FLAG_WAVE) * 2;
    const w2 = Math.sin(time * FLAG_WAVE * 1.3 + 1) * 3;
    const w3 = Math.sin(time * FLAG_WAVE * 0.9 + 2) * 2;
    g.moveTo(flagX, flagY - 16)
      .bezierCurveTo(flagX + 8, flagY - 16 + w1, flagX + 14, flagY - 16 + w2, flagX + 22, flagY - 16 + w3)
      .lineTo(flagX + 22, flagY - 3 + w3)
      .bezierCurveTo(flagX + 14, flagY - 3 + w2, flagX + 8, flagY - 3 + w1, flagX, flagY - 3)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: COL_STONE_DK, width: 0.5, alpha: 0.3 });
    // Gold fringe on flag bottom edge
    g.moveTo(flagX, flagY - 3)
      .bezierCurveTo(flagX + 8, flagY - 3 + w1, flagX + 14, flagY - 3 + w2, flagX + 22, flagY - 3 + w3)
      .stroke({ color: COL_GOLD, width: 1.5, alpha: 0.7 });
    // Gold fringe on flag top edge
    g.moveTo(flagX, flagY - 16)
      .bezierCurveTo(flagX + 8, flagY - 16 + w1, flagX + 14, flagY - 16 + w2, flagX + 22, flagY - 16 + w3)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.5 });

    // Small pennant on left wall (with gold fringe)
    const pennX = 14;
    const pennY = 26;
    const pw = Math.sin(time * FLAG_WAVE + 0.8) * 2;

    g.rect(pennX, pennY, 2, 16).fill({ color: COL_WOOD });
    g.circle(pennX + 1, pennY, 1).fill({ color: COL_GOLD }); // gold finial
    g.moveTo(pennX + 2, pennY + 1)
      .bezierCurveTo(pennX + 9 + pw, pennY + 3, pennX + 12 + pw, pennY + 8, pennX + 2, pennY + 15)
      .closePath()
      .fill({ color: this._playerColor, alpha: 0.9 });
    // Gold fringe
    g.moveTo(pennX + 2, pennY + 15)
      .bezierCurveTo(pennX + 12 + pw, pennY + 8, pennX + 9 + pw, pennY + 3, pennX + 2, pennY + 1)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.5 });

    // Wall-mounted banner beside entrance (with gold fringe)
    const bx = 70;
    const by = 38;
    const bw = Math.sin(time * FLAG_WAVE + 1.5) * 1.5;

    g.rect(bx, by, 2, 18).fill({ color: COL_WOOD });
    g.circle(bx + 1, by, 1).fill({ color: COL_GOLD }); // gold finial
    g.moveTo(bx + 2, by + 2)
      .bezierCurveTo(bx + 8 + bw, by + 4, bx + 10 + bw, by + 11, bx + 2, by + 16)
      .closePath()
      .fill({ color: this._playerColor, alpha: 0.85 });
    // Gold fringe
    g.moveTo(bx + 2, by + 16)
      .bezierCurveTo(bx + 10 + bw, by + 11, bx + 8 + bw, by + 4, bx + 2, by + 2)
      .stroke({ color: COL_GOLD, width: 1, alpha: 0.5 });

    // Additional elite banner on tower mid-section
    const ebx = BW - 28;
    const eby = 56;
    const ebw = Math.sin(time * FLAG_WAVE + 2.2) * 1.5;

    g.rect(ebx, eby, 2, 14).fill({ color: COL_WOOD });
    g.circle(ebx + 1, eby, 1).fill({ color: COL_GOLD });
    g.moveTo(ebx + 2, eby + 1)
      .bezierCurveTo(ebx + 7 + ebw, eby + 3, ebx + 9 + ebw, eby + 8, ebx + 2, eby + 12)
      .closePath()
      .fill({ color: this._playerColor, alpha: 0.8 });
    g.moveTo(ebx + 2, eby + 12)
      .bezierCurveTo(ebx + 9 + ebw, eby + 8, ebx + 7 + ebw, eby + 3, ebx + 2, eby + 1)
      .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.5 });
  }
}
