// Procedural sprite generator for the Frost Wyrm unit type.
//
// Draws a serpentine ice dragon/wyrm at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Long sinuous body with crystalline scale facets and sub-surface glow
//   • No wings — serpentine slithering movement
//   • Branching ice-crystal dorsal spines with prismatic highlights
//   • Detailed head: multiple horns, nostrils with frost puffs, forked ice tongue
//   • Slit-pupil glowing eyes with pulsing halo
//   • Frost particles: snowflakes, ice shards, mist trails
//   • Layered frost breath with ice crystal projectiles and frost rings
//   • Blizzard cast with swirling snow, ice pillars, freeze-pattern aura
//   • Ice trail and ground frost on move
//   • Dramatic shattering death: per-segment cracking, inner glow escape, ice mist

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — glacial ice blues and whites
const COL_ICE_LIGHT    = 0xd8f0ff;
const COL_ICE_MID      = 0x90c8e8;
const COL_ICE_DARK     = 0x4a90b8;
const COL_ICE_CORE     = 0xb8e4f8;
const COL_ICE_SCALE    = 0x78b8d8;
const COL_CRYSTAL_HI   = 0xeef8ff;
const COL_EYE_GLOW     = 0x22ddff;
const COL_EYE_PUPIL    = 0x008bb0;
const COL_EYE_IRIS     = 0x11aadd;
const COL_SPINE        = 0xa8d8f0;
const COL_SPINE_TIP    = 0xddf4ff;
const COL_BREATH       = 0xccf0ff;
const COL_BREATH_CORE  = 0xffffff;
const COL_FROST_PART   = 0x9ad4ee;

const COL_SHADOW       = 0x000000;
const COL_FREEZE_AURA  = 0x44aadd;
const COL_TONGUE       = 0x88ccee;
const COL_NOSTRIL_FROST = 0xddeeFF;
const COL_SUBSURFACE   = 0x66bbdd;
const COL_PRISMATIC_R  = 0xffaaaa;
const COL_PRISMATIC_G  = 0xaaffaa;
const COL_PRISMATIC_B  = 0xaaaaff;
const COL_INNER_GLOW   = 0x44ccff;
const COL_BLIZZARD     = 0xddeeff;
const COL_ICE_PILLAR   = 0xbbddee;
const COL_FROST_RING   = 0x99ccee;

/* ── helpers ──────────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}


/** Pseudo-random from seed — deterministic for consistent frames. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
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
 * Draw crystalline scale facets on a body segment.
 */
function drawScalePattern(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  segIndex: number,
  alpha: number,
): void {
  // Diamond-shaped scale facets arranged across the segment
  const scaleCount = Math.max(2, Math.floor(rx * 0.8));
  for (let i = 0; i < scaleCount; i++) {
    const sx = x - rx * 0.5 + (i / (scaleCount - 1)) * rx;
    const sy = y - ry * 0.2 + ((i + segIndex) % 2) * ry * 0.3;
    const sz = rx * 0.18;
    // Each scale is a tiny diamond
    g.moveTo(sx, sy - sz)
      .lineTo(sx + sz * 0.7, sy)
      .lineTo(sx, sy + sz * 0.6)
      .lineTo(sx - sz * 0.7, sy)
      .closePath()
      .fill({ color: COL_ICE_SCALE, alpha: alpha * 0.25 })
      .stroke({ color: COL_ICE_DARK, width: 0.2, alpha: alpha * 0.3 });
    // Tiny facet highlight — different on each scale
    if ((i + segIndex) % 3 === 0) {
      g.moveTo(sx, sy - sz)
        .lineTo(sx + sz * 0.4, sy - sz * 0.2)
        .lineTo(sx, sy)
        .closePath()
        .fill({ color: COL_CRYSTAL_HI, alpha: alpha * 0.2 });
    }
  }
}

/**
 * Draw sub-surface scattering glow effect on a segment.
 */
function drawSubsurfaceGlow(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  phase: number,
  alpha: number,
): void {
  const glowPulse = 0.3 + Math.sin(phase) * 0.15;
  // Outer sub-surface scatter
  g.ellipse(x, y, rx * 0.9, ry * 0.85).fill({
    color: COL_SUBSURFACE,
    alpha: alpha * glowPulse * 0.15,
  });
  // Inner bright core
  g.ellipse(x, y + ry * 0.1, rx * 0.4, ry * 0.35).fill({
    color: COL_ICE_CORE,
    alpha: alpha * glowPulse * 0.25,
  });
}

/**
 * Draw a single segment of the wyrm body with enhanced details.
 */
function drawBodySegment(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  tilt: number,
  segIndex: number,
  phase: number,
  alpha = 1,
): void {
  // Sub-surface glow underneath
  drawSubsurfaceGlow(g, x, y, rx, ry, phase + segIndex * 0.7, alpha);

  // Outer body fill
  g.ellipse(x, y, rx, ry)
    .fill({ color: COL_ICE_MID, alpha })
    .stroke({ color: COL_ICE_DARK, width: 0.5, alpha });

  // Scale pattern overlay
  drawScalePattern(g, x, y, rx, ry, segIndex, alpha);

  // Inner lighter core with translucency
  g.ellipse(x, y, rx * 0.6, ry * 0.55).fill({ color: COL_ICE_CORE, alpha: alpha * 0.4 });

  // Top crystalline highlight band — faceted look
  const hlY = y - ry * 0.3;
  g.moveTo(x - rx * 0.45, hlY + ry * 0.1)
    .lineTo(x + tilt * 0.3, hlY - ry * 0.15)
    .lineTo(x + rx * 0.45, hlY + ry * 0.1)
    .closePath()
    .fill({ color: COL_ICE_LIGHT, alpha: alpha * 0.35 });

  // Edge highlight — catches light
  const catchLight = 0.15 + Math.sin(phase + segIndex * 1.1) * 0.1;
  g.ellipse(x + rx * 0.3, y - ry * 0.4, rx * 0.2, ry * 0.15).fill({
    color: COL_CRYSTAL_HI,
    alpha: alpha * catchLight,
  });
}

