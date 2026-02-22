// Procedural sprite generator for mage unit types.
//
// Generic: all drawing functions accept a MagePalette so the same animations
// can be recoloured for each mage variant (storm, fire, summoner, cold, distortion).
//
// Draws at 48×48 pixels per frame using PixiJS Graphics → RenderTexture.
// States: IDLE 8 frames, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Shared non-palette colors
const COL_SKIN       = 0xd4a574;
const COL_SKIN_DK    = 0xb8875a;
const COL_BEARD      = 0xaaaaaa;
const COL_BEARD_DK   = 0x888888;
const COL_STAFF_WOOD = 0x8b5a2b;
const COL_STAFF_DK   = 0x5d3d1d;
const COL_SHOE       = 0x6b4226;
const COL_SHOE_DK    = 0x4a2e1a;
const COL_EYE        = 0x222244;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// MagePalette — colours that vary per mage type
// ---------------------------------------------------------------------------

export interface MagePalette {
  /** Main robe color */
  robe: number;
  /** Darker robe shade (outlines, shadows) */
  robeDk: number;
  /** Lighter robe highlight */
  robeHi: number;
  /** Hat main color */
  hat: number;
  /** Darker hat shade */
  hatDk: number;
  /** Hat band / belt color */
  hatBand: number;
  /** Spell FX primary color (hand glow, eye flash, bolt glow) */
  magic: number;
  /** Spell FX bright/white highlight */
  magicHi: number;
}

// ---------------------------------------------------------------------------
// Built-in palettes
// ---------------------------------------------------------------------------

export const PALETTE_STORM_MAGE: MagePalette = {
  robe:    0x2244aa,
  robeDk:  0x1a3388,
  robeHi:  0x3366cc,
  hat:     0x1e3a8a,
  hatDk:   0x142866,
  hatBand: 0xffd700,
  magic:   0x88ccff,
  magicHi: 0xeeffff,
};

export const PALETTE_FIRE_MAGE: MagePalette = {
  robe:    0xaa2222,
  robeDk:  0x881a1a,
  robeHi:  0xcc4444,
  hat:     0x8a1e1e,
  hatDk:   0x661414,
  hatBand: 0xffaa00,
  magic:   0xff8844,
  magicHi: 0xffeecc,
};

export const PALETTE_SUMMONER: MagePalette = {
  robe:    0x7722aa,
  robeDk:  0x551888,
  robeHi:  0x9944cc,
  hat:     0x5e1a8a,
  hatDk:   0x421266,
  hatBand: 0xddaaff,
  magic:   0xcc99ff,
  magicHi: 0xeeddff,
};

export const PALETTE_COLD_MAGE: MagePalette = {
  robe:    0x2288aa,
  robeDk:  0x186688,
  robeHi:  0x44aacc,
  hat:     0x1e6a8a,
  hatDk:   0x144e66,
  hatBand: 0xaaddff,
  magic:   0x88ddff,
  magicHi: 0xeeffff,
};

export const PALETTE_DISTORTION_MAGE: MagePalette = {
  robe:    0x8822aa,
  robeDk:  0x661888,
  robeHi:  0xaa44cc,
  hat:     0x6e1a8a,
  hatDk:   0x4e1266,
  hatBand: 0xff88dd,
  magic:   0xff66cc,
  magicHi: 0xffddee,
};

export const PALETTE_CLERIC: MagePalette = {
  robe:    0x228844,
  robeDk:  0x186633,
  robeHi:  0x44aa66,
  hat:     0x1e6a38,
  hatDk:   0x144e28,
  hatBand: 0xaaffcc,
  magic:   0x88ffaa,
  magicHi: 0xeeffee,
};

export const PALETTE_SAINT: MagePalette = {
  robe:    0xddaa22,
  robeDk:  0xbb8811,
  robeHi:  0xeecc55,
  hat:     0xbb9011,
  hatDk:   0x997008,
  hatBand: 0xffeebb,
  magic:   0xffee88,
  magicHi: 0xfffff0,
};

