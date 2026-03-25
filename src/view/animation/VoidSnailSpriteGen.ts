// Procedural sprite generator for the Void Snail unit type.
//
// Draws a void snail creature at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Spiral shell with visible whorls and void energy swirling inside
//   - Purple/black gradient layers with star-like sparkles
//   - Muscular slug body with void veins/tendrils and iridescent slime sheen
//   - Long organic eye stalks with void-glow tips and bioluminescent nodes
//   - Swirling void particles/motes and dark energy wisps
//   - Subtle dark aura surrounding the creature
//   - Void projectile attack (compressed dark matter sphere + void lightning)
//   - Void portal/rift cast effect with expanding tendrils
//   - Shell-cracking death with void energy spilling out
//   - Slime trail with void shimmer and body undulation on move

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- void/cosmic theme
const COL_SHELL_OUTER = 0x2a0e3e;    // deep void purple
const COL_SHELL_MID = 0x3d1a5c;      // mid purple
const COL_SHELL_INNER = 0x5a2e80;    // lighter purple
const COL_SHELL_HIGHLIGHT = 0x7a4eaa; // shell highlight
const COL_SHELL_RIM = 0x1a0828;       // darkest shell edge
const COL_SHELL_WHORL = 0x4a2870;     // whorl lines

const COL_BODY = 0x5a4870;           // muscular body base
const COL_BODY_DK = 0x3a2850;        // body shadow
const COL_BODY_HI = 0x7a6890;        // body highlight
const COL_BODY_MUSCLE = 0x4a3860;    // muscle definition
const COL_VEIN = 0x8844cc;           // void veins
const COL_VEIN_GLOW = 0xaa66ee;      // vein glow

const COL_EYE_STALK = 0x4a3860;      // stalk base
const COL_EYE_STALK_HI = 0x6a5880;   // stalk highlight
const COL_EYE = 0xcc55ff;            // eye glow
const COL_EYE_HI = 0xee88ff;         // eye highlight
const COL_EYE_CORE = 0xff99ff;       // eye bright core
const COL_PUPIL = 0x1a0028;          // dark pupil
const COL_BIO_NODE = 0x9944dd;       // bioluminescent node

const COL_SLIME = 0x6a8a7a;          // slime base
const COL_SLIME_SHEEN = 0x8abba0;    // iridescent sheen
const COL_SLIME_VOID = 0x7a60aa;     // void-tinted slime

const COL_VOID_PARTICLE = 0x6633aa;  // void motes
const COL_VOID_BRIGHT = 0x9955dd;    // bright void
const COL_VOID_DARK = 0x220044;      // dark void
const COL_VOID_WISP = 0x4422aa;      // wisp color
const COL_STAR = 0xeeddff;           // star sparkle
const COL_STAR_DIM = 0xaa88cc;       // dim star

const COL_AURA = 0x330066;           // dark aura
const COL_PORTAL = 0x5500aa;         // portal color
const COL_LIGHTNING = 0xbb77ff;      // void lightning
const COL_CRACK = 0xcc88ff;          // shell crack glow

const COL_SHADOW = 0x000000;

/* -- helpers -------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Seeded-ish deterministic noise based on index */
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* -- drawing sub-routines ------------------------------------------------- */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 16,
  h = 3,
  alpha = 0.35,
): void {
  g.ellipse(cx, gy + 2, w, h).fill({ color: COL_SHADOW, alpha });
  // subtle void tint in shadow
  g.ellipse(cx, gy + 2, w - 2, h - 0.5).fill({ color: COL_AURA, alpha: 0.15 });
}

function drawDarkAura(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  intensity = 1.0,
): void {
  const pulse = Math.sin(frame * 0.8) * 0.15 + 0.85;
  // outer aura glow
  g.ellipse(cx, cy - 4, 22 * pulse, 18 * pulse)
    .fill({ color: COL_AURA, alpha: 0.08 * intensity });
  g.ellipse(cx, cy - 4, 19 * pulse, 15 * pulse)
    .fill({ color: COL_VOID_DARK, alpha: 0.06 * intensity });
}

