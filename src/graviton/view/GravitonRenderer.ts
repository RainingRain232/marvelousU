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
    for (let i = 0; i < 200; i++) {
      this._stars.push({ x: Math.random() * this._sw, y: Math.random() * this._sh, s: Math.random() * 1.8 + 0.3, p: Math.random() * Math.PI * 2, b: Math.random() * 0.25 + 0.04 });
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
    // Nebula clouds (atmospheric depth) — layered for richer look
    const ncx = sw / 2, ncy = sh / 2, nt = state.time;
    g.circle(ncx * 0.6, ncy * 0.7, 220).fill({ color: 0x0a0420, alpha: 0.14 + Math.sin(nt * 0.2) * 0.04 });
    g.circle(ncx * 0.6, ncy * 0.7, 140).fill({ color: 0x140630, alpha: 0.08 + Math.sin(nt * 0.25) * 0.03 });
    g.circle(ncx * 1.4, ncy * 0.4, 180).fill({ color: 0x041020, alpha: 0.12 + Math.sin(nt * 0.3 + 1) * 0.03 });
    g.circle(ncx * 1.4, ncy * 0.4, 100).fill({ color: 0x081830, alpha: 0.06 });
    g.circle(ncx * 0.3, ncy * 1.3, 160).fill({ color: 0x100418, alpha: 0.10 + Math.sin(nt * 0.15 + 2) * 0.03 });
    g.circle(ncx * 1.1, ncy * 1.2, 130).fill({ color: 0x080620, alpha: 0.08 + Math.sin(nt * 0.18 + 3) * 0.02 });
    g.circle(ncx * 0.8, ncy * 0.3, 100).fill({ color: 0x0c0828, alpha: 0.06 });
    // Dust band across center
    g.ellipse(ncx, ncy * 0.9, sw * 0.4, 40).fill({ color: 0x0c0820, alpha: 0.06 + Math.sin(nt * 0.1) * 0.02 });

    // Stars with parallax drift based on player position
    this._initStars();
    const starColors = [0x8888aa, 0xaaaacc, 0x88aacc, 0xccaa88, 0xaa88cc, 0xcc88aa, 0x88ccaa];
    const pcx = (state.phase === GPhase.PLAYING || state.phase === GPhase.PAUSED) ? state.playerX : sw / 2;
    const pcy = (state.phase === GPhase.PLAYING || state.phase === GPhase.PAUSED) ? state.playerY : sh / 2;
    for (let i = 0; i < this._stars.length; i++) {
      const s = this._stars[i];
      const tw = s.b * (0.5 + Math.sin(state.time * 1.2 + s.p) * 0.5);
      if (tw > 0.01) {
        const sc = starColors[i % starColors.length];
        // Parallax: stars drift slightly opposite to player movement
        const parallax = (i % 3 + 1) * 0.015;
        const sx = s.x - (pcx - sw / 2) * parallax;
        const sy = s.y - (pcy - sh / 2) * parallax;
        g.circle(sx, sy, s.s).fill({ color: sc, alpha: tw });
        if (s.s > 1.0 && tw > 0.05) {
          // Cross sparkle for brighter stars
          const sparkLen = s.s * 2;
          g.moveTo(sx - sparkLen, sy).lineTo(sx + sparkLen, sy).stroke({ color: sc, width: 0.5, alpha: tw * 0.35 });
          g.moveTo(sx, sy - sparkLen).lineTo(sx, sy + sparkLen).stroke({ color: sc, width: 0.5, alpha: tw * 0.35 });
          // Diagonal sparkle for the biggest stars
          if (s.s > 1.5 && tw > 0.08) {
            g.moveTo(sx - sparkLen * 0.6, sy - sparkLen * 0.6).lineTo(sx + sparkLen * 0.6, sy + sparkLen * 0.6)
              .stroke({ color: sc, width: 0.3, alpha: tw * 0.2 });
            g.moveTo(sx + sparkLen * 0.6, sy - sparkLen * 0.6).lineTo(sx - sparkLen * 0.6, sy + sparkLen * 0.6)
              .stroke({ color: sc, width: 0.3, alpha: tw * 0.2 });
          }
        }
      }
    }

    if (state.phase === GPhase.PLAYING || state.phase === GPhase.PAUSED) {
      this._drawArena(g, state);
      // Ambient drifting motes inside arena — varied sizes and colors
      const cx = state.arenaCX, cy = state.arenaCY, ar = state.arenaRadius;
      const moteColors = [G.COLOR_ARENA, G.COLOR_PLAYER, 0x4466aa, 0x224488];
      for (let m = 0; m < 35; m++) {
        const mSeed = m * 137.5;
        const mAngle = state.time * (0.05 + (m % 3) * 0.03) + mSeed;
        const mDist = ((mSeed * 7.3) % (ar * 0.85));
        const mx = cx + Math.cos(mAngle) * mDist;
        const my = cy + Math.sin(mAngle * 0.7 + mSeed * 0.3) * mDist;
        const mAlpha = 0.035 + Math.sin(state.time * 0.8 + mSeed) * 0.02;
        const mSize = 0.6 + (m % 4) * 0.3;
        const mColor = moteColors[m % moteColors.length];
        g.circle(mx, my, mSize).fill({ color: mColor, alpha: mAlpha });
        // Tiny glow for larger motes
        if (mSize > 1) {
          g.circle(mx, my, mSize * 2.5).fill({ color: mColor, alpha: mAlpha * 0.2 });
        }
      }
      // Gravity-pulled motes near player (swirl toward player)
      for (let gm = 0; gm < 8; gm++) {
        const gmAngle = state.time * 1.5 + gm * Math.PI / 4;
        const gmDist = 30 + Math.sin(state.time * 2 + gm * 1.7) * 12;
        const gmx = state.playerX + Math.cos(gmAngle) * gmDist;
        const gmy = state.playerY + Math.sin(gmAngle) * gmDist;
        g.circle(gmx, gmy, 0.8).fill({ color: G.COLOR_PLAYER, alpha: 0.06 + Math.sin(state.time * 3 + gm) * 0.03 });
      }
      this._drawPullField(g, state);
      this._drawBodies(g, state);
      this._drawPowerups(g, state);
      this._drawEnemies(g, state);
      this._drawPlayer(g, state);
      this._drawActiveEffects(g, state);
      this._drawParticles(g, state);
    }

    // Screen flash with radial burst
    if (state.screenFlashTimer > 0) {
      const flashRatio = state.screenFlashTimer / G.FLASH_DURATION;
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.2 * flashRatio });
      // Flash burst from center
      g.circle(sw / 2, sh / 2, Math.max(sw, sh) * (1 - flashRatio) * 0.5)
        .stroke({ color: state.screenFlashColor, width: 3, alpha: flashRatio * 0.15 });
    }

    // Screen-edge threat glow (pulsing red edges at high threat)
    if ((state.phase === GPhase.PLAYING || state.phase === GPhase.PAUSED) && state.threatLevel > 0.3) {
      const edgeAlpha = (state.threatLevel - 0.3) * 0.12 + Math.sin(state.time * 3) * 0.03;
      const edgeW = 40 + state.threatLevel * 30;
      // Gradient edge glow
      for (let ei = 0; ei < 3; ei++) {
        const ew = edgeW - ei * 12;
        const ea = edgeAlpha * (1 - ei * 0.3);
        g.rect(0, 0, ew, sh).fill({ color: 0xff2222, alpha: ea });
        g.rect(sw - ew, 0, ew, sh).fill({ color: 0xff2222, alpha: ea });
        g.rect(0, 0, sw, ew).fill({ color: 0xff2222, alpha: ea * 0.7 });
        g.rect(0, sh - ew, sw, ew).fill({ color: 0xff2222, alpha: ea * 0.7 });
      }
    }

    this._drawFloatTexts(state);
    this._drawHUD(state);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);
  }

  private _drawArena(g: Graphics, state: GState): void {
    const cx = state.arenaCX, cy = state.arenaCY, r = state.arenaRadius, t = state.time;

    // Radial gradient floor — richer layering
    g.circle(cx, cy, r).fill({ color: G.COLOR_ARENA, alpha: 0.10 });
    g.circle(cx, cy, r * 0.8).fill({ color: 0x0a1830, alpha: 0.07 });
    g.circle(cx, cy, r * 0.55).fill({ color: 0x0c1a38, alpha: 0.05 });
    g.circle(cx, cy, r * 0.3).fill({ color: 0x0e1c40, alpha: 0.04 });

    // Grid overlay for depth — warps near player for gravity distortion
    const gridStep = 50;
    const gpx = state.playerX, gpy = state.playerY;
    for (let gx = cx - r; gx <= cx + r; gx += gridStep) {
      const dx2 = gx - cx, maxY = Math.sqrt(Math.max(0, r * r - dx2 * dx2));
      if (maxY <= 0) continue;
      // Draw grid line with warp near player
      const segs = 12;
      for (let si = 0; si < segs; si++) {
        const y1 = cy - maxY + (2 * maxY * si / segs);
        const y2 = cy - maxY + (2 * maxY * (si + 1) / segs);
        // Warp displacement
        const wdx1 = gx - gpx, wdy1 = y1 - gpy;
        const wd1 = Math.sqrt(wdx1 * wdx1 + wdy1 * wdy1) || 1;
        const warp1 = wd1 < 80 ? (80 - wd1) * 0.08 : 0;
        const wdx2 = gx - gpx, wdy2 = y2 - gpy;
        const wd2 = Math.sqrt(wdx2 * wdx2 + wdy2 * wdy2) || 1;
        const warp2 = wd2 < 80 ? (80 - wd2) * 0.08 : 0;
        g.moveTo(gx + (wdx1 / wd1) * warp1, y1 + (wdy1 / wd1) * warp1)
          .lineTo(gx + (wdx2 / wd2) * warp2, y2 + (wdy2 / wd2) * warp2)
          .stroke({ color: G.COLOR_ARENA, width: 0.4, alpha: 0.035 });
      }
    }
    for (let gy = cy - r; gy <= cy + r; gy += gridStep) {
      const dy2 = gy - cy, maxX = Math.sqrt(Math.max(0, r * r - dy2 * dy2));
      if (maxX <= 0) continue;
      const segs = 12;
      for (let si = 0; si < segs; si++) {
        const x1 = cx - maxX + (2 * maxX * si / segs);
        const x2 = cx - maxX + (2 * maxX * (si + 1) / segs);
        const wdx1 = x1 - gpx, wdy1 = gy - gpy;
        const wd1 = Math.sqrt(wdx1 * wdx1 + wdy1 * wdy1) || 1;
        const warp1 = wd1 < 80 ? (80 - wd1) * 0.08 : 0;
        const wdx2 = x2 - gpx, wdy2 = gy - gpy;
        const wd2 = Math.sqrt(wdx2 * wdx2 + wdy2 * wdy2) || 1;
        const warp2 = wd2 < 80 ? (80 - wd2) * 0.08 : 0;
        g.moveTo(x1 + (wdx1 / wd1) * warp1, gy + (wdy1 / wd1) * warp1)
          .lineTo(x2 + (wdx2 / wd2) * warp2, gy + (wdy2 / wd2) * warp2)
          .stroke({ color: G.COLOR_ARENA, width: 0.4, alpha: 0.035 });
      }
    }

    // Rotating rune symbols on arena floor
    for (let rn = 0; rn < 6; rn++) {
      const rnAngle = rn * Math.PI / 3 + t * 0.05;
      const rnDist = r * 0.5;
      const rnx = cx + Math.cos(rnAngle) * rnDist;
      const rny = cy + Math.sin(rnAngle) * rnDist;
      const rnRot = t * 0.2 + rn;
      const rnSize = 8;
      // Draw a small rotating glyph (triangle inscribed in circle)
      for (let rv = 0; rv < 3; rv++) {
        const a1 = rnRot + rv * Math.PI * 2 / 3;
        const a2 = rnRot + ((rv + 1) % 3) * Math.PI * 2 / 3;
        g.moveTo(rnx + Math.cos(a1) * rnSize, rny + Math.sin(a1) * rnSize)
          .lineTo(rnx + Math.cos(a2) * rnSize, rny + Math.sin(a2) * rnSize)
          .stroke({ color: G.COLOR_ARENA, width: 0.5, alpha: 0.04 + Math.sin(t * 0.5 + rn) * 0.02 });
      }
      g.circle(rnx, rny, rnSize * 0.3).fill({ color: G.COLOR_ARENA, alpha: 0.03 });
    }

    // Concentric energy rings (heartbeat-like) — more visible
    for (let ring = 1; ring <= 6; ring++) {
      const rr = r * ring / 6;
      const ra = 0.05 + Math.sin(t * 0.6 + ring) * 0.025;
      g.circle(cx, cy, rr).stroke({ color: G.COLOR_ARENA, width: 1, alpha: ra });
    }

    // Radial energy lines — more of them
    for (let v = 0; v < 12; v++) {
      const va = v * Math.PI / 6 + t * 0.04;
      const la = 0.04 + Math.sin(t * 0.5 + v * 1.5) * 0.015;
      g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * r * 0.9, cy + Math.sin(va) * r * 0.9).stroke({ color: G.COLOR_ARENA, width: 0.8, alpha: la });
    }

    // Outer glow layers — more dramatic
    g.circle(cx, cy, r + 25).fill({ color: G.COLOR_ARENA, alpha: 0.02 });
    g.circle(cx, cy, r + 15).fill({ color: G.COLOR_ARENA, alpha: 0.04 });
    g.circle(cx, cy, r + 8).fill({ color: G.COLOR_ARENA, alpha: 0.06 });

    // Animated border with threat-reactive color — brighter, more dynamic
    const borderColor = state.threatLevel > 0.4 ? lerpColor(G.COLOR_ARENA, G.COLOR_DANGER, (state.threatLevel - 0.4) * 1.5) : G.COLOR_ARENA;
    const segments = 24;
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2 + t * 0.25;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + t * 0.25;
      const pulse = 0.35 + Math.sin(t * 2.5 + i) * 0.15;
      g.setStrokeStyle({ width: 3, color: borderColor, alpha: pulse });
      g.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      for (let s = 1; s <= 5; s++) { const a = a1 + (a2 - a1) * (s / 5); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.stroke();
    }
    // Soft outer border glow
    g.circle(cx, cy, r).stroke({ color: borderColor, width: 1, alpha: 0.12 + Math.sin(t * 1.5) * 0.04 });

    // Energy discharge sparks at boundary — more sparks, brighter
    for (let s = 0; s < 8; s++) {
      const sa = t * 0.8 + s * Math.PI / 4;
      const sparkR = r + 5 + Math.sin(t * 4 + s * 2) * 4;
      const sx = cx + Math.cos(sa) * sparkR, sy = cy + Math.sin(sa) * sparkR;
      g.circle(sx, sy, 3).fill({ color: borderColor, alpha: 0.08 });
      g.circle(sx, sy, 1.8).fill({ color: borderColor, alpha: 0.3 + Math.sin(t * 6 + s) * 0.15 });
    }

    // Center marker
    g.setStrokeStyle({ width: 1, color: G.COLOR_ARENA, alpha: 0.04 });
    g.moveTo(cx - 12, cy).lineTo(cx + 12, cy).stroke();
    g.moveTo(cx, cy - 12).lineTo(cx, cy + 12).stroke();
  }

  private _drawPullField(g: Graphics, state: GState): void {
    if (!state.pulling) return;
    const px = state.playerX, py = state.playerY, r = state.pullRadius, t = state.time;

    // Outer field glow (large, soft) — brighter, more layers
    g.circle(px, py, r * 1.15).fill({ color: G.COLOR_PULL, alpha: 0.03 });
    g.circle(px, py, r * 1.05).fill({ color: G.COLOR_PULL, alpha: 0.06 });
    g.circle(px, py, r * 0.85).fill({ color: G.COLOR_PULL, alpha: 0.08 });
    g.circle(px, py, r * 0.5).fill({ color: G.COLOR_PULL, alpha: 0.05 });

    // Converging rings (move inward to show pull direction) — more rings, brighter
    for (let ring = 0; ring < 8; ring++) {
      const phase = (t * 3 + ring * 0.25) % 1;
      const rr = r * (1 - phase);
      const alpha = (1 - phase) * 0.20;
      g.circle(rr > 3 ? px : px, py, Math.max(2, rr)).stroke({ color: G.COLOR_PULL, width: 1.8, alpha });
    }

    // Radial tendrils — more, with curves
    for (let i = 0; i < 12; i++) {
      const ta = t * 0.5 + i * Math.PI / 6;
      const outerR = r * 0.92;
      const innerR = r * 0.2;
      const tendrilAlpha = 0.10 + Math.sin(t * 3 + i * 2) * 0.05;
      g.setStrokeStyle({ width: 1.2, color: G.COLOR_PULL, alpha: tendrilAlpha });
      g.moveTo(px + Math.cos(ta) * outerR, py + Math.sin(ta) * outerR)
        .lineTo(px + Math.cos(ta + 0.2) * innerR, py + Math.sin(ta + 0.2) * innerR).stroke();
    }

    // Gravity distortion sparkles at pull edge
    for (let sp = 0; sp < 6; sp++) {
      const sa = t * 2 + sp * Math.PI / 3;
      const sr = r * (0.85 + Math.sin(t * 4 + sp * 3) * 0.1);
      g.circle(px + Math.cos(sa) * sr, py + Math.sin(sa) * sr, 1.5)
        .fill({ color: G.COLOR_PULL, alpha: 0.25 + Math.sin(t * 8 + sp) * 0.1 });
    }

    // Boundary pulse ring — double ring
    const boundPulse = 0.15 + Math.sin(t * 5) * 0.08;
    g.circle(px, py, r).stroke({ color: G.COLOR_PULL, width: 2.5, alpha: boundPulse });
    g.circle(px, py, r + 4).stroke({ color: G.COLOR_PULL, width: 1, alpha: boundPulse * 0.4 });
  }

  private _drawBodies(g: Graphics, state: GState): void {
    const t = state.time;
    for (const b of state.bodies) {
      if (b.kind === "bomb") {
        const bombPulse = b.orbiting && b.fuseTimer > 0
          ? 0.15 + Math.sin(t * (10 + (1 - b.fuseTimer / G.BOMB_FUSE_DURATION) * 20)) * 0.12
          : 0.1 + Math.sin(t * 6) * 0.06;

        // Danger glow layers — more dramatic
        g.circle(b.x, b.y, b.radius * 3.5).fill({ color: G.COLOR_BOMB, alpha: bombPulse * 0.2 });
        g.circle(b.x, b.y, b.radius * 2.5).fill({ color: G.COLOR_BOMB, alpha: bombPulse * 0.45 });
        g.circle(b.x, b.y, b.radius * 1.8).fill({ color: G.COLOR_BOMB, alpha: bombPulse * 0.7 });
        // Danger sparks flying off
        for (let ds = 0; ds < 4; ds++) {
          const dsa = t * 5 + ds * Math.PI / 2;
          const dsr = b.radius * (1.5 + Math.sin(t * 8 + ds * 3) * 0.5);
          g.circle(b.x + Math.cos(dsa) * dsr, b.y + Math.sin(dsa) * dsr, 1.2)
            .fill({ color: 0xffaa22, alpha: bombPulse });
        }

        // Angular spiked body — star shape with spikes
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
        // Gold: rich glow + sparkle + faceted shape — treasure-like
        g.circle(b.x, b.y, b.radius * 3).fill({ color: G.COLOR_GOLD, alpha: 0.04 + Math.sin(t * 4) * 0.02 });
        g.circle(b.x, b.y, b.radius * 2.2).fill({ color: G.COLOR_GOLD, alpha: 0.08 + Math.sin(t * 4) * 0.03 });
        g.circle(b.x, b.y, b.radius * 1.4).fill({ color: G.COLOR_GOLD, alpha: 0.14 });
        // Irregular polygon body for gem-like look
        const goldSides = 7, goldRot = t * 0.5;
        g.moveTo(b.x + Math.cos(goldRot) * b.radius, b.y + Math.sin(goldRot) * b.radius);
        for (let gv = 1; gv <= goldSides; gv++) {
          const ga2 = goldRot + (gv / goldSides) * Math.PI * 2;
          const wobR = b.radius * (0.9 + ((gv * 37) % 7) * 0.02);
          g.lineTo(b.x + Math.cos(ga2) * wobR, b.y + Math.sin(ga2) * wobR);
        }
        g.closePath().fill({ color: G.COLOR_GOLD, alpha: 0.9 });
        // Facet highlights — multiple facets
        g.circle(b.x - b.radius * 0.25, b.y - b.radius * 0.25, b.radius * 0.4).fill({ color: 0xffffff, alpha: 0.25 });
        g.circle(b.x + b.radius * 0.2, b.y - b.radius * 0.1, b.radius * 0.2).fill({ color: 0xffeeaa, alpha: 0.2 });
        g.circle(b.x + b.radius * 0.3, b.y + b.radius * 0.2, b.radius * 0.25).fill({ color: 0xaa8800, alpha: 0.3 });
        // Inner dark facet
        g.circle(b.x + b.radius * 0.1, b.y + b.radius * 0.15, b.radius * 0.15).fill({ color: 0x886600, alpha: 0.2 });
        // Edge rim
        g.circle(b.x, b.y, b.radius).stroke({ color: 0xffcc44, width: 1, alpha: 0.3 });
        // Multiple orbiting sparkles
        for (let gs = 0; gs < 3; gs++) {
          const ga = t * (3 + gs) + b.x * 0.1 + gs * 2.1;
          const gr = b.radius * (1.2 + gs * 0.2);
          g.circle(b.x + Math.cos(ga) * gr, b.y + Math.sin(ga) * gr, 1.5 - gs * 0.3)
            .fill({ color: 0xffffff, alpha: 0.45 - gs * 0.1 });
        }
      } else {
        // Regular asteroid: cratered surface detail
        const rColor = b.flung ? G.COLOR_FLUNG : G.COLOR_ASTEROID;
        if (b.flung) {
          // Flung: bright with extended trail
          g.circle(b.x, b.y, b.radius * 2).fill({ color: G.COLOR_FLUNG, alpha: 0.08 });
          g.circle(b.x, b.y, b.radius * 1.3).fill({ color: G.COLOR_FLUNG, alpha: 0.15 });
          g.circle(b.x, b.y, b.radius).fill({ color: G.COLOR_FLUNG, alpha: 0.85 });
          g.circle(b.x, b.y, b.radius * 0.4).fill({ color: 0xffffff, alpha: 0.25 });
          // Motion trail — longer with energy streaks
          const vLen = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (vLen > 0) {
            const ndx = -b.vx / vLen, ndy = -b.vy / vLen;
            // Soft glow trail
            g.moveTo(b.x, b.y).lineTo(b.x + ndx * b.radius * 6, b.y + ndy * b.radius * 6)
              .stroke({ color: G.COLOR_FLUNG, width: b.radius * 1.2, alpha: 0.06 });
            g.moveTo(b.x, b.y).lineTo(b.x + ndx * b.radius * 4, b.y + ndy * b.radius * 4)
              .stroke({ color: G.COLOR_FLUNG, width: b.radius * 0.7, alpha: 0.12 });
            // Fading copies
            for (let tr = 1; tr <= 4; tr++) {
              g.circle(b.x + ndx * b.radius * tr * 1.5, b.y + ndy * b.radius * tr * 1.5, b.radius * (1 - tr * 0.18))
                .fill({ color: G.COLOR_FLUNG, alpha: 0.15 - tr * 0.03 });
            }
            // Side energy streaks
            const perpX2 = -ndy, perpY2 = ndx;
            for (const side of [-1, 1]) {
              g.moveTo(b.x + perpX2 * b.radius * 0.3 * side, b.y + perpY2 * b.radius * 0.3 * side)
                .lineTo(b.x + ndx * b.radius * 3 + perpX2 * b.radius * 0.8 * side, b.y + ndy * b.radius * 3 + perpY2 * b.radius * 0.8 * side)
                .stroke({ color: G.COLOR_FLUNG, width: 0.8, alpha: 0.08 });
            }
          }
        } else {
          // Drifting asteroid — rocky irregular polygon shape
          const seed = Math.floor(b.x * 7 + b.y * 13);
          const aSides = 8;
          const aRot = seed * 0.3;
          g.circle(b.x, b.y, b.radius * 1.4).fill({ color: rColor, alpha: 0.05 }); // subtle glow
          g.moveTo(b.x + Math.cos(aRot) * b.radius, b.y + Math.sin(aRot) * b.radius);
          for (let av = 1; av <= aSides; av++) {
            const aa = aRot + (av / aSides) * Math.PI * 2;
            const wobR = b.radius * (0.8 + ((seed + av * 17) % 5) * 0.06);
            g.lineTo(b.x + Math.cos(aa) * wobR, b.y + Math.sin(aa) * wobR);
          }
          g.closePath().fill({ color: rColor, alpha: 0.85 });
          // Multiple craters
          g.circle(b.x + (seed % 3 - 1) * b.radius * 0.3, b.y + (seed % 5 - 2) * b.radius * 0.2, b.radius * 0.25)
            .fill({ color: 0x444455, alpha: 0.3 });
          g.circle(b.x - (seed % 4 - 2) * b.radius * 0.2, b.y + (seed % 7 - 3) * b.radius * 0.15, b.radius * 0.15)
            .fill({ color: 0x3a3a4a, alpha: 0.25 });
          // Edge highlight (light source from top-left)
          g.circle(b.x - b.radius * 0.2, b.y - b.radius * 0.25, b.radius * 0.35)
            .fill({ color: 0xbbbbcc, alpha: 0.18 });
          // Shadow on bottom-right
          g.circle(b.x + b.radius * 0.15, b.y + b.radius * 0.2, b.radius * 0.3)
            .fill({ color: 0x222233, alpha: 0.15 });
          // Rim stroke
          g.circle(b.x, b.y, b.radius).stroke({ color: 0x666677, width: 0.5, alpha: 0.2 });
        }
      }
      // Orbit indicator — glowing ring + energy tether to player
      if (b.orbiting) {
        g.circle(b.x, b.y, b.radius * 1.6).fill({ color: G.COLOR_PLAYER, alpha: 0.04 });
        g.circle(b.x, b.y, b.radius * 1.3).stroke({ color: G.COLOR_PLAYER, width: 1, alpha: 0.2 });
        // Energy tether line to player (faint)
        g.moveTo(b.x, b.y).lineTo(state.playerX, state.playerY)
          .stroke({ color: G.COLOR_PLAYER, width: 0.5, alpha: 0.04 });
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

      // Windup telegraph — dramatic with expanding rings + danger line
      if (e.state === "windup") {
        const wPulse = 0.25 + Math.sin(t * 20) * 0.18;
        // Expanding warning rings
        for (let wr = 0; wr < 3; wr++) {
          const wrPhase = (t * 4 + wr * 0.33) % 1;
          const wrR = e.radius * (1 + wrPhase * 2.5);
          g.circle(e.x, e.y, wrR).stroke({ color: 0xff4444, width: 1.5, alpha: (1 - wrPhase) * wPulse * 0.5 });
        }
        g.circle(e.x, e.y, e.radius * 3).fill({ color: 0xff4444, alpha: wPulse * 0.5 });
        g.circle(e.x, e.y, e.radius * 2).fill({ color: 0xff4444, alpha: wPulse });
        // Aim line toward player — dashed with danger markers
        for (let dl = 0; dl < 4; dl++) {
          const dlStart = e.radius * (1 + dl * 1.2);
          const dlEnd = e.radius * (1.8 + dl * 1.2);
          g.moveTo(e.x + nx * dlStart, e.y + ny * dlStart)
            .lineTo(e.x + nx * dlEnd, e.y + ny * dlEnd)
            .stroke({ width: 2, color: 0xff4444, alpha: wPulse * (1 - dl * 0.2) });
        }
        // Danger exclamation at tip
        g.circle(e.x + nx * e.radius * 5, e.y + ny * e.radius * 5, 3)
          .fill({ color: 0xff4444, alpha: wPulse });
      }

      if (e.kind === "scout") {
        // Scout: pointed triangle with engine glow
        const color = flash ? 0xffffff : G.COLOR_ENEMY_SCOUT;
        g.circle(e.x, e.y, e.radius * 2.2).fill({ color, alpha: 0.04 });
        g.circle(e.x, e.y, e.radius * 1.6).fill({ color, alpha: 0.09 });
        g.moveTo(e.x + nx * e.radius, e.y + ny * e.radius)
          .lineTo(e.x + px * e.radius * 0.5, e.y + py * e.radius * 0.5)
          .lineTo(e.x - nx * e.radius * 0.6, e.y - ny * e.radius * 0.6)
          .lineTo(e.x - px * e.radius * 0.5, e.y - py * e.radius * 0.5)
          .closePath().fill({ color, alpha: 0.85 });
        // Cockpit eye — menacing red dot
        g.circle(e.x + nx * e.radius * 0.35, e.y + ny * e.radius * 0.35, e.radius * 0.18)
          .fill({ color: 0xff2222, alpha: 0.7 + Math.sin(t * 8 + e.x) * 0.2 });
        g.circle(e.x + nx * e.radius * 0.35, e.y + ny * e.radius * 0.35, e.radius * 0.35)
          .fill({ color: 0xff2222, alpha: 0.12 });
        // Interior highlight
        g.circle(e.x + nx * e.radius * 0.1, e.y + ny * e.radius * 0.1, e.radius * 0.25)
          .fill({ color: 0xffffff, alpha: 0.1 });
        // Engine glow at rear — with exhaust flame
        g.circle(e.x - nx * e.radius * 0.5, e.y - ny * e.radius * 0.5, e.radius * 0.35)
          .fill({ color: 0xff6622, alpha: 0.25 });
        g.circle(e.x - nx * e.radius * 0.5, e.y - ny * e.radius * 0.5, e.radius * 0.2)
          .fill({ color: 0xff8844, alpha: 0.5 });
        g.circle(e.x - nx * e.radius * 0.5, e.y - ny * e.radius * 0.5, e.radius * 0.1)
          .fill({ color: 0xffcc88, alpha: 0.6 });
        // Exhaust trail
        g.moveTo(e.x - nx * e.radius * 0.5, e.y - ny * e.radius * 0.5)
          .lineTo(e.x - nx * e.radius * 1.8, e.y - ny * e.radius * 1.8)
          .stroke({ color: 0xff6622, width: e.radius * 0.3, alpha: 0.08 });
        // Charge trail — with afterimage
        if (e.state === "charge") {
          g.moveTo(e.x, e.y).lineTo(e.x - nx * e.radius * 5, e.y - ny * e.radius * 5)
            .stroke({ width: e.radius * 0.8, color, alpha: 0.08 });
          g.moveTo(e.x, e.y).lineTo(e.x - nx * e.radius * 3, e.y - ny * e.radius * 3)
            .stroke({ width: e.radius * 0.5, color, alpha: 0.2 });
          // Afterimage copies
          for (let ai = 1; ai <= 2; ai++) {
            g.circle(e.x - nx * e.radius * ai * 1.5, e.y - ny * e.radius * ai * 1.5, e.radius * (0.7 - ai * 0.15))
              .fill({ color, alpha: 0.08 });
          }
        }
      } else if (e.kind === "fighter") {
        // Fighter: diamond/star shape (orange)
        const color = flash ? 0xffffff : 0xff8844; // orange instead of dark red
        g.circle(e.x, e.y, e.radius * 2.2).fill({ color, alpha: 0.04 });
        g.circle(e.x, e.y, e.radius * 1.6).fill({ color, alpha: 0.08 });
        // Diamond shape
        g.moveTo(e.x + nx * e.radius, e.y + ny * e.radius) // front
          .lineTo(e.x + px * e.radius * 0.7, e.y + py * e.radius * 0.7) // right
          .lineTo(e.x - nx * e.radius * 0.8, e.y - ny * e.radius * 0.8) // back
          .lineTo(e.x - px * e.radius * 0.7, e.y - py * e.radius * 0.7) // left
          .closePath().fill({ color, alpha: 0.85 });
        // Inner core glow with pulsing eye
        g.circle(e.x, e.y, e.radius * 0.35).fill({ color: 0xffffff, alpha: 0.12 });
        g.circle(e.x + nx * e.radius * 0.2, e.y + ny * e.radius * 0.2, e.radius * 0.22)
          .fill({ color: 0xff6622, alpha: 0.6 + Math.sin(t * 6 + e.y) * 0.2 });
        g.circle(e.x + nx * e.radius * 0.2, e.y + ny * e.radius * 0.2, e.radius * 0.4)
          .fill({ color: 0xff6622, alpha: 0.1 });
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
        // Dash glow — with energy burst
        if (e.state === "dash") {
          g.circle(e.x, e.y, e.radius * 3).fill({ color, alpha: 0.06 });
          g.circle(e.x, e.y, e.radius * 2).fill({ color, alpha: 0.15 });
          // Speed lines
          const dvLen = Math.sqrt(dx * dx + dy * dy) || 1;
          const dnx2 = dx / dvLen, dny2 = dy / dvLen;
          for (const dside of [-1, 1]) {
            g.moveTo(e.x - dny2 * e.radius * 0.5 * dside, e.y + dnx2 * e.radius * 0.5 * dside)
              .lineTo(e.x - dnx2 * e.radius * 2.5 - dny2 * e.radius * 0.8 * dside,
                      e.y - dny2 * e.radius * 2.5 + dnx2 * e.radius * 0.8 * dside)
              .stroke({ color, width: 0.8, alpha: 0.12 });
          }
        }
      } else if (e.kind === "splitter") {
        // Splitter: green diamond shape with inner fracture lines
        const color = flash ? 0xffffff : G.COLOR_ENEMY_SPLITTER;
        g.circle(e.x, e.y, e.radius * 2.2).fill({ color, alpha: 0.04 });
        g.circle(e.x, e.y, e.radius * 1.6).fill({ color, alpha: 0.08 });
        // Diamond shape (rotated square)
        const sr = e.radius;
        g.moveTo(e.x, e.y - sr)
          .lineTo(e.x + sr, e.y)
          .lineTo(e.x, e.y + sr)
          .lineTo(e.x - sr, e.y)
          .closePath().fill({ color, alpha: 0.85 });
        // Inner fracture lines
        g.moveTo(e.x, e.y - sr * 0.6).lineTo(e.x + sr * 0.3, e.y + sr * 0.2)
          .stroke({ color: 0x225522, width: 1.2, alpha: 0.6 });
        g.moveTo(e.x, e.y - sr * 0.6).lineTo(e.x - sr * 0.3, e.y + sr * 0.3)
          .stroke({ color: 0x225522, width: 1.2, alpha: 0.6 });
        g.moveTo(e.x - sr * 0.2, e.y).lineTo(e.x + sr * 0.2, e.y + sr * 0.4)
          .stroke({ color: 0x225522, width: 1, alpha: 0.4 });
        // Pulsing core
        const splitPulse = 0.5 + Math.sin(t * 5 + e.x) * 0.3;
        g.circle(e.x, e.y, e.radius * 0.25).fill({ color: 0x88ff88, alpha: splitPulse });
      } else if (e.kind === "phaser") {
        // Phaser: cyan flickering triangle that fades in/out
        const flickerAlpha = 0.4 + Math.sin(t * 12 + e.y * 0.3) * 0.35 + Math.sin(t * 7.3 + e.x * 0.2) * 0.15;
        const color = flash ? 0xffffff : G.COLOR_ENEMY_PHASER;
        // Outer glow (flickers)
        g.circle(e.x, e.y, e.radius * 2.5).fill({ color, alpha: 0.03 * flickerAlpha });
        g.circle(e.x, e.y, e.radius * 1.8).fill({ color, alpha: 0.06 * flickerAlpha });
        // Triangle pointing toward player
        const pr2 = e.radius;
        g.moveTo(e.x + nx * pr2 * 1.1, e.y + ny * pr2 * 1.1) // tip toward player
          .lineTo(e.x + px * pr2 * 0.7 - nx * pr2 * 0.7, e.y + py * pr2 * 0.7 - ny * pr2 * 0.7)
          .lineTo(e.x - px * pr2 * 0.7 - nx * pr2 * 0.7, e.y - py * pr2 * 0.7 - ny * pr2 * 0.7)
          .closePath().fill({ color, alpha: 0.8 * flickerAlpha });
        // Inner glow
        g.circle(e.x, e.y, e.radius * 0.3).fill({ color: 0xffffff, alpha: 0.3 * flickerAlpha });
        // Teleport after-image rings
        if (e.state === "charge") {
          for (let ri = 0; ri < 2; ri++) {
            const ringPhase = (t * 3 + ri * 0.5) % 1;
            g.circle(e.x, e.y, e.radius * (1 + ringPhase * 2))
              .stroke({ color, width: 1, alpha: (1 - ringPhase) * 0.3 });
          }
        }
      } else if (e.kind === "mini") {
        // Mini-scout: small red dot with faint glow
        const color = flash ? 0xffffff : G.COLOR_ENEMY_MINI;
        g.circle(e.x, e.y, e.radius * 1.8).fill({ color, alpha: 0.05 });
        g.circle(e.x, e.y, e.radius).fill({ color, alpha: 0.85 });
        g.circle(e.x, e.y, e.radius * 0.5).fill({ color: 0xffffff, alpha: 0.3 });
      } else {
        // Tank: hexagonal chunky shape (purple/magenta)
        const color = flash ? 0xffffff : 0xaa44aa; // purple instead of maroon
        g.circle(e.x, e.y, e.radius * 2.8).fill({ color, alpha: 0.03 });
        g.circle(e.x, e.y, e.radius * 2).fill({ color, alpha: 0.07 });
        // Hexagon
        const sides = 6, rot = t * 0.3;
        g.moveTo(e.x + Math.cos(rot) * e.radius, e.y + Math.sin(rot) * e.radius);
        for (let v = 1; v <= sides; v++) {
          const va = rot + (v / sides) * Math.PI * 2;
          g.lineTo(e.x + Math.cos(va) * e.radius, e.y + Math.sin(va) * e.radius);
        }
        g.closePath().fill({ color, alpha: 0.85 });
        // Inner hex with glowing core
        g.moveTo(e.x + Math.cos(rot) * e.radius * 0.6, e.y + Math.sin(rot) * e.radius * 0.6);
        for (let v = 1; v <= sides; v++) {
          const va = rot + (v / sides) * Math.PI * 2;
          g.lineTo(e.x + Math.cos(va) * e.radius * 0.6, e.y + Math.sin(va) * e.radius * 0.6);
        }
        g.closePath().fill({ color: 0x220033, alpha: 0.3 });
        // Pulsing core eye
        const tankPulse = 0.5 + Math.sin(t * 3 + e.x * 0.1) * 0.3;
        g.circle(e.x, e.y, e.radius * 0.3).fill({ color: 0xee44ee, alpha: tankPulse });
        g.circle(e.x, e.y, e.radius * 0.15).fill({ color: 0xffffff, alpha: tankPulse * 0.5 });
        g.circle(e.x, e.y, e.radius * 0.5).fill({ color: 0xee44ee, alpha: tankPulse * 0.1 });
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
        const eColor = e.kind === "scout" ? G.COLOR_ENEMY_SCOUT : e.kind === "fighter" ? 0xff8844
          : e.kind === "splitter" ? G.COLOR_ENEMY_SPLITTER : e.kind === "phaser" ? G.COLOR_ENEMY_PHASER
          : e.kind === "mini" ? G.COLOR_ENEMY_MINI : 0xaa44aa;
        g.roundRect(e.x - barW / 2 - 1, e.y - e.radius - 7, barW + 2, barH + 2, 1).fill({ color: 0x000000, alpha: 0.4 });
        g.rect(e.x - barW / 2, e.y - e.radius - 6, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
        g.rect(e.x - barW / 2, e.y - e.radius - 6, barW * (e.hp / e.maxHp), barH).fill({ color: eColor, alpha: 0.7 });
      }
    }
  }

  private _drawPowerups(g: Graphics, state: GState): void {
    const t = state.time;
    for (const p of state.powerups) {
      const fadeAlpha = Math.min(1, p.life / 2); // fade out in last 2 seconds
      const spin = t * 3;
      const bob = Math.sin(t * 4 + p.x * 0.1) * 3;
      const py = p.y + bob;

      if (p.kind === "shield") {
        // Cyan diamond
        const color = G.COLOR_POWERUP_SHIELD;
        const sz = 7;
        // Glow
        g.circle(p.x, py, sz * 3).fill({ color, alpha: 0.06 * fadeAlpha });
        g.circle(p.x, py, sz * 2).fill({ color, alpha: 0.12 * fadeAlpha });
        // Diamond shape (rotated square)
        g.moveTo(p.x, py - sz).lineTo(p.x + sz, py).lineTo(p.x, py + sz).lineTo(p.x - sz, py)
          .closePath().fill({ color, alpha: 0.85 * fadeAlpha });
        // Inner highlight
        g.circle(p.x, py, sz * 0.4).fill({ color: 0xffffff, alpha: 0.4 * fadeAlpha });
        // Spinning ring
        g.circle(p.x, py, sz + 3).stroke({ color, width: 1, alpha: (0.3 + Math.sin(t * 6) * 0.15) * fadeAlpha });
      } else if (p.kind === "magnet") {
        // Purple circle
        const color = G.COLOR_POWERUP_MAGNET;
        const sz = 6;
        // Glow
        g.circle(p.x, py, sz * 3).fill({ color, alpha: 0.06 * fadeAlpha });
        g.circle(p.x, py, sz * 2).fill({ color, alpha: 0.12 * fadeAlpha });
        // Circle body
        g.circle(p.x, py, sz).fill({ color, alpha: 0.85 * fadeAlpha });
        // Inner core
        g.circle(p.x, py, sz * 0.5).fill({ color: 0xffffff, alpha: 0.3 * fadeAlpha });
        // Orbiting sparkles
        for (let s = 0; s < 3; s++) {
          const sa = spin + s * Math.PI * 2 / 3;
          const sr = sz + 4;
          g.circle(p.x + Math.cos(sa) * sr, py + Math.sin(sa) * sr, 1.5)
            .fill({ color, alpha: 0.5 * fadeAlpha });
        }
      } else {
        // Orange triangle (rapid)
        const color = G.COLOR_POWERUP_RAPID;
        const sz = 7;
        // Glow
        g.circle(p.x, py, sz * 3).fill({ color, alpha: 0.06 * fadeAlpha });
        g.circle(p.x, py, sz * 2).fill({ color, alpha: 0.12 * fadeAlpha });
        // Triangle pointing up with spin
        const a0 = -Math.PI / 2 + spin * 0.3;
        g.moveTo(p.x + Math.cos(a0) * sz, py + Math.sin(a0) * sz)
          .lineTo(p.x + Math.cos(a0 + Math.PI * 2 / 3) * sz, py + Math.sin(a0 + Math.PI * 2 / 3) * sz)
          .lineTo(p.x + Math.cos(a0 + Math.PI * 4 / 3) * sz, py + Math.sin(a0 + Math.PI * 4 / 3) * sz)
          .closePath().fill({ color, alpha: 0.85 * fadeAlpha });
        // Inner highlight
        g.circle(p.x, py, sz * 0.35).fill({ color: 0xffffff, alpha: 0.35 * fadeAlpha });
      }
    }
  }

  private _drawActiveEffects(g: Graphics, state: GState): void {
    const px = state.playerX, py = state.playerY, t = state.time;
    let iconIndex = 0;

    const drawIcon = (color: number, remaining: number, duration: number, kind: "shield" | "magnet" | "rapid") => {
      const angle = -Math.PI / 2 + iconIndex * Math.PI * 0.3 + Math.PI * 0.8;
      const dist = state.playerRadius + 22;
      const ix = px + Math.cos(angle) * dist;
      const iy = py + Math.sin(angle) * dist;
      const pulse = 0.6 + Math.sin(t * 5 + iconIndex) * 0.3;
      const sz = 4;

      // Glow
      g.circle(ix, iy, sz * 2.5).fill({ color, alpha: 0.08 * pulse });
      g.circle(ix, iy, sz * 1.5).fill({ color, alpha: 0.15 * pulse });

      if (kind === "shield") {
        // Small diamond
        g.moveTo(ix, iy - sz).lineTo(ix + sz * 0.7, iy).lineTo(ix, iy + sz).lineTo(ix - sz * 0.7, iy)
          .closePath().fill({ color, alpha: 0.8 * pulse });
      } else if (kind === "magnet") {
        // Small circle
        g.circle(ix, iy, sz * 0.7).fill({ color, alpha: 0.8 * pulse });
      } else {
        // Small triangle
        g.moveTo(ix, iy - sz).lineTo(ix + sz * 0.7, iy + sz * 0.5).lineTo(ix - sz * 0.7, iy + sz * 0.5)
          .closePath().fill({ color, alpha: 0.8 * pulse });
      }

      // Timer arc
      const ratio = remaining / duration;
      const arcEnd = ratio * Math.PI * 2;
      if (arcEnd > 0.05) {
        g.setStrokeStyle({ width: 1.2, color, alpha: 0.5 * pulse });
        g.moveTo(ix + Math.cos(-Math.PI / 2) * (sz + 2), iy + Math.sin(-Math.PI / 2) * (sz + 2));
        const steps = Math.max(3, Math.floor(arcEnd * 4));
        for (let s = 1; s <= steps; s++) {
          const a = -Math.PI / 2 + arcEnd * (s / steps);
          g.lineTo(ix + Math.cos(a) * (sz + 2), iy + Math.sin(a) * (sz + 2));
        }
        g.stroke();
      }

      iconIndex++;
    };

    if (state.activeEffects.shield > 0) {
      drawIcon(G.COLOR_POWERUP_SHIELD, state.activeEffects.shield, G.SHIELD_DURATION, "shield");
      // Shield aura around player
      const shieldPulse = 0.08 + Math.sin(t * 4) * 0.04;
      g.circle(px, py, state.playerRadius + 5).stroke({ color: G.COLOR_POWERUP_SHIELD, width: 1.5, alpha: shieldPulse });
    }
    if (state.activeEffects.magnet > 0) {
      drawIcon(G.COLOR_POWERUP_MAGNET, state.activeEffects.magnet, G.MAGNET_DURATION, "magnet");
    }
    if (state.activeEffects.rapid > 0) {
      drawIcon(G.COLOR_POWERUP_RAPID, state.activeEffects.rapid, G.RAPID_DURATION, "rapid");
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
    // Player glow — gravity vortex feel with pulsing
    const vortexPulse = 0.5 + Math.sin(t * 2) * 0.15;
    g.circle(px, py, pr * 5).fill({ color: G.COLOR_PLAYER, alpha: 0.02 * vortexPulse });
    g.circle(px, py, pr * 4).fill({ color: G.COLOR_PLAYER, alpha: 0.035 * vortexPulse });
    g.circle(px, py, pr * 2.8).fill({ color: G.COLOR_PLAYER, alpha: 0.06 * vortexPulse });
    g.circle(px, py, pr * 1.8).fill({ color: G.COLOR_PLAYER, alpha: 0.10 * vortexPulse });

    // Rotating gravitational field lines — more lines, spiral arcs
    for (let fl = 0; fl < 6; fl++) {
      const fa = t * 1.5 + fl * Math.PI / 3;
      const spiralR1 = pr * 3;
      const spiralR2 = pr * 1.2;
      const lineAlpha = 0.06 + Math.sin(t * 2 + fl * 1.5) * 0.03;
      g.setStrokeStyle({ width: 1.2, color: G.COLOR_PLAYER, alpha: lineAlpha });
      // Draw curved spiral with multiple segments
      const segs = 6;
      g.moveTo(px + Math.cos(fa) * spiralR1, py + Math.sin(fa) * spiralR1);
      for (let s = 1; s <= segs; s++) {
        const frac = s / segs;
        const segR = spiralR1 + (spiralR2 - spiralR1) * frac;
        const segA = fa + frac * 0.8;
        g.lineTo(px + Math.cos(segA) * segR, py + Math.sin(segA) * segR);
      }
      g.stroke();
    }

    // Gravity distortion rings (ripple outward)
    for (let rip = 0; rip < 3; rip++) {
      const ripPhase = (t * 0.8 + rip * 0.33) % 1;
      const ripR = pr * 1.5 + ripPhase * pr * 3;
      const ripAlpha = (1 - ripPhase) * 0.06;
      g.circle(px, py, ripR).stroke({ color: G.COLOR_PLAYER, width: 0.8, alpha: ripAlpha });
    }

    // Body — gravity singularity with depth
    g.circle(px, py, pr * 1.3).fill({ color: 0x0a1a44, alpha: 0.4 });
    g.circle(px, py, pr * 1.1).fill({ color: 0x1a3366, alpha: 0.6 });
    g.circle(px, py, pr).fill(G.COLOR_PLAYER);
    g.circle(px, py, pr * 0.7).fill({ color: G.COLOR_PLAYER_CORE, alpha: 0.7 });
    // Core bright point — pulsing
    g.circle(px, py, pr * 0.35).fill({ color: 0xffffff, alpha: 0.3 + Math.sin(t * 4) * 0.1 });
    g.circle(px, py, pr * 0.15).fill({ color: 0xffffff, alpha: 0.6 });
    // Highlight
    g.circle(px - pr * 0.2, py - pr * 0.25, pr * 0.3).fill({ color: 0xffffff, alpha: 0.18 });
    // HP indicator — bigger with glow
    for (let h = 0; h < state.maxHp; h++) {
      const ha = (h / state.maxHp) * Math.PI * 2 - Math.PI / 2 + t * 0.15;
      const hx = px + Math.cos(ha) * (pr + 8);
      const hy = py + Math.sin(ha) * (pr + 8);
      const hFilled = h < state.hp;
      if (hFilled) {
        g.circle(hx, hy, 4).fill({ color: G.COLOR_PLAYER, alpha: 0.12 });
        g.circle(hx, hy, 2.5).fill({ color: G.COLOR_PLAYER, alpha: 0.8 });
        g.circle(hx, hy, 1).fill({ color: 0xffffff, alpha: 0.4 });
      } else {
        g.circle(hx, hy, 2.5).fill({ color: 0x333344, alpha: 0.4 });
        g.circle(hx, hy, 2.5).stroke({ color: 0x444455, width: 0.5, alpha: 0.3 });
      }
    }
    // Low HP warning ring
    if (state.hp <= 2 && state.hp > 0) {
      const warnPulse = 0.06 + Math.sin(t * 6) * 0.04;
      g.circle(px, py, pr + 12).stroke({ color: G.COLOR_DANGER, width: 1.5, alpha: warnPulse });
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
      // Motion trail — longer, more visible
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 8) {
        const ndx = -p.vx / spd, ndy = -p.vy / spd;
        g.setStrokeStyle({ width: sz * 0.7, color: p.color, alpha: a * 0.15 });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * sz * 3, p.y + ndy * sz * 3).stroke();
        g.setStrokeStyle({ width: sz * 0.3, color: p.color, alpha: a * 0.06 });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * sz * 5, p.y + ndy * sz * 5).stroke();
      }
      // Outer glow — bigger, softer
      g.circle(p.x, p.y, sz * 2.2).fill({ color: p.color, alpha: a * 0.06 });
      g.circle(p.x, p.y, sz * 1.5).fill({ color: p.color, alpha: a * 0.12 });
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

    // Combo display (top-right) — dramatic with scaling
    if (state.comboCount >= 2) {
      const comboAlpha = 0.7 + Math.sin(state.time * 8) * 0.25;
      const comboColor = state.comboCount >= 8 ? 0xff44ff : state.comboCount >= 5 ? 0xffd700 : state.comboCount >= 3 ? 0xffdd44 : 0x44ff44;
      const cw = 90 + Math.min(state.comboCount, 10) * 4;
      const cx2 = this._sw - cw - 10;
      // Background with glow
      ug.roundRect(cx2 - 3, 29, cw + 6, 24, 6).fill({ color: comboColor, alpha: comboAlpha * 0.05 });
      ug.roundRect(cx2, 32, cw, 18, 4).fill({ color: 0x000000, alpha: 0.45 });
      ug.roundRect(cx2, 32, cw, 18, 4).stroke({ color: comboColor, width: 1, alpha: comboAlpha * 0.3 });
      // Combo pips with glows
      const pipCount = Math.min(state.comboCount, 12);
      for (let p = 0; p < pipCount; p++) {
        const pipX = cx2 + 8 + p * 7;
        ug.circle(pipX, 41, 3.5).fill({ color: comboColor, alpha: comboAlpha * 0.15 });
        ug.circle(pipX, 41, 2.5).fill({ color: comboColor, alpha: comboAlpha });
      }
      // "COMBO" flash for high combos
      if (state.comboCount >= 5) {
        const flashA = 0.3 + Math.sin(state.time * 12) * 0.15;
        ug.roundRect(cx2, 32, cw, 18, 4).fill({ color: comboColor, alpha: flashA * 0.05 });
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

    // Demo scene behind overlay — animated gravity well with orbiting objects
    // Central gravity well
    g.circle(cx, cy, 50).fill({ color: G.COLOR_PLAYER, alpha: 0.04 });
    g.circle(cx, cy, 30).fill({ color: G.COLOR_PLAYER, alpha: 0.06 });
    g.circle(cx, cy, 8).fill({ color: G.COLOR_PLAYER, alpha: 0.15 });
    // Spiral field lines
    for (let sf = 0; sf < 4; sf++) {
      const sfa = t * 0.8 + sf * Math.PI / 2;
      g.moveTo(cx + Math.cos(sfa) * 40, cy + Math.sin(sfa) * 40)
        .lineTo(cx + Math.cos(sfa + 0.5) * 15, cy + Math.sin(sfa + 0.5) * 15)
        .stroke({ color: G.COLOR_PLAYER, width: 1, alpha: 0.06 });
    }
    // Orbiting demo asteroids
    for (let d = 0; d < 8; d++) {
      const da = t * 0.6 + d * Math.PI / 4;
      const dr = 80 + d * 20 + Math.sin(t * 0.5 + d) * 10;
      const dx = cx + Math.cos(da) * dr, dy = cy + Math.sin(da) * dr;
      const isGold = d === 3;
      g.circle(dx, dy, 4 + d * 0.3).fill({ color: isGold ? G.COLOR_GOLD : G.COLOR_ASTEROID, alpha: 0.12 });
      g.circle(dx, dy, 2.5).fill({ color: isGold ? G.COLOR_GOLD : G.COLOR_ASTEROID, alpha: 0.25 });
      // Tether
      g.moveTo(cx, cy).lineTo(dx, dy).stroke({ color: G.COLOR_PLAYER, width: 0.3, alpha: 0.03 });
    }
    // Demo pull field rings
    for (let pr2 = 0; pr2 < 3; pr2++) {
      const prPhase = (t * 2 + pr2 * 0.33) % 1;
      g.circle(cx, cy, 80 * (1 - prPhase)).stroke({ color: G.COLOR_PULL, width: 1, alpha: (1 - prPhase) * 0.06 });
    }
    // Demo enemy
    const dea = t * 0.3;
    const dex = cx + Math.cos(dea) * 200, dey = cy + Math.sin(dea) * 150;
    g.circle(dex, dey, 6).fill({ color: G.COLOR_ENEMY_SCOUT, alpha: 0.1 });
    g.circle(dex, dey, 3).fill({ color: G.COLOR_ENEMY_SCOUT, alpha: 0.15 });

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

    // Multi-layer grade glow — more dramatic with outer halo
    const gy = cy - 95;
    ug.circle(cx, gy, 60 * breathe).fill({ color: grade.color, alpha: 0.02 });
    ug.circle(cx, gy, 50 * breathe).fill({ color: grade.color, alpha: 0.04 });
    ug.circle(cx, gy, 40 * breathe).fill({ color: grade.color, alpha: 0.08 });
    ug.circle(cx, gy, 32 * breathe).fill({ color: grade.color, alpha: 0.14 });
    // Rotating dashed ring — double ring
    for (let seg = 0; seg < 12; seg += 2) {
      const a1 = (seg / 12) * Math.PI * 2 + t * 0.4;
      const a2 = ((seg + 1) / 12) * Math.PI * 2 + t * 0.4;
      ug.moveTo(cx + Math.cos(a1) * 42 * breathe, gy + Math.sin(a1) * 42 * breathe);
      for (let s = 1; s <= 3; s++) { const a = a1 + (a2 - a1) * (s / 3); ug.lineTo(cx + Math.cos(a) * 42 * breathe, gy + Math.sin(a) * 42 * breathe); }
      ug.stroke({ color: grade.color, width: 1.5, alpha: 0.2 });
    }
    // Outer decorative ring (counter-rotating)
    for (let seg = 1; seg < 12; seg += 2) {
      const a1 = (seg / 12) * Math.PI * 2 - t * 0.25;
      const a2 = ((seg + 1) / 12) * Math.PI * 2 - t * 0.25;
      ug.moveTo(cx + Math.cos(a1) * 52 * breathe, gy + Math.sin(a1) * 52 * breathe);
      for (let s = 1; s <= 3; s++) { const a = a1 + (a2 - a1) * (s / 3); ug.lineTo(cx + Math.cos(a) * 52 * breathe, gy + Math.sin(a) * 52 * breathe); }
      ug.stroke({ color: grade.color, width: 1, alpha: 0.1 });
    }
    // Inner solid ring
    ug.circle(cx, gy, 30 * breathe).stroke({ color: grade.color, width: 2.5, alpha: 0.5 });
    // Radiating lines from grade
    for (let rl = 0; rl < 8; rl++) {
      const rla = rl * Math.PI / 4 + t * 0.15;
      ug.moveTo(cx + Math.cos(rla) * 32 * breathe, gy + Math.sin(rla) * 32 * breathe)
        .lineTo(cx + Math.cos(rla) * 48 * breathe, gy + Math.sin(rla) * 48 * breathe)
        .stroke({ color: grade.color, width: 0.8, alpha: 0.1 });
    }

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
