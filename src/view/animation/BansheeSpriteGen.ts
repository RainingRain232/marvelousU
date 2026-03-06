// Procedural sprite generator for the Banshee unit type.
//
// Draws a ghostly floating spirit at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Pale blue/white translucent form
//   - No legs -- body tapers into mist at the bottom
//   - Long flowing spectral hair
//   - Mouth open in a wail
//   - Glowing ice-blue eyes
//   - Semi-transparent throughout
//   - Hovers/floats for movement (no walking cycle)
//   - Cold aura frost particles
//   - Ethereal trailing wisps

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- spectral ice
const COL_BODY = 0xc8d8e8;        // pale blue-white
const COL_BODY_HI = 0xe0e8f0;
const COL_BODY_DK = 0x8098b0;
const COL_BODY_CORE = 0xdde4ee;

const COL_HAIR = 0x8090aa;        // darker spectral hair
const COL_HAIR_HI = 0xa0b0c8;

const COL_FACE = 0xd0dce8;
const COL_FACE_DK = 0xa0b4c8;

const COL_EYE = 0x44ccff;         // ice-blue glow
const COL_EYE_HI = 0x88eeff;
const COL_EYE_GLOW = 0x22aaee;

const COL_MOUTH = 0x1a2a3a;       // dark wailing mouth
const COL_MOUTH_INNER = 0x0a1520;

const COL_MIST = 0x8898b0;        // bottom mist
const COL_MIST_HI = 0xa0b0c8;

const COL_FROST = 0xaaddff;       // frost particles
const COL_FROST_HI = 0xcceeFF;
const COL_WISP = 0x7888a0;        // trailing wisps

const COL_AURA = 0x44aadd;        // cold aura
const COL_WAIL = 0x2266aa;        // wail shockwave

const COL_SHADOW = 0x000000;

