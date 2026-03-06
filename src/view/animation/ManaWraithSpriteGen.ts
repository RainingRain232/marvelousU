// Procedural sprite generator for the ManaWraith unit type.
//
// Draws an ethereal sentient mana vortex at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Translucent/ghostly purple-blue glowing form — no solid body
//   • Vaguely humanoid shape built from swirling mana particles
//   • Bright white-purple core at the "chest" position
//   • Trailing wisps of energy that flicker constantly
//   • Shape constantly wavers and shifts — never fully static
//   • Orbs and particles orbit the central core

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — translucent mana purples and blues
const COL_CORE_INNER  = 0xffffff; // pure white core center
const COL_CORE_MID    = 0xeeddff; // pale white-purple
const COL_CORE_OUTER  = 0xcc88ff; // bright purple

const COL_BODY_HI     = 0xaa66ff; // brighter body
const COL_BODY_MID    = 0x7733cc; // mid purple body
const COL_BODY_DK     = 0x441188; // dark purple body
const COL_BODY_BLUE   = 0x4455dd; // blue tint areas

const COL_PARTICLE_A  = 0xcc99ff; // light particle
const COL_PARTICLE_B  = 0x8844ee; // deep particle
const COL_PARTICLE_C  = 0x6699ff; // blue-purple particle

const COL_WISP_HI     = 0xddbbff; // wisp highlight
const COL_WISP_MID    = 0x9955cc; // wisp mid
const COL_WISP_DK     = 0x5522aa; // wisp dark trail

const COL_TENDRIL     = 0xaa77ff; // attack tendril
const COL_TENDRIL_TIP = 0xffffff; // tendril tip glow

const COL_SHADOW      = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Deterministic "noise" — produces repeatable pseudo-random values per seed
function pnoise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, w = 11, alpha = 0.18): void {
  g.ellipse(cx, gy + 1, w, 3).fill({ color: COL_SHADOW, alpha });
}

/**
 * Core glow — the bright white-purple chest/center.
 * The core is the most solid-looking part of the wraith.
 */
function drawCore(
  g: Graphics,
  cx: number,
  cy: number,
  size: number,
  pulse: number,
): void {
  // Outermost diffuse halo
  g.circle(cx, cy, size * 2.8 + pulse * 1.5).fill({ color: COL_BODY_MID, alpha: 0.06 });
  g.circle(cx, cy, size * 2.2 + pulse * 1.2).fill({ color: COL_BODY_HI, alpha: 0.1 });
  // Main glow layers
  g.circle(cx, cy, size * 1.6 + pulse).fill({ color: COL_CORE_OUTER, alpha: 0.2 });
  g.circle(cx, cy, size * 1.1 + pulse * 0.6).fill({ color: COL_CORE_MID, alpha: 0.45 });
  // Inner hot core
  g.circle(cx, cy, size * 0.65 + pulse * 0.3).fill({ color: COL_CORE_INNER, alpha: 0.75 });
  g.circle(cx, cy, size * 0.3).fill({ color: COL_CORE_INNER, alpha: 0.95 });
}

/**
 * Draw the wraith's vaguely humanoid form using layered translucent shapes.
 * The form is built from overlapping ellipses and curves — no hard outlines.
 * @param shift - horizontal wave/shift of the form
 * @param stretch - vertical stretch factor (>1 = taller, <1 = squashed)
 * @param alpha - overall opacity of the body
 */
