// Procedural sprite generator for the Thunderhawk unit type.
//
// Draws a giant raptor/hawk at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Brown/golden feathers with dark wing tips
//   * Sharp hooked beak, fierce raptor eyes
//   * Large spread wings dominate the silhouette
//   * Powerful talons for swooping attacks
//   * No humanoid body -- full bird creature
//   * Fast wing-flap movement animation
//   * Swooping dive attack with talons extended
//   * Electrical crackling aura on cast

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- raptor bird of prey
const COL_FEATHER = 0x8b6830;     // brown body feathers
const COL_FEATHER_HI = 0xa88040;  // golden feather highlight
const COL_FEATHER_DK = 0x604820;  // dark feather shadow
const COL_FEATHER_BELLY = 0xc8a868; // lighter belly

const COL_WING = 0x7a5c28;        // wing primary feathers
const COL_WING_HI = 0x9a7838;     // wing highlight
const COL_WING_DK = 0x4a3818;     // dark wing tips
const COL_WING_TIP = 0x2a2010;    // very dark wingtip

const COL_HEAD = 0xd4a848;        // golden head feathers
const COL_HEAD_HI = 0xe8c060;     // head highlight

const COL_BEAK = 0x484038;        // dark hooked beak
const COL_BEAK_HI = 0x686050;     // beak highlight
const COL_BEAK_TIP = 0x2a2420;    // beak tip

const COL_EYE = 0xffaa00;         // fierce amber eye
const COL_EYE_PUPIL = 0x1a1008;   // dark pupil
const COL_EYE_RING = 0xcc8800;    // eye ring

const COL_TALON = 0x3a3428;       // dark talons
const COL_TALON_HI = 0x585048;    // talon highlight
const COL_LEG = 0xc8a050;         // feathered leg

const COL_LIGHTNING = 0x88ccff;    // thunder crackling
const COL_LIGHTNING_HI = 0xcceeFF; // lightning highlight

const COL_SHADOW = 0x000000;

/* -- helpers ------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------ */

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 3, alpha = 0.25): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawTalons(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, spread = 0): void {
  // Left leg
  const lx = cx - 4 + stanceL;
  g.rect(lx, gy - 6, 2, 6).fill({ color: COL_LEG });
  // Left talon claws -- 3 toes
  for (let i = -1; i <= 1; i++) {
    const tx = lx + 1 + i * (1.5 + spread);
    g.moveTo(lx + 1, gy).lineTo(tx, gy + 2)
      .stroke({ color: COL_TALON, width: 1 });
    g.circle(tx, gy + 2, 0.5).fill({ color: COL_TALON_HI });
  }

  // Right leg
  const rx = cx + 2 + stanceR;
  g.rect(rx, gy - 6, 2, 6).fill({ color: COL_LEG });
  // Right talon claws
  for (let i = -1; i <= 1; i++) {
    const tx = rx + 1 + i * (1.5 + spread);
    g.moveTo(rx + 1, gy).lineTo(tx, gy + 2)
      .stroke({ color: COL_TALON, width: 1 });
    g.circle(tx, gy + 2, 0.5).fill({ color: COL_TALON_HI });
  }
}

function drawBody(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const bw = 12;
  const x = cx - bw / 2 + tilt;

  // Main body -- oval bird shape
  g.ellipse(cx + tilt, top + h / 2, bw / 2, h / 2)
    .fill({ color: COL_FEATHER })
    .stroke({ color: COL_FEATHER_DK, width: 0.5 });

  // Belly lighter patch
  g.ellipse(cx + tilt, top + h / 2 + 1, bw / 2 - 2, h / 2 - 2)
    .fill({ color: COL_FEATHER_BELLY, alpha: 0.5 });

  // Feather texture lines
  for (let row = 2; row < h - 2; row += 3) {
    g.moveTo(x + 2 + tilt, top + row)
      .quadraticCurveTo(cx + tilt, top + row + 1, x + bw - 2 + tilt, top + row)
      .stroke({ color: COL_FEATHER_DK, width: 0.3, alpha: 0.3 });
  }

  // Back highlight
  g.ellipse(cx + tilt, top + 3, bw / 2 - 1, 2)
    .fill({ color: COL_FEATHER_HI, alpha: 0.3 });
}

