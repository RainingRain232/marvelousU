// CatapultBoulderFX — arcing boulder projectile from catapult units.
//
// Boulder: a large circle that flies in a high parabolic arc.
// Impact: a big burst of stone/rock particles that scatter outward.
//
// Responds to "unitAttacked" events for UnitType.CATAPULT.

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";
import { UnitType } from "@/types";

const TS = BalanceConfig.TILE_SIZE;

const IMPACT_PARTICLES = 12;
const ROCK_TINTS = [0x999999, 0x777777, 0xaaaaaa, 0x666666, 0xbbbbbb];
const DUST_TINTS = [0xccbb99, 0xddcc88, 0xbbaa77];

/** Arc height as fraction of pixel distance. */
const ARC_FRACTION = 0.5;
const MIN_ARC = 24;
const MAX_ARC = 80;

// ---------------------------------------------------------------------------
// Per-boulder state
// ---------------------------------------------------------------------------

interface BoulderEntry {
  boulder: Graphics;
  tween: gsap.core.Tween;
}

// ---------------------------------------------------------------------------
// CatapultBoulderFX
// ---------------------------------------------------------------------------

export class CatapultBoulderFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _active: BoulderEntry[] = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 4),
      256,
    );
    this._pool.mount(this._container);

    EventBus.on("unitAttacked", ({ attackerPos, targetPos, attackerType }) => {
      if (attackerType !== UnitType.CATAPULT && attackerType !== UnitType.SIEGE_CATAPULT && attackerType !== UnitType.TREBUCHET) return;
      this._spawnBoulder(attackerPos, targetPos);
    });
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._pool.update(dt);

    for (let i = this._active.length - 1; i >= 0; i--) {
      const entry = this._active[i];
      if (!entry.tween.isActive() && !entry.boulder.parent) {
        this._active.splice(i, 1);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Spawn boulder
  // -------------------------------------------------------------------------

  private _spawnBoulder(
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

    // High arc for catapult
    const arcHeight = Math.min(Math.max(dist * ARC_FRACTION, MIN_ARC), MAX_ARC);

    // Boulder graphic: dark grey circle
    const boulder = new Graphics();
    boulder.fill({ color: 0x888888 });
    boulder.circle(0, 0, 4);
    boulder.fill({ color: 0xaaaaaa });
    boulder.circle(-1, -1, 2);
    boulder.position.set(ox, oy);
    this._container.addChild(boulder);

    // Slower than arrows — boulders are heavy
    const duration = dist / (8 * TS);
    const progress = { t: 0 };

    const tween = gsap.to(progress, {
      t: 1,
      duration,
      ease: "none",
      onUpdate: () => {
        const t = progress.t;
        const cx = ox + dx * t;
        // High parabolic arc
        const cy = oy + dy * t - arcHeight * 4 * t * (1 - t);

        boulder.position.set(cx, cy);

        // Scale up slightly at peak, shrink on descent
        const scale = 1 + 0.3 * Math.sin(t * Math.PI);
        boulder.scale.set(scale, scale);
      },
      onComplete: () => {
        const fx = boulder.x;
        const fy = boulder.y;
        if (boulder.parent) this._container.removeChild(boulder);

        // Big impact: rock fragments scatter outward
        for (let i = 0; i < IMPACT_PARTICLES; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 30 + Math.random() * 60;
          const tint =
            ROCK_TINTS[Math.floor(Math.random() * ROCK_TINTS.length)];
          this._pool.emit({
            x: fx + (Math.random() - 0.5) * 6,
            y: fy + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            life: 0.25 + Math.random() * 0.2,
            scaleStart: 0.6 + Math.random() * 0.5,
            scaleEnd: 0.1,
            alphaStart: 1.0,
            alphaEnd: 0,
            tint,
            gravity: 120,
          });
        }

        // Dust cloud
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 10 + Math.random() * 20;
          const tint =
            DUST_TINTS[Math.floor(Math.random() * DUST_TINTS.length)];
          this._pool.emit({
            x: fx + (Math.random() - 0.5) * 8,
            y: fy + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 10,
            life: 0.35 + Math.random() * 0.2,
            scaleStart: 0.8 + Math.random() * 0.4,
            scaleEnd: 0.2,
            alphaStart: 0.6,
            alphaEnd: 0,
            tint,
            gravity: 20,
          });
        }
      },
    });

    this._active.push({ boulder, tween });
  }
}

export const catapultBoulderFX = new CatapultBoulderFX();
