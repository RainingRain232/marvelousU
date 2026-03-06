// Procedural sprite generator for the Dire Bear unit type.
//
// Draws a massive cave bear at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Enormous dark brown/brown-black bear, fills full 48×48
//   • Thick matted fur with layered highlights and shadow
//   • Broad flat head, small sunken eyes, scarred muzzle
//   • Massive paws with visible dark claws on each toe
//   • Tribal red and white paint stripes across shoulders/face
//   • Quadruped idle, lumbering gallop, rearing attack, roar cast

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — dire bear earth tones
const COL_FUR_BASE = 0x5c3a1a; // deep dark brown main body
const COL_FUR_MID = 0x7a4e25; // medium brown mid-fur
const COL_FUR_HI = 0xa06a38; // lighter brown highlight
const COL_FUR_DK = 0x3a2010; // very dark under-shadow
const COL_FUR_BELLY = 0x8c6040; // lighter belly fur
const COL_FUR_MUZZLE = 0x9a7050; // paler muzzle area

const COL_NOSE = 0x1a0a00; // black wet nose
const COL_EYE = 0x2a1800; // tiny dark eye
const COL_EYE_HI = 0xffaa44; // amber eye shine
const COL_MOUTH = 0x200a00;
const COL_TOOTH = 0xeeeedd; // cream teeth
const COL_CLAW = 0x2a2010; // dark horn claws
const COL_SCAR = 0x7a5535; // slightly lighter scar tissue

const COL_PAINT_RED = 0xcc2200; // tribal red stripes
const COL_PAINT_WHITE = 0xeeeedd; // tribal white dots/stripes

const COL_SHADOW = 0x000000;
const COL_SHOCKWAVE = 0xffcc44; // roar shockwave gold

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
  h = 3.5,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1.5, w, h).fill({ color: COL_SHADOW, alpha });
}

// Claws on one paw — row of 4 dark triangles
function drawClaws(g: Graphics, pawX: number, pawY: number, flip = false): void {
  const dir = flip ? -1 : 1;
  for (let i = 0; i < 4; i++) {
    const cx = pawX + dir * (i * 2.2 - 3.3);
    g.moveTo(cx, pawY)
      .lineTo(cx - dir * 0.8, pawY + 3)
      .lineTo(cx + dir * 0.8, pawY + 3)
      .closePath()
      .fill({ color: COL_CLAW });
  }
}

// Tribal red & white stripe paint across shoulders area
function drawTribalPaint(g: Graphics, bodyX: number, bodyY: number, bodyW: number): void {
  // Three red diagonal stripes on left shoulder
  for (let i = 0; i < 3; i++) {
    const ox = bodyX + 3 + i * 4;
    g.moveTo(ox, bodyY + 2)
      .lineTo(ox + 3, bodyY + 7)
      .stroke({ color: COL_PAINT_RED, width: 1.5, alpha: 0.85 });
  }
  // White dots across top
  for (let i = 0; i < 4; i++) {
    g.circle(bodyX + bodyW - 6 + i * 2.5, bodyY + 3, 0.8).fill({
      color: COL_PAINT_WHITE,
      alpha: 0.75,
    });
  }
}

