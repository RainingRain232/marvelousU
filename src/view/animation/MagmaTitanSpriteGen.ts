// Procedural sprite generator for the Magma Titan unit type.
//
// Draws a towering colossus of molten rock and fire at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Massive humanoid of dark volcanic rock with glowing lava cracks
//   • Each joint glows orange/red, magma drips from arms
//   • Burning orange eyes, smoke particles rising from body
//   • Rhythmically pulsing lava veins for idle animation
//   • Earth-shaking heavy stomp walk cycle
//   • Overhead two-fisted ground smash attack
//   • Full lava eruption cast animation
//   • Cooling/crumbling obsidian death sequence

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — volcanic rock and molten lava
const COL_ROCK_LIGHT   = 0x5a5058; // lighter rock surface
const COL_ROCK_MID     = 0x3e3640; // main body rock
const COL_ROCK_DARK    = 0x28222a; // deep rock shadow
const COL_ROCK_EDGE    = 0x6a6070; // rock highlight edge
const COL_LAVA_BRIGHT  = 0xff8820; // brilliant lava orange
const COL_LAVA_MID     = 0xdd5500; // deep lava orange-red
const COL_LAVA_GLOW    = 0xff4400; // lava crack glow inner
const COL_LAVA_HOT     = 0xffcc44; // near-white molten centre
const COL_EYE_FIRE     = 0xff9900; // burning eye colour
const COL_EYE_CORE     = 0xffee88; // eye bright core
const COL_SMOKE        = 0x887878; // rising smoke particles
const COL_SMOKE_LT     = 0xaaa0a0; // lighter smoke
const COL_OBSIDIAN     = 0x2a2030; // cooled obsidian (death)
const COL_OBSIDIAN_SHN = 0x4a3860; // obsidian sheen
const COL_CRACK_COOL   = 0x504060; // cooled crack lines
const COL_GROUND_CRACK = 0x5a4030; // ground impact crack
const COL_MAGMA_POOL   = 0xcc4400; // lava pool under feet
const COL_FIRE_AURA    = 0xff6600; // cast fire aura
const COL_SHADOW       = 0x000000;

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
  alpha = 0.3,
  rx = 13,
  ry = 3,
): void {
  g.ellipse(cx, GY + 1, rx, ry).fill({ color: COL_SHADOW, alpha });
}

/**
 * Emit smoke particles rising upward from a position.
 */
function drawSmoke(
  g: Graphics,
  ox: number,
  oy: number,
  count: number,
  seed: number,
  alpha = 0.35,
): void {
  for (let i = 0; i < count; i++) {
    const rise = ((seed * 5 + i * 4) % 10) * 0.8;
    const drift = Math.sin(seed * 3 + i * 2.1) * 2;
    const px = ox + drift + Math.sin(seed + i) * 1.5;
    const py = oy - rise - i * 1.2;
    const sz = 0.8 + ((i * 7 + seed * 3) % 5) * 0.35;
    const col = i % 2 === 0 ? COL_SMOKE : COL_SMOKE_LT;
    g.circle(px, py, sz).fill({ color: col, alpha: alpha * (0.3 + ((i * 11) % 7) * 0.1) });
  }
}

/**
 * Draw a lava crack line — glowing inner + outer.
 */
function drawLavaCrack(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pulseAlpha: number,
): void {
  // Outer glow
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({
    color: COL_LAVA_GLOW,
    width: 2.5,
    alpha: pulseAlpha * 0.25,
  });
  // Main crack
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({
    color: COL_LAVA_MID,
    width: 1.4,
    alpha: pulseAlpha * 0.75,
  });
  // Hot inner core
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({
    color: COL_LAVA_HOT,
    width: 0.5,
    alpha: pulseAlpha * 0.5,
  });
}

/**
 * Draw a glowing joint circle at a body articulation point.
 */
function drawJoint(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  pulseAlpha: number,
): void {
  // Outer glow ring
  g.circle(x, y, r + 2).fill({ color: COL_LAVA_GLOW, alpha: pulseAlpha * 0.2 });
  // Joint orb
  g.circle(x, y, r)
    .fill({ color: COL_LAVA_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.4 });
  // Inner hot spot
  g.circle(x, y, r * 0.5).fill({ color: COL_LAVA_HOT, alpha: pulseAlpha });
}

/**
 * Draw the titan's feet / lava pool under foot.
 */
