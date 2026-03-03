// Procedural sprite generator for the Ancient Defender unit type.
//
// A T4 "Ancient One" variant of the Defender — bigger (48×72 frame),
// blackened/corroded armor, grey undead-looking skin.
//
// Visual features:
//   • Taller than normal defenders (1.0 × 1.5 tile size)
//   • Dark, corroded plate armor with rust streaks
//   • Grey, lifeless skin
//   • Massive blackened tower shield
//   • Short corroded sword
//   • Tattered dark cape

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 48;
const FH = 72;
const CX = FW / 2;
const GY = FH - 6;

// Palette — blackened, ancient armor + grey skin
const COL_SKIN = 0x8a8a8a;
const COL_SKIN_DK = 0x6a6a6a;
const COL_PLATE = 0x2e2e38;
const COL_PLATE_HI = 0x44444e;
const COL_PLATE_DK = 0x1a1a22;
const COL_HELM = 0x33333d;
const COL_HELM_HI = 0x4a4a55;
const COL_VISOR = 0x0a0a14;
const COL_RUST = 0x5a3a2a;
const COL_SHIELD = 0x222230;
const COL_SHIELD_HI = 0x333344;
const COL_SHIELD_DK = 0x161622;
const COL_SHIELD_RIM = 0x554433;
const COL_SHIELD_BAND = 0x443322;
const COL_SHIELD_EMB = 0x887744;
const COL_SWORD_BLD = 0x606068;
const COL_SWORD_HI = 0x808088;
const COL_SWORD_GRD = 0x554433;
const COL_SWORD_POM = 0x332211;
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
// Drawing sub-routines (scaled up for the taller frame)
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
  const bw = 7, bh = 8 - squash;
  g.roundRect(cx - 9 + stanceL, gy - bh, bw, bh, 1)
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
  g.rect(cx - 7 + stanceL, legTop, 6, legH).fill({ color: COL_PLATE_DK });
  g.rect(cx + 1 + stanceR, legTop, 6, legH).fill({ color: COL_PLATE_DK });
  // Knee guards
  g.ellipse(cx - 4 + stanceL, legTop + legH * 0.3, 4, 3).fill({ color: COL_PLATE });
  g.ellipse(cx + 4 + stanceR, legTop + legH * 0.3, 4, 3).fill({ color: COL_PLATE });
  // Rust streaks on legs
  g.rect(cx - 6 + stanceL, legTop + legH * 0.5, 2, 3).fill({ color: COL_RUST, alpha: 0.3 });
  g.rect(cx + 3 + stanceR, legTop + legH * 0.6, 2, 3).fill({ color: COL_RUST, alpha: 0.3 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 20;
  const x = cx - tw / 2 + tilt;
  // Blackened cuirass
  g.roundRect(x, torsoTop, tw, torsoH, 3)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 1 });
  // Rivet rows
  for (let row = 4; row < torsoH - 2; row += 4) {
    g.moveTo(x + 3, torsoTop + row)
      .lineTo(x + tw - 3, torsoTop + row)
      .stroke({ color: COL_PLATE_HI, width: 0.5, alpha: 0.4 });
  }
  // Rust stains
  g.rect(x + 3, torsoTop + torsoH * 0.4, 4, 3).fill({ color: COL_RUST, alpha: 0.25 });
  g.rect(x + tw - 7, torsoTop + torsoH * 0.6, 3, 4).fill({ color: COL_RUST, alpha: 0.2 });
  // Heavy pauldrons
  g.ellipse(x, torsoTop + 3, 6, 5).fill({ color: COL_PLATE_HI });
  g.ellipse(x + tw, torsoTop + 3, 6, 5).fill({ color: COL_PLATE_HI });
  g.circle(x, torsoTop + 3, 1.2).fill({ color: COL_PLATE_DK });
  g.circle(x + tw, torsoTop + 3, 1.2).fill({ color: COL_PLATE_DK });
}

