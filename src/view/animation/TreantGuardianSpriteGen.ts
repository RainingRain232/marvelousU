// Procedural sprite generator for the Treant Guardian unit type.
//
// Draws a massive ancient tree creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Brown/green bark body with gnarled trunk torso
//   • Heavy branch arms with leaf clusters at the tips
//   • Root-mass feet spreading across the ground
//   • Knothole face with glowing green eyes
//   • Moss and lichen patches across body
//   • Fills the full 48×48 frame — much larger than humanoid
//
// Animation:
//   IDLE  — gentle swaying, occasional leaf drift
//   MOVE  — slow lumbering, roots lifting and planting
//   ATTACK— massive branch sweep with bark debris
//   CAST  — roots erupt, green nature-magic core glows
//   DIE   — trunk cracks, splinters, collapses into debris pile

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — bark, moss, heartwood
const COL_BARK = 0x6b4a28;        // main bark brown
const COL_BARK_DK = 0x4a3018;     // deep shadow bark
const COL_BARK_LT = 0x8b6a40;     // sunlit bark highlight
// const COL_BARK_HI = 0xa07848;  // bright highlight ridge (reserved)

const COL_HEARTWOOD = 0x8a5a30;   // inner wood exposed
const COL_SAP = 0xc8a050;         // amber sap seep

const COL_MOSS = 0x4a7a32;        // moss patches
const COL_MOSS_LT = 0x6aaa4a;     // bright moss highlight
const COL_LICHEN = 0x7a9060;      // grey-green lichen

const COL_LEAF = 0x3a7a28;        // leaf clusters
const COL_LEAF_LT = 0x5aaa3a;     // bright leaf highlight
const COL_LEAF_YL = 0x8a9a28;     // yellowing leaves

const COL_ROOT = 0x5a3c18;        // surface roots
const COL_ROOT_DK = 0x3c2810;     // root shadow

const COL_EYE_GLOW = 0x44ff66;    // glowing green knothole eyes
const COL_EYE_CORE = 0xaaffbb;    // bright eye core
const COL_EYE_DIM = 0x228844;     // dimmed eye

const COL_NATURE = 0x44dd66;      // nature magic glow
const COL_NATURE_CORE = 0x88ffaa; // nature magic core
// const COL_NATURE_DK = 0x228844; // deep nature (reserved)

const COL_DEBRIS = 0x7a5028;      // flying bark debris
const COL_SPLINTER = 0xb08050;    // light wood splinter

const COL_SHADOW = 0x000000;
const COL_SOIL = 0x4a3018;        // disturbed earth

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
  w = 17,
  h = 3.5,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawRoots(
  g: Graphics,
  cx: number,
  gy: number,
  leftOff: number,
  rightOff: number,
  liftL = 0,
  liftR = 0,
): void {
  // Left root mass
  g.roundRect(cx - 16 + leftOff, gy - 5 + liftL, 12, 5, 2)
    .fill({ color: COL_ROOT })
    .stroke({ color: COL_ROOT_DK, width: 0.5 });
  // Root toe tendrils
  g.moveTo(cx - 16 + leftOff, gy - 1 + liftL)
    .lineTo(cx - 19 + leftOff, gy + 1 + liftL)
    .stroke({ color: COL_ROOT_DK, width: 1.2 });
  g.moveTo(cx - 10 + leftOff, gy - 1 + liftL)
    .lineTo(cx - 8 + leftOff, gy + 2 + liftL)
    .stroke({ color: COL_ROOT_DK, width: 1 });

  // Right root mass
  g.roundRect(cx + 4 + rightOff, gy - 5 + liftR, 12, 5, 2)
    .fill({ color: COL_ROOT })
    .stroke({ color: COL_ROOT_DK, width: 0.5 });
  g.moveTo(cx + 4 + rightOff, gy - 1 + liftR)
    .lineTo(cx + 1 + rightOff, gy + 1 + liftR)
    .stroke({ color: COL_ROOT_DK, width: 1 });
  g.moveTo(cx + 15 + rightOff, gy - 1 + liftR)
    .lineTo(cx + 18 + rightOff, gy + 2 + liftR)
    .stroke({ color: COL_ROOT_DK, width: 1.2 });

  // Surface root lines radiating on ground
  g.moveTo(cx - 4, gy - 1)
    .lineTo(cx - 20, gy + 1)
    .stroke({ color: COL_ROOT_DK, width: 0.7, alpha: 0.4 });
  g.moveTo(cx + 4, gy - 1)
    .lineTo(cx + 20, gy + 1)
    .stroke({ color: COL_ROOT_DK, width: 0.7, alpha: 0.4 });
}

