// Distortion FX — Purple shifting trail + localized teleport poofs.
import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const TRAIL_INTERVAL = 0.03;
const TRAIL_PER_BURST = 4;
const IMPACT_SPARKS = 15;

const DISTORTION_TINTS = [0x9900ff, 0xcc00ff, 0xff00ff, 0x6600ff];

interface DistortionEntry {
  orb: Graphics;
  tween: gsap.core.Tween;
  trailTimer: number;
}

export class DistortionFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active = new Map<string, DistortionEntry>();

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 5),
      512,
    );
    this._pool.mount(this._container);

    EventBus.on("projectileCreated", ({ projectileId, origin, target }) => {
      // Use a naming convention or check abilityId if we had it in event,
      // but here we just check prefix from DistortionBlast.ts
      if (
        projectileId.startsWith("dist-") ||
        projectileId.startsWith("bturret-warp-")
      ) {
        this._spawnDistortion(projectileId, origin, target);
      }
    });

    EventBus.on("projectileHit", ({ projectileId }) => {
      this._onHit(projectileId);
    });

    EventBus.on("unitTeleported", ({ from, to }) => {
      this._onTeleport(from, to);
    });
  }

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

  private _spawnDistortion(
    id: string,
    origin: { x: number; y: number },
    target: { x: number; y: number },
  ): void {
    const ox = (origin.x + 0.5) * TS;
    const oy = (origin.y + 0.5) * TS;
    const tx = (target.x + 0.5) * TS;
    const ty = (target.y + 0.5) * TS;

    const orb = new Graphics()
      .circle(0, 0, 8)
      .fill({ color: 0x9900ff, alpha: 0.7 })
      .circle(0, 0, 4)
      .fill({ color: 0xffffff });
    orb.position.set(ox, oy);
    this._container.addChild(orb);

    const dist = Math.sqrt((tx - ox) ** 2 + (ty - oy) ** 2);
    const duration = dist / (12 * TS);

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

  private _emitTrailBurst(cx: number, cy: number): void {
    for (let i = 0; i < TRAIL_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 20;
      const tint =
        DISTORTION_TINTS[Math.floor(Math.random() * DISTORTION_TINTS.length)];
      this._pool.emit({
        x: cx + (Math.random() - 0.5) * 4,
        y: cy + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        scaleStart: 1.0,
        scaleEnd: 0,
        alphaStart: 0.8,
        alphaEnd: 0,
        tint,
      });
    }
  }

  private _onHit(id: string): void {
    const entry = this._active.get(id);
    if (!entry) return;

    entry.tween.kill();
    const cx = entry.orb.x;
    const cy = entry.orb.y;

    if (entry.orb.parent) this._container.removeChild(entry.orb);

    for (let i = 0; i < IMPACT_SPARKS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this._pool.emit({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        scaleStart: 1.5,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        tint: 0xffffff,
      });
    }
  }

  private _onTeleport(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void {
    const fx = (from.x + 0.5) * TS;
    const fy = (from.y + 0.5) * TS;
    const tx = (to.x + 0.5) * TS;
    const ty = (to.y + 0.5) * TS;

    // Poof at origin
    this._poof(fx, fy);
    // Poof at destination
    this._poof(tx, ty);
  }

  private _poof(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this._pool.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        scaleStart: 1.2,
        scaleEnd: 0,
        alphaStart: 0.8,
        alphaEnd: 0,
        tint: 0xcc00ff,
      });
    }
  }
}

export const distortionFX = new DistortionFX();
