// Procedural sprite generator for the Elder Javelineer unit type.
//
// T6 "Elder" variant — 48×96 frame (1×2 tiles). A colossal horror
// hurling javelins of black iron. Void-black plate, dead grey flesh,
// massive tower shield fragment as buckler.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 48;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

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

const COL_CAPE = 0x120e18;
const COL_CAPE_DK = 0x08060e;

const COL_JAVELIN = 0x222230;
const COL_JAVELIN_HEAD = 0x383844;
const COL_JAVELIN_WRAP = 0x1a100a;

const COL_SHIELD = 0x1e1e28;
const COL_SHIELD_DK = 0x121220;
const COL_SHIELD_RIM = 0x2a2a38;

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

function drawShadow(g: Graphics, cx: number, gy: number, w = 18, h = 6, alpha = 0.4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
  const bw = 7;
  const bh = 9 - squash;
  g.roundRect(cx - 9 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx - 8.5 + stanceL, gy - bh - 4, 6, 5, 0.5).fill({ color: COL_GREAVE });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx + 2.5 + stanceR, gy - bh - 4, 6, 5, 0.5).fill({ color: COL_GREAVE });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  g.rect(cx - 7 + stanceL, legTop, 6, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 6, legH).fill({ color: COL_MAIL_DK });
  for (let r = 1; r < legH - 1; r += 2) {
    g.moveTo(cx - 6.5 + stanceL, legTop + r)
      .lineTo(cx - 1.5 + stanceL, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.3, alpha: 0.2 });
    g.moveTo(cx + 1.5 + stanceR, legTop + r)
      .lineTo(cx + 6.5 + stanceR, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.3, alpha: 0.2 });
  }
  g.ellipse(cx - 4 + stanceL, legTop + 1, 5, 4)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.ellipse(cx + 4 + stanceR, legTop + 1, 5, 4)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 20;
  const x = cx - tw / 2 + tilt;

  g.roundRect(x - 1, top, tw + 2, h, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.7 });
  for (let row = 3; row < h - 1; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.3, alpha: 0.2 });
  }

  g.roundRect(x + 2, top + 1, tw - 4, h - 5, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.roundRect(x + 3, top + 2, tw - 6, 2, 0.5).fill({ color: COL_PLATE_HI, alpha: 0.25 });

  g.rect(x + 5, top + h * 0.35, 3, 4).fill({ color: COL_RUNE, alpha: 0.15 });
  g.rect(x + tw - 7, top + h * 0.5, 2, 3).fill({ color: COL_RUST, alpha: 0.2 });

  // Pauldrons
  g.ellipse(x - 1, top + 4, 6, 5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 3, 1).fill({ color: COL_RIVET });
  g.ellipse(x + tw + 1, top + 4, 6, 5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 3, 1).fill({ color: COL_RIVET });

  g.rect(x, top + h - 5, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 3.5, 2).fill({ color: COL_BELT_BUCKLE });

  g.rect(x + 1, top + h - 2, tw - 2, 5)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.3 });
}

function drawHelm(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 14;
  const hh = 15;
  const x = cx - hw / 2 + tilt;

  // Open-face ancient helm
  g.roundRect(x, top, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });
  g.roundRect(x + 2, top + 1, 7, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.25 });

  // Brow ridge
  g.rect(x + 1, top + hh * 0.35, hw - 2, 2).fill({ color: COL_HELM_DK });

  // Face opening
  g.rect(x + 3, top + hh * 0.42, hw - 6, 5).fill({ color: COL_VISOR });

  // Glowing eyes
  g.circle(cx - 2.5 + tilt, top + hh * 0.5, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
  g.circle(cx + 2.5 + tilt, top + hh * 0.5, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });

  // Nose guard
  g.rect(cx - 0.8 + tilt, top + hh * 0.38, 1.6, hh * 0.35).fill({ color: COL_HELM_DK });

  g.rect(x + hw - 4, top + 2, 3, 2).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawCape(g: Graphics, cx: number, capeTop: number, capeH: number, wave: number): void {
  const cw = 16;
  const x = cx - cw / 2 - 2;
  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 4, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  for (let i = 0; i < 4; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 4)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 4.5 });
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.circle(ex, ey, 2.5).fill({ color: COL_SKIN });
}

