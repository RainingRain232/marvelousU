// Procedural sprite generator for the Ice Elemental unit type.
//
// 144×144 px per frame (3×3 tiles). A towering frozen colossus:
//   • Crystalline ice body with internal frozen blue glow
//   • Jagged ice crystal formations on shoulders, back, and crown
//   • Translucent icy limbs with visible frozen veins
//   • Frost vapor trailing from body, icicle formations
//   • Frozen spear / ice blade weapon
//   • Blizzard vortex cast, shattering death

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
const COL_ICE          = 0x8ec8e8;
const COL_ICE_DK       = 0x5a8aaa;
const COL_ICE_DEEP     = 0x3a6a8a;
const COL_ICE_LT       = 0xc0e8ff;
const COL_CRYSTAL       = 0xaaddff;
const COL_CRYSTAL_EDGE  = 0x88bbdd;
const COL_CRYSTAL_SHINE = 0xeeffff;
const COL_CORE_GLOW     = 0x4488cc;
const COL_CORE_BRIGHT   = 0x66aaee;
const COL_FROST         = 0xddeeFF;
const COL_FROST_DK      = 0x99bbdd;
const COL_EYE           = 0x88ddff;
const COL_EYE_BRIGHT    = 0xccffff;
const COL_SNOW          = 0xeef4ff;
const COL_VAPOR         = 0xbbddff;
const COL_SHADOW        = 0x000000;
const COL_BLIZZARD      = 0xaaccee;

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
    .fill({ color: COL_SHADOW, alpha: 0.4 });
  // frost reflection on ground
  g.ellipse(cx, cy + 2, 30 * scale, 7 * scale)
    .fill({ color: COL_FROST, alpha: 0.06 });
}

/** Draw a jagged ice crystal spike */
function drawCrystal(
  g: Graphics,
  baseX: number, baseY: number,
  angle: number,
  length: number,
  width: number,
  alpha = 1,
): void {
  const tipX = baseX + Math.cos(angle) * length;
  const tipY = baseY + Math.sin(angle) * length;
  const perpX = -Math.sin(angle) * width;
  const perpY = Math.cos(angle) * width;

  // crystal body
  g.moveTo(baseX + perpX, baseY + perpY)
    .lineTo(tipX, tipY)
    .lineTo(baseX - perpX, baseY - perpY)
    .closePath()
    .fill({ color: COL_CRYSTAL, alpha: 0.7 * alpha });

  // edge highlight
  g.moveTo(baseX + perpX, baseY + perpY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_EDGE, width: 0.8, alpha: 0.6 * alpha });

  // internal refraction line
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_SHINE, width: 0.5, alpha: 0.4 * alpha });

  // tip shine
  g.circle(tipX, tipY, 1.5).fill({ color: COL_CRYSTAL_SHINE, alpha: 0.5 * alpha });
}

