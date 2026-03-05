// Procedural sprite generator for the Giant Warrior unit.
//
// 96x144 pixel frames (2w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A towering muscular humanoid in heavy plate armor wielding a massive iron-bound
// war club. Heavy iron helmet with eye slits, iron greaves, shoulder pauldrons,
// fur/hide cape, and a free fist.
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

const COL_ARMOR      = 0x606878; // heavy plate steel
const COL_ARMOR_DK   = 0x40485a; // armor shadow
const COL_ARMOR_HI   = 0x808898; // armor highlight
const COL_ARMOR_EDGE = 0x303848; // dark edge trim

const COL_IRON       = 0x555555; // iron fittings / helmet
const COL_IRON_DK    = 0x3a3a3a;
const COL_IRON_HI    = 0x777777;

const COL_EYE_SLIT   = 0xffcc44; // glowing eyes behind helmet
const COL_EYE_GLOW   = 0xffdd88;

const COL_CLUB_WOOD  = 0x6e4e30; // war club shaft
const COL_CLUB_DK    = 0x4e3018;
const COL_CLUB_HI    = 0x8a6a46;
const COL_CLUB_HEAD  = 0x5a5a5a; // iron-bound club head
const COL_CLUB_BAND  = 0x444444; // iron bands
const COL_CLUB_SPIKE = 0x888888; // studs

const COL_FUR        = 0x7a6a52; // fur/hide cape
const COL_FUR_DK     = 0x5a4a32;
const COL_FUR_HI     = 0x9a8a6a;

const COL_GREAVE     = 0x505868; // iron greaves
const COL_GREAVE_DK  = 0x383e4e;

const COL_PAULDRON   = 0x505868;
const COL_PAULDRON_HI = 0x707888;
const COL_PAULDRON_RIVET = 0x888888;

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

function drawGroundShadow(g: Graphics, cx: number, gy: number, rx = 28, ry = 8, alpha = 0.3): void {
  ellipse(g, cx, gy + 2, rx, ry, COL_SHADOW, alpha);
}

function drawHelmet(g: Graphics, x: number, y: number, tilt = 0): void {
  // Helmet body -- rounded dome with flat front
  const hx = x + tilt;
  ellipse(g, hx, y, 14, 16, COL_IRON);
  // Dome highlight
  ellipse(g, hx - 2, y - 6, 8, 6, COL_IRON_HI, 0.25);
  // Brim/visor ridge
  rect(g, hx - 15, y + 4, 30, 4, COL_IRON_DK);
  rect(g, hx - 14, y + 4, 28, 2, COL_IRON_HI, 0.15);
  // Nose guard (vertical strip)
  rect(g, hx - 1.5, y - 2, 3, 14, COL_IRON_DK);
  // Eye slits -- glowing eyes behind
  rect(g, hx - 9, y + 1, 6, 2, COL_EYE_SLIT);
  rect(g, hx + 3, y + 1, 6, 2, COL_EYE_SLIT);
  // Glow behind slits
  ellipse(g, hx - 6, y + 2, 4, 2, COL_EYE_GLOW, 0.3);
  ellipse(g, hx + 6, y + 2, 4, 2, COL_EYE_GLOW, 0.3);
  // Chin guard
  poly(g, [hx - 10, y + 8, hx + 10, y + 8, hx + 6, y + 16, hx - 6, y + 16], COL_IRON_DK);
  // Rivets on helmet
  circle(g, hx - 10, y - 2, 1.2, COL_IRON_HI);
  circle(g, hx + 10, y - 2, 1.2, COL_IRON_HI);
  circle(g, hx - 8, y - 10, 1, COL_IRON_HI);
  circle(g, hx + 8, y - 10, 1, COL_IRON_HI);
  // Crest ridge on top of helmet
  rect(g, hx - 1, y - 16, 2, 8, COL_IRON_DK);
  rect(g, hx - 0.5, y - 16, 1, 8, COL_IRON_HI, 0.3);
}

