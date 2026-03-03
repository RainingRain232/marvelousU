// Procedural sprite generator for the Ancient Longbowman unit type.
//
// A T4 "Ancient One" variant of the Longbowman — bigger (48×72 frame),
// blackened/corroded armor, grey undead-looking skin,
// massive ancient greatbow with spectral string, enormous range.

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

const COL_CAPE = 0x1a2218;
const COL_CAPE_DK = 0x0e160e;

const COL_BELT = 0x2a2218;
const COL_BELT_BUCKLE = 0x404048;

const COL_BOOT = 0x222228;
const COL_BOOT_DK = 0x151518;
const COL_GREAVE = 0x303038;

const COL_RIVET = 0x606068;

const COL_BOW = 0x1e1408;
const COL_BOW_DK = 0x100a04;
const COL_BOW_WRAP = 0x2a1a10;
const COL_STRING = 0x7788aa;
const COL_ARROW = 0x888890;
const COL_QUIVER = 0x2a2018;

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, w = 16, h = 5, alpha = 0.35): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
  const bw = 6;
  const bh = 7 - squash;
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  g.roundRect(cx - 7.5 + stanceL, gy - bh - 3, 5, 4, 0.5).fill({ color: COL_GREAVE });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  g.roundRect(cx + 2.5 + stanceR, gy - bh - 3, 5, 4, 0.5).fill({ color: COL_GREAVE });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  g.rect(cx - 6 + stanceL, legTop, 5, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 5, legH).fill({ color: COL_MAIL_DK });
  for (let r = 1; r < legH - 1; r += 2) {
    g.moveTo(cx - 5.5 + stanceL, legTop + r)
      .lineTo(cx - 1.5 + stanceL, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
    g.moveTo(cx + 1.5 + stanceR, legTop + r)
      .lineTo(cx + 5.5 + stanceR, legTop + r)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
  }
  g.ellipse(cx - 3.5 + stanceL, legTop + 1, 4, 3)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.ellipse(cx + 3.5 + stanceR, legTop + 1, 4, 3)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 16;
  const x = cx - tw / 2 + tilt;

  g.roundRect(x - 1, top, tw + 2, h, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.7 });

  for (let row = 3; row < h - 1; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
  }

  g.roundRect(x + 2, top + 1, tw - 4, h - 4, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.roundRect(x + 3, top + 2, tw - 6, 2, 0.5).fill({ color: COL_PLATE_HI, alpha: 0.3 });

  g.rect(x + 5, top + h * 0.4, 3, 3).fill({ color: COL_RUST, alpha: 0.25 });

  // Lighter shoulders for longbowman
  g.ellipse(x - 1, top + 3, 4.5, 3.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 2, 0.8).fill({ color: COL_RIVET });
  g.ellipse(x + tw + 1, top + 3, 4.5, 3.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 2, 0.8).fill({ color: COL_RIVET });

  // Belt
  g.rect(x, top + h - 4, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 2.5, 1.8).fill({ color: COL_BELT_BUCKLE });
}

function drawHelm(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 12;
  const hh = 12;
  const x = cx - hw / 2 + tilt;

  // Hooded helm
  g.roundRect(x, top, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });
  g.roundRect(x + 2, top + 1, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.3 });

  // Pointed hood peak
  g.moveTo(cx + tilt, top - 3)
    .lineTo(cx - 4 + tilt, top + 2)
    .lineTo(cx + 4 + tilt, top + 2)
    .closePath()
    .fill({ color: COL_HELM });

  // Eye slit
  g.rect(x + 3, top + hh * 0.4, hw - 6, 2.5).fill({ color: COL_VISOR });

  g.circle(cx - 2 + tilt, top + hh * 0.47, 0.8).fill({ color: 0x445566, alpha: 0.4 });
  g.circle(cx + 2 + tilt, top + hh * 0.47, 0.8).fill({ color: 0x445566, alpha: 0.4 });
}

