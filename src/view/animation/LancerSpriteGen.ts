// Procedural sprite generator for the Lancer unit type.
//
// Draws a detailed side-view medieval lancer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Side-view warhorse with plate barding, flowing mane & tail
//   • Medium plate armor with heraldic surcoat
//   • Great helm with nasal guard and crest
//   • Couched lance with vamplate and pennon
//   • Kite shield with heraldic device
//   • Riding cloak flowing behind
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const GY = F - 3;      // ground line Y

// Palette ─ medium cavalry with lance
const COL_SKIN       = 0xd4a574;
const COL_PLATE      = 0x8899aa;
const COL_PLATE_HI   = 0xaabbcc;
const COL_PLATE_DK   = 0x667788;
const COL_SURCOAT    = 0x2244aa;
const COL_SURCOAT_HI = 0x3355bb;
const COL_GOLD       = 0xd4af37;

const COL_HORSE      = 0x6b4a2a;
const COL_HORSE_HI   = 0x8b6a4a;
const COL_HORSE_DK   = 0x4b2a1a;
const COL_HORSE_BELLY= 0x7a5a3a;
const COL_MANE       = 0x2a1a0a;
const COL_HOOF       = 0x2a2218;

const COL_SADDLE     = 0x553318;
const COL_SADDLE_DK  = 0x3a2210;

const COL_LANCE      = 0x7a5530;
const COL_LANCE_HI   = 0x9a7550;
const COL_LANCE_TIP  = 0xccccdd;
const COL_PENNON     = 0xcc2222;
const COL_PENNON_HI  = 0xee4444;

const COL_SHIELD     = 0x2244aa;
const COL_SHIELD_EDGE= 0xd4af37;
const COL_SHIELD_DK  = 0x112266;

const COL_CLOAK      = 0x2244aa;
const COL_CLOAK_HI   = 0x3355bb;

const COL_BOOT       = 0x444455;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}

function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w = 1): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

function poly(g: Graphics, pts: number[], c: number, a = 1): void {
  g.poly(pts).fill({ color: c, alpha: a });
}

