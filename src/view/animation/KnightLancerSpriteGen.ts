// Procedural sprite generator for the Knight Lancer unit type.
//
// Draws a detailed side-view armored lancer on a massive destrier at
// 96×96 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Side-view heavy destrier with plate barding & caparison
//   • Full plate armor with pauldrons, gauntlets, greaves
//   • Great helm with crown-shaped crest and flowing pennant
//   • Long couched lance with vamplate and pennon
//   • Tower shield with heraldic crest on left arm
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

// Palette ─ lancer cavalry (darker, heavier horse than knight)
const COL_PLATE       = 0x7788aa;
const COL_PLATE_HI    = 0x99aacc;
const COL_PLATE_DK    = 0x556678;
const COL_PLATE_EDGE  = 0x445566;
const COL_CHAINMAIL   = 0x6b7b8b;

const COL_HORSE       = 0x2a1e14;
const COL_HORSE_HI    = 0x4a3e34;
const COL_HORSE_DK    = 0x1a1008;
const COL_HORSE_BELLY = 0x3a2e24;
const COL_MANE        = 0x0e0a06;
const COL_HOOF        = 0x1a1610;

const COL_BARDING     = 0x556688;
const COL_BARDING_TRIM = 0xccaa44;

const COL_CAPARISON   = 0x1a3388;
const COL_CAPARISON_TRIM = 0xddaa33;

const COL_SADDLE      = 0x6a3a18;
const COL_SADDLE_DK   = 0x3a2210;
const COL_REINS       = 0x3a2a1a;

const COL_LANCE       = 0x8b7355;
const COL_LANCE_HI    = 0xab9375;
const COL_VAMPLATE    = 0x667799;
const COL_LANCE_TIP   = 0xb0b8c0;
const COL_LANCE_TIP_HI = 0xd0d8e0;

const COL_PENNON      = 0xcc2222;
const COL_PENNON_TRIM = 0xddaa33;

const COL_SHIELD      = 0x1a3388;
const COL_SHIELD_RIM  = 0x997744;
const COL_SHIELD_BOSS = 0xbbaa77;
const COL_CREST       = 0xddaa33;

