// Procedural sprite generator for the Giant Archer unit.
//
// 96x144 pixel frames (2w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A massive humanoid wielding an enormous greatbow (as tall as the giant itself).
// Leather and hide armor, quiver of oversized arrows on back, simple iron helmet,
// thick boots and leather bracers. Arrow is like a ballista bolt in size.
// States: IDLE 8, MOVE 8, ATTACK 6, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;  // 2 tiles wide
const FH = 144; // 3 tiles tall
const CX = FW / 2;
const GY = FH - 6;

// Palette
const COL_SKIN      = 0xd4a878;
const COL_SKIN_HL   = 0xe8c8a0;
const COL_SKIN_SH   = 0xb08860;
const COL_LEATHER   = 0x6b4226;
const COL_LEATHER_DK = 0x4a2e18;
const COL_LEATHER_LT = 0x8b5a36;
const COL_HIDE      = 0x7a6040;
const COL_HIDE_DK   = 0x5a4428;
const COL_IRON      = 0x8888a0;
const COL_IRON_DK   = 0x666680;
const COL_IRON_HL   = 0xaaaacc;
const COL_BOW_WOOD  = 0x7a5020;
const COL_BOW_DK    = 0x553818;
const COL_BOW_HL    = 0xa07030;
const COL_STRING    = 0xccccaa;
const COL_ARROW     = 0x8b6a3a;
const COL_ARROW_TIP = 0xaaaabc;
const COL_FLETCH    = 0xcc4444;
const COL_BOOT      = 0x3a2818;
const COL_BOOT_DK   = 0x281a10;
const COL_BELT      = 0x5a3a20;
const COL_BUCKLE    = 0xccaa44;
const COL_HAIR      = 0x554430;
const COL_EYE       = 0x222222;
const COL_SHADOW    = 0x000000;
const COL_QUIVER    = 0x5a3a22;
const COL_QUIVER_DK = 0x3a2614;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha });
}
function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.circle(x, y, r).fill({ color, alpha });
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.rect(x, y, w, h).fill({ color, alpha });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: w });
}
function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.poly(pts).fill({ color, alpha });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawHelmet(g: Graphics, x: number, y: number): void {
  // Simple iron helmet / leather cap
  // Helmet dome
  ellipse(g, x, y - 6, 13, 10, COL_IRON);
  ellipse(g, x - 2, y - 8, 10, 7, COL_IRON_HL, 0.25);
  // Brim
  ellipse(g, x, y - 1, 15, 4, COL_IRON_DK);
  // Nose guard
  rect(g, x - 1.5, y - 4, 3, 8, COL_IRON_DK);
  // Rivet details
  circle(g, x - 10, y - 4, 1.2, COL_IRON_HL, 0.6);
  circle(g, x + 10, y - 4, 1.2, COL_IRON_HL, 0.6);
  circle(g, x - 6, y - 10, 1, COL_IRON_HL, 0.5);
  circle(g, x + 6, y - 10, 1, COL_IRON_HL, 0.5);
  // Leather lining visible under brim
  ellipse(g, x, y, 13, 3, COL_LEATHER, 0.5);
}

