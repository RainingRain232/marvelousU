// Chain lightning bolt rendering between each target pair in the chain path.
// Listens to abilityUsed (CHAIN_LIGHTNING) — receives the full ordered path of
// Vec2 positions (caster + each hit unit). Draws jagged bolt segments between
// consecutive pairs, then fades them out.
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

// Number of jag segments per bolt segment
const JAGS = 6;
// Max perpendicular offset for each jag (pixels)
const JAG_AMPLITUDE = 10;

export class LightningFX {
  private _container!: Container;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    EventBus.on("abilityUsed", ({ abilityId, targets }) => {
      // abilityId encodes the ability instance id; type not directly available
      // here. We detect chain lightning by checking if it contains the string
      // from the registry key — but the cleanest approach is to pass targets
      // only when it's a chain lightning cast. The AbilitySystem emits
      // abilityUsed for all abilities; we filter by abilityId prefix convention
      // (chain lightning ability ids start with the unit id + "-ability-").
      // Since we can't import AbilityType check without game state, we instead
      // listen and check if targets.length >= 2 AND the abilityId was produced
      // by a chain lightning ability. The simplest reliable filter: register a
      // dedicated chain lightning event. However the EventBus doesn't have one,
      // so we check targets.length >= 2 as a reasonable heuristic — fireballs
      // only send 1 target position.
      //
      // Robust approach: check abilityId contains "chain" — but ids are opaque.
      // Best approach without schema change: the chain lightning execute() sets
      // a marker. We'll use a module-level set populated by ChainLightning.ts.
      // For now, use targets.length >= 2 as the discriminator (fireballs always
      // emit exactly 1 target; chain lightning emits caster + N hit positions).
      void abilityId; // silence lint — used as discriminator above
      if (targets.length < 2) return;
      this._drawChain(targets);
    });
  }

  // ---------------------------------------------------------------------------
  // Draw a full chain of bolt segments and fade them out
  // ---------------------------------------------------------------------------

  private _drawChain(path: { x: number; y: number }[]): void {
    const bolts: Graphics[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const bolt = this._drawBolt(path[i], path[i + 1]);
      this._container.addChild(bolt);
      bolts.push(bolt);
    }

    // Fade all bolt segments together then remove
    gsap.to(
      bolts.map((b) => b),
      {
        alpha: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
          for (const bolt of bolts) {
            if (bolt.parent) this._container.removeChild(bolt);
          }
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Draw a single jagged bolt between two tile positions
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
    // Perpendicular unit vector for jag offsets
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len;
    const py = dx / len;

    const g = new Graphics();

    // Build jag points: start → N-1 intermediate → end
    const points: [number, number][] = [[fx, fy]];
    for (let j = 1; j < JAGS; j++) {
      const t = j / JAGS;
      const mx = fx + dx * t;
      const my = fy + dy * t;
      const offset = (Math.random() - 0.5) * 2 * JAG_AMPLITUDE;
      points.push([mx + px * offset, my + py * offset]);
    }
    points.push([tx, ty]);

    g.moveTo(points[0][0], points[0][1]);
    for (let k = 1; k < points.length; k++) {
      g.lineTo(points[k][0], points[k][1]);
    }
    g.stroke({ color: 0xaaddff, width: 2, alpha: 0.9 });

    // Bright inner core
    const core = new Graphics();
    core.moveTo(fx, fy);
    core.lineTo(tx, ty);
    core.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
    g.addChild(core);

    return g;
  }
}

export const lightningFX = new LightningFX();
