// Procedural sprite generator for the Storm Conduit unit type.
//
// Draws a living lightning elemental at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Humanoid form made of crackling electricity
//   • Semi-transparent energy body with no solid form
//   • Constant lightning arcs between body segments
//   • Electric blue/white/yellow palette
//   • No distinct facial features — glowing eye-sparks
//   • Jagged, erratic silhouette edges
//   • Size 2x2 (large elemental presence)
//   • Floating — no feet touch ground

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — electric storm
const COL_CORE = 0xeeffff; // white-blue core
const COL_BODY = 0x4488ee; // electric blue body
const COL_BODY_HI = 0x66aaff;

const COL_ARC = 0xaaddff; // lightning arc
const COL_ARC_HI = 0xddffff; // bright arc center
const COL_ARC_YELLOW = 0xffee88; // yellow spark

const COL_GLOW = 0x4488ff; // ambient glow
const COL_GLOW_HI = 0x88ccff;

const COL_EYE = 0xffffff; // pure white eye sparks
const COL_EYE_GLOW = 0xaaeeff;

const COL_SPARK = 0xffdd44; // yellow sparks
const COL_SPARK_BLUE = 0x66ccff;

const COL_GROUND_GLOW = 0x4488cc; // ground reflection


/* ── helpers ──────────────────────────────────────────────────────────── */


function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Deterministic pseudo-random for consistent per-frame jitter
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + n * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawGroundGlow(
  g: Graphics,
  cx: number,
  gy: number,
  intensity = 0.5,
): void {
  // No solid shadow — instead electric ground reflection
  g.ellipse(cx, gy + 1, 12, 3).fill({ color: COL_GROUND_GLOW, alpha: 0.1 + intensity * 0.1 });
  g.ellipse(cx, gy + 1, 8, 2).fill({ color: COL_GLOW_HI, alpha: 0.05 + intensity * 0.08 });
}

function drawLightningArc(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  width = 1.2,
  alpha = 0.6,
): void {
  // Jagged lightning path between two points
  const segments = 4;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const perpX = -dy * 0.3;
  const perpY = dx * 0.3;

  let px = x1;
  let py = y1;
  g.moveTo(px, py);

  for (let i = 1; i < segments; i++) {
    const jitter = (hash(seed + i * 7.3) - 0.5) * 2;
    const nx = x1 + dx * i + perpX * jitter;
    const ny = y1 + dy * i + perpY * jitter;
    g.lineTo(nx, ny);
    px = nx;
    py = ny;
  }
  g.lineTo(x2, y2);
  g.stroke({ color: COL_ARC, width, alpha });

  // Bright center line (thinner)
  g.moveTo(x1, y1);
  px = x1;
  py = y1;
  for (let i = 1; i < segments; i++) {
    const jitter = (hash(seed + i * 7.3) - 0.5) * 2;
    const nx = x1 + dx * i + perpX * jitter;
    const ny = y1 + dy * i + perpY * jitter;
    g.lineTo(nx, ny);
  }
  g.lineTo(x2, y2);
  g.stroke({ color: COL_ARC_HI, width: width * 0.4, alpha: alpha * 0.8 });
}

function drawEnergyBody(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  jitterSeed: number,
  bodyAlpha = 0.4,
): void {
  const tw = 12;
  const x = cx - tw / 2;
  const j1 = (hash(jitterSeed) - 0.5) * 2;
  const j2 = (hash(jitterSeed + 1) - 0.5) * 2;

  // Outer glow
  g.roundRect(x - 2, torsoTop - 1, tw + 4, torsoH + 2, 4).fill({
    color: COL_GLOW,
    alpha: bodyAlpha * 0.2,
  });

  // Main energy torso — jagged edges
  g.moveTo(x + 2 + j1, torsoTop)
    .lineTo(x + tw - 2 + j2, torsoTop)
    .lineTo(x + tw + j1 * 0.5, torsoTop + torsoH * 0.5)
    .lineTo(x + tw - 1 + j2 * 0.8, torsoTop + torsoH)
    .lineTo(x + 1 + j1 * 0.8, torsoTop + torsoH)
    .lineTo(x + j2 * 0.5, torsoTop + torsoH * 0.5)
    .closePath()
    .fill({ color: COL_BODY, alpha: bodyAlpha });

  // Core energy line
  g.moveTo(cx, torsoTop + 1)
    .lineTo(cx + j1 * 0.5, torsoTop + torsoH - 1)
    .stroke({ color: COL_CORE, width: 1.5, alpha: bodyAlpha * 0.8 });

  // Internal crackling
  for (let i = 0; i < 3; i++) {
    const iy = torsoTop + 2 + i * (torsoH / 3);
    const ix1 = x + 2 + hash(jitterSeed + i * 3) * (tw - 4);
    const ix2 = x + 2 + hash(jitterSeed + i * 3 + 1) * (tw - 4);
    g.moveTo(ix1, iy).lineTo(ix2, iy + 2).stroke({
      color: COL_ARC_HI,
      width: 0.5,
      alpha: 0.3 + hash(jitterSeed + i) * 0.3,
    });
  }
}