function drawFoot(
  g: Graphics,
  fx: number,
  fy: number,
  poolAlpha: number,
  squash = 0,
): void {
  const fw = 7 + squash;
  const fh = 5 - squash * 0.5;
  // Lava pool
  if (poolAlpha > 0) {
    g.ellipse(fx, fy + 1, fw * 0.9, 2).fill({ color: COL_MAGMA_POOL, alpha: poolAlpha * 0.4 });
  }
  g.roundRect(fx - fw / 2, fy - fh, fw, fh, 1.5)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  // Rock texture facets
  g.moveTo(fx - fw / 2 + 1, fy - fh + 1)
    .lineTo(fx - fw / 2 + 3, fy - fh + 1)
    .stroke({ color: COL_ROCK_EDGE, width: 0.4, alpha: 0.5 });
}

/**
 * Draw a lower leg from knee to foot.
 */
function drawLowerLeg(
  g: Graphics,
  kx: number,
  ky: number,
  ax: number,
  ay: number,
  pulseAlpha: number,
): void {
  const lw = 5;
  g.moveTo(kx - lw / 2, ky).lineTo(ax - lw / 2, ay).lineTo(ax + lw / 2, ay).lineTo(kx + lw / 2, ky)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  // Lava crack on shin
  drawLavaCrack(g, kx, ky + 1, ax, ay - 1, pulseAlpha);
  drawJoint(g, kx, ky, 2.5, pulseAlpha);
}

/**
 * Draw an upper leg / thigh.
 */
function drawUpperLeg(
  g: Graphics,
  hx: number,
  hy: number,
  kx: number,
  ky: number,
  pulseAlpha: number,
): void {
  const tw = 6;
  g.moveTo(hx - tw / 2, hy).lineTo(kx - tw / 2, ky).lineTo(kx + tw / 2, ky).lineTo(hx + tw / 2, hy)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  drawLavaCrack(g, hx, hy + 2, kx, ky - 1, pulseAlpha * 0.85);
}

/**
 * Draw the main torso block.
 */
function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  pulseAlpha: number,
  tilt = 0,
): void {
  const tw = 18; // massive wide torso
  const x = cx - tw / 2 + tilt;
  // Main body rock
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.6 });
  // Rock texture — highlight ridge
  g.roundRect(x + 2, top + 1, tw - 4, 3, 1).fill({ color: COL_ROCK_LIGHT, alpha: 0.3 });
  g.moveTo(x + 3, top + 2).lineTo(x + tw - 3, top + 2).stroke({ color: COL_ROCK_EDGE, width: 0.3, alpha: 0.4 });

  // Major lava crack — vertical chest crack
  drawLavaCrack(g, cx + tilt, top + 2, cx + tilt, top + h - 2, pulseAlpha);

  // Diagonal chest cracks
  drawLavaCrack(g, cx - 4 + tilt, top + 3, cx - 1 + tilt, top + h * 0.45, pulseAlpha * 0.7);
  drawLavaCrack(g, cx + 4 + tilt, top + 3, cx + 1 + tilt, top + h * 0.45, pulseAlpha * 0.7);

  // Lower horizontal crack
  drawLavaCrack(g, cx - 5 + tilt, top + h * 0.65, cx + 5 + tilt, top + h * 0.65, pulseAlpha * 0.6);

  // Shoulder joint bulges
  g.circle(x, top + 5, 3).fill({ color: COL_ROCK_LIGHT, alpha: 0.3 });
  g.circle(x + tw, top + 5, 3).fill({ color: COL_ROCK_LIGHT, alpha: 0.3 });
}

/**
 * Draw the head — angular volcanic rock block with burning eyes.
 */
