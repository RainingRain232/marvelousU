// Procedural sprite generator for the Minor Ice Elemental unit type.
//
// 96×96 px per frame (2×2 tiles). A smaller, less imposing ice elemental:
//   • Crystalline ice body with faint inner glow
//   • Smaller ice crystal crown on head
//   • Compact icy limbs with frost veins
//   • No weapon — fights with fists
//   • Less frost vapor, simpler details than T5 version

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Frame dimensions
// ---------------------------------------------------------------------------
const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 8;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const COL_ICE = 0x8ec8e8;
const COL_ICE_DK = 0x5a8aaa;
const COL_ICE_DEEP = 0x3a6a8a;
const COL_ICE_LT = 0xc0e8ff;
const COL_CRYSTAL = 0xaaddff;
const COL_CRYSTAL_EDGE = 0x88bbdd;
const COL_CRYSTAL_SHINE = 0xeeffff;
const COL_CORE_GLOW = 0x4488cc;
const COL_CORE_BRIGHT = 0x66aaee;
const COL_FROST = 0xddeeff;
const COL_EYE = 0x88ddff;
const COL_EYE_BRIGHT = 0xccffff;
const COL_VAPOR = 0xbbddff;
const COL_SHADOW = 0x000000;
const COL_BLIZZARD = 0xaaccee;

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
  g.ellipse(cx, cy + 3, 22 * scale, 7 * scale)
    .fill({ color: COL_SHADOW, alpha: 0.35 });
  g.ellipse(cx, cy + 2, 16 * scale, 4 * scale)
    .fill({ color: COL_FROST, alpha: 0.05 });
}

function drawCrystal(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  length: number,
  width: number,
  alpha = 1,
): void {
  const tipX = baseX + Math.cos(angle) * length;
  const tipY = baseY + Math.sin(angle) * length;
  const perpX = -Math.sin(angle) * width;
  const perpY = Math.cos(angle) * width;

  g.moveTo(baseX + perpX, baseY + perpY)
    .lineTo(tipX, tipY)
    .lineTo(baseX - perpX, baseY - perpY)
    .closePath()
    .fill({ color: COL_CRYSTAL, alpha: 0.65 * alpha });

  g.moveTo(baseX + perpX, baseY + perpY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_EDGE, width: 0.6, alpha: 0.5 * alpha });

  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_SHINE, width: 0.4, alpha: 0.35 * alpha });

  g.circle(tipX, tipY, 1).fill({ color: COL_CRYSTAL_SHINE, alpha: 0.4 * alpha });
}

