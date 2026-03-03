// Procedural sprite generator for the Ancient Crossbowman unit type.
//
// A T4 "Ancient One" variant of the Crossbowman — bigger (48×72 frame),
// heavy blackened plate armor, grey undead-looking skin,
// massive siege-weight arbalest of pitted black iron.

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

const COL_BELT = 0x2a2218;
const COL_BELT_BUCKLE = 0x404048;

const COL_BOOT = 0x222228;
const COL_BOOT_DK = 0x151518;
const COL_GREAVE = 0x303038;

const COL_RIVET = 0x606068;

// Crossbow colours
const COL_XBOW_BODY = 0x2a2a32;
const COL_XBOW_DK = 0x1a1a22;
const COL_XBOW_HI = 0x404048;
const COL_XBOW_LIMB = 0x333340;
const COL_XBOW_STRING = 0x888890;
const COL_BOLT = 0x888890;
const COL_BOLT_HEAD = 0x555560;

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
  g.rect(cx - 4 + stanceL, legTop + 2, 2, 2).fill({ color: COL_RUST, alpha: 0.25 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 18; // Heavier torso — crossbowman is more armored
  const x = cx - tw / 2 + tilt;

  g.roundRect(x - 1, top, tw + 2, h, 3)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.7 });

  for (let row = 3; row < h - 1; row += 2) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.25, alpha: 0.25 });
  }

  // Heavy breastplate
  g.roundRect(x + 2, top + 1, tw - 4, h - 4, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.roundRect(x + 3, top + 2, tw - 6, 2, 0.5).fill({ color: COL_PLATE_HI, alpha: 0.3 });

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

function drawHelm(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 14;
  const hh = 13;
  const x = cx - hw / 2 + tilt;

  // Full great helm — heavy crossbowman
  g.roundRect(x, top, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.7 });
  g.roundRect(x + 2, top + 1, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.3 });

  // Cheek plates
  g.roundRect(x, top + hh * 0.4, 3.5, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });
  g.roundRect(x + hw - 3.5, top + hh * 0.4, 3.5, hh * 0.5, 0.5).fill({ color: COL_HELM_DK });

  // Eye slit
  g.rect(x + 3.5, top + hh * 0.4, hw - 7, 3).fill({ color: COL_VISOR });

  // Nose guard
  g.rect(cx - 1 + tilt, top + hh * 0.3, 2, hh * 0.5).fill({ color: COL_HELM_DK });

  g.circle(cx - 2 + tilt, top + hh * 0.5, 0.8).fill({ color: 0x445566, alpha: 0.4 });
  g.circle(cx + 2 + tilt, top + hh * 0.5, 0.8).fill({ color: 0x445566, alpha: 0.4 });

  // Brow ridge
  g.rect(x + 2, top + hh * 0.35, hw - 4, 1.2).fill({ color: COL_HELM_DK });

  g.rect(x + hw - 4, top + 2, 3, 2).fill({ color: COL_RUST, alpha: 0.2 });
}

function drawCape(g: Graphics, cx: number, capeTop: number, capeH: number, wave: number): void {
  const cw = 15;
  const x = cx - cw / 2 - 2;
  g.moveTo(x + 1, capeTop)
    .lineTo(x + cw - 1, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  for (let i = 0; i < 4; i++) {
    const tx = x + 2 + i * 3.5;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 1.5 + wave, capeTop + capeH + 3)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_MAIL, width: 4 });
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2.8)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  g.circle(ex, ey, 2.5).fill({ color: COL_PLATE });
}

