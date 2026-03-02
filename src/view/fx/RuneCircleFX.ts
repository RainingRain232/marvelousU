// Animated rune circle FX — detailed magic circle that appears when any unit
// starts casting. The circle follows a brightness arc:
//   dim → bright with animated runes → fade out
//
// Color-themed per ability type:
//   Lightning: blue/white     Fire: orange/red      Ice: cyan/white
//   Summon: purple/lavender   Heal: green/white     Default: purple

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

interface RuneTheme {
  primary: number;
  secondary: number;
  rune: number;
  flash: number;
}

const THEMES: Record<string, RuneTheme> = {
  lightning: { primary: 0x4488ff, secondary: 0x88ccff, rune: 0xccddff, flash: 0xeeffff },
  fire:      { primary: 0xff6622, secondary: 0xff9944, rune: 0xffcc66, flash: 0xffffaa },
  ice:       { primary: 0x66bbee, secondary: 0xaaddff, rune: 0xddeeff, flash: 0xffffff },
  summon:    { primary: 0x9966ff, secondary: 0xcc99ff, rune: 0xddaaff, flash: 0xeeddff },
  heal:      { primary: 0x22cc44, secondary: 0x66ee88, rune: 0xaaffbb, flash: 0xddffdd },
  default:   { primary: 0x9966ff, secondary: 0xcc99ff, rune: 0xddaaff, flash: 0xeeddff },
};

function themeKeyForAbilityType(type: string): string {
  switch (type) {
    case AbilityType.CHAIN_LIGHTNING: return "lightning";
    case AbilityType.FIREBALL: return "fire";
    case AbilityType.ICE_BALL: return "ice";
    case AbilityType.SUMMON: return "summon";
    case AbilityType.HEAL: return "heal";
    default: return "default";
  }
}

// ---------------------------------------------------------------------------
// Rune glyph drawing — geometric "rune" symbols
// ---------------------------------------------------------------------------

function drawRuneGlyph(g: Graphics, index: number, color: number, size: number): void {
  g.setStrokeStyle({ width: 1.2, color });
  const hs = size / 2;

  switch (index % 8) {
    case 0: // vertical line with diamond
      g.moveTo(0, -hs).lineTo(0, hs).stroke();
      g.moveTo(0, -hs * 0.4).lineTo(hs * 0.3, 0).lineTo(0, hs * 0.4).lineTo(-hs * 0.3, 0).closePath().stroke();
      break;
    case 1: // zigzag
      g.moveTo(-hs * 0.4, -hs).lineTo(hs * 0.4, -hs * 0.3).lineTo(-hs * 0.4, hs * 0.3).lineTo(hs * 0.4, hs).stroke();
      break;
    case 2: // cross with circle
      g.moveTo(-hs * 0.5, 0).lineTo(hs * 0.5, 0).stroke();
      g.moveTo(0, -hs * 0.5).lineTo(0, hs * 0.5).stroke();
      g.circle(0, 0, hs * 0.25).stroke();
      break;
    case 3: // arrow pointing up
      g.moveTo(0, -hs).lineTo(hs * 0.3, -hs * 0.4).stroke();
      g.moveTo(0, -hs).lineTo(-hs * 0.3, -hs * 0.4).stroke();
      g.moveTo(0, -hs).lineTo(0, hs).stroke();
      break;
    case 4: // triangle
      g.moveTo(0, -hs * 0.6).lineTo(hs * 0.5, hs * 0.4).lineTo(-hs * 0.5, hs * 0.4).closePath().stroke();
      break;
    case 5: // hourglass
      g.moveTo(-hs * 0.3, -hs * 0.5).lineTo(hs * 0.3, -hs * 0.5).lineTo(-hs * 0.3, hs * 0.5).lineTo(hs * 0.3, hs * 0.5).closePath().stroke();
      break;
    case 6: // Y fork
      g.moveTo(0, hs).lineTo(0, 0).stroke();
      g.moveTo(0, 0).lineTo(-hs * 0.4, -hs * 0.6).stroke();
      g.moveTo(0, 0).lineTo(hs * 0.4, -hs * 0.6).stroke();
      break;
    case 7: // parallel lines with cross bar
      g.moveTo(-hs * 0.3, -hs * 0.5).lineTo(-hs * 0.3, hs * 0.5).stroke();
      g.moveTo(hs * 0.3, -hs * 0.5).lineTo(hs * 0.3, hs * 0.5).stroke();
      g.moveTo(-hs * 0.5, 0).lineTo(hs * 0.5, 0).stroke();
      break;
  }
}

