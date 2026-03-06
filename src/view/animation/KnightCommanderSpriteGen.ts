// Procedural sprite generator for the Knight Commander unit type.
//
// Draws a mounted cavalry healer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Blue/silver plate armor with gold inlay
//   • White flowing cape with gold trim
//   • Brown warhorse with armored barding
//   • Banner/staff in right hand, kite shield on left arm
//   • Healing glow aura on cast frames
//   • Horse legs animate for movement
//   • Rider sits atop horse body

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — noble blue & silver
const COL_ARMOR = 0x4466aa; // blue plate
const COL_ARMOR_HI = 0x6688cc;
const COL_ARMOR_DK = 0x334488;

const COL_SILVER = 0xc0c8d4; // silver trim
const COL_SILVER_HI = 0xdce4f0;
const COL_SILVER_DK = 0x8890a0;

const COL_GOLD = 0xd4a840; // gold accents
const COL_GOLD_DK = 0xb08830;

const COL_CAPE = 0xe8e4dc; // white cape
const COL_CAPE_DK = 0xc0bab0;

const COL_SKIN = 0xd4a882;

const COL_HORSE = 0x6e4830; // brown warhorse
const COL_HORSE_HI = 0x8a6040;
const COL_HORSE_DK = 0x4e3420;
const COL_HORSE_MANE = 0x2a1a10;
const COL_HORSE_BARDING = 0x3a5088; // blue armored barding

const COL_BANNER_CLOTH = 0xe8e0d4;
const COL_BANNER_POLE = 0x887044;
const COL_BANNER_SYMBOL = 0x4466aa;

const COL_SHIELD = 0x4466aa;
const COL_SHIELD_RIM = 0xc0c8d4;
const COL_SHIELD_EMBLEM = 0xd4a840;

const COL_HEAL = 0x66ddaa; // healing glow
const COL_HEAL_HI = 0xaaffcc;

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
  w = 14,
  h = 3,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawHorseLegs(
  g: Graphics,
  cx: number,
  gy: number,
  frontStance: number,
  backStance: number,
): void {
  const legW = 3;
  const legH = 8;
  const baseY = gy - legH;
  // Back legs
  g.rect(cx - 8 + backStance, baseY, legW, legH).fill({ color: COL_HORSE_DK });
  g.rect(cx - 4 + backStance * 0.6, baseY, legW, legH).fill({ color: COL_HORSE_DK });
  // Front legs
  g.rect(cx + 4 + frontStance, baseY, legW, legH).fill({ color: COL_HORSE });
  g.rect(cx + 8 + frontStance * 0.6, baseY, legW, legH).fill({ color: COL_HORSE });
  // Hooves
  g.rect(cx - 8 + backStance, gy - 2, legW + 1, 2).fill({ color: COL_HORSE_DK });
  g.rect(cx - 4 + backStance * 0.6, gy - 2, legW + 1, 2).fill({ color: COL_HORSE_DK });
  g.rect(cx + 4 + frontStance, gy - 2, legW + 1, 2).fill({ color: COL_HORSE_DK });
  g.rect(cx + 8 + frontStance * 0.6, gy - 2, legW + 1, 2).fill({ color: COL_HORSE_DK });
}

function drawHorseBody(
  g: Graphics,
  cx: number,
  bodyY: number,
  tilt = 0,
): void {
  const bw = 24;
  const bh = 10;
  const x = cx - bw / 2 + tilt;
  // Main barrel body
  g.roundRect(x, bodyY, bw, bh, 3)
    .fill({ color: COL_HORSE })
    .stroke({ color: COL_HORSE_DK, width: 0.5 });
  // Belly highlight
  g.roundRect(x + 3, bodyY + bh - 3, bw - 6, 2, 1).fill({ color: COL_HORSE_HI, alpha: 0.3 });
  // Barding armor on horse
  g.roundRect(x + 2, bodyY + 1, bw - 4, 4, 1)
    .fill({ color: COL_HORSE_BARDING, alpha: 0.6 })
    .stroke({ color: COL_ARMOR_DK, width: 0.3 });
  // Barding gold trim
  g.rect(x + 2, bodyY + 1, bw - 4, 1).fill({ color: COL_GOLD, alpha: 0.4 });
}

