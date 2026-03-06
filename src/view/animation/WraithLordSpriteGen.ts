// Procedural sprite generator for the Wraith Lord unit type.
//
// Draws a powerful ghostly undead king at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Translucent blue-white spectral humanoid form
//   • Visible crown and spectral plate armor
//   • Phantom ice-blue sword with cold glow
//   • Tattered spectral cape billowing behind
//   • Skull face visible through translucent form, white glowing eyes
//   • Frost mist trailing from body
//   • Floats above ground — lower half fades to mist

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 5; // float height — feet never fully touch ground

// Palette — ice blue, spectral white, ghost translucency
const COL_GHOST_LT = 0xddeeff; // bright spectral surface
const COL_GHOST_MID = 0x99ccee; // mid spectral blue
const COL_GHOST_DK = 0x5599cc; // deep spectral
const COL_GHOST_FADE = 0x3366aa; // lower body fade

const COL_ARMOR_LT = 0xbbd8f0; // spectral plate highlight
const COL_ARMOR_MID = 0x7ab0d8; // spectral plate mid
const COL_ARMOR_DK = 0x4488bb; // spectral plate shadow
const COL_ARMOR_EDGE = 0xeef8ff; // plate edge glint

const COL_CROWN_GOLD = 0xddcc44; // ghostly gold crown
const COL_CROWN_HI = 0xffee88; // crown highlight
const COL_CROWN_GEM = 0x44ffcc; // crown gem — ice-teal

const COL_SKULL_FACE = 0xccddee; // visible skull beneath form
const COL_EYE_GLOW = 0xeeffff; // white glowing eyes
const COL_EYE_CORE = 0xaaddff; // eye inner glow

const COL_SWORD = 0x88ddff; // phantom sword ice-blue
const COL_SWORD_HI = 0xddf8ff; // sword highlight
const COL_SWORD_GLOW = 0x44aadd; // sword glow aura
const COL_SWORD_COLD = 0xbbeeFF; // cold edge

const COL_CAPE = 0x2244aa; // dark spectral cape
const COL_CAPE_EDGE = 0x4477cc; // cape translucent edge
const COL_CAPE_HI = 0x5588dd; // cape highlight

const COL_FROST = 0xccf0ff; // frost mist particles
const COL_ICE_TRAIL = 0x88ccff; // ice trail on ground

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

/** Ice-blue ground glow beneath floating form. */
function drawGroundGlow(g: Graphics, cx: number, gy: number, pulse: number, w = 11): void {
  g.ellipse(cx, gy, w, 2.5).fill({ color: COL_ICE_TRAIL, alpha: 0.10 + pulse * 0.06 });
  g.ellipse(cx, gy, w * 0.55, 1.2).fill({ color: COL_GHOST_LT, alpha: 0.06 + pulse * 0.04 });
}

/** Tattered spectral cape — several ragged strands. */
function drawCape(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  wave: number,
  alpha = 0.55,
): void {
  const baseY = torsoTop + 3;
  const capeW = 16;
  // Main cape fill
  g.moveTo(cx - capeW / 2, baseY)
    .lineTo(cx - capeW / 2 - wave * 0.5, baseY + torsoH + 8)
    .quadraticCurveTo(
      cx + wave * 2,
      baseY + torsoH + 12,
      cx + capeW / 2 + wave * 0.5,
      baseY + torsoH + 8,
    )
    .lineTo(cx + capeW / 2, baseY)
    .closePath()
    .fill({ color: COL_CAPE, alpha });
  // Cape edge fade highlight
  g.moveTo(cx - capeW / 2, baseY)
    .lineTo(cx - capeW / 2 - wave * 0.5, baseY + torsoH + 8)
    .stroke({ color: COL_CAPE_EDGE, width: 1, alpha: alpha * 0.5 });
  g.moveTo(cx + capeW / 2, baseY)
    .lineTo(cx + capeW / 2 + wave * 0.5, baseY + torsoH + 8)
    .stroke({ color: COL_CAPE_EDGE, width: 1, alpha: alpha * 0.5 });
  // Tattered ends — jagged cuts
  const tatters = 5;
  for (let i = 0; i < tatters; i++) {
    const tx = cx - capeW / 2 + 2 + i * (capeW / tatters) + wave * 0.3 * (i % 2 === 0 ? 1 : -1);
    const ty = baseY + torsoH + 8 + i * 0.5;
    const depth = 2 + (i % 3) * 1.5;
    g.moveTo(tx, ty)
      .lineTo(tx + 1.5, ty + depth)
      .lineTo(tx + 3.5, ty)
      .stroke({ color: COL_CAPE_EDGE, width: 0.7, alpha: alpha * 0.4 });
  }
  // Cape highlight near top
  g.moveTo(cx - 4, baseY + 1)
    .quadraticCurveTo(cx, baseY - 1, cx + 4, baseY + 1)
    .stroke({ color: COL_CAPE_HI, width: 0.8, alpha: alpha * 0.35 });
}

