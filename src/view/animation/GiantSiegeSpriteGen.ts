// Procedural sprite generator for the Giant Siege unit.
//
// 96x144 pixel frames (2w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A colossal boulder-throwing giant — the biggest, most brutish of the giants.
// Massive hunched humanoid with rough stone-like gray-brown skin, iron bands
// wrapped around arms/torso, animal hide loincloth, heavy brow, small glowing
// eyes, tusks, thick stubby legs with iron ankle bands, rubble/debris at feet.
// Holding a massive boulder in both hands (attack = hurling it).
// States: IDLE 8, MOVE 8, ATTACK 6, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;  // 2 tiles wide
const FH = 144; // 3 tiles tall
const CX = FW / 2;
const GY = FH - 6;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const COL_SKIN       = 0x8a7a68; // gray-brown stone-like skin
const COL_SKIN_DK    = 0x6a5a48; // skin shadow
const COL_SKIN_HI    = 0xa89a82; // skin highlight
const COL_SKIN_CRACK = 0x5a4a38; // cracks in skin (rocky texture)

const COL_IRON       = 0x666666; // iron bands / fittings
const COL_IRON_DK    = 0x444444; // iron shadow
const COL_IRON_HI    = 0x888888; // iron highlight
const COL_IRON_RIVET = 0x999999; // rivet / stud

const COL_HIDE       = 0x6b5030; // animal hide loincloth
const COL_HIDE_DK    = 0x4a3520; // hide shadow
const COL_HIDE_HI    = 0x8a6a42; // hide highlight

const COL_EYE        = 0xff6622; // small glowing eyes
const COL_EYE_GLOW   = 0xff9944; // eye glow halo

const COL_TUSK       = 0xe8dcc0; // tusks
const COL_TUSK_DK    = 0xc8b8a0; // tusk shadow

const COL_BOULDER    = 0x7a7a72; // boulder main
const COL_BOULDER_DK = 0x5a5a52; // boulder shadow
const COL_BOULDER_HI = 0x9a9a90; // boulder highlight
const COL_BOULDER_CR = 0x4a4a42; // boulder cracks

const COL_RUBBLE     = 0x6a6a62; // rubble at feet
const COL_RUBBLE_DK  = 0x4a4a44; // rubble shadow

const COL_SHADOW     = 0x000000;

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
// Sub-components
// ---------------------------------------------------------------------------

function drawGroundShadow(g: Graphics, cx: number, gy: number, rx = 34, ry = 9, alpha = 0.3): void {
  ellipse(g, cx, gy + 2, rx, ry, COL_SHADOW, alpha);
}

function drawRubble(g: Graphics, cx: number, gy: number): void {
  // Scattered rubble/debris at feet
  const stones = [
    [-28, -2, 4, 3], [-20, 0, 3, 2], [-14, 1, 5, 3],
    [14, -1, 4, 3], [22, 0, 3, 2], [28, 1, 4, 2],
    [-8, 2, 3, 2], [6, 1, 4, 3], [0, 3, 3, 2],
  ];
  for (const [dx, dy, rx, ry] of stones) {
    ellipse(g, cx + dx, gy + dy, rx, ry, COL_RUBBLE);
    ellipse(g, cx + dx - 0.5, gy + dy - 0.5, rx * 0.6, ry * 0.5, COL_RUBBLE_DK, 0.3);
  }
}

