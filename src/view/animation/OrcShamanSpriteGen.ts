// Procedural sprite generator for the Orc Shaman unit type.
//
// Draws a muscular green-skinned orc in tribal robes at 48x48 pixels
// per frame using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Broad muscular green-skinned frame
//   - Tribal robes with bone/skull decorations
//   - Gnarled staff with flame on top in right hand
//   - Bone necklace around neck
//   - Red/orange war paint markings on face and arms
//   - Red/orange fire magic effects on cast
//   - Fierce aggressive stance
//   - Tusks protruding from lower jaw

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- orcish tribal
const COL_SKIN = 0x4a8a3a;
const COL_SKIN_DK = 0x3a6a2a;
const COL_SKIN_SHADOW = 0x2e5420;

const COL_ROBE = 0x5a3828;        // dark tribal leather robe
const COL_ROBE_DK = 0x3e2418;
const COL_ROBE_TRIM = 0x8a6040;   // fur trim

const COL_BONE = 0xd8d0b8;        // bone decorations
const COL_BONE_DK = 0xb0a890;
const COL_SKULL = 0xd4ccb0;
const COL_SKULL_EYE = 0x222222;

const COL_STAFF = 0x5a4028;       // gnarled wood
const COL_STAFF_DK = 0x3e2c18;
const COL_STAFF_KNOT = 0x4a3420;

const COL_FLAME = 0xff6622;       // staff flame
const COL_FLAME_HI = 0xffaa44;
const COL_FLAME_DK = 0xcc3300;
const COL_FLAME_CORE = 0xffdd66;

const COL_WARPAINT = 0xcc2200;    // red war paint

const COL_EYE = 0xcc4400;         // fierce amber eyes
const COL_EYE_GLOW = 0xff6600;
const COL_TUSK = 0xe0d8c0;

