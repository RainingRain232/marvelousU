// Procedural sprite generator for the Giant Frog unit type.
//
// Draws a bulky giant swamp frog at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Large rounded body with mottled green skin
//   • Warty texture with darker splotches
//   • Prominent bulging eyes on top of head with yellow-green irises
//   • Wide mouth with visible jaw line
//   • Pale belly / throat pouch that inflates
//   • Muscular haunches (back legs) for hopping
//   • Webbed front feet
//   • Long sticky tongue for attack
//   • Throat sac vibrates during cast
//   • Wet/slimy sheen highlights

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — swamp frog
const COL_BODY = 0x4a7a3a; // dark green
const COL_BODY_HI = 0x5e9a4e; // lighter highlight
const COL_BODY_DK = 0x385a2a; // shadow
const COL_BODY_SPOT = 0x3a5e2a; // mottling

const COL_BELLY = 0x9aba82; // pale yellow-green
const COL_BELLY_HI = 0xb0cc98;

const COL_EYE_BULGE = 0x5a8a4a; // eye mound
const COL_EYE_WHITE = 0xdde8aa; // yellow-green eye
const COL_EYE_IRIS = 0x88aa22;
const COL_EYE_PUPIL = 0x111111;
const COL_EYE_SHINE = 0xffffff;

const COL_MOUTH = 0x2a1a1a; // dark mouth interior
const COL_JAW = 0x3a6a2a; // jaw line

const COL_TONGUE = 0xcc4444;
const COL_TONGUE_TIP = 0xee6666;

const COL_WART = 0x3e5e2e; // wart bumps
const COL_SLIME = 0x88cc77; // wet sheen

const COL_LEG = 0x3e6e2e;
const COL_LEG_DK = 0x2e5a20;
const COL_FOOT = 0x4a7a3a;
const COL_WEBBING = 0x6a9a5a; // toe webbing

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 16,
  h = 4,
  alpha = 0.25,
): void {
  g.ellipse(cx, gy + 2, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBody(
  g: Graphics,
  cx: number,
  cy: number,
  scaleX = 1,
  scaleY = 1,
): void {
  // Main body — large rounded blob
  g.ellipse(cx, cy, 17 * scaleX, 13 * scaleY)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 0.8 });

  // Lighter top highlight (wet sheen)
  g.ellipse(cx - 2, cy - 4 * scaleY, 8 * scaleX, 4 * scaleY).fill({
    color: COL_BODY_HI,
    alpha: 0.35,
  });

  // Slime sheen spot
  g.ellipse(cx + 4, cy - 6 * scaleY, 3 * scaleX, 2 * scaleY).fill({
    color: COL_SLIME,
    alpha: 0.2,
  });

  // Warts / mottled spots
  const warts = [
    [-8, -2, 1.5],
    [-4, -5, 1.2],
    [5, -3, 1.4],
    [9, -1, 1.0],
    [-6, 3, 1.1],
    [3, 4, 1.3],
    [8, 2, 0.9],
  ];
  for (const [wx, wy, wr] of warts) {
    g.circle(cx + wx * scaleX, cy + wy * scaleY, wr).fill({
      color: COL_WART,
      alpha: 0.3,
    });
  }

  // Body mottling — darker splotches
  g.ellipse(cx - 6, cy - 1, 4 * scaleX, 3 * scaleY).fill({
    color: COL_BODY_SPOT,
    alpha: 0.2,
  });
  g.ellipse(cx + 7, cy + 1, 3 * scaleX, 2 * scaleY).fill({
    color: COL_BODY_SPOT,
    alpha: 0.2,
  });

  // Pale belly / throat
  g.ellipse(cx, cy + 4 * scaleY, 11 * scaleX, 7 * scaleY).fill({
    color: COL_BELLY,
  });
  g.ellipse(cx, cy + 3 * scaleY, 8 * scaleX, 4 * scaleY).fill({
    color: COL_BELLY_HI,
    alpha: 0.3,
  });
}

