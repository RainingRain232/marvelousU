// Procedural warp tower renderer for BuildingView.
//
// Draws an ethereal warp tower (1×1 tile) with:
//   • Translucent ethereal stone body
//   • Swirling portal at the apex
//   • Reality-bending energy wisps
//   • Pulsing purple/cyan void colors
//   • Player-colored base indicator
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 2×TILE_SIZE tall. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { TowerMage, MAGE_COLORS_WARP } from "./TowerMage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 2 * TS; // tower height (visual)

// Palette — ethereal void theme
const COL_ETHEREAL = 0x9966cc;
const COL_ETHEREAL_LT = 0xbb88ff;
const COL_ETHEREAL_DK = 0x6644aa;
const COL_ETHEREAL_SHADOW = 0x442288;

const COL_PORTAL = 0xaa44ff;
const COL_PORTAL_CORE = 0xeeaaff;
const COL_PORTAL_GLOW = 0xdd99ff;

const COL_WISP = 0xcc88ff;
const COL_WISP_DK = 0x8844cc;
const COL_WISP_CYAN = 0x88ddcc;

const COL_WINDOW = 0x1a0a2a;
const COL_WINDOW_FRAME = 0x8866aa;

// Animation timing
const WISP_SPEED = 1.5;
const PORTAL_PULSE = 2.0;
const ETHEREAL_PULSE = 1.2;

// ---------------------------------------------------------------------------
// WarpTowerRenderer
// ---------------------------------------------------------------------------

