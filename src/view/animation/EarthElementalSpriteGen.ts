// Procedural sprite generator for the Earth Elemental unit type.
//
// 144×144 px per frame (3×3 tiles). A living mountain given terrible purpose:
//   • Massive granite / boulder armor plates with crystal veins
//   • Amber/green crystal growths on shoulders and head
//   • Thick stone limbs with mossy cracks
//   • No weapon — fights with enormous stone fists
//   • Pebble / dust particle trail
//   • Ground-tremor cast, crumbling death

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Frame dimensions
// ---------------------------------------------------------------------------
const FW = 144;
const FH = 144;
const CX = FW / 2;
const GY = FH - 10;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const COL_GRANITE       = 0x5a534a;
const COL_GRANITE_LT    = 0x7a7268;
const COL_GRANITE_DK    = 0x3a3430;
const COL_BOULDER       = 0x6b6358;
const COL_STONE_EDGE    = 0x484038;
const COL_MOSS          = 0x4a6630;
const COL_MOSS_LT       = 0x6a8a48;
const COL_CRYSTAL       = 0x88cc44;
const COL_CRYSTAL_BRIGHT= 0xbbee66;
const COL_CRYSTAL_DK    = 0x558822;
const COL_AMBER         = 0xcc9933;
const COL_AMBER_BRIGHT  = 0xeebb55;
const COL_DIRT          = 0x8b7355;
const COL_DIRT_DK       = 0x5a4a35;
const COL_EYE           = 0xccff66;
const COL_EYE_GLOW      = 0x88cc22;
const COL_SHADOW        = 0x000000;
const COL_DUST          = 0x9a8a70;
const COL_CRUMBLE       = 0x4a4238;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, cy: number, scale = 1): void {
  g.ellipse(cx, cy + 4, 36 * scale, 10 * scale)
    .fill({ color: COL_SHADOW, alpha: 0.45 });
  g.ellipse(cx, cy + 2, 28 * scale, 6 * scale)
    .fill({ color: COL_DIRT_DK, alpha: 0.1 });
}

/** Draw the massive stone legs */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 14;

    // thigh — thick granite column
    const kneeY = hipY + 26;
    g.roundRect(legX - 9, hipY + offset * 0.3, 18, kneeY - hipY, 3)
      .fill({ color: COL_GRANITE_DK });
    // stone crack on thigh
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_GRANITE_LT, width: 1.2 });
    // moss accent
    g.moveTo(legX + side * 4, hipY + 8)
      .lineTo(legX + side * 5, hipY + 14)
      .stroke({ color: COL_MOSS, width: 1.5 });

    // knee joint — amber crystal
    g.ellipse(legX, kneeY + offset * 0.4, 7, 5)
      .fill({ color: COL_STONE_EDGE });
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_AMBER, alpha: 0.7 });

    // shin
    const footY = kneeY + 24;
    g.roundRect(legX - 8, kneeY + offset * 0.4, 16, footY - kneeY, 2)
      .fill({ color: COL_GRANITE_DK });
    // shin crack
    g.moveTo(legX + 2, kneeY + 6).lineTo(legX - 1, kneeY + 16)
      .stroke({ color: COL_GRANITE_LT, width: 1 });

    // foot — broad stone
    g.roundRect(legX - 11, footY + offset * 0.5, 22, 7, 3)
      .fill({ color: COL_BOULDER });
    g.roundRect(legX - 11, footY + offset * 0.5, 22, 7, 3)
      .stroke({ color: COL_STONE_EDGE, width: 0.8 });
  }
}

