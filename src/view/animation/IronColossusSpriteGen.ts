// Procedural sprite generator for the Iron Colossus unit type.
//
// Draws an enormous iron construct at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Dark iron plate armor bolted together, fills the full 48×48 frame
//   • Glowing amber/orange rune engravings across chest, arms, and legs
//   • Steam vents at shoulders that puff smoke
//   • Riveted joints and industrial aesthetic
//   • Blocky, massive proportions — extremely heavy presence
//   • Rune pulse idle, ground-shaking stomp move, piston-punch attack
//   • Full rune overcharge cast, one-by-one rune dark death collapse

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 2;

// Palette — dark iron + amber runes + steam
const COL_IRON_BASE = 0x3a3a3a; // dark iron plate
const COL_IRON_MID = 0x4e4e4e; // medium iron
const COL_IRON_HI = 0x6a6a6a; // iron highlight/bevel
const COL_IRON_DK = 0x222222; // deep shadow iron
const COL_IRON_RUST = 0x5a3a28; // rust tint on edges

const COL_RUNE = 0xff8800; // orange rune glow
const COL_RUNE_HI = 0xffcc44; // bright rune center
const COL_RUNE_DK = 0xcc4400; // dim rune

const COL_BOLT = 0x555555; // rivet bolt head
const COL_BOLT_HI = 0x888888; // rivet highlight

const COL_STEAM = 0xd0d8e0; // steam/smoke color
const COL_STEAM_DK = 0xa0aab8;

const COL_VENT = 0x2a2a2a; // vent opening
const COL_VENT_RIM = 0x606060;

const COL_GROUND_CRACK = 0x2a2010; // ground crack from impact
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
  w = 16,
  h = 4,
  alpha = 0.35,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

/** Draw a rivet bolt at (x, y). */
function drawRivet(g: Graphics, x: number, y: number, r = 1): void {
  g.circle(x, y, r).fill({ color: COL_BOLT }).stroke({ color: COL_BOLT_HI, width: 0.3 });
  g.circle(x - r * 0.3, y - r * 0.3, r * 0.35).fill({ color: COL_BOLT_HI, alpha: 0.5 });
}

/** Draw a glowing rune line segment. */
function drawRune(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha = 1,
  width = 0.8,
): void {
  // Outer glow
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: COL_RUNE, width: width + 2, alpha: alpha * 0.25 });
  // Inner bright
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: COL_RUNE_HI, width: width, alpha });
}

/** Draw a rune glyph at center (cx, cy) — a simple angular symbol. */
function drawRuneGlyph(g: Graphics, cx: number, cy: number, size: number, alpha = 1): void {
  const s = size;
  // Angular rune made of 3-4 strokes
  drawRune(g, cx - s, cy, cx + s, cy, alpha, 0.8);
  drawRune(g, cx, cy - s, cx, cy + s * 0.6, alpha * 0.9, 0.8);
  drawRune(g, cx - s * 0.6, cy - s * 0.5, cx + s * 0.6, cy - s * 0.5, alpha * 0.7, 0.6);
  drawRune(g, cx - s * 0.4, cy + s * 0.4, cx - s * 0.4, cy - s * 0.2, alpha * 0.6, 0.5);
  drawRune(g, cx + s * 0.4, cy + s * 0.4, cx + s * 0.4, cy - s * 0.2, alpha * 0.6, 0.5);
}

/** Draw steam puff cloud at (cx, cy) with given age/alpha. */
function drawSteam(g: Graphics, cx: number, cy: number, alpha: number, size = 3): void {
  g.circle(cx, cy, size).fill({ color: COL_STEAM, alpha: alpha * 0.5 });
  g.circle(cx - size * 0.5, cy - size * 0.4, size * 0.7).fill({ color: COL_STEAM_DK, alpha: alpha * 0.4 });
  g.circle(cx + size * 0.4, cy - size * 0.5, size * 0.55).fill({ color: COL_STEAM, alpha: alpha * 0.35 });
}

/** Draw shoulder steam vent with optional puff. */
function drawVent(g: Graphics, cx: number, cy: number, puff: number): void {
  // Vent pipe nozzle
  g.roundRect(cx - 2.5, cy, 5, 3, 0.5)
    .fill({ color: COL_VENT })
    .stroke({ color: COL_VENT_RIM, width: 0.5 });
  // Steam emanates upward
  if (puff > 0) {
    drawSteam(g, cx, cy - 2 - puff * 3, puff * 0.8, 2.5 + puff * 1.5);
    if (puff > 0.4) {
      drawSteam(g, cx + 1.5, cy - 5 - puff * 4, puff * 0.5, 1.8 + puff);
    }
  }
}