/** Frost mist particles trailing from body. */
function drawFrostMist(
  g: Graphics,
  cx: number,
  cy: number,
  t: number,
  count = 6,
  alpha = 0.3,
): void {
  for (let i = 0; i < count; i++) {
    const angle = t * Math.PI * 1.5 + i * (Math.PI * 2 / count);
    const dist = 3 + i * 2;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.35;
    const size = 0.8 + (i % 3) * 0.4;
    g.circle(px, py, size).fill({ color: COL_FROST, alpha: alpha - i * (alpha / count) });
  }
}

/** Spectral plate torso armor. */
function drawTorsoArmor(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  alpha = 0.7,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  // Main chest plate
  g.roundRect(x, top, tw, h, 3)
    .fill({ color: COL_ARMOR_MID, alpha })
    .stroke({ color: COL_ARMOR_DK, width: 0.5, alpha: alpha * 0.8 });
  // Breast plate highlight — V-shape
  g.moveTo(cx + tilt - 3, top + 1)
    .lineTo(cx + tilt, top + h * 0.35)
    .lineTo(cx + tilt + 3, top + 1)
    .stroke({ color: COL_ARMOR_EDGE, width: 0.8, alpha: alpha * 0.6 });
  // Pauldron left
  g.roundRect(x - 4, top - 1, 5, 4, 1)
    .fill({ color: COL_ARMOR_MID, alpha: alpha * 0.85 })
    .stroke({ color: COL_ARMOR_DK, width: 0.4, alpha: alpha * 0.7 });
  // Pauldron right
  g.roundRect(x + tw - 1, top - 1, 5, 4, 1)
    .fill({ color: COL_ARMOR_MID, alpha: alpha * 0.85 })
    .stroke({ color: COL_ARMOR_DK, width: 0.4, alpha: alpha * 0.7 });
  // Armor edge glints
  g.moveTo(x + 1, top + 1).lineTo(x + tw - 2, top + 1).stroke({ color: COL_ARMOR_EDGE, width: 0.5, alpha: alpha * 0.4 });
  // Ghostly chest glow
  g.circle(cx + tilt, top + h * 0.42, 2.5).fill({ color: COL_GHOST_LT, alpha: alpha * 0.12 });
}

