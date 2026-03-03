// Procedural sprite generator for the Elder Archer unit type.
//
// T6 "Elder" variant — 48×96 frame (1×2 tiles). A towering void-wraith
// with a bow of petrified shadow. Void-black plate, dead grey flesh,
// spectral arrows.

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

const COL_CAPE = 0x0c1218;
const COL_CAPE_DK = 0x060a0e;

const COL_BOW = 0x141420;
const COL_BOW_DK = 0x0a0a14;
const COL_STRING = 0x6677aa;
const COL_ARROW = 0x667088;
const COL_QUIVER = 0x181418;

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

  // Rune markings
  g.rect(x + 5, top + h * 0.35, 3, 4).fill({ color: COL_RUNE, alpha: 0.15 });
  g.rect(x + tw - 7, top + h * 0.5, 2, 3).fill({ color: COL_RUNE, alpha: 0.12 });

  // Pauldrons
  g.ellipse(x - 1, top + 4, 6, 5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 3, 1).fill({ color: COL_RIVET });
  g.ellipse(x + tw + 1, top + 4, 6, 5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 3, 1).fill({ color: COL_RIVET });

  // Belt
  g.rect(x, top + h - 5, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 3.5, 2).fill({ color: COL_BELT_BUCKLE });

  // Mail skirt
  g.rect(x + 1, top + h - 2, tw - 2, 5)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.3 });
}

