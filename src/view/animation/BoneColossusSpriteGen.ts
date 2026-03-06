// Procedural sprite generator for the Bone Colossus unit type.
//
// Draws a massive undead siege construct at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Huge humanoid assembled from countless fused bones
//   • Ribcages, femurs, skulls, and vertebrae make up the body
//   • Dark-magic purple/green glow holds joints and seams together
//   • Multiple fused skulls form the face — hollow eye sockets flicker
//   • Massive bone-plate fists capable of siege-level smashing
//   • Fills most of the 48×48 frame to convey immense scale

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — aged bone, dark magic glow
const COL_BONE_LT = 0xe8dfc0; // bright bone surface
const COL_BONE_MID = 0xc8b888; // mid bone
const COL_BONE_DK = 0x9a8050; // shadow/recessed bone
const COL_BONE_CR = 0x6a5830; // crack / deepest shadow

const COL_GLOW_GRN = 0x44ff88; // bright green magic glow
const COL_GLOW_PRP = 0xaa44ff; // purple magic glow
const COL_GLOW_MIX = 0x66cc99; // teal blend of the two
const COL_GLOW_CORE = 0xccffcc; // bright core

const COL_EYE_GLOW = 0x88ff44; // skull eye socket glow
const COL_EYE_FIRE = 0xffee44; // inner eye flicker

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 3, alpha = 0.35): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

/** Joint glow disc — the magic binding bones together. */
function drawJoint(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  pulse: number,
  purple = false,
): void {
  const col = purple ? COL_GLOW_PRP : COL_GLOW_GRN;
  const inner = purple ? COL_GLOW_CORE : COL_GLOW_CORE;
  // Outer halo
  g.circle(x, y, r + 1.5).fill({ color: col, alpha: 0.10 + pulse * 0.08 });
  // Mid ring
  g.circle(x, y, r).fill({ color: col, alpha: 0.18 + pulse * 0.12 });
  // Bright core
  g.circle(x, y, r * 0.5).fill({ color: inner, alpha: 0.4 + pulse * 0.3 });
}

/** A single thick bone segment (rounded rectangle). */
function drawBoneRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 2,
  shade = false,
): void {
  g.roundRect(x, y, w, h, r)
    .fill({ color: shade ? COL_BONE_MID : COL_BONE_LT })
    .stroke({ color: COL_BONE_DK, width: 0.5 });
  // Highlight strip
  g.roundRect(x + 1, y + 1, w - 2, 1.2, 0.5).fill({ color: COL_BONE_LT, alpha: 0.4 });
}

/** Rib-cage section — stacked arched ribs. */
function drawRibcage(g: Graphics, cx: number, top: number, w: number, h: number, pulse: number): void {
  const ribCount = 4;
  const ribSpacing = h / ribCount;
  for (let i = 0; i < ribCount; i++) {
    const ry = top + i * ribSpacing;
    const rw = w - i * 1.5;
    // Left rib arc
    g.moveTo(cx - 1, ry)
      .quadraticCurveTo(cx - rw * 0.5, ry + ribSpacing * 0.35, cx - rw * 0.45, ry + ribSpacing * 0.7)
      .stroke({ color: COL_BONE_MID, width: 2 });
    // Right rib arc
    g.moveTo(cx + 1, ry)
      .quadraticCurveTo(cx + rw * 0.5, ry + ribSpacing * 0.35, cx + rw * 0.45, ry + ribSpacing * 0.7)
      .stroke({ color: COL_BONE_MID, width: 2 });
    // Sternum segment
    g.roundRect(cx - 1.5, ry, 3, ribSpacing * 0.65, 0.5).fill({ color: COL_BONE_DK });
    // Joint glow at rib joins
    drawJoint(g, cx - rw * 0.42, ry + ribSpacing * 0.65, 1.2, pulse, i % 2 === 1);
    drawJoint(g, cx + rw * 0.42, ry + ribSpacing * 0.65, 1.2, pulse, i % 2 === 1);
  }
}