function drawEnergyHead(
  g: Graphics,
  cx: number,
  top: number,
  jitterSeed: number,
  glowIntensity = 0.5,
): void {
  const hw = 9;
  const hh = 8;
  const j1 = (hash(jitterSeed) - 0.5) * 1.5;

  // Head glow aura
  g.circle(cx, top + hh / 2, hw * 0.7).fill({
    color: COL_GLOW,
    alpha: 0.1 + glowIntensity * 0.1,
  });

  // Head shape — jagged energy mass
  g.moveTo(cx - hw / 2 + j1, top + hh)
    .lineTo(cx - hw / 2 - 1, top + hh * 0.3)
    .lineTo(cx - 1, top + j1 * 0.3)
    .lineTo(cx + 1, top + j1 * -0.3)
    .lineTo(cx + hw / 2 + 1, top + hh * 0.3)
    .lineTo(cx + hw / 2 - j1, top + hh)
    .closePath()
    .fill({ color: COL_BODY, alpha: 0.5 });

  // Core face glow
  g.roundRect(cx - 3, top + hh * 0.2, 6, hh * 0.6, 2).fill({
    color: COL_BODY_HI,
    alpha: 0.3,
  });

  // Eye sparks — intense white dots
  const eyeY = top + hh * 0.4;
  const eyeGlow = 0.6 + glowIntensity * 0.4;
  g.circle(cx - 2.5 + j1 * 0.3, eyeY, 1.5).fill({ color: COL_EYE, alpha: eyeGlow });
  g.circle(cx + 2.5 - j1 * 0.3, eyeY, 1.5).fill({ color: COL_EYE, alpha: eyeGlow });
  // Eye glow halos
  g.circle(cx - 2.5, eyeY, 3).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });
  g.circle(cx + 2.5, eyeY, 3).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });

  // Crown sparks — jagged upward
  for (let i = 0; i < 4; i++) {
    const sx = cx - 3 + i * 2;
    const sparkH = 2 + hash(jitterSeed + i * 5) * 3;
    g.moveTo(sx, top + 1)
      .lineTo(sx + hash(jitterSeed + i) * 1.5, top - sparkH)
      .stroke({ color: COL_ARC_YELLOW, width: 0.6, alpha: 0.4 + hash(jitterSeed + i * 2) * 0.3 });
  }
}

function drawEnergyArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  seed: number,
): void {
  // Energy limb — arc of lightning
  drawLightningArc(g, sx, sy, ex, ey, seed, 2, 0.5);
  // Glow at joints
  g.circle(sx, sy, 2).fill({ color: COL_GLOW, alpha: 0.15 });
  g.circle(ex, ey, 2.5).fill({ color: COL_BODY_HI, alpha: 0.3 });
  // Hand spark
  g.circle(ex, ey, 1.5).fill({ color: COL_CORE, alpha: 0.6 });
}

function drawEnergyLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  seed: number,
): void {
  // Lightning bolt legs — no solid form
  const lFootX = cx - 5 + stanceL;
  const rFootX = cx + 5 + stanceR;
  drawLightningArc(g, cx - 3, legTop, lFootX, gy - 2, seed, 1.8, 0.45);
  drawLightningArc(g, cx + 3, legTop, rFootX, gy - 2, seed + 10, 1.8, 0.45);
  // Ground contact sparks
  g.circle(lFootX, gy - 1, 1.5).fill({ color: COL_SPARK, alpha: 0.4 });
  g.circle(rFootX, gy - 1, 1.5).fill({ color: COL_SPARK, alpha: 0.4 });
}