// ---------------------------------------------------------------------------
// RuneCircleFX
// ---------------------------------------------------------------------------

export class RuneCircleFX {
  private _container!: Container;

  init(vm: ViewManager): void {
    this._container = new Container();
    vm.layers.groundfx.addChild(this._container);

    EventBus.on("castStarted", ({ position, castTime, abilityType }) => {
      const key = themeKeyForAbilityType(abilityType);
      const theme = THEMES[key];
      this._spawnCircle(position.x, position.y, castTime + 2, theme);
    });
  }

  update(_dt: number): void {
    // gsap handles all animation
  }

  // ---------------------------------------------------------------------------
  // Spawn
  // ---------------------------------------------------------------------------

  private _spawnCircle(tx: number, ty: number, duration: number, theme: RuneTheme): void {
    const cx = (tx + 0.5) * TS;
    const cy = (ty + 0.5) * TS;
    const radius = TS * 0.9;

    const group = new Container();
    group.position.set(cx, cy);
    group.alpha = 0;
    this._container.addChild(group);

    // --- Ground glow (soft disc behind everything) ---
    const glow = new Graphics()
      .circle(0, 0, radius + 6)
      .fill({ color: theme.primary, alpha: 0.15 });
    group.addChild(glow);

    // --- Outer ring (double stroke) ---
    const outerRing = new Graphics()
      .circle(0, 0, radius)
      .stroke({ color: theme.primary, width: 2.5, alpha: 0.9 })
      .circle(0, 0, radius + 3)
      .stroke({ color: theme.secondary, width: 0.8, alpha: 0.4 });
    group.addChild(outerRing);

    // --- Inner ring (counter-rotating) ---
    const innerRadius = radius * 0.55;
    const innerRing = new Graphics()
      .circle(0, 0, innerRadius)
      .stroke({ color: theme.secondary, width: 1.5, alpha: 0.7 });
    group.addChild(innerRing);

    // --- Connecting spokes ---
    const spokeCount = 8;
    const spokes = new Graphics();
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      spokes.setStrokeStyle({ width: 0.8, color: theme.primary, alpha: 0.3 });
      spokes.moveTo(cos * innerRadius, sin * innerRadius);
      spokes.lineTo(cos * radius, sin * radius);
      spokes.stroke();
    }
    group.addChild(spokes);

    // --- Rune glyphs between inner and outer rings ---
    const runeCount = 8;
    const runeContainer = new Container();
    group.addChild(runeContainer);

    const runeGlyphs: Graphics[] = [];
    for (let i = 0; i < runeCount; i++) {
      const a = (i / runeCount) * Math.PI * 2;
      const rx = Math.cos(a) * (radius * 0.78);
      const ry = Math.sin(a) * (radius * 0.78);

      const glyph = new Graphics();
      glyph.position.set(rx, ry);
      glyph.rotation = a + Math.PI / 2;
      glyph.alpha = 0;
      drawRuneGlyph(glyph, i, theme.rune, 10);
      runeContainer.addChild(glyph);
      runeGlyphs.push(glyph);
    }

    // --- Small diamond markers on outer ring ---
    const markerCount = 12;
    for (let i = 0; i < markerCount; i++) {
      const a = (i / markerCount) * Math.PI * 2;
      const marker = new Graphics()
        .rect(-1.5, -1.5, 3, 3)
        .fill({ color: theme.flash, alpha: 0.6 });
      marker.rotation = Math.PI / 4;
      marker.position.set(Math.cos(a) * radius, Math.sin(a) * radius);
      outerRing.addChild(marker);
    }

