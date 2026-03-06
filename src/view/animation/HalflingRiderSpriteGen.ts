// Procedural sprite generator for the Halfling Rider unit type.
//
// Draws a halfling mounted on a giant spiny hedgehog at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Tiny halfling with rosy cheeks, curly brown hair, green vest
//   • Giant hedgehog mount — brown/tan body with prominent dark spines, cute snout
//   • Small lance held by the halfling, tiny saddle
//   • IDLE: hedgehog sniffs ground, halfling pats it, spines relax
//   • MOVE: hedgehog bounces forward, halfling holds on, spines bristle
//   • ATTACK: hedgehog curls into spiny ball and rolls at enemy
//   • CAST: halfling raises lance high, hedgehog stomps, spines glow
//   • DIE: hedgehog uncurls, halfling tumbles off, both topple sideways

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — halfling & hedgehog
const COL_HOG_BODY = 0x8b6840;       // main hedgehog fur brown
const COL_HOG_BODY_DK = 0x6a4e2e;    // dark underside
const COL_HOG_BELLY = 0xd4b896;      // pale tan belly
const COL_HOG_SNOUT = 0xc8946a;      // snout pinkish-tan
const COL_HOG_NOSE = 0x3a1a0a;       // dark wet nose
const COL_HOG_EYE = 0x1a0a00;        // small beady eye
const COL_HOG_EYE_HI = 0xffffff;     // eye highlight
const COL_SPINE = 0x2a1a0a;          // dark brown-black spines
const COL_SPINE_TIP = 0x8a7a6a;      // lighter spine tips
const COL_SPINE_GLOW = 0xaaddff;     // magic spine glow

const COL_HL_SKIN = 0xf0c090;        // halfling warm skin
const COL_HL_SKIN_DK = 0xd4a070;     // skin shadow
const COL_HL_CHEEK = 0xf09080;       // rosy cheeks
const COL_HL_HAIR = 0x7a4a18;        // curly brown hair
const COL_HL_HAIR_HI = 0xa06a28;     // hair highlight
const COL_HL_VEST = 0x3e7a3e;        // green vest
const COL_HL_VEST_DK = 0x2a5a2a;     // vest shadow
const COL_HL_SHIRT = 0xe8d8b0;       // cream shirt
const COL_HL_PANTS = 0x7a5a3a;       // brown pants
const COL_HL_BOOT = 0x4a3220;        // dark leather boots (bare hairy feet are small)
const COL_HL_EYE = 0x4a2a0a;         // halfling eyes, warm brown

const COL_LANCE = 0xa08060;          // wooden lance shaft
const COL_LANCE_TIP = 0xc0c8d0;      // metal lance tip
const COL_SADDLE = 0x6a4020;         // leather saddle
const COL_SADDLE_HI = 0x8a6040;      // saddle highlight

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 14,
  h = 3,
  alpha = 0.22,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

/**
 * Draw the hedgehog body as a large rounded blob.
 * cx/cy is the center of the body mass.
 */
function drawHedgehogBody(
  g: Graphics,
  cx: number,
  cy: number,
  scaleX = 1,
  scaleY = 1,
): void {
  const bw = 20 * scaleX;
  const bh = 13 * scaleY;
  // Main body dome
  g.ellipse(cx, cy, bw, bh).fill({ color: COL_HOG_BODY }).stroke({ color: COL_HOG_BODY_DK, width: 0.5 });
  // Belly underside lighter strip
  g.ellipse(cx, cy + bh * 0.55, bw * 0.7, bh * 0.35).fill({ color: COL_HOG_BELLY });
}

/**
 * Draw hedgehog spines radiating from upper back arc.
 * spineBristle: 0=relaxed, 1=fully erect.
 * glowing: true if spines glow magically.
 */