function drawLegs(
  g: Graphics,
  cx: number,
  hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 9;

    // thigh
    const kneeY = hipY + 15;
    g.roundRect(legX - 5, hipY + offset * 0.3, 10, kneeY - hipY, 2)
      .fill({ color: COL_ICE_DK, alpha: 0.85 });
    g.roundRect(legX - 5, hipY + offset * 0.3, 10, kneeY - hipY, 2)
      .stroke({ color: COL_ICE, width: 0.6 });
    // frost vein
    g.moveTo(legX - 1, hipY + 3).lineTo(legX + 1, hipY + 10)
      .stroke({ color: COL_CORE_GLOW, width: 0.8, alpha: 0.35 });

    // knee — crystal joint
    g.moveTo(legX - 4, kneeY - 1 + offset * 0.4)
      .lineTo(legX, kneeY - 4 + offset * 0.4)
      .lineTo(legX + 4, kneeY - 1 + offset * 0.4)
      .lineTo(legX, kneeY + 3 + offset * 0.4)
      .closePath()
      .fill({ color: COL_ICE });
    g.circle(legX, kneeY + offset * 0.4, 2)
      .fill({ color: COL_CORE_GLOW, alpha: 0.25 });

    // shin
    const footY = kneeY + 14;
    g.roundRect(legX - 4, kneeY + offset * 0.4, 8, footY - kneeY, 2)
      .fill({ color: COL_ICE_DK, alpha: 0.85 });

    // foot
    g.roundRect(legX - 6, footY + offset * 0.5, 12, 5, 2)
      .fill({ color: COL_ICE });
    g.roundRect(legX - 6, footY + offset * 0.5, 12, 5, 2)
      .stroke({ color: COL_ICE_DK, width: 0.6 });
  }
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoY: number,
  breathe: number,
): void {
  const tw = 18 + breathe * 0.3;
  const th = 22;

  // outer shell
  g.roundRect(cx - tw - 1, torsoY - th / 2 - 1, (tw + 1) * 2, th + 2, 4)
    .fill({ color: COL_ICE_DK, alpha: 0.9 });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 3)
    .fill({ color: COL_ICE, alpha: 0.85 });
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 3)
    .stroke({ color: COL_ICE_LT, width: 0.6 });

  // chest facet
  g.moveTo(cx - 12, torsoY - 8)
    .lineTo(cx, torsoY - 10)
    .lineTo(cx + 12, torsoY - 8)
    .lineTo(cx + 10, torsoY + 5)
    .lineTo(cx, torsoY + 7)
    .lineTo(cx - 10, torsoY + 5)
    .closePath()
    .fill({ color: COL_ICE_DEEP, alpha: 0.5 });
  g.moveTo(cx - 12, torsoY - 8)
    .lineTo(cx, torsoY - 10)
    .lineTo(cx + 12, torsoY - 8)
    .lineTo(cx + 10, torsoY + 5)
    .lineTo(cx, torsoY + 7)
    .lineTo(cx - 10, torsoY + 5)
    .closePath()
    .stroke({ color: COL_ICE_LT, width: 0.5 });

  // core glow
  g.ellipse(cx, torsoY, 6 + breathe * 0.3, 7 + breathe * 0.3)
    .fill({ color: COL_CORE_GLOW, alpha: 0.12 + breathe * 0.01 });

  // frost veins from core
  const veins: number[][] = [
    [cx, torsoY, cx - 10, torsoY - 8],
    [cx, torsoY, cx + 9, torsoY - 6],
    [cx, torsoY, cx - 8, torsoY + 7],
    [cx, torsoY, cx + 7, torsoY + 6],
  ];
  for (const [x1, y1, x2, y2] of veins) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_CORE_GLOW, width: 0.7, alpha: 0.25 });
  }

  // shoulder crystal formations
  for (const side of [-1, 1] as const) {
    const sx = cx + side * 17;
    const sy = torsoY - 6;
    g.ellipse(sx, sy, 7, 6).fill({ color: COL_ICE_DK });
    g.ellipse(sx, sy, 7, 6).stroke({ color: COL_ICE, width: 0.6 });
    // one protruding crystal
    drawCrystal(g, sx, sy - 3, -Math.PI * 0.5 + side * 0.3, 10, 2.5);
    drawCrystal(g, sx + side * 3, sy - 1, -Math.PI * 0.4 + side * 0.5, 7, 2);
  }

  // belt
  g.roundRect(cx - 16, torsoY + 7, 32, 5, 2)
    .fill({ color: COL_ICE_DK });
  g.ellipse(cx, torsoY + 9, 2.5, 2).fill({ color: COL_CORE_GLOW });
}

