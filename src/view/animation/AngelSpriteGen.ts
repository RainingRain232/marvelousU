// Procedural sprite generator for the Angel unit type.
//
// 144×144 px per frame (3×3 tiles). Divine winged warrior with:
//   • Large layered feathered wings with gentle flap
//   • Flowing white-gold robes
//   • Golden plate armor with holy engravings
//   • Radiant halo with glow
//   • Blazing holy sword
//   • Divine aura / light particles

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Frame dimensions
// ---------------------------------------------------------------------------

const F_W = 144;
const F_H = 144;
const CX = F_W / 2;
const GY = F_H - 10; // ground reference

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const COL_WING       = 0xf8f4f0;
const COL_WING_MID   = 0xe8e4e0;
const COL_WING_EDGE  = 0xd0cce8;
const COL_WING_BONE  = 0xeee8dd;
const COL_WING_SHAD  = 0xc8c0b8;

const COL_ROBE       = 0xfaf6f0;
const COL_ROBE_FOLD  = 0xe0dcd6;
const COL_ROBE_HI    = 0xffffff;

const COL_ARMOR      = 0xffd740;
const COL_ARMOR_LT   = 0xffe880;
const COL_ARMOR_DK   = 0xc8a020;

const COL_SKIN       = 0xffe0c0;
const COL_SKIN_DK    = 0xe8c8a0;
const COL_HAIR       = 0xfff0b0;
const COL_HAIR_DK    = 0xe0d090;
const COL_EYE        = 0x4488ff;

const COL_HALO       = 0xfffacd;
const COL_HALO_GLOW  = 0xfff8b0;

const COL_BLADE      = 0xffffff;
const COL_BLADE_EDGE = 0xe8eeff;
const COL_BLADE_FIRE = 0xff9900;
const COL_BLADE_CORE = 0xffff66;
const COL_GUARD      = 0xffd700;

const COL_AURA       = 0xfffce0;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateAngelFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();

      switch (state) {
        case UnitState.IDLE:    drawIdle(g, col);   break;
        case UnitState.MOVE:    drawFly(g, col);    break;
        case UnitState.ATTACK:  drawAttack(g, col); break;
        case UnitState.CAST:    drawCast(g, col);   break;
        case UnitState.DIE:     drawDie(g, col);    break;
      }

      const texture = RenderTexture.create({ width: F_W, height: F_H });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }

  return frames;
}

// ---------------------------------------------------------------------------
// State drawings
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number): void {
  const t = frame / 8 * Math.PI * 2;
  const breathe = Math.sin(t) * 1.5;
  const hover   = Math.sin(t * 0.5) * 2;
  const wingAng = Math.sin(t * 0.6) * 0.08;

  const bodyY = GY - 60 + hover;

  drawShadow(g, CX, GY + 2, 22, 5, 0.25);
  drawAura(g, CX, bodyY - 10, 0.12);
  drawWings(g, CX, bodyY - 24, wingAng, 0.9);
  drawRobe(g, CX, bodyY, breathe, 0);
  drawTorso(g, CX, bodyY - 20 + breathe);
  drawArms(g, CX, bodyY - 22 + breathe, 0, 0);
  drawHead(g, CX, bodyY - 40 + breathe);
  drawHalo(g, CX, bodyY - 56 + breathe, 0.5 + Math.sin(t * 1.5) * 0.15);
  drawSword(g, CX + 16, bodyY - 14 + breathe, 0);
}

function drawFly(g: Graphics, frame: number): void {
  const t = frame / 8 * Math.PI * 2;
  const bob     = Math.sin(t) * 3;
  const wingAng = Math.sin(t) * 0.25;
  const lean    = 0.05;

  const bodyY = GY - 65 + bob;

  drawShadow(g, CX, GY + 2, 16 - Math.abs(bob), 3, 0.15);
  drawAura(g, CX, bodyY - 10, 0.18);
  drawWings(g, CX, bodyY - 24, wingAng, 1.1);
  drawRobe(g, CX, bodyY, 0, lean);
  drawTorso(g, CX, bodyY - 20);
  drawArms(g, CX, bodyY - 22, 0, 0);
  drawHead(g, CX, bodyY - 40);
  drawHalo(g, CX, bodyY - 56, 0.6);
  drawSword(g, CX + 16, bodyY - 14, 0);
}

