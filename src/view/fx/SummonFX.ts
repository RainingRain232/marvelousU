// Magic circle + unit materialization effect.
// Listens to unitSpawned (sets a flag) then abilityUsed to trigger the FX.
// Within a single execute() call, Summon.ts fires unitSpawned N times then
// abilityUsed once — so _pendingSummon is set when abilityUsed arrives.
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { SUMMON_LIFESPAN } from "@sim/abilities/Summon";

const TS = BalanceConfig.TILE_SIZE;

const SUMMON_COUNT = 3; // mirrors AbilityDefs summonCount
const SPREAD_PX = TS; // mirrors Summon.ts SPREAD_RADIUS (1 tile)

export class SummonFX {
  private _container!: Container;
  /** Set to true by the first unitSpawned in an execute() batch; cleared after abilityUsed. */
  private _pendingSummon = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

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
  // FX: rotating magic circle + materialisation rings per unit
  // ---------------------------------------------------------------------------

  private _playSummonFX(center: { x: number; y: number }): void {
    const cx = (center.x + 0.5) * TS;
    const cy = (center.y + 0.5) * TS;

    // Outer rotating magic circle
    const circle = new Graphics()
      .circle(0, 0, SPREAD_PX + 8)
      .stroke({ color: 0x9966ff, width: 3 });
    circle.position.set(cx, cy);
    circle.alpha = 0;
    this._container.addChild(circle);

    gsap.to(circle, { alpha: 0.8, duration: 0.3, ease: "power2.out" });
    gsap.to(circle, {
      rotation: Math.PI * 2,
      duration: 4,
      ease: "none",
      repeat: Math.floor(SUMMON_LIFESPAN / 4) - 1,
    });
    gsap.to(circle, {
      alpha: 0,
      duration: 0.5,
      delay: SUMMON_LIFESPAN - 0.5,
      ease: "power2.in",
      onComplete: () => {
        if (circle.parent) this._container.removeChild(circle);
      },
    });

    // Rune dots at cardinal points on the circle
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const rune = new Graphics().circle(0, 0, 5).fill({ color: 0xcc99ff });
      rune.position.set(
        cx + Math.cos(a) * (SPREAD_PX + 8),
        cy + Math.sin(a) * (SPREAD_PX + 8),
      );
      rune.alpha = 0;
      this._container.addChild(rune);
      gsap.to(rune, { alpha: 1, duration: 0.2, delay: 0.1 });
      gsap.to(rune, {
        alpha: 0,
        duration: 0.3,
        delay: SUMMON_LIFESPAN - 0.3,
        onComplete: () => {
          if (rune.parent) this._container.removeChild(rune);
        },
      });
    }

    // Materialisation ring per unit — staggered
    for (let i = 0; i < SUMMON_COUNT; i++) {
      const a = (i / SUMMON_COUNT) * Math.PI * 2;
      const ux = cx + Math.cos(a) * SPREAD_PX;
      const uy = cy + Math.sin(a) * SPREAD_PX;

      const ring = new Graphics()
        .circle(0, 0, 18)
        .stroke({ color: 0xddaaff, width: 2 });
      ring.position.set(ux, uy);
      ring.scale.set(0);
      ring.alpha = 0;
      this._container.addChild(ring);

      const delay = i * 0.08;
      gsap.to(ring.scale, {
        x: 1,
        y: 1,
        duration: 0.35,
        delay,
        ease: "back.out(1.7)",
      });
      gsap.to(ring, { alpha: 1, duration: 0.2, delay });
      gsap.to(ring, {
        alpha: 0,
        duration: 0.4,
        delay: delay + 0.5,
        ease: "power1.in",
        onComplete: () => {
          if (ring.parent) this._container.removeChild(ring);
        },
      });
    }
  }
}

export const summonFX = new SummonFX();
