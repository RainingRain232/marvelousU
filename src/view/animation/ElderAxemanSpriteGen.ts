// Procedural sprite generator for the Elder Axeman unit type.
//
// T5 "Elder" variant — 48×96 frame (1×2 tiles). No longer human: towering
// nightmarish figure of slag and sinew. Void-black plate over dark chainmail,
// jagged black cleaver with serrated edge.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 48;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — void-black iron + dead grey flesh
const COL_SKIN = 0x6a6a70;

const COL_PLATE = 0x181820;
const COL_PLATE_HI = 0x2a2a34;
const COL_PLATE_DK = 0x0e0e14;

const COL_MAIL = 0x1a1a22;
const COL_MAIL_HI = 0x28283a;
const COL_MAIL_DK = 0x101018;

const COL_HELM = 0x1c1c26;
const COL_HELM_HI = 0x2e2e3a;
const COL_HELM_DK = 0x121220;
const COL_VISOR = 0x060610;
const COL_EYE_GLOW = 0x556688;

const COL_RUST = 0x3a2218;
const COL_RUNE = 0x445566;

const COL_CAPE = 0x180c0c;
const COL_CAPE_DK = 0x0e0606;
const COL_CAPE_HI = 0x221212;

const COL_AXE_BLADE = 0x1e1e28;
const COL_AXE_BLADE_HI = 0x383840;
const COL_AXE_BLADE_DK = 0x101018;
const COL_AXE_HANDLE = 0x221408;
const COL_AXE_HANDLE_DK = 0x140c04;
const COL_AXE_WRAP = 0x1a100a;
const COL_AXE_METAL = 0x2a2a34;
const COL_AXE_EDGE = 0x606068;

const COL_BELT = 0x1a1410;
const COL_BELT_BUCKLE = 0x2a2a34;

const COL_BOOT = 0x141418;
const COL_BOOT_DK = 0x0c0c10;
const COL_GREAVE = 0x1e1e28;

const COL_RIVET = 0x484850;

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
  w = 18,
  h = 5,
  alpha = 0.4,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 7;
  const bh = 9 - squash;
  // Sabatons with greaves
  g.roundRect(cx - 9 + stanceL, gy - bh, bw, bh, 2)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx - 8.5 + stanceL, gy - bh - 3, 6, 4, 1).fill({ color: COL_GREAVE });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 2)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx + 2.5 + stanceR, gy - bh - 3, 6, 4, 1).fill({ color: COL_GREAVE });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 7 + stanceL, legTop, 6, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 6, legH).fill({ color: COL_MAIL_DK });
  // Chainmail texture
  for (let r = 1; r < legH - 1; r += 2) {
    g.moveTo(cx - 6.5 + stanceL, legTop + r)
      .lineTo(cx - 1.5 + stanceL, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.2 });
    g.moveTo(cx + 1.5 + stanceR, legTop + r)
      .lineTo(cx + 6.5 + stanceR, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.2 });
  }
  // Knee armor with spikes
  g.ellipse(cx - 4 + stanceL, legTop + 2, 5, 3.5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  g.ellipse(cx + 4 + stanceR, legTop + 2, 5, 3.5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Knee spikes
  g.moveTo(cx - 4 + stanceL, legTop - 1)
    .lineTo(cx - 4 + stanceL - 1, legTop - 5)
    .lineTo(cx - 4 + stanceL + 1, legTop - 1)
    .closePath().fill({ color: COL_PLATE });
  // Rust
  g.rect(cx - 5 + stanceL, legTop + legH * 0.5, 2, 3).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 22;
  const x = cx - tw / 2 + tilt;

  // Chainmail base
  g.roundRect(x - 1, top, tw + 2, h, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.8 });

  // Mail texture
  for (let row = 3; row < h - 2; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.2 });
  }

  // Blackened breastplate
  g.roundRect(x + 2, top + 2, tw - 4, h - 5, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.7 });
  g.roundRect(x + 3, top + 3, tw - 6, 3, 1).fill({ color: COL_PLATE_HI, alpha: 0.2 });

  // Central ridge
  g.rect(cx - 1.5 + tilt, top + 5, 3, h - 10).fill({ color: COL_PLATE_HI, alpha: 0.2 });

  // Rune on breastplate
  g.circle(cx + tilt, top + h * 0.4, 3).stroke({ color: COL_RUNE, width: 0.5, alpha: 0.2 });

  // Rust stains
  g.rect(x + 5, top + h * 0.35, 4, 4).fill({ color: COL_RUST, alpha: 0.2 });
  g.rect(x + tw - 8, top + h * 0.5, 3, 4).fill({ color: COL_RUST, alpha: 0.15 });

  // Enormous spiked pauldrons
  g.ellipse(x - 1, top + 3, 8, 5.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.circle(x - 1, top + 2, 1).fill({ color: COL_RIVET });
  g.circle(x + 1, top + 5, 1).fill({ color: COL_RIVET });
  // Left spike
  g.moveTo(x - 5, top).lineTo(x - 7, top - 6).lineTo(x - 3, top + 1).closePath().fill({ color: COL_PLATE });

  g.ellipse(x + tw + 1, top + 3, 8, 5.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.circle(x + tw + 1, top + 2, 1).fill({ color: COL_RIVET });
  g.circle(x + tw - 1, top + 5, 1).fill({ color: COL_RIVET });
  // Right spike
  g.moveTo(x + tw + 5, top).lineTo(x + tw + 7, top - 6).lineTo(x + tw + 3, top + 1).closePath().fill({ color: COL_PLATE });

  // Belt
  g.rect(x, top + h - 4, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 2.5, 2).fill({ color: COL_BELT_BUCKLE });

  // Chainmail skirt
  g.rect(x + 1, top + h - 1, tw - 2, 5)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.4 });
}

