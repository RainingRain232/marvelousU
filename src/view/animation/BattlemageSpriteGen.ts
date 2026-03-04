// Procedural sprite generator for the Battlemage — combat sorcerer.
// Enchanted half-plate over mage robes, glowing runic sword in one hand,
// spell orb in the other. 48×48 px per frame.

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_PLATE = 0x556688;
const COL_PLATE_HI = 0x7788aa;
const COL_PLATE_DK = 0x334466;
const COL_ROBE = 0x2e1a47;
const COL_ROBE_LT = 0x4a2d6a;
const COL_RUNE = 0x44bbff;
const COL_RUNE_HI = 0x88ddff;
const COL_RUNE_DK = 0x2288cc;
const COL_SWORD = 0xaabbdd;
const COL_SWORD_HI = 0xccddff;
const COL_SWORD_GLOW = 0x44bbff;
const COL_HILT = 0xd4af37;
const COL_ORB = 0xff6622;
const COL_ORB_HI = 0xffaa44;
const COL_ORB_CORE = 0xffdd88;
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_SH = 0xd4a880;
const COL_HAIR = 0x222222;
const COL_EYE = 0x44bbff;
const COL_BOOT = 0x334466;
const COL_CAPE = 0x2e1a47;
const COL_CAPE_LT = 0x3e2a57;
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
  ellipse(g, CX, GY + 1, 11, 3, COL_SHADOW, 0.3);
}

function drawCape(g: Graphics, bob: number, wave = 0): void {
  g.beginPath();
  g.moveTo(CX - 8, GY - 26 + bob);
  g.lineTo(CX - 11 + wave, GY - 4);
  g.lineTo(CX + 11 - wave, GY - 4);
  g.lineTo(CX + 8, GY - 26 + bob);
  g.closePath();
  g.fill({ color: COL_CAPE });
  g.beginPath();
  g.moveTo(CX, GY - 24 + bob);
  g.lineTo(CX - 2, GY - 6);
  g.lineTo(CX + 3, GY - 6);
  g.closePath();
  g.fill({ color: COL_CAPE_LT, alpha: 0.3 });
}

function drawLegs(g: Graphics, bob: number, swing = 0): void {
  // Robe skirt
  g.beginPath();
  g.moveTo(CX - 8, GY - 14 + bob);
  g.lineTo(CX - 7, GY - 4);
  g.lineTo(CX + 7, GY - 4);
  g.lineTo(CX + 8, GY - 14 + bob);
  g.closePath();
  g.fill({ color: COL_ROBE });
  // Center fold
  line(g, CX, GY - 14 + bob, CX, GY - 4, COL_ROBE_LT, 0.5);
  // Boots peeking out
  rect(g, CX - 5 - swing * 0.3, GY - 5, 4, 6, COL_BOOT);
  rect(g, CX + 1 + swing * 0.3, GY - 5, 4, 6, COL_BOOT);
}

function drawBody(g: Graphics, bob: number): void {
  const ty = GY - 26 + bob;
  // Robe base
  rect(g, CX - 8, ty, 16, 14, COL_ROBE);
  // Half-plate over robe (covers chest and shoulders)
  rect(g, CX - 7, ty + 1, 14, 8, COL_PLATE);
  rect(g, CX - 5, ty + 2, 10, 6, COL_PLATE_HI);
  // Rune engravings on plate
  line(g, CX - 4, ty + 3, CX - 2, ty + 7, COL_RUNE, 0.8);
  line(g, CX + 2, ty + 3, CX + 4, ty + 7, COL_RUNE, 0.8);
  circle(g, CX, ty + 5, 1.5, COL_RUNE);
  circle(g, CX, ty + 5, 0.7, COL_RUNE_HI);
  // Shoulder plates
  ellipse(g, CX - 9, ty + 2, 4, 3, COL_PLATE);
  ellipse(g, CX + 9, ty + 2, 4, 3, COL_PLATE);
  // Rune on shoulders
  circle(g, CX - 9, ty + 2, 1, COL_RUNE);
  circle(g, CX + 9, ty + 2, 1, COL_RUNE);
  // Belt
  rect(g, CX - 8, ty + 10, 16, 2, COL_PLATE_DK);
  circle(g, CX, ty + 11, 1.5, COL_HILT);
}

