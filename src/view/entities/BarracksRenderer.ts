// Procedural barracks renderer for BuildingView.
//
// Draws a detailed 2×2 tile medieval barracks with:
//   • Sturdy stone building with arched entrance
//   • Training yard visible through the arch (training dummy)
//   • Weapon rack with swords and shields on outer wall
//   • Guardhouse watchtower on right side
//   • Guard on duty with spear (breathing animation)
//   • Soldier practicing sword swings at the dummy
//   • Player-colored banners on tower and walls
//   • Stone brick pattern, moss, arrow slits, iron torch brackets
//   • Flickering torch light
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

// Stone palette (matches CastleRenderer quality)
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x3d2510;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_WINDOW = 0x1a1a2e;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;

// Fire / torch
const COL_FIRE = 0xff6622;
const COL_FIRE_CORE = 0xffdd44;
const COL_FIRE_DIM = 0xcc4400;

// Character palettes
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_CHAINMAIL = 0x9999aa;
const COL_HELMET = 0x777788;
const COL_HELMET_DK = 0x555566;
const COL_SWORD = 0xc0c8d0;
const COL_SWORD_GUARD = 0x886622;
const COL_SHIELD = 0x6a5533;
const COL_SHIELD_RIM = 0x887744;
const COL_BOOTS = 0x3a2510;
const COL_PANTS = 0x3a3a3a;

// Dummy
const COL_STRAW = 0xc9a85c;
const COL_STRAW_DK = 0xa88a40;
const COL_DUMMY_POST = 0x5a3a1a;

// Animation timing
const TORCH_FLICKER = 8.0;
const GUARD_BREATHE = 2.0;
const FLAG_WAVE = 2.8;
const SOLDIER_CYCLE = 3.0;

// ---------------------------------------------------------------------------
// BarracksRenderer
// ---------------------------------------------------------------------------

export class BarracksRenderer {
  readonly container = new Container();

  private _base = new Graphics();       // static building structure
  private _torches = new Graphics();    // flickering torches
  private _guard = new Graphics();      // guard on duty
  private _soldier = new Graphics();    // soldier training
  private _banners = new Graphics();    // waving banners

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;

    this._drawBuilding();

