// Fireball FX — ParticleContainer trail + explosion burst.
//
// Trail:   ember particles emitted continuously while the orb is in flight.
//          Orange/yellow tint, small scale, fade out over 0.4 s.
// Orb:     single Graphics circle that moves via gsap tween (matches sim speed).
// Impact:  ring of 20 spark particles + large flash circle on hit.
//
// All trail/spark particles share a single ParticlePool (512 particles).
// The pool is created lazily on first `init()` call once the renderer is ready.

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

// Trail emit rate: one particle burst every TRAIL_INTERVAL seconds
const TRAIL_INTERVAL = 0.04;
// Number of particles per trail burst
const TRAIL_PER_BURST = 3;
// Explosion sparks on impact
const IMPACT_SPARKS = 20;

// Ember tints (randomly picked per particle)
const EMBER_TINTS = [0xff4400, 0xff8800, 0xffcc00, 0xff2200];

// ---------------------------------------------------------------------------
// Per-projectile state
// ---------------------------------------------------------------------------

interface FireballEntry {
  orb: Graphics;
  tween: gsap.core.Tween;
  trailTimer: number;
}

// ---------------------------------------------------------------------------
// FireballFX
// ---------------------------------------------------------------------------

export class FireballFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, FireballEntry>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    // Create particle pool with a 6px circle texture
    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 6),
      512,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      this._spawnFireball(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      this._onHit(projectileId);
    });
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._pool.update(dt);

    const toDelete: string[] = [];

    for (const [id, entry] of this._active) {
      // Emit trail particles while orb is still moving
      if (entry.orb.parent) {
        entry.trailTimer -= dt;
        if (entry.trailTimer <= 0) {
          entry.trailTimer = TRAIL_INTERVAL;
          this._emitTrailBurst(entry.orb.x, entry.orb.y);
        }
      }

      // Clean up once tween done and no remaining trail particles
      if (!entry.tween.isActive() && !entry.orb.parent) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) this._active.delete(id);
  };

  // ---------------------------------------------------------------------------
  // Spawn fireball orb + start tween
  // ---------------------------------------------------------------------------

  private _spawnFireball(
    id: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    // Orb: bright core circle
    const orb = new Graphics()
      .circle(0, 0, 10)
      .fill({ color: 0xff4400 })
      .circle(0, 0, 6)
      .fill({ color: 0xffcc00 });
    orb.position.set(ox, oy);
    this._container.addChild(orb);

    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (10 * TS);

    const tween = gsap.to(orb.position, {
      x: tx,
      y: ty,
      duration,
      ease: "none",
      onComplete: () => {
        if (orb.parent) this._container.removeChild(orb);
      },
    });

    this._active.set(id, { orb, tween, trailTimer: 0 });
  }

  // ---------------------------------------------------------------------------
  // Trail burst
  // ---------------------------------------------------------------------------

  private _emitTrailBurst(cx: number, cy: number): void {
    for (let i = 0; i < TRAIL_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      const tint = EMBER_TINTS[Math.floor(Math.random() * EMBER_TINTS.length)];
      this._pool.emit({
        x: cx + (Math.random() - 0.5) * 6,
        y: cy + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.15,
        scaleStart: 0.8 + Math.random() * 0.4,
        scaleEnd: 0.1,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 40,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Impact
  // ---------------------------------------------------------------------------

  private _onHit(id: string): void {
    const entry = this._active.get(id);
    if (!entry) return;

    entry.tween.kill();
    const cx = entry.orb.x;
    const cy = entry.orb.y;

    if (entry.orb.parent) this._container.removeChild(entry.orb);

    // Ring of spark particles
    for (let i = 0; i < IMPACT_SPARKS; i++) {
      const angle = (i / IMPACT_SPARKS) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      const tint = EMBER_TINTS[Math.floor(Math.random() * EMBER_TINTS.length)];
      this._pool.emit({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        scaleStart: 1.0 + Math.random() * 0.5,
        scaleEnd: 0.1,
        alphaStart: 1.0,
        alphaEnd: 0,
        tint,
        gravity: 80,
      });
    }

    // Flash circle (Graphics — single large burst, no pool needed)
    const flash = new Graphics().circle(0, 0, 28).fill({ color: 0xff6600 });
    flash.position.set(cx, cy);
    flash.alpha = 0.85;
    this._container.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => {
        if (flash.parent) this._container.removeChild(flash);
      },
    });

    // Mark entry for cleanup (tween is dead, orb removed)
    this._active.set(id, { ...entry, tween: gsap.to({}, { duration: 0 }) });
  }
}

export const fireballFX = new FireballFX();
