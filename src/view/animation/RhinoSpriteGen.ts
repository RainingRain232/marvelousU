// Procedural sprite generator for the Rhino unit type.
//
// Draws a detailed rhinoceros at 64×64 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Thick armored hide with skin folds, plates, and wrinkles
//   • Prominent main horn + smaller secondary horn with keratin texture
//   • Small rounded ears with tufts
//   • Muscular legs with broad hooves
//   • Short tail with bristle tuft
//   • Beady dark eye with brow ridge
//   • Charging attack with dust cloud
//   • Ground-stomp cast with shockwave

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 64;
const CX = F / 2;
const GY = F - 4;

// --- palette ---
const COL_HIDE       = 0x6b6b5a;  // main hide grey-brown
const COL_HIDE_DK    = 0x4a4a3a;  // folds/shadows
const COL_HIDE_LT    = 0x8a8a70;  // highlights
const COL_PLATE      = 0x5a5a48;  // armor plate ridges
const COL_BELLY      = 0x7a7a68;  // lighter underbelly
const COL_HORN       = 0xd4c4a4;  // horn main
const COL_HORN_DK    = 0xa09070;  // horn shadow
const COL_HORN_TIP   = 0xeee0cc;  // horn tip highlight
const COL_EYE        = 0x222222;
const COL_NOSTRIL    = 0x333322;
const COL_EAR        = 0x5a5a48;
const COL_EAR_INNER  = 0x7a6a5a;
const COL_HOOF       = 0x2a2a20;
const COL_TAIL       = 0x4a4a3a;
const COL_DUST       = 0xaa9977;
const COL_SHADOW     = 0x000000;
const COL_IMPACT     = 0xffeeaa;

// --- helpers ---
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// --- drawing sub-routines ---

function drawShadow(g: Graphics, cx: number, cy: number, scaleX = 1): void {
  g.ellipse(cx, cy + 2, 28 * scaleX, 6).fill({ color: COL_SHADOW, alpha: 0.4 });
}

/** Draw the massive body with armor plates and skin folds */
function drawBody(
  g: Graphics,
  bx: number, by: number,
  breathe: number,
): void {
  const w = 20;
  const h = 14;

  // main body mass (rounded rectangle via overlapping ellipses)
  g.ellipse(bx, by, w, h).fill({ color: COL_HIDE });
  g.ellipse(bx, by, w - 0.5, h - 0.5).stroke({ color: COL_HIDE_DK, width: 0.8 });

  // top ridge / spine
  g.ellipse(bx - 2, by - h + 3, w * 0.7, 4).fill({ color: COL_HIDE_DK, alpha: 0.4 });

  // underbelly (lighter)
  g.ellipse(bx, by + 4 + breathe * 0.2, w * 0.8, h * 0.4).fill({ color: COL_BELLY, alpha: 0.3 });

  // shoulder plate / fold
  g.moveTo(bx + 8, by - h + 2)
    .quadraticCurveTo(bx + 12, by - 2, bx + 10, by + 4)
    .stroke({ color: COL_PLATE, width: 1.5 });

  // hip fold
  g.moveTo(bx - 8, by - h + 4)
    .quadraticCurveTo(bx - 14, by, bx - 10, by + 6)
    .stroke({ color: COL_PLATE, width: 1.2 });

  // mid-body wrinkle lines
  for (let i = 0; i < 3; i++) {
    const wx = bx - 4 + i * 5;
    const wy = by - 4 + i * 1.5;
    g.moveTo(wx, wy).lineTo(wx + 3, wy + 4)
      .stroke({ color: COL_HIDE_DK, width: 0.6, alpha: 0.5 });
  }

  // skin texture bumps
  const bumps = [
    [-6, -6], [2, -8], [8, -5], [-10, 0], [4, 2], [12, -1],
  ];
  for (const [dx, dy] of bumps) {
    g.circle(bx + dx, by + dy, 1.2).fill({ color: COL_HIDE_LT, alpha: 0.2 });
  }
}

