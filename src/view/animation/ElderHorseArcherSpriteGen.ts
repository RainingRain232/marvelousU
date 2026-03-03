// Procedural sprite generator for the Elder Horse Archer unit type.
//
// Draws a massive nightmare warhorse with a void-armored rider at
// 144×144 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Massive void-black nightmare warhorse (3×3 tiles)
//   • Glowing spectral eyes on horse and rider
//   • Void-black plate armor with rune markings
//   • Spectral recurve bow with ghostly string
//   • Tattered shadow-cloth barding on horse
//   • Dead grey flesh, void-iron palette

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 144;         // frame width  (px) – 3 tiles wide
const FH = 144;         // frame height (px) – 3 tiles high
const OY = 44;          // vertical offset to center art in frame
const GY = FH - 6;      // ground line Y

// Palette ─ elder void nightmare
const COL_FLESH       = 0x6a6a70;   // dead grey flesh
const COL_FLESH_HI    = 0x7a7a80;
const COL_ARMOR       = 0x181820;   // void-black iron
const COL_ARMOR_HI    = 0x2a2a35;
const COL_ARMOR_DK    = 0x0e0e14;
const COL_RUNE        = 0x445566;   // faint rune glow
const COL_RUNE_HI     = 0x556688;
const COL_EYE         = 0x556688;   // spectral glow
const COL_EYE_HI      = 0x7799bb;

const COL_HORSE       = 0x1a1a22;   // nightmare black
const COL_HORSE_HI    = 0x2a2a35;
const COL_HORSE_DK    = 0x0e0e14;
const COL_HORSE_BELLY = 0x222230;
const COL_MANE        = 0x111118;   // shadow mane
const COL_MANE_HI     = 0x333344;   // spectral wisps
const COL_HOOF        = 0x333340;

const COL_BARDING     = 0x181825;   // shadow barding
const COL_BARDING_TRIM = 0x445566;  // rune trim
const COL_SADDLE      = 0x1a1a28;
const COL_SADDLE_DK   = 0x0e0e18;
const COL_REINS       = 0x222233;

const COL_BOW         = 0x2a2a38;   // void bow
const COL_BOW_HI      = 0x3a3a4a;
const COL_BOW_GLOW    = 0x556688;   // spectral glow on limbs
const COL_STRING      = 0x556688;   // spectral string

const COL_ARROW_SHAFT = 0x333344;
const COL_ARROW_TIP   = 0x7799bb;   // spectral tip
const COL_ARROW_FLETCH = 0x445566;