function drawHead(g: Graphics, x: number, y: number): void {
  // Neck
  rect(g, x - 6, y + 10, 12, 8, COL_SKIN);
  rect(g, x - 5, y + 12, 10, 4, COL_SKIN_SH, 0.2);

  // Head — slightly lean but strong-jawed
  ellipse(g, x, y, 12, 13, COL_SKIN);
  // Jawline shadow
  ellipse(g, x, y + 6, 11, 5, COL_SKIN_SH, 0.2);
  // Highlight
  circle(g, x + 2, y - 3, 8, COL_SKIN_HL, 0.15);

  // Ears
  ellipse(g, x - 12, y - 1, 3, 4, COL_SKIN);
  circle(g, x - 12, y - 1, 1.5, COL_SKIN_SH, 0.3);
  ellipse(g, x + 12, y - 1, 3, 4, COL_SKIN);
  circle(g, x + 12, y - 1, 1.5, COL_SKIN_SH, 0.3);

  // Eyes — focused, narrowed
  line(g, x - 6, y - 2, x - 2, y - 3, COL_EYE, 2);
  line(g, x + 2, y - 3, x + 6, y - 2, COL_EYE, 2);
  // Pupils
  circle(g, x - 4, y - 2.5, 1, COL_EYE);
  circle(g, x + 4, y - 2.5, 1, COL_EYE);

  // Slight stubble / chin
  ellipse(g, x, y + 10, 6, 3, COL_HAIR, 0.15);

  // Mouth — stern line
  line(g, x - 4, y + 5, x + 4, y + 5, COL_SKIN_SH, 1.5);

  drawHelmet(g, x, y);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  const torsoRx = 18 + breathe * 0.3;
  const torsoRy = 24 + breathe * 0.4;

  // Main torso — muscular but lean
  ellipse(g, x, y + 4, torsoRx, torsoRy, COL_SKIN);
  // Leather chest armor (vest-style, not full plate)
  ellipse(g, x, y + 2, torsoRx - 1, torsoRy - 4, COL_LEATHER);
  // Hide over-layer on chest
  ellipse(g, x, y - 2, torsoRx - 4, torsoRy - 10, COL_HIDE);
  ellipse(g, x, y - 4, torsoRx - 6, torsoRy - 14, COL_HIDE_DK, 0.3);

  // Stitching on leather
  for (let i = -12; i <= 12; i += 6) {
    line(g, x + i, y - 10, x + i, y + 14, COL_LEATHER_DK, 0.8);
  }
  // Cross-stitch detail
  for (let sy = y - 8; sy < y + 12; sy += 8) {
    line(g, x - 10, sy, x + 10, sy, COL_LEATHER_DK, 0.6);
  }

  // Shoulder pads (leather)
  ellipse(g, x - 18, y - 8, 7, 5, COL_LEATHER);
  ellipse(g, x - 18, y - 10, 5, 3, COL_LEATHER_LT, 0.3);
  ellipse(g, x + 18, y - 8, 7, 5, COL_LEATHER);
  ellipse(g, x + 18, y - 10, 5, 3, COL_LEATHER_LT, 0.3);

  // Belt
  rect(g, x - torsoRx + 2, y + 16, (torsoRx - 2) * 2, 4, COL_BELT);
  // Belt buckle
  rect(g, x - 3, y + 15, 6, 6, COL_BUCKLE);
  rect(g, x - 1.5, y + 16.5, 3, 3, COL_BELT, 0.6);
}

function drawQuiver(g: Graphics, x: number, y: number, breathe: number): void {
  // Quiver on back — visible behind right shoulder
  const qx = x + 14;
  const qy = y - 6 + breathe * 0.3;

  // Quiver body
  poly(g, [
    qx - 4, qy - 18,
    qx + 4, qy - 18,
    qx + 5, qy + 16,
    qx - 3, qy + 16,
  ], COL_QUIVER);
  // Quiver shading
  rect(g, qx + 2, qy - 16, 2, 30, COL_QUIVER_DK, 0.3);
  // Strap across chest
  line(g, qx - 2, qy - 16, x - 12, y + 8, COL_LEATHER_DK, 2.5);

  // Oversized arrows sticking out the top
  for (let i = 0; i < 4; i++) {
    const ax = qx - 2 + i * 2;
    const ay = qy - 18 - 8 - i * 3;
    line(g, ax, qy - 16, ax, ay, COL_ARROW, 2);
    // Fletching
    poly(g, [
      ax - 2, ay,
      ax, ay - 4,
      ax + 2, ay,
    ], COL_FLETCH, 0.8);
  }
}

