// Procedural sprite generator for the Berserker unit type.
//
// Draws a bare-chested raging warrior at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Muscular bare torso with war paint / tribal tattoos
//   • Wild mane of hair with iron headband
//   • Massive two-handed great axe
//   • Fur-trimmed leather belt and loincloth
//   • Leather trousers with fur wraps at calves
//   • Heavy fur-lined boots
//   • Scars across chest
//   • Rage aura (red/orange glow) during cast

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — flesh, fur, iron
const COL_SKIN = 0xc49060; // sun-darkened skin
const COL_SKIN_HI = 0xd8a878;
const COL_SKIN_DK = 0xa07048;
const COL_SKIN_SHADOW = 0x885838;

const COL_HAIR = 0x553322; // wild dark hair
const COL_HAIR_HI = 0x6e4430;

const COL_HEADBAND = 0x667788; // iron band
const COL_HEADBAND_HI = 0x8899aa;

const COL_WARPAINT = 0x222288; // blue woad paint
const COL_SCAR = 0xcc8888; // scar tissue

const COL_TROUSERS = 0x4a3a28; // leather
const COL_TROUSERS_DK = 0x382a1e;

const COL_FUR = 0x8a7a62; // fur trim
const COL_FUR_DK = 0x6a5a42;
const COL_FUR_HI = 0xa89a7e;

const COL_BELT = 0x3e2e1e;
const COL_BELT_BUCKLE = 0x888078;

const COL_BOOT = 0x4a3828;
const COL_BOOT_DK = 0x382818;
const COL_BOOT_FUR = 0x8a7a62;

const COL_AXE_BLADE = 0x8494a4; // heavy steel head
const COL_AXE_BLADE_HI = 0xb0c0d0;
const COL_AXE_BLADE_DK = 0x5a6a7a;
const COL_AXE_HANDLE = 0x5a3818; // thick oak
const COL_AXE_HANDLE_DK = 0x3a2810;
const COL_AXE_WRAP = 0x4a3420; // leather grip wrap
const COL_AXE_BAND = 0x667788; // iron bands on handle

const COL_RAGE = 0xff4422; // rage aura
const COL_RAGE_CORE = 0xffaa44;

