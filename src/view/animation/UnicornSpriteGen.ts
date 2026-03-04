// Procedural sprite generator for the Unicorn unit type.
//
// Draws a majestic unicorn at 48x48 pixels per frame using PixiJS
// Graphics -> RenderTexture. Produces textures for every animation
// state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - White/silver horse body viewed from the side (profile)
//   - Golden spiraling horn on forehead
//   - Flowing lavender mane and tail
//   - Silver hooves
//   - Deep blue eyes
//   - Shadow ellipse under feet

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Body
const COL_BODY = 0xf0f0ff;
const COL_BODY_HI = 0xffffff;
const COL_BODY_SH = 0xc0c0d8;

// Horn
const COL_HORN = 0xffd700;
const COL_HORN_HI = 0xffee88;

// Mane and tail
const COL_MANE = 0xccaaff;
const COL_MANE_DK = 0x9977cc;

// Hooves
const COL_HOOF = 0xaaaacc;

// Eye
const COL_EYE = 0x2244aa;

const COL_SHADOW = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}

function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w: number): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

// ---------------------------------------------------------------------------
// Sub-routines -- reusable body parts
// ---------------------------------------------------------------------------

function drawGroundShadow(g: Graphics, ox = 0, scale = 1): void {
  ellipse(g, CX + ox, GY + 1, 14 * scale, 3, COL_SHADOW, 0.3);
}

/** Draw four legs. frontOffset/backOffset shift the front and back pairs vertically for gallop. */
function drawLegs(
  g: Graphics,
  baseY: number,
  frontLeftOff: number,
  frontRightOff: number,
  backLeftOff: number,
  backRightOff: number,
): void {
  const legW = 3;
  const legH = 10;
  const hoofH = 2;

  // Back-left leg (slightly behind body)
  const blX = CX - 8;
  const blY = baseY + backLeftOff;
  rect(g, blX, blY, legW, legH, COL_BODY_SH);
  rect(g, blX, blY + legH, legW, hoofH, COL_HOOF);

  // Back-right leg
  const brX = CX - 4;
  const brY = baseY + backRightOff;
  rect(g, brX, brY, legW, legH, COL_BODY_SH);
  rect(g, brX, brY + legH, legW, hoofH, COL_HOOF);

  // Front-left leg
  const flX = CX + 3;
  const flY = baseY + frontLeftOff;
  rect(g, flX, flY, legW, legH, COL_BODY);
  rect(g, flX, flY + legH, legW, hoofH, COL_HOOF);

  // Front-right leg
  const frX = CX + 7;
  const frY = baseY + frontRightOff;
  rect(g, frX, frY, legW, legH, COL_BODY);
  rect(g, frX, frY + legH, legW, hoofH, COL_HOOF);
}

/** Draw the main horse torso (barrel shape, side view). */
function drawBody(g: Graphics, bob: number): void {
  const bodyY = GY - 24 + bob;
  const bodyW = 22;
  const bodyH = 10;
  const bodyX = CX - 10;

  // Main barrel
  rect(g, bodyX, bodyY, bodyW, bodyH, COL_BODY);
  // Top highlight
  rect(g, bodyX + 1, bodyY, bodyW - 2, 3, COL_BODY_HI);
  // Belly shadow
  rect(g, bodyX + 1, bodyY + bodyH - 2, bodyW - 2, 2, COL_BODY_SH);
}

/** Draw neck and head. neckTilt shifts the head up/down for animation. */
function drawNeckAndHead(g: Graphics, bob: number, neckTilt = 0): void {
  const neckBaseX = CX + 8;
  const neckBaseY = GY - 24 + bob;

  // Neck -- angled rectangle going up-right
  const neckX = neckBaseX;
  const neckTopY = neckBaseY - 10 + neckTilt;
  rect(g, neckX, neckTopY, 5, 12 - neckTilt, COL_BODY);
  rect(g, neckX + 1, neckTopY, 3, 10 - neckTilt, COL_BODY_HI);

  // Head
  const headX = neckX + 1;
  const headY = neckTopY - 6;
  rect(g, headX, headY, 10, 7, COL_BODY);
  rect(g, headX + 1, headY + 1, 8, 5, COL_BODY_HI);
  // Muzzle shadow
  rect(g, headX + 7, headY + 3, 3, 3, COL_BODY_SH);

  // Eye
  rect(g, headX + 3, headY + 2, 2, 2, 0xffffff);
  rect(g, headX + 3.5, headY + 2.5, 1, 1, COL_EYE);

  // Nostril
  rect(g, headX + 9, headY + 4, 1, 1, COL_BODY_SH);

  // Ear
  rect(g, headX + 2, headY - 3, 2, 3, COL_BODY);
  rect(g, headX + 2, headY - 3, 1, 2, COL_BODY_HI);
}

