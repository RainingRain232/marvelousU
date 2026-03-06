// Procedural sprite generator for the SiegeTroll unit type.
//
// Draws a huge boulder-hurling troll at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Massive green/grey hunched body with warts and hide texture
//   • Small beady yellow eyes under a jutting brow ridge
//   • Wide jaw with protruding bone-yellow tusks
//   • Ragged rope-belted loincloth
//   • Oversized muscular arms and thick stumpy legs
//   • Carries a chunky granite boulder
//   • IDLE: weight shifts, chest heaves, boulder rests at side
//   • MOVE: slow ground-shaking stomp, boulder on shoulder
//   • ATTACK: winds up and hurls boulder overhead
//   • CAST: slams ground, tears up a new boulder from earth
//   • DIE: boulder drops on self, topples backward with flailing arms

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — siege troll green/grey
const COL_SKIN      = 0x5e7252; // grey-green hide

const COL_SKIN_DK   = 0x3e5238; // shadow tone
const COL_SKIN_SHD  = 0x2c3c28; // deep shadow

const COL_BELLY     = 0x748468; // lighter underbelly
const COL_BELLY_HI  = 0x8a9a7a;

const COL_WART      = 0x4a5e3e; // wart bumps
const COL_MOSS      = 0x4a6040; // patches of moss

const COL_EYE       = 0xddaa22; // beady yellow eyes
const COL_PUPIL     = 0x111100;

const COL_BROW      = 0x4a5c40; // heavy brow ridge
const COL_JAW       = 0x506645; // wide lower jaw
const COL_MOUTH     = 0x1e1010;
const COL_TUSK      = 0xddd8b8; // ivory tusk
const COL_TUSK_DK   = 0xb0a888;

const COL_CLOTH     = 0x4e3c28; // ragged loincloth
const COL_CLOTH_DK  = 0x342818;
const COL_ROPE      = 0x907858; // rope belt

const COL_ROCK      = 0x888890; // granite boulder
const COL_ROCK_DK   = 0x606068;
const COL_ROCK_HI   = 0xaaaabc;
const COL_ROCK_SPEC = 0xccccdc; // specular chip

const COL_DIRT      = 0x907060; // dirt/earth when slamming ground
const COL_DIRT_DK   = 0x644840;

