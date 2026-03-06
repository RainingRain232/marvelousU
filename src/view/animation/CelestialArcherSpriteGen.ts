// Procedural sprite generator for the Celestial Archer unit type.
//
// Draws an angelic marksman at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • White/silver light armor with celestial engravings
//   • Small white wings, folded close or half-extended
//   • Silver circlet on the brow
//   • Golden longbow with glowing bowstring
//   • Holy arrows that trail white-gold light
//   • Flowing silver hair, luminous skin, blue-white eyes
//   • Light particles drifting around the figure

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F  = 48;
const CX = F / 2;
const GY = F - 4;

/* ── palette ─────────────────────────────────────────────────────────── */

// Skin — luminous, slightly ethereal
const COL_SKIN       = 0xfff4e8;
const COL_SKIN_DK    = 0xeadbc4;
const COL_SKIN_LT    = 0xffffff;

// Silver hair
const COL_HAIR       = 0xe8eef8;
const COL_HAIR_HI    = 0xffffff;
const COL_HAIR_DK    = 0xb0bcd0;

// Light armor — white with silver trim
const COL_ARMOR      = 0xf0f4fc;
const COL_ARMOR_LT   = 0xffffff;
const COL_ARMOR_DK   = 0xc8d0e0;
const COL_SILVER     = 0xc8d4e8;
const COL_SILVER_HI  = 0xe8f0ff;

// Circlet
const COL_CIRCLET    = 0xd4dff0;
const COL_CIRCLET_GEM= 0xa8d0ff;  // pale blue gem

// Wings (small, feathered)
const COL_WING       = 0xffffff;
const COL_WING_MID   = 0xf0eef8;
const COL_WING_SHAD  = 0xd0cce8;
const COL_WING_BONE  = 0xf8f6ff;

// Quiver
const COL_QUIVER     = 0xd0b870;
const COL_QUIVER_DK  = 0xb89850;

// Bow
const COL_BOW        = 0xffe8a0;   // golden longbow
const COL_BOW_HI     = 0xfffff0;
const COL_BOW_DK     = 0xd4b840;
const COL_STRING     = 0xffffff;
const COL_STRING_GLW = 0xe0f0ff;

// Arrow
const COL_ARROW      = 0xf0e0a0;
const COL_ARROW_TIP  = 0xffffff;
const COL_ARROW_TRAIL= 0xfff0c0;
const COL_ARROW_GLOW = 0xffe840;

// Eyes
const COL_EYE_WHITE  = 0xffffff;
const COL_EYE_IRIS   = 0x88c8ff;
const COL_EYE_GLOW   = 0xc0e8ff;

// Light particle
const COL_PARTICLE   = 0xffffff;
const COL_PARTICLE2  = 0xd8f0ff;

const COL_SHADOW     = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, rx = 9, ry = 2, alpha = 0.16): void {
  g.ellipse(cx, gy + 1, rx, ry).fill({ color: COL_SHADOW, alpha });
}

