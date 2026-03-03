// Procedural sprite generator for the Pixie unit type.
//
// Draws a tiny ethereal forest sprite at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Small delicate body with luminous fair skin
//   • Iridescent butterfly-like wings with vein detail
//   • Flowing emerald dress with petal hem
//   • Long wavy red-auburn hair with sparkle highlights
//   • Large expressive eyes with starlight reflections
//   • Tiny bare feet (floats above ground)
//   • Trailing sparkle/dust particles
//   • Faint glow aura around body

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 6;

// Palette — ethereal forest fairy
const COL_SKIN = 0xfde8d8;
const COL_SKIN_BLUSH = 0xf0c0b0;

const COL_HAIR = 0xbb3322; // auburn red
const COL_HAIR_HI = 0xdd5533;
const COL_HAIR_DK = 0x882211;

const COL_DRESS = 0x2eaa44; // emerald green
const COL_DRESS_HI = 0x44cc55;
const COL_DRESS_DK = 0x1d7a30;
const COL_DRESS_PETAL = 0x55dd66; // lighter petal edges

const COL_WING_OUTER = 0x99aaee; // iridescent blue-purple
const COL_WING_MID = 0xbbccff;
const COL_WING_INNER = 0xddeeff;
const COL_WING_VEIN = 0x7788cc;
const COL_WING_TIP = 0xeeccff; // purple shimmer

const COL_EYE_WHITE = 0xffffff;
const COL_EYE_IRIS = 0x2244aa; // deep blue
const COL_EYE_PUPIL = 0x111133;
const COL_EYE_SHINE = 0xffffff;

const COL_GLOW = 0xddffdd; // faint body glow
const COL_SPARKLE = 0xffffaa; // golden sparkle
const COL_SPARKLE_WHITE = 0xffffff;

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  alpha = 0.2,
): void {
  g.ellipse(cx, GY + 3, 7, 2).fill({ color: COL_SHADOW, alpha });
}

function drawGlow(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
): void {
  g.circle(cx, cy, r).fill({ color: COL_GLOW, alpha });
  g.circle(cx, cy, r * 0.5).fill({ color: COL_GLOW, alpha: alpha * 1.2 });
}

function drawWings(
  g: Graphics,
  cx: number,
  bodyY: number,
  flap: number,
  shimmer = 0,
): void {
  // Wings are butterfly-shaped: upper pair + lower pair
  const flapScale = 1 - Math.abs(flap) * 0.25;
  const flapY = flap * 4;

  // Upper wings (larger)
  const uwH = 10 * flapScale;
  const uwW = 8;
  // Left upper wing
  g.ellipse(cx - 10, bodyY - 8 - flapY, uwW, uwH)
    .fill({ color: COL_WING_OUTER, alpha: 0.45 })
    .stroke({ color: COL_WING_VEIN, width: 0.4, alpha: 0.3 });
  g.ellipse(cx - 10, bodyY - 8 - flapY, uwW - 2, uwH - 2).fill({
    color: COL_WING_MID,
    alpha: 0.5,
  });
  g.ellipse(cx - 9, bodyY - 9 - flapY, uwW - 4, uwH - 4).fill({
    color: COL_WING_INNER,
    alpha: 0.4,
  });
  // Wing vein lines
  g.moveTo(cx - 5, bodyY - 6)
    .lineTo(cx - 14, bodyY - 12 - flapY)
    .stroke({ color: COL_WING_VEIN, width: 0.3, alpha: 0.3 });
  g.moveTo(cx - 5, bodyY - 8)
    .lineTo(cx - 13, bodyY - 8 - flapY)
    .stroke({ color: COL_WING_VEIN, width: 0.3, alpha: 0.25 });

  // Right upper wing
  g.ellipse(cx + 10, bodyY - 8 - flapY, uwW, uwH)
    .fill({ color: COL_WING_OUTER, alpha: 0.45 })
    .stroke({ color: COL_WING_VEIN, width: 0.4, alpha: 0.3 });
  g.ellipse(cx + 10, bodyY - 8 - flapY, uwW - 2, uwH - 2).fill({
    color: COL_WING_MID,
    alpha: 0.5,
  });
  g.ellipse(cx + 9, bodyY - 9 - flapY, uwW - 4, uwH - 4).fill({
    color: COL_WING_INNER,
    alpha: 0.4,
  });
  g.moveTo(cx + 5, bodyY - 6)
    .lineTo(cx + 14, bodyY - 12 - flapY)
    .stroke({ color: COL_WING_VEIN, width: 0.3, alpha: 0.3 });
  g.moveTo(cx + 5, bodyY - 8)
    .lineTo(cx + 13, bodyY - 8 - flapY)
    .stroke({ color: COL_WING_VEIN, width: 0.3, alpha: 0.25 });

  // Lower wings (smaller)
  const lwH = 6 * flapScale;
  const lwW = 5;
  g.ellipse(cx - 8, bodyY - 2 - flapY * 0.5, lwW, lwH).fill({
    color: COL_WING_TIP,
    alpha: 0.35,
  });
  g.ellipse(cx + 8, bodyY - 2 - flapY * 0.5, lwW, lwH).fill({
    color: COL_WING_TIP,
    alpha: 0.35,
  });

  // Shimmer spots on wings
  if (shimmer > 0) {
    g.circle(cx - 12, bodyY - 10 - flapY, 1).fill({
      color: COL_SPARKLE_WHITE,
      alpha: shimmer * 0.5,
    });
    g.circle(cx + 11, bodyY - 11 - flapY, 0.8).fill({
      color: COL_SPARKLE_WHITE,
      alpha: shimmer * 0.4,
    });
  }
}

