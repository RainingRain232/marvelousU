// Procedural sprite generator for the Cataphract — heavily armored cavalry.
// Full plate barding on the horse, lance + kite shield, crested helm.
// 96×96 px per frame (2×2 unit size).

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 96;
const CX = F / 2;
const GY = F - 6;

const COL_PLATE = 0xbbbbcc;
const COL_PLATE_HI = 0xddddee;
const COL_PLATE_DK = 0x888899;
const COL_GOLD = 0xd4af37;
const COL_GOLD_HI = 0xf5d76e;
const COL_HORSE = 0x4a3020;
const COL_HORSE_HI = 0x6a4a30;
const COL_HORSE_DK = 0x2a1a10;
const COL_BARDING = 0x888899;
const COL_BARDING_HI = 0xaaaabb;
const COL_BARDING_DK = 0x666677;
const COL_MANE = 0x1a1a1a;
const COL_TAIL = 0x1a1a1a;
const COL_LANCE = 0x7a5530;
const COL_LANCE_TIP = 0xccccdd;
const COL_SHIELD = 0x1a3366;
const COL_SHIELD_EDGE = 0xd4af37;
const COL_CREST = 0xcc2222;
const COL_PLUME = 0xcc2222;
const COL_CLOAK = 0x1a3366;
const COL_CLOAK_LT = 0x2a4488;
const COL_SKIN = 0xf5d0b0;
const COL_BOOT = 0x555566;
const COL_SHADOW = 0x000000;
const COL_HOOF = 0x333333;

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
  ellipse(g, CX, GY + 2, 28, 5, COL_SHADOW, 0.3);
}

function drawHorseLegs(g: Graphics, bob: number, gallop = 0): void {
  const frontSwing = Math.sin(gallop) * 8;
  const backSwing = Math.sin(gallop + Math.PI) * 8;
  // Back legs
  rect(g, CX + 10, GY - 18 + bob + backSwing * 0.5, 5, 16 - backSwing * 0.3, COL_HORSE_DK);
  rect(g, CX + 16, GY - 18 + bob - backSwing * 0.5, 5, 16 + backSwing * 0.3, COL_HORSE_DK);
  // Front legs
  rect(g, CX - 18, GY - 18 + bob + frontSwing * 0.5, 5, 16 - frontSwing * 0.3, COL_HORSE_DK);
  rect(g, CX - 12, GY - 18 + bob - frontSwing * 0.5, 5, 16 + frontSwing * 0.3, COL_HORSE_DK);
  // Hooves
  rect(g, CX + 10, GY - 3 + backSwing * 0.3, 6, 4, COL_HOOF);
  rect(g, CX + 16, GY - 3 - backSwing * 0.3, 6, 4, COL_HOOF);
  rect(g, CX - 18, GY - 3 + frontSwing * 0.3, 6, 4, COL_HOOF);
  rect(g, CX - 12, GY - 3 - frontSwing * 0.3, 6, 4, COL_HOOF);
}

function drawHorseBody(g: Graphics, bob: number): void {
  const hy = GY - 24 + bob;
  // Horse barrel body
  g.roundRect(CX - 20, hy, 40, 14, 4).fill({ color: COL_HORSE });
  g.roundRect(CX - 18, hy + 2, 36, 10, 3).fill({ color: COL_HORSE_HI });
  // Barding (armor plating)
  rect(g, CX - 18, hy, 36, 3, COL_BARDING);
  rect(g, CX - 18, hy + 1, 36, 1, COL_BARDING_HI);
  rect(g, CX - 18, hy + 11, 36, 3, COL_BARDING);
  // Gold trim on barding
  rect(g, CX - 18, hy, 36, 1, COL_GOLD);
  rect(g, CX - 18, hy + 13, 36, 1, COL_GOLD);
  // Side barding plates
  for (let i = 0; i < 4; i++) {
    rect(g, CX - 16 + i * 9, hy + 3, 7, 8, COL_BARDING_DK);
    rect(g, CX - 15 + i * 9, hy + 4, 5, 6, COL_BARDING);
    // Gold rivets
    circle(g, CX - 12 + i * 9, hy + 7, 0.8, COL_GOLD);
  }
}

function drawHorseHead(g: Graphics, bob: number): void {
  const hx = CX - 22;
  const hy = GY - 32 + bob;
  // Neck
  g.beginPath();
  g.moveTo(CX - 18, GY - 24 + bob);
  g.lineTo(hx + 2, hy + 4);
  g.lineTo(hx + 8, hy + 4);
  g.lineTo(CX - 14, GY - 24 + bob);
  g.closePath();
  g.fill({ color: COL_HORSE });
  // Neck barding
  line(g, CX - 18, GY - 24 + bob, hx + 3, hy + 4, COL_BARDING, 2);
  // Head
  rect(g, hx - 4, hy, 10, 8, COL_HORSE);
  rect(g, hx - 3, hy + 1, 8, 6, COL_HORSE_HI);
  // Chanfron (face armor)
  rect(g, hx - 3, hy, 8, 4, COL_BARDING);
  rect(g, hx - 2, hy + 1, 6, 2, COL_BARDING_HI);
  circle(g, hx + 1, hy + 2, 1, COL_GOLD);
  // Eye
  circle(g, hx - 1, hy + 4, 1.5, 0x222222);
  circle(g, hx - 1, hy + 4, 0.7, 0x444444);
  // Mane
  for (let i = 0; i < 4; i++) {
    rect(g, hx + 3 + i * 3, hy - 2 - i, 2, 4 + i, COL_MANE);
  }
  // Ears
  rect(g, hx, hy - 3, 2, 3, COL_HORSE);
  rect(g, hx + 3, hy - 3, 2, 3, COL_HORSE);
}