const COL_BOOT = 0x3a2c1e;
const COL_BOOT_WRAP = 0x4a3828;   // leather wrappings

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
  w = 12,
  h = 3,
  alpha = 0.35,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 5;
  const bh = 4;
  // Left boot -- leather wrappings
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT });
  // Wrap straps
  g.moveTo(cx - 6 + stanceL, gy - bh + 1)
    .lineTo(cx - 4 + stanceL, gy - 1)
    .stroke({ color: COL_BOOT_WRAP, width: 0.5, alpha: 0.6 });

  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT });
  g.moveTo(cx + 3 + stanceR, gy - bh + 1)
    .lineTo(cx + 5 + stanceR, gy - 1)
    .stroke({ color: COL_BOOT_WRAP, width: 0.5, alpha: 0.6 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Muscular green legs under robe
  g.rect(cx - 6 + stanceL, legTop, 4, legH).fill({ color: COL_SKIN_DK });
  g.rect(cx + 2 + stanceR, legTop, 4, legH).fill({ color: COL_SKIN_DK });
  // Robe hanging over upper legs
  g.rect(cx - 7, legTop, 14, legH * 0.4).fill({ color: COL_ROBE_DK });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 14; // broad orc frame
  const x = cx - tw / 2 + tilt;

  // Muscular torso visible under open robe
  g.roundRect(x + 1, top, tw - 2, h, 2).fill({ color: COL_SKIN });
  // Chest muscle definition
  g.moveTo(cx + tilt, top + 2)
    .lineTo(cx + tilt, top + h * 0.6)
    .stroke({ color: COL_SKIN_DK, width: 0.5, alpha: 0.4 });

  // Tribal robe -- open front
  g.moveTo(x, top)
    .lineTo(x + 3, top + h)
    .stroke({ color: COL_ROBE, width: 3 });
  g.moveTo(x + tw, top)
    .lineTo(x + tw - 3, top + h)
    .stroke({ color: COL_ROBE, width: 3 });
  // Robe shoulders
  g.roundRect(x - 1, top, tw + 2, 3, 1).fill({ color: COL_ROBE });
  // Fur trim on shoulders
  for (let i = 0; i < tw + 2; i += 2) {
    g.rect(x - 1 + i, top - 0.5, 1.5, 1.5).fill({ color: COL_ROBE_TRIM, alpha: 0.6 });
  }

  // Bone necklace
  const neckY = top + 3;
  g.moveTo(cx - 4 + tilt, neckY)
    .quadraticCurveTo(cx + tilt, neckY + 3, cx + 4 + tilt, neckY)
    .stroke({ color: COL_BONE_DK, width: 0.6 });
  // Bone beads
  for (let i = -3; i <= 3; i += 1.5) {
    g.circle(cx + i + tilt, neckY + 1 + Math.abs(i) * 0.3, 0.8).fill({ color: COL_BONE });
  }
  // Central skull pendant
  g.circle(cx + tilt, neckY + 2.5, 1.5).fill({ color: COL_SKULL });
  g.circle(cx - 0.5 + tilt, neckY + 2.2, 0.3).fill({ color: COL_SKULL_EYE });
  g.circle(cx + 0.5 + tilt, neckY + 2.2, 0.3).fill({ color: COL_SKULL_EYE });

  // War paint on chest
  g.moveTo(cx - 3 + tilt, top + 4)
    .lineTo(cx - 1 + tilt, top + 6)
    .lineTo(cx - 3 + tilt, top + 8)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.6 });
  g.moveTo(cx + 3 + tilt, top + 4)
    .lineTo(cx + 1 + tilt, top + 6)
    .lineTo(cx + 3 + tilt, top + 8)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.6 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  eyeIntensity = 0.7,
): void {
  const hw = 12;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Broad orcish head -- wider jaw
  g.moveTo(x + 2, top)
    .lineTo(x + hw - 2, top)
    .lineTo(x + hw + 1, top + hh * 0.6)
    .lineTo(x + hw - 1, top + hh)
    .lineTo(x + 1, top + hh)
    .lineTo(x - 1, top + hh * 0.6)
    .closePath()
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });

  // Prominent brow ridge
  g.moveTo(x + 1, top + 2.5)
    .lineTo(x + hw - 1, top + 2.5)
    .stroke({ color: COL_SKIN_SHADOW, width: 1.5 });

  // Fierce eyes
  const eyeY = top + 3.5;
  g.rect(cx - 3 + tilt, eyeY, 2.5, 1.5).fill({ color: 0x111100 });
  g.rect(cx + 0.5 + tilt, eyeY, 2.5, 1.5).fill({ color: 0x111100 });
  g.rect(cx - 2.5 + tilt, eyeY + 0.2, 1.5, 1).fill({ color: COL_EYE, alpha: eyeIntensity });
  g.rect(cx + 1 + tilt, eyeY + 0.2, 1.5, 1).fill({ color: COL_EYE, alpha: eyeIntensity });

  // War paint -- red stripes across face
  g.moveTo(x + 1, top + 3)
    .lineTo(x + 4, top + 4)
    .stroke({ color: COL_WARPAINT, width: 1, alpha: 0.7 });
  g.moveTo(x + hw - 1, top + 3)
    .lineTo(x + hw - 4, top + 4)
    .stroke({ color: COL_WARPAINT, width: 1, alpha: 0.7 });
  // Vertical stripe down chin
  g.moveTo(cx + tilt, top + hh * 0.7)
    .lineTo(cx + tilt, top + hh)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.5 });

  // Flat nose
  g.roundRect(cx - 1 + tilt, top + 4.5, 2, 2, 0.5).fill({ color: COL_SKIN_DK });

  // Snarling mouth
  g.moveTo(cx - 2.5 + tilt, top + 7.5)
    .lineTo(cx + 2.5 + tilt, top + 7.5)
    .stroke({ color: COL_SKIN_SHADOW, width: 0.8 });

  // Tusks
  g.moveTo(cx - 2 + tilt, top + 7)
    .lineTo(cx - 2.5 + tilt, top + 5.5)
    .stroke({ color: COL_TUSK, width: 1.2 });
  g.moveTo(cx + 2 + tilt, top + 7)
    .lineTo(cx + 2.5 + tilt, top + 5.5)
    .stroke({ color: COL_TUSK, width: 1.2 });

  // Pointed ears
  g.moveTo(x - 1, top + 3)
    .lineTo(x - 3, top + 1)
    .lineTo(x + 1, top + 4)
    .fill({ color: COL_SKIN });
  g.moveTo(x + hw + 1, top + 3)
    .lineTo(x + hw + 3, top + 1)
    .lineTo(x + hw - 1, top + 4)
    .fill({ color: COL_SKIN });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Muscular green arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 3.5 });
  // Arm shadow
  g.moveTo(sx + 0.5, sy + 0.5).lineTo(ex + 0.5, ey + 0.5)
    .stroke({ color: COL_SKIN_DK, width: 1, alpha: 0.3 });
  // War paint band on bicep
  const mx = lerp(sx, ex, 0.35);
  const my = lerp(sy, ey, 0.35);
  g.circle(mx, my, 2.5).stroke({ color: COL_WARPAINT, width: 0.6, alpha: 0.5 });
  // Hand
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });
}

