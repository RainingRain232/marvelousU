// Procedural lightning tower renderer for BuildingView.
//
// Draws a mystical lightning tower (1×1 tile) with:
//   • Tapered stone body with crackling energy veins
//   • Conical roof with lightning rune patterns
//   • Glowing crystal at the apex
//   • Electric arcs that crackle around the tower
//   • Player-colored base indicator
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 1×TILE_SIZE tall. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";
import { TowerMage, MAGE_COLORS_LIGHTNING } from "./TowerMage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 2 * TS; // tower height (visual)

// Palette — mystical lightning theme
const COL_STONE = 0x5a5a6a;
const COL_STONE_LT = 0x7a7a8a;
const COL_STONE_DK = 0x3a3a4a;

const COL_CRYSTAL = 0x4488ff;
const COL_CRYSTAL_CORE = 0x88ccff;
const COL_CRYSTAL_GLOW = 0xaaddff;

const COL_RUNE = 0x66aaff;
const COL_RUNE_GLOW = 0x88ccff;

const COL_ELECTRIC = 0x88ddff;
const COL_ELECTRIC_DK = 0x4488dd;

const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_FRAME = 0x555555;

// Animation timing
const ARC_SPEED = 2.0;
const CRYSTAL_PULSE = 1.5;
const RUNE_PULSE = 2.0;

// ---------------------------------------------------------------------------
// LightningTowerRenderer
// ---------------------------------------------------------------------------