function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 14, hh = 13;
  const x = cx - hw / 2 + tilt;
  // Great helm — blackened
  g.roundRect(x, helmTop, hw, hh, 4)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_PLATE_DK, width: 0.8 });
  // Dim highlight
  g.roundRect(x + 3, helmTop + 1, 6, 4, 1).fill({ color: COL_HELM_HI, alpha: 0.3 });
  // Narrow visor slit — faint glow
  g.rect(x + 3, helmTop + hh - 5, hw - 6, 2).fill({ color: COL_VISOR });
  g.rect(x + 4, helmTop + hh - 5, hw - 8, 1).fill({ color: 0x445566, alpha: 0.3 });
  // Face guard
  g.rect(cx - 1 + tilt, helmTop + 4, 2, hh - 5).fill({ color: COL_PLATE_DK });
  // Crest ridge
  g.rect(cx - 1 + tilt, helmTop - 1, 2, 4).fill({ color: COL_PLATE_DK });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 14;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 2, capeTop + capeH)
    .lineTo(x + wave * 1.5, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.6 });
  // Tattered edges
  for (let i = 0; i < 3; i++) {
    const tx = x + 2 + i * 4;
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
  const sw = 15 * scale;
  const sh = 26 * scale;
  const x = sx + tilt;

  // Blackened shield body
  g.roundRect(x, sy, sw, sh, 3)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1.2 });

  g.rect(x + 1, sy + 3, 2.5, sh - 6).fill({ color: COL_SHIELD_HI, alpha: 0.3 });
  g.rect(x + sw - 3.5, sy + 3, 2.5, sh - 6).fill({ color: COL_SHIELD_DK, alpha: 0.4 });

  // Corroded bands
  g.rect(x + 1, sy + sh * 0.25, sw - 2, 2.5).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.55, sw - 2, 2.5).fill({ color: COL_SHIELD_BAND });
  g.rect(x + 1, sy + sh * 0.8, sw - 2, 2.5).fill({ color: COL_SHIELD_BAND });

  // Rust on shield
  g.rect(x + 3, sy + sh * 0.3, 3, 4).fill({ color: COL_RUST, alpha: 0.3 });
  g.rect(x + sw - 6, sy + sh * 0.6, 4, 3).fill({ color: COL_RUST, alpha: 0.25 });

  // Faded central boss
  const bossCx = x + sw / 2;
  const bossCy = sy + sh * 0.4;
  g.circle(bossCx, bossCy, 4 * scale).fill({ color: COL_SHIELD_BAND });
  g.circle(bossCx, bossCy, 2.5 * scale).fill({ color: COL_SHIELD_EMB });

  // Corner rivets
  g.circle(x + 3, sy + 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3, sy + 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + 3, sy + sh - 4, 1).fill({ color: COL_SHIELD_RIM });
  g.circle(x + sw - 3, sy + sh - 4, 1).fill({ color: COL_SHIELD_RIM });
}

