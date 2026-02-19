// IceBall FX — icy blue orb with frost trail + freeze burst on impact.
//
// Trail:   ice-shard particles emitted while the orb is in flight.
//          Blue/white tint, fade out over 0.35 s.
// Orb:     single Graphics circle (pale blue core + white highlight).
// Impact:  ring of ice-crystal particles + expanding frost ring.
//
// All trail/shard particles share a single ParticlePool (512 particles).

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

// Trail emit rate
const TRAIL_INTERVAL = 0.05;
const TRAIL_PER_BURST = 2;
// Shards on impact
const IMPACT_SHARDS = 16;

// Ice tints
const ICE_TINTS = [0xaaddff, 0x88ccff, 0xffffff, 0x66aaee];

// ---------------------------------------------------------------------------
// Per-projectile state
// ---------------------------------------------------------------------------

interface IceBallEntry {
  orb: Graphics;
  tween: gsap.core.Tween;
  trailTimer: number;
}

// ---------------------------------------------------------------------------
// IceBallFX
// ---------------------------------------------------------------------------

export class IceBallFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, IceBallEntry>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 5),
      512,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      // Only handle iceball projectiles (id prefix "ib-")
      if (!projectileId.startsWith("ib-")) return;
      this._spawnIceBall(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      if (!projectileId.startsWith("ib-")) return;
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
      if (entry.orb.parent) {
        entry.trailTimer -= dt;
        if (entry.trailTimer <= 0) {
          entry.trailTimer = TRAIL_INTERVAL;
          this._emitTrailBurst(entry.orb.x, entry.orb.y);
        }
      }

      if (!entry.tween.isActive() && !entry.orb.parent) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) this._active.delete(id);
  };

  // ---------------------------------------------------------------------------
  // Spawn iceball orb
  // ---------------------------------------------------------------------------

  private _spawnIceBall(
    id: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    // Orb: pale blue outer + white inner highlight
    const orb = new Graphics()
      .circle(0, 0, 9)
      .fill({ color: 0x44aaff })
      .circle(0, 0, 5)
      .fill({ color: 0xddeeff });
    orb.position.set(ox, oy);
    this._container.addChild(orb);

    // Speed matches IceBall.ts (8 tiles/sec)
    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (8 * TS);

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
      const speed = 15 + Math.random() * 20;
      const tint = ICE_TINTS[Math.floor(Math.random() * ICE_TINTS.length)];
      this._pool.emit({
        x: cx + (Math.random() - 0.5) * 5,
        y: cy + (Math.random() - 0.5) * 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.15,
        scaleStart: 0.7 + Math.random() * 0.3,
        scaleEnd: 0.05,
        alphaStart: 0.85,
        alphaEnd: 0,
        tint,
        gravity: 0, // ice floats / drifts
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

    // Radial ice-shard particles
    for (let i = 0; i < IMPACT_SHARDS; i++) {
      const angle = (i / IMPACT_SHARDS) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 60 + Math.random() * 50;
      const tint = ICE_TINTS[Math.floor(Math.random() * ICE_TINTS.length)];
      this._pool.emit({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.2,
        scaleStart: 1.0 + Math.random() * 0.4,
        scaleEnd: 0.05,
        alphaStart: 1.0,
        alphaEnd: 0,
        tint,
        gravity: 20,
      });
    }

    // Frost ring: expanding icy circle
    const ring = new Graphics().circle(0, 0, 20).stroke({ color: 0xaaddff, alpha: 0.9, width: 2.5 });
    ring.position.set(cx, cy);
    this._container.addChild(ring);
    gsap.to(ring.scale, {
      x: 3,
      y: 3,
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(ring, {
      alpha: 0,
      duration: 0.4,
      ease: "power1.in",
      onComplete: () => {
        if (ring.parent) this._container.removeChild(ring);
      },
    });

    // Brief flash
    const flash = new Graphics().circle(0, 0, 22).fill({ color: 0xaaddff });
    flash.position.set(cx, cy);
    flash.alpha = 0.6;
    this._container.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 0.25,
      ease: "power2.out",
      onComplete: () => {
        if (flash.parent) this._container.removeChild(flash);
      },
    });

    this._active.set(id, { ...entry, tween: gsap.to({}, { duration: 0 }) });
  }
}

export const iceBallFX = new IceBallFX();