function drawHorseHead(
  g: Graphics,
  cx: number,
  bodyY: number,
  headBob = 0,
): void {
  const hx = cx + 12;
  const hy = bodyY - 3 + headBob;
  // Neck
  g.moveTo(cx + 8, bodyY + 2)
    .lineTo(hx - 2, hy + 4)
    .stroke({ color: COL_HORSE, width: 5 });
  // Head shape
  g.roundRect(hx - 2, hy, 7, 5, 1)
    .fill({ color: COL_HORSE })
    .stroke({ color: COL_HORSE_DK, width: 0.4 });
  // Eye
  g.circle(hx + 2, hy + 1.5, 0.8).fill({ color: 0x111111 });
  // Nostrils
  g.circle(hx + 4, hy + 3, 0.5).fill({ color: COL_HORSE_DK });
  // Mane
  for (let i = 0; i < 4; i++) {
    const mx = cx + 8 + i * 2;
    const my = bodyY - 2 + i * 0.8 + headBob * 0.5;
    g.moveTo(mx, my).lineTo(mx - 1, my + 3).stroke({ color: COL_HORSE_MANE, width: 1.2 });
  }
  // Armored chanfron
  g.roundRect(hx - 1, hy, 5, 3, 0.5).fill({ color: COL_SILVER, alpha: 0.5 });
}

function drawHorseTail(
  g: Graphics,
  cx: number,
  bodyY: number,
  wave: number,
): void {
  const tx = cx - 13;
  const ty = bodyY + 3;
  g.moveTo(tx, ty)
    .quadraticCurveTo(tx - 4 + wave, ty + 6, tx - 2 + wave * 1.5, ty + 10)
    .stroke({ color: COL_HORSE_MANE, width: 2 });
}

function drawRiderTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 10;
  const x = cx - tw / 2 + tilt;
  // Plate armor body
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.5 });
  // Chest plate highlight
  g.roundRect(x + 1, top + 1, tw - 2, 3, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
  // Gold trim line
  g.rect(x, top + h - 2, tw, 1).fill({ color: COL_GOLD, alpha: 0.6 });
  // Shoulder pauldrons
  g.roundRect(x - 2, top, 4, 3, 1)
    .fill({ color: COL_SILVER })
    .stroke({ color: COL_SILVER_DK, width: 0.3 });
  g.roundRect(x + tw - 2, top, 4, 3, 1)
    .fill({ color: COL_SILVER })
    .stroke({ color: COL_SILVER_DK, width: 0.3 });
}

function drawRiderHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 8;
  const hh = 7;
  const x = cx - hw / 2 + tilt;
  // Helm
  g.roundRect(x, top, hw, hh, 2)
    .fill({ color: COL_SILVER })
    .stroke({ color: COL_SILVER_DK, width: 0.4 });
  // Visor slit
  g.rect(x + 1.5, top + hh * 0.35, hw - 3, 1.5).fill({ color: COL_ARMOR_DK });
  // Helm crest
  g.moveTo(cx + tilt, top - 1)
    .lineTo(cx + tilt - 1, top)
    .lineTo(cx + tilt + 1, top)
    .closePath()
    .fill({ color: COL_GOLD });
  // Plume
  g.moveTo(cx + tilt, top - 1)
    .quadraticCurveTo(cx + tilt - 4, top - 3, cx + tilt - 6, top)
    .stroke({ color: COL_CAPE, width: 1.5 });
  // Face visible through visor
  g.rect(x + 2, top + hh * 0.35 + 0.2, hw - 4, 1).fill({ color: COL_SKIN, alpha: 0.5 });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 12;
  const x = cx - cw / 2;
  // Main cape flow
  g.moveTo(x + 2, capeTop)
    .lineTo(x + cw - 2, capeTop)
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .lineTo(x - wave, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.4 });
  // Gold trim on cape edge
  g.moveTo(x - wave, capeTop + capeH)
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .stroke({ color: COL_GOLD, width: 1 });
  // Inner fold
  g.moveTo(cx, capeTop + 2)
    .lineTo(cx + wave, capeTop + capeH - 1)
    .stroke({ color: COL_CAPE_DK, width: 0.3, alpha: 0.4 });
}

