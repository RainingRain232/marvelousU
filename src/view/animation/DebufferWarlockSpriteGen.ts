// Procedural sprite generator for the Debuffer Warlock unit type.
//
// Draws a shadow mage at 48x48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Dark robes with purple trim
//   • Skull-topped staff
//   • Purple/black swirling energy
//   • Hunched menacing posture
//   • Glowing red eyes
//   • Dark energy particles
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — shadow warlock
const COL_ROBE       = 0x221133;
const COL_ROBE_DK    = 0x110022;
const COL_ROBE_TRIM  = 0x443366;
const COL_ROBE_HI    = 0x332244;
const COL_STAFF      = 0x443322;
const COL_STAFF_DK   = 0x332211;
const COL_SKULL      = 0xe0d8c8;
const COL_SKULL_DK   = 0xc8bfb0;
const COL_SKULL_TEETH= 0xd0c8b8;
const COL_ENERGY     = 0x8833cc;
const COL_ENERGY_DK  = 0x221144;
const COL_ENERGY_LT  = 0xaa55ee;
const COL_EYE        = 0xff4444;
const COL_EYE_GLOW   = 0xff6666;
const COL_SKIN       = 0x998877;
const COL_BOOT       = 0x1a1122;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow ellipse at feet. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.35 });
}

/** Dark boots barely visible under robe. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 4, bh = 4;
  g.roundRect(cx - 5 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT });
  g.roundRect(cx + 1 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT });
}

/** Hunched robe torso — dark with purple trim. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
  hunch = 2,
): void {
  const tw = 13;
  const x = cx - tw / 2 + tilt;
  // Main robe
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.6 });
  // Trim lines
  g.moveTo(x + 1, torsoTop).lineTo(x + 1, torsoTop + torsoH)
    .stroke({ color: COL_ROBE_TRIM, width: 0.8, alpha: 0.6 });
  g.moveTo(x + tw - 1, torsoTop).lineTo(x + tw - 1, torsoTop + torsoH)
    .stroke({ color: COL_ROBE_TRIM, width: 0.8, alpha: 0.6 });
  // Hunch — raised shoulder area
  g.ellipse(cx + tilt, torsoTop + 1, tw * 0.55, hunch + 1)
    .fill({ color: COL_ROBE_HI });
  // Dark seam
  g.moveTo(cx + tilt, torsoTop + 2).lineTo(cx + tilt, torsoTop + torsoH)
    .stroke({ color: COL_ROBE_DK, width: 0.4 });
}

/** Long flowing robe skirt. */
function drawRobeSkirt(
  g: Graphics,
  cx: number,
  skirtTop: number,
  skirtH: number,
  sway: number,
  tilt = 0,
): void {
  const tw = 15;
  const x = cx - tw / 2 + tilt;
  g.moveTo(x + 1, skirtTop)
    .lineTo(x + tw - 1, skirtTop)
    .lineTo(x + tw + 1 + sway * 2, skirtTop + skirtH)
    .lineTo(x - 1 + sway, skirtTop + skirtH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.5 });
  // Bottom trim
  g.moveTo(x - 1 + sway, skirtTop + skirtH)
    .lineTo(x + tw + 1 + sway * 2, skirtTop + skirtH)
    .stroke({ color: COL_ROBE_TRIM, width: 1, alpha: 0.7 });
}

/** Hood/head — deep cowl with glowing red eyes. */
function drawHood(
  g: Graphics,
  cx: number,
  hoodTop: number,
  tilt = 0,
  eyeGlow = 0.8,
): void {
  const hw = 10, hh = 10;
  const x = cx - hw / 2 + tilt;
  // Hood exterior
  g.roundRect(x, hoodTop, hw, hh, 4)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.7 });
  // Hood interior (dark void)
  g.roundRect(x + 2, hoodTop + 3, hw - 4, hh - 4, 2)
    .fill({ color: 0x0a0010 });
  // Glowing red eyes in shadow
  g.circle(x + 3, hoodTop + 5, 1).fill({ color: COL_EYE, alpha: eyeGlow });
  g.circle(x + hw - 3, hoodTop + 5, 1).fill({ color: COL_EYE, alpha: eyeGlow });
  // Eye glow halos
  g.circle(x + 3, hoodTop + 5, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });
  g.circle(x + hw - 3, hoodTop + 5, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.15 });
  // Hood point
  g.moveTo(cx + tilt - 3, hoodTop)
    .lineTo(cx + tilt, hoodTop - 2)
    .lineTo(cx + tilt + 3, hoodTop)
    .closePath()
    .fill({ color: COL_ROBE });
}