function drawVoidParticles(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  count = 6,
  spread = 20,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 73 + frame * 17;
    const angle = (i / count) * Math.PI * 2 + frame * 0.3;
    const dist = 8 + pseudoRand(seed) * spread;
    const px = cx + Math.cos(angle) * dist * 0.8;
    const py = cy - 6 + Math.sin(angle) * dist * 0.5;
    const size = 0.5 + pseudoRand(seed + 1) * 1.2;
    const alpha = 0.2 + pseudoRand(seed + 2) * 0.5;

    if (px > 1 && px < F - 1 && py > 1 && py < F - 1) {
      const col = pseudoRand(seed + 3) > 0.5 ? COL_VOID_PARTICLE : COL_VOID_BRIGHT;
      g.circle(px, py, size).fill({ color: col, alpha });
    }
  }
}

function drawVoidWisps(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  count = 3,
): void {
  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2 + frame * 0.2;
    const startDist = 10 + i * 3;
    const sx = cx + Math.cos(baseAngle) * startDist * 0.7;
    const sy = cy - 4 + Math.sin(baseAngle) * startDist * 0.4;
    const ex = sx + Math.cos(baseAngle + 0.5) * 6;
    const ey = sy + Math.sin(baseAngle + 0.5) * 4 - 2;

    if (sx > 0 && sx < F && sy > 0 && sy < F) {
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.stroke({ color: COL_VOID_WISP, width: 0.8, alpha: 0.3 });
    }
  }
}

function drawStarSparkles(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  count = 5,
): void {
  for (let i = 0; i < count; i++) {
    const seed = i * 53 + frame * 7;
    const twinkle = Math.sin(frame * 1.5 + i * 2.1) * 0.5 + 0.5;
    if (twinkle < 0.3) continue;

    const angle = pseudoRand(seed) * Math.PI * 2;
    const dist = 3 + pseudoRand(seed + 1) * 10;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy - 8 + Math.sin(angle) * dist * 0.8;
    const size = 0.4 + twinkle * 0.6;

    if (sx > cx - 15 && sx < cx + 15 && sy > cy - 20 && sy < cy + 6) {
      const col = twinkle > 0.7 ? COL_STAR : COL_STAR_DIM;
      g.circle(sx, sy, size).fill({ color: col, alpha: twinkle * 0.8 });
    }
  }
}

function drawShell(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  scale = 1.0,
): void {
  const shellCX = cx + 2;
  const shellCY = cy - 10;

  // outer shell -- dark rim
  g.ellipse(shellCX, shellCY, 15 * scale, 13 * scale)
    .fill({ color: COL_SHELL_RIM });

  // main shell body gradient layers (outer to inner)
  g.ellipse(shellCX, shellCY, 14 * scale, 12 * scale)
    .fill({ color: COL_SHELL_OUTER });
  g.ellipse(shellCX + 0.5, shellCY - 0.5, 12 * scale, 10.5 * scale)
    .fill({ color: COL_SHELL_MID });
  g.ellipse(shellCX + 1, shellCY - 1, 9 * scale, 8 * scale)
    .fill({ color: COL_SHELL_INNER });

  // spiral whorls -- concentric arcs
  for (let w = 0; w < 5; w++) {
    const whorlAngle = (w / 5) * Math.PI * 2 + frame * 0.15;
    const whorlR = (5 - w) * 2.2 * scale;
    const wcx = shellCX + Math.cos(whorlAngle) * whorlR * 0.3;
    const wcy = shellCY + Math.sin(whorlAngle) * whorlR * 0.25;

    // draw arc segment as small ellipse
    g.ellipse(wcx, wcy, whorlR * 0.7, whorlR * 0.5)
      .stroke({ color: COL_SHELL_WHORL, width: 0.8, alpha: 0.6 });
  }

  // spiral center
  g.circle(shellCX + 1, shellCY - 1, 3 * scale)
    .fill({ color: COL_SHELL_OUTER });
  g.circle(shellCX + 1, shellCY - 1, 1.5 * scale)
    .fill({ color: COL_VOID_DARK });

  // void energy swirling inside the shell
  const swirl1 = frame * 0.4;
  const swirl2 = frame * 0.4 + Math.PI;
  for (let s = 0; s < 2; s++) {
    const a = s === 0 ? swirl1 : swirl2;
    const r = 6 * scale;
    const sx = shellCX + Math.cos(a) * r * 0.5;
    const sy = shellCY + Math.sin(a) * r * 0.4;
    g.ellipse(sx, sy, 3 * scale, 2 * scale)
      .fill({ color: COL_VOID_BRIGHT, alpha: 0.2 });
    g.ellipse(sx, sy, 1.5 * scale, 1 * scale)
      .fill({ color: COL_VOID_PARTICLE, alpha: 0.35 });
  }

  // highlight / light reflection on shell
  g.ellipse(shellCX - 4 * scale, shellCY - 5 * scale, 4 * scale, 2.5 * scale)
    .fill({ color: COL_SHELL_HIGHLIGHT, alpha: 0.35 });
  g.ellipse(shellCX - 3 * scale, shellCY - 6 * scale, 2 * scale, 1 * scale)
    .fill({ color: COL_SHELL_HIGHLIGHT, alpha: 0.5 });

  // star sparkles on shell
  drawStarSparkles(g, shellCX, shellCY, frame, 5);

  // shell rim stroke
  g.ellipse(shellCX, shellCY, 15 * scale, 13 * scale)
    .stroke({ color: COL_SHELL_RIM, width: 1.2 });
}

