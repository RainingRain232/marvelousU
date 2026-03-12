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
  segments: { x1: number; y1: number; x2: number; y2: number }[];
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
      this._explosions.push({
        x: e.x, y: e.y,
        radius: 0, maxRadius: e.radius,
        timer: 0, maxTimer: 0.5,
        color: e.color,
        ringColor: _brighten(e.color, 0.3),
      });
      // Spawn particles
      this._spawnExplosionParticles(e.x, e.y, e.color, e.radius);
      this.shake(e.radius > 40 ? 8 : 4, 0.2);
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
      // Main bolt from top of screen
      let cx = l.x + (Math.random() - 0.5) * 20;
      let cy = 0;
      const steps = 8 + Math.floor(Math.random() * 5);
      const stepY = l.y / steps;
      for (let i = 0; i < steps; i++) {
        const nx = cx + (Math.random() - 0.5) * 40;
        const ny = cy + stepY;
        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx;
        cy = ny;
        // Branch
        if (Math.random() < 0.3) {
          const bx = cx + (Math.random() - 0.5) * 60;
          const by = cy + stepY * 0.5;
          segments.push({ x1: cx, y1: cy, x2: bx, y2: by });
        }
      }
      this._lightnings.push({ x: l.x, y: l.y, timer: 0.3, segments });
      this.screenFlash(0x4488ff, 0.08);
      this.shake(6, 0.15);
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

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: DragoonState, dt: number): void {
    this.spawnQueued();

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

      // Shockwave ring
      eg.circle(ex.x, ex.y, ex.radius).stroke({ color: ex.ringColor, width: 3 + (1 - t) * 4, alpha: alpha * 0.6 });
      // Inner fill
      eg.circle(ex.x, ex.y, ex.radius * 0.7).fill({ color: ex.color, alpha: alpha * 0.2 });
      // Core flash
      if (t < 0.3) {
        eg.circle(ex.x, ex.y, ex.radius * 0.3).fill({ color: 0xffffff, alpha: (0.3 - t) * 2 });
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
      const alpha = Math.min(1, l.timer * 5);
      // Draw main bolt
      for (const seg of l.segments) {
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0x88ddff, width: 3, alpha });
        // Inner bright core
        lg.moveTo(seg.x1, seg.y1).lineTo(seg.x2, seg.y2).stroke({ color: 0xffffff, width: 1.5, alpha: alpha * 0.8 });
      }
      // Impact glow
      lg.circle(l.x, l.y, 20).fill({ color: 0x44aaff, alpha: alpha * 0.2 });
      lg.circle(l.x, l.y, 10).fill({ color: 0xffffff, alpha: alpha * 0.4 });
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
      const alpha = Math.max(0, f.life / f.maxLife);
      const sz = f.size * (0.5 + alpha * 0.5);
      // Draw as elongated diamond (feather-like)
      fg.ellipse(f.x, f.y, sz * 1.5, sz * 0.5).fill({ color: f.color, alpha });
    }
    this._feathers = this._feathers.filter(f => f.life > 0);

    // Screen flash
    const sf = this._screenFlashGfx;
    sf.clear();
    if (this._screenFlashTimer > 0) {
      this._screenFlashTimer -= dt;
      const alpha = Math.max(0, this._screenFlashTimer * 4);
      sf.rect(0, 0, state.screenW, state.screenH).fill({ color: this._screenFlashColor, alpha: alpha * 0.15 });
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
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
  const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
  const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}
