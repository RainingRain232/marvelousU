// Procedural sprite generator for the Giant Mage unit.
//
// 96x144 pixel frames (2w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A tall, gaunt ancient giant steeped in primal sorcery. Long dark purple/indigo
// robes with rune patterns, massive rune-carved wooden staff with glowing crystal,
// glowing arcane eyes, long gray-white beard/hair, rune tattoos on exposed arms,
// bare feet / simple sandals. Floating arcane symbols during casting.
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

const COL_ROBE       = 0x2a1854; // dark purple robe
const COL_ROBE_DK    = 0x1a0e3a; // robe shadow
const COL_ROBE_LT    = 0x3e2870; // robe highlight
const COL_ROBE_TRIM  = 0x6644aa; // robe hem / trim

const COL_SKIN       = 0xc8a882; // exposed skin (arms, face)
const COL_SKIN_DK    = 0xa08060; // skin shadow
const COL_SKIN_HL    = 0xe0c8a8; // skin highlight

const COL_EYE        = 0x66aaff; // glowing arcane blue eyes
const COL_EYE_GLOW   = 0x88ccff; // eye glow halo

const COL_HAIR       = 0xcccccc; // gray-white hair
const COL_BEARD      = 0xbbbbbb; // long beard
const COL_BEARD_DK   = 0x999999;

const COL_STAFF_WOOD = 0x5a3a20; // rune-carved staff shaft
const COL_STAFF_DK   = 0x3a2410; // staff dark grain
const COL_STAFF_HI   = 0x7a5a38; // staff highlight
const COL_STAFF_RUNE = 0x7766cc; // carved rune inlays on staff

const COL_CRYSTAL    = 0x88ccff; // staff crystal
const COL_CRYSTAL_HI = 0xccffff; // crystal bright core
const COL_CRYSTAL_GL = 0x5588dd; // crystal glow aura

const COL_RUNE       = 0xaa88ff; // floating rune sigils
const COL_RUNE_BRIGHT = 0xccaaff;
const COL_MAGIC      = 0x7744ff; // arcane energy
const COL_MAGIC_HI   = 0xbb88ff; // bright magic

const COL_TATTOO     = 0x6655aa; // rune tattoos on arms

const COL_SANDAL     = 0x5a3a20; // simple sandals
const COL_SANDAL_DK  = 0x3a2410;

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

function drawGroundShadow(g: Graphics, cx: number, gy: number, rx = 26, ry = 7, alpha = 0.25): void {
  ellipse(g, cx, gy + 2, rx, ry, COL_SHADOW, alpha);
}

function drawSandals(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  // Simple sandals — bare toes visible
  // Left foot
  ellipse(g, cx - 8 + stanceL, gy - 2, 8, 4, COL_SANDAL);
  ellipse(g, cx - 8 + stanceL, gy - 3, 6, 2.5, COL_SANDAL_DK, 0.3);
  // Toe bumps
  circle(g, cx - 13 + stanceL, gy - 1, 2, COL_SKIN, 0.6);
  circle(g, cx - 10 + stanceL, gy, 1.5, COL_SKIN, 0.5);
  // Strap
  line(g, cx - 14 + stanceL, gy - 3, cx - 2 + stanceL, gy - 3, COL_SANDAL_DK, 1.5);

  // Right foot
  ellipse(g, cx + 8 + stanceR, gy - 2, 8, 4, COL_SANDAL);
  ellipse(g, cx + 8 + stanceR, gy - 3, 6, 2.5, COL_SANDAL_DK, 0.3);
  circle(g, cx + 13 + stanceR, gy - 1, 2, COL_SKIN, 0.6);
  circle(g, cx + 10 + stanceR, gy, 1.5, COL_SKIN, 0.5);
  line(g, cx + 2 + stanceR, gy - 3, cx + 14 + stanceR, gy - 3, COL_SANDAL_DK, 1.5);
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Legs visible below robe hem — thin / gaunt
  const lw = 8;

  // Left leg
  rect(g, cx - 10 + stanceL, legTop, lw, legH, COL_SKIN);
  rect(g, cx - 9 + stanceL, legTop + 1, lw - 2, legH - 2, COL_SKIN_DK, 0.2);
  // Ankle bone
  circle(g, cx - 6 + stanceL, legTop + legH - 4, 3, COL_SKIN_HL, 0.3);

  // Right leg
  rect(g, cx + 2 + stanceR, legTop, lw, legH, COL_SKIN);
  rect(g, cx + 3 + stanceR, legTop + 1, lw - 2, legH - 2, COL_SKIN_DK, 0.2);
  circle(g, cx + 6 + stanceR, legTop + legH - 4, 3, COL_SKIN_HL, 0.3);
}