/** Draw the golden spiral horn. */
function drawHorn(g: Graphics, bob: number, neckTilt = 0): void {
  const neckBaseY = GY - 24 + bob;
  const neckTopY = neckBaseY - 10 + neckTilt;
  const headY = neckTopY - 6;

  const hornBaseX = CX + 13;
  const hornBaseY = headY - 1;
  const hornLen = 8;

  // Horn shaft
  line(g, hornBaseX, hornBaseY, hornBaseX + 4, hornBaseY - hornLen, COL_HORN, 2);
  // Horn highlight
  line(g, hornBaseX + 0.5, hornBaseY, hornBaseX + 4.5, hornBaseY - hornLen, COL_HORN_HI, 1);

  // Spiral rings on horn
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const rx = hornBaseX + t * 4;
    const ry = hornBaseY - t * hornLen;
    circle(g, rx, ry, 0.8, COL_HORN_HI, 0.7);
  }
}

/** Draw flowing mane along the neck. */
function drawMane(g: Graphics, bob: number, neckTilt = 0, wave = 0): void {
  const neckBaseY = GY - 24 + bob;
  const neckTopY = neckBaseY - 10 + neckTilt;
  const neckX = CX + 8;

  // Mane strands flowing from top of head down the neck
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const sx = neckX + 4 - t * 2;
    const sy = neckTopY - 4 + t * 12;
    const waveOff = Math.sin(wave + i * 0.8) * 2;
    const strandW = 2.5 - t * 0.4;

    rect(g, sx - 4 + waveOff, sy, strandW, 3, COL_MANE);
    rect(g, sx - 5 + waveOff, sy + 1, strandW - 0.5, 2, COL_MANE_DK);
  }
}

/** Draw the flowing tail at the back of the horse. */
function drawTail(g: Graphics, bob: number, wave = 0): void {
  const tailBaseX = CX - 11;
  const tailBaseY = GY - 22 + bob;

  // Tail strands flowing backward
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const waveOff = Math.sin(wave + i * 0.6) * 2.5;
    const sx = tailBaseX - 2 - t * 4 + waveOff;
    const sy = tailBaseY + t * 6;

    rect(g, sx, sy, 2.5, 3, COL_MANE);
    rect(g, sx - 0.5, sy + 1, 2, 2, COL_MANE_DK);
  }
}

// ---------------------------------------------------------------------------
// Full figure composite
// ---------------------------------------------------------------------------

function drawFullUnicorn(
  g: Graphics,
  bob: number,
  frontLeftOff = 0,
  frontRightOff = 0,
  backLeftOff = 0,
  backRightOff = 0,
  neckTilt = 0,
  maneWave = 0,
  tailWave = 0,
): void {
  drawGroundShadow(g);

  const legBaseY = GY - 14 + bob;
  drawLegs(g, legBaseY, frontLeftOff, frontRightOff, backLeftOff, backRightOff);
  drawBody(g, bob);
  drawTail(g, bob, tailWave);
  drawNeckAndHead(g, bob, neckTilt);
  drawMane(g, bob, neckTilt, maneWave);
  drawHorn(g, bob, neckTilt);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function drawIdleUnicorn(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.8) * 0.5;
  const tailSway = frame * 0.5;

  drawFullUnicorn(g, breathe, 0, 0, 0, 0, 0, frame * 0.3, tailSway);

  // Subtle horn sparkle
  const sparkleAlpha = (Math.sin(frame * 1.2) + 1) * 0.25;
  const neckBaseY = GY - 24 + breathe;
  const hornTipX = CX + 17;
  const hornTipY = neckBaseY - 10 - 6 - 1 - 8;
  circle(g, hornTipX, hornTipY, 1.5, COL_HORN_HI, sparkleAlpha);
}

function drawWalkingUnicorn(g: Graphics, frame: number): void {
  const cycle = (frame % 8) / 8;
  const phase = cycle * Math.PI * 2;
  const bob = Math.sin(phase) * 1.5;

  // Galloping leg cycle -- diagonal pairs alternate
  const frontLeftOff = Math.sin(phase) * 4;
  const frontRightOff = Math.sin(phase + Math.PI) * 4;
  const backLeftOff = Math.sin(phase + Math.PI) * 3.5;
  const backRightOff = Math.sin(phase) * 3.5;

  const neckBob = Math.sin(phase + 0.5) * 1;
  const maneWave = phase;
  const tailWave = phase + 1;

  drawFullUnicorn(
    g,
    bob,
    frontLeftOff,
    frontRightOff,
    backLeftOff,
    backRightOff,
    neckBob,
    maneWave,
    tailWave,
  );
}

