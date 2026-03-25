// ---------------------------------------------------------------------------
// Wyrm — PixiJS Renderer (v4)
// Enhanced visuals: atmospheric background, ambient particles, improved wyrm
// rendering, better fire/torch/trail effects, polished UI screens.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { WyrmPhase, PickupKind } from "../types";
import type { WyrmState, WyrmMeta } from "../types";
import { WYRM_BALANCE as B, getWyrmColors, getLetterGrade } from "../config/WyrmBalance";
import type { WyrmUpgrades } from "../types";
import { DIR_DX, DIR_DY, distanceToObstacle } from "../systems/WyrmGameSystem";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 56, fill: 0xc9a227,
  fontWeight: "bold", letterSpacing: 8,
  dropShadow: { color: 0x000000, distance: 5, angle: Math.PI / 4, blur: 8, alpha: 0.8 },
});
const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 17, fill: 0x8fbc8f, fontStyle: "italic",
  letterSpacing: 2,
});
const STYLE_CONTROLS = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x667766, lineHeight: 20,
});
const STYLE_META = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0x888866, lineHeight: 22,
});
const STYLE_HUD = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xdaa520, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 3, alpha: 0.6 },
});
const STYLE_HUD_SMALL = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x8fbc8f,
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 2, alpha: 0.4 },
});
const STYLE_HUD_RIGHT = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xcc88ff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_DEATH_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 52, fill: 0xff4444, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 4, angle: Math.PI / 4, blur: 6, alpha: 0.8 },
});
const STYLE_DEATH_STAT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 16, fill: 0xcccccc, lineHeight: 26,
});
const STYLE_DEATH_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: 0xc9a227, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_PAUSE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 40, fill: 0xdaa520, fontWeight: "bold",
  letterSpacing: 6,
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 5, alpha: 0.6 },
});
const STYLE_START_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 22, fill: 0xc9a227, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_FLOAT = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 3, alpha: 0.9 },
});

// ---------------------------------------------------------------------------
// Ambient particle (floating dust motes / embers)
// ---------------------------------------------------------------------------

interface AmbientMote {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; color: number; phase: number;
}

// ---------------------------------------------------------------------------
// Floating text pool — reuses PixiJS Text objects
// ---------------------------------------------------------------------------

