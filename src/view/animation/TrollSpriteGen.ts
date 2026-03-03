// Procedural sprite generator for the Troll unit type.
//
// Draws a massive 2×2-tile troll at 96×96 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Huge hunched muscular body with grey-green skin
//   • Thick hide with warts, scars, and moss patches
//   • Small beady yellow eyes under heavy brow ridge
//   • Wide jaw with underbite tusks
//   • Huge gnarled wooden club studded with stones
//   • Tattered loincloth and rope belt
//   • Oversized arms that hang low, knuckle-dragger pose
//   • Thick stumpy legs with calloused feet
//   • Regeneration glow (green) during cast
//   • Slow, heavy, ground-shaking movement

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — troll
const COL_SKIN = 0x5a6e50; // grey-green hide
const COL_SKIN_DK = 0x3e5038;
const COL_SKIN_SHADOW = 0x2e3e28;

const COL_WART = 0x4a5e3e;
const COL_SCAR = 0x8a9a7a;
const COL_MOSS = 0x4a6a3a; // moss growing on skin

const COL_BELLY = 0x7a8a6a; // lighter belly
const COL_BELLY_HI = 0x8a9a7a;

const COL_EYE = 0xccaa22; // yellow beady eyes
const COL_EYE_PUPIL = 0x111111;

const COL_TUSK = 0xd8d0b8; // ivory tusks
const COL_TUSK_DK = 0xb0a890;

const COL_BROW = 0x4a5e40; // heavy brow ridge
const COL_MOUTH = 0x2a1a1a;
const COL_JAW = 0x4e6044;

const COL_CLOTH = 0x5a4a38; // tattered loincloth
const COL_CLOTH_DK = 0x3a2a1e;
const COL_ROPE = 0x8a7a5a; // rope belt

const COL_CLUB = 0x5c4030; // gnarled wood
const COL_CLUB_DK = 0x3c2818;
const COL_CLUB_HI = 0x7a5a40;
const COL_CLUB_KNOT = 0x4a3020;
const COL_STONE = 0x888888; // embedded stones
const COL_STONE_DK = 0x666666;

const COL_NAIL = 0x444444; // thick toenails

const COL_REGEN = 0x44cc44; // regeneration glow
const COL_REGEN_CORE = 0x88ff88;