    // --- Center glyph: circle with inscribed star ---
    const centerGlyph = new Graphics();
    centerGlyph.alpha = 0;
    centerGlyph.setStrokeStyle({ width: 1.5, color: theme.flash, alpha: 0.8 });
    centerGlyph.circle(0, 0, innerRadius * 0.5).stroke();
    for (let i = 0; i < 6; i++) {
      const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 2) / 6) * Math.PI * 2 - Math.PI / 2;
      const starR = innerRadius * 0.4;
      centerGlyph.moveTo(Math.cos(a1) * starR, Math.sin(a1) * starR);
      centerGlyph.lineTo(Math.cos(a2) * starR, Math.sin(a2) * starR);
      centerGlyph.stroke();
    }
    group.addChild(centerGlyph);

    // =====================================================================
    // Animation — brightness arc: dim → bright → fade
    // =====================================================================

    const rampUp = duration * 0.3;
    const peakHold = duration * 0.4;
    const fadeOut = duration * 0.3;

    // Phase 1: Fade in dim
    gsap.to(group, {
      alpha: 0.5,
      duration: rampUp * 0.5,
      ease: "power2.out",
    });

    // Phase 1b: Brighten to full
    gsap.to(group, {
      alpha: 1.0,
      duration: rampUp * 0.5,
      delay: rampUp * 0.5,
      ease: "power1.out",
    });

    // Rune glyphs fade in with stagger
    runeGlyphs.forEach((glyph, i) => {
      gsap.to(glyph, {
        alpha: 1.0,
        duration: rampUp * 0.6,
        delay: rampUp * 0.2 + (i / runeCount) * rampUp * 0.4,
        ease: "power2.out",
      });
    });

    // Center glyph appears later
    gsap.to(centerGlyph, {
      alpha: 1.0,
      duration: rampUp * 0.5,
      delay: rampUp * 0.6,
      ease: "power2.out",
    });

    // Ground glow pulses during peak
    gsap.to(glow, {
      alpha: 0.4,
      duration: peakHold * 0.5,
      delay: rampUp,
      ease: "power1.inOut",
      yoyo: true,
      repeat: Math.max(1, Math.floor(peakHold / 0.3)),
    });

    // Rune glyphs flicker during peak
    runeGlyphs.forEach((glyph, i) => {
      gsap.to(glyph, {
        alpha: 0.5,
        duration: 0.15 + Math.random() * 0.1,
        delay: rampUp + (i / runeCount) * 0.2,
        ease: "power1.inOut",
        yoyo: true,
        repeat: Math.max(2, Math.floor(peakHold / 0.2)),
      });
    });

    // Outer ring rotates clockwise
    gsap.to(outerRing, {
      rotation: Math.PI * 0.6,
      duration: duration,
      ease: "none",
    });

    // Inner ring counter-rotates
    gsap.to(innerRing, {
      rotation: -Math.PI * 0.8,
      duration: duration,
      ease: "none",
    });

    // Spokes rotate with outer
    gsap.to(spokes, {
      rotation: Math.PI * 0.6,
      duration: duration,
      ease: "none",
    });

    // Rune container slow rotation
    gsap.to(runeContainer, {
      rotation: Math.PI * 0.3,
      duration: duration,
      ease: "none",
    });

    // Center glyph counter-rotates
    gsap.to(centerGlyph, {
      rotation: -Math.PI * 0.5,
      duration: duration,
      ease: "none",
    });

    // Scale pulse at peak
    gsap.to(group.scale, {
      x: 1.06,
      y: 1.06,
      duration: peakHold * 0.3,
      delay: rampUp,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1,
    });

    // Phase 3: Fade out
    const fadeStart = rampUp + peakHold;
    gsap.to(group, {
      alpha: 0,
      duration: fadeOut,
      delay: fadeStart,
      ease: "power2.in",
      onComplete: () => {
        if (group.parent) this._container.removeChild(group);
        group.destroy({ children: true });
      },
    });

    // Scale down during fade
    gsap.to(group.scale, {
      x: 0.9,
      y: 0.9,
      duration: fadeOut,
      delay: fadeStart,
      ease: "power2.in",
    });
  }
}

export const runeCircleFX = new RuneCircleFX();
