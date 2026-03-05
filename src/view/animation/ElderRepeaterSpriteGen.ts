// Procedural sprite generator for the Elder Repeater unit type.
//
// T6 "Elder" variant — 48×96 frame (1×2 tiles). A nightmare of fused
// iron and sinew cranking an impossible repeating arbalest. Void-black
// plate, dead grey flesh, rapid-fire bolts.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 48;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

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

const COL_XBOW_BODY = 0x1a1a24;
const COL_XBOW_DK = 0x0e0e18;
const COL_XBOW_HI = 0x2a2a38;
const COL_XBOW_LIMB = 0x222230;
const COL_XBOW_STRING = 0x667088;
const COL_BOLT = 0x667088;
const COL_BOLT_HEAD = 0x444450;

const COL_BELT = 0x1a1410;
const COL_BELT_BUCKLE = 0x2a2a34;

const COL_BOOT = 0x141418;
const COL_BOOT_DK = 0x0c0c10;
const COL_GREAVE = 0x1e1e28;

const COL_RIVET = 0x484850;

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

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
  g.rect(cx - 5 + stanceL, legTop + 2, 2, 2).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 22;
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
  g.rect(x + tw - 8, top + h * 0.5, 3, 3).fill({ color: COL_RUST, alpha: 0.2 });

  // Heavy pauldrons
  g.ellipse(x - 1, top + 4, 7, 5.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x - 1, top + 3, 1).fill({ color: COL_RIVET });
  g.circle(x + 1, top + 5, 1).fill({ color: COL_RIVET });
  g.ellipse(x + tw + 1, top + 4, 7, 5.5)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.circle(x + tw + 1, top + 3, 1).fill({ color: COL_RIVET });
  g.circle(x + tw - 1, top + 5, 1).fill({ color: COL_RIVET });

  g.rect(x, top + h - 5, tw, 3).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 3.5, 2).fill({ color: COL_BELT_BUCKLE });

  g.rect(x + 1, top + h - 2, tw - 2, 5)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.3 });
}

function drawHelm(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 16;
  const hh = 16;
  const x = cx - hw / 2 + tilt;

  g.roundRect(x, top, hw, hh, 5)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });
  g.roundRect(x + 2, top + 1, 7, 5, 1).fill({ color: COL_HELM_HI, alpha: 0.25 });

  // Cheek plates
  g.roundRect(x, top + hh * 0.4, 4, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });
  g.roundRect(x + hw - 4, top + hh * 0.4, 4, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });

  // Eye slit
  g.rect(x + 4, top + hh * 0.38, hw - 8, 3.5).fill({ color: COL_VISOR });

  // Nose guard
  g.rect(cx - 1 + tilt, top + hh * 0.28, 2, hh * 0.5).fill({ color: COL_HELM_DK });

  g.circle(cx - 3 + tilt, top + hh * 0.46, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
  g.circle(cx + 3 + tilt, top + hh * 0.46, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });

  g.rect(x + 2, top + hh * 0.33, hw - 4, 1.4).fill({ color: COL_HELM_DK });
  g.rect(x + hw - 5, top + 2, 3, 3).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawCape(g: Graphics, cx: number, capeTop: number, capeH: number, wave: number): void {
  const cw = 17;
  const x = cx - cw / 2 - 2;
  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 4, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  for (let i = 0; i < 4; i++) {
    const tx = x + 2 + i * 4;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 4)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 5 });
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3.2)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.circle(ex, ey, 3).fill({ color: COL_PLATE });
}