function drawHelm(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 14;
  const hh = 15;
  const x = cx - hw / 2 + tilt;

  // Tall pointed hood-helm
  g.roundRect(x, top + 3, hw, hh - 3, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });

  // Pointed peak
  g.moveTo(cx + tilt, top - 2)
    .lineTo(cx - 5 + tilt, top + 5)
    .lineTo(cx + 5 + tilt, top + 5)
    .closePath()
    .fill({ color: COL_HELM });

  g.roundRect(x + 2, top + 4, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.25 });

  // Eye slit
  g.rect(x + 3.5, top + hh * 0.4, hw - 7, 3).fill({ color: COL_VISOR });

  // Glowing eyes
  g.circle(cx - 2.5 + tilt, top + hh * 0.45, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
  g.circle(cx + 2.5 + tilt, top + hh * 0.45, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });

  // Rust
  g.rect(x + hw - 4, top + 5, 3, 2).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawQuiver(g: Graphics, cx: number, cy: number): void {
  const rx = cx - 14;
  const ry = cy - 3;
  g.moveTo(rx, ry)
    .lineTo(rx + 6, ry - 1)
    .lineTo(rx + 8, ry + 16)
    .lineTo(rx + 2, ry + 17)
    .closePath()
    .fill({ color: COL_QUIVER })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.rect(rx + 1, ry - 7, 1.5, 7).fill({ color: COL_ARROW });
  g.rect(rx + 3.5, ry - 8, 1.5, 8).fill({ color: COL_ARROW });
  g.rect(rx + 5.5, ry - 6, 1.5, 6).fill({ color: COL_ARROW });
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

function drawBow(g: Graphics, bowX: number, bowY: number, angle: number, pull: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bowLen = 38;
  const curve = 7 + pull * 5;

  const x1 = bowX - (bowLen / 2) * sin;
  const y1 = bowY + (bowLen / 2) * cos;
  const x2 = bowX + (bowLen / 2) * sin;
  const y2 = bowY - (bowLen / 2) * cos;
  const cpx = bowX - curve * cos;
  const cpy = bowY - curve * sin;

  // Void-dark bow
  g.moveTo(x1, y1)
    .quadraticCurveTo(cpx, cpy, x2, y2)
    .stroke({ color: COL_BOW, width: 3.5 });
  g.moveTo(x1, y1)
    .quadraticCurveTo(cpx - 1, cpy, x2, y2)
    .stroke({ color: COL_BOW_DK, width: 0.8, alpha: 0.5 });

  // Rune glow on bow
  const runeX = bowX - curve * 0.3 * cos;
  const runeY = bowY - curve * 0.3 * sin;
  g.circle(runeX, runeY, 2).fill({ color: COL_RUNE, alpha: 0.2 });

  // Spectral bowstring
  const stringX = -pull * 16;
  const sx = bowX + stringX * cos;
  const sy = bowY + stringX * sin;
  g.moveTo(x1, y1)
    .lineTo(sx, sy)
    .lineTo(x2, y2)
    .stroke({ color: COL_STRING, width: 1, alpha: 0.6 });

  // Arrow
  if (pull > 0.1) {
    const arrowLen = 20;
    const ax = sx + arrowLen * cos;
    const ay = sy + arrowLen * sin;
    g.moveTo(sx, sy)
      .lineTo(ax, ay)
      .stroke({ color: COL_ARROW, width: 1.8 });
    // Spectral arrowhead glow
    g.circle(ax, ay, 2).fill({ color: COL_RUNE, alpha: 0.3 });
  }
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
  drawQuiver(g, CX, torsoTop + 5);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  drawArm(g, CX - 10, torsoTop + 6, CX - 13, torsoTop + 14);
  drawBow(g, CX - 14, torsoTop + 10, -0.15, 0);

  drawArm(g, CX + 10, torsoTop + 6, CX + 12, torsoTop + 14);
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
  drawQuiver(g, CX, torsoTop + 5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.5);
  drawHelm(g, CX, helmTop, walk * 0.5);

  const bowX = CX - 13 + walk;
  const bowY = torsoTop + 10 + bob;
  drawArm(g, CX - 10, torsoTop + 6, bowX + 1, bowY + 2);
  drawBow(g, bowX, bowY, -0.15 + walk * 0.08, 0);

  drawArm(g, CX + 10, torsoTop + 6, CX + 12 - walk * 0.5, torsoTop + 13 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  let pull = 0;
  let bowAngle = 0;
  let lunge = 0;

  if (frame <= 1) {
    bowAngle = lerp(0, Math.PI / 2, frame / 1);
  } else if (frame <= 4) {
    bowAngle = Math.PI / 2;
    pull = lerp(0.2, 0.9, (frame - 2) / 2);
    lunge = (frame - 2) * 1.5;
  } else if (frame === 5) {
    bowAngle = Math.PI / 2;
    pull = 1.0;
    lunge = 4;
  } else if (frame === 6) {
    bowAngle = Math.PI / 2;
    pull = -0.2;
    lunge = 3;
  } else {
    bowAngle = lerp(Math.PI / 2, 0.3, (frame - 6) / 1);
    pull = 0;
    lunge = 1;
  }

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4;
  const helmTop = torsoTop - 16;

  drawShadow(g, CX + lunge * 0.5, GY, 18 + lunge);
  drawCape(g, CX, torsoTop + 4, legH + torsoH - 4, -lunge * 0.3);
  drawQuiver(g, CX, torsoTop + 5);
  drawBoots(g, CX, GY, -1, Math.round(lunge));
  drawLegs(g, CX, legTop, legH, -1, Math.round(lunge));
  drawTorso(g, CX, torsoTop, torsoH, lunge * 0.2);
  drawHelm(g, CX, helmTop, lunge * 0.2);

  const bowX = CX + 16 + lunge;
  const bowY = torsoTop + 4;

  drawArm(g, CX + 8 + lunge * 0.2, torsoTop + 5, bowX, bowY);
  const stringPullX = bowX - pull * 16;
  drawArm(g, CX - 8 + lunge * 0.2, torsoTop + 6, stringPullX * 0.8, bowY);

  drawBow(g, bowX, bowY, bowAngle, Math.max(0, pull));

  // Arrow flight + spectral trail
  if (frame === 6) {
    g.moveTo(bowX + 5, bowY)
      .lineTo(bowX + 40, bowY)
      .stroke({ color: COL_RUNE, width: 2.5, alpha: 0.5 });
    g.moveTo(bowX + 5, bowY)
      .lineTo(bowX + 35, bowY)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
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
  drawQuiver(g, CX, torsoTop + 5);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  const raise = intensity * 7;
  drawArm(g, CX + 10, torsoTop + 5, CX + 12, torsoTop - 6 - raise);
  drawBow(g, CX + 12, torsoTop - 8 - raise, Math.PI / 4, 0);

  drawArm(g, CX - 10, torsoTop + 5, CX - 12, torsoTop + 4 - raise * 0.5);
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

  if (t < 0.9) {
    const bowDropX = CX + 16 + t * 14;
    const bowDropY = GY - 10 + t * 5;
    drawBow(g, bowDropX, bowDropY, 0.5 + t * 4, 0);
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

export function generateElderArcherFrames(
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