function drawRobe(
  g: Graphics,
  cx: number,
  robeTop: number,
  robeH: number,
  breathe: number,
  sway = 0,
): void {
  const x = cx + sway * 0.5;
  const hemW = 30 + Math.abs(sway) * 2;

  // Main robe body — long flowing from shoulders to near ground
  poly(g, [
    x - 16, robeTop,
    x + 16, robeTop,
    x + hemW / 2 + sway, robeTop + robeH + breathe * 0.5,
    x - hemW / 2 + sway, robeTop + robeH + breathe * 0.5,
  ], COL_ROBE);

  // Darker center fold
  poly(g, [
    x - 3, robeTop + 4,
    x + 3, robeTop + 4,
    x + 4 + sway * 0.3, robeTop + robeH + breathe * 0.5,
    x - 4 + sway * 0.3, robeTop + robeH + breathe * 0.5,
  ], COL_ROBE_DK);

  // Left fold shadow
  poly(g, [
    x - 12, robeTop + 6,
    x - 9, robeTop + 6,
    x - 10 + sway * 0.4, robeTop + robeH + breathe * 0.5,
    x - 14 + sway * 0.4, robeTop + robeH + breathe * 0.5,
  ], COL_ROBE_DK, 0.3);

  // Right fold shadow
  poly(g, [
    x + 9, robeTop + 6,
    x + 12, robeTop + 6,
    x + 14 + sway * 0.4, robeTop + robeH + breathe * 0.5,
    x + 10 + sway * 0.4, robeTop + robeH + breathe * 0.5,
  ], COL_ROBE_DK, 0.3);

  // Lighter highlight on robe
  poly(g, [
    x + 4, robeTop + 10,
    x + 8, robeTop + 10,
    x + 9 + sway * 0.3, robeTop + robeH - 6,
    x + 5 + sway * 0.3, robeTop + robeH - 6,
  ], COL_ROBE_LT, 0.25);

  // Gold/purple trim at hem
  const hemY = robeTop + robeH + breathe * 0.5;
  line(g, x - hemW / 2 + sway, hemY - 1, x + hemW / 2 + sway, hemY - 1, COL_ROBE_TRIM, 2);

  // Rune patterns sewn into robe (small diamond runes along the robe)
  for (let i = 0; i < 5; i++) {
    const ry = robeTop + 14 + i * 12;
    if (ry < hemY - 6) {
      // Small diamond rune on left
      const rdx = x - 8 + sway * (i * 0.05);
      poly(g, [rdx, ry - 2, rdx + 2, ry, rdx, ry + 2, rdx - 2, ry], COL_RUNE, 0.25);
      // Small diamond rune on right
      const rdx2 = x + 8 + sway * (i * 0.05);
      poly(g, [rdx2, ry - 2, rdx2 + 2, ry, rdx2, ry + 2, rdx2 - 2, ry], COL_RUNE, 0.25);
    }
  }

  // Sash / belt around waist
  const beltY = robeTop + 18;
  rect(g, x - 16, beltY, 32, 4, COL_ROBE_TRIM);
  // Belt knot / clasp
  circle(g, x, beltY + 2, 3, COL_RUNE, 0.6);
  circle(g, x, beltY + 2, 1.5, COL_RUNE_BRIGHT, 0.5);
}

