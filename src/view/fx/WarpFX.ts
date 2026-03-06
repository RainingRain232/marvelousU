// WarpFX — visual effect for unit teleportation.
//
// Origin: purple shimmer burst where the unit disappeared.
// Destination: purple shimmer burst where the unit reappears.
//
// Responds to "unitTeleported" events.

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const PARTICLE_COUNT = 8;
const PARTICLE_TINTS = [0xbb66ff, 0x9944dd, 0xdd88ff, 0x7733cc];

// ---------------------------------------------------------------------------
// WarpFX
// ---------------------------------------------------------------------------

export class WarpFX {
  private _container!: Container;
  private _pool!: ParticlePool;

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(vm.app.renderer as Renderer, 4),
      128,
    );
    this._pool.mount(this._container);

    EventBus.on("unitTeleported", ({ from, to }) => {
      this._spawnBurst(from);
      gsap.delayedCall(0.15, () => this._spawnBurst(to));
    });
  }

  readonly update = (dt: number): void => {
    this._pool.update(dt);
  };

  private _spawnBurst(pos: { x: number; y: number }): void {
    const cx = (pos.x + 0.5) * TS;
    const cy = (pos.y + 0.5) * TS;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const speed = 30 + Math.random() * 40;
      const tint = PARTICLE_TINTS[i % PARTICLE_TINTS.length];

      this._pool.emit({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0,
        life: 0.5 + Math.random() * 0.3,
        scaleStart: 1.2,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        tint,
      });
    }

    // Central flash ring
    const ring = new Graphics()
      .circle(0, 0, 12)
      .fill({ color: 0xbb66ff, alpha: 0.6 });
    ring.position.set(cx, cy);
    this._container.addChild(ring);

    gsap.to(ring, {
      alpha: 0,
      duration: 0.4,
      onUpdate: () => {
        ring.scale.set(ring.scale.x + 0.05);
      },
      onComplete: () => {
        ring.destroy();
      },
    });
  }
}

export const warpFX = new WarpFX();
