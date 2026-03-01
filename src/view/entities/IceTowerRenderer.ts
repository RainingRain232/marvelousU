// Procedural ice tower renderer for BuildingView.
//
// Draws a frozen ice tower (1×1 tile) with:
//   • Crystalline ice body with frost patterns
//   • Icy spire with frozen rune
//   • Glowing ice crystal at the apex
//   • Falling snow / frost particles
//   • Player-colored base indicator
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 2×TILE_SIZE tall. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { TowerMage, MAGE_COLORS_ICE } from "./TowerMage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 2 * TS; // tower height (visual)

// Palette — frozen ice theme
const COL_ICE = 0xaaddff;
const COL_ICE_LT = 0xddffff;
const COL_ICE_DK = 0x6699cc;
const COL_ICE_SHADOW = 0x4477aa;

const COL_CRYSTAL = 0x88ddff;
const COL_CRYSTAL_CORE = 0xccffff;
const COL_CRYSTAL_GLOW = 0xeeffff;

const COL_RUNE = 0x99eeff;
const COL_RUNE_GLOW = 0xccffff;

const COL_FROST = 0xffffff;
const COL_FROST_DK = 0xaaddff;

const COL_WINDOW = 0x1a2a3a;
const COL_WINDOW_FRAME = 0x88aacc;

// Animation timing
const SNOW_SPEED = 1.5;
const CRYSTAL_PULSE = 1.2;
const FROST_PULSE = 0.8;

// ---------------------------------------------------------------------------
// IceTowerRenderer
// ---------------------------------------------------------------------------

