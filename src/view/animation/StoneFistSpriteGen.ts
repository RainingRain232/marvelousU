// Procedural sprite generator for the Stone Fist unit type.
//
// Draws a living stone golem at 48x48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Blocky rock body with cracks and inner glow
//   • Massive stone fists
//   • Glowing blue rune lines across body
//   • Stumpy rock legs / floating effect
//   • No head — face runes on torso top
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — living stone
const COL_ROCK       = 0x888877;
const COL_ROCK_HI    = 0xaaa999;
const COL_ROCK_DK    = 0x666655;
const COL_ROCK_DEEP  = 0x444433;
const COL_RUNE       = 0x44aaff;
const COL_RUNE_GLOW  = 0x88ccff;
const COL_CRACK      = 0x332222;
const COL_CRACK_GLOW = 0xff6622;
const COL_EYE        = 0x44aaff;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow ellipse at feet. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 16, h = 5): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Stumpy rock legs — two thick blocky rectangles. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 6;
  // Left leg
  g.roundRect(cx - 8 + stanceL, legTop, lw, legH, 1)
    .fill({ color: COL_ROCK_DK })
    .stroke({ color: COL_ROCK_DEEP, width: 0.6 });
  // Right leg
  g.roundRect(cx + 2 + stanceR, legTop, lw, legH, 1)
    .fill({ color: COL_ROCK_DK })
    .stroke({ color: COL_ROCK_DEEP, width: 0.6 });
}

/** Rock feet — wide blocky shapes. */
function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const fw = 8, fh = 4;
  g.roundRect(cx - 10 + stanceL, gy - fh, fw, fh, 1)
    .fill({ color: COL_ROCK_DK })
    .stroke({ color: COL_ROCK_DEEP, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - fh, fw, fh, 1)
    .fill({ color: COL_ROCK_DK })
    .stroke({ color: COL_ROCK_DEEP, width: 0.5 });
}

/** Main blocky torso — large rounded rectangle with cracks. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
  crackIntensity = 0.5,
): void {
  const tw = 18;
  const x = cx - tw / 2 + tilt;
  // Main body
  g.roundRect(x, torsoTop, tw, torsoH, 3)
    .fill({ color: COL_ROCK })
    .stroke({ color: COL_ROCK_DK, width: 1 });
  // Highlight ridge
  g.roundRect(x + 3, torsoTop + 2, tw - 6, 4, 2)
    .fill({ color: COL_ROCK_HI, alpha: 0.4 });

  // Cracks across body
  g.moveTo(x + 3, torsoTop + 4)
    .lineTo(x + 8, torsoTop + 8)
    .lineTo(x + 5, torsoTop + torsoH - 3)
    .stroke({ color: COL_CRACK, width: 0.8, alpha: crackIntensity });
  g.moveTo(x + tw - 4, torsoTop + 6)
    .lineTo(x + tw - 7, torsoTop + 10)
    .stroke({ color: COL_CRACK, width: 0.6, alpha: crackIntensity });

  // Crack inner glow
  g.moveTo(x + 3, torsoTop + 4)
    .lineTo(x + 8, torsoTop + 8)
    .lineTo(x + 5, torsoTop + torsoH - 3)
    .stroke({ color: COL_CRACK_GLOW, width: 0.4, alpha: crackIntensity * 0.4 });
}

/** Rune lines on body — glowing blue patterns. */
function drawRunes(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  glowAlpha: number,
  tilt = 0,
): void {
  const x = cx + tilt;
  // Vertical center rune
  g.moveTo(x, torsoTop + 3)
    .lineTo(x, torsoTop + torsoH - 2)
    .stroke({ color: COL_RUNE, width: 1.2, alpha: glowAlpha });
  // Horizontal cross runes
  g.moveTo(x - 6, torsoTop + torsoH * 0.4)
    .lineTo(x + 6, torsoTop + torsoH * 0.4)
    .stroke({ color: COL_RUNE, width: 1, alpha: glowAlpha * 0.8 });
  // Rune dots
  g.circle(x - 4, torsoTop + 5, 1.2).fill({ color: COL_RUNE_GLOW, alpha: glowAlpha });
  g.circle(x + 4, torsoTop + 5, 1.2).fill({ color: COL_RUNE_GLOW, alpha: glowAlpha });
  // Outer glow
  g.circle(x, torsoTop + torsoH * 0.4, 4)
    .fill({ color: COL_RUNE_GLOW, alpha: glowAlpha * 0.1 });
}