function drawSword(
  g: Graphics,
  bladeX: number,
  bladeY: number,
  angle: number,
  bladeLen = 16,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bladeX + sin * bladeLen;
  const tipY = bladeY - cos * bladeLen;

  g.moveTo(bladeX, bladeY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SWORD_BLD, width: 2.5 });
  g.moveTo(bladeX + cos * 0.5, bladeY + sin * 0.5)
    .lineTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .stroke({ color: COL_SWORD_HI, width: 0.7, alpha: 0.5 });

  // Crossguard
  g.moveTo(bladeX + cos * 3, bladeY + sin * 3)
    .lineTo(bladeX - cos * 3, bladeY - sin * 3)
    .stroke({ color: COL_SWORD_GRD, width: 2.5 });
  // Pommel
  g.circle(bladeX - sin * 3, bladeY + cos * 3, 1.5)
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
  const torsoH = 18;
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

  // Sword arm (right)
  drawArm(g, CX + 9, torsoTop + 5, CX + 14, torsoTop + torsoH - 2);
  drawSword(g, CX + 14, torsoTop + torsoH - 2, 0.2 + t * 0.04, 16);

  // Shield arm (left)
  drawArm(g, CX - 9, torsoTop + 5, CX - 14, torsoTop + 7);
  drawTowerShield(g, CX - 28, torsoTop - 3, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const legH = 12;
  const torsoH = 18;
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

  // Sword arm
  drawArm(g, CX + 9, torsoTop + 5, CX + 13 + walkCycle * 0.5, torsoTop + torsoH - 3);
  drawSword(g, CX + 13 + walkCycle * 0.5, torsoTop + torsoH - 3, 0.3, 16);

  // Shield arm
  drawArm(g, CX - 9, torsoTop + 5, CX - 13, torsoTop + 7 - walkCycle * 0.5);
  drawTowerShield(g, CX - 26, torsoTop - 3 - walkCycle * 0.3, 0.88);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 12;
  const torsoH = 18;
  const legTop = GY - 7 - legH;

  const lean = t < 0.55 ? t * 5 : (1 - t) * 7;
  const torsoTop = legTop - torsoH + 3;
  const helmTop = torsoTop - 13;

  let swordAngle: number;
  if (t < 0.35) {
    swordAngle = lerp(0.3, -0.5, t / 0.35);
  } else if (t < 0.75) {
    swordAngle = lerp(-0.5, 0.8, (t - 0.35) / 0.4);
  } else {
    swordAngle = lerp(0.8, 0.3, (t - 0.75) / 0.25);
  }

  const lunge = t > 0.3 && t < 0.8 ? 4 : 0;

  drawShadow(g, CX + lean, GY, 16 + lean, 5);
  drawCape(g, CX + lean * 0.2, torsoTop + 3, legH + torsoH - 3, -lean * 0.4);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Sword arm — thrusting
  const sArmX = CX + 10 + lean + (t > 0.3 ? 4 : 0);
  const sArmY = torsoTop + 6;
  drawArm(g, CX + 9 + lean, torsoTop + 5, sArmX, sArmY);
  drawSword(g, sArmX, sArmY, swordAngle, 16);

  // Shield bash
  const shieldPush = lean * 0.8;
  drawArm(g, CX - 9 + lean, torsoTop + 5, CX - 12 + shieldPush, torsoTop + 7);
  drawTowerShield(g, CX - 24 + shieldPush, torsoTop - 3, 0.9, shieldPush * 0.3);

  // Impact flash
  if (t >= 0.4 && t <= 0.65) {
    const flashAlpha = 1 - Math.abs(t - 0.52) / 0.13;
    g.circle(CX - 17 + shieldPush, torsoTop + 10, 5)
      .fill({ color: 0xffffff, alpha: flashAlpha * 0.25 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 12;
  const torsoH = 18;
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
  drawArm(g, CX - 9, torsoTop + 4, CX - 12, torsoTop);
  drawTowerShield(g, CX - 25, torsoTop - 8, 0.95);

  // Sword at ready
  drawArm(g, CX + 9, torsoTop + 4, CX + 13, torsoTop + torsoH - 3);
  drawSword(g, CX + 13, torsoTop + torsoH - 3, 0.2, 16);

  // Dark glow
  const glowR = 10 + pulse * 4;
  g.circle(CX - 17, torsoTop + 6, glowR)
    .fill({ color: 0x334455, alpha: 0.1 + pulse * 0.08 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 12;
  const torsoH = 18;
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

  // Shield falls flat
  if (t < 0.7) {
    drawTowerShield(
      g,
      CX - 24 + fallX * 0.5,
      torsoTop + dropY * 0.3,
      0.9 * (1 - t * 0.4),
      t * 3,
    );
  }

  // Sword drops
  if (t < 0.8) {
    const sdx = CX + 14 + t * 8;
    const sdy = torsoTop + torsoH * 0.5 + t * 6;
    drawSword(g, sdx, sdy, 0.3 + t * 2, 16 * (1 - t * 0.3));
  }

  // Arm on ground
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.4 + 6, torsoTop + 6, CX + fallX * 0.4 + 11, torsoTop + torsoH - 3, COL_PLATE);
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

export function generateAncientDefenderFrames(
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