/** The fused-skull face — multiple skulls melded together. */
function drawSkullFace(
  g: Graphics,
  cx: number,
  top: number,
  glowPulse: number,
  eyeFlicker: number,
): void {
  const hw = 14;
  const hh = 12;
  // Main cranium mass
  g.roundRect(cx - hw / 2, top, hw, hh, 4)
    .fill({ color: COL_BONE_MID })
    .stroke({ color: COL_BONE_DK, width: 0.6 });
  // Cranium highlight
  g.roundRect(cx - hw / 2 + 2, top + 1, 4, 3, 1).fill({ color: COL_BONE_LT, alpha: 0.35 });
  // Fused secondary skull — offset slightly, left
  g.roundRect(cx - hw / 2 - 1, top + 2, 7, 7, 3)
    .fill({ color: COL_BONE_DK })
    .stroke({ color: COL_BONE_CR, width: 0.4 });
  // Fused secondary skull — right
  g.roundRect(cx + hw / 2 - 6, top + 3, 7, 7, 3)
    .fill({ color: COL_BONE_DK })
    .stroke({ color: COL_BONE_CR, width: 0.4 });
  // Jaw region
  g.roundRect(cx - hw / 2 + 1, top + hh - 4, hw - 2, 5, 2)
    .fill({ color: COL_BONE_MID })
    .stroke({ color: COL_BONE_DK, width: 0.5 });
  // Teeth
  for (let i = 0; i < 5; i++) {
    g.rect(cx - 5 + i * 2.5, top + hh - 1, 1.8, 2.5).fill({ color: COL_BONE_LT });
  }
  // Left eye socket (primary)
  g.circle(cx - 3.5, top + hh * 0.42, 2.8).fill({ color: COL_SHADOW });
  g.circle(cx - 3.5, top + hh * 0.42, 2.8 * glowPulse * 0.6 + 0.5).fill({
    color: COL_EYE_GLOW,
    alpha: 0.3 + glowPulse * 0.4,
  });
  // Right eye socket (primary)
  g.circle(cx + 3.5, top + hh * 0.42, 2.8).fill({ color: COL_SHADOW });
  g.circle(cx + 3.5, top + hh * 0.42, 2.8 * glowPulse * 0.6 + 0.5).fill({
    color: COL_EYE_GLOW,
    alpha: 0.3 + glowPulse * 0.4,
  });
  // Flicker inner spark
  if (eyeFlicker > 0.5) {
    g.circle(cx - 3.5, top + hh * 0.42, 1.0).fill({ color: COL_EYE_FIRE, alpha: eyeFlicker - 0.5 });
    g.circle(cx + 3.5, top + hh * 0.42, 1.0).fill({ color: COL_EYE_FIRE, alpha: eyeFlicker - 0.5 });
  }
  // Secondary eye socket on left sub-skull
  g.circle(cx - hw / 2 + 2.5, top + 5.5, 1.4).fill({ color: COL_SHADOW });
  g.circle(cx - hw / 2 + 2.5, top + 5.5, 1.0).fill({ color: COL_EYE_GLOW, alpha: 0.2 + glowPulse * 0.3 });
  // Crack lines across cranium
  g.moveTo(cx - 1, top + 1)
    .lineTo(cx + 2, top + 5)
    .stroke({ color: COL_BONE_CR, width: 0.4, alpha: 0.6 });
  g.moveTo(cx + 3, top + 2)
    .lineTo(cx + 5, top + 6)
    .stroke({ color: COL_BONE_CR, width: 0.3, alpha: 0.4 });
}

/** Massive bone-plate arm. */
function drawBoneArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  pulse: number,
  purple = false,
): void {
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);
  // Upper bone
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_BONE_MID, width: 6 });
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_BONE_LT, width: 3 });
  // Elbow joint
  drawJoint(g, mx, my, 3.5, pulse, purple);
  // Bone ridges on upper arm
  for (let i = 1; i <= 2; i++) {
    const bx = lerp(sx, mx, i / 3);
    const by = lerp(sy, my, i / 3);
    g.circle(bx, by, 1.2).fill({ color: COL_BONE_DK });
  }
  // Lower bone
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_BONE_MID, width: 6 });
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_BONE_LT, width: 3 });
}

