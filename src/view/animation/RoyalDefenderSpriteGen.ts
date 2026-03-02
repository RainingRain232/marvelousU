// Procedural sprite generator for the Royal Defender unit type.
//
// Based on the Royal Phalanx but with a mace instead of a pike.
// 48×48 pixels per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — gilded royal armor (same as phalanx)
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_GOLD = 0xccaa44;
const COL_GOLD_HI = 0xeedd66;
const COL_GOLD_DK = 0x997722;
const COL_PLATE = 0xbbaa55;
const COL_PLATE_HI = 0xddcc77;
const COL_PLATE_DK = 0x887733;
const COL_HELM = 0xccbb55;
const COL_HELM_HI = 0xeedd88;
const COL_VISOR = 0x1a1a2e;
const COL_PLUME = 0xcc2222;
const COL_PLUME_HI = 0xee4444;
const COL_SHIELD = 0x3355aa;
const COL_SHIELD_HI = 0x4466bb;
const COL_SHIELD_DK = 0x224499;
const COL_SHIELD_RIM = 0xccaa44;
const COL_SHIELD_BAND = 0xbbaa44;
const COL_SHIELD_EMB = 0xeedd66;
const COL_MACE_SHAFT = 0x5a3a1a;
const COL_MACE_SHAFT_DK = 0x3a2810;
const COL_MACE_HEAD = 0x887766;
const COL_MACE_HEAD_HI = 0xaa9988;
const COL_MACE_HEAD_DK = 0x665544;
const COL_MACE_SPIKE = 0xd0d0d0;
const COL_BOOT = 0x887744;
const COL_BOOT_DK = 0x665533;
const COL_CAPE = 0xcc2222;
const COL_CAPE_DK = 0x991111;
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

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5,
    bh = 6 - squash;
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.rect(cx - 7 + stanceL, gy - bh, bw, 1.5).fill({
    color: COL_GOLD_DK,
    alpha: 0.6,
  });
  g.rect(cx + 2 + stanceR, gy - bh, bw, 1.5).fill({
    color: COL_GOLD_DK,
    alpha: 0.6,
  });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 5, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 5, legH).fill({ color: COL_PLATE_DK });
  g.ellipse(cx - 3 + stanceL, legTop + legH * 0.3, 3.5, 2.5).fill({
    color: COL_GOLD,
  });
  g.ellipse(cx + 3 + stanceR, legTop + legH * 0.3, 3.5, 2.5).fill({
    color: COL_GOLD,
  });
  g.circle(cx - 3 + stanceL, legTop + legH * 0.3, 1).fill({
    color: COL_GOLD_HI,
  });
  g.circle(cx + 3 + stanceR, legTop + legH * 0.3, 1).fill({
    color: COL_GOLD_HI,
  });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 15;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.8 });
  for (let row = 3; row < torsoH - 1; row += 3) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.4, alpha: 0.7 });
  }
  g.ellipse(x, torsoTop + 2, 5, 4).fill({ color: COL_GOLD });
  g.ellipse(x + tw, torsoTop + 2, 5, 4).fill({ color: COL_GOLD });
  g.ellipse(x, torsoTop + 1, 4, 2.5).fill({ color: COL_GOLD_HI, alpha: 0.5 });
  g.ellipse(x + tw, torsoTop + 1, 4, 2.5).fill({
    color: COL_GOLD_HI,
    alpha: 0.5,
  });
  g.circle(x, torsoTop + 3, 1).fill({ color: COL_GOLD_DK });
  g.circle(x + tw, torsoTop + 3, 1).fill({ color: COL_GOLD_DK });
  g.circle(cx + tilt, torsoTop + torsoH * 0.4, 2.5).fill({
    color: COL_GOLD_DK,
  });
  g.circle(cx + tilt, torsoTop + torsoH * 0.4, 1.5).fill({
    color: COL_GOLD_HI,
  });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
  plumeWave = 0,
): void {
  const hw = 10,
    hh = 10;
  const x = cx - hw / 2 + tilt;
  g.roundRect(x, helmTop, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_GOLD_DK, width: 0.7 });
  g.roundRect(x + 2, helmTop + 1, 5, 3, 1).fill({
    color: COL_HELM_HI,
    alpha: 0.6,
  });
  g.rect(x + 2, helmTop + hh - 4, hw - 4, 1.5).fill({ color: COL_VISOR });
  g.rect(cx - 1 + tilt, helmTop + 2, 2, hh - 3).fill({ color: COL_GOLD_DK });

  const plumeBaseX = cx + tilt;
  const plumeBaseY = helmTop - 1;
  const plumeH = 8;
  const plumeW = 5;
  g.moveTo(plumeBaseX - 1, plumeBaseY)
    .lineTo(plumeBaseX + 1, plumeBaseY)
    .lineTo(plumeBaseX - 3 + plumeWave * 2, plumeBaseY - plumeH)
    .lineTo(plumeBaseX - plumeW + plumeWave * 3, plumeBaseY - plumeH + 2)
    .lineTo(plumeBaseX - 2, plumeBaseY)
    .closePath()
    .fill({ color: COL_PLUME });
  g.moveTo(plumeBaseX, plumeBaseY - 1)
    .lineTo(plumeBaseX - 1 + plumeWave, plumeBaseY - plumeH + 2)
    .stroke({ color: COL_PLUME_HI, width: 1, alpha: 0.6 });
  g.rect(cx - 1.5 + tilt, helmTop - 2, 3, 3).fill({ color: COL_GOLD });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 10;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2.5, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .stroke({ color: COL_GOLD, width: 1.5 });
}

function drawTowerShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
  tilt = 0,
): void {
  const sw = 10 * scale;
  const sh = 17 * scale;
  const x = sx + tilt;

  g.roundRect(x, sy, sw, sh, 2)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1.2 });

  g.rect(x + 1, sy + 2, 1.5, sh - 4).fill({ color: COL_SHIELD_HI, alpha: 0.4 });
  g.rect(x + sw - 2.5, sy + 2, 1.5, sh - 4).fill({
    color: COL_SHIELD_DK,
    alpha: 0.5,
  });

  g.rect(x + 1, sy + sh * 0.3, sw - 2, 2).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.6, sw - 2, 2).fill({ color: COL_SHIELD_BAND });

  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.45;
  g.circle(bossCx, bossCy, 3 * scale).fill({ color: COL_GOLD_DK });
  g.circle(bossCx, bossCy, 2 * scale).fill({ color: COL_SHIELD_EMB });
  g.circle(bossCx, bossCy, 1 * scale).fill({ color: COL_GOLD_HI });

  g.circle(x + 2.5, sy + 3, 1).fill({ color: COL_GOLD });
  g.circle(x + sw - 2.5, sy + 3, 1).fill({ color: COL_GOLD });
  g.circle(x + 2.5, sy + sh - 3, 1).fill({ color: COL_GOLD });
  g.circle(x + sw - 2.5, sy + sh - 3, 1).fill({ color: COL_GOLD });
}