function drawCrossbow(
  g: Graphics,
  cx: number,
  cy: number,
  angle: number,
  loaded: boolean,
  crankPhase = 0,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Stock — massive iron tiller
  const stockLen = 20;
  const sx = cx - sin * stockLen * 0.3;
  const sy = cy + cos * stockLen * 0.3;
  const ex = cx + sin * stockLen * 0.7;
  const ey = cy - cos * stockLen * 0.7;

  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_XBOW_BODY, width: 4 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_XBOW_DK, width: 1, alpha: 0.4 });

  // Mechanism housing
  g.roundRect(cx - 3, cy - 3, 6, 6, 1)
    .fill({ color: COL_XBOW_HI })
    .stroke({ color: COL_XBOW_DK, width: 0.5 });

  // Rivets on stock
  g.circle(cx + sin * 5, cy - cos * 5, 1).fill({ color: COL_RIVET });
  g.circle(cx - sin * 3, cy + cos * 3, 1).fill({ color: COL_RIVET });

  // Limbs — heavy iron prod
  const limbLen = 14;
  const limbAngle = angle + Math.PI / 2;
  const limbCos = Math.cos(limbAngle);
  const limbSin = Math.sin(limbAngle);

  const lx = cx + sin * stockLen * 0.5;
  const ly = cy - cos * stockLen * 0.5;

  g.moveTo(lx, ly)
    .lineTo(lx + limbCos * limbLen, ly + limbSin * limbLen)
    .stroke({ color: COL_XBOW_LIMB, width: 3 });
  g.moveTo(lx, ly)
    .lineTo(lx - limbCos * limbLen, ly - limbSin * limbLen)
    .stroke({ color: COL_XBOW_LIMB, width: 3 });

  // String
  const stringPull = loaded ? 0.3 : 0;
  const stringMidX = lx - sin * stringPull * 8;
  const stringMidY = ly + cos * stringPull * 8;

  g.moveTo(lx + limbCos * limbLen, ly + limbSin * limbLen)
    .lineTo(stringMidX, stringMidY)
    .lineTo(lx - limbCos * limbLen, ly - limbSin * limbLen)
    .stroke({ color: COL_XBOW_STRING, width: 0.8 });

  // Bolt
  if (loaded) {
    const boltLen = 14;
    const boltStartX = stringMidX;
    const boltStartY = stringMidY;
    const boltEndX = boltStartX + sin * boltLen;
    const boltEndY = boltStartY - cos * boltLen;

    g.moveTo(boltStartX, boltStartY)
      .lineTo(boltEndX, boltEndY)
      .stroke({ color: COL_BOLT, width: 1.5 });
    // Bolt head
    g.circle(boltEndX, boltEndY, 1.5).fill({ color: COL_BOLT_HEAD });
  }

  // Cranking mechanism (if reloading)
  if (crankPhase > 0) {
    const crankX = cx - sin * 6;
    const crankY = cy + cos * 6;
    const crankAngle = crankPhase * Math.PI * 2;
    g.circle(crankX, crankY, 3)
      .fill({ color: COL_XBOW_HI })
      .stroke({ color: COL_XBOW_DK, width: 0.5 });
    g.moveTo(crankX, crankY)
      .lineTo(crankX + Math.cos(crankAngle) * 4, crankY + Math.sin(crankAngle) * 4)
      .stroke({ color: COL_XBOW_DK, width: 1.5 });
  }
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

  // Holding crossbow at rest
  const xbowX = CX + 8;
  const xbowY = torsoTop + torsoH * 0.4;
  drawArm(g, CX + 9, torsoTop + 5, xbowX + 2, xbowY + 4);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.55, true);

  drawArm(g, CX - 9, torsoTop + 5, CX - 10, torsoTop + 11);
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

  const xbowX = CX + 8 + walk * 0.5;
  const xbowY = torsoTop + torsoH * 0.4 + bob;
  drawArm(g, CX + 9, torsoTop + 5, xbowX + 2, xbowY + 4);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.55 + walk * 0.05, true);

  drawArm(g, CX - 9, torsoTop + 5, CX - 10 - walk * 0.5, torsoTop + 10 + walk);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: aim → fire → crank reload
  const phases = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  const lean = t < 0.35 ? t * 4 : t < 0.5 ? 1.4 : (1 - t) * 3;
  const loaded = t < 0.4;
  const crankPhase = t > 0.6 ? (t - 0.6) / 0.4 : 0;

  drawShadow(g, CX + lean, GY, 16 + lean, 5);
  drawCape(g, CX + lean * 0.3, torsoTop + 3, legH + torsoH - 3, -lean * 0.5);
  drawBoots(g, CX, GY, -1, Math.round(lean));
  drawLegs(g, CX, legTop, legH, -1, Math.round(lean));
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Crossbow — horizontal aiming
  const xbowAngle = t < 0.35 ? lerp(Math.PI * 0.55, Math.PI * 0.5, t / 0.35) : Math.PI * 0.5;
  const xbowX = CX + 10 + lean * 2;
  const xbowY = torsoTop + 4;

  drawArm(g, CX + 9 + lean, torsoTop + 5, xbowX + 2, xbowY + 2);
  drawCrossbow(g, xbowX, xbowY, xbowAngle, loaded, crankPhase);

  // Off-hand supports
  drawArm(g, CX - 9 + lean, torsoTop + 5, xbowX - 4, xbowY + 2);

  // Bolt flight on release
  if (t >= 0.35 && t <= 0.5) {
    const shotAlpha = clamp01(1 - (t - 0.35) / 0.15);
    g.moveTo(xbowX + 12, xbowY)
      .lineTo(xbowX + 40, xbowY)
      .stroke({ color: 0xaaaacc, width: 2, alpha: shotAlpha * 0.6 });
  }

  // Impact flash
  if (t >= 0.4 && t <= 0.55) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.47) / 0.07);
    g.circle(xbowX + 35, xbowY, 5).fill({ color: 0xffffff, alpha: impactAlpha * 0.25 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  const glowR = 10 + intensity * 6 + pulse * 4;
  g.circle(CX, torsoTop - 5, glowR).fill({ color: 0x334455, alpha: 0.06 + intensity * 0.06 });

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Crossbow raised
  const raise = intensity * 5;
  const xbowX = CX + 6;
  const xbowY = torsoTop - 2 - raise;
  drawArm(g, CX + 9, torsoTop + 4, xbowX + 2, xbowY + 4);
  drawCrossbow(g, xbowX, xbowY, Math.PI * 0.4, true);

  drawArm(g, CX - 9, torsoTop + 4, CX - 10, torsoTop + 3 - raise * 0.5);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fallX = t * 12;
  const dropY = t * t * 12;

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 13;

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

  // Crossbow tumbles away
  if (t < 0.8) {
    const xbowDropX = CX + 14 + t * 12;
    const xbowDropY = torsoTop + torsoH * 0.4 + t * 8;
    drawCrossbow(g, xbowDropX, xbowDropY, 0.5 + t * 2.8, false);
  }

  // Arm flopped
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 6, torsoTop + 5, CX + fallX * 0.4 + 12, torsoTop + torsoH - 3);
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

export function generateAncientCrossbowmanFrames(
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