function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  pulseAlpha: number,
  tilt = 0,
): void {
  const hw = 13;
  const hh = 10;
  const x = cx - hw / 2 + tilt;
  // Head block
  g.roundRect(x, top, hw, hh, 1.5)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  // Brow ridge
  g.roundRect(x + 1, top, hw - 2, 3, 1).fill({ color: COL_ROCK_LIGHT, alpha: 0.25 });

  // Lava crack across face
  drawLavaCrack(g, cx - 3 + tilt, top + 2, cx + 3 + tilt, top + hh - 2, pulseAlpha * 0.6);

  // Burning eyes
  const eyeY = top + hh * 0.4;
  const eyeR = 1.8;
  // Left eye glow
  g.circle(cx - 3 + tilt, eyeY, eyeR + 1.5).fill({ color: COL_LAVA_GLOW, alpha: pulseAlpha * 0.3 });
  g.circle(cx - 3 + tilt, eyeY, eyeR).fill({ color: COL_EYE_FIRE, alpha: 0.9 });
  g.circle(cx - 3 + tilt, eyeY, eyeR * 0.5).fill({ color: COL_EYE_CORE, alpha: pulseAlpha });
  // Right eye glow
  g.circle(cx + 3 + tilt, eyeY, eyeR + 1.5).fill({ color: COL_LAVA_GLOW, alpha: pulseAlpha * 0.3 });
  g.circle(cx + 3 + tilt, eyeY, eyeR).fill({ color: COL_EYE_FIRE, alpha: 0.9 });
  g.circle(cx + 3 + tilt, eyeY, eyeR * 0.5).fill({ color: COL_EYE_CORE, alpha: pulseAlpha });

  // Lava drip from jaw
  if (pulseAlpha > 0.5) {
    const dripAlpha = (pulseAlpha - 0.5) * 2 * 0.5;
    g.moveTo(cx + tilt - 1, top + hh)
      .lineTo(cx + tilt - 1.5, top + hh + 2 + dripAlpha * 2)
      .stroke({ color: COL_LAVA_MID, width: 1.2, alpha: dripAlpha * 0.8 });
  }
}

/**
 * Draw one arm from shoulder to elbow to fist.
 * sx/sy = shoulder, ex/ey = elbow, fx/fy = fist.
 */