/** Small feathered wing — one side */
function drawSmallWing(
  g: Graphics,
  cx: number,
  shoulderY: number,
  side: number,       // -1 = left, +1 = right
  foldFactor: number, // 0 = folded, 1 = extended
  flapY: number,
  alpha = 1,
): void {
  const s  = side;
  const sp = 0.55 + foldFactor * 0.45;  // spread multiplier

  const ax = cx + s * 4;
  const ay = shoulderY;

  // Elbow
  const ex = cx + s * 11 * sp;
  const ey = shoulderY - 5 + flapY;

  // Tip
  const tx = cx + s * 18 * sp;
  const ty = shoulderY + 1 + flapY * 0.5;

  // Trailing edge
  const trX = cx + s * 10 * sp;
  const trY = shoulderY + 5 + flapY * 0.2;
  const trTX= cx + s * 15 * sp;
  const trTY= shoulderY + 4 + flapY * 0.3;

  // Membrane fill
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 6 * sp, shoulderY - 7 + flapY * 0.7, ex, ey)
    .lineTo(tx, ty)
    .quadraticCurveTo(trTX, trTY, trX, trY)
    .quadraticCurveTo(cx + s * 5 * sp, shoulderY + 3, ax, ay + 2)
    .closePath()
    .fill({ color: COL_WING_MID, alpha: alpha * 0.92 });

  // Inner highlight
  g.moveTo(ax + s * 1.5, ay + 1)
    .quadraticCurveTo(cx + s * 7 * sp, shoulderY - 4 + flapY * 0.6, ex - s * 2, ey + 2)
    .lineTo(trX + s * 1.5, trY - 2)
    .quadraticCurveTo(cx + s * 5.5 * sp, shoulderY + 1.5, ax + s * 1.5, ay + 2)
    .closePath()
    .fill({ color: COL_WING, alpha: alpha * 0.55 });

  // Leading bone
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 6 * sp, shoulderY - 7 + flapY * 0.7, ex, ey)
    .lineTo(tx, ty)
    .stroke({ color: COL_WING_BONE, alpha, width: 1.2 });

  // Feather vein
  g.moveTo(lerp(ax, tx, 0.5), lerp(ay, ty, 0.5))
    .lineTo(lerp(ax, trX, 0.5), lerp(ay, trY, 0.5))
    .stroke({ color: COL_WING_SHAD, alpha: alpha * 0.25, width: 0.5 });

  // Primary feathers (3)
  for (let i = 0; i < 3; i++) {
    const bt  = 0.6 + i * 0.13;
    const fbx = ax + (tx - ax) * bt;
    const fby = ay + (ty - ay) * bt + (ey - ay) * (1 - bt) * 0.4;
    const fLen = 7 - i * 1.3;
    const fAng = Math.PI * 0.55 + s * 0.08 + i * 0.12 * s;
    const ftx  = fbx + Math.cos(fAng) * fLen;
    const fty  = fby + Math.sin(fAng) * fLen;
    const perpX = -Math.sin(fAng) * 1.5;
    const perpY =  Math.cos(fAng) * 1.5;
    g.moveTo(fbx, fby)
      .quadraticCurveTo(fbx + (ftx - fbx) * 0.5 + perpX, fby + (fty - fby) * 0.5 + perpY, ftx, fty)
      .quadraticCurveTo(fbx + (ftx - fbx) * 0.5 - perpX, fby + (fty - fby) * 0.5 - perpY, fbx, fby)
      .fill({ color: i % 2 === 0 ? COL_WING : COL_WING_MID, alpha: alpha * 0.9 });
    g.moveTo(fbx, fby).lineTo(ftx, fty)
      .stroke({ color: COL_WING_SHAD, alpha: alpha * 0.2, width: 0.35 });
  }
}

function drawWings(
  g: Graphics,
  cx: number,
  shoulderY: number,
  foldFactor: number,
  flapY: number,
  alpha = 1,
): void {
  drawSmallWing(g, cx, shoulderY, -1, foldFactor, flapY, alpha);
  drawSmallWing(g, cx, shoulderY,  1, foldFactor, flapY, alpha);
}

function drawLegs(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  stL: number,
  stR: number,
  alpha = 1,
): void {
  // Slender silver greaves
  for (const [sx, w] of [
    [cx - 5 + stL, 3.2],
    [cx + 1.8 + stR, 3.2],
  ] as [number, number][]) {
    g.roundRect(sx, top, w, h * 0.55, 1).fill({ color: COL_ARMOR, alpha });
    g.roundRect(sx, top + h * 0.55, w, h * 0.45, 0.8).fill({ color: COL_ARMOR_DK, alpha });
    // Edge highlight
    g.moveTo(sx, top).lineTo(sx, top + h).stroke({ color: COL_SILVER_HI, alpha: alpha * 0.25, width: 0.5 });
  }
}