/**
 * Draw a single crystal spine — basic triangular.
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
  // Facet highlight
  g.moveTo(tipX, tipY)
    .lineTo(x - hw * 0.3, y)
    .stroke({ color: COL_CRYSTAL_HI, width: 0.5, alpha: alpha * 0.7 });
}

/**
 * Draw a branching ice-crystal spine with prismatic highlights.
 */
function drawBranchingSpine(
  g: Graphics,
  x: number,
  y: number,
  h: number,
  tilt: number,
  spineIndex: number,
  alpha = 1,
): void {
  const tipX = x + tilt;
  const tipY = y - h;
  const hw = h * 0.25;

  // Main spine shaft
  g.moveTo(tipX, tipY)
    .lineTo(x - hw, y)
    .lineTo(x + hw, y)
    .closePath()
    .fill({ color: COL_SPINE, alpha })
    .stroke({ color: COL_SPINE_TIP, width: 0.4, alpha });

  // Branching sub-crystals
  const branchCount = spineIndex % 2 === 0 ? 2 : 1;
  for (let b = 0; b < branchCount; b++) {
    const branchY = y - h * (0.4 + b * 0.25);
    const branchX = x + tilt * (0.4 + b * 0.25);
    const bLen = h * (0.35 - b * 0.08);
    const bDir = b % 2 === 0 ? 1 : -1;
    const bTipX = branchX + bDir * bLen * 0.8;
    const bTipY = branchY - bLen * 0.6;
    const bHw = bLen * 0.2;
    g.moveTo(bTipX, bTipY)
      .lineTo(branchX - bHw * bDir * 0.5, branchY)
      .lineTo(branchX + bHw * bDir * 0.5, branchY - bLen * 0.1)
      .closePath()
      .fill({ color: COL_SPINE_TIP, alpha: alpha * 0.8 })
      .stroke({ color: COL_CRYSTAL_HI, width: 0.3, alpha: alpha * 0.6 });
  }

  // Main spine facet highlight
  g.moveTo(tipX, tipY)
    .lineTo(x, y - h * 0.3)
    .stroke({ color: COL_CRYSTAL_HI, width: 0.6, alpha: alpha * 0.6 });

  // Prismatic rainbow highlights — tiny dots at branch tips
  const prismaticColors = [COL_PRISMATIC_R, COL_PRISMATIC_G, COL_PRISMATIC_B];
  const pc = prismaticColors[(spineIndex) % 3];
  g.circle(tipX + 0.3, tipY + 0.5, 0.5).fill({ color: pc, alpha: alpha * 0.25 });
  if (branchCount > 1) {
    const pc2 = prismaticColors[(spineIndex + 1) % 3];
    const bY2 = y - h * 0.65;
    const bX2 = x + tilt * 0.65 + (spineIndex % 2 === 0 ? 1 : -1) * h * 0.25;
    g.circle(bX2, bY2, 0.4).fill({ color: pc2, alpha: alpha * 0.2 });
  }
}

/**
 * Draw the wyrm head with enhanced details.
 * hx/hy = centre of head
 */