export class WarpTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body
  private _portal = new Graphics(); // swirling portal
  private _wisps = new Graphics(); // floating energy wisps
  private _glow = new Graphics(); // ethereal glow
  private _mage: TowerMage;
  private _mageContainer = new Container();

  private _time = 0;
  private _castTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;
    this._mage = new TowerMage(MAGE_COLORS_WARP);

    this._drawStaticTower();

    this.container.addChild(this._base);
    this.container.addChild(this._wisps);
    this.container.addChild(this._glow);
    this.container.addChild(this._portal);
    this._mageContainer.addChild(this._mage.graphics);
    this._mageContainer.position.set(-10, -15);
    this.container.addChild(this._mageContainer);
  }

  private _drawStaticTower(): void {
    const g = this._base;
    g.clear();

    // Base platform with player color accent
    const baseY = TH - 8;
    g.rect(4, baseY, TW - 8, 8).fill({ color: COL_ETHEREAL_SHADOW });
    g.rect(6, baseY + 2, TW - 12, 4).fill({
      color: this._playerColor,
      alpha: 0.3,
    });

    // Tower body - ethereal translucent stone
    // Bottom section - wide base
    g.moveTo(14, baseY);
    g.lineTo(10, TH - 60);
    g.lineTo(TW - 10, TH - 60);
    g.lineTo(TW - 14, baseY);
    g.closePath();
    g.fill({ color: COL_ETHEREAL, alpha: 0.85 });
    g.stroke({ color: COL_ETHEREAL_DK, width: 1.5 });

    // Middle section
    g.moveTo(12, TH - 64);
    g.lineTo(8, TH - 100);
    g.lineTo(TW - 8, TH - 100);
    g.lineTo(TW - 12, TH - 64);
    g.closePath();
    g.fill({ color: COL_ETHEREAL, alpha: 0.8 });
    g.stroke({ color: COL_ETHEREAL_DK, width: 1.5 });

    // Top section (narrow)
    g.moveTo(10, TH - 104);
    g.lineTo(8, TH - 125);
    g.lineTo(TW - 8, TH - 125);
    g.lineTo(TW - 10, TH - 104);
    g.closePath();
    g.fill({ color: COL_ETHEREAL, alpha: 0.75 });
    g.stroke({ color: COL_ETHEREAL_DK, width: 1.5 });

    // Ethereal shimmer - bottom section
    for (let y = baseY - 30; y > TH - 55; y -= 12) {
      const offset = (Math.floor((baseY - y) / 12) % 2) * 8;
      g.rect(14 + offset, y, 6, 4).fill({ color: COL_ETHEREAL_LT, alpha: 0.3 });
    }

    // Ethereal shimmer - middle section
    for (let y = TH - 70; y > TH - 95; y -= 10) {
      const offset = (Math.floor((TH - 70 - y) / 10) % 2) * 6;
      g.rect(12 + offset, y, 5, 3).fill({
        color: COL_ETHEREAL_LT,
        alpha: 0.25,
      });
    }

    // Energy veins / rifts in the ethereal stone
    g.moveTo(20, baseY - 5)
      .lineTo(22, TH - 40)
      .lineTo(18, TH - 55)
      .stroke({ color: COL_PORTAL, width: 1.5, alpha: 0.4 });
    g.moveTo(TW - 20, baseY - 5)
      .lineTo(TW - 22, TH - 45)
      .lineTo(TW - 18, TH - 58)
      .stroke({ color: COL_PORTAL, width: 1.5, alpha: 0.4 });

    // Windows with glow - bottom section
    const winX = TW / 2 - 5;
    g.rect(winX - 2, baseY - 35, 14, 18).fill({ color: COL_ETHEREAL_SHADOW });
    g.rect(winX, baseY - 33, 10, 14).fill({ color: COL_WINDOW });
    g.rect(winX - 1, baseY - 34, 12, 16).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, baseY - 30, 4, 8).fill({
      color: COL_PORTAL_GLOW,
      alpha: 0.5,
    });

    // Mage window - larger window for the attacking mage
    const mageWinX = TW / 2 - 10;
    const mageWinY = TH - 95;
    g.rect(mageWinX - 2, mageWinY - 2, 24, 26).fill({
      color: COL_ETHEREAL_SHADOW,
    });
    g.rect(mageWinX, mageWinY, 20, 22).fill({ color: COL_WINDOW });
    g.rect(mageWinX - 1, mageWinY - 1, 22, 24).stroke({
      color: COL_WINDOW_FRAME,
      width: 1.5,
    });
    g.rect(mageWinX + 2, mageWinY + 4, 6, 10).fill({
      color: COL_PORTAL_GLOW,
      alpha: 0.6,
    });

    // Windows - middle section
    g.rect(winX - 2, TH - 85, 12, 14).fill({ color: COL_ETHEREAL_SHADOW });
    g.rect(winX, TH - 83, 8, 10).fill({ color: COL_WINDOW });
    g.rect(winX - 1, TH - 84, 10, 12).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, TH - 80, 3, 6).fill({
      color: COL_PORTAL_GLOW,
      alpha: 0.4,
    });

    // Draw portal frame
    this._drawPortalFrame();
  }

  private _drawPortalFrame(): void {
    const g = this._portal;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 138;

    // Portal ring
    g.circle(cx, cy, 10).stroke({ color: COL_PORTAL, width: 2, alpha: 0.6 });
    g.circle(cx, cy, 7).stroke({
      color: COL_PORTAL_CORE,
      width: 1,
      alpha: 0.8,
    });
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updatePortal();
    this._updateWisps();
    this._updateGlow();
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

  private _updatePortal(): void {
    const g = this._portal;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 138;
    const pulse = (Math.sin(this._time * PORTAL_PULSE) + 1) * 0.5;

    // Portal ring - swirling
    for (let i = 0; i < 3; i++) {
      const angle = this._time * 2 + i * ((Math.PI * 2) / 3);
      const r = 8 + Math.sin(angle * 2) * 2;
      g.circle(cx + Math.cos(angle) * 2, cy + Math.sin(angle) * 2, r).stroke({
        color: COL_PORTAL,
        width: 1.5,
        alpha: 0.4 + pulse * 0.3,
      });
    }

    // Outer glow
    g.circle(cx, cy, 12 + pulse * 3).fill({
      color: COL_PORTAL_GLOW,
      alpha: 0.1 + pulse * 0.08,
    });

    // Inner portal core
    g.circle(cx, cy, 4 + pulse * 2).fill({
      color: COL_PORTAL_CORE,
      alpha: 0.5 + pulse * 0.3,
    });

    // Swirl effect
    g.moveTo(cx - 3, cy - 2)
      .lineTo(cx + 1, cy - 4)
      .lineTo(cx + 3, cy)
      .lineTo(cx, cy + 3)
      .lineTo(cx - 4, cy)
      .closePath();
    g.fill({ color: COL_PORTAL, alpha: 0.4 + pulse * 0.2 });
  }

  private _updateWisps(): void {
    const g = this._wisps;
    g.clear();

    const wispCount = 8;
    for (let i = 0; i < wispCount; i++) {
      const phase = (this._time * WISP_SPEED + i * 0.7) % 3;
      const angle = (i / wispCount) * Math.PI * 2 + this._time * 0.5;
      const radius = 15 + Math.sin(phase * Math.PI) * 10;
      const x = TW / 2 + Math.cos(angle) * radius;
      const y = TH - 130 + Math.sin(phase * Math.PI) * 20 - phase * 5;
      const size = 2 + (1 - phase / 3) * 2;

      g.circle(x, y, size).fill({
        color: i % 2 === 0 ? COL_WISP : COL_WISP_CYAN,
        alpha: (1 - phase / 3) * 0.6,
      });
    }

    // Rising energy particles
    for (let i = 0; i < 4; i++) {
      const ePhase = (this._time * 1.2 + i * 0.8) % 2;
      const ex = TW / 2 + Math.sin(i * 2 + this._time) * 8;
      const ey = TH - 140 - ePhase * 30;
      const eSize = 1 + (1 - ePhase) * 1.5;

      g.circle(ex, ey, eSize).fill({
        color: i % 2 === 0 ? COL_WISP_DK : COL_WISP,
        alpha: (1 - ePhase / 2) * 0.5,
      });
    }
  }

  private _updateGlow(): void {
    const g = this._glow;
    g.clear();

    const pulse = (Math.sin(this._time * ETHEREAL_PULSE) + 1) * 0.5;

    // Ethereal rune on tower body
    g.moveTo(TW / 2 - 4, TH - 110)
      .lineTo(TW / 2, TH - 116)
      .lineTo(TW / 2 + 4, TH - 110)
      .lineTo(TW / 2, TH - 104)
      .closePath();
    g.fill({ color: COL_PORTAL, alpha: 0.5 + pulse * 0.4 });

    // Horizontal ethereal energy lines
    g.rect(16, TH - 100, TW - 32, 1).fill({
      color: COL_PORTAL,
      alpha: 0.25 + pulse * 0.2,
    });
    g.rect(14, TH - 75, TW - 28, 1).fill({
      color: COL_PORTAL,
      alpha: 0.2 + pulse * 0.15,
    });
    g.rect(16, TH - 50, TW - 32, 1).fill({
      color: COL_PORTAL,
      alpha: 0.2 + pulse * 15,
    });
  }

  destroy(): void {
    this._mage.destroy();
    this.container.destroy({ children: true });
  }
}