/** Draw a muscular leg with hoof */
function drawLeg(
  g: Graphics,
  x: number, topY: number,
  legLen: number,
  phase: number,
  isFront: boolean,
): void {
  const swing = Math.sin(phase) * 4;
  const thighW = isFront ? 5 : 5.5;
  const shinW = isFront ? 4 : 4.5;

  // thigh
  const kneeY = topY + legLen * 0.5 + swing * 0.3;
  g.rect(x - thighW / 2, topY, thighW, kneeY - topY)
    .fill({ color: COL_HIDE_DK });

  // knee bulge
  g.ellipse(x, kneeY, thighW * 0.55, 2).fill({ color: COL_HIDE });

  // shin
  const hoofY = topY + legLen + swing * 0.5;
  g.rect(x - shinW / 2, kneeY, shinW, hoofY - kneeY)
    .fill({ color: COL_HIDE });

  // hoof (broad, dark)
  g.roundRect(x - shinW / 2 - 1, hoofY, shinW + 2, 3, 1)
    .fill({ color: COL_HOOF });

  // hoof line detail
  g.moveTo(x, hoofY).lineTo(x, hoofY + 3)
    .stroke({ color: COL_SHADOW, width: 0.5, alpha: 0.4 });
}

/** Draw the head with horn(s), eye, ear, nostril */
function drawHead(
  g: Graphics,
  hx: number, hy: number,
  hornTilt: number,  // extra tilt for charge
): void {
  // head mass (elongated)
  g.ellipse(hx, hy, 9, 7).fill({ color: COL_HIDE });
  g.ellipse(hx, hy, 9, 7).stroke({ color: COL_HIDE_DK, width: 0.6 });

  // snout extension
  g.ellipse(hx + 7, hy + 2, 5, 5).fill({ color: COL_HIDE });
  g.ellipse(hx + 7, hy + 2, 5, 5).stroke({ color: COL_HIDE_DK, width: 0.5 });

  // brow ridge
  g.moveTo(hx - 3, hy - 5).quadraticCurveTo(hx + 4, hy - 7, hx + 8, hy - 4)
    .stroke({ color: COL_HIDE_DK, width: 1.5 });

  // eye (beady, tucked under brow)
  g.circle(hx + 2, hy - 3, 2).fill({ color: COL_EYE });
  g.circle(hx + 1.5, hy - 3.5, 0.6).fill({ color: 0x444444 }); // highlight

  // nostril
  g.ellipse(hx + 10, hy + 2, 1.5, 1).fill({ color: COL_NOSTRIL });

  // ear (small, rounded with inner detail)
  g.moveTo(hx - 4, hy - 6)
    .lineTo(hx - 6, hy - 12)
    .lineTo(hx - 1, hy - 8)
    .closePath()
    .fill({ color: COL_EAR });
  g.moveTo(hx - 4, hy - 7)
    .lineTo(hx - 5, hy - 11)
    .lineTo(hx - 2, hy - 8)
    .closePath()
    .fill({ color: COL_EAR_INNER, alpha: 0.5 });

  // ear tuft
  g.moveTo(hx - 6, hy - 12).lineTo(hx - 7, hy - 14)
    .stroke({ color: COL_TAIL, width: 0.7 });

  // --- main horn ---
  const hornBaseX = hx + 10;
  const hornBaseY = hy - 2 + hornTilt;
  const hornLen = 14;

  // horn shadow/base
  g.moveTo(hornBaseX, hornBaseY - 2)
    .lineTo(hornBaseX + hornLen, hornBaseY - 5 + hornTilt * 0.5)
    .lineTo(hornBaseX, hornBaseY + 2)
    .closePath()
    .fill({ color: COL_HORN_DK });

  // horn main
  g.moveTo(hornBaseX, hornBaseY - 1.5)
    .lineTo(hornBaseX + hornLen - 1, hornBaseY - 4.5 + hornTilt * 0.5)
    .lineTo(hornBaseX, hornBaseY + 1.5)
    .closePath()
    .fill({ color: COL_HORN });

  // horn tip highlight
  g.circle(hornBaseX + hornLen - 2, hornBaseY - 4 + hornTilt * 0.5, 1)
    .fill({ color: COL_HORN_TIP, alpha: 0.6 });

  // keratin ridges on horn
  for (let i = 1; i < 4; i++) {
    const rt = i / 4;
    const rx = hornBaseX + hornLen * rt;
    const ry = hornBaseY - 1 - rt * 3 + hornTilt * rt * 0.5;
    g.moveTo(rx, ry - 1.5).lineTo(rx, ry + 1.5)
      .stroke({ color: COL_HORN_DK, width: 0.5, alpha: 0.5 });
  }

  // --- secondary horn (smaller, behind main) ---
  g.moveTo(hx + 4, hy - 5)
    .lineTo(hx + 8, hy - 9 + hornTilt * 0.3)
    .lineTo(hx + 6, hy - 4)
    .closePath()
    .fill({ color: COL_HORN_DK });
  g.moveTo(hx + 4.5, hy - 4.5)
    .lineTo(hx + 7.5, hy - 8.5 + hornTilt * 0.3)
    .lineTo(hx + 5.5, hy - 4)
    .closePath()
    .fill({ color: COL_HORN });

  // mouth line
  g.moveTo(hx + 8, hy + 4).lineTo(hx + 12, hy + 3)
    .stroke({ color: COL_HIDE_DK, width: 0.7 });
}