function drawFurCape(g: Graphics, cx: number, topY: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  // Cape drapes over shoulders and down the back
  // Left shoulder drape
  poly(g, [
    x - 22, topY,
    x - 30, topY + 20 + breathe,
    x - 24, topY + 50 + breathe,
    x - 14, topY + 46 + breathe,
    x - 16, topY + 6,
  ], COL_FUR);
  // Right shoulder drape
  poly(g, [
    x + 22, topY,
    x + 30, topY + 20 + breathe,
    x + 24, topY + 50 + breathe,
    x + 14, topY + 46 + breathe,
    x + 16, topY + 6,
  ], COL_FUR);
  // Fur highlight strips
  rect(g, x - 29, topY + 10 + breathe, 6, 3, COL_FUR_HI, 0.3);
  rect(g, x + 23, topY + 10 + breathe, 6, 3, COL_FUR_HI, 0.3);
  // Dark fur shading at bottom
  rect(g, x - 28, topY + 38 + breathe, 8, 8, COL_FUR_DK, 0.4);
  rect(g, x + 20, topY + 38 + breathe, 8, 8, COL_FUR_DK, 0.4);
  // Fur texture -- small marks
  for (let i = 0; i < 4; i++) {
    line(g, x - 26 + i * 2, topY + 14 + i * 7 + breathe, x - 24 + i * 2, topY + 18 + i * 7 + breathe, COL_FUR_DK, 0.8);
    line(g, x + 22 + i * 2, topY + 14 + i * 7 + breathe, x + 24 + i * 2, topY + 18 + i * 7 + breathe, COL_FUR_DK, 0.8);
  }
}

function drawPauldrons(g: Graphics, cx: number, shoulderY: number, tilt = 0): void {
  const x = cx + tilt;
  // Left pauldron -- layered plates
  ellipse(g, x - 20, shoulderY, 10, 8, COL_PAULDRON);
  ellipse(g, x - 20, shoulderY - 2, 9, 5, COL_PAULDRON_HI, 0.3);
  // Rivets
  circle(g, x - 24, shoulderY, 1.2, COL_PAULDRON_RIVET);
  circle(g, x - 16, shoulderY, 1.2, COL_PAULDRON_RIVET);
  circle(g, x - 20, shoulderY - 4, 1.2, COL_PAULDRON_RIVET);
  // Edge trim
  line(g, x - 28, shoulderY + 4, x - 12, shoulderY + 4, COL_ARMOR_EDGE, 1.5);

  // Right pauldron
  ellipse(g, x + 20, shoulderY, 10, 8, COL_PAULDRON);
  ellipse(g, x + 20, shoulderY - 2, 9, 5, COL_PAULDRON_HI, 0.3);
  circle(g, x + 24, shoulderY, 1.2, COL_PAULDRON_RIVET);
  circle(g, x + 16, shoulderY, 1.2, COL_PAULDRON_RIVET);
  circle(g, x + 20, shoulderY - 4, 1.2, COL_PAULDRON_RIVET);
  line(g, x + 12, shoulderY + 4, x + 28, shoulderY + 4, COL_ARMOR_EDGE, 1.5);
}

