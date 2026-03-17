/**
 * Floating ambient particles — varied shapes (circles, diamonds, hexagons, stars)
 * that drift upward with trailing shimmer effects.
 * Used on StartScreen and MenuScreen backgrounds for a fantasy feel.
 */
import { Container, Graphics } from "pixi.js";

const enum Shape {
  CIRCLE,
  DIAMOND,
  HEXAGON,
  STAR,
  TRIANGLE,
}

interface Particle {
  gfx: Graphics;
  trail: Graphics;
  x: number;
  y: number;
  speed: number;
  driftX: number;
  driftSpeed: number;
  peakAlpha: number;
  size: number;
  phase: number;
  duration: number;
  shape: Shape;
  rotation: number;
  rotSpeed: number;
  trailPositions: { x: number; y: number; alpha: number }[];
}

const COLORS = [0xffd700, 0xffe033, 0xffcc00, 0xffdd55, 0xffee66, 0xeebb33, 0xfff0aa];

function drawShape(g: Graphics, shape: Shape, size: number, color: number, alpha: number): void {
  switch (shape) {
    case Shape.CIRCLE:
      g.circle(0, 0, size);
      g.fill({ color, alpha });
      // Inner highlight
      g.circle(-size * 0.2, -size * 0.2, size * 0.35);
      g.fill({ color: 0xffffff, alpha: alpha * 0.3 });
      break;

    case Shape.DIAMOND: {
      const s = size * 1.2;
      g.moveTo(0, -s);
      g.lineTo(s * 0.6, 0);
      g.lineTo(0, s);
      g.lineTo(-s * 0.6, 0);
      g.closePath();
      g.fill({ color, alpha });
      g.stroke({ color: 0xffffff, alpha: alpha * 0.3, width: 0.5 });
      break;
    }

    case Shape.HEXAGON: {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const x = Math.cos(a) * size;
        const y = Math.sin(a) * size;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.fill({ color, alpha });
      g.stroke({ color: 0xffffff, alpha: alpha * 0.2, width: 0.3 });
      break;
    }

    case Shape.STAR: {
      const outerR = size * 1.3;
      const innerR = size * 0.5;
      for (let i = 0; i < 5; i++) {
        const outerA = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerA = outerA + Math.PI / 5;
        const ox = Math.cos(outerA) * outerR;
        const oy = Math.sin(outerA) * outerR;
        const ix = Math.cos(innerA) * innerR;
        const iy = Math.sin(innerA) * innerR;
        if (i === 0) g.moveTo(ox, oy);
        else g.lineTo(ox, oy);
        g.lineTo(ix, iy);
      }
      g.closePath();
      g.fill({ color, alpha });
      break;
    }

    case Shape.TRIANGLE: {
      const s = size * 1.2;
      g.moveTo(0, -s);
      g.lineTo(s * 0.87, s * 0.5);
      g.lineTo(-s * 0.87, s * 0.5);
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
  }
}

export class AmbientParticles {
  readonly container = new Container();
  private _particles: Particle[] = [];
  private _screenW = 0;
  private _screenH = 0;

  constructor(count = 120) {
    const shapes = [Shape.CIRCLE, Shape.DIAMOND, Shape.HEXAGON, Shape.STAR, Shape.TRIANGLE];

    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 1.5 + Math.random() * 3;
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      const gfx = new Graphics();
      drawShape(gfx, shape, size, color, 1);
      gfx.alpha = 0;
      this.container.addChild(gfx);

      // Trail graphics (rendered behind the particle)
      const trail = new Graphics();
      trail.alpha = 0;
      this.container.addChildAt(trail, 0);

      this._particles.push({
        gfx,
        trail,
        x: 0,
        y: 0,
        speed: 15 + Math.random() * 40,
        driftX: 5 + Math.random() * 20,
        driftSpeed: 0.3 + Math.random() * 0.8,
        peakAlpha: 0.25 + Math.random() * 0.5,
        size,
        phase: Math.random(),
        duration: 6 + Math.random() * 12,
        shape,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        trailPositions: [],
      });
    }
  }

  resize(w: number, h: number): void {
    this._screenW = w;
    this._screenH = h;

    for (const p of this._particles) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.trailPositions = [];
    }
  }

  update(dt: number): void {
    const sw = this._screenW;
    const sh = this._screenH;
    if (sw === 0 || sh === 0) return;

    for (const p of this._particles) {
      p.phase += dt / p.duration;
      if (p.phase >= 1) {
        p.phase -= 1;
        p.x = Math.random() * sw;
        p.y = sh + 10;
        p.trailPositions = [];
      }

      // Move upward
      p.y -= p.speed * dt;

      // Rotate
      p.rotation += p.rotSpeed * dt;

      // Fade in/out
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
      const currentX = p.x + sway;
      const currentY = p.y;

      p.gfx.position.set(currentX, currentY);
      p.gfx.alpha = alpha;
      p.gfx.rotation = p.rotation;

      // Shrink as they rise
      const scale = 0.3 + 0.7 * (1 - p.phase);
      p.gfx.scale.set(scale);

      // Update trail (only for stars and diamonds — the fancier shapes)
      if (p.shape === Shape.STAR || p.shape === Shape.DIAMOND || p.shape === Shape.HEXAGON) {
        p.trailPositions.push({ x: currentX, y: currentY, alpha });
        // Keep max 6 trail points
        if (p.trailPositions.length > 6) p.trailPositions.shift();

        p.trail.clear();
        if (p.trailPositions.length >= 2) {
          for (let ti = 0; ti < p.trailPositions.length - 1; ti++) {
            const tp = p.trailPositions[ti];
            const trailAlpha = (ti / p.trailPositions.length) * alpha * 0.3;
            p.trail.circle(tp.x, tp.y, p.size * scale * 0.4 * (ti / p.trailPositions.length));
            p.trail.fill({ color: 0xffd700, alpha: trailAlpha });
          }
        }
        p.trail.alpha = 1;
      }
    }
  }
}
