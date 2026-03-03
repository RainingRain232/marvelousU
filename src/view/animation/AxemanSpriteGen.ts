// Procedural sprite generator for the Axeman unit type.
//
// Draws a heavily armored axe warrior at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Steel plate armor over chainmail
//   • Open-faced iron helm with nose guard and cheek plates
//   • Single-handed battle axe with wedge blade
//   • Large shoulder pauldrons with rivets
//   • Crimson cape flowing behind
//   • Thick leather belt with iron buckle
//   • Heavy armored boots with greaves
//   • Chainmail skirt below torso

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — steel and crimson
const COL_SKIN = 0xd4a574;

const COL_PLATE = 0x8899aa; // steel plate
const COL_PLATE_HI = 0xaabbcc;
const COL_PLATE_DK = 0x667788;

const COL_MAIL = 0x778899; // chainmail
const COL_MAIL_HI = 0x99aabb;
const COL_MAIL_DK = 0x556677;

const COL_HELM = 0x8494a4; // iron helm
const COL_HELM_HI = 0xa8b8c8;
const COL_HELM_DK = 0x5e6e7e;
const COL_VISOR = 0x1a1a2e;

const COL_CAPE = 0x8b2222; // crimson
const COL_CAPE_DK = 0x6b1111;
const COL_CAPE_HI = 0xa03030;

const COL_AXE_BLADE = 0x8899aa; // axe head steel
const COL_AXE_BLADE_HI = 0xb0c0d0;
const COL_AXE_BLADE_DK = 0x5a6a7a;
const COL_AXE_HANDLE = 0x5a3a1a; // oak handle
const COL_AXE_HANDLE_DK = 0x3a2810;
const COL_AXE_WRAP = 0x4a3420; // leather wrap
const COL_AXE_METAL = 0x808898; // ferrule

const COL_BELT = 0x4a3a28;
const COL_BELT_BUCKLE = 0x808898;

const COL_BOOT = 0x443322;
const COL_BOOT_DK = 0x332211;
const COL_GREAVE = 0x6e7e8e; // shin armor

const COL_RIVET = 0xc0c8d0;

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
  h = 4,
  alpha = 0.3,
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
  const bw = 5;
  const bh = 5 - squash;
  // Left boot with greave
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx - 6.5 + stanceL, gy - bh - 2, 4, 3, 0.5).fill({ color: COL_GREAVE });
  // Right boot with greave
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx + 2.5 + stanceR, gy - bh - 2, 4, 3, 0.5).fill({ color: COL_GREAVE });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Armored legs
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_MAIL_DK });
  // Chainmail texture
  for (let r = 1; r < legH - 1; r += 2) {
    g.moveTo(cx - 4.5 + stanceL, legTop + r)
      .lineTo(cx - 1.5 + stanceL, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.2, alpha: 0.3 });
    g.moveTo(cx + 1.5 + stanceR, legTop + r)
      .lineTo(cx + 4.5 + stanceR, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.2, alpha: 0.3 });
  }
  // Knee armor
  g.ellipse(cx - 3 + stanceL, legTop + 1, 3, 2.5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.ellipse(cx + 3 + stanceR, legTop + 1, 3, 2.5)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;

  // Chainmail base
  g.roundRect(x - 1, top, tw + 2, h, 2)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.6 });

  // Mail texture
  for (let row = 2; row < h - 1; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.35 });
  }

  // Steel breastplate over center
  g.roundRect(x + 2, top + 1, tw - 4, h - 3, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Plate highlight
  g.roundRect(x + 3, top + 2, tw - 6, 2, 0.5).fill({ color: COL_PLATE_HI, alpha: 0.4 });

  // Heavy shoulder pauldrons with rivets
  // Left pauldron
  g.ellipse(x - 1, top + 2, 5, 3.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 1, 0.7).fill({ color: COL_RIVET });
  g.circle(x + 1, top + 3, 0.7).fill({ color: COL_RIVET });
  // Right pauldron
  g.ellipse(x + tw + 1, top + 2, 5, 3.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 1, 0.7).fill({ color: COL_RIVET });
  g.circle(x + tw - 1, top + 3, 0.7).fill({ color: COL_RIVET });

  // Belt
  g.rect(x, top + h - 3, tw, 2.5).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 1.8, 1.5).fill({ color: COL_BELT_BUCKLE });

  // Chainmail skirt below belt
  g.rect(x + 1, top + h - 1, tw - 2, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.3 });
}

