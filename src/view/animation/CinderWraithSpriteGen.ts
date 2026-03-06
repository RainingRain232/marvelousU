// Procedural sprite generator for the Cinder Wraith unit type.
//
// Draws an ethereal fire spirit at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Translucent orange/red ghostly humanoid shape made of flickering flame
//   • Ember particles constantly rising, no solid body
//   • Bright white-yellow core, darker red edges
//   • Wispy trailing flame tail instead of legs
//   • IDLE: form flickers and wavers, embers rise, shape shifts
//   • MOVE: flows/drifts forward rapidly, leaving ember trail, shape elongates
//   • ATTACK: hurls a concentrated cinder bolt, arm extends into flame lance
//   • CAST: spirals upward then explodes outward in fire ring
//   • DIE: flame gutters and dims, embers scatter and die out, core fades

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — cinder wraith fire spirit
const COL_CORE_WHITE   = 0xfffff0; // white-yellow core
const COL_CORE_YELLOW  = 0xffee88; // inner glow
const COL_FLAME_HOT    = 0xffbb33; // hot orange
const COL_FLAME_MID    = 0xff7722; // mid orange
const COL_FLAME_OUTER  = 0xdd3300; // deep red-orange
const COL_FLAME_EDGE   = 0x991100; // darkest red edge
const COL_EMBER_BRIGHT = 0xffcc44; // bright ember particle
const COL_EMBER_DIM    = 0xff6611; // dimmer ember
const COL_TAIL_BASE    = 0xff5500; // flame tail base
const COL_BOLT_CORE    = 0xffffff; // cinder bolt center
const COL_BOLT_OUTER   = 0xff9900; // bolt glow ring
const COL_SHADOW       = 0x330800; // dark ground flicker

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawGroundFlicker(g: Graphics, cx: number, alpha = 0.18): void {
  g.ellipse(cx, GY + 1, 10, 2.5).fill({ color: COL_SHADOW, alpha });
  g.ellipse(cx, GY + 1, 6, 1.5).fill({ color: COL_FLAME_OUTER, alpha: alpha * 0.4 });
}

/**
 * Draw the ghostly flame body of the wraith.
 * bodyX/bodyY is the centre of the torso region.
 * waver: horizontal distortion amount (0-2)
 * stretch: vertical elongation (0-1, positive = taller)
 * alpha: overall body translucency
 */
function drawFlameBody(
  g: Graphics,
  bodyX: number,
  bodyY: number,
  waver: number,
  stretch: number,
  alpha: number,
): void {
  const bw = 10 + waver * 0.5;
  const bh = 14 + stretch * 3;

  // outermost dark-red halo / edge aura
  g.ellipse(bodyX, bodyY, bw + 5, bh + 4)
    .fill({ color: COL_FLAME_EDGE, alpha: alpha * 0.22 });

  // outer body layer
  g.ellipse(bodyX + waver * 0.3, bodyY, bw + 2, bh + 1)
    .fill({ color: COL_FLAME_OUTER, alpha: alpha * 0.5 });

  // mid body — main orange mass
  g.ellipse(bodyX + waver * 0.15, bodyY, bw, bh)
    .fill({ color: COL_FLAME_MID, alpha: alpha * 0.65 });

  // hot inner body
  g.ellipse(bodyX, bodyY + 1, bw - 3, bh - 3)
    .fill({ color: COL_FLAME_HOT, alpha: alpha * 0.75 });

  // bright core
  g.ellipse(bodyX, bodyY + 2, bw - 6, bh - 7)
    .fill({ color: COL_CORE_YELLOW, alpha: alpha * 0.8 });

  // white-hot centre
  g.ellipse(bodyX, bodyY + 3, bw - 9, bh - 11)
    .fill({ color: COL_CORE_WHITE, alpha: alpha * 0.85 });
}

/**
 * Draw a pair of ghostly flame arms.
 * lHandX/Y, rHandX/Y are the hand positions.
 */