/** Draw a massive iron boot/foot block. */
function drawFeet(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
  const bw = 9;
  const bh = 5 - squash;

  // Left boot — a thick iron slab
  g.roundRect(cx - 12 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  // Bevel top
  g.moveTo(cx - 12 + stanceL, gy - bh)
    .lineTo(cx - 3 + stanceL, gy - bh)
    .stroke({ color: COL_IRON_HI, width: 0.6 });
  // Rivets on boot
  drawRivet(g, cx - 10 + stanceL, gy - bh + 1.5);
  drawRivet(g, cx - 6 + stanceL, gy - bh + 1.5);

  // Right boot
  g.roundRect(cx + 3 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  g.moveTo(cx + 3 + stanceR, gy - bh)
    .lineTo(cx + 12 + stanceR, gy - bh)
    .stroke({ color: COL_IRON_HI, width: 0.6 });
  drawRivet(g, cx + 5 + stanceR, gy - bh + 1.5);
  drawRivet(g, cx + 9 + stanceR, gy - bh + 1.5);
}

/** Draw the thick iron legs with rune etching. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
  runeAlpha = 1,
): void {
  // Left leg — wide rectangular iron plate
  g.roundRect(cx - 11 + stanceL, legTop, 7, legH, 1)
    .fill({ color: COL_IRON_BASE })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  // Bevel
  g.moveTo(cx - 11 + stanceL, legTop)
    .lineTo(cx - 4 + stanceL, legTop)
    .stroke({ color: COL_IRON_HI, width: 0.6 });
  g.moveTo(cx - 11 + stanceL, legTop)
    .lineTo(cx - 11 + stanceL, legTop + legH)
    .stroke({ color: COL_IRON_HI, width: 0.4 });
  // Knee plate
  g.roundRect(cx - 12 + stanceL, legTop + legH * 0.45, 8, 4, 0.5)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.5 });
  // Leg rune
  drawRune(g, cx - 9.5 + stanceL, legTop + 3, cx - 6.5 + stanceL, legTop + legH - 3, runeAlpha * 0.7, 0.6);
  // Rivets
  drawRivet(g, cx - 9 + stanceL, legTop + 1.5, 1.1);
  drawRivet(g, cx - 6 + stanceL, legTop + 1.5, 1.1);

  // Right leg
  g.roundRect(cx + 4 + stanceR, legTop, 7, legH, 1)
    .fill({ color: COL_IRON_BASE })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  g.moveTo(cx + 4 + stanceR, legTop)
    .lineTo(cx + 11 + stanceR, legTop)
    .stroke({ color: COL_IRON_HI, width: 0.6 });
  g.moveTo(cx + 4 + stanceR, legTop)
    .lineTo(cx + 4 + stanceR, legTop + legH)
    .stroke({ color: COL_IRON_HI, width: 0.4 });
  g.roundRect(cx + 4 + stanceR, legTop + legH * 0.45, 8, 4, 0.5)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.5 });
  drawRune(g, cx + 6.5 + stanceR, legTop + 3, cx + 9.5 + stanceR, legTop + legH - 3, runeAlpha * 0.7, 0.6);
  drawRivet(g, cx + 6 + stanceR, legTop + 1.5, 1.1);
  drawRivet(g, cx + 9 + stanceR, legTop + 1.5, 1.1);
}

/** Draw the massive iron torso. */
function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  runeAlpha = 1,
): void {
  const tw = 20; // very wide for a colossus

  // Main body plate
  g.roundRect(cx - tw / 2 + tilt, top, tw, h, 2)
    .fill({ color: COL_IRON_BASE })
    .stroke({ color: COL_IRON_DK, width: 0.7 });

  // Top bevel (catch light)
  g.moveTo(cx - tw / 2 + 1 + tilt, top)
    .lineTo(cx + tw / 2 - 1 + tilt, top)
    .stroke({ color: COL_IRON_HI, width: 0.8 });

  // Left bevel
  g.moveTo(cx - tw / 2 + tilt, top + 1)
    .lineTo(cx - tw / 2 + tilt, top + h - 1)
    .stroke({ color: COL_IRON_HI, width: 0.5 });

  // Panel seam lines — industrial detail
  g.moveTo(cx - tw / 2 + tilt, top + h * 0.35)
    .lineTo(cx + tw / 2 + tilt, top + h * 0.35)
    .stroke({ color: COL_IRON_DK, width: 0.5 });

  g.moveTo(cx - tw / 2 + tilt, top + h * 0.65)
    .lineTo(cx + tw / 2 + tilt, top + h * 0.65)
    .stroke({ color: COL_IRON_DK, width: 0.5 });

  // Vertical seam down center
  g.moveTo(cx + tilt, top)
    .lineTo(cx + tilt, top + h)
    .stroke({ color: COL_IRON_DK, width: 0.4 });

  // Rust streaks
  g.moveTo(cx - 4 + tilt, top + h * 0.35)
    .lineTo(cx - 5 + tilt, top + h - 2)
    .stroke({ color: COL_IRON_RUST, width: 0.4, alpha: 0.4 });

  // Main chest rune glyph
  drawRuneGlyph(g, cx + tilt, top + h * 0.45, 4.5, runeAlpha);

  // Rivet grid — 3×2 rivets on each side
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const rv_x_l = cx - tw / 2 + 2 + col * 3 + tilt;
      const rv_x_r = cx + tw / 2 - 4 - col * 3 + tilt;
      const rv_y = top + 2 + row * 4;
      drawRivet(g, rv_x_l, rv_y, 1.1);
      drawRivet(g, rv_x_r, rv_y, 1.1);
    }
  }

  // Lower rivets
  drawRivet(g, cx - tw / 2 + 2 + tilt, top + h - 2, 1.1);
  drawRivet(g, cx + tw / 2 - 2 + tilt, top + h - 2, 1.1);
}

