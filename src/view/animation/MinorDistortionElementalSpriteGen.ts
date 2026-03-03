// Procedural sprite generator for the Minor Distortion Elemental unit type.
//
// 96×96 px per frame (2×2 tiles). A smaller void-themed elemental:
//   • Dark purple-black body with glowing purple void fissures
//   • Swirling void energy crown on head
//   • Compact limbs with purple vein glow
//   • No weapon — fights with fists
//   • Void particles instead of embers

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
const COL_VOID_DARK = 0x1a0a2a;
const COL_VOID_DARK_LT = 0x2a1a3a;
const COL_VOID_MID = 0x331a40;
const COL_VEIN = 0x9944cc;
const COL_VEIN_BRIGHT = 0xbb66ee;
const COL_VEIN_DK = 0x6622aa;
const COL_CORE = 0xddaaff;
const COL_HIGHLIGHT = 0xeeccff;
const COL_TENDRIL_INNER = 0xddaaff;
const COL_TENDRIL_MID = 0x9944cc;
const COL_TENDRIL_OUTER = 0x6622aa;
const COL_EYE = 0xeeccff;
const COL_EYE_GLOW = 0xbb66ee;
const COL_SHADOW = 0x000000;
const COL_PINK = 0xff66cc;
const COL_FADED = 0x110818;

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
    .fill({ color: COL_VEIN, alpha: 0.06 });
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
      .fill({ color: COL_VOID_DARK });
    // void vein
    g.moveTo(legX - 1, hipY + 3 + offset * 0.2)
      .lineTo(legX + 1, hipY + 10 + offset * 0.2)
      .stroke({ color: COL_VEIN, width: 1.2 });

    // knee joint
    g.ellipse(legX, kneeY + offset * 0.4, 4, 3)
      .fill({ color: COL_VEIN_DK });
    g.ellipse(legX, kneeY + offset * 0.4, 2.5, 2)
      .fill({ color: COL_VEIN_BRIGHT, alpha: 0.6 });

    // shin
    const footY = kneeY + 14;
    g.roundRect(legX - 4, kneeY + offset * 0.4, 8, footY - kneeY, 2)
      .fill({ color: COL_VOID_DARK });

    // foot
    g.roundRect(legX - 6, footY + offset * 0.5, 12, 4, 2)
      .fill({ color: COL_VOID_MID });
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
    .fill({ color: COL_VOID_DARK });

  // main torso
  g.roundRect(cx - tw, torsoY - th / 2, tw * 2, th, 3)
    .fill({ color: COL_VOID_MID });

  // chest plate
  g.roundRect(cx - 14, torsoY - 8, 28, 16, 3)
    .fill({ color: COL_VOID_DARK });
  g.roundRect(cx - 14, torsoY - 8, 28, 16, 3)
    .stroke({ color: COL_VOID_DARK_LT, width: 0.7 });

  // central void crack
  g.moveTo(cx - 1, torsoY - 8)
    .quadraticCurveTo(cx + 2, torsoY, cx - 1, torsoY + 6)
    .stroke({ color: COL_VEIN, width: 1.8 });
  g.moveTo(cx - 1, torsoY - 8)
    .quadraticCurveTo(cx + 2, torsoY, cx - 1, torsoY + 6)
    .stroke({ color: COL_CORE, width: 0.7 });

  // diagonal distortion fissures
  g.moveTo(cx - 10, torsoY - 4).lineTo(cx - 4, torsoY + 3)
    .stroke({ color: COL_VEIN, width: 1.2 });
  g.moveTo(cx + 10, torsoY - 3).lineTo(cx + 5, torsoY + 4)
    .stroke({ color: COL_VEIN, width: 1.2 });

  // core glow
  g.ellipse(cx, torsoY, 4 + breathe * 0.3, 5 + breathe * 0.3)
    .fill({ color: COL_CORE, alpha: 0.12 + breathe * 0.02 });

  // shoulder pads
  for (const side of [-1, 1] as const) {
    g.ellipse(cx + side * 17, torsoY - 6, 7, 6)
      .fill({ color: COL_VOID_DARK });
    g.moveTo(cx + side * 13, torsoY - 8)
      .lineTo(cx + side * 19, torsoY - 4)
      .stroke({ color: COL_VEIN, width: 1 });
  }

  // belt
  g.roundRect(cx - 16, torsoY + 7, 32, 5, 2)
    .fill({ color: COL_VOID_DARK });
  g.ellipse(cx, torsoY + 9, 2.5, 2).fill({ color: COL_VEIN_BRIGHT });
}