const COL_SHADOW = 0x000000;

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
  w = 30,
  h = 8,
  alpha = 0.25,
): void {
  g.ellipse(cx, gy + 3, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const fw = 12;
  const fh = 7 - squash;
  // Left foot — big, flat, calloused
  g.roundRect(cx - 16 + stanceL, gy - fh, fw, fh, 2)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHADOW, width: 0.6 });
  // Toenails
  for (let i = 0; i < 3; i++) {
    g.circle(cx - 14 + stanceL + i * 4, gy - fh + 1, 1.5).fill({ color: COL_NAIL });
  }

  // Right foot
  g.roundRect(cx + 4 + stanceR, gy - fh, fw, fh, 2)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHADOW, width: 0.6 });
  for (let i = 0; i < 3; i++) {
    g.circle(cx + 6 + stanceR + i * 4, gy - fh + 1, 1.5).fill({ color: COL_NAIL });
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
  g.roundRect(cx - 14 + stanceL, legTop, 10, legH, 2).fill({ color: COL_SKIN_DK });
  g.roundRect(cx + 4 + stanceR, legTop, 10, legH, 2).fill({ color: COL_SKIN_DK });
  // Knee bumps
  g.ellipse(cx - 9 + stanceL, legTop + 3, 6, 4).fill({ color: COL_SKIN, alpha: 0.5 });
  g.ellipse(cx + 9 + stanceR, legTop + 3, 6, 4).fill({ color: COL_SKIN, alpha: 0.5 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 32;
  const x = cx - tw / 2 + tilt;

  // Massive hunched torso
  g.roundRect(x, top, tw, h, 6)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 1 });

  // Lighter belly
  g.ellipse(cx + tilt, top + h * 0.55, tw * 0.4, h * 0.35).fill({
    color: COL_BELLY,
  });
  g.ellipse(cx + tilt, top + h * 0.5, tw * 0.3, h * 0.2).fill({
    color: COL_BELLY_HI,
    alpha: 0.25,
  });

  // Muscle/skin definition lines
  g.moveTo(x + 6, top + 4)
    .lineTo(x + 6, top + h * 0.4)
    .stroke({ color: COL_SKIN_SHADOW, width: 0.5, alpha: 0.3 });
  g.moveTo(x + tw - 6, top + 4)
    .lineTo(x + tw - 6, top + h * 0.4)
    .stroke({ color: COL_SKIN_SHADOW, width: 0.5, alpha: 0.3 });

  // Hunch / back hump
  g.ellipse(cx + tilt - 3, top + 2, tw * 0.45, 8)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHADOW, width: 0.4 });

  // Warts scattered across body
  const warts = [
    [-10, 8, 2.5], [8, 6, 2], [-6, 16, 1.8], [12, 14, 2.2],
    [-12, 20, 1.5], [5, 22, 1.7], [14, 18, 1.3],
  ];
  for (const [wx, wy, wr] of warts) {
    g.circle(cx + wx + tilt, top + wy, wr).fill({ color: COL_WART, alpha: 0.3 });
  }

  // Old scars
  g.moveTo(x + 8, top + 10)
    .lineTo(x + 18, top + 18)
    .stroke({ color: COL_SCAR, width: 0.8, alpha: 0.3 });
  g.moveTo(x + tw - 10, top + 8)
    .lineTo(x + tw - 4, top + 16)
    .stroke({ color: COL_SCAR, width: 0.6, alpha: 0.25 });

  // Moss patches
  g.ellipse(cx - 8 + tilt, top + 12, 4, 2.5).fill({ color: COL_MOSS, alpha: 0.2 });
  g.ellipse(cx + 10 + tilt, top + 8, 3, 2).fill({ color: COL_MOSS, alpha: 0.15 });

  // Tattered loincloth
  g.moveTo(x + 6, top + h - 4)
    .lineTo(x + 8, top + h + 6)
    .lineTo(x + tw - 8, top + h + 6)
    .lineTo(x + tw - 6, top + h - 4)
    .closePath()
    .fill({ color: COL_CLOTH })
    .stroke({ color: COL_CLOTH_DK, width: 0.5 });
  // Tattered edges
  g.moveTo(x + 10, top + h + 6)
    .lineTo(x + 9, top + h + 9)
    .stroke({ color: COL_CLOTH_DK, width: 1 });
  g.moveTo(x + tw - 10, top + h + 6)
    .lineTo(x + tw - 11, top + h + 8)
    .stroke({ color: COL_CLOTH_DK, width: 1 });

  // Rope belt
  g.moveTo(x + 3, top + h - 3)
    .lineTo(x + tw - 3, top + h - 3)
    .stroke({ color: COL_ROPE, width: 2 });
  // Knot
  g.circle(cx + tilt + 6, top + h - 3, 2.5).fill({ color: COL_ROPE });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 22;
  const hh = 18;
  const x = cx - hw / 2 + tilt;

  // Neck (thick, short)
  g.roundRect(cx - 8 + tilt, top + hh - 6, 16, 10, 2).fill({ color: COL_SKIN_DK });

  // Head — wide, flat, brutish
  g.roundRect(x, top, hw, hh, 5)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.8 });

  // Heavy brow ridge
  g.roundRect(x + 1, top + 3, hw - 2, 5, 2).fill({ color: COL_BROW });
  g.roundRect(x + 2, top + 3, hw - 4, 2, 1).fill({ color: COL_SKIN_DK });

  // Small beady eyes deep-set under brow
  g.circle(cx - 5 + tilt, top + 7, 2.5).fill({ color: COL_EYE });
  g.circle(cx - 5 + tilt, top + 7, 1.2).fill({ color: COL_EYE_PUPIL });
  g.circle(cx + 5 + tilt, top + 7, 2.5).fill({ color: COL_EYE });
  g.circle(cx + 5 + tilt, top + 7, 1.2).fill({ color: COL_EYE_PUPIL });

  // Flat wide nose
  g.roundRect(cx - 3 + tilt, top + 9, 6, 4, 1).fill({ color: COL_SKIN_DK });
  g.circle(cx - 1.5 + tilt, top + 12, 1).fill({ color: COL_SKIN_SHADOW });
  g.circle(cx + 1.5 + tilt, top + 12, 1).fill({ color: COL_SKIN_SHADOW });

  // Wide jaw with underbite
  g.roundRect(x - 1, top + hh - 6, hw + 2, 6, 3).fill({ color: COL_JAW });
  // Mouth line
  g.moveTo(x + 3, top + hh - 4)
    .lineTo(x + hw - 3, top + hh - 4)
    .stroke({ color: COL_MOUTH, width: 1 });

  // Tusks protruding from lower jaw
  // Left tusk
  g.moveTo(cx - 7 + tilt, top + hh - 3)
    .lineTo(cx - 8 + tilt, top + hh - 8)
    .lineTo(cx - 5 + tilt, top + hh - 3)
    .closePath()
    .fill({ color: COL_TUSK })
    .stroke({ color: COL_TUSK_DK, width: 0.4 });
  // Right tusk
  g.moveTo(cx + 5 + tilt, top + hh - 3)
    .lineTo(cx + 8 + tilt, top + hh - 8)
    .lineTo(cx + 7 + tilt, top + hh - 3)
    .closePath()
    .fill({ color: COL_TUSK })
    .stroke({ color: COL_TUSK_DK, width: 0.4 });

  // Scalp warts
  g.circle(cx - 6 + tilt, top + 2, 1.5).fill({ color: COL_WART, alpha: 0.3 });
  g.circle(cx + 3 + tilt, top + 1, 1.2).fill({ color: COL_WART, alpha: 0.25 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Massive arm — thick line
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 7 });
  // Arm shadow edge
  g.moveTo(sx + 2, sy + 1).lineTo(ex + 2, ey + 1).stroke({
    color: COL_SKIN_DK,
    width: 1,
    alpha: 0.3,
  });
  // Elbow bump
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 4).fill({ color: COL_SKIN_DK, alpha: 0.3 });
  // Huge fist
  g.circle(ex, ey, 5)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_SHADOW, width: 0.5 });
  // Knuckle detail
  g.circle(ex - 2, ey - 1, 1.5).fill({ color: COL_SKIN, alpha: 0.4 });
  g.circle(ex + 2, ey - 1, 1.5).fill({ color: COL_SKIN, alpha: 0.4 });
}

