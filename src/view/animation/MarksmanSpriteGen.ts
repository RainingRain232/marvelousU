// Procedural sprite generator for the Marksman — elite sharpshooter.
// Wears a long dark hooded cloak over leather armour, wields a heavy
// arbalest (siege crossbow). 48×48 px per frame.

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_HOOD = 0x2a2a3e;
const COL_HOOD_LT = 0x3a3a4e;
const COL_CLOAK = 0x222233;
const COL_CLOAK_LT = 0x333344;
const COL_LEATHER = 0x5c3d1e;
const COL_LEATHER_HI = 0x7a5530;
const COL_BELT = 0x3a2a1a;
const COL_BUCKLE = 0xd4af37;
const COL_PANT = 0x2a2a2a;
const COL_BOOT = 0x3a2a1a;
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_SH = 0xd4a880;
const COL_EYE = 0x44aaff;
const COL_XBOW_WOOD = 0x5c3d1e;
const COL_XBOW_METAL = 0x888899;
const COL_XBOW_HI = 0xaaaabb;
const COL_STRING = 0xccccaa;
const COL_BOLT = 0x888899;
const COL_BOLT_TIP = 0xccccdd;
const COL_QUIVER = 0x4a3020;
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
  ellipse(g, CX, GY + 1, 10, 3, COL_SHADOW, 0.3);
}

function drawCloak(g: Graphics, bob: number, wave = 0): void {
  g.beginPath();
  g.moveTo(CX - 8, GY - 26 + bob);
  g.lineTo(CX - 11 + wave, GY - 4);
  g.lineTo(CX + 11 - wave, GY - 4);
  g.lineTo(CX + 8, GY - 26 + bob);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  g.beginPath();
  g.moveTo(CX + 1, GY - 24 + bob);
  g.lineTo(CX - 1, GY - 6);
  g.lineTo(CX + 4, GY - 6);
  g.closePath();
  g.fill({ color: COL_CLOAK_LT, alpha: 0.3 });
}

function drawLegs(g: Graphics, bob: number, swing = 0): void {
  rect(g, CX - 5 - swing * 0.3, GY - 16 + bob, 4, 12, COL_PANT);
  rect(g, CX + 1 + swing * 0.3, GY - 16 + bob, 4, 12, COL_PANT);
  rect(g, CX - 6 - swing * 0.5, GY - 5, 5, 6, COL_BOOT);
  rect(g, CX + 1 + swing * 0.5, GY - 5, 5, 6, COL_BOOT);
}

function drawBody(g: Graphics, bob: number): void {
  const ty = GY - 26 + bob;
  rect(g, CX - 8, ty, 16, 14, COL_LEATHER);
  rect(g, CX - 6, ty + 2, 12, 10, COL_LEATHER_HI);
  // Belt
  rect(g, CX - 8, ty + 12, 16, 2, COL_BELT);
  circle(g, CX, ty + 13, 1.2, COL_BUCKLE);
  // Stitching
  for (let i = 0; i < 4; i++) {
    rect(g, CX - 5 + i * 3, ty + 4, 0.5, 6, COL_BELT, 0.5);
  }
}

function drawHead(g: Graphics, bob: number): void {
  const hy = GY - 34 + bob;
  // Face (partially hidden by hood)
  rect(g, CX - 4, hy + 2, 8, 6, COL_SKIN);
  rect(g, CX - 3, hy + 3, 6, 4, COL_SKIN_SH);
  // Glowing eyes
  circle(g, CX - 2, hy + 4, 1, COL_EYE);
  circle(g, CX + 2, hy + 4, 1, COL_EYE);
  circle(g, CX - 2, hy + 4, 0.5, 0xffffff);
  circle(g, CX + 2, hy + 4, 0.5, 0xffffff);
  // Hood
  g.beginPath();
  g.moveTo(CX - 7, hy + 4);
  g.lineTo(CX - 5, hy - 4);
  g.lineTo(CX, hy - 6);
  g.lineTo(CX + 5, hy - 4);
  g.lineTo(CX + 7, hy + 4);
  g.closePath();
  g.fill({ color: COL_HOOD });
  // Hood shading
  rect(g, CX - 4, hy - 3, 8, 3, COL_HOOD_LT);
}

function drawQuiver(g: Graphics, bob: number): void {
  // Quiver on back
  rect(g, CX + 6, GY - 30 + bob, 4, 16, COL_QUIVER);
  rect(g, CX + 7, GY - 30 + bob, 2, 15, COL_LEATHER_HI, 0.3);
  // Bolt tips sticking out
  for (let i = 0; i < 3; i++) {
    rect(g, CX + 6.5 + i, GY - 32 + bob, 1, 3, COL_BOLT);
    rect(g, CX + 6.5 + i, GY - 33 + bob, 1, 1, COL_BOLT_TIP);
  }
}

