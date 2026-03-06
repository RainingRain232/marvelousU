// Block FX: Shield shape with "BLOCK" text that pops and fades.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

const STYLE_BLOCK = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0x88ccff,
  stroke: { color: 0x000000, width: 3 },
});

export class BlockFX {
  private _container!: Container;
  private _state!: GameState;

  init(vm: ViewManager, state: GameState): void {
    this._container = new Container();
    this._state = state;
    vm.layers.fx.addChild(this._container);

    EventBus.on("unitBlocked", ({ unitId }) => {
      const unit = this._state.units.get(unitId);
      if (!unit) return;
      this._spawnBlockEffect(unit.position.x, unit.position.y);
    });
  }

  update(_dt: number): void {
    // gsap handles animations
  }

  private _spawnBlockEffect(tx: number, ty: number): void {
    const cx = (tx + 0.5) * TS;
    const cy = (ty + 0.5) * TS;

    const group = new Container();
    group.position.set(cx, cy);
    this._container.addChild(group);

    // Shield shape
    const shield = new Graphics()
      .roundRect(-TS * 0.2, -TS * 0.3, TS * 0.4, TS * 0.6, 4)
      .fill({ color: 0x4488cc, alpha: 0.5 })
      .roundRect(-TS * 0.2, -TS * 0.3, TS * 0.4, TS * 0.6, 4)
      .stroke({ color: 0x88ccff, alpha: 0.8, width: 2 });
    group.addChild(shield);

    // "BLOCK" text above shield
    const text = new Text({ text: "BLOCK", style: STYLE_BLOCK });
    text.anchor.set(0.5, 1);
    text.position.set(0, -TS * 0.35);
    group.addChild(text);

    // Pop in, hold briefly, fade out
    group.scale.set(0.5);
    group.alpha = 0;

    gsap.to(group.scale, { x: 1.1, y: 1.1, duration: 0.1, ease: "back.out(2)" });
    gsap.to(group, {
      alpha: 1,
      duration: 0.08,
      onComplete: () => {
        gsap.to(group, {
          alpha: 0,
          duration: 0.35,
          delay: 0.07,
          ease: "power2.in",
          onComplete: () => {
            if (group.parent) this._container.removeChild(group);
            group.destroy({ children: true });
          },
        });
      },
    });
  }
}

export const blockFX = new BlockFX();
