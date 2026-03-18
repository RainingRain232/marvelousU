// ---------------------------------------------------------------------------
// Terraria – Particle effects (mining, combat, torch flames)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { TerrariaCamera } from "./TerrariaCamera";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: number;
  life: number;
  maxLife: number;
  size: number;
}

export class TerrariaFX {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _particles: Particle[] = [];

  constructor() {
    this.container.addChild(this._gfx);
  }

  /** Spawn mining particles at a world position. */
  spawnMiningParticles(wx: number, wy: number, color: number, count = 6): void {
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: wx + 0.5, y: wy + 0.5,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        color, life: 0.5 + Math.random() * 0.5, maxLife: 1,
        size: 2 + Math.random() * 2,
      });
    }
  }

  /** Spawn combat hit particles. */
  spawnHitParticles(wx: number, wy: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      this._particles.push({
        x: wx, y: wy,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 1,
        color: 0xFF4444, life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
        size: 2 + Math.random() * 2,
      });
    }
  }

  /** Spawn torch flame particles near light-emitting blocks. */
  spawnTorchFlame(wx: number, wy: number, color = 0xFFAA00): void {
    if (this._particles.length > 200) return; // Cap
    this._particles.push({
      x: wx + 0.3 + Math.random() * 0.4,
      y: wy + 0.8,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * 2 + 1,
      color, life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
      size: 1.5 + Math.random(),
    });
  }

  update(dt: number): void {
    for (const p of this._particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 8 * dt; // gravity on particles
      p.life -= dt;
    }
    this._particles = this._particles.filter(p => p.life > 0);
  }

  draw(camera: TerrariaCamera): void {
    this._gfx.clear();
    for (const p of this._particles) {
      const { sx, sy } = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, p.life / p.maxLife);
      this._gfx.rect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      this._gfx.fill({ color: p.color, alpha });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
