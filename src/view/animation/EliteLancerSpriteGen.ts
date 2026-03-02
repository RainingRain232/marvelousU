// Procedural sprite generator for the Elite Lancer unit type.
//
// Draws a detailed side-view elite lancer on an armored courser at
// 96×96 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Side-view armored courser with full plate barding & ornate caparison
//   • Gilded plate armor with fluted pauldrons, engraved breastplate, tassets
//   • Closed armet helm with articulated visor and twin feathered plume
//   • War lance with reinforced steel tip, gold vamplate, silk pennon
//   • Heater shield with gold filigree border and lion-rampant crest
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

// Palette ─ elite gilded cavalry
const COL_PLATE       = 0x8896aa;
const COL_PLATE_HI    = 0xb0bcd0;
const COL_PLATE_DK    = 0x5a6878;
const COL_GILT        = 0xccaa44;
const COL_GILT_HI     = 0xeedd66;
const COL_GILT_DK     = 0x997722;
const COL_CHAINMAIL   = 0x6e7e8e;

const COL_HORSE       = 0x3a2c1c;
const COL_HORSE_HI    = 0x5a4c3c;
const COL_HORSE_DK    = 0x221a0e;
const COL_HORSE_BELLY = 0x4a3c2c;
const COL_MANE        = 0x14100a;
const COL_HOOF        = 0x1a1610;

const COL_BARDING     = 0x5a6a88;
const COL_BARDING_HI  = 0x7a8aa8;
const COL_BARDING_TRIM = 0xccaa44;

const COL_CAPARISON   = 0x881122;
const COL_CAPARISON_TRIM = 0xccaa44;

const COL_SADDLE      = 0x5a3018;
const COL_SADDLE_DK   = 0x3a1e0e;
const COL_REINS       = 0x3a2a18;

const COL_LANCE       = 0x7a6040;
const COL_LANCE_HI    = 0x9a8060;
const COL_VAMPLATE    = 0xccaa44;
const COL_LANCE_TIP   = 0xb8c0c8;
const COL_LANCE_TIP_HI = 0xd8e0e8;

const COL_PENNON      = 0x881122;
const COL_PENNON_TRIM = 0xccaa44;

const COL_SHIELD      = 0x223388;
const COL_SHIELD_RIM  = 0xccaa44;
const COL_SHIELD_BOSS = 0xddcc88;
const COL_CREST       = 0xccaa44;

