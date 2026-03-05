// Procedural sprite generator for the Elder Phalanx unit type.
//
// T5 "Elder" variant — 48×96 frame (1×2 tiles). No longer human: impossibly
// tall, void-black armor, featureless helm, barbed corroded lance.
// Shield held close to the body.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 48;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — void-black iron + dead grey flesh
const COL_SKIN = 0x6a6a70;
const COL_PLATE = 0x1a1a24;
const COL_PLATE_HI = 0x282834;
const COL_PLATE_DK = 0x0e0e14;
const COL_HELM = 0x1c1c26;
const COL_HELM_HI = 0x2c2c38;
const COL_VISOR = 0x060610;
const COL_EYE_GLOW = 0x556688;
const COL_RUST = 0x3a2218;
const COL_RUNE = 0x445566;
const COL_SHIELD = 0x121218;
const COL_SHIELD_HI = 0x1e1e28;
const COL_SHIELD_DK = 0x0a0a10;
const COL_SHIELD_RIM = 0x3a3020;
const COL_SHIELD_BAND = 0x2a2218;
const COL_SHIELD_EMB = 0x665530;
const COL_SPEAR_SHAFT = 0x2a1a0e;
const COL_SPEAR_SHAFT_DK = 0x180e06;
const COL_SPEAR_TIP = 0x484850;
const COL_SPEAR_TIP_HI = 0x606068;
const COL_BOOT = 0x141418;
const COL_BOOT_DK = 0x0c0c10;
const COL_CAPE = 0x0e0e16;
const COL_CAPE_DK = 0x080810;
const COL_SHADOW = 0x000000;

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
// Drawing sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, gy: number, w = 18, h = 5): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.4 });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 7, bh = 10 - squash;
  g.roundRect(cx - 9 + stanceL, gy - bh, bw, bh, 2)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.8 });
  g.roundRect(cx - 9 + stanceL, gy - 3, bw, 3, 1).fill({ color: COL_PLATE_HI });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 2)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.8 });
  g.roundRect(cx + 2 + stanceR, gy - 3, bw, 3, 1).fill({ color: COL_PLATE_HI });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 7 + stanceL, legTop, 7, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 7, legH).fill({ color: COL_PLATE_DK });
  // Plate strips
  for (let r = 3; r < legH - 2; r += 5) {
    g.rect(cx - 6 + stanceL, legTop + r, 5, 1).fill({ color: COL_PLATE_HI, alpha: 0.3 });
    g.rect(cx + 2 + stanceR, legTop + r, 5, 1).fill({ color: COL_PLATE_HI, alpha: 0.3 });
  }
  // Knee caps
  g.ellipse(cx - 4 + stanceL, legTop + legH * 0.25, 5, 4)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.ellipse(cx + 4 + stanceR, legTop + legH * 0.25, 5, 4)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Knee spikes
  g.moveTo(cx - 4 + stanceL, legTop + legH * 0.25 - 4)
    .lineTo(cx - 4 + stanceL - 1, legTop + legH * 0.25 - 7)
    .lineTo(cx - 4 + stanceL + 1, legTop + legH * 0.25 - 4)
    .closePath().fill({ color: COL_PLATE });
  // Rust
  g.rect(cx - 5 + stanceL, legTop + legH * 0.6, 3, 3).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 21;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 3)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 1 });
  for (let row = 4; row < torsoH - 3; row += 5) {
    g.moveTo(x + 3, torsoTop + row)
      .lineTo(x + tw - 3, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.5, alpha: 0.3 });
  }
  // Central ridge
  g.rect(cx - 1.5 + tilt, torsoTop + 4, 3, torsoH - 8).fill({ color: COL_PLATE_HI, alpha: 0.2 });
  // Rune
  g.circle(cx + tilt, torsoTop + torsoH * 0.4, 3).stroke({ color: COL_RUNE, width: 0.5, alpha: 0.2 });
  // Rust
  g.rect(x + 4, torsoTop + torsoH * 0.4, 3, 4).fill({ color: COL_RUST, alpha: 0.2 });
  // Pauldrons with spikes
  g.ellipse(x - 1, torsoTop + 3, 7, 5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.ellipse(x + tw + 1, torsoTop + 3, 7, 5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, torsoTop + 2, 1).fill({ color: COL_PLATE_DK });
  g.circle(x + tw + 1, torsoTop + 2, 1).fill({ color: COL_PLATE_DK });
  g.moveTo(x - 5, torsoTop).lineTo(x - 6, torsoTop - 4).lineTo(x - 3, torsoTop + 1).closePath().fill({ color: COL_PLATE });
  g.moveTo(x + tw + 5, torsoTop).lineTo(x + tw + 6, torsoTop - 4).lineTo(x + tw + 3, torsoTop + 1).closePath().fill({ color: COL_PLATE });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 15, hh = 16;
  const x = cx - hw / 2 + tilt;
  // Tall narrow helm — almost featureless
  g.roundRect(x, helmTop, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 0.9 });
  // Crown spike
  g.moveTo(cx + tilt, helmTop - 3)
    .lineTo(cx - 2 + tilt, helmTop + 2)
    .lineTo(cx + 2 + tilt, helmTop + 2)
    .closePath().fill({ color: COL_PLATE_DK });
  // Highlight
  g.roundRect(x + 3, helmTop + 2, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.2 });
  // Narrow visor with faint glow
  g.rect(x + 3, helmTop + hh - 7, hw - 6, 2).fill({ color: COL_VISOR });
  g.rect(x + 4, helmTop + hh - 7, hw - 8, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.2 });
  // Face guard
  g.rect(cx - 1.5 + tilt, helmTop + 5, 3, hh - 7).fill({ color: COL_PLATE_DK });
  // Cheek plates
  g.rect(x, helmTop + hh * 0.5, 3, hh * 0.4).fill({ color: COL_PLATE_DK });
  g.rect(x + hw - 3, helmTop + hh * 0.5, 3, hh * 0.4).fill({ color: COL_PLATE_DK });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 16;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2.5, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  for (let i = 0; i < 4; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave * 0.8, capeTop + capeH + 4)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawTowerShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
  tilt = 0,
): void {
  const sw = 14 * scale;
  const sh = 30 * scale;
  const x = sx + tilt;

  g.roundRect(x, sy, sw, sh, 3)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1.3 });

  g.rect(x + 1.5, sy + 4, 2.5, sh - 8).fill({ color: COL_SHIELD_HI, alpha: 0.25 });
  g.rect(x + sw - 4, sy + 4, 2.5, sh - 8).fill({ color: COL_SHIELD_DK, alpha: 0.35 });

  for (let band = 0; band < 3; band++) {
    const by = sy + sh * (0.2 + band * 0.25);
    g.rect(x + 1.5, by, sw - 3, 2.5).fill({ color: COL_SHIELD_BAND });
    g.circle(x + 3, by + 1.2, 0.8).fill({ color: COL_SHIELD_RIM });
    g.circle(x + sw - 3, by + 1.2, 0.8).fill({ color: COL_SHIELD_RIM });
  }

  g.rect(x + 3, sy + sh * 0.4, 3, 4).fill({ color: COL_RUST, alpha: 0.2 });

  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.42;
  g.circle(bossCx, bossCy, 4 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 2.5 * scale).fill({ color: COL_SHIELD_EMB });

  g.circle(x + 3, sy + 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3, sy + 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + 3, sy + sh - 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3, sy + sh - 4, 1).fill({ color: COL_SHIELD_RIM });
}

