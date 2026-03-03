// Procedural sprite generator for the Distortion Elemental unit type.
//
// 144x144 px per frame (3x3 tiles). A void-born horror bending reality:
//   - Dark purple-black body with glowing purple veins/fissures
//   - Swirling void crown of purple energy tendrils
//   - Massive arms with void-charged fists that pulse
//   - No physical weapon — fights with distortion blasts from hands
//   - Void particles — small purple/magenta dots that drift and fade
//   - Distortion ripple rings instead of heat shimmer
//   - Void vortex cast, implosion death

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
const COL_VOID_BLACK     = 0x0a0014;
const COL_BODY_DK        = 0x1a0a2a;
const COL_BODY_LT        = 0x2a1a3a;
const COL_DEEP_PURPLE    = 0x3a1a5a;
const COL_MID_PURPLE     = 0x7733aa;
const COL_VEIN           = 0x9944cc;
const COL_BRIGHT_PURPLE  = 0xbb66ee;
const COL_CORE           = 0xddaaff;
const COL_CORE_BRIGHT    = 0xeeccff;
const COL_PINK_ACCENT    = 0xff66cc;
const COL_EYE_GLOW       = 0xddaaff;
const COL_SHADOW         = 0x000000;
const COL_RIPPLE         = 0x9944cc;
const COL_DISPERSED      = 0x1a0a2a;

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
  // purple tint reflection on ground
  g.ellipse(cx, cy + 2, 28 * scale, 6 * scale)
    .fill({ color: COL_MID_PURPLE, alpha: 0.08 });
}

/** Draw the legs with void vein cracks (glowing purple lines) */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 14;

    // thigh — dark void column
    const kneeY = hipY + 26;
    g.roundRect(legX - 8, hipY + offset * 0.3, 16, kneeY - hipY, 3)
      .fill({ color: COL_BODY_DK });
    // void vein fissure on thigh
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_VEIN, width: 1.8 });
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_BRIGHT_PURPLE, width: 0.8 });

    // knee joint — glowing void energy
    g.ellipse(legX, kneeY + offset * 0.4, 7, 5)
      .fill({ color: COL_DEEP_PURPLE });
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_BRIGHT_PURPLE, alpha: 0.7 });

    // shin
    const footY = kneeY + 24;
    g.roundRect(legX - 7, kneeY + offset * 0.4, 14, footY - kneeY, 2)
      .fill({ color: COL_BODY_DK });
    // shin vein crack
    g.moveTo(legX + 2, kneeY + 6).lineTo(legX - 1, kneeY + 16)
      .stroke({ color: COL_VEIN, width: 1.5 });

    // foot — broad void mass
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .fill({ color: COL_BODY_LT });
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .stroke({ color: COL_BODY_DK, width: 0.8 });

    // void energy drip from knee
    const dripY = kneeY + 8 + Math.abs(offset) * 0.5;
    g.ellipse(legX + side * 3, dripY, 1.5, 2.5)
      .fill({ color: COL_VEIN, alpha: 0.6 });
  }
}