/** Skull-topped staff. */
function drawStaff(
  g: Graphics,
  baseX: number,
  baseY: number,
  topX: number,
  topY: number,
  skullGlow = 0,
): void {
  // Shaft
  g.moveTo(baseX, baseY).lineTo(topX, topY)
    .stroke({ color: COL_STAFF, width: 2.5 });
  // Shaft highlight
  g.moveTo(baseX - 0.5, baseY).lineTo(topX - 0.5, topY)
    .stroke({ color: COL_STAFF_DK, width: 0.6, alpha: 0.5 });

  // Skull at top
  const skullR = 3.5;
  // Cranium
  g.ellipse(topX, topY - 1, skullR, skullR * 0.9)
    .fill({ color: COL_SKULL })
    .stroke({ color: COL_SKULL_DK, width: 0.5 });
  // Eye sockets
  g.circle(topX - 1.2, topY - 1, 0.9).fill({ color: 0x1a1a1a });
  g.circle(topX + 1.2, topY - 1, 0.9).fill({ color: 0x1a1a1a });
  // Nasal cavity
  g.moveTo(topX, topY + 0.5)
    .lineTo(topX - 0.5, topY + 1)
    .lineTo(topX + 0.5, topY + 1)
    .closePath()
    .fill({ color: 0x1a1a1a });
  // Teeth
  g.rect(topX - 2, topY + 1.5, 4, 1).fill({ color: COL_SKULL_TEETH });
  g.moveTo(topX, topY + 1.5).lineTo(topX, topY + 2.5)
    .stroke({ color: 0x1a1a1a, width: 0.3 });

  // Skull eye glow (when casting/attacking)
  if (skullGlow > 0) {
    g.circle(topX - 1.2, topY - 1, 0.7).fill({ color: COL_EYE, alpha: skullGlow });
    g.circle(topX + 1.2, topY - 1, 0.7).fill({ color: COL_EYE, alpha: skullGlow });
    g.circle(topX, topY - 1, 5).fill({ color: COL_EYE_GLOW, alpha: skullGlow * 0.1 });
  }
}

/** Thin arm (barely visible under robe sleeve). */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_TRIM, width: 2.5 });
  // Bony hand
  g.circle(ex, ey, 1.5).fill({ color: COL_SKIN });
}

/** Swirling dark energy particles. */
function drawDarkEnergy(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  total: number,
  count = 4,
  radius = 8,
  alpha = 0.4,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (frame / total) * Math.PI * 2;
    const dist = radius + Math.sin(angle * 3) * 2;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.6;
    // Dark outer
    g.circle(px, py, 1.8).fill({ color: COL_ENERGY_DK, alpha: alpha * 0.7 });
    // Purple inner
    g.circle(px, py, 1).fill({ color: COL_ENERGY, alpha: alpha });
    // Trail
    const trailAngle = angle - 0.6;
    const trailDist = dist - 2;
    g.moveTo(px, py)
      .lineTo(cx + Math.cos(trailAngle) * trailDist, cy + Math.sin(trailAngle) * trailDist * 0.6)
      .stroke({ color: COL_ENERGY, width: 0.5, alpha: alpha * 0.3 });
  }
}

/** Purple bolt projectile. */
function drawPurpleBolt(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  alpha: number,
): void {
  // Bolt core
  g.moveTo(sx, sy).lineTo(ex, ey)
    .stroke({ color: COL_ENERGY_LT, width: 2, alpha });
  // Bolt glow
  g.moveTo(sx, sy).lineTo(ex, ey)
    .stroke({ color: COL_ENERGY, width: 4, alpha: alpha * 0.3 });
  // Tip glow
  g.circle(ex, ey, 2.5).fill({ color: COL_ENERGY_LT, alpha: alpha * 0.5 });
  g.circle(ex, ey, 4).fill({ color: COL_ENERGY, alpha: alpha * 0.15 });
}