function drawWraithBody(
  g: Graphics,
  cx: number,
  baseY: number,
  shift: number,
  stretch: number,
  alpha: number,
): void {
  const a = alpha;
  // Lower body — wispy, wider base
  g.ellipse(cx + shift * 0.3, baseY - 4, 9, 6 * stretch).fill({ color: COL_BODY_DK, alpha: a * 0.35 });
  g.ellipse(cx + shift * 0.5, baseY - 5, 7, 5 * stretch).fill({ color: COL_BODY_MID, alpha: a * 0.25 });

  // Mid body torso region
  g.ellipse(cx + shift * 0.7, baseY - 12 * stretch, 7, 7 * stretch).fill({ color: COL_BODY_MID, alpha: a * 0.3 });
  g.ellipse(cx + shift * 0.8, baseY - 13 * stretch, 5.5, 6 * stretch).fill({ color: COL_BODY_HI, alpha: a * 0.2 });

  // Upper body / shoulder region
  g.ellipse(cx + shift, baseY - 19 * stretch, 8, 5 * stretch).fill({ color: COL_BODY_BLUE, alpha: a * 0.22 });
  g.ellipse(cx + shift * 1.1, baseY - 20 * stretch, 6, 4 * stretch).fill({ color: COL_BODY_HI, alpha: a * 0.18 });

  // "Arms" — wisps extending sideways
  g.ellipse(cx + shift - 9, baseY - 14 * stretch, 5, 2.5).fill({ color: COL_BODY_BLUE, alpha: a * 0.15 });
  g.ellipse(cx + shift + 9, baseY - 14 * stretch, 5, 2.5).fill({ color: COL_BODY_HI, alpha: a * 0.15 });

  // Head region — faint dome
  g.ellipse(cx + shift * 1.1, baseY - 26 * stretch, 5.5, 4 * stretch).fill({ color: COL_BODY_HI, alpha: a * 0.18 });
  g.ellipse(cx + shift * 1.2, baseY - 27 * stretch, 3.5, 3 * stretch).fill({ color: COL_CORE_OUTER, alpha: a * 0.25 });
}

/**
 * Draw orbiting mana particles around the core.
 * Uses deterministic positions based on frame angle.
 */
function drawParticles(
  g: Graphics,
  cx: number,
  cy: number,
  orbitAngle: number,
  count: number,
  orbitRadius: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = orbitAngle + (i / count) * Math.PI * 2;
    const radiusVariance = 1 + pnoise(i * 17.3) * 3;
    const r = orbitRadius + radiusVariance;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r * 0.5; // flattened elliptical orbit
    const pSize = 0.6 + pnoise(i * 31.7 + orbitAngle) * 1.2;
    const cols = [COL_PARTICLE_A, COL_PARTICLE_B, COL_PARTICLE_C];
    const col = cols[i % 3];
    g.circle(px, py, pSize).fill({ color: col, alpha: alpha * (0.5 + pnoise(i * 7.1) * 0.5) });
    // Tiny glow halo on each particle
    g.circle(px, py, pSize * 2).fill({ color: col, alpha: alpha * 0.1 });
  }
}

/**
 * Draw trailing wisps of mana energy below/behind the body.
 */
function drawWisps(
  g: Graphics,
  cx: number,
  baseY: number,
  phase: number,
  count: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const baseOffX = (i - count / 2) * 3.5;
    const waveFreq = 2 + pnoise(i * 13.1) * 2;
    const wx = cx + baseOffX + Math.sin(phase * waveFreq + i * 1.7) * 2.5;
    const wLen = 6 + pnoise(i * 5.3) * 8;
    const wAlpha = alpha * (0.3 + pnoise(i * 23.1 + phase) * 0.4);
    const midX = wx + Math.sin(phase * 1.5 + i) * 1.5;
    g.moveTo(wx, baseY)
      .quadraticCurveTo(midX, baseY + wLen * 0.5, wx + Math.sin(phase + i * 0.7) * 2, baseY + wLen)
      .stroke({ color: i % 2 === 0 ? COL_WISP_MID : COL_WISP_DK, width: 1.2, alpha: wAlpha });
    // Tip flicker
    g.circle(wx + Math.sin(phase + i * 0.7) * 2, baseY + wLen, 0.5)
      .fill({ color: COL_WISP_HI, alpha: wAlpha * 0.6 });
  }
}