/** Head — blocky rock head with glowing eye slits. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
  eyeGlow = 0.8,
): void {
  const hw = 12, hh = 10;
  const x = cx - hw / 2 + tilt;
  // Head block
  g.roundRect(x, headTop, hw, hh, 2)
    .fill({ color: COL_ROCK })
    .stroke({ color: COL_ROCK_DK, width: 0.8 });
  // Highlight
  g.roundRect(x + 2, headTop + 1, 5, 3, 1)
    .fill({ color: COL_ROCK_HI, alpha: 0.4 });
  // Eye slits — glowing blue
  g.rect(x + 2, headTop + 4, 3, 2).fill({ color: COL_EYE, alpha: eyeGlow });
  g.rect(x + hw - 5, headTop + 4, 3, 2).fill({ color: COL_EYE, alpha: eyeGlow });
  // Eye glow halos
  g.circle(x + 3.5, headTop + 5, 2.5).fill({ color: COL_RUNE_GLOW, alpha: eyeGlow * 0.15 });
  g.circle(x + hw - 3.5, headTop + 5, 2.5).fill({ color: COL_RUNE_GLOW, alpha: eyeGlow * 0.15 });
  // Jaw crack
  g.moveTo(x + 3, headTop + hh - 2)
    .lineTo(x + hw / 2, headTop + hh)
    .lineTo(x + hw - 3, headTop + hh - 2)
    .stroke({ color: COL_CRACK, width: 0.5 });
}

/** Massive stone fist — large circle with knuckle detail. */
function drawFist(
  g: Graphics,
  fx: number,
  fy: number,
  size = 6,
  runeGlow = 0,
): void {
  // Fist body
  g.circle(fx, fy, size)
    .fill({ color: COL_ROCK })
    .stroke({ color: COL_ROCK_DK, width: 1 });
  // Knuckle highlights
  g.circle(fx - 2, fy - 2, 1.5).fill({ color: COL_ROCK_HI, alpha: 0.5 });
  g.circle(fx + 2, fy - 1, 1.2).fill({ color: COL_ROCK_HI, alpha: 0.4 });
  // Knuckle cracks
  g.moveTo(fx - 3, fy + 1)
    .lineTo(fx + 3, fy + 2)
    .stroke({ color: COL_CRACK, width: 0.5 });
  // Rune glow on fist
  if (runeGlow > 0) {
    g.circle(fx, fy, size + 2).fill({ color: COL_RUNE_GLOW, alpha: runeGlow * 0.15 });
    g.circle(fx, fy, 2).fill({ color: COL_RUNE, alpha: runeGlow * 0.6 });
  }
}

/** Stone arm — thick line from shoulder to fist. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROCK_DK, width: 5 });
  // Highlight along arm
  g.moveTo(sx, sy - 1).lineTo(ex, ey - 1).stroke({ color: COL_ROCK_HI, width: 1, alpha: 0.4 });
}

/** Shoulder boulders — large rounded shapes at shoulder joints. */
function drawShoulders(
  g: Graphics,
  cx: number,
  torsoTop: number,
  tilt = 0,
): void {
  g.ellipse(cx - 10 + tilt, torsoTop + 3, 5, 4)
    .fill({ color: COL_ROCK_HI })
    .stroke({ color: COL_ROCK_DK, width: 0.6 });
  g.ellipse(cx + 10 + tilt, torsoTop + 3, 5, 4)
    .fill({ color: COL_ROCK_HI })
    .stroke({ color: COL_ROCK_DK, width: 0.6 });
}

/** Impact shockwave ring. */
function drawShockwave(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
): void {
  g.circle(cx, cy, radius)
    .stroke({ color: COL_RUNE, width: 2, alpha });
  g.circle(cx, cy, radius * 0.6)
    .stroke({ color: COL_RUNE_GLOW, width: 1, alpha: alpha * 0.5 });
}