function drawTail(g: Graphics, bob: number, swing = 0): void {
  const tx = CX + 20;
  const ty = GY - 22 + bob;
  g.beginPath();
  g.moveTo(tx, ty);
  g.lineTo(tx + 6 + swing, ty + 4);
  g.lineTo(tx + 8 + swing, ty + 10);
  g.lineTo(tx + 4 + swing * 0.5, ty + 14);
  g.lineTo(tx + 2, ty + 8);
  g.closePath();
  g.fill({ color: COL_TAIL });
}

function drawRider(g: Graphics, bob: number, leanAngle = 0): void {
  const ry = GY - 36 + bob;
  // Cloak
  g.beginPath();
  g.moveTo(CX - 4, ry);
  g.lineTo(CX - 8, ry + 16);
  g.lineTo(CX + 8, ry + 16);
  g.lineTo(CX + 4, ry);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  g.beginPath();
  g.moveTo(CX, ry + 2);
  g.lineTo(CX - 2, ry + 14);
  g.lineTo(CX + 2, ry + 14);
  g.closePath();
  g.fill({ color: COL_CLOAK_LT, alpha: 0.3 });
  // Legs (riding position)
  rect(g, CX - 8, ry + 10, 4, 8, COL_PLATE_DK);
  rect(g, CX + 4, ry + 10, 4, 8, COL_PLATE_DK);
  // Boots/stirrups
  rect(g, CX - 9, ry + 16, 5, 3, COL_BOOT);
  rect(g, CX + 4, ry + 16, 5, 3, COL_BOOT);
  // Torso
  rect(g, CX - 6, ry, 12, 12, COL_PLATE);
  rect(g, CX - 4, ry + 2, 8, 8, COL_PLATE_HI);
  // Gold trim
  rect(g, CX - 6, ry, 12, 1, COL_GOLD);
  rect(g, CX - 6, ry + 11, 12, 1, COL_GOLD);
  // Crest emblem
  circle(g, CX, ry + 6, 2, COL_CREST);
  circle(g, CX, ry + 6, 1, COL_GOLD);
  // Shoulder pauldrons
  ellipse(g, CX - 7, ry + 2, 3, 2.5, COL_PLATE);
  ellipse(g, CX + 7, ry + 2, 3, 2.5, COL_PLATE);
  circle(g, CX - 7, ry + 2, 1, COL_GOLD);
  circle(g, CX + 7, ry + 2, 1, COL_GOLD);
  // Helm
  const helmY = ry - 8;
  rect(g, CX - 5, helmY, 10, 9, COL_PLATE);
  rect(g, CX - 4, helmY + 1, 8, 7, COL_PLATE_HI);
  // Visor slit
  rect(g, CX - 3, helmY + 4, 6, 2, 0x222222);
  // Nose guard
  rect(g, CX - 0.5, helmY + 3, 1, 4, COL_PLATE_DK);
  // Gold trim on helm
  rect(g, CX - 5, helmY, 10, 1, COL_GOLD);
  // Plume
  rect(g, CX - 1, helmY - 6, 2, 7, COL_PLUME);
  for (let i = 0; i < 3; i++) {
    rect(g, CX - 2, helmY - 5 + i * 2, 4, 1.5, COL_PLUME, 0.7);
  }
  circle(g, CX, helmY - 6, 2, COL_CREST);
}

function drawLance(g: Graphics, bob: number, angle = -0.15): void {
  const lx = CX - 10;
  const ly = GY - 38 + bob;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const len = 30;
  const ex = lx - len * cos;
  const ey = ly - len * sin;
  // Shaft
  line(g, lx, ly, ex, ey, COL_LANCE, 2);
  // Lance tip
  g.beginPath();
  g.moveTo(ex, ey);
  g.lineTo(ex - 4 * cos + 2 * sin, ey - 4 * sin - 2 * cos);
  g.lineTo(ex - 4 * cos - 2 * sin, ey - 4 * sin + 2 * cos);
  g.closePath();
  g.fill({ color: COL_LANCE_TIP });
  // Vamplate (hand guard)
  circle(g, lx - 4 * cos, ly - 4 * sin, 3, COL_PLATE);
  circle(g, lx - 4 * cos, ly - 4 * sin, 2, COL_GOLD);
}

