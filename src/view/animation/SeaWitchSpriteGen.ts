// Procedural sprite generator for the Sea Witch unit type.
//
// Draws a storm sorceress at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Tattered dark blue/green sea-stained robes
//   • Wild dark hair with seaweed strands
//   • Pale skin, glowing cyan eyes
//   • Twisted driftwood staff topped with glowing sea crystal
//   • Lightning sparks and water droplets orbiting her
//   • Shell and coral jewelry
//   • Storm/wave color scheme throughout

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — sea witch dark blues, cyans, storm greys
const COL_SKIN       = 0xd8dde8; // pale, slightly blue-tinged skin
const COL_SKIN_DK    = 0xb8bdc8;
const COL_SKIN_SH    = 0x9098a8;

const COL_ROBE_TOP   = 0x1a2a4a; // deep navy
const COL_ROBE_MID   = 0x12213a; // darker navy
const COL_ROBE_BOT   = 0x0e1828; // near-black ocean depth

const COL_ROBE_TRIM  = 0x2a6a7a; // teal trim

const COL_ROBE_WORN  = 0x1e3850; // worn/faded patches

const COL_SEAWEED    = 0x2a5a3a; // seaweed strands
const COL_SEAWEED_HI = 0x3a7a4a;

const COL_HAIR       = 0x1a1828; // very dark, near-black hair
const COL_HAIR_HI    = 0x2a2840; // slight purple-blue highlight
const COL_HAIR_DK    = 0x100e1a;

const COL_CRYSTAL    = 0x60f0e0; // glowing sea crystal (top of staff)
const COL_CRYSTAL_HI = 0xa0ffe8;
const COL_CRYSTAL_DK = 0x30c0b0;
const COL_CRYSTAL_GL = 0x40e0d0; // glow

const COL_STAFF      = 0x7a5a3a; // driftwood brown
const COL_STAFF_HI   = 0x9a7a5a;
const COL_STAFF_DK   = 0x5a3a1e;
const COL_STAFF_KNOT = 0x8a6a4a; // gnarled knot

const COL_LIGHTNING  = 0xd0f8ff; // lightning bolt color
const COL_LIGHTNING2 = 0x80d0ff;
const COL_WATER      = 0x40a0d0; // water droplet
const COL_WATER_HI   = 0x80d0f8;

const COL_SHELL      = 0xe8c8a8; // shell jewelry
const COL_CORAL      = 0xd05050; // coral jewelry

const COL_EYE        = 0x00e8d0; // glowing cyan eyes
const COL_EYE_GL     = 0x80fff0;

const COL_ICE        = 0xb8e8ff; // ice projectile

const COL_SHADOW     = 0x000000;
const COL_STORM_DARK = 0x203050; // storm vortex dark
const COL_STORM_MID  = 0x304870; // storm vortex mid

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 9,
  h = 2.5,
  alpha = 0.22,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

// The sea witch floats slightly — her "boots" are robe hem
function drawRobeHem(
  g: Graphics,
  cx: number,
  gy: number,
  wave: number,
  sway: number,
): void {
  // Wide billowing robe base
  const hemW = 14 + Math.abs(wave) * 0.5;
  const hemH = 6;
  const tx = cx - hemW / 2 + sway;
  // Multiple layers for billowing
  g.moveTo(tx, gy - hemH)
    .quadraticCurveTo(tx - 2 + wave, gy - 2, tx + hemW * 0.25, gy)
    .lineTo(tx + hemW * 0.75, gy)
    .quadraticCurveTo(tx + hemW + 2 + wave * 0.5, gy - 2, tx + hemW, gy - hemH)
    .closePath()
    .fill({ color: COL_ROBE_BOT });

  // Teal hem trim — ragged
  g.moveTo(tx - 1, gy - 1)
    .lineTo(tx + hemW * 0.2, gy + 1)
    .lineTo(tx + hemW * 0.4, gy - 1)
    .lineTo(tx + hemW * 0.6, gy + 1)
    .lineTo(tx + hemW * 0.8, gy - 1)
    .lineTo(tx + hemW + 1, gy + 1)
    .stroke({ color: COL_ROBE_TRIM, width: 0.7, alpha: 0.7 });

  // Seaweed strands hanging from hem
  for (let i = 0; i < 3; i++) {
    const sx = tx + 3 + i * 4;
    const wv = wave * (i % 2 === 0 ? 1 : -1) * 0.8;
    g.moveTo(sx, gy - 2)
      .quadraticCurveTo(sx + wv, gy + 2, sx + wv * 1.5, gy + 4)
      .stroke({ color: i % 2 === 0 ? COL_SEAWEED : COL_SEAWEED_HI, width: 0.8 });
  }
}

function drawRobeTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  sway = 0,
): void {
  const tw = 12; // slightly wide-shouldered robe
  const x = cx - tw / 2 + sway;
  // Main robe body
  g.roundRect(x, top, tw, h, 1).fill({ color: COL_ROBE_TOP });
  // Darker inner shadow center
  g.roundRect(x + 3, top + 1, tw - 6, h - 1, 1).fill({ color: COL_ROBE_MID, alpha: 0.5 });
  // Teal/worn accent along sides
  g.moveTo(x, top + 2).lineTo(x, top + h).stroke({ color: COL_ROBE_TRIM, width: 0.7, alpha: 0.5 });
  g.moveTo(x + tw, top + 2).lineTo(x + tw, top + h).stroke({ color: COL_ROBE_TRIM, width: 0.7, alpha: 0.5 });
  // Worn patch
  g.ellipse(cx + 2 + sway, top + h * 0.6, 2, 1.5).fill({ color: COL_ROBE_WORN, alpha: 0.4 });
  // Collar — shell at throat
  g.circle(cx + sway, top + 1.5, 1.2).fill({ color: COL_SHELL });
  g.circle(cx + sway, top + 1.5, 0.6).fill({ color: COL_SHELL, alpha: 0.5 });
  // Coral bead on shoulder
  g.circle(cx - 4 + sway, top + 2, 0.8).fill({ color: COL_CORAL });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  sway = 0,
): void {
  const hw = 7;
  const hh = 8;
  const x = cx - hw / 2 + sway;
  // Pale face
  g.roundRect(x + 0.5, top + 2, hw - 1, hh - 2, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });
  // Cheek shadow — gaunt look
  g.roundRect(x + 0.5, top + hh * 0.45, 2, 2, 0.5).fill({ color: COL_SKIN_SH, alpha: 0.35 });
  g.roundRect(x + hw - 2.5, top + hh * 0.45, 2, 2, 0.5).fill({ color: COL_SKIN_SH, alpha: 0.35 });
  // Glowing cyan eyes
  const eyeY = top + hh * 0.4;
  // Eye glow halo
  g.ellipse(cx - 1.6 + sway, eyeY, 1.8, 1).fill({ color: COL_EYE_GL, alpha: 0.2 });
  g.ellipse(cx + 1.6 + sway, eyeY, 1.8, 1).fill({ color: COL_EYE_GL, alpha: 0.2 });
  // Eye iris
  g.ellipse(cx - 1.6 + sway, eyeY, 1.1, 0.7).fill({ color: COL_EYE });
  g.ellipse(cx + 1.6 + sway, eyeY, 1.1, 0.7).fill({ color: COL_EYE });
  // Pupil slit
  g.ellipse(cx - 1.6 + sway, eyeY, 0.3, 0.6).fill({ color: COL_SHADOW });
  g.ellipse(cx + 1.6 + sway, eyeY, 0.3, 0.6).fill({ color: COL_SHADOW });
  // Sharp brows
  g.moveTo(cx - 2.8 + sway, eyeY - 1.8)
    .lineTo(cx - 0.5 + sway, eyeY - 1.2)
    .stroke({ color: COL_HAIR_DK, width: 0.6 });
  g.moveTo(cx + 2.8 + sway, eyeY - 1.8)
    .lineTo(cx + 0.5 + sway, eyeY - 1.2)
    .stroke({ color: COL_HAIR_DK, width: 0.6 });
  // Thin lips — slightly parted
  g.moveTo(cx - 1 + sway, top + hh * 0.72)
    .lineTo(cx + 1 + sway, top + hh * 0.72)
    .stroke({ color: COL_SKIN_SH, width: 0.5 });
  // Nose hint
  g.moveTo(cx - 0.3 + sway, top + hh * 0.6)
    .lineTo(cx + 0.3 + sway, top + hh * 0.6)
    .stroke({ color: COL_SKIN_DK, width: 0.3, alpha: 0.4 });
}

