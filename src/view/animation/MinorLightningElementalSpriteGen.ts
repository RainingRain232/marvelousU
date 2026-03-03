// Procedural sprite generator for the Minor Lightning Elemental unit type.
//
// 96×96 px per frame (2×2 tiles). A smaller, crackling lightning elemental:
//   • Dark storm-grey body with electric arc fissures
//   • Jagged lightning bolt crown on head
//   • Compact limbs with electric veins
//   • No weapon — fights with fists
//   • Spark particles instead of embers

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
const COL_STORM_DARK = 0x2a2a3a;
const COL_STORM_LT = 0x3a3a4a;
const COL_STORM_MID = 0x333344;
const COL_ARC_BLUE = 0x44aaff;
const COL_ARC_INDIGO = 0x6688ff;
const COL_ARC_DK = 0x2266cc;
const COL_SPARK_YELLOW = 0xeeff44;
const COL_SPARK_WHITE = 0xffffaa;
const COL_SPARK_BRIGHT = 0xffff44;
const COL_EYE = 0xaaddff;
const COL_EYE_GLOW = 0x44aaff;
const COL_SHADOW = 0x000000;
const COL_STATIC = 0x667788;
const COL_DIMMED = 0x222233;

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
    .fill({ color: COL_SHADOW, alpha: 0.4 });
  g.ellipse(cx, cy + 2, 16 * scale, 4 * scale)
    .fill({ color: COL_ARC_BLUE, alpha: 0.06 });
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
    const kneeY = hipY + 16;
    g.roundRect(legX - 5, hipY + offset * 0.3, 10, kneeY - hipY, 2)
      .fill({ color: COL_STORM_DARK });
    // electric vein
    g.moveTo(legX - 1, hipY + 2 + offset * 0.2)
      .lineTo(legX + 2, hipY + 6 + offset * 0.2)
      .lineTo(legX - 1, hipY + 10 + offset * 0.2)
      .stroke({ color: COL_ARC_BLUE, width: 1.0 });

    // knee joint
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_ARC_DK });
    g.ellipse(legX, kneeY + offset * 0.4, 2.5, 2)
      .fill({ color: COL_ARC_BLUE, alpha: 0.6 });

    // shin
    const footY = kneeY + 14;
    g.roundRect(legX - 4, kneeY + offset * 0.4, 8, footY - kneeY, 2)
      .fill({ color: COL_STORM_DARK });

    // foot
    g.roundRect(legX - 6, footY + offset * 0.5, 12, 4, 2)
      .fill({ color: COL_STORM_MID });
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
    .fill({ color: COL_STORM_DARK });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 3)
    .fill({ color: COL_STORM_MID });

  // chest plate
  g.roundRect(cx - 14, torsoY - 8, 28, 16, 3)
    .fill({ color: COL_STORM_DARK });
  g.roundRect(cx - 14, torsoY - 8, 28, 16, 3)
    .stroke({ color: COL_STORM_LT, width: 0.7 });

  // central arc fissure (jagged lightning crack)
  g.moveTo(cx, torsoY - 8)
    .lineTo(cx + 2, torsoY - 4)
    .lineTo(cx - 1, torsoY)
    .lineTo(cx + 2, torsoY + 3)
    .lineTo(cx, torsoY + 6)
    .stroke({ color: COL_ARC_BLUE, width: 1.8 });
  g.moveTo(cx, torsoY - 8)
    .lineTo(cx + 2, torsoY - 4)
    .lineTo(cx - 1, torsoY)
    .lineTo(cx + 2, torsoY + 3)
    .lineTo(cx, torsoY + 6)
    .stroke({ color: COL_SPARK_WHITE, width: 0.7 });

  // diagonal arc cracks
  g.moveTo(cx - 10, torsoY - 4)
    .lineTo(cx - 7, torsoY - 1)
    .lineTo(cx - 4, torsoY + 3)
    .stroke({ color: COL_ARC_BLUE, width: 1.2 });
  g.moveTo(cx + 10, torsoY - 3)
    .lineTo(cx + 7, torsoY)
    .lineTo(cx + 5, torsoY + 4)
    .stroke({ color: COL_ARC_BLUE, width: 1.2 });

  // core glow
  g.ellipse(cx, torsoY, 4 + breathe * 0.3, 5 + breathe * 0.3)
    .fill({ color: COL_SPARK_WHITE, alpha: 0.10 + breathe * 0.02 });

  // shoulder pads
  for (const side of [-1, 1] as const) {
    g.ellipse(cx + side * 17, torsoY - 6, 7, 6)
      .fill({ color: COL_STORM_DARK });
    g.moveTo(cx + side * 13, torsoY - 8)
      .lineTo(cx + side * 16, torsoY - 5)
      .lineTo(cx + side * 19, torsoY - 4)
      .stroke({ color: COL_ARC_BLUE, width: 1 });
  }

  // belt
  g.roundRect(cx - 16, torsoY + 7, 32, 5, 2)
    .fill({ color: COL_STORM_DARK });
  g.ellipse(cx, torsoY + 9, 2.5, 2).fill({ color: COL_ARC_INDIGO });
}

