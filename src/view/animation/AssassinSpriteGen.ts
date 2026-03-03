// Procedural sprite generator for the Assassin unit type.
//
// Draws a stealthy hooded killer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Dark hooded cloak with leather underlayer
//   • Visible lower face with intense eyes under deep hood
//   • Longsword in right hand, curved dagger in left
//   • Leather bracers and fingerless gloves
//   • Studded leather chest piece under cloak
//   • Dark soft-soled boots with buckles
//   • Crouched, predatory stance
//   • Belt with pouches

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — dark & stealthy
const COL_SKIN = 0xd4a882;
const COL_SKIN_DK = 0xb88a66;

const COL_CLOAK = 0x1a1a22; // near-black cloak
const COL_CLOAK_HI = 0x2a2a34;
const COL_CLOAK_DK = 0x101018;

const COL_LEATHER = 0x3a2e24; // studded leather
const COL_LEATHER_HI = 0x4e3e30;
const COL_LEATHER_DK = 0x28201a;

const COL_HOOD = 0x141418;
const COL_HOOD_INNER = 0x0c0c10;

const COL_EYE = 0xcccccc; // pale piercing eyes
const COL_EYE_GLOW = 0xcc2222; // glowing red for cast

const COL_BRACER = 0x3e342a;
const COL_BRACER_BUCKLE = 0x888070;

const COL_SWORD = 0xb8c0c8; // main-hand blade
const COL_SWORD_HI = 0xd8e0e8;
const COL_SWORD_GRD = 0x444444;
const COL_SWORD_WRAP = 0x2a2218; // leather grip

const COL_DAGGER = 0xa0a8b4; // off-hand dagger
const COL_DAGGER_HI = 0xc8d0d8;
const COL_DAGGER_GRD = 0x554a3a;

const COL_BOOT = 0x1e1a16;
const COL_BOOT_DK = 0x121010;
const COL_BOOT_BUCKLE = 0x706858;

const COL_BELT = 0x32281e;
const COL_BELT_BUCKLE = 0x908070;
const COL_POUCH = 0x3a3028;

const COL_SHADOW = 0x000000;

const COL_POISON = 0x66cc44; // poison trail on cast

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 11,
  h = 3,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5;
  const bh = 5 - squash;
  // Left boot
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Buckle detail
  g.rect(cx - 6 + stanceL, gy - bh + 1, 3, 1).fill({ color: COL_BOOT_BUCKLE, alpha: 0.6 });
  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.rect(cx + 3 + stanceR, gy - bh + 1, 3, 1).fill({ color: COL_BOOT_BUCKLE, alpha: 0.6 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Dark trousers with subtle seam
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_CLOAK_DK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_CLOAK_DK });
  // Seam highlight
  g.moveTo(cx - 3 + stanceL, legTop)
    .lineTo(cx - 3 + stanceL, legTop + legH)
    .stroke({ color: COL_CLOAK_HI, width: 0.3, alpha: 0.3 });
  g.moveTo(cx + 3 + stanceR, legTop)
    .lineTo(cx + 3 + stanceR, legTop + legH)
    .stroke({ color: COL_CLOAK_HI, width: 0.3, alpha: 0.3 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;

  // Studded leather chest piece
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_LEATHER })
    .stroke({ color: COL_LEATHER_DK, width: 0.6 });

  // Stud rows
  for (let row = 2; row < h - 2; row += 3) {
    for (let col = 2; col < tw - 1; col += 3) {
      g.circle(x + col, top + row, 0.6).fill({ color: COL_BRACER_BUCKLE, alpha: 0.5 });
    }
  }

  // Leather highlights on chest
  g.roundRect(x + 1, top + 1, tw - 2, 2, 1).fill({ color: COL_LEATHER_HI, alpha: 0.3 });

  // Belt across waist
  g.rect(x, top + h - 3, tw, 2).fill({ color: COL_BELT });
  // Belt buckle
  g.circle(cx + tilt, top + h - 2, 1.2).fill({ color: COL_BELT_BUCKLE });
  // Pouch on belt
  g.roundRect(x + tw - 4, top + h - 4, 3, 3, 0.5).fill({ color: COL_POUCH });
}