function drawHelm(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 11;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Main helm dome
  g.roundRect(x, top, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.6 });

  // Highlight
  g.roundRect(x + 2, top + 1, 5, 3, 1).fill({ color: COL_HELM_HI, alpha: 0.45 });

  // Cheek plates
  g.roundRect(x, top + hh * 0.4, 3, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });
  g.roundRect(x + hw - 3, top + hh * 0.4, 3, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });

  // Eye opening
  g.rect(x + 3, top + hh * 0.4, hw - 6, 2.5).fill({ color: COL_VISOR });

  // Nose guard
  g.rect(cx - 0.8 + tilt, top + hh * 0.3, 1.6, hh * 0.5).fill({ color: COL_HELM_DK });

  // Eyes visible in visor
  g.circle(cx - 1.5 + tilt, top + hh * 0.5, 0.6).fill({ color: COL_SKIN });
  g.circle(cx + 1.5 + tilt, top + hh * 0.5, 0.6).fill({ color: COL_SKIN });

  // Brow ridge
  g.rect(x + 2, top + hh * 0.35, hw - 4, 1).fill({ color: COL_HELM_DK });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 12;
  const x = cx - cw / 2 - 2;

  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });

  // Fold lines
  const mid = capeTop + capeH * 0.5;
  g.moveTo(x + 3, capeTop + 2)
    .lineTo(x + 2 + wave * 0.5, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.4, alpha: 0.4 });
  g.moveTo(x + cw - 3, capeTop + 2)
    .lineTo(x + cw - 2 + wave, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.4, alpha: 0.4 });
  // Highlight fold
  g.moveTo(x + cw / 2, capeTop + 3)
    .lineTo(x + cw / 2 + wave, capeTop + capeH - 2)
    .stroke({ color: COL_CAPE_HI, width: 0.3, alpha: 0.3 });
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
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 3.5 });
  // Elbow cop
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2.2)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  // Gauntlet
  g.circle(ex, ey, 2).fill({ color: color === COL_SKIN ? COL_PLATE : color });
}

