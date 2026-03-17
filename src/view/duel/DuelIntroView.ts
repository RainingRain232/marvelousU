// ---------------------------------------------------------------------------
// Duel mode – VS splash + round announcements
// Cinematic intro with animated slide-in, VS flash, and stage name
// Enhanced with golden embers, ornamental decorations, starburst FX
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import { DUEL_ARENAS } from "../../duel/config/DuelArenaDefs";

// --- Ember particle type ---
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: number;
}

// --- Line sparkle particle ---
interface LineSparkle {
  t: number; // 0-1 position along divider
  speed: number;
  size: number;
  phase: number;
}

export class DuelIntroView {
  readonly container = new Container();

  private _timer = 0;
  private _maxTimer = 0;
  private _callback: (() => void) | null = null;

  // Animated elements
  private _sw = 0;
  private _sh = 0;
  private _animGfx = new Graphics();
  private _p1Name: Text | null = null;
  private _p1Title: Text | null = null;
  private _p2Name: Text | null = null;
  private _p2Title: Text | null = null;
  private _p1Badge: Text | null = null;
  private _p2Badge: Text | null = null;
  private _vsText: Text | null = null;
  private _vsGlow1: Text | null = null;
  private _vsGlow2: Text | null = null;
  private _stageText: Text | null = null;
  private _stageSub: Text | null = null;

  // Particle systems
  private _embers: Ember[] = [];
  private _lineSparkles: LineSparkle[] = [];

  /** Show VS splash screen for two characters + arena. */
  show(
    sw: number,
    sh: number,
    p1Id: string,
    p2Id: string,
    arenaId: string,
    onComplete: () => void,
  ): void {
    this.container.removeChildren();
    this._callback = onComplete;
    this._maxTimer = 72; // ~1.2 seconds (shorter!)
    this._timer = this._maxTimer;
    this._sw = sw;
    this._sh = sh;

    const p1 = DUEL_CHARACTERS[p1Id];
    const p2 = DUEL_CHARACTERS[p2Id];
    const arena = DUEL_ARENAS[arenaId];

    // Animated graphics layer (for background effects)
    this._animGfx = new Graphics();
    this.container.addChild(this._animGfx);

    // --- Initialize embers ---
    this._embers = [];
    for (let i = 0; i < 35; i++) {
      this._embers.push({
        x: Math.random() * sw,
        y: Math.random() * sh,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 1.8 - 0.4,
        size: Math.random() * 2.5 + 0.8,
        life: Math.random() * 60 + 20,
        maxLife: 80,
        color: Math.random() > 0.5 ? 0xffd700 : 0xd4af37,
      });
    }

    // --- Initialize line sparkles ---
    this._lineSparkles = [];
    for (let i = 0; i < 10; i++) {
      this._lineSparkles.push({
        t: Math.random(),
        speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const FONT_BOLD = "Impact, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
    const FONT_ORNATE = "'Georgia', 'Times New Roman', serif";

    // --- P1 badge ---
    this._p1Badge = new Text({
      text: "P1",
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 2,
        stroke: { color: 0x1a3a6a, width: 3 },
      },
    });
    this._p1Badge.anchor.set(0.5);
    this._p1Badge.position.set(-200, sh * 0.38 - 34);
    this._p1Badge.alpha = 0;
    this.container.addChild(this._p1Badge);

    // --- P1 name glow layer ---
    const p1GlowName = new Text({
      text: p1.name.toUpperCase(),
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 44,
        fill: 0xffd700,
        fontWeight: "bold",
        letterSpacing: 4,
      },
    });
    p1GlowName.anchor.set(0.5);
    p1GlowName.position.set(-200, sh * 0.38);
    p1GlowName.alpha = 0;
    this.container.addChild(p1GlowName);

    // --- P1 name (slides in from left) ---
    this._p1Name = new Text({
      text: p1.name.toUpperCase(),
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 42,
        fill: 0x4499ff,
        fontWeight: "bold",
        stroke: { color: 0x0a1a3a, width: 4 },
        letterSpacing: 4,
      },
    });
    this._p1Name.anchor.set(0.5);
    this._p1Name.position.set(-200, sh * 0.38);
    this.container.addChild(this._p1Name);

    this._p1Title = new Text({
      text: `— ${p1.title} —`,
      style: {
        fontFamily: FONT_ORNATE,
        fontSize: 14,
        fill: 0x88bbdd,
        fontStyle: "italic",
        letterSpacing: 2,
      },
    });
    this._p1Title.anchor.set(0.5);
    this._p1Title.position.set(-200, sh * 0.38 + 32);
    this.container.addChild(this._p1Title);

    // --- P2 badge ---
    this._p2Badge = new Text({
      text: "P2",
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 2,
        stroke: { color: 0x6a1a1a, width: 3 },
      },
    });
    this._p2Badge.anchor.set(0.5);
    this._p2Badge.position.set(sw + 200, sh * 0.38 - 34);
    this._p2Badge.alpha = 0;
    this.container.addChild(this._p2Badge);

