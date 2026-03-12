// ---------------------------------------------------------------------------
// Panzer Dragoon mode — visual effects (explosions, particles, lightning, etc.)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { DragoonState } from "../state/DragoonState";

// ---------------------------------------------------------------------------
// Pending FX queues (populated by combat system callbacks)
// ---------------------------------------------------------------------------

interface PendingExplosion { x: number; y: number; radius: number; color: number; }
interface PendingHit { x: number; y: number; damage: number; isCrit: boolean; }
interface PendingLightning { x: number; y: number; }

interface ActiveExplosionFX {
  x: number; y: number;
  radius: number; maxRadius: number;
  timer: number; maxTimer: number;
  color: number;
  ringColor: number;
  secondRingDelay: number;
  debris: { x: number; y: number; vx: number; vy: number; size: number; color: number }[];
}

interface ActiveDmgNumber {
  x: number; y: number;
  text: string;
  color: number;
  timer: number;
  vy: number;
  scale: number;
}

interface ActiveLightning {
  x: number; y: number;
  timer: number;
  maxTimer: number;
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  branches: { x1: number; y1: number; x2: number; y2: number }[];
}

interface FeatherParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  color: number;
}

// ---------------------------------------------------------------------------
// DragoonFX
// ---------------------------------------------------------------------------

export class DragoonFX {
  readonly container = new Container();
  private _explosionGfx = new Graphics();
  private _dmgGfx = new Graphics();
  private _lightningGfx = new Graphics();
  private _particleGfx = new Graphics();
  private _featherGfx = new Graphics();
  private _screenFlashGfx = new Graphics();

  // Queues
  pendingExplosions: PendingExplosion[] = [];
  pendingHits: PendingHit[] = [];
  pendingLightning: PendingLightning[] = [];

  // Active FX
  private _explosions: ActiveExplosionFX[] = [];
  private _dmgNumbers: ActiveDmgNumber[] = [];
  private _lightnings: ActiveLightning[] = [];
  private _feathers: FeatherParticle[] = [];
  private _screenFlashTimer = 0;
  private _screenFlashColor = 0xffffff;

  // Camera shake
  shakeX = 0;
  shakeY = 0;
  private _shakeMag = 0;
  private _shakeTimer = 0;

  init(): void {
    this.container.removeChildren();
    this.container.addChild(this._explosionGfx);
    this.container.addChild(this._lightningGfx);
    this.container.addChild(this._particleGfx);
    this.container.addChild(this._featherGfx);
    this.container.addChild(this._dmgGfx);
    this.container.addChild(this._screenFlashGfx);

    this._explosions = [];
    this._dmgNumbers = [];
    this._lightnings = [];
    this._feathers = [];
    this.pendingExplosions = [];
    this.pendingHits = [];
    this.pendingLightning = [];
  }

  shake(magnitude: number, duration: number): void {
    this._shakeMag = Math.max(this._shakeMag, magnitude);
    this._shakeTimer = Math.max(this._shakeTimer, duration);
  }

  screenFlash(color: number, duration: number = 0.15): void {
    this._screenFlashColor = color;
    this._screenFlashTimer = duration;
  }

  // ---------------------------------------------------------------------------
  // Spawn from queues
  // ---------------------------------------------------------------------------