function drawAxe(
  g: Graphics,
  handleBaseX: number,
  handleBaseY: number,
  angle: number,
  handleLen = 20,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const headX = handleBaseX + sin * handleLen;
  const headY = handleBaseY - cos * handleLen;

  // Wooden handle
  g.moveTo(handleBaseX, handleBaseY)
    .lineTo(headX, headY)
    .stroke({ color: COL_AXE_HANDLE, width: 2.5 });
  // Handle grain highlight
  g.moveTo(handleBaseX + cos * 0.4, handleBaseY + sin * 0.4)
    .lineTo(headX + cos * 0.4, headY + sin * 0.4)
    .stroke({ color: COL_AXE_HANDLE_DK, width: 0.5 });

  // Leather wrap near grip
  const wrapX = handleBaseX + sin * 3;
  const wrapY = handleBaseY - cos * 3;
  g.circle(wrapX, wrapY, 2).fill({ color: COL_AXE_WRAP });

  // Metal ferrule at base of head
  g.circle(headX, headY, 2).fill({ color: COL_AXE_METAL });

  // Axe head — wedge shape
  const bladeW = 7;
  const bladeH = 6;

  // Right side blade (cutting edge)
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
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.5 });

  // Cutting edge highlight
  g.moveTo(b2x, b2y)
    .lineTo(b1x, b1y)
    .lineTo(b3x, b3y)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.8, alpha: 0.6 });

  // Back spike (smaller)
  const s1x = headX - cos * 3;
  const s1y = headY - sin * 3;
  const s2x = headX - cos * 3 + sin * 3;
  const s2y = headY - sin * 3 - cos * 3;
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

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 10;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe arm (right) — axe resting on shoulder
  const axeAngle = -0.3 + Math.sin(t * Math.PI * 2) * 0.03;
  const handX = CX + 9;
  const handY = torsoTop + torsoH - 2;
  drawArm(g, CX + 7, torsoTop + 4, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 18);

  // Off-hand just relaxed at side
  drawArm(g, CX - 7, torsoTop + 4, CX - 9, torsoTop + 9);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const legH = 9;
  const torsoH = 12;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 10;

  const capeWave = -walk * 1.3;

  drawShadow(g, CX, GY, 14 + Math.abs(walk) * 2, 4);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHelm(g, CX, helmTop, walk * 0.4);

  // Axe swings slightly with gait
  const handX = CX + 9 + walk * 0.6;
  const handY = torsoTop + torsoH - 2;
  drawArm(g, CX + 7, torsoTop + 4, handX, handY);
  drawAxe(g, handX, handY, -0.25 + walk * 0.08, 18);

  // Off-hand swings opposite
  drawArm(g, CX - 7, torsoTop + 4, CX - 9 - walk * 0.5, torsoTop + 8 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: 0-1=windup  2-3=raise overhead  4=apex  5-6=chop down  7=recover
  const phases = [0, 0.1, 0.22, 0.38, 0.52, 0.68, 0.84, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Lean forward into the chop
  const lean = t < 0.52 ? t * 2.5 : (1 - t) * 5;

  // Axe arc: resting → overhead behind → smash down → recover
  let axeAngle: number;
  if (t < 0.22) {
    axeAngle = lerp(-0.3, -1.8, t / 0.22); // pull back
  } else if (t < 0.52) {
    axeAngle = lerp(-1.8, -2.5, (t - 0.22) / 0.3); // raise high
  } else if (t < 0.84) {
    axeAngle = lerp(-2.5, 1.2, (t - 0.52) / 0.32); // smash down
  } else {
    axeAngle = lerp(1.2, -0.3, (t - 0.84) / 0.16); // recover
  }

  const armReach = t < 0.52 ? t * 3 : (1 - t) * 6;
  const lunge = t > 0.3 && t < 0.85 ? 4 : 0;

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawCape(g, CX + lean * 0.3, torsoTop + 2, legH + torsoH - 2, -lean * 0.6);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Axe arm — big swing
  const handX = CX + 8 + lean + armReach;
  const handY = torsoTop + 3;
  drawArm(g, CX + 7 + lean, torsoTop + 4, handX, handY);
  drawAxe(g, handX, handY, axeAngle, 20);

  // Off-hand braces
  drawArm(g, CX - 7 + lean, torsoTop + 4, CX - 8, torsoTop + 9);

  // Impact flash at apex of downswing
  if (t >= 0.58 && t <= 0.78) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.68) / 0.1);
    const impX = handX + Math.sin(axeAngle) * 20;
    const impY = handY - Math.cos(axeAngle) * 20;
    g.circle(impX, impY, 6).fill({ color: 0xffffff, alpha: impactAlpha * 0.35 });
    g.circle(impX, impY, 3).fill({ color: COL_AXE_BLADE_HI, alpha: impactAlpha * 0.25 });
  }

  // Swing trail
  if (t >= 0.45 && t <= 0.72) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.58) / 0.14);
    g.moveTo(handX + 2, handY - 14)
      .bezierCurveTo(
        handX + 12,
        handY - 6,
        handX + 14,
        handY + 6,
        handX + 8,
        handY + 14,
      )
      .stroke({ color: 0xffffff, width: 2, alpha: trailAlpha * 0.4 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: battle cry — raises axe overhead, white energy radiates
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // White battle-cry glow
  const glowR = 8 + intensity * 5 + pulse * 3;
  g.circle(CX, torsoTop - 4, glowR).fill({
    color: 0xffffff,
    alpha: 0.06 + intensity * 0.08,
  });
  g.circle(CX, torsoTop - 4, glowR * 0.55).fill({
    color: 0xffffff,
    alpha: 0.08 + intensity * 0.08,
  });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Axe raised overhead with one arm
  const raise = intensity * 5;
  const handX = CX + 5;
  const handY = torsoTop - 3 - raise;
  drawArm(g, CX + 7, torsoTop + 3, handX, handY);
  drawAxe(g, handX, handY, -0.1 + pulse * 0.05, 18);

  // Off-hand fist pumped
  drawArm(g, CX - 7, torsoTop + 3, CX - 8, torsoTop + 2 - raise * 0.5);

  // War cry lines radiating from helm
  if (intensity > 0.3) {
    for (let i = 0; i < 3; i++) {
      const angle = -0.5 + i * 0.5;
      const lineLen = 4 + pulse * 3;
      const startR = 7;
      const sx = CX + Math.cos(angle) * startR;
      const sy = helmTop + 5 + Math.sin(angle) * startR * 0.5;
      const ex = CX + Math.cos(angle) * (startR + lineLen);
      const ey = helmTop + 5 + Math.sin(angle) * (startR + lineLen) * 0.5;
      g.moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({ color: 0xffffff, width: 0.8, alpha: clamp01(intensity - 0.3) * 0.4 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: 0=hit  1-2=stagger  3-4=buckle  5-7=collapse
  const t = frame / 7;

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  const fallX = t * 10;
  const dropY = t * t * 10;
  const fallAngle = t * 1.0;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.4, GY, 14 + t * 4, 4, 0.3 * (1 - t * 0.4));

  // Cape crumples
  if (t < 0.85) {
    drawCape(
      g,
      CX + fallX * 0.2,
      torsoTop + 2,
      (legH + torsoH - 2) * (1 - t * 0.3),
      t * 2.5,
    );
  }

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.15, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.15,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
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
    const adx = CX + 12 + t * 10;
    const ady = torsoTop + torsoH * 0.4 + t * 7;
    drawAxe(g, adx, ady, 0.5 + t * 2.8, 18 * (1 - t * 0.3));
  }

  // Arm flopped
  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 4,
      CX + fallX * 0.4 + 10,
      torsoTop + torsoH - 2,
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

/**
 * Generate all axeman sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[], ready to be
 * injected into the AnimationManager cache.
 */
export function generateAxemanFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
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