/** Draw the tail with bristle tuft */
function drawTail(
  g: Graphics,
  tx: number, ty: number,
  swish: number,
): void {
  // tail rope
  g.moveTo(tx, ty)
    .quadraticCurveTo(tx - 6, ty + swish * 3, tx - 10, ty + 2 + swish * 2)
    .stroke({ color: COL_TAIL, width: 1.5 });

  // bristle tuft at end
  const tipX = tx - 10;
  const tipY = ty + 2 + swish * 2;
  for (let i = -2; i <= 2; i++) {
    g.moveTo(tipX, tipY)
      .lineTo(tipX - 2 + i * 0.5, tipY + 3 + Math.abs(i))
      .stroke({ color: COL_TAIL, width: 0.7 });
  }
}

/** Draw dust particles */
function drawDust(
  g: Graphics,
  cx: number, cy: number,
  amount: number,  // 0-1
  spread: number,
): void {
  if (amount <= 0) return;
  for (let i = 0; i < 8; i++) {
    const angle = i * 0.785 + amount * 2;
    const dist = spread * (0.3 + (i % 3) * 0.3) * amount;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.4;
    const size = (2 - (i % 3) * 0.5) * amount;
    g.circle(px, py, size).fill({ color: COL_DUST, alpha: (1 - amount * 0.5) * 0.4 });
  }
}

// --- state frame generators ---

function drawIdleRhino(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const tailSwish = Math.sin(t * Math.PI * 2 * 0.7) * 0.5;

  const bodyX = CX - 2;
  const bodyY = GY - 22 + breathe;

  drawShadow(g, CX, GY);

  // tail (behind body)
  drawTail(g, bodyX - 18, bodyY - 2, tailSwish);

  // back legs (behind body)
  drawLeg(g, bodyX - 10, bodyY + 10, 14, 0, false);
  drawLeg(g, bodyX - 5, bodyY + 10, 14, 0, false);

  // body
  drawBody(g, bodyX, bodyY, breathe);

  // front legs
  drawLeg(g, bodyX + 8, bodyY + 10, 14, 0, true);
  drawLeg(g, bodyX + 13, bodyY + 10, 14, 0, true);

  // head
  drawHead(g, bodyX + 16, bodyY - 4 + breathe * 0.3, 0);
}

function drawWalkingRhino(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = t * Math.PI * 2;
  const bob = Math.sin(walk) * 2;
  const tailSwish = Math.sin(walk * 0.8) * 1;

  const bodyX = CX - 2;
  const bodyY = GY - 22 + bob;

  drawShadow(g, CX, GY, 1 - Math.abs(bob) * 0.02);

  // tail
  drawTail(g, bodyX - 18, bodyY - 2, tailSwish);

  // back legs (alternating gait)
  drawLeg(g, bodyX - 10, bodyY + 10, 14, walk, false);
  drawLeg(g, bodyX - 5, bodyY + 10, 14, walk + Math.PI, false);

  // body
  drawBody(g, bodyX, bodyY, 0);

  // front legs (alternating, opposite to back)
  drawLeg(g, bodyX + 8, bodyY + 10, 14, walk + Math.PI, true);
  drawLeg(g, bodyX + 13, bodyY + 10, 14, walk, true);

  // head bobs slightly
  drawHead(g, bodyX + 16, bodyY - 4 + bob * 0.3, 0);

  // subtle dust from hooves while walking
  const dustAmt = Math.abs(Math.sin(walk)) * 0.3;
  drawDust(g, bodyX + 13, GY + 2, dustAmt, 6);
}