function drawEyes(
  g: Graphics,
  cx: number,
  cy: number,
  blink = 0, // 0=open, 1=closed
): void {
  // Left eye bulge
  g.ellipse(cx - 8, cy, 7, 6)
    .fill({ color: COL_EYE_BULGE })
    .stroke({ color: COL_BODY_DK, width: 0.4 });
  // Left eyeball
  const eyeH = 3 * (1 - blink);
  if (eyeH > 0.5) {
    g.ellipse(cx - 8, cy, 3.5, eyeH).fill({ color: COL_EYE_WHITE });
    g.ellipse(cx - 8, cy, 2, eyeH * 0.6).fill({ color: COL_EYE_IRIS });
    g.circle(cx - 8, cy, 1).fill({ color: COL_EYE_PUPIL });
    g.circle(cx - 7, cy - 1, 0.6).fill({ color: COL_EYE_SHINE, alpha: 0.7 });
  } else {
    g.rect(cx - 11, cy - 0.3, 6, 0.6).fill({ color: COL_BODY_DK });
  }

  // Right eye bulge
  g.ellipse(cx + 8, cy, 7, 6)
    .fill({ color: COL_EYE_BULGE })
    .stroke({ color: COL_BODY_DK, width: 0.4 });
  // Right eyeball
  if (eyeH > 0.5) {
    g.ellipse(cx + 8, cy, 3.5, eyeH).fill({ color: COL_EYE_WHITE });
    g.ellipse(cx + 8, cy, 2, eyeH * 0.6).fill({ color: COL_EYE_IRIS });
    g.circle(cx + 8, cy, 1).fill({ color: COL_EYE_PUPIL });
    g.circle(cx + 9, cy - 1, 0.6).fill({ color: COL_EYE_SHINE, alpha: 0.7 });
  } else {
    g.rect(cx + 5, cy - 0.3, 6, 0.6).fill({ color: COL_BODY_DK });
  }
}

function drawMouth(
  g: Graphics,
  cx: number,
  cy: number,
  openAmount = 0, // 0=closed, 1=wide open
): void {
  const mouthW = 9 + openAmount * 3;
  const mouthH = 1.5 + openAmount * 5;

  if (openAmount > 0.2) {
    // Open mouth interior
    g.ellipse(cx, cy, mouthW, mouthH).fill({ color: COL_MOUTH });
    // Upper jaw
    g.ellipse(cx, cy - mouthH * 0.3, mouthW + 1, mouthH * 0.4).fill({
      color: COL_JAW,
    });
  } else {
    // Closed mouth line
    g.moveTo(cx - mouthW, cy)
      .quadraticCurveTo(cx, cy + 1.5, cx + mouthW, cy)
      .stroke({ color: COL_BODY_DK, width: 0.8 });
  }
}

function drawFrontLegs(
  g: Graphics,
  cx: number,
  gy: number,
  bodyY: number,
  spread = 0,
): void {
  // Short front legs with webbed feet
  const lx = cx - 12 - spread;
  const rx = cx + 12 + spread;

  // Left front leg
  g.moveTo(cx - 10, bodyY + 6)
    .lineTo(lx, gy - 2)
    .stroke({ color: COL_LEG, width: 3 });
  // Webbed foot
  g.ellipse(lx, gy - 1, 4, 2).fill({ color: COL_FOOT });
  // Toe webbing
  for (let i = -1; i <= 1; i++) {
    g.moveTo(lx + i * 2, gy - 2)
      .lineTo(lx + i * 3, gy + 1)
      .stroke({ color: COL_WEBBING, width: 0.5, alpha: 0.5 });
  }

  // Right front leg
  g.moveTo(cx + 10, bodyY + 6)
    .lineTo(rx, gy - 2)
    .stroke({ color: COL_LEG, width: 3 });
  g.ellipse(rx, gy - 1, 4, 2).fill({ color: COL_FOOT });
  for (let i = -1; i <= 1; i++) {
    g.moveTo(rx + i * 2, gy - 2)
      .lineTo(rx + i * 3, gy + 1)
      .stroke({ color: COL_WEBBING, width: 0.5, alpha: 0.5 });
  }
}