function drawArbalest(g: Graphics, bob: number, aimAngle = 0): void {
  const wx = CX - 8;
  const wy = GY - 22 + bob;
  // Stock
  rect(g, wx - 4, wy + aimAngle * 2, 12, 3, COL_XBOW_WOOD);
  // Arms of crossbow
  line(g, wx - 2, wy + 1.5, wx - 8, wy - 4 + aimAngle, COL_XBOW_METAL, 1.5);
  line(g, wx - 2, wy + 1.5, wx - 8, wy + 7 + aimAngle, COL_XBOW_METAL, 1.5);
  // Prod tips
  circle(g, wx - 8, wy - 4 + aimAngle, 1, COL_XBOW_HI);
  circle(g, wx - 8, wy + 7 + aimAngle, 1, COL_XBOW_HI);
  // String
  line(g, wx - 8, wy - 4 + aimAngle, wx - 3, wy + 1.5, COL_STRING, 0.5);
  line(g, wx - 8, wy + 7 + aimAngle, wx - 3, wy + 1.5, COL_STRING, 0.5);
  // Metal fittings
  rect(g, wx - 3, wy, 2, 3, COL_XBOW_METAL);
  rect(g, wx + 6, wy, 2, 3, COL_XBOW_METAL);
}

function drawBolt(g: Graphics, x: number, y: number): void {
  rect(g, x, y, 8, 1, COL_BOLT);
  g.beginPath();
  g.moveTo(x + 8, y - 1);
  g.lineTo(x + 11, y + 0.5);
  g.lineTo(x + 8, y + 2);
  g.closePath();
  g.fill({ color: COL_BOLT_TIP });
}

function drawFull(g: Graphics, bob: number, swing = 0, wave = 0): void {
  drawShadow(g);
  drawCloak(g, bob, wave);
  drawLegs(g, bob, swing);
  drawBody(g, bob);
  drawQuiver(g, bob);
  drawArbalest(g, bob);
  drawHead(g, bob);
}

function drawIdle(g: Graphics, frame: number): void {
  const bob = Math.sin(frame * 0.8) * 0.5;
  drawFull(g, bob);
}

function drawWalk(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 1.2;
  const swing = Math.sin(t * Math.PI * 2) * 3;
  const wave = Math.sin(t * Math.PI * 2 + 1) * 2;
  drawFull(g, bob, swing, wave);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = 0;
  drawShadow(g);
  drawCloak(g, bob);
  drawLegs(g, bob);
  drawBody(g, bob);
  drawQuiver(g, bob);
  // Arbalest aimed
  drawArbalest(g, bob, -t * 3);
  drawHead(g, bob);
  // Bolt flying out on later frames
  if (t > 0.5) {
    const boltDist = (t - 0.5) * 40;
    drawBolt(g, CX - 12 - boltDist, GY - 22 - t * 3);
    // Impact sparks
    if (t > 0.7) {
      for (let i = 0; i < 3; i++) {
        circle(g, CX - 12 - boltDist + i * 2, GY - 23 - t * 3 + i, 0.8, COL_BOLT_TIP, 1 - t);
      }
    }
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 5;
  drawShadow(g);
  drawCloak(g, 0);
  drawLegs(g, 0);
  drawBody(g, 0);
  drawQuiver(g, 0);
  // Arbalest being loaded
  const loadPull = Math.sin(t * Math.PI) * 4;
  drawArbalest(g, 0, loadPull);
  drawHead(g, 0);
  // Glint on arbalest
  const alpha = Math.sin(t * Math.PI) * 0.6;
  circle(g, CX - 5, GY - 21, 2, COL_XBOW_HI, alpha);
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 18;
  const ox = t * 4;
  ellipse(g, CX, GY + 1, 10 - t * 3, 3 - t, COL_SHADOW, 0.3 * (1 - t * 0.3));
  // Cloak
  g.beginPath();
  g.moveTo(CX - 8 + ox, GY - 26 + fall);
  g.lineTo(CX - 11 + ox, GY - 4 + fall * 0.3);
  g.lineTo(CX + 11 + ox, GY - 4 + fall * 0.3);
  g.lineTo(CX + 8 + ox, GY - 26 + fall);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  // Legs
  rect(g, CX - 5 + ox, GY - 16 + fall, 4, 12, COL_PANT);
  rect(g, CX + 1 + ox, GY - 16 + fall, 4, 12, COL_PANT);
  // Body
  rect(g, CX - 8 + ox, GY - 26 + fall, 16, 14, COL_LEATHER);
  // Hood
  rect(g, CX - 6 + ox, GY - 36 + fall, 12, 8, COL_HOOD);
  // Arbalest drops
  if (t > 0.3) {
    const wd = (t - 0.3) * 12;
    rect(g, CX - 10 - wd, GY - 20 + fall + wd * 2, 10, 2, COL_XBOW_WOOD);
  }
}

export function generateMarksmanFrames(renderer: Renderer): RenderTexture[] {
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