function drawTorso(g: Graphics, cx: number, topY: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  const w = 30;
  const h = 32;

  // Upper body — lean/gaunt torso under robe
  g.roundRect(x - w / 2, topY, w, h + breathe * 0.3, 4).fill({ color: COL_ROBE });
  // Chest robe detail — lighter panel
  g.roundRect(x - w / 2 + 4, topY + 2, w - 8, h - 8, 2).fill({ color: COL_ROBE_LT, alpha: 0.2 });
  // Collar / neckline
  poly(g, [
    x - 8, topY,
    x, topY - 4,
    x + 8, topY,
    x + 6, topY + 6,
    x - 6, topY + 6,
  ], COL_ROBE_DK);
  // Collar highlight
  line(g, x - 7, topY, x, topY - 3, COL_ROBE_TRIM, 1);
  line(g, x, topY - 3, x + 7, topY, COL_ROBE_TRIM, 1);
  // Arcane gem at collar
  circle(g, x, topY + 2, 3, COL_CRYSTAL);
  circle(g, x, topY + 2, 1.5, COL_CRYSTAL_HI, 0.8);
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  showTattoos = true,
): void {
  // Gaunt arm — thinner than warrior
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;

  // Sleeve (upper portion from shoulder)
  const sleeveX = sx + (ex - sx) * 0.35;
  const sleeveY = sy + (ey - sy) * 0.35;
  g.moveTo(sx, sy).lineTo(sleeveX, sleeveY).stroke({ color: COL_ROBE, width: 10 });
  // Sleeve trim
  circle(g, sleeveX, sleeveY, 5.5, COL_ROBE_TRIM, 0.5);

  // Exposed forearm — skin with rune tattoos
  g.moveTo(sleeveX, sleeveY).lineTo(ex, ey).stroke({ color: COL_SKIN_DK, width: 7 });
  g.moveTo(sleeveX, sleeveY).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 5 });

  // Rune tattoos on forearm
  if (showTattoos) {
    const t1x = sleeveX + (ex - sleeveX) * 0.3;
    const t1y = sleeveY + (ey - sleeveY) * 0.3;
    const t2x = sleeveX + (ex - sleeveX) * 0.6;
    const t2y = sleeveY + (ey - sleeveY) * 0.6;
    circle(g, t1x, t1y, 2, COL_TATTOO, 0.5);
    circle(g, t2x, t2y, 1.5, COL_TATTOO, 0.4);
    // Small line runes
    const dx = (ex - sleeveX) * 0.08;
    const dy = (ey - sleeveY) * 0.08;
    line(g, t1x - dy, t1y + dx, t1x + dy, t1y - dx, COL_TATTOO, 1);
    line(g, t2x - dy, t2y + dx, t2x + dy, t2y - dx, COL_TATTOO, 1);
  }

  // Elbow joint
  circle(g, mx, my, 4, COL_SKIN_DK, 0.4);

  // Hand — gaunt fingers
  circle(g, ex, ey, 5, COL_SKIN);
  circle(g, ex - 0.5, ey - 0.5, 3.5, COL_SKIN_HL, 0.25);
}

