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
    for (let i = 0; i < 6; i++) {
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
    const count = 50;
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        size: Math.random() * 1.5 + 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.15 + 0.03,
      });
    }
  }

  private _drawStars(g: Graphics, t: number): void {
    this._initStars();
    for (const s of this._stars) {
      const twinkle = s.brightness * (0.5 + Math.sin(t * 1.5 + s.twinklePhase) * 0.5);
      if (twinkle > 0.01) {
        g.circle(s.x, s.y, s.size).fill({ color: 0xccccdd, alpha: twinkle });
        // Cross sparkle on brighter stars
        if (s.size > 1.0 && twinkle > 0.06) {
          g.setStrokeStyle({ width: 0.5, color: 0xccccdd, alpha: twinkle * 0.5 });
          g.moveTo(s.x - s.size * 2, s.y).lineTo(s.x + s.size * 2, s.y).stroke();
          g.moveTo(s.x, s.y - s.size * 2).lineTo(s.x, s.y + s.size * 2).stroke();
        }
      }
    }
  }

  private _initFogWisps(): void {
    if (this._fogInitialized) return;
    this._fogInitialized = true;
    for (let i = 0; i < 6; i++) {
      this._fogWisps.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        width: 80 + Math.random() * 150,
        phase: Math.random() * Math.PI * 2,
        speed: 5 + Math.random() * 10,
        alpha: 0.015 + Math.random() * 0.02,
      });
    }
  }

  private _drawFogWisps(g: Graphics, t: number): void {
    this._initFogWisps();
    for (const f of this._fogWisps) {
      const fx = f.x + Math.sin(t * 0.3 + f.phase) * 30 + f.speed * t * 0.5;
      const fy = f.y + Math.cos(t * 0.2 + f.phase) * 15;
      const wrappedX = ((fx % (this._sw + f.width)) + this._sw + f.width) % (this._sw + f.width) - f.width / 2;
      const wrappedY = ((fy % (this._sh + 60)) + this._sh + 60) % (this._sh + 60) - 30;
      const breathe = f.alpha * (0.7 + Math.sin(t * 0.5 + f.phase) * 0.3);
      // Elongated fog wisp (multiple overlapping circles)
      for (let s = 0; s < 5; s++) {
        const sx = wrappedX + s * f.width * 0.22;
        const sy = wrappedY + Math.sin(t * 0.4 + f.phase + s * 0.8) * 8;
        g.circle(sx, sy, 20 + s * 5).fill({ color: 0x334455, alpha: breathe });
      }
    }
  }

  private _initAmbientMotes(): void {
    if (this._ambientInitialized) return;
    this._ambientInitialized = true;
    const count = 40;
    const colors = [0x4a3a1a, 0x6a5a2a, 0x3a4a3a, 0x5a4a2a, 0xff6600, 0xffaa33];
    for (let i = 0; i < count; i++) {
      this._ambientMotes.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 12 - 3,
        size: Math.random() * 2.0 + 0.5,
        alpha: Math.random() * 0.3 + 0.05,
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
      // Gentle sway
      m.x += Math.sin(m.phase + m.y * 0.01) * 0.3;
      m.phase += dt * 0.5;

      // Wrap around
      if (m.y < -5) { m.y = this._sh + 5; m.x = Math.random() * this._sw; }
      if (m.x < -5) m.x = this._sw + 5;
      if (m.x > this._sw + 5) m.x = -5;

      const flicker = 0.7 + Math.sin(m.phase * 3) * 0.3;
      g.circle(m.x, m.y, m.size).fill({ color: m.color, alpha: m.alpha * flicker });
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

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (state.screenShake > 0) {
      const intensity = B.SHAKE_INTENSITY * (state.screenShake / B.SHAKE_DURATION);
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
    }
    this._gfx.position.set(shakeX, shakeY);

    // Background with gradient effect (darker edges)
    this._drawBackground(g, state);
    this._drawStars(g, state.time);
    this._drawFogWisps(g, state.time);
    this._drawGrass(g, state);
    this._drawGrid(g, state);
    this._drawTrail(g, state);
    this._drawPoisonTiles(g, state);
    this._drawWalls(g, state);
    this._drawTorches(g, state);
    this._drawPickups(g, state);
    this._drawKnights(g, state);
    this._drawArchers(g, state);
    this._drawProjectiles(g, state);
    if (state.boss && state.boss.alive) this._drawBoss(g, state);
    if (state.fireBreathTimer > 0) this._drawFireBreath(g, state);
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
        // Red shift left edge, cyan shift right edge
        g.rect(0, 0, 8, sh).fill({ color: 0xff0000, alpha: abAlpha });
        g.rect(sw - 8, 0, 8, sh).fill({ color: 0x00ffff, alpha: abAlpha });
        g.rect(0, 0, sw, 6).fill({ color: 0xff0000, alpha: abAlpha * 0.7 });
        g.rect(0, sh - 6, sw, 6).fill({ color: 0x00ffff, alpha: abAlpha * 0.7 });
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

    // Subtle vignette — darken edges for depth
    const vignetteW = sw * 0.35;
    const vignetteH = sh * 0.3;
    // Top
    g.rect(0, 0, sw, vignetteH).fill({ color: 0x0a0a18, alpha: 0.25 });
    // Bottom
    g.rect(0, sh - vignetteH, sw, vignetteH).fill({ color: 0x0a0a18, alpha: 0.2 });
    // Left
    g.rect(0, 0, vignetteW, sh).fill({ color: 0x0a0a18, alpha: 0.15 });
    // Right
    g.rect(sw - vignetteW, 0, vignetteW, sh).fill({ color: 0x0a0a18, alpha: 0.15 });

    // Subtle warm glow at center (from torches)
    const cx = sw / 2, cy = sh / 2;
    g.circle(cx, cy, Math.min(sw, sh) * 0.4).fill({ color: 0x2a1a08, alpha: 0.08 });
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
        g.moveTo(bx, by).lineTo(bx + Math.cos(angle) * bladeLen, by + Math.sin(angle) * bladeLen).stroke();
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

    // Stone floor tile pattern — alternating subtle shade per cell
    if (cs > 8) {
      for (let x = 1; x < state.cols - 1; x++) {
        for (let y = 1; y < state.rows - 1; y++) {
          // Checkerboard-ish variation based on position
          const shade = ((x + y) % 2 === 0) ? 0x181828 : 0x1c1c30;
          const tileAlpha = 0.15 + ((x * 7 + y * 13) % 5) * 0.01; // slight per-tile variation
          g.rect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2).fill({ color: shade, alpha: tileAlpha });
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
    for (const t of state.trail) {
      const lifeRatio = t.life / t.maxLife;
      // Outer glow
      const glowAlpha = lifeRatio * 0.12;
      g.circle(ox + t.x * cs + half, oy + t.y * cs + half, half * 0.75)
        .fill({ color: t.color, alpha: glowAlpha });
      // Inner brighter core
      const coreAlpha = lifeRatio * 0.3;
      g.circle(ox + t.x * cs + half, oy + t.y * cs + half, half * 0.35)
        .fill({ color: t.color, alpha: coreAlpha });
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
        // Border walls — darker, more fortress-like
        g.rect(wx, wy, cs, cs).fill(0x2a1a0e);
        // Top bevel
        g.rect(wx, wy, cs, 2).fill({ color: 0x4a3a28, alpha: 0.5 });
        // Left bevel
        g.rect(wx, wy, 2, cs).fill({ color: 0x3a2a18, alpha: 0.4 });
        // Bottom shadow
        g.rect(wx, wy + cs - 1, cs, 1).fill({ color: 0x0a0804, alpha: 0.6 });
        // Crenellation texture on top border
        if (w.y === 0 && cs > 10) {
          const notchW = cs / 3;
          g.rect(wx + notchW, wy, notchW, 3).fill({ color: 0x1a0e06, alpha: 0.5 });
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

        // Breakable wall cracks
        if (isBreakable && cs > 8) {
          g.setStrokeStyle({ width: 1, color: 0x8a7a5a, alpha: 0.5 });
          g.moveTo(wx + cs * 0.2, wy + cs * 0.3).lineTo(wx + cs * 0.5, wy + cs * 0.5)
            .lineTo(wx + cs * 0.4, wy + cs * 0.8).stroke();
          g.moveTo(wx + cs * 0.6, wy + cs * 0.15).lineTo(wx + cs * 0.7, wy + cs * 0.5).stroke();
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

      // Body (armor)
      g.circle(cx, cy, r).fill(kColor);
      // Armor rim (darker edge)
      g.setStrokeStyle({ width: 1.5, color: 0x000000, alpha: 0.15 });
      g.circle(cx, cy, r).stroke();
      // Armor shine
      g.circle(cx - r * 0.2, cy - r * 0.25, r * 0.28).fill({ color: 0xffffff, alpha: 0.14 });

      const dx = DIR_DX[k.dir];
      const dy = DIR_DY[k.dir];
      const px = -dy, py = dx;

      // Helmet crest (small spike on top)
      g.setStrokeStyle({ width: 2, color: k.chasing ? 0x881111 : 0x555577, cap: "round" });
      g.moveTo(cx - dx * r * 0.3, cy - dy * r * 0.3)
        .lineTo(cx - dx * r * 0.8, cy - dy * r * 0.8).stroke();

      // Face / visor slit
      g.rect(cx + dx * r * 0.25 - 3, cy + dy * r * 0.25 - 1.5, 6, 3).fill(k.chasing ? 0x441111 : 0x222244);
      // Eye glints behind visor
      if (k.chasing) {
        g.circle(cx + dx * r * 0.3 + px * 2, cy + dy * r * 0.3 + py * 2, 1).fill({ color: 0xff4444, alpha: 0.6 });
        g.circle(cx + dx * r * 0.3 - px * 2, cy + dy * r * 0.3 - py * 2, 1).fill({ color: 0xff4444, alpha: 0.6 });
      }

      // Shield emblem on body (small cross/circle)
      g.circle(cx - dx * r * 0.1, cy - dy * r * 0.1, r * 0.2).fill({ color: k.chasing ? 0x661111 : 0x333355, alpha: 0.3 });

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

    // --- Draw smooth body using quadratic curves between segments ---
    if (positions.length >= 3) {
      // Outer body (smooth curves, thicker)
      for (let i = state.body.length - 1; i > 0; i--) {
        const from = positions[i];
        const to = positions[i - 1];
        const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
        const lineW = cs * taperFactor;
        const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;

        if (i > 1 && i < positions.length - 1) {
          // Use midpoints for smoother curves
          const prev = positions[i + 1] || from;
          const cpx = from.x + (to.x - prev.x) * 0.15;
          const cpy = from.y + (to.y - prev.y) * 0.15;
          g.setStrokeStyle({ width: lineW, color, cap: "round" });
          g.moveTo(from.x, from.y).quadraticCurveTo(cpx, cpy, to.x, to.y).stroke();
        } else {
          g.setStrokeStyle({ width: lineW, color, cap: "round" });
          g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
        }
      }

      // Dorsal stripe (spine highlight along center)
      if (cs > 12) {
        for (let i = state.body.length - 1; i > 1; i -= 2) {
          const from = positions[i];
          const to = positions[i - 1];
          const taperFactor = Math.max(0.1, 0.25 - i * 0.002);
          g.setStrokeStyle({ width: cs * taperFactor, color: 0x000000, alpha: 0.08, cap: "round" });
          g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
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

        // Head shadow
        g.circle(cx + 1, cy + 2, headR).fill({ color: 0x000000, alpha: 0.15 });

        const wyrmC = getWyrmColors(state.length);
        g.circle(cx, cy, headR).fill(wyrmC.head);

        // Head highlight (shiny scales on top)
        g.circle(cx - headR * 0.15, cy - headR * 0.2, headR * 0.4)
          .fill({ color: 0xffffff, alpha: 0.1 });

        // Horns — thicker, with gradient feel
        const dx = DIR_DX[state.direction];
        const dy = DIR_DY[state.direction];
        const px = -dy;
        const py = dx;
        const hornLen = headR * 0.7;
        // Horn shadow
        g.setStrokeStyle({ width: 4, color: 0x000000, alpha: 0.15, cap: "round" });
        g.moveTo(cx + px * headR * 0.5 + 1, cy + py * headR * 0.5 + 1)
          .lineTo(cx + px * headR * 0.5 - dx * hornLen + 1, cy + py * headR * 0.5 - dy * hornLen + 1).stroke();
        // Horn fill
        g.setStrokeStyle({ width: 3, color: 0x6a4a0a, cap: "round" });
        g.moveTo(cx + px * headR * 0.5, cy + py * headR * 0.5)
          .lineTo(cx + px * headR * 0.5 - dx * hornLen, cy + py * headR * 0.5 - dy * hornLen).stroke();
        g.setStrokeStyle({ width: 1.5, color: 0xa88a2a, cap: "round" });
        g.moveTo(cx + px * headR * 0.5, cy + py * headR * 0.5)
          .lineTo(cx + px * headR * 0.5 - dx * hornLen * 0.6, cy + py * headR * 0.5 - dy * hornLen * 0.6).stroke();
        // Second horn
        g.setStrokeStyle({ width: 4, color: 0x000000, alpha: 0.15, cap: "round" });
        g.moveTo(cx - px * headR * 0.5 + 1, cy - py * headR * 0.5 + 1)
          .lineTo(cx - px * headR * 0.5 - dx * hornLen + 1, cy - py * headR * 0.5 - dy * hornLen + 1).stroke();
        g.setStrokeStyle({ width: 3, color: 0x6a4a0a, cap: "round" });
        g.moveTo(cx - px * headR * 0.5, cy - py * headR * 0.5)
          .lineTo(cx - px * headR * 0.5 - dx * hornLen, cy - py * headR * 0.5 - dy * hornLen).stroke();
        g.setStrokeStyle({ width: 1.5, color: 0xa88a2a, cap: "round" });
        g.moveTo(cx - px * headR * 0.5, cy - py * headR * 0.5)
          .lineTo(cx - px * headR * 0.5 - dx * hornLen * 0.6, cy - py * headR * 0.5 - dy * hornLen * 0.6).stroke();

        // Nostrils — small smoke puffs when fire active
        if (state.fireBreathTimer > 0) {
          const nostrilOffset = headR * 0.3;
          for (let n = 0; n < 2; n++) {
            const np = n === 0 ? 1 : -1;
            const nx = cx + dx * headR * 0.7 + px * nostrilOffset * np;
            const ny = cy + dy * headR * 0.7 + py * nostrilOffset * np;
            // Smoke puffs
            const smokePhase = t * 4 + n * 2;
            for (let s = 0; s < 3; s++) {
              const sd = s * 0.3 + Math.sin(smokePhase + s) * 0.2;
              g.circle(nx + dx * sd * cs * 0.3, ny + dy * sd * cs * 0.3, 2 + s * 0.5)
                .fill({ color: 0x666666, alpha: 0.15 - s * 0.04 });
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

        // Eyes — glowing with light bloom
        const eyeOff = headR * 0.35;
        const eyeGlow = 0.15 + Math.sin(t * 3) * 0.05;
        // Eye glow bloom
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6, cy + dy * eyeOff + py * eyeOff * 0.6, 6)
          .fill({ color: 0xff0000, alpha: eyeGlow });
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6, cy + dy * eyeOff - py * eyeOff * 0.6, 6)
          .fill({ color: 0xff0000, alpha: eyeGlow });
        // Eye base
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6, cy + dy * eyeOff + py * eyeOff * 0.6, 3.5).fill(0xcc0000);
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6, cy + dy * eyeOff - py * eyeOff * 0.6, 3.5).fill(0xcc0000);
        // Bright pupil
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6, cy + dy * eyeOff + py * eyeOff * 0.6, 2).fill(0xff2222);
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6, cy + dy * eyeOff - py * eyeOff * 0.6, 2).fill(0xff2222);
        // Specular highlight
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6 + 1, cy + dy * eyeOff + py * eyeOff * 0.6 - 1, 1.2).fill(0xffcccc);
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6 + 1, cy + dy * eyeOff - py * eyeOff * 0.6 - 1, 1.2).fill(0xffcccc);

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

        g.circle(cx, cy, bodyR).fill(color);

        // Belly highlight (lighter underside)
        const bellyDir = state.direction;
        const bellyDx = -DIR_DX[bellyDir] * bodyR * 0.2;
        const bellyDy = -DIR_DY[bellyDir] * bodyR * 0.2;
        g.circle(cx + bellyDx, cy + bellyDy, bodyR * 0.45)
          .fill({ color: 0xffffff, alpha: 0.06 });

        // Tier-specific scale patterns
        if (cs > 10) {
          const tier = state.lastColorTier;
          if (tier <= 1) {
            // Hatchling/Drake: simple spine dots
            if (i % 2 === 0) g.circle(cx, cy, bodyR * 0.2).fill({ color: 0x000000, alpha: 0.12 });
          } else if (tier === 2) {
            // Fire Drake: flame-like scale marks
            if (i % 2 === 0) {
              g.circle(cx, cy, bodyR * 0.25).fill({ color: 0x331100, alpha: 0.15 });
              if (i % 4 === 0) {
                const fa = t * 3 + i;
                g.circle(cx + Math.sin(fa) * bodyR * 0.2, cy + Math.cos(fa) * bodyR * 0.2, bodyR * 0.15)
                  .fill({ color: 0xff4400, alpha: 0.08 });
              }
            }
          } else if (tier === 3) {
            // Elder Wyrm: mystic rune marks
            if (i % 3 === 0) {
              g.circle(cx, cy, bodyR * 0.25).fill({ color: 0x220044, alpha: 0.15 });
              g.setStrokeStyle({ width: 0.8, color: 0xcc44ff, alpha: 0.1 });
              g.circle(cx, cy, bodyR * 0.4).stroke();
            }
          } else if (tier === 4) {
            // Ancient Wyrm: golden scale highlights
            if (i % 2 === 0) {
              g.circle(cx, cy, bodyR * 0.2).fill({ color: 0x000000, alpha: 0.1 });
              g.circle(cx - bodyR * 0.1, cy - bodyR * 0.1, bodyR * 0.15)
                .fill({ color: 0xffd700, alpha: 0.08 });
            }
          } else {
            // Wyrm Lord: crimson pulsing marks
            if (i % 2 === 0) {
              const crimPulse = 0.08 + Math.sin(t * 4 + i * 0.3) * 0.04;
              g.circle(cx, cy, bodyR * 0.3).fill({ color: 0xff0022, alpha: crimPulse });
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
      const tipLen = half * 0.6;
      // Tail shadow
      g.moveTo(last.x + nx * tipLen + 1, last.y + ny * tipLen + 1)
        .lineTo(last.x - ny * 3.5 + 1, last.y + nx * 3.5 + 1)
        .lineTo(last.x + ny * 3.5 + 1, last.y - nx * 3.5 + 1)
        .closePath().fill({ color: 0x000000, alpha: 0.1 });
      // Tail spike
      g.moveTo(last.x + nx * tipLen, last.y + ny * tipLen)
        .lineTo(last.x - ny * 3.5, last.y + nx * 3.5)
        .lineTo(last.x + ny * 3.5, last.y - nx * 3.5)
        .closePath().fill(wyrmCol.bodyAlt);
      // Tail tip highlight
      g.circle(last.x + nx * tipLen * 0.5, last.y + ny * tipLen * 0.5, 1.5)
        .fill({ color: wyrmCol.head, alpha: 0.4 });
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

      // Smoke trail (fading behind each piece)
      const trailAlpha = alpha * 0.08;
      g.circle(px - seg.vx * 0.003, py - seg.vy * 0.003, Math.max(r * 1.2, 3))
        .fill({ color: 0x333333, alpha: trailAlpha });

      // Outer glow — larger, softer
      g.circle(px, py, Math.max(r * 2.0, 4)).fill({ color: seg.color, alpha: alpha * 0.1 });
      // Mid glow
      g.circle(px, py, Math.max(r * 1.4, 3)).fill({ color: seg.color, alpha: alpha * 0.18 });
      // Main piece
      g.circle(px, py, Math.max(r, 2)).fill({ color: seg.color, alpha });
      // Bright hot core
      g.circle(px, py, Math.max(r * 0.45, 1.2)).fill({ color: 0xffffff, alpha: alpha * 0.35 });

      // Tiny ember sparks around each piece (early in death)
      if (alpha > 0.5 && r > 2) {
        const sparkA = seg.rotation + state.time * 8;
        g.circle(px + Math.cos(sparkA) * r * 1.5, py + Math.sin(sparkA) * r * 1.5, 1)
          .fill({ color: 0xffaa00, alpha: alpha * 0.4 });
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

    for (let r = 1; r <= B.FIRE_BREATH_RANGE; r++) {
      const fx = head.x + dx * r;
      const fy = head.y + dy * r;
      const cx = ox + fx * cs + half;
      const cy = oy + fy * cs + half;
      const flicker = Math.sin(this._fireFlicker + r * 2) * 0.15;
      const alpha = (0.7 - r * 0.12) + flicker;
      const radius = half * (1.3 - r * 0.1);
      const px = -dy;
      const py = dx;
      const spread = r * 0.3;

      // Heat distortion glow (outermost layer)
      g.circle(cx, cy, radius * 2.0).fill({ color: 0xff2200, alpha: alpha * 0.1 });

      // Side flames (spread out)
      g.circle(cx + px * spread * cs, cy + py * spread * cs, radius * 0.9)
        .fill({ color: 0xff4400, alpha: alpha * 0.35 });
      g.circle(cx - px * spread * cs, cy - py * spread * cs, radius * 0.9)
        .fill({ color: 0xff4400, alpha: alpha * 0.35 });

      // Core fire
      g.circle(cx, cy, radius * 1.6).fill({ color: 0xff2200, alpha: alpha * 0.2 });
      g.circle(cx, cy, radius).fill({ color: 0xff6600, alpha });
      g.circle(cx, cy, radius * 0.6).fill({ color: 0xffaa00, alpha });
      g.circle(cx, cy, radius * 0.25).fill({ color: 0xffee88, alpha: alpha * 0.7 });

      // Ember sparks around fire
      for (let e = 0; e < 3; e++) {
        const ea = this._fireFlicker * 3 + e * 2.1 + r * 1.5;
        const er = radius * (0.8 + Math.sin(ea) * 0.6);
        const ex = cx + Math.cos(ea) * er;
        const ey = cy + Math.sin(ea) * er;
        g.circle(ex, ey, 1.5).fill({ color: 0xffcc00, alpha: alpha * 0.6 });
      }
    }

    // Smoke trail behind the fire
    for (let s = 1; s <= 2; s++) {
      const sx = head.x - dx * s;
      const sy = head.y - dy * s;
      const scx = ox + sx * cs + half;
      const scy = oy + sy * cs + half;
      const smokeAlpha = 0.06 - s * 0.02;
      if (smokeAlpha > 0) {
        g.circle(scx, scy, half * 0.8).fill({ color: 0x444444, alpha: smokeAlpha });
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

    // Danger aura — multi-layered
    const aura = 0.12 + Math.sin(t * 3) * 0.06;
    g.circle(cx, cy, r * 2.5).fill({ color: B.COLOR_BOSS, alpha: aura * 0.5 });
    g.circle(cx, cy, r * 2.0).fill({ color: B.COLOR_BOSS, alpha: aura });

    // Shadow
    g.circle(cx + 2, cy + 3, r * 0.9).fill({ color: 0x000000, alpha: 0.2 });

    // Body
    const bodyColor = boss.flashTimer > 0 ? 0xffffff : B.COLOR_BOSS;
    g.circle(cx, cy, r).fill(bodyColor);

    // Armor detail
    g.circle(cx, cy, r * 0.85).fill({ color: 0x000000, alpha: 0.1 });
    // Shine
    g.circle(cx - r * 0.2, cy - r * 0.25, r * 0.3).fill({ color: 0xffffff, alpha: 0.1 });

    // Helmet visor
    g.rect(cx - r * 0.4, cy - r * 0.3, r * 0.8, r * 0.2).fill(0x441133);
    // Glowing eyes behind visor
    g.circle(cx - r * 0.15, cy - r * 0.22, 2).fill({ color: 0xff4444, alpha: 0.7 + Math.sin(t * 6) * 0.3 });
    g.circle(cx + r * 0.15, cy - r * 0.22, 2).fill({ color: 0xff4444, alpha: 0.7 + Math.sin(t * 6) * 0.3 });

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
      const flickerIntensity = 0.8 + Math.sin(t * 6 + pos.x * 0.07) * 0.2;

      // Dynamic warm light pool — large radius with pulsing
      g.circle(pos.x, pos.y - 5 + flicker, cs * 3.5).fill({ color: 0xff6600, alpha: 0.015 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 2.5).fill({ color: 0xff7700, alpha: 0.025 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 1.5).fill({ color: 0xff8833, alpha: 0.04 * flickerIntensity });
      g.circle(pos.x, pos.y - 5 + flicker, cs * 0.8).fill({ color: 0xffaa44, alpha: 0.06 * flickerIntensity });

      // Ground light spill (rectangular, warm tint on nearby floor)
      const lightW = cs * 3 * flickerIntensity;
      const lightH = cs * 2.5 * flickerIntensity;
      g.rect(pos.x - lightW / 2, pos.y - lightH / 2, lightW, lightH)
        .fill({ color: 0x332200, alpha: 0.04 * flickerIntensity });

      // Torch base — bracket
      g.rect(pos.x - 2, pos.y + 1, 4, 6).fill(0x3a2a12);
      g.rect(pos.x - 3, pos.y - 5, 6, 10).fill(0x5a3a1a);
      g.rect(pos.x - 4, pos.y - 6, 8, 2).fill(0x6a4a2a);
      // Bracket detail
      g.rect(pos.x - 5, pos.y - 4, 1, 4).fill({ color: 0x4a3a1a, alpha: 0.6 });
      g.rect(pos.x + 4, pos.y - 4, 1, 4).fill({ color: 0x4a3a1a, alpha: 0.6 });

      // Flame layers — richer, more layers
      g.circle(pos.x + flicker2 * 0.4, pos.y - 7 + flicker, 6).fill({ color: 0xff2200, alpha: 0.4 });
      g.circle(pos.x + flicker2 * 0.3, pos.y - 8 + flicker, 5).fill({ color: 0xff4400, alpha: 0.6 });
      g.circle(pos.x, pos.y - 9 + flicker, 4).fill({ color: 0xff6600, alpha: 0.75 });
      g.circle(pos.x - flicker2 * 0.15, pos.y - 10 + flicker, 3).fill({ color: 0xffaa33, alpha: 0.85 });
      g.circle(pos.x, pos.y - 11 + flicker, 2).fill({ color: 0xffdd66, alpha: 0.9 });
      g.circle(pos.x, pos.y - 12 + flicker, 1).fill({ color: 0xffee88, alpha: 0.95 });

      // Multiple sparks with trails
      for (let s = 0; s < 3; s++) {
        const sparkPhase = t * (5 + s) + pos.x * (s + 1) * 0.3;
        const sparkLife = (sparkPhase % 1.5) / 1.5;
        const sx = pos.x + Math.sin(sparkPhase * 2) * (3 + s * 2);
        const sy = pos.y - 13 + flicker - sparkLife * 12;
        const sparkAlpha = (1.0 - sparkLife) * 0.5;
        if (sparkAlpha > 0.05) {
          g.circle(sx, sy, 1.2 - sparkLife * 0.5).fill({ color: 0xffcc00, alpha: sparkAlpha });
          // Spark trail
          g.circle(sx, sy + 2, 0.8).fill({ color: 0xff8800, alpha: sparkAlpha * 0.4 });
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

      // Motion trail (fading tail in direction of velocity)
      if (Math.abs(p.vx) + Math.abs(p.vy) > 20) {
        const trailDx = -p.vx * 0.004;
        const trailDy = -p.vy * 0.004;
        g.circle(px + trailDx, py + trailDy, sz * 0.7).fill({ color: p.color, alpha: alpha * 0.15 });
        g.circle(px + trailDx * 2, py + trailDy * 2, sz * 0.4).fill({ color: p.color, alpha: alpha * 0.08 });
      }

      // Outer glow
      g.circle(px, py, sz * 1.6).fill({ color: p.color, alpha: alpha * 0.15 });

      // Core — varies shape based on size
      if (p.size > 4) {
        // Larger particles: diamond/star shape
        g.moveTo(px, py - sz).lineTo(px + sz * 0.6, py).lineTo(px, py + sz).lineTo(px - sz * 0.6, py)
          .closePath().fill({ color: p.color, alpha });
      } else {
        g.circle(px, py, sz).fill({ color: p.color, alpha });
      }

      // Hot center
      if (alpha > 0.4) {
        g.circle(px, py, sz * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.25 });
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

      // Crossbow — more detailed
      g.setStrokeStyle({ width: 2.5, color: 0x6a4a1a, cap: "round" });
      g.moveTo(cx + dx * r * 0.2, cy + dy * r * 0.2)
        .lineTo(cx + dx * r * 1.3, cy + dy * r * 1.3).stroke();
      // Bow limbs (curved)
      g.setStrokeStyle({ width: 2, color: 0x8a6a2a, cap: "round" });
      g.moveTo(cx + dx * r * 0.8 + px * r * 0.6, cy + dy * r * 0.8 + py * r * 0.6)
        .quadraticCurveTo(cx + dx * r * 1.1, cy + dy * r * 1.1,
          cx + dx * r * 0.8 - px * r * 0.6, cy + dy * r * 0.8 - py * r * 0.6).stroke();
      // Bowstring
      g.setStrokeStyle({ width: 0.8, color: 0xccccaa, alpha: 0.6 });
      g.moveTo(cx + dx * r * 0.8 + px * r * 0.5, cy + dy * r * 0.8 + py * r * 0.5)
        .lineTo(cx + dx * r * 0.5, cy + dy * r * 0.5)
        .lineTo(cx + dx * r * 0.8 - px * r * 0.5, cy + dy * r * 0.8 - py * r * 0.5).stroke();

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

      // Blessing icon (symbolic shape based on blessing color)
      const iconCx = x + 22;
      const iconCy = y + 24;
      // Outer ring
      ug.circle(iconCx, iconCy, 13).fill({ color: b.color, alpha: 0.1 });
      ug.setStrokeStyle({ width: 1.5, color: b.color, alpha: 0.5 });
      ug.circle(iconCx, iconCy, 12).stroke();
      // Inner icon (diamond star)
      ug.moveTo(iconCx, iconCy - 6).lineTo(iconCx + 4, iconCy).lineTo(iconCx, iconCy + 6).lineTo(iconCx - 4, iconCy)
        .closePath().fill({ color: b.color, alpha: 0.6 });
      ug.circle(iconCx, iconCy, 2).fill({ color: 0xffffff, alpha: 0.5 });

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

    // HUD background panel
    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, 48).fill({ color: 0x000000, alpha: 0.35 });
    ug.rect(0, 48, this._sw, 1).fill({ color: 0x333344, alpha: 0.3 });

    const score = Math.floor(state.score);
    const hi = Math.max(Math.floor(meta.highScore), score);
    this._hudText.text = `SCORE: ${score}  |  LENGTH: ${state.length}  |  HI: ${hi}`;

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
    this._hudSmallText.text = parts.join("  |  ");

    if (state.comboCount >= 2) {
      this._hudRightText.text = `${state.comboCount}x COMBO`;
      this._hudRightText.alpha = 0.7 + Math.sin(state.time * 8) * 0.3;
    } else {
      this._hudRightText.text = "";
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
    const upgrades = meta.upgrades || { extraStartLength: 0, longerFire: 0, fasterLunge: 0, thickerShield: 0, poisonResist: 0, comboKeeper: 0 };
    const shopItems = [
      { name: "Start Length +1", key: "extraStartLength" as keyof WyrmUpgrades },
      { name: "Fire Duration +2s", key: "longerFire" as keyof WyrmUpgrades },
      { name: "Lunge Cooldown -1s", key: "fasterLunge" as keyof WyrmUpgrades },
      { name: "Shield x2 Hits", key: "thickerShield" as keyof WyrmUpgrades },
      { name: "Poison Resist", key: "poisonResist" as keyof WyrmUpgrades },
      { name: "Combo Window +0.5s", key: "comboKeeper" as keyof WyrmUpgrades },
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
    this._deathPrompt.text = `Coins: ${meta.dragonCoins}  |  SPACE/R retry  |  1-6 upgrade  |  ESC exit`;
    this._deathPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;
  }
}
