// Aura pulse VFX — expanding rune blast that radiates outward from the caster.
// Listens for "auraPulse" events emitted by the Aura ability.
// Fire aura: orange/red expanding runes with ember particles
// Ice aura: cyan/blue expanding runes with frost crystals

import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { AbilityType } from "@/types";

const TS = BalanceConfig.TILE_SIZE;

// ---------------------------------------------------------------------------
// Color themes
// ---------------------------------------------------------------------------

interface AuraTheme {
  primary: number;
  secondary: number;
  rune: number;
  glow: number;
  particle: number;
}

const FIRE_THEME: AuraTheme = {
  primary: 0xff6622,
  secondary: 0xff9944,
  rune: 0xffcc66,
  glow: 0xff4400,
  particle: 0xffaa22,
};

const ICE_THEME: AuraTheme = {
  primary: 0x44aaee,
  secondary: 0x88ccff,
  rune: 0xddeeff,
  glow: 0x2288cc,
  particle: 0xaaddff,
};

function getTheme(abilityType: string): AuraTheme {
  if (abilityType === AbilityType.ICE_AURA || abilityType === AbilityType.MINOR_ICE_AURA) return ICE_THEME;
  return FIRE_THEME;
}

// ---------------------------------------------------------------------------
// Rune glyph drawing
// ---------------------------------------------------------------------------

function drawRuneGlyph(g: Graphics, index: number, color: number, size: number): void {
  g.setStrokeStyle({ width: 1.5, color });
  const hs = size / 2;

  switch (index % 6) {
    case 0: // diamond
      g.moveTo(0, -hs).lineTo(hs * 0.5, 0).lineTo(0, hs).lineTo(-hs * 0.5, 0).closePath().stroke();
      break;
    case 1: // zigzag bolt
      g.moveTo(-hs * 0.3, -hs).lineTo(hs * 0.3, -hs * 0.2).lineTo(-hs * 0.3, hs * 0.2).lineTo(hs * 0.3, hs).stroke();
      break;
    case 2: // triangle
      g.moveTo(0, -hs * 0.7).lineTo(hs * 0.6, hs * 0.5).lineTo(-hs * 0.6, hs * 0.5).closePath().stroke();
      break;
    case 3: // cross
      g.moveTo(-hs * 0.5, 0).lineTo(hs * 0.5, 0).stroke();
      g.moveTo(0, -hs * 0.5).lineTo(0, hs * 0.5).stroke();
      break;
    case 4: // arrow up
      g.moveTo(0, -hs).lineTo(hs * 0.4, -hs * 0.3).stroke();
      g.moveTo(0, -hs).lineTo(-hs * 0.4, -hs * 0.3).stroke();
      g.moveTo(0, -hs).lineTo(0, hs).stroke();
      break;
    case 5: // circle with dot
      g.circle(0, 0, hs * 0.4).stroke();
      g.circle(0, 0, 1.5).fill({ color });
      break;
  }
}

// ---------------------------------------------------------------------------
// AuraFX
// ---------------------------------------------------------------------------

export class AuraFX {
  private _container!: Container;

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.groundfx.addChild(this._container);