function drawHead(
  g: Graphics,
  hx: number,
  hy: number,
  jawOpen = 0,
  glowIntensity = 0,
  phase = 0,
  alpha = 1,
): void {
  const snoutW = 10;
  const snoutH = 5.5;

  // Head sub-surface glow
  g.ellipse(hx, hy, snoutW * 0.7, snoutH * 0.7).fill({
    color: COL_SUBSURFACE,
    alpha: alpha * 0.12,
  });

  // Main head shape — rounded snout
  g.roundRect(hx - snoutW / 2, hy - snoutH / 2, snoutW, snoutH, 2.5)
    .fill({ color: COL_ICE_MID, alpha })
    .stroke({ color: COL_ICE_DARK, width: 0.5, alpha });

  // Scale texture on head
  for (let i = 0; i < 3; i++) {
    const sx = hx - 3 + i * 2.5;
    const sy = hy - 1;
    g.moveTo(sx, sy - 0.8)
      .lineTo(sx + 0.6, sy)
      .lineTo(sx, sy + 0.6)
      .lineTo(sx - 0.6, sy)
      .closePath()
      .fill({ color: COL_ICE_SCALE, alpha: alpha * 0.2 });
  }

  // Top highlight
  g.roundRect(hx - snoutW * 0.35, hy - snoutH * 0.4, snoutW * 0.5, snoutH * 0.25, 1)
    .fill({ color: COL_ICE_LIGHT, alpha: alpha * 0.3 });

  // Nostrils at front of snout — with frost puff
  const nostrilX = hx + snoutW / 2 - 1.5;
  g.circle(nostrilX, hy - 1, 0.5).fill({ color: COL_ICE_DARK, alpha: alpha * 0.6 });
  g.circle(nostrilX, hy + 0.8, 0.5).fill({ color: COL_ICE_DARK, alpha: alpha * 0.6 });
  // Frost puffs from nostrils
  const puffPhase = Math.sin(phase * 2);
  const puffAlpha = alpha * (0.15 + puffPhase * 0.08);
  g.circle(nostrilX + 1.5 + puffPhase * 0.5, hy - 1.5, 0.8 + puffPhase * 0.3)
    .fill({ color: COL_NOSTRIL_FROST, alpha: puffAlpha });
  g.circle(nostrilX + 2 + puffPhase * 0.8, hy + 0.5, 0.6 + puffPhase * 0.2)
    .fill({ color: COL_NOSTRIL_FROST, alpha: puffAlpha * 0.7 });

  // Multiple horns / antler ice crystal formations
  // Main pair — large, sweeping back
  drawBranchingSpine(g, hx - 2, hy - snoutH / 2, 6, -1.2, 0, alpha);
  drawBranchingSpine(g, hx + 1, hy - snoutH / 2, 5, 0.8, 1, alpha);
  // Smaller secondary pair
  drawSpine(g, hx - 3.5, hy - snoutH / 2 + 0.5, 3, -1.5, alpha * 0.8);
  drawSpine(g, hx + 2.5, hy - snoutH / 2 + 0.5, 2.5, 1.2, alpha * 0.8);

  // Jaw with individual teeth
  if (jawOpen > 0) {
    const jawY = hy + snoutH / 2 + jawOpen * 2.5;
    // Lower jaw
    g.moveTo(hx - snoutW / 2 + 1, hy + snoutH / 2)
      .lineTo(hx + snoutW / 2 - 0.5, hy + snoutH / 2)
      .lineTo(hx + snoutW / 2 - 1.5, jawY)
      .lineTo(hx - snoutW / 2 + 1.5, jawY)
      .closePath()
      .fill({ color: COL_ICE_DARK, alpha });
    // Inside mouth
    g.roundRect(hx - snoutW / 2 + 2, hy + snoutH / 2 - 0.5, snoutW - 4, jawOpen * 2, 0.5)
      .fill({ color: 0x225566, alpha: alpha * 0.6 });

    // Upper teeth — individually drawn, varied sizes
    const teethTop = [
      { x: hx - 3, sz: 1.2 }, { x: hx - 1.5, sz: 1.6 },
      { x: hx, sz: 1.0 }, { x: hx + 1.5, sz: 1.8 },
      { x: hx + 3, sz: 1.3 },
    ];
    for (const tooth of teethTop) {
      g.moveTo(tooth.x - 0.4, hy + snoutH / 2 - 0.2)
        .lineTo(tooth.x, hy + snoutH / 2 + tooth.sz * jawOpen)
        .lineTo(tooth.x + 0.4, hy + snoutH / 2 - 0.2)
        .closePath()
        .fill({ color: COL_CRYSTAL_HI, alpha });
    }
    // Lower teeth — fewer, pointing up
    const teethBot = [
      { x: hx - 2, sz: 0.9 }, { x: hx + 0.5, sz: 1.1 }, { x: hx + 2.5, sz: 0.8 },
    ];
    for (const tooth of teethBot) {
      g.moveTo(tooth.x - 0.3, jawY + 0.2)
        .lineTo(tooth.x, jawY - tooth.sz * jawOpen * 0.8)
        .lineTo(tooth.x + 0.3, jawY + 0.2)
        .closePath()
        .fill({ color: COL_SPINE_TIP, alpha: alpha * 0.9 });
    }

    // Forked tongue of ice
    if (jawOpen > 0.3) {
      const tongueAlpha = alpha * clamp01((jawOpen - 0.3) / 0.3);
      const tongueBaseX = hx + snoutW * 0.15;
      const tongueBaseY = (hy + snoutH / 2 + jawY) / 2;
      const tongueLen = jawOpen * 4;
      // Main tongue body
      g.moveTo(tongueBaseX - 0.3, tongueBaseY)
        .lineTo(tongueBaseX + tongueLen * 0.6, tongueBaseY - 0.3)
        .lineTo(tongueBaseX + tongueLen, tongueBaseY - tongueLen * 0.25)
        .stroke({ color: COL_TONGUE, width: 0.6, alpha: tongueAlpha });
      g.moveTo(tongueBaseX + tongueLen * 0.6, tongueBaseY - 0.3)
        .lineTo(tongueBaseX + tongueLen, tongueBaseY + tongueLen * 0.2)
        .stroke({ color: COL_TONGUE, width: 0.5, alpha: tongueAlpha * 0.8 });
    }
  }

  // Eye with detailed iris and slit pupil
  const eyeX = hx + 2.2;
  const eyeY = hy - 0.5;
  const glowR = 1.8 + glowIntensity * 1.2;
  const pulseHalo = Math.sin(phase * 3) * 0.3;

  // Outer glow halo — pulsing
  g.circle(eyeX, eyeY, glowR + 2.5 + pulseHalo).fill({
    color: COL_EYE_GLOW,
    alpha: alpha * (0.08 + glowIntensity * 0.1 + pulseHalo * 0.05),
  });
  g.circle(eyeX, eyeY, glowR + 1.5).fill({
    color: COL_EYE_GLOW,
    alpha: alpha * (0.15 + glowIntensity * 0.2),
  });

  // Iris with ring detail
  g.circle(eyeX, eyeY, glowR).fill({ color: COL_EYE_GLOW, alpha });
  g.circle(eyeX, eyeY, glowR * 0.8).stroke({
    color: COL_EYE_IRIS,
    width: 0.3,
    alpha: alpha * 0.5,
  });

  // Slit pupil (vertical ellipse)
  g.ellipse(eyeX, eyeY, glowR * 0.15, glowR * 0.45).fill({
    color: COL_EYE_PUPIL,
    alpha,
  });
  // Secondary inner pupil ring
  g.circle(eyeX, eyeY, glowR * 0.35).stroke({
    color: COL_EYE_PUPIL,
    width: 0.25,
    alpha: alpha * 0.4,
  });

  // Eye highlight specular
  g.circle(eyeX - 0.6, eyeY - 0.5, 0.5).fill({ color: COL_CRYSTAL_HI, alpha });
  g.circle(eyeX + 0.3, eyeY + 0.3, 0.25).fill({ color: COL_CRYSTAL_HI, alpha: alpha * 0.6 });
}

/**
 * Draw a hexagonal snowflake particle.
 */
function drawSnowflake(
  g: Graphics,
  cx: number,
  cy: number,
  size: number,
  rotation: number,
  alpha: number,
): void {
  // 6 arms radiating from center
  for (let i = 0; i < 6; i++) {
    const angle = rotation + (i / 6) * Math.PI * 2;
    const tipX = cx + Math.cos(angle) * size;
    const tipY = cy + Math.sin(angle) * size;
    g.moveTo(cx, cy)
      .lineTo(tipX, tipY)
      .stroke({ color: COL_CRYSTAL_HI, width: 0.3, alpha });
    // Small branch on each arm
    const midX = cx + Math.cos(angle) * size * 0.55;
    const midY = cy + Math.sin(angle) * size * 0.55;
    const branchAngle1 = angle + Math.PI * 0.25;
    const branchAngle2 = angle - Math.PI * 0.25;
    const brLen = size * 0.3;
    g.moveTo(midX, midY)
      .lineTo(midX + Math.cos(branchAngle1) * brLen, midY + Math.sin(branchAngle1) * brLen)
      .stroke({ color: COL_FROST_PART, width: 0.2, alpha: alpha * 0.7 });
    g.moveTo(midX, midY)
      .lineTo(midX + Math.cos(branchAngle2) * brLen, midY + Math.sin(branchAngle2) * brLen)
      .stroke({ color: COL_FROST_PART, width: 0.2, alpha: alpha * 0.7 });
  }
}

