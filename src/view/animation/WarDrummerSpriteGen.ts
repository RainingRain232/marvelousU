// Procedural sprite generator for the War Drummer unit type.
//
// Draws a muscular drummer at 48x48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Muscular bare chest with leather vest
//   • Large war drum strapped to front
//   • Two drumsticks
//   • Leather pants and boots
//   • Red headband
//   • Visible impact rings when drumming
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — war drummer
const COL_SKIN       = 0xd4a574;
const COL_SKIN_DK    = 0xb8875a;
const COL_SKIN_HI    = 0xe0bb8a;
const COL_VEST       = 0x775533;
const COL_VEST_DK    = 0x5a3f25;
const COL_VEST_HI    = 0x8a6640;
const COL_DRUM_WOOD  = 0x886644;
const COL_DRUM_DK    = 0x664422;
const COL_DRUM_RIM   = 0x997755;
const COL_DRUMHEAD   = 0xddcc88;
const COL_DRUMHEAD_HI= 0xeedd99;
const COL_STICK      = 0x997744;
const COL_STICK_HI   = 0xbb9966;
const COL_PANTS      = 0x664422;
const COL_BOOT       = 0x553322;
const COL_BOOT_DK    = 0x3a2215;
const COL_HEADBAND   = 0xcc4444;
const COL_HEADBAND_DK= 0x993333;
const COL_STRAP      = 0x665544;
const COL_IMPACT     = 0xffdd88;
const COL_IMPACT_LT  = 0xffeeaa;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow ellipse at feet. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Sturdy boots. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 6, bh = 5 - squash;
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx + 1 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

