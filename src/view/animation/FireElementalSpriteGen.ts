// Procedural sprite generator for the Fire Elemental unit type.
//
// 144×144 px per frame (3×3 tiles). A towering inferno given form:
//   • Cracked obsidian / basalt armor plates with molten lava in fissures
//   • Blazing flame crown wreathing the head, ember eyes
//   • Massive arms of solidified magma with glowing cracks
//   • Flame greatsword / whip weapon
//   • Lava dripping from joints, heat shimmer distortion
//   • Ember / cinder particle trail
//   • Volcanic eruption cast, cooling death

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
const COL_OBSIDIAN      = 0x1a1118;
const COL_OBSIDIAN_LT   = 0x2a2028;
const COL_BASALT        = 0x332830;
const COL_LAVA          = 0xff4400;
const COL_LAVA_BRIGHT   = 0xff8822;
const COL_LAVA_DK       = 0xcc2200;
const COL_MAGMA_CORE    = 0xffcc44;
const COL_EMBER         = 0xff6600;
const COL_FLAME_INNER   = 0xffdd44;
const COL_FLAME_MID     = 0xff8800;
const COL_FLAME_OUTER   = 0xcc3300;
const COL_EYE           = 0xffee00;
const COL_EYE_GLOW      = 0xff8800;
const COL_SMOKE         = 0x332222;
const COL_SHADOW        = 0x000000;
const COL_HEAT_SHIMMER  = 0xff6633;
const COL_COOLED        = 0x222222;

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
  // fiery reflection on ground
  g.ellipse(cx, cy + 2, 28 * scale, 6 * scale)
    .fill({ color: COL_LAVA, alpha: 0.08 });
}

/** Draw the massive obsidian legs with lava cracks */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 14;

    // thigh — thick obsidian column
    const kneeY = hipY + 26;
    g.roundRect(legX - 8, hipY + offset * 0.3, 16, kneeY - hipY, 3)
      .fill({ color: COL_OBSIDIAN });
    // lava fissure on thigh
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_LAVA, width: 1.8 });
    g.moveTo(legX - 2, hipY + 4 + offset * 0.2)
      .lineTo(legX + 1, hipY + 14 + offset * 0.2)
      .lineTo(legX - 1, hipY + 20 + offset * 0.2)
      .stroke({ color: COL_LAVA_BRIGHT, width: 0.8 });

    // knee joint — glowing magma
    g.ellipse(legX, kneeY + offset * 0.4, 7, 5)
      .fill({ color: COL_LAVA_DK });
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_LAVA_BRIGHT, alpha: 0.7 });

    // shin
    const footY = kneeY + 24;
    g.roundRect(legX - 7, kneeY + offset * 0.4, 14, footY - kneeY, 2)
      .fill({ color: COL_OBSIDIAN });
    // shin crack
    g.moveTo(legX + 2, kneeY + 6).lineTo(legX - 1, kneeY + 16)
      .stroke({ color: COL_LAVA, width: 1.5 });

    // foot — broad basalt
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .fill({ color: COL_BASALT });
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 6, 2)
      .stroke({ color: COL_OBSIDIAN, width: 0.8 });

    // lava drip from knee
    const dripY = kneeY + 8 + Math.abs(offset) * 0.5;
    g.ellipse(legX + side * 3, dripY, 1.5, 2.5)
      .fill({ color: COL_LAVA, alpha: 0.6 });
  }
}