export const PALETTE_MONK: MagePalette = {
  robe:    0xdddddd,
  robeDk:  0xaaaaaa,
  robeHi:  0xf5f5f5,
  hat:     0xbbbbbb,
  hatDk:   0x999999,
  hatBand: 0xcc9966,
  magic:   0xffffff,
  magicHi: 0xeeeeff,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines (palette-aware)
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3.5): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawShoes(
  g: Graphics, cx: number, gy: number,
  stanceL: number, stanceR: number, squash = 0,
): void {
  const bh = 4 - squash;
  g.moveTo(cx - 7 + stanceL, gy)
    .lineTo(cx - 7 + stanceL, gy - bh)
    .lineTo(cx - 2 + stanceL, gy - bh)
    .lineTo(cx + 0 + stanceL, gy - bh - 2)
    .lineTo(cx + 0 + stanceL, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
  g.moveTo(cx + 1 + stanceR, gy)
    .lineTo(cx + 1 + stanceR, gy - bh)
    .lineTo(cx + 6 + stanceR, gy - bh)
    .lineTo(cx + 8 + stanceR, gy - bh - 2)
    .lineTo(cx + 8 + stanceR, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
}

function drawRobe(
  g: Graphics, p: MagePalette, cx: number,
  robeTop: number, robeH: number,
  tilt = 0, wave = 0,
): void {
  const topW = 12;
  const botW = 18 + wave;
  const x = cx + tilt;
  g.moveTo(x - topW / 2, robeTop)
    .lineTo(x + topW / 2, robeTop)
    .lineTo(x + botW / 2 + wave * 0.5, robeTop + robeH)
    .lineTo(x - botW / 2 + wave * 0.3, robeTop + robeH)
    .closePath()
    .fill({ color: p.robe })
    .stroke({ color: p.robeDk, width: 0.7 });
  g.moveTo(x - botW / 2 + wave * 0.3, robeTop + robeH - 2)
    .lineTo(x + botW / 2 + wave * 0.5, robeTop + robeH - 2)
    .stroke({ color: p.robeHi, width: 1, alpha: 0.5 });
  g.rect(x - topW / 2 + 1, robeTop + 7, topW - 2, 2)
    .fill({ color: p.hatBand, alpha: 0.7 });
}

function drawTorso(
  g: Graphics, p: MagePalette, cx: number,
  torsoTop: number, torsoH: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: p.robe })
    .stroke({ color: p.robeDk, width: 0.5 });
}

function drawHat(
  g: Graphics, p: MagePalette, cx: number, hatBase: number,
  tilt = 0, droop = 0,
): void {
  const x = cx + tilt;
  const brimW = 14;
  const hatH = 14;
  g.ellipse(x, hatBase, brimW / 2, 2.5)
    .fill({ color: p.hat })
    .stroke({ color: p.hatDk, width: 0.5 });
  g.moveTo(x - 5, hatBase - 1)
    .lineTo(x + 5, hatBase - 1)
    .lineTo(x + 3 + droop, hatBase - hatH)
    .lineTo(x - 1, hatBase - 1)
    .closePath()
    .fill({ color: p.hat })
    .stroke({ color: p.hatDk, width: 0.5 });
  g.rect(x - 5, hatBase - 3, 10, 2).fill({ color: p.hatBand });
  g.moveTo(x - 1, hatBase - 2)
    .lineTo(x + 2 + droop * 0.5, hatBase - hatH + 2)
    .stroke({ color: p.robeHi, width: 0.8, alpha: 0.4 });
}

function drawFace(
  g: Graphics, p: MagePalette, cx: number, faceY: number,
  tilt = 0, glowEyes = false,
): void {
  const x = cx + tilt;
  g.circle(x, faceY, 5).fill({ color: COL_SKIN });
  const eyeCol = glowEyes ? p.magicHi : COL_EYE;
  g.circle(x - 2, faceY - 1, 0.8).fill({ color: eyeCol });
  g.circle(x + 2, faceY - 1, 0.8).fill({ color: eyeCol });
  if (glowEyes) {
    g.circle(x - 2, faceY - 1, 2).fill({ color: p.magic, alpha: 0.3 });
    g.circle(x + 2, faceY - 1, 2).fill({ color: p.magic, alpha: 0.3 });
  }
  g.circle(x, faceY + 0.5, 0.5).fill({ color: COL_SKIN_DK });
}