    EventBus.on("auraPulse", ({ position, radius, abilityType }) => {
      const theme = getTheme(abilityType);
      this._spawnBlast(position.x, position.y, radius, theme);
    });
  }

  update(_dt: number): void {
    // gsap handles all animation
  }

  // ---------------------------------------------------------------------------
  // Spawn expanding rune blast
  // ---------------------------------------------------------------------------

  private _spawnBlast(
    tx: number,
    ty: number,
    radius: number,
    theme: AuraTheme,
  ): void {
    const cx = (tx + 0.5) * TS;
    const cy = (ty + 0.5) * TS;
    const maxRadius = radius * TS;
    const duration = 1.2;

    const group = new Container();
    group.position.set(cx, cy);
    group.alpha = 0;
    this._container.addChild(group);

    // --- Ground glow disc ---
    const glow = new Graphics()
      .circle(0, 0, maxRadius * 0.3)
      .fill({ color: theme.glow, alpha: 0.25 });
    group.addChild(glow);

    // --- Expanding shockwave ring ---
    const ring = new Graphics()
      .circle(0, 0, 1)
      .stroke({ color: theme.primary, width: 3, alpha: 0.9 });
    ring.scale.set(0.1);
    group.addChild(ring);

    // --- Second thinner ring (slightly delayed) ---
    const ring2 = new Graphics()
      .circle(0, 0, 1)
      .stroke({ color: theme.secondary, width: 1.5, alpha: 0.6 });
    ring2.scale.set(0.1);
    group.addChild(ring2);

    // --- Expanding rune glyphs that fly outward ---
    const runeCount = 8;
    const runes: Graphics[] = [];
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2;
      const glyph = new Graphics();
      glyph.position.set(0, 0);
      glyph.rotation = angle + Math.PI / 2;
      glyph.alpha = 0;
      drawRuneGlyph(glyph, i, theme.rune, 10);
      group.addChild(glyph);
      runes.push(glyph);
    }

    // --- Particle sparks (small dots that fly outward) ---
    const particleCount = 12;
    const particles: Graphics[] = [];
    for (let i = 0; i < particleCount; i++) {
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random() * 1)
        .fill({ color: theme.particle, alpha: 0.8 });
      p.position.set(0, 0);
      p.alpha = 0;
      group.addChild(p);
      particles.push(p);
    }

    // --- Inner flash (bright center burst) ---
    const flash = new Graphics()
      .circle(0, 0, 8)
      .fill({ color: theme.rune, alpha: 0.6 });
    flash.scale.set(0);
    group.addChild(flash);

    // =====================================================================
    // Animation
    // =====================================================================

    // Fade in fast
    gsap.to(group, {
      alpha: 1,
      duration: 0.08,
      ease: "power2.out",
    });

    // Center flash burst
    gsap.to(flash.scale, {
      x: 2.5,
      y: 2.5,
      duration: 0.2,
      ease: "power2.out",
    });
    gsap.to(flash, {
      alpha: 0,
      duration: 0.4,
      delay: 0.1,
      ease: "power2.in",
    });

    // Ground glow expands and fades
    gsap.to(glow, {
      alpha: 0.4,
      duration: 0.15,
      ease: "power2.out",
    });
    gsap.to(glow, {
      alpha: 0,
      duration: duration * 0.6,
      delay: duration * 0.3,
      ease: "power2.in",
    });

    // Main ring expands outward
    gsap.to(ring.scale, {
      x: maxRadius,
      y: maxRadius,
      duration: duration * 0.7,
      ease: "power2.out",
    });
    gsap.to(ring, {
      alpha: 0,
      duration: duration * 0.4,
      delay: duration * 0.4,
      ease: "power2.in",
    });

    // Second ring expands with slight delay
    gsap.to(ring2.scale, {
      x: maxRadius * 0.85,
      y: maxRadius * 0.85,
      duration: duration * 0.6,
      delay: 0.08,
      ease: "power2.out",
    });
    gsap.to(ring2, {
      alpha: 0,
      duration: duration * 0.3,
      delay: duration * 0.45,
      ease: "power2.in",
    });

    // Rune glyphs fly outward from center
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2;
      const targetX = Math.cos(angle) * maxRadius * 0.8;
      const targetY = Math.sin(angle) * maxRadius * 0.8;
      const delay = 0.02 + (i / runeCount) * 0.1;

      // Fade in
      gsap.to(runes[i], {
        alpha: 1,
        duration: 0.1,
        delay,
        ease: "power2.out",
      });

      // Move outward
      gsap.to(runes[i].position, {
        x: targetX,
        y: targetY,
        duration: duration * 0.65,
        delay,
        ease: "power2.out",
      });

      // Spin while moving
      gsap.to(runes[i], {
        rotation: runes[i].rotation + Math.PI * 1.5,
        duration: duration * 0.7,
        delay,
        ease: "power1.out",
      });

      // Fade out
      gsap.to(runes[i], {
        alpha: 0,
        duration: duration * 0.3,
        delay: duration * 0.5,
        ease: "power2.in",
      });
    }

    // Particles fly outward in random directions
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = maxRadius * (0.5 + Math.random() * 0.6);
      const targetX = Math.cos(angle) * dist;
      const targetY = Math.sin(angle) * dist;
      const delay = Math.random() * 0.12;

      gsap.to(particles[i], {
        alpha: 0.9,
        duration: 0.06,
        delay,
      });

      gsap.to(particles[i].position, {
        x: targetX,
        y: targetY,
        duration: duration * 0.55 + Math.random() * 0.2,
        delay,
        ease: "power2.out",
      });

      gsap.to(particles[i], {
        alpha: 0,
        duration: duration * 0.3,
        delay: duration * 0.4 + Math.random() * 0.15,
        ease: "power1.in",
      });
    }

    // Cleanup: fade entire group and destroy
    gsap.to(group, {
      alpha: 0,
      duration: duration * 0.25,
      delay: duration * 0.75,
      ease: "power2.in",
      onComplete: () => {
        if (group.parent) this._container.removeChild(group);
        group.destroy({ children: true });
      },
    });
  }
}

export const auraFX = new AuraFX();