/** Draw the massive torso with armor plates and lava fissures */
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
    .fill({ color: COL_OBSIDIAN });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .fill({ color: COL_BASALT });

  // chest plate (obsidian with light edge)
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .fill({ color: COL_OBSIDIAN });
  g.roundRect(cx - 22, torsoY - 14, 44, 28, 4)
    .stroke({ color: COL_OBSIDIAN_LT, width: 1 });

  // major lava fissures across chest
  // central vertical crack
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_LAVA, width: 2.5 });
  g.moveTo(cx - 1, torsoY - 14)
    .quadraticCurveTo(cx + 3, torsoY - 2, cx - 2, torsoY + 10)
    .stroke({ color: COL_MAGMA_CORE, width: 1 });

  // diagonal cracks
  g.moveTo(cx - 18, torsoY - 8)
    .lineTo(cx - 6, torsoY + 4)
    .stroke({ color: COL_LAVA, width: 2 });
  g.moveTo(cx + 18, torsoY - 6)
    .lineTo(cx + 8, torsoY + 6)
    .stroke({ color: COL_LAVA, width: 2 });

  // branching micro-cracks
  const cracks = [
    [cx - 10, torsoY - 10, cx - 14, torsoY - 4],
    [cx + 6, torsoY - 8, cx + 12, torsoY - 2],
    [cx - 4, torsoY + 4, cx - 10, torsoY + 12],
    [cx + 3, torsoY + 6, cx + 9, torsoY + 12],
  ];
  for (const [x1, y1, x2, y2] of cracks) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_LAVA_DK, width: 1.2 });
  }

  // molten core glow visible through central crack
  g.ellipse(cx, torsoY - 2, 6 + breathe * 0.5, 8 + breathe * 0.5)
    .fill({ color: COL_MAGMA_CORE, alpha: 0.15 + breathe * 0.02 });

  // shoulder armor plates
  for (const side of [-1, 1] as const) {
    // large pauldron
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .fill({ color: COL_OBSIDIAN });
    g.ellipse(cx + side * 28, torsoY - 12, 12, 10)
      .stroke({ color: COL_OBSIDIAN_LT, width: 0.8 });
    // lava accent on shoulder
    g.moveTo(cx + side * 22, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 8)
      .stroke({ color: COL_LAVA, width: 1.5 });
    // spike on pauldron
    g.moveTo(cx + side * 28, torsoY - 22)
      .lineTo(cx + side * 25, torsoY - 14)
      .lineTo(cx + side * 31, torsoY - 14)
      .closePath()
      .fill({ color: COL_OBSIDIAN });
    g.moveTo(cx + side * 28, torsoY - 20)
      .lineTo(cx + side * 26, torsoY - 14)
      .lineTo(cx + side * 30, torsoY - 14)
      .closePath()
      .fill({ color: COL_LAVA_DK, alpha: 0.4 });
  }

  // belt / waist plate
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .fill({ color: COL_OBSIDIAN });
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .stroke({ color: COL_LAVA_DK, width: 0.8 });
  // belt buckle (glowing)
  g.ellipse(cx, torsoY + 16, 4, 3).fill({ color: COL_LAVA_BRIGHT });
  g.ellipse(cx, torsoY + 16, 2, 1.5).fill({ color: COL_MAGMA_CORE });
}

/** Draw the head — a rough basalt skull wreathed in flame */
function drawHead(
  g: Graphics,
  cx: number, headY: number,
  flamePhase: number,
): void {
  // neck (short, thick, glowing)
  g.roundRect(cx - 8, headY + 10, 16, 10, 3)
    .fill({ color: COL_OBSIDIAN });
  g.moveTo(cx, headY + 12).lineTo(cx + 1, headY + 18)
    .stroke({ color: COL_LAVA, width: 1.5 });

  // skull shape
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .fill({ color: COL_OBSIDIAN });
  g.roundRect(cx - 14, headY - 10, 28, 22, 6)
    .stroke({ color: COL_OBSIDIAN_LT, width: 0.6 });

  // brow ridge
  g.roundRect(cx - 16, headY - 8, 32, 6, 2)
    .fill({ color: COL_BASALT });

  // cracks on skull
  g.moveTo(cx - 4, headY - 10).lineTo(cx - 2, headY - 2)
    .stroke({ color: COL_LAVA, width: 1.2 });
  g.moveTo(cx + 5, headY - 10).lineTo(cx + 3, headY)
    .stroke({ color: COL_LAVA, width: 1 });

  // jaw
  g.roundRect(cx - 10, headY + 4, 20, 8, 3)
    .fill({ color: COL_BASALT });
  // mouth line (glowing)
  g.moveTo(cx - 8, headY + 8).lineTo(cx + 8, headY + 8)
    .stroke({ color: COL_LAVA_DK, width: 1.5 });
  g.moveTo(cx - 6, headY + 8).lineTo(cx + 6, headY + 8)
    .stroke({ color: COL_LAVA_BRIGHT, width: 0.7 });

  // eyes — fierce glowing ember
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 7;
    const ey = headY - 3;
    // eye socket
    g.ellipse(ex, ey, 5, 3.5).fill({ color: COL_SHADOW });
    // ember glow
    g.ellipse(ex, ey, 4, 3).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_EYE });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: 0xffffff, alpha: 0.5 });
    // glow halo
    g.ellipse(ex, ey, 7, 5).fill({ color: COL_EYE_GLOW, alpha: 0.1 });
  }

  // flame crown — multiple flame tongues rising from skull
  const flames = [
    { dx: 0,   h: 22, w: 8 },
    { dx: -8,  h: 16, w: 6 },
    { dx: 8,   h: 17, w: 6 },
    { dx: -14, h: 11, w: 5 },
    { dx: 14,  h: 12, w: 5 },
    { dx: -4,  h: 19, w: 5 },
    { dx: 5,   h: 18, w: 5 },
  ];

  for (const f of flames) {
    const fx = cx + f.dx;
    const flicker = Math.sin(flamePhase * 4 + f.dx * 0.3) * 3;
    const tipY = headY - 12 - f.h - flicker;
    const baseY = headY - 8;

    // outer flame
    g.moveTo(fx - f.w * 0.5, baseY)
      .quadraticCurveTo(fx - f.w * 0.3, tipY + f.h * 0.4, fx + flicker * 0.3, tipY)
      .quadraticCurveTo(fx + f.w * 0.3, tipY + f.h * 0.4, fx + f.w * 0.5, baseY)
      .closePath()
      .fill({ color: COL_FLAME_OUTER, alpha: 0.7 });

    // mid flame
    g.moveTo(fx - f.w * 0.3, baseY)
      .quadraticCurveTo(fx - f.w * 0.15, tipY + f.h * 0.35, fx + flicker * 0.2, tipY + 3)
      .quadraticCurveTo(fx + f.w * 0.15, tipY + f.h * 0.35, fx + f.w * 0.3, baseY)
      .closePath()
      .fill({ color: COL_FLAME_MID, alpha: 0.8 });

    // inner flame
    g.moveTo(fx - f.w * 0.15, baseY)
      .quadraticCurveTo(fx, tipY + f.h * 0.45, fx + flicker * 0.1, tipY + 6)
      .quadraticCurveTo(fx, tipY + f.h * 0.45, fx + f.w * 0.15, baseY)
      .closePath()
      .fill({ color: COL_FLAME_INNER, alpha: 0.6 });
  }
}