  spawnQueued(): void {
    // Explosions
    for (const e of this.pendingExplosions) {
      // Generate debris for explosion
      const debrisCount = Math.floor(e.radius * 0.3) + 4;
      const debris: ActiveExplosionFX["debris"] = [];
      for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 200;
        debris.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 3,
          color: Math.random() < 0.5 ? e.color : _brighten(e.color, 0.5),
        });
      }
      this._explosions.push({
        x: e.x, y: e.y,
        radius: 0, maxRadius: e.radius,
        timer: 0, maxTimer: 0.6,
        color: e.color,
        ringColor: _brighten(e.color, 0.3),
        secondRingDelay: 0.08,
        debris,
      });
      // Spawn particles
      this._spawnExplosionParticles(e.x, e.y, e.color, e.radius);
      this.shake(e.radius > 40 ? 10 : 5, 0.25);
      this.screenFlash(e.color, 0.06);
    }
    this.pendingExplosions.length = 0;

    // Hits (damage numbers)
    for (const h of this.pendingHits) {
      this._dmgNumbers.push({
        x: h.x + (Math.random() - 0.5) * 20,
        y: h.y - 10,
        text: h.isCrit ? `${h.damage}!` : `${h.damage}`,
        color: h.isCrit ? 0xffdd00 : 0xffffff,
        timer: h.isCrit ? 1.2 : 0.8,
        vy: -60 - (h.isCrit ? 30 : 0),
        scale: h.isCrit ? 1.4 : 1.0,
      });
    }
    this.pendingHits.length = 0;

    // Lightning
    for (const l of this.pendingLightning) {
      const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const branches: { x1: number; y1: number; x2: number; y2: number }[] = [];
      // Main bolt from top of screen
      let cx = l.x + (Math.random() - 0.5) * 20;
      let cy = 0;
      const steps = 10 + Math.floor(Math.random() * 6);
      const stepY = l.y / steps;
      for (let i = 0; i < steps; i++) {
        const nx = cx + (Math.random() - 0.5) * 45;
        const ny = cy + stepY;
        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx;
        cy = ny;
        // Primary branch
        if (Math.random() < 0.35) {
          const bx = cx + (Math.random() - 0.5) * 70;
          const by = cy + stepY * 0.6;
          branches.push({ x1: cx, y1: cy, x2: bx, y2: by });
          // Sub-branch
          if (Math.random() < 0.4) {
            const sbx = bx + (Math.random() - 0.5) * 40;
            const sby = by + stepY * 0.3;
            branches.push({ x1: bx, y1: by, x2: sbx, y2: sby });
          }
        }
      }
      this._lightnings.push({ x: l.x, y: l.y, timer: 0.4, maxTimer: 0.4, segments, branches });
      this.screenFlash(0x4488ff, 0.1);
      this.shake(8, 0.18);
    }
    this.pendingLightning.length = 0;
  }

  private _spawnExplosionParticles(x: number, y: number, color: number, radius: number): void {
    const count = Math.floor(radius * 0.5) + 8;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this._feathers.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.3 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        size: 2 + Math.random() * 4,
        color: Math.random() < 0.5 ? color : _brighten(color, 0.4),
      });
    }
  }

  // Emit eagle feather trail particles
  emitEagleFeathers(x: number, y: number): void {
    if (Math.random() > 0.3) return; // sparse
    const featherColors = [0xf0ead0, 0xd8d0b8, 0xfaf5e8, 0xccccaa];
    this._feathers.push({
      x: x - 20 + Math.random() * 10,
      y: y + Math.random() * 10,
      vx: -30 - Math.random() * 40,
      vy: 10 + Math.random() * 20,
      life: 1.5,
      maxLife: 1.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
      size: 2 + Math.random() * 3,
      color: featherColors[Math.floor(Math.random() * featherColors.length)],
    });
  }

  // Emit wand magic trail
  emitWandTrail(x: number, y: number): void {
    if (Math.random() > 0.5) return;
    this._feathers.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 0.6,
      maxLife: 0.6,
      rotation: 0,
      rotSpeed: 0,
      size: 1 + Math.random() * 2,
      color: Math.random() < 0.5 ? 0x88ccff : 0xaaddff,
    });
  }

  // Boss entrance effect
  private _bossEntranceTriggered = false;

  triggerBossEntrance(): void {
    this.screenFlash(0xffdd44, 0.3);
    this.shake(20, 0.5);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: DragoonState, dt: number): void {
    this.spawnQueued();

    // Boss entrance FX
    if (state.bossEntranceTimer > 0 && !this._bossEntranceTriggered) {
      this._bossEntranceTriggered = true;
      this.triggerBossEntrance();
    }
    if (state.bossEntranceTimer <= 0) {
      this._bossEntranceTriggered = false;
    }

    // Eagle trail particles
    this.emitEagleFeathers(state.player.position.x, state.player.position.y);

    // Explosions
    const eg = this._explosionGfx;
    eg.clear();
    for (const ex of this._explosions) {
      ex.timer += dt;
      const t = ex.timer / ex.maxTimer;
      ex.radius = t * ex.maxRadius;
      const alpha = 1 - t;

      // Outer shockwave ring (primary)
      eg.circle(ex.x, ex.y, ex.radius).stroke({ color: ex.ringColor, width: 2 + (1 - t) * 5, alpha: alpha * 0.5 });
      // Second shockwave ring (delayed, wider)
      if (t > ex.secondRingDelay / ex.maxTimer) {
        const t2 = (t - ex.secondRingDelay / ex.maxTimer) * 1.2;
        const r2 = Math.min(t2, 1) * ex.maxRadius * 1.3;
        const a2 = Math.max(0, 1 - t2);
        eg.circle(ex.x, ex.y, r2).stroke({ color: _brighten(ex.ringColor, 0.2), width: 1.5 + a2 * 2, alpha: a2 * 0.3 });
      }
      // Third ring (fastest, faintest)
      if (t > 0.1) {
        const t3 = (t - 0.1) * 1.5;
        const r3 = Math.min(t3, 1) * ex.maxRadius * 1.6;
        const a3 = Math.max(0, 1 - t3);
        eg.circle(ex.x, ex.y, r3).stroke({ color: ex.color, width: 1, alpha: a3 * 0.15 });
      }
      // Inner fill — gradient-like with concentric circles
      eg.circle(ex.x, ex.y, ex.radius * 0.8).fill({ color: ex.color, alpha: alpha * 0.15 });
      eg.circle(ex.x, ex.y, ex.radius * 0.5).fill({ color: _brighten(ex.color, 0.2), alpha: alpha * 0.2 });
      eg.circle(ex.x, ex.y, ex.radius * 0.25).fill({ color: _brighten(ex.color, 0.4), alpha: alpha * 0.25 });
      // Core flash — brighter, longer
      if (t < 0.35) {
        const coreAlpha = (0.35 - t) * 2.5;
        eg.circle(ex.x, ex.y, ex.radius * 0.2 + 5).fill({ color: 0xffffff, alpha: coreAlpha });
        eg.circle(ex.x, ex.y, ex.radius * 0.35 + 8).fill({ color: 0xffffff, alpha: coreAlpha * 0.3 });
      }
      // Debris particles
      for (const d of ex.debris) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 100 * dt; // gravity
        d.vx *= 0.97;
        eg.circle(d.x, d.y, d.size * alpha).fill({ color: d.color, alpha: alpha * 0.7 });
        // Debris trail
        eg.circle(d.x - d.vx * dt * 0.5, d.y - d.vy * dt * 0.5, d.size * 0.5 * alpha).fill({ color: d.color, alpha: alpha * 0.3 });
      }
      // Heat distortion ring
      if (t < 0.5) {
        eg.circle(ex.x, ex.y, ex.radius * 1.5).fill({ color: ex.color, alpha: (0.5 - t) * 0.04 });
      }
    }
    this._explosions = this._explosions.filter(ex => ex.timer < ex.maxTimer);

    // Damage numbers
    const dg = this._dmgGfx;
    dg.clear();
    for (const d of this._dmgNumbers) {
      d.y += d.vy * dt;
      d.vy *= 0.97;
      d.timer -= dt;
      const alpha = Math.min(1, d.timer * 2);

      // Shadow
      dg.circle(d.x + 1, d.y + 1, d.scale * 5).fill({ color: 0x000000, alpha: alpha * 0.3 });
      // Number (drawn as circles since we don't have bitmap fonts easily here)
      dg.circle(d.x, d.y, d.scale * 4).fill({ color: d.color, alpha });
      if (d.text.includes("!")) {
        // Crit indicator: bigger glow
        dg.circle(d.x, d.y, d.scale * 8).fill({ color: d.color, alpha: alpha * 0.15 });
      }
    }
    this._dmgNumbers = this._dmgNumbers.filter(d => d.timer > 0);

    // Lightning
    const lg = this._lightningGfx;
    lg.clear();
    for (const l of this._lightnings) {
      l.timer -= dt;
      const tNorm = l.timer / l.maxTimer;
      const alpha = Math.min(1, l.timer * 5);

      // Outer glow / afterglow (wider, fading)
      for (const seg of l.segments) {
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0x4488cc, width: 8, alpha: alpha * 0.08 });
      }
      // Main bolt — thick outer
      for (const seg of l.segments) {
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0x88ddff, width: 4, alpha: alpha * 0.5 });
      }
      // Main bolt — bright core
      for (const seg of l.segments) {
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0xccf0ff, width: 2, alpha: alpha * 0.7 });
      }
      // Main bolt — white hot center
      for (const seg of l.segments) {
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.9 });
      }
      // Branches — thinner, bluer
      for (const br of l.branches) {
        lg.moveTo(br.x1, br.y1).lineTo(br.x2, br.y2).stroke({ color: 0x66bbee, width: 2, alpha: alpha * 0.35 });
        lg.moveTo(br.x1, br.y1).lineTo(br.x2, br.y2).stroke({ color: 0xaaddff, width: 0.8, alpha: alpha * 0.5 });
      }
      // Impact glow — multi-layered
      lg.circle(l.x, l.y, 30).fill({ color: 0x2266aa, alpha: alpha * 0.1 });
      lg.circle(l.x, l.y, 20).fill({ color: 0x44aaff, alpha: alpha * 0.2 });
      lg.circle(l.x, l.y, 12).fill({ color: 0x88ddff, alpha: alpha * 0.3 });
      lg.circle(l.x, l.y, 6).fill({ color: 0xffffff, alpha: alpha * 0.5 });
      // Ground scorch ring (if near bottom)
      if (tNorm < 0.7) {
        lg.circle(l.x, l.y, 15 + (1 - tNorm) * 10).stroke({ color: 0x88ddff, width: 1.5, alpha: alpha * 0.2 });
      }
    }
    this._lightnings = this._lightnings.filter(l => l.timer > 0);

    // Feather / generic particles
    const fg = this._featherGfx;
    fg.clear();
    for (const f of this._feathers) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 30 * dt; // slight gravity
      f.vx *= 0.98;
      f.rotation += f.rotSpeed * dt;
      f.life -= dt;
      const lifeRatio = Math.max(0, f.life / f.maxLife);
      const sz = f.size * (0.5 + lifeRatio * 0.5);

      // Color gradient: fade toward darker/different hue as life decreases
      const fadeColor = lifeRatio > 0.5 ? f.color : _brighten(f.color, -0.2 * (1 - lifeRatio));

      // Outer glow for larger particles
      if (sz > 2) {
        fg.ellipse(f.x, f.y, sz * 2, sz).fill({ color: f.color, alpha: lifeRatio * 0.08 });
      }
      // Draw as elongated diamond (feather-like) with rotation hint
      const rx = Math.cos(f.rotation) * sz * 1.5;
      const ry = Math.sin(f.rotation) * sz * 0.5;
      fg.ellipse(f.x, f.y, Math.abs(rx) + 0.5, Math.abs(ry) + 0.5).fill({ color: fadeColor, alpha: lifeRatio });
      // Bright core for fresh particles
      if (lifeRatio > 0.7) {
        fg.ellipse(f.x, f.y, sz * 0.4, sz * 0.2).fill({ color: 0xffffff, alpha: (lifeRatio - 0.7) * 1.5 });
      }
    }
    this._feathers = this._feathers.filter(f => f.life > 0);

    // Screen flash — with color tinting and vignette
    const sf = this._screenFlashGfx;
    sf.clear();
    if (this._screenFlashTimer > 0) {
      this._screenFlashTimer -= dt;
      const flashAlpha = Math.max(0, this._screenFlashTimer * 5);
      // Full screen color wash
      sf.rect(0, 0, state.screenW, state.screenH).fill({ color: this._screenFlashColor, alpha: flashAlpha * 0.12 });
      // Brighter center flash
      sf.ellipse(state.screenW / 2, state.screenH / 2, state.screenW * 0.4, state.screenH * 0.4)
        .fill({ color: 0xffffff, alpha: flashAlpha * 0.06 });
      // Edge vignette tint
      sf.rect(0, 0, state.screenW, 3).fill({ color: this._screenFlashColor, alpha: flashAlpha * 0.15 });
      sf.rect(0, state.screenH - 3, state.screenW, 3).fill({ color: this._screenFlashColor, alpha: flashAlpha * 0.15 });
    }

    // Camera shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const intensity = this._shakeTimer > 0 ? this._shakeMag * (this._shakeTimer / 0.2) : 0;
      this.shakeX = (Math.random() - 0.5) * intensity * 2;
      this.shakeY = (Math.random() - 0.5) * intensity * 2;
      if (this._shakeTimer <= 0) {
        this._shakeMag = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanup(): void {
    this.container.removeChildren();
    this._explosions.length = 0;
    this._dmgNumbers.length = 0;
    this._lightnings.length = 0;
    this._feathers.length = 0;
    this.pendingExplosions.length = 0;
    this.pendingHits.length = 0;
    this.pendingLightning.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _brighten(color: number, amount: number): number {
  const delta = Math.floor(255 * amount);
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + delta));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + delta));
  const b = Math.max(0, Math.min(255, (color & 0xff) + delta));
  return (r << 16) | (g << 8) | b;
}
