// Summon FX — magic circle + particle showers for runes and materialisation.
//
// Magic circle: rotating Graphics ring (gsap tween), lives for SUMMON_LIFESPAN.
// Rune shower:  particles rain upward from the circle edge at cast time.
// Materialise:  per-unit particle burst (upward shower) as each unit appears.
//
// All particles share a single ParticlePool (512 particles).

import { Container, Graphics, type Renderer } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { SUMMON_LIFESPAN } from "@sim/abilities/Summon";
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const SUMMON_COUNT = 3;
const SPREAD_PX = TS; // 1 tile radius

// Particle counts
const RUNE_PARTICLES = 40; // shower at cast time around the circle
const MATERIALISE_SPARKS = 16; // burst per summoned unit

// Tints
const RUNE_TINTS = [0xcc99ff, 0x9966ff, 0xddaaff, 0xffffff];
const SUMMON_TINTS = [0xddaaff, 0xcc88ff, 0xffffff, 0xaa66ff];

export class SummonFX {
  private _container!: Container;
  private _pool!: ParticlePool;
  private _pendingSummon = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    this._pool = new ParticlePool(
      ParticlePool.createCircleTexture(
        vm.app.renderer as Renderer,
        5,
        0xcc99ff,
      ),
      512,
    );
    this._pool.mount(this._container);

    // unitSpawned fires inside execute() before abilityUsed
    EventBus.on("unitSpawned", () => {
      this._pendingSummon = true;
    });

    EventBus.on("abilityUsed", ({ targets }) => {
      if (!this._pendingSummon) return;
      this._pendingSummon = false;
      if (targets.length < 1) return;
      this._playSummonFX(targets[0]);
    });
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._pool.update(dt);
  };

  // ---------------------------------------------------------------------------
  // Full summon FX
  // ---------------------------------------------------------------------------

  private _playSummonFX(center: { x: number; y: number }): void {
    const cx = (center.x + 0.5) * TS;
    const cy = (center.y + 0.5) * TS;

    this._drawMagicCircle(cx, cy);
    this._emitRuneShower(cx, cy);
    this._emitMaterialiseBursts(cx, cy);
  }

  // ---------------------------------------------------------------------------
  // Rotating magic circle (Graphics)
  // ---------------------------------------------------------------------------

  private _drawMagicCircle(cx: number, cy: number): void {
    // Outer ring
    const outer = new Graphics()
      .circle(0, 0, SPREAD_PX + 10)
      .stroke({ color: 0x9966ff, width: 3 });
    outer.position.set(cx, cy);
    outer.alpha = 0;
    this._container.addChild(outer);

    // Inner ring (counter-rotating)
    const inner = new Graphics()
      .circle(0, 0, SPREAD_PX - 12)
      .stroke({ color: 0xcc99ff, width: 1.5 });
    inner.position.set(cx, cy);
    inner.alpha = 0;
    this._container.addChild(inner);

    // Fade in
    gsap.to([outer, inner], {
      alpha: 0.85,
      duration: 0.35,
      ease: "power2.out",
    });

    // Outer rotates clockwise, inner counter-clockwise
    gsap.to(outer, {
      rotation: Math.PI * 2,
      duration: 3.5,
      ease: "none",
      repeat: Math.ceil(SUMMON_LIFESPAN / 3.5),
    });
    gsap.to(inner, {
      rotation: -Math.PI * 2,
      duration: 2.5,
      ease: "none",
      repeat: Math.ceil(SUMMON_LIFESPAN / 2.5),
    });

    // Fade out near end of lifespan
    const fadeDelay = SUMMON_LIFESPAN - 0.6;
    gsap.to([outer, inner], {
      alpha: 0,
      duration: 0.6,
      delay: fadeDelay,
      ease: "power2.in",
      onComplete: () => {
        if (outer.parent) this._container.removeChild(outer);
        if (inner.parent) this._container.removeChild(inner);
      },
    });

    // Four rune marks on outer ring at cardinal positions
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const mark = new Graphics().rect(-4, -4, 8, 8).fill({ color: 0xcc99ff });
      mark.rotation = Math.PI / 4;
      mark.position.set(
        cx + Math.cos(a) * (SPREAD_PX + 10),
        cy + Math.sin(a) * (SPREAD_PX + 10),
      );
      mark.alpha = 0;
      this._container.addChild(mark);

      gsap.to(mark, { alpha: 1, duration: 0.25, delay: 0.1 + i * 0.05 });
      gsap.to(mark, {
        alpha: 0,
        duration: 0.4,
        delay: fadeDelay,
        onComplete: () => {
          if (mark.parent) this._container.removeChild(mark);
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rune shower — particles rain upward from circle edge
  // ---------------------------------------------------------------------------

  private _emitRuneShower(cx: number, cy: number): void {
    for (let i = 0; i < RUNE_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = SPREAD_PX + 10 + (Math.random() - 0.5) * 20;
      const tint = RUNE_TINTS[Math.floor(Math.random() * RUNE_TINTS.length)];
      const speed = 30 + Math.random() * 50;

      this._pool.emit({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 20,
        vy: -speed,
        life: 0.6 + Math.random() * 0.5,
        scaleStart: 0.5 + Math.random() * 0.5,
        scaleEnd: 0.05,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 30,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Materialise bursts — one per summoned unit position
  // ---------------------------------------------------------------------------

  private _emitMaterialiseBursts(cx: number, cy: number): void {
    for (let i = 0; i < SUMMON_COUNT; i++) {
      const a = (i / SUMMON_COUNT) * Math.PI * 2;
      const ux = cx + Math.cos(a) * SPREAD_PX;
      const uy = cy + Math.sin(a) * SPREAD_PX;

      // Stagger each burst by 80ms
      const delay = i * 0.08;
      const emit = () => {
        for (let j = 0; j < MATERIALISE_SPARKS; j++) {
          const angle =
            (j / MATERIALISE_SPARKS) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 40 + Math.random() * 40;
          const tint =
            SUMMON_TINTS[Math.floor(Math.random() * SUMMON_TINTS.length)];
          this._pool.emit({
            x: ux + (Math.random() - 0.5) * 8,
            y: uy + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20, // slight upward bias
            life: 0.5 + Math.random() * 0.3,
            scaleStart: 0.8 + Math.random() * 0.4,
            scaleEnd: 0.05,
            alphaStart: 1.0,
            alphaEnd: 0,
            tint,
            gravity: 60,
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
}

export const summonFX = new SummonFX();