function drawSpines(
  g: Graphics,
  cx: number,
  cy: number,
  scaleX = 1,
  scaleY = 1,
  spineBristle = 0.3,
  glowing = false,
): void {
  const bw = 20 * scaleX;
  const bh = 13 * scaleY;
  // Spines arc from ~150° to ~30° around the top of the body (in screen coords)
  const spineCount = 14;
  const startAngle = Math.PI * 0.85;
  const endAngle = Math.PI * 0.15;
  for (let i = 0; i < spineCount; i++) {
    const frac = i / (spineCount - 1);
    // Angle going clockwise from top-left to top-right
    const ang = startAngle + (endAngle - startAngle) * frac;
    // Base at body surface
    const bx = cx + Math.cos(ang) * bw * 0.85;
    const by = cy + Math.sin(ang) * bh * 0.85;
    // Spine extends outward
    const spineLen = lerp(3, 8, spineBristle) + (i % 3 === 0 ? 2 : 0);
    const ex = bx + Math.cos(ang) * spineLen;
    const ey = by + Math.sin(ang) * spineLen;

    if (glowing) {
      // Glow aura
      g.moveTo(bx, by).lineTo(ex, ey).stroke({ color: COL_SPINE_GLOW, width: 2.5, alpha: 0.35 });
    }
    g.moveTo(bx, by).lineTo(ex, ey).stroke({ color: COL_SPINE, width: 1 });
    // Tip highlight
    g.circle(ex, ey, 0.6).fill({ color: COL_SPINE_TIP });
  }
}

/**
 * Draw hedgehog head + snout + eyes at the right side of the body.
 * sniffDown: 0=head level, 1=sniffing at ground.
 */
function drawHedgehogHead(
  g: Graphics,
  cx: number,
  cy: number,
  scaleX = 1,
  scaleY = 1,
  sniffDown = 0,
): void {
  const headOffX = 16 * scaleX;
  const headOffY = lerp(-1, 4, sniffDown) * scaleY;
  const hx = cx + headOffX;
  const hy = cy + headOffY;
  // Head blob
  g.ellipse(hx, hy, 7 * scaleX, 5 * scaleY)
    .fill({ color: COL_HOG_BODY })
    .stroke({ color: COL_HOG_BODY_DK, width: 0.4 });
  // Snout protrusion
  g.ellipse(hx + 5.5 * scaleX, hy + 1 * scaleY, 4 * scaleX, 3 * scaleY)
    .fill({ color: COL_HOG_SNOUT });
  // Nose tip
  g.ellipse(hx + 9 * scaleX, hy + 1 * scaleY, 1.8 * scaleX, 1.4 * scaleY)
    .fill({ color: COL_HOG_NOSE });
  // Eye
  const eyeX = hx + 2.5 * scaleX;
  const eyeY = hy - 1.5 * scaleY;
  g.circle(eyeX, eyeY, 1.4).fill({ color: COL_HOG_EYE });
  g.circle(eyeX + 0.4, eyeY - 0.4, 0.45).fill({ color: COL_HOG_EYE_HI });
  // Small ear
  g.ellipse(hx - 1 * scaleX, hy - 4 * scaleY, 2.2 * scaleX, 3 * scaleY)
    .fill({ color: COL_HOG_BODY_DK });
}

/**
 * Draw the hedgehog feet (two pairs, left and right).
 * Offset controls stride.
 */
function drawHedgehogFeet(
  g: Graphics,
  cx: number,
  gy: number,
  scaleX = 1,
  stridePhase = 0,
): void {
  const offsets = [-8 * scaleX, -3 * scaleX, 3 * scaleX, 8 * scaleX];
  for (let i = 0; i < 4; i++) {
    const liftAmt = Math.sin(stridePhase + i * Math.PI * 0.5) * 2.5;
    const fx = cx + offsets[i];
    const fy = gy - Math.max(0, liftAmt);
    g.ellipse(fx, fy, 3 * scaleX, 1.8)
      .fill({ color: COL_HOG_BODY_DK })
      .stroke({ color: COL_SHADOW, width: 0.2 });
    // Little claws
    for (let c = 0; c < 3; c++) {
      const clawX = fx - 2 * scaleX + c * 2 * scaleX;
      g.moveTo(clawX, fy + 0.5).lineTo(clawX + (c - 1) * 0.7 * scaleX, fy + 2.5)
        .stroke({ color: COL_HOG_BODY_DK, width: 0.5 });
    }
  }
}