function drawBackLegs(
  g: Graphics,
  cx: number,
  gy: number,
  bodyY: number,
  crouchAmount = 0, // 0=normal, 1=compressed for jump
  extend = 0, // 0=normal, 1=extended in air
): void {
  const legH = 8 - crouchAmount * 4 + extend * 4;
  const haunchW = 6 + crouchAmount * 2;

  // Left haunch
  g.ellipse(cx - 13, bodyY + 2 - crouchAmount * 2, haunchW, 7)
    .fill({ color: COL_LEG })
    .stroke({ color: COL_LEG_DK, width: 0.4 });
  // Left lower leg
  g.moveTo(cx - 14, bodyY + 6 - crouchAmount * 2)
    .lineTo(cx - 16 - extend * 3, gy - 1 + crouchAmount * 3)
    .stroke({ color: COL_LEG, width: 3 });
  // Left back foot
  g.ellipse(cx - 16 - extend * 3, gy + crouchAmount * 3, 5, 2).fill({ color: COL_FOOT });
  void legH;

  // Right haunch
  g.ellipse(cx + 13, bodyY + 2 - crouchAmount * 2, haunchW, 7)
    .fill({ color: COL_LEG })
    .stroke({ color: COL_LEG_DK, width: 0.4 });
  // Right lower leg
  g.moveTo(cx + 14, bodyY + 6 - crouchAmount * 2)
    .lineTo(cx + 16 + extend * 3, gy - 1 + crouchAmount * 3)
    .stroke({ color: COL_LEG, width: 3 });
  g.ellipse(cx + 16 + extend * 3, gy + crouchAmount * 3, 5, 2).fill({ color: COL_FOOT });
}

