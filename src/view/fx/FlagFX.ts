// Rally flag visual: flagpole + waving cloth in player color.
// Listens to "flagPlaced" and renders a persistent flag that sways in the wind.
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import type { PlayerId } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

const COLOR_P1 = 0x4488ff; // blue
const COLOR_P2 = 0xff4444; // red
const POLE_COLOR = 0x5c3a1a;

// Flag dimensions (in pixels, world-space)
const POLE_W = 2;
const POLE_H = 22;
const CLOTH_W = 14;
const CLOTH_H = 10;

export class FlagFX {
  private _container!: Container;
  private _flags = new Map<PlayerId, Container>();
  private _cloths = new Map<PlayerId, Graphics>();
  private _time = 0;
  private _phases = new Map<PlayerId, number>();

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.fx.addChild(this._container);

    EventBus.on("flagPlaced", ({ playerId, position }) => {
      this._placeFlag(playerId as PlayerId, position.x, position.y);
    });
  }

  update(dt: number): void {
    this._time += dt;

    // Animate cloth sway
    for (const [pid, cloth] of this._cloths) {
      const phase = this._phases.get(pid) ?? 0;
      const angle = Math.sin(this._time * 3 + phase) * 0.15
        + Math.sin(this._time * 1.3 + phase * 1.7) * 0.08;
      cloth.skew.x = angle;
    }
  }

  private _placeFlag(playerId: PlayerId, tx: number, ty: number): void {
    // Remove existing flag for this player
    const existing = this._flags.get(playerId);
    if (existing) {
      if (existing.parent) this._container.removeChild(existing);
      existing.destroy({ children: true });
    }

    const cx = (tx + 0.5) * TS;
    const cy = (ty + 0.5) * TS;
    const color = playerId === "p1" ? COLOR_P1 : COLOR_P2;

    const group = new Container();
    group.position.set(cx, cy);

    // Flagpole
    const pole = new Graphics()
      .rect(-POLE_W / 2, -POLE_H, POLE_W, POLE_H)
      .fill({ color: POLE_COLOR });
    group.addChild(pole);

    // Cloth (attached to top of pole, right side)
    const cloth = new Graphics()
      .moveTo(0, 0)
      .lineTo(CLOTH_W, CLOTH_H * 0.15)
      .lineTo(CLOTH_W * 0.85, CLOTH_H * 0.5)
      .lineTo(CLOTH_W, CLOTH_H * 0.85)
      .lineTo(0, CLOTH_H)
      .closePath()
      .fill({ color, alpha: 0.9 })
      .moveTo(0, 0)
      .lineTo(CLOTH_W, CLOTH_H * 0.15)
      .lineTo(CLOTH_W * 0.85, CLOTH_H * 0.5)
      .lineTo(CLOTH_W, CLOTH_H * 0.85)
      .lineTo(0, CLOTH_H)
      .closePath()
      .stroke({ color: 0x000000, alpha: 0.3, width: 0.5 });
    cloth.position.set(POLE_W / 2, -POLE_H);
    cloth.pivot.set(0, 0); // pivot at attachment point for sway
    group.addChild(cloth);

    // Small finial on top of pole
    const finial = new Graphics()
      .circle(0, -POLE_H - 2, 2)
      .fill({ color: 0xddaa33 });
    group.addChild(finial);

    this._container.addChild(group);
    this._flags.set(playerId, group);
    this._cloths.set(playerId, cloth);
    this._phases.set(playerId, Math.random() * Math.PI * 2);

    // Placement animation: rise from ground
    group.scale.set(0.3);
    group.alpha = 0;

    gsap.to(group.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: "back.out(2)",
    });

    gsap.to(group, {
      alpha: 1,
      duration: 0.15,
    });
  }

  destroy(): void {
    for (const flag of this._flags.values()) {
      gsap.killTweensOf(flag);
      gsap.killTweensOf(flag.scale);
      if (flag.parent) flag.parent.removeChild(flag);
      flag.destroy({ children: true });
    }
    this._flags.clear();
    this._cloths.clear();
    this._phases.clear();
  }
}

export const flagFX = new FlagFX();
