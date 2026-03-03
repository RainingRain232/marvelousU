// Procedural sprite generator for the Ancient Phalanx unit type.
//
// A T4 "Ancient One" variant of the Phalanx — bigger (48×72 frame),
// blackened/corroded armor, grey undead-looking skin, long corroded spear.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 48;
const FH = 72;
const CX = FW / 2;
const GY = FH - 6;

// Palette — blackened ancient armor + grey skin
const COL_SKIN = 0x8a8a8a;
const COL_SKIN_DK = 0x6a6a6a;
const COL_PLATE = 0x2a2a34;
const COL_PLATE_HI = 0x404048;
const COL_PLATE_DK = 0x181822;
const COL_HELM = 0x33333d;
const COL_HELM_HI = 0x484852;
const COL_VISOR = 0x0a0a14;
const COL_RUST = 0x5a3a2a;
const COL_SHIELD = 0x222230;
const COL_SHIELD_HI = 0x333344;
const COL_SHIELD_DK = 0x161622;
const COL_SHIELD_RIM = 0x554433;
const COL_SHIELD_BAND = 0x443322;
const COL_SHIELD_EMB = 0x887744;
const COL_SPEAR_SHAFT = 0x443322;
const COL_SPEAR_SHAFT_DK = 0x2a1a10;
const COL_SPEAR_TIP = 0x606068;
const COL_SPEAR_TIP_HI = 0x808088;
const COL_BOOT = 0x2a2a32;
const COL_BOOT_DK = 0x1a1a22;
const COL_CAPE = 0x1e1e2a;
const COL_CAPE_DK = 0x121220;
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

function drawShadow(g: Graphics, cx: number, gy: number, w = 16, h = 5): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.35 });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 6, bh = 8 - squash;
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.8 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.8 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 6 + stanceL, legTop, 6, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 6, legH).fill({ color: COL_PLATE_DK });
  // Knee guards
  g.ellipse(cx - 3.5 + stanceL, legTop + legH * 0.3, 4, 3).fill({ color: COL_PLATE });
  g.ellipse(cx + 3.5 + stanceR, legTop + legH * 0.3, 4, 3).fill({ color: COL_PLATE });
  // Rust
  g.rect(cx - 5 + stanceL, legTop + legH * 0.5, 2, 3).fill({ color: COL_RUST, alpha: 0.3 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 19;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 3)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.8 });
  for (let row = 4; row < torsoH - 2; row += 4) {
    g.moveTo(x + 3, torsoTop + row)
      .lineTo(x + tw - 3, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.4, alpha: 0.4 });
  }
  // Rust
  g.rect(x + 4, torsoTop + torsoH * 0.5, 3, 3).fill({ color: COL_RUST, alpha: 0.25 });
  // Pauldrons
  g.ellipse(x + 1, torsoTop + 3, 5, 4).fill({ color: COL_PLATE_HI });
  g.ellipse(x + tw - 1, torsoTop + 3, 5, 4).fill({ color: COL_PLATE_HI });
  g.circle(x + 1, torsoTop + 3, 1).fill({ color: COL_PLATE_DK });
  g.circle(x + tw - 1, torsoTop + 3, 1).fill({ color: COL_PLATE_DK });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 13, hh = 13;
  const x = cx - hw / 2 + tilt;
  g.roundRect(x, helmTop, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 0.7 });
  g.roundRect(x + 2, helmTop + 1, 5, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.3 });
  // Visor slit
  g.rect(x + 3, helmTop + hh - 5, hw - 6, 2).fill({ color: COL_VISOR });
  g.rect(x + 4, helmTop + hh - 5, hw - 8, 1).fill({ color: 0x445566, alpha: 0.3 });
  // Nasal guard
  g.rect(cx - 1 + tilt, helmTop + 3, 2, hh - 4).fill({ color: COL_PLATE_DK });
  // Small crest
  g.rect(cx - 0.5 + tilt, helmTop - 1, 1, 3).fill({ color: COL_PLATE_DK });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 12;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .lineTo(x + wave * 1.5, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
  // Tattered edges
  for (let i = 0; i < 3; i++) {
    const tx = x + 2 + i * 3;
    g.moveTo(tx + wave, capeTop + capeH)
      .lineTo(tx + 2 + wave, capeTop + capeH + 3)
      .stroke({ color: COL_CAPE_DK, width: 0.4 });
  }
}

function drawTowerShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
  tilt = 0,
): void {
  const sw = 13 * scale;
  const sh = 22 * scale;
  const x = sx + tilt;

  g.roundRect(x, sy, sw, sh, 2)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1 });

  g.rect(x + 1, sy + 3, 2, sh - 6).fill({ color: COL_SHIELD_HI, alpha: 0.3 });
  g.rect(x + sw - 3, sy + 3, 2, sh - 6).fill({ color: COL_SHIELD_DK, alpha: 0.4 });

  g.rect(x + 1, sy + sh * 0.3, sw - 2, 2).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.6, sw - 2, 2).fill({ color: COL_SHIELD_BAND });

  // Rust on shield
  g.rect(x + 3, sy + sh * 0.35, 3, 3).fill({ color: COL_RUST, alpha: 0.25 });

  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.45;
  g.circle(bossCx, bossCy, 3 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 2 * scale).fill({ color: COL_SHIELD_EMB });
}

function drawSpear(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  spearLen = 34,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = baseX + sin * spearLen;
  const tipY = baseY - cos * spearLen;

  // Corroded shaft
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SPEAR_SHAFT, width: 2.5 });
  g.moveTo(baseX + cos * 0.3, baseY + sin * 0.3)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_SPEAR_SHAFT_DK, width: 0.6 });

  // Spearhead — corroded leaf shape
  const headLen = 6;
  const headTipX = tipX + sin * headLen;
  const headTipY = tipY - cos * headLen;
  const headW = 2.5;

  g.moveTo(tipX + cos * headW, tipY + sin * headW)
    .lineTo(headTipX, headTipY)
    .lineTo(tipX - cos * headW, tipY - sin * headW)
    .closePath()
    .fill({ color: COL_SPEAR_TIP });

  g.moveTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .lineTo(headTipX, headTipY)
    .stroke({ color: COL_SPEAR_TIP_HI, width: 0.6, alpha: 0.5 });

  // Butt end
  const buttX = baseX - sin * 3;
  const buttY = baseY + cos * 3;
  g.circle(buttX, buttY, 1.5).fill({ color: COL_SPEAR_SHAFT_DK });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 3.5 });
  g.circle(ex, ey, 2.5).fill({ color: COL_SKIN_DK });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 + bob;
  const helmTop = torsoTop - 13 + bob;

  const capeWave = (t - 0.5) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Spear arm (right)
  const spearAngle = 0.08 + t * 0.03;
  drawArm(g, CX + 8, torsoTop + 5, CX + 12, torsoTop + torsoH - 2);
  drawSpear(g, CX + 12, torsoTop + torsoH - 2, spearAngle, 32);

  // Shield arm (left)
  drawArm(g, CX - 8, torsoTop + 5, CX - 12, torsoTop + 7);
  drawTowerShield(g, CX - 23, torsoTop - 2, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const legH = 12;
  const torsoH = 16;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 13;

  const capeWave = -walkCycle * 1.0;

  drawShadow(g, CX, GY, 16 + Math.abs(walkCycle), 5);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHelm(g, CX, helmTop, walkCycle * 0.3);

  const spearBob = walkCycle * 0.04;
  drawArm(g, CX + 8, torsoTop + 5, CX + 12 + walkCycle * 0.5, torsoTop + torsoH - 2);
  drawSpear(g, CX + 12 + walkCycle * 0.5, torsoTop + torsoH - 2, 0.2 + spearBob, 32);

  drawArm(g, CX - 8, torsoTop + 5, CX - 11, torsoTop + 7 - walkCycle * 0.5);
  drawTowerShield(g, CX - 22, torsoTop - 2 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;

  const lean = t < 0.55 ? t * 4 : (1 - t) * 6;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  let spearAngle: number;
  if (t < 0.2) {
    spearAngle = lerp(0.15, 0.4, t / 0.2);
  } else if (t < 0.55) {
    spearAngle = lerp(0.4, 1.35, (t - 0.2) / 0.35);
  } else if (t < 0.8) {
    spearAngle = lerp(1.35, 1.5, (t - 0.55) / 0.25);
  } else {
    spearAngle = lerp(1.5, 0.15, (t - 0.8) / 0.2);
  }

  const lunge = t > 0.3 && t < 0.85 ? 4 : 0;

  drawShadow(g, CX + lean, GY, 16 + lean, 5);
  drawCape(g, CX + lean * 0.2, torsoTop + 3, legH + torsoH - 3, -lean * 0.4);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  const armReach = t > 0.2 && t < 0.8 ? (t - 0.2) * 6 : 0;
  const sArmX = CX + 9 + lean + armReach;
  const sArmY = torsoTop + 5;
  drawArm(g, CX + 8 + lean, torsoTop + 5, sArmX, sArmY);
  drawSpear(g, sArmX, sArmY, spearAngle, 34);

  const shieldPush = lean * 0.5;
  drawArm(g, CX - 8 + lean, torsoTop + 5, CX - 11 + shieldPush, torsoTop + 7);
  drawTowerShield(g, CX - 21 + shieldPush, torsoTop - 2, 0.88, shieldPush * 0.2);

  // Thrust trail
  if (t >= 0.45 && t <= 0.75) {
    const trailAlpha = 1 - Math.abs(t - 0.6) / 0.15;
    const cos = Math.cos(spearAngle);
    const sin = Math.sin(spearAngle);
    const trailX = sArmX + sin * 32;
    const trailY = sArmY - cos * 32;
    g.circle(trailX, trailY, 4)
      .fill({ color: 0xffffff, alpha: trailAlpha * 0.2 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 3, legH + torsoH - 3, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Shield raised
  drawArm(g, CX - 8, torsoTop + 4, CX - 11, torsoTop);
  drawTowerShield(g, CX - 21, torsoTop - 6, 0.92);

  // Spear upright
  drawArm(g, CX + 8, torsoTop + 4, CX + 12, torsoTop + torsoH - 2);
  drawSpear(g, CX + 12, torsoTop + torsoH - 2, 0.05, 32);

  // Dark glow
  const glowR = 9 + pulse * 3;
  g.circle(CX - 15, torsoTop + 5, glowR)
    .fill({ color: 0x334455, alpha: 0.08 + pulse * 0.07 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 12;
  const torsoH = 16;
  const legTop = GY - 7 - legH;

  const fallAngle = t * 1.0;
  const fallX = t * 10;
  const dropY = t * t * 12;

  const torsoTop = legTop - torsoH + 3 + dropY;
  const helmTop = torsoTop - 13;

  drawShadow(g, CX + fallX * 0.5, GY, 16 + t * 5, 5);
  drawCape(g, CX + fallX * 0.2, torsoTop + 3, (legH + torsoH - 3) * (1 - t * 0.3), t * 1.5);

  const squash = Math.round(t * 4);
  drawBoots(g, CX + fallX * 0.2, GY, t * 3, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.2, legTop + dropY * 0.5, legH - squash, t * 3, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 2.5);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.5, fallAngle * 3);

  // Shield falls
  if (t < 0.7) {
    drawTowerShield(
      g,
      CX - 21 + fallX * 0.5,
      torsoTop + dropY * 0.3,
      0.88 * (1 - t * 0.4),
      t * 3,
    );
  }

  // Spear tumbles
  if (t < 0.85) {
    const sdx = CX + 12 + t * 12;
    const sdy = torsoTop + torsoH * 0.3 + t * 10;
    drawSpear(g, sdx, sdy, 0.3 + t * 2.5, 32 * (1 - t * 0.3));
  }

  // Arm on ground
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 6, torsoTop + 6, CX + fallX * 0.4 + 11, torsoTop + torsoH - 2, COL_PLATE);
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

export function generateAncientPhalanxFrames(
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