function drawHead(
  g: Graphics,
  cx: number,
  headY: number,
  sparkPhase: number,
): void {
  // neck
  g.roundRect(cx - 5, headY + 7, 10, 6, 2)
    .fill({ color: COL_STORM_DARK });

  // skull
  g.roundRect(cx - 9, headY - 6, 18, 14, 4)
    .fill({ color: COL_STORM_DARK });
  g.roundRect(cx - 9, headY - 6, 18, 14, 4)
    .stroke({ color: COL_STORM_LT, width: 0.5 });

  // brow ridge
  g.roundRect(cx - 10, headY - 4, 20, 4, 1)
    .fill({ color: COL_STORM_MID });

  // skull crack (electric)
  g.moveTo(cx - 2, headY - 6)
    .lineTo(cx + 1, headY - 3)
    .lineTo(cx - 1, headY)
    .stroke({ color: COL_ARC_BLUE, width: 0.8 });

  // jaw
  g.roundRect(cx - 6, headY + 3, 12, 5, 2)
    .fill({ color: COL_STORM_MID });
  g.moveTo(cx - 4, headY + 5).lineTo(cx + 4, headY + 5)
    .stroke({ color: COL_ARC_DK, width: 1 });

  // eyes
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 4;
    const ey = headY - 1;
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_SHADOW });
    g.ellipse(ex, ey, 2.5, 1.5).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: COL_EYE });
  }

  // electric spark crown (jagged upward bolts)
  const bolts = [
    { dx: 0, h: 13, zigW: 3 },
    { dx: -5, h: 9, zigW: 2.5 },
    { dx: 5, h: 10, zigW: 2.5 },
    { dx: -3, h: 11, zigW: 2 },
    { dx: 3, h: 10, zigW: 2 },
  ];

  for (const b of bolts) {
    const bx = cx + b.dx;
    const flicker = Math.sin(sparkPhase * 4 + b.dx * 0.5) * 1.5;
    const baseY2 = headY - 5;
    const tipY = baseY2 - b.h - flicker;
    const midY1 = baseY2 - b.h * 0.33;
    const midY2 = baseY2 - b.h * 0.66;

    // outer glow bolt
    g.moveTo(bx, baseY2)
      .lineTo(bx + b.zigW + flicker * 0.3, midY1)
      .lineTo(bx - b.zigW * 0.5, midY2)
      .lineTo(bx + flicker * 0.4, tipY)
      .stroke({ color: COL_ARC_INDIGO, width: 2.5, alpha: 0.5 });

    // core bolt
    g.moveTo(bx, baseY2)
      .lineTo(bx + b.zigW + flicker * 0.3, midY1)
      .lineTo(bx - b.zigW * 0.5, midY2)
      .lineTo(bx + flicker * 0.4, tipY)
      .stroke({ color: COL_SPARK_WHITE, width: 1.2, alpha: 0.8 });

    // bright tip
    g.circle(bx + flicker * 0.4, tipY, 1.2)
      .fill({ color: COL_SPARK_BRIGHT, alpha: 0.6 });
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
    .stroke({ color: COL_STORM_DARK, width: 6 });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_ARC_BLUE, width: 1.2 });

  g.circle(elbowX, elbowY, 4).fill({ color: COL_STORM_DARK });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_ARC_DK, alpha: 0.6 });

  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_STORM_DARK, width: 5 });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_ARC_BLUE, width: 1 });

  // fist
  g.circle(handX, handY, 4).fill({ color: COL_STORM_MID });
  g.circle(handX, handY, 4).stroke({ color: COL_STORM_DARK, width: 0.7 });
}