function drawTrunk(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  sway: number,
): void {
  const tw = 18;
  const x = cx - tw / 2 + sway;

  // Main trunk body
  g.roundRect(x, top, tw, h, 4)
    .fill({ color: COL_BARK })
    .stroke({ color: COL_BARK_DK, width: 0.8 });

  // Bark texture vertical ridges
  g.moveTo(x + 3, top + 2)
    .lineTo(x + 2, top + h - 2)
    .stroke({ color: COL_BARK_DK, width: 0.8, alpha: 0.5 });
  g.moveTo(x + 7, top + 1)
    .lineTo(x + 6, top + h - 1)
    .stroke({ color: COL_BARK_DK, width: 0.6, alpha: 0.4 });
  g.moveTo(x + tw - 4, top + 2)
    .lineTo(x + tw - 3, top + h - 2)
    .stroke({ color: COL_BARK_DK, width: 0.8, alpha: 0.5 });
  g.moveTo(x + tw - 8, top + 1)
    .lineTo(x + tw - 7, top + h - 1)
    .stroke({ color: COL_BARK_DK, width: 0.6, alpha: 0.4 });

  // Sunlit highlight edge
  g.moveTo(x + 1, top + 3)
    .lineTo(x + 1, top + h - 3)
    .stroke({ color: COL_BARK_LT, width: 1.2, alpha: 0.4 });
  g.roundRect(x + 1, top + 4, 5, h - 8, 2)
    .fill({ color: COL_BARK_LT, alpha: 0.15 });

  // Bark plates / horizontal crack lines
  g.moveTo(x + 2, top + h * 0.35)
    .lineTo(x + tw - 2, top + h * 0.35)
    .stroke({ color: COL_BARK_DK, width: 0.4, alpha: 0.35 });
  g.moveTo(x + 3, top + h * 0.65)
    .lineTo(x + tw - 3, top + h * 0.65)
    .stroke({ color: COL_BARK_DK, width: 0.4, alpha: 0.3 });

  // Moss patches on trunk
  g.ellipse(cx + sway - 4, top + h * 0.4, 3.5, 2).fill({ color: COL_MOSS, alpha: 0.35 });
  g.ellipse(cx + sway + 5, top + h * 0.6, 2.5, 1.5).fill({ color: COL_MOSS, alpha: 0.3 });
  g.ellipse(cx + sway - 2, top + h * 0.75, 2, 1.2).fill({ color: COL_LICHEN, alpha: 0.25 });

  // Sap seep drip
  g.moveTo(cx + sway + 3, top + 6)
    .quadraticCurveTo(cx + sway + 4, top + 10, cx + sway + 3.5, top + 14)
    .stroke({ color: COL_SAP, width: 0.8, alpha: 0.4 });
}

