// Spell impact visual effects — damage explosions, heal glows, summon runes.
//
// Uses Graphics drawn directly on the fx layer with gsap animation.
// Each effect auto-removes after its animation completes.

import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

const DMG_COLORS: Record<string, { ring: number; fill: number; particle: number }> = {
  fire:      { ring: 0xff6622, fill: 0xff4400, particle: 0xffaa44 },
  ice:       { ring: 0x66bbee, fill: 0x4488cc, particle: 0xaaddff },
  lightning: { ring: 0x4488ff, fill: 0x2266dd, particle: 0xccddff },
  arcane:    { ring: 0x9966ff, fill: 0x6633cc, particle: 0xddaaff },
  earth:     { ring: 0x886633, fill: 0x664422, particle: 0xccaa66 },
  holy:      { ring: 0xffdd44, fill: 0xccaa22, particle: 0xffffaa },
  void:      { ring: 0x663399, fill: 0x331166, particle: 0xaa66cc },
  poison:    { ring: 0x44aa33, fill: 0x226611, particle: 0x88dd66 },
  default:   { ring: 0xff4444, fill: 0xcc2222, particle: 0xffaaaa },
};

const HEAL_COLORS = { ring: 0x22cc44, fill: 0x118833, particle: 0xaaffbb };

// ---------------------------------------------------------------------------
// SpellFX
// ---------------------------------------------------------------------------

export class SpellFX {
  private _vm!: ViewManager;

  init(vm: ViewManager): void {
    this._vm = vm;
  }

  /**
   * Play a damage spell impact effect at a world position.
   * @param worldX  center X in pixels
   * @param worldY  center Y in pixels
   * @param radius  effect radius in tiles
   * @param element visual theme key (fire, ice, lightning, arcane, etc.)
   */
  playDamage(worldX: number, worldY: number, radius: number, element: string): void {
    const colors = DMG_COLORS[element] ?? DMG_COLORS.default;
    const radiusPx = radius * TS;
    this._playImpact(worldX, worldY, radiusPx, colors);
  }

  /**
   * Play a healing spell effect at a world position.
   */
  playHeal(worldX: number, worldY: number, radius: number): void {
    const radiusPx = radius * TS;
    this._playImpact(worldX, worldY, radiusPx, HEAL_COLORS);
  }

  /**
   * Play a summon rune circle effect at a world position.
   */
  playSummonRune(worldX: number, worldY: number): void {
    const container = new Container();
    container.position.set(worldX, worldY);
    this._vm.addToLayer("fx", container);

    const runeColors = [0x9966ff, 0xcc99ff, 0xddaaff];

    // Three concentric rotating circles
    for (let i = 0; i < 3; i++) {
      const r = 12 + i * 10;
      const g = new Graphics();
      // Rune circle ring
      g.circle(0, 0, r).stroke({ color: runeColors[i], width: 1.5, alpha: 0.8 });
      // Rune glyphs (small diamonds around the circle)
      for (let j = 0; j < 6 + i * 2; j++) {
        const a = (j / (6 + i * 2)) * Math.PI * 2;
        const gx = Math.cos(a) * r;
        const gy = Math.sin(a) * r;
        g.moveTo(gx, gy - 2)
          .lineTo(gx + 1.5, gy)
          .lineTo(gx, gy + 2)
          .lineTo(gx - 1.5, gy)
          .closePath()
          .fill({ color: 0xddaaff, alpha: 0.6 });
      }
      g.alpha = 0;
      container.addChild(g);

      // Animate: fade in, rotate, then fade out
      gsap.to(g, {
        alpha: 0.9 - i * 0.15,
        duration: 0.3,
        delay: i * 0.1,
      });
      gsap.to(g, {
        rotation: (i % 2 === 0 ? 1 : -1) * Math.PI,
        duration: 1.5,
        ease: "power1.out",
      });
      gsap.to(g, {
        alpha: 0,
        duration: 0.5,
        delay: 1.0,
      });
    }

    // Upward particle sparkles
    for (let i = 0; i < 12; i++) {
      const spark = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: 0xddaaff, alpha: 0.8 });
      spark.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
      );
      container.addChild(spark);

      gsap.to(spark, {
        y: spark.position.y - 30 - Math.random() * 20,
        alpha: 0,
        duration: 0.8 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    // Cleanup
    gsap.delayedCall(2, () => {
      this._vm.removeFromLayer("fx", container);
      container.destroy({ children: true });
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _playImpact(
    worldX: number,
    worldY: number,
    radiusPx: number,
    colors: { ring: number; fill: number; particle: number },
  ): void {
    const container = new Container();
    container.position.set(worldX, worldY);
    this._vm.addToLayer("fx", container);

    // 1. Expanding ring
    const ring = new Graphics()
      .circle(0, 0, radiusPx * 0.3)
      .stroke({ color: colors.ring, width: 3, alpha: 0.9 });
    ring.alpha = 1;
    container.addChild(ring);

    gsap.to(ring, {
      pixi: { scaleX: radiusPx / (radiusPx * 0.3), scaleY: radiusPx / (radiusPx * 0.3) },
      alpha: 0,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        ring.clear()
          .circle(0, 0, radiusPx * 0.3)
          .stroke({ color: colors.ring, width: 3, alpha: ring.alpha });
      },
    });

    // 2. Flash fill
    const flash = new Graphics()
      .circle(0, 0, radiusPx)
      .fill({ color: colors.fill, alpha: 0.3 });
    container.addChild(flash);

    gsap.to(flash, {
      alpha: 0,
      duration: 0.4,
      ease: "power1.out",
    });

    // 3. Scatter particles
    const particleCount = 8 + Math.floor(radiusPx / 10);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radiusPx;
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random() * 1.5)
        .fill({ color: colors.particle, alpha: 0.9 });
      p.position.set(Math.cos(angle) * dist * 0.3, Math.sin(angle) * dist * 0.3);
      container.addChild(p);

      gsap.to(p, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 10 - Math.random() * 15,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    // Cleanup
    gsap.delayedCall(1.2, () => {
      this._vm.removeFromLayer("fx", container);
      container.destroy({ children: true });
    });
  }
}

export const spellFX = new SpellFX();
