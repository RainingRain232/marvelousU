// Procedural sprite generator for the Defender unit type.
//
// Draws a heavily armored soldier with a massive tower shield at 48×48 pixels
// per frame using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Full plate armor with thick pauldrons
//   • Great helm with narrow visor slit
//   • Large rectangular tower shield (covers most of the body)
//   • Short sword for melee strikes
//   • Heavy boots and leg armor

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — heavy plate steel
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_PLATE = 0x9eaab8;
const COL_PLATE_HI = 0xc0ccdd;
const COL_PLATE_DK = 0x6a7888;
const COL_HELM = 0x8899aa;
const COL_HELM_HI = 0xaabbcc;
const COL_VISOR = 0x1a1a2e;
const COL_SHIELD = 0x445588;
const COL_SHIELD_HI = 0x5566aa;
const COL_SHIELD_DK = 0x334477;
const COL_SHIELD_RIM = 0x997744;
const COL_SHIELD_BAND = 0x886633;
const COL_SHIELD_EMB = 0xddcc44;
const COL_SWORD_BLD = 0xc0c8d0;
const COL_SWORD_HI = 0xe0e8f0;
const COL_SWORD_GRD = 0x886633;
const COL_SWORD_POM = 0x664422;
const COL_BOOT = 0x556677;
const COL_BOOT_DK = 0x445566;
const COL_CAPE = 0x556688;
const COL_CAPE_DK = 0x445577;
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
  const bw = 6, bh = 6 - squash;
  // Heavier armored boots
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
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
  // Plate leg armor — thicker
  g.rect(cx - 6 + stanceL, legTop, 5, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 5, legH).fill({ color: COL_PLATE_DK });
  // Knee guards
  g.ellipse(cx - 3.5 + stanceL, legTop + legH * 0.3, 3, 2).fill({ color: COL_PLATE });
  g.ellipse(cx + 3.5 + stanceR, legTop + legH * 0.3, 3, 2).fill({ color: COL_PLATE });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 16; // wider than swordsman
  const x = cx - tw / 2 + tilt;
  // Full plate cuirass
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.8 });
  // Plate lines (horizontal rivet rows)
  for (let row = 3; row < torsoH - 1; row += 3) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.4, alpha: 0.6 });
  }
  // Heavy pauldrons (larger than swordsman)
  g.ellipse(x, torsoTop + 2, 5, 4).fill({ color: COL_PLATE_HI });
  g.ellipse(x + tw, torsoTop + 2, 5, 4).fill({ color: COL_PLATE_HI });
  // Pauldron rivets
  g.circle(x, torsoTop + 2, 1).fill({ color: COL_PLATE_DK });
  g.circle(x + tw, torsoTop + 2, 1).fill({ color: COL_PLATE_DK });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 11, hh = 10;
  const x = cx - hw / 2 + tilt;
  // Great helm — taller and more enclosed
  g.roundRect(x, helmTop, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 0.7 });
  // Highlight on dome
  g.roundRect(x + 2, helmTop + 1, 5, 3, 1).fill({ color: COL_HELM_HI, alpha: 0.5 });
  // Narrow visor slit
  g.rect(x + 2, helmTop + hh - 4, hw - 4, 1.5).fill({ color: COL_VISOR });
  // Vertical face guard
  g.rect(cx - 1 + tilt, helmTop + 3, 2, hh - 4).fill({ color: COL_PLATE_DK });
  // Crest ridge on top
  g.rect(cx - 1 + tilt, helmTop - 1, 2, 3).fill({ color: COL_PLATE_DK });
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
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .lineTo(x + wave * 1.5, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
}

/** Large rectangular tower shield — covers most of the body. */
function drawTowerShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
  tilt = 0,
): void {
  const sw = 12 * scale;
  const sh = 20 * scale;
  const x = sx + tilt;

  // Shield body — tall rectangle with slightly rounded top
  g.roundRect(x, sy, sw, sh, 2)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1.2 });

  // Highlight edge (left side catches light)
  g.rect(x + 1, sy + 2, 2, sh - 4).fill({ color: COL_SHIELD_HI, alpha: 0.4 });

  // Dark right edge
  g.rect(x + sw - 3, sy + 2, 2, sh - 4).fill({ color: COL_SHIELD_DK, alpha: 0.5 });

  // Horizontal reinforcement bands
  g.rect(x + 1, sy + sh * 0.25, sw - 2, 2).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.55, sw - 2, 2).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.8, sw - 2, 2).fill({ color: COL_SHIELD_BAND });

  // Central boss (round metal decoration)
  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.4;
  g.circle(bossCx, bossCy, 3 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 2 * scale).fill({ color: COL_SHIELD_EMB });

  // Corner rivets
  g.circle(x + 2.5, sy + 3, 0.8).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 2.5, sy + 3, 0.8).fill({ color: COL_SHIELD_RIM });
  g.circle(x + 2.5, sy + sh - 3, 0.8).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 2.5, sy + sh - 3, 0.8).fill({ color: COL_SHIELD_RIM });
}