function drawClub(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  clubLen = 35,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = baseX + sin * clubLen;
  const tipY = baseY - cos * clubLen;

  // Gnarled wooden handle
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_CLUB, width: 5 });
  // Wood grain
  g.moveTo(baseX + cos, baseY + sin)
    .lineTo(tipX + cos, tipY + sin)
    .stroke({ color: COL_CLUB_DK, width: 1 });
  g.moveTo(baseX - cos * 0.5, baseY - sin * 0.5)
    .lineTo(tipX - cos * 0.5, tipY - sin * 0.5)
    .stroke({ color: COL_CLUB_HI, width: 0.8, alpha: 0.4 });

  // Knots in wood
  const knot1 = 0.4;
  const knot2 = 0.7;
  g.circle(
    lerp(baseX, tipX, knot1),
    lerp(baseY, tipY, knot1),
    3,
  ).fill({ color: COL_CLUB_KNOT });
  g.circle(
    lerp(baseX, tipX, knot2),
    lerp(baseY, tipY, knot2),
    2.5,
  ).fill({ color: COL_CLUB_KNOT });

  // Club head — wider, battered end
  const headX = tipX;
  const headY = tipY;
  g.ellipse(headX, headY, 10, 8).fill({ color: COL_CLUB });
  g.ellipse(headX, headY, 10, 8).stroke({ color: COL_CLUB_DK, width: 0.8 });

  // Embedded stones/rocks in club head
  const stones = [
    [4, -3, 3], [-5, 2, 2.5], [2, 4, 2], [-3, -4, 2.2],
  ];
  for (const [sx, sy, sr] of stones) {
    const stoneX = headX + sx * cos + sy * sin;
    const stoneY = headY + sx * sin - sy * cos;
    g.circle(stoneX, stoneY, sr)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.4 });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.2;

  const legH = 14;
  const torsoH = 28;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 4 + breathe;
  const headTop = torsoTop - 16;

  drawShadow(g, CX, GY);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Left arm hangs low (no club)
  drawArm(g, CX - 16, torsoTop + 8, CX - 22, torsoTop + torsoH + 2);

  // Right arm holds club resting on shoulder
  const clubAngle = -0.2 + Math.sin(t * Math.PI * 2) * 0.03;
  drawArm(g, CX + 16, torsoTop + 8, CX + 22, torsoTop + torsoH - 6);
  drawClub(g, CX + 22, torsoTop + torsoH - 6, clubAngle, 32);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 2.5;

  const legH = 14;
  const torsoH = 28;
  const stanceL = Math.round(walk * 4);
  const stanceR = Math.round(-walk * 4);
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 4 - Math.round(bob * 0.4);
  const headTop = torsoTop - 16;

  // Ground shake indicator
  if (Math.abs(walk) > 0.8) {
    drawShadow(g, CX, GY, 32, 9, 0.3);
  } else {
    drawShadow(g, CX, GY, 30 + Math.abs(walk) * 3, 8);
  }

  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.8);
  drawHead(g, CX, headTop, walk * 0.6);

  // Arms swing with gait
  const armSwing = walk * 3;
  drawArm(g, CX - 16, torsoTop + 8, CX - 22 - armSwing, torsoTop + torsoH + 2);
  drawArm(g, CX + 16, torsoTop + 8, CX + 22 + armSwing, torsoTop + torsoH - 6);
  drawClub(g, CX + 22 + armSwing, torsoTop + torsoH - 6, -0.15 + walk * 0.06, 32);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: raises club high → smashes down with massive impact
  const phases = [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 14;
  const torsoH = 28;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 4;
  const headTop = torsoTop - 16;

  const lean = t < 0.5 ? t * 4 : (1 - t) * 7;

  // Club arc
  let clubAngle: number;
  if (t < 0.2) {
    clubAngle = lerp(-0.2, -2.0, t / 0.2);
  } else if (t < 0.5) {
    clubAngle = lerp(-2.0, -2.8, (t - 0.2) / 0.3);
  } else if (t < 0.82) {
    clubAngle = lerp(-2.8, 1.5, (t - 0.5) / 0.32);
  } else {
    clubAngle = lerp(1.5, -0.2, (t - 0.82) / 0.18);
  }

  const armReach = t < 0.5 ? t * 6 : (1 - t) * 10;
  const lunge = t > 0.3 && t < 0.85 ? 5 : 0;

  drawShadow(g, CX + lean, GY, 30 + lean, 8);
  drawFeet(g, CX, GY, -2, lunge);
  drawLegs(g, CX, legTop, legH, -2, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.5);

  // Left arm braces
  drawArm(g, CX - 16 + lean, torsoTop + 8, CX - 20, torsoTop + torsoH);

  // Right arm swings club
  const handX = CX + 20 + lean + armReach;
  const handY = torsoTop + 4;
  drawArm(g, CX + 16 + lean, torsoTop + 8, handX, handY);
  drawClub(g, handX, handY, clubAngle, 35);

  // Massive ground impact at peak of downswing
  if (t >= 0.6 && t <= 0.82) {
    const impactT = clamp01(1 - Math.abs(t - 0.72) / 0.12);
    const impX = handX + Math.sin(clubAngle) * 35;
    const impY = handY - Math.cos(clubAngle) * 35;

    // Shockwave
    g.circle(impX, impY, 12).fill({ color: 0xffffff, alpha: impactT * 0.25 });
    g.circle(impX, impY, 7).fill({ color: 0xffddaa, alpha: impactT * 0.2 });

    // Debris particles
    for (let i = 0; i < 5; i++) {
      const da = (i / 5) * Math.PI * 2 + t * 4;
      const dd = 6 + i * 3;
      g.circle(impX + Math.cos(da) * dd, impY + Math.sin(da) * dd, 1.5 - i * 0.2)
        .fill({ color: COL_STONE_DK, alpha: impactT * 0.4 });
    }

    // Ground crack lines
    for (let i = 0; i < 3; i++) {
      const ca = -0.5 + i * 0.5;
      g.moveTo(impX, impY)
        .lineTo(impX + Math.cos(ca) * 12, impY + Math.sin(ca) * 8)
        .stroke({ color: COL_SHADOW, width: 1, alpha: impactT * 0.3 });
    }
  }

  // Heavy swing trail
  if (t >= 0.42 && t <= 0.72) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.57) / 0.15);
    g.moveTo(handX + 4, handY - 20)
      .bezierCurveTo(
        handX + 18,
        handY - 10,
        handX + 20,
        handY + 10,
        handX + 12,
        handY + 20,
      )
      .stroke({ color: 0xddaa77, width: 3, alpha: trailAlpha * 0.35 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: troll regeneration — green glow pulses, wounds visibly heal
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 14;
  const torsoH = 28;
  const legTop = GY - 7 - legH;
  const torsoTop = legTop - torsoH + 4;
  const headTop = torsoTop - 16;

  // Regeneration glow
  const glowR = 16 + intensity * 10 + pulse * 5;
  g.circle(CX, torsoTop + torsoH * 0.4, glowR).fill({
    color: COL_REGEN,
    alpha: 0.04 + intensity * 0.06,
  });
  g.circle(CX, torsoTop + torsoH * 0.4, glowR * 0.5).fill({
    color: COL_REGEN,
    alpha: 0.06 + intensity * 0.06,
  });
  g.circle(CX, torsoTop + torsoH * 0.4, glowR * 0.2).fill({
    color: COL_REGEN_CORE,
    alpha: 0.08 + intensity * 0.06,
  });

  drawShadow(g, CX, GY, 30, 8, 0.25 + intensity * 0.1);
  drawFeet(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Arms slightly raised, club in one hand
  const raise = intensity * 3;
  drawArm(g, CX - 16, torsoTop + 8, CX - 20, torsoTop + torsoH - raise);
  drawArm(g, CX + 16, torsoTop + 8, CX + 20, torsoTop + torsoH - 6 - raise);
  drawClub(g, CX + 20, torsoTop + torsoH - 6 - raise, -0.3, 32);

  // Green healing particles rising from body
  if (intensity > 0.2) {
    for (let i = 0; i < 6; i++) {
      const px = CX + Math.sin(t * Math.PI * 2 + i * 1.1) * 14;
      const py = torsoTop + torsoH * 0.4 - t * 12 - i * 5;
      const pAlpha = clamp01(intensity - 0.2 - i * 0.05) * (0.3 + pulse * 0.2);
      g.circle(px, py, 1.8 - i * 0.15).fill({ color: COL_REGEN_CORE, alpha: pAlpha });
    }
  }

  // Healing veins on torso
  if (intensity > 0.3) {
    const vAlpha = clamp01(intensity - 0.3) * 0.3;
    g.moveTo(CX - 8, torsoTop + 12)
      .lineTo(CX - 12, torsoTop + 20)
      .stroke({ color: COL_REGEN, width: 0.8, alpha: vAlpha });
    g.moveTo(CX + 8, torsoTop + 10)
      .lineTo(CX + 14, torsoTop + 18)
      .stroke({ color: COL_REGEN, width: 0.8, alpha: vAlpha });
    g.moveTo(CX, torsoTop + 14)
      .lineTo(CX + 2, torsoTop + 22)
      .stroke({ color: COL_REGEN, width: 0.6, alpha: vAlpha * 0.8 });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: staggers, knees buckle, crashes to the ground
  const t = frame / 7;

  const legH = 14;
  const torsoH = 28;
  const legTop = GY - 7 - legH;

  const fallX = t * 14;
  const dropY = t * t * 14;
  const fallAngle = t * 0.8;

  const torsoTop = legTop - torsoH + 4 + dropY;
  const headTop = torsoTop - 16;

  drawShadow(g, CX + fallX * 0.4, GY, 30 + t * 6, 8, 0.25 * (1 - t * 0.4));

  // Legs buckle
  const squash = Math.round(t * 4);
  drawFeet(g, CX + fallX * 0.15, GY, t * 3, -t * 2, squash);
  if (t < 0.65) {
    drawLegs(
      g,
      CX + fallX * 0.15,
      legTop + dropY * 0.5,
      legH - squash,
      t * 3,
      -t * 2,
    );
  }

  // Torso crashes
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.12),
    fallAngle * 4,
  );
  drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.4, fallAngle * 5);

  // Club flies away
  if (t < 0.75) {
    const cdx = CX + 24 + t * 16;
    const cdy = torsoTop + torsoH * 0.3 + t * 10;
    drawClub(g, cdx, cdy, 0.5 + t * 3, 32 * (1 - t * 0.3));
  }

  // Arm flopped
  if (t > 0.4) {
    drawArm(
      g,
      CX + fallX * 0.4 + 10,
      torsoTop + 8,
      CX + fallX * 0.4 + 18,
      torsoTop + torsoH - 4,
    );
  }

  // Dust cloud on final impact
  if (t > 0.7) {
    const dustT = (t - 0.7) / 0.3;
    const dustAlpha = (1 - dustT) * 0.2;
    for (let i = 0; i < 4; i++) {
      const dx = CX + fallX * 0.4 + (i - 2) * 8;
      const dy = GY - 2 - dustT * 6;
      g.circle(dx, dy, 4 + dustT * 3).fill({
        color: COL_STONE_DK,
        alpha: dustAlpha,
      });
    }
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

/**
 * Generate all troll sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[], at 96×96 pixels per frame.
 */
export function generateTrollFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