// ---------------------------------------------------------------------------
// Horse (side-view, facing left)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.2;
  const by = oy + bob;

  // ── Legs (sturdy warhorse) ───────────────────────────────────────────
  const legLen = 8;
  const legW = 1.8;
  const swing = Math.sin(gait * Math.PI * 2) * 3;
  const swing2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 3;

  // Back legs (darker, behind body)
  rect(g, ox + 5, by + 4, legW, legLen + swing2 * 0.4, COL_HORSE_DK);
  rect(g, ox + 5, by + 4 + legLen + swing2 * 0.4, legW + 0.3, 1.5, COL_HOOF);
  rect(g, ox + 8, by + 4, legW, legLen + swing * 0.4, COL_HORSE);
  rect(g, ox + 8, by + 4 + legLen + swing * 0.4, legW + 0.3, 1.5, COL_HOOF);

  // Front legs
  rect(g, ox - 8, by + 3, legW, legLen + swing * 0.4, COL_HORSE_DK);
  rect(g, ox - 8, by + 3 + legLen + swing * 0.4, legW + 0.3, 1.5, COL_HOOF);
  rect(g, ox - 5, by + 3, legW, legLen + swing2 * 0.4, COL_HORSE);
  rect(g, ox - 5, by + 3 + legLen + swing2 * 0.4, legW + 0.3, 1.5, COL_HOOF);

  // ── Barrel body ──────────────────────────────────────────────────────
  ellipse(g, ox, by, 11, 5, COL_HORSE);
  ellipse(g, ox, by + 1.5, 9, 3, COL_HORSE_BELLY);
  ellipse(g, ox, by - 2, 8, 2.5, COL_HORSE_HI);

  // ── Barding (armor plates on horse) ──────────────────────────────────
  rect(g, ox - 9, by - 5, 18, 1, COL_PLATE_DK);
  rect(g, ox - 9, by + 4, 18, 1, COL_PLATE_DK);
  // Gold trim
  rect(g, ox - 9, by - 5, 18, 0.5, COL_GOLD);

  // ── Tail ─────────────────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 2;
  g.moveTo(ox + 11, by - 1).bezierCurveTo(
    ox + 14, by + tailSway,
    ox + 15, by + 4 + tailSway,
    ox + 13, by + 7
  ).stroke({ color: COL_MANE, width: 1.5 });

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 10;
  const ny = by - 4 + tilt;
  poly(g, [
    ox - 7, by - 4,
    nx, ny - 4,
    nx + 4, ny - 6,
    ox - 4, by - 5,
  ], COL_HORSE);
  line(g, nx + 1, ny - 5, ox - 5, by - 5, COL_HORSE_HI, 1);
  // Neck barding
  line(g, ox - 7, by - 4, nx + 1, ny - 4, COL_PLATE_DK, 1);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 2;
  const hy = ny - 6 + tilt;
  // Skull
  ellipse(g, hx, hy, 4.5, 3, COL_HORSE);
  // Muzzle
  ellipse(g, hx - 3, hy + 1, 2.5, 1.8, COL_HORSE_HI);
  // Nostril
  circle(g, hx - 4.5, hy + 1.5, 0.6, COL_HORSE_DK);
  // Eye
  circle(g, hx - 1, hy - 1, 1.2, 0x221100);
  circle(g, hx - 1.3, hy - 1.3, 0.4, 0xffffff);
  // Chanfron (face armor)
  rect(g, hx - 2, hy - 3, 4, 2.5, COL_PLATE_DK);
  rect(g, hx - 1, hy - 2.5, 2, 1.5, COL_PLATE_HI);
  // Ears
  poly(g, [hx + 1, hy - 2.5, hx, hy - 5, hx + 2.5, hy - 3], COL_HORSE_DK);
  poly(g, [hx - 1, hy - 2.5, hx - 2, hy - 5, hx + 0.5, hy - 3], COL_HORSE_DK);

  // ── Flowing mane ─────────────────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const mx = nx + i * 2;
    const my = ny - 5 + i;
    const mw = Math.sin(gait * Math.PI * 2 + i * 0.7) * 0.8;
    line(g, mx, my, mx + mw, my + 2.5, COL_MANE, 1.5);
  }

  // ── Bridle ───────────────────────────────────────────────────────────
  line(g, hx - 2, hy + 1, hx + 2, hy - 1, COL_SADDLE_DK, 0.7);
  g.moveTo(hx + 2, hy - 1).bezierCurveTo(nx + 3, ny - 2, ox - 8, by - 2, ox - 6, by - 1)
    .stroke({ color: COL_SADDLE_DK, width: 0.7 });

  // ── Saddle ───────────────────────────────────────────────────────────
  ellipse(g, ox - 1, by - 6, 4.5, 2, COL_SADDLE);
  rect(g, ox - 5, by - 7.5, 2, 3, COL_SADDLE_DK);
  rect(g, ox + 2, by - 7, 2, 2.5, COL_SADDLE_DK);
  // Stirrup strap
  line(g, ox - 2, by - 4.5, ox - 3, by + 2, COL_SADDLE_DK, 0.7);
  rect(g, ox - 4, by + 1, 2.5, 1.5, COL_PLATE_DK);
}