function drawAmbientSparks(
  g: Graphics,
  cx: number,
  cy: number,
  t: number,
  count = 6,
): void {
  for (let i = 0; i < count; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI * 2 / count);
    const dist = 8 + hash(i * 13 + Math.floor(t * 8)) * 10;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.6;
    const color = i % 3 === 0 ? COL_SPARK : i % 3 === 1 ? COL_SPARK_BLUE : COL_ARC_HI;
    const sparkAlpha = 0.2 + hash(i + Math.floor(t * 8)) * 0.4;
    g.circle(px, py, 0.5 + hash(i * 7) * 0.8).fill({ color, alpha: sparkAlpha });
  }
}

function drawBodyArcs(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  seed: number,
): void {
  // Random arcs jumping off body
  for (let i = 0; i < 3; i++) {
    const sy = torsoTop + hash(seed + i) * torsoH;
    const side = hash(seed + i * 3) > 0.5 ? 1 : -1;
    const ex = cx + side * (8 + hash(seed + i * 5) * 6);
    const ey = sy + (hash(seed + i * 7) - 0.5) * 6;
    drawLightningArc(g, cx + side * 5, sy, ex, ey, seed + i * 11, 0.8, 0.3);
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const hover = 2 + Math.sin(t * Math.PI * 2) * 1.5; // always floating

  const torsoH = 12;
  const torsoTop = GY - 6 - torsoH - hover;
  const headTop = torsoTop - 9;
  const seed = frame * 37;

  // Ambient sparks
  drawAmbientSparks(g, CX, torsoTop + torsoH / 2, t, 6);

  drawGroundGlow(g, CX, GY, pulse);
  drawEnergyLegs(g, CX, torsoTop + torsoH, GY, 0, 0, seed);
  drawEnergyBody(g, CX, torsoTop, torsoH, seed, 0.35 + pulse * 0.1);
  drawBodyArcs(g, CX, torsoTop, torsoH, seed);
  drawEnergyHead(g, CX, headTop, seed, pulse);

  // Energy arms at sides — crackling
  drawEnergyArm(g, CX + 6, torsoTop + 3, CX + 11, torsoTop + torsoH - 3, seed + 20);
  drawEnergyArm(g, CX - 6, torsoTop + 3, CX - 11, torsoTop + torsoH - 3, seed + 30);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const surge = Math.sin(t * Math.PI * 2);
  const hover = 2.5 + Math.sin(t * Math.PI * 2) * 1;
  const drift = surge * 2; // lateral drift

  const torsoH = 12;
  const torsoTop = GY - 6 - torsoH - hover;
  const headTop = torsoTop - 9;
  const seed = frame * 41 + 100;

  // Trailing sparks behind movement
  for (let i = 0; i < 4; i++) {
    const tx = CX - drift * 2 - i * 3;
    const ty = torsoTop + torsoH / 2 + (hash(seed + i) - 0.5) * 8;
    g.circle(tx, ty, 0.6).fill({ color: COL_SPARK_BLUE, alpha: 0.3 - i * 0.06 });
  }

  drawAmbientSparks(g, CX + drift * 0.5, torsoTop + torsoH / 2, t, 5);
  drawGroundGlow(g, CX + drift * 0.3, GY, 0.4 + Math.abs(surge) * 0.2);
  drawEnergyLegs(g, CX, torsoTop + torsoH, GY, surge * 3, -surge * 3, seed);
  drawEnergyBody(g, CX + drift * 0.2, torsoTop, torsoH, seed, 0.4);
  drawBodyArcs(g, CX + drift * 0.2, torsoTop, torsoH, seed);
  drawEnergyHead(g, CX + drift * 0.2, headTop, seed, 0.5);

  // Arms stream behind
  const armSwing = surge * 3;
  drawEnergyArm(g, CX + 6, torsoTop + 3, CX + 10 + armSwing, torsoTop + torsoH - 4, seed + 20);
  drawEnergyArm(g, CX - 6, torsoTop + 3, CX - 10 - armSwing, torsoTop + torsoH - 4, seed + 30);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];
  const seed = frame * 53 + 200;

  const torsoH = 12;
  const hover = 2;
  const torsoTop = GY - 6 - torsoH - hover;
  const headTop = torsoTop - 9;

  const lean = t < 0.55 ? t * 3 : (1 - t) * 4;
  const intensity = t < 0.55 ? t * 2 : (1 - t) * 2.5;

  drawAmbientSparks(g, CX + lean, torsoTop + torsoH / 2, t * 3, 8);
  drawGroundGlow(g, CX + lean * 0.3, GY, 0.3 + intensity * 0.3);

  drawEnergyLegs(g, CX, torsoTop + torsoH, GY, lean, -lean * 0.5, seed);
  drawEnergyBody(g, CX + lean * 0.3, torsoTop, torsoH, seed, 0.3 + intensity * 0.2);
  drawBodyArcs(g, CX + lean * 0.3, torsoTop, torsoH, seed);
  drawEnergyHead(g, CX + lean * 0.3, headTop, seed, intensity);

  // Right arm — lightning bolt attack
  const rReach = t < 0.55 ? t * 8 : (1 - t) * 10;
  const rHandX = CX + 8 + lean + rReach;
  const rHandY = torsoTop + 3;
  drawEnergyArm(g, CX + 6 + lean, torsoTop + 3, rHandX, rHandY, seed + 20);

  // Lightning bolt projectile
  if (t >= 0.25 && t <= 0.7) {
    const boltAlpha = clamp01(1 - Math.abs(t - 0.45) / 0.25);
    const boltLen = 10 + (t - 0.25) * 20;
    drawLightningArc(g, rHandX, rHandY, rHandX + boltLen, rHandY - 2, seed + 50, 2.5, boltAlpha * 0.7);
    // Bolt glow
    g.circle(rHandX + boltLen, rHandY - 2, 3).fill({ color: COL_CORE, alpha: boltAlpha * 0.3 });
    g.circle(rHandX + boltLen, rHandY - 2, 1.5).fill({ color: COL_EYE, alpha: boltAlpha * 0.6 });
  }

  // Left arm crackling
  const lHandX = CX - 6 + lean * 0.3;
  const lHandY = torsoTop + 5;
  drawEnergyArm(g, CX - 6 + lean, torsoTop + 3, lHandX, lHandY, seed + 30);

  // Impact sparks
  if (t >= 0.4 && t <= 0.6) {
    const sparkAlpha = clamp01(1 - Math.abs(t - 0.5) / 0.1) * 0.7;
    for (let i = 0; i < 5; i++) {
      const sa = hash(seed + i * 17) * Math.PI * 2;
      const sd = 2 + hash(seed + i * 13) * 5;
      const spx = rHandX + rReach + Math.cos(sa) * sd;
      const spy = rHandY + Math.sin(sa) * sd;
      g.circle(spx, spy, 0.8).fill({ color: COL_SPARK, alpha: sparkAlpha });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);
  const seed = frame * 67 + 300;

  const torsoH = 12;
  const hover = 3 + intensity * 3; // rise higher during cast
  const torsoTop = GY - 6 - torsoH - hover;
  const headTop = torsoTop - 9;

  // Storm aura — expanding electric rings
  for (let i = 0; i < 4; i++) {
    const ringR = 5 + intensity * 12 + i * 4 + pulse * 2;
    const ringAlpha = clamp01(0.3 - i * 0.07) + pulse * 0.05;
    g.circle(CX, torsoTop + torsoH / 2, ringR).stroke({
      color: i % 2 === 0 ? COL_ARC : COL_ARC_YELLOW,
      width: 1.2 + pulse * 0.5,
      alpha: ringAlpha,
    });
  }

  // Dense spark cloud
  drawAmbientSparks(g, CX, torsoTop + torsoH / 2, t * 2, 10);

  // Chain lightning arcs radiating outward
  if (intensity > 0.3) {
    for (let i = 0; i < 5; i++) {
      const angle = t * Math.PI * 2 + i * (Math.PI * 2 / 5);
      const dist = 10 + intensity * 8;
      const ex = CX + Math.cos(angle) * dist;
      const ey = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.5;
      drawLightningArc(g, CX, torsoTop + torsoH / 2, ex, ey, seed + i * 19, 1, intensity * 0.3);
    }
  }

  drawGroundGlow(g, CX, GY, intensity * 0.8);
  drawEnergyLegs(g, CX, torsoTop + torsoH, GY, -1, 1, seed);
  drawEnergyBody(g, CX, torsoTop, torsoH, seed, 0.3 + intensity * 0.3);
  drawBodyArcs(g, CX, torsoTop, torsoH, seed);
  drawEnergyHead(g, CX, headTop, seed, intensity);

  // Arms raised — channeling storm
  const raise = intensity * 6;
  drawEnergyArm(g, CX + 6, torsoTop + 3, CX + 9, torsoTop - raise, seed + 20);
  drawEnergyArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop - raise, seed + 30);

  // Hand energy orbs
  const orbAlpha = 0.2 + intensity * 0.5 + pulse * 0.15;
  g.circle(CX + 9, torsoTop - raise, 3 + pulse * 1.5).fill({ color: COL_GLOW, alpha: orbAlpha * 0.3 });
  g.circle(CX + 9, torsoTop - raise, 1.5 + pulse).fill({ color: COL_CORE, alpha: orbAlpha });
  g.circle(CX - 9, torsoTop - raise, 3 + pulse * 1.5).fill({ color: COL_GLOW, alpha: orbAlpha * 0.3 });
  g.circle(CX - 9, torsoTop - raise, 1.5 + pulse).fill({ color: COL_CORE, alpha: orbAlpha });

  // Arc between hands
  if (intensity > 0.4) {
    drawLightningArc(g, CX + 9, torsoTop - raise, CX - 9, torsoTop - raise, seed + 50, 1.5, intensity * 0.4);
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const seed = frame * 79 + 400;

  const torsoH = 12;
  const torsoTop = GY - 6 - torsoH - 2;
  const headTop = torsoTop - 9;

  // Dissipation — body breaks apart into sparks
  const dissolve = t; // 0 to 1
  const bodyAlpha = clamp01(0.4 * (1 - dissolve));

  // Scattered sparks flying outward as body dissolves
  for (let i = 0; i < 8; i++) {
    const angle = hash(seed + i * 11) * Math.PI * 2;
    const dist = dissolve * 20 + hash(seed + i * 7) * 5;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.6;
    const sparkAlpha = clamp01(0.5 * (1 - dissolve * 0.8));
    const color = i % 3 === 0 ? COL_SPARK : i % 3 === 1 ? COL_SPARK_BLUE : COL_ARC;
    g.circle(px, py, 0.8 + hash(seed + i) * 1.2).fill({ color, alpha: sparkAlpha });
  }

  // Fading lightning arcs — chaotic
  if (t < 0.7) {
    for (let i = 0; i < 3; i++) {
      const angle = hash(seed + i * 23) * Math.PI * 2;
      const dist = 5 + t * 15;
      const ex = CX + Math.cos(angle) * dist;
      const ey = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.5;
      drawLightningArc(g, CX, torsoTop + torsoH / 2, ex, ey, seed + i * 31, 0.8, bodyAlpha * 1.5);
    }
  }

  drawGroundGlow(g, CX, GY, (1 - t) * 0.4);

  // Body shrinks and fades
  if (t < 0.8) {
    const shrink = 1 - t * 0.4;
    drawEnergyLegs(g, CX, torsoTop + torsoH, GY, t * 3, -t * 2, seed);
    drawEnergyBody(g, CX, torsoTop + t * 3, torsoH * shrink, seed, bodyAlpha);
    if (t < 0.6) {
      drawBodyArcs(g, CX, torsoTop + t * 3, torsoH * shrink, seed);
    }
  }

  // Head flickers and vanishes
  if (t < 0.65) {
    const flicker = hash(seed + Math.floor(t * 20)) > 0.3 ? 1 : 0;
    if (flicker) {
      drawEnergyHead(g, CX, headTop + t * 2, seed, (1 - t) * 0.8);
    }
  }

  // Arms break into arcs
  if (t < 0.5) {
    drawEnergyArm(g, CX + 6, torsoTop + 3 + t * 3, CX + 11 + t * 8, torsoTop + torsoH - 3 + t * 5, seed + 20);
    drawEnergyArm(g, CX - 6, torsoTop + 3 + t * 3, CX - 11 - t * 6, torsoTop + torsoH - 3 + t * 5, seed + 30);
  }

  // Final flash at death
  if (t > 0.85 && t < 0.95) {
    const flashAlpha = clamp01((t - 0.85) / 0.05) * 0.3;
    g.circle(CX, torsoTop + torsoH / 2, 8).fill({ color: COL_CORE, alpha: flashAlpha });
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
 * Generate all Storm Conduit sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateStormConduitFrames(renderer: Renderer): RenderTexture[] {
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