function drawHead(g: Graphics, x: number, y: number, tilt = 0): void {
  const hx = x + tilt;

  // Massive, heavy-browed head — wider than tall, very brutish
  // Skull
  ellipse(g, hx, y, 16, 14, COL_SKIN);
  // Rocky skin texture — cracks across skull
  line(g, hx - 8, y - 6, hx - 3, y - 2, COL_SKIN_CRACK, 1);
  line(g, hx + 5, y - 8, hx + 9, y - 3, COL_SKIN_CRACK, 1);
  line(g, hx - 10, y + 2, hx - 5, y + 6, COL_SKIN_CRACK, 0.8);
  // Highlight on dome
  ellipse(g, hx - 2, y - 6, 8, 5, COL_SKIN_HI, 0.2);

  // Heavy brow ridge — huge overhanging ridge
  poly(g, [
    hx - 16, y - 2,
    hx + 16, y - 2,
    hx + 14, y + 4,
    hx - 14, y + 4,
  ], COL_SKIN_DK);
  // Brow ridge highlight
  rect(g, hx - 14, y - 2, 28, 2, COL_SKIN_HI, 0.15);

  // Small glowing eyes deep-set under brow
  circle(g, hx - 6, y + 1, 2.5, COL_EYE);
  circle(g, hx + 6, y + 1, 2.5, COL_EYE);
  // Eye glow halo
  circle(g, hx - 6, y + 1, 4, COL_EYE_GLOW, 0.25);
  circle(g, hx + 6, y + 1, 4, COL_EYE_GLOW, 0.25);

  // Flat nose — wide brutish nose
  poly(g, [
    hx - 3, y + 2,
    hx + 3, y + 2,
    hx + 4, y + 8,
    hx - 4, y + 8,
  ], COL_SKIN_DK);

  // Wide mouth / jaw
  rect(g, hx - 10, y + 9, 20, 4, COL_SKIN_DK);

  // Tusks — protruding upward from lower jaw
  poly(g, [
    hx - 9, y + 9,
    hx - 7, y + 2,
    hx - 5, y + 9,
  ], COL_TUSK);
  line(g, hx - 8, y + 3, hx - 7, y + 8, COL_TUSK_DK, 0.8);
  poly(g, [
    hx + 5, y + 9,
    hx + 7, y + 2,
    hx + 9, y + 9,
  ], COL_TUSK);
  line(g, hx + 8, y + 3, hx + 7, y + 8, COL_TUSK_DK, 0.8);

  // Chin / lower jaw
  ellipse(g, hx, y + 14, 10, 4, COL_SKIN);
  ellipse(g, hx, y + 14, 8, 3, COL_SKIN_DK, 0.2);
}

function drawTorso(g: Graphics, cx: number, topY: number, h: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  const w = 44; // Very wide, stocky

  // Main torso — massive barrel chest, hunched
  g.roundRect(x - w / 2, topY, w, h + breathe * 0.5, 6).fill({ color: COL_SKIN });
  // Skin highlight
  ellipse(g, x - 4, topY + h * 0.3, w * 0.2, h * 0.2, COL_SKIN_HI, 0.2);
  // Rocky skin crack texture on torso
  line(g, x - 16, topY + 8, x - 10, topY + 18, COL_SKIN_CRACK, 1);
  line(g, x + 12, topY + 6, x + 16, topY + 16, COL_SKIN_CRACK, 1);
  line(g, x - 8, topY + h * 0.6, x - 2, topY + h * 0.8, COL_SKIN_CRACK, 0.8);
  line(g, x + 4, topY + h * 0.5, x + 10, topY + h * 0.7, COL_SKIN_CRACK, 0.8);

  // Iron bands wrapped around torso — horizontal straps
  const bandY1 = topY + 8;
  const bandY2 = topY + h * 0.45;
  const bandY3 = topY + h * 0.75;
  rect(g, x - w / 2 + 2, bandY1, w - 4, 4, COL_IRON);
  rect(g, x - w / 2 + 2, bandY1, w - 4, 1.5, COL_IRON_HI, 0.2);
  rect(g, x - w / 2 + 2, bandY2, w - 4, 4, COL_IRON);
  rect(g, x - w / 2 + 2, bandY2, w - 4, 1.5, COL_IRON_HI, 0.2);
  rect(g, x - w / 2 + 2, bandY3, w - 4, 4, COL_IRON);
  rect(g, x - w / 2 + 2, bandY3, w - 4, 1.5, COL_IRON_HI, 0.2);

  // Rivets on iron bands
  circle(g, x - 16, bandY1 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x + 16, bandY1 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x - 16, bandY2 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x + 16, bandY2 + 2, 1.5, COL_IRON_RIVET);

  // Vertical iron strap (cross-brace)
  rect(g, x - 2, topY + 4, 4, h - 8, COL_IRON_DK);
  rect(g, x - 1, topY + 4, 2, h - 8, COL_IRON_HI, 0.15);
}