/** Draw the iron head — massive helmet-like block. */
function drawHead(g: Graphics, cx: number, top: number, tilt = 0, runeAlpha = 1): void {
  const hw = 14;
  const hh = 10;

  // Helmet block
  g.roundRect(cx - hw / 2 + tilt, top, hw, hh, 2)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.6 });

  // Top bevel
  g.moveTo(cx - hw / 2 + 1 + tilt, top)
    .lineTo(cx + hw / 2 - 1 + tilt, top)
    .stroke({ color: COL_IRON_HI, width: 0.7 });

  // Left bevel
  g.moveTo(cx - hw / 2 + tilt, top + 1)
    .lineTo(cx - hw / 2 + tilt, top + hh - 1)
    .stroke({ color: COL_IRON_HI, width: 0.4 });

  // Visor slit — horizontal dark strip
  const visorY = top + hh * 0.44;
  g.roundRect(cx - hw / 2 + 2 + tilt, visorY, hw - 4, 2.2, 0.5)
    .fill({ color: COL_IRON_DK });

  // Rune eyes — amber glow through visor slits
  const eyeAlpha = runeAlpha * 0.9;
  g.roundRect(cx - 4 + tilt, visorY + 0.3, 2.5, 1.4, 0.3).fill({ color: COL_RUNE_HI, alpha: eyeAlpha });
  g.roundRect(cx + 1.5 + tilt, visorY + 0.3, 2.5, 1.4, 0.3).fill({ color: COL_RUNE_HI, alpha: eyeAlpha });

  // Eye glow halo
  g.circle(cx - 2.5 + tilt, visorY + 1, 2).fill({ color: COL_RUNE, alpha: eyeAlpha * 0.3 });
  g.circle(cx + 2.5 + tilt, visorY + 1, 2).fill({ color: COL_RUNE, alpha: eyeAlpha * 0.3 });

  // Chin plate seam
  g.moveTo(cx - hw / 2 + tilt, top + hh * 0.7)
    .lineTo(cx + hw / 2 + tilt, top + hh * 0.7)
    .stroke({ color: COL_IRON_DK, width: 0.5 });

  // Helmet rivets
  drawRivet(g, cx - hw / 2 + 2 + tilt, top + 2, 1);
  drawRivet(g, cx + hw / 2 - 2 + tilt, top + 2, 1);
  drawRivet(g, cx - hw / 2 + 2 + tilt, top + hh - 2, 1);
  drawRivet(g, cx + hw / 2 - 2 + tilt, top + hh - 2, 1);

  // Top helmet fin
  g.moveTo(cx - 2 + tilt, top)
    .lineTo(cx + 2 + tilt, top)
    .lineTo(cx + 1 + tilt, top - 3)
    .lineTo(cx - 1 + tilt, top - 3)
    .closePath()
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_HI, width: 0.4 });
}

