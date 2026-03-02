// Procedural sprite generator for the Horse Archer unit type.
//
// Draws a detailed side-view mounted archer on a swift steppe pony at
// 96×96 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Side-view swift steppe pony with braided mane & tail
//   • Lamellar leather armor with fur trim
//   • Leather cap with ear flaps and feather
//   • Composite recurve bow with visible limb curvature
//   • Quiver with fletched arrows on back
//   • Leather bracers and riding boots
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 96;          // frame width  (px) – 2 tiles wide
const FH = 96;          // frame height (px) – 2 tiles high
const OY = 30;          // vertical offset to center art in frame
const GY = FH - 4;      // ground line Y

// Palette ─ steppe horse archer
const COL_SKIN        = 0xc49464;
const COL_LEATHER     = 0x7a5a38;
const COL_LEATHER_HI  = 0x9a7a58;
const COL_LEATHER_DK  = 0x5a3a1e;
const COL_LAMELLAR    = 0x8a7a5a;
const COL_LAMELLAR_HI = 0xaa9a7a;
const COL_LAMELLAR_DK = 0x6a5a3a;
const COL_FUR         = 0x6a5540;
const COL_FUR_HI      = 0x8a7560;

const COL_HORSE       = 0x9a7a50;
const COL_HORSE_HI    = 0xba9a70;
const COL_HORSE_DK    = 0x7a5a30;
const COL_HORSE_BELLY = 0x8a7a5a;
const COL_MANE        = 0x3a2a18;
const COL_HOOF        = 0x2a2218;

const COL_SADDLE      = 0x6a3a1a;
const COL_SADDLE_DK   = 0x4a2a10;
const COL_SADDLECLOTH = 0x884422;
const COL_SADDLECLOTH_TRIM = 0xccaa44;
const COL_REINS       = 0x4a3a28;

const COL_BOW         = 0x7a5530;
const COL_BOW_HI      = 0x9a7550;
const COL_BOW_HORN    = 0xccbb99;
const COL_STRING      = 0xccccaa;

const COL_ARROW_SHAFT = 0x8a7a5a;
const COL_ARROW_TIP   = 0xb0b8c0;
const COL_ARROW_FLETCH = 0xcc3333;

const COL_QUIVER      = 0x5a3a1e;
const COL_QUIVER_TRIM = 0xccaa44;

const COL_FEATHER     = 0xcc3333;
const COL_FEATHER2    = 0xeeeedd;

const COL_SHADOW      = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.ellipse(x, y, rx, ry);
}

function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.circle(x, y, r);
}

function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.rect(x, y, w, h);
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.poly(pts);
  g.fill();
}