/** Draw the massive crystalline legs */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  stride: number,
): void {
  for (const side of [-1, 1] as const) {
    const offset = side * stride;
    const legX = cx + side * 14;

    // thigh — translucent ice column
    const kneeY = hipY + 24;
    g.roundRect(legX - 8, hipY + offset * 0.3, 16, kneeY - hipY, 3)
      .fill({ color: COL_ICE_DK, alpha: 0.85 });
    g.roundRect(legX - 8, hipY + offset * 0.3, 16, kneeY - hipY, 3)
      .stroke({ color: COL_ICE, width: 0.8 });

    // internal frost vein
    g.moveTo(legX - 2, hipY + 3).lineTo(legX + 1, hipY + 14).lineTo(legX - 1, hipY + 20)
      .stroke({ color: COL_CORE_GLOW, width: 1.2, alpha: 0.4 });

    // knee — angular crystal joint
    g.moveTo(legX - 6, kneeY - 2 + offset * 0.4)
      .lineTo(legX, kneeY - 6 + offset * 0.4)
      .lineTo(legX + 6, kneeY - 2 + offset * 0.4)
      .lineTo(legX, kneeY + 4 + offset * 0.4)
      .closePath()
      .fill({ color: COL_ICE });
    g.circle(legX, kneeY + offset * 0.4, 3)
      .fill({ color: COL_CORE_GLOW, alpha: 0.3 });

    // shin
    const footY = kneeY + 22;
    g.roundRect(legX - 7, kneeY + offset * 0.4, 14, footY - kneeY, 2)
      .fill({ color: COL_ICE_DK, alpha: 0.85 });
    g.roundRect(legX - 7, kneeY + offset * 0.4, 14, footY - kneeY, 2)
      .stroke({ color: COL_ICE, width: 0.6 });

    // frost vein on shin
    g.moveTo(legX + 2, kneeY + 6).lineTo(legX - 1, kneeY + 16)
      .stroke({ color: COL_CORE_GLOW, width: 1, alpha: 0.35 });

    // foot — broad ice block with frost
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 7, 2)
      .fill({ color: COL_ICE });
    g.roundRect(legX - 10, footY + offset * 0.5, 20, 7, 2)
      .stroke({ color: COL_ICE_DK, width: 0.8 });

    // icicles hanging under knee
    for (let i = -1; i <= 1; i++) {
      const ix = legX + i * 4;
      const ilen = 4 + Math.abs(i) * 2;
      drawCrystal(g, ix, kneeY + 3, Math.PI * 0.5, ilen, 1.5, 0.5);
    }
  }
}

/** Draw the crystalline torso with frozen veins and ice formations */
function drawTorso(
  g: Graphics,
  cx: number, torsoY: number,
  breathe: number,
): void {
  const tw = 30 + breathe * 0.5;
  const th = 36;

  // outer shell (ice)
  g.roundRect(cx - tw - 2, torsoY - th / 2 - 2, (tw + 2) * 2, th + 4, 6)
    .fill({ color: COL_ICE_DK, alpha: 0.9 });

  // main torso body
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .fill({ color: COL_ICE, alpha: 0.85 });
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 5)
    .stroke({ color: COL_ICE_LT, width: 0.8 });

  // chest plate — angular crystal facets
  g.moveTo(cx - 20, torsoY - 14)
    .lineTo(cx, torsoY - 18)
    .lineTo(cx + 20, torsoY - 14)
    .lineTo(cx + 16, torsoY + 8)
    .lineTo(cx, torsoY + 12)
    .lineTo(cx - 16, torsoY + 8)
    .closePath()
    .fill({ color: COL_ICE_DEEP, alpha: 0.6 });
  g.moveTo(cx - 20, torsoY - 14)
    .lineTo(cx, torsoY - 18)
    .lineTo(cx + 20, torsoY - 14)
    .lineTo(cx + 16, torsoY + 8)
    .lineTo(cx, torsoY + 12)
    .lineTo(cx - 16, torsoY + 8)
    .closePath()
    .stroke({ color: COL_ICE_LT, width: 0.6 });

  // frozen core glow visible through chest
  g.ellipse(cx, torsoY - 2, 10 + breathe * 0.5, 12 + breathe * 0.5)
    .fill({ color: COL_CORE_GLOW, alpha: 0.15 + breathe * 0.01 });
  g.ellipse(cx, torsoY - 2, 5 + breathe * 0.3, 6 + breathe * 0.3)
    .fill({ color: COL_CORE_BRIGHT, alpha: 0.1 + breathe * 0.01 });

  // frost veins radiating from core
  const veins = [
    [cx, torsoY - 2, cx - 16, torsoY - 12],
    [cx, torsoY - 2, cx + 14, torsoY - 10],
    [cx, torsoY - 2, cx - 12, torsoY + 10],
    [cx, torsoY - 2, cx + 12, torsoY + 8],
    [cx, torsoY - 2, cx - 8, torsoY - 16],
    [cx, torsoY - 2, cx + 6, torsoY + 14],
  ];
  for (const [x1, y1, x2, y2] of veins) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_CORE_GLOW, width: 1, alpha: 0.3 });
  }

  // facet highlight lines
  g.moveTo(cx - 8, torsoY - 16).lineTo(cx - 16, torsoY + 6)
    .stroke({ color: COL_ICE_LT, width: 0.5, alpha: 0.4 });
  g.moveTo(cx + 10, torsoY - 15).lineTo(cx + 14, torsoY + 4)
    .stroke({ color: COL_ICE_LT, width: 0.5, alpha: 0.4 });

  // shoulder crystal formations
  for (const side of [-1, 1] as const) {
    // large shoulder crystal cluster
    const sx = cx + side * 28;
    const sy = torsoY - 12;

    // base crystal mass
    g.ellipse(sx, sy, 12, 10).fill({ color: COL_ICE_DK });
    g.ellipse(sx, sy, 12, 10).stroke({ color: COL_ICE, width: 0.8 });

    // protruding crystal spikes
    drawCrystal(g, sx, sy - 4, -Math.PI * 0.5 + side * 0.3, 18, 4);
    drawCrystal(g, sx + side * 4, sy - 2, -Math.PI * 0.4 + side * 0.5, 14, 3);
    drawCrystal(g, sx - side * 2, sy - 6, -Math.PI * 0.55 + side * 0.15, 12, 3);

    // small crystals
    drawCrystal(g, sx + side * 6, sy + 2, side * 0.8, 8, 2, 0.7);
  }

  // waist / belt band
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .fill({ color: COL_ICE_DK });
  g.roundRect(cx - 24, torsoY + 12, 48, 8, 2)
    .stroke({ color: COL_ICE, width: 0.8 });
  // center gem
  g.ellipse(cx, torsoY + 16, 4, 3).fill({ color: COL_CORE_GLOW });
  g.ellipse(cx, torsoY + 16, 2, 1.5).fill({ color: COL_CORE_BRIGHT });
}

