// Procedural sprite generator for the Frost Wyrm unit type.
//
// Draws a serpentine ice dragon/wyrm at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Long sinuous body of crystalline ice, pale blue/white
//   • No wings — serpentine slithering movement
//   • Ice crystal spines along back, glowing blue eyes
//   • Frost particle trails drifting off body
//   • Cone of frost breath for attack
//   • Ice crystal eruption for cast
//   • Shattering ice shards death animation

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — glacial ice blues and whites
const COL_ICE_LIGHT    = 0xd8f0ff; // pale ice surface
const COL_ICE_MID      = 0x90c8e8; // main body ice
const COL_ICE_DARK     = 0x4a90b8; // deep ice shadow
const COL_ICE_CORE     = 0xb8e4f8; // translucent inner glow
const COL_ICE_SCALE    = 0x78b8d8; // scale edge lines
const COL_CRYSTAL_HI   = 0xeef8ff; // crystal spike highlight
const COL_EYE_GLOW     = 0x22ddff; // piercing blue glow eyes
const COL_EYE_PUPIL    = 0x008bb0; // pupil
const COL_SPINE        = 0xa8d8f0; // dorsal spines
const COL_SPINE_TIP    = 0xddf4ff; // spine tips
const COL_BREATH       = 0xccf0ff; // frost breath particles
const COL_BREATH_CORE  = 0xffffff; // bright breath core
const COL_FROST_PART   = 0x9ad4ee; // frost particle drifts
const COL_SHARD        = 0xa0d0ec; // death ice shard
const COL_SHADOW       = 0x000000;
const COL_FREEZE_AURA  = 0x44aadd; // cast aura

/* ── helpers ──────────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  alpha = 0.22,
  rx = 14,
  ry = 2.5,
): void {
  g.ellipse(cx, GY + 1.5, rx, ry).fill({ color: COL_SHADOW, alpha });
}

/**
 * Draw a single segment of the wyrm body.
 * Each segment is an ellipse with ice scale detail.
 */
function drawBodySegment(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  tilt: number,
  alpha = 1,
): void {
  // Outer scale body
  g.ellipse(x, y, rx, ry)
    .fill({ color: COL_ICE_MID, alpha })
    .stroke({ color: COL_ICE_DARK, width: 0.4, alpha });
  // Inner lighter core
  g.ellipse(x, y, rx * 0.65, ry * 0.6).fill({ color: COL_ICE_CORE, alpha: alpha * 0.5 });
  // Top highlight band
  g.ellipse(x + tilt * 0.3, y - ry * 0.25, rx * 0.5, ry * 0.25)
    .fill({ color: COL_ICE_LIGHT, alpha: alpha * 0.45 });
}

/**
 * Draw a single crystal spine at a given position and height.
 */
function drawSpine(
  g: Graphics,
  x: number,
  y: number,
  h: number,
  tilt = 0,
  alpha = 1,
): void {
  const tipX = x + tilt;
  const tipY = y - h;
  const hw = h * 0.28;
  g.moveTo(tipX, tipY)
    .lineTo(x - hw, y)
    .lineTo(x + hw, y)
    .closePath()
    .fill({ color: COL_SPINE, alpha })
    .stroke({ color: COL_SPINE_TIP, width: 0.35, alpha });
  // Highlight facet
  g.moveTo(tipX, tipY)
    .lineTo(x - hw * 0.3, y)
    .stroke({ color: COL_CRYSTAL_HI, width: 0.5, alpha: alpha * 0.7 });
}

/**
 * Draw the wyrm head facing right.
 * hx/hy = centre of head
 */
