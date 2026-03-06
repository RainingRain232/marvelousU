// Procedural sprite generator for the Bladedancer unit type.
//
// Draws an elven dual-wielder at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Pale green/silver fitted clothing with leaf motifs
//   • Flowing green hair past shoulders
//   • Lithe, slender elven build
//   • Two curved moonblades with silver-blue glow
//   • Graceful spinning movement animation
//   • Twin blade slash attack pattern
//   • Green/silver color scheme throughout

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — elven green & silver
const COL_SKIN = 0xe0d0c0; // pale elven skin
const COL_SKIN_DK = 0xc8b8a8;

const COL_CLOTH = 0x5a7a5a; // pale green tunic
const COL_CLOTH_DK = 0x3e5e3e;

const COL_SILVER_TRIM = 0xb0c0b8; // silver accents
const COL_SILVER_HI = 0xd0e0d8;

const COL_HAIR = 0x3a8a4a; // flowing green hair
const COL_HAIR_HI = 0x5aaa6a;
const COL_HAIR_DK = 0x2a6a3a;

const COL_BLADE = 0x8ab8d4; // moonblade silver-blue
const COL_BLADE_HI = 0xb0d8f0;
const COL_BLADE_GLOW = 0x6090c0; // blue glow
const COL_BLADE_GUARD = 0x708878;
const COL_BLADE_GRIP = 0x3a4a3e;

const COL_BOOT = 0x4a5a4a;
const COL_BOOT_DK = 0x3a4a3a;

const COL_SASH = 0x3e6e4e; // waist sash
const COL_SASH_HI = 0x5e8e6e;

const COL_EYE = 0x44cc88; // bright green eyes
const COL_EAR = 0xe0d0c0;

const COL_SHADOW = 0x000000;

const COL_TRAIL = 0x88ccff; // blade trail glow

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
  w = 9,
  h = 2.5,
  alpha = 0.25,
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
  const bw = 4;
  const bh = 4 - squash;
  // Slender elven boots
  g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  // Silver trim on boots
  g.rect(cx - 6 + stanceL, gy - bh, bw, 0.8).fill({ color: COL_SILVER_TRIM, alpha: 0.5 });
  g.rect(cx + 2 + stanceR, gy - bh, bw, 0.8).fill({ color: COL_SILVER_TRIM, alpha: 0.5 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Slim fitted leggings
  g.rect(cx - 5 + stanceL, legTop, 3, legH).fill({ color: COL_CLOTH_DK });
  g.rect(cx + 2 + stanceR, legTop, 3, legH).fill({ color: COL_CLOTH_DK });
  // Side silver seam
  g.moveTo(cx - 5 + stanceL, legTop)
    .lineTo(cx - 5 + stanceL, legTop + legH)
    .stroke({ color: COL_SILVER_TRIM, width: 0.3, alpha: 0.4 });
  g.moveTo(cx + 5 + stanceR, legTop)
    .lineTo(cx + 5 + stanceR, legTop + legH)
    .stroke({ color: COL_SILVER_TRIM, width: 0.3, alpha: 0.4 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 10; // slender build
  const x = cx - tw / 2 + tilt;
  // Fitted tunic
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_CLOTH })
    .stroke({ color: COL_CLOTH_DK, width: 0.4 });
  // Silver trim V-neck
  g.moveTo(cx + tilt - 2, top)
    .lineTo(cx + tilt, top + 3)
    .lineTo(cx + tilt + 2, top)
    .stroke({ color: COL_SILVER_TRIM, width: 0.6 });
  // Leaf motif on chest
  g.moveTo(cx + tilt, top + 4)
    .quadraticCurveTo(cx + tilt + 2, top + 5, cx + tilt, top + 7)
    .stroke({ color: COL_SILVER_HI, width: 0.4, alpha: 0.5 });
  g.moveTo(cx + tilt, top + 4)
    .quadraticCurveTo(cx + tilt - 2, top + 5, cx + tilt, top + 7)
    .stroke({ color: COL_SILVER_HI, width: 0.4, alpha: 0.5 });
  // Sash at waist
  g.rect(x, top + h - 2, tw, 2).fill({ color: COL_SASH });
  // Sash knot
  g.circle(cx + tilt + 3, top + h - 1, 1).fill({ color: COL_SASH_HI });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 8;
  const hh = 8;
  const x = cx - hw / 2 + tilt;
  // Face — slender elven features
  g.roundRect(x + 1, top + 2, hw - 2, hh - 2, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });
  // Pointed ears
  g.moveTo(x, top + hh * 0.35)
    .lineTo(x - 3, top + hh * 0.15)
    .lineTo(x + 1, top + hh * 0.45)
    .closePath()
    .fill({ color: COL_EAR });
  g.moveTo(x + hw, top + hh * 0.35)
    .lineTo(x + hw + 3, top + hh * 0.15)
    .lineTo(x + hw - 1, top + hh * 0.45)
    .closePath()
    .fill({ color: COL_EAR });
  // Almond eyes
  const eyeY = top + hh * 0.4;
  g.ellipse(cx - 1.8 + tilt, eyeY, 1.2, 0.7).fill({ color: COL_EYE });
  g.ellipse(cx + 1.8 + tilt, eyeY, 1.2, 0.7).fill({ color: COL_EYE });
  // Pupils
  g.circle(cx - 1.8 + tilt, eyeY, 0.35).fill({ color: COL_SHADOW });
  g.circle(cx + 1.8 + tilt, eyeY, 0.35).fill({ color: COL_SHADOW });
  // Thin brows
  g.moveTo(cx - 3 + tilt, eyeY - 1.5)
    .lineTo(cx - 0.5 + tilt, eyeY - 1.8)
    .stroke({ color: COL_HAIR_DK, width: 0.4 });
  g.moveTo(cx + 3 + tilt, eyeY - 1.5)
    .lineTo(cx + 0.5 + tilt, eyeY - 1.8)
    .stroke({ color: COL_HAIR_DK, width: 0.4 });
  // Mouth
  g.moveTo(cx - 1 + tilt, top + hh * 0.7)
    .lineTo(cx + 1 + tilt, top + hh * 0.7)
    .stroke({ color: COL_SKIN_DK, width: 0.3 });
}

