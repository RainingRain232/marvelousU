// Procedural sprite generator for the Archon unit type.
//
// Draws a supreme celestial warrior at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Brilliant golden plate armor, ornate with holy symbols
//   • Flaming holy sword (white-gold flames)
//   • Golden halo above head
//   • Large white feathered wings (two wings)
//   • Flowing white cape
//   • Glowing white eyes, divine radiance aura
//   • Floats above ground, radiates divine light

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F  = 48;
const CX = F / 2;
const GY = F - 4;

/* ── palette ─────────────────────────────────────────────────────────── */

// Skin
const COL_SKIN       = 0xfff0dc;
const COL_SKIN_DK    = 0xecd8b8;

// Golden armor
const COL_ARMOR      = 0xffd040;
const COL_ARMOR_LT   = 0xffe878;
const COL_ARMOR_DK   = 0xc89010;
const COL_ARMOR_RIM  = 0xffe8a0;

// Holy symbols / engravings
const COL_ENGRV      = 0xd4a820;

// Cape / cloth
const COL_CAPE       = 0xf8f4ee;
const COL_CAPE_FOLD  = 0xe0dcd4;
const COL_CAPE_SHAD  = 0xc8c4bc;

// Wings
const COL_WING       = 0xffffff;
const COL_WING_MID   = 0xf0ede8;
const COL_WING_SHAD  = 0xd8d4d0;
const COL_WING_BONE  = 0xfff8f0;

// Halo
const COL_HALO       = 0xfff4a0;
const COL_HALO_GLOW  = 0xffeecc;

// Sword
const COL_BLADE      = 0xffffff;
const COL_BLADE_EDGE = 0xf0f8ff;
const COL_BLADE_FIRE = 0xfff0a0;   // white-gold flame
const COL_BLADE_FIRE2= 0xffe040;
const COL_GUARD      = 0xffd040;

// Aura / glow
const COL_AURA       = 0xfff8e0;
const COL_DIVINE     = 0xffffff;

// Eyes
const COL_EYE        = 0xffffff;
const COL_EYE_GLOW   = 0xffe8a0;

const COL_SHADOW     = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, rx = 10, ry = 2.5, alpha = 0.18): void {
  g.ellipse(cx, gy + 1, rx, ry).fill({ color: COL_SHADOW, alpha });
}

function drawAura(g: Graphics, cx: number, cy: number, intensity: number): void {
  if (intensity <= 0) return;
  g.ellipse(cx, cy, 18, 22).fill({ color: COL_AURA, alpha: intensity * 0.28 });
  g.ellipse(cx, cy, 11, 14).fill({ color: COL_DIVINE, alpha: intensity * 0.12 });
}

