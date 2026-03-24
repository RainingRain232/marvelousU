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

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0x8844cc, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 4, blur: 8, alpha: 0.8 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: 0x6688aa, fontStyle: "italic", letterSpacing: 2 });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x556677, lineHeight: 18 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0xaa88dd, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_HUD_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x6688aa, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.4 } });
const STYLE_MULT = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffdd44, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.7 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 20, fill: 0xaa88dd, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 3, alpha: 0.5 } });
const STYLE_DEATH_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 48, fill: 0xff4466, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0xcccccc, lineHeight: 24 });
const STYLE_DEATH_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0xaa88dd, fontWeight: "bold" });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 36, fill: 0xaa88dd, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });

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
    const starColors = [0xaaaacc, 0xccaadd, 0xaaccee, 0xddccaa, 0xccddff];
    for (let i = 0; i < 100; i++) {
      this._stars.push({ x: Math.random() * this._sw, y: Math.random() * this._sh,
        size: Math.random() * 1.8 + 0.2, phase: Math.random() * Math.PI * 2,
        brightness: Math.random() * 0.25 + 0.02,
        color: starColors[Math.floor(Math.random() * starColors.length)] });
    }
    // Void wisps
    if (!this._wispsInit) {
      this._wispsInit = true;
      const wispColors = [0x4422aa, 0x6633cc, 0x3318aa, 0x5522bb, 0x2211aa];
      for (let i = 0; i < 8; i++) {
        this._wisps.push({
          x: Math.random() * this._sw, y: Math.random() * this._sh,
          vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4,
          size: 30 + Math.random() * 60, phase: Math.random() * Math.PI * 2,
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

    if (state.nearMissFlash > 0) {
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_NEAR_MISS, alpha: 0.08 * (state.nearMissFlash / VK.NEAR_MISS_FLASH_DUR) });
    }
    if (state.slowTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_SLOW_TINT, alpha: 0.03 });
    }
    if (state.reflectTimer > 0) {
      const ra = 0.03 + Math.sin(state.time * 8) * 0.015;
      g.rect(0, 0, sw, sh).fill({ color: VK.COLOR_ORB_REFLECT, alpha: ra });
    }
    if (state.screenFlashTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.2 * (state.screenFlashTimer / VK.FLASH_DURATION) });
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
    // Subtle nebula clouds — large soft circles
    g.circle(cx * 0.7, cy * 0.6, 180).fill({ color: 0x1a0e30, alpha: 0.15 + Math.sin(t * 0.2) * 0.03 });
    g.circle(cx * 1.3, cy * 1.2, 150).fill({ color: 0x0e1a30, alpha: 0.12 + Math.sin(t * 0.3 + 1) * 0.03 });
    g.circle(cx * 0.4, cy * 1.4, 120).fill({ color: 0x200e30, alpha: 0.08 + Math.sin(t * 0.25 + 2) * 0.02 });
    g.circle(cx * 1.5, cy * 0.4, 100).fill({ color: 0x10102a, alpha: 0.1 + Math.sin(t * 0.15 + 3) * 0.02 });
  }

  private _drawStars(g: Graphics, t: number): void {
    for (const s of this._stars) {
      const tw = s.brightness * (0.5 + Math.sin(t * 1.2 + s.phase) * 0.5);
      if (tw > 0.01) {
        g.circle(s.x, s.y, s.size).fill({ color: s.color, alpha: tw });
        if (s.size > 1.3 && tw > 0.07) {
          g.setStrokeStyle({ width: 0.5, color: s.color, alpha: tw * 0.35 });
          g.moveTo(s.x - s.size * 2, s.y).lineTo(s.x + s.size * 2, s.y).stroke();
          g.moveTo(s.x, s.y - s.size * 2).lineTo(s.x, s.y + s.size * 2).stroke();
        }
      }
    }
  }

  private _drawVoidWisps(g: Graphics, t: number): void {
    for (const w of this._wisps) {
      w.x += w.vx * (1 / 60); w.y += w.vy * (1 / 60);
      w.x += Math.sin(w.phase + t * 0.3) * 0.5;
      // Wrap
      if (w.x < -w.size) w.x = this._sw + w.size;
      if (w.x > this._sw + w.size) w.x = -w.size;
      if (w.y < -w.size) w.y = this._sh + w.size;
      if (w.y > this._sh + w.size) w.y = -w.size;

      const breathe = 0.02 + Math.sin(t * 0.4 + w.phase) * 0.01;
      // Multi-circle wisp with varying sizes
      g.circle(w.x, w.y, w.size).fill({ color: w.color, alpha: breathe });
      g.circle(w.x + w.size * 0.3, w.y - w.size * 0.2, w.size * 0.6).fill({ color: w.color, alpha: breathe * 0.7 });
      g.circle(w.x - w.size * 0.2, w.y + w.size * 0.3, w.size * 0.4).fill({ color: w.color, alpha: breathe * 0.5 });
    }
  }

  private _drawArena(g: Graphics, state: VKState): void {
    const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
    const t = state.time;

    // Arena floor with subtle radial gradient
    g.circle(cx, cy, r).fill(VK.COLOR_ARENA_FLOOR);
    g.circle(cx, cy, r * 0.7).fill({ color: 0x12102a, alpha: 0.3 });
    g.circle(cx, cy, r * 0.4).fill({ color: 0x161430, alpha: 0.2 });

    // Concentric rings with heartbeat pulse
    const heartbeat = 0.5 + Math.sin(t * 1.2) * 0.5;
    for (let ring = 1; ring <= 6; ring++) {
      const rr = r * ring / 6;
      const ringPulse = 0.03 + Math.sin(t * 0.5 + ring * 0.8) * 0.015 + heartbeat * 0.01;
      g.setStrokeStyle({ width: 1, color: VK.COLOR_ARENA_GLOW, alpha: ringPulse });
      g.circle(cx, cy, rr).stroke();
    }

    // Energy veins (radial lines from center)
    for (let v = 0; v < 8; v++) {
      const va = v * Math.PI / 4 + t * 0.05;
      const vAlpha = 0.03 + Math.sin(t * 0.8 + v * 1.5) * 0.015;
      g.setStrokeStyle({ width: 1, color: VK.COLOR_ARENA_GLOW, alpha: vAlpha });
      g.moveTo(cx, cy).lineTo(cx + Math.cos(va) * r * 0.9, cy + Math.sin(va) * r * 0.9).stroke();
    }

    // Outer glow layers
    g.circle(cx, cy, r + 20).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.02 });
    g.circle(cx, cy, r + 12).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.04 });
    g.circle(cx, cy, r + 6).fill({ color: VK.COLOR_ARENA_GLOW, alpha: 0.06 });

    // Arena border reacts to danger level (projectile count + multiplier)
    const dangerLevel = Math.min(1, state.projectiles.length / 40);
    const borderColor = dangerLevel > 0.5
      ? lerpColor(VK.COLOR_ARENA_BORDER, VK.COLOR_DANGER, (dangerLevel - 0.5) * 2)
      : VK.COLOR_ARENA_BORDER;
    const borderPulseSpeed = 2 + state.multiplier * 0.5;

    const segments = 24;
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2 + t * 0.3;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + t * 0.3;
      const pulse = 0.4 + Math.sin(t * borderPulseSpeed + i) * 0.15;
      g.setStrokeStyle({ width: VK.ARENA_BORDER_WIDTH, color: borderColor, alpha: pulse });
      g.moveTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      for (let s = 1; s <= 6; s++) {
        const a = a1 + (a2 - a1) * (s / 6);
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.stroke();
    }

    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + t * 0.1;
      const rx = cx + Math.cos(a) * (r + 20);
      const ry = cy + Math.sin(a) * (r + 20);
      const runeAlpha = 0.15 + Math.sin(t * 1.5 + i * 2) * 0.08;
      g.circle(rx, ry, 5).fill({ color: VK.COLOR_ARENA_BORDER, alpha: runeAlpha });
      g.moveTo(rx, ry - 4).lineTo(rx + 3, ry + 2).lineTo(rx - 3, ry + 2).closePath()
        .fill({ color: VK.COLOR_ARENA_BORDER, alpha: runeAlpha * 1.5 });
    }

    g.setStrokeStyle({ width: 1, color: VK.COLOR_ARENA_GLOW, alpha: 0.06 });
    g.moveTo(cx - 12, cy).lineTo(cx + 12, cy).stroke();
    g.moveTo(cx, cy - 12).lineTo(cx, cy + 12).stroke();
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

      // Afterimage ghosts (knight shapes fading behind)
      for (let tr = 1; tr <= 6; tr++) {
        const tx = px - ddx * tr * 8;
        const ty = py - ddy * tr * 8;
        const ta = trailAlpha * (0.25 - tr * 0.04);
        if (ta <= 0) break;
        const tSize = pr * (1.0 - tr * 0.08);
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

    // Outer glow
    g.circle(px, py, pr * 2.5).fill({ color, alpha: 0.06 });
    g.circle(px, py, pr * 1.6).fill({ color, alpha: 0.1 });

    // Knight diamond body (rotates with movement direction)
    const kSize = pr * 1.3;
    g.moveTo(px + ndx * kSize, py + ndy * kSize) // front point
      .lineTo(px + perpX * kSize * 0.6, py + perpY * kSize * 0.6) // right
      .lineTo(px - ndx * kSize * 0.7, py - ndy * kSize * 0.7) // back
      .lineTo(px - perpX * kSize * 0.6, py - perpY * kSize * 0.6) // left
      .closePath().fill(color);

    // Armor highlight
    g.moveTo(px + ndx * kSize * 0.6, py + ndy * kSize * 0.6)
      .lineTo(px + perpX * kSize * 0.3, py + perpY * kSize * 0.3)
      .lineTo(px - ndx * kSize * 0.2, py - ndy * kSize * 0.2)
      .lineTo(px - perpX * kSize * 0.3, py - perpY * kSize * 0.3)
      .closePath().fill({ color: 0xffffff, alpha: 0.12 });

    // Central core glow
    g.circle(px, py, pr * 0.5).fill({ color: 0xffffff, alpha: 0.25 });

    // Blade tip (front extension)
    g.moveTo(px + ndx * kSize * 1.4, py + ndy * kSize * 1.4)
      .lineTo(px + ndx * kSize * 0.8 + perpX * 2, py + ndy * kSize * 0.8 + perpY * 2)
      .lineTo(px + ndx * kSize * 0.8 - perpX * 2, py + ndy * kSize * 0.8 - perpY * 2)
      .closePath().fill({ color, alpha: 0.7 });

    // Movement wobble particles
    if (vLen > 80) {
      const wobble = Math.sin(t * 12) * 1.5;
      g.circle(px - ndx * kSize * 0.8 + wobble, py - ndy * kSize * 0.8, pr * 0.3)
        .fill({ color, alpha: 0.2 });
    }

    // Idle breathing animation (when not moving)
    if (vLen <= 10) {
      const breathe = Math.sin(t * 2) * 0.08;
      const idleGlow = 0.06 + Math.sin(t * 1.5) * 0.03;
      // Gentle pulsing aura
      g.circle(px, py, pr * (2.0 + breathe * 3)).fill({ color, alpha: idleGlow });
      // Shimmer sparkles rotating slowly around idle player
      for (let s = 0; s < 3; s++) {
        const sa = t * 0.8 + s * Math.PI * 2 / 3;
        const sr = pr * 2.2;
        g.circle(px + Math.cos(sa) * sr, py + Math.sin(sa) * sr, 1.2)
          .fill({ color: 0xffffff, alpha: 0.15 + Math.sin(t * 3 + s) * 0.1 });
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

      // Trail
      if (vLen > 0) {
        g.setStrokeStyle({ width: r * 0.7, color: p.color, alpha: phantom ? 0.05 : 0.15 });
        g.moveTo(p.x, p.y).lineTo(p.x + ndx * r * 3, p.y + ndy * r * 3).stroke();
      }

      // Outer glow
      g.circle(p.x, p.y, r * 2).fill({ color: p.color, alpha: phantom ? 0.02 : 0.08 });

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
        default:
          // Standard circle
          g.circle(p.x, p.y, r).fill({ color: p.color, alpha: pAlpha });
          break;
      }

      // Bright center (skip for phantom and hollow rings)
      if (!phantom && p.pattern !== ProjectilePattern.RING) {
        g.circle(p.x, p.y, r * 0.35).fill({ color: 0xffffff, alpha: 0.35 });
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
      const sr = VK.SPAWNER_RADIUS * (s.isBoss ? VK.BOSS_SIZE_MULT : 1);
      const sColor = s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER;
      const bodyColor = s.flashTimer > 0 ? 0xffffff : sColor;

      // Danger glow (multi-layered)
      const pulse = 0.08 + Math.sin(t * 4 + s.angle) * 0.05;
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

      // Central eye with glow
      const eyeColor = s.isBoss ? 0xff2288 : 0xff2266;
      g.circle(sx, sy, sr * 0.4).fill({ color: eyeColor, alpha: 0.15 });
      g.circle(sx, sy, sr * 0.28).fill({ color: eyeColor, alpha: 0.6 + Math.sin(t * 6) * 0.3 });
      g.circle(sx, sy, sr * 0.12).fill({ color: 0xffffff, alpha: 0.4 });

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

      // HP bar with border
      const barW = sr * 2.8;
      const barH = 4;
      const bx = sx - barW / 2;
      const by = sy - sr - 10;
      g.roundRect(bx - 1, by - 1, barW + 2, barH + 2, 2).fill({ color: 0x000000, alpha: 0.5 });
      g.rect(bx, by, barW, barH).fill({ color: 0x1a1a2e, alpha: 0.6 });
      g.rect(bx, by, barW * (s.hp / s.maxHp), barH).fill({ color: s.isBoss ? VK.COLOR_BOSS_SPAWNER : 0xff4466, alpha: 0.85 });
      g.rect(bx, by, barW * (s.hp / s.maxHp), 1).fill({ color: 0xffffff, alpha: 0.1 });
    }
  }

  private _drawOrbs(g: Graphics, state: VKState): void {
    const t = state.time;
    for (const o of state.orbs) {
      const color = o.kind === "score" ? VK.COLOR_ORB_SCORE : o.kind === "shield" ? VK.COLOR_ORB_SHIELD :
                    o.kind === "slow" ? VK.COLOR_ORB_SLOW : o.kind === "magnet" ? VK.COLOR_ORB_MAGNET :
                    o.kind === "reflect" ? VK.COLOR_ORB_REFLECT : VK.COLOR_ORB_BOMB;
      const bob = Math.sin(t * 3 + o.pulse) * 5; // bigger bob
      // Smoother despawn flicker (fade alpha instead of skip frames)
      let despawnAlpha = 1.0;
      if (o.age > VK.ORB_LIFETIME - 3) {
        despawnAlpha = 0.3 + Math.sin(t * 6 + o.pulse) * 0.3; // smooth pulse instead of jerky skip
      }

      // Outer glow (larger, more saturated)
      g.circle(o.x, o.y + bob, VK.ORB_RADIUS * 2.5).fill({ color, alpha: 0.06 * despawnAlpha });
      g.circle(o.x, o.y + bob, VK.ORB_RADIUS * 1.8).fill({ color, alpha: (0.12 + Math.sin(t * 4 + o.pulse) * 0.05) * despawnAlpha });
      // Core (brighter)
      g.circle(o.x, o.y + bob, VK.ORB_RADIUS).fill({ color, alpha: 0.8 * despawnAlpha });
      // Top highlight
      g.circle(o.x - 2, o.y + bob - 3, VK.ORB_RADIUS * 0.35).fill({ color: 0xffffff, alpha: 0.35 * despawnAlpha });
      // Border ring
      g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.15 * despawnAlpha });
      g.circle(o.x, o.y + bob, VK.ORB_RADIUS * 1.05).stroke();

      // Icon per orb type (larger)
      const ir = VK.ORB_RADIUS * 0.55;
      const iy = o.y + bob;
      switch (o.kind) {
        case "score":
          // Star/coin
          g.star(o.x, iy, 5, ir * 0.4, ir, t * 2).fill({ color: 0xffffff, alpha: 0.25 });
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
      }

      // Orbiting sparkles (2 at opposite sides)
      for (let sp = 0; sp < 2; sp++) {
        const oa = t * 3 + o.pulse + sp * Math.PI;
        const oR = VK.ORB_RADIUS * 1.4;
        g.circle(o.x + Math.cos(oa) * oR, o.y + bob + Math.sin(oa) * oR, 1.8)
          .fill({ color: 0xffffff, alpha: 0.4 * despawnAlpha });
        // Sparkle trail
        const ta = oa - 0.5;
        g.circle(o.x + Math.cos(ta) * oR, o.y + bob + Math.sin(ta) * oR, 1)
          .fill({ color: 0xffffff, alpha: 0.15 * despawnAlpha });
      }
    }
  }

  private _drawParticles(g: Graphics, state: VKState): void {
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      const sz = p.size * alpha;

      // Motion trail
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 15) {
        const tdx = -p.vx / spd, tdy = -p.vy / spd;
        g.setStrokeStyle({ width: sz * 0.6, color: p.color, alpha: alpha * 0.12 });
        g.moveTo(p.x, p.y).lineTo(p.x + tdx * sz * 2, p.y + tdy * sz * 2).stroke();
      }

      // Outer glow
      g.circle(p.x, p.y, sz * 1.6).fill({ color: p.color, alpha: alpha * 0.12 });

      // Core — shape varies with size
      if (p.size > 4) {
        // Diamond for large particles
        g.moveTo(p.x, p.y - sz).lineTo(p.x + sz * 0.6, p.y).lineTo(p.x, p.y + sz).lineTo(p.x - sz * 0.6, p.y)
          .closePath().fill({ color: p.color, alpha });
      } else {
        g.circle(p.x, p.y, sz).fill({ color: p.color, alpha });
      }

      // Hot center
      if (alpha > 0.3 && sz > 1) {
        g.circle(p.x, p.y, sz * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.3 });
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

    // Expanding death ring
    const ringR = (1 - ratio) * 80;
    g.setStrokeStyle({ width: 2, color: VK.COLOR_DANGER, alpha: 0.3 * ratio });
    g.circle(state.deathX, state.deathY, ringR).stroke();

    // "KILLED BY" indicator
    const ug = this._uiGfx;
    ug.roundRect(this._sw / 2 - 50, this._sh * 0.12, 100, 20, 4).fill({ color: 0x000000, alpha: 0.5 * ratio });
  }

  private _drawShockwaves(g: Graphics, state: VKState): void {
    for (const sw of state.shockwaves) {
      const lifeRatio = sw.life / VK.SHOCKWAVE_LIFE;
      const alpha = lifeRatio * 0.45;
      // Outermost glow fill
      g.circle(sw.x, sw.y, sw.radius).fill({ color: sw.color, alpha: alpha * 0.08 });
      // Main ring (thicker)
      g.setStrokeStyle({ width: 3, color: sw.color, alpha });
      g.circle(sw.x, sw.y, sw.radius).stroke();
      // Secondary ring (trailing)
      g.setStrokeStyle({ width: 2, color: sw.color, alpha: alpha * 0.5 });
      g.circle(sw.x, sw.y, sw.radius * 0.75).stroke();
      // Tertiary faint ring
      g.setStrokeStyle({ width: 1, color: sw.color, alpha: alpha * 0.25 });
      g.circle(sw.x, sw.y, sw.radius * 0.5).stroke();
      // White core ring (inner bright edge)
      if (lifeRatio > 0.5) {
        g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: (lifeRatio - 0.5) * 0.3 });
        g.circle(sw.x, sw.y, sw.radius * 0.95).stroke();
      }
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

    ug.roundRect(x - 1, y - 1, barW + 2, barH + 2, 3).fill({ color: 0x000000, alpha: 0.3 });
    ug.rect(x, y, barW, barH).fill({ color: 0x222222, alpha: 0.4 });
    const fill = state.grazeMeter / VK.GRAZE_MAX;
    if (fill > 0) {
      const mColor = state.grazeBurstReady ? VK.COLOR_GRAZE : 0x886699;
      ug.rect(x, y, barW * fill, barH).fill({ color: mColor, alpha: state.grazeBurstReady ? 0.8 + Math.sin(state.time * 6) * 0.2 : 0.6 });
    }
    // Icon
    ug.circle(x - 5, y + barH / 2, 3).fill({ color: VK.COLOR_GRAZE, alpha: 0.4 });
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
    ug.rect(0, 0, this._sw, 42).fill({ color: 0x000000, alpha: 0.3 });

    const score = Math.floor(state.score);
    const hi = Math.max(Math.floor(meta.highScore), score);
    this._hudText.text = `SCORE: ${score}  |  WAVE: ${state.wave}  |  HI: ${hi}`;
    const parts: string[] = [];
    if (state.shieldHits > 0) parts.push(`SHIELD x${state.shieldHits}`);
    if (state.slowTimer > 0) parts.push(`SLOW: ${state.slowTimer.toFixed(1)}s`);
    if (state.magnetTimer > 0) parts.push(`MAGNET: ${state.magnetTimer.toFixed(1)}s`);
    if (state.reflectTimer > 0) parts.push(`REFLECT: ${state.reflectTimer.toFixed(1)}s`);
    parts.push(`NEAR: ${state.nearMisses}`);
    parts.push(`NEXT: ${Math.ceil(state.waveTimer)}s`);
    if (state.waveMutators.length > 0) {
      const mutNames: Record<string, string> = { void_surge: "SURGE", fragile: "FRAG", abundance: "ABUND", phantom: "PHANTOM", ricochet: "RICO", gravity_well: "GRAV" };
      parts.push(state.waveMutators.map(m => mutNames[m] || m).join("+"));
    }
    this._hudSmall.text = parts.join("  |  ");

    // Dash cooldown bar
    const dashBarW = 60, dashBarH = 4;
    const dbx = this._sw - 10 - dashBarW, dby = 10;
    ug.roundRect(dbx - 1, dby - 1, dashBarW + 2, dashBarH + 2, 2).fill({ color: 0x000000, alpha: 0.3 });
    if (state.dashCooldown <= 0) {
      ug.rect(dbx, dby, dashBarW, dashBarH).fill({ color: VK.COLOR_PLAYER, alpha: 0.6 + Math.sin(state.time * 4) * 0.2 });
    } else {
      ug.rect(dbx, dby, dashBarW, dashBarH).fill({ color: 0x222222, alpha: 0.4 });
      ug.rect(dbx, dby, dashBarW * (1 - state.dashCooldown / VK.DASH_COOLDOWN), dashBarH).fill({ color: VK.COLOR_PLAYER, alpha: 0.5 });
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
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.7 });

    const cx = this._sw / 2, cy = this._sh / 2;
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

    // Stats with visual bars
    this._deathStats.anchor.set(0.5); this._deathStats.position.set(cx, cy - 10);
    const statLines = [
      `Score: ${score}${isNew ? "  ** NEW HIGH **" : ""}`,
      `Wave: ${state.wave}  |  Near Misses: ${state.nearMisses}  |  Orbs: ${state.orbsCollected}`,
      `Spawners: ${state.spawnersDestroyed}  |  Dash Kills: ${state.dashKillsTotal}`,
      `Peak: ${state.peakMultiplier.toFixed(1)}x  |  Time: ${Math.floor(state.time)}s`,
    ];
    if (nextGradeText) statLines.push(nextGradeText);
    if (state.selectedPerks.length > 0) {
      statLines.push(`Perks: ${state.selectedPerks.length}`);
    }
    this._deathStats.text = statLines.join("\n");

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