function drawTorsoArmor(g: Graphics, cx: number, topY: number, h: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  const w = 36;

  // Main breastplate
  g.roundRect(x - w / 2, topY, w, h + breathe * 0.5, 4).fill({ color: COL_ARMOR });
  // Chest plate highlight
  ellipse(g, x - 4, topY + h * 0.3, w * 0.25, h * 0.25, COL_ARMOR_HI, 0.2);
  // Center plate seam
  line(g, x, topY + 4, x, topY + h - 4, COL_ARMOR_EDGE, 1.5);
  // Horizontal plate lines
  line(g, x - w / 2 + 4, topY + h * 0.35, x + w / 2 - 4, topY + h * 0.35, COL_ARMOR_EDGE, 1);
  line(g, x - w / 2 + 4, topY + h * 0.65, x + w / 2 - 4, topY + h * 0.65, COL_ARMOR_EDGE, 1);
  // Rivets on breastplate
  const rivetY1 = topY + h * 0.35;
  const rivetY2 = topY + h * 0.65;
  circle(g, x - 12, rivetY1, 1.2, COL_IRON_HI);
  circle(g, x + 12, rivetY1, 1.2, COL_IRON_HI);
  circle(g, x - 12, rivetY2, 1.2, COL_IRON_HI);
  circle(g, x + 12, rivetY2, 1.2, COL_IRON_HI);
  // Belt / waist band
  rect(g, x - w / 2 - 1, topY + h - 5, w + 2, 5, COL_IRON_DK);
  // Belt buckle
  rect(g, x - 4, topY + h - 5, 8, 5, COL_IRON_HI);
  rect(g, x - 2, topY + h - 4, 4, 3, COL_IRON_DK);
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  isFist: boolean,
): void {
  // Upper arm armor plate
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ARMOR, width: 10 });
  g.moveTo(sx + 1, sy + 1).lineTo(ex + 1, ey + 1).stroke({ color: COL_ARMOR_DK, width: 2, alpha: 0.4 });
  // Elbow joint
  circle(g, mx, my, 6, COL_IRON);
  circle(g, mx, my, 4, COL_IRON_HI, 0.3);
  // Gauntlet / fist
  if (isFist) {
    circle(g, ex, ey, 7, COL_IRON);
    circle(g, ex - 1, ey - 1, 5, COL_IRON_HI, 0.25);
    // Knuckle ridges
    circle(g, ex - 3, ey - 3, 2, COL_IRON_DK, 0.5);
    circle(g, ex + 1, ey - 3, 2, COL_IRON_DK, 0.5);
    circle(g, ex + 4, ey - 2, 2, COL_IRON_DK, 0.5);
  } else {
    circle(g, ex, ey, 6, COL_IRON);
    circle(g, ex - 1, ey - 1, 4, COL_IRON_HI, 0.25);
  }
}