/** Skull face — visible through translucent spectral form. */
function drawSkullFace(
  g: Graphics,
  cx: number,
  top: number,
  eyePulse: number,
  alpha = 0.65,
): void {
  const hw = 10;
  const hh = 10;
  // Translucent face form
  g.roundRect(cx - hw / 2, top + 1, hw, hh, 3)
    .fill({ color: COL_SKULL_FACE, alpha: alpha * 0.5 })
    .stroke({ color: COL_GHOST_DK, width: 0.4, alpha: alpha * 0.6 });
  // Skull cheekbones visible
  g.roundRect(cx - hw / 2 + 1, top + hh * 0.35, 2.5, 4, 1).fill({ color: COL_GHOST_MID, alpha: alpha * 0.25 });
  g.roundRect(cx + hw / 2 - 3.5, top + hh * 0.35, 2.5, 4, 1).fill({ color: COL_GHOST_MID, alpha: alpha * 0.25 });
  // Eye sockets — dark hollows
  g.circle(cx - 2.8, top + hh * 0.42, 2.2).fill({ color: COL_SHADOW, alpha: alpha * 0.5 });
  g.circle(cx + 2.8, top + hh * 0.42, 2.2).fill({ color: COL_SHADOW, alpha: alpha * 0.5 });
  // Glowing white eyes
  g.circle(cx - 2.8, top + hh * 0.42, 1.5 + eyePulse * 0.5).fill({
    color: COL_EYE_GLOW,
    alpha: 0.5 + eyePulse * 0.4,
  });
  g.circle(cx + 2.8, top + hh * 0.42, 1.5 + eyePulse * 0.5).fill({
    color: COL_EYE_GLOW,
    alpha: 0.5 + eyePulse * 0.4,
  });
  // Eye core — ice blue pinpoint
  g.circle(cx - 2.8, top + hh * 0.42, 0.7).fill({ color: COL_EYE_CORE, alpha: 0.7 + eyePulse * 0.2 });
  g.circle(cx + 2.8, top + hh * 0.42, 0.7).fill({ color: COL_EYE_CORE, alpha: 0.7 + eyePulse * 0.2 });
  // Nasal cavity hint
  g.moveTo(cx - 0.8, top + hh * 0.58).lineTo(cx, top + hh * 0.64).lineTo(cx + 0.8, top + hh * 0.58)
    .stroke({ color: COL_GHOST_DK, width: 0.5, alpha: alpha * 0.4 });
  // Jaw / teeth hint
  for (let i = 0; i < 4; i++) {
    g.rect(cx - 3 + i * 2, top + hh * 0.8, 1.4, 2).fill({ color: COL_GHOST_LT, alpha: alpha * 0.35 });
  }
}

/** Spectral crown — golden with ice-teal gem. */
function drawCrown(
  g: Graphics,
  cx: number,
  top: number,
  alpha = 0.8,
  tilt = 0,
): void {
  const cw = 12;
  // Crown band
  g.roundRect(cx - cw / 2 + tilt, top, cw, 3, 1)
    .fill({ color: COL_CROWN_GOLD, alpha })
    .stroke({ color: COL_CROWN_HI, width: 0.5, alpha: alpha * 0.6 });
  // Crown points
  const points = 5;
  for (let i = 0; i < points; i++) {
    const px = cx - cw / 2 + 1 + i * (cw - 2) / (points - 1) + tilt;
    const pHeight = i % 2 === 0 ? 5 : 3;
    g.moveTo(px - 1, top)
      .lineTo(px, top - pHeight)
      .lineTo(px + 1, top)
      .closePath()
      .fill({ color: COL_CROWN_GOLD, alpha });
    // Gem on center point
    if (i === 2) {
      g.circle(px, top - pHeight + 1, 1.2).fill({ color: COL_CROWN_GEM, alpha: alpha * 0.9 });
      g.circle(px, top - pHeight + 1, 0.5).fill({ color: COL_GHOST_LT, alpha: alpha });
    }
  }
  // Crown highlight
  g.moveTo(cx - cw / 2 + 1 + tilt, top + 1).lineTo(cx + cw / 2 - 1 + tilt, top + 1)
    .stroke({ color: COL_CROWN_HI, width: 0.6, alpha: alpha * 0.5 });
}