/** Draw the torso with distortion fissures and a pulsating void core */
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
    .fill({ color: COL_VOID_BLACK });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .fill({ color: COL_BODY_LT });

  // chest plate (dark void with subtle edge)
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .fill({ color: COL_BODY_DK });
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .stroke({ color: COL_DEEP_PURPLE, width: 1 });

  // major distortion fissures across chest
  // central vertical crack
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_VEIN, width: 2.5 });
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_CORE, width: 1 });

  // diagonal cracks
  g.moveTo(cx - 18, torsoY - 8)
    .lineTo(cx - 6, torsoY + 4)
    .stroke({ color: COL_VEIN, width: 2 });
  g.moveTo(cx + 18, torsoY - 6)
    .lineTo(cx + 8, torsoY + 6)
    .stroke({ color: COL_VEIN, width: 2 });

  // branching micro-cracks
  const cracks = [
    [cx - 10, torsoY - 10, cx - 14, torsoY - 4],
    [cx + 6, torsoY - 8, cx + 12, torsoY - 2],
    [cx - 4, torsoY + 4, cx - 10, torsoY + 12],
    [cx + 3, torsoY + 6, cx + 9, torsoY + 12],
  ];
  for (const [x1, y1, x2, y2] of cracks) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_MID_PURPLE, width: 1.2 });
  }

  // pulsating void core glow visible through central crack
  g.ellipse(cx, torsoY - 2, 6 + breathe * 0.5, 8 + breathe * 0.5)
    .fill({ color: COL_CORE, alpha: 0.15 + breathe * 0.02 });
  g.ellipse(cx, torsoY - 2, 3 + breathe * 0.3, 5 + breathe * 0.3)
    .fill({ color: COL_CORE_BRIGHT, alpha: 0.1 + breathe * 0.015 });

  // shoulder plates
  for (const side of [-1, 1] as const) {
    // large pauldron
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .fill({ color: COL_BODY_DK });
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .stroke({ color: COL_DEEP_PURPLE, width: 0.8 });
    // void vein accent on shoulder
    g.moveTo(cx + side * 22, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 8)
      .stroke({ color: COL_VEIN, width: 1.5 });
    // spike on pauldron
    g.moveTo(cx + side * 28, torsoY - 22)
      .lineTo(cx + side * 25, torsoY - 14)
      .lineTo(cx + side * 31, torsoY - 14)
      .closePath()
      .fill({ color: COL_BODY_DK });
    g.moveTo(cx + side * 28, torsoY - 20)
      .lineTo(cx + side * 26, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 14)
      .closePath()
      .fill({ color: COL_DEEP_PURPLE, alpha: 0.4 });
  }

  // belt / waist plate
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .fill({ color: COL_BODY_DK });
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .stroke({ color: COL_MID_PURPLE, width: 0.8 });
  // belt buckle (void glow)
  g.ellipse(cx, torsoY + 16, 4, 3).fill({ color: COL_BRIGHT_PURPLE });
  g.ellipse(cx, torsoY + 16, 2, 1.5).fill({ color: COL_CORE });
}

/** Draw the head with void crown (swirling purple energy tendrils) */
function drawHead(
  g: Graphics,
  cx: number, headY: number,
  voidPhase: number,
): void {
  // neck (short, thick, with void glow)
  g.roundRect(cx - 8, headY + 10, 16, 10, 3)
    .fill({ color: COL_BODY_DK });
  g.moveTo(cx, headY + 12).lineTo(cx + 1, headY + 18)
    .stroke({ color: COL_VEIN, width: 1.5 });

  // skull shape
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .fill({ color: COL_BODY_DK });
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .stroke({ color: COL_DEEP_PURPLE, width: 0.6 });

  // brow ridge
  g.roundRect(cx - 16, headY - 8, 32, 6, 2)
    .fill({ color: COL_BODY_LT });

  // void cracks on skull
  g.moveTo(cx - 4, headY - 10).lineTo(cx - 2, headY - 2)
    .stroke({ color: COL_VEIN, width: 1.2 });
  g.moveTo(cx + 5, headY - 10).lineTo(cx + 3, headY)
    .stroke({ color: COL_VEIN, width: 1 });

  // jaw
  g.roundRect(cx - 10, headY + 4, 20, 8, 3)
    .fill({ color: COL_BODY_LT });
  // mouth line (void glow)
  g.moveTo(cx - 8, headY + 8).lineTo(cx + 8, headY + 8)
    .stroke({ color: COL_MID_PURPLE, width: 1.5 });
  g.moveTo(cx - 6, headY + 8).lineTo(cx + 6, headY + 8)
    .stroke({ color: COL_BRIGHT_PURPLE, width: 0.7 });

  // eyes — piercing purple-white glow
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 7;
    const ey = headY - 3;
    // eye socket
    g.ellipse(ex, ey, 5, 3.5).fill({ color: COL_SHADOW });
    // purple glow
    g.ellipse(ex, ey, 4, 3).fill({ color: COL_MID_PURPLE, alpha: 0.6 });
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_EYE_GLOW });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: 0xffffff, alpha: 0.5 });
    // glow halo
    g.ellipse(ex, ey, 7, 5).fill({ color: COL_EYE_GLOW, alpha: 0.1 });
  }

  // void crown — swirling purple energy tendrils rising from head
  const tendrils = [
    { dx: 0,   h: 22, w: 8 },
    { dx: -8,  h: 16, w: 6 },
    { dx: 8,   h: 17, w: 6 },
    { dx: -14, h: 11, w: 5 },
    { dx: 14,  h: 12, w: 5 },
    { dx: -4,  h: 19, w: 5 },
    { dx: 5,   h: 18, w: 5 },
  ];

  for (const td of tendrils) {
    const tx = cx + td.dx;
    const swirl = Math.sin(voidPhase * 4 + td.dx * 0.3) * 3;
    const tipY = headY - 12 - td.h - swirl;
    const baseY = headY - 8;

    // outer tendril (deep purple)
    g.moveTo(tx - td.w * 0.5, baseY)
      .quadraticCurveTo(tx - td.w * 0.3, tipY + td.h * 0.4, tx + swirl * 0.3, tipY)
      .quadraticCurveTo(tx + td.w * 0.3, tipY + td.h * 0.4, tx + td.w * 0.5, baseY)
      .closePath()
      .fill({ color: COL_DEEP_PURPLE, alpha: 0.7 });

    // mid tendril (mid purple)
    g.moveTo(tx - td.w * 0.3, baseY)
      .quadraticCurveTo(tx - td.w * 0.15, tipY + td.h * 0.35, tx + swirl * 0.2, tipY + 3)
      .quadraticCurveTo(tx + td.w * 0.15, tipY + td.h * 0.35, tx + td.w * 0.3, baseY)
      .closePath()
      .fill({ color: COL_MID_PURPLE, alpha: 0.8 });

    // inner tendril (bright purple core)
    g.moveTo(tx - td.w * 0.15, baseY)
      .quadraticCurveTo(tx, tipY + td.h * 0.45, tx + swirl * 0.1, tipY + 6)
      .quadraticCurveTo(tx, tipY + td.h * 0.45, tx + td.w * 0.15, baseY)
      .closePath()
      .fill({ color: COL_BRIGHT_PURPLE, alpha: 0.6 });
  }
}