    // --- P2 name glow layer ---
    const p2GlowName = new Text({
      text: p2.name.toUpperCase(),
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 44,
        fill: 0xffd700,
        fontWeight: "bold",
        letterSpacing: 4,
      },
    });
    p2GlowName.anchor.set(0.5);
    p2GlowName.position.set(sw + 200, sh * 0.38);
    p2GlowName.alpha = 0;
    this.container.addChild(p2GlowName);

    // --- P2 name (slides in from right) ---
    this._p2Name = new Text({
      text: p2.name.toUpperCase(),
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 42,
        fill: 0xff4455,
        fontWeight: "bold",
        stroke: { color: 0x3a0a0a, width: 4 },
        letterSpacing: 4,
      },
    });
    this._p2Name.anchor.set(0.5);
    this._p2Name.position.set(sw + 200, sh * 0.38);
    this.container.addChild(this._p2Name);

    this._p2Title = new Text({
      text: `— ${p2.title} —`,
      style: {
        fontFamily: FONT_ORNATE,
        fontSize: 14,
        fill: 0xdd8888,
        fontStyle: "italic",
        letterSpacing: 2,
      },
    });
    this._p2Title.anchor.set(0.5);
    this._p2Title.position.set(sw + 200, sh * 0.38 + 32);
    this.container.addChild(this._p2Title);

    // --- VS outer glow layer (gold) ---
    this._vsGlow1 = new Text({
      text: "VS",
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 80,
        fill: 0xd4af37,
        fontWeight: "bold",
        letterSpacing: 10,
      },
    });
    this._vsGlow1.anchor.set(0.5);
    this._vsGlow1.position.set(sw / 2, sh * 0.38);
    this._vsGlow1.scale.set(0);
    this._vsGlow1.alpha = 0;
    this.container.addChild(this._vsGlow1);

    // --- VS inner glow layer (white) ---
    this._vsGlow2 = new Text({
      text: "VS",
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 76,
        fill: 0xffffff,
        fontWeight: "bold",
        letterSpacing: 9,
      },
    });
    this._vsGlow2.anchor.set(0.5);
    this._vsGlow2.position.set(sw / 2, sh * 0.38);
    this._vsGlow2.scale.set(0);
    this._vsGlow2.alpha = 0;
    this.container.addChild(this._vsGlow2);

    // --- VS text (scales up from 0) ---
    this._vsText = new Text({
      text: "VS",
      style: {
        fontFamily: FONT_BOLD,
        fontSize: 74,
        fill: 0xffd700,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 6 },
        letterSpacing: 10,
      },
    });
    this._vsText.anchor.set(0.5);
    this._vsText.position.set(sw / 2, sh * 0.38);
    this._vsText.scale.set(0);
    this._vsText.alpha = 0;
    this.container.addChild(this._vsText);

    // --- Stage name (fades in at bottom) ---
    const stageName = arena?.name ?? arenaId;
    this._stageText = new Text({
      text: stageName.toUpperCase(),
      style: {
        fontFamily: FONT_ORNATE,
        fontSize: 20,
        fill: 0xffd700,
        fontWeight: "bold",
        letterSpacing: 6,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this._stageText.anchor.set(0.5);
    this._stageText.position.set(sw / 2, sh * 0.62);
    this._stageText.alpha = 0;
    this.container.addChild(this._stageText);

    // Decorative line under stage name
    this._stageSub = new Text({
      text: "━━━━━━━━━━━━━━━━",
      style: { fontFamily: "monospace", fontSize: 10, fill: 0xd4af37, letterSpacing: 2 },
    });
    this._stageSub.anchor.set(0.5);
    this._stageSub.position.set(sw / 2, sh * 0.62 + 22);
    this._stageSub.alpha = 0;
    this.container.addChild(this._stageSub);

    this.container.visible = true;
  }

  /** Call each frame. Returns true when done. */
  update(): boolean {
    if (this._timer <= 0) return false;

    this._timer--;
    const max = this._maxTimer;
    const t = this._timer;
    const progress = 1 - t / max; // 0→1

    const sw = this._sw;
    const sh = this._sh;
    const g = this._animGfx;
    g.clear();

    const fadeOutMul = t < 10 ? t / 10 : 1;

    // --- Background: dark overlay that fades in fast, then out at end ---
    const bgAlpha = t < 10
      ? t / 10 * 0.92  // fade out in last 10 frames
      : Math.min(progress * 5, 0.92); // fade in fast
    g.rect(0, 0, sw, sh);
    g.fill({ color: 0x050508, alpha: bgAlpha });

    // --- Cinematic letterbox bars (top and bottom) ---
    const letterboxH = 28;
    const lbAlpha = Math.min(progress * 4, 1) * fadeOutMul;
    g.rect(0, 0, sw, letterboxH);
    g.fill({ color: 0x000000, alpha: lbAlpha });
    g.rect(0, sh - letterboxH, sw, letterboxH);
    g.fill({ color: 0x000000, alpha: lbAlpha });
    // Thin gold line at letterbox edges
    g.rect(0, letterboxH, sw, 1);
    g.fill({ color: 0xd4af37, alpha: lbAlpha * 0.35 });
    g.rect(0, sh - letterboxH - 1, sw, 1);
    g.fill({ color: 0xd4af37, alpha: lbAlpha * 0.35 });

    // --- Subtle medieval crosshatch texture pattern ---
    if (progress > 0.05) {
      const texAlpha = Math.min((progress - 0.05) * 2, 0.06) * fadeOutMul;
      const gridSpacing = 24;
      for (let gx = 0; gx < sw; gx += gridSpacing) {
        g.moveTo(gx, 0);
        g.lineTo(gx, sh);
        g.stroke({ color: 0xd4af37, width: 0.5, alpha: texAlpha });
      }
      for (let gy = 0; gy < sh; gy += gridSpacing) {
        g.moveTo(0, gy);
        g.lineTo(sw, gy);
        g.stroke({ color: 0xd4af37, width: 0.5, alpha: texAlpha });
      }
      // Diamond overlay
      for (let gx = 0; gx < sw; gx += gridSpacing * 2) {
        for (let gy = 0; gy < sh; gy += gridSpacing * 2) {
          const cx = gx + gridSpacing;
          const cy = gy + gridSpacing;
          g.moveTo(cx, cy - gridSpacing);
          g.lineTo(cx + gridSpacing, cy);
          g.lineTo(cx, cy + gridSpacing);
          g.lineTo(cx - gridSpacing, cy);
          g.closePath();
          g.stroke({ color: 0xd4af37, width: 0.3, alpha: texAlpha * 0.7 });
        }
      }
    }

    // --- Diagonal slash lines (cinematic wipe accents) ---
    const slashProgress = Math.min(progress * 3, 1);
    if (slashProgress > 0) {
      // Blue slash from top-left
      const sx1 = -50 + slashProgress * (sw * 0.55);
      g.moveTo(sx1, 0);
      g.lineTo(sx1 + 60, 0);
      g.lineTo(sx1 - sh * 0.3 + 60, sh);
      g.lineTo(sx1 - sh * 0.3, sh);
      g.closePath();
      g.fill({ color: 0x2255aa, alpha: 0.18 * fadeOutMul });

      // Red slash from top-right
      const sx2 = sw + 50 - slashProgress * (sw * 0.55);
      g.moveTo(sx2, 0);
      g.lineTo(sx2 - 60, 0);
      g.lineTo(sx2 + sh * 0.3 - 60, sh);
      g.lineTo(sx2 + sh * 0.3, sh);
      g.closePath();
      g.fill({ color: 0xaa2233, alpha: 0.18 * fadeOutMul });
    }

    // --- Corner ornamental brackets ---
    if (progress > 0.08) {
      const cornAlpha = Math.min((progress - 0.08) * 3, 0.6) * fadeOutMul;
      const cornLen = 40;
      const cornOff = 14;
      const cornW = 2;
      // Top-left
      g.rect(cornOff, cornOff, cornLen, cornW);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      g.rect(cornOff, cornOff, cornW, cornLen);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      // Small diamond at corner
      drawDiamond(g, cornOff + 2, cornOff + 2, 3, 0xffd700, cornAlpha * 0.8);
      // Top-right
      g.rect(sw - cornOff - cornLen, cornOff, cornLen, cornW);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      g.rect(sw - cornOff - cornW, cornOff, cornW, cornLen);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      drawDiamond(g, sw - cornOff - 2, cornOff + 2, 3, 0xffd700, cornAlpha * 0.8);
      // Bottom-left
      g.rect(cornOff, sh - cornOff - cornW, cornLen, cornW);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      g.rect(cornOff, sh - cornOff - cornLen, cornW, cornLen);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      drawDiamond(g, cornOff + 2, sh - cornOff - 2, 3, 0xffd700, cornAlpha * 0.8);
      // Bottom-right
      g.rect(sw - cornOff - cornLen, sh - cornOff - cornW, cornLen, cornW);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      g.rect(sw - cornOff - cornW, sh - cornOff - cornLen, cornW, cornLen);
      g.fill({ color: 0xd4af37, alpha: cornAlpha });
      drawDiamond(g, sw - cornOff - 2, sh - cornOff - 2, 3, 0xffd700, cornAlpha * 0.8);
    }

    // --- Divider: angled line with golden gradient glow + ornaments ---
    if (progress > 0.15) {
      const divAlpha = Math.min((progress - 0.15) * 4, 1) * fadeOutMul;
      const divX1 = sw / 2 + 20;
      const divY1 = -10;
      const divX2 = sw / 2 - 20;
      const divY2 = sh + 10;

      // Wide outer glow
      g.moveTo(divX1, divY1);
      g.lineTo(divX2, divY2);
      g.stroke({ color: 0xd4af37, width: 14, alpha: divAlpha * 0.08 });
      // Medium glow
      g.moveTo(divX1, divY1);
      g.lineTo(divX2, divY2);
      g.stroke({ color: 0xffd700, width: 8, alpha: divAlpha * 0.15 });
      // Core golden line (thicker)
      g.moveTo(divX1, divY1);
      g.lineTo(divX2, divY2);
      g.stroke({ color: 0xffd700, width: 3, alpha: divAlpha * 0.7 });
      // Thin bright center
      g.moveTo(divX1, divY1);
      g.lineTo(divX2, divY2);
      g.stroke({ color: 0xffffee, width: 1, alpha: divAlpha * 0.85 });

      // Ornamental diamonds along the divider
      for (let i = 0; i < 8; i++) {
        const frac = (i + 1) / 9;
        const dx = divX1 + (divX2 - divX1) * frac;
        const dy = divY1 + (divY2 - divY1) * frac;
        if (dy > 0 && dy < sh) {
          drawDiamond(g, dx, dy, 4, 0xffd700, divAlpha * 0.5);
          // Tiny cross accent
          g.moveTo(dx - 6, dy);
          g.lineTo(dx + 6, dy);
          g.stroke({ color: 0xd4af37, width: 1, alpha: divAlpha * 0.3 });
          g.moveTo(dx, dy - 6);
          g.lineTo(dx, dy + 6);
          g.stroke({ color: 0xd4af37, width: 1, alpha: divAlpha * 0.3 });
        }
      }

      // Line sparkle particles traveling along divider
      for (const sp of this._lineSparkles) {
        sp.t += sp.speed;
        if (sp.t > 1) sp.t -= 1;
        if (sp.t < 0) sp.t += 1;
        const spx = divX1 + (divX2 - divX1) * sp.t;
        const spy = divY1 + (divY2 - divY1) * sp.t;
        if (spy > 0 && spy < sh) {
          const flicker = 0.5 + Math.sin(progress * 30 + sp.phase) * 0.5;
          g.circle(spx, spy, sp.size * flicker + 1);
          g.fill({ color: 0xffffff, alpha: divAlpha * 0.6 * flicker });
          g.circle(spx, spy, sp.size * flicker * 2 + 2);
          g.fill({ color: 0xffd700, alpha: divAlpha * 0.15 * flicker });
        }
      }
    }

    // --- Horizontal accent double bars with golden tint ---
    if (progress > 0.1) {
      const barAlpha = Math.min((progress - 0.1) * 3, 0.5) * fadeOutMul;
      const barY1 = sh * 0.25;
      const barY2 = sh * 0.55;
      // Top double bar
      g.rect(0, barY1, sw, 2);
      g.fill({ color: 0xd4af37, alpha: barAlpha });
      g.rect(0, barY1 + 4, sw, 1);
      g.fill({ color: 0xd4af37, alpha: barAlpha * 0.5 });
      // Bottom double bar
      g.rect(0, barY2, sw, 2);
      g.fill({ color: 0xd4af37, alpha: barAlpha });
      g.rect(0, barY2 - 3, sw, 1);
      g.fill({ color: 0xd4af37, alpha: barAlpha * 0.5 });

      // Corner decorations where bars meet edges
      const cdSize = 5;
      // Top bar left/right
      drawDiamond(g, cdSize + 2, barY1 + 1, cdSize, 0xffd700, barAlpha * 0.7);
      drawDiamond(g, sw - cdSize - 2, barY1 + 1, cdSize, 0xffd700, barAlpha * 0.7);
      // Bottom bar left/right
      drawDiamond(g, cdSize + 2, barY2 + 1, cdSize, 0xffd700, barAlpha * 0.7);
      drawDiamond(g, sw - cdSize - 2, barY2 + 1, cdSize, 0xffd700, barAlpha * 0.7);
    }

    // --- Golden starburst / radial lines behind VS ---
    if (progress > 0.2) {
      const burstAlpha = Math.min((progress - 0.2) * 3, 1) * fadeOutMul;
      const cx = sw / 2;
      const cy = sh * 0.38;
      const numRays = 24;
      const rayLen = 80 + Math.sin(progress * 15) * 10;
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2 + progress * 2;
        const innerR = 30;
        const ix = cx + Math.cos(angle) * innerR;
        const iy = cy + Math.sin(angle) * innerR;
        const ox = cx + Math.cos(angle) * rayLen;
        const oy = cy + Math.sin(angle) * rayLen;
        g.moveTo(ix, iy);
        g.lineTo(ox, oy);
        const rayAlphaVar = 0.06 + Math.sin(progress * 20 + i * 1.5) * 0.03;
        g.stroke({ color: 0xffd700, width: 2, alpha: burstAlpha * rayAlphaVar });
      }
      // Radial glow circle
      g.circle(cx, cy, 50);
      g.fill({ color: 0xffd700, alpha: burstAlpha * 0.04 });
      g.circle(cx, cy, 35);
      g.fill({ color: 0xffffee, alpha: burstAlpha * 0.05 });
    }

    // --- Stage name banner / panel behind text ---
    if (this._stageText && progress > 0.35) {
      const sp = Math.min((progress - 0.35) * 3, 1);
      const bannerAlpha = sp * fadeOutMul;
      const bcx = sw / 2;
      const bcy = sh * 0.62;
      const bannerW = 180;
      const bannerH = 28;

      // Dark panel
      g.rect(bcx - bannerW, bcy - bannerH / 2, bannerW * 2, bannerH);
      g.fill({ color: 0x0a0a0a, alpha: bannerAlpha * 0.6 });
      // Gold border top/bottom
      g.rect(bcx - bannerW, bcy - bannerH / 2, bannerW * 2, 1);
      g.fill({ color: 0xd4af37, alpha: bannerAlpha * 0.5 });
      g.rect(bcx - bannerW, bcy + bannerH / 2, bannerW * 2, 1);
      g.fill({ color: 0xd4af37, alpha: bannerAlpha * 0.5 });

      // Shield-like decorative elements flanking stage name
      const shieldX = bannerW + 10;
      // Left shield
      drawShield(g, bcx - shieldX, bcy, 8, 0xd4af37, bannerAlpha * 0.5);
      // Right shield
      drawShield(g, bcx + shieldX, bcy, 8, 0xd4af37, bannerAlpha * 0.5);
    }

    // --- Animated golden embers/sparks ---
    if (progress > 0.05) {
      const emberAlpha = Math.min((progress - 0.05) * 3, 1) * fadeOutMul;
      for (const e of this._embers) {
        e.x += e.vx;
        e.y += e.vy;
        e.life--;
        // Respawn
        if (e.life <= 0 || e.y < -10 || e.x < -10 || e.x > sw + 10) {
          e.x = Math.random() * sw;
          e.y = sh + 5;
          e.life = e.maxLife;
          e.vx = (Math.random() - 0.5) * 1.2;
          e.vy = -Math.random() * 1.8 - 0.4;
        }
        const lifeFrac = e.life / e.maxLife;
        const eAlpha = lifeFrac * emberAlpha * 0.7;
        // Glow
        g.circle(e.x, e.y, e.size * 2.5);
        g.fill({ color: e.color, alpha: eAlpha * 0.15 });
        // Core
        g.circle(e.x, e.y, e.size);
        g.fill({ color: 0xffffcc, alpha: eAlpha });
      }
    }

    // --- Sparkle particles along divider (legacy expanded) ---
    if (progress > 0.25 && t > 8) {
      for (let i = 0; i < 6; i++) {
        const py = sh * (0.1 + i * 0.15);
        const sparkPhase = progress * 12 + i * 2.5;
        const sx = sw / 2 + 20 - 40 * (py / sh) + Math.sin(sparkPhase) * 8;
        const sy = py + Math.cos(sparkPhase * 1.3) * 4;
        const sparkAlpha = (0.3 + Math.sin(sparkPhase * 2) * 0.3) * fadeOutMul;
        g.circle(sx, sy, 2.5);
        g.fill({ color: 0xffffcc, alpha: sparkAlpha });
        g.circle(sx, sy, 6);
        g.fill({ color: 0xffd700, alpha: sparkAlpha * 0.2 });
      }
    }

    // --- Animate P1 name + badge (slide from left) ---
    if (this._p1Name && this._p1Title && this._p1Badge) {
      const slideIn = easeOutBack(Math.min(progress * 2.5, 1));
      const targetX = sw * 0.25;
      const curX = -200 + (targetX + 200) * slideIn;
      this._p1Name.position.x = curX;
      this._p1Name.alpha = Math.min(progress * 4, 1) * fadeOutMul;
      this._p1Title.position.x = -200 + (targetX + 200) * easeOutBack(Math.min(progress * 2.2, 1));
      this._p1Title.alpha = Math.min((progress - 0.1) * 3, 1) * fadeOutMul;
      // Badge
      this._p1Badge.position.x = curX;
      this._p1Badge.alpha = Math.min(progress * 3, 1) * fadeOutMul;
      // Move glow layer (child at index 2 after animGfx)
      const p1Glow = this.container.children[2] as Text;
      if (p1Glow) {
        p1Glow.position.x = curX;
        p1Glow.alpha = Math.min(progress * 3, 1) * 0.25 * fadeOutMul;
      }
    }

    // --- Animate P2 name + badge (slide from right) ---
    if (this._p2Name && this._p2Title && this._p2Badge) {
      const slideIn = easeOutBack(Math.min(progress * 2.5, 1));
      const targetX = sw * 0.75;
      const curX = sw + 200 - (sw + 200 - targetX) * slideIn;
      this._p2Name.position.x = curX;
      this._p2Name.alpha = Math.min(progress * 4, 1) * fadeOutMul;
      this._p2Title.position.x = sw + 200 - (sw + 200 - targetX) * easeOutBack(Math.min(progress * 2.2, 1));
      this._p2Title.alpha = Math.min((progress - 0.1) * 3, 1) * fadeOutMul;
      // Badge
      this._p2Badge.position.x = curX;
      this._p2Badge.alpha = Math.min(progress * 3, 1) * fadeOutMul;
      // Move glow layer (child at index 6 after animGfx)
      const p2Glow = this.container.children[6] as Text;
      if (p2Glow) {
        p2Glow.position.x = curX;
        p2Glow.alpha = Math.min(progress * 3, 1) * 0.25 * fadeOutMul;
      }
    }

    // --- Animate VS text (pop in with dramatic overshoot) ---
    if (this._vsText && this._vsGlow1 && this._vsGlow2) {
      const vsDelay = 0.2;
      if (progress > vsDelay) {
        const vsP = Math.min((progress - vsDelay) * 4, 1);
        const scale = easeOutBackStrong(vsP);
        this._vsText.scale.set(scale);
        this._vsText.alpha = Math.min(vsP * 2, 1) * fadeOutMul;
        // Glow layers follow with slight scale offset
        this._vsGlow1.scale.set(scale * 1.15);
        this._vsGlow1.alpha = Math.min(vsP * 1.5, 0.3) * fadeOutMul;
        this._vsGlow2.scale.set(scale * 1.06);
        this._vsGlow2.alpha = Math.min(vsP * 1.5, 0.15) * fadeOutMul;
        // Subtle pulse when fully scaled
        const pulse = 1 + Math.sin(progress * 22) * 0.04;
        if (vsP >= 1) {
          this._vsText.scale.set(pulse);
          this._vsGlow1.scale.set(pulse * 1.15);
          this._vsGlow2.scale.set(pulse * 1.06);
        }
      }
    }

    // --- Animate stage name (fade in from below) ---
    if (this._stageText && this._stageSub) {
      const stageDelay = 0.35;
      if (progress > stageDelay) {
        const sp = Math.min((progress - stageDelay) * 3, 1);
        const ease = easeOutCubic(sp);
        this._stageText.alpha = sp * fadeOutMul;
        this._stageText.position.y = sh * 0.62 + 10 * (1 - ease);
        this._stageSub.alpha = Math.max(0, sp - 0.2) * fadeOutMul;
        this._stageSub.position.y = sh * 0.62 + 22 + 8 * (1 - ease);
      }
    }

    // --- Flash on VS appear ---
    if (progress > 0.2 && progress < 0.35) {
      const flashP = (progress - 0.2) / 0.15;
      const flashAlpha = flashP < 0.3 ? flashP / 0.3 * 0.3 : (1 - flashP) * 0.3;
      g.rect(0, 0, sw, sh);
      g.fill({ color: 0xfff8e0, alpha: flashAlpha });
    }

    // Done
    if (t <= 0) {
      this.container.visible = false;
      this._callback?.();
      return true;
    }

    return false;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// --- Drawing helpers ---

function drawDiamond(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number): void {
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.fill({ color, alpha });
}

function drawShield(g: Graphics, cx: number, cy: number, r: number, color: number, alpha: number): void {
  // Simple shield: top half is a rectangle, bottom half tapers to a point
  g.moveTo(cx - r, cy - r);
  g.lineTo(cx + r, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r * 1.4);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.fill({ color, alpha });
  // Inner highlight
  const ir = r * 0.5;
  g.moveTo(cx - ir, cy - ir);
  g.lineTo(cx + ir, cy - ir);
  g.lineTo(cx + ir, cy);
  g.lineTo(cx, cy + ir * 1.4);
  g.lineTo(cx - ir, cy);
  g.closePath();
  g.fill({ color: 0xffffff, alpha: alpha * 0.2 });
}

// --- Easing helpers ---

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Stronger overshoot variant for VS text */
function easeOutBackStrong(t: number): number {
  const c1 = 2.8;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