/** Spectral arm — translucent armored. */
function drawSpectralArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  alpha = 0.65,
): void {
  // Upper arm bone/armor
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ARMOR_MID, width: 4, alpha });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ARMOR_LT, width: 1.5, alpha: alpha * 0.6 });
  // Pauldron at shoulder
  g.circle(sx, sy, 2.5).fill({ color: COL_ARMOR_MID, alpha: alpha * 0.8 });
  g.circle(sx, sy, 2.5).stroke({ color: COL_ARMOR_EDGE, width: 0.5, alpha: alpha * 0.4 });
  // Gauntlet hand
  g.circle(ex, ey, 2).fill({ color: COL_ARMOR_MID, alpha: alpha * 0.9 });
  g.circle(ex, ey, 2).stroke({ color: COL_ARMOR_EDGE, width: 0.4, alpha: alpha * 0.6 });
}

/** Phantom ice sword. */
function drawPhantomSword(
  g: Graphics,
  hx: number,
  hy: number,
  angle: number,
  len = 16,
  alpha = 0.8,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = hx + sin * len;
  const tipY = hy - cos * len;
  const pomX = hx - sin * 4;
  const pomY = hy + cos * 4;

  // Sword glow aura — wide, very transparent
  g.moveTo(hx, hy).lineTo(tipX, tipY).stroke({ color: COL_SWORD_GLOW, width: 7, alpha: alpha * 0.12 });
  // Blade body
  g.moveTo(hx, hy).lineTo(tipX, tipY).stroke({ color: COL_SWORD, width: 2.5, alpha });
  // Bright edge
  g.moveTo(hx + cos * 0.3, hy + sin * 0.3)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_SWORD_HI, width: 0.8, alpha: alpha * 0.9 });
  // Cold glint near tip
  g.circle(tipX, tipY, 1.5).fill({ color: COL_SWORD_HI, alpha: alpha * 0.6 });
  g.circle(tipX, tipY, 0.7).fill({ color: COL_GHOST_LT, alpha: alpha * 0.9 });
  // Cross-guard
  const gx = hx + cos * 1.5;
  const gy2 = hy + sin * 1.5;
  g.moveTo(gx - sin * 4, gy2 + cos * 4)
    .lineTo(gx + sin * 4, gy2 - cos * 4)
    .stroke({ color: COL_SWORD_COLD, width: 1.5, alpha });
  // Pommel
  g.circle(pomX, pomY, 1.8).fill({ color: COL_SWORD, alpha }).stroke({ color: COL_SWORD_HI, width: 0.4, alpha: alpha * 0.7 });
  // Grip
  g.moveTo(hx, hy).lineTo(pomX, pomY).stroke({ color: COL_ARMOR_DK, width: 2, alpha: alpha * 0.9 });
}