function drawBoots(g: Graphics, cx: number, gy: number, stL: number, stR: number, alpha = 1): void {
  for (const sx of [cx - 5 + stL, cx + 1.8 + stR]) {
    g.roundRect(sx, gy - 3.5, 3.2, 3.5, 1).fill({ color: COL_SILVER, alpha });
    g.moveTo(sx, gy - 3.5).lineTo(sx + 3.2, gy - 3.5)
      .stroke({ color: COL_SILVER_HI, alpha: alpha * 0.4, width: 0.5 });
  }
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0, alpha = 1): void {
  const tw = 9;
  const x  = cx - tw / 2 + tilt;

  // Breastplate — slim and elegant
  g.moveTo(x, top)
    .lineTo(x - 1, top + h * 0.32)
    .quadraticCurveTo(x + 0.5, top + h, cx + tilt, top + h + 0.5)
    .quadraticCurveTo(cx + tilt + tw / 2 - 0.5, top + h, cx + tilt + tw / 2 + 1, top + h * 0.32)
    .lineTo(cx + tilt + tw / 2, top)
    .closePath()
    .fill({ color: COL_ARMOR, alpha });

  // Highlight panel
  g.moveTo(x + 1.5, top + 1)
    .lineTo(x + 1, top + h * 0.3)
    .quadraticCurveTo(x + 2, top + h - 2, cx + tilt, top + h - 0.5)
    .quadraticCurveTo(cx + tilt + tw / 2 - 2, top + h - 2, cx + tilt + tw / 2 - 1, top + h * 0.3)
    .lineTo(cx + tilt + tw / 2 - 1.5, top + 1)
    .closePath()
    .fill({ color: COL_ARMOR_LT, alpha: alpha * 0.5 });

  // Celestial star engraving
  const sx = cx + tilt;
  const sy = top + h * 0.42;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 8;
    g.moveTo(sx, sy)
      .lineTo(sx + Math.cos(ang) * 2.8, sy + Math.sin(ang) * 2.8)
      .stroke({ color: COL_CIRCLET_GEM, alpha: alpha * 0.5, width: 0.5 });
  }
  g.circle(sx, sy, 0.9).fill({ color: COL_CIRCLET_GEM, alpha: alpha * 0.7 });

  // Shoulder spaulders (light, curved)
  for (const s of [-1, 1]) {
    const spx = cx + tilt + s * (tw / 2);
    g.moveTo(spx, top + 1)
      .quadraticCurveTo(spx + s * 4, top - 1, spx + s * 3.5, top + 5.5)
      .quadraticCurveTo(spx + s * 1, top + 7, spx, top + 4)
      .closePath()
      .fill({ color: COL_ARMOR, alpha });
    g.moveTo(spx, top + 1)
      .quadraticCurveTo(spx + s * 4, top - 1, spx + s * 3.5, top + 5.5)
      .stroke({ color: COL_SILVER_HI, alpha: alpha * 0.4, width: 0.7 });
  }

  // Belt/waist band
  g.rect(x + 0.5, top + h - 2.5, tw - 1, 2).fill({ color: COL_ARMOR_DK, alpha });
  g.rect(x + 0.5, top + h - 2.5, tw - 1, 0.7).fill({ color: COL_SILVER_HI, alpha: alpha * 0.4 });
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0, eyeGlw = 0.6, alpha = 1): void {
  const hw = 6.5;
  const hh = 7.5;
  const x  = cx - hw / 2 + tilt;

  // Silver flowing hair behind head
  g.ellipse(cx + tilt, top + hh * 0.3, hw * 0.85 + 2, hh * 0.7 + 2)
    .fill({ color: COL_HAIR, alpha: alpha * 0.7 });

  // Face
  g.roundRect(x + 0.5, top + 1.5, hw - 1, hh - 2, 2)
    .fill({ color: COL_SKIN, alpha });

  // Jaw shading
  g.ellipse(cx + tilt, top + hh - 1, hw * 0.38, 2)
    .fill({ color: COL_SKIN_DK, alpha: alpha * 0.2 });

  // Silver circlet across brow
  g.moveTo(x, top + 2.8)
    .quadraticCurveTo(cx + tilt, top + 1.5, x + hw, top + 2.8)
    .stroke({ color: COL_CIRCLET, alpha, width: 1.2 });
  // Circlet gem at centre
  g.circle(cx + tilt, top + 2, 1.1).fill({ color: COL_CIRCLET_GEM, alpha });
  g.circle(cx + tilt, top + 2, 0.5).fill({ color: COL_SKIN_LT, alpha: alpha * 0.7 });

  // Hair on top (flowing silver)
  g.roundRect(x - 0.5, top, hw + 1, 3.5, 1.5).fill({ color: COL_HAIR, alpha });
  g.roundRect(x + 1, top + 0.5, hw - 2, 1.5, 1).fill({ color: COL_HAIR_HI, alpha: alpha * 0.4 });

  // Blue-white eyes
  const eyeY = top + hh * 0.42;
  for (const ex of [cx - 1.7 + tilt, cx + 1.7 + tilt]) {
    g.ellipse(ex, eyeY, 1.3, 0.85).fill({ color: COL_EYE_WHITE, alpha });
    g.circle(ex, eyeY, 0.75).fill({ color: COL_EYE_IRIS, alpha });
    g.circle(ex, eyeY, 0.3).fill({ color: COL_SHADOW, alpha: alpha * 0.6 });
    // Eye glow
    if (eyeGlw > 0) {
      g.circle(ex, eyeY, 1.1 + eyeGlw * 0.5).fill({ color: COL_EYE_GLOW, alpha: alpha * eyeGlw * 0.35 });
    }
    // Glint
    g.circle(ex - 0.4, eyeY - 0.3, 0.3).fill({ color: COL_SKIN_LT, alpha: alpha * 0.9 });
  }

  // Brows (gentle, arched)
  g.moveTo(cx - 2.8 + tilt, eyeY - 1.4)
    .lineTo(cx - 0.6 + tilt, eyeY - 1.7)
    .stroke({ color: COL_HAIR_DK, alpha: alpha * 0.5, width: 0.5 });
  g.moveTo(cx + 2.8 + tilt, eyeY - 1.4)
    .lineTo(cx + 0.6 + tilt, eyeY - 1.7)
    .stroke({ color: COL_HAIR_DK, alpha: alpha * 0.5, width: 0.5 });

  // Nose
  g.moveTo(cx + tilt, eyeY + 0.8)
    .lineTo(cx - 0.4 + tilt, eyeY + 2)
    .stroke({ color: COL_SKIN_DK, alpha: alpha * 0.2, width: 0.4 });

  // Mouth (gentle smile)
  g.moveTo(cx - 1.2 + tilt, top + hh * 0.7)
    .quadraticCurveTo(cx + tilt, top + hh * 0.73, cx + 1.2 + tilt, top + hh * 0.7)
    .stroke({ color: COL_SKIN_DK, alpha: alpha * 0.35, width: 0.45 });

  // Hair strand falling to side
  g.moveTo(x - 0.5, top + 3)
    .quadraticCurveTo(x - 2, top + 8, x - 1.5, top + 13)
    .stroke({ color: COL_HAIR, alpha: alpha * 0.55, width: 1 });
  g.moveTo(x + hw + 0.5, top + 3)
    .quadraticCurveTo(x + hw + 2, top + 8, x + hw + 1.5, top + 13)
    .stroke({ color: COL_HAIR, alpha: alpha * 0.55, width: 1 });
}

