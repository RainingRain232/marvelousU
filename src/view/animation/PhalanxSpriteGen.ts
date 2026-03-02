// Procedural sprite generator for the Phalanx unit type.
//
// Based on the Defender but carries a long spear instead of a short sword.
// Tower shield is slightly smaller/lighter than the Defender's.
// 48×48 pixels per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — plate armor (slightly lighter than defender)
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_PLATE = 0x99a8b6;
const COL_PLATE_HI = 0xbbccdd;
const COL_PLATE_DK = 0x667788;
const COL_HELM = 0x8899aa;
const COL_HELM_HI = 0xaabbcc;
const COL_VISOR = 0x1a1a2e;
const COL_SHIELD = 0x445588;
const COL_SHIELD_HI = 0x5566aa;
const COL_SHIELD_DK = 0x334477;
const COL_SHIELD_RIM = 0x997744;
const COL_SHIELD_BAND = 0x886633;
const COL_SHIELD_EMB = 0xddcc44;
const COL_SPEAR_SHAFT = 0x7a5c3a;
const COL_SPEAR_SHAFT_DK = 0x5a4028;
const COL_SPEAR_TIP = 0xc8d0d8;
const COL_SPEAR_TIP_HI = 0xe0e8f0;
const COL_BOOT = 0x556677;
const COL_BOOT_DK = 0x445566;
const COL_CAPE = 0x884433;
const COL_CAPE_DK = 0x663322;
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
  const bw = 5, bh = 6 - squash;
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.7 });
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
  // Knee guards
  g.ellipse(cx - 3 + stanceL, legTop + legH * 0.3, 3, 2).fill({ color: COL_PLATE });
  g.ellipse(cx + 3 + stanceR, legTop + legH * 0.3, 3, 2).fill({ color: COL_PLATE });
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
    .stroke({ color: COL_PLATE_DK, width: 0.7 });
  for (let row = 3; row < torsoH - 1; row += 3) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.3, alpha: 0.5 });
  }
  // Pauldrons
  g.ellipse(x + 1, torsoTop + 2, 4, 3).fill({ color: COL_PLATE_HI });
  g.ellipse(x + tw - 1, torsoTop + 2, 4, 3).fill({ color: COL_PLATE_HI });
  g.circle(x + 1, torsoTop + 2, 0.8).fill({ color: COL_PLATE_DK });
  g.circle(x + tw - 1, torsoTop + 2, 0.8).fill({ color: COL_PLATE_DK });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 10, hh = 10;
  const x = cx - hw / 2 + tilt;
  g.roundRect(x, helmTop, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 0.6 });
  g.roundRect(x + 2, helmTop + 1, 4, 3, 1).fill({ color: COL_HELM_HI, alpha: 0.5 });
  // Visor slit
  g.rect(x + 2, helmTop + hh - 4, hw - 4, 1.5).fill({ color: COL_VISOR });
  // Nasal guard
  g.rect(cx - 1 + tilt, helmTop + 2, 2, hh - 3).fill({ color: COL_PLATE_DK });
  // Small crest
  g.rect(cx - 0.5 + tilt, helmTop - 1, 1, 2).fill({ color: COL_PLATE_DK });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 9;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .lineTo(x + wave * 1.5, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
}

/** Tower shield — slightly smaller than defender's. */
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
    .stroke({ color: COL_SHIELD_RIM, width: 1 });

  g.rect(x + 1, sy + 2, 1.5, sh - 4).fill({ color: COL_SHIELD_HI, alpha: 0.4 });
  g.rect(x + sw - 2.5, sy + 2, 1.5, sh - 4).fill({ color: COL_SHIELD_DK, alpha: 0.5 });

  // Horizontal bands
  g.rect(x + 1, sy + sh * 0.3, sw - 2, 1.5).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.6, sw - 2, 1.5).fill({ color: COL_SHIELD_BAND });

  // Central boss
  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.45;
  g.circle(bossCx, bossCy, 2.5 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 1.5 * scale).fill({ color: COL_SHIELD_EMB });
}