/** Dark vortex effect. */
function drawVortex(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  frame: number,
  alpha: number,
): void {
  // Concentric spiral rings
  for (let ring = 0; ring < 3; ring++) {
    const r = radius * (0.4 + ring * 0.3);
    const rotOffset = frame * 0.8 + ring * 1.2;
    g.ellipse(cx, cy, r, r * 0.35)
      .stroke({ color: ring === 1 ? COL_ENERGY : COL_ENERGY_DK, width: 1.2, alpha: alpha * (1 - ring * 0.2) });
    // Spiral dots
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rotOffset;
      g.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.35, 1)
        .fill({ color: COL_ENERGY_LT, alpha: alpha * 0.6 });
    }
  }
  // Center dark void
  g.circle(cx, cy, radius * 0.2)
    .fill({ color: COL_ENERGY_DK, alpha: alpha * 0.8 });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);
  const eyeGlow = 0.5 + t * 0.4;

  const gy2 = GY;
  const legH = 4;
  const torsoH = 11;
  const skirtH = 7;
  const legTop = gy2 - 4 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 3 + bob;
  const hoodTop = torsoTop - 10 + bob;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, 0, 0);
  drawRobeSkirt(g, CX, skirtTop, skirtH, (t - 0.5) * 0.8);
  drawTorso(g, CX, torsoTop, torsoH, 0, 2 + t * 0.5);
  drawHood(g, CX, hoodTop, 0, eyeGlow);

  // Staff arm (left) — staff held upright
  const staffBaseX = CX - 8;
  const staffBaseY = torsoTop + torsoH + 4;
  const staffTopX = CX - 6;
  const staffTopY = hoodTop - 4 + bob;
  drawArm(g, CX - 6, torsoTop + 4, staffBaseX, torsoTop + torsoH - 2 + bob);
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 0);

  // Right arm hanging
  drawArm(g, CX + 6, torsoTop + 4, CX + 8, torsoTop + torsoH - 1 + bob);

  // Dark energy swirling around staff top
  drawDarkEnergy(g, staffTopX, staffTopY, frame, 8, 3, 5, 0.2 + t * 0.15);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1;

  const gy2 = GY;
  const legH = 4;
  const torsoH = 11;
  const skirtH = 7;
  const stanceL = Math.round(walkCycle * 2);
  const stanceR = Math.round(-walkCycle * 2);
  const legTop = gy2 - 4 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 3 - Math.round(bob * 0.3);
  const hoodTop = torsoTop - 10;

  // Gliding motion — less leg movement, more floating
  const sway = -walkCycle * 1.2;

  drawShadow(g, CX, gy2, 12 + Math.abs(walkCycle), 3);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawRobeSkirt(g, CX, skirtTop, skirtH, sway, walkCycle * 0.3);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3, 2);
  drawHood(g, CX, hoodTop, walkCycle * 0.3, 0.7);

  // Staff arm glides with body
  const staffBaseX = CX - 8 + walkCycle;
  const staffBaseY = torsoTop + torsoH + 4;
  const staffTopX = CX - 6 + walkCycle * 0.5;
  const staffTopY = hoodTop - 4;
  drawArm(g, CX - 6 + walkCycle * 0.3, torsoTop + 4, staffBaseX, torsoTop + torsoH - 2);
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 0);

  // Right arm sways
  drawArm(g, CX + 6 + walkCycle * 0.3, torsoTop + 4,
    CX + 8 - walkCycle, torsoTop + torsoH - 1);

  // Dark trail behind
  g.circle(CX - walkCycle * 5, torsoTop + torsoH * 0.5, 3)
    .fill({ color: COL_ENERGY_DK, alpha: 0.1 });
  g.circle(CX - walkCycle * 8, torsoTop + torsoH * 0.5 + 2, 2)
    .fill({ color: COL_ENERGY_DK, alpha: 0.06 });

  // Staff energy wisps during movement
  drawDarkEnergy(g, staffTopX, staffTopY, frame, 8, 2, 4, 0.15);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0-1=aim, 2-3=skull eyes glow, 4-5=fire bolt, 6=recover
  const phases = [0, 0.12, 0.28, 0.45, 0.62, 0.8, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 4;
  const torsoH = 11;
  const skirtH = 7;
  const legTop = gy2 - 4 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 3;
  const hoodTop = torsoTop - 10;

  // Lean forward to point staff
  const lean = t < 0.45 ? t * 3 : (1 - t) * 3;
  const skullGlow = t > 0.2 && t < 0.8 ? Math.min((t - 0.2) * 3, 1) : 0;

  drawShadow(g, CX + lean * 0.5, gy2, 12 + lean, 3);
  drawBoots(g, CX, gy2, 0, lean > 1 ? 2 : 0);
  drawRobeSkirt(g, CX, skirtTop, skirtH, -lean * 0.3, lean * 0.3);
  drawTorso(g, CX, torsoTop, torsoH, lean, 2);
  drawHood(g, CX, hoodTop, lean * 0.5, 0.5 + skullGlow * 0.5);

  // Staff arm — points staff forward
  const staffBaseX = CX - 6 + lean * 2;
  const staffBaseY = torsoTop + torsoH + 2;
  const staffTopX = CX - 4 + lean * 4;
  const staffTopY = hoodTop - 3 + lean;
  drawArm(g, CX - 6 + lean, torsoTop + 4, staffBaseX, torsoTop + torsoH - 2);
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, skullGlow);

  // Right arm braces
  drawArm(g, CX + 6 + lean * 0.5, torsoTop + 4, CX + 9 + lean, torsoTop + 8);

  // Purple bolt fires from skull
  if (t >= 0.45 && t <= 0.85) {
    const boltT = (t - 0.45) / 0.4;
    const boltStartX = staffTopX + 2;
    const boltStartY = staffTopY;
    const boltEndX = boltStartX + boltT * 20;
    const boltEndY = boltStartY + boltT * 4;
    drawPurpleBolt(g, boltStartX, boltStartY, boltEndX, boltEndY, 0.8 - boltT * 0.4);
  }

  // Dark energy swirl at staff during charge
  if (t > 0.15 && t < 0.5) {
    drawDarkEnergy(g, staffTopX, staffTopY, frame, 7, 4, 6, 0.4);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: raises staff high, massive dark vortex expands
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const legH = 4;
  const torsoH = 11;
  const skirtH = 7;
  const legTop = gy2 - 4 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 3;
  const hoodTop = torsoTop - 10;

  drawShadow(g, CX, gy2, 12 + t * 6, 3 + t * 2);
  drawBoots(g, CX, gy2, -1, 1);
  drawRobeSkirt(g, CX, skirtTop, skirtH, pulse * 0.6 - 0.3);
  drawTorso(g, CX, torsoTop, torsoH, 0, 3);
  drawHood(g, CX, hoodTop, 0, 0.7 + t * 0.3);

  // Both arms raise staff overhead
  const raiseT = Math.min(t * 2.5, 1);
  const staffTopY = lerp(hoodTop - 4, hoodTop - 14, raiseT);
  const staffBaseY = lerp(torsoTop + torsoH + 2, torsoTop + 2, raiseT);

  drawArm(g, CX - 6, torsoTop + 4, CX - 3, lerp(torsoTop + 8, torsoTop - 2, raiseT));
  drawArm(g, CX + 6, torsoTop + 4, CX + 2, lerp(torsoTop + 8, torsoTop - 1, raiseT));
  drawStaff(g, CX, staffBaseY, CX, staffTopY, 0.5 + t * 0.5);

  // Massive dark vortex expanding from below
  if (t > 0.2) {
    const vortexT = (t - 0.2) / 0.8;
    const vortexR = 6 + vortexT * 16;
    drawVortex(g, CX, gy2 - 2, vortexR, frame, 0.5 + vortexT * 0.3);
  }

  // Dark energy swirling intensely around staff
  drawDarkEnergy(g, CX, staffTopY, frame, 6, 5 + Math.round(t * 3), 6 + t * 6, 0.3 + t * 0.3);

  // Rising dark particles
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const py = gy2 - (t - 0.3) * 15 * (i + 1) * 0.4;
      const px = CX + Math.sin(t * 5 + i * 2) * 8;
      g.circle(px, py, 1.2)
        .fill({ color: COL_ENERGY, alpha: 0.3 * (1 - t * 0.4) });
    }
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: dark energy implodes inward, robes collapse empty
  const t = frame / 6;

  const gy2 = GY;
  const legH = 4;
  const torsoH = 11;
  const skirtH = 7;
  const legTop = gy2 - 4 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 3;
  const hoodTop = torsoTop - 10;

  // Implosion center
  const implodeCX = CX;
  const implodeCY = torsoTop + torsoH * 0.4;

  drawShadow(g, CX, gy2, 12 - t * 4, 3);

  // Energy implodes inward — particles rush toward center
  if (t < 0.7) {
    const implodeT = t / 0.7;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const startDist = 16;
      const dist = startDist * (1 - implodeT);
      const px = implodeCX + Math.cos(angle) * dist;
      const py = implodeCY + Math.sin(angle) * dist * 0.7;
      g.circle(px, py, 1.5 - implodeT * 0.8)
        .fill({ color: i % 2 === 0 ? COL_ENERGY : COL_ENERGY_DK, alpha: 0.6 * (1 - implodeT) });
      // Streak toward center
      g.moveTo(px, py)
        .lineTo(implodeCX + Math.cos(angle) * dist * 0.5,
          implodeCY + Math.sin(angle) * dist * 0.5 * 0.7)
        .stroke({ color: COL_ENERGY, width: 0.6, alpha: 0.3 * (1 - implodeT) });
    }
  }

  // Robes collapse — shrinking and flattening
  const collapse = t * t;
  const robeAlpha = Math.max(0, 1 - t * 1.2);

  if (robeAlpha > 0) {
    // Skirt crumples
    const skirtShrink = 1 - collapse * 0.5;
    g.moveTo(CX - 7 * skirtShrink, skirtTop + collapse * 8)
      .lineTo(CX + 7 * skirtShrink, skirtTop + collapse * 8)
      .lineTo(CX + 8 * skirtShrink, skirtTop + skirtH + collapse * 4)
      .lineTo(CX - 8 * skirtShrink, skirtTop + skirtH + collapse * 4)
      .closePath()
      .fill({ color: COL_ROBE, alpha: robeAlpha });

    // Torso deflates
    if (t < 0.6) {
      const torsoShrink = 1 - t * 0.8;
      g.roundRect(CX - 6 * torsoShrink, torsoTop + collapse * 10,
        12 * torsoShrink, torsoH * torsoShrink, 2)
        .fill({ color: COL_ROBE, alpha: robeAlpha })
        .stroke({ color: COL_ROBE_DK, width: 0.5, alpha: robeAlpha });
    }

    // Hood sinks
    if (t < 0.5) {
      const eyeFade = Math.max(0, 0.8 - t * 2);
      drawHood(g, CX, hoodTop + collapse * 15, 0, eyeFade);
    }
  }

  // Staff falls
  if (t < 0.8) {
    const staffFallAngle = t * 2;
    const staffX = CX - 8 + t * 6;
    const staffTopX = staffX + Math.sin(staffFallAngle) * 18;
    const staffTopY = hoodTop - 4 + t * t * 15;
    drawStaff(g, staffX, gy2 - 2, staffTopX, staffTopY, Math.max(0, 0.3 - t * 0.5));
  }

  // Final implosion flash
  if (t >= 0.5 && t <= 0.7) {
    const flashT = (t - 0.5) / 0.2;
    g.circle(implodeCX, implodeCY, 3 + flashT * 5)
      .fill({ color: COL_ENERGY, alpha: 0.3 * (1 - flashT) });
  }

  // Residual dark wisps
  if (t > 0.6) {
    const wispT = (t - 0.6) / 0.4;
    for (let i = 0; i < 3; i++) {
      const wispY = implodeCY - wispT * 8 * (i + 1);
      g.circle(implodeCX + (i - 1) * 3, wispY, 0.8)
        .fill({ color: COL_ENERGY_DK, alpha: 0.3 * (1 - wispT) });
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 7 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

/**
 * Generate all Debuffer Warlock sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateDebufferWarlockFrames(
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
