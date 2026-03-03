// Procedural sprite generator for the Lightning Elemental unit type.
//
// 144×144 px per frame (3×3 tiles). A crackling storm incarnate:
//   • Storm-grey basalt body with electric blue/yellow vein fissures
//   • Jagged lightning bolt crown erupting from the head
//   • Massive arms of dark stone with arcing electricity at joints
//   • Lightning javelin weapon (jagged electric bolt)
//   • Spark particles flying outward, arc effects
//   • Electric storm vortex cast, fade-to-dark death
//   • Crackling energy throughout all animations

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
const COL_STORM_GREY     = 0x2a2a3a;
const COL_STORM_GREY_LT  = 0x3a3a4a;
const COL_DARK_STONE      = 0x1e1e2e;
const COL_ELECTRIC_BLUE   = 0x44aaff;
const COL_ARC_BLUE        = 0x6688ff;
const COL_BRIGHT_YELLOW   = 0xeeff44;
const COL_WHITE_HOT       = 0xffffaa;
const COL_EYE_GLOW        = 0xffff44;
const COL_SPARK_CORE      = 0xffffff;
const COL_ARC_INNER       = 0xaaddff;
const COL_ARC_OUTER       = 0x3366cc;
const COL_DEAD_GREY       = 0x181828;
const COL_SHADOW          = 0x000000;
const COL_VEIN_DIM        = 0x335588;

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
  // electric blue reflection on ground
  g.ellipse(cx, cy + 2, 28 * scale, 6 * scale)
    .fill({ color: COL_ELECTRIC_BLUE, alpha: 0.08 });
}

/** Draw the massive storm-grey legs with electric vein cracks */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 14;

    // thigh — thick storm-grey column
    const kneeY = hipY + 26;
    g.roundRect(legX - 8, hipY + offset * 0.3, 16, kneeY - hipY, 3)
      .fill({ color: COL_STORM_GREY });
    // electric vein fissure on thigh
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_ELECTRIC_BLUE, width: 1.8 });
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_WHITE_HOT, width: 0.8 });

    // knee joint — sparking electric
    g.ellipse(legX, kneeY + offset * 0.4, 7, 5)
      .fill({ color: COL_ARC_OUTER });
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_ELECTRIC_BLUE, alpha: 0.7 });

    // shin
    const footY = kneeY + 24;
    g.roundRect(legX - 7, kneeY + offset * 0.4, 14, footY - kneeY, 2)
      .fill({ color: COL_STORM_GREY });
    // shin crack
    g.moveTo(legX + 2, kneeY + 6).lineTo(legX - 1, kneeY + 16)
      .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5 });

    // foot — broad dark stone
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .fill({ color: COL_STORM_GREY_LT });
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .stroke({ color: COL_STORM_GREY, width: 0.8 });

    // mini arc spark from knee
    const sparkY = kneeY + 8 + Math.abs(offset) * 0.5;
    g.ellipse(legX + side * 3, sparkY, 1.5, 2.5)
      .fill({ color: COL_BRIGHT_YELLOW, alpha: 0.6 });
  }
}

