// ---------------------------------------------------------------------------
// Void Knight — PixiJS Renderer (v2)
// Multiplier display, graze meter, boss spawners, controls text
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { VKPhase, ProjectilePattern } from "../types";
import type { VKState, VKMeta } from "../types";
import { VK, getVKGrade } from "../config/VoidKnightBalance";
import { TUTORIAL_PROMPTS } from "../systems/VoidKnightSystem";

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 56, fill: 0x9955dd, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x220044, distance: 5, blur: 12, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 17, fill: 0x7799bb, fontStyle: "italic", letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 4, alpha: 0.5 } });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x6688aa, lineHeight: 19, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.3 } });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xbb99ee, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 4, alpha: 0.7 } });
const STYLE_HUD_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x7799bb, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.5 } });
const STYLE_MULT = new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xffee55, fontWeight: "bold", dropShadow: { color: 0x442200, distance: 2, blur: 6, alpha: 0.8 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 22, fill: 0xbb99ee, fontWeight: "bold", dropShadow: { color: 0x220044, distance: 2, blur: 5, alpha: 0.6 } });
const STYLE_DEATH_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0xff4466, fontWeight: "bold", dropShadow: { color: 0x440011, distance: 5, blur: 10, alpha: 0.9 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0xdddddd, lineHeight: 26, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.4 } });
const STYLE_DEATH_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0xbb99ee, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.5 } });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 38, fill: 0xbb99ee, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x220044, distance: 3, blur: 8, alpha: 0.7 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.95 } });

const FLOAT_POOL = 16;