function drawAttack(g: Graphics, frame: number): void {
  const p = frame / 7;       // 0→1
  // Wind-up then strike
  const windUp  = p < 0.4 ? p / 0.4 : 1;
  const strike  = p < 0.4 ? 0 : (p - 0.4) / 0.6;
  const swordAngle = -windUp * 1.2 + strike * 2.0;
  const lunge   = strike * 6;
  const wingFlare = 0.15 + strike * 0.2;

  const bodyY = GY - 60;

  drawShadow(g, CX, GY + 2, 22, 5, 0.25);
  drawAura(g, CX, bodyY - 10, 0.1 + strike * 0.2);
  drawWings(g, CX, bodyY - 24, wingFlare, 1.0 + strike * 0.15);

  // Slash arc effect
  if (strike > 0.2) {
    const alpha = (strike - 0.2) * 0.5;
    g.moveTo(CX + 22 + lunge, bodyY - 40)
      .quadraticCurveTo(CX + 40 + lunge, bodyY - 20, CX + 30 + lunge, bodyY + 5)
      .stroke({ color: COL_BLADE, alpha, width: 3 });
    g.moveTo(CX + 22 + lunge, bodyY - 40)
      .quadraticCurveTo(CX + 40 + lunge, bodyY - 20, CX + 30 + lunge, bodyY + 5)
      .stroke({ color: COL_BLADE_FIRE, alpha: alpha * 0.6, width: 6 });
  }

  drawRobe(g, CX, bodyY, 0, 0);
  drawTorso(g, CX, bodyY - 20);

  // Attack arm pose: right arm swings with sword
  drawArmLeft(g, CX, bodyY - 22, 0);
  // Right arm follows sword
  const armEndX = CX + 14 + Math.sin(swordAngle + 0.5) * 8 + lunge;
  const armEndY = bodyY - 28 + Math.cos(swordAngle + 0.5) * 8;
  g.moveTo(CX + 8, bodyY - 22)
    .lineTo(armEndX, armEndY)
    .stroke({ color: COL_SKIN, width: 4 });
  g.moveTo(CX + 8, bodyY - 22)
    .lineTo(armEndX, armEndY)
    .stroke({ color: COL_ARMOR, width: 2.5 });

  drawHead(g, CX, bodyY - 40);
  drawHalo(g, CX, bodyY - 56, 0.7 + strike * 0.3);
  drawSword(g, armEndX, armEndY, swordAngle);

  // Impact flash
  if (strike > 0.7) {
    const flash = (strike - 0.7) / 0.3;
    g.circle(CX + 30 + lunge, bodyY - 10, 8 + flash * 12)
      .fill({ color: 0xffffff, alpha: 0.4 * (1 - flash) });
  }
}

function drawCast(g: Graphics, frame: number): void {
  const p = frame / 7;
  const rise = p * 8;
  const glow = 0.3 + p * 0.7;
  const wingSpread = 0.1 + p * 0.15;
  const t = frame * 0.5;

  const bodyY = GY - 60 - rise;

  drawShadow(g, CX, GY + 2, 18 - rise * 0.3, 4, 0.15);

  // Intensified aura
  drawAura(g, CX, bodyY - 10, glow * 0.35);
  g.circle(CX, bodyY - 10, 30 + glow * 20)
    .fill({ color: COL_HALO_GLOW, alpha: glow * 0.12 });

  // Holy particles orbiting
  for (let i = 0; i < 8; i++) {
    const angle = t + i * Math.PI / 4;
    const dist = 20 + p * 25 + i * 3;
    const px = CX + Math.cos(angle) * dist;
    const py = bodyY - 10 + Math.sin(angle) * dist * 0.5;
    const r = 2.5 - i * 0.2;
    const a = (0.7 - i * 0.06) * glow;
    g.circle(px, py, r).fill({ color: COL_HALO_GLOW, alpha: a });
    g.circle(px, py, r * 0.5).fill({ color: 0xffffff, alpha: a * 0.8 });
  }

  drawWings(g, CX, bodyY - 24, wingSpread, 1.0 + p * 0.1);
  drawRobe(g, CX, bodyY, 0, 0);
  drawTorso(g, CX, bodyY - 20);

  // Arms raised outward for cast
  const armLift = p * 12;
  g.moveTo(CX - 8, bodyY - 22)
    .quadraticCurveTo(CX - 18, bodyY - 28 - armLift, CX - 24, bodyY - 32 - armLift)
    .stroke({ color: COL_SKIN, width: 4 });
  g.moveTo(CX - 8, bodyY - 22)
    .quadraticCurveTo(CX - 18, bodyY - 28 - armLift, CX - 24, bodyY - 32 - armLift)
    .stroke({ color: COL_ARMOR, width: 2.5 });
  g.moveTo(CX + 8, bodyY - 22)
    .quadraticCurveTo(CX + 18, bodyY - 28 - armLift, CX + 24, bodyY - 32 - armLift)
    .stroke({ color: COL_SKIN, width: 4 });
  g.moveTo(CX + 8, bodyY - 22)
    .quadraticCurveTo(CX + 18, bodyY - 28 - armLift, CX + 24, bodyY - 32 - armLift)
    .stroke({ color: COL_ARMOR, width: 2.5 });

  // Glowing palms
  g.circle(CX - 24, bodyY - 32 - armLift, 4 + glow * 3)
    .fill({ color: COL_HALO_GLOW, alpha: 0.4 + glow * 0.3 });
  g.circle(CX + 24, bodyY - 32 - armLift, 4 + glow * 3)
    .fill({ color: COL_HALO_GLOW, alpha: 0.4 + glow * 0.3 });

  drawHead(g, CX, bodyY - 40);
  drawHalo(g, CX, bodyY - 56, glow);

  // Ground heal circle
  g.circle(CX, GY - 2, 15 + glow * 12)
    .fill({ color: COL_HALO_GLOW, alpha: glow * 0.15 });
  g.circle(CX, GY - 2, 15 + glow * 12)
    .stroke({ color: COL_ARMOR, alpha: glow * 0.3, width: 1 });
}