/** Leather pants. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 5, legH).fill({ color: COL_PANTS });
  g.rect(cx + 0 + stanceR, legTop, 5, legH).fill({ color: COL_PANTS });
  // Belt
  g.rect(cx - 6, legTop - 1, 12, 2).fill({ color: COL_VEST_DK });
  g.rect(cx - 1, legTop - 1, 2, 2).fill({ color: COL_STICK_HI });
}

/** Muscular chest with leather vest. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 15;
  const x = cx - tw / 2 + tilt;
  // Bare skin chest (wider, muscular)
  g.roundRect(x + 1, torsoTop, tw - 2, torsoH, 2)
    .fill({ color: COL_SKIN });
  // Chest muscle definition
  g.moveTo(cx + tilt, torsoTop + 2)
    .lineTo(cx + tilt, torsoTop + torsoH - 2)
    .stroke({ color: COL_SKIN_DK, width: 0.5, alpha: 0.4 });
  g.moveTo(x + 3, torsoTop + 4)
    .bezierCurveTo(x + 5, torsoTop + 3, x + tw / 2, torsoTop + 5, cx + tilt, torsoTop + 6)
    .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.3 });
  g.moveTo(x + tw - 3, torsoTop + 4)
    .bezierCurveTo(x + tw - 5, torsoTop + 3, x + tw / 2, torsoTop + 5, cx + tilt, torsoTop + 6)
    .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.3 });

  // Leather vest (open front)
  g.moveTo(x, torsoTop)
    .lineTo(x + 3, torsoTop)
    .lineTo(x + 3, torsoTop + torsoH)
    .lineTo(x, torsoTop + torsoH)
    .closePath()
    .fill({ color: COL_VEST })
    .stroke({ color: COL_VEST_DK, width: 0.5 });
  g.moveTo(x + tw, torsoTop)
    .lineTo(x + tw - 3, torsoTop)
    .lineTo(x + tw - 3, torsoTop + torsoH)
    .lineTo(x + tw, torsoTop + torsoH)
    .closePath()
    .fill({ color: COL_VEST })
    .stroke({ color: COL_VEST_DK, width: 0.5 });
  // Vest highlight
  g.rect(x + 1, torsoTop + 1, 2, 3).fill({ color: COL_VEST_HI, alpha: 0.3 });
  g.rect(x + tw - 3, torsoTop + 1, 2, 3).fill({ color: COL_VEST_HI, alpha: 0.3 });

  // Drum strap across chest
  g.moveTo(x + 2, torsoTop + 1)
    .lineTo(x + tw - 2, torsoTop + torsoH - 1)
    .stroke({ color: COL_STRAP, width: 1.5 });
}

/** Head with red headband. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
): void {
  const hw = 10, hh = 9;
  const x = cx - hw / 2 + tilt;
  // Face
  g.ellipse(cx + tilt, headTop + hh * 0.55, hw * 0.46, hh * 0.48)
    .fill({ color: COL_SKIN });
  // Short hair
  g.roundRect(x, headTop, hw, 4, 2)
    .fill({ color: 0x332211 });
  // Red headband
  g.roundRect(x - 1, headTop + 2, hw + 2, 3, 1)
    .fill({ color: COL_HEADBAND })
    .stroke({ color: COL_HEADBAND_DK, width: 0.5 });
  // Headband knot tail
  g.moveTo(x + hw + 1, headTop + 3)
    .lineTo(x + hw + 3, headTop + 5)
    .stroke({ color: COL_HEADBAND, width: 1 });
  // Eyes — determined
  g.rect(x + 2, headTop + 5, 2, 1.2).fill({ color: 0x1a1a1a });
  g.rect(x + hw - 4, headTop + 5, 2, 1.2).fill({ color: 0x1a1a1a });
  // Jaw / chin
  g.ellipse(cx + tilt, headTop + hh - 1, 3, 1.5).fill({ color: COL_SKIN_DK, alpha: 0.2 });
}

/** War drum strapped to front. */
function drawDrum(
  g: Graphics,
  cx: number,
  drumTop: number,
  drumH: number,
  vibrate = 0,
  tilt = 0,
): void {
  const dw = 14;
  const x = cx - dw / 2 + tilt;
  // Drum body (wood barrel shape)
  g.roundRect(x + vibrate * 0.5, drumTop, dw - vibrate, drumH, 2)
    .fill({ color: COL_DRUM_WOOD })
    .stroke({ color: COL_DRUM_DK, width: 0.8 });
  // Wood grain lines
  g.moveTo(x + 3, drumTop + 2).lineTo(x + 3, drumTop + drumH - 2)
    .stroke({ color: COL_DRUM_DK, width: 0.4, alpha: 0.4 });
  g.moveTo(x + dw - 3, drumTop + 2).lineTo(x + dw - 3, drumTop + drumH - 2)
    .stroke({ color: COL_DRUM_DK, width: 0.4, alpha: 0.4 });
  // Metal rims
  g.rect(x, drumTop, dw, 2).fill({ color: COL_DRUM_RIM })
    .stroke({ color: COL_DRUM_DK, width: 0.3 });
  g.rect(x, drumTop + drumH - 2, dw, 2).fill({ color: COL_DRUM_RIM })
    .stroke({ color: COL_DRUM_DK, width: 0.3 });
  // Drumhead (top face — visible as ellipse)
  g.ellipse(cx + tilt, drumTop + 1, dw * 0.45, 2)
    .fill({ color: COL_DRUMHEAD })
    .stroke({ color: COL_DRUM_RIM, width: 0.5 });
  // Drumhead highlight
  g.ellipse(cx + tilt - 1, drumTop, dw * 0.25, 1)
    .fill({ color: COL_DRUMHEAD_HI, alpha: 0.4 });
}

/** Muscular arm holding drumstick. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Muscular arm (thicker)
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 3.5 });
  // Muscle highlight
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2).fill({ color: COL_SKIN_HI, alpha: 0.25 });
  // Hand
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });
}

/** Drumstick. */
function drawDrumstick(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  len = 10,
): void {
  const tipX = baseX + Math.sin(angle) * len;
  const tipY = baseY - Math.cos(angle) * len;
  // Stick shaft
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_STICK, width: 2 });
  // Stick highlight
  g.moveTo(baseX, baseY - 0.5).lineTo(tipX, tipY - 0.5)
    .stroke({ color: COL_STICK_HI, width: 0.5, alpha: 0.5 });
  // Tip (ball)
  g.circle(tipX, tipY, 1.8)
    .fill({ color: COL_STICK })
    .stroke({ color: COL_STICK_HI, width: 0.5 });
}

