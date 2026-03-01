// TurretLightningFX — lightning projectile from lightning towers.
//
// Lightning: instant hit with chain effect to nearby enemies.
// Impact: crackling bolt visual + spark particles.
//
// Responds to projectile IDs matching "bturret-lightning-".

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const COL_LIGHTNING = 0x4488ff;
const COL_LIGHTNING_CORE = 0x88ccff;
const COL_SPARK = 0xaaddff;

// ---------------------------------------------------------------------------
// Per-projectile state
// ---------------------------------------------------------------------------

interface LightningEntry {
  bolt: Graphics;
  tween: gsap.core.Tween;
}

// ---------------------------------------------------------------------------
// TurretLightningFX
// ---------------------------------------------------------------------------

export class TurretLightningFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, LightningEntry>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 3),
      256,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      if (!projectileId.startsWith("bturret-lightning-")) return;
      this._spawnLightning(projectileId, origin, target);
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      if (!projectileId.startsWith("bturret-lightning-")) return;
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
      if (!entry.tween.isActive() && !entry.bolt.parent) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) this._active.delete(id);
  };

  // ---------------------------------------------------------------------------
  // Spawn lightning bolt
  // ---------------------------------------------------------------------------

  private _spawnLightning(
    projectileId: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const g = new Graphics();
    this._container.addChild(g);

    // Draw jagged lightning bolt
    this._drawBolt(
      g,
      origin.x * TS,
      origin.y * TS,
      target.x * TS,
      target.y * TS,
    );

    // Fade out after a brief moment
    const tween = gsap.to(g, {
      alpha: 0,
      duration: 0.15,
      onComplete: () => {
        g.destroy();
      },
    });

    this._active.set(projectileId, { bolt: g, tween });
  }

  private _drawBolt(
    g: Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    const segments = 8;
    const jag = 8;

    let cx = x1;
    let cy = y1;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    // Outer glow
    g.moveTo(cx, cy);
    for (let i = 1; i <= segments; i++) {
      const nextX = x1 + dx * i + (Math.random() - 0.5) * jag;
      const nextY = y1 + dy * i + (Math.random() - 0.5) * jag;
      g.lineTo(nextX, nextY);
      cx = nextX;
      cy = nextY;
    }
    g.stroke({ color: COL_LIGHTNING, width: 4, alpha: 0.6 });

    // Core
    cx = x1;
    cy = y1;
    g.moveTo(cx, cy);
    for (let i = 1; i <= segments; i++) {
      const nextX = x1 + dx * i + (Math.random() - 0.5) * (jag / 2);
      const nextY = y1 + dy * i + (Math.random() - 0.5) * (jag / 2);
      g.lineTo(nextX, nextY);
      cx = nextX;
      cy = nextY;
    }
    g.stroke({ color: COL_LIGHTNING_CORE, width: 2 });

    // Sparks at impact point
    this._pool.emit({
      x: x2,
      y: y2,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      life: 0.3,
      scaleStart: 1 + Math.random(),
      scaleEnd: 0.05,
      alphaStart: 0.8,
      alphaEnd: 0,
      tint: COL_SPARK,
    });
  }

  // ---------------------------------------------------------------------------
  // On hit - extra sparks
  // ---------------------------------------------------------------------------

  private _onHit(projectileId: string): void {
    const entry = this._active.get(projectileId);
    if (!entry) return;

    // Spawn burst of sparks at the last position
    const bx = entry.bolt.x;
    const by = entry.bolt.y;

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this._pool.emit({
        x: bx,
        y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        scaleStart: 1 + Math.random() * 2,
        scaleEnd: 0.05,
        alphaStart: 0.8,
        alphaEnd: 0,
        tint: COL_SPARK,
      });
    }
  }
}

export const turretLightningFX = new TurretLightningFX();