function drawDie(g: Graphics, frame: number): void {
  const p = frame / 7; // 0→1
  const alpha = 1 - p * 0.6;
  const fall = p * 20;
  const tilt = p * 0.3;
  const wingDroop = -p * 0.3;

  const bodyY = GY - 60 + fall;

  drawShadow(g, CX, GY + 2, 22 - p * 8, 5 - p * 2, 0.25 * (1 - p));

  // Dissolving light particles rising
  for (let i = 0; i < 6; i++) {
    const px = CX - 15 + i * 6 + Math.sin(frame * 0.5 + i) * 4;
    const py = bodyY - 20 - p * 30 - i * 8;
    const r = 2 - p * 0.5;
    const a = p * 0.5 * (1 - i / 6);
    if (a > 0) {
      g.circle(px, py, r).fill({ color: COL_HALO_GLOW, alpha: a });
    }
  }

  // Tilted body
  const ox = Math.sin(tilt) * 15;

  drawWings(g, CX + ox * 0.3, bodyY - 24, wingDroop, 0.8 - p * 0.3, alpha);
  drawRobe(g, CX + ox * 0.5, bodyY, 0, tilt, alpha);
  drawTorso(g, CX + ox * 0.5, bodyY - 20, alpha);
  drawArms(g, CX + ox * 0.5, bodyY - 22, 0, 0, alpha);
  drawHead(g, CX + ox * 0.5, bodyY - 40, alpha);
  drawHalo(g, CX + ox * 0.3, bodyY - 56, 0.5 * (1 - p), alpha);
  drawSword(g, CX + 16 + ox, bodyY - 14 + fall * 0.5, tilt * 2, alpha);
}

// ---------------------------------------------------------------------------
// Shared drawing helpers
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, y: number, rx: number, ry: number, alpha: number): void {
  g.ellipse(cx, y, rx, ry).fill({ color: COL_SHADOW, alpha });
}

function drawAura(g: Graphics, cx: number, cy: number, intensity: number): void {
  if (intensity <= 0) return;
  g.ellipse(cx, cy, 32, 48).fill({ color: COL_AURA, alpha: intensity * 0.5 });
  g.ellipse(cx, cy, 22, 36).fill({ color: COL_AURA, alpha: intensity * 0.3 });
}

// ---------------------------------------------------------------------------
// Wings
// ---------------------------------------------------------------------------

function drawWings(g: Graphics, cx: number, shoulderY: number, flapAngle: number, spread: number, alpha = 1): void {
  drawOneWing(g, cx, shoulderY, -1, flapAngle, spread, alpha);
  drawOneWing(g, cx, shoulderY,  1, flapAngle, spread, alpha);
}