/** Giant bone-plate fist. */
function drawBoneFist(g: Graphics, cx: number, cy: number, scale = 1.0): void {
  const fw = 10 * scale;
  const fh = 8 * scale;
  // Main fist block
  g.roundRect(cx - fw / 2, cy - fh / 2, fw, fh, 2)
    .fill({ color: COL_BONE_MID })
    .stroke({ color: COL_BONE_DK, width: 0.7 });
  // Knuckle ridges
  for (let i = 0; i < 4; i++) {
    g.roundRect(cx - fw / 2 + 0.5 + i * (fw / 4 - 0.2), cy - fh / 2 - 1.5, fw / 4 - 0.5, 3, 1)
      .fill({ color: COL_BONE_LT })
      .stroke({ color: COL_BONE_DK, width: 0.3 });
  }
  // Highlight
  g.roundRect(cx - fw / 2 + 1, cy - fh / 2 + 1, fw - 4, 1.5, 0.5).fill({ color: COL_BONE_LT, alpha: 0.4 });
}

/** Spine column / torso. */
function drawSpineTorso(g: Graphics, cx: number, top: number, h: number, pulse: number): void {
  const tw = 13;
  // Bone plate back
  g.roundRect(cx - tw / 2, top, tw, h, 3)
    .fill({ color: COL_BONE_MID })
    .stroke({ color: COL_BONE_DK, width: 0.6 });
  // Spine knobs
  const knobCount = Math.floor(h / 3.5);
  for (let i = 0; i < knobCount; i++) {
    const ky = top + 2 + i * (h / knobCount);
    g.circle(cx, ky, 1.5).fill({ color: COL_BONE_LT }).stroke({ color: COL_BONE_DK, width: 0.3 });
  }
  // Ribcage drawn over torso
  drawRibcage(g, cx, top + 1, tw + 6, h * 0.7, pulse);
  // Shoulder joint discs
  drawJoint(g, cx - tw / 2 - 1, top + 2, 3, pulse, false);
  drawJoint(g, cx + tw / 2 + 1, top + 2, 3, pulse, false);
}

/** Lower half — pelvis bone structure and thick leg bones. */
function drawLegs(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  stanceL: number,
  stanceR: number,
  pulse: number,
): void {
  const pw = 14;
  // Pelvis plate
  g.roundRect(cx - pw / 2, top, pw, 6, 2)
    .fill({ color: COL_BONE_MID })
    .stroke({ color: COL_BONE_DK, width: 0.5 });
  g.circle(cx, top + 3, 1.5).fill({ color: COL_BONE_LT, alpha: 0.4 });
  // Pelvis-hip joints
  drawJoint(g, cx - pw / 2 + 1, top + 4, 2.5, pulse, true);
  drawJoint(g, cx + pw / 2 - 1, top + 4, 2.5, pulse, true);
  // Left femur
  const lx = cx - 4 + stanceL;
  g.moveTo(cx - pw / 2 + 2, top + 5).lineTo(lx, top + h).stroke({ color: COL_BONE_MID, width: 7 });
  g.moveTo(cx - pw / 2 + 2, top + 5).lineTo(lx, top + h).stroke({ color: COL_BONE_LT, width: 3 });
  // Right femur
  const rx = cx + 4 + stanceR;
  g.moveTo(cx + pw / 2 - 2, top + 5).lineTo(rx, top + h).stroke({ color: COL_BONE_MID, width: 7 });
  g.moveTo(cx + pw / 2 - 2, top + 5).lineTo(rx, top + h).stroke({ color: COL_BONE_LT, width: 3 });
  // Knee joints
  drawJoint(g, lx, top + h, 3, pulse, true);
  drawJoint(g, rx, top + h, 3, pulse, true);
}

