// Procedural sprite generator for the Halfling Alchemist unit type.
//
// Draws a halfling chemist at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Short halfling body with big goggles on forehead
//   • Leather apron stained with splattered chemicals
//   • Belt of colorful potion bottles (green, red, blue, purple)
//   • Wild frizzy hair (chemical burns), soot-covered face, big grin
//   • IDLE: examines potion, swirls it, occasional bubble
//   • MOVE: scurries hunched forward, potions clinking
//   • ATTACK: winds up and hurls potion in arc with sparkle trail
//   • CAST: mixes two potions, explosion of colored smoke
//   • DIE: drops all potions, chain explosion of colors, falls over

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — halfling alchemist
const COL_SKIN = 0xf0b878;            // warm tan halfling skin
const COL_SKIN_DK = 0xd49050;         // skin shadow
const COL_SOOT = 0x3a2a1a;            // soot/grime on face
const COL_CHEEK = 0xe87060;           // rosy cheeks
const COL_EYE = 0x3a5a8a;             // blue eyes
const COL_EYE_WHITE = 0xf0f0e0;

const COL_HAIR = 0xf0a020;            // frizzy orange-yellow (chemical burns)
const COL_HAIR_DK = 0xd07010;         // darker frizzed strands

const COL_APRON = 0xb8904a;           // leather apron tan
const COL_APRON_DK = 0x8a6830;        // apron shadow
const COL_APRON_STAIN_G = 0x44bb44;   // green chemical stain
const COL_APRON_STAIN_R = 0xcc4444;   // red stain
const COL_APRON_STAIN_B = 0x4488cc;   // blue stain
const COL_SHIRT = 0xd4c090;           // cream/yellowed shirt
const COL_PANTS = 0x6a5a3a;           // brown pants
const COL_BOOT = 0x3a2a1a;            // dark boots

const COL_GOGGLE_FRAME = 0x5a4030;    // leather goggle strap/frame
const COL_GOGGLE_LENS = 0x88aacc;     // tinted glass lens

const COL_BELT = 0x5a3a1a;            // dark leather belt
const COL_BELT_BUCKLE = 0xd4aa44;     // brass buckle

// Potion bottle colors
const COL_POTION_GREEN = 0x33cc44;
const COL_POTION_RED = 0xee3333;
const COL_POTION_BLUE = 0x3366ee;
const COL_POTION_PURPLE = 0xaa33cc;
const COL_POTION_YELLOW = 0xeecc22;
const COL_POTION_GLASS = 0xd0e8f0;    // bottle glass highlight
const COL_POTION_CORK = 0xb8904a;

// Effect colors
const COL_SMOKE_1 = 0xcc44cc;         // purple smoke
const COL_SMOKE_2 = 0x44cc88;         // green smoke
const COL_SMOKE_3 = 0xeeaa22;         // yellow smoke
const COL_SPARKLE = 0xffffff;
const COL_EXPLOSION = 0xff8800;

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
  w = 8,
  h = 2,
  alpha = 0.22,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

/**
 * Draw a single potion bottle.
 * color: liquid fill color. x/y: center bottom of bottle.
 */
function drawPotionBottle(
  g: Graphics,
  x: number,
  y: number,
  color: number,
  scale = 1,
  angle = 0,
): void {
  const bw = 3 * scale;
  const bh = 6 * scale;
  const nw = 1.4 * scale;
  const nh = 2.2 * scale;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Helper to rotate about (x, y-bh/2)
  function rot(px: number, py: number): [number, number] {
    const dx = px - x;
    const dy = py - (y - bh / 2);
    return [x + dx * cos - dy * sin, (y - bh / 2) + dx * sin + dy * cos];
  }

  // Bottle body
  const [bx1, by1] = rot(x - bw / 2, y - bh);
  void bx1; void by1;
  g.roundRect(x - bw / 2, y - bh, bw, bh, bw * 0.4)
    .fill({ color })
    .stroke({ color: COL_SHADOW, width: 0.3, alpha: 0.4 });
  // Glass highlight
  g.roundRect(x - bw / 2 + 0.5 * scale, y - bh + 0.5 * scale, bw * 0.35, bh * 0.45, bw * 0.2)
    .fill({ color: COL_POTION_GLASS, alpha: 0.45 });
  // Neck
  g.roundRect(x - nw / 2, y - bh - nh, nw, nh + 0.5 * scale, nw * 0.3)
    .fill({ color })
    .stroke({ color: COL_SHADOW, width: 0.3, alpha: 0.4 });
  // Cork
  g.roundRect(x - nw / 2 - 0.3 * scale, y - bh - nh - 1.5 * scale, nw + 0.6 * scale, 1.5 * scale, 0.4)
    .fill({ color: COL_POTION_CORK });
}