function drawBeard(
  g: Graphics, cx: number, beardTop: number,
  beardLen: number, tilt = 0, wave = 0,
): void {
  const x = cx + tilt;
  g.moveTo(x - 3, beardTop)
    .lineTo(x + 3, beardTop)
    .lineTo(x + 2 + wave, beardTop + beardLen)
    .lineTo(x + wave * 0.5, beardTop + beardLen + 2)
    .lineTo(x - 2 + wave * 0.3, beardTop + beardLen)
    .closePath()
    .fill({ color: COL_BEARD })
    .stroke({ color: COL_BEARD_DK, width: 0.4 });
  for (let i = 2; i < beardLen; i += 3) {
    g.moveTo(x - 2, beardTop + i)
      .lineTo(x + 2, beardTop + i)
      .stroke({ color: COL_BEARD_DK, width: 0.3, alpha: 0.4 });
  }
}

function drawStaff(
  g: Graphics,
  baseX: number, baseY: number,
  topX: number, topY: number,
  crookDir = 1,
): void {
  g.moveTo(baseX, baseY).lineTo(topX, topY).stroke({ color: COL_STAFF_WOOD, width: 2.5 });
  g.moveTo(baseX + 0.5, baseY).lineTo(topX + 0.5, topY).stroke({ color: COL_STAFF_DK, width: 0.5, alpha: 0.5 });
  const hookLen = 5;
  g.moveTo(topX, topY)
    .quadraticCurveTo(topX + crookDir * 4, topY - 3, topX + crookDir * hookLen, topY + 1)
    .stroke({ color: COL_STAFF_WOOD, width: 2 });
  g.circle(topX + crookDir * hookLen, topY + 1, 1.5).fill({ color: COL_STAFF_DK });
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 2.5 });
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

function drawSpellBolt(
  g: Graphics, p: MagePalette,
  x1: number, y1: number,
  x2: number, y2: number,
  segments = 4,
  alpha = 0.8,
): void {
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  g.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    g.lineTo(x1 + dx * i + (Math.random() - 0.5) * 6, y1 + dy * i + (Math.random() - 0.5) * 4);
  }
  g.lineTo(x2, y2);
  g.stroke({ color: p.magicHi, width: 1.5, alpha });
  g.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    g.lineTo(x1 + dx * i + (Math.random() - 0.5) * 8, y1 + dy * i + (Math.random() - 0.5) * 5);
  }
  g.lineTo(x2, y2);
  g.stroke({ color: p.magic, width: 3, alpha: alpha * 0.3 });
}

function drawHandGlow(g: Graphics, p: MagePalette, hx: number, hy: number, intensity = 1): void {
  g.circle(hx, hy, 3 * intensity).fill({ color: p.magic, alpha: 0.25 });
  g.circle(hx, hy, 1.5 * intensity).fill({ color: p.magicHi, alpha: 0.4 });
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    g.moveTo(hx, hy)
      .lineTo(hx + Math.cos(angle) * r, hy + Math.sin(angle) * r)
      .stroke({ color: p.magicHi, width: 0.6, alpha: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state (palette-aware)
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, p: MagePalette, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);
  const slump = 2;
  const robeH = 18;
  const robeTop = GY - robeH - 2 + bob;
  const torsoTop = robeTop - 4 + bob;
  const faceY = torsoTop - 3 + bob;
  const hatBase = faceY - 4 + bob;

  drawShadow(g, CX, GY);
  drawRobe(g, p, CX, robeTop, robeH, slump, t * 0.5 - 0.25);
  drawShoes(g, CX, GY, 0, 0);
  drawTorso(g, p, CX, torsoTop, 6, slump);

  const staffBaseX = CX + 8;
  const staffBaseY = GY;
  const staffTopX = CX + 6 + slump;
  const staffTopY = torsoTop - 12;
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 1);

  drawArm(g, CX + 5 + slump, torsoTop + 3, staffTopX + 1, staffTopY + 6);
  const armDangle = Math.sin(t * Math.PI * 2) * 0.5;
  drawArm(g, CX - 5 + slump, torsoTop + 3, CX - 8 + slump, torsoTop + 10 + armDangle);

  drawFace(g, p, CX, faceY, slump);
  drawBeard(g, CX, faceY + 3, 8, slump, t * 0.3 - 0.15);
  drawHat(g, p, CX, hatBase, slump, 2 + t);
}