function drawHair(
  g: Graphics,
  cx: number,
  top: number,
  wave: number,
  tilt = 0,
): void {
  const hw = 10;
  const x = cx - hw / 2 + tilt;
  // Top hair volume
  g.roundRect(x, top, hw, 5, 2).fill({ color: COL_HAIR });
  // Hair highlight
  g.roundRect(x + 2, top + 1, 4, 2, 1).fill({ color: COL_HAIR_HI, alpha: 0.3 });
  // Flowing strands down back
  for (let i = 0; i < 5; i++) {
    const sx = x + 1 + i * 2;
    const ew = wave * (i % 2 === 0 ? 1 : -1) * 1.5;
    g.moveTo(sx, top + 3)
      .quadraticCurveTo(sx + ew, top + 10, sx + ew * 1.5, top + 16)
      .stroke({ color: i % 2 === 0 ? COL_HAIR : COL_HAIR_DK, width: 1.2 });
  }
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_CLOTH, width: 2.5 });
  // Silver bracelet
  const mx = lerp(sx, ex, 0.65);
  const my = lerp(sy, ey, 0.65);
  g.circle(mx, my, 1.5).fill({ color: COL_SILVER_TRIM, alpha: 0.6 });
  // Hand
  g.circle(ex, ey, 1.4).fill({ color: COL_SKIN });
}