function drawQuiver(g: Graphics, cx: number, cy: number): void {
  const rx = cx - 13;
  const ry = cy - 3;
  g.moveTo(rx, ry)
    .lineTo(rx + 6, ry - 1)
    .lineTo(rx + 8, ry + 14)
    .lineTo(rx + 2, ry + 15)
    .closePath()
    .fill({ color: COL_QUIVER })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  // Many arrow fletchings
  g.rect(rx + 1, ry - 6, 1.5, 6).fill({ color: COL_ARROW });
  g.rect(rx + 3, ry - 7, 1.5, 7).fill({ color: COL_ARROW });
  g.rect(rx + 5, ry - 5, 1.5, 5).fill({ color: COL_ARROW });
}

function drawCape(g: Graphics, cx: number, capeTop: number, capeH: number, wave: number): void {
  const cw = 14;
  const x = cx - cw / 2 - 2;
  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  for (let i = 0; i < 3; i++) {
    const tx = x + 2 + i * 4;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 3)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 3.5 });
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2.2)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.circle(ex, ey, 2).fill({ color: COL_SKIN });
}

function drawGreatbow(g: Graphics, bowX: number, bowY: number, angle: number, pull: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bowLen = 36; // Very large bow
  const curve = 7 + pull * 5;

  const x1 = bowX + (0 * cos - (-bowLen / 2) * sin);
  const y1 = bowY + (0 * sin + (-bowLen / 2) * cos);
  const x2 = bowX + (0 * cos - (bowLen / 2) * sin);
  const y2 = bowY + (0 * sin + (bowLen / 2) * cos);
  const cpx = bowX + (-curve * cos);
  const cpy = bowY + (-curve * sin);

  // Massive greatbow — dark ancient wood
  g.moveTo(x1, y1)
    .quadraticCurveTo(cpx, cpy, x2, y2)
    .stroke({ color: COL_BOW, width: 3 });
  g.moveTo(x1, y1)
    .quadraticCurveTo(cpx - 1, cpy, x2, y2)
    .stroke({ color: COL_BOW_DK, width: 0.8, alpha: 0.5 });

  // Leather wrapping at grip
  const gripY = bowY;
  g.rect(bowX - 2, gripY - 3, 4, 6).fill({ color: COL_BOW_WRAP });

  // Spectral bowstring
  const stringX = -pull * 14;
  const sx = bowX + (stringX * cos);
  const sy = bowY + (stringX * sin);
  g.moveTo(x1, y1)
    .lineTo(sx, sy)
    .lineTo(x2, y2)
    .stroke({ color: COL_STRING, width: 0.9, alpha: 0.6 });

  // Arrow (long shaft)
  if (pull > 0.1) {
    const arrowLen = 20;
    const ax = sx + arrowLen * cos;
    const ay = sy + arrowLen * sin;
    g.moveTo(sx, sy)
      .lineTo(ax, ay)
      .stroke({ color: COL_ARROW, width: 1.5 });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;

  const legH = 12;
  const torsoH = 15;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 12;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawQuiver(g, CX, torsoTop + 4);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Holding greatbow upright at side
  drawArm(g, CX - 8, torsoTop + 5, CX - 11, torsoTop + 10);
  drawGreatbow(g, CX - 12, torsoTop + 4, -0.1, 0);

  drawArm(g, CX + 8, torsoTop + 5, CX + 10, torsoTop + 11);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const legH = 12;
  const torsoH = 15;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 12;

  const capeWave = -walk * 1.3;

  drawShadow(g, CX, GY, 16 + Math.abs(walk) * 2, 5);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawQuiver(g, CX, torsoTop + 4);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHelm(g, CX, helmTop, walk * 0.4);

  const bowX = CX - 11 + walk;
  const bowY = torsoTop + 6 + bob;
  drawArm(g, CX - 8, torsoTop + 5, bowX + 1, bowY + 2);
  drawGreatbow(g, bowX, bowY, -0.15 + walk * 0.08, 0);

  drawArm(g, CX + 8, torsoTop + 5, CX + 10 - walk * 0.5, torsoTop + 10 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  let pull = 0;
  let bowAngle = 0;
  let lunge = 0;

  if (frame <= 1) {
    bowAngle = lerp(0, Math.PI / 2, frame / 1);
  } else if (frame <= 4) {
    bowAngle = Math.PI / 2;
    pull = lerp(0.15, 0.85, (frame - 2) / 2);
    lunge = (frame - 2) * 1;
  } else if (frame === 5) {
    bowAngle = Math.PI / 2;
    pull = 1.0;
    lunge = 3;
  } else if (frame === 6) {
    bowAngle = Math.PI / 2;
    pull = -0.2;
    lunge = 2.5;
  } else {
    bowAngle = lerp(Math.PI / 2, 0.3, (frame - 6) / 1);
    pull = 0;
    lunge = 0.5;
  }

  const legH = 12;
  const torsoH = 15;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 12;

  drawShadow(g, CX + lunge * 0.5, GY, 16 + lunge);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, -lunge * 0.3);
  drawQuiver(g, CX, torsoTop + 4);
  drawBoots(g, CX, GY, -1, Math.round(lunge));
  drawLegs(g, CX, legTop, legH, -1, Math.round(lunge));
  drawTorso(g, CX, torsoTop, torsoH, lunge * 0.15);
  drawHelm(g, CX, helmTop, lunge * 0.15);

  const bowX = CX + 14 + lunge;
  const bowY = torsoTop + 1;

  drawArm(g, CX + 6 + lunge * 0.2, torsoTop + 4, bowX, bowY);

  const stringPullX = bowX - pull * 14;
  drawArm(g, CX - 6 + lunge * 0.2, torsoTop + 5, stringPullX * 0.8, bowY);

  drawGreatbow(g, bowX, bowY, bowAngle, Math.max(0, pull));

  // Arrow flight on release — long trail for longbow
  if (frame === 6) {
    g.moveTo(bowX + 5, bowY)
      .lineTo(bowX + 40, bowY)
      .stroke({ color: 0x8899bb, width: 2, alpha: 0.5 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 12;
  const torsoH = 15;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 12;

  const glowR = 10 + intensity * 6 + pulse * 4;
  g.circle(CX, torsoTop - 5, glowR).fill({ color: 0x334455, alpha: 0.06 + intensity * 0.06 });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.5 - 0.25);
  drawQuiver(g, CX, torsoTop + 4);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  const raise = intensity * 5;
  drawArm(g, CX + 8, torsoTop + 4, CX + 10, torsoTop - 4 - raise);
  drawGreatbow(g, CX + 10, torsoTop - 6 - raise, Math.PI / 4, 0);

  drawArm(g, CX - 8, torsoTop + 4, CX - 10, torsoTop + 3 - raise * 0.5);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fallX = t * 12;
  const dropY = t * t * 12;

  const legH = 12;
  const torsoH = 15;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 12;

  drawShadow(g, CX + fallX * 0.4, GY, 16 + t * 5, 5, 0.35 * (1 - t * 0.4));

  if (t < 0.85) {
    drawCape(g, CX + fallX * 0.2, torsoTop + 3, (legH + torsoH - 3) * (1 - t * 0.3), t * 2.5);
  }

  const squash = Math.round(t * 4);
  drawBoots(g, CX + fallX * 0.15, GY, t * 3, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 3, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), t * 3.5);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.4, t * 4);

  // Greatbow falls away
  if (t < 0.9) {
    const bowDropX = CX + 14 + t * 14;
    const bowDropY = GY - 10 + t * 5;
    drawGreatbow(g, bowDropX, bowDropY, 0.5 + t * 4, 0);
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

export function generateAncientLongbowmanFrames(
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