function drawStaff(
  g: Graphics,
  bx: number,
  by: number,
  staffLen: number,
  flameSize = 3,
  flamePhase = 0,
): void {
  const topX = bx;
  const topY = by - staffLen;

  // Gnarled wooden staff
  g.moveTo(bx, by)
    .quadraticCurveTo(bx - 1, by - staffLen * 0.5, topX, topY)
    .stroke({ color: COL_STAFF, width: 2.5 });
  // Staff highlight
  g.moveTo(bx + 0.5, by)
    .quadraticCurveTo(bx - 0.5, by - staffLen * 0.5, topX + 0.5, topY)
    .stroke({ color: COL_STAFF_DK, width: 0.5, alpha: 0.3 });

  // Knots on staff
  g.circle(bx - 0.5, by - staffLen * 0.3, 1.5).fill({ color: COL_STAFF_KNOT });
  g.circle(bx, by - staffLen * 0.6, 1.2).fill({ color: COL_STAFF_KNOT });

  // Bone ornament tied to top
  g.moveTo(topX - 1.5, topY + 1)
    .lineTo(topX - 2, topY + 4)
    .stroke({ color: COL_BONE_DK, width: 0.4 });
  g.circle(topX - 2, topY + 4.5, 0.8).fill({ color: COL_BONE });

  // Flame on top of staff
  const flicker = Math.sin(flamePhase * Math.PI * 2);
  const flicker2 = Math.cos(flamePhase * Math.PI * 3);
  const fs = flameSize;

  // Outer flame
  g.moveTo(topX - fs, topY)
    .quadraticCurveTo(topX - fs * 0.3 + flicker, topY - fs * 1.5, topX, topY - fs * 2.5 - flicker2)
    .quadraticCurveTo(topX + fs * 0.3 - flicker, topY - fs * 1.5, topX + fs, topY)
    .closePath()
    .fill({ color: COL_FLAME, alpha: 0.8 });
  // Inner flame
  g.moveTo(topX - fs * 0.5, topY)
    .quadraticCurveTo(topX + flicker * 0.3, topY - fs * 1.2, topX, topY - fs * 1.8 - flicker2 * 0.5)
    .quadraticCurveTo(topX - flicker * 0.3, topY - fs * 1.2, topX + fs * 0.5, topY)
    .closePath()
    .fill({ color: COL_FLAME_HI, alpha: 0.7 });
  // Core
  g.circle(topX, topY - fs * 0.5, fs * 0.3).fill({ color: COL_FLAME_CORE, alpha: 0.6 });

  // Glow halo
  g.circle(topX, topY - fs, fs * 1.5).fill({ color: COL_FLAME, alpha: 0.08 });
}