function drawBody(
  g: Graphics,
  cx: number,
  bodyY: number,
): void {
  // Dress — layered petal shape
  // Skirt bottom (petal hem)
  for (let i = -2; i <= 2; i++) {
    const px = cx + i * 3;
    const py = bodyY + 6 + Math.abs(i) * 0.5;
    g.ellipse(px, py, 3, 2.5).fill({ color: COL_DRESS_PETAL, alpha: 0.7 });
  }
  // Main dress body
  g.ellipse(cx, bodyY + 3, 7, 6)
    .fill({ color: COL_DRESS })
    .stroke({ color: COL_DRESS_DK, width: 0.4 });
  // Dress highlight
  g.ellipse(cx - 1, bodyY + 1, 4, 3).fill({ color: COL_DRESS_HI, alpha: 0.3 });
  // Belt / waist accent
  g.ellipse(cx, bodyY - 1, 5, 1.5).fill({ color: COL_DRESS_DK });
}

function drawHead(
  g: Graphics,
  cx: number,
  headY: number,
  hairWave = 0,
): void {
  // Hair behind head
  g.ellipse(cx, headY - 1, 7.5, 8).fill({ color: COL_HAIR_DK });

  // Hair strands flowing down
  g.ellipse(cx - 5 + hairWave * 0.3, headY + 2, 2.5, 7).fill({ color: COL_HAIR });
  g.ellipse(cx + 5 + hairWave * 0.3, headY + 2, 2.5, 7).fill({ color: COL_HAIR });
  // Center hair mass
  g.ellipse(cx, headY - 3, 5, 5).fill({ color: COL_HAIR });
  // Highlight strand
  g.ellipse(cx + 1, headY - 4, 2, 3).fill({ color: COL_HAIR_HI, alpha: 0.4 });

  // Face
  g.circle(cx, headY, 5).fill({ color: COL_SKIN });
  // Blush on cheeks
  g.circle(cx - 3, headY + 1, 1.5).fill({ color: COL_SKIN_BLUSH, alpha: 0.3 });
  g.circle(cx + 3, headY + 1, 1.5).fill({ color: COL_SKIN_BLUSH, alpha: 0.3 });

  // Eyes — large and expressive
  // Left eye
  g.ellipse(cx - 2, headY - 0.5, 1.8, 2).fill({ color: COL_EYE_WHITE });
  g.circle(cx - 2, headY - 0.3, 1).fill({ color: COL_EYE_IRIS });
  g.circle(cx - 2, headY - 0.3, 0.5).fill({ color: COL_EYE_PUPIL });
  g.circle(cx - 1.5, headY - 0.8, 0.4).fill({ color: COL_EYE_SHINE, alpha: 0.8 });
  // Right eye
  g.ellipse(cx + 2, headY - 0.5, 1.8, 2).fill({ color: COL_EYE_WHITE });
  g.circle(cx + 2, headY - 0.3, 1).fill({ color: COL_EYE_IRIS });
  g.circle(cx + 2, headY - 0.3, 0.5).fill({ color: COL_EYE_PUPIL });
  g.circle(cx + 2.5, headY - 0.8, 0.4).fill({ color: COL_EYE_SHINE, alpha: 0.8 });

  // Tiny nose
  g.circle(cx, headY + 0.8, 0.4).fill({ color: COL_SKIN_BLUSH, alpha: 0.4 });

  // Little smile
  g.moveTo(cx - 1, headY + 2)
    .quadraticCurveTo(cx, headY + 2.8, cx + 1, headY + 2)
    .stroke({ color: COL_SKIN_BLUSH, width: 0.4, alpha: 0.5 });
}

