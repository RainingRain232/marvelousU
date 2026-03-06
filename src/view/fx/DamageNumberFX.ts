// Floating damage / healing numbers above units.
// Red numbers for damage, green numbers for healing.
// Floats upward and fades out over ~0.8 seconds.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;
const FLOAT_DURATION = 0.8;
const FLOAT_DISTANCE = TS * 0.8; // how far the number floats upward

const STYLE_DAMAGE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: "bold",
  fill: 0xff4444,
  stroke: { color: 0x000000, width: 3 },
});

const STYLE_HEAL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: "bold",
  fill: 0x44ff66,
  stroke: { color: 0x000000, width: 3 },
});

const STYLE_CRIT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fontWeight: "bold",
  fill: 0xffaa00,
  stroke: { color: 0x000000, width: 4 },
});

export class DamageNumberFX {
  private _container!: Container;
  private _state!: GameState;
  private _enabled = true;

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(v: boolean) {
    this._enabled = v;
  }

  init(vm: ViewManager, state: GameState): void {
    this._container = new Container();
    this._state = state;
    vm.layers.fx.addChild(this._container);

    EventBus.on("unitDamaged", ({ unitId, amount }) => {
      if (!this._enabled) return;
      const unit = this._state.units.get(unitId);
      if (!unit) return;
      this._spawn(unit.position.x, unit.position.y, `-${Math.round(amount)}`, false);
    });

    EventBus.on("unitCrit", ({ unitId, amount }) => {
      if (!this._enabled) return;
      const unit = this._state.units.get(unitId);
      if (!unit) return;
      this._spawnCrit(unit.position.x, unit.position.y, amount);
    });

    EventBus.on("unitHealed", ({ position, amount }) => {
      if (!this._enabled) return;
      this._spawn(position.x, position.y, `+${Math.round(amount)}`, true);
    });
  }

  update(_dt: number): void {
    // gsap handles animations
  }

  private _spawn(tx: number, ty: number, label: string, isHeal: boolean): void {
    // Small random horizontal offset to avoid stacking
    const offsetX = (Math.random() - 0.5) * TS * 0.4;
    const cx = (tx + 0.5) * TS + offsetX;
    const cy = (ty + 0.5) * TS - TS * 0.5; // start above unit center

    const text = new Text({
      text: label,
      style: isHeal ? STYLE_HEAL : STYLE_DAMAGE,
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(cx, cy);
    text.scale.set(0.6);
    text.alpha = 0;
    this._container.addChild(text);

    // Pop in
    gsap.to(text.scale, {
      x: 1,
      y: 1,
      duration: 0.12,
      ease: "back.out(2)",
    });

    gsap.to(text, {
      alpha: 1,
      duration: 0.08,
    });

    // Float up and fade out
    gsap.to(text, {
      y: cy - FLOAT_DISTANCE,
      duration: FLOAT_DURATION,
      ease: "power2.out",
    });

    gsap.to(text, {
      alpha: 0,
      duration: FLOAT_DURATION * 0.4,
      delay: FLOAT_DURATION * 0.6,
      ease: "power2.in",
      onComplete: () => {
        if (text.parent) this._container.removeChild(text);
        text.destroy();
      },
    });
  }
  private _spawnCrit(tx: number, ty: number, amount: number): void {
    const offsetX = (Math.random() - 0.5) * TS * 0.4;
    const cx = (tx + 0.5) * TS + offsetX;
    const cy = (ty + 0.5) * TS - TS * 0.5;

    // White flash behind text
    const flash = new Graphics().circle(0, 0, TS * 0.3).fill({ color: 0xffffff, alpha: 0.6 });
    flash.position.set(cx, cy);
    flash.scale.set(0.3);
    flash.alpha = 0.8;
    this._container.addChild(flash);
    gsap.to(flash.scale, { x: 1.5, y: 1.5, duration: 0.2, ease: "power2.out" });
    gsap.to(flash, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => {
        if (flash.parent) this._container.removeChild(flash);
        flash.destroy();
      },
    });

    // Bigger gold damage number
    const text = new Text({ text: `-${Math.round(amount)}!`, style: STYLE_CRIT });
    text.anchor.set(0.5, 0.5);
    text.position.set(cx, cy);
    text.scale.set(0.8);
    text.alpha = 0;
    this._container.addChild(text);

    gsap.to(text.scale, { x: 1.4, y: 1.4, duration: 0.15, ease: "back.out(3)" });
    gsap.to(text, { alpha: 1, duration: 0.08 });
    gsap.to(text, { y: cy - FLOAT_DISTANCE, duration: FLOAT_DURATION, ease: "power2.out" });
    gsap.to(text, {
      alpha: 0,
      duration: FLOAT_DURATION * 0.4,
      delay: FLOAT_DURATION * 0.6,
      ease: "power2.in",
      onComplete: () => {
        if (text.parent) this._container.removeChild(text);
        text.destroy();
      },
    });
  }
}

export const damageNumberFX = new DamageNumberFX();