// ---------------------------------------------------------------------------
// Rider (side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, lanceAngle: number, lanceExt: number): void {
  const rb = breathe;

  // ── Cloak (drawn first, behind rider) ────────────────────────────────
  const tx = ox - 1;
  const ty = oy - 6 + rb;
  const cloakWave = Math.sin(breathe * 3 + 0.5) * 1.5;
  poly(g, [
    tx + 3, ty + 1,
    tx + 9 + cloakWave, ty + 3,
    tx + 10 + cloakWave, ty + 10,
    tx + 4, ty + 9,
  ], COL_CLOAK, 0.8);
  poly(g, [
    tx + 4, ty + 2,
    tx + 8 + cloakWave, ty + 4,
    tx + 8 + cloakWave, ty + 7,
    tx + 5, ty + 6,
  ], COL_CLOAK_HI, 0.4);

  // ── Leg (riding position, in stirrup) ────────────────────────────────
  rect(g, ox - 4, oy + 1, 2.5, 6, COL_PLATE_DK);
  rect(g, ox - 4, oy + 1, 2.5, 1.5, COL_PLATE);
  // Boot
  rect(g, ox - 5, oy + 6, 3, 2.5, COL_BOOT);

  // ── Torso (plate armor with surcoat) ─────────────────────────────────
  rect(g, tx - 3, ty, 8, 8, COL_PLATE);
  rect(g, tx - 2, ty + 1, 6, 6, COL_PLATE_HI);
  // Surcoat over armor
  rect(g, tx - 3, ty + 3, 8, 5, COL_SURCOAT);
  rect(g, tx - 2, ty + 4, 6, 3, COL_SURCOAT_HI);
  // Gold belt
  rect(g, tx - 3, ty + 8, 8, 1.2, COL_GOLD);
  // Heraldic device on surcoat (small cross)
  rect(g, tx, ty + 4, 1, 3, COL_GOLD);
  rect(g, tx - 1, ty + 5, 3, 1, COL_GOLD);

  // ── Pauldrons ────────────────────────────────────────────────────────
  ellipse(g, tx - 3, ty + 1, 2.5, 1.8, COL_PLATE);
  ellipse(g, tx + 5, ty + 1, 2.5, 1.8, COL_PLATE_DK);
  circle(g, tx - 3, ty + 1, 0.7, COL_GOLD);
  circle(g, tx + 5, ty + 1, 0.7, COL_GOLD);

  // ── Shield arm (left) ────────────────────────────────────────────────
  rect(g, tx - 5, ty + 3, 2, 4, COL_PLATE);
  // Bracer
  rect(g, tx - 5, ty + 6, 2, 1.5, COL_PLATE_DK);

  // ── Lance arm (right) ────────────────────────────────────────────────
  const armX = tx + 6;
  const armY = ty + 3;
  rect(g, armX, ty + 2, 2, 4, COL_PLATE);
  rect(g, armX, ty + 5, 2, 1.5, COL_PLATE_DK);
  // Forearm following lance angle
  const faDist = 3;
  const faX = armX + Math.cos(lanceAngle) * faDist;
  const faY = armY + Math.sin(lanceAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_PLATE, 2);
  circle(g, faX, faY, 1.2, COL_SKIN);

  // ── Lance ────────────────────────────────────────────────────────────
  const lLen = 18 + lanceExt;
  const lEndX = faX + Math.cos(lanceAngle) * lLen;
  const lEndY = faY + Math.sin(lanceAngle) * lLen;

  // Shaft
  line(g, faX, faY, lEndX, lEndY, COL_LANCE, 1.8);
  line(g, faX, faY - 0.3, lEndX, lEndY - 0.3, COL_LANCE_HI, 0.7);

  // Vamplate (hand guard disc)
  const vpX = faX + Math.cos(lanceAngle) * 3;
  const vpY = faY + Math.sin(lanceAngle) * 3;
  circle(g, vpX, vpY, 1.8, COL_PLATE);
  circle(g, vpX, vpY, 1, COL_GOLD);

  // Lance tip (steel)
  const tipLen = 3;
  const tipX = lEndX + Math.cos(lanceAngle) * tipLen;
  const tipY = lEndY + Math.sin(lanceAngle) * tipLen;
  const perpX = Math.sin(lanceAngle) * 1.5;
  const perpY = -Math.cos(lanceAngle) * 1.5;
  poly(g, [
    lEndX + perpX, lEndY + perpY,
    tipX, tipY,
    lEndX - perpX, lEndY - perpY,
  ], COL_LANCE_TIP);

  // Pennon (small flag near tip)
  const penBase = lLen * 0.7;
  const penX = faX + Math.cos(lanceAngle) * penBase;
  const penY = faY + Math.sin(lanceAngle) * penBase;
  const penWave = Math.sin(breathe * 3) * 1;
  poly(g, [
    penX, penY,
    penX + perpX * 2 + penWave, penY + perpY * 2,
    penX + Math.cos(lanceAngle) * 3 + perpX * 1.5 + penWave, penY + Math.sin(lanceAngle) * 3 + perpY * 1.5,
    penX + Math.cos(lanceAngle) * 3, penY + Math.sin(lanceAngle) * 3,
  ], COL_PENNON, 0.9);
  // Pennon highlight
  poly(g, [
    penX, penY,
    penX + perpX * 1.2 + penWave, penY + perpY * 1.2,
    penX + Math.cos(lanceAngle) * 2 + perpX + penWave, penY + Math.sin(lanceAngle) * 2 + perpY,
    penX + Math.cos(lanceAngle) * 2, penY + Math.sin(lanceAngle) * 2,
  ], COL_PENNON_HI, 0.5);

  // Butt end (rear of lance)
  const buttLen = 5;
  const buttX = faX - Math.cos(lanceAngle) * buttLen;
  const buttY = faY - Math.sin(lanceAngle) * buttLen;
  line(g, faX, faY, buttX, buttY, COL_LANCE, 1.8);
  circle(g, buttX, buttY, 1, COL_PLATE_DK);

  // ── Head (great helm) ────────────────────────────────────────────────
  const headX = tx + 1;
  const headY = ty - 5 + rb;

  // Face visible through visor
  circle(g, headX, headY, 3, COL_SKIN);

  // Helm
  ellipse(g, headX, headY - 1, 3.8, 2.8, COL_PLATE);
  ellipse(g, headX, headY - 1, 3, 2.2, COL_PLATE_HI);
  // Visor slit
  rect(g, headX - 2.5, headY, 4, 1, 0x222222);
  // Nasal guard
  rect(g, headX - 3, headY - 2, 1, 3.5, COL_PLATE_DK);
  // Gold trim on helm
  rect(g, headX - 3.5, headY - 3, 7, 0.7, COL_GOLD);
  // Eye through slit
  circle(g, headX - 1.5, headY + 0.2, 0.4, 0x221100);

  // Crest (small plume)
  const plumeWave = Math.sin(breathe * 3 + 1) * 0.5;
  rect(g, headX - 0.5, headY - 5, 1, 3, COL_PENNON);
  line(g, headX, headY - 5, headX + plumeWave, headY - 6.5, COL_PENNON, 1.5);
}