function drawCloak(
  g: Graphics,
  cx: number,
  cloakTop: number,
  cloakH: number,
  wave: number,
  openAmount = 0, // 0=closed, 1=fully open (during attack)
): void {
  const cw = 14 + openAmount * 4;
  const x = cx - cw / 2;

  // Main cloak shape
  g.moveTo(x + 2, cloakTop)
    .lineTo(x + cw - 2, cloakTop)
    .lineTo(x + cw + wave * 2 + openAmount * 3, cloakTop + cloakH)
    .lineTo(x + wave * 1.5 - openAmount * 3, cloakTop + cloakH)
    .closePath()
    .fill({ color: COL_CLOAK })
    .stroke({ color: COL_CLOAK_DK, width: 0.5 });

  // Inner folds
  const midY = cloakTop + cloakH * 0.5;
  g.moveTo(x + 4, cloakTop + 2)
    .lineTo(x + 3 + wave * 0.5, midY)
    .stroke({ color: COL_CLOAK_HI, width: 0.3, alpha: 0.3 });
  g.moveTo(x + cw - 4, cloakTop + 2)
    .lineTo(x + cw - 3 + wave, midY)
    .stroke({ color: COL_CLOAK_HI, width: 0.3, alpha: 0.3 });

  // Bottom hem detail
  g.moveTo(x + wave - openAmount * 3, cloakTop + cloakH)
    .lineTo(x + cw + wave * 2 + openAmount * 3, cloakTop + cloakH)
    .stroke({ color: COL_CLOAK_DK, width: 0.8 });
}

function drawHood(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 12;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Hood dome — pointed at top
  g.moveTo(x + 2, top + hh)
    .lineTo(x, top + hh * 0.4)
    .lineTo(x + hw * 0.35, top)
    .lineTo(x + hw * 0.65, top)
    .lineTo(x + hw, top + hh * 0.4)
    .lineTo(x + hw - 2, top + hh)
    .closePath()
    .fill({ color: COL_HOOD })
    .stroke({ color: COL_CLOAK_DK, width: 0.5 });

  // Hood inner shadow (face opening)
  g.roundRect(x + 2, top + hh * 0.35, hw - 4, hh * 0.55, 1).fill({
    color: COL_HOOD_INNER,
  });

  // Visible lower face
  g.roundRect(x + 3, top + hh * 0.5, hw - 6, hh * 0.3, 1).fill({
    color: COL_SKIN,
  });

  // Eyes — sharp, intense
  const eyeY = top + hh * 0.5;
  g.rect(cx - 2.5 + tilt, eyeY, 2, 1.2).fill({ color: COL_EYE });
  g.rect(cx + 0.5 + tilt, eyeY, 2, 1.2).fill({ color: COL_EYE });
  // Pupil dots
  g.circle(cx - 1.5 + tilt, eyeY + 0.6, 0.4).fill({ color: COL_SHADOW });
  g.circle(cx + 1.5 + tilt, eyeY + 0.6, 0.4).fill({ color: COL_SHADOW });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Sleeve
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_CLOAK, width: 3.5 });
  // Bracer on forearm
  const mx = lerp(sx, ex, 0.6);
  const my = lerp(sy, ey, 0.6);
  g.circle(mx, my, 2.2).fill({ color: COL_BRACER });
  g.circle(mx, my, 1).fill({ color: COL_BRACER_BUCKLE, alpha: 0.5 });
  // Hand (fingerless glove)
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

