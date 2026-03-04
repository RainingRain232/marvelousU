// Procedural sprite generator for the Cannon — elite siege unit.
// A black-powder bronze cannon on a wooden wheeled carriage.
// 48×48 px per frame.

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_BARREL = 0x8b7355;
const COL_BARREL_HI = 0xa08860;
const COL_BARREL_DK = 0x6b5535;
const COL_MUZZLE = 0x444444;
const COL_BAND = 0xd4af37;
const COL_BAND_HI = 0xf5d76e;
const COL_WOOD = 0x6b4a3a;
const COL_WOOD_HI = 0x8b6a4a;
const COL_WOOD_DK = 0x4b3020;
const COL_WHEEL = 0x5c3d1e;
const COL_WHEEL_RIM = 0x888888;
const COL_AXLE = 0x666666;
const COL_FUSE = 0xcc6622;
const COL_SPARK = 0xffdd44;
const COL_FIRE = 0xff6622;
const COL_SMOKE = 0x999999;
const COL_BALL = 0x333333;
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
  ellipse(g, CX, GY + 1, 16, 3, COL_SHADOW, 0.3);
}

function drawWheel(g: Graphics, x: number, y: number, rot = 0): void {
  // Wheel rim
  circle(g, x, y, 6, COL_WHEEL_RIM);
  circle(g, x, y, 5, COL_WHEEL);
  // Spokes
  for (let i = 0; i < 6; i++) {
    const a = rot + i * Math.PI / 3;
    line(g, x, y, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, COL_WOOD_DK, 1);
  }
  // Hub
  circle(g, x, y, 1.5, COL_AXLE);
}

function drawCarriage(g: Graphics, bob: number): void {
  const cy = GY - 10 + bob;
  // Main frame
  rect(g, CX - 10, cy, 20, 5, COL_WOOD);
  rect(g, CX - 9, cy + 1, 18, 3, COL_WOOD_HI);
  // Trail (back handle)
  rect(g, CX + 8, cy + 1, 10, 2, COL_WOOD_DK);
  rect(g, CX + 16, cy - 1, 2, 5, COL_WOOD);
  // Cross braces
  rect(g, CX - 8, cy + 4, 2, 3, COL_WOOD_DK);
  rect(g, CX + 6, cy + 4, 2, 3, COL_WOOD_DK);
}

function drawBarrel(g: Graphics, bob: number, recoil = 0): void {
  const bx = CX - 12 - recoil;
  const by = GY - 14 + bob;
  // Main barrel
  rect(g, bx, by, 18, 5, COL_BARREL);
  rect(g, bx + 1, by + 1, 16, 3, COL_BARREL_HI);
  // Barrel shading
  rect(g, bx, by + 4, 18, 1, COL_BARREL_DK);
  // Muzzle
  rect(g, bx - 3, by - 1, 4, 7, COL_MUZZLE);
  circle(g, bx - 1, by + 2.5, 3, COL_MUZZLE);
  circle(g, bx - 1, by + 2.5, 2, 0x333333);
  // Reinforcing bands
  for (let i = 0; i < 3; i++) {
    rect(g, bx + 3 + i * 5, by - 0.5, 2, 6, COL_BAND);
    rect(g, bx + 3 + i * 5, by, 2, 1, COL_BAND_HI);
  }
  // Touch hole / fuse
  circle(g, bx + 14, by, 1, COL_FUSE);
  // Trunnions (barrel mounts)
  rect(g, bx + 6, by + 4, 2, 3, COL_AXLE);
  rect(g, bx + 10, by + 4, 2, 3, COL_AXLE);
}

function drawFull(g: Graphics, bob: number, wheelRot = 0, recoil = 0): void {
  drawShadow(g);
  drawCarriage(g, bob);
  drawBarrel(g, bob, recoil);
  // Wheels (left + right)
  drawWheel(g, CX - 6, GY - 2, wheelRot);
  drawWheel(g, CX + 6, GY - 2, wheelRot);
  // Axle
  rect(g, CX - 6, GY - 3, 12, 2, COL_AXLE);
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number): void {
  const bob = Math.sin(frame * 0.5) * 0.3;
  drawFull(g, bob);
}