function drawHideLoincloth(g: Graphics, cx: number, waistY: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  // Ragged animal hide hanging from waist
  poly(g, [
    x - 20, waistY,
    x + 20, waistY,
    x + 24, waistY + 20 + breathe * 0.3,
    x + 16, waistY + 26 + breathe * 0.4,
    x + 4, waistY + 22 + breathe * 0.3,
    x - 6, waistY + 28 + breathe * 0.5,
    x - 16, waistY + 24 + breathe * 0.3,
    x - 24, waistY + 18 + breathe * 0.2,
  ], COL_HIDE);
  // Hide texture / shading
  poly(g, [
    x - 18, waistY + 2,
    x + 18, waistY + 2,
    x + 14, waistY + 10,
    x - 14, waistY + 10,
  ], COL_HIDE_DK, 0.3);
  // Ragged edge highlight
  line(g, x - 22, waistY + 18, x - 14, waistY + 24, COL_HIDE_HI, 0.8);
  line(g, x + 14, waistY + 22, x + 22, waistY + 18, COL_HIDE_HI, 0.8);
  // Fur trim at waist
  for (let i = -18; i <= 18; i += 4) {
    line(g, x + i, waistY - 1, x + i + 1, waistY + 3, COL_HIDE_DK, 0.8);
  }
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
): void {
  // Very thick brutish arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 14 });
  g.moveTo(sx + 1, sy + 1).lineTo(ex + 1, ey + 1).stroke({ color: COL_SKIN_DK, width: 3, alpha: 0.4 });
  // Rocky texture cracks on arm
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  line(g, mx - 3, my - 2, mx + 2, my + 3, COL_SKIN_CRACK, 0.8);

  // Iron band on upper arm
  circle(g, sx + (ex - sx) * 0.25, sy + (ey - sy) * 0.25, 8, COL_IRON);
  circle(g, sx + (ex - sx) * 0.25, sy + (ey - sy) * 0.25, 6, COL_IRON_HI, 0.2);
  circle(g, sx + (ex - sx) * 0.25, sy + (ey - sy) * 0.25, 2, COL_IRON_RIVET, 0.6);

  // Iron band on wrist
  circle(g, sx + (ex - sx) * 0.8, sy + (ey - sy) * 0.8, 8, COL_IRON);
  circle(g, sx + (ex - sx) * 0.8, sy + (ey - sy) * 0.8, 6, COL_IRON_HI, 0.2);

  // Fist
  circle(g, ex, ey, 8, COL_SKIN);
  circle(g, ex - 1, ey - 1, 6, COL_SKIN_HI, 0.2);
  // Knuckle ridges
  circle(g, ex - 3, ey - 3, 2.5, COL_SKIN_DK, 0.5);
  circle(g, ex + 2, ey - 3, 2.5, COL_SKIN_DK, 0.5);
}