function drawSword(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 15,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;

  // Blade
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_SWORD, width: 2 });
  // Edge highlight
  g.moveTo(bx + cos * 0.4, by + sin * 0.4)
    .lineTo(tipX + cos * 0.4, tipY + sin * 0.4)
    .stroke({ color: COL_SWORD_HI, width: 0.6, alpha: 0.7 });
  // Tip accent
  g.circle(tipX, tipY, 0.6).fill({ color: COL_SWORD_HI });

  // Crossguard — angular
  const cx1 = bx + cos * 3;
  const cy1 = by + sin * 3;
  const cx2 = bx - cos * 3;
  const cy2 = by - sin * 3;
  g.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: COL_SWORD_GRD, width: 1.8 });

  // Leather-wrapped grip
  const gripX = bx - sin * 2;
  const gripY = by + cos * 2;
  g.moveTo(bx, by).lineTo(gripX, gripY).stroke({ color: COL_SWORD_WRAP, width: 2.5 });
}

function drawDagger(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 9,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;

  // Curved blade
  const midX = (bx + tipX) / 2 + cos * 1.5;
  const midY = (by + tipY) / 2 + sin * 1.5;
  g.moveTo(bx, by)
    .quadraticCurveTo(midX, midY, tipX, tipY)
    .stroke({ color: COL_DAGGER, width: 1.8 });
  // Highlight
  g.moveTo(bx + cos * 0.3, by + sin * 0.3)
    .quadraticCurveTo(midX + cos * 0.3, midY + sin * 0.3, tipX, tipY)
    .stroke({ color: COL_DAGGER_HI, width: 0.5, alpha: 0.6 });

  // Crossguard
  const cx1 = bx + cos * 2;
  const cy1 = by + sin * 2;
  const cx2 = bx - cos * 2;
  const cy2 = by - sin * 2;
  g.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: COL_DAGGER_GRD, width: 1.5 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;

  const legH = 7;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const hoodTop = torsoTop - 10;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.3;

  drawShadow(g, CX, GY);
  drawCloak(g, CX, torsoTop + 1, legH + torsoH - 1, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHood(g, CX, hoodTop);

  // Sword arm (right) — blade resting down at side
  const swordAngle = 0.15 + Math.sin(t * Math.PI * 2) * 0.03;
  const rHandX = CX + 9;
  const rHandY = torsoTop + torsoH - 1;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawSword(g, rHandX, rHandY, swordAngle, 14);

  // Dagger arm (left) — dagger held low, reverse grip
  const daggerAngle = Math.PI + 0.3;
  const lHandX = CX - 9;
  const lHandY = torsoTop + 7;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
  drawDagger(g, lHandX, lHandY, daggerAngle, 8);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.2;

  const legH = 7;
  const torsoH = 11;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const hoodTop = torsoTop - 10;

  const capeWave = -walk * 1.8;

  drawShadow(g, CX, GY, 11 + Math.abs(walk) * 2, 3);
  drawCloak(g, CX, torsoTop + 1, legH + torsoH - 1, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.3);
  drawHood(g, CX, hoodTop, walk * 0.3);

  // Arms swing with stride
  const armSwing = walk * 2;
  const rHandX = CX + 9 + armSwing * 0.5;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawSword(g, rHandX, rHandY, 0.2 + walk * 0.06, 14);

  const lHandX = CX - 9 - armSwing * 0.5;
  const lHandY = torsoTop + 7;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
  drawDagger(g, lHandX, lHandY, Math.PI + 0.3 - walk * 0.08, 8);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: 0=crouch 1-2=lunge 3-4=sword slash 5=dagger stab 6-7=recover
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const hoodTop = torsoTop - 10;

  // Lean into the attack
  const lean = t < 0.55 ? t * 3 : (1 - t) * 4;
  // Crouch slightly
  const crouch = t < 0.25 ? t * 2 : t < 0.7 ? 0.5 : (1 - t) * 1.5;

  // Cloak billows open during lunge
  const cloakOpen = t < 0.2 ? 0 : t < 0.7 ? (t - 0.2) * 2 : (1 - t) * 2.5;

  // Lunge foot
  const lunge = t > 0.2 && t < 0.8 ? 4 : 0;

  drawShadow(g, CX + lean, GY, 11 + lean, 3);
  drawCloak(g, CX + lean * 0.3, torsoTop + 1 + crouch, legH + torsoH - 1, -lean * 0.5, cloakOpen);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop + crouch, torsoH, lean);
  drawHood(g, CX, hoodTop + crouch, lean * 0.5);

  // Sword arc: start low, raise, slash across
  let swordAngle: number;
  if (t < 0.25) {
    swordAngle = lerp(0.2, -1.4, t / 0.25);
  } else if (t < 0.55) {
    swordAngle = lerp(-1.4, 1.3, (t - 0.25) / 0.3);
  } else {
    swordAngle = lerp(1.3, 0.3, (t - 0.55) / 0.45);
  }

  const swordReach = t < 0.55 ? t * 4 : (1 - t) * 6;
  const rHandX = CX + 8 + lean + swordReach;
  const rHandY = torsoTop + 3 + crouch;
  drawArm(g, CX + 6 + lean, torsoTop + 3 + crouch, rHandX, rHandY);
  drawSword(g, rHandX, rHandY, swordAngle, 15);

  // Dagger follow-up stab: comes in after sword
  let daggerAngle: number;
  if (t < 0.4) {
    daggerAngle = lerp(Math.PI + 0.3, Math.PI - 0.5, t / 0.4);
  } else if (t < 0.7) {
    daggerAngle = lerp(Math.PI - 0.5, 0.5, (t - 0.4) / 0.3); // stab forward
  } else {
    daggerAngle = lerp(0.5, Math.PI + 0.3, (t - 0.7) / 0.3);
  }

  const daggerReach = t > 0.35 && t < 0.75 ? (t - 0.35) * 5 : 0;
  const lHandX = CX - 7 + lean * 0.5 + daggerReach * 2;
  const lHandY = torsoTop + 5 + crouch;
  drawArm(g, CX - 6 + lean, torsoTop + 3 + crouch, lHandX, lHandY);
  drawDagger(g, lHandX, lHandY, daggerAngle, 9);

  // Slash trails
  if (t >= 0.3 && t <= 0.55) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.42) / 0.13);
    g.moveTo(rHandX, rHandY - 10)
      .bezierCurveTo(rHandX + 8, rHandY - 4, rHandX + 10, rHandY + 3, rHandX + 5, rHandY + 10)
      .stroke({ color: 0xffffff, width: 1.2, alpha: trailAlpha * 0.5 });
  }
  // Dagger stab trail
  if (t >= 0.5 && t <= 0.72) {
    const stabAlpha = clamp01(1 - Math.abs(t - 0.62) / 0.1);
    g.moveTo(lHandX + 4, lHandY - 2)
      .lineTo(lHandX + 10, lHandY)
      .stroke({ color: 0xffffff, width: 1, alpha: stabAlpha * 0.4 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: conjure shadow/poison aura, eyes glow red
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const hoodTop = torsoTop - 10;

  // Dark aura particles swirling around
  for (let i = 0; i < 6; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI / 3);
    const dist = 8 + intensity * 8 + i * 2;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop - 2 + Math.sin(angle) * dist * 0.4;
    const pAlpha = clamp01(0.15 + pulse * 0.2 - i * 0.02);
    g.circle(px, py, 1.5 - i * 0.1).fill({ color: COL_POISON, alpha: pAlpha });
  }

  drawShadow(g, CX, GY, 11, 3, 0.3 + intensity * 0.2);
  drawCloak(g, CX, torsoTop + 1, legH + torsoH - 1, pulse * 0.4 - 0.2);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);

  // Hood with glowing eyes
  const hw = 12;
  const hh = 10;
  const hx = CX - hw / 2;

  g.moveTo(hx + 2, hoodTop + hh)
    .lineTo(hx, hoodTop + hh * 0.4)
    .lineTo(hx + hw * 0.35, hoodTop)
    .lineTo(hx + hw * 0.65, hoodTop)
    .lineTo(hx + hw, hoodTop + hh * 0.4)
    .lineTo(hx + hw - 2, hoodTop + hh)
    .closePath()
    .fill({ color: COL_HOOD });

  g.roundRect(hx + 2, hoodTop + hh * 0.35, hw - 4, hh * 0.55, 1).fill({
    color: COL_HOOD_INNER,
  });

  // Glowing red eyes
  const eyeGlow = 0.4 + intensity * 0.6;
  const eyeY = hoodTop + hh * 0.5;
  g.circle(CX - 1.8, eyeY + 0.5, 1.5).fill({ color: COL_EYE_GLOW, alpha: eyeGlow });
  g.circle(CX + 1.8, eyeY + 0.5, 1.5).fill({ color: COL_EYE_GLOW, alpha: eyeGlow });
  // Eye glow halo
  g.circle(CX - 1.8, eyeY + 0.5, 3).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });
  g.circle(CX + 1.8, eyeY + 0.5, 3).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });

  // Arms raised slightly — channeling
  const raise = intensity * 3;
  drawArm(g, CX + 6, torsoTop + 3, CX + 10, torsoTop + 4 - raise);
  drawArm(g, CX - 6, torsoTop + 3, CX - 10, torsoTop + 4 - raise);

  // Weapons held out to sides
  drawSword(g, CX + 10, torsoTop + 4 - raise, 0.4 + pulse * 0.1, 14);
  drawDagger(g, CX - 10, torsoTop + 4 - raise, Math.PI - 0.4 - pulse * 0.1, 8);

  // Poison drip from dagger
  if (intensity > 0.3) {
    for (let i = 0; i < 3; i++) {
      const dy = i * 4 + t * 8;
      const dAlpha = clamp01(intensity - i * 0.2) * 0.5;
      g.circle(CX - 10, torsoTop + 4 - raise + dy, 0.8).fill({
        color: COL_POISON,
        alpha: dAlpha,
      });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: 0=hit  1-2=stagger back  3-4=knees  5-7=collapse
  const t = frame / 7;

  const legH = 7;
  const torsoH = 11;
  const legTop = GY - 5 - legH;

  const fallX = t * 10;
  const dropY = t * t * 10;
  const fallAngle = t * 0.8;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const hoodTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.4, GY, 11 + t * 3, 3, 0.3 * (1 - t * 0.5));

  // Cloak crumples
  if (t < 0.85) {
    drawCloak(
      g,
      CX + fallX * 0.2,
      torsoTop + 1,
      (legH + torsoH - 1) * (1 - t * 0.3),
      t * 2.5,
      t * 0.5,
    );
  }

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.15, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.15,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
      -t,
    );
  }

  // Torso tilts
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 3.5,
  );
  drawHood(g, CX + fallX * 0.4, hoodTop + dropY * 0.4, fallAngle * 4);

  // Sword flies away
  if (t < 0.75) {
    const sdx = CX + 12 + t * 12;
    const sdy = torsoTop + torsoH * 0.5 + t * 6;
    drawSword(g, sdx, sdy, 0.3 + t * 3, 14 * (1 - t * 0.3));
  }

  // Dagger drops
  if (t < 0.6) {
    const ddx = CX - 10 + fallX * 0.2;
    const ddy = torsoTop + 6 + dropY * 0.5;
    drawDagger(g, ddx, ddy, Math.PI + 0.3 + t * 2, 8 * (1 - t * 0.3));
  }

  // Arm flopped in late frames
  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 4,
      torsoTop + 4,
      CX + fallX * 0.4 + 10,
      torsoTop + torsoH - 2,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all assassin sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateAssassinFrames(renderer: Renderer): RenderTexture[] {
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