/** Draw the massive torso with stone plates and crystal veins */
function drawTorso(
  g: Graphics,
  cx: number, torsoY: number,
  breathe: number,
): void {
  const tw = 32 + breathe * 0.3;
  const th = 38;

  // back plate
  g.roundRect(cx - tw - 2, torsoY - th / 2 - 2, (tw + 2) * 2, th + 4, 6)
    .fill({ color: COL_GRANITE_DK });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .fill({ color: COL_BOULDER });

  // chest plate
  g.roundRect(cx - 24, torsoY - 15, 48, 30, 5)
    .fill({ color: COL_GRANITE });
  g.roundRect(cx - 24, torsoY - 15, 48, 30, 5)
    .stroke({ color: COL_GRANITE_LT, width: 1 });

  // stone cracks across chest
  g.moveTo(cx - 1, torsoY - 15)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 12)
    .stroke({ color: COL_GRANITE_LT, width: 2 });

  // diagonal cracks
  g.moveTo(cx - 20, torsoY - 8)
    .lineTo(cx - 6, torsoY + 4)
    .stroke({ color: COL_GRANITE_LT, width: 1.5 });
  g.moveTo(cx + 20, torsoY - 6)
    .lineTo(cx + 8, torsoY + 6)
    .stroke({ color: COL_GRANITE_LT, width: 1.5 });

  // crystal vein across chest (green/amber)
  g.moveTo(cx - 14, torsoY - 6)
    .quadraticCurveTo(cx, torsoY - 2, cx + 12, torsoY - 8)
    .stroke({ color: COL_CRYSTAL, width: 2.5 });
  g.moveTo(cx - 14, torsoY - 6)
    .quadraticCurveTo(cx, torsoY - 2, cx + 12, torsoY - 8)
    .stroke({ color: COL_CRYSTAL_BRIGHT, width: 1 });

  // core crystal glow
  g.ellipse(cx, torsoY - 2, 6 + breathe * 0.4, 7 + breathe * 0.4)
    .fill({ color: COL_CRYSTAL, alpha: 0.12 + breathe * 0.02 });

  // shoulder armor — massive boulder pauldrons
  for (const side of [-1, 1] as const) {
    g.ellipse(cx + side * 30, torsoY - 12, 14, 11)
      .fill({ color: COL_GRANITE });
    g.ellipse(cx + side * 30, torsoY - 12, 14, 11)
      .stroke({ color: COL_STONE_EDGE, width: 0.8 });
    // crystal growth on shoulder
    g.moveTo(cx + side * 30, torsoY - 24)
      .lineTo(cx + side * 27, torsoY - 15)
      .lineTo(cx + side * 33, torsoY - 15)
      .closePath()
      .fill({ color: COL_CRYSTAL_DK });
    g.moveTo(cx + side * 30, torsoY - 22)
      .lineTo(cx + side * 28, torsoY - 15)
      .lineTo(cx + side * 32, torsoY - 15)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: 0.6 });
    // smaller crystal shard
    g.moveTo(cx + side * 25, torsoY - 20)
      .lineTo(cx + side * 24, torsoY - 14)
      .lineTo(cx + side * 27, torsoY - 14)
      .closePath()
      .fill({ color: COL_CRYSTAL_DK, alpha: 0.7 });
    // moss patch
    g.ellipse(cx + side * 28, torsoY - 6, 6, 3)
      .fill({ color: COL_MOSS, alpha: 0.4 });
  }

  // belt / waist plate
  g.roundRect(cx - 26, torsoY + 12, 52, 9, 3)
    .fill({ color: COL_GRANITE_DK });
  g.roundRect(cx - 26, torsoY + 12, 52, 9, 3)
    .stroke({ color: COL_STONE_EDGE, width: 0.8 });
  // amber buckle
  g.ellipse(cx, torsoY + 16, 4, 3).fill({ color: COL_AMBER_BRIGHT });
  g.ellipse(cx, torsoY + 16, 2, 1.5).fill({ color: COL_CRYSTAL_BRIGHT });
}