// ---------------------------------------------------------------------------
// Horse (side-view, facing left – swift steppe pony)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.5;
  const by = oy + bob;

  // ── Legs (slender, fast) ─────────────────────────────────────────────
  const legLen = 13;
  const legW = 2.5;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 5;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 5;

  // Back legs
  const blx = ox + 9;
  rect(g, blx - 1, by + 6, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 6 + legLen + kneeOff2, legW + 0.5, 2, COL_HOOF);
  rect(g, blx + 3, by + 6, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 6 + legLen + kneeOff, legW + 0.5, 2, COL_HOOF);

  // Front legs
  const flx = ox - 13;
  rect(g, flx - 1, by + 5, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 5 + legLen + kneeOff, legW + 0.5, 2, COL_HOOF);
  rect(g, flx + 3, by + 5, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 5 + legLen + kneeOff2, legW + 0.5, 2, COL_HOOF);

  // ── Barrel (body – compact pony) ─────────────────────────────────────
  ellipse(g, ox, by, 18, 9, COL_HORSE);
  ellipse(g, ox, by + 3, 15, 5, COL_HORSE_BELLY);
  ellipse(g, ox, by - 3, 14, 4, COL_HORSE_HI);

  // ── Saddle cloth ─────────────────────────────────────────────────────
  poly(g, [
    ox - 6, by - 8,
    ox + 10, by - 7,
    ox + 12, by + 6,
    ox - 4, by + 6,
  ], COL_SADDLECLOTH, 0.8);
  line(g, ox - 4, by + 6, ox + 12, by + 6, COL_SADDLECLOTH_TRIM, 1.5);
  // Decorative diamond
  poly(g, [ox + 3, by - 4, ox + 5, by - 1, ox + 3, by + 2, ox + 1, by - 1], COL_SADDLECLOTH_TRIM, 0.6);

  // ── Tail (braided) ───────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 18;
  const ty = by - 1;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 5, ty + tailSway, tx + 8, ty + 6 + tailSway, tx + 6, ty + 12);
  // Braid wraps
  for (let i = 0; i < 3; i++) {
    const bx = tx + 2 + i * 2;
    const bby = ty + 3 + i * 3 + tailSway * (i / 3);
    line(g, bx - 1, bby, bx + 2, bby + 1, COL_SADDLECLOTH_TRIM, 0.8);
  }
  // Tail tuft
  circle(g, tx + 6, ty + 13 + tailSway * 0.5, 2, COL_MANE);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 16;
  const ny = by - 5 + tilt * 2;
  poly(g, [
    ox - 12, by - 7,
    nx, ny - 8,
    nx + 6, ny - 11,
    ox - 7, by - 9,
  ], COL_HORSE);
  line(g, nx + 2, ny - 10, ox - 8, by - 8, COL_HORSE_HI, 1.5);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 3;
  const hy = ny - 10 + tilt * 2;
  // Skull
  ellipse(g, hx, hy, 7, 4.5, COL_HORSE);
  // Muzzle
  ellipse(g, hx - 5, hy + 1.5, 3.5, 2.5, COL_HORSE_HI);
  // Nostril
  circle(g, hx - 7, hy + 2, 0.8, COL_HORSE_DK);
  // Eye
  circle(g, hx - 1, hy - 2, 1.5, 0x221100);
  circle(g, hx - 1.5, hy - 2.5, 0.5, 0xffffff);
  // Ears (alert, forward-pricked)
  poly(g, [hx + 2, hy - 4, hx + 1, hy - 9, hx + 4, hy - 5], COL_HORSE_DK);
  poly(g, [hx - 1, hy - 4, hx - 2, hy - 9, hx + 1, hy - 5], COL_HORSE_DK);

  // ── Braided mane ─────────────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 10 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.8) * 2;
    // Braided sections
    line(g, mx, my, mx + maneWave - 1.5, my + 4, COL_MANE, 2);
    if (i % 2 === 0) {
      circle(g, mx + maneWave * 0.5 - 0.5, my + 2, 0.6, COL_SADDLECLOTH_TRIM);
    }
  }

  // ── Bridle (simple leather) ──────────────────────────────────────────
  line(g, hx - 4, hy + 2, hx + 3, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 3, hy - 1).bezierCurveTo(nx + 6, ny - 3, ox - 12, by - 3, ox - 10, by - 1);

  // ── Saddle ───────────────────────────────────────────────────────────
  ellipse(g, ox - 1, by - 9, 7, 3, COL_SADDLE);
  rect(g, ox - 8, by - 11, 3, 4, COL_SADDLE_DK);
  rect(g, ox + 3, by - 10, 3, 3, COL_SADDLE_DK);
  // Stirrup strap
  line(g, ox - 3, by - 7, ox - 5, by + 4, COL_SADDLE_DK, 1);
  rect(g, ox - 7, by + 3, 4, 2, COL_LEATHER_DK);
}