function drawBanner(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  waveT: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const poleLen = 18;
  const tipX = bx + sin * poleLen;
  const tipY = by - cos * poleLen;
  // Pole
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_BANNER_POLE, width: 1.5 });
  // Pole tip ornament
  g.circle(tipX, tipY, 1.5).fill({ color: COL_GOLD });
  // Banner cloth
  const flagW = 7;
  const flagH = 8;
  const flagX = tipX;
  const flagY = tipY + 1;
  const wave = Math.sin(waveT * Math.PI * 2) * 1.5;
  g.moveTo(flagX, flagY)
    .lineTo(flagX + flagW + wave, flagY + 1)
    .lineTo(flagX + flagW + wave * 0.5, flagY + flagH)
    .lineTo(flagX, flagY + flagH - 1)
    .closePath()
    .fill({ color: COL_BANNER_CLOTH })
    .stroke({ color: COL_GOLD_DK, width: 0.4 });
  // Banner symbol
  g.circle(flagX + flagW * 0.5 + wave * 0.3, flagY + flagH * 0.45, 2).fill({
    color: COL_BANNER_SYMBOL,
    alpha: 0.7,
  });
}

function drawShield(
  g: Graphics,
  sx: number,
  sy: number,
  _angle = 0,
): void {
  const sw = 6;
  const sh = 8;
  // Kite shield shape
  g.moveTo(sx, sy - sh / 2)
    .lineTo(sx + sw / 2, sy - sh / 4)
    .lineTo(sx + sw / 2, sy + sh / 4)
    .lineTo(sx, sy + sh / 2)
    .lineTo(sx - sw / 2, sy + sh / 4)
    .lineTo(sx - sw / 2, sy - sh / 4)
    .closePath()
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 0.8 });
  // Emblem cross
  g.rect(sx - 0.5, sy - 2, 1, 4).fill({ color: COL_SHIELD_EMBLEM, alpha: 0.7 });
  g.rect(sx - 2, sy - 0.5, 4, 1).fill({ color: COL_SHIELD_EMBLEM, alpha: 0.7 });
  // Rim highlight
  g.moveTo(sx, sy - sh / 2)
    .lineTo(sx + sw / 2, sy - sh / 4)
    .stroke({ color: COL_SILVER_HI, width: 0.5, alpha: 0.5 });
}

function drawRiderArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ARMOR, width: 3 });
  // Gauntlet
  g.circle(ex, ey, 1.5).fill({ color: COL_SILVER });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const tailWave = Math.sin(t * Math.PI * 2) * 1.5;

  const horseBodyY = GY - 16;
  const riderTop = horseBodyY - 12 + breathe;
  const headTop = riderTop - 8;

  drawShadow(g, CX, GY, 14, 3);
  drawHorseTail(g, CX, horseBodyY, tailWave);
  drawHorseLegs(g, CX, GY, 0, 0);
  drawHorseBody(g, CX, horseBodyY);
  drawHorseHead(g, CX, horseBodyY, breathe * 0.5);
  drawCape(g, CX, riderTop + 2, 14, breathe * 0.3);
  drawRiderTorso(g, CX, riderTop, 9);
  drawRiderHead(g, CX, headTop);

  // Right arm — banner
  const rHandX = CX + 8;
  const rHandY = riderTop + 4;
  drawRiderArm(g, CX + 5, riderTop + 2, rHandX, rHandY);
  drawBanner(g, rHandX, rHandY, 0.1, t);

  // Left arm — shield
  const lHandX = CX - 8;
  const lHandY = riderTop + 5;
  drawRiderArm(g, CX - 5, riderTop + 2, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const gallop = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(gallop) * 1.5;

  const frontStance = Math.round(gallop * 4);
  const backStance = Math.round(-gallop * 4);

  const horseBodyY = GY - 16 - bob * 0.5;
  const riderTop = horseBodyY - 12;
  const headTop = riderTop - 8;

  const tailWave = -gallop * 2.5;
  const capeWave = -gallop * 2;

  drawShadow(g, CX, GY, 14 + Math.abs(gallop) * 2, 3);
  drawHorseTail(g, CX, horseBodyY, tailWave);
  drawHorseLegs(g, CX, GY, frontStance, backStance);
  drawHorseBody(g, CX, horseBodyY, gallop * 0.3);
  drawHorseHead(g, CX, horseBodyY, gallop * 1.5);
  drawCape(g, CX, riderTop + 2, 14, capeWave);
  drawRiderTorso(g, CX, riderTop, 9, gallop * 0.3);
  drawRiderHead(g, CX, headTop, gallop * 0.3);

  // Arms bob with gallop
  const rHandX = CX + 8 + gallop * 0.5;
  const rHandY = riderTop + 4 - bob * 0.3;
  drawRiderArm(g, CX + 5, riderTop + 2, rHandX, rHandY);
  drawBanner(g, rHandX, rHandY, 0.1 + gallop * 0.05, t);

  const lHandX = CX - 8;
  const lHandY = riderTop + 5;
  drawRiderArm(g, CX - 5, riderTop + 2, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const horseBodyY = GY - 16;
  const riderTop = horseBodyY - 12;
  const headTop = riderTop - 8;

  // Horse charges forward
  const charge = t < 0.55 ? t * 6 : (1 - t) * 8;
  const headDip = t < 0.4 ? -t * 3 : (t - 0.4) * 2;

  drawShadow(g, CX + charge * 0.3, GY, 14 + charge, 3);
  drawHorseTail(g, CX, horseBodyY, -charge * 0.3);
  drawHorseLegs(g, CX, GY, charge * 0.5, -charge * 0.3);
  drawHorseBody(g, CX + charge * 0.2, horseBodyY, charge * 0.1);
  drawHorseHead(g, CX + charge * 0.2, horseBodyY, headDip);
  drawCape(g, CX, riderTop + 2, 14, -charge * 0.4);
  drawRiderTorso(g, CX + charge * 0.1, riderTop, 9, charge * 0.15);
  drawRiderHead(g, CX + charge * 0.1, headTop, charge * 0.1);

  // Banner sweeps down as lance
  let bannerAngle: number;
  if (t < 0.25) {
    bannerAngle = lerp(0.1, -0.8, t / 0.25);
  } else if (t < 0.55) {
    bannerAngle = lerp(-0.8, 0.6, (t - 0.25) / 0.3);
  } else {
    bannerAngle = lerp(0.6, 0.1, (t - 0.55) / 0.45);
  }

  const rHandX = CX + 8 + charge;
  const rHandY = riderTop + 3;
  drawRiderArm(g, CX + 5 + charge * 0.1, riderTop + 2, rHandX, rHandY);
  drawBanner(g, rHandX, rHandY, bannerAngle, t * 2);

  // Shield raised
  const shieldRaise = t < 0.4 ? t * 3 : (1 - t) * 2;
  const lHandX = CX - 8;
  const lHandY = riderTop + 4 - shieldRaise;
  drawRiderArm(g, CX - 5, riderTop + 2, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY);

  // Impact flash
  if (t >= 0.35 && t <= 0.55) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.45) / 0.1) * 0.5;
    g.star(rHandX + 6, rHandY - 4, 4, 3, 1.5).fill({ color: 0xffffff, alpha: flashAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const horseBodyY = GY - 16;
  const riderTop = horseBodyY - 12;
  const headTop = riderTop - 8;

  // Healing particles rising
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 4);
    const dist = 6 + intensity * 10 + i * 1.5;
    const px = CX + Math.cos(angle) * dist;
    const py = riderTop + 4 + Math.sin(angle) * dist * 0.3 - t * 8;
    const pAlpha = clamp01(0.2 + pulse * 0.3 - i * 0.02);
    g.circle(px, py, 1.2 + pulse * 0.5).fill({ color: COL_HEAL, alpha: pAlpha });
  }

  // Healing ring expanding
  const ringRadius = 4 + intensity * 14;
  const ringAlpha = clamp01(0.3 - intensity * 0.15) + pulse * 0.1;
  g.circle(CX, riderTop + 6, ringRadius).stroke({ color: COL_HEAL_HI, width: 1.2, alpha: ringAlpha });

  drawShadow(g, CX, GY, 14, 3, 0.3 + intensity * 0.15);
  drawHorseTail(g, CX, horseBodyY, pulse);
  drawHorseLegs(g, CX, GY, 0, 0);
  drawHorseBody(g, CX, horseBodyY);
  drawHorseHead(g, CX, horseBodyY, 0);
  drawCape(g, CX, riderTop + 2, 14, pulse * 0.5);
  drawRiderTorso(g, CX, riderTop, 9);
  drawRiderHead(g, CX, headTop);

  // Banner raised high — channeling
  const raise = intensity * 5;
  const rHandX = CX + 7;
  const rHandY = riderTop + 2 - raise;
  drawRiderArm(g, CX + 5, riderTop + 2, rHandX, rHandY);
  drawBanner(g, rHandX, rHandY, -0.3 + pulse * 0.1, t * 3);

  // Shield arm lowered
  const lHandX = CX - 8;
  const lHandY = riderTop + 6;
  drawRiderArm(g, CX - 5, riderTop + 2, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY);

  // Glow on banner tip
  const glowAlpha = 0.2 + intensity * 0.4 + pulse * 0.2;
  g.circle(rHandX, rHandY - 18, 3 + pulse * 2).fill({ color: COL_HEAL, alpha: glowAlpha * 0.3 });
  g.circle(rHandX, rHandY - 18, 1.5 + pulse).fill({ color: COL_HEAL_HI, alpha: glowAlpha });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const horseBodyY = GY - 16;
  const riderTop = horseBodyY - 12;
  const headTop = riderTop - 8;

  const fallX = t * 8;
  const dropY = t * t * 8;
  const tilt = t * 1.2;

  // Horse stumbles
  const horseLean = t * 3;
  const legBuckle = t * 4;

  drawShadow(g, CX + fallX * 0.3, GY, 14 + t * 4, 3, 0.3 * (1 - t * 0.4));

  if (t < 0.9) {
    drawHorseTail(g, CX, horseBodyY + dropY * 0.5, t * 3);
    drawHorseLegs(g, CX, GY, legBuckle, -legBuckle * 0.5);
    drawHorseBody(g, CX + horseLean, horseBodyY + dropY * 0.3, horseLean);
    drawHorseHead(g, CX + horseLean, horseBodyY + dropY * 0.3, t * 4);
  }

  // Rider falls off
  if (t < 0.8) {
    drawCape(g, CX + fallX * 0.3, riderTop + 2 + dropY, 14 * (1 - t * 0.3), t * 2);
  }
  drawRiderTorso(g, CX + fallX * 0.5, riderTop + dropY, 9 * (1 - t * 0.1), tilt * 3);

  if (t < 0.85) {
    drawRiderHead(g, CX + fallX * 0.5, headTop + dropY * 0.6, tilt * 4);
  }

  // Banner falls away
  if (t < 0.6) {
    const bx = CX + 10 + t * 14;
    const by = riderTop + dropY;
    drawBanner(g, bx, by, 0.3 + t * 4, t);
  }

  // Shield tumbles
  if (t < 0.7) {
    const sx = CX - 10 + fallX * 0.2;
    const sy = riderTop + 6 + dropY * 0.8;
    drawShield(g, sx, sy);
  }

  // Rider arm flopped
  if (t > 0.4) {
    drawRiderArm(
      g,
      CX + fallX * 0.5 + 3,
      riderTop + dropY + 3,
      CX + fallX * 0.5 + 8,
      riderTop + dropY + 8,
    );
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
 * Generate all Knight Commander sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateKnightCommanderFrames(renderer: Renderer): RenderTexture[] {
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
