// Procedural sprite generator for the Royal Guard — elite heavy infantry.
// Gilded plate armour, tower shield with royal crest, short sword, flowing
// royal-blue cloak. 48×48 px per frame.

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette
const COL_PLATE = 0xbbbbcc;
const COL_PLATE_HI = 0xddddee;
const COL_PLATE_DK = 0x888899;
const COL_GOLD = 0xd4af37;
const COL_GOLD_HI = 0xf5d76e;
const COL_GOLD_DK = 0x9e8429;
const COL_CLOAK = 0x1a3366;
const COL_CLOAK_LT = 0x2a4488;
const COL_SHIELD = 0x1a3366;
const COL_SHIELD_HI = 0x2a4488;
const COL_SHIELD_EDGE = 0xd4af37;
const COL_CREST = 0xcc2222;
const COL_SWORD = 0xccccdd;
const COL_SWORD_HI = 0xeeeeff;
const COL_HILT = 0x8b4513;
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_SH = 0xd4a880;
const COL_HELM = 0xbbbbcc;
const COL_HELM_HI = 0xddddee;
const COL_PLUME = 0xcc2222;
const COL_PLUME_TIP = 0xff6644;
const COL_BOOT = 0x555566;
const COL_SHADOW = 0x000000;

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}
function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}
function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w: number): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

function drawShadow(g: Graphics): void {
  ellipse(g, CX, GY + 1, 12, 3, COL_SHADOW, 0.3);
}

function drawCloak(g: Graphics, bob: number, wave = 0): void {
  g.beginPath();
  g.moveTo(CX - 9, GY - 26 + bob);
  g.lineTo(CX - 12 + wave, GY - 2);
  g.lineTo(CX + 12 - wave, GY - 2);
  g.lineTo(CX + 9, GY - 26 + bob);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  // Highlight fold
  g.beginPath();
  g.moveTo(CX + 2, GY - 24 + bob);
  g.lineTo(CX, GY - 4);
  g.lineTo(CX + 5, GY - 4);
  g.closePath();
  g.fill({ color: COL_CLOAK_LT, alpha: 0.3 });
}

function drawLegs(g: Graphics, bob: number, swing = 0): void {
  // Greaves
  rect(g, CX - 6 - swing * 0.3, GY - 18 + bob, 5, 14, COL_PLATE_DK);
  rect(g, CX + 1 + swing * 0.3, GY - 18 + bob, 5, 14, COL_PLATE_DK);
  // Knee guards
  circle(g, CX - 3.5 - swing * 0.3, GY - 12 + bob, 2, COL_GOLD);
  circle(g, CX + 3.5 + swing * 0.3, GY - 12 + bob, 2, COL_GOLD);
  // Boots
  rect(g, CX - 7 - swing * 0.5, GY - 5, 7, 6, COL_BOOT);
  rect(g, CX + 0 + swing * 0.5, GY - 5, 7, 6, COL_BOOT);
}

function drawArmor(g: Graphics, bob: number): void {
  const ty = GY - 28 + bob;
  // Plate body
  rect(g, CX - 9, ty, 18, 14, COL_PLATE);
  rect(g, CX - 7, ty + 2, 14, 10, COL_PLATE_HI);
  // Gold trim
  rect(g, CX - 9, ty, 18, 2, COL_GOLD);
  rect(g, CX - 9, ty + 12, 18, 2, COL_GOLD);
  rect(g, CX - 1, ty + 2, 2, 10, COL_GOLD_DK);
  // Shoulder pauldrons
  ellipse(g, CX - 10, ty + 2, 4, 3, COL_PLATE);
  ellipse(g, CX + 10, ty + 2, 4, 3, COL_PLATE);
  rect(g, CX - 12, ty + 1, 4, 1, COL_GOLD);
  rect(g, CX + 8, ty + 1, 4, 1, COL_GOLD);
  // Royal crest on chest
  circle(g, CX, ty + 7, 3, COL_CREST);
  circle(g, CX, ty + 7, 1.5, COL_GOLD);
}

