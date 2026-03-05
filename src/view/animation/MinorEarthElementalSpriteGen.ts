// Procedural sprite generator for the Minor Earth Elemental unit type.
//
// 96×96 px per frame (2×2 tiles). A smaller stone elemental:
//   • Cracked granite body with crystal accents
//   • Smaller crystal growths on head
//   • Compact stone limbs with amber glow at joints
//   • No weapon — fights with fists
//   • Fewer dust particles, simpler details than T5 version

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
const COL_GRANITE       = 0x5a534a;
const COL_GRANITE_LT    = 0x7a7268;
const COL_GRANITE_DK    = 0x3a3430;
const COL_BOULDER       = 0x6b6358;
const COL_STONE_EDGE    = 0x484038;
const COL_CRYSTAL       = 0x88cc44;
const COL_CRYSTAL_BRIGHT= 0xbbee66;
const COL_CRYSTAL_DK    = 0x558822;
const COL_AMBER         = 0xcc9933;
const COL_AMBER_BRIGHT  = 0xeebb55;
const COL_DIRT          = 0x8b7355;
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
  g.ellipse(cx, cy + 3, 22 * scale, 7 * scale)
    .fill({ color: COL_SHADOW, alpha: 0.4 });
  g.ellipse(cx, cy + 2, 16 * scale, 4 * scale)
    .fill({ color: COL_DIRT, alpha: 0.08 });
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
    g.roundRect(legX - 6, hipY + offset * 0.3, 12, kneeY - hipY, 2)
      .fill({ color: COL_GRANITE_DK });
    // stone crack
    g.moveTo(legX - 1, hipY + 3 + offset * 0.2)
      .lineTo(legX + 1, hipY + 10 + offset * 0.2)
      .stroke({ color: COL_GRANITE_LT, width: 0.8 });

    // knee joint — amber
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_STONE_EDGE });
    g.ellipse(legX, kneeY + offset * 0.4, 2.5, 2)
      .fill({ color: COL_AMBER, alpha: 0.5 });

    // shin
    const footY = kneeY + 14;
    g.roundRect(legX - 5, kneeY + offset * 0.4, 10, footY - kneeY, 2)
      .fill({ color: COL_GRANITE_DK });

    // foot
    g.roundRect(legX - 7, footY + offset * 0.5, 14, 5, 2)
      .fill({ color: COL_BOULDER });
  }
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoY: number,
  breathe: number,
): void {
  const tw = 20 + breathe * 0.3;
  const th = 24;

  // outer shell
  g.roundRect(cx - tw - 1, torsoY - th / 2 - 1, (tw + 1) * 2, th + 2, 4)
    .fill({ color: COL_GRANITE_DK });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 3)
    .fill({ color: COL_BOULDER });

  // chest plate
  g.roundRect(cx - 15, torsoY - 9, 30, 18, 3)
    .fill({ color: COL_GRANITE });
  g.roundRect(cx - 15, torsoY - 9, 30, 18, 3)
    .stroke({ color: COL_GRANITE_LT, width: 0.7 });

  // central crack
  g.moveTo(cx - 1, torsoY - 9)
    .quadraticCurveTo(cx + 2, torsoY, cx - 1, torsoY + 7)
    .stroke({ color: COL_GRANITE_LT, width: 1.2 });

  // crystal vein
  g.moveTo(cx - 10, torsoY - 4)
    .quadraticCurveTo(cx, torsoY, cx + 8, torsoY - 5)
    .stroke({ color: COL_CRYSTAL, width: 1.8 });
  g.moveTo(cx - 10, torsoY - 4)
    .quadraticCurveTo(cx, torsoY, cx + 8, torsoY - 5)
    .stroke({ color: COL_CRYSTAL_BRIGHT, width: 0.7 });

  // core crystal glow
  g.ellipse(cx, torsoY, 4 + breathe * 0.3, 5 + breathe * 0.3)
    .fill({ color: COL_CRYSTAL, alpha: 0.1 + breathe * 0.02 });

  // shoulder pads
  for (const side of [-1, 1] as const) {
    g.ellipse(cx + side * 18, torsoY - 6, 8, 7)
      .fill({ color: COL_GRANITE });
    // small crystal on shoulder
    g.moveTo(cx + side * 18, torsoY - 14)
      .lineTo(cx + side * 16, torsoY - 8)
      .lineTo(cx + side * 20, torsoY - 8)
      .closePath()
      .fill({ color: COL_CRYSTAL_DK, alpha: 0.7 });
    g.moveTo(cx + side * 18, torsoY - 12)
      .lineTo(cx + side * 17, torsoY - 8)
      .lineTo(cx + side * 19, torsoY - 8)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: 0.5 });
  }

  // belt
  g.roundRect(cx - 17, torsoY + 8, 34, 6, 2)
    .fill({ color: COL_GRANITE_DK });
  g.ellipse(cx, torsoY + 11, 2.5, 2).fill({ color: COL_AMBER_BRIGHT });
}