const COL_QUIVER      = 0x1a1a25;
const COL_QUIVER_TRIM = 0x445566;

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
// Nightmare Warhorse (side-view, facing left – massive elder beast)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 2;
  const by = oy + bob;

  // ── Legs (thick, powerful) ─────────────────────────────────────────
  const legLen = 20;
  const legW = 4;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 7;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 7;

  // Back legs
  const blx = ox + 14;
  rect(g, blx - 1, by + 9, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 9 + legLen + kneeOff2, legW + 1, 3, COL_HOOF);
  // Hoof glow
  circle(g, blx + 1, by + 12 + legLen + kneeOff2, 2, COL_RUNE, 0.3);
  rect(g, blx + 5, by + 9, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 5, by + 9 + legLen + kneeOff, legW + 1, 3, COL_HOOF);
  circle(g, blx + 7, by + 12 + legLen + kneeOff, 2, COL_RUNE, 0.3);

  // Front legs
  const flx = ox - 20;
  rect(g, flx - 1, by + 8, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 8 + legLen + kneeOff, legW + 1, 3, COL_HOOF);
  circle(g, flx + 1, by + 11 + legLen + kneeOff, 2, COL_RUNE, 0.3);
  rect(g, flx + 5, by + 8, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 5, by + 8 + legLen + kneeOff2, legW + 1, 3, COL_HOOF);
  circle(g, flx + 7, by + 11 + legLen + kneeOff2, 2, COL_RUNE, 0.3);

  // ── Barrel (body – massive warhorse) ───────────────────────────────
  ellipse(g, ox, by, 27, 14, COL_HORSE);
  ellipse(g, ox, by + 4, 22, 7, COL_HORSE_BELLY);
  ellipse(g, ox, by - 5, 21, 6, COL_HORSE_HI);

  // ── Barding (shadow cloth with rune trim) ──────────────────────────
  poly(g, [
    ox - 10, by - 12,
    ox + 16, by - 11,
    ox + 18, by + 9,
    ox - 6, by + 9,
  ], COL_BARDING, 0.7);
  // Rune trim along bottom
  line(g, ox - 6, by + 9, ox + 18, by + 9, COL_BARDING_TRIM, 2);
  // Rune markings on barding
  for (let i = 0; i < 3; i++) {
    const rx = ox - 2 + i * 7;
    const ry = by - 4 + i * 2;
    line(g, rx, ry, rx + 3, ry - 2, COL_RUNE, 1);
    line(g, rx + 3, ry - 2, rx + 5, ry + 1, COL_RUNE, 1);
    circle(g, rx + 2, ry - 1, 1, COL_RUNE_HI, 0.5);
  }

  // ── Tail (spectral wisps) ─────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 4;
  const tx = ox + 27;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 4 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 7, ty + tailSway, tx + 12, ty + 8 + tailSway, tx + 9, ty + 18);
  // Spectral wisps
  g.stroke({ color: COL_MANE_HI, width: 1.5 });
  g.moveTo(tx + 2, ty + 2).bezierCurveTo(tx + 9, ty + tailSway + 2, tx + 14, ty + 10 + tailSway, tx + 11, ty + 20);
  // Ghostly tip
  circle(g, tx + 9, ty + 19 + tailSway * 0.5, 3, COL_RUNE, 0.3);

  // ── Neck (thick, armored) ─────────────────────────────────────────
  const nx = ox - 24;
  const ny = by - 8 + tilt * 3;
  poly(g, [
    ox - 18, by - 11,
    nx, ny - 12,
    nx + 9, ny - 16,
    ox - 10, by - 13,
  ], COL_HORSE);
  // Neck armor plates
  line(g, nx + 3, ny - 14, ox - 12, by - 12, COL_HORSE_HI, 2);
  for (let i = 0; i < 3; i++) {
    const px = nx + 4 + i * 5;
    const py = ny - 14 + i * 1;
    rect(g, px, py, 4, 2, COL_BARDING, 0.6);
    line(g, px, py + 1, px + 4, py + 1, COL_BARDING_TRIM, 0.8);
  }

  // ── Head (armored skull) ──────────────────────────────────────────
  const hx = nx - 4;
  const hy = ny - 15 + tilt * 3;
  // Skull
  ellipse(g, hx, hy, 10, 7, COL_HORSE);
  // Muzzle
  ellipse(g, hx - 8, hy + 2, 5, 4, COL_HORSE_HI);
  // Nostril — spectral glow
  circle(g, hx - 11, hy + 3, 1.2, COL_RUNE, 0.6);
  // Spectral breath wisps
  const breathWisp = Math.sin(gait * Math.PI * 4) * 2;
  g.stroke({ color: COL_RUNE, width: 1 });
  g.moveTo(hx - 12, hy + 3).bezierCurveTo(hx - 16, hy + breathWisp, hx - 18, hy + 2 + breathWisp, hx - 20, hy + breathWisp);
  // Eye — glowing spectral
  circle(g, hx - 2, hy - 3, 2.5, COL_EYE);
  circle(g, hx - 2, hy - 3, 1.5, COL_EYE_HI);
  circle(g, hx - 2, hy - 3, 4, COL_EYE, 0.2);

  // Ears (jagged, torn)
  poly(g, [hx + 3, hy - 6, hx + 1, hy - 14, hx + 6, hy - 8], COL_HORSE_DK);
  poly(g, [hx - 2, hy - 6, hx - 3, hy - 13, hx + 1, hy - 8], COL_HORSE_DK);

  // Skull plate (armor on face)
  poly(g, [
    hx - 6, hy - 5,
    hx + 5, hy - 5,
    hx + 3, hy + 3,
    hx - 4, hy + 3,
  ], COL_BARDING, 0.5);
  // Rune on skull plate
  line(g, hx - 1, hy - 4, hx - 1, hy + 2, COL_RUNE, 1);
  circle(g, hx - 1, hy - 1, 1.5, COL_RUNE_HI, 0.4);

  // ── Mane (shadow wisps) ────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const mx = nx + 1 + i * 3.5;
    const my = ny - 15 + i * 2;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 3;
    g.stroke({ color: COL_MANE, width: 3 });
    g.moveTo(mx, my).bezierCurveTo(mx + maneWave - 2, my + 3, mx + maneWave - 3, my + 6, mx + maneWave - 1, my + 8);
    // Spectral wisps in mane
    if (i % 2 === 0) {
      g.stroke({ color: COL_MANE_HI, width: 1 });
      g.moveTo(mx + 1, my + 1).bezierCurveTo(mx + maneWave, my + 4, mx + maneWave - 1, my + 7, mx + maneWave + 1, my + 9);
    }
  }

  // ── Bridle (dark iron chains) ──────────────────────────────────────
  line(g, hx - 6, hy + 3, hx + 5, hy - 1, COL_REINS, 1.5);
  g.stroke({ color: COL_REINS, width: 1.5 });
  g.moveTo(hx + 5, hy - 1).bezierCurveTo(nx + 9, ny - 4, ox - 18, by - 5, ox - 15, by - 2);

  // ── Saddle (void-iron) ─────────────────────────────────────────────
  ellipse(g, ox - 2, by - 13, 10, 4, COL_SADDLE);
  rect(g, ox - 12, by - 16, 4, 6, COL_SADDLE_DK);
  rect(g, ox + 5, by - 15, 4, 5, COL_SADDLE_DK);
  // Stirrup strap
  line(g, ox - 4, by - 10, ox - 7, by + 6, COL_SADDLE_DK, 1.5);
  rect(g, ox - 10, by + 5, 6, 3, COL_ARMOR_DK);
}

