/**
 * Ornate glowing rune decorations at the corners of a panel.
 * Each corner features a multi-layered diamond with arcane circle,
 * connecting filigree lines between corners, and pulsing glow effects.
 */
import { Container, Graphics } from "pixi.js";

const RUNE_SIZE = 14;
const GLOW_SIZE = 28;
const COLOR = 0xffd700;
const ACCENT = 0xccaa44;
const CYCLE = 6; // seconds per full glow cycle

export class RuneCorners {
  readonly container = new Container();
  private _runes: { gfx: Container; phase: number }[] = [];
  private _filigree = new Graphics();
  private _offX = 10;

  build(cardW: number, cardH: number): void {
    this.container.removeChildren();
    this._runes = [];

    // Filigree connecting lines between corners
    this._filigree = new Graphics();
    this._drawFiligree(cardW, cardH);
    this.container.addChild(this._filigree);

    const positions = [
      { x: -this._offX, y: -this._offX },
      { x: cardW + this._offX, y: -this._offX },
      { x: -this._offX, y: cardH + this._offX },
      { x: cardW + this._offX, y: cardH + this._offX },
    ];

    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      const runeContainer = new Container();
      runeContainer.position.set(pos.x, pos.y);

      // Layer 1: Outermost soft glow
      const outerGlow = new Graphics()
        .circle(0, 0, GLOW_SIZE * 1.4)
        .fill({ color: COLOR, alpha: 0.03 });
      runeContainer.addChild(outerGlow);

      // Layer 2: Inner glow ring
      const glow = new Graphics()
        .circle(0, 0, GLOW_SIZE)
        .fill({ color: COLOR, alpha: 0.06 });
      runeContainer.addChild(glow);

      // Layer 3: Arcane circle (ring with tick marks)
      const arcaneCircle = new Graphics();
      const arcR = RUNE_SIZE * 1.5;
      arcaneCircle.circle(0, 0, arcR);
      arcaneCircle.stroke({ color: COLOR, alpha: 0.25, width: 0.8 });
      // Tick marks around the circle (12 ticks)
      for (let t = 0; t < 12; t++) {
        const a = (t * Math.PI * 2) / 12;
        const innerR = arcR - 3;
        arcaneCircle.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
        arcaneCircle.lineTo(Math.cos(a) * arcR, Math.sin(a) * arcR);
        arcaneCircle.stroke({ color: COLOR, alpha: 0.2, width: 0.5 });
      }
      // Inner arcane circle
      arcaneCircle.circle(0, 0, arcR * 0.6);
      arcaneCircle.stroke({ color: ACCENT, alpha: 0.15, width: 0.5 });
      runeContainer.addChild(arcaneCircle);

      // Layer 4: Outer diamond (larger, transparent)
      const outerDiamond = new Graphics();
      const outerS = RUNE_SIZE * 1.2;
      outerDiamond
        .poly([0, -outerS, outerS, 0, 0, outerS, -outerS, 0])
        .stroke({ color: COLOR, alpha: 0.35, width: 0.8 });
      runeContainer.addChild(outerDiamond);

      // Layer 5: Main diamond shape (filled)
      const diamond = new Graphics()
        .poly([0, -RUNE_SIZE, RUNE_SIZE, 0, 0, RUNE_SIZE, -RUNE_SIZE, 0])
        .fill({ color: COLOR, alpha: 0.6 })
        .poly([0, -RUNE_SIZE, RUNE_SIZE, 0, 0, RUNE_SIZE, -RUNE_SIZE, 0])
        .stroke({ color: COLOR, alpha: 0.9, width: 1.5 });
      runeContainer.addChild(diamond);

      // Layer 6: Inner diamond highlight
      const innerS = RUNE_SIZE * 0.45;
      const innerDiamond = new Graphics()
        .poly([0, -innerS, innerS, 0, 0, innerS, -innerS, 0])
        .fill({ color: 0xffffff, alpha: 0.2 })
        .poly([0, -innerS, innerS, 0, 0, innerS, -innerS, 0])
        .stroke({ color: 0xffffff, alpha: 0.4, width: 0.5 });
      runeContainer.addChild(innerDiamond);

      // Layer 7: Tiny central gem (circle)
      const gem = new Graphics()
        .circle(0, 0, 2.5)
        .fill({ color: 0xffffff, alpha: 0.6 });
      runeContainer.addChild(gem);

      // Layer 8: Cardinal point dots (4 small circles on the diamond edges)
      const dotR = 1.5;
      const dotDist = RUNE_SIZE * 0.75;
      for (let d = 0; d < 4; d++) {
        const da = (d * Math.PI) / 2 - Math.PI / 2;
        const dot = new Graphics()
          .circle(Math.cos(da) * dotDist, Math.sin(da) * dotDist, dotR)
          .fill({ color: COLOR, alpha: 0.5 });
        runeContainer.addChild(dot);
      }

      this.container.addChild(runeContainer);
      this._runes.push({
        gfx: runeContainer,
        phase: i * 0.25,
      });
    }
  }

  private _drawFiligree(cardW: number, cardH: number): void {
    const g = this._filigree;
    g.clear();
    const off = this._offX;
    const corners = [
      { x: -off, y: -off },
      { x: cardW + off, y: -off },
      { x: cardW + off, y: cardH + off },
      { x: -off, y: cardH + off },
    ];

    // Connecting lines between adjacent corners with decorative midpoints
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];
    for (const [a, b] of edges) {
      const ca = corners[a];
      const cb = corners[b];
      const mx = (ca.x + cb.x) / 2;
      const my = (ca.y + cb.y) / 2;

      // Main connecting line
      g.moveTo(ca.x, ca.y);
      g.lineTo(cb.x, cb.y);
      g.stroke({ color: COLOR, alpha: 0.08, width: 0.5 });

      // Small diamond ornament at midpoint
      const ds = 4;
      g.moveTo(mx, my - ds);
      g.lineTo(mx + ds, my);
      g.lineTo(mx, my + ds);
      g.lineTo(mx - ds, my);
      g.closePath();
      g.fill({ color: COLOR, alpha: 0.1 });
      g.stroke({ color: COLOR, alpha: 0.15, width: 0.5 });

      // Quarter-point dots
      const q1x = ca.x + (cb.x - ca.x) * 0.25;
      const q1y = ca.y + (cb.y - ca.y) * 0.25;
      const q3x = ca.x + (cb.x - ca.x) * 0.75;
      const q3y = ca.y + (cb.y - ca.y) * 0.75;
      g.circle(q1x, q1y, 1.5);
      g.fill({ color: COLOR, alpha: 0.08 });
      g.circle(q3x, q3y, 1.5);
      g.fill({ color: COLOR, alpha: 0.08 });
    }

    // Cross-hair lines at center of panel
    const cx = cardW / 2;
    const cy = cardH / 2;
    const crossLen = 8;
    g.moveTo(cx - crossLen, cy);
    g.lineTo(cx + crossLen, cy);
    g.stroke({ color: COLOR, alpha: 0.04, width: 0.5 });
    g.moveTo(cx, cy - crossLen);
    g.lineTo(cx, cy + crossLen);
    g.stroke({ color: COLOR, alpha: 0.04, width: 0.5 });
  }

  update(dt: number): void {
    for (const r of this._runes) {
      r.phase = (r.phase + dt / CYCLE) % 1;
      const t = Math.sin(r.phase * Math.PI * 2);
      const alpha = 0.3 + 0.7 * (t * 0.5 + 0.5);
      r.gfx.alpha = alpha;
    }
    // Subtle pulse on filigree
    const ft = Math.sin(Date.now() / 2000 * Math.PI * 2);
    this._filigree.alpha = 0.7 + 0.3 * (ft * 0.5 + 0.5);
  }
}
