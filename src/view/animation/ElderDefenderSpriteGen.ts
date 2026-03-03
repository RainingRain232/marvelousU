// Procedural sprite generator for the Elder Defender unit type.
//
// T5 "Elder" variant — 48×96 frame (1×2 tiles). No longer human: towering,
// unnaturally proportioned, void-black armor fused to petrified grey flesh.
// Massive tower shield held close to the body, corroded but impossibly thick.
// Short broad blade etched with faint runes.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 48;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — void-black iron + dead grey flesh
const COL_SKIN = 0x6a6a70;
const COL_SKIN_DK = 0x4a4a50;
const COL_PLATE = 0x181820;
const COL_PLATE_HI = 0x2a2a34;
const COL_PLATE_DK = 0x0e0e14;
const COL_HELM = 0x1c1c26;
const COL_HELM_HI = 0x2e2e3a;
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
const COL_SWORD_BLD = 0x484850;
const COL_SWORD_HI = 0x606068;
const COL_SWORD_RUNE = 0x445566;
const COL_SWORD_GRD = 0x3a3020;
const COL_SWORD_POM = 0x221a10;
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
// Drawing sub-routines — tall inhuman proportions
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
  const bw = 8, bh = 10 - squash;
  // Heavy sabatons with layered plates
  g.roundRect(cx - 10 + stanceL, gy - bh, bw, bh, 2)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.8 });
  // Toe cap
  g.roundRect(cx - 10 + stanceL, gy - 3, bw, 3, 1).fill({ color: COL_PLATE_HI });
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
  // Thick armored legs — unnaturally long
  g.rect(cx - 8 + stanceL, legTop, 7, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 7, legH).fill({ color: COL_PLATE_DK });
  // Plate strips
  for (let r = 3; r < legH - 2; r += 5) {
    g.rect(cx - 7 + stanceL, legTop + r, 5, 1).fill({ color: COL_PLATE_HI, alpha: 0.3 });
    g.rect(cx + 2 + stanceR, legTop + r, 5, 1).fill({ color: COL_PLATE_HI, alpha: 0.3 });
  }
  // Knee caps — spiked
  g.ellipse(cx - 4.5 + stanceL, legTop + legH * 0.25, 5, 4)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.ellipse(cx + 4.5 + stanceR, legTop + legH * 0.25, 5, 4)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Knee spikes
  g.moveTo(cx - 4.5 + stanceL, legTop + legH * 0.25 - 4)
    .lineTo(cx - 4.5 + stanceL - 1, legTop + legH * 0.25 - 7)
    .lineTo(cx - 4.5 + stanceL + 1, legTop + legH * 0.25 - 4)
    .closePath().fill({ color: COL_PLATE });
  g.moveTo(cx + 4.5 + stanceR, legTop + legH * 0.25 - 4)
    .lineTo(cx + 4.5 + stanceR + 1, legTop + legH * 0.25 - 7)
    .lineTo(cx + 4.5 + stanceR - 1, legTop + legH * 0.25 - 4)
    .closePath().fill({ color: COL_PLATE });
  // Rust
  g.rect(cx - 6 + stanceL, legTop + legH * 0.6, 3, 3).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 22;
  const x = cx - tw / 2 + tilt;
  // Massive black cuirass
  g.roundRect(x, torsoTop, tw, torsoH, 3)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 1.2 });
  // Layered plate segments
  for (let row = 4; row < torsoH - 3; row += 5) {
    g.moveTo(x + 3, torsoTop + row)
      .lineTo(x + tw - 3, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.6, alpha: 0.3 });
  }
  // Central plate ridge
  g.rect(cx - 1.5 + tilt, torsoTop + 4, 3, torsoH - 8).fill({ color: COL_PLATE_HI, alpha: 0.25 });
  // Rust stains
  g.rect(x + 4, torsoTop + torsoH * 0.3, 4, 4).fill({ color: COL_RUST, alpha: 0.2 });
  g.rect(x + tw - 8, torsoTop + torsoH * 0.5, 3, 5).fill({ color: COL_RUST, alpha: 0.15 });
  // Faint rune on breastplate
  g.circle(cx + tilt, torsoTop + torsoH * 0.4, 3).stroke({ color: COL_RUNE, width: 0.6, alpha: 0.25 });
  // Enormous pauldrons with spikes
  g.ellipse(x - 1, torsoTop + 3, 8, 6)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.ellipse(x + tw + 1, torsoTop + 3, 8, 6)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  // Pauldron rivets
  g.circle(x - 1, torsoTop + 2, 1.2).fill({ color: COL_PLATE_DK });
  g.circle(x + tw + 1, torsoTop + 2, 1.2).fill({ color: COL_PLATE_DK });
  // Pauldron spikes
  g.moveTo(x - 5, torsoTop).lineTo(x - 7, torsoTop - 5).lineTo(x - 3, torsoTop + 1).closePath().fill({ color: COL_PLATE });
  g.moveTo(x + tw + 5, torsoTop).lineTo(x + tw + 7, torsoTop - 5).lineTo(x + tw + 3, torsoTop + 1).closePath().fill({ color: COL_PLATE });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 16, hh = 16;
  const x = cx - hw / 2 + tilt;
  // Tall, narrow great helm — inhuman proportions
  g.roundRect(x, helmTop, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 1 });
  // Crown ridge — sharp
  g.moveTo(cx + tilt, helmTop - 3)
    .lineTo(cx - 2 + tilt, helmTop + 2)
    .lineTo(cx + 2 + tilt, helmTop + 2)
    .closePath().fill({ color: COL_PLATE_DK });
  // Dim highlight
  g.roundRect(x + 3, helmTop + 2, 7, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.25 });
  // Narrow visor slit with faint glow
  g.rect(x + 3, helmTop + hh - 7, hw - 6, 2).fill({ color: COL_VISOR });
  g.rect(x + 4, helmTop + hh - 7, hw - 8, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.2 });
  // Face guard — thick vertical bar
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
  const cw = 18;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2.5, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  // Tattered edges
  for (let i = 0; i < 5; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave * 0.8, capeTop + capeH + 4)
      .stroke({ color: COL_CAPE_DK, width: 0.5 });
  }
}

