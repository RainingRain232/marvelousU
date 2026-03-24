// ---------------------------------------------------------------------------
// Graviton — PixiJS Renderer
// Gravity manipulation with orbital rings, asteroid capture, enemy destruction
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GPhase } from "../types";
import type { GState, GMeta } from "../types";

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
import { G, getGGrade } from "../config/GravitonBalance";
import { getMutationNames } from "../systems/GravitonSystem";

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 48, fill: 0x44ccff, fontWeight: "bold", letterSpacing: 5, dropShadow: { color: 0x000000, distance: 4, blur: 8, alpha: 0.8 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0x4488aa, fontStyle: "italic", letterSpacing: 2 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x66aacc, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0x44ccff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_GRADE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 46, fill: 0x44ccff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaaaacc, lineHeight: 22 });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x446688, lineHeight: 16 });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0x44ccff, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });

const FLOAT_POOL = 12;

export class GravitonRenderer {
  readonly container = new Container();
  private _gfx = new Graphics(); private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "GRAVITON", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Pull. Orbit. Fling. Destroy.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _sw = 0; private _sh = 0;
  private _stars: { x: number; y: number; s: number; p: number; b: number }[] = [];
  private _starsInit = false;

  build(sw: number, sh: number): void {
    this._sw = sw; this._sh = sh;
    this.container.addChild(this._gfx); this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    for (const t of [this._hudText, this._titleText, this._subtitleText, this._controlsText,
      this._promptText, this._gradeText, this._statText, this._deathPrompt, this._pauseText]) {
      this.container.addChild(t);
    }
    this._hudText.position.set(10, 8);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5); t.visible = false;
      this._floatTexts.push(t); this._floatContainer.addChild(t);
    }
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); this._uiGfx.destroy(); }

  private _initStars(): void {
    if (this._starsInit) return; this._starsInit = true;
    for (let i = 0; i < 80; i++) {
      this._stars.push({ x: Math.random() * this._sw, y: Math.random() * this._sh, s: Math.random() * 1.3 + 0.3, p: Math.random() * Math.PI * 2, b: Math.random() * 0.15 + 0.02 });
    }
  }

  render(state: GState, sw: number, sh: number, meta: GMeta): void {
    this._sw = sw; this._sh = sh;
    const g = this._gfx; g.clear(); this._uiGfx.clear();
    let shX = 0, shY = 0;
    if (state.screenShake > 0) { const i = G.SHAKE_INTENSITY * (state.screenShake / G.SHAKE_DURATION); shX = (Math.random()-0.5)*i*2; shY = (Math.random()-0.5)*i*2; }
    g.position.set(shX, shY);

    // Threat-reactive background: shifts from blue-black toward red-black
    const bgColor = state.threatLevel > 0.3 ? lerpColor(G.COLOR_BG, 0x0a0204, Math.min(1, (state.threatLevel - 0.3) * 1.5)) : G.COLOR_BG;
    g.rect(-10, -10, sw+20, sh+20).fill(bgColor);
    // Threat vignette (dark edges intensify with danger)
    if (state.threatLevel > 0.2) {
      const vigAlpha = (state.threatLevel - 0.2) * 0.15;
      const thickness = 30;
      g.rect(0, 0, sw, thickness).fill({ color: 0x000000, alpha: vigAlpha });
      g.rect(0, sh - thickness, sw, thickness).fill({ color: 0x000000, alpha: vigAlpha });
      g.rect(0, 0, thickness, sh).fill({ color: 0x000000, alpha: vigAlpha });
      g.rect(sw - thickness, 0, thickness, sh).fill({ color: 0x000000, alpha: vigAlpha });
    }
    // Nebula clouds (atmospheric depth)
    const ncx = sw / 2, ncy = sh / 2;
    g.circle(ncx * 0.6, ncy * 0.7, 160).fill({ color: 0x0a0420, alpha: 0.12 + Math.sin(state.time * 0.2) * 0.03 });
    g.circle(ncx * 1.4, ncy * 0.4, 120).fill({ color: 0x041020, alpha: 0.1 + Math.sin(state.time * 0.3 + 1) * 0.02 });
    g.circle(ncx * 0.3, ncy * 1.3, 100).fill({ color: 0x100418, alpha: 0.08 });

    // Stars with color variety
    this._initStars();
    const starColors = [0x8888aa, 0xaaaacc, 0x88aacc, 0xccaa88, 0xaa88cc];
    for (let i = 0; i < this._stars.length; i++) {
      const s = this._stars[i];
      const tw = s.b * (0.5 + Math.sin(state.time * 1.2 + s.p) * 0.5);
      if (tw > 0.01) {
        const sc = starColors[i % starColors.length];
        g.circle(s.x, s.y, s.s).fill({ color: sc, alpha: tw });
        if (s.s > 1.2 && tw > 0.07) {
          g.setStrokeStyle({ width: 0.5, color: sc, alpha: tw * 0.3 });
          g.moveTo(s.x - s.s * 1.5, s.y).lineTo(s.x + s.s * 1.5, s.y).stroke();
          g.moveTo(s.x, s.y - s.s * 1.5).lineTo(s.x, s.y + s.s * 1.5).stroke();
        }
      }
    }

    if (state.phase === GPhase.PLAYING || state.phase === GPhase.PAUSED) {
      this._drawArena(g, state);
      this._drawPullField(g, state);
      this._drawBodies(g, state);
      this._drawEnemies(g, state);
      this._drawPlayer(g, state);
      this._drawParticles(g, state);
    }

    if (state.screenFlashTimer > 0) g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.2 * (state.screenFlashTimer / G.FLASH_DURATION) });

    this._drawFloatTexts(state);
    this._drawHUD(state);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);
  }

  private _drawArena(g: Graphics, state: GState): void {
    const cx = state.arenaCX, cy = state.arenaCY, r = state.arenaRadius, t = state.time;

    // Radial gradient floor
    g.circle(cx, cy, r).fill({ color: G.COLOR_ARENA, alpha: 0.06 });
    g.circle(cx, cy, r * 0.7).fill({ color: 0x0a1830, alpha: 0.04 });
    g.circle(cx, cy, r * 0.4).fill({ color: 0x0c1a38, alpha: 0.03 });

    // Concentric energy rings (heartbeat-like)
    for (let ring = 1; ring <= 4; ring++) {
      const rr = r * ring / 4;
      g.setStrokeStyle({ width: 0.8, color: G.COLOR_ARENA, alpha: 0.03 + Math.sin(t * 0.6 + ring) * 0.015 });
      g.circle(cx, cy, rr).stroke();
    }

    // Radial energy lines
    for (let v = 0; v < 6; v++) {
      const va = v * Math.PI / 3 + t * 0.04;
      g.setStrokeStyle({ width: 0.8, color: G.COLOR_ARENA, alpha: 0.025 + Math.sin(t * 0.5 + v * 1.5) * 0.01 });
      g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * r * 0.85, cy + Math.sin(va) * r * 0.85).stroke();
    }

    // Outer glow layers
    g.circle(cx, cy, r + 18).fill({ color: G.COLOR_ARENA, alpha: 0.015 });
    g.circle(cx, cy, r + 10).fill({ color: G.COLOR_ARENA, alpha: 0.03 });

    // Animated border with threat-reactive color
    const borderColor = state.threatLevel > 0.4 ? lerpColor(G.COLOR_ARENA, G.COLOR_DANGER, (state.threatLevel - 0.4) * 1.5) : G.COLOR_ARENA;
    const segments = 20;
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2 + t * 0.25;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + t * 0.25;
      const pulse = 0.25 + Math.sin(t * 2.5 + i) * 0.1;
      g.setStrokeStyle({ width: 2.5, color: borderColor, alpha: pulse });
      g.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      for (let s = 1; s <= 5; s++) { const a = a1 + (a2 - a1) * (s / 5); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.stroke();
    }

    // Energy discharge sparks at boundary
    for (let s = 0; s < 4; s++) {
      const sa = t * 0.8 + s * Math.PI / 2;
      const sparkR = r + 5 + Math.sin(t * 4 + s * 2) * 3;
      g.circle(cx + Math.cos(sa) * sparkR, cy + Math.sin(sa) * sparkR, 1.5)
        .fill({ color: borderColor, alpha: 0.2 + Math.sin(t * 6 + s) * 0.1 });
    }

    // Center marker
    g.setStrokeStyle({ width: 1, color: G.COLOR_ARENA, alpha: 0.04 });
    g.moveTo(cx - 12, cy).lineTo(cx + 12, cy).stroke();
    g.moveTo(cx, cy - 12).lineTo(cx, cy + 12).stroke();
  }

  private _drawPullField(g: Graphics, state: GState): void {
    if (!state.pulling) return;
    const px = state.playerX, py = state.playerY, r = state.pullRadius, t = state.time;

    // Outer field glow (large, soft)
    g.circle(px, py, r * 1.05).fill({ color: G.COLOR_PULL, alpha: 0.04 });
    g.circle(px, py, r).fill({ color: G.COLOR_PULL, alpha: 0.06 });
    g.circle(px, py, r * 0.7).fill({ color: G.COLOR_PULL, alpha: 0.04 });

    // Converging rings (move inward to show pull direction)
    for (let ring = 0; ring < 6; ring++) {
      const phase = (t * 3 + ring * 0.3) % 1;
      const rr = r * (1 - phase); // ring moves from outside to center
      const alpha = (1 - phase) * 0.15;
      g.setStrokeStyle({ width: 1.5, color: G.COLOR_PULL, alpha });
      g.circle(px, py, rr).stroke();
    }

    // Radial tendrils (lines pointing inward showing attraction)
    for (let i = 0; i < 8; i++) {
      const ta = t * 0.5 + i * Math.PI / 4;
      const outerR = r * 0.9;
      const innerR = r * 0.3;
      const tendrilAlpha = 0.08 + Math.sin(t * 3 + i * 2) * 0.04;
      g.setStrokeStyle({ width: 1, color: G.COLOR_PULL, alpha: tendrilAlpha });
      g.moveTo(px + Math.cos(ta) * outerR, py + Math.sin(ta) * outerR)
        .lineTo(px + Math.cos(ta + 0.15) * innerR, py + Math.sin(ta + 0.15) * innerR).stroke();
    }

    // Boundary pulse ring
    g.setStrokeStyle({ width: 2, color: G.COLOR_PULL, alpha: 0.12 + Math.sin(t * 5) * 0.06 });
    g.circle(px, py, r).stroke();
  }

  private _drawBodies(g: Graphics, state: GState): void {
    const t = state.time;
    for (const b of state.bodies) {
      if (b.kind === "bomb") {
        const bombPulse = b.orbiting && b.fuseTimer > 0
          ? 0.15 + Math.sin(t * (10 + (1 - b.fuseTimer / G.BOMB_FUSE_DURATION) * 20)) * 0.12
          : 0.1 + Math.sin(t * 6) * 0.06;

        // Danger glow layers
        g.circle(b.x, b.y, b.radius * 2.5).fill({ color: G.COLOR_BOMB, alpha: bombPulse * 0.4 });
        g.circle(b.x, b.y, b.radius * 1.8).fill({ color: G.COLOR_BOMB, alpha: bombPulse * 0.7 });

        // Angular spiked body (pentagon for menacing look)
        const sides = 5;
        const rot = t * 2;
        g.moveTo(b.x + Math.cos(rot) * b.radius, b.y + Math.sin(rot) * b.radius);
        for (let v = 1; v <= sides; v++) {
          const va = rot + (v / sides) * Math.PI * 2;
          g.lineTo(b.x + Math.cos(va) * b.radius, b.y + Math.sin(va) * b.radius);
        }
        g.closePath().fill({ color: G.COLOR_BOMB, alpha: 0.85 });

        // Inner dark core
        g.circle(b.x, b.y, b.radius * 0.55).fill({ color: 0x331100, alpha: 0.5 });
        // Hot center
        g.circle(b.x, b.y, b.radius * 0.3).fill({ color: 0xffaa44, alpha: 0.6 });
        g.circle(b.x, b.y, b.radius * 0.15).fill({ color: 0xffee88, alpha: 0.4 });

        // Warning ring
        g.setStrokeStyle({ width: 1.5, color: G.COLOR_BOMB, alpha: 0.25 });
        g.circle(b.x, b.y, b.radius * 1.4).stroke();

        // Fuse ring with sparkle
        if (b.orbiting && b.fuseTimer > 0) {
          const fuseRatio = b.fuseTimer / G.BOMB_FUSE_DURATION;
          // Fuse arc
          g.setStrokeStyle({ width: 2.5, color: 0xffaa00, alpha: 0.55 });
          const arcEnd = fuseRatio * Math.PI * 2;
          g.moveTo(b.x + Math.cos(-Math.PI/2) * (b.radius + 4), b.y + Math.sin(-Math.PI/2) * (b.radius + 4));
          const steps = Math.max(3, Math.floor(arcEnd * 5));
          for (let s = 1; s <= steps; s++) { const a = -Math.PI/2 + arcEnd * (s/steps); g.lineTo(b.x + Math.cos(a)*(b.radius+4), b.y + Math.sin(a)*(b.radius+4)); }
          g.stroke();
          // Fuse tip sparkle
          const tipA = -Math.PI/2 + arcEnd;
          g.circle(b.x + Math.cos(tipA) * (b.radius + 4), b.y + Math.sin(tipA) * (b.radius + 4), 2)
            .fill({ color: 0xffee44, alpha: 0.5 + Math.sin(t * 15) * 0.3 });
        }
      } else if (b.kind === "gold_asteroid") {
        // Gold: rich glow + sparkle + faceted shape
        g.circle(b.x, b.y, b.radius * 2.2).fill({ color: G.COLOR_GOLD, alpha: 0.06 + Math.sin(t * 4) * 0.03 });
        g.circle(b.x, b.y, b.radius * 1.4).fill({ color: G.COLOR_GOLD, alpha: 0.12 });
        g.circle(b.x, b.y, b.radius).fill({ color: G.COLOR_GOLD, alpha: 0.85 });
        // Facet detail
        g.circle(b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * 0.45).fill({ color: 0xffffff, alpha: 0.2 });
        g.circle(b.x + b.radius * 0.3, b.y + b.radius * 0.15, b.radius * 0.25).fill({ color: 0xaa8800, alpha: 0.3 });
        // Orbiting sparkle
        const ga = t * 4 + b.x * 0.1;
        g.circle(b.x + Math.cos(ga) * b.radius * 1.2, b.y + Math.sin(ga) * b.radius * 1.2, 1.2)
          .fill({ color: 0xffffff, alpha: 0.4 });
      } else {
        // Regular asteroid: cratered surface detail
        const rColor = b.flung ? G.COLOR_FLUNG : G.COLOR_ASTEROID;
        if (b.flung) {
          // Flung: bright with extended trail
          g.circle(b.x, b.y, b.radius * 2).fill({ color: G.COLOR_FLUNG, alpha: 0.08 });
          g.circle(b.x, b.y, b.radius * 1.3).fill({ color: G.COLOR_FLUNG, alpha: 0.15 });
          g.circle(b.x, b.y, b.radius).fill({ color: G.COLOR_FLUNG, alpha: 0.85 });
          g.circle(b.x, b.y, b.radius * 0.4).fill({ color: 0xffffff, alpha: 0.25 });
          // Motion trail (multiple fading copies)
          const vLen = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (vLen > 0) {
            const ndx = -b.vx / vLen, ndy = -b.vy / vLen;
            for (let tr = 1; tr <= 3; tr++) {
              g.circle(b.x + ndx * b.radius * tr * 1.5, b.y + ndy * b.radius * tr * 1.5, b.radius * (1 - tr * 0.2))
                .fill({ color: G.COLOR_FLUNG, alpha: 0.12 - tr * 0.03 });
            }
          }
        } else {
          // Drifting asteroid with surface detail
          g.circle(b.x, b.y, b.radius).fill({ color: rColor, alpha: 0.8 });
          // Crater marks (deterministic per asteroid position)
          const seed = Math.floor(b.x * 7 + b.y * 13);
          g.circle(b.x + (seed % 3 - 1) * b.radius * 0.3, b.y + (seed % 5 - 2) * b.radius * 0.2, b.radius * 0.3)
            .fill({ color: 0x555566, alpha: 0.3 });
          // Edge highlight
          g.circle(b.x - b.radius * 0.15, b.y - b.radius * 0.2, b.radius * 0.35)
            .fill({ color: 0xaaaabb, alpha: 0.15 });
        }
      }
      // Orbit indicator
      if (b.orbiting) {
        g.setStrokeStyle({ width: 0.5, color: G.COLOR_PLAYER, alpha: 0.15 });
        g.circle(b.x, b.y, b.radius * 1.3).stroke();
      }
    }
  }

  private _drawEnemies(g: Graphics, state: GState): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const flash = e.flashTimer > 0;
      const dx = state.playerX - e.x, dy = state.playerY - e.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len, ny = dy / len, px = -ny, py = nx;

      // Windup telegraph — pulsing glow + danger line
      if (e.state === "windup") {
        const wPulse = 0.2 + Math.sin(t * 20) * 0.15;
        g.circle(e.x, e.y, e.radius * 2.5).fill({ color: 0xff4444, alpha: wPulse });
        // Aim line toward player
        g.setStrokeStyle({ width: 1.5, color: 0xff4444, alpha: wPulse });
        g.moveTo(e.x, e.y).lineTo(e.x + nx * e.radius * 4, e.y + ny * e.radius * 4).stroke();
      }

      if (e.kind === "scout") {
        // Scout: pointed triangle with engine glow
        const color = flash ? 0xffffff : G.COLOR_ENEMY_SCOUT;
        g.circle(e.x, e.y, e.radius * 1.6).fill({ color, alpha: 0.07 });
        g.moveTo(e.x + nx * e.radius, e.y + ny * e.radius)
          .lineTo(e.x + px * e.radius * 0.5, e.y + py * e.radius * 0.5)
          .lineTo(e.x - nx * e.radius * 0.6, e.y - ny * e.radius * 0.6)
          .lineTo(e.x - px * e.radius * 0.5, e.y - py * e.radius * 0.5)
          .closePath().fill({ color, alpha: 0.85 });
        // Interior highlight
        g.circle(e.x + nx * e.radius * 0.1, e.y + ny * e.radius * 0.1, e.radius * 0.25)
          .fill({ color: 0xffffff, alpha: 0.1 });
        // Engine glow at rear
        g.circle(e.x - nx * e.radius * 0.5, e.y - ny * e.radius * 0.5, e.radius * 0.25)
          .fill({ color: 0xff8844, alpha: 0.4 });
        // Charge trail
        if (e.state === "charge") {
          g.setStrokeStyle({ width: e.radius * 0.6, color, alpha: 0.15 });
          g.moveTo(e.x, e.y).lineTo(e.x - nx * e.radius * 3, e.y - ny * e.radius * 3).stroke();
        }
      } else if (e.kind === "fighter") {
        // Fighter: diamond/star shape (orange)
        const color = flash ? 0xffffff : 0xff8844; // orange instead of dark red
        g.circle(e.x, e.y, e.radius * 1.6).fill({ color, alpha: 0.06 });
        // Diamond shape
        g.moveTo(e.x + nx * e.radius, e.y + ny * e.radius) // front
          .lineTo(e.x + px * e.radius * 0.7, e.y + py * e.radius * 0.7) // right
          .lineTo(e.x - nx * e.radius * 0.8, e.y - ny * e.radius * 0.8) // back
          .lineTo(e.x - px * e.radius * 0.7, e.y - py * e.radius * 0.7) // left
          .closePath().fill({ color, alpha: 0.85 });
        // Inner core glow
        g.circle(e.x, e.y, e.radius * 0.3).fill({ color: 0xffffff, alpha: 0.12 });
        g.circle(e.x + nx * e.radius * 0.15, e.y + ny * e.radius * 0.15, e.radius * 0.2)
          .fill({ color: 0xffcc66, alpha: 0.25 });
        // Side fins
        g.moveTo(e.x + px * e.radius * 0.7, e.y + py * e.radius * 0.7)
          .lineTo(e.x + px * e.radius * 1.1 - nx * e.radius * 0.3, e.y + py * e.radius * 1.1 - ny * e.radius * 0.3)
          .lineTo(e.x - nx * e.radius * 0.4, e.y - ny * e.radius * 0.4)
          .closePath().fill({ color, alpha: 0.5 });
        // Second fin
        g.moveTo(e.x - px * e.radius * 0.7, e.y - py * e.radius * 0.7)
          .lineTo(e.x - px * e.radius * 1.1 - nx * e.radius * 0.3, e.y - py * e.radius * 1.1 - ny * e.radius * 0.3)
          .lineTo(e.x - nx * e.radius * 0.4, e.y - ny * e.radius * 0.4)
          .closePath().fill({ color, alpha: 0.5 });
        // Dash glow
        if (e.state === "dash") {
          g.circle(e.x, e.y, e.radius * 2).fill({ color, alpha: 0.12 });
        }
      } else {
        // Tank: hexagonal chunky shape (purple/magenta)
        const color = flash ? 0xffffff : 0xaa44aa; // purple instead of maroon
        g.circle(e.x, e.y, e.radius * 2).fill({ color, alpha: 0.05 });
        // Hexagon
        const sides = 6, rot = t * 0.3;
        g.moveTo(e.x + Math.cos(rot) * e.radius, e.y + Math.sin(rot) * e.radius);
        for (let v = 1; v <= sides; v++) {
          const va = rot + (v / sides) * Math.PI * 2;
          g.lineTo(e.x + Math.cos(va) * e.radius, e.y + Math.sin(va) * e.radius);
        }
        g.closePath().fill({ color, alpha: 0.85 });
        // Inner hex
        g.moveTo(e.x + Math.cos(rot) * e.radius * 0.6, e.y + Math.sin(rot) * e.radius * 0.6);
        for (let v = 1; v <= sides; v++) {
          const va = rot + (v / sides) * Math.PI * 2;
          g.lineTo(e.x + Math.cos(va) * e.radius * 0.6, e.y + Math.sin(va) * e.radius * 0.6);
        }
        g.closePath().fill({ color: 0x000000, alpha: 0.15 });
        // Armor ring
        if (e.armor) {
          g.setStrokeStyle({ width: 2.5, color: 0xcccccc, alpha: 0.5 });
          g.circle(e.x, e.y, e.radius + 4).stroke();
          g.setStrokeStyle({ width: 1, color: 0xcccccc, alpha: 0.25 });
          g.circle(e.x, e.y, e.radius + 7).stroke();
        }
      }

      // HP bar for multi-hp enemies
      if (e.maxHp > 1) {
        const barW = e.radius * 2.5, barH = 3;
        const eColor = e.kind === "scout" ? G.COLOR_ENEMY_SCOUT : e.kind === "fighter" ? 0xff8844 : 0xaa44aa;
        g.roundRect(e.x - barW / 2 - 1, e.y - e.radius - 7, barW + 2, barH + 2, 1).fill({ color: 0x000000, alpha: 0.4 });
        g.rect(e.x - barW / 2, e.y - e.radius - 6, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
        g.rect(e.x - barW / 2, e.y - e.radius - 6, barW * (e.hp / e.maxHp), barH).fill({ color: eColor, alpha: 0.7 });
      }
    }
  }

  private _drawPlayer(g: Graphics, state: GState): void {
    const px = state.playerX, py = state.playerY, pr = state.playerRadius, t = state.time;
    // Orbit ring — scales with orbit count
    if (state.orbitCount > 0) {
      const orbitIntensity = state.orbitCount / state.orbitCapacity;
      // Inner/outer orbit boundaries
      g.setStrokeStyle({ width: 1 + orbitIntensity, color: G.COLOR_ORBIT_RING, alpha: 0.1 + orbitIntensity * 0.15 });
      g.circle(px, py, G.ORBIT_DIST_MIN).stroke();
      g.setStrokeStyle({ width: 1, color: G.COLOR_ORBIT_RING, alpha: 0.06 + orbitIntensity * 0.08 });
      g.circle(px, py, G.ORBIT_DIST_MAX).stroke();

      // At 4+ orbiting: connecting lines between adjacent orbiting bodies (shield polygon)
      if (state.orbitCount >= 4) {
        const orbiting = state.bodies.filter(b => b.orbiting);
        // Sort by orbit angle
        orbiting.sort((a, b) => a.orbitAngle - b.orbitAngle);
        g.setStrokeStyle({ width: 1, color: G.COLOR_PLAYER, alpha: 0.06 + orbitIntensity * 0.06 });
        for (let i = 0; i < orbiting.length; i++) {
          const next = orbiting[(i + 1) % orbiting.length];
          g.moveTo(orbiting[i].x, orbiting[i].y).lineTo(next.x, next.y).stroke();
        }
      }

      // At full capacity: bright outer pulse ring
      if (state.orbitCount >= state.orbitCapacity) {
        const fullPulse = 0.08 + Math.sin(t * 5) * 0.05;
        g.setStrokeStyle({ width: 2, color: G.COLOR_PLAYER, alpha: fullPulse });
        g.circle(px, py, G.ORBIT_DIST_MAX + 5).stroke();
        // Ambient glow
        g.circle(px, py, G.ORBIT_DIST_MAX + 10).fill({ color: G.COLOR_PLAYER, alpha: fullPulse * 0.3 });
      }
    }
    // Player glow — gravity vortex feel
    g.circle(px, py, pr * 4).fill({ color: G.COLOR_PLAYER, alpha: 0.025 });
    g.circle(px, py, pr * 2.8).fill({ color: G.COLOR_PLAYER, alpha: 0.05 });
    g.circle(px, py, pr * 1.8).fill({ color: G.COLOR_PLAYER, alpha: 0.08 });

    // Rotating gravitational field lines (spiral effect)
    for (let fl = 0; fl < 4; fl++) {
      const fa = t * 1.5 + fl * Math.PI / 2;
      const spiralR1 = pr * 2.5;
      const spiralR2 = pr * 1.2;
      g.setStrokeStyle({ width: 1, color: G.COLOR_PLAYER, alpha: 0.08 });
      g.moveTo(px + Math.cos(fa) * spiralR1, py + Math.sin(fa) * spiralR1)
        .lineTo(px + Math.cos(fa + 0.4) * spiralR2, py + Math.sin(fa + 0.4) * spiralR2).stroke();
    }

    // Body — gravity singularity
    g.circle(px, py, pr * 1.1).fill({ color: 0x1a3366, alpha: 0.5 });
    g.circle(px, py, pr).fill(G.COLOR_PLAYER);
    g.circle(px, py, pr * 0.6).fill({ color: G.COLOR_PLAYER_CORE, alpha: 0.7 });
    // Core bright point
    g.circle(px, py, pr * 0.25).fill({ color: 0xffffff, alpha: 0.4 });
    // Highlight
    g.circle(px - pr * 0.2, py - pr * 0.25, pr * 0.3).fill({ color: 0xffffff, alpha: 0.15 });
    // HP indicator
    for (let h = 0; h < state.maxHp; h++) {
      const ha = (h / state.maxHp) * Math.PI * 2 - Math.PI / 2;
      const hx = px + Math.cos(ha) * (pr + 6);
      const hy = py + Math.sin(ha) * (pr + 6);
      g.circle(hx, hy, 2).fill({ color: h < state.hp ? G.COLOR_PLAYER : 0x333344, alpha: 0.7 });
    }
    // Fling cooldown arc
    if (state.flingCooldown > 0) {
      const fill = 1 - state.flingCooldown / G.FLING_COOLDOWN;
      g.setStrokeStyle({ width: 1.5, color: G.COLOR_FLUNG, alpha: 0.2 });
      g.moveTo(px + Math.cos(-Math.PI/2) * (pr+12), py + Math.sin(-Math.PI/2) * (pr+12));
      const steps = Math.max(3, Math.floor(fill * Math.PI * 2 * 4));
      for (let s = 1; s <= steps; s++) { const a = -Math.PI/2 + fill * Math.PI*2 * (s/steps); g.lineTo(px + Math.cos(a)*(pr+12), py + Math.sin(a)*(pr+12)); }
      g.stroke();
    }
    // Pulling visual
    if (state.pulling) {
      const pulse = 0.08 + Math.sin(t * 6) * 0.04;
      g.circle(px, py, pr * 2.5).fill({ color: G.COLOR_PULL, alpha: pulse });
    }
  }

  private _drawParticles(g: Graphics, state: GState): void {
    for (const p of state.particles) {
      const a = p.life / p.maxLife;
      const sz = p.size * a;
      // Motion trail
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 10) {
        const ndx = -p.vx / spd, ndy = -p.vy / spd;
        g.setStrokeStyle({ width: sz * 0.5, color: p.color, alpha: a * 0.1 });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * sz * 2, p.y + ndy * sz * 2).stroke();
      }
      // Outer glow
      g.circle(p.x, p.y, sz * 1.5).fill({ color: p.color, alpha: a * 0.1 });
      // Core — diamond for large
      if (p.size > 3) {
        g.moveTo(p.x, p.y - sz).lineTo(p.x + sz * 0.5, p.y).lineTo(p.x, p.y + sz).lineTo(p.x - sz * 0.5, p.y)
          .closePath().fill({ color: p.color, alpha: a });
      } else {
        g.circle(p.x, p.y, sz).fill({ color: p.color, alpha: a });
      }
      // Hot core
      if (a > 0.3) g.circle(p.x, p.y, sz * 0.25).fill({ color: 0xffffff, alpha: a * 0.2 });
    }
  }

  private _drawFloatTexts(state: GState): void {
    for (const t of this._floatTexts) t.visible = false;
    const count = Math.min(state.floatTexts.length, FLOAT_POOL);
    for (let i = 0; i < count; i++) {
      const ft = state.floatTexts[state.floatTexts.length - 1 - i];
      const txt = this._floatTexts[i];
      txt.visible = true; txt.text = ft.text; txt.style.fill = ft.color;
      txt.position.set(ft.x, ft.y); txt.alpha = ft.life / ft.maxLife;
      txt.scale.set(ft.scale * (0.8 + (ft.life/ft.maxLife)*0.2));
    }
  }

  private _drawHUD(state: GState): void {
    if (state.phase !== GPhase.PLAYING && state.phase !== GPhase.PAUSED) { this._hudText.visible = false; return; }
    this._hudText.visible = true;
    const g = this._gfx; // FIX: was referencing undefined `g`
    const ug = this._uiGfx;
    const waveLabel = state.waveEvent ? `Wave: ${state.wave} (${state.waveEvent})` : `Wave: ${state.wave}`;
    this._hudText.text = `Score: ${Math.floor(state.score)}  |  HP: ${state.hp}/${state.maxHp}  |  Orbit: ${state.orbitCount}/${state.orbitCapacity}  |  ${waveLabel}`;

    // Fling hold indicator (below player)
    if (state.flingHeld && state.orbitCount > 0) {
      const holdFill = Math.min(1, state.flingHoldTimer / G.FLING_HOLD_THRESHOLD);
      const holdBarW = 30, holdBarH = 3;
      const hbx = state.playerX - holdBarW / 2, hby = state.playerY + state.playerRadius + 16;
      g.rect(hbx, hby, holdBarW, holdBarH).fill({ color: 0x222233, alpha: 0.4 });
      g.rect(hbx, hby, holdBarW * holdFill, holdBarH).fill({ color: holdFill >= 1 ? G.COLOR_FLUNG : 0x888888, alpha: 0.6 });
    }

    // Pull energy as circular arc around player (replaces corner bar)
    const px = state.playerX, py = state.playerY, pr = state.playerRadius;
    const eArcR = pr + 10;
    const eArcEnd = state.pullEnergy * Math.PI * 2;
    const eColor = state.pullEnergy > 0.3 ? G.COLOR_PULL : G.COLOR_DANGER;
    if (state.pullEnergy < 1) {
      g.setStrokeStyle({ width: 2, color: eColor, alpha: 0.3 });
      g.moveTo(px + Math.cos(-Math.PI / 2) * eArcR, py + Math.sin(-Math.PI / 2) * eArcR);
      const steps = Math.max(3, Math.floor(eArcEnd * 5));
      for (let s = 1; s <= steps; s++) {
        const a = -Math.PI / 2 + eArcEnd * (s / steps);
        g.lineTo(px + Math.cos(a) * eArcR, py + Math.sin(a) * eArcR);
      }
      g.stroke();
    } else {
      // Full energy: complete ring
      g.setStrokeStyle({ width: 1.5, color: eColor, alpha: 0.15 + Math.sin(state.time * 4) * 0.08 });
      g.circle(px, py, eArcR).stroke();
    }

    // Aim direction — trajectory preview (dashed line showing fling path)
    if (state.phase === GPhase.PLAYING && state.orbitCount > 0) {
      const aimLen = 60;
      const ax = px + Math.cos(state.aimAngle) * (pr + 8);
      const ay = py + Math.sin(state.aimAngle) * (pr + 8);
      // Main aim line
      g.setStrokeStyle({ width: 2, color: G.COLOR_FLUNG, alpha: 0.3 });
      g.moveTo(ax, ay).lineTo(ax + Math.cos(state.aimAngle) * aimLen, ay + Math.sin(state.aimAngle) * aimLen).stroke();
      // Dashed segments extending further
      for (let d = 0; d < 3; d++) {
        const dStart = aimLen + d * 18;
        const dEnd = aimLen + d * 18 + 10;
        g.setStrokeStyle({ width: 1.5, color: G.COLOR_FLUNG, alpha: 0.15 - d * 0.04 });
        g.moveTo(ax + Math.cos(state.aimAngle) * dStart, ay + Math.sin(state.aimAngle) * dStart)
          .lineTo(ax + Math.cos(state.aimAngle) * dEnd, ay + Math.sin(state.aimAngle) * dEnd).stroke();
      }
      // Spread lines (show volley cone)
      if (state.flingHeld && state.flingHoldTimer >= G.FLING_HOLD_THRESHOLD) {
        const spread = G.FLING_SPREAD;
        for (const side of [-1, 1]) {
          const spreadAngle = state.aimAngle + spread * side;
          g.setStrokeStyle({ width: 1, color: G.COLOR_FLUNG, alpha: 0.12 });
          g.moveTo(ax, ay).lineTo(ax + Math.cos(spreadAngle) * aimLen * 0.7, ay + Math.sin(spreadAngle) * aimLen * 0.7).stroke();
        }
      }
    }

    // Combo display (top-right) — visible counter
    if (state.comboCount >= 2) {
      const comboAlpha = 0.6 + Math.sin(state.time * 8) * 0.3;
      const comboColor = state.comboCount >= 5 ? 0xffd700 : state.comboCount >= 3 ? 0xffdd44 : 0x44ff44;
      ug.roundRect(this._sw - 85, 32, 75, 18, 4).fill({ color: 0x000000, alpha: 0.35 });
      ug.roundRect(this._sw - 83, 34, 71, 14, 3).fill({ color: comboColor, alpha: comboAlpha * 0.1 });
      // Combo pips (visual dots showing count)
      const pipCount = Math.min(state.comboCount, 10);
      for (let p = 0; p < pipCount; p++) {
        ug.circle(this._sw - 78 + p * 7, 41, 2.5).fill({ color: comboColor, alpha: comboAlpha });
      }
    }

    // Active mutation indicator (bottom-left)
    if (state.activeMutation) {
      ug.roundRect(8, this._sh - 20, 100, 14, 3).fill({ color: 0x000000, alpha: 0.3 });
      ug.roundRect(10, this._sh - 18, 96, 10, 2).fill({ color: G.COLOR_PLAYER, alpha: 0.06 });
      // Small pip
      ug.circle(15, this._sh - 13, 3).fill({ color: G.COLOR_PLAYER, alpha: 0.4 });
    }
  }

  private _drawStartScreen(state: GState, meta: GMeta): void {
    const show = state.phase === GPhase.START;
    this._titleText.visible = show; this._subtitleText.visible = show;
    this._promptText.visible = show; this._controlsText.visible = show;
    if (!show) { this._controlsText.visible = false; return; }
    const cx = this._sw/2, cy = this._sh/2, g = this._gfx;
    const t = state.time;

    // Demo orbital ring behind overlay
    for (let d = 0; d < 6; d++) {
      const da = t * 0.6 + d * Math.PI / 3;
      const dr = 100 + d * 15;
      g.circle(cx + Math.cos(da) * dr, cy + Math.sin(da) * dr, 3).fill({ color: G.COLOR_ASTEROID, alpha: 0.08 });
    }
    // Demo pull field
    g.setStrokeStyle({ width: 1, color: G.COLOR_PULL, alpha: 0.04 });
    g.circle(cx, cy, 80).stroke();
    g.circle(cx, cy, 50).stroke();

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.55 });

    // Frame with outer glow
    const fw = 480, fh = 340;
    g.roundRect(cx - fw/2 - 3, cy - fh/2 - 3, fw + 6, fh + 6, 10).fill({ color: G.COLOR_PLAYER, alpha: 0.03 });
    g.setStrokeStyle({ width: 2, color: G.COLOR_PLAYER, alpha: 0.2 });
    g.roundRect(cx - fw/2, cy - fh/2, fw, fh, 8).stroke();
    g.setStrokeStyle({ width: 1, color: G.COLOR_PLAYER, alpha: 0.1 });
    g.roundRect(cx - fw/2 + 4, cy - fh/2 + 4, fw - 8, fh - 8, 6).stroke();

    // Corner ornaments
    for (const [ox, oy] of [[cx-fw/2, cy-fh/2], [cx+fw/2, cy-fh/2], [cx-fw/2, cy+fh/2], [cx+fw/2, cy+fh/2]]) {
      g.circle(ox, oy, 4).fill({ color: G.COLOR_PLAYER, alpha: 0.12 });
      g.circle(ox, oy, 2).fill({ color: G.COLOR_PLAYER, alpha: 0.25 });
    }

    // Title underline
    g.rect(cx - 100, cy - 80, 200, 1).fill({ color: G.COLOR_PLAYER, alpha: 0.15 });

    this._titleText.anchor.set(0.5); this._titleText.position.set(cx, cy - 110);
    this._subtitleText.anchor.set(0.5); this._subtitleText.position.set(cx, cy - 65);
    this._controlsText.anchor.set(0.5); this._controlsText.position.set(cx, cy - 5);
    this._controlsText.text = [
      "WASD / ARROWS  -  Move your gravity well",
      "Hold SPACE  -  Pull nearby objects into orbit",
      "SHIFT  -  Fling all orbiting objects outward!",
      "Capture asteroids, fling them at enemies",
      "Watch out for BOMBS (red) — they hurt!",
    ].join("\n");
    if (meta.gamesPlayed > 0) {
      this._statText.visible = true; this._statText.anchor.set(0.5); this._statText.position.set(cx, cy + 65);
      const unlocks = meta.unlocks ? meta.unlocks.length : 0;
      this._statText.text = `Best: ${meta.highScore}  |  Wave: ${meta.bestWave}  |  Games: ${meta.gamesPlayed}  |  Unlocks: ${unlocks}/4`;
    } else { this._statText.visible = false; }

    // Mutation selector (if unlocks available)
    const unlocked = meta.unlocks || [];
    if (unlocked.length > 0) {
      const mutations = getMutationNames();
      const mutY = cy + 90;
      const ug2 = this._uiGfx;
      ug2.roundRect(cx - 220, mutY - 3, 440, mutations.length * 14 + 12, 4).fill({ color: 0x000000, alpha: 0.4 });
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const isUnlocked = unlocked.includes(m.id);
        const isActive = state.activeMutation === m.id;
        const my = mutY + 4 + i * 14;
        if (isActive) {
          ug2.roundRect(cx - 215, my - 2, 430, 13, 2).fill({ color: G.COLOR_PLAYER, alpha: 0.08 });
        }
        // Small indicator pip
        ug2.circle(cx - 210, my + 4, 3).fill({ color: isUnlocked ? (isActive ? G.COLOR_PLAYER : 0x888888) : 0x333333, alpha: 0.6 });
      }
    }

    this._promptText.anchor.set(0.5); this._promptText.position.set(cx, cy + 145);
    this._promptText.alpha = 0.5 + Math.sin(state.time * 3) * 0.4;
  }

  private _drawPauseScreen(state: GState): void {
    const show = state.phase === GPhase.PAUSED; this._pauseText.visible = show;
    if (!show) return;
    const ug = this._uiGfx; ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.5 });
    const cx = this._sw/2, cy = this._sh/2;
    ug.roundRect(cx-100, cy-30, 200, 60, 8).fill({ color: 0x060618, alpha: 0.7 });
    this._pauseText.anchor.set(0.5); this._pauseText.position.set(cx, cy);
    this._pauseText.alpha = 0.8 + Math.sin(state.time * 2) * 0.2;
  }

  private _drawDeathScreen(state: GState, meta: GMeta): void {
    const show = state.phase === GPhase.DEAD;
    this._gradeText.visible = show; this._deathPrompt.visible = show;
    if (show) this._statText.visible = true; // don't hide statText when not dead (start screen uses it)
    if (!show) return;
    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.7 });
    const cx = this._sw/2, cy = this._sh/2;
    const score = Math.floor(state.score);
    const grade = getGGrade(score);
    const isNew = score >= meta.highScore && score > 0;
    const t = state.time;
    const breathe = 1 + Math.sin(t * 2) * 0.04;

    // Multi-layer grade glow
    ug.circle(cx, cy - 95, 45 * breathe).fill({ color: grade.color, alpha: 0.04 });
    ug.circle(cx, cy - 95, 35 * breathe).fill({ color: grade.color, alpha: 0.08 });
    ug.circle(cx, cy - 95, 28 * breathe).fill({ color: grade.color, alpha: 0.12 });
    // Rotating dashed ring
    for (let seg = 0; seg < 8; seg += 2) {
      const a1 = (seg/8)*Math.PI*2 + t*0.4, a2 = ((seg+1)/8)*Math.PI*2 + t*0.4;
      ug.setStrokeStyle({ width: 1.5, color: grade.color, alpha: 0.2 });
      ug.moveTo(cx + Math.cos(a1)*38*breathe, cy-95+Math.sin(a1)*38*breathe);
      for (let s = 1; s <= 3; s++) { const a = a1+(a2-a1)*(s/3); ug.lineTo(cx+Math.cos(a)*38*breathe, cy-95+Math.sin(a)*38*breathe); }
      ug.stroke();
    }
    // Inner solid ring
    ug.setStrokeStyle({ width: 2.5, color: grade.color, alpha: 0.45 });
    ug.circle(cx, cy - 95, 28 * breathe).stroke();

    this._gradeText.anchor.set(0.5); this._gradeText.position.set(cx, cy - 95);
    this._gradeText.text = grade.grade; this._gradeText.style.fill = grade.color;
    this._gradeText.scale.set(breathe);

    if (isNew) {
      ug.roundRect(cx - 80, cy - 60, 160, 20, 4).fill({ color: 0xffd700, alpha: 0.12 });
      ug.setStrokeStyle({ width: 1, color: 0xffd700, alpha: 0.25 });
      ug.roundRect(cx - 80, cy - 60, 160, 20, 4).stroke();
      // Sparkles
      for (let s = 0; s < 3; s++) {
        const sa = t * 2 + s * 2.1;
        ug.circle(cx - 85 + Math.cos(sa) * 4, cy - 50 + Math.sin(sa) * 4, 1.5)
          .fill({ color: 0xffd700, alpha: 0.3 + Math.sin(t * 4 + s) * 0.2 });
      }
    }
    this._statText.anchor.set(0.5); this._statText.position.set(cx, cy + 5);
    this._statText.text = [
      `Score: ${score}${isNew ? "  ** NEW HIGH **" : ""}`,
      `Enemies: ${state.enemiesKilled}  |  Captured: ${state.asteroidsCaptured}  |  Launched: ${state.asteroidsLaunched}`,
      `Wave: ${state.wave}  |  Time: ${Math.floor(state.time)}s`,
    ].join("\n");
    this._deathPrompt.anchor.set(0.5); this._deathPrompt.position.set(cx, cy + 70);
    this._deathPrompt.text = "SPACE/R to retry  |  ESC to exit";
    this._deathPrompt.alpha = 0.5 + Math.sin(state.time * 3) * 0.4;
  }
}