const COL_SHADOW = 0x000000;

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
  w = 14,
  h = 4,
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
  // Fur trim at top of boot
  g.ellipse(cx - 4.5 + stanceL, gy - bh, 3.5, 1.5).fill({ color: COL_BOOT_FUR });

  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.ellipse(cx + 4.5 + stanceR, gy - bh, 3.5, 1.5).fill({ color: COL_BOOT_FUR });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Leather trousers
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_TROUSERS });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_TROUSERS });
  // Seam detail
  g.moveTo(cx - 3 + stanceL, legTop)
    .lineTo(cx - 3 + stanceL, legTop + legH)
    .stroke({ color: COL_TROUSERS_DK, width: 0.3, alpha: 0.4 });
  g.moveTo(cx + 3 + stanceR, legTop)
    .lineTo(cx + 3 + stanceR, legTop + legH)
    .stroke({ color: COL_TROUSERS_DK, width: 0.3, alpha: 0.4 });

  // Fur wraps at calves
  g.ellipse(cx - 3 + stanceL, legTop + legH - 2, 3, 1.5).fill({ color: COL_FUR });
  g.ellipse(cx + 3 + stanceR, legTop + legH - 2, 3, 1.5).fill({ color: COL_FUR });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 15; // wider — muscular build
  const x = cx - tw / 2 + tilt;

  // Bare muscular torso
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.5 });

  // Pectoral definition
  g.ellipse(cx - 2 + tilt, top + 3, 3.5, 2).fill({ color: COL_SKIN_HI, alpha: 0.3 });
  g.ellipse(cx + 2 + tilt, top + 3, 3.5, 2).fill({ color: COL_SKIN_HI, alpha: 0.3 });
  // Pec shadow line
  g.moveTo(x + 2, top + 4)
    .lineTo(x + tw - 2, top + 4)
    .stroke({ color: COL_SKIN_DK, width: 0.3, alpha: 0.4 });

  // Abs
  for (let row = 5; row < h - 3; row += 2.5) {
    g.moveTo(cx - 2 + tilt, top + row)
      .lineTo(cx + 2 + tilt, top + row)
      .stroke({ color: COL_SKIN_SHADOW, width: 0.3, alpha: 0.35 });
  }

  // Blue war paint — diagonal stripe across chest
  g.moveTo(x + 2, top + 2)
    .lineTo(x + tw - 4, top + h - 4)
    .stroke({ color: COL_WARPAINT, width: 1.5, alpha: 0.5 });
  g.moveTo(x + 4, top + 2)
    .lineTo(x + tw - 2, top + h - 4)
    .stroke({ color: COL_WARPAINT, width: 1, alpha: 0.35 });

  // Scar across chest
  g.moveTo(x + 3, top + 3)
    .lineTo(x + tw - 5, top + 6)
    .stroke({ color: COL_SCAR, width: 0.6, alpha: 0.5 });

  // Fur-trimmed belt
  g.rect(x + 1, top + h - 3, tw - 2, 2.5).fill({ color: COL_BELT });
  // Fur on belt
  g.ellipse(cx + tilt, top + h - 3, tw * 0.35, 1.5).fill({ color: COL_FUR });
  // Buckle
  g.circle(cx + tilt, top + h - 1.8, 1.3).fill({ color: COL_BELT_BUCKLE });

  // Fur shoulder piece (left) — asymmetric
  g.ellipse(x - 1, top + 1, 4, 3)
    .fill({ color: COL_FUR })
    .stroke({ color: COL_FUR_DK, width: 0.3 });
  // Fur tuft highlights
  g.moveTo(x - 3, top)
    .lineTo(x - 1, top + 3)
    .stroke({ color: COL_FUR_HI, width: 0.5, alpha: 0.4 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 11;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Wild mane of hair behind head
  g.ellipse(cx + tilt, top + 2, hw * 0.65, hh * 0.55)
    .fill({ color: COL_HAIR });
  // Hair tufts sticking up
  g.moveTo(cx - 3 + tilt, top + 1)
    .lineTo(cx - 4 + tilt, top - 3)
    .lineTo(cx - 1 + tilt, top)
    .closePath()
    .fill({ color: COL_HAIR });
  g.moveTo(cx + 1 + tilt, top)
    .lineTo(cx + 2 + tilt, top - 4)
    .lineTo(cx + 4 + tilt, top + 1)
    .closePath()
    .fill({ color: COL_HAIR });
  g.moveTo(cx - 1 + tilt, top)
    .lineTo(cx + tilt, top - 2)
    .lineTo(cx + 1 + tilt, top)
    .closePath()
    .fill({ color: COL_HAIR_HI });

  // Face
  g.roundRect(x + 1, top + 2, hw - 2, hh - 3, 2).fill({ color: COL_SKIN });
  // Jaw shadow
  g.roundRect(x + 2, top + hh - 4, hw - 4, 2, 1).fill({ color: COL_SKIN_DK, alpha: 0.3 });

  // Iron headband
  g.rect(x, top + 2, hw, 2).fill({ color: COL_HEADBAND });
  g.rect(x + 1, top + 2, hw - 2, 0.8).fill({ color: COL_HEADBAND_HI, alpha: 0.4 });

  // Fierce eyes
  g.rect(cx - 2.5 + tilt, top + 4.5, 2, 1.5).fill({ color: 0xffffff });
  g.rect(cx + 0.5 + tilt, top + 4.5, 2, 1.5).fill({ color: 0xffffff });
  g.circle(cx - 1.5 + tilt, top + 5.2, 0.5).fill({ color: 0x332211 });
  g.circle(cx + 1.5 + tilt, top + 5.2, 0.5).fill({ color: 0x332211 });
  // Angry brow
  g.moveTo(cx - 3 + tilt, top + 4)
    .lineTo(cx - 0.5 + tilt, top + 4.5)
    .stroke({ color: COL_SKIN_DK, width: 0.6 });
  g.moveTo(cx + 3 + tilt, top + 4)
    .lineTo(cx + 0.5 + tilt, top + 4.5)
    .stroke({ color: COL_SKIN_DK, width: 0.6 });

  // Beard stubble
  g.roundRect(cx - 2 + tilt, top + 7, 4, 2, 0.5).fill({ color: COL_HAIR, alpha: 0.3 });

  // War paint on face — stripe under eyes
  g.moveTo(cx - 3 + tilt, top + 5.5)
    .lineTo(cx - 1 + tilt, top + 6)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.4 });
  g.moveTo(cx + 1 + tilt, top + 6)
    .lineTo(cx + 3 + tilt, top + 5.5)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.4 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Muscular bare arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 4 });
  // Bicep bulge
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2.5).fill({ color: COL_SKIN_HI, alpha: 0.3 });
  // Forearm muscle definition
  g.moveTo(lerp(sx, ex, 0.4), lerp(sy, ey, 0.4))
    .lineTo(lerp(sx, ex, 0.7), lerp(sy, ey, 0.7))
    .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.3 });
  // Leather wrist wrap
  const wx = lerp(sx, ex, 0.8);
  const wy = lerp(sy, ey, 0.8);
  g.circle(wx, wy, 2.2).fill({ color: COL_BELT });
  // Knuckles
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });
}