function drawShield(g: Graphics, bob: number): void {
  const sx = CX - 12;
  const sy = GY - 38 + bob;
  // Kite shield
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 8, sy);
  g.lineTo(sx + 8, sy + 10);
  g.lineTo(sx + 4, sy + 14);
  g.lineTo(sx, sy + 10);
  g.closePath();
  g.fill({ color: COL_SHIELD });
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 8, sy);
  g.lineTo(sx + 8, sy + 10);
  g.lineTo(sx + 4, sy + 14);
  g.lineTo(sx, sy + 10);
  g.closePath();
  g.stroke({ color: COL_SHIELD_EDGE, width: 1 });
  // Crest
  circle(g, sx + 4, sy + 5, 2, COL_CREST);
  circle(g, sx + 4, sy + 5, 1, COL_GOLD);
}

function drawFull(g: Graphics, bob: number, gallop = 0, tailSwing = 0): void {
  drawShadow(g);
  drawTail(g, bob, tailSwing);
  drawHorseLegs(g, bob, gallop);
  drawHorseBody(g, bob);
  drawHorseHead(g, bob);
  drawRider(g, bob);
  drawShield(g, bob);
  drawLance(g, bob);
}

function drawIdle(g: Graphics, frame: number): void {
  const bob = Math.sin(frame * 0.6) * 0.5;
  const tailSwing = Math.sin(frame * 0.4) * 1;
  drawFull(g, bob, 0, tailSwing);
}

function drawMove(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const gallop = t * Math.PI * 2;
  const bob = Math.sin(gallop) * 3;
  const tailSwing = Math.sin(gallop + 1) * 3;
  drawFull(g, bob, gallop, tailSwing);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI) * 2;
  drawShadow(g);
  drawTail(g, bob, -2);
  drawHorseLegs(g, bob, t * Math.PI * 2);
  drawHorseBody(g, bob);
  drawHorseHead(g, bob);
  drawRider(g, bob);
  drawShield(g, bob);
  // Lance thrust forward
  drawLance(g, bob, -0.15 - t * 0.3);
  // Impact effect
  if (t > 0.6) {
    const alpha = (t - 0.6) * 2;
    for (let i = 0; i < 3; i++) {
      const d = 30 + t * 10 + i * 3;
      circle(g, CX - 10 - d * Math.cos(-0.3), GY - 38 + bob - d * Math.sin(-0.3) + i * 2, 1.5, COL_LANCE_TIP, alpha * 0.5);
    }
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 5;
  const bob = 0;
  drawShadow(g);
  drawTail(g, bob, Math.sin(t * Math.PI) * 2);
  drawHorseLegs(g, bob);
  drawHorseBody(g, bob);
  drawHorseHead(g, bob);
  drawRider(g, bob);
  // Shield raised
  const sx = CX - 12;
  const sy = GY - 38 - t * 6;
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + 8, sy);
  g.lineTo(sx + 8, sy + 10);
  g.lineTo(sx + 4, sy + 14);
  g.lineTo(sx, sy + 10);
  g.closePath();
  g.fill({ color: COL_SHIELD });
  g.stroke({ color: COL_SHIELD_EDGE, width: 1 });
  circle(g, sx + 4, sy + 5, 2, COL_CREST);
  drawLance(g, bob);
  // Shield glow
  circle(g, sx + 4, sy + 7, 6, COL_GOLD, Math.sin(t * Math.PI) * 0.2);
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 14;
  const ox = t * 6;
  ellipse(g, CX, GY + 2, 28 - t * 6, 5 - t * 2, COL_SHADOW, 0.3 * (1 - t * 0.3));
  // Horse collapses
  rect(g, CX - 20 + ox, GY - 24 + fall, 40, 14, COL_HORSE_DK);
  rect(g, CX - 18 + ox, GY - 22 + fall, 36, 3, COL_BARDING_DK);
  // Horse legs splay
  rect(g, CX - 18 + ox, GY - 18 + fall, 5, 12, COL_HORSE_DK);
  rect(g, CX + 14 + ox, GY - 18 + fall, 5, 12, COL_HORSE_DK);
  // Rider tumbles
  rect(g, CX - 6 + ox * 1.5, GY - 36 + fall + t * 4, 12, 12, COL_PLATE_DK);
  rect(g, CX - 5 + ox * 1.5, GY - 44 + fall + t * 6, 10, 9, COL_PLATE);
  // Plume
  rect(g, CX - 1 + ox * 1.5, GY - 50 + fall + t * 6, 2, 5, COL_PLUME);
  // Lance breaks
  if (t > 0.2) {
    const ld = (t - 0.2) * 15;
    line(g, CX - 14 - ld, GY - 30 + fall, CX - 24 - ld, GY - 34 + fall, COL_LANCE, 2);
    rect(g, CX - 6 + ld, GY - 36 + fall + ld, 2, 8, COL_LANCE);
  }
  // Shield flies off
  if (t > 0.3) {
    const sd = (t - 0.3) * 12;
    rect(g, CX - 16 - sd, GY - 38 + fall + sd, 6, 8, COL_SHIELD);
  }
}

export function generateCataphractFrames(renderer: Renderer): RenderTexture[] {
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
