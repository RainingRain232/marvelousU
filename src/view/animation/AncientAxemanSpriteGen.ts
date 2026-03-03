// Procedural sprite generator for the Ancient Axeman unit type.
//
// A T4 "Ancient One" variant of the Axeman — bigger (48×72 frame),
// blackened/corroded armor over chainmail, grey undead-looking skin,
// pitted dark battle axe.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 48;
const FH = 72;
const CX = FW / 2;
const GY = FH - 6;

// Palette — blackened ancient steel + grey skin
const COL_SKIN = 0x8a8a8a;

const COL_PLATE = 0x2e2e38;
const COL_PLATE_HI = 0x44444e;
const COL_PLATE_DK = 0x1a1a22;

const COL_MAIL = 0x303038;
const COL_MAIL_HI = 0x444450;
const COL_MAIL_DK = 0x202028;

const COL_HELM = 0x33333d;
const COL_HELM_HI = 0x484852;
const COL_HELM_DK = 0x222230;
const COL_VISOR = 0x0a0a14;

const COL_RUST = 0x5a3a2a;

const COL_CAPE = 0x2a1818;
const COL_CAPE_DK = 0x1a0e0e;
const COL_CAPE_HI = 0x3a2020;

const COL_AXE_BLADE = 0x383840;
const COL_AXE_BLADE_HI = 0x555560;
const COL_AXE_BLADE_DK = 0x222228;
const COL_AXE_HANDLE = 0x3a2210;
const COL_AXE_HANDLE_DK = 0x221408;
const COL_AXE_WRAP = 0x2a1a10;
const COL_AXE_METAL = 0x404048;

const COL_BELT = 0x2a2218;
const COL_BELT_BUCKLE = 0x404048;

const COL_BOOT = 0x222228;
const COL_BOOT_DK = 0x151518;
const COL_GREAVE = 0x303038;

const COL_RIVET = 0x606068;

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
  w = 16,
  h = 5,
  alpha = 0.35,
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
  const bw = 6;
  const bh = 7 - squash;
  // Left boot with greave
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  g.roundRect(cx - 7.5 + stanceL, gy - bh - 3, 5, 4, 0.5).fill({ color: COL_GREAVE });
  // Right boot with greave
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  g.roundRect(cx + 2.5 + stanceR, gy - bh - 3, 5, 4, 0.5).fill({ color: COL_GREAVE });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 6 + stanceL, legTop, 5, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 5, legH).fill({ color: COL_MAIL_DK });
  // Chainmail texture
  for (let r = 1; r < legH - 1; r += 2) {
    g.moveTo(cx - 5.5 + stanceL, legTop + r)
      .lineTo(cx - 1.5 + stanceL, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
    g.moveTo(cx + 1.5 + stanceR, legTop + r)
      .lineTo(cx + 5.5 + stanceR, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
  }
  // Knee armor
  g.ellipse(cx - 3.5 + stanceL, legTop + 1, 4, 3)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.ellipse(cx + 3.5 + stanceR, legTop + 1, 4, 3)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  // Rust on knees
  g.rect(cx - 4 + stanceL, legTop + 2, 2, 2).fill({ color: COL_RUST, alpha: 0.25 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 18;
  const x = cx - tw / 2 + tilt;

  // Chainmail base
  g.roundRect(x - 1, top, tw + 2, h, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.7 });

  // Mail texture
  for (let row = 3; row < h - 1; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
  }

  // Blackened breastplate
  g.roundRect(x + 2, top + 1, tw - 4, h - 4, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.roundRect(x + 3, top + 2, tw - 6, 2, 0.5).fill({ color: COL_PLATE_HI, alpha: 0.3 });

  // Rust on breastplate
  g.rect(x + 5, top + h * 0.4, 3, 3).fill({ color: COL_RUST, alpha: 0.25 });
  g.rect(x + tw - 7, top + h * 0.55, 2, 3).fill({ color: COL_RUST, alpha: 0.2 });

  // Heavy shoulder pauldrons
  g.ellipse(x - 1, top + 3, 6, 4.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 2, 0.8).fill({ color: COL_RIVET });
  g.circle(x + 1, top + 4, 0.8).fill({ color: COL_RIVET });
  g.ellipse(x + tw + 1, top + 3, 6, 4.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 2, 0.8).fill({ color: COL_RIVET });
  g.circle(x + tw - 1, top + 4, 0.8).fill({ color: COL_RIVET });

  // Belt
  g.rect(x, top + h - 4, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 2.5, 1.8).fill({ color: COL_BELT_BUCKLE });

  // Chainmail skirt
  g.rect(x + 1, top + h - 1, tw - 2, 4)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.3 });
}

function drawHelm(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 14;
  const hh = 13;
  const x = cx - hw / 2 + tilt;

  // Main helm dome
  g.roundRect(x, top, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });

  // Dim highlight
  g.roundRect(x + 2, top + 1, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.3 });

  // Cheek plates
  g.roundRect(x, top + hh * 0.4, 3.5, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });
  g.roundRect(x + hw - 3.5, top + hh * 0.4, 3.5, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });

  // Eye opening
  g.rect(x + 3.5, top + hh * 0.4, hw - 7, 3).fill({ color: COL_VISOR });

  // Nose guard
  g.rect(cx - 1 + tilt, top + hh * 0.3, 2, hh * 0.5).fill({ color: COL_HELM_DK });

  // Faint eye glow
  g.circle(cx - 2 + tilt, top + hh * 0.5, 0.8).fill({ color: 0x445566, alpha: 0.4 });
  g.circle(cx + 2 + tilt, top + hh * 0.5, 0.8).fill({ color: 0x445566, alpha: 0.4 });

  // Brow ridge
  g.rect(x + 2, top + hh * 0.35, hw - 4, 1.2).fill({ color: COL_HELM_DK });

  // Rust on helm
  g.rect(x + hw - 4, top + 2, 3, 2).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 15;
  const x = cx - cw / 2 - 2;

  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });

  // Fold lines
  const mid = capeTop + capeH * 0.5;
  g.moveTo(x + 4, capeTop + 3)
    .lineTo(x + 3 + wave * 0.5, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.4, alpha: 0.35 });
  g.moveTo(x + cw - 4, capeTop + 3)
    .lineTo(x + cw - 3 + wave, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.4, alpha: 0.35 });
  g.moveTo(x + cw / 2, capeTop + 4)
    .lineTo(x + cw / 2 + wave, capeTop + capeH - 3)
    .stroke({ color: COL_CAPE_HI, width: 0.3, alpha: 0.2 });

  // Tattered edge
  for (let i = 0; i < 4; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 3)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
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
  // Armored sleeve
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 4 });
  // Elbow cop
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2.8)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  // Gauntlet
  g.circle(ex, ey, 2.5).fill({ color: color === COL_SKIN ? COL_PLATE : color });
}

