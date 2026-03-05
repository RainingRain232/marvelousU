// Procedural sprite generator for the Giant Cavalry unit.
//
// 144x144 pixel frames (3w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A colossal titan rider on an enormous armored warhorse. Heavy plate barding on
// the horse with iron chanfron (horse head armor) with eye slits, caparison cloth
// underneath, armored tail with iron rings. Massive rider in dark plate armor with
// great helm, wielding a huge lance (or heavy mace). Iron-shod hooves, thick
// muscular legs, heavy saddle and stirrups.
// States: IDLE 8, MOVE 8, ATTACK 6, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 144; // 3 tiles wide
const FH = 144; // 3 tiles tall
const CX = FW / 2;
const GY = FH - 6;

// ---------------------------------------------------------------------------
// Palette — dark steel and iron
// ---------------------------------------------------------------------------

const COL_HORSE       = 0x3a2a1a; // dark brown horse
const COL_HORSE_DK    = 0x2a1a0e; // deep shadow
const COL_HORSE_HI    = 0x5a4a3a; // horse highlight
const COL_HORSE_BELLY = 0x4a3a2a; // lighter underbelly
const COL_MANE        = 0x1a1008; // black mane/tail
const COL_HOOF        = 0x1a1610; // dark hoof

const COL_BARDING     = 0x505058; // dark steel barding
const COL_BARDING_HI  = 0x686870; // barding highlight
const COL_BARDING_EDGE = 0x2a2a32; // barding trim edge

const COL_RIDER       = 0x444450; // rider dark iron plate
const COL_RIDER_DK    = 0x2a2a35; // rider armor shadow
const COL_RIDER_HI    = 0x5a5a68; // rider armor highlight
const COL_RIDER_EDGE  = 0x1e1e28; // rider plate edges

const COL_CAPARISON   = 0x661818; // deep red/crimson caparison
const COL_CAPARISON_DK = 0x441010; // caparison shadow
const COL_CAPARISON_HI = 0x882020; // caparison highlight

const COL_LANCE_WOOD  = 0x6e4e30; // lance shaft
const COL_LANCE_DK    = 0x4e3018;
const COL_LANCE_HI    = 0x8a6a46;
const COL_LANCE_TIP   = 0xb0b8c0; // steel tip
const COL_LANCE_TIP_HI = 0xd0d8e0;

const COL_SADDLE      = 0x5a3a18; // leather saddle
const COL_SADDLE_DK   = 0x3a2210;

const COL_CHANFRON    = 0x505058; // horse head armor (matches barding)
const COL_CHANFRON_DK = 0x3a3a42;

const COL_IRON_RING   = 0x555555; // tail armor rings
const COL_IRON_RING_HI = 0x777777;

const COL_EYE_SLIT    = 0xffcc44; // glowing eyes behind helm
const COL_EYE_GLOW    = 0xffdd88;

const COL_SHADOW      = 0x000000;

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

function drawGroundShadow(g: Graphics, cx: number, gy: number, rx = 44, ry = 10, alpha = 0.35): void {
  ellipse(g, cx, gy + 2, rx, ry, COL_SHADOW, alpha);
}