function drawHelm(g: Graphics, bob: number): void {
  const hy = GY - 36 + bob;
  // Neck guard
  rect(g, CX - 4, hy + 8, 8, 3, COL_PLATE_DK);
  // Face
  rect(g, CX - 4, hy + 2, 8, 6, COL_SKIN);
  rect(g, CX - 3, hy + 3, 6, 4, COL_SKIN_SH);
  // Eyes
  rect(g, CX - 3, hy + 4, 2, 1.5, 0x222222);
  rect(g, CX + 1, hy + 4, 2, 1.5, 0x222222);
  // Helm
  rect(g, CX - 6, hy - 2, 12, 5, COL_HELM);
  rect(g, CX - 5, hy - 1, 10, 3, COL_HELM_HI);
  // Nose guard
  rect(g, CX - 0.5, hy + 1, 1, 4, COL_HELM);
  // Gold trim on helm
  rect(g, CX - 6, hy - 2, 12, 1, COL_GOLD);
  // Plume
  rect(g, CX - 1, hy - 8, 2, 7, COL_PLUME);
  circle(g, CX, hy - 8, 2, COL_PLUME_TIP);
  for (let i = 0; i < 3; i++) {
    rect(g, CX - 2, hy - 7 + i * 2, 4, 1, COL_PLUME, 0.7);
  }
}

function drawShield(g: Graphics, bob: number, ox = 0, oy = 0): void {
  const sx = CX - 14 + ox;
  const sy = GY - 28 + bob + oy;
  // Shield body (tall kite shield)
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 8, sy);
  g.lineTo(sx + 8, sy + 14);
  g.lineTo(sx + 4, sy + 18);
  g.lineTo(sx, sy + 14);
  g.closePath();
  g.fill({ color: COL_SHIELD });
  // Highlight
  rect(g, sx + 1, sy + 1, 6, 12, COL_SHIELD_HI);
  // Gold border
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 8, sy);
  g.lineTo(sx + 8, sy + 14);
  g.lineTo(sx + 4, sy + 18);
  g.lineTo(sx, sy + 14);
  g.closePath();
  g.stroke({ color: COL_SHIELD_EDGE, width: 1 });
  // Crest on shield
  circle(g, sx + 4, sy + 7, 2.5, COL_CREST);
  circle(g, sx + 4, sy + 7, 1.2, COL_GOLD);
  // Gold cross
  rect(g, sx + 3.5, sy + 2, 1, 10, COL_GOLD_DK);
  rect(g, sx + 1, sy + 6.5, 6, 1, COL_GOLD_DK);
}

function drawSword(g: Graphics, bob: number, angle = 0): void {
  const sx = CX + 10;
  const sy = GY - 22 + bob;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bx = (dx: number, dy: number) => sx + dx * cos - dy * sin;
  const by = (dx: number, dy: number) => sy + dx * sin + dy * cos;
  // Blade
  g.beginPath();
  g.moveTo(bx(0, 0), by(0, 0));
  g.lineTo(bx(1.5, -14), by(1.5, -14));
  g.lineTo(bx(0, -16), by(0, -16));
  g.lineTo(bx(-1.5, -14), by(-1.5, -14));
  g.closePath();
  g.fill({ color: COL_SWORD });
  line(g, bx(0, 0), by(0, 0), bx(0, -15), by(0, -15), COL_SWORD_HI, 0.5);
  // Cross-guard
  rect(g, bx(-3, 0) - 1.5, by(-3, 0) - 0.5, 7, 2, COL_GOLD);
  // Hilt
  rect(g, bx(-0.5, 2) - 0.5, by(-0.5, 2), 2, 4, COL_HILT);
  // Pommel
  circle(g, bx(0, 6), by(0, 6), 1.5, COL_GOLD);
}

function drawFull(g: Graphics, bob: number, swing = 0, wave = 0): void {
  drawShadow(g);
  drawCloak(g, bob, wave);
  drawLegs(g, bob, swing);
  drawArmor(g, bob);
  drawShield(g, bob);
  drawSword(g, bob);
  drawHelm(g, bob);
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number): void {
  const bob = Math.sin(frame * 0.8) * 0.5;
  drawFull(g, bob);
}