// ---------------------------------------------------------------------------
// Kite shield (drawn separately for layering)
// ---------------------------------------------------------------------------

function drawShield(g: Graphics, x: number, y: number, scale: number): void {
  const w = 5 * scale;
  const h = 7 * scale;

  // Kite shield shape
  g.beginPath();
  g.moveTo(x, y - h * 0.4);
  g.lineTo(x + w * 0.5, y - h * 0.2);
  g.lineTo(x + w * 0.5, y + h * 0.3);
  g.lineTo(x, y + h * 0.5);
  g.lineTo(x - w * 0.5, y + h * 0.3);
  g.lineTo(x - w * 0.5, y - h * 0.2);
  g.closePath();
  g.fill({ color: COL_SHIELD });

  // Edge trim
  g.beginPath();
  g.moveTo(x, y - h * 0.4);
  g.lineTo(x + w * 0.5, y - h * 0.2);
  g.lineTo(x + w * 0.5, y + h * 0.3);
  g.lineTo(x, y + h * 0.5);
  g.lineTo(x - w * 0.5, y + h * 0.3);
  g.lineTo(x - w * 0.5, y - h * 0.2);
  g.closePath();
  g.stroke({ color: COL_SHIELD_EDGE, width: 0.7 });

  // Dark inner field
  poly(g, [
    x, y - h * 0.25,
    x + w * 0.3, y - h * 0.1,
    x + w * 0.3, y + h * 0.2,
    x, y + h * 0.35,
    x - w * 0.3, y + h * 0.2,
    x - w * 0.3, y - h * 0.1,
  ], COL_SHIELD_DK, 0.5);

  // Heraldic device (small star)
  circle(g, x, y, 1.2 * scale, COL_GOLD);
  circle(g, x, y, 0.6 * scale, COL_SHIELD);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.5;
  const gait = frame * 0.04;

  // Shadow
  ellipse(g, 22, GY, 14, 3.5, COL_SHADOW, 0.3);

  const horseBob = Math.sin(gait * Math.PI * 2) * 0.3;
  drawHorse(g, 24, 28, gait, 0);
  drawRider(g, 22, 18 + horseBob, breathe, -Math.PI * 0.35, 0);
  drawShield(g, 14, 22 + horseBob + breathe, 0.85);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.4;
  const horseBob = Math.sin(gait * Math.PI * 2) * 1.8;

  // Shadow
  ellipse(g, 22, GY, 14, 3.5, COL_SHADOW, 0.3);

  drawHorse(g, 24, 28, gait, Math.sin(gait * Math.PI * 2) * 0.25);
  const lAngle = -Math.PI * 0.35 + Math.sin(gait * Math.PI * 2) * 0.06;
  drawRider(g, 22, 18 + horseBob, breathe, lAngle, 0);
  drawShield(g, 14, 22 + horseBob + breathe, 0.85);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to ~1

  // Phases: couch lance (0-0.25), charge (0.25-0.6), impact (0.6-0.75), recover (0.75-1)
  let lanceAngle: number;
  let lanceExt: number;
  let lean: number;

  if (t < 0.25) {
    // Couch lance — lower from upright to horizontal
    const p = t / 0.25;
    lanceAngle = -Math.PI * 0.35 + p * (Math.PI * 0.35 - Math.PI * 0.08);
    lanceExt = 0;
    lean = 0;
  } else if (t < 0.6) {
    // Charge forward — extend lance, lean into it
    const p = (t - 0.25) / 0.35;
    lanceAngle = -Math.PI * 0.08;
    lanceExt = p * 6;
    lean = p * 3;
  } else if (t < 0.75) {
    // Impact — hold at full extension
    lanceAngle = -Math.PI * 0.08;
    lanceExt = 6;
    lean = 3;
  } else {
    // Recover — pull back
    const p = (t - 0.75) / 0.25;
    lanceAngle = -Math.PI * 0.08 - p * 0.25;
    lanceExt = 6 - p * 6;
    lean = 3 - p * 3;
  }

  const horseSurge = Math.sin(t * Math.PI) * 1.5;

  // Shadow
  ellipse(g, 22, GY, 14, 3.5, COL_SHADOW, 0.3);

  drawHorse(g, 24 - lean * 0.3, 28, t * 2, -0.15);
  drawRider(g, 22 - lean, 18 + horseSurge * 0.3, 0, lanceAngle, lanceExt);
  drawShield(g, 14 - lean * 0.5, 22 + horseSurge * 0.3, 0.85);

  // Impact sparks
  if (t > 0.55 && t < 0.8) {
    const sparkAlpha = Math.sin((t - 0.55) / 0.25 * Math.PI) * 0.7;
    for (let i = 0; i < 3; i++) {
      const sx = 2 - i * 2;
      const sy = 16 + i * 2;
      circle(g, sx, sy, 0.8, COL_LANCE_TIP, sparkAlpha);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Lancers don't cast — reuse attack
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallAngle = t * 0.3;
  const slideX = t * 5;
  const dropY = t * t * 10;
  const fade = Math.max(0, 1 - t * 0.6);

  // Shadow (shrinking)
  ellipse(g, 22, GY, 14 * (1 - t * 0.4), 3.5 * (1 - t * 0.4), COL_SHADOW, 0.3 * fade);

  // Horse stumbles and falls
  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 24 + slideX * 0.3, 28 + dropY * 0.4, stumble, fallAngle * 2);
  }

  // Rider falls off
  if (t < 0.95) {
    drawRider(g, 22 + slideX, 18 + dropY, 0, -Math.PI * 0.5 - fallAngle, 0);
  }

  // Lance breaks and falls separately
  if (t > 0.2) {
    const ld = (t - 0.2) * 10;
    line(g, 10 - ld, 20 + dropY, 4 - ld, 16 + dropY, COL_LANCE, 1.5);
    rect(g, 28 + ld, 22 + dropY + ld, 1.5, 5, COL_LANCE);
  }

  // Shield flies off
  if (t > 0.3 && t < 0.9) {
    const sd = (t - 0.3) * 8;
    drawShield(g, 12 - sd, 22 + dropY * 0.5 + sd, 0.7 * (1 - t));
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
 * Generate all lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
