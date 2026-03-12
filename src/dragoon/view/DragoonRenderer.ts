// ---------------------------------------------------------------------------
// Panzer Dragoon mode — main renderer
// Draws: parallax sky, scrolling ground, eagle + Arthur, enemies, projectiles
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { DragoonState, DragoonEnemy } from "../state/DragoonState";
import { DragoonEnemyType } from "../state/DragoonState";

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
  private _clouds: { x: number; y: number; w: number; h: number; speed: number; color: number; alpha: number }[] = [];
  // Star data
  private _stars: { x: number; y: number; size: number; twinkleSpeed: number; phase: number }[] = [];
  // Ground features (trees, mountains)
  private _groundFeatures: { x: number; type: string; height: number; color: number; layer: number }[] = [];

  // Enemy view cache
  private _enemyViews = new Map<number, { gfx: Graphics; hpBar: Graphics; nameText: Text | null }>();
  // Projectile view cache
  private _projViews = new Map<number, Graphics>();

  // Eagle animation
  private _eagleTime = 0;
  private _eagleGfx = new Graphics();
  private _arthurGfx = new Graphics();
  private _wandGlowGfx = new Graphics();

  init(sw: number, sh: number): void {
    this.worldLayer.removeChildren();

    // Build layer hierarchy
    this.worldLayer.addChild(this._skyBg);
    this.worldLayer.addChild(this._starField);
    this.worldLayer.addChild(this._sunGfx);
    this.worldLayer.addChild(this._cloudContainer);
    this.worldLayer.addChild(this._groundContainer);
    this._groundContainer.addChild(this._groundFar);
    this._groundContainer.addChild(this._groundMid);
    this._groundContainer.addChild(this._groundNear);
    this.worldLayer.addChild(this._enemyContainer);
    this.worldLayer.addChild(this._projectileContainer);
    this.worldLayer.addChild(this._playerContainer);

    // Draw static sky gradient
    this._drawSkyGradient(sw, sh);

    // Generate stars
    this._generateStars(sw, sh);

    // Draw sun/moon
    this._drawSun(sw, sh);

    // Generate clouds
    this._generateClouds(sw, sh);

    // Generate ground features
    this._generateGroundFeatures(sw);

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

    // Multi-band gradient
    const bands = [
      { y: 0, h: sh * 0.25, color: SKY_TOP },
      { y: sh * 0.25, h: sh * 0.25, color: SKY_MID },
      { y: sh * 0.5, h: sh * 0.2, color: SKY_LOW },
      { y: sh * 0.7, h: sh * 0.08, color: HORIZON },
    ];

    for (const band of bands) {
      g.rect(0, band.y, sw, band.h).fill({ color: band.color });
    }

    // Horizon glow
    g.rect(0, sh * 0.72, sw, sh * 0.06).fill({ color: 0xff8844, alpha: 0.3 });
    g.rect(0, sh * 0.74, sw, sh * 0.04).fill({ color: 0xffaa55, alpha: 0.15 });
  }

  private _generateStars(sw: number, sh: number): void {
    this._stars = [];
    for (let i = 0; i < 120; i++) {
      this._stars.push({
        x: Math.random() * sw,
        y: Math.random() * sh * 0.6,
        size: 0.5 + Math.random() * 2,
        twinkleSpeed: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _drawStars(time: number): void {
    const g = this._starField;
    g.clear();
    for (const star of this._stars) {
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(time * star.twinkleSpeed + star.phase));
      const colors = [0xffffff, 0xaaccff, 0xffddaa, 0xddddff];
      const color = colors[Math.floor(star.phase * 2) % colors.length];
      g.circle(star.x, star.y, star.size).fill({ color, alpha });
      // Glow for bigger stars
      if (star.size > 1.2) {
        g.circle(star.x, star.y, star.size * 3).fill({ color, alpha: alpha * 0.1 });
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
    for (let i = 0; i < 18; i++) {
      const layerIdx = i % 3;
      this._clouds.push({
        x: Math.random() * sw * 1.5,
        y: sh * 0.05 + Math.random() * sh * 0.55,
        w: 80 + Math.random() * 200,
        h: 20 + Math.random() * 40,
        speed: 8 + layerIdx * 12 + Math.random() * 10,
        color: CLOUD_COLORS[layerIdx],
        alpha: 0.15 + layerIdx * 0.08,
      });
    }
  }

  private _drawClouds(sw: number, dt: number): void {
    this._cloudContainer.removeChildren();
    const g = new Graphics();
    for (const c of this._clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < -50) c.x = sw + 50 + Math.random() * 200;

      // Draw cloud as overlapping ellipses
      const cx = c.x + c.w * 0.5;
      const cy = c.y;
      g.ellipse(cx, cy, c.w * 0.5, c.h * 0.5).fill({ color: c.color, alpha: c.alpha });
      g.ellipse(cx - c.w * 0.2, cy - c.h * 0.1, c.w * 0.35, c.h * 0.4).fill({ color: c.color, alpha: c.alpha * 0.8 });
      g.ellipse(cx + c.w * 0.15, cy + c.h * 0.05, c.w * 0.3, c.h * 0.35).fill({ color: c.color, alpha: c.alpha * 0.7 });
    }
    this._cloudContainer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Ground (scrolling landscape below)
  // ---------------------------------------------------------------------------

  private _generateGroundFeatures(_sw: number): void {
    this._groundFeatures = [];
    // Far mountains
    for (let i = 0; i < 20; i++) {
      this._groundFeatures.push({
        x: i * 120 + Math.random() * 60,
        type: "mountain",
        height: 30 + Math.random() * 50,
        color: 0x1a2a1a + Math.floor(Math.random() * 0x101010),
        layer: 0,
      });
    }
    // Mid trees
    for (let i = 0; i < 40; i++) {
      this._groundFeatures.push({
        x: i * 60 + Math.random() * 30,
        type: "tree",
        height: 15 + Math.random() * 25,
        color: 0x224422 + Math.floor(Math.random() * 0x002200),
        layer: 1,
      });
    }
    // Near features (larger trees, rocks)
    for (let i = 0; i < 25; i++) {
      this._groundFeatures.push({
        x: i * 80 + Math.random() * 40,
        type: Math.random() < 0.3 ? "rock" : "tree",
        height: 20 + Math.random() * 35,
        color: Math.random() < 0.3 ? 0x444444 : 0x0a1a08,
        layer: 2,
      });
    }
  }

  private _drawGround(state: DragoonState, dt: number): void {
    const sw = state.screenW;
    const sh = state.screenH;
    const groundY = sh * 0.78;
    const groundH = sh - groundY;

    state.groundOffset += state.scrollSpeed * dt;

    // Far layer
    this._groundFar.clear();
    this._groundFar.rect(0, groundY, sw, groundH * 0.4).fill({ color: GROUND_FAR });
    // Mountains
    for (const f of this._groundFeatures.filter(f => f.layer === 0)) {
      const x = ((f.x - state.groundOffset * 0.3) % (sw + 200)) - 100;
      if (x < -150 || x > sw + 50) continue;
      const g = this._groundFar;
      // Triangle mountain
      g.moveTo(x - f.height * 1.2, groundY + groundH * 0.3)
        .lineTo(x, groundY + groundH * 0.3 - f.height)
        .lineTo(x + f.height * 1.2, groundY + groundH * 0.3)
        .fill({ color: f.color, alpha: 0.7 });
      // Snow cap
      if (f.height > 50) {
        g.moveTo(x - f.height * 0.3, groundY + groundH * 0.3 - f.height * 0.7)
          .lineTo(x, groundY + groundH * 0.3 - f.height)
          .lineTo(x + f.height * 0.3, groundY + groundH * 0.3 - f.height * 0.7)
          .fill({ color: 0x667788, alpha: 0.5 });
      }
    }

    // Mid layer
    this._groundMid.clear();
    this._groundMid.rect(0, groundY + groundH * 0.3, sw, groundH * 0.35).fill({ color: GROUND_MID });
    for (const f of this._groundFeatures.filter(f => f.layer === 1)) {
      const x = ((f.x - state.groundOffset * 0.6) % (sw + 200)) - 100;
      if (x < -50 || x > sw + 50) continue;
      const g = this._groundMid;
      if (f.type === "tree") {
        // Tree trunk
        g.rect(x - 2, groundY + groundH * 0.55 - f.height, 4, f.height).fill({ color: 0x332211 });
        // Canopy
        g.circle(x, groundY + groundH * 0.55 - f.height, f.height * 0.5).fill({ color: f.color, alpha: 0.8 });
      }
    }

    // Near layer
    this._groundNear.clear();
    this._groundNear.rect(0, groundY + groundH * 0.6, sw, groundH * 0.4).fill({ color: GROUND_NEAR });
    // Road/path
    this._groundNear.rect(0, groundY + groundH * 0.65, sw, 6).fill({ color: 0x443322, alpha: 0.4 });

    for (const f of this._groundFeatures.filter(f => f.layer === 2)) {
      const x = ((f.x - state.groundOffset) % (sw + 200)) - 100;
      if (x < -60 || x > sw + 60) continue;
      const g = this._groundNear;
      if (f.type === "tree") {
        g.rect(x - 3, groundY + groundH * 0.85 - f.height, 6, f.height).fill({ color: 0x221100 });
        g.circle(x, groundY + groundH * 0.85 - f.height, f.height * 0.6).fill({ color: f.color });
        g.circle(x - f.height * 0.3, groundY + groundH * 0.85 - f.height * 0.8, f.height * 0.35).fill({ color: f.color, alpha: 0.8 });
      } else {
        // Rock
        g.ellipse(x, groundY + groundH * 0.85, f.height * 0.8, f.height * 0.4).fill({ color: f.color });
        g.ellipse(x, groundY + groundH * 0.85 - f.height * 0.1, f.height * 0.6, f.height * 0.3).fill({ color: f.color + 0x111111 });
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

    // --- EAGLE ---
    const eg = this._eagleGfx;
    eg.clear();
    const wingFlap = Math.sin(this._eagleTime * 6) * 12; // wing animation
    const bobY = Math.sin(this._eagleTime * 2.5) * 4;    // gentle bob

    // Eagle body (white/cream)
    eg.ellipse(0, bobY, 28, 14).fill({ color: 0xf0ead0 });
    // Body shading
    eg.ellipse(0, bobY + 3, 24, 10).fill({ color: 0xd8d0b8, alpha: 0.5 });

    // Wings
    const wingColor = 0xf5f0e0;
    const wingTipColor = 0xccccaa;
    // Left wing (upper)
    eg.moveTo(-10, bobY - 5)
      .lineTo(-45, bobY - 20 + wingFlap)
      .lineTo(-55, bobY - 15 + wingFlap * 0.7)
      .lineTo(-40, bobY - 5)
      .fill({ color: wingColor });
    // Left wing feather tips
    eg.moveTo(-45, bobY - 20 + wingFlap)
      .lineTo(-60, bobY - 18 + wingFlap * 0.8)
      .lineTo(-55, bobY - 15 + wingFlap * 0.7)
      .fill({ color: wingTipColor });
    // Right wing (lower)
    eg.moveTo(10, bobY - 5)
      .lineTo(45, bobY - 20 + wingFlap)
      .lineTo(55, bobY - 15 + wingFlap * 0.7)
      .lineTo(40, bobY - 5)
      .fill({ color: wingColor });
    // Right wing feather tips
    eg.moveTo(45, bobY - 20 + wingFlap)
      .lineTo(60, bobY - 18 + wingFlap * 0.8)
      .lineTo(55, bobY - 15 + wingFlap * 0.7)
      .fill({ color: wingTipColor });

    // Tail feathers
    eg.moveTo(-20, bobY + 8)
      .lineTo(-38, bobY + 16)
      .lineTo(-32, bobY + 10)
      .fill({ color: 0xe8e0c8 });
    eg.moveTo(-22, bobY + 10)
      .lineTo(-42, bobY + 20)
      .lineTo(-35, bobY + 13)
      .fill({ color: 0xddd8c0 });

    // Head
    eg.circle(24, bobY - 8, 9).fill({ color: 0xfaf5e8 });
    // Beak (golden)
    eg.moveTo(32, bobY - 9)
      .lineTo(40, bobY - 8)
      .lineTo(32, bobY - 6)
      .fill({ color: 0xddaa33 });
    // Eye
    eg.circle(28, bobY - 10, 2).fill({ color: 0x221100 });
    eg.circle(28.5, bobY - 10.5, 0.8).fill({ color: 0xffffff });

    // Talons
    eg.moveTo(-5, bobY + 12)
      .lineTo(-8, bobY + 22)
      .lineTo(-3, bobY + 18)
      .fill({ color: 0xccaa44 });
    eg.moveTo(5, bobY + 12)
      .lineTo(8, bobY + 22)
      .lineTo(3, bobY + 18)
      .fill({ color: 0xccaa44 });

    // --- ARTHUR (riding on top) ---
    const ag = this._arthurGfx;
    ag.clear();
    const ay = bobY - 18;

    // Legs straddling eagle
    ag.rect(-8, ay + 8, 5, 10).fill({ color: 0x443322 }); // left leg
    ag.rect(3, ay + 8, 5, 10).fill({ color: 0x443322 });  // right leg

    // Torso (blue tunic)
    ag.rect(-7, ay - 4, 14, 14).fill({ color: 0x2244aa });
    // Belt
    ag.rect(-8, ay + 6, 16, 3).fill({ color: 0x886633 });
    ag.rect(-2, ay + 5, 4, 5).fill({ color: 0xccaa44 }); // buckle

    // Cape (flowing behind)
    const capeWave = Math.sin(this._eagleTime * 3) * 3;
    ag.moveTo(-5, ay - 2)
      .lineTo(-20, ay + 10 + capeWave)
      .lineTo(-15, ay + 15 + capeWave * 0.5)
      .lineTo(-3, ay + 8)
      .fill({ color: 0xcc2222 });
    ag.moveTo(-3, ay - 2)
      .lineTo(-22, ay + 12 + capeWave * 0.7)
      .lineTo(-18, ay + 18 + capeWave * 0.3)
      .lineTo(-2, ay + 10)
      .fill({ color: 0xaa1111, alpha: 0.7 });

    // Arms
    ag.rect(7, ay, 4, 8).fill({ color: 0x2244aa }); // right arm (wand arm)

    // Head
    ag.circle(0, ay - 10, 6).fill({ color: 0xffccaa }); // face
    // Hair
    ag.ellipse(0, ay - 14, 7, 4).fill({ color: 0x553311 });
    // Crown (small golden)
    ag.rect(-5, ay - 17, 10, 3).fill({ color: 0xddaa22 });
    ag.rect(-4, ay - 19, 2, 3).fill({ color: 0xddaa22 });
    ag.rect(2, ay - 19, 2, 3).fill({ color: 0xddaa22 });
    ag.rect(-1, ay - 20, 2, 4).fill({ color: 0xddaa22 });
    // Crown gem
    ag.circle(0, ay - 18, 1.5).fill({ color: 0xff2244 });

    // Eyes
    ag.circle(-2, ay - 10, 1).fill({ color: 0x224488 });
    ag.circle(2, ay - 10, 1).fill({ color: 0x224488 });

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
      _drawEnemyShape(gfx, enemy, state.gameTime);

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
    this._drawStars(state.gameTime);
    this._drawClouds(state.screenW, dt);
    this._drawGround(state, dt);
    this.drawPlayer(state, dt);
    this.drawEnemies(state, dt);
    this.drawProjectiles(state, dt);
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
  // Body
  g.ellipse(0, 0, 10 * s, 5 * s).fill({ color: 0x1a1a2e });
  // Wings
  g.moveTo(-5 * s, 0).lineTo(-18 * s, -6 * s + wing).lineTo(-12 * s, 0).fill({ color: 0x111122 });
  g.moveTo(5 * s, 0).lineTo(18 * s, -6 * s + wing).lineTo(12 * s, 0).fill({ color: 0x111122 });
  // Beak
  g.moveTo(-10 * s, -1 * s).lineTo(-15 * s, 0).lineTo(-10 * s, 1 * s).fill({ color: 0x884400 });
  // Eye
  g.circle(-6 * s, -2 * s, 1.5 * s).fill({ color: 0xff0000 });
}

function _drawBat(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 12) * 10 * s;
  // Body
  g.ellipse(0, 0, 6 * s, 4 * s).fill({ color: 0x2d1b4e });
  // Wings (bat-like, angular)
  g.moveTo(-4 * s, -2 * s).lineTo(-20 * s, -8 * s + wing).lineTo(-22 * s, 2 * s + wing * 0.5).lineTo(-8 * s, 2 * s).fill({ color: 0x3a2255 });
  g.moveTo(4 * s, -2 * s).lineTo(20 * s, -8 * s + wing).lineTo(22 * s, 2 * s + wing * 0.5).lineTo(8 * s, 2 * s).fill({ color: 0x3a2255 });
  // Eyes
  g.circle(-2 * s, -1 * s, 1.5 * s).fill({ color: 0xffcc00 });
  g.circle(2 * s, -1 * s, 1.5 * s).fill({ color: 0xffcc00 });
  // Fangs
  g.moveTo(-1 * s, 2 * s).lineTo(0, 4 * s).lineTo(1 * s, 2 * s).fill({ color: 0xffffff });
}

function _drawWyvern(g: Graphics, s: number, time: number, color: number): void {
  const wing = Math.sin(time * 5) * 12 * s;
  // Body
  g.ellipse(0, 0, 16 * s, 8 * s).fill({ color });
  g.ellipse(0, 2 * s, 14 * s, 6 * s).fill({ color: color + 0x111111, alpha: 0.5 });
  // Wings
  g.moveTo(-8 * s, -4 * s).lineTo(-30 * s, -15 * s + wing).lineTo(-25 * s, -2 * s).fill({ color: color - 0x111111 });
  g.moveTo(8 * s, -4 * s).lineTo(30 * s, -15 * s + wing).lineTo(25 * s, -2 * s).fill({ color: color - 0x111111 });
  // Head (long neck forward)
  g.ellipse(-14 * s, -4 * s, 5 * s, 4 * s).fill({ color });
  // Eyes
  g.circle(-16 * s, -5 * s, 1.5 * s).fill({ color: 0xff4400 });
  // Fire breath hint
  g.circle(-20 * s, -3 * s, 2 * s).fill({ color: 0xff6600, alpha: 0.3 + Math.sin(time * 6) * 0.2 });
  // Tail
  g.moveTo(14 * s, 4 * s).lineTo(28 * s, 8 * s).lineTo(24 * s, 3 * s).fill({ color: color - 0x111111 });
}

function _drawFireSprite(g: Graphics, s: number, time: number): void {
  const flicker = Math.sin(time * 15) * 2 * s;
  // Core flame
  g.circle(0, 0, 6 * s + flicker).fill({ color: 0xff4400, alpha: 0.8 });
  g.circle(0, 0, 4 * s + flicker * 0.5).fill({ color: 0xffaa00 });
  g.circle(0, -1 * s, 2 * s).fill({ color: 0xffdd66 });
  // Flame tendrils
  for (let i = 0; i < 4; i++) {
    const a = time * 3 + i * 1.5;
    const r = (8 + Math.sin(a * 2) * 3) * s;
    g.circle(Math.cos(a) * r, Math.sin(a) * r, 2 * s).fill({ color: 0xff6600, alpha: 0.4 });
  }
  // Eyes (within flame)
  g.circle(-2 * s, -1 * s, 1 * s).fill({ color: 0xffffff });
  g.circle(2 * s, -1 * s, 1 * s).fill({ color: 0xffffff });
}

function _drawHawk(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 8) * 10 * s;
  // Body (sleek)
  g.ellipse(0, 0, 12 * s, 5 * s).fill({ color: 0x3344aa });
  // Wings
  g.moveTo(-5 * s, -2 * s).lineTo(-22 * s, -10 * s + wing).lineTo(-16 * s, 0).fill({ color: 0x2233aa });
  g.moveTo(5 * s, -2 * s).lineTo(22 * s, -10 * s + wing).lineTo(16 * s, 0).fill({ color: 0x2233aa });
  // Lightning aura
  g.circle(0, 0, 14 * s).fill({ color: 0x66bbff, alpha: 0.1 + Math.sin(time * 10) * 0.05 });
  // Eyes
  g.circle(-8 * s, -2 * s, 1.5 * s).fill({ color: 0x00ffff });
  // Beak
  g.moveTo(-12 * s, -1 * s).lineTo(-16 * s, 0).lineTo(-12 * s, 1 * s).fill({ color: 0xdddd00 });
}

function _drawFloatingEye(g: Graphics, s: number, time: number): void {
  // Outer membrane
  g.circle(0, 0, 14 * s).fill({ color: 0x990044, alpha: 0.6 });
  g.circle(0, 0, 12 * s).fill({ color: 0xbb0055 });
  // Iris
  g.circle(0, 0, 8 * s).fill({ color: 0xff0066 });
  // Pupil
  const px = Math.sin(time * 1.5) * 2 * s;
  const py = Math.cos(time * 1.2) * 2 * s;
  g.circle(px, py, 4 * s).fill({ color: 0x110011 });
  g.circle(px + 1.5 * s, py - 1.5 * s, 1.5 * s).fill({ color: 0xffffff, alpha: 0.6 });
  // Tentacles
  for (let i = 0; i < 6; i++) {
    const a = time * 2 + i * 1.05;
    const tentLen = 18 * s;
    g.moveTo(Math.cos(a) * 12 * s, Math.sin(a) * 12 * s)
      .lineTo(Math.cos(a + 0.3) * tentLen, Math.sin(a + 0.3) * tentLen)
      .stroke({ color: 0x880033, width: 2 * s, alpha: 0.6 });
  }
}

function _drawDarkAngel(g: Graphics, s: number, time: number): void {
  const wing = Math.sin(time * 4) * 8 * s;
  // Dark wings (large, tattered)
  g.moveTo(-6 * s, -5 * s).lineTo(-30 * s, -20 * s + wing).lineTo(-35 * s, -5 * s).lineTo(-20 * s, 5 * s).fill({ color: 0x1a0033 });
  g.moveTo(6 * s, -5 * s).lineTo(30 * s, -20 * s + wing).lineTo(35 * s, -5 * s).lineTo(20 * s, 5 * s).fill({ color: 0x1a0033 });
  // Body (robed figure)
  g.ellipse(0, 0, 8 * s, 12 * s).fill({ color: 0x220033 });
  // Head
  g.circle(0, -10 * s, 5 * s).fill({ color: 0x332244 });
  // Glowing eyes
  g.circle(-2 * s, -11 * s, 2 * s).fill({ color: 0xaa00ff });
  g.circle(2 * s, -11 * s, 2 * s).fill({ color: 0xaa00ff });
  // Aura
  g.circle(0, 0, 16 * s).fill({ color: 0xaa00ff, alpha: 0.06 + Math.sin(time * 3) * 0.03 });
  // Staff
  g.moveTo(8 * s, -8 * s).lineTo(8 * s, 14 * s).stroke({ color: 0x553377, width: 2 * s });
  g.circle(8 * s, -10 * s, 3 * s).fill({ color: 0xcc44ff, alpha: 0.5 + Math.sin(time * 5) * 0.3 });
}

function _drawGroundWeapon(g: Graphics, s: number, color: number): void {
  // Base
  g.rect(-8 * s, -4 * s, 16 * s, 8 * s).fill({ color });
  // Wheels
  g.circle(-6 * s, 5 * s, 3 * s).fill({ color: 0x443322 });
  g.circle(6 * s, 5 * s, 3 * s).fill({ color: 0x443322 });
  // Arm
  g.moveTo(0, -4 * s).lineTo(-10 * s, -14 * s).stroke({ color: color + 0x111111, width: 3 * s });
}

function _drawMageTower(g: Graphics, s: number, time: number): void {
  // Tower body
  g.rect(-6 * s, -16 * s, 12 * s, 20 * s).fill({ color: 0x334466 });
  // Roof
  g.moveTo(-8 * s, -16 * s).lineTo(0, -24 * s).lineTo(8 * s, -16 * s).fill({ color: 0x4455aa });
  // Orb on top
  g.circle(0, -25 * s, 3 * s).fill({ color: 0x6699ff, alpha: 0.6 + Math.sin(time * 4) * 0.3 });
  g.circle(0, -25 * s, 5 * s).fill({ color: 0x6699ff, alpha: 0.15 });
  // Window
  g.circle(0, -10 * s, 2 * s).fill({ color: 0xffdd44, alpha: 0.8 });
}

function _drawBoss(g: Graphics, enemy: DragoonEnemy, time: number): void {
  const s = enemy.size;

  switch (enemy.type) {
    case DragoonEnemyType.BOSS_DRAKE: {
      const wing = Math.sin(time * 3.5) * 15 * s;
      // Massive dragon body
      g.ellipse(0, 0, 22 * s, 12 * s).fill({ color: 0x881100 });
      g.ellipse(0, 4 * s, 18 * s, 8 * s).fill({ color: 0xaa2200, alpha: 0.5 });
      // Wings
      g.moveTo(-10 * s, -6 * s).lineTo(-40 * s, -25 * s + wing).lineTo(-35 * s, 0).fill({ color: 0x660800 });
      g.moveTo(10 * s, -6 * s).lineTo(40 * s, -25 * s + wing).lineTo(35 * s, 0).fill({ color: 0x660800 });
      // Head
      g.ellipse(-20 * s, -6 * s, 8 * s, 6 * s).fill({ color: 0x991100 });
      // Horns
      g.moveTo(-22 * s, -10 * s).lineTo(-26 * s, -18 * s).stroke({ color: 0x553300, width: 3 });
      g.moveTo(-18 * s, -10 * s).lineTo(-14 * s, -18 * s).stroke({ color: 0x553300, width: 3 });
      // Fire eyes
      g.circle(-24 * s, -7 * s, 2.5 * s).fill({ color: 0xff4400 });
      g.circle(-18 * s, -7 * s, 2.5 * s).fill({ color: 0xff4400 });
      // Tail
      g.moveTo(20 * s, 6 * s).lineTo(38 * s, 12 * s).lineTo(42 * s, 8 * s).lineTo(36 * s, 4 * s).fill({ color: 0x770a00 });
      // Fire aura
      g.circle(0, 0, 30 * s).fill({ color: 0xff4400, alpha: 0.04 + Math.sin(time * 4) * 0.02 });
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
      // Massive humanoid made of clouds and lightning
      g.ellipse(0, 0, 18 * s, 22 * s).fill({ color: 0x003344, alpha: 0.8 });
      // Head
      g.circle(0, -20 * s, 8 * s).fill({ color: 0x004455 });
      // Lightning eyes
      g.circle(-3 * s, -21 * s, 3 * s).fill({ color: 0x00ccff });
      g.circle(3 * s, -21 * s, 3 * s).fill({ color: 0x00ccff });
      // Arms (cloud-like)
      g.ellipse(-22 * s, -5 * s, 10 * s, 6 * s).fill({ color: 0x003344 });
      g.ellipse(22 * s, -5 * s, 10 * s, 6 * s).fill({ color: 0x003344 });
      // Lightning crackling
      const lx = Math.sin(time * 8) * 15 * s;
      const ly = Math.cos(time * 6) * 10 * s;
      g.moveTo(lx, ly).lineTo(lx + 8 * s, ly - 12 * s).lineTo(lx + 4 * s, ly - 6 * s).lineTo(lx + 12 * s, ly - 18 * s)
        .stroke({ color: 0x00ccff, width: 2, alpha: 0.6 + Math.sin(time * 12) * 0.3 });
      // Aura
      g.circle(0, 0, 30 * s).fill({ color: 0x00ccff, alpha: 0.04 + Math.sin(time * 3) * 0.02 });
      break;
    }

    case DragoonEnemyType.BOSS_VOID_SERPENT: {
      // Cosmic serpent made of void
      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const a = time * 1.5 + i * 0.4;
        const sx = Math.sin(a) * 12 * s + i * 4 * s;
        const sy = Math.cos(a * 1.3) * 8 * s;
        const segSize = (segments - i) * 1.5 * s + 4 * s;
        g.circle(sx, sy, segSize).fill({ color: i === 0 ? 0x220022 : 0x0a0a0a });
        g.circle(sx, sy, segSize * 1.5).fill({ color: 0xff00ff, alpha: 0.04 });
      }
      // Head (first segment)
      const hx = Math.sin(time * 1.5) * 12 * s;
      const hy = Math.cos(time * 1.5 * 1.3) * 8 * s;
      g.circle(hx, hy, 8 * s).fill({ color: 0x330033 });
      // Void eyes
      g.circle(hx - 3 * s, hy - 2 * s, 3 * s).fill({ color: 0xff00ff });
      g.circle(hx + 3 * s, hy - 2 * s, 3 * s).fill({ color: 0xff00ff });
      // Void maw
      g.circle(hx, hy + 3 * s, 4 * s).fill({ color: 0x000000 });
      g.circle(hx, hy + 3 * s, 3 * s).fill({ color: 0x220022, alpha: 0.5 });
      // Cosmic particles
      for (let i = 0; i < 8; i++) {
        const pa = time * 3 + i * 0.8;
        const pr = (25 + Math.sin(pa * 2) * 8) * s;
        g.circle(Math.cos(pa) * pr, Math.sin(pa) * pr, 1.5 * s).fill({ color: 0xff00ff, alpha: 0.4 });
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