/* -- frame generators ----------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.3;

  const legH = 7;
  const torsoH = 12;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, sway, 0.7);

  // Right arm holds staff
  const rHandX = CX + 8;
  const rHandY = torsoTop + torsoH - 3 + breathe;
  drawArm(g, CX + 7, torsoTop + 3, rHandX, rHandY);
  drawStaff(g, rHandX, rHandY, 22, 3, t);

  // Left arm at side, fist clenched
  const lHandX = CX - 8;
  const lHandY = torsoTop + 8;
  drawArm(g, CX - 7, torsoTop + 3, lHandX, lHandY);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.0;

  const legH = 7;
  const torsoH = 12;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY, 12 + Math.abs(walk) * 1.5, 3);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.3);
  drawHead(g, CX, headTop, walk * 0.3, 0.7);

  // Staff arm swings with walk, staff tilts
  const armSwing = walk * 1.5;
  const rHandX = CX + 8 + armSwing * 0.3;
  const rHandY = torsoTop + torsoH - 3;
  drawArm(g, CX + 7, torsoTop + 3, rHandX, rHandY);
  drawStaff(g, rHandX, rHandY, 22, 2.5, t);

  // Left arm swings opposite
  const lHandX = CX - 8 - armSwing * 0.3;
  const lHandY = torsoTop + 8;
  drawArm(g, CX - 7, torsoTop + 3, lHandX, lHandY);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Staff slam: 0-1=raise, 2-3=swing forward, 4-5=impact+fire burst, 6-7=recover
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 12;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  const lean = t < 0.55 ? t * 3 : (1 - t) * 4;
  const crouch = t < 0.25 ? t * 1.5 : t < 0.55 ? 0.4 : (1 - t) * 1;

  drawShadow(g, CX + lean * 0.3, GY, 12 + lean, 3);
  drawBoots(g, CX, GY, -1, Math.round(lean * 0.5));
  drawLegs(g, CX, legTop, legH, -1, Math.round(lean * 0.5));
  drawTorso(g, CX, torsoTop + crouch, torsoH, lean * 0.5);
  drawHead(g, CX, headTop + crouch, lean * 0.3, 0.9);

  // Staff swings forward and slams
  let staffLen = 22;
  const rHandX = CX + 7 + lean * 1.5;
  const rHandY = torsoTop + 4 + crouch;
  drawArm(g, CX + 7 + lean * 0.5, torsoTop + 3 + crouch, rHandX, rHandY);

  if (t < 0.25) {
    // Raising staff
    drawStaff(g, rHandX, rHandY, staffLen + t * 4, 3 + t * 2, t);
  } else if (t < 0.55) {
    // Slamming down -- staff shortens as it swings forward
    const slamProgress = (t - 0.25) / 0.3;
    staffLen = lerp(26, 16, slamProgress);
    drawStaff(g, rHandX + slamProgress * 4, rHandY + slamProgress * 6, staffLen, 4 + slamProgress * 2, t);
  } else {
    // Recover
    drawStaff(g, rHandX, rHandY, 22, 3, t);
  }

  // Fire burst on impact
  if (t > 0.45 && t < 0.75) {
    const burstAlpha = clamp01(1 - Math.abs(t - 0.58) / 0.17) * 0.7;
    const burstX = rHandX + 8;
    const burstY = rHandY + 10;
    // Fire explosion
    g.circle(burstX, burstY, 5).fill({ color: COL_FLAME, alpha: burstAlpha });
    g.circle(burstX, burstY, 3).fill({ color: COL_FLAME_CORE, alpha: burstAlpha * 0.6 });
    // Fire sparks
    for (let i = 0; i < 6; i++) {
      const angle = i * (Math.PI / 3) + t * 5;
      const dist = 4 + (t - 0.45) * 12;
      const sx = burstX + Math.cos(angle) * dist;
      const sy = burstY + Math.sin(angle) * dist * 0.6;
      g.circle(sx, sy, 0.8).fill({ color: COL_FLAME_HI, alpha: burstAlpha * 0.5 });
    }
  }

  // Left fist clenched, pumping
  const lHandX = CX - 7 + lean * 0.3;
  const lHandY = torsoTop + 6 + crouch;
  drawArm(g, CX - 7 + lean * 0.3, torsoTop + 3 + crouch, lHandX, lHandY);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Fire ritual: raises staff, channels fire magic, eruption of flames
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 12;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Fire spirits swirling around
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI / 4);
    const dist = 8 + intensity * 10 + i * 1.5;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + Math.sin(angle) * dist * 0.5;
    const pAlpha = clamp01(0.2 + pulse * 0.25 - i * 0.02);
    const col = i % 3 === 0 ? COL_FLAME_CORE : i % 3 === 1 ? COL_FLAME : COL_FLAME_DK;
    g.circle(px, py, 1.2 + pulse * 0.5).fill({ color: col, alpha: pAlpha });
  }

  // Heat shimmer
  g.ellipse(CX, torsoTop + 5, 10 + intensity * 5, 14).fill({
    color: COL_FLAME,
    alpha: intensity * 0.05,
  });

  drawShadow(g, CX, GY, 12, 3, 0.35 + intensity * 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);

  // Eyes glow with fire
  drawHead(g, CX, headTop, 0, 0.5 + intensity * 0.5);
  // Extra eye glow
  const eGlow = intensity * 0.3;
  g.circle(CX - 2, headTop + 4, 2.5).fill({ color: COL_EYE_GLOW, alpha: eGlow });
  g.circle(CX + 2, headTop + 4, 2.5).fill({ color: COL_EYE_GLOW, alpha: eGlow });

  // Staff raised high, channeling
  const raise = intensity * 6;
  const rHandX = CX + 7;
  const rHandY = torsoTop + 2 - raise;
  drawArm(g, CX + 7, torsoTop + 3, rHandX, rHandY);
  drawStaff(g, rHandX, rHandY, 22 + raise * 0.5, 4 + intensity * 4, t);

  // Left arm raised, channeling
  const lHandX = CX - 8;
  const lHandY = torsoTop + 3 - raise * 0.7;
  drawArm(g, CX - 7, torsoTop + 3, lHandX, lHandY);

  // Fire streaks from left hand
  if (intensity > 0.3) {
    for (let i = 0; i < 3; i++) {
      const streakAngle = -0.5 + i * 0.3 + t * 2;
      const streakLen = 5 + intensity * 4;
      g.moveTo(lHandX, lHandY)
        .lineTo(
          lHandX + Math.cos(streakAngle) * streakLen,
          lHandY + Math.sin(streakAngle) * streakLen,
        )
        .stroke({ color: COL_FLAME, width: 1, alpha: intensity * 0.4 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 0=hit, 1-2=stagger, 3-4=knees, 5-7=collapse, staff breaks
  const t = frame / 7;

  const legH = 7;
  const torsoH = 12;
  const legTop = GY - 4 - legH;

  const fallX = t * 8;
  const dropY = t * t * 9;
  const fallAngle = t * 0.7;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.3, GY, 12 + t * 2, 3, 0.35 * (1 - t * 0.4));

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.1, GY, Math.round(t * 2), Math.round(-t));
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.4, legH - squash, Math.round(t * 2), Math.round(-t));
  }

  // Torso tilts and falls
  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.12), fallAngle * 3);
  drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.3, fallAngle * 3.5, 0.3 * (1 - t));

  // Staff breaks and flies
  if (t < 0.5) {
    const staffX = CX + 10 + t * 8;
    const staffY = torsoTop + 4;
    drawStaff(g, staffX, staffY, 22 * (1 - t * 0.4), 3 * (1 - t), t);
  } else if (t < 0.8) {
    // Staff fragments
    const fragT = (t - 0.5) / 0.3;
    // Top half flies
    const fx1 = CX + 14 + fragT * 10;
    const fy1 = torsoTop - 5 + fragT * 8;
    g.moveTo(fx1, fy1).lineTo(fx1 + 4, fy1 - 6).stroke({ color: COL_STAFF, width: 2 });
    // Bottom half falls
    const fx2 = CX + 12 + fragT * 4;
    const fy2 = torsoTop + 6 + fragT * 6;
    g.moveTo(fx2, fy2).lineTo(fx2 + 2, fy2 + 8).stroke({ color: COL_STAFF, width: 2 });
    // Last flame sputters
    g.circle(fx1 + 4, fy1 - 7, 1.5 * (1 - fragT)).fill({
      color: COL_FLAME,
      alpha: 0.5 * (1 - fragT),
    });
  }

  // Arms flop
  if (t > 0.4) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 3,
      CX + fallX * 0.4 + 10,
      torsoTop + torsoH - 2,
    );
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
 * Generate all orc shaman sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateOrcShamanFrames(renderer: Renderer): RenderTexture[] {
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