function drawWing(g: Graphics, cx: number, sy: number, side: number, flapY: number, spread: number, alpha = 1): void {
  const s = side;  // -1 = left, +1 = right

  // Wing bone anchor at shoulder
  const ax = cx + s * 5;
  const ay = sy;

  // Wing elbow
  const ex = cx + s * 17 * spread;
  const ey = sy - 9 + flapY;

  // Wing tip
  const tx = cx + s * 26 * spread;
  const ty = sy - 2 + flapY * 0.5;

  // Trailing edge
  const trMidX = cx + s * 14 * spread;
  const trMidY = sy + 8 + flapY * 0.25;
  const trTipX = cx + s * 22 * spread;
  const trTipY = sy + 5 + flapY * 0.3;

  // Main membrane
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 10 * spread, sy - 10 + flapY * 0.8, ex, ey)
    .lineTo(tx, ty)
    .quadraticCurveTo(trTipX, trTipY, trMidX, trMidY)
    .quadraticCurveTo(cx + s * 7 * spread, sy + 5, ax, ay + 3)
    .closePath()
    .fill({ color: COL_WING_MID, alpha: alpha * 0.9 });

  // Inner membrane highlight
  g.moveTo(ax + s * 2, ay + 1)
    .quadraticCurveTo(cx + s * 11 * spread, sy - 6 + flapY * 0.7, ex - s * 2, ey + 3)
    .lineTo(trMidX + s * 2, trMidY - 3)
    .quadraticCurveTo(cx + s * 8 * spread, sy + 2, ax + s * 2, ay + 3)
    .closePath()
    .fill({ color: COL_WING, alpha: alpha * 0.55 });

  // Leading edge / bone
  g.moveTo(ax, ay)
    .quadraticCurveTo(cx + s * 10 * spread, sy - 10 + flapY * 0.8, ex, ey)
    .lineTo(tx, ty)
    .stroke({ color: COL_WING_BONE, alpha, width: 1.5 });

  // Feather veins
  for (let i = 0; i < 3; i++) {
    const vt = 0.3 + i * 0.25;
    const vbx = ax + (tx - ax) * vt;
    const vby = ay + (ey - ay) * vt + (ty - ey) * Math.max(0, vt - 0.5) * 2;
    const vex = ax + (trTipX - ax) * vt;
    const vey = ay + 3 + (trMidY - ay) * vt;
    g.moveTo(vbx, vby)
      .lineTo(vex, vey)
      .stroke({ color: COL_WING_SHAD, alpha: alpha * 0.3, width: 0.6 });
  }

  // Primary feathers (4 long feathers at tip)
  for (let i = 0; i < 4; i++) {
    const bt = 0.65 + i * 0.1;
    const fbx = ax + (tx - ax) * bt;
    const fby = ay + (ty - ay) * bt + (ey - ay) * (1 - bt) * 0.5;
    const featherLen = 8 - i * 1.2;
    const featherAngle = Math.PI * 0.55 + s * 0.1 + i * 0.13 * s;
    const ftx = fbx + Math.cos(featherAngle) * featherLen;
    const fty = fby + Math.sin(featherAngle) * featherLen;
    const perpX = -Math.sin(featherAngle) * 2;
    const perpY =  Math.cos(featherAngle) * 2;
    g.moveTo(fbx, fby)
      .quadraticCurveTo(fbx + (ftx - fbx) * 0.5 + perpX, fby + (fty - fby) * 0.5 + perpY, ftx, fty)
      .quadraticCurveTo(fbx + (ftx - fbx) * 0.5 - perpX, fby + (fty - fby) * 0.5 - perpY, fbx, fby)
      .fill({ color: i % 2 === 0 ? COL_WING : COL_WING_MID, alpha: alpha * 0.9 });
    g.moveTo(fbx, fby).lineTo(ftx, fty).stroke({ color: COL_WING_SHAD, alpha: alpha * 0.25, width: 0.4 });
  }
}

function drawWings(g: Graphics, cx: number, shoulderY: number, flapAngle: number, spread: number, alpha = 1): void {
  const flapY = flapAngle * 18;
  drawWing(g, cx, shoulderY, -1, flapY, spread, alpha);
  drawWing(g, cx, shoulderY,  1, flapY, spread, alpha);
}