function drawGreatAxe(
  g: Graphics,
  handleBaseX: number,
  handleBaseY: number,
  angle: number,
  handleLen = 22,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const headX = handleBaseX + sin * handleLen;
  const headY = handleBaseY - cos * handleLen;

  // Thick oak handle
  g.moveTo(handleBaseX, handleBaseY)
    .lineTo(headX, headY)
    .stroke({ color: COL_AXE_HANDLE, width: 3 });
  // Handle grain
  g.moveTo(handleBaseX + cos * 0.5, handleBaseY + sin * 0.5)
    .lineTo(headX + cos * 0.5, headY + sin * 0.5)
    .stroke({ color: COL_AXE_HANDLE_DK, width: 0.6 });

  // Iron bands on handle
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.2;
    const bx = lerp(handleBaseX, headX, t);
    const by = lerp(handleBaseY, headY, t);
    g.circle(bx, by, 2).fill({ color: COL_AXE_BAND });
  }

  // Leather wrap near grip
  const wrapStart = 0.05;
  const wrapEnd = 0.2;
  for (let t = wrapStart; t < wrapEnd; t += 0.04) {
    const wx = lerp(handleBaseX, headX, t);
    const wy = lerp(handleBaseY, headY, t);
    g.circle(wx, wy, 2).fill({ color: COL_AXE_WRAP });
  }

  // DOUBLE-SIDED great axe head
  const bladeW = 8;
  const bladeH = 7;

  // Right blade
  const r1x = headX + cos * bladeW;
  const r1y = headY + sin * bladeW;
  const r2x = headX + cos * bladeW * 0.2 + sin * bladeH;
  const r2y = headY + sin * bladeW * 0.2 - cos * bladeH;
  const r3x = headX + cos * bladeW * 0.2 - sin * bladeH;
  const r3y = headY + sin * bladeW * 0.2 + cos * bladeH;

  g.moveTo(r2x, r2y)
    .lineTo(r1x, r1y)
    .lineTo(r3x, r3y)
    .lineTo(headX + cos * 0.5, headY + sin * 0.5)
    .closePath()
    .fill({ color: COL_AXE_BLADE })
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.5 });
  // Edge highlight
  g.moveTo(r2x, r2y)
    .lineTo(r1x, r1y)
    .lineTo(r3x, r3y)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.8, alpha: 0.6 });

  // Left blade (mirror)
  const l1x = headX - cos * bladeW;
  const l1y = headY - sin * bladeW;
  const l2x = headX - cos * bladeW * 0.2 + sin * bladeH;
  const l2y = headY - sin * bladeW * 0.2 - cos * bladeH;
  const l3x = headX - cos * bladeW * 0.2 - sin * bladeH;
  const l3y = headY - sin * bladeW * 0.2 + cos * bladeH;

  g.moveTo(l2x, l2y)
    .lineTo(l1x, l1y)
    .lineTo(l3x, l3y)
    .lineTo(headX - cos * 0.5, headY - sin * 0.5)
    .closePath()
    .fill({ color: COL_AXE_BLADE_DK })
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.5 });
  // Left edge highlight
  g.moveTo(l2x, l2y)
    .lineTo(l1x, l1y)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.6, alpha: 0.4 });
}