/** Draw the head — a rough stone skull with crystal crown */
function drawHead(
  g: Graphics,
  cx: number, headY: number,
  phase: number,
): void {
  // neck
  g.roundRect(cx - 9, headY + 10, 18, 12, 4)
    .fill({ color: COL_GRANITE_DK });
  g.moveTo(cx, headY + 12).lineTo(cx + 1, headY + 18)
    .stroke({ color: COL_GRANITE_LT, width: 1 });

  // skull shape
  g.roundRect(cx - 15, headY - 10, 30, 23, 7)
    .fill({ color: COL_GRANITE });
  g.roundRect(cx - 15, headY - 10, 30, 23, 7)
    .stroke({ color: COL_STONE_EDGE, width: 0.6 });

  // brow ridge — heavy stone shelf
  g.roundRect(cx - 17, headY - 8, 34, 7, 3)
    .fill({ color: COL_BOULDER });

  // cracks on skull
  g.moveTo(cx - 4, headY - 10).lineTo(cx - 2, headY - 2)
    .stroke({ color: COL_GRANITE_LT, width: 1 });
  g.moveTo(cx + 5, headY - 10).lineTo(cx + 3, headY)
    .stroke({ color: COL_GRANITE_LT, width: 0.8 });

  // jaw
  g.roundRect(cx - 11, headY + 4, 22, 9, 4)
    .fill({ color: COL_BOULDER });
  g.moveTo(cx - 8, headY + 9).lineTo(cx + 8, headY + 9)
    .stroke({ color: COL_STONE_EDGE, width: 1.2 });

  // eyes — glowing crystal green
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 7;
    const ey = headY - 3;
    g.ellipse(ex, ey, 5, 3.5).fill({ color: COL_SHADOW });
    g.ellipse(ex, ey, 4, 3).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_EYE });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: 0xeeffcc, alpha: 0.5 });
    g.ellipse(ex, ey, 7, 5).fill({ color: COL_EYE_GLOW, alpha: 0.08 });
  }

  // crystal crown — angular crystal shards rising from skull
  const crystals = [
    { dx: 0,   h: 20, w: 6 },
    { dx: -8,  h: 15, w: 5 },
    { dx: 8,   h: 16, w: 5 },
    { dx: -14, h: 10, w: 4 },
    { dx: 14,  h: 11, w: 4 },
    { dx: -4,  h: 17, w: 4 },
    { dx: 5,   h: 16, w: 4 },
  ];

  for (const c of crystals) {
    const fx = cx + c.dx;
    const shimmer = Math.sin(phase * 3 + c.dx * 0.4) * 1;
    const tipY = headY - 12 - c.h - shimmer;
    const baseY2 = headY - 8;

    // outer crystal (dark)
    g.moveTo(fx - c.w * 0.5, baseY2)
      .lineTo(fx + shimmer * 0.2, tipY)
      .lineTo(fx + c.w * 0.5, baseY2)
      .closePath()
      .fill({ color: COL_CRYSTAL_DK, alpha: 0.8 });

    // inner crystal (bright)
    g.moveTo(fx - c.w * 0.25, baseY2)
      .lineTo(fx + shimmer * 0.1, tipY + 3)
      .lineTo(fx + c.w * 0.25, baseY2)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: 0.7 });

    // crystal highlight
    g.moveTo(fx - c.w * 0.1, baseY2)
      .lineTo(fx, tipY + 6)
      .lineTo(fx + c.w * 0.1, baseY2)
      .closePath()
      .fill({ color: COL_CRYSTAL_BRIGHT, alpha: 0.4 });
  }
}

/** Draw an arm made of solid stone */
function drawArm(
  g: Graphics,
  shoulderX: number, shoulderY: number,
  elbowAngle: number,
  forearmAngle: number,
  side: number,
): void {
  const upperLen = 22;
  const foreLen = 20;

  const elbowX = shoulderX + Math.cos(elbowAngle) * upperLen * side;
  const elbowY = shoulderY + Math.sin(elbowAngle) * upperLen;

  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_GRANITE_DK, width: 11 });
  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_GRANITE_LT, width: 2 });

  // elbow joint
  g.circle(elbowX, elbowY, 7).fill({ color: COL_GRANITE });
  g.circle(elbowX, elbowY, 4).fill({ color: COL_AMBER, alpha: 0.5 });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_AMBER_BRIGHT, alpha: 0.4 });

  // forearm
  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_GRANITE_DK, width: 10 });
  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_GRANITE_LT, width: 1.5 });

  // fist — massive stone
  g.circle(handX, handY, 8).fill({ color: COL_BOULDER });
  g.circle(handX, handY, 8).stroke({ color: COL_STONE_EDGE, width: 1 });
  // fist crack
  g.moveTo(handX - 2, handY - 3).lineTo(handX + 2, handY + 3)
    .stroke({ color: COL_GRANITE_LT, width: 1 });
}