function drawAttackingRhino(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // charge phases: lower head (0-0.2), charge forward (0.2-0.6), impact (0.6-0.75), recoil (0.75-1)
  let lunge = 0;
  let hornTilt = 0;
  let dustAmt = 0;
  let impactFlash = 0;
  let headDip = 0;

  if (t < 0.2) {
    const lt = t / 0.2;
    headDip = lt * 4;
    hornTilt = lt * 3;
  } else if (t < 0.6) {
    const lt = (t - 0.2) / 0.4;
    lunge = lt * 14;
    headDip = 4 - lt * 2;
    hornTilt = 3;
    dustAmt = lt;
  } else if (t < 0.75) {
    const lt = (t - 0.6) / 0.15;
    lunge = 14;
    hornTilt = 3 - lt * 5;  // horn snaps up on impact
    impactFlash = 1 - lt;
    dustAmt = 1;
    headDip = 2 - lt * 2;
  } else {
    const lt = (t - 0.75) / 0.25;
    lunge = 14 - lt * 14;
    hornTilt = -2 + lt * 2;
    dustAmt = 1 - lt;
  }

  const bodyX = CX - 2 - lunge;
  const bodyY = GY - 22;

  drawShadow(g, CX, GY);

  drawTail(g, bodyX - 18, bodyY - 2, -lunge * 0.1);

  // legs in running pose
  const runPhase = t * Math.PI * 4;
  drawLeg(g, bodyX - 10, bodyY + 10, 14, runPhase, false);
  drawLeg(g, bodyX - 5, bodyY + 10, 14, runPhase + Math.PI, false);

  drawBody(g, bodyX, bodyY, 0);

  drawLeg(g, bodyX + 8, bodyY + 10, 14, runPhase + Math.PI, true);
  drawLeg(g, bodyX + 13, bodyY + 10, 14, runPhase, true);

  drawHead(g, bodyX + 16, bodyY - 4 + headDip, hornTilt);

  // impact flash
  if (impactFlash > 0) {
    g.star(bodyX + 30, bodyY - 2, 5, 3, 6)
      .fill({ color: COL_IMPACT, alpha: impactFlash * 0.6 });
    g.circle(bodyX + 30, bodyY - 2, 8 * impactFlash)
      .fill({ color: 0xffffff, alpha: impactFlash * 0.25 });
  }

  // dust cloud behind during charge
  drawDust(g, bodyX - 16, GY, dustAmt, 14);
  drawDust(g, bodyX - 8, GY + 1, dustAmt * 0.7, 10);
}

function drawCastingRhino(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // ground stomp: rear up, slam down, shockwave
  let rearUp = 0;
  let stomp = 0;
  let shockwave = 0;

  if (t < 0.3) {
    rearUp = (t / 0.3) * 6;
  } else if (t < 0.45) {
    const lt = (t - 0.3) / 0.15;
    rearUp = 6 - lt * 8;
    stomp = lt;
  } else {
    rearUp = -2 + clamp01((t - 0.45) / 0.3) * 2;
    stomp = 1 - clamp01((t - 0.45) / 0.2);
    shockwave = clamp01((t - 0.45) / 0.55);
  }

  const bodyX = CX - 2;
  const bodyY = GY - 22 - rearUp;
  const tailSwish = rearUp * 0.3;

  drawShadow(g, CX, GY, 1 + stomp * 0.2);

  // shockwave rings on ground
  if (shockwave > 0) {
    for (let r = 0; r < 3; r++) {
      const ringT = clamp01(shockwave - r * 0.12);
      if (ringT <= 0) continue;
      const radius = 6 + ringT * 24;
      const alpha = (1 - ringT) * 0.4;
      g.ellipse(CX, GY + 2, radius, radius * 0.25)
        .stroke({ color: COL_DUST, width: 2 - r * 0.5, alpha });
    }
  }

  drawTail(g, bodyX - 18, bodyY - 2, tailSwish);

  // back legs
  drawLeg(g, bodyX - 10, bodyY + 10, 14 + rearUp * 0.3, 0, false);
  drawLeg(g, bodyX - 5, bodyY + 10, 14 + rearUp * 0.3, 0, false);

  drawBody(g, bodyX, bodyY, 0);

  // front legs raised then slammed
  const frontLegExtra = rearUp > 0 ? -rearUp * 0.5 : stomp * 2;
  drawLeg(g, bodyX + 8, bodyY + 10, 14 + frontLegExtra, rearUp * 0.5, true);
  drawLeg(g, bodyX + 13, bodyY + 10, 14 + frontLegExtra, rearUp * 0.5, true);

  drawHead(g, bodyX + 16, bodyY - 4, rearUp > 0 ? -rearUp * 0.3 : 0);

  // stomp dust burst
  if (stomp > 0.5) {
    drawDust(g, bodyX + 10, GY + 1, stomp, 16);
  }

  // ground crack lines at impact
  if (shockwave > 0 && shockwave < 0.6) {
    const crackAlpha = (1 - shockwave / 0.6) * 0.5;
    for (let i = 0; i < 4; i++) {
      const angle = -0.3 + i * 0.25;
      g.moveTo(bodyX + 10, GY + 2)
        .lineTo(bodyX + 10 + Math.cos(angle) * 12, GY + 2 + Math.sin(angle) * 4)
        .stroke({ color: COL_HIDE_DK, width: 1, alpha: crackAlpha });
    }
  }
}