function drawShield(g: Graphics, cx: number, cy: number, tilt = 0): void {
  // Broken tower shield fragment
  const sw = 10;
  const sh = 16;
  const x = cx - sw / 2 + tilt;
  g.roundRect(x, cy - sh / 2, sw, sh, 2)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_DK, width: 0.7 });
  // Rim
  g.roundRect(x + 1, cy - sh / 2 + 1, sw - 2, sh - 2, 1.5)
    .stroke({ color: COL_SHIELD_RIM, width: 0.5 });
  // Rivets
  g.circle(x + 2, cy - sh / 2 + 3, 1).fill({ color: COL_RIVET });
  g.circle(x + sw - 2, cy - sh / 2 + 3, 1).fill({ color: COL_RIVET });
  g.circle(x + sw / 2, cy + sh / 2 - 3, 1).fill({ color: COL_RIVET });
  // Rune
  g.circle(x + sw / 2, cy, 2).fill({ color: COL_RUNE, alpha: 0.2 });
  // Damage/broken edge
  g.moveTo(x + sw - 1, cy + sh / 2 - 2)
    .lineTo(x + sw + 1, cy + sh / 2)
    .stroke({ color: COL_SHIELD_DK, width: 1 });
}

function drawJavelin(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  len = 30,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = baseX + sin * len;
  const tipY = baseY - cos * len;

  // Shaft
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_JAVELIN, width: 2.5 });

  // Wrap at grip
  g.circle(baseX + sin * 5, baseY - cos * 5, 2).fill({ color: COL_JAVELIN_WRAP });

  // Iron head — broad leaf shape
  const headLen = 7;
  const hx = tipX;
  const hy = tipY;
  const h1x = hx - cos * 3 + sin * headLen;
  const h1y = hy - sin * 3 - cos * headLen;
  const h2x = hx + cos * 3 + sin * headLen;
  const h2y = hy + sin * 3 - cos * headLen;

  g.moveTo(hx - cos * 3, hy - sin * 3)
    .lineTo(h1x, h1y)
    .lineTo(h2x, h2y)
    .lineTo(hx + cos * 3, hy + sin * 3)
    .closePath()
    .fill({ color: COL_JAVELIN_HEAD })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });

  // Rune glow on head
  g.circle(tipX + sin * 3, tipY - cos * 3, 1.5).fill({ color: COL_RUNE, alpha: 0.25 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 1;

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4 + bob;
  const helmTop = torsoTop - 16;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.5;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 4, legH + torsoH - 4, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Shield on left arm
  drawArm(g, CX - 10, torsoTop + 6, CX - 14, torsoTop + 12);
  drawShield(g, CX - 16, torsoTop + 12);

  // Javelin resting on right shoulder
  drawArm(g, CX + 10, torsoTop + 6, CX + 12, torsoTop + 10);
  drawJavelin(g, CX + 12, torsoTop + 10, -0.3, 28);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 2;

  const legH = 16;
  const torsoH = 22;
  const stanceL = Math.round(walk * 4);
  const stanceR = Math.round(-walk * 4);
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 16;

  const capeWave = -walk * 1.5;

  drawShadow(g, CX, GY, 18 + Math.abs(walk) * 2, 6);
  drawCape(g, CX, torsoTop + 4, legH + torsoH - 4, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.5);
  drawHelm(g, CX, helmTop, walk * 0.5);

  drawArm(g, CX - 10, torsoTop + 6, CX - 14 - walk * 0.5, torsoTop + 12 + walk);
  drawShield(g, CX - 16 - walk * 0.5, torsoTop + 12 + walk);

  drawArm(g, CX + 10, torsoTop + 6, CX + 12 + walk * 0.5, torsoTop + 10 - walk);
  drawJavelin(g, CX + 12 + walk * 0.5, torsoTop + 10 - walk, -0.3 + walk * 0.05, 28);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: wind up → hurl javelin
  const phases = [0, 0.08, 0.18, 0.32, 0.48, 0.62, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4;
  const helmTop = torsoTop - 16;

  // Wind up then lunge forward
  const lean = t < 0.32 ? -t * 4 : t < 0.62 ? lerp(-1.3, 5, (t - 0.32) / 0.3) : (1 - t) * 10;
  const lunge = t > 0.32 && t < 0.82 ? 5 : 0;

  drawShadow(g, CX + lean, GY, 18 + Math.abs(lean), 6);
  drawCape(g, CX + lean * 0.3, torsoTop + 4, legH + torsoH - 4, -lean * 0.5);
  drawBoots(g, CX, GY, -Math.round(Math.max(0, -lean)), Math.round(lunge));
  drawLegs(g, CX, legTop, legH, -Math.round(Math.max(0, -lean)), Math.round(lunge));
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Shield stays on left
  drawArm(g, CX - 10 + lean, torsoTop + 6, CX - 14, torsoTop + 12);
  drawShield(g, CX - 16, torsoTop + 12);

  // Javelin throw
  let javAngle: number;
  if (t < 0.32) {
    javAngle = lerp(-0.3, -1.6, t / 0.32); // wind back
  } else if (t < 0.62) {
    javAngle = lerp(-1.6, 0.8, (t - 0.32) / 0.3); // forward throw
  } else {
    javAngle = lerp(0.8, -0.3, (t - 0.62) / 0.38); // recovery
  }

  const handX = CX + 12 + lean * 1.5;
  const handY = torsoTop + 4;
  drawArm(g, CX + 10 + lean, torsoTop + 5, handX, handY);

  // Only show javelin in hand before release
  if (t < 0.5) {
    drawJavelin(g, handX, handY, javAngle, 30);
  }

  // Javelin in flight after release
  if (t >= 0.48 && t <= 0.82) {
    const flightT = (t - 0.48) / 0.34;
    const jx = handX + flightT * 30;
    const jy = handY - 2;
    g.moveTo(jx, jy).lineTo(jx + 18, jy).stroke({ color: COL_JAVELIN_HEAD, width: 2.5, alpha: 1 - flightT * 0.5 });
    g.circle(jx + 18, jy, 2).fill({ color: COL_RUNE, alpha: (1 - flightT) * 0.4 });
  }

  // Impact flash
  if (t >= 0.58 && t <= 0.78) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.68) / 0.1);
    g.circle(CX + 38, torsoTop + 4, 6).fill({ color: 0xffffff, alpha: impactAlpha * 0.25 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4;
  const helmTop = torsoTop - 16;

  const glowR = 14 + intensity * 8 + pulse * 5;
  g.circle(CX, torsoTop - 8, glowR).fill({ color: COL_RUNE, alpha: 0.06 + intensity * 0.06 });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 4, legH + torsoH - 4, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  drawArm(g, CX - 10, torsoTop + 6, CX - 14, torsoTop + 10);
  drawShield(g, CX - 16, torsoTop + 10);

  const raise = intensity * 7;
  drawArm(g, CX + 10, torsoTop + 5, CX + 12, torsoTop - 4 - raise);
  drawJavelin(g, CX + 12, torsoTop - 4 - raise, -0.1 + pulse * 0.05, 28);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fallX = t * 14;
  const dropY = t * t * 16;

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4 + dropY;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX + fallX * 0.4, GY, 18 + t * 6, 6, 0.4 * (1 - t * 0.4));

  if (t < 0.85) {
    drawCape(g, CX + fallX * 0.2, torsoTop + 4, (legH + torsoH - 4) * (1 - t * 0.3), t * 3);
  }

  const squash = Math.round(t * 5);
  drawBoots(g, CX + fallX * 0.15, GY, t * 4, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 4, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), t * 4);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.4, t * 5);

  // Javelin tumbles
  if (t < 0.8) {
    const jdx = CX + 16 + t * 14;
    const jdy = torsoTop + torsoH * 0.3 + t * 8;
    drawJavelin(g, jdx, jdy, 0.5 + t * 3, 24);
  }

  // Shield drops
  if (t < 0.7) {
    drawShield(g, CX - 14 + fallX * 0.2, torsoTop + 14 + t * 6, t * 3);
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

export function generateElderJavelineerFrames(
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