/** Draw the enormous warhorse (side-view, facing left) */
function drawHorse(
  g: Graphics,
  ox: number, oy: number,
  gait: number,
  tilt: number,
): void {
  const bob = Math.sin(gait * Math.PI * 2) * 2;
  const by = oy + bob;

  // ── Legs (thick, muscular, iron-shod) ─────────────────────────────────
  const legLen = 28;
  const legW = 7;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 7;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 7;

  // Back legs (behind barrel)
  const blx = ox + 20;
  rect(g, blx - 2, by + 14, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 2, by + 14 + legLen + kneeOff2, legW + 2, 5, COL_HOOF);
  // Iron shoe
  rect(g, blx - 3, by + 14 + legLen + kneeOff2 + 3, legW + 4, 3, COL_IRON_RING);
  rect(g, blx + 6, by + 14, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 6, by + 14 + legLen + kneeOff, legW + 2, 5, COL_HOOF);
  rect(g, blx + 5, by + 14 + legLen + kneeOff + 3, legW + 4, 3, COL_IRON_RING);

  // Front legs
  const flx = ox - 26;
  rect(g, flx - 2, by + 12, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 2, by + 12 + legLen + kneeOff, legW + 2, 5, COL_HOOF);
  rect(g, flx - 3, by + 12 + legLen + kneeOff + 3, legW + 4, 3, COL_IRON_RING);
  rect(g, flx + 6, by + 12, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 6, by + 12 + legLen + kneeOff2, legW + 2, 5, COL_HOOF);
  rect(g, flx + 5, by + 12 + legLen + kneeOff2 + 3, legW + 4, 3, COL_IRON_RING);

  // ── Barrel (body) — massive ───────────────────────────────────────────
  ellipse(g, ox, by, 38, 18, COL_HORSE);
  ellipse(g, ox, by + 5, 34, 12, COL_HORSE_BELLY);
  ellipse(g, ox, by - 6, 32, 9, COL_HORSE_HI, 0.3);

  // ── Plate barding — heavy steel ───────────────────────────────────────
  // Crupper (hindquarters armor)
  poly(g, [
    ox + 14, by - 16,
    ox + 36, by - 6,
    ox + 36, by + 10,
    ox + 22, by + 16,
    ox + 10, by + 10,
  ], COL_BARDING, 0.85);
  line(g, ox + 14, by - 16, ox + 36, by - 6, COL_BARDING_HI, 2);
  line(g, ox + 10, by + 10, ox + 22, by + 16, COL_BARDING_EDGE, 1.5);

  // Peytral (chest armor)
  poly(g, [
    ox - 28, by - 10,
    ox - 14, by - 16,
    ox - 6, by - 6,
    ox - 14, by + 10,
    ox - 32, by + 4,
  ], COL_BARDING, 0.85);
  line(g, ox - 28, by - 10, ox - 14, by - 16, COL_BARDING_HI, 2);
  line(g, ox - 32, by + 4, ox - 14, by + 10, COL_BARDING_EDGE, 1.5);

  // Flanchards (side armor plates)
  poly(g, [
    ox - 4, by - 16,
    ox + 14, by - 16,
    ox + 16, by + 14,
    ox - 6, by + 14,
  ], COL_BARDING, 0.7);
  // Plate seam lines
  line(g, ox + 5, by - 16, ox + 5, by + 14, COL_BARDING_EDGE, 1);
  // Rivets on barding
  circle(g, ox - 2, by - 8, 1.5, COL_BARDING_HI);
  circle(g, ox + 12, by - 8, 1.5, COL_BARDING_HI);
  circle(g, ox - 2, by + 6, 1.5, COL_BARDING_HI);
  circle(g, ox + 12, by + 6, 1.5, COL_BARDING_HI);

  // ── Caparison (cloth under barding) ───────────────────────────────────
  const capWave = Math.sin(gait * Math.PI * 2 + 0.5) * 2;
  poly(g, [
    ox - 6, by + 12,
    ox + 16, by + 12,
    ox + 18, by + 24 + capWave,
    ox - 8, by + 24 + capWave,
  ], COL_CAPARISON, 0.8);
  // Caparison trim
  line(g, ox - 8, by + 24 + capWave, ox + 18, by + 24 + capWave, COL_CAPARISON_HI, 2);
  // Decorative pattern on caparison
  rect(g, ox - 2, by + 14, 12, 3, COL_CAPARISON_HI, 0.4);
  rect(g, ox, by + 19, 8, 2, COL_CAPARISON_DK, 0.5);

  // ── Tail (armored with iron rings) ────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 4;
  const tx = ox + 38;
  const ty = by - 4;
  g.moveTo(tx, ty).bezierCurveTo(tx + 10, ty + tailSway, tx + 16, ty + 10 + tailSway, tx + 14, ty + 22)
    .stroke({ color: COL_MANE, width: 5 });
  // Iron rings on tail
  for (let i = 0; i < 3; i++) {
    const rt = (i + 1) * 0.25;
    const rx = tx + 10 * rt + 4 * rt;
    const ry = ty + (10 + tailSway) * rt + 2;
    circle(g, rx, ry, 3, COL_IRON_RING);
    circle(g, rx - 0.5, ry - 0.5, 1.5, COL_IRON_RING_HI, 0.4);
  }
  // Tail hair at end
  g.moveTo(tx + 14, ty + 22).bezierCurveTo(tx + 12, ty + 26, tx + 16, ty + 30, tx + 10, ty + 32)
    .stroke({ color: COL_MANE, width: 3 });

  // ── Neck (thick, muscular) ────────────────────────────────────────────
  const nx = ox - 34;
  const ny = by - 14 + tilt * 3;
  poly(g, [
    ox - 28, by - 14,
    nx, ny - 16,
    nx + 12, ny - 20,
    ox - 16, by - 18,
  ], COL_HORSE);
  // Neck barding plate
  poly(g, [
    nx + 4, ny - 17,
    ox - 20, by - 16,
    ox - 24, by - 12,
    nx, ny - 12,
  ], COL_BARDING, 0.75);
  line(g, nx + 4, ny - 17, ox - 20, by - 16, COL_BARDING_HI, 1.5);

  // ── Head (with chanfron / iron head armor) ────────────────────────────
  const hx = nx - 6;
  const hy = ny - 20 + tilt * 3;
  // Chanfron (full plate head armor)
  ellipse(g, hx, hy, 13, 9, COL_CHANFRON);
  ellipse(g, hx, hy, 12, 8, COL_CHANFRON_DK, 0.3);
  // Muzzle underneath
  ellipse(g, hx - 8, hy + 3, 6, 5, COL_HORSE_HI);
  // Chanfron nose ridge
  rect(g, hx - 2, hy - 6, 4, 16, COL_CHANFRON_DK);
  rect(g, hx - 1, hy - 5, 2, 14, COL_BARDING_HI, 0.2);
  // Eye slits in chanfron (glowing)
  rect(g, hx - 8, hy - 1, 5, 2.5, 0x111111);
  rect(g, hx + 3, hy - 1, 5, 2.5, 0x111111);
  rect(g, hx - 7, hy - 0.5, 3, 1.5, COL_EYE_SLIT, 0.7);
  rect(g, hx + 4, hy - 0.5, 3, 1.5, COL_EYE_SLIT, 0.7);
  // Nostril
  circle(g, hx - 12, hy + 4, 1.5, COL_HORSE_DK);
  // Chanfron spike / crest
  line(g, hx, hy - 8, hx, hy - 14, COL_BARDING_HI, 2);
  circle(g, hx, hy - 14, 2, COL_BARDING_HI);
  // Ear guards
  poly(g, [hx + 5, hy - 8, hx + 3, hy - 16, hx + 8, hy - 10], COL_CHANFRON);
  poly(g, [hx - 5, hy - 8, hx - 3, hy - 16, hx - 8, hy - 10], COL_CHANFRON);

  // ── Mane (flowing between armor plates) ───────────────────────────────
  for (let i = 0; i < 8; i++) {
    const mx = nx + 2 + i * 3.5;
    const my = ny - 20 + i * 2;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.6) * 3;
    line(g, mx, my, mx + maneWave - 3, my + 8, COL_MANE, 3);
  }

  // ── Bridle / Reins ────────────────────────────────────────────────────
  line(g, hx - 6, hy + 5, hx + 6, hy - 2, COL_HORSE_DK, 1.5);
  g.moveTo(hx + 6, hy - 2).bezierCurveTo(nx + 10, ny - 6, ox - 24, by - 6, ox - 20, by - 4)
    .stroke({ color: COL_HORSE_DK, width: 1.5 });

  // ── Saddle (heavy war saddle) ─────────────────────────────────────────
  ellipse(g, ox - 4, by - 18, 14, 5, COL_SADDLE);
  rect(g, ox - 20, by - 24, 6, 10, COL_SADDLE_DK); // high pommel
  rect(g, ox + 8, by - 22, 6, 8, COL_SADDLE_DK);   // high cantle
  // Stirrup straps
  line(g, ox - 8, by - 14, ox - 12, by + 8, COL_SADDLE_DK, 1.5);
  line(g, ox + 2, by - 14, ox + 6, by + 8, COL_SADDLE_DK, 1.5);
  // Stirrups (iron)
  rect(g, ox - 14, by + 6, 6, 4, COL_IRON_RING);
  rect(g, ox + 4, by + 6, 6, 4, COL_IRON_RING);
}