/** Draw the massive torso with armor plates and arc fissures */
function drawTorso(
  g: Graphics,
  cx: number, torsoY: number,
  breathe: number,
): void {
  // core torso mass
  const tw = 30 + breathe * 0.5;
  const th = 36;

  // back plate (darker)
  g.roundRect(cx - tw - 2, torsoY - th / 2 - 2, (tw + 2) * 2, th + 4, 6)
    .fill({ color: COL_DARK_STONE });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .fill({ color: COL_STORM_GREY_LT });

  // chest plate (storm grey with light edge)
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .fill({ color: COL_STORM_GREY });
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .stroke({ color: COL_STORM_GREY_LT, width: 1 });

  // major arc fissures across chest
  // central vertical crack
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 2.5 });
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_WHITE_HOT, width: 1 });

  // diagonal cracks
  g.moveTo(cx - 18, torsoY - 8)
    .lineTo(cx - 6, torsoY + 4)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 2 });
  g.moveTo(cx + 18, torsoY - 6)
    .lineTo(cx + 8, torsoY + 6)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 2 });

  // branching micro-cracks (arc veins)
  const cracks = [
    [cx - 10, torsoY - 10, cx - 14, torsoY - 4],
    [cx + 6, torsoY - 8, cx + 12, torsoY - 2],
    [cx - 4, torsoY + 4, cx - 10, torsoY + 12],
    [cx + 3, torsoY + 6, cx + 9, torsoY + 12],
  ];
  for (const [x1, y1, x2, y2] of cracks) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_ARC_BLUE, width: 1.2 });
  }

  // sparking core glow visible through central crack
  g.ellipse(cx, torsoY - 2, 6 + breathe * 0.5, 8 + breathe * 0.5)
    .fill({ color: COL_BRIGHT_YELLOW, alpha: 0.15 + breathe * 0.02 });

  // shoulder armor plates
  for (const side of [-1, 1] as const) {
    // large pauldron
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .fill({ color: COL_STORM_GREY });
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .stroke({ color: COL_STORM_GREY_LT, width: 0.8 });
    // electric accent on shoulder
    g.moveTo(cx + side * 22, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 8)
      .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5 });
    // spike on pauldron
    g.moveTo(cx + side * 28, torsoY - 22)
      .lineTo(cx + side * 25, torsoY - 14)
      .lineTo(cx + side * 31, torsoY - 14)
      .closePath()
      .fill({ color: COL_STORM_GREY });
    g.moveTo(cx + side * 28, torsoY - 20)
      .lineTo(cx + side * 26, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 14)
      .closePath()
      .fill({ color: COL_ARC_BLUE, alpha: 0.4 });
  }

  // belt / waist plate
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .fill({ color: COL_STORM_GREY });
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .stroke({ color: COL_ARC_OUTER, width: 0.8 });
  // belt buckle (glowing electric)
  g.ellipse(cx, torsoY + 16, 4, 3).fill({ color: COL_ELECTRIC_BLUE });
  g.ellipse(cx, torsoY + 16, 2, 1.5).fill({ color: COL_WHITE_HOT });
}

/** Draw the head — a rough dark stone skull crowned with lightning bolts */
function drawHead(
  g: Graphics,
  cx: number, headY: number,
  arcPhase: number,
): void {
  // neck (short, thick, with arc veins)
  g.roundRect(cx - 8, headY + 10, 16, 10, 3)
    .fill({ color: COL_STORM_GREY });
  g.moveTo(cx, headY + 12).lineTo(cx + 1, headY + 18)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5 });

  // skull shape
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .fill({ color: COL_STORM_GREY });
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .stroke({ color: COL_STORM_GREY_LT, width: 0.6 });

  // brow ridge
  g.roundRect(cx - 16, headY - 8, 32, 6, 2)
    .fill({ color: COL_STORM_GREY_LT });

  // cracks on skull
  g.moveTo(cx - 4, headY - 10).lineTo(cx - 2, headY - 2)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 1.2 });
  g.moveTo(cx + 5, headY - 10).lineTo(cx + 3, headY)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 1 });

  // jaw
  g.roundRect(cx - 10, headY + 4, 20, 8, 3)
    .fill({ color: COL_STORM_GREY_LT });
  // mouth line (glowing electric)
  g.moveTo(cx - 8, headY + 8).lineTo(cx + 8, headY + 8)
    .stroke({ color: COL_ARC_BLUE, width: 1.5 });
  g.moveTo(cx - 6, headY + 8).lineTo(cx + 6, headY + 8)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 0.7 });

  // eyes — fierce glowing yellow-white
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 7;
    const ey = headY - 3;
    // eye socket
    g.ellipse(ex, ey, 5, 3.5).fill({ color: COL_SHADOW });
    // electric glow
    g.ellipse(ex, ey, 4, 3).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_BRIGHT_YELLOW });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: COL_SPARK_CORE, alpha: 0.5 });
    // glow halo
    g.ellipse(ex, ey, 7, 5).fill({ color: COL_EYE_GLOW, alpha: 0.1 });
  }

  // lightning bolt crown — jagged bolts rising from skull
  const bolts = [
    { dx: 0,   h: 22, w: 4 },
    { dx: -8,  h: 16, w: 3 },
    { dx: 8,   h: 17, w: 3 },
    { dx: -14, h: 11, w: 2.5 },
    { dx: 14,  h: 12, w: 2.5 },
    { dx: -4,  h: 19, w: 3 },
    { dx: 5,   h: 18, w: 3 },
  ];

  for (const b of bolts) {
    const bx = cx + b.dx;
    const flicker = Math.sin(arcPhase * 4 + b.dx * 0.3) * 2;
    const tipY = headY - 12 - b.h - flicker;
    const baseY = headY - 8;
    const midY1 = baseY + (tipY - baseY) * 0.35;
    const midY2 = baseY + (tipY - baseY) * 0.65;
    const jag1 = b.w * (Math.sin(arcPhase * 6 + b.dx) > 0 ? 1 : -1);
    const jag2 = -jag1 * 0.7;

    // outer bolt glow
    g.moveTo(bx, baseY)
      .lineTo(bx + jag1, midY1)
      .lineTo(bx + jag2, midY2)
      .lineTo(bx + flicker * 0.3, tipY)
      .stroke({ color: COL_ARC_BLUE, width: b.w * 1.2, alpha: 0.5 });

    // inner bright bolt
    g.moveTo(bx, baseY)
      .lineTo(bx + jag1, midY1)
      .lineTo(bx + jag2, midY2)
      .lineTo(bx + flicker * 0.3, tipY)
      .stroke({ color: COL_ELECTRIC_BLUE, width: b.w * 0.7, alpha: 0.8 });

    // white-hot core
    g.moveTo(bx, baseY)
      .lineTo(bx + jag1, midY1)
      .lineTo(bx + jag2, midY2)
      .lineTo(bx + flicker * 0.3, tipY)
      .stroke({ color: COL_WHITE_HOT, width: b.w * 0.3, alpha: 0.6 });

    // spark at tip
    g.circle(bx + flicker * 0.3, tipY, 1.5)
      .fill({ color: COL_SPARK_CORE, alpha: 0.7 });
  }
}

