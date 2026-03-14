// ---------------------------------------------------------------------------
// Panzer Dragoon mode — main renderer
// Draws: parallax sky, scrolling ground, eagle + Arthur, enemies, projectiles
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { DragoonState, DragoonEnemy } from "../state/DragoonState";
import { DragoonEnemyType, DragoonPickupType, EnemyPattern } from "../state/DragoonState";

// ---------------------------------------------------------------------------
// Colour palettes
// ---------------------------------------------------------------------------

const SKY_TOP = 0x0b0e2a;        // deep night indigo
const SKY_MID = 0x1a2555;        // twilight blue
const SKY_LOW = 0x3a2266;        // purple horizon
const HORIZON = 0xdd6633;        // sunset orange
const SUN_COLOR = 0xffcc44;
const GROUND_FAR = 0x223322;
const GROUND_MID = 0x1a2a18;
const GROUND_NEAR = 0x0f1a0d;
const CLOUD_COLORS = [0x2a3366, 0x3a4488, 0x4a5599];

/** Positive modulo — always returns a value in [0, m) even for negative n */
function pmod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class DragoonRenderer {
  readonly worldLayer = new Container();

  // Sub-containers (z-order)
  private _skyBg = new Graphics();
  private _starField = new Graphics();
  private _cloudContainer = new Container();
  private _sunGfx = new Graphics();
  private _groundContainer = new Container();
  private _groundFar = new Graphics();
  private _groundMid = new Graphics();
  private _groundNear = new Graphics();
  private _enemyContainer = new Container();
  private _projectileContainer = new Container();
  private _playerContainer = new Container();

  // Cloud data
  private _clouds: { x: number; y: number; w: number; h: number; speed: number; color: number; alpha: number; puffs: number }[] = [];
  // Star data
  private _stars: { x: number; y: number; size: number; twinkleSpeed: number; phase: number }[] = [];
  // Ground features (trees, mountains)
  private _groundFeatures: { x: number; type: string; height: number; color: number; layer: number; variant: number }[] = [];
  // Floating particles (dust motes, distant birds)
  private _floatingParticles: { x: number; y: number; vx: number; vy: number; size: number; color: number; alpha: number; type: string }[] = [];
  // Haze layer
  private _hazeGfx = new Graphics();

  // Enemy view cache
  private _enemyViews = new Map<number, { gfx: Graphics; hpBar: Graphics; nameText: Text | null }>();
  // Projectile view cache
  private _projViews = new Map<number, Graphics>();

  // Shield / pickups
  private _shieldGfx = new Graphics();
  private _pickupContainer = new Container();

  // Eagle animation
  private _eagleTime = 0;
  private _eagleGfx = new Graphics();
  private _arthurGfx = new Graphics();
  private _wandGlowGfx = new Graphics();

  private _worldWidth: number = 0;

  init(sw: number, sh: number): void {
    this._worldWidth = sw * 3;
    this.worldLayer.removeChildren();

    // Build layer hierarchy
    this.worldLayer.addChild(this._skyBg);
    this.worldLayer.addChild(this._starField);
    this.worldLayer.addChild(this._sunGfx);
    this.worldLayer.addChild(this._cloudContainer);
    this.worldLayer.addChild(this._hazeGfx);
    this.worldLayer.addChild(this._groundContainer);
    this._groundContainer.addChild(this._groundFar);
    this._groundContainer.addChild(this._groundMid);
    this._groundContainer.addChild(this._groundNear);
    this.worldLayer.addChild(this._pickupContainer);
    this.worldLayer.addChild(this._enemyContainer);
    this.worldLayer.addChild(this._projectileContainer);
    this.worldLayer.addChild(this._playerContainer);
    this._playerContainer.addChild(this._shieldGfx);

    // Draw static sky gradient (covers full world width)
    this._drawSkyGradient(this._worldWidth, sh);

    // Generate stars (across full world width)
    this._generateStars(this._worldWidth, sh);

    // Draw sun/moon (centered in world)
    this._drawSun(this._worldWidth, sh);

    // Generate clouds (across full world width)
    this._generateClouds(this._worldWidth, sh);

    // Generate ground features (across full world width)
    this._generateGroundFeatures(this._worldWidth);

    // Generate floating particles (across full world width)
    this._generateFloatingParticles(this._worldWidth, sh);

    // Init player (eagle + Arthur)
    this._playerContainer.addChild(this._eagleGfx);
    this._playerContainer.addChild(this._arthurGfx);
    this._playerContainer.addChild(this._wandGlowGfx);
  }

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------

  private _drawSkyGradient(sw: number, sh: number): void {
    const g = this._skyBg;
    g.clear();

    // Multi-band gradient with smoother transitions
    const bands = [
      { y: 0, h: sh * 0.12, color: 0x050818 },         // deep space
      { y: sh * 0.12, h: sh * 0.13, color: SKY_TOP },   // deep night indigo
      { y: sh * 0.25, h: sh * 0.12, color: SKY_MID },   // twilight blue
      { y: sh * 0.37, h: sh * 0.10, color: 0x2a3066 },  // blue-purple transition
      { y: sh * 0.47, h: sh * 0.10, color: SKY_LOW },   // purple horizon
      { y: sh * 0.57, h: sh * 0.08, color: 0x552244 },  // warm purple
      { y: sh * 0.65, h: sh * 0.05, color: 0x883344 },  // dusty rose
      { y: sh * 0.70, h: sh * 0.04, color: HORIZON },   // sunset orange
      { y: sh * 0.74, h: sh * 0.04, color: 0xcc7744 },  // amber
    ];

    for (const band of bands) {
      g.rect(0, band.y, sw, band.h).fill({ color: band.color });
    }

    // Horizon glow layers — soft sunset effect
    g.rect(0, sh * 0.68, sw, sh * 0.10).fill({ color: 0xff8844, alpha: 0.15 });
    g.rect(0, sh * 0.70, sw, sh * 0.08).fill({ color: 0xff9955, alpha: 0.20 });
    g.rect(0, sh * 0.73, sw, sh * 0.05).fill({ color: 0xffbb66, alpha: 0.18 });
    g.rect(0, sh * 0.75, sw, sh * 0.03).fill({ color: 0xffcc88, alpha: 0.10 });

    // Subtle aurora-like streaks in upper sky
    for (let i = 0; i < 3; i++) {
      const ax = sw * (0.15 + i * 0.30);
      const aw = sw * (0.12 + i * 0.05);
      g.ellipse(ax, sh * 0.20, aw, sh * 0.06).fill({ color: 0x224488, alpha: 0.04 });
      g.ellipse(ax + 20, sh * 0.22, aw * 0.7, sh * 0.04).fill({ color: 0x335599, alpha: 0.03 });
    }
  }

  private _generateStars(sw: number, sh: number): void {
    this._stars = [];
    for (let i = 0; i < 180; i++) {
      // More stars concentrated in upper sky
      const yBias = Math.pow(Math.random(), 1.5);
      this._stars.push({
        x: Math.random() * sw,
        y: yBias * sh * 0.6,
        size: 0.3 + Math.random() * 2.2,
        twinkleSpeed: 0.8 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _drawStars(time: number, _sw: number, dt: number): void {
    const g = this._starField;
    g.clear();
    const ww = this._worldWidth;
    for (const star of this._stars) {
      // Slow parallax drift for stars — wrap around world
      star.x -= 3 * dt;
      if (star.x < -10) star.x += ww + 20;

      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * star.twinkleSpeed + star.phase));
      const colors = [0xffffff, 0xaaccff, 0xffddaa, 0xddddff, 0xffc8e0, 0xc8e0ff];
      const color = colors[Math.floor(star.phase * 3) % colors.length];
      g.circle(star.x, star.y, star.size).fill({ color, alpha });
      // Glow for bigger stars — layered
      if (star.size > 1.5) {
        g.circle(star.x, star.y, star.size * 4).fill({ color, alpha: alpha * 0.05 });
        g.circle(star.x, star.y, star.size * 2.5).fill({ color, alpha: alpha * 0.1 });
        // Cross-shaped spike for brightest stars
        if (star.size > 1.8) {
          const spikeLen = star.size * 3;
          g.moveTo(star.x - spikeLen, star.y).lineTo(star.x + spikeLen, star.y).stroke({ color, width: 0.5, alpha: alpha * 0.15 });
          g.moveTo(star.x, star.y - spikeLen).lineTo(star.x, star.y + spikeLen).stroke({ color, width: 0.5, alpha: alpha * 0.15 });
        }
      }
    }
  }

  private _drawSun(sw: number, sh: number): void {
    const g = this._sunGfx;
    g.clear();
    const sx = sw * 0.82;
    const sy = sh * 0.18;

    // Sun glow layers
    g.circle(sx, sy, 60).fill({ color: SUN_COLOR, alpha: 0.05 });
    g.circle(sx, sy, 40).fill({ color: SUN_COLOR, alpha: 0.1 });
    g.circle(sx, sy, 25).fill({ color: SUN_COLOR, alpha: 0.2 });
    g.circle(sx, sy, 14).fill({ color: 0xffeedd, alpha: 0.8 });
    g.circle(sx, sy, 8).fill({ color: 0xffffff });
  }

  private _generateClouds(sw: number, sh: number): void {
    this._clouds = [];
    this._cloudContainer.removeChildren();
    for (let i = 0; i < 24; i++) {
      const layerIdx = i % 3;
      this._clouds.push({
        x: Math.random() * sw * 1.5,
        y: sh * 0.05 + Math.random() * sh * 0.55,
        w: 80 + Math.random() * 250,
        h: 20 + Math.random() * 45,
        speed: 8 + layerIdx * 12 + Math.random() * 10,
        color: CLOUD_COLORS[layerIdx],
        alpha: 0.12 + layerIdx * 0.07,
        puffs: 3 + Math.floor(Math.random() * 4),
      });
    }
  }

  private _drawClouds(_sw: number, dt: number): void {
    this._cloudContainer.removeChildren();
    const g = new Graphics();
    const ww = this._worldWidth;
    for (const c of this._clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < -50) c.x = ww + 50 + Math.random() * 200;

      const cx = c.x + c.w * 0.5;
      const cy = c.y;

      // Outer soft glow
      g.ellipse(cx, cy, c.w * 0.6, c.h * 0.7).fill({ color: c.color, alpha: c.alpha * 0.3 });

      // Multiple overlapping puffs for volumetric look
      for (let p = 0; p < c.puffs; p++) {
        const px = cx + (p - c.puffs / 2) * (c.w / (c.puffs + 1)) * 0.8;
        const py = cy + Math.sin(p * 1.5) * c.h * 0.15;
        const pw = c.w * (0.25 + Math.sin(p * 2.1) * 0.08);
        const ph = c.h * (0.35 + Math.cos(p * 1.7) * 0.1);
        g.ellipse(px, py, pw, ph).fill({ color: c.color, alpha: c.alpha * (0.7 + p * 0.05) });
      }

      // Bright highlight on top
      g.ellipse(cx - c.w * 0.1, cy - c.h * 0.2, c.w * 0.3, c.h * 0.2).fill({ color: c.color + 0x111111, alpha: c.alpha * 0.5 });
      // Darker underside
      g.ellipse(cx, cy + c.h * 0.15, c.w * 0.4, c.h * 0.2).fill({ color: c.color - 0x080808, alpha: c.alpha * 0.4 });
    }
    this._cloudContainer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Ground (scrolling landscape below)
  // ---------------------------------------------------------------------------

  private _generateGroundFeatures(_sw: number): void {
    this._groundFeatures = [];
    // Far mountains — layered ranges with color variation
    for (let i = 0; i < 28; i++) {
      const colorVariant = Math.floor(Math.random() * 3);
      const colors = [0x1a2a1a, 0x1a2233, 0x22281a];
      this._groundFeatures.push({
        x: i * 100 + Math.random() * 60,
        type: "mountain",
        height: 30 + Math.random() * 60,
        color: colors[colorVariant] + Math.floor(Math.random() * 0x080808),
        layer: 0,
        variant: Math.floor(Math.random() * 3),
      });
    }
    // Mid trees + bushes
    for (let i = 0; i < 50; i++) {
      const r = Math.random();
      const type = r < 0.6 ? "tree" : r < 0.8 ? "pine" : "bush";
      this._groundFeatures.push({
        x: i * 50 + Math.random() * 30,
        type,
        height: 12 + Math.random() * 28,
        color: 0x1a3a1a + Math.floor(Math.random() * 0x003300),
        layer: 1,
        variant: Math.floor(Math.random() * 3),
      });
    }
    // Near features (larger trees, rocks, ruins, grass clumps)
    for (let i = 0; i < 35; i++) {
      const r = Math.random();
      const type = r < 0.15 ? "rock" : r < 0.25 ? "ruin" : r < 0.4 ? "grass" : r < 0.6 ? "pine" : "tree";
      this._groundFeatures.push({
        x: i * 65 + Math.random() * 40,
        type,
        height: 18 + Math.random() * 40,
        color: r < 0.15 ? 0x444455 : r < 0.25 ? 0x555544 : 0x0a1a08,
        layer: 2,
        variant: Math.floor(Math.random() * 3),
      });
    }
  }

  private _generateFloatingParticles(sw: number, sh: number): void {
    this._floatingParticles = [];
    // Dust motes
    for (let i = 0; i < 30; i++) {
      this._floatingParticles.push({
        x: Math.random() * sw,
        y: sh * 0.3 + Math.random() * sh * 0.5,
        vx: -5 - Math.random() * 15,
        vy: (Math.random() - 0.5) * 4,
        size: 0.5 + Math.random() * 1.5,
        color: 0xffddaa,
        alpha: 0.05 + Math.random() * 0.1,
        type: "dust",
      });
    }
    // Distant birds
    for (let i = 0; i < 6; i++) {
      this._floatingParticles.push({
        x: Math.random() * sw,
        y: sh * 0.15 + Math.random() * sh * 0.35,
        vx: -20 - Math.random() * 30,
        vy: (Math.random() - 0.5) * 8,
        size: 1.5 + Math.random() * 2,
        color: 0x111122,
        alpha: 0.3 + Math.random() * 0.3,
        type: "bird",
      });
    }
  }

  private _drawGround(state: DragoonState, dt: number): void {
    const sw = this._worldWidth;
    const sh = state.screenH;
    const groundY = sh * 0.78;
    const groundH = sh - groundY;

    state.groundOffset += state.scrollSpeed * dt;

    // --- Atmospheric haze between sky and ground ---
    this._hazeGfx.clear();
    this._hazeGfx.rect(0, groundY - 30, sw, 40).fill({ color: 0x3a2266, alpha: 0.12 });
    this._hazeGfx.rect(0, groundY - 15, sw, 25).fill({ color: 0x553355, alpha: 0.08 });

    // --- Floating particles (dust, birds) ---
    for (const p of this._floatingParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -20) p.x = this._worldWidth + 20;
      if (p.type === "bird") {
        const wingT = Math.sin(state.gameTime * 8 + p.size * 3);
        this._hazeGfx.moveTo(p.x - p.size * 2, p.y + wingT * 1.5)
          .lineTo(p.x, p.y)
          .lineTo(p.x + p.size * 2, p.y + wingT * 1.5)
          .stroke({ color: p.color, width: 1, alpha: p.alpha });
      } else {
        this._hazeGfx.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: p.alpha });
      }
    }

    // --- Far layer ---
    this._groundFar.clear();
    this._groundFar.rect(0, groundY, sw, groundH * 0.4).fill({ color: GROUND_FAR });

    // Atmospheric haze over far ground
    this._groundFar.rect(0, groundY, sw, groundH * 0.15).fill({ color: 0x334455, alpha: 0.15 });

    // Mountains with ridges and varied shapes
    for (const f of this._groundFeatures.filter(f => f.layer === 0)) {
      const x = pmod(f.x - state.groundOffset * 0.3, sw + 200) - 100;
      if (x < -150 || x > sw + 50) continue;
      const g = this._groundFar;
      const baseY = groundY + groundH * 0.3;

      if (f.variant === 0) {
        // Jagged mountain
        g.moveTo(x - f.height * 1.3, baseY)
          .lineTo(x - f.height * 0.4, baseY - f.height * 0.6)
          .lineTo(x - f.height * 0.1, baseY - f.height * 0.85)
          .lineTo(x, baseY - f.height)
          .lineTo(x + f.height * 0.2, baseY - f.height * 0.7)
          .lineTo(x + f.height * 0.8, baseY - f.height * 0.4)
          .lineTo(x + f.height * 1.1, baseY)
          .fill({ color: f.color, alpha: 0.7 });
      } else if (f.variant === 1) {
        // Rounded mountain
        g.moveTo(x - f.height * 1.4, baseY)
          .lineTo(x - f.height * 0.5, baseY - f.height * 0.8)
          .lineTo(x, baseY - f.height)
          .lineTo(x + f.height * 0.5, baseY - f.height * 0.8)
          .lineTo(x + f.height * 1.4, baseY)
          .fill({ color: f.color, alpha: 0.65 });
      } else {
        // Twin peak
        g.moveTo(x - f.height * 1.2, baseY)
          .lineTo(x - f.height * 0.3, baseY - f.height * 0.9)
          .lineTo(x, baseY - f.height * 0.6)
          .lineTo(x + f.height * 0.3, baseY - f.height)
          .lineTo(x + f.height * 1.2, baseY)
          .fill({ color: f.color, alpha: 0.7 });
      }

      // Snow cap
      if (f.height > 45) {
        g.moveTo(x - f.height * 0.25, baseY - f.height * 0.72)
          .lineTo(x, baseY - f.height)
          .lineTo(x + f.height * 0.25, baseY - f.height * 0.72)
          .fill({ color: 0x778899, alpha: 0.45 });
        // Snow highlight
        g.moveTo(x - f.height * 0.1, baseY - f.height * 0.85)
          .lineTo(x, baseY - f.height)
          .lineTo(x + f.height * 0.08, baseY - f.height * 0.88)
          .fill({ color: 0x99aabb, alpha: 0.3 });
      }

      // Shadow side
      g.moveTo(x, baseY - f.height)
        .lineTo(x + f.height * 1.1, baseY)
        .lineTo(x + f.height * 0.3, baseY)
        .fill({ color: 0x000000, alpha: 0.08 });
    }

    // Haze between mountain layer and mid layer
    this._groundFar.rect(0, groundY + groundH * 0.2, sw, groundH * 0.12).fill({ color: 0x2a3a44, alpha: 0.12 });

    // --- Mid layer ---
    this._groundMid.clear();
    this._groundMid.rect(0, groundY + groundH * 0.3, sw, groundH * 0.35).fill({ color: GROUND_MID });
    // Terrain variation stripe
    this._groundMid.rect(0, groundY + groundH * 0.42, sw, groundH * 0.05).fill({ color: 0x1a2818, alpha: 0.4 });

    for (const f of this._groundFeatures.filter(f => f.layer === 1)) {
      const x = pmod(f.x - state.groundOffset * 0.6, sw + 200) - 100;
      if (x < -50 || x > sw + 50) continue;
      const g = this._groundMid;
      const baseY2 = groundY + groundH * 0.55;
      if (f.type === "tree") {
        // Tree trunk with bark detail
        g.rect(x - 2, baseY2 - f.height, 4, f.height).fill({ color: 0x332211 });
        g.rect(x - 1, baseY2 - f.height * 0.5, 2, f.height * 0.3).fill({ color: 0x3a2a18, alpha: 0.5 });
        // Canopy — multi-blob
        g.circle(x, baseY2 - f.height, f.height * 0.5).fill({ color: f.color, alpha: 0.8 });
        g.circle(x - f.height * 0.25, baseY2 - f.height * 0.85, f.height * 0.3).fill({ color: f.color + 0x001100, alpha: 0.7 });
        g.circle(x + f.height * 0.2, baseY2 - f.height * 0.9, f.height * 0.28).fill({ color: f.color - 0x001100, alpha: 0.6 });
      } else if (f.type === "pine") {
        // Pine tree — triangular layers
        g.rect(x - 1.5, baseY2 - f.height * 0.3, 3, f.height * 0.3).fill({ color: 0x2a1a08 });
        for (let t = 0; t < 3; t++) {
          const ty = baseY2 - f.height * (0.35 + t * 0.22);
          const tw = f.height * (0.35 - t * 0.06);
          g.moveTo(x - tw, ty + f.height * 0.15)
            .lineTo(x, ty)
            .lineTo(x + tw, ty + f.height * 0.15)
            .fill({ color: f.color - t * 0x000800, alpha: 0.8 });
        }
      } else {
        // Bush
        g.ellipse(x, baseY2 - f.height * 0.3, f.height * 0.5, f.height * 0.3).fill({ color: f.color, alpha: 0.7 });
        g.ellipse(x - f.height * 0.2, baseY2 - f.height * 0.35, f.height * 0.25, f.height * 0.2).fill({ color: f.color + 0x001100, alpha: 0.5 });
      }
    }

    // --- Near layer ---
    this._groundNear.clear();
    this._groundNear.rect(0, groundY + groundH * 0.6, sw, groundH * 0.4).fill({ color: GROUND_NEAR });
    // Road/path with edges
    const roadY = groundY + groundH * 0.65;
    this._groundNear.rect(0, roadY - 1, sw, 1).fill({ color: 0x332211, alpha: 0.3 });
    this._groundNear.rect(0, roadY, sw, 6).fill({ color: 0x443322, alpha: 0.4 });
    this._groundNear.rect(0, roadY + 6, sw, 1).fill({ color: 0x332211, alpha: 0.3 });
    // Dirt texture on road
    for (let rx = 0; rx < sw; rx += 40) {
      const roff = pmod(rx * 7 + Math.floor(state.groundOffset), 60);
      this._groundNear.circle(rx + roff, roadY + 3, 1).fill({ color: 0x554433, alpha: 0.2 });
    }

    for (const f of this._groundFeatures.filter(f => f.layer === 2)) {
      const x = pmod(f.x - state.groundOffset, sw + 200) - 100;
      if (x < -60 || x > sw + 60) continue;
      const g = this._groundNear;
      const baseY3 = groundY + groundH * 0.85;
      if (f.type === "tree") {
        // Detailed tree with shadow
        g.ellipse(x + 4, baseY3 + 2, f.height * 0.5, f.height * 0.15).fill({ color: 0x000000, alpha: 0.1 }); // shadow
        g.rect(x - 3, baseY3 - f.height, 6, f.height).fill({ color: 0x221100 });
        g.rect(x - 1.5, baseY3 - f.height * 0.7, 3, f.height * 0.2).fill({ color: 0x2a1a0c, alpha: 0.5 }); // bark
        g.circle(x, baseY3 - f.height, f.height * 0.6).fill({ color: f.color });
        g.circle(x - f.height * 0.3, baseY3 - f.height * 0.8, f.height * 0.35).fill({ color: f.color, alpha: 0.8 });
        g.circle(x + f.height * 0.2, baseY3 - f.height * 1.05, f.height * 0.3).fill({ color: f.color + 0x001100, alpha: 0.7 });
        // Leaf highlight
        g.circle(x - f.height * 0.1, baseY3 - f.height * 1.1, f.height * 0.15).fill({ color: f.color + 0x112211, alpha: 0.4 });
      } else if (f.type === "pine") {
        g.ellipse(x + 3, baseY3 + 2, f.height * 0.3, f.height * 0.08).fill({ color: 0x000000, alpha: 0.1 });
        g.rect(x - 2, baseY3 - f.height * 0.3, 4, f.height * 0.3).fill({ color: 0x2a1a08 });
        for (let t = 0; t < 4; t++) {
          const ty = baseY3 - f.height * (0.35 + t * 0.18);
          const tw = f.height * (0.4 - t * 0.06);
          g.moveTo(x - tw, ty + f.height * 0.12)
            .lineTo(x, ty)
            .lineTo(x + tw, ty + f.height * 0.12)
            .fill({ color: 0x0a2a0a - t * 0x000400, alpha: 0.9 });
        }
      } else if (f.type === "rock") {
        // Multi-layered rock formation
        g.ellipse(x + 3, baseY3 + 2, f.height * 0.7, f.height * 0.12).fill({ color: 0x000000, alpha: 0.1 });
        g.ellipse(x, baseY3, f.height * 0.8, f.height * 0.4).fill({ color: f.color });
        g.ellipse(x - 2, baseY3 - f.height * 0.1, f.height * 0.6, f.height * 0.3).fill({ color: f.color + 0x111111 });
        g.ellipse(x + f.height * 0.2, baseY3 - f.height * 0.15, f.height * 0.3, f.height * 0.2).fill({ color: f.color + 0x1a1a1a, alpha: 0.6 });
        // Cracks
        g.moveTo(x - f.height * 0.2, baseY3 - f.height * 0.15)
          .lineTo(x + f.height * 0.1, baseY3 + f.height * 0.1)
          .stroke({ color: 0x333333, width: 0.5, alpha: 0.3 });
      } else if (f.type === "ruin") {
        // Ruined stone pillar
        g.rect(x - f.height * 0.15, baseY3 - f.height * 0.8, f.height * 0.3, f.height * 0.8).fill({ color: f.color });
        g.rect(x - f.height * 0.2, baseY3 - f.height * 0.82, f.height * 0.4, f.height * 0.06).fill({ color: f.color + 0x111111 });
        // Broken top
        g.moveTo(x - f.height * 0.15, baseY3 - f.height * 0.8)
          .lineTo(x - f.height * 0.05, baseY3 - f.height * 0.9)
          .lineTo(x + f.height * 0.1, baseY3 - f.height * 0.82)
          .fill({ color: f.color - 0x080808 });
        // Moss
        g.ellipse(x, baseY3 - f.height * 0.3, f.height * 0.12, f.height * 0.08).fill({ color: 0x334422, alpha: 0.5 });
      } else if (f.type === "grass") {
        // Grass clump
        for (let gi = 0; gi < 5; gi++) {
          const gx = x + (gi - 2) * 3;
          const gh = f.height * (0.3 + Math.sin(gi * 2.1) * 0.1);
          const sway = Math.sin(state.gameTime * 2 + gi) * 2;
          g.moveTo(gx, baseY3)
            .lineTo(gx + sway, baseY3 - gh)
            .stroke({ color: 0x1a3a0a, width: 1.5, alpha: 0.7 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Player (Eagle + Arthur)
  // ---------------------------------------------------------------------------

  drawPlayer(state: DragoonState, dt: number): void {
    this._eagleTime += dt;
    const px = state.player.position.x;
    const py = state.player.position.y;
    const inv = state.player.invincTimer;

    this._playerContainer.position.set(px, py);

    // Flicker when invincible
    const alpha = inv > 0 ? (Math.sin(state.gameTime * 20) > 0 ? 0.4 : 0.9) : 1.0;
    this._playerContainer.alpha = alpha;

    // Divine Shield glow
    this._shieldGfx.clear();
    if (state.player.shieldActive) {
      const pulse = Math.sin(state.gameTime * 6) * 0.1;
      const shieldR = 40 + Math.sin(state.gameTime * 4) * 4;
      this._shieldGfx.circle(0, 0, shieldR + 8).fill({ color: 0xffdd88, alpha: 0.05 + pulse * 0.5 });
      this._shieldGfx.circle(0, 0, shieldR).fill({ color: 0xffdd88, alpha: 0.12 + pulse });
      this._shieldGfx.circle(0, 0, shieldR).stroke({ color: 0xffeeaa, width: 2.5, alpha: 0.5 + pulse });
      this._shieldGfx.circle(0, 0, shieldR - 4).stroke({ color: 0xffffff, width: 1, alpha: 0.3 + pulse });
    }

    // --- EAGLE ---
    const eg = this._eagleGfx;
    eg.clear();
    const wingFlap = Math.sin(this._eagleTime * 6) * 12; // wing animation
    const wingFlap2 = Math.sin(this._eagleTime * 6 + 0.3) * 10; // secondary wing motion
    const bobY = Math.sin(this._eagleTime * 2.5) * 4;    // gentle bob
    const breathe = Math.sin(this._eagleTime * 3) * 1;    // subtle body breathing

    // Eagle body shadow (on ground below)
    eg.ellipse(0, 60, 20, 6).fill({ color: 0x000000, alpha: 0.08 });

    // Eagle body (white/cream) with subtle breathing
    eg.ellipse(0, bobY, 28 + breathe, 14).fill({ color: 0xf0ead0 });
    // Body shading — underside darker
    eg.ellipse(0, bobY + 4, 24, 9).fill({ color: 0xd8d0b8, alpha: 0.5 });
    // Chest highlight
    eg.ellipse(5, bobY - 2, 12, 8).fill({ color: 0xfaf8ee, alpha: 0.3 });
    // Belly feather pattern
    for (let fi = 0; fi < 4; fi++) {
      const fy = bobY + 1 + fi * 3;
      eg.ellipse(-2 + fi * 2, fy, 6 - fi, 1.5).fill({ color: 0xe8e0c8, alpha: 0.3 });
    }

    // Wings — more detailed with feather layering
    const wingColor = 0xf5f0e0;
    const wingMid = 0xe8e0cc;
    const wingTipColor = 0xccccaa;
    const wingDark = 0xbbb8a0;

    // Left wing — primary feathers
    eg.moveTo(-10, bobY - 5)
      .lineTo(-42, bobY - 18 + wingFlap)
      .lineTo(-50, bobY - 14 + wingFlap * 0.8)
      .lineTo(-38, bobY - 3)
      .fill({ color: wingColor });
    // Left wing — secondary feathers (layered)
    eg.moveTo(-38, bobY - 3)
      .lineTo(-50, bobY - 14 + wingFlap * 0.8)
      .lineTo(-58, bobY - 12 + wingFlap2 * 0.7)
      .lineTo(-48, bobY - 1)
      .fill({ color: wingMid, alpha: 0.9 });
    // Left wing — feather tips (individual fingers)
    for (let fi = 0; fi < 4; fi++) {
      const tipX = -50 - fi * 4;
      const tipY = bobY - 14 + wingFlap * (0.8 + fi * 0.05) + fi * 2;
      eg.moveTo(tipX + 5, tipY + 2)
        .lineTo(tipX - 3, tipY - 2 + wingFlap2 * 0.3)
        .lineTo(tipX + 2, tipY + 4)
        .fill({ color: fi % 2 === 0 ? wingTipColor : wingDark });
    }
    // Left wing membrane detail
    eg.moveTo(-20, bobY - 8 + wingFlap * 0.3)
      .lineTo(-35, bobY - 15 + wingFlap * 0.6)
      .stroke({ color: 0xd8d0b8, width: 0.5, alpha: 0.3 });
    eg.moveTo(-15, bobY - 6 + wingFlap * 0.2)
      .lineTo(-30, bobY - 13 + wingFlap * 0.5)
      .stroke({ color: 0xd8d0b8, width: 0.5, alpha: 0.25 });

    // Right wing — primary feathers
    eg.moveTo(10, bobY - 5)
      .lineTo(42, bobY - 18 + wingFlap)
      .lineTo(50, bobY - 14 + wingFlap * 0.8)
      .lineTo(38, bobY - 3)
      .fill({ color: wingColor });
    // Right wing — secondary feathers
    eg.moveTo(38, bobY - 3)
      .lineTo(50, bobY - 14 + wingFlap * 0.8)
      .lineTo(58, bobY - 12 + wingFlap2 * 0.7)
      .lineTo(48, bobY - 1)
      .fill({ color: wingMid, alpha: 0.9 });
    // Right wing — feather tips
    for (let fi = 0; fi < 4; fi++) {
      const tipX = 50 + fi * 4;
      const tipY = bobY - 14 + wingFlap * (0.8 + fi * 0.05) + fi * 2;
      eg.moveTo(tipX - 5, tipY + 2)
        .lineTo(tipX + 3, tipY - 2 + wingFlap2 * 0.3)
        .lineTo(tipX - 2, tipY + 4)
        .fill({ color: fi % 2 === 0 ? wingTipColor : wingDark });
    }
    // Right wing membrane detail
    eg.moveTo(20, bobY - 8 + wingFlap * 0.3)
      .lineTo(35, bobY - 15 + wingFlap * 0.6)
      .stroke({ color: 0xd8d0b8, width: 0.5, alpha: 0.3 });

    // Tail feathers — fanned out with individual feather shapes
    for (let ti = 0; ti < 4; ti++) {
      const tailAngle = -0.2 + ti * 0.15;
      const tailLen = 22 + ti * 4;
      const tx = -20 - Math.cos(tailAngle) * tailLen;
      const ty = bobY + 8 + Math.sin(tailAngle) * tailLen * 0.5 + ti * 2;
      eg.moveTo(-18, bobY + 6 + ti * 1.5)
        .lineTo(tx, ty)
        .lineTo(tx + 5, ty - 3)
        .lineTo(-15, bobY + 5 + ti * 1.5)
        .fill({ color: ti % 2 === 0 ? 0xe8e0c8 : 0xddd8c0 });
      // Feather shaft line
      eg.moveTo(-18, bobY + 6 + ti * 1.5)
        .lineTo(tx + 2, ty - 1)
        .stroke({ color: 0xccc8b0, width: 0.5, alpha: 0.3 });
    }

    // Head — more detailed with feather texture
    eg.circle(24, bobY - 8, 10).fill({ color: 0xfaf5e8 });
    // Head feather detail
    eg.circle(22, bobY - 11, 6).fill({ color: 0xffffff, alpha: 0.2 });
    eg.ellipse(20, bobY - 6, 7, 5).fill({ color: 0xf0ead0, alpha: 0.4 });
    // Brow ridge
    eg.moveTo(26, bobY - 13)
      .lineTo(32, bobY - 11)
      .lineTo(30, bobY - 10)
      .fill({ color: 0xeee8d0, alpha: 0.6 });

    // Beak — more detailed with upper and lower mandible
    eg.moveTo(32, bobY - 10)
      .lineTo(42, bobY - 8)
      .lineTo(32, bobY - 7)
      .fill({ color: 0xddaa33 });
    // Lower mandible
    eg.moveTo(32, bobY - 7)
      .lineTo(38, bobY - 6.5)
      .lineTo(32, bobY - 5.5)
      .fill({ color: 0xcc9922, alpha: 0.8 });
    // Beak highlight
    eg.moveTo(33, bobY - 10)
      .lineTo(39, bobY - 8.5)
      .lineTo(33, bobY - 8)
      .fill({ color: 0xeecc55, alpha: 0.3 });
    // Nostril
    eg.circle(34, bobY - 8.5, 0.5).fill({ color: 0x886622 });

    // Eye — more expressive with iris detail
    eg.circle(28, bobY - 10, 2.5).fill({ color: 0x221100 });
    // Iris
    eg.circle(28, bobY - 10, 1.8).fill({ color: 0x553300 });
    // Pupil
    eg.circle(28.3, bobY - 10.2, 1).fill({ color: 0x110800 });
    // Eye shine (double highlight)
    eg.circle(28.8, bobY - 10.8, 0.8).fill({ color: 0xffffff });
    eg.circle(27.5, bobY - 9.5, 0.4).fill({ color: 0xffffff, alpha: 0.5 });

    // Talons — more detailed with multiple toes
    // Left talon
    eg.moveTo(-5, bobY + 12).lineTo(-4, bobY + 18).stroke({ color: 0xccaa44, width: 1.5 });
    eg.moveTo(-4, bobY + 18).lineTo(-8, bobY + 23).stroke({ color: 0xccaa44, width: 1 });
    eg.moveTo(-4, bobY + 18).lineTo(-3, bobY + 24).stroke({ color: 0xccaa44, width: 1 });
    eg.moveTo(-4, bobY + 18).lineTo(-1, bobY + 22).stroke({ color: 0xccaa44, width: 1 });
    // Talon tips
    eg.circle(-8, bobY + 23, 0.5).fill({ color: 0x332200 });
    eg.circle(-3, bobY + 24, 0.5).fill({ color: 0x332200 });
    // Right talon
    eg.moveTo(5, bobY + 12).lineTo(4, bobY + 18).stroke({ color: 0xccaa44, width: 1.5 });
    eg.moveTo(4, bobY + 18).lineTo(8, bobY + 23).stroke({ color: 0xccaa44, width: 1 });
    eg.moveTo(4, bobY + 18).lineTo(3, bobY + 24).stroke({ color: 0xccaa44, width: 1 });
    eg.moveTo(4, bobY + 18).lineTo(1, bobY + 22).stroke({ color: 0xccaa44, width: 1 });
    eg.circle(8, bobY + 23, 0.5).fill({ color: 0x332200 });
    eg.circle(3, bobY + 24, 0.5).fill({ color: 0x332200 });

    // --- ARTHUR (riding on top) ---
    const ag = this._arthurGfx;
    ag.clear();
    const ay = bobY - 18;

    // Legs straddling eagle — with boots and armor detail
    ag.rect(-8, ay + 8, 5, 10).fill({ color: 0x443322 }); // left leg
    ag.rect(3, ay + 8, 5, 10).fill({ color: 0x443322 });  // right leg
    // Boot cuffs
    ag.rect(-9, ay + 14, 7, 3).fill({ color: 0x332211 });
    ag.rect(2, ay + 14, 7, 3).fill({ color: 0x332211 });
    // Knee armor plates
    ag.ellipse(-5.5, ay + 10, 3, 2).fill({ color: 0x6688bb, alpha: 0.5 });
    ag.ellipse(5.5, ay + 10, 3, 2).fill({ color: 0x6688bb, alpha: 0.5 });

    // Torso (blue tunic with armor details)
    ag.rect(-7, ay - 4, 14, 14).fill({ color: 0x2244aa });
    // Chainmail under-layer hint
    ag.rect(-6, ay - 2, 12, 10).fill({ color: 0x556688, alpha: 0.2 });
    // Chest plate
    ag.rect(-5, ay - 3, 10, 8).fill({ color: 0x3355bb, alpha: 0.4 });
    // Royal crest on chest (small diamond)
    ag.moveTo(0, ay - 1).lineTo(2, ay + 1).lineTo(0, ay + 3).lineTo(-2, ay + 1).fill({ color: 0xddaa22, alpha: 0.6 });
    // Shoulder pauldrons
    ag.ellipse(-7, ay - 2, 4, 3).fill({ color: 0x4466cc });
    ag.ellipse(-7, ay - 2, 3, 2).fill({ color: 0x5577dd, alpha: 0.4 });
    ag.ellipse(7, ay - 2, 4, 3).fill({ color: 0x4466cc });
    ag.ellipse(7, ay - 2, 3, 2).fill({ color: 0x5577dd, alpha: 0.4 });

    // Belt with detail
    ag.rect(-8, ay + 6, 16, 3).fill({ color: 0x886633 });
    // Belt studs
    ag.circle(-5, ay + 7.5, 0.8).fill({ color: 0xccaa44 });
    ag.circle(5, ay + 7.5, 0.8).fill({ color: 0xccaa44 });
    // Belt buckle
    ag.rect(-2.5, ay + 5.5, 5, 4.5).fill({ color: 0xddbb44 });
    ag.rect(-1.5, ay + 6.5, 3, 2.5).fill({ color: 0xccaa33, alpha: 0.6 });
    // Buckle shine
    ag.rect(-1, ay + 6, 1, 1.5).fill({ color: 0xffeedd, alpha: 0.4 });

    // Cape (flowing behind — multi-layer with wind)
    const capeWave = Math.sin(this._eagleTime * 3) * 3;
    const capeWave2 = Math.sin(this._eagleTime * 3.5 + 1) * 2;
    // Outer cape layer
    ag.moveTo(-5, ay - 2)
      .lineTo(-22, ay + 12 + capeWave)
      .lineTo(-18, ay + 18 + capeWave * 0.5)
      .lineTo(-3, ay + 10)
      .fill({ color: 0xcc2222 });
    // Inner cape layer
    ag.moveTo(-4, ay - 1)
      .lineTo(-24, ay + 14 + capeWave * 0.8 + capeWave2)
      .lineTo(-20, ay + 20 + capeWave * 0.4)
      .lineTo(-2, ay + 12)
      .fill({ color: 0xaa1111, alpha: 0.7 });
    // Cape edge fold highlight
    ag.moveTo(-22, ay + 12 + capeWave)
      .lineTo(-20, ay + 16 + capeWave * 0.6)
      .lineTo(-18, ay + 18 + capeWave * 0.5)
      .fill({ color: 0xdd3333, alpha: 0.4 });
    // Cape gold trim
    ag.moveTo(-5, ay - 2)
      .lineTo(-22, ay + 12 + capeWave)
      .stroke({ color: 0xddaa22, width: 0.8, alpha: 0.4 });
    // Cape inner lining
    ag.moveTo(-4, ay)
      .lineTo(-16, ay + 10 + capeWave * 0.6)
      .lineTo(-12, ay + 14 + capeWave * 0.4)
      .lineTo(-2, ay + 8)
      .fill({ color: 0x661155, alpha: 0.3 });

    // Arms with gauntlet detail
    ag.rect(7, ay, 4, 8).fill({ color: 0x2244aa }); // right arm (wand arm)
    // Gauntlet
    ag.rect(7, ay + 5, 4, 3).fill({ color: 0x5577bb, alpha: 0.5 });
    // Left arm (behind)
    ag.rect(-9, ay + 1, 3, 6).fill({ color: 0x1a3388, alpha: 0.7 });

    // Head
    ag.circle(0, ay - 10, 6.5).fill({ color: 0xffccaa }); // face
    // Face shading
    ag.ellipse(0, ay - 8, 5, 3).fill({ color: 0xf0bb99, alpha: 0.3 });
    // Cheek blush
    ag.circle(-3.5, ay - 8.5, 1.5).fill({ color: 0xffaa88, alpha: 0.2 });
    ag.circle(3.5, ay - 8.5, 1.5).fill({ color: 0xffaa88, alpha: 0.2 });

    // Hair — more detailed
    ag.ellipse(0, ay - 14, 7, 4).fill({ color: 0x553311 });
    ag.ellipse(-3, ay - 14.5, 4, 3).fill({ color: 0x664422, alpha: 0.6 });
    ag.ellipse(3, ay - 13, 3, 2.5).fill({ color: 0x442200, alpha: 0.5 });
    // Sideburns
    ag.rect(-6, ay - 12, 1.5, 4).fill({ color: 0x553311, alpha: 0.5 });
    ag.rect(4.5, ay - 12, 1.5, 4).fill({ color: 0x553311, alpha: 0.5 });

    // Crown (detailed golden with gems and filigree)
    ag.rect(-5.5, ay - 17, 11, 3.5).fill({ color: 0xddaa22 });
    // Crown base decoration
    ag.rect(-5.5, ay - 17, 11, 1).fill({ color: 0xeebb33, alpha: 0.5 });
    // Crown points
    ag.moveTo(-4.5, ay - 17).lineTo(-3.5, ay - 20).lineTo(-2.5, ay - 17).fill({ color: 0xddaa22 });
    ag.moveTo(-1, ay - 17).lineTo(0, ay - 21).lineTo(1, ay - 17).fill({ color: 0xddaa22 });
    ag.moveTo(2.5, ay - 17).lineTo(3.5, ay - 20).lineTo(4.5, ay - 17).fill({ color: 0xddaa22 });
    // Crown point tips — gold balls
    ag.circle(-3.5, ay - 20, 0.8).fill({ color: 0xeebb33 });
    ag.circle(0, ay - 21, 1).fill({ color: 0xeebb33 });
    ag.circle(3.5, ay - 20, 0.8).fill({ color: 0xeebb33 });
    // Crown gem (center)
    ag.circle(0, ay - 18.5, 1.8).fill({ color: 0xff2244 });
    ag.circle(0, ay - 18.5, 1.2).fill({ color: 0xff4466, alpha: 0.5 });
    ag.circle(0.3, ay - 19, 0.5).fill({ color: 0xffffff, alpha: 0.6 }); // gem highlight
    // Side gems
    ag.circle(-3.5, ay - 18, 1).fill({ color: 0x2266ff, alpha: 0.8 });
    ag.circle(3.5, ay - 18, 1).fill({ color: 0x2266ff, alpha: 0.8 });
    // Crown shine
    ag.rect(-2, ay - 17, 4, 1).fill({ color: 0xffeedd, alpha: 0.2 });

    // Eyes — more expressive
    // Eye whites
    ag.ellipse(-2.2, ay - 10, 1.8, 1.3).fill({ color: 0xffffff, alpha: 0.9 });
    ag.ellipse(2.2, ay - 10, 1.8, 1.3).fill({ color: 0xffffff, alpha: 0.9 });
    // Irises
    ag.circle(-2, ay - 10, 1.2).fill({ color: 0x224488 });
    ag.circle(2, ay - 10, 1.2).fill({ color: 0x224488 });
    // Pupils
    ag.circle(-2, ay - 10, 0.6).fill({ color: 0x111133 });
    ag.circle(2, ay - 10, 0.6).fill({ color: 0x111133 });
    // Eye shine
    ag.circle(-1.5, ay - 10.5, 0.4).fill({ color: 0xffffff });
    ag.circle(2.5, ay - 10.5, 0.4).fill({ color: 0xffffff });

    // Mouth (slight determined expression)
    ag.moveTo(-1.5, ay - 7).lineTo(1.5, ay - 7).stroke({ color: 0xcc8877, width: 0.6, alpha: 0.5 });
    // Nose
    ag.moveTo(0, ay - 9.5).lineTo(0.5, ay - 8).lineTo(-0.5, ay - 8).fill({ color: 0xf0bb99, alpha: 0.4 });

    // --- MAGIC WAND ---
    const wandAngle = Math.sin(this._eagleTime * 1.5) * 0.15;
    const wandX = 12;
    const wandY = ay + 2;
    const wandLen = 22;
    const wandEndX = wandX + Math.cos(-0.3 + wandAngle) * wandLen;
    const wandEndY = wandY + Math.sin(-0.3 + wandAngle) * wandLen;

    // Wand shaft
    ag.moveTo(wandX, wandY)
      .lineTo(wandEndX, wandEndY)
      .stroke({ color: 0x886644, width: 3 });
    // Wand tip orb
    ag.circle(wandEndX, wandEndY, 4).fill({ color: 0x88ccff });
    ag.circle(wandEndX, wandEndY, 3).fill({ color: 0xaaddff });
    ag.circle(wandEndX, wandEndY, 1.5).fill({ color: 0xffffff });

    // Wand glow effect
    const wg = this._wandGlowGfx;
    wg.clear();
    const glowPulse = 0.5 + 0.5 * Math.sin(this._eagleTime * 4);
    wg.circle(wandEndX, wandEndY, 12 + glowPulse * 6).fill({ color: 0x88ccff, alpha: 0.08 + glowPulse * 0.06 });
    wg.circle(wandEndX, wandEndY, 8 + glowPulse * 3).fill({ color: 0xaaddff, alpha: 0.1 + glowPulse * 0.05 });

    // Sparkles around wand tip
    for (let i = 0; i < 3; i++) {
      const sparkAngle = this._eagleTime * 3 + i * (Math.PI * 2 / 3);
      const sparkR = 10 + glowPulse * 5;
      const sx = wandEndX + Math.cos(sparkAngle) * sparkR;
      const sy = wandEndY + Math.sin(sparkAngle) * sparkR;
      wg.circle(sx, sy, 1 + glowPulse).fill({ color: 0xffffff, alpha: 0.4 + glowPulse * 0.3 });
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies
  // ---------------------------------------------------------------------------

  drawEnemies(state: DragoonState, _dt: number): void {
    const seen = new Set<number>();

    for (const enemy of state.enemies) {
      seen.add(enemy.id);
      let view = this._enemyViews.get(enemy.id);
      if (!view) {
        const gfx = new Graphics();
        const hpBar = new Graphics();
        let nameText: Text | null = null;
        if (enemy.isBoss) {
          nameText = new Text({
            text: _getBossName(enemy.type),
            style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 12, fill: 0xffddaa, fontWeight: "bold" }),
          });
          nameText.anchor.set(0.5, 1);
        }
        view = { gfx, hpBar, nameText };
        this._enemyContainer.addChild(gfx);
        this._enemyContainer.addChild(hpBar);
        if (nameText) this._enemyContainer.addChild(nameText);
        this._enemyViews.set(enemy.id, view);
      }

      const { gfx, hpBar, nameText } = view;
      gfx.clear();
      hpBar.clear();

      if (!enemy.alive) {
        // Death animation: shrink + fade
        const t = 1 - enemy.deathTimer / 0.5;
        gfx.alpha = 1 - t;
        gfx.scale.set(1 + t * 0.5);
        _drawEnemyShape(gfx, enemy, state.gameTime);
        gfx.position.set(enemy.position.x, enemy.position.y);
        hpBar.alpha = 0;
        if (nameText) nameText.alpha = 0;
        continue;
      }

      gfx.alpha = enemy.hitTimer > 0 ? 0.5 : 1;
      gfx.scale.set(1);
      gfx.position.set(enemy.position.x, enemy.position.y);

      // Teleport enemies: flickering alpha
      if (enemy.pattern === EnemyPattern.TELEPORT) {
        const flicker = enemy.patternParam < 0.5 ? (Math.sin(state.gameTime * 30) * 0.3 + 0.5) : 1;
        gfx.alpha = Math.min(gfx.alpha, flicker);
      }

      // Zigzag enemies: afterimage trail
      if (enemy.pattern === EnemyPattern.ZIGZAG) {
        const trailAlpha = 0.15;
        gfx.circle(-12, 0, enemy.size * 10).fill({ color: enemy.glowColor, alpha: trailAlpha });
        gfx.circle(-24, 0, enemy.size * 8).fill({ color: enemy.glowColor, alpha: trailAlpha * 0.5 });
      }

      _drawEnemyShape(gfx, enemy, state.gameTime);

      // Allied glow
      if (enemy.isAllied) {
        gfx.circle(0, 0, enemy.size * 18).fill({ color: 0x44ff44, alpha: 0.08 + Math.sin(state.gameTime * 4) * 0.03 });
      }

      // Mark for Death indicator
      if (enemy.damageAmpTimer > 0 && enemy.damageAmp > 1) {
        const markPulse = Math.sin(state.gameTime * 8) * 0.1;
        gfx.circle(0, 0, enemy.size * 20).stroke({ color: 0xff2222, width: 1.5, alpha: 0.5 + markPulse });
        // Skull-like X marker
        gfx.moveTo(-6, -6).lineTo(6, 6).stroke({ color: 0xff2222, width: 2, alpha: 0.6 });
        gfx.moveTo(6, -6).lineTo(-6, 6).stroke({ color: 0xff2222, width: 2, alpha: 0.6 });
      }

      // DoT indicator
      if (enemy.dotTimer > 0) {
        gfx.circle(0, 0, enemy.size * 16).fill({ color: 0xaa0000, alpha: 0.06 + Math.sin(state.gameTime * 5) * 0.03 });
      }

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const bw = enemy.size * 30;
        const bh = 3;
        const bx = enemy.position.x - bw / 2;
        const by = enemy.position.y - enemy.size * 20;
        hpBar.rect(bx, by, bw, bh).fill({ color: 0x220000 });
        hpBar.rect(bx, by, bw * (enemy.hp / enemy.maxHp), bh).fill({ color: enemy.isBoss ? 0xff4444 : 0x44ff44 });
        hpBar.alpha = 1;
      }

      if (nameText) {
        nameText.position.set(enemy.position.x, enemy.position.y - enemy.size * 24);
        nameText.alpha = 1;
      }
    }

    // Cleanup removed enemies
    for (const [id, view] of this._enemyViews) {
      if (!seen.has(id)) {
        this._enemyContainer.removeChild(view.gfx);
        this._enemyContainer.removeChild(view.hpBar);
        if (view.nameText) this._enemyContainer.removeChild(view.nameText);
        view.gfx.destroy();
        view.hpBar.destroy();
        view.nameText?.destroy();
        this._enemyViews.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------

  drawProjectiles(state: DragoonState, _dt: number): void {
    const seen = new Set<number>();

    for (const proj of state.projectiles) {
      seen.add(proj.id);
      let gfx = this._projViews.get(proj.id);
      if (!gfx) {
        gfx = new Graphics();
        this._projectileContainer.addChild(gfx);
        this._projViews.set(proj.id, gfx);
      }

      gfx.clear();
      gfx.position.set(proj.position.x, proj.position.y);

      // Glow
      gfx.circle(0, 0, proj.size * 2.5).fill({ color: proj.color, alpha: 0.15 * proj.glowIntensity });
      gfx.circle(0, 0, proj.size * 1.5).fill({ color: proj.color, alpha: 0.3 * proj.glowIntensity });
      // Core
      gfx.circle(0, 0, proj.size).fill({ color: proj.color });
      gfx.circle(0, 0, proj.size * 0.5).fill({ color: 0xffffff, alpha: 0.7 });

      // Trail
      const speed = Math.sqrt(proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y);
      if (speed > 50) {
        const angle = Math.atan2(proj.velocity.y, proj.velocity.x);
        const trailLen = Math.min(speed * 0.04, 20);
        gfx.moveTo(0, 0)
          .lineTo(-Math.cos(angle) * trailLen, -Math.sin(angle) * trailLen)
          .stroke({ color: proj.trailColor, width: proj.size * 0.8, alpha: 0.4 });
      }
    }

    // Cleanup
    for (const [id, gfx] of this._projViews) {
      if (!seen.has(id)) {
        this._projectileContainer.removeChild(gfx);
        gfx.destroy();
        this._projViews.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Full render pass
  // ---------------------------------------------------------------------------

  render(state: DragoonState, dt: number): void {
    this._worldWidth = state.worldWidth;
    this._drawStars(state.gameTime, state.screenW, dt);
    this._drawClouds(state.screenW, dt);
    this._drawGround(state, dt);
    this.drawPlayer(state, dt);
    this._drawPickups(state);
    this._drawCompanions(state);
    this._drawPoisonClouds(state);
    this.drawEnemies(state, dt);
    this.drawProjectiles(state, dt);
  }

  // ---------------------------------------------------------------------------
  // Companions (hawks, wolves, clones)
  // ---------------------------------------------------------------------------

  private _companionGfx = new Graphics();

  private _drawCompanions(state: DragoonState): void {
    if (!this._companionGfx.parent) {
      this._enemyContainer.addChild(this._companionGfx);
    }
    const g = this._companionGfx;
    g.clear();

    for (const c of state.companions) {
      const x = c.position.x;
      const y = c.position.y;
      const pulse = Math.sin(state.gameTime * 5 + c.id) * 0.15;

      if (c.type === "hawk") {
        // Small hawk shape
        g.circle(x, y, 12).fill({ color: 0xddaa44, alpha: 0.15 + pulse * 0.05 });
        g.ellipse(x, y, 10, 5).fill({ color: 0xccaa33 });
        g.moveTo(x - 12, y + 2).lineTo(x - 6, y - 4).lineTo(x, y).fill({ color: 0xddaa44 });
        g.moveTo(x, y).lineTo(x + 6, y - 4).lineTo(x + 12, y + 2).fill({ color: 0xddaa44 });
      } else if (c.type === "wolf") {
        // Wolf shape
        g.circle(x, y, 14).fill({ color: 0x88aa66, alpha: 0.12 + pulse * 0.05 });
        g.ellipse(x, y, 10, 7).fill({ color: 0x667744 });
        g.circle(x + 6, y - 3, 3).fill({ color: 0x88aa66 });
        g.circle(x + 9, y - 2, 1.5).fill({ color: 0xffff88 });
      } else {
        // Clone (ghostly player)
        g.circle(x, y, 16).fill({ color: 0x8844cc, alpha: 0.12 + pulse * 0.05 });
        g.ellipse(x, y, 8, 10).fill({ color: 0x6633aa, alpha: 0.7 });
        g.circle(x, y - 4, 4).fill({ color: 0x8844cc, alpha: 0.7 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Poison Clouds
  // ---------------------------------------------------------------------------

  private _poisonGfx = new Graphics();

  private _drawPoisonClouds(state: DragoonState): void {
    if (!this._poisonGfx.parent) {
      this._enemyContainer.addChild(this._poisonGfx);
    }
    const g = this._poisonGfx;
    g.clear();

    for (const cloud of state.poisonClouds) {
      const fadeAlpha = Math.min(1, cloud.timer / cloud.maxTimer);
      const pulse = Math.sin(state.gameTime * 3 + cloud.id) * 0.05;
      g.circle(cloud.position.x, cloud.position.y, cloud.radius).fill({ color: cloud.color, alpha: (0.12 + pulse) * fadeAlpha });
      g.circle(cloud.position.x, cloud.position.y, cloud.radius * 0.7).fill({ color: cloud.color, alpha: (0.08 + pulse) * fadeAlpha });
      g.circle(cloud.position.x, cloud.position.y, cloud.radius * 0.4).fill({ color: 0x88ff88, alpha: 0.06 * fadeAlpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------

  private _pickupGfx = new Graphics();

  private _drawPickups(state: DragoonState): void {
    // Lazily add to container
    if (!this._pickupGfx.parent) {
      this._pickupContainer.addChild(this._pickupGfx);
    }
    const g = this._pickupGfx;
    g.clear();

    for (const pickup of state.pickups) {
      if (pickup.collected) continue;
      const px = pickup.position.x;
      const py = pickup.position.y + Math.sin(pickup.bobTimer * 3) * 5; // bob
      const fadeAlpha = pickup.lifetime < 2 ? pickup.lifetime / 2 : 1;

      switch (pickup.type) {
        case DragoonPickupType.HEALTH_ORB:
          // Green circle
          g.circle(px, py, 10).fill({ color: 0x44ff44, alpha: 0.15 * fadeAlpha });
          g.circle(px, py, 7).fill({ color: 0x22cc22, alpha: 0.8 * fadeAlpha });
          g.circle(px, py, 3).fill({ color: 0xaaffaa, alpha: 0.6 * fadeAlpha });
          // Cross shape
          g.rect(px - 1, py - 4, 2, 8).fill({ color: 0xffffff, alpha: 0.7 * fadeAlpha });
          g.rect(px - 4, py - 1, 8, 2).fill({ color: 0xffffff, alpha: 0.7 * fadeAlpha });
          break;
        case DragoonPickupType.MANA_ORB:
          // Blue circle
          g.circle(px, py, 10).fill({ color: 0x4488ff, alpha: 0.15 * fadeAlpha });
          g.circle(px, py, 7).fill({ color: 0x2266dd, alpha: 0.8 * fadeAlpha });
          g.circle(px, py, 3).fill({ color: 0xaaddff, alpha: 0.6 * fadeAlpha });
          // Diamond shape
          g.moveTo(px, py - 5).lineTo(px + 3, py).lineTo(px, py + 5).lineTo(px - 3, py).fill({ color: 0xffffff, alpha: 0.6 * fadeAlpha });
          break;
        case DragoonPickupType.SCORE_MULTIPLIER: {
          // Gold star
          g.circle(px, py, 12).fill({ color: 0xffdd44, alpha: 0.12 * fadeAlpha });
          const points = 5;
          const outerR = 8;
          const innerR = 4;
          for (let i = 0; i < points; i++) {
            const a1 = (i / points) * Math.PI * 2 - Math.PI / 2;
            const a2 = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
            const ox = px + Math.cos(a1) * outerR;
            const oy = py + Math.sin(a1) * outerR;
            const ix = px + Math.cos(a2) * innerR;
            const iy = py + Math.sin(a2) * innerR;
            g.circle(ox, oy, 1.5).fill({ color: 0xffdd44, alpha: 0.9 * fadeAlpha });
            g.circle(ix, iy, 1).fill({ color: 0xffdd44, alpha: 0.7 * fadeAlpha });
          }
          g.circle(px, py, 5).fill({ color: 0xffdd44, alpha: 0.9 * fadeAlpha });
          g.circle(px, py, 2.5).fill({ color: 0xffffff, alpha: 0.5 * fadeAlpha });
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanup(): void {
    this.worldLayer.removeChildren();
    this._enemyViews.forEach(v => { v.gfx.destroy(); v.hpBar.destroy(); v.nameText?.destroy(); });
    this._enemyViews.clear();
    this._projViews.forEach(g => g.destroy());
    this._projViews.clear();
  }
}

// ---------------------------------------------------------------------------
// Enemy shape drawing
// ---------------------------------------------------------------------------

function _drawEnemyShape(g: Graphics, enemy: DragoonEnemy, time: number): void {
  const s = enemy.size;

  // Glow aura
  g.circle(0, 0, s * 20).fill({ color: enemy.glowColor, alpha: 0.1 });

  switch (enemy.type) {
    case DragoonEnemyType.DARK_CROW:
      _drawCrow(g, s, time);
      break;
    case DragoonEnemyType.SHADOW_BAT:
      _drawBat(g, s, time);
      break;
    case DragoonEnemyType.WYVERN:
      _drawWyvern(g, s, time, enemy.color);
      break;
    case DragoonEnemyType.FIRE_SPRITE:
      _drawFireSprite(g, s, time);
      break;
    case DragoonEnemyType.STORM_HAWK:
      _drawHawk(g, s, time);
      break;
    case DragoonEnemyType.FLOATING_EYE:
      _drawFloatingEye(g, s, time);
      break;
    case DragoonEnemyType.DARK_ANGEL:
      _drawDarkAngel(g, s, time);
      break;
    case DragoonEnemyType.GROUND_CATAPULT:
    case DragoonEnemyType.GROUND_BALLISTA:
      _drawGroundWeapon(g, s, enemy.color);
      break;
    case DragoonEnemyType.GROUND_MAGE_TOWER:
      _drawMageTower(g, s, time);
      break;
    case DragoonEnemyType.SHADOW_WRAITH:
      // Ghostly wraith shape
      g.circle(0, 0, s * 14).fill({ color: 0xaa00ff, alpha: 0.08 });
      g.ellipse(0, 0, s * 10, s * 14).fill({ color: enemy.color });
      g.ellipse(0, -4 * s, s * 7, s * 5).fill({ color: 0x330066 });
      g.circle(-3 * s, -5 * s, 2 * s).fill({ color: 0xaa00ff, alpha: 0.8 });
      g.circle(3 * s, -5 * s, 2 * s).fill({ color: 0xaa00ff, alpha: 0.8 });
      // Wispy tail
      g.ellipse(0, 10 * s, s * 6, s * 4).fill({ color: enemy.color, alpha: 0.4 + Math.sin(time * 5) * 0.2 });
      break;
    case DragoonEnemyType.SKY_VIPER: {
      // Serpentine viper shape
      const viperWave = Math.sin(time * 8) * 3 * s;
      g.ellipse(0, viperWave, s * 12, s * 5).fill({ color: enemy.color });
      g.ellipse(6 * s, viperWave, s * 4, s * 3).fill({ color: 0x448800 });
      // Eyes
      g.circle(8 * s, viperWave - 2 * s, 1.5 * s).fill({ color: 0x66ff00, alpha: 0.9 });
      // Tail segments
      for (let i = 1; i <= 3; i++) {
        const tailOff = Math.sin(time * 8 + i * 0.8) * 3 * s;
        g.ellipse(-i * 6 * s, tailOff, s * (5 - i), s * (3 - i * 0.5)).fill({ color: enemy.color, alpha: 1 - i * 0.2 });
      }
      break;
    }
    case DragoonEnemyType.DARK_FALCON_SQUAD: {
      // Small falcon shape
      const fWing = Math.sin(time * 12) * 6 * s;
      g.ellipse(0, 0, s * 8, s * 5).fill({ color: enemy.color });
      // Wings
      g.moveTo(-3 * s, 0).lineTo(-10 * s, -fWing).lineTo(-5 * s, 0).fill({ color: 0x444466, alpha: 0.8 });
      g.moveTo(-3 * s, 0).lineTo(-10 * s, fWing).lineTo(-5 * s, 0).fill({ color: 0x444466, alpha: 0.8 });
      // Head
      g.ellipse(6 * s, 0, s * 3, s * 2.5).fill({ color: 0x555577 });
      g.circle(7 * s, -1 * s, 1 * s).fill({ color: 0x6666aa, alpha: 0.9 });
      break;
    }
    default:
      // Bosses
      if (enemy.isBoss) {
        _drawBoss(g, enemy, time);
      } else {
        g.circle(0, 0, s * 12).fill({ color: enemy.color });
      }
  }
}

function _drawCrow(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 10) * 8 * s;
  const wing2 = Math.sin(time * 10 + 0.4) * 6 * s;
  // Shadow aura
  g.ellipse(0, 2 * s, 12 * s, 4 * s).fill({ color: 0x000000, alpha: 0.1 });
  // Body
  g.ellipse(0, 0, 10 * s, 5 * s).fill({ color: 0x1a1a2e });
  // Body feather texture
  g.ellipse(0, 1 * s, 8 * s, 3 * s).fill({ color: 0x222238, alpha: 0.5 });
  g.ellipse(2 * s, -1 * s, 5 * s, 3 * s).fill({ color: 0x151528, alpha: 0.4 });
  // Wings — layered feathers
  g.moveTo(-5 * s, 0).lineTo(-18 * s, -6 * s + wing).lineTo(-14 * s, -1 * s).lineTo(-8 * s, 1 * s).fill({ color: 0x111122 });
  g.moveTo(-14 * s, -1 * s).lineTo(-22 * s, -4 * s + wing2).lineTo(-18 * s, 1 * s).fill({ color: 0x0d0d1a, alpha: 0.8 });
  g.moveTo(5 * s, 0).lineTo(18 * s, -6 * s + wing).lineTo(14 * s, -1 * s).lineTo(8 * s, 1 * s).fill({ color: 0x111122 });
  g.moveTo(14 * s, -1 * s).lineTo(22 * s, -4 * s + wing2).lineTo(18 * s, 1 * s).fill({ color: 0x0d0d1a, alpha: 0.8 });
  // Tail feathers
  g.moveTo(8 * s, 2 * s).lineTo(15 * s, 5 * s).lineTo(13 * s, 2 * s).fill({ color: 0x111122 });
  g.moveTo(9 * s, 3 * s).lineTo(16 * s, 7 * s).lineTo(14 * s, 4 * s).fill({ color: 0x0d0d1a });
  // Head
  g.circle(-7 * s, -2 * s, 4 * s).fill({ color: 0x1a1a2e });
  // Beak
  g.moveTo(-10 * s, -2 * s).lineTo(-16 * s, -1 * s).lineTo(-10 * s, 0).fill({ color: 0x884400 });
  g.moveTo(-10 * s, 0).lineTo(-14 * s, 0.5 * s).lineTo(-10 * s, 1 * s).fill({ color: 0x663300, alpha: 0.8 });
  // Eye — glowing red
  g.circle(-8 * s, -3 * s, 2 * s).fill({ color: 0x330000 });
  g.circle(-8 * s, -3 * s, 1.5 * s).fill({ color: 0xff0000 });
  g.circle(-7.5 * s, -3.5 * s, 0.5 * s).fill({ color: 0xff8888, alpha: 0.6 });
  // Claws
  g.moveTo(-3 * s, 4 * s).lineTo(-5 * s, 7 * s).stroke({ color: 0x444444, width: 1 * s });
  g.moveTo(3 * s, 4 * s).lineTo(5 * s, 7 * s).stroke({ color: 0x444444, width: 1 * s });
}

function _drawBat(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 12) * 10 * s;
  const wing2 = Math.sin(time * 12 + 0.5) * 8 * s;
  // Body with fur texture
  g.ellipse(0, 0, 6 * s, 4 * s).fill({ color: 0x2d1b4e });
  g.ellipse(0, -1 * s, 5 * s, 3 * s).fill({ color: 0x3a2560, alpha: 0.4 });
  // Wings (bat-like with membrane detail)
  g.moveTo(-4 * s, -2 * s).lineTo(-20 * s, -8 * s + wing).lineTo(-22 * s, 2 * s + wing * 0.5).lineTo(-8 * s, 2 * s).fill({ color: 0x3a2255 });
  g.moveTo(4 * s, -2 * s).lineTo(20 * s, -8 * s + wing).lineTo(22 * s, 2 * s + wing * 0.5).lineTo(8 * s, 2 * s).fill({ color: 0x3a2255 });
  // Wing bone structure
  g.moveTo(-4 * s, -1 * s).lineTo(-18 * s, -6 * s + wing * 0.8).stroke({ color: 0x4a3366, width: 1 * s, alpha: 0.5 });
  g.moveTo(-4 * s, 0).lineTo(-20 * s, 0 + wing2 * 0.4).stroke({ color: 0x4a3366, width: 0.8 * s, alpha: 0.4 });
  g.moveTo(4 * s, -1 * s).lineTo(18 * s, -6 * s + wing * 0.8).stroke({ color: 0x4a3366, width: 1 * s, alpha: 0.5 });
  g.moveTo(4 * s, 0).lineTo(20 * s, 0 + wing2 * 0.4).stroke({ color: 0x4a3366, width: 0.8 * s, alpha: 0.4 });
  // Wing membrane holes (tattered look)
  g.circle(-14 * s, -2 * s + wing * 0.3, 1.5 * s).fill({ color: 0x1a0e30, alpha: 0.3 });
  g.circle(14 * s, -2 * s + wing * 0.3, 1.5 * s).fill({ color: 0x1a0e30, alpha: 0.3 });
  // Ears
  g.moveTo(-3 * s, -3 * s).lineTo(-4 * s, -7 * s).lineTo(-1 * s, -3 * s).fill({ color: 0x3a2255 });
  g.moveTo(3 * s, -3 * s).lineTo(4 * s, -7 * s).lineTo(1 * s, -3 * s).fill({ color: 0x3a2255 });
  // Inner ears
  g.moveTo(-2.5 * s, -3.5 * s).lineTo(-3.5 * s, -6 * s).lineTo(-1.5 * s, -3.5 * s).fill({ color: 0x553366, alpha: 0.5 });
  g.moveTo(2.5 * s, -3.5 * s).lineTo(3.5 * s, -6 * s).lineTo(1.5 * s, -3.5 * s).fill({ color: 0x553366, alpha: 0.5 });
  // Eyes — larger, more menacing
  g.circle(-2 * s, -1 * s, 2 * s).fill({ color: 0x332200 });
  g.circle(-2 * s, -1 * s, 1.5 * s).fill({ color: 0xffcc00 });
  g.circle(-2 * s, -1 * s, 0.8 * s).fill({ color: 0x110000 });
  g.circle(2 * s, -1 * s, 2 * s).fill({ color: 0x332200 });
  g.circle(2 * s, -1 * s, 1.5 * s).fill({ color: 0xffcc00 });
  g.circle(2 * s, -1 * s, 0.8 * s).fill({ color: 0x110000 });
  // Nose wrinkle
  g.ellipse(0, 0.5 * s, 2 * s, 1 * s).fill({ color: 0x221133, alpha: 0.4 });
  // Fangs (two pairs)
  g.moveTo(-1.5 * s, 2 * s).lineTo(-1 * s, 5 * s).lineTo(-0.5 * s, 2 * s).fill({ color: 0xffffff });
  g.moveTo(0.5 * s, 2 * s).lineTo(1 * s, 5 * s).lineTo(1.5 * s, 2 * s).fill({ color: 0xffffff });
  // Feet
  g.moveTo(-2 * s, 3.5 * s).lineTo(-3 * s, 6 * s).stroke({ color: 0x3a2255, width: 0.8 * s });
  g.moveTo(2 * s, 3.5 * s).lineTo(3 * s, 6 * s).stroke({ color: 0x3a2255, width: 0.8 * s });
}

function _drawWyvern(g: Graphics, s: number, time: number, color: number): void {
  const wing = Math.sin(time * 5) * 12 * s;
  const wing2 = Math.sin(time * 5 + 0.4) * 10 * s;
  // Body with scale pattern
  g.ellipse(0, 0, 16 * s, 8 * s).fill({ color });
  g.ellipse(0, 2 * s, 14 * s, 6 * s).fill({ color: color + 0x111111, alpha: 0.5 });
  // Belly scales (lighter underside)
  g.ellipse(0, 4 * s, 10 * s, 4 * s).fill({ color: color + 0x222211, alpha: 0.3 });
  // Scale texture rows
  for (let si = 0; si < 4; si++) {
    g.ellipse(-4 * s + si * 3 * s, -1 * s + si * 1.5 * s, 3 * s, 1.5 * s).fill({ color: color - 0x080808, alpha: 0.15 });
  }
  // Wings with membrane and claws
  g.moveTo(-8 * s, -4 * s).lineTo(-30 * s, -15 * s + wing).lineTo(-25 * s, -2 * s).fill({ color: color - 0x111111 });
  g.moveTo(-25 * s, -2 * s).lineTo(-34 * s, -10 * s + wing2).lineTo(-30 * s, 1 * s).fill({ color: color - 0x181818, alpha: 0.7 });
  // Wing bone
  g.moveTo(-8 * s, -4 * s).lineTo(-28 * s, -13 * s + wing * 0.9).stroke({ color: color - 0x050505, width: 1.5 * s, alpha: 0.4 });
  // Wing claw
  g.circle(-30 * s, -14 * s + wing, 1.5 * s).fill({ color: 0x443322 });
  g.moveTo(8 * s, -4 * s).lineTo(30 * s, -15 * s + wing).lineTo(25 * s, -2 * s).fill({ color: color - 0x111111 });
  g.moveTo(25 * s, -2 * s).lineTo(34 * s, -10 * s + wing2).lineTo(30 * s, 1 * s).fill({ color: color - 0x181818, alpha: 0.7 });
  g.moveTo(8 * s, -4 * s).lineTo(28 * s, -13 * s + wing * 0.9).stroke({ color: color - 0x050505, width: 1.5 * s, alpha: 0.4 });
  g.circle(30 * s, -14 * s + wing, 1.5 * s).fill({ color: 0x443322 });
  // Neck
  g.moveTo(-8 * s, -3 * s).lineTo(-14 * s, -5 * s).lineTo(-12 * s, 0).fill({ color, alpha: 0.8 });
  // Head (long snout)
  g.ellipse(-14 * s, -4 * s, 5 * s, 4 * s).fill({ color });
  // Jaw
  g.ellipse(-16 * s, -2 * s, 4 * s, 2.5 * s).fill({ color: color - 0x080808, alpha: 0.6 });
  // Horns
  g.moveTo(-12 * s, -7 * s).lineTo(-10 * s, -12 * s).stroke({ color: 0x554433, width: 1.5 * s });
  g.moveTo(-15 * s, -7 * s).lineTo(-17 * s, -11 * s).stroke({ color: 0x554433, width: 1.5 * s });
  // Nostrils with smoke
  g.circle(-18 * s, -4 * s, 0.8 * s).fill({ color: 0x331100 });
  g.circle(-19 * s, -4.5 * s, 0.8 * s).fill({ color: 0x331100 });
  // Eyes — slit pupils
  g.ellipse(-16 * s, -5 * s, 2 * s, 1.5 * s).fill({ color: 0xff4400 });
  g.ellipse(-16 * s, -5 * s, 0.8 * s, 1.5 * s).fill({ color: 0x110000 });
  g.circle(-15.5 * s, -5.5 * s, 0.4 * s).fill({ color: 0xff8844, alpha: 0.5 });
  // Fire breath hint — animated
  const fireAlpha = 0.3 + Math.sin(time * 6) * 0.2;
  g.circle(-20 * s, -3 * s, 3 * s).fill({ color: 0xff6600, alpha: fireAlpha * 0.5 });
  g.circle(-22 * s, -2.5 * s, 2 * s).fill({ color: 0xff4400, alpha: fireAlpha * 0.3 });
  g.circle(-21 * s, -3.5 * s, 1.5 * s).fill({ color: 0xffaa00, alpha: fireAlpha * 0.4 });
  // Tail — segmented with spade tip
  g.moveTo(14 * s, 4 * s).lineTo(24 * s, 6 * s).lineTo(30 * s, 8 * s).stroke({ color: color - 0x111111, width: 3 * s });
  g.moveTo(28 * s, 6 * s).lineTo(34 * s, 8 * s).lineTo(30 * s, 12 * s).lineTo(28 * s, 8 * s).fill({ color: color - 0x111111 }); // spade
  // Legs (short, tucked)
  g.moveTo(-4 * s, 6 * s).lineTo(-6 * s, 12 * s).stroke({ color: color - 0x080808, width: 2 * s });
  g.moveTo(4 * s, 6 * s).lineTo(6 * s, 12 * s).stroke({ color: color - 0x080808, width: 2 * s });
  // Claws
  g.moveTo(-6 * s, 12 * s).lineTo(-8 * s, 14 * s).stroke({ color: 0x443322, width: 1 * s });
  g.moveTo(6 * s, 12 * s).lineTo(8 * s, 14 * s).stroke({ color: 0x443322, width: 1 * s });
}

function _drawFireSprite(g: Graphics, s: number, time: number): void {
  const flicker = Math.sin(time * 15) * 2 * s;
  const flicker2 = Math.sin(time * 12 + 1) * 1.5 * s;
  // Outer heat distortion
  g.circle(0, 0, 12 * s + flicker).fill({ color: 0xff2200, alpha: 0.06 });
  g.circle(0, -2 * s, 10 * s + flicker2).fill({ color: 0xff4400, alpha: 0.08 });
  // Core flame body
  g.circle(0, 0, 6 * s + flicker).fill({ color: 0xff4400, alpha: 0.8 });
  g.circle(0, -1 * s, 5 * s + flicker * 0.7).fill({ color: 0xff6600, alpha: 0.7 });
  g.circle(0, -1 * s, 4 * s + flicker * 0.5).fill({ color: 0xffaa00 });
  g.circle(0, -1.5 * s, 2.5 * s).fill({ color: 0xffdd66 });
  g.circle(0, -2 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.5 });
  // Flame tongues rising upward
  for (let i = 0; i < 3; i++) {
    const fx = (i - 1) * 3 * s;
    const fy = -6 * s - Math.sin(time * 8 + i * 2) * 4 * s;
    g.moveTo(fx - 2 * s, -3 * s).lineTo(fx, fy + flicker2).lineTo(fx + 2 * s, -3 * s).fill({ color: 0xff6600, alpha: 0.5 });
  }
  // Flame tendrils — more of them, varied colors
  for (let i = 0; i < 6; i++) {
    const a = time * 3 + i * 1.05;
    const r = (8 + Math.sin(a * 2) * 3) * s;
    const tendrilColor = i % 3 === 0 ? 0xff6600 : i % 3 === 1 ? 0xff8800 : 0xffaa22;
    g.circle(Math.cos(a) * r, Math.sin(a) * r, (2 + Math.sin(a) * 0.5) * s).fill({ color: tendrilColor, alpha: 0.4 });
  }
  // Ember sparks
  for (let i = 0; i < 4; i++) {
    const ea = time * 5 + i * 1.6;
    const er = (10 + Math.sin(ea) * 4) * s;
    g.circle(Math.cos(ea) * er, Math.sin(ea) * er - 3 * s, 0.8 * s).fill({ color: 0xffdd44, alpha: 0.5 });
  }
  // Eyes (within flame — bright white with blue center)
  g.circle(-2 * s, -1 * s, 1.5 * s).fill({ color: 0xffffff });
  g.circle(-2 * s, -1 * s, 0.7 * s).fill({ color: 0x4488ff });
  g.circle(2 * s, -1 * s, 1.5 * s).fill({ color: 0xffffff });
  g.circle(2 * s, -1 * s, 0.7 * s).fill({ color: 0x4488ff });
  // Mouth — flickering
  g.ellipse(0, 1.5 * s, 2 * s, 1 * s + flicker2 * 0.2).fill({ color: 0x110000, alpha: 0.4 });
}

function _drawHawk(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 8) * 10 * s;
  const wing2 = Math.sin(time * 8 + 0.3) * 8 * s;
  // Lightning aura — crackling
  g.circle(0, 0, 16 * s).fill({ color: 0x66bbff, alpha: 0.08 + Math.sin(time * 10) * 0.04 });
  // Electric arcs around body
  for (let i = 0; i < 3; i++) {
    const la = time * 12 + i * 2.1;
    const lr = 14 * s;
    const lx1 = Math.cos(la) * lr * 0.6;
    const ly1 = Math.sin(la) * lr * 0.4;
    const lx2 = Math.cos(la + 0.5) * lr;
    const ly2 = Math.sin(la + 0.5) * lr * 0.6;
    g.moveTo(lx1, ly1).lineTo(lx2, ly2).stroke({ color: 0x88ddff, width: 0.8 * s, alpha: 0.3 + Math.sin(time * 15 + i) * 0.2 });
  }
  // Body (sleek, streamlined)
  g.ellipse(0, 0, 12 * s, 5 * s).fill({ color: 0x3344aa });
  g.ellipse(0, 1 * s, 10 * s, 3.5 * s).fill({ color: 0x4455bb, alpha: 0.4 });
  // Chest feather pattern
  g.ellipse(4 * s, 0, 4 * s, 3 * s).fill({ color: 0x3355cc, alpha: 0.3 });
  // Wings — swept back, layered
  g.moveTo(-5 * s, -2 * s).lineTo(-22 * s, -10 * s + wing).lineTo(-18 * s, -1 * s).lineTo(-8 * s, 1 * s).fill({ color: 0x2233aa });
  g.moveTo(-18 * s, -1 * s).lineTo(-26 * s, -6 * s + wing2).lineTo(-22 * s, 2 * s).fill({ color: 0x1a2288, alpha: 0.7 });
  g.moveTo(5 * s, -2 * s).lineTo(22 * s, -10 * s + wing).lineTo(18 * s, -1 * s).lineTo(8 * s, 1 * s).fill({ color: 0x2233aa });
  g.moveTo(18 * s, -1 * s).lineTo(26 * s, -6 * s + wing2).lineTo(22 * s, 2 * s).fill({ color: 0x1a2288, alpha: 0.7 });
  // Tail feathers
  g.moveTo(10 * s, 2 * s).lineTo(18 * s, 5 * s).lineTo(16 * s, 1 * s).fill({ color: 0x2244aa });
  g.moveTo(11 * s, 3 * s).lineTo(20 * s, 7 * s).lineTo(17 * s, 3 * s).fill({ color: 0x1a33aa, alpha: 0.7 });
  // Head
  g.circle(-8 * s, -2 * s, 4 * s).fill({ color: 0x3348bb });
  // Crest feathers
  g.moveTo(-7 * s, -5 * s).lineTo(-5 * s, -9 * s).lineTo(-9 * s, -6 * s).fill({ color: 0x4466cc, alpha: 0.7 });
  // Eyes — electric cyan
  g.circle(-10 * s, -3 * s, 2 * s).fill({ color: 0x003333 });
  g.circle(-10 * s, -3 * s, 1.5 * s).fill({ color: 0x00ffff });
  g.circle(-9.5 * s, -3.5 * s, 0.5 * s).fill({ color: 0xffffff, alpha: 0.7 });
  // Beak — sharper
  g.moveTo(-12 * s, -2 * s).lineTo(-17 * s, -0.5 * s).lineTo(-12 * s, 0.5 * s).fill({ color: 0xdddd00 });
  g.moveTo(-12 * s, 0.5 * s).lineTo(-15 * s, 1 * s).lineTo(-12 * s, 1.5 * s).fill({ color: 0xbbbb00, alpha: 0.7 });
  // Claws
  g.moveTo(-2 * s, 4 * s).lineTo(-4 * s, 8 * s).stroke({ color: 0xdddd00, width: 1 * s });
  g.moveTo(2 * s, 4 * s).lineTo(4 * s, 8 * s).stroke({ color: 0xdddd00, width: 1 * s });
}

function _drawFloatingEye(g: Graphics, s: number, time: number): void {
  // Pulsating outer glow
  const pulse = Math.sin(time * 3) * 0.03;
  g.circle(0, 0, 18 * s).fill({ color: 0xff0066, alpha: 0.04 + pulse });
  // Veiny outer membrane
  g.circle(0, 0, 14 * s).fill({ color: 0x990044, alpha: 0.6 });
  // Veins on membrane
  for (let i = 0; i < 8; i++) {
    const va = i * (Math.PI / 4) + Math.sin(time + i) * 0.1;
    g.moveTo(Math.cos(va) * 8 * s, Math.sin(va) * 8 * s)
      .lineTo(Math.cos(va + 0.2) * 13 * s, Math.sin(va + 0.2) * 13 * s)
      .stroke({ color: 0x660022, width: 0.8 * s, alpha: 0.4 });
  }
  g.circle(0, 0, 12 * s).fill({ color: 0xbb0055 });
  // Iris — ring pattern
  g.circle(0, 0, 9 * s).fill({ color: 0xff0066 });
  g.circle(0, 0, 8 * s).fill({ color: 0xee0055 });
  // Iris radial pattern
  for (let i = 0; i < 12; i++) {
    const ia = i * (Math.PI / 6);
    g.moveTo(Math.cos(ia) * 5 * s, Math.sin(ia) * 5 * s)
      .lineTo(Math.cos(ia) * 9 * s, Math.sin(ia) * 9 * s)
      .stroke({ color: 0xcc0044, width: 0.5 * s, alpha: 0.3 });
  }
  // Pupil — tracks with slit
  const px = Math.sin(time * 1.5) * 2 * s;
  const py = Math.cos(time * 1.2) * 2 * s;
  g.circle(px, py, 4.5 * s).fill({ color: 0x110011 });
  g.ellipse(px, py, 1.5 * s, 4 * s).fill({ color: 0x220022, alpha: 0.5 }); // slit shape
  // Reflection highlights
  g.circle(px + 2 * s, py - 2 * s, 1.8 * s).fill({ color: 0xffffff, alpha: 0.5 });
  g.circle(px - 1 * s, py + 1 * s, 0.8 * s).fill({ color: 0xffffff, alpha: 0.3 });
  // Tentacles — thicker, with suckers
  for (let i = 0; i < 8; i++) {
    const a = time * 2 + i * 0.8;
    const tentLen = (18 + Math.sin(a * 1.5) * 4) * s;
    const midX = Math.cos(a + 0.15) * (tentLen * 0.6);
    const midY = Math.sin(a + 0.15) * (tentLen * 0.6);
    const endX = Math.cos(a + 0.3) * tentLen;
    const endY = Math.sin(a + 0.3) * tentLen;
    // Tentacle base
    g.moveTo(Math.cos(a) * 12 * s, Math.sin(a) * 12 * s)
      .lineTo(endX, endY)
      .stroke({ color: 0x880033, width: 2.5 * s, alpha: 0.6 });
    // Tentacle tip
    g.circle(endX, endY, 1.2 * s).fill({ color: 0xaa0044, alpha: 0.5 });
    // Sucker on middle
    g.circle(midX, midY, 0.8 * s).fill({ color: 0x660022, alpha: 0.4 });
  }
  // Eyelid hint (top and bottom)
  g.moveTo(-12 * s, -4 * s).lineTo(0, -8 * s - Math.sin(time * 2) * 2 * s).lineTo(12 * s, -4 * s).stroke({ color: 0x770033, width: 1.5 * s, alpha: 0.3 });
  g.moveTo(-12 * s, 4 * s).lineTo(0, 8 * s + Math.sin(time * 2) * 2 * s).lineTo(12 * s, 4 * s).stroke({ color: 0x770033, width: 1.5 * s, alpha: 0.3 });
}

function _drawDarkAngel(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 4) * 8 * s;
  const wing2 = Math.sin(time * 4 + 0.5) * 6 * s;
  // Dark aura
  g.circle(0, 0, 20 * s).fill({ color: 0xaa00ff, alpha: 0.05 + Math.sin(time * 3) * 0.025 });
  // Dark wings (large, tattered) — multi-layered
  g.moveTo(-6 * s, -5 * s).lineTo(-30 * s, -20 * s + wing).lineTo(-35 * s, -5 * s).lineTo(-20 * s, 5 * s).fill({ color: 0x1a0033 });
  g.moveTo(-20 * s, 5 * s).lineTo(-35 * s, -5 * s).lineTo(-38 * s, 2 * s + wing2).lineTo(-25 * s, 8 * s).fill({ color: 0x120024, alpha: 0.7 });
  g.moveTo(6 * s, -5 * s).lineTo(30 * s, -20 * s + wing).lineTo(35 * s, -5 * s).lineTo(20 * s, 5 * s).fill({ color: 0x1a0033 });
  g.moveTo(20 * s, 5 * s).lineTo(35 * s, -5 * s).lineTo(38 * s, 2 * s + wing2).lineTo(25 * s, 8 * s).fill({ color: 0x120024, alpha: 0.7 });
  // Wing bone structure
  g.moveTo(-6 * s, -5 * s).lineTo(-28 * s, -18 * s + wing * 0.9).stroke({ color: 0x2a0044, width: 1.5 * s, alpha: 0.4 });
  g.moveTo(6 * s, -5 * s).lineTo(28 * s, -18 * s + wing * 0.9).stroke({ color: 0x2a0044, width: 1.5 * s, alpha: 0.4 });
  // Tattered wing holes
  g.circle(-22 * s, -8 * s + wing * 0.5, 2 * s).fill({ color: 0x0a0015, alpha: 0.3 });
  g.circle(22 * s, -8 * s + wing * 0.5, 2 * s).fill({ color: 0x0a0015, alpha: 0.3 });
  // Body (robed figure with folds)
  g.ellipse(0, 0, 8 * s, 12 * s).fill({ color: 0x220033 });
  g.ellipse(0, 4 * s, 7 * s, 8 * s).fill({ color: 0x1a002a, alpha: 0.5 });
  // Robe fold lines
  g.moveTo(-3 * s, -4 * s).lineTo(-5 * s, 10 * s).stroke({ color: 0x330044, width: 0.8 * s, alpha: 0.3 });
  g.moveTo(3 * s, -4 * s).lineTo(5 * s, 10 * s).stroke({ color: 0x330044, width: 0.8 * s, alpha: 0.3 });
  g.moveTo(0, -2 * s).lineTo(0, 12 * s).stroke({ color: 0x2a0038, width: 0.5 * s, alpha: 0.2 });
  // Chest symbol
  g.moveTo(0, -4 * s).lineTo(2 * s, -1 * s).lineTo(0, 2 * s).lineTo(-2 * s, -1 * s).fill({ color: 0x6600aa, alpha: 0.4 });
  // Shoulders (armored)
  g.ellipse(-7 * s, -6 * s, 3 * s, 2 * s).fill({ color: 0x2a0044 });
  g.ellipse(7 * s, -6 * s, 3 * s, 2 * s).fill({ color: 0x2a0044 });
  // Hands (skeletal, glowing)
  g.circle(-6 * s, 2 * s, 2 * s).fill({ color: 0x332244, alpha: 0.7 });
  g.circle(6 * s, 2 * s, 2 * s).fill({ color: 0x332244, alpha: 0.7 });
  // Head — hood with visible face
  g.circle(0, -10 * s, 5.5 * s).fill({ color: 0x332244 });
  // Hood shadow
  g.ellipse(0, -9 * s, 5 * s, 4 * s).fill({ color: 0x1a0022, alpha: 0.4 });
  // Glowing eyes — with trails
  const eyeGlow = 0.6 + Math.sin(time * 5) * 0.3;
  g.circle(-2 * s, -11 * s, 3 * s).fill({ color: 0xaa00ff, alpha: eyeGlow * 0.2 });
  g.circle(-2 * s, -11 * s, 2 * s).fill({ color: 0xaa00ff, alpha: eyeGlow });
  g.circle(2 * s, -11 * s, 3 * s).fill({ color: 0xaa00ff, alpha: eyeGlow * 0.2 });
  g.circle(2 * s, -11 * s, 2 * s).fill({ color: 0xaa00ff, alpha: eyeGlow });
  // Mouth (dark grin)
  g.moveTo(-2 * s, -8 * s).lineTo(0, -7.5 * s).lineTo(2 * s, -8 * s).stroke({ color: 0x440066, width: 0.8 * s, alpha: 0.5 });
  // Staff — more ornate
  g.moveTo(10 * s, -8 * s).lineTo(10 * s, 14 * s).stroke({ color: 0x553377, width: 2.5 * s });
  // Staff wrappings
  for (let si = 0; si < 4; si++) {
    const sy = -4 * s + si * 5 * s;
    g.moveTo(8.5 * s, sy).lineTo(11.5 * s, sy + 2 * s).stroke({ color: 0x664488, width: 0.8 * s, alpha: 0.4 });
  }
  // Staff orb
  g.circle(10 * s, -10 * s, 4 * s).fill({ color: 0xcc44ff, alpha: 0.3 + Math.sin(time * 5) * 0.2 });
  g.circle(10 * s, -10 * s, 2.5 * s).fill({ color: 0xdd66ff, alpha: 0.5 + Math.sin(time * 5) * 0.3 });
  g.circle(10 * s, -10 * s, 1 * s).fill({ color: 0xffffff, alpha: 0.4 });
  // Soul wisps
  for (let i = 0; i < 5; i++) {
    const a = time * 2 + i * 1.25;
    const r = (18 + Math.sin(a) * 5) * s;
    g.circle(Math.cos(a) * r, Math.sin(a) * r - 5 * s, 1.5 * s).fill({ color: 0x9900ff, alpha: 0.25 });
    // Wisp trail
    g.circle(Math.cos(a - 0.3) * r * 0.95, Math.sin(a - 0.3) * r * 0.95 - 5 * s, 1 * s).fill({ color: 0x7700cc, alpha: 0.12 });
  }
}

function _drawGroundWeapon(g: Graphics, s: number, color: number): void {
  // Ground shadow
  g.ellipse(0, 7 * s, 12 * s, 3 * s).fill({ color: 0x000000, alpha: 0.1 });
  // Platform/base — wooden with planks
  g.rect(-9 * s, -3 * s, 18 * s, 7 * s).fill({ color });
  g.rect(-9 * s, -3 * s, 18 * s, 2 * s).fill({ color: color + 0x0a0a0a, alpha: 0.4 }); // plank highlight
  // Plank lines
  g.moveTo(-3 * s, -3 * s).lineTo(-3 * s, 4 * s).stroke({ color: color - 0x0a0a0a, width: 0.5 * s, alpha: 0.3 });
  g.moveTo(3 * s, -3 * s).lineTo(3 * s, 4 * s).stroke({ color: color - 0x0a0a0a, width: 0.5 * s, alpha: 0.3 });
  // Wheels — with spokes
  g.circle(-6 * s, 5 * s, 3.5 * s).fill({ color: 0x332211 });
  g.circle(-6 * s, 5 * s, 3 * s).fill({ color: 0x443322 });
  g.circle(-6 * s, 5 * s, 1 * s).fill({ color: 0x554433 }); // hub
  g.circle(6 * s, 5 * s, 3.5 * s).fill({ color: 0x332211 });
  g.circle(6 * s, 5 * s, 3 * s).fill({ color: 0x443322 });
  g.circle(6 * s, 5 * s, 1 * s).fill({ color: 0x554433 });
  // Wheel spokes
  for (let i = 0; i < 4; i++) {
    const sa = i * (Math.PI / 4);
    g.moveTo(-6 * s + Math.cos(sa) * 1 * s, 5 * s + Math.sin(sa) * 1 * s)
      .lineTo(-6 * s + Math.cos(sa) * 3 * s, 5 * s + Math.sin(sa) * 3 * s)
      .stroke({ color: 0x554433, width: 0.5 * s });
    g.moveTo(6 * s + Math.cos(sa) * 1 * s, 5 * s + Math.sin(sa) * 1 * s)
      .lineTo(6 * s + Math.cos(sa) * 3 * s, 5 * s + Math.sin(sa) * 3 * s)
      .stroke({ color: 0x554433, width: 0.5 * s });
  }
  // Arm — reinforced
  g.moveTo(0, -4 * s).lineTo(-10 * s, -14 * s).stroke({ color: color + 0x111111, width: 3.5 * s });
  g.moveTo(0, -4 * s).lineTo(-10 * s, -14 * s).stroke({ color: color + 0x1a1a1a, width: 1.5 * s, alpha: 0.5 });
  // Metal bands on arm
  g.circle(-5 * s, -9 * s, 1.5 * s).fill({ color: 0x888888, alpha: 0.4 });
  // Ammunition bucket
  g.rect(-10 * s, -16 * s, 4 * s, 3 * s).fill({ color: 0x555544 });
  g.circle(-8 * s, -15 * s, 1.5 * s).fill({ color: 0x666655 }); // ammo ball
  // Crew hint (small figure)
  g.rect(4 * s, -6 * s, 3 * s, 5 * s).fill({ color: 0x444444, alpha: 0.4 });
  g.circle(5.5 * s, -8 * s, 1.5 * s).fill({ color: 0x555555, alpha: 0.4 });
}

function _drawMageTower(g: Graphics, s: number, time: number): void {
  // Ground shadow
  g.ellipse(0, 6 * s, 10 * s, 3 * s).fill({ color: 0x000000, alpha: 0.1 });
  // Tower body — stone texture
  g.rect(-6 * s, -16 * s, 12 * s, 20 * s).fill({ color: 0x334466 });
  // Stone block lines
  for (let row = 0; row < 5; row++) {
    const ry = -16 * s + row * 4 * s;
    g.moveTo(-6 * s, ry).lineTo(6 * s, ry).stroke({ color: 0x2a3a55, width: 0.5 * s, alpha: 0.3 });
    // Offset blocks
    const offset = row % 2 === 0 ? 0 : 3 * s;
    g.moveTo(offset, ry).lineTo(offset, ry + 4 * s).stroke({ color: 0x2a3a55, width: 0.5 * s, alpha: 0.2 });
  }
  // Tower base (wider)
  g.rect(-7 * s, 2 * s, 14 * s, 2 * s).fill({ color: 0x2a3a55 });
  // Roof — with shingle detail
  g.moveTo(-8 * s, -16 * s).lineTo(0, -24 * s).lineTo(8 * s, -16 * s).fill({ color: 0x4455aa });
  g.moveTo(-6 * s, -18 * s).lineTo(0, -23 * s).lineTo(6 * s, -18 * s).fill({ color: 0x4d5ebb, alpha: 0.3 });
  // Roof edge
  g.moveTo(-8 * s, -16 * s).lineTo(8 * s, -16 * s).stroke({ color: 0x556699, width: 1 * s });
  // Orb on top — pulsating with magic rings
  const orbGlow = 0.6 + Math.sin(time * 4) * 0.3;
  g.circle(0, -25 * s, 7 * s).fill({ color: 0x6699ff, alpha: 0.08 });
  g.circle(0, -25 * s, 5 * s).fill({ color: 0x6699ff, alpha: 0.12 + orbGlow * 0.05 });
  g.circle(0, -25 * s, 3 * s).fill({ color: 0x6699ff, alpha: orbGlow });
  g.circle(0, -25 * s, 1.5 * s).fill({ color: 0xaaccff, alpha: 0.8 });
  // Magic ring around orb
  g.circle(0, -25 * s, 5 * s + Math.sin(time * 6) * s).stroke({ color: 0x88bbff, width: 0.8 * s, alpha: 0.3 });
  // Window — glowing with curtain
  g.circle(0, -10 * s, 2.5 * s).fill({ color: 0x332200 });
  g.circle(0, -10 * s, 2 * s).fill({ color: 0xffdd44, alpha: 0.8 });
  g.circle(0, -10 * s, 1 * s).fill({ color: 0xffeedd, alpha: 0.4 });
  // Second window
  g.circle(0, -4 * s, 1.5 * s).fill({ color: 0x332200 });
  g.circle(0, -4 * s, 1.2 * s).fill({ color: 0xffdd44, alpha: 0.5 });
  // Door
  g.rect(-2 * s, 0, 4 * s, 4 * s).fill({ color: 0x443322 });
  g.rect(-2 * s, 0, 4 * s, 0.5 * s).fill({ color: 0x554433, alpha: 0.5 }); // lintel
  // Mage silhouette in window
  g.circle(0, -10.5 * s, 1 * s).fill({ color: 0x332200, alpha: 0.5 });
}

function _drawBoss(g: Graphics, enemy: DragoonEnemy, time: number): void {
  const s = enemy.size;

  switch (enemy.type) {
    case DragoonEnemyType.BOSS_DRAKE: {
      const wing = Math.sin(time * 3.5) * 15 * s;
      const wing2 = Math.sin(time * 3.5 + 0.4) * 12 * s;
      // Fire aura — pulsating
      g.circle(0, 0, 35 * s).fill({ color: 0xff4400, alpha: 0.03 + Math.sin(time * 4) * 0.015 });
      g.circle(0, 0, 28 * s).fill({ color: 0xff2200, alpha: 0.04 + Math.sin(time * 5) * 0.02 });
      // Massive dragon body with scale texture
      g.ellipse(0, 0, 22 * s, 12 * s).fill({ color: 0x881100 });
      g.ellipse(0, 4 * s, 18 * s, 8 * s).fill({ color: 0xaa2200, alpha: 0.5 });
      // Scale pattern
      for (let si = 0; si < 6; si++) {
        const sx = -8 * s + si * 4 * s;
        const sy = -2 * s + Math.abs(si - 3) * s;
        g.ellipse(sx, sy, 3 * s, 2 * s).fill({ color: 0x992200, alpha: 0.2 });
      }
      // Belly plates (lighter)
      g.ellipse(0, 6 * s, 14 * s, 5 * s).fill({ color: 0xcc6633, alpha: 0.2 });
      // Wings — massive, with membrane detail
      g.moveTo(-10 * s, -6 * s).lineTo(-40 * s, -25 * s + wing).lineTo(-35 * s, 0).fill({ color: 0x660800 });
      g.moveTo(-35 * s, 0).lineTo(-45 * s, -18 * s + wing2).lineTo(-40 * s, 5 * s).fill({ color: 0x550600, alpha: 0.7 });
      // Wing bone
      g.moveTo(-10 * s, -6 * s).lineTo(-38 * s, -23 * s + wing * 0.9).stroke({ color: 0x771000, width: 2 * s, alpha: 0.5 });
      g.moveTo(10 * s, -6 * s).lineTo(40 * s, -25 * s + wing).lineTo(35 * s, 0).fill({ color: 0x660800 });
      g.moveTo(35 * s, 0).lineTo(45 * s, -18 * s + wing2).lineTo(40 * s, 5 * s).fill({ color: 0x550600, alpha: 0.7 });
      g.moveTo(10 * s, -6 * s).lineTo(38 * s, -23 * s + wing * 0.9).stroke({ color: 0x771000, width: 2 * s, alpha: 0.5 });
      // Wing claws
      g.circle(-40 * s, -24 * s + wing, 2 * s).fill({ color: 0x443300 });
      g.circle(40 * s, -24 * s + wing, 2 * s).fill({ color: 0x443300 });
      // Neck
      g.moveTo(-10 * s, -4 * s).lineTo(-18 * s, -6 * s).lineTo(-14 * s, 2 * s).fill({ color: 0x881100, alpha: 0.8 });
      // Head — elongated, fierce
      g.ellipse(-20 * s, -6 * s, 9 * s, 6 * s).fill({ color: 0x991100 });
      // Jaw
      g.ellipse(-22 * s, -3 * s, 7 * s, 3 * s).fill({ color: 0x881000, alpha: 0.7 });
      // Teeth
      for (let ti = 0; ti < 5; ti++) {
        const tx = -26 * s + ti * 2.5 * s;
        g.moveTo(tx, -4 * s).lineTo(tx + 0.5 * s, -1 * s).lineTo(tx + 1 * s, -4 * s).fill({ color: 0xffeedd, alpha: 0.6 });
      }
      // Horns — curved, ridged
      g.moveTo(-22 * s, -10 * s).lineTo(-24 * s, -15 * s).lineTo(-27 * s, -20 * s).stroke({ color: 0x553300, width: 3 * s });
      g.moveTo(-27 * s, -20 * s).lineTo(-28 * s, -21 * s).stroke({ color: 0x664411, width: 2 * s });
      g.moveTo(-18 * s, -10 * s).lineTo(-16 * s, -15 * s).lineTo(-13 * s, -20 * s).stroke({ color: 0x553300, width: 3 * s });
      g.moveTo(-13 * s, -20 * s).lineTo(-12 * s, -21 * s).stroke({ color: 0x664411, width: 2 * s });
      // Brow ridges
      g.moveTo(-26 * s, -8 * s).lineTo(-22 * s, -10 * s).lineTo(-18 * s, -8 * s).stroke({ color: 0x771000, width: 2 * s, alpha: 0.5 });
      // Fire eyes — with slit pupils
      g.circle(-24 * s, -7 * s, 3 * s).fill({ color: 0x441100 });
      g.circle(-24 * s, -7 * s, 2.5 * s).fill({ color: 0xff4400 });
      g.ellipse(-24 * s, -7 * s, 1 * s, 2 * s).fill({ color: 0x220000 });
      g.circle(-18 * s, -7 * s, 3 * s).fill({ color: 0x441100 });
      g.circle(-18 * s, -7 * s, 2.5 * s).fill({ color: 0xff4400 });
      g.ellipse(-18 * s, -7 * s, 1 * s, 2 * s).fill({ color: 0x220000 });
      // Nostrils with smoke
      g.circle(-27 * s, -5 * s, 1 * s).fill({ color: 0x550500 });
      g.circle(-28 * s, -6 * s, 2 * s).fill({ color: 0x666666, alpha: 0.1 + Math.sin(time * 3) * 0.05 });
      // Tail — segmented with spines
      const tailWave = Math.sin(time * 2.5) * 4 * s;
      g.moveTo(20 * s, 6 * s).lineTo(30 * s, 9 * s + tailWave).lineTo(38 * s, 10 * s + tailWave * 0.5)
        .lineTo(44 * s, 8 * s).lineTo(40 * s, 5 * s).lineTo(34 * s, 4 * s).fill({ color: 0x770a00 });
      // Tail spines
      for (let ti = 0; ti < 3; ti++) {
        const tsx = 24 * s + ti * 7 * s;
        const tsy = 6 * s + tailWave * (0.3 + ti * 0.2);
        g.moveTo(tsx, tsy).lineTo(tsx + 1 * s, tsy - 5 * s).lineTo(tsx + 2 * s, tsy).fill({ color: 0x553300, alpha: 0.7 });
      }
      // Tail tip
      g.moveTo(42 * s, 6 * s).lineTo(48 * s, 8 * s).lineTo(46 * s, 4 * s).fill({ color: 0x881100 });
      // Legs
      g.moveTo(-6 * s, 8 * s).lineTo(-10 * s, 16 * s).stroke({ color: 0x771000, width: 3 * s });
      g.moveTo(6 * s, 8 * s).lineTo(10 * s, 16 * s).stroke({ color: 0x771000, width: 3 * s });
      // Claws
      g.moveTo(-10 * s, 16 * s).lineTo(-14 * s, 18 * s).stroke({ color: 0x443300, width: 1.5 * s });
      g.moveTo(-10 * s, 16 * s).lineTo(-8 * s, 19 * s).stroke({ color: 0x443300, width: 1.5 * s });
      g.moveTo(10 * s, 16 * s).lineTo(14 * s, 18 * s).stroke({ color: 0x443300, width: 1.5 * s });
      g.moveTo(10 * s, 16 * s).lineTo(8 * s, 19 * s).stroke({ color: 0x443300, width: 1.5 * s });
      break;
    }

    case DragoonEnemyType.BOSS_CHIMERA: {
      // Lion body + goat head + serpent tail
      g.ellipse(0, 0, 20 * s, 14 * s).fill({ color: 0x553300 });
      // Lion head
      g.circle(-18 * s, -6 * s, 8 * s).fill({ color: 0x886633 });
      // Mane
      g.circle(-18 * s, -6 * s, 11 * s).fill({ color: 0xaa7733, alpha: 0.4 });
      g.circle(-21 * s, -8 * s, 2 * s).fill({ color: 0xff8800 }); // eye
      // Goat head (on back)
      g.circle(0, -14 * s, 5 * s).fill({ color: 0x999988 });
      g.moveTo(-2 * s, -18 * s).lineTo(-5 * s, -24 * s).stroke({ color: 0x666655, width: 2 }); // horn
      g.moveTo(2 * s, -18 * s).lineTo(5 * s, -24 * s).stroke({ color: 0x666655, width: 2 });
      // Serpent tail
      const tailWave = Math.sin(time * 3) * 5 * s;
      g.moveTo(18 * s, 0).lineTo(30 * s, tailWave).lineTo(38 * s, -4 * s + tailWave * 0.5).stroke({ color: 0x225522, width: 4 * s });
      g.circle(38 * s, -4 * s + tailWave * 0.5, 3 * s).fill({ color: 0x228822 });
      g.circle(39 * s, -5 * s + tailWave * 0.5, 1 * s).fill({ color: 0xff0000 }); // snake eye
      // Wings
      const wing = Math.sin(time * 4) * 10 * s;
      g.moveTo(-8 * s, -8 * s).lineTo(-28 * s, -22 * s + wing).lineTo(-20 * s, -4 * s).fill({ color: 0x442200, alpha: 0.8 });
      g.moveTo(8 * s, -8 * s).lineTo(28 * s, -22 * s + wing).lineTo(20 * s, -4 * s).fill({ color: 0x442200, alpha: 0.8 });
      break;
    }

    case DragoonEnemyType.BOSS_LICH_KING: {
      // Floating robed skeleton with crown
      g.ellipse(0, 4 * s, 14 * s, 18 * s).fill({ color: 0x110033 });
      // Shoulders
      g.ellipse(0, -8 * s, 18 * s, 6 * s).fill({ color: 0x220044 });
      // Head (skull)
      g.circle(0, -16 * s, 7 * s).fill({ color: 0xccbbaa });
      g.circle(0, -16 * s, 6 * s).fill({ color: 0xddccbb });
      // Eye sockets
      g.circle(-3 * s, -17 * s, 2.5 * s).fill({ color: 0x000000 });
      g.circle(3 * s, -17 * s, 2.5 * s).fill({ color: 0x000000 });
      // Soul fire eyes
      g.circle(-3 * s, -17 * s, 1.5 * s).fill({ color: 0x9900ff, alpha: 0.6 + Math.sin(time * 5) * 0.3 });
      g.circle(3 * s, -17 * s, 1.5 * s).fill({ color: 0x9900ff, alpha: 0.6 + Math.sin(time * 5) * 0.3 });
      // Crown
      g.rect(-6 * s, -22 * s, 12 * s, 3 * s).fill({ color: 0x443366 });
      for (let i = -2; i <= 2; i++) {
        g.rect(i * 2.5 * s - 1 * s, -25 * s, 2 * s, 4 * s).fill({ color: 0x553388 });
      }
      // Staff
      g.moveTo(12 * s, -12 * s).lineTo(12 * s, 20 * s).stroke({ color: 0x332255, width: 3 * s });
      g.circle(12 * s, -14 * s, 4 * s).fill({ color: 0xcc00ff, alpha: 0.5 + Math.sin(time * 4) * 0.3 });
      // Soul particles
      for (let i = 0; i < 5; i++) {
        const a = time * 2 + i * 1.25;
        const r = (20 + Math.sin(a) * 5) * s;
        g.circle(Math.cos(a) * r, Math.sin(a) * r - 5 * s, 2 * s).fill({ color: 0x9900ff, alpha: 0.3 });
      }
      break;
    }

    case DragoonEnemyType.BOSS_STORM_TITAN: {
      // Storm aura — crackling energy field
      g.circle(0, 0, 36 * s).fill({ color: 0x00ccff, alpha: 0.03 + Math.sin(time * 3) * 0.015 });
      g.circle(0, -5 * s, 30 * s).fill({ color: 0x0088cc, alpha: 0.04 + Math.sin(time * 4) * 0.02 });
      // Cloud body — layered, semi-transparent
      g.ellipse(0, 0, 18 * s, 22 * s).fill({ color: 0x003344, alpha: 0.8 });
      g.ellipse(0, 4 * s, 16 * s, 18 * s).fill({ color: 0x004455, alpha: 0.3 });
      // Swirling cloud texture
      for (let ci = 0; ci < 5; ci++) {
        const ca = time * 0.5 + ci * 1.2;
        const cx = Math.sin(ca) * 6 * s;
        const cy = Math.cos(ca * 0.7) * 10 * s;
        g.ellipse(cx, cy, 8 * s, 4 * s).fill({ color: 0x005566, alpha: 0.15 });
      }
      // Chest — glowing storm core
      g.circle(0, -2 * s, 6 * s).fill({ color: 0x0088aa, alpha: 0.3 });
      g.circle(0, -2 * s, 3 * s).fill({ color: 0x00bbdd, alpha: 0.4 + Math.sin(time * 6) * 0.2 });
      // Head — with crown of lightning
      g.circle(0, -20 * s, 9 * s).fill({ color: 0x004455 });
      g.circle(0, -20 * s, 7 * s).fill({ color: 0x005566, alpha: 0.4 });
      // Crown of lightning bolts
      for (let i = 0; i < 5; i++) {
        const ca = i * (Math.PI / 2.5) - Math.PI / 2;
        const crownR = 10 * s;
        g.moveTo(Math.cos(ca) * 7 * s, -20 * s + Math.sin(ca) * 7 * s)
          .lineTo(Math.cos(ca) * crownR, -20 * s + Math.sin(ca) * crownR)
          .stroke({ color: 0x00ddff, width: 1.5 * s, alpha: 0.5 + Math.sin(time * 8 + i) * 0.3 });
      }
      // Lightning eyes — intense
      const eyeGlow = 0.7 + Math.sin(time * 6) * 0.3;
      g.circle(-3 * s, -21 * s, 4 * s).fill({ color: 0x00ccff, alpha: eyeGlow * 0.3 });
      g.circle(-3 * s, -21 * s, 3 * s).fill({ color: 0x00ccff, alpha: eyeGlow });
      g.circle(-3 * s, -21 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.6 });
      g.circle(3 * s, -21 * s, 4 * s).fill({ color: 0x00ccff, alpha: eyeGlow * 0.3 });
      g.circle(3 * s, -21 * s, 3 * s).fill({ color: 0x00ccff, alpha: eyeGlow });
      g.circle(3 * s, -21 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.6 });
      // Mouth — thunder roar
      g.ellipse(0, -16 * s, 3 * s, 2 * s).fill({ color: 0x002233, alpha: 0.5 });
      // Arms (cloud-like, massive) with fists
      g.ellipse(-22 * s, -5 * s, 12 * s, 7 * s).fill({ color: 0x003344 });
      g.ellipse(-22 * s, -5 * s, 9 * s, 5 * s).fill({ color: 0x004455, alpha: 0.4 });
      // Forearm
      g.ellipse(-30 * s, 2 * s, 7 * s, 5 * s).fill({ color: 0x003344, alpha: 0.8 });
      // Fist
      g.circle(-34 * s, 4 * s, 5 * s).fill({ color: 0x004455 });
      g.ellipse(22 * s, -5 * s, 12 * s, 7 * s).fill({ color: 0x003344 });
      g.ellipse(22 * s, -5 * s, 9 * s, 5 * s).fill({ color: 0x004455, alpha: 0.4 });
      g.ellipse(30 * s, 2 * s, 7 * s, 5 * s).fill({ color: 0x003344, alpha: 0.8 });
      g.circle(34 * s, 4 * s, 5 * s).fill({ color: 0x004455 });
      // Legs (cloud pillars)
      g.ellipse(-8 * s, 18 * s, 6 * s, 10 * s).fill({ color: 0x003344, alpha: 0.6 });
      g.ellipse(8 * s, 18 * s, 6 * s, 10 * s).fill({ color: 0x003344, alpha: 0.6 });
      // Lightning crackling — multiple bolts
      for (let li = 0; li < 3; li++) {
        const lx = Math.sin(time * 8 + li * 2) * 15 * s;
        const ly = Math.cos(time * 6 + li * 1.5) * 10 * s;
        const lAlpha = 0.4 + Math.sin(time * 12 + li) * 0.3;
        g.moveTo(lx, ly).lineTo(lx + 6 * s, ly - 8 * s).lineTo(lx + 3 * s, ly - 4 * s).lineTo(lx + 10 * s, ly - 14 * s)
          .stroke({ color: 0x00ccff, width: 1.5 * s, alpha: lAlpha });
        // Branch
        g.moveTo(lx + 6 * s, ly - 8 * s).lineTo(lx + 12 * s, ly - 6 * s)
          .stroke({ color: 0x88eeff, width: 1 * s, alpha: lAlpha * 0.5 });
      }
      // Rain/storm particles around
      for (let i = 0; i < 6; i++) {
        const ra = time * 4 + i * 1;
        const rr = (25 + Math.sin(ra * 2) * 5) * s;
        g.moveTo(Math.cos(ra) * rr, Math.sin(ra) * rr)
          .lineTo(Math.cos(ra) * rr - 1 * s, Math.sin(ra) * rr + 3 * s)
          .stroke({ color: 0x88ddff, width: 0.8 * s, alpha: 0.3 });
      }
      break;
    }

    case DragoonEnemyType.BOSS_VOID_SERPENT: {
      // Cosmic void aura
      g.circle(0, 0, 40 * s).fill({ color: 0xff00ff, alpha: 0.02 + Math.sin(time * 2) * 0.01 });
      g.circle(0, 0, 30 * s).fill({ color: 0x440044, alpha: 0.04 });
      // Cosmic serpent made of void — more segments, with connecting tissue
      const segments = 10;
      // Draw segments back to front
      for (let i = segments - 1; i >= 0; i--) {
        const a = time * 1.5 + i * 0.4;
        const sx = Math.sin(a) * 12 * s + i * 4 * s;
        const sy = Math.cos(a * 1.3) * 8 * s;
        const segSize = (segments - i) * 1.4 * s + 3 * s;
        // Void glow per segment
        g.circle(sx, sy, segSize * 2).fill({ color: 0xff00ff, alpha: 0.03 });
        // Segment body
        g.circle(sx, sy, segSize).fill({ color: i === 0 ? 0x330033 : 0x0a000a });
        // Segment inner detail — cosmic swirl
        g.circle(sx, sy, segSize * 0.7).fill({ color: 0x1a001a, alpha: 0.5 });
        // Connecting line to next segment
        if (i < segments - 1) {
          const na = time * 1.5 + (i + 1) * 0.4;
          const nx = Math.sin(na) * 12 * s + (i + 1) * 4 * s;
          const ny = Math.cos(na * 1.3) * 8 * s;
          g.moveTo(sx, sy).lineTo(nx, ny).stroke({ color: 0x220022, width: segSize * 0.8, alpha: 0.5 });
        }
        // Spines on segments
        if (i > 0 && i < segments - 1 && i % 2 === 0) {
          const spineA = a + Math.PI / 2;
          g.moveTo(sx, sy)
            .lineTo(sx + Math.cos(spineA) * segSize * 2, sy + Math.sin(spineA) * segSize * 2)
            .stroke({ color: 0x440044, width: 1 * s, alpha: 0.4 });
        }
      }
      // Head (first segment) — detailed
      const hx = Math.sin(time * 1.5) * 12 * s;
      const hy = Math.cos(time * 1.5 * 1.3) * 8 * s;
      g.circle(hx, hy, 9 * s).fill({ color: 0x330033 });
      g.circle(hx, hy, 7 * s).fill({ color: 0x440044, alpha: 0.4 });
      // Crown/horns
      g.moveTo(hx - 5 * s, hy - 6 * s).lineTo(hx - 7 * s, hy - 14 * s).stroke({ color: 0x660066, width: 2 * s });
      g.moveTo(hx + 5 * s, hy - 6 * s).lineTo(hx + 7 * s, hy - 14 * s).stroke({ color: 0x660066, width: 2 * s });
      g.circle(hx - 7 * s, hy - 14 * s, 1.5 * s).fill({ color: 0xff00ff, alpha: 0.5 });
      g.circle(hx + 7 * s, hy - 14 * s, 1.5 * s).fill({ color: 0xff00ff, alpha: 0.5 });
      // Void eyes — with concentric rings
      const veyeGlow = 0.6 + Math.sin(time * 5) * 0.3;
      g.circle(hx - 3 * s, hy - 3 * s, 4 * s).fill({ color: 0xff00ff, alpha: veyeGlow * 0.2 });
      g.circle(hx - 3 * s, hy - 3 * s, 3 * s).fill({ color: 0xff00ff, alpha: veyeGlow });
      g.circle(hx - 3 * s, hy - 3 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.5 });
      g.circle(hx + 3 * s, hy - 3 * s, 4 * s).fill({ color: 0xff00ff, alpha: veyeGlow * 0.2 });
      g.circle(hx + 3 * s, hy - 3 * s, 3 * s).fill({ color: 0xff00ff, alpha: veyeGlow });
      g.circle(hx + 3 * s, hy - 3 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.5 });
      // Third eye (forehead)
      g.circle(hx, hy - 6 * s, 2 * s).fill({ color: 0xcc00cc, alpha: 0.4 + Math.sin(time * 3) * 0.2 });
      // Void maw — with teeth
      g.circle(hx, hy + 4 * s, 5 * s).fill({ color: 0x000000 });
      g.circle(hx, hy + 4 * s, 4 * s).fill({ color: 0x110011, alpha: 0.5 });
      // Teeth around maw
      for (let ti = 0; ti < 6; ti++) {
        const ta = ti * (Math.PI / 3) + Math.PI;
        g.moveTo(hx + Math.cos(ta) * 4 * s, hy + 4 * s + Math.sin(ta) * 4 * s)
          .lineTo(hx + Math.cos(ta) * 2 * s, hy + 4 * s + Math.sin(ta) * 2 * s)
          .stroke({ color: 0x660066, width: 1.5 * s, alpha: 0.6 });
      }
      // Cosmic particles — orbiting debris
      for (let i = 0; i < 10; i++) {
        const pa = time * 3 + i * 0.63;
        const pr = (25 + Math.sin(pa * 2) * 8) * s;
        g.circle(Math.cos(pa) * pr, Math.sin(pa) * pr, (1 + Math.sin(pa * 3) * 0.5) * s).fill({ color: 0xff00ff, alpha: 0.35 });
        // Particle trail
        g.circle(Math.cos(pa - 0.2) * pr * 0.97, Math.sin(pa - 0.2) * pr * 0.97, 0.7 * s).fill({ color: 0xaa00aa, alpha: 0.15 });
      }
      // Void energy tendrils
      for (let i = 0; i < 4; i++) {
        const ta = time * 1.5 + i * Math.PI / 2;
        const tr = 20 * s;
        g.moveTo(hx, hy)
          .lineTo(hx + Math.cos(ta) * tr, hy + Math.sin(ta) * tr)
          .stroke({ color: 0x880088, width: 1 * s, alpha: 0.15 + Math.sin(time * 4 + i) * 0.08 });
      }
      break;
    }

    default:
      g.circle(0, 0, 12 * s).fill({ color: enemy.color });
  }
}

function _getBossName(type: DragoonEnemyType): string {
  switch (type) {
    case DragoonEnemyType.BOSS_DRAKE: return "Ignis the Fire Drake";
    case DragoonEnemyType.BOSS_CHIMERA: return "The Chimera of Dread";
    case DragoonEnemyType.BOSS_LICH_KING: return "Mordrath the Lich King";
    case DragoonEnemyType.BOSS_STORM_TITAN: return "Thalassor, Storm Titan";
    case DragoonEnemyType.BOSS_VOID_SERPENT: return "Nyx, the Void Serpent";
    default: return "Unknown";
  }
}