function drawKnotholeFace(
  g: Graphics,
  cx: number,
  top: number,
  sway: number,
  glowPulse: number,
): void {
  const fw = 14;
  const fh = 12;
  const fx = cx - fw / 2 + sway;

  // Head blob — widened trunk top
  g.roundRect(fx, top, fw, fh, 4)
    .fill({ color: COL_BARK })
    .stroke({ color: COL_BARK_DK, width: 0.6 });
  g.roundRect(fx + 1, top + 1, fw - 2, fh - 4, 3)
    .fill({ color: COL_BARK_LT, alpha: 0.2 });

  // Bark ridges on head
  g.moveTo(fx + 2, top + 2)
    .lineTo(fx + 2, top + fh - 3)
    .stroke({ color: COL_BARK_DK, width: 0.5, alpha: 0.4 });
  g.moveTo(fx + fw - 2, top + 2)
    .lineTo(fx + fw - 2, top + fh - 3)
    .stroke({ color: COL_BARK_DK, width: 0.5, alpha: 0.4 });

  // Knothole eye sockets (dark recesses)
  const eyeY = top + fh * 0.38;
  const eyeGlow = glowPulse > 0 ? COL_EYE_GLOW : COL_EYE_DIM;
  const eyeAlpha = 0.6 + glowPulse * 0.4;

  // Left eye socket
  g.ellipse(cx - 2.8 + sway, eyeY, 2.2, 1.8).fill({ color: COL_BARK_DK });
  g.ellipse(cx - 2.8 + sway, eyeY, 1.6, 1.2).fill({ color: eyeGlow, alpha: eyeAlpha });
  if (glowPulse > 0.5) {
    g.ellipse(cx - 2.8 + sway, eyeY, 0.8, 0.6).fill({ color: COL_EYE_CORE, alpha: 0.9 });
    g.ellipse(cx - 2.8 + sway, eyeY, 3.5, 2.8).fill({ color: COL_EYE_GLOW, alpha: 0.08 + glowPulse * 0.08 });
  }

  // Right eye socket
  g.ellipse(cx + 2.8 + sway, eyeY, 2.2, 1.8).fill({ color: COL_BARK_DK });
  g.ellipse(cx + 2.8 + sway, eyeY, 1.6, 1.2).fill({ color: eyeGlow, alpha: eyeAlpha });
  if (glowPulse > 0.5) {
    g.ellipse(cx + 2.8 + sway, eyeY, 0.8, 0.6).fill({ color: COL_EYE_CORE, alpha: 0.9 });
    g.ellipse(cx + 2.8 + sway, eyeY, 3.5, 2.8).fill({ color: COL_EYE_GLOW, alpha: 0.08 + glowPulse * 0.08 });
  }

  // Grim knothole mouth line
  g.moveTo(cx - 3 + sway, top + fh * 0.7)
    .quadraticCurveTo(cx + sway, top + fh * 0.76, cx + 3 + sway, top + fh * 0.7)
    .stroke({ color: COL_BARK_DK, width: 1 });
}

function drawLeafCrown(
  g: Graphics,
  cx: number,
  top: number,
  sway: number,
  wave: number,
): void {
  // Leaf clusters at the crown
  const clusterPositions: Array<[number, number, number]> = [
    [0, 0, 5.5],
    [-5, 2, 4.5],
    [5, 2.5, 4],
    [-9, 5, 3.5],
    [9, 5.5, 3],
    [-2, -2, 3.5],
    [3, -1, 3],
  ];
  for (const [ox, oy, r] of clusterPositions) {
    const wx = sway + wave * (ox < 0 ? 0.5 : -0.5);
    g.circle(cx + ox + wx, top + oy, r)
      .fill({ color: COL_LEAF })
      .stroke({ color: COL_LEAF_LT, width: 0.3, alpha: 0.5 });
    // Highlight on each cluster
    g.circle(cx + ox + wx - 0.8, top + oy - 0.8, r * 0.35).fill({
      color: COL_LEAF_LT,
      alpha: 0.35,
    });
  }
  // A couple of yellowing leaves for character
  g.circle(cx - 8 + sway + wave, top + 7, 2.5).fill({ color: COL_LEAF_YL, alpha: 0.5 });
  g.circle(cx + 7 + sway - wave, top + 6, 2).fill({ color: COL_LEAF_YL, alpha: 0.4 });
  // Moss on crown
  g.ellipse(cx + sway + 2, top + 3, 3, 1.5).fill({ color: COL_MOSS_LT, alpha: 0.3 });
}