function drawBody(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  stretch = 0,
  undulate = 0,
): void {
  const bodyCX = cx - 6;
  const bodyW = 16 + stretch;
  const bodyH = 6;

  // body shadow underneath
  g.ellipse(bodyCX, cy + 1, bodyW - 1, bodyH - 1)
    .fill({ color: COL_BODY_DK, alpha: 0.5 });

  // main body shape with undulation
  const uy = Math.sin(undulate) * 0.8;
  g.ellipse(bodyCX, cy + uy, bodyW, bodyH)
    .fill({ color: COL_BODY });

  // muscle definition ridges
  for (let m = 0; m < 4; m++) {
    const mx = bodyCX - 8 + m * 5;
    const mw = 3;
    const mPhase = Math.sin(undulate + m * 0.8) * 0.5;
    g.ellipse(mx, cy + uy + mPhase, mw, bodyH - 2)
      .fill({ color: COL_BODY_MUSCLE, alpha: 0.3 });
  }

  // body highlight (dorsal ridge)
  g.ellipse(bodyCX, cy + uy - 2, bodyW - 4, 2)
    .fill({ color: COL_BODY_HI, alpha: 0.4 });

  // void veins/tendrils running through the body
  for (let v = 0; v < 3; v++) {
    const vx1 = bodyCX - 10 + v * 7;
    const vy1 = cy + uy - 1 + Math.sin(frame * 0.5 + v) * 1.5;
    const vx2 = vx1 + 5;
    const vy2 = cy + uy + 1 + Math.cos(frame * 0.5 + v) * 1.5;

    g.moveTo(vx1, vy1);
    g.quadraticCurveTo(vx1 + 2.5, vy1 + Math.sin(frame * 0.3 + v * 2) * 2, vx2, vy2);
    g.stroke({ color: COL_VEIN, width: 0.6, alpha: 0.5 });

    // glow on veins
    g.circle((vx1 + vx2) / 2, (vy1 + vy2) / 2, 1)
      .fill({ color: COL_VEIN_GLOW, alpha: 0.3 + Math.sin(frame * 0.8 + v) * 0.2 });
  }

  // iridescent slime sheen on body
  const sheenX = bodyCX - 6 + Math.sin(frame * 0.4) * 4;
  g.ellipse(sheenX, cy + uy + 2, 5, 1.5)
    .fill({ color: COL_SLIME_SHEEN, alpha: 0.2 });

  // body outline
  g.ellipse(bodyCX, cy + uy, bodyW, bodyH)
    .stroke({ color: COL_BODY_DK, width: 0.7 });
}

