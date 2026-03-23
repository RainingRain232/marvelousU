// Grail Breaker – PixiJS Renderer
// Layers: bg, bricks, entities, fx, ui

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { BreakerState } from "../types.ts";
import { BreakerPhase, BrickType } from "../types.ts";
import { BREAKER_BALANCE as B, BRICK_COLORS } from "../config/BreakerBalance.ts";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function colorLighten(base: number, f: number): number {
  const r = Math.min(255, Math.round(((base >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((base >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((base & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

function colorDarken(base: number, f: number): number {
  const r = Math.round(((base >> 16) & 0xff) * f);
  const g = Math.round(((base >> 8) & 0xff) * f);
  const b = Math.round((base & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// Powerup label mapping
// ---------------------------------------------------------------------------

const POWERUP_COLORS: Record<string, number> = {
  wide: 0x44aaff,
  multi: 0x44ff44,
  fireball: 0xff6622,
  slow: 0x66ccff,
  life: 0xff44aa,
  laser: 0xff4444,
};

// ---------------------------------------------------------------------------
// Level background palettes (outer, field, border, stone mortar)
// Progresses from cool blues to warm reds/purples across 10 levels
// ---------------------------------------------------------------------------

const LEVEL_PALETTES: { outer: number; field: number; border: number; mortar: number }[] = [
  { outer: 0x1a1a2e, field: 0x222233, border: 0x555566, mortar: 0x2a2a3a }, // 1 - midnight
  { outer: 0x1a1e2e, field: 0x222838, border: 0x556066, mortar: 0x2a2e3a }, // 2 - deep sea
  { outer: 0x1e1a2e, field: 0x282238, border: 0x605566, mortar: 0x2e2a3a }, // 3 - twilight
  { outer: 0x221a2a, field: 0x2d2235, border: 0x665560, mortar: 0x332a38 }, // 4 - dusk
  { outer: 0x261a26, field: 0x322232, border: 0x6a555a, mortar: 0x382a35 }, // 5 - plum
  { outer: 0x2a1a22, field: 0x35222d, border: 0x6e5558, mortar: 0x3a2a32 }, // 6 - burgundy
  { outer: 0x2e1a1e, field: 0x382228, border: 0x705555, mortar: 0x3c2a2e }, // 7 - crimson
  { outer: 0x2e1e1a, field: 0x382822, border: 0x706055, mortar: 0x3c2e2a }, // 8 - ember
  { outer: 0x2e221a, field: 0x382d22, border: 0x706a55, mortar: 0x3c322a }, // 9 - bronze
  { outer: 0x2e2a1a, field: 0x383322, border: 0x707055, mortar: 0x3c382a }, // 10 - gold
];

function getLevelPalette(level: number) {
  return LEVEL_PALETTES[Math.min(level - 1, LEVEL_PALETTES.length - 1)] ?? LEVEL_PALETTES[0];
}

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

function makeStyle(size: number, fill: number | string = "#ffffff"): TextStyle {
  return new TextStyle({
    fontFamily: "monospace",
    fontSize: size,
    fontWeight: "bold",
    fill,
    stroke: { color: "#000000", width: 2 },
    align: "center",
  });
}

// ---------------------------------------------------------------------------
// BreakerRenderer
// ---------------------------------------------------------------------------

export class BreakerRenderer {
  root = new Container();

  // Layers
  private bgLayer = new Container();
  private brickLayer = new Container();
  private entityLayer = new Container();
  private fxLayer = new Container();
  private uiLayer = new Container();

  // Cached graphics
  private bgGfx = new Graphics();
  private brickGfx = new Graphics();
  private entityGfx = new Graphics();
  private fxGfx = new Graphics();
  private uiGfx = new Graphics();

  // UI text nodes
  private scoreText!: Text;
  private livesText!: Text;
  private levelText!: Text;
  private highScoreText!: Text;
  private centerText!: Text;
  private subText!: Text;

  // Screen size
  private sw = 800;
  private sh = 600;

  // FX state
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }[] = [];
  private shakeX = 0;
  private shakeY = 0;
  private goldFlashAlpha = 0;
  private dustMotes: { x: number; y: number; vx: number; vy: number; size: number; phase: number }[] = [];
  private impactRings: { x: number; y: number; age: number; color: number }[] = [];

  // Track last phase/level/combo for transition triggers
  private lastPhase: BreakerPhase | null = null;
  private lastLevel = 0;
  private lastComboMult = 0;

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  build(sw: number, sh: number): void {
    this.sw = sw;
    this.sh = sh;

    this.root.addChild(this.bgLayer, this.brickLayer, this.entityLayer, this.fxLayer, this.uiLayer);
    this.bgLayer.addChild(this.bgGfx);
    this.brickLayer.addChild(this.brickGfx);
    this.entityLayer.addChild(this.entityGfx);
    this.fxLayer.addChild(this.fxGfx);

    // UI texts
    this.scoreText = new Text({ text: "", style: makeStyle(26) });
    this.livesText = new Text({ text: "", style: makeStyle(26) });
    this.levelText = new Text({ text: "", style: makeStyle(26) });
    this.highScoreText = new Text({ text: "", style: makeStyle(19, "#cccccc") });
    this.centerText = new Text({ text: "", style: makeStyle(50, "#ffd700") });
    this.subText = new Text({ text: "", style: makeStyle(26, "#cccccc") });

    this.uiLayer.addChild(this.uiGfx);
    this.uiLayer.addChild(this.scoreText);
    this.uiLayer.addChild(this.livesText);
    this.uiLayer.addChild(this.levelText);
    this.uiLayer.addChild(this.highScoreText);
    this.uiLayer.addChild(this.centerText);
    this.uiLayer.addChild(this.subText);

    this.drawBackground();
  }

  // -----------------------------------------------------------------------
  // Background – medieval castle wall
  // -----------------------------------------------------------------------

  private drawBackground(level = 1): void {
    const g = this.bgGfx;
    g.clear();

    const pal = getLevelPalette(level);

    // Outer bg
    g.rect(0, 0, this.sw, this.sh);
    g.fill(pal.outer);

    // Stone border frame
    const fx = B.FIELD_X;
    const fy = B.FIELD_Y;
    const fw = B.FIELD_W;
    const fh = B.FIELD_H;
    const borderW = 8;

    // Border stones – beveled frame with chiseled depth
    const borderDark = colorDarken(pal.border, 0.7);
    const borderLight = colorLighten(pal.border, 1.2);

    // Top border (beveled)
    g.rect(fx - borderW, fy - borderW, fw + borderW * 2, borderW);
    g.fill(pal.border);
    g.rect(fx - borderW, fy - borderW, fw + borderW * 2, 2);
    g.fill(borderLight); // top highlight
    g.rect(fx - borderW, fy - 2, fw + borderW * 2, 2);
    g.fill(borderDark); // bottom shadow (inner edge)

    // Bottom border
    g.rect(fx - borderW, fy + fh, fw + borderW * 2, borderW);
    g.fill(colorDarken(pal.border, 0.85));
    g.rect(fx - borderW, fy + fh, fw + borderW * 2, 2);
    g.fill(pal.border); // top highlight
    g.rect(fx - borderW, fy + fh + borderW - 2, fw + borderW * 2, 2);
    g.fill(colorDarken(pal.border, 0.6)); // bottom shadow

    // Left border (beveled)
    g.rect(fx - borderW, fy, borderW, fh);
    g.fill(pal.border);
    g.rect(fx - borderW, fy, 2, fh);
    g.fill(borderLight); // outer highlight
    g.rect(fx - 2, fy, 2, fh);
    g.fill(borderDark); // inner shadow

    // Right border (beveled)
    g.rect(fx + fw, fy, borderW, fh);
    g.fill(pal.border);
    g.rect(fx + fw, fy, 2, fh);
    g.fill(borderDark); // inner shadow
    g.rect(fx + fw + borderW - 2, fy, 2, fh);
    g.fill(borderLight); // outer highlight

    // Stone texture on border (joint lines)
    const borderShadow = colorDarken(pal.border, 0.6);
    for (let i = 0; i < fw + borderW * 2; i += 20) {
      g.rect(fx - borderW + i, fy - borderW + 2, 1, borderW - 4);
      g.fill({ color: borderShadow, alpha: 0.4 });
      g.rect(fx - borderW + i, fy + fh + 2, 1, borderW - 4);
      g.fill({ color: borderShadow, alpha: 0.3 });
    }
    for (let j = 0; j < fh; j += 16) {
      g.rect(fx - borderW + 2, fy + j, borderW - 4, 1);
      g.fill({ color: borderShadow, alpha: 0.3 });
      g.rect(fx + fw + 2, fy + j, borderW - 4, 1);
      g.fill({ color: borderShadow, alpha: 0.3 });
    }

    // Corner bosses (decorative circular rivets at frame corners)
    for (const cx of [fx - borderW / 2, fx + fw + borderW / 2]) {
      for (const cy of [fy - borderW / 2, fy + fh + borderW / 2]) {
        g.circle(cx, cy, 4);
        g.fill(borderLight);
        g.circle(cx, cy, 3);
        g.fill(pal.border);
        g.circle(cx - 0.5, cy - 0.5, 1.2);
        g.fill({ color: 0xffffff, alpha: 0.3 });
      }
    }

    // Play area fill – dark castle wall
    g.rect(fx, fy, fw, fh);
    g.fill(pal.field);

    // Varied stone brick wall texture
    const stoneH = 16;
    const stoneMinW = 30;
    const stoneMaxW = 70;
    let seed = 42;
    const seededRand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 1000) / 1000; };
    for (let row = 0; row < fh; row += stoneH) {
      const rowOffset = ((row / stoneH) % 2) * 20;
      let colX = rowOffset;
      while (colX < fw) {
        const sw2 = stoneMinW + seededRand() * (stoneMaxW - stoneMinW);
        const w = Math.min(sw2, fw - colX);
        const shade = seededRand() * 0.06 - 0.03; // slight random brightness per stone
        const stoneColor = shade > 0 ? colorLighten(pal.field, 1 + shade) : colorDarken(pal.field, 1 + shade);
        // Stone body
        g.rect(fx + colX + 1, fy + row + 1, w - 1, stoneH - 1);
        g.fill(stoneColor);
        // Mortar lines
        g.rect(fx + colX, fy + row, w, 1);
        g.fill(pal.mortar);
        g.rect(fx + colX, fy + row, 1, stoneH);
        g.fill(pal.mortar);
        // Subtle highlight on stone top edge
        g.rect(fx + colX + 2, fy + row + 1, w - 3, 1);
        g.fill({ color: 0xffffff, alpha: 0.03 });
        colX += w;
      }
      // Bottom mortar of last row
      if (row + stoneH <= fh) {
        g.rect(fx, fy + row + stoneH - 1, fw, 1);
        g.fill(pal.mortar);
      }
    }

    // Vignette overlay (darker corners, lighter center)
    const vigSize = Math.max(fw, fh);
    for (let ring = 0; ring < 4; ring++) {
      const inset = ring * vigSize * 0.08;
      const alpha = 0.04 * (4 - ring);
      g.rect(fx, fy, fw, inset); g.fill({ color: 0x000000, alpha }); // top
      g.rect(fx, fy + fh - inset, fw, inset); g.fill({ color: 0x000000, alpha }); // bottom
      g.rect(fx, fy + inset, inset, fh - inset * 2); g.fill({ color: 0x000000, alpha }); // left
      g.rect(fx + fw - inset, fy + inset, inset, fh - inset * 2); g.fill({ color: 0x000000, alpha }); // right
    }

    // Battlement silhouettes along top border
    const bSize = 10;
    for (let i = 0; i < fw; i += bSize * 2) {
      g.rect(fx + i, fy - borderW - bSize, bSize, bSize);
      g.fill(colorDarken(pal.border, 0.85));
      g.rect(fx + i, fy - borderW - bSize, bSize, 2);
      g.fill(colorLighten(pal.border, 1.15));
      // Side highlight
      g.rect(fx + i, fy - borderW - bSize, 1, bSize);
      g.fill(colorLighten(pal.border, 1.1));
      g.rect(fx + i + bSize - 1, fy - borderW - bSize, 1, bSize);
      g.fill(colorDarken(pal.border, 0.75));
    }

    // Corner torch brackets (decorative)
    for (const tx of [fx - borderW - 6, fx + fw + borderW - 2]) {
      for (const ty of [fy + 20, fy + fh - 30]) {
        // Bracket
        g.rect(tx, ty, 8, 3);
        g.fill(0x665544);
        g.rect(tx + 2, ty - 8, 4, 8);
        g.fill(0x554433);
        // Flame (static glow baked into background)
        g.circle(tx + 4, ty - 12, 5);
        g.fill({ color: 0xff8800, alpha: 0.25 });
        g.circle(tx + 4, ty - 12, 3);
        g.fill({ color: 0xffcc44, alpha: 0.2 });
      }
    }

    // Initialize ambient dust motes
    this.dustMotes = [];
    for (let i = 0; i < 15; i++) {
      this.dustMotes.push({
        x: fx + Math.random() * fw,
        y: fy + Math.random() * fh,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 4 - 2,
        size: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  render(state: BreakerState, dt: number): void {
    this.detectTransitions(state);
    this.detectComboMilestones(state);
    this.updateParticles(dt);

    this.renderBricks(state);
    this.renderEntities(state);
    this.renderFx(state);
    this.renderUI(state);

    // Apply screen shake
    this.root.x = this.shakeX;
    this.root.y = this.shakeY;
    this.shakeX *= 0.85;
    this.shakeY *= 0.85;
    if (Math.abs(this.shakeX) < 0.5) this.shakeX = 0;
    if (Math.abs(this.shakeY) < 0.5) this.shakeY = 0;

    this.lastPhase = state.phase;
  }

  // -----------------------------------------------------------------------
  // Phase transitions – trigger FX
  // -----------------------------------------------------------------------

  private detectTransitions(state: BreakerState): void {
    // Redraw background on level change
    if (state.level !== this.lastLevel) {
      this.lastLevel = state.level;
      this.drawBackground(state.level);
    }

    if (this.lastPhase === state.phase) return;

    if (state.phase === BreakerPhase.LEVEL_CLEAR) {
      this.triggerGoldenBurst();
    }
    if (state.phase === BreakerPhase.GAME_OVER && this.lastPhase === BreakerPhase.PLAYING) {
      this.triggerShake(8);
    }
  }

  /** Burst particles when combo multiplier increases. */
  private detectComboMilestones(state: BreakerState): void {
    const mult = state.combo >= 10 ? 4 : state.combo >= 6 ? 3 : state.combo >= 3 ? 2 : 1;
    if (mult > this.lastComboMult && mult > 1) {
      const colors = [0xffee44, 0xff8844, 0xff4444]; // 2x, 3x, 4x
      const color = colors[Math.min(mult - 2, colors.length - 1)];
      const cx = B.FIELD_X + B.FIELD_W / 2;
      const cy = B.FIELD_Y + B.FIELD_H - 50;
      const count = 12 + mult * 4;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 80 + mult * 30;
        this.spawnParticle(
          cx, cy,
          Math.cos(angle) * speed, Math.sin(angle) * speed,
          0.6 + mult * 0.1,
          color,
          2 + Math.random() * 2,
        );
      }
      this.triggerShake(mult * 0.8);
    }
    this.lastComboMult = mult;
  }

  // -----------------------------------------------------------------------
  // Bricks
  // -----------------------------------------------------------------------

  private renderBricks(state: BreakerState): void {
    const g = this.brickGfx;
    g.clear();

    const ox = B.FIELD_X;
    const oy = B.FIELD_Y;

    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const bx = ox + brick.col * (B.BRICK_W + B.BRICK_PAD);
      const by = oy + brick.row * (B.BRICK_H + B.BRICK_PAD);
      let baseColor = BRICK_COLORS[brick.type] ?? 0xcc6644;
      // Row-based tinting for Normal bricks — subtle warm/cool alternation
      if (brick.type === BrickType.NORMAL) {
        const rowTint = [0xcc6644, 0xbb7744, 0xcc7755, 0xbb6633, 0xcc6644, 0xaa7744, 0xcc7766, 0xbb5533];
        baseColor = rowTint[brick.row % rowTint.length];
      }

      // Main body
      g.rect(bx, by, B.BRICK_W, B.BRICK_H);
      g.fill(baseColor);

      // Inner stone grain (subtle noise pattern per brick, seeded by position)
      const grainSeed = brick.col * 7 + brick.row * 13;
      for (let gi = 0; gi < 3; gi++) {
        const gx = ((grainSeed + gi * 17) % (B.BRICK_W - 8)) + 4;
        const gy = ((grainSeed + gi * 11) % (B.BRICK_H - 4)) + 2;
        const gw = 4 + ((grainSeed + gi * 23) % 6);
        g.rect(bx + gx, by + gy, gw, 1);
        g.fill({ color: 0x000000, alpha: 0.04 });
        g.rect(bx + gx, by + gy + 1, gw, 1);
        g.fill({ color: 0xffffff, alpha: 0.02 });
      }

      // Beveled 3D look: top-left highlight, bottom-right shadow
      g.rect(bx, by, B.BRICK_W, 2);
      g.fill(colorLighten(baseColor, 1.4));
      g.rect(bx, by, 2, B.BRICK_H);
      g.fill(colorLighten(baseColor, 1.3));
      g.rect(bx, by + B.BRICK_H - 2, B.BRICK_W, 2);
      g.fill(colorDarken(baseColor, 0.6));
      g.rect(bx + B.BRICK_W - 2, by, 2, B.BRICK_H);
      g.fill(colorDarken(baseColor, 0.7));

      // Inner bevel – secondary light edge for deeper 3D
      g.rect(bx + 2, by + 2, B.BRICK_W - 4, 1);
      g.fill({ color: 0xffffff, alpha: 0.08 });
      g.rect(bx + 2, by + B.BRICK_H - 3, B.BRICK_W - 4, 1);
      g.fill({ color: 0x000000, alpha: 0.06 });

      // Cracked appearance for damaged STRONG / METAL (scales with damage)
      if (brick.type === BrickType.STRONG || brick.type === BrickType.METAL) {
        const maxHp = brick.type === BrickType.STRONG ? 2 : 3;
        const damageFrac = 1 - brick.hp / maxHp; // 0 = pristine, 1 = about to break
        if (damageFrac > 0) {
          const crackAlpha = 0.3 + damageFrac * 0.4;
          // Primary crack
          g.moveTo(bx + B.BRICK_W * 0.3, by);
          g.lineTo(bx + B.BRICK_W * 0.45, by + B.BRICK_H * 0.4);
          g.lineTo(bx + B.BRICK_W * 0.65, by + B.BRICK_H);
          g.stroke({ color: 0x000000, width: 1, alpha: crackAlpha });
          // Secondary cracks appear at higher damage
          if (damageFrac > 0.4) {
            g.moveTo(bx + B.BRICK_W * 0.6, by);
            g.lineTo(bx + B.BRICK_W * 0.5, by + B.BRICK_H * 0.6);
            g.lineTo(bx + B.BRICK_W * 0.3, by + B.BRICK_H);
            g.stroke({ color: 0x000000, width: 0.8, alpha: crackAlpha * 0.7 });
            // Branch crack
            g.moveTo(bx + B.BRICK_W * 0.45, by + B.BRICK_H * 0.4);
            g.lineTo(bx + B.BRICK_W * 0.75, by + B.BRICK_H * 0.35);
            g.stroke({ color: 0x000000, width: 0.6, alpha: crackAlpha * 0.5 });
          }
          // Damage darkening overlay
          g.rect(bx + 1, by + 1, B.BRICK_W - 2, B.BRICK_H - 2);
          g.fill({ color: 0x000000, alpha: damageFrac * 0.15 });
        }
      }

      // Metal rivets
      if (brick.type === BrickType.METAL) {
        for (const rx of [5, B.BRICK_W - 5]) {
          for (const ry of [5, B.BRICK_H - 5]) {
            g.circle(bx + rx, by + ry, 1.5);
            g.fill(0x8888aa);
            g.circle(bx + rx - 0.4, by + ry - 0.4, 0.6);
            g.fill({ color: 0xddddee, alpha: 0.5 });
          }
        }
        // Horizontal seam
        g.rect(bx + 8, by + Math.floor(B.BRICK_H / 2), B.BRICK_W - 16, 1);
        g.fill({ color: 0x000000, alpha: 0.15 });
      }

      // Gold shimmer with animated sparkle
      if (brick.type === BrickType.GOLD) {
        const t = Date.now() * 0.001;
        const shimmer = 0.25 + Math.sin(t * 3 + brick.col * 1.5) * 0.15;
        g.rect(bx + 2, by + 2, B.BRICK_W - 4, B.BRICK_H - 4);
        g.fill({ color: 0xffffff, alpha: shimmer });
        // Traveling sparkle highlight
        const sparkX = bx + ((t * 40 + brick.col * 17) % B.BRICK_W);
        g.circle(sparkX, by + B.BRICK_H / 2, 2);
        g.fill({ color: 0xffffff, alpha: 0.4 + Math.sin(t * 8 + brick.row) * 0.2 });
        // Crown/gem emblem
        g.rect(bx + B.BRICK_W / 2 - 4, by + 3, 8, 2);
        g.fill({ color: 0xffee88, alpha: 0.5 });
        for (let p = 0; p < 3; p++) {
          g.rect(bx + B.BRICK_W / 2 - 3 + p * 3, by + 1, 2, 3);
          g.fill({ color: 0xffee88, alpha: 0.4 });
        }
      }

      // Explosive – animated pulsing danger icon
      if (brick.type === BrickType.EXPLOSIVE) {
        const cx = bx + B.BRICK_W / 2;
        const cy = by + B.BRICK_H / 2;
        const pulse = 1 + Math.sin(Date.now() * 0.008 + brick.col * 2) * 0.15;
        // Outer danger glow
        g.circle(cx, cy, 6 * pulse);
        g.fill({ color: 0xff2200, alpha: 0.15 });
        // Flame body
        g.circle(cx, cy - 1, 4 * pulse);
        g.fill({ color: 0xffaa00, alpha: 0.85 });
        g.circle(cx, cy + 1, 3 * pulse);
        g.fill({ color: 0xff4400, alpha: 0.75 });
        // Hot center
        g.circle(cx, cy - 1, 1.5);
        g.fill({ color: 0xffee88, alpha: 0.7 });
      }

      // Strong brick pattern (diagonal lines)
      if (brick.type === BrickType.STRONG) {
        for (let s = 0; s < B.BRICK_W; s += 8) {
          g.moveTo(bx + s, by);
          g.lineTo(bx + s + B.BRICK_H, by + B.BRICK_H);
          g.stroke({ color: 0x000000, width: 0.5, alpha: 0.08 });
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Entities: paddle, balls, power-ups, lasers
  // -----------------------------------------------------------------------

  private renderEntities(state: BreakerState): void {
    const g = this.entityGfx;
    g.clear();

    const ox = B.FIELD_X;
    const oy = B.FIELD_Y;

    // --- Paddle (knight's shield shape) ---
    {
      const px = ox + state.paddle.x;
      const py = oy + B.PADDLE_Y;
      const pw = state.paddle.width;
      const ph = B.PADDLE_H;
      const isWide = state.paddle.wideTimer > 0;
      const hasLaser = state.paddle.laserTimer > 0;

      // Momentum trail (faint ghosts behind fast-moving paddle)
      const paddleSpeed = Math.abs(state.paddle.vx);
      if (paddleSpeed > 80) {
        for (let tr = 1; tr <= 3; tr++) {
          const offset = -Math.sign(state.paddle.vx) * tr * Math.min(paddleSpeed * 0.008, 4);
          const trAlpha = Math.min(0.08, paddleSpeed / 5000) / tr;
          g.roundRect(px - pw / 2 + offset, py, pw, ph, 4);
          g.fill({ color: 0xaabbdd, alpha: trAlpha });
        }
      }

      // --- Heraldic shield shape ---
      const shieldBase = isWide ? 0x5588cc : 0x667788;
      const shieldLight = isWide ? 0x77aadd : 0x8899aa;
      const shieldDark = isWide ? 0x336699 : 0x445566;
      const hw = pw / 2;

      // Shield outline path: flat top, tapered sides, pointed bottom
      g.moveTo(px - hw, py);
      g.lineTo(px + hw, py);
      g.lineTo(px + hw, py + ph * 0.5);
      g.lineTo(px, py + ph + 4); // pointed bottom
      g.lineTo(px - hw, py + ph * 0.5);
      g.closePath();
      g.fill(shieldBase);

      // Upper half lighter (metallic)
      g.moveTo(px - hw + 1, py + 1);
      g.lineTo(px + hw - 1, py + 1);
      g.lineTo(px + hw - 1, py + ph * 0.35);
      g.lineTo(px - hw + 1, py + ph * 0.35);
      g.closePath();
      g.fill({ color: shieldLight, alpha: 0.5 });

      // Top highlight edge
      g.rect(px - hw + 2, py + 1, pw - 4, 2);
      g.fill({ color: 0xffffff, alpha: 0.3 });
      // Left edge highlight
      g.moveTo(px - hw, py + 1);
      g.lineTo(px - hw + 2, py + 1);
      g.lineTo(px - hw + 2, py + ph * 0.45);
      g.lineTo(px - hw, py + ph * 0.5);
      g.closePath();
      g.fill({ color: 0xffffff, alpha: 0.12 });
      // Right edge shadow
      g.moveTo(px + hw, py + 1);
      g.lineTo(px + hw - 2, py + 1);
      g.lineTo(px + hw - 2, py + ph * 0.45);
      g.lineTo(px + hw, py + ph * 0.5);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.12 });

      // Shield emblem — heraldic cross with border
      const ecx = px, ecy = py + ph * 0.35;
      // Cross arms
      g.rect(ecx - 1.5, ecy - 5, 3, 10);
      g.fill({ color: 0xccccdd, alpha: 0.5 });
      g.rect(ecx - 7, ecy - 1, 14, 2);
      g.fill({ color: 0xccccdd, alpha: 0.5 });
      // Center gem
      g.circle(ecx, ecy, 2);
      g.fill(shieldDark);
      g.circle(ecx, ecy, 1.5);
      g.fill({ color: 0xffdd44, alpha: 0.7 });
      g.circle(ecx - 0.3, ecy - 0.3, 0.6);
      g.fill({ color: 0xffffff, alpha: 0.5 });

      // Edge zone markers (rivets at sides)
      const rivetColor = isWide ? 0x88bbee : 0x999999;
      for (const side of [-1, 1]) {
        const rx = px + side * (hw - 5);
        const ry = py + ph * 0.3;
        g.circle(rx, ry, 2);
        g.fill(rivetColor);
        g.circle(rx - 0.4, ry - 0.4, 0.7);
        g.fill({ color: 0xffffff, alpha: 0.4 });
      }

      // Shield outline stroke
      g.moveTo(px - hw, py);
      g.lineTo(px + hw, py);
      g.lineTo(px + hw, py + ph * 0.5);
      g.lineTo(px, py + ph + 4);
      g.lineTo(px - hw, py + ph * 0.5);
      g.closePath();
      g.stroke({ color: colorLighten(shieldBase, 1.3), width: 1, alpha: 0.4 });

      // Wide shimmer aura
      if (isWide) {
        g.roundRect(px - hw - 3, py - 3, pw + 6, ph + 10, 6);
        g.fill({ color: 0x44aaff, alpha: 0.1 + Math.sin(Date.now() * 0.004) * 0.04 });
      }

      // Laser barrels
      if (hasLaser) {
        const laserAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
        for (const side of [-1, 1]) {
          const lbx = px + side * (hw - 4);
          g.rect(lbx - 1.5, py - 3, 3, 5);
          g.fill({ color: 0x884444, alpha: 0.8 });
          g.circle(lbx, py - 3, 2);
          g.fill({ color: 0xff4444, alpha: laserAlpha });
          g.circle(lbx, py - 3, 1);
          g.fill({ color: 0xffaaaa, alpha: laserAlpha * 0.6 });
        }
      }

      // Pulsing glow when ball is waiting on paddle
      if (state.ballOnPaddle) {
        const pulse = 0.1 + Math.sin(Date.now() * 0.005) * 0.06;
        g.roundRect(px - hw - 5, py - 4, pw + 10, ph + 12, 8);
        g.fill({ color: 0xffdd44, alpha: pulse });
      }
    }

    // --- Balls ---
    const activeBallCount = state.balls.filter(b => b.active).length;
    for (const ball of state.balls) {
      if (!ball.active) continue;
      const bx = ox + ball.x;
      const by = oy + ball.y;
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const speedFrac = Math.min(1, spd / B.BALL_MAX_SPEED);

      if (ball.fireball) {
        // Flame trail particles
        for (let i = 0; i < 3; i++) {
          this.spawnParticle(
            bx + (Math.random() - 0.5) * 6,
            by + (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 30,
            Math.random() * 40 + 20,
            0.3,
            Math.random() > 0.5 ? 0xff6600 : 0xffaa00,
            3 + Math.random() * 2,
          );
        }
        // Outer heat haze
        g.circle(bx, by, ball.radius + 5);
        g.fill({ color: 0xff4400, alpha: 0.1 });
        // Orange fireball orb
        g.circle(bx, by, ball.radius + 2);
        g.fill({ color: 0xff8800, alpha: 0.45 });
        g.circle(bx, by, ball.radius);
        g.fill(0xff6600);
        // Hot white core
        g.circle(bx - 0.5, by - 0.5, ball.radius * 0.4);
        g.fill({ color: 0xffee88, alpha: 0.8 });
      } else {
        // Outer glow (intensity scales with speed)
        g.circle(bx, by, ball.radius + 5 + speedFrac * 3);
        g.fill({ color: 0xaaccff, alpha: 0.08 + speedFrac * 0.08 });
        // Mid glow
        g.circle(bx, by, ball.radius + 3);
        g.fill({ color: 0xbbddff, alpha: 0.2 });
        // Solid ball
        g.circle(bx, by, ball.radius);
        g.fill(0xeeeeff);
        // Specular highlight
        g.circle(bx - 1.2, by - 1.2, ball.radius * 0.4);
        g.fill({ color: 0xffffff, alpha: 0.8 });
        // Bottom shadow
        g.circle(bx + 0.5, by + 0.8, ball.radius * 0.35);
        g.fill({ color: 0x8888bb, alpha: 0.25 });
      }

      // Multi-segment trail (3 ghost balls fading behind)
      if (spd > 30) {
        const ndx = ball.vx / spd;
        const ndy = ball.vy / spd;
        const trailColor = ball.fireball ? 0xff4400 : 0xaaccff;
        for (let t = 1; t <= 3; t++) {
          const dist = t * (5 + speedFrac * 4);
          const ta = (0.12 - t * 0.03) * (0.5 + speedFrac * 0.5);
          g.circle(bx - ndx * dist, by - ndy * dist, ball.radius * (1 - t * 0.15));
          g.fill({ color: trailColor, alpha: ta });
        }
      }

      // Multi-ball ring indicator when >1 ball active
      if (activeBallCount > 1) {
        g.circle(bx, by, ball.radius + 7);
        g.stroke({ color: 0x44ff88, width: 0.8, alpha: 0.2 + Math.sin(Date.now() * 0.006 + ball.x) * 0.1 });
      }
    }

    // --- Launch angle preview (when ball is on paddle) ---
    if (state.ballOnPaddle && state.balls.length > 0) {
      const b = state.balls[0];
      if (b.vx === 0 && b.vy === 0) {
        const bx = ox + b.x;
        const by = oy + b.y;
        const aimAngle = -Math.PI / 2 + state.aimDir * (Math.PI / 6);
        const aimDx = Math.cos(aimAngle);
        const aimDy = Math.sin(aimAngle);
        const charging = state.launchCharging;
        const charge = state.launchCharge;

        // Trajectory color intensifies with charge
        const trajColor = charging ? 0xffdd44 : (state.aimDir !== 0 ? 0xffdd44 : 0xaaccff);
        const trajAlpha = charging ? 0.4 + charge * 0.4 : 0.35;
        const trajLen = 80 + (charging ? charge * 50 : 0);

        // Bold trajectory line
        g.moveTo(bx, by);
        g.lineTo(bx + aimDx * trajLen, by + aimDy * trajLen);
        g.stroke({ color: trajColor, width: charging ? 1.5 + charge : 1, alpha: trajAlpha });

        // Dotted markers along trajectory
        for (let d = 1; d < 8; d++) {
          const t = d / 8;
          const dotX = bx + aimDx * trajLen * t;
          const dotY = by + aimDy * trajLen * t;
          g.circle(dotX, dotY, 1.5 + (charging ? charge * 0.8 : 0));
          g.fill({ color: trajColor, alpha: trajAlpha * (1 - t * 0.6) });
        }

        // Crosshair reticle at trajectory end
        const cx = bx + aimDx * trajLen;
        const cy = by + aimDy * trajLen;
        const reticleSize = 5 + (charging ? charge * 3 : 0);
        g.circle(cx, cy, reticleSize);
        g.stroke({ color: trajColor, width: 1, alpha: trajAlpha * 0.7 });
        // Cross lines
        g.moveTo(cx - reticleSize - 2, cy).lineTo(cx + reticleSize + 2, cy);
        g.stroke({ color: trajColor, width: 0.8, alpha: trajAlpha * 0.5 });
        g.moveTo(cx, cy - reticleSize - 2).lineTo(cx, cy + reticleSize + 2);
        g.stroke({ color: trajColor, width: 0.8, alpha: trajAlpha * 0.5 });

        // Spread cone (faint lines for alternate angles, hidden when aiming that direction)
        const leftAngle = -Math.PI / 2 - Math.PI / 6;
        const rightAngle = -Math.PI / 2 + Math.PI / 6;
        g.moveTo(bx, by - 8);
        g.lineTo(bx + Math.cos(leftAngle) * 60, by + Math.sin(leftAngle) * 60);
        g.stroke({ color: 0xffffff, width: 0.5, alpha: state.aimDir === -1 ? 0.0 : 0.06 });
        g.moveTo(bx, by - 8);
        g.lineTo(bx + Math.cos(rightAngle) * 60, by + Math.sin(rightAngle) * 60);
        g.stroke({ color: 0xffffff, width: 0.5, alpha: state.aimDir === 1 ? 0.0 : 0.06 });

        // Power charge bar below paddle
        if (charging) {
          const padX = ox + state.paddle.x;
          const padY = oy + B.PADDLE_Y;
          const barW = state.paddle.width * 0.7;
          const barH = 4;
          // Background
          g.rect(padX - barW / 2, padY + B.PADDLE_H + 4, barW, barH);
          g.fill({ color: 0x222222, alpha: 0.6 });
          // Fill
          const fillColor = charge > 0.85 ? 0xff4444 : charge > 0.5 ? 0xffaa22 : 0xffdd44;
          g.rect(padX - barW / 2, padY + B.PADDLE_H + 4, barW * charge, barH);
          g.fill(fillColor);
          // Border
          g.rect(padX - barW / 2, padY + B.PADDLE_H + 4, barW, barH);
          g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
        }

        // Hint text
        const hint = charging ? "RELEASE to launch" : (state.aimDir === 0 ? "HOLD SPACE  |  ←/→ aim" : "HOLD SPACE to launch");
        const hintTxt = new Text({
          text: hint,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: charging ? 0xffdd44 : 0xaaaaaa }),
        });
        hintTxt.anchor.set(0.5);
        hintTxt.position.set(bx, by - 24);
        this.entityLayer.addChild(hintTxt);
      }
    }

    // --- Combo display (during play) ---
    if (state.combo > 1) {
      const comboMult = state.combo >= 10 ? 4 : state.combo >= 6 ? 3 : state.combo >= 3 ? 2 : 1;
      const comboColors = [0xffffff, 0xffee44, 0xff8844, 0xff4444];
      const cc = Math.min(comboMult - 1, comboColors.length - 1);
      const comboTxt = new Text({
        text: `${comboMult}x COMBO (${state.combo} hits)`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 19, fill: comboColors[cc], fontWeight: "bold",
          dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }),
      });
      comboTxt.anchor.set(0.5);
      comboTxt.position.set(ox + B.FIELD_W / 2, oy + B.FIELD_H - 30);
      this.uiLayer.addChild(comboTxt);
    }

    // --- Power-ups ---
    for (const pu of state.powerUps) {
      if (pu.collected) continue;
      const px = ox + pu.x;
      const py = oy + pu.y;
      const color = POWERUP_COLORS[pu.type] ?? 0xffffff;
      const t = Date.now() * 0.001;
      const bob = Math.sin(t * 4 + pu.x * 0.1) * 2;

      // Rotating glow ring
      g.circle(px, py + bob, 12);
      g.stroke({ color, width: 1, alpha: 0.25 + Math.sin(t * 3 + pu.y) * 0.1 });

      // Outer glow
      g.circle(px, py + bob, 14);
      g.fill({ color, alpha: 0.08 });

      // Capsule body
      g.roundRect(px - 10, py + bob - 7, 20, 14, 5);
      g.fill(colorDarken(color, 0.7));
      g.roundRect(px - 9, py + bob - 6, 18, 12, 4);
      g.fill(color);

      // Specular highlight on top half
      g.roundRect(px - 8, py + bob - 5, 16, 5, 3);
      g.fill({ color: 0xffffff, alpha: 0.35 });

      // Letter icon (bold dot + cross for different types)
      this.drawPowerUpIcon(g, px, py + bob, pu.type);
    }

    // --- Lasers ---
    for (const laser of state.lasers) {
      if (!laser.active) continue;
      const lx = ox + laser.x;
      const ly = oy + laser.y;

      // Wide bloom glow
      g.rect(lx - 6, ly - 3, 12, 18);
      g.fill({ color: 0xff0000, alpha: 0.08 });
      // Mid glow
      g.rect(lx - 3, ly - 1, 6, 14);
      g.fill({ color: 0xff2222, alpha: 0.2 });
      // Beam body
      g.rect(lx - 2, ly, 4, 12);
      g.fill(0xff4444);
      // Hot core
      g.rect(lx - 0.5, ly + 1, 1, 10);
      g.fill(0xffcccc);
      // Tip spark
      g.circle(lx, ly, 2.5);
      g.fill({ color: 0xffaaaa, alpha: 0.6 });
    }
  }

  /** Draw a recognizable icon per power-up type. */
  private drawPowerUpIcon(g: Graphics, cx: number, cy: number, type: string): void {
    switch (type) {
      case "wide": // Horizontal arrows <->
        g.rect(cx - 5, cy - 0.5, 10, 1); g.fill(0xffffff);
        g.moveTo(cx - 5, cy); g.lineTo(cx - 3, cy - 2); g.lineTo(cx - 3, cy + 2);
        g.fill(0xffffff);
        g.moveTo(cx + 5, cy); g.lineTo(cx + 3, cy - 2); g.lineTo(cx + 3, cy + 2);
        g.fill(0xffffff);
        break;
      case "multi": // 3 dots (balls)
        g.circle(cx - 3, cy, 2); g.fill(0xffffff);
        g.circle(cx + 3, cy, 2); g.fill(0xffffff);
        g.circle(cx, cy - 3, 2); g.fill(0xffffff);
        break;
      case "fireball": // Flame
        g.circle(cx, cy - 1, 3); g.fill(0xffffff);
        g.circle(cx, cy + 1, 2); g.fill({ color: 0xffffff, alpha: 0.7 });
        break;
      case "slow": // Clock hands
        g.circle(cx, cy, 4); g.stroke({ color: 0xffffff, width: 1 });
        g.moveTo(cx, cy); g.lineTo(cx, cy - 3); g.stroke({ color: 0xffffff, width: 1 });
        g.moveTo(cx, cy); g.lineTo(cx + 2, cy); g.stroke({ color: 0xffffff, width: 1 });
        break;
      case "life": // Plus sign
        g.rect(cx - 0.8, cy - 3, 1.6, 6); g.fill(0xffffff);
        g.rect(cx - 3, cy - 0.8, 6, 1.6); g.fill(0xffffff);
        break;
      case "laser": // Lightning bolt
        g.moveTo(cx - 2, cy - 4); g.lineTo(cx + 1, cy - 1); g.lineTo(cx - 1, cy);
        g.lineTo(cx + 2, cy + 4);
        g.stroke({ color: 0xffffff, width: 1.5 });
        break;
      default:
        g.circle(cx, cy, 2); g.fill(0xffffff);
    }
  }

  // -----------------------------------------------------------------------
  // FX layer – particles, golden flash
  // -----------------------------------------------------------------------

  private renderFx(_state: BreakerState): void {
    const g = this.fxGfx;
    g.clear();
    const t = Date.now() * 0.001;

    // Ambient dust motes drifting through the play area
    for (const m of this.dustMotes) {
      m.x += m.vx * 0.016;
      m.y += m.vy * 0.016;
      // Wrap around
      if (m.x < B.FIELD_X) m.x = B.FIELD_X + B.FIELD_W;
      if (m.x > B.FIELD_X + B.FIELD_W) m.x = B.FIELD_X;
      if (m.y < B.FIELD_Y) m.y = B.FIELD_Y + B.FIELD_H;
      if (m.y > B.FIELD_Y + B.FIELD_H) m.y = B.FIELD_Y;
      const flicker = 0.08 + Math.sin(t * 2 + m.phase) * 0.04;
      g.circle(m.x, m.y, m.size);
      g.fill({ color: 0xddccaa, alpha: flicker });
    }

    // Animated torch flames on corners
    const fx = B.FIELD_X;
    const fw = B.FIELD_W;
    const borderW = 8;
    for (const tx of [fx - borderW - 2, fx + fw + borderW + 2]) {
      for (const ty of [B.FIELD_Y + 8, B.FIELD_Y + B.FIELD_H - 22]) {
        const flick = Math.sin(t * 6 + tx * 0.1 + ty * 0.2) * 2;
        const flick2 = Math.cos(t * 8 + ty * 0.3) * 1.5;
        // Wide ambient light cast on nearby wall
        g.circle(tx, ty, 20);
        g.fill({ color: 0xff8833, alpha: 0.03 + Math.sin(t * 3 + tx) * 0.01 });
        // Outer glow
        g.circle(tx, ty + flick, 8 + flick2);
        g.fill({ color: 0xff6600, alpha: 0.15 + Math.sin(t * 4 + tx) * 0.05 });
        // Mid flame
        g.circle(tx + flick * 0.2, ty + flick * 0.6 - 2, 5 + flick2 * 0.4);
        g.fill({ color: 0xff9922, alpha: 0.3 });
        // Inner flame
        g.circle(tx, ty + flick * 0.5, 3 + flick2 * 0.5);
        g.fill({ color: 0xffcc44, alpha: 0.35 + Math.sin(t * 5) * 0.1 });
        // Hot core
        g.circle(tx, ty + flick * 0.3, 1.8);
        g.fill({ color: 0xffffcc, alpha: 0.4 });
        // Smoke wisps rising from torch (small fading circles)
        for (let s = 0; s < 3; s++) {
          const smokeT = (t * 1.5 + s * 1.3 + tx * 0.01) % 3;
          const smokeY = ty - 14 - smokeT * 18;
          const smokeX = tx + Math.sin(smokeT * 2 + s) * 4;
          const smokeAlpha = Math.max(0, 0.06 - smokeT * 0.02);
          if (smokeAlpha > 0) {
            g.circle(smokeX, smokeY, 2 + smokeT * 1.5);
            g.fill({ color: 0x888888, alpha: smokeAlpha });
          }
        }
      }
    }

    // Impact rings (expanding fade-out circles)
    for (let i = this.impactRings.length - 1; i >= 0; i--) {
      const ring = this.impactRings[i];
      ring.age += 0.03;
      if (ring.age >= 1) {
        this.impactRings.splice(i, 1);
        continue;
      }
      const radius = 4 + ring.age * 20;
      const alpha = (1 - ring.age) * 0.4;
      g.circle(ring.x, ring.y, radius);
      g.stroke({ color: ring.color, width: 1.5 * (1 - ring.age), alpha });
    }

    // Particles
    for (const p of this.particles) {
      const sz = p.size * Math.max(0, p.life);
      g.circle(p.x, p.y, sz);
      g.fill({ color: p.color, alpha: Math.max(0, p.life) });
      // Soft glow behind larger particles
      if (sz > 2.5) {
        g.circle(p.x, p.y, sz * 1.8);
        g.fill({ color: p.color, alpha: Math.max(0, p.life * 0.15) });
      }
    }

    // Golden flash overlay
    if (this.goldFlashAlpha > 0.01) {
      g.rect(B.FIELD_X, B.FIELD_Y, B.FIELD_W, B.FIELD_H);
      g.fill({ color: 0xffd700, alpha: this.goldFlashAlpha });
    }
  }

  // -----------------------------------------------------------------------
  // UI: score, lives, level, center messages
  // -----------------------------------------------------------------------

  private renderUI(state: BreakerState): void {
    const g = this.uiGfx;
    g.clear();

    const fx = B.FIELD_X;
    const fy = B.FIELD_Y;
    const fw = B.FIELD_W;

    // HUD panel background (top bar)
    g.roundRect(fx - 8, fy - 42, fw + 16, 36, 4);
    g.fill({ color: 0x111122, alpha: 0.6 });
    g.roundRect(fx - 8, fy - 42, fw + 16, 36, 4);
    g.stroke({ color: 0x444466, width: 1, alpha: 0.4 });
    // Panel highlight
    g.rect(fx - 6, fy - 41, fw + 12, 1);
    g.fill({ color: 0x666688, alpha: 0.3 });

    // Score top-right
    this.scoreText.text = `SCORE ${state.score}`;
    this.scoreText.x = fx + fw - 10;
    this.scoreText.y = fy - 35;
    this.scoreText.anchor.set(1, 0);

    // Lives top-left as detailed shield icons
    this.livesText.text = "";
    for (let i = 0; i < state.lives; i++) {
      const sx = fx + i * 22 + 10;
      const sy = fy - 34;
      // Shield body
      g.roundRect(sx - 7, sy, 14, 16, 3);
      g.fill(0x667788);
      // Shield top highlight
      g.roundRect(sx - 6, sy + 1, 12, 5, 2);
      g.fill({ color: 0xaabbcc, alpha: 0.4 });
      // Shield bottom shadow
      g.roundRect(sx - 6, sy + 10, 12, 5, 2);
      g.fill({ color: 0x334455, alpha: 0.3 });
      // Center cross
      g.rect(sx - 0.5, sy + 4, 1, 8);
      g.fill({ color: 0xdddddd, alpha: 0.3 });
      g.rect(sx - 3, sy + 7, 6, 1);
      g.fill({ color: 0xdddddd, alpha: 0.3 });
      // Border
      g.roundRect(sx - 7, sy, 14, 16, 3);
      g.stroke({ color: 0x889999, width: 0.8, alpha: 0.5 });
    }

    // Level top-center
    this.levelText.text = `LEVEL ${state.level}`;
    this.levelText.x = fx + fw / 2;
    this.levelText.y = fy - 35;
    this.levelText.anchor.set(0.5, 0);

    // High score
    this.highScoreText.text = `HI ${state.highScore}`;
    this.highScoreText.x = fx + fw - 10;
    this.highScoreText.y = fy - 18;
    this.highScoreText.anchor.set(1, 0);

    // Active power-up timer bars (bottom of field)
    const timerBars: { label: string; frac: number; color: number }[] = [];
    if (state.paddle.wideTimer > 0)
      timerBars.push({ label: "WIDE", frac: state.paddle.wideTimer / B.WIDE_DURATION, color: 0x44aaff });
    if (state.slowTimer > 0)
      timerBars.push({ label: "SLOW", frac: state.slowTimer / B.SLOW_DURATION, color: 0x66ccff });
    if (state.paddle.laserTimer > 0)
      timerBars.push({ label: "LASER", frac: state.paddle.laserTimer / B.LASER_DURATION, color: 0xff4444 });
    if (state.balls.some(b => b.fireball))
      timerBars.push({ label: "FIRE", frac: 1, color: 0xff6622 });

    if (timerBars.length > 0) {
      const barW = 90;
      const barH = 6;
      const totalW = timerBars.length * (barW + 8);
      let startX = fx + fw / 2 - totalW / 2;
      const barY = fy + B.FIELD_H + 8;

      for (const bar of timerBars) {
        // Background
        g.roundRect(startX, barY, barW, barH, 2);
        g.fill({ color: 0x111122, alpha: 0.6 });
        // Fill
        g.roundRect(startX, barY, barW * bar.frac, barH, 2);
        g.fill({ color: bar.color, alpha: 0.7 });
        // Border
        g.roundRect(startX, barY, barW, barH, 2);
        g.stroke({ color: bar.color, width: 0.5, alpha: 0.4 });
        // Label
        const labelTxt = new Text({
          text: bar.label,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: bar.color, fontWeight: "bold" }),
        });
        labelTxt.anchor.set(0.5, 1);
        labelTxt.position.set(startX + barW / 2, barY - 1);
        this.uiLayer.addChild(labelTxt);
        startX += barW + 8;
      }
    }

    // --- Center messages by phase ---
    this.centerText.text = "";
    this.subText.text = "";
    const cx = fx + fw / 2;
    const cy = fy + B.FIELD_H / 2;

    // Draw center panel backdrop for overlay screens
    if (state.phase === BreakerPhase.MENU || state.phase === BreakerPhase.PAUSED ||
        state.phase === BreakerPhase.GAME_OVER || state.phase === BreakerPhase.VICTORY ||
        state.phase === BreakerPhase.LEVEL_CLEAR) {
      // Dimming overlay
      g.rect(fx, fy, fw, B.FIELD_H);
      g.fill({ color: 0x000000, alpha: 0.4 });
      // Center panel
      const panelW = 320;
      const panelH = state.phase === BreakerPhase.PAUSED || state.phase === BreakerPhase.LEVEL_CLEAR ? 60 : 140;
      g.roundRect(cx - panelW / 2, cy - panelH / 2 - 10, panelW, panelH, 6);
      g.fill({ color: 0x1a1a2e, alpha: 0.85 });
      g.roundRect(cx - panelW / 2, cy - panelH / 2 - 10, panelW, panelH, 6);
      g.stroke({ color: 0x555577, width: 1.5, alpha: 0.6 });
      // Panel top highlight
      g.rect(cx - panelW / 2 + 4, cy - panelH / 2 - 9, panelW - 8, 1);
      g.fill({ color: 0x8888aa, alpha: 0.3 });
      // Corner ornaments
      for (const ox2 of [-panelW / 2 + 6, panelW / 2 - 6]) {
        for (const oy2 of [-panelH / 2 - 4, panelH / 2 - 16]) {
          g.circle(cx + ox2, cy + oy2, 2.5);
          g.fill({ color: 0x666688, alpha: 0.5 });
          g.circle(cx + ox2 - 0.3, cy + oy2 - 0.3, 0.8);
          g.fill({ color: 0xaaaacc, alpha: 0.3 });
        }
      }
    }

    switch (state.phase) {
      case BreakerPhase.MENU:
        this.centerText.text = "GRAIL BREAKER";
        this.centerText.x = cx;
        this.centerText.y = cy - 40;
        this.centerText.anchor.set(0.5, 0.5);
        this.subText.text = `HIGH SCORE: ${state.highScore}\n\nPRESS SPACE TO START`;
        this.subText.x = cx;
        this.subText.y = cy + 20;
        this.subText.anchor.set(0.5, 0.5);
        break;

      case BreakerPhase.PAUSED:
        this.centerText.text = "PAUSED";
        this.centerText.x = cx;
        this.centerText.y = cy;
        this.centerText.anchor.set(0.5, 0.5);
        break;

      case BreakerPhase.LEVEL_CLEAR:
        this.centerText.text = "LEVEL CLEAR!";
        this.centerText.x = cx;
        this.centerText.y = cy;
        this.centerText.anchor.set(0.5, 0.5);
        break;

      case BreakerPhase.GAME_OVER:
        this.centerText.text = "GAME OVER";
        this.centerText.x = cx;
        this.centerText.y = cy - 30;
        this.centerText.anchor.set(0.5, 0.5);
        const comboStr = state.bestCombo > 1 ? `  BEST COMBO: ${state.bestCombo}x` : "";
        this.subText.text = `SCORE: ${state.score}  LEVEL: ${state.level}${comboStr}\n\nPRESS SPACE TO RESTART`;
        this.subText.x = cx;
        this.subText.y = cy + 20;
        this.subText.anchor.set(0.5, 0.5);
        break;

      case BreakerPhase.VICTORY:
        this.centerText.text = "VICTORY!\nTHE GRAIL IS YOURS!";
        this.centerText.x = cx;
        this.centerText.y = cy - 30;
        this.centerText.anchor.set(0.5, 0.5);
        const vCombo = state.bestCombo > 1 ? `  BEST COMBO: ${state.bestCombo}x` : "";
        this.subText.text = `FINAL SCORE: ${state.score}${vCombo}\n\nPRESS SPACE TO PLAY AGAIN`;
        this.subText.x = cx;
        this.subText.y = cy + 40;
        this.subText.anchor.set(0.5, 0.5);
        // Celebration particles
        if (Math.random() < 0.3) {
          this.spawnParticle(
            B.FIELD_X + Math.random() * B.FIELD_W,
            B.FIELD_Y + Math.random() * B.FIELD_H,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 80,
            1.2,
            Math.random() > 0.5 ? 0xffd700 : 0xffaa44,
            4 + Math.random() * 3,
          );
        }
        break;

      case BreakerPhase.PLAYING:
        // Ball stuck on paddle hint
        if (state.balls.length === 1 && state.balls[0].vx === 0 && state.balls[0].vy === 0) {
          this.subText.text = "PRESS SPACE TO LAUNCH";
          this.subText.x = cx;
          this.subText.y = cy + 60;
          this.subText.anchor.set(0.5, 0.5);
        }
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Particle system
  // -----------------------------------------------------------------------

  private spawnParticle(
    x: number, y: number, vx: number, vy: number,
    life: number, color: number, size: number,
  ): void {
    if (this.particles.length > 300) return; // cap
    this.particles.push({ x, y, vx, vy, life, color, size });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt; // gravity pulls debris downward
      p.vx *= 0.995; // slight air drag
      p.life -= dt * 1.5;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // -----------------------------------------------------------------------
  // FX triggers (called from transitions or externally)
  // -----------------------------------------------------------------------

  /** Brick break particles at world position. */
  spawnBrickBreakFx(worldX: number, worldY: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      this.spawnParticle(
        worldX + (Math.random() - 0.5) * B.BRICK_W,
        worldY + (Math.random() - 0.5) * B.BRICK_H,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        0.6,
        color,
        2 + Math.random() * 3,
      );
    }
  }

  /** Brick hit sparks (non-destroying). Fewer, smaller, brick-colored. */
  spawnBrickHitFx(worldX: number, worldY: number, color: number): void {
    for (let i = 0; i < 4; i++) {
      this.spawnParticle(
        worldX + (Math.random() - 0.5) * B.BRICK_W * 0.5,
        worldY + (Math.random() - 0.5) * B.BRICK_H * 0.5,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        0.35,
        colorLighten(color, 1.3),
        1.5 + Math.random() * 1.5,
      );
    }
  }

  /** Power-up collect flash at position. */
  spawnCollectFlash(worldX: number, worldY: number, color: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.spawnParticle(
        worldX, worldY,
        Math.cos(angle) * 60, Math.sin(angle) * 60,
        0.5, color, 3,
      );
    }
  }

  /** Spawn an expanding impact ring at a world position. */
  spawnImpactRing(worldX: number, worldY: number, color: number): void {
    if (this.impactRings.length > 10) return;
    this.impactRings.push({ x: worldX, y: worldY, age: 0, color });
  }

  /** Screen shake. */
  triggerShake(intensity: number): void {
    gsap.to(this, {
      shakeX: (Math.random() - 0.5) * intensity * 2,
      shakeY: (Math.random() - 0.5) * intensity * 2,
      duration: 0.05,
      yoyo: true,
      repeat: 5,
      onComplete: () => { this.shakeX = 0; this.shakeY = 0; },
    });
  }

  /** Golden burst for level clear. */
  private triggerGoldenBurst(): void {
    this.goldFlashAlpha = 0.5;
    gsap.to(this, {
      goldFlashAlpha: 0,
      duration: 1.2,
      ease: "power2.out",
    });

    // Burst of golden particles
    const cx = B.FIELD_X + B.FIELD_W / 2;
    const cy = B.FIELD_Y + B.FIELD_H / 2;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.spawnParticle(
        cx, cy,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        1.0 + Math.random() * 0.5,
        Math.random() > 0.3 ? 0xffd700 : 0xffffff,
        3 + Math.random() * 4,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    this.particles.length = 0;
    gsap.killTweensOf(this);
    this.root.destroy({ children: true });
  }
}