function drawSword(
  g: Graphics,
  bladeX: number,
  bladeY: number,
  angle: number,
  bladeLen = 12,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bladeX + sin * bladeLen;
  const tipY = bladeY - cos * bladeLen;

  g.moveTo(bladeX, bladeY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SWORD_BLD, width: 2 });
  g.moveTo(bladeX + cos * 0.5, bladeY + sin * 0.5)
    .lineTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .stroke({ color: COL_SWORD_HI, width: 0.6, alpha: 0.7 });

  // Crossguard
  g.moveTo(bladeX + cos * 2.5, bladeY + sin * 2.5)
    .lineTo(bladeX - cos * 2.5, bladeY - sin * 2.5)
    .stroke({ color: COL_SWORD_GRD, width: 2 });
  // Pommel
  g.circle(bladeX - sin * 2.5, bladeY + cos * 2.5, 1.3)
    .fill({ color: COL_SWORD_POM });
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
  const torsoH = 13;
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

  // Sword arm (right) — short sword resting
  drawArm(g, CX + 7, torsoTop + 4, CX + 11, torsoTop + torsoH - 1);
  drawSword(g, CX + 11, torsoTop + torsoH - 1, 0.2 + t * 0.04, 12);

  // Shield arm (left) — tower shield upright
  drawArm(g, CX - 7, torsoTop + 4, CX - 12, torsoTop + 6);
  drawTowerShield(g, CX - 22, torsoTop - 2, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5; // less bounce — heavy unit

  const legH = 8;
  const torsoH = 13;
  const stanceL = Math.round(walkCycle * 2); // shorter stride
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

  // Sword arm
  drawArm(g, CX + 7, torsoTop + 4, CX + 10 + walkCycle * 0.5, torsoTop + torsoH - 2);
  drawSword(g, CX + 10 + walkCycle * 0.5, torsoTop + torsoH - 2, 0.3, 12);

  // Shield arm — shield stays up front, bounces slightly
  drawArm(g, CX - 7, torsoTop + 4, CX - 11, torsoTop + 6 - walkCycle * 0.5);
  drawTowerShield(g, CX - 21, torsoTop - 2 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: shield bash + sword stab
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;

  // Lean forward with shield bash
  const lean = t < 0.55 ? t * 4 : (1 - t) * 6;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Sword stab: rises then thrusts forward
  let swordAngle: number;
  if (t < 0.35) {
    swordAngle = lerp(0.3, -0.5, t / 0.35);
  } else if (t < 0.75) {
    swordAngle = lerp(-0.5, 0.8, (t - 0.35) / 0.4); // thrust
  } else {
    swordAngle = lerp(0.8, 0.3, (t - 0.75) / 0.25);
  }

  const lunge = t > 0.3 && t < 0.8 ? 3 : 0;

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawCape(g, CX + lean * 0.2, torsoTop + 2, legH + torsoH - 2, -lean * 0.4);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Sword arm — thrusting past shield
  const sArmX = CX + 8 + lean + (t > 0.3 ? 3 : 0);
  const sArmY = torsoTop + 5;
  drawArm(g, CX + 7 + lean, torsoTop + 4, sArmX, sArmY);
  drawSword(g, sArmX, sArmY, swordAngle, 12);

  // Shield arm — shield bashes forward
  const shieldPush = lean * 0.8;
  drawArm(g, CX - 7 + lean, torsoTop + 4, CX - 10 + shieldPush, torsoTop + 6);
  drawTowerShield(g, CX - 19 + shieldPush, torsoTop - 2, 0.9, shieldPush * 0.3);

  // Shield impact flash at peak
  if (t >= 0.4 && t <= 0.65) {
    const flashAlpha = 1 - Math.abs(t - 0.52) / 0.13;
    g.circle(CX - 14 + shieldPush, torsoTop + 8, 4)
      .fill({ color: 0xffffff, alpha: flashAlpha * 0.3 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Shield raised high — defensive stance
  drawArm(g, CX - 7, torsoTop + 3, CX - 10, torsoTop);
  drawTowerShield(g, CX - 20, torsoTop - 6, 0.95);

  // Sword at ready
  drawArm(g, CX + 7, torsoTop + 3, CX + 10, torsoTop + torsoH - 2);
  drawSword(g, CX + 10, torsoTop + torsoH - 2, 0.2, 12);

  // Defensive glow around shield
  const glowR = 8 + pulse * 3;
  g.circle(CX - 14, torsoTop + 4, glowR)
    .fill({ color: 0x6688cc, alpha: 0.1 + pulse * 0.1 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 8;
  const torsoH = 13;
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
      CX - 20 + fallX * 0.5,
      torsoTop + dropY * 0.3,
      0.9 * (1 - t * 0.4),
      t * 3,
    );
  }

  // Sword drops
  if (t < 0.8) {
    const sdx = CX + 12 + t * 6;
    const sdy = torsoTop + torsoH * 0.5 + t * 5;
    drawSword(g, sdx, sdy, 0.3 + t * 2, 12 * (1 - t * 0.3));
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

export function generateDefenderFrames(
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