function drawEyeStalk(
  g: Graphics,
  cx: number,
  cy: number,
  offsetX: number,
  sway: number,
  frame: number,
): void {
  const baseX = cx - 8 + offsetX;
  const baseY = cy - 4;
  const tipX = baseX + sway * 1.5 + offsetX * 0.3;
  const tipY = baseY - 14 + Math.sin(frame * 0.6 + offsetX) * 1;

  // stalk as curved line segments (organic look)
  const midX = lerp(baseX, tipX, 0.5) + sway * 0.8;
  const midY = lerp(baseY, tipY, 0.5) - 1;

  // stalk shadow/thickness
  g.moveTo(baseX + 1, baseY);
  g.quadraticCurveTo(midX + 1, midY, tipX + 0.5, tipY);
  g.stroke({ color: COL_BODY_DK, width: 2.5, alpha: 0.5 });

  // main stalk
  g.moveTo(baseX, baseY);
  g.quadraticCurveTo(midX, midY, tipX, tipY);
  g.stroke({ color: COL_EYE_STALK, width: 2 });

  // highlight on stalk
  g.moveTo(baseX - 0.3, baseY);
  g.quadraticCurveTo(midX - 0.3, midY - 0.5, tipX - 0.3, tipY);
  g.stroke({ color: COL_EYE_STALK_HI, width: 0.7, alpha: 0.6 });

  // bioluminescent nodes along stalk
  for (let n = 0; n < 3; n++) {
    const t = 0.25 + n * 0.25;
    const nx = lerp(baseX, tipX, t) + lerp(0, sway * 0.8, t);
    const ny = lerp(baseY, tipY, t) - Math.sin(t * Math.PI) * 1;
    const nPulse = Math.sin(frame * 1.2 + n * 2) * 0.3 + 0.7;
    g.circle(nx, ny, 1).fill({ color: COL_BIO_NODE, alpha: nPulse * 0.7 });
    g.circle(nx, ny, 1.8).fill({ color: COL_BIO_NODE, alpha: nPulse * 0.2 });
  }

  // eye glow halo
  g.circle(tipX, tipY, 4.5)
    .fill({ color: COL_EYE, alpha: 0.15 });

  // eye bulb
  g.circle(tipX, tipY, 3)
    .fill({ color: COL_EYE });
  g.circle(tipX, tipY, 3)
    .stroke({ color: COL_VEIN, width: 0.5, alpha: 0.4 });

  // eye bright core
  g.circle(tipX - 0.5, tipY - 0.5, 1.8)
    .fill({ color: COL_EYE_HI });
  g.circle(tipX - 0.8, tipY - 1, 0.8)
    .fill({ color: COL_EYE_CORE });

  // pupil (void slit)
  g.ellipse(tipX + 0.3, tipY + 0.2, 0.7, 1.5)
    .fill({ color: COL_PUPIL });
}

function drawSlimeTrail(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  length = 14,
): void {
  // main slime trail behind snail
  for (let s = 0; s < 5; s++) {
    const sx = cx + 6 + s * (length / 5);
    const sy = cy + 3 + Math.sin(frame * 0.3 + s * 0.7) * 0.5;
    const sw = length / 5 + 1;
    const sh = 1.5 - s * 0.15;
    const alpha = 0.35 - s * 0.05;
    g.ellipse(sx, sy, sw, sh)
      .fill({ color: COL_SLIME, alpha });
    // void shimmer in slime
    if (s % 2 === 0) {
      g.ellipse(sx, sy, sw * 0.6, sh * 0.5)
        .fill({ color: COL_SLIME_VOID, alpha: alpha * 0.6 });
    }
  }
  // iridescent highlights
  const shimmerX = cx + 8 + Math.sin(frame * 0.5) * 4;
  g.ellipse(shimmerX, cy + 3, 2, 0.7)
    .fill({ color: COL_SLIME_SHEEN, alpha: 0.4 });
}