function drawArms(
  g: Graphics,
  shoulderX: number,
  shoulderY: number,
  lHandX: number,
  lHandY: number,
  rHandX: number,
  rHandY: number,
  alpha: number,
): void {
  // Left arm — ghostly flame stroke, multi-layered
  g.moveTo(shoulderX - 4, shoulderY)
    .lineTo(lHandX, lHandY)
    .stroke({ color: COL_FLAME_OUTER, width: 4, alpha: alpha * 0.5 });
  g.moveTo(shoulderX - 4, shoulderY)
    .lineTo(lHandX, lHandY)
    .stroke({ color: COL_FLAME_HOT, width: 2.5, alpha: alpha * 0.7 });
  g.moveTo(shoulderX - 4, shoulderY)
    .lineTo(lHandX, lHandY)
    .stroke({ color: COL_CORE_YELLOW, width: 1, alpha: alpha * 0.85 });
  // hand ember
  g.circle(lHandX, lHandY, 2.5).fill({ color: COL_FLAME_HOT, alpha: alpha * 0.6 });
  g.circle(lHandX, lHandY, 1.2).fill({ color: COL_CORE_YELLOW, alpha: alpha * 0.8 });

  // Right arm
  g.moveTo(shoulderX + 4, shoulderY)
    .lineTo(rHandX, rHandY)
    .stroke({ color: COL_FLAME_OUTER, width: 4, alpha: alpha * 0.5 });
  g.moveTo(shoulderX + 4, shoulderY)
    .lineTo(rHandX, rHandY)
    .stroke({ color: COL_FLAME_HOT, width: 2.5, alpha: alpha * 0.7 });
  g.moveTo(shoulderX + 4, shoulderY)
    .lineTo(rHandX, rHandY)
    .stroke({ color: COL_CORE_YELLOW, width: 1, alpha: alpha * 0.85 });
  g.circle(rHandX, rHandY, 2.5).fill({ color: COL_FLAME_HOT, alpha: alpha * 0.6 });
  g.circle(rHandX, rHandY, 1.2).fill({ color: COL_CORE_YELLOW, alpha: alpha * 0.8 });
}

/**
 * Draw the flame head (top of body — a teardrop flame bulge with "eyes").
 * eyeAlpha: 0 = eyes closed / dying
 */