const COL_CROWN       = 0xddaa33;
const COL_CROWN_GEM   = 0xcc2222;

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
// Horse (side-view, facing left – heavier destrier than knight)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.2;
  const by = oy + bob;

  // ── Legs ──────────────────────────────────────────────────────────────
  const legLen = 15;
  const legW = 3.5;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs (behind barrel)
  const blx = ox + 11;
  rect(g, blx - 1, by + 7, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 7 + legLen + kneeOff2, legW + 1, 3, COL_HOOF);
  rect(g, blx + 4, by + 7, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 4, by + 7 + legLen + kneeOff, legW + 1, 3, COL_HOOF);

  // Front legs
  const flx = ox - 15;
  rect(g, flx - 1, by + 6, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 6 + legLen + kneeOff, legW + 1, 3, COL_HOOF);
  rect(g, flx + 4, by + 6, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 4, by + 6 + legLen + kneeOff2, legW + 1, 3, COL_HOOF);

  // ── Barrel (body) – bigger than knight's horse ───────────────────────
  ellipse(g, ox, by, 22, 11, COL_HORSE);
  ellipse(g, ox, by + 3, 19, 7, COL_HORSE_BELLY);
  ellipse(g, ox, by - 4, 18, 5, COL_HORSE_HI);

  // ── Plate barding (horse armor) ──────────────────────────────────────
  // Crupper (hindquarters armor)
  poly(g, [
    ox + 8, by - 10,
    ox + 20, by - 4,
    ox + 20, by + 6,
    ox + 12, by + 10,
    ox + 6, by + 6,
  ], COL_BARDING, 0.8);
  line(g, ox + 8, by - 10, ox + 20, by - 4, COL_BARDING_TRIM, 1.5);

  // Peytral (chest armor)
  poly(g, [
    ox - 16, by - 6,
    ox - 8, by - 10,
    ox - 4, by - 4,
    ox - 8, by + 6,
    ox - 18, by + 2,
  ], COL_BARDING, 0.8);
  line(g, ox - 16, by - 6, ox - 8, by - 10, COL_BARDING_TRIM, 1.5);

  // ── Caparison (cloth over barding) ───────────────────────────────────
  poly(g, [
    ox - 2, by - 10,
    ox + 8, by - 10,
    ox + 10, by + 8,
    ox - 4, by + 8,
  ], COL_CAPARISON, 0.7);
  line(g, ox - 4, by + 8, ox + 10, by + 8, COL_CAPARISON_TRIM, 1.5);

  // ── Tail ─────────────────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 22;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3.5 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 7, ty + tailSway, tx + 11, ty + 7 + tailSway, tx + 9, ty + 14);
  g.stroke({ color: COL_MANE, width: 2 });
  g.moveTo(tx, ty + 1).bezierCurveTo(tx + 5, ty + tailSway + 2, tx + 9, ty + 9 + tailSway, tx + 7, ty + 16);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 20;
  const ny = by - 8 + tilt * 2;
  poly(g, [
    ox - 16, by - 9,
    nx, ny - 10,
    nx + 7, ny - 13,
    ox - 10, by - 11,
  ], COL_HORSE);
  // Neck barding plate
  poly(g, [
    nx + 2, ny - 11,
    ox - 12, by - 10,
    ox - 14, by - 7,
    nx, ny - 8,
  ], COL_BARDING, 0.7);
  line(g, nx + 2, ny - 11, ox - 12, by - 10, COL_BARDING_TRIM, 1);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 4;
  const hy = ny - 13 + tilt * 2;
  // Chanfron (head armor)
  ellipse(g, hx, hy, 8, 5.5, COL_BARDING);
  // Skull underneath
  ellipse(g, hx - 4, hy + 2, 4, 3, COL_HORSE_HI);
  // Nostril
  circle(g, hx - 7, hy + 2, 1, COL_HORSE_DK);
  // Eye
  circle(g, hx - 1, hy - 2, 1.5, 0x111111);
  circle(g, hx - 1.5, hy - 2.5, 0.5, 0xffffff);
  // Ear
  poly(g, [hx + 3, hy - 5, hx + 2, hy - 10, hx + 5, hy - 6], COL_HORSE_DK);
  // Chanfron spike
  line(g, hx, hy - 5, hx, hy - 9, COL_BARDING_TRIM, 1.5);

  // ── Mane ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 13 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 2;
    line(g, mx, my, mx + maneWave - 2, my + 6, COL_MANE, 2.5);
  }

  // ── Bridle / Reins ───────────────────────────────────────────────────
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle (war saddle with high cantle) ─────────────────────────────
  ellipse(g, ox - 2, by - 11, 9, 3.5, COL_SADDLE);
  rect(g, ox - 12, by - 14, 4, 6, COL_SADDLE_DK); // high pommel
  rect(g, ox + 4, by - 13, 4, 5, COL_SADDLE_DK);  // high cantle
  // Stirrup strap
  line(g, ox - 4, by - 9, ox - 6, by + 5, COL_SADDLE_DK, 1);
  // Stirrup
  rect(g, ox - 8, by + 4, 5, 2, COL_PLATE_DK);
}