/**
 * Draw a flickering particle scatter — mana particles randomly drifting.
 */
function drawScatterParticles(
  g: Graphics,
  cx: number,
  cy: number,
  phase: number,
  count: number,
  radius: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 7.3 + phase * 0.2;
    const px = cx + (pnoise(seed) * 2 - 1) * radius;
    const py = cy + (pnoise(seed + 100) * 2 - 1) * radius * 0.7;
    const pSize = 0.5 + pnoise(seed + 200) * 1.0;
    const pAlpha = alpha * (0.3 + pnoise(seed + 300) * 0.6);
    const col = i % 3 === 0 ? COL_PARTICLE_A : i % 3 === 1 ? COL_PARTICLE_C : COL_BODY_HI;
    g.circle(px, py, pSize).fill({ color: col, alpha: pAlpha });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0→1→0 per cycle
  const wave = Math.sin(t * Math.PI * 2);
  const shift = wave * 1.5;           // gentle side-to-side sway
  const stretch = 1 + wave * 0.04;   // slight vertical breathe
  const orbitAngle = t * Math.PI * 2;

  const coreY = GY - 20;
  const bodyBaseY = GY - 5;

  // Shadow — flickers with pulse
  drawShadow(g, CX, GY, 10 + pulse * 1.5, 0.12 + pulse * 0.08);

  // Wisps at base
  drawWisps(g, CX + shift * 0.2, bodyBaseY, t * Math.PI * 4, 5, 0.55 + pulse * 0.2);

  // Body form
  drawWraithBody(g, CX, bodyBaseY, shift, stretch, 0.7 + pulse * 0.2);

  // Scattered mana particles throughout body
  drawScatterParticles(g, CX + shift, coreY, t * 10, 12, 9, 0.4 + pulse * 0.15);

  // Orbiting particles
  drawParticles(g, CX + shift, coreY, orbitAngle, 8, 10, 0.6 + pulse * 0.2);
  drawParticles(g, CX + shift, coreY, -orbitAngle * 0.7, 5, 6, 0.45 + pulse * 0.15);

  // Core
  drawCore(g, CX + shift, coreY, 5, pulse * 1.5);

  // "Eye" glints — two faint points above core suggesting a face
  const eyeY = coreY - 7;
  g.circle(CX + shift - 2.5, eyeY, 1).fill({ color: COL_CORE_OUTER, alpha: 0.4 + pulse * 0.3 });
  g.circle(CX + shift + 2.5, eyeY, 1).fill({ color: COL_CORE_OUTER, alpha: 0.4 + pulse * 0.3 });
  g.circle(CX + shift - 2.5, eyeY, 0.4).fill({ color: COL_CORE_INNER, alpha: 0.7 + pulse * 0.2 });
  g.circle(CX + shift + 2.5, eyeY, 0.4).fill({ color: COL_CORE_INNER, alpha: 0.7 + pulse * 0.2 });
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const glide = Math.sin(t * Math.PI * 2);
  const pulse = Math.abs(glide) * 0.6 + 0.3;
  const stretch = 1 + glide * 0.08; // elongates forward when moving
  const tiltX = glide * 2.5;        // lean into movement direction
  const orbitAngle = t * Math.PI * 3; // faster orbit when moving

  const bodyBaseY = GY - 5;
  const coreY = GY - 20 + glide * 0.5;

  // Shadow — stretches slightly with movement
  drawShadow(g, CX, GY, 10 + Math.abs(glide) * 3, 0.15);

  // Mana trail — left behind as it moves
  for (let i = 0; i < 4; i++) {
    const trailDist = (i + 1) * 5;
    const trailAlpha = 0.12 - i * 0.025;
    const trailX = CX - trailDist;
    const trailY = coreY + i * 0.5;
    g.circle(trailX, trailY, 3 - i * 0.5).fill({ color: COL_BODY_HI, alpha: trailAlpha });
    // Particle scatter along trail
    for (let p = 0; p < 3; p++) {
      const px = trailX + (pnoise(i * 11 + p * 7) - 0.5) * 5;
      const py = trailY + (pnoise(i * 13 + p * 5) - 0.5) * 4;
      g.circle(px, py, 0.6).fill({ color: COL_PARTICLE_A, alpha: trailAlpha * 0.8 });
    }
  }

  // Elongated wisps trailing behind movement
  for (let i = 0; i < 4; i++) {
    const wx = CX + tiltX * 0.2 + (i - 1.5) * 3;
    const wLen = 8 + glide * 3;
    g.moveTo(wx, bodyBaseY)
      .lineTo(wx - 4 - i, bodyBaseY + wLen)
      .stroke({ color: i % 2 === 0 ? COL_WISP_DK : COL_WISP_MID, width: 1, alpha: 0.3 });
  }

  // Body — slightly elongated in movement direction
  drawWraithBody(g, CX, bodyBaseY, tiltX, stretch, 0.65 + pulse * 0.15);

  // Scattered particles
  drawScatterParticles(g, CX + tiltX, coreY, t * 12, 10, 8, 0.35 + pulse * 0.1);

  // Orbiting particles
  drawParticles(g, CX + tiltX, coreY, orbitAngle, 8, 10, 0.5 + pulse * 0.15);
  drawParticles(g, CX + tiltX, coreY, -orbitAngle * 0.8, 4, 6, 0.4);

  // Core
  drawCore(g, CX + tiltX, coreY, 5, pulse * 1.2);

  // Eye glints — slightly forward-facing
  const eyeY = coreY - 7;
  g.circle(CX + tiltX - 2.5, eyeY, 1).fill({ color: COL_CORE_OUTER, alpha: 0.45 + pulse * 0.2 });
  g.circle(CX + tiltX + 2.5, eyeY, 1).fill({ color: COL_CORE_OUTER, alpha: 0.45 + pulse * 0.2 });
  g.circle(CX + tiltX - 2.5, eyeY, 0.4).fill({ color: COL_CORE_INNER, alpha: 0.75 });
  g.circle(CX + tiltX + 2.5, eyeY, 0.4).fill({ color: COL_CORE_INNER, alpha: 0.75 });
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Extend tendril → lash out → tendril tip flash → retract
  const phases = [0, 0.12, 0.28, 0.46, 0.62, 0.76, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const bodyBaseY = GY - 5;
  const coreY = GY - 20;
  const pulse = Math.sin(t * Math.PI * 2) * 0.3 + 0.6;

  // Core flares during attack
  const coreFlare = t >= 0.28 && t <= 0.76 ? clamp01((t - 0.28) / 0.2) * clamp01(1 - (t - 0.55) / 0.21) : 0;

  // Shadow
  drawShadow(g, CX, GY, 10 + coreFlare * 3, 0.15 + coreFlare * 0.12);

  // Base wisps — suppress during attack (body contracts for energy)
  drawWisps(g, CX, bodyBaseY, t * Math.PI * 6, 4, 0.4 - coreFlare * 0.2);

  // Body — contracts slightly as it gathers energy, then rebounds
  const bodyAlpha = 0.6 - coreFlare * 0.15;
  drawWraithBody(g, CX, bodyBaseY, 0, 1 - coreFlare * 0.08, bodyAlpha);

  // Orbiting particles — accelerate and inward-spiral during wind-up
  const orbitAngle = t * Math.PI * 4;
  const orbitR = 10 - coreFlare * 4;
  drawParticles(g, CX, coreY, orbitAngle, 8, orbitR, 0.5 + coreFlare * 0.3 + pulse * 0.1);

  // Tendril — extends to the right
  const tendriFactor = t >= 0.12 && t <= 0.88
    ? clamp01((t - 0.12) / 0.16) * clamp01(1 - (t - 0.72) / 0.16)
    : 0;
  const tendrilLen = tendriFactor * 20;

  if (tendrilLen > 0.5) {
    const tendrilStartX = CX + 5;
    const tendrilStartY = coreY;
    const tendrilEndX = tendrilStartX + tendrilLen;
    const tendrilEndY = coreY - tendrilLen * 0.15; // slight upward arc
    const midX = (tendrilStartX + tendrilEndX) / 2;
    const midY = tendrilStartY - 3 - coreFlare * 3;

    // Outer glow of tendril
    g.moveTo(tendrilStartX, tendrilStartY)
      .quadraticCurveTo(midX, midY, tendrilEndX, tendrilEndY)
      .stroke({ color: COL_BODY_MID, width: 6, alpha: 0.1 * tendriFactor });
    // Main tendril body
    g.moveTo(tendrilStartX, tendrilStartY)
      .quadraticCurveTo(midX, midY, tendrilEndX, tendrilEndY)
      .stroke({ color: COL_TENDRIL, width: 2.5, alpha: 0.7 * tendriFactor });
    // Bright inner streak
    g.moveTo(tendrilStartX, tendrilStartY)
      .quadraticCurveTo(midX + 0.5, midY - 0.5, tendrilEndX, tendrilEndY)
      .stroke({ color: COL_WISP_HI, width: 0.8, alpha: 0.85 * tendriFactor });
    // Tip flare
    g.circle(tendrilEndX, tendrilEndY, 2 + coreFlare * 2).fill({ color: COL_TENDRIL, alpha: 0.5 * tendriFactor });
    g.circle(tendrilEndX, tendrilEndY, 1 + coreFlare).fill({ color: COL_TENDRIL_TIP, alpha: 0.8 * tendriFactor });

    // Impact flash at peak
    if (coreFlare > 0.7) {
      const flashAlpha = (coreFlare - 0.7) / 0.3 * 0.9;
      g.circle(tendrilEndX, tendrilEndY, 4 + coreFlare * 2).fill({ color: COL_CORE_OUTER, alpha: flashAlpha * 0.4 });
      g.circle(tendrilEndX, tendrilEndY, 2).fill({ color: COL_CORE_INNER, alpha: flashAlpha });
    }
  }

  // Core — flares bright during attack
  drawCore(g, CX, coreY, 5 + coreFlare * 3, coreFlare * 3);

  // Eye glints brighten during attack
  const eyeAlpha = 0.5 + coreFlare * 0.4;
  const eyeY = coreY - 7;
  g.circle(CX - 2.5, eyeY, 1 + coreFlare * 0.5).fill({ color: COL_CORE_OUTER, alpha: eyeAlpha });
  g.circle(CX + 2.5, eyeY, 1 + coreFlare * 0.5).fill({ color: COL_CORE_OUTER, alpha: eyeAlpha });
  g.circle(CX - 2.5, eyeY, 0.5).fill({ color: COL_CORE_INNER, alpha: 0.9 });
  g.circle(CX + 2.5, eyeY, 0.5).fill({ color: COL_CORE_INNER, alpha: 0.9 });
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  // Implode: 0→0.35. Explode distortion wave: 0.35→0.65. Settle: 0.65→1.
  const implodeFactor = t < 0.35 ? 1 - t / 0.35 : 0;
  const explodeFactor = t >= 0.35 && t <= 0.65 ? (t - 0.35) / 0.3 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 0;

  const bodyBaseY = GY - 5;
  const coreY = GY - 20;

  // Shadow — pulses with explosion
  drawShadow(g, CX, GY, 10 + explodeFactor * 8, 0.12 + explodeFactor * 0.18);

  // Distortion wave ring — expands outward on explosion
  if (explodeFactor > 0.05) {
    const ringRadius = explodeFactor * 22;
    const ringAlpha = explodeFactor * 0.6;
    g.circle(CX, coreY, ringRadius).stroke({ color: COL_BODY_HI, width: 2, alpha: ringAlpha });
    g.circle(CX, coreY, ringRadius * 0.85).stroke({ color: COL_CORE_OUTER, width: 1, alpha: ringAlpha * 0.6 });
    g.circle(CX, coreY, ringRadius * 0.7).stroke({ color: COL_CORE_MID, width: 0.8, alpha: ringAlpha * 0.4 });
    // Particle burst along ring
    const burstCount = 12;
    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const bx = CX + Math.cos(angle) * ringRadius;
      const by = coreY + Math.sin(angle) * ringRadius * 0.6;
      g.circle(bx, by, 1.5 - explodeFactor * 0.8).fill({ color: COL_PARTICLE_A, alpha: ringAlpha * 0.8 });
    }
  }

  // Body implodes inward during charge-up, then snaps back
  const bodyScale = implodeFactor > 0 ? 1 - implodeFactor * 0.35 : 1 + explodeFactor * 0.1;
  const bodyAlpha = 0.5 + implodeFactor * 0.3 - explodeFactor * 0.1;
  drawWraithBody(g, CX, bodyBaseY, 0, bodyScale, bodyAlpha);

  // Wisps contracted during implode, splayed during explode
  const wispAlpha = 0.4 - implodeFactor * 0.25 + explodeFactor * 0.35;
  drawWisps(g, CX, bodyBaseY, t * Math.PI * 6, 6, clamp01(wispAlpha));

  // Orbiting particles — spiral inward on implode, blast outward on explode
  const orbitAngle = t * Math.PI * 5;
  const orbitR = implodeFactor > 0
    ? 10 - implodeFactor * 7
    : 3 + explodeFactor * 16;
  const particleAlpha = 0.5 + pulse * 0.2;
  drawParticles(g, CX, coreY, orbitAngle, 10, orbitR, particleAlpha);

  // Additional exploding particle scatter
  if (explodeFactor > 0.2) {
    drawScatterParticles(g, CX, coreY, t * 15, 16, 5 + explodeFactor * 18, explodeFactor * 0.5);
  }

  // Core — super-bright at implode peak, then dims after explosion
  const corePulse = implodeFactor * 4 + explodeFactor * 2 + pulse;
  const coreSize = 5 + implodeFactor * 3;
  drawCore(g, CX, coreY, coreSize, corePulse);

  // Eye glints brighten with the cast
  const eyeAlpha = 0.5 + implodeFactor * 0.4 + explodeFactor * 0.3;
  const eyeY = coreY - 7 * bodyScale;
  g.circle(CX - 2.5, eyeY, 1 + implodeFactor * 0.8).fill({ color: COL_CORE_OUTER, alpha: clamp01(eyeAlpha) });
  g.circle(CX + 2.5, eyeY, 1 + implodeFactor * 0.8).fill({ color: COL_CORE_OUTER, alpha: clamp01(eyeAlpha) });
  g.circle(CX - 2.5, eyeY, 0.5).fill({ color: COL_CORE_INNER, alpha: 0.9 });
  g.circle(CX + 2.5, eyeY, 0.5).fill({ color: COL_CORE_INNER, alpha: 0.9 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  // Core shatters: 0→0.3. Particles scatter: 0.2→0.7. Form dissipates: 0.4→1.
  const shatterT = clamp01(t / 0.3);
  const scatterT = clamp01((t - 0.2) / 0.5);
  const dissipateT = clamp01((t - 0.4) / 0.6);

  const bodyBaseY = GY - 5;
  const coreY = GY - 20;

  // Shadow — fades with form
  if (t < 0.9) {
    drawShadow(g, CX, GY, 10 - t * 6, (0.18 - t * 0.15) * clamp01(1 - dissipateT));
  }

  // Form dissipates — body becomes more transparent and drifts upward
  if (dissipateT < 1) {
    const liftY = dissipateT * 5;
    drawWraithBody(g, CX, bodyBaseY - liftY, 0, 1 + dissipateT * 0.2, (1 - dissipateT) * 0.5);
  }

  // Wisps fade out and scatter
  if (t < 0.75) {
    drawWisps(g, CX, bodyBaseY, t * Math.PI * 8, Math.max(1, Math.round(5 * (1 - t))), 0.4 * (1 - t));
  }

  // Core shatters — fracture lines radiate out
  if (shatterT > 0.1 && shatterT < 1) {
    const numShards = 6;
    for (let i = 0; i < numShards; i++) {
      const angle = (i / numShards) * Math.PI * 2 + 0.3;
      const shardLen = shatterT * (8 + i * 2);
      const sx = CX + Math.cos(angle) * shardLen;
      const sy = coreY + Math.sin(angle) * shardLen * 0.6;
      g.moveTo(CX, coreY).lineTo(sx, sy)
        .stroke({
          color: i % 2 === 0 ? COL_CORE_OUTER : COL_BODY_HI,
          width: 1 + (1 - shatterT) * 0.8,
          alpha: (1 - shatterT) * 0.8,
        });
      // Shard tip
      g.circle(sx, sy, 0.7 + (1 - shatterT) * 0.5)
        .fill({ color: COL_CORE_MID, alpha: (1 - shatterT) * 0.7 });
    }
  }

  // Scattered particles drifting outward and fading
  if (scatterT > 0) {
    const numGroups = 10;
    for (let i = 0; i < numGroups; i++) {
      const baseAngle = (i / numGroups) * Math.PI * 2 + pnoise(i * 11) * 0.8;
      const drift = scatterT * (10 + pnoise(i * 17) * 8);
      const px = CX + Math.cos(baseAngle) * drift;
      const py = coreY + Math.sin(baseAngle) * drift * 0.5 - scatterT * 3; // drift upward too
      const pAlpha = (1 - scatterT) * 0.7;
      const col = i % 3 === 0 ? COL_PARTICLE_A : i % 3 === 1 ? COL_PARTICLE_C : COL_BODY_HI;
      g.circle(px, py, 1.5 - scatterT * 1.2).fill({ color: col, alpha: pAlpha });
      // Fading wisp tail
      g.moveTo(CX, coreY).lineTo(px, py)
        .stroke({ color: col, width: 0.5, alpha: pAlpha * 0.2 });
    }
  }

  // Core — shatters and fades
  if (t < 0.65) {
    const coreAlpha = 1 - shatterT * 0.7;
    const corePulse = shatterT * 2;
    const coreSize = 5 - shatterT * 3;
    if (coreSize > 0.5) {
      // Outer glow
      g.circle(CX, coreY, coreSize * 1.8 + corePulse).fill({ color: COL_CORE_OUTER, alpha: coreAlpha * 0.2 });
      g.circle(CX, coreY, coreSize * 1.1 + corePulse * 0.5).fill({ color: COL_CORE_MID, alpha: coreAlpha * 0.45 });
      // Inner core
      g.circle(CX, coreY, coreSize * 0.6).fill({ color: COL_CORE_INNER, alpha: coreAlpha * 0.75 });
    }
  }
  // A few remaining dim particles even at the end
  if (t > 0.6 && t < 1) {
    const remnantAlpha = (1 - t) * 0.6;
    for (let i = 0; i < 4; i++) {
      const px = CX + (pnoise(i * 31 + t * 10) * 2 - 1) * 12;
      const py = coreY - t * 3 + (pnoise(i * 41 + t * 10) * 2 - 1) * 5;
      g.circle(px, py, 0.7).fill({ color: COL_PARTICLE_A, alpha: remnantAlpha });
    }
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
 * Generate all ManaWraith sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateManaWraithFrames(renderer: Renderer): RenderTexture[] {
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