function drawHair(
  g: Graphics,
  cx: number,
  top: number,
  wave: number,
  sway = 0,
): void {
  const hw = 11;
  const x = cx - hw / 2 + sway;
  // Scalp/top bulk — wild volume
  g.roundRect(x - 1, top - 1, hw + 2, 6, 3).fill({ color: COL_HAIR });
  // Purple-blue highlight sheen
  g.roundRect(x + 1, top, 4, 2.5, 1).fill({ color: COL_HAIR_HI, alpha: 0.35 });
  // Wild strands that flow like underwater currents
  for (let i = 0; i < 7; i++) {
    const sx = x + i * 1.6;
    const wv = wave * (i % 2 === 0 ? 1 : -0.8) * 2;
    const len = 14 + (i % 3) * 3;
    g.moveTo(sx, top + 4)
      .bezierCurveTo(
        sx + wv * 0.4, top + 7,
        sx + wv * 0.8, top + 11,
        sx + wv, top + 4 + len,
      )
      .stroke({ color: i % 3 === 0 ? COL_HAIR : i % 3 === 1 ? COL_HAIR_DK : COL_HAIR_HI, width: i % 2 === 0 ? 1.3 : 0.9 });
  }
  // Seaweed strands woven in hair
  for (let i = 0; i < 2; i++) {
    const sx = x + 2 + i * 5;
    g.moveTo(sx, top + 3)
      .quadraticCurveTo(sx + wave * 1.2 + i, top + 9, sx + wave * 0.8, top + 14)
      .stroke({ color: i === 0 ? COL_SEAWEED : COL_SEAWEED_HI, width: 0.8 });
  }
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  holdingStaff = false,
): void {
  // Robe sleeve
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_TOP, width: 3 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_MID, width: 1, alpha: 0.5 });
  // Coral bead bracelet
  const bx = lerp(sx, ex, 0.7);
  const by = lerp(sy, ey, 0.7);
  if (!holdingStaff) {
    g.circle(bx, by, 1.3).fill({ color: COL_CORAL, alpha: 0.7 });
  }
  // Hand
  g.circle(ex, ey, 1.5).fill({ color: COL_SKIN });
}

function drawDriftwoodStaff(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  crystalPulse: number,
  staffLen = 22,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * staffLen;
  const tipY = by - cos * staffLen;
  const botX = bx - sin * 4;
  const botY = by + cos * 4;

  // Staff shaft — driftwood, slightly gnarled
  g.moveTo(botX, botY).lineTo(tipX, tipY)
    .stroke({ color: COL_STAFF, width: 2.5 });
  // Highlight along one edge
  g.moveTo(botX + cos * 0.5, botY + sin * 0.5)
    .lineTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .stroke({ color: COL_STAFF_HI, width: 0.7, alpha: 0.5 });
  // Dark shadow edge
  g.moveTo(botX - cos * 0.5, botY - sin * 0.5)
    .lineTo(tipX - cos * 0.5, tipY - sin * 0.5)
    .stroke({ color: COL_STAFF_DK, width: 0.6, alpha: 0.5 });
  // Gnarled knot mid-shaft
  const kx = bx + sin * staffLen * 0.5;
  const ky = by - cos * staffLen * 0.5;
  g.circle(kx, ky, 1.5).fill({ color: COL_STAFF_KNOT });

  // Crystal top — glowing sea crystal
  const glowR = 4 + crystalPulse * 2.5;
  // Glow halo
  g.circle(tipX, tipY, glowR + 2).fill({ color: COL_CRYSTAL_GL, alpha: 0.08 + crystalPulse * 0.08 });
  g.circle(tipX, tipY, glowR).fill({ color: COL_CRYSTAL_GL, alpha: 0.12 + crystalPulse * 0.1 });
  // Crystal body — hexagonal-ish
  g.moveTo(tipX, tipY - 3.5 - crystalPulse * 0.3)
    .lineTo(tipX + 2, tipY - 1)
    .lineTo(tipX + 2, tipY + 1)
    .lineTo(tipX, tipY + 3 + crystalPulse * 0.2)
    .lineTo(tipX - 2, tipY + 1)
    .lineTo(tipX - 2, tipY - 1)
    .closePath()
    .fill({ color: COL_CRYSTAL })
    .stroke({ color: COL_CRYSTAL_HI, width: 0.5 });
  // Inner bright core
  g.moveTo(tipX, tipY - 2)
    .lineTo(tipX + 1, tipY)
    .lineTo(tipX, tipY + 2)
    .lineTo(tipX - 1, tipY)
    .closePath()
    .fill({ color: COL_CRYSTAL_HI, alpha: 0.7 + crystalPulse * 0.3 });
  // Crystal facet line
  g.moveTo(tipX - 2, tipY - 0.5).lineTo(tipX + 2, tipY - 0.5)
    .stroke({ color: COL_CRYSTAL_DK, width: 0.4, alpha: 0.5 });
}