/** Draw the head — angular crystal skull with glowing eyes and ice crown */
function drawHead(
  g: Graphics,
  cx: number, headY: number,
  glowPhase: number,
): void {
  // neck
  g.roundRect(cx - 7, headY + 10, 14, 10, 3)
    .fill({ color: COL_ICE_DK });
  g.moveTo(cx, headY + 12).lineTo(cx + 1, headY + 18)
    .stroke({ color: COL_CORE_GLOW, width: 1, alpha: 0.3 });

  // skull — angular/faceted
  g.moveTo(cx - 14, headY + 6)
    .lineTo(cx - 12, headY - 8)
    .lineTo(cx - 6, headY - 14)
    .lineTo(cx + 6, headY - 14)
    .lineTo(cx + 12, headY - 8)
    .lineTo(cx + 14, headY + 6)
    .lineTo(cx + 8, headY + 12)
    .lineTo(cx - 8, headY + 12)
    .closePath()
    .fill({ color: COL_ICE });
  g.moveTo(cx - 14, headY + 6)
    .lineTo(cx - 12, headY - 8)
    .lineTo(cx - 6, headY - 14)
    .lineTo(cx + 6, headY - 14)
    .lineTo(cx + 12, headY - 8)
    .lineTo(cx + 14, headY + 6)
    .lineTo(cx + 8, headY + 12)
    .lineTo(cx - 8, headY + 12)
    .closePath()
    .stroke({ color: COL_ICE_LT, width: 0.6 });

  // facet lines on face
  g.moveTo(cx, headY - 14).lineTo(cx, headY + 6)
    .stroke({ color: COL_ICE_DK, width: 0.5, alpha: 0.5 });
  g.moveTo(cx - 12, headY - 8).lineTo(cx, headY)
    .stroke({ color: COL_ICE_DK, width: 0.4, alpha: 0.4 });
  g.moveTo(cx + 12, headY - 8).lineTo(cx, headY)
    .stroke({ color: COL_ICE_DK, width: 0.4, alpha: 0.4 });

  // brow ridge (angular)
  g.moveTo(cx - 12, headY - 6)
    .lineTo(cx, headY - 9)
    .lineTo(cx + 12, headY - 6)
    .stroke({ color: COL_ICE_DEEP, width: 2 });

  // eyes — deep glacial glow
  const glowPulse = 0.8 + Math.sin(glowPhase * 3) * 0.2;
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 6;
    const ey = headY - 3;
    // eye socket
    g.ellipse(ex, ey, 5, 3).fill({ color: COL_ICE_DEEP });
    // glow
    g.ellipse(ex, ey, 4, 2.5).fill({ color: COL_EYE, alpha: 0.7 * glowPulse });
    g.ellipse(ex, ey, 2.5, 1.5).fill({ color: COL_EYE_BRIGHT, alpha: 0.5 * glowPulse });
    // glow halo
    g.ellipse(ex, ey, 7, 4).fill({ color: COL_EYE, alpha: 0.08 * glowPulse });
  }

  // mouth — faint frost emanation
  g.moveTo(cx - 5, headY + 6).lineTo(cx + 5, headY + 6)
    .stroke({ color: COL_ICE_DEEP, width: 1.5 });
  g.moveTo(cx - 3, headY + 6).lineTo(cx + 3, headY + 6)
    .stroke({ color: COL_FROST, width: 0.6, alpha: 0.5 });

  // ice crown — tall crystal spires rising from top of head
  const crownCrystals = [
    { dx: 0,   angle: -Math.PI / 2,       len: 24, w: 5 },
    { dx: -8,  angle: -Math.PI / 2 - 0.2, len: 18, w: 4 },
    { dx: 8,   angle: -Math.PI / 2 + 0.2, len: 19, w: 4 },
    { dx: -14, angle: -Math.PI / 2 - 0.4, len: 13, w: 3 },
    { dx: 14,  angle: -Math.PI / 2 + 0.4, len: 14, w: 3 },
    { dx: -5,  angle: -Math.PI / 2 - 0.1, len: 20, w: 3.5 },
    { dx: 5,   angle: -Math.PI / 2 + 0.1, len: 21, w: 3.5 },
  ];
  for (const c of crownCrystals) {
    drawCrystal(g, cx + c.dx, headY - 12, c.angle, c.len, c.w);
  }
}