function generateMoveFrames(g: Graphics, p: MagePalette, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;
  const stanceL = Math.round(walk * 2.5);
  const stanceR = Math.round(-walk * 2.5);
  const robeH = 18;
  const robeTop = GY - robeH - 2 - Math.round(bob * 0.5);
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX, GY, 12 + Math.abs(walk) * 2);
  drawRobe(g, p, CX, robeTop, robeH, walk * 0.5, walk * 1.5);
  drawShoes(g, CX, GY, stanceL, stanceR);
  drawTorso(g, p, CX, torsoTop, 6, walk * 0.3);

  const staffBaseX = CX + 10 + walk;
  const staffBaseY = GY - 2;
  const staffTopX = CX + 8 + walk * 0.5;
  const staffTopY = torsoTop - 14;
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 1);
  drawArm(g, CX + 5 + walk * 0.3, torsoTop + 3, staffTopX + 1, staffTopY + 8);

  const lArmSwing = walk * 3;
  drawArm(g, CX - 5 + walk * 0.3, torsoTop + 3,
    CX - 7 + lArmSwing, torsoTop + 8 - Math.abs(walk));

  drawFace(g, p, CX, faceY, walk * 0.3);
  drawBeard(g, CX, faceY + 3, 8, walk * 0.3, -walk * 0.6);
  drawHat(g, p, CX, hatBase, walk * 0.3, 1 - walk * 0.5);
}

function generateAttackFrames(g: Graphics, p: MagePalette, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];
  const robeH = 18;
  const robeTop = GY - robeH - 2;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;
  const lift = t > 0.3 && t < 0.8 ? 2 : 0;

  drawShadow(g, CX, GY);
  drawRobe(g, p, CX, robeTop - lift, robeH + lift, 0, 0);
  drawShoes(g, CX, GY, -1, 1);
  drawTorso(g, p, CX, torsoTop - lift, 6);

  const rArmRaise = t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45;
  const rHandX = CX + 8 + rArmRaise * 6;
  const rHandY = torsoTop + 2 - lift - rArmRaise * 12;
  drawStaff(g, rHandX, rHandY + 4, rHandX + 2, rHandY - 10, 1);
  drawArm(g, CX + 5, torsoTop + 3 - lift, rHandX, rHandY);

  const lArmRaise = t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45;
  const lHandX = CX - 8 - lArmRaise * 6;
  const lHandY = torsoTop + 2 - lift - lArmRaise * 12;
  drawArm(g, CX - 5, torsoTop + 3 - lift, lHandX, lHandY);

  const isGlow = t >= 0.3 && t <= 0.85;
  drawFace(g, p, CX, faceY - lift, 0, isGlow);
  drawBeard(g, CX, faceY + 3 - lift, 8, 0, 0);
  drawHat(g, p, CX, hatBase - lift, 0, 1);

  if (t >= 0.2) {
    const intensity = t < 0.55 ? (t - 0.2) / 0.35 : 1 - (t - 0.55) / 0.45;
    drawHandGlow(g, p, rHandX, rHandY, intensity);
    drawHandGlow(g, p, lHandX, lHandY, intensity);
  }

  if (t >= 0.4 && t <= 0.85) {
    const boltAlpha = t < 0.55 ? 0.9 : lerp(0.9, 0.2, (t - 0.55) / 0.3);
    drawSpellBolt(g, p, rHandX, rHandY, rHandX + 4, rHandY - 16, 4, boltAlpha);
    drawSpellBolt(g, p, lHandX, lHandY, lHandX - 4, lHandY - 16, 4, boltAlpha);
    if (t >= 0.5 && t <= 0.8) {
      const strikeAlpha = 1 - Math.abs(t - 0.65) / 0.15;
      drawSpellBolt(g, p, CX, 0, CX + 3, GY - 5, 6, strikeAlpha * 0.7);
    }
  }
}