// Head: broad flat bear skull, small ears, scarred muzzle, tribal mark on brow
function drawBearHead(
  g: Graphics,
  hx: number,
  hy: number,
  mouthOpen = 0, // 0 closed, 1 fully roaring
  tilt = 0, // horizontal tilt for head turn
): void {
  const hw = 18;
  const hh = 14;
  const mx = hx - hw / 2 + tilt;

  // Skull base
  g.roundRect(mx, hy, hw, hh, 5).fill({ color: COL_FUR_BASE });
  // Fur texture — lighter dome top
  g.roundRect(mx + 2, hy + 1, hw - 4, hh * 0.5, 4).fill({ color: COL_FUR_MID, alpha: 0.5 });

  // Muzzle — wide flat protrusion lower center
  const muzzleW = 10;
  const muzzleH = 6;
  const muzzleX = hx - muzzleW / 2 + tilt;
  const muzzleY = hy + hh * 0.52;
  g.roundRect(muzzleX, muzzleY, muzzleW, muzzleH, 3).fill({ color: COL_FUR_MUZZLE });

  // Nose — wide, black, glistening
  g.roundRect(hx - 2.5 + tilt, muzzleY + 0.5, 5, 2.5, 1.2).fill({ color: COL_NOSE });
  // Nose highlight
  g.circle(hx - 0.8 + tilt, muzzleY + 1, 0.7).fill({ color: COL_FUR_HI, alpha: 0.35 });

  // Scar across muzzle — two diagonal lines
  g.moveTo(muzzleX + 2, muzzleY + 1.5)
    .lineTo(muzzleX + 5, muzzleY + 4)
    .stroke({ color: COL_SCAR, width: 0.8, alpha: 0.7 });
  g.moveTo(muzzleX + 4, muzzleY + 1)
    .lineTo(muzzleX + 7, muzzleY + 4.5)
    .stroke({ color: COL_SCAR, width: 0.6, alpha: 0.5 });

  // Mouth — opens on roar
  const mouthY = muzzleY + muzzleH - 1;
  if (mouthOpen > 0.05) {
    const openH = mouthOpen * 6;
    // Lower jaw
    g.roundRect(hx - 5 + tilt, mouthY, 10, openH, 2).fill({ color: COL_MOUTH });
    // Upper teeth row
    for (let i = 0; i < 4; i++) {
      const tx = hx - 4 + tilt + i * 2.5;
      g.moveTo(tx, mouthY)
        .lineTo(tx + 0.8, mouthY + mouthOpen * 2)
        .lineTo(tx + 1.6, mouthY)
        .closePath()
        .fill({ color: COL_TOOTH });
    }
    // Lower teeth
    for (let i = 0; i < 3; i++) {
      const tx = hx - 3 + tilt + i * 2.8;
      g.moveTo(tx, mouthY + openH)
        .lineTo(tx + 0.9, mouthY + openH - mouthOpen * 2)
        .lineTo(tx + 1.8, mouthY + openH)
        .closePath()
        .fill({ color: COL_TOOTH });
    }
    // Canine fangs
    g.moveTo(hx - 5.5 + tilt, mouthY)
      .lineTo(hx - 5.5 + tilt + 1, mouthY + mouthOpen * 3)
      .lineTo(hx - 5.5 + tilt + 2, mouthY)
      .closePath()
      .fill({ color: COL_TOOTH });
    g.moveTo(hx + 3.5 + tilt, mouthY)
      .lineTo(hx + 3.5 + tilt + 1, mouthY + mouthOpen * 3)
      .lineTo(hx + 3.5 + tilt + 2, mouthY)
      .closePath()
      .fill({ color: COL_TOOTH });
  }

  // Small beady eyes, set deep and close together
  const eyeY = hy + hh * 0.28;
  const eyeL = hx - 4 + tilt;
  const eyeR = hx + 4 + tilt;
  g.circle(eyeL, eyeY, 2).fill({ color: COL_FUR_DK }); // eye socket shadow
  g.circle(eyeR, eyeY, 2).fill({ color: COL_FUR_DK });
  g.circle(eyeL, eyeY, 1.3).fill({ color: COL_EYE });
  g.circle(eyeR, eyeY, 1.3).fill({ color: COL_EYE });
  g.circle(eyeL + 0.4, eyeY - 0.4, 0.4).fill({ color: COL_EYE_HI, alpha: 0.7 }); // shine
  g.circle(eyeR + 0.4, eyeY - 0.4, 0.4).fill({ color: COL_EYE_HI, alpha: 0.7 });

  // Small round ears
  g.circle(mx + 3, hy + 1.5, 3.5).fill({ color: COL_FUR_BASE });
  g.circle(mx + hw - 3, hy + 1.5, 3.5).fill({ color: COL_FUR_BASE });
  g.circle(mx + 3, hy + 1.5, 2).fill({ color: COL_FUR_DK, alpha: 0.4 }); // inner ear dark
  g.circle(mx + hw - 3, hy + 1.5, 2).fill({ color: COL_FUR_DK, alpha: 0.4 });

  // Tribal paint — white stripe across brow
  g.moveTo(mx + 4, hy + 4)
    .lineTo(mx + hw - 4, hy + 4)
    .stroke({ color: COL_PAINT_WHITE, width: 1, alpha: 0.65 });
  // Red dots on cheeks
  g.circle(mx + 3.5, eyeY + 2.5, 1.2).fill({ color: COL_PAINT_RED, alpha: 0.7 });
  g.circle(mx + hw - 3.5, eyeY + 2.5, 1.2).fill({ color: COL_PAINT_RED, alpha: 0.7 });
}