function drawSparks(
  g: Graphics,
  cx: number,
  baseY: number,
  phase: number,
  count: number,
  spread: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 137.5 + phase * 50;
    const px = cx + Math.sin(seed * 0.1) * spread;
    const py = baseY - (seed * 0.15 % 40) - phase * 14;
    const size = 0.5 + (i % 3) * 0.25;
    const a = alpha * (1 - ((seed * 0.15 % 40) / 40));
    if (py > baseY - 50 && py < baseY + 4) {
      const col =
        i % 3 === 0
          ? COL_SPARK_BRIGHT
          : i % 3 === 1
            ? COL_SPARK_YELLOW
            : COL_ARC_BLUE;
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });

      // tiny spark line radiating out from each particle
      if (i % 2 === 0 && a > 0.2) {
        const sparkAngle = seed * 0.7;
        g.moveTo(px, py)
          .lineTo(
            px + Math.cos(sparkAngle) * 2.5,
            py + Math.sin(sparkAngle) * 2.5,
          )
          .stroke({ color: COL_SPARK_WHITE, width: 0.5, alpha: clamp01(a * 0.6) });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const sparkPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + breathe;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY);
  drawLegs(g, CX, torsoY + 12, breathe * 0.4);
  drawTorso(g, CX, torsoY, breathe);
  drawArm(g, CX - 17, torsoY - 4, 0.4, 0.8, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.4, 0.8, 1);
  drawHead(g, CX, headY + breathe * 0.3, sparkPhase);
  drawSparks(g, CX, GY, sparkPhase * 0.3, 8, 20, 0.4);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 2;
  const stride = Math.sin(walk) * 4;
  const sparkPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + bob;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawLegs(g, CX, torsoY + 12, stride);
  drawTorso(g, CX, torsoY, 0);

  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 17, torsoY - 4, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);
  drawHead(g, CX, headY + bob * 0.3, sparkPhase);
  drawSparks(g, CX + 6, GY, sparkPhase * 0.4, 10, 22, 0.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const sparkPhase = frame * 0.9;

  let lunge = 0;
  let armRaise = 0;
  let impactFlash = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    lunge = lt * 6;
  } else if (t < 0.75) {
    armRaise = 0.5;
    lunge = 6;
    impactFlash = 1 - (t - 0.55) / 0.2;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    lunge = lerp(6, 0, lt);
  }

  const torsoY = GY - 38;
  const headY = torsoY - 20;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawLegs(g, attackCX, torsoY + 12, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  drawArm(g, attackCX - 17, torsoY - 4, 0.3, 0.6, -1);

  // punching arm
  const punchElbow = 0.2 - armRaise * 1.0;
  const punchFore = lerp(0.8, -0.2, armRaise);
  drawArm(g, attackCX + 17, torsoY - 4, punchElbow, punchFore, 1);

  // impact electric burst
  if (impactFlash > 0.3) {
    const impX = attackCX + 17 + Math.cos(punchFore) * 12 + Math.cos(punchFore) * 12;
    const impY = torsoY - 4 + Math.sin(punchElbow) * 14 + Math.sin(punchFore) * 12;

    // electric burst core
    g.circle(impX, impY, 6 * impactFlash)
      .fill({ color: COL_SPARK_WHITE, alpha: 0.5 * impactFlash });
    g.circle(impX, impY, 10 * impactFlash)
      .fill({ color: COL_ARC_BLUE, alpha: 0.2 * impactFlash });

    // electric arcs radiating from impact
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.26 + sparkPhase * 2;
      const len = 8 * impactFlash;
      const midX = impX + Math.cos(angle) * len * 0.5;
      const midY = impY + Math.sin(angle) * len * 0.5;
      const endX = impX + Math.cos(angle) * len;
      const endY = impY + Math.sin(angle) * len;
      g.moveTo(impX, impY)
        .lineTo(midX + 2, midY - 1)
        .lineTo(endX, endY)
        .stroke({ color: COL_SPARK_BRIGHT, width: 1.2, alpha: impactFlash * 0.7 });
    }
  }

  drawHead(g, attackCX, headY, sparkPhase);
  drawSparks(g, attackCX, GY, sparkPhase * 0.3, 12, 22, 0.6 + impactFlash * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const sparkPhase = frame * 0.8;

  let armRaise = 0;
  let auraProgress = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.7) {
    armRaise = 1;
    auraProgress = (t - 0.3) / 0.4;
  } else {
    armRaise = lerp(1, 0, (t - 0.7) / 0.3);
    auraProgress = lerp(1, 0, (t - 0.7) / 0.3);
  }

  const torsoY = GY - 38 - armRaise * 2;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY, 1 + auraProgress * 0.2);

  // ground electric arcs
  if (auraProgress > 0) {
    for (let i = 0; i < 5; i++) {
      const angle = -0.5 + i * 0.25;
      const len = auraProgress * 25;
      const startX = CX + Math.cos(angle) * 5;
      const midX = CX + Math.cos(angle) * len * 0.5;
      const midY = GY + 2 + Math.sin(angle) * len * 0.1;
      const endX = CX + Math.cos(angle) * len;
      const endY = GY + 2 + Math.sin(angle) * len * 0.15;
      g.moveTo(startX, GY + 2)
        .lineTo(midX + 2, midY - 1)
        .lineTo(endX, endY)
        .stroke({ color: COL_ARC_BLUE, width: 1.5 * auraProgress });
    }
  }

  drawLegs(g, CX, torsoY + 12, 0);
  drawTorso(g, CX, torsoY, armRaise * 1.5);

  const raiseAngle = -0.5 - armRaise * 1.0;
  drawArm(g, CX - 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, sparkPhase);
  drawSparks(g, CX, GY, sparkPhase * 0.3, 16 + auraProgress * 8, 30, 0.5 + auraProgress * 0.3);

  // electric ring around caster
  if (auraProgress > 0.3) {
    const ringAlpha = (auraProgress - 0.3) * 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + sparkPhase * 2;
      const dist = 22 + Math.sin(angle * 3) * 4;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 20 + Math.sin(angle) * 6;

      // ring node
      g.circle(fx, fy, 1.5 + Math.sin(angle * 2) * 0.5)
        .fill({ color: COL_SPARK_BRIGHT, alpha: ringAlpha * 0.6 });

      // arc to next node
      const nextAngle = (i + 1) * 0.785 + sparkPhase * 2;
      const nextDist = 22 + Math.sin(nextAngle * 3) * 4;
      const nx = CX + Math.cos(nextAngle) * nextDist;
      const ny = GY - 20 + Math.sin(nextAngle) * 6;
      const arcMidX = (fx + nx) / 2 + Math.sin(angle * 5) * 2;
      const arcMidY = (fy + ny) / 2 + Math.cos(angle * 5) * 2;
      g.moveTo(fx, fy)
        .lineTo(arcMidX, arcMidY)
        .lineTo(nx, ny)
        .stroke({ color: COL_ARC_BLUE, width: 0.8, alpha: ringAlpha * 0.4 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.6;
  const sparkPhase = frame * 0.3;
  const cool = t;
  const crumble = clamp01((t - 0.6) / 0.4);

  g.alpha = fade;

  const torsoY = GY - 38 + crumble * 12;
  const headY = torsoY - 20 + crumble * 5;
  const tilt = crumble * 3;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 12, crumble * 2);

    g.roundRect(CX + tilt - 18, torsoY - 11, 36, 22, 3)
      .fill({ color: cool > 0.5 ? COL_DIMMED : COL_STORM_MID });
    if (cool < 0.7) {
      // fading electric cracks
      g.moveTo(CX + tilt, torsoY - 8)
        .lineTo(CX + tilt + 2, torsoY - 4)
        .lineTo(CX + tilt - 1, torsoY)
        .lineTo(CX + tilt + 2, torsoY + 3)
        .lineTo(CX + tilt, torsoY + 6)
        .stroke({ color: COL_ARC_BLUE, width: 1.5, alpha: 1 - cool * 1.3 });
    }

    drawArm(g, CX + tilt - 17, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 17, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, 1);
  }

  if (crumble < 0.9) {
    g.roundRect(CX + tilt - 9, headY - 6, 18, 14, 4)
      .fill({ color: cool > 0.5 ? COL_DIMMED : COL_STORM_DARK });
    if (cool < 0.8) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 4, headY - 1, 2, 1.5)
          .fill({ color: COL_EYE, alpha: 1 - cool * 1.2 });
      }
    }
    // fading crown bolts
    if (cool < 0.5) {
      const cnt = Math.max(1, Math.floor(5 * (1 - cool * 2)));
      for (let i = 0; i < cnt; i++) {
        const dx = (i - cnt / 2) * 4;
        const h = (6 - cool * 12) * (1 - Math.abs(i - cnt / 2) / cnt);
        if (h > 1) {
          const bx = CX + tilt + dx;
          const bBaseY = headY - 6;
          g.moveTo(bx, bBaseY)
            .lineTo(bx + 1.5, bBaseY - h * 0.5)
            .lineTo(bx - 0.5, bBaseY - h * 0.75)
            .lineTo(bx + 0.5, bBaseY - h)
            .stroke({ color: COL_ARC_BLUE, width: 1.2, alpha: 0.4 * (1 - cool * 2) });
        }
      }
    }
  }

  // scattering sparks (debris)
  if (crumble > 0) {
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + crumble * 2;
      const dist = crumble * 18 + i * 3;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.5 + crumble * 10;
      const size = 1.5 - i * 0.15;
      if (size > 0.4) {
        g.circle(cx2, cy, size)
          .fill({ color: COL_SPARK_YELLOW, alpha: fade * (1 - crumble * 0.6) });
        // tiny trailing arc
        if (i % 2 === 0) {
          g.moveTo(cx2, cy)
            .lineTo(cx2 - Math.cos(angle) * 3, cy - Math.sin(angle) * 3)
            .stroke({ color: COL_ARC_BLUE, width: 0.5, alpha: fade * (1 - crumble * 0.7) });
        }
      }
    }
  }

  // static discharge wisps
  if (t > 0.2) {
    for (let i = 0; i < 3; i++) {
      const sy = torsoY - 14 - (t - 0.2) * 25 - i * 6;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 10;
      g.circle(sx, sy, 2.5 + i * 0.5).fill({ color: COL_STATIC, alpha: 0.10 * (1 - t) });
    }
  }

  drawSparks(g, CX, GY, sparkPhase, Math.max(0, 8 - Math.floor(t * 10)), 18, 0.3 * (1 - t));
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

export function generateMinorLightningElementalFrames(
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