/** Draw falling pebbles / dust particles */
function drawDust(
  g: Graphics,
  cx: number, baseY: number,
  phase: number,
  count: number,
  spread: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5 + phase * 50;
    const px = cx + Math.sin(seed * 0.1) * spread;
    const py = baseY - (seed * 0.12 % 40) + phase * 10;
    const size = 0.8 + (i % 3) * 0.5;
    const a = alpha * (1 - ((seed * 0.12 % 40) / 40));
    if (py > baseY - 60 && py < baseY + 5) {
      const col = i % 3 === 0 ? COL_DUST : i % 3 === 1 ? COL_DIRT : COL_GRANITE_LT;
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });
    }
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const phase = t * Math.PI * 2;

  const torsoY = GY - 60 + breathe;
  const headY = torsoY - 34;

  drawShadow(g, CX, GY);
  drawLegs(g, CX, torsoY + 20, breathe * 0.3);
  drawTorso(g, CX, torsoY, breathe);

  drawArm(g, CX - 30, torsoY - 8, 0.4, 0.8, -1);
  drawArm(g, CX + 30, torsoY - 8, 0.4, 0.8, 1);

  drawHead(g, CX, headY + breathe * 0.3, phase);

  drawDust(g, CX, GY, phase * 0.2, 6, 25, 0.3);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 3;
  const stride = Math.sin(walk) * 5;
  const phase = t * Math.PI * 2;

  const torsoY = GY - 60 + bob;
  const headY = torsoY - 34;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);

  drawLegs(g, CX, torsoY + 20, stride);
  drawTorso(g, CX, torsoY, 0);

  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 30, torsoY - 8, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 30, torsoY - 8, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);

  drawHead(g, CX, headY + bob * 0.3, phase);

  // dust kicked up while walking
  drawDust(g, CX + 8, GY, phase * 0.3, 12, 30, 0.5);

  // ground impact dust puffs on footfall
  if (Math.abs(stride) > 4) {
    const footSide = stride > 0 ? 1 : -1;
    g.ellipse(CX + footSide * 14, GY + 2, 8, 3)
      .fill({ color: COL_DUST, alpha: 0.15 });
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const phase = frame * 0.9;

  let lunge = 0;
  let armRaise = 0;
  let impactShake = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    lunge = lt * 8;
  } else if (t < 0.75) {
    armRaise = 0.5;
    lunge = 8;
    impactShake = 1 - (t - 0.55) / 0.2;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    lunge = lerp(8, 0, lt);
  }

  const torsoY = GY - 60;
  const headY = torsoY - 34;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);

  drawLegs(g, attackCX, torsoY + 20, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  // left arm braces
  drawArm(g, attackCX - 30, torsoY - 8, 0.3, 0.6, -1);

  // right arm smashes downward
  const smashElbow = 0.2 - armRaise * 1.2;
  const smashFore = lerp(0.8, -0.3, armRaise);
  drawArm(g, attackCX + 30, torsoY - 8, smashElbow, smashFore, 1);

  // ground impact effect
  if (impactShake > 0.3) {
    const impX = attackCX + 30 + Math.cos(smashFore) * 20;
    const impY = torsoY - 8 + Math.sin(smashElbow) * 22 + Math.sin(smashFore) * 20;
    // rock burst
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + t * 2;
      const dist = 8 + impactShake * 14;
      g.circle(impX + Math.cos(angle) * dist, impY + Math.sin(angle) * dist, 2)
        .fill({ color: COL_DIRT, alpha: impactShake * 0.6 });
    }
    // dust cloud
    g.ellipse(impX, impY + 5, 16 * impactShake, 6 * impactShake)
      .fill({ color: COL_DUST, alpha: 0.25 * impactShake });
  }

  drawHead(g, attackCX, headY, phase);
  drawDust(g, attackCX, GY, phase * 0.3, 14, 30, 0.5 + impactShake * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const phase = frame * 0.8;

  // ground slam: arms raise (0-0.3), slam down (0.3-0.5), shockwave (0.5-0.85), subsides (0.85-1)
  let armRaise = 0;
  let slamProgress = 0;
  let waveProgress = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.5) {
    armRaise = 1 - (t - 0.3) / 0.2;
    slamProgress = (t - 0.3) / 0.2;
  } else if (t < 0.85) {
    armRaise = 0;
    slamProgress = 1;
    waveProgress = (t - 0.5) / 0.35;
  } else {
    slamProgress = 1 - (t - 0.85) / 0.15;
    waveProgress = 1 - (t - 0.85) / 0.15;
  }

  const torsoY = GY - 60 - armRaise * 4 + slamProgress * 3;
  const headY = torsoY - 34;

  drawShadow(g, CX, GY, 1 + waveProgress * 0.3);

  // ground cracks from slam
  if (slamProgress > 0.5) {
    const crackLen = (slamProgress - 0.5) * 2 * 45;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const endX = CX + Math.cos(angle) * crackLen;
      const endY = GY + 2 + Math.sin(angle) * crackLen * 0.15;
      g.moveTo(CX, GY + 2)
        .lineTo(endX, endY)
        .stroke({ color: COL_GRANITE_LT, width: 2 * slamProgress });
    }
  }

  // shockwave ring
  if (waveProgress > 0) {
    const radius = waveProgress * 55;
    g.circle(CX, GY, radius)
      .stroke({ color: COL_DIRT, width: 3, alpha: 0.4 * (1 - waveProgress) });
    g.circle(CX, GY, radius * 0.7)
      .stroke({ color: COL_AMBER, width: 2, alpha: 0.3 * (1 - waveProgress) });

    // flying rock debris
    for (let i = 0; i < 10; i++) {
      const angle = i * 0.628 + waveProgress * 2;
      const dist = radius * 0.6 + i * 3;
      const rx = CX + Math.cos(angle) * dist;
      const ry = GY - 5 - waveProgress * 20 + Math.sin(angle + phase) * 8;
      g.rect(rx - 2, ry - 2, 4, 4)
        .fill({ color: COL_BOULDER, alpha: 0.6 * (1 - waveProgress) });
    }
  }

  drawLegs(g, CX, torsoY + 20, 0);
  drawTorso(g, CX, torsoY, armRaise * 2);

  // arms raised then slam down
  const raiseAngle = -0.5 - armRaise * 1.2 + slamProgress * 1.5;
  drawArm(g, CX - 30, torsoY - 8, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 30, torsoY - 8, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, phase);

  drawDust(g, CX, GY, phase * 0.3, 18 + waveProgress * 12, 45, 0.5 + waveProgress * 0.4);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.5;
  const phase = frame * 0.3;
  const crumble = clamp01((t - 0.4) / 0.6);

  g.alpha = fade;

  const torsoY = GY - 60 + crumble * 25;
  const headY = torsoY - 34 + crumble * 10;
  const tilt = crumble * 5;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 20, crumble * 3);

    // torso crumbling
    g.roundRect(CX + tilt - 32, torsoY - 19, 64, 38, 5)
      .fill({ color: crumble > 0.4 ? COL_CRUMBLE : COL_BOULDER });
    if (crumble < 0.5) {
      g.moveTo(CX + tilt - 1, torsoY - 15)
        .lineTo(CX + tilt + 3, torsoY)
        .lineTo(CX + tilt - 2, torsoY + 12)
        .stroke({ color: COL_GRANITE_LT, width: 2, alpha: 1 - crumble * 2 });
    }

    drawArm(g, CX + tilt - 30, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 30, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, 1);
  }

  // head crumbling
  if (crumble < 0.9) {
    g.roundRect(CX + tilt - 15, headY - 10, 30, 23, 7)
      .fill({ color: crumble > 0.5 ? COL_CRUMBLE : COL_GRANITE });
    // dimming eyes
    if (crumble < 0.6) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 7, headY - 3, 3, 2)
          .fill({ color: COL_EYE, alpha: 1 - crumble * 1.5 });
      }
    }
    // crystal shards fall off
    if (crumble < 0.4) {
      const cnt = Math.max(1, Math.floor(5 * (1 - crumble * 2.5)));
      for (let i = 0; i < cnt; i++) {
        const dx = (i - cnt / 2) * 6;
        const h = (12 - crumble * 30) * (1 - Math.abs(i - cnt / 2) / cnt);
        if (h > 1) {
          g.moveTo(CX + tilt + dx - 2, headY - 10)
            .lineTo(CX + tilt + dx, headY - 10 - h)
            .lineTo(CX + tilt + dx + 2, headY - 10)
            .closePath()
            .fill({ color: COL_CRYSTAL_DK, alpha: 0.6 * (1 - crumble * 2.5) });
        }
      }
    }
  }

  // falling stone debris
  if (crumble > 0) {
    for (let i = 0; i < 10; i++) {
      const angle = i * 0.628 + crumble * 1.5;
      const dist = crumble * 28 + i * 4;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.5 + crumble * 18;
      const size = 3.5 - i * 0.3;
      if (size > 0.5) {
        g.rect(cx2 - size, cy - size, size * 2, size * 2)
          .fill({ color: COL_CRUMBLE, alpha: fade * (1 - crumble * 0.5) });
      }
    }
  }

  // dust cloud
  if (t > 0.3) {
    for (let i = 0; i < 6; i++) {
      const sy = torsoY - 10 + (t - 0.3) * 10 + i * 6;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 18;
      g.circle(sx, sy, 5 + i).fill({ color: COL_DUST, alpha: 0.12 * (1 - t) });
    }
  }

  drawDust(g, CX, GY, phase, Math.max(0, 10 - Math.floor(t * 12)), 25, 0.4 * (1 - t));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrame,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrame,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame,  count: 8 },
  [UnitState.CAST]:   { gen: generateCastFrame,    count: 8 },
  [UnitState.DIE]:    { gen: generateDieFrame,     count: 8 },
};

export function generateEarthElementalFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();
  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);
      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }
    result.set(state, textures);
  }
  return result;
}