// Main body — massive torso on all fours
function drawBody(
  g: Graphics,
  bodyX: number,
  bodyY: number,
  bodyW: number,
  bodyH: number,
  breathe = 0,
): void {
  // Dark underbelly shadow
  g.roundRect(bodyX + 2, bodyY + bodyH * 0.55, bodyW - 4, bodyH * 0.5, 4).fill({
    color: COL_FUR_DK,
    alpha: 0.5,
  });
  // Main body
  g.roundRect(bodyX, bodyY, bodyW, bodyH + breathe, 6).fill({ color: COL_FUR_BASE });
  // Back ridge — darker stripe along spine
  g.roundRect(bodyX + bodyW * 0.2, bodyY, bodyW * 0.6, bodyH * 0.35, 3).fill({
    color: COL_FUR_DK,
    alpha: 0.45,
  });
  // Belly lighter fur
  g.roundRect(bodyX + 4, bodyY + bodyH * 0.5, bodyW - 8, bodyH * 0.38, 4).fill({
    color: COL_FUR_BELLY,
    alpha: 0.5,
  });
  // Shoulder hump
  g.circle(bodyX + bodyW * 0.3, bodyY + 1, bodyW * 0.28).fill({ color: COL_FUR_MID, alpha: 0.4 });
  // Fur highlight across back
  g.roundRect(bodyX + 3, bodyY + 1, bodyW * 0.5, 2, 1).fill({ color: COL_FUR_HI, alpha: 0.25 });

  drawTribalPaint(g, bodyX, bodyY, bodyW);
}

// Front leg + paw
function drawFrontLeg(
  g: Graphics,
  lx: number,
  topY: number,
  lh: number,
  liftY = 0,
): void {
  // Thick upper leg
  g.roundRect(lx - 3, topY - liftY, 7, lh, 3).fill({ color: COL_FUR_BASE });
  g.roundRect(lx - 2, topY - liftY, 4, lh * 0.6, 2).fill({ color: COL_FUR_MID, alpha: 0.45 });
  // Paw — wide, round
  g.roundRect(lx - 5, topY + lh - liftY - 3, 11, 5, 2).fill({ color: COL_FUR_MID });
  g.roundRect(lx - 4, topY + lh - liftY - 2, 9, 2.5, 1.5).fill({ color: COL_FUR_HI, alpha: 0.3 });
  drawClaws(g, lx, topY + lh - liftY + 2, false);
}