/** Massive tower shield — flush against the body. */
function drawTowerShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
  tilt = 0,
): void {
  const sw = 16 * scale;
  const sh = 34 * scale;
  const x = sx + tilt;

  // Void-dark shield
  g.roundRect(x, sy, sw, sh, 3)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1.5 });

  // Edge highlights
  g.rect(x + 1.5, sy + 4, 3, sh - 8).fill({ color: COL_SHIELD_HI, alpha: 0.25 });
  g.rect(x + sw - 4.5, sy + 4, 3, sh - 8).fill({ color: COL_SHIELD_DK, alpha: 0.35 });

  // Reinforcement bands with rivets
  for (let band = 0; band < 4; band++) {
    const by = sy + sh * (0.15 + band * 0.22);
    g.rect(x + 1.5, by, sw - 3, 3).fill({ color: COL_SHIELD_BAND });
    g.circle(x + 3, by + 1.5, 0.8).fill({ color: COL_SHIELD_RIM });
    g.circle(x + sw - 3, by + 1.5, 0.8).fill({ color: COL_SHIELD_RIM });
  }

  // Rust patches
  g.rect(x + 4, sy + sh * 0.35, 4, 4).fill({ color: COL_RUST, alpha: 0.2 });
  g.rect(x + sw - 7, sy + sh * 0.65, 3, 5).fill({ color: COL_RUST, alpha: 0.15 });

  // Central boss — large, dark
  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.42;
  g.circle(bossCx, bossCy, 5 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 3 * scale).fill({ color: COL_SHIELD_EMB });
  g.circle(bossCx, bossCy, 1.5 * scale).fill({ color: COL_SHIELD_RIM });

  // Faint rune scratches on shield
  g.circle(bossCx, bossCy, 7 * scale).stroke({ color: COL_RUNE, width: 0.5, alpha: 0.15 });

  // Corner rivets
  g.circle(x + 3.5, sy + 4, 1.2).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3.5, sy + 4, 1.2).fill({ color: COL_SHIELD_RIM });
  g.circle(x + 3.5, sy + sh - 4, 1.2).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3.5, sy + sh - 4, 1.2).fill({ color: COL_SHIELD_RIM });
}