function drawWarClub(
  g: Graphics,
  baseX: number, baseY: number,
  angle: number,
  length = 52,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + sin * length;
  const tipY = baseY - cos * length;

  // Shaft
  g.moveTo(baseX, baseY).lineTo(tipX, tipY).stroke({ color: COL_CLUB_WOOD, width: 6 });
  // Wood grain highlight
  g.moveTo(baseX + cos * 1.5, baseY + sin * 1.5)
    .lineTo(tipX + cos * 1.5, tipY + sin * 1.5)
    .stroke({ color: COL_CLUB_HI, width: 1, alpha: 0.4 });
  // Wood grain dark
  g.moveTo(baseX - cos * 1.5, baseY - sin * 1.5)
    .lineTo(tipX - cos * 1.5, tipY - sin * 1.5)
    .stroke({ color: COL_CLUB_DK, width: 1, alpha: 0.5 });

  // Iron bands along shaft
  for (let i = 1; i <= 3; i++) {
    const t = i * 0.2;
    const bx = baseX + (tipX - baseX) * t;
    const by = baseY + (tipY - baseY) * t;
    circle(g, bx, by, 4, COL_CLUB_BAND);
  }

  // Massive iron club head
  const headX = tipX;
  const headY = tipY;
  ellipse(g, headX, headY, 14, 10, COL_CLUB_HEAD);
  ellipse(g, headX - 2, headY - 2, 10, 7, COL_IRON_HI, 0.2);
  // Iron bands on head
  line(g, headX - 12, headY, headX + 12, headY, COL_CLUB_BAND, 2);
  line(g, headX, headY - 8, headX, headY + 8, COL_CLUB_BAND, 2);
  // Studs / spikes on head
  const studs = [
    [-8, -5], [8, -5], [-8, 5], [8, 5],
    [0, -8], [0, 8], [-12, 0], [12, 0],
  ];
  for (const [sx, sy] of studs) {
    circle(g, headX + sx, headY + sy, 2, COL_CLUB_SPIKE);
    circle(g, headX + sx - 0.5, headY + sy - 0.5, 1, COL_IRON_HI, 0.4);
  }
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 12;

  // Left leg -- armored greave
  g.roundRect(cx - 14 + stanceL, legTop, lw, legH, 3).fill({ color: COL_GREAVE });
  // Greave highlight
  g.roundRect(cx - 13 + stanceL, legTop + 2, lw - 4, legH - 4, 2).fill({ color: COL_GREAVE_DK, alpha: 0.3 });
  // Knee plate
  ellipse(g, cx - 8 + stanceL, legTop + legH * 0.3, 7, 5, COL_IRON);
  circle(g, cx - 8 + stanceL, legTop + legH * 0.3, 2, COL_IRON_HI, 0.4);
  // Shin guard edge
  line(g, cx - 14 + stanceL, legTop + legH * 0.5, cx - 14 + stanceL, legTop + legH, COL_ARMOR_EDGE, 1);

  // Right leg
  g.roundRect(cx + 2 + stanceR, legTop, lw, legH, 3).fill({ color: COL_GREAVE });
  g.roundRect(cx + 3 + stanceR, legTop + 2, lw - 4, legH - 4, 2).fill({ color: COL_GREAVE_DK, alpha: 0.3 });
  ellipse(g, cx + 8 + stanceR, legTop + legH * 0.3, 7, 5, COL_IRON);
  circle(g, cx + 8 + stanceR, legTop + legH * 0.3, 2, COL_IRON_HI, 0.4);
  line(g, cx + 2 + stanceR + lw, legTop + legH * 0.5, cx + 2 + stanceR + lw, legTop + legH, COL_ARMOR_EDGE, 1);
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Heavy iron sabatons (armored boots)
  g.roundRect(cx - 18 + stanceL, gy - 8, 16, 10, 3).fill({ color: COL_IRON_DK });
  g.roundRect(cx - 17 + stanceL, gy - 7, 14, 6, 2).fill({ color: COL_IRON_HI, alpha: 0.15 });
  // Boot toe plate
  ellipse(g, cx - 12 + stanceL, gy - 2, 6, 4, COL_IRON);

  g.roundRect(cx + 2 + stanceR, gy - 8, 16, 10, 3).fill({ color: COL_IRON_DK });
  g.roundRect(cx + 3 + stanceR, gy - 7, 14, 6, 2).fill({ color: COL_IRON_HI, alpha: 0.15 });
  ellipse(g, cx + 12 + stanceR, gy - 2, 6, 4, COL_IRON);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;

  const legH = 22;
  const torsoH = 40;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 + breathe;
  const shoulderY = torsoTop + 6;
  const headY = torsoTop - 14;

  drawGroundShadow(g, CX, GY);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawFurCape(g, CX, shoulderY, breathe);
  drawTorsoArmor(g, CX, torsoTop, torsoH, breathe);
  drawPauldrons(g, CX, shoulderY);

  // Left arm -- free fist, hangs at side
  drawArm(g, CX - 20, shoulderY + 6, CX - 24, torsoTop + torsoH + 4, true);

  // Right arm -- holds war club resting on shoulder
  const clubAngle = -0.15 + Math.sin(t * Math.PI * 2) * 0.03;
  drawArm(g, CX + 20, shoulderY + 6, CX + 24, shoulderY + 16, false);
  drawWarClub(g, CX + 24, shoulderY + 16, clubAngle, 48);

  drawHelmet(g, CX, headY);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 3;

  const legH = 22;
  const torsoH = 40;
  const stanceL = Math.round(walk * 5);
  const stanceR = Math.round(-walk * 5);
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 - Math.round(bob * 0.3);
  const shoulderY = torsoTop + 6;
  const headY = torsoTop - 14;

  // Heavier shadow on impact frames
  if (Math.abs(walk) > 0.8) {
    drawGroundShadow(g, CX, GY, 32, 10, 0.35);
  } else {
    drawGroundShadow(g, CX, GY, 28 + Math.abs(walk) * 4, 8);
  }

  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawFurCape(g, CX, shoulderY, bob * 0.4, walk * 0.6);
  drawTorsoArmor(g, CX, torsoTop, torsoH, bob * 0.3, walk * 0.5);
  drawPauldrons(g, CX, shoulderY, walk * 0.5);

  // Arms swing with gait
  const armSwing = walk * 4;
  drawArm(g, CX - 20 + walk * 0.5, shoulderY + 6, CX - 24 - armSwing, torsoTop + torsoH + 4, true);
  drawArm(g, CX + 20 + walk * 0.5, shoulderY + 6, CX + 24 + armSwing, shoulderY + 16, false);
  drawWarClub(g, CX + 24 + armSwing, shoulderY + 16, -0.12 + walk * 0.05, 48);

  drawHelmet(g, CX, headY, walk * 0.4);

  // Ground impact dust on heavy steps
  if (Math.abs(walk) > 0.9) {
    const dustX = walk > 0 ? CX - 12 + stanceL : CX + 12 + stanceR;
    for (let i = 0; i < 3; i++) {
      const dx = dustX + (i - 1) * 6;
      const dy = GY - 2 - i * 2;
      circle(g, dx, dy, 2.5 - i * 0.5, COL_SHADOW, 0.08);
    }
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 6 frames: wind-up → overhead lift → slam down with massive impact
  const t = frame / 5; // 0..1 over 6 frames (0..5)

  const legH = 22;
  const torsoH = 40;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4;
  const shoulderY = torsoTop + 6;
  const headY = torsoTop - 14;

  // Lean into attack
  let lean = 0;
  let clubAngle: number;
  let armReachX = 0;
  let armReachY = 0;

  if (t < 0.33) {
    // Wind-up: lean back, raise club overhead
    const p = t / 0.33;
    lean = -p * 4;
    clubAngle = -0.15 - p * 2.5; // swing up and back
    armReachX = -p * 6;
    armReachY = -p * 20;
  } else if (t < 0.55) {
    // Peak of wind-up
    const p = (t - 0.33) / 0.22;
    lean = -4 + p * 2;
    clubAngle = -2.65 - p * 0.3; // still overhead
    armReachX = -6 + p * 4;
    armReachY = -20 + p * 4;
  } else if (t < 0.75) {
    // Slam down
    const p = (t - 0.55) / 0.2;
    lean = -2 + p * 10;
    clubAngle = -2.95 + p * 4.5; // fast arc down
    armReachX = -2 + p * 14;
    armReachY = -16 + p * 30;
  } else {
    // Recovery
    const p = (t - 0.75) / 0.25;
    lean = 8 - p * 8;
    clubAngle = 1.55 - p * 1.7;
    armReachX = 12 - p * 12;
    armReachY = 14 - p * 14;
  }

  drawGroundShadow(g, CX + lean * 0.5, GY, 28 + Math.abs(lean), 8);
  drawFeet(g, CX, GY, -2, lean > 4 ? 4 : 0);
  drawLegs(g, CX, legTop, legH, -2, lean > 4 ? 4 : 0);
  drawFurCape(g, CX, shoulderY, 0, lean * 0.3);
  drawTorsoArmor(g, CX, torsoTop, torsoH, 0, lean * 0.3);
  drawPauldrons(g, CX, shoulderY, lean * 0.3);

  // Left arm braces (free fist)
  drawArm(g, CX - 20 + lean * 0.3, shoulderY + 6, CX - 22, torsoTop + torsoH, true);

  // Right arm swings club
  const handX = CX + 24 + lean * 0.3 + armReachX;
  const handY = shoulderY + 16 + armReachY;
  drawArm(g, CX + 20 + lean * 0.3, shoulderY + 6, handX, handY, false);
  drawWarClub(g, handX, handY, clubAngle, 48);

  drawHelmet(g, CX, headY, lean * 0.2);

  // Massive ground impact effect on slam
  if (t >= 0.65 && t <= 0.85) {
    const impactT = 1 - Math.abs(t - 0.75) / 0.1;
    const impX = handX + Math.sin(clubAngle) * 48;
    const impY = handY - Math.cos(clubAngle) * 48;

    // Shockwave rings
    circle(g, impX, impY, 16, 0xffffff, impactT * 0.2);
    circle(g, impX, impY, 10, 0xffddaa, impactT * 0.15);

    // Debris / rock chips
    for (let i = 0; i < 6; i++) {
      const da = (i / 6) * Math.PI * 2 + t * 3;
      const dd = 8 + i * 4;
      circle(g, impX + Math.cos(da) * dd, impY + Math.sin(da) * dd, 2 - i * 0.2, COL_IRON_DK, impactT * 0.4);
    }

    // Ground crack lines
    for (let i = 0; i < 4; i++) {
      const ca = -0.8 + i * 0.4;
      line(g, impX, impY, impX + Math.cos(ca) * 14, impY + Math.sin(ca) * 10, COL_SHADOW, impactT * 1.5);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Same as attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: stagger → knees buckle → topple and crash
  const t = frame / 6; // 0..1 over 7 frames (0..6)

  const legH = 22;
  const torsoH = 40;
  const legTop = GY - 8 - legH;

  const fallX = t * 16;
  const dropY = t * t * 18;
  const tilt = t * 6;

  const torsoTop = legTop - torsoH + 4 + dropY;
  const shoulderY = torsoTop + 6;
  const headY = torsoTop - 14;

  // Shadow shrinks and moves as giant falls
  drawGroundShadow(g, CX + fallX * 0.4, GY, 28 + t * 8, 8, 0.3 * (1 - t * 0.4));

  // Feet spread and buckle
  const squash = Math.round(t * 5);
  drawFeet(g, CX + fallX * 0.15, GY, t * 4, -t * 3);

  // Legs buckle and collapse
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 4, -t * 3);
  }

  // Cape flutters as giant falls
  if (t < 0.85) {
    drawFurCape(g, CX + fallX * 0.3, shoulderY, 0, tilt);
  }

  // Torso crashes forward
  drawTorsoArmor(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.1), 0, tilt);

  if (t < 0.8) {
    drawPauldrons(g, CX + fallX * 0.4, shoulderY, tilt);
  }

  // Arms flop
  if (t < 0.75) {
    drawArm(g, CX - 20 + fallX * 0.3, shoulderY + 6, CX - 24 + fallX * 0.6, torsoTop + torsoH - 4 + t * 8, true);
  }

  // Club flies away
  if (t < 0.65) {
    const clubX = CX + 26 + t * 20;
    const clubY = shoulderY + 16 + t * 14;
    drawWarClub(g, clubX, clubY, 0.5 + t * 4, 48 * (1 - t * 0.3));
  }

  // Helmet
  if (t < 0.6) {
    drawHelmet(g, CX + fallX * 0.5, headY + dropY * 0.4, tilt * 1.2);
  } else if (t < 0.85) {
    // Helmet rolls off
    const rollT = (t - 0.6) / 0.25;
    const helmX = CX + fallX * 0.5 + rollT * 14;
    const helmY = headY + dropY * 0.4 + rollT * 20;
    drawHelmet(g, helmX, helmY, tilt * 1.2 + rollT * 8);
  }

  // Dust cloud on final impact
  if (t > 0.7) {
    const dustT = (t - 0.7) / 0.3;
    const dustAlpha = (1 - dustT) * 0.2;
    for (let i = 0; i < 5; i++) {
      const dx = CX + fallX * 0.4 + (i - 2) * 8;
      const dy = GY - 3 - dustT * 8;
      circle(g, dx, dy, 5 + dustT * 4, COL_SHADOW, dustAlpha);
    }
  }

  // Metal scraping sparks on ground impact
  if (t > 0.65 && t < 0.85) {
    const sparkT = (t - 0.65) / 0.2;
    for (let i = 0; i < 4; i++) {
      const sx = CX + fallX * 0.4 + (i - 1.5) * 10;
      const sy = GY - 4 - sparkT * 6 * (i % 2 + 1);
      circle(g, sx, sy, 1.5, COL_EYE_SLIT, (1 - sparkT) * 0.6);
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

export function generateGiantWarriorFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