/** Blue rune circle on ground. */
function drawRuneCircle(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
): void {
  g.ellipse(cx, cy, radius, radius * 0.4)
    .stroke({ color: COL_RUNE, width: 1.5, alpha });
  g.ellipse(cx, cy, radius * 0.7, radius * 0.28)
    .stroke({ color: COL_RUNE_GLOW, width: 1, alpha: alpha * 0.7 });
  // Cross marks inside circle
  const r2 = radius * 0.5;
  g.moveTo(cx - r2, cy).lineTo(cx + r2, cy)
    .stroke({ color: COL_RUNE, width: 0.8, alpha: alpha * 0.6 });
  g.moveTo(cx, cy - r2 * 0.4).lineTo(cx, cy + r2 * 0.4)
    .stroke({ color: COL_RUNE, width: 0.8, alpha: alpha * 0.6 });
  // Rune dots at cardinal points
  g.circle(cx - r2, cy, 1.5).fill({ color: COL_RUNE_GLOW, alpha: alpha * 0.8 });
  g.circle(cx + r2, cy, 1.5).fill({ color: COL_RUNE_GLOW, alpha: alpha * 0.8 });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1); // floating bob
  const runeGlow = 0.4 + t * 0.4;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 14;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 1 + bob;
  const headTop = torsoTop - 10 + bob;

  // Fist clench pulse
  const fistSize = 5.5 + t * 1;

  drawShadow(g, CX, gy2);
  drawFeet(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, 0, 0.5);
  drawRunes(g, CX, torsoTop, torsoH, runeGlow);
  drawShoulders(g, CX, torsoTop);
  drawHead(g, CX, headTop, 0, runeGlow);

  // Left arm + fist
  drawArm(g, CX - 10, torsoTop + 5, CX - 16, torsoTop + torsoH - 2 + bob);
  drawFist(g, CX - 16, torsoTop + torsoH - 2 + bob, fistSize, runeGlow * 0.3);

  // Right arm + fist
  drawArm(g, CX + 10, torsoTop + 5, CX + 16, torsoTop + torsoH - 2 + bob);
  drawFist(g, CX + 16, torsoTop + torsoH - 2 + bob, fistSize, runeGlow * 0.3);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 2;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 14;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 1 - Math.round(bob * 0.5);
  const headTop = torsoTop - 10;
  const runeGlow = 0.5 + Math.abs(walkCycle) * 0.3;

  drawShadow(g, CX, gy2, 16 + Math.abs(walkCycle) * 3, 5);
  drawFeet(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.5);
  drawRunes(g, CX, torsoTop, torsoH, runeGlow, walkCycle * 0.5);
  drawShoulders(g, CX, torsoTop, walkCycle * 0.5);
  drawHead(g, CX, headTop, walkCycle * 0.5, runeGlow);

  // Arms swing with walk — heavy stomp feel
  const armSwingL = walkCycle * 4;
  const armSwingR = -walkCycle * 4;
  drawArm(g, CX - 10 + walkCycle * 0.5, torsoTop + 5,
    CX - 14 + armSwingL, torsoTop + torsoH - 1);
  drawFist(g, CX - 14 + armSwingL, torsoTop + torsoH - 1, 5.5, runeGlow * 0.2);

  drawArm(g, CX + 10 + walkCycle * 0.5, torsoTop + 5,
    CX + 14 + armSwingR, torsoTop + torsoH - 1);
  drawFist(g, CX + 14 + armSwingR, torsoTop + torsoH - 1, 5.5, runeGlow * 0.2);

  // Ground impact on downstep
  if (Math.abs(walkCycle) > 0.8) {
    const impactX = walkCycle > 0 ? CX - 7 + stanceL : CX + 5 + stanceR;
    drawShockwave(g, impactX, gy2, 4 + Math.abs(walkCycle) * 2, 0.2);
  }

  // Rune glow trail behind
  g.circle(CX - walkCycle * 6, torsoTop + torsoH * 0.5, 3)
    .fill({ color: COL_RUNE_GLOW, alpha: 0.08 });
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0-1=windup, 2=pull back, 3-4=punch forward, 5-6=impact+recover
  const phases = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 6;
  const torsoH = 14;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 10;

  // Lean into punch
  const lean = t < 0.5 ? t * 2 : (1 - t) * 4;

  // Right fist punch trajectory
  let fistX: number, fistY: number, fistSize: number;
  if (t < 0.3) {
    // Windup — pull fist back
    fistX = CX + 16 - t * 10;
    fistY = torsoTop + 6;
    fistSize = 6;
  } else if (t < 0.7) {
    // Punch forward — fist extends way out
    const punchT = (t - 0.3) / 0.4;
    fistX = CX + 10 + punchT * 18;
    fistY = torsoTop + 8 + punchT * 2;
    fistSize = 6 + punchT * 2;
  } else {
    // Recover
    const recT = (t - 0.7) / 0.3;
    fistX = CX + 28 - recT * 12;
    fistY = torsoTop + 10 - recT * 2;
    fistSize = 8 - recT * 2;
  }

  drawShadow(g, CX + lean * 2, gy2, 16 + lean * 2, 5);
  drawFeet(g, CX, gy2, -1, lean > 1 ? 3 : 0);
  drawLegs(g, CX, legTop, legH, -1, lean > 1 ? 3 : 0);
  drawTorso(g, CX, torsoTop, torsoH, lean * 2);
  drawRunes(g, CX, torsoTop, torsoH, 0.8, lean * 2);
  drawShoulders(g, CX, torsoTop, lean * 2);
  drawHead(g, CX, headTop, lean * 1.5, 0.9);

  // Left arm — guard position
  drawArm(g, CX - 10 + lean * 2, torsoTop + 5, CX - 14 + lean, torsoTop + 10);
  drawFist(g, CX - 14 + lean, torsoTop + 10, 5.5, 0.2);

  // Right arm — punching
  drawArm(g, CX + 10 + lean * 2, torsoTop + 5, fistX, fistY);
  drawFist(g, fistX, fistY, fistSize, t > 0.3 && t < 0.85 ? 0.8 : 0.2);

  // Impact shockwave at punch peak
  if (t >= 0.5 && t <= 0.85) {
    const impactT = (t - 0.5) / 0.35;
    drawShockwave(g, fistX + 4, fistY, 4 + impactT * 10, 0.6 - impactT * 0.5);
    // Impact sparks
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + t * 4;
      const dist = 3 + impactT * 6;
      g.circle(fistX + 4 + Math.cos(angle) * dist, fistY + Math.sin(angle) * dist, 1)
        .fill({ color: COL_RUNE_GLOW, alpha: 0.7 - impactT * 0.5 });
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: plants fists on ground, rune circle expands
  const t = frame / 5;
  const runeGlow = 0.5 + t * 0.5;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 14;
  const legTop = gy2 - 4 - legH;
  // Crouch down for ground plant
  const crouch = t < 0.4 ? t * 6 : 2.4;
  const torsoTop = legTop - torsoH + 1 + crouch;
  const headTop = torsoTop - 10;

  drawShadow(g, CX, gy2, 16 + t * 6, 5 + t * 2);
  drawFeet(g, CX, gy2, -2, 2);
  drawLegs(g, CX, legTop, legH - Math.round(crouch * 0.4), -2, 2);
  drawTorso(g, CX, torsoTop, torsoH, 0, 0.3 + t * 0.5);
  drawRunes(g, CX, torsoTop, torsoH, runeGlow);
  drawShoulders(g, CX, torsoTop);
  drawHead(g, CX, headTop, 0, runeGlow);

  // Arms reach down to plant fists on ground
  const fistY = t < 0.3 ? torsoTop + torsoH + t * 15 : gy2 - 4;
  drawArm(g, CX - 10, torsoTop + 5, CX - 10, fistY);
  drawFist(g, CX - 10, fistY, 5.5, runeGlow * 0.6);
  drawArm(g, CX + 10, torsoTop + 5, CX + 10, fistY);
  drawFist(g, CX + 10, fistY, 5.5, runeGlow * 0.6);

  // Expanding rune circle on ground
  if (t > 0.25) {
    const circleT = (t - 0.25) / 0.75;
    const circleR = 6 + circleT * 16;
    drawRuneCircle(g, CX, gy2, circleR, runeGlow * (1 - circleT * 0.3));

    // Rising rune particles
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + t * 3;
      const dist = circleR * 0.7;
      const py = gy2 - circleT * 8 * (i % 2 + 1);
      g.circle(CX + Math.cos(angle) * dist, py, 1.2)
        .fill({ color: COL_RUNE_GLOW, alpha: 0.5 * (1 - circleT * 0.5) });
    }
  }

  // Intense glow at fist-ground contact
  if (t > 0.3) {
    g.circle(CX - 10, gy2 - 2, 4).fill({ color: COL_RUNE, alpha: 0.15 });
    g.circle(CX + 10, gy2 - 2, 4).fill({ color: COL_RUNE, alpha: 0.15 });
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: cracks spread, chunks break off, rune glow fades
  const t = frame / 6;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 14;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 10;

  // Progressive cracking and collapse
  const crackSpread = t;
  const runeGlow = Math.max(0, 0.8 - t * 1.2);
  const collapse = t * t * 6;

  drawShadow(g, CX, gy2, 16 + t * 4, 5);

  // Legs crumble
  if (t < 0.7) {
    drawFeet(g, CX, gy2, t * 3, -t * 2);
    drawLegs(g, CX, legTop + collapse * 0.3, legH * (1 - t * 0.4), t * 3, -t * 2);
  }

  // Torso cracks and drops
  if (t < 0.85) {
    drawTorso(g, CX + t * 2, torsoTop + collapse, torsoH * (1 - t * 0.2), t * 3, crackSpread);
    drawRunes(g, CX + t * 2, torsoTop + collapse, torsoH * (1 - t * 0.2), runeGlow, t * 3);
    drawShoulders(g, CX + t * 2, torsoTop + collapse, t * 3);
  }

  // Head falls off
  if (t < 0.6) {
    drawHead(g, CX + t * 5, headTop + collapse * 1.5 + t * t * 8, t * 4, runeGlow);
  }

  // Fists drop to sides
  if (t < 0.5) {
    const fistDrop = t * 12;
    drawArm(g, CX - 10, torsoTop + 5 + collapse, CX - 14, torsoTop + torsoH + fistDrop);
    drawFist(g, CX - 14, torsoTop + torsoH + fistDrop, 5.5 * (1 - t * 0.3), runeGlow * 0.3);
    drawArm(g, CX + 10, torsoTop + 5 + collapse, CX + 14, torsoTop + torsoH + fistDrop);
    drawFist(g, CX + 14, torsoTop + torsoH + fistDrop, 5.5 * (1 - t * 0.3), runeGlow * 0.3);
  }

  // Debris chunks flying off
  if (t > 0.3) {
    const chunkT = (t - 0.3) / 0.7;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI + 0.5;
      const dist = chunkT * 12 + i * 2;
      const cx2 = CX + Math.cos(angle) * dist;
      const cy2 = torsoTop + torsoH * 0.5 + Math.sin(angle) * dist + chunkT * chunkT * 8;
      const chunkSize = 2 + (i % 3);
      g.roundRect(cx2, cy2, chunkSize, chunkSize, 0.5)
        .fill({ color: i % 2 === 0 ? COL_ROCK : COL_ROCK_DK, alpha: 1 - chunkT * 0.7 });
    }
  }

  // Fading rune sparks
  if (t > 0.2 && t < 0.8) {
    for (let i = 0; i < 3; i++) {
      const sparkAngle = (i / 3) * Math.PI * 2 + t * 5;
      const sparkDist = 6 + t * 8;
      g.circle(CX + Math.cos(sparkAngle) * sparkDist,
        torsoTop + torsoH * 0.5 + Math.sin(sparkAngle) * sparkDist, 1)
        .fill({ color: COL_RUNE, alpha: runeGlow * 0.6 });
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
 * Generate all Stone Fist sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateStoneFistFrames(
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