function drawLightningOrb(g: Graphics, cx: number, cy: number, size: number, alpha = 0.8): void {
  // Small spark cluster
  g.circle(cx, cy, size).fill({ color: COL_LIGHTNING, alpha: alpha * 0.6 });
  // Tiny spark arms
  const arms = 4;
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    const ex = cx + Math.cos(a) * size * 2;
    const ey = cy + Math.sin(a) * size * 2;
    g.moveTo(cx, cy).lineTo(ex, ey).stroke({ color: COL_LIGHTNING2, width: 0.6, alpha: alpha * 0.7 });
  }
}

function drawWaterDroplet(g: Graphics, cx: number, cy: number, size: number, alpha = 0.75): void {
  g.moveTo(cx, cy - size * 1.5)
    .quadraticCurveTo(cx + size * 1.2, cy - size * 0.2, cx, cy + size)
    .quadraticCurveTo(cx - size * 1.2, cy - size * 0.2, cx, cy - size * 1.5)
    .closePath()
    .fill({ color: COL_WATER, alpha });
  g.ellipse(cx - size * 0.3, cy - size * 0.4, size * 0.25, size * 0.5)
    .fill({ color: COL_WATER_HI, alpha: alpha * 0.7 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const hairWave = Math.sin(t * Math.PI * 2) * 1.2; // flows as if underwater
  const crystalPulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const floatY = Math.sin(t * Math.PI * 2) * 0.8; // gentle float

  const torsoH = 11;
  const legTop = GY - 8;
  const torsoTop = legTop - torsoH + breathe + floatY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX, GY, 8, 2, 0.18 + breathe * 0.03);

  // Robe hem billows
  drawRobeHem(g, CX, GY - floatY, hairWave * 0.7, 0);

  drawHair(g, CX, headTop, hairWave);
  drawRobeTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Staff held in right hand — angled slightly
  const staffAngle = 0.1 + Math.sin(t * Math.PI * 2) * 0.04;
  const rHandX = CX + 7;
  const rHandY = torsoTop + torsoH - 3;
  drawArm(g, CX + 4, torsoTop + 4, rHandX, rHandY, true);
  drawDriftwoodStaff(g, rHandX, rHandY, staffAngle, crystalPulse, 22);

  // Left hand — lightning sparks between fingers
  const lHandX = CX - 8;
  const lHandY = torsoTop + torsoH - 2;
  drawArm(g, CX - 4, torsoTop + 4, lHandX, lHandY);
  // Lightning sparks
  const sparkPhase = t * Math.PI * 4;
  for (let i = 0; i < 3; i++) {
    const sa = sparkPhase + (i / 3) * Math.PI * 2;
    const sr = 3 + Math.sin(sparkPhase + i) * 1;
    const sx = lHandX + Math.cos(sa) * sr;
    const sy = lHandY + Math.sin(sa) * sr * 0.5;
    drawLightningOrb(g, sx, sy, 0.7, 0.5 + crystalPulse * 0.3);
  }

  // Orbiting water droplets
  for (let i = 0; i < 2; i++) {
    const wa = t * Math.PI * 2 + (i / 2) * Math.PI;
    const wr = 10;
    const wx = CX + Math.cos(wa) * wr;
    const wy = torsoTop + 5 + Math.sin(wa) * wr * 0.3;
    drawWaterDroplet(g, wx, wy, 1, 0.4);
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const glide = Math.sin(t * Math.PI * 2); // gliding motion
  const hairWave = -glide * 2.5; // robes/hair billow back
  const floatY = Math.sin(t * Math.PI * 2) * 1.2;
  const crystalPulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
  const sway = glide * 1.2;

  const torsoH = 11;
  const legTop = GY - 8;
  const torsoTop = legTop - torsoH + floatY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX + glide * 2, GY, 9 + Math.abs(glide) * 2, 1.8, 0.15);

  // Wide billowing hem trailing behind
  const hemSway = -glide * 2;
  drawRobeHem(g, CX, GY - floatY * 0.5, hairWave, hemSway);

  drawHair(g, CX, headTop, hairWave, sway * 0.3);
  drawRobeTorso(g, CX, torsoTop, torsoH, sway * 0.4);
  drawHead(g, CX, headTop, sway * 0.3);

  // Staff held forward slightly
  const staffAngle = 0.1 - glide * 0.08;
  const rHandX = CX + 8 + glide * 0.5;
  const rHandY = torsoTop + torsoH - 3;
  drawArm(g, CX + 4, torsoTop + 4, rHandX, rHandY, true);
  drawDriftwoodStaff(g, rHandX, rHandY, staffAngle, crystalPulse, 21);

  // Left arm out for balance
  const lHandX = CX - 8 - glide * 0.5;
  const lHandY = torsoTop + torsoH - 4 + glide * 0.5;
  drawArm(g, CX - 4, torsoTop + 4, lHandX, lHandY);

  // Water particle trail
  for (let i = 0; i < 3; i++) {
    const pt = clamp01(t - i * 0.05);
    const px = CX - 6 - i * 4 - glide;
    const py = torsoTop + 6 + Math.sin(pt * Math.PI * 2) * 2;
    drawWaterDroplet(g, px, py, 0.9, 0.5 - i * 0.13);
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Staff thrust with lightning+ice spiral:
  // 0-1: wind up (pull back)  2-3: thrust forward  4-5: release burst  6-7: recover
  const phases = [0, 0.1, 0.25, 0.45, 0.6, 0.75, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];
  const crystalPulse = t < 0.6 ? t * 1.5 : (1 - t) * 2.5;

  const torsoH = 11;
  const legTop = GY - 8;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 9;

  const lean = t < 0.5 ? lerp(0, 3.5, t * 2) : lerp(3.5, 0, (t - 0.5) * 2);

  drawShadow(g, CX + lean * 0.4, GY, 9 + lean * 0.5, 2.2);
  drawRobeHem(g, CX, GY, -lean * 0.5, lean * 0.3);
  drawHair(g, CX, headTop, lean * 0.4);
  drawRobeTorso(g, CX, torsoTop, torsoH, lean * 0.4);
  drawHead(g, CX, headTop, lean * 0.25);

  // Staff lunge — thrust forward
  const staffLean = t < 0.5 ? lerp(0.1, -0.3, t * 2) : lerp(-0.3, 0.1, (t - 0.5) * 2);
  const staffReach = lean;
  const rHandX = CX + 7 + staffReach;
  const rHandY = torsoTop + torsoH - 4;
  drawArm(g, CX + 4, torsoTop + 4, rHandX, rHandY, true);
  drawDriftwoodStaff(g, rHandX, rHandY, staffLean, crystalPulse, 22);

  // Left arm raised — channeling into bolt
  const liftT = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
  const lHandX = CX - 5 + lean * 0.3;
  const lHandY = torsoTop + 1 - liftT * 5;
  drawArm(g, CX - 4, torsoTop + 4, lHandX, lHandY);

  // Lightning bolt projectile
  if (t >= 0.3 && t <= 0.85) {
    const boltAlpha = clamp01((t - 0.3) / 0.15) * clamp01((0.85 - t) / 0.15);
    const boltX = rHandX + 10;
    const boltY = rHandY - 8;
    // Jagged bolt
    g.moveTo(rHandX + 4, rHandY - 3)
      .lineTo(boltX - 3, boltY + 3)
      .lineTo(boltX, boltY)
      .lineTo(boltX + 5, boltY - 4)
      .stroke({ color: COL_LIGHTNING, width: 1.8, alpha: boltAlpha });
    g.moveTo(rHandX + 4, rHandY - 3)
      .lineTo(boltX - 3, boltY + 3)
      .lineTo(boltX, boltY)
      .lineTo(boltX + 5, boltY - 4)
      .stroke({ color: COL_LIGHTNING2, width: 3.5, alpha: boltAlpha * 0.2 });
    // Ice shard spiraling around bolt
    const iceAngle = t * Math.PI * 6;
    for (let i = 0; i < 3; i++) {
      const ia = iceAngle + (i / 3) * Math.PI * 2;
      const ix = lerp(rHandX, boltX + 5, i / 2) + Math.cos(ia) * 3;
      const iy = lerp(rHandY - 3, boltY - 4, i / 2) + Math.sin(ia) * 3;
      g.moveTo(ix, iy - 2).lineTo(ix + 1, iy).lineTo(ix - 1, iy).closePath()
        .fill({ color: COL_ICE, alpha: boltAlpha * 0.8 });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.3 + 0.2);
  const crystalPulse = intensity;

  const torsoH = 11;
  const legTop = GY - 8;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 9;
  const floatLift = intensity * 2; // rises slightly during cast

  // Storm vortex above — dark swirling rings
  const vortexCX = CX;
  const vortexCY = headTop - 6;
  for (let ring = 3; ring >= 0; ring--) {
    const r = 4 + ring * 4 + intensity * 5;
    const ringAlpha = (0.08 + intensity * 0.12) * (1 - ring * 0.18);
    const rotOffset = t * Math.PI * 2 + ring * 0.5;
    // Slightly elliptical storm rings
    g.ellipse(vortexCX, vortexCY, r, r * 0.55)
      .stroke({ color: ring % 2 === 0 ? COL_STORM_DARK : COL_STORM_MID, width: 1.5, alpha: ringAlpha });
    // Lightning arcs in ring
    if (ring < 2) {
      for (let arc = 0; arc < 3; arc++) {
        const aa = rotOffset + (arc / 3) * Math.PI * 2;
        const ax1 = vortexCX + Math.cos(aa) * r * 0.7;
        const ay1 = vortexCY + Math.sin(aa) * r * 0.55 * 0.7;
        const ax2 = vortexCX + Math.cos(aa + 0.6) * r;
        const ay2 = vortexCY + Math.sin(aa + 0.6) * r * 0.55;
        g.moveTo(ax1, ay1).lineTo(ax2, ay2)
          .stroke({ color: COL_LIGHTNING, width: 0.8, alpha: pulse * 0.5 * intensity });
      }
    }
  }

  // Ice crystals in storm
  for (let i = 0; i < 5; i++) {
    const ia = t * Math.PI * 2 * (i % 2 === 0 ? 1 : -1) + (i / 5) * Math.PI * 2;
    const ir = 6 + intensity * 7 + i * 1.5;
    const ix = vortexCX + Math.cos(ia) * ir;
    const iy = vortexCY + Math.sin(ia) * ir * 0.5;
    g.moveTo(ix, iy - 2.2).lineTo(ix + 1.3, iy).lineTo(ix - 1.3, iy).closePath()
      .fill({ color: COL_ICE, alpha: 0.5 + pulse * 0.3 });
  }

  drawShadow(g, CX, GY, 9 + intensity * 2, 2.5, 0.2 + intensity * 0.1);
  drawRobeHem(g, CX, GY - floatLift, pulse * 1.5, 0);
  drawHair(g, CX, headTop - floatLift, pulse * 2);
  drawRobeTorso(g, CX, torsoTop - floatLift, torsoH);
  drawHead(g, CX, headTop - floatLift);

  // Both arms raised, staff high
  const raise = intensity * 7 + floatLift;
  const rHandX = CX + 5;
  const rHandY = torsoTop - raise + 2;
  drawArm(g, CX + 4, torsoTop + 4 - floatLift, rHandX, rHandY, true);
  drawDriftwoodStaff(g, rHandX, rHandY, 0.0, crystalPulse, 18);

  const lHandX = CX - 7;
  const lHandY = torsoTop - raise + 4;
  drawArm(g, CX - 4, torsoTop + 4 - floatLift, lHandX, lHandY);
  // Left hand crackling
  for (let i = 0; i < 4; i++) {
    const sa = t * Math.PI * 4 + (i / 4) * Math.PI * 2;
    const sr = 3.5 + pulse;
    const sx = lHandX + Math.cos(sa) * sr;
    const sy = lHandY + Math.sin(sa) * sr * 0.6;
    drawLightningOrb(g, sx, sy, 0.8, 0.5 + pulse * 0.4);
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const crystalPulse = Math.max(0, 1 - t * 1.6); // dims as she dies

  const torsoH = 11;
  const legTop = GY - 8;
  const dropY = t * t * 10;
  const torsoTop = legTop - torsoH + dropY;
  const headTop = torsoTop - 9;
  const fallSide = t * 8;
  const slump = t * 0.6;

  drawShadow(g, CX + fallSide * 0.3, GY, 9 + t * 2, 2, 0.18 * (1 - t * 0.5));

  // Hair falls limp — loses the underwater flow
  if (t < 0.9) {
    drawHair(g, CX + fallSide * 0.3, headTop + dropY * 0.2, t * 0.5 - 0.5); // minimal wave — dead weight
  }

  // Robe collapses
  drawRobeHem(g, CX + fallSide * 0.1, GY, -t * 0.8, fallSide * 0.1);
  drawRobeTorso(g, CX + fallSide * 0.4, torsoTop, torsoH * (1 - t * 0.1), slump * 4);
  if (t < 0.85) {
    drawHead(g, CX + fallSide * 0.4, headTop + dropY * 0.3, slump * 4.5);
  }

  // Staff falls — drops from hand, crystal dims
  if (t < 0.7) {
    const sfx = CX + fallSide * 0.2;
    const sfy = torsoTop + torsoH - 3 + dropY * 0.4;
    const staffFallAngle = 0.1 + t * 1.5;
    drawDriftwoodStaff(g, sfx, sfy, staffFallAngle, crystalPulse * 0.5, 22 * (1 - t * 0.2));
  } else {
    // Staff on ground
    const sfx = CX + 8;
    const sfy = GY - 1;
    g.moveTo(sfx - 10, sfy).lineTo(sfx + 6, sfy - 1)
      .stroke({ color: COL_STAFF, width: 2 });
    // Dim crystal remnant
    g.circle(sfx + 6, sfy - 1, 2).fill({ color: COL_CRYSTAL_DK, alpha: crystalPulse * 0.4 });
  }

  // Lightning sparks fade out
  if (t < 0.4) {
    const fadeAlpha = 1 - t / 0.4;
    for (let i = 0; i < 2; i++) {
      const sx = CX - 6 + fallSide * 0.2 + i * 3;
      const sy = torsoTop + torsoH - 2;
      drawLightningOrb(g, sx, sy, 0.9, fadeAlpha * 0.5);
    }
  }

  // Arm flopped to side
  if (t > 0.35) {
    const ax = CX + fallSide * 0.4 + 4;
    const ay = torsoTop + 4;
    drawArm(g, ax, ay, ax + 6, ay + torsoH - 3);
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
 * Generate all Sea Witch sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSeaWitchFrames(renderer: Renderer): RenderTexture[] {
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