/* -- helpers -------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------- */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 8,
  h = 2,
  alpha = 0.15,
): void {
  // Very faint shadow -- she floats
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawMistTrail(
  g: Graphics,
  cx: number,
  topY: number,
  bottomY: number,
  wave: number,
  alpha = 0.4,
): void {
  // The banshee has no legs -- body tapers into trailing mist
  const midY = (topY + bottomY) / 2;

  // Main mist body taper
  g.moveTo(cx - 5, topY)
    .quadraticCurveTo(cx - 6 + wave, midY, cx - 3 + wave * 2, bottomY)
    .lineTo(cx + 3 - wave * 2, bottomY)
    .quadraticCurveTo(cx + 6 - wave, midY, cx + 5, topY)
    .closePath()
    .fill({ color: COL_MIST, alpha: alpha * 0.6 });

  // Wispy tendrils at bottom
  for (let i = 0; i < 4; i++) {
    const tx = cx + (i - 1.5) * 3 + wave * (i - 1.5);
    const ty = bottomY + i * 1.5;
    const tendrilAlpha = alpha * (0.3 - i * 0.06);
    g.moveTo(tx, bottomY - 2)
      .quadraticCurveTo(tx + wave * 1.5, bottomY + 2, tx + wave * 2, ty + 2)
      .stroke({ color: COL_MIST_HI, width: 1.5 - i * 0.3, alpha: tendrilAlpha });
  }
}

function drawBody(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  alpha = 0.5,
): void {
  const bw = 10;
  const x = cx - bw / 2 + tilt;

  // Ethereal torso -- semi-transparent, flowing shape
  g.moveTo(x + 2, top)
    .quadraticCurveTo(x - 1, top + h * 0.5, x + 1, top + h)
    .lineTo(x + bw - 1, top + h)
    .quadraticCurveTo(x + bw + 1, top + h * 0.5, x + bw - 2, top)
    .closePath()
    .fill({ color: COL_BODY, alpha });

  // Spectral inner glow
  g.ellipse(cx + tilt, top + h * 0.4, bw * 0.3, h * 0.3).fill({
    color: COL_BODY_CORE,
    alpha: alpha * 0.4,
  });

  // Flowing robe-like wrinkles
  g.moveTo(x + 3, top + 2)
    .quadraticCurveTo(x + 2 + tilt * 0.3, top + h * 0.5, x + 1, top + h)
    .stroke({ color: COL_BODY_DK, width: 0.5, alpha: alpha * 0.4 });
  g.moveTo(x + bw - 3, top + 2)
    .quadraticCurveTo(x + bw - 2 + tilt * 0.3, top + h * 0.5, x + bw - 1, top + h)
    .stroke({ color: COL_BODY_DK, width: 0.5, alpha: alpha * 0.4 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  eyeGlow = 0.7,
  mouthOpen = 0.5,
  alpha = 0.6,
): void {
  const hw = 10;
  const hh = 9;

  // Spectral face -- gaunt, angular
  g.ellipse(cx + tilt, top + hh * 0.5, hw / 2, hh / 2)
    .fill({ color: COL_FACE, alpha });

  // Hollow cheeks
  g.ellipse(cx - 2.5 + tilt, top + hh * 0.55, 1.5, 2).fill({
    color: COL_FACE_DK,
    alpha: alpha * 0.3,
  });
  g.ellipse(cx + 2.5 + tilt, top + hh * 0.55, 1.5, 2).fill({
    color: COL_FACE_DK,
    alpha: alpha * 0.3,
  });

  // Glowing ice-blue eyes
  const eyeY = top + hh * 0.35;
  const eyeA = 0.5 + eyeGlow * 0.5;
  // Left eye
  g.ellipse(cx - 2 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_EYE, alpha: eyeA });
  g.circle(cx - 2 + tilt, eyeY, 0.6).fill({ color: COL_EYE_HI, alpha: eyeA });
  // Right eye
  g.ellipse(cx + 2 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_EYE, alpha: eyeA });
  g.circle(cx + 2 + tilt, eyeY, 0.6).fill({ color: COL_EYE_HI, alpha: eyeA });
  // Eye glow halos
  g.circle(cx - 2 + tilt, eyeY, 3).fill({ color: COL_EYE_GLOW, alpha: eyeA * 0.12 });
  g.circle(cx + 2 + tilt, eyeY, 3).fill({ color: COL_EYE_GLOW, alpha: eyeA * 0.12 });

  // Wailing mouth -- open dark void
  const mouthY = top + hh * 0.6;
  const mw = 2 + mouthOpen * 2;
  const mh = 1.5 + mouthOpen * 2;
  g.ellipse(cx + tilt, mouthY, mw, mh).fill({ color: COL_MOUTH, alpha: alpha * 0.8 });
  g.ellipse(cx + tilt, mouthY, mw * 0.6, mh * 0.6).fill({
    color: COL_MOUTH_INNER,
    alpha: alpha * 0.5,
  });
}

function drawHair(
  g: Graphics,
  cx: number,
  headTop: number,
  wave: number,
  alpha = 0.5,
): void {
  // Long flowing spectral hair -- streams upward/backward
  const hairTop = headTop - 2;

  // Multiple hair strands flowing in different directions
  for (let i = 0; i < 7; i++) {
    const startX = cx + (i - 3) * 2;
    const startY = hairTop + Math.abs(i - 3) * 0.5;
    const endX = startX + (i - 3) * 2 + wave * (1 + i * 0.3);
    const endY = startY - 6 - i * 1.5 + Math.abs(wave) * (i - 3) * 0.3;
    const cpX = (startX + endX) / 2 + wave * 2;
    const cpY = (startY + endY) / 2 - 3;
    const strandAlpha = alpha * (0.5 - Math.abs(i - 3) * 0.05);
    const width = 1.8 - Math.abs(i - 3) * 0.15;

    g.moveTo(startX, startY)
      .quadraticCurveTo(cpX, cpY, endX, endY)
      .stroke({ color: i % 2 === 0 ? COL_HAIR : COL_HAIR_HI, width, alpha: strandAlpha });
  }
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  alpha = 0.45,
): void {
  // Spectral arm -- thin, translucent
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_BODY, width: 2, alpha });
  // Ghostly fingers
  for (let i = 0; i < 3; i++) {
    const angle = -0.3 + i * 0.3;
    g.moveTo(ex, ey)
      .lineTo(ex + Math.cos(angle) * 3, ey + Math.sin(angle) * 3)
      .stroke({ color: COL_BODY_HI, width: 0.5, alpha: alpha * 0.5 });
  }
}

