// TowerMage - Helper to draw a mage peeking out of tower windows.
//
// Draws a simplified mage (torso, arms, head with hat) that can animate
// between idle (peeking) and casting (hands raised with magic effects).
//
// Used by Fire, Ice, Lightning, and Warp towers.

import { Graphics } from "pixi.js";

// ---------------------------------------------------------------------------
// Mage Palette
// ---------------------------------------------------------------------------

export interface MageColors {
  robe: number;
  robeDark: number;
  skin: number;
  hat: number;
  hatTrim: number;
  magic: number;
  magicCore: number;
}

// Healing mage color palette (green robes)
export const MAGE_COLORS_HEAL: MageColors = {
  robe: 0x2ecc71,
  robeDark: 0x1e7f4a,
  skin: 0xffe6cc,
  hat: 0x28b463,
  hatTrim: 0x66cc99,
  magic: 0x4bd96d,
  magicCore: 0xccffd8,
};

export const MAGE_COLORS_LIGHTNING: MageColors = {
  robe: 0x3344aa,
  robeDark: 0x223377,
  skin: 0xffcc99,
  hat: 0x4455cc,
  hatTrim: 0x88aaff,
  magic: 0x4488ff,
  magicCore: 0x88ccff,
};

export const MAGE_COLORS_ICE: MageColors = {
  robe: 0x6699cc,
  robeDark: 0x4477aa,
  skin: 0xffddbb,
  hat: 0x88bbdd,
  hatTrim: 0xaaddff,
  magic: 0xaaddff,
  magicCore: 0xddffff,
};

export const MAGE_COLORS_FIRE: MageColors = {
  robe: 0xaa3322,
  robeDark: 0x771111,
  skin: 0xffcc99,
  hat: 0xcc4433,
  hatTrim: 0xff6644,
  magic: 0xff4400,
  magicCore: 0xffaa00,
};

export const MAGE_COLORS_WARP: MageColors = {
  robe: 0x664488,
  robeDark: 0x442266,
  skin: 0xffccaa,
  hat: 0x775599,
  hatTrim: 0xaa77cc,
  magic: 0x9944ff,
  magicCore: 0xcc88ff,
};

// ---------------------------------------------------------------------------
// TowerMage - Draws a mage in a tower window
// ---------------------------------------------------------------------------

export class TowerMage {
  private _graphics: Graphics;
  private _colors: MageColors;
  private _isCasting: boolean = false;
  private _castTime: number = 0;
  private _peekOffset: number = 0;
  private _peekDirection: number = 1;

  constructor(colors: MageColors) {
    this._colors = colors;
    this._graphics = new Graphics();
  }

  get graphics(): Graphics {
    return this._graphics;
  }

  setCasting(casting: boolean): void {
    if (casting && !this._isCasting) {
      this._castTime = 0;
    }
    this._isCasting = casting;
  }

  tick(dt: number): void {
    this._updatePeek(dt);
    this._draw();
  }

  private _updatePeek(dt: number): void {
    if (this._isCasting) {
      this._castTime += dt;
      this._peekOffset = -8;
    } else {
      this._peekOffset += this._peekDirection * dt * 4;
      if (this._peekOffset > 2) {
        this._peekOffset = 2;
        this._peekDirection = -1;
      } else if (this._peekOffset < -4) {
        this._peekOffset = -4;
        this._peekDirection = 1;
      }
    }
  }

  private _draw(): void {
    const g = this._graphics;
    g.clear();

    const c = this._colors;
    const peek = this._peekOffset;
    const cx = 32;
    const baseY = 50 + peek;

    if (this._isCasting) {
      this._drawCastingMage(g, c, cx, baseY);
    } else {
      this._drawIdleMage(g, c, cx, baseY);
    }
  }

