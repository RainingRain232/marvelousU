// Procedural sprite generator for the Boarding Master unit type.
//
// Draws a dual-cutlass pirate fighter at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Muscular build, open shirt exposing tanned chest
//   • Red bandana, eye patch, scruffy beard, gold earring
//   • Leather vest, wide belt with square buckle
//   • Two curved cutlasses — silver steel with gold guard
//   • Visible facial scar, sea-weathered tanned skin
//   • Confident pirate swagger throughout animations

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — pirate earth tones, steel, gold
const COL_SKIN       = 0xc8946a; // tanned, sea-weathered skin
const COL_SKIN_DK    = 0xa87050; // shadow skin
const COL_SKIN_SH    = 0x8a5838; // deep shadow

const COL_SHIRT      = 0xe8dfc8; // off-white open shirt
const COL_SHIRT_DK   = 0xc8bfa8; // shirt shadow

const COL_VEST       = 0x5a3a1e; // dark brown leather vest
const COL_VEST_HI    = 0x7a5a38; // vest highlight
const COL_BOOT_DK    = 0x2a1808; // boot shadow
const COL_VEST_STUD  = 0xb08040; // brass studs on vest

const COL_PANTS      = 0x2a3a5a; // dark navy pants
const COL_PANTS_DK   = 0x1a2840; // pants shadow
const COL_PANTS_SEAM = 0x3a4a6a; // seam highlight

const COL_BOOT       = 0x3a2818; // dark leather boot
const COL_BOOT_HI    = 0x5a4838; // boot highlight
const COL_BOOT_FOLD  = 0x4a3828; // boot top fold

const COL_BANDANA    = 0xb02020; // red bandana
const COL_BANDANA_DK = 0x7a1010;
const COL_BANDANA_TL = 0xd04040; // bandana tails

const COL_BELT       = 0x3a2010; // dark belt strap
const COL_BUCKLE     = 0xd0a020; // gold buckle
const COL_BUCKLE_HI  = 0xf0c840;

const COL_BLADE      = 0xd0d8e0; // steel blade
const COL_BLADE_HI   = 0xf0f4f8; // blade highlight
const COL_BLADE_DK   = 0xa8b0b8; // blade shadow
const COL_BLADE_EDGE = 0xffffff; // sharpened edge flash

const COL_GUARD      = 0xd0a820; // gold crossguard
const COL_GUARD_HI   = 0xf0c840;

const COL_GRIP       = 0x6a4020; // dark wood grip
const COL_GRIP_WRAP  = 0x3a1810; // grip wrapping
const COL_POMMEL     = 0xd0a820; // gold pommel

const COL_BEARD      = 0x3a3020; // dark scruffy beard
const COL_BEARD_HI   = 0x5a4838;

const COL_HAIR       = 0x2a2018; // dark brown hair

const COL_EYE        = 0x4a3010; // brown eye
const COL_EYEPATCH   = 0x1a1008; // black eye patch
const COL_EARRING    = 0xf0c840; // gold earring