// ---------------------------------------------------------------------------
// Rider (elder void archer, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, bowDraw: number, bowAngle: number): void {
  const rb = breathe;

  // ── Legs (in stirrups, void-iron greaves) ──────────────────────────
  rect(g, ox - 10, oy + 3, 5, 14, COL_ARMOR);
  rect(g, ox - 10, oy + 3, 5, 3, COL_ARMOR_HI);
  rect(g, ox - 11, oy + 16, 6, 4, COL_ARMOR_DK); // boot
  // Rune on greave
  line(g, ox - 8, oy + 8, ox - 8, oy + 14, COL_RUNE, 0.8);

  // ── Torso ──────────────────────────────────────────────────────────
  const tx = ox - 3;
  const ty = oy - 15 + rb;

  // Void-black plate armor
  rect(g, tx - 7, ty, 17, 18, COL_ARMOR);
  // Plate rows (layered darkness)
  for (let row = 0; row < 6; row++) {
    const ry = ty + 1 + row * 3;
    for (let col = 0; col < 4; col++) {
      const rx = tx - 6 + col * 4;
      rect(g, rx, ry, 3.5, 2.5, row % 2 === col % 2 ? COL_ARMOR_HI : COL_ARMOR_DK);
    }
  }
  // Rune markings on torso
  line(g, tx + 1, ty + 2, tx + 1, ty + 16, COL_RUNE, 1);
  circle(g, tx + 1, ty + 5, 1.5, COL_RUNE_HI, 0.4);
  circle(g, tx + 1, ty + 11, 1.5, COL_RUNE_HI, 0.4);

  // Gorget (neck armor)
  ellipse(g, tx + 1, ty, 10, 3.5, COL_ARMOR_DK);
  line(g, tx - 7, ty, tx + 9, ty, COL_RUNE, 0.8);

  // Belt
  rect(g, tx - 7, ty + 18, 17, 3, COL_ARMOR_DK);
  // Belt rune buckle
  rect(g, tx, ty + 18, 3, 3, COL_RUNE);
  circle(g, tx + 1.5, ty + 19.5, 1, COL_RUNE_HI, 0.6);

  // ── Quiver (on back, void-iron) ────────────────────────────────────
  const qx = tx + 11;
  const qy = ty + 1;
  poly(g, [
    qx, qy,
    qx + 4, qy + 1,
    qx + 4, qy + 18,
    qx, qy + 17,
  ], COL_QUIVER);
  rect(g, qx, qy, 4, 2, COL_QUIVER_TRIM);
  // Spectral arrows poking out
  for (let i = 0; i < 4; i++) {
    const ay = qy - 3 - i * 2;
    line(g, qx + 1.5, qy, qx + 1.5 + i * 0.5, ay, COL_ARROW_SHAFT, 1.5);
    // Spectral fletching
    poly(g, [
      qx + 1.5 + i * 0.5, ay,
      qx + 3 + i * 0.5, ay - 2,
      qx + i * 0.5, ay - 2,
    ], COL_ARROW_FLETCH, 0.7);
  }
  // Quiver strap
  line(g, qx + 2, qy + 3, tx - 4, ty + 4, COL_ARMOR_DK, 1.5);

  // ── Shoulders (massive void-plate pauldrons) ───────────────────────
  ellipse(g, tx - 7, ty + 3, 6, 4.5, COL_ARMOR);
  ellipse(g, tx + 10, ty + 3, 6, 4.5, COL_ARMOR);
  // Rune trim on pauldrons
  line(g, tx - 12, ty + 3, tx - 2, ty + 3, COL_RUNE, 1.5);
  line(g, tx + 5, ty + 3, tx + 15, ty + 3, COL_RUNE, 1.5);
  // Spikes on pauldrons
  poly(g, [tx - 10, ty + 1, tx - 12, ty - 4, tx - 8, ty + 1], COL_ARMOR_DK);
  poly(g, [tx + 12, ty + 1, tx + 14, ty - 4, tx + 10, ty + 1], COL_ARMOR_DK);

  // ── Bow arm (left – holds bow) ─────────────────────────────────────
  const bowArmX = tx - 10;
  const bowArmY = ty + 7;
  rect(g, bowArmX, ty + 6, 4.5, 10, COL_ARMOR);
  // Void gauntlet
  rect(g, bowArmX, ty + 13, 4.5, 4, COL_ARMOR_HI);
  line(g, bowArmX, ty + 14, bowArmX + 4.5, ty + 14, COL_RUNE, 0.8);

  // ── Spectral recurve bow ───────────────────────────────────────────
  const bx = bowArmX - 3;
  const bby = bowArmY + 6;
  const bowR = 21;
  const topAngle = bowAngle - Math.PI * 0.4;
  const botAngle = bowAngle + Math.PI * 0.4;
  const tipTopX = bx + Math.cos(topAngle) * bowR;
  const tipTopY = bby + Math.sin(topAngle) * bowR;
  const tipBotX = bx + Math.cos(botAngle) * bowR;
  const tipBotY = bby + Math.sin(botAngle) * bowR;

  // Upper limb (void-iron with spectral glow)
  g.stroke({ color: COL_BOW, width: 3.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(topAngle) * 7, bby + Math.sin(topAngle) * 7,
    bx + Math.cos(topAngle) * 15, bby + Math.sin(topAngle) * 15,
    tipTopX, tipTopY
  );
  // Spectral glow on upper limb
  g.stroke({ color: COL_BOW_GLOW, width: 1.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(topAngle) * 7, bby + Math.sin(topAngle) * 7,
    bx + Math.cos(topAngle) * 15, bby + Math.sin(topAngle) * 15,
    tipTopX, tipTopY
  );
  // Recurve tip
  g.stroke({ color: COL_BOW_GLOW, width: 2 });
  g.moveTo(tipTopX, tipTopY).lineTo(
    tipTopX + Math.cos(topAngle + 0.8) * 4,
    tipTopY + Math.sin(topAngle + 0.8) * 4
  );

  // Lower limb
  g.stroke({ color: COL_BOW, width: 3.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(botAngle) * 7, bby + Math.sin(botAngle) * 7,
    bx + Math.cos(botAngle) * 15, bby + Math.sin(botAngle) * 15,
    tipBotX, tipBotY
  );
  g.stroke({ color: COL_BOW_GLOW, width: 1.5 });
  g.moveTo(bx, bby).bezierCurveTo(
    bx + Math.cos(botAngle) * 7, bby + Math.sin(botAngle) * 7,
    bx + Math.cos(botAngle) * 15, bby + Math.sin(botAngle) * 15,
    tipBotX, tipBotY
  );
  // Recurve tip
  g.stroke({ color: COL_BOW_GLOW, width: 2 });
  g.moveTo(tipBotX, tipBotY).lineTo(
    tipBotX + Math.cos(botAngle - 0.8) * 4,
    tipBotY + Math.sin(botAngle - 0.8) * 4
  );

  // Bow grip (rune-inscribed)
  circle(g, bx, bby, 3, COL_BOW_HI);
  circle(g, bx, bby, 1.5, COL_RUNE_HI, 0.5);

  // Spectral bowstring
  const stringPull = bowDraw * 7;
  const midX = bx + Math.cos(bowAngle + Math.PI) * stringPull;
  const midY = bby + Math.sin(bowAngle + Math.PI) * stringPull;
  g.stroke({ color: COL_STRING, width: 1.2 });
  g.moveTo(tipTopX, tipTopY).bezierCurveTo(
    midX, midY - 3, midX, midY + 3,
    tipBotX, tipBotY
  );

  // ── Arrow (nocked when drawing) ────────────────────────────────────
  if (bowDraw > 0.1) {
    const arrAngle = bowAngle;
    const arrLen = 22;
    const ax1 = midX;
    const ay1 = midY;
    const ax2 = ax1 + Math.cos(arrAngle) * arrLen;
    const ay2 = ay1 + Math.sin(arrAngle) * arrLen;
    // Shaft
    line(g, ax1, ay1, ax2, ay2, COL_ARROW_SHAFT, 2);
    // Spectral tip
    const tipDx = Math.cos(arrAngle) * 4;
    const tipDy = Math.sin(arrAngle) * 4;
    poly(g, [
      ax2, ay2,
      ax2 + tipDx, ay2 + tipDy,
      ax2 + tipDy * 0.5, ay2 - tipDx * 0.5,
      ax2 - tipDy * 0.5, ay2 + tipDx * 0.5,
    ], COL_ARROW_TIP);
    // Glow around tip
    circle(g, ax2 + tipDx * 0.5, ay2 + tipDy * 0.5, 3, COL_ARROW_TIP, 0.2);
    // Fletching
    const fDist = 4;
    const fx = ax1 + Math.cos(arrAngle) * fDist;
    const fy = ay1 + Math.sin(arrAngle) * fDist;
    const perpX = Math.sin(arrAngle) * 3;
    const perpY = -Math.cos(arrAngle) * 3;
    poly(g, [fx, fy, fx + perpX, fy + perpY, fx + Math.cos(arrAngle) * 3, fy + Math.sin(arrAngle) * 3], COL_ARROW_FLETCH, 0.7);
    poly(g, [fx, fy, fx - perpX, fy - perpY, fx + Math.cos(arrAngle) * 3, fy + Math.sin(arrAngle) * 3], COL_ARROW_FLETCH, 0.7);
  }

  // ── Draw arm (right – pulls string) ────────────────────────────────
  const drawArmX = tx + 11;
  rect(g, drawArmX, ty + 6, 4.5, 8, COL_ARMOR);
  // Forearm reaching to string
  const faX = midX + 3;
  const faY = midY;
  line(g, drawArmX + 2, ty + 10, faX, faY, COL_ARMOR, 3.5);
  // Gauntlet hand
  circle(g, faX, faY, 2, COL_FLESH);

  // ── Head (void helm with spectral visor) ───────────────────────────
  const headX = tx + 2;
  const headY = ty - 9 + rb;

  // Face (dead grey flesh visible at jaw)
  circle(g, headX, headY, 6.5, COL_FLESH);

  // Void helm
  ellipse(g, headX, headY - 3, 8, 6, COL_ARMOR);
  ellipse(g, headX, headY - 3, 6.5, 4.5, COL_ARMOR_HI);
  // Helm crest (jagged)
  poly(g, [headX - 2, headY - 9, headX, headY - 15, headX + 2, headY - 9], COL_ARMOR_DK);
  poly(g, [headX + 1, headY - 8, headX + 3, headY - 13, headX + 5, headY - 8], COL_ARMOR_DK);
  // Visor slit — spectral glow
  rect(g, headX - 5, headY - 3, 8, 2, COL_EYE);
  rect(g, headX - 5, headY - 3, 8, 2, COL_EYE_HI, 0.5);
  // Eye glow bleeding out
  circle(g, headX - 3, headY - 2, 3, COL_EYE, 0.15);

  // Rune on helm
  line(g, headX, headY - 8, headX, headY - 4, COL_RUNE, 1);
  circle(g, headX, headY - 6, 1, COL_RUNE_HI, 0.5);
}

// ---------------------------------------------------------------------------
// Flying arrow helper
// ---------------------------------------------------------------------------

function drawFlyingArrow(g: Graphics, x: number, y: number, angle: number): void {
  const len = 18;
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  line(g, x, y, ex, ey, COL_ARROW_SHAFT, 2);
  // Spectral tip
  const tipDx = Math.cos(angle) * 4;
  const tipDy = Math.sin(angle) * 4;
  line(g, ex, ey, ex + tipDx, ey + tipDy, COL_ARROW_TIP, 2.5);
  circle(g, ex + tipDx * 0.5, ey + tipDy * 0.5, 3, COL_ARROW_TIP, 0.3);
  // Fletching
  const fx = x + Math.cos(angle) * 3;
  const fy = y + Math.sin(angle) * 3;
  const perpX = Math.sin(angle) * 3;
  const perpY = -Math.cos(angle) * 3;
  line(g, fx, fy, fx + perpX, fy + perpY, COL_ARROW_FLETCH, 2);
  line(g, fx, fy, fx - perpX, fy - perpY, COL_ARROW_FLETCH, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 1;
  const gait = frame * 0.04;

  ellipse(g, 66, GY, 33, 7, COL_SHADOW, 0.3);
  drawHorse(g, 72, OY + 36, gait, 0);
  drawRider(g, 66, OY + 21 + Math.sin(gait * Math.PI * 2) * 0.5, breathe, 0.15, -Math.PI * 0.5);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.7;
  const horseBob = Math.sin(gait * Math.PI * 2) * 3;

  ellipse(g, 66, GY, 33, 7, COL_SHADOW, 0.3);
  drawHorse(g, 72, OY + 36, gait, Math.sin(gait * Math.PI * 2) * 0.3);
  drawRider(g, 66, OY + 21 + horseBob, breathe, 0.1, -Math.PI * 0.5 + Math.sin(gait * Math.PI * 2) * 0.08);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  let bowDraw: number;
  let bowAngle: number;

  if (t < 0.5) {
    const p = t / 0.5;
    bowDraw = p;
    bowAngle = -Math.PI * 0.5 + p * 0.15;
  } else if (t < 0.6) {
    bowDraw = 1;
    bowAngle = -Math.PI * 0.35;
  } else if (t < 0.7) {
    bowDraw = 1 - (t - 0.6) / 0.1;
    bowAngle = -Math.PI * 0.35;
  } else {
    const p = (t - 0.7) / 0.3;
    bowDraw = 0;
    bowAngle = -Math.PI * 0.5 + (1 - p) * 0.1;
  }

  ellipse(g, 66, GY, 33, 7, COL_SHADOW, 0.3);
  drawHorse(g, 72, OY + 36, t * 0.5, 0);
  drawRider(g, 66, OY + 21, 0, bowDraw, bowAngle);

  // Spectral flying arrow after release
  if (t > 0.6) {
    const arrowDist = (t - 0.6) * 120;
    drawFlyingArrow(g, 30 - arrowDist, OY + 14, -Math.PI * 0.98);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallAngle = t * 0.4;
  const slideX = t * 12;
  const dropY = t * t * 20;
  const fade = Math.max(0, 1 - t * 0.7);

  ellipse(g, 66, GY, 33 * (1 - t * 0.5), 7 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 72 + slideX * 0.3, OY + 36 + dropY * 0.4, stumble, fallAngle * 2);
  }

  if (t < 0.95) {
    drawRider(g, 66 + slideX, OY + 21 + dropY, 0, 0, -Math.PI * 0.5 - fallAngle);
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
 * Generate all elder horse archer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateElderHorseArcherFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
