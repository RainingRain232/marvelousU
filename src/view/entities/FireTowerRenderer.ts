// Procedural fire tower renderer for BuildingView.
//
// Draws a fiery fire tower (1×1 tile) with:
//   • Stone body with magma veins
//   • Flaming torch at the apex
//   • Glowing ember core
//   • Rising flames and ember particles
//   • Player-colored base indicator
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 2×TILE_SIZE tall. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { TowerMage, MAGE_COLORS_FIRE } from "./TowerMage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 2 * TS; // tower height (visual)

// Palette — fiery fire theme
const COL_STONE = 0x4a3a2a;
const COL_STONE_LT = 0x6a5a4a;
const COL_STONE_DK = 0x2a1a0a;

const COL_MAGMA = 0xff4400;
const COL_MAGMA_CORE = 0xffaa00;
const COL_MAGMA_GLOW = 0xffdd66;

const COL_FLAME = 0xff6600;
const COL_FLAME_LT = 0xffaa33;
const COL_FLAME_OUTER = 0xff3300;

const COL_EMBER = 0xffaa00;
const COL_EMBER_DK = 0xff4400;

const COL_WINDOW = 0x1a0a00;
const COL_WINDOW_FRAME = 0x885522;

// Animation timing
const FLAME_SPEED = 3.0;
const EMBER_PULSE = 1.5;
const MAGMA_PULSE = 0.8;

// ---------------------------------------------------------------------------
// FireTowerRenderer
// ---------------------------------------------------------------------------