/** Draw an arm made of storm-grey stone with arcing electricity */
function drawArm(
  g: Graphics,
  shoulderX: number, shoulderY: number,
  elbowAngle: number,
  forearmAngle: number,
  side: number,
): void {
  const upperLen = 22;
  const foreLen = 20;

  // upper arm
  const elbowX = shoulderX + Math.cos(elbowAngle) * upperLen * side;
  const elbowY = shoulderY + Math.sin(elbowAngle) * upperLen;

  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_STORM_GREY, width: 10 });
  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 2 });

  // elbow joint (arcing electricity)
  g.circle(elbowX, elbowY, 6).fill({ color: COL_STORM_GREY });
  g.circle(elbowX, elbowY, 4).fill({ color: COL_ARC_BLUE, alpha: 0.7 });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_WHITE_HOT, alpha: 0.5 });

  // forearm
  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_STORM_GREY, width: 9 });
  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5 });

  // fist
  g.circle(handX, handY, 7).fill({ color: COL_STORM_GREY_LT });
  g.circle(handX, handY, 7).stroke({ color: COL_STORM_GREY, width: 1 });
  // fist arc veins
  g.moveTo(handX - 2, handY - 3).lineTo(handX + 2, handY + 3)
    .stroke({ color: COL_ELECTRIC_BLUE, width: 1.2 });
}

/** Draw the lightning javelin weapon — a jagged electric bolt */
function drawLightningJavelin(
  g: Graphics,
  baseX: number, baseY: number,
  angle: number,
  length: number,
  intensity: number,
): void {
  const tipX = baseX + Math.cos(angle) * length;
  const tipY = baseY + Math.sin(angle) * length;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  // build jagged bolt path along weapon axis
  const segments = 6;
  const jagX: number[] = [baseX];
  const jagY: number[] = [baseY];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const mx = lerp(baseX, tipX, t);
    const my = lerp(baseY, tipY, t);
    const jag = ((i % 2 === 0) ? 1 : -1) * (3 + (1 - t) * 2) * intensity;
    jagX.push(mx + perpX * jag);
    jagY.push(my + perpY * jag);
  }
  jagX.push(tipX);
  jagY.push(tipY);

  // outer glow
  g.moveTo(jagX[0], jagY[0]);
  for (let i = 1; i < jagX.length; i++) {
    g.lineTo(jagX[i], jagY[i]);
  }
  g.stroke({ color: COL_ARC_OUTER, width: 5 * intensity, alpha: 0.35 });

  // mid bolt
  g.moveTo(jagX[0], jagY[0]);
  for (let i = 1; i < jagX.length; i++) {
    g.lineTo(jagX[i], jagY[i]);
  }
  g.stroke({ color: COL_ELECTRIC_BLUE, width: 3 * intensity, alpha: 0.8 });

  // bright inner core
  g.moveTo(jagX[0], jagY[0]);
  for (let i = 1; i < jagX.length; i++) {
    g.lineTo(jagX[i], jagY[i]);
  }
  g.stroke({ color: COL_WHITE_HOT, width: 1.5 * intensity });

  // spark bursts along javelin
  if (intensity > 0.3) {
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const sx = jagX[i];
      const sy = jagY[i];
      const sparkSize = (2 + (1 - t) * 2) * intensity;
      g.circle(sx, sy, sparkSize)
        .fill({ color: COL_BRIGHT_YELLOW, alpha: 0.3 * intensity });
    }
  }

  // pointed tip glow
  g.circle(tipX, tipY, 3 * intensity)
    .fill({ color: COL_SPARK_CORE, alpha: 0.5 * intensity });
  g.circle(tipX, tipY, 5 * intensity)
    .fill({ color: COL_ELECTRIC_BLUE, alpha: 0.2 * intensity });
}