export class LightningTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body
  private _roof = new Graphics(); // conical roof
  private _crystal = new Graphics(); // glowing crystal at top
  private _runes = new Graphics(); // pulsing runes
  private _arcs = new Graphics(); // crackling electric arcs
  private _mage: TowerMage;
  private _mageContainer = new Container();

  private _time = 0;
  private _castTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);
    this._mage = new TowerMage(MAGE_COLORS_LIGHTNING);

    this._drawStaticTower();

    this.container.addChild(this._base);
    this.container.addChild(this._roof);
    this.container.addChild(this._runes);
    this.container.addChild(this._crystal);
    this.container.addChild(this._arcs);
    this._mageContainer.addChild(this._mage.graphics);
    this._mageContainer.position.set(-10, -15);
    this.container.addChild(this._mageContainer);
  }

  private _drawStaticTower(): void {
    const g = this._base;
    g.clear();

    // Base platform with player color accent (at bottom of visual area)
    const baseY = TH - 8;
    g.rect(4, baseY, TW - 8, 8).fill({ color: COL_STONE_DK });
    g.rect(6, baseY + 2, TW - 12, 4).fill({
      color: this._playerColor,
      alpha: 0.3,
    });

    // Tower body - tall tapered with multiple sections
    // Bottom section
    g.moveTo(14, baseY);
    g.lineTo(8, TH - 60);
    g.lineTo(TW - 8, TH - 60);
    g.lineTo(TW - 14, baseY);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Middle section
    g.moveTo(10, TH - 64);
    g.lineTo(6, TH - 100);
    g.lineTo(TW - 6, TH - 100);
    g.lineTo(TW - 10, TH - 64);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Top section (narrow)
    g.moveTo(8, TH - 104);
    g.lineTo(6, TH - 130);
    g.lineTo(TW - 6, TH - 130);
    g.lineTo(TW - 8, TH - 104);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Brick pattern - bottom section
    for (let y = baseY - 30; y > TH - 55; y -= 8) {
      const offset = (Math.floor((baseY - y) / 8) % 2) * 6;
      for (let x = 12 + offset; x < TW - 12; x += 12) {
        g.rect(x, y, 10, 6).fill({ color: COL_STONE_LT, alpha: 0.3 });
      }
    }

    // Brick pattern - middle section
    for (let y = TH - 70; y > TH - 95; y -= 8) {
      const offset = (Math.floor((TH - 70 - y) / 8) % 2) * 4;
      for (let x = 10 + offset; x < TW - 10; x += 10) {
        g.rect(x, y, 8, 6).fill({ color: COL_STONE_LT, alpha: 0.25 });
      }
    }

    // Energy veins / cracks in stone
    g.moveTo(20, baseY - 5)
      .lineTo(18, TH - 50)
      .lineTo(22, TH - 90)
      .stroke({ color: COL_ELECTRIC_DK, width: 1, alpha: 0.5 });
    g.moveTo(TW - 20, baseY - 5)
      .lineTo(TW - 18, TH - 55)
      .lineTo(TW - 22, TH - 85)
      .stroke({ color: COL_ELECTRIC_DK, width: 1, alpha: 0.5 });

    // Windows with glow - bottom section
    const winX = TW / 2 - 5;
    g.rect(winX - 2, baseY - 35, 14, 18).fill({ color: COL_STONE_DK });
    g.rect(winX, baseY - 33, 10, 14).fill({ color: COL_WINDOW });
    g.rect(winX - 1, baseY - 34, 12, 16).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, baseY - 30, 4, 8).fill({
      color: COL_RUNE_GLOW,
      alpha: 0.4,
    });

    // Mage window - larger window for the attacking mage
    const mageWinX = TW / 2 - 10;
    const mageWinY = TH - 95;
    g.rect(mageWinX - 2, mageWinY - 2, 24, 26).fill({ color: COL_STONE_DK });
    g.rect(mageWinX, mageWinY, 20, 22).fill({ color: COL_WINDOW });
    g.rect(mageWinX - 1, mageWinY - 1, 22, 24).stroke({
      color: COL_WINDOW_FRAME,
      width: 1.5,
    });
    g.rect(mageWinX + 2, mageWinY + 4, 6, 10).fill({
      color: COL_RUNE_GLOW,
      alpha: 0.5,
    });

    // Windows - middle section
    g.rect(winX - 2, TH - 85, 12, 14).fill({ color: COL_STONE_DK });
    g.rect(winX, TH - 83, 8, 10).fill({ color: COL_WINDOW });
    g.rect(winX - 1, TH - 84, 10, 12).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, TH - 80, 3, 6).fill({ color: COL_RUNE_GLOW, alpha: 0.3 });
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateCrystal();
    this._updateRunes();
    this._updateArcs();
    this._updateMage(dt);
  }

  private _updateMage(dt: number): void {
    this._castTimer += dt;
    if (this._castTimer > 2.5) {
      this._castTimer = 0;
      this._mage.setCasting(true);
      setTimeout(() => this._mage.setCasting(false), 400);
    }
    this._mage.tick(dt);
  }

  private _updateCrystal(): void {
    const g = this._crystal;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 130; // Top of the tower
    const pulse = (Math.sin(this._time * CRYSTAL_PULSE) + 1) * 0.5;

    // Outer glow
    g.circle(cx, cy, 8 + pulse * 4).fill({
      color: COL_CRYSTAL_GLOW,
      alpha: 0.2 + pulse * 0.15,
    });

    // Crystal body
    g.moveTo(cx, cy - 10)
      .lineTo(cx + 6, cy - 2)
      .lineTo(cx + 4, cy + 6)
      .lineTo(cx - 4, cy + 6)
      .lineTo(cx - 6, cy - 2)
      .closePath();
    g.fill({ color: COL_CRYSTAL });
    g.stroke({ color: COL_CRYSTAL_CORE, width: 1 });

    // Inner core
    g.circle(cx, cy, 3).fill({ color: COL_CRYSTAL_CORE });

    // Sparkle
    if (pulse > 0.7) {
      g.circle(cx - 2, cy - 3, 1).fill({ color: 0xffffff, alpha: pulse });
    }
  }

  private _updateRunes(): void {
    const g = this._runes;
    g.clear();

    const pulse = (Math.sin(this._time * RUNE_PULSE) + 1) * 0.5;
    const cy = TH - 115; // Just below crystal

    // Rune on tower body
    g.moveTo(TW / 2 - 4, cy)
      .lineTo(TW / 2, cy - 5)
      .lineTo(TW / 2 + 4, cy)
      .lineTo(TW / 2, cy + 5)
      .closePath();
    g.fill({ color: COL_RUNE, alpha: 0.6 + pulse * 0.4 });

    // Horizontal energy lines
    g.rect(16, TH - 100, TW - 32, 1).fill({
      color: COL_RUNE,
      alpha: 0.3 + pulse * 0.3,
    });
    g.rect(14, TH - 75, TW - 28, 1).fill({
      color: COL_RUNE,
      alpha: 0.2 + pulse * 0.2,
    });
    g.rect(16, TH - 50, TW - 32, 1).fill({
      color: COL_RUNE,
      alpha: 0.2 + pulse * 0.2,
    });
  }

  private _updateArcs(): void {
    const g = this._arcs;
    g.clear();

    // Crackling electric arcs around the tower
    const arcCount = 4;
    for (let i = 0; i < arcCount; i++) {
      const phase =
        (this._time * ARC_SPEED + i * ((Math.PI * 2) / arcCount)) %
        (Math.PI * 2);
      const y1 = TH - 115 + i * 25;
      const y2 = y1 + 10;
      const offset = Math.sin(phase) * 8;

      // Main arc
      g.moveTo(12 + offset, y1);
      g.lineTo(20 + Math.sin(phase + 1) * 4, (y1 + y2) / 2);
      g.lineTo(12 - offset, y2);
      g.stroke({
        color: COL_ELECTRIC,
        width: 1.5,
        alpha: 0.5 + Math.sin(phase) * 0.3,
      });

      // Mirror arc on right side
      g.moveTo(TW - 12 - offset, y1);
      g.lineTo(TW - 20 - Math.sin(phase + 1) * 4, (y1 + y2) / 2);
      g.lineTo(TW - 12 + offset, y2);
      g.stroke({
        color: COL_ELECTRIC,
        width: 1.5,
        alpha: 0.5 + Math.sin(phase) * 0.3,
      });
    }

    // Random lightning bolts
    if (Math.random() < 0.02) {
      const bx = 10 + Math.random() * (TW - 20);
      const by = TH - 100 + Math.random() * 50;
      g.moveTo(bx, by)
        .lineTo(bx + (Math.random() - 0.5) * 10, by + 15)
        .stroke({ color: COL_ELECTRIC, width: 2, alpha: 0.8 });
      g.circle(bx, by, 2).fill({ color: 0xffffff, alpha: 0.9 });
    }
  }

  destroy(): void {
    this._mage.destroy();
    this.container.destroy({ children: true });
  }
}