function drawBranchArm(
  g: Graphics,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  leafRadius = 3.5,
): void {
  // Main branch limb
  g.moveTo(startX, startY)
    .lineTo(endX, endY)
    .stroke({ color: COL_BARK, width: 4 });
  // Bark shadow edge
  g.moveTo(startX + 1, startY + 1)
    .lineTo(endX + 1, endY + 1)
    .stroke({ color: COL_BARK_DK, width: 1.5, alpha: 0.4 });
  // Bark highlight
  g.moveTo(startX - 0.5, startY)
    .lineTo(endX - 0.5, endY)
    .stroke({ color: COL_BARK_LT, width: 0.7, alpha: 0.35 });

  // Mid-branch knot
  const kx = lerp(startX, endX, 0.55);
  const ky = lerp(startY, endY, 0.55);
  g.circle(kx, ky, 2).fill({ color: COL_BARK_DK, alpha: 0.4 });

  // Leaf cluster at tip
  g.circle(endX, endY, leafRadius).fill({ color: COL_LEAF });
  g.circle(endX, endY, leafRadius).stroke({ color: COL_LEAF_LT, width: 0.4, alpha: 0.5 });
  g.circle(endX - 0.8, endY - 0.8, leafRadius * 0.4).fill({ color: COL_LEAF_LT, alpha: 0.4 });

  // Small secondary branch sprout
  const sx = lerp(startX, endX, 0.7);
  const sy = lerp(startY, endY, 0.7);
  const sbx = sx + (endY - startY) * 0.25;
  const sby = sy - (endX - startX) * 0.25;
  g.moveTo(sx, sy).lineTo(sbx, sby).stroke({ color: COL_BARK_DK, width: 1.5 });
  g.circle(sbx, sby, leafRadius * 0.55).fill({ color: COL_LEAF, alpha: 0.7 });
}

/* ── leaf particle ───────────────────────────────────────────────────── */

