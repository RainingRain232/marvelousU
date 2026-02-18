// Chain lightning FX — jagged bolt segments + crackle sparks at each node.
//
// Bolts:   jagged Graphics lines between consecutive chain positions, fading 0.4s.
// Crackle: 8 spark particles at each hit position, fanning outward.
// All sparks share a ParticlePool (256 particles).

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

// Bolt jaggedness
const JAGS = 6;
const JAG_AMPLITUDE = 10;

// Crackle sparks per node
const SPARKS_PER_NODE = 8;
const SPARK_TINTS = [0xaaddff, 0xffffff, 0x66ccff, 0xeeeeff];

export class LightningFX {
  private _container!: Container;
  private _pool!: ParticlePool;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(
        vm.app.renderer as Renderer,
        4,
        0xaaddff,
      ),
      256,
    );
    this._pool.mount(this._container);

    EventBus.on("abilityUsed", ({ targets }) => {
      // Chain lightning emits targets.length >= 2 (caster + hit units)
      if (targets.length < 2) return;
      this._drawChain(targets);
    });
  }

  // ---------------------------------------------------------------------------
  // Per-frame update — tick particle pool
  // ---------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._pool.update(dt);
  };

  // ---------------------------------------------------------------------------
  // Draw full chain
  // ---------------------------------------------------------------------------

  private _drawChain(path: { x: number; y: number }[]): void {
    const bolts: Graphics[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const bolt = this._drawBolt(path[i], path[i + 1]);
      this._container.addChild(bolt);
      bolts.push(bolt);

      // Crackle at the destination node (not the caster origin)
      const node = path[i + 1];
      const nx = (node.x + 0.5) * TS;
      const ny = (node.y + 0.5) * TS;
      this._emitCrackle(nx, ny, i * 0.04); // stagger per hop
    }

    // Fade all bolt Graphics together then remove
    gsap.to(bolts, {
      alpha: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        for (const bolt of bolts) {
          if (bolt.parent) this._container.removeChild(bolt);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Jagged bolt segment
  // ---------------------------------------------------------------------------

  private _drawBolt(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): Graphics {
    const fx = (from.x + 0.5) * TS;
    const fy = (from.y + 0.5) * TS;
    const tx = (to.x + 0.5) * TS;
    const ty = (to.y + 0.5) * TS;

    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len;
    const py = dx / len;

    const g = new Graphics();
    const points: [number, number][] = [[fx, fy]];

    for (let j = 1; j < JAGS; j++) {
      const t = j / JAGS;
      const offset = (Math.random() - 0.5) * 2 * JAG_AMPLITUDE;
      points.push([fx + dx * t + px * offset, fy + dy * t + py * offset]);
    }
    points.push([tx, ty]);

    g.moveTo(points[0][0], points[0][1]);
    for (let k = 1; k < points.length; k++)
      g.lineTo(points[k][0], points[k][1]);
    g.stroke({ color: 0xaaddff, width: 2.5, alpha: 0.95 });

    // Bright white inner core
    const core = new Graphics();
    core.moveTo(fx, fy).lineTo(tx, ty);
    core.stroke({ color: 0xffffff, width: 1, alpha: 0.8 });
    g.addChild(core);

    return g;
  }

  // ---------------------------------------------------------------------------
  // Crackle sparks at a chain node
  // ---------------------------------------------------------------------------

  private _emitCrackle(cx: number, cy: number, delay: number): void {
    // Use delay via setTimeout so staggered hops look right
    const emit = () => {
      for (let i = 0; i < SPARKS_PER_NODE; i++) {
        const angle = (i / SPARKS_PER_NODE) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 50 + Math.random() * 50;
        const tint =
          SPARK_TINTS[Math.floor(Math.random() * SPARK_TINTS.length)];
        this._pool.emit({
          x: cx + (Math.random() - 0.5) * 6,
          y: cy + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.25 + Math.random() * 0.15,
          scaleStart: 0.6 + Math.random() * 0.4,
          scaleEnd: 0.05,
          alphaStart: 1.0,
          alphaEnd: 0,
          tint,
          gravity: 0,
        });
      }
    };

    if (delay <= 0) {
      emit();
    } else {
      setTimeout(emit, delay * 1000);
    }
  }
}

export const lightningFX = new LightningFX();