function drawOneWing(g: Graphics, cx: number, sy: number, side: number, flapAngle: number, spread: number, alpha: number): void {
  const s = side;
  const flapY = flapAngle * 40;  // vertical displacement from flap
  const sp = spread;

  // Wing bone anchor
  const ax = cx + s * 8;
  const ay = sy;

  // Wing elbow (mid joint)
  const ex = cx + s * 35 * sp;
  const ey = sy - 20 + flapY;

  // Wing tip
  const tx = cx + s * 58 * sp;
  const ty = sy - 8 + flapY * 0.6;

  // Trailing edge control points
  const trailMidX = cx + s * 30 * sp;
  const trailMidY = sy + 15 + flapY * 0.3;
  const trailTipX = cx + s * 50 * sp;
  const trailTipY = sy + 10 + flapY * 0.4;

  // Wing membrane (filled shape)
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 20 * sp, sy - 18 + flapY * 0.8, ex, ey)
    .lineTo(tx, ty)
    .quadraticCurveTo(trailTipX, trailTipY, trailMidX, trailMidY)
    .quadraticCurveTo(cx + s * 15 * sp, sy + 8, ax, ay + 4)
    .closePath()
    .fill({ color: COL_WING_MID, alpha: alpha * 0.85 });

  // Inner membrane highlight
  g.moveTo(ax + s * 4, ay + 2)
    .quadraticCurveTo(cx + s * 22 * sp, sy - 12 + flapY * 0.7, ex - s * 4, ey + 4)
    .lineTo(trailMidX + s * 4, trailMidY - 4)
    .quadraticCurveTo(cx + s * 16 * sp, sy + 4, ax + s * 4, ay + 4)
    .closePath()
    .fill({ color: COL_WING, alpha: alpha * 0.6 });

  // Wing bone / leading edge
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 20 * sp, sy - 18 + flapY * 0.8, ex, ey)
    .lineTo(tx, ty)
    .stroke({ color: COL_WING_BONE, alpha, width: 2.5 });

  // Feather veins (3 lines from bone to trailing edge)
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.25;
    const boneX = ax + (tx - ax) * t;
    const boneY = ay + (ey - ay) * t + (ty - ey) * Math.max(0, t - 0.5) * 2;
    const edgeX = ax + (trailTipX - ax) * t;
    const edgeY = ay + 4 + (trailMidY - ay) * t;
    g.moveTo(boneX, boneY)
      .lineTo(edgeX, edgeY)
      .stroke({ color: COL_WING_SHAD, alpha: alpha * 0.35, width: 0.8 });
  }

  // Primary feathers at wing tip (5 long feathers)
  for (let i = 0; i < 5; i++) {
    const baseT = 0.6 + i * 0.1;
    const bx = ax + (tx - ax) * baseT;
    const by = ay + (ty - ay) * baseT + (ey - ay) * (1 - baseT) * 0.5;

    const featherLen = 18 - i * 2;
    const featherAngle = Math.PI * 0.55 + s * 0.1 + i * 0.12 * s;
    const ftx = bx + Math.cos(featherAngle) * featherLen;
    const fty = by + Math.sin(featherAngle) * featherLen;

    // Feather shape (elongated leaf)
    const perpX = -Math.sin(featherAngle) * 2.5;
    const perpY =  Math.cos(featherAngle) * 2.5;
    g.moveTo(bx, by)
      .quadraticCurveTo(bx + (ftx - bx) * 0.5 + perpX, by + (fty - by) * 0.5 + perpY, ftx, fty)
      .quadraticCurveTo(bx + (ftx - bx) * 0.5 - perpX, by + (fty - by) * 0.5 - perpY, bx, by)
      .fill({ color: i % 2 === 0 ? COL_WING : COL_WING_EDGE, alpha: alpha * 0.9 });

    // Feather spine
    g.moveTo(bx, by)
      .lineTo(ftx, fty)
      .stroke({ color: COL_WING_SHAD, alpha: alpha * 0.3, width: 0.5 });
  }

  // Secondary feathers along trailing edge (shorter)
  for (let i = 0; i < 4; i++) {
    const t = 0.2 + i * 0.12;
    const bx = ax + (trailMidX - ax) * t + s * 3;
    const by = ay + (trailMidY - ay) * t;
    const len = 10 - i;
    const ang = Math.PI * 0.5 + i * 0.08;
    const ftx = bx + Math.cos(ang) * len;
    const fty = by + Math.sin(ang) * len;

    g.moveTo(bx, by)
      .quadraticCurveTo((bx + ftx) / 2 + s * 1.5, (by + fty) / 2, ftx, fty)
      .quadraticCurveTo((bx + ftx) / 2 - s * 1.5, (by + fty) / 2, bx, by)
      .fill({ color: COL_WING_MID, alpha: alpha * 0.7 });
  }
}