function drawHead(
  g: Graphics,
  cx: number,
  headY: number,
  phase: number,
): void {
  // neck
  g.roundRect(cx - 6, headY + 7, 12, 7, 2)
    .fill({ color: COL_GRANITE_DK });

  // skull
  g.roundRect(cx - 10, headY - 7, 20, 16, 5)
    .fill({ color: COL_GRANITE });
  g.roundRect(cx - 10, headY - 7, 20, 16, 5)
    .stroke({ color: COL_STONE_EDGE, width: 0.5 });

  // brow ridge
  g.roundRect(cx - 11, headY - 5, 22, 5, 2)
    .fill({ color: COL_BOULDER });

  // skull crack
  g.moveTo(cx - 2, headY - 7).lineTo(cx, headY)
    .stroke({ color: COL_GRANITE_LT, width: 0.7 });

  // jaw
  g.roundRect(cx - 7, headY + 4, 14, 5, 2)
    .fill({ color: COL_BOULDER });
  g.moveTo(cx - 5, headY + 6).lineTo(cx + 5, headY + 6)
    .stroke({ color: COL_STONE_EDGE, width: 0.8 });

  // eyes — green crystal glow
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 5;
    const ey = headY - 1;
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_SHADOW });
    g.ellipse(ex, ey, 2.5, 1.5).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: COL_EYE });
  }

  // crystal crown (smaller, fewer shards)
  const crystals = [
    { dx: 0, h: 10, w: 4 },
    { dx: -5, h: 7, w: 3 },
    { dx: 5, h: 8, w: 3 },
    { dx: -3, h: 9, w: 2.5 },
    { dx: 3, h: 8, w: 2.5 },
  ];

  for (const c of crystals) {
    const fx = cx + c.dx;
    const shimmer = Math.sin(phase * 3 + c.dx * 0.4) * 0.8;
    const tipY = headY - 7 - c.h - shimmer;
    const baseY2 = headY - 5;

    g.moveTo(fx - c.w * 0.5, baseY2)
      .lineTo(fx + shimmer * 0.2, tipY)
      .lineTo(fx + c.w * 0.5, baseY2)
      .closePath()
      .fill({ color: COL_CRYSTAL_DK, alpha: 0.75 });

    g.moveTo(fx - c.w * 0.25, baseY2)
      .lineTo(fx, tipY + 2)
      .lineTo(fx + c.w * 0.25, baseY2)
      .closePath()
      .fill({ color: COL_CRYSTAL, alpha: 0.6 });
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
    .stroke({ color: COL_GRANITE_DK, width: 7 });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_GRANITE_LT, width: 1.2 });

  g.circle(elbowX, elbowY, 4).fill({ color: COL_GRANITE });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_AMBER, alpha: 0.4 });

  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_GRANITE_DK, width: 6 });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_GRANITE_LT, width: 1 });

  // fist
  g.circle(handX, handY, 5).fill({ color: COL_BOULDER });
  g.circle(handX, handY, 5).stroke({ color: COL_STONE_EDGE, width: 0.7 });
}