const COL_SHADOW    = 0x000000;

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
  w = 16,
  h = 4.5,
  alpha = 0.28,
): void {
  g.ellipse(cx, gy + 2, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const fw = 7;
  const fh = 5 - squash;
  // Left foot — thick, calloused
  g.roundRect(cx - 9 + stanceL, gy - fh, fw, fh, 1.5)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHD, width: 0.5 });
  // Toenail nubs
  for (let i = 0; i < 3; i++) {
    g.circle(cx - 8 + stanceL + i * 2.2, gy - fh + 1, 0.9)
      .fill({ color: COL_SKIN_SHD });
  }
  // Right foot
  g.roundRect(cx + 2 + stanceR, gy - fh, fw, fh, 1.5)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHD, width: 0.5 });
  for (let i = 0; i < 3; i++) {
    g.circle(cx + 3 + stanceR + i * 2.2, gy - fh + 1, 0.9)
      .fill({ color: COL_SKIN_SHD });
  }
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Thick stumpy legs
  g.roundRect(cx - 8 + stanceL, legTop, 6, legH, 1.5).fill({ color: COL_SKIN_DK });
  g.roundRect(cx + 2 + stanceR, legTop, 6, legH, 1.5).fill({ color: COL_SKIN_DK });
  // Knee bump
  g.ellipse(cx - 5 + stanceL, legTop + legH * 0.35, 4, 3).fill({ color: COL_SKIN, alpha: 0.45 });
  g.ellipse(cx + 5 + stanceR, legTop + legH * 0.35, 4, 3).fill({ color: COL_SKIN, alpha: 0.45 });
  // Loincloth flap over legs
  g.moveTo(cx - 7, legTop - 2)
    .lineTo(cx - 8, legTop + legH * 0.6)
    .lineTo(cx + 8, legTop + legH * 0.6)
    .lineTo(cx + 7, legTop - 2)
    .closePath()
    .fill({ color: COL_CLOTH })
    .stroke({ color: COL_CLOTH_DK, width: 0.4 });
  // Tattered fringe
  g.moveTo(cx - 5, legTop + legH * 0.6)
    .lineTo(cx - 6, legTop + legH * 0.6 + 3)
    .stroke({ color: COL_CLOTH_DK, width: 0.9 });
  g.moveTo(cx + 5, legTop + legH * 0.6)
    .lineTo(cx + 6, legTop + legH * 0.6 + 2)
    .stroke({ color: COL_CLOTH_DK, width: 0.9 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 19; // massively wide hunched torso
  const x = cx - tw / 2 + tilt;

  // Main body — rounded block
  g.roundRect(x, top, tw, h, 4)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.6 });

  // Lighter belly
  g.ellipse(cx + tilt, top + h * 0.55, tw * 0.38, h * 0.3).fill({ color: COL_BELLY });
  g.ellipse(cx + tilt, top + h * 0.5, tw * 0.22, h * 0.15).fill({ color: COL_BELLY_HI, alpha: 0.28 });

  // Muscle ridges / skin folds
  g.moveTo(x + 4, top + 3)
    .lineTo(x + 4, top + h * 0.45)
    .stroke({ color: COL_SKIN_SHD, width: 0.5, alpha: 0.3 });
  g.moveTo(x + tw - 4, top + 3)
    .lineTo(x + tw - 4, top + h * 0.45)
    .stroke({ color: COL_SKIN_SHD, width: 0.5, alpha: 0.3 });

  // Hunch on back/top
  g.ellipse(cx + tilt - 2, top + 2, tw * 0.42, 6).fill({ color: COL_SKIN_DK });

  // Wart clusters
  const warts: [number, number, number][] = [
    [-7, 5, 1.8], [6, 4, 1.5], [-4, 12, 1.6], [8, 10, 1.4],
    [-9, 17, 1.3], [3, 18, 1.7], [10, 14, 1.2],
  ];
  for (const [wx, wy, wr] of warts) {
    g.circle(cx + wx + tilt, top + wy, wr).fill({ color: COL_WART, alpha: 0.32 });
  }

  // Moss patch
  g.ellipse(cx - 6 + tilt, top + 9, 3, 1.8).fill({ color: COL_MOSS, alpha: 0.22 });
  g.ellipse(cx + 7 + tilt, top + 6, 2.5, 1.5).fill({ color: COL_MOSS, alpha: 0.18 });

  // Rope belt
  g.moveTo(x + 2, top + h - 3)
    .lineTo(x + tw - 2, top + h - 3)
    .stroke({ color: COL_ROPE, width: 2 });
  // Rope knot
  g.circle(cx + tilt + 4, top + h - 3, 2).fill({ color: COL_ROPE });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 14;
  const hh = 11;
  const x = cx - hw / 2 + tilt;

  // Neck
  g.roundRect(cx - 5 + tilt, top + hh - 4, 10, 7, 1.5).fill({ color: COL_SKIN_DK });

  // Head — wide brutish skull
  g.roundRect(x, top, hw, hh, 3.5)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.6 });

  // Heavy brow ridge
  g.roundRect(x + 1, top + 2, hw - 2, 4, 1.5).fill({ color: COL_BROW });
  g.roundRect(x + 2, top + 2, hw - 4, 1.5, 0.8).fill({ color: COL_SKIN_DK });

  // Beady eyes deep under brow
  g.circle(cx - 3.5 + tilt, top + 5.5, 1.8).fill({ color: COL_EYE });
  g.circle(cx - 3.5 + tilt, top + 5.5, 0.9).fill({ color: COL_PUPIL });
  g.circle(cx + 3.5 + tilt, top + 5.5, 1.8).fill({ color: COL_EYE });
  g.circle(cx + 3.5 + tilt, top + 5.5, 0.9).fill({ color: COL_PUPIL });
  // Tiny eye highlight
  g.circle(cx - 3 + tilt, top + 5, 0.4).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle(cx + 4 + tilt, top + 5, 0.4).fill({ color: 0xffffff, alpha: 0.6 });

  // Flat wide nose
  g.roundRect(cx - 2 + tilt, top + 6, 4, 3, 0.8).fill({ color: COL_SKIN_DK });
  g.circle(cx - 1 + tilt, top + 8.2, 0.7).fill({ color: COL_SKIN_SHD });
  g.circle(cx + 1 + tilt, top + 8.2, 0.7).fill({ color: COL_SKIN_SHD });

  // Wide jaw
  g.roundRect(x - 1, top + hh - 5, hw + 2, 5, 2.5).fill({ color: COL_JAW });
  // Mouth gap
  g.moveTo(x + 2, top + hh - 3.5)
    .lineTo(x + hw - 2, top + hh - 3.5)
    .stroke({ color: COL_MOUTH, width: 0.9 });

  // Left tusk (up from lower jaw)
  g.moveTo(cx - 4.5 + tilt, top + hh - 2)
    .lineTo(cx - 5.5 + tilt, top + hh - 6)
    .lineTo(cx - 3 + tilt, top + hh - 2)
    .closePath()
    .fill({ color: COL_TUSK })
    .stroke({ color: COL_TUSK_DK, width: 0.4 });
  // Right tusk
  g.moveTo(cx + 3 + tilt, top + hh - 2)
    .lineTo(cx + 5.5 + tilt, top + hh - 6)
    .lineTo(cx + 4.5 + tilt, top + hh - 2)
    .closePath()
    .fill({ color: COL_TUSK })
    .stroke({ color: COL_TUSK_DK, width: 0.4 });

  // Scalp warts
  g.circle(cx - 4 + tilt, top + 1, 1.2).fill({ color: COL_WART, alpha: 0.28 });
  g.circle(cx + 2 + tilt, top + 0.5, 1).fill({ color: COL_WART, alpha: 0.22 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Thick troll arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 5 });
  // Dark edge
  g.moveTo(sx + 1, sy + 1).lineTo(ex + 1, ey + 1)
    .stroke({ color: COL_SKIN_DK, width: 1, alpha: 0.28 });
  // Elbow bump
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 3).fill({ color: COL_SKIN_DK, alpha: 0.32 });
  // Big fist
  g.circle(ex, ey, 3.5)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHD, width: 0.5 });
  // Knuckle nubs
  g.circle(ex - 1.5, ey - 1, 1).fill({ color: COL_SKIN, alpha: 0.42 });
  g.circle(ex + 1.5, ey - 1, 1).fill({ color: COL_SKIN, alpha: 0.42 });
}