const COL_BLADE_BLUR = 0xd8e8f8; // motion blur color
const COL_SHADOW     = 0x000000;

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
  w = 10,
  h = 2.5,
  alpha = 0.28,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Tall pirate boots — broad and sturdy
  const bw = 5;
  const bh = 6;
  // Left boot
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  // Boot top fold
  g.rect(cx - 7 + stanceL, gy - bh, bw, 1.5).fill({ color: COL_BOOT_FOLD });
  g.rect(cx - 7 + stanceL, gy - bh, bw, 0.6).fill({ color: COL_BOOT_HI, alpha: 0.4 });
  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.rect(cx + 2 + stanceR, gy - bh, bw, 1.5).fill({ color: COL_BOOT_FOLD });
  g.rect(cx + 2 + stanceR, gy - bh, bw, 0.6).fill({ color: COL_BOOT_HI, alpha: 0.4 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Sturdy navy pants — wide thighs
  g.rect(cx - 7 + stanceL, legTop, 5, legH).fill({ color: COL_PANTS });
  g.rect(cx + 2 + stanceR, legTop, 5, legH).fill({ color: COL_PANTS });
  // Seam
  g.moveTo(cx - 5 + stanceL, legTop).lineTo(cx - 5 + stanceL, legTop + legH)
    .stroke({ color: COL_PANTS_SEAM, width: 0.4, alpha: 0.5 });
  g.moveTo(cx + 5 + stanceR, legTop).lineTo(cx + 5 + stanceR, legTop + legH)
    .stroke({ color: COL_PANTS_SEAM, width: 0.4, alpha: 0.5 });
  // Inner shadow
  g.rect(cx - 4 + stanceL, legTop, 1, legH).fill({ color: COL_PANTS_DK, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, legTop, 1, legH).fill({ color: COL_PANTS_DK, alpha: 0.5 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  lean = 0,
): void {
  const tw = 13; // muscular, broad
  const x = cx - tw / 2 + lean;
  // Shirt base
  g.roundRect(x, top, tw, h, 1)
    .fill({ color: COL_SHIRT })
    .stroke({ color: COL_SHIRT_DK, width: 0.4 });
  // Open shirt — V showing chest
  g.moveTo(cx + lean - 2, top)
    .lineTo(cx + lean, top + h * 0.55)
    .lineTo(cx + lean + 2, top)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SHIRT_DK, width: 0.3 });
  // Chest hair hint
  g.circle(cx + lean, top + h * 0.35, 0.7).fill({ color: COL_BEARD, alpha: 0.25 });
  // Leather vest over shirt
  g.roundRect(x, top, 4, h - 1, 1).fill({ color: COL_VEST });
  g.roundRect(x + tw - 4, top, 4, h - 1, 1).fill({ color: COL_VEST });
  // Vest highlight edges
  g.moveTo(x + 0.5, top + 1).lineTo(x + 0.5, top + h - 2)
    .stroke({ color: COL_VEST_HI, width: 0.5, alpha: 0.5 });
  g.moveTo(x + tw - 0.5, top + 1).lineTo(x + tw - 0.5, top + h - 2)
    .stroke({ color: COL_VEST_HI, width: 0.5, alpha: 0.5 });
  // Brass stud — left vest panel
  g.circle(x + 2, top + 2.5, 0.8).fill({ color: COL_VEST_STUD });
  g.circle(x + 2, top + 5.5, 0.8).fill({ color: COL_VEST_STUD });
  // Belt
  g.rect(x, top + h - 2.5, tw, 2.5).fill({ color: COL_BELT });
  // Belt buckle
  g.rect(cx + lean - 2, top + h - 2.5, 4, 2.5).fill({ color: COL_BUCKLE });
  g.rect(cx + lean - 1.2, top + h - 2.2, 2.4, 1.8).fill({ color: COL_BUCKLE_HI, alpha: 0.5 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  lean = 0,
): void {
  const hw = 9;
  const hh = 9;
  const x = cx - hw / 2 + lean;

  // Neck
  g.rect(cx - 2 + lean, top + hh - 1, 4, 3).fill({ color: COL_SKIN_DK });

  // Face — tanned, weathered
  g.roundRect(x + 0.5, top + 2, hw - 1, hh - 2, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });

  // Scruffy beard — bottom third of face
  g.roundRect(x + 1, top + hh * 0.58, hw - 2, hh * 0.36, 1).fill({ color: COL_BEARD });
  // Beard texture hints
  for (let i = 0; i < 4; i++) {
    g.moveTo(x + 1.5 + i * 1.8, top + hh * 0.62)
      .lineTo(x + 1.8 + i * 1.8, top + hh * 0.88)
      .stroke({ color: COL_BEARD_HI, width: 0.5, alpha: 0.4 });
  }
  // Mustache
  g.moveTo(cx - 2.5 + lean, top + hh * 0.56)
    .quadraticCurveTo(cx + lean, top + hh * 0.52, cx + 2.5 + lean, top + hh * 0.56)
    .stroke({ color: COL_BEARD, width: 1.5 });

  // Red bandana across forehead
  g.rect(x, top + 2, hw, 2.8).fill({ color: COL_BANDANA });
  // Bandana knot on side
  g.circle(x + hw - 0.5, top + 3, 1.5).fill({ color: COL_BANDANA_DK });
  // Bandana tails trailing
  g.moveTo(x + hw, top + 3)
    .quadraticCurveTo(x + hw + 3, top + 5, x + hw + 2, top + 8)
    .stroke({ color: COL_BANDANA_TL, width: 1.2 });
  g.moveTo(x + hw, top + 3.5)
    .quadraticCurveTo(x + hw + 4, top + 6, x + hw + 3, top + 10)
    .stroke({ color: COL_BANDANA_DK, width: 0.8 });
  // Hair peeking below bandana on forehead — short dark hair
  g.roundRect(x + 1, top + 2, hw - 2, 1.5, 0.5).fill({ color: COL_HAIR });

  // One eye — right side (viewer's left)
  const eyeY = top + hh * 0.42;
  g.ellipse(cx + 1.8 + lean, eyeY, 1.3, 0.9).fill({ color: COL_SKIN }); // white
  g.ellipse(cx + 1.8 + lean, eyeY, 0.9, 0.8).fill({ color: COL_EYE });
  g.circle(cx + 2 + lean, eyeY, 0.4).fill({ color: COL_SHADOW }); // pupil
  // Brow over good eye
  g.moveTo(cx + 0.5 + lean, eyeY - 1.5)
    .lineTo(cx + 3 + lean, eyeY - 1.8)
    .stroke({ color: COL_HAIR, width: 0.7 });

  // Eye patch — left side
  g.ellipse(cx - 1.8 + lean, eyeY, 2, 1.5).fill({ color: COL_EYEPATCH });
  // Patch strap
  g.moveTo(cx - 3.5 + lean, eyeY - 0.5)
    .lineTo(x + 0.5, top + 3.5)
    .stroke({ color: COL_EYEPATCH, width: 0.8 });
  // Brow over patch (scar underneath)
  g.moveTo(cx - 3.5 + lean, eyeY - 1.3)
    .lineTo(cx - 0.5 + lean, eyeY - 1.7)
    .stroke({ color: COL_HAIR, width: 0.7 });

  // Facial scar — runs diagonally across patched eye area
  g.moveTo(cx - 2 + lean, eyeY - 2.5)
    .lineTo(cx - 0.8 + lean, eyeY + 1.5)
    .stroke({ color: COL_SKIN_SH, width: 0.6, alpha: 0.7 });

  // Gold earring on visible-ear side
  g.circle(x + hw, top + hh * 0.5, 1.5)
    .stroke({ color: COL_EARRING, width: 1.2, alpha: 0.9 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Shirt sleeve / bare arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SHIRT, width: 3.2 });
  // Muscle definition line
  g.moveTo(sx + 0.4, sy).lineTo(ex + 0.3, ey)
    .stroke({ color: COL_SHIRT_DK, width: 0.5, alpha: 0.4 });
  // Forearm — rolled sleeve showing tanned arm
  const mx = lerp(sx, ex, 0.55);
  const my = lerp(sy, ey, 0.55);
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 2.8 });
  // Hand
  g.circle(ex, ey, 1.6).fill({ color: COL_SKIN });
}

function drawCutlass(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 14,
  edgeFlash = 0,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Pommel (bottom of grip)
  const pomX = bx - sin * 4;
  const pomY = by + cos * 4;
  g.circle(pomX, pomY, 1.3).fill({ color: COL_POMMEL });

  // Grip
  const gripX = bx - sin * 0.5;
  const gripY = by + cos * 0.5;
  g.moveTo(pomX, pomY).lineTo(gripX, gripY)
    .stroke({ color: COL_GRIP, width: 2.6 });
  // Grip wrapping
  for (let i = 0; i < 3; i++) {
    const wt = (i + 0.5) / 3;
    const wx = lerp(pomX, gripX, wt);
    const wy = lerp(pomY, gripY, wt);
    g.circle(wx, wy, 0.6).fill({ color: COL_GRIP_WRAP, alpha: 0.7 });
  }

  // Gold crossguard
  const gqx = bx + cos * 1.5;
  const gqy = by + sin * 1.5;
  g.moveTo(gqx + cos * 3, gqy + sin * 3)
    .lineTo(gqx - cos * 3, gqy - sin * 3)
    .stroke({ color: COL_GUARD, width: 2.2 });
  g.moveTo(gqx + cos * 2.5, gqy + sin * 2.5)
    .lineTo(gqx - cos * 2.5, gqy - sin * 2.5)
    .stroke({ color: COL_GUARD_HI, width: 0.7, alpha: 0.7 });

  // Curved blade — cutlass curve (curves toward the tip)
  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;
  // Curve control point — cutlass curves forward
  const curveDX = cos * bladeLen * 0.35;
  const curveDY = sin * bladeLen * 0.35;
  const ctrlX = (bx + tipX) / 2 + curveDX;
  const ctrlY = (by + tipY) / 2 + curveDY;

  // Blade shadow/back edge
  g.moveTo(bx - cos * 0.7, by - sin * 0.7)
    .quadraticCurveTo(ctrlX - cos * 0.7, ctrlY - sin * 0.7, tipX - cos * 0.3, tipY - sin * 0.3)
    .stroke({ color: COL_BLADE_DK, width: 2.5 });

  // Main blade face
  g.moveTo(bx, by)
    .quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
    .stroke({ color: COL_BLADE, width: 2 });

  // Highlight — bright edge (sharpened)
  g.moveTo(bx + cos * 0.5, by + sin * 0.5)
    .quadraticCurveTo(ctrlX + cos * 0.5, ctrlY + sin * 0.5, tipX, tipY)
    .stroke({ color: COL_BLADE_HI, width: 0.7 });

  // Edge flash on swing
  if (edgeFlash > 0) {
    g.moveTo(bx, by)
      .quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
      .stroke({ color: COL_BLADE_EDGE, width: 1, alpha: edgeFlash });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  // Crossed cutlasses casually, weight shifted to one hip
  const t = frame / 8;
  const sway = Math.sin(t * Math.PI * 2) * 0.4; // lazy sway
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const hipShift = Math.sin(t * Math.PI * 2) * 0.8; // cocky hip weight shift

  const legH = 8;
  const torsoH = 11;
  const legTop = GY - 6 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 11;

  drawShadow(g, CX, GY);
  drawBoots(g, CX + hipShift * 0.2, GY, hipShift * 0.5, -hipShift * 0.3);
  drawLegs(g, CX + hipShift * 0.2, legTop, legH, hipShift * 0.5, -hipShift * 0.3);
  drawTorso(g, CX + sway, torsoTop, torsoH, hipShift * 0.4);
  drawHead(g, CX + sway, headTop, sway * 0.3);

  // Right arm — casual hold, blade angled down-right
  const rHandX = CX + 9 + hipShift * 0.2;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6 + sway, torsoTop + 3, rHandX, rHandY);
  drawCutlass(g, rHandX, rHandY, 0.25 + sway * 0.05, 14); // right blade angled

  // Left arm — crossed over, resting blade across right wrist
  const lHandX = CX + 4 + hipShift * 0.1;
  const lHandY = torsoTop + torsoH - 3;
  drawArm(g, CX - 5 + sway, torsoTop + 3, lHandX, lHandY);
  drawCutlass(g, lHandX, lHandY, -0.3 + sway * 0.05, 13); // left blade crosses
}

function generateMoveFrame(g: Graphics, frame: number): void {
  // Aggressive forward run, cutlasses at sides
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 1.2;
  const lean = 2.5; // permanent forward lean — aggressive run

  const legH = 9;
  const torsoH = 11;
  const stanceL = Math.round(stride * 4.5);
  const stanceR = Math.round(-stride * 4.5);
  const legTop = GY - 6 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const headTop = torsoTop - 11;

  // Bandana tail trails behind
  drawShadow(g, CX, GY, 10 + Math.abs(stride) * 2, 2.5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.4);

  // Cutlasses pumped at sides during run — opposite arm swing
  const armSwing = stride * 2.5;
  const rHandX = CX + 9 + armSwing;
  const rHandY = torsoTop + torsoH - 2 - armSwing * 0.3;
  drawArm(g, CX + 6, torsoTop + 4, rHandX, rHandY);
  drawCutlass(g, rHandX, rHandY, 0.2 + stride * 0.15, 14);

  const lHandX = CX - 8 - armSwing;
  const lHandY = torsoTop + torsoH - 2 + armSwing * 0.3;
  drawArm(g, CX - 6, torsoTop + 4, lHandX, lHandY);
  drawCutlass(g, lHandX, lHandY, -0.2 - stride * 0.15, 13);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Rapid alternating slashes — left, right, left pattern, blades blur
  // 0: ready  1-2: left slash  3-4: right slash  5-6: left slash  7: recover
  const t = frame / 7;

  const legH = 8;
  const torsoH = 11;
  const legTop = GY - 6 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  // Whole body pivots with alternating slashes
  const pivot = Math.sin(t * Math.PI * 3) * 2;
  const lunge = Math.sin(t * Math.PI * 3) * 1.5;

  drawShadow(g, CX + lunge * 0.5, GY, 10 + Math.abs(lunge), 2.5);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, pivot * 0.5);
  drawHead(g, CX, headTop, pivot * 0.35);

  // Left slash timing: active at t~0.1, t~0.7
  const leftActive = Math.max(0, Math.sin(t * Math.PI * 3 - 0.5));
  // Right slash timing: active at t~0.4
  const rightActive = Math.max(0, Math.sin(t * Math.PI * 3 - Math.PI / 2 - 0.5));

  // Right cutlass — slashing right to left
  let rAngle: number;
  if (t < 0.4) {
    rAngle = lerp(0.3, -1.4, t / 0.4);
  } else if (t < 0.55) {
    rAngle = lerp(-1.4, 1.2, (t - 0.4) / 0.15);
  } else {
    rAngle = lerp(1.2, 0.3, (t - 0.55) / 0.45);
  }
  const rHandX = CX + 8 + pivot * 0.3 + rightActive * 2;
  const rHandY = torsoTop + 4 - rightActive * 2;
  drawArm(g, CX + 6, torsoTop + 4, rHandX, rHandY);
  drawCutlass(g, rHandX, rHandY, rAngle, 14, rightActive * 0.6);

  // Right blade blur trail
  if (rightActive > 0.3) {
    const blurAlpha = rightActive * 0.25;
    g.moveTo(rHandX - 4, rHandY - 12)
      .bezierCurveTo(rHandX + 8, rHandY - 8, rHandX + 12, rHandY, rHandX + 6, rHandY + 6)
      .stroke({ color: COL_BLADE_BLUR, width: 1.5, alpha: blurAlpha });
  }

  // Left cutlass — counter-slashing left to right
  let lAngle: number;
  if (t < 0.25) {
    lAngle = lerp(-0.25, 1.3, t / 0.25);
  } else if (t < 0.4) {
    lAngle = lerp(1.3, -1.2, (t - 0.25) / 0.15);
  } else if (t < 0.7) {
    lAngle = lerp(-1.2, 1.1, (t - 0.4) / 0.3);
  } else {
    lAngle = lerp(1.1, -0.25, (t - 0.7) / 0.3);
  }
  const lHandX = CX - 7 - pivot * 0.3 + leftActive * 2;
  const lHandY = torsoTop + 4 - leftActive * 2;
  drawArm(g, CX - 5, torsoTop + 4, lHandX, lHandY);
  drawCutlass(g, lHandX, lHandY, lAngle, 13, leftActive * 0.6);

  // Left blade blur trail
  if (leftActive > 0.3) {
    const blurAlpha = leftActive * 0.25;
    g.moveTo(lHandX + 4, lHandY - 12)
      .bezierCurveTo(lHandX - 8, lHandY - 8, lHandX - 12, lHandY, lHandX - 6, lHandY + 6)
      .stroke({ color: COL_BLADE_BLUR, width: 1.5, alpha: blurAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Flourish: cutlass spin, then X cross-cut finale
  // 0-1: spin up  2-3: spinning  4-5: wind up for X  6-7: X-slash
  const t = frame / 7;
  const spinPhase = clamp01(t * 1.8);
  const xSlash = clamp01((t - 0.7) * 3.5);

  const legH = 8;
  const torsoH = 11;
  const legTop = GY - 6 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  // Wide stance for power move
  const stance = 2 + xSlash * 1.5;
  drawShadow(g, CX, GY, 11 + stance, 2.5);
  drawBoots(g, CX, GY, -stance, stance);
  drawLegs(g, CX, legTop, legH, -stance, stance);
  drawTorso(g, CX, torsoTop, torsoH, -xSlash * 1.5);
  drawHead(g, CX, headTop, -xSlash * 1);

  // Spinning arcs in flourish phase
  if (spinPhase < 0.75 && spinPhase > 0.1) {
    const arcAlpha = 0.15 + Math.sin(spinPhase * Math.PI * 4) * 0.1;
    for (let ring = 0; ring < 2; ring++) {
      const r = 9 + ring * 5;
      g.arc(CX, torsoTop + 4, r, spinPhase * Math.PI * 4 + ring, spinPhase * Math.PI * 4 + ring + Math.PI * 1.2)
        .stroke({ color: COL_BLADE, width: 1.5, alpha: arcAlpha - ring * 0.04 });
    }
  }

  // Right cutlass — spinning forward flourish
  const spinAngle = spinPhase * Math.PI * 3;
  const rSpinAngle = xSlash > 0.5 ? lerp(spinAngle, -0.8, (xSlash - 0.5) * 2) : spinAngle;
  const rHandX = CX + 7 + xSlash * 2;
  const rHandY = torsoTop + 3 - xSlash * 3;
  drawArm(g, CX + 6, torsoTop + 4, rHandX, rHandY);
  drawCutlass(g, rHandX, rHandY, rSpinAngle, 14, xSlash * 0.7);

  // Left cutlass — counter-spin
  const lSpinAngle = xSlash > 0.5 ? lerp(-spinAngle, 0.8, (xSlash - 0.5) * 2) : -spinAngle;
  const lHandX = CX - 7 - xSlash * 2;
  const lHandY = torsoTop + 3 - xSlash * 3;
  drawArm(g, CX - 5, torsoTop + 4, lHandX, lHandY);
  drawCutlass(g, lHandX, lHandY, lSpinAngle, 13, xSlash * 0.7);

  // X-slash cross effect
  if (xSlash > 0.5) {
    const xa = clamp01((xSlash - 0.5) * 2);
    // X intersection glow
    g.circle(CX, torsoTop - 1, 3 + xa * 3).fill({ color: COL_BLADE_EDGE, alpha: xa * 0.2 });
    // Cross lines
    g.moveTo(CX - 10 * xa, torsoTop - 8 * xa)
      .lineTo(CX + 10 * xa, torsoTop + 8 * xa)
      .stroke({ color: COL_BLADE_BLUR, width: 1.2, alpha: xa * 0.35 });
    g.moveTo(CX + 10 * xa, torsoTop - 8 * xa)
      .lineTo(CX - 10 * xa, torsoTop + 8 * xa)
      .stroke({ color: COL_BLADE_BLUR, width: 1.2, alpha: xa * 0.35 });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Drops one cutlass, clutches chest, other drops, falls backward
  const t = frame / 7;

  const legH = 8;
  const torsoH = 11;
  const legTop = GY - 6 - legH;

  const fallBack = t * t * 8;
  const torsoTop = legTop - torsoH + 2 + fallBack * 0.6;
  const headTop = torsoTop - 11;
  const tiltBack = t * 0.7; // lean backward

  drawShadow(g, CX - fallBack * 0.3, GY, 10 + t * 2, 2.5, 0.25 * (1 - t * 0.5));

  // Legs buckle
  const legBuckle = t * 2;
  drawBoots(g, CX - fallBack * 0.1, GY, -legBuckle, legBuckle * 0.3);
  drawLegs(g, CX - fallBack * 0.1, legTop + fallBack * 0.3, legH - t * 1.5, -legBuckle, legBuckle * 0.3);

  drawTorso(g, CX - fallBack * 0.3, torsoTop, torsoH * (1 - t * 0.08), -tiltBack * 2);
  if (t < 0.88) {
    drawHead(g, CX - fallBack * 0.3, headTop + fallBack * 0.2, -tiltBack * 2.5);
  }

  // Frame 0-2: drops right cutlass (clutches chest with right hand)
  if (t < 0.35) {
    // Right hand still gripping
    const rHandX = CX + 8 - fallBack * 0.1;
    const rHandY = torsoTop + 4;
    drawArm(g, CX + 6, torsoTop + 4, rHandX, rHandY);
    drawCutlass(g, rHandX, rHandY, 0.3, 14);
  } else if (t < 0.6) {
    // Right cutlass drops — rotates and falls
    const dropT = (t - 0.35) / 0.25;
    const dropX = CX + 9 + dropT * 8;
    const dropY = torsoTop + 4 + dropT * dropT * 12;
    drawCutlass(g, dropX, dropY, 0.3 + dropT * 2, 14);
    // Right hand clutches chest
    const rHandX = CX + 1 - fallBack * 0.1;
    const rHandY = torsoTop + 3;
    drawArm(g, CX + 6, torsoTop + 4, rHandX, rHandY);
  } else {
    // Right cutlass on ground
    g.moveTo(CX + 5, GY - 1).lineTo(CX + 19, GY - 3)
      .stroke({ color: COL_BLADE, width: 2 });
    // Right hand down
    const rHandX = CX + 1 - fallBack * 0.3;
    const rHandY = torsoTop + 6;
    drawArm(g, CX + 5, torsoTop + 4, rHandX, rHandY);
  }

  // Frame 0-4: left cutlass still held, then drops
  if (t < 0.55) {
    const lHandX = CX - 7 - fallBack * 0.1;
    const lHandY = torsoTop + 5;
    drawArm(g, CX - 5, torsoTop + 4, lHandX, lHandY);
    drawCutlass(g, lHandX, lHandY, -0.2, 13);
  } else {
    // Left cutlass falls too
    const dropT2 = clamp01((t - 0.55) / 0.3);
    const ldropX = CX - 9 - dropT2 * 6;
    const ldropY = torsoTop + 5 + dropT2 * dropT2 * 14;
    if (t < 0.85) {
      drawCutlass(g, ldropX, ldropY, -0.2 - dropT2 * 1.8, 13);
    } else {
      // Lying on ground
      g.moveTo(CX - 5, GY - 1).lineTo(CX - 17, GY - 2)
        .stroke({ color: COL_BLADE, width: 2 });
    }
    // Left arm sprawls out
    const lHandX = CX - 10 - fallBack * 0.4;
    const lHandY = torsoTop + torsoH + dropT2 * 2;
    drawArm(g, CX - 5, torsoTop + 4, lHandX, lHandY);
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
 * Generate all Boarding Master sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBoardingMasterFrames(renderer: Renderer): RenderTexture[] {
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