function drawMoonblade(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 12,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;
  // Curved blade
  const midX = (bx + tipX) / 2 + cos * 2.5;
  const midY = (by + tipY) / 2 + sin * 2.5;
  g.moveTo(bx, by)
    .quadraticCurveTo(midX, midY, tipX, tipY)
    .stroke({ color: COL_BLADE, width: 2 });
  // Highlight edge
  g.moveTo(bx + cos * 0.5, by + sin * 0.5)
    .quadraticCurveTo(midX + cos * 0.5, midY + sin * 0.5, tipX, tipY)
    .stroke({ color: COL_BLADE_HI, width: 0.6, alpha: 0.8 });
  // Blue glow aura
  g.moveTo(bx, by)
    .quadraticCurveTo(midX, midY, tipX, tipY)
    .stroke({ color: COL_BLADE_GLOW, width: 4, alpha: 0.12 });
  // Crescent guard
  g.moveTo(bx + cos * 2.5, by + sin * 2.5)
    .quadraticCurveTo(bx + cos * 1, by + sin * 1 - 1, bx - cos * 2.5, by - sin * 2.5)
    .stroke({ color: COL_BLADE_GUARD, width: 1.2 });
  // Grip
  const gripX = bx - sin * 2.5;
  const gripY = by + cos * 2.5;
  g.moveTo(bx, by).lineTo(gripX, gripY).stroke({ color: COL_BLADE_GRIP, width: 2 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.3;

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 9;

  const hairWave = Math.sin(t * Math.PI * 2) * 0.5;

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawHair(g, CX, headTop, hairWave);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Right moonblade — held at side gracefully
  const rAngle = 0.2 + sway * 0.08;
  const rHandX = CX + 8;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawMoonblade(g, rHandX, rHandY, rAngle, 11);

  // Left moonblade — held slightly raised
  const lAngle = -0.15 - sway * 0.08;
  const lHandX = CX - 8;
  const lHandY = torsoTop + torsoH - 3;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
  drawMoonblade(g, lHandX, lHandY, lAngle, 11);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.0;

  const legH = 8;
  const torsoH = 10;
  const stanceL = Math.round(stride * 3.5);
  const stanceR = Math.round(-stride * 3.5);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 9;

  // Graceful spin — slight rotation in body
  const spin = Math.sin(t * Math.PI * 4) * 0.8;
  const hairWave = -stride * 2;

  drawShadow(g, CX, GY, 9 + Math.abs(stride) * 1.5, 2.5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawHair(g, CX, headTop, hairWave);
  drawTorso(g, CX, torsoTop, torsoH, spin * 0.4);
  drawHead(g, CX, headTop, spin * 0.3);

  // Blades trail behind movement
  const armSwing = stride * 2;
  const rHandX = CX + 8 + armSwing;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawMoonblade(g, rHandX, rHandY, 0.2 + stride * 0.1, 11);

  const lHandX = CX - 8 - armSwing;
  const lHandY = torsoTop + torsoH - 3;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
  drawMoonblade(g, lHandX, lHandY, -0.15 - stride * 0.1, 11);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Twin slash: 0-1=wind up 2-3=right slash 4-5=left slash 6-7=recover
  const phases = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Spin into attack
  const lean = t < 0.55 ? t * 2.5 : (1 - t) * 4;
  const lunge = t > 0.15 && t < 0.8 ? 3 : 0;

  drawShadow(g, CX + lean * 0.5, GY, 9 + lean, 2.5);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawHair(g, CX, headTop, -lean * 0.8);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.5);
  drawHead(g, CX, headTop, lean * 0.3);

  // Right blade — sweeping arc
  let rAngle: number;
  if (t < 0.25) {
    rAngle = lerp(0.2, -1.6, t / 0.25);
  } else if (t < 0.45) {
    rAngle = lerp(-1.6, 1.5, (t - 0.25) / 0.2);
  } else {
    rAngle = lerp(1.5, 0.2, (t - 0.45) / 0.55);
  }

  const rReach = t < 0.45 ? t * 4 : (1 - t) * 5;
  const rHandX = CX + 7 + lean + rReach;
  const rHandY = torsoTop + 3;
  drawArm(g, CX + 5 + lean, torsoTop + 3, rHandX, rHandY);
  drawMoonblade(g, rHandX, rHandY, rAngle, 12);

  // Left blade — delayed counter-slash
  let lAngle: number;
  if (t < 0.4) {
    lAngle = lerp(-0.15, -1.8, clamp01(t / 0.4));
  } else if (t < 0.65) {
    lAngle = lerp(-1.8, 1.4, (t - 0.4) / 0.25);
  } else {
    lAngle = lerp(1.4, -0.15, (t - 0.65) / 0.35);
  }

  const lReach = t > 0.3 && t < 0.7 ? (t - 0.3) * 4 : 0;
  const lHandX = CX - 6 + lean * 0.4 + lReach * 1.5;
  const lHandY = torsoTop + 4;
  drawArm(g, CX - 5 + lean, torsoTop + 3, lHandX, lHandY);
  drawMoonblade(g, lHandX, lHandY, lAngle, 12);

  // Right blade trail
  if (t >= 0.25 && t <= 0.5) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.35) / 0.12) * 0.4;
    g.moveTo(rHandX - 2, rHandY - 10)
      .bezierCurveTo(rHandX + 10, rHandY - 6, rHandX + 12, rHandY + 2, rHandX + 6, rHandY + 8)
      .stroke({ color: COL_TRAIL, width: 1.5, alpha: trailAlpha });
  }
  // Left blade trail
  if (t >= 0.45 && t <= 0.7) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.55) / 0.12) * 0.4;
    g.moveTo(lHandX + 2, lHandY - 10)
      .bezierCurveTo(lHandX + 10, lHandY - 4, lHandX + 12, lHandY + 4, lHandX + 4, lHandY + 10)
      .stroke({ color: COL_TRAIL, width: 1.5, alpha: trailAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Silver-green magical swirl
  for (let i = 0; i < 6; i++) {
    const angle = t * Math.PI * 4 + i * (Math.PI / 3);
    const dist = 5 + intensity * 8 + i * 1.5;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + 2 + Math.sin(angle) * dist * 0.4;
    const pAlpha = clamp01(0.15 + pulse * 0.25 - i * 0.02);
    g.circle(px, py, 1 + pulse * 0.4).fill({ color: COL_BLADE_GLOW, alpha: pAlpha });
  }

  // Blade glow ring
  const ringR = 3 + intensity * 12;
  g.circle(CX, torsoTop + 4, ringR).stroke({
    color: COL_SILVER_HI,
    width: 1,
    alpha: 0.2 + pulse * 0.15,
  });

  drawShadow(g, CX, GY, 9, 2.5, 0.25 + intensity * 0.15);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawHair(g, CX, headTop, pulse * 1.5);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Blades crossed above head — channeling
  const raise = intensity * 6;
  const crossAngle = 0.4 + pulse * 0.1;

  const rHandX = CX + 4;
  const rHandY = torsoTop - raise;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawMoonblade(g, rHandX, rHandY, crossAngle, 12);

  const lHandX = CX - 4;
  const lHandY = torsoTop - raise;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
  drawMoonblade(g, lHandX, lHandY, -crossAngle, 12);

  // Glow at blade crossing point
  const glowAlpha = 0.15 + intensity * 0.35 + pulse * 0.15;
  g.circle(CX, torsoTop - raise - 8, 3 + pulse * 2).fill({ color: COL_BLADE_GLOW, alpha: glowAlpha * 0.3 });
  g.circle(CX, torsoTop - raise - 8, 1.5 + pulse).fill({ color: COL_BLADE_HI, alpha: glowAlpha });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 4 - legH;

  const fallX = t * 9;
  const dropY = t * t * 9;
  const fallAngle = t * 0.7;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.3, GY, 9 + t * 3, 2.5, 0.25 * (1 - t * 0.5));

  // Hair flies loose
  if (t < 0.9) {
    drawHair(g, CX + fallX * 0.3, headTop + dropY * 0.3, t * 3);
  }

  const squash = Math.round(t * 2.5);
  drawBoots(g, CX + fallX * 0.1, GY, t * 2, -t * 0.5, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.4, legH - squash, t * 2, -t * 0.5);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.12), fallAngle * 3);
  if (t < 0.85) {
    drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.3, fallAngle * 3.5);
  }

  // Blades fly away
  if (t < 0.65) {
    const rbx = CX + 10 + t * 14;
    const rby = torsoTop + 2 + t * 5;
    drawMoonblade(g, rbx, rby, 0.3 + t * 4, 11 * (1 - t * 0.3));
  }

  if (t < 0.55) {
    const lbx = CX - 8 + fallX * 0.1;
    const lby = torsoTop + 4 + dropY * 0.6;
    drawMoonblade(g, lbx, lby, -0.3 - t * 3, 11 * (1 - t * 0.4));
  }

  // Arm flopped
  if (t > 0.45) {
    drawArm(
      g,
      CX + fallX * 0.4 + 3,
      torsoTop + 3,
      CX + fallX * 0.4 + 9,
      torsoTop + torsoH - 1,
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
 * Generate all Bladedancer sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBladedancerFrames(renderer: Renderer): RenderTexture[] {
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