function drawQuiver(g: Graphics, cx: number, torsoTop: number, bob = 0, alpha = 1): void {
  // Quiver on back, right side
  const qx = cx + 4;
  const qy = torsoTop + bob;
  const qh = 9;
  const qw = 3.5;

  g.roundRect(qx, qy, qw, qh, 1).fill({ color: COL_QUIVER, alpha });
  g.moveTo(qx, qy).lineTo(qx + qw, qy).stroke({ color: COL_QUIVER_DK, alpha, width: 0.7 });

  // Arrow fletchings peeking out
  for (let i = 0; i < 3; i++) {
    const ax  = qx + 0.5 + i * 0.9;
    const ay  = qy - 3.5 + (i % 2) * 0.7;
    g.moveTo(ax, ay).lineTo(ax, ay + 3.5)
      .stroke({ color: COL_ARROW, alpha: alpha * 0.8, width: 0.8 });
    g.moveTo(ax - 1, ay + 1).lineTo(ax, ay).lineTo(ax + 1, ay + 1)
      .fill({ color: COL_ARMOR_DK }).stroke({ color: COL_ARMOR_DK, alpha: alpha * 0.4, width: 0.3 });
  }
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  alpha = 1,
): void {
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);

  // Upper arm (armored)
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_ARMOR, alpha, width: 2.8 });
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_SILVER_HI, alpha: alpha * 0.3, width: 1 });

  // Forearm
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_SKIN, alpha, width: 2.2 });
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_ARMOR_DK, alpha: alpha * 0.25, width: 0.8 });

  // Hand
  g.circle(ex, ey, 1.3).fill({ color: COL_SKIN, alpha });
}