// ---------------------------------------------------------------------------
// Robe
// ---------------------------------------------------------------------------

function drawRobe(g: Graphics, cx: number, baseY: number, breathe: number, lean: number, alpha = 1): void {
  const topW = 14;
  const botW = 22;
  const robeH = 32;
  const topY = baseY + breathe;
  const botY = topY + robeH;
  const lx = lean * 8;

  // Main robe shape (flowing trapezoid with curves)
  g.moveTo(cx - topW / 2, topY)
    .quadraticCurveTo(cx - topW / 2 - 3, topY + robeH * 0.5, cx - botW / 2 + lx, botY)
    .quadraticCurveTo(cx + lx, botY + 3, cx + botW / 2 + lx, botY)
    .quadraticCurveTo(cx + topW / 2 + 3, topY + robeH * 0.5, cx + topW / 2, topY)
    .closePath()
    .fill({ color: COL_ROBE, alpha });

  // Centre fold
  g.moveTo(cx, topY + 2)
    .quadraticCurveTo(cx + lx * 0.5 - 1, topY + robeH * 0.6, cx + lx - 1, botY)
    .stroke({ color: COL_ROBE_FOLD, alpha: alpha * 0.5, width: 1 });
  g.moveTo(cx + 1, topY + 2)
    .quadraticCurveTo(cx + lx * 0.5 + 2, topY + robeH * 0.6, cx + lx + 2, botY)
    .stroke({ color: COL_ROBE_FOLD, alpha: alpha * 0.3, width: 0.8 });

  // Side folds
  g.moveTo(cx - topW / 2 + 3, topY + 4)
    .quadraticCurveTo(cx - topW / 2, topY + robeH * 0.5, cx - botW / 2 + 4 + lx, botY - 2)
    .stroke({ color: COL_ROBE_FOLD, alpha: alpha * 0.35, width: 0.8 });
  g.moveTo(cx + topW / 2 - 3, topY + 4)
    .quadraticCurveTo(cx + topW / 2, topY + robeH * 0.5, cx + botW / 2 - 4 + lx, botY - 2)
    .stroke({ color: COL_ROBE_FOLD, alpha: alpha * 0.35, width: 0.8 });

  // Bottom hem highlight
  g.moveTo(cx - botW / 2 + lx, botY)
    .quadraticCurveTo(cx + lx, botY + 3, cx + botW / 2 + lx, botY)
    .stroke({ color: COL_ROBE_HI, alpha: alpha * 0.3, width: 1.5 });

  // Gold trim at waist
  g.rect(cx - topW / 2 + 1, topY, topW - 2, 2.5)
    .fill({ color: COL_ARMOR, alpha });
}

// ---------------------------------------------------------------------------
// Torso / armor
// ---------------------------------------------------------------------------