/**
 * Draw the tiny saddle on the hedgehog back.
 */
function drawSaddle(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx - 3, cy - 10, 7, 3)
    .fill({ color: COL_SADDLE })
    .stroke({ color: COL_SADDLE_HI, width: 0.4 });
  // Saddle horn
  g.circle(cx, cy - 13, 1.2).fill({ color: COL_SADDLE_HI });
  // Girth strap
  g.moveTo(cx - 8, cy - 9).lineTo(cx - 8, cy + 2)
    .stroke({ color: COL_SADDLE, width: 1 });
}

/**
 * Draw the halfling rider sitting on the hedgehog.
 * tx/ty: head center position. tilt: body lean angle.
 */
function drawHalflingRider(
  g: Graphics,
  cx: number,
  torsoTop: number,
  tilt = 0,
  armRaise = 0,
): void {
  // Body (sitting, compact)
  const bw = 8;
  const bh = 9;
  const bx = cx - bw / 2 + tilt;
  // Vest
  g.roundRect(bx, torsoTop, bw, bh, 2)
    .fill({ color: COL_HL_VEST })
    .stroke({ color: COL_HL_VEST_DK, width: 0.4 });
  // Shirt collar visible
  g.roundRect(bx + 1, torsoTop, bw - 2, 3, 1).fill({ color: COL_HL_SHIRT });
  // Vest button
  g.circle(cx + tilt, torsoTop + 5, 0.7).fill({ color: COL_HL_VEST_DK });
  // Pants/legs dangling sides
  g.roundRect(bx - 3, torsoTop + bh - 3, 3, 5, 1).fill({ color: COL_HL_PANTS });
  g.roundRect(bx + bw, torsoTop + bh - 3, 3, 5, 1).fill({ color: COL_HL_PANTS });
  // Big halfling feet with short boot-tip
  g.ellipse(bx - 2.5, torsoTop + bh + 2.5, 3, 1.5).fill({ color: COL_HL_SKIN });
  g.ellipse(bx + bw + 2.5, torsoTop + bh + 2.5, 3, 1.5).fill({ color: COL_HL_SKIN });
  // Leather boot toe-cap
  g.ellipse(bx - 4, torsoTop + bh + 2.8, 1.4, 1).fill({ color: COL_HL_BOOT });
  g.ellipse(bx + bw + 4.5, torsoTop + bh + 2.8, 1.4, 1).fill({ color: COL_HL_BOOT });

  // Head
  const headW = 9;
  const headH = 8;
  const headTop = torsoTop - headH + 1;
  const hx = cx - headW / 2 + tilt;
  g.roundRect(hx, headTop, headW, headH, 3)
    .fill({ color: COL_HL_SKIN })
    .stroke({ color: COL_HL_SKIN_DK, width: 0.3 });
  // Rosy cheeks
  g.circle(cx - 2.5 + tilt, headTop + headH * 0.6, 1.4).fill({ color: COL_HL_CHEEK, alpha: 0.6 });
  g.circle(cx + 2.5 + tilt, headTop + headH * 0.6, 1.4).fill({ color: COL_HL_CHEEK, alpha: 0.6 });
  // Eyes
  g.circle(cx - 1.8 + tilt, headTop + headH * 0.42, 1.1).fill({ color: COL_HL_EYE });
  g.circle(cx + 1.8 + tilt, headTop + headH * 0.42, 1.1).fill({ color: COL_HL_EYE });
  // Pupils/shine
  g.circle(cx - 1.4 + tilt, headTop + headH * 0.38, 0.35).fill({ color: COL_SHADOW, alpha: 0.8 });
  g.circle(cx + 2.2 + tilt, headTop + headH * 0.38, 0.35).fill({ color: COL_SHADOW, alpha: 0.8 });
  // Smile
  g.moveTo(cx - 1 + tilt, headTop + headH * 0.68)
    .quadraticCurveTo(cx + tilt, headTop + headH * 0.76, cx + 1 + tilt, headTop + headH * 0.68)
    .stroke({ color: COL_HL_SKIN_DK, width: 0.5 });
  // Curly hair
  drawHalflingHair(g, cx + tilt, headTop);

  // Arm — lance arm
  const armEndX = cx + 9 + tilt;
  const armEndY = torsoTop + 1 - armRaise * 6;
  g.moveTo(cx + 4 + tilt, torsoTop + 2)
    .lineTo(armEndX, armEndY)
    .stroke({ color: COL_HL_SHIRT, width: 2.5 });
  g.circle(armEndX, armEndY, 1.2).fill({ color: COL_HL_SKIN });

  // Patting arm (left)
  const patEndX = cx - 7 + tilt;
  const patEndY = torsoTop + 6;
  g.moveTo(cx - 4 + tilt, torsoTop + 3)
    .lineTo(patEndX, patEndY)
    .stroke({ color: COL_HL_SHIRT, width: 2.5 });
  g.circle(patEndX, patEndY, 1.2).fill({ color: COL_HL_SKIN });

  // Lance
  drawLance(g, armEndX, armEndY, armRaise);
}