function drawBow(g: Graphics, hx: number, hy: number, drawn = 0, alpha = 1): void {
  // Longbow — tall, graceful arc
  const bh  = 14;
  const bx  = hx - 3 + drawn * 4;

  // Outer curve stave
  g.moveTo(bx, hy - bh)
    .bezierCurveTo(bx - 9, hy - bh * 0.5, bx - 9, hy + bh * 0.5, bx, hy + bh)
    .stroke({ color: COL_BOW, alpha, width: 2 });

  // Highlight on stave
  g.moveTo(bx + 1, hy - bh + 2)
    .bezierCurveTo(bx - 4.5, hy - bh * 0.4, bx - 4.5, hy + bh * 0.4, bx + 1, hy + bh - 2)
    .stroke({ color: COL_BOW_HI, alpha: alpha * 0.55, width: 0.7 });

  // Dark edge
  g.moveTo(bx - 1, hy - bh + 1)
    .bezierCurveTo(bx - 10, hy - bh * 0.5, bx - 10, hy + bh * 0.5, bx - 1, hy + bh - 1)
    .stroke({ color: COL_BOW_DK, alpha: alpha * 0.45, width: 0.8 });

  // Bowstring (glowing white)
  const sx = bx + drawn * 5;
  g.moveTo(bx, hy - bh).lineTo(sx, hy).lineTo(bx, hy + bh)
    .stroke({ color: COL_STRING, alpha, width: 0.9 });
  g.moveTo(bx, hy - bh).lineTo(sx, hy).lineTo(bx, hy + bh)
    .stroke({ color: COL_STRING_GLW, alpha: alpha * 0.4, width: 2.5 });

  // Bow tip ornaments
  for (const ty of [hy - bh, hy + bh]) {
    g.circle(bx, ty, 1).fill({ color: COL_BOW_HI, alpha });
  }
}

function drawArrow(g: Graphics, bx: number, hy: number, drawn = 0, alpha = 1): void {
  // Arrow nocked on string, pointing right
  const startX = bx + drawn * 5;
  const endX   = startX + 14;

  // Shaft
  g.moveTo(startX, hy).lineTo(endX, hy)
    .stroke({ color: COL_ARROW, alpha, width: 1 });

  // Holy light trail along shaft
  g.moveTo(startX, hy).lineTo(endX - 2, hy)
    .stroke({ color: COL_ARROW_TRAIL, alpha: alpha * 0.45, width: 2.5 });

  // Tip (arrowhead)
  g.moveTo(endX - 3, hy - 1.8).lineTo(endX + 1, hy).lineTo(endX - 3, hy + 1.8).closePath()
    .fill({ color: COL_ARROW_TIP, alpha });

  // Arrowhead glow
  g.circle(endX, hy, 2).fill({ color: COL_ARROW_GLOW, alpha: alpha * 0.3 });

  // Fletching
  g.moveTo(startX - 2, hy - 2).lineTo(startX + 1, hy).lineTo(startX - 2, hy + 2)
    .fill({ color: COL_WING_MID });
  g.stroke({ color: COL_WING_SHAD, width: 0.3, alpha: alpha * 0.5 });
}

/** Draw flying arrow with holy light trail */
function drawFlyingArrow(g: Graphics, x: number, y: number, alpha = 1): void {
  // Light trail
  for (let i = 1; i <= 6; i++) {
    g.circle(x - i * 2.5, y, 1.5 - i * 0.18)
      .fill({ color: COL_ARROW_TRAIL, alpha: alpha * (0.5 - i * 0.07) });
  }
  // Glow
  g.circle(x, y, 2.2).fill({ color: COL_ARROW_GLOW, alpha: alpha * 0.35 });
  // Shaft
  g.moveTo(x - 8, y).lineTo(x + 1, y).stroke({ color: COL_ARROW, alpha, width: 1 });
  // Tip
  g.moveTo(x - 2, y - 1.5).lineTo(x + 2, y).lineTo(x - 2, y + 1.5).closePath()
    .fill({ color: COL_ARROW_TIP, alpha });
}