function drawHead(
  g: Graphics,
  hx: number,
  hy: number,
  jawOpen = 0,
  glowIntensity = 0,
  alpha = 1,
): void {
  // Elongated snout
  const snoutW = 9;
  const snoutH = 5;
  g.roundRect(hx - snoutW / 2, hy - snoutH / 2, snoutW, snoutH, 2)
    .fill({ color: COL_ICE_MID, alpha })
    .stroke({ color: COL_ICE_DARK, width: 0.4, alpha });
  // Top-of-skull horns
  drawSpine(g, hx - 2, hy - snoutH / 2, 5, -0.8, alpha);
  drawSpine(g, hx + 1, hy - snoutH / 2, 4, 0.5, alpha);

  // Jaw
  if (jawOpen > 0) {
    const jawY = hy + snoutH / 2 + jawOpen * 2;
    g.moveTo(hx - snoutW / 2 + 1, hy + snoutH / 2)
      .lineTo(hx + snoutW / 2 - 1, jawY)
      .lineTo(hx - snoutW / 2 + 1, jawY)
      .closePath()
      .fill({ color: COL_ICE_DARK, alpha });
    // Teeth
    for (let i = 0; i < 3; i++) {
      const tx = hx - 3 + i * 3;
      g.moveTo(tx, jawY)
        .lineTo(tx + 0.8, jawY + jawOpen * 1.2)
        .lineTo(tx + 1.6, jawY)
        .fill({ color: COL_CRYSTAL_HI, alpha });
    }
  }

  // Glowing eye
  const eyeX = hx + 2;
  const eyeY = hy - 0.5;
  const glowR = 1.8 + glowIntensity * 1.2;
  g.circle(eyeX, eyeY, glowR + 1.5).fill({ color: COL_EYE_GLOW, alpha: alpha * (0.18 + glowIntensity * 0.25) });
  g.circle(eyeX, eyeY, glowR).fill({ color: COL_EYE_GLOW, alpha });
  g.circle(eyeX, eyeY, glowR * 0.45).fill({ color: COL_EYE_PUPIL, alpha });
  // Eye highlight
  g.circle(eyeX - 0.6, eyeY - 0.5, 0.4).fill({ color: COL_CRYSTAL_HI, alpha });
}

/**
 * Emit frost particle drifts from a position.
 * Particles are small circles scattered in an arc.
 */
function drawFrostParticles(
  g: Graphics,
  ox: number,
  oy: number,
  count: number,
  seed: number,
  alpha = 0.5,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (seed + i * 1.3) % (Math.PI * 2);
    const dist = 3 + ((seed * 7 + i * 3) % 6);
    const px = ox + Math.cos(angle) * dist;
    const py = oy + Math.sin(angle) * dist * 0.5 - 1;
    const sz = 0.5 + ((i + seed * 2) % 3) * 0.4;
    g.circle(px, py, sz).fill({ color: COL_FROST_PART, alpha: alpha * (0.4 + ((i * 17) % 10) * 0.06) });
  }
}

/**
 * Draw the wyrm body in a coiled/serpentine pose defined by a series of
 * spine points. Each spine point is {x, y, rx, ry} for an elliptical segment.
 */
interface SegPt { x: number; y: number; rx: number; ry: number; tilt?: number }

function drawWyrmBody(g: Graphics, segments: SegPt[], alpha = 1): void {
  // Draw from tail to head so head renders on top
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    drawBodySegment(g, s.x, s.y, s.rx, s.ry, s.tilt ?? 0, alpha);
    // Draw scale line marks for texture
    if (s.rx > 3) {
      g.moveTo(s.x - s.rx * 0.6, s.y)
        .lineTo(s.x + s.rx * 0.6, s.y)
        .stroke({ color: COL_ICE_SCALE, width: 0.3, alpha: alpha * 0.35 });
    }
  }
}

/**
 * Draw dorsal spines along a series of body points.
 */