function drawCape(g: Graphics, cx: number, top: number, lean: number, wave: number, alpha = 1): void {
  const botW = 13;
  const topW = 9;
  const capeH = 14;
  const lx = lean * 5;

  g.moveTo(cx - topW / 2, top)
    .quadraticCurveTo(cx - botW / 2 + lx * 0.3 + wave, top + capeH * 0.5, cx - botW / 2 + lx, top + capeH)
    .quadraticCurveTo(cx + lx, top + capeH + 2, cx + botW / 2 + lx, top + capeH)
    .quadraticCurveTo(cx + botW / 2 + lx * 0.3 - wave, top + capeH * 0.5, cx + topW / 2, top)
    .closePath()
    .fill({ color: COL_CAPE, alpha });

  // Fold lines
  g.moveTo(cx - topW * 0.3, top + 2)
    .quadraticCurveTo(cx - botW * 0.35 + lx * 0.5, top + capeH * 0.6, cx - botW * 0.3 + lx, top + capeH - 1)
    .stroke({ color: COL_CAPE_FOLD, alpha: alpha * 0.5, width: 0.7 });
  g.moveTo(cx + topW * 0.25, top + 2)
    .quadraticCurveTo(cx + botW * 0.3 + lx * 0.5, top + capeH * 0.6, cx + botW * 0.28 + lx, top + capeH - 1)
    .stroke({ color: COL_CAPE_FOLD, alpha: alpha * 0.35, width: 0.6 });

  // Bottom hem
  g.moveTo(cx - botW / 2 + lx, top + capeH)
    .quadraticCurveTo(cx + lx, top + capeH + 2, cx + botW / 2 + lx, top + capeH)
    .stroke({ color: COL_CAPE_SHAD, alpha: alpha * 0.3, width: 1 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0, alpha = 1): void {
  const tw = 11;
  const x = cx - tw / 2 + tilt;

  // Breastplate main
  g.moveTo(x, top)
    .lineTo(x - 1.5, top + h * 0.3)
    .quadraticCurveTo(x + 1, top + h, cx + tilt, top + h + 1)
    .quadraticCurveTo(cx + tilt + tw / 2 - 1, top + h, cx + tilt + tw / 2 + 1.5, top + h * 0.3)
    .lineTo(cx + tilt + tw / 2, top)
    .closePath()
    .fill({ color: COL_ARMOR, alpha });

  // Highlight panel
  g.moveTo(x + 2, top + 1.5)
    .lineTo(x + 1, top + h * 0.28)
    .quadraticCurveTo(x + 3, top + h - 2, cx + tilt, top + h - 1)
    .quadraticCurveTo(cx + tilt + tw / 2 - 3, top + h - 2, cx + tilt + tw / 2 - 1, top + h * 0.28)
    .lineTo(cx + tilt + tw / 2 - 2, top + 1.5)
    .closePath()
    .fill({ color: COL_ARMOR_LT, alpha: alpha * 0.55 });

  // Holy cross engraving on chest
  g.rect(cx + tilt - 0.7, top + 4, 1.4, 7).fill({ color: COL_ENGRV, alpha: alpha * 0.55 });
  g.rect(cx + tilt - 3, top + 6, 6, 1.4).fill({ color: COL_ENGRV, alpha: alpha * 0.55 });

  // Armor rim trim
  g.moveTo(x, top)
    .lineTo(cx + tilt + tw / 2, top)
    .stroke({ color: COL_ARMOR_RIM, alpha: alpha * 0.6, width: 0.8 });

  // Shoulder pauldrons
  for (const s of [-1, 1]) {
    const sx = cx + tilt + s * (tw / 2 + 0.5);
    g.moveTo(sx, top + 1)
      .quadraticCurveTo(sx + s * 4.5, top - 1.5, sx + s * 4, top + 6)
      .quadraticCurveTo(sx + s * 1.5, top + 7.5, sx, top + 4.5)
      .closePath()
      .fill({ color: COL_ARMOR, alpha });
    g.moveTo(sx, top + 1)
      .quadraticCurveTo(sx + s * 4.5, top - 1.5, sx + s * 4, top + 6)
      .stroke({ color: COL_ARMOR_LT, alpha: alpha * 0.45, width: 0.8 });
    // Pauldron rim
    g.moveTo(sx + s * 0.5, top + 4.5)
      .quadraticCurveTo(sx + s * 2, top + 7, sx + s * 4, top + 6)
      .stroke({ color: COL_ARMOR_RIM, alpha: alpha * 0.35, width: 0.6 });
  }

  // Gorget
  g.moveTo(cx + tilt - 4, top)
    .quadraticCurveTo(cx + tilt, top - 2, cx + tilt + 4, top)
    .stroke({ color: COL_ARMOR_DK, alpha: alpha * 0.6, width: 1 });
}

function drawLegs(g: Graphics, cx: number, top: number, h: number, stL: number, stR: number, alpha = 1): void {
  // Armored greaves
  for (const [sx, st, hl] of [
    [cx - 5.5 + stL, 3.8, -1],
    [cx + 1.5 + stR, 3.8,  1],
  ] as [number, number, number][]) {
    // Upper leg plate
    g.roundRect(sx, top, st, h * 0.55, 1)
      .fill({ color: COL_ARMOR, alpha });
    g.roundRect(sx + 0.5, top + 0.5, st - 1, h * 0.22, 0.5)
      .fill({ color: COL_ARMOR_LT, alpha: alpha * 0.4 });
    // Lower leg plate
    g.roundRect(sx, top + h * 0.55, st, h * 0.45, 1)
      .fill({ color: COL_ARMOR_DK, alpha });
    // Side edge
    g.moveTo(sx + (hl === -1 ? st : 0), top)
      .lineTo(sx + (hl === -1 ? st : 0), top + h)
      .stroke({ color: COL_ARMOR_RIM, alpha: alpha * 0.3, width: 0.5 });
  }
}

function drawSabatons(g: Graphics, cx: number, gy: number, stL: number, stR: number, alpha = 1): void {
  for (const ox of [cx - 5.5 + stL, cx + 1.5 + stR]) {
    g.roundRect(ox, gy - 3.5, 4, 3.5, 1).fill({ color: COL_ARMOR, alpha });
    g.moveTo(ox, gy - 3.5).lineTo(ox + 4, gy - 3.5).stroke({ color: COL_ARMOR_RIM, alpha: alpha * 0.4, width: 0.6 });
  }
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0, eyeGlow = 0.8, alpha = 1): void {
  const hw = 7;
  const hh = 8;
  const x  = cx - hw / 2 + tilt;

  // Face
  g.roundRect(x + 1, top + 2, hw - 2, hh - 3, 2)
    .fill({ color: COL_SKIN, alpha });

  // Ornate helm frame (sides, top)
  g.moveTo(x, top + hh * 0.45)
    .lineTo(x, top + 2)
    .quadraticCurveTo(cx + tilt, top - 1, x + hw, top + 2)
    .lineTo(x + hw, top + hh * 0.45)
    .stroke({ color: COL_ARMOR, alpha, width: 1.8 });

  // Helm crest line
  g.moveTo(cx + tilt - 1, top - 1)
    .lineTo(cx + tilt + 1, top - 1)
    .stroke({ color: COL_ARMOR_LT, alpha: alpha * 0.6, width: 0.8 });

  // Glowing white eyes
  const eyeY = top + hh * 0.42;
  for (const ex of [cx - 1.8 + tilt, cx + 1.8 + tilt]) {
    g.ellipse(ex, eyeY, 1.4, 0.9).fill({ color: COL_EYE, alpha });
    g.circle(ex, eyeY, 0.9 + eyeGlow * 0.6).fill({ color: COL_EYE_GLOW, alpha: alpha * eyeGlow * 0.7 });
    g.circle(ex, eyeY, 0.3).fill({ color: COL_SKIN_DK, alpha: alpha * 0.4 });
  }

  // Jaw / chin plate
  g.moveTo(x + 1.5, top + hh - 2)
    .quadraticCurveTo(cx + tilt, top + hh + 0.5, x + hw - 1.5, top + hh - 2)
    .stroke({ color: COL_ARMOR_DK, alpha: alpha * 0.5, width: 0.9 });

  // Nose-bridge hint
  g.moveTo(cx + tilt, top + hh * 0.5)
    .lineTo(cx + tilt - 0.5, top + hh * 0.65)
    .stroke({ color: COL_SKIN_DK, alpha: alpha * 0.25, width: 0.5 });
}

function drawHalo(g: Graphics, cx: number, y: number, intensity: number, alpha = 1): void {
  // Outer glow
  g.ellipse(cx, y, 10, 3).fill({ color: COL_HALO_GLOW, alpha: alpha * intensity * 0.35 });
  // Main ring
  g.ellipse(cx, y, 8, 2.5)
    .stroke({ color: COL_HALO, alpha: alpha * (0.55 + intensity * 0.45), width: 2 });
  // Inner bright ring
  g.ellipse(cx, y, 7, 2.1)
    .stroke({ color: 0xffffff, alpha: alpha * intensity * 0.4, width: 0.7 });
  // Crown dots
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dx = Math.cos(angle) * 7.5;
    const dy = Math.sin(angle) * 2.3;
    g.circle(cx + dx, y + dy, 0.7).fill({ color: COL_HALO, alpha: alpha * intensity * 0.7 });
  }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number, alpha = 1): void {
  // Upper arm plate
  const mx = lerp(sx, ex, 0.45);
  const my = lerp(sy, ey, 0.45);
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_ARMOR, alpha, width: 3.5 });
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_ARMOR_LT, alpha: alpha * 0.4, width: 1.5 });
  // Forearm
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_ARMOR_DK, alpha, width: 3 });
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_ARMOR_RIM, alpha: alpha * 0.25, width: 1 });
  // Gauntlet hand
  g.circle(ex, ey, 2).fill({ color: COL_ARMOR, alpha });
  g.circle(ex, ey, 1.2).fill({ color: COL_ARMOR_LT, alpha: alpha * 0.45 });
}