function drawBoulder(
  g: Graphics,
  bx: number,
  by: number,
  radius = 7,
): void {
  // Main rock mass
  g.circle(bx, by, radius)
    .fill({ color: COL_ROCK })
    .stroke({ color: COL_ROCK_DK, width: 0.7 });
  // Darker flat face
  g.ellipse(bx + 1, by - 1, radius * 0.68, radius * 0.6).fill({ color: COL_ROCK_DK, alpha: 0.4 });
  // Lighter highlight ridge
  g.ellipse(bx - radius * 0.3, by - radius * 0.3, radius * 0.35, radius * 0.22)
    .fill({ color: COL_ROCK_HI, alpha: 0.55 });
  // Specular chip
  g.circle(bx - radius * 0.38, by - radius * 0.38, 1.2)
    .fill({ color: COL_ROCK_SPEC, alpha: 0.7 });
  // Crack lines
  g.moveTo(bx + 1, by - radius * 0.1)
    .lineTo(bx + radius * 0.5, by + radius * 0.4)
    .stroke({ color: COL_ROCK_DK, width: 0.6, alpha: 0.55 });
  g.moveTo(bx - radius * 0.1, by + radius * 0.15)
    .lineTo(bx - radius * 0.45, by + radius * 0.5)
    .stroke({ color: COL_ROCK_DK, width: 0.5, alpha: 0.45 });
  // Mossy spot
  g.ellipse(bx + radius * 0.3, by + radius * 0.25, 2, 1.2)
    .fill({ color: COL_MOSS, alpha: 0.3 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  // Slow chest-heave and weight-shift
  const breathe  = Math.sin(t * Math.PI * 2) * 0.6;
  const sway     = Math.sin(t * Math.PI * 2) * 0.4;
  const mouthOpen = t > 0.4 && t < 0.6 ? (t - 0.4) / 0.1 * 0.6 : 0; // mouth-breathe puff

  const legH     = 9;
  const torsoH   = 15;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 3 + breathe;
  const headTop  = torsoTop - 12;

  drawShadow(g, CX, GY);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX + sway * 0.3, torsoTop, torsoH, sway * 0.2);
  drawHead(g, CX, headTop, sway * 0.15);

  // Left arm hangs low — relaxed
  drawArm(g, CX - 9, torsoTop + 6, CX - 13, torsoTop + torsoH + 1);

  // Right arm holds boulder at hip level
  const rHandX = CX + 11;
  const rHandY = torsoTop + torsoH - 1;
  drawArm(g, CX + 9, torsoTop + 6, rHandX, rHandY);
  drawBoulder(g, rHandX + 5, rHandY + 2, 6);

  // Breath puff (mouth open exhale visual hint)
  if (mouthOpen > 0.1) {
    g.circle(CX + 3, headTop + 10, 1.5 + mouthOpen).fill({ color: 0xffffff, alpha: mouthOpen * 0.08 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob  = Math.abs(walk) * 2; // heavy tread

  const legH     = 9;
  const torsoH   = 15;
  const stanceL  = Math.round(walk * 3.5);
  const stanceR  = Math.round(-walk * 3.5);
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 3 - Math.round(bob * 0.45);
  const headTop  = torsoTop - 12;

  // Ground shake — at heel-strike the shadow swells briefly
  const shadowW = Math.abs(walk) > 0.85 ? 18 : 16 + Math.abs(walk) * 2;
  drawShadow(g, CX, GY, shadowW, 4.5);
  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.7);
  drawHead(g, CX, headTop, walk * 0.5);

  // Boulder rests on left shoulder while moving
  const boulderX = CX - 10 + walk * 0.5;
  const boulderY = torsoTop - 3;
  drawBoulder(g, boulderX, boulderY, 6);

  // Left arm braces boulder up
  drawArm(g, CX - 9, torsoTop + 5, boulderX, boulderY + 3);
  // Right arm swings for balance
  const rArmSwing = -walk * 2.5;
  drawArm(g, CX + 9, torsoTop + 5, CX + 13 + rArmSwing, torsoTop + torsoH + 1);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: bring boulder overhead; 2-3: draw back; 4-5: hurl arc; 6-7: follow-through
  const phases = [0, 0.1, 0.22, 0.36, 0.52, 0.68, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH     = 9;
  const torsoH   = 15;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 3;
  const headTop  = torsoTop - 12;

  // Lean into the throw
  const lean      = t < 0.55 ? t * 5 : (1 - t) * 8;
  const lunge     = t > 0.2 && t < 0.88 ? 4 : 0;

  drawShadow(g, CX + lean * 0.5, GY, 16 + lean, 4.5);
  drawFeet(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.6);
  drawHead(g, CX, headTop, lean * 0.4);

  // Boulder trajectory — goes from low → raised overhead → hurled forward-high
  let boulderX: number;
  let boulderY: number;
  if (t < 0.22) {
    // Lifting phase: from hip to overhead
    boulderX = lerp(CX + 11, CX + 5, t / 0.22);
    boulderY = lerp(torsoTop + torsoH, torsoTop - 8, t / 0.22);
  } else if (t < 0.52) {
    // Wind-back: draw overhead backward
    boulderX = lerp(CX + 5, CX - 4, (t - 0.22) / 0.3);
    boulderY = lerp(torsoTop - 8, torsoTop - 12, (t - 0.22) / 0.3);
  } else if (t < 0.82) {
    // Hurl: arc forward and high
    const tp = (t - 0.52) / 0.3;
    boulderX = lerp(CX - 4, CX + 22, tp);
    boulderY = lerp(torsoTop - 12, torsoTop - 6, tp * tp); // arc
  } else {
    // After release — boulder is gone off-screen, hand hangs
    boulderX = CX + 26;
    boulderY = torsoTop - 3;
  }

  // Draw throw trail when hurling
  if (t >= 0.52 && t <= 0.82) {
    const trailT  = (t - 0.52) / 0.3;
    const trailAlpha = (1 - Math.abs(trailT - 0.5) * 1.8) * 0.35;
    g.moveTo(CX, torsoTop - 11)
      .bezierCurveTo(CX + 8, torsoTop - 16, CX + 14, torsoTop - 10, boulderX, boulderY)
      .stroke({ color: COL_ROCK_HI, width: 2, alpha: trailAlpha });
  }

  const released = t > 0.72;
  if (!released) {
    drawBoulder(g, boulderX, boulderY, 6);
  } else if (t <= 0.82) {
    // Boulder tumbling away — smaller as it recedes
    drawBoulder(g, boulderX, boulderY, 6 * (1 - (t - 0.72) / 0.1));
  }

  // Both arms drive the throw
  if (t < 0.52) {
    // Two-handed lift
    drawArm(g, CX + 9 + lean, torsoTop + 5, boulderX - 3, boulderY + 4);
    drawArm(g, CX - 9 + lean, torsoTop + 5, boulderX + 3, boulderY + 4);
  } else {
    // Single-arm hurl follow-through
    const handX = released ? CX + 16 + lean : boulderX - 4;
    const handY = released ? torsoTop + 4    : boulderY + 4;
    drawArm(g, CX + 9 + lean, torsoTop + 4, handX, handY);
    drawArm(g, CX - 9 + lean, torsoTop + 4, handX - 5, handY + 2);
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Slams ground → cracks open → tears up a new boulder from the earth
  const t         = frame / 7;
  const pulse     = Math.sin(t * Math.PI * 2.5) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.8);

  const legH     = 9;
  const torsoH   = 15;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 3;
  const headTop  = torsoTop - 12;

  // Ground crack lines — appear as earth splits
  if (intensity > 0.25) {
    const crackAlpha = clamp01(intensity - 0.25) * 0.45;
    for (let i = 0; i < 4; i++) {
      const ca = -0.7 + i * 0.45;
      const len = 6 + i * 2 + pulse * 2;
      g.moveTo(CX, GY)
        .lineTo(CX + Math.cos(ca) * len, GY + Math.sin(ca) * len * 0.4)
        .stroke({ color: COL_SHADOW, width: 0.8, alpha: crackAlpha });
    }
  }

  // Dirt/dust burst when fist hits ground
  if (t < 0.45) {
    const burstT  = t / 0.45;
    const bAlpha  = (1 - burstT) * 0.25;
    for (let i = 0; i < 5; i++) {
      const da = -0.8 + i * 0.4;
      const dd = 4 + burstT * 7 + i * 1.5;
      g.circle(CX + Math.cos(da) * dd, GY - Math.sin(da) * dd * 0.5, 1.5 + burstT)
        .fill({ color: COL_DIRT, alpha: bAlpha });
    }
  }

  // New boulder rising from earth
  const riseY    = GY - intensity * 18;
  const riseR    = 3 + intensity * 4;
  const riseGlow = 0.06 + intensity * 0.09;
  g.circle(CX + 8, riseY, riseR + 2).fill({ color: COL_DIRT_DK, alpha: riseGlow * 0.5 });
  if (intensity > 0.15) {
    drawBoulder(g, CX + 8, riseY, riseR);
  }

  // Dirt clumps falling off rising boulder
  if (intensity > 0.3) {
    for (let i = 0; i < 4; i++) {
      const px = CX + 8 + Math.sin(t * 3 + i * 1.6) * (riseR + 3);
      const py = riseY + riseR + 1 + i * 2.5;
      g.circle(px, py, 1.2 - i * 0.15)
        .fill({ color: COL_DIRT, alpha: clamp01(intensity - 0.3) * 0.5 });
    }
  }

  drawShadow(g, CX, GY, 16, 4.5, 0.28 + intensity * 0.12);
  drawFeet(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Left arm punched into ground — slam pose
  const slamProgress = clamp01(t * 3.5);
  const lArmEndY     = lerp(torsoTop + torsoH, GY - 1, slamProgress);
  drawArm(g, CX - 9, torsoTop + 5, CX - 13, lArmEndY);

  // Right arm reaching for the rising boulder
  const reach = intensity * 0.85;
  const rHandX = lerp(CX + 9, CX + 8 + 2, reach);
  const rHandY = lerp(torsoTop + 5, riseY + riseR, reach);
  drawArm(g, CX + 9, torsoTop + 5, rHandX, rHandY);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 0: boulder drops on troll → 1-3: stagger; 4-7: topples backward with arms out
  const t = frame / 7;

  const legH     = 9;
  const torsoH   = 15;
  const legTop   = GY - 5 - legH;

  const fallX    = -t * 10;  // topples backward (left)
  const dropY    = t * t * 12;
  const fallAngle = t * 0.9; // tipping rotation via tilt

  const torsoTop = legTop - torsoH + 3 + dropY;
  const headTop  = torsoTop - 12;

  drawShadow(g, CX + fallX * 0.3, GY, 16 + t * 5, 4.5, 0.28 * (1 - t * 0.45));

  // Legs buckle and splay
  const squash = Math.round(t * 3.5);
  drawFeet(g, CX + fallX * 0.12, GY, -t * 2.5, t * 1.5, squash);
  if (t < 0.68) {
    drawLegs(g, CX + fallX * 0.12, legTop + dropY * 0.5, legH - squash, -t * 2.5, t * 1.5);
  }

  drawTorso(g, CX + fallX * 0.45, torsoTop, torsoH * (1 - t * 0.1), -fallAngle * 3.5);
  if (t < 0.88) {
    drawHead(g, CX + fallX * 0.45, headTop + dropY * 0.32, -fallAngle * 4.5);
  }

  // Boulder drops from above and lands on the troll (early frames)
  if (t < 0.35) {
    const fallProg = t / 0.35;
    const bdropX   = CX + 2;
    const bdropY   = lerp(torsoTop - 14, torsoTop + 3, fallProg * fallProg);
    drawBoulder(g, bdropX, bdropY, 6 + fallProg * 0.5);
    // Boulder impact dust on landing
    if (fallProg > 0.8) {
      const dustA = (fallProg - 0.8) / 0.2 * 0.3;
      g.circle(bdropX, torsoTop + 3, 10).fill({ color: COL_DIRT, alpha: dustA });
    }
  }

  // Arms flail outward as troll topples
  if (t > 0.22) {
    const flailT  = clamp01((t - 0.22) / 0.5);
    // Left arm flies out and back
    const lArmX  = CX + fallX * 0.45 - 5 - flailT * 7;
    const lArmY  = torsoTop + 3 - flailT * 4;
    drawArm(g, CX + fallX * 0.45 - 9, torsoTop + 5, lArmX, lArmY);
    // Right arm flies the other way
    const rArmX  = CX + fallX * 0.45 + 10 + flailT * 5;
    const rArmY  = torsoTop + 2 - flailT * 3;
    drawArm(g, CX + fallX * 0.45 + 9, torsoTop + 5, rArmX, rArmY);
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all SiegeTroll sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSiegeTrollFrames(renderer: Renderer): RenderTexture[] {
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