function drawTorso(g: Graphics, cx: number, topY: number, alpha = 1): void {
  const w = 16;
  const h = 22;

  // Breastplate shape (tapered, curved)
  g.moveTo(cx - w / 2, topY)
    .lineTo(cx - w / 2 - 2, topY + h * 0.3)
    .quadraticCurveTo(cx - w / 2 + 2, topY + h, cx, topY + h + 2)
    .quadraticCurveTo(cx + w / 2 - 2, topY + h, cx + w / 2 + 2, topY + h * 0.3)
    .lineTo(cx + w / 2, topY)
    .closePath()
    .fill({ color: COL_ARMOR, alpha });

  // Inner plate highlight
  g.moveTo(cx - w / 2 + 3, topY + 2)
    .lineTo(cx - w / 2 + 1, topY + h * 0.3)
    .quadraticCurveTo(cx - w / 2 + 4, topY + h - 3, cx, topY + h)
    .quadraticCurveTo(cx + w / 2 - 4, topY + h - 3, cx + w / 2 - 1, topY + h * 0.3)
    .lineTo(cx + w / 2 - 3, topY + 2)
    .closePath()
    .fill({ color: COL_ARMOR_LT, alpha: alpha * 0.6 });

  // Holy cross engraving on chest
  g.rect(cx - 1, topY + 5, 2, 10).fill({ color: COL_ARMOR_DK, alpha: alpha * 0.6 });
  g.rect(cx - 4, topY + 8, 8, 2).fill({ color: COL_ARMOR_DK, alpha: alpha * 0.6 });

  // Shoulder pauldrons
  for (const s of [-1, 1]) {
    const sx = cx + s * (w / 2 + 1);
    g.moveTo(sx, topY + 1)
      .quadraticCurveTo(sx + s * 6, topY - 2, sx + s * 5, topY + 8)
      .quadraticCurveTo(sx + s * 2, topY + 10, sx, topY + 6)
      .closePath()
      .fill({ color: COL_ARMOR, alpha });
    // Pauldron edge highlight
    g.moveTo(sx, topY + 1)
      .quadraticCurveTo(sx + s * 6, topY - 2, sx + s * 5, topY + 8)
      .stroke({ color: COL_ARMOR_LT, alpha: alpha * 0.5, width: 1 });
  }

  // Neckline / gorget
  g.moveTo(cx - 5, topY)
    .quadraticCurveTo(cx, topY - 3, cx + 5, topY)
    .stroke({ color: COL_ARMOR_DK, alpha: alpha * 0.7, width: 1.5 });
}

// ---------------------------------------------------------------------------
// Arms (default idle pose)
// ---------------------------------------------------------------------------

function drawArms(g: Graphics, cx: number, shoulderY: number, _leftAngle: number, _rightAngle: number, alpha = 1): void {
  drawArmLeft(g, cx, shoulderY, 0, alpha);
  drawArmRight(g, cx, shoulderY, 0, alpha);
}

function drawArmLeft(g: Graphics, cx: number, sy: number, _angle: number, alpha = 1): void {
  // Left arm hanging, slightly bent at elbow
  g.moveTo(cx - 10, sy)
    .quadraticCurveTo(cx - 14, sy + 8, cx - 12, sy + 16)
    .stroke({ color: COL_SKIN, alpha, width: 4 });
  // Armor on upper arm
  g.moveTo(cx - 10, sy)
    .quadraticCurveTo(cx - 14, sy + 8, cx - 12, sy + 10)
    .stroke({ color: COL_ARMOR, alpha, width: 3 });
  // Hand
  g.circle(cx - 12, sy + 16, 2.5).fill({ color: COL_SKIN, alpha });
}