function drawSword(g: Graphics, hx: number, hy: number, angle: number, alpha = 1): void {
  const cos = Math.cos(angle - Math.PI / 2);
  const sin = Math.sin(angle - Math.PI / 2);
  const bladeLen = 14;

  const tipX = hx + cos * bladeLen;
  const tipY = hy + sin * bladeLen;
  const midX = hx + cos * bladeLen * 0.5;
  const midY = hy + sin * bladeLen * 0.5;

  const pw = 1.3;
  const px = -sin * pw;
  const py =  cos * pw;

  // Flame glow along blade (white-gold)
  for (let i = 0; i < 5; i++) {
    const ft = 0.3 + i * 0.15;
    const fx = hx + cos * bladeLen * ft;
    const fy = hy + sin * bladeLen * ft;
    const r  = 3.5 - i * 0.35;
    g.circle(fx, fy, r).fill({ color: COL_BLADE_FIRE, alpha: alpha * (0.22 - i * 0.03) });
  }

  // Blade body
  g.moveTo(hx + px, hy + py)
    .lineTo(midX + px * 0.85, midY + py * 0.85)
    .lineTo(tipX, tipY)
    .lineTo(midX - px * 0.85, midY - py * 0.85)
    .lineTo(hx - px, hy - py)
    .closePath()
    .fill({ color: COL_BLADE, alpha });

  // Bright edge
  g.moveTo(hx, hy).lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE_EDGE, alpha: alpha * 0.75, width: 0.8 });

  // Tip flame wisps
  for (let i = 0; i < 3; i++) {
    const fx = tipX + cos * (2 + i * 2.5) + Math.sin(angle + i) * 1.5;
    const fy = tipY + sin * (2 + i * 2.5) + Math.cos(angle + i) * 1.5;
    g.circle(fx, fy, 1.8 - i * 0.4)
      .fill({ color: i === 0 ? 0xffffff : COL_BLADE_FIRE2, alpha: alpha * (0.65 - i * 0.15) });
  }

  // Cross guard
  const gpx = -sin * 4;
  const gpy =  cos * 4;
  g.moveTo(hx + gpx, hy + gpy)
    .lineTo(hx - gpx, hy - gpy)
    .stroke({ color: COL_GUARD, alpha, width: 2.5 });
  // Guard gems
  g.circle(hx + gpx, hy + gpy, 0.8).fill({ color: COL_ARMOR_RIM, alpha });
  g.circle(hx - gpx, hy - gpy, 0.8).fill({ color: COL_ARMOR_RIM, alpha });

  // Pommel
  const pmX = hx - cos * 2.5;
  const pmY = hy - sin * 2.5;
  g.circle(pmX, pmY, 1.5).fill({ color: COL_GUARD, alpha });
  g.circle(pmX, pmY, 0.7).fill({ color: COL_ARMOR_LT, alpha });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t       = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const hover   = Math.sin(t * Math.PI * 2) * 1.2;    // float up and down
  const wingAng = Math.sin(t * Math.PI * 2) * 0.06;   // gentle beat
  const haloGlw = 0.55 + Math.sin(t * Math.PI * 2) * 0.2;
  const capeWave = Math.sin(t * Math.PI * 2) * 0.4;

  const legH    = 7;
  const torsoH  = 9;
  const floatY  = 3 - hover;                           // hover offset from ground
  const legTop  = GY - 4 - legH - floatY;
  const torsoTop = legTop - torsoH + 1 + breathe;
  const shoulderY = torsoTop;
  const headTop = torsoTop - 8;
  const haloY   = headTop - 4;

  drawShadow(g, CX, GY, 9 - hover * 0.3, 2, 0.18 - hover * 0.02);
  drawAura(g, CX, torsoTop + torsoH * 0.5, 0.14 + haloGlw * 0.08);

  // Wings behind body
  drawWings(g, CX, shoulderY, wingAng, 0.88);

  drawCape(g, CX, torsoTop, 0, capeWave);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawSabatons(g, CX, GY - floatY, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, haloGlw);
  drawHalo(g, CX, haloY, haloGlw);

  // Sword at side — right hand
  const rHandX = CX + 9;
  const rHandY = torsoTop + torsoH - 2 + breathe;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY);
  drawSword(g, rHandX, rHandY, 0.15);

  // Left arm lowered
  drawArm(g, CX - 5, torsoTop + 2, CX - 8, torsoTop + torsoH - 1 + breathe);

  // Divine light motes
  for (let i = 0; i < 4; i++) {
    const ang   = t * Math.PI * 2 + i * (Math.PI / 2);
    const dist  = 8 + i * 1.5;
    const mx    = CX + Math.cos(ang) * dist;
    const my    = torsoTop + 3 + Math.sin(ang) * dist * 0.35;
    g.circle(mx, my, 0.7).fill({ color: COL_DIVINE, alpha: 0.2 + Math.sin(ang + i) * 0.1 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t      = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob    = Math.abs(stride) * 0.6;

  // Flying forward — body tilted forward, wings spread wide
  const legH    = 7;
  const torsoH  = 9;
  const floatY  = 5;    // more airborne during move
  const stL     = Math.round(stride * 2.5);
  const stR     = Math.round(-stride * 2.5);
  const legTop  = GY - 4 - legH - floatY;
  const torsoTop = legTop - torsoH + 1 - bob * 0.3;
  const shoulderY = torsoTop;
  const headTop = torsoTop - 8;
  const haloY   = headTop - 4;
  const lean    = 0.08;   // slight forward tilt of torso
  const wingAng = Math.sin(t * Math.PI * 2) * 0.2;  // strong beat during flight
  const spread  = 1.05;   // wings spread wide

  drawShadow(g, CX, GY, 8, 2, 0.12);
  drawAura(g, CX, torsoTop + torsoH * 0.5, 0.18);

  // Golden trail behind (from armor glinting)
  for (let i = 1; i <= 3; i++) {
    const tx = CX - i * 2.5;
    const alpha = (0.12 - i * 0.03);
    g.ellipse(tx, torsoTop + torsoH * 0.5, 3, 6).fill({ color: COL_ARMOR_LT, alpha });
  }

  drawWings(g, CX, shoulderY, wingAng, spread);

  drawCape(g, CX, torsoTop, lean, stride * 0.6);
  drawLegs(g, CX, legTop, legH, stL, stR);
  drawSabatons(g, CX, GY - floatY, stL, stR);
  drawTorso(g, CX, torsoTop, torsoH, lean * 6);
  drawHead(g, CX, headTop, lean * 4, 0.7);
  drawHalo(g, CX, haloY, 0.65);

  // Arms — left forward, right back (flight pose)
  const armSwing = stride * 2.5;
  drawArm(g, CX + 5 + lean * 3, torsoTop + 2, CX + 9 + armSwing, torsoTop + torsoH - 1);
  drawSword(g, CX + 9 + armSwing, torsoTop + torsoH - 1, 0.2 + stride * 0.08);

  drawArm(g, CX - 5 + lean * 3, torsoTop + 2, CX - 9 - armSwing, torsoTop + torsoH - 1);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1 wind up, 2-3 launch, 4-5 full sweep, 6-7 recover
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.72, 0.87, 1.0];
  const t      = phases[Math.min(frame, 7)];

  const legH   = 7;
  const torsoH = 9;
  const floatY = 4;
  const legTop = GY - 4 - legH - floatY;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 8;
  const haloY   = headTop - 4;

  // Lunge forward during strike
  const lunge = t > 0.2 && t < 0.75 ? (t - 0.2) * 3.5 : 0;
  const lean  = t < 0.55 ? t * 1.1 : (1 - t) * 1.8;
  const wingFlare = 0.12 + lean * 0.18;

  drawShadow(g, CX + lunge * 0.3, GY, 9 + lunge, 2, 0.18);
  drawAura(g, CX, torsoTop + torsoH * 0.5, 0.1 + lean * 0.15);
  drawWings(g, CX, torsoTop, wingFlare, 0.92 + lean * 0.12);

  // Slash arc effect
  if (t >= 0.3 && t <= 0.75) {
    const slashAlpha = clamp01(1 - Math.abs(t - 0.52) / 0.22) * 0.45;
    const strike = clamp01((t - 0.3) / 0.45);
    g.moveTo(CX + 10 + lunge, torsoTop - 4)
      .quadraticCurveTo(CX + 22 + lunge, torsoTop + 3, CX + 18 + lunge, torsoTop + 12)
      .stroke({ color: COL_BLADE_FIRE, alpha: slashAlpha * 0.7, width: 5 });
    g.moveTo(CX + 10 + lunge, torsoTop - 4)
      .quadraticCurveTo(CX + 22 + lunge, torsoTop + 3, CX + 18 + lunge, torsoTop + 12)
      .stroke({ color: COL_BLADE, alpha: slashAlpha * 0.5, width: 2 });
    // Impact flash
    if (t > 0.62) {
      const flash = clamp01((t - 0.62) / 0.13);
      g.circle(CX + 18 + lunge, torsoTop + 12, 5 + flash * 7)
        .fill({ color: 0xffffff, alpha: 0.35 * (1 - flash) });
    }
    void strike;
  }

  drawCape(g, CX + lunge * 0.3, torsoTop, lean * 0.15, -lean * 0.5);
  drawLegs(g, CX, legTop, legH, -1, 2);
  drawSabatons(g, CX, GY - floatY, -1, 2);
  drawTorso(g, CX, torsoTop, torsoH, lean * 5);
  drawHead(g, CX, headTop, lean * 3, 0.75 + lean * 0.25);
  drawHalo(g, CX, haloY, 0.6 + lean * 0.4);

  // Sword angle: wind up behind → forward sweep → recover
  let swordAngle: number;
  if (t < 0.22) {
    swordAngle = lerp(0.15, -1.4, t / 0.22);
  } else if (t < 0.6) {
    swordAngle = lerp(-1.4, 1.7, (t - 0.22) / 0.38);
  } else {
    swordAngle = lerp(1.7, 0.15, (t - 0.6) / 0.4);
  }

  const reach = t > 0.15 && t < 0.75 ? clamp01((t - 0.15) / 0.3) * 4 : 0;
  const rHandX = CX + 8 + lean * 4 + reach + lunge;
  const rHandY = torsoTop + 3;
  drawArm(g, CX + 5 + lean * 3, torsoTop + 2, rHandX, rHandY);
  drawSword(g, rHandX, rHandY, swordAngle);

  // Left arm counterbalances
  drawArm(g, CX - 5 + lean * 2, torsoTop + 2, CX - 9 - lean * 2, torsoTop + torsoH * 0.5);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t         = frame / 7;
  const pulse     = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);
  const rise      = t * 5;   // hovers higher as cast builds

  const legH   = 7;
  const torsoH = 9;
  const floatY = 5 + rise;
  const legTop = GY - 4 - legH - floatY;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 8;
  const haloY   = headTop - 4;

  const wingSpread = 0.9 + intensity * 0.15;
  const wingAng    = intensity * 0.18;

  drawShadow(g, CX, GY, 9 - rise * 0.4, 2, 0.15 - rise * 0.015);

  // Expanding radiant burst
  for (let i = 0; i < 3; i++) {
    const r = (8 + intensity * 14 + i * 5 + pulse * 3);
    g.circle(CX, torsoTop + torsoH * 0.4, r)
      .fill({ color: COL_HALO_GLOW, alpha: (0.1 - i * 0.03) * intensity });
  }

  // Orbiting divine particles
  for (let i = 0; i < 8; i++) {
    const ang  = t * Math.PI * 3 + i * (Math.PI / 4);
    const dist = 12 + intensity * 9 + i * 1.2;
    const px   = CX + Math.cos(ang) * dist;
    const py   = torsoTop + torsoH * 0.4 + Math.sin(ang) * dist * 0.4;
    g.circle(px, py, 1.2 - i * 0.08)
      .fill({ color: i % 2 === 0 ? COL_DIVINE : COL_HALO, alpha: (0.55 - i * 0.05) * intensity });
    g.circle(px, py, 0.5)
      .fill({ color: 0xffffff, alpha: 0.7 * intensity });
  }

  drawAura(g, CX, torsoTop + torsoH * 0.5, 0.25 + intensity * 0.35 + pulse * 0.1);
  drawWings(g, CX, torsoTop, wingAng, wingSpread);

  drawCape(g, CX, torsoTop, 0, pulse * 0.3);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawSabatons(g, CX, GY - floatY, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, 0.7 + pulse * 0.3);
  drawHalo(g, CX, haloY, 0.65 + intensity * 0.35 + pulse * 0.15);

  // Both arms raised outward — channeling heal
  const armLift = intensity * 9 + pulse * 1.5;
  drawArm(g, CX - 5, torsoTop + 2, CX - 14, torsoTop - armLift);
  drawArm(g, CX + 5, torsoTop + 2, CX + 14, torsoTop - armLift);

  // Glowing palms
  const glowR = 2.5 + intensity * 3 + pulse * 1;
  const palmAlpha = 0.45 + intensity * 0.4 + pulse * 0.1;
  g.circle(CX - 14, torsoTop - armLift, glowR).fill({ color: COL_DIVINE, alpha: palmAlpha });
  g.circle(CX + 14, torsoTop - armLift, glowR).fill({ color: COL_DIVINE, alpha: palmAlpha });
  g.circle(CX - 14, torsoTop - armLift, glowR * 0.5).fill({ color: COL_HALO_GLOW, alpha: 0.8 });
  g.circle(CX + 14, torsoTop - armLift, glowR * 0.5).fill({ color: COL_HALO_GLOW, alpha: 0.8 });

  // Ground heal ring
  g.circle(CX, GY, 10 + intensity * 10).fill({ color: COL_HALO_GLOW, alpha: intensity * 0.12 });
  g.circle(CX, GY, 10 + intensity * 10).stroke({ color: COL_ARMOR, alpha: intensity * 0.25, width: 0.8 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH   = 7;
  const torsoH = 9;

  // Wings fold and droop
  const wingDroop = -t * 0.28;
  const wingSpread = 0.88 - t * 0.35;

  // Falls to knees then pitches forward
  const fallFwd   = t * 8;
  const dropY     = t < 0.5 ? t * t * 10 : 2.5 + (t - 0.5) * 14;
  const tilt      = t * 0.45;
  const alpha     = 1 - t * 0.45;

  const legTop   = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 1 + dropY;
  const headTop  = torsoTop - 8;
  const haloY    = headTop - 4;
  const haloIntensity = clamp01(1 - t * 1.3);

  drawShadow(g, CX + fallFwd * 0.3, GY, 9 - t * 3, 2, 0.18 * (1 - t * 0.6));

  // Divine light fading upward
  for (let i = 0; i < 5; i++) {
    const px  = CX - 8 + i * 4 + Math.sin(frame * 0.7 + i) * 3;
    const py  = torsoTop - t * 20 - i * 7;
    const r   = 1.8 - t * 0.5;
    const a   = t * 0.45 * (1 - i * 0.15);
    if (a > 0 && r > 0) {
      g.circle(px, py, r).fill({ color: COL_HALO_GLOW, alpha: a });
    }
  }

  const ox = Math.sin(tilt) * 10;

  drawWings(g, CX + ox * 0.2, torsoTop, wingDroop, wingSpread, alpha);
  drawCape(g, CX + ox * 0.4, torsoTop, tilt * 0.5, 0, alpha);

  if (t < 0.75) {
    drawLegs(g, CX + fallFwd * 0.05, legTop + dropY * 0.25, legH, t * 1.5, -t * 0.5, alpha);
    drawSabatons(g, CX + fallFwd * 0.05, GY, t * 1.5, -t * 0.5, alpha);
  }

  drawTorso(g, CX + ox * 0.5 + fallFwd * 0.2, torsoTop, torsoH * (1 - t * 0.1), tilt * 4, alpha);

  if (t < 0.9) {
    drawHead(g, CX + ox * 0.5 + fallFwd * 0.2, headTop + dropY * 0.15, tilt * 5, haloIntensity * 0.5, alpha);
  }

  drawHalo(g, CX + ox * 0.3 + fallFwd * 0.15, haloY + dropY * 0.1, haloIntensity, alpha);

  // Sword falls from grasp
  if (t < 0.6) {
    const sbx = CX + 9 + t * 10 + ox;
    const sby = torsoTop + torsoH - 2 + t * 8;
    drawSword(g, sbx, sby, 0.15 + t * 3, 1 - t * 0.6);
  }

  // Left arm slumps
  if (t > 0.3) {
    drawArm(
      g,
      CX - 5 + ox * 0.5 + fallFwd * 0.15,
      torsoTop + 2,
      CX - 5 + ox * 0.5 + fallFwd * 0.15 + t * 6,
      torsoTop + torsoH + t * 5,
      alpha,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all Archon sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateArchonFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