/** Draw flying spark particles */
function drawSparks(
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
    const py = baseY - (seed * 0.15 % 60) - phase * 20;
    const size = 0.8 + (i % 3) * 0.4;
    const a = alpha * (1 - ((seed * 0.15 % 60) / 60));
    if (py > baseY - 80 && py < baseY + 5) {
      const col = i % 3 === 0 ? COL_SPARK_CORE : i % 3 === 1 ? COL_BRIGHT_YELLOW : COL_ELECTRIC_BLUE;
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });
    }
  }
}

/** Draw arcing electric line effects */
function drawArcEffect(g: Graphics, cx: number, baseY: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < 6; i++) {
    const y = baseY - 20 - i * 12;
    const jag1X = cx - 15 + Math.sin(i * 1.8 + intensity * 8) * 8;
    const jag2X = cx + Math.sin(i * 2.3 + intensity * 6) * 5;
    const jag3X = cx + 15 + Math.sin(i * 1.5 + intensity * 10) * 8;
    g.moveTo(cx - 25, y)
      .lineTo(jag1X, y - 3)
      .lineTo(jag2X, y + 2)
      .lineTo(jag3X, y - 1)
      .lineTo(cx + 25, y)
      .stroke({ color: COL_ARC_INNER, width: 1.2, alpha: 0.06 * intensity * (1 - i / 8) });
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const arcPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + breathe;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY);
  drawArcEffect(g, CX, GY, 0.5 + breathe * 0.1);

  drawLegs(g, CX, torsoY + 20, breathe * 0.5);
  drawTorso(g, CX, torsoY, breathe);

  // arms at rest, slightly open
  drawArm(g, CX - 28, torsoY - 8, 0.4, 0.8, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.4, 0.8, 1);

  // right hand holds lightning javelin at rest
  const handX = CX + 28 + Math.cos(0.8) * 20;
  const handY = torsoY - 8 + Math.sin(0.4) * 22 + Math.sin(0.8) * 20;
  drawLightningJavelin(g, handX, handY, -0.6, 32, 0.6 + breathe * 0.05);

  drawHead(g, CX, headY + breathe * 0.3, arcPhase);

  drawSparks(g, CX, GY, arcPhase * 0.3, 12, 30, 0.5);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 3;
  const stride = Math.sin(walk) * 5;
  const arcPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + bob;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawArcEffect(g, CX, GY, 0.7);

  drawLegs(g, CX, torsoY + 20, stride);
  drawTorso(g, CX, torsoY, 0);

  // arms swing opposite to legs
  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 28, torsoY - 8, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);

  // javelin carried at side
  const sHandX = CX + 28 + Math.cos(0.7 - armSwing * 0.5) * 20;
  const sHandY = torsoY + 14 + Math.sin(0.7 - armSwing * 0.5) * 20;
  drawLightningJavelin(g, sHandX, sHandY, -0.5 - armSwing * 0.2, 32, 0.7);

  drawHead(g, CX, headY + bob * 0.3, arcPhase);

  // more sparks while moving (trailing behind)
  drawSparks(g, CX + 10, GY, arcPhase * 0.4, 16, 35, 0.6);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const arcPhase = frame * 0.9;

  // windup (0-0.3), thrust (0.3-0.55), impact+shock (0.55-0.75), retract (0.75-1)
  let javelinAngle = -0.6;
  let javelinLen = 32;
  let javelinIntensity = 0.7;
  let lunge = 0;
  let armRaise = 0;
  let impactFlash = 0;

  if (t < 0.3) {
    const lt = t / 0.3;
    armRaise = lt;
    javelinAngle = lerp(-0.6, -2.2, lt);
    javelinIntensity = lerp(0.7, 1, lt);
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    javelinAngle = lerp(-2.2, 0.4, lt);
    lunge = lt * 8;
    javelinLen = lerp(32, 38, lt);
    javelinIntensity = 1;
  } else if (t < 0.75) {
    const lt = (t - 0.55) / 0.2;
    armRaise = 0.5;
    javelinAngle = 0.4;
    lunge = 8;
    javelinLen = 38;
    javelinIntensity = 1;
    impactFlash = 1 - lt;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    javelinAngle = lerp(0.4, -0.6, lt);
    lunge = lerp(8, 0, lt);
    javelinLen = lerp(38, 32, lt);
    javelinIntensity = lerp(1, 0.7, lt);
  }

  const torsoY = GY - 58;
  const headY = torsoY - 32;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawArcEffect(g, attackCX, GY, 0.8 + impactFlash * 0.5);

  drawLegs(g, attackCX, torsoY + 20, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  // left arm braces
  drawArm(g, attackCX - 28, torsoY - 8, 0.3, 0.6, -1);

  // right arm thrusts javelin
  const swingElbow = 0.2 - armRaise * 1.2;
  const swingFore = javelinAngle + 0.3;
  drawArm(g, attackCX + 28, torsoY - 8, swingElbow, swingFore, 1);

  // javelin
  const sHandX = attackCX + 28 + Math.cos(swingFore) * 20;
  const sHandY = torsoY - 8 + Math.sin(swingElbow) * 22 + Math.sin(swingFore) * 20;
  drawLightningJavelin(g, sHandX, sHandY, javelinAngle, javelinLen, javelinIntensity);

  // electric burst on impact
  if (impactFlash > 0.3) {
    const impX = sHandX + Math.cos(javelinAngle) * javelinLen;
    const impY = sHandY + Math.sin(javelinAngle) * javelinLen;
    // electric burst rings
    g.circle(impX, impY, 14 * impactFlash)
      .fill({ color: COL_WHITE_HOT, alpha: 0.4 * impactFlash });
    g.circle(impX, impY, 20 * impactFlash)
      .fill({ color: COL_ELECTRIC_BLUE, alpha: 0.2 * impactFlash });
    // branching arc sparks from impact
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + t * 3;
      const dist = 10 + impactFlash * 12;
      const endX = impX + Math.cos(angle) * dist;
      const endY = impY + Math.sin(angle) * dist;
      // jagged mini bolt to each spark
      const midX = impX + Math.cos(angle) * dist * 0.5 + Math.sin(angle * 3) * 3;
      const midY = impY + Math.sin(angle) * dist * 0.5 + Math.cos(angle * 3) * 3;
      g.moveTo(impX, impY).lineTo(midX, midY).lineTo(endX, endY)
        .stroke({ color: COL_ELECTRIC_BLUE, width: 1.2, alpha: impactFlash * 0.7 });
      g.circle(endX, endY, 1.5)
        .fill({ color: COL_SPARK_CORE, alpha: impactFlash * 0.7 });
    }
  }

  drawHead(g, attackCX, headY, arcPhase);
  drawSparks(g, attackCX, GY, arcPhase * 0.3, 18, 35, 0.7 + impactFlash * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const arcPhase = frame * 0.8;

  // storm vortex: arms raise (0-0.3), arcs form (0.3-0.5), electric storm (0.5-0.85), subsides (0.85-1)
  let armRaise = 0;
  let arcProgress = 0;
  let stormProgress = 0;
  let subsideFactor = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.5) {
    armRaise = 1;
    arcProgress = (t - 0.3) / 0.2;
  } else if (t < 0.85) {
    armRaise = 1 - (t - 0.5) * 0.5;
    arcProgress = 1;
    stormProgress = (t - 0.5) / 0.35;
  } else {
    armRaise = lerp(0.65, 0, (t - 0.85) / 0.15);
    arcProgress = 1 - (t - 0.85) / 0.15;
    stormProgress = 1 - (t - 0.85) / 0.15;
    subsideFactor = (t - 0.85) / 0.15;
  }

  const torsoY = GY - 58 - armRaise * 4;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 + stormProgress * 0.3);

  // ground arc cracks
  if (arcProgress > 0) {
    const crackLen = arcProgress * 40;
    for (let i = 0; i < 6; i++) {
      const angle = -0.5 + i * 0.2;
      const startX = CX + Math.cos(angle) * 8;
      const endX = CX + Math.cos(angle) * crackLen;
      const endY = GY + 2 + Math.sin(angle) * crackLen * 0.2;
      // jagged ground arc with zig-zag
      const midX = (startX + endX) / 2 + Math.sin(i * 2.5) * 4;
      const midY = GY + 2 + Math.sin(angle) * crackLen * 0.1 - 2;
      g.moveTo(startX, GY + 2)
        .lineTo(midX, midY)
        .lineTo(endX, endY)
        .stroke({ color: COL_ELECTRIC_BLUE, width: 2.5 * arcProgress });
      g.moveTo(startX, GY + 2)
        .lineTo(midX, midY)
        .lineTo(endX, endY)
        .stroke({ color: COL_WHITE_HOT, width: 1 * arcProgress });
    }
  }

  // lightning pillars striking down
  if (stormProgress > 0) {
    const pillarPositions = [-30, -10, 15, 35];
    for (let i = 0; i < pillarPositions.length; i++) {
      const px = CX + pillarPositions[i];
      const pillarT = clamp01(stormProgress - i * 0.1);
      if (pillarT <= 0) continue;
      const height = pillarT * 50 * (1 - subsideFactor);

      // build jagged bolt from sky to ground
      const topY = GY - height;
      const segCount = 4;
      const boltPts: { x: number; y: number }[] = [{ x: px, y: topY }];
      for (let s = 1; s < segCount; s++) {
        const st = s / segCount;
        boltPts.push({
          x: px + ((s % 2 === 0) ? 1 : -1) * (3 + pillarT * 3),
          y: lerp(topY, GY, st),
        });
      }
      boltPts.push({ x: px, y: GY });

      // outer glow bolt
      g.moveTo(boltPts[0].x, boltPts[0].y);
      for (let s = 1; s < boltPts.length; s++) {
        g.lineTo(boltPts[s].x, boltPts[s].y);
      }
      g.stroke({ color: COL_ARC_OUTER, width: 6 * pillarT, alpha: 0.4 * pillarT });

      // mid bolt
      g.moveTo(boltPts[0].x, boltPts[0].y);
      for (let s = 1; s < boltPts.length; s++) {
        g.lineTo(boltPts[s].x, boltPts[s].y);
      }
      g.stroke({ color: COL_ELECTRIC_BLUE, width: 3 * pillarT, alpha: 0.7 * pillarT });

      // bright core
      g.moveTo(boltPts[0].x, boltPts[0].y);
      for (let s = 1; s < boltPts.length; s++) {
        g.lineTo(boltPts[s].x, boltPts[s].y);
      }
      g.stroke({ color: COL_WHITE_HOT, width: 1.2 * pillarT, alpha: 0.5 * pillarT });

      // flash at strike point
      if (pillarT > 0.5) {
        g.circle(px, GY, 8 * pillarT)
          .fill({ color: COL_BRIGHT_YELLOW, alpha: 0.4 * pillarT });
        g.circle(px, GY, 4 * pillarT)
          .fill({ color: COL_SPARK_CORE, alpha: 0.3 * pillarT });
      }
    }
  }

  drawLegs(g, CX, torsoY + 20, 0);
  drawTorso(g, CX, torsoY, armRaise * 2);

  // both arms raised for storm cast
  const raiseAngle = -0.5 - armRaise * 1.2;
  drawArm(g, CX - 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, arcPhase);

  // intense spark shower during storm
  drawSparks(g, CX, GY, arcPhase * 0.3, 25 + stormProgress * 15, 50, 0.6 + stormProgress * 0.4);

  // electric vortex ring around caster during storm
  if (stormProgress > 0.3) {
    const vortexAlpha = (stormProgress - 0.3) * 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + arcPhase * 2;
      const dist = 36 + Math.sin(angle * 3) * 6;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 30 + Math.sin(angle) * 8;
      // draw mini arcs between vortex points
      const nextAngle = (i + 1) * 0.785 + arcPhase * 2;
      const nextDist = 36 + Math.sin(nextAngle * 3) * 6;
      const nx = CX + Math.cos(nextAngle) * nextDist;
      const ny = GY - 30 + Math.sin(nextAngle) * 8;
      g.moveTo(fx, fy).lineTo(nx, ny)
        .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5, alpha: vortexAlpha * 0.4 });
      g.circle(fx, fy, 2 + Math.sin(angle * 2) * 1)
        .fill({ color: COL_BRIGHT_YELLOW, alpha: vortexAlpha * 0.5 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // power down: arcs diminish (0-0.3), veins darken (0.3-0.6), collapse (0.6-1)
  const fade = 1 - t * 0.6;
  const arcPhase = frame * 0.3;
  const cool = t;
  const crumble = clamp01((t - 0.6) / 0.4);

  g.alpha = fade;

  const torsoY = GY - 58 + crumble * 20;
  const headY = torsoY - 32 + crumble * 8;
  const tilt = crumble * 4;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 20, crumble * 3);

    // torso — veins go dark as power fades
    g.roundRect(CX + tilt - 30, torsoY - 18, 60, 36, 5)
      .fill({ color: COL_DEAD_GREY });
    // fading electric veins
    if (cool < 0.7) {
      g.moveTo(CX + tilt - 1, torsoY - 14)
        .lineTo(CX + tilt + 3, torsoY)
        .lineTo(CX + tilt - 2, torsoY + 10)
        .stroke({ color: COL_ELECTRIC_BLUE, width: 2, alpha: 1 - cool * 1.3 });
    }

    drawArm(g, CX + tilt - 28, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 28, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, 1);
  }

  // head — bolts die out
  if (crumble < 0.9) {
    // skull only, fewer/smaller bolts
    g.roundRect(CX + tilt - 14, headY - 10, 28, 22, 6)
      .fill({ color: cool > 0.5 ? COL_DEAD_GREY : COL_STORM_GREY });
    // dimming eyes
    if (cool < 0.8) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 7, headY - 3, 3, 2)
          .fill({ color: COL_EYE_GLOW, alpha: 1 - cool * 1.2 });
      }
    }
    // diminishing lightning crown
    if (cool < 0.5) {
      const boltCount = Math.max(1, Math.floor(7 * (1 - cool * 2)));
      for (let i = 0; i < boltCount; i++) {
        const dx = (i - boltCount / 2) * 6;
        const h = (10 - cool * 18) * (1 - Math.abs(i - boltCount / 2) / boltCount);
        if (h > 1) {
          const bx = CX + tilt + dx;
          const baseYB = headY - 10;
          const tipYB = baseYB - h;
          const midYB = (baseYB + tipYB) / 2;
          const jag = ((i % 2 === 0) ? 2 : -2) * (1 - cool * 2);
          g.moveTo(bx, baseYB)
            .lineTo(bx + jag, midYB)
            .lineTo(bx, tipYB)
            .stroke({ color: COL_ELECTRIC_BLUE, width: 1.5, alpha: 0.5 * (1 - cool * 2) });
        }
      }
    }
  }

  // scattering spark debris
  if (crumble > 0) {
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + crumble * 2;
      const dist = crumble * 25 + i * 4;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.6 + crumble * 15;
      const size = 2 - i * 0.2;
      if (size > 0.5) {
        g.circle(cx2, cy, size)
          .fill({ color: COL_ELECTRIC_BLUE, alpha: fade * (1 - crumble * 0.5) });
      }
    }
  }

  // fading static wisps
  if (t > 0.2) {
    for (let i = 0; i < 5; i++) {
      const sy = torsoY - 20 - (t - 0.2) * 40 - i * 8;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 15;
      const sx2 = sx + Math.sin(i * 3.7 + t * 5) * 6;
      g.moveTo(sx, sy).lineTo(sx2, sy - 4)
        .stroke({ color: COL_VEIN_DIM, width: 1, alpha: 0.15 * (1 - t) });
    }
  }

  // dying sparks scatter and dissipate
  drawSparks(g, CX, GY, arcPhase, Math.max(0, 12 - Math.floor(t * 14)), 25, 0.4 * (1 - t));
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

export function generateLightningElementalFrames(
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