function drawTongue(
  g: Graphics,
  cx: number,
  mouthY: number,
  length: number,
  angle = 0,
): void {
  if (length <= 0) return;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = cx + cos * length;
  const tipY = mouthY + sin * length;

  // Curvy tongue
  const midX = (cx + tipX) / 2 + sin * 3;
  const midY = (mouthY + tipY) / 2 - cos * 2;

  g.moveTo(cx, mouthY)
    .quadraticCurveTo(midX, midY, tipX, tipY)
    .stroke({ color: COL_TONGUE, width: 3 });
  // Sticky tip
  g.circle(tipX, tipY, 3).fill({ color: COL_TONGUE_TIP });
  g.circle(tipX, tipY, 1.5).fill({ color: COL_TONGUE, alpha: 0.5 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breath = Math.sin(t * Math.PI * 2) * 0.08;
  const throatPulse = Math.sin(t * Math.PI * 2) * 0.05 + 1;

  const bodyY = GY - 12;

  drawShadow(g, CX, GY);
  drawBackLegs(g, CX, GY, bodyY);
  drawBody(g, CX, bodyY, 1, 1 + breath);
  drawFrontLegs(g, CX, GY, bodyY);
  drawMouth(g, CX, bodyY + 6);
  drawEyes(g, CX, bodyY - 9);

  // Throat pouch subtle pulse
  g.ellipse(CX, bodyY + 8, 6 * throatPulse, 3 * throatPulse).fill({
    color: COL_BELLY_HI,
    alpha: 0.2,
  });
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const hopCycle = Math.sin(t * Math.PI * 2);
  const hop = Math.max(0, hopCycle) * 6; // only hop up
  const crouch = Math.max(0, -hopCycle) * 0.6; // crouch before hop
  const extend = Math.max(0, hopCycle) * 0.5; // legs extend during hop

  const bodyY = GY - 12 - hop;

  const shadowScale = 1 - hop * 0.03;
  drawShadow(g, CX, GY, 16 * shadowScale, 4 * shadowScale, 0.25 * shadowScale);

  drawBackLegs(g, CX, GY, bodyY, crouch, extend);
  drawBody(g, CX, bodyY, 1 - crouch * 0.05, 1 + crouch * 0.1);
  drawFrontLegs(g, CX, GY, bodyY, extend * 2);
  drawMouth(g, CX, bodyY + 6);
  drawEyes(g, CX, bodyY - 9);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: mouth opens → tongue lashes out → retracts → mouth closes
  const t = frame / 7;

  let mouthOpen: number;
  let tongueLen: number;
  if (t < 0.2) {
    mouthOpen = t / 0.2;
    tongueLen = 0;
  } else if (t < 0.45) {
    mouthOpen = 1;
    tongueLen = ((t - 0.2) / 0.25) * 20;
  } else if (t < 0.7) {
    mouthOpen = 1;
    tongueLen = (1 - (t - 0.45) / 0.25) * 20;
  } else {
    mouthOpen = 1 - (t - 0.7) / 0.3;
    tongueLen = 0;
  }

  const bodyY = GY - 12;
  const lunge = mouthOpen * 2; // body lurches forward slightly

  drawShadow(g, CX + lunge, GY, 16 + lunge, 4);
  drawBackLegs(g, CX, GY, bodyY);
  drawBody(g, CX + lunge, bodyY, 1 + mouthOpen * 0.05, 1 - mouthOpen * 0.03);
  drawFrontLegs(g, CX, GY, bodyY, mouthOpen * 2);

  // Mouth and tongue
  drawMouth(g, CX + lunge, bodyY + 6, mouthOpen);
  if (tongueLen > 0) {
    const tongueAngle = 0.2; // slightly downward forward
    drawTongue(g, CX + lunge, bodyY + 6, tongueLen, tongueAngle);
  }

  drawEyes(g, CX + lunge, bodyY - 9);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: inflates throat sac, emits vibration waves
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const inflate = clamp01(t * 2) * (0.7 + pulse * 0.3);

  const bodyY = GY - 12;

  // Vibration rings emanating
  if (inflate > 0.3) {
    for (let i = 0; i < 3; i++) {
      const ringR = 8 + i * 6 + t * 10;
      const ringAlpha = clamp01((inflate - 0.3) * 0.3 - i * 0.06);
      g.circle(CX, bodyY + 4, ringR).stroke({
        color: COL_BELLY_HI,
        width: 0.8,
        alpha: ringAlpha,
      });
    }
  }

  drawShadow(g, CX, GY);
  drawBackLegs(g, CX, GY, bodyY);
  drawBody(g, CX, bodyY);
  drawFrontLegs(g, CX, GY, bodyY);
  drawMouth(g, CX, bodyY + 6, inflate * 0.3);

  // Inflated throat sac
  const sacW = 8 + inflate * 6;
  const sacH = 4 + inflate * 5;
  g.ellipse(CX, bodyY + 8, sacW, sacH)
    .fill({ color: COL_BELLY_HI, alpha: 0.5 + inflate * 0.3 })
    .stroke({ color: COL_BELLY, width: 0.5, alpha: 0.4 });
  // Internal highlight
  g.ellipse(CX - 1, bodyY + 7, sacW * 0.5, sacH * 0.5).fill({
    color: COL_BELLY_HI,
    alpha: inflate * 0.2,
  });

  drawEyes(g, CX, bodyY - 9);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: rolls over, legs splay, deflates
  const t = frame / 7;
  const roll = t * 0.3;
  const fallX = t * 6;
  const squash = t * 0.3;
  const legSplay = t * 4;

  const bodyY = GY - 12 + t * 5;

  drawShadow(g, CX + fallX * 0.3, GY, 16 + t * 3, 4, 0.25 * (1 - t * 0.4));

  // Legs splay outward
  if (t < 0.8) {
    // Back legs splay
    g.ellipse(CX - 14 - legSplay, bodyY + 4, 5, 6).fill({
      color: COL_LEG,
      alpha: 1 - t * 0.3,
    });
    g.ellipse(CX + 14 + legSplay, bodyY + 4, 5, 6).fill({
      color: COL_LEG,
      alpha: 1 - t * 0.3,
    });
    // Front legs
    g.moveTo(CX - 10 + fallX * 0.2, bodyY + 6)
      .lineTo(CX - 14 - legSplay * 0.5, GY)
      .stroke({ color: COL_LEG, width: 2.5 });
    g.moveTo(CX + 10 + fallX * 0.2, bodyY + 6)
      .lineTo(CX + 14 + legSplay * 0.5, GY)
      .stroke({ color: COL_LEG, width: 2.5 });
  }

  // Body squashes and rolls
  drawBody(g, CX + fallX * 0.3, bodyY, 1 + squash, 1 - squash * 0.5);

  // Mouth agape
  drawMouth(g, CX + fallX * 0.3, bodyY + 6, (1 - t) * 0.4);

  // Eyes: blink closed as it dies
  const blink = clamp01(t * 1.5);
  drawEyes(g, CX + fallX * 0.3, bodyY - 9 + roll * 10, blink);
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

/**
 * Generate all giant frog sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[].
 */
export function generateGiantFrogFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