/**
 * Draw the halfling body with apron, belt, and potion belt bottles.
 * cx: horizontal center. torsoTop: top of torso. hunchFwd: 0=upright, 1=hunched.
 */
function drawHalflingBody(
  g: Graphics,
  cx: number,
  torsoTop: number,
  hunchFwd = 0,
): void {
  const tw = 10;
  const th = 11;
  const tilt = hunchFwd * 2;

  // Shirt underneath apron
  g.roundRect(cx - tw / 2 + tilt, torsoTop, tw, th, 2)
    .fill({ color: COL_SHIRT })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  // Leather apron — central trapezoid
  g.moveTo(cx - 4 + tilt, torsoTop + 2)
    .lineTo(cx + 4 + tilt, torsoTop + 2)
    .lineTo(cx + 5.5 + tilt, torsoTop + th - 1)
    .lineTo(cx - 5.5 + tilt, torsoTop + th - 1)
    .closePath()
    .fill({ color: COL_APRON })
    .stroke({ color: COL_APRON_DK, width: 0.4 });

  // Apron chemical stains — splotches
  g.circle(cx - 1 + tilt, torsoTop + 5, 1.5).fill({ color: COL_APRON_STAIN_G, alpha: 0.6 });
  g.circle(cx + 2 + tilt, torsoTop + 7, 1.2).fill({ color: COL_APRON_STAIN_R, alpha: 0.6 });
  g.circle(cx - 2 + tilt, torsoTop + 8, 1).fill({ color: COL_APRON_STAIN_B, alpha: 0.5 });
  g.circle(cx + 0.5 + tilt, torsoTop + 3, 0.8).fill({ color: COL_POTION_YELLOW, alpha: 0.5 });

  // Belt
  g.rect(cx - tw / 2 + tilt, torsoTop + th - 2.5, tw, 2)
    .fill({ color: COL_BELT });
  // Belt buckle
  g.roundRect(cx - 1.5 + tilt, torsoTop + th - 2.8, 3, 2.5, 0.4)
    .fill({ color: COL_BELT_BUCKLE });

  // Potion belt — small bottles hanging from belt
  const potions: [number, number][] = [
    [cx - 7 + tilt, torsoTop + th],   // far left
    [cx - 4 + tilt, torsoTop + th],   // left
    [cx + 4 + tilt, torsoTop + th],   // right
    [cx + 7 + tilt, torsoTop + th],   // far right
  ];
  const potionColors = [COL_POTION_GREEN, COL_POTION_RED, COL_POTION_BLUE, COL_POTION_PURPLE];
  for (let i = 0; i < potions.length; i++) {
    drawPotionBottle(g, potions[i][0], potions[i][1] + 4, potionColors[i], 0.7);
  }

  // Legs (short halfling legs)
  const legH = 6;
  g.roundRect(cx - 5 + tilt * 0.5, torsoTop + th - 1, 3.5, legH, 1)
    .fill({ color: COL_PANTS })
    .stroke({ color: COL_SHADOW, width: 0.2, alpha: 0.3 });
  g.roundRect(cx + 1.5 + tilt * 0.5, torsoTop + th - 1, 3.5, legH, 1)
    .fill({ color: COL_PANTS })
    .stroke({ color: COL_SHADOW, width: 0.2, alpha: 0.3 });

  // Boots (big hairy halfling feet)
  g.ellipse(cx - 3.5 + tilt * 0.3, GY - 1, 4, 2).fill({ color: COL_BOOT });
  g.ellipse(cx + 3.5 + tilt * 0.3, GY - 1, 4, 2).fill({ color: COL_BOOT });
}