function drawHalflingHair(g: Graphics, cx: number, top: number): void {
  // Curly hair cluster
  const curls = [
    { dx: -3.5, dy: 0, r: 2.2 },
    { dx: -1.5, dy: -1.5, r: 2 },
    { dx: 0.5, dy: -2, r: 2.2 },
    { dx: 2.5, dy: -1.2, r: 1.8 },
    { dx: 3.5, dy: 0.5, r: 1.8 },
  ];
  for (const c of curls) {
    g.circle(cx + c.dx, top + c.dy, c.r).fill({ color: COL_HL_HAIR });
  }
  // Highlights on curls
  g.circle(cx - 1.5, top - 2.5, 0.8).fill({ color: COL_HL_HAIR_HI, alpha: 0.5 });
  g.circle(cx + 1, top - 2.8, 0.7).fill({ color: COL_HL_HAIR_HI, alpha: 0.5 });
}

function drawLance(g: Graphics, hx: number, hy: number, raise = 0): void {
  // Lance shaft going up-right diagonally
  const angle = -Math.PI * 0.35 - raise * 0.4;
  const shaftLen = 20;
  const tipX = hx + Math.cos(angle) * shaftLen;
  const tipY = hy + Math.sin(angle) * shaftLen;
  // Shaft
  g.moveTo(hx, hy).lineTo(tipX, tipY).stroke({ color: COL_LANCE, width: 1.8 });
  // Pennant near tip
  const pennX = hx + Math.cos(angle) * (shaftLen - 6);
  const pennY = hy + Math.sin(angle) * (shaftLen - 6);
  g.moveTo(pennX, pennY)
    .lineTo(pennX + Math.sin(angle) * 4, pennY - Math.cos(angle) * 4)
    .lineTo(pennX + Math.cos(angle) * 4, pennY + Math.sin(angle) * 4)
    .closePath()
    .fill({ color: 0xcc3333 });
  // Metal tip
  g.moveTo(tipX, tipY)
    .lineTo(tipX + Math.cos(angle) * 4, tipY + Math.sin(angle) * 4)
    .stroke({ color: COL_LANCE_TIP, width: 2 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const sniff = Math.abs(Math.sin(t * Math.PI)) * 0.6; // sniffs down and back up

  const hogCY = GY - 10 + breathe * 0.3;
  const hogCX = CX - 2;

  drawShadow(g, hogCX, GY, 14, 3, 0.22);
  drawHedgehogFeet(g, hogCX, GY, 1, 0);
  drawHedgehogBody(g, hogCX, hogCY);
  drawSpines(g, hogCX, hogCY, 1, 1, 0.25 + breathe * 0.05);
  drawHedgehogHead(g, hogCX, hogCY, 1, 1, sniff);
  drawSaddle(g, hogCX, hogCY);
  drawHalflingRider(g, hogCX, hogCY - 22 + breathe, 0, 0);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * 2.5;
  const stride = Math.sin(t * Math.PI * 2);
  const leanFwd = 1.5; // lean forward while running

  const hogCY = GY - 10 - bounce;
  const hogCX = CX - 2 + stride * 0.5;

  drawShadow(g, hogCX, GY, 13 + bounce * 0.5, 3 - bounce * 0.2, 0.2);
  drawHedgehogFeet(g, hogCX, GY, 1, t * Math.PI * 8);
  drawHedgehogBody(g, hogCX, hogCY, 1 + bounce * 0.03, 1 - bounce * 0.03);
  // Bristle spines while moving
  drawSpines(g, hogCX, hogCY, 1 + bounce * 0.03, 1 - bounce * 0.03, 0.65);
  drawHedgehogHead(g, hogCX, hogCY, 1, 1, 0.1);
  drawSaddle(g, hogCX, hogCY);
  // Halfling holds on — slight back-lean from inertia
  drawHalflingRider(g, hogCX, hogCY - 22 - bounce, leanFwd, 0.15);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Curling charge: 0-2 curl, 3-5 rolling ball, 6-7 uncurl
  const t = frame / 7;

  const rollProg = clamp01((t - 0.28) / 0.55); // 0→1 during rolling phase
  const curlAmt = t < 0.28 ? t / 0.28 : t < 0.83 ? 1 : 1 - (t - 0.83) / 0.17;

  const bounce = rollProg > 0 && rollProg < 1 ? Math.sin(rollProg * Math.PI * 4) * 3 : 0;
  const fwdShift = rollProg * 4;

  const hogCX = CX - 2 + fwdShift;
  const hogCY = GY - 10 - bounce;

  // When curling, the body becomes more circular
  const scaleX = lerp(1, 0.85, curlAmt);
  const scaleY = lerp(1, 1.15, curlAmt);

  drawShadow(g, hogCX, GY, lerp(14, 10, curlAmt) + bounce * 0.3, 3, 0.22);

  if (curlAmt < 0.8) {
    drawHedgehogFeet(g, hogCX, GY, scaleX, 0);
    drawHedgehogHead(g, hogCX, hogCY, scaleX, scaleY, curlAmt);
  }
  drawHedgehogBody(g, hogCX, hogCY, scaleX, scaleY);
  // Spines fully bristled during charge
  drawSpines(g, hogCX, hogCY, scaleX, scaleY, lerp(0.3, 1, curlAmt));

  if (curlAmt < 0.7) {
    drawSaddle(g, hogCX, hogCY);
    drawHalflingRider(g, hogCX, hogCY - 22, curlAmt * 3, 0.5);
  } else {
    // Halfling tucked in holding on — visible just a bit
    g.circle(hogCX + 2, hogCY - 12, 4).fill({ color: COL_HL_SKIN });
    drawHalflingHair(g, hogCX + 2, hogCY - 15);
  }

  // Speed lines when rolling
  if (rollProg > 0 && rollProg < 1) {
    for (let i = 0; i < 4; i++) {
      const lineY = hogCY - 6 + i * 4;
      const lineLen = lerp(0, 8, rollProg);
      g.moveTo(hogCX - 14, lineY).lineTo(hogCX - 14 - lineLen, lineY)
        .stroke({ color: 0xffffff, width: 0.8, alpha: lerp(0, 0.35, rollProg) });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.6);

  const hogCY = GY - 10 - intensity * 2; // stomps slightly down then up
  const hogCX = CX - 2;

  // Magic ground circle
  const ringR = 5 + intensity * 10;
  g.circle(hogCX, GY, ringR).stroke({
    color: COL_SPINE_GLOW,
    width: 1,
    alpha: 0.15 + pulse * 0.2,
  });

  drawShadow(g, hogCX, GY, 14 + intensity * 2, 3, 0.25 + intensity * 0.1);

  // Stomp shake
  const stomp = Math.sin(t * Math.PI * 6) * intensity * 1.5;
  drawHedgehogFeet(g, hogCX, GY + stomp * 0.5, 1, 0);
  drawHedgehogBody(g, hogCX, hogCY + stomp);
  drawSpines(g, hogCX, hogCY + stomp, 1, 1, 0.4 + intensity * 0.6, intensity > 0.4);
  drawHedgehogHead(g, hogCX, hogCY + stomp, 1, 1, 0.15);
  drawSaddle(g, hogCX, hogCY + stomp);

  // Halfling raises lance high
  const armRaise = clamp01(t * 1.8);
  drawHalflingRider(g, hogCX, hogCY - 22 + stomp, 0, armRaise);

  // Glow particles around lance tip
  if (intensity > 0.2) {
    for (let i = 0; i < 5; i++) {
      const ang = t * Math.PI * 6 + i * (Math.PI * 0.4);
      const dist = 4 + pulse * 5;
      const tipX = hogCX + 14 + Math.cos(ang) * dist;
      const tipY = hogCY - 28 + Math.sin(ang) * dist * 0.6;
      g.circle(tipX, tipY, 0.8 + pulse * 0.5).fill({
        color: COL_SPINE_GLOW,
        alpha: 0.3 + pulse * 0.3,
      });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fallRight = t * 10;
  const dropY = t * t * 8;

  const hogCX = CX - 2 + fallRight * 0.3;
  const hogCY = GY - 10 + dropY;

  drawShadow(g, hogCX, GY, lerp(14, 18, t), lerp(3, 1.5, t), 0.22 * (1 - t * 0.5));

  // Hedgehog topples — drawn with increasing tilt
  if (t < 0.75) {
    drawHedgehogBody(g, hogCX, hogCY);
    // Spines droop as it falls
    drawSpines(g, hogCX, hogCY, 1, 1, lerp(0.8, 0.1, t));
    drawHedgehogHead(g, hogCX + fallRight * 0.1, hogCY, 1, 1, lerp(0, 1, t));
    drawHedgehogFeet(g, hogCX, GY, 1, 0);
  } else {
    // Fully toppled, belly up partially
    g.ellipse(hogCX, GY - 6, 20, 8).fill({ color: COL_HOG_BELLY });
    g.ellipse(hogCX + 8, GY - 5, 6, 4).fill({ color: COL_HOG_SNOUT });
    g.circle(hogCX + 12, GY - 6, 1.4).fill({ color: COL_HOG_NOSE });
  }

  // Halfling tumbles off
  if (t < 0.5) {
    const hlx = hogCX - fallRight * 0.4;
    const hly = hogCY - lerp(22, 30, t);
    drawHalflingRider(g, hlx, hly, t * 4, 0);
  } else {
    // Halfling landed on ground
    const hlx = hogCX - 12 - fallRight * 0.2;
    const hly = GY - 8;
    g.roundRect(hlx - 4, hly, 9, 6, 2).fill({ color: COL_HL_VEST });
    g.circle(hlx + 1, hly - 4, 4).fill({ color: COL_HL_SKIN });
    drawHalflingHair(g, hlx + 1, hly - 7);
    // Lance fallen on ground
    g.moveTo(hlx + 6, hly + 4).lineTo(hlx + 22, hly + 2)
      .stroke({ color: COL_LANCE, width: 1.8 });
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all Halfling Rider sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateHalflingRiderFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