/** Draw an arm made of void matter with void energy at joints */
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
    .stroke({ color: COL_BODY_DK, width: 10 });
  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_VEIN, width: 2 });

  // elbow joint (void energy glow)
  g.circle(elbowX, elbowY, 6).fill({ color: COL_BODY_DK });
  g.circle(elbowX, elbowY, 4).fill({ color: COL_MID_PURPLE, alpha: 0.7 });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_BRIGHT_PURPLE, alpha: 0.5 });

  // forearm
  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_BODY_DK, width: 9 });
  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_VEIN, width: 1.5 });

  // void-charged fist (larger, pulsing)
  g.circle(handX, handY, 9).fill({ color: COL_DEEP_PURPLE });
  g.circle(handX, handY, 9).stroke({ color: COL_BODY_DK, width: 1 });
  // void energy cracks on fist
  g.moveTo(handX - 3, handY - 4).lineTo(handX + 3, handY + 4)
    .stroke({ color: COL_VEIN, width: 1.2 });
  g.moveTo(handX + 2, handY - 3).lineTo(handX - 2, handY + 3)
    .stroke({ color: COL_BRIGHT_PURPLE, width: 0.8 });
  // void pulse glow around fist
  g.circle(handX, handY, 12).fill({ color: COL_MID_PURPLE, alpha: 0.12 });
}

/** Draw void particles — small purple/magenta dots that drift and fade */
function drawVoidParticles(
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
      const col = i % 3 === 0 ? COL_CORE : i % 3 === 1 ? COL_PINK_ACCENT : COL_BRIGHT_PURPLE;
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });
    }
  }
}