function drawTail(g: Graphics, cx: number, tailY: number, fan: number): void {
  // Fan-shaped tail feathers
  for (let i = -2; i <= 2; i++) {
    const angle = i * 0.2 + fan * 0.1;
    const tx = cx + i * 3 + Math.sin(angle) * 2;
    const ty = tailY + 6 + Math.abs(i) * 1;
    g.moveTo(cx, tailY)
      .quadraticCurveTo(cx + i * 2, tailY + 3, tx, ty)
      .stroke({ color: i === 0 ? COL_FEATHER_HI : COL_FEATHER_DK, width: 1.5 });
  }
  // Dark band across tail
  g.moveTo(cx - 6, tailY + 4).lineTo(cx + 6, tailY + 4)
    .stroke({ color: COL_WING_DK, width: 0.8, alpha: 0.4 });
}

function drawWing(g: Graphics, anchorX: number, anchorY: number, span: number, flapY: number, side: number): void {
  // side: -1 = left, 1 = right
  const tipX = anchorX + side * span;
  const tipY = anchorY + flapY;
  const midX = anchorX + side * span * 0.5;
  const midY = anchorY + flapY * 0.3;

  // Wing shape -- layered feathers
  // Secondary feathers (inner)
  g.moveTo(anchorX, anchorY)
    .quadraticCurveTo(midX, midY - 2, tipX * 0.7 + anchorX * 0.3, tipY * 0.7 + anchorY * 0.3)
    .lineTo(anchorX + side * span * 0.3, anchorY + 4)
    .closePath()
    .fill({ color: COL_WING_HI, alpha: 0.6 });

  // Primary feathers (outer)
  g.moveTo(anchorX, anchorY)
    .quadraticCurveTo(midX, midY, tipX, tipY)
    .lineTo(tipX - side * 2, tipY + 3)
    .lineTo(anchorX + side * span * 0.4, anchorY + 5)
    .closePath()
    .fill({ color: COL_WING });

  // Dark wingtips
  g.moveTo(tipX - side * 4, tipY - 1)
    .lineTo(tipX, tipY)
    .lineTo(tipX - side * 2, tipY + 3)
    .closePath()
    .fill({ color: COL_WING_TIP });

  // Leading edge
  g.moveTo(anchorX, anchorY).quadraticCurveTo(midX, midY, tipX, tipY)
    .stroke({ color: COL_WING_DK, width: 1 });

  // Feather details -- barbs
  for (let i = 1; i <= 4; i++) {
    const frac = i / 5;
    const fx = lerp(anchorX, tipX, frac);
    const fy = lerp(anchorY, tipY, frac);
    g.moveTo(fx, fy).lineTo(fx - side * 1, fy + 3)
      .stroke({ color: COL_FEATHER_DK, width: 0.3, alpha: 0.4 });
  }
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 8;
  const hh = 7;

  // Head -- round raptor shape
  g.ellipse(cx + tilt, top + hh / 2, hw / 2, hh / 2)
    .fill({ color: COL_HEAD })
    .stroke({ color: COL_FEATHER_DK, width: 0.4 });

  // Crown feathers -- golden crest
  g.moveTo(cx - 2 + tilt, top).lineTo(cx + tilt, top - 3).lineTo(cx + 2 + tilt, top)
    .stroke({ color: COL_HEAD_HI, width: 1 });

  // Head highlight
  g.ellipse(cx + tilt, top + 2, 2.5, 1.5).fill({ color: COL_HEAD_HI, alpha: 0.4 });

  // Eye -- large fierce amber
  const eyeX = cx + 2 + tilt;
  const eyeY = top + hh * 0.4;
  g.circle(eyeX, eyeY, 2).fill({ color: COL_EYE });
  g.circle(eyeX, eyeY, 2).stroke({ color: COL_EYE_RING, width: 0.4 });
  g.circle(eyeX + 0.3, eyeY, 0.8).fill({ color: COL_EYE_PUPIL });
  // Brow ridge
  g.moveTo(eyeX - 2, eyeY - 1.5).lineTo(eyeX + 2, eyeY - 2)
    .stroke({ color: COL_FEATHER_DK, width: 0.7 });

  // Hooked beak -- sharp downward curve
  const beakBase = cx + hw / 2 - 1 + tilt;
  const beakTop = top + hh * 0.35;
  g.moveTo(beakBase, beakTop)
    .quadraticCurveTo(beakBase + 5, beakTop + 1, beakBase + 3, beakTop + 4)
    .lineTo(beakBase, beakTop + 3)
    .closePath()
    .fill({ color: COL_BEAK });
  // Beak highlight
  g.moveTo(beakBase, beakTop)
    .quadraticCurveTo(beakBase + 4, beakTop + 0.5, beakBase + 3, beakTop + 3)
    .stroke({ color: COL_BEAK_HI, width: 0.4, alpha: 0.5 });
  // Beak tip
  g.circle(beakBase + 3, beakTop + 4, 0.5).fill({ color: COL_BEAK_TIP });
  // Nostril
  g.circle(beakBase + 1.5, beakTop + 1.5, 0.4).fill({ color: COL_BEAK_TIP, alpha: 0.6 });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const headBob = Math.sin(t * Math.PI * 2) * 0.5;

  const bodyH = 12;
  const bodyTop = GY - 6 - bodyH + breathe;
  const headTop = bodyTop - 6;

  drawShadow(g, CX, GY, 12, 3);
  drawTail(g, CX, bodyTop + bodyH - 2, Math.sin(t * Math.PI * 2) * 0.5);

  // Wings folded at sides -- subtle movement
  const foldAngle = 0.5 + Math.sin(t * Math.PI * 2) * 0.1;
  drawWing(g, CX - 3, bodyTop + 3, 8 + foldAngle, 4, -1);
  drawWing(g, CX + 3, bodyTop + 3, 8 + foldAngle, 4, 1);

  drawBody(g, CX, bodyTop, bodyH);
  drawTalons(g, CX, GY, 0, 0);
  drawHead(g, CX, headTop + headBob);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const flap = Math.sin(t * Math.PI * 2);
  const bob = -Math.abs(flap) * 3; // rise on downstroke

  const bodyH = 11;
  const bodyTop = GY - 10 - bodyH + bob;
  const headTop = bodyTop - 6;

  // Wider shadow when airborne
  drawShadow(g, CX, GY, 14 + Math.abs(flap) * 4, 2 + Math.abs(flap), 0.15 + Math.abs(bob) * 0.01);
  drawTail(g, CX, bodyTop + bodyH - 1, -flap * 2);

  // Full wing spread -- powerful flapping
  const wingSpan = 18;
  const flapY = flap * 8;
  drawWing(g, CX - 3, bodyTop + 3, wingSpan, flapY, -1);
  drawWing(g, CX + 3, bodyTop + 3, wingSpan, flapY, 1);

  drawBody(g, CX, bodyTop, bodyH, flap * 0.3);

  // Talons tucked in flight
  const talonY = GY + bob * 0.3;
  g.rect(CX - 3, talonY - 4, 2, 3).fill({ color: COL_LEG });
  g.rect(CX + 1, talonY - 4, 2, 3).fill({ color: COL_LEG });
  for (let i = -1; i <= 0; i++) {
    g.moveTo(CX - 2, talonY - 1).lineTo(CX - 2 + i * 1.5, talonY + 1)
      .stroke({ color: COL_TALON, width: 0.8 });
    g.moveTo(CX + 2, talonY - 1).lineTo(CX + 2 + i * 1.5, talonY + 1)
      .stroke({ color: COL_TALON, width: 0.8 });
  }

  drawHead(g, CX, headTop, flap * 0.2);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Swooping dive attack with talons extended
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const bodyH = 11;

  // Dive trajectory -- sweeps down then pulls up
  let diveY: number;
  let diveAngle: number;
  if (t < 0.4) {
    diveY = lerp(0, 12, t / 0.4);   // dive down
    diveAngle = lerp(0, 0.6, t / 0.4);
  } else if (t < 0.6) {
    diveY = 12;                        // strike
    diveAngle = 0.6;
  } else {
    diveY = lerp(12, 2, (t - 0.6) / 0.4); // pull up
    diveAngle = lerp(0.6, 0, (t - 0.6) / 0.4);
  }

  const bodyTop = GY - 18 - bodyH + diveY;
  const headTop = bodyTop - 5;
  const leanX = t < 0.55 ? t * 6 : (1 - t) * 8;

  drawShadow(g, CX + leanX * 0.5, GY, 12 + diveY * 0.5, 3, 0.2 + diveY * 0.01);
  drawTail(g, CX - leanX * 0.3, bodyTop + bodyH - 1, -diveAngle * 3);

  // Wings swept back during dive
  const wingSpan = t < 0.55 ? lerp(16, 10, t / 0.55) : lerp(10, 16, (t - 0.55) / 0.45);
  const flapY = t < 0.55 ? lerp(0, 6, t / 0.55) : lerp(6, 0, (t - 0.55) / 0.45);
  drawWing(g, CX - 3 + leanX * 0.3, bodyTop + 3, wingSpan, flapY, -1);
  drawWing(g, CX + 3 + leanX * 0.3, bodyTop + 3, wingSpan, flapY, 1);

  drawBody(g, CX + leanX * 0.3, bodyTop, bodyH, diveAngle * 2);
  drawHead(g, CX + leanX * 0.5, headTop, diveAngle * 2);

  // Talons extended for strike
  const talonSpread = t > 0.2 && t < 0.7 ? 2 : 0;
  const talonExtend = t > 0.25 && t < 0.65 ? 4 : 0;
  const talonY = bodyTop + bodyH + 2 + talonExtend;
  // Left talon
  g.rect(CX - 4 + leanX * 0.4, bodyTop + bodyH, 2, 4 + talonExtend).fill({ color: COL_LEG });
  for (let i = -1; i <= 1; i++) {
    g.moveTo(CX - 3 + leanX * 0.4, talonY)
      .lineTo(CX - 3 + leanX * 0.4 + i * (2 + talonSpread), talonY + 3)
      .stroke({ color: COL_TALON, width: 1.2 });
  }
  // Right talon
  g.rect(CX + 2 + leanX * 0.4, bodyTop + bodyH, 2, 4 + talonExtend).fill({ color: COL_LEG });
  for (let i = -1; i <= 1; i++) {
    g.moveTo(CX + 3 + leanX * 0.4, talonY)
      .lineTo(CX + 3 + leanX * 0.4 + i * (2 + talonSpread), talonY + 3)
      .stroke({ color: COL_TALON, width: 1.2 });
  }

  // Strike slash effect
  if (t >= 0.35 && t <= 0.6) {
    const slashAlpha = clamp01(1 - Math.abs(t - 0.47) / 0.13) * 0.5;
    g.moveTo(CX + leanX * 0.5 - 4, talonY + 2)
      .lineTo(CX + leanX * 0.5 + 6, talonY + 6)
      .stroke({ color: 0xffffff, width: 1.5, alpha: slashAlpha });
    g.moveTo(CX + leanX * 0.5 + 4, talonY + 2)
      .lineTo(CX + leanX * 0.5 - 2, talonY + 6)
      .stroke({ color: 0xffffff, width: 1, alpha: slashAlpha * 0.7 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Thunder call -- electrical crackling around the hawk
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const bodyH = 11;
  const bodyTop = GY - 12 - bodyH;
  const headTop = bodyTop - 6;

  // Lightning bolts radiating outward
  for (let i = 0; i < 5; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI * 2 / 5);
    const dist = 8 + intensity * 10;
    const lx = CX + Math.cos(angle) * dist;
    const ly = bodyTop + 6 + Math.sin(angle) * dist * 0.5;
    const midLx = CX + Math.cos(angle) * dist * 0.5 + (Math.random() - 0.5) * 3;
    const midLy = bodyTop + 6 + Math.sin(angle) * dist * 0.3;
    const boltAlpha = clamp01(0.2 + pulse * 0.4 - i * 0.03);
    g.moveTo(CX, bodyTop + 6).lineTo(midLx, midLy).lineTo(lx, ly)
      .stroke({ color: COL_LIGHTNING, width: 1.2, alpha: boltAlpha });
    g.circle(lx, ly, 1.5).fill({ color: COL_LIGHTNING_HI, alpha: boltAlpha * 0.5 });
  }

  drawShadow(g, CX, GY, 14, 3, 0.2 + intensity * 0.15);
  drawTail(g, CX, bodyTop + bodyH - 1, pulse * 1.5);

  // Wings spread wide during channeling
  const wingSpan = 18 + intensity * 2;
  const flapY = -3 - pulse * 3;
  drawWing(g, CX - 3, bodyTop + 3, wingSpan, flapY, -1);
  drawWing(g, CX + 3, bodyTop + 3, wingSpan, flapY, 1);

  drawBody(g, CX, bodyTop, bodyH);

  // Talons gripping perch
  drawTalons(g, CX, GY, -1, 1, 0.5);

  drawHead(g, CX, headTop);

  // Beak open -- screeching
  const beakOpen = intensity * 2;
  g.moveTo(CX + 5, headTop + 4)
    .lineTo(CX + 9, headTop + 3 - beakOpen)
    .stroke({ color: COL_BEAK, width: 1 });
  g.moveTo(CX + 5, headTop + 5)
    .lineTo(CX + 9, headTop + 5 + beakOpen * 0.5)
    .stroke({ color: COL_BEAK, width: 0.8 });

  // Electric aura around body
  const auraAlpha = 0.05 + pulse * 0.1;
  g.ellipse(CX, bodyTop + bodyH / 2, 14, 10).fill({ color: COL_LIGHTNING, alpha: auraAlpha });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const bodyH = 11;

  const fallX = t * 8;
  const dropY = t * t * 12;
  const tumble = t * 1.2;

  const bodyTop = GY - 12 - bodyH + dropY;
  const headTop = bodyTop - 5;

  drawShadow(g, CX + fallX * 0.3, GY, 12 + t * 4, 3, 0.25 * (1 - t * 0.5));

  // Tail crumples
  if (t < 0.8) {
    drawTail(g, CX + fallX * 0.2, bodyTop + bodyH - 1, t * 3);
  }

  // Wings go limp -- fold inward
  if (t < 0.85) {
    const limpSpan = lerp(14, 5, t);
    const limpY = lerp(2, 8, t);
    drawWing(g, CX - 3 + fallX * 0.2, bodyTop + 3, limpSpan, limpY, -1);
    drawWing(g, CX + 3 + fallX * 0.2, bodyTop + 3, limpSpan, limpY, 1);
  }

  drawBody(g, CX + fallX * 0.3, bodyTop, bodyH * (1 - t * 0.1), tumble * 2);

  // Talons splay out
  if (t < 0.7) {
    const talonY = bodyTop + bodyH + 2;
    g.rect(CX - 3 + fallX * 0.1, bodyTop + bodyH, 2, 3).fill({ color: COL_LEG });
    g.rect(CX + 1 + fallX * 0.1, bodyTop + bodyH, 2, 3).fill({ color: COL_LEG });
    for (let i = -1; i <= 1; i++) {
      g.moveTo(CX - 2 + fallX * 0.1, talonY + 2)
        .lineTo(CX - 2 + fallX * 0.1 + i * 3, talonY + 4)
        .stroke({ color: COL_TALON, width: 0.8 });
    }
  }

  drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.4, tumble * 2.5);

  // Feathers scattering
  if (t > 0.2) {
    const featherAlpha = (1 - t) * 0.5;
    for (let i = 0; i < 5; i++) {
      const fx = CX + fallX * 0.3 + Math.sin(t * 5 + i * 1.4) * (6 + i * 2);
      const fy = bodyTop - 2 + i * 4 + t * 3;
      g.moveTo(fx, fy).lineTo(fx + 2, fy + 1)
        .stroke({ color: COL_FEATHER_HI, width: 1, alpha: featherAlpha });
    }
  }
}

/* -- public API ---------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all thunderhawk sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateThunderhawkFrames(renderer: Renderer): RenderTexture[] {
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