const COL_PLUME       = 0xcc1133;
const COL_PLUME2      = 0xeeeeff;

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
// Horse (side-view, facing left – sleek armored courser)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.3;
  const by = oy + bob;

  // ── Legs ──────────────────────────────────────────────────────────────
  const legLen = 14;
  const legW = 3;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs (draw first – behind body)
  const blx = ox + 10;
  rect(g, blx - 1, by + 7, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 7 + legLen + kneeOff2, legW + 1, 2.5, COL_HOOF);
  // Greave armor on near back leg
  rect(g, blx + 3, by + 7, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 7 + legLen + kneeOff, legW + 1, 2.5, COL_HOOF);
  rect(g, blx + 2.5, by + 7, legW + 1, 5, COL_BARDING, 0.7);

  // Front legs
  const flx = ox - 14;
  rect(g, flx - 1, by + 6, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 6 + legLen + kneeOff, legW + 1, 2.5, COL_HOOF);
  rect(g, flx + 3, by + 6, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 6 + legLen + kneeOff2, legW + 1, 2.5, COL_HOOF);
  // Greave armor on near front leg
  rect(g, flx + 2.5, by + 6, legW + 1, 5, COL_BARDING, 0.7);

  // ── Barrel (body) ────────────────────────────────────────────────────
  ellipse(g, ox, by, 21, 10, COL_HORSE);
  ellipse(g, ox, by + 3, 18, 6, COL_HORSE_BELLY);
  ellipse(g, ox, by - 4, 17, 4, COL_HORSE_HI);

  // ── Full plate barding ───────────────────────────────────────────────
  // Crupper (hindquarters)
  poly(g, [
    ox + 6, by - 9,
    ox + 19, by - 4,
    ox + 19, by + 5,
    ox + 12, by + 9,
    ox + 4, by + 5,
  ], COL_BARDING, 0.85);
  // Barding highlight ridges
  line(g, ox + 8, by - 7, ox + 17, by - 3, COL_BARDING_HI, 1);
  line(g, ox + 6, by - 9, ox + 19, by - 4, COL_BARDING_TRIM, 1.5);
  // Gilt rosette on crupper
  circle(g, ox + 12, by - 1, 2, COL_GILT);
  circle(g, ox + 12, by - 1, 1, COL_GILT_HI);

  // Peytral (chest armor)
  poly(g, [
    ox - 15, by - 7,
    ox - 7, by - 10,
    ox - 3, by - 4,
    ox - 7, by + 6,
    ox - 17, by + 2,
  ], COL_BARDING, 0.85);
  line(g, ox - 13, by - 5, ox - 5, by - 8, COL_BARDING_HI, 1);
  line(g, ox - 15, by - 7, ox - 7, by - 10, COL_BARDING_TRIM, 1.5);
  // Gilt rosette on peytral
  circle(g, ox - 10, by - 2, 2, COL_GILT);
  circle(g, ox - 10, by - 2, 1, COL_GILT_HI);

  // ── Caparison (rich cloth over barding) ──────────────────────────────
  // Drapes from saddle area, flowing
  const capWave = Math.sin(gait * Math.PI * 2 + 0.5) * 1.5;
  poly(g, [
    ox - 1, by - 9,
    ox + 6, by - 9,
    ox + 8, by + 9 + capWave,
    ox - 3, by + 9 + capWave,
  ], COL_CAPARISON, 0.75);
  line(g, ox - 3, by + 9 + capWave, ox + 8, by + 9 + capWave, COL_CAPARISON_TRIM, 1.5);
  // Trim diamond pattern
  for (let i = 0; i < 3; i++) {
    const dy = by + i * 5 - 3;
    poly(g, [ox + 2, dy, ox + 4, dy + 2, ox + 2, dy + 4, ox, dy + 2], COL_CAPARISON_TRIM, 0.7);
  }

  // ── Tail ─────────────────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 21;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 6, ty + tailSway, tx + 10, ty + 7 + tailSway, tx + 8, ty + 14);
  g.stroke({ color: COL_MANE, width: 2 });
  g.moveTo(tx, ty + 1).bezierCurveTo(tx + 4, ty + tailSway + 2, tx + 8, ty + 9 + tailSway, tx + 6, ty + 16);
  // Tail ribbon
  g.stroke({ color: COL_CAPARISON, width: 1 });
  g.moveTo(tx + 2, ty + 4).bezierCurveTo(tx + 5, ty + tailSway + 4, tx + 7, ty + 10 + tailSway, tx + 5, ty + 14);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 19;
  const ny = by - 7 + tilt * 2;
  poly(g, [
    ox - 15, by - 9,
    nx, ny - 10,
    nx + 7, ny - 13,
    ox - 9, by - 11,
  ], COL_HORSE);
  // Crinet (neck barding)
  poly(g, [
    nx + 2, ny - 11,
    ox - 11, by - 10,
    ox - 13, by - 7,
    nx, ny - 8,
  ], COL_BARDING, 0.8);
  line(g, nx + 2, ny - 11, ox - 11, by - 10, COL_BARDING_TRIM, 1.5);
  // Articulated crinet plates
  for (let i = 0; i < 3; i++) {
    const px = nx + 2 + i * 4;
    const py = ny - 10 + i * 1;
    line(g, px, py, px + 1, py + 3, COL_BARDING_HI, 0.8);
  }

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 4;
  const hy = ny - 13 + tilt * 2;
  // Chanfron (ornate head armor)
  ellipse(g, hx, hy, 8, 5.5, COL_BARDING);
  // Gilt chanfron ridge
  line(g, hx - 2, hy - 4, hx + 2, hy - 4, COL_GILT, 1.5);
  line(g, hx, hy - 5, hx, hy + 3, COL_GILT, 1);
  // Muzzle
  ellipse(g, hx - 5, hy + 2, 4, 3, COL_HORSE_HI);
  // Nostril
  circle(g, hx - 7, hy + 2, 1, COL_HORSE_DK);
  // Eye (visible through chanfron opening)
  circle(g, hx - 1, hy - 2, 1.5, 0x111111);
  circle(g, hx - 1.5, hy - 2.5, 0.5, 0xffffff);
  // Ear
  poly(g, [hx + 3, hy - 5, hx + 2, hy - 10, hx + 5, hy - 6], COL_HORSE_DK);
  // Chanfron spike (ornate)
  line(g, hx, hy - 5, hx, hy - 10, COL_GILT, 2);
  circle(g, hx, hy - 10, 1, COL_GILT_HI);

  // ── Mane ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 13 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 2;
    line(g, mx, my, mx + maneWave - 2, my + 6, COL_MANE, 2.5);
  }

  // ── Bridle (ornate with gilt fittings) ───────────────────────────────
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1.2);
  circle(g, hx + 4, hy - 1, 1, COL_GILT); // gilt cheekpiece
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle (high-backed war saddle with gilt trim) ───────────────────
  ellipse(g, ox - 2, by - 11, 9, 3.5, COL_SADDLE);
  rect(g, ox - 12, by - 14, 4, 7, COL_SADDLE_DK);
  rect(g, ox + 4, by - 13, 4, 6, COL_SADDLE_DK);
  // Gilt trim on pommel and cantle
  line(g, ox - 12, by - 14, ox - 8, by - 14, COL_GILT, 1.5);
  line(g, ox + 4, by - 13, ox + 8, by - 13, COL_GILT, 1.5);
  // Stirrup strap
  line(g, ox - 4, by - 9, ox - 6, by + 5, COL_SADDLE_DK, 1);
  // Ornate stirrup
  rect(g, ox - 8, by + 4, 5, 2, COL_GILT_DK);
  line(g, ox - 8, by + 4, ox - 3, by + 4, COL_GILT, 1);
}

