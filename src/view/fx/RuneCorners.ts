/**
 * Four glowing diamond runes at the corners of a panel.
 * Pulses each corner's alpha in sequence for a magical feel.
 */
import { Container, Graphics } from "pixi.js";

const RUNE_SIZE = 14;
const GLOW_SIZE = 28;
const COLOR = 0xffd700;
const CYCLE = 6; // seconds per full glow cycle

export class RuneCorners {
  readonly container = new Container();
  private _runes: { gfx: Container; phase: number }[] = [];
  private _offX = 10; // offset outside card edges

  /**
   * @param cardW  card width
   * @param cardH  card height
   */
  build(cardW: number, cardH: number): void {
    // Remove old runes if rebuilding
    this.container.removeChildren();
    this._runes = [];

    const positions = [
      { x: -this._offX, y: -this._offX },                   // top-left
      { x: cardW + this._offX, y: -this._offX },             // top-right
      { x: -this._offX, y: cardH + this._offX },             // bottom-left
      { x: cardW + this._offX, y: cardH + this._offX },      // bottom-right
    ];

    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      const runeContainer = new Container();
      runeContainer.position.set(pos.x, pos.y);

      // Outer glow
      const glow = new Graphics()
        .circle(0, 0, GLOW_SIZE)
        .fill({ color: COLOR, alpha: 0.08 });
      runeContainer.addChild(glow);

      // Diamond shape (rotated square)
      const diamond = new Graphics()
        .poly([0, -RUNE_SIZE, RUNE_SIZE, 0, 0, RUNE_SIZE, -RUNE_SIZE, 0])
        .fill({ color: COLOR, alpha: 0.6 })
        .poly([0, -RUNE_SIZE, RUNE_SIZE, 0, 0, RUNE_SIZE, -RUNE_SIZE, 0])
        .stroke({ color: COLOR, alpha: 0.9, width: 1.5 });
      runeContainer.addChild(diamond);

      this.container.addChild(runeContainer);
      this._runes.push({
        gfx: runeContainer,
        phase: i * 0.25, // stagger each corner
      });
    }
  }

  /** Call every frame with dt in seconds. */
  update(dt: number): void {
    for (const r of this._runes) {
      r.phase = (r.phase + dt / CYCLE) % 1;
      // Sine pulse: oscillate between 0.3 and 1.0
      const t = Math.sin(r.phase * Math.PI * 2);
      const alpha = 0.3 + 0.7 * (t * 0.5 + 0.5);
      r.gfx.alpha = alpha;
    }
  }
}