function drawStaff(
  g: Graphics,
  baseX: number, baseY: number,
  angle: number,
  length = 70,
  crystalPulse = 0,
  broken = false,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + sin * length;
  const tipY = baseY - cos * length;

  const staffLen = broken ? length * 0.6 : length;
  const endX = baseX + sin * staffLen;
  const endY = baseY - cos * staffLen;

  // Shaft — thick wooden staff
  g.moveTo(baseX, baseY).lineTo(endX, endY).stroke({ color: COL_STAFF_WOOD, width: 5 });
  // Wood grain highlight
  g.moveTo(baseX + cos * 1.2, baseY + sin * 1.2)
    .lineTo(endX + cos * 1.2, endY + sin * 1.2)
    .stroke({ color: COL_STAFF_HI, width: 1, alpha: 0.4 });
  // Wood grain dark
  g.moveTo(baseX - cos * 1.2, baseY - sin * 1.2)
    .lineTo(endX - cos * 1.2, endY - sin * 1.2)
    .stroke({ color: COL_STAFF_DK, width: 1, alpha: 0.5 });

  // Carved rune inlays along the shaft
  for (let i = 1; i <= 4; i++) {
    const t = i * 0.18;
    const rx = baseX + (endX - baseX) * t;
    const ry = baseY + (endY - baseY) * t;
    // Small rune glyph
    circle(g, rx, ry, 2.5, COL_STAFF_RUNE, 0.5);
    // Tiny cross rune mark
    const rdx = cos * 2;
    const rdy = sin * 2;
    line(g, rx - rdy, ry + rdx, rx + rdy, ry - rdx, COL_STAFF_RUNE, 0.8);
  }

  if (!broken) {
    // Crystal mount at top of staff
    const cx = tipX;
    const cy = tipY;

    // Crystal glow aura (pulsing)
    const glowR = 8 + crystalPulse * 4;
    const glowA = 0.12 + crystalPulse * 0.08;
    circle(g, cx, cy, glowR, COL_CRYSTAL_GL, glowA);

    // Crystal body — faceted gem shape
    poly(g, [
      cx, cy - 7,
      cx + 5, cy - 2,
      cx + 4, cy + 5,
      cx - 4, cy + 5,
      cx - 5, cy - 2,
    ], COL_CRYSTAL, 0.85);
    // Crystal highlight
    poly(g, [
      cx - 1, cy - 6,
      cx + 3, cy - 2,
      cx + 1, cy + 2,
      cx - 3, cy,
    ], COL_CRYSTAL_HI, 0.5);
    // Crystal bright core
    circle(g, cx, cy - 1, 2.5 + crystalPulse * 1.5, COL_CRYSTAL_HI, 0.6 + crystalPulse * 0.3);

    // Prongs holding crystal — wooden forks from the staff
    line(g, endX, endY, cx - 4, cy + 4, COL_STAFF_DK, 2);
    line(g, endX, endY, cx + 4, cy + 4, COL_STAFF_DK, 2);
    line(g, endX + sin * 2, endY - cos * 2, cx, cy + 5, COL_STAFF_WOOD, 1.5);
  }
}