/** Draw an arm made of solidified magma */
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
    .stroke({ color: COL_OBSIDIAN, width: 10 });
  g.moveTo(shoulderX, shoulderY)
    .lineTo(elbowX, elbowY)
    .stroke({ color: COL_LAVA, width: 2 });

  // elbow joint (glowing)
  g.circle(elbowX, elbowY, 6).fill({ color: COL_OBSIDIAN });
  g.circle(elbowX, elbowY, 4).fill({ color: COL_LAVA_DK, alpha: 0.7 });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_LAVA_BRIGHT, alpha: 0.5 });

  // forearm
  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_OBSIDIAN, width: 9 });
  g.moveTo(elbowX, elbowY)
    .lineTo(handX, handY)
    .stroke({ color: COL_LAVA, width: 1.5 });

  // fist
  g.circle(handX, handY, 7).fill({ color: COL_BASALT });
  g.circle(handX, handY, 7).stroke({ color: COL_OBSIDIAN, width: 1 });
  // fist cracks
  g.moveTo(handX - 2, handY - 3).lineTo(handX + 2, handY + 3)
    .stroke({ color: COL_LAVA, width: 1.2 });
}

/** Draw the flame greatsword */
function drawFlameSword(
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

  // blade core (obsidian)
  const bladeW = 4;
  g.moveTo(baseX + perpX * bladeW, baseY + perpY * bladeW)
    .lineTo(tipX, tipY)
    .lineTo(baseX - perpX * bladeW, baseY - perpY * bladeW)
    .closePath()
    .fill({ color: COL_OBSIDIAN });

  // lava edge
  g.moveTo(baseX + perpX * bladeW, baseY + perpY * bladeW)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_LAVA_BRIGHT, width: 2 * intensity });
  g.moveTo(baseX - perpX * bladeW, baseY - perpY * bladeW)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_LAVA, width: 2 * intensity });

  // central lava vein
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_MAGMA_CORE, width: 1.5 * intensity });

  // fire wreath along blade
  if (intensity > 0.3) {
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments;
      const sx = lerp(baseX, tipX, t);
      const sy = lerp(baseY, tipY, t);
      const flameH = (6 + (1 - t) * 4) * intensity;
      const side = (i % 2 === 0) ? 1 : -1;
      g.ellipse(sx + perpX * side * flameH * 0.4, sy + perpY * side * flameH * 0.4,
        flameH * 0.5, flameH * 0.3)
        .fill({ color: COL_FLAME_MID, alpha: 0.4 * intensity });
    }
  }

  // guard / crosspiece
  g.roundRect(baseX - perpX * 8, baseY - perpY * 8, perpX * 16 || 16, perpY * 16 || 4, 2)
    .fill({ color: COL_OBSIDIAN });
}