function drawHead(
  g: Graphics,
  cx: number,
  headY: number,
  glowPhase: number,
): void {
  // neck
  g.roundRect(cx - 4, headY + 7, 8, 6, 2)
    .fill({ color: COL_ICE_DK });

  // skull — angular faceted
  g.moveTo(cx - 9, headY + 4)
    .lineTo(cx - 8, headY - 5)
    .lineTo(cx - 4, headY - 9)
    .lineTo(cx + 4, headY - 9)
    .lineTo(cx + 8, headY - 5)
    .lineTo(cx + 9, headY + 4)
    .lineTo(cx + 5, headY + 8)
    .lineTo(cx - 5, headY + 8)
    .closePath()
    .fill({ color: COL_ICE });
  g.moveTo(cx - 9, headY + 4)
    .lineTo(cx - 8, headY - 5)
    .lineTo(cx - 4, headY - 9)
    .lineTo(cx + 4, headY - 9)
    .lineTo(cx + 8, headY - 5)
    .lineTo(cx + 9, headY + 4)
    .lineTo(cx + 5, headY + 8)
    .lineTo(cx - 5, headY + 8)
    .closePath()
    .stroke({ color: COL_ICE_LT, width: 0.5 });

  // face center line
  g.moveTo(cx, headY - 9).lineTo(cx, headY + 4)
    .stroke({ color: COL_ICE_DK, width: 0.4, alpha: 0.4 });

  // brow ridge
  g.moveTo(cx - 8, headY - 3)
    .lineTo(cx, headY - 5)
    .lineTo(cx + 8, headY - 3)
    .stroke({ color: COL_ICE_DEEP, width: 1.5 });

  // eyes
  const glowPulse = 0.8 + Math.sin(glowPhase * 3) * 0.2;
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 4;
    const ey = headY - 1;
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_ICE_DEEP });
    g.ellipse(ex, ey, 2.5, 1.5).fill({ color: COL_EYE, alpha: 0.6 * glowPulse });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: COL_EYE_BRIGHT, alpha: 0.4 * glowPulse });
  }

  // mouth
  g.moveTo(cx - 3, headY + 4).lineTo(cx + 3, headY + 4)
    .stroke({ color: COL_ICE_DEEP, width: 1 });

  // ice crystal crown (smaller)
  const crownCrystals = [
    { dx: 0, angle: -Math.PI / 2, len: 14, w: 3 },
    { dx: -5, angle: -Math.PI / 2 - 0.2, len: 10, w: 2.5 },
    { dx: 5, angle: -Math.PI / 2 + 0.2, len: 11, w: 2.5 },
    { dx: -3, angle: -Math.PI / 2 - 0.1, len: 12, w: 2 },
    { dx: 3, angle: -Math.PI / 2 + 0.1, len: 12, w: 2 },
  ];
  for (const c of crownCrystals) {
    drawCrystal(g, cx + c.dx, headY - 8, c.angle, c.len, c.w);
  }
}

function drawArm(
  g: Graphics,
  shoulderX: number,
  shoulderY: number,
  elbowAngle: number,
  forearmAngle: number,
  side: number,
): void {
  const upperLen = 14;
  const foreLen = 12;

  const elbowX = shoulderX + Math.cos(elbowAngle) * upperLen * side;
  const elbowY = shoulderY + Math.sin(elbowAngle) * upperLen;

  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_ICE_DK, width: 6 });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_CORE_GLOW, width: 1, alpha: 0.25 });

  // elbow crystal
  g.circle(elbowX, elbowY, 4).fill({ color: COL_ICE });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_CORE_GLOW, alpha: 0.25 });

  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_ICE_DK, width: 5 });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_CORE_GLOW, width: 0.8, alpha: 0.2 });

  // fist
  g.circle(handX, handY, 4).fill({ color: COL_ICE });
  g.circle(handX, handY, 4).stroke({ color: COL_ICE_DK, width: 0.6 });
}

function drawFrostVapor(
  g: Graphics,
  cx: number,
  baseY: number,
  phase: number,
  count: number,
  spread: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 97.3 + phase * 30;
    const px = cx + Math.sin(seed * 0.13) * spread;
    const py = baseY - (seed * 0.12 % 35) - phase * 8;
    const size = 1.5 + (i % 3) * 0.8;
    const a = alpha * (1 - ((seed * 0.12 % 35) / 35)) * 0.5;
    if (py > baseY - 45 && py < baseY + 4) {
      g.circle(px, py, size).fill({ color: COL_VAPOR, alpha: clamp01(a) });
    }
  }
}