function drawMove(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  const swing = Math.sin(t * Math.PI * 2) * 3;
  const wave = Math.sin(t * Math.PI * 2 + 1) * 2;
  drawShadow(g);
  drawCloak(g, bob, wave);
  drawLegs(g, bob, swing);
  drawArmor(g, bob);
  drawShield(g, bob, -swing * 0.3);
  drawSword(g, bob, swing * 0.02);
  drawHelm(g, bob);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI) * 2;
  const swordAngle = -t * 1.2;
  drawShadow(g);
  drawCloak(g, bob, -1);
  drawLegs(g, bob);
  drawArmor(g, bob);
  drawShield(g, bob, -2, -t * 3);
  drawSword(g, bob, swordAngle);
  drawHelm(g, bob);
  // Sword slash arc
  if (t > 0.3 && t < 0.8) {
    const alpha = 1 - Math.abs(t - 0.55) * 4;
    for (let i = 0; i < 3; i++) {
      const a = swordAngle + i * 0.3;
      const d = 14 + i * 2;
      circle(g, CX + 10 + Math.cos(a) * d, GY - 22 + bob + Math.sin(a) * d, 1, COL_SWORD_HI, alpha * 0.5);
    }
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 5;
  const bob = 0;
  drawShadow(g);
  drawCloak(g, bob);
  drawLegs(g, bob);
  drawArmor(g, bob);
  // Shield raised
  drawShield(g, bob, 0, -t * 6);
  drawSword(g, bob);
  drawHelm(g, bob);
  // Shield glow
  const alpha = Math.sin(t * Math.PI) * 0.6;
  circle(g, CX - 10, GY - 22 - t * 6, 8, COL_GOLD, alpha * 0.3);
  circle(g, CX - 10, GY - 22 - t * 6, 5, COL_GOLD_HI, alpha * 0.4);
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 18;
  const ox = t * 5;
  ellipse(g, CX, GY + 1, 12 - t * 3, 3 - t, COL_SHADOW, 0.3 * (1 - t * 0.3));
  // Cloak crumples
  g.beginPath();
  g.moveTo(CX - 9 + ox, GY - 26 + fall);
  g.lineTo(CX - 12 + ox, GY - 2 + fall * 0.3);
  g.lineTo(CX + 12 + ox, GY - 2 + fall * 0.3);
  g.lineTo(CX + 9 + ox, GY - 26 + fall);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  // Body
  rect(g, CX - 6 + ox, GY - 18 + fall, 5, 14, COL_PLATE_DK);
  rect(g, CX + 1 + ox, GY - 18 + fall, 5, 14, COL_PLATE_DK);
  rect(g, CX - 9 + ox, GY - 28 + fall, 18, 14, COL_PLATE);
  rect(g, CX - 9 + ox, GY - 28 + fall, 18, 2, COL_GOLD);
  // Helm
  rect(g, CX - 6 + ox, GY - 38 + fall, 12, 5, COL_HELM);
  rect(g, CX - 6 + ox, GY - 38 + fall, 12, 1, COL_GOLD);
  // Shield falls
  const shieldDrift = t * 10;
  drawShield(g, fall * 0.5, -shieldDrift, shieldDrift);
  // Sword drops
  if (t > 0.2) {
    const sd = (t - 0.2) * 8;
    rect(g, CX + 12 + sd * 2, GY - 20 + fall + sd * 3, 2, 12, COL_SWORD);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateRoyalGuardFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();
      switch (state) {
        case UnitState.IDLE: drawIdle(g, col); break;
        case UnitState.MOVE: drawMove(g, col); break;
        case UnitState.ATTACK: drawAttack(g, col); break;
        case UnitState.CAST: drawCast(g, col); break;
        case UnitState.DIE: drawDie(g, col); break;
      }
      const texture = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }
  return frames;
}