function drawFlameHead(
  g: Graphics,
  headX: number,
  headY: number,
  waver: number,
  flicker: number,
  alpha: number,
  eyeAlpha = 1,
): void {
  const hw = 7;
  const hh = 9 + flicker * 1.5;

  // outer head halo
  g.ellipse(headX + waver * 0.2, headY, hw + 3, hh + 2)
    .fill({ color: COL_FLAME_EDGE, alpha: alpha * 0.2 });

  // main head flame shape — elongated teardrop
  g.moveTo(headX - hw, headY + 2)
    .quadraticCurveTo(headX - hw - waver * 0.5, headY - hh * 0.2, headX + waver * 0.3, headY - hh)
    .quadraticCurveTo(headX + hw + waver * 0.5, headY - hh * 0.2, headX + hw, headY + 2)
    .quadraticCurveTo(headX, headY + 3, headX - hw, headY + 2)
    .closePath()
    .fill({ color: COL_FLAME_OUTER, alpha: alpha * 0.6 });

  g.moveTo(headX - hw + 2, headY + 1)
    .quadraticCurveTo(headX - hw + 1, headY - hh * 0.15, headX + waver * 0.2, headY - hh + 2)
    .quadraticCurveTo(headX + hw - 1, headY - hh * 0.15, headX + hw - 2, headY + 1)
    .quadraticCurveTo(headX, headY + 2, headX - hw + 2, headY + 1)
    .closePath()
    .fill({ color: COL_FLAME_MID, alpha: alpha * 0.7 });

  g.moveTo(headX - hw + 3, headY + 0)
    .quadraticCurveTo(headX - 2, headY - hh * 0.3, headX + waver * 0.1, headY - hh + 4)
    .quadraticCurveTo(headX + 2, headY - hh * 0.3, headX + hw - 3, headY + 0)
    .quadraticCurveTo(headX, headY + 1.5, headX - hw + 3, headY + 0)
    .closePath()
    .fill({ color: COL_CORE_YELLOW, alpha: alpha * 0.75 });

  // white-hot core within head
  g.ellipse(headX, headY - 1, hw - 4, hh * 0.5)
    .fill({ color: COL_CORE_WHITE, alpha: alpha * 0.7 });

  // glowing "eyes" — two bright ember spots
  if (eyeAlpha > 0.02) {
    const ey = headY - 2;
    g.ellipse(headX - 2.2, ey, 2.2, 1.5).fill({ color: COL_FLAME_EDGE, alpha: eyeAlpha * alpha });
    g.ellipse(headX + 2.2, ey, 2.2, 1.5).fill({ color: COL_FLAME_EDGE, alpha: eyeAlpha * alpha });
    g.ellipse(headX - 2.2, ey, 1.4, 1.0).fill({ color: COL_EMBER_BRIGHT, alpha: eyeAlpha * alpha });
    g.ellipse(headX + 2.2, ey, 1.4, 1.0).fill({ color: COL_EMBER_BRIGHT, alpha: eyeAlpha * alpha });
    g.circle(headX - 2.2, ey, 0.5).fill({ color: COL_CORE_WHITE, alpha: eyeAlpha * alpha * 0.8 });
    g.circle(headX + 2.2, ey, 0.5).fill({ color: COL_CORE_WHITE, alpha: eyeAlpha * alpha * 0.8 });
  }
}

/**
 * Draw the wispy flame tail (replaces legs).
 * tailX/tailY is the base of the body.
 * sway: side sway amount
 * length: how long the tail extends downward
 * alpha: overall alpha
 */
function drawFlameTail(
  g: Graphics,
  tailX: number,
  tailY: number,
  sway: number,
  length: number,
  alpha: number,
): void {
  const layers = [
    { w: 7, col: COL_FLAME_OUTER, a: 0.55 },
    { w: 5, col: COL_FLAME_MID,   a: 0.65 },
    { w: 3, col: COL_FLAME_HOT,   a: 0.7 },
    { w: 1.5, col: COL_CORE_YELLOW, a: 0.75 },
  ];

  for (const layer of layers) {
    const cx1 = tailX + sway * 0.5;
    const cy1 = tailY + length * 0.35;
    const cx2 = tailX - sway * 0.7 + sway * 0.2;
    const cy2 = tailY + length * 0.7;
    const tipX = tailX + sway * 0.1;
    const tipY = tailY + length;

    g.moveTo(tailX - layer.w * 0.5, tailY)
      .bezierCurveTo(
        cx1 - layer.w * 0.3, cy1,
        cx2 - layer.w * 0.2, cy2,
        tipX, tipY,
      )
      .bezierCurveTo(
        cx2 + layer.w * 0.2, cy2,
        cx1 + layer.w * 0.3, cy1,
        tailX + layer.w * 0.5, tailY,
      )
      .closePath()
      .fill({ color: layer.col, alpha: layer.a * alpha });
  }

  // secondary wisp strand offset to the side
  const wispX = tailX + sway * 1.2;
  g.moveTo(wispX - 1.5, tailY + 2)
    .quadraticCurveTo(wispX + sway * 0.4, tailY + length * 0.55, wispX, tailY + length * 0.85)
    .stroke({ color: COL_TAIL_BASE, width: 2, alpha: alpha * 0.35 });
}

/**
 * Scatter ember particles around the wraith.
 * phase drives animation — each ember has a deterministic position derived from seed + phase.
 */