function drawMove(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;
  const wheelRot = t * Math.PI * 2;
  drawFull(g, bob, wheelRot);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  // Recoil on fire
  const recoil = t < 0.4 ? 0 : Math.sin((t - 0.4) * Math.PI / 0.3) * 4;
  const bob = t > 0.4 ? Math.sin((t - 0.4) * Math.PI * 4) * 1.5 : 0;
  drawShadow(g);
  drawCarriage(g, bob);
  drawBarrel(g, bob, recoil > 0 ? -recoil : 0);
  drawWheel(g, CX - 6, GY - 2);
  drawWheel(g, CX + 6, GY - 2);
  rect(g, CX - 6, GY - 3, 12, 2, COL_AXLE);

  // Muzzle flash + smoke
  if (t > 0.35 && t < 0.7) {
    const flashAlpha = 1 - (t - 0.35) * 3;
    // Flash
    circle(g, CX - 16, GY - 12, 6, COL_FIRE, flashAlpha * 0.8);
    circle(g, CX - 16, GY - 12, 4, COL_SPARK, flashAlpha);
    circle(g, CX - 16, GY - 12, 2, 0xffffff, flashAlpha);
  }
  // Smoke cloud
  if (t > 0.4) {
    const smokeT = (t - 0.4) * 3;
    const smokeAlpha = Math.max(0, 0.6 - smokeT * 0.4);
    circle(g, CX - 18 - smokeT * 6, GY - 14 - smokeT * 4, 4 + smokeT * 3, COL_SMOKE, smokeAlpha);
    circle(g, CX - 14 - smokeT * 4, GY - 10 - smokeT * 6, 3 + smokeT * 2, COL_SMOKE, smokeAlpha * 0.8);
    circle(g, CX - 20 - smokeT * 5, GY - 16 - smokeT * 3, 3 + smokeT * 2, COL_SMOKE, smokeAlpha * 0.6);
  }
  // Cannonball
  if (t > 0.4) {
    const ballDist = (t - 0.4) * 50;
    circle(g, CX - 16 - ballDist, GY - 12, 2, COL_BALL);
  }
  // Fuse spark before firing
  if (t < 0.35) {
    const sparkAlpha = Math.sin(t * 20) * 0.5 + 0.5;
    circle(g, CX + 2, GY - 15, 1.5, COL_SPARK, sparkAlpha);
    circle(g, CX + 2, GY - 15, 0.8, 0xffffff, sparkAlpha);
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 5;
  // Loading animation
  drawFull(g, 0);
  // Cannonball being loaded
  const loadX = CX + 10 - t * 18;
  const loadY = GY - 14 + Math.sin(t * Math.PI) * -4;
  circle(g, loadX, loadY, 2.5, COL_BALL);
  circle(g, loadX - 0.5, loadY - 0.5, 1, 0x555555);
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 10;
  ellipse(g, CX, GY + 1, 16 - t * 4, 3 - t, COL_SHADOW, 0.3 * (1 - t * 0.3));
  // Broken carriage
  rect(g, CX - 10, GY - 10 + fall, 20, 5, COL_WOOD_DK);
  // Tilted barrel
  const tilt = t * 0.4;
  const bx = CX - 12 + t * 3;
  const by = GY - 14 + fall;
  rect(g, bx, by + tilt * 10, 18, 5, COL_BARREL_DK);
  // Wheels rolling away
  drawWheel(g, CX - 6 - t * 8, GY - 2 + fall * 0.5, t * 4);
  drawWheel(g, CX + 6 + t * 6, GY - 2 + fall * 0.3, -t * 3);
  // Debris
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const dx = Math.cos(i * 1.5) * t * 12;
      const dy = Math.sin(i * 1.5) * t * 8 - t * 4;
      rect(g, CX + dx, GY - 8 + fall + dy, 2, 2, COL_WOOD, 1 - t);
    }
  }
  // Smoke
  if (t > 0.2) {
    const sa = Math.max(0, 0.5 - t * 0.3);
    circle(g, CX, GY - 14 + fall - t * 8, 5 + t * 4, COL_SMOKE, sa);
  }
}

export function generateCannonFrames(renderer: Renderer): RenderTexture[] {
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
