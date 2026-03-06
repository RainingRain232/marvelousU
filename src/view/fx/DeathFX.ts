// Death & cleanup particle effects.
//
// Per-type death FX:
//   KNIGHT, SWORDSMAN, PIKEMAN → dust + dirt puff (earthy brown/grey)
//   ARCHER                     → dust + feather scatter (tan/white)
//   MAGE                       → soul wisps (blue-violet)
//   SUMMONED                   → dissolve sparks (purple, upward)
//
// All effects use ParticlePool for batched rendering.

import { type Renderer } from "pixi.js";
import { UnitType } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { ParticlePool } from "@view/fx/ParticlePool";
import type { ViewManager } from "@view/ViewManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

// Dust (melee / archer) — earthy tones
const DUST_TINTS = [0xc8a878, 0xa08060, 0xd4b896, 0x887060];
const DUST_COUNT = 12;

// Soul wisps (mage) — blue-violet
const SOUL_TINTS = [0x8844ff, 0xaa66ff, 0x6622cc, 0xccaaff];
const SOUL_COUNT = 16;

// Dissolve sparks (summoned) — purple/magenta
const DISSOLVE_TINTS = [0xff44ff, 0xcc22cc, 0xff88ff, 0xaa00aa];
const DISSOLVE_COUNT = 20;

// ---------------------------------------------------------------------------
// DeathFX
// ---------------------------------------------------------------------------

export class DeathFX {
  private _dustPool!: ParticlePool;
  private _soulPool!: ParticlePool;
  private _dissolvePool!: ParticlePool;

  private _unsubscribers: Array<() => void> = [];

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    const renderer = vm.app.renderer as Renderer;

    const dustTex = ParticlePool.createCircleTexture(renderer, 5, 0xc8a878);
    this._dustPool = new ParticlePool(dustTex, 256);
    this._dustPool.mount(vm.layers.fx);

    const soulTex = ParticlePool.createCircleTexture(renderer, 4, 0x8844ff);
    this._soulPool = new ParticlePool(soulTex, 256);
    this._soulPool.mount(vm.layers.fx);

    const dissolveTex = ParticlePool.createCircleTexture(renderer, 4, 0xff44ff);
    this._dissolvePool = new ParticlePool(dissolveTex, 256);
    this._dissolvePool.mount(vm.layers.fx);
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  readonly update = (dt: number): void => {
    this._dustPool.update(dt);
    this._soulPool.update(dt);
    this._dissolvePool.update(dt);
  };

  // ---------------------------------------------------------------------------
  // Trigger
  // ---------------------------------------------------------------------------

  /**
   * Emit death particles at the given screen position for the given unit type.
   * Called by UnitLayer on `unitDied`.
   */
  play(unitType: UnitType, screenX: number, screenY: number): void {
    switch (unitType) {
      case UnitType.FIRE_MAGE:
      case UnitType.STORM_MAGE:
      case UnitType.SUMMONER:
        this._playSoulWisps(screenX, screenY);
        break;
      case UnitType.SUMMONED:
        this._playDissolve(screenX, screenY);
        break;
      default:
        // SWORDSMAN, KNIGHT, PIKEMAN, ARCHER — all get dust puff
        this._playDust(screenX, screenY);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Effect implementations
  // ---------------------------------------------------------------------------

  private _playDust(cx: number, cy: number): void {
    for (let i = 0; i < DUST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60; // px/s
      const tint = DUST_TINTS[Math.floor(Math.random() * DUST_TINTS.length)];
      this._dustPool.emit({
        x: cx + (Math.random() - 0.5) * TS * 0.3,
        y: cy + (Math.random() - 0.5) * TS * 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30, // slight upward bias
        life: 0.5 + Math.random() * 0.5,
        scaleStart: 0.8 + Math.random() * 0.6,
        scaleEnd: 0,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 40,
      });
    }
  }

  private _playSoulWisps(cx: number, cy: number): void {
    for (let i = 0; i < SOUL_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // upward cone
      const speed = 30 + Math.random() * 70;
      const tint = SOUL_TINTS[Math.floor(Math.random() * SOUL_TINTS.length)];
      this._soulPool.emit({
        x: cx + (Math.random() - 0.5) * TS * 0.4,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.8,
        scaleStart: 1.0 + Math.random() * 0.5,
        scaleEnd: 0,
        alphaStart: 1.0,
        alphaEnd: 0,
        tint,
        gravity: -20, // soul floats upward
      });
    }
  }

  private _playDissolve(cx: number, cy: number): void {
    for (let i = 0; i < DISSOLVE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const tint =
        DISSOLVE_TINTS[Math.floor(Math.random() * DISSOLVE_TINTS.length)];
      this._dissolvePool.emit({
        x: cx + (Math.random() - 0.5) * TS * 0.5,
        y: cy + (Math.random() - 0.5) * TS * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.4 + Math.random() * 0.6,
        scaleStart: 1.2,
        scaleEnd: 0,
        alphaStart: 1.0,
        alphaEnd: 0,
        tint,
        gravity: 15,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this._dustPool.destroy();
    this._soulPool.destroy();
    this._dissolvePool.destroy();
  }
}

export const deathFX = new DeathFX();
