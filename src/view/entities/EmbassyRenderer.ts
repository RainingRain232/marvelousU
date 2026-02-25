// Procedural embassy renderer for BuildingView.
//
// Draws an elegant diplomatic embassy (~2×2 tiles) with:
//   • Ornate stone facade with marble columns
//   • Grand entrance with brass doors
//   • Decorative windows
//   • Waving flags/banners on the roof indicating ownership
//   • Diplomatic crest above the entrance
//   • Steps leading up to the entrance
//   • Animated: waving banners
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — elegant embassy (cream/gold/white stone)
const COL_STONE = 0xf0ebe0;
const COL_STONE_DK = 0xc8c0b0;
const COL_STONE_LT = 0xffffff;
const COL_MARBLE = 0xe8e0d8;
const COL_MARBLE_DK = 0xd0c8bc;
const COL_ROOF = 0x4a3020;
const COL_ROOF_DK = 0x2a1810;
const COL_GOLD = 0xffd700;
const COL_BRASS = 0xb5882a;
const COL_BRASS_DK = 0x8a6420;
const COL_CREST = 0x8b4513;

// Animation timing
const FLAG_SPEED = 2.5;

// ---------------------------------------------------------------------------
// EmbassyRenderer
// ---------------------------------------------------------------------------

export class EmbassyRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _windows = new Graphics();
  private _crest = new Graphics();
  private _banner1 = new Graphics();
  private _banner2 = new Graphics();
  private _door = new Graphics();

  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawBuilding();
    this._drawWindows();
    this._drawDoor();
    this._drawCrest();
    this._drawBanners();

    this.container.addChild(this._building);
    this.container.addChild(this._windows);
    this.container.addChild(this._door);
    this.container.addChild(this._crest);
    this.container.addChild(this._banner1);
    this.container.addChild(this._banner2);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateBanner1();
    this._updateBanner2();
  }

  // ── Building Structure ─────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    // Ground / steps
    g.rect(0, TH - 8, TW, 8).fill({ color: COL_STONE_DK });
    g.rect(4, TH - 12, TW - 8, 4).fill({ color: COL_STONE });
    g.rect(8, TH - 16, TW - 16, 4).fill({ color: COL_STONE_LT });

    // Main facade
    g.rect(12, 20, TW - 24, TH - 36)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Marble pilasters (columns)
    for (let i = 0; i < 3; i++) {
      const px = 16 + i * 40;
      g.rect(px, 24, 8, TH - 40)
        .fill({ color: COL_MARBLE })
        .stroke({ color: COL_MARBLE_DK, width: 1 });
      g.rect(px - 2, 20, 12, 6)
        .fill({ color: COL_MARBLE })
        .stroke({ color: COL_MARBLE_DK, width: 0.5 });
      g.rect(px - 2, TH - 22, 12, 4).fill({ color: COL_MARBLE_DK });
    }

    // Decorative cornice at top
    g.rect(10, 16, TW - 20, 6)
      .fill({ color: COL_MARBLE })
      .stroke({ color: COL_MARBLE_DK, width: 1 });
    g.rect(8, 14, TW - 16, 4).fill({ color: COL_STONE_LT });

    // Roof (triangular pediment style)
    g.moveTo(TW / 2, 0)
      .lineTo(TW - 10, 16)
      .lineTo(10, 16)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 2 });

    // Roof edge trim
    g.moveTo(8, 16)
      .lineTo(TW / 2, -2)
      .lineTo(TW - 8, 16)
      .stroke({ color: COL_GOLD, width: 1.5 });

    // Side walls (depth)
    g.rect(0, 20, 14, TH - 28)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: 0x9a8a7a, width: 1 });
    g.rect(TW - 14, 20, 14, TH - 28)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: 0x9a8a7a, width: 1 });

    // Decorative roof tiles
    for (let i = 0; i < 6; i++) {
      const tx = 20 + i * 16;
      g.moveTo(tx, 16)
        .lineTo(tx + 8, 4)
        .lineTo(tx + 16, 16)
        .stroke({ color: COL_ROOF_DK, width: 0.5 });
    }
  }

  // ── Windows ─────────────────────────────────────────────────────────

  private _drawWindows(): void {
    const g = this._windows;

    for (let i = 0; i < 2; i++) {
      const wx = 44 + i * 40;
      const wy = 45;

      g.rect(wx - 12, wy, 24, 32)
        .fill({ color: COL_MARBLE_DK })
        .stroke({ color: COL_BRASS, width: 1.5 });
      g.rect(wx - 10, wy + 2, 20, 28).fill({ color: 0x1a1a2e });
      g.moveTo(wx, wy + 2)
        .lineTo(wx, wy + 30)
        .stroke({ color: COL_BRASS, width: 2 });
      g.moveTo(wx - 10, wy + 15)
        .lineTo(wx + 10, wy + 15)
        .stroke({ color: COL_BRASS, width: 2 });
      g.moveTo(wx - 10, wy)
        .quadraticCurveTo(wx, wy - 8, wx + 10, wy)
        .stroke({ color: COL_BRASS, width: 2 });
      g.rect(wx - 14, wy + 32, 28, 3).fill({ color: COL_MARBLE });

      const bx = wx;
      const by = wy + 38;
      g.moveTo(bx - 6, by)
        .lineTo(bx + 6, by)
        .lineTo(bx, by + 10)
        .closePath()
        .fill({ color: this._playerColor, alpha: 0.6 });
    }
  }

  // ── Door ─────────────────────────────────────────────────────────────

  private _drawDoor(): void {
    const g = this._door;

    const dx = TW / 2;
    const dy = TH - 18;
    const doorW = 30;
    const doorH = 40;

    g.rect(dx - doorW / 2 - 3, dy - doorH, doorW + 6, doorH + 4)
      .fill({ color: COL_MARBLE_DK })
      .stroke({ color: COL_BRASS, width: 2 });
    g.rect(dx - doorW / 2, dy - doorH + 2, doorW, doorH - 2).fill({
      color: 0x1a1410,
    });

    const doorHalf = doorW / 2 - 1;
    g.rect(dx - doorHalf, dy - doorH + 4, doorHalf, doorH - 6)
      .fill({ color: COL_BRASS })
      .stroke({ color: COL_BRASS_DK, width: 1 });
    g.rect(dx + 1, dy - doorH + 4, doorHalf, doorH - 6)
      .fill({ color: COL_BRASS })
      .stroke({ color: COL_BRASS_DK, width: 1 });

    g.rect(dx - doorHalf + 3, dy - doorH + 6, doorHalf - 6, 12).fill({
      color: COL_BRASS_DK,
      alpha: 0.5,
    });
    g.rect(dx - doorHalf + 3, dy - doorH + 20, doorHalf - 6, 12).fill({
      color: COL_BRASS_DK,
      alpha: 0.5,
    });
    g.rect(dx + 4, dy - doorH + 6, doorHalf - 6, 12).fill({
      color: COL_BRASS_DK,
      alpha: 0.5,
    });
    g.rect(dx + 4, dy - doorH + 20, doorHalf - 6, 12).fill({
      color: COL_BRASS_DK,
      alpha: 0.5,
    });

    g.circle(dx - 5, dy - doorH / 2, 2).fill({ color: COL_GOLD });
    g.circle(dx + 5, dy - doorH / 2, 2).fill({ color: COL_GOLD });

    g.moveTo(dx - doorW / 2, dy - doorH + 8)
      .quadraticCurveTo(dx, dy - doorH - 8, dx + doorW / 2, dy - doorH + 8)
      .stroke({ color: COL_BRASS, width: 2 });
  }

  // ── Crest ───────────────────────────────────────────────────────────

  private _drawCrest(): void {
    this._crest.position.set(TW / 2, 60);
    const g = this._crest;
    const cx = 0;
    const cy = 0;

    g.moveTo(cx, cy - 12)
      .lineTo(cx + 10, cy - 8)
      .lineTo(cx + 10, cy + 2)
      .quadraticCurveTo(cx + 10, cy + 12, cx, cy + 16)
      .quadraticCurveTo(cx - 10, cy + 12, cx - 10, cy + 2)
      .lineTo(cx - 10, cy - 8)
      .closePath()
      .fill({ color: COL_CREST })
      .stroke({ color: COL_GOLD, width: 1.5 });
    g.moveTo(cx, cy - 6)
      .lineTo(cx + 5, cy - 3)
      .lineTo(cx + 5, cy + 2)
      .quadraticCurveTo(cx + 5, cy + 8, cx, cy + 10)
      .quadraticCurveTo(cx - 5, cy + 8, cx - 5, cy + 2)
      .lineTo(cx - 5, cy - 3)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.7 });
    g.moveTo(cx - 8, cy - 10)
      .lineTo(cx - 6, cy - 14)
      .lineTo(cx - 3, cy - 12)
      .lineTo(cx, cy - 16)
      .lineTo(cx + 3, cy - 12)
      .lineTo(cx + 6, cy - 14)
      .lineTo(cx + 8, cy - 10)
      .closePath()
      .fill({ color: COL_GOLD });
  }

  // ── Banners ─────────────────────────────────────────────────────────

  private _drawBanners(): void {
    this._banner1.position.set(30, 14);
    const g1 = this._banner1;
    g1.moveTo(0, 0).lineTo(0, 20).stroke({ color: COL_BRASS_DK, width: 1.5 });
    g1.moveTo(0, 0)
      .lineTo(12, 4)
      .lineTo(0, 8)
      .fill({ color: this._playerColor });

    this._banner2.position.set(TW - 30, 14);
    const g2 = this._banner2;
    g2.moveTo(0, 0).lineTo(0, 20).stroke({ color: COL_BRASS_DK, width: 1.5 });
    g2.moveTo(0, 0)
      .lineTo(12, 4)
      .lineTo(0, 8)
      .fill({ color: this._playerColor });
  }

  private _updateBanner1(): void {
    const g = this._banner1;
    g.clear();
    const w1 = Math.sin(this._time * FLAG_SPEED) * 2;
    const w2 = Math.sin(this._time * FLAG_SPEED * 1.3 + 1) * 3;
    const w3 = Math.sin(this._time * FLAG_SPEED * 0.9 + 2) * 2;
    const fW = 12;
    const fH = 20;
    g.moveTo(0, 0).lineTo(0, fH).stroke({ color: COL_BRASS_DK, width: 1.5 });
    g.moveTo(0, 0)
      .bezierCurveTo(fW * 0.3, w1, fW * 0.7, w2, fW, w3)
      .lineTo(fW, fH + w3)
      .bezierCurveTo(fW * 0.7, fH + w2, fW * 0.3, fH + w1, 0, fH)
      .closePath()
      .fill({ color: this._playerColor });
  }

  private _updateBanner2(): void {
    const g = this._banner2;
    g.clear();
    const offset = 0.5;
    const w1 = Math.sin((this._time + offset) * FLAG_SPEED) * 2;
    const w2 = Math.sin((this._time + offset) * FLAG_SPEED * 1.3 + 1) * 3;
    const w3 = Math.sin((this._time + offset) * FLAG_SPEED * 0.9 + 2) * 2;
    const fW = 12;
    const fH = 20;
    g.moveTo(0, 0).lineTo(0, fH).stroke({ color: COL_BRASS_DK, width: 1.5 });
    g.moveTo(0, 0)
      .bezierCurveTo(fW * 0.3, w1, fW * 0.7, w2, fW, w3)
      .lineTo(fW, fH + w3)
      .bezierCurveTo(fW * 0.7, fH + w2, fW * 0.3, fH + w1, 0, fH)
      .closePath()
      .fill({ color: this._playerColor });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