function drawHead(g: Graphics, x: number, y: number, tilt = 0): void {
  const hx = x + tilt;

  // Neck — thin / gaunt
  rect(g, hx - 4, y + 12, 8, 8, COL_SKIN);
  rect(g, hx - 3, y + 14, 6, 4, COL_SKIN_DK, 0.2);

  // Head — tall and narrow, ancient face
  ellipse(g, hx, y, 11, 14, COL_SKIN);
  // Jawline shadow
  ellipse(g, hx, y + 7, 10, 5, COL_SKIN_DK, 0.2);
  // Cheekbone highlight
  circle(g, hx - 5, y - 2, 3, COL_SKIN_HL, 0.15);
  circle(g, hx + 5, y - 2, 3, COL_SKIN_HL, 0.15);

  // Long gray-white hair flowing down sides
  // Left hair
  poly(g, [
    hx - 10, y - 8,
    hx - 12, y - 2,
    hx - 14, y + 14,
    hx - 11, y + 20,
    hx - 8, y + 10,
    hx - 9, y - 4,
  ], COL_HAIR);
  // Right hair
  poly(g, [
    hx + 10, y - 8,
    hx + 12, y - 2,
    hx + 14, y + 14,
    hx + 11, y + 20,
    hx + 8, y + 10,
    hx + 9, y - 4,
  ], COL_HAIR);
  // Hair on top
  ellipse(g, hx, y - 12, 10, 5, COL_HAIR);
  // Hair highlight
  ellipse(g, hx - 2, y - 13, 6, 3, 0xdddddd, 0.3);

  // Ears — slightly pointed (ancient / primal)
  poly(g, [hx - 11, y - 2, hx - 15, y - 6, hx - 11, y + 3], COL_SKIN);
  circle(g, hx - 12, y - 1, 1.5, COL_SKIN_DK, 0.3);
  poly(g, [hx + 11, y - 2, hx + 15, y - 6, hx + 11, y + 3], COL_SKIN);
  circle(g, hx + 12, y - 1, 1.5, COL_SKIN_DK, 0.3);

  // Glowing arcane eyes
  ellipse(g, hx - 4, y - 2, 3, 2, COL_EYE);
  ellipse(g, hx + 4, y - 2, 3, 2, COL_EYE);
  // Eye glow halo
  ellipse(g, hx - 4, y - 2, 5, 3, COL_EYE_GLOW, 0.2);
  ellipse(g, hx + 4, y - 2, 5, 3, COL_EYE_GLOW, 0.2);
  // Bright pupil center
  circle(g, hx - 4, y - 2, 1.2, COL_CRYSTAL_HI, 0.9);
  circle(g, hx + 4, y - 2, 1.2, COL_CRYSTAL_HI, 0.9);

  // Heavy brow ridges
  line(g, hx - 8, y - 5, hx - 1, y - 4, COL_SKIN_DK, 1.5);
  line(g, hx + 1, y - 4, hx + 8, y - 5, COL_SKIN_DK, 1.5);

  // Nose — prominent, ancient
  line(g, hx, y - 1, hx, y + 4, COL_SKIN_DK, 1.2);
  circle(g, hx, y + 4, 1.5, COL_SKIN_DK, 0.3);

  // Long flowing beard
  poly(g, [
    hx - 6, y + 6,
    hx - 4, y + 8,
    hx - 6, y + 28,
    hx - 3, y + 32,
    hx, y + 30,
    hx + 3, y + 32,
    hx + 6, y + 28,
    hx + 4, y + 8,
    hx + 6, y + 6,
    hx, y + 10,
  ], COL_BEARD);
  // Beard strand detail
  line(g, hx - 3, y + 10, hx - 4, y + 26, COL_BEARD_DK, 0.8);
  line(g, hx, y + 10, hx, y + 28, COL_BEARD_DK, 0.8);
  line(g, hx + 3, y + 10, hx + 4, y + 26, COL_BEARD_DK, 0.8);
  // Beard highlight
  line(g, hx - 1, y + 12, hx - 2, y + 22, 0xdddddd, 0.6);

  // Mouth (hidden behind beard, just a shadow)
  line(g, hx - 3, y + 6, hx + 3, y + 6, COL_SKIN_DK, 1);
}

function drawFloatingRunes(
  g: Graphics,
  cx: number, cy: number,
  time: number,
  intensity = 1,
  count = 4,
): void {
  for (let i = 0; i < count; i++) {
    const angle = time + (i * Math.PI * 2) / count;
    const orbitRx = 22 * intensity;
    const orbitRy = 10 * intensity;
    const rx = cx + Math.cos(angle) * orbitRx;
    const ry = cy + Math.sin(angle) * orbitRy;
    const a = 0.3 + Math.sin(time * 2 + i) * 0.15;

    // Diamond-shaped rune glyph
    poly(g, [
      rx, ry - 4,
      rx + 3, ry,
      rx, ry + 4,
      rx - 3, ry,
    ], COL_RUNE, a * intensity);

    // Inner cross on the rune
    line(g, rx - 2, ry, rx + 2, ry, COL_RUNE_BRIGHT, a * intensity);
    line(g, rx, ry - 3, rx, ry + 3, COL_RUNE_BRIGHT, a * intensity * 0.7);

    // Tiny glow dot at center
    circle(g, rx, ry, 1.5, COL_RUNE_BRIGHT, a * intensity * 0.6);
  }
}

