// Fireball trail + explosion particles
// Listens to projectileCreated / projectileHit events and drives a gsap tween
// for the orb position, leaving behind fading trail circles and bursting into
// explosion particles on impact.
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

// ---------------------------------------------------------------------------
// Per-projectile animation state
// ---------------------------------------------------------------------------

interface FireballEntry {
  orb: Graphics;
  tween: gsap.core.Tween;
  /** Trail circles left behind (cleaned up after alpha → 0) */
  trail: Graphics[];
  trailTimer: number; // seconds since last trail dot
}

// ---------------------------------------------------------------------------
// FireballFX manager
// ---------------------------------------------------------------------------

export class FireballFX {
  private _active = new Map<string, FireballEntry>();
  private _container!: Container;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      this._spawnFireball(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      this._onHit(projectileId);
    });
  }

  // ---------------------------------------------------------------------------
  // Per-frame update — tick trail fade, clean up finished entries
  // ---------------------------------------------------------------------------

  readonly update = (_dt: number): void => {
    const toDelete: string[] = [];

    for (const [id, entry] of this._active) {
      // Fade each trail dot
      for (let i = entry.trail.length - 1; i >= 0; i--) {
        const dot = entry.trail[i];
        dot.alpha -= _dt * 3; // fade out over ~0.33 s
        if (dot.alpha <= 0) {
          this._container.removeChild(dot);
          entry.trail.splice(i, 1);
        }
      }

      // Emit a new trail dot every 0.06 s while orb is alive
      entry.trailTimer -= _dt;
      if (entry.trailTimer <= 0 && entry.orb.parent) {
        entry.trailTimer = 0.06;
        const dot = new Graphics()
          .circle(0, 0, 5)
          .fill({ color: 0xff8800, alpha: 0.6 });
        dot.position.copyFrom(entry.orb.position);
        dot.alpha = 0.6;
        this._container.addChildAt(dot, 0); // behind orb
        entry.trail.push(dot);
      }

      // Remove entry once tween is done AND all trail dots have faded
      if (!entry.tween.isActive() && entry.trail.length === 0) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) this._active.delete(id);
  };

  // ---------------------------------------------------------------------------
  // Spawn a fireball orb and tween it to target
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

    const orb = new Graphics().circle(0, 0, 10).fill({ color: 0xff4400 });
    orb.position.set(ox, oy);
    this._container.addChild(orb);

    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (10 * TS); // 10 tiles/s

    const tween = gsap.to(orb.position, {
      x: tx,
      y: ty,
      duration,
      ease: "none",
      onComplete: () => {
        // Orb removed on hit; if no hit event fired, clean up here
        if (orb.parent) this._container.removeChild(orb);
      },
    });

    this._active.set(id, { orb, tween, trail: [], trailTimer: 0 });
  }

  // ---------------------------------------------------------------------------
  // Impact: kill orb tween, burst explosion particles
  // ---------------------------------------------------------------------------

  private _onHit(id: string): void {
    const entry = this._active.get(id);
    if (!entry) return;

    entry.tween.kill();
    const cx = entry.orb.position.x;
    const cy = entry.orb.position.y;

    if (entry.orb.parent) this._container.removeChild(entry.orb);

    // Burst 12 spark particles outward
    const SPARKS = 12;
    for (let i = 0; i < SPARKS; i++) {
      const angle = (i / SPARKS) * Math.PI * 2;
      const spark = new Graphics().circle(0, 0, 4).fill({ color: 0xffcc00 });
      spark.position.set(cx, cy);
      this._container.addChild(spark);

      const radius = 30 + Math.random() * 20;
      gsap.to(spark.position, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => {
          if (spark.parent) this._container.removeChild(spark);
        },
      });
      gsap.to(spark, { alpha: 0, duration: 0.35, ease: "power1.in" });
    }

    // Large flash circle
    const flash = new Graphics().circle(0, 0, 24).fill({ color: 0xff6600 });
    flash.position.set(cx, cy);
    flash.alpha = 0.8;
    this._container.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      duration: 0.25,
      ease: "power2.out",
      onComplete: () => {
        if (flash.parent) this._container.removeChild(flash);
      },
    });

    // Remove entry (trail dots will fade out naturally in update())
    entry.trail; // keep reference; update() handles fade
    this._active.set(id, { ...entry, tween: gsap.to({}, { duration: 0 }) });
  }
}

export const fireballFX = new FireballFX();