export class FireTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body
  private _torch = new Graphics(); // flaming torch
  private _core = new Graphics(); // glowing ember core
  private _magma = new Graphics(); // magma veins
  private _flames = new Graphics(); // rising flames
  private _mage: TowerMage;
  private _mageContainer = new Container();

  private _time = 0;
  private _castTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;
    this._mage = new TowerMage(MAGE_COLORS_FIRE);

    this._drawStaticTower();

    this.container.addChild(this._base);
    this.container.addChild(this._magma);
    this.container.addChild(this._flames);
    this.container.addChild(this._torch);
    this.container.addChild(this._core);
    this._mageContainer.addChild(this._mage.graphics);
    this._mageContainer.position.set(-10, -15);
    this.container.addChild(this._mageContainer);
  }

  private _drawStaticTower(): void {
    const g = this._base;
    g.clear();

    // Base platform with player color accent
    const baseY = TH - 8;
    g.rect(4, baseY, TW - 8, 8).fill({ color: COL_STONE_DK });
    g.rect(6, baseY + 2, TW - 12, 4).fill({
      color: this._playerColor,
      alpha: 0.3,
    });

    // Tower body - basalt with fiery veins
    // Bottom section - wide base
    g.moveTo(14, baseY);
    g.lineTo(10, TH - 60);
    g.lineTo(TW - 10, TH - 60);
    g.lineTo(TW - 14, baseY);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Middle section
    g.moveTo(12, TH - 64);
    g.lineTo(8, TH - 100);
    g.lineTo(TW - 8, TH - 100);
    g.lineTo(TW - 12, TH - 64);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Top section (narrow)
    g.moveTo(10, TH - 104);
    g.lineTo(8, TH - 125);
    g.lineTo(TW - 8, TH - 125);
    g.lineTo(TW - 10, TH - 104);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone texture - bottom section
    for (let y = baseY - 30; y > TH - 55; y -= 10) {
      const offset = (Math.floor((baseY - y) / 10) % 2) * 8;
      for (let x = 14 + offset; x < TW - 14; x += 16) {
        g.rect(x, y, 12, 7).fill({ color: COL_STONE_LT, alpha: 0.25 });
      }
    }

    // Stone texture - middle section
    for (let y = TH - 70; y > TH - 95; y -= 8) {
      const offset = (Math.floor((TH - 70 - y) / 8) % 2) * 6;
      for (let x = 12 + offset; x < TW - 12; x += 12) {
        g.rect(x, y, 9, 6).fill({ color: COL_STONE_LT, alpha: 0.2 });
      }
    }

    // Windows with glow - bottom section
    const winX = TW / 2 - 5;
    g.rect(winX - 2, baseY - 35, 14, 18).fill({ color: COL_STONE_DK });
    g.rect(winX, baseY - 33, 10, 14).fill({ color: COL_WINDOW });
    g.rect(winX - 1, baseY - 34, 12, 16).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, baseY - 30, 4, 8).fill({
      color: COL_MAGMA_GLOW,
      alpha: 0.5,
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
      color: COL_MAGMA_GLOW,
      alpha: 0.6,
    });

    // Windows - middle section
    g.rect(winX - 2, TH - 85, 12, 14).fill({ color: COL_STONE_DK });
    g.rect(winX, TH - 83, 8, 10).fill({ color: COL_WINDOW });
    g.rect(winX - 1, TH - 84, 10, 12).stroke({
      color: COL_WINDOW_FRAME,
      width: 1,
    });
    g.rect(winX + 1, TH - 80, 3, 6).fill({ color: COL_MAGMA_GLOW, alpha: 0.4 });

    // Draw torch holder
    this._drawTorchHolder();
  }

  private _drawTorchHolder(): void {
    const g = this._torch;
    g.clear();

    const cx = TW / 2;

    // Torch pole
    g.rect(cx - 3, TH - 145, 6, 25).fill({ color: COL_STONE_DK });
    g.rect(cx - 2, TH - 144, 2, 23).fill({ color: COL_STONE_LT, alpha: 0.3 });

    // Torch basket
    g.moveTo(cx - 8, TH - 125);
    g.lineTo(cx - 6, TH - 145);
    g.lineTo(cx + 6, TH - 145);
    g.lineTo(cx + 8, TH - 125);
    g.closePath();
    g.fill({ color: COL_STONE });
    g.stroke({ color: COL_STONE_DK, width: 1 });

    // Inner glow from flame
    g.circle(cx, TH - 138, 6).fill({ color: COL_MAGMA_GLOW, alpha: 0.3 });
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateFlames();
    this._updateCore();
    this._updateMagma();
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

  private _updateFlames(): void {
    const g = this._flames;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 145;
    const flameCount = 5;

    for (let i = 0; i < flameCount; i++) {
      const phase = (this._time * FLAME_SPEED + i * 0.4) % 1;
      const flicker = Math.sin(this._time * 8 + i * 2) * 2;
      const height = 15 + phase * 10 + Math.random() * 3;
      const width = 4 + Math.sin(phase * Math.PI) * 3;

      // Outer flame
      g.moveTo(cx - width + flicker, cy);
      g.lineTo(cx - 2 + flicker * 0.5, cy - height);
      g.lineTo(cx + 2 + flicker * 0.5, cy - height);
      g.lineTo(cx + width + flicker, cy);
      g.closePath();
      g.fill({ color: COL_FLAME_OUTER, alpha: 0.6 + phase * 0.3 });

      // Inner flame
      const innerW = width * 0.6;
      const innerH = height * 0.7;
      g.moveTo(cx - innerW + flicker * 0.7, cy - 2);
      g.lineTo(cx - 1 + flicker * 0.3, cy - innerH);
      g.lineTo(cx + 1 + flicker * 0.3, cy - innerH);
      g.lineTo(cx + innerW + flicker * 0.7, cy - 2);
      g.closePath();
      g.fill({ color: COL_FLAME, alpha: 0.8 + phase * 0.2 });

      // Core
      g.circle(cx + flicker * 0.5, cy - 3, 2).fill({ color: COL_FLAME_LT });
    }

    // Rising ember particles
    const emberCount = 6;
    for (let i = 0; i < emberCount; i++) {
      const ePhase = (this._time * 1.5 + i * 0.6) % 2;
      const ex = cx + Math.sin(i * 1.5) * 8 + Math.sin(this._time * 3 + i) * 4;
      const ey = cy - 5 - ePhase * 40;
      const eSize = 1 + (1 - ePhase) * 1.5;

      g.circle(ex, ey, eSize).fill({
        color: i % 2 === 0 ? COL_EMBER : COL_EMBER_DK,
        alpha: (1 - ePhase / 2) * 0.7,
      });
    }
  }

  private _updateCore(): void {
    const g = this._core;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 145;
    const pulse = (Math.sin(this._time * EMBER_PULSE) + 1) * 0.5;

    // Outer glow
    g.circle(cx, cy, 10 + pulse * 4).fill({
      color: COL_MAGMA_GLOW,
      alpha: 0.15 + pulse * 0.1,
    });

    // Ember core
    g.circle(cx, cy, 4 + pulse * 2).fill({
      color: COL_MAGMA_CORE,
      alpha: 0.6 + pulse * 0.3,
    });

    // Hot center
    g.circle(cx, cy, 2).fill({ color: 0xffffff, alpha: 0.5 + pulse * 0.3 });

    // Spark
    if (pulse > 0.7) {
      g.circle(cx - 2, cy - 1, 1).fill({ color: 0xffffff, alpha: pulse });
    }
  }

  private _updateMagma(): void {
    const g = this._magma;
    g.clear();

    const pulse = (Math.sin(this._time * MAGMA_PULSE) + 1) * 0.5;

    // Magma veins / cracks in stone
    g.moveTo(20, TH - 10)
      .lineTo(18, TH - 50)
      .lineTo(22, TH - 90)
      .stroke({ color: COL_MAGMA, width: 2, alpha: 0.4 + pulse * 0.3 });
    g.moveTo(TW - 20, TH - 10)
      .lineTo(TW - 18, TH - 55)
      .lineTo(TW - 22, TH - 85)
      .stroke({ color: COL_MAGMA, width: 2, alpha: 0.4 + pulse * 0.3 });

    // Center magma glow
    g.moveTo(TW / 2 - 3, TH - 110)
      .lineTo(TW / 2, TH - 115)
      .lineTo(TW / 2 + 3, TH - 110)
      .lineTo(TW / 2, TH - 105)
      .closePath();
    g.fill({ color: COL_MAGMA, alpha: 0.5 + pulse * 0.4 });

    // Horizontal magma lines
    g.rect(16, TH - 100, TW - 32, 1).fill({
      color: COL_MAGMA,
      alpha: 0.3 + pulse * 0.2,
    });
    g.rect(14, TH - 75, TW - 28, 1).fill({
      color: COL_MAGMA,
      alpha: 0.2 + pulse * 0.15,
    });
    g.rect(16, TH - 50, TW - 32, 1).fill({
      color: COL_MAGMA,
      alpha: 0.2 + pulse * 0.15,
    });
  }

  destroy(): void {
    this._mage.destroy();
    this.container.destroy({ children: true });
  }
}
