// TurretArrowFX — thin arrow projectile from building turrets.
//
// Arrow: narrow rotated rect pointing toward the target.
// Impact: small burst of 4–6 splinter particles.
//
// Responds to projectile IDs matching "bturret-arrow-".

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const IMPACT_SPLINTERS = 5;
const SPLINTER_TINTS = [0xddbb77, 0xffeeaa, 0xbbaa66];

// ---------------------------------------------------------------------------
// Per-projectile state
// ---------------------------------------------------------------------------

interface ArrowEntry {
  arrow: Graphics;
  tween: gsap.core.Tween;
}

// ---------------------------------------------------------------------------
// TurretArrowFX
// ---------------------------------------------------------------------------

export class TurretArrowFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, ArrowEntry>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 3),
      128,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      if (!projectileId.startsWith("bturret-arrow-")) return;
      this._spawnArrow(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      if (!projectileId.startsWith("bturret-arrow-")) return;
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
      if (!entry.tween.isActive() && !entry.arrow.parent) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) this._active.delete(id);
  };

  // ---------------------------------------------------------------------------
  // Spawn arrow
  // ---------------------------------------------------------------------------

  private _spawnArrow(
    id: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    const angle = Math.atan2(ty - oy, tx - ox);

    // Arrow: 10px long, 2px wide, golden-brown
    const arrow = new Graphics()
      .rect(-10, -1, 10, 2)
      .fill({ color: 0xddbb77 });
    arrow.position.set(ox, oy);
    arrow.rotation = angle;
    this._container.addChild(arrow);

    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (14 * TS); // matches sim speed

    const tween = gsap.to(arrow.position, {
      x: tx,
      y: ty,
      duration,
      ease: "none",
      onComplete: () => {
        if (arrow.parent) this._container.removeChild(arrow);
      },
    });

    this._active.set(id, { arrow, tween });
  }

  // ---------------------------------------------------------------------------
  // Impact
  // ---------------------------------------------------------------------------

  private _onHit(id: string): void {
    const entry = this._active.get(id);
    if (!entry) return;

    entry.tween.kill();
    const cx = entry.arrow.x;
    const cy = entry.arrow.y;

    if (entry.arrow.parent) this._container.removeChild(entry.arrow);

    for (let i = 0; i < IMPACT_SPLINTERS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      const tint = SPLINTER_TINTS[Math.floor(Math.random() * SPLINTER_TINTS.length)];
      this._pool.emit({
        x: cx + (Math.random() - 0.5) * 4,
        y: cy + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.18 + Math.random() * 0.1,
        scaleStart: 0.5 + Math.random() * 0.3,
        scaleEnd: 0.05,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 60,
      });
    }

    this._active.set(id, { ...entry, tween: gsap.to({}, { duration: 0 }) });
  }
}

export const turretArrowFX = new TurretArrowFX();