function drawIceShards(
  g: Graphics,
  cx: number,
  cy: number,
  count: number,
  spread: number,
  alpha: number,
  phase: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = i * 1.37 + phase;
    const dist = spread * (0.3 + (i % 3) * 0.25);
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist * 0.6;
    const size = 1.5 + (i % 3);
    const rot = angle * 2;
    g.moveTo(sx, sy - size)
      .lineTo(sx + size * 0.4 * Math.cos(rot), sy)
      .lineTo(sx, sy + size * 0.6)
      .lineTo(sx - size * 0.4 * Math.cos(rot), sy)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: alpha * 0.5 });
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const glowPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + breathe;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY);
  drawFrostVapor(g, CX, GY, glowPhase * 0.2, 7, 20, 0.35);
  drawLegs(g, CX, torsoY + 12, breathe * 0.4);
  drawTorso(g, CX, torsoY, breathe);
  drawArm(g, CX - 17, torsoY - 4, 0.4, 0.8, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.4, 0.8, 1);
  drawHead(g, CX, headY + breathe * 0.3, glowPhase);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 2;
  const stride = Math.sin(walk) * 4;
  const glowPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + bob;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);

  // frost trail
  for (let i = 0; i < 3; i++) {
    const frostX = CX + 10 + i * 6;
    g.circle(frostX, GY + 2, 3 - i).fill({ color: COL_FROST, alpha: 0.1 - i * 0.03 });
  }

  drawFrostVapor(g, CX, GY, glowPhase * 0.3, 10, 22, 0.4);
  drawLegs(g, CX, torsoY + 12, stride);
  drawTorso(g, CX, torsoY, 0);

  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 17, torsoY - 4, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);
  drawHead(g, CX, headY + bob * 0.3, glowPhase);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const glowPhase = frame * 0.9;

  let lunge = 0;
  let armRaise = 0;
  let impactShatter = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    lunge = lt * 6;
  } else if (t < 0.75) {
    armRaise = 0.5;
    lunge = 6;
    impactShatter = 1 - (t - 0.55) / 0.2;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    lunge = lerp(6, 0, lt);
  }

  const torsoY = GY - 38;
  const headY = torsoY - 20;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawFrostVapor(g, attackCX, GY, glowPhase * 0.3, 8, 18, 0.4);
  drawLegs(g, attackCX, torsoY + 12, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  drawArm(g, attackCX - 17, torsoY - 4, 0.3, 0.6, -1);

  const punchElbow = 0.2 - armRaise * 1.0;
  const punchFore = lerp(0.8, -0.2, armRaise);
  drawArm(g, attackCX + 17, torsoY - 4, punchElbow, punchFore, 1);

  // ice shatter on impact
  if (impactShatter > 0.3) {
    const impX = attackCX + 17 + Math.cos(punchFore) * 12 + Math.cos(punchFore) * 12;
    const impY = torsoY - 4 + Math.sin(punchElbow) * 14 + Math.sin(punchFore) * 12;
    drawIceShards(g, impX, impY, 6, 10 * impactShatter, impactShatter, t * 5);
    g.circle(impX, impY, 6 * impactShatter)
      .fill({ color: COL_FROST, alpha: 0.25 * impactShatter });
  }

  drawHead(g, attackCX, headY, glowPhase);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const glowPhase = frame * 0.8;

  let armRaise = 0;
  let vortexProgress = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.7) {
    armRaise = 1;
    vortexProgress = (t - 0.3) / 0.4;
  } else {
    armRaise = lerp(1, 0, (t - 0.7) / 0.3);
    vortexProgress = lerp(1, 0, (t - 0.7) / 0.3);
  }

  const torsoY = GY - 38 - armRaise * 2;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY, 1 + vortexProgress * 0.15);

  // frost ring on ground
  if (vortexProgress > 0) {
    for (let r = 0; r < 2; r++) {
      const ringT = clamp01(vortexProgress - r * 0.2);
      if (ringT <= 0) continue;
      const radius = 8 + ringT * 20;
      g.ellipse(CX, GY + 2, radius, radius * 0.25)
        .stroke({ color: COL_BLIZZARD, width: 1.5 - r * 0.5, alpha: (1 - ringT * 0.5) * 0.35 });
    }
  }

  // swirling ice shards
  if (vortexProgress > 0.2) {
    const shardCount = 5;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + glowPhase * 3;
      const dist = 18 * vortexProgress;
      const sx = CX + Math.cos(angle) * dist;
      const sy = GY - 28 + Math.sin(angle) * dist * 0.3;
      const size = 2.5;
      g.moveTo(sx, sy - size)
        .lineTo(sx + size * 0.4, sy)
        .lineTo(sx, sy + size * 0.6)
        .lineTo(sx - size * 0.4, sy)
        .closePath()
        .fill({ color: COL_BLIZZARD, alpha: vortexProgress * 0.5 });
    }
  }

  drawLegs(g, CX, torsoY + 12, 0);
  drawTorso(g, CX, torsoY, armRaise * 1.5);

  const raiseAngle = -0.5 - armRaise * 1.0;
  drawArm(g, CX - 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, 1);

  // energy orb between hands
  if (armRaise > 0.5) {
    const orbY = torsoY - 18 - armRaise * 8;
    const orbSize = 5 + vortexProgress * 4;
    g.circle(CX, orbY, orbSize).fill({ color: COL_CORE_GLOW, alpha: 0.15 * armRaise });
    g.circle(CX, orbY, orbSize * 0.5).fill({ color: COL_CORE_BRIGHT, alpha: 0.12 * armRaise });
  }

  drawHead(g, CX, headY, glowPhase);
  drawFrostVapor(g, CX, GY, glowPhase * 0.3, 10 + vortexProgress * 6, 25, 0.35 + vortexProgress * 0.2);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.5;
  const crackProgress = clamp01(t / 0.4);
  const shatterProgress = clamp01((t - 0.4) / 0.3);
  const disperseProgress = clamp01((t - 0.7) / 0.3);

  g.alpha = fade;

  const torsoY = GY - 38 + shatterProgress * 8;
  const headY = torsoY - 20;
  const tilt = shatterProgress * 3;

  drawShadow(g, CX, GY, 1 - t * 0.35);

  if (shatterProgress < 0.9) {
    drawLegs(g, CX + tilt, torsoY + 12, shatterProgress * 3);

    g.roundRect(CX + tilt - 18, torsoY - 11, 36, 22, 3)
      .fill({ color: COL_ICE, alpha: 0.8 * (1 - shatterProgress * 0.5) });

    // spreading cracks
    if (crackProgress > 0) {
      const crackLen = crackProgress * 14;
      const crackPairs = [
        [0, -8, 2, 0],
        [-3, -6, -8, 3],
        [4, -5, 9, 4],
        [-2, 3, -7, 9],
      ];
      for (const [x1, y1, x2, y2] of crackPairs) {
        g.moveTo(CX + tilt + x1, torsoY + y1)
          .lineTo(CX + tilt + x2 * (crackLen / 14), torsoY + y2 * (crackLen / 14))
          .stroke({ color: COL_ICE_LT, width: 1.2 * crackProgress });
      }
    }

    drawArm(g, CX + tilt - 17, torsoY - 4, 0.6 + shatterProgress * 0.4, 1.2 + shatterProgress * 0.3, -1);
    drawArm(g, CX + tilt + 17, torsoY - 4, 0.6 + shatterProgress * 0.4, 1.2 + shatterProgress * 0.3, 1);
  }

  if (shatterProgress < 0.95) {
    g.moveTo(CX + tilt - 8, headY + 4)
      .lineTo(CX + tilt - 7, headY - 5)
      .lineTo(CX + tilt - 3, headY - 8)
      .lineTo(CX + tilt + 3, headY - 8)
      .lineTo(CX + tilt + 7, headY - 5)
      .lineTo(CX + tilt + 8, headY + 4)
      .closePath()
      .fill({ color: COL_ICE, alpha: 0.65 * (1 - shatterProgress) });

    if (crackProgress < 0.9) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 4, headY - 1, 2, 1.5)
          .fill({ color: COL_EYE, alpha: 0.5 * (1 - crackProgress) });
      }
    }
  }

  // flying ice shards
  if (shatterProgress > 0) {
    drawIceShards(g, CX, torsoY, Math.floor(8 + shatterProgress * 6),
      14 + shatterProgress * 25, (1 - disperseProgress) * 0.6, t * 4);
  }

  // crystal debris
  if (shatterProgress > 0.3) {
    for (let i = 0; i < 4; i++) {
      const angle = i * 1.57 + shatterProgress * 2;
      const dist = shatterProgress * 18 + i * 4;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.5 + shatterProgress * 12;
      drawCrystal(g, CX + dx, torsoY + dy, angle, 3.5, 1.5, (1 - disperseProgress) * 0.5);
    }
  }

  // frost mist
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const mx = CX + Math.sin(i * 2 + t * 2) * 16;
      const my = GY - 6 + i * 2;
      g.circle(mx, my, 4 + i).fill({ color: COL_VAPOR, alpha: 0.08 * (1 - t) });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

export function generateMinorIceElementalFrames(
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