const FLOAT_POOL_SIZE = 16;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class WyrmRenderer {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudSmallText = new Text({ text: "", style: STYLE_HUD_SMALL });
  private _hudRightText = new Text({ text: "", style: STYLE_HUD_RIGHT });
  private _titleText = new Text({ text: "WYRM", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Control the dragon. Devour everything.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _metaText = new Text({ text: "", style: STYLE_META });
  private _startPrompt = new Text({ text: "Press SPACE to begin", style: STYLE_START_PROMPT });
  private _deathTitle = new Text({ text: "SLAIN", style: STYLE_DEATH_TITLE });
  private _deathStats = new Text({ text: "", style: STYLE_DEATH_STAT });
  private _deathPrompt = new Text({ text: "SPACE to retry  |  ESC to exit", style: STYLE_DEATH_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });

  // Floating text pool
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  // Shop text labels (4 upgrade slots)
  private _shopTexts: Text[] = [];

  private _sw = 0;
  private _sh = 0;
  private _cellSize = 0;
  private _offsetX = 0;
  private _offsetY = 0;
  private _fireFlicker = 0;

  // Ambient floating particles
  private _ambientMotes: AmbientMote[] = [];
  private _ambientInitialized = false;

  // Star field (ceiling details)
  private _stars: { x: number; y: number; size: number; twinklePhase: number; brightness: number }[] = [];
  private _starsInitialized = false;

  // Fog wisps
  private _fogWisps: { x: number; y: number; width: number; phase: number; speed: number; alpha: number }[] = [];
  private _fogInitialized = false;

  // ---------------------------------------------------------------------------
  // Build / Destroy
  // ---------------------------------------------------------------------------

  build(sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    this.container.addChild(this._hudText);
    this.container.addChild(this._hudSmallText);
    this.container.addChild(this._hudRightText);
    this.container.addChild(this._titleText);
    this.container.addChild(this._subtitleText);
    this.container.addChild(this._controlsText);
    this.container.addChild(this._metaText);
    this.container.addChild(this._startPrompt);
    this.container.addChild(this._deathTitle);
    this.container.addChild(this._deathStats);
    this.container.addChild(this._deathPrompt);
    this.container.addChild(this._pauseText);

    this._hudText.position.set(10, 8);
    this._hudSmallText.position.set(10, 28);

    // Create shop text labels
    for (let i = 0; i < 12; i++) {
      const st = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcccccc }) });
      st.visible = false;
      this._shopTexts.push(st);
      this.container.addChild(st);
    }

    // Create floating text pool
    for (let i = 0; i < FLOAT_POOL_SIZE; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5);
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
    this._uiGfx.destroy();
  }

  // ---------------------------------------------------------------------------
  // Ambient motes — lazy init
  // ---------------------------------------------------------------------------

  private _initStars(): void {
    if (this._starsInitialized) return;
    this._starsInitialized = true;
    const count = 70;
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        size: Math.random() * 1.8 + 0.2,
        twinklePhase: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.18 + 0.03,
      });
    }
  }

  private _drawStars(g: Graphics, t: number): void {
    this._initStars();
    for (const s of this._stars) {
      // Dual-frequency twinkle for more organic feel
      const twinkle = s.brightness * (0.5 + Math.sin(t * 1.5 + s.twinklePhase) * 0.35 + Math.sin(t * 3.7 + s.twinklePhase * 1.3) * 0.15);
      if (twinkle > 0.01) {
        // Warm/cool color variation
        const starColor = s.twinklePhase > Math.PI ? 0xccccee : 0xddccbb;
        // Outer soft glow
        if (s.size > 0.8) {
          g.circle(s.x, s.y, s.size * 2.5).fill({ color: starColor, alpha: twinkle * 0.2 });
        }
        // Core
        g.circle(s.x, s.y, s.size).fill({ color: starColor, alpha: twinkle });
        // Bright center point
        if (twinkle > 0.05) {
          g.circle(s.x, s.y, s.size * 0.4).fill({ color: 0xffffff, alpha: twinkle * 0.6 });
        }
        // Cross sparkle on brighter stars (longer rays)
        if (s.size > 1.0 && twinkle > 0.06) {
          const rayLen = s.size * 2.5 + twinkle * 8;
          g.setStrokeStyle({ width: 0.5, color: starColor, alpha: twinkle * 0.5 });
          g.moveTo(s.x - rayLen, s.y).lineTo(s.x + rayLen, s.y).stroke();
          g.moveTo(s.x, s.y - rayLen).lineTo(s.x, s.y + rayLen).stroke();
          // Diagonal rays for brightest stars
          if (s.size > 1.4 && twinkle > 0.1) {
            const diagLen = rayLen * 0.6;
            g.setStrokeStyle({ width: 0.4, color: starColor, alpha: twinkle * 0.3 });
            g.moveTo(s.x - diagLen, s.y - diagLen).lineTo(s.x + diagLen, s.y + diagLen).stroke();
            g.moveTo(s.x + diagLen, s.y - diagLen).lineTo(s.x - diagLen, s.y + diagLen).stroke();
          }
        }
      }
    }
  }

  private _initFogWisps(): void {
    if (this._fogInitialized) return;
    this._fogInitialized = true;
    for (let i = 0; i < 12; i++) {
      this._fogWisps.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        width: 100 + Math.random() * 200,
        phase: Math.random() * Math.PI * 2,
        speed: 3 + Math.random() * 8,
        alpha: 0.012 + Math.random() * 0.025,
      });
    }
  }

  private _drawFogWisps(g: Graphics, t: number): void {
    this._initFogWisps();
    for (const f of this._fogWisps) {
      const fx = f.x + Math.sin(t * 0.3 + f.phase) * 40 + f.speed * t * 0.5;
      const fy = f.y + Math.cos(t * 0.2 + f.phase) * 20;
      const wrappedX = ((fx % (this._sw + f.width)) + this._sw + f.width) % (this._sw + f.width) - f.width / 2;
      const wrappedY = ((fy % (this._sh + 60)) + this._sh + 60) % (this._sh + 60) - 30;
      const breathe = f.alpha * (0.6 + Math.sin(t * 0.5 + f.phase) * 0.4);
      // Volumetric fog wisp — layered overlapping circles with varying density
      for (let s = 0; s < 7; s++) {
        const sx = wrappedX + s * f.width * 0.18;
        const sy = wrappedY + Math.sin(t * 0.4 + f.phase + s * 0.8) * 10;
        const layerR = 22 + s * 6 + Math.sin(t * 0.3 + s * 1.2) * 4;
        // Core fog layer
        g.circle(sx, sy, layerR).fill({ color: 0x334455, alpha: breathe * 0.8 });
        // Diffuse outer haze (volumetric suggestion)
        g.circle(sx + Math.sin(t * 0.2 + s) * 6, sy, layerR * 1.4).fill({ color: 0x283848, alpha: breathe * 0.3 });
      }
      // Fog edge feathering — soft circles at wisp edges
      const edgeX = wrappedX - f.width * 0.1;
      const edgeX2 = wrappedX + f.width * 1.3;
      g.circle(edgeX, wrappedY, 18).fill({ color: 0x2a3a4a, alpha: breathe * 0.4 });
      g.circle(edgeX2, wrappedY, 18).fill({ color: 0x2a3a4a, alpha: breathe * 0.4 });
    }
  }

  private _initAmbientMotes(): void {
    if (this._ambientInitialized) return;
    this._ambientInitialized = true;
    const count = 60;
    // Richer ember/dust palette: warm coals, hot embers, cool dust, ash
    const colors = [
      0x4a3a1a, 0x6a5a2a, 0x3a4a3a, 0x5a4a2a,  // dust/ash
      0xff5500, 0xff7722, 0xffaa33, 0xff3300,    // hot embers
      0xcc4400, 0xff8844, 0xffcc66,               // warm coals
      0x554433, 0x443322,                          // dark ash
    ];
    for (let i = 0; i < count; i++) {
      const isEmber = Math.random() < 0.4;
      this._ambientMotes.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        vx: (Math.random() - 0.5) * (isEmber ? 12 : 6),
        vy: -Math.random() * (isEmber ? 18 : 10) - 2,
        size: isEmber ? Math.random() * 2.5 + 0.8 : Math.random() * 1.8 + 0.3,
        alpha: isEmber ? Math.random() * 0.4 + 0.1 : Math.random() * 0.2 + 0.03,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _updateAndDrawAmbientMotes(g: Graphics, dt: number): void {
    this._initAmbientMotes();
    for (const m of this._ambientMotes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      // Turbulent sway (more organic movement)
      m.x += Math.sin(m.phase + m.y * 0.01) * 0.4;
      m.x += Math.cos(m.phase * 0.7 + m.x * 0.005) * 0.2;
      m.phase += dt * 0.6;

      // Wrap around
      if (m.y < -5) { m.y = this._sh + 5; m.x = Math.random() * this._sw; }
      if (m.x < -5) m.x = this._sw + 5;
      if (m.x > this._sw + 5) m.x = -5;

      const flicker = 0.6 + Math.sin(m.phase * 3) * 0.25 + Math.sin(m.phase * 7.3) * 0.15;
      const isHot = m.color >= 0xcc0000;
      // Outer glow for hot embers
      if (isHot && m.size > 1.0) {
        g.circle(m.x, m.y, m.size * 2.5).fill({ color: m.color, alpha: m.alpha * flicker * 0.15 });
      }
      // Main mote
      g.circle(m.x, m.y, m.size).fill({ color: m.color, alpha: m.alpha * flicker });
      // Bright hot core for embers
      if (isHot && m.alpha > 0.15) {
        g.circle(m.x, m.y, m.size * 0.4).fill({ color: 0xffee88, alpha: m.alpha * flicker * 0.5 });
      }
      // Ember trail (fading tail behind movement direction)
      if (isHot && m.size > 1.2) {
        const trailLen = 3;
        const tvx = -m.vx * 0.012;
        const tvy = -m.vy * 0.012;
        for (let tr = 1; tr <= trailLen; tr++) {
          const ta = m.alpha * flicker * (0.3 - tr * 0.08);
          if (ta > 0.01) {
            g.circle(m.x + tvx * tr, m.y + tvy * tr, m.size * (0.7 - tr * 0.15))
              .fill({ color: m.color, alpha: ta });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  render(state: WyrmState, sw: number, sh: number, meta: WyrmMeta): void {
    this._sw = sw;
    this._sh = sh;

    const margin = 8;
    const availW = sw - margin * 2;
    const availH = sh - margin * 2;
    const cellSize = Math.floor(Math.min(availW / state.cols, availH / state.rows));
    this._cellSize = cellSize;
    this._offsetX = Math.floor((sw - cellSize * state.cols) / 2);
    this._offsetY = Math.floor((sh - cellSize * state.rows) / 2);

    const g = this._gfx;
    g.clear();
    this._uiGfx.clear();

    // Screen shake with rotation for more impact
    let shakeX = 0, shakeY = 0;
    let shakeRot = 0;
    if (state.screenShake > 0) {
      const intensity = B.SHAKE_INTENSITY * (state.screenShake / B.SHAKE_DURATION);
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
      // Subtle rotation shake (radians) for more visceral feel
      shakeRot = (Math.random() - 0.5) * intensity * 0.003;
    }
    this._gfx.position.set(shakeX, shakeY);
    this._gfx.rotation = shakeRot;
    // Set pivot to screen center for rotation around center
    this._gfx.pivot.set(sw / 2, sh / 2);
    this._gfx.position.set(sw / 2 + shakeX, sh / 2 + shakeY);

    // Background with gradient effect (darker edges)
    this._drawBackground(g, state);
    this._drawStars(g, state.time);
    this._drawFogWisps(g, state.time);
    this._drawGrass(g, state);
    this._drawGrid(g, state);
    this._drawTrail(g, state);
    this._drawPoisonTiles(g, state);
    this._drawLavaTiles(g, state);
    this._drawWalls(g, state);
    this._drawTorches(g, state);
    this._drawPickups(g, state);
    this._drawKnights(g, state);
    this._drawArchers(g, state);
    this._drawProjectiles(g, state);
    if (state.boss && state.boss.alive) this._drawBoss(g, state);
    if (state.fireBreathTimer > 0) this._drawFireBreath(g, state);
    if (state.screenFlashTimer > 0 && state.screenFlashColor === B.COLOR_LIGHTNING) this._drawLightningArcs(g, state);
    this._drawWyrm(g, state);
    if (state.magnetBoostTimer > 0 && state.phase === WyrmPhase.PLAYING) this._drawMagnetRadius(g, state);
    this._drawPowerBars(g, state);
    this._drawLungeCooldown(g, state);
    this._drawDeathSegments(g, state);
    this._drawParticles(g, state);
    if (state.phase === WyrmPhase.PLAYING) this._drawSpeedLines(g, state);
    this._drawDangerWarning(g, state);
    if (state.slowMoTimer > 0) this._drawSlowMoVignette(g, state);
    if (state.wrathTimer > 0) this._drawWrathVignette(g, state);
    if (state.timeWarpTimer > 0) this._drawTimeWarpOverlay(g, state);

    // Ambient floating motes (embers/dust)
    this._updateAndDrawAmbientMotes(g, 1 / 60);

    // Screen flash with edge distortion effect
    if (state.screenFlashTimer > 0) {
      const flashRatio = state.screenFlashTimer / B.FLASH_DURATION;
      const alpha = 0.25 * flashRatio;
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha });

      // Chromatic aberration-like edge tint (color shifted strips at edges)
      if (flashRatio > 0.5) {
        const abAlpha = (flashRatio - 0.5) * 0.15;
        const abWidth = 6 + (flashRatio - 0.5) * 12; // wider aberration at peak
        // Red shift left edge, cyan shift right edge
        g.rect(0, 0, abWidth, sh).fill({ color: 0xff0000, alpha: abAlpha });
        g.rect(sw - abWidth, 0, abWidth, sh).fill({ color: 0x00ffff, alpha: abAlpha });
        g.rect(0, 0, sw, abWidth * 0.8).fill({ color: 0xff0000, alpha: abAlpha * 0.7 });
        g.rect(0, sh - abWidth * 0.8, sw, abWidth * 0.8).fill({ color: 0x00ffff, alpha: abAlpha * 0.7 });
        // Diagonal color fringe at corners
        g.circle(0, 0, abWidth * 4).fill({ color: 0xff0000, alpha: abAlpha * 0.3 });
        g.circle(sw, sh, abWidth * 4).fill({ color: 0x00ffff, alpha: abAlpha * 0.3 });
      }
    }

    // Death chromatic aberration flash (stronger, sustained)
    if (state.phase === WyrmPhase.DEAD && state.deathSegments.length > 0) {
      const deathElapsed = B.DEATH_SEGMENT_LIFETIME - state.deathSegments[0].life;
      if (deathElapsed < 0.8) {
        const deathFlash = (1.0 - deathElapsed / 0.8);
        const dabWidth = 10 + deathFlash * 15;
        const dabAlpha = deathFlash * 0.2;
        // Strong chromatic split
        g.rect(0, 0, dabWidth, sh).fill({ color: 0xff0000, alpha: dabAlpha });
        g.rect(sw - dabWidth, 0, dabWidth, sh).fill({ color: 0x00ffff, alpha: dabAlpha });
        g.rect(0, 0, sw, dabWidth).fill({ color: 0xff00ff, alpha: dabAlpha * 0.4 });
        g.rect(0, sh - dabWidth, sw, dabWidth).fill({ color: 0x00ff00, alpha: dabAlpha * 0.3 });
        // Full screen desaturation flash
        g.rect(0, 0, sw, sh).fill({ color: 0xffffff, alpha: dabAlpha * 0.3 });
      }
    }

    // Radial blur lines during lunge
    if (state.lungeFlash > 0) {
      const lungeRatio = state.lungeFlash / B.LUNGE_FLASH;
      const lineAlpha = lungeRatio * 0.08;
      const hx = state.body.length > 0 ? this._offsetX + state.body[0].x * cellSize + cellSize / 2 : sw / 2;
      const hy = state.body.length > 0 ? this._offsetY + state.body[0].y * cellSize + cellSize / 2 : sh / 2;
      for (let rl = 0; rl < 16; rl++) {
        const angle = rl * Math.PI * 2 / 16 + state.time * 2;
        const innerR = Math.min(sw, sh) * 0.15;
        const outerR = Math.min(sw, sh) * 0.6;
        g.setStrokeStyle({ width: 2 + lungeRatio * 3, color: 0xffffff, alpha: lineAlpha });
        g.moveTo(hx + Math.cos(angle) * innerR, hy + Math.sin(angle) * innerR)
          .lineTo(hx + Math.cos(angle) * outerR, hy + Math.sin(angle) * outerR).stroke();
      }
    }

    // UI layer (no shake)
    this._drawFloatingTexts(state);
    this._drawComboBar(state);
    this._drawComboBorder(state);
    this._drawSynergyIndicator(state);
    this._drawMinimap(state);
    this._drawHUD(state, meta);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawBlessingScreen(state);
    this._drawWrathMeter(state);
    this._drawTailWhipCooldown(state);
    this._drawDeathScreen(state, meta);

    this._fireFlicker += 0.15;
  }

  // ---------------------------------------------------------------------------
  // Background — atmospheric gradient with vignette
  // ---------------------------------------------------------------------------

  private _drawBackground(g: Graphics, _state: WyrmState): void {
    const sw = this._sw, sh = this._sh;
    // Base fill
    g.rect(-10, -10, sw + 20, sh + 20).fill(B.COLOR_BG);

    // Multi-layered vignette — progressive darkening for depth
    const vignetteW = sw * 0.38;
    const vignetteH = sh * 0.35;
    // Top — darker (dungeon ceiling)
    g.rect(0, 0, sw, vignetteH).fill({ color: 0x060612, alpha: 0.3 });
    g.rect(0, 0, sw, vignetteH * 0.5).fill({ color: 0x040410, alpha: 0.15 });
    // Bottom — ground shadow
    g.rect(0, sh - vignetteH, sw, vignetteH).fill({ color: 0x0a0a18, alpha: 0.22 });
    g.rect(0, sh - vignetteH * 0.4, sw, vignetteH * 0.4).fill({ color: 0x060612, alpha: 0.12 });
    // Left
    g.rect(0, 0, vignetteW, sh).fill({ color: 0x0a0a18, alpha: 0.18 });
    g.rect(0, 0, vignetteW * 0.5, sh).fill({ color: 0x060612, alpha: 0.1 });
    // Right
    g.rect(sw - vignetteW, 0, vignetteW, sh).fill({ color: 0x0a0a18, alpha: 0.18 });
    g.rect(sw - vignetteW * 0.5, 0, vignetteW * 0.5, sh).fill({ color: 0x060612, alpha: 0.1 });

    // Corner darkening (deep dungeon corners)
    const cornerR = Math.min(sw, sh) * 0.35;
    g.circle(0, 0, cornerR).fill({ color: 0x040408, alpha: 0.08 });
    g.circle(sw, 0, cornerR).fill({ color: 0x040408, alpha: 0.08 });
    g.circle(0, sh, cornerR).fill({ color: 0x040408, alpha: 0.06 });
    g.circle(sw, sh, cornerR).fill({ color: 0x040408, alpha: 0.06 });

    // Warm ambient glow at center (torchlight bloom)
    const cx = sw / 2, cy = sh / 2;
    g.circle(cx, cy, Math.min(sw, sh) * 0.55).fill({ color: 0x1a0e04, alpha: 0.05 });
    g.circle(cx, cy, Math.min(sw, sh) * 0.4).fill({ color: 0x2a1a08, alpha: 0.08 });
    g.circle(cx, cy, Math.min(sw, sh) * 0.25).fill({ color: 0x3a2210, alpha: 0.04 });

    // Subtle ambient light variation (simulates distant torch reflections)
    const t = _state.time;
    const ambPulse = 0.02 + Math.sin(t * 0.7) * 0.01;
    g.circle(cx + Math.sin(t * 0.3) * 40, cy + Math.cos(t * 0.4) * 30, Math.min(sw, sh) * 0.3)
      .fill({ color: 0x2a1808, alpha: ambPulse });
  }

  // ---------------------------------------------------------------------------
  // Grass — with variation
  // ---------------------------------------------------------------------------

  private _drawGrass(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const tuft of state.grassTufts) {
      const tx = ox + tuft.x * cs;
      const ty = oy + tuft.y * cs;
      const r = tuft.size * cs;
      // Ground patch (soft base)
      g.circle(tx, ty, r * 1.1).fill({ color: tuft.shade, alpha: 0.2 });
      // Grass blade strokes (3-5 angled lines)
      const bladeCount = 3 + Math.floor(tuft.size * 6);
      const seed = Math.floor(tuft.x * 17 + tuft.y * 31);
      g.setStrokeStyle({ width: 1, color: tuft.shade, alpha: 0.4, cap: "round" });
      for (let b = 0; b < bladeCount; b++) {
        const angle = -Math.PI / 2 + ((seed + b * 7) % 10 - 5) * 0.15;
        const bladeLen = r * (0.6 + (b % 3) * 0.3);
        const bx = tx + ((seed + b * 3) % 7 - 3) * r * 0.2;
        const by = ty + ((seed + b * 5) % 5 - 2) * r * 0.15;
        // Curved grass blades using quadratic curves for organic look
        const tipX = bx + Math.cos(angle) * bladeLen;
        const tipY = by + Math.sin(angle) * bladeLen;
        const sway = Math.sin(state.time * 1.5 + seed + b * 0.5) * bladeLen * 0.15;
        const cpX = (bx + tipX) * 0.5 + sway;
        const cpY = (by + tipY) * 0.5;
        g.moveTo(bx, by).quadraticCurveTo(cpX, cpY, tipX + sway * 0.5, tipY).stroke();
      }
    }

    // Occasional puddle reflections on ground tiles
    if (cs > 12) {
      for (let x = 2; x < state.cols - 2; x++) {
        for (let y = 2; y < state.rows - 2; y++) {
          const puddleSeed = x * 23 + y * 37;
          if (puddleSeed % 47 === 0) { // ~2% of tiles
            const px = ox + x * cs + cs * 0.5;
            const py = oy + y * cs + cs * 0.5;
            const pr = cs * 0.3 + (puddleSeed % 7) * 0.5;
            // Puddle base (dark reflective)
            g.circle(px, py, pr).fill({ color: 0x1a2a3a, alpha: 0.12 });
            // Reflection highlight (shimmering)
            const shimmer = 0.04 + Math.sin(state.time * 1.5 + puddleSeed) * 0.02;
            g.circle(px - pr * 0.2, py - pr * 0.15, pr * 0.4).fill({ color: 0x4488aa, alpha: shimmer });
            // Edge ring
            g.setStrokeStyle({ width: 0.5, color: 0x2a3a4a, alpha: 0.08 });
            g.circle(px, py, pr).stroke();
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Grid — subtle with intersection dots
  // ---------------------------------------------------------------------------

  private _drawGrid(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;

    // Stone floor tile pattern — varied stone with natural irregularity
    if (cs > 8) {
      for (let x = 1; x < state.cols - 1; x++) {
        for (let y = 1; y < state.rows - 1; y++) {
          // Multi-tone checkerboard with hash-based variation
          const hash = (x * 7 + y * 13) % 11;
          const shade = ((x + y) % 2 === 0)
            ? (hash < 4 ? 0x181828 : hash < 7 ? 0x1a1a2c : 0x161624)
            : (hash < 4 ? 0x1c1c30 : hash < 7 ? 0x1e1e34 : 0x1a1a2e);
          const tileAlpha = 0.16 + (hash % 5) * 0.012;
          g.rect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2).fill({ color: shade, alpha: tileAlpha });
          // Subtle wear/scuff marks on some tiles
          if (hash % 5 === 0 && cs > 12) {
            const scuffX = ox + x * cs + cs * 0.3;
            const scuffY = oy + y * cs + cs * 0.4;
            g.circle(scuffX, scuffY, cs * 0.12).fill({ color: 0x222238, alpha: 0.08 });
          }
          // Occasional darker crack line
          if (hash % 7 === 0 && cs > 10) {
            g.setStrokeStyle({ width: 0.5, color: 0x0e0e18, alpha: 0.1 });
            g.moveTo(ox + x * cs + cs * 0.2, oy + y * cs + cs * 0.6)
              .lineTo(ox + x * cs + cs * 0.8, oy + y * cs + cs * 0.5).stroke();
          }
        }
      }
    }

    // Grid lines (mortar between stones)
    g.setStrokeStyle({ width: 1, color: B.COLOR_GRID, alpha: 0.12 });
    for (let x = 0; x <= state.cols; x++) {
      g.moveTo(ox + x * cs, oy).lineTo(ox + x * cs, oy + state.rows * cs).stroke();
    }
    for (let y = 0; y <= state.rows; y++) {
      g.moveTo(ox, oy + y * cs).lineTo(ox + state.cols * cs, oy + y * cs).stroke();
    }

    // Corner nail/rivet dots at intersections
    if (cs > 12) {
      for (let x = 1; x < state.cols; x += 3) {
        for (let y = 1; y < state.rows; y += 3) {
          g.circle(ox + x * cs, oy + y * cs, 1.2).fill({ color: 0x2a3a5e, alpha: 0.18 });
          g.circle(ox + x * cs, oy + y * cs, 0.6).fill({ color: 0x3a4a6e, alpha: 0.25 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Trail — glowing ethereal trail
  // ---------------------------------------------------------------------------

  private _drawTrail(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const time = state.time;
    for (const t of state.trail) {
      const lifeRatio = t.life / t.maxLife;
      const cx = ox + t.x * cs + half;
      const cy = oy + t.y * cs + half;

      // Scorch mark on ground (persists longer, darkens the tile)
      const scorchAlpha = lifeRatio * 0.15 + (1 - lifeRatio) * 0.08; // lingers even as trail fades
      g.rect(ox + t.x * cs + 2, oy + t.y * cs + 2, cs - 4, cs - 4)
        .fill({ color: 0x1a0800, alpha: scorchAlpha });
      // Scorch crack pattern
      if (cs > 10) {
        const seed = t.x * 17 + t.y * 31;
        g.setStrokeStyle({ width: 0.6, color: 0x331100, alpha: scorchAlpha * 0.8 });
        g.moveTo(cx - half * 0.3, cy - half * 0.2)
          .lineTo(cx + half * 0.1 + (seed % 5), cy + half * 0.3).stroke();
        g.moveTo(cx + half * 0.2, cy - half * 0.3)
          .lineTo(cx - half * 0.1, cy + half * 0.2 + (seed % 4)).stroke();
      }

      // Temperature-based color gradient: hot (orange-white) to cool (dark red-brown)
      const hotColor = lifeRatio > 0.6 ? 0xff8833 : lifeRatio > 0.3 ? 0xcc4411 : 0x661100;
      const coolColor = 0x331100;

      // Outermost diffuse glow (atmospheric light spill)
      const outerGlow = lifeRatio * 0.08;
      g.circle(cx, cy, half * 1.3).fill({ color: hotColor, alpha: outerGlow });
      // Mid glow layer
      const midGlow = lifeRatio * 0.12;
      g.circle(cx, cy, half * 0.9).fill({ color: t.color, alpha: midGlow });
      // Core glow with enhanced pulse (double-frequency for organic throb)
      const pulse = 0.85 + Math.sin(time * 4 + t.x * 1.3 + t.y * 0.7) * 0.1 + Math.sin(time * 7.3 + t.x * 2.1) * 0.05;
      const coreAlpha = lifeRatio * 0.4 * pulse;
      g.circle(cx, cy, half * 0.45).fill({ color: t.color, alpha: coreAlpha });
      // Bright hot center (fresher trails glow white-hot)
      if (lifeRatio > 0.5) {
        const hotAlpha = (lifeRatio - 0.5) * 0.5;
        g.circle(cx, cy, half * 0.2).fill({ color: 0xffeecc, alpha: hotAlpha });
        g.circle(cx, cy, half * 0.08).fill({ color: 0xffffff, alpha: hotAlpha * 0.7 });
      }
      // Cool ember glow on older trails
      if (lifeRatio < 0.4 && lifeRatio > 0.05) {
        const coolPulse = 0.5 + Math.sin(time * 2 + t.x * 3 + t.y * 5) * 0.5;
        g.circle(cx, cy, half * 0.35).fill({ color: coolColor, alpha: lifeRatio * 0.3 * coolPulse });
      }

      // Rising ember particles from fresh trail segments
      if (lifeRatio > 0.5) {
        const emberCount = lifeRatio > 0.8 ? 3 : 2;
        for (let e = 0; e < emberCount; e++) {
          const ep = time * (5 + e * 1.8) + t.x * (e + 1) * 2.3 + t.y * (e + 1) * 1.7;
          const eLife = (ep % 1.8) / 1.8;
          const ex = cx + Math.sin(ep * 2.1 + e) * half * 0.4;
          const ey = cy - eLife * half * 1.2; // rising upward
          const eSize = (1.0 - eLife) * 1.5 + 0.3;
          const eAlpha = (1.0 - eLife) * (lifeRatio - 0.5) * 0.6;
          if (eAlpha > 0.02) {
            g.circle(ex, ey, eSize * 2).fill({ color: 0xff4400, alpha: eAlpha * 0.2 }); // ember glow
            g.circle(ex, ey, eSize).fill({ color: 0xffaa33, alpha: eAlpha }); // ember core
            if (eLife < 0.3) {
              g.circle(ex, ey, eSize * 0.4).fill({ color: 0xffee88, alpha: eAlpha * 0.6 }); // white-hot center
            }
          }
        }
      }

      // Shimmer particles on fresh trails
      if (lifeRatio > 0.7) {
        const shimA = time * 6 + t.x * 2.1 + t.y * 3.3;
        const shimR = half * 0.55;
        g.circle(cx + Math.cos(shimA) * shimR, cy + Math.sin(shimA) * shimR, 1.5)
          .fill({ color: 0xffffff, alpha: (lifeRatio - 0.7) * 0.35 });
        // Second shimmer at different phase
        const shimB = time * 4.3 + t.x * 3.7 + t.y * 1.9;
        g.circle(cx + Math.cos(shimB) * shimR * 0.7, cy + Math.sin(shimB) * shimR * 0.7, 1.0)
          .fill({ color: 0xffddaa, alpha: (lifeRatio - 0.7) * 0.25 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Walls — brick pattern with mortar and varied stone
  // ---------------------------------------------------------------------------

  private _drawWalls(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const w of state.walls) {
      const isBorder = w.x === 0 || w.x === state.cols - 1 || w.y === 0 || w.y === state.rows - 1;
      const wx = ox + w.x * cs;
      const wy = oy + w.y * cs;

      if (isBorder) {
        // Border walls — darker, more fortress-like with weathering
        const borderVar = ((w.x * 11 + w.y * 7) % 3);
        const borderColors = [0x2a1a0e, 0x261808, 0x2e1c10];
        g.rect(wx, wy, cs, cs).fill(borderColors[borderVar]);
        // Top bevel (light from above)
        g.rect(wx, wy, cs, 2.5).fill({ color: 0x4a3a28, alpha: 0.5 });
        // Left bevel
        g.rect(wx, wy, 2.5, cs).fill({ color: 0x3a2a18, alpha: 0.4 });
        // Bottom shadow (deeper)
        g.rect(wx, wy + cs - 2, cs, 2).fill({ color: 0x0a0804, alpha: 0.55 });
        // Right shadow
        g.rect(wx + cs - 1.5, wy, 1.5, cs).fill({ color: 0x0a0804, alpha: 0.3 });
        // Weathering/moss spots with vine tendrils
        if ((w.x * 3 + w.y * 13) % 7 === 0 && cs > 8) {
          g.circle(wx + cs * 0.3, wy + cs * 0.6, cs * 0.15).fill({ color: 0x223322, alpha: 0.12 });
          g.circle(wx + cs * 0.25, wy + cs * 0.55, cs * 0.1).fill({ color: 0x2a4a2a, alpha: 0.1 });
          // Vine tendril
          g.setStrokeStyle({ width: 1, color: 0x2a5a2a, alpha: 0.15, cap: "round" });
          g.moveTo(wx + cs * 0.3, wy + cs * 0.6)
            .quadraticCurveTo(wx + cs * 0.5, wy + cs * 0.8, wx + cs * 0.7, wy + cs * 0.75).stroke();
        }
        if ((w.x * 5 + w.y * 9) % 11 === 0 && cs > 10) {
          // Additional moss patch with leaves
          g.circle(wx + cs * 0.7, wy + cs * 0.3, cs * 0.12).fill({ color: 0x1a3a1a, alpha: 0.15 });
          g.circle(wx + cs * 0.75, wy + cs * 0.25, cs * 0.08).fill({ color: 0x2a5a2a, alpha: 0.1 });
          // Tiny leaf shapes
          g.moveTo(wx + cs * 0.65, wy + cs * 0.28)
            .lineTo(wx + cs * 0.7, wy + cs * 0.22)
            .lineTo(wx + cs * 0.75, wy + cs * 0.28)
            .closePath().fill({ color: 0x2a5a2a, alpha: 0.12 });
        }
        // Crenellation texture on top border
        if (w.y === 0 && cs > 10) {
          const notchW = cs / 3;
          g.rect(wx + notchW, wy, notchW, 3.5).fill({ color: 0x1a0e06, alpha: 0.5 });
          // Notch shadow
          g.rect(wx + notchW, wy + 3, notchW, 1).fill({ color: 0x000000, alpha: 0.15 });
        }
      } else {
        const isBreakable = state.breakableWalls.has(`${w.x},${w.y}`);
        // Interior walls — varied stone brick
        const colorVar = ((w.x * 7 + w.y * 13) % 3);
        const stoneColors = isBreakable
          ? [B.COLOR_WALL_BREAKABLE, 0x685840, 0x5a4a34]
          : [B.COLOR_WALL, 0x544030, 0x3e2e1e];
        g.rect(wx, wy, cs, cs).fill(stoneColors[colorVar]);

        // Top highlight (light from above)
        g.rect(wx, wy, cs, 2).fill({ color: B.COLOR_WALL_HIGHLIGHT, alpha: 0.55 });
        // Left highlight
        g.rect(wx, wy, 2, cs).fill({ color: B.COLOR_WALL_HIGHLIGHT, alpha: 0.3 });
        // Bottom shadow
        g.rect(wx, wy + cs - 1, cs, 1).fill({ color: 0x1a0e06, alpha: 0.5 });
        // Right shadow
        g.rect(wx + cs - 1, wy, 1, cs).fill({ color: 0x1a0e06, alpha: 0.3 });

        // Brick mortar lines
        if (cs > 8) {
          g.setStrokeStyle({ width: 1, color: 0x2a1a0a, alpha: 0.35 });
          g.moveTo(wx, wy + cs / 2).lineTo(wx + cs, wy + cs / 2).stroke();
          const vertOffset = (w.y % 2 === 0) ? cs / 2 : 0;
          if (vertOffset > 0) {
            g.moveTo(wx + vertOffset, wy).lineTo(wx + vertOffset, wy + cs / 2).stroke();
          }
          g.moveTo(wx + (vertOffset + cs / 2) % cs || cs / 2, wy + cs / 2)
            .lineTo(wx + (vertOffset + cs / 2) % cs || cs / 2, wy + cs).stroke();
        }

        // Breakable wall cracks — multiple branching fracture lines
        if (isBreakable && cs > 8) {
          // Main fracture (thick, prominent)
          g.setStrokeStyle({ width: 1.5, color: 0x8a7a5a, alpha: 0.55 });
          g.moveTo(wx + cs * 0.15, wy + cs * 0.25)
            .lineTo(wx + cs * 0.35, wy + cs * 0.4)
            .lineTo(wx + cs * 0.5, wy + cs * 0.5)
            .lineTo(wx + cs * 0.4, wy + cs * 0.75)
            .lineTo(wx + cs * 0.35, wy + cs * 0.9).stroke();
          // Secondary fracture branching off
          g.setStrokeStyle({ width: 1, color: 0x7a6a4a, alpha: 0.45 });
          g.moveTo(wx + cs * 0.5, wy + cs * 0.5)
            .lineTo(wx + cs * 0.7, wy + cs * 0.55)
            .lineTo(wx + cs * 0.85, wy + cs * 0.65).stroke();
          g.moveTo(wx + cs * 0.35, wy + cs * 0.4)
            .lineTo(wx + cs * 0.25, wy + cs * 0.15).stroke();
          // Tertiary fine cracks
          g.setStrokeStyle({ width: 0.6, color: 0x6a5a3a, alpha: 0.35 });
          g.moveTo(wx + cs * 0.6, wy + cs * 0.15)
            .lineTo(wx + cs * 0.65, wy + cs * 0.35)
            .lineTo(wx + cs * 0.7, wy + cs * 0.55).stroke();
          g.moveTo(wx + cs * 0.4, wy + cs * 0.75)
            .lineTo(wx + cs * 0.6, wy + cs * 0.8).stroke();
          // Crumble debris dots at crack intersections
          g.circle(wx + cs * 0.5, wy + cs * 0.5, 1.5).fill({ color: 0x9a8a6a, alpha: 0.3 });
          g.circle(wx + cs * 0.35, wy + cs * 0.4, 1.0).fill({ color: 0x8a7a5a, alpha: 0.25 });
          g.circle(wx + cs * 0.7, wy + cs * 0.55, 1.0).fill({ color: 0x8a7a5a, alpha: 0.2 });
          // Weakened glow indicator (subtle warning tint)
          g.rect(wx + 1, wy + 1, cs - 2, cs - 2).fill({ color: 0xaa8844, alpha: 0.04 });
        }

        // Moss/vine on some interior walls
        if (!isBreakable && (w.x * 7 + w.y * 11) % 13 === 0 && cs > 10) {
          g.circle(wx + cs * 0.8, wy + cs * 0.7, cs * 0.1).fill({ color: 0x223322, alpha: 0.1 });
          g.setStrokeStyle({ width: 0.8, color: 0x2a4a2a, alpha: 0.12, cap: "round" });
          g.moveTo(wx + cs * 0.8, wy + cs * 0.7)
            .quadraticCurveTo(wx + cs * 0.6, wy + cs * 0.9, wx + cs * 0.4, wy + cs * 0.85).stroke();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups — with shadow and squash/stretch
  // ---------------------------------------------------------------------------

  private _drawPickups(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;

    for (const p of state.pickups) {
      const drift = this._getPickupDrift(state, p.x, p.y);
      const cx = ox + p.x * cs + half + drift.dx;
      const cy = oy + p.y * cs + half + drift.dy;
      const bob = Math.sin(t * 3 + p.x * 0.7 + p.y * 1.1) * 2;

      // Spawn scale-in animation (bounce in during first 0.3s)
      let spawnScale = 1.0;
      if (p.age < 0.3) {
        const st = p.age / 0.3; // 0 to 1
        // Elastic overshoot: peaks at ~1.15 then settles to 1.0
        spawnScale = st < 0.5
          ? st * 2 * 1.2
          : 1.0 + (1.2 - 1.0) * Math.cos((st - 0.5) * Math.PI);
      }
      const r = half * 0.7 * spawnScale;

      if (p.age > B.PICKUP_DESPAWN_TIME - 3 && Math.sin(t * 10) > 0.3) continue;

      // Drop shadow (scales with spawn)
      g.circle(cx + 1, cy + half * 0.35 + 1, r * 0.6).fill({ color: 0x000000, alpha: 0.15 * spawnScale });

      // Spawn flash ring
      if (p.age < 0.2) {
        const flashAlpha = (1.0 - p.age / 0.2) * 0.3;
        g.circle(cx, cy + bob, r * 1.8).fill({ color: 0xffffff, alpha: flashAlpha });
      }

      // Anticipation glow — pickups near wyrm head get highlighted
      if (state.body.length > 0) {
        const head = state.body[0];
        const distToHead = Math.abs(p.x - head.x) + Math.abs(p.y - head.y);
        if (distToHead <= 3 && distToHead > 0) {
          const nearAlpha = (1.0 - distToHead / 4) * 0.12 + Math.sin(t * 5 + p.x) * 0.04;
          g.circle(cx, cy + bob, r * 1.5).fill({ color: 0xffffff, alpha: nearAlpha });
        }
      }

      switch (p.kind) {
        case PickupKind.SHEEP: {
          // Woolly body
          g.circle(cx, cy + bob, r).fill(B.COLOR_SHEEP);
          // Fluffy wool texture
          g.circle(cx - r * 0.25, cy + bob - r * 0.2, r * 0.35).fill({ color: 0xffffff, alpha: 0.3 });
          g.circle(cx + r * 0.2, cy + bob - r * 0.15, r * 0.25).fill({ color: 0xffffff, alpha: 0.2 });
          // Head
          g.circle(cx - r * 0.3, cy + bob - r * 0.4, r * 0.35).fill(0x333333);
          // Eyes
          g.circle(cx - r * 0.15, cy + bob - r * 0.45, 1.5).fill(0xffffff);
          // Legs
          g.rect(cx - r * 0.45, cy + bob + r * 0.6, 2, r * 0.35).fill(0x333333);
          g.rect(cx + r * 0.15, cy + bob + r * 0.6, 2, r * 0.35).fill(0x333333);
          break;
        }
        case PickupKind.KNIGHT: {
          // Armor body
          g.rect(cx - r * 0.6, cy + bob - r, r * 1.2, r * 1.6).fill(B.COLOR_KNIGHT);
          // Helmet shine
          g.rect(cx - r * 0.5, cy + bob - r, r * 1.0, 3).fill({ color: 0xffffff, alpha: 0.2 });
          // Cross emblem
          g.rect(cx - r * 0.15, cy + bob - r * 0.7, r * 0.3, r * 1.2).fill(0xaa0000);
          g.rect(cx - r * 0.5, cy + bob - r * 0.1, r * 1.0, r * 0.3).fill(0xaa0000);
          // Visor slit
          g.rect(cx - r * 0.3, cy + bob - r * 0.85, r * 0.6, 2).fill({ color: 0x222222, alpha: 0.6 });
          break;
        }
        case PickupKind.TREASURE: {
          // Glow underneath
          g.circle(cx, cy + bob, r * 1.2).fill({ color: B.COLOR_TREASURE, alpha: 0.1 + Math.sin(t * 4) * 0.05 });
          g.star(cx, cy + bob, 4, r * 0.4, r, t * 2).fill(B.COLOR_TREASURE);
          // Bright center
          g.circle(cx, cy + bob, r * 0.25).fill({ color: 0xffffff, alpha: 0.5 });
          // Sparkles
          const sa = t * 5;
          for (let s = 0; s < 4; s++) {
            const a = sa + s * Math.PI * 2 / 4;
            const sparkR = r * (0.7 + Math.sin(t * 7 + s) * 0.2);
            g.circle(cx + Math.cos(a) * sparkR, cy + bob + Math.sin(a) * sparkR * 0.7, 1.5)
              .fill({ color: 0xffffff, alpha: 0.6 + Math.sin(t * 9 + s * 2) * 0.3 });
          }
          break;
        }
        case PickupKind.POTION: {
          // Bottle glow
          g.circle(cx, cy + bob + r * 0.2, r * 0.9).fill({ color: B.COLOR_POTION, alpha: 0.1 });
          // Bottle body
          g.roundRect(cx - r * 0.4, cy + bob - r * 0.2, r * 0.8, r * 1.0, 3).fill(B.COLOR_POTION);
          // Bottle neck
          g.rect(cx - r * 0.2, cy + bob - r * 0.6, r * 0.4, r * 0.5).fill(0x006699);
          // Cork
          g.rect(cx - r * 0.15, cy + bob - r * 0.65, r * 0.3, r * 0.15).fill(0x8a6a3a);
          // Bubbles
          const bubY = Math.sin(t * 6) * 2;
          g.circle(cx + r * 0.1, cy + bob + r * 0.1 + bubY, 2).fill({ color: 0xffffff, alpha: 0.6 });
          g.circle(cx - r * 0.15, cy + bob + r * 0.3 + bubY * 0.7, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
          break;
        }
        case PickupKind.FIRE_SCROLL: {
          // Parchment
          g.roundRect(cx - r * 0.5, cy + bob - r * 0.4, r * 1.0, r * 0.8, 2).fill(0xeedd99);
          // Scroll edges
          g.circle(cx - r * 0.5, cy + bob, r * 0.15).fill(0xdcc888);
          g.circle(cx + r * 0.5, cy + bob, r * 0.15).fill(0xdcc888);
          // Animated flame above
          const fy = cy + bob - r * 0.7 + Math.sin(t * 8) * 2;
          g.circle(cx, fy, r * 0.4).fill({ color: B.COLOR_FIRE_SCROLL, alpha: 0.9 });
          g.circle(cx, fy - r * 0.15, r * 0.25).fill({ color: 0xffaa00, alpha: 0.9 });
          g.circle(cx, fy - r * 0.3, r * 0.12).fill({ color: 0xffee88, alpha: 0.7 });
          // Side embers
          g.circle(cx + Math.sin(t * 12) * r * 0.3, fy - r * 0.1, 1.5)
            .fill({ color: 0xff6600, alpha: 0.5 + Math.sin(t * 15) * 0.3 });
          // Flame wisps — wispy tendrils curling upward from the flame
          for (let fw = 0; fw < 4; fw++) {
            const fwPhase = t * (4 + fw * 0.8) + fw * 1.7;
            const fwLife = (fwPhase % 2.0) / 2.0;
            const fwSway = Math.sin(fwPhase * 2 + fw * 1.3) * r * 0.35;
            const fwX = cx + fwSway;
            const fwY = fy - fwLife * r * 1.2;
            const fwSize = (1.0 - fwLife) * 2.0 + 0.5;
            const fwAlpha = (1.0 - fwLife) * 0.35;
            if (fwAlpha > 0.03) {
              // Wisp outer glow
              g.circle(fwX, fwY, fwSize * 2).fill({ color: 0xff4400, alpha: fwAlpha * 0.15 });
              // Wisp core
              const fwColor = fwLife < 0.3 ? 0xffcc44 : fwLife < 0.6 ? 0xff8800 : 0xff4400;
              g.circle(fwX, fwY, fwSize).fill({ color: fwColor, alpha: fwAlpha });
            }
          }
          // Heat distortion ring around scroll
          const heatPulse = 0.06 + Math.sin(t * 5) * 0.04;
          g.circle(cx, cy + bob, r * 1.3).fill({ color: 0xff2200, alpha: heatPulse });
          break;
        }
        case PickupKind.SHIELD: {
          // Outer glow
          g.circle(cx, cy + bob, r * 1.1).fill({ color: B.COLOR_SHIELD, alpha: 0.15 + Math.sin(t * 4) * 0.08 });
          // Shield shape
          g.moveTo(cx, cy + bob - r * 0.8)
            .lineTo(cx + r * 0.6, cy + bob - r * 0.3)
            .lineTo(cx + r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx, cy + bob + r * 0.8)
            .lineTo(cx - r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx - r * 0.6, cy + bob - r * 0.3)
            .closePath().fill(B.COLOR_SHIELD);
          // Inner border
          g.moveTo(cx, cy + bob - r * 0.55)
            .lineTo(cx + r * 0.4, cy + bob - r * 0.2)
            .lineTo(cx + r * 0.33, cy + bob + r * 0.35)
            .lineTo(cx, cy + bob + r * 0.55)
            .lineTo(cx - r * 0.33, cy + bob + r * 0.35)
            .lineTo(cx - r * 0.4, cy + bob - r * 0.2)
            .closePath().fill({ color: 0x66ccff, alpha: 0.4 });
          // Center emblem
          g.circle(cx, cy + bob, r * 0.2).fill({ color: 0xffffff, alpha: 0.7 });
          // Shimmer sweep — a bright highlight that sweeps across the shield
          const shimSweep = (t * 2.5) % 3.0; // 0 to 3 cycle
          if (shimSweep < 1.0) {
            const shimX = cx - r * 0.6 + shimSweep * r * 1.2;
            const shimAlpha = Math.sin(shimSweep * Math.PI) * 0.35;
            g.rect(shimX - 2, cy + bob - r * 0.7, 4, r * 1.5)
              .fill({ color: 0xffffff, alpha: shimAlpha });
            g.rect(shimX - 1, cy + bob - r * 0.6, 2, r * 1.2)
              .fill({ color: 0xffffff, alpha: shimAlpha * 0.8 });
          }
          // Edge sparkle ring
          const edgeAlpha = 0.1 + Math.sin(t * 6) * 0.08;
          g.setStrokeStyle({ width: 1, color: 0xaaddff, alpha: edgeAlpha });
          g.moveTo(cx, cy + bob - r * 0.8)
            .lineTo(cx + r * 0.6, cy + bob - r * 0.3)
            .lineTo(cx + r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx, cy + bob + r * 0.8)
            .lineTo(cx - r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx - r * 0.6, cy + bob - r * 0.3)
            .closePath().stroke();
          break;
        }
        case PickupKind.PORTAL: {
          // Outer distortion ring (pulsing)
          const portalPulse = 0.08 + Math.sin(t * 5) * 0.06;
          g.circle(cx, cy + bob, r * 1.5).fill({ color: B.COLOR_PORTAL, alpha: portalPulse });
          // Spinning ring segments (gives vortex illusion)
          for (let ring = 0; ring < 3; ring++) {
            const ringR = r * (1.1 - ring * 0.25);
            const ringAlpha = 0.15 + ring * 0.12;
            const ringColor = ring === 0 ? B.COLOR_PORTAL : ring === 1 ? 0xbb66ee : 0xdd99ff;
            // Draw arc segments rotating at different speeds
            const segments = 6;
            for (let s = 0; s < segments; s += 2) {
              const a1 = (s / segments) * Math.PI * 2 + t * (3 + ring * 1.5) * (ring % 2 ? -1 : 1);
              const a2 = ((s + 1) / segments) * Math.PI * 2 + t * (3 + ring * 1.5) * (ring % 2 ? -1 : 1);
              g.setStrokeStyle({ width: 2 - ring * 0.4, color: ringColor, alpha: ringAlpha });
              g.moveTo(cx + Math.cos(a1) * ringR, cy + bob + Math.sin(a1) * ringR);
              const steps = 4;
              for (let st = 1; st <= steps; st++) {
                const a = a1 + (a2 - a1) * (st / steps);
                g.lineTo(cx + Math.cos(a) * ringR, cy + bob + Math.sin(a) * ringR);
              }
              g.stroke();
            }
          }
          // Bright center vortex
          g.circle(cx, cy + bob, r * 0.35).fill({ color: 0xdd88ff, alpha: 0.6 });
          g.circle(cx, cy + bob, r * 0.15).fill({ color: 0xffffff, alpha: 0.85 });
          // Orbital particles with longer trails
          for (let s = 0; s < 6; s++) {
            const a = t * 4.5 + s * Math.PI * 2 / 6;
            const orbitR = r * (0.7 + Math.sin(t * 2 + s) * 0.15);
            g.circle(cx + Math.cos(a) * orbitR, cy + bob + Math.sin(a) * orbitR, 2).fill(0xcc88ff);
            // Trail (3 fading dots)
            for (let tr = 1; tr <= 3; tr++) {
              const ta = a - tr * 0.3;
              g.circle(cx + Math.cos(ta) * orbitR, cy + bob + Math.sin(ta) * orbitR, 2 - tr * 0.4)
                .fill({ color: 0xcc88ff, alpha: 0.5 - tr * 0.15 });
            }
          }
          break;
        }
        case PickupKind.GOLDEN_SHEEP: {
          // Glowing aura
          g.circle(cx, cy + bob, r * 1.4).fill({ color: B.COLOR_GOLDEN_SHEEP, alpha: 0.12 + Math.sin(t * 5) * 0.08 });
          g.circle(cx, cy + bob, r * 1.15).fill({ color: B.COLOR_GOLDEN_SHEEP, alpha: 0.08 });
          // Body
          g.circle(cx, cy + bob, r).fill(B.COLOR_GOLDEN_SHEEP);
          // Shine highlight
          g.circle(cx - r * 0.15, cy + bob - r * 0.2, r * 0.3).fill({ color: 0xffffff, alpha: 0.25 });
          // Head
          g.circle(cx - r * 0.3, cy + bob - r * 0.4, r * 0.3).fill(0x8a6a00);
          // Eyes
          g.circle(cx - r * 0.18, cy + bob - r * 0.45, 1.5).fill(0xffffff);
          // Legs
          g.rect(cx - r * 0.4, cy + bob + r * 0.6, 2, r * 0.3).fill(0x8a6a00);
          g.rect(cx + r * 0.2, cy + bob + r * 0.6, 2, r * 0.3).fill(0x8a6a00);
          // Crown with jewels
          g.moveTo(cx - r * 0.35, cy + bob - r * 0.9).lineTo(cx - r * 0.15, cy + bob - r * 0.6)
            .lineTo(cx, cy + bob - r * 1.05).lineTo(cx + r * 0.15, cy + bob - r * 0.6)
            .lineTo(cx + r * 0.35, cy + bob - r * 0.9).closePath().fill(0xffd700);
          // Crown jewel
          g.circle(cx, cy + bob - r * 0.85, 1.5).fill(0xff4444);
          // Sparkle particles orbiting the golden sheep
          for (let sp = 0; sp < 6; sp++) {
            const spA = t * 3.5 + sp * Math.PI * 2 / 6;
            const spR = r * (1.2 + Math.sin(t * 2 + sp * 1.5) * 0.2);
            const spLife = (t * 5 + sp * 1.7) % 2.0;
            const spAlpha = spLife < 1.0 ? spLife * 0.5 : (2.0 - spLife) * 0.5;
            const spX = cx + Math.cos(spA) * spR;
            const spY = cy + bob + Math.sin(spA) * spR * 0.6;
            // Star sparkle shape
            g.star(spX, spY, 4, 0.5, 1.8, t * 8 + sp).fill({ color: 0xffffff, alpha: spAlpha * 0.7 });
            g.circle(spX, spY, 1.0).fill({ color: 0xffffcc, alpha: spAlpha });
          }
          // Twinkling cross sparkles at fixed positions
          for (let tw = 0; tw < 3; tw++) {
            const twPhase = t * 6 + tw * 2.5 + p.x * 3;
            const twAlpha = Math.max(0, Math.sin(twPhase) * 0.4);
            if (twAlpha > 0.05) {
              const twX = cx + Math.cos(tw * 2.1 + 0.5) * r * 0.8;
              const twY = cy + bob + Math.sin(tw * 1.7 + 0.3) * r * 0.6;
              const rayLen = 3 + twAlpha * 4;
              g.setStrokeStyle({ width: 0.6, color: 0xffffff, alpha: twAlpha });
              g.moveTo(twX - rayLen, twY).lineTo(twX + rayLen, twY).stroke();
              g.moveTo(twX, twY - rayLen).lineTo(twX, twY + rayLen).stroke();
            }
          }
          break;
        }
        case PickupKind.MAGNET: {
          // Magnet pickup — horseshoe magnet shape
          const magnetColor = B.COLOR_MAGNET;
          // Outer glow
          g.circle(cx, cy + bob, r * 1.1).fill({ color: magnetColor, alpha: 0.15 + Math.sin(t * 5) * 0.08 });
          // U-shape body
          g.roundRect(cx - r * 0.5, cy + bob - r * 0.3, r * 0.3, r * 0.9, 2).fill(0xcc2222);
          g.roundRect(cx + r * 0.2, cy + bob - r * 0.3, r * 0.3, r * 0.9, 2).fill(0x2244cc);
          // Bottom arc connecting the two poles
          g.roundRect(cx - r * 0.5, cy + bob + r * 0.3, r * 1.0, r * 0.3, 4).fill(0x888888);
          // Tips (pole caps)
          g.rect(cx - r * 0.5, cy + bob - r * 0.4, r * 0.3, r * 0.15).fill(0xeeeeee);
          g.rect(cx + r * 0.2, cy + bob - r * 0.4, r * 0.3, r * 0.15).fill(0xeeeeee);
          // Attraction field lines
          for (let s = 0; s < 3; s++) {
            const fa = t * 3 + s * 2.1;
            const fr = r * (0.6 + Math.sin(fa) * 0.3);
            g.circle(cx + Math.cos(fa) * fr, cy + bob + Math.sin(fa) * fr * 0.5, 1.2)
              .fill({ color: magnetColor, alpha: 0.4 + Math.sin(fa * 2) * 0.2 });
          }
          break;
        }
        case PickupKind.LIGHTNING_SCROLL: {
          // Electric glow aura
          const elecPulse = 0.1 + Math.sin(t * 8) * 0.06;
          g.circle(cx, cy + bob, r * 1.3).fill({ color: B.COLOR_LIGHTNING, alpha: elecPulse });
          g.circle(cx, cy + bob, r * 1.0).fill({ color: 0xffff88, alpha: elecPulse * 0.5 });
          // Parchment scroll background
          g.roundRect(cx - r * 0.5, cy + bob - r * 0.4, r * 1.0, r * 0.8, 2).fill(0xeedd99);
          g.circle(cx - r * 0.5, cy + bob, r * 0.15).fill(0xdcc888);
          g.circle(cx + r * 0.5, cy + bob, r * 0.15).fill(0xdcc888);
          // Lightning bolt icon (yellow-white)
          const bx = cx, by = cy + bob - r * 0.5;
          g.moveTo(bx - r * 0.15, by)
            .lineTo(bx + r * 0.2, by)
            .lineTo(bx + r * 0.02, by + r * 0.35)
            .lineTo(bx + r * 0.25, by + r * 0.35)
            .lineTo(bx - r * 0.1, by + r * 0.85)
            .lineTo(bx + r * 0.05, by + r * 0.45)
            .lineTo(bx - r * 0.18, by + r * 0.45)
            .closePath().fill(0xffee44);
          // Bright core of bolt
          g.moveTo(bx - r * 0.08, by + r * 0.1)
            .lineTo(bx + r * 0.1, by + r * 0.1)
            .lineTo(bx, by + r * 0.55)
            .closePath().fill({ color: 0xffffff, alpha: 0.7 });
          // Electric arc sparks around the scroll
          for (let s = 0; s < 4; s++) {
            const sa = t * 12 + s * Math.PI / 2;
            const sr = r * (0.8 + Math.sin(t * 15 + s * 3) * 0.2);
            const sparkAlpha = 0.4 + Math.sin(t * 18 + s * 5) * 0.3;
            if (sparkAlpha > 0.2) {
              g.circle(cx + Math.cos(sa) * sr, cy + bob + Math.sin(sa) * sr, 1.5)
                .fill({ color: 0xffff88, alpha: sparkAlpha });
              // Tiny arc line from spark to center
              g.setStrokeStyle({ width: 0.8, color: B.COLOR_LIGHTNING, alpha: sparkAlpha * 0.5 });
              g.moveTo(cx + Math.cos(sa) * sr, cy + bob + Math.sin(sa) * sr)
                .lineTo(cx + Math.cos(sa) * sr * 0.3, cy + bob + Math.sin(sa) * sr * 0.3).stroke();
            }
          }
          break;
        }
        case PickupKind.TIME_WARP: {
          // Purple-blue swirl aura
          const twPulse = 0.1 + Math.sin(t * 4) * 0.06;
          g.circle(cx, cy + bob, r * 1.3).fill({ color: B.COLOR_TIME_WARP, alpha: twPulse });
          // Hourglass body — two triangles joined at center
          const hw = r * 0.45, hh = r * 0.75;
          // Top triangle (filled half = sand remaining)
          g.moveTo(cx - hw, cy + bob - hh)
            .lineTo(cx + hw, cy + bob - hh)
            .lineTo(cx, cy + bob)
            .closePath().fill(0x8866cc);
          // Bottom triangle
          g.moveTo(cx - hw, cy + bob + hh)
            .lineTo(cx + hw, cy + bob + hh)
            .lineTo(cx, cy + bob)
            .closePath().fill(0x6644aa);
          // Sand in top (animated draining)
          const sandFill = 0.5 + Math.sin(t * 2) * 0.3;
          g.moveTo(cx - hw * sandFill, cy + bob - hh * sandFill)
            .lineTo(cx + hw * sandFill, cy + bob - hh * sandFill)
            .lineTo(cx, cy + bob)
            .closePath().fill({ color: 0xeedd88, alpha: 0.5 });
          // Sand in bottom
          g.moveTo(cx - hw * (1 - sandFill), cy + bob + hh)
            .lineTo(cx + hw * (1 - sandFill), cy + bob + hh)
            .lineTo(cx, cy + bob + hh * sandFill)
            .closePath().fill({ color: 0xeedd88, alpha: 0.4 });
          // Hourglass frame outline
          g.setStrokeStyle({ width: 1.5, color: 0xccaaff, alpha: 0.7 });
          g.moveTo(cx - hw, cy + bob - hh).lineTo(cx + hw, cy + bob - hh).stroke();
          g.moveTo(cx - hw, cy + bob + hh).lineTo(cx + hw, cy + bob + hh).stroke();
          // Swirl particles orbiting the hourglass
          for (let s = 0; s < 5; s++) {
            const sa = t * (3 + s * 0.5) + s * Math.PI * 2 / 5;
            const orbitR = r * (0.9 + Math.sin(t * 2 + s) * 0.15);
            const swirlAlpha = 0.3 + Math.sin(t * 4 + s * 1.5) * 0.2;
            g.circle(cx + Math.cos(sa) * orbitR, cy + bob + Math.sin(sa) * orbitR * 0.7, 1.5)
              .fill({ color: B.COLOR_TIME_WARP, alpha: swirlAlpha });
            // Trail
            const ta = sa - 0.4;
            g.circle(cx + Math.cos(ta) * orbitR, cy + bob + Math.sin(ta) * orbitR * 0.7, 1.0)
              .fill({ color: B.COLOR_TIME_WARP, alpha: swirlAlpha * 0.4 });
          }
          // Center clock dot
          g.circle(cx, cy + bob, r * 0.12).fill({ color: 0xffffff, alpha: 0.6 });
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Roaming knights — with armor detail and weapon glow
  // ---------------------------------------------------------------------------

  private _drawKnights(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;

    for (const k of state.knights) {
      if (!k.alive) continue;
      const cx = ox + k.x * cs + half;
      const cy = oy + k.y * cs + half;
      const r = half * 0.75;

      const kColor = k.chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM;

      // Pulsing threat glow
      const glowAlpha = 0.08 + Math.sin(t * (k.chasing ? 8 : 4) + k.x) * 0.05;
      g.circle(cx, cy, r * 1.6).fill({ color: kColor, alpha: glowAlpha });

      // Shadow
      g.circle(cx + 1, cy + r * 0.5, r * 0.6).fill({ color: 0x000000, alpha: 0.15 });

      // Body (armor) with plate detail
      g.circle(cx, cy, r).fill(kColor);
      // Armor rim (darker edge with metallic stroke)
      g.setStrokeStyle({ width: 1.8, color: 0x000000, alpha: 0.2 });
      g.circle(cx, cy, r).stroke();
      // Armor plate overlay — horizontal line suggesting breastplate
      g.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.1 });
      g.moveTo(cx - r * 0.6, cy + r * 0.1).lineTo(cx + r * 0.6, cy + r * 0.1).stroke();
      // Armor shine (specular highlight)
      g.circle(cx - r * 0.2, cy - r * 0.25, r * 0.28).fill({ color: 0xffffff, alpha: 0.16 });
      g.circle(cx - r * 0.35, cy - r * 0.15, r * 0.12).fill({ color: 0xffffff, alpha: 0.08 });

      const dx = DIR_DX[k.dir];
      const dy = DIR_DY[k.dir];
      const px = -dy, py = dx;

      // Helmet shape — pointed top with visor
      // Helmet dome
      g.circle(cx + dx * r * 0.05, cy + dy * r * 0.05, r * 0.55)
        .fill({ color: k.chasing ? 0x661122 : 0x444466, alpha: 0.3 });
      // Helmet crest (taller plume spike on top)
      g.setStrokeStyle({ width: 2.5, color: k.chasing ? 0x881111 : 0x555577, cap: "round" });
      g.moveTo(cx - dx * r * 0.3, cy - dy * r * 0.3)
        .lineTo(cx - dx * r * 0.9, cy - dy * r * 0.9).stroke();
      // Plume feather detail
      g.setStrokeStyle({ width: 1.5, color: k.chasing ? 0xaa2222 : 0x6666aa, alpha: 0.4, cap: "round" });
      g.moveTo(cx - dx * r * 0.7 + px * 2, cy - dy * r * 0.7 + py * 2)
        .lineTo(cx - dx * r * 1.0 + px * 3, cy - dy * r * 1.0 + py * 3).stroke();

      // Face / visor slit (T-shaped visor)
      g.rect(cx + dx * r * 0.25 - 4, cy + dy * r * 0.25 - 1.5, 8, 3).fill(k.chasing ? 0x441111 : 0x222244);
      g.rect(cx + dx * r * 0.3 - 1, cy + dy * r * 0.15 - 3, 2, 5).fill(k.chasing ? 0x441111 : 0x222244);
      // Eye glints behind visor
      if (k.chasing) {
        g.circle(cx + dx * r * 0.3 + px * 2, cy + dy * r * 0.3 + py * 2, 1.2).fill({ color: 0xff4444, alpha: 0.7 });
        g.circle(cx + dx * r * 0.3 - px * 2, cy + dy * r * 0.3 - py * 2, 1.2).fill({ color: 0xff4444, alpha: 0.7 });
      }

      // Shield on off-hand side (small kite shield shape)
      const shX = cx - px * r * 0.7;
      const shY = cy - py * r * 0.7;
      g.moveTo(shX, shY - r * 0.35)
        .lineTo(shX + px * r * 0.25, shY - r * 0.1)
        .lineTo(shX + px * r * 0.2, shY + r * 0.3)
        .lineTo(shX, shY + r * 0.45)
        .lineTo(shX - px * r * 0.2, shY + r * 0.3)
        .lineTo(shX - px * r * 0.25, shY - r * 0.1)
        .closePath().fill(k.chasing ? 0x661122 : 0x333366);
      // Shield cross emblem
      g.rect(shX - 1, shY - r * 0.15, 2, r * 0.35).fill({ color: k.chasing ? 0xcc2222 : 0x6666aa, alpha: 0.5 });
      g.rect(shX - r * 0.1, shY + r * 0.02, r * 0.2, 2).fill({ color: k.chasing ? 0xcc2222 : 0x6666aa, alpha: 0.5 });

      // Footstep dust particles when knight is moving (chasing)
      if (k.chasing) {
        for (let fd = 0; fd < 2; fd++) {
          const fdPhase = t * 6 + k.x * 3 + fd * 2;
          const fdLife = (fdPhase % 1.5) / 1.5;
          const fdX = cx - dx * r * 0.8 + (Math.sin(fdPhase * 2) - 0.5) * 3;
          const fdY = cy - dy * r * 0.8 + fd * 2;
          const fdSize = (1.0 - fdLife) * 2.5 + 1;
          const fdAlpha = (1.0 - fdLife) * 0.15;
          g.circle(fdX, fdY, fdSize).fill({ color: 0x998877, alpha: fdAlpha });
        }
      }

      // Sword with glow
      const swordLen = r * 0.85;
      if (k.chasing) {
        g.setStrokeStyle({ width: 4, color: 0xff4444, alpha: 0.2 });
        g.moveTo(cx + dx * r * 0.5, cy + dy * r * 0.5)
          .lineTo(cx + dx * (r * 0.5 + swordLen), cy + dy * (r * 0.5 + swordLen)).stroke();
      }
      g.setStrokeStyle({ width: 2, color: k.chasing ? 0xffaaaa : 0xddddee });
      g.moveTo(cx + dx * r * 0.5, cy + dy * r * 0.5)
        .lineTo(cx + dx * (r * 0.5 + swordLen), cy + dy * (r * 0.5 + swordLen)).stroke();
      // Crossguard
      g.setStrokeStyle({ width: 1.5, color: k.chasing ? 0xcc8888 : 0xbbbbcc });
      g.moveTo(cx + dx * r * 0.5 + px * 3, cy + dy * r * 0.5 + py * 3)
        .lineTo(cx + dx * r * 0.5 - px * 3, cy + dy * r * 0.5 - py * 3).stroke();
      // Sword tip glint
      g.circle(cx + dx * (r * 0.5 + swordLen), cy + dy * (r * 0.5 + swordLen), 1.5)
        .fill({ color: 0xffffff, alpha: 0.4 + Math.sin(t * 6 + k.x) * 0.3 });
    }
  }

  // ---------------------------------------------------------------------------
  // Wyrm — enhanced body with spine ridge, belly, glowing eyes
  // ---------------------------------------------------------------------------

  private _drawWyrm(g: Graphics, state: WyrmState): void {
    if (state.phase === WyrmPhase.DEAD || state.phase === WyrmPhase.START) return;
    if (state.body.length === 0) return;

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    const frac = state.moveFraction;

    // Compute screen positions for each segment
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < state.body.length; i++) {
      const seg = state.body[i];
      let sx: number, sy: number;
      if (i === 0 && state.body.length > 1) {
        const prev = state.body[1];
        sx = ox + (prev.x + (seg.x - prev.x) * frac) * cs + half;
        sy = oy + (prev.y + (seg.y - prev.y) * frac) * cs + half;
      } else {
        sx = ox + seg.x * cs + half;
        sy = oy + seg.y * cs + half;
        // Subtle wave for body
        if (i > 0) {
          const wave = Math.sin(t * 4 + i * 0.5) * 1.2;
          sx += wave * (i % 2 ? 1 : -1) * 0.3;
        }
      }
      positions.push({ x: sx, y: sy });
    }

    const wyrmCol = getWyrmColors(state.length);

    // --- Draw body glow underneath (ambient light from wyrm) ---
    for (let i = 0; i < positions.length; i += 2) {
      const glowAlpha = state.length > 10 ? 0.04 : 0.02;
      g.circle(positions[i].x, positions[i].y, half * 1.4)
        .fill({ color: wyrmCol.head, alpha: glowAlpha });
    }

    // --- Draw smooth body using bezier curves between segments ---
    if (positions.length >= 3) {
      // Compute smoothed spline midpoints for Catmull-Rom-like bezier connections
      const midpoints: { x: number; y: number }[] = [];
      for (let i = 0; i < positions.length - 1; i++) {
        midpoints.push({ x: (positions[i].x + positions[i + 1].x) * 0.5, y: (positions[i].y + positions[i + 1].y) * 0.5 });
      }

      // Underbelly fill — draw a smooth filled body outline using bezier curves
      if (cs > 8 && positions.length >= 4) {
        const bellyColor = 0xd4c89a; // warm lighter underbelly tone
        for (let i = state.body.length - 1; i > 0; i--) {
          const from = positions[i];
          const to = positions[i - 1];
          const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
          const lineW = cs * taperFactor * 0.6;
          // Offset underbelly toward the "down" side (opposite of movement)
          const bellyDx = -DIR_DX[state.direction] * lineW * 0.15;
          const bellyDy = -DIR_DY[state.direction] * lineW * 0.15;
          if (i > 1 && i < positions.length - 1) {
            const prev = positions[i + 1] || from;
            const cpx = from.x + (to.x - prev.x) * 0.25 + bellyDx;
            const cpy = from.y + (to.y - prev.y) * 0.25 + bellyDy;
            g.setStrokeStyle({ width: lineW, color: bellyColor, alpha: 0.12, cap: "round" });
            g.moveTo(from.x + bellyDx, from.y + bellyDy).quadraticCurveTo(cpx, cpy, to.x + bellyDx, to.y + bellyDy).stroke();
          }
        }
      }

      // Outer body (smooth bezier curves, thicker)
      for (let i = state.body.length - 1; i > 0; i--) {
        const from = positions[i];
        const to = positions[i - 1];
        const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
        const lineW = cs * taperFactor;
        const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;

        if (i > 1 && i < positions.length - 1) {
          // Catmull-Rom style: use previous and next points for smooth control points
          const prev = positions[Math.min(i + 1, positions.length - 1)];
          const next = positions[Math.max(i - 2, 0)];
          const cp1x = from.x + (to.x - prev.x) * 0.25;
          const cp1y = from.y + (to.y - prev.y) * 0.25;
          const cp2x = to.x + (from.x - next.x) * 0.25;
          const cp2y = to.y + (from.y - next.y) * 0.25;
          g.setStrokeStyle({ width: lineW, color, cap: "round" });
          g.moveTo(from.x, from.y).bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y).stroke();
        } else {
          g.setStrokeStyle({ width: lineW, color, cap: "round" });
          g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
        }
      }

      // Dorsal ridge / spine line — prominent raised ridge along the top
      if (cs > 10) {
        for (let i = state.body.length - 1; i > 0; i--) {
          const from = positions[i];
          const to = positions[i - 1];
          const taperFactor = Math.max(0.08, 0.2 - i * 0.002);
          // Spine highlight (bright edge)
          g.setStrokeStyle({ width: cs * taperFactor + 1, color: 0x000000, alpha: 0.12, cap: "round" });
          g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
          // Bright ridge center
          g.setStrokeStyle({ width: cs * taperFactor * 0.4, color: wyrmCol.head, alpha: 0.15, cap: "round" });
          g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
          // Spine spikes every few segments
          if (i % 3 === 0 && cs > 14) {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const spikeH = cs * taperFactor * 2;
            const mx = (from.x + to.x) * 0.5;
            const my = (from.y + to.y) * 0.5;
            g.moveTo(mx + nx * spikeH, my + ny * spikeH)
              .lineTo(mx + dx * 0.15, my + dy * 0.15)
              .lineTo(mx - dx * 0.15, my - dy * 0.15)
              .closePath().fill({ color: wyrmCol.head, alpha: 0.2 });
          }
        }
      }
    } else {
      // Fallback for very short wyrm
      for (let i = state.body.length - 1; i > 0; i--) {
        const from = positions[i];
        const to = positions[i - 1];
        const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
        const lineW = cs * taperFactor;
        const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;
        g.setStrokeStyle({ width: lineW, color, cap: "round" });
        g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
      }
    }

    // --- Draw segment circles on top of lines ---
    for (let i = state.body.length - 1; i >= 0; i--) {
      const { x: cx, y: cy } = positions[i];

      if (i === 0) {
        // ===== HEAD =====
        const headR = half * 0.92;

        // Shield aura — multiple rings for multi-hit shields
        if (state.shieldHits > 0) {
          for (let sr = 0; sr < state.shieldHits; sr++) {
            const pulse = 0.12 + Math.sin(t * 6 + sr * 1.5) * 0.06;
            const ringR = headR * (1.6 + sr * 0.4);
            g.circle(cx, cy, ringR).fill({ color: B.COLOR_SHIELD, alpha: pulse });
            // Shield ring outline
            g.setStrokeStyle({ width: 1.5, color: B.COLOR_SHIELD, alpha: pulse * 1.5 });
            g.circle(cx, cy, ringR).stroke();
          }
        }

        // Head shadow (deeper, offset)
        g.circle(cx + 2, cy + 3, headR * 1.05).fill({ color: 0x000000, alpha: 0.2 });

        const wyrmC = getWyrmColors(state.length);
        // Base head fill
        g.circle(cx, cy, headR).fill(wyrmC.head);

        // Scale texture overlay — subtle darker rings for scale pattern
        if (cs > 10) {
          g.circle(cx, cy, headR * 0.9).fill({ color: 0x000000, alpha: 0.04 });
          // Scale ridge marks (concentric arcs suggesting overlapping scales)
          for (let sc = 0; sc < 3; sc++) {
            const scR = headR * (0.5 + sc * 0.15);
            const scAngle = t * 0.5 + sc * 0.8;
            g.setStrokeStyle({ width: 0.7, color: 0x000000, alpha: 0.06 });
            g.moveTo(cx + Math.cos(scAngle) * scR, cy + Math.sin(scAngle) * scR)
              .lineTo(cx + Math.cos(scAngle + 0.5) * scR, cy + Math.sin(scAngle + 0.5) * scR).stroke();
          }
        }

        // Head highlight (shiny scales on top — specular reflection)
        g.circle(cx - headR * 0.18, cy - headR * 0.22, headR * 0.35)
          .fill({ color: 0xffffff, alpha: 0.12 });
        // Secondary smaller highlight
        g.circle(cx - headR * 0.3, cy - headR * 0.1, headR * 0.15)
          .fill({ color: 0xffffff, alpha: 0.07 });
        // Rim light (edge highlight for 3D depth)
        g.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: 0.06 });
        g.circle(cx, cy, headR * 0.95).stroke();

        // Horns — thicker, with gradient feel
        const dx = DIR_DX[state.direction];
        const dy = DIR_DY[state.direction];
        const px = -dy;
        const py = dx;
        const hornLen = headR * 0.85;
        // Helper to draw a single horn with layered detail
        const drawHorn = (side: number) => {
          const hbx = cx + px * headR * 0.5 * side;
          const hby = cy + py * headR * 0.5 * side;
          const htx = hbx - dx * hornLen;
          const hty = hby - dy * hornLen;
          // Horn shadow
          g.setStrokeStyle({ width: 5, color: 0x000000, alpha: 0.18, cap: "round" });
          g.moveTo(hbx + 1, hby + 1).lineTo(htx + 1, hty + 1).stroke();
          // Horn base (wider, darker bone)
          g.setStrokeStyle({ width: 4, color: 0x5a3a08, cap: "round" });
          g.moveTo(hbx, hby).lineTo(hbx - dx * hornLen * 0.4, hby - dy * hornLen * 0.4).stroke();
          // Horn mid (medium, lighter bone)
          g.setStrokeStyle({ width: 3, color: 0x7a5a12, cap: "round" });
          g.moveTo(hbx - dx * hornLen * 0.3, hby - dy * hornLen * 0.3)
            .lineTo(hbx - dx * hornLen * 0.7, hby - dy * hornLen * 0.7).stroke();
          // Horn tip (thin, brightest — ivory)
          g.setStrokeStyle({ width: 2, color: 0xb89a3a, cap: "round" });
          g.moveTo(hbx - dx * hornLen * 0.6, hby - dy * hornLen * 0.6).lineTo(htx, hty).stroke();
          // Horn highlight (specular ridge along top)
          g.setStrokeStyle({ width: 1, color: 0xccaa44, alpha: 0.4, cap: "round" });
          g.moveTo(hbx, hby).lineTo(hbx - dx * hornLen * 0.5, hby - dy * hornLen * 0.5).stroke();
          // Horn tip glint
          g.circle(htx, hty, 1.5).fill({ color: 0xeedd88, alpha: 0.4 });
          // Horn ring marks (bone texture)
          for (let hr = 1; hr <= 2; hr++) {
            const hrFrac = hr * 0.3;
            const hrx = hbx - dx * hornLen * hrFrac;
            const hry = hby - dy * hornLen * hrFrac;
            g.circle(hrx, hry, 1.8 - hr * 0.3).fill({ color: 0x000000, alpha: 0.06 });
          }
        };
        drawHorn(1);
        drawHorn(-1);

        // Nostrils — always visible as dark slits, smoke puffs when fire active
        const nostrilOffset = headR * 0.3;
        for (let n = 0; n < 2; n++) {
          const np = n === 0 ? 1 : -1;
          const nx = cx + dx * headR * 0.65 + px * nostrilOffset * np;
          const ny = cy + dy * headR * 0.65 + py * nostrilOffset * np;
          // Dark nostril slit (always visible)
          g.circle(nx, ny, 1.8).fill({ color: 0x000000, alpha: 0.35 });
          g.circle(nx + dx * 0.5, ny + dy * 0.5, 1.0).fill({ color: 0x111111, alpha: 0.25 });
        }
        // Smoke/ember puffs when fire active
        if (state.fireBreathTimer > 0) {
          for (let n = 0; n < 2; n++) {
            const np = n === 0 ? 1 : -1;
            const nx = cx + dx * headR * 0.65 + px * nostrilOffset * np;
            const ny = cy + dy * headR * 0.65 + py * nostrilOffset * np;
            const smokePhase = t * 4 + n * 2;
            // Layered smoke with color variation (dark smoke -> lighter wisp)
            for (let s = 0; s < 5; s++) {
              const sd = s * 0.25 + Math.sin(smokePhase + s * 1.3) * 0.15;
              const smokeSize = 2 + s * 0.8 + Math.sin(smokePhase * 0.7 + s) * 0.5;
              const smokeAlpha = 0.2 - s * 0.035;
              const smokeColor = s < 2 ? 0x555555 : s < 4 ? 0x777777 : 0x999999;
              g.circle(nx + dx * sd * cs * 0.35, ny + dy * sd * cs * 0.35, smokeSize)
                .fill({ color: smokeColor, alpha: smokeAlpha });
            }
            // Ember sparks from nostrils
            const emberPhase = t * 8 + n * 3;
            const ed = (emberPhase % 1.5) / 1.5;
            if (ed < 0.8) {
              const ex = nx + dx * ed * cs * 0.4 + Math.sin(emberPhase * 3) * 2;
              const ey = ny + dy * ed * cs * 0.4 + Math.cos(emberPhase * 2.5) * 1.5;
              g.circle(ex, ey, 1.5 * (1 - ed)).fill({ color: 0xff6600, alpha: 0.4 * (1 - ed) });
              g.circle(ex, ey, 0.8 * (1 - ed)).fill({ color: 0xffcc00, alpha: 0.3 * (1 - ed) });
            }
          }
        }

        // Mouth — opens when food is nearby
        const mouthOpen = this._isFoodNearby(state, 2);
        if (mouthOpen) {
          const jawSize = headR * 0.35;
          // Upper jaw
          g.moveTo(cx + dx * headR * 0.6 + px * jawSize, cy + dy * headR * 0.6 + py * jawSize)
            .lineTo(cx + dx * headR * 1.0, cy + dy * headR * 1.0)
            .lineTo(cx + dx * headR * 0.6 - px * jawSize, cy + dy * headR * 0.6 - py * jawSize)
            .closePath().fill(0x8a6a1a);
          // Inner mouth (dark red)
          g.circle(cx + dx * headR * 0.55, cy + dy * headR * 0.55, jawSize * 0.6).fill(0x440000);
          // Teeth
          for (let ti = -1; ti <= 1; ti += 2) {
            g.circle(cx + dx * headR * 0.75 + px * ti * jawSize * 0.3,
                     cy + dy * headR * 0.75 + py * ti * jawSize * 0.3, 1.5).fill(0xeeeecc);
          }
        }

        // Eyes — glowing with light bloom and iris detail
        const eyeOff = headR * 0.35;
        const eyeGlow = 0.18 + Math.sin(t * 3) * 0.06 + Math.sin(t * 7.1) * 0.03;
        const drawEye = (side: number) => {
          const ex = cx + dx * eyeOff + px * eyeOff * 0.6 * side;
          const ey = cy + dy * eyeOff + py * eyeOff * 0.6 * side;
          // Outermost bloom (light spill on face)
          g.circle(ex, ey, 8).fill({ color: 0xff0000, alpha: eyeGlow * 0.6 });
          // Mid bloom
          g.circle(ex, ey, 6).fill({ color: 0xff1100, alpha: eyeGlow });
          // Eye socket shadow
          g.circle(ex, ey, 4.2).fill({ color: 0x220000, alpha: 0.3 });
          // Eye base (dark red sclera)
          g.circle(ex, ey, 3.8).fill(0xaa0000);
          // Iris (brighter, pulsing)
          g.circle(ex, ey, 2.8).fill(0xdd1111);
          // Inner iris ring
          g.circle(ex, ey, 2.0).fill(0xff2222);
          // Bright pupil slit (vertical cat-eye)
          const slitH = 2.5 + Math.sin(t * 2) * 0.3; // pupil dilates slightly
          g.rect(ex - 0.6, ey - slitH / 2, 1.2, slitH).fill(0xff4444);
          // Specular highlight (top-left)
          g.circle(ex + 1.2, ey - 1.2, 1.3).fill({ color: 0xffdddd, alpha: 0.7 });
          // Secondary smaller specular
          g.circle(ex - 0.8, ey + 0.8, 0.7).fill({ color: 0xffcccc, alpha: 0.35 });
        };
        drawEye(1);
        drawEye(-1);

        // Eye glow trail (faint streaks behind eyes when moving)
        if (state.moveFraction > 0.1 || state.speedBoostTimer > 0) {
          const trailLen = state.speedBoostTimer > 0 ? 3 : 2;
          for (let et = 1; et <= trailLen; et++) {
            const ta = 0.12 - et * 0.035;
            if (ta <= 0) break;
            const etOff = et * 3;
            g.circle(cx + dx * eyeOff + px * eyeOff * 0.6 - dx * etOff, cy + dy * eyeOff + py * eyeOff * 0.6 - dy * etOff, 2.5 - et * 0.3)
              .fill({ color: 0xff0000, alpha: ta });
            g.circle(cx + dx * eyeOff - px * eyeOff * 0.6 - dx * etOff, cy + dy * eyeOff - py * eyeOff * 0.6 - dy * etOff, 2.5 - et * 0.3)
              .fill({ color: 0xff0000, alpha: ta });
          }
        }

        // Power auras
        if (state.fireBreathTimer > 0) {
          g.circle(cx, cy, headR * 1.5).fill({ color: 0xff6600, alpha: 0.2 + Math.sin(t * 10) * 0.12 });
          g.circle(cx, cy, headR * 1.2).fill({ color: 0xff4400, alpha: 0.08 });
        }
        if (state.speedBoostTimer > 0) {
          g.circle(cx, cy, headR * 1.3).fill({ color: 0x00ccff, alpha: 0.12 + Math.sin(t * 8) * 0.06 });
        }
        // Magnet boost aura
        if (state.magnetBoostTimer > 0) {
          const mPulse = 0.1 + Math.sin(t * 7) * 0.05;
          g.circle(cx, cy, headR * 1.6).fill({ color: B.COLOR_MAGNET, alpha: mPulse });
        }
        // Grace period (invulnerability flash)
        if (state.gracePeriod > 0) {
          const flash = Math.sin(t * 20) > 0 ? 0.25 : 0.05;
          g.circle(cx, cy, headR * 1.4).fill({ color: B.COLOR_GRACE, alpha: flash });
        }
        // Combo invulnerability (golden glow)
        if (state.comboInvulnTimer > 0) {
          const glow = 0.15 + Math.sin(t * 6) * 0.1;
          g.circle(cx, cy, headR * 1.8).fill({ color: B.COLOR_COMBO_INVULN, alpha: glow });
          g.setStrokeStyle({ width: 2, color: B.COLOR_COMBO_INVULN, alpha: glow * 2 });
          g.circle(cx, cy, headR * 1.5).stroke();
        }
        // Wrath mode (red/orange inferno aura)
        if (state.wrathTimer > 0) {
          const wrathGlow = 0.15 + Math.sin(t * 10) * 0.1;
          g.circle(cx, cy, headR * 2.0).fill({ color: B.COLOR_WRATH, alpha: wrathGlow * 0.5 });
          g.circle(cx, cy, headR * 1.5).fill({ color: 0xff6600, alpha: wrathGlow });
        }
      } else {
        // ===== BODY SEGMENTS =====
        const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;
        const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
        const bodyR = half * taperFactor;

        // Segment shadow (offset, subtle)
        g.circle(cx + 1, cy + 1.5, bodyR).fill({ color: 0x000000, alpha: 0.08 });
        // Main segment fill
        g.circle(cx, cy, bodyR).fill(color);
        // Rim light (3D depth — edge highlight)
        g.setStrokeStyle({ width: 0.8, color: 0xffffff, alpha: 0.04 });
        g.circle(cx, cy, bodyR * 0.92).stroke();

        // Belly highlight (lighter underside — more pronounced)
        const bellyDir = state.direction;
        const bellyDx = -DIR_DX[bellyDir] * bodyR * 0.25;
        const bellyDy = -DIR_DY[bellyDir] * bodyR * 0.25;
        g.circle(cx + bellyDx, cy + bellyDy, bodyR * 0.5)
          .fill({ color: 0xffffff, alpha: 0.08 });
        // Secondary belly highlight (softer, wider)
        g.circle(cx + bellyDx * 0.7, cy + bellyDy * 0.7, bodyR * 0.35)
          .fill({ color: 0xffffff, alpha: 0.04 });

        // Overlapping diamond scale pattern on every segment
        if (cs > 8) {
          const scaleSize = bodyR * 0.35;
          // Draw 4-5 overlapping diamond scales across the segment
          const scaleCount = Math.max(2, Math.floor(bodyR / 4));
          for (let sc = 0; sc < scaleCount; sc++) {
            const angle = (sc / scaleCount) * Math.PI * 2 + i * 0.7;
            const scx = cx + Math.cos(angle) * bodyR * 0.4;
            const scy = cy + Math.sin(angle) * bodyR * 0.4;
            const ss = scaleSize * (0.7 + (sc % 2) * 0.3);
            // Diamond scale shape
            g.moveTo(scx, scy - ss).lineTo(scx + ss * 0.55, scy)
              .lineTo(scx, scy + ss * 0.7).lineTo(scx - ss * 0.55, scy)
              .closePath().fill({ color: 0x000000, alpha: 0.07 });
            // Scale highlight edge (top of each scale catches light)
            g.moveTo(scx - ss * 0.4, scy - ss * 0.15).lineTo(scx, scy - ss)
              .lineTo(scx + ss * 0.4, scy - ss * 0.15)
              .fill({ color: 0xffffff, alpha: 0.04 });
          }
        }

        // Tier-specific scale patterns (layered on top of base scales)
        if (cs > 10) {
          const tier = state.lastColorTier;
          if (tier <= 1) {
            // Hatchling/Drake: simple spine dots
            if (i % 2 === 0) g.circle(cx, cy, bodyR * 0.2).fill({ color: 0x000000, alpha: 0.12 });
          } else if (tier === 2) {
            // Fire Drake: flame-like scale marks with ember glow
            if (i % 2 === 0) {
              g.circle(cx, cy, bodyR * 0.25).fill({ color: 0x331100, alpha: 0.15 });
              if (i % 4 === 0) {
                const fa = t * 3 + i;
                g.circle(cx + Math.sin(fa) * bodyR * 0.2, cy + Math.cos(fa) * bodyR * 0.2, bodyR * 0.15)
                  .fill({ color: 0xff4400, alpha: 0.08 });
                // Ember glow between scales
                g.circle(cx + Math.cos(fa * 1.3) * bodyR * 0.3, cy + Math.sin(fa * 1.3) * bodyR * 0.3, bodyR * 0.08)
                  .fill({ color: 0xff8800, alpha: 0.12 + Math.sin(t * 6 + i) * 0.06 });
              }
            }
          } else if (tier === 3) {
            // Elder Wyrm: mystic rune marks with arcane glow
            if (i % 3 === 0) {
              g.circle(cx, cy, bodyR * 0.25).fill({ color: 0x220044, alpha: 0.15 });
              g.setStrokeStyle({ width: 0.8, color: 0xcc44ff, alpha: 0.1 });
              g.circle(cx, cy, bodyR * 0.4).stroke();
              // Rune line marks
              const ra = t * 0.5 + i * 1.1;
              g.setStrokeStyle({ width: 0.6, color: 0xaa44dd, alpha: 0.08 });
              g.moveTo(cx - bodyR * 0.3, cy).lineTo(cx + Math.cos(ra) * bodyR * 0.3, cy + Math.sin(ra) * bodyR * 0.3).stroke();
            }
          } else if (tier === 4) {
            // Ancient Wyrm: golden scale highlights with shimmer
            if (i % 2 === 0) {
              g.circle(cx, cy, bodyR * 0.2).fill({ color: 0x000000, alpha: 0.1 });
              const shimmer = 0.08 + Math.sin(t * 5 + i * 0.8) * 0.04;
              g.circle(cx - bodyR * 0.1, cy - bodyR * 0.1, bodyR * 0.15)
                .fill({ color: 0xffd700, alpha: shimmer });
              g.circle(cx + bodyR * 0.15, cy + bodyR * 0.05, bodyR * 0.1)
                .fill({ color: 0xffee88, alpha: shimmer * 0.6 });
            }
          } else {
            // Wyrm Lord: crimson pulsing marks with veined glow
            if (i % 2 === 0) {
              const crimPulse = 0.08 + Math.sin(t * 4 + i * 0.3) * 0.04;
              g.circle(cx, cy, bodyR * 0.3).fill({ color: 0xff0022, alpha: crimPulse });
              // Vein-like lines radiating outward
              for (let v = 0; v < 3; v++) {
                const va = t * 0.3 + v * Math.PI * 2 / 3 + i * 0.5;
                g.setStrokeStyle({ width: 0.6, color: 0xff2244, alpha: crimPulse * 0.6 });
                g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * bodyR * 0.5, cy + Math.sin(va) * bodyR * 0.5).stroke();
              }
            }
          }
        }

        // Wrath mode body glow — every segment pulses red
        if (state.wrathTimer > 0 && i % 2 === 0) {
          const wrathPulse = 0.08 + Math.sin(t * 8 + i * 0.5) * 0.05;
          g.circle(cx, cy, bodyR * 1.4).fill({ color: B.COLOR_WRATH, alpha: wrathPulse });
        }

        // Shield glow on body
        if (state.shieldHits > 0 && i % 4 === 0) {
          g.circle(cx, cy, bodyR * 1.3).fill({ color: B.COLOR_SHIELD, alpha: 0.05 });
        }
      }
    }

    // Tail tip — small pointed triangle at the end with spike detail
    if (state.body.length >= 2) {
      const last = positions[positions.length - 1];
      const prev = positions[positions.length - 2];
      const tdx = last.x - prev.x;
      const tdy = last.y - prev.y;
      const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const nx = tdx / tlen;
      const ny = tdy / tlen;
      const tipLen = half * 0.75;
      const tailWidth = 4.5;
      // Tail shadow
      g.moveTo(last.x + nx * tipLen + 1.5, last.y + ny * tipLen + 1.5)
        .lineTo(last.x - ny * tailWidth + 1.5, last.y + nx * tailWidth + 1.5)
        .lineTo(last.x + ny * tailWidth + 1.5, last.y - nx * tailWidth + 1.5)
        .closePath().fill({ color: 0x000000, alpha: 0.15 });
      // Tail spike base
      g.moveTo(last.x + nx * tipLen, last.y + ny * tipLen)
        .lineTo(last.x - ny * tailWidth, last.y + nx * tailWidth)
        .lineTo(last.x + ny * tailWidth, last.y - nx * tailWidth)
        .closePath().fill(wyrmCol.bodyAlt);
      // Tail spike darker edge (depth)
      g.moveTo(last.x + nx * tipLen, last.y + ny * tipLen)
        .lineTo(last.x - ny * tailWidth * 0.7, last.y + nx * tailWidth * 0.7)
        .lineTo(last.x, last.y)
        .closePath().fill({ color: 0x000000, alpha: 0.1 });
      // Tail spike highlight ridge
      g.setStrokeStyle({ width: 1, color: wyrmCol.head, alpha: 0.3, cap: "round" });
      g.moveTo(last.x, last.y).lineTo(last.x + nx * tipLen * 0.7, last.y + ny * tipLen * 0.7).stroke();
      // Tail tip bright point
      g.circle(last.x + nx * tipLen * 0.6, last.y + ny * tipLen * 0.6, 2)
        .fill({ color: wyrmCol.head, alpha: 0.45 });
      g.circle(last.x + nx * tipLen * 0.8, last.y + ny * tipLen * 0.8, 1)
        .fill({ color: 0xffffff, alpha: 0.25 });
    }
  }

  // ---------------------------------------------------------------------------
  // Death segments (scattered body parts) — with rotation feel
  // ---------------------------------------------------------------------------

  private _drawDeathSegments(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;

    for (const seg of state.deathSegments) {
      const alpha = seg.life / B.DEATH_SEGMENT_LIFETIME;
      const px = ox + seg.x * cs + half;
      const py = oy + seg.y * cs + half;
      const r = half * seg.radius * alpha;

      // Smoke trail (fading behind each piece — longer, more visible)
      const trailAlpha = alpha * 0.1;
      for (let st = 1; st <= 3; st++) {
        const stAlpha = trailAlpha * (1.0 - st * 0.25);
        if (stAlpha > 0.01) {
          g.circle(px - seg.vx * 0.003 * st, py - seg.vy * 0.003 * st, Math.max(r * (1.0 + st * 0.3), 3))
            .fill({ color: 0x333333, alpha: stAlpha });
        }
      }

      // Outer glow — larger, softer, with warm tint
      g.circle(px, py, Math.max(r * 2.5, 5)).fill({ color: seg.color, alpha: alpha * 0.06 });
      g.circle(px, py, Math.max(r * 2.0, 4)).fill({ color: seg.color, alpha: alpha * 0.12 });
      // Mid glow
      g.circle(px, py, Math.max(r * 1.4, 3)).fill({ color: seg.color, alpha: alpha * 0.2 });
      // Main piece
      g.circle(px, py, Math.max(r, 2)).fill({ color: seg.color, alpha });
      // Fire-hot rim (burning edge)
      if (alpha > 0.3 && r > 2) {
        g.setStrokeStyle({ width: 1, color: 0xff6600, alpha: alpha * 0.3 });
        g.circle(px, py, Math.max(r * 0.9, 2)).stroke();
      }
      // Bright hot core
      g.circle(px, py, Math.max(r * 0.45, 1.2)).fill({ color: 0xffffff, alpha: alpha * 0.4 });

      // Ember sparks around each piece (more sparks, with trails)
      if (alpha > 0.4 && r > 2) {
        for (let sp = 0; sp < 2; sp++) {
          const sparkA = seg.rotation + state.time * (8 + sp * 3) + sp * 2.5;
          const sparkR = r * (1.3 + sp * 0.4);
          const sx = px + Math.cos(sparkA) * sparkR;
          const sy = py + Math.sin(sparkA) * sparkR;
          g.circle(sx, sy, 1.2).fill({ color: 0xffaa00, alpha: alpha * 0.45 });
          // Spark trail
          g.circle(sx - Math.cos(sparkA) * 2, sy - Math.sin(sparkA) * 2, 0.8)
            .fill({ color: 0xff6600, alpha: alpha * 0.2 });
        }
      }
    }

    // Central death shockwave (brief expanding ring at start)
    if (state.phase === WyrmPhase.DEAD && state.deathSegments.length > 0) {
      const elapsed = B.DEATH_SEGMENT_LIFETIME - state.deathSegments[0].life;
      if (elapsed < 0.4) {
        const ringAlpha = (1.0 - elapsed / 0.4) * 0.2;
        const ringRadius = elapsed * 200;
        g.setStrokeStyle({ width: 2, color: 0xff4400, alpha: ringAlpha });
        const headSeg = state.deathSegments[0];
        g.circle(ox + headSeg.x * cs + half, oy + headSeg.y * cs + half, ringRadius).stroke();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fire breath — enhanced with embers, smoke, and heat layers
  // ---------------------------------------------------------------------------

  private _drawFireBreath(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];
    const t = state.time;

    for (let r = 1; r <= B.FIRE_BREATH_RANGE; r++) {
      const fx = head.x + dx * r;
      const fy = head.y + dy * r;
      const cx = ox + fx * cs + half;
      const cy = oy + fy * cs + half;
      const flicker = Math.sin(this._fireFlicker + r * 2) * 0.15;
      const alpha = (0.75 - r * 0.1) + flicker;
      const radius = half * (1.35 - r * 0.08);
      const px = -dy;
      const py = dx;
      const spread = r * 0.35;
      const distFade = 1.0 - r / (B.FIRE_BREATH_RANGE + 1); // fade with distance

      // Heat distortion haze (outermost, very subtle)
      g.circle(cx, cy, radius * 2.8).fill({ color: 0xff1100, alpha: alpha * 0.04 * distFade });
      g.circle(cx, cy, radius * 2.2).fill({ color: 0xff2200, alpha: alpha * 0.08 * distFade });

      // Ground/wall heat scorch glow
      g.circle(cx, cy, radius * 1.8).fill({ color: 0x441100, alpha: alpha * 0.12 });

      // Side flames (wider spread, more turbulent)
      const sideFlicker = Math.sin(this._fireFlicker * 2.3 + r * 3.1) * 0.3;
      g.circle(cx + px * spread * cs, cy + py * spread * cs, radius * (0.85 + sideFlicker * 0.2))
        .fill({ color: 0xff3300, alpha: alpha * 0.3 });
      g.circle(cx - px * spread * cs, cy - py * spread * cs, radius * (0.85 - sideFlicker * 0.15))
        .fill({ color: 0xff3300, alpha: alpha * 0.3 });
      // Secondary side tongues
      g.circle(cx + px * spread * cs * 0.6, cy + py * spread * cs * 0.6, radius * 0.5)
        .fill({ color: 0xff5500, alpha: alpha * 0.25 });
      g.circle(cx - px * spread * cs * 0.6, cy - py * spread * cs * 0.6, radius * 0.5)
        .fill({ color: 0xff5500, alpha: alpha * 0.25 });

      // Core fire — realistic color gradient (dark red -> red -> orange -> yellow -> white)
      g.circle(cx, cy, radius * 1.6).fill({ color: 0xcc1100, alpha: alpha * 0.18 }); // deep red outer
      g.circle(cx, cy, radius * 1.3).fill({ color: 0xff2200, alpha: alpha * 0.25 }); // red
      g.circle(cx, cy, radius).fill({ color: 0xff5500, alpha: alpha * 0.85 });       // orange
      g.circle(cx, cy, radius * 0.7).fill({ color: 0xff8800, alpha: alpha * 0.9 });  // bright orange
      g.circle(cx, cy, radius * 0.45).fill({ color: 0xffbb33, alpha: alpha * 0.85 }); // yellow-orange
      g.circle(cx, cy, radius * 0.25).fill({ color: 0xffdd66, alpha: alpha * 0.7 }); // yellow
      g.circle(cx, cy, radius * 0.12).fill({ color: 0xffeeaa, alpha: alpha * 0.6 }); // white-hot core

      // Ember sparks around fire — more, with trails
      for (let e = 0; e < 5; e++) {
        const ea = this._fireFlicker * 3 + e * 1.4 + r * 1.2;
        const er = radius * (0.9 + Math.sin(ea) * 0.7);
        const ex = cx + Math.cos(ea) * er + px * Math.sin(ea * 0.7) * spread * cs * 0.3;
        const ey = cy + Math.sin(ea) * er + py * Math.sin(ea * 0.7) * spread * cs * 0.3;
        const emberSize = 1.8 - r * 0.15;
        if (emberSize > 0.3) {
          // Ember glow
          g.circle(ex, ey, emberSize * 2.5).fill({ color: 0xff6600, alpha: alpha * 0.12 });
          // Ember core
          g.circle(ex, ey, emberSize).fill({ color: 0xffcc00, alpha: alpha * 0.55 });
          // Ember trail
          const trDx = -Math.cos(ea) * 3;
          const trDy = -Math.sin(ea) * 3;
          g.circle(ex + trDx, ey + trDy, emberSize * 0.6).fill({ color: 0xff8800, alpha: alpha * 0.25 });
          g.circle(ex + trDx * 2, ey + trDy * 2, emberSize * 0.3).fill({ color: 0xff4400, alpha: alpha * 0.12 });
        }
      }

      // Turbulent fire wisps (random bright spots that flicker)
      if (r <= 3) {
        for (let w = 0; w < 2; w++) {
          const wa = t * 12 + w * 3.7 + r * 2.3;
          const wLife = (wa % 0.5) / 0.5;
          const wx = cx + Math.sin(wa * 2.1) * radius * 0.5;
          const wy = cy + Math.cos(wa * 1.7) * radius * 0.5;
          const wAlpha = (1.0 - wLife) * alpha * 0.4;
          if (wAlpha > 0.02) {
            g.circle(wx, wy, 3 - wLife * 2).fill({ color: 0xffee66, alpha: wAlpha });
          }
        }
      }
    }

    // Smoke trail behind the fire — more layers, dissipating smoke
    for (let s = 1; s <= 3; s++) {
      const sx = head.x - dx * s;
      const sy = head.y - dy * s;
      const scx = ox + sx * cs + half;
      const scy = oy + sy * cs + half;
      const smokeAlpha = 0.08 - s * 0.02;
      if (smokeAlpha > 0) {
        // Dark smoke
        g.circle(scx + Math.sin(t * 3 + s) * 2, scy + Math.cos(t * 2.5 + s) * 2, half * (0.9 + s * 0.15))
          .fill({ color: 0x333333, alpha: smokeAlpha });
        // Lighter smoke wisps
        g.circle(scx + Math.sin(t * 4 + s * 2) * 3, scy - 2, half * 0.5)
          .fill({ color: 0x555555, alpha: smokeAlpha * 0.5 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Speed lines — enhanced with more dynamic streaks
  // ---------------------------------------------------------------------------

  private _drawSpeedLines(g: Graphics, state: WyrmState): void {
    if (state.body.length === 0) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half;
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];
    const px = -dy, py = dx;

    // Speed factor: 0 at base speed, 1 at max speed, boosted = extra
    const speedFactor = Math.min(1.0, (B.START_MOVE_INTERVAL - state.moveInterval) / (B.START_MOVE_INTERVAL - B.MIN_MOVE_INTERVAL));
    const boosted = state.speedBoostTimer > 0;
    const wrath = state.wrathTimer > 0;

    // Subtle motion lines scale with speed (always visible at length > 8)
    if (state.length > 8 || boosted || wrath) {
      const lineCount = boosted ? 8 : wrath ? 6 : Math.floor(2 + speedFactor * 4);
      const lineAlphaBase = boosted ? 0.25 : wrath ? 0.15 : 0.04 + speedFactor * 0.08;
      const lineColor = wrath ? B.COLOR_WRATH : boosted ? 0x00ccff : 0x888888;

      for (let i = 0; i < lineCount; i++) {
        const offset = (Math.random() - 0.5) * cs * (boosted ? 2.5 : 1.5 + speedFactor);
        const sx = hx + px * offset - dx * cs * (1 + Math.random() * 2);
        const sy = hy + py * offset - dy * cs * (1 + Math.random() * 2);
        const lineLen = cs * (0.5 + Math.random() * (boosted ? 1.5 : 0.5 + speedFactor));
        const alpha = lineAlphaBase + Math.random() * lineAlphaBase;
        g.setStrokeStyle({ width: boosted ? 1.5 : 1, color: lineColor, alpha });
        g.moveTo(sx, sy).lineTo(sx - dx * lineLen, sy - dy * lineLen).stroke();
      }
    }

    // Speed boost aura (only during actual boost)
    if (boosted) {
      g.circle(hx, hy, half * 1.8).fill({ color: 0x00ccff, alpha: 0.05 });
    }
  }

  // ---------------------------------------------------------------------------
  // Danger warning — enhanced with pulsing gradient
  // ---------------------------------------------------------------------------

  private _drawDangerWarning(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    const dist = distanceToObstacle(state);
    if (dist > B.DANGER_DISTANCE) return;

    const intensity = 1.0 - (dist - 1) / B.DANGER_DISTANCE;
    const alpha = intensity * 0.35 * (0.5 + Math.sin(state.time * 12) * 0.5);
    const t = state.time;

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];
    const stripeW = 8;

    // Main danger stripe with gradient falloff
    if (dy === -1) {
      g.rect(ox, oy, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha });
      g.rect(ox, oy + stripeW, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.35 });
      g.rect(ox, oy + stripeW * 2, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.12 });
    } else if (dy === 1) {
      const base = oy + state.rows * cs - stripeW;
      g.rect(ox, base, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha });
      g.rect(ox, base - stripeW, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.35 });
      g.rect(ox, base - stripeW * 2, state.cols * cs, stripeW).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.12 });
    } else if (dx === -1) {
      g.rect(ox, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha });
      g.rect(ox + stripeW, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.35 });
      g.rect(ox + stripeW * 2, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.12 });
    } else if (dx === 1) {
      const base = ox + state.cols * cs - stripeW;
      g.rect(base, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha });
      g.rect(base - stripeW, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.35 });
      g.rect(base - stripeW * 2, oy, stripeW, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.12 });
    }

    // Vignette darkening during danger — corners and edges darken
    if (intensity > 0.2) {
      const vigAlpha = (intensity - 0.2) * 0.15;
      const vigSize = 80 + intensity * 60;
      const dsw = this._sw, dsh = this._sh;
      g.rect(0, 0, vigSize, dsh).fill({ color: 0x000000, alpha: vigAlpha });
      g.rect(dsw - vigSize, 0, vigSize, dsh).fill({ color: 0x000000, alpha: vigAlpha });
      g.rect(0, 0, dsw, vigSize).fill({ color: 0x000000, alpha: vigAlpha * 0.7 });
      g.rect(0, dsh - vigSize, dsw, vigSize).fill({ color: 0x000000, alpha: vigAlpha * 0.7 });
    }

    // Animated chevron arrows pointing inward along danger edge
    if (intensity > 0.3) {
      const head = state.body[0];
      const hx = ox + head.x * cs + cs / 2;
      const hy = oy + head.y * cs + cs / 2;
      const chevronCount = 3;
      for (let c = 0; c < chevronCount; c++) {
        const phase = (t * 4 + c * 1.2) % 3.0;
        const chevAlpha = alpha * 0.6 * Math.max(0, 1.0 - phase);
        if (chevAlpha < 0.02) continue;
        const offset = phase * cs * 1.5;

        if (dy !== 0) {
          // Horizontal edge — draw chevrons at wyrm's x position
          const chevY = dy === -1 ? oy + offset : oy + state.rows * cs - offset;
          g.moveTo(hx - 8, chevY + dy * 4).lineTo(hx, chevY).lineTo(hx + 8, chevY + dy * 4)
            .fill({ color: B.COLOR_DANGER, alpha: chevAlpha });
        } else {
          const chevX = dx === -1 ? ox + offset : ox + state.cols * cs - offset;
          g.moveTo(chevX + dx * 4, hy - 8).lineTo(chevX, hy).lineTo(chevX + dx * 4, hy + 8)
            .fill({ color: B.COLOR_DANGER, alpha: chevAlpha });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boss knight — enhanced with more menacing details
  // ---------------------------------------------------------------------------

  private _drawBoss(g: Graphics, state: WyrmState): void {
    const boss = state.boss;
    if (!boss || !boss.alive) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    const cx = ox + boss.x * cs + half;
    const cy = oy + boss.y * cs + half;
    const r = half * 1.1;

    // Determine boss-type-specific colors
    const bType = boss.bossType || "charger";
    const hpRatio = boss.hp / boss.maxHp;
    let bossColor: number = B.COLOR_BOSS;
    let auraColor: number = B.COLOR_BOSS;
    let eyeColor: number = 0xff4444;
    if (bType === "summoner") {
      bossColor = boss.flashTimer > 0 ? 0xffffff : 0x9944cc;
      auraColor = 0x8833bb;
      eyeColor = 0xcc66ff;
    } else if (bType === "berserker") {
      // Red intensifies as HP drops
      const rIntensity = Math.floor(0x88 + (1.0 - hpRatio) * 0x77);
      bossColor = boss.flashTimer > 0 ? 0xffffff : (rIntensity << 16) | 0x001100;
      auraColor = 0xcc2200;
      eyeColor = 0xff6622;
    }

    // Danger aura — multi-layered
    const aura = 0.12 + Math.sin(t * 3) * 0.06;
    g.circle(cx, cy, r * 2.5).fill({ color: auraColor, alpha: aura * 0.5 });
    g.circle(cx, cy, r * 2.0).fill({ color: auraColor, alpha: aura });

    // Summoner boss: summoning circle on ground
    if (bType === "summoner") {
      const circleAlpha = 0.08 + Math.sin(t * 2) * 0.04;
      // Rotating magic circle
      for (let ring = 0; ring < 2; ring++) {
        const ringR = r * (2.2 + ring * 0.6);
        const segments = 8;
        for (let s = 0; s < segments; s++) {
          const a1 = (s / segments) * Math.PI * 2 + t * (1.5 + ring) * (ring % 2 ? -1 : 1);
          const a2 = ((s + 0.5) / segments) * Math.PI * 2 + t * (1.5 + ring) * (ring % 2 ? -1 : 1);
          g.setStrokeStyle({ width: 1, color: 0xaa66dd, alpha: circleAlpha + ring * 0.03 });
          g.moveTo(cx + Math.cos(a1) * ringR, cy + Math.sin(a1) * ringR)
            .lineTo(cx + Math.cos(a2) * ringR, cy + Math.sin(a2) * ringR).stroke();
        }
      }
      // Summoning rune particles
      for (let s = 0; s < 6; s++) {
        const sa = t * 2 + s * Math.PI / 3;
        const sr = r * 1.8;
        const pa = 0.2 + Math.sin(t * 4 + s * 2) * 0.15;
        g.circle(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 2.5).fill({ color: 0xcc88ff, alpha: pa });
        // Rising particles from circle
        const ry = cy + Math.sin(sa) * sr - ((t * 15 + s * 10) % 20);
        g.circle(cx + Math.cos(sa) * sr, ry, 1.5).fill({ color: 0xaa66dd, alpha: pa * 0.5 });
      }
    }

    // Berserker boss: speed lines when enraged (low HP)
    if (bType === "berserker" && hpRatio < 0.5) {
      const lineAlpha = (0.5 - hpRatio) * 0.4;
      for (let s = 0; s < 6; s++) {
        const sa = t * 8 + s * Math.PI / 3;
        const sr1 = r * 1.3;
        const sr2 = r * 2.0 + Math.sin(t * 12 + s) * r * 0.3;
        g.setStrokeStyle({ width: 1.5, color: 0xff4422, alpha: lineAlpha + Math.sin(t * 10 + s * 2) * 0.1 });
        g.moveTo(cx + Math.cos(sa) * sr1, cy + Math.sin(sa) * sr1)
          .lineTo(cx + Math.cos(sa) * sr2, cy + Math.sin(sa) * sr2).stroke();
      }
      // Rage heat shimmer
      const rageAlpha = (0.5 - hpRatio) * 0.15;
      g.circle(cx, cy, r * 2.5).fill({ color: 0xff2200, alpha: rageAlpha + Math.sin(t * 6) * 0.05 });
    }

    // Shadow
    g.circle(cx + 2, cy + 3, r * 0.9).fill({ color: 0x000000, alpha: 0.2 });

    // Body with heavy armor plating
    const bodyColor = boss.flashTimer > 0 ? 0xffffff : (bType === "summoner" ? 0x9944cc : bType === "berserker" ? bossColor : B.COLOR_BOSS);
    g.circle(cx, cy, r).fill(bodyColor);

    // Armor plate segments (horizontal lines suggesting layered plate mail)
    g.circle(cx, cy, r * 0.85).fill({ color: 0x000000, alpha: 0.12 });
    g.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.08 });
    g.moveTo(cx - r * 0.7, cy - r * 0.15).lineTo(cx + r * 0.7, cy - r * 0.15).stroke();
    g.moveTo(cx - r * 0.6, cy + r * 0.2).lineTo(cx + r * 0.6, cy + r * 0.2).stroke();
    // Shoulder pauldron bumps
    g.circle(cx - r * 0.65, cy - r * 0.1, r * 0.2).fill({ color: bodyColor, alpha: 0.6 });
    g.circle(cx + r * 0.65, cy - r * 0.1, r * 0.2).fill({ color: bodyColor, alpha: 0.6 });
    g.circle(cx - r * 0.65, cy - r * 0.1, r * 0.15).fill({ color: 0xffffff, alpha: 0.06 });
    g.circle(cx + r * 0.65, cy - r * 0.1, r * 0.15).fill({ color: 0xffffff, alpha: 0.06 });
    // Shine
    g.circle(cx - r * 0.2, cy - r * 0.25, r * 0.3).fill({ color: 0xffffff, alpha: 0.12 });

    // Helmet visor (more detailed — T-shaped)
    const visorColor = bType === "summoner" ? 0x331155 : bType === "berserker" ? 0x441111 : 0x441133;
    g.rect(cx - r * 0.45, cy - r * 0.35, r * 0.9, r * 0.22).fill(visorColor);
    g.rect(cx - r * 0.07, cy - r * 0.55, r * 0.14, r * 0.35).fill(visorColor);
    // Glowing eyes behind visor with bloom
    const eyePulse = 0.7 + Math.sin(t * 6) * 0.3;
    g.circle(cx - r * 0.18, cy - r * 0.26, 4).fill({ color: eyeColor, alpha: eyePulse * 0.3 });
    g.circle(cx + r * 0.18, cy - r * 0.26, 4).fill({ color: eyeColor, alpha: eyePulse * 0.3 });
    g.circle(cx - r * 0.18, cy - r * 0.26, 2.5).fill({ color: eyeColor, alpha: eyePulse });
    g.circle(cx + r * 0.18, cy - r * 0.26, 2.5).fill({ color: eyeColor, alpha: eyePulse });

    // Intimidating aura — pulsing dark energy wisps around boss
    for (let aw = 0; aw < 4; aw++) {
      const awA = t * (2 + aw * 0.3) + aw * Math.PI / 2;
      const awR = r * (1.5 + Math.sin(t * 3 + aw) * 0.3);
      const awAlpha = 0.06 + Math.sin(t * 4 + aw * 1.5) * 0.03;
      g.circle(cx + Math.cos(awA) * awR, cy + Math.sin(awA) * awR, r * 0.3)
        .fill({ color: auraColor, alpha: awAlpha });
    }

    // HP bar above — with border
    const barW = cs * 1.2;
    const barH = 5;
    const barX = cx - barW / 2;
    const barY = cy - r - 10;
    g.rect(barX - 1, barY - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.6 });
    g.rect(barX, barY, barW, barH).fill({ color: 0x222222, alpha: 0.8 });
    g.rect(barX, barY, barW * (boss.hp / boss.maxHp), barH).fill(0xff2266);
    // HP bar shine
    g.rect(barX, barY, barW * (boss.hp / boss.maxHp), 2).fill({ color: 0xffffff, alpha: 0.15 });

    // Crown with gems
    g.moveTo(cx - r * 0.45, cy - r * 0.85).lineTo(cx - r * 0.25, cy - r * 0.55)
      .lineTo(cx - r * 0.05, cy - r * 0.95).lineTo(cx + r * 0.15, cy - r * 0.55)
      .lineTo(cx + r * 0.35, cy - r * 0.85).lineTo(cx + r * 0.45, cy - r * 0.55)
      .lineTo(cx - r * 0.45, cy - r * 0.55)
      .closePath().fill(0xffdd44);
    // Crown gems
    g.circle(cx - r * 0.05, cy - r * 0.78, 2).fill(0xff2244);
    g.circle(cx + r * 0.35, cy - r * 0.7, 1.5).fill(0x44ff44);

    // Charge indicator
    if (boss.charging) {
      const cdx = DIR_DX[boss.chargeDir];
      const cdy = DIR_DY[boss.chargeDir];
      // Direction arrow
      const arrowLen = r * 2;
      g.setStrokeStyle({ width: 3, color: 0xff4444, alpha: 0.6 + Math.sin(t * 12) * 0.3 });
      g.moveTo(cx + cdx * r, cy + cdy * r)
        .lineTo(cx + cdx * (r + arrowLen), cy + cdy * (r + arrowLen)).stroke();
      // Charge glow
      g.circle(cx, cy, r * 1.6).fill({ color: 0xff2222, alpha: 0.15 + Math.sin(t * 10) * 0.1 });
    } else if (boss.chargeTimer < 1.5) {
      // Warning: about to charge
      const warn = 0.1 + Math.sin(t * 8) * 0.08;
      g.circle(cx, cy, r * 1.8).fill({ color: 0xff8800, alpha: warn });
    }
  }

  // ---------------------------------------------------------------------------
  // Power-up timer bars near wyrm head — with labels
  // ---------------------------------------------------------------------------

  private _drawPowerBars(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    if (state.fireBreathTimer <= 0 && state.speedBoostTimer <= 0 && state.shieldHits <= 0) return;

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half - half * 1.4;
    const barW = cs * 1.2;
    const barH = 3;
    let yOff = 0;

    if (state.fireBreathTimer > 0) {
      const fill = state.fireBreathTimer / B.FIRE_BREATH_DURATION;
      g.rect(hx - barW / 2 - 1, hy - yOff - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
      g.rect(hx - barW / 2, hy - yOff, barW * fill, barH).fill({ color: B.COLOR_FIRE_SCROLL, alpha: 0.9 });
      yOff += barH + 3;
    }
    if (state.speedBoostTimer > 0) {
      const fill = state.speedBoostTimer / B.SPEED_BOOST_DURATION;
      g.rect(hx - barW / 2 - 1, hy - yOff - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
      g.rect(hx - barW / 2, hy - yOff, barW * fill, barH).fill({ color: B.COLOR_POTION, alpha: 0.9 });
      yOff += barH + 3;
    }
    if (state.shieldHits > 0) {
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: B.COLOR_SHIELD, alpha: 0.6 });
      yOff += barH + 3;
    }
    if (state.magnetBoostTimer > 0) {
      const fill = state.magnetBoostTimer / B.MAGNET_BOOST_DURATION;
      g.rect(hx - barW / 2 - 1, hy - yOff - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
      g.rect(hx - barW / 2, hy - yOff, barW * fill, barH).fill({ color: B.COLOR_MAGNET, alpha: 0.9 });
    }
  }

  // ---------------------------------------------------------------------------
  // Slow-mo vignette — enhanced with more cinematic look
  // ---------------------------------------------------------------------------

  private _drawSlowMoVignette(g: Graphics, state: WyrmState): void {
    const alpha = 0.2 * (state.slowMoTimer / B.SLOW_MO_DURATION);
    const sw = this._sw, sh = this._sh;
    const thickness = 40;
    g.rect(0, 0, sw, thickness).fill({ color: 0x000000, alpha });
    g.rect(0, sh - thickness, sw, thickness).fill({ color: 0x000000, alpha });
    g.rect(0, 0, thickness, sh).fill({ color: 0x000000, alpha });
    g.rect(sw - thickness, 0, thickness, sh).fill({ color: 0x000000, alpha });
    // Inner softer edge
    g.rect(0, thickness, sw, thickness * 0.5).fill({ color: 0x000000, alpha: alpha * 0.4 });
    g.rect(0, sh - thickness - thickness * 0.5, sw, thickness * 0.5).fill({ color: 0x000000, alpha: alpha * 0.4 });
  }

  // ---------------------------------------------------------------------------
  // Wrath mode screen vignette — red pulsing edges
  // ---------------------------------------------------------------------------

  private _drawWrathVignette(g: Graphics, state: WyrmState): void {
    const sw = this._sw, sh = this._sh;
    const t = state.time;
    const pulse = 0.08 + Math.sin(t * 6) * 0.04;
    const thickness = 25;
    // Red-tinted edges
    g.rect(0, 0, sw, thickness).fill({ color: B.COLOR_WRATH, alpha: pulse });
    g.rect(0, sh - thickness, sw, thickness).fill({ color: B.COLOR_WRATH, alpha: pulse });
    g.rect(0, 0, thickness, sh).fill({ color: B.COLOR_WRATH, alpha: pulse });
    g.rect(sw - thickness, 0, thickness, sh).fill({ color: B.COLOR_WRATH, alpha: pulse });
    // Softer inner edge
    g.rect(0, thickness, sw, thickness * 0.6).fill({ color: B.COLOR_WRATH, alpha: pulse * 0.3 });
    g.rect(0, sh - thickness - thickness * 0.6, sw, thickness * 0.6).fill({ color: B.COLOR_WRATH, alpha: pulse * 0.3 });
    // Subtle full-screen red tint
    g.rect(0, 0, sw, sh).fill({ color: B.COLOR_WRATH, alpha: 0.02 });
  }

  // ---------------------------------------------------------------------------
  // Time warp overlay — blue-purple tint with floating clock particles
  // ---------------------------------------------------------------------------

  private _drawTimeWarpOverlay(g: Graphics, state: WyrmState): void {
    const sw = this._sw, sh = this._sh;
    const t = state.time;
    const ratio = state.timeWarpTimer / B.TIME_WARP_DURATION;
    const baseAlpha = 0.04 * ratio;

    // Screen-wide blue-purple tint
    g.rect(0, 0, sw, sh).fill({ color: 0x4422aa, alpha: baseAlpha });
    g.rect(0, 0, sw, sh).fill({ color: 0x2244cc, alpha: baseAlpha * 0.5 });

    // Pulsing edge vignette
    const edgeAlpha = (0.06 + Math.sin(t * 3) * 0.03) * ratio;
    const thickness = 20;
    g.rect(0, 0, sw, thickness).fill({ color: B.COLOR_TIME_WARP, alpha: edgeAlpha });
    g.rect(0, sh - thickness, sw, thickness).fill({ color: B.COLOR_TIME_WARP, alpha: edgeAlpha });
    g.rect(0, 0, thickness, sh).fill({ color: B.COLOR_TIME_WARP, alpha: edgeAlpha });
    g.rect(sw - thickness, 0, thickness, sh).fill({ color: B.COLOR_TIME_WARP, alpha: edgeAlpha });

    // Floating clock/hourglass particles drifting across the screen
    for (let i = 0; i < 10; i++) {
      const seed = i * 137.5;
      const px = (seed * 7.3 + t * 15 * (0.3 + (i % 3) * 0.2)) % sw;
      const py = (seed * 4.1 + Math.sin(t * 0.5 + i * 1.3) * 40 + sh * 0.5) % sh;
      const pAlpha = (0.08 + Math.sin(t * 2 + i * 2.1) * 0.04) * ratio;
      const pSize = 3 + (i % 3);

      // Small hourglass shape
      g.moveTo(px - pSize, py - pSize).lineTo(px + pSize, py - pSize).lineTo(px, py).closePath()
        .fill({ color: B.COLOR_TIME_WARP, alpha: pAlpha });
      g.moveTo(px - pSize, py + pSize).lineTo(px + pSize, py + pSize).lineTo(px, py).closePath()
        .fill({ color: B.COLOR_TIME_WARP, alpha: pAlpha * 0.8 });
      // Center dot
      g.circle(px, py, 0.8).fill({ color: 0xffffff, alpha: pAlpha * 1.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Lightning arcs — electric lines from wyrm head to zapped positions
  // ---------------------------------------------------------------------------

  private _drawLightningArcs(g: Graphics, state: WyrmState): void {
    if (state.body.length === 0) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half;
    const flashRatio = state.screenFlashTimer / (B.FLASH_DURATION * 1.5);
    const range = B.LIGHTNING_RANGE + state.lightningRangeUpgrade * 2;

    // Draw arcs to recently dead knights/archers within range (particles mark them)
    // Use particles as zap targets — they have the lightning color
    const targets: { x: number; y: number }[] = [];
    for (const p of state.particles) {
      if (p.color === B.COLOR_LIGHTNING && p.life > p.maxLife * 0.5) {
        // Avoid duplicates near same cell
        if (!targets.some(tp => Math.abs(tp.x - p.x) < 1 && Math.abs(tp.y - p.y) < 1)) {
          targets.push({ x: p.x, y: p.y });
        }
      }
    }

    // Also draw arc to dead knights in range as fallback
    for (const k of state.knights) {
      if (!k.alive) {
        const dist = Math.abs(k.x - head.x) + Math.abs(k.y - head.y);
        if (dist <= range) {
          if (!targets.some(tp => Math.abs(tp.x - k.x) < 1 && Math.abs(tp.y - k.y) < 1)) {
            targets.push({ x: k.x, y: k.y });
          }
        }
      }
    }

    // Draw electric arcs — jagged lines from head to each target
    for (const tgt of targets) {
      const tx = ox + tgt.x * cs + half;
      const ty = oy + tgt.y * cs + half;
      const arcAlpha = 0.5 * flashRatio;
      if (arcAlpha < 0.05) continue;

      // Main arc (jagged line with random offsets)
      const segments = 6;
      const dx = (tx - hx) / segments;
      const dy = (ty - hy) / segments;
      const jitter = cs * 0.3;

      // Glow arc (wider, dimmer)
      g.setStrokeStyle({ width: 4, color: B.COLOR_LIGHTNING, alpha: arcAlpha * 0.3 });
      g.moveTo(hx, hy);
      for (let s = 1; s < segments; s++) {
        const jx = (Math.sin(t * 30 + s * 7.3 + tgt.x) * jitter);
        const jy = (Math.cos(t * 30 + s * 5.1 + tgt.y) * jitter);
        g.lineTo(hx + dx * s + jx, hy + dy * s + jy);
      }
      g.lineTo(tx, ty).stroke();

      // Core arc (thin, bright white)
      g.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: arcAlpha * 0.7 });
      g.moveTo(hx, hy);
      for (let s = 1; s < segments; s++) {
        const jx = (Math.sin(t * 30 + s * 7.3 + tgt.x) * jitter * 0.7);
        const jy = (Math.cos(t * 30 + s * 5.1 + tgt.y) * jitter * 0.7);
        g.lineTo(hx + dx * s + jx, hy + dy * s + jy);
      }
      g.lineTo(tx, ty).stroke();

      // Impact flash at target
      g.circle(tx, ty, cs * 0.4).fill({ color: B.COLOR_LIGHTNING, alpha: arcAlpha * 0.3 });
      g.circle(tx, ty, cs * 0.15).fill({ color: 0xffffff, alpha: arcAlpha * 0.6 });
    }

    // Central discharge glow at wyrm head
    if (targets.length > 0) {
      g.circle(hx, hy, cs * 0.6).fill({ color: B.COLOR_LIGHTNING, alpha: 0.15 * flashRatio });
      g.circle(hx, hy, cs * 0.25).fill({ color: 0xffffff, alpha: 0.3 * flashRatio });
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: check if any pickup/knight is within N cells ahead of wyrm head
  // ---------------------------------------------------------------------------

  private _isFoodNearby(state: WyrmState, range: number): boolean {
    if (state.body.length === 0) return false;
    const head = state.body[0];
    const dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];
    for (let d = 1; d <= range; d++) {
      const nx = head.x + dx * d, ny = head.y + dy * d;
      if (state.pickups.some(p => p.x === nx && p.y === ny)) return true;
      if (state.knights.some(k => k.alive && k.x === nx && k.y === ny)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Pickup visual drift toward wyrm (magnet effect)
  // ---------------------------------------------------------------------------

  private _getPickupDrift(state: WyrmState, px: number, py: number): { dx: number; dy: number } {
    if (state.body.length === 0) return { dx: 0, dy: 0 };
    const head = state.body[0];
    const ddx = head.x - px, ddy = head.y - py;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist <= 0 || dist > state.magnetRadius) return { dx: 0, dy: 0 };
    const strength = (1.0 - dist / state.magnetRadius) * 0.3;
    return { dx: (ddx / dist) * strength * this._cellSize, dy: (ddy / dist) * strength * this._cellSize };
  }

  // ---------------------------------------------------------------------------
  // Decorative torches — with warm light pools
  // ---------------------------------------------------------------------------

  private _drawTorches(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const t = state.time;
    const gw = state.cols * cs, gh = state.rows * cs;

    const positions = [
      { x: ox + cs * 1.5, y: oy + cs * 1.5 },
      { x: ox + gw - cs * 1.5, y: oy + cs * 1.5 },
      { x: ox + cs * 1.5, y: oy + gh - cs * 1.5 },
      { x: ox + gw - cs * 1.5, y: oy + gh - cs * 1.5 },
    ];

    for (const pos of positions) {
      const flicker = Math.sin(t * 8 + pos.x * 0.1) * 2;
      const flicker2 = Math.sin(t * 11 + pos.y * 0.1) * 1.5;
      const flicker3 = Math.sin(t * 13.7 + pos.x * 0.15 + pos.y * 0.08) * 1.2;
      const flickerIntensity = 0.75 + Math.sin(t * 6 + pos.x * 0.07) * 0.15 + Math.sin(t * 9.3 + pos.y * 0.1) * 0.1;

      // Dynamic warm light pool — multi-layered radial glow (simulates light falloff)
      g.circle(pos.x, pos.y - 5 + flicker, cs * 4.5).fill({ color: 0xff4400, alpha: 0.008 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 3.5).fill({ color: 0xff5500, alpha: 0.015 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 2.8).fill({ color: 0xff6600, alpha: 0.022 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 2.0).fill({ color: 0xff7700, alpha: 0.03 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 1.3).fill({ color: 0xff8833, alpha: 0.045 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 0.7).fill({ color: 0xffaa44, alpha: 0.07 * flickerIntensity });

      // Ground light spill (warm pool on floor)
      const lightW = cs * 3.5 * flickerIntensity;
      const lightH = cs * 3.0 * flickerIntensity;
      g.rect(pos.x - lightW / 2, pos.y - lightH / 2, lightW, lightH)
        .fill({ color: 0x332200, alpha: 0.035 * flickerIntensity });
      // Tighter hot spot on floor directly below
      g.circle(pos.x, pos.y + 4, cs * 0.8).fill({ color: 0x443311, alpha: 0.03 * flickerIntensity });

      // Heat haze shimmer (subtle distortion suggestion above torch)
      for (let h = 0; h < 3; h++) {
        const hx = pos.x + Math.sin(t * 4 + h * 2.3) * 3;
        const hy = pos.y - 18 - h * 6 + flicker;
        const ha = 0.02 - h * 0.005;
        g.circle(hx, hy, 4 + h * 2).fill({ color: 0xffaa66, alpha: ha * flickerIntensity });
      }

      // Torch base — bracket with metallic detail
      g.rect(pos.x - 2, pos.y + 1, 4, 7).fill(0x3a2a12);
      g.rect(pos.x - 3, pos.y - 5, 6, 11).fill(0x5a3a1a);
      // Bracket top cap (metal ring)
      g.rect(pos.x - 4.5, pos.y - 6, 9, 2.5).fill(0x6a4a2a);
      g.rect(pos.x - 4.5, pos.y - 6, 9, 1).fill({ color: 0x8a6a3a, alpha: 0.5 }); // top highlight
      // Bracket side rivets
      g.circle(pos.x - 4, pos.y - 2, 1).fill({ color: 0x7a5a2a, alpha: 0.5 });
      g.circle(pos.x + 4, pos.y - 2, 1).fill({ color: 0x7a5a2a, alpha: 0.5 });
      // Bracket arm supports
      g.rect(pos.x - 5.5, pos.y - 4, 1.5, 5).fill({ color: 0x4a3a1a, alpha: 0.6 });
      g.rect(pos.x + 4, pos.y - 4, 1.5, 5).fill({ color: 0x4a3a1a, alpha: 0.6 });

      // Flame layers — realistic fire color gradient (dark red base -> orange -> yellow -> white tip)
      // Base (dark red, widest)
      g.circle(pos.x + flicker2 * 0.5, pos.y - 7 + flicker, 7.5).fill({ color: 0xcc1100, alpha: 0.3 });
      // Lower flame body (deep red-orange)
      g.circle(pos.x + flicker2 * 0.4, pos.y - 7.5 + flicker, 6.5).fill({ color: 0xff2200, alpha: 0.45 });
      // Mid flame (orange)
      g.circle(pos.x + flicker2 * 0.3, pos.y - 8.5 + flicker, 5.5).fill({ color: 0xff4400, alpha: 0.6 });
      // Upper mid (bright orange)
      g.circle(pos.x + flicker3 * 0.2, pos.y - 9.5 + flicker, 4.5).fill({ color: 0xff6600, alpha: 0.7 });
      // Upper flame (yellow-orange)
      g.circle(pos.x, pos.y - 10.5 + flicker, 3.5).fill({ color: 0xffaa33, alpha: 0.8 });
      // Flame tip (bright yellow)
      g.circle(pos.x - flicker3 * 0.15, pos.y - 11.5 + flicker, 2.5).fill({ color: 0xffcc44, alpha: 0.85 });
      // Hot tip (pale yellow)
      g.circle(pos.x, pos.y - 12.5 + flicker, 1.8).fill({ color: 0xffdd66, alpha: 0.9 });
      // White-hot core (tiny, brightest)
      g.circle(pos.x, pos.y - 13 + flicker, 1.0).fill({ color: 0xffeebb, alpha: 0.95 });
      // Side flame licks (occasional tongues of fire)
      const lickPhase = Math.sin(t * 7 + pos.x * 0.2);
      if (lickPhase > 0.3) {
        const lickAlpha = (lickPhase - 0.3) * 0.5;
        g.circle(pos.x + 4 + flicker2 * 0.3, pos.y - 9 + flicker, 2.5).fill({ color: 0xff5500, alpha: lickAlpha });
      }
      const lickPhase2 = Math.sin(t * 9.3 + pos.y * 0.15);
      if (lickPhase2 > 0.4) {
        const lickAlpha2 = (lickPhase2 - 0.4) * 0.4;
        g.circle(pos.x - 3.5 + flicker3 * 0.2, pos.y - 8 + flicker, 2).fill({ color: 0xff6600, alpha: lickAlpha2 });
      }

      // Sparks with ember trails (more particles, longer trails)
      for (let s = 0; s < 5; s++) {
        const sparkPhase = t * (4.5 + s * 0.7) + pos.x * (s + 1) * 0.25;
        const sparkLife = (sparkPhase % 2.0) / 2.0;
        const sparkSway = Math.sin(sparkPhase * 1.8 + s * 1.3) * (4 + s * 1.5);
        const sx = pos.x + sparkSway;
        const sy = pos.y - 14 + flicker - sparkLife * 18;
        const sparkSize = (1.0 - sparkLife) * 1.5 + 0.3;
        const sparkAlpha = (1.0 - sparkLife) * 0.55;
        if (sparkAlpha > 0.04) {
          // Spark glow
          g.circle(sx, sy, sparkSize * 2.5).fill({ color: 0xff6600, alpha: sparkAlpha * 0.15 });
          // Spark core
          g.circle(sx, sy, sparkSize).fill({ color: 0xffcc00, alpha: sparkAlpha });
          // Bright center
          if (sparkLife < 0.3) {
            g.circle(sx, sy, sparkSize * 0.5).fill({ color: 0xffeeaa, alpha: sparkAlpha * 0.7 });
          }
          // Ember trail (fading dots behind spark)
          for (let tr = 1; tr <= 4; tr++) {
            const trLife = sparkLife - tr * 0.04;
            if (trLife < 0) break;
            const trX = pos.x + Math.sin((sparkPhase - tr * 0.15) * 1.8 + s * 1.3) * (4 + s * 1.5);
            const trY = sy + tr * 3;
            const trAlpha = sparkAlpha * (0.4 - tr * 0.08);
            if (trAlpha > 0.01) {
              g.circle(trX, trY, sparkSize * (0.6 - tr * 0.1))
                .fill({ color: tr < 2 ? 0xffaa33 : 0xff6600, alpha: trAlpha });
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Poison tiles — with bubbling effect
  // ---------------------------------------------------------------------------

  private _drawPoisonTiles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    for (const p of state.poisonTiles) {
      const cx = ox + p.x * cs + half;
      const cy = oy + p.y * cs + half;
      const pulse = 0.2 + Math.sin(t * 4 + p.x + p.y) * 0.08;
      const seed = p.x * 17 + p.y * 31; // deterministic per-tile

      // Outer toxic glow with animated edge
      g.circle(cx, cy, half * 1.1 + Math.sin(t * 3 + seed) * 2).fill({ color: B.COLOR_POISON, alpha: pulse * 0.3 });
      // Main pool
      g.circle(cx, cy, half * 0.8).fill({ color: B.COLOR_POISON, alpha: pulse });
      // Inner swirling pattern — orbiting bright spots
      for (let s = 0; s < 3; s++) {
        const sa = t * 2.5 + s * Math.PI * 2 / 3 + seed;
        const sr = half * 0.35;
        g.circle(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, half * 0.2)
          .fill({ color: 0x66cc66, alpha: pulse * 0.8 });
      }
      // Bright core
      g.circle(cx, cy, half * 0.2).fill({ color: 0x88ee88, alpha: pulse + 0.15 });

      // Animated bubbles — rising and popping
      for (let b = 0; b < 3; b++) {
        const bubPhase = t * (3 + b) + seed + b * 2.3;
        const bubLife = (bubPhase % 2.0) / 2.0; // 0-1 cycle
        const bx = cx + Math.sin(seed + b * 4) * half * 0.35;
        const by = cy - bubLife * half * 0.6;
        const bubSize = (1.0 - bubLife) * 2.5 + 0.5;
        const bubAlpha = (1.0 - bubLife) * 0.4;
        g.circle(bx, by, bubSize).fill({ color: 0x88ee88, alpha: bubAlpha });
      }

      // Skull mark with glow
      const skullAlpha = 0.4 + Math.sin(t * 2 + seed) * 0.15;
      g.circle(cx - 2, cy - 2, 2.5).fill({ color: 0x113311, alpha: skullAlpha });
      g.circle(cx + 2, cy - 2, 2.5).fill({ color: 0x113311, alpha: skullAlpha });
      g.circle(cx - 2, cy - 2, 1.5).fill({ color: 0x224422, alpha: skullAlpha + 0.1 });
      g.circle(cx + 2, cy - 2, 1.5).fill({ color: 0x224422, alpha: skullAlpha + 0.1 });
      g.rect(cx - 1.5, cy + 0.5, 3, 3.5).fill({ color: 0x224422, alpha: skullAlpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Lava tiles — glowing orange-red magma with animated fire effect
  // ---------------------------------------------------------------------------

  private _drawLavaTiles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    for (const lv of state.lavaTiles) {
      const cx = ox + lv.x * cs + half;
      const cy = oy + lv.y * cs + half;
      const seed = lv.x * 13 + lv.y * 29;
      const pulse = 0.3 + Math.sin(t * 3 + seed) * 0.1;

      // Outer heat glow (pulsing)
      g.circle(cx, cy, half * 1.2 + Math.sin(t * 4 + seed) * 2).fill({ color: 0xff6600, alpha: pulse * 0.25 });

      // Base magma fill
      g.rect(ox + lv.x * cs + 1, oy + lv.y * cs + 1, cs - 2, cs - 2).fill({ color: B.COLOR_LAVA, alpha: pulse + 0.1 });

      // Darker crust/crack pattern
      const crackAlpha = 0.35 + Math.sin(t * 2 + seed * 0.7) * 0.1;
      g.setStrokeStyle({ width: 1.2, color: 0x661100, alpha: crackAlpha });
      g.moveTo(ox + lv.x * cs + cs * 0.15, oy + lv.y * cs + cs * 0.3)
        .lineTo(ox + lv.x * cs + cs * 0.5, oy + lv.y * cs + cs * 0.55)
        .lineTo(ox + lv.x * cs + cs * 0.85, oy + lv.y * cs + cs * 0.4).stroke();
      g.setStrokeStyle({ width: 0.8, color: 0x441100, alpha: crackAlpha * 0.7 });
      g.moveTo(ox + lv.x * cs + cs * 0.5, oy + lv.y * cs + cs * 0.55)
        .lineTo(ox + lv.x * cs + cs * 0.4, oy + lv.y * cs + cs * 0.85).stroke();
      g.moveTo(ox + lv.x * cs + cs * 0.7, oy + lv.y * cs + cs * 0.2)
        .lineTo(ox + lv.x * cs + cs * 0.6, oy + lv.y * cs + cs * 0.65).stroke();

      // Bright molten spots between cracks
      for (let s = 0; s < 3; s++) {
        const spotPhase = t * 2.5 + seed + s * 2.1;
        const spotX = cx + Math.sin(seed + s * 5) * half * 0.4;
        const spotY = cy + Math.cos(seed + s * 3) * half * 0.4;
        const spotAlpha = (0.3 + Math.sin(spotPhase) * 0.2) * pulse;
        g.circle(spotX, spotY, half * 0.18).fill({ color: 0xff8800, alpha: spotAlpha });
        g.circle(spotX, spotY, half * 0.08).fill({ color: 0xffcc44, alpha: spotAlpha * 1.2 });
      }

      // Rising ember particles
      for (let e = 0; e < 2; e++) {
        const embPhase = t * (4 + e * 1.5) + seed + e * 3.7;
        const embLife = (embPhase % 2.0) / 2.0;
        const ex = cx + Math.sin(seed + e * 7) * half * 0.5;
        const ey = cy - embLife * half * 1.0;
        const embSize = (1.0 - embLife) * 2.0 + 0.5;
        const embAlpha = (1.0 - embLife) * 0.5;
        g.circle(ex, ey, embSize).fill({ color: 0xff6600, alpha: embAlpha });
        if (embLife < 0.3) {
          g.circle(ex, ey, embSize * 0.5).fill({ color: 0xffaa44, alpha: embAlpha * 0.8 });
        }
      }

      // Pulsing danger indicator border
      const dangerPulse = 0.15 + Math.sin(t * 6 + seed) * 0.1;
      g.setStrokeStyle({ width: 1.5, color: 0xff2200, alpha: dangerPulse });
      g.rect(ox + lv.x * cs, oy + lv.y * cs, cs, cs).stroke();

      // Proximity warning — exclamation indicator when wyrm head is nearby
      if (state.body.length > 0) {
        const head = state.body[0];
        const distToHead = Math.abs(lv.x - head.x) + Math.abs(lv.y - head.y);
        if (distToHead <= 3 && distToHead > 0) {
          const warnIntensity = (1.0 - distToHead / 4);
          const warnAlpha = warnIntensity * 0.5 * (0.6 + Math.sin(t * 10 + seed) * 0.4);
          // Pulsing warning circle above the tile
          g.circle(cx, cy - half * 0.9, half * 0.3).fill({ color: 0xff4400, alpha: warnAlpha });
          // Exclamation mark
          g.rect(cx - 1, cy - half * 1.05, 2, half * 0.2).fill({ color: 0xffffff, alpha: warnAlpha });
          g.circle(cx, cy - half * 0.78, 1).fill({ color: 0xffffff, alpha: warnAlpha });
          // Outer warning ring
          g.setStrokeStyle({ width: 1, color: 0xff4400, alpha: warnAlpha * 0.5 });
          g.circle(cx, cy, half * 1.3 + Math.sin(t * 5 + seed) * 3).stroke();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lunge cooldown indicator
  // ---------------------------------------------------------------------------

  private _drawLungeCooldown(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half + half * 1.3;

    if (state.lungeCooldown <= 0) {
      // Ready indicator — pulsing glow
      const pulse = 0.4 + Math.sin(state.time * 6) * 0.4;
      g.circle(hx, hy, 5).fill({ color: B.COLOR_LUNGE, alpha: pulse * 0.3 });
      g.circle(hx, hy, 3).fill({ color: B.COLOR_LUNGE, alpha: pulse });
    } else {
      // Cooldown bar
      const fill = 1.0 - state.lungeCooldown / B.LUNGE_COOLDOWN;
      const barW = cs * 0.8;
      g.rect(hx - barW / 2 - 1, hy - 1, barW + 2, 4).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(hx - barW / 2, hy, barW, 2).fill({ color: 0x333333, alpha: 0.4 });
      g.rect(hx - barW / 2, hy, barW * fill, 2).fill({ color: B.COLOR_LUNGE, alpha: 0.7 });
    }

    // Lunge flash overlay
    if (state.lungeFlash > 0) {
      const alpha = 0.3 * (state.lungeFlash / B.LUNGE_FLASH);
      g.circle(hx, hy - half, half * 2).fill({ color: B.COLOR_LUNGE, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Particles — with glow
  // ---------------------------------------------------------------------------

  private _drawParticles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const px = ox + p.x * cs + cs / 2;
      const py = oy + p.y * cs + cs / 2;
      const sz = p.size * alpha;

      // Motion trail (fading tail in direction of velocity — longer, more visible)
      if (Math.abs(p.vx) + Math.abs(p.vy) > 15) {
        const trailDx = -p.vx * 0.005;
        const trailDy = -p.vy * 0.005;
        for (let tr = 1; tr <= 4; tr++) {
          const trAlpha = alpha * (0.18 - tr * 0.035);
          if (trAlpha > 0.01) {
            g.circle(px + trailDx * tr, py + trailDy * tr, sz * (0.8 - tr * 0.12))
              .fill({ color: p.color, alpha: trAlpha });
          }
        }
      }

      // Outermost soft glow (light spill)
      g.circle(px, py, sz * 2.2).fill({ color: p.color, alpha: alpha * 0.08 });
      // Outer glow
      g.circle(px, py, sz * 1.6).fill({ color: p.color, alpha: alpha * 0.16 });

      // Core — varies shape based on size
      if (p.size > 4) {
        // Larger particles: diamond/star shape with inner glow
        g.moveTo(px, py - sz).lineTo(px + sz * 0.6, py).lineTo(px, py + sz).lineTo(px - sz * 0.6, py)
          .closePath().fill({ color: p.color, alpha });
        // Inner diamond glow
        const isz = sz * 0.5;
        g.moveTo(px, py - isz).lineTo(px + isz * 0.6, py).lineTo(px, py + isz).lineTo(px - isz * 0.6, py)
          .closePath().fill({ color: 0xffffff, alpha: alpha * 0.15 });
      } else {
        g.circle(px, py, sz).fill({ color: p.color, alpha });
      }

      // Hot center (brighter for fresh particles)
      if (alpha > 0.3) {
        g.circle(px, py, sz * 0.35).fill({ color: 0xffffff, alpha: alpha * 0.3 });
      }
      // Ultra-bright core for very fresh particles
      if (alpha > 0.7 && p.size > 2) {
        g.circle(px, py, sz * 0.15).fill({ color: 0xffffff, alpha: (alpha - 0.7) * 0.8 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Floating texts — proper PixiJS Text objects from pool
  // ---------------------------------------------------------------------------

  private _drawFloatingTexts(state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;

    for (const t of this._floatTexts) t.visible = false;

    const active = state.floatingTexts;
    const count = Math.min(active.length, FLOAT_POOL_SIZE);
    for (let i = 0; i < count; i++) {
      const ft = active[active.length - 1 - i];
      const txt = this._floatTexts[i];
      txt.visible = true;
      txt.text = ft.text;
      txt.style.fill = ft.color;
      txt.position.set(ox + ft.x * cs + cs / 2, oy + ft.y * cs);
      const alpha = ft.life / ft.maxLife;
      txt.alpha = alpha;
      txt.scale.set(ft.scale * (0.8 + alpha * 0.2));
    }
  }

  // ---------------------------------------------------------------------------
  // Combo timer bar — enhanced with glow
  // ---------------------------------------------------------------------------

  private _drawComboBar(state: WyrmState): void {
    if (state.comboCount < 2 || state.comboTimer <= 0) return;

    const ug = this._uiGfx;
    const barW = 140;
    const barH = 6;
    const x = this._sw - 10 - barW;
    const y = 24;
    const fill = state.comboTimer / B.COMBO_WINDOW;

    // Background with border
    ug.rect(x - 1, y - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.5 });
    ug.rect(x, y, barW, barH).fill({ color: 0x222222, alpha: 0.6 });
    // Fill with glow
    ug.rect(x, y, barW * fill, barH).fill({ color: B.COLOR_COMBO, alpha: 0.85 });
    // Shine on top
    ug.rect(x, y, barW * fill, 2).fill({ color: 0xffffff, alpha: 0.15 });
  }

  // ---------------------------------------------------------------------------
  // Combo border — screen edge glow at high combos
  // ---------------------------------------------------------------------------

  private _drawComboBorder(state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING || state.comboCount < 5) return;
    const ug = this._uiGfx;
    const sw = this._sw, sh = this._sh;
    const isMax = state.comboCount >= 8;
    const color = isMax ? B.COLOR_COMBO_INVULN : B.COLOR_COMBO;
    const baseAlpha = isMax ? 0.15 + Math.sin(state.time * 6) * 0.1 : 0.06 + state.comboCount * 0.01;
    const thickness = 3;
    ug.rect(0, 0, sw, thickness).fill({ color, alpha: baseAlpha });
    ug.rect(0, sh - thickness, sw, thickness).fill({ color, alpha: baseAlpha });
    ug.rect(0, 0, thickness, sh).fill({ color, alpha: baseAlpha });
    ug.rect(sw - thickness, 0, thickness, sh).fill({ color, alpha: baseAlpha });
  }

  // ---------------------------------------------------------------------------
  // Synergy indicator — show active synergy name in HUD area
  // ---------------------------------------------------------------------------

  private _drawSynergyIndicator(state: WyrmState): void {
    if (!state.activeSynergy || state.phase !== WyrmPhase.PLAYING) return;
    const ug = this._uiGfx;
    const colors: Record<string, number> = { blaze: B.COLOR_SYNERGY_BLAZE, juggernaut: B.COLOR_SYNERGY_JUGGERNAUT, inferno_pull: B.COLOR_SYNERGY_INFERNO, fortress: B.COLOR_SYNERGY_FORTRESS };
    const color = colors[state.activeSynergy] || 0xffffff;
    // Subtle border glow for synergy
    const sw = this._sw;
    const alpha = 0.08 + Math.sin(state.time * 4) * 0.04;
    ug.rect(0, 48, sw, 2).fill({ color, alpha: alpha * 2 });
    // Corner accents
    ug.circle(0, 0, 30).fill({ color, alpha });
    ug.circle(sw, 0, 30).fill({ color, alpha });
  }

  // ---------------------------------------------------------------------------
  // Archer knights
  // ---------------------------------------------------------------------------

  private _drawArchers(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;

    for (const a of state.archerKnights) {
      if (!a.alive) continue;
      const cx = ox + a.x * cs + half;
      const cy = oy + a.y * cs + half;
      const r = half * 0.7;
      const dx = DIR_DX[a.dir], dy = DIR_DY[a.dir];
      const px = -dy, py = dx;

      // Shadow
      g.circle(cx + 1, cy + r * 0.4, r * 0.6).fill({ color: 0x000000, alpha: 0.15 });

      // Pulsing danger glow (intensifies when about to fire)
      const glowIntensity = a.warnTimer > 0 ? 0.15 : 0.06;
      g.circle(cx, cy, r * 1.5).fill({ color: B.COLOR_ARCHER, alpha: glowIntensity + Math.sin(t * 4) * 0.03 });

      // Body
      g.circle(cx, cy, r).fill(B.COLOR_ARCHER);
      // Body texture
      g.circle(cx - r * 0.15, cy - r * 0.15, r * 0.3).fill({ color: 0xffffff, alpha: 0.08 });

      // Cloak/hood — with shadow detail
      g.moveTo(cx - r * 0.55, cy - r * 0.15).lineTo(cx, cy - r * 1.1).lineTo(cx + r * 0.55, cy - r * 0.15)
        .closePath().fill(0x556622);
      g.moveTo(cx - r * 0.35, cy - r * 0.15).lineTo(cx, cy - r * 0.85).lineTo(cx + r * 0.35, cy - r * 0.15)
        .closePath().fill({ color: 0x668833, alpha: 0.5 });
      // Hood shadow face
      g.circle(cx, cy - r * 0.1, r * 0.25).fill({ color: 0x222211, alpha: 0.5 });
      // Glinting eyes
      g.circle(cx - r * 0.1, cy - r * 0.15, 1.5).fill({ color: 0xccff44, alpha: 0.6 + Math.sin(t * 5 + a.x) * 0.3 });
      g.circle(cx + r * 0.1, cy - r * 0.15, 1.5).fill({ color: 0xccff44, alpha: 0.6 + Math.sin(t * 5 + a.x) * 0.3 });

      // Crossbow — more detailed with drawn bow when warning
      g.setStrokeStyle({ width: 2.5, color: 0x6a4a1a, cap: "round" });
      g.moveTo(cx + dx * r * 0.2, cy + dy * r * 0.2)
        .lineTo(cx + dx * r * 1.3, cy + dy * r * 1.3).stroke();
      // Bow limbs (curved, flex more when drawn)
      const bowFlex = a.warnTimer > 0 ? 0.8 : 0.6;
      g.setStrokeStyle({ width: 2, color: 0x8a6a2a, cap: "round" });
      g.moveTo(cx + dx * r * 0.8 + px * r * bowFlex, cy + dy * r * 0.8 + py * r * bowFlex)
        .quadraticCurveTo(cx + dx * r * (a.warnTimer > 0 ? 1.2 : 1.1), cy + dy * r * (a.warnTimer > 0 ? 1.2 : 1.1),
          cx + dx * r * 0.8 - px * r * bowFlex, cy + dy * r * 0.8 - py * r * bowFlex).stroke();
      // Bowstring — pulled back further when about to fire
      const stringPull = a.warnTimer > 0 ? 0.3 : 0.5;
      g.setStrokeStyle({ width: a.warnTimer > 0 ? 1.0 : 0.8, color: 0xccccaa, alpha: a.warnTimer > 0 ? 0.8 : 0.6 });
      g.moveTo(cx + dx * r * 0.8 + px * r * (bowFlex - 0.1), cy + dy * r * 0.8 + py * r * (bowFlex - 0.1))
        .lineTo(cx + dx * r * stringPull, cy + dy * r * stringPull)
        .lineTo(cx + dx * r * 0.8 - px * r * (bowFlex - 0.1), cy + dy * r * 0.8 - py * r * (bowFlex - 0.1)).stroke();
      // Arrow nocked when warning (visible bolt ready to fire)
      if (a.warnTimer > 0) {
        const arrowTip = r * 1.4;
        g.setStrokeStyle({ width: 1.5, color: 0xccbb88, cap: "round" });
        g.moveTo(cx + dx * r * stringPull, cy + dy * r * stringPull)
          .lineTo(cx + dx * arrowTip, cy + dy * arrowTip).stroke();
        // Arrow head glint
        g.circle(cx + dx * arrowTip, cy + dy * arrowTip, 1.5)
          .fill({ color: 0xeeeecc, alpha: 0.6 + Math.sin(t * 12) * 0.3 });
      }
      // Quiver on back (small rectangle)
      g.rect(cx - dx * r * 0.6 - px * r * 0.2 - 1.5, cy - dy * r * 0.6 - py * r * 0.2 - 3, 3, 6)
        .fill({ color: 0x553311, alpha: 0.4 });
      // Arrow tips poking out of quiver
      g.circle(cx - dx * r * 0.6 - px * r * 0.2, cy - dy * r * 0.6 - py * r * 0.2 - 4, 0.8)
        .fill({ color: 0xccbb88, alpha: 0.3 });
      g.circle(cx - dx * r * 0.6 - px * r * 0.2 + 1, cy - dy * r * 0.6 - py * r * 0.2 - 3.5, 0.8)
        .fill({ color: 0xccbb88, alpha: 0.3 });

      // Warning telegraph before firing — pulsing laser sight
      if (a.warnTimer > 0) {
        const warnProgress = 1.0 - a.warnTimer / B.ARCHER_WARN_DURATION;
        const warnAlpha = 0.15 + warnProgress * 0.2 + Math.sin(t * 25) * 0.1;
        // Dashed danger line
        for (let d = 0; d < 8; d++) {
          const dStart = d * cs + cs * 0.3;
          const dEnd = d * cs + cs * 0.8;
          g.setStrokeStyle({ width: 1.5 + warnProgress, color: 0xff2222, alpha: warnAlpha * (1.0 - d * 0.1) });
          g.moveTo(cx + dx * (r + dStart), cy + dy * (r + dStart))
            .lineTo(cx + dx * (r + dEnd), cy + dy * (r + dEnd)).stroke();
        }
        // Target reticle at wyrm (if close enough)
        const targetX = cx + dx * cs * 4;
        const targetY = cy + dy * cs * 4;
        g.setStrokeStyle({ width: 1, color: 0xff2222, alpha: warnAlpha });
        g.circle(targetX, targetY, 6).stroke();
        g.moveTo(targetX - 8, targetY).lineTo(targetX + 8, targetY).stroke();
        g.moveTo(targetX, targetY - 8).lineTo(targetX, targetY + 8).stroke();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles (arrows)
  // ---------------------------------------------------------------------------

  private _drawProjectiles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;

    for (const p of state.projectiles) {
      if (!p.alive) continue;
      const cx = ox + p.x * cs + half;
      const cy = oy + p.y * cs + half;
      const dx = DIR_DX[p.dir], dy = DIR_DY[p.dir];
      const len = half * 0.8;

      const px = -dy, py = dx;

      // Motion blur trail (3 fading copies behind)
      for (let tr = 1; tr <= 3; tr++) {
        const tx = cx - dx * len * tr * 0.7;
        const ty = cy - dy * len * tr * 0.7;
        const ta = 0.15 - tr * 0.04;
        g.setStrokeStyle({ width: 1.5 - tr * 0.3, color: B.COLOR_PROJECTILE, alpha: ta });
        g.moveTo(tx - dx * len * 0.3, ty - dy * len * 0.3)
          .lineTo(tx + dx * len * 0.3, ty + dy * len * 0.3).stroke();
      }

      // Danger glow
      g.circle(cx, cy, 5).fill({ color: 0xff4400, alpha: 0.12 });

      // Arrow shaft (wooden)
      g.setStrokeStyle({ width: 2, color: 0x8a6a2a });
      g.moveTo(cx - dx * len, cy - dy * len).lineTo(cx + dx * len * 0.5, cy + dy * len * 0.5).stroke();

      // Arrow head (iron, larger)
      g.moveTo(cx + dx * len, cy + dy * len)
        .lineTo(cx + dx * len * 0.2 + px * 3.5, cy + dy * len * 0.2 + py * 3.5)
        .lineTo(cx + dx * len * 0.2 - px * 3.5, cy + dy * len * 0.2 - py * 3.5)
        .closePath().fill(0xccccaa);
      // Head shine
      g.circle(cx + dx * len * 0.7, cy + dy * len * 0.7, 1.5).fill({ color: 0xffffff, alpha: 0.3 });

      // Fletching (feathers at tail)
      g.moveTo(cx - dx * len, cy - dy * len)
        .lineTo(cx - dx * len * 0.7 + px * 2.5, cy - dy * len * 0.7 + py * 2.5)
        .lineTo(cx - dx * len * 0.6, cy - dy * len * 0.6)
        .closePath().fill({ color: 0xcc4444, alpha: 0.7 });
      g.moveTo(cx - dx * len, cy - dy * len)
        .lineTo(cx - dx * len * 0.7 - px * 2.5, cy - dy * len * 0.7 - py * 2.5)
        .lineTo(cx - dx * len * 0.6, cy - dy * len * 0.6)
        .closePath().fill({ color: 0xcc4444, alpha: 0.7 });
    }
  }

  // ---------------------------------------------------------------------------
  // Magnet radius indicator
  // ---------------------------------------------------------------------------

  private _drawMagnetRadius(g: Graphics, state: WyrmState): void {
    if (state.body.length === 0) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half;
    const radius = state.magnetRadius * cs;
    const t = state.time;

    // Dashed circle effect using arc segments
    const segments = 16;
    const alpha = 0.12 + Math.sin(t * 4) * 0.06;
    g.setStrokeStyle({ width: 1.5, color: B.COLOR_MAGNET, alpha });
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2 + t * 0.5;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + t * 0.5;
      g.moveTo(hx + Math.cos(a1) * radius, hy + Math.sin(a1) * radius);
      // Approximate arc with line
      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        const a = a1 + (a2 - a1) * (s / steps);
        g.lineTo(hx + Math.cos(a) * radius, hy + Math.sin(a) * radius);
      }
      g.stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Blessing selection screen
  // ---------------------------------------------------------------------------

  private _drawBlessingScreen(state: WyrmState): void {
    const show = state.phase === WyrmPhase.BLESSING && state.blessingChoices.length > 0;
    if (!show) return;

    const ug = this._uiGfx;
    const cx = this._sw / 2;
    const cy = this._sh / 2;
    const t = state.time;

    // Overlay with subtle purple tint
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0818, alpha: 0.7 });

    // Ambient floating sparkles in background
    for (let s = 0; s < 12; s++) {
      const sx = cx + Math.sin(t * 0.5 + s * 1.7) * 280;
      const sy = cy + Math.cos(t * 0.4 + s * 2.3) * 120;
      const sa = 0.08 + Math.sin(t * 2 + s * 3) * 0.06;
      ug.circle(sx, sy, 1.5).fill({ color: B.COLOR_BLESSING, alpha: sa });
    }

    // Decorative frame around the whole blessing area
    const frameW = Math.min(700, this._sw - 40);
    const frameH = 200;
    const fx = cx - frameW / 2;
    const fy = cy - frameH / 2 - 30;
    ug.setStrokeStyle({ width: 1.5, color: B.COLOR_BLESSING, alpha: 0.2 });
    ug.roundRect(fx, fy, frameW, frameH, 10).stroke();
    // Corner diamonds
    for (const [cdx, cdy] of [[fx, fy], [fx + frameW, fy], [fx, fy + frameH], [fx + frameW, fy + frameH]]) {
      ug.moveTo(cdx, cdy - 5).lineTo(cdx + 5, cdy).lineTo(cdx, cdy + 5).lineTo(cdx - 5, cdy)
        .closePath().fill({ color: B.COLOR_BLESSING, alpha: 0.2 });
    }

    // Title
    this._pauseText.visible = true;
    this._pauseText.text = "CHOOSE A BLESSING";
    this._pauseText.style.fill = B.COLOR_BLESSING;
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(cx, cy - 110);
    this._pauseText.alpha = 1.0;

    // Title underline
    ug.rect(cx - 100, cy - 88, 200, 1).fill({ color: B.COLOR_BLESSING, alpha: 0.25 });

    // Blessing choices (3 cards)
    const cardW = 200;
    const cardH = 90;
    const spacing = 16;
    const totalW = state.blessingChoices.length * cardW + (state.blessingChoices.length - 1) * spacing;
    const startX = cx - totalW / 2;

    for (let i = 0; i < state.blessingChoices.length; i++) {
      const b = state.blessingChoices[i];
      const x = startX + i * (cardW + spacing);
      const y = cy - 30;

      // Pulsing outer glow
      const pulse = 0.05 + Math.sin(t * 3 + i * 2.1) * 0.04;
      ug.roundRect(x - 4, y - 4, cardW + 8, cardH + 8, 12).fill({ color: b.color, alpha: pulse });

      // Card shadow
      ug.roundRect(x + 2, y + 3, cardW, cardH, 8).fill({ color: 0x000000, alpha: 0.3 });

      // Card background with gradient feel
      ug.roundRect(x, y, cardW, cardH, 8).fill({ color: 0x111122, alpha: 0.92 });
      // Darker bottom half for depth
      ug.roundRect(x + 2, y + cardH * 0.5, cardW - 4, cardH * 0.5 - 2, 6).fill({ color: 0x0a0a18, alpha: 0.3 });

      // Card border
      ug.setStrokeStyle({ width: 2, color: b.color, alpha: 0.5 });
      ug.roundRect(x, y, cardW, cardH, 8).stroke();
      // Inner border (subtle)
      ug.setStrokeStyle({ width: 1, color: b.color, alpha: 0.12 });
      ug.roundRect(x + 3, y + 3, cardW - 6, cardH - 6, 6).stroke();

      // Color accent bar at top
      ug.roundRect(x + 2, y + 2, cardW - 4, 5, 3).fill({ color: b.color, alpha: 0.4 });

      // Blessing icon (symbolic shape based on blessing id)
      const iconCx = x + 22;
      const iconCy = y + 24;
      // Outer ring
      ug.circle(iconCx, iconCy, 13).fill({ color: b.color, alpha: 0.1 });
      ug.setStrokeStyle({ width: 1.5, color: b.color, alpha: 0.5 });
      ug.circle(iconCx, iconCy, 12).stroke();

      if (b.id === "frostbite") {
        // Snowflake icon — six lines from center with branches
        for (let s = 0; s < 6; s++) {
          const a = s * Math.PI / 3 + t * 0.3;
          const ex = iconCx + Math.cos(a) * 7;
          const ey = iconCy + Math.sin(a) * 7;
          ug.setStrokeStyle({ width: 1.2, color: B.COLOR_FROSTBITE, alpha: 0.7 });
          ug.moveTo(iconCx, iconCy).lineTo(ex, ey).stroke();
          // Branch tips
          const brA1 = a + 0.5, brA2 = a - 0.5;
          const brLen = 3;
          ug.setStrokeStyle({ width: 0.8, color: B.COLOR_FROSTBITE, alpha: 0.5 });
          ug.moveTo(ex, ey).lineTo(ex + Math.cos(brA1) * brLen, ey + Math.sin(brA1) * brLen).stroke();
          ug.moveTo(ex, ey).lineTo(ex + Math.cos(brA2) * brLen, ey + Math.sin(brA2) * brLen).stroke();
        }
        ug.circle(iconCx, iconCy, 2).fill({ color: 0xffffff, alpha: 0.6 });
      } else if (b.id === "regeneration") {
        // Heart / plus icon with pulsing glow
        const regenPulse = 0.5 + Math.sin(t * 4) * 0.2;
        ug.circle(iconCx, iconCy, 8).fill({ color: B.COLOR_REGEN, alpha: 0.1 * regenPulse });
        // Plus sign (healing cross)
        ug.roundRect(iconCx - 5, iconCy - 1.5, 10, 3, 1).fill({ color: B.COLOR_REGEN, alpha: 0.7 });
        ug.roundRect(iconCx - 1.5, iconCy - 5, 3, 10, 1).fill({ color: B.COLOR_REGEN, alpha: 0.7 });
        // Bright center
        ug.circle(iconCx, iconCy, 2).fill({ color: 0xffffff, alpha: 0.5 });
        // Tiny orbiting heal particles
        for (let hp = 0; hp < 3; hp++) {
          const ha = t * 3 + hp * Math.PI * 2 / 3;
          ug.circle(iconCx + Math.cos(ha) * 9, iconCy + Math.sin(ha) * 9, 1.2)
            .fill({ color: B.COLOR_REGEN, alpha: 0.4 });
        }
      } else {
        // Default: diamond star icon
        ug.moveTo(iconCx, iconCy - 6).lineTo(iconCx + 4, iconCy).lineTo(iconCx, iconCy + 6).lineTo(iconCx - 4, iconCy)
          .closePath().fill({ color: b.color, alpha: 0.6 });
        ug.circle(iconCx, iconCy, 2).fill({ color: 0xffffff, alpha: 0.5 });
      }

      // Use shop text labels
      const st = this._shopTexts[i];
      if (st) {
        st.visible = true;
        st.text = `[${i + 1}] ${b.name}\n${b.desc}`;
        st.style.fill = b.color;
        st.style.fontSize = 11;
        st.position.set(x + 40, y + 14);
      }
    }

    // Hint text at bottom
    ug.rect(cx - 80, cy + 75, 160, 1).fill({ color: 0x667766, alpha: 0.2 });
  }

  // ---------------------------------------------------------------------------
  // Wrath meter — bottom-left HUD element
  // ---------------------------------------------------------------------------

  private _drawWrathMeter(state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    const ug = this._uiGfx;
    const barW = 120;
    const barH = 8;
    const x = 10;
    const y = this._sh - 20;
    const t = state.time;

    // Background
    ug.roundRect(x - 1, y - 1, barW + 2, barH + 2, 3).fill({ color: 0x000000, alpha: 0.4 });
    ug.rect(x, y, barW, barH).fill({ color: 0x222222, alpha: 0.5 });

    if (state.wrathTimer > 0) {
      // Wrath mode active — pulsing full bar
      const pulse = 0.7 + Math.sin(t * 8) * 0.3;
      ug.rect(x, y, barW, barH).fill({ color: B.COLOR_WRATH, alpha: pulse });
      // Wrath timer drain
      const fill = state.wrathTimer / B.WRATH_DURATION;
      ug.rect(x, y, barW * fill, barH).fill({ color: 0xff6600, alpha: 0.9 });
    } else {
      // Fill bar
      const fill = state.wrathMeter / B.WRATH_MAX;
      if (fill > 0) {
        ug.rect(x, y, barW * fill, barH).fill({ color: B.COLOR_WRATH, alpha: 0.7 });
        // Shine
        ug.rect(x, y, barW * fill, 2).fill({ color: 0xffffff, alpha: 0.1 });
      }
    }

    // Wrath icon (small flame shape) as label
    ug.circle(x - 6, y + barH / 2, 3).fill({ color: B.COLOR_WRATH, alpha: 0.4 });
    ug.circle(x - 6, y + barH / 2 - 2, 2).fill({ color: 0xff8800, alpha: 0.5 });
    // Separator
    ug.rect(x, y + barH + 2, barW, 1).fill({ color: 0x333344, alpha: 0.2 });
  }

  // ---------------------------------------------------------------------------
  // Tail whip cooldown (near bottom of wyrm or HUD)
  // ---------------------------------------------------------------------------

  private _drawTailWhipCooldown(state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING || state.body.length < 4) return;
    const ug = this._uiGfx;
    const x = 10;
    const y = this._sh - 34;
    const barW = 60;
    const barH = 5;

    if (state.tailWhipCooldown <= 0) {
      // Ready indicator
      const pulse = 0.5 + Math.sin(state.time * 4) * 0.3;
      ug.roundRect(x, y, barW, barH, 2).fill({ color: B.COLOR_TAIL_WHIP, alpha: pulse * 0.5 });
    } else {
      const fill = 1.0 - state.tailWhipCooldown / B.TAIL_WHIP_COOLDOWN;
      ug.roundRect(x - 1, y - 1, barW + 2, barH + 2, 2).fill({ color: 0x000000, alpha: 0.3 });
      ug.rect(x, y, barW, barH).fill({ color: 0x222222, alpha: 0.4 });
      ug.rect(x, y, barW * fill, barH).fill({ color: B.COLOR_TAIL_WHIP, alpha: 0.6 });
    }

    // Tail whip flash on body — sweep arc effect
    if (state.tailWhipFlash > 0 && state.body.length >= 4) {
      const cs = this._cellSize;
      const ox = this._offsetX;
      const oy = this._offsetY;
      const half = cs / 2;
      const flashRatio = state.tailWhipFlash / B.TAIL_WHIP_FLASH;
      const alpha = 0.35 * flashRatio;
      const range = Math.min(B.TAIL_WHIP_RANGE, state.body.length - 1);
      const g = this._gfx;

      // Sweep arc around each tail segment
      for (let i = state.body.length - range; i < state.body.length; i++) {
        const seg = state.body[i];
        const sx = ox + seg.x * cs + half;
        const sy = oy + seg.y * cs + half;

        // Expanding ring
        const ringR = half * (1.2 + (1.0 - flashRatio) * 1.5);
        g.setStrokeStyle({ width: 2, color: B.COLOR_TAIL_WHIP, alpha: alpha * 0.8 });
        g.circle(sx, sy, ringR).stroke();

        // Inner glow
        g.circle(sx, sy, half * 1.3).fill({ color: B.COLOR_TAIL_WHIP, alpha: alpha * 0.6 });

        // Radial sweep lines (8 directions)
        const sweepPhase = (1.0 - flashRatio) * Math.PI * 2;
        for (let d = 0; d < 8; d++) {
          const a = d * Math.PI / 4 + sweepPhase;
          const lineLen = half * 1.5 * flashRatio;
          g.setStrokeStyle({ width: 1.5, color: B.COLOR_TAIL_WHIP, alpha: alpha * 0.5 });
          g.moveTo(sx + Math.cos(a) * half * 0.8, sy + Math.sin(a) * half * 0.8)
            .lineTo(sx + Math.cos(a) * (half * 0.8 + lineLen), sy + Math.sin(a) * (half * 0.8 + lineLen)).stroke();
        }
      }

      // Connecting arc line between tail segments
      if (range >= 2) {
        g.setStrokeStyle({ width: 3, color: B.COLOR_TAIL_WHIP, alpha: alpha * 0.4, cap: "round" });
        for (let i = state.body.length - range; i < state.body.length - 1; i++) {
          const s1 = state.body[i], s2 = state.body[i + 1];
          g.moveTo(ox + s1.x * cs + half, oy + s1.y * cs + half)
            .lineTo(ox + s2.x * cs + half, oy + s2.y * cs + half).stroke();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Minimap — enhanced with rounded corners and title
  // ---------------------------------------------------------------------------

  private _drawMinimap(state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING && state.phase !== WyrmPhase.PAUSED) return;

    const ug = this._uiGfx;
    const size = B.MINIMAP_SIZE;
    const margin = B.MINIMAP_MARGIN;
    const mx = this._sw - size - margin;
    const my = this._sh - size - margin;
    const scaleX = size / state.cols;
    const scaleY = size / state.rows;

    // Background with rounded corners
    ug.roundRect(mx - 2, my - 2, size + 4, size + 4, 4).fill({ color: 0x000000, alpha: 0.6 });
    ug.roundRect(mx, my, size, size, 3).fill({ color: 0x0a0a1e, alpha: 0.7 });
    // Border
    ug.setStrokeStyle({ width: 1, color: 0x444466, alpha: 0.6 });
    ug.roundRect(mx, my, size, size, 3).stroke();

    // Walls
    for (const w of state.walls) {
      const isBorder = w.x === 0 || w.x === state.cols - 1 || w.y === 0 || w.y === state.rows - 1;
      if (isBorder) continue;
      ug.rect(mx + w.x * scaleX, my + w.y * scaleY, Math.max(scaleX, 1), Math.max(scaleY, 1))
        .fill({ color: B.COLOR_WALL, alpha: 0.6 });
    }

    // Pickups
    for (const p of state.pickups) {
      let color: number = B.COLOR_SHEEP;
      if (p.kind === PickupKind.TREASURE) color = B.COLOR_TREASURE;
      else if (p.kind === PickupKind.FIRE_SCROLL) color = B.COLOR_FIRE_SCROLL;
      else if (p.kind === PickupKind.POTION) color = B.COLOR_POTION;
      else if (p.kind === PickupKind.SHIELD) color = B.COLOR_SHIELD;
      else if (p.kind === PickupKind.PORTAL) color = B.COLOR_PORTAL;
      else if (p.kind === PickupKind.GOLDEN_SHEEP) color = B.COLOR_GOLDEN_SHEEP;
      else if (p.kind === PickupKind.MAGNET) color = B.COLOR_MAGNET;
      ug.circle(mx + p.x * scaleX + scaleX / 2, my + p.y * scaleY + scaleY / 2, 1.5)
        .fill({ color, alpha: 0.8 });
    }

    // Knights
    for (const k of state.knights) {
      if (!k.alive) continue;
      const kc = k.chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM;
      ug.circle(mx + k.x * scaleX + scaleX / 2, my + k.y * scaleY + scaleY / 2, 1.5)
        .fill({ color: kc, alpha: 0.9 });
    }

    // Poison
    for (const p of state.poisonTiles) {
      ug.circle(mx + p.x * scaleX + scaleX / 2, my + p.y * scaleY + scaleY / 2, 1.5)
        .fill({ color: B.COLOR_POISON, alpha: 0.7 });
    }

    // Archers
    for (const a of state.archerKnights) {
      if (!a.alive) continue;
      ug.circle(mx + a.x * scaleX + scaleX / 2, my + a.y * scaleY + scaleY / 2, 1.5)
        .fill({ color: B.COLOR_ARCHER, alpha: 0.9 });
    }

    // Projectiles
    for (const p of state.projectiles) {
      if (!p.alive) continue;
      ug.circle(mx + p.x * scaleX + scaleX / 2, my + p.y * scaleY + scaleY / 2, 1)
        .fill({ color: B.COLOR_PROJECTILE, alpha: 0.8 });
    }

    // Boss
    if (state.boss && state.boss.alive) {
      ug.circle(mx + state.boss.x * scaleX + scaleX / 2, my + state.boss.y * scaleY + scaleY / 2, 3)
        .fill({ color: B.COLOR_BOSS, alpha: 1.0 });
    }

    // Wyrm body with glow on head
    const mmColors = getWyrmColors(state.length);
    for (let i = state.body.length - 1; i >= 0; i--) {
      const seg = state.body[i];
      const color = i === 0 ? mmColors.head : mmColors.body;
      const r = i === 0 ? 2.5 : 1.2;
      if (i === 0) {
        // Head glow on minimap
        ug.circle(mx + seg.x * scaleX + scaleX / 2, my + seg.y * scaleY + scaleY / 2, 4)
          .fill({ color: mmColors.head, alpha: 0.3 });
      }
      ug.circle(mx + seg.x * scaleX + scaleX / 2, my + seg.y * scaleY + scaleY / 2, r)
        .fill(color);
    }
  }

  // ---------------------------------------------------------------------------
  // HUD — with background panel
  // ---------------------------------------------------------------------------

  private _drawHUD(state: WyrmState, meta: WyrmMeta): void {
    if (state.phase === WyrmPhase.START || state.phase === WyrmPhase.DEAD) {
      this._hudText.visible = false;
      this._hudSmallText.visible = false;
      this._hudRightText.visible = false;
      return;
    }
    this._hudText.visible = true;
    this._hudSmallText.visible = true;
    this._hudRightText.visible = true;

    // HUD background panel with rounded bottom corners and border
    const ug = this._uiGfx;
    // Dark panel background
    ug.roundRect(0, -4, this._sw, 56, 6).fill({ color: 0x0a0a14, alpha: 0.55 });
    // Subtle inner glow at top
    ug.rect(0, 0, this._sw, 3).fill({ color: 0x333355, alpha: 0.15 });
    // Bottom border line with glow
    ug.rect(0, 50, this._sw, 1.5).fill({ color: 0x444466, alpha: 0.35 });
    ug.rect(0, 51, this._sw, 1).fill({ color: 0x222244, alpha: 0.15 });

    // Wyrm tier name display with color
    const wyrmTierCol = getWyrmColors(state.length);
    const tierLabel = wyrmTierCol.name.toUpperCase();

    const score = Math.floor(state.score);
    const hi = Math.max(Math.floor(meta.highScore), score);

    // HUD icon: crown for score, chain for length, trophy for hi
    this._hudText.text = `\u2666 ${score}  |  \u25C8 ${state.length}  |  \u2605 ${hi}`;

    // Draw tier name indicator in the HUD
    const tierTextX = this._sw / 2;
    ug.roundRect(tierTextX - 45, 36, 90, 16, 4).fill({ color: 0x000000, alpha: 0.3 });
    ug.setStrokeStyle({ width: 1, color: wyrmTierCol.head, alpha: 0.4 });
    ug.roundRect(tierTextX - 45, 36, 90, 16, 4).stroke();

    const parts: string[] = [];
    if (state.fireBreathTimer > 0) parts.push(`FIRE: ${state.fireBreathTimer.toFixed(1)}s`);
    if (state.speedBoostTimer > 0) parts.push(`SPEED: ${state.speedBoostTimer.toFixed(1)}s`);
    if (state.magnetBoostTimer > 0) parts.push(`MAGNET: ${state.magnetBoostTimer.toFixed(1)}s`);
    if (state.shieldHits > 0) parts.push(state.shieldHits > 1 ? `SHIELD x${state.shieldHits}` : "SHIELD");
    if (state.comboInvulnTimer > 0) parts.push(`INVULN: ${state.comboInvulnTimer.toFixed(1)}s`);
    if (state.activeSynergy) {
      const synergyNames: Record<string, string> = { blaze: "BLAZE", juggernaut: "JUGG", inferno_pull: "INFERNO", fortress: "FORT" };
      parts.push(synergyNames[state.activeSynergy] || state.activeSynergy.toUpperCase());
    }
    const waveCountdown = Math.ceil(state.waveTimer);
    parts.push(`WAVE: ${state.wave} (${waveCountdown}s)`);
    parts.unshift(tierLabel); // Show tier name at start of status line
    this._hudSmallText.text = parts.join("  |  ");

    if (state.comboCount >= 2) {
      this._hudRightText.text = `\u2726 ${state.comboCount}x COMBO`;
      // Pulsing scale effect — combo text grows briefly on high combos
      const comboPulse = 0.7 + Math.sin(state.time * 8) * 0.3;
      this._hudRightText.alpha = comboPulse;
      const comboScale = state.comboCount >= 5 ? 1.0 + Math.sin(state.time * 10) * 0.08 : 1.0;
      this._hudRightText.scale.set(comboScale);
      // Combo glow background
      if (state.comboCount >= 5) {
        const comboGlow = 0.08 + Math.sin(state.time * 6) * 0.04;
        const cgx = this._sw - 10 - 80;
        ug.roundRect(cgx, 2, 88, 18, 4).fill({ color: state.comboCount >= 8 ? B.COLOR_COMBO_INVULN : B.COLOR_COMBO, alpha: comboGlow });
      }
    } else {
      this._hudRightText.text = "";
      this._hudRightText.scale.set(1.0);
    }
    this._hudRightText.anchor.set(1, 0);
    this._hudRightText.position.set(this._sw - 10, 8);
  }

  // ---------------------------------------------------------------------------
  // Start screen — with decorative frame
  // ---------------------------------------------------------------------------

  private _drawStartScreen(state: WyrmState, meta: WyrmMeta): void {
    const show = state.phase === WyrmPhase.START;
    this._titleText.visible = show;
    this._subtitleText.visible = show;
    this._controlsText.visible = show;
    this._metaText.visible = show;
    this._startPrompt.visible = show;
    if (!show) return;

    const cx = this._sw / 2;
    const cy = this._sh / 2;
    const g = this._gfx;

    // Dark overlay
    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.6 });

    // Decorative frame
    const frameW = Math.min(600, this._sw - 60);
    const frameH = Math.min(500, this._sh - 40);
    const fx = cx - frameW / 2;
    const fy = cy - frameH / 2 + 20;
    // Outer frame glow
    g.roundRect(fx - 4, fy - 4, frameW + 8, frameH + 8, 8)
      .fill({ color: 0xc9a227, alpha: 0.08 });
    // Frame border
    g.setStrokeStyle({ width: 2, color: 0xc9a227, alpha: 0.3 });
    g.roundRect(fx, fy, frameW, frameH, 6).stroke();
    // Inner frame border
    g.setStrokeStyle({ width: 1, color: 0xc9a227, alpha: 0.15 });
    g.roundRect(fx + 6, fy + 6, frameW - 12, frameH - 12, 4).stroke();
    // Corner ornaments
    const ornSize = 12;
    for (const [ox, oy] of [[fx, fy], [fx + frameW, fy], [fx, fy + frameH], [fx + frameW, fy + frameH]]) {
      g.circle(ox, oy, ornSize).fill({ color: 0xc9a227, alpha: 0.15 });
      g.circle(ox, oy, ornSize * 0.5).fill({ color: 0xc9a227, alpha: 0.25 });
    }

    this._titleText.anchor.set(0.5);
    this._titleText.position.set(cx, cy - 100);
    this._subtitleText.anchor.set(0.5);
    this._subtitleText.position.set(cx, cy - 50);

    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(cx, cy + 5);
    this._controlsText.text = [
      "ARROWS / WASD - Steer  |  SPACE - Lunge  |  SHIFT/E - Tail Whip",
      "Eat sheep, treasure, knights  |  Lunge pulls nearby pickups",
      "Portals teleport  |  Shields block  |  Magnets pull food",
      "Fill the Wrath meter by combat to enter Wrath Mode!",
      "Evolving grants a Blessing (choose 1 of 3 perks)",
      "Max combo = invulnerability  |  Bosses every 5 waves",
      "ESC - Pause / Exit  |  Earn coins for upgrades",
    ].join("\n");

    if (meta.gamesPlayed > 0) {
      this._metaText.anchor.set(0.5);
      this._metaText.position.set(cx, cy + 120);
      this._metaText.text = [
        `Best: ${meta.highScore}  |  Longest: ${meta.bestLength}  |  Best Combo: ${meta.bestCombo}x`,
        `Games: ${meta.gamesPlayed}  |  Sheep: ${meta.totalSheepEaten}  |  Knights: ${meta.totalKnightsEaten}`,
      ].join("\n");
    } else {
      this._metaText.text = "";
    }

    this._startPrompt.anchor.set(0.5);
    this._startPrompt.position.set(cx, cy + 175);
    this._startPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;

    // Animated demo wyrm — connected body
    const cs = this._cellSize || 20;
    const demoY = cy + 220;
    const segCount = 14;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < segCount; i++) {
      pts.push({
        x: cx - (segCount / 2) * cs * 0.55 + i * cs * 0.55,
        y: demoY + Math.sin(state.time * 2.5 + i * 0.5) * 14,
      });
    }
    // Connecting lines
    for (let i = segCount - 1; i > 0; i--) {
      const w = Math.max(4, 12 - i * 0.5);
      const color = i % 2 === 0 ? B.COLOR_WYRM_BODY : B.COLOR_WYRM_BODY_ALT;
      g.setStrokeStyle({ width: w, color, cap: "round" });
      g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i - 1].x, pts[i - 1].y).stroke();
    }
    // Segment circles
    for (let i = segCount - 1; i >= 0; i--) {
      const color = i === 0 ? B.COLOR_WYRM_HEAD : (i % 2 === 0 ? B.COLOR_WYRM_BODY : B.COLOR_WYRM_BODY_ALT);
      const r = i === 0 ? 14 : Math.max(5, 12 - i * 0.4);
      g.circle(pts[i].x, pts[i].y, r).fill(color);
      if (i === 0) {
        // Eyes with glow
        g.circle(pts[0].x + 5, pts[0].y - 3, 4).fill({ color: 0xff0000, alpha: 0.2 });
        g.circle(pts[0].x + 5, pts[0].y + 3, 4).fill({ color: 0xff0000, alpha: 0.2 });
        g.circle(pts[0].x + 5, pts[0].y - 3, 2.5).fill(0xff0000);
        g.circle(pts[0].x + 5, pts[0].y + 3, 2.5).fill(0xff0000);
        g.circle(pts[0].x + 6, pts[0].y - 4, 1).fill(0xffcccc);
        g.circle(pts[0].x + 6, pts[0].y + 2, 1).fill(0xffcccc);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pause — with decorative overlay
  // ---------------------------------------------------------------------------

  private _drawPauseScreen(state: WyrmState): void {
    const show = state.phase === WyrmPhase.PAUSED;
    if (state.phase !== WyrmPhase.BLESSING) this._pauseText.visible = show;
    if (!show) return;

    const ug = this._uiGfx;
    const sw = this._sw, sh = this._sh;
    const cx = sw / 2, cy = sh / 2;
    const t = state.time;

    // Frosted overlay with gradient
    ug.rect(0, 0, sw, sh).fill({ color: 0x0a0a18, alpha: 0.55 });
    // Darker center panel
    ug.roundRect(cx - 160, cy - 60, 320, 120, 12).fill({ color: 0x0a0a1e, alpha: 0.5 });

    // Ornamental frame
    ug.setStrokeStyle({ width: 2, color: 0xdaa520, alpha: 0.25 });
    ug.roundRect(cx - 150, cy - 50, 300, 100, 8).stroke();
    ug.setStrokeStyle({ width: 1, color: 0xdaa520, alpha: 0.12 });
    ug.roundRect(cx - 145, cy - 45, 290, 90, 6).stroke();

    // Corner ornaments
    for (const [ox, oy] of [[cx - 150, cy - 50], [cx + 150, cy - 50], [cx - 150, cy + 50], [cx + 150, cy + 50]]) {
      ug.circle(ox, oy, 6).fill({ color: 0xdaa520, alpha: 0.12 });
      ug.circle(ox, oy, 3).fill({ color: 0xdaa520, alpha: 0.25 });
    }

    // Decorative horizontal lines with diamond ends
    ug.rect(cx - 110, cy - 28, 220, 1).fill({ color: 0xdaa520, alpha: 0.2 });
    ug.rect(cx - 110, cy + 28, 220, 1).fill({ color: 0xdaa520, alpha: 0.2 });
    // Diamond at each line end
    for (const lx of [cx - 112, cx + 112]) {
      for (const ly of [cy - 28, cy + 28]) {
        ug.moveTo(lx, ly - 3).lineTo(lx + 3, ly).lineTo(lx, ly + 3).lineTo(lx - 3, ly).closePath()
          .fill({ color: 0xdaa520, alpha: 0.25 });
      }
    }

    // Subtitle hint below
    ug.rect(cx - 60, cy + 38, 120, 1).fill({ color: 0x667766, alpha: 0.2 });

    // Gentle pulsing ambient glow behind text
    const glowAlpha = 0.04 + Math.sin(t * 1.5) * 0.02;
    ug.circle(cx, cy, 60).fill({ color: 0xdaa520, alpha: glowAlpha });

    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(cx, cy);
    this._pauseText.style.fill = 0xdaa520;
    this._pauseText.alpha = 0.8 + Math.sin(t * 2) * 0.2;
  }

  // ---------------------------------------------------------------------------
  // Death screen — enhanced with grade glow and polished layout
  // ---------------------------------------------------------------------------

  private _drawDeathScreen(state: WyrmState, meta: WyrmMeta): void {
    const show = state.phase === WyrmPhase.DEAD;
    this._deathTitle.visible = show;
    this._deathStats.visible = show;
    this._deathPrompt.visible = show;
    for (const st of this._shopTexts) st.visible = false;
    if (!show) return;

    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.7 });

    const cx = this._sw / 2;
    const cy = this._sh / 2;
    const score = Math.floor(state.score);
    const grade = getLetterGrade(score);
    const isNew = score >= meta.highScore && score > 0;
    const coins = Math.floor(score / 100);

    // Grade circle with glow layers
    ug.circle(cx, cy - 140, 45).fill({ color: grade.color, alpha: 0.06 });
    ug.circle(cx, cy - 140, 36).fill({ color: grade.color, alpha: 0.1 });
    ug.circle(cx, cy - 140, 28).fill({ color: grade.color, alpha: 0.15 });
    // Grade ring
    ug.setStrokeStyle({ width: 2, color: grade.color, alpha: 0.4 });
    ug.circle(cx, cy - 140, 32).stroke();

    this._deathTitle.anchor.set(0.5);
    this._deathTitle.position.set(cx, cy - 140);
    this._deathTitle.text = `${grade.grade}`;
    this._deathTitle.style.fill = grade.color;

    // "NEW HIGH SCORE" banner
    if (isNew) {
      ug.roundRect(cx - 90, cy - 100, 180, 22, 3).fill({ color: 0xffd700, alpha: 0.15 });
      ug.setStrokeStyle({ width: 1, color: 0xffd700, alpha: 0.3 });
      ug.roundRect(cx - 90, cy - 100, 180, 22, 3).stroke();
    }

    this._deathStats.anchor.set(0.5);
    this._deathStats.position.set(cx, cy - 45);
    this._deathStats.text = [
      `Score: ${score}${isNew ? "  ** NEW HIGH SCORE! **" : ""}`,
      `Length: ${state.length}  |  Combo: ${state.bestCombo}x  |  Bosses: ${state.bossesKilled}`,
      `Sheep: ${state.sheepEaten}  |  Knights: ${state.knightsEaten}  |  Treasure: ${state.treasureCollected}`,
      `Wave: ${state.wave}  |  Time: ${Math.floor(state.time)}s  |  +${coins} coins`,
    ].join("\n");

    // Stat decorative icons — small colored dots next to key stats
    const statY = cy - 60;
    // Score icon (golden star)
    ug.star(cx - 85, statY + 2, 4, 3, 6, 0).fill({ color: 0xffd700, alpha: 0.5 });
    // Length icon (green circle chain)
    ug.circle(cx - 85, statY + 28, 3).fill({ color: B.COLOR_WYRM_BODY, alpha: 0.5 });
    ug.circle(cx - 78, statY + 28, 2.5).fill({ color: B.COLOR_WYRM_BODY_ALT, alpha: 0.4 });
    // Sheep icon
    ug.circle(cx - 85, statY + 54, 3).fill({ color: B.COLOR_SHEEP, alpha: 0.5 });
    // Wave icon (orange diamond)
    ug.moveTo(cx - 85, statY + 77).lineTo(cx - 82, statY + 80).lineTo(cx - 85, statY + 83).lineTo(cx - 88, statY + 80)
      .closePath().fill({ color: 0xff8844, alpha: 0.5 });

    // Blessings earned display (small icons)
    if (state.blessings.length > 0) {
      const blessY = cy + 12;
      for (let bi = 0; bi < state.blessings.length; bi++) {
        ug.circle(cx - 60 + bi * 18, blessY, 5).fill({ color: B.COLOR_BLESSING, alpha: 0.2 });
        ug.moveTo(cx - 60 + bi * 18, blessY - 3).lineTo(cx - 57 + bi * 18, blessY)
          .lineTo(cx - 60 + bi * 18, blessY + 3).lineTo(cx - 63 + bi * 18, blessY)
          .closePath().fill({ color: B.COLOR_BLESSING, alpha: 0.4 });
      }
    }

    // Upgrade shop
    const shopY = cy + 45;
    const upgrades = meta.upgrades || { extraStartLength: 0, longerFire: 0, fasterLunge: 0, thickerShield: 0, poisonResist: 0, comboKeeper: 0, wrathBoost: 0, lightningRange: 0, bossLoot: 0 };
    const shopItems = [
      { name: "Start Length +1", key: "extraStartLength" as keyof WyrmUpgrades },
      { name: "Fire Duration +2s", key: "longerFire" as keyof WyrmUpgrades },
      { name: "Lunge Cooldown -1s", key: "fasterLunge" as keyof WyrmUpgrades },
      { name: "Shield x2 Hits", key: "thickerShield" as keyof WyrmUpgrades },
      { name: "Poison Resist", key: "poisonResist" as keyof WyrmUpgrades },
      { name: "Combo Window +0.5s", key: "comboKeeper" as keyof WyrmUpgrades },
      { name: "Wrath Gain +15%", key: "wrathBoost" as keyof WyrmUpgrades },
      { name: "Lightning Range +2", key: "lightningRange" as keyof WyrmUpgrades },
      { name: "Boss Loot +2 drops", key: "bossLoot" as keyof WyrmUpgrades },
    ];

    // Shop background with title bar
    ug.roundRect(cx - 200, shopY - 8, 400, shopItems.length * 22 + 30, 6).fill({ color: 0x0a0a1e, alpha: 0.7 });
    ug.setStrokeStyle({ width: 1, color: 0x333355, alpha: 0.4 });
    ug.roundRect(cx - 200, shopY - 8, 400, shopItems.length * 22 + 30, 6).stroke();
    // Title bar
    ug.roundRect(cx - 200, shopY - 8, 400, 20, 6).fill({ color: 0x222244, alpha: 0.6 });

    for (let i = 0; i < shopItems.length; i++) {
      const item = shopItems[i];
      const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
      const costs = costTable[item.key] || [];
      const level = upgrades[item.key];
      const maxed = level >= costs.length;
      const cost = maxed ? 0 : costs[level];
      const canBuy = !maxed && meta.dragonCoins >= cost;
      const iy = shopY + 22 + i * 22;

      // Level pips with better styling
      for (let l = 0; l < costs.length; l++) {
        const pipColor = l < level ? 0x44ff44 : 0x222233;
        ug.circle(cx + 125 + l * 14, iy + 2, 4.5).fill({ color: 0x000000, alpha: 0.3 });
        ug.circle(cx + 125 + l * 14, iy + 2, 4).fill({ color: pipColor, alpha: 0.8 });
        if (l < level) {
          ug.circle(cx + 125 + l * 14, iy + 1, 2).fill({ color: 0xffffff, alpha: 0.2 });
        }
      }

      // Hover-style highlight for buyable items
      if (canBuy) {
        ug.roundRect(cx - 195, iy - 8, 390, 18, 2).fill({ color: 0xeebb33, alpha: 0.04 });
      }

      const st = this._shopTexts[i];
      if (st) {
        st.visible = true;
        if (maxed) {
          st.text = `[${i + 1}] ${item.name}  -  MAX`;
          st.style.fill = 0x44ff44;
        } else {
          st.text = `[${i + 1}] ${item.name}  -  ${cost} coins`;
          st.style.fill = canBuy ? 0xeebb33 : 0x555555;
        }
        st.position.set(cx - 190, iy - 6);
      }
    }

    // Separator line
    ug.rect(cx - 180, cy + 125, 360, 1).fill({ color: 0x333355, alpha: 0.3 });

    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(cx, cy + 145);
    this._deathPrompt.text = `Coins: ${meta.dragonCoins}  |  SPACE/R retry  |  1-9 upgrade  |  ESC exit`;
    this._deathPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;
  }
}