function drawEmbers(
  g: Graphics,
  cx: number,
  baseY: number,
  phase: number,
  count: number,
  spreadX: number,
  height: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 137.508;
    const rise = ((seed * 0.05 + phase * 8) % height);
    const px = cx + Math.sin(seed * 0.31 + phase * 2.1) * spreadX;
    const py = baseY - rise;
    const size = 0.6 + (i % 3) * 0.35;
    const a = alpha * clamp01(1 - rise / height) * (0.5 + (i % 2) * 0.35);
    const col = i % 3 === 0 ? COL_EMBER_BRIGHT : i % 3 === 1 ? COL_FLAME_HOT : COL_EMBER_DIM;
    if (py > baseY - height && py < baseY + 3) {
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });
    }
  }
}

/* ── flame tongue helper (used in cast explosion ring) ──────────────── */
function drawFlameTongue(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  length: number,
  width: number,
  alpha: number,
): void {
  const tipX = bx + Math.cos(angle) * length;
  const tipY = by + Math.sin(angle) * length;
  const perpA = angle + Math.PI / 2;
  const px = Math.cos(perpA) * width;
  const py = Math.sin(perpA) * width;

  g.moveTo(bx + px, by + py)
    .quadraticCurveTo(bx + Math.cos(angle) * length * 0.6 + px * 0.5, by + Math.sin(angle) * length * 0.6 + py * 0.5, tipX, tipY)
    .quadraticCurveTo(bx + Math.cos(angle) * length * 0.6 - px * 0.5, by + Math.sin(angle) * length * 0.6 - py * 0.5, bx - px, by - py)
    .closePath()
    .fill({ color: COL_FLAME_OUTER, alpha: alpha * 0.55 });

  g.moveTo(bx + px * 0.5, by + py * 0.5)
    .quadraticCurveTo(bx + Math.cos(angle) * length * 0.55 + px * 0.3, by + Math.sin(angle) * length * 0.55 + py * 0.3, tipX, tipY)
    .quadraticCurveTo(bx + Math.cos(angle) * length * 0.55 - px * 0.3, by + Math.sin(angle) * length * 0.55 - py * 0.3, bx - px * 0.5, by - py * 0.5)
    .closePath()
    .fill({ color: COL_FLAME_HOT, alpha: alpha * 0.65 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const phase = t * Math.PI * 2;
  const flicker = Math.sin(phase) * 0.5 + Math.sin(phase * 2.3) * 0.25;
  const waver   = Math.sin(phase * 1.7) * 1.2;
  const bob     = Math.sin(phase) * 0.8;

  const bodyY  = GY - 26 + bob;
  const headY  = bodyY - 14 + flicker * 0.5;
  const tailY  = bodyY + 9;
  const tailLen = 14 + Math.abs(flicker) * 1.5;

  drawGroundFlicker(g, CX, 0.15 + Math.abs(flicker) * 0.05);
  drawEmbers(g, CX, tailY + tailLen, t, 14, 9, 28, 0.65);

  drawFlameTail(g, CX + waver * 0.2, tailY, waver * 0.4, tailLen, 0.85);

  // arms relaxed at sides, drifting gently
  const lHX = CX - 10 + Math.sin(phase + 0.5) * 1.5;
  const lHY = bodyY + 1 + Math.cos(phase) * 1;
  const rHX = CX + 10 + Math.sin(phase + 1.0) * 1.5;
  const rHY = bodyY + 1 + Math.cos(phase + 0.3) * 1;
  drawArms(g, CX, bodyY - 4, lHX, lHY, rHX, rHY, 0.75);

  drawFlameBody(g, CX + waver * 0.15, bodyY, waver, flicker * 0.5, 0.88);
  drawFlameHead(g, CX + waver * 0.3, headY, waver, flicker, 0.9);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const phase = t * Math.PI * 2;
  const stride = Math.sin(phase);
  const lean   = 2.5; // leans forward while moving

  const bodyY  = GY - 24 + Math.abs(stride) * 0.4;
  const headY  = bodyY - 13;
  const tailY  = bodyY + 9;

  // tail elongates in movement, tilts backward
  const tailLen = 18 + Math.abs(stride) * 3;
  const tailSway = stride * 2;

  drawGroundFlicker(g, CX, 0.22);
  // Ember trail — more spread out, left behind
  drawEmbers(g, CX - 4, tailY + tailLen, t, 18, 12, 32, 0.7);

  drawFlameTail(g, CX + tailSway * 0.3, tailY, tailSway * 0.8 + 1.5, tailLen, 0.9);

  // Arms swept back, one forward for momentum
  const lHX = CX - 9 - stride * 2;
  const lHY = bodyY - 1 - Math.abs(stride);
  const rHX = CX + 9 + stride * 2;
  const rHY = bodyY - 1 - Math.abs(stride);
  drawArms(g, CX, bodyY - 4, lHX, lHY, rHX, rHY, 0.8);

  // body slightly forward-leaning and elongated
  drawFlameBody(g, CX + lean * 0.2, bodyY, lean * 0.3, stride * 0.5 + 1, 0.9);
  drawFlameHead(g, CX + lean * 0.4, headY, lean * 0.5, stride * 0.4, 0.9);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind-up arm pulls back
  // 2-3: arm thrusts forward, lance forms
  // 4-5: bolt launches, arm fully extended
  // 6-7: retract / recovery
  const phases = [0, 0.12, 0.26, 0.42, 0.58, 0.72, 0.86, 1.0];
  const t = phases[Math.min(frame, 7)];

  const bodyY = GY - 26;
  const headY = bodyY - 14;
  const tailY = bodyY + 9;
  const flicker = Math.sin(t * Math.PI * 4) * 0.4;

  // Wind-up: right arm pulls back. Launch: extends far forward as lance.
  const windUp  = clamp01(t / 0.3);
  const launch  = clamp01((t - 0.3) / 0.3);
  const retract = clamp01((t - 0.7) / 0.3);

  // Right "attack" hand traces: back → far forward → back to side
  let rHX: number;
  let rHY: number;

  if (t < 0.3) {
    // pull back
    rHX = lerp(CX + 9, CX - 2, windUp);
    rHY = lerp(bodyY + 1, bodyY - 5, windUp);
  } else if (t < 0.65) {
    // lunge forward — becomes lance
    rHX = lerp(CX - 2, CX + 19, launch);
    rHY = lerp(bodyY - 5, bodyY - 2, launch);
  } else {
    // retract
    rHX = lerp(CX + 19, CX + 9, retract);
    rHY = lerp(bodyY - 2, bodyY + 1, retract);
  }

  // Left arm braces inward
  const lHX = CX - 8 + windUp * 2;
  const lHY = bodyY + 2 - windUp * 2;

  drawGroundFlicker(g, CX, 0.18);
  drawEmbers(g, CX, tailY + 14, t, 10, 8, 24, 0.6);
  drawFlameTail(g, CX, tailY, -0.5, 14, 0.82);

  drawArms(g, CX, bodyY - 4, lHX, lHY, rHX, rHY, 0.8);

  // Cinder bolt / flame lance when arm is extended (t 0.35 – 0.7)
  if (t >= 0.35 && t <= 0.72) {
    const boltProgress = clamp01((t - 0.35) / 0.2);
    const boltFade     = t > 0.58 ? clamp01(1 - (t - 0.58) / 0.14) : 1;
    const boltLen      = boltProgress * 14;

    // flame lance extending from fist
    g.moveTo(rHX, rHY)
      .lineTo(rHX + boltLen, rHY)
      .stroke({ color: COL_FLAME_OUTER, width: 5, alpha: 0.45 * boltFade });
    g.moveTo(rHX, rHY)
      .lineTo(rHX + boltLen, rHY)
      .stroke({ color: COL_FLAME_HOT, width: 3, alpha: 0.65 * boltFade });
    g.moveTo(rHX, rHY)
      .lineTo(rHX + boltLen, rHY)
      .stroke({ color: COL_CORE_YELLOW, width: 1.5, alpha: 0.8 * boltFade });

    // cinder bolt tip
    const tipX = rHX + boltLen;
    g.circle(tipX, rHY, 3.5 * boltFade)
      .fill({ color: COL_BOLT_OUTER, alpha: 0.6 * boltFade });
    g.circle(tipX, rHY, 2 * boltFade)
      .fill({ color: COL_BOLT_CORE, alpha: 0.85 * boltFade });

    // sparks radiating from bolt tip
    for (let i = 0; i < 5; i++) {
      const angle = -0.4 + i * 0.2 + boltProgress * 0.5;
      const dist  = 4 + boltProgress * 5;
      g.circle(tipX + Math.cos(angle) * dist, rHY + Math.sin(angle) * dist, 0.9)
        .fill({ color: COL_EMBER_BRIGHT, alpha: 0.7 * boltFade });
    }
  }

  drawFlameBody(g, CX - 0.5, bodyY, 0.4, flicker * 0.3, 0.88);
  drawFlameHead(g, CX - 0.5, headY, -0.5, flicker, 0.88);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 0-2: wraith rises and spirals upward
  // 3-4: contracts / compresses
  // 5-6: explodes in fire ring
  // 7: dissipates
  const t = frame / 7;
  const phase = t * Math.PI * 4;
  const rise  = clamp01(t / 0.45) * 6;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;

  const bodyY = GY - 26 - rise;
  const headY = bodyY - 15;
  const tailY = bodyY + 9;

  // Spiral arms orbiting the body during channeling
  const lAngle = phase + Math.PI;
  const rAngle = phase;
  const spiralDist = 8 + pulse * 4;

  const lHX = CX + Math.cos(lAngle) * spiralDist;
  const lHY = bodyY + Math.sin(lAngle) * spiralDist * 0.55;
  const rHX = CX + Math.cos(rAngle) * spiralDist;
  const rHY = bodyY + Math.sin(rAngle) * spiralDist * 0.55;

  // Fire ring explosion on frames 5-6 (t = 0.71-0.86)
  const ringProgress = clamp01((t - 0.65) / 0.25);
  const ringFade     = clamp01(1 - (t - 0.85) / 0.15);

  drawGroundFlicker(g, CX, 0.1 + pulse * 0.15);
  drawEmbers(g, CX, tailY + 14, t, 20, 14, 36, 0.75);

  // fire ring
  if (ringProgress > 0) {
    const ringRadius = ringProgress * 20;
    const tongueCount = 8;
    for (let i = 0; i < tongueCount; i++) {
      const angle = i * (Math.PI * 2 / tongueCount) + t * 0.5;
      drawFlameTongue(
        g,
        CX + Math.cos(angle) * ringRadius * 0.35,
        bodyY + 2 + Math.sin(angle) * ringRadius * 0.18,
        angle,
        ringRadius * 0.75,
        2.5 * (1 - ringProgress * 0.4),
        ringFade,
      );
    }
    // bright ring inner glow
    g.circle(CX, bodyY + 2, ringRadius * 0.55)
      .stroke({ color: COL_FLAME_HOT, width: 2, alpha: 0.4 * ringFade * ringProgress });
    g.circle(CX, bodyY + 2, ringRadius * 0.55)
      .stroke({ color: COL_CORE_YELLOW, width: 1, alpha: 0.6 * ringFade * ringProgress });
  }

  // orbital ember sparks spiraling outward
  for (let i = 0; i < 6; i++) {
    const angle2 = phase * 0.7 + i * (Math.PI / 3);
    const dist2 = 5 + t * 14 + i * 1.5;
    const px = CX + Math.cos(angle2) * dist2;
    const py = bodyY + Math.sin(angle2) * dist2 * 0.45;
    g.circle(px, py, 1.2 + pulse * 0.5)
      .fill({ color: i % 2 === 0 ? COL_EMBER_BRIGHT : COL_FLAME_HOT, alpha: 0.6 * clamp01(1 - t * 0.6) });
  }

  drawFlameTail(g, CX, tailY, Math.sin(phase * 0.5) * 0.8, 13 + rise * 0.3, 0.8);
  drawArms(g, CX, bodyY - 4, lHX, lHY, rHX, rHY, 0.82);

  // body pulses and glows intensely during cast
  const castStretch = pulse * 1.5 - rise * 0.1;
  drawFlameBody(g, CX, bodyY, Math.sin(phase * 0.5) * 0.8, castStretch, 0.92);
  drawFlameHead(g, CX, headY, Math.sin(phase * 0.7) * 0.5, pulse * 1.2, 0.92);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  // phase 0-0.3: flame gutters, body contracts
  // phase 0.3-0.65: embers scatter and rise, body shrinks
  // phase 0.65-1: core fades to nothing
  const shrink  = clamp01(t / 0.7);
  const fade    = clamp01(1 - t * 0.9);
  const gutterWaver = Math.sin(t * Math.PI * 6) * (1 - shrink) * 2;

  const bodyY  = GY - 26 + t * 8;
  const headY  = bodyY - 14 + shrink * 5;
  const tailY  = bodyY + 9;
  const tailLen = lerp(14, 4, shrink);

  // shadow fades away
  drawGroundFlicker(g, CX, 0.15 * (1 - t));

  // dying embers scatter outward in all directions
  if (t > 0.15) {
    const emberCount = Math.max(0, Math.round(16 * (1 - t)));
    for (let i = 0; i < emberCount; i++) {
      const seed = i * 137.5 + t * 30;
      const angle = seed * 0.43;
      const dist  = (t - 0.15) * 22 + (i % 4) * 4;
      const ex = CX + Math.cos(angle) * dist;
      const ey = bodyY + Math.sin(angle) * dist * 0.6 - t * 8;
      const size = 0.7 + (i % 3) * 0.3;
      g.circle(ex, ey, size)
        .fill({ color: i % 2 === 0 ? COL_EMBER_BRIGHT : COL_EMBER_DIM, alpha: (1 - t) * 0.7 });
    }
  }

  // remaining rising embers die out
  drawEmbers(g, CX, tailY + tailLen, t, Math.max(0, Math.round(10 * (1 - t))), 7, 20, fade * 0.5);

  if (shrink < 0.95) {
    drawFlameTail(g, CX, tailY, gutterWaver * 0.3, tailLen, fade * 0.8);
  }

  // arms dissolve
  if (t < 0.55) {
    const armFade = clamp01(1 - t * 1.6);
    const lHX = CX - 9 + t * 5;
    const lHY = bodyY + 1 + t * 6;
    const rHX = CX + 9 - t * 5;
    const rHY = bodyY + 1 + t * 6;
    drawArms(g, CX, bodyY - 4, lHX, lHY, rHX, rHY, armFade * 0.7);
  }

  if (t < 0.85) {
    // body contracts and dims
    const bodyAlpha = fade * 0.9;
    const bodyScale = 1 - shrink * 0.5;
    drawFlameBody(g, CX + gutterWaver * 0.2, bodyY, gutterWaver, -shrink * 3, bodyAlpha * bodyScale);
  }

  if (t < 0.75) {
    // head dims, eyes fade first
    const eyeA = clamp01(1 - t * 2.5);
    drawFlameHead(g, CX + gutterWaver * 0.3, headY, gutterWaver, -shrink * 2, fade * 0.85, eyeA);
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all Cinder Wraith sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateCinderWraithFrames(renderer: Renderer): RenderTexture[] {
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