/** Barbed lance — long corroded shaft with serrated tip. */
function drawSpear(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  spearLen = 42,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + sin * spearLen;
  const tipY = baseY - cos * spearLen;

  // Corroded shaft
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SPEAR_SHAFT, width: 3 });
  g.moveTo(baseX + cos * 0.4, baseY + sin * 0.4)
    .lineTo(tipX + cos * 0.4, tipY + sin * 0.4)
    .stroke({ color: COL_SPEAR_SHAFT_DK, width: 0.7 });

  // Barbed spearhead — larger, serrated
  const headLen = 8;
  const headTipX = tipX + sin * headLen;
  const headTipY = tipY - cos * headLen;
  const headW = 3;

  g.moveTo(tipX + cos * headW, tipY + sin * headW)
    .lineTo(headTipX, headTipY)
    .lineTo(tipX - cos * headW, tipY - sin * headW)
    .closePath()
    .fill({ color: COL_SPEAR_TIP });

  // Barbs (serrations on both sides)
  const barbDist = headLen * 0.4;
  const barbX = tipX + sin * barbDist;
  const barbY = tipY - cos * barbDist;
  g.moveTo(barbX + cos * headW, barbY + sin * headW)
    .lineTo(barbX + cos * (headW + 2.5), barbY + sin * (headW + 2.5))
    .stroke({ color: COL_SPEAR_TIP, width: 1.5 });
  g.moveTo(barbX - cos * headW, barbY - sin * headW)
    .lineTo(barbX - cos * (headW + 2.5), barbY - sin * (headW + 2.5))
    .stroke({ color: COL_SPEAR_TIP, width: 1.5 });

  // Tip highlight
  g.moveTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .lineTo(headTipX, headTipY)
    .stroke({ color: COL_SPEAR_TIP_HI, width: 0.7, alpha: 0.4 });

  // Rune on shaft
  const runeX = baseX + sin * spearLen * 0.3;
  const runeY = baseY - cos * spearLen * 0.3;
  g.circle(runeX, runeY, 1.5).stroke({ color: COL_RUNE, width: 0.4, alpha: 0.2 });

  // Butt end
  const buttX = baseX - sin * 4;
  const buttY = baseY + cos * 4;
  g.circle(buttX, buttY, 2).fill({ color: COL_SPEAR_SHAFT_DK });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_PLATE_DK, width: 5 });
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3).fill({ color: COL_PLATE_HI }).stroke({ color: COL_PLATE_DK, width: 0.4 });
  g.circle(ex, ey, 3).fill({ color: color === COL_SKIN ? COL_PLATE : color });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const legH = 18;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 16 + bob;

  const capeWave = (t - 0.5) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Spear arm (right)
  const spearAngle = 0.08 + t * 0.03;
  drawArm(g, CX + 9, torsoTop + 6, CX + 14, torsoTop + torsoH - 2);
  drawSpear(g, CX + 14, torsoTop + torsoH - 2, spearAngle, 40);

  // Shield arm (left) — close to body
  drawArm(g, CX - 9, torsoTop + 6, CX - 12, torsoTop + 8);
  drawTowerShield(g, CX - 22, torsoTop - 2, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.2;

  const legH = 18;
  const torsoH = 22;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.3);
  const helmTop = torsoTop - 16;

  const capeWave = -walkCycle * 1.2;

  drawShadow(g, CX, GY, 18 + Math.abs(walkCycle), 5);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHelm(g, CX, helmTop, walkCycle * 0.3);

  const spearBob = walkCycle * 0.04;
  drawArm(g, CX + 9, torsoTop + 6, CX + 13 + walkCycle * 0.5, torsoTop + torsoH - 2);
  drawSpear(g, CX + 13 + walkCycle * 0.5, torsoTop + torsoH - 2, 0.2 + spearBob, 40);

  drawArm(g, CX - 9, torsoTop + 6, CX - 12, torsoTop + 8 - walkCycle * 0.5);
  drawTowerShield(g, CX - 21, torsoTop - 2 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 18;
  const torsoH = 22;
  const legTop = GY - 9 - legH;

  const lean = t < 0.55 ? t * 5 : (1 - t) * 7;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  let spearAngle: number;
  if (t < 0.2) {
    spearAngle = lerp(0.15, 0.4, t / 0.2);
  } else if (t < 0.55) {
    spearAngle = lerp(0.4, 1.35, (t - 0.2) / 0.35);
  } else if (t < 0.8) {
    spearAngle = lerp(1.35, 1.5, (t - 0.55) / 0.25);
  } else {
    spearAngle = lerp(1.5, 0.15, (t - 0.8) / 0.2);
  }

  const lunge = t > 0.3 && t < 0.85 ? 5 : 0;

  drawShadow(g, CX + lean, GY, 18 + lean, 5);
  drawCape(g, CX + lean * 0.2, torsoTop + 3, legH + torsoH - 3, -lean * 0.5);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.5);

  const armReach = t > 0.2 && t < 0.8 ? (t - 0.2) * 7 : 0;
  const sArmX = CX + 10 + lean + armReach;
  const sArmY = torsoTop + 6;
  drawArm(g, CX + 9 + lean, torsoTop + 6, sArmX, sArmY);
  drawSpear(g, sArmX, sArmY, spearAngle, 42);

  const shieldPush = lean * 0.4;
  drawArm(g, CX - 9 + lean, torsoTop + 6, CX - 12 + shieldPush, torsoTop + 8);
  drawTowerShield(g, CX - 20 + shieldPush, torsoTop - 2, 0.88, shieldPush * 0.15);

  // Thrust trail
  if (t >= 0.45 && t <= 0.75) {
    const trailAlpha = 1 - Math.abs(t - 0.6) / 0.15;
    const cos = Math.cos(spearAngle);
    const sin = Math.sin(spearAngle);
    const trailX = sArmX + sin * 40;
    const trailY = sArmY - cos * 40;
    g.circle(trailX, trailY, 5)
      .fill({ color: 0xaabbcc, alpha: trailAlpha * 0.15 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 18;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  drawArm(g, CX - 9, torsoTop + 5, CX - 12, torsoTop + 1);
  drawTowerShield(g, CX - 21, torsoTop - 8, 0.92);

  drawArm(g, CX + 9, torsoTop + 5, CX + 14, torsoTop + torsoH - 2);
  drawSpear(g, CX + 14, torsoTop + torsoH - 2, 0.05, 40);

  const glowR = 11 + pulse * 4;
  g.circle(CX - 14, torsoTop + 6, glowR)
    .fill({ color: 0x223344, alpha: 0.07 + pulse * 0.05 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 18;
  const torsoH = 22;
  const legTop = GY - 9 - legH;

  const fallAngle = t * 1.0;
  const fallX = t * 12;
  const dropY = t * t * 14;

  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX + fallX * 0.5, GY, 18 + t * 6, 5);
  drawCape(g, CX + fallX * 0.2, torsoTop + 3, (legH + torsoH - 3) * (1 - t * 0.3), t * 1.5);

  const squash = Math.round(t * 5);
  drawBoots(g, CX + fallX * 0.2, GY, t * 3, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.2, legTop + dropY * 0.5, legH - squash, t * 3, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 2.5);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.5, fallAngle * 3);

  if (t < 0.7) {
    drawTowerShield(g, CX - 20 + fallX * 0.5, torsoTop + dropY * 0.3, 0.88 * (1 - t * 0.4), t * 3);
  }

  if (t < 0.85) {
    const sdx = CX + 14 + t * 14;
    const sdy = torsoTop + torsoH * 0.3 + t * 10;
    drawSpear(g, sdx, sdy, 0.3 + t * 2.5, 40 * (1 - t * 0.3));
  }

  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 7, torsoTop + 7, CX + fallX * 0.4 + 13, torsoTop + torsoH - 2, COL_PLATE);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 7 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateElderPhalanxFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
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