// ---------------------------------------------------------------------------
// Rider (horse archer, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, bowDraw: number, bowAngle: number): void {
  const rb = breathe;

  // ── Legs (in stirrups, riding boots) ─────────────────────────────────
  rect(g, ox - 7, oy + 2, 3.5, 10, COL_LEATHER);
  rect(g, ox - 7, oy + 2, 3.5, 2, COL_LEATHER_HI);
  rect(g, ox - 8, oy + 11, 4, 3, COL_LEATHER_DK); // boot

  // ── Torso ────────────────────────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 10 + rb;

  // Lamellar armor (layered plates)
  rect(g, tx - 5, ty, 12, 13, COL_LAMELLAR);
  // Lamellar plate rows
  for (let row = 0; row < 5; row++) {
    const ry = ty + 1 + row * 2.5;
    for (let col = 0; col < 3; col++) {
      const rx = tx - 4 + col * 3.5;
      rect(g, rx, ry, 3, 2, row % 2 === col % 2 ? COL_LAMELLAR_HI : COL_LAMELLAR_DK);
    }
  }
  // Center line
  line(g, tx + 1, ty, tx + 1, ty + 13, COL_LAMELLAR_HI, 1);

  // Fur collar
  ellipse(g, tx + 1, ty, 7, 2.5, COL_FUR);
  // Fur texture
  for (let i = 0; i < 5; i++) {
    line(g, tx - 4 + i * 2, ty - 1, tx - 4 + i * 2 + 1, ty + 1, COL_FUR_HI, 0.8);
  }

  // Belt
  rect(g, tx - 5, ty + 13, 12, 2, COL_LEATHER_DK);
  // Belt buckle
  rect(g, tx, ty + 13, 2, 2, COL_SADDLECLOTH_TRIM);

  // ── Quiver (on back, visible from side) ──────────────────────────────
  const qx = tx + 8;
  const qy = ty + 1;
  // Quiver body
  poly(g, [
    qx, qy,
    qx + 3, qy + 1,
    qx + 3, qy + 14,
    qx, qy + 13,
  ], COL_QUIVER);
  // Quiver opening
  rect(g, qx, qy, 3, 1.5, COL_QUIVER_TRIM);
  // Arrow fletching poking out
  for (let i = 0; i < 3; i++) {
    const ay = qy - 2 - i * 1.5;
    line(g, qx + 1, qy, qx + 1 + i * 0.5, ay, COL_ARROW_SHAFT, 1);
    // Fletching
    poly(g, [
      qx + 1 + i * 0.5, ay,
      qx + 2 + i * 0.5, ay - 1.5,
      qx + i * 0.5, ay - 1.5,
    ], COL_ARROW_FLETCH, 0.8);
  }
  // Quiver strap
  line(g, qx + 1, qy + 2, tx - 3, ty + 3, COL_LEATHER_DK, 1);

  // ── Shoulders (leather with fur trim) ────────────────────────────────
  ellipse(g, tx - 5, ty + 2, 4, 3, COL_LEATHER);
  ellipse(g, tx + 7, ty + 2, 4, 3, COL_LEATHER);
  // Fur trim on shoulders
  line(g, tx - 8, ty + 2, tx - 2, ty + 2, COL_FUR, 2);
  line(g, tx + 4, ty + 2, tx + 10, ty + 2, COL_FUR, 2);

  // ── Bow arm (left – holds bow) ───────────────────────────────────────
  const bowArmX = tx - 7;
  const bowArmY = ty + 5;
  rect(g, bowArmX, ty + 4, 3, 7, COL_LEATHER);
  // Leather bracer
  rect(g, bowArmX, ty + 8, 3, 3, COL_LEATHER_HI);
  line(g, bowArmX, ty + 9, bowArmX + 3, ty + 9, COL_LEATHER_DK, 0.8);

  // ── Composite recurve bow ────────────────────────────────────────────
  const bx = bowArmX - 2;
  const bby = bowArmY + 4;
  // Bow drawn at bowAngle, curving
  const bowR = 14;
  const topAngle = bowAngle - Math.PI * 0.4;
  const botAngle = bowAngle + Math.PI * 0.4;
  const tipTopX = bx + Math.cos(topAngle) * bowR;
  const tipTopY = bby + Math.sin(topAngle) * bowR;
  const tipBotX = bx + Math.cos(botAngle) * bowR;
  const tipBotY = bby + Math.sin(botAngle) * bowR;

  // Upper limb (with recurve tip)
  g.stroke({ color: COL_BOW, width: 2.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(topAngle) * 5, bby + Math.sin(topAngle) * 5,
    bx + Math.cos(topAngle) * 10, bby + Math.sin(topAngle) * 10,
    tipTopX, tipTopY
  );
  // Recurve tip (horn nock)
  g.stroke({ color: COL_BOW_HORN, width: 1.5 });
  g.moveTo(tipTopX, tipTopY).lineTo(
    tipTopX + Math.cos(topAngle + 0.8) * 3,
    tipTopY + Math.sin(topAngle + 0.8) * 3
  );

  // Lower limb
  g.stroke({ color: COL_BOW, width: 2.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(botAngle) * 5, bby + Math.sin(botAngle) * 5,
    bx + Math.cos(botAngle) * 10, bby + Math.sin(botAngle) * 10,
    tipBotX, tipBotY
  );
  // Recurve tip
  g.stroke({ color: COL_BOW_HORN, width: 1.5 });
  g.moveTo(tipBotX, tipBotY).lineTo(
    tipBotX + Math.cos(botAngle - 0.8) * 3,
    tipBotY + Math.sin(botAngle - 0.8) * 3
  );

  // Bow grip (leather wrapped)
  circle(g, bx, bby, 2, COL_BOW_HI);

  // Bowstring
  const stringPull = bowDraw * 5;
  const midX = bx + Math.cos(bowAngle + Math.PI) * stringPull;
  const midY = bby + Math.sin(bowAngle + Math.PI) * stringPull;
  g.stroke({ color: COL_STRING, width: 0.8 });
  g.moveTo(tipTopX, tipTopY).bezierCurveTo(
    midX, midY - 2, midX, midY + 2,
    tipBotX, tipBotY
  );

  // ── Arrow (nocked when drawing) ──────────────────────────────────────
  if (bowDraw > 0.1) {
    const arrAngle = bowAngle;
    const arrLen = 16;
    const ax1 = midX;
    const ay1 = midY;
    const ax2 = ax1 + Math.cos(arrAngle) * arrLen;
    const ay2 = ay1 + Math.sin(arrAngle) * arrLen;
    // Shaft
    line(g, ax1, ay1, ax2, ay2, COL_ARROW_SHAFT, 1.5);
    // Tip
    const tipDx = Math.cos(arrAngle) * 3;
    const tipDy = Math.sin(arrAngle) * 3;
    poly(g, [
      ax2, ay2,
      ax2 + tipDx, ay2 + tipDy,
      ax2 + tipDy * 0.5, ay2 - tipDx * 0.5,
      ax2 - tipDy * 0.5, ay2 + tipDx * 0.5,
    ], COL_ARROW_TIP);
    // Fletching
    const fDist = 3;
    const fx = ax1 + Math.cos(arrAngle) * fDist;
    const fy = ay1 + Math.sin(arrAngle) * fDist;
    const perpX = Math.sin(arrAngle) * 2;
    const perpY = -Math.cos(arrAngle) * 2;
    poly(g, [fx, fy, fx + perpX, fy + perpY, fx + Math.cos(arrAngle) * 2, fy + Math.sin(arrAngle) * 2], COL_ARROW_FLETCH, 0.8);
    poly(g, [fx, fy, fx - perpX, fy - perpY, fx + Math.cos(arrAngle) * 2, fy + Math.sin(arrAngle) * 2], COL_ARROW_FLETCH, 0.8);
  }

  // ── Draw arm (right – pulls string) ──────────────────────────────────
  const drawArmX = tx + 8;
  rect(g, drawArmX, ty + 4, 3, 6, COL_LEATHER);
  // Forearm reaching to string
  const faX = midX + 2;
  const faY = midY;
  line(g, drawArmX + 1, ty + 7, faX, faY, COL_LEATHER, 2.5);
  // Hand/finger tab
  circle(g, faX, faY, 1.5, COL_SKIN);

  // ── Head (leather cap with ear flaps) ────────────────────────────────
  const headX = tx + 1;
  const headY = ty - 6 + rb;

  // Face
  circle(g, headX, headY, 4.5, COL_SKIN);
  // Eye
  circle(g, headX - 3, headY - 1, 1, 0x221100);
  circle(g, headX - 3.3, headY - 1.3, 0.3, 0xffffff);

  // Leather cap
  ellipse(g, headX, headY - 2, 5.5, 4, COL_LEATHER);
  ellipse(g, headX, headY - 2, 4.5, 3, COL_LEATHER_HI);
  // Cap seam
  line(g, headX - 1, headY - 6, headX + 1, headY - 6, COL_LEATHER_DK, 1);
  line(g, headX, headY - 6, headX, headY - 2, COL_LEATHER_DK, 0.8);
  // Ear flaps
  poly(g, [
    headX - 5, headY - 1,
    headX - 5, headY + 4,
    headX - 3, headY + 5,
    headX - 3, headY,
  ], COL_LEATHER);
  // Fur trim on ear flap
  line(g, headX - 5, headY + 4, headX - 3, headY + 5, COL_FUR, 1.5);

  poly(g, [
    headX + 4, headY - 1,
    headX + 4, headY + 3,
    headX + 2, headY + 4,
    headX + 2, headY,
  ], COL_LEATHER);
  line(g, headX + 4, headY + 3, headX + 2, headY + 4, COL_FUR, 1.5);

  // ── Feather (decorative, sticking up from cap) ───────────────────────
  const featherWave = Math.sin(breathe * 3 + 1) * 1.5;
  g.stroke({ color: COL_FEATHER, width: 2 });
  g.moveTo(headX + 1, headY - 6).bezierCurveTo(
    headX + 4, headY - 12,
    headX + 6 + featherWave, headY - 16,
    headX + 8 + featherWave, headY - 14
  );
  g.stroke({ color: COL_FEATHER2, width: 1 });
  g.moveTo(headX + 1, headY - 6).bezierCurveTo(
    headX + 3, headY - 10,
    headX + 5 + featherWave, headY - 14,
    headX + 7 + featherWave, headY - 12
  );
}

// ---------------------------------------------------------------------------
// Flying arrow helper
// ---------------------------------------------------------------------------

function drawFlyingArrow(g: Graphics, x: number, y: number, angle: number): void {
  const len = 12;
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  line(g, x, y, ex, ey, COL_ARROW_SHAFT, 1.5);
  // Tip
  const tipDx = Math.cos(angle) * 3;
  const tipDy = Math.sin(angle) * 3;
  line(g, ex, ey, ex + tipDx, ey + tipDy, COL_ARROW_TIP, 2);
  // Fletching
  const fx = x + Math.cos(angle) * 2;
  const fy = y + Math.sin(angle) * 2;
  const perpX = Math.sin(angle) * 2;
  const perpY = -Math.cos(angle) * 2;
  line(g, fx, fy, fx + perpX, fy + perpY, COL_ARROW_FLETCH, 1.5);
  line(g, fx, fy, fx - perpX, fy - perpY, COL_ARROW_FLETCH, 1.5);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.7;
  const gait = frame * 0.04;

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, 0);
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.4, breathe, 0.15, -Math.PI * 0.5);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.3);
  drawRider(g, 44, OY + 14 + horseBob, breathe, 0.1, -Math.PI * 0.5 + Math.sin(gait * Math.PI * 2) * 0.08);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  // Draw (0-0.5), hold (0.5-0.6), release (0.6-0.7), follow through (0.7-1)
  let bowDraw: number;
  let bowAngle: number;

  if (t < 0.5) {
    // Drawing the bow
    const p = t / 0.5;
    bowDraw = p;
    bowAngle = -Math.PI * 0.5 + p * 0.15;
  } else if (t < 0.6) {
    // Hold at full draw
    bowDraw = 1;
    bowAngle = -Math.PI * 0.35;
  } else if (t < 0.7) {
    // Release
    bowDraw = 1 - (t - 0.6) / 0.1;
    bowAngle = -Math.PI * 0.35;
  } else {
    // Follow through
    const p = (t - 0.7) / 0.3;
    bowDraw = 0;
    bowAngle = -Math.PI * 0.5 + (1 - p) * 0.1;
  }

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, t * 0.5, 0);
  drawRider(g, 44, OY + 14, 0, bowDraw, bowAngle);

  // Flying arrow after release
  if (t > 0.6) {
    const arrowDist = (t - 0.6) * 80;
    drawFlyingArrow(g, 20 - arrowDist, OY + 10, -Math.PI * 0.98);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  ellipse(g, 44, GY, 22 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.4, stumble, fallAngle * 2);
  }

  if (t < 0.95) {
    drawRider(g, 44 + slideX, OY + 14 + dropY, 0, 0, -Math.PI * 0.5 - fallAngle);
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
 * Generate all horse archer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateHorseArcherFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