/** Impact ring radiating from drum. */
function drawImpactRings(
  g: Graphics,
  cx: number,
  cy: number,
  count: number,
  maxRadius: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const r = (i + 1) / count * maxRadius;
    const ringAlpha = alpha * (1 - i / count);
    g.ellipse(cx, cy, r, r * 0.3)
      .stroke({ color: COL_IMPACT, width: 1.5 - i * 0.3, alpha: ringAlpha });
    // Inner ring glow
    if (i === 0) {
      g.ellipse(cx, cy, r * 0.8, r * 0.24)
        .stroke({ color: COL_IMPACT_LT, width: 0.8, alpha: ringAlpha * 0.5 });
    }
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const drumH = 8;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const headTop = torsoTop - 9 + bob;
  const drumTop = torsoTop + torsoH - 2;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawDrum(g, CX, drumTop, drumH, 0);
  drawHead(g, CX, headTop);

  // Arms at rest — drumsticks held loosely
  // Left arm
  drawArm(g, CX - 7, torsoTop + 3, CX - 10, drumTop - 2 + bob);
  drawDrumstick(g, CX - 10, drumTop - 2 + bob, -0.3 + t * 0.1, 9);

  // Right arm
  drawArm(g, CX + 7, torsoTop + 3, CX + 10, drumTop - 2 + bob);
  drawDrumstick(g, CX + 10, drumTop - 2 + bob, 0.3 - t * 0.1, 9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 2;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const drumH = 8;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const headTop = torsoTop - 9;
  const drumTop = torsoTop + torsoH - 2;

  // Drum beat in rhythm — hits on each footfall
  const drumHit = Math.abs(walkCycle) > 0.85;
  const vibrate = drumHit ? 1 : 0;

  drawShadow(g, CX, gy2, 14 + Math.abs(walkCycle) * 2, 4);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.4);
  drawDrum(g, CX, drumTop, drumH, vibrate, walkCycle * 0.4);
  drawHead(g, CX, headTop, walkCycle * 0.3);

  // Arms alternate drumming with march
  const leftStickAngle = walkCycle > 0.5 ? -1.0 : -0.3;
  const rightStickAngle = walkCycle < -0.5 ? 1.0 : 0.3;

  // Left arm
  const leftArmY = drumHit && walkCycle > 0 ? drumTop - 4 : drumTop - 1;
  drawArm(g, CX - 7 + walkCycle * 0.4, torsoTop + 3, CX - 9, leftArmY);
  drawDrumstick(g, CX - 9, leftArmY, leftStickAngle, 9);

  // Right arm
  const rightArmY = drumHit && walkCycle < 0 ? drumTop - 4 : drumTop - 1;
  drawArm(g, CX + 7 + walkCycle * 0.4, torsoTop + 3, CX + 9, rightArmY);
  drawDrumstick(g, CX + 9, rightArmY, rightStickAngle, 9);

  // Impact ring on drum beat
  if (drumHit) {
    drawImpactRings(g, CX, drumTop - 1, 2, 8, 0.3);
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=ready, 1-2=raise sticks, 3=strike hard, 4-5=impact rings, 6=recover
  const phases = [0, 0.14, 0.28, 0.43, 0.58, 0.78, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const drumH = 8;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;
  const drumTop = torsoTop + torsoH - 2;

  // Vibrate drum on hit
  const isHit = t >= 0.4 && t <= 0.65;
  const vibrate = isHit ? 2 : 0;

  // Lean into strike
  const lean = t > 0.2 && t < 0.6 ? 1 : 0;

  drawShadow(g, CX, gy2, 14 + lean, 4);
  drawBoots(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.5);
  drawDrum(g, CX, drumTop, drumH, vibrate, lean * 0.5);
  drawHead(g, CX, headTop, lean * 0.3);

  // Both sticks raise high then strike down together
  let stickAngleL: number, stickAngleR: number;
  let armYL: number, armYR: number;

  if (t < 0.28) {
    // Raise sticks
    const raiseT = t / 0.28;
    stickAngleL = lerp(-0.3, -2.0, raiseT);
    stickAngleR = lerp(0.3, 2.0, raiseT);
    armYL = lerp(drumTop - 1, drumTop - 8, raiseT);
    armYR = lerp(drumTop - 1, drumTop - 8, raiseT);
  } else if (t < 0.5) {
    // Strike down hard
    const strikeT = (t - 0.28) / 0.22;
    stickAngleL = lerp(-2.0, -0.1, strikeT);
    stickAngleR = lerp(2.0, 0.1, strikeT);
    armYL = lerp(drumTop - 8, drumTop - 2, strikeT);
    armYR = lerp(drumTop - 8, drumTop - 2, strikeT);
  } else {
    // Recover
    const recT = (t - 0.5) / 0.5;
    stickAngleL = lerp(-0.1, -0.3, recT);
    stickAngleR = lerp(0.1, 0.3, recT);
    armYL = lerp(drumTop - 2, drumTop - 1, recT);
    armYR = lerp(drumTop - 2, drumTop - 1, recT);
  }

  drawArm(g, CX - 7, torsoTop + 3, CX - 9, armYL);
  drawDrumstick(g, CX - 9, armYL, stickAngleL, 10);
  drawArm(g, CX + 7, torsoTop + 3, CX + 9, armYR);
  drawDrumstick(g, CX + 9, armYR, stickAngleR, 10);

  // Massive impact rings radiating from drum on hit
  if (t >= 0.4 && t <= 0.85) {
    const impactT = (t - 0.4) / 0.45;
    const ringCount = 3;
    const maxR = 8 + impactT * 16;
    drawImpactRings(g, CX, drumTop - 2, ringCount, maxR, 0.6 - impactT * 0.5);

    // Shockwave particles
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI / 2;
      const dist = impactT * 18;
      g.circle(CX + Math.cos(angle) * dist, drumTop - 2 + Math.sin(angle) * dist * 0.3, 1)
        .fill({ color: COL_IMPACT_LT, alpha: 0.5 - impactT * 0.4 });
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: rapid drumroll — multiple impact rings, drum vibrates continuously
  const t = frame / 5;
  const rollSpeed = t * 6; // fast alternating hits

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const drumH = 8;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;
  const drumTop = torsoTop + torsoH - 2;

  // Continuous vibration during drumroll
  const vibrate = 1 + Math.sin(rollSpeed * Math.PI * 4) * 0.5;

  drawShadow(g, CX, gy2, 14 + t * 4, 4 + t);
  drawBoots(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawDrum(g, CX, drumTop, drumH, vibrate);
  drawHead(g, CX, headTop);

  // Alternating rapid drumstick hits
  const altPhase = Math.sin(rollSpeed * Math.PI * 3);
  const leftDown = altPhase > 0;
  const rightDown = altPhase < 0;

  const leftY = leftDown ? drumTop - 1 : drumTop - 6;
  const rightY = rightDown ? drumTop - 1 : drumTop - 6;
  const leftAngle = leftDown ? -0.1 : -1.5;
  const rightAngle = rightDown ? 0.1 : 1.5;

  drawArm(g, CX - 7, torsoTop + 3, CX - 8, leftY);
  drawDrumstick(g, CX - 8, leftY, leftAngle, 9);
  drawArm(g, CX + 7, torsoTop + 3, CX + 8, rightY);
  drawDrumstick(g, CX + 8, rightY, rightAngle, 9);

  // Multiple expanding impact rings — rapid succession
  const ringCount = 2 + Math.round(t * 3);
  const maxR = 10 + t * 14;
  drawImpactRings(g, CX, drumTop - 2, ringCount, maxR, 0.4 + t * 0.2);

  // Drumhead glow from intensity
  g.ellipse(CX, drumTop, 6, 2)
    .fill({ color: COL_IMPACT, alpha: 0.1 + t * 0.15 });

  // Vibration particles flying off drum
  if (t > 0.2) {
    for (let i = 0; i < 4; i++) {
      const pAngle = (i / 4) * Math.PI * 2 + t * 8;
      const pDist = 6 + t * 8;
      const py = drumTop - 3 - (t - 0.2) * 6 * ((i % 2) + 0.5);
      g.circle(CX + Math.cos(pAngle) * pDist * 0.6, py, 0.8)
        .fill({ color: COL_IMPACT_LT, alpha: 0.4 * (1 - t * 0.4) });
    }
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: falls forward, drum rolls away, sticks drop
  const t = frame / 6;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const drumH = 8;
  const legTop = gy2 - 5 - legH;

  // Falls forward
  const fallForward = t * 10;
  const dropY = t * t * 6;
  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;
  const drumTop = torsoTop + torsoH - 2;

  drawShadow(g, CX + fallForward * 0.3, gy2, 14 + t * 3, 4);

  // Legs buckle
  if (t < 0.8) {
    const squash = Math.round(t * 3);
    drawBoots(g, CX + fallForward * 0.2, gy2, t * 2, -t, squash);
    drawLegs(g, CX + fallForward * 0.2, legTop + dropY * 0.3,
      legH * (1 - t * 0.3), t * 2, -t);
  }

  // Torso falls forward
  if (t < 0.9) {
    drawTorso(g, CX + fallForward * 0.4, torsoTop, torsoH * (1 - t * 0.15), t * 3);
    drawHead(g, CX + fallForward * 0.5, headTop + dropY * 0.3, t * 4);
  }

  // Drum detaches and rolls away
  if (t < 0.4) {
    // Still attached
    drawDrum(g, CX + fallForward * 0.3, drumTop, drumH, 0, t * 2);
  } else {
    // Rolling away
    const rollT = (t - 0.4) / 0.6;
    const drumRollX = CX + 6 + rollT * 14;
    const drumRollY = gy2 - drumH - 1 + Math.sin(rollT * Math.PI * 3) * 2;
    // Simplified rolling drum
    g.roundRect(drumRollX - 6, drumRollY, 12, drumH, 2)
      .fill({ color: COL_DRUM_WOOD, alpha: 1 - rollT * 0.3 })
      .stroke({ color: COL_DRUM_DK, width: 0.6, alpha: 1 - rollT * 0.3 });
    g.ellipse(drumRollX, drumRollY + 1, 5, 1.5)
      .fill({ color: COL_DRUMHEAD, alpha: 1 - rollT * 0.3 });
  }

  // Drumsticks drop and scatter
  if (t < 0.65) {
    // Left stick falls left
    const stickL_X = CX - 10 - t * 6;
    const stickL_Y = torsoTop + 4 + t * t * 12;
    drawDrumstick(g, stickL_X, stickL_Y, -0.5 - t * 2, 9);

    // Right stick falls right
    const stickR_X = CX + 10 + t * 8;
    const stickR_Y = torsoTop + 3 + t * t * 14;
    drawDrumstick(g, stickR_X, stickR_Y, 0.5 + t * 2.5, 9);
  }

  // Sticks on ground in late frames
  if (t > 0.5) {
    // Left stick on ground
    g.moveTo(CX - 14, gy2 - 2).lineTo(CX - 6, gy2 - 1)
      .stroke({ color: COL_STICK, width: 1.5, alpha: 0.7 });
    // Right stick on ground
    g.moveTo(CX + 12, gy2 - 1).lineTo(CX + 20, gy2 - 2)
      .stroke({ color: COL_STICK, width: 1.5, alpha: 0.7 });
  }

  // Arms flail during fall
  if (t < 0.7) {
    drawArm(g, CX - 7 + fallForward * 0.4, torsoTop + 3,
      CX - 12 + fallForward * 0.2, torsoTop + 6 + t * 6);
    drawArm(g, CX + 7 + fallForward * 0.4, torsoTop + 3,
      CX + 12 + fallForward * 0.6, torsoTop + 5 + t * 5);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 7 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

/**
 * Generate all War Drummer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateWarDrummerFrames(
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