function drawArms(
  g: Graphics, x: number, y: number, breathe: number,
  leftAngle: number, rightAngle: number,
): void {
  const armLen = 24;

  // Left arm
  const lsx = x - 20;
  const lsy = y - 4 + breathe * 0.4;
  const lhx = lsx + Math.cos(leftAngle) * armLen;
  const lhy = lsy + Math.sin(leftAngle) * armLen;

  // Upper arm
  line(g, lsx, lsy, lhx, lhy, COL_SKIN_SH, 8);
  line(g, lsx, lsy, lhx, lhy, COL_SKIN, 6);
  // Bracer on forearm
  const lmx = (lsx + lhx) / 2;
  const lmy = (lsy + lhy) / 2;
  circle(g, lmx + (lhx - lsx) * 0.15, lmy + (lhy - lsy) * 0.15, 5, COL_LEATHER);
  circle(g, lmx + (lhx - lsx) * 0.15, lmy + (lhy - lsy) * 0.15, 4, COL_LEATHER_LT, 0.3);
  // Hand
  circle(g, lhx, lhy, 4.5, COL_SKIN);
  circle(g, lhx + 0.5, lhy - 0.5, 3.5, COL_SKIN_HL, 0.25);

  // Right arm
  const rsx = x + 20;
  const rsy = y - 4 + breathe * 0.4;
  const rhx = rsx + Math.cos(rightAngle) * armLen;
  const rhy = rsy + Math.sin(rightAngle) * armLen;

  line(g, rsx, rsy, rhx, rhy, COL_SKIN_SH, 8);
  line(g, rsx, rsy, rhx, rhy, COL_SKIN, 6);
  // Bracer
  const rmx = (rsx + rhx) / 2;
  const rmy = (rsy + rhy) / 2;
  circle(g, rmx + (rhx - rsx) * 0.15, rmy + (rhy - rsy) * 0.15, 5, COL_LEATHER);
  circle(g, rmx + (rhx - rsx) * 0.15, rmy + (rhy - rsy) * 0.15, 4, COL_LEATHER_LT, 0.3);
  // Hand
  circle(g, rhx, rhy, 4.5, COL_SKIN);
  circle(g, rhx - 0.5, rhy - 0.5, 3.5, COL_SKIN_HL, 0.25);
}

function drawLegs(g: Graphics, x: number, y: number, step: number, bodyBottom: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 6;

  const legTop = bodyBottom;
  const legLen = y + 16 - legTop;

  // Left leg
  rect(g, x - 10, legTop, 9, legLen, COL_LEATHER_DK);
  rect(g, x - 9, legTop + 1, 7, legLen - 2, COL_HIDE);
  // Knee guard
  ellipse(g, x - 6, legTop + legLen * 0.45, 5, 3, COL_IRON, 0.5);
  // Boot
  const llEnd = y + 16 + stride * 0.5;
  ellipse(g, x - 6, llEnd + 2, 8, 5, COL_BOOT);
  ellipse(g, x - 6, llEnd, 7, 3, COL_BOOT_DK, 0.4);
  // Boot sole
  rect(g, x - 12, llEnd + 4, 12, 3, COL_BOOT_DK);
  // Boot strap
  line(g, x - 12, llEnd - 1, x, llEnd - 1, COL_LEATHER_DK, 1.5);

  // Right leg
  rect(g, x + 1, legTop, 9, legLen, COL_LEATHER_DK);
  rect(g, x + 2, legTop + 1, 7, legLen - 2, COL_HIDE);
  // Knee guard
  ellipse(g, x + 6, legTop + legLen * 0.45, 5, 3, COL_IRON, 0.5);
  // Boot
  const rlEnd = y + 16 - stride * 0.5;
  ellipse(g, x + 7, rlEnd + 2, 8, 5, COL_BOOT);
  ellipse(g, x + 7, rlEnd, 7, 3, COL_BOOT_DK, 0.4);
  rect(g, x + 1, rlEnd + 4, 12, 3, COL_BOOT_DK);
  line(g, x + 1, rlEnd - 1, x + 13, rlEnd - 1, COL_LEATHER_DK, 1.5);
}