function drawCrossbow(g: Graphics, cx: number, cy: number, angle: number, loaded: boolean): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Massive stock
  const stockLen = 24;
  const sx = cx - sin * stockLen * 0.3;
  const sy = cy + cos * stockLen * 0.3;
  const ex = cx + sin * stockLen * 0.7;
  const ey = cy - cos * stockLen * 0.7;

  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_XBOW_BODY, width: 5 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_XBOW_DK, width: 1.2, alpha: 0.4 });

  // Mechanism housing
  g.roundRect(cx - 4, cy - 4, 8, 8, 1.5)
    .fill({ color: COL_XBOW_HI })
    .stroke({ color: COL_XBOW_DK, width: 0.5 });

  // Bolt magazine on top
  g.roundRect(cx - 3, cy - 8, 6, 5, 1)
    .fill({ color: COL_XBOW_BODY })
    .stroke({ color: COL_XBOW_DK, width: 0.4 });
  // Bolt tips visible
  for (let i = 0; i < 3; i++) {
    g.circle(cx - 1 + i * 2, cy - 6, 0.8).fill({ color: COL_BOLT_HEAD });
  }

  g.circle(cx + sin * 6, cy - cos * 6, 1.2).fill({ color: COL_RIVET });
  g.circle(cx - sin * 4, cy + cos * 4, 1.2).fill({ color: COL_RIVET });

  // Rune on stock
  g.circle(cx + sin * 3, cy - cos * 3, 1.5).fill({ color: COL_RUNE, alpha: 0.2 });

  // Heavy limbs
  const limbLen = 16;
  const limbAngle = angle + Math.PI / 2;
  const limbCos = Math.cos(limbAngle);
  const limbSin = Math.sin(limbAngle);

  const lx = cx + sin * stockLen * 0.5;
  const ly = cy - cos * stockLen * 0.5;

  g.moveTo(lx, ly)
    .lineTo(lx + limbCos * limbLen, ly + limbSin * limbLen)
    .stroke({ color: COL_XBOW_LIMB, width: 3.5 });
  g.moveTo(lx, ly)
    .lineTo(lx - limbCos * limbLen, ly - limbSin * limbLen)
    .stroke({ color: COL_XBOW_LIMB, width: 3.5 });

  // String
  const stringPull = loaded ? 0.3 : 0;
  const stringMidX = lx - sin * stringPull * 10;
  const stringMidY = ly + cos * stringPull * 10;

  g.moveTo(lx + limbCos * limbLen, ly + limbSin * limbLen)
    .lineTo(stringMidX, stringMidY)
    .lineTo(lx - limbCos * limbLen, ly - limbSin * limbLen)
    .stroke({ color: COL_XBOW_STRING, width: 1 });

  // Bolt
  if (loaded) {
    const boltLen = 16;
    const boltEndX = stringMidX + sin * boltLen;
    const boltEndY = stringMidY - cos * boltLen;
    g.moveTo(stringMidX, stringMidY)
      .lineTo(boltEndX, boltEndY)
      .stroke({ color: COL_BOLT, width: 1.8 });
    g.circle(boltEndX, boltEndY, 2).fill({ color: COL_BOLT_HEAD });
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
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  const xbowX = CX + 10;
  const xbowY = torsoTop + torsoH * 0.4;
  drawArm(g, CX + 11, torsoTop + 6, xbowX + 2, xbowY + 5);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.55, true);

  drawArm(g, CX - 11, torsoTop + 6, CX - 12, torsoTop + 14);
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

  const xbowX = CX + 10 + walk * 0.5;
  const xbowY = torsoTop + torsoH * 0.4 + bob;
  drawArm(g, CX + 11, torsoTop + 6, xbowX + 2, xbowY + 5);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.55 + walk * 0.05, true);

  drawArm(g, CX - 11, torsoTop + 6, CX - 12 - walk * 0.5, torsoTop + 13 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Rapid-fire: quick cycle — aim, fire, auto-reload, fire again
  const t = frame / 7;

  const legH = 16;
  const torsoH = 22;
  const legTop = GY - 9 - legH;
  const torsoTop = legTop - torsoH + 4;
  const helmTop = torsoTop - 16;

  const lean = Math.sin(t * Math.PI * 3) * 2;
  // Two shots per cycle
  const shot1 = t >= 0.15 && t <= 0.3;
  const shot2 = t >= 0.6 && t <= 0.75;
  const loaded = !shot1 && !shot2;

  drawShadow(g, CX + lean, GY, 18 + Math.abs(lean), 6);
  drawCape(g, CX + lean * 0.3, torsoTop + 4, legH + torsoH - 4, -lean * 0.4);
  drawBoots(g, CX, GY, -1, Math.round(Math.abs(lean)));
  drawLegs(g, CX, legTop, legH, -1, Math.round(Math.abs(lean)));
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  const xbowX = CX + 12 + lean * 2;
  const xbowY = torsoTop + 5;

  drawArm(g, CX + 11 + lean, torsoTop + 6, xbowX + 2, xbowY + 3);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.5, loaded);

  drawArm(g, CX - 11 + lean, torsoTop + 6, xbowX - 5, xbowY + 3);

  // Bolt flights
  if (shot1 || shot2) {
    const shotAlpha = shot1
      ? clamp01(1 - (t - 0.15) / 0.15)
      : clamp01(1 - (t - 0.6) / 0.15);
    g.moveTo(xbowX + 14, xbowY)
      .lineTo(xbowX + 42, xbowY)
      .stroke({ color: COL_RUNE, width: 2, alpha: shotAlpha * 0.5 });
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

  const raise = intensity * 6;
  const xbowX = CX + 8;
  const xbowY = torsoTop - 2 - raise;
  drawArm(g, CX + 11, torsoTop + 5, xbowX + 2, xbowY + 5);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.4, true);

  drawArm(g, CX - 11, torsoTop + 5, CX - 12, torsoTop + 4 - raise * 0.5);
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

  if (t < 0.8) {
    const xbowDropX = CX + 16 + t * 14;
    const xbowDropY = torsoTop + torsoH * 0.4 + t * 10;
    drawCrossbow(g, xbowDropX, xbowDropY, 0.5 + t * 2.8, false);
  }

  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 7, torsoTop + 6, CX + fallX * 0.4 + 14, torsoTop + torsoH - 4);
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

export function generateElderRepeaterFrames(
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