/** Lower body mist fade — ghost fades to nothing below waist. */
function drawMistFade(g: Graphics, cx: number, waistY: number, alpha = 0.45): void {
  // Gradient-simulated with stacked ellipses
  for (let i = 0; i < 6; i++) {
    const y = waistY + i * 3;
    const w = 8 - i * 1.1;
    const a = alpha * (1 - i / 6) * 0.6;
    if (w > 0.5) {
      g.ellipse(cx, y, w, 2).fill({ color: COL_GHOST_FADE, alpha: a });
    }
  }
  // Wisps trailing sideways
  for (let i = 0; i < 4; i++) {
    const wy = waistY + 4 + i * 3;
    const wx = cx + (i % 2 === 0 ? 3 : -3);
    g.circle(wx, wy, 1.5 - i * 0.2).fill({ color: COL_GHOST_MID, alpha: alpha * 0.25 * (1 - i / 4) });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  // Float oscillation
  const floatY = Math.sin(t * Math.PI * 2) * 1.8;
  // Cape billowing
  const capeWave = Math.sin(t * Math.PI * 2) * 2.5;
  // Eye pulse
  const eyePulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
  // Frost drift rate
  const frostT = t;

  const torsoH = 13;
  const floatBase = GY - 8; // floats above ground
  const torsoTop = floatBase - torsoH + floatY;
  const headTop = torsoTop - 12;
  const waistY = torsoTop + torsoH;

  // Ground ice glow
  drawGroundGlow(g, CX, GY + 1, eyePulse, 10);

  // Frost particle trail below form
  drawFrostMist(g, CX, waistY + 4, frostT, 5, 0.22);

  // Mist fade lower body
  drawMistFade(g, CX, waistY, 0.45);

  // Wide spectral aura
  g.ellipse(CX, torsoTop + torsoH * 0.5, 14, 18).fill({ color: COL_GHOST_MID, alpha: 0.06 });

  // Cape behind body
  drawCape(g, CX, torsoTop, torsoH, capeWave, 0.5);

  // Torso armor
  drawTorsoArmor(g, CX, torsoTop, torsoH, 0.68);

  // Left arm holding sword at rest
  drawSpectralArm(g, CX - 6, torsoTop + 2, CX - 10, torsoTop + torsoH - 1, 0.65);
  drawPhantomSword(g, CX - 10, torsoTop + torsoH - 1, -0.15, 14, 0.65);

  // Right arm — outstretched slightly
  drawSpectralArm(g, CX + 6, torsoTop + 2, CX + 11, torsoTop + torsoH - 2, 0.65);

  // Frost mist from shoulders
  drawFrostMist(g, CX - 5, torsoTop + 1, frostT + 0.3, 3, 0.18);
  drawFrostMist(g, CX + 5, torsoTop + 1, frostT + 0.6, 3, 0.18);

  // Face
  drawSkullFace(g, CX, headTop, eyePulse, 0.65);

  // Crown
  drawCrown(g, CX, headTop - 1, 0.82);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  // Glide movement — smooth sine oscillation
  const glide = Math.sin(t * Math.PI * 2);
  const floatY = Math.sin(t * Math.PI * 4) * 1.0; // subtle bob
  const capeWave = -glide * 4; // cape trails opposite direction of travel
  const eyePulse = 0.7;
  const frostT = t;

  // Ice crystal trail left behind on ground
  const trailX = CX - glide * 3;
  for (let i = 0; i < 4; i++) {
    const tx = trailX - i * 5;
    g.circle(tx, GY, 1.5 - i * 0.2).fill({ color: COL_ICE_TRAIL, alpha: 0.18 - i * 0.04 });
    g.moveTo(tx - 1, GY - 1).lineTo(tx + 1, GY + 1).stroke({ color: COL_FROST, width: 0.5, alpha: 0.12 - i * 0.02 });
  }

  const torsoH = 13;
  const floatBase = GY - 8;
  const torsoTop = floatBase - torsoH + floatY;
  const headTop = torsoTop - 12;
  const waistY = torsoTop + torsoH;

  drawGroundGlow(g, CX, GY + 1, eyePulse, 10 + Math.abs(glide) * 2);

  drawFrostMist(g, CX, waistY + 4, frostT, 6, 0.25);
  drawMistFade(g, CX + glide * 0.5, waistY, 0.45);

  // Body glow
  g.ellipse(CX, torsoTop + torsoH * 0.5, 13, 16).fill({ color: COL_GHOST_MID, alpha: 0.05 });

  // Cape billows behind (opposite to motion)
  drawCape(g, CX, torsoTop, torsoH, capeWave, 0.52);

  drawTorsoArmor(g, CX, torsoTop, torsoH, 0.68);

  // Arms: left with sword angled back in glide pose
  const armSwing = glide * 1.5;
  drawSpectralArm(g, CX - 6, torsoTop + 2, CX - 9 - armSwing, torsoTop + torsoH - 1, 0.65);
  drawPhantomSword(g, CX - 9 - armSwing, torsoTop + torsoH - 1, -0.2 - glide * 0.08, 14, 0.65);

  // Right arm — sweeps opposite
  drawSpectralArm(g, CX + 6, torsoTop + 2, CX + 10 + armSwing, torsoTop + torsoH - 2, 0.65);

  // Frost
  drawFrostMist(g, CX, torsoTop + 4, frostT, 4, 0.2);

  drawSkullFace(g, CX, headTop, eyePulse, 0.65);
  drawCrown(g, CX, headTop - 1, 0.82);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up sword back, 2-3: sweep across, 4-5: ice trail peak, 6-7: recover
  const phases = [0, 0.1, 0.2, 0.38, 0.55, 0.68, 0.83, 1.0];
  const t = phases[Math.min(frame, 7)];

  const torsoH = 13;
  const floatBase = GY - 8;
  const torsoTop = floatBase - torsoH;
  const headTop = torsoTop - 12;
  const waistY = torsoTop + torsoH;
  const eyePulse = t < 0.55 ? 0.8 : 0.5;
  const capeWave = lerp(0, -3.5, t < 0.55 ? t * 1.8 : 1 - (t - 0.55) / 0.45);

  // Ice slash trail — wide arc
  if (t >= 0.2 && t <= 0.65) {
    const trailT = (t - 0.2) / 0.45;
    const arcAlpha = clamp01(1 - Math.abs(trailT - 0.5) / 0.45) * 0.55;
    const arcR = 16;
    const startAngle = lerp(-1.8, -0.1, clamp01(trailT));
    // Arc swipe trail
    g.moveTo(
      CX + Math.cos(startAngle - 0.5) * arcR,
      (torsoTop + 4) + Math.sin(startAngle - 0.5) * arcR * 0.5,
    )
      .quadraticCurveTo(
        CX + Math.cos(startAngle) * arcR * 1.2,
        (torsoTop + 4) + Math.sin(startAngle) * arcR * 0.4,
        CX + Math.cos(startAngle + 0.5) * arcR,
        (torsoTop + 4) + Math.sin(startAngle + 0.5) * arcR * 0.5,
      )
      .stroke({ color: COL_SWORD_GLOW, width: 5, alpha: arcAlpha * 0.5 });
    g.moveTo(
      CX + Math.cos(startAngle - 0.3) * arcR,
      (torsoTop + 4) + Math.sin(startAngle - 0.3) * arcR * 0.5,
    )
      .quadraticCurveTo(
        CX + Math.cos(startAngle) * arcR * 1.1,
        (torsoTop + 4) + Math.sin(startAngle) * arcR * 0.4,
        CX + Math.cos(startAngle + 0.3) * arcR,
        (torsoTop + 4) + Math.sin(startAngle + 0.3) * arcR * 0.5,
      )
      .stroke({ color: COL_SWORD_HI, width: 1.5, alpha: arcAlpha * 0.7 });
  }

  drawGroundGlow(g, CX, GY + 1, eyePulse, 10);
  drawFrostMist(g, CX, waistY + 4, t, 5, 0.22);
  drawMistFade(g, CX, waistY, 0.45);

  drawCape(g, CX, torsoTop, torsoH, capeWave, 0.5);
  drawTorsoArmor(g, CX, torsoTop, torsoH, 0.7);

  // Sword angle arcs across frame
  let swordAngle: number;
  if (t < 0.2) {
    swordAngle = lerp(-0.1, -1.4, t / 0.2);
  } else if (t < 0.55) {
    swordAngle = lerp(-1.4, 1.2, (t - 0.2) / 0.35);
  } else {
    swordAngle = lerp(1.2, -0.1, (t - 0.55) / 0.45);
  }

  // Right arm swings wide with sword
  const reach = t > 0.1 && t < 0.7 ? 3 : 0;
  const rHandX = CX + 9 + reach;
  const rHandY = torsoTop + 4;
  drawSpectralArm(g, CX + 6, torsoTop + 2, rHandX, rHandY, 0.68);
  drawPhantomSword(g, rHandX, rHandY, swordAngle, 15, 0.82);

  // Left arm braces
  drawSpectralArm(g, CX - 6, torsoTop + 2, CX - 10, torsoTop + torsoH - 1, 0.6);

  drawSkullFace(g, CX, headTop, eyePulse, 0.65);
  drawCrown(g, CX, headTop - 1, 0.82);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const torsoH = 13;
  const floatBase = GY - 8;
  // Rise slightly during cast
  const riseY = intensity * 3;
  const torsoTop = floatBase - torsoH - riseY;
  const headTop = torsoTop - 12;
  const waistY = torsoTop + torsoH;
  const capeWave = Math.sin(t * Math.PI * 2) * 3;
  const eyePulse = 0.6 + pulse * 0.4;

  // Materializing ice ball
  const ballX = CX + 14;
  const ballY = torsoTop;
  const ballR = 1 + intensity * 6;

  // Ice ball core
  if (intensity > 0.1) {
    // Outer glow
    g.circle(ballX, ballY, ballR + 3).fill({ color: COL_SWORD_GLOW, alpha: 0.08 + pulse * 0.06 });
    g.circle(ballX, ballY, ballR + 1.5).fill({ color: COL_SWORD, alpha: 0.15 + pulse * 0.1 });
    g.circle(ballX, ballY, ballR).fill({ color: COL_GHOST_LT, alpha: 0.5 + pulse * 0.3 });
    g.circle(ballX, ballY, ballR * 0.5).fill({ color: COL_EYE_GLOW, alpha: 0.7 + pulse * 0.2 });
    // Ice crystal facets on ball
    for (let i = 0; i < 5; i++) {
      const angle = t * Math.PI * 2 + i * (Math.PI * 2 / 5);
      const fx = ballX + Math.cos(angle) * (ballR - 1);
      const fy = ballY + Math.sin(angle) * (ballR - 1);
      g.moveTo(ballX, ballY).lineTo(fx, fy).stroke({ color: COL_FROST, width: 0.5, alpha: 0.3 + pulse * 0.2 });
    }
  }

  // Wide ice aura expanding from hand
  const auraR = 4 + intensity * 18;
  g.circle(CX + 10, torsoTop + 2, auraR).stroke({ color: COL_SWORD_GLOW, width: 1, alpha: 0.1 + pulse * 0.07 });

  // Frost particles orbiting
  for (let i = 0; i < 7; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI * 2 / 7);
    const dist = 7 + intensity * 10;
    const px = CX + 10 + Math.cos(angle) * dist;
    const py = torsoTop + 2 + Math.sin(angle) * dist * 0.4;
    g.circle(px, py, 1 + pulse * 0.4).fill({ color: COL_FROST, alpha: 0.2 + pulse * 0.25 });
  }

  drawGroundGlow(g, CX, GY + 1, pulse, 10 + intensity * 3);
  drawFrostMist(g, CX, waistY + 4 - riseY, t, 7, 0.28);
  drawMistFade(g, CX, waistY, 0.42);

  // Body glow during cast
  g.ellipse(CX, torsoTop + torsoH * 0.5, 14, 18).fill({ color: COL_GHOST_MID, alpha: 0.05 + intensity * 0.04 });

  drawCape(g, CX, torsoTop, torsoH, capeWave, 0.5);
  drawTorsoArmor(g, CX, torsoTop, torsoH, 0.7);

  // Right arm raised toward ice ball
  const raise = intensity * 5;
  drawSpectralArm(g, CX + 6, torsoTop + 2, CX + 13, torsoTop - raise, 0.7);

  // Left arm — held out to side for balance
  drawSpectralArm(g, CX - 6, torsoTop + 2, CX - 12, torsoTop + 4, 0.65);
  drawPhantomSword(g, CX - 12, torsoTop + 4, -0.2, 14, 0.6);

  drawSkullFace(g, CX, headTop, eyePulse, 0.65);
  drawCrown(g, CX, headTop - 1, 0.85);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const torsoH = 13;
  const floatBase = GY - 8;
  // Fall / sink as form destabilizes
  const sinkY = t * t * 10;
  const torsoTop = floatBase - torsoH + sinkY;
  const headTop = torsoTop - 12;
  const waistY = torsoTop + torsoH;

  // Spectral energy dispersing — outward bursting particles
  const disperse = t * t;
  for (let i = 0; i < 10; i++) {
    if (t < i * 0.06) continue;
    const flyT = clamp01((t - i * 0.06) * 1.2);
    const angle = (i / 10) * Math.PI * 2 + i * 0.5;
    const speed = 5 + i * 2.5;
    const px = CX + Math.cos(angle) * speed * flyT;
    const py = (torsoTop + torsoH * 0.4) + Math.sin(angle) * speed * flyT * 0.4;
    const particleAlpha = (1 - flyT) * 0.6;
    g.circle(px, py, 1.5 - flyT).fill({ color: COL_GHOST_LT, alpha: particleAlpha });
    g.circle(px, py, 2.5 - flyT).fill({ color: COL_GHOST_MID, alpha: particleAlpha * 0.4 });
  }

  // Crown falls and fades
  if (t < 0.75) {
    const crownFallY = t * t * 6;
    const crownAlpha = (1 - t * 1.2) * 0.85;
    const crownTilt = t * 4;
    if (crownAlpha > 0) {
      drawCrown(g, CX + crownTilt * 2, headTop + crownFallY - 1, clamp01(crownAlpha), crownTilt);
    }
  }

  // Body becoming unstable — dissolving
  const bodyAlpha = clamp01(1 - t * 1.1);
  const formAlpha = clamp01(bodyAlpha * 0.75);

  if (bodyAlpha > 0.05) {
    drawGroundGlow(g, CX, GY + 1, 0.3, 8 * bodyAlpha);

    // Cape dissolves
    if (t < 0.6) {
      drawCape(g, CX, torsoTop, torsoH, t * 5, formAlpha * 0.5);
    }

    // Torso — flickers and fades
    drawTorsoArmor(g, CX, torsoTop, torsoH * (1 - t * 0.4), formAlpha, t * 2);

    // Mist — expands as form disperses
    drawMistFade(g, CX, waistY - disperse * 2, 0.4 * bodyAlpha);

    // Phantom sword falls and fades
    if (t < 0.55) {
      const swordT = t / 0.55;
      const swordFallX = CX - 10 + swordT * 5;
      const swordFallY = torsoTop + torsoH + swordT * 8;
      const swordAlpha = (1 - swordT) * 0.75;
      drawPhantomSword(g, swordFallX, swordFallY, swordT * 2.5, 14 * (1 - swordT * 0.3), swordAlpha);
    }

    // Arms go limp and fade
    if (t < 0.5) {
      drawSpectralArm(g, CX + 6, torsoTop + 2, CX + 12 + t * 5, torsoTop + torsoH + t * 4, formAlpha);
      drawSpectralArm(g, CX - 6, torsoTop + 2, CX - 14 - t * 3, torsoTop + torsoH + t * 3, formAlpha);
    }

    // Face fades last — eyes linger
    if (t < 0.65) {
      const faceAlpha = clamp01(1 - t * 1.5) * 0.65;
      drawSkullFace(g, CX + t * 1.5, headTop + sinkY * 0.4, (1 - t) * 0.8, faceAlpha);
    } else {
      // Just glowing eyes remain, then fade
      const eyeAlpha = clamp01((0.85 - t) * 8) * 0.6;
      if (eyeAlpha > 0) {
        g.circle(CX - 2.8, headTop + 10 * 0.42 + sinkY * 0.4, 1.2).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha });
        g.circle(CX + 2.8, headTop + 10 * 0.42 + sinkY * 0.4, 1.2).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha });
      }
    }
  }

  // Frost residue settling on ground near end
  if (t > 0.55) {
    const settleT = (t - 0.55) / 0.45;
    for (let i = 0; i < 5; i++) {
      const fx = CX + (i - 2) * 4;
      g.circle(fx, GY, 1.2).fill({ color: COL_FROST, alpha: settleT * 0.2 });
    }
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
 * Generate all Wraith Lord sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateWraithLordFrames(renderer: Renderer): RenderTexture[] {
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