function drawHead(
  g: Graphics,
  cx: number,
  headY: number,
  voidPhase: number,
): void {
  // neck
  g.roundRect(cx - 5, headY + 7, 10, 6, 2)
    .fill({ color: COL_VOID_DARK });

  // skull
  g.roundRect(cx - 9, headY - 6, 18, 14, 4)
    .fill({ color: COL_VOID_DARK });
  g.roundRect(cx - 9, headY - 6, 18, 14, 4)
    .stroke({ color: COL_VOID_DARK_LT, width: 0.5 });

  // brow ridge
  g.roundRect(cx - 10, headY - 4, 20, 4, 1)
    .fill({ color: COL_VOID_MID });

  // skull crack
  g.moveTo(cx - 2, headY - 6).lineTo(cx, headY)
    .stroke({ color: COL_VEIN, width: 0.8 });

  // jaw
  g.roundRect(cx - 6, headY + 3, 12, 5, 2)
    .fill({ color: COL_VOID_MID });
  g.moveTo(cx - 4, headY + 5).lineTo(cx + 4, headY + 5)
    .stroke({ color: COL_VEIN_DK, width: 1 });

  // eyes
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 4;
    const ey = headY - 1;
    g.ellipse(ex, ey, 3, 2).fill({ color: COL_SHADOW });
    g.ellipse(ex, ey, 2.5, 1.5).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
    g.ellipse(ex, ey, 1.5, 1).fill({ color: COL_EYE });
  }

  // void energy crown (swirling purple tendrils, smaller)
  const tendrils = [
    { dx: 0, h: 12, w: 5 },
    { dx: -5, h: 9, w: 4 },
    { dx: 5, h: 10, w: 4 },
    { dx: -3, h: 11, w: 3 },
    { dx: 3, h: 10, w: 3 },
  ];

  for (const f of tendrils) {
    const fx = cx + f.dx;
    const flicker = Math.sin(voidPhase * 4 + f.dx * 0.3) * 2;
    const tipY = headY - 6 - f.h - flicker;
    const baseY2 = headY - 4;

    g.moveTo(fx - f.w * 0.5, baseY2)
      .quadraticCurveTo(fx - f.w * 0.3, tipY + f.h * 0.4, fx + flicker * 0.3, tipY)
      .quadraticCurveTo(fx + f.w * 0.3, tipY + f.h * 0.4, fx + f.w * 0.5, baseY2)
      .closePath()
      .fill({ color: COL_TENDRIL_OUTER, alpha: 0.65 });

    g.moveTo(fx - f.w * 0.3, baseY2)
      .quadraticCurveTo(fx, tipY + f.h * 0.4, fx + flicker * 0.2, tipY + 2)
      .quadraticCurveTo(fx, tipY + f.h * 0.4, fx + f.w * 0.3, baseY2)
      .closePath()
      .fill({ color: COL_TENDRIL_MID, alpha: 0.7 });

    g.moveTo(fx - f.w * 0.15, baseY2)
      .quadraticCurveTo(fx, tipY + f.h * 0.5, fx, tipY + 4)
      .quadraticCurveTo(fx, tipY + f.h * 0.5, fx + f.w * 0.15, baseY2)
      .closePath()
      .fill({ color: COL_HIGHLIGHT, alpha: 0.5 });
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
    .stroke({ color: COL_VOID_DARK, width: 6 });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY)
    .stroke({ color: COL_VEIN, width: 1.2 });

  g.circle(elbowX, elbowY, 4).fill({ color: COL_VOID_DARK });
  g.circle(elbowX, elbowY, 2).fill({ color: COL_VEIN_DK, alpha: 0.6 });

  const handX = elbowX + Math.cos(forearmAngle) * foreLen * side;
  const handY = elbowY + Math.sin(forearmAngle) * foreLen;

  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_VOID_DARK, width: 5 });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY)
    .stroke({ color: COL_VEIN, width: 1 });

  // fist
  g.circle(handX, handY, 4).fill({ color: COL_VOID_MID });
  g.circle(handX, handY, 4).stroke({ color: COL_VOID_DARK, width: 0.7 });
}