function drawGreatbow(
  g: Graphics, x: number, y: number,
  _bowAngle: number, drawAmount: number,
): void {
  // Massive greatbow — as tall as the giant (~88 pixels)
  const bowH = 44; // half-height
  const bowTopY = y - bowH;
  const bowBotY = y + bowH;

  // Bow stave — thick wooden curve
  // Outer limb (upper)
  g.moveTo(x, bowTopY)
    .bezierCurveTo(x - 14, bowTopY + bowH * 0.3, x - 14, y - bowH * 0.1, x, y)
    .stroke({ color: COL_BOW_WOOD, width: 5 });
  // Outer limb (lower)
  g.moveTo(x, y)
    .bezierCurveTo(x - 14, y + bowH * 0.1, x - 14, bowBotY - bowH * 0.3, x, bowBotY)
    .stroke({ color: COL_BOW_WOOD, width: 5 });

  // Inner highlight
  g.moveTo(x + 1, bowTopY + 4)
    .bezierCurveTo(x - 10, bowTopY + bowH * 0.35, x - 10, y - bowH * 0.05, x + 1, y)
    .stroke({ color: COL_BOW_HL, width: 2 });
  g.moveTo(x + 1, y)
    .bezierCurveTo(x - 10, y + bowH * 0.05, x - 10, bowBotY - bowH * 0.35, x + 1, bowBotY - 4)
    .stroke({ color: COL_BOW_HL, width: 2 });

  // Dark inner edge
  g.moveTo(x - 1, bowTopY + 2)
    .bezierCurveTo(x - 16, bowTopY + bowH * 0.3, x - 16, y, x - 1, y)
    .stroke({ color: COL_BOW_DK, width: 1.5 });
  g.moveTo(x - 1, y)
    .bezierCurveTo(x - 16, y, x - 16, bowBotY - bowH * 0.3, x - 1, bowBotY - 2)
    .stroke({ color: COL_BOW_DK, width: 1.5 });

  // Nock tips (horn caps at bow ends)
  circle(g, x, bowTopY, 3, COL_IRON);
  circle(g, x, bowTopY, 1.5, COL_IRON_HL, 0.5);
  circle(g, x, bowBotY, 3, COL_IRON);
  circle(g, x, bowBotY, 1.5, COL_IRON_HL, 0.5);

  // Grip wrapping at center
  rect(g, x - 3, y - 5, 6, 10, COL_LEATHER);
  // Grip cross-wrap
  for (let i = -4; i <= 4; i += 3) {
    line(g, x - 3, y + i, x + 3, y + i + 2, COL_LEATHER_DK, 1);
  }

  // Bowstring
  const pullBack = drawAmount * 16;
  const stringX = x + pullBack;

  g.moveTo(x, bowTopY)
    .lineTo(stringX, y)
    .lineTo(x, bowBotY)
    .stroke({ color: COL_STRING, width: 1.5 });
}