/** Feet / lower leg bones. */
function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  pulse: number,
): void {
  const lx = cx - 4 + stanceL;
  const rx = cx + 4 + stanceR;
  const kneeY = gy - 7;
  // Left lower leg
  g.moveTo(lx, kneeY).lineTo(lx + stanceL * 0.3, gy - 1).stroke({ color: COL_BONE_MID, width: 6 });
  g.moveTo(lx, kneeY).lineTo(lx + stanceL * 0.3, gy - 1).stroke({ color: COL_BONE_LT, width: 2.5 });
  // Right lower leg
  g.moveTo(rx, kneeY).lineTo(rx + stanceR * 0.3, gy - 1).stroke({ color: COL_BONE_MID, width: 6 });
  g.moveTo(rx, kneeY).lineTo(rx + stanceR * 0.3, gy - 1).stroke({ color: COL_BONE_LT, width: 2.5 });
  // Foot plates
  drawBoneRect(g, lx + stanceL * 0.3 - 5, gy - 2, 9, 3, 1, true);
  drawBoneRect(g, rx + stanceR * 0.3 - 4, gy - 2, 9, 3, 1, true);
  // Ankle joints
  drawJoint(g, lx + stanceL * 0.3, gy - 2, 2, pulse, false);
  drawJoint(g, rx + stanceR * 0.3, gy - 2, 2, pulse, false);
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;
  // Green glow pulse
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  // Eye flicker — faster than breathe
  const eyeFlicker = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;
  // Subtle bone rattle — tiny jitter
  const rattle = Math.sin(t * Math.PI * 8) * 0.4;

  const legH = 10;
  const torsoH = 14;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + breathe;
  const headTop = torsoTop - 13;

  // Ambient glow aura around body
  g.roundRect(CX - 10, torsoTop - 2, 20, torsoH + 15, 6).fill({
    color: COL_GLOW_GRN,
    alpha: 0.04 + pulse * 0.04,
  });

  drawShadow(g, CX, GY, 14, 3, 0.35);
  drawFeet(g, CX, GY, rattle * 0.3, -rattle * 0.3, pulse);
  drawLegs(g, CX, legTop, legH, rattle * 0.2, -rattle * 0.2, pulse);
  drawSpineTorso(g, CX + rattle * 0.2, torsoTop, torsoH, pulse);

  // Right arm — hanging loosely at side
  const rSx = CX + 7;
  const rSy = torsoTop + 3;
  const rEx = CX + 13 + rattle * 0.5;
  const rEy = torsoTop + torsoH + 1;
  drawBoneArm(g, rSx, rSy, rEx, rEy, pulse, false);
  drawBoneFist(g, rEx, rEy + 4, 1.0);

  // Left arm — hanging
  const lSx = CX - 7;
  const lSy = torsoTop + 3;
  const lEx = CX - 13 - rattle * 0.5;
  const lEy = torsoTop + torsoH + 1;
  drawBoneArm(g, lSx, lSy, lEx, lEy, pulse, true);
  drawBoneFist(g, lEx, lEy + 4, 1.0);

  drawSkullFace(g, CX + rattle * 0.15, headTop, pulse, eyeFlicker);

  // Bone rattle particles — loose fragments
  for (let i = 0; i < 3; i++) {
    const angle = t * Math.PI * 2 + i * 2.1;
    const dist = 2 + i * 1.5;
    const px = CX + Math.cos(angle) * dist * (1 + rattle * 0.3);
    const py = torsoTop + 6 + Math.sin(angle) * dist * 0.5;
    g.circle(px, py, 0.8).fill({ color: COL_BONE_DK, alpha: 0.3 + pulse * 0.2 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.2;
  const pulse = Math.sin(t * Math.PI * 4) * 0.4 + 0.6;

  const stanceL = Math.round(stride * 4);
  const stanceR = Math.round(-stride * 4);

  const legH = 10;
  const torsoH = 14;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + bob * 0.4;
  const headTop = torsoTop - 13;

  // Heavy ground tremor glow
  g.ellipse(CX, GY + 1, 16 + Math.abs(stride) * 2, 4).fill({
    color: COL_GLOW_GRN,
    alpha: 0.07 + Math.abs(stride) * 0.05,
  });
  // Dust/debris at feet on heavy step
  if (Math.abs(stride) > 0.6) {
    const dustAlpha = (Math.abs(stride) - 0.6) * 0.5;
    for (let i = 0; i < 4; i++) {
      const dx = CX + (i - 2) * 5 + stride * 3;
      g.circle(dx, GY - 1, 1.2 + i * 0.3).fill({ color: COL_BONE_DK, alpha: dustAlpha });
    }
  }

  drawShadow(g, CX + stride * 1.5, GY, 14 + Math.abs(stride) * 2, 3, 0.3);
  drawFeet(g, CX, GY, stanceL, stanceR, pulse);
  drawLegs(g, CX, legTop + bob * 0.2, legH, stanceL * 0.5, stanceR * 0.5, pulse);
  drawSpineTorso(g, CX, torsoTop, torsoH, pulse);

  // Arms swing with stride
  const armSwing = stride * 3.5;
  drawBoneArm(g, CX + 7, torsoTop + 3, CX + 12 - armSwing, torsoTop + torsoH, pulse, false);
  drawBoneFist(g, CX + 12 - armSwing, torsoTop + torsoH + 4, 1.0);

  drawBoneArm(g, CX - 7, torsoTop + 3, CX - 12 + armSwing, torsoTop + torsoH, pulse, true);
  drawBoneFist(g, CX - 12 + armSwing, torsoTop + torsoH + 4, 1.0);

  // Loose bones trailing
  for (let i = 0; i < 2; i++) {
    const tx = CX - 8 - i * 5 - Math.abs(stride) * 3;
    const ty = torsoTop + 5 + i * 4 + bob;
    g.circle(tx, ty, 1.0).fill({ color: COL_BONE_DK, alpha: 0.25 + Math.abs(stride) * 0.15 });
  }

  drawSkullFace(g, CX, headTop, pulse, 0.7);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up, 2-3: raise fist high, 4-5: SMASH down, 6-7: recover
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.72, 0.86, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 10;
  const torsoH = 14;
  const legTop = GY - 5 - legH;
  const pulse = 0.8;

  // Lean forward during smash
  const lean = t > 0.38 && t < 0.8 ? (t - 0.38) * 4 : 0;
  const lunge = t > 0.22 && t < 0.86 ? 2 : 0;
  const torsoTop = legTop - torsoH + lean * 0.5;
  const headTop = torsoTop - 13;

  // Impact shockwave at ground when smash lands
  if (t >= 0.55 && t <= 0.72) {
    const impactT = (t - 0.55) / 0.17;
    const shockR = 4 + impactT * 14;
    g.circle(CX + 10, GY - 1, shockR).stroke({
      color: COL_GLOW_GRN,
      width: 1.5,
      alpha: 0.5 * (1 - impactT),
    });
    g.circle(CX + 10, GY - 1, shockR * 0.5).stroke({
      color: COL_GLOW_PRP,
      width: 1,
      alpha: 0.3 * (1 - impactT),
    });
  }

  drawShadow(g, CX + lean, GY, 14, 3, 0.35);
  drawFeet(g, CX, GY, -1, lunge, pulse);
  drawLegs(g, CX, legTop, legH, -1, lunge, pulse);
  drawSpineTorso(g, CX + lean, torsoTop, torsoH, pulse);

  // Left arm — hanging/bracing
  drawBoneArm(g, CX - 7 + lean, torsoTop + 3, CX - 12 + lean, torsoTop + torsoH, pulse, true);
  drawBoneFist(g, CX - 12 + lean, torsoTop + torsoH + 4, 1.0);

  // Right arm — massive overhead raise then SMASH
  let rHandX: number;
  let rHandY: number;
  if (t < 0.38) {
    // Wind up — pull back and up
    rHandX = CX + lerp(12, 8, t / 0.38);
    rHandY = torsoTop + lerp(torsoH, -8, t / 0.38);
  } else if (t < 0.55) {
    // Peak — overhead
    rHandX = CX + lerp(8, 14, (t - 0.38) / 0.17);
    rHandY = torsoTop + lerp(-8, -12, (t - 0.38) / 0.17);
  } else if (t < 0.72) {
    // Smash — crash down hard
    rHandX = CX + lerp(14, 16, (t - 0.55) / 0.17);
    rHandY = torsoTop + lerp(-12, torsoH + 6, (t - 0.55) / 0.17);
  } else {
    // Recover
    rHandX = CX + lerp(16, 12, (t - 0.72) / 0.28);
    rHandY = torsoTop + lerp(torsoH + 6, torsoH + 1, (t - 0.72) / 0.28);
  }

  // Glow trail on descending fist
  if (t >= 0.5 && t <= 0.68) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.6) / 0.08) * 0.5;
    g.moveTo(rHandX, rHandY - 10)
      .lineTo(rHandX + 1, rHandY + 5)
      .stroke({ color: COL_GLOW_GRN, width: 5, alpha: trailAlpha * 0.4 });
    g.moveTo(rHandX, rHandY - 10)
      .lineTo(rHandX + 1, rHandY + 5)
      .stroke({ color: COL_GLOW_PRP, width: 2, alpha: trailAlpha * 0.25 });
  }

  drawBoneArm(g, CX + 7 + lean, torsoTop + 3, rHandX, rHandY, pulse, false);
  drawBoneFist(g, rHandX, rHandY + 4, 1.15);
  drawSkullFace(g, CX + lean * 0.5, headTop, pulse, 0.9);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.6);

  const legH = 10;
  const torsoH = 14;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 13;

  // Bones separate — show glowing magical core at peak
  const separation = Math.sin(t * Math.PI) * 3.5; // 0 → peak → 0

  // Magic core orb at torso center (revealed when bones part)
  if (separation > 0.5) {
    const coreAlpha = clamp01((separation - 0.5) / 3);
    g.circle(CX, torsoTop + torsoH * 0.5, separation * 1.5).fill({
      color: COL_GLOW_CORE,
      alpha: coreAlpha * 0.7,
    });
    g.circle(CX, torsoTop + torsoH * 0.5, separation * 0.8).fill({
      color: COL_GLOW_GRN,
      alpha: coreAlpha * 0.9,
    });
    // Energy tendrils radiating out from core
    for (let i = 0; i < 8; i++) {
      const angle = t * Math.PI * 3 + i * (Math.PI / 4);
      const dist = separation * 2 + i * 0.5;
      g.moveTo(CX, torsoTop + torsoH * 0.5)
        .lineTo(CX + Math.cos(angle) * dist, torsoTop + torsoH * 0.5 + Math.sin(angle) * dist * 0.5)
        .stroke({ color: i % 2 === 0 ? COL_GLOW_GRN : COL_GLOW_PRP, width: 0.8, alpha: coreAlpha * 0.6 });
    }
  }

  // Wide ambient pulse ring
  const ringR = 6 + intensity * 16;
  g.circle(CX, torsoTop + torsoH * 0.5, ringR).stroke({
    color: COL_GLOW_MIX,
    width: 1.2,
    alpha: 0.12 + pulse * 0.1,
  });

  // Magic particles orbiting
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI / 4);
    const dist = 8 + intensity * 14 + separation;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + torsoH * 0.5 + Math.sin(angle) * dist * 0.35;
    const col = i % 2 === 0 ? COL_GLOW_GRN : COL_GLOW_PRP;
    g.circle(px, py, 1.2 + pulse * 0.5).fill({ color: col, alpha: 0.2 + pulse * 0.3 });
  }

  drawShadow(g, CX, GY, 14 + intensity * 2, 3 + intensity, 0.3 + intensity * 0.15);

  // Legs spread wide for stability
  drawFeet(g, CX, GY, -2, 2, pulse);
  drawLegs(g, CX, legTop, legH, -2, 2, pulse);

  // Torso with separation offset — bones part sideways
  drawSpineTorso(g, CX, torsoTop, torsoH, pulse);

  // Arms raised wide — channeling the magic
  const raise = intensity * 8;
  drawBoneArm(g, CX + 7, torsoTop + 3, CX + 16, torsoTop - raise, pulse, false);
  drawBoneFist(g, CX + 16, torsoTop - raise - 4, 0.9);
  drawJoint(g, CX + 16, torsoTop - raise - 4, 3.5 + pulse * 1.5, pulse, false);

  drawBoneArm(g, CX - 7, torsoTop + 3, CX - 16, torsoTop - raise, pulse, true);
  drawBoneFist(g, CX - 16, torsoTop - raise - 4, 0.9);
  drawJoint(g, CX - 16, torsoTop - raise - 4, 3.5 + pulse * 1.5, pulse, true);

  drawSkullFace(g, CX, headTop, pulse, pulse);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 10;
  const torsoH = 14;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 13;

  // Glow fades as magic fails
  const glowFade = 1 - t;
  const pulse = glowFade * 0.5;

  // Magic failure flash at start
  if (t < 0.15) {
    const flashAlpha = (0.15 - t) / 0.15;
    g.roundRect(CX - 12, torsoTop - 2, 24, torsoH + 15, 4).fill({
      color: COL_GLOW_CORE,
      alpha: flashAlpha * 0.4,
    });
  }

  // Bones flying outward — scatter with increasing t
  // Fragments: 8 bones fly in various directions
  const boneCount = 8;
  for (let i = 0; i < boneCount; i++) {
    if (t < i * 0.08) continue; // staggered departure
    const flyT = clamp01((t - i * 0.08) * 1.4);
    const angle = (i / boneCount) * Math.PI * 2 + i * 0.3;
    const speed = 6 + i * 2;
    const bx = CX + Math.cos(angle) * speed * flyT * flyT;
    const by = (headTop + torsoH + 6) + Math.sin(angle) * speed * flyT * 0.5 + flyT * flyT * 4;
    const bAlpha = 1 - flyT * 0.8;
    const bLen = (8 - i * 0.5) * (1 - flyT * 0.3);
    // Draw as short bone segment
    g.moveTo(bx, by)
      .lineTo(bx + Math.cos(angle + 0.5) * bLen, by + Math.sin(angle + 0.5) * bLen)
      .stroke({ color: COL_BONE_MID, width: 3, alpha: bAlpha });
    g.moveTo(bx, by)
      .lineTo(bx + Math.cos(angle + 0.5) * bLen, by + Math.sin(angle + 0.5) * bLen)
      .stroke({ color: COL_BONE_LT, width: 1, alpha: bAlpha * 0.7 });
    // Fading glow on each bone
    g.circle(bx, by, 1.5).fill({ color: COL_GLOW_GRN, alpha: bAlpha * glowFade * 0.4 });
  }

  // Remaining body collapses
  if (t < 0.7) {
    const collapseT = t / 0.7;
    const sinkY = collapseT * collapseT * 8;

    drawShadow(g, CX, GY, 14 - collapseT * 6, 3 + collapseT * 1, 0.35 * (1 - collapseT * 0.5));

    if (t < 0.5) {
      drawFeet(g, CX, GY + sinkY * 0.1, -1 + collapseT * 2, 1 - collapseT * 2, pulse);
    }
    if (t < 0.55) {
      drawLegs(g, CX, legTop + sinkY * 0.3, legH * (1 - collapseT * 0.4), -1, 1, pulse);
    }
    if (t < 0.65) {
      drawSpineTorso(g, CX, torsoTop + sinkY, torsoH * (1 - collapseT * 0.5), pulse);
    }
    if (t < 0.6) {
      drawSkullFace(g, CX, headTop + sinkY * 0.8, pulse * 0.3, 0);
    }
  } else {
    // Late frames — pile of remains on ground
    const pileT = (t - 0.7) / 0.3;
    const pileAlpha = 1 - pileT * 0.5;
    // Skull in pile
    g.roundRect(CX - 5, GY - 6 + pileT * 2, 10, 7, 2)
      .fill({ color: COL_BONE_DK, alpha: pileAlpha })
      .stroke({ color: COL_BONE_CR, width: 0.4, alpha: pileAlpha });
    // Scattered bones
    g.moveTo(CX - 10, GY - 3).lineTo(CX - 2, GY - 1).stroke({ color: COL_BONE_DK, width: 2.5, alpha: pileAlpha * 0.8 });
    g.moveTo(CX + 2, GY - 4).lineTo(CX + 12, GY - 2).stroke({ color: COL_BONE_DK, width: 2, alpha: pileAlpha * 0.7 });
    // Dying glow ember
    g.circle(CX, GY - 4, 2.5).fill({ color: COL_GLOW_GRN, alpha: (1 - pileT) * 0.25 });
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
 * Generate all Bone Colossus sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBoneColossusFrames(renderer: Renderer): RenderTexture[] {
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