function drawAxe(
  g: Graphics,
  handleBaseX: number,
  handleBaseY: number,
  angle: number,
  handleLen = 24,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const headX = handleBaseX + sin * handleLen;
  const headY = handleBaseY - cos * handleLen;

  // Dark wooden handle
  g.moveTo(handleBaseX, handleBaseY)
    .lineTo(headX, headY)
    .stroke({ color: COL_AXE_HANDLE, width: 3 });
  g.moveTo(handleBaseX + cos * 0.4, handleBaseY + sin * 0.4)
    .lineTo(headX + cos * 0.4, headY + sin * 0.4)
    .stroke({ color: COL_AXE_HANDLE_DK, width: 0.6 });

  // Leather wrap
  const wrapX = handleBaseX + sin * 4;
  const wrapY = handleBaseY - cos * 4;
  g.circle(wrapX, wrapY, 2.5).fill({ color: COL_AXE_WRAP });

  // Metal ferrule
  g.circle(headX, headY, 2.5).fill({ color: COL_AXE_METAL });

  // Axe head — blackened wedge
  const bladeW = 9;
  const bladeH = 8;

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
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.6 });

  // Cutting edge highlight
  g.moveTo(b2x, b2y)
    .lineTo(b1x, b1y)
    .lineTo(b3x, b3y)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.8, alpha: 0.5 });

  // Back spike
  const s1x = headX - cos * 4;
  const s1y = headY - sin * 4;
  const s2x = headX - cos * 4 + sin * 4;
  const s2y = headY - sin * 4 - cos * 4;
  g.moveTo(headX, headY)
    .lineTo(s1x, s1y)
    .lineTo(s2x, s2y)
    .closePath()
    .fill({ color: COL_AXE_BLADE_DK });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 13;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe arm (right) — resting on shoulder
  const axeAngle = -0.3 + Math.sin(t * Math.PI * 2) * 0.03;
  const handX = CX + 11;
  const handY = torsoTop + torsoH - 3;
  drawArm(g, CX + 9, torsoTop + 5, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 22);

  // Off-hand
  drawArm(g, CX - 9, torsoTop + 5, CX - 11, torsoTop + 11);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const legH = 12;
  const torsoH = 16;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 13;

  const capeWave = -walk * 1.3;

  drawShadow(g, CX, GY, 16 + Math.abs(walk) * 2, 5);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHelm(g, CX, helmTop, walk * 0.4);

  // Axe swings with gait
  const handX = CX + 11 + walk * 0.6;
  const handY = torsoTop + torsoH - 3;
  drawArm(g, CX + 9, torsoTop + 5, handX, handY);
  drawAxe(g, handX, handY, -0.25 + walk * 0.08, 22);

  // Off-hand swings opposite
  drawArm(g, CX - 9, torsoTop + 5, CX - 11 - walk * 0.5, torsoTop + 10 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: overhead arc chop
  const phases = [0, 0.1, 0.22, 0.38, 0.52, 0.68, 0.84, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  const lean = t < 0.52 ? t * 3 : (1 - t) * 5.5;

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

  const armReach = t < 0.52 ? t * 3.5 : (1 - t) * 7;
  const lunge = t > 0.3 && t < 0.85 ? 5 : 0;

  drawShadow(g, CX + lean, GY, 16 + lean, 5);
  drawCape(g, CX + lean * 0.3, torsoTop + 3, legH + torsoH - 3, -lean * 0.6);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Axe arm — big swing
  const handX = CX + 10 + lean + armReach;
  const handY = torsoTop + 4;
  drawArm(g, CX + 9 + lean, torsoTop + 5, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 24);

  // Off-hand braces
  drawArm(g, CX - 9 + lean, torsoTop + 5, CX - 10, torsoTop + 11);

  // Impact flash at apex of downswing
  if (t >= 0.58 && t <= 0.78) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.68) / 0.1);
    const impX = handX + Math.sin(axeAngle) * 24;
    const impY = handY - Math.cos(axeAngle) * 24;
    g.circle(impX, impY, 7).fill({ color: 0xffffff, alpha: impactAlpha * 0.3 });
    g.circle(impX, impY, 4).fill({ color: COL_AXE_BLADE_HI, alpha: impactAlpha * 0.2 });
  }

  // Swing trail
  if (t >= 0.45 && t <= 0.72) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.58) / 0.14);
    g.moveTo(handX + 2, handY - 18)
      .bezierCurveTo(
        handX + 14,
        handY - 8,
        handX + 16,
        handY + 8,
        handX + 10,
        handY + 18,
      )
      .stroke({ color: 0xffffff, width: 2.5, alpha: trailAlpha * 0.35 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: battle cry
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  // Dark battle-cry aura
  const glowR = 10 + intensity * 6 + pulse * 4;
  g.circle(CX, torsoTop - 5, glowR).fill({
    color: 0x334455,
    alpha: 0.06 + intensity * 0.06,
  });
  g.circle(CX, torsoTop - 5, glowR * 0.55).fill({
    color: 0x334455,
    alpha: 0.08 + intensity * 0.06,
  });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe raised overhead
  const raise = intensity * 6;
  const handX = CX + 6;
  const handY = torsoTop - 4 - raise;
  drawArm(g, CX + 9, torsoTop + 4, handX, handY);
  drawAxe(g, handX, handY, -0.1 + pulse * 0.05, 22);

  // Off-hand fist pumped
  drawArm(g, CX - 9, torsoTop + 4, CX - 10, torsoTop + 3 - raise * 0.5);

  // War cry lines
  if (intensity > 0.3) {
    for (let i = 0; i < 3; i++) {
      const angle = -0.5 + i * 0.5;
      const lineLen = 5 + pulse * 4;
      const startR = 9;
      const sx = CX + Math.cos(angle) * startR;
      const sy = helmTop + 6 + Math.sin(angle) * startR * 0.5;
      const ex = CX + Math.cos(angle) * (startR + lineLen);
      const ey = helmTop + 6 + Math.sin(angle) * (startR + lineLen) * 0.5;
      g.moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({ color: 0x667788, width: 1, alpha: clamp01(intensity - 0.3) * 0.35 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;

  const fallX = t * 12;
  const dropY = t * t * 12;
  const fallAngle = t * 1.0;

  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 13;

  drawShadow(g, CX + fallX * 0.4, GY, 16 + t * 5, 5, 0.35 * (1 - t * 0.4));

  // Cape crumples
  if (t < 0.85) {
    drawCape(
      g,
      CX + fallX * 0.2,
      torsoTop + 3,
      (legH + torsoH - 3) * (1 - t * 0.3),
      t * 2.5,
    );
  }

  // Legs buckle
  const squash = Math.round(t * 4);
  drawBoots(g, CX + fallX * 0.15, GY, t * 3, -t, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.15,
      legTop + dropY * 0.5,
      legH - squash,
      t * 3,
      -t,
    );
  }

  // Torso falls
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 3.5,
  );
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.4, fallAngle * 4);

  // Axe tumbles away
  if (t < 0.8) {
    const adx = CX + 14 + t * 12;
    const ady = torsoTop + torsoH * 0.4 + t * 8;
    drawAxe(g, adx, ady, 0.5 + t * 2.8, 22 * (1 - t * 0.3));
  }

  // Arm flopped
  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 6,
      torsoTop + 5,
      CX + fallX * 0.4 + 12,
      torsoTop + torsoH - 3,
      COL_PLATE,
    );
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

export function generateAncientAxemanFrames(
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