export class VoidKnightRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudSmall = new Text({ text: "", style: STYLE_HUD_SMALL });
  private _multText = new Text({ text: "", style: STYLE_MULT });
  private _titleText = new Text({ text: "VOID KNIGHT", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Dodge. Dash. Survive the void.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _deathTitle = new Text({ text: "", style: STYLE_DEATH_TITLE });
  private _deathStats = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_DEATH_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _perkTexts: Text[] = []; // perk card labels
  private _sw = 0; private _sh = 0;

  private _stars: { x: number; y: number; size: number; phase: number; brightness: number; color: number }[] = [];
  private _starsInit = false;
  // Void energy wisps
  private _wisps: { x: number; y: number; vx: number; vy: number; size: number; phase: number; color: number }[] = [];
  private _wispsInit = false;

  build(sw: number, sh: number): void {
    this._sw = sw; this._sh = sh;
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    for (const t of [this._hudText, this._hudSmall, this._multText, this._titleText, this._subtitleText,
      this._controlsText, this._promptText, this._deathTitle, this._deathStats, this._deathPrompt, this._pauseText]) {
      this.container.addChild(t);
    }
    this._hudText.position.set(10, 8);
    this._hudSmall.position.set(10, 26);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5); t.visible = false;
      this._floatTexts.push(t); this._floatContainer.addChild(t);
    }
    // Perk card text labels
    for (let i = 0; i < 3; i++) {
      const pt = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xcccccc, lineHeight: 16 }) });
      pt.visible = false;
      this._perkTexts.push(pt);
      this.container.addChild(pt);
    }
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); this._uiGfx.destroy(); }

  private _initStars(): void {
    if (this._starsInit) return; this._starsInit = true;
    const starColors = [0xaaaacc, 0xccaadd, 0xaaccee, 0xddccaa, 0xccddff, 0xeeddff, 0xaabbff, 0xffeedd];
    for (let i = 0; i < 160; i++) {
      this._stars.push({ x: Math.random() * this._sw, y: Math.random() * this._sh,
        size: Math.random() * 2.2 + 0.15, phase: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.35 + 0.03,
        color: starColors[Math.floor(Math.random() * starColors.length)] });
    }
    // Void wisps
    if (!this._wispsInit) {
      this._wispsInit = true;
      const wispColors = [0x4422aa, 0x6633cc, 0x3318aa, 0x5522bb, 0x2211aa, 0x7744dd, 0x3322bb];
      for (let i = 0; i < 14; i++) {
        this._wisps.push({
          x: Math.random() * this._sw, y: Math.random() * this._sh,
          vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 3.5,
          size: 25 + Math.random() * 75, phase: Math.random() * Math.PI * 2,
          color: wispColors[Math.floor(Math.random() * wispColors.length)],
        });
      }
    }
  }

  render(state: VKState, sw: number, sh: number, meta: VKMeta): void {
    this._sw = sw; this._sh = sh;
    const g = this._gfx; g.clear(); this._uiGfx.clear();

    let shX = 0, shY = 0;
    if (state.screenShake > 0) {
      const i = VK.SHAKE_INTENSITY * (state.screenShake / VK.SHAKE_DURATION);
      shX = (Math.random() - 0.5) * i * 2; shY = (Math.random() - 0.5) * i * 2;
    }
    g.position.set(shX, shY);

    g.rect(-10, -10, sw + 20, sh + 20).fill(VK.COLOR_BG);
    this._initStars();
    this._drawNebula(g, state.time);
    this._drawStars(g, state.time);
    this._drawVoidWisps(g, state.time);
    this._drawArena(g, state);
    this._drawOrbs(g, state);
    this._drawProjectiles(g, state);
    this._drawSpawners(g, state);
    if (state.phase === VKPhase.PLAYING || state.phase === VKPhase.PAUSED) this._drawPlayer(g, state);
    this._drawParticles(g, state);
    this._drawShockwaves(g, state);
    this._drawTelegraphs(g, state);
    this._drawHazards(g, state);
    this._drawGravityWells(g, state);
    this._drawAfterimages(g, state);

    if (state.nearMissFlash > 0) {
      const nmRatio = state.nearMissFlash / VK.NEAR_MISS_FLASH_DUR;
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_NEAR_MISS, alpha: 0.1 * nmRatio });
      // Vignette-style edge glow for near miss
      const nmEdge = 15 * nmRatio;
      g.rect(0, 0, sw, nmEdge).fill({ color: VK.COLOR_NEAR_MISS, alpha: 0.06 * nmRatio });
      g.rect(0, sh - nmEdge, sw, nmEdge).fill({ color: VK.COLOR_NEAR_MISS, alpha: 0.06 * nmRatio });
      // Golden sparkle cascade shower from player position
      const nmPx = state.playerX, nmPy = state.playerY;
      for (let sp = 0; sp < 10; sp++) {
        const sparkPhase = ((state.time * 4 + sp * 0.3) % 1.0);
        const sparkAngle = sp * Math.PI * 2 / 10 + state.time * 2;
        const sparkR = 8 + sparkPhase * 25;
        const sparkX = nmPx + Math.cos(sparkAngle) * sparkR + Math.sin(state.time * 6 + sp) * 4;
        const sparkY = nmPy + Math.sin(sparkAngle) * sparkR - sparkPhase * 15;
        const sparkAlpha = nmRatio * (1 - sparkPhase) * 0.5;
        const sparkColors = [0xffee44, 0xffdd22, 0xffcc00, 0xffaa22, 0xffffff];
        const sparkColor = sparkColors[sp % sparkColors.length];
        g.circle(sparkX, sparkY, 1.5 * (1 - sparkPhase * 0.5)).fill({ color: sparkColor, alpha: sparkAlpha });
        g.circle(sparkX, sparkY, 3 * (1 - sparkPhase * 0.3)).fill({ color: sparkColor, alpha: sparkAlpha * 0.3 });
      }
    }
    if (state.slowTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_SLOW_TINT, alpha: 0.035 + Math.sin(state.time * 2) * 0.01 });
    }
    if (state.reflectTimer > 0) {
      const ra = 0.035 + Math.sin(state.time * 8) * 0.018;
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_ORB_REFLECT, alpha: ra });
      // Subtle reflect border shimmer
      const reflEdge = 8;
      g.rect(0, 0, sw, reflEdge).fill({ color: VK.COLOR_ORB_REFLECT, alpha: ra * 0.5 });
      g.rect(0, sh - reflEdge, sw, reflEdge).fill({ color: VK.COLOR_ORB_REFLECT, alpha: ra * 0.5 });
    }
    if (state.hasteTimer > 0) {
      const ha = 0.025 + Math.sin(state.time * 6) * 0.012;
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_ORB_HASTE, alpha: ha });
      // Speed lines around the player
      const px = state.playerX, py = state.playerY;
      for (let sl = 0; sl < 8; sl++) {
        const sAngle = sl * Math.PI / 4 + state.time * 3;
        const sR1 = state.playerRadius * 3.5 + Math.sin(state.time * 8 + sl) * 4;
        const sR2 = sR1 + 12 + Math.sin(state.time * 6 + sl * 2) * 4;
        g.setStrokeStyle({ width: 1.2, color: VK.COLOR_ORB_HASTE, alpha: 0.15 + Math.sin(state.time * 5 + sl) * 0.08 });
        g.moveTo(px + Math.cos(sAngle) * sR1, py + Math.sin(sAngle) * sR1)
          .lineTo(px + Math.cos(sAngle) * sR2, py + Math.sin(sAngle) * sR2).stroke();
      }
      // Green-cyan tint trail behind player movement
      const hvLen = Math.sqrt(state.playerVX * state.playerVX + state.playerVY * state.playerVY);
      if (hvLen > 30) {
        const hndx = -state.playerVX / hvLen, hndy = -state.playerVY / hvLen;
        g.setStrokeStyle({ width: state.playerRadius * 2, color: VK.COLOR_ORB_HASTE, alpha: 0.06, cap: "round" });
        g.moveTo(px, py).lineTo(px + hndx * 30, py + hndy * 30).stroke();
        g.setStrokeStyle({ width: state.playerRadius, color: VK.COLOR_ORB_HASTE, alpha: 0.1, cap: "round" });
        g.moveTo(px, py).lineTo(px + hndx * 22, py + hndy * 22).stroke();
      }
    }
    if (state.screenFlashTimer > 0) {
      const flashRatio = state.screenFlashTimer / VK.FLASH_DURATION;
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.25 * flashRatio });
      // Flash bloom center
      g.circle(sw / 2, sh / 2, Math.max(sw, sh) * 0.3 * flashRatio).fill({ color: state.screenFlashColor, alpha: 0.06 * flashRatio });
    }

    // Bloom/glow post-processing simulation — extra glow circles on bright elements (player, spawners)
    if (state.phase === VKPhase.PLAYING) {
      // Player bloom
      const bloomAlpha = 0.015 + Math.sin(state.time * 1.5) * 0.005;
      g.circle(state.playerX, state.playerY, state.playerRadius * 5).fill({ color: VK.COLOR_PLAYER, alpha: bloomAlpha });
      // Spawner blooms
      for (const sp of state.spawners) {
        if (!sp.alive) continue;
        const spx = state.arenaCenterX + Math.cos(sp.angle) * state.arenaRadius;
        const spy = state.arenaCenterY + Math.sin(sp.angle) * state.arenaRadius;
        const spColor = sp.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER;
        g.circle(spx, spy, VK.SPAWNER_RADIUS * 4).fill({ color: spColor, alpha: 0.012 });
      }
    }

    // Screen pulse on multiplier milestones (at 2x, 4x, 6x, 8x, 10x)
    if (state.phase === VKPhase.PLAYING && state.multiplier >= 2) {
      const multMilestone = Math.floor(state.multiplier / 2) * 2;
      const multFrac = state.multiplier - multMilestone;
      if (multFrac < 0.3 && multFrac >= 0) {
        const pulseAlpha = (0.3 - multFrac) / 0.3 * 0.04;
        g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_MULTIPLIER, alpha: pulseAlpha });
      }
    }

    // Void corruption creeping from edges on high waves
    if (state.phase === VKPhase.PLAYING && state.wave >= 3) {
      const corruptLevel = Math.min(1, (state.wave - 2) / 10);
      const corruptEdge = 15 + corruptLevel * 30;
      const corruptPulse = 0.02 + Math.sin(state.time * 0.8) * 0.01;
      const corruptAlpha = corruptPulse * corruptLevel;
      // Top edge corruption
      g.rect(0, 0, sw, corruptEdge).fill({ color: 0x220044, alpha: corruptAlpha });
      // Bottom edge corruption
      g.rect(0, sh - corruptEdge, sw, corruptEdge).fill({ color: 0x220044, alpha: corruptAlpha });
      // Left edge corruption
      g.rect(0, 0, corruptEdge, sh).fill({ color: 0x220044, alpha: corruptAlpha * 0.7 });
      // Right edge corruption
      g.rect(sw - corruptEdge, 0, corruptEdge, sh).fill({ color: 0x220044, alpha: corruptAlpha * 0.7 });
      // Corruption tendrils reaching inward (wavy lines from edges)
      if (corruptLevel > 0.3) {
        for (let ct = 0; ct < 6; ct++) {
          const ctX = (ct / 6) * sw + Math.sin(state.time * 0.5 + ct) * 20;
          const ctLen = corruptEdge * (0.5 + Math.sin(state.time * 1.5 + ct * 2) * 0.3);
          g.setStrokeStyle({ width: 1, color: 0x440088, alpha: corruptAlpha * 1.5 });
          g.moveTo(ctX, 0).lineTo(ctX + Math.sin(state.time + ct) * 8, ctLen).stroke();
          g.moveTo(ctX, sh).lineTo(ctX + Math.sin(state.time + ct + 1) * 8, sh - ctLen).stroke();
        }
      }
    }

    // CRT-style scanline overlay (very subtle)
    if (state.phase === VKPhase.PLAYING || state.phase === VKPhase.PAUSED) {
      const scanlineSpacing = 3;
      const scanlineAlpha = 0.015;
      for (let sy2 = 0; sy2 < sh; sy2 += scanlineSpacing * 2) {
        g.rect(0, sy2, sw, 1).fill({ color: 0x000000, alpha: scanlineAlpha });
      }
    }

    this._drawFloatTexts(state);
    this._drawHUD(state, meta);
    this._drawGrazeMeter(state);
    this._drawMultiplier(state);
    this._drawTutorialPrompt(state);
    this._drawWaveIntro(state);
    this._drawDeathReplay(state);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawPerkScreen(state);
    this._drawDeathScreen(state, meta);
  }

  private _drawNebula(g: Graphics, t: number): void {
    const cx = this._sw / 2, cy = this._sh / 2;
    // Deep background nebula layer (very large, very subtle)
    g.circle(cx * 0.5, cy * 0.5, 280).fill({ color: 0x0a0520, alpha: 0.12 + Math.sin(t * 0.1) * 0.02 });
    g.circle(cx * 1.5, cy * 1.5, 260).fill({ color: 0x050a20, alpha: 0.1 + Math.sin(t * 0.12 + 4) * 0.02 });
    // Mid nebula clouds — large soft circles
    g.circle(cx * 0.7, cy * 0.6, 200).fill({ color: 0x1a0e30, alpha: 0.16 + Math.sin(t * 0.2) * 0.04 });
    g.circle(cx * 1.3, cy * 1.2, 170).fill({ color: 0x0e1a30, alpha: 0.13 + Math.sin(t * 0.3 + 1) * 0.04 });
    g.circle(cx * 0.4, cy * 1.4, 140).fill({ color: 0x200e30, alpha: 0.09 + Math.sin(t * 0.25 + 2) * 0.03 });
    g.circle(cx * 1.5, cy * 0.4, 120).fill({ color: 0x10102a, alpha: 0.11 + Math.sin(t * 0.15 + 3) * 0.03 });
    // Bright accent nebula wisps (smaller, more saturated)
    g.circle(cx * 0.9, cy * 0.8, 90).fill({ color: 0x2a1050, alpha: 0.08 + Math.sin(t * 0.35 + 5) * 0.03 });
    g.circle(cx * 1.1, cy * 0.3, 70).fill({ color: 0x15083a, alpha: 0.07 + Math.sin(t * 0.28 + 6) * 0.025 });
    g.circle(cx * 0.3, cy * 0.9, 80).fill({ color: 0x0e1535, alpha: 0.06 + Math.sin(t * 0.32 + 7) * 0.02 });
    // Warm accent
    g.circle(cx * 1.2, cy * 0.7, 60).fill({ color: 0x2a1520, alpha: 0.04 + Math.sin(t * 0.22 + 8) * 0.015 });

    // Distant galaxy spirals
    for (let gi = 0; gi < 3; gi++) {
      const gx = cx * (0.3 + gi * 0.55), gy = cy * (0.25 + gi * 0.4);
      const gr = 25 + gi * 10;
      const ga = t * 0.05 + gi * 2;
      g.circle(gx, gy, gr).fill({ color: 0x1a1040, alpha: 0.06 });
      for (let arm = 0; arm < 3; arm++) {
        const armA = ga + (arm / 3) * Math.PI * 2;
        for (let d = 0; d < 8; d++) {
          const dr = (d / 8) * gr;
          const da = armA + d * 0.3;
          g.circle(gx + Math.cos(da) * dr, gy + Math.sin(da) * dr, 1.5 - d * 0.15)
            .fill({ color: 0x6644aa, alpha: 0.04 - d * 0.004 });
        }
      }
    }

    // Shooting star / meteor streaks (deterministic from time)
    for (let mi = 0; mi < 2; mi++) {
      const mPhase = Math.floor(t * 0.3 + mi * 7) * 0.7;
      const mFrac = (t * 0.3 + mi * 7) % 1;
      if (mFrac < 0.15) {
        const mx = (Math.sin(mPhase * 3.7) * 0.5 + 0.5) * this._sw;
        const my = (Math.sin(mPhase * 2.3) * 0.3 + 0.2) * this._sh;
        const mLen = 40 + mi * 20;
        const mAlpha = (0.15 - mFrac) / 0.15 * 0.3;
        g.moveTo(mx, my).lineTo(mx + mLen, my + mLen * 0.3).stroke({ color: 0xccccff, width: 1, alpha: mAlpha });
        g.circle(mx, my, 2).fill({ color: 0xffffff, alpha: mAlpha * 2 });
      }
    }

    // Cosmic dust clouds (larger, colored)
    g.circle(cx * 0.2, cy * 1.6, 150).fill({ color: 0x0a0520, alpha: 0.04 + Math.sin(t * 0.08) * 0.01 });
    g.circle(cx * 1.8, cy * 0.2, 130).fill({ color: 0x100528, alpha: 0.035 + Math.sin(t * 0.09 + 2) * 0.01 });
  }

  private _drawStars(g: Graphics, t: number): void {
    for (const s of this._stars) {
      const tw = s.brightness * (0.5 + Math.sin(t * 1.2 + s.phase) * 0.5);
      if (tw > 0.01) {
        // Soft halo for brighter stars
        if (s.size > 1.0 && tw > 0.05) {
          g.circle(s.x, s.y, s.size * 3.5).fill({ color: s.color, alpha: tw * 0.06 });
          g.circle(s.x, s.y, s.size * 2.2).fill({ color: s.color, alpha: tw * 0.12 });
        }
        // Core
        g.circle(s.x, s.y, s.size).fill({ color: s.color, alpha: tw });
        // Bright center for large stars
        if (s.size > 1.5) {
          g.circle(s.x, s.y, s.size * 0.4).fill({ color: 0xffffff, alpha: tw * 0.5 });
        }
        // Cross diffraction spikes for prominent stars
        if (s.size > 1.2 && tw > 0.06) {
          const spikeLen = s.size * 3.5;
          g.setStrokeStyle({ width: 0.6, color: s.color, alpha: tw * 0.3 });
          g.moveTo(s.x - spikeLen, s.y).lineTo(s.x + spikeLen, s.y).stroke();
          g.moveTo(s.x, s.y - spikeLen).lineTo(s.x, s.y + spikeLen).stroke();
          // Diagonal spikes for the brightest stars
          if (s.size > 1.8 && tw > 0.1) {
            const diagLen = spikeLen * 0.6;
            g.setStrokeStyle({ width: 0.4, color: s.color, alpha: tw * 0.18 });
            g.moveTo(s.x - diagLen, s.y - diagLen).lineTo(s.x + diagLen, s.y + diagLen).stroke();
            g.moveTo(s.x + diagLen, s.y - diagLen).lineTo(s.x - diagLen, s.y + diagLen).stroke();
          }
        }
      }
    }
  }

  private _drawVoidWisps(g: Graphics, t: number): void {
    for (const w of this._wisps) {
      w.x += w.vx * (1 / 60); w.y += w.vy * (1 / 60);
      w.x += Math.sin(w.phase + t * 0.3) * 0.5;
      w.y += Math.cos(w.phase + t * 0.25) * 0.3;
      // Wrap
      if (w.x < -w.size) w.x = this._sw + w.size;
      if (w.x > this._sw + w.size) w.x = -w.size;
      if (w.y < -w.size) w.y = this._sh + w.size;
      if (w.y > this._sh + w.size) w.y = -w.size;

      const breathe = 0.025 + Math.sin(t * 0.4 + w.phase) * 0.012;
      // Outermost diffuse halo
      g.circle(w.x, w.y, w.size * 1.4).fill({ color: w.color, alpha: breathe * 0.25 });
      // Main wisp body — multi-circle with organic offsets
      g.circle(w.x, w.y, w.size).fill({ color: w.color, alpha: breathe });
      const drift1 = Math.sin(t * 0.5 + w.phase) * w.size * 0.1;
      const drift2 = Math.cos(t * 0.4 + w.phase * 1.3) * w.size * 0.1;
      g.circle(w.x + w.size * 0.35 + drift1, w.y - w.size * 0.25, w.size * 0.65).fill({ color: w.color, alpha: breathe * 0.7 });
      g.circle(w.x - w.size * 0.25 + drift2, w.y + w.size * 0.35, w.size * 0.45).fill({ color: w.color, alpha: breathe * 0.55 });
      g.circle(w.x + w.size * 0.15, w.y - w.size * 0.4, w.size * 0.35).fill({ color: w.color, alpha: breathe * 0.4 });
      // Bright inner core
      g.circle(w.x, w.y, w.size * 0.2).fill({ color: w.color, alpha: breathe * 2.5 });
    }
  }

  private _drawArena(g: Graphics, state: VKState): void {
    const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
    const t = state.time;

    // Arena floor with deeper radial gradient
    g.circle(cx, cy, r).fill(VK.COLOR_ARENA_FLOOR);
    g.circle(cx, cy, r * 0.85).fill({ color: 0x0f0d22, alpha: 0.2 });
    g.circle(cx, cy, r * 0.65).fill({ color: 0x12102a, alpha: 0.3 });
    g.circle(cx, cy, r * 0.45).fill({ color: 0x161430, alpha: 0.25 });
    g.circle(cx, cy, r * 0.25).fill({ color: 0x1a1838, alpha: 0.15 });

    // Floor tile grid pattern (subtle depth effect)
    const gridSpacing = 35;
    const gridAlpha = 0.018 + Math.sin(t * 0.3) * 0.005;
    for (let gx = cx - r; gx <= cx + r; gx += gridSpacing) {
      const dx = gx - cx;
      if (Math.abs(dx) < r) {
        const halfH = Math.sqrt(r * r - dx * dx);
        g.setStrokeStyle({ width: 0.4, color: VK.COLOR_ARENA_GLOW, alpha: gridAlpha * (1 - Math.abs(dx) / r) });
        g.moveTo(gx, cy - halfH).lineTo(gx, cy + halfH).stroke();
      }
    }
    for (let gy = cy - r; gy <= cy + r; gy += gridSpacing) {
      const dy = gy - cy;
      if (Math.abs(dy) < r) {
        const halfW = Math.sqrt(r * r - dy * dy);
        g.setStrokeStyle({ width: 0.4, color: VK.COLOR_ARENA_GLOW, alpha: gridAlpha * (1 - Math.abs(dy) / r) });
        g.moveTo(cx - halfW, gy).lineTo(cx + halfW, gy).stroke();
      }
    }

    // Rotating arcane circle pattern (inner)
    const arcaneRot = t * 0.15;
    const arcaneR = r * 0.6;
    g.setStrokeStyle({ width: 0.8, color: VK.COLOR_ARENA_GLOW, alpha: 0.04 + Math.sin(t * 0.5) * 0.015 });
    g.circle(cx, cy, arcaneR).stroke();
    // Arcane inscriptions — rotating segmented arcs with gaps
    for (let seg = 0; seg < 6; seg++) {
      const segStart = arcaneRot + seg * Math.PI / 3;
      const segEnd = segStart + Math.PI / 4.5;
      const segAlpha = 0.04 + Math.sin(t * 0.8 + seg * 1.5) * 0.02;
      g.setStrokeStyle({ width: 1.2, color: VK.COLOR_ARENA_GLOW, alpha: segAlpha });
      g.moveTo(cx + Math.cos(segStart) * arcaneR, cy + Math.sin(segStart) * arcaneR);
      for (let s = 1; s <= 6; s++) {
        const a = segStart + (segEnd - segStart) * (s / 6);
        g.lineTo(cx + Math.cos(a) * arcaneR, cy + Math.sin(a) * arcaneR);
      }
      g.stroke();
      // Small tick marks along arcane circle
      const tickA = segStart + Math.PI / 9;
      const tickInner = arcaneR - 5, tickOuter = arcaneR + 5;
      g.setStrokeStyle({ width: 0.6, color: VK.COLOR_ARENA_GLOW, alpha: segAlpha * 0.8 });
      g.moveTo(cx + Math.cos(tickA) * tickInner, cy + Math.sin(tickA) * tickInner)
        .lineTo(cx + Math.cos(tickA) * tickOuter, cy + Math.sin(tickA) * tickOuter).stroke();
    }
    // Second arcane circle (counter-rotating, larger)
    const arcaneR2 = r * 0.78;
    const arcaneRot2 = -t * 0.1;
    for (let seg = 0; seg < 8; seg++) {
      const segStart = arcaneRot2 + seg * Math.PI / 4;
      const segEnd = segStart + Math.PI / 6;
      const segAlpha = 0.025 + Math.sin(t * 0.6 + seg * 1.2) * 0.012;
      g.setStrokeStyle({ width: 0.7, color: VK.COLOR_ARENA_GLOW, alpha: segAlpha });
      g.moveTo(cx + Math.cos(segStart) * arcaneR2, cy + Math.sin(segStart) * arcaneR2);
      for (let s = 1; s <= 4; s++) {
        const a = segStart + (segEnd - segStart) * (s / 4);
        g.lineTo(cx + Math.cos(a) * arcaneR2, cy + Math.sin(a) * arcaneR2);
      }
      g.stroke();
    }

    // Concentric rings with heartbeat pulse
    const heartbeat = 0.5 + Math.sin(t * 1.2) * 0.5;
    for (let ring = 1; ring <= 8; ring++) {
      const rr = r * ring / 8;
      const ringPulse = 0.035 + Math.sin(t * 0.5 + ring * 0.7) * 0.018 + heartbeat * 0.012;
      g.setStrokeStyle({ width: ring === 4 || ring === 8 ? 1.5 : 0.8, color: VK.COLOR_ARENA_GLOW, alpha: ringPulse });
      g.circle(cx, cy, rr).stroke();
    }

    // Energy veins (radial lines from center) — pulsing outward waves
    for (let v = 0; v < 12; v++) {
      const va = v * Math.PI / 6 + t * 0.04;
      const vAlpha = 0.025 + Math.sin(t * 0.8 + v * 1.2) * 0.015;
      // Main vein
      g.setStrokeStyle({ width: v % 3 === 0 ? 1.2 : 0.7, color: VK.COLOR_ARENA_GLOW, alpha: vAlpha });
      g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * r * 0.92, cy + Math.sin(va) * r * 0.92).stroke();
      // Glow alongside main veins
      if (v % 3 === 0) {
        g.setStrokeStyle({ width: 3, color: VK.COLOR_ARENA_GLOW, alpha: vAlpha * 0.25 });
        g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * r * 0.92, cy + Math.sin(va) * r * 0.92).stroke();
        // Pulse dot traveling outward along vein
        const pulsePos = ((t * 0.4 + v * 0.15) % 1.0);
        const pDist = pulsePos * r * 0.9;
        const pAlpha = vAlpha * 2 * (1 - pulsePos);
        g.circle(cx + Math.cos(va) * pDist, cy + Math.sin(va) * pDist, 2.5)
          .fill({ color: VK.COLOR_ARENA_GLOW, alpha: pAlpha });
        g.circle(cx + Math.cos(va) * pDist, cy + Math.sin(va) * pDist, 5)
          .fill({ color: VK.COLOR_ARENA_GLOW, alpha: pAlpha * 0.3 });
      }
    }

    // Outer glow layers (more gradual falloff)
    g.circle(cx, cy, r + 28).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.012 });
    g.circle(cx, cy, r + 20).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.025 });
    g.circle(cx, cy, r + 12).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.045 });
    g.circle(cx, cy, r + 6).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.065 });

    // Arena border reacts to danger level (projectile count + multiplier)
    const dangerLevel = Math.min(1, state.projectiles.length / 40);
    const borderColor = dangerLevel > 0.5
      ? lerpColor(VK.COLOR_ARENA_BORDER, VK.COLOR_DANGER, (dangerLevel - 0.5) * 2)
      : VK.COLOR_ARENA_BORDER;
    const borderPulseSpeed = 2 + state.multiplier * 0.5;

    const segments = 32;
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2 + t * 0.3;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + t * 0.3;
      const pulse = 0.45 + Math.sin(t * borderPulseSpeed + i) * 0.18;
      // Outer glow line
      g.setStrokeStyle({ width: VK.ARENA_BORDER_WIDTH + 3, color: borderColor, alpha: pulse * 0.15 });
      g.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      for (let s = 1; s <= 8; s++) {
        const a = a1 + (a2 - a1) * (s / 8);
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.stroke();
      // Core line
      g.setStrokeStyle({ width: VK.ARENA_BORDER_WIDTH, color: borderColor, alpha: pulse });
      g.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      for (let s = 1; s <= 8; s++) {
        const a = a1 + (a2 - a1) * (s / 8);
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.stroke();
    }

    // Rune symbols around border — glow intensity scales with near-miss streak
    const streakGlow = Math.min(1, state.nearMissStreak / 8);
    const runeCount = 8;
    for (let i = 0; i < runeCount; i++) {
      const a = i * Math.PI * 2 / runeCount + t * 0.1;
      const rx = cx + Math.cos(a) * (r + 22);
      const ry = cy + Math.sin(a) * (r + 22);
      const baseAlpha = 0.08 + Math.sin(t * 1.5 + i * 2) * 0.04;
      const runeAlpha = baseAlpha + streakGlow * 0.35;
      const runeColor = streakGlow > 0.3
        ? lerpColor(VK.COLOR_ARENA_BORDER, VK.COLOR_NEAR_MISS, streakGlow)
        : VK.COLOR_ARENA_BORDER;
      // Rune glow halo (scales with streak)
      g.circle(rx, ry, 8 + streakGlow * 10).fill({ color: runeColor, alpha: runeAlpha * 0.15 });
      g.circle(rx, ry, 5 + streakGlow * 5).fill({ color: runeColor, alpha: runeAlpha * 0.4 });
      // Rune shape — alternating symbols
      if (i % 3 === 0) {
        // Diamond rune
        g.moveTo(rx, ry - 5).lineTo(rx + 4, ry).lineTo(rx, ry + 5).lineTo(rx - 4, ry).closePath()
          .fill({ color: runeColor, alpha: runeAlpha * 1.8 });
      } else if (i % 3 === 1) {
        // Triangle rune
        g.moveTo(rx, ry - 5).lineTo(rx + 4.5, ry + 3.5).lineTo(rx - 4.5, ry + 3.5).closePath()
          .fill({ color: runeColor, alpha: runeAlpha * 1.8 });
      } else {
        // Cross/star rune
        g.setStrokeStyle({ width: 1.5, color: runeColor, alpha: runeAlpha * 1.8 });
        g.moveTo(rx - 4, ry).lineTo(rx + 4, ry).stroke();
        g.moveTo(rx, ry - 4).lineTo(rx, ry + 4).stroke();
        g.moveTo(rx - 2.5, ry - 2.5).lineTo(rx + 2.5, ry + 2.5).stroke();
        g.moveTo(rx + 2.5, ry - 2.5).lineTo(rx - 2.5, ry + 2.5).stroke();
      }
      // Tiny bright center
      g.circle(rx, ry, 1.5).fill({ color: 0xffffff, alpha: runeAlpha * 0.6 });
      // Streak-powered connecting arc between adjacent runes
      if (streakGlow > 0.2) {
        const nextA = (i + 1) * Math.PI * 2 / runeCount + t * 0.1;
        const nrx = cx + Math.cos(nextA) * (r + 22);
        const nry = cy + Math.sin(nextA) * (r + 22);
        g.setStrokeStyle({ width: 0.6, color: runeColor, alpha: (streakGlow - 0.2) * 0.15 });
        g.moveTo(rx, ry).lineTo(nrx, nry).stroke();
      }
    }

    // Center crosshair with glow
    g.circle(cx, cy, 8).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.03 });
    g.setStrokeStyle({ width: 1.2, color: VK.COLOR_ARENA_GLOW, alpha: 0.08 });
    g.moveTo(cx - 14, cy).lineTo(cx + 14, cy).stroke();
    g.moveTo(cx, cy - 14).lineTo(cx, cy + 14).stroke();
    g.circle(cx, cy, 2).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.12 });
  }

  private _drawPlayer(g: Graphics, state: VKState): void {
    const px = state.playerX, py = state.playerY, pr = state.playerRadius;
    const t = state.time;

    // Shield aura
    if (state.shieldHits > 0) {
      for (let s = 0; s < state.shieldHits; s++) {
        const pulse = 0.1 + Math.sin(t * 5 + s * 1.5) * 0.05;
        g.circle(px, py, pr * (2.5 + s * 0.5)).fill({ color: VK.COLOR_SHIELD, alpha: pulse });
        g.setStrokeStyle({ width: 1, color: VK.COLOR_SHIELD, alpha: pulse * 2 });
        g.circle(px, py, pr * (2.5 + s * 0.5)).stroke();
      }
    }

    // Reflect aura
    if (state.reflectTimer > 0) {
      const rPulse = 0.12 + Math.sin(t * 8) * 0.06;
      g.circle(px, py, 30).fill({ color: VK.COLOR_ORB_REFLECT, alpha: rPulse });
      g.setStrokeStyle({ width: 1.5, color: VK.COLOR_ORB_REFLECT, alpha: rPulse * 2 });
      g.circle(px, py, 30).stroke();
    }

    // Magnet radius
    if (state.magnetTimer > 0) {
      g.setStrokeStyle({ width: 1, color: VK.COLOR_ORB_MAGNET, alpha: 0.1 + Math.sin(t * 4) * 0.05 });
      for (let i = 0; i < 12; i += 2) {
        const a1 = (i / 12) * Math.PI * 2 + t * 0.8;
        const a2 = ((i + 1) / 12) * Math.PI * 2 + t * 0.8;
        g.moveTo(px + Math.cos(a1) * VK.MAGNET_RADIUS, py + Math.sin(a1) * VK.MAGNET_RADIUS);
        for (let s = 1; s <= 3; s++) g.lineTo(px + Math.cos(a1 + (a2 - a1) * s / 3) * VK.MAGNET_RADIUS, py + Math.sin(a1 + (a2 - a1) * s / 3) * VK.MAGNET_RADIUS);
        g.stroke();
      }
    }

    // Graze burst ready ring
    if (state.grazeBurstReady) {
      const gPulse = 0.15 + Math.sin(t * 6) * 0.1;
      g.setStrokeStyle({ width: 2, color: VK.COLOR_GRAZE, alpha: gPulse });
      g.circle(px, py, VK.GRAZE_BURST_RADIUS).stroke();
      g.circle(px, py, VK.GRAZE_BURST_RADIUS).fill({ color: VK.COLOR_GRAZE, alpha: gPulse * 0.15 });
    }

    // Last Stand visual — red danger pulse when available (not yet used, graze >= cost)
    if (!state.lastStandUsed && state.grazeMeter >= VK.LAST_STAND_GRAZE_COST && state.shieldHits <= 0) {
      const lsPulse = 0.06 + Math.sin(t * 3) * 0.03;
      g.circle(px, py, pr * 3).fill({ color: VK.COLOR_DANGER, alpha: lsPulse });
    }

    // Last Stand active flash (brief desaturated burst)
    if (state.lastStandActive) {
      g.circle(px, py, 60).fill({ color: VK.COLOR_DANGER, alpha: 0.15 });
      g.setStrokeStyle({ width: 3, color: VK.COLOR_DANGER, alpha: 0.4 });
      g.circle(px, py, 50).stroke();
      state.lastStandActive = false; // clear after one render frame
    }

    // Compute direction first (used by dash trail AND body)
    const color = state.dashTimer > 0 ? VK.COLOR_PLAYER_DASH : VK.COLOR_PLAYER;
    const vLen = Math.sqrt(state.playerVX * state.playerVX + state.playerVY * state.playerVY);
    const ndx = vLen > 10 ? state.playerVX / vLen : 0;
    const ndy = vLen > 10 ? state.playerVY / vLen : -1;
    const perpX = -ndy, perpY = ndx;

    // Dash trail — elongated streak with afterimages
    if (state.dashTimer > 0) {
      const trailAlpha = state.dashTimer / VK.DASH_DURATION;
      const ddx = state.dashDirX, ddy = state.dashDirY;
      const dPerp = { x: -ddy, y: ddx };

      // Central speed streak
      g.setStrokeStyle({ width: pr * 1.5, color: VK.COLOR_PLAYER_DASH, alpha: trailAlpha * 0.12, cap: "round" });
      g.moveTo(px, py).lineTo(px - ddx * 50, py - ddy * 50).stroke();

      // Afterimage ghosts with chromatic aberration (RGB split)
      for (let tr = 1; tr <= 6; tr++) {
        const tx = px - ddx * tr * 8;
        const ty = py - ddy * tr * 8;
        const ta = trailAlpha * (0.25 - tr * 0.04);
        if (ta <= 0) break;
        const tSize = pr * (1.0 - tr * 0.08);
        const chromaOff = tr * 1.5; // chromatic aberration offset grows with distance
        // Red channel (offset left/up)
        g.moveTo(tx - chromaOff + ddx * tSize, ty - chromaOff * 0.5 + ddy * tSize)
          .lineTo(tx - chromaOff + dPerp.x * tSize * 0.4, ty - chromaOff * 0.5 + dPerp.y * tSize * 0.4)
          .lineTo(tx - chromaOff - ddx * tSize * 0.5, ty - chromaOff * 0.5 - ddy * tSize * 0.5)
          .lineTo(tx - chromaOff - dPerp.x * tSize * 0.4, ty - chromaOff * 0.5 - dPerp.y * tSize * 0.4)
          .closePath().fill({ color: 0xff4444, alpha: ta * 0.5 });
        // Blue channel (offset right/down)
        g.moveTo(tx + chromaOff + ddx * tSize, ty + chromaOff * 0.5 + ddy * tSize)
          .lineTo(tx + chromaOff + dPerp.x * tSize * 0.4, ty + chromaOff * 0.5 + dPerp.y * tSize * 0.4)
          .lineTo(tx + chromaOff - ddx * tSize * 0.5, ty + chromaOff * 0.5 - ddy * tSize * 0.5)
          .lineTo(tx + chromaOff - dPerp.x * tSize * 0.4, ty + chromaOff * 0.5 - dPerp.y * tSize * 0.4)
          .closePath().fill({ color: 0x4488ff, alpha: ta * 0.5 });
        // White core (original position)
        g.moveTo(tx + ddx * tSize, ty + ddy * tSize)
          .lineTo(tx + dPerp.x * tSize * 0.4, ty + dPerp.y * tSize * 0.4)
          .lineTo(tx - ddx * tSize * 0.5, ty - ddy * tSize * 0.5)
          .lineTo(tx - dPerp.x * tSize * 0.4, ty - dPerp.y * tSize * 0.4)
          .closePath().fill({ color: VK.COLOR_PLAYER_DASH, alpha: ta });
      }

      // Speed lines beside the trail
      for (let sl = 0; sl < 3; sl++) {
        const slOff = (sl - 1) * pr * 2.5;
        const slx = px + dPerp.x * slOff - ddx * 15;
        const sly = py + dPerp.y * slOff - ddy * 15;
        g.setStrokeStyle({ width: 1, color: VK.COLOR_PLAYER_DASH, alpha: trailAlpha * 0.15 });
        g.moveTo(slx, sly).lineTo(slx - ddx * 20, sly - ddy * 20).stroke();
      }
    }

    // Multiplier-reactive aura (scales dramatically with multiplier)
    const multLevel = state.multiplier;
    if (multLevel > 1.2) {
      const mGlow = Math.min(0.25, (multLevel - 1) * 0.04);
      const mRadius = pr * (2.5 + multLevel * 0.4);
      g.circle(px, py, mRadius).fill({ color: VK.COLOR_MULTIPLIER, alpha: mGlow * 0.5 });
      g.circle(px, py, mRadius * 0.7).fill({ color: VK.COLOR_MULTIPLIER, alpha: mGlow });
      // Orbiting multiplier sparkles at high mult
      if (multLevel >= 4) {
        const sparkCount = Math.floor(multLevel - 2);
        for (let s = 0; s < sparkCount; s++) {
          const sa = t * (3 + s * 0.5) + s * Math.PI * 2 / sparkCount;
          g.circle(px + Math.cos(sa) * mRadius * 0.6, py + Math.sin(sa) * mRadius * 0.6, 1.5)
            .fill({ color: VK.COLOR_MULTIPLIER, alpha: 0.4 + Math.sin(t * 6 + s) * 0.2 });
        }
      }
    }

    // Outer glow (layered for smoother falloff)
    g.circle(px, py, pr * 3.2).fill({ color, alpha: 0.025 });
    g.circle(px, py, pr * 2.5).fill({ color, alpha: 0.05 });
    g.circle(px, py, pr * 1.8).fill({ color, alpha: 0.09 });
    g.circle(px, py, pr * 1.3).fill({ color, alpha: 0.12 });

    // Flowing cape (trails behind movement direction)
    const capeLen = pr * 2.8;
    const capeWobble1 = Math.sin(t * 5 + 0.5) * pr * 0.3;
    const capeWobble2 = Math.sin(t * 4.2 + 1.8) * pr * 0.45;
    const capeWobble3 = Math.sin(t * 3.5 + 3.0) * pr * 0.55;
    const capeBaseL = { x: px - perpX * pr * 0.45, y: py - perpY * pr * 0.45 };
    const capeBaseR = { x: px + perpX * pr * 0.45, y: py + perpY * pr * 0.45 };
    const capeMid = { x: px - ndx * capeLen * 0.55 + perpX * capeWobble1, y: py - ndy * capeLen * 0.55 + perpY * capeWobble1 };
    const capeTip = { x: px - ndx * capeLen + perpX * capeWobble2, y: py - ndy * capeLen + perpY * capeWobble2 };
    // Cape shadow layer
    g.moveTo(capeBaseL.x, capeBaseL.y)
      .lineTo(capeMid.x - perpX * pr * 0.6, capeMid.y - perpY * pr * 0.6)
      .lineTo(capeTip.x + perpX * capeWobble3 * 0.3, capeTip.y + perpY * capeWobble3 * 0.3)
      .lineTo(capeMid.x + perpX * pr * 0.6, capeMid.y + perpY * pr * 0.6)
      .lineTo(capeBaseR.x, capeBaseR.y)
      .closePath().fill({ color: 0x882200, alpha: 0.25 });
    // Cape main body (rich crimson)
    g.moveTo(capeBaseL.x, capeBaseL.y)
      .lineTo(capeMid.x - perpX * pr * 0.5, capeMid.y - perpY * pr * 0.5)
      .lineTo(capeTip.x, capeTip.y)
      .lineTo(capeMid.x + perpX * pr * 0.5, capeMid.y + perpY * pr * 0.5)
      .lineTo(capeBaseR.x, capeBaseR.y)
      .closePath().fill({ color: 0xcc3322, alpha: 0.35 });
    // Cape highlight edge
    g.moveTo(capeBaseL.x, capeBaseL.y)
      .lineTo(capeMid.x - perpX * pr * 0.3, capeMid.y - perpY * pr * 0.3)
      .lineTo(capeTip.x - perpX * pr * 0.1, capeTip.y - perpY * pr * 0.1)
      .closePath().fill({ color: 0xff6644, alpha: 0.12 });

    // Knight diamond body (rotates with movement direction)
    const breatheScale = vLen <= 10 ? 1.0 + Math.sin(t * 2) * 0.06 : 1.0;
    const kSize = pr * 1.35 * breatheScale;
    g.moveTo(px + ndx * kSize, py + ndy * kSize) // front point
      .lineTo(px + perpX * kSize * 0.6, py + perpY * kSize * 0.6) // right
      .lineTo(px - ndx * kSize * 0.7, py - ndy * kSize * 0.7) // back
      .lineTo(px - perpX * kSize * 0.6, py - perpY * kSize * 0.6) // left
      .closePath().fill(color);

    // Armor plate detail — front chest plate
    g.moveTo(px + ndx * kSize * 0.65, py + ndy * kSize * 0.65)
      .lineTo(px + perpX * kSize * 0.32, py + perpY * kSize * 0.32)
      .lineTo(px - ndx * kSize * 0.15, py - ndy * kSize * 0.15)
      .lineTo(px - perpX * kSize * 0.32, py - perpY * kSize * 0.32)
      .closePath().fill({ color: 0xffffff, alpha: 0.14 });
    // Left shoulder plate
    g.moveTo(px - perpX * kSize * 0.6, py - perpY * kSize * 0.6)
      .lineTo(px - perpX * kSize * 0.75 + ndx * kSize * 0.15, py - perpY * kSize * 0.75 + ndy * kSize * 0.15)
      .lineTo(px - perpX * kSize * 0.45 + ndx * kSize * 0.35, py - perpY * kSize * 0.45 + ndy * kSize * 0.35)
      .closePath().fill({ color: 0xffffff, alpha: 0.1 });
    // Right shoulder plate
    g.moveTo(px + perpX * kSize * 0.6, py + perpY * kSize * 0.6)
      .lineTo(px + perpX * kSize * 0.75 + ndx * kSize * 0.15, py + perpY * kSize * 0.75 + ndy * kSize * 0.15)
      .lineTo(px + perpX * kSize * 0.45 + ndx * kSize * 0.35, py + perpY * kSize * 0.45 + ndy * kSize * 0.35)
      .closePath().fill({ color: 0xffffff, alpha: 0.1 });

    // Secondary armor edge highlight (visor line)
    g.moveTo(px + ndx * kSize * 0.9, py + ndy * kSize * 0.9)
      .lineTo(px + perpX * kSize * 0.15, py + perpY * kSize * 0.15)
      .lineTo(px + ndx * kSize * 0.4, py + ndy * kSize * 0.4)
      .closePath().fill({ color: 0xffffff, alpha: 0.08 });
    // Armor seam lines
    g.setStrokeStyle({ width: 0.6, color: 0xffffff, alpha: 0.06 });
    g.moveTo(px + ndx * kSize * 0.3, py + ndy * kSize * 0.3)
      .lineTo(px - ndx * kSize * 0.4, py - ndy * kSize * 0.4).stroke();

    // Central core glow (layered)
    g.circle(px, py, pr * 0.7 * breatheScale).fill({ color: 0xffffff, alpha: 0.1 });
    g.circle(px, py, pr * 0.45 * breatheScale).fill({ color: 0xffffff, alpha: 0.22 });
    g.circle(px, py, pr * 0.2 * breatheScale).fill({ color: 0xffffff, alpha: 0.4 });

    // Weapon — blade tip (front extension) with glow
    g.moveTo(px + ndx * kSize * 1.6, py + ndy * kSize * 1.6)
      .lineTo(px + ndx * kSize * 0.85 + perpX * 2.8, py + ndy * kSize * 0.85 + perpY * 2.8)
      .lineTo(px + ndx * kSize * 0.85 - perpX * 2.8, py + ndy * kSize * 0.85 - perpY * 2.8)
      .closePath().fill({ color, alpha: 0.75 });
    // Blade edge highlight
    g.moveTo(px + ndx * kSize * 1.6, py + ndy * kSize * 1.6)
      .lineTo(px + ndx * kSize * 0.85 + perpX * 1.2, py + ndy * kSize * 0.85 + perpY * 1.2)
      .lineTo(px + ndx * kSize * 0.95, py + ndy * kSize * 0.95)
      .closePath().fill({ color: 0xffffff, alpha: 0.2 });
    // Blade tip bright point
    g.circle(px + ndx * kSize * 1.45, py + ndy * kSize * 1.45, 1.8)
      .fill({ color: 0xffffff, alpha: 0.4 });

    // Shield shape (left side, offset from body)
    const shieldCx = px - perpX * kSize * 0.7 + ndx * kSize * 0.1;
    const shieldCy = py - perpY * kSize * 0.7 + ndy * kSize * 0.1;
    g.moveTo(shieldCx + ndx * pr * 0.5, shieldCy + ndy * pr * 0.5)
      .lineTo(shieldCx - perpX * pr * 0.35, shieldCy - perpY * pr * 0.35)
      .lineTo(shieldCx - ndx * pr * 0.6, shieldCy - ndy * pr * 0.6)
      .lineTo(shieldCx + perpX * pr * 0.35, shieldCy + perpY * pr * 0.35)
      .closePath().fill({ color, alpha: 0.45 });
    g.moveTo(shieldCx + ndx * pr * 0.3, shieldCy + ndy * pr * 0.3)
      .lineTo(shieldCx - perpX * pr * 0.15, shieldCy - perpY * pr * 0.15)
      .lineTo(shieldCx - ndx * pr * 0.3, shieldCy - ndy * pr * 0.3)
      .closePath().fill({ color: 0xffffff, alpha: 0.08 });

    // Movement wobble particles (more dynamic)
    if (vLen > 80) {
      const wobble = Math.sin(t * 12) * 1.8;
      g.circle(px - ndx * kSize * 0.8 + wobble, py - ndy * kSize * 0.8, pr * 0.35)
        .fill({ color, alpha: 0.25 });
      g.circle(px - ndx * kSize * 1.1 + wobble * 0.7, py - ndy * kSize * 1.1, pr * 0.2)
        .fill({ color, alpha: 0.12 });
    }

    // Idle breathing animation (when not moving)
    if (vLen <= 10) {
      const breathe = Math.sin(t * 2) * 0.08;
      const idleGlow = 0.07 + Math.sin(t * 1.5) * 0.035;
      // Gentle pulsing aura (layered)
      g.circle(px, py, pr * (2.5 + breathe * 4)).fill({ color, alpha: idleGlow * 0.5 });
      g.circle(px, py, pr * (2.0 + breathe * 3)).fill({ color, alpha: idleGlow });
      // Shimmer sparkles rotating slowly around idle player
      for (let s = 0; s < 5; s++) {
        const sa = t * 0.8 + s * Math.PI * 2 / 5;
        const sr = pr * 2.4;
        g.circle(px + Math.cos(sa) * sr, py + Math.sin(sa) * sr, 1.4)
          .fill({ color: 0xffffff, alpha: 0.18 + Math.sin(t * 3 + s) * 0.12 });
        // Trailing sparkle
        const ta = sa - 0.4;
        g.circle(px + Math.cos(ta) * sr, py + Math.sin(ta) * sr, 0.8)
          .fill({ color: 0xffffff, alpha: 0.08 });
      }
    }

    // Dash cooldown arc around player
    if (state.dashCooldown > 0) {
      const fill = 1.0 - state.dashCooldown / VK.DASH_COOLDOWN;
      const arcEnd = fill * Math.PI * 2;
      const arcR = pr * 2.8;
      g.setStrokeStyle({ width: 2, color: VK.COLOR_PLAYER, alpha: 0.25 });
      g.moveTo(px + Math.cos(-Math.PI / 2) * arcR, py + Math.sin(-Math.PI / 2) * arcR);
      const steps = Math.max(4, Math.floor(arcEnd * 6));
      for (let s = 1; s <= steps; s++) {
        const a = -Math.PI / 2 + arcEnd * (s / steps);
        g.lineTo(px + Math.cos(a) * arcR, py + Math.sin(a) * arcR);
      }
      g.stroke();
    } else {
      // Dash ready pulse ring
      const readyPulse = 0.15 + Math.sin(t * 5) * 0.1;
      g.setStrokeStyle({ width: 1.5, color: VK.COLOR_PLAYER, alpha: readyPulse });
      g.circle(px, py, pr * 2.8).stroke();
    }
  }

  private _drawProjectiles(g: Graphics, state: VKState): void {
    const phantom = state.waveMutators.includes("phantom");
    for (const p of state.projectiles) {
      const vLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const ndx = vLen > 0 ? -p.vx / vLen : 0;
      const ndy = vLen > 0 ? -p.vy / vLen : -1;
      const pAlpha = phantom ? 0.2 + Math.sin(state.time * 8 + p.x * 0.1) * 0.15 : 0.9;
      const r = p.radius;

      // Trail (longer, gradient-fading, multi-layered)
      if (vLen > 0) {
        // Outermost wide trail (color gradient fade)
        g.setStrokeStyle({ width: r * 2.2, color: p.color, alpha: phantom ? 0.01 : 0.025, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * r * 7, p.y + ndy * r * 7).stroke();
        g.setStrokeStyle({ width: r * 1.5, color: p.color, alpha: phantom ? 0.02 : 0.06, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * r * 5.5, p.y + ndy * r * 5.5).stroke();
        g.setStrokeStyle({ width: r * 0.7, color: p.color, alpha: phantom ? 0.05 : 0.18, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * r * 4, p.y + ndy * r * 4).stroke();
        // Hot core trail (white-ish)
        g.setStrokeStyle({ width: r * 0.3, color: 0xffffff, alpha: phantom ? 0.02 : 0.08, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * r * 2.5, p.y + ndy * r * 2.5).stroke();
      }

      // Outer glow halo (richer bloom, more layers)
      g.circle(p.x, p.y, r * 3.5).fill({ color: p.color, alpha: phantom ? 0.008 : 0.02 });
      g.circle(p.x, p.y, r * 2.8).fill({ color: p.color, alpha: phantom ? 0.01 : 0.035 });
      g.circle(p.x, p.y, r * 2).fill({ color: p.color, alpha: phantom ? 0.02 : 0.07 });

      // Rotating inner pattern (star/spiral depending on type)
      const innerRot = state.time * 6 + p.x * 0.05 + p.y * 0.05;
      if (!phantom) {
        if (p.pattern === ProjectilePattern.SPIRAL || p.pattern === ProjectilePattern.HELIX) {
          // Spiral arms inside projectile
          for (let arm = 0; arm < 3; arm++) {
            const armA = innerRot + arm * Math.PI * 2 / 3;
            g.setStrokeStyle({ width: 0.6, color: 0xffffff, alpha: 0.08 });
            g.moveTo(p.x, p.y)
              .lineTo(p.x + Math.cos(armA) * r * 0.65, p.y + Math.sin(armA) * r * 0.65).stroke();
          }
        } else {
          // Rotating star pattern
          const starPoints = 4;
          for (let sp = 0; sp < starPoints; sp++) {
            const spA = innerRot + sp * Math.PI * 2 / starPoints;
            const spR = r * 0.5;
            g.setStrokeStyle({ width: 0.5, color: 0xffffff, alpha: 0.06 });
            g.moveTo(p.x + Math.cos(spA) * spR * 0.2, p.y + Math.sin(spA) * spR * 0.2)
              .lineTo(p.x + Math.cos(spA) * spR, p.y + Math.sin(spA) * spR).stroke();
          }
        }
      }

      // Shape varies by pattern type
      switch (p.pattern) {
        case ProjectilePattern.AIMED:
          // Arrow shape (elongated diamond)
          g.moveTo(p.x - ndx * r * 1.4, p.y - ndy * r * 1.4)
            .lineTo(p.x + (-ndy) * r * 0.5, p.y + ndx * r * 0.5)
            .lineTo(p.x + ndx * r * 0.5, p.y + ndy * r * 0.5)
            .lineTo(p.x - (-ndy) * r * 0.5, p.y - ndx * r * 0.5)
            .closePath().fill({ color: p.color, alpha: pAlpha });
          break;
        case ProjectilePattern.RING:
          // Hollow ring
          g.setStrokeStyle({ width: 1.5, color: p.color, alpha: pAlpha });
          g.circle(p.x, p.y, r).stroke();
          g.circle(p.x, p.y, r * 0.3).fill({ color: p.color, alpha: pAlpha });
          break;
        case ProjectilePattern.SPIRAL:
          // Star shape
          g.star(p.x, p.y, 3, r * 0.4, r, state.time * 4 + p.x * 0.05).fill({ color: p.color, alpha: pAlpha });
          break;
        case ProjectilePattern.CROSS:
          // Square diamond (rotated)
          g.moveTo(p.x, p.y - r).lineTo(p.x + r, p.y).lineTo(p.x, p.y + r).lineTo(p.x - r, p.y)
            .closePath().fill({ color: p.color, alpha: pAlpha });
          break;
        case ProjectilePattern.HELIX: {
          // Double-helix swirl: two interleaving arcs with trail
          const helixAngle = state.time * 8 + p.x * 0.1 + p.y * 0.1;
          // Swirl trail (two opposing sine-wave paths behind the projectile)
          if (vLen > 0) {
            for (let ht = 0; ht < 5; ht++) {
              const tOff = ht * 0.2;
              const swirl1 = Math.sin(helixAngle - tOff * 6) * r * 1.2;
              const swirl2 = Math.sin(helixAngle - tOff * 6 + Math.PI) * r * 1.2;
              const tx = p.x + ndx * r * (ht + 1) * 1.5;
              const ty = p.y + ndy * r * (ht + 1) * 1.5;
              const perpX = -ndy, perpY = ndx;
              const ta = pAlpha * (0.3 - ht * 0.05);
              if (ta > 0) {
                g.circle(tx + perpX * swirl1, ty + perpY * swirl1, r * 0.4).fill({ color: VK.COLOR_PROJ_HELIX, alpha: ta });
                g.circle(tx + perpX * swirl2, ty + perpY * swirl2, r * 0.4).fill({ color: VK.COLOR_PROJ_HELIX, alpha: ta * 0.7 });
              }
            }
          }
          // Core: two overlapping circles that orbit each other
          const hOff = Math.sin(helixAngle) * r * 0.5;
          const hPerpX = vLen > 0 ? -ndy : 1, hPerpY = vLen > 0 ? ndx : 0;
          g.circle(p.x + hPerpX * hOff, p.y + hPerpY * hOff, r * 0.7).fill({ color: p.color, alpha: pAlpha });
          g.circle(p.x - hPerpX * hOff, p.y - hPerpY * hOff, r * 0.7).fill({ color: p.color, alpha: pAlpha * 0.8 });
          // Central bright link
          g.circle(p.x, p.y, r * 0.35).fill({ color: 0xffffff, alpha: pAlpha * 0.3 });
          break;
        }
        case ProjectilePattern.SHOTGUN: {
          // Spread pellet cluster with diverging trail lines
          if (vLen > 0) {
            const sPerpX = -ndy, sPerpY = ndx;
            // Spread trail — 3 diverging lines behind
            for (let st = -1; st <= 1; st++) {
              const spreadOff = st * r * 1.8;
              const trailEndX = p.x + ndx * r * 4 + sPerpX * spreadOff * 1.5;
              const trailEndY = p.y + ndy * r * 4 + sPerpY * spreadOff * 1.5;
              g.setStrokeStyle({ width: r * 0.4, color: VK.COLOR_PROJ_SHOTGUN, alpha: phantom ? 0.03 : 0.1, cap: "round" });
              g.moveTo(p.x + sPerpX * spreadOff * 0.3, p.y + sPerpY * spreadOff * 0.3)
                .lineTo(trailEndX, trailEndY).stroke();
            }
          }
          // Core: cluster of 3 small pellets in a triangle
          const shotAngle = vLen > 0 ? Math.atan2(ndy, ndx) : 0;
          for (let sp = 0; sp < 3; sp++) {
            const sa = shotAngle + (sp - 1) * 0.5;
            const sx = p.x + Math.cos(sa) * r * 0.5;
            const sy = p.y + Math.sin(sa) * r * 0.5;
            g.circle(sx, sy, r * 0.55).fill({ color: p.color, alpha: pAlpha });
          }
          // Central glow
          g.circle(p.x, p.y, r * 0.3).fill({ color: 0xffffff, alpha: pAlpha * 0.25 });
          break;
        }
        default:
          // Standard circle
          g.circle(p.x, p.y, r).fill({ color: p.color, alpha: pAlpha });
          break;
      }

      // Bright center (skip for phantom and hollow rings)
      if (!phantom && p.pattern !== ProjectilePattern.RING) {
        g.circle(p.x, p.y, r * 0.45).fill({ color: 0xffffff, alpha: 0.2 });
        g.circle(p.x, p.y, r * 0.25).fill({ color: 0xffffff, alpha: 0.45 });
      }
    }
  }

  private _drawSpawners(g: Graphics, state: VKState): void {
    const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
    const t = state.time;
    for (const s of state.spawners) {
      if (!s.alive) continue;
      const sx = cx + Math.cos(s.angle) * r;
      const sy = cy + Math.sin(s.angle) * r;
      const sr = VK.SPAWNER_RADIUS * (s.isBoss ? VK.BOSS_SIZE_MULT : s.isElite ? VK.ELITE_SIZE_MULT : 1);
      const sColor = s.isBoss ? VK.COLOR_BOSS_SPAWNER : s.isElite ? VK.COLOR_ELITE_SPAWNER : VK.COLOR_SPAWNER;
      const bodyColor = s.flashTimer > 0 ? 0xffffff : sColor;

      // Dark energy vortex swirling into spawner
      const vortexArms = s.isBoss ? 5 : 3;
      for (let va = 0; va < vortexArms; va++) {
        const vBaseAngle = t * 3 + va * Math.PI * 2 / vortexArms;
        g.setStrokeStyle({ width: 1.2, color: sColor, alpha: 0.06 + Math.sin(t * 2 + va) * 0.03 });
        g.moveTo(sx + Math.cos(vBaseAngle) * sr * 3.5, sy + Math.sin(vBaseAngle) * sr * 3.5);
        for (let vs = 1; vs <= 8; vs++) {
          const a = vBaseAngle + vs * 0.4;
          const vr = sr * (3.5 - vs * 0.35);
          g.lineTo(sx + Math.cos(a) * vr, sy + Math.sin(a) * vr);
        }
        g.stroke();
      }

      // Tentacle/tendril animations extending from spawner
      const tendrilCount = s.isBoss ? 6 : 3;
      for (let td = 0; td < tendrilCount; td++) {
        const tdAngle = t * 0.5 + td * Math.PI * 2 / tendrilCount + s.angle;
        const tdLen = sr * (1.8 + Math.sin(t * 2.5 + td * 1.7) * 0.5);
        const tdWave1 = Math.sin(t * 3 + td * 2) * sr * 0.4;
        const tdWave2 = Math.sin(t * 2.3 + td * 3.1) * sr * 0.3;
        const perpTdX = -Math.sin(tdAngle), perpTdY = Math.cos(tdAngle);
        const tdx1 = sx + Math.cos(tdAngle) * sr * 0.8;
        const tdy1 = sy + Math.sin(tdAngle) * sr * 0.8;
        const tdx2 = sx + Math.cos(tdAngle) * tdLen * 0.5 + perpTdX * tdWave1;
        const tdy2 = sy + Math.sin(tdAngle) * tdLen * 0.5 + perpTdY * tdWave1;
        const tdx3 = sx + Math.cos(tdAngle) * tdLen + perpTdX * tdWave2;
        const tdy3 = sy + Math.sin(tdAngle) * tdLen + perpTdY * tdWave2;
        g.setStrokeStyle({ width: s.isBoss ? 2 : 1.2, color: sColor, alpha: 0.15 });
        g.moveTo(tdx1, tdy1).lineTo(tdx2, tdy2).lineTo(tdx3, tdy3).stroke();
        // Tendril tip glow
        g.circle(tdx3, tdy3, 2).fill({ color: sColor, alpha: 0.2 });
      }

      // Danger glow (multi-layered, richer bloom)
      const pulse = 0.09 + Math.sin(t * 4 + s.angle) * 0.055;
      g.circle(sx, sy, sr * (s.isBoss ? 3.8 : 2.8)).fill({ color: sColor, alpha: pulse * 0.15 });
      g.circle(sx, sy, sr * (s.isBoss ? 3.0 : 2.2)).fill({ color: sColor, alpha: pulse * 0.4 });
      g.circle(sx, sy, sr * (s.isBoss ? 2.3 : 1.7)).fill({ color: sColor, alpha: pulse });

      // Crystalline body (hexagonal shape instead of circle)
      const sides = s.isBoss ? 6 : 5;
      const rot = t * (s.isBoss ? 0.3 : 0.5) + s.angle;
      g.moveTo(sx + Math.cos(rot) * sr, sy + Math.sin(rot) * sr);
      for (let v = 1; v <= sides; v++) {
        const va = rot + (v / sides) * Math.PI * 2;
        g.lineTo(sx + Math.cos(va) * sr, sy + Math.sin(va) * sr);
      }
      g.closePath().fill(bodyColor);

      // Inner facet highlight
      g.moveTo(sx + Math.cos(rot) * sr * 0.7, sy + Math.sin(rot) * sr * 0.7);
      for (let v = 1; v <= sides; v++) {
        const va = rot + (v / sides) * Math.PI * 2;
        g.lineTo(sx + Math.cos(va) * sr * 0.7, sy + Math.sin(va) * sr * 0.7);
      }
      g.closePath().fill({ color: 0xffffff, alpha: 0.06 });

      // Outer orbit ring
      g.setStrokeStyle({ width: s.isBoss ? 2 : 1.5, color: sColor, alpha: 0.25 });
      g.circle(sx, sy, sr * 1.5).stroke();
      if (s.isBoss) {
        g.setStrokeStyle({ width: 1, color: sColor, alpha: 0.15 });
        g.circle(sx, sy, sr * 2.0).stroke();
        // Boss phase indicator (rings show current phase)
        for (let p = 0; p <= s.phase; p++) {
          const pa = rot + Math.PI + p * 0.5;
          g.circle(sx + Math.cos(pa) * (sr + 8), sy + Math.sin(pa) * (sr + 8), 2.5)
            .fill({ color: VK.COLOR_DANGER, alpha: 0.6 });
        }
      }

      // Elite spawner: star marker above + "ELITE" label
      if (s.isElite && !s.isBoss) {
        // Star marker above spawner
        const starY = sy - sr - 20;
        g.star(sx, starY, 4, 3, 7, t * 2).fill({ color: VK.COLOR_ELITE_SPAWNER, alpha: 0.7 + Math.sin(t * 5) * 0.2 });
        g.circle(sx, starY, 10).fill({ color: VK.COLOR_ELITE_SPAWNER, alpha: 0.06 });
        // Extra orbit ring for elite
        g.setStrokeStyle({ width: 1.5, color: VK.COLOR_ELITE_SPAWNER, alpha: 0.2 });
        g.circle(sx, sy, sr * 1.8).stroke();
      }

      // Central eye with layered glow — pupil tracks player position
      const eyeColor = s.isBoss ? 0xff2288 : s.isElite ? 0xff6644 : 0xff2266;
      g.circle(sx, sy, sr * 0.55).fill({ color: eyeColor, alpha: 0.08 });
      g.circle(sx, sy, sr * 0.42).fill({ color: eyeColor, alpha: 0.18 });
      // Eye white/iris
      g.circle(sx, sy, sr * 0.3).fill({ color: eyeColor, alpha: 0.55 + Math.sin(t * 6) * 0.3 });
      // Pupil tracks player — offset toward player position
      const eyeDx = state.playerX - sx, eyeDy = state.playerY - sy;
      const eyeDist = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy);
      const eyeTrackR = sr * 0.12; // max offset
      const pupilOx = eyeDist > 0 ? (eyeDx / eyeDist) * eyeTrackR : 0;
      const pupilOy = eyeDist > 0 ? (eyeDy / eyeDist) * eyeTrackR : 0;
      g.circle(sx + pupilOx, sy + pupilOy, sr * 0.18).fill({ color: 0x000000, alpha: 0.6 });
      g.circle(sx + pupilOx, sy + pupilOy, sr * 0.12).fill({ color: 0xffffff, alpha: 0.35 });
      g.circle(sx + pupilOx * 0.5, sy + pupilOy * 0.5 - sr * 0.05, sr * 0.06).fill({ color: 0xffffff, alpha: 0.6 });
      // Eye lid lines (horizontal slit)
      g.setStrokeStyle({ width: 0.8, color: eyeColor, alpha: 0.3 });
      g.moveTo(sx - sr * 0.3, sy).lineTo(sx + sr * 0.3, sy).stroke();

      // Spawner type indicator (small icon based on pattern)
      const iconAlpha = 0.2;
      if (s.pattern === ProjectilePattern.AIMED) {
        // Crosshair
        g.setStrokeStyle({ width: 0.8, color: 0xffffff, alpha: iconAlpha });
        g.moveTo(sx - sr * 0.5, sy).lineTo(sx + sr * 0.5, sy).stroke();
        g.moveTo(sx, sy - sr * 0.5).lineTo(sx, sy + sr * 0.5).stroke();
      } else if (s.pattern === ProjectilePattern.SPIRAL) {
        // Swirl
        g.setStrokeStyle({ width: 0.8, color: 0xffffff, alpha: iconAlpha });
        g.circle(sx, sy, sr * 0.45).stroke();
      }

      // HP bar with border, glow, and individual segment indicators
      const barW = sr * 3.0;
      const barH = 5;
      const bx = sx - barW / 2;
      const by = sy - sr - 12;
      const hpFill = s.hp / s.maxHp;
      const hpColor = s.isBoss ? VK.COLOR_BOSS_SPAWNER : s.isElite ? VK.COLOR_ELITE_SPAWNER : 0xff4466;
      g.roundRect(bx - 1, by - 1, barW + 2, barH + 2, 3).fill({ color: 0x000000, alpha: 0.55 });
      g.roundRect(bx, by, barW, barH, 2).fill({ color: 0x1a1a2e, alpha: 0.65 });
      g.roundRect(bx, by, barW * hpFill, barH, 2).fill({ color: hpColor, alpha: 0.88 });
      g.roundRect(bx, by, barW * hpFill, barH * 0.4, 2).fill({ color: 0xffffff, alpha: 0.1 });
      // Individual HP segment dividers
      const segCount = s.maxHp;
      if (segCount > 1 && segCount <= 20) {
        for (let seg = 1; seg < segCount; seg++) {
          const segX = bx + (seg / segCount) * barW;
          g.setStrokeStyle({ width: 0.8, color: 0x000000, alpha: 0.5 });
          g.moveTo(segX, by).lineTo(segX, by + barH).stroke();
        }
      }
      // Low HP warning glow
      if (hpFill < 0.3 && hpFill > 0) {
        g.roundRect(bx - 2, by - 2, barW * hpFill + 4, barH + 4, 4).fill({ color: hpColor, alpha: 0.1 + Math.sin(t * 8) * 0.06 });
      }
      // Death explosion void energy burst (flash timer indicates recent damage)
      if (s.flashTimer > 0) {
        const flashRatio = s.flashTimer / 0.15; // assuming short flash duration
        const burstR = sr * (2 + (1 - flashRatio) * 3);
        g.circle(sx, sy, burstR).fill({ color: sColor, alpha: 0.08 * flashRatio });
        g.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.2 * flashRatio });
        g.circle(sx, sy, burstR * 0.8).stroke();
        // Void energy sparks radiating out
        for (let sp = 0; sp < 6; sp++) {
          const spA = t * 10 + sp * Math.PI / 3;
          const spR = burstR * 0.7;
          g.circle(sx + Math.cos(spA) * spR, sy + Math.sin(spA) * spR, 2)
            .fill({ color: 0xffffff, alpha: 0.3 * flashRatio });
        }
      }
    }
  }

  private _drawOrbs(g: Graphics, state: VKState): void {
    const t = state.time;
    for (const o of state.orbs) {
      const color = o.kind === "score" ? VK.COLOR_ORB_SCORE : o.kind === "shield" ? VK.COLOR_ORB_SHIELD :
                    o.kind === "slow" ? VK.COLOR_ORB_SLOW : o.kind === "magnet" ? VK.COLOR_ORB_MAGNET :
                    o.kind === "reflect" ? VK.COLOR_ORB_REFLECT : o.kind === "blink" ? VK.COLOR_ORB_BLINK :
                    o.kind === "haste" ? VK.COLOR_ORB_HASTE : VK.COLOR_ORB_BOMB;
      const bob = Math.sin(t * 3 + o.pulse) * 5; // bigger bob
      // Smoother despawn flicker (fade alpha instead of skip frames)
      let despawnAlpha = 1.0;
      if (o.age > VK.ORB_LIFETIME - 3) {
        despawnAlpha = 0.3 + Math.sin(t * 6 + o.pulse) * 0.3; // smooth pulse instead of jerky skip
      }

      // Pulse animation — radius oscillation
      const orbPulse = 1.0 + Math.sin(t * 5 + o.pulse) * 0.12;
      const oR = VK.ORB_RADIUS * orbPulse;
      const oy = o.y + bob;

      // Magnetic pull visual — particles streaming toward player when close
      const orbDx = state.playerX - o.x, orbDy = state.playerY - oy;
      const orbPlayerDist = Math.sqrt(orbDx * orbDx + orbDy * orbDy);
      if (orbPlayerDist < 80 && orbPlayerDist > 5) {
        const pullNx = orbDx / orbPlayerDist, pullNy = orbDy / orbPlayerDist;
        const pullStrength = (80 - orbPlayerDist) / 80;
        for (let mp = 0; mp < 4; mp++) {
          const mpT = ((t * 3 + mp * 0.25 + o.pulse) % 1.0);
          const mpX = o.x + pullNx * orbPlayerDist * mpT + (Math.sin(t * 8 + mp * 2) * 3 * (1 - mpT));
          const mpY = oy + pullNy * orbPlayerDist * mpT + (Math.cos(t * 7 + mp * 3) * 3 * (1 - mpT));
          g.circle(mpX, mpY, 1.5 * (1 - mpT)).fill({ color, alpha: pullStrength * 0.4 * (1 - mpT) * despawnAlpha });
        }
      }

      // Outer glow (layered bloom)
      g.circle(o.x, oy, oR * 3.2).fill({ color, alpha: 0.03 * despawnAlpha });
      g.circle(o.x, oy, oR * 2.5).fill({ color, alpha: 0.06 * despawnAlpha });
      g.circle(o.x, oy, oR * 1.8).fill({ color, alpha: (0.12 + Math.sin(t * 4 + o.pulse) * 0.06) * despawnAlpha });

      // Sparkle ring — small bright dots orbiting at orb edge
      for (let sr = 0; sr < 6; sr++) {
        const srA = t * 4 + o.pulse * 2 + sr * Math.PI / 3;
        const srR = oR * 1.3;
        const srAlpha = 0.25 + Math.sin(t * 6 + sr * 1.5) * 0.15;
        g.circle(o.x + Math.cos(srA) * srR, oy + Math.sin(srA) * srR, 0.8)
          .fill({ color: 0xffffff, alpha: srAlpha * despawnAlpha });
      }

      // Core (brighter, with inner gradient)
      g.circle(o.x, oy, oR).fill({ color, alpha: 0.85 * despawnAlpha });
      g.circle(o.x, oy, oR * 0.65).fill({ color: 0xffffff, alpha: 0.08 * despawnAlpha });
      // Top highlight (specular)
      g.circle(o.x - 2, oy - 3, oR * 0.38).fill({ color: 0xffffff, alpha: 0.4 * despawnAlpha });
      g.circle(o.x - 1, oy - 2, oR * 0.2).fill({ color: 0xffffff, alpha: 0.25 * despawnAlpha });
      // Border ring with glow
      g.setStrokeStyle({ width: 2.5, color, alpha: 0.08 * despawnAlpha });
      g.circle(o.x, oy, oR * 1.1).stroke();
      g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.18 * despawnAlpha });
      g.circle(o.x, oy, oR * 1.05).stroke();

      // Rotating icon inside orb
      const ir = oR * 0.55;
      const iconRot = t * 2 + o.pulse;
      const iy = oy;
      switch (o.kind) {
        case "score":
          // Star/coin (rotating)
          g.star(o.x, iy, 5, ir * 0.4, ir, iconRot).fill({ color: 0xffffff, alpha: 0.25 });
          break;
        case "shield":
          // Shield chevron
          g.moveTo(o.x, iy - ir).lineTo(o.x + ir * 0.7, iy - ir * 0.3).lineTo(o.x + ir * 0.5, iy + ir * 0.5)
            .lineTo(o.x, iy + ir).lineTo(o.x - ir * 0.5, iy + ir * 0.5).lineTo(o.x - ir * 0.7, iy - ir * 0.3)
            .closePath().fill({ color: 0xffffff, alpha: 0.2 });
          break;
        case "slow":
          // Hourglass
          g.moveTo(o.x - ir * 0.5, iy - ir).lineTo(o.x + ir * 0.5, iy - ir).lineTo(o.x, iy)
            .lineTo(o.x + ir * 0.5, iy + ir).lineTo(o.x - ir * 0.5, iy + ir).lineTo(o.x, iy)
            .closePath().fill({ color: 0xffffff, alpha: 0.2 });
          break;
        case "magnet":
          // U-shape
          g.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: 0.25 });
          g.moveTo(o.x - ir * 0.5, iy - ir * 0.6).lineTo(o.x - ir * 0.5, iy + ir * 0.3)
            .lineTo(o.x, iy + ir * 0.8).lineTo(o.x + ir * 0.5, iy + ir * 0.3)
            .lineTo(o.x + ir * 0.5, iy - ir * 0.6).stroke();
          break;
        case "reflect":
          // Mirror ring
          g.setStrokeStyle({ width: 1.2, color: 0xffffff, alpha: 0.3 });
          g.circle(o.x, iy, ir * 0.7).stroke();
          g.moveTo(o.x - ir * 0.3, iy).lineTo(o.x + ir * 0.3, iy).stroke();
          break;
        case "bomb":
          // Starburst
          g.star(o.x, iy, 4, ir * 0.3, ir, t * 3).fill({ color: 0xffffff, alpha: 0.3 });
          break;
        case "blink": {
          // Teleportation swirl — concentric spiral arcs
          const blinkRot = t * 4;
          for (let arc = 0; arc < 3; arc++) {
            const arcAngle = blinkRot + arc * Math.PI * 2 / 3;
            const arcR = ir * (0.4 + arc * 0.25);
            g.setStrokeStyle({ width: 1.2, color: 0xffffff, alpha: 0.25 - arc * 0.05 });
            g.moveTo(o.x + Math.cos(arcAngle) * arcR * 0.3, iy + Math.sin(arcAngle) * arcR * 0.3);
            for (let s = 1; s <= 4; s++) {
              const a = arcAngle + s * 0.5;
              const r2 = arcR * (0.3 + s * 0.18);
              g.lineTo(o.x + Math.cos(a) * r2, iy + Math.sin(a) * r2);
            }
            g.stroke();
          }
          // Center spark
          g.circle(o.x, iy, ir * 0.25).fill({ color: 0xffffff, alpha: 0.35 });
          break;
        }
        case "haste": {
          // Speed lines — horizontal dashes showing motion
          for (let sl = -1; sl <= 1; sl++) {
            const slY = iy + sl * ir * 0.6;
            const slOff = Math.sin(t * 6 + sl * 1.5) * ir * 0.3;
            g.setStrokeStyle({ width: 1.2, color: 0xffffff, alpha: 0.3 });
            g.moveTo(o.x - ir * 0.7 + slOff, slY).lineTo(o.x + ir * 0.4 + slOff, slY).stroke();
          }
          // Arrow tip pointing right
          g.moveTo(o.x + ir * 0.5, iy).lineTo(o.x, iy - ir * 0.4).lineTo(o.x + ir * 0.15, iy)
            .lineTo(o.x, iy + ir * 0.4).closePath().fill({ color: 0xffffff, alpha: 0.2 });
          break;
        }
      }

      // Orbiting sparkles (2 at opposite sides)
      for (let sp = 0; sp < 2; sp++) {
        const oa = t * 3 + o.pulse + sp * Math.PI;
        const oSR = oR * 1.4;
        g.circle(o.x + Math.cos(oa) * oSR, oy + Math.sin(oa) * oSR, 1.8)
          .fill({ color: 0xffffff, alpha: 0.4 * despawnAlpha });
        // Sparkle trail
        const ta = oa - 0.5;
        g.circle(o.x + Math.cos(ta) * oSR, oy + Math.sin(ta) * oSR, 1)
          .fill({ color: 0xffffff, alpha: 0.15 * despawnAlpha });
      }
    }
  }

  private _drawParticles(g: Graphics, state: VKState): void {
    const acx = state.arenaCenterX, acy = state.arenaCenterY;
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      // Size variation — particles shrink differently based on pseudo-random from position
      const sizeVar = 0.7 + ((Math.abs(p.x * 7.3 + p.y * 13.7) % 100) / 100) * 0.6;
      const sz = p.size * alpha * sizeVar;

      // Color variation within burst (shift hue slightly based on particle position)
      const colorShift = ((Math.abs(p.x * 3.1 + p.y * 7.7) % 100) / 100);
      const variedColor = colorShift > 0.7
        ? lerpColor(p.color, 0xffffff, (colorShift - 0.7) * 0.4)
        : colorShift < 0.3
          ? lerpColor(p.color, 0x000000, (0.3 - colorShift) * 0.3)
          : p.color;

      // Motion trail (longer, more visible)
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 12) {
        const tdx = -p.vx / spd, tdy = -p.vy / spd;
        // Wide glow trail
        g.setStrokeStyle({ width: sz * 1.2, color: variedColor, alpha: alpha * 0.06, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + tdx * sz * 3.5, p.y + tdy * sz * 3.5).stroke();
        // Core trail
        g.setStrokeStyle({ width: sz * 0.5, color: variedColor, alpha: alpha * 0.15, cap: "round" });
        g.moveTo(p.x, p.y).lineTo(p.x + tdx * sz * 2.5, p.y + tdy * sz * 2.5).stroke();
      }

      // Outer glow (multi-layer)
      g.circle(p.x, p.y, sz * 2.2).fill({ color: variedColor, alpha: alpha * 0.05 });
      g.circle(p.x, p.y, sz * 1.6).fill({ color: variedColor, alpha: alpha * 0.1 });

      // Core — rotating shape varies with size
      const particleRot = state.time * 4 + p.x * 0.1 + p.y * 0.13;
      if (p.size > 4) {
        // Rotating diamond for large particles
        const c = Math.cos(particleRot), sn = Math.sin(particleRot);
        const dx1 = 0 * c - (-sz) * sn, dy1 = 0 * sn + (-sz) * c;
        const dx2 = (sz * 0.6) * c - 0 * sn, dy2 = (sz * 0.6) * sn + 0 * c;
        const dx3 = 0 * c - sz * sn, dy3 = 0 * sn + sz * c;
        const dx4 = (-sz * 0.6) * c - 0 * sn, dy4 = (-sz * 0.6) * sn + 0 * c;
        g.moveTo(p.x + dx1, p.y + dy1).lineTo(p.x + dx2, p.y + dy2)
          .lineTo(p.x + dx3, p.y + dy3).lineTo(p.x + dx4, p.y + dy4)
          .closePath().fill({ color: variedColor, alpha });
        // Inner highlight
        g.moveTo(p.x + dx1 * 0.5, p.y + dy1 * 0.5).lineTo(p.x + dx2 * 0.5, p.y + dy2 * 0.5)
          .lineTo(p.x + dx3 * 0.5, p.y + dy3 * 0.5).lineTo(p.x + dx4 * 0.5, p.y + dy4 * 0.5)
          .closePath().fill({ color: 0xffffff, alpha: alpha * 0.12 });
      } else {
        g.circle(p.x, p.y, sz).fill({ color: variedColor, alpha });
      }

      // Hot center (brighter, with white bloom)
      if (alpha > 0.25 && sz > 0.8) {
        g.circle(p.x, p.y, sz * 0.45).fill({ color: 0xffffff, alpha: alpha * 0.2 });
        g.circle(p.x, p.y, sz * 0.2).fill({ color: 0xffffff, alpha: alpha * 0.4 });
      }

      // Gravity pull toward arena center (visual indicator — faint line toward center for dying particles)
      if (alpha < 0.4 && alpha > 0.1 && sz > 1.5) {
        const pullDx = acx - p.x, pullDy = acy - p.y;
        const pullDist = Math.sqrt(pullDx * pullDx + pullDy * pullDy);
        if (pullDist > 20) {
          const pullNx = pullDx / pullDist, pullNy = pullDy / pullDist;
          g.setStrokeStyle({ width: 0.4, color: variedColor, alpha: alpha * 0.08 });
          g.moveTo(p.x, p.y).lineTo(p.x + pullNx * sz * 3, p.y + pullNy * sz * 3).stroke();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Tutorial prompt overlay
  // ---------------------------------------------------------------------------

  private _drawTutorialPrompt(state: VKState): void {
    if (state.tutorialStep <= 0 || state.tutorialStep > 3) return;
    const ug = this._uiGfx;
    const cx = this._sw / 2, cy = this._sh * 0.15;
    const prompt = TUTORIAL_PROMPTS[state.tutorialStep] || "";

    // Dark backdrop
    ug.roundRect(cx - 200, cy - 16, 400, 32, 6).fill({ color: 0x000000, alpha: 0.6 });
    ug.setStrokeStyle({ width: 1, color: 0x6644aa, alpha: 0.3 });
    ug.roundRect(cx - 200, cy - 16, 400, 32, 6).stroke();

    // Use the pause text as the tutorial prompt (reuse)
    this._pauseText.visible = true;
    this._pauseText.text = prompt;
    this._pauseText.style.fill = 0xddccff;
    this._pauseText.style.fontSize = 18;
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(cx, cy);
    this._pauseText.alpha = 0.8 + Math.sin(state.time * 3) * 0.2;

    // Step indicator dots
    for (let i = 1; i <= 3; i++) {
      const dotX = cx - 20 + (i - 1) * 20;
      const dotY = cy + 24;
      const active = i === state.tutorialStep;
      ug.circle(dotX, dotY, active ? 4 : 3).fill({ color: active ? 0xddccff : 0x444466, alpha: active ? 0.8 : 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Wave intro overlay
  // ---------------------------------------------------------------------------

  private _drawWaveIntro(state: VKState): void {
    if (state.waveIntroTimer <= 0 || state.phase !== VKPhase.PLAYING) return;
    const ug = this._uiGfx;
    const cx = this._sw / 2;
    const alpha = Math.min(0.5, state.waveIntroTimer / VK.WAVE_INTRO_DURATION);

    // Subtle "GET READY" vignette
    const thickness = 20;
    ug.rect(0, 0, this._sw, thickness).fill({ color: 0x4422aa, alpha: alpha * 0.3 });
    ug.rect(0, this._sh - thickness, this._sw, thickness).fill({ color: 0x4422aa, alpha: alpha * 0.3 });
    ug.rect(0, 0, thickness, this._sh).fill({ color: 0x4422aa, alpha: alpha * 0.3 });
    ug.rect(this._sw - thickness, 0, thickness, this._sh).fill({ color: 0x4422aa, alpha: alpha * 0.3 });

    // Show spawner positions with telegraph lines during intro
    if (state.waveIntroTimer > VK.WAVE_INTRO_DURATION * 0.3) {
      const g = this._gfx;
      const acx = state.arenaCenterX, acy = state.arenaCenterY, r = state.arenaRadius;
      for (const s of state.spawners) {
        if (!s.alive) continue;
        const sx = acx + Math.cos(s.angle) * r;
        const sy = acy + Math.sin(s.angle) * r;
        // Show aim line toward center
        g.setStrokeStyle({ width: 1, color: s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER, alpha: alpha * 0.3 });
        g.moveTo(sx, sy).lineTo(acx, acy).stroke();
      }
    }

    // Mutator display (larger, centered)
    if (state.waveMutators.length > 0) {
      const mutNames: Record<string, string> = { void_surge: "VOID SURGE", fragile: "FRAGILE", abundance: "ABUNDANCE", phantom: "PHANTOM", ricochet: "RICOCHET", gravity_well: "GRAVITY WELL" };
      // Use controls text for mutator name (temporary reuse)
      this._controlsText.visible = true;
      this._controlsText.text = mutNames[state.waveMutators[0]] || state.waveMutators[0];
      this._controlsText.style.fill = 0xcc66ff;
      this._controlsText.anchor.set(0.5);
      this._controlsText.position.set(cx, this._sh * 0.82);
      this._controlsText.alpha = alpha;
    }
  }

  // ---------------------------------------------------------------------------
  // Death replay visual (killer highlight)
  // ---------------------------------------------------------------------------

  private _drawDeathReplay(state: VKState): void {
    if (state.deathSlowTimer <= 0) return;
    const g = this._gfx;
    const ratio = state.deathSlowTimer / VK.DEATH_SLOW_DURATION;

    // Desaturation overlay
    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.15 * ratio });

    // Highlight the killer projectile position
    if (state.killerColor !== 0) {
      const pulse = 0.3 + Math.sin(state.time * 15) * 0.15;
      // Killer marker — pulsing ring at impact point
      g.circle(state.killerX, state.killerY, 15 + (1 - ratio) * 20).fill({ color: state.killerColor, alpha: pulse * ratio });
      g.setStrokeStyle({ width: 2, color: state.killerColor, alpha: pulse * ratio * 2 });
      g.circle(state.killerX, state.killerY, 12 + (1 - ratio) * 15).stroke();

      // Line from killer to death position
      g.setStrokeStyle({ width: 1.5, color: VK.COLOR_DANGER, alpha: 0.2 * ratio });
      g.moveTo(state.killerX, state.killerY).lineTo(state.deathX, state.deathY).stroke();
    }

    // Expanding death ring (multi-layer)
    const ringR = (1 - ratio) * 80;
    g.circle(state.deathX, state.deathY, ringR).fill({ color: VK.COLOR_DANGER, alpha: 0.04 * ratio });
    g.setStrokeStyle({ width: 4, color: VK.COLOR_DANGER, alpha: 0.12 * ratio });
    g.circle(state.deathX, state.deathY, ringR).stroke();
    g.setStrokeStyle({ width: 2, color: VK.COLOR_DANGER, alpha: 0.35 * ratio });
    g.circle(state.deathX, state.deathY, ringR).stroke();
    // Secondary expanding ring
    const ringR2 = (1 - ratio) * 55;
    g.setStrokeStyle({ width: 1, color: VK.COLOR_DANGER, alpha: 0.2 * ratio });
    g.circle(state.deathX, state.deathY, ringR2).stroke();

    // "KILLED BY" indicator
    const ug = this._uiGfx;
    ug.roundRect(this._sw / 2 - 55, this._sh * 0.12 - 2, 110, 24, 5).fill({ color: 0x000000, alpha: 0.55 * ratio });
    ug.setStrokeStyle({ width: 1, color: VK.COLOR_DANGER, alpha: 0.2 * ratio });
    ug.roundRect(this._sw / 2 - 55, this._sh * 0.12 - 2, 110, 24, 5).stroke();
  }

  private _drawShockwaves(g: Graphics, state: VKState): void {
    for (const sw of state.shockwaves) {
      const lifeRatio = sw.life / VK.SHOCKWAVE_LIFE;
      const alpha = lifeRatio * 0.5;
      // Outermost diffuse fill
      g.circle(sw.x, sw.y, sw.radius * 1.1).fill({ color: sw.color, alpha: alpha * 0.04 });
      g.circle(sw.x, sw.y, sw.radius).fill({ color: sw.color, alpha: alpha * 0.08 });
      // Main ring with glow halo
      g.setStrokeStyle({ width: 6, color: sw.color, alpha: alpha * 0.2 });
      g.circle(sw.x, sw.y, sw.radius).stroke();
      g.setStrokeStyle({ width: 3, color: sw.color, alpha });
      g.circle(sw.x, sw.y, sw.radius).stroke();
      // Secondary ring (trailing)
      g.setStrokeStyle({ width: 2, color: sw.color, alpha: alpha * 0.5 });
      g.circle(sw.x, sw.y, sw.radius * 0.78).stroke();
      // Tertiary faint ring
      g.setStrokeStyle({ width: 1.2, color: sw.color, alpha: alpha * 0.28 });
      g.circle(sw.x, sw.y, sw.radius * 0.55).stroke();
      // Quaternary inner ring
      g.setStrokeStyle({ width: 0.8, color: sw.color, alpha: alpha * 0.15 });
      g.circle(sw.x, sw.y, sw.radius * 0.35).stroke();
      // White core ring (inner bright edge)
      if (lifeRatio > 0.4) {
        g.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: (lifeRatio - 0.4) * 0.25 });
        g.circle(sw.x, sw.y, sw.radius * 0.96).stroke();
      }
      // Edge sparkle dots
      if (lifeRatio > 0.3) {
        for (let s = 0; s < 6; s++) {
          const sa = state.time * 2 + s * Math.PI / 3;
          g.circle(sw.x + Math.cos(sa) * sw.radius, sw.y + Math.sin(sa) * sw.radius, 1.5)
            .fill({ color: 0xffffff, alpha: alpha * 0.3 });
        }
      }
    }
  }

  private _drawHazards(g: Graphics, state: VKState): void {
    const t = state.time;
    for (const h of state.hazards) {
      if (h.warningTime > 0) {
        // Warning phase: pulsing red circle outline
        const pulse = 0.2 + Math.sin(t * 10) * 0.15;
        const warningRatio = h.warningTime / VK.HAZARD_WARNING_TIME;
        // Outer pulsing ring
        g.setStrokeStyle({ width: 2.5 + Math.sin(t * 8) * 1, color: VK.COLOR_HAZARD_WARNING, alpha: pulse * warningRatio });
        g.circle(h.x, h.y, h.radius).stroke();
        // Inner faint pulse ring
        g.setStrokeStyle({ width: 1, color: VK.COLOR_HAZARD_WARNING, alpha: pulse * warningRatio * 0.5 });
        g.circle(h.x, h.y, h.radius * (0.6 + Math.sin(t * 6) * 0.15)).stroke();
        // Crosshair target lines
        g.setStrokeStyle({ width: 0.8, color: VK.COLOR_HAZARD_WARNING, alpha: pulse * warningRatio * 0.4 });
        g.moveTo(h.x - h.radius * 0.7, h.y).lineTo(h.x + h.radius * 0.7, h.y).stroke();
        g.moveTo(h.x, h.y - h.radius * 0.7).lineTo(h.x, h.y + h.radius * 0.7).stroke();
        // Faint fill
        g.circle(h.x, h.y, h.radius).fill({ color: VK.COLOR_HAZARD_WARNING, alpha: pulse * warningRatio * 0.04 });
      } else if (h.activeTime > 0) {
        // Active phase: filled red danger zone
        const activeRatio = h.activeTime / VK.HAZARD_ACTIVE_TIME;
        const flicker = 0.15 + Math.sin(t * 12) * 0.05;
        // Filled danger zone
        g.circle(h.x, h.y, h.radius).fill({ color: VK.COLOR_HAZARD_ACTIVE, alpha: flicker * activeRatio });
        // Bright inner core
        g.circle(h.x, h.y, h.radius * 0.5).fill({ color: VK.COLOR_HAZARD_ACTIVE, alpha: flicker * activeRatio * 1.5 });
        // Outer glow
        g.circle(h.x, h.y, h.radius * 1.3).fill({ color: VK.COLOR_HAZARD_ACTIVE, alpha: flicker * activeRatio * 0.06 });
        // Border ring
        g.setStrokeStyle({ width: 2, color: VK.COLOR_HAZARD_ACTIVE, alpha: 0.4 * activeRatio });
        g.circle(h.x, h.y, h.radius).stroke();
      }
    }
  }

  private _drawGravityWells(g: Graphics, state: VKState): void {
    const t = state.time;
    for (const gw of state.gravityWells) {
      const lifeRatio = gw.life / VK.GRAVITY_WELL_DURATION;
      const r = VK.GRAVITY_WELL_RADIUS;
      // Swirling purple vortex background
      g.circle(gw.x, gw.y, r).fill({ color: VK.COLOR_PROJ_HELIX, alpha: 0.04 * lifeRatio });
      g.circle(gw.x, gw.y, r * 0.7).fill({ color: VK.COLOR_PROJ_HELIX, alpha: 0.06 * lifeRatio });
      g.circle(gw.x, gw.y, r * 0.4).fill({ color: VK.COLOR_PROJ_HELIX, alpha: 0.1 * lifeRatio });
      // Rotating spiral arms (3 arms pulling inward)
      for (let arm = 0; arm < 3; arm++) {
        const baseAngle = t * 4 + arm * Math.PI * 2 / 3;
        g.setStrokeStyle({ width: 1.5, color: VK.COLOR_PROJ_HELIX, alpha: 0.2 * lifeRatio });
        g.moveTo(gw.x + Math.cos(baseAngle) * r * 0.9, gw.y + Math.sin(baseAngle) * r * 0.9);
        for (let s = 1; s <= 6; s++) {
          const a = baseAngle + s * 0.35;
          const sr = r * (0.9 - s * 0.12);
          g.lineTo(gw.x + Math.cos(a) * sr, gw.y + Math.sin(a) * sr);
        }
        g.stroke();
      }
      // Inward-pulling particle dots
      for (let p = 0; p < 6; p++) {
        const pAngle = t * 3 + p * Math.PI / 3;
        const pR = r * (0.3 + ((t * 2 + p) % 1) * 0.6);
        const px = gw.x + Math.cos(pAngle) * pR;
        const py = gw.y + Math.sin(pAngle) * pR;
        g.circle(px, py, 1.5).fill({ color: VK.COLOR_PROJ_HELIX, alpha: 0.3 * lifeRatio });
      }
      // Outer ring
      g.setStrokeStyle({ width: 1, color: VK.COLOR_PROJ_HELIX, alpha: 0.15 * lifeRatio });
      g.circle(gw.x, gw.y, r).stroke();
      // Center bright dot
      g.circle(gw.x, gw.y, 3).fill({ color: 0xffffff, alpha: 0.2 * lifeRatio });
    }
  }

  private _drawAfterimages(g: Graphics, state: VKState): void {
    const t = state.time;
    for (const ai of state.afterimages) {
      const lifeRatio = ai.life / VK.AFTERIMAGE_DURATION;
      const pr = state.playerRadius;
      const alpha = lifeRatio * 0.4;
      // Fading translucent copy of the player diamond shape
      const kSize = pr * 1.35;
      // Use a default upward facing direction for the afterimage
      const ndx = 0, ndy = -1;
      const perpX = 1, perpY = 0;
      // Outer glow
      g.circle(ai.x, ai.y, pr * 2.5).fill({ color: VK.COLOR_PLAYER, alpha: alpha * 0.15 });
      g.circle(ai.x, ai.y, pr * 1.8).fill({ color: VK.COLOR_PLAYER, alpha: alpha * 0.25 });
      // Knight diamond body (translucent copy)
      g.moveTo(ai.x + ndx * kSize, ai.y + ndy * kSize)
        .lineTo(ai.x + perpX * kSize * 0.6, ai.y + perpY * kSize * 0.6)
        .lineTo(ai.x - ndx * kSize * 0.7, ai.y - ndy * kSize * 0.7)
        .lineTo(ai.x - perpX * kSize * 0.6, ai.y - perpY * kSize * 0.6)
        .closePath().fill({ color: VK.COLOR_PLAYER, alpha });
      // Flickering shimmer
      const shimmer = Math.sin(t * 10 + ai.x) * 0.1;
      g.circle(ai.x, ai.y, pr * 0.6).fill({ color: 0xffffff, alpha: (alpha + shimmer) * 0.3 });
      // Attract radius indicator (faint ring)
      g.setStrokeStyle({ width: 0.8, color: VK.COLOR_PLAYER, alpha: alpha * 0.2 });
      g.circle(ai.x, ai.y, VK.AFTERIMAGE_ATTRACT_RADIUS).stroke();
    }
  }

  private _drawTelegraphs(g: Graphics, state: VKState): void {
    const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
    for (const s of state.spawners) {
      if (!s.alive || s.telegraphTimer <= 0) continue;
      const sx = cx + Math.cos(s.angle) * r;
      const sy = cy + Math.sin(s.angle) * r;
      const intensity = s.telegraphTimer / VK.TELEGRAPH_DURATION; // 1 = just started, 0 = about to fire
      const flash = 0.5 + Math.sin(state.time * 25) * 0.5; // rapid flash
      const alpha = (0.15 + (1 - intensity) * 0.2) * flash;

      let tx: number, ty: number;
      if (s.pattern === ProjectilePattern.AIMED) {
        tx = state.playerX; ty = state.playerY;
      } else {
        tx = cx; ty = cy;
      }

      // Glow line (thicker, faded)
      g.setStrokeStyle({ width: 4, color: VK.COLOR_DANGER, alpha: alpha * 0.3 });
      g.moveTo(sx, sy).lineTo(tx, ty).stroke();
      // Core line
      g.setStrokeStyle({ width: 1.5, color: VK.COLOR_DANGER, alpha: alpha });
      g.moveTo(sx, sy).lineTo(tx, ty).stroke();
      // Dashed segments for visual interest
      const ddx = tx - sx, ddy = ty - sy;
      const dLen = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dLen > 0) {
        const nx = ddx / dLen, ny = ddy / dLen;
        // Animated dot traveling along the line
        const dotPos = ((state.time * 3) % 1.0) * dLen;
        g.circle(sx + nx * dotPos, sy + ny * dotPos, 2.5).fill({ color: VK.COLOR_DANGER, alpha: alpha * 1.5 });
      }
      // Spawner warning glow
      g.circle(sx, sy, VK.SPAWNER_RADIUS * 1.8).fill({ color: VK.COLOR_DANGER, alpha: alpha * 0.15 });
    }
  }

  private _drawPerkScreen(state: VKState): void {
    for (const pt of this._perkTexts) pt.visible = false;
    if (state.phase !== VKPhase.UPGRADE || state.perkChoices.length === 0) return;
    const ug = this._uiGfx;
    const cx = this._sw / 2, cy = this._sh / 2;

    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.65 });

    // Title
    this._pauseText.visible = true;
    this._pauseText.text = "CHOOSE AN UPGRADE";
    this._pauseText.style.fill = VK.COLOR_MULTIPLIER;
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(cx, cy - 90);
    this._pauseText.alpha = 1.0;

    // Subtitle line
    ug.rect(cx - 80, cy - 65, 160, 1).fill({ color: VK.COLOR_MULTIPLIER, alpha: 0.2 });

    const cardW = 190, cardH = 80, spacing = 16;
    const totalW = state.perkChoices.length * cardW + (state.perkChoices.length - 1) * spacing;
    const startX = cx - totalW / 2;

    for (let i = 0; i < state.perkChoices.length; i++) {
      const p = state.perkChoices[i];
      const x = startX + i * (cardW + spacing);
      const y = cy - 25;

      // Pulsing glow
      const pulse = 0.04 + Math.sin(state.time * 3 + i * 2.1) * 0.03;
      ug.roundRect(x - 4, y - 4, cardW + 8, cardH + 8, 12).fill({ color: p.color, alpha: pulse });
      // Shadow
      ug.roundRect(x + 2, y + 3, cardW, cardH, 6).fill({ color: 0x000000, alpha: 0.3 });
      // Card background
      ug.roundRect(x, y, cardW, cardH, 8).fill({ color: 0x111122, alpha: 0.92 });
      ug.roundRect(x + 2, y + cardH * 0.55, cardW - 4, cardH * 0.45 - 2, 6).fill({ color: 0x0a0a18, alpha: 0.3 });
      // Border
      ug.setStrokeStyle({ width: 2, color: p.color, alpha: 0.5 });
      ug.roundRect(x, y, cardW, cardH, 8).stroke();
      // Accent bar
      ug.roundRect(x + 2, y + 2, cardW - 4, 5, 3).fill({ color: p.color, alpha: 0.45 });

      // Number indicator
      ug.circle(x + 17, y + 20, 10).fill({ color: p.color, alpha: 0.15 });
      ug.setStrokeStyle({ width: 1.5, color: p.color, alpha: 0.5 });
      ug.circle(x + 17, y + 20, 10).stroke();

      // Perk-specific icon (below number circle)
      const iconX = x + 17, iconY = y + 42;
      if (p.id === "vampiric_dash") {
        // Fangs / blood drop icon
        ug.moveTo(iconX, iconY - 5).lineTo(iconX - 3, iconY + 2).lineTo(iconX, iconY + 5)
          .lineTo(iconX + 3, iconY + 2).closePath().fill({ color: p.color, alpha: 0.5 });
        ug.circle(iconX, iconY + 1, 2).fill({ color: 0xffffff, alpha: 0.2 });
      } else if (p.id === "gravity_well") {
        // Swirl / vortex icon
        ug.setStrokeStyle({ width: 1.2, color: p.color, alpha: 0.5 });
        ug.circle(iconX, iconY, 5).stroke();
        ug.circle(iconX, iconY, 2).fill({ color: p.color, alpha: 0.4 });
        // Spiral arm hint
        ug.moveTo(iconX + 5, iconY).lineTo(iconX + 3, iconY - 4).stroke();
        ug.moveTo(iconX - 5, iconY).lineTo(iconX - 3, iconY + 4).stroke();
      } else if (p.id === "afterimage") {
        // Ghost / phantom silhouette
        ug.moveTo(iconX, iconY - 5).lineTo(iconX + 3, iconY).lineTo(iconX, iconY + 4)
          .lineTo(iconX - 3, iconY).closePath().fill({ color: p.color, alpha: 0.35 });
        // Offset translucent copy
        ug.moveTo(iconX + 3, iconY - 4).lineTo(iconX + 6, iconY + 1).lineTo(iconX + 3, iconY + 5)
          .lineTo(iconX, iconY + 1).closePath().fill({ color: p.color, alpha: 0.15 });
      }

      // Perk text label (name + description)
      const pt = this._perkTexts[i];
      if (pt) {
        pt.visible = true;
        pt.text = `[${i + 1}] ${p.name}\n${p.desc}`;
        pt.style.fill = p.color;
        pt.position.set(x + 33, y + 12);
      }
    }

    // Hint
    ug.rect(cx - 60, cy + 70, 120, 1).fill({ color: 0x445566, alpha: 0.2 });
  }

  private _drawFloatTexts(state: VKState): void {
    for (const t of this._floatTexts) t.visible = false;
    const count = Math.min(state.floatTexts.length, FLOAT_POOL);
    for (let i = 0; i < count; i++) {
      const ft = state.floatTexts[state.floatTexts.length - 1 - i];
      const txt = this._floatTexts[i];
      txt.visible = true; txt.text = ft.text; txt.style.fill = ft.color;
      txt.position.set(ft.x, ft.y);
      txt.alpha = ft.life / ft.maxLife;
      txt.scale.set(ft.scale * (0.8 + (ft.life / ft.maxLife) * 0.2));
    }
  }

  // ---------------------------------------------------------------------------
  // Graze meter (bottom left)
  // ---------------------------------------------------------------------------

  private _drawGrazeMeter(state: VKState): void {
    if (state.phase !== VKPhase.PLAYING) return;
    const ug = this._uiGfx;
    const x = 10, y = this._sh - 22;
    const barW = 80, barH = 6;

    ug.roundRect(x - 1, y - 1, barW + 2, barH + 2, 4).fill({ color: 0x000000, alpha: 0.4 });
    ug.roundRect(x, y, barW, barH, 3).fill({ color: 0x1a1a2e, alpha: 0.5 });
    const fill = state.grazeMeter / VK.GRAZE_MAX;
    if (fill > 0) {
      const mColor = state.grazeBurstReady ? VK.COLOR_GRAZE : 0x886699;
      const mAlpha = state.grazeBurstReady ? 0.85 + Math.sin(state.time * 6) * 0.15 : 0.65;
      ug.roundRect(x, y, barW * fill, barH, 3).fill({ color: mColor, alpha: mAlpha });
      // Highlight strip
      ug.roundRect(x, y, barW * fill, barH * 0.4, 2).fill({ color: 0xffffff, alpha: 0.08 });
      // Glow when full
      if (state.grazeBurstReady) {
        ug.roundRect(x - 2, y - 2, barW + 4, barH + 4, 5).fill({ color: VK.COLOR_GRAZE, alpha: 0.08 + Math.sin(state.time * 5) * 0.04 });
      }
    }
    // Icon with glow
    ug.circle(x - 5, y + barH / 2, 5).fill({ color: VK.COLOR_GRAZE, alpha: 0.12 });
    ug.circle(x - 5, y + barH / 2, 3.5).fill({ color: VK.COLOR_GRAZE, alpha: 0.45 });
  }

  // ---------------------------------------------------------------------------
  // Multiplier display (top right area)
  // ---------------------------------------------------------------------------

  private _drawMultiplier(state: VKState): void {
    if (state.phase !== VKPhase.PLAYING) { this._multText.visible = false; return; }
    this._multText.visible = true;
    this._multText.anchor.set(1, 0);
    this._multText.position.set(this._sw - 10, 18);
    const m = state.multiplier;
    this._multText.text = m >= 1.05 ? `${m.toFixed(1)}x` : "";
    this._multText.alpha = Math.min(1, 0.5 + (m - 1) * 0.2);

    // Multiplier bar below dash cooldown
    if (m > 1.0) {
      const ug = this._uiGfx;
      const barW = 60, barH = 3;
      const bx = this._sw - 10 - barW, by = 18;
      const fill = Math.min(1, (m - 1) / (VK.MULT_MAX - 1));
      ug.rect(bx, by, barW * fill, barH).fill({ color: VK.COLOR_MULTIPLIER, alpha: 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _drawHUD(state: VKState, meta: VKMeta): void {
    if (state.phase === VKPhase.START || state.phase === VKPhase.DEAD) {
      this._hudText.visible = false; this._hudSmall.visible = false; this._multText.visible = false; return;
    }
    this._hudText.visible = true; this._hudSmall.visible = true;
    const ug = this._uiGfx;
    // HUD backdrop with gradient-like layering
    ug.rect(0, 0, this._sw, 46).fill({ color: 0x000000, alpha: 0.35 });
    ug.rect(0, 44, this._sw, 2).fill({ color: 0x6644aa, alpha: 0.08 });
    ug.rect(0, 42, this._sw, 4).fill({ color: 0x000000, alpha: 0.15 });

    const score = Math.floor(state.score);
    const hi = Math.max(Math.floor(meta.highScore), score);
    this._hudText.text = `SCORE: ${score}  |  WAVE: ${state.wave}  |  HI: ${hi}`;
    const parts: string[] = [];
    if (state.shieldHits > 0) parts.push(`SHIELD x${state.shieldHits}`);
    if (state.slowTimer > 0) parts.push(`SLOW: ${state.slowTimer.toFixed(1)}s`);
    if (state.magnetTimer > 0) parts.push(`MAGNET: ${state.magnetTimer.toFixed(1)}s`);
    if (state.reflectTimer > 0) parts.push(`REFLECT: ${state.reflectTimer.toFixed(1)}s`);
    if (state.hasteTimer > 0) parts.push(`HASTE: ${state.hasteTimer.toFixed(1)}s`);
    parts.push(`NEAR: ${state.nearMisses}`);
    parts.push(`NEXT: ${Math.ceil(state.waveTimer)}s`);
    if (state.waveMutators.length > 0) {
      const mutNames: Record<string, string> = { void_surge: "SURGE", fragile: "FRAG", abundance: "ABUND", phantom: "PHANTOM", ricochet: "RICO", gravity_well: "GRAV" };
      parts.push(state.waveMutators.map(m => mutNames[m] || m).join("+"));
    }
    this._hudSmall.text = parts.join("  |  ");

    // Dash cooldown bar
    const dashBarW = 60, dashBarH = 5;
    const dbx = this._sw - 10 - dashBarW, dby = 10;
    ug.roundRect(dbx - 1, dby - 1, dashBarW + 2, dashBarH + 2, 3).fill({ color: 0x000000, alpha: 0.4 });
    if (state.dashCooldown <= 0) {
      ug.roundRect(dbx, dby, dashBarW, dashBarH, 2).fill({ color: VK.COLOR_PLAYER, alpha: 0.65 + Math.sin(state.time * 4) * 0.2 });
      ug.roundRect(dbx, dby, dashBarW, dashBarH * 0.4, 2).fill({ color: 0xffffff, alpha: 0.1 });
      // Ready glow
      ug.roundRect(dbx - 2, dby - 2, dashBarW + 4, dashBarH + 4, 4).fill({ color: VK.COLOR_PLAYER, alpha: 0.06 + Math.sin(state.time * 3) * 0.03 });
    } else {
      ug.roundRect(dbx, dby, dashBarW, dashBarH, 2).fill({ color: 0x1a1a2e, alpha: 0.5 });
      const fillW = dashBarW * (1 - state.dashCooldown / VK.DASH_COOLDOWN);
      ug.roundRect(dbx, dby, fillW, dashBarH, 2).fill({ color: VK.COLOR_PLAYER, alpha: 0.55 });
      ug.roundRect(dbx, dby, fillW, dashBarH * 0.4, 2).fill({ color: 0xffffff, alpha: 0.06 });
    }
  }

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------

  private _drawStartScreen(state: VKState, meta: VKMeta): void {
    const show = state.phase === VKPhase.START;
    this._titleText.visible = show; this._subtitleText.visible = show;
    this._promptText.visible = show; this._controlsText.visible = show;
    if (!show) { this._controlsText.visible = false; return; }
    const cx = this._sw / 2, cy = this._sh / 2;
    const t = state.time;
    const g = this._gfx;

    // Attract mode — animated demo projectiles orbiting behind the overlay
    const demoR = Math.min(this._sw, this._sh) * 0.35;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.5 + i * Math.PI * 2 / 12;
      const pr = demoR * (0.3 + (i % 3) * 0.2);
      const px = cx + Math.cos(a) * pr;
      const py = cy + Math.sin(a) * pr;
      const colors = [VK.COLOR_PROJ_DEFAULT, VK.COLOR_PROJ_SPIRAL, VK.COLOR_PROJ_RING, VK.COLOR_PROJ_AIMED, VK.COLOR_PROJ_WAVE];
      const pc = colors[i % colors.length];
      g.circle(px, py, 3).fill({ color: pc, alpha: 0.2 });
      g.circle(px, py, 6).fill({ color: pc, alpha: 0.05 });
    }
    // Demo spawner crystals rotating at edge
    for (let i = 0; i < 3; i++) {
      const sa = t * 0.2 + i * Math.PI * 2 / 3;
      const sx = cx + Math.cos(sa) * demoR;
      const sy = cy + Math.sin(sa) * demoR;
      const sides = 5;
      g.moveTo(sx + Math.cos(sa) * 8, sy + Math.sin(sa) * 8);
      for (let v = 1; v <= sides; v++) g.lineTo(sx + Math.cos(sa + v * Math.PI * 2 / sides) * 8, sy + Math.sin(sa + v * Math.PI * 2 / sides) * 8);
      g.closePath().fill({ color: VK.COLOR_SPAWNER, alpha: 0.15 });
    }
    // Demo arena ring
    g.setStrokeStyle({ width: 1.5, color: VK.COLOR_ARENA_BORDER, alpha: 0.1 });
    g.circle(cx, cy, demoR).stroke();

    // Overlay
    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.55 });

    // Frame
    const fw = Math.min(520, this._sw - 60), fh = 380;
    const fx = cx - fw / 2, fy = cy - fh / 2;
    g.roundRect(fx - 2, fy - 2, fw + 4, fh + 4, 10).fill({ color: 0x6644aa, alpha: 0.04 });
    g.setStrokeStyle({ width: 2, color: 0x6644aa, alpha: 0.3 });
    g.roundRect(fx, fy, fw, fh, 8).stroke();
    g.setStrokeStyle({ width: 1, color: 0x6644aa, alpha: 0.15 });
    g.roundRect(fx + 5, fy + 5, fw - 10, fh - 10, 6).stroke();
    // Corner ornaments with diamonds
    for (const [ox, oy] of [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]]) {
      g.circle(ox, oy, 6).fill({ color: 0x6644aa, alpha: 0.12 });
      g.moveTo(ox, oy - 4).lineTo(ox + 4, oy).lineTo(ox, oy + 4).lineTo(ox - 4, oy).closePath()
        .fill({ color: 0x6644aa, alpha: 0.25 });
    }

    this._titleText.anchor.set(0.5); this._titleText.position.set(cx, cy - 120);
    this._subtitleText.anchor.set(0.5); this._subtitleText.position.set(cx, cy - 72);
    // Title underline
    g.rect(cx - 100, cy - 58, 200, 1).fill({ color: 0x6644aa, alpha: 0.2 });

    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(cx, cy - 20);
    this._controlsText.text = [
      "WASD / ARROWS  -  Move        SPACE / SHIFT  -  Dash",
      "E / Q  -  Graze Burst (when meter full)",
      "Dash THROUGH projectiles to destroy them!",
      "Near-misses build your score multiplier",
      "Graze by staying close to projectiles",
      "Destroy spawners by dashing into them",
    ].join("\n");

    if (meta.gamesPlayed > 0) {
      this._deathStats.visible = true;
      this._deathStats.anchor.set(0.5); this._deathStats.position.set(cx, cy + 75);
      const unlockCount = meta.unlocks ? meta.unlocks.length : 0;
      this._deathStats.text = `Best: ${meta.highScore}  |  Wave: ${meta.bestWave}  |  Peak: ${meta.bestMultiplier.toFixed(1)}x\nGames: ${meta.gamesPlayed}  |  Unlocks: ${unlockCount}/7`;
    } else {
      this._deathStats.visible = false;
    }

    this._promptText.anchor.set(0.5); this._promptText.position.set(cx, cy + 120);
    this._promptText.alpha = 0.6 + Math.sin(t * 3) * 0.4;
  }

  private _drawPauseScreen(state: VKState): void {
    const show = state.phase === VKPhase.PAUSED;
    if (state.phase !== VKPhase.UPGRADE && state.tutorialStep <= 0) this._pauseText.visible = show;
    if (!show) return;
    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.5 });
    const cx = this._sw / 2, cy = this._sh / 2;
    ug.roundRect(cx - 120, cy - 35, 240, 70, 8).fill({ color: 0x0a0a1e, alpha: 0.6 });
    ug.setStrokeStyle({ width: 1.5, color: 0x6644aa, alpha: 0.3 });
    ug.roundRect(cx - 120, cy - 35, 240, 70, 8).stroke();
    this._pauseText.anchor.set(0.5); this._pauseText.position.set(cx, cy);
    this._pauseText.alpha = 0.8 + Math.sin(state.time * 2) * 0.2;
  }

  private _drawDeathScreen(state: VKState, meta: VKMeta): void {
    const show = state.phase === VKPhase.DEAD;
    this._deathTitle.visible = show; this._deathStats.visible = show; this._deathPrompt.visible = show;
    if (!show) return;
    const ug = this._uiGfx;

    // Desaturation simulation — dark blue-gray overlay (simulates color drain)
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0a1a, alpha: 0.55 });
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.25 });

    const cx = this._sw / 2, cy = this._sh / 2;
    const rippleCount = 3;
    for (let rp = 0; rp < rippleCount; rp++) {
      const rpPhase = ((state.time * 0.3 + rp * 0.35) % 1.0);
      const rpRadius = rpPhase * Math.max(this._sw, this._sh) * 0.6;
      const rpAlpha = (1 - rpPhase) * 0.06;
      ug.setStrokeStyle({ width: 2 - rpPhase * 1.5, color: 0x6622aa, alpha: rpAlpha });
      ug.circle(state.deathX || cx, state.deathY || cy, rpRadius).stroke();
    }

    // Floating soul particles rising from death point
    for (let sp = 0; sp < 12; sp++) {
      const soulPhase = ((state.time * 0.5 + sp * 0.12) % 2.0);
      const soulX = (state.deathX || cx) + Math.sin(state.time * 0.8 + sp * 1.7) * 30 + (sp - 6) * 8;
      const soulY = (state.deathY || cy) - soulPhase * 100;
      const soulAlpha = Math.max(0, (1 - soulPhase * 0.5)) * 0.15;
      const soulSize = 2 + Math.sin(state.time * 2 + sp) * 0.8;
      if (soulAlpha > 0.01) {
        ug.circle(soulX, soulY, soulSize + 3).fill({ color: 0x8844cc, alpha: soulAlpha * 0.3 });
        ug.circle(soulX, soulY, soulSize).fill({ color: 0xccaaff, alpha: soulAlpha });
        ug.circle(soulX, soulY, soulSize * 0.4).fill({ color: 0xffffff, alpha: soulAlpha * 0.5 });
      }
    }
    const score = Math.floor(state.score);
    const grade = getVKGrade(score);
    const isNew = score >= meta.highScore && score > 0;

    // Find next grade and distance
    let nextGradeText = "";
    for (let i = VK.GRADE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score < VK.GRADE_THRESHOLDS[i].min) {
        const diff = VK.GRADE_THRESHOLDS[i].min - score;
        nextGradeText = `${diff} pts to ${VK.GRADE_THRESHOLDS[i].grade} rank`;
        break;
      }
    }

    // Grade circle with entrance bounce + breathing pulse
    const breathe = 1.0 + Math.sin(state.time * 2.5) * 0.06;
    const gradeY = cy - 110;
    // Multi-layer glow
    ug.circle(cx, gradeY, 50 * breathe).fill({ color: grade.color, alpha: 0.04 });
    ug.circle(cx, gradeY, 42 * breathe).fill({ color: grade.color, alpha: 0.07 });
    ug.circle(cx, gradeY, 34 * breathe).fill({ color: grade.color, alpha: 0.1 });
    ug.circle(cx, gradeY, 28 * breathe).fill({ color: grade.color, alpha: 0.15 });
    // Outer decorative ring (rotating)
    const ringRot = state.time * 0.4;
    ug.setStrokeStyle({ width: 1, color: grade.color, alpha: 0.15 });
    for (let seg = 0; seg < 8; seg += 2) {
      const a1 = ringRot + (seg / 8) * Math.PI * 2;
      const a2 = ringRot + ((seg + 1) / 8) * Math.PI * 2;
      const rr = 44 * breathe;
      ug.moveTo(cx + Math.cos(a1) * rr, gradeY + Math.sin(a1) * rr);
      for (let s = 1; s <= 4; s++) {
        const a = a1 + (a2 - a1) * (s / 4);
        ug.lineTo(cx + Math.cos(a) * rr, gradeY + Math.sin(a) * rr);
      }
      ug.stroke();
    }
    // Inner solid ring
    ug.setStrokeStyle({ width: 2.5, color: grade.color, alpha: 0.5 });
    ug.circle(cx, gradeY, 30 * breathe).stroke();
    // Grade letter sparkles
    for (let s = 0; s < 4; s++) {
      const sa = state.time * 1.5 + s * Math.PI / 2;
      const sr = 36 * breathe;
      ug.circle(cx + Math.cos(sa) * sr, gradeY + Math.sin(sa) * sr, 1.5)
        .fill({ color: grade.color, alpha: 0.2 + Math.sin(state.time * 3 + s) * 0.15 });
    }

    this._deathTitle.anchor.set(0.5); this._deathTitle.position.set(cx, gradeY);
    this._deathTitle.text = grade.grade; this._deathTitle.style.fill = grade.color;
    this._deathTitle.scale.set(breathe);

    if (isNew) {
      ug.roundRect(cx - 90, cy - 68, 180, 22, 4).fill({ color: 0xffd700, alpha: 0.15 });
      ug.setStrokeStyle({ width: 1.5, color: 0xffd700, alpha: 0.35 });
      ug.roundRect(cx - 90, cy - 68, 180, 22, 4).stroke();
      // Sparkles around NEW HIGH
      for (let s = 0; s < 4; s++) {
        const sa = state.time * 2 + s * Math.PI / 2;
        ug.circle(cx - 95 + Math.cos(sa) * 5, cy - 57 + Math.sin(sa) * 5, 1.5)
          .fill({ color: 0xffd700, alpha: 0.3 + Math.sin(state.time * 4 + s) * 0.2 });
      }
    }

    // Stats with typewriter reveal effect — lines appear one by one
    this._deathStats.anchor.set(0.5); this._deathStats.position.set(cx, cy - 10);
    const allStatLines = [
      `Score: ${score}${isNew ? "  ** NEW HIGH **" : ""}`,
      `Wave: ${state.wave}  |  Near Misses: ${state.nearMisses}  |  Orbs: ${state.orbsCollected}`,
      `Spawners: ${state.spawnersDestroyed}  |  Dash Kills: ${state.dashKillsTotal}`,
      `Peak: ${state.peakMultiplier.toFixed(1)}x  |  Time: ${Math.floor(state.time)}s`,
    ];
    if (nextGradeText) allStatLines.push(nextGradeText);
    if (state.selectedPerks.length > 0) {
      allStatLines.push(`Perks: ${state.selectedPerks.length}`);
    }
    // Typewriter-style reveal — fade in over time
    this._deathStats.text = allStatLines.join("\n");
    // Staggered alpha (simulates typewriter reveal timing)
    const statsAlpha = Math.min(1, state.time * 0.3);
    this._deathStats.alpha = statsAlpha;

    // Score progress bar toward next grade
    if (nextGradeText) {
      const barW = 160, barH = 4;
      const bx = cx - barW / 2, by = cy + 58;
      // Find current and next grade thresholds
      let prevThreshold = 0, nextThreshold = VK.GRADE_THRESHOLDS[VK.GRADE_THRESHOLDS.length - 1].min;
      for (let i = VK.GRADE_THRESHOLDS.length - 1; i >= 0; i--) {
        if (score < VK.GRADE_THRESHOLDS[i].min) { nextThreshold = VK.GRADE_THRESHOLDS[i].min; }
        else { prevThreshold = VK.GRADE_THRESHOLDS[i].min; break; }
      }
      const progress = nextThreshold > prevThreshold ? (score - prevThreshold) / (nextThreshold - prevThreshold) : 0;
      ug.roundRect(bx - 1, by - 1, barW + 2, barH + 2, 2).fill({ color: 0x000000, alpha: 0.4 });
      ug.rect(bx, by, barW, barH).fill({ color: 0x222233, alpha: 0.5 });
      ug.rect(bx, by, barW * Math.min(1, progress), barH).fill({ color: grade.color, alpha: 0.6 });
    }

    // Perk icons earned
    if (state.selectedPerks.length > 0) {
      const perkY = cy + 72;
      for (let i = 0; i < state.selectedPerks.length; i++) {
        ug.circle(cx - (state.selectedPerks.length * 7) + i * 14, perkY, 4)
          .fill({ color: VK.COLOR_MULTIPLIER, alpha: 0.3 });
        ug.moveTo(cx - (state.selectedPerks.length * 7) + i * 14, perkY - 2.5)
          .lineTo(cx - (state.selectedPerks.length * 7) + i * 14 + 2, perkY)
          .lineTo(cx - (state.selectedPerks.length * 7) + i * 14, perkY + 2.5)
          .lineTo(cx - (state.selectedPerks.length * 7) + i * 14 - 2, perkY)
          .closePath().fill({ color: VK.COLOR_MULTIPLIER, alpha: 0.5 });
      }
    }

    this._deathPrompt.anchor.set(0.5); this._deathPrompt.position.set(cx, cy + 95);
    this._deathPrompt.text = "SPACE/R to retry  |  ESC to exit";
    this._deathPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;
  }
}