/**
 * Draw an ice crystal shard particle (elongated diamond).
 */
function drawIceShard(
  g: Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotation: number,
  alpha: number,
): void {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  g.moveTo(cx + c * h * 0.5, cy + s * h * 0.5)
    .lineTo(cx - s * w * 0.5, cy + c * w * 0.5)
    .lineTo(cx - c * h * 0.5, cy - s * h * 0.5)
    .lineTo(cx + s * w * 0.5, cy - c * w * 0.5)
    .closePath()
    .fill({ color: COL_CRYSTAL_HI, alpha: alpha * 0.6 })
    .stroke({ color: COL_ICE_LIGHT, width: 0.2, alpha });
}

/**
 * Emit enhanced frost particles — mix of snowflakes, ice shards, mist.
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
    const particleType = (i + Math.floor(seed * 3)) % 3;
    const pAlpha = alpha * (0.35 + ((i * 17) % 10) * 0.06);

    if (particleType === 0) {
      // Snowflake
      const rotation = seed * 0.5 + i * 0.7;
      drawSnowflake(g, px, py, 1.2 + (i % 3) * 0.4, rotation, pAlpha);
    } else if (particleType === 1) {
      // Ice crystal shard
      const rotation = seed + i * 1.1;
      drawIceShard(g, px, py, 0.6, 1.5 + (i % 2) * 0.5, rotation, pAlpha);
    } else {
      // Frost mist — soft circle with trail
      const sz = 0.8 + ((i + seed * 2) % 3) * 0.4;
      g.circle(px, py, sz).fill({ color: COL_FROST_PART, alpha: pAlpha * 0.5 });
      g.circle(px, py, sz * 1.8).fill({ color: COL_FROST_PART, alpha: pAlpha * 0.15 });
      // Tiny trail
      g.moveTo(px, py)
        .lineTo(px - Math.cos(angle) * sz * 2, py - Math.sin(angle) * sz)
        .stroke({ color: COL_FROST_PART, width: 0.3, alpha: pAlpha * 0.3 });
    }
  }
}

/**
 * Draw a frost ring at given position.
 */
function drawFrostRing(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
): void {
  g.circle(cx, cy, radius).stroke({
    color: COL_FROST_RING,
    width: 0.6,
    alpha,
  });
  // Ice crystal notches around ring
  const notchCount = 8;
  for (let i = 0; i < notchCount; i++) {
    const a = (i / notchCount) * Math.PI * 2;
    const nx = cx + Math.cos(a) * radius;
    const ny = cy + Math.sin(a) * radius;
    g.circle(nx, ny, 0.4).fill({ color: COL_CRYSTAL_HI, alpha: alpha * 0.5 });
  }
}

interface SegPt { x: number; y: number; rx: number; ry: number; tilt?: number }

/**
 * Draw the wyrm body with enhanced overlapping segments and detail.
 */
function drawWyrmBody(g: Graphics, segments: SegPt[], phase: number, alpha = 1): void {
  // Draw from tail to head so head renders on top
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    drawBodySegment(g, s.x, s.y, s.rx, s.ry, s.tilt ?? 0, i, phase, alpha);
  }
}

/**
 * Draw dorsal spines along body — varied branching crystals.
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
      // Alternate between branching and simple spines
      if (i % 2 === 0 && spineHeights[i] > 2) {
        drawBranchingSpine(
          g, s.x, s.y - s.ry * 0.6,
          spineHeights[i], (s.tilt ?? 0) * 0.3, i, alpha,
        );
      } else {
        drawSpine(g, s.x, s.y - s.ry * 0.6, spineHeights[i], (s.tilt ?? 0) * 0.3, alpha);
      }
    }
  }
}

/**
 * Draw ice trail on ground behind the wyrm.
 */
function drawGroundFrost(
  g: Graphics,
  startX: number,
  endX: number,
  intensity: number,
  seed: number,
): void {
  // Main ice trail
  for (let i = 0; i < 7; i++) {
    const tx = startX + (i / 6) * (endX - startX);
    const trailAlpha = intensity * (0.06 + i * 0.02);
    g.ellipse(tx, GY - 0.5, 3.5 + i * 0.5, 1.5).fill({
      color: COL_ICE_LIGHT,
      alpha: trailAlpha,
    });
  }
  // Frost spread patterns — branching lines on ground
  for (let i = 0; i < 5; i++) {
    const fx = startX + seededRand(seed + i) * (endX - startX);
    const fLen = 2 + seededRand(seed + i + 10) * 3;
    const fAngle = -Math.PI * 0.5 + (seededRand(seed + i + 20) - 0.5) * 1.2;
    g.moveTo(fx, GY)
      .lineTo(fx + Math.cos(fAngle) * fLen, GY + Math.sin(fAngle) * fLen)
      .stroke({ color: COL_ICE_LIGHT, width: 0.3, alpha: intensity * 0.3 });
    // Small branch
    const bx = fx + Math.cos(fAngle) * fLen * 0.6;
    const by = GY + Math.sin(fAngle) * fLen * 0.6;
    g.moveTo(bx, by)
      .lineTo(bx + Math.cos(fAngle + 0.6) * fLen * 0.4, by + Math.sin(fAngle + 0.6) * fLen * 0.4)
      .stroke({ color: COL_ICE_LIGHT, width: 0.2, alpha: intensity * 0.2 });
  }
}

/**
 * Draw an ice pillar rising from the ground.
 */
