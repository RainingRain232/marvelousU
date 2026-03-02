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
import { ParticlePool } from "@view/fx/ParticlePool";

const TS = BalanceConfig.TILE_SIZE;

const SUMMON_COUNT = 3;
const SPREAD_PX = TS; // 1 tile radius

/** Visual lifespan of the summon magic circle in seconds. */
const CIRCLE_LIFESPAN = 2;

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
    vm.layers.groundfx.addChild(this._container);

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
    const outerR = SPREAD_PX + 14;
    const innerR = SPREAD_PX - 8;
    const midR = (outerR + innerR) / 2; // rune band between rings
    const fadeDelay = CIRCLE_LIFESPAN - 0.5;

    const group = new Container();
    group.position.set(cx, cy);
    group.alpha = 0;
    this._container.addChild(group);

    // --- Ground glow ---
    const glow = new Graphics()
      .circle(0, 0, outerR + 10)
      .fill({ color: 0x9966ff, alpha: 0.2 });
    group.addChild(glow);

    // --- Outer ring (double stroke for thickness) ---
    const outerRing = new Graphics()
      .circle(0, 0, outerR)
      .stroke({ color: 0x9966ff, width: 3, alpha: 0.95 })
      .circle(0, 0, outerR + 4)
      .stroke({ color: 0xddaaff, width: 1, alpha: 0.4 });
    group.addChild(outerRing);

    // --- Inner ring ---
    const innerRing = new Graphics()
      .circle(0, 0, innerR)
      .stroke({ color: 0xcc99ff, width: 2, alpha: 0.85 });
    group.addChild(innerRing);

    // --- Spokes connecting inner to outer ---
    const spokeCount = 8;
    const spokes = new Graphics();
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      spokes.setStrokeStyle({ width: 0.8, color: 0xcc99ff, alpha: 0.35 });
      spokes.moveTo(cos * innerR, sin * innerR);
      spokes.lineTo(cos * outerR, sin * outerR);
      spokes.stroke();
    }
    group.addChild(spokes);

    // --- Rune glyphs in the band between inner and outer rings ---
    const runeCount = 6;
    const runeContainer = new Container();
    group.addChild(runeContainer);

    for (let i = 0; i < runeCount; i++) {
      const a = (i / runeCount) * Math.PI * 2;
      const glyph = new Graphics();
      glyph.position.set(Math.cos(a) * midR, Math.sin(a) * midR);
      glyph.rotation = a + Math.PI / 2;
      glyph.alpha = 0;
      this._drawSummonRune(glyph, i);
      runeContainer.addChild(glyph);

      // Staggered fade in
      gsap.to(glyph, {
        alpha: 1,
        duration: 0.3,
        delay: 0.05 + i * 0.06,
        ease: "power2.out",
      });
      // Pulse / flicker
      gsap.to(glyph, {
        alpha: 0.4,
        duration: 0.2 + Math.random() * 0.15,
        delay: 0.4,
        ease: "power1.inOut",
        yoyo: true,
        repeat: Math.max(2, Math.floor(CIRCLE_LIFESPAN / 0.3)),
      });
      // Fade out
      gsap.to(glyph, {
        alpha: 0,
        duration: 0.4,
        delay: fadeDelay,
      });
    }

    // --- Diamond markers on outer ring ---
    const markerCount = 12;
    for (let i = 0; i < markerCount; i++) {
      const a = (i / markerCount) * Math.PI * 2;
      const marker = new Graphics()
        .rect(-2, -2, 4, 4)
        .fill({ color: 0xddaaff, alpha: 0.7 });
      marker.rotation = Math.PI / 4;
      marker.position.set(Math.cos(a) * outerR, Math.sin(a) * outerR);
      outerRing.addChild(marker);
    }

    // --- Center star glyph ---
    const center = new Graphics();
    center.setStrokeStyle({ width: 1.5, color: 0xeeddff, alpha: 0.8 });
    const starR = innerR * 0.5;
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      center.moveTo(Math.cos(a1) * starR, Math.sin(a1) * starR);
      center.lineTo(Math.cos(a2) * starR, Math.sin(a2) * starR);
      center.stroke();
    }
    center.alpha = 0;
    group.addChild(center);

    // --- Bright flash at spawn moment ---
    const flash = new Graphics()
      .circle(0, 0, outerR + 8)
      .fill({ color: 0xeeddff, alpha: 0.6 });
    flash.alpha = 0;
    group.addChild(flash);

    gsap.to(flash, {
      alpha: 1,
      duration: 0.1,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(flash, {
          alpha: 0,
          duration: 0.3,
          ease: "power2.in",
        });
      },
    });

    // --- Animations ---

    // Group fade in
    gsap.to(group, { alpha: 1, duration: 0.25, ease: "power2.out" });

    // Glow pulse
    gsap.to(glow, {
      alpha: 0.5,
      duration: 0.4,
      delay: 0.2,
      ease: "power1.inOut",
      yoyo: true,
      repeat: Math.max(1, Math.floor(CIRCLE_LIFESPAN / 0.4)),
    });

    // Center star fade in + rotate
    gsap.to(center, { alpha: 0.9, duration: 0.3, delay: 0.15, ease: "power2.out" });
    gsap.to(center, { rotation: -Math.PI * 0.6, duration: CIRCLE_LIFESPAN, ease: "none" });

    // Outer ring rotates clockwise
    gsap.to(outerRing, { rotation: Math.PI * 0.8, duration: CIRCLE_LIFESPAN, ease: "none" });

    // Inner ring counter-rotates
    gsap.to(innerRing, { rotation: -Math.PI * 1.0, duration: CIRCLE_LIFESPAN, ease: "none" });

    // Spokes rotate with outer
    gsap.to(spokes, { rotation: Math.PI * 0.8, duration: CIRCLE_LIFESPAN, ease: "none" });

    // Rune container slow rotation
    gsap.to(runeContainer, { rotation: Math.PI * 0.4, duration: CIRCLE_LIFESPAN, ease: "none" });

    // Scale pop on spawn
    group.scale.set(0.7);
    gsap.to(group.scale, { x: 1.05, y: 1.05, duration: 0.3, ease: "back.out(2)" });
    gsap.to(group.scale, {
      x: 1.0, y: 1.0, duration: 0.2, delay: 0.3, ease: "power1.out",
    });

    // Fade out
    gsap.to(group, {
      alpha: 0,
      duration: 0.5,
      delay: fadeDelay,
      ease: "power2.in",
      onComplete: () => {
        if (group.parent) this._container.removeChild(group);
        group.destroy({ children: true });
      },
    });

    // Scale down during fade
    gsap.to(group.scale, {
      x: 0.85, y: 0.85, duration: 0.5, delay: fadeDelay, ease: "power2.in",
    });

    // --- Continuous particles floating up from circle and runes ---
    this._emitCircleParticles(cx, cy, outerR, midR, runeCount);
  }

  /** Draw one of 6 unique summon rune glyphs. */
  private _drawSummonRune(g: Graphics, index: number): void {
    const s = 8;
    g.setStrokeStyle({ width: 1.2, color: 0xddaaff });
    switch (index % 6) {
      case 0: // vertical with diamond
        g.moveTo(0, -s).lineTo(0, s).stroke();
        g.moveTo(0, -s * 0.3).lineTo(s * 0.3, 0).lineTo(0, s * 0.3).lineTo(-s * 0.3, 0).closePath().stroke();
        break;
      case 1: // zigzag
        g.moveTo(-s * 0.4, -s).lineTo(s * 0.4, -s * 0.3).lineTo(-s * 0.4, s * 0.3).lineTo(s * 0.4, s).stroke();
        break;
      case 2: // triangle
        g.moveTo(0, -s * 0.6).lineTo(s * 0.5, s * 0.4).lineTo(-s * 0.5, s * 0.4).closePath().stroke();
        break;
      case 3: // Y fork
        g.moveTo(0, s).lineTo(0, 0).stroke();
        g.moveTo(0, 0).lineTo(-s * 0.4, -s * 0.6).stroke();
        g.moveTo(0, 0).lineTo(s * 0.4, -s * 0.6).stroke();
        break;
      case 4: // hourglass
        g.moveTo(-s * 0.3, -s * 0.5).lineTo(s * 0.3, -s * 0.5).lineTo(-s * 0.3, s * 0.5).lineTo(s * 0.3, s * 0.5).closePath().stroke();
        break;
      case 5: // cross with dot
        g.moveTo(-s * 0.5, 0).lineTo(s * 0.5, 0).stroke();
        g.moveTo(0, -s * 0.5).lineTo(0, s * 0.5).stroke();
        g.circle(0, 0, s * 0.2).stroke();
        break;
    }
  }

  /** Emit particles rising from the circle edge and rune positions over the circle's lifetime. */
  private _emitCircleParticles(
    cx: number, cy: number, outerR: number, midR: number, runeCount: number,
  ): void {
    const interval = 60; // ms between bursts
    const totalBursts = Math.floor((CIRCLE_LIFESPAN * 1000) / interval);
    let burst = 0;

    const timer = setInterval(() => {
      burst++;
      if (burst >= totalBursts) {
        clearInterval(timer);
        return;
      }

      // 2 particles from random spot on outer ring
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const tint = RUNE_TINTS[Math.floor(Math.random() * RUNE_TINTS.length)];
        this._pool.emit({
          x: cx + Math.cos(a) * outerR,
          y: cy + Math.sin(a) * outerR,
          vx: (Math.random() - 0.5) * 12,
          vy: -(20 + Math.random() * 30),
          life: 0.5 + Math.random() * 0.4,
          scaleStart: 0.4 + Math.random() * 0.3,
          scaleEnd: 0.05,
          alphaStart: 0.8,
          alphaEnd: 0,
          tint,
          gravity: 10,
        });
      }

      // 1 particle from a random rune position
      const ri = Math.floor(Math.random() * runeCount);
      const ra = (ri / runeCount) * Math.PI * 2;
      const tint = RUNE_TINTS[Math.floor(Math.random() * RUNE_TINTS.length)];
      this._pool.emit({
        x: cx + Math.cos(ra) * midR,
        y: cy + Math.sin(ra) * midR,
        vx: (Math.random() - 0.5) * 15,
        vy: -(25 + Math.random() * 35),
        life: 0.6 + Math.random() * 0.3,
        scaleStart: 0.5 + Math.random() * 0.4,
        scaleEnd: 0.05,
        alphaStart: 0.9,
        alphaEnd: 0,
        tint,
        gravity: 15,
      });
    }, interval);
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