// ---------------------------------------------------------------------------
// Rider (elite armored lancer, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, lanceAngle: number, lanceExt: number): void {
  const rb = breathe;

  // ── Legs (in stirrups, with articulated greaves) ─────────────────────
  rect(g, ox - 8, oy + 2, 4, 11, COL_PLATE);
  rect(g, ox - 8, oy + 2, 4, 2, COL_PLATE_HI); // knee cop
  // Gilt knee cop accent
  line(g, ox - 8, oy + 3, ox - 4, oy + 3, COL_GILT, 0.8);
  rect(g, ox - 9, oy + 12, 5, 3, COL_PLATE_DK); // sabaton
  line(g, ox - 9, oy + 12, ox - 4, oy + 12, COL_GILT_DK, 0.8);

  // ── Torso ────────────────────────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 12 + rb;

  // Chainmail peek
  rect(g, tx - 5, ty + 10, 12, 3, COL_CHAINMAIL);

  // Engraved breastplate
  rect(g, tx - 6, ty, 14, 15, COL_PLATE);
  // Center ridge
  line(g, tx + 1, ty, tx + 1, ty + 15, COL_PLATE_HI, 2);
  // Upper highlight
  rect(g, tx - 5, ty + 1, 12, 2, COL_PLATE_HI);
  // Lower shadow
  rect(g, tx - 5, ty + 11, 12, 2, COL_PLATE_DK);
  // Gilt engraving lines on breastplate
  g.stroke({ color: COL_GILT, width: 0.7 });
  g.moveTo(tx - 3, ty + 4).bezierCurveTo(tx, ty + 3, tx + 2, ty + 3, tx + 5, ty + 4);
  g.moveTo(tx - 3, ty + 7).bezierCurveTo(tx, ty + 6, tx + 2, ty + 6, tx + 5, ty + 7);
  // Heraldic emblem on chest (small gilt lion)
  poly(g, [
    tx, ty + 4,
    tx + 2, ty + 6,
    tx, ty + 9,
    tx - 2, ty + 6,
  ], COL_GILT, 0.8);
  circle(g, tx, ty + 6, 1, COL_GILT_HI);

  // Tassets (hip armor plates)
  for (let i = 0; i < 4; i++) {
    const tass = tx - 6 + i * 3.5;
    rect(g, tass, ty + 15, 3.5, 4, i % 2 === 0 ? COL_PLATE : COL_PLATE_DK);
    line(g, tass, ty + 15, tass + 3.5, ty + 15, COL_GILT_DK, 0.5);
  }

  // ── Fluted pauldrons (larger, more ornate) ───────────────────────────
  // Left pauldron (shield side)
  ellipse(g, tx - 7, ty + 1, 6, 4.5, COL_PLATE_HI);
  ellipse(g, tx - 7, ty + 1, 5, 3.5, COL_PLATE);
  // Fluting ridges
  for (let i = 0; i < 3; i++) {
    line(g, tx - 10 + i * 1.5, ty - 2, tx - 10 + i * 1.5, ty + 4, COL_PLATE_HI, 0.6);
  }
  // Gilt pauldron rim
  g.stroke({ color: COL_GILT, width: 1 });
  g.moveTo(tx - 12, ty + 1).bezierCurveTo(tx - 10, ty - 3, tx - 4, ty - 3, tx - 2, ty + 1);
  // Pauldron rosette
  circle(g, tx - 7, ty + 1, 1.5, COL_GILT);

  // Right pauldron (lance side)
  ellipse(g, tx + 9, ty + 1, 6, 4.5, COL_PLATE);
  ellipse(g, tx + 9, ty + 1, 5, 3.5, COL_PLATE_DK);
  for (let i = 0; i < 3; i++) {
    line(g, tx + 6 + i * 1.5, ty - 2, tx + 6 + i * 1.5, ty + 4, COL_PLATE, 0.6);
  }
  g.stroke({ color: COL_GILT, width: 1 });
  g.moveTo(tx + 4, ty + 1).bezierCurveTo(tx + 6, ty - 3, tx + 12, ty - 3, tx + 14, ty + 1);
  circle(g, tx + 9, ty + 1, 1.5, COL_GILT_DK);

  // ── Shield arm (left) ────────────────────────────────────────────────
  rect(g, tx - 10, ty + 4, 4, 8, COL_PLATE);
  // Couter (elbow)
  ellipse(g, tx - 8, ty + 8, 3, 2, COL_PLATE_HI);
  rect(g, tx - 10, ty + 11, 4, 3, COL_PLATE_DK); // gauntlet

  // ── Heater shield (with gilt filigree) ───────────────────────────────
  const sx = tx - 13;
  const sy = ty + 5;
  // Shield body
  poly(g, [
    sx, sy - 8,
    sx + 7, sy - 5,
    sx + 7, sy + 6,
    sx, sy + 12,
    sx - 7, sy + 6,
    sx - 7, sy - 5,
  ], COL_SHIELD);
  // Gilt filigree border
  g.stroke({ color: COL_SHIELD_RIM, width: 2 });
  g.poly([sx, sy - 8, sx + 7, sy - 5, sx + 7, sy + 6, sx, sy + 12, sx - 7, sy + 6, sx - 7, sy - 5]);
  g.stroke();
  // Inner border
  g.stroke({ color: COL_GILT_DK, width: 0.8 });
  g.poly([sx, sy - 6, sx + 5, sy - 4, sx + 5, sy + 5, sx, sy + 10, sx - 5, sy + 5, sx - 5, sy - 4]);
  g.stroke();
  // Boss (ornate)
  circle(g, sx, sy + 1, 3, COL_SHIELD_BOSS);
  circle(g, sx, sy + 1, 2, COL_GILT_HI);
  circle(g, sx, sy + 1, 1, COL_GILT);
  // Lion rampant crest
  poly(g, [
    sx - 2, sy + 6,
    sx, sy - 2,
    sx + 2, sy + 6,
    sx, sy + 4,
  ], COL_CREST);
  // Crown above lion
  rect(g, sx - 2, sy - 3, 4, 1.5, COL_CREST);
  // Filigree scroll corners
  for (const [dx, dy] of [[4, -3], [-4, -3], [4, 4], [-4, 4]]) {
    circle(g, sx + dx, sy + dy, 0.8, COL_GILT, 0.6);
  }

  // ── Lance arm (right – couched under arm) ────────────────────────────
  const armX = tx + 10;
  const armY = ty + 5;
  rect(g, armX - 1, ty + 3, 4, 8, COL_PLATE);
  // Couter
  ellipse(g, armX + 1, ty + 8, 3, 2, COL_PLATE);
  // Forearm
  const faDist = 5;
  const faX = armX + Math.cos(lanceAngle) * faDist;
  const faY = armY + Math.sin(lanceAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_PLATE, 3.5);
  // Articulated gauntlet
  circle(g, faX, faY, 2.5, COL_PLATE_DK);
  circle(g, faX, faY, 1.5, COL_GILT_DK);

  // ── Lance ────────────────────────────────────────────────────────────
  const lLen = 32 + lanceExt;
  const lEndX = faX + Math.cos(lanceAngle) * lLen;
  const lEndY = faY + Math.sin(lanceAngle) * lLen;

  // Shaft
  line(g, faX, faY, lEndX, lEndY, COL_LANCE, 3.5);
  line(g, faX, faY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_HI, 1.5);

  // Gilt vamplate (larger, ornate)
  const vpDist = 4;
  const vpX = faX + Math.cos(lanceAngle) * vpDist;
  const vpY = faY + Math.sin(lanceAngle) * vpDist;
  const vpAngle = lanceAngle + Math.PI / 2;
  poly(g, [
    vpX + Math.cos(vpAngle) * 5, vpY + Math.sin(vpAngle) * 5,
    vpX - Math.cos(vpAngle) * 5, vpY - Math.sin(vpAngle) * 5,
    vpX + Math.cos(lanceAngle) * 4 - Math.cos(vpAngle) * 2.5, vpY + Math.sin(lanceAngle) * 4 - Math.sin(vpAngle) * 2.5,
    vpX + Math.cos(lanceAngle) * 4 + Math.cos(vpAngle) * 2.5, vpY + Math.sin(lanceAngle) * 4 + Math.sin(vpAngle) * 2.5,
  ], COL_VAMPLATE);
  // Vamplate gilt edge
  line(g,
    vpX + Math.cos(vpAngle) * 5, vpY + Math.sin(vpAngle) * 5,
    vpX - Math.cos(vpAngle) * 5, vpY - Math.sin(vpAngle) * 5,
    COL_GILT_HI, 1);

  // Steel tip (reinforced, longer)
  const tipStart = lLen - 8;
  const tsX = faX + Math.cos(lanceAngle) * tipStart;
  const tsY = faY + Math.sin(lanceAngle) * tipStart;
  line(g, tsX, tsY, lEndX, lEndY, COL_LANCE_TIP, 3);
  line(g, tsX, tsY - 0.5, lEndX, lEndY - 0.5, COL_LANCE_TIP_HI, 1.5);
  // Sharp point
  const pointLen = 5;
  const pX = lEndX + Math.cos(lanceAngle) * pointLen;
  const pY = lEndY + Math.sin(lanceAngle) * pointLen;
  line(g, lEndX, lEndY, pX, pY, COL_LANCE_TIP_HI, 2);

  // ── Silk pennon (larger, two-tailed) ─────────────────────────────────
  const penX = tsX;
  const penY = tsY;
  const penWave = Math.sin(breathe * 4 + 2) * 2.5;
  const penWave2 = Math.sin(breathe * 4 + 3) * 2;
  // First tail
  poly(g, [
    penX, penY,
    penX + Math.sin(lanceAngle) * 7 + penWave, penY - Math.cos(lanceAngle) * 7,
    penX + Math.cos(lanceAngle) * 6 + Math.sin(lanceAngle) * 3 + penWave, penY + Math.sin(lanceAngle) * 6 - Math.cos(lanceAngle) * 3,
  ], COL_PENNON, 0.9);
  // Second tail
  poly(g, [
    penX, penY,
    penX + Math.sin(lanceAngle) * 5 + penWave2, penY - Math.cos(lanceAngle) * 5 + 2,
    penX + Math.cos(lanceAngle) * 7 + Math.sin(lanceAngle) * 2 + penWave2, penY + Math.sin(lanceAngle) * 7 - Math.cos(lanceAngle) * 2 + 2,
  ], COL_PENNON, 0.7);
  // Gilt trim
  line(g, penX, penY,
    penX + Math.sin(lanceAngle) * 7 + penWave, penY - Math.cos(lanceAngle) * 7,
    COL_PENNON_TRIM, 1);

  // Butt end
  const buttLen = 10;
  const bX = faX - Math.cos(lanceAngle) * buttLen;
  const bY = faY - Math.sin(lanceAngle) * buttLen;
  line(g, faX, faY, bX, bY, COL_LANCE, 3);
  circle(g, bX, bY, 2, COL_GILT_DK);

  // ── Head (armet helm with articulated visor) ─────────────────────────
  const headX = tx + 1;
  const headY = ty - 8 + rb;

  // Helm body
  ellipse(g, headX, headY, 6, 7, COL_PLATE);
  // Visor (articulated – angled face plate)
  poly(g, [
    headX - 6, headY - 3,
    headX - 3, headY - 5,
    headX - 3, headY + 3,
    headX - 6, headY + 2,
  ], COL_PLATE_DK);
  // Visor breathing slots
  for (let i = 0; i < 4; i++) {
    rect(g, headX - 6, headY - 2 + i * 1.4, 3, 0.6, 0x111111);
  }
  // Visor hinge
  circle(g, headX - 3, headY - 2, 0.8, COL_GILT);
  // Helm ridge
  line(g, headX - 4, headY - 7, headX + 4, headY - 7, COL_PLATE_HI, 2);
  // Gilt helm border
  line(g, headX - 6, headY + 4, headX + 5, headY + 4, COL_GILT, 1);
  // Rondel (side disc)
  circle(g, headX + 4, headY, 2, COL_PLATE_HI);
  circle(g, headX + 4, headY, 1, COL_GILT);

  // ── Twin feathered plume ─────────────────────────────────────────────
  const plumeWave = Math.sin(breathe * 3 + 1) * 2;
  // Red plume
  g.stroke({ color: COL_PLUME, width: 3.5 });
  g.moveTo(headX + 1, headY - 7).bezierCurveTo(
    headX + 7, headY - 16,
    headX + 14 + plumeWave, headY - 18,
    headX + 18 + plumeWave, headY - 14
  );
  // White plume (slightly offset)
  g.stroke({ color: COL_PLUME2, width: 2.5 });
  g.moveTo(headX + 2, headY - 7).bezierCurveTo(
    headX + 8, headY - 14,
    headX + 12 + plumeWave, headY - 16,
    headX + 16 + plumeWave, headY - 12
  );
  // Plume base (gilt holder)
  circle(g, headX + 1, headY - 7, 1.5, COL_GILT);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.35) * 0.7;
  const gait = frame * 0.04;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, 0);
  drawRider(g, 44, OY + 13 + Math.sin(gait * Math.PI * 2) * 0.4, breathe, -Math.PI * 0.4, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.25);
  const lAngle = -Math.PI * 0.4 + Math.sin(gait * Math.PI * 2) * 0.06;
  drawRider(g, 44, OY + 13 + horseBob, breathe, lAngle, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  let lanceAngle: number;
  let lanceExt: number;
  let lean: number;

  if (t < 0.3) {
    const p = t / 0.3;
    lanceAngle = -Math.PI * 0.4 + p * (Math.PI * 0.4 - Math.PI * 0.06);
    lanceExt = 0;
    lean = 0;
  } else if (t < 0.7) {
    const p = (t - 0.3) / 0.4;
    lanceAngle = -Math.PI * 0.06 - p * 0.02;
    lanceExt = p * 8;
    lean = p * 5;
  } else {
    const p = (t - 0.7) / 0.3;
    lanceAngle = -Math.PI * 0.08 + p * (-Math.PI * 0.15);
    lanceExt = 8 - p * 5;
    lean = 5 - p * 4;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2.5;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48 - lean, OY + 24, t * 3, -0.4);
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

  ellipse(g, 44, GY, 24 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.4, stumble, fallAngle * 2.5);
  }

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
 * Generate all elite lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateEliteLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