function drawBallistaBolt(g: Graphics, x: number, y: number): void {
  // Oversized arrow — ballista bolt size
  // Shaft
  line(g, x, y, x + 28, y, COL_ARROW, 3);
  line(g, x, y - 0.5, x + 26, y - 0.5, COL_BOW_HL, 1);

  // Iron arrowhead — large and menacing
  poly(g, [
    x + 26, y - 4,
    x + 34, y,
    x + 26, y + 4,
    x + 28, y,
  ], COL_ARROW_TIP);
  // Arrowhead edge highlight
  line(g, x + 27, y - 3, x + 33, y, COL_IRON_HL, 1);

  // Fletching (large feathers)
  poly(g, [
    x - 2, y - 5,
    x + 6, y,
    x - 2, y - 1,
  ], COL_FLETCH, 0.9);
  poly(g, [
    x - 2, y + 5,
    x + 6, y,
    x - 2, y + 1,
  ], COL_FLETCH, 0.9);
  // Fletch quill lines
  line(g, x - 1, y - 4, x + 4, y - 1, COL_LEATHER_DK, 0.8);
  line(g, x - 1, y + 4, x + 4, y + 1, COL_LEATHER_DK, 0.8);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

// Layout: body center ~ GY-68, belly bottom ~ bodyY + 28, head ~ bodyY - 24

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;

  // Ground shadow
  ellipse(g, CX, GY, 24, 7, COL_SHADOW, 0.25);

  const bodyY = GY - 68 + breathe;
  const bodyBottom = bodyY + 28 + breathe * 0.4;
  const headY = bodyY - 24 + breathe * 0.3;

  // Draw back-to-front
  drawQuiver(g, CX, bodyY, breathe);
  drawLegs(g, CX, GY - 24, 0, bodyBottom);
  drawBody(g, CX, bodyY, breathe);
  drawArms(g, CX, bodyY, breathe,
    -Math.PI * 0.35 + breathe * 0.02,
    -Math.PI * 0.65 - breathe * 0.02);
  // Bow held at rest (vertical, in left hand area)
  drawGreatbow(g, CX - 22, bodyY + 8 + breathe * 0.5, 0, 0);
  drawHead(g, CX, headY);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 3;
  const sway = Math.sin(t * Math.PI * 2) * 2;

  ellipse(g, CX, GY, 24, 7, COL_SHADOW, 0.25);

  const bodyY = GY - 68 - bob;
  const bodyBottom = bodyY + 28;
  const headY = bodyY - 24;

  drawQuiver(g, CX + sway, bodyY, bob * 0.3);
  drawLegs(g, CX + sway, GY - 24, t, bodyBottom);
  drawBody(g, CX + sway, bodyY, bob * 0.3);
  drawArms(g, CX + sway, bodyY, bob * 0.3,
    -Math.PI * 0.3 + sway * 0.04,
    -Math.PI * 0.7 - sway * 0.04);
  // Bow carried while walking
  drawGreatbow(g, CX - 22 + sway, bodyY + 8, 0, 0);
  drawHead(g, CX + sway, headY);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 6 frames: draw(0-1) -> hold(2) -> release(3) -> recover(4-5)
  const t = frame / 6;
  let drawAmount = 0;
  let lean = 0;
  let bowX = CX - 22;
  let bowY: number;
  let showArrow = false;

  if (t < 0.33) {
    // Draw the bow — pull string back
    const p = t / 0.33;
    drawAmount = p;
    lean = -p * 2;
    showArrow = true;
  } else if (t < 0.5) {
    // Hold at full draw
    drawAmount = 1;
    lean = -2;
    showArrow = true;
  } else if (t < 0.67) {
    // Release — string snaps forward, arrow launches
    const p = (t - 0.5) / 0.17;
    drawAmount = 1 - p;
    lean = -2 + p * 3;
    showArrow = false;
  } else {
    // Recover
    const p = (t - 0.67) / 0.33;
    drawAmount = 0;
    lean = 1 - p;
  }

  ellipse(g, CX, GY, 24, 7, COL_SHADOW, 0.25);

  const bodyY = GY - 68;
  const bodyBottom = bodyY + 28;
  const headY = bodyY - 24;
  bowY = bodyY + 4;
  bowX += lean;

  drawQuiver(g, CX + lean, bodyY, 0);
  drawLegs(g, CX, GY - 24, 0, bodyBottom);
  drawBody(g, CX + lean, bodyY, 0);

  // Arms change position based on draw
  const leftArm = -Math.PI * 0.45 - drawAmount * 0.15;
  const rightArm = -Math.PI * 0.5 + drawAmount * 0.3;
  drawArms(g, CX + lean, bodyY, 0, leftArm, rightArm);

  // Greatbow — string pulled back
  drawGreatbow(g, bowX, bowY, 0, drawAmount);

  // Arrow nocked on string during draw and hold
  if (showArrow) {
    const arrowX = bowX + drawAmount * 16;
    drawBallistaBolt(g, arrowX - 8, bowY);
  }

  // Arrow flying away on release frame
  if (t >= 0.5 && t < 0.67) {
    const p = (t - 0.5) / 0.17;
    const flyX = bowX + 20 + p * 40;
    const flyY = bowY - p * 4;
    drawBallistaBolt(g, flyX, flyY);
  }

  drawHead(g, CX + lean, headY);
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 14;
  const drop = t * 28;
  const fade = 1 - t;

  ellipse(g, CX, GY, 24 * fade, 7 * fade, COL_SHADOW, 0.25 * fade);

  const bodyY = GY - 68;
  const bodyBottom = bodyY + 28;
  const headY = bodyY - 24;

  // Bow falls separately
  if (t < 0.7) {
    const bowDrop = t * 18;
    const bowTilt = t * 12;
    drawGreatbow(g, CX - 22 + bowTilt, bodyY + 8 + bowDrop, 0, 0);
  }

  if (t < 0.85) {
    drawLegs(g, CX + fall * 0.4, GY - 24 + drop * 0.3, 0, bodyBottom + drop * 0.4);
  }
  if (t < 0.75) {
    drawQuiver(g, CX + fall, bodyY + drop, 0);
    drawBody(g, CX + fall, bodyY + drop, 0);
    drawArms(g, CX + fall, bodyY + drop, 0,
      -Math.PI * 0.2 + t * 0.6,
      -Math.PI * 0.8 + t * 0.4);
  }
  if (t < 0.55) {
    drawHead(g, CX + fall * 1.3, headY + drop * 0.6);
  }

  // Arrows scatter from quiver
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.1 + 0.8;
      const dist = t * 30;
      const ax = CX + fall + Math.cos(a) * dist;
      const ay = headY + drop * 0.4 + Math.sin(a) * dist * 0.5 - (1 - t) * 12;
      line(g, ax, ay, ax + 8, ay - 2, COL_ARROW, 2 * fade);
      // Tiny fletch
      poly(g, [
        ax - 1, ay - 2,
        ax + 2, ay,
        ax - 1, ay + 1,
      ], COL_FLETCH, fade * 0.7);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,   count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

export function generateGiantArcherFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