function drawRageAura(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
): void {
  g.circle(cx, cy, radius).fill({
    color: COL_RAGE,
    alpha: 0.06 + intensity * 0.1,
  });
  g.circle(cx, cy, radius * 0.6).fill({
    color: COL_RAGE,
    alpha: 0.08 + intensity * 0.12,
  });
  g.circle(cx, cy, radius * 0.3).fill({
    color: COL_RAGE_CORE,
    alpha: 0.1 + intensity * 0.12,
  });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;
  // Heavy breathing — chest heave
  const heave = Math.sin(t * Math.PI * 2) * 0.4;

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop + heave, torsoH);
  drawHead(g, CX, headTop);

  // Both arms holding great axe — resting on shoulder
  const axeAngle = 0.25 + Math.sin(t * Math.PI * 2) * 0.03;
  const rHandX = CX + 8;
  const rHandY = torsoTop + torsoH - 3;
  const lHandX = CX + 4;
  const lHandY = torsoTop + torsoH - 5;
  drawArm(g, CX + 7, torsoTop + 4, rHandX, rHandY);
  drawArm(g, CX - 6, torsoTop + 4, lHandX, lHandY);
  drawGreatAxe(g, rHandX, rHandY, axeAngle, 20);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 2; // heavy stomping gait

  const legH = 8;
  const torsoH = 13;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY, 14 + Math.abs(walk) * 2, 4);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.5);
  drawHead(g, CX, headTop, walk * 0.5);

  // Axe held across body while moving
  const armSwing = walk * 1.5;
  const rHandX = CX + 8 + armSwing;
  const rHandY = torsoTop + torsoH - 3;
  const lHandX = CX + 3 + armSwing * 0.5;
  const lHandY = torsoTop + torsoH - 5;
  drawArm(g, CX + 7, torsoTop + 4, rHandX, rHandY);
  drawArm(g, CX - 6, torsoTop + 4, lHandX, lHandY);
  drawGreatAxe(g, rHandX, rHandY, 0.3 + walk * 0.08, 20);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: 0-1=roar+windup  2-3=raise high  4=apex  5-6=brutal smash  7=recover
  const phases = [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Heavy lean into smash
  const lean = t < 0.5 ? t * 3 : (1 - t) * 6;

  // Great axe arc: rest → high behind head → devastating smash → recover
  let axeAngle: number;
  if (t < 0.2) {
    axeAngle = lerp(0.3, -1.5, t / 0.2);
  } else if (t < 0.5) {
    axeAngle = lerp(-1.5, -2.8, (t - 0.2) / 0.3);
  } else if (t < 0.82) {
    axeAngle = lerp(-2.8, 1.5, (t - 0.5) / 0.32);
  } else {
    axeAngle = lerp(1.5, 0.3, (t - 0.82) / 0.18);
  }

  const armReach = t < 0.5 ? t * 4 : (1 - t) * 8;
  const lunge = t > 0.25 && t < 0.85 ? 5 : 0; // big lunge

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawBoots(g, CX, GY, -2, lunge);
  drawLegs(g, CX, legTop, legH, -2, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.6);

  // Both arms swing the great axe
  const rHandX = CX + 7 + lean + armReach;
  const rHandY = torsoTop + 2;
  const lHandX = rHandX - 4;
  const lHandY = rHandY + 3;
  drawArm(g, CX + 7 + lean, torsoTop + 4, rHandX, rHandY);
  drawArm(g, CX - 6 + lean, torsoTop + 4, lHandX, lHandY);
  drawGreatAxe(g, rHandX, rHandY, axeAngle, 22);

  // Massive impact shockwave at peak of downswing
  if (t >= 0.58 && t <= 0.8) {
    const impactAlpha = clamp01(1 - Math.abs(t - 0.7) / 0.12);
    const impX = rHandX + Math.sin(axeAngle) * 22;
    const impY = rHandY - Math.cos(axeAngle) * 22;
    // Shockwave ring
    g.circle(impX, impY, 8).fill({ color: 0xffffff, alpha: impactAlpha * 0.3 });
    g.circle(impX, impY, 5).fill({ color: 0xffddaa, alpha: impactAlpha * 0.25 });
    // Spark particles
    for (let i = 0; i < 4; i++) {
      const sa = (i / 4) * Math.PI * 2 + t * 5;
      const sd = 5 + i * 2;
      g.circle(impX + Math.cos(sa) * sd, impY + Math.sin(sa) * sd, 1)
        .fill({ color: 0xffffff, alpha: impactAlpha * 0.4 });
    }
  }

  // Brutal swing trail — thicker than other units
  if (t >= 0.42 && t <= 0.72) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.57) / 0.15);
    g.moveTo(rHandX + 2, rHandY - 16)
      .bezierCurveTo(
        rHandX + 14,
        rHandY - 8,
        rHandX + 16,
        rHandY + 8,
        rHandX + 10,
        rHandY + 16,
      )
      .stroke({ color: 0xff6633, width: 2.5, alpha: trailAlpha * 0.45 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: berserker rage — screams, red aura explodes outward
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Rage aura
  const auraR = 10 + intensity * 8 + pulse * 4;
  drawRageAura(g, CX, torsoTop + torsoH * 0.3, auraR, intensity);

  drawShadow(g, CX, GY, 14, 4, 0.3 + intensity * 0.15);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Arms raised to sides — rage pose
  const raise = intensity * 4;
  const spread = intensity * 3;
  drawArm(g, CX + 7, torsoTop + 4, CX + 10 + spread, torsoTop + 2 - raise);
  drawArm(g, CX - 6, torsoTop + 4, CX - 9 - spread, torsoTop + 2 - raise);

  // Axe held in right hand, raised
  drawGreatAxe(g, CX + 10 + spread, torsoTop + 2 - raise, -0.6 + pulse * 0.1, 20);

  // Rage veins/energy lines on torso
  if (intensity > 0.3) {
    const veinsAlpha = clamp01(intensity - 0.3) * 0.4;
    g.moveTo(CX - 3, torsoTop + 3)
      .lineTo(CX - 5, torsoTop + 7)
      .stroke({ color: COL_RAGE, width: 0.6, alpha: veinsAlpha });
    g.moveTo(CX + 3, torsoTop + 3)
      .lineTo(CX + 5, torsoTop + 7)
      .stroke({ color: COL_RAGE, width: 0.6, alpha: veinsAlpha });
    g.moveTo(CX, torsoTop + 4)
      .lineTo(CX, torsoTop + 9)
      .stroke({ color: COL_RAGE, width: 0.5, alpha: veinsAlpha * 0.8 });
  }

  // Rage scream lines from mouth
  if (intensity > 0.4) {
    for (let i = 0; i < 4; i++) {
      const angle = -0.6 + i * 0.4;
      const lineLen = 3 + pulse * 2.5;
      const startR = 6;
      const sx = CX + Math.cos(angle) * startR;
      const sy = headTop + 6 + Math.sin(angle) * startR * 0.3;
      const ex = CX + Math.cos(angle) * (startR + lineLen);
      const ey = headTop + 6 + Math.sin(angle) * (startR + lineLen) * 0.3;
      g.moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({
          color: COL_RAGE,
          width: 0.7,
          alpha: clamp01(intensity - 0.4) * 0.5,
        });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: 0=hit  1-2=stagger  3-4=knees buckle  5-7=collapse
  const t = frame / 7;

  const legH = 8;
  const torsoH = 13;
  const legTop = GY - 5 - legH;

  const fallX = t * 11;
  const dropY = t * t * 10;
  const fallAngle = t * 1.1;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.4, GY, 14 + t * 4, 4, 0.3 * (1 - t * 0.4));

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

  // Torso falls
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 3.5,
  );
  drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.4, fallAngle * 4);

  // Great axe tumbles away dramatically
  if (t < 0.8) {
    const adx = CX + 13 + t * 11;
    const ady = torsoTop + torsoH * 0.4 + t * 8;
    drawGreatAxe(g, adx, ady, 0.5 + t * 3, 20 * (1 - t * 0.3));
  }

  // Arms flopped
  if (t > 0.45) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 4,
      CX + fallX * 0.4 + 11,
      torsoTop + torsoH - 2,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

/**
 * Generate all berserker sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[], ready to be
 * injected into the AnimationManager cache.
 */
export function generateBerserkerFrames(
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