// Hind leg + paw
function drawHindLeg(
  g: Graphics,
  lx: number,
  topY: number,
  lh: number,
  liftY = 0,
): void {
  g.roundRect(lx - 4, topY - liftY, 8, lh, 3).fill({ color: COL_FUR_BASE });
  g.roundRect(lx - 3, topY - liftY, 5, lh * 0.6, 2).fill({ color: COL_FUR_MID, alpha: 0.45 });
  // Hind paw — wider, heavier
  g.roundRect(lx - 5, topY + lh - liftY - 3, 12, 5, 2).fill({ color: COL_FUR_MID });
  drawClaws(g, lx, topY + lh - liftY + 2, false);
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.2; // body swell
  const sniff = frame % 4 === 0 || frame % 4 === 1 ? 0.5 : 0; // head dip
  const weightShift = Math.sin(t * Math.PI * 2) * 1.0; // sway side to side

  // Layout — all-fours stance
  const bodyX = 5;
  const bodyY = 18 + breathe * 0.3;
  const bodyW = 35;
  const bodyH = 15;

  const frontLegTopY = bodyY + bodyH - 2;
  const hindLegTopY = bodyY + bodyH - 2;

  drawShadow(g, CX + weightShift * 0.5, GY, 17, 3.5);
  drawBody(g, bodyX + weightShift * 0.4, bodyY, bodyW, bodyH, breathe);
  drawFrontLeg(g, bodyX + 8 + weightShift, frontLegTopY, 10);
  drawFrontLeg(g, bodyX + 18 + weightShift * 0.3, frontLegTopY, 10, 0);
  drawHindLeg(g, bodyX + bodyW - 10 - weightShift, hindLegTopY, 10);
  drawHindLeg(g, bodyX + bodyW - 18 - weightShift * 0.3, hindLegTopY, 10);
  // Head — low, sniffing pose
  drawBearHead(g, bodyX + 10 + weightShift, bodyY - 9 + sniff, 0, 0);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const gallop = Math.sin(t * Math.PI * 2); // -1 to 1
  const bounce = Math.abs(gallop) * 2.5; // body bobs up during gallop

  // Layout
  const bodyX = 4;
  const bodyY = 16 + bounce;
  const bodyW = 36;
  const bodyH = 14;
  const frontLegTopY = bodyY + bodyH - 2;
  const hindLegTopY = bodyY + bodyH - 2;

  // Alternating paw lifts — diagonal gait
  const liftFL = gallop > 0 ? gallop * 5 : 0;
  const liftFR = gallop < 0 ? -gallop * 5 : 0;
  const liftHL = gallop < 0 ? -gallop * 4 : 0;
  const liftHR = gallop > 0 ? gallop * 4 : 0;

  // Body lurches forward each stride
  const bodyLean = gallop * 1.5;

  drawShadow(g, CX, GY, 17 + Math.abs(gallop) * 2, 3);
  drawBody(g, bodyX + bodyLean, bodyY, bodyW, bodyH);
  drawFrontLeg(g, bodyX + 7 + bodyLean, frontLegTopY, 10, liftFL);
  drawFrontLeg(g, bodyX + 17 + bodyLean, frontLegTopY, 10, liftFR);
  drawHindLeg(g, bodyX + bodyW - 9 + bodyLean, hindLegTopY, 10, liftHL);
  drawHindLeg(g, bodyX + bodyW - 18 + bodyLean, hindLegTopY, 10, liftHR);
  // Head bobs with gallop
  drawBearHead(g, bodyX + 9 + bodyLean, bodyY - 10 + bounce * 0.5, 0, bodyLean * 0.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0–1: rear up wind up; 2–3: stand tall; 4–5: massive paw swipe down; 6–7: crash back
  const phases = [0, 0.14, 0.28, 0.45, 0.62, 0.76, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  // Rearing: body rises, becomes more vertical
  const rearAmount = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
  const rearLift = rearAmount * 14; // body lifts off ground

  const bodyX = 12;
  const bodyY = 14 + (14 - rearLift);
  const bodyW = 22;
  const bodyH = 18;

  // Hind legs stay planted; front legs rise up
  const hindLegTopY = GY - 12;
  const frontLiftY = rearAmount * 12;

  drawShadow(g, CX, GY, 14 - rearAmount * 3, 3.5, 0.3 + rearAmount * 0.1);

  // Hind legs — braced on ground
  drawHindLeg(g, bodyX + 2, hindLegTopY, 12);
  drawHindLeg(g, bodyX + bodyW - 2, hindLegTopY, 12);

  // Body — more vertical when rearing
  drawBody(g, bodyX, bodyY, bodyW, bodyH);

  // Front paw swipe — raised high then slamming down
  const swipePhase = t < 0.45 ? 0 : t < 0.65 ? (t - 0.45) / 0.2 : 1 - (t - 0.65) / 0.35;
  const swiperY = bodyY + 2 - frontLiftY + swipePhase * 20;
  const swiperX = bodyX + bodyW + 3;

  // Left front arm — raised back
  const leftArmY = bodyY + 4 - frontLiftY * 0.6;
  g.roundRect(bodyX + 3, leftArmY, 6, 8, 3).fill({ color: COL_FUR_BASE });
  g.roundRect(bodyX + 3, leftArmY + 8, 9, 5, 2).fill({ color: COL_FUR_MID }); // paw
  drawClaws(g, bodyX + 7, leftArmY + 13, false);

  // Right front arm — swinging down hard
  g.moveTo(bodyX + bodyW - 4, bodyY + 3)
    .lineTo(swiperX, swiperY)
    .stroke({ color: COL_FUR_BASE, width: 8 });
  // Paw at swipe end
  g.roundRect(swiperX - 5, swiperY - 2, 12, 6, 2).fill({ color: COL_FUR_MID });
  drawClaws(g, swiperX, swiperY + 4, false);

  // Impact lines when swipe connects (phase 4-5)
  if (t >= 0.62 && t <= 0.88) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.75) / 0.13);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI - Math.PI * 0.2;
      const len = 8 + i * 2;
      g.moveTo(swiperX, swiperY + 3)
        .lineTo(swiperX + Math.cos(ang) * len, swiperY + 3 + Math.sin(ang) * len)
        .stroke({ color: COL_SHOCKWAVE, width: 1.2, alpha: impactAlpha * 0.6 });
    }
  }

  drawBearHead(g, bodyX + bodyW * 0.4, bodyY - 12 + (1 - rearAmount) * 6, rearAmount * 0.5, 2);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const roarOpen = clamp01(t * 2.5); // mouth opens

  // Fully reared up, standing tall, ROARING
  const bodyX = 13;
  const bodyY = 10;
  const bodyW = 20;
  const bodyH = 20;
  const hindLegTopY = GY - 13;

  // Shockwave rings emanating outward
  for (let i = 0; i < 4; i++) {
    const ring = ((t * 2 + i * 0.25) % 1.0);
    const rr = ring * 20 + 4;
    const alpha = (1 - ring) * 0.25;
    g.circle(CX + 2, bodyY - 4, rr).stroke({ color: COL_SHOCKWAVE, width: 1.5, alpha });
  }

  // Floating gold motes — roar energy
  for (let i = 0; i < 6; i++) {
    const ang = t * Math.PI * 3 + i * (Math.PI / 3);
    const dist = 10 + pulse * 6 + i * 1.5;
    const mx = CX + Math.cos(ang) * dist * 1.2;
    const my = bodyY - 4 + Math.sin(ang) * dist * 0.7;
    g.circle(mx, my, 0.9 + pulse * 0.5).fill({ color: COL_SHOCKWAVE, alpha: 0.35 + pulse * 0.2 });
  }

  drawShadow(g, CX, GY, 12, 3, 0.25 + pulse * 0.1);

  drawHindLeg(g, bodyX + 3, hindLegTopY, 13);
  drawHindLeg(g, bodyX + bodyW - 3, hindLegTopY, 13);

  drawBody(g, bodyX, bodyY, bodyW, bodyH, pulse * 0.8);

  // Both front paws raised and spread wide — roaring pose
  const spreadL = -5 - pulse * 3;
  const spreadR = bodyW + 5 + pulse * 3;
  const armTopY = bodyY + 4;
  g.moveTo(bodyX + 4, armTopY)
    .lineTo(bodyX + spreadL, armTopY - 4 - pulse * 2)
    .stroke({ color: COL_FUR_BASE, width: 7 });
  g.roundRect(bodyX + spreadL - 5, armTopY - 8 - pulse * 2, 12, 5, 2).fill({ color: COL_FUR_MID });
  drawClaws(g, bodyX + spreadL, armTopY - 4 - pulse * 2, true);

  g.moveTo(bodyX + bodyW - 4, armTopY)
    .lineTo(bodyX + spreadR, armTopY - 4 - pulse * 2)
    .stroke({ color: COL_FUR_BASE, width: 7 });
  g.roundRect(bodyX + spreadR - 5, armTopY - 8 - pulse * 2, 12, 5, 2).fill({ color: COL_FUR_MID });
  drawClaws(g, bodyX + spreadR, armTopY - 4 - pulse * 2, false);

  drawBearHead(g, CX + 1, bodyY - 13, roarOpen, 0);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  // Slumping: body sinks and tilts forward
  const slump = t * t; // accelerate collapse
  const sinkY = slump * 14;
  const tiltX = slump * 8; // tips to right

  const bodyX = 5 + tiltX * 0.3;
  const bodyY = 15 + sinkY;
  const bodyW = 33;
  const bodyH = 14;

  // Shadow shrinks as bear collapses flat
  drawShadow(g, CX + tiltX * 0.2, GY, 17 + slump * 3, 3.5 + slump * 1.5, 0.3 + slump * 0.15);

  // Hind legs buckle outward
  const hindLegTopY = bodyY + bodyH - 2;
  const buckleL = slump * 4;
  const buckleR = -slump * 4;
  drawHindLeg(g, bodyX + bodyW - 9 + buckleL, hindLegTopY, Math.max(4, 10 - slump * 6));
  drawHindLeg(g, bodyX + bodyW - 18 + buckleR, hindLegTopY, Math.max(4, 10 - slump * 5));

  drawBody(g, bodyX, bodyY, bodyW, bodyH * (1 + slump * 0.2));

  // Front legs splay forward as body slumps
  const frontLegTopY = bodyY + bodyH - 2;
  const splayL = slump * 6;
  const splayR = slump * 2;
  drawFrontLeg(g, bodyX + 8 - splayL, frontLegTopY, Math.max(4, 10 - slump * 3));
  drawFrontLeg(g, bodyX + 18 + splayR, frontLegTopY, Math.max(4, 10 - slump * 2));

  // Head droops and falls — closes eyes
  const headDrop = slump * 10;
  const headTilt = tiltX * 0.6;
  if (t < 0.95) {
    drawBearHead(g, bodyX + 10 + tiltX, bodyY - 9 + headDrop, 0, headTilt);
    // Dark overlay on eyes — closing
    const eyeAlpha = clamp01(t * 1.4);
    const eyeY = bodyY - 9 + headDrop + 14 * 0.28;
    g.ellipse(bodyX + 10 + tiltX - 4 + headTilt, eyeY, 2, 1.3 * eyeAlpha).fill({
      color: COL_FUR_DK,
      alpha: eyeAlpha,
    });
    g.ellipse(bodyX + 10 + tiltX + 4 + headTilt, eyeY, 2, 1.3 * eyeAlpha).fill({
      color: COL_FUR_DK,
      alpha: eyeAlpha,
    });
  }

  // Dust puff at moment of impact (frame 5-6)
  if (t >= 0.7) {
    const dustAlpha = clamp01((t - 0.7) * 3) * 0.3;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI;
      const dr = (t - 0.7) * 25;
      g.circle(CX + Math.cos(ang) * dr, GY - 2 + Math.sin(ang) * dr * 0.3, 2 + i * 0.8).fill({
        color: COL_FUR_MID,
        alpha: dustAlpha,
      });
    }
  }

  // Fur settling — slight alpha fade on body at end
  if (t > 0.8) {
    g.roundRect(bodyX, bodyY, bodyW, bodyH).fill({
      color: COL_FUR_DK,
      alpha: (t - 0.8) * 0.4,
    });
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
 * Generate all Dire Bear sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateDireBearFrames(renderer: Renderer): RenderTexture[] {
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
