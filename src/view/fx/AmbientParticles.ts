/**
 * Floating ambient particles — gold/amber/white dots that drift upward.
 * Used on StartScreen and MenuScreen backgrounds for a fantasy feel.
 */
import { Container, Graphics } from "pixi.js";

interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  speed: number;       // px per second upward
  driftX: number;      // horizontal sway amplitude
  driftSpeed: number;  // sway frequency
  peakAlpha: number;
  size: number;
  phase: number;       // current animation phase [0..1]
  duration: number;    // total cycle duration in seconds
}

const COLORS = [0xffd700, 0xffe033, 0xffcc00, 0xffdd55, 0xffee66];

export class AmbientParticles {
  readonly container = new Container();
  private _particles: Particle[] = [];
  private _screenW = 0;
  private _screenH = 0;

  constructor(count = 120) {
    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 1.5 + Math.random() * 3;
      const gfx = new Graphics()
        .circle(0, 0, size)
        .fill({ color, alpha: 1 });
      gfx.alpha = 0;
      this.container.addChild(gfx);

      this._particles.push({
        gfx,
        x: 0,
        y: 0,
        speed: 15 + Math.random() * 40,
        driftX: 5 + Math.random() * 20,
        driftSpeed: 0.3 + Math.random() * 0.8,
        peakAlpha: 0.25 + Math.random() * 0.5,
        size,
        phase: Math.random(), // stagger start
        duration: 6 + Math.random() * 12,
      });
    }
  }

  /** Call when screen size changes to reposition spawn areas. */
  resize(w: number, h: number): void {
    this._screenW = w;
    this._screenH = h;

    // Re-randomize positions so they fill the new screen
    for (const p of this._particles) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
    }
  }

  /** Call every frame with delta time in seconds. */
  update(dt: number): void {
    const sw = this._screenW;
    const sh = this._screenH;
    if (sw === 0 || sh === 0) return;

    for (const p of this._particles) {
      p.phase += dt / p.duration;
      if (p.phase >= 1) {
        // Reset — respawn at a random bottom position
        p.phase -= 1;
        p.x = Math.random() * sw;
        p.y = sh + 10;
      }

      // Move upward
      p.y -= p.speed * dt;

      // Fade in/out based on phase
      let alpha: number;
      if (p.phase < 0.15) {
        alpha = (p.phase / 0.15) * p.peakAlpha;
      } else if (p.phase > 0.85) {
        alpha = ((1 - p.phase) / 0.15) * p.peakAlpha;
      } else {
        alpha = p.peakAlpha;
      }

      // Horizontal sway
      const sway = Math.sin(p.phase * Math.PI * 2 * p.driftSpeed) * p.driftX;

      p.gfx.position.set(p.x + sway, p.y);
      p.gfx.alpha = alpha;

      // Shrink as they rise
      const scale = 0.3 + 0.7 * (1 - p.phase);
      p.gfx.scale.set(scale);
    }
  }
}
