// Shared particle system backed by PixiJS 8 ParticleContainer.
//
// Usage:
//   const pool = new ParticlePool(texture, 512);
//   pool.mount(container); // add ParticleContainer to a display layer
//
//   // Emit a particle:
//   const p = pool.emit({ x, y, vx, vy, life, scaleStart, scaleEnd, alphaStart, alphaEnd, tint });
//
//   // Each frame:
//   pool.update(dt);
//
// ParticleContainer batches all sprites into a single draw call — much faster
// than individual Graphics objects for high-volume effects.

import {
  ParticleContainer,
  Particle,
  Texture,
  RenderTexture,
  Graphics,
  type Renderer,
} from "pixi.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParticleOptions {
  x: number;
  y: number;
  /** Velocity pixels/second */
  vx: number;
  vy: number;
  /** Total lifespan in seconds */
  life: number;
  scaleStart: number;
  scaleEnd: number;
  alphaStart: number;
  alphaEnd: number;
  tint?: number;
  /** Gravity pixels/second² (positive = down). Default 0. */
  gravity?: number;
}

interface LiveParticle {
  particle: Particle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scaleStart: number;
  scaleEnd: number;
  alphaStart: number;
  alphaEnd: number;
  gravity: number;
}

// ---------------------------------------------------------------------------
// ParticlePool
// ---------------------------------------------------------------------------

export class ParticlePool {
  private _pc: ParticleContainer;
  private _live: LiveParticle[] = [];
  private _free: Particle[] = [];
  private _texture: Texture;

  /**
   * @param texture       Texture used for every particle (typically a small white circle).
   * @param maxParticles  Maximum simultaneous particles (pre-allocated).
   */
  constructor(texture: Texture, maxParticles = 256) {
    this._texture = texture;
    this._pc = new ParticleContainer();

    // Pre-allocate particles into the free pool
    for (let i = 0; i < maxParticles; i++) {
      this._free.push(new Particle({ texture }));
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Add the ParticleContainer to a display layer. */
  mount(parent: { addChild: (c: ParticleContainer) => void }): void {
    parent.addChild(this._pc);
  }

  // ---------------------------------------------------------------------------
  // Emit
  // ---------------------------------------------------------------------------

  /**
   * Emit a single particle. No-ops if the pool is exhausted.
   * Returns the live-particle record or null if pool is full.
   */
  emit(opts: ParticleOptions): LiveParticle | null {
    const particle = this._free.pop();
    if (!particle) return null; // pool exhausted

    particle.x = opts.x;
    particle.y = opts.y;
    particle.scaleX = opts.scaleStart;
    particle.scaleY = opts.scaleStart;
    particle.alpha = opts.alphaStart;
    particle.tint = opts.tint ?? 0xffffff;
    particle.texture = this._texture;

    this._pc.addParticle(particle);

    const lp: LiveParticle = {
      particle,
      vx: opts.vx,
      vy: opts.vy,
      life: opts.life,
      maxLife: opts.life,
      scaleStart: opts.scaleStart,
      scaleEnd: opts.scaleEnd,
      alphaStart: opts.alphaStart,
      alphaEnd: opts.alphaEnd,
      gravity: opts.gravity ?? 0,
    };
    this._live.push(lp);
    return lp;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  update(dt: number): void {
    for (let i = this._live.length - 1; i >= 0; i--) {
      const lp = this._live[i];
      lp.life -= dt;

      if (lp.life <= 0) {
        this._pc.removeParticle(lp.particle);
        this._free.push(lp.particle);
        this._live.splice(i, 1);
        continue;
      }

      const t = 1 - lp.life / lp.maxLife; // 0 → 1 over lifetime

      // Integrate position
      lp.vy += lp.gravity * dt;
      lp.particle.x += lp.vx * dt;
      lp.particle.y += lp.vy * dt;

      // Interpolate scale and alpha
      const scale = lp.scaleStart + (lp.scaleEnd - lp.scaleStart) * t;
      const alpha = lp.alphaStart + (lp.alphaEnd - lp.alphaStart) * t;
      lp.particle.scaleX = scale;
      lp.particle.scaleY = scale;
      lp.particle.alpha = Math.max(0, alpha);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Remove all live particles and return them to the free pool. */
  clear(): void {
    for (const lp of this._live) {
      this._pc.removeParticle(lp.particle);
      this._free.push(lp.particle);
    }
    this._live = [];
  }

  get liveCount(): number {
    return this._live.length;
  }
  get freeCount(): number {
    return this._free.length;
  }

  // ---------------------------------------------------------------------------
  // Static helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a small filled-circle texture suitable for particles.
   * Call once at startup using the app renderer.
   */
  static createCircleTexture(
    renderer: Renderer,
    radius = 6,
    color = 0xffffff,
  ): Texture {
    const g = new Graphics().circle(0, 0, radius).fill({ color });
    const rt = RenderTexture.create({ width: radius * 2, height: radius * 2 });
    // Offset so circle center aligns with texture centre
    g.position.set(radius, radius);
    renderer.render({ container: g, target: rt });
    g.destroy();
    return rt;
  }
}