  private _drawIdleMage(
    g: Graphics,
    c: MageColors,
    cx: number,
    baseY: number,
  ): void {
    const robeTop = baseY - 14;
    const torsoTop = robeTop - 5;
    const faceY = torsoTop - 4;
    const hatBase = faceY - 5;

    g.ellipse(cx, baseY, 8, 4).fill({ color: c.robeDark, alpha: 0.5 });

    g.moveTo(cx - 6, robeTop)
      .lineTo(cx - 5, baseY - 2)
      .lineTo(cx + 5, baseY - 2)
      .lineTo(cx + 6, robeTop)
      .closePath();
    g.fill({ color: c.robe });

    g.moveTo(cx - 5, torsoTop)
      .lineTo(cx - 4, robeTop)
      .lineTo(cx + 4, robeTop)
      .lineTo(cx + 5, torsoTop)
      .closePath();
    g.fill({ color: c.robe });

    g.rect(cx - 3, torsoTop - 2, 6, 3).fill({ color: c.skin });

    g.moveTo(cx - 4, faceY)
      .lineTo(cx - 3, faceY + 5)
      .lineTo(cx + 3, faceY + 5)
      .lineTo(cx + 4, faceY)
      .closePath();
    g.fill({ color: c.skin });

    g.circle(cx - 1.5, faceY + 1.5, 0.5).fill({ color: 0x222222 });
    g.circle(cx + 1.5, faceY + 1.5, 0.5).fill({ color: 0x222222 });

    g.moveTo(cx - 5, hatBase)
      .lineTo(cx, hatBase - 8)
      .lineTo(cx + 5, hatBase)
      .closePath();
    g.fill({ color: c.hat });
    g.rect(cx - 6, hatBase - 1, 12, 2).fill({ color: c.hatTrim });

    g.moveTo(cx - 4, torsoTop)
      .lineTo(cx - 8, torsoTop + 6)
      .lineTo(cx - 6, torsoTop + 7)
      .lineTo(cx - 3, torsoTop + 2)
      .closePath();
    g.fill({ color: c.skin });

    g.moveTo(cx + 4, torsoTop)
      .lineTo(cx + 8, torsoTop + 6)
      .lineTo(cx + 6, torsoTop + 7)
      .lineTo(cx + 3, torsoTop + 2)
      .closePath();
    g.fill({ color: c.skin });
  }

  private _drawCastingMage(
    g: Graphics,
    c: MageColors,
    cx: number,
    baseY: number,
  ): void {
    const robeTop = baseY - 14;
    const torsoTop = robeTop - 5;
    const faceY = torsoTop - 4;
    const hatBase = faceY - 5;
    const armRaise = 8;

    const castPhase = Math.min(this._castTime / 0.3, 1);
    const armUp = armRaise * castPhase;

    g.ellipse(cx, baseY, 8, 4).fill({ color: c.robeDark, alpha: 0.5 });

    g.moveTo(cx - 6, robeTop)
      .lineTo(cx - 5, baseY - 2)
      .lineTo(cx + 5, baseY - 2)
      .lineTo(cx + 6, robeTop)
      .closePath();
    g.fill({ color: c.robe });

    g.moveTo(cx - 5, torsoTop)
      .lineTo(cx - 4, robeTop)
      .lineTo(cx + 4, robeTop)
      .lineTo(cx + 5, torsoTop)
      .closePath();
    g.fill({ color: c.robe });

    g.rect(cx - 3, torsoTop - 2, 6, 3).fill({ color: c.skin });

    g.moveTo(cx - 4, faceY)
      .lineTo(cx - 3, faceY + 5)
      .lineTo(cx + 3, faceY + 5)
      .lineTo(cx + 4, faceY)
      .closePath();
    g.fill({ color: c.skin });

    g.circle(cx - 1.5, faceY + 1.5, 0.5).fill({ color: 0x222222 });
    g.circle(cx + 1.5, faceY + 1.5, 0.5).fill({ color: 0x222222 });

    g.moveTo(cx - 5, hatBase)
      .lineTo(cx, hatBase - 10)
      .lineTo(cx + 5, hatBase)
      .closePath();
    g.fill({ color: c.hat });
    g.rect(cx - 6, hatBase - 1, 12, 2).fill({ color: c.hatTrim });

    g.moveTo(cx - 4, torsoTop)
      .lineTo(cx - 10, torsoTop + 4 - armUp)
      .lineTo(cx - 8, torsoTop + 5 - armUp)
      .lineTo(cx - 3, torsoTop + 2)
      .closePath();
    g.fill({ color: c.skin });

    g.moveTo(cx + 4, torsoTop)
      .lineTo(cx + 10, torsoTop + 4 - armUp)
      .lineTo(cx + 8, torsoTop + 5 - armUp)
      .lineTo(cx + 3, torsoTop + 2)
      .closePath();
    g.fill({ color: c.skin });

    const magicPulse = (Math.sin(this._castTime * 10) + 1) * 0.5;
    const lHandX = cx - 9;
    const lHandY = torsoTop + 3 - armUp;
    const rHandX = cx + 9;
    const rHandY = torsoTop + 3 - armUp;

    g.circle(lHandX, lHandY, 4 + magicPulse * 2).fill({
      color: c.magic,
      alpha: 0.3 + magicPulse * 0.2,
    });
    g.circle(lHandX, lHandY, 2).fill({ color: c.magicCore });

    g.circle(rHandX, rHandY, 4 + magicPulse * 2).fill({
      color: c.magic,
      alpha: 0.3 + magicPulse * 0.2,
    });
    g.circle(rHandX, rHandY, 2).fill({ color: c.magicCore });

    g.moveTo(lHandX, lHandY)
      .lineTo(rHandX, rHandY)
      .stroke({ color: c.magic, width: 1, alpha: 0.3 });
  }

  destroy(): void {
    this._graphics.destroy();
  }
}