function drawLightParticles(
  g: Graphics,
  cx: number,
  cy: number,
  t: number,
  count: number,
  intensity: number,
): void {
  for (let i = 0; i < count; i++) {
    const ang   = t * Math.PI * 1.5 + i * (Math.PI * 2 / count);
    const dist  = 6 + i * 1.2;
    const px    = cx + Math.cos(ang) * dist;
    const py    = cy + Math.sin(ang) * dist * 0.4;
    const r     = 0.6 + Math.sin(ang + i) * 0.2;
    g.circle(px, py, r)
      .fill({ color: i % 2 === 0 ? COL_PARTICLE : COL_PARTICLE2, alpha: intensity * (0.25 + Math.sin(ang) * 0.08) });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t       = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.45;
  const particleT = t;

  const legH    = 8;
  const torsoH  = 9;
  const legTop  = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1.5 + breathe;
  const headTop = torsoTop - 8.5;

  drawShadow(g, CX, GY);
  drawLightParticles(g, CX, torsoTop + torsoH * 0.4, particleT, 5, 0.6);

  // Wings folded close
  const foldFactor = 0.08;
  const flapY = Math.sin(t * Math.PI * 2) * 0.5;
  drawWings(g, CX, torsoTop, foldFactor, flapY);

  drawQuiver(g, CX, torsoTop + 1, breathe * 0.3);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawBoots(g, CX, GY, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, 0.55);

  // Bow held lowered in left hand
  const lHandX = CX - 7;
  const lHandY = torsoTop + torsoH * 0.5 + breathe;
  drawArm(g, CX - 4, torsoTop + 2, lHandX, lHandY);
  drawBow(g, lHandX, lHandY, 0);

  // Right arm at side, nocking arrow
  const rHandX = CX + 5;
  const rHandY = torsoTop + torsoH * 0.65 + breathe;
  drawArm(g, CX + 4, torsoTop + 2, rHandX, rHandY);
  // Arrow held at string, not yet drawn
  g.moveTo(rHandX - 1, rHandY).lineTo(rHandX + 5, rHandY - 1)
    .stroke({ color: COL_ARROW, alpha: 0.7, width: 0.8 });
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t      = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob    = Math.abs(stride) * 1.1;

  const legH   = 8;
  const torsoH = 9;
  const stL    = Math.round(stride * 3);
  const stR    = Math.round(-stride * 3);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1.5 - bob * 0.25;
  const headTop = torsoTop - 8.5;

  const wingFold = 0.45 + Math.abs(stride) * 0.2;  // half-extended for speed
  const flapY    = stride * 2.5;

  drawShadow(g, CX, GY, 9 + Math.abs(stride), 2, 0.16);
  drawLightParticles(g, CX, torsoTop + torsoH * 0.4, t, 4, 0.5);

  drawWings(g, CX, torsoTop, wingFold, flapY);

  const quiverBob = Math.abs(stride) * 1.5;
  drawQuiver(g, CX, torsoTop + 1, quiverBob);
  drawLegs(g, CX, legTop, legH, stL, stR);
  drawBoots(g, CX, GY, stL, stR);

  const sway = stride * 0.5;
  drawTorso(g, CX, torsoTop, torsoH, sway);
  drawHead(g, CX, headTop, sway * 0.6, 0.5);

  // Arm swing — bow arm forward, draw arm back
  const lHandX = CX - 7 - stride * 1.5;
  const lHandY = torsoTop + torsoH * 0.5 + bob * 0.3;
  drawArm(g, CX - 4, torsoTop + 2, lHandX, lHandY);
  drawBow(g, lHandX, lHandY, 0);

  const rHandX = CX + 5 + stride * 1.5;
  const rHandY = torsoTop + torsoH * 0.5 + bob * 0.3;
  drawArm(g, CX + 4, torsoTop + 2, rHandX, rHandY);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1 nock, 2-3 draw, 4-5 hold+aim, 6 release, 7 recover
  const phases = [0, 0.12, 0.26, 0.42, 0.58, 0.74, 0.88, 1.0];
  const t      = phases[Math.min(frame, 7)];

  const legH   = 8;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1.5;
  const headTop = torsoTop - 8.5;

  const drawn  = t < 0.58 ? clamp01(t / 0.45) : clamp01(1 - (t - 0.58) / 0.15);
  const arrowVisible = t < 0.78;

  drawShadow(g, CX, GY);
  drawWings(g, CX, torsoTop, 0.15, drawn * 1.5);

  drawQuiver(g, CX, torsoTop + 1);
  drawLegs(g, CX, legTop, legH, -1.5, 1.5);
  drawBoots(g, CX, GY, -1.5, 1.5);
  drawTorso(g, CX, torsoTop, torsoH, -0.5);
  drawHead(g, CX, headTop, -0.5, 0.6 + drawn * 0.3);

  // Bow arm (left) extended forward
  const lHandX = CX - 8;
  const lHandY = torsoTop + 3.5;
  drawArm(g, CX - 4, torsoTop + 2, lHandX, lHandY);
  drawBow(g, lHandX, lHandY, drawn);

  // Draw arm (right) pulls string back
  const drawX = lHandX + drawn * 6 + 2;
  const drawY = lHandY;
  drawArm(g, CX + 4, torsoTop + 2, drawX, drawY);

  if (arrowVisible) {
    drawArrow(g, lHandX, lHandY, drawn);
  }

  // Released arrow flies right
  if (t >= 0.78) {
    const arrowProgress = (t - 0.78) / 0.22;
    const ax = lHandX + 4 + arrowProgress * 22;
    const ay = lHandY - arrowProgress * 1;
    drawFlyingArrow(g, ax, ay, 1 - arrowProgress * 0.4);
  }

  // White-gold light beam at release
  if (t >= 0.74 && t <= 0.88) {
    const beamAlpha = clamp01(1 - Math.abs(t - 0.78) / 0.1) * 0.5;
    g.moveTo(lHandX + 4, lHandY)
      .lineTo(CX + 28, lHandY - 2)
      .stroke({ color: COL_ARROW_TRAIL, alpha: beamAlpha, width: 3 });
    g.moveTo(lHandX + 4, lHandY)
      .lineTo(CX + 28, lHandY - 2)
      .stroke({ color: 0xffffff, alpha: beamAlpha * 0.6, width: 1 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Fire multiple arrows upward that rain down as light shafts
  const t         = frame / 7;
  const pulse     = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.3);

  const legH   = 8;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1.5;
  const headTop = torsoTop - 8.5;

  drawShadow(g, CX, GY);

  // Raining light shafts from above (cast builds up beams)
  if (t > 0.25) {
    const shaftCount = Math.floor(intensity * 5) + 1;
    for (let i = 0; i < shaftCount; i++) {
      const sx  = CX - 14 + i * 7;
      const topY = -2;
      const botY = GY - 1;
      const shaftAlpha = clamp01((intensity - i * 0.15)) * (0.18 + pulse * 0.1);
      g.moveTo(sx, topY).lineTo(sx + 2, botY)
        .stroke({ color: COL_ARROW_TRAIL, alpha: shaftAlpha, width: 2 });
      g.moveTo(sx, topY).lineTo(sx + 2, botY)
        .stroke({ color: COL_ARROW_GLOW, alpha: shaftAlpha * 0.4, width: 5 });
      // Arrow tip at bottom of shaft
      const tipAlpha = shaftAlpha * 1.4;
      const tipY = Math.min(botY, topY + (botY - topY) * (0.3 + t * 0.5));
      g.circle(sx + 1, tipY, 1.5).fill({ color: COL_ARROW_TIP, alpha: tipAlpha });
    }
  }

  // Arrows fired upward at start of cast
  if (t < 0.55) {
    for (let i = 0; i < 3; i++) {
      const prog  = clamp01((t - i * 0.06) * 2.5);
      const ax    = CX - 6 + i * 6;
      const ay    = torsoTop - prog * 22 - 5;
      if (prog > 0) {
        drawFlyingArrow(g, ax + prog * 2, ay, 1 - prog * 0.3);
        // Rotate arrow upward: draw vertical trail
        g.moveTo(ax + prog * 2, ay + 1).lineTo(ax + prog * 1.5, ay + 8)
          .stroke({ color: COL_ARROW_TRAIL, alpha: (1 - prog) * 0.4, width: 1.5 });
      }
    }
  }

  drawLightParticles(g, CX, torsoTop + torsoH * 0.4, t * 2, 6, 0.55 + intensity * 0.25);
  drawWings(g, CX, torsoTop, 0.35 + intensity * 0.3, intensity * 2.5 + pulse * 0.5);

  drawQuiver(g, CX, torsoTop + 1, pulse * 0.5);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawBoots(g, CX, GY, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, 0.6 + intensity * 0.35, 1);

  // Bow raised diagonally upward — firing volley skyward
  const lHandX = CX - 6;
  const lHandY = torsoTop + 1 - intensity * 4;
  drawArm(g, CX - 4, torsoTop + 2, lHandX, lHandY);
  drawBow(g, lHandX, lHandY, clamp01(1 - t * 1.5));

  // Draw arm
  const rHandX = CX + 2 + intensity * 4;
  const rHandY = lHandY + 1 + intensity * 2;
  drawArm(g, CX + 4, torsoTop + 2, rHandX, rHandY);

  // Bow glow aura during cast
  g.ellipse(lHandX, lHandY, 5 + intensity * 4, 12 + intensity * 4)
    .fill({ color: COL_ARROW_GLOW, alpha: intensity * 0.15 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH   = 8;
  const torsoH = 9;

  const fallX = t * 7;
  const dropY = t * t * 11;
  const tilt  = t * 0.6;
  const alpha = 1 - t * 0.5;

  const legTop   = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1.5 + dropY;
  const headTop  = torsoTop - 8.5;

  drawShadow(g, CX + fallX * 0.2, GY, 9 - t * 2, 2, 0.16 * (1 - t * 0.6));

  // Wings fold around body protectively
  const wingFold    = 0.5 - t * 0.45;     // fold in as dies
  const wingFlapY   = -t * 2;             // droop down
  drawWings(g, CX + fallX * 0.1, torsoTop, Math.max(0, wingFold), wingFlapY, alpha);

  // Bow falls from grasp
  if (t < 0.65) {
    const bx = CX - 8 + t * 4 + fallX * 0.5;
    const by = torsoTop + torsoH * 0.4 + dropY * 0.5;
    drawBow(g, bx, by, 0, 1 - t * 0.55);
  }

  drawQuiver(g, CX + fallX * 0.1, torsoTop + 1, 0, alpha);
  drawLegs(g, CX + fallX * 0.05, legTop + dropY * 0.3, legH, t * 1.5, -t * 0.8, alpha);
  drawBoots(g, CX + fallX * 0.05, GY, t * 1.5, -t * 0.8, alpha);

  const ox = Math.sin(tilt) * 8;
  drawTorso(g, CX + ox + fallX * 0.25, torsoTop, torsoH * (1 - t * 0.08), tilt * 3.5, alpha);

  if (t < 0.88) {
    drawHead(g, CX + ox + fallX * 0.25, headTop + dropY * 0.2, tilt * 4.5, Math.max(0, 0.55 - t * 0.8), alpha);
  }

  // Light dims — fading particles rise upward
  for (let i = 0; i < 4; i++) {
    const px  = CX - 6 + i * 4 + Math.sin(frame * 0.6 + i) * 2.5;
    const py  = torsoTop - t * 18 - i * 6;
    const r   = 1.4 - t * 0.4;
    const a   = t * 0.4 * (1 - i * 0.18);
    if (a > 0 && r > 0) {
      g.circle(px, py, r).fill({ color: COL_PARTICLE, alpha: a });
    }
  }

  // Arms wrap around body protectively
  if (t > 0.4) {
    const ax = CX + ox + fallX * 0.2;
    const ay = torsoTop;
    drawArm(g, ax + 4, ay + 2, ax - 5, ay + 6, alpha * 0.9);
    drawArm(g, ax - 4, ay + 2, ax + 5, ay + 6, alpha * 0.9);
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all Celestial Archer sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateCelestialArcherFrames(renderer: Renderer): RenderTexture[] {
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