/* -- state generators ----------------------------------------------------- */

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const sway = Math.sin(t * Math.PI * 2) * 1.2;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;

  drawDarkAura(g, CX, GY, frame);
  drawShadow(g, CX, GY);
  drawVoidWisps(g, CX, GY, frame);
  drawBody(g, CX, GY, frame, 0, t * Math.PI * 2);
  drawShell(g, CX, GY + breathe, frame);
  drawEyeStalk(g, CX, GY, -4, sway, frame);
  drawEyeStalk(g, CX, GY, 4, -sway, frame);
  drawVoidParticles(g, CX, GY, frame, 6, 18);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const crawl = Math.sin(t * Math.PI * 2) * 3;
  const sway = Math.sin(t * Math.PI * 2) * 2;
  const undulate = t * Math.PI * 4; // faster body wave

  drawDarkAura(g, CX + crawl * 0.3, GY, frame, 0.8);
  drawShadow(g, CX + crawl * 0.3, GY, 15 + Math.abs(crawl), 3);

  // slime trail behind
  drawSlimeTrail(g, CX + crawl * 0.5, GY, frame);

  drawVoidWisps(g, CX + crawl * 0.3, GY, frame, 4);
  drawBody(g, CX + crawl * 0.5, GY, frame, Math.abs(crawl) * 0.5, undulate);

  // body compression wave
  const compressPhase = Math.sin(t * Math.PI * 2 + Math.PI * 0.5);
  const shellBob = compressPhase * 1.2;
  drawShell(g, CX + crawl, GY + shellBob, frame);

  drawEyeStalk(g, CX + crawl * 0.7, GY, -4, sway, frame);
  drawEyeStalk(g, CX + crawl * 0.7, GY, 4, -sway * 0.8, frame);

  drawVoidParticles(g, CX + crawl * 0.3, GY, frame, 5, 16);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const sway = Math.sin(frame * 0.8) * 1;

  // attack phases
  const windUp = clamp01(t / 0.3);
  const fire = clamp01((t - 0.3) / 0.2);
  const recover = clamp01((t - 0.5) / 0.5);

  const recoil = windUp * 2 - fire * 3;

  drawDarkAura(g, CX, GY, frame, 1.0 + fire * 0.5);
  drawShadow(g, CX, GY);
  drawVoidWisps(g, CX, GY, frame, 4);
  drawBody(g, CX + recoil * 0.5, GY, frame, recoil, frame * 0.5);
  drawShell(g, CX + recoil, GY, frame);
  drawEyeStalk(g, CX + recoil * 0.3, GY, -4, sway - windUp * 2, frame);
  drawEyeStalk(g, CX + recoil * 0.3, GY, 4, -sway + windUp * 2, frame);

  // mouth opening
  if (windUp > 0) {
    const mouthX = CX - 18 + recoil * 0.5;
    const mouthY = GY - 2;
    const mouthSize = windUp * 3;
    g.circle(mouthX, mouthY, mouthSize)
      .fill({ color: COL_VOID_DARK });
    g.circle(mouthX, mouthY, mouthSize * 0.6)
      .fill({ color: COL_VOID_PARTICLE, alpha: 0.6 });
    // energy gathering at mouth
    if (windUp > 0.5) {
      for (let p = 0; p < 3; p++) {
        const pa = (p / 3) * Math.PI * 2 + frame * 2;
        const pd = 4 + (1 - windUp) * 6;
        const ppx = mouthX + Math.cos(pa) * pd;
        const ppy = mouthY + Math.sin(pa) * pd;
        g.circle(ppx, ppy, 0.8)
          .fill({ color: COL_VOID_BRIGHT, alpha: 0.6 });
        g.moveTo(ppx, ppy);
        g.lineTo(mouthX, mouthY);
        g.stroke({ color: COL_VOID_BRIGHT, width: 0.4, alpha: 0.3 });
      }
    }
  }

  // void projectile
  if (fire > 0 && recover < 1) {
    const projProgress = fire * (1 - recover * 0.3);
    const projX = CX - 22 - projProgress * 22;
    const projY = GY - 2 + Math.sin(projProgress * Math.PI * 3) * 2;
    const projSize = 3 + Math.sin(projProgress * Math.PI) * 1.5;

    // dark matter core glow
    g.circle(projX, projY, projSize + 3)
      .fill({ color: COL_AURA, alpha: 0.25 });
    g.circle(projX, projY, projSize + 1.5)
      .fill({ color: COL_VOID_DARK, alpha: 0.6 });

    // compressed dark matter sphere
    g.circle(projX, projY, projSize)
      .fill({ color: COL_VOID_PARTICLE });
    g.circle(projX, projY, projSize * 0.7)
      .fill({ color: COL_SHELL_INNER });
    g.circle(projX - 0.5, projY - 0.5, projSize * 0.3)
      .fill({ color: COL_VOID_BRIGHT });

    // void lightning crackling around projectile
    for (let l = 0; l < 4; l++) {
      const la = (l / 4) * Math.PI * 2 + frame * 3;
      const lr = projSize + 2 + pseudoRand(l + frame * 11) * 3;
      const lx = projX + Math.cos(la) * lr;
      const ly = projY + Math.sin(la) * lr;
      const midLX = projX + Math.cos(la + 0.3) * (lr * 0.5);
      const midLY = projY + Math.sin(la - 0.2) * (lr * 0.5);

      g.moveTo(projX + Math.cos(la) * projSize, projY + Math.sin(la) * projSize);
      g.lineTo(midLX, midLY);
      g.lineTo(lx, ly);
      g.stroke({ color: COL_LIGHTNING, width: 0.6, alpha: 0.7 });
    }
  }

  drawVoidParticles(g, CX, GY, frame, 8, 22);
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const sway = Math.sin(frame * 0.7) * 1.5;

  // casting intensity builds then fades
  const castIntensity = Math.sin(t * Math.PI);

  drawDarkAura(g, CX, GY, frame, 1.0 + castIntensity * 0.8);
  drawShadow(g, CX, GY, 16 + castIntensity * 4, 3 + castIntensity);

  // void portal/rift effect below snail
  if (castIntensity > 0.1) {
    const portalSize = castIntensity * 14;
    const portalAlpha = castIntensity * 0.4;

    // outer rift ring
    g.ellipse(CX, GY + 2, portalSize, portalSize * 0.35)
      .stroke({ color: COL_PORTAL, width: 1.5, alpha: portalAlpha });
    g.ellipse(CX, GY + 2, portalSize - 2, (portalSize - 2) * 0.35)
      .stroke({ color: COL_VOID_BRIGHT, width: 0.8, alpha: portalAlpha * 0.7 });

    // portal fill
    g.ellipse(CX, GY + 2, portalSize - 3, (portalSize - 3) * 0.3)
      .fill({ color: COL_VOID_DARK, alpha: portalAlpha * 0.6 });

    // void tendrils extending from portal
    for (let td = 0; td < 6; td++) {
      const ta = (td / 6) * Math.PI * 2 + frame * 0.5;
      const tLen = portalSize * 0.8 + castIntensity * 6;
      const tx1 = CX + Math.cos(ta) * (portalSize - 3);
      const ty1 = GY + 2 + Math.sin(ta) * (portalSize - 3) * 0.3;
      const tx2 = CX + Math.cos(ta) * tLen;
      const ty2 = GY + 2 + Math.sin(ta) * tLen * 0.3 - castIntensity * 3;

      g.moveTo(tx1, ty1);
      g.quadraticCurveTo(
        (tx1 + tx2) / 2 + Math.sin(frame + td) * 3,
        (ty1 + ty2) / 2 - 2,
        tx2, ty2,
      );
      g.stroke({ color: COL_VOID_WISP, width: 0.8, alpha: portalAlpha * 0.8 });
    }

    // swirling particles in portal
    for (let sp = 0; sp < 4; sp++) {
      const sa = (sp / 4) * Math.PI * 2 + frame * 1.5;
      const sr = portalSize * 0.4;
      const spx = CX + Math.cos(sa) * sr;
      const spy = GY + 2 + Math.sin(sa) * sr * 0.3;
      g.circle(spx, spy, 0.8)
        .fill({ color: COL_STAR, alpha: portalAlpha });
    }
  }

  drawVoidWisps(g, CX, GY, frame, 5);
  drawBody(g, CX, GY, frame, 0, t * Math.PI * 2);

  // shell pulses with void energy during cast
  const shellGlow = castIntensity * 0.3;
  drawShell(g, CX, GY - castIntensity * 1.5, frame);
  if (shellGlow > 0) {
    g.ellipse(CX + 2, GY - 10 - castIntensity * 1.5, 14, 12)
      .fill({ color: COL_VOID_BRIGHT, alpha: shellGlow * 0.2 });
  }

  // eye stalks more erect / alert during cast
  drawEyeStalk(g, CX, GY, -5, sway + castIntensity * 1, frame);
  drawEyeStalk(g, CX, GY, 5, -sway - castIntensity * 1, frame);

  drawVoidParticles(g, CX, GY, frame, 10, 24);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fade = 1 - t;
  const collapse = t * 10;

  // dissolving aura
  drawDarkAura(g, CX, GY, frame, fade);
  drawShadow(g, CX, GY, 16 - collapse, 3 - t * 2, 0.35 * fade);

  // --- cracking shell ---
  const shellCX = CX + 2;
  const shellCY = GY - 10 + collapse * 0.5;
  const shellScale = 1 - t * 0.3;

  // shell base (losing color)
  g.ellipse(shellCX, shellCY, 15 * shellScale, 13 * shellScale)
    .fill({ color: COL_SHELL_RIM, alpha: fade });
  g.ellipse(shellCX, shellCY, 14 * shellScale, 12 * shellScale)
    .fill({ color: COL_SHELL_OUTER, alpha: fade });
  g.ellipse(shellCX, shellCY, 11 * shellScale, 9 * shellScale)
    .fill({ color: COL_SHELL_MID, alpha: fade });

  // cracks in shell
  if (t > 0.15) {
    const crackIntensity = clamp01((t - 0.15) / 0.5);
    const numCracks = Math.floor(crackIntensity * 6) + 1;

    for (let c = 0; c < numCracks; c++) {
      const ca = (c / 6) * Math.PI * 2 + 0.3;
      const cLen = 4 + crackIntensity * 8;
      const cx1 = shellCX + Math.cos(ca) * 2;
      const cy1 = shellCY + Math.sin(ca) * 1.5;
      const cx2 = shellCX + Math.cos(ca) * cLen;
      const cy2 = shellCY + Math.sin(ca) * cLen * 0.8;

      // crack line
      g.moveTo(cx1, cy1);
      g.lineTo(cx2, cy2);
      g.stroke({ color: COL_CRACK, width: 1, alpha: crackIntensity * fade });

      // void energy leaking from crack
      if (crackIntensity > 0.4) {
        const leakX = (cx1 + cx2) / 2;
        const leakY = (cy1 + cy2) / 2;
        g.circle(leakX, leakY, 1 + crackIntensity)
          .fill({ color: COL_VOID_BRIGHT, alpha: crackIntensity * 0.5 * fade });
      }
    }
  }

  // void energy spilling out of shell
  if (t > 0.3) {
    const spillT = clamp01((t - 0.3) / 0.7);
    for (let sp = 0; sp < 8; sp++) {
      const sa = (sp / 8) * Math.PI * 2;
      const sd = spillT * 16;
      const spx = shellCX + Math.cos(sa) * sd;
      const spy = shellCY + Math.sin(sa) * sd * 0.7 + spillT * 4;
      const spSize = 1.5 * (1 - spillT * 0.5);

      if (spx > 0 && spx < F && spy > 0 && spy < F) {
        g.circle(spx, spy, spSize)
          .fill({ color: COL_VOID_PARTICLE, alpha: (1 - spillT) * 0.6 });
      }
    }
  }

  // body dissolving into void particles
  const bodyFade = clamp01(fade * 1.3);
  if (bodyFade > 0) {
    const bodyCX = CX - 6;
    // fragmenting body
    if (t < 0.6) {
      g.ellipse(bodyCX, GY + collapse * 0.3, 16 - collapse * 0.8, 6 - collapse * 0.3)
        .fill({ color: COL_BODY, alpha: bodyFade });
    }

    // dissolving particles from body
    if (t > 0.2) {
      const dissT = clamp01((t - 0.2) / 0.8);
      for (let d = 0; d < 10; d++) {
        const seed = d * 37;
        const dx = bodyCX - 10 + pseudoRand(seed) * 24;
        const dy = GY + pseudoRand(seed + 1) * 6 - dissT * 12;
        const dAlpha = (1 - dissT) * 0.5;
        const dSize = 0.8 + pseudoRand(seed + 2) * 1.2;

        if (dx > 0 && dx < F && dy > 0 && dy < F) {
          const col = pseudoRand(seed + 3) > 0.5 ? COL_VOID_PARTICLE : COL_BODY;
          g.circle(dx, dy, dSize * (1 - dissT * 0.5))
            .fill({ color: col, alpha: dAlpha });
        }
      }
    }
  }

  // residual void motes
  drawVoidParticles(g, CX, GY, frame + 100, Math.floor(fade * 8), 20);
}

/* -- state table & export ------------------------------------------------- */

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 5 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateVoidSnailFrames(
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