    this.container.addChild(this._base);
    this.container.addChild(this._torches);
    this.container.addChild(this._guard);
    this.container.addChild(this._soldier);
    this.container.addChild(this._banners);
  }

  setOwner(owner: string | null): void {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateTorches(this._time);
    this._updateGuard(this._time);
    this._updateSoldier(this._time);
    this._updateBanners(this._time);
  }

  // ── Static Building ──────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._base;

    // Ground / cobblestones
    g.rect(0, BH - 8, BW, 8).fill({ color: 0x7a756d });
    for (let cx = 4; cx < BW - 4; cx += 10) {
      g.rect(cx, BH - 7, 8, 6)
        .fill({ color: 0x6a655d })
        .stroke({ color: 0x5a554d, width: 0.3 });
    }

    // === Main wall structure ===
    const wallY = 32;
    const wallH = BH - wallY - 10;

    // Back wall (full width)
    g.rect(4, wallY, BW - 8, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Left wall shadow
    g.rect(5, wallY + 1, 4, wallH - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Brick pattern on main wall
    this._drawBrickPattern(g, 6, wallY + 2, BW - 12, wallH - 4);
    this._drawStoneVariation(g, 8, wallY + 6, BW - 16, wallH - 12);

    // === Watchtower (right side) ===
    const towerW = 28;
    const towerH = BH - 12;
    const towerX = BW - towerW - 2;
    const towerY = 10;

    g.rect(towerX, towerY, towerW, towerH)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1.5 });
    g.rect(towerX + 1, towerY + 1, 4, towerH - 2).fill({ color: COL_STONE_DK, alpha: 0.15 });
    this._drawBrickPattern(g, towerX + 2, towerY + 2, towerW - 4, towerH - 4);
    this._drawStoneVariation(g, towerX + 4, towerY + 8, towerW - 8, towerH - 16);

    // Tower roof — pointed
    g.moveTo(towerX - 3, towerY)
      .lineTo(towerX + towerW / 2, towerY - 22)
      .lineTo(towerX + towerW + 3, towerY)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(towerX + towerW / 2, towerY - 22)
      .lineTo(towerX + towerW + 3, towerY)
      .lineTo(towerX + towerW / 2 + 1, towerY - 21)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.3 });
    // Roof tile lines
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const ly = towerY - 22 + frac * 22;
      const halfW = (towerW / 2 + 3) * frac;
      g.moveTo(towerX + towerW / 2 - halfW, ly)
        .lineTo(towerX + towerW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }
    // Finial
    g.circle(towerX + towerW / 2, towerY - 22, 2).fill({ color: 0xccaa44 });

    // Tower crenellations
    this._drawCrenellations(g, towerX, towerY, towerW);

    // Tower window — arched
    const twx = towerX + towerW / 2 - 5;
    const twy = towerY + 28;
    g.rect(twx - 2, twy - 2, 14, 18).fill({ color: COL_STONE_DK });
    g.rect(twx, twy, 10, 14).fill({ color: COL_WINDOW });
    g.ellipse(twx + 5, twy + 1, 5, 4).fill({ color: COL_STONE_DK });
    g.ellipse(twx + 5, twy + 1, 4, 3).fill({ color: COL_WINDOW });
    // Mullion
    g.moveTo(twx + 5, twy).lineTo(twx + 5, twy + 14)
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Sill
    g.rect(twx - 2, twy + 15, 14, 2).fill({ color: COL_STONE_LT });

    // Arrow slits on tower
    this._drawArrowSlit(g, towerX + 8, towerY + 56);
    this._drawArrowSlit(g, towerX + 16, towerY + 70);

    // === Main building roof ===
    g.moveTo(0, wallY + 2)
      .lineTo(50, wallY - 20)
      .lineTo(towerX - 2, wallY + 2)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(50, wallY - 20)
      .lineTo(towerX - 2, wallY + 2)
      .lineTo(51, wallY - 19)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });
    // Roof tile lines
    for (let i = 1; i <= 2; i++) {
      const frac = i / 3;
      const ly = wallY - 20 + frac * 22;
      const leftX = 50 - (50) * frac;
      const rightX = 50 + (towerX - 52) * frac;
      g.moveTo(leftX, ly).lineTo(rightX, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // Support beam under roof
    g.rect(2, wallY - 1, towerX - 4, 4).fill({ color: COL_WOOD_DK });
    g.rect(2, wallY - 1, towerX - 4, 2).fill({ color: COL_WOOD });

    // Wall crenellations
    this._drawCrenellations(g, 4, wallY, towerX - 6);

    // === Arched entrance (center of main wall) ===
    const archW = 30;
    const archH = 48;
    const archX = 35;
    const archY = BH - archH - 10;

    // Arch stone frame
    g.rect(archX - 3, archY + 10, archW + 6, archH - 8)
      .fill({ color: COL_STONE_DK });
    // Arch top
    g.ellipse(archX + archW / 2, archY + 12, archW / 2 + 3, 14)
      .fill({ color: COL_STONE_DK });

    // Interior darkness
    g.rect(archX, archY + 12, archW, archH - 10).fill({ color: 0x1a1510 });
    g.ellipse(archX + archW / 2, archY + 12, archW / 2, 12).fill({ color: 0x1a1510 });

    // Voussoir stones around arch
    for (let va = -0.9; va <= 0.9; va += 0.35) {
      const vx = archX + archW / 2 + Math.sin(va) * (archW / 2 + 1);
      const vy = archY + 12 - Math.cos(va) * 13;
      g.circle(vx, vy, 1.5).fill({ color: COL_STONE_LT, alpha: 0.5 });
    }
    // Keystone
    g.moveTo(archX + archW / 2 - 3, archY + 2)
      .lineTo(archX + archW / 2, archY - 3)
      .lineTo(archX + archW / 2 + 3, archY + 2)
      .closePath()
      .fill({ color: COL_STONE_LT });

    // Wooden lintel / beam above arch
    g.rect(archX - 6, archY - 5, archW + 12, 5).fill({ color: COL_WOOD_DK });
    g.rect(archX - 6, archY - 5, archW + 12, 2).fill({ color: COL_WOOD });
    // Iron studs on lintel
    for (let sx = archX - 3; sx < archX + archW + 3; sx += 8) {
      g.circle(sx, archY - 2, 1).fill({ color: COL_IRON });
    }

    // === Training dummy (visible inside arch) ===
    const dx = archX + 10;
    const dy = archY + 22;

    // Post
    g.rect(dx + 2, dy, 3, 30).fill({ color: COL_DUMMY_POST });
    // Cross-beam
    g.rect(dx - 6, dy + 6, 20, 3).fill({ color: COL_DUMMY_POST });
    // Straw body
    g.ellipse(dx + 3, dy + 10, 6, 8).fill({ color: COL_STRAW });
    g.ellipse(dx + 3, dy + 10, 5, 7)
      .stroke({ color: COL_STRAW_DK, width: 0.5 });
    // Straw head
    g.circle(dx + 3, dy + 1, 4).fill({ color: COL_STRAW });
    g.circle(dx + 3, dy + 1, 3).stroke({ color: COL_STRAW_DK, width: 0.5 });
    // Target painted on body
    g.circle(dx + 3, dy + 10, 3).stroke({ color: 0xcc3333, width: 1 });
    g.circle(dx + 3, dy + 10, 1).fill({ color: 0xcc3333 });

    // === Arrow slits on main wall ===
    this._drawArrowSlit(g, 12, wallY + 22);
    this._drawArrowSlit(g, 12, wallY + 44);
    this._drawArrowSlit(g, 74, wallY + 30);

    // === Weapon rack on left wall (outside) ===
    const rackX = 7;
    const rackY = wallY + 58;

    // Rack frame
    g.rect(rackX, rackY, 18, 3).fill({ color: COL_WOOD_DK });
    g.rect(rackX, rackY + 20, 18, 3).fill({ color: COL_WOOD_DK });
    g.rect(rackX, rackY, 3, 23).fill({ color: COL_WOOD });
    g.rect(rackX + 15, rackY, 3, 23).fill({ color: COL_WOOD });

    // Swords on rack
    g.rect(rackX + 4, rackY - 8, 2, 14).fill({ color: COL_SWORD });
    g.rect(rackX + 3, rackY + 4, 4, 2).fill({ color: COL_SWORD_GUARD });
    g.rect(rackX + 9, rackY - 6, 2, 12).fill({ color: COL_SWORD });
    g.rect(rackX + 8, rackY + 4, 4, 2).fill({ color: COL_SWORD_GUARD });

    // Shield below rack
    g.ellipse(rackX + 9, rackY + 30, 7, 8)
      .fill({ color: COL_SHIELD })
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    g.moveTo(rackX + 9, rackY + 24)
      .lineTo(rackX + 9, rackY + 36)
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    g.moveTo(rackX + 3, rackY + 30)
      .lineTo(rackX + 15, rackY + 30)
      .stroke({ color: COL_SHIELD_RIM, width: 1 });
    // Shield emblem (player color dot)
    g.circle(rackX + 9, rackY + 30, 3).fill({ color: this._playerColor, alpha: 0.7 });

    // === Iron torch brackets (unlit — animation handles glow) ===
    // Left of entrance
    g.rect(archX - 10, archY + 10, 3, 12).fill({ color: COL_IRON_DK });
    g.rect(archX - 12, archY + 8, 7, 3).fill({ color: COL_IRON });
    // Right of entrance
    g.rect(archX + archW + 7, archY + 10, 3, 12).fill({ color: COL_IRON_DK });
    g.rect(archX + archW + 5, archY + 8, 7, 3).fill({ color: COL_IRON });

    // === Moss patches ===
    this._drawMoss(g, 6, BH - 14, 10);
    this._drawMoss(g, towerX + 2, BH - 12, 8);
    this._drawMoss(g, archX + archW + 4, BH - 16, 6);
    this._drawMoss(g, towerX + 6, towerY + towerH - 8, 6);
    this._drawMoss(g, 22, wallY + wallH - 6, 8);

    // === Ivy vines ===
    this._drawIvy(g, 6, wallY + 10, wallH - 15);
    this._drawIvy(g, towerX + 2, towerY + 40, 50);
    this._drawIvy(g, towerX + towerW - 4, towerY + 50, 40);

    // Decorative stone band on tower
    g.rect(towerX - 1, towerY + 50, towerW + 2, 3).fill({ color: COL_STONE_DK });

    // === Doorstep / threshold ===
    g.rect(archX - 4, BH - 10, archW + 8, 3).fill({ color: COL_STONE_LT });
    g.rect(archX - 4, BH - 10, archW + 8, 1).fill({ color: COL_STONE_DK, alpha: 0.3 });
  }

  // ── Brick / Stone helpers (castle-quality) ───────────────────────────────

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
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.18 });
        g.moveTo(x + col + 1, y + row + 7).lineTo(x + col + 22, y + row + 7)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.18 });
      }
    }
  }

  private _drawStoneVariation(g: Graphics, x: number, y: number, w: number, h: number): void {
    const light = [[0.1, 0.15], [0.6, 0.3], [0.3, 0.7], [0.8, 0.5], [0.5, 0.9]];
    for (const [fx, fy] of light) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_LT, alpha: 0.25 });
    }
    const dark = [[0.3, 0.1], [0.7, 0.6], [0.15, 0.5], [0.55, 0.8], [0.85, 0.2]];
    for (const [fx, fy] of dark) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({ color: COL_STONE_DK, alpha: 0.18 });
    }
  }

  private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
    const merlonW = 7, merlonH = 6, gap = 5, step = merlonW + gap;
    for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Cap stone
      g.rect(mx - 0.5, y - merlonH - 1, merlonW + 1, 1.5).fill({ color: COL_STONE_DK });
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
      g.rect(x + i, y - h, 2, h).fill({ color: COL_MOSS, alpha: 0.5 + (i % 2) * 0.2 });
    }
  }

  private _drawIvy(g: Graphics, x: number, startY: number, length: number): void {
    let cy = startY;
    let cx = x;
    for (let i = 0; i < length; i += 4) {
      cx += ((i * 3 + x) % 5) - 2;
      cy += 4;
      if (cy > startY + length) break;
      g.circle(cx, cy, 1.5).fill({ color: COL_IVY, alpha: 0.6 });
      if (i % 8 === 0) {
        g.circle(cx + 2, cy - 1, 2).fill({ color: COL_IVY, alpha: 0.4 });
      }
    }
  }

  // ── Torches (animated) ───────────────────────────────────────────────────

  private _updateTorches(time: number): void {
    const g = this._torches;
    g.clear();

    const flicker1 = Math.sin(time * TORCH_FLICKER) * 2 + Math.sin(time * 11) * 1;
    const flicker2 = Math.sin(time * TORCH_FLICKER + 1.5) * 2 + Math.cos(time * 9) * 1;

    // Left torch
    this._drawFlame(g, 28, 62, flicker1);
    // Right torch
    this._drawFlame(g, 73, 62, flicker2);
  }

  private _drawFlame(g: Graphics, x: number, y: number, flicker: number): void {
    // Glow
    g.circle(x, y - 4, 8 + flicker * 0.5).fill({ color: COL_FIRE, alpha: 0.08 });
    // Outer flame
    g.ellipse(x, y - 5 - flicker * 0.3, 3 + flicker * 0.3, 5 + flicker * 0.5)
      .fill({ color: COL_FIRE_DIM, alpha: 0.7 });
    // Inner flame
    g.ellipse(x, y - 5, 2, 3 + flicker * 0.3).fill({ color: COL_FIRE });
    // Core
    g.ellipse(x, y - 4, 1, 2).fill({ color: COL_FIRE_CORE });
  }

  // ── Guard (right side, on duty) ──────────────────────────────────────────

  private _updateGuard(time: number): void {
    const g = this._guard;
    g.clear();

    const gx = BW - 18;
    const gy = BH - 16;
    const breathe = Math.sin(time * GUARD_BREATHE) * 0.6;

    // Spear (behind guard)
    g.moveTo(gx + 10, gy + 6)
      .lineTo(gx + 10, gy - 40)
      .stroke({ color: COL_WOOD_DK, width: 2 });
    // Spearhead
    g.moveTo(gx + 10, gy - 44)
      .lineTo(gx + 7, gy - 38)
      .lineTo(gx + 13, gy - 38)
      .closePath()
      .fill({ color: COL_SWORD });

    // Legs
    g.rect(gx - 2, gy + breathe, 3, 7).fill({ color: COL_PANTS });
    g.rect(gx + 2, gy + breathe, 3, 7).fill({ color: COL_PANTS });
    // Boots
    g.rect(gx - 3, gy + 6 + breathe, 4, 3).fill({ color: COL_BOOTS });
    g.rect(gx + 1, gy + 6 + breathe, 4, 3).fill({ color: COL_BOOTS });

    // Body (chainmail over tunic)
    g.rect(gx - 4, gy - 16 + breathe, 10, 16)
      .fill({ color: COL_ARMOR })
      .stroke({ color: COL_ARMOR_DK, width: 0.5 });
    // Chainmail texture
    for (let row = 0; row < 3; row++) {
      g.moveTo(gx - 3, gy - 14 + row * 5 + breathe)
        .lineTo(gx + 5, gy - 14 + row * 5 + breathe)
        .stroke({ color: COL_CHAINMAIL, width: 0.4, alpha: 0.4 });
    }

    // Belt
    g.rect(gx - 5, gy - 5 + breathe, 12, 2).fill({ color: COL_WOOD_DK });
    g.circle(gx + 1, gy - 4 + breathe, 1).fill({ color: 0xccaa44 }); // buckle

    // Shield arm (left)
    g.ellipse(gx - 7, gy - 5 + breathe, 5, 7)
      .fill({ color: COL_SHIELD })
      .stroke({ color: COL_SHIELD_RIM, width: 0.8 });
    g.circle(gx - 7, gy - 5 + breathe, 2).fill({ color: this._playerColor, alpha: 0.6 });

    // Right arm (holding spear)
    g.rect(gx + 4, gy - 14 + breathe, 4, 10).fill({ color: COL_ARMOR });
    g.rect(gx + 5, gy - 6 + breathe, 3, 4).fill({ color: COL_SKIN_DK });

    // Head
    g.circle(gx + 1, gy - 20 + breathe, 4.5).fill({ color: COL_SKIN });

    // Helmet
    g.rect(gx - 5, gy - 26 + breathe, 12, 7)
      .fill({ color: COL_HELMET })
      .stroke({ color: COL_HELMET_DK, width: 0.5 });
    // Helmet rim
    g.rect(gx - 6, gy - 20 + breathe, 14, 2).fill({ color: COL_HELMET_DK });
    // Nose guard
    g.rect(gx, gy - 20 + breathe, 2, 4).fill({ color: COL_HELMET_DK });

    // Eyes (peeking under helmet)
    g.circle(gx - 1, gy - 19 + breathe, 0.7).fill({ color: 0x222222 });
    g.circle(gx + 3, gy - 19 + breathe, 0.7).fill({ color: 0x222222 });
  }

  // ── Soldier training (inside archway) ────────────────────────────────────

  private _updateSoldier(time: number): void {
    const g = this._soldier;
    g.clear();

    const sx = 52;
    const sy = BH - 30;
    const cycle = (time * SOLDIER_CYCLE) % 1;

    // Swing animation: wind up → strike → recover
    let swordAngle: number;
    let bodyLean: number;
    if (cycle < 0.3) {
      // Wind up
      const t = cycle / 0.3;
      swordAngle = -0.3 - t * 1.2;
      bodyLean = -t * 1.5;
    } else if (cycle < 0.5) {
      // Strike
      const t = (cycle - 0.3) / 0.2;
      swordAngle = -1.5 + t * 2.2;
      bodyLean = -1.5 + t * 2;
    } else {
      // Recovery
      const t = (cycle - 0.5) / 0.5;
      swordAngle = 0.7 - t * 1;
      bodyLean = 0.5 - t * 0.5;
    }

    // Legs
    g.rect(sx - 2, sy + 4, 3, 6).fill({ color: COL_PANTS });
    g.rect(sx + 2, sy + 4, 3, 6).fill({ color: COL_PANTS });
    g.rect(sx - 3, sy + 9, 4, 2).fill({ color: COL_BOOTS });
    g.rect(sx + 1, sy + 9, 4, 2).fill({ color: COL_BOOTS });

    // Body
    g.rect(sx - 3 + bodyLean, sy - 10, 9, 14)
      .fill({ color: COL_ARMOR_DK })
      .stroke({ color: COL_ARMOR_DK, width: 0.3 });

    // Sword arm + sword
    const armX = sx + 4 + bodyLean;
    const armY = sy - 6;
    const swordLen = 14;
    const swordEndX = armX + Math.cos(swordAngle) * swordLen;
    const swordEndY = armY + Math.sin(swordAngle) * swordLen;

    // Arm
    g.moveTo(armX, armY)
      .lineTo(armX + Math.cos(swordAngle) * 4, armY + Math.sin(swordAngle) * 4)
      .stroke({ color: COL_SKIN, width: 2.5 });
    // Sword blade
    g.moveTo(armX + Math.cos(swordAngle) * 3, armY + Math.sin(swordAngle) * 3)
      .lineTo(swordEndX, swordEndY)
      .stroke({ color: COL_SWORD, width: 1.8 });
    // Guard
    const guardX = armX + Math.cos(swordAngle) * 3;
    const guardY = armY + Math.sin(swordAngle) * 3;
    g.moveTo(guardX - Math.sin(swordAngle) * 2, guardY + Math.cos(swordAngle) * 2)
      .lineTo(guardX + Math.sin(swordAngle) * 2, guardY - Math.cos(swordAngle) * 2)
      .stroke({ color: COL_SWORD_GUARD, width: 2 });

    // Head
    g.circle(sx + 1 + bodyLean * 0.5, sy - 14, 4).fill({ color: COL_SKIN });
    // Simple helmet
    g.rect(sx - 3 + bodyLean * 0.5, sy - 19, 8, 5).fill({ color: COL_HELMET });
    g.rect(sx - 4 + bodyLean * 0.5, sy - 15, 10, 1.5).fill({ color: COL_HELMET_DK });
  }

  // ── Banners (animated) ───────────────────────────────────────────────────

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Tower top banner (flag pole)
    const flagX = BW - 16;
    const flagY = 10 - 22 - 4;

    // Pole
    g.moveTo(flagX, flagY + 4).lineTo(flagX, flagY - 14)
      .stroke({ color: 0x666666, width: 2 });

    // Waving flag
    const w1 = Math.sin(time * FLAG_WAVE) * 2;
    const w2 = Math.sin(time * FLAG_WAVE * 1.3 + 1) * 3;
    const w3 = Math.sin(time * FLAG_WAVE * 0.9 + 2) * 2;
    g.moveTo(flagX, flagY - 14)
      .bezierCurveTo(flagX + 7, flagY - 14 + w1, flagX + 12, flagY - 14 + w2, flagX + 18, flagY - 14 + w3)
      .lineTo(flagX + 18, flagY - 3 + w3)
      .bezierCurveTo(flagX + 12, flagY - 3 + w2, flagX + 7, flagY - 3 + w1, flagX, flagY - 3)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: COL_STONE_DK, width: 0.5, alpha: 0.3 });

    // Small pennant on left wall
    const pennX = 15;
    const pennY = 28;
    const pw = Math.sin(time * FLAG_WAVE + 0.8) * 2;

    g.rect(pennX, pennY, 2, 14).fill({ color: COL_WOOD });
    g.moveTo(pennX + 2, pennY + 1)
      .bezierCurveTo(pennX + 8 + pw, pennY + 3, pennX + 10 + pw, pennY + 7, pennX + 2, pennY + 13)
      .closePath()
      .fill({ color: this._playerColor, alpha: 0.9 });

    // Wall-mounted banner beside entrance
    const bx = 68;
    const by = 40;
    const bw = Math.sin(time * FLAG_WAVE + 1.5) * 1.5;

    g.rect(bx, by, 2, 16).fill({ color: COL_WOOD });
    g.moveTo(bx + 2, by + 2)
      .bezierCurveTo(bx + 7 + bw, by + 4, bx + 9 + bw, by + 10, bx + 2, by + 14)
      .closePath()
      .fill({ color: this._playerColor, alpha: 0.85 });
  }
}