export class IceTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body
  private _spire = new Graphics(); // icy spire
  private _crystal = new Graphics(); // glowing crystal at top
  private _frost = new Graphics(); // frost patterns
  private _snow = new Graphics(); // falling snow
  private _mage: TowerMage;
  private _mageContainer = new Container();

  private _time = 0;
  private _castTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;
    this._mage = new TowerMage(MAGE_COLORS_ICE);

    this._drawStaticTower();

    this.container.addChild(this._base);
    this.container.addChild(this._spire);
    this.container.addChild(this._frost);
    this.container.addChild(this._crystal);
    this.container.addChild(this._snow);
    this._mageContainer.addChild(this._mage.graphics);
    this._mageContainer.position.set(-10, -15);
    this.container.addChild(this._mageContainer);
  }

  private _drawStaticTower(): void {
    const g = this._base;
    g.clear();

    // Base platform with player color accent
    const baseY = TH - 8;
    g.rect(4, baseY, TW - 8, 8).fill({ color: COL_ICE_SHADOW });
    g.rect(6, baseY + 2, TW - 12, 4).fill({
      color: this._playerColor,
      alpha: 0.3,
    });

    // Tower body - crystalline ice sections
    // Bottom section - wide base
    g.moveTo(14, baseY);
    g.lineTo(10, TH - 60);
    g.lineTo(TW - 10, TH - 60);
    g.lineTo(TW - 14, baseY);
    g.closePath();
    g.fill({ color: COL_ICE });
    g.stroke({ color: COL_ICE_DK, width: 1.5 });

    // Middle section
    g.moveTo(12, TH - 64);
    g.lineTo(8, TH - 100);
    g.lineTo(TW - 8, TH - 100);
    g.lineTo(TW - 12, TH - 64);
    g.closePath();
    g.fill({ color: COL_ICE });
    g.stroke({ color: COL_ICE_DK, width: 1.5 });

    // Top section (narrow spire base)
    g.moveTo(10, TH - 104);
    g.lineTo(8, TH - 125);
    g.lineTo(TW - 8, TH - 125);
    g.lineTo(TW - 10, TH - 104);
    g.closePath();
    g.fill({ color: COL_ICE });
    g.stroke({ color: COL_ICE_DK, width: 1.5 });

    // Ice crack/vein patterns - bottom section
    g.moveTo(20, baseY - 5)
      .lineTo(22, TH - 40)
      .lineTo(18, TH - 55)
      .stroke({ color: COL_ICE_LT, width: 1, alpha: 0.4 });
    g.moveTo(TW - 20, baseY - 5)
      .lineTo(TW - 22, TH - 45)
      .lineTo(TW - 18, TH - 58)
      .stroke({ color: COL_ICE_LT, width: 1, alpha: 0.4 });

    // Frost shine - bottom section
    for (let y = baseY - 30; y > TH - 55; y -= 12) {
      const offset = (Math.floor((baseY - y) / 12) % 2) * 8;
      g.rect(14 + offset, y, 6, 4).fill({ color: COL_ICE_LT, alpha: 0.35 });
    }

    // Frost shine - middle section
    for (let y = TH - 70; y > TH - 95; y -= 10) {
      const offset = (Math.floor((TH - 70 - y) / 10) % 2) * 6;
      g.rect(12 + offset, y, 5, 3).fill({ color: COL_ICE_LT, alpha: 0.3 });
    }

    // Windows with glow - bottom section
    const winX = TW / 2 - 5;
    g.rect(winX - 2, baseY - 35, 14, 18).fill({ color: COL_ICE_SHADOW });
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
    g.rect(mageWinX - 2, mageWinY - 2, 24, 26).fill({ color: COL_ICE_SHADOW });
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
    g.rect(winX - 2, TH - 85, 12, 14).fill({ color: COL_ICE_SHADOW });
    g.rect(winX, TH - 83, 8, 10).fill({ color: COL_WINDOW });
    g.rect(winX - 1, TH - 84, 10, 12).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, TH - 80, 3, 6).fill({ color: COL_RUNE_GLOW, alpha: 0.3 });

    // Draw spire
    this._drawSpire();
  }

  private _drawSpire(): void {
    const g = this._spire;
    g.clear();

    const cx = TW / 2;

    // Main spire - pointed icicle
    g.moveTo(cx - 6, TH - 125);
    g.lineTo(cx, TH - 145);
    g.lineTo(cx + 6, TH - 125);
    g.closePath();
    g.fill({ color: COL_ICE_LT });
    g.stroke({ color: COL_ICE_DK, width: 1 });

    // Secondary icicles
    g.moveTo(cx - 10, TH - 115);
    g.lineTo(cx - 8, TH - 130);
    g.lineTo(cx - 6, TH - 115);
    g.closePath();
    g.fill({ color: COL_ICE });
    g.stroke({ color: COL_ICE_DK, width: 0.5 });

    g.moveTo(cx + 10, TH - 115);
    g.lineTo(cx + 8, TH - 130);
    g.lineTo(cx + 6, TH - 115);
    g.closePath();
    g.fill({ color: COL_ICE });
    g.stroke({ color: COL_ICE_DK, width: 0.5 });
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateCrystal();
    this._updateFrost();
    this._updateSnow();
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
    const cy = TH - 145; // Top of the spire
    const pulse = (Math.sin(this._time * CRYSTAL_PULSE) + 1) * 0.5;

    // Outer glow
    g.circle(cx, cy, 7 + pulse * 3).fill({
      color: COL_CRYSTAL_GLOW,
      alpha: 0.15 + pulse * 0.1,
    });

    // Crystal body - hexagonal ice shard
    g.moveTo(cx, cy - 8)
      .lineTo(cx + 5, cy - 3)
      .lineTo(cx + 4, cy + 5)
      .lineTo(cx - 4, cy + 5)
      .lineTo(cx - 5, cy - 3)
      .closePath();
    g.fill({ color: COL_CRYSTAL });
    g.stroke({ color: COL_CRYSTAL_CORE, width: 1 });

    // Inner core
    g.circle(cx, cy - 1, 2).fill({ color: COL_CRYSTAL_CORE });

    // Sparkle
    if (pulse > 0.6) {
      g.circle(cx - 2, cy - 2, 1).fill({ color: 0xffffff, alpha: pulse });
    }
  }

  private _updateFrost(): void {
    const g = this._frost;
    g.clear();

    const pulse = (Math.sin(this._time * FROST_PULSE) + 1) * 0.5;

    // Frost rune on tower body
    g.moveTo(TW / 2 - 3, TH - 110)
      .lineTo(TW / 2, TH - 115)
      .lineTo(TW / 2 + 3, TH - 110)
      .lineTo(TW / 2, TH - 105)
      .closePath();
    g.fill({ color: COL_RUNE, alpha: 0.5 + pulse * 0.4 });

    // Horizontal frost lines
    g.rect(16, TH - 100, TW - 32, 1).fill({
      color: COL_RUNE,
      alpha: 0.2 + pulse * 0.2,
    });
    g.rect(14, TH - 75, TW - 28, 1).fill({
      color: COL_RUNE,
      alpha: 0.15 + pulse * 0.15,
    });
    g.rect(16, TH - 50, TW - 32, 1).fill({
      color: COL_RUNE,
      alpha: 0.15 + pulse * 0.15,
    });

    // Icicle tips
    g.moveTo(TW / 2 - 8, TH - 130)
      .lineTo(TW / 2 - 7, TH - 118)
      .lineTo(TW / 2 - 6, TH - 130)
      .closePath();
    g.fill({ color: COL_ICE_LT, alpha: 0.6 + pulse * 0.3 });

    g.moveTo(TW / 2 + 8, TH - 130)
      .lineTo(TW / 2 + 7, TH - 120)
      .lineTo(TW / 2 + 6, TH - 130)
      .closePath();
    g.fill({ color: COL_ICE_LT, alpha: 0.6 + pulse * 0.3 });
  }

  private _updateSnow(): void {
    const g = this._snow;
    g.clear();

    // Falling snow particles
    const snowCount = 12;
    for (let i = 0; i < snowCount; i++) {
      const phase = (this._time * SNOW_SPEED + i * 0.5) % 3;
      const x = 15 + ((i * 5) % (TW - 30));
      const y = TH - 140 + phase * 45;
      const drift = Math.sin(this._time * 2 + i) * 3;

      g.circle(x + drift, y, 1 + phase * 0.3).fill({
        color: i % 3 === 0 ? COL_FROST : COL_FROST_DK,
        alpha: 0.4 + (1 - phase / 3) * 0.4,
      });
    }

    // Occasional snowflake
    if (Math.random() < 0.03) {
      const sx = 15 + Math.random() * (TW - 30);
      const sy = TH - 130;
      g.circle(sx, sy, 2).fill({ color: 0xffffff, alpha: 0.7 });
    }
  }

  destroy(): void {
    this._mage.destroy();
    this.container.destroy({ children: true });
  }
}