/** Mace — shorter weapon with spiked head */
function drawMace(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  swing = 0,
): void {
  const cos = Math.cos(angle + swing);
  const sin = Math.sin(angle + swing);

  const shaftLen = 18;
  const shaftEndX = baseX + sin * shaftLen;
  const shaftEndY = baseY - cos * shaftLen;

  g.moveTo(baseX, baseY)
    .lineTo(shaftEndX, shaftEndY)
    .stroke({ color: COL_MACE_SHAFT, width: 3 });
  g.moveTo(baseX + cos * 0.5, baseY + sin * 0.5)
    .lineTo(shaftEndX + cos * 0.5, shaftEndY + sin * 0.5)
    .stroke({ color: COL_MACE_SHAFT_DK, width: 0.5 });

  const headX = shaftEndX;
  const headY = shaftEndY;
  const headR = 4;

  g.circle(headX, headY, headR).fill({ color: COL_MACE_HEAD });
  g.circle(headX + cos * 1, headY - sin * 1, headR - 1).fill({
    color: COL_MACE_HEAD_HI,
  });
  g.circle(headX - cos * 1, headY + sin * 1, headR - 1).fill({
    color: COL_MACE_HEAD_DK,
  });

  for (let i = 0; i < 6; i++) {
    const spikeAngle = (i / 6) * Math.PI * 2;
    const spikeLen = 2.5;
    const sx = headX + Math.cos(spikeAngle + angle + swing) * headR;
    const sy = headY + Math.sin(spikeAngle + angle + swing) * headR;
    const ex = sx + Math.cos(spikeAngle + angle + swing) * spikeLen;
    const ey = sy + Math.sin(spikeAngle + angle + swing) * spikeLen;
    g.moveTo(sx, sy)
      .lineTo(ex, ey)
      .stroke({ color: COL_MACE_SPIKE, width: 1.2 });
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
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 3 });
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 10 + bob;

  const capeWave = (t - 0.5) * 0.5;
  const plumeWave = (t - 0.5) * 0.8;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop, 0, plumeWave);

  // Mace arm (right) — held ready
  drawArm(g, CX + 6, torsoTop + 4, CX + 10, torsoTop + 6);
  drawMace(g, CX + 10, torsoTop + 6, -0.3 + t * 0.05);

  // Shield arm (left)
  drawArm(g, CX - 6, torsoTop + 4, CX - 10, torsoTop + 6);
  drawTowerShield(g, CX - 19, torsoTop - 1, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const legH = 8;
  const torsoH = 12;
  const stanceL = Math.round(walkCycle * 2);
  const stanceR = Math.round(-walkCycle * 2);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 10;

  const capeWave = -walkCycle * 1.0;
  const plumeWave = -walkCycle * 1.2;

  drawShadow(g, CX, GY, 14 + Math.abs(walkCycle), 4);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHelm(g, CX, helmTop, walkCycle * 0.3, plumeWave);

  // Mace arm
  drawArm(g, CX + 6, torsoTop + 4, CX + 10 + walkCycle * 0.5, torsoTop + 6);
  drawMace(g, CX + 10 + walkCycle * 0.5, torsoTop + 6, -0.25 + walkCycle * 0.1);

  // Shield arm
  drawArm(g, CX - 6, torsoTop + 4, CX - 9, torsoTop + 6 - walkCycle * 0.5);
  drawTowerShield(g, CX - 18, torsoTop - 1 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: mace swing
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  const lean = t < 0.55 ? t * 3.5 : (1 - t) * 5.5;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Mace swing angle: wind up → swing forward → follow through → recover
  let maceSwing: number;
  if (t < 0.2) {
    maceSwing = lerp(-0.5, -1.2, t / 0.2);
  } else if (t < 0.55) {
    maceSwing = lerp(-1.2, 0.8, (t - 0.2) / 0.35);
  } else if (t < 0.8) {
    maceSwing = lerp(0.8, 0.3, (t - 0.55) / 0.25);
  } else {
    maceSwing = lerp(0.3, -0.5, (t - 0.8) / 0.2);
  }

  const lunge = t > 0.3 && t < 0.85 ? 4 : 0;
  const plumeWave = -lean * 0.4;

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawCape(g, CX + lean * 0.2, torsoTop + 2, legH + torsoH - 2, -lean * 0.5);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6, plumeWave);

  // Mace arm
  const armReach = t > 0.2 && t < 0.8 ? (t - 0.2) * 4 : 0;
  const sArmX = CX + 7 + lean + armReach;
  const sArmY = torsoTop + 4;
  drawArm(g, CX + 6 + lean, torsoTop + 4, sArmX, sArmY);
  drawMace(g, sArmX, sArmY, -0.3, maceSwing);

  // Shield
  const shieldPush = lean * 0.5;
  drawArm(g, CX - 6 + lean, torsoTop + 4, CX - 9 + shieldPush, torsoTop + 6);
  drawTowerShield(
    g,
    CX - 17 + shieldPush,
    torsoTop - 1,
    0.88,
    shieldPush * 0.2,
  );

  // Impact effect at peak
  if (t >= 0.4 && t <= 0.7) {
    const impactAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    const maceX = sArmX + Math.sin(-0.3 + maceSwing) * 18;
    const maceY = sArmY - Math.cos(-0.3 + maceSwing) * 18;
    g.circle(maceX, maceY, 6).fill({
      color: COL_GOLD_HI,
      alpha: impactAlpha * 0.4,
    });
    g.circle(maceX, maceY, 3).fill({
      color: 0xffffff,
      alpha: impactAlpha * 0.3,
    });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;
  const plumeWave = pulse * 0.6 - 0.3;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop, 0, plumeWave);

  // Shield raised
  drawArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop);
  drawTowerShield(g, CX - 17, torsoTop - 5, 0.92);

  // Mace ready
  drawArm(g, CX + 6, torsoTop + 3, CX + 10, torsoTop + 5);
  drawMace(g, CX + 10, torsoTop + 5, -0.3 + pulse * 0.1);

  const glowR = 8 + pulse * 3;
  g.circle(CX, torsoTop - 2, glowR).fill({
    color: COL_GOLD_HI,
    alpha: 0.08 + pulse * 0.08,
  });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  const fallAngle = t * 1.0;
  const fallX = t * 8;
  const dropY = t * t * 10;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.5, GY, 14 + t * 4, 4);
  drawCape(
    g,
    CX + fallX * 0.2,
    torsoTop + 2,
    (legH + torsoH - 2) * (1 - t * 0.3),
    t * 1.5,
  );

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.2, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.2,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
      -t,
    );
  }

  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 2.5,
  );
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.5, fallAngle * 3, t * 2);

  if (t < 0.7) {
    drawTowerShield(
      g,
      CX - 17 + fallX * 0.5,
      torsoTop + dropY * 0.3,
      0.88 * (1 - t * 0.4),
      t * 3,
    );
  }

  if (t < 0.85) {
    const mdx = CX + 12 + t * 10;
    const mdy = torsoTop + torsoH * 0.3 + t * 8;
    drawMace(g, mdx, mdy, 0.5 + t * 2);
  }

  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 5,
      CX + fallX * 0.4 + 9,
      torsoTop + torsoH - 2,
      COL_PLATE,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 7 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateRoyalDefenderFrames(
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