function drawIcePillar(
  g: Graphics,
  cx: number,
  height: number,
  width: number,
  alpha: number,
): void {
  const baseY = GY;
  const topY = baseY - height;
  // Main pillar body
  g.moveTo(cx - width * 0.5, baseY)
    .lineTo(cx - width * 0.3, topY + height * 0.15)
    .lineTo(cx, topY)
    .lineTo(cx + width * 0.3, topY + height * 0.15)
    .lineTo(cx + width * 0.5, baseY)
    .closePath()
    .fill({ color: COL_ICE_PILLAR, alpha })
    .stroke({ color: COL_ICE_DARK, width: 0.3, alpha });
  // Highlight facet
  g.moveTo(cx - width * 0.15, baseY)
    .lineTo(cx, topY)
    .lineTo(cx + width * 0.15, baseY)
    .closePath()
    .fill({ color: COL_CRYSTAL_HI, alpha: alpha * 0.3 });
  // Crack lines
  g.moveTo(cx - width * 0.1, baseY - height * 0.3)
    .lineTo(cx + width * 0.05, baseY - height * 0.6)
    .stroke({ color: COL_ICE_DARK, width: 0.2, alpha: alpha * 0.4 });
}

/**
 * Draw a freeze pattern (visible ice crystal pattern like frost on glass).
 */