function drawSword(
  g: Graphics,
  bladeX: number,
  bladeY: number,
  angle: number,
  bladeLen = 20,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bladeX + sin * bladeLen;
  const tipY = bladeY - cos * bladeLen;

  // Broad blackened blade
  g.moveTo(bladeX, bladeY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SWORD_BLD, width: 3 });
  // Fuller (groove)
  g.moveTo(bladeX + sin * 3, bladeY - cos * 3)
    .lineTo(tipX - sin * 2, tipY + cos * 2)
    .stroke({ color: COL_SWORD_HI, width: 0.8, alpha: 0.4 });
  // Rune etching on blade
  const midX = (bladeX + tipX) / 2;
  const midY = (bladeY + tipY) / 2;
  g.circle(midX, midY, 1.5).stroke({ color: COL_SWORD_RUNE, width: 0.5, alpha: 0.3 });
  g.circle(midX + sin * 4, midY - cos * 4, 1).stroke({ color: COL_SWORD_RUNE, width: 0.4, alpha: 0.25 });

  // Wide crossguard with finials
  g.moveTo(bladeX + cos * 4, bladeY + sin * 4)
    .lineTo(bladeX - cos * 4, bladeY - sin * 4)
    .stroke({ color: COL_SWORD_GRD, width: 3 });
  // Finial balls
  g.circle(bladeX + cos * 4.5, bladeY + sin * 4.5, 1.5).fill({ color: COL_SWORD_GRD });
  g.circle(bladeX - cos * 4.5, bladeY - sin * 4.5, 1.5).fill({ color: COL_SWORD_GRD });
  // Pommel
  g.circle(bladeX - sin * 3.5, bladeY + cos * 3.5, 2)
    .fill({ color: COL_SWORD_POM });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  // Thick armored arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_PLATE_DK, width: 5 });
  // Elbow cop
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3).fill({ color: COL_PLATE_HI }).stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Gauntlet
  g.circle(ex, ey, 3).fill({ color: color === COL_SKIN ? COL_PLATE : color });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const legH = 18;
  const torsoH = 24;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 16 + bob;

  const capeWave = (t - 0.5) * 0.5;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Sword arm (right)
  drawArm(g, CX + 10, torsoTop + 6, CX + 16, torsoTop + torsoH - 2);
  drawSword(g, CX + 16, torsoTop + torsoH - 2, 0.2 + t * 0.04, 20);

  // Shield arm (left) — shield close to body
  drawArm(g, CX - 10, torsoTop + 6, CX - 13, torsoTop + 8);
  drawTowerShield(g, CX - 24, torsoTop - 4, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.2;

  const legH = 18;
  const torsoH = 24;
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

  drawArm(g, CX + 10, torsoTop + 6, CX + 15 + walkCycle * 0.5, torsoTop + torsoH - 3);
  drawSword(g, CX + 15 + walkCycle * 0.5, torsoTop + torsoH - 3, 0.3, 20);

  drawArm(g, CX - 10, torsoTop + 6, CX - 13, torsoTop + 8 - walkCycle * 0.5);
  drawTowerShield(g, CX - 23, torsoTop - 4 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 18;
  const torsoH = 24;
  const legTop = GY - 9 - legH;

  const lean = t < 0.55 ? t * 5 : (1 - t) * 8;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  let swordAngle: number;
  if (t < 0.35) {
    swordAngle = lerp(0.3, -0.5, t / 0.35);
  } else if (t < 0.75) {
    swordAngle = lerp(-0.5, 0.8, (t - 0.35) / 0.4);
  } else {
    swordAngle = lerp(0.8, 0.3, (t - 0.75) / 0.25);
  }

  const lunge = t > 0.3 && t < 0.8 ? 5 : 0;

  drawShadow(g, CX + lean, GY, 18 + lean, 5);
  drawCape(g, CX + lean * 0.2, torsoTop + 3, legH + torsoH - 3, -lean * 0.5);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.5);

  const sArmX = CX + 12 + lean + (t > 0.3 ? 5 : 0);
  const sArmY = torsoTop + 7;
  drawArm(g, CX + 10 + lean, torsoTop + 6, sArmX, sArmY);
  drawSword(g, sArmX, sArmY, swordAngle, 20);

  const shieldPush = lean * 0.6;
  drawArm(g, CX - 10 + lean, torsoTop + 6, CX - 12 + shieldPush, torsoTop + 8);
  drawTowerShield(g, CX - 22 + shieldPush, torsoTop - 4, 0.9, shieldPush * 0.2);

  // Impact flash
  if (t >= 0.4 && t <= 0.65) {
    const flashAlpha = 1 - Math.abs(t - 0.52) / 0.13;
    g.circle(CX - 16 + shieldPush, torsoTop + 12, 6)
      .fill({ color: 0xaabbcc, alpha: flashAlpha * 0.2 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 18;
  const torsoH = 24;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Shield raised
  drawArm(g, CX - 10, torsoTop + 5, CX - 13, torsoTop + 1);
  drawTowerShield(g, CX - 23, torsoTop - 10, 0.95);

  // Sword at ready
  drawArm(g, CX + 10, torsoTop + 5, CX + 15, torsoTop + torsoH - 3);
  drawSword(g, CX + 15, torsoTop + torsoH - 3, 0.2, 20);

  // Void aura
  const glowR = 12 + pulse * 5;
  g.circle(CX - 15, torsoTop + 8, glowR)
    .fill({ color: 0x223344, alpha: 0.08 + pulse * 0.06 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 18;
  const torsoH = 24;
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
    drawTowerShield(g, CX - 22 + fallX * 0.5, torsoTop + dropY * 0.3, 0.9 * (1 - t * 0.4), t * 3);
  }

  if (t < 0.8) {
    const sdx = CX + 16 + t * 8;
    const sdy = torsoTop + torsoH * 0.5 + t * 7;
    drawSword(g, sdx, sdy, 0.3 + t * 2, 20 * (1 - t * 0.3));
  }

  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 7, torsoTop + 7, CX + fallX * 0.4 + 13, torsoTop + torsoH - 3, COL_PLATE);
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

export function generateElderDefenderFrames(
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