/** Draw the massive rider (dark plate armor, great helm, lance) */
function drawRider(
  g: Graphics,
  ox: number, oy: number,
  breathe: number,
  lanceAngle: number,
  lanceExt: number,
): void {
  const rb = breathe;

  // ── Legs (in stirrups, armored) ───────────────────────────────────────
  rect(g, ox - 14, oy + 4, 7, 18, COL_RIDER);
  rect(g, ox - 14, oy + 4, 7, 3, COL_RIDER_HI, 0.3);
  rect(g, ox - 15, oy + 20, 8, 5, COL_RIDER_DK);
  // Right leg
  rect(g, ox + 4, oy + 4, 7, 18, COL_RIDER);
  rect(g, ox + 4, oy + 4, 7, 3, COL_RIDER_HI, 0.3);
  rect(g, ox + 3, oy + 20, 8, 5, COL_RIDER_DK);

  // ── Torso (massive dark plate) ────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 20 + rb;

  // Chainmail undercoat visible at waist
  rect(g, tx - 10, ty + 18, 22, 5, 0x4a4a54);

  // Breastplate (heavy, wide)
  rect(g, tx - 12, ty, 26, 24, COL_RIDER);
  // Center plate seam
  line(g, tx + 1, ty + 2, tx + 1, ty + 22, COL_RIDER_HI, 2);
  // Plate highlights
  rect(g, tx - 10, ty + 2, 22, 3, COL_RIDER_HI, 0.2);
  // Plate shadow
  rect(g, tx - 10, ty + 18, 22, 3, COL_RIDER_DK, 0.4);
  // Horizontal plate lines
  line(g, tx - 12, ty + 8, tx + 14, ty + 8, COL_RIDER_EDGE, 1);
  line(g, tx - 12, ty + 16, tx + 14, ty + 16, COL_RIDER_EDGE, 1);
  // Fauld (waist plates)
  for (let i = 0; i < 5; i++) {
    rect(g, tx - 12 + i * 5.2, ty + 24, 5.2, 5, i % 2 === 0 ? COL_RIDER : COL_RIDER_DK);
  }
  // Rivets
  circle(g, tx - 8, ty + 8, 1.5, COL_RIDER_HI);
  circle(g, tx + 10, ty + 8, 1.5, COL_RIDER_HI);

  // ── Pauldrons (massive shoulder plates) ───────────────────────────────
  // Left pauldron
  ellipse(g, tx - 12, ty + 2, 9, 7, COL_RIDER_HI);
  ellipse(g, tx - 12, ty + 2, 8, 6, COL_RIDER);
  line(g, tx - 20, ty + 2, tx - 4, ty + 2, COL_RIDER_EDGE, 1.5);
  circle(g, tx - 16, ty + 2, 1.2, COL_RIDER_HI);
  circle(g, tx - 8, ty + 2, 1.2, COL_RIDER_HI);

  // Right pauldron
  ellipse(g, tx + 14, ty + 2, 9, 7, COL_RIDER);
  ellipse(g, tx + 14, ty + 2, 8, 6, COL_RIDER_DK);
  line(g, tx + 6, ty + 2, tx + 22, ty + 2, COL_RIDER_EDGE, 1.5);
  circle(g, tx + 10, ty + 2, 1.2, COL_RIDER_HI);
  circle(g, tx + 18, ty + 2, 1.2, COL_RIDER_HI);

  // ── Shield arm (left) ─────────────────────────────────────────────────
  rect(g, tx - 16, ty + 6, 6, 14, COL_RIDER);
  rect(g, tx - 16, ty + 18, 6, 5, COL_RIDER_DK);
  // Gauntlet
  circle(g, tx - 13, ty + 22, 4, COL_RIDER_DK);

  // ── Lance arm (right) ─────────────────────────────────────────────────
  const armX = tx + 16;
  const armY = ty + 8;
  rect(g, armX - 2, ty + 6, 6, 12, COL_RIDER);
  // Forearm following lance angle
  const faDist = 8;
  const faX = armX + Math.cos(lanceAngle) * faDist;
  const faY = armY + Math.sin(lanceAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_RIDER, 5);
  circle(g, faX, faY, 4, COL_RIDER_DK);

  // ── Lance (enormous) ──────────────────────────────────────────────────
  const lLen = 50 + lanceExt;
  const lEndX = faX + Math.cos(lanceAngle) * lLen;
  const lEndY = faY + Math.sin(lanceAngle) * lLen;

  // Shaft (thick wooden lance)
  line(g, faX, faY, lEndX, lEndY, COL_LANCE_WOOD, 5);
  line(g, faX, faY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_HI, 2);

  // Vamplate (hand guard cone)
  const vpDist = 6;
  const vpX = faX + Math.cos(lanceAngle) * vpDist;
  const vpY = faY + Math.sin(lanceAngle) * vpDist;
  const vpAngle = lanceAngle + Math.PI / 2;
  poly(g, [
    vpX + Math.cos(vpAngle) * 6, vpY + Math.sin(vpAngle) * 6,
    vpX - Math.cos(vpAngle) * 6, vpY - Math.sin(vpAngle) * 6,
    vpX + Math.cos(lanceAngle) * 5 - Math.cos(vpAngle) * 3, vpY + Math.sin(lanceAngle) * 5 - Math.sin(vpAngle) * 3,
    vpX + Math.cos(lanceAngle) * 5 + Math.cos(vpAngle) * 3, vpY + Math.sin(lanceAngle) * 5 + Math.sin(vpAngle) * 3,
  ], COL_BARDING);

  // Lance tip (steel head)
  const tipStart = lLen - 10;
  const tsX = faX + Math.cos(lanceAngle) * tipStart;
  const tsY = faY + Math.sin(lanceAngle) * tipStart;
  line(g, tsX, tsY, lEndX, lEndY, COL_LANCE_TIP, 4.5);
  line(g, tsX, tsY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_TIP_HI, 1.5);
  // Sharp point
  const pointLen = 6;
  const pX = lEndX + Math.cos(lanceAngle) * pointLen;
  const pY = lEndY + Math.sin(lanceAngle) * pointLen;
  line(g, lEndX, lEndY, pX, pY, COL_LANCE_TIP_HI, 2.5);

  // Butt end (behind rider)
  const buttLen = 14;
  const bX = faX - Math.cos(lanceAngle) * buttLen;
  const bY = faY - Math.sin(lanceAngle) * buttLen;
  line(g, faX, faY, bX, bY, COL_LANCE_WOOD, 4);
  circle(g, bX, bY, 3, COL_LANCE_DK);

  // ── Head (great helm with glowing eye slits) ──────────────────────────
  const headX = tx + 1;
  const headY = ty - 14 + rb;

  // Great helm body
  ellipse(g, headX, headY, 10, 11, COL_RIDER);
  // Flat front face
  rect(g, headX - 11, headY - 6, 6, 14, COL_RIDER_DK);
  // Eye slits (glowing)
  rect(g, headX - 10, headY - 2, 8, 2.5, 0x111111);
  rect(g, headX - 9, headY - 1.5, 6, 1.5, COL_EYE_SLIT, 0.8);
  // Eye glow
  ellipse(g, headX - 6, headY - 1, 5, 2.5, COL_EYE_GLOW, 0.2);
  // Breathing holes
  for (let i = 0; i < 4; i++) {
    circle(g, headX - 9, headY + 3 + i * 2, 0.6, 0x111111);
  }
  // Helm ridge on top
  line(g, headX - 6, headY - 12, headX + 8, headY - 12, COL_RIDER_HI, 2);
  // Helm crest (iron fin)
  rect(g, headX - 1, headY - 18, 2.5, 10, COL_RIDER_DK);
  rect(g, headX - 0.5, headY - 18, 1.5, 10, COL_RIDER_HI, 0.3);
  // Chin guard
  poly(g, [headX - 8, headY + 6, headX + 8, headY + 6, headX + 5, headY + 12, headX - 5, headY + 12], COL_RIDER_DK);
  // Edge trim
  line(g, headX - 8, headY + 8, headX + 8, headY + 8, COL_RIDER_EDGE, 1);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.35) * 0.8;
  const gait = frame * 0.04;

  const horseOx = CX + 4;
  const horseOy = GY - 48;

  // Shadow
  drawGroundShadow(g, CX, GY);

  // Horse
  drawHorse(g, horseOx, horseOy, gait, 0);

  // Rider (lance held angled upward at rest)
  const riderOx = horseOx - 8;
  const riderOy = horseOy - 30 + Math.sin(gait * Math.PI * 2) * 0.5;
  drawRider(g, riderOx, riderOy, breathe, -Math.PI * 0.42, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 3;

  const horseOx = CX + 4;
  const horseOy = GY - 48;

  // Shadow
  drawGroundShadow(g, CX, GY, 44, 10);

  // Horse (heavy gallop)
  drawHorse(g, horseOx, horseOy, gait, Math.sin(gait * Math.PI * 2) * 0.3);

  // Rider (lance leveling slightly with movement)
  const lAngle = -Math.PI * 0.42 + Math.sin(gait * Math.PI * 2) * 0.06;
  const riderOx = horseOx - 8;
  const riderOy = horseOy - 30 + horseBob;
  drawRider(g, riderOx, riderOy, breathe, lAngle, 0);

  // Dust from hooves
  if (Math.abs(Math.sin(gait * Math.PI * 2)) > 0.8) {
    for (let i = 0; i < 4; i++) {
      const dx = horseOx + 20 + i * 6;
      const dy = GY - 2 - i * 2;
      circle(g, dx, dy, 3 - i * 0.5, COL_SHADOW, 0.1);
    }
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 5; // 0..1 over 6 frames

  // Phases: couch lance (0-0.25), charge (0.25-0.65), impact (0.65-0.85), recovery (0.85-1)
  let lanceAngle: number;
  let lanceExt: number;
  let lean: number;

  if (t < 0.25) {
    // Lower lance from rest to couched horizontal
    const p = t / 0.25;
    lanceAngle = -Math.PI * 0.42 + p * (Math.PI * 0.42 - Math.PI * 0.06);
    lanceExt = 0;
    lean = 0;
  } else if (t < 0.65) {
    // Charge with lance couched
    const p = (t - 0.25) / 0.4;
    lanceAngle = -Math.PI * 0.06 - p * 0.03;
    lanceExt = p * 10;
    lean = p * 6;
  } else if (t < 0.85) {
    // Impact and crunch
    const p = (t - 0.65) / 0.2;
    lanceAngle = -Math.PI * 0.09 + p * (-Math.PI * 0.12);
    lanceExt = 10 - p * 6;
    lean = 6 - p * 2;
  } else {
    // Recovery
    const p = (t - 0.85) / 0.15;
    lanceAngle = -Math.PI * 0.21 + p * (-Math.PI * 0.21);
    lanceExt = 4 - p * 4;
    lean = 4 - p * 4;
  }

  const horseSurge = Math.sin(t * Math.PI) * 3;
  const horseOx = CX + 4;
  const horseOy = GY - 48;

  // Shadow (wider during charge)
  drawGroundShadow(g, CX, GY, 44 + Math.abs(lean) * 2, 10);

  // Horse (charging hard)
  drawHorse(g, horseOx - lean, horseOy, t * 3, -0.5);

  // Rider
  const riderOx = horseOx - 8 - lean;
  const riderOy = horseOy - 30 + horseSurge * 0.5;
  drawRider(g, riderOx, riderOy, 0, lanceAngle, lanceExt);

  // Impact flash at lance tip
  if (t >= 0.6 && t <= 0.85) {
    const impactT = 1 - Math.abs(t - 0.72) / 0.13;
    if (impactT > 0) {
      const faX = riderOx + 14 + Math.cos(lanceAngle) * 8;
      const faY = riderOy - 12 + Math.sin(lanceAngle) * 8;
      const tipX = faX + Math.cos(lanceAngle) * (50 + lanceExt + 6);
      const tipY = faY + Math.sin(lanceAngle) * (50 + lanceExt + 6);
      circle(g, tipX, tipY, 10, 0xffffff, impactT * 0.3);
      circle(g, tipX, tipY, 6, COL_EYE_SLIT, impactT * 0.4);
      // Sparks
      for (let i = 0; i < 5; i++) {
        const sa = (i / 5) * Math.PI * 2 + t * 4;
        const sd = 6 + i * 3;
        circle(g, tipX + Math.cos(sa) * sd, tipY + Math.sin(sa) * sd, 1.5, COL_EYE_SLIT, impactT * 0.5);
      }
    }
  }

  // Dust trail
  for (let i = 0; i < 5; i++) {
    const dx = horseOx + 30 + i * 7;
    const dy = GY - 1 - i * 1.5;
    circle(g, dx, dy, 3.5 - i * 0.5, COL_SHADOW, t * 0.12);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Same as attack animation for mounted cavalry
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: horse rearing then collapsing, rider thrown
  const t = frame / 6; // 0..1 over 7 frames

  const horseOx = CX + 4;
  const horseOy = GY - 48;

  const fallAngle = t * 0.6;
  const slideX = t * 14;
  const dropY = t * t * 22;
  const fade = Math.max(0, 1 - t * 0.6);

  // Shadow (shrinking and shifting)
  drawGroundShadow(g, CX + slideX * 0.2, GY, 44 * (1 - t * 0.4), 10 * (1 - t * 0.4), 0.35 * fade);

  // Horse (rearing then stumbling)
  if (t < 0.8) {
    const rearUp = t < 0.3 ? (t / 0.3) * 8 : 8 - ((t - 0.3) / 0.5) * 14;
    const stumble = t * 3;
    drawHorse(
      g,
      horseOx + slideX * 0.3,
      horseOy + dropY * 0.4 - Math.max(0, rearUp),
      stumble,
      fallAngle * 3,
    );
  }

  // Rider (thrown from horse)
  if (t < 0.9) {
    const riderFlyX = t > 0.3 ? (t - 0.3) * 30 : 0;
    const riderFlyY = t > 0.3 ? (t - 0.3) * (t - 0.3) * 40 : 0;
    const riderSpin = t > 0.3 ? (t - 0.3) * 4 : 0;
    drawRider(
      g,
      horseOx - 8 + slideX - riderFlyX,
      horseOy - 30 + dropY * 0.2 + riderFlyY,
      0,
      -Math.PI * 0.5 - riderSpin,
      0,
    );
  }

  // Dust cloud on impact
  if (t > 0.5) {
    const dustT = (t - 0.5) / 0.5;
    const dustAlpha = (1 - dustT) * 0.25;
    for (let i = 0; i < 6; i++) {
      const dx = CX + slideX * 0.3 + (i - 3) * 10;
      const dy = GY - 3 - dustT * 10;
      circle(g, dx, dy, 6 + dustT * 5, COL_SHADOW, dustAlpha);
    }
  }

  // Metal scraping sparks
  if (t > 0.55 && t < 0.85) {
    const sparkT = (t - 0.55) / 0.3;
    for (let i = 0; i < 5; i++) {
      const sx = CX + slideX * 0.3 + (i - 2) * 12;
      const sy = GY - 4 - sparkT * 8 * ((i % 2) + 1);
      circle(g, sx, sy, 2, COL_EYE_SLIT, (1 - sparkT) * 0.5);
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
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

export function generateGiantCavalryFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