function drawFreezePattern(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  alpha: number,
): void {
  const branchCount = 6;
  for (let i = 0; i < branchCount; i++) {
    const angle = (i / branchCount) * Math.PI * 2 + seed * 0.3;
    let px = cx;
    let py = cy;
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const stepLen = (radius / steps) * (0.8 + seededRand(seed + i * 10 + s) * 0.4);
      const deviation = (seededRand(seed + i * 10 + s + 50) - 0.5) * 0.4;
      const nx = px + Math.cos(angle + deviation) * stepLen;
      const ny = py + Math.sin(angle + deviation) * stepLen;
      g.moveTo(px, py)
        .lineTo(nx, ny)
        .stroke({ color: COL_ICE_LIGHT, width: 0.35 - s * 0.05, alpha: alpha * (1 - s * 0.2) });
      // Sub-branches
      if (s > 0 && s < 3) {
        const subAngle = angle + deviation + (s % 2 === 0 ? 0.7 : -0.7);
        const subLen = stepLen * 0.5;
        g.moveTo(nx, ny)
          .lineTo(
            nx + Math.cos(subAngle) * subLen,
            ny + Math.sin(subAngle) * subLen,
          )
          .stroke({ color: COL_ICE_LIGHT, width: 0.2, alpha: alpha * 0.5 });
      }
      px = nx;
      py = ny;
    }
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.7;
  const shimmer = Math.sin(t * Math.PI * 2);
  const particleSeed = t * 4;
  const phase = t * Math.PI * 2;

  const segments: SegPt[] = [
    { x: 10, y: GY - 2,      rx: 3.5, ry: 2.5 },
    { x: 16, y: GY - 5,      rx: 4.5, ry: 3 },
    { x: 22, y: GY - 3,      rx: 5,   ry: 3.5 },
    { x: 28, y: GY - 6,      rx: 5.5, ry: 4,   tilt: 1 },
    { x: 22, y: GY - 13 + breathe * 0.4, rx: 5, ry: 3.5 },
    { x: 16, y: GY - 19 + breathe * 0.6, rx: 4.5, ry: 3.2 },
    { x: 22, y: GY - 24 + breathe * 0.8, rx: 5, ry: 3.5, tilt: -1 },
    { x: 30, y: GY - 22 + breathe,       rx: 5.5, ry: 4,   tilt: 1 },
    { x: 37, y: GY - 20 + breathe,       rx: 4.5, ry: 3.2 },
  ];

  const spineH = [1.5, 2, 2.5, 3.5, 3, 3.5, 4, 3, 2.5];

  drawShadow(g, CX + 3, 0.22, 15, 2.5);

  // Enhanced frost particles — snowflakes and shards
  drawFrostParticles(g, 20, GY - 18 + breathe * 0.5, 6, particleSeed, 0.5);
  drawFrostParticles(g, 34, GY - 19 + breathe * 0.8, 5, particleSeed + 1.5, 0.45);
  drawFrostParticles(g, 12, GY - 8, 3, particleSeed + 3, 0.3);

  drawWyrmBody(g, segments, phase);
  drawDorsalSpines(g, segments, spineH);

  // Crystal shimmer highlights with sub-surface pulse
  const shimmerAlpha = 0.08 + shimmer * 0.08;
  g.circle(22, GY - 24 + breathe * 0.8, 5).fill({ color: COL_ICE_LIGHT, alpha: shimmerAlpha });
  g.circle(16, GY - 19 + breathe * 0.6, 3.5).fill({ color: COL_ICE_LIGHT, alpha: shimmerAlpha * 0.7 });
  g.circle(28, GY - 6, 4).fill({ color: COL_SUBSURFACE, alpha: shimmerAlpha * 0.4 });

  // Head
  const hx = 40;
  const hy = GY - 18 + breathe;
  drawHead(g, hx, hy, 0, shimmer * 0.4 + 0.3, phase);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const wave = Math.sin(t * Math.PI * 2);
  const wave2 = Math.sin(t * Math.PI * 2 + Math.PI * 0.5);
  const phase = t * Math.PI * 2;

  const baseY = GY - 12;
  const amp = 5;

  // Segments with more sinuous overlap — vary rx for overlapping effect
  const segments: SegPt[] = [
    { x: 5,  y: baseY + wave2 * amp * 0.2,   rx: 2.5, ry: 2 },
    { x: 10, y: baseY + wave2 * amp * 0.5,   rx: 4,   ry: 2.8 },
    { x: 16, y: baseY + wave * amp * 0.9,    rx: 5,   ry: 3.2, tilt: wave * 1 },
    { x: 22, y: baseY + wave * amp,           rx: 6,   ry: 3.8, tilt: wave * 1.5 },
    { x: 28, y: baseY + wave2 * amp * 0.9,   rx: 6,   ry: 3.8, tilt: wave2 * 1.5 },
    { x: 34, y: baseY + wave2 * amp * 0.6,   rx: 5.5, ry: 3.2, tilt: wave2 },
    { x: 39, y: baseY + wave2 * amp * 0.3,   rx: 4.5, ry: 3 },
  ];

  const spineH = [1, 2, 3, 4.5, 4, 3.5, 2.5];

  // Enhanced ice trail on ground with visible frost spreading
  drawGroundFrost(g, 2, 38, 0.8, t * 10);

  drawShadow(g, CX - 2, 0.2, 18, 2.2);

  // Frost particles kicked up by movement
  const ps = t * 5;
  drawFrostParticles(g, 10, GY - 8 + wave * 3, 5, ps, 0.55);
  drawFrostParticles(g, 24, GY - 11 + wave2 * 3, 5, ps + 2, 0.5);
  drawFrostParticles(g, 38, GY - 10, 3, ps + 4, 0.35);

  drawWyrmBody(g, segments, phase);
  drawDorsalSpines(g, segments, spineH);

  // Head — slightly raised, moving forward
  const hx = 44;
  const hy = baseY + wave2 * amp * 0.1 - 2;
  drawHead(g, hx, hy, 0, 0.2, phase);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.72, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];
  const phase = t * Math.PI * 2;

  const rearUp = t < 0.5 ? t * 2 : 2 - t * 2;
  const breathPower = clamp01((t - 0.3) / 0.3);
  const breathFade = t > 0.7 ? clamp01(1 - (t - 0.7) / 0.3) : 1;
  const jawOpen = clamp01((t - 0.15) / 0.2) * (1 - clamp01((t - 0.8) / 0.2));

  const neckY = GY - 14 - rearUp * 10;
  const segments: SegPt[] = [
    { x: 8,  y: GY - 3,           rx: 3, ry: 2 },
    { x: 14, y: GY - 5,           rx: 4.5, ry: 3 },
    { x: 20, y: GY - 8,           rx: 5.5, ry: 3.5 },
    { x: 26, y: GY - 11,          rx: 6, ry: 4,   tilt: -1 },
    { x: 30, y: GY - 15,          rx: 5.5, ry: 3.5 },
    { x: 33, y: neckY + 6,        rx: 5, ry: 3 },
    { x: 35, y: neckY,            rx: 4.5, ry: 3 },
  ];
  const spineH = [1.5, 2.5, 3.5, 5, 4.5, 4, 3.5];

  drawShadow(g, CX - 3, 0.2, 14, 2.5);
  drawWyrmBody(g, segments, phase);
  drawDorsalSpines(g, segments, spineH);

  // Head
  const hx = 38;
  const hy = neckY - 3;
  drawHead(g, hx, hy, jawOpen, 0.5 + breathPower * 0.5, phase);

  // Enhanced frost breath cone with multiple layers
  if (breathPower > 0) {
    const mouthX = hx + 7;
    const mouthY = hy + 1 + jawOpen * 1.5;
    const coneLen = breathPower * 22 * breathFade;
    const coneW = breathPower * 10 * breathFade;

    // Freezing wave effect — concentric arcs radiating outward
    if (breathPower > 0.3) {
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        const waveDist = mouthX + (w + 1) * coneLen * 0.3;
        const waveH = coneW * 0.4 * (w + 1) / waveCount;
        const waveAlpha = 0.12 * breathFade * (1 - w * 0.25);
        g.moveTo(waveDist, mouthY - waveH)
          .quadraticCurveTo(waveDist + 2, mouthY, waveDist, mouthY + waveH)
          .stroke({ color: COL_FROST_RING, width: 0.6, alpha: waveAlpha });
      }
    }

    // Outermost soft glow layer
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 1.05, mouthY - coneW * 0.7)
      .lineTo(mouthX + coneLen * 1.05, mouthY + coneW * 0.7)
      .closePath()
      .fill({ color: COL_BREATH, alpha: 0.1 * breathFade });

    // Outer cone glow
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen, mouthY - coneW * 0.6)
      .lineTo(mouthX + coneLen, mouthY + coneW * 0.6)
      .closePath()
      .fill({ color: COL_BREATH, alpha: 0.2 * breathFade });

    // Mid cone
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 0.85, mouthY - coneW * 0.45)
      .lineTo(mouthX + coneLen * 0.85, mouthY + coneW * 0.45)
      .closePath()
      .fill({ color: COL_BREATH, alpha: 0.35 * breathFade });

    // Inner bright core
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 0.55, mouthY - coneW * 0.22)
      .lineTo(mouthX + coneLen * 0.55, mouthY + coneW * 0.22)
      .closePath()
      .fill({ color: COL_BREATH_CORE, alpha: 0.55 * breathFade });

    // Innermost white hot core
    g.moveTo(mouthX, mouthY)
      .lineTo(mouthX + coneLen * 0.3, mouthY - coneW * 0.1)
      .lineTo(mouthX + coneLen * 0.3, mouthY + coneW * 0.1)
      .closePath()
      .fill({ color: COL_BREATH_CORE, alpha: 0.7 * breathFade });

    // Frost rings within breath cone
    if (breathPower > 0.4) {
      for (let r = 0; r < 3; r++) {
        const ringDist = mouthX + coneLen * (0.3 + r * 0.25);
        const ringR = coneW * (0.15 + r * 0.1);
        drawFrostRing(g, ringDist, mouthY, ringR, 0.15 * breathFade);
      }
    }

    // Ice crystal projectiles in breath — visible chunks
    for (let i = 0; i < 10; i++) {
      const px = mouthX + (i / 9) * coneLen * 0.95;
      const spread = (i / 9) * coneW * 0.5;
      const py1 = mouthY - spread * (0.3 + ((i * 7) % 5) * 0.14);
      const py2 = mouthY + spread * (0.25 + ((i * 11) % 5) * 0.14);
      const rotation = t * 3 + i * 1.5;

      // Snowflake particles
      if (i % 3 === 0) {
        drawSnowflake(g, px, py1, 1 + (i % 3) * 0.3, rotation, 0.5 * breathFade);
      }
      // Crystal shard projectiles
      drawIceShard(g, px, py2, 0.8, 2 + (i % 4) * 0.5, rotation, 0.55 * breathFade);
      // Bright point particles
      const cr = 0.5 + ((i * 13) % 4) * 0.25;
      g.circle(px, py1, cr).fill({ color: COL_CRYSTAL_HI, alpha: 0.6 * breathFade });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);
  const phase = t * Math.PI * 2;

  const coilR = 10;
  const coilCX = CX;
  const coilCY = GY - 14;

  // Coiled body segments in circle
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
  const spineH = segments.map((_, i) => 2.5 + Math.sin((i / segCount) * Math.PI) * 2.5);

  // Freeze pattern aura — visible ice crystal patterns expanding outward
  const auraR = 8 + intensity * 16 + pulse * 2;
  drawFreezePattern(g, coilCX, coilCY, auraR * 0.8, t * 5, 0.12 + intensity * 0.15);

  // Multiple freeze aura rings
  g.circle(coilCX, coilCY, auraR).stroke({
    color: COL_FREEZE_AURA,
    width: 1.5,
    alpha: 0.12 + pulse * 0.15,
  });
  g.circle(coilCX, coilCY, auraR * 0.75).stroke({
    color: COL_ICE_LIGHT,
    width: 1,
    alpha: 0.08 + pulse * 0.1,
  });
  g.circle(coilCX, coilCY, auraR * 0.5).stroke({
    color: COL_FREEZE_AURA,
    width: 0.6,
    alpha: 0.06 + pulse * 0.08,
  });

  drawShadow(g, coilCX, 0.25 + intensity * 0.1, 15, 2.5);

  // Ice pillars rising from ground
  if (intensity > 0.3) {
    const pillarAlpha = clamp01((intensity - 0.3) / 0.4) * (0.6 + pulse * 0.3);
    drawIcePillar(g, coilCX - 16, 6 + intensity * 10, 3, pillarAlpha * 0.7);
    drawIcePillar(g, coilCX + 15, 5 + intensity * 8, 2.5, pillarAlpha * 0.6);
    drawIcePillar(g, coilCX - 9, 4 + intensity * 6, 2, pillarAlpha * 0.5);
    drawIcePillar(g, coilCX + 10, 7 + intensity * 9, 2.8, pillarAlpha * 0.65);
  }

  drawWyrmBody(g, segments, phase);
  drawDorsalSpines(g, segments, spineH as number[]);

  // Ice crystal eruption spikes
  const crystalCount = 12;
  for (let i = 0; i < crystalCount; i++) {
    const angle = (i / crystalCount) * Math.PI * 2 + t * Math.PI * 0.8;
    const dist = 6 + intensity * 12 + ((i * 7) % 5);
    const cx2 = coilCX + Math.cos(angle) * dist;
    const cy2 = coilCY + Math.sin(angle) * dist * 0.6;
    const cryH = (2 + intensity * 5 + ((i * 3) % 4)) * (0.6 + pulse * 0.4);
    const cryAlpha = clamp01(0.3 + intensity * 0.5 - (i % 3) * 0.1);
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
    // Prismatic highlight on some crystals
    if (i % 3 === 0) {
      const pc = [COL_PRISMATIC_R, COL_PRISMATIC_G, COL_PRISMATIC_B][i % 3];
      g.circle(tipX, tipY, 0.5).fill({ color: pc, alpha: cryAlpha * 0.3 });
    }
  }

  // Central freeze core glow — enhanced
  g.circle(coilCX, coilCY, 5 + pulse * 2.5).fill({
    color: COL_EYE_GLOW,
    alpha: 0.06 + intensity * 0.1 + pulse * 0.06,
  });
  g.circle(coilCX, coilCY, 2.5 + pulse * 1.2).fill({
    color: COL_ICE_LIGHT,
    alpha: 0.25 + intensity * 0.35,
  });
  g.circle(coilCX, coilCY, 1 + pulse * 0.5).fill({
    color: COL_BREATH_CORE,
    alpha: 0.4 + intensity * 0.4,
  });

  // Swirling blizzard snow particles
  const blizzardCount = 8 + Math.floor(intensity * 8);
  for (let i = 0; i < blizzardCount; i++) {
    const swirlAngle = (i / blizzardCount) * Math.PI * 2 + t * Math.PI * 2;
    const swirlR = 5 + (i % 4) * 4 + intensity * 6;
    const sx = coilCX + Math.cos(swirlAngle) * swirlR;
    const sy = coilCY + Math.sin(swirlAngle) * swirlR * 0.5;
    const snowSize = 0.4 + seededRand(i + 100) * 0.5;
    const snowAlpha = 0.15 + intensity * 0.2;
    g.circle(sx, sy, snowSize).fill({ color: COL_BLIZZARD, alpha: snowAlpha });
    // Some as tiny snowflakes
    if (i % 4 === 0) {
      drawSnowflake(g, sx, sy, 0.8, swirlAngle, snowAlpha * 0.7);
    }
  }

  // Enhanced frost particles swirling
  drawFrostParticles(g, coilCX, coilCY, 10, t * 6, 0.55 + intensity * 0.25);

  // Head
  const headAngle = t * Math.PI * 0.5 - Math.PI * 0.15;
  const hx = coilCX + Math.cos(headAngle) * (coilR + 6);
  const hy = coilCY + Math.sin(headAngle) * (coilR + 6) * 0.65;
  drawHead(g, hx, hy, 0.3 + pulse * 0.2, 0.5 + intensity * 0.5, phase);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const crackProgress = clamp01(t * 1.4);
  const shatterT = clamp01((t - 0.5) / 0.5);
  const bodyFade = clamp01(1 - shatterT * 1.1);
  const phase = t * Math.PI * 2;

  const sag = t * 8;
  const segData = [
    { x: 8,  y: GY - 2,  rx: 3,   ry: 2,   tilt: t * 0.5 },
    { x: 14, y: GY - 5,  rx: 4.5, ry: 3,   tilt: -t * 0.3 },
    { x: 20, y: GY - 10, rx: 5.5, ry: 3.5, tilt: t },
    { x: 26, y: GY - 14, rx: 6,   ry: 4,   tilt: -t * 0.5 },
    { x: 32, y: GY - 17, rx: 5.5, ry: 3.5, tilt: t * 0.4 },
    { x: 37, y: GY - 19, rx: 5,   ry: 3,   tilt: -t * 0.3 },
  ];

  // Each segment sags and separates independently
  const segments: SegPt[] = segData.map((s, i) => {
    const sagAmount = sag * (0.1 + i * 0.18);
    // During shatter, segments drift apart
    const shatterDriftX = shatterT * ((i - 2.5) * 2 + Math.sin(i * 2.3) * 3);
    const shatterDriftY = shatterT * (i * 1.5 + shatterT * 4);
    return {
      x: s.x + shatterDriftX,
      y: s.y + sagAmount + shatterDriftY,
      rx: s.rx * (1 - shatterT * 0.3),
      ry: s.ry * (1 - shatterT * 0.3),
      tilt: s.tilt + shatterT * (i % 2 === 0 ? 2 : -2),
    };
  });

  const spineH = [1, 1.5, 2, 2.5, 2, 1.5];

  drawShadow(g, CX, 0.22 * (1 - t * 0.6), 14, 2.5);

  // Inner blue glow escaping from cracks during shatter
  if (crackProgress > 0.3) {
    const glowAlpha = clamp01((crackProgress - 0.3) / 0.3) * bodyFade * 0.4;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      g.circle(s.x, s.y, s.rx * 0.8).fill({
        color: COL_INNER_GLOW,
        alpha: glowAlpha * (0.5 + (i % 3) * 0.15),
      });
    }
  }

  // Draw body segments (each independently cracking)
  if (bodyFade > 0.02) {
    drawWyrmBody(g, segments, phase, bodyFade);
    if (bodyFade > 0.1) {
      drawDorsalSpines(g, segments, spineH as number[], bodyFade);
    }
  }

  // Per-segment crack lines
  if (crackProgress > 0.1 && bodyFade > 0.05) {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const segCrack = clamp01((crackProgress - i * 0.08) * 2);
      if (segCrack <= 0) continue;
      const crackAlpha = segCrack * bodyFade * 0.9;

      // Multiple crack lines per segment
      const crackCount = 2 + (i % 2);
      for (let c = 0; c < crackCount; c++) {
        const startAngle = (c / crackCount) * Math.PI * 2 + i * 1.1;
        const sx2 = s.x + Math.cos(startAngle) * s.rx * 0.2;
        const sy2 = s.y + Math.sin(startAngle) * s.ry * 0.2;
        const ex = s.x + Math.cos(startAngle) * s.rx * 0.9;
        const ey = s.y + Math.sin(startAngle) * s.ry * 0.9;
        const midX = (sx2 + ex) / 2 + Math.sin(startAngle + c) * 1.5;
        const midY = (sy2 + ey) / 2 + Math.cos(startAngle + c) * 1;

        // Main crack
        g.moveTo(sx2, sy2)
          .lineTo(midX, midY)
          .lineTo(ex, ey)
          .stroke({ color: COL_ICE_DARK, width: 0.7, alpha: crackAlpha });

        // Inner glow showing through crack
        g.moveTo(sx2, sy2)
          .lineTo(midX, midY)
          .lineTo(ex, ey)
          .stroke({ color: COL_INNER_GLOW, width: 0.3, alpha: crackAlpha * 0.6 });

        // Sub-crack branch
        g.moveTo(midX, midY)
          .lineTo(midX + Math.cos(startAngle + 1) * 2, midY + Math.sin(startAngle + 1) * 1.5)
          .stroke({ color: COL_ICE_DARK, width: 0.4, alpha: crackAlpha * 0.5 });
      }
    }
  }

  // Head drooping and cracking
  const hx = 40;
  const hy = GY - 18 + sag * 1.1 + shatterT * 6;
  if (bodyFade > 0.05) {
    drawHead(g, hx + shatterT * 3, hy, 0, 0, phase, bodyFade);
  }

  // Ice mist cloud during and after shatter
  if (shatterT > 0) {
    const mistAlpha = clamp01(shatterT * 2) * clamp01(1.5 - shatterT);
    const mistCX = CX + 2;
    const mistCY = GY - 10;
    // Layered mist cloud
    g.ellipse(mistCX, mistCY, 14 + shatterT * 6, 6 + shatterT * 3).fill({
      color: COL_FROST_PART,
      alpha: mistAlpha * 0.12,
    });
    g.ellipse(mistCX, mistCY + 2, 10 + shatterT * 4, 4 + shatterT * 2).fill({
      color: COL_ICE_LIGHT,
      alpha: mistAlpha * 0.08,
    });
    // Swirling mist particles
    for (let i = 0; i < 8; i++) {
      const mAngle = (i / 8) * Math.PI * 2 + shatterT * 3;
      const mDist = 4 + shatterT * 8 + (i % 3) * 2;
      const mx = mistCX + Math.cos(mAngle) * mDist;
      const my = mistCY + Math.sin(mAngle) * mDist * 0.4;
      g.circle(mx, my, 0.8 + (i % 3) * 0.4).fill({
        color: COL_BLIZZARD,
        alpha: mistAlpha * 0.25,
      });
    }
  }

  // Ice shards flying off during shatter — more dramatic
  if (shatterT > 0) {
    const shardCount = 16;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (i * 0.7);
      const dist = shatterT * (8 + (i % 5) * 3.5);
      const ox = CX + 2;
      const oy = GY - 12;
      const sx = ox + Math.cos(angle) * dist;
      const sy = oy + Math.sin(angle) * dist * 0.55 + shatterT * shatterT * 5;
      const shardAlpha = clamp01((1 - shatterT) * 1.5);
      if (shardAlpha < 0.05) continue;

      const shardW = 1.2 + (i % 4) * 0.8;
      const shardH = 2.5 + (i % 3) * 1.8;
      const rotAngle = angle + shatterT * 3;

      drawIceShard(g, sx, sy, shardW, shardH, rotAngle, shardAlpha);

      // Inner glow escaping from each shard
      g.circle(sx, sy, 1 + (i % 2) * 0.5).fill({
        color: COL_INNER_GLOW,
        alpha: shardAlpha * 0.3,
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
