// ArrowFX — arching arrow projectile from ranged archer-type units.
//
// Arrow: narrow rotated rect flying in a parabolic arc toward the target.
// Impact: small burst of splinter particles.
//
// Responds to "unitAttacked" events (emitted by CombatSystem for archer units).

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const IMPACT_SPLINTERS = 4;
const SPLINTER_TINTS = [0xddbb77, 0xffeeaa, 0xbbaa66];

/** Minimum arc height in pixels. */
const MIN_ARC = 8;
/** Arc height as a fraction of pixel distance. */
const ARC_FRACTION = 0.15;
/** Max arc height in pixels. */
const MAX_ARC = 48;

// ---------------------------------------------------------------------------
// Per-arrow state
// ---------------------------------------------------------------------------

interface ArrowEntry {
  arrow: Graphics;
  tween: gsap.core.Tween;
}

// ---------------------------------------------------------------------------
// ArrowFX
// ---------------------------------------------------------------------------

export class ArrowFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active: ArrowEntry[] = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 3),
      256,
    );
    this._pool.mount(this._container);

    EventBus.on("unitAttacked", ({ attackerPos, targetPos }) => {
      this._spawnArrow(attackerPos, targetPos);
    });
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._pool.update(dt);

    // Prune finished entries
    for (let i = this._active.length - 1; i >= 0; i--) {
      const entry = this._active[i];
      if (!entry.tween.isActive() && !entry.arrow.parent) {
        this._active.splice(i, 1);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Spawn arrow
  // -------------------------------------------------------------------------

  private _spawnArrow(
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    const dx = tx - ox;
    const dy = ty - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    // Arc height scales with distance, clamped
    const arcHeight = Math.min(Math.max(dist * ARC_FRACTION, MIN_ARC), MAX_ARC);

    // Arrow graphic: 10px long, 2px wide, golden-brown
    const arrow = new Graphics()
      .rect(-10, -1, 10, 2)
      .fill({ color: 0xddbb77 });
    arrow.position.set(ox, oy);
    arrow.rotation = Math.atan2(dy, dx);
    this._container.addChild(arrow);

    const duration = dist / (14 * TS);
    const progress = { t: 0 };

    const tween = gsap.to(progress, {
      t: 1,
      duration,
      ease: "none",
      onUpdate: () => {
        const t = progress.t;
        // Linear interpolation for x/y
        const cx = ox + dx * t;
        // Parabolic arc (negative = upward): peaks at t=0.5
        const cy = oy + dy * t - arcHeight * 4 * t * (1 - t);

        arrow.position.set(cx, cy);

        // Tangent of the arc for rotation
        const tangentX = dx;
        const tangentY = dy - arcHeight * 4 * (1 - 2 * t);
        arrow.rotation = Math.atan2(tangentY, tangentX);
      },
      onComplete: () => {
        const fx = arrow.x;
        const fy = arrow.y;
        if (arrow.parent) this._container.removeChild(arrow);

        // Impact splinters
        for (let i = 0; i < IMPACT_SPLINTERS; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 15 + Math.random() * 25;
          const tint =
            SPLINTER_TINTS[Math.floor(Math.random() * SPLINTER_TINTS.length)];
          this._pool.emit({
            x: fx + (Math.random() - 0.5) * 4,
            y: fy + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.15 + Math.random() * 0.1,
            scaleStart: 0.4 + Math.random() * 0.3,
            scaleEnd: 0.05,
            alphaStart: 0.8,
            alphaEnd: 0,
            tint,
            gravity: 50,
          });
        }
      },
    });

    this._active.push({ arrow, tween });
  }
}

export const arrowFX = new ArrowFX();