function drawFallingLeaf(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  g.ellipse(x, y, size, size * 0.6)
    .fill({ color: COL_LEAF, alpha })
    .stroke({ color: COL_LEAF_LT, width: 0.3, alpha: alpha * 0.5 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const sway = Math.sin(t * Math.PI * 2) * 1.2;  // gentle trunk sway
  const wave = Math.sin(t * Math.PI * 2) * 0.8;  // leaf ripple
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const glowPulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  // Layout — tree fills full frame height
  const rootTop = GY - 5;
  const trunkBot = rootTop;
  const trunkH = 20;
  const trunkTop = trunkBot - trunkH;
  const faceTop = trunkTop - 12;
  const crownTop = faceTop - 7;

  drawShadow(g, CX, GY, 17 + Math.abs(sway), 3.5);
  drawRoots(g, CX, GY, 0, 0);

  // Occasional drifting leaf
  if (frame % 3 === 0) {
    const lx = CX + 10 + (frame * 7 % 12) - 6;
    const ly = crownTop + 8 + (frame * 11 % 10);
    drawFallingLeaf(g, lx, ly, 1.8, 0.4);
  }

  drawTrunk(g, CX, trunkTop + breathe, trunkH, sway);

  // Left branch arm — resting low
  const lBranchEndX = CX - 20 + sway;
  const lBranchEndY = trunkTop + breathe + 6 + Math.sin(t * Math.PI * 2 + 1) * 0.8;
  drawBranchArm(g, CX - 9 + sway, trunkTop + breathe + 3, lBranchEndX, lBranchEndY, 4);

  // Right branch arm — resting low
  const rBranchEndX = CX + 20 + sway;
  const rBranchEndY = trunkTop + breathe + 5 + Math.sin(t * Math.PI * 2) * 0.8;
  drawBranchArm(g, CX + 9 + sway, trunkTop + breathe + 3, rBranchEndX, rBranchEndY, 4);

  drawKnotholeFace(g, CX, faceTop + breathe, sway * 0.7, glowPulse);
  drawLeafCrown(g, CX, crownTop + breathe, sway * 0.5, wave);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.5; // heavy vertical bounce

  const sway = stride * 1.5;
  const wave = stride * 1;

  const rootTop = GY - 5;
  const trunkH = 20;
  const trunkTop = rootTop - trunkH - bob;
  const faceTop = trunkTop - 12;
  const crownTop = faceTop - 7;

  // Left root lifts on stride
  const lLift = stride > 0 ? stride * 3 : 0;
  const rLift = stride < 0 ? -stride * 3 : 0;

  drawShadow(g, CX, GY, 17 + Math.abs(stride) * 3, 3.5 + Math.abs(stride));

  // Ground disturbance — root impacts
  if (Math.abs(stride) > 0.7) {
    g.ellipse(CX + (stride > 0 ? -10 : 10), GY, 5, 1.5).fill({
      color: COL_SOIL,
      alpha: 0.3,
    });
  }

  drawRoots(g, CX, GY, stride * 4, -stride * 4, lLift, rLift);

  drawTrunk(g, CX, trunkTop, trunkH, sway);

  // Arms swing with gait — branch flail
  const armSwing = stride * 4;
  const lBranchEndX = CX - 20 + sway - armSwing;
  const lBranchEndY = trunkTop + 5 + armSwing * 0.3;
  drawBranchArm(g, CX - 9 + sway, trunkTop + 3, lBranchEndX, lBranchEndY, 4);

  const rBranchEndX = CX + 20 + sway + armSwing;
  const rBranchEndY = trunkTop + 5 - armSwing * 0.3;
  drawBranchArm(g, CX + 9 + sway, trunkTop + 3, rBranchEndX, rBranchEndY, 4);

  const glowPulse = 0.5;
  drawKnotholeFace(g, CX, faceTop, sway * 0.5, glowPulse);
  drawLeafCrown(g, CX, crownTop, sway * 0.4, wave * 2);

  // Leaves dislodged by movement
  if (Math.abs(stride) > 0.6) {
    const lx = CX + stride * 12;
    const ly = crownTop + 3;
    drawFallingLeaf(g, lx, ly, 1.5, 0.45);
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind-up (pull arm back), 2-4: massive sweep forward, 5-6: follow-through, 7: recover
  const phases = [0, 0.1, 0.22, 0.42, 0.62, 0.78, 0.9, 1.0];
  const t = phases[Math.min(frame, 7)];

  const rootTop = GY - 5;
  const trunkH = 20;
  const lean = t < 0.62 ? t * 5 : (1 - t) * 12;
  const trunkTop = rootTop - trunkH;
  const faceTop = trunkTop - 12;
  const crownTop = faceTop - 7;

  drawShadow(g, CX + lean * 0.4, GY, 17 + lean * 0.8, 3.5);
  drawRoots(g, CX, GY, -2, 3);

  // Bark debris particles during sweep
  if (t >= 0.42 && t <= 0.78) {
    const debrisT = clamp01(1 - Math.abs(t - 0.6) / 0.18);
    for (let i = 0; i < 5; i++) {
      const da = 0.3 + i * 0.28;
      const dd = 8 + i * 3 + debrisT * 6;
      g.circle(CX + 12 + Math.cos(da) * dd, faceTop + 4 + Math.sin(da) * dd, 1.2)
        .fill({ color: COL_DEBRIS, alpha: debrisT * 0.55 });
    }
    // Splinter streak
    g.moveTo(CX + 10, trunkTop + 4)
      .lineTo(CX + 22 + debrisT * 6, trunkTop - 2)
      .stroke({ color: COL_SPLINTER, width: 0.8, alpha: debrisT * 0.35 });
  }

  drawTrunk(g, CX, trunkTop, trunkH, lean);

  // Left arm braces back
  const lEndX = CX - 18 + lean * 0.3;
  const lEndY = trunkTop + 8;
  drawBranchArm(g, CX - 9 + lean, trunkTop + 3, lEndX, lEndY, 3);

  // Right arm — massive sweeping arc
  let rEndX: number;
  let rEndY: number;
  let rLeafR: number;
  if (t < 0.22) {
    // Wind-up: pull back
    rEndX = lerp(CX + 18, CX - 8, t / 0.22);
    rEndY = lerp(trunkTop + 4, trunkTop - 6, t / 0.22);
    rLeafR = 4;
  } else if (t < 0.62) {
    // Sweep: arc forward across the enemy
    const st = (t - 0.22) / 0.4;
    rEndX = lerp(CX - 8, CX + 28, st);
    rEndY = lerp(trunkTop - 6, trunkTop + 12, st);
    rLeafR = 4 + st * 1.5;
  } else {
    // Follow-through and recover
    const rt = (t - 0.62) / 0.38;
    rEndX = lerp(CX + 28, CX + 18, rt);
    rEndY = lerp(trunkTop + 12, trunkTop + 4, rt);
    rLeafR = 5 - rt * 1.5;
  }
  drawBranchArm(g, CX + 9 + lean, trunkTop + 3, rEndX, rEndY, rLeafR);

  // Sweep impact flash at peak
  if (t >= 0.52 && t <= 0.72) {
    const impT = clamp01(1 - Math.abs(t - 0.62) / 0.1);
    g.circle(rEndX, rEndY, 6).fill({ color: COL_LEAF_LT, alpha: impT * 0.25 });
    g.circle(rEndX, rEndY, 3).fill({ color: 0xffffff, alpha: impT * 0.15 });
  }

  const glowPulse = t < 0.62 ? 0.8 : 0.3;
  drawKnotholeFace(g, CX, faceTop, lean * 0.6, glowPulse);
  drawLeafCrown(g, CX, crownTop, lean * 0.5, -lean * 0.4);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Root eruption + nature magic: roots surge from ground, green glow fills core
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);
  const sway = Math.sin(t * Math.PI * 2) * 0.6;

  const rootTop = GY - 5;
  const trunkH = 20;
  const trunkTop = rootTop - trunkH;
  const faceTop = trunkTop - 12;
  const crownTop = faceTop - 7;

  // Nature aura glow behind everything
  const glowR = 10 + intensity * 14 + pulse * 5;
  g.circle(CX, trunkTop + trunkH * 0.4, glowR).fill({
    color: COL_NATURE,
    alpha: 0.04 + intensity * 0.07,
  });
  g.circle(CX, trunkTop + trunkH * 0.4, glowR * 0.5).fill({
    color: COL_NATURE_CORE,
    alpha: 0.05 + intensity * 0.08,
  });

  drawShadow(g, CX, GY, 17 + intensity * 4, 3.5, 0.3 + intensity * 0.15);

  // Erupting root tendrils from ground
  if (intensity > 0.15) {
    const rootCount = 5;
    for (let i = 0; i < rootCount; i++) {
      const ra = -0.4 + i * 0.2;
      const rl = (intensity - 0.15) * 18 + i * 2;
      const rx = CX + Math.sin(ra) * rl * 0.8;
      const ry = GY - rl * 0.5;
      const rAlpha = clamp01(intensity - 0.1) * 0.7;
      g.moveTo(CX + Math.sin(ra) * 4, GY)
        .quadraticCurveTo(
          CX + Math.sin(ra) * rl * 0.5 + Math.cos(ra) * 3,
          GY - rl * 0.3,
          rx, ry,
        )
        .stroke({ color: COL_ROOT, width: 1.8, alpha: rAlpha });
      g.circle(rx, ry, 1.5 + pulse * 0.4).fill({ color: COL_NATURE, alpha: rAlpha * 0.6 });
    }
    // Left and right wide eruptions
    const wl = (intensity - 0.15) * 12;
    g.moveTo(CX - 8, GY)
      .quadraticCurveTo(CX - 16, GY - wl * 0.5, CX - 20, GY - wl)
      .stroke({ color: COL_ROOT, width: 2.2, alpha: clamp01(intensity - 0.1) * 0.6 });
    g.moveTo(CX + 8, GY)
      .quadraticCurveTo(CX + 16, GY - wl * 0.5, CX + 20, GY - wl)
      .stroke({ color: COL_ROOT, width: 2.2, alpha: clamp01(intensity - 0.1) * 0.6 });
  }

  drawRoots(g, CX, GY, -2, 2);
  drawTrunk(g, CX, trunkTop, trunkH, sway);

  // Nature magic glowing core — heartwood lit from within
  g.circle(CX + sway, trunkTop + trunkH * 0.45, 4 + pulse * 2.5).fill({
    color: COL_NATURE_CORE,
    alpha: 0.1 + intensity * 0.25 + pulse * 0.1,
  });
  g.circle(CX + sway, trunkTop + trunkH * 0.45, 2).fill({
    color: COL_NATURE_CORE,
    alpha: 0.4 + intensity * 0.4,
  });

  // Arms raised — channeling
  const raise = intensity * 8;
  const lEndX = CX - 20 + sway;
  const lEndY = trunkTop - raise + 2;
  drawBranchArm(g, CX - 9 + sway, trunkTop + 3, lEndX, lEndY, 4.5);

  const rEndX = CX + 20 + sway;
  const rEndY = trunkTop - raise + 1;
  drawBranchArm(g, CX + 9 + sway, trunkTop + 3, rEndX, rEndY, 4.5);

  // Nature particles rising
  for (let i = 0; i < 7; i++) {
    const px = CX + Math.sin(t * Math.PI * 2 + i * 0.9) * (6 + i * 1.5);
    const py = trunkTop + trunkH * 0.4 - intensity * 10 - i * 4;
    const pAlpha = clamp01(intensity - 0.1 - i * 0.06) * (0.35 + pulse * 0.2);
    g.circle(px, py, 1.2 - i * 0.08).fill({ color: COL_NATURE_CORE, alpha: pAlpha });
  }

  drawKnotholeFace(g, CX, faceTop, sway * 0.5, 0.6 + intensity * 0.4 + pulse * 0.2);
  drawLeafCrown(g, CX, crownTop, sway * 0.4, pulse * 2);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Trunk cracks → splinters fly → collapses into bark/leaf debris
  const t = frame / 7;

  const rootTop = GY - 5;
  const trunkH = 20;
  const legTop = rootTop;

  const fallX = t * 10;
  const dropY = t * t * 12;
  const fallAngle = t * 0.8;
  const crumble = 1 - t * 0.2;

  const trunkTop = legTop - trunkH + dropY;
  const faceTop = trunkTop - 12;
  const crownTop = faceTop - 7;

  drawShadow(g, CX + fallX * 0.3, GY, 17 + t * 8, 3.5 + t * 2, 0.3 * (1 - t * 0.5));

  // Crack lines across the trunk
  if (t > 0.1) {
    const cAlpha = clamp01((t - 0.1) * 1.2) * 0.7;
    g.moveTo(CX + fallX * 0.2, trunkTop + 3)
      .lineTo(CX + fallX * 0.2 + 8, trunkTop + 10)
      .lineTo(CX + fallX * 0.2 + 5, trunkTop + 18)
      .stroke({ color: COL_BARK_DK, width: 1.5, alpha: cAlpha });
    g.moveTo(CX + fallX * 0.2 - 4, trunkTop + 6)
      .lineTo(CX + fallX * 0.2 - 9, trunkTop + 14)
      .stroke({ color: COL_BARK_DK, width: 1, alpha: cAlpha * 0.7 });
  }

  // Heartwood exposed at break
  if (t > 0.3) {
    const hAlpha = clamp01((t - 0.3) * 1.5) * 0.6;
    g.ellipse(CX + fallX * 0.2, trunkTop + 12, 5 * crumble, 4 * crumble)
      .fill({ color: COL_HEARTWOOD, alpha: hAlpha });
  }

  // Flying splinters
  for (let i = 0; i < 4; i++) {
    const st = clamp01(t - 0.2 - i * 0.05);
    if (st > 0) {
      const sa = 0.6 + i * 0.45;
      const sd = st * (14 + i * 5);
      g.circle(CX + Math.cos(sa) * sd, trunkTop + 8 + Math.sin(sa) * sd, 1.3 - i * 0.15)
        .fill({ color: COL_SPLINTER, alpha: (1 - st) * 0.6 });
    }
  }

  // Roots splaying outward
  if (t < 0.8) {
    drawRoots(g, CX + fallX * 0.1, GY, t * 6, -t * 4);
  } else {
    // Collapsed root pile
    g.ellipse(CX + fallX * 0.15, GY, 14 + t * 4, 3).fill({ color: COL_ROOT, alpha: 0.6 });
  }

  // Trunk collapses
  if (t < 0.85) {
    drawTrunk(
      g,
      CX + fallX * 0.35,
      trunkTop,
      trunkH * crumble,
      fallAngle * 5,
    );
  } else {
    // Final flat bark heap
    g.ellipse(CX + fallX * 0.4, GY - 3, 16, 4).fill({ color: COL_BARK, alpha: 0.7 });
    g.ellipse(CX + fallX * 0.4, GY - 3, 10, 2).fill({ color: COL_BARK_DK, alpha: 0.4 });
  }

  // Branches fall and scatter
  if (t < 0.6) {
    const lbx = CX - 20 + fallX * 0.1 + dropY * 0.5;
    const lby = trunkTop + 2 + dropY * 0.4;
    drawBranchArm(g, CX - 9 + fallX * 0.2, trunkTop + 3, lbx, lby, 3 * (1 - t * 0.5));
  } else {
    // Branch on ground
    g.moveTo(CX - 14, GY - 2).lineTo(CX - 5, GY - 4)
      .stroke({ color: COL_BARK_DK, width: 2.5, alpha: 0.6 });
  }

  if (t < 0.5) {
    const rbx = CX + 20 + fallX * 0.4;
    const rby = trunkTop + 3 + dropY * 0.6;
    drawBranchArm(g, CX + 9 + fallX * 0.2, trunkTop + 3, rbx, rby, 3 * (1 - t * 0.8));
  }

  // Face and crown fade and break apart
  if (t < 0.5) {
    drawKnotholeFace(g, CX, faceTop + dropY * 0.3, fallAngle * 4, 0.3 * (1 - t * 2));
  }
  if (t < 0.65) {
    drawLeafCrown(g, CX, crownTop + dropY * 0.2, fallAngle * 3, t * 3);
  }

  // Leaf debris raining down
  for (let i = 0; i < 4; i++) {
    const lt = clamp01(t - 0.1 - i * 0.04);
    if (lt > 0) {
      const lx = CX + (i % 2 === 0 ? 8 : -6) + t * (i * 3 - 4);
      const ly = crownTop + 4 + lt * (12 + i * 5);
      drawFallingLeaf(g, lx, ly, 1.5, (1 - lt) * 0.5);
    }
  }

  // Dust cloud on final crash
  if (t > 0.65) {
    const dustT = (t - 0.65) / 0.35;
    for (let i = 0; i < 4; i++) {
      const dx = CX + fallX * 0.3 + (i - 2) * 7;
      const dy = GY - 1 - dustT * 5;
      g.circle(dx, dy, 3 + dustT * 4).fill({
        color: COL_SOIL,
        alpha: (1 - dustT) * 0.22,
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
 * Generate all Treant Guardian sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateTreantGuardianFrames(renderer: Renderer): RenderTexture[] {
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