/** Draw an arm made of translucent ice */
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

  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_ICE_DK, width: 10 });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_CORE_GLOW, width: 1.5, alpha: 0.3 });

  // elbow crystal joint
  g.circle(elbowX, elbowY, 6).fill({ color: COL_ICE });
  g.circle(elbowX, elbowY, 3).fill({ color: COL_CORE_GLOW, alpha: 0.3 });
  // small icicle at elbow
  drawCrystal(g, elbowX, elbowY, Math.PI * 0.5 + side * 0.3, 6, 2, 0.5);

  // forearm
  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_ICE_DK, width: 9 });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_CORE_GLOW, width: 1.2, alpha: 0.25 });

  // icicles growing from forearm
  const midX = (elbowX + handX) / 2;
  const midY = (elbowY + handY) / 2;
  drawCrystal(g, midX, midY, -Math.PI * 0.5 + side * 0.4, 8, 2, 0.6);

  // fist
  g.circle(handX, handY, 7).fill({ color: COL_ICE });
  g.circle(handX, handY, 7).stroke({ color: COL_ICE_DK, width: 0.8 });
  g.circle(handX, handY, 3).fill({ color: COL_CORE_GLOW, alpha: 0.15 });
}

/** Draw the frozen ice spear weapon */
function drawIceSpear(
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

  // shaft — ice rod
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_ICE_DK, width: 4 });
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_ICE, width: 2 });
  // internal glow line
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_CORE_GLOW, width: 0.8, alpha: 0.3 * intensity });

  // blade head — elongated crystal
  const headStart = 0.65;
  const headX = lerp(baseX, tipX, headStart);
  const headY2 = lerp(baseY, tipY, headStart);
  const bladeW = 6 * intensity;

  g.moveTo(headX + perpX * bladeW, headY2 + perpY * bladeW)
    .lineTo(tipX, tipY)
    .lineTo(headX - perpX * bladeW, headY2 - perpY * bladeW)
    .closePath()
    .fill({ color: COL_CRYSTAL, alpha: 0.8 * intensity });
  g.moveTo(headX + perpX * bladeW, headY2 + perpY * bladeW)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_EDGE, width: 0.8 });
  g.moveTo(headX - perpX * bladeW, headY2 - perpY * bladeW)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CRYSTAL_EDGE, width: 0.8 });

  // tip shine
  g.circle(tipX, tipY, 2).fill({ color: COL_CRYSTAL_SHINE, alpha: 0.5 * intensity });

  // frost emanation from blade
  if (intensity > 0.5) {
    for (let i = 0; i < 3; i++) {
      const ft = 0.7 + i * 0.1;
      const fx = lerp(baseX, tipX, ft);
      const fy = lerp(baseY, tipY, ft);
      g.circle(fx + perpX * (8 + i * 3), fy + perpY * (8 + i * 3), 2 - i * 0.5)
        .fill({ color: COL_FROST, alpha: 0.2 * intensity });
    }
  }
}