function drawDorsalSpines(
  g: Graphics,
  segments: SegPt[],
  spineHeights: number[],
  alpha = 1,
): void {
  for (let i = 0; i < Math.min(segments.length, spineHeights.length); i++) {
    const s = segments[i];
    if (spineHeights[i] > 0.5) {
      drawSpine(g, s.x, s.y - s.ry * 0.6, spineHeights[i], (s.tilt ?? 0) * 0.3, alpha);
    }
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.7;
  const shimmer = Math.sin(t * Math.PI * 2);
  const particleSeed = t * 4;

  // Coiled serpentine pose — body loops in an S-curve
  // Tail comes in from lower-left, loops up, head at right
  const segments: SegPt[] = [
    { x: 10, y: GY - 2,      rx: 3.5, ry: 2.5 },   // tail tip
    { x: 16, y: GY - 5,      rx: 4.5, ry: 3 },
    { x: 22, y: GY - 3,      rx: 5,   ry: 3.5 },    // lower loop
    { x: 28, y: GY - 6,      rx: 5.5, ry: 4,   tilt: 1 },
    { x: 22, y: GY - 13 + breathe * 0.4, rx: 5, ry: 3.5 }, // rises
    { x: 16, y: GY - 19 + breathe * 0.6, rx: 4.5, ry: 3.2 },
    { x: 22, y: GY - 24 + breathe * 0.8, rx: 5, ry: 3.5, tilt: -1 }, // upper loop
    { x: 30, y: GY - 22 + breathe,       rx: 5.5, ry: 4,   tilt: 1 }, // neck
    { x: 37, y: GY - 20 + breathe,       rx: 4.5, ry: 3.2 }, // near head
  ];

  const spineH = [1.5, 2, 2.5, 3.5, 3, 3.5, 4, 3, 2.5];

  drawShadow(g, CX + 3, 0.22, 15, 2.5);
  drawFrostParticles(g, 20, GY - 18 + breathe * 0.5, 5, particleSeed, 0.45);
  drawFrostParticles(g, 34, GY - 19 + breathe * 0.8, 4, particleSeed + 1.5, 0.4);
  drawWyrmBody(g, segments, 1);
  drawDorsalSpines(g, segments, spineH, 1);

  // Crystal shimmer highlights on body mid-loop
  const shimmerAlpha = 0.08 + shimmer * 0.08;
  g.circle(22, GY - 24 + breathe * 0.8, 4).fill({ color: COL_ICE_LIGHT, alpha: shimmerAlpha });
  g.circle(16, GY - 19 + breathe * 0.6, 3).fill({ color: COL_ICE_LIGHT, alpha: shimmerAlpha * 0.7 });

  // Head
  const hx = 40;
  const hy = GY - 18 + breathe;
  drawHead(g, hx, hy, 0, shimmer * 0.4 + 0.3);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const wave = Math.sin(t * Math.PI * 2);
  const wave2 = Math.sin(t * Math.PI * 2 + Math.PI * 0.5);

  // Undulating sinuous slither — body waves laterally
  // Main body flows left-to-right in an S wave
  const baseY = GY - 12;
  const amp = 5;

  const segments: SegPt[] = [
    { x: 5,  y: baseY + wave2 * amp * 0.2,         rx: 2.5, ry: 2 },
    { x: 10, y: baseY + wave2 * amp * 0.5,          rx: 3.5, ry: 2.5 },
    { x: 16, y: baseY + wave * amp * 0.9,           rx: 4.5, ry: 3 },
    { x: 22, y: baseY + wave * amp,                  rx: 5.5, ry: 3.5, tilt: wave * 1.5 },
    { x: 28, y: baseY + wave2 * amp * 0.9,          rx: 5.5, ry: 3.5, tilt: wave2 * 1.5 },
    { x: 34, y: baseY + wave2 * amp * 0.6,          rx: 5,   ry: 3,   tilt: wave2 },
    { x: 39, y: baseY + wave2 * amp * 0.3,          rx: 4,   ry: 2.8 },
  ];

  const spineH = [1, 2, 3, 4, 3.5, 3, 2];

  // Ice trail under body — faint ellipses left behind on ground
  for (let i = 0; i < 5; i++) {
    const tx = 6 + i * 6;
    const trailAlpha = 0.08 + (i * 0.02);
    g.ellipse(tx, GY - 1, 3 + i, 1.2).fill({ color: COL_ICE_LIGHT, alpha: trailAlpha });
  }

  drawShadow(g, CX - 2, 0.2, 18, 2.2);

  // Frost particles kicked up by movement
  const ps = t * 5;
  drawFrostParticles(g, 10, GY - 8 + wave * 3, 4, ps, 0.5);
  drawFrostParticles(g, 24, GY - 11 + wave2 * 3, 4, ps + 2, 0.45);

  drawWyrmBody(g, segments, 1);
  drawDorsalSpines(g, segments, spineH, 1);

  // Head — slightly raised, moving forward
  const hx = 44;
  const hy = baseY + wave2 * amp * 0.1 - 2;
  drawHead(g, hx, hy, 0, 0.2);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: coil back / rear up
  // 2-3: open jaw
  // 4-5: frost breath cone peak
  // 6-7: breath dissipates / recover
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.72, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const rearUp = t < 0.5 ? t * 2 : 2 - t * 2; // peaks at t=0.5
  const breathPower = clamp01((t - 0.3) / 0.3);
  const breathFade = t > 0.7 ? clamp01(1 - (t - 0.7) / 0.3) : 1;
  const jawOpen = clamp01((t - 0.15) / 0.2) * (1 - clamp01((t - 0.8) / 0.2));

  // Body rears up — head lifts high, body coils beneath
  const neckY = GY - 14 - rearUp * 10;
  const segments: SegPt[] = [
    { x: 8,  y: GY - 3,           rx: 3, ry: 2 },
    { x: 14, y: GY - 5,           rx: 4, ry: 3 },
    { x: 20, y: GY - 8,           rx: 5, ry: 3.5 },
    { x: 26, y: GY - 11,          rx: 5.5, ry: 4,   tilt: -1 },
    { x: 30, y: GY - 15,          rx: 5,   ry: 3.5 },
    { x: 33, y: neckY + 6,        rx: 4.5, ry: 3 },
    { x: 35, y: neckY,            rx: 4,   ry: 2.8 },
  ];
  const spineH = [1.5, 2.5, 3.5, 4.5, 4, 3.5, 3];

  drawShadow(g, CX - 3, 0.2, 14, 2.5);
  drawWyrmBody(g, segments, 1);
  drawDorsalSpines(g, segments, spineH, 1);

  // Head
  const hx = 38;
  const hy = neckY - 3;
  drawHead(g, hx, hy, jawOpen, 0.5 + breathPower * 0.5);

  // Frost breath cone emanating from mouth
  if (breathPower > 0) {
    const mouthX = hx + 7;
    const mouthY = hy + 1 + jawOpen * 1.5;
    const coneLen = breathPower * 22 * breathFade;
    const coneW = breathPower * 9 * breathFade;

    // Outer soft cone glow
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen, mouthY - coneW * 0.6)
      .lineTo(mouthX + coneLen, mouthY + coneW * 0.6)
      .closePath()
      .fill({ color: COL_BREATH, alpha: 0.18 * breathFade });

    // Main cone
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 0.85, mouthY - coneW * 0.45)
      .lineTo(mouthX + coneLen * 0.85, mouthY + coneW * 0.45)
      .closePath()
      .fill({ color: COL_BREATH, alpha: 0.35 * breathFade });

    // Inner core
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 0.55, mouthY - coneW * 0.22)
      .lineTo(mouthX + coneLen * 0.55, mouthY + coneW * 0.22)
      .closePath()
      .fill({ color: COL_BREATH_CORE, alpha: 0.55 * breathFade });

    // Ice crystal particles in breath
    for (let i = 0; i < 8; i++) {
      const px = mouthX + (i / 7) * coneLen * 0.9;
      const spread = (i / 7) * coneW * 0.5;
      const py1 = mouthY - spread * (0.4 + ((i * 7) % 5) * 0.12);
      const py2 = mouthY + spread * (0.3 + ((i * 11) % 5) * 0.14);
      const cr = 0.6 + ((i * 13) % 4) * 0.3;
      g.circle(px, py1, cr).fill({ color: COL_CRYSTAL_HI, alpha: 0.65 * breathFade });
      g.circle(px, py2, cr * 0.8).fill({ color: COL_CRYSTAL_HI, alpha: 0.55 * breathFade });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);

  // Body coils tightly into a circle, ice crystals erupt outward
  const coilR = 10;
  const coilCX = CX;
  const coilCY = GY - 14;

  // Coiled body segments arranged in a circle
  const segCount = 8;
  const segments: SegPt[] = [];
  for (let i = 0; i < segCount; i++) {
    const angle = (i / segCount) * Math.PI * 2 - Math.PI * 0.5;
    const r = coilR + (i === 0 || i === segCount - 1 ? 2 : 0);
    segments.push({
      x: coilCX + Math.cos(angle) * r,
      y: coilCY + Math.sin(angle) * r * 0.65,
      rx: 4.5 - i * 0.3,
      ry: 3,
      tilt: Math.cos(angle) * 1.5,
    });
  }
  const spineH = segments.map((_, i) => 2.5 + Math.sin((i / segCount) * Math.PI) * 2);

  // Freeze aura ring
  const auraR = 8 + intensity * 14 + pulse * 2;
  g.circle(coilCX, coilCY, auraR).stroke({
    color: COL_FREEZE_AURA,
    width: 1.5,
    alpha: 0.1 + pulse * 0.15,
  });
  g.circle(coilCX, coilCY, auraR * 0.7).stroke({
    color: COL_ICE_LIGHT,
    width: 1,
    alpha: 0.08 + pulse * 0.1,
  });

  drawShadow(g, coilCX, 0.25 + intensity * 0.1, 15, 2.5);
  drawWyrmBody(g, segments, 1);
  drawDorsalSpines(g, segments, spineH as number[], 1);

  // Ice crystal eruption — spikes burst outward from body
  const crystalCount = 10;
  for (let i = 0; i < crystalCount; i++) {
    const angle = (i / crystalCount) * Math.PI * 2 + t * Math.PI * 0.8;
    const dist = 6 + intensity * 12 + ((i * 7) % 5);
    const cx2 = coilCX + Math.cos(angle) * dist;
    const cy2 = coilCY + Math.sin(angle) * dist * 0.6;
    const cryH = (2 + intensity * 5 + ((i * 3) % 4)) * (0.6 + pulse * 0.4);
    const cryAlpha = clamp01(0.3 + intensity * 0.5 - (i % 3) * 0.1);
    // Crystal spike pointing outward
    const tipX = cx2 + Math.cos(angle) * cryH;
    const tipY = cy2 + Math.sin(angle) * cryH * 0.6;
    const perpX = -Math.sin(angle) * cryH * 0.28;
    const perpY = Math.cos(angle) * cryH * 0.18;
    g.moveTo(tipX, tipY)
      .lineTo(cx2 - perpX, cy2 - perpY)
      .lineTo(cx2 + perpX, cy2 + perpY)
      .closePath()
      .fill({ color: COL_CRYSTAL_HI, alpha: cryAlpha })
      .stroke({ color: COL_ICE_DARK, width: 0.3, alpha: cryAlpha * 0.6 });
  }

  // Central freeze core glow
  g.circle(coilCX, coilCY, 4 + pulse * 2).fill({
    color: COL_EYE_GLOW,
    alpha: 0.08 + intensity * 0.12 + pulse * 0.08,
  });
  g.circle(coilCX, coilCY, 1.5 + pulse).fill({
    color: COL_ICE_LIGHT,
    alpha: 0.3 + intensity * 0.4,
  });

  // Frost particles swirling
  drawFrostParticles(g, coilCX, coilCY, 8, t * 6, 0.55 + intensity * 0.2);

  // Head
  const headAngle = t * Math.PI * 0.5 - Math.PI * 0.15;
  const hx = coilCX + Math.cos(headAngle) * (coilR + 6);
  const hy = coilCY + Math.sin(headAngle) * (coilR + 6) * 0.65;
  drawHead(g, hx, hy, 0.3 + pulse * 0.2, 0.5 + intensity * 0.5);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const crackProgress = clamp01(t * 1.4);
  const shatterT = clamp01((t - 0.5) / 0.5);
  const bodyFade = clamp01(1 - shatterT * 1.1);

  // Body slowly loses cohesion, cracks spread, then shatters
  const sag = t * 8;
  const segments: SegPt[] = [
    { x: 8,  y: GY - 2 + sag * 0.1,       rx: 3,   ry: 2,   tilt: t * 0.5 },
    { x: 14, y: GY - 5 + sag * 0.2,        rx: 4,   ry: 3,   tilt: -t * 0.3 },
    { x: 20, y: GY - 10 + sag * 0.4,       rx: 5,   ry: 3.5, tilt: t },
    { x: 26, y: GY - 14 + sag * 0.6,       rx: 5.5, ry: 4,   tilt: -t * 0.5 },
    { x: 32, y: GY - 17 + sag * 0.8,       rx: 5,   ry: 3.5 },
    { x: 37, y: GY - 19 + sag,             rx: 4.5, ry: 3 },
  ];
  const spineH = [1, 1.5, 2, 2.5, 2, 1.5];

  drawShadow(g, CX, 0.22 * (1 - t * 0.6), 14, 2.5);
  drawWyrmBody(g, segments, bodyFade);
  if (bodyFade > 0.1) {
    drawDorsalSpines(g, segments, spineH as number[], bodyFade);
  }

  // Crack lines spreading across body
  if (crackProgress > 0.1) {
    const crackAlpha = clamp01(crackProgress * 1.5) * bodyFade;
    for (let i = 0; i < 5; i++) {
      const sx = 10 + i * 7;
      const sy = GY - 8 + i * 2 + sag * (i * 0.15);
      const ex = sx + 5 + (i % 3) * 2;
      const ey = sy - 4 - (i % 2) * 3;
      g.moveTo(sx, sy)
        .lineTo((sx + ex) / 2 + 2, (sy + ey) / 2 - 1)
        .lineTo(ex, ey)
        .stroke({ color: COL_ICE_DARK, width: 0.7, alpha: crackAlpha * 0.8 });
      // Sub-crack
      g.moveTo((sx + ex) / 2, (sy + ey) / 2)
        .lineTo((sx + ex) / 2 + 3, (sy + ey) / 2 + 2)
        .stroke({ color: COL_ICE_DARK, width: 0.4, alpha: crackAlpha * 0.5 });
    }
  }

  // Head drooping
  const hx = 40;
  const hy = GY - 18 + sag * 1.1;
  if (bodyFade > 0.05) {
    drawHead(g, hx, hy, 0, 0, bodyFade);
  }

  // Ice shards flying off during shatter
  if (shatterT > 0) {
    const shardCount = 12;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (i * 0.7);
      const dist = shatterT * (8 + (i % 5) * 3);
      const ox = CX + 2;
      const oy = GY - 12;
      const sx = ox + Math.cos(angle) * dist;
      const sy = oy + Math.sin(angle) * dist * 0.55 + shatterT * shatterT * 4;
      const shardAlpha = clamp01((1 - shatterT) * 1.5);
      if (shardAlpha < 0.05) continue;
      const shardW = 1.2 + (i % 4) * 0.7;
      const shardH = 2.5 + (i % 3) * 1.5;
      const rotAngle = angle + shatterT * 3;
      const c = Math.cos(rotAngle);
      const s2 = Math.sin(rotAngle);
      // Oriented shard polygon
      g.moveTo(sx + c * shardH * 0.5, sy + s2 * shardH * 0.5)
        .lineTo(sx - s2 * shardW, sy + c * shardW)
        .lineTo(sx - c * shardH * 0.5, sy - s2 * shardH * 0.5)
        .lineTo(sx + s2 * shardW, sy - c * shardW)
        .closePath()
        .fill({ color: COL_SHARD, alpha: shardAlpha })
        .stroke({ color: COL_ICE_LIGHT, width: 0.3, alpha: shardAlpha * 0.7 });
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
 * Generate all Frost Wyrm sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateFrostWyrmFrames(renderer: Renderer): RenderTexture[] {
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