function drawHalflingBodyWalk(
  g: Graphics,
  cx: number,
  torsoTop: number,
  strideL: number,
  strideR: number,
  hunchFwd = 0,
): void {
  const tw = 10;
  const th = 11;
  const tilt = hunchFwd * 2;

  g.roundRect(cx - tw / 2 + tilt, torsoTop, tw, th, 2)
    .fill({ color: COL_SHIRT })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  g.moveTo(cx - 4 + tilt, torsoTop + 2)
    .lineTo(cx + 4 + tilt, torsoTop + 2)
    .lineTo(cx + 5.5 + tilt, torsoTop + th - 1)
    .lineTo(cx - 5.5 + tilt, torsoTop + th - 1)
    .closePath()
    .fill({ color: COL_APRON })
    .stroke({ color: COL_APRON_DK, width: 0.4 });

  g.circle(cx - 1 + tilt, torsoTop + 5, 1.5).fill({ color: COL_APRON_STAIN_G, alpha: 0.6 });
  g.circle(cx + 2 + tilt, torsoTop + 7, 1.2).fill({ color: COL_APRON_STAIN_R, alpha: 0.6 });
  g.circle(cx - 2 + tilt, torsoTop + 8, 1).fill({ color: COL_APRON_STAIN_B, alpha: 0.5 });

  g.rect(cx - tw / 2 + tilt, torsoTop + th - 2.5, tw, 2).fill({ color: COL_BELT });
  g.roundRect(cx - 1.5 + tilt, torsoTop + th - 2.8, 3, 2.5, 0.4).fill({ color: COL_BELT_BUCKLE });

  // Belt potions swing with stride
  const potions: [number, number, number, number][] = [
    [cx - 7 + tilt, torsoTop + th, -strideL * 0.2, COL_POTION_GREEN],
    [cx - 4 + tilt, torsoTop + th, -strideL * 0.1, COL_POTION_RED],
    [cx + 4 + tilt, torsoTop + th, strideR * 0.1, COL_POTION_BLUE],
    [cx + 7 + tilt, torsoTop + th, strideR * 0.2, COL_POTION_PURPLE],
  ];
  for (const [px, py, ang, col] of potions) {
    drawPotionBottle(g, px, py + 4, col, 0.7, ang);
  }

  // Legs with stride
  const legH = 6;
  g.roundRect(cx - 5 + tilt * 0.5 + strideL, torsoTop + th - 1, 3.5, legH, 1)
    .fill({ color: COL_PANTS });
  g.roundRect(cx + 1.5 + tilt * 0.5 + strideR, torsoTop + th - 1, 3.5, legH, 1)
    .fill({ color: COL_PANTS });

  g.ellipse(cx - 3.5 + tilt * 0.3 + strideL, GY - 1, 4, 2).fill({ color: COL_BOOT });
  g.ellipse(cx + 3.5 + tilt * 0.3 + strideR, GY - 1, 4, 2).fill({ color: COL_BOOT });
}

/**
 * Draw the halfling head.
 * cx/top: head rect position. tilt: horizontal lean.
 * sootFace: 0=clean, 1=fully sooty.
 * grinning: show big grin.
 */
function drawHalflingHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  sootFace = 0.3,
  grinning = true,
): void {
  const hw = 9;
  const hh = 8;
  const hx = cx - hw / 2 + tilt;

  // Face
  g.roundRect(hx, top, hw, hh, 3)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  // Soot splotch over face
  if (sootFace > 0) {
    g.circle(cx - 1 + tilt, top + hh * 0.5, 3.5).fill({ color: COL_SOOT, alpha: sootFace * 0.35 });
    g.circle(cx + 2 + tilt, top + hh * 0.7, 1.5).fill({ color: COL_SOOT, alpha: sootFace * 0.25 });
  }

  // Rosy cheeks
  g.circle(cx - 2.8 + tilt, top + hh * 0.62, 1.5).fill({ color: COL_CHEEK, alpha: 0.55 });
  g.circle(cx + 2.8 + tilt, top + hh * 0.62, 1.5).fill({ color: COL_CHEEK, alpha: 0.55 });

  // Eyes
  const eyeY = top + hh * 0.38;
  g.circle(cx - 1.8 + tilt, eyeY, 1.2).fill({ color: COL_EYE_WHITE });
  g.circle(cx + 1.8 + tilt, eyeY, 1.2).fill({ color: COL_EYE_WHITE });
  g.circle(cx - 1.8 + tilt, eyeY, 0.75).fill({ color: COL_EYE });
  g.circle(cx + 1.8 + tilt, eyeY, 0.75).fill({ color: COL_EYE });
  // Pupils
  g.circle(cx - 1.5 + tilt, eyeY - 0.2, 0.3).fill({ color: COL_SHADOW });
  g.circle(cx + 2.1 + tilt, eyeY - 0.2, 0.3).fill({ color: COL_SHADOW });

  // Brows — raised (expressive)
  g.moveTo(cx - 3 + tilt, eyeY - 1.8)
    .quadraticCurveTo(cx - 1.5 + tilt, eyeY - 2.5, cx - 0.3 + tilt, eyeY - 1.8)
    .stroke({ color: COL_HAIR_DK, width: 0.7 });
  g.moveTo(cx + 3 + tilt, eyeY - 1.8)
    .quadraticCurveTo(cx + 1.5 + tilt, eyeY - 2.5, cx + 0.3 + tilt, eyeY - 1.8)
    .stroke({ color: COL_HAIR_DK, width: 0.7 });

  // Mouth
  if (grinning) {
    g.moveTo(cx - 2 + tilt, top + hh * 0.7)
      .quadraticCurveTo(cx + tilt, top + hh * 0.85, cx + 2 + tilt, top + hh * 0.7)
      .stroke({ color: COL_SKIN_DK, width: 0.7 });
    // Teeth
    g.roundRect(cx - 1.2 + tilt, top + hh * 0.71, 2.4, 1.2, 0.3)
      .fill({ color: 0xf0ece0 });
  } else {
    g.moveTo(cx - 1.5 + tilt, top + hh * 0.73)
      .lineTo(cx + 1.5 + tilt, top + hh * 0.73)
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
  }

  // Goggles on forehead
  drawGoggles(g, cx + tilt, top + 1.5);

  // Frizzy wild hair
  drawFrizzyHair(g, cx + tilt, top);
}