/** Draw frost vapor / cold mist particles */
function drawFrostVapor(
  g: Graphics,
  cx: number, baseY: number,
  phase: number,
  count: number,
  spread: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 97.3 + phase * 30;
    const px = cx + Math.sin(seed * 0.13) * spread;
    const py = baseY - (seed * 0.12 % 50) - phase * 10;
    const size = 2 + (i % 4) * 1.2;
    const a = alpha * (1 - ((seed * 0.12 % 50) / 50)) * 0.5;
    if (py > baseY - 70 && py < baseY + 5) {
      g.circle(px, py, size).fill({ color: COL_VAPOR, alpha: clamp01(a) });
    }
  }
}

/** Draw falling ice shard particles */
function drawIceShards(
  g: Graphics,
  cx: number, cy: number,
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
    const size = 2 + (i % 3);
    const rot = angle * 2;
    // small diamond shard
    g.moveTo(sx, sy - size)
      .lineTo(sx + size * 0.5 * Math.cos(rot), sy)
      .lineTo(sx, sy + size * 0.7)
      .lineTo(sx - size * 0.5 * Math.cos(rot), sy)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: alpha * 0.6 });
  }
}

// ---------------------------------------------------------------------------
// State frame generators
// ---------------------------------------------------------------------------

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const glowPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + breathe;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY);
  drawFrostVapor(g, CX, GY, glowPhase * 0.2, 10, 30, 0.4);

  drawLegs(g, CX, torsoY + 20, breathe * 0.5);
  drawTorso(g, CX, torsoY, breathe);

  // arms at rest
  drawArm(g, CX - 28, torsoY - 8, 0.4, 0.8, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.4, 0.8, 1);

  // right hand holds ice spear
  const handX = CX + 28 + Math.cos(0.8) * 20;
  const handY = torsoY - 8 + Math.sin(0.4) * 22 + Math.sin(0.8) * 20;
  drawIceSpear(g, handX, handY, -0.6, 36, 0.7 + breathe * 0.03);

  drawHead(g, CX, headY + breathe * 0.3, glowPhase);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 3;
  const stride = Math.sin(walk) * 5;
  const glowPhase = t * Math.PI * 2;

  const torsoY = GY - 58 + bob;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);

  // frost trail on ground behind
  for (let i = 0; i < 4; i++) {
    const frostX = CX + 15 + i * 8;
    g.circle(frostX, GY + 3, 5 - i).fill({ color: COL_FROST, alpha: 0.12 - i * 0.03 });
  }

  drawFrostVapor(g, CX, GY, glowPhase * 0.3, 14, 35, 0.5);

  drawLegs(g, CX, torsoY + 20, stride);
  drawTorso(g, CX, torsoY, 0);

  // arms swing
  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 28, torsoY - 8, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 28, torsoY - 8, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);

  // spear carried at side
  const sHandX = CX + 28 + Math.cos(0.7 - armSwing * 0.5) * 20;
  const sHandY = torsoY + 14 + Math.sin(0.7 - armSwing * 0.5) * 20;
  drawIceSpear(g, sHandX, sHandY, -0.5 - armSwing * 0.2, 36, 0.7);

  drawHead(g, CX, headY + bob * 0.3, glowPhase);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const glowPhase = frame * 0.9;

  // windup (0-0.3), thrust (0.3-0.55), shatter impact (0.55-0.75), retract (0.75-1)
  let spearAngle = -0.6;
  let spearLen = 36;
  let spearIntensity = 0.7;
  let lunge = 0;
  let armRaise = 0;
  let impactShatter = 0;

  if (t < 0.3) {
    const lt = t / 0.3;
    armRaise = lt;
    spearAngle = lerp(-0.6, -1.8, lt);
    spearIntensity = lerp(0.7, 1, lt);
  } else if (t < 0.55) {
    const lt = (t - 0.3) / 0.25;
    armRaise = 1 - lt * 0.6;
    spearAngle = lerp(-1.8, 0.1, lt);
    lunge = lt * 10;
    spearLen = lerp(36, 42, lt);
    spearIntensity = 1;
  } else if (t < 0.75) {
    const lt = (t - 0.55) / 0.2;
    armRaise = 0.4;
    spearAngle = 0.1;
    lunge = 10;
    spearLen = 42;
    spearIntensity = 1;
    impactShatter = 1 - lt;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.4, 0, lt);
    spearAngle = lerp(0.1, -0.6, lt);
    lunge = lerp(10, 0, lt);
    spearLen = lerp(42, 36, lt);
    spearIntensity = lerp(1, 0.7, lt);
  }

  const torsoY = GY - 58;
  const headY = torsoY - 32;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawFrostVapor(g, attackCX, GY, glowPhase * 0.3, 12, 30, 0.5);

  drawLegs(g, attackCX, torsoY + 20, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  // left arm braces
  drawArm(g, attackCX - 28, torsoY - 8, 0.3, 0.6, -1);

  // right arm thrusts spear
  const thrustElbow = 0.2 - armRaise * 1.0;
  const thrustFore = spearAngle + 0.3;
  drawArm(g, attackCX + 28, torsoY - 8, thrustElbow, thrustFore, 1);

  const sHandX = attackCX + 28 + Math.cos(thrustFore) * 20;
  const sHandY = torsoY - 8 + Math.sin(thrustElbow) * 22 + Math.sin(thrustFore) * 20;
  drawIceSpear(g, sHandX, sHandY, spearAngle, spearLen, spearIntensity);

  // ice shatter on impact
  if (impactShatter > 0.3) {
    const impX = sHandX + Math.cos(spearAngle) * spearLen;
    const impY = sHandY + Math.sin(spearAngle) * spearLen;
    // crystal shatter burst
    drawIceShards(g, impX, impY, 8, 16 * impactShatter, impactShatter, t * 5);
    // frost flash
    g.circle(impX, impY, 10 * impactShatter)
      .fill({ color: COL_FROST, alpha: 0.3 * impactShatter });
    g.circle(impX, impY, 16 * impactShatter)
      .fill({ color: COL_CORE_GLOW, alpha: 0.12 * impactShatter });
  }

  drawHead(g, attackCX, headY, glowPhase);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const glowPhase = frame * 0.8;

  // blizzard: arms raise (0-0.3), vortex forms (0.3-0.5), blizzard expands (0.5-0.85), subsides (0.85-1)
  let armRaise = 0;
  let vortexProgress = 0;
  let blizzardProgress = 0;
  let subsideFactor = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.5) {
    armRaise = 1;
    vortexProgress = (t - 0.3) / 0.2;
  } else if (t < 0.85) {
    armRaise = 1 - (t - 0.5) * 0.4;
    vortexProgress = 1;
    blizzardProgress = (t - 0.5) / 0.35;
  } else {
    armRaise = lerp(0.7, 0, (t - 0.85) / 0.15);
    vortexProgress = 1 - (t - 0.85) / 0.15;
    blizzardProgress = 1 - (t - 0.85) / 0.15;
    subsideFactor = (t - 0.85) / 0.15;
  }

  const torsoY = GY - 58 - armRaise * 4;
  const headY = torsoY - 32;

  drawShadow(g, CX, GY, 1 + blizzardProgress * 0.2);

  // frost ring on ground
  if (vortexProgress > 0) {
    for (let r = 0; r < 3; r++) {
      const ringT = clamp01(vortexProgress - r * 0.15);
      if (ringT <= 0) continue;
      const radius = 10 + ringT * 30 + blizzardProgress * 15;
      g.ellipse(CX, GY + 2, radius, radius * 0.25)
        .stroke({ color: COL_FROST_DK, width: 2 - r * 0.5, alpha: (1 - ringT * 0.5) * 0.4 });
    }
  }

  // blizzard vortex — swirling ice shards
  if (blizzardProgress > 0) {
    for (let ring = 0; ring < 3; ring++) {
      const ringDist = 25 + ring * 16;
      const shardCount = 6 + ring * 2;
      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2 + glowPhase * (3 - ring * 0.5) + ring;
        const dist = ringDist * blizzardProgress;
        const sx = CX + Math.cos(angle) * dist;
        const sy = GY - 40 + Math.sin(angle) * dist * 0.3;
        const shardAlpha = blizzardProgress * (1 - subsideFactor) * 0.6;

        // ice shard
        const size = 3 + ring;
        g.moveTo(sx, sy - size)
          .lineTo(sx + size * 0.4, sy)
          .lineTo(sx, sy + size * 0.6)
          .lineTo(sx - size * 0.4, sy)
          .closePath()
          .fill({ color: COL_BLIZZARD, alpha: shardAlpha });
      }
    }

    // snowflake particles in vortex
    for (let i = 0; i < 12; i++) {
      const angle = i * 0.524 + glowPhase * 2;
      const dist = 15 + blizzardProgress * 35 + i * 3;
      const px = CX + Math.cos(angle) * dist;
      const py = GY - 35 + Math.sin(angle) * dist * 0.25 - i * 2;
      const sa = blizzardProgress * (1 - subsideFactor) * 0.4;
      g.circle(px, py, 1.5).fill({ color: COL_SNOW, alpha: sa });
    }
  }

  drawLegs(g, CX, torsoY + 20, 0);
  drawTorso(g, CX, torsoY, armRaise * 2);

  // both arms raised channeling blizzard
  const raiseAngle = -0.5 - armRaise * 1.2;
  drawArm(g, CX - 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 28, torsoY - 8, raiseAngle, raiseAngle + 0.3, 1);

  // energy ball between raised hands during channel
  if (armRaise > 0.5) {
    const orbY = torsoY - 30 - armRaise * 15;
    const orbSize = 8 + blizzardProgress * 6;
    g.circle(CX, orbY, orbSize).fill({ color: COL_CORE_GLOW, alpha: 0.2 * armRaise });
    g.circle(CX, orbY, orbSize * 0.6).fill({ color: COL_CORE_BRIGHT, alpha: 0.15 * armRaise });
    g.circle(CX, orbY, orbSize * 0.3).fill({ color: COL_CRYSTAL_SHINE, alpha: 0.2 * armRaise });
  }

  drawHead(g, CX, headY, glowPhase);
  drawFrostVapor(g, CX, GY, glowPhase * 0.3, 15 + blizzardProgress * 10, 40, 0.4 + blizzardProgress * 0.3);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // cracking (0-0.4), shattering (0.4-0.7), dispersal (0.7-1)
  const fade = 1 - t * 0.5;
  const crackProgress = clamp01(t / 0.4);
  const shatterProgress = clamp01((t - 0.4) / 0.3);
  const disperseProgress = clamp01((t - 0.7) / 0.3);

  g.alpha = fade;

  const torsoY = GY - 58 + shatterProgress * 10;
  const headY = torsoY - 32;
  const tilt = shatterProgress * 5;

  drawShadow(g, CX, GY, 1 - t * 0.4);

  if (shatterProgress < 0.9) {
    drawLegs(g, CX + tilt, torsoY + 20, shatterProgress * 4);

    // torso — crack lines appear then body splits
    g.roundRect(CX + tilt - 30, torsoY - 18, 60, 36, 5)
      .fill({ color: COL_ICE, alpha: 0.85 * (1 - shatterProgress * 0.5) });

    // spreading cracks
    if (crackProgress > 0) {
      const crackLen = crackProgress * 20;
      const crackPairs = [
        [0, -14, 3, 0], [-5, -10, -12, 4], [6, -8, 14, 6],
        [-3, 4, -10, 14], [4, 6, 12, 12],
      ];
      for (const [x1, y1, x2, y2] of crackPairs) {
        g.moveTo(CX + tilt + x1, torsoY + y1)
          .lineTo(CX + tilt + x2 * (crackLen / 20), torsoY + y2 * (crackLen / 20))
          .stroke({ color: COL_ICE_LT, width: 1.5 * crackProgress });
      }
    }

    // core glow fading
    g.ellipse(CX + tilt, torsoY - 2, 8, 10)
      .fill({ color: COL_CORE_GLOW, alpha: 0.15 * (1 - crackProgress * 0.8) });

    drawArm(g, CX + tilt - 28, torsoY - 8, 0.6 + shatterProgress * 0.5, 1.2 + shatterProgress * 0.3, -1);
    drawArm(g, CX + tilt + 28, torsoY - 8, 0.6 + shatterProgress * 0.5, 1.2 + shatterProgress * 0.3, 1);
  }

  // head cracks and dims
  if (shatterProgress < 0.95) {
    g.moveTo(CX + tilt - 12, headY + 6)
      .lineTo(CX + tilt - 10, headY - 8)
      .lineTo(CX + tilt - 5, headY - 12)
      .lineTo(CX + tilt + 5, headY - 12)
      .lineTo(CX + tilt + 10, headY - 8)
      .lineTo(CX + tilt + 12, headY + 6)
      .closePath()
      .fill({ color: COL_ICE, alpha: 0.7 * (1 - shatterProgress) });

    // dimming eyes
    if (crackProgress < 0.9) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 6, headY - 3, 3, 2)
          .fill({ color: COL_EYE, alpha: 0.6 * (1 - crackProgress) });
      }
    }
  }

  // shattering ice shards flying outward
  if (shatterProgress > 0) {
    drawIceShards(g, CX, torsoY, Math.floor(12 + shatterProgress * 10),
      20 + shatterProgress * 40, (1 - disperseProgress) * 0.7, t * 4);
  }

  // falling crystal debris
  if (shatterProgress > 0.3) {
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + shatterProgress * 2;
      const dist = shatterProgress * 30 + i * 5;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.5 + shatterProgress * 20;
      drawCrystal(g, CX + dx, torsoY + dy, angle, 5 - i * 0.5, 2, (1 - disperseProgress) * 0.6);
    }
  }

  // frost mist settling
  if (t > 0.3) {
    for (let i = 0; i < 6; i++) {
      const mx = CX + Math.sin(i * 2 + t * 2) * 25;
      const my = GY - 10 + i * 3;
      g.circle(mx, my, 6 + i * 2).fill({ color: COL_VAPOR, alpha: 0.1 * (1 - t) });
    }
  }
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

export function generateIceElementalFrames(
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