function drawHelm(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 16;
  const hh = 16;
  const x = cx - hw / 2 + tilt;

  g.roundRect(x, top, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.8 });

  // Crown spike
  g.moveTo(cx + tilt, top - 3)
    .lineTo(cx - 2 + tilt, top + 2)
    .lineTo(cx + 2 + tilt, top + 2)
    .closePath().fill({ color: COL_PLATE_DK });

  // Dim highlight
  g.roundRect(x + 3, top + 2, 7, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.2 });

  // Cheek plates
  g.roundRect(x, top + hh * 0.4, 4, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });
  g.roundRect(x + hw - 4, top + hh * 0.4, 4, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });

  // Eye opening
  g.rect(x + 4, top + hh * 0.4, hw - 8, 3).fill({ color: COL_VISOR });

  // Nose guard
  g.rect(cx - 1 + tilt, top + hh * 0.3, 2, hh * 0.5).fill({ color: COL_HELM_DK });

  // Faint eye glow
  g.circle(cx - 2.5 + tilt, top + hh * 0.5, 1).fill({ color: COL_EYE_GLOW, alpha: 0.3 });
  g.circle(cx + 2.5 + tilt, top + hh * 0.5, 1).fill({ color: COL_EYE_GLOW, alpha: 0.3 });

  // Brow ridge
  g.rect(x + 2.5, top + hh * 0.35, hw - 5, 1.5).fill({ color: COL_HELM_DK });

  // Rust on helm
  g.rect(x + hw - 5, top + 2, 3, 3).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 18;
  const x = cx - cw / 2 - 2;

  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.7 });

  // Fold lines
  const mid = capeTop + capeH * 0.5;
  g.moveTo(x + 4, capeTop + 3)
    .lineTo(x + 3 + wave * 0.5, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.5, alpha: 0.3 });
  g.moveTo(x + cw - 4, capeTop + 3)
    .lineTo(x + cw - 3 + wave, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.5, alpha: 0.3 });
  g.moveTo(x + cw / 2, capeTop + 4)
    .lineTo(x + cw / 2 + wave, capeTop + capeH - 4)
    .stroke({ color: COL_CAPE_HI, width: 0.3, alpha: 0.15 });

  // Tattered edge
  for (let i = 0; i < 5; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 4)
      .stroke({ color: COL_CAPE_DK, width: 0.5 });
  }
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  // Thick armored sleeve
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 5 });
  // Elbow cop
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3.5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Gauntlet
  g.circle(ex, ey, 3).fill({ color: color === COL_SKIN ? COL_PLATE : color });
}