function drawArmRight(g: Graphics, cx: number, sy: number, _angle: number, alpha = 1): void {
  // Right arm at side, holding sword position
  g.moveTo(cx + 10, sy)
    .quadraticCurveTo(cx + 14, sy + 8, cx + 14, sy + 14)
    .stroke({ color: COL_SKIN, alpha, width: 4 });
  g.moveTo(cx + 10, sy)
    .quadraticCurveTo(cx + 14, sy + 8, cx + 14, sy + 10)
    .stroke({ color: COL_ARMOR, alpha, width: 3 });
  g.circle(cx + 14, sy + 14, 2.5).fill({ color: COL_SKIN, alpha });
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

function drawHead(g: Graphics, cx: number, topY: number, alpha = 1): void {
  // Hair (behind head)
  g.ellipse(cx, topY + 6, 9, 10).fill({ color: COL_HAIR, alpha });
  g.ellipse(cx, topY + 4, 8, 8).fill({ color: COL_HAIR_DK, alpha: alpha * 0.4 });

  // Face
  g.ellipse(cx, topY + 6, 7, 8).fill({ color: COL_SKIN, alpha });

  // Slight jaw shading
  g.ellipse(cx, topY + 10, 5, 4).fill({ color: COL_SKIN_DK, alpha: alpha * 0.3 });

  // Eyes
  g.ellipse(cx - 3, topY + 5, 1.8, 1.2).fill({ color: 0xffffff, alpha });
  g.ellipse(cx + 3, topY + 5, 1.8, 1.2).fill({ color: 0xffffff, alpha });
  g.circle(cx - 3, topY + 5, 1).fill({ color: COL_EYE, alpha });
  g.circle(cx + 3, topY + 5, 1).fill({ color: COL_EYE, alpha });
  // Eye glint
  g.circle(cx - 2.5, topY + 4.5, 0.4).fill({ color: 0xffffff, alpha });
  g.circle(cx + 3.5, topY + 4.5, 0.4).fill({ color: 0xffffff, alpha });

  // Nose hint
  g.moveTo(cx, topY + 6)
    .lineTo(cx - 0.5, topY + 8)
    .stroke({ color: COL_SKIN_DK, alpha: alpha * 0.4, width: 0.6 });

  // Mouth
  g.moveTo(cx - 2, topY + 9.5)
    .quadraticCurveTo(cx, topY + 10.5, cx + 2, topY + 9.5)
    .stroke({ color: COL_SKIN_DK, alpha: alpha * 0.4, width: 0.6 });

  // Hair strands on top
  for (let i = -2; i <= 2; i++) {
    g.moveTo(cx + i * 3, topY + 2)
      .quadraticCurveTo(cx + i * 4, topY - 3, cx + i * 3.5, topY - 4)
      .stroke({ color: COL_HAIR, alpha: alpha * 0.8, width: 1.5 });
  }
}

// ---------------------------------------------------------------------------
// Halo
// ---------------------------------------------------------------------------

function drawHalo(g: Graphics, cx: number, y: number, intensity: number, alpha = 1): void {
  // Outer glow
  g.ellipse(cx, y, 14, 4.5).fill({ color: COL_HALO_GLOW, alpha: alpha * intensity * 0.4 });
  // Main ring
  g.ellipse(cx, y, 11, 3.5)
    .stroke({ color: COL_HALO, alpha: alpha * (0.6 + intensity * 0.4), width: 2.5 });
  // Inner bright line
  g.ellipse(cx, y, 10, 3)
    .stroke({ color: 0xffffff, alpha: alpha * intensity * 0.4, width: 1 });
  // Top glow dot
  g.circle(cx, y - 3, 2).fill({ color: COL_HALO_GLOW, alpha: alpha * intensity * 0.3 });
}

// ---------------------------------------------------------------------------
// Sword
// ---------------------------------------------------------------------------

function drawSword(g: Graphics, hx: number, hy: number, angle: number, alpha = 1): void {
  const cos = Math.cos(angle - Math.PI / 2);
  const sin = Math.sin(angle - Math.PI / 2);
  const bladeLen = 28;

  // Blade direction
  const tipX = hx + cos * bladeLen;
  const tipY = hy + sin * bladeLen;
  const midX = hx + cos * bladeLen * 0.5;
  const midY = hy + sin * bladeLen * 0.5;

  // Perpendicular for blade width
  const pw = 2;
  const px = -sin * pw;
  const py =  cos * pw;

  // Flame glow along blade
  for (let i = 0; i < 5; i++) {
    const t = 0.3 + i * 0.15;
    const fx = hx + cos * bladeLen * t;
    const fy = hy + sin * bladeLen * t;
    const r = 4 - i * 0.3;
    g.circle(fx, fy, r).fill({ color: COL_BLADE_FIRE, alpha: alpha * (0.2 - i * 0.03) });
  }

  // Blade
  g.moveTo(hx + px, hy + py)
    .lineTo(midX + px * 0.8, midY + py * 0.8)
    .lineTo(tipX, tipY)
    .lineTo(midX - px * 0.8, midY - py * 0.8)
    .lineTo(hx - px, hy - py)
    .closePath()
    .fill({ color: COL_BLADE, alpha });

  // Blade edge highlight
  g.moveTo(hx, hy)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE_EDGE, alpha: alpha * 0.7, width: 1 });

  // Flame wisps at blade tip
  for (let i = 0; i < 3; i++) {
    const fx = tipX + cos * (3 + i * 3) + Math.sin(angle + i) * 2;
    const fy = tipY + sin * (3 + i * 3) + Math.cos(angle + i) * 2;
    g.circle(fx, fy, 2 - i * 0.5)
      .fill({ color: i === 0 ? COL_BLADE_CORE : COL_BLADE_FIRE, alpha: alpha * (0.6 - i * 0.15) });
  }

  // Cross guard
  const gpx = -sin * 5;
  const gpy =  cos * 5;
  g.moveTo(hx + gpx, hy + gpy)
    .lineTo(hx - gpx, hy - gpy)
    .stroke({ color: COL_GUARD, alpha, width: 3 });

  // Pommel
  const pmX = hx - cos * 4;
  const pmY = hy - sin * 4;
  g.circle(pmX, pmY, 2).fill({ color: COL_GUARD, alpha });
}