function drawHead(g: Graphics, bob: number): void {
  const hy = GY - 34 + bob;
  // Neck
  rect(g, CX - 3, hy + 6, 6, 3, COL_SKIN);
  // Face
  rect(g, CX - 4, hy + 1, 8, 7, COL_SKIN);
  rect(g, CX - 3, hy + 2, 6, 5, COL_SKIN_SH);
  // Eyes (glowing)
  circle(g, CX - 2, hy + 4, 1.2, COL_EYE);
  circle(g, CX + 2, hy + 4, 1.2, COL_EYE);
  circle(g, CX - 2, hy + 4, 0.5, 0xffffff);
  circle(g, CX + 2, hy + 4, 0.5, 0xffffff);
  // Hair — swept back
  rect(g, CX - 5, hy - 1, 10, 4, COL_HAIR);
  rect(g, CX - 5, hy + 1, 2, 5, COL_HAIR);
  rect(g, CX + 3, hy + 1, 2, 5, COL_HAIR);
  // Circlet with rune gem
  rect(g, CX - 5, hy, 10, 1, COL_HILT);
  circle(g, CX, hy, 1.5, COL_RUNE);
  circle(g, CX, hy, 0.7, COL_RUNE_HI);
}

function drawSword(g: Graphics, x: number, y: number, angle = 0): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bx = (dx: number, dy: number) => x + dx * cos - dy * sin;
  const by = (dx: number, dy: number) => y + dx * sin + dy * cos;
  // Blade
  g.beginPath();
  g.moveTo(bx(0, 0), by(0, 0));
  g.lineTo(bx(1, -12), by(1, -12));
  g.lineTo(bx(0, -14), by(0, -14));
  g.lineTo(bx(-1, -12), by(-1, -12));
  g.closePath();
  g.fill({ color: COL_SWORD });
  line(g, bx(0, 0), by(0, 0), bx(0, -13), by(0, -13), COL_SWORD_HI, 0.5);
  // Rune glow on blade
  for (let i = 0; i < 3; i++) {
    circle(g, bx(0, -3 - i * 4), by(0, -3 - i * 4), 0.8, COL_SWORD_GLOW, 0.6);
  }
  // Cross-guard
  rect(g, bx(-3, 0) - 1, by(-3, 0) - 0.5, 6, 2, COL_HILT);
  // Hilt
  rect(g, bx(-0.5, 2), by(-0.5, 2), 2, 4, COL_PLATE_DK);
}

function drawOrb(g: Graphics, x: number, y: number, pulse = 0): void {
  // Outer glow
  circle(g, x, y, 5 + pulse, COL_ORB, 0.15);
  circle(g, x, y, 3.5 + pulse * 0.5, COL_ORB, 0.3);
  // Orb
  circle(g, x, y, 2.5, COL_ORB);
  circle(g, x - 0.5, y - 0.5, 1.5, COL_ORB_HI);
  circle(g, x - 0.5, y - 0.5, 0.7, COL_ORB_CORE);
}

function drawArms(g: Graphics, bob: number, lArmY = 0, rArmY = 0): void {
  // Left arm (sword arm)
  rect(g, CX - 12, GY - 24 + bob + lArmY, 4, 8, COL_PLATE);
  rect(g, CX - 12, GY - 17 + bob + lArmY, 4, 2, COL_ROBE);
  circle(g, CX - 10, GY - 14 + bob + lArmY, 2, COL_SKIN);
  // Right arm (spell arm)
  rect(g, CX + 8, GY - 24 + bob + rArmY, 4, 8, COL_PLATE);
  rect(g, CX + 8, GY - 17 + bob + rArmY, 4, 2, COL_ROBE);
  circle(g, CX + 10, GY - 14 + bob + rArmY, 2, COL_SKIN);
}

function drawFull(g: Graphics, bob: number, swing = 0, wave = 0, swordAngle = 0, orbPulse = 0): void {
  drawShadow(g);
  drawCape(g, bob, wave);
  drawLegs(g, bob, swing);
  drawBody(g, bob);
  drawArms(g, bob);
  drawSword(g, CX - 10, GY - 16 + bob, swordAngle);
  drawOrb(g, CX + 10, GY - 16 + bob, orbPulse);
  drawHead(g, bob);
}

function drawIdle(g: Graphics, frame: number): void {
  const bob = Math.sin(frame * 0.8) * 0.5;
  const orbPulse = Math.sin(frame * 0.6) * 0.8;
  drawFull(g, bob, 0, 0, 0, orbPulse);
}