function drawVoidParticles(
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
    const size = 0.6 + (i % 3) * 0.3;
    const a = alpha * (1 - ((seed * 0.15 % 40) / 40));
    if (py > baseY - 50 && py < baseY + 4) {
      const col =
        i % 3 === 0 ? COL_CORE : i % 3 === 1 ? COL_PINK : COL_TENDRIL_MID;
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
  const voidPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + breathe;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY);
  drawLegs(g, CX, torsoY + 12, breathe * 0.4);
  drawTorso(g, CX, torsoY, breathe);
  drawArm(g, CX - 17, torsoY - 4, 0.4, 0.8, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.4, 0.8, 1);
  drawHead(g, CX, headY + breathe * 0.3, voidPhase);
  drawVoidParticles(g, CX, GY, voidPhase * 0.3, 8, 20, 0.4);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 2;
  const stride = Math.sin(walk) * 4;
  const voidPhase = t * Math.PI * 2;

  const torsoY = GY - 38 + bob;
  const headY = torsoY - 20;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.01);
  drawLegs(g, CX, torsoY + 12, stride);
  drawTorso(g, CX, torsoY, 0);

  const armSwing = Math.sin(walk + Math.PI * 0.5) * 0.3;
  drawArm(g, CX - 17, torsoY - 4, 0.3 + armSwing, 0.7 + armSwing * 0.5, -1);
  drawArm(g, CX + 17, torsoY - 4, 0.3 - armSwing, 0.7 - armSwing * 0.5, 1);
  drawHead(g, CX, headY + bob * 0.3, voidPhase);
  drawVoidParticles(g, CX + 6, GY, voidPhase * 0.4, 10, 22, 0.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const voidPhase = frame * 0.9;

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

  // impact void burst
  if (impactFlash > 0.3) {
    const impX = attackCX + 17 + Math.cos(punchFore) * 12 + Math.cos(punchFore) * 12;
    const impY = torsoY - 4 + Math.sin(punchElbow) * 14 + Math.sin(punchFore) * 12;
    g.circle(impX, impY, 8 * impactFlash)
      .fill({ color: COL_TENDRIL_INNER, alpha: 0.4 * impactFlash });
    g.circle(impX, impY, 12 * impactFlash)
      .fill({ color: COL_TENDRIL_OUTER, alpha: 0.2 * impactFlash });
  }

  drawHead(g, attackCX, headY, voidPhase);
  drawVoidParticles(g, attackCX, GY, voidPhase * 0.3, 12, 22, 0.6 + impactFlash * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const voidPhase = frame * 0.8;

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

  // ground void cracks
  if (auraProgress > 0) {
    for (let i = 0; i < 5; i++) {
      const angle = -0.5 + i * 0.25;
      const len = auraProgress * 25;
      const startX = CX + Math.cos(angle) * 5;
      const endX = CX + Math.cos(angle) * len;
      const endY = GY + 2 + Math.sin(angle) * len * 0.15;
      g.moveTo(startX, GY + 2).lineTo(endX, endY)
        .stroke({ color: COL_VEIN, width: 1.5 * auraProgress });
    }
  }

  drawLegs(g, CX, torsoY + 12, 0);
  drawTorso(g, CX, torsoY, armRaise * 1.5);

  const raiseAngle = -0.5 - armRaise * 1.0;
  drawArm(g, CX - 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, -1);
  drawArm(g, CX + 17, torsoY - 4, raiseAngle, raiseAngle + 0.3, 1);

  drawHead(g, CX, headY, voidPhase);
  drawVoidParticles(g, CX, GY, voidPhase * 0.3, 16 + auraProgress * 8, 30, 0.5 + auraProgress * 0.3);

  // void ring expanding around caster
  if (auraProgress > 0.3) {
    const vortexAlpha = (auraProgress - 0.3) * 0.4;
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + voidPhase * 2;
      const dist = 22 + Math.sin(angle * 3) * 4;
      const fx = CX + Math.cos(angle) * dist;
      const fy = GY - 20 + Math.sin(angle) * 6;
      g.circle(fx, fy, 2 + Math.sin(angle * 2))
        .fill({ color: COL_TENDRIL_MID, alpha: vortexAlpha * 0.5 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.6;
  const voidPhase = frame * 0.3;
  const collapse = t;
  const crumble = clamp01((t - 0.6) / 0.4);

  g.alpha = fade;

  const torsoY = GY - 38 + crumble * 12;
  const headY = torsoY - 20 + crumble * 5;
  const tilt = crumble * 3;

  drawShadow(g, CX, GY, 1 - crumble * 0.5);

  if (crumble < 0.8) {
    drawLegs(g, CX + tilt, torsoY + 12, crumble * 2);

    g.roundRect(CX + tilt - 18, torsoY - 11, 36, 22, 3)
      .fill({ color: collapse > 0.5 ? COL_FADED : COL_VOID_MID });
    if (collapse < 0.7) {
      g.moveTo(CX + tilt, torsoY - 8)
        .lineTo(CX + tilt + 2, torsoY)
        .lineTo(CX + tilt - 1, torsoY + 6)
        .stroke({ color: COL_VEIN, width: 1.5, alpha: 1 - collapse * 1.3 });
    }

    drawArm(g, CX + tilt - 17, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, -1);
    drawArm(g, CX + tilt + 17, torsoY - 4, 0.6 + crumble * 0.4, 1.2 + crumble * 0.3, 1);
  }

  if (crumble < 0.9) {
    g.roundRect(CX + tilt - 9, headY - 6, 18, 14, 4)
      .fill({ color: collapse > 0.5 ? COL_FADED : COL_VOID_DARK });
    if (collapse < 0.8) {
      for (const side of [-1, 1] as const) {
        g.ellipse(CX + tilt + side * 4, headY - 1, 2, 1.5)
          .fill({ color: COL_EYE, alpha: 1 - collapse * 1.2 });
      }
    }
    // fading void tendrils on head
    if (collapse < 0.5) {
      const cnt = Math.max(1, Math.floor(5 * (1 - collapse * 2)));
      for (let i = 0; i < cnt; i++) {
        const dx = (i - cnt / 2) * 4;
        const h = (6 - collapse * 12) * (1 - Math.abs(i - cnt / 2) / cnt);
        if (h > 1) {
          g.moveTo(CX + tilt + dx - 1.5, headY - 6)
            .quadraticCurveTo(CX + tilt + dx, headY - 6 - h, CX + tilt + dx + 1.5, headY - 6)
            .closePath()
            .fill({ color: COL_TENDRIL_OUTER, alpha: 0.4 * (1 - collapse * 2) });
        }
      }
    }
  }

  // void collapses inward — purple mist wisps
  if (crumble > 0) {
    for (let i = 0; i < 6; i++) {
      const angle = i * 1.05 + crumble * 2;
      // particles pull inward (negative dist at higher crumble)
      const dist = (1 - crumble) * 16 + i * 3 * (1 - crumble);
      const cx2 = CX + Math.cos(angle) * dist;
      const cy = torsoY + Math.sin(angle) * dist * 0.5 + crumble * 10;
      const size = 2 - i * 0.2;
      if (size > 0.5) {
        g.rect(cx2 - size, cy - size, size * 2, size * 2)
          .fill({ color: COL_FADED, alpha: fade * (1 - crumble * 0.5) });
      }
    }
  }

  // purple mist wisps rising
  if (t > 0.2) {
    for (let i = 0; i < 3; i++) {
      const sy = torsoY - 14 - (t - 0.2) * 25 - i * 6;
      const sx = CX + Math.sin(i * 2.1 + t * 3) * 10;
      g.circle(sx, sy, 3 + i).fill({ color: COL_VEIN_DK, alpha: 0.12 * (1 - t) });
    }
  }

  drawVoidParticles(g, CX, GY, voidPhase, Math.max(0, 8 - Math.floor(t * 10)), 18, 0.3 * (1 - t));
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

export function generateMinorDistortionElementalFrames(
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