function drawArcaneBlast(
  g: Graphics,
  x: number, y: number,
  intensity: number,
): void {
  // Central energy sphere
  circle(g, x, y, 10 * intensity, COL_MAGIC, 0.4 * intensity);
  circle(g, x, y, 6 * intensity, COL_MAGIC_HI, 0.6 * intensity);
  circle(g, x, y, 3 * intensity, COL_CRYSTAL_HI, 0.8 * intensity);

  // Radiating energy arcs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + intensity * 2;
    const r1 = 8 * intensity;
    const r2 = 14 * intensity;
    const sx = x + Math.cos(a) * r1;
    const sy = y + Math.sin(a) * r1;
    const ex = x + Math.cos(a) * r2;
    const ey = y + Math.sin(a) * r2;
    line(g, sx, sy, ex, ey, COL_MAGIC, intensity * 1.5);
  }
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const crystalPulse = 0.3 + Math.sin(t * Math.PI * 2) * 0.3; // gentle glow pulse
  const runeTime = t * Math.PI * 2;

  const legH = 14;
  const robeH = 56;
  const legTop = GY - 6 - legH;
  const robeTop = legTop - robeH + 10 + breathe;
  const torsoTop = robeTop - 6 + breathe;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 16;

  drawGroundShadow(g, CX, GY);
  drawSandals(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawRobe(g, CX, robeTop, robeH, breathe);
  drawTorso(g, CX, torsoTop, breathe);

  // Left arm — hangs at side, tattooed
  drawArm(g, CX - 16, shoulderY + 4, CX - 20, torsoTop + 34);

  // Right arm — holds staff
  drawArm(g, CX + 16, shoulderY + 4, CX + 18, shoulderY + 14, false);

  // Staff held upright in right hand
  const staffAngle = -0.08 + Math.sin(t * Math.PI * 2) * 0.02;
  drawStaff(g, CX + 18, shoulderY + 14, staffAngle, 68, crystalPulse);

  drawHead(g, CX, headY);

  // Subtle floating runes during idle
  drawFloatingRunes(g, CX, torsoTop + 20, runeTime, 0.4, 3);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 2.5;
  const sway = walk * 2;

  const legH = 14;
  const robeH = 56;
  const stanceL = Math.round(walk * 4);
  const stanceR = Math.round(-walk * 4);
  const legTop = GY - 6 - legH;
  const robeTop = legTop - robeH + 10 - bob * 0.3;
  const torsoTop = robeTop - 6 - bob * 0.2;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 16;

  drawGroundShadow(g, CX, GY, 26 + Math.abs(walk) * 3, 7);
  drawSandals(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawRobe(g, CX, robeTop, robeH, bob * 0.3, sway);
  drawTorso(g, CX, torsoTop, bob * 0.2, sway * 0.3);

  // Arms swing gently with gait
  const armSwing = walk * 3;
  drawArm(g, CX - 16 + sway * 0.3, shoulderY + 4, CX - 20 - armSwing, torsoTop + 34);
  drawArm(g, CX + 16 + sway * 0.3, shoulderY + 4, CX + 18 + armSwing, shoulderY + 14, false);

  // Staff bobs and tilts while walking
  drawStaff(g, CX + 18 + armSwing, shoulderY + 14, -0.06 + walk * 0.04, 68, 0.3);

  drawHead(g, CX + sway * 0.3, headY, sway * 0.2);

  // Subtle robe dust puffs on heavier steps
  if (Math.abs(walk) > 0.85) {
    const dustX = walk > 0 ? CX - 8 + stanceL : CX + 8 + stanceR;
    for (let i = 0; i < 2; i++) {
      circle(g, dustX + (i - 0.5) * 6, GY - 1 - i * 2, 2 - i * 0.5, COL_SHADOW, 0.06);
    }
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 6 frames: raise staff(0-1) -> channel energy, crystal blazes(2-3) -> release blast(4-5)
  const t = frame / 5; // 0..1 over 6 frames

  const legH = 14;
  const robeH = 56;
  const legTop = GY - 6 - legH;
  const robeTop = legTop - robeH + 10;
  const torsoTop = robeTop - 6;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 16;

  let staffAngle: number;
  let staffHandX: number;
  let staffHandY: number;
  let crystalPulse: number;
  let blastIntensity = 0;
  let runeIntensity = 0;
  let lean = 0;

  if (t < 0.3) {
    // Raise staff overhead
    const p = t / 0.3;
    staffAngle = -0.08 - p * 1.2;
    staffHandX = CX + 18 - p * 8;
    staffHandY = shoulderY + 14 - p * 20;
    crystalPulse = 0.3 + p * 0.4;
    lean = -p * 2;
    runeIntensity = p * 0.5;
  } else if (t < 0.6) {
    // Channel energy — crystal blazes, runes appear
    const p = (t - 0.3) / 0.3;
    staffAngle = -1.28;
    staffHandX = CX + 10;
    staffHandY = shoulderY - 6;
    crystalPulse = 0.7 + p * 0.3;
    lean = -2;
    runeIntensity = 0.5 + p * 0.5;
  } else if (t < 0.8) {
    // Release blast — staff sweeps forward
    const p = (t - 0.6) / 0.2;
    staffAngle = -1.28 + p * 1.8;
    staffHandX = CX + 10 + p * 12;
    staffHandY = shoulderY - 6 + p * 14;
    crystalPulse = 1.0 - p * 0.3;
    lean = -2 + p * 6;
    blastIntensity = p;
    runeIntensity = 1.0 - p * 0.5;
  } else {
    // Recovery
    const p = (t - 0.8) / 0.2;
    staffAngle = 0.52 - p * 0.6;
    staffHandX = CX + 22 - p * 4;
    staffHandY = shoulderY + 8 + p * 6;
    crystalPulse = 0.7 - p * 0.4;
    lean = 4 - p * 4;
    blastIntensity = (1 - p) * 0.6;
    runeIntensity = 0.5 - p * 0.5;
  }

  drawGroundShadow(g, CX + lean * 0.3, GY, 26 + Math.abs(lean), 7);
  drawSandals(g, CX, GY, -1, lean > 2 ? 2 : 0);
  drawLegs(g, CX, legTop, legH, -1, lean > 2 ? 2 : 0);
  drawRobe(g, CX, robeTop, robeH, 0, lean * 0.3);
  drawTorso(g, CX, torsoTop, 0, lean * 0.2);

  // Left arm braces / extends during cast
  drawArm(g, CX - 16 + lean * 0.2, shoulderY + 4, CX - 22, torsoTop + 30 - runeIntensity * 8);

  // Right arm wields staff
  drawArm(g, CX + 16 + lean * 0.2, shoulderY + 4, staffHandX, staffHandY, false);
  drawStaff(g, staffHandX, staffHandY, staffAngle, 68, crystalPulse);

  drawHead(g, CX + lean * 0.15, headY, lean * 0.15);

  // Floating runes during channel
  if (runeIntensity > 0) {
    const runeTime = t * Math.PI * 6;
    drawFloatingRunes(g, CX, torsoTop + 10, runeTime, runeIntensity, 5);
  }

  // Arcane blast on release
  if (blastIntensity > 0) {
    const blastX = staffHandX + Math.sin(staffAngle) * 68;
    const blastY = staffHandY - Math.cos(staffAngle) * 68;
    drawArcaneBlast(g, blastX, blastY, blastIntensity);
  }

  // Ground arcane circle during channel
  if (t >= 0.25 && t < 0.75) {
    const circleT = t < 0.5 ? (t - 0.25) / 0.25 : (0.75 - t) / 0.25;
    ellipse(g, CX, GY, 22 * circleT, 6 * circleT, COL_MAGIC, 0.15 * circleT);
    ellipse(g, CX, GY, 16 * circleT, 4 * circleT, COL_MAGIC_HI, 0.1 * circleT);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Same as attack — the giant mage's cast IS an arcane blast from the staff
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: stagger -> staff breaks -> arcane energy dissipates -> collapse
  const t = frame / 6; // 0..1 over 7 frames

  const legH = 14;
  const robeH = 56;
  const legTop = GY - 6 - legH;
  const robeTop = legTop - robeH + 10;
  const torsoTop = robeTop - 6;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 16;

  const fallX = t * 14;
  const dropY = t * t * 16;
  const tilt = t * 5;

  // Shadow fades
  drawGroundShadow(g, CX + fallX * 0.3, GY, 26 + t * 6, 7, 0.25 * (1 - t * 0.4));

  // Sandals spread and buckle
  drawSandals(g, CX + fallX * 0.15, GY, t * 3, -t * 2);

  // Legs buckle
  if (t < 0.75) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.4, legH - Math.round(t * 4), t * 3, -t * 2);
  }

  // Robe flutters as giant falls
  if (t < 0.85) {
    drawRobe(g, CX + fallX * 0.3, robeTop + dropY * 0.5, robeH * (1 - t * 0.1), 0, tilt);
  }

  // Torso falls
  drawTorso(g, CX + fallX * 0.35, torsoTop + dropY * 0.6, 0, tilt);

  // Arms flop
  if (t < 0.8) {
    drawArm(g, CX - 16 + fallX * 0.25, shoulderY + 4 + dropY * 0.5,
      CX - 24 + fallX * 0.5, torsoTop + 34 + t * 8);
  }

  // Staff breaks and flies away
  if (t < 0.5) {
    // Staff still intact but tilting
    const staffX = CX + 18 + t * 10;
    const staffY = shoulderY + 14 + t * 8;
    drawStaff(g, staffX, staffY, 0.3 + t * 3, 68 * (1 - t * 0.2), 0.3 - t * 0.6);
  } else if (t < 0.8) {
    // Broken staff pieces scatter
    const breakT = (t - 0.5) / 0.3;
    // Lower shaft fragment
    const shard1X = CX + 24 + breakT * 12;
    const shard1Y = shoulderY + 20 + breakT * 16;
    line(g, shard1X, shard1Y, shard1X + 8, shard1Y - 14, COL_STAFF_WOOD, 3);
    // Upper shaft + crystal fragment
    const shard2X = CX + 20 + breakT * 18;
    const shard2Y = shoulderY - 10 + breakT * 20;
    line(g, shard2X, shard2Y, shard2X - 4, shard2Y - 16, COL_STAFF_WOOD, 3);
    // Crystal falls separately, still glowing faintly
    circle(g, shard2X - 4, shard2Y - 18, 3 * (1 - breakT), COL_CRYSTAL, (1 - breakT) * 0.6);
  }

  // Head
  if (t < 0.65) {
    drawHead(g, CX + fallX * 0.4, headY + dropY * 0.4, tilt * 1.1);
  } else if (t < 0.85) {
    // Head drops further
    const headDrop = (t - 0.65) / 0.2;
    drawHead(g, CX + fallX * 0.4 + headDrop * 8, headY + dropY * 0.4 + headDrop * 18, tilt * 1.1 + headDrop * 3);
  }

  // Arcane energy dissipates — sparks and rune fragments scatter
  if (t > 0.2) {
    const dissipateT = (t - 0.2) / 0.8;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 4;
      const dist = 8 + dissipateT * 30;
      const px = CX + fallX * 0.3 + Math.cos(angle) * dist;
      const py = torsoTop + 20 + dropY * 0.3 + Math.sin(angle) * dist * 0.5;
      const particleA = (1 - dissipateT) * 0.5;
      // Magic spark
      circle(g, px, py, 2 - dissipateT * 1.5, COL_RUNE, particleA);
      // Tiny rune fragment
      if (i % 2 === 0) {
        poly(g, [
          px, py - 2, px + 1.5, py, px, py + 2, px - 1.5, py,
        ], COL_MAGIC, particleA * 0.6);
      }
    }
  }

  // Eye glow fades
  if (t < 0.6) {
    const eyeFade = 1 - t / 0.6;
    const eyeX = CX + fallX * 0.4;
    const eyeY = headY + dropY * 0.4;
    circle(g, eyeX - 4, eyeY - 2, 2, COL_EYE, eyeFade * 0.3);
    circle(g, eyeX + 4, eyeY - 2, 2, COL_EYE, eyeFade * 0.3);
  }

  // Dust cloud on final impact
  if (t > 0.7) {
    const dustT = (t - 0.7) / 0.3;
    const dustAlpha = (1 - dustT) * 0.15;
    for (let i = 0; i < 4; i++) {
      const dx = CX + fallX * 0.35 + (i - 1.5) * 8;
      const dy = GY - 2 - dustT * 6;
      circle(g, dx, dy, 4 + dustT * 3, COL_SHADOW, dustAlpha);
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

export function generateGiantMageFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