function drawDust(
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
    const py = baseY - (seed * 0.12 % 30) + phase * 8;
    const size = 0.6 + (i % 3) * 0.3;
    const a = alpha * (1 - ((seed * 0.12 % 30) / 30));
    if (py > baseY - 40 && py < baseY + 4) {
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
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;
  const phase = t * Math.PI * 2;

  const torsoY = GY - 40 + breathe;
  const headY = torsoY - 22;

  drawShadow(g, CX, GY);
  drawLegs(g, CX, torsoY + 12, breathe * 0.3);
  drawTorso(g, CX, torsoY, breathe);
  drawArm(g, CX - 18, torsoY - 4, 0.4, 0.8, -1);
  drawArm(g, CX + 18, torsoY - 4, 0.4, 0.8, 1);
  drawHead(g, CX, headY + breathe * 0.3, phase);
  drawDust(g, CX, GY, phase * 0.2, 4, 16, 0.25);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 2;
  const stride = Math.sin(walk) * 4;
  const phase = t * Math.PI * 2;

  const torsoY = GY - 40 + bob;
  const headY = torsoY - 22;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawLegs(g, CX, torsoY + 12, stride);
  drawTorso(g, CX, torsoY, 0);

  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 18, torsoY - 4, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 18, torsoY - 4, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);
  drawHead(g, CX, headY + bob * 0.3, phase);
  drawDust(g, CX + 5, GY, phase * 0.3, 8, 18, 0.4);
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
    lunge = lt * 5;
  } else if (t < 0.75) {
    armRaise = 0.5;
    lunge = 5;
    impactShake = 1 - (t - 0.55) / 0.2;
  } else {
    const lt = (t - 0.75) / 0.25;
    armRaise = lerp(0.5, 0, lt);
    lunge = lerp(5, 0, lt);
  }

  const torsoY = GY - 40;
  const headY = torsoY - 22;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY);
  drawLegs(g, attackCX, torsoY + 12, lunge * 0.3);
  drawTorso(g, attackCX, torsoY, 0);

  drawArm(g, attackCX - 18, torsoY - 4, 0.3, 0.6, -1);

  // punching arm
  const punchElbow = 0.2 - armRaise * 1.0;
  const punchFore = lerp(0.8, -0.2, armRaise);
  drawArm(g, attackCX + 18, torsoY - 4, punchElbow, punchFore, 1);

  // impact rock burst
  if (impactShake > 0.3) {
    const impX = attackCX + 18 + Math.cos(punchFore) * 12 + Math.cos(punchFore) * 12;
    const impY = torsoY - 4 + Math.sin(punchElbow) * 14 + Math.sin(punchFore) * 12;
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.26 + t * 2;
      const dist = 6 + impactShake * 8;
      g.circle(impX + Math.cos(angle) * dist, impY + Math.sin(angle) * dist, 1.5)
        .fill({ color: COL_DIRT, alpha: impactShake * 0.5 });
    }
    g.ellipse(impX, impY + 3, 10 * impactShake, 4 * impactShake)
      .fill({ color: COL_DUST, alpha: 0.2 * impactShake });
  }

  drawHead(g, attackCX, headY, phase);
  drawDust(g, attackCX, GY, phase * 0.3, 10, 18, 0.4 + impactShake * 0.2);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const phase = frame * 0.8;

  let armRaise = 0;
  let waveProgress = 0;

  if (t < 0.3) {
    armRaise = t / 0.3;
  } else if (t < 0.7) {
    armRaise = 1;
    waveProgress = (t - 0.3) / 0.4;
  } else {
    armRaise = lerp(1, 0, (t - 0.7) / 0.3);
    waveProgress = lerp(1, 0, (t - 0.7) / 0.3);
  }

  const torsoY = GY - 40 - armRaise * 2;
  const headY = torsoY - 22;

  drawShadow(g, CX, GY, 1 + waveProgress * 0.2);

  // ground cracks
  if (waveProgress > 0) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const len = waveProgress * 28;
      const endX = CX + Math.cos(angle) * len;
      const endY = GY + 2 + Math.sin(angle) * len * 0.12;
      g.moveTo(CX, GY + 2).lineTo(endX, endY)
        .stroke({ color: COL_GRANITE_LT, width: 1.5 * waveProgress });
    }
  }

  // shockwave ring
  if (waveProgress > 0.3) {
    const radius = (waveProgress - 0.3) * 40;
    g.circle(CX, GY, radius)
      .stroke({ color: COL_DIRT, width: 2, alpha: 0.3 * (1 - waveProgress) });
  }

  drawLegs(g, CX, torsoY + 12, 0);
  drawTorso(g, CX, torsoY, armRaise * 1.5);

  const raiseAngle = -0.5 - armRaise * 1.0;
  drawArm(g, CX - 18, torsoY - 4, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 18, torsoY - 4, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, phase);
  drawDust(g, CX, GY, phase * 0.3, 12 + waveProgress * 6, 25, 0.4 + waveProgress * 0.3);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.5;
  const phase = frame * 0.3;
  const crumble = clamp01((t - 0.4) / 0.6);

  g.alpha = fade;

  const torsoY = GY - 40 + crumble * 14;
  const headY = torsoY - 22 + crumble * 6;
  const tilt = crumble * 3;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 12, crumble * 2);

    g.roundRect(CX + tilt - 20, torsoY - 12, 40, 24, 3)
      .fill({ color: crumble > 0.4 ? COL_CRUMBLE : COL_BOULDER });
    if (crumble < 0.5) {
      g.moveTo(CX + tilt, torsoY - 9)
        .lineTo(CX + tilt + 2, torsoY)
        .lineTo(CX + tilt - 1, torsoY + 7)
        .stroke({ color: COL_GRANITE_LT, width: 1.2, alpha: 1 - crumble * 2 });
    }

    drawArm(g, CX + tilt - 18, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 18, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, 1);
  }

  if (crumble < 0.9) {
    g.roundRect(CX + tilt - 10, headY - 7, 20, 16, 5)
      .fill({ color: crumble > 0.5 ? COL_CRUMBLE : COL_GRANITE });
    if (crumble < 0.6) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 5, headY - 1, 2, 1.5)
          .fill({ color: COL_EYE, alpha: 1 - crumble * 1.5 });
      }
    }
  }

  // falling stone debris
  if (crumble > 0) {
    for (let i = 0; i < 7; i++) {
      const angle = i * 0.9 + crumble * 1.5;
      const dist = crumble * 18 + i * 3;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.5 + crumble * 12;
      const size = 2.5 - i * 0.3;
      if (size > 0.5) {
        g.rect(cx2 - size, cy - size, size * 2, size * 2)
          .fill({ color: COL_CRUMBLE, alpha: fade * (1 - crumble * 0.5) });
      }
    }
  }

  // dust cloud
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const sy = torsoY - 8 + (t - 0.3) * 8 + i * 5;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 12;
      g.circle(sx, sy, 3 + i).fill({ color: COL_DUST, alpha: 0.1 * (1 - t) });
    }
  }

  drawDust(g, CX, GY, phase, Math.max(0, 6 - Math.floor(t * 8)), 14, 0.3 * (1 - t));
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

export function generateMinorEarthElementalFrames(
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