function drawFrostParticles(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  phase: number,
  count: number,
  alpha = 0.3,
): void {
  for (let i = 0; i < count; i++) {
    const angle = phase + i * (Math.PI * 2 / count);
    const dist = radius + Math.sin(phase * 3 + i) * 3;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.5;
    const pAlpha = alpha * (0.5 + Math.sin(phase * 2 + i * 1.5) * 0.3);
    const pSize = 0.5 + Math.sin(phase + i) * 0.3;
    const col = i % 2 === 0 ? COL_FROST : COL_FROST_HI;
    g.circle(px, py, pSize).fill({ color: col, alpha: pAlpha });
  }
}

/* -- frame generators ----------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  // Gentle floating hover
  const hover = Math.sin(t * Math.PI * 2) * 2;
  const sway = Math.sin(t * Math.PI * 2) * 0.5;
  const hairWave = Math.sin(t * Math.PI * 2 + 0.5) * 1.5;
  const breathe = Math.sin(t * Math.PI * 2) * 0.3;

  const bodyH = 14;
  const bodyTop = GY - 22 + hover;
  const headTop = bodyTop - 9;
  const mistTop = bodyTop + bodyH;
  const mistBottom = GY - 2;

  // Cold aura
  g.ellipse(CX, bodyTop + bodyH * 0.5, 14, 16).fill({ color: COL_AURA, alpha: 0.04 + breathe * 0.01 });

  drawShadow(g, CX, GY, 6 + hover * 0.3, 2, 0.12 - hover * 0.01);
  drawMistTrail(g, CX, mistTop, mistBottom, sway * 2, 0.35);
  drawBody(g, CX, bodyTop, bodyH, sway, 0.45);
  drawHair(g, CX, headTop, hairWave, 0.5);
  drawHead(g, CX, headTop, sway * 0.5, 0.5 + breathe * 0.15, 0.3, 0.55);

  // Arms drifting at sides
  drawArm(g, CX + 5, bodyTop + 3, CX + 9 + sway, bodyTop + 10, 0.4);
  drawArm(g, CX - 5, bodyTop + 3, CX - 9 - sway, bodyTop + 10, 0.4);

  // Frost particles
  drawFrostParticles(g, CX, bodyTop + 5, 12, t * Math.PI * 2, 6, 0.25);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  // Gliding float -- no walking, smooth drift
  const hover = Math.sin(t * Math.PI * 2) * 1.5;
  const drift = Math.sin(t * Math.PI * 4) * 0.8;
  const hairWave = Math.sin(t * Math.PI * 2) * 2.5; // more flow when moving
  const trailWave = -Math.sin(t * Math.PI * 2) * 3;

  const bodyH = 14;
  const bodyTop = GY - 22 + hover;
  const headTop = bodyTop - 9;
  const mistTop = bodyTop + bodyH;
  const mistBottom = GY - 1;

  drawShadow(g, CX, GY, 7 + Math.abs(hover) * 0.4, 2, 0.12);

  // Trailing wisps behind (moving forward)
  for (let i = 0; i < 4; i++) {
    const wx = CX - 4 - i * 3 + trailWave * (i + 1) * 0.3;
    const wy = bodyTop + 5 + i * 3;
    const wAlpha = 0.15 - i * 0.03;
    g.moveTo(CX - 3, bodyTop + 4 + i * 2)
      .quadraticCurveTo(wx + 2, wy - 1, wx, wy)
      .stroke({ color: COL_WISP, width: 1.5 - i * 0.2, alpha: wAlpha });
  }

  drawMistTrail(g, CX, mistTop, mistBottom, trailWave, 0.3);
  drawBody(g, CX, bodyTop, bodyH, drift, 0.4);
  drawHair(g, CX, headTop, hairWave, 0.45);
  drawHead(g, CX, headTop, drift * 0.5, 0.6, 0.4, 0.5);

  // Arms trailing back slightly
  drawArm(g, CX + 5, bodyTop + 3, CX + 8 - drift, bodyTop + 11, 0.35);
  drawArm(g, CX - 5, bodyTop + 3, CX - 8 + drift, bodyTop + 11, 0.35);

  drawFrostParticles(g, CX, bodyTop + 5, 14, t * Math.PI * 2, 8, 0.2);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Spectral claw swipe: 0-1=rear back, 2-3=lunge+swipe, 4-5=slash, 6-7=fade back
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const bodyH = 14;
  const hover = Math.sin(t * Math.PI * 4) * 1.5;
  const bodyTop = GY - 22 + hover;
  const headTop = bodyTop - 9;
  const mistTop = bodyTop + bodyH;

  const lunge = t < 0.55 ? t * 4 : (1 - t) * 6;
  const mouthWide = t > 0.2 && t < 0.7 ? 1.2 : 0.3;

  drawShadow(g, CX + lunge * 0.3, GY, 7, 2, 0.12);
  drawMistTrail(g, CX, mistTop, GY - 1, -lunge * 0.5, 0.3);
  drawBody(g, CX, bodyTop, bodyH, lunge * 0.3, 0.45);
  drawHair(g, CX, headTop, -lunge * 0.8, 0.5);
  drawHead(g, CX, headTop, lunge * 0.2, 0.9, mouthWide, 0.55);

  // Right arm -- spectral claw slash
  let rArmX: number, rArmY: number;
  if (t < 0.25) {
    rArmX = CX + 8 - t * 4;
    rArmY = bodyTop + 2 - t * 6;
  } else if (t < 0.55) {
    const swipe = (t - 0.25) / 0.3;
    rArmX = lerp(CX + 6, CX + 14, swipe);
    rArmY = lerp(bodyTop - 2, bodyTop + 8, swipe);
  } else {
    rArmX = lerp(CX + 14, CX + 9, (t - 0.55) / 0.45);
    rArmY = lerp(bodyTop + 8, bodyTop + 10, (t - 0.55) / 0.45);
  }
  drawArm(g, CX + 5, bodyTop + 3, rArmX, rArmY, 0.5);

  // Left arm follows
  drawArm(g, CX - 5, bodyTop + 3, CX - 8 + lunge * 0.5, bodyTop + 8, 0.4);

  // Spectral slash trails
  if (t >= 0.3 && t <= 0.6) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.45) / 0.15) * 0.4;
    for (let i = 0; i < 3; i++) {
      const ty = rArmY - 4 + i * 3;
      g.moveTo(rArmX - 2, ty)
        .lineTo(rArmX + 8, ty + 1)
        .stroke({ color: COL_FROST_HI, width: 1.2 - i * 0.3, alpha: trailAlpha });
    }
  }

  drawFrostParticles(g, CX, bodyTop + 5, 10 + lunge, t * Math.PI * 2, 6, 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Banshee wail: mouth opens wide, sound waves emanate, ice storm
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const bodyH = 14;
  const hover = Math.sin(t * Math.PI * 2) * 2 - intensity * 2; // rises up
  const bodyTop = GY - 22 + hover;
  const headTop = bodyTop - 9;
  const mistTop = bodyTop + bodyH;

  // Wail shockwave rings expanding outward
  if (intensity > 0.2) {
    for (let i = 0; i < 4; i++) {
      const ringT = clamp01((intensity - 0.2 - i * 0.1) / 0.5);
      if (ringT > 0) {
        const ringR = 5 + ringT * 18;
        const ringAlpha = clamp01(0.3 - ringT * 0.25);
        g.ellipse(CX, headTop + 5, ringR, ringR * 0.4).stroke({
          color: COL_WAIL,
          width: 1.5 - ringT,
          alpha: ringAlpha,
        });
      }
    }
  }

  // Ice storm particles
  for (let i = 0; i < 10; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI * 2 / 10);
    const dist = 8 + intensity * 14 + i * 1.2;
    const px = CX + Math.cos(angle) * dist;
    const py = bodyTop + 2 + Math.sin(angle) * dist * 0.4;
    const pAlpha = clamp01(0.25 + pulse * 0.2 - i * 0.02) * intensity;
    g.circle(px, py, 0.8 + pulse * 0.4).fill({ color: COL_FROST, alpha: pAlpha });
  }

  // Cold aura intensifies
  g.ellipse(CX, bodyTop + 5, 12 + intensity * 6, 14 + intensity * 4).fill({
    color: COL_AURA,
    alpha: intensity * 0.1,
  });

  drawShadow(g, CX, GY, 8, 2, 0.12 + intensity * 0.05);
  drawMistTrail(g, CX, mistTop, GY - 1, pulse * 2, 0.35);
  drawBody(g, CX, bodyTop, bodyH, 0, 0.5 + intensity * 0.1);
  drawHair(g, CX, headTop, pulse * 3, 0.5 + intensity * 0.1);

  // Head with wide-open wailing mouth, blazing eyes
  drawHead(g, CX, headTop, 0, 0.5 + intensity * 0.5, 0.3 + intensity * 0.8, 0.6);

  // Arms spread wide for the wail
  const armSpread = intensity * 6;
  drawArm(g, CX + 5, bodyTop + 3, CX + 10 + armSpread, bodyTop + 5 - intensity * 2, 0.5);
  drawArm(g, CX - 5, bodyTop + 3, CX - 10 - armSpread, bodyTop + 5 - intensity * 2, 0.5);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Dissolves: 0=hit, 1-2=flicker, 3-5=dissolve upward, 6-7=fade to nothing
  const t = frame / 7;

  const bodyH = 14;
  const bodyTop = GY - 22;
  const headTop = bodyTop - 9;

  // Overall fade
  const fadeAlpha = 1 - t * 0.9;
  // Flicker effect in early frames
  const flicker = t < 0.3 ? (Math.sin(t * 40) * 0.3 + 0.7) : 1;
  const alpha = fadeAlpha * flicker;

  // Body rises and disperses
  const riseY = -t * t * 12;
  const disperseX = t * Math.sin(t * 8) * 3;

  if (alpha > 0.05) {
    drawShadow(g, CX, GY, 6 * (1 - t), 2 * (1 - t), 0.1 * (1 - t));

    // Mist trail dissipates first
    if (t < 0.5) {
      drawMistTrail(g, CX + disperseX, bodyTop + bodyH + riseY, GY - 1, t * 4, alpha * 0.3);
    }

    // Body dissolves upward
    if (t < 0.7) {
      drawBody(g, CX + disperseX, bodyTop + riseY, bodyH * (1 - t * 0.5), disperseX * 0.5, alpha * 0.4);
    }

    // Hair streams upward as spirit departs
    if (t < 0.8) {
      drawHair(g, CX + disperseX, headTop + riseY, t * 5, alpha * 0.4);
    }

    // Head lingers longest
    if (t < 0.85) {
      drawHead(
        g,
        CX + disperseX,
        headTop + riseY,
        disperseX * 0.3,
        alpha * 0.6,
        lerp(0.5, 1.5, t), // mouth opens wider in anguish
        alpha * 0.5,
      );
    }
  }

  // Dissolving spirit particles rising upward
  for (let i = 0; i < 12; i++) {
    const pPhase = t * 3 + i * 0.5;
    const px = CX + Math.sin(pPhase * 2 + i) * (6 + t * 8);
    const py = bodyTop + 5 + riseY - i * 2 - t * i * 3;
    const pAlpha = clamp01(fadeAlpha * 0.4 - i * 0.02);
    const pSize = (1 - t) * (1 + Math.sin(pPhase) * 0.3);
    if (pAlpha > 0.02 && pSize > 0.1) {
      g.circle(px, py, pSize).fill({ color: COL_FROST_HI, alpha: pAlpha });
    }
  }

  // Last spectral echo
  if (t > 0.5 && t < 0.9) {
    const echoAlpha = clamp01((1 - (t - 0.5) / 0.4)) * 0.15;
    g.ellipse(CX, bodyTop + 2 + riseY, 8, 12).stroke({
      color: COL_BODY_HI,
      width: 0.5,
      alpha: echoAlpha,
    });
  }
}

/* -- public API ----------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all banshee sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBansheeFrames(renderer: Renderer): RenderTexture[] {
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