function drawDyingRhino(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.7;
  const topple = t * 8;   // falls to the side
  const sink = t * 6;

  g.alpha = fade;

  const bodyX = CX - 2;
  const bodyY = GY - 22 + sink;

  drawShadow(g, CX, GY, 1 - t * 0.3);

  drawTail(g, bodyX - 18, bodyY - 2, -t);

  // legs go limp
  drawLeg(g, bodyX - 10, bodyY + 10, 14 - t * 4, t * 0.5, false);
  drawLeg(g, bodyX - 5, bodyY + 10, 14 - t * 3, -t * 0.3, false);

  // body tilts
  g.ellipse(bodyX, bodyY + topple * 0.3, 20 - t * 3, 14 - t * 2)
    .fill({ color: COL_HIDE });
  g.ellipse(bodyX, bodyY + topple * 0.3, 20 - t * 3, 14 - t * 2)
    .stroke({ color: COL_HIDE_DK, width: 0.8 });

  // underbelly exposed as it topples
  if (t > 0.3) {
    g.ellipse(bodyX, bodyY + topple * 0.5, 12, 6)
      .fill({ color: COL_BELLY, alpha: (t - 0.3) * 0.5 });
  }

  // front legs
  drawLeg(g, bodyX + 8, bodyY + 10, 14 - t * 5, t, true);
  drawLeg(g, bodyX + 13, bodyY + 10, 14 - t * 4, -t * 0.5, true);

  // head droops
  drawHead(g, bodyX + 16, bodyY - 4 + topple, t * 2);

  // eye X when dead
  if (t > 0.6) {
    const ex = bodyX + 18;
    const ey = bodyY - 7 + topple;
    g.moveTo(ex - 1.5, ey - 1.5).lineTo(ex + 1.5, ey + 1.5)
      .stroke({ color: COL_EYE, width: 1 });
    g.moveTo(ex + 1.5, ey - 1.5).lineTo(ex - 1.5, ey + 1.5)
      .stroke({ color: COL_EYE, width: 1 });
  }

  // dust settling
  if (t > 0.4) {
    drawDust(g, CX, GY, (t - 0.4) * 0.5, 10);
  }
}

// --- public API ---

export function generateRhinoFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  const stateGens: [UnitState, (g: Graphics, frame: number) => void][] = [
    [UnitState.IDLE,   drawIdleRhino],
    [UnitState.MOVE,   drawWalkingRhino],
    [UnitState.ATTACK, drawAttackingRhino],
    [UnitState.CAST,   drawCastingRhino],
    [UnitState.DIE,    drawDyingRhino],
  ];

  for (const [, gen] of stateGens) {
    for (let col = 0; col < 8; col++) {
      const g = new Graphics();
      gen(g, col);
      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: rt, container: g });
      frames.push(rt);
      g.destroy();
    }
  }

  return frames;
}