/** Long spear — shaft + leaf-shaped tip. */
function drawSpear(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  spearLen = 28,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = baseX + sin * spearLen;
  const tipY = baseY - cos * spearLen;

  // Shaft
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SPEAR_SHAFT, width: 2 });
  // Shaft highlight
  g.moveTo(baseX + cos * 0.3, baseY + sin * 0.3)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_SPEAR_SHAFT_DK, width: 0.5 });

  // Spearhead — leaf shape at tip
  const headLen = 5;
  const headTipX = tipX + sin * headLen;
  const headTipY = tipY - cos * headLen;
  const headW = 2;

  g.moveTo(tipX + cos * headW, tipY + sin * headW)
    .lineTo(headTipX, headTipY)
    .lineTo(tipX - cos * headW, tipY - sin * headW)
    .closePath()
    .fill({ color: COL_SPEAR_TIP });

  // Highlight on spearhead
  g.moveTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .lineTo(headTipX, headTipY)
    .stroke({ color: COL_SPEAR_TIP_HI, width: 0.6, alpha: 0.7 });

  // Butt end (small nub at base)
  const buttX = baseX - sin * 3;
  const buttY = baseY + cos * 3;
  g.circle(buttX, buttY, 1.2).fill({ color: COL_SPEAR_SHAFT_DK });
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
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 10 + bob;

  const capeWave = (t - 0.5) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Spear arm (right) — spear held upright at rest
  const spearAngle = 0.08 + t * 0.03;
  drawArm(g, CX + 6, torsoTop + 4, CX + 9, torsoTop + torsoH - 2);
  drawSpear(g, CX + 9, torsoTop + torsoH - 2, spearAngle, 26);

  // Shield arm (left) — tower shield upright
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

  const capeWave = -walkCycle * 0.8;

  drawShadow(g, CX, GY, 14 + Math.abs(walkCycle), 4);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHelm(g, CX, helmTop, walkCycle * 0.3);

  // Spear arm — spear angled forward slightly, bobs with walk
  const spearBob = walkCycle * 0.04;
  drawArm(g, CX + 6, torsoTop + 4, CX + 9 + walkCycle * 0.5, torsoTop + torsoH - 2);
  drawSpear(g, CX + 9 + walkCycle * 0.5, torsoTop + torsoH - 2, 0.2 + spearBob, 26);

  // Shield arm
  drawArm(g, CX - 6, torsoTop + 4, CX - 9, torsoTop + 6 - walkCycle * 0.5);
  drawTowerShield(g, CX - 18, torsoTop - 1 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: spear thrust forward
  // 0=ready, 1=pull back, 2-3=thrust forward, 4=full extension, 5-6=recover
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  // Body leans forward during thrust
  const lean = t < 0.55 ? t * 3 : (1 - t) * 5;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Spear angle: starts upright, tilts forward to horizontal thrust, recovers
  let spearAngle: number;
  if (t < 0.2) {
    spearAngle = lerp(0.15, 0.4, t / 0.2); // pull back slightly
  } else if (t < 0.55) {
    spearAngle = lerp(0.4, 1.35, (t - 0.2) / 0.35); // thrust forward (nearly horizontal)
  } else if (t < 0.8) {
    spearAngle = lerp(1.35, 1.5, (t - 0.55) / 0.25); // full extension
  } else {
    spearAngle = lerp(1.5, 0.15, (t - 0.8) / 0.2); // recover
  }

  const lunge = t > 0.3 && t < 0.85 ? 3 : 0;

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawCape(g, CX + lean * 0.2, torsoTop + 2, legH + torsoH - 2, -lean * 0.4);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Spear arm — extends with thrust
  const armReach = t > 0.2 && t < 0.8 ? (t - 0.2) * 5 : 0;
  const sArmX = CX + 7 + lean + armReach;
  const sArmY = torsoTop + 4;
  drawArm(g, CX + 6 + lean, torsoTop + 4, sArmX, sArmY);
  drawSpear(g, sArmX, sArmY, spearAngle, 28);

  // Shield held steady, pushed slightly forward
  const shieldPush = lean * 0.5;
  drawArm(g, CX - 6 + lean, torsoTop + 4, CX - 9 + shieldPush, torsoTop + 6);
  drawTowerShield(g, CX - 17 + shieldPush, torsoTop - 1, 0.88, shieldPush * 0.2);

  // Thrust trail at peak
  if (t >= 0.45 && t <= 0.75) {
    const trailAlpha = 1 - Math.abs(t - 0.6) / 0.15;
    const cos = Math.cos(spearAngle);
    const sin = Math.sin(spearAngle);
    const trailX = sArmX + sin * 26;
    const trailY = sArmY - cos * 26;
    g.circle(trailX, trailY, 3)
      .fill({ color: 0xffffff, alpha: trailAlpha * 0.25 });
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

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Shield raised high
  drawArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop);
  drawTowerShield(g, CX - 17, torsoTop - 5, 0.92);

  // Spear held upright
  drawArm(g, CX + 6, torsoTop + 3, CX + 9, torsoTop + torsoH - 2);
  drawSpear(g, CX + 9, torsoTop + torsoH - 2, 0.05, 26);

  // Defensive glow
  const glowR = 7 + pulse * 3;
  g.circle(CX - 12, torsoTop + 4, glowR)
    .fill({ color: 0x6688cc, alpha: 0.08 + pulse * 0.08 });
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
  drawCape(g, CX + fallX * 0.2, torsoTop + 2, (legH + torsoH - 2) * (1 - t * 0.3), t * 1.5);

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.2, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.2, legTop + dropY * 0.5, legH - squash, t * 2, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 2.5);
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.5, fallAngle * 3);

  // Shield falls flat
  if (t < 0.7) {
    drawTowerShield(
      g,
      CX - 17 + fallX * 0.5,
      torsoTop + dropY * 0.3,
      0.88 * (1 - t * 0.4),
      t * 3,
    );
  }

  // Spear drops and tumbles
  if (t < 0.85) {
    const sdx = CX + 10 + t * 10;
    const sdy = torsoTop + torsoH * 0.3 + t * 8;
    drawSpear(g, sdx, sdy, 0.3 + t * 2.5, 26 * (1 - t * 0.3));
  }

  // Arm on ground
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 5, torsoTop + 5, CX + fallX * 0.4 + 9, torsoTop + torsoH - 2, COL_PLATE);
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

export function generatePhalanxFrames(
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