/** Jagged black cleaver — serrated edge, massive head. */
function drawAxe(
  g: Graphics,
  handleBaseX: number,
  handleBaseY: number,
  angle: number,
  handleLen = 28,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const headX = handleBaseX + sin * handleLen;
  const headY = handleBaseY - cos * handleLen;

  // Dark wooden handle
  g.moveTo(handleBaseX, handleBaseY)
    .lineTo(headX, headY)
    .stroke({ color: COL_AXE_HANDLE, width: 3.5 });
  g.moveTo(handleBaseX + cos * 0.5, handleBaseY + sin * 0.5)
    .lineTo(headX + cos * 0.5, headY + sin * 0.5)
    .stroke({ color: COL_AXE_HANDLE_DK, width: 0.7 });

  // Leather wrap
  const wrapX = handleBaseX + sin * 5;
  const wrapY = handleBaseY - cos * 5;
  g.circle(wrapX, wrapY, 3).fill({ color: COL_AXE_WRAP });

  // Metal ferrule
  g.circle(headX, headY, 3).fill({ color: COL_AXE_METAL });

  // Massive axe head — jagged black wedge
  const bladeW = 12;
  const bladeH = 10;

  const b1x = headX + cos * bladeW;
  const b1y = headY + sin * bladeW;
  const b2x = headX + cos * bladeW * 0.3 + sin * bladeH;
  const b2y = headY + sin * bladeW * 0.3 - cos * bladeH;
  const b3x = headX + cos * bladeW * 0.3 - sin * bladeH;
  const b3y = headY + sin * bladeW * 0.3 + cos * bladeH;

  g.moveTo(b2x, b2y)
    .lineTo(b1x, b1y)
    .lineTo(b3x, b3y)
    .lineTo(headX, headY)
    .closePath()
    .fill({ color: COL_AXE_BLADE })
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.7 });

  // Serrated cutting edge (jagged line)
  const segments = 5;
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const sx = lerp(b2x, b1x, t1);
    const sy = lerp(b2y, b1y, t1);
    const ex = lerp(b2x, b1x, t2);
    const ey = lerp(b2y, b1y, t2);
    const jag = (i % 2 === 0 ? 1.5 : -1) * (1 - t1 * 0.5);
    g.moveTo(sx, sy)
      .lineTo((sx + ex) / 2 + cos * jag, (sy + ey) / 2 + sin * jag)
      .lineTo(ex, ey)
      .stroke({ color: COL_AXE_EDGE, width: 1, alpha: 0.5 });
  }

  // Inner highlight
  g.moveTo(b2x, b2y)
    .lineTo(b1x, b1y)
    .lineTo(b3x, b3y)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.8, alpha: 0.4 });

  // Back spike — larger
  const s1x = headX - cos * 5;
  const s1y = headY - sin * 5;
  const s2x = headX - cos * 5 + sin * 5;
  const s2y = headY - sin * 5 - cos * 5;
  g.moveTo(headX, headY)
    .lineTo(s1x, s1y)
    .lineTo(s2x, s2y)
    .closePath()
    .fill({ color: COL_AXE_BLADE_DK });

  // Rune on handle
  const runeX = handleBaseX + sin * handleLen * 0.35;
  const runeY = handleBaseY - cos * handleLen * 0.35;
  g.circle(runeX, runeY, 1.5).stroke({ color: COL_RUNE, width: 0.4, alpha: 0.2 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;

  const legH = 18;
  const torsoH = 20;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 16;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.5;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe arm (right) — resting on shoulder
  const axeAngle = -0.3 + Math.sin(t * Math.PI * 2) * 0.03;
  const handX = CX + 13;
  const handY = torsoTop + torsoH - 3;
  drawArm(g, CX + 10, torsoTop + 6, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 26);

  // Off-hand
  drawArm(g, CX - 10, torsoTop + 6, CX - 13, torsoTop + 14);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.2;

  const legH = 18;
  const torsoH = 20;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.3);
  const helmTop = torsoTop - 16;

  const capeWave = -walk * 1.5;

  drawShadow(g, CX, GY, 18 + Math.abs(walk) * 2, 5);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHelm(g, CX, helmTop, walk * 0.4);

  const handX = CX + 13 + walk * 0.6;
  const handY = torsoTop + torsoH - 3;
  drawArm(g, CX + 10, torsoTop + 6, handX, handY);
  drawAxe(g, handX, handY, -0.25 + walk * 0.08, 26);

  drawArm(g, CX - 10, torsoTop + 6, CX - 13 - walk * 0.5, torsoTop + 12 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.1, 0.22, 0.38, 0.52, 0.68, 0.84, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 18;
  const torsoH = 20;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  const lean = t < 0.52 ? t * 3.5 : (1 - t) * 6;

  let axeAngle: number;
  if (t < 0.22) {
    axeAngle = lerp(-0.3, -1.8, t / 0.22);
  } else if (t < 0.52) {
    axeAngle = lerp(-1.8, -2.5, (t - 0.22) / 0.3);
  } else if (t < 0.84) {
    axeAngle = lerp(-2.5, 1.2, (t - 0.52) / 0.32);
  } else {
    axeAngle = lerp(1.2, -0.3, (t - 0.84) / 0.16);
  }

  const armReach = t < 0.52 ? t * 4 : (1 - t) * 8;
  const lunge = t > 0.3 && t < 0.85 ? 6 : 0;

  drawShadow(g, CX + lean, GY, 18 + lean, 5);
  drawCape(g, CX + lean * 0.3, torsoTop + 3, legH + torsoH - 3, -lean * 0.7);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Axe arm — big overhead arc
  const handX = CX + 12 + lean + armReach;
  const handY = torsoTop + 5;
  drawArm(g, CX + 10 + lean, torsoTop + 6, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 28);

  drawArm(g, CX - 10 + lean, torsoTop + 6, CX - 12, torsoTop + 14);

  // Impact flash at apex of downswing
  if (t >= 0.58 && t <= 0.78) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.68) / 0.1);
    const impX = handX + Math.sin(axeAngle) * 28;
    const impY = handY - Math.cos(axeAngle) * 28;
    g.circle(impX, impY, 8).fill({ color: 0xaabbcc, alpha: impactAlpha * 0.25 });
    g.circle(impX, impY, 4).fill({ color: COL_AXE_BLADE_HI, alpha: impactAlpha * 0.15 });
  }

  // Swing trail
  if (t >= 0.45 && t <= 0.72) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.58) / 0.14);
    g.moveTo(handX + 2, handY - 20)
      .bezierCurveTo(
        handX + 16,
        handY - 10,
        handX + 18,
        handY + 10,
        handX + 12,
        handY + 20,
      )
      .stroke({ color: 0xaabbcc, width: 3, alpha: trailAlpha * 0.3 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 18;
  const torsoH = 20;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 16;

  // Dark aura
  const glowR = 12 + intensity * 7 + pulse * 4;
  g.circle(CX, torsoTop - 6, glowR).fill({
    color: 0x223344,
    alpha: 0.05 + intensity * 0.05,
  });
  g.circle(CX, torsoTop - 6, glowR * 0.55).fill({
    color: 0x223344,
    alpha: 0.07 + intensity * 0.05,
  });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe raised overhead
  const raise = intensity * 7;
  const handX = CX + 7;
  const handY = torsoTop - 5 - raise;
  drawArm(g, CX + 10, torsoTop + 5, handX, handY);
  drawAxe(g, handX, handY, -0.1 + pulse * 0.05, 26);

  drawArm(g, CX - 10, torsoTop + 5, CX - 12, torsoTop + 4 - raise * 0.5);

  // War cry lines
  if (intensity > 0.3) {
    for (let i = 0; i < 4; i++) {
      const angle = -0.6 + i * 0.4;
      const lineLen = 6 + pulse * 5;
      const startR = 10;
      const sx = CX + Math.cos(angle) * startR;
      const sy = helmTop + 8 + Math.sin(angle) * startR * 0.5;
      const ex = CX + Math.cos(angle) * (startR + lineLen);
      const ey = helmTop + 8 + Math.sin(angle) * (startR + lineLen) * 0.5;
      g.moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({ color: 0x556677, width: 1.2, alpha: clamp01(intensity - 0.3) * 0.3 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 18;
  const torsoH = 20;
  const legTop = GY - 9 - legH;

  const fallX = t * 14;
  const dropY = t * t * 14;
  const fallAngle = t * 1.0;

  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX + fallX * 0.4, GY, 18 + t * 6, 5, 0.4 * (1 - t * 0.4));

  if (t < 0.85) {
    drawCape(g, CX + fallX * 0.2, torsoTop + 3, (legH + torsoH - 3) * (1 - t * 0.3), t * 2.5);
  }

  const squash = Math.round(t * 5);
  drawBoots(g, CX + fallX * 0.15, GY, t * 3, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 3, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 3.5);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.4, fallAngle * 4);

  // Axe tumbles
  if (t < 0.8) {
    const adx = CX + 16 + t * 14;
    const ady = torsoTop + torsoH * 0.4 + t * 10;
    drawAxe(g, adx, ady, 0.5 + t * 2.8, 26 * (1 - t * 0.3));
  }

  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 7, torsoTop + 6, CX + fallX * 0.4 + 14, torsoTop + torsoH - 3, COL_PLATE);
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

export function generateElderAxemanFrames(
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