/** Draw distortion ripple — concentric warping rings */
function drawDistortionRipple(g: Graphics, cx: number, baseY: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < 6; i++) {
    const radius = 14 + i * 10;
    const waveOffset = Math.sin(i * 1.2 + intensity * 8) * 2;
    const rippleAlpha = 0.06 * intensity * (1 - i / 8);
    g.ellipse(cx + waveOffset, baseY - 30 - i * 6, radius, radius * 0.25)
      .stroke({ color: COL_RIPPLE, width: 1.5, alpha: rippleAlpha });
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const voidPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + breathe;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY);
  drawDistortionRipple(g, CX, GY, 0.5 + breathe * 0.1);

  drawLegs(g, CX, torsoY + 20, breathe * 0.5);
  drawTorso(g, CX, torsoY, breathe);

  // arms at rest, slightly open — no weapon, void-charged fists
  drawArm(g, CX - 28, torsoY - 8, 0.4, 0.8, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.4, 0.8, 1);

  drawHead(g, CX, headY + breathe * 0.3, voidPhase);

  drawVoidParticles(g, CX, GY, voidPhase * 0.3, 12, 30, 0.5);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 3;
  const stride = Math.sin(walk) * 5;
  const voidPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + bob;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawDistortionRipple(g, CX, GY, 0.7);

  drawLegs(g, CX, torsoY + 20, stride);
  drawTorso(g, CX, torsoY, 0);

  // arms swing opposite to legs
  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 28, torsoY - 8, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);

  drawHead(g, CX, headY + bob * 0.3, voidPhase);

  // more void particles while moving (trailing behind)
  drawVoidParticles(g, CX + 10, GY, voidPhase * 0.4, 16, 35, 0.6);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const voidPhase = frame * 0.9;

  // windup (0-0.3), punch (0.3-0.55), void burst impact (0.55-0.75), retract (0.75-1)
  let lunge = 0;
  let armRaise = 0;
  let impactFlash = 0;
  let punchExtend = 0;

  if (t < 0.3) {
    const lt = t / 0.3;
    armRaise = lt;
    punchExtend = 0;
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    lunge = lt * 8;
    punchExtend = lt;
  } else if (t < 0.75) {
    const lt = (t - 0.55) / 0.2;
    armRaise = 0.5;
    lunge = 8;
    punchExtend = 1;
    impactFlash = 1 - lt;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    lunge = lerp(8, 0, lt);
    punchExtend = lerp(1, 0, lt);
  }

  const torsoY = GY - 58;
  const headY = torsoY - 32;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawDistortionRipple(g, attackCX, GY, 0.8 + impactFlash * 0.5);

  drawLegs(g, attackCX, torsoY + 20, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  // left arm braces
  drawArm(g, attackCX - 28, torsoY - 8, 0.3, 0.6, -1);

  // right arm punches forward with void fist
  const punchElbow = 0.2 - armRaise * 1.2;
  const punchFore = lerp(0.8, -0.2, punchExtend);
  drawArm(g, attackCX + 28, torsoY - 8, punchElbow, punchFore, 1);

  // void burst on impact (purple explosion from fist)
  if (impactFlash > 0.3) {
    const elbowX = attackCX + 28 + Math.cos(punchElbow) * 22;
    const elbowY = torsoY - 8 + Math.sin(punchElbow) * 22;
    const impX = elbowX + Math.cos(punchFore) * 20 + 12;
    const impY = elbowY + Math.sin(punchFore) * 20;
    // void burst rings
    g.circle(impX, impY, 16 * impactFlash)
      .fill({ color: COL_BRIGHT_PURPLE, alpha: 0.4 * impactFlash });
    g.circle(impX, impY, 24 * impactFlash)
      .fill({ color: COL_DEEP_PURPLE, alpha: 0.2 * impactFlash });
    g.circle(impX, impY, 8 * impactFlash)
      .fill({ color: COL_CORE_BRIGHT, alpha: 0.3 * impactFlash });
    // void sparks
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + t * 3;
      const dist = 10 + impactFlash * 14;
      g.circle(impX + Math.cos(angle) * dist, impY + Math.sin(angle) * dist, 1.5)
        .fill({ color: COL_PINK_ACCENT, alpha: impactFlash * 0.7 });
    }
  }

  drawHead(g, attackCX, headY, voidPhase);
  drawVoidParticles(g, attackCX, GY, voidPhase * 0.3, 18, 35, 0.7 + impactFlash * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const voidPhase = frame * 0.8;

  // void vortex: arms raise (0-0.3), vortex opens (0.3-0.5), vortex expands (0.5-0.85), subsides (0.85-1)
  let armRaise = 0;
  let vortexOpen = 0;
  let vortexExpand = 0;
  let subsideFactor = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.5) {
    armRaise = 1;
    vortexOpen = (t - 0.3) / 0.2;
  } else if (t < 0.85) {
    armRaise = 1 - (t - 0.5) * 0.5;
    vortexOpen = 1;
    vortexExpand = (t - 0.5) / 0.35;
  } else {
    armRaise = lerp(0.65, 0, (t - 0.85) / 0.15);
    vortexOpen = 1 - (t - 0.85) / 0.15;
    vortexExpand = 1 - (t - 0.85) / 0.15;
    subsideFactor = (t - 0.85) / 0.15;
  }

  const torsoY = GY - 58 - armRaise * 4;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 + vortexExpand * 0.3);

  // void vortex cracks on ground
  if (vortexOpen > 0) {
    const crackLen = vortexOpen * 40;
    for (let i = 0; i < 6; i++) {
      const angle = -0.5 + i * 0.2;
      const startX = CX + Math.cos(angle) * 8;
      const endX = CX + Math.cos(angle) * crackLen;
      const endY = GY + 2 + Math.sin(angle) * crackLen * 0.2;
      g.moveTo(startX, GY + 2)
        .lineTo(endX, endY)
        .stroke({ color: COL_VEIN, width: 2.5 * vortexOpen });
      g.moveTo(startX, GY + 2)
        .lineTo(endX, endY)
        .stroke({ color: COL_CORE, width: 1 * vortexOpen });
    }
  }

  // void pillars erupting from vortex
  if (vortexExpand > 0) {
    const pillarPositions = [-30, -10, 15, 35];
    for (let i = 0; i < pillarPositions.length; i++) {
      const px = CX + pillarPositions[i];
      const pillarT = clamp01(vortexExpand - i * 0.1);
      if (pillarT <= 0) continue;
      const height = pillarT * 50 * (1 - subsideFactor);

      // void energy column
      g.roundRect(px - 5, GY - height, 10, height, 3)
        .fill({ color: COL_MID_PURPLE, alpha: 0.7 * pillarT });
      g.roundRect(px - 3, GY - height, 6, height, 2)
        .fill({ color: COL_BRIGHT_PURPLE, alpha: 0.5 * pillarT });
      g.roundRect(px - 1.5, GY - height + 2, 3, height - 4, 1)
        .fill({ color: COL_CORE, alpha: 0.3 * pillarT });

      // void burst at top
      if (pillarT > 0.5) {
        g.circle(px, GY - height, 8 * pillarT)
          .fill({ color: COL_BRIGHT_PURPLE, alpha: 0.4 * pillarT });
        g.circle(px, GY - height, 4 * pillarT)
          .fill({ color: COL_CORE_BRIGHT, alpha: 0.3 * pillarT });
      }
    }
  }

  drawLegs(g, CX, torsoY + 20, 0);
  drawTorso(g, CX, torsoY, armRaise * 2);

  // both arms raised for void vortex cast
  const raiseAngle = -0.5 - armRaise * 1.2;
  drawArm(g, CX - 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, voidPhase);

  // intense void particle shower during vortex
  drawVoidParticles(g, CX, GY, voidPhase * 0.3, 25 + vortexExpand * 15, 50, 0.6 + vortexExpand * 0.4);

  // void vortex ring around caster during expansion
  if (vortexExpand > 0.3) {
    const vortexAlpha = (vortexExpand - 0.3) * 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + voidPhase * 2;
      const dist = 36 + Math.sin(angle * 3) * 6;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 30 + Math.sin(angle) * 8;
      g.circle(fx, fy, 3 + Math.sin(angle * 2) * 1.5)
        .fill({ color: COL_BRIGHT_PURPLE, alpha: vortexAlpha * 0.5 });
    }
    // additional inner vortex ring
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.047 + voidPhase * -3;
      const dist = 20 + Math.sin(angle * 2) * 4;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 30 + Math.sin(angle) * 5;
      g.circle(fx, fy, 2 + Math.sin(angle * 3) * 1)
        .fill({ color: COL_PINK_ACCENT, alpha: vortexAlpha * 0.4 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // void collapse: void dims (0-0.3), body implodes (0.3-0.6), disperses into particles (0.6-1)
  const fade = 1 - t * 0.6;
  const voidPhase = frame * 0.3;
  const collapse = t;
  const disperse = clamp01((t - 0.6) / 0.4);

  g.alpha = fade;

  const torsoY = GY - 58 + disperse * 20;
  const headY = torsoY - 32 + disperse * 8;
  const tilt = disperse * 4;

  drawShadow(g, CX, GY, 1 - disperse * 0.5);

  if (disperse < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 20, disperse * 3);

    // torso — void fades as body collapses
    g.roundRect(CX + tilt - 30, torsoY - 18, 60, 36, 5)
      .fill({ color: collapse > 0.5 ? COL_DISPERSED : COL_BODY_LT });
    // fading void vein cracks
    if (collapse < 0.7) {
      g.moveTo(CX + tilt - 1, torsoY - 14)
        .lineTo(CX + tilt + 3, torsoY)
        .lineTo(CX + tilt - 2, torsoY + 10)
        .stroke({ color: COL_VEIN, width: 2, alpha: 1 - collapse * 1.3 });
    }

    drawArm(g, CX + tilt - 28, torsoY - 8, 0.6 + disperse * 0.5, 1.2 + disperse * 0.3, -1);
    drawArm(g, CX + tilt + 28, torsoY - 8, 0.6 + disperse * 0.5, 1.2 + disperse * 0.3, 1);
  }

  // head — void crown dies out
  if (disperse < 0.9) {
    // skull only, fewer/smaller tendrils
    g.roundRect(CX + tilt - 14, headY - 10, 28, 22, 6)
      .fill({ color: collapse > 0.5 ? COL_DISPERSED : COL_BODY_DK });
    // dimming eyes
    if (collapse < 0.8) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 7, headY - 3, 3, 2)
          .fill({ color: COL_EYE_GLOW, alpha: 1 - collapse * 1.2 });
      }
    }
    // diminishing void crown tendrils
    if (collapse < 0.5) {
      const tendrilCount = Math.max(1, Math.floor(7 * (1 - collapse * 2)));
      for (let i = 0; i < tendrilCount; i++) {
        const dx = (i - tendrilCount / 2) * 6;
        const h = (10 - collapse * 18) * (1 - Math.abs(i - tendrilCount / 2) / tendrilCount);
        if (h > 1) {
          g.moveTo(CX + tilt + dx - 2, headY - 10)
            .quadraticCurveTo(CX + tilt + dx, headY - 10 - h, CX + tilt + dx + 2, headY - 10)
            .closePath()
            .fill({ color: COL_DEEP_PURPLE, alpha: 0.5 * (1 - collapse * 2) });
        }
      }
    }
  }

  // implosion debris — void fragments pulled inward then dispersing
  if (disperse > 0) {
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + disperse * 2;
      // start outward, then pull inward for implosion effect
      const dist = disperse < 0.5
        ? (1 - disperse * 2) * 25 + i * 4
        : (disperse - 0.5) * 50 + i * 4;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.6 + disperse * 15;
      const size = 3 - i * 0.3;
      if (size > 0.5) {
        g.rect(cx2 - size, cy - size, size * 2, size * 2)
          .fill({ color: COL_MID_PURPLE, alpha: fade * (1 - disperse * 0.5) });
      }
    }
  }

  // fading void wisps
  if (t > 0.2) {
    for (let i = 0; i < 5; i++) {
      const sy = torsoY - 20 - (t - 0.2) * 40 - i * 8;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 15;
      g.circle(sx, sy, 4 + i).fill({ color: COL_DEEP_PURPLE, alpha: 0.15 * (1 - t) });
    }
  }

  // dying void particles disperse outward
  drawVoidParticles(g, CX, GY, voidPhase, Math.max(0, 12 - Math.floor(t * 14)), 25, 0.4 * (1 - t));
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

export function generateDistortionElementalFrames(
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