/** Draw rising embers / cinder particles */
function drawEmbers(
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
      const col = i % 3 === 0 ? COL_MAGMA_CORE : i % 3 === 1 ? COL_EMBER : COL_FLAME_MID;
      g.circle(px, py, size).fill({ color: col, alpha: clamp01(a) });
    }
  }
}

/** Draw heat shimmer distortion effect */
function drawHeatShimmer(g: Graphics, cx: number, baseY: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < 6; i++) {
    const y = baseY - 20 - i * 12;
    const waveX = Math.sin(i * 1.2 + intensity * 8) * (4 + i * 2);
    g.moveTo(cx - 20 + waveX, y)
      .lineTo(cx + 20 + waveX, y)
      .stroke({ color: COL_HEAT_SHIMMER, width: 1.5, alpha: 0.06 * intensity * (1 - i / 8) });
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const flamePhase = t * Math.PI * 2;

  const torsoY = GY - 58 + breathe;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY);
  drawHeatShimmer(g, CX, GY, 0.5 + breathe * 0.1);

  drawLegs(g, CX, torsoY + 20, breathe * 0.5);
  drawTorso(g, CX, torsoY, breathe);

  // arms at rest, slightly open
  drawArm(g, CX - 28, torsoY - 8, 0.4, 0.8, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.4, 0.8, 1);

  // right hand holds flame sword at rest
  const handX = CX + 28 + Math.cos(0.8) * 20;
  const handY = torsoY - 8 + Math.sin(0.4) * 22 + Math.sin(0.8) * 20;
  drawFlameSword(g, handX, handY, -0.6, 32, 0.6 + breathe * 0.05);

  drawHead(g, CX, headY + breathe * 0.3, flamePhase);

  drawEmbers(g, CX, GY, flamePhase * 0.3, 12, 30, 0.5);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 3;
  const stride = Math.sin(walk) * 5;
  const flamePhase = t * Math.PI * 2;

  const torsoY = GY - 58 + bob;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawHeatShimmer(g, CX, GY, 0.7);

  drawLegs(g, CX, torsoY + 20, stride);
  drawTorso(g, CX, torsoY, 0);

  // arms swing opposite to legs
  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 28, torsoY - 8, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);

  // sword carried at side
  const sHandX = CX + 28 + Math.cos(0.7 - armSwing * 0.5) * 20;
  const sHandY = torsoY + 14 + Math.sin(0.7 - armSwing * 0.5) * 20;
  drawFlameSword(g, sHandX, sHandY, -0.5 - armSwing * 0.2, 32, 0.7);

  drawHead(g, CX, headY + bob * 0.3, flamePhase);

  // more embers while moving (trailing behind)
  drawEmbers(g, CX + 10, GY, flamePhase * 0.4, 16, 35, 0.6);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const flamePhase = frame * 0.9;

  // windup (0-0.3), swing (0.3-0.55), impact+fire (0.55-0.75), retract (0.75-1)
  let swordAngle = -0.6;
  let swordLen = 32;
  let swordIntensity = 0.7;
  let lunge = 0;
  let armRaise = 0;
  let impactFlash = 0;

  if (t < 0.3) {
    const lt = t / 0.3;
    armRaise = lt;
    swordAngle = lerp(-0.6, -2.2, lt);
    swordIntensity = lerp(0.7, 1, lt);
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.5;
    swordAngle = lerp(-2.2, 0.4, lt);
    lunge = lt * 8;
    swordLen = lerp(32, 38, lt);
    swordIntensity = 1;
  } else if (t < 0.75) {
    const lt = (t - 0.55) / 0.2;
    armRaise = 0.5;
    swordAngle = 0.4;
    lunge = 8;
    swordLen = 38;
    swordIntensity = 1;
    impactFlash = 1 - lt;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    swordAngle = lerp(0.4, -0.6, lt);
    lunge = lerp(8, 0, lt);
    swordLen = lerp(38, 32, lt);
    swordIntensity = lerp(1, 0.7, lt);
  }

  const torsoY = GY - 58;
  const headY = torsoY - 32;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawHeatShimmer(g, attackCX, GY, 0.8 + impactFlash * 0.5);

  drawLegs(g, attackCX, torsoY + 20, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  // left arm braces
  drawArm(g, attackCX - 28, torsoY - 8, 0.3, 0.6, -1);

  // right arm swings sword
  const swingElbow = 0.2 - armRaise * 1.2;
  const swingFore = swordAngle + 0.3;
  drawArm(g, attackCX + 28, torsoY - 8, swingElbow, swingFore, 1);

  // sword
  const sHandX = attackCX + 28 + Math.cos(swingFore) * 20;
  const sHandY = torsoY - 8 + Math.sin(swingElbow) * 22 + Math.sin(swingFore) * 20;
  drawFlameSword(g, sHandX, sHandY, swordAngle, swordLen, swordIntensity);

  // impact explosion
  if (impactFlash > 0.3) {
    const impX = sHandX + Math.cos(swordAngle) * swordLen;
    const impY = sHandY + Math.sin(swordAngle) * swordLen;
    // fire burst
    g.circle(impX, impY, 14 * impactFlash)
      .fill({ color: COL_FLAME_INNER, alpha: 0.4 * impactFlash });
    g.circle(impX, impY, 20 * impactFlash)
      .fill({ color: COL_FLAME_OUTER, alpha: 0.2 * impactFlash });
    // sparks
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + t * 3;
      const dist = 10 + impactFlash * 12;
      g.circle(impX + Math.cos(angle) * dist, impY + Math.sin(angle) * dist, 1.5)
        .fill({ color: COL_MAGMA_CORE, alpha: impactFlash * 0.7 });
    }
  }

  drawHead(g, attackCX, headY, flamePhase);
  drawEmbers(g, attackCX, GY, flamePhase * 0.3, 18, 35, 0.7 + impactFlash * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const flamePhase = frame * 0.8;

  // eruption: arms raise (0-0.3), ground cracks open (0.3-0.5), lava erupts (0.5-0.85), subsides (0.85-1)
  let armRaise = 0;
  let crackProgress = 0;
  let eruptProgress = 0;
  let subsideFactor = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.5) {
    armRaise = 1;
    crackProgress = (t - 0.3) / 0.2;
  } else if (t < 0.85) {
    armRaise = 1 - (t - 0.5) * 0.5;
    crackProgress = 1;
    eruptProgress = (t - 0.5) / 0.35;
  } else {
    armRaise = lerp(0.65, 0, (t - 0.85) / 0.15);
    crackProgress = 1 - (t - 0.85) / 0.15;
    eruptProgress = 1 - (t - 0.85) / 0.15;
    subsideFactor = (t - 0.85) / 0.15;
  }

  const torsoY = GY - 58 - armRaise * 4;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 + eruptProgress * 0.3);

  // ground cracks
  if (crackProgress > 0) {
    const crackLen = crackProgress * 40;
    for (let i = 0; i < 6; i++) {
      const angle = -0.5 + i * 0.2;
      const startX = CX + Math.cos(angle) * 8;
      const endX = CX + Math.cos(angle) * crackLen;
      const endY = GY + 2 + Math.sin(angle) * crackLen * 0.2;
      g.moveTo(startX, GY + 2)
        .lineTo(endX, endY)
        .stroke({ color: COL_LAVA, width: 2.5 * crackProgress });
      g.moveTo(startX, GY + 2)
        .lineTo(endX, endY)
        .stroke({ color: COL_MAGMA_CORE, width: 1 * crackProgress });
    }
  }

  // lava pillars erupting
  if (eruptProgress > 0) {
    const pillarPositions = [-30, -10, 15, 35];
    for (let i = 0; i < pillarPositions.length; i++) {
      const px = CX + pillarPositions[i];
      const pillarT = clamp01(eruptProgress - i * 0.1);
      if (pillarT <= 0) continue;
      const height = pillarT * 50 * (1 - subsideFactor);

      // lava column
      g.roundRect(px - 5, GY - height, 10, height, 3)
        .fill({ color: COL_LAVA, alpha: 0.7 * pillarT });
      g.roundRect(px - 3, GY - height, 6, height, 2)
        .fill({ color: COL_LAVA_BRIGHT, alpha: 0.5 * pillarT });
      g.roundRect(px - 1.5, GY - height + 2, 3, height - 4, 1)
        .fill({ color: COL_MAGMA_CORE, alpha: 0.3 * pillarT });

      // fire burst at top
      if (pillarT > 0.5) {
        g.circle(px, GY - height, 8 * pillarT)
          .fill({ color: COL_FLAME_MID, alpha: 0.4 * pillarT });
        g.circle(px, GY - height, 4 * pillarT)
          .fill({ color: COL_FLAME_INNER, alpha: 0.3 * pillarT });
      }
    }
  }

  drawLegs(g, CX, torsoY + 20, 0);
  drawTorso(g, CX, torsoY, armRaise * 2);

  // both arms raised for eruption cast
  const raiseAngle = -0.5 - armRaise * 1.2;
  drawArm(g, CX - 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, flamePhase);

  // intense ember shower during eruption
  drawEmbers(g, CX, GY, flamePhase * 0.3, 25 + eruptProgress * 15, 50, 0.6 + eruptProgress * 0.4);

  // fire vortex ring around caster during eruption
  if (eruptProgress > 0.3) {
    const vortexAlpha = (eruptProgress - 0.3) * 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + flamePhase * 2;
      const dist = 36 + Math.sin(angle * 3) * 6;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 30 + Math.sin(angle) * 8;
      g.circle(fx, fy, 3 + Math.sin(angle * 2) * 1.5)
        .fill({ color: COL_FLAME_MID, alpha: vortexAlpha * 0.5 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // cooling: flames diminish (0-0.3), cracks darken (0.3-0.6), crumble (0.6-1)
  const fade = 1 - t * 0.6;
  const flamePhase = frame * 0.3;
  const cool = t;
  const crumble = clamp01((t - 0.6) / 0.4);

  g.alpha = fade;

  const torsoY = GY - 58 + crumble * 20;
  const headY = torsoY - 32 + crumble * 8;
  const tilt = crumble * 4;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 20, crumble * 3);

    // torso — cracks go dark as it cools
    g.roundRect(CX + tilt - 30, torsoY - 18, 60, 36, 5)
      .fill({ color: lerp(COL_BASALT, COL_COOLED, cool) > 0 ? COL_COOLED : COL_BASALT });
    // fading lava cracks
    if (cool < 0.7) {
      g.moveTo(CX + tilt - 1, torsoY - 14)
        .lineTo(CX + tilt + 3, torsoY)
        .lineTo(CX + tilt - 2, torsoY + 10)
        .stroke({ color: COL_LAVA, width: 2, alpha: 1 - cool * 1.3 });
    }

    drawArm(g, CX + tilt - 28, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 28, torsoY - 8, 0.6 + crumble * 0.5, 1.2 + crumble * 0.3, 1);
  }

  // head — flames die out
  if (crumble < 0.9) {
    // skull only, fewer/smaller flames
    g.roundRect(CX + tilt - 14, headY - 10, 28, 22, 6)
      .fill({ color: cool > 0.5 ? COL_COOLED : COL_OBSIDIAN });
    // dimming eyes
    if (cool < 0.8) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 7, headY - 3, 3, 2)
          .fill({ color: COL_EYE, alpha: 1 - cool * 1.2 });
      }
    }
    // diminishing flame crown
    if (cool < 0.5) {
      const flameCount = Math.max(1, Math.floor(7 * (1 - cool * 2)));
      for (let i = 0; i < flameCount; i++) {
        const dx = (i - flameCount / 2) * 6;
        const h = (10 - cool * 18) * (1 - Math.abs(i - flameCount / 2) / flameCount);
        if (h > 1) {
          g.moveTo(CX + tilt + dx - 2, headY - 10)
            .quadraticCurveTo(CX + tilt + dx, headY - 10 - h, CX + tilt + dx + 2, headY - 10)
            .closePath()
            .fill({ color: COL_FLAME_OUTER, alpha: 0.5 * (1 - cool * 2) });
        }
      }
    }
  }

  // falling debris chunks
  if (crumble > 0) {
    for (let i = 0; i < 8; i++) {
      const angle = i * 0.785 + crumble * 2;
      const dist = crumble * 25 + i * 4;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.6 + crumble * 15;
      const size = 3 - i * 0.3;
      if (size > 0.5) {
        g.rect(cx2 - size, cy - size, size * 2, size * 2)
          .fill({ color: COL_COOLED, alpha: fade * (1 - crumble * 0.5) });
      }
    }
  }

  // fading smoke wisps
  if (t > 0.2) {
    for (let i = 0; i < 5; i++) {
      const sy = torsoY - 20 - (t - 0.2) * 40 - i * 8;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 15;
      g.circle(sx, sy, 4 + i).fill({ color: COL_SMOKE, alpha: 0.15 * (1 - t) });
    }
  }

  // dying embers fall
  drawEmbers(g, CX, GY, flamePhase, Math.max(0, 12 - Math.floor(t * 14)), 25, 0.4 * (1 - t));
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

export function generateFireElementalFrames(
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