function drawWalk(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 1.2;
  const swing = Math.sin(t * Math.PI * 2) * 3;
  const wave = Math.sin(t * Math.PI * 2 + 1) * 2;
  drawFull(g, bob, swing, wave, swing * 0.03, Math.sin(t * Math.PI * 2) * 0.5);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI) * 1.5;
  drawShadow(g);
  drawCape(g, bob, -1);
  drawLegs(g, bob);
  drawBody(g, bob);
  // Left arm swinging sword
  const armSwing = -t * 6;
  rect(g, CX - 12, GY - 24 + bob + armSwing, 4, 8, COL_PLATE);
  circle(g, CX - 10, GY - 14 + bob + armSwing, 2, COL_SKIN);
  drawSword(g, CX - 10, GY - 16 + bob + armSwing, -t * 1.5);
  // Right arm steady with orb
  rect(g, CX + 8, GY - 24 + bob, 4, 8, COL_PLATE);
  circle(g, CX + 10, GY - 14 + bob, 2, COL_SKIN);
  drawOrb(g, CX + 10, GY - 16 + bob, t * 2);
  drawHead(g, bob);
  // Sword trail
  if (t > 0.3) {
    const alpha = Math.min(1, (t - 0.3) * 2) * 0.4;
    for (let i = 0; i < 3; i++) {
      const a = -t * 1.5 + i * 0.2;
      const d = 12 + i * 2;
      circle(g, CX - 10 + Math.cos(a) * d, GY - 16 + bob + armSwing + Math.sin(a) * d, 1, COL_SWORD_GLOW, alpha);
    }
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 5;
  drawShadow(g);
  drawCape(g, 0, Math.sin(t * Math.PI) * 2);
  drawLegs(g, 0);
  drawBody(g, 0);
  // Both arms raised
  const raise = -t * 6;
  drawArms(g, 0, raise, raise);
  drawSword(g, CX - 10, GY - 16 + raise, -0.3);
  // Spell being cast — orb grows + particles
  const orbSize = t * 3;
  drawOrb(g, CX + 10, GY - 16 + raise, orbSize);
  drawHead(g, 0);
  // Arcane particles
  for (let i = 0; i < 5; i++) {
    const a = t * 3 + i * Math.PI * 0.4;
    const d = 6 + t * 10;
    const px = CX + 10 + Math.cos(a) * d;
    const py = GY - 16 + raise + Math.sin(a) * d * 0.6;
    const alpha = Math.max(0, 1 - t * 0.5);
    circle(g, px, py, 1, COL_RUNE, alpha);
  }
  // Eye glow intensifies
  circle(g, CX - 2, GY - 30, 2, COL_EYE, t * 0.3);
  circle(g, CX + 2, GY - 30, 2, COL_EYE, t * 0.3);
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 16;
  const ox = t * 4;
  ellipse(g, CX, GY + 1, 11 - t * 3, 3 - t, COL_SHADOW, 0.3 * (1 - t * 0.3));
  // Cape
  g.beginPath();
  g.moveTo(CX - 8 + ox, GY - 26 + fall);
  g.lineTo(CX - 11 + ox, GY - 4 + fall * 0.3);
  g.lineTo(CX + 11 + ox, GY - 4 + fall * 0.3);
  g.lineTo(CX + 8 + ox, GY - 26 + fall);
  g.closePath();
  g.fill({ color: COL_CAPE });
  // Legs / skirt
  rect(g, CX - 7 + ox, GY - 14 + fall, 14, 10, COL_ROBE);
  // Body
  rect(g, CX - 8 + ox, GY - 26 + fall, 16, 14, COL_ROBE);
  rect(g, CX - 7 + ox, GY - 25 + fall, 14, 8, COL_PLATE);
  // Head
  rect(g, CX - 4 + ox, GY - 33 + fall, 8, 7, COL_SKIN);
  rect(g, CX - 5 + ox, GY - 35 + fall, 10, 4, COL_HAIR);
  // Eyes fade
  circle(g, CX - 2 + ox, GY - 30 + fall, 1, COL_EYE, 1 - t);
  circle(g, CX + 2 + ox, GY - 30 + fall, 1, COL_EYE, 1 - t);
  // Sword drops
  if (t > 0.2) {
    const sd = (t - 0.2) * 10;
    rect(g, CX - 14 - sd, GY - 18 + fall + sd * 2, 2, 10, COL_SWORD);
  }
  // Orb fizzles
  if (t < 0.7) {
    circle(g, CX + 12 + ox, GY - 16 + fall, 2 * (1 - t), COL_ORB, 1 - t);
  }
}

export function generateBattlemageFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();
      switch (state) {
        case UnitState.IDLE: drawIdle(g, col); break;
        case UnitState.MOVE: drawWalk(g, col); break;
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