function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  fx: number, fy: number,
  pulseAlpha: number,
  dripAmt = 0,
): void {
  // Upper arm
  g.moveTo(sx - 3, sy).lineTo(ex - 3.5, ey).lineTo(ex + 3.5, ey).lineTo(sx + 3, sy)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  drawLavaCrack(g, sx, sy + 1, ex, ey - 1, pulseAlpha * 0.8);
  drawJoint(g, ex, ey, 3, pulseAlpha);

  // Lower arm
  g.moveTo(ex - 3.5, ey).lineTo(fx - 4, fy).lineTo(fx + 4, fy).lineTo(ex + 3.5, ey)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  drawLavaCrack(g, ex, ey + 1, fx, fy - 1, pulseAlpha * 0.85);

  // Fist
  g.roundRect(fx - 5, fy - 4, 10, 8, 1.5)
    .fill({ color: COL_ROCK_LIGHT })
    .stroke({ color: COL_ROCK_DARK, width: 0.5 });
  drawJoint(g, fx, fy, 3.5, pulseAlpha * 0.9);

  // Magma drip from fist
  if (dripAmt > 0) {
    for (let i = 0; i < 3; i++) {
      const dripX = fx - 3 + i * 3;
      const dripLen = dripAmt * (2 + (i % 2) * 1.5);
      g.moveTo(dripX, fy + 4)
        .lineTo(dripX, fy + 4 + dripLen)
        .stroke({ color: COL_LAVA_MID, width: 1, alpha: 0.7 * dripAmt });
      g.circle(dripX, fy + 4 + dripLen, 0.8).fill({ color: COL_LAVA_BRIGHT, alpha: 0.6 * dripAmt });
    }
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;     // 0→1 lava pulse
  const sway = Math.sin(t * Math.PI * 2) * 0.4;             // gentle body sway
  const breathe = Math.sin(t * Math.PI * 2) * 0.3;

  // Vertical layout — titan stands tall
  const legH = 12;
  const kneeH = legH / 2;
  const torsoH = 13;
  const headH = 10;
  const footY = GY - 1;
  const kneeY = footY - kneeH;
  const hipY  = footY - legH;
  const torsoTop = hipY - torsoH + breathe;
  const headTop   = torsoTop - headH - 1;

  // Foot positions — hip-width stance
  const lFootX = CX - 7;
  const rFootX = CX + 7;

  // Lava pool shimmer under feet
  g.ellipse(lFootX, footY + 1, 6, 1.5).fill({ color: COL_MAGMA_POOL, alpha: 0.15 + pulse * 0.1 });
  g.ellipse(rFootX, footY + 1, 6, 1.5).fill({ color: COL_MAGMA_POOL, alpha: 0.15 + pulse * 0.1 });

  drawShadow(g, CX + sway * 0.3, 0.3 + pulse * 0.05, 13, 3);

  // Legs
  drawUpperLeg(g, lFootX - 1, hipY, lFootX, kneeY, pulse);
  drawUpperLeg(g, rFootX + 1, hipY, rFootX, kneeY, pulse);
  drawLowerLeg(g, lFootX, kneeY, lFootX, footY - 4, pulse);
  drawLowerLeg(g, rFootX, kneeY, rFootX, footY - 4, pulse);
  drawFoot(g, lFootX, footY, pulse * 0.5);
  drawFoot(g, rFootX, footY, pulse * 0.5);

  drawTorso(g, CX + sway, torsoTop, torsoH, pulse);
  drawHead(g, CX + sway, headTop, 0.5 + pulse * 0.5);

  // Arms hanging at sides with slight sway
  const shoulderY = torsoTop + 2;
  // Left arm
  drawArm(
    g,
    CX - 9 + sway * 0.5, shoulderY,
    CX - 11 + sway * 0.3, shoulderY + 7 + breathe * 0.4,
    CX - 10 + sway * 0.2, shoulderY + 14 + breathe * 0.6,
    pulse, 0.2 + pulse * 0.4,
  );
  // Right arm
  drawArm(
    g,
    CX + 9 + sway * 0.5, shoulderY,
    CX + 11 + sway * 0.3, shoulderY + 7 + breathe * 0.4,
    CX + 10 + sway * 0.2, shoulderY + 14 + breathe * 0.6,
    pulse, 0.2 + pulse * 0.4,
  );

  // Smoke rising from body
  drawSmoke(g, CX - 4 + sway, torsoTop - 1, 4, t * 6, 0.3 + pulse * 0.1);
  drawSmoke(g, CX + 3 + sway, torsoTop,     3, t * 4 + 1.5, 0.25 + pulse * 0.1);
  drawSmoke(g, CX + sway, headTop - 2,      2, t * 5 + 3, 0.2);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.2; // feet-pound impact

  const pulse = Math.sin(t * Math.PI * 4) * 0.4 + 0.6; // faster lava pulse during march

  const torsoH = 13;
  const headH = 10;
  const footY = GY - 1;
  const lLift = stride > 0 ? stride * 5 : 0;  // left foot lifts on forward stride
  const rLift = stride < 0 ? -stride * 5 : 0; // right foot lifts on back stride

  const lFootX = CX - 8 + stride * 2;
  const rFootX = CX + 8 - stride * 2;
  const lFootY = footY - lLift;
  const rFootY = footY - rLift;
  const lKneeY = footY - 6 - lLift * 0.5;
  const rKneeY = footY - 6 - rLift * 0.5;
  const hipY = footY - 12 + bob * 0.5;
  const torsoTop = hipY - torsoH;
  const headTop  = torsoTop - headH - 1;

  // Ground impact lava pools — heavier when foot stamps down
  const lImpact = lLift < 0.5 ? 0.5 + (1 - lLift) * 0.3 : 0;
  const rImpact = rLift < 0.5 ? 0.5 + (1 - rLift) * 0.3 : 0;
  g.ellipse(lFootX, footY + 1, 7, 2).fill({ color: COL_MAGMA_POOL, alpha: lImpact * 0.25 });
  g.ellipse(rFootX, footY + 1, 7, 2).fill({ color: COL_MAGMA_POOL, alpha: rImpact * 0.25 });

  // Ground cracks on heavy stamp
  if (lImpact > 0.7) {
    g.moveTo(lFootX - 4, footY + 1).lineTo(lFootX - 9, footY + 3)
      .stroke({ color: COL_GROUND_CRACK, width: 0.7, alpha: (lImpact - 0.7) * 0.8 });
    g.moveTo(lFootX + 3, footY + 1).lineTo(lFootX + 7, footY + 2)
      .stroke({ color: COL_GROUND_CRACK, width: 0.5, alpha: (lImpact - 0.7) * 0.6 });
  }
  if (rImpact > 0.7) {
    g.moveTo(rFootX + 4, footY + 1).lineTo(rFootX + 9, footY + 3)
      .stroke({ color: COL_GROUND_CRACK, width: 0.7, alpha: (rImpact - 0.7) * 0.8 });
    g.moveTo(rFootX - 3, footY + 1).lineTo(rFootX - 7, footY + 2)
      .stroke({ color: COL_GROUND_CRACK, width: 0.5, alpha: (rImpact - 0.7) * 0.6 });
  }

  drawShadow(g, CX, 0.28, 13 + bob * 0.3, 3);

  drawUpperLeg(g, lFootX - 1, hipY, lFootX, lKneeY, pulse);
  drawUpperLeg(g, rFootX + 1, hipY, rFootX, rKneeY, pulse);
  drawLowerLeg(g, lFootX, lKneeY, lFootX, lFootY - 4, pulse);
  drawLowerLeg(g, rFootX, rKneeY, rFootX, rFootY - 4, pulse);
  drawFoot(g, lFootX, lFootY, lImpact * 0.5);
  drawFoot(g, rFootX, rFootY, rImpact * 0.5);

  drawTorso(g, CX, torsoTop, torsoH, pulse, stride * 0.5);
  drawHead(g, CX, headTop, 0.5 + pulse * 0.4, stride * 0.4);

  // Arms swing opposite to leg stride
  const armSwing = -stride * 4;
  drawArm(
    g,
    CX - 9, torsoTop + 2,
    CX - 11 + armSwing * 0.3, torsoTop + 9,
    CX - 10 + armSwing * 0.5, torsoTop + 16,
    pulse, 0.3,
  );
  drawArm(
    g,
    CX + 9, torsoTop + 2,
    CX + 11 - armSwing * 0.3, torsoTop + 9,
    CX + 10 - armSwing * 0.5, torsoTop + 16,
    pulse, 0.3,
  );

  // Smoke trails behind moving body
  drawSmoke(g, CX, torsoTop - 1, 5, t * 8, 0.35);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up — arms raise high
  // 2-3: apex — both fists overhead
  // 4-5: smash down — impact peak
  // 6-7: ground crack radiates, recover
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.72, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const windUp  = clamp01(t / 0.38);
  const smash   = clamp01((t - 0.38) / 0.34);
  const recover = clamp01((t - 0.72) / 0.28);
  const pulse   = 0.6 + smash * 0.4;

  const torsoH = 13;
  const headH  = 10;
  const footY  = GY - 1;
  const hipY   = footY - 12;
  // Torso leans forward into smash
  const lean   = smash * 4 * (1 - recover * 0.7);
  const torsoTop = hipY - torsoH + lean * 0.5;
  const headTop  = torsoTop - headH - 1;

  // Impact ground crack
  if (smash > 0.5) {
    const crackAlpha = (smash - 0.5) * 2 * (1 - recover * 0.8);
    const cx2 = CX + lean;
    const cy2 = footY + 1;
    // Radial cracks from impact point
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI * 0.1;
      const crackLen = 5 + (i % 3) * 3 + smash * 6;
      g.moveTo(cx2, cy2)
        .lineTo(cx2 + Math.cos(angle) * crackLen, cy2 + Math.sin(angle) * crackLen * 0.4)
        .stroke({ color: COL_GROUND_CRACK, width: 0.8, alpha: crackAlpha * 0.7 });
    }
    // Lava upwelling at impact
    g.ellipse(cx2, cy2, 8 + smash * 4, 2).fill({
      color: COL_LAVA_BRIGHT,
      alpha: crackAlpha * 0.35,
    });
  }

  drawShadow(g, CX + lean * 0.5, 0.3, 14, 3);

  // Legs wide for stability
  const lFootX = CX - 9;
  const rFootX = CX + 9;
  const kneeY  = footY - 6;
  drawUpperLeg(g, lFootX, hipY, lFootX + 1, kneeY, pulse);
  drawUpperLeg(g, rFootX, hipY, rFootX - 1, kneeY, pulse);
  drawLowerLeg(g, lFootX + 1, kneeY, lFootX, footY - 4, pulse);
  drawLowerLeg(g, rFootX - 1, kneeY, rFootX, footY - 4, pulse);
  drawFoot(g, lFootX, footY, 0.3, smash > 0.5 ? smash * 1.5 : 0);
  drawFoot(g, rFootX, footY, 0.3, smash > 0.5 ? smash * 1.5 : 0);

  drawTorso(g, CX, torsoTop, torsoH, pulse, lean * 0.3);
  drawHead(g, CX, headTop, 0.6 + smash * 0.4, lean * 0.4);

  // Both arms — wind up raise then slam down
  const armRaise = windUp * (-14);                    // fists rise up
  const armSmash = smash * 18;                        // fists crash down
  const armY     = torsoTop + 2 + armRaise + armSmash;
  const elbowY   = torsoTop + 2 + armRaise * 0.5 + armSmash * 0.3;

  // Left arm
  drawArm(
    g,
    CX - 9 + lean * 0.2, torsoTop + 2,
    CX - 11 + lean * 0.1, elbowY,
    CX - 8 + lean, armY,
    pulse, smash > 0.4 ? (smash - 0.4) * 1.5 : 0,
  );
  // Right arm
  drawArm(
    g,
    CX + 9 + lean * 0.2, torsoTop + 2,
    CX + 11 + lean * 0.1, elbowY,
    CX + 8 + lean, armY,
    pulse, smash > 0.4 ? (smash - 0.4) * 1.5 : 0,
  );

  // Heat shimmer / lava blast at apex of smash
  if (smash > 0.3 && smash < 0.9) {
    const blastAlpha = clamp01((smash - 0.3) / 0.3) * clamp01(1 - (smash - 0.6) / 0.3);
    g.circle(CX + lean, armY, 8 + smash * 4)
      .fill({ color: COL_LAVA_BRIGHT, alpha: blastAlpha * 0.2 });
    g.circle(CX + lean, armY, 4 + smash * 2)
      .fill({ color: COL_LAVA_HOT, alpha: blastAlpha * 0.35 });
  }

  drawSmoke(g, CX, torsoTop - 1, 4, t * 9, 0.35 + smash * 0.2);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.3);
  const eruption = clamp01((t - 0.4) / 0.4);

  const torsoH = 13;
  const headH  = 10;
  const footY  = GY - 1;
  const hipY   = footY - 12;
  const torsoTop = hipY - torsoH;
  const headTop  = torsoTop - headH - 1;

  // Expanding fire aura rings
  for (let ring = 0; ring < 3; ring++) {
    const ringR = 5 + ring * 8 + intensity * 10 + pulse * 2;
    const ringAlpha = clamp01(0.08 + intensity * 0.1 - ring * 0.025) * (0.5 + pulse * 0.5);
    g.circle(CX, torsoTop + torsoH / 2, ringR).stroke({
      color: ring === 0 ? COL_FIRE_AURA : COL_LAVA_MID,
      width: 1.5 - ring * 0.3,
      alpha: ringAlpha,
    });
  }

  drawShadow(g, CX, 0.3 + intensity * 0.1, 14 + intensity * 3, 3);

  drawUpperLeg(g, CX - 8, hipY, CX - 7, footY - 6, 0.8 + pulse * 0.2);
  drawUpperLeg(g, CX + 8, hipY, CX + 7, footY - 6, 0.8 + pulse * 0.2);
  drawLowerLeg(g, CX - 7, footY - 6, CX - 8, footY - 4, 0.8 + pulse * 0.2);
  drawLowerLeg(g, CX + 7, footY - 6, CX + 8, footY - 4, 0.8 + pulse * 0.2);
  drawFoot(g, CX - 8, footY, 0.4 + eruption * 0.4, 0);
  drawFoot(g, CX + 8, footY, 0.4 + eruption * 0.4, 0);

  // Lava pools expand under feet during cast
  if (eruption > 0) {
    g.ellipse(CX, footY + 1, 10 + eruption * 8, 2.5 + eruption).fill({
      color: COL_MAGMA_POOL,
      alpha: eruption * 0.35,
    });
  }

  drawTorso(g, CX, torsoTop, torsoH, 0.7 + pulse * 0.3);
  drawHead(g, CX, headTop, 0.6 + intensity * 0.4 + pulse * 0.4);

  // Arms spread wide and raised — lava erupts from hands
  const armSpread = 4 + intensity * 5;
  const armLift   = 3 + intensity * 6;

  // Left arm spread wide upward
  drawArm(
    g,
    CX - 9, torsoTop + 2,
    CX - 12 - armSpread * 0.4, torsoTop + 2 - armLift * 0.4,
    CX - 14 - armSpread, torsoTop - armLift,
    0.7 + pulse * 0.3, eruption * 0.8,
  );
  // Right arm spread wide upward
  drawArm(
    g,
    CX + 9, torsoTop + 2,
    CX + 12 + armSpread * 0.4, torsoTop + 2 - armLift * 0.4,
    CX + 14 + armSpread, torsoTop - armLift,
    0.7 + pulse * 0.3, eruption * 0.8,
  );

  // Lava eruption jets from fists
  if (eruption > 0) {
    const lFistX = CX - 14 - armSpread;
    const lFistY = torsoTop - armLift;
    const rFistX = CX + 14 + armSpread;
    const rFistY = torsoTop - armLift;

    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI * 0.5 + (i - 2) * 0.25;
      const dist = eruption * (8 + (i % 3) * 4) + pulse * 2;
      // Left fist jets
      g.moveTo(lFistX, lFistY)
        .lineTo(lFistX + Math.cos(angle) * dist, lFistY + Math.sin(angle) * dist)
        .stroke({ color: i % 2 === 0 ? COL_LAVA_BRIGHT : COL_LAVA_MID, width: 1.5, alpha: eruption * 0.6 });
      // Right fist jets
      g.moveTo(rFistX, rFistY)
        .lineTo(rFistX - Math.cos(angle) * dist, rFistY + Math.sin(angle) * dist)
        .stroke({ color: i % 2 === 0 ? COL_LAVA_BRIGHT : COL_LAVA_MID, width: 1.5, alpha: eruption * 0.6 });
    }
    // Lava orbs at fist tips
    g.circle(lFistX, lFistY, 3 + eruption * 3 + pulse * 1.5)
      .fill({ color: COL_LAVA_HOT, alpha: eruption * 0.5 });
    g.circle(rFistX, rFistY, 3 + eruption * 3 + pulse * 1.5)
      .fill({ color: COL_LAVA_HOT, alpha: eruption * 0.5 });
  }

  // Heavy smoke and ash eruption
  const smokeCount = Math.floor(3 + intensity * 4);
  drawSmoke(g, CX - 5, torsoTop - 2, smokeCount, t * 10, 0.4 + intensity * 0.2);
  drawSmoke(g, CX + 4, torsoTop - 1, smokeCount - 1, t * 7 + 2, 0.35 + intensity * 0.2);
  drawSmoke(g, CX, headTop - 2, 3, t * 9 + 1, 0.3 + intensity * 0.15);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const coolDown = clamp01(t * 1.2);    // lava cooling to grey
  const crumble  = clamp01((t - 0.3) / 0.5);
  const collapse = clamp01((t - 0.5) / 0.5);

  // Lava veins cool: lava pulse fades to 0
  const pulse = (1 - coolDown) * 0.8;

  // Body sags and crumbles forward
  const sag = collapse * 10;
  const lean = collapse * 5;

  const torsoH = 13;
  const headH  = 10;
  const footY  = GY - 1;
  const hipY   = footY - 12 + sag * 0.5;
  const torsoTop = hipY - torsoH * (1 - collapse * 0.25) + sag * 0.3;
  const headTop  = torsoTop - headH - 1;

  // Cooling cracks spread across body — now grey
  if (crumble > 0) {
    for (let i = 0; i < 6; i++) {
      const cx2 = CX - 6 + i * 3;
      const cy2 = torsoTop + 3 + (i % 3) * 3;
      g.moveTo(cx2, cy2)
        .lineTo(cx2 + 3 + (i % 2) * 2, cy2 - 3 - (i % 3))
        .stroke({ color: COL_CRACK_COOL, width: 0.6, alpha: crumble * 0.7 });
    }
  }

  drawShadow(g, CX + lean * 0.3, 0.3 * (1 - collapse * 0.5), 14, 3);

  // Legs buckling
  const lFootX = CX - 7 + collapse * 2;
  const rFootX = CX + 7 - collapse * 2;
  const kneeY  = footY - 6 + sag * 0.3;
  drawUpperLeg(g, lFootX, hipY, lFootX, kneeY, pulse);
  drawUpperLeg(g, rFootX, hipY, rFootX, kneeY, pulse);
  drawLowerLeg(g, lFootX, kneeY, lFootX + collapse * 2, footY - 4, pulse);
  drawLowerLeg(g, rFootX, kneeY, rFootX - collapse * 2, footY - 4, pulse);
  drawFoot(g, lFootX + collapse, footY, 0, crumble);
  drawFoot(g, rFootX - collapse, footY, 0, crumble);

  // Torso — darkening to obsidian, crumbling chunks
  const bodyAlpha = 1 - collapse * 0.4;
  const obsidianBlend = coolDown;

  // Draw torso — interpolate colour toward obsidian
  const torsoW = 18;
  const torsoColor = lerp(COL_ROCK_MID, COL_OBSIDIAN, obsidianBlend);
  g.roundRect(CX - torsoW / 2 + lean * 0.3, torsoTop, torsoW, torsoH * (1 - collapse * 0.15), 2)
    .fill({ color: Math.round(torsoColor) })
    .stroke({ color: COL_OBSIDIAN, width: 0.6, alpha: bodyAlpha });
  // Cooled crack lines (grey)
  if (crumble > 0) {
    g.moveTo(CX + lean * 0.3, torsoTop + 2).lineTo(CX + lean * 0.3, torsoTop + torsoH - 2)
      .stroke({ color: COL_CRACK_COOL, width: 1, alpha: crumble * 0.5 });
  }

  // Head drooping, darkening
  if (collapse < 0.85) {
    const headAlpha = 1 - collapse * 0.6;
    const hw = 13;
    const hh = 10 * (1 - collapse * 0.2);
    const hx = CX + lean * 0.4 - hw / 2;
    const hy = headTop + sag * 0.15;
    g.roundRect(hx, hy, hw, hh, 1.5)
      .fill({ color: Math.round(lerp(COL_ROCK_MID, COL_OBSIDIAN, obsidianBlend)) })
      .stroke({ color: COL_OBSIDIAN, width: 0.5, alpha: headAlpha });
    // Eyes dim out
    if (pulse > 0) {
      g.circle(CX - 3 + lean * 0.4, hy + hh * 0.4, 1.8)
        .fill({ color: COL_EYE_FIRE, alpha: pulse * 0.5 * headAlpha });
      g.circle(CX + 3 + lean * 0.4, hy + hh * 0.4, 1.8)
        .fill({ color: COL_EYE_FIRE, alpha: pulse * 0.5 * headAlpha });
    }
  }

  // Arms slump down
  const armSlump = collapse * 8;
  drawArm(
    g,
    CX - 9 + lean * 0.2, torsoTop + 2,
    CX - 11, torsoTop + 9 + armSlump * 0.4,
    CX - 10, torsoTop + 16 + armSlump,
    pulse * 0.5, 0,
  );
  drawArm(
    g,
    CX + 9 + lean * 0.2, torsoTop + 2,
    CX + 11, torsoTop + 9 + armSlump * 0.4,
    CX + 10, torsoTop + 16 + armSlump,
    pulse * 0.5, 0,
  );

  // Crumbling chunks of obsidian break off
  if (collapse > 0.3) {
    const chunkCount = 6;
    for (let i = 0; i < chunkCount; i++) {
      const angle = -Math.PI * 0.5 + (i - chunkCount / 2) * 0.4;
      const dist = (collapse - 0.3) * (10 + (i % 4) * 4);
      const cx2 = CX + lean + Math.cos(angle) * dist;
      const cy2 = torsoTop + torsoH * 0.5 + Math.sin(angle) * dist * 0.5 + collapse * collapse * 6;
      const chunkAlpha = clamp01((1 - collapse) * 2);
      const chunkW = 2 + (i % 3);
      g.roundRect(cx2 - chunkW / 2, cy2 - chunkW * 0.6, chunkW, chunkW * 0.8, 0.5)
        .fill({ color: COL_OBSIDIAN, alpha: chunkAlpha })
        .stroke({ color: COL_OBSIDIAN_SHN, width: 0.3, alpha: chunkAlpha * 0.5 });
    }
  }

  // Final collapsed rubble pile at end
  if (collapse > 0.7) {
    const pileAlpha = (collapse - 0.7) / 0.3;
    g.ellipse(CX + lean * 0.4, footY - 2, 12 + collapse * 4, 5)
      .fill({ color: COL_OBSIDIAN, alpha: pileAlpha * 0.6 });
    g.ellipse(CX + lean * 0.4, footY - 1, 8, 3)
      .fill({ color: COL_OBSIDIAN_SHN, alpha: pileAlpha * 0.3 });
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
 * Generate all Magma Titan sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateMagmaTitanFrames(renderer: Renderer): RenderTexture[] {
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