function drawGoggles(g: Graphics, cx: number, y: number): void {
  // Strap across forehead
  g.roundRect(cx - 5.5, y - 0.5, 11, 2.5, 1.2).fill({ color: COL_GOGGLE_FRAME });
  // Left lens
  g.circle(cx - 2.8, y + 0.8, 2.2).fill({ color: COL_GOGGLE_LENS, alpha: 0.7 })
    .stroke({ color: COL_GOGGLE_FRAME, width: 0.6 });
  // Right lens
  g.circle(cx + 2.8, y + 0.8, 2.2).fill({ color: COL_GOGGLE_LENS, alpha: 0.7 })
    .stroke({ color: COL_GOGGLE_FRAME, width: 0.6 });
  // Lens highlights
  g.circle(cx - 3.3, y + 0.3, 0.6).fill({ color: COL_SPARKLE, alpha: 0.5 });
  g.circle(cx + 2.3, y + 0.3, 0.6).fill({ color: COL_SPARKLE, alpha: 0.5 });
  // Center bridge
  g.moveTo(cx - 0.6, y + 0.8).lineTo(cx + 0.6, y + 0.8)
    .stroke({ color: COL_GOGGLE_FRAME, width: 0.8 });
}

function drawFrizzyHair(g: Graphics, cx: number, top: number): void {
  // Frizzy tufts radiating outward in all directions
  const tufts = [
    { dx: -5.5, dy: -1, ang: -0.5, len: 4.5 },
    { dx: -4, dy: -3, ang: -0.8, len: 5 },
    { dx: -1.5, dy: -4.5, ang: -1.2, len: 5.5 },
    { dx: 1, dy: -5, ang: Math.PI / 2 + 0.2, len: 5.5 },
    { dx: 3.5, dy: -4, ang: Math.PI / 2 + 0.7, len: 5 },
    { dx: 5, dy: -2.5, ang: Math.PI / 2 + 1.1, len: 4.5 },
    { dx: 5.5, dy: -0.5, ang: Math.PI / 2 + 1.4, len: 4 },
    { dx: -5.5, dy: 1.5, ang: -0.2, len: 3.5 },
    { dx: 5.5, dy: 2, ang: Math.PI - 0.2, len: 3.5 },
  ];
  for (const t of tufts) {
    const sx = cx + t.dx;
    const sy = top + t.dy;
    // Branch into 2-3 strands
    for (let i = -1; i <= 1; i++) {
      const a = t.ang + i * 0.18;
      const len = t.len - Math.abs(i) * 0.8;
      const ex = sx + Math.cos(a) * len;
      const ey = sy + Math.sin(a) * len;
      const col = i === 0 ? COL_HAIR : COL_HAIR_DK;
      g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: col, width: 1.1 + (i === 0 ? 0.2 : 0) });
    }
  }
  // Base hair cap under frizz
  g.roundRect(cx - 4.5, top - 2, 9, 4, 2).fill({ color: COL_HAIR });
}