/** Draw one massive iron arm. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  runeAlpha = 1,
  pistonExtend = 0,
): void {
  const mx = lerp(sx, ex, 0.45);
  const my = lerp(sy, ey, 0.45);

  // Upper arm — thick box
  const upW = 6;
  g.roundRect(sx - upW / 2, sy, upW, Math.hypot(mx - sx, my - sy) * 0.9 + 1, 1)
    .fill({ color: COL_IRON_BASE })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  g.moveTo(sx - upW / 2, sy).lineTo(sx + upW / 2, sy).stroke({ color: COL_IRON_HI, width: 0.5 });

  // Elbow joint plate
  g.circle(mx, my, 4)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  g.moveTo(mx - 3, my).lineTo(mx + 3, my).stroke({ color: COL_IRON_HI, width: 0.4 });
  drawRivet(g, mx - 2, my - 1.5, 1);
  drawRivet(g, mx + 2, my - 1.5, 1);

  // Piston rod extending from elbow
  if (pistonExtend > 0) {
    const rodLen = pistonExtend * 6;
    const rodAngle = Math.atan2(ey - sy, ex - sx);
    g.moveTo(mx, my)
      .lineTo(mx + Math.cos(rodAngle) * rodLen, my + Math.sin(rodAngle) * rodLen)
      .stroke({ color: COL_IRON_HI, width: 1.5, alpha: 0.8 });
  }

  // Lower arm — thick box
  const loW = 5.5;
  const loLen = Math.hypot(ex - mx, ey - my);
  g.roundRect(mx - loW / 2, my, loW, loLen * 0.9, 1)
    .fill({ color: COL_IRON_BASE })
    .stroke({ color: COL_IRON_DK, width: 0.6 });

  // Arm rune
  const runeX = (mx + ex) / 2;
  const runeY = (my + ey) / 2;
  drawRune(g, runeX - 2, runeY - 1, runeX + 2, runeY + 1, runeAlpha * 0.65, 0.7);

  // Iron fist/knuckle block
  g.roundRect(ex - 5, ey - 2, 10, 7, 1)
    .fill({ color: COL_IRON_MID })
    .stroke({ color: COL_IRON_DK, width: 0.6 });
  g.moveTo(ex - 5, ey - 2).lineTo(ex + 5, ey - 2).stroke({ color: COL_IRON_HI, width: 0.5 });

  // Knuckle groove lines
  for (let i = 0; i < 3; i++) {
    g.moveTo(ex - 3 + i * 2.5, ey - 2)
      .lineTo(ex - 3 + i * 2.5, ey + 5)
      .stroke({ color: COL_IRON_DK, width: 0.4 });
  }
  drawRivet(g, ex - 3.5, ey - 0.5, 0.9);
  drawRivet(g, ex + 3.5, ey - 0.5, 0.9);
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4; // very subtle — massive frame
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const grind = Math.sin(t * Math.PI * 4) * 0.3; // slight mechanical shift

  const legH = 10;
  const torsoH = 15;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1 + breathe;
  const headTop = torsoTop - 11;

  // Steam puff timing — puffs every half cycle
  const steamPuff = Math.max(0, Math.sin(t * Math.PI * 2 + Math.PI * 0.5));

  drawShadow(g, CX, GY, 16, 4);

  drawFeet(g, CX, GY, grind * 0.5, -grind * 0.5);
  drawLegs(g, CX, legTop, legH, grind * 0.5, -grind * 0.5, 0.5 + pulse * 0.5);
  drawTorso(g, CX, torsoTop, torsoH, grind * 0.3, 0.5 + pulse * 0.5);
  drawHead(g, CX, headTop, grind * 0.2, 0.6 + pulse * 0.4);

  // Arms at sides — slightly angled out from massive frame
  drawArm(g, CX - 10, torsoTop + 1, CX - 13, torsoTop + torsoH - 1, 0.5 + pulse * 0.4);
  drawArm(g, CX + 10, torsoTop + 1, CX + 13, torsoTop + torsoH - 1, 0.5 + pulse * 0.4);

  // Steam vents at shoulders
  drawVent(g, CX - 10, torsoTop - 1, steamPuff * 0.7);
  drawVent(g, CX + 8, torsoTop - 1, steamPuff * 0.5);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  // Heavier bob — each step slams down
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 2.5;
  const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

  const legH = 10;
  const torsoH = 15;
  // Legs move less laterally — still very wide stance
  const stanceL = Math.round(stride * 3);
  const stanceR = Math.round(-stride * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1 - Math.round(bob * 0.4);
  const headTop = torsoTop - 11;

  // Ground impact — stomp effect at peak downstroke
  const impactAlpha = Math.max(0, Math.abs(stride) - 0.65) * 0.9;
  if (impactAlpha > 0.05) {
    // Ground shockwave ring
    g.ellipse(CX, GY, 18 + impactAlpha * 8, 5 + impactAlpha * 2).stroke({
      color: COL_GROUND_CRACK,
      width: 1.5,
      alpha: impactAlpha * 0.5,
    });
    // Small debris dots
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI + t * 2;
      const d = impactAlpha * 8 + i * 2;
      g.circle(CX + Math.cos(angle) * d, GY + 1, 0.7).fill({
        color: COL_GROUND_CRACK,
        alpha: impactAlpha * 0.5,
      });
    }
  }

  // Steam jets at impact — heavier steam on stomp
  const steamA = impactAlpha * 0.9 + 0.1;
  drawSteam(g, CX - 10, GY - 8, steamA * 0.6, 3 + impactAlpha * 2);
  drawSteam(g, CX + 10, GY - 8, steamA * 0.4, 2.5 + impactAlpha * 1.5);

  drawShadow(g, CX, GY, 16 + Math.abs(stride) * 3, 4 + impactAlpha * 2);

  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR, 0.5 + pulse * 0.4);

  const bodyTilt = stride * 0.6;
  drawTorso(g, CX, torsoTop, torsoH, bodyTilt, 0.5 + pulse * 0.4);
  drawHead(g, CX, headTop, bodyTilt * 0.3, 0.6 + pulse * 0.3);

  // Arms pump opposite to legs — piston-like
  const armSwing = -stride * 4;
  drawArm(g, CX - 10 + bodyTilt, torsoTop + 1, CX - 11 + armSwing, torsoTop + torsoH - 2, 0.5 + pulse * 0.3);
  drawArm(g, CX + 10 + bodyTilt, torsoTop + 1, CX + 11 - armSwing, torsoTop + torsoH - 2, 0.5 + pulse * 0.3);

  // Shoulder vents — steam on each stride
  drawVent(g, CX - 10 + bodyTilt, torsoTop - 1, Math.max(0, stride) * 0.8);
  drawVent(g, CX + 8 + bodyTilt, torsoTop - 1, Math.max(0, -stride) * 0.8);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up (right arm back), 2-3: piston thrust begins, 4-5: full punch extended, 6-7: recoil
  const phases = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 10;
  const torsoH = 15;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 11;

  const lean = t < 0.55 ? t * 2.0 : (1 - t) * 3.0;
  const lunge = t > 0.2 && t < 0.85 ? 3 : 0;

  // Ground crack on impact
  if (t >= 0.55 && t <= 0.75) {
    const crackA = clamp01((t - 0.55) / 0.15) * 0.7;
    g.moveTo(CX + 12, GY)
      .lineTo(CX + 20, GY + 1)
      .stroke({ color: COL_GROUND_CRACK, width: 1.2, alpha: crackA });
    g.moveTo(CX + 14, GY - 1)
      .lineTo(CX + 22, GY - 3)
      .stroke({ color: COL_GROUND_CRACK, width: 0.8, alpha: crackA * 0.6 });
    g.ellipse(CX + 16, GY + 1, 6, 2).stroke({ color: COL_GROUND_CRACK, width: 0.8, alpha: crackA * 0.4 });
  }

  drawShadow(g, CX + lean * 0.4, GY, 16 + lean, 4);
  drawFeet(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge, 0.8);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.35, 0.8);
  drawHead(g, CX, headTop, lean * 0.2, 0.9);

  // Left arm stays at side / back
  drawArm(g, CX - 10 + lean, torsoTop + 1, CX - 13, torsoTop + torsoH - 1, 0.6);

  // Right arm — piston punch trajectory
  let armEndX: number;
  let pistonOut: number;

  if (t < 0.25) {
    // Wind up — arm pulls back
    armEndX = lerp(CX + 13, CX + 6, t / 0.25);
    pistonOut = 0;
  } else if (t < 0.55) {
    // Thrust forward — arm extends rapidly
    armEndX = lerp(CX + 6, CX + 22 + lean * 2, (t - 0.25) / 0.3);
    pistonOut = (t - 0.25) / 0.3;
  } else {
    // Recoil
    armEndX = lerp(CX + 22 + lean * 2, CX + 13, (t - 0.55) / 0.45);
    pistonOut = clamp01(1 - (t - 0.55) / 0.3);
  }

  const armEndY = torsoTop + torsoH * 0.4;
  drawArm(g, CX + 10 + lean, torsoTop + 1, armEndX, armEndY, 0.8 + pistonOut * 0.2, pistonOut);

  // Vent steam blast from shoulder on punch
  const steamBlast = pistonOut > 0.5 ? (pistonOut - 0.5) * 2 : 0;
  drawVent(g, CX + 8 + lean, torsoTop - 1, steamBlast * 1.2);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);

  const legH = 10;
  const torsoH = 15;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 11;

  // All runes flare — overcharge aura
  const auraR = 5 + intensity * 20 + pulse * 3;

  // Energy ring pulses outward
  g.circle(CX, torsoTop + torsoH * 0.45, auraR).stroke({
    color: COL_RUNE,
    width: 1.5,
    alpha: 0.15 + pulse * 0.12,
  });
  g.circle(CX, torsoTop + torsoH * 0.45, auraR * 0.65).stroke({
    color: COL_RUNE_HI,
    width: 0.8,
    alpha: 0.1 + pulse * 0.1,
  });

  // Rune energy particles orbit body
  if (intensity > 0.15) {
    const numPart = Math.floor(intensity * 8) + 2;
    for (let i = 0; i < numPart; i++) {
      const angle = (i / numPart) * Math.PI * 2 + t * Math.PI * 1.5;
      const dist = 8 + intensity * 12 + Math.sin(t * Math.PI * 4 + i) * 2;
      const px = CX + Math.cos(angle) * dist;
      const py = torsoTop + torsoH * 0.45 + Math.sin(angle) * dist * 0.5;
      g.circle(px, py, 1 + pulse * 0.8).fill({
        color: i % 2 === 0 ? COL_RUNE : COL_RUNE_HI,
        alpha: 0.5 + pulse * 0.4,
      });
    }
  }

  // Steam blast from both vents — massive overcharge steam
  const steamBlast = 0.4 + intensity * 0.8 + pulse * 0.3;
  drawSteam(g, CX - 10, torsoTop - 4, steamBlast * 0.9, 4 + intensity * 3);
  drawSteam(g, CX + 8, torsoTop - 4, steamBlast * 0.8, 3.5 + intensity * 2.5);
  if (intensity > 0.4) {
    drawSteam(g, CX - 12, torsoTop - 7, steamBlast * 0.6, 3 + intensity * 2);
    drawSteam(g, CX + 10, torsoTop - 7, steamBlast * 0.55, 2.8 + intensity * 2);
  }

  const fullRuneAlpha = 0.6 + intensity * 0.4 + pulse * 0.3;

  drawShadow(g, CX, GY, 16, 4, 0.35 + intensity * 0.2);
  drawFeet(g, CX, GY, -4, 4);
  drawLegs(g, CX, legTop, legH, -4, 4, fullRuneAlpha);
  drawTorso(g, CX, torsoTop, torsoH, 0, fullRuneAlpha);
  drawHead(g, CX, headTop, 0, fullRuneAlpha);

  // Arms raised high and spread — full overcharge pose
  const raise = intensity * 10;
  drawArm(g, CX - 10, torsoTop + 1, CX - 17, torsoTop - raise, fullRuneAlpha, 0);
  drawArm(g, CX + 10, torsoTop + 1, CX + 17, torsoTop - raise, fullRuneAlpha, 0);

  // Fist glow at raised hands
  const fistGlow = 0.3 + intensity * 0.6 + pulse * 0.2;
  g.circle(CX - 17, torsoTop - raise + 3, 5 + pulse * 2).fill({ color: COL_RUNE, alpha: fistGlow * 0.4 });
  g.circle(CX + 17, torsoTop - raise + 3, 5 + pulse * 2).fill({ color: COL_RUNE, alpha: fistGlow * 0.4 });
  g.circle(CX - 17, torsoTop - raise + 3, 2.5).fill({ color: COL_RUNE_HI, alpha: fistGlow * 0.8 });
  g.circle(CX + 17, torsoTop - raise + 3, 2.5).fill({ color: COL_RUNE_HI, alpha: fistGlow * 0.8 });

  // Energy arc between the two fists
  if (intensity > 0.5) {
    const arcAlpha = (intensity - 0.5) * 2 * (0.5 + pulse * 0.5);
    const midX = CX;
    const midY = torsoTop - raise - 6;
    g.moveTo(CX - 17, torsoTop - raise + 3)
      .quadraticCurveTo(midX, midY, CX + 17, torsoTop - raise + 3)
      .stroke({ color: COL_RUNE_HI, width: 1.5, alpha: arcAlpha * 0.8 });
    g.moveTo(CX - 17, torsoTop - raise + 3)
      .quadraticCurveTo(midX, midY, CX + 17, torsoTop - raise + 3)
      .stroke({ color: COL_RUNE, width: 4, alpha: arcAlpha * 0.2 });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 10;
  const torsoH = 15;
  const legTop = GY - 5 - legH;

  const fallX = t * 8; // topples forward (to the right)
  const dropY = t * t * 10;
  const torsoTop = legTop - torsoH + 1 + dropY;
  const headTop = torsoTop - 11;

  // Runes go dark one by one — each frame fewer runes
  // frame 0 = all lit, frame 7 = all dark
  const runesRemaining = clamp01(1 - t * 1.2);

  // Crash impact dust — later frames
  if (t > 0.7) {
    const crashA = (t - 0.7) / 0.3;
    g.ellipse(CX + fallX * 1.5, GY, 20 + crashA * 8, 5 + crashA * 3).fill({
      color: COL_IRON_RUST,
      alpha: crashA * 0.25,
    });
    // Debris chunks
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI * 0.3 + i * 0.25;
      const dist = crashA * 12 + i * 3;
      g.roundRect(
        CX + fallX * 1.5 + Math.cos(angle) * dist - 2,
        GY + Math.sin(angle) * dist * 0.4 - 1,
        4, 3, 0.5,
      ).fill({ color: COL_IRON_MID, alpha: crashA * 0.6 });
    }
  }

  drawShadow(g, CX + fallX * 0.4, GY, 16 + t * 6, 4, 0.35 * (1 - t * 0.3));

  // Feet stay planted
  if (t < 0.9) {
    drawFeet(g, CX + fallX * 0.05, GY, t * 2, -t, Math.floor(t * 2));
  }

  // Legs crumple
  if (t < 0.75) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.4, legH * (1 - t * 0.4), t * 2, -t, runesRemaining * 0.5);
  }

  // Torso topples — increasing tilt
  const crashTilt = t * 5;
  if (t < 0.92) {
    drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), crashTilt, runesRemaining);
  }

  // Head drops last
  if (t < 0.82) {
    drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.4, crashTilt * 0.7, runesRemaining);
  }

  // Arms go limp — flail outward
  if (t < 0.7) {
    drawArm(
      g,
      CX - 10 + fallX * 0.4,
      torsoTop + 1,
      CX - 10 + fallX * 0.3 - t * 8,
      torsoTop + torsoH - 1 + t * 5,
      runesRemaining * 0.5,
    );
  }
  if (t < 0.6) {
    drawArm(
      g,
      CX + 10 + fallX * 0.4,
      torsoTop + 1,
      CX + 13 + fallX * 0.5 + t * 5,
      torsoTop + torsoH * 0.6 + t * 3,
      runesRemaining * 0.4,
    );
  }

  // Rune sparks dying out
  if (runesRemaining > 0.05 && t < 0.8) {
    for (let i = 0; i < 3; i++) {
      const angle = t * 5 + i * 2.1;
      const dist = 4 + i * 2;
      const sx = CX + fallX * 0.3 + Math.cos(angle) * dist;
      const sy = torsoTop + torsoH * 0.45 + Math.sin(angle) * dist * 0.6;
      g.circle(sx, sy, 1 + runesRemaining).fill({
        color: i % 2 === 0 ? COL_RUNE : COL_RUNE_DK,
        alpha: runesRemaining * 0.8,
      });
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
 * Generate all Iron Colossus sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateIronColossusFrames(renderer: Renderer): RenderTexture[] {
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