// ---------------------------------------------------------------------------
// Rider (armored lancer, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, lanceAngle: number, lanceExt: number): void {
  const rb = breathe;

  // ── Legs (in stirrups) ───────────────────────────────────────────────
  rect(g, ox - 8, oy + 2, 4, 11, COL_PLATE);
  rect(g, ox - 8, oy + 2, 4, 2, COL_PLATE_HI);
  rect(g, ox - 9, oy + 12, 5, 3, COL_PLATE_DK);

  // ── Torso ────────────────────────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 11 + rb;

  // Chainmail undercoat
  rect(g, tx - 5, ty + 9, 12, 3, COL_CHAINMAIL);

  // Breastplate (heavier than knight)
  rect(g, tx - 6, ty, 14, 14, COL_PLATE);
  line(g, tx + 1, ty, tx + 1, ty + 14, COL_PLATE_HI, 1.5);
  rect(g, tx - 5, ty + 1, 12, 2, COL_PLATE_HI);
  rect(g, tx - 5, ty + 10, 12, 2, COL_PLATE_DK);
  // Fauld (wider for lance stance)
  for (let i = 0; i < 4; i++) {
    rect(g, tx - 6 + i * 3.5, ty + 14, 3.5, 3, i % 2 === 0 ? COL_PLATE : COL_PLATE_DK);
  }

  // ── Pauldrons (large, lancer needs shoulder protection) ──────────────
  ellipse(g, tx - 6, ty + 1, 5, 4, COL_PLATE_HI);
  ellipse(g, tx - 6, ty + 1, 4, 3, COL_PLATE);
  // Pauldron ridge
  line(g, tx - 10, ty + 1, tx - 2, ty + 1, COL_PLATE_EDGE, 1);

  ellipse(g, tx + 8, ty + 1, 5, 4, COL_PLATE);
  ellipse(g, tx + 8, ty + 1, 4, 3, COL_PLATE_DK);
  line(g, tx + 4, ty + 1, tx + 12, ty + 1, COL_PLATE_EDGE, 1);

  // ── Shield arm (left) ────────────────────────────────────────────────
  rect(g, tx - 9, ty + 3, 4, 8, COL_PLATE);
  rect(g, tx - 9, ty + 10, 4, 3, COL_PLATE_DK);

  // ── Tower shield ─────────────────────────────────────────────────────
  const sx = tx - 12;
  const sy = ty + 4;
  // Tower shield body (taller than knight's kite shield)
  poly(g, [
    sx, sy - 8,
    sx + 7, sy - 5,
    sx + 7, sy + 7,
    sx, sy + 12,
    sx - 7, sy + 7,
    sx - 7, sy - 5,
  ], COL_SHIELD);
  g.stroke({ color: COL_SHIELD_RIM, width: 1.5 });
  g.poly([sx, sy - 8, sx + 7, sy - 5, sx + 7, sy + 7, sx, sy + 12, sx - 7, sy + 7, sx - 7, sy - 5]);
  g.stroke();
  // Boss
  circle(g, sx, sy + 1, 2.5, COL_SHIELD_BOSS);
  // Heraldic lion rampant (simplified)
  poly(g, [
    sx - 2, sy + 5,
    sx, sy - 3,
    sx + 2, sy + 5,
    sx, sy + 3,
  ], COL_CREST);
  // Crown on crest
  rect(g, sx - 2, sy - 4, 4, 1.5, COL_CREST);

  // ── Lance arm (right – couched under arm) ────────────────────────────
  const armX = tx + 9;
  const armY = ty + 5;
  rect(g, armX - 1, ty + 3, 4, 7, COL_PLATE);
  // Forearm following lance angle
  const faDist = 5;
  const faX = armX + Math.cos(lanceAngle) * faDist;
  const faY = armY + Math.sin(lanceAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_PLATE, 3.5);
  circle(g, faX, faY, 2.5, COL_PLATE_DK);

  // ── Lance ────────────────────────────────────────────────────────────
  // Lance extends forward (left, the direction the horse faces)
  const lLen = 30 + lanceExt;
  const lEndX = faX + Math.cos(lanceAngle) * lLen;
  const lEndY = faY + Math.sin(lanceAngle) * lLen;

  // Shaft (thick wooden lance)
  line(g, faX, faY, lEndX, lEndY, COL_LANCE, 3.5);
  line(g, faX, faY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_HI, 1.5);

  // Vamplate (hand guard cone)
  const vpDist = 4;
  const vpX = faX + Math.cos(lanceAngle) * vpDist;
  const vpY = faY + Math.sin(lanceAngle) * vpDist;
  const vpAngle = lanceAngle + Math.PI / 2;
  poly(g, [
    vpX + Math.cos(vpAngle) * 4, vpY + Math.sin(vpAngle) * 4,
    vpX - Math.cos(vpAngle) * 4, vpY - Math.sin(vpAngle) * 4,
    vpX + Math.cos(lanceAngle) * 3 - Math.cos(vpAngle) * 2, vpY + Math.sin(lanceAngle) * 3 - Math.sin(vpAngle) * 2,
    vpX + Math.cos(lanceAngle) * 3 + Math.cos(vpAngle) * 2, vpY + Math.sin(lanceAngle) * 3 + Math.sin(vpAngle) * 2,
  ], COL_VAMPLATE);

  // Lance tip (steel head)
  const tipStart = lLen - 6;
  const tsX = faX + Math.cos(lanceAngle) * tipStart;
  const tsY = faY + Math.sin(lanceAngle) * tipStart;
  line(g, tsX, tsY, lEndX, lEndY, COL_LANCE_TIP, 3);
  line(g, tsX, tsY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_TIP_HI, 1);
  // Sharp point
  const pointLen = 4;
  const pX = lEndX + Math.cos(lanceAngle) * pointLen;
  const pY = lEndY + Math.sin(lanceAngle) * pointLen;
  line(g, lEndX, lEndY, pX, pY, COL_LANCE_TIP_HI, 2);

  // ── Pennon (small flag near tip) ─────────────────────────────────────
  const penX = tsX;
  const penY = tsY;
  const penWave = Math.sin(breathe * 4 + 2) * 2;
  poly(g, [
    penX, penY,
    penX + Math.sin(lanceAngle) * 6 + penWave, penY - Math.cos(lanceAngle) * 6,
    penX + Math.cos(lanceAngle) * 5 + Math.sin(lanceAngle) * 3 + penWave, penY + Math.sin(lanceAngle) * 5 - Math.cos(lanceAngle) * 3,
  ], COL_PENNON, 0.9);
  line(g, penX, penY,
    penX + Math.sin(lanceAngle) * 6 + penWave, penY - Math.cos(lanceAngle) * 6,
    COL_PENNON_TRIM, 1);

  // ── Butt end (behind rider) ──────────────────────────────────────────
  const buttLen = 10;
  const bX = faX - Math.cos(lanceAngle) * buttLen;
  const bY = faY - Math.sin(lanceAngle) * buttLen;
  line(g, faX, faY, bX, bY, COL_LANCE, 3);
  circle(g, bX, bY, 2, COL_LANCE_HI);

  // ── Head (great helm with crown crest) ───────────────────────────────
  const headX = tx + 1;
  const headY = ty - 8 + rb;

  // Helm body
  ellipse(g, headX, headY, 5.5, 6.5, COL_PLATE);
  // Flat front face
  rect(g, headX - 6, headY - 4, 4, 9, COL_PLATE_DK);
  // Visor slit
  rect(g, headX - 6, headY - 1, 5, 1.5, 0x111111);
  // Breathing holes
  for (let i = 0; i < 3; i++) {
    circle(g, headX - 5, headY + 2 + i * 1.5, 0.4, 0x111111);
  }
  // Helm top ridge
  line(g, headX - 4, headY - 7, headX + 4, headY - 7, COL_PLATE_HI, 1.5);
  // Edge trim
  line(g, headX - 6, headY + 5, headX + 5, headY + 5, COL_PLATE_EDGE, 1);

  // ── Crown crest ──────────────────────────────────────────────────────
  // Gold crown sitting atop the helm
  rect(g, headX - 4, headY - 10, 8, 3, COL_CROWN);
  // Crown points
  for (let i = 0; i < 4; i++) {
    const cx = headX - 3 + i * 2;
    poly(g, [
      cx, headY - 10,
      cx + 1, headY - 14,
      cx + 2, headY - 10,
    ], COL_CROWN);
  }
  // Gem on center point
  circle(g, headX, headY - 13, 1, COL_CROWN_GEM);
  // Crown band detail
  line(g, headX - 4, headY - 9, headX + 4, headY - 9, COL_CROWN_GEM, 0.8);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.35) * 0.7;
  const gait = frame * 0.04;

  // Shadow
  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);

  // Horse
  drawHorse(g, 48, OY + 24, gait, 0);

  // Rider (lance held upright-ish at rest)
  drawRider(g, 44, OY + 13 + Math.sin(gait * Math.PI * 2) * 0.4, breathe, -Math.PI * 0.42, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;

  // Shadow
  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);

  // Horse (heavy trot)
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.25);

  // Rider (lance leveling slightly with movement)
  const lAngle = -Math.PI * 0.42 + Math.sin(gait * Math.PI * 2) * 0.05;
  drawRider(g, 44, OY + 13 + horseBob, breathe, lAngle, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  // Couch lance (0-0.3), charge (0.3-0.7), impact & follow through (0.7-1)
  let lanceAngle: number;
  let lanceExt: number;
  let lean: number;

  if (t < 0.3) {
    // Lower lance from rest to couched position
    const p = t / 0.3;
    lanceAngle = -Math.PI * 0.42 + p * (Math.PI * 0.42 - Math.PI * 0.08);
    lanceExt = 0;
    lean = 0;
  } else if (t < 0.7) {
    // Charge with lance couched horizontal
    const p = (t - 0.3) / 0.4;
    lanceAngle = -Math.PI * 0.08 - p * 0.02;
    lanceExt = p * 6;
    lean = p * 4;
  } else {
    // Impact and pull back
    const p = (t - 0.7) / 0.3;
    lanceAngle = -Math.PI * 0.1 + p * (-Math.PI * 0.15);
    lanceExt = 6 - p * 4;
    lean = 4 - p * 3;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2.5;

  // Shadow
  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);

  // Horse (charging hard)
  drawHorse(g, 48 - lean, OY + 24, t * 3, -0.4);

  // Rider
  drawRider(g, 44 - lean, OY + 13 + horseSurge * 0.4, 0, lanceAngle, lanceExt);
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const fallAngle = t * 0.5;
  const slideX = t * 9;
  const dropY = t * t * 16;
  const fade = Math.max(0, 1 - t * 0.7);

  // Shadow (shrinking)
  ellipse(g, 44, GY, 24 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  // Horse (stumbling)
  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.4, stumble, fallAngle * 2.5);
  }

  // Rider (falling off)
  if (t < 0.95) {
    drawRider(g, 44 + slideX, OY + 13 + dropY, 0, -Math.PI * 0.5 - fallAngle, 0);
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
 * Generate all knight lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateKnightLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