/**
 * Draw the alchemist's arms. If holdingBottle is set, draw a potion in right hand.
 */
function drawArms(
  g: Graphics,
  cx: number,
  torsoTop: number,
  rArmAngle = 0,
  lArmAngle = 0,
  holdingBottle: number | null = null,
  holdingBottleL: number | null = null,
): void {
  const shoulderR = { x: cx + 4, y: torsoTop + 3 };
  const shoulderL = { x: cx - 4, y: torsoTop + 3 };
  const armLen = 8;

  // Right arm
  const rHandX = shoulderR.x + Math.cos(rArmAngle) * armLen;
  const rHandY = shoulderR.y + Math.sin(rArmAngle) * armLen;
  g.moveTo(shoulderR.x, shoulderR.y).lineTo(rHandX, rHandY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(rHandX, rHandY, 1.4).fill({ color: COL_SKIN });

  if (holdingBottle !== null) {
    drawPotionBottle(g, rHandX, rHandY + 4, holdingBottle, 0.85);
  }

  // Left arm
  const lHandX = shoulderL.x + Math.cos(lArmAngle) * armLen;
  const lHandY = shoulderL.y + Math.sin(lArmAngle) * armLen;
  g.moveTo(shoulderL.x, shoulderL.y).lineTo(lHandX, lHandY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(lHandX, lHandY, 1.4).fill({ color: COL_SKIN });

  if (holdingBottleL !== null) {
    drawPotionBottle(g, lHandX, lHandY + 4, holdingBottleL, 0.85);
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  // Swirl animation: bottle tilts back and forth
  const swirl = Math.sin(t * Math.PI * 2) * 0.4;
  // Occasional bubble rising from bottle
  const bubblePhase = (t * 8) % 1;

  const torsoTop = GY - 4 - 6 - 11 + breathe;  // GY - feet - legs - torso
  const headTop = torsoTop - 9;

  drawShadow(g, CX, GY);
  drawHalflingBody(g, CX, torsoTop, 0);
  drawHalflingHead(g, CX, headTop, 0, 0.25, false);

  // Arms: right arm raised, examining the bottle
  const examAngle = -Math.PI * 0.55 + swirl * 0.3;
  drawArms(g, CX, torsoTop, examAngle, Math.PI * 0.3, COL_POTION_GREEN, null);

  // Bubble rising from the bottle neck
  if (bubblePhase < 0.6) {
    const shoulderR = { x: CX + 4, y: torsoTop + 3 };
    const armLen = 8;
    const rHandX = shoulderR.x + Math.cos(examAngle) * armLen;
    const rHandY = shoulderR.y + Math.sin(examAngle) * armLen;
    const bubY = rHandY - 8 - bubblePhase * 10;
    g.circle(rHandX + 1, bubY, 1 + bubblePhase * 0.5)
      .fill({ color: COL_POTION_GREEN, alpha: 0.5 - bubblePhase * 0.3 })
      .stroke({ color: COL_POTION_GREEN, width: 0.3, alpha: 0.3 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.2;

  const torsoTop = GY - 4 - 6 - 11 - bob;
  const headTop = torsoTop - 9;

  const strideL = stride * 3;
  const strideR = -stride * 3;
  const hunch = 0.6; // scurrying hunched forward

  drawShadow(g, CX, GY, 8 + bob * 0.5, 2, 0.22);
  drawHalflingBodyWalk(g, CX, torsoTop, strideL, strideR, hunch);
  drawHalflingHead(g, CX, headTop, hunch * 1.5, 0.25, true);

  // Arms pumping while scurrying
  const rAngle = Math.PI * 0.1 + stride * 0.4;
  const lAngle = Math.PI * 0.1 - stride * 0.4;
  drawArms(g, CX, torsoTop, rAngle, lAngle - Math.PI * 0.2, null, null);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1 windup, 2-3 throw, 4-5 bottle in air + trail, 6-7 follow-through
  const t = frame / 7;

  const windupPhase = clamp01(t / 0.28);
  const throwPhase = clamp01((t - 0.28) / 0.28);
  const followPhase = clamp01((t - 0.56) / 0.44);

  const lean = windupPhase < 1 ? lerp(0, -2, windupPhase) : lerp(-2, 1.5, followPhase);
  const torsoTop = GY - 4 - 6 - 11;
  const headTop = torsoTop - 9;

  drawShadow(g, CX, GY);
  drawHalflingBody(g, CX, torsoTop, 0);
  drawHalflingHead(g, CX, headTop, lean * 0.3, 0.25, throwPhase > 0.3);

  // Windup: arm goes back and up
  // Throw: arm swings forward fast
  // Follow: arm extended forward
  let rAngle: number;
  if (windupPhase < 1) {
    rAngle = lerp(-Math.PI * 0.4, -Math.PI * 0.9, windupPhase);
  } else if (throwPhase < 1) {
    rAngle = lerp(-Math.PI * 0.9, Math.PI * 0.15, throwPhase);
  } else {
    rAngle = lerp(Math.PI * 0.15, Math.PI * 0.25, followPhase);
  }

  drawArms(g, CX, torsoTop, rAngle, Math.PI * 0.1, null, null);

  // Bottle in flight during throw phase
  if (throwPhase > 0.2 && followPhase < 0.7) {
    const flyT = throwPhase > 0 ? throwPhase : 0;
    const bottleX = CX + 8 + flyT * 12;
    const bottleY = (torsoTop + 3) - flyT * 8 + flyT * flyT * 12; // arc
    drawPotionBottle(g, bottleX, bottleY, COL_POTION_RED, 0.9, flyT * Math.PI * 2);

    // Sparkle trail
    const trailCount = 5;
    for (let i = 0; i < trailCount; i++) {
      const frac = i / trailCount;
      const tx = bottleX - frac * 10;
      const ty = bottleY + frac * 4;
      const alpha = (1 - frac) * 0.5 * flyT;
      g.circle(tx, ty, 0.8 + frac * 0.4).fill({ color: COL_POTION_RED, alpha });
      // Sparkle cross
      if (i % 2 === 0) {
        g.moveTo(tx - 1.2, ty).lineTo(tx + 1.2, ty).stroke({ color: COL_SPARKLE, width: 0.5, alpha: alpha * 0.7 });
        g.moveTo(tx, ty - 1.2).lineTo(tx, ty + 1.2).stroke({ color: COL_SPARKLE, width: 0.5, alpha: alpha * 0.7 });
      }
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const mixPhase = clamp01(t * 1.4);
  const explodePhase = clamp01((t - 0.6) / 0.4);

  const torsoTop = GY - 4 - 6 - 11;
  const headTop = torsoTop - 9;

  // Smoke cloud explosion background
  if (explodePhase > 0) {
    const smokeColors = [COL_SMOKE_1, COL_SMOKE_2, COL_SMOKE_3];
    for (let i = 0; i < 6; i++) {
      const ang = i * (Math.PI / 3) + t * 2;
      const dist = explodePhase * 12;
      const sx = CX + Math.cos(ang) * dist;
      const sy = torsoTop - 2 + Math.sin(ang) * dist * 0.5;
      const col = smokeColors[i % 3];
      g.circle(sx, sy, 2.5 + explodePhase * 3 + pulse).fill({ color: col, alpha: (1 - explodePhase) * 0.4 + 0.1 });
    }
  }

  drawShadow(g, CX, GY, 8 + mixPhase * 2, 2, 0.22);
  drawHalflingBody(g, CX, torsoTop, 0);
  drawHalflingHead(g, CX, headTop, 0, 0.35 + explodePhase * 0.5, explodePhase > 0.3);

  // Both arms raised to mix potions together above head
  const rAngle = lerp(Math.PI * 0.1, -Math.PI * 0.6, mixPhase);
  const lAngle = lerp(Math.PI * 0.1 - Math.PI * 0.2, -Math.PI * 0.4, mixPhase) - Math.PI;

  // Draw arms holding two bottles
  const shoulderR = { x: CX + 4, y: torsoTop + 3 };
  const shoulderL = { x: CX - 4, y: torsoTop + 3 };
  const armLen = 8;

  const rHandX = shoulderR.x + Math.cos(rAngle) * armLen;
  const rHandY = shoulderR.y + Math.sin(rAngle) * armLen;
  g.moveTo(shoulderR.x, shoulderR.y).lineTo(rHandX, rHandY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(rHandX, rHandY, 1.4).fill({ color: COL_SKIN });
  if (explodePhase < 0.5) {
    drawPotionBottle(g, rHandX, rHandY + 3.5, COL_POTION_GREEN, 0.85);
  }

  const lHandX = shoulderL.x + Math.cos(lAngle) * armLen;
  const lHandY = shoulderL.y + Math.sin(lAngle) * armLen;
  g.moveTo(shoulderL.x, shoulderL.y).lineTo(lHandX, lHandY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(lHandX, lHandY, 1.4).fill({ color: COL_SKIN });
  if (explodePhase < 0.5) {
    drawPotionBottle(g, lHandX, lHandY + 3.5, COL_POTION_BLUE, 0.85);
  }

  // Mix point glow — where bottles meet
  if (mixPhase > 0.5) {
    const mixX = (rHandX + lHandX) / 2;
    const mixY = (rHandY + lHandY) / 2;
    const glowR = (mixPhase - 0.5) * 2 * 6 + pulse * 2;
    g.circle(mixX, mixY, glowR).fill({ color: COL_SMOKE_3, alpha: 0.2 + pulse * 0.15 });
    g.circle(mixX, mixY, glowR * 0.5).fill({ color: COL_SPARKLE, alpha: 0.3 + pulse * 0.2 });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fallRight = t * 8;
  const dropY = t * t * 6;

  const torsoTop = GY - 4 - 6 - 11 + dropY;
  const headTop = torsoTop - 9;

  // Chain explosion effects — scattered colored splotches
  const explosionColors = [COL_POTION_GREEN, COL_POTION_RED, COL_POTION_BLUE, COL_POTION_PURPLE, COL_SMOKE_3];
  if (t > 0.1) {
    const expCount = Math.floor(t * 8);
    for (let i = 0; i < expCount; i++) {
      // Pseudo-random but deterministic positions
      const ex = CX + Math.sin(i * 137.5 * (Math.PI / 180)) * (8 + i * 2.5);
      const ey = GY - 8 + Math.cos(i * 137.5 * (Math.PI / 180)) * (6 + i * 1.5);
      const col = explosionColors[i % explosionColors.length];
      const alpha = clamp01((t - i * 0.08) * 1.5) * 0.55;
      const radius = 1.5 + (t - i * 0.08) * 5;
      if (alpha > 0) {
        g.circle(ex, ey, radius).fill({ color: col, alpha });
        // Flash center — hot orange core
        g.circle(ex, ey, radius * 0.35).fill({ color: COL_EXPLOSION, alpha: alpha * 0.6 });
      }
    }
  }

  drawShadow(g, CX + fallRight * 0.2, GY, lerp(8, 14, t), lerp(2, 1.2, t), 0.22 * (1 - t * 0.5));

  if (t < 0.85) {
    drawHalflingBodyWalk(g, CX + fallRight * 0.3, torsoTop, t * 2, -t, 0);
    drawHalflingHead(g, CX + fallRight * 0.3, headTop + dropY * 0.3, t * 5, 0.7, false);
  } else {
    // Fully fallen — lying sideways
    const lx = CX + fallRight * 0.3;
    const ly = GY - 5;
    g.ellipse(lx, ly, 12, 5).fill({ color: COL_APRON });
    g.circle(lx - 10, ly, 4.5).fill({ color: COL_SKIN });
    drawFrizzyHair(g, lx - 10, ly - 4);
    g.circle(lx - 10, ly - 1, 2.2).fill({ color: COL_GOGGLE_LENS, alpha: 0.5 })
      .stroke({ color: COL_GOGGLE_FRAME, width: 0.5 });
  }

  // Potions scattered and falling
  const potionData = [
    { col: COL_POTION_GREEN, dx: -8, fallT: 0.05 },
    { col: COL_POTION_RED, dx: -4, fallT: 0.12 },
    { col: COL_POTION_BLUE, dx: 3, fallT: 0.18 },
    { col: COL_POTION_PURPLE, dx: 8, fallT: 0.25 },
  ];
  for (const pd of potionData) {
    const localT = clamp01(t - pd.fallT);
    if (localT > 0) {
      const px = CX + pd.dx + localT * 5;
      const py = torsoTop + localT * 10;
      if (localT < 0.6) {
        drawPotionBottle(g, px, py, pd.col, 0.7, localT * Math.PI * 3);
      } else {
        // Shattered on ground — splotch
        g.circle(px, GY - 1, 3.5).fill({ color: pd.col, alpha: 0.45 });
      }
    }
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
 * Generate all Halfling Alchemist sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateHalflingAlchemistFrames(renderer: Renderer): RenderTexture[] {
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