function generateCastFrames(g: Graphics, p: MagePalette, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const robeH = 18;
  const lift = 1 + pulse;
  const robeTop = GY - robeH - 2 - lift;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX, GY);
  drawRobe(g, p, CX, robeTop, robeH + lift, 0, pulse);
  drawShoes(g, CX, GY, -1, 1);
  drawTorso(g, p, CX, torsoTop, 6);

  const rHandX = CX + 6;
  const rHandY = torsoTop - 6 - pulse * 2;
  drawStaff(g, rHandX, rHandY + 3, rHandX + 2, rHandY - 10, 1);
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);

  const lHandX = CX - 6;
  const lHandY = torsoTop - 4 - pulse * 2;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);

  drawFace(g, p, CX, faceY, 0, true);
  drawBeard(g, CX, faceY + 3, 8, 0, pulse * 0.3);
  drawHat(g, p, CX, hatBase, 0, 1 + pulse * 0.5);

  drawHandGlow(g, p, rHandX, rHandY, 0.6 + pulse * 0.4);
  drawHandGlow(g, p, lHandX, lHandY, 0.6 + pulse * 0.4);

  const crookX = rHandX + 7;
  const crookY = rHandY - 9;
  g.circle(crookX, crookY, 4 + pulse * 3).fill({ color: p.magic, alpha: 0.15 + pulse * 0.15 });
  g.circle(crookX, crookY, 2 + pulse * 2).fill({ color: p.magicHi, alpha: 0.2 + pulse * 0.1 });
}

function generateDieFrames(g: Graphics, p: MagePalette, frame: number): void {
  const t = frame / 6;
  const robeH = 18;
  const fallX = t * 8;
  const dropY = t * t * 10;
  const robeTop = GY - robeH - 2 + dropY;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX + fallX * 0.5, GY, 12 + t * 6);

  if (t < 0.8) {
    drawRobe(g, p, CX + fallX * 0.4, robeTop, robeH * (1 - t * 0.3), t * 2, t * 2);
  }

  const squash = Math.round(t * 3);
  drawShoes(g, CX + fallX * 0.3, GY, t * 3, -t * 2, squash);

  if (t < 0.7) {
    drawTorso(g, p, CX + fallX * 0.5, torsoTop, 6 * (1 - t * 0.3), t * 3);
  }

  if (t < 0.8) {
    drawFace(g, p, CX + fallX * 0.5, faceY + dropY * 0.3, t * 3);
    drawBeard(g, CX + fallX * 0.5, faceY + 3 + dropY * 0.3, 8 * (1 - t * 0.3), t * 3, t * 2);
  }

  if (t < 0.5) {
    drawHat(g, p, CX + fallX * 0.5, hatBase + dropY * 0.2, t * 4, 2 + t * 4);
  } else if (t < 0.9) {
    const hatGroundX = CX + 14;
    const hatGroundY = GY - 3;
    g.ellipse(hatGroundX, hatGroundY, 5, 2).fill({ color: p.hat });
    g.moveTo(hatGroundX - 3, hatGroundY)
      .lineTo(hatGroundX + 2, hatGroundY - 6)
      .lineTo(hatGroundX + 3, hatGroundY)
      .fill({ color: p.hat });
  }

  if (t < 0.7) {
    const sDropX = CX + 12 + t * 10;
    const sDropY = torsoTop - 2 + dropY;
    const angle = t * 2;
    drawStaff(g, sDropX, sDropY + 10, sDropX + Math.sin(angle) * 8, sDropY - Math.cos(angle) * 10, 1);
  }

  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.5 + 4, torsoTop + 3, CX + fallX * 0.5 + 10, torsoTop + 6, p.robe);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate mage sprite frames for any palette.
 * Returns a map from UnitState → ordered Texture[], ready for AnimationManager.
 */
export function generateMageFrames(
  renderer: Renderer,
  palette: MagePalette,
): Map<UnitState, Texture[]> {
  const generators: Record<UnitState, { fn: (g: Graphics, p: MagePalette, f: number) => void; count: number }> = {
    [UnitState.IDLE]:   { fn: generateIdleFrames,   count: 8 },
    [UnitState.MOVE]:   { fn: generateMoveFrames,   count: 8 },
    [UnitState.ATTACK]: { fn: generateAttackFrames, count: 7 },
    [UnitState.CAST]:   { fn: generateCastFrames,   count: 6 },
    [UnitState.DIE]:    { fn: generateDieFrames,    count: 7 },
  };

  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { fn, count } = generators[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      fn(g, palette, i);
      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}

/** Convenience wrapper — storm mage uses the blue lightning palette. */
export function generateStormMageFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  return generateMageFrames(renderer, PALETTE_STORM_MAGE);
}