function drawArms(
  g: Graphics,
  cx: number,
  bodyY: number,
  leftAngle: number,
  rightAngle: number,
): void {
  // Left arm
  const llx = cx - 6;
  const lly = bodyY - 3;
  const lex = llx + Math.cos(leftAngle) * 6;
  const ley = lly + Math.sin(leftAngle) * 6;
  g.moveTo(llx, lly).lineTo(lex, ley).stroke({ color: COL_SKIN, width: 2 });
  g.circle(lex, ley, 1).fill({ color: COL_SKIN });

  // Right arm
  const rlx = cx + 6;
  const rly = bodyY - 3;
  const rex = rlx + Math.cos(rightAngle) * 6;
  const rey = rly + Math.sin(rightAngle) * 6;
  g.moveTo(rlx, rly).lineTo(rex, rey).stroke({ color: COL_SKIN, width: 2 });
  g.circle(rex, rey, 1).fill({ color: COL_SKIN });
}

function drawSparkles(
  g: Graphics,
  cx: number,
  cy: number,
  count: number,
  t: number,
  intensity: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = t * Math.PI * 2 + i * ((Math.PI * 2) / count);
    const dist = 6 + Math.sin(t * Math.PI * 4 + i * 1.5) * 4;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.7;
    const size = 0.8 + Math.sin(t * Math.PI * 6 + i) * 0.4;
    const alpha = clamp01(intensity * (0.3 + Math.sin(t * Math.PI * 4 + i * 2) * 0.3));

    // Star-shaped sparkle (4 lines crossed)
    g.circle(px, py, size).fill({ color: COL_SPARKLE, alpha });
    if (size > 0.6) {
      g.moveTo(px - size, py).lineTo(px + size, py)
        .stroke({ color: COL_SPARKLE_WHITE, width: 0.3, alpha: alpha * 0.6 });
      g.moveTo(px, py - size).lineTo(px, py + size)
        .stroke({ color: COL_SPARKLE_WHITE, width: 0.3, alpha: alpha * 0.6 });
    }
  }
}

