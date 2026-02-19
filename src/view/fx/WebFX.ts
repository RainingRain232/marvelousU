// WebFX — dark sticky web/net projectile with splat on impact.
//
// Orb:    dark greenish blob that arcs toward the target.
// Trail:  sparse web-thread particles drifting behind.
// Impact: web strands radiating outward + sticky splat circle.
//
// Handles both "web-" (spider) and "net-" (gladiator) projectile IDs.

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const TRAIL_INTERVAL = 0.07;
const TRAIL_PER_BURST = 2;
const IMPACT_STRANDS = 12;

// Web tints: dark greens and near-blacks
const WEB_TINTS = [0x2a4a1a, 0x1a2e0a, 0x3d5c1e, 0x111111];

// ---------------------------------------------------------------------------
// Per-projectile state
// ---------------------------------------------------------------------------

interface WebEntry {
  orb: Graphics;
  tween: gsap.core.Tween;
  trailTimer: number;
}

// ---------------------------------------------------------------------------
// WebFX
// ---------------------------------------------------------------------------

export class WebFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, WebEntry>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 4),
      256,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      if (!projectileId.startsWith("web-") && !projectileId.startsWith("net-")) return;
      this._spawnWeb(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      if (!projectileId.startsWith("web-") && !projectileId.startsWith("net-")) return;
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
  // Spawn web blob
  // ---------------------------------------------------------------------------

  private _spawnWeb(
    id: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    // Dark blob with uneven edges (slightly irregular circle)
    const orb = new Graphics()
      .circle(0, 0, 8)
      .fill({ color: 0x1a2e0a })
      .circle(2, -2, 5)
      .fill({ color: 0x2a4a1a });
    orb.position.set(ox, oy);
    this._container.addChild(orb);

    // Speed matches Web.ts (7 tiles/sec)
    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (7 * TS);

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
      const speed = 8 + Math.random() * 12;
      const tint = WEB_TINTS[Math.floor(Math.random() * WEB_TINTS.length)];
      this._pool.emit({
        x: cx + (Math.random() - 0.5) * 4,
        y: cy + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        scaleStart: 0.6 + Math.random() * 0.3,
        scaleEnd: 0.05,
        alphaStart: 0.7,
        alphaEnd: 0,
        tint,
        gravity: 0,
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

    // Web strands radiating outward
    for (let i = 0; i < IMPACT_STRANDS; i++) {
      const angle = (i / IMPACT_STRANDS) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 30 + Math.random() * 25;
      const tint = WEB_TINTS[Math.floor(Math.random() * WEB_TINTS.length)];
      this._pool.emit({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        scaleStart: 1.2 + Math.random() * 0.4,
        scaleEnd: 0.1,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 10,
      });
    }

    // Sticky splat: dark semi-transparent circle that fades slowly
    const splat = new Graphics().circle(0, 0, 18).fill({ color: 0x1a2e0a });
    splat.position.set(cx, cy);
    splat.alpha = 0.7;
    this._container.addChild(splat);
    gsap.to(splat.scale, {
      x: 2.2,
      y: 2.2,
      duration: 0.35,
      ease: "power2.out",
    });
    gsap.to(splat, {
      alpha: 0,
      duration: 0.6,
      delay: 0.1,
      ease: "power1.in",
      onComplete: () => {
        if (splat.parent) this._container.removeChild(splat);
      },
    });

    this._active.set(id, { ...entry, tween: gsap.to({}, { duration: 0 }) });
  }
}

export const webFX = new WebFX();