function drawBoulder(g: Graphics, x: number, y: number, size = 16): void {
  // Massive rough boulder
  ellipse(g, x, y, size, size * 0.85, COL_BOULDER);
  // Highlight on top
  ellipse(g, x - size * 0.2, y - size * 0.25, size * 0.5, size * 0.35, COL_BOULDER_HI, 0.3);
  // Shadow on bottom
  ellipse(g, x + size * 0.1, y + size * 0.2, size * 0.6, size * 0.3, COL_BOULDER_DK, 0.3);
  // Cracks on surface
  line(g, x - size * 0.5, y - size * 0.1, x + size * 0.1, y + size * 0.3, COL_BOULDER_CR, 1.5);
  line(g, x - size * 0.2, y - size * 0.4, x + size * 0.3, y + size * 0.1, COL_BOULDER_CR, 1);
  line(g, x + size * 0.1, y - size * 0.2, x + size * 0.4, y + size * 0.2, COL_BOULDER_CR, 0.8);
  // Small rock chips / texture
  circle(g, x - size * 0.3, y + size * 0.1, 2, COL_BOULDER_DK, 0.4);
  circle(g, x + size * 0.25, y - size * 0.15, 1.5, COL_BOULDER_DK, 0.3);
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 14; // Very thick stubby legs

  // Left leg — thick, stubby
  g.roundRect(cx - 16 + stanceL, legTop, lw, legH, 4).fill({ color: COL_SKIN });
  g.roundRect(cx - 15 + stanceL, legTop + 2, lw - 4, legH - 4, 3).fill({ color: COL_SKIN_DK, alpha: 0.25 });
  // Rocky texture
  line(g, cx - 12 + stanceL, legTop + legH * 0.3, cx - 8 + stanceL, legTop + legH * 0.5, COL_SKIN_CRACK, 0.8);
  // Iron ankle band
  rect(g, cx - 17 + stanceL, legTop + legH - 8, lw + 2, 5, COL_IRON);
  rect(g, cx - 16 + stanceL, legTop + legH - 8, lw, 2, COL_IRON_HI, 0.2);
  circle(g, cx - 9 + stanceL, legTop + legH - 6, 1.5, COL_IRON_RIVET, 0.6);

  // Right leg
  g.roundRect(cx + 2 + stanceR, legTop, lw, legH, 4).fill({ color: COL_SKIN });
  g.roundRect(cx + 3 + stanceR, legTop + 2, lw - 4, legH - 4, 3).fill({ color: COL_SKIN_DK, alpha: 0.25 });
  line(g, cx + 6 + stanceR, legTop + legH * 0.3, cx + 10 + stanceR, legTop + legH * 0.5, COL_SKIN_CRACK, 0.8);
  rect(g, cx + 1 + stanceR, legTop + legH - 8, lw + 2, 5, COL_IRON);
  rect(g, cx + 2 + stanceR, legTop + legH - 8, lw, 2, COL_IRON_HI, 0.2);
  circle(g, cx + 9 + stanceR, legTop + legH - 6, 1.5, COL_IRON_RIVET, 0.6);
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Heavy bare feet with thick toes
  // Left foot
  ellipse(g, cx - 10 + stanceL, gy - 3, 10, 5, COL_SKIN);
  ellipse(g, cx - 10 + stanceL, gy - 3, 8, 3, COL_SKIN_DK, 0.2);
  // Toes
  circle(g, cx - 16 + stanceL, gy - 1, 2.5, COL_SKIN);
  circle(g, cx - 12 + stanceL, gy, 2.5, COL_SKIN);
  circle(g, cx - 8 + stanceL, gy, 2, COL_SKIN);

  // Right foot
  ellipse(g, cx + 10 + stanceR, gy - 3, 10, 5, COL_SKIN);
  ellipse(g, cx + 10 + stanceR, gy - 3, 8, 3, COL_SKIN_DK, 0.2);
  circle(g, cx + 8 + stanceR, gy, 2, COL_SKIN);
  circle(g, cx + 12 + stanceR, gy, 2.5, COL_SKIN);
  circle(g, cx + 16 + stanceR, gy - 1, 2.5, COL_SKIN);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 2;

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 + breathe;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  drawGroundShadow(g, CX, GY);
  drawRubble(g, CX, GY);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawHideLoincloth(g, CX, waistY, breathe);
  drawTorso(g, CX, torsoTop, torsoH, breathe);

  // Both arms forward, holding boulder
  const boulderY = shoulderY + 18 + breathe * 0.5;
  const boulderX = CX;
  drawArm(g, CX - 22, shoulderY + 6, CX - 14, boulderY);
  drawArm(g, CX + 22, shoulderY + 6, CX + 14, boulderY);
  drawBoulder(g, boulderX, boulderY - 2, 14 + breathe * 0.3);

  drawHead(g, CX, headY);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 4;

  const legH = 20;
  const torsoH = 44;
  const stanceL = Math.round(walk * 5);
  const stanceR = Math.round(-walk * 5);
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 - Math.round(bob * 0.3);
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  // Heavier shadow on impact frames
  if (Math.abs(walk) > 0.8) {
    drawGroundShadow(g, CX, GY, 38, 11, 0.35);
  } else {
    drawGroundShadow(g, CX, GY, 34 + Math.abs(walk) * 4, 9);
  }

  drawRubble(g, CX, GY);
  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawHideLoincloth(g, CX, waistY, bob * 0.3, walk * 0.4);
  drawTorso(g, CX, torsoTop, torsoH, bob * 0.3, walk * 0.5);

  // Arms hold boulder while walking — sway with gait
  const armSwing = walk * 3;
  const boulderY = shoulderY + 18;
  drawArm(g, CX - 22 + walk * 0.4, shoulderY + 6, CX - 14 - armSwing, boulderY);
  drawArm(g, CX + 22 + walk * 0.4, shoulderY + 6, CX + 14 + armSwing, boulderY);
  drawBoulder(g, CX, boulderY - 2, 14);

  drawHead(g, CX, headY, walk * 0.4);

  // Ground impact dust on heavy steps
  if (Math.abs(walk) > 0.9) {
    const dustX = walk > 0 ? CX - 14 + stanceL : CX + 14 + stanceR;
    for (let i = 0; i < 4; i++) {
      const dx = dustX + (i - 1.5) * 6;
      const dy = GY - 2 - i * 2;
      circle(g, dx, dy, 3 - i * 0.5, COL_SHADOW, 0.1);
    }
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 6 frames: wind up → lift boulder overhead → hurl forward
  const t = frame / 5; // 0..1 over 6 frames (0..5)

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  let lean = 0;
  let boulderX = CX;
  let boulderY = shoulderY + 18;
  let boulderSize = 14;
  let showBoulder = true;
  let armLX: number, armLY: number, armRX: number, armRY: number;

  if (t < 0.3) {
    // Wind-up: lean back, lift boulder overhead
    const p = t / 0.3;
    lean = -p * 5;
    boulderX = CX + lean * 0.5;
    boulderY = shoulderY + 18 - p * 40;
    armLX = CX - 14 + lean * 0.3 - p * 4;
    armLY = boulderY + 4;
    armRX = CX + 14 + lean * 0.3 + p * 4;
    armRY = boulderY + 4;
  } else if (t < 0.5) {
    // Hold overhead — peak of windup
    const p = (t - 0.3) / 0.2;
    lean = -5 + p * 2;
    boulderX = CX + lean * 0.5;
    boulderY = shoulderY - 22 - p * 4;
    armLX = CX - 18 + lean * 0.3;
    armLY = boulderY + 4;
    armRX = CX + 18 + lean * 0.3;
    armRY = boulderY + 4;
  } else if (t < 0.7) {
    // Hurl forward — fast swing
    const p = (t - 0.5) / 0.2;
    lean = -3 + p * 12;
    boulderX = CX + 10 + p * 30;
    boulderY = shoulderY - 26 + p * 20;
    boulderSize = 14 - p * 4; // boulder shrinks as it flies away
    armLX = CX - 10 + lean * 0.5 + p * 12;
    armLY = shoulderY + 4 + p * 6;
    armRX = CX + 10 + lean * 0.5 + p * 12;
    armRY = shoulderY + 4 + p * 6;
    if (p > 0.5) {
      showBoulder = true; // still visible flying away
    }
  } else {
    // Recovery — boulder is gone, flying off-screen
    const p = (t - 0.7) / 0.3;
    lean = 9 - p * 9;
    showBoulder = false; // boulder has left
    armLX = CX - 10 + lean * 0.3 - p * 4;
    armLY = shoulderY + 10 - p * 6;
    armRX = CX + 10 + lean * 0.3 + p * 4;
    armRY = shoulderY + 10 - p * 6;
  }

  drawGroundShadow(g, CX + lean * 0.4, GY, 34 + Math.abs(lean), 9);
  drawRubble(g, CX, GY);
  drawFeet(g, CX, GY, -2, lean > 4 ? 4 : 0);
  drawLegs(g, CX, legTop, legH, -2, lean > 4 ? 4 : 0);
  drawHideLoincloth(g, CX, waistY, 0, lean * 0.2);
  drawTorso(g, CX, torsoTop, torsoH, 0, lean * 0.3);

  // Arms
  drawArm(g, CX - 22 + lean * 0.3, shoulderY + 6, armLX, armLY);
  drawArm(g, CX + 22 + lean * 0.3, shoulderY + 6, armRX, armRY);

  // Boulder
  if (showBoulder) {
    drawBoulder(g, boulderX, boulderY, boulderSize);
  }

  drawHead(g, CX, headY, lean * 0.2);

  // Debris/dust cloud during hurl
  if (t >= 0.5 && t <= 0.8) {
    const dustT = (t - 0.5) / 0.3;
    const dustAlpha = (1 - dustT) * 0.25;
    // Small rock fragments trailing the boulder
    for (let i = 0; i < 5; i++) {
      const fragX = boulderX - 6 - i * 4 - dustT * 8;
      const fragY = boulderY + (i - 2) * 5;
      circle(g, fragX, fragY, 2.5 - i * 0.3, COL_RUBBLE, dustAlpha);
    }
  }

  // Ground shake on hurl release
  if (t >= 0.45 && t <= 0.65) {
    const shakeT = 1 - Math.abs(t - 0.55) / 0.1;
    for (let i = 0; i < 3; i++) {
      const sx = CX + lean * 0.4 + (i - 1) * 12;
      circle(g, sx, GY - 1, 3, COL_SHADOW, shakeT * 0.12);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Same as attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: stagger → crumbling collapse (stone-like)
  const t = frame / 6; // 0..1 over 7 frames (0..6)

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;

  const fallX = t * 14;
  const dropY = t * t * 20;
  const tilt = t * 6;

  const torsoTop = legTop - torsoH + 4 + dropY;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  // Shadow shrinks and moves as giant falls
  drawGroundShadow(g, CX + fallX * 0.4, GY, 34 + t * 8, 9, 0.3 * (1 - t * 0.4));

  // Rubble spreads as giant crumbles
  drawRubble(g, CX, GY);

  // Feet spread and buckle
  drawFeet(g, CX + fallX * 0.15, GY, t * 4, -t * 3);

  // Legs buckle and collapse
  if (t < 0.7) {
    const squash = Math.round(t * 5);
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 4, -t * 3);
  }

  // Loincloth flutters
  if (t < 0.85) {
    drawHideLoincloth(g, CX + fallX * 0.3, waistY, 0, tilt);
  }

  // Torso crashes forward
  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.1), 0, tilt);

  // Arms flop
  if (t < 0.75) {
    drawArm(g, CX - 22 + fallX * 0.3, shoulderY + 6, CX - 24 + fallX * 0.6, torsoTop + torsoH - 4 + t * 10);
    drawArm(g, CX + 22 + fallX * 0.3, shoulderY + 6, CX + 26 + fallX * 0.8, torsoTop + torsoH + t * 6);
  }

  // Boulder drops and rolls away
  if (t < 0.5) {
    const boulderRollX = CX + 10 + t * 24;
    const boulderRollY = shoulderY + 18 + t * 20;
    drawBoulder(g, boulderRollX, boulderRollY, 14 * (1 - t * 0.3));
  }

  // Head
  if (t < 0.6) {
    drawHead(g, CX + fallX * 0.5, headY + dropY * 0.4, tilt * 1.2);
  } else if (t < 0.85) {
    // Head tilts further as giant crumbles
    const rollT = (t - 0.6) / 0.25;
    drawHead(g, CX + fallX * 0.5 + rollT * 12, headY + dropY * 0.4 + rollT * 18, tilt * 1.2 + rollT * 6);
  }

  // Stone crumbling debris — chunks break off the body
  if (t > 0.4) {
    const crumbleT = (t - 0.4) / 0.6;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 2;
      const dist = crumbleT * (12 + i * 5);
      const cx2 = CX + fallX * 0.4 + Math.cos(angle) * dist;
      const cy = torsoTop + torsoH * 0.5 + Math.sin(angle) * dist * 0.6 + crumbleT * 10;
      const fragSize = 3 - i * 0.3;
      if (fragSize > 0.5) {
        circle(g, cx2, cy, fragSize, COL_SKIN, (1 - crumbleT) * 0.5);
      }
    }
  }

  // Dust cloud on final impact
  if (t > 0.65) {
    const dustT = (t - 0.65) / 0.35;
    const dustAlpha = (1 - dustT) * 0.2;
    for (let i = 0; i < 6; i++) {
      const dx = CX + fallX * 0.4 + (i - 2.5) * 8;
      const dy = GY - 3 - dustT * 10;
      circle(g, dx, dy, 5 + dustT * 5, COL_SHADOW, dustAlpha);
    }
  }

  // Scattered stone chips at impact point
  if (t > 0.6) {
    const chipT = (t - 0.6) / 0.4;
    for (let i = 0; i < 5; i++) {
      const chipX = CX + fallX * 0.4 + (i - 2) * 10;
      const chipY = GY - 2 - chipT * 4 * (i % 2 + 1);
      ellipse(g, chipX, chipY, 2.5, 1.5, COL_RUBBLE, (1 - chipT) * 0.5);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,   count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,    count: 7 },
};

export function generateGiantSiegeFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