function drawFeet(
  g: Graphics,
  cx: number,
  bodyY: number,
  dangle = 0,
): void {
  // Tiny bare feet dangling
  g.circle(cx - 2.5, bodyY + 8 + dangle, 1.2).fill({ color: COL_SKIN });
  g.circle(cx + 2.5, bodyY + 8 - dangle * 0.5, 1.2).fill({ color: COL_SKIN });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const hover = Math.sin(t * Math.PI * 2) * 2.5;
  const wingFlap = Math.sin(t * Math.PI * 4) * 0.5;
  const hairWave = Math.sin(t * Math.PI * 2) * 1.5;
  const shimmer = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;

  const bodyY = GY - 18 + hover;
  const headY = bodyY - 10;

  drawShadow(g, CX, 0.15 + (1 - Math.abs(hover) / 2.5) * 0.1);

  // Faint body glow
  drawGlow(g, CX, bodyY - 4, 12, 0.04 + shimmer * 0.03);

  drawWings(g, CX, bodyY, wingFlap, shimmer);
  drawBody(g, CX, bodyY);
  drawArms(g, CX, bodyY, Math.PI * 0.6 + Math.sin(t * Math.PI * 2) * 0.15, -Math.PI * 0.6 - Math.sin(t * Math.PI * 2) * 0.15);
  drawFeet(g, CX, bodyY, Math.sin(t * Math.PI * 2) * 0.8);
  drawHead(g, CX, headY, hairWave);

  // Idle sparkle trail
  drawSparkles(g, CX, bodyY, 4, t, 0.4);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const hover = Math.sin(t * Math.PI * 2) * 3;
  const wingFlap = Math.sin(t * Math.PI * 6) * 0.7; // fast flapping
  const hairWave = Math.sin(t * Math.PI * 4) * 3;
  const shimmer = Math.sin(t * Math.PI * 8) * 0.5 + 0.5;

  const bodyY = GY - 20 + hover;
  const headY = bodyY - 10;

  drawShadow(g, CX, 0.12);

  drawGlow(g, CX, bodyY - 4, 10, 0.03);

  drawWings(g, CX, bodyY, wingFlap, shimmer);
  drawBody(g, CX, bodyY);
  // Arms swept back during flight
  drawArms(g, CX, bodyY, Math.PI * 0.7, -Math.PI * 0.7);
  drawFeet(g, CX, bodyY, Math.sin(t * Math.PI * 4) * 1.2);
  drawHead(g, CX, headY, hairWave);

  // Motion sparkle trail behind
  drawSparkles(g, CX - 4, bodyY + 4, 5, t, 0.6);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: wind up, thrust hands forward, magic burst, recovery
  const t = frame / 7;
  const hover = Math.sin(t * Math.PI * 2) * 2;
  const wingFlap = Math.sin(t * Math.PI * 4) * 0.4;
  const shimmer = clamp01(t * 2) * (Math.sin(t * Math.PI * 6) * 0.3 + 0.7);

  const bodyY = GY - 18 + hover;
  const headY = bodyY - 10;

  // Arms extend forward during attack
  let leftArm: number;
  let rightArm: number;
  if (t < 0.3) {
    leftArm = Math.PI * 0.6 - t * 2;
    rightArm = -Math.PI * 0.6 + t * 2;
  } else if (t < 0.6) {
    leftArm = 0;
    rightArm = 0;
  } else {
    leftArm = (t - 0.6) * Math.PI * 1.5;
    rightArm = -(t - 0.6) * Math.PI * 1.5;
  }

  drawShadow(g, CX);

  // Magic glow intensifies during burst
  const burstIntensity = t > 0.25 && t < 0.7 ? Math.sin((t - 0.25) / 0.45 * Math.PI) : 0;
  if (burstIntensity > 0) {
    drawGlow(g, CX + 10, bodyY - 3, 8 + burstIntensity * 6, burstIntensity * 0.15);
  }

  drawWings(g, CX, bodyY, wingFlap, shimmer);
  drawBody(g, CX, bodyY);
  drawArms(g, CX, bodyY, leftArm, rightArm);
  drawFeet(g, CX, bodyY, 0);
  drawHead(g, CX, headY, -t * 2);

  // Magic projectile / sparkle burst
  if (t > 0.25 && t < 0.75) {
    const burstT = (t - 0.25) / 0.5;
    const bx = CX + 8 + burstT * 8;
    const by = bodyY - 3;

    // Main magic orb
    g.circle(bx, by, 3 + burstIntensity * 2).fill({
      color: COL_SPARKLE,
      alpha: 0.5 + burstIntensity * 0.3,
    });
    g.circle(bx, by, 2).fill({
      color: COL_SPARKLE_WHITE,
      alpha: 0.6 + burstIntensity * 0.3,
    });

    // Orbiting sparkles
    for (let i = 0; i < 4; i++) {
      const angle = burstT * Math.PI * 4 + i * (Math.PI / 2);
      const dist = 4 + burstIntensity * 3;
      g.circle(bx + Math.cos(angle) * dist, by + Math.sin(angle) * dist, 1).fill({
        color: COL_GLOW,
        alpha: burstIntensity * 0.5,
      });
    }
  }

  drawSparkles(g, CX, bodyY, 3, t, 0.3 + burstIntensity * 0.4);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: pixie channels nature magic — green sparkles + healing glow
  const t = frame / 7;
  const hover = Math.sin(t * Math.PI * 2) * 1.5;
  const wingFlap = Math.sin(t * Math.PI * 4) * 0.5;
  const intensity = clamp01(t * 1.8);
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;

  const bodyY = GY - 18 + hover;
  const headY = bodyY - 10;

  drawShadow(g, CX, 0.15 + intensity * 0.1);

  // Large healing glow
  const glowR = 14 + intensity * 6 + pulse * 3;
  g.circle(CX, bodyY - 2, glowR).fill({
    color: COL_DRESS_HI,
    alpha: 0.04 + intensity * 0.06,
  });
  g.circle(CX, bodyY - 2, glowR * 0.5).fill({
    color: COL_GLOW,
    alpha: 0.06 + intensity * 0.06,
  });

  drawWings(g, CX, bodyY, wingFlap, pulse);
  drawBody(g, CX, bodyY);
  // Arms raised to sides channeling
  const raise = intensity * 0.8;
  drawArms(g, CX, bodyY, Math.PI * 0.3 - raise, -Math.PI * 0.3 + raise);
  drawFeet(g, CX, bodyY, 0);
  drawHead(g, CX, headY, Math.sin(t * Math.PI * 2));

  // Nature sparkle particles — green + gold
  for (let i = 0; i < 6; i++) {
    const a = t * Math.PI * 2.5 + i * (Math.PI / 3);
    const dist = 8 + intensity * 6 + Math.sin(t * Math.PI * 4 + i) * 3;
    const px = CX + Math.cos(a) * dist;
    const py = bodyY - 2 + Math.sin(a) * dist * 0.5;
    const pAlpha = clamp01(intensity * 0.5 + pulse * 0.2 - i * 0.04);
    const color = i % 2 === 0 ? COL_DRESS_HI : COL_SPARKLE;
    g.circle(px, py, 1.2 - i * 0.08).fill({ color, alpha: pAlpha });
  }

  drawSparkles(g, CX, bodyY, 5, t, 0.5 + intensity * 0.4);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: wings falter, sparkles fade, gently floats down and dissolves
  const t = frame / 7;
  const fade = 1 - t * 0.8;

  const fallY = t * t * 16;
  const bodyY = GY - 18 + fallY;
  const headY = bodyY - 10;

  // Wings droop and slow
  const wingDroop = t * 0.8;
  const wingFlap = Math.sin(t * Math.PI * 2) * (0.4 - t * 0.35);

  drawShadow(g, CX, (1 - t) * 0.2);

  // Fading glow
  if (fade > 0.3) {
    drawGlow(g, CX, bodyY - 4, 10 * fade, 0.03 * fade);
  }

  // Wings droop as they fall
  drawWings(g, CX, bodyY + wingDroop * 5, wingFlap, 0);

  drawBody(g, CX, bodyY);
  drawArms(g, CX, bodyY, Math.PI * 0.5 + t * 0.5, -Math.PI * 0.5 - t * 0.5);
  drawFeet(g, CX, bodyY, t * 2);
  drawHead(g, CX, headY, t * 3);

  // Sparkles scatter and fade
  if (t < 0.8) {
    for (let i = 0; i < 4; i++) {
      const angle = t * Math.PI + i * (Math.PI / 2);
      const dist = 4 + t * 12;
      const px = CX + Math.cos(angle) * dist;
      const py = bodyY + Math.sin(angle) * dist * 0.5;
      const alpha = clamp01((1 - t * 1.2) * 0.5);
      g.circle(px, py, 0.8).fill({ color: COL_SPARKLE, alpha });
    }
  }

  // Dissolve particles in late frames
  if (t > 0.5) {
    const dissolve = (t - 0.5) / 0.5;
    for (let i = 0; i < 5; i++) {
      const dx = CX + (Math.random() * 16 - 8) * dissolve;
      const dy = bodyY + (Math.random() * 10 - 5);
      // Use deterministic pseudo-random based on frame+i
      const px = CX + Math.sin(i * 2.3 + t * 4) * 8 * dissolve;
      const py = bodyY + Math.cos(i * 1.7 + t * 3) * 6 - dissolve * 4;
      void dx; void dy;
      g.circle(px, py, 0.6).fill({
        color: COL_GLOW,
        alpha: (1 - dissolve) * 0.4,
      });
    }
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all pixie sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures in a 5-row × 8-column grid.
 */
export function generatePixieFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