function drawAttackingUnicorn(g: Graphics, frame: number): void {
  const t = frame / 6;

  // Rearing up: front legs lift, body tilts, horn thrusts forward
  const rearUp = Math.sin(t * Math.PI) * 6;
  const bodyBob = -rearUp * 0.5;

  drawGroundShadow(g, 0, 1 - t * 0.2);

  const legBaseY = GY - 14 + bodyBob;

  // Back legs planted, front legs raised
  const frontLift = -rearUp * 1.2;
  drawLegs(g, legBaseY, frontLift, frontLift - 1, 0, 1);
  drawBody(g, bodyBob);
  drawTail(g, bodyBob, t * 3);

  // Neck tilts forward for horn thrust
  const neckTilt = -rearUp * 0.4;
  drawNeckAndHead(g, bodyBob, neckTilt);
  drawMane(g, bodyBob, neckTilt, t * 4);
  drawHorn(g, bodyBob, neckTilt);

  // Horn thrust sparkle burst at peak
  if (t > 0.3) {
    const sparkleAlpha = Math.min(1, (t - 0.3) * 2);
    const neckBaseY = GY - 24 + bodyBob;
    const hornTipX = CX + 17;
    const hornTipY = neckBaseY - 10 + neckTilt - 6 - 1 - 8;
    for (let i = 0; i < 5; i++) {
      const angle = t * 3 + i * (Math.PI * 2 / 5);
      const dist = 3 + t * 6;
      const sx = hornTipX + Math.cos(angle) * dist;
      const sy = hornTipY + Math.sin(angle) * dist;
      circle(g, sx, sy, 1.2, COL_HORN_HI, sparkleAlpha * 0.8);
      circle(g, sx, sy, 0.6, 0xffffff, sparkleAlpha);
    }
  }
}

function drawCastingUnicorn(g: Graphics, frame: number): void {
  // Cast is the same as idle
  drawIdleUnicorn(g, frame);
}

function drawDyingUnicorn(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 12;
  const lean = t * 6;
  const fadeAlpha = Math.max(0, 1 - t * 0.3);

  // Shrinking shadow
  ellipse(g, CX + lean * 0.3, GY + 1, 14 - t * 4, 3 - t, COL_SHADOW, 0.3 * fadeAlpha);

  const ox = lean * 0.3;
  const oy = fall;

  // Legs crumpling
  const legBaseY = GY - 14 + oy;
  const legCollapse = t * 5;
  rect(g, CX - 8 + ox, legBaseY, 3, 10 - legCollapse, COL_BODY_SH);
  rect(g, CX - 8 + ox, legBaseY + 10 - legCollapse, 3, 2, COL_HOOF);
  rect(g, CX - 4 + ox, legBaseY + 1, 3, 10 - legCollapse, COL_BODY_SH);
  rect(g, CX - 4 + ox, legBaseY + 11 - legCollapse, 3, 2, COL_HOOF);
  rect(g, CX + 3 + ox, legBaseY, 3, 10 - legCollapse, COL_BODY);
  rect(g, CX + 3 + ox, legBaseY + 10 - legCollapse, 3, 2, COL_HOOF);
  rect(g, CX + 7 + ox, legBaseY + 1, 3, 10 - legCollapse, COL_BODY);
  rect(g, CX + 7 + ox, legBaseY + 11 - legCollapse, 3, 2, COL_HOOF);

  // Body falling
  const bodyY = GY - 24 + oy;
  rect(g, CX - 10 + ox, bodyY, 22, 10, COL_BODY);
  rect(g, CX - 9 + ox, bodyY, 20, 3, COL_BODY_HI);

  // Tail drooping
  for (let i = 0; i < 4; i++) {
    const tt = i / 3;
    rect(g, CX - 13 + ox - tt * 3, bodyY + 2 + tt * 4 + t * 3, 2, 2.5, COL_MANE);
  }

  // Neck collapsing
  const neckX = CX + 8 + ox;
  const neckTopY = bodyY - 8 + fall * 0.4;
  rect(g, neckX, neckTopY, 5, 10, COL_BODY);

  // Head drooping
  const headX = neckX + 1;
  const headY = neckTopY - 4 + fall * 0.3;
  rect(g, headX, headY, 10, 7, COL_BODY);
  // Closed eyes
  rect(g, headX + 3, headY + 3, 2, 0.8, COL_EYE);

  // Horn tilting
  const hornBaseX = headX + 8;
  const hornBaseY = headY - 1;
  line(g, hornBaseX, hornBaseY, hornBaseX + 2 + t * 2, hornBaseY - 6 + t * 3, COL_HORN, 2);

  // Mane limp
  for (let i = 0; i < 4; i++) {
    const mt = i / 3;
    rect(g, neckX - 3 + mt, neckTopY - 2 + mt * 6 + t * 2, 2, 2.5, COL_MANE_DK);
  }

  // Fading sparkles from horn
  if (t < 0.7) {
    const sparkAlpha = (0.7 - t) * 1.2;
    for (let i = 0; i < 3; i++) {
      const angle = frame * 0.5 + i * 2;
      const dist = 3 + t * 10;
      const sx = hornBaseX + 2 + Math.cos(angle) * dist;
      const sy = hornBaseY - 4 + Math.sin(angle) * dist;
      circle(g, sx, sy, 0.8, COL_HORN_HI, sparkAlpha * fadeAlpha);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateUnicornFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();

      switch (state) {
        case UnitState.IDLE:
          drawIdleUnicorn(g, col);
          break;
        case UnitState.MOVE:
          drawWalkingUnicorn(g, col);
          break;
        case UnitState.ATTACK:
          drawAttackingUnicorn(g, col);
          break;
        case UnitState.CAST:
          drawCastingUnicorn(g, col);
          break;
        case UnitState.DIE:
          drawDyingUnicorn(g, col);
          break;
      }

      const texture = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }

  return frames;
}
