// Procedural sprite generator for the Volcanic Behemoth unit type.
//
// Draws a massive volcanic siege creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Massive quadruped beast of dark volcanic rock
//   • Back has a volcanic crater that smokes and glows orange
//   • Magma veins glow through body cracks, steam vents on shoulders
//   • Fills the entire 48×48 frame
//   • IDLE: crater smokes, magma veins pulse, occasional steam jet
//   • MOVE: heavy 4-legged stomp, ground cracks under feet, very slow
//   • ATTACK: rears up and launches molten boulder from back crater
//   • CAST: crater erupts with lava fountain, body glows intensely
//   • DIE: magma cools, crater goes dark, legs buckle and collapse into rock heap

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 2;

// Palette — volcanic rock beast
const COL_ROCK_DK     = 0x1a1210; // darkest basalt
const COL_ROCK_MID    = 0x2e2018; // main body rock
const COL_ROCK_LT     = 0x453428; // lighter rock face
const COL_ROCK_HI     = 0x5e4a38; // highlight ridges
const COL_CRACK_DARK  = 0x120a06; // crevice darkness
const COL_MAGMA       = 0xff4400; // magma vein
const COL_MAGMA_BRIGHT= 0xff8833; // bright lava
const COL_MAGMA_CORE  = 0xffcc55; // hottest centre
const COL_CRATER_RIM  = 0x3a2010; // crater rim rock
const COL_CRATER_GLOW = 0xff6600; // crater interior glow
const COL_CRATER_HOT  = 0xffaa22; // active crater hot spot
const COL_SMOKE_LT    = 0x5a4a40; // light smoke puff
const COL_SMOKE_DK    = 0x2e2018; // darker smoke
const COL_STEAM       = 0xb0a090; // steam vent vapour
const COL_LAVA_POOL   = 0xff5500; // pooled lava
const COL_BOULDER     = 0x2a1a10; // molten boulder rock
const COL_BOULDER_GLOW= 0xff6622; // boulder molten glow
const COL_GROUND_CRACK= 0x0e0806; // ground crack line
const COL_GROUND_LAVA = 0xff3300; // lava seeping into crack
const COL_COOLED      = 0x181010; // cooled obsidian
const COL_SHADOW      = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, scale = 1): void {
  g.ellipse(cx, GY + 1, 22 * scale, 4 * scale).fill({ color: COL_SHADOW, alpha: 0.55 });
  // magma heat glow on ground
  g.ellipse(cx, GY + 1, 16 * scale, 2.5 * scale).fill({ color: COL_MAGMA, alpha: 0.06 });
}

/** Draw a ground crack under a stomping foot */
function drawGroundCrack(g: Graphics, fx: number, alpha: number): void {
  if (alpha <= 0) return;
  // main crack lines radiating from impact
  const cracks = [
    [fx, GY, fx - 5, GY + 1.5],
    [fx, GY, fx + 6, GY + 1],
    [fx, GY, fx - 3, GY - 1],
    [fx, GY, fx + 4, GY - 1.5],
  ];
  for (const [x1, y1, x2, y2] of cracks) {
    g.moveTo(x1, y1).lineTo(x2, y2)
      .stroke({ color: COL_GROUND_CRACK, width: 0.8, alpha });
  }
  // lava seeping into widest cracks
  g.moveTo(fx - 4, GY + 1).lineTo(fx + 4, GY)
    .stroke({ color: COL_GROUND_LAVA, width: 0.4, alpha: alpha * 0.6 });
}

/**
 * Draw one massive leg of the behemoth.
 * lx: horizontal centre of leg
 * hipY: top of the leg (connects to body underside)
 * stepOffset: vertical foot displacement (negative = lifted)
 * footX: horizontal offset of foot from lx (for stomp lean)
 * crackAlpha: ground crack intensity (0 = no crack)
 */
function drawLeg(
  g: Graphics,
  lx: number,
  hipY: number,
  stepOffset: number,
  footX: number,
  crackAlpha: number,
): void {
  const kneeY  = hipY + 8 + stepOffset * 0.3;
  const footY  = hipY + 16 + stepOffset;
  const fx     = lx + footX;

  // upper leg — thick pillar of rock
  g.roundRect(lx - 5, hipY, 10, kneeY - hipY + 1, 2)
    .fill({ color: COL_ROCK_MID });
  // leg crack / vein
  g.moveTo(lx - 1, hipY + 2).lineTo(lx + 1, kneeY - 2)
    .stroke({ color: COL_MAGMA, width: 1, alpha: 0.7 });
  g.moveTo(lx - 1, hipY + 2).lineTo(lx + 1, kneeY - 2)
    .stroke({ color: COL_MAGMA_BRIGHT, width: 0.4, alpha: 0.5 });

  // knee joint — rounded rock knob
  g.circle(lx, kneeY, 4.5).fill({ color: COL_ROCK_DK });
  g.circle(lx, kneeY, 3).fill({ color: COL_ROCK_MID });
  g.circle(lx, kneeY, 1.5).fill({ color: COL_MAGMA, alpha: 0.6 });

  // lower leg / shin
  g.roundRect(fx - 4, kneeY, 8, footY - kneeY, 2)
    .fill({ color: COL_ROCK_DK });
  // shin crack
  g.moveTo(fx + 1, kneeY + 3).lineTo(fx - 1, footY - 3)
    .stroke({ color: COL_MAGMA, width: 0.8, alpha: 0.55 });

  // broad foot / hoof — flattened rock slab
  g.roundRect(fx - 7, footY, 14, 5, 1.5)
    .fill({ color: COL_ROCK_MID })
    .stroke({ color: COL_ROCK_DK, width: 0.5 });
  g.roundRect(fx - 5, footY + 1, 10, 2, 1)
    .fill({ color: COL_ROCK_LT, alpha: 0.4 });

  // ground crack on landing
  if (crackAlpha > 0.05) {
    drawGroundCrack(g, fx, crackAlpha);
  }
}

/**
 * Draw the massive body of the behemoth.
 * bx/by: body centre
 * breathe: subtle breathing offset
 * glowIntensity: 0-1 magma glow intensity
 */
function drawBody(
  g: Graphics,
  bx: number,
  by: number,
  breathe: number,
  glowIntensity: number,
): void {
  const bw = 20;
  const bh = 14;

  // main body mass — dark volcanic rock
  g.roundRect(bx - bw, by - bh * 0.5, bw * 2, bh, 4)
    .fill({ color: COL_ROCK_DK });
  g.roundRect(bx - bw + 2, by - bh * 0.5 + 1, bw * 2 - 4, bh - 2, 3)
    .fill({ color: COL_ROCK_MID });

  // top surface rock texture with highlight ridges
  g.roundRect(bx - bw + 4, by - bh * 0.5 + 1, bw * 2 - 8, bh * 0.4, 2)
    .fill({ color: COL_ROCK_LT });
  g.roundRect(bx - bw + 6, by - bh * 0.5 + 1, bw * 2 - 12, 2, 1)
    .fill({ color: COL_ROCK_HI, alpha: 0.45 });

  // major magma veins running along body sides
  // left side veins
  g.moveTo(bx - bw + 3, by - bh * 0.4)
    .quadraticCurveTo(bx - bw + 6, by, bx - bw + 3, by + bh * 0.4)
    .stroke({ color: COL_MAGMA, width: 1.5, alpha: 0.6 + glowIntensity * 0.3 });
  g.moveTo(bx - bw + 3, by - bh * 0.4)
    .quadraticCurveTo(bx - bw + 6, by, bx - bw + 3, by + bh * 0.4)
    .stroke({ color: COL_MAGMA_BRIGHT, width: 0.7, alpha: 0.5 + glowIntensity * 0.35 });

  // right side veins
  g.moveTo(bx + bw - 3, by - bh * 0.4)
    .quadraticCurveTo(bx + bw - 6, by, bx + bw - 3, by + bh * 0.4)
    .stroke({ color: COL_MAGMA, width: 1.5, alpha: 0.6 + glowIntensity * 0.3 });
  g.moveTo(bx + bw - 3, by - bh * 0.4)
    .quadraticCurveTo(bx + bw - 6, by, bx + bw - 3, by + bh * 0.4)
    .stroke({ color: COL_MAGMA_BRIGHT, width: 0.7, alpha: 0.5 + glowIntensity * 0.35 });

  // diagonal crack across centre of back
  g.moveTo(bx - 10, by - bh * 0.35 + breathe)
    .lineTo(bx + 4, by + bh * 0.25 + breathe)
    .stroke({ color: COL_CRACK_DARK, width: 1.2 });
  g.moveTo(bx - 10, by - bh * 0.35 + breathe)
    .lineTo(bx + 4, by + bh * 0.25 + breathe)
    .stroke({ color: COL_MAGMA, width: 0.6, alpha: 0.4 + glowIntensity * 0.4 });

  // glowing inner core visible through major crack
  g.ellipse(bx, by, 5 + glowIntensity * 2, 3 + glowIntensity * 1.5)
    .fill({ color: COL_MAGMA_CORE, alpha: 0.08 + glowIntensity * 0.12 });

  // shoulder armor knobs / steam vents
  for (const side of [-1, 1] as const) {
    const sx = bx + side * (bw - 5);
    const sy = by - bh * 0.5;

    // shoulder rock knob
    g.ellipse(sx, sy, 5, 4).fill({ color: COL_ROCK_DK });
    g.ellipse(sx, sy, 3.5, 2.8).fill({ color: COL_ROCK_MID });

    // steam vent crack on shoulder
    g.moveTo(sx - 1, sy - 2).lineTo(sx + 1, sy + 1)
      .stroke({ color: COL_MAGMA, width: 1, alpha: 0.55 + glowIntensity * 0.3 });
  }
}

/**
 * Draw the massive head of the behemoth.
 * hx/hy: centre of the head
 * nod: forward tilt (positive = head down)
 */
function drawHead(
  g: Graphics,
  hx: number,
  hy: number,
  nod: number,
  glowIntensity: number,
): void {
  const hw = 11;
  const hh = 9;
  const hn = hy + nod;

  // neck slab
  g.roundRect(hx - 6, hn - 2, 12, 7, 2).fill({ color: COL_ROCK_DK });
  // neck magma vein
  g.moveTo(hx, hn).lineTo(hx + 1, hn + 5)
    .stroke({ color: COL_MAGMA, width: 1, alpha: 0.55 });

  // main skull — broad and low, like a boulder
  g.roundRect(hx - hw, hn - hh, hw * 2, hh, 3)
    .fill({ color: COL_ROCK_DK });
  g.roundRect(hx - hw + 1, hn - hh + 1, hw * 2 - 2, hh - 1, 2)
    .fill({ color: COL_ROCK_MID });

  // brow ridge — heavy overhang
  g.roundRect(hx - hw - 1, hn - hh - 2, hw * 2 + 2, 5, 2)
    .fill({ color: COL_ROCK_DK });
  g.roundRect(hx - hw, hn - hh - 1, hw * 2, 3, 1)
    .fill({ color: COL_ROCK_LT, alpha: 0.3 });

  // snout / muzzle
  g.roundRect(hx - 6, hn - 5, 12, 6, 2).fill({ color: COL_ROCK_MID });
  // nostril magma slits
  g.moveTo(hx - 3, hn - 2).lineTo(hx - 1, hn - 2)
    .stroke({ color: COL_MAGMA, width: 1.2, alpha: 0.7 + glowIntensity * 0.25 });
  g.moveTo(hx + 3, hn - 2).lineTo(hx + 1, hn - 2)
    .stroke({ color: COL_MAGMA, width: 1.2, alpha: 0.7 + glowIntensity * 0.25 });

  // eyes — glowing ember slits beneath brow
  for (const side of [-1, 1] as const) {
    const ex = hx + side * 5;
    const ey = hn - hh + 3;
    g.ellipse(ex, ey, 2.5, 1.2).fill({ color: COL_CRACK_DARK });
    g.ellipse(ex, ey, 1.8, 0.8).fill({ color: COL_MAGMA_BRIGHT, alpha: 0.7 + glowIntensity * 0.25 });
    g.ellipse(ex, ey, 1, 0.5).fill({ color: COL_MAGMA_CORE, alpha: 0.8 + glowIntensity * 0.2 });
  }

  // head cracks
  g.moveTo(hx - 4, hn - hh).lineTo(hx - 2, hn - hh + 4)
    .stroke({ color: COL_CRACK_DARK, width: 0.8 });
  g.moveTo(hx + 3, hn - hh + 1).lineTo(hx + 5, hn - hh + 5)
    .stroke({ color: COL_MAGMA, width: 0.5, alpha: 0.45 });
}

/**
 * Draw the volcanic crater on the behemoth's back.
 * cx/cy: centre of crater opening
 * smokePhase: drives smoke animation
 * eruptProgress: 0 = dormant, 1 = full eruption
 */
function drawCrater(
  g: Graphics,
  cx: number,
  cy: number,
  smokePhase: number,
  eruptProgress: number,
): void {
  const cw = 7;
  const ch = 4;

  // crater bowl — glowing interior
  g.ellipse(cx, cy, cw, ch).fill({ color: COL_CRATER_RIM });
  g.ellipse(cx, cy, cw - 1.5, ch - 0.8).fill({ color: COL_MAGMA, alpha: 0.5 + eruptProgress * 0.4 });
  g.ellipse(cx, cy, cw - 3, ch - 1.5).fill({ color: COL_CRATER_GLOW, alpha: 0.6 + eruptProgress * 0.35 });
  g.ellipse(cx, cy + 0.5, cw - 5, ch - 2).fill({ color: COL_CRATER_HOT, alpha: 0.65 + eruptProgress * 0.3 });
  // bright core pool
  g.ellipse(cx, cy + 1, cw - 6.5, ch - 3).fill({ color: COL_MAGMA_CORE, alpha: 0.55 + eruptProgress * 0.35 });

  // crater rim raised rock edge
  g.ellipse(cx, cy, cw, ch).stroke({ color: COL_ROCK_DK, width: 1.5 });
  g.ellipse(cx, cy, cw + 0.5, ch + 0.3).stroke({ color: COL_ROCK_LT, width: 0.6, alpha: 0.4 });

  // rising smoke puffs
  const smokeCount = 3;
  for (let i = 0; i < smokeCount; i++) {
    const pPhase = (smokePhase + i * 0.33) % 1;
    const py = cy - pPhase * 16 - 3;
    const pr = 1.5 + pPhase * 3.5;
    const px = cx + Math.sin(pPhase * Math.PI * 2 + i * 1.2) * 2.5;
    const smokeFade = pPhase < 0.3 ? pPhase / 0.3 : 1 - (pPhase - 0.3) / 0.7;
    if (py > cy - 22) {
      g.circle(px, py, pr).fill({ color: i % 2 === 0 ? COL_SMOKE_LT : COL_SMOKE_DK, alpha: smokeFade * (0.35 + eruptProgress * 0.2) });
    }
  }

  // eruption lava fountain
  if (eruptProgress > 0.15) {
    const fountainH = eruptProgress * 22;
    // main lava jet
    g.roundRect(cx - 2, cy - fountainH, 4, fountainH, 1)
      .fill({ color: COL_MAGMA, alpha: 0.7 * eruptProgress });
    g.roundRect(cx - 1, cy - fountainH + 1, 2, fountainH - 2, 1)
      .fill({ color: COL_MAGMA_BRIGHT, alpha: 0.65 * eruptProgress });
    // spray particles
    for (let i = 0; i < 5; i++) {
      const sprayAngle = -Math.PI * 0.5 + (i - 2) * 0.35;
      const sprayDist  = fountainH * 0.6 + i * 2;
      g.circle(
        cx + Math.cos(sprayAngle) * sprayDist,
        cy + Math.sin(sprayAngle) * sprayDist,
        1.2 + (i % 2) * 0.6,
      ).fill({ color: i % 2 === 0 ? COL_MAGMA_BRIGHT : COL_MAGMA_CORE, alpha: 0.65 * eruptProgress });
    }
  }
}

/**
 * Draw steam jet from a shoulder vent.
 * sx/sy: vent position, phase: animation phase
 */
function drawSteamVent(g: Graphics, sx: number, sy: number, phase: number, alpha = 1): void {
  const rise = (phase % 1) * 14;
  const steamA = phase < 0.4 ? phase / 0.4 : 1 - (phase - 0.4) / 0.6;
  g.moveTo(sx, sy)
    .quadraticCurveTo(sx + Math.sin(phase * 3.1) * 2.5, sy - rise * 0.5, sx + Math.sin(phase * 2.7) * 3, sy - rise)
    .stroke({ color: COL_STEAM, width: 2.5 - rise * 0.1, alpha: steamA * 0.5 * alpha });
  g.circle(sx + Math.sin(phase * 2.7) * 3, sy - rise, 1.5 + rise * 0.12)
    .fill({ color: COL_STEAM, alpha: steamA * 0.2 * alpha });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const phase = t * Math.PI * 2;
  const breathe = Math.sin(phase) * 0.5;
  const glowPulse = Math.sin(phase * 1.3) * 0.5 + 0.5;
  const smokePhase = t;

  // body sits solidly — all four legs planted
  const bodyY = GY - 18 + breathe;
  const headY = bodyY - 12;

  // front legs
  const flHipY = bodyY + 3;
  const blHipY = bodyY + 3;

  drawShadow(g, CX);

  // ground cracks from weight — always present at idle
  drawGroundCrack(g, CX - 14, 0.3);
  drawGroundCrack(g, CX + 14, 0.3);

  // rear legs (drawn first, behind body)
  drawLeg(g, CX - 12, blHipY, 0, 1, 0);
  drawLeg(g, CX + 12, blHipY, 0, -1, 0);

  drawBody(g, CX, bodyY, breathe, glowPulse);

  // steam vents on shoulders
  const lSteamX = CX - 14;
  const rSteamX = CX + 14;
  const ventY = bodyY - 6;
  drawSteamVent(g, lSteamX, ventY, smokePhase + 0.15);
  drawSteamVent(g, rSteamX, ventY, smokePhase + 0.55);

  // crater on back — between shoulders, slightly forward of centre
  drawCrater(g, CX + 2, bodyY - 7, smokePhase, 0);

  // front legs (drawn over body front)
  drawLeg(g, CX - 14, flHipY, 0, -1, 0);
  drawLeg(g, CX + 14, flHipY, 0, 1, 0);

  drawHead(g, CX - 6, headY + breathe * 0.3, 1, glowPulse);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const phase = t * Math.PI * 2;
  // very slow, heavy gait — two legs move at a time (diagonal pairs)
  const stepA = Math.sin(phase);       // front-left, back-right
  const stepB = Math.sin(phase + Math.PI); // front-right, back-left
  const bob = Math.abs(Math.sin(phase)) * -1.5; // body drops on double-support

  const bodyY = GY - 18 + bob;
  const headY = bodyY - 12;
  const smokePhase = t;

  // step offsets — negative = foot lifted
  const flStep = stepA * 3.5;  // front-left offset
  const frStep = stepB * 3.5;  // front-right
  const blStep = stepB * 3.0;  // back-left (diagonal pair with front-right)
  const brStep = stepA * 3.0;  // back-right

  // foot X lean during swing
  const flFX = stepA * 1.5;
  const frFX = stepB * -1.5;
  const blFX = stepB * -1;
  const brFX = stepA * 1;

  // crack alpha only when foot is hitting down
  const flCrack = clamp01(-stepA + 0.2) * 0.7;
  const frCrack = clamp01(-stepB + 0.2) * 0.7;
  const blCrack = clamp01(-stepB + 0.15) * 0.6;
  const brCrack = clamp01(-stepA + 0.15) * 0.6;

  drawShadow(g, CX, 0.95);

  // ground cracks at impact feet
  drawGroundCrack(g, CX - 14 + flFX, flCrack);
  drawGroundCrack(g, CX + 14 + frFX, frCrack);
  drawGroundCrack(g, CX - 12 + blFX, blCrack);
  drawGroundCrack(g, CX + 12 + brFX, brCrack);

  // rear legs behind body
  drawLeg(g, CX - 12, bodyY + 3, blStep, blFX, blCrack);
  drawLeg(g, CX + 12, bodyY + 3, brStep, brFX, brCrack);

  drawBody(g, CX, bodyY, bob * 0.3, 0.5);

  // steam vents more active while moving
  drawSteamVent(g, CX - 14, bodyY - 6, smokePhase, 1.2);
  drawSteamVent(g, CX + 14, bodyY - 6, smokePhase + 0.5, 1.2);

  drawCrater(g, CX + 2, bodyY - 7, smokePhase, 0.1);

  // front legs over body
  drawLeg(g, CX - 14, bodyY + 3, flStep, flFX, flCrack);
  drawLeg(g, CX + 14, bodyY + 3, frStep, frFX, frCrack);

  drawHead(g, CX - 6, headY + bob * 0.5, 1.5, 0.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: rearing up begins, back legs brace
  // 2-3: full rear, front legs raised, crater heats up
  // 4-5: boulder launches from crater
  // 6-7: crashes back down, impact shockwave
  const phases = [0, 0.13, 0.27, 0.43, 0.58, 0.72, 0.86, 1.0];
  const t = phases[Math.min(frame, 7)];

  const rear      = t < 0.5 ? clamp01(t / 0.43) : clamp01(1 - (t - 0.43) / 0.57);
  const crashDown = clamp01((t - 0.72) / 0.28);
  const launch    = clamp01((t - 0.5) / 0.2);
  const launchEnd = clamp01((t - 0.7) / 0.15);

  // body tilts back when rearing
  const bodyY    = GY - 18 - rear * 6;
  const bodyTilt = rear * 3; // head rises more
  const headY    = bodyY - 12 - bodyTilt;
  const smokePhase = t;

  // back legs push down / brace; front legs rise
  const blStep = -rear * 2;
  const brStep = -rear * 2;
  const flStep = -rear * 5; // front feet lift off ground
  const frStep = -rear * 5;

  drawShadow(g, CX, 1 - rear * 0.2);

  // crash shockwave ground cracks on landing
  if (crashDown > 0.3) {
    const crackA = (crashDown - 0.3) / 0.7;
    drawGroundCrack(g, CX - 14, crackA);
    drawGroundCrack(g, CX + 14, crackA);
    // extra large impact cracks
    g.moveTo(CX - 20, GY).lineTo(CX - 28, GY + 2)
      .stroke({ color: COL_GROUND_CRACK, width: 1, alpha: crackA * 0.7 });
    g.moveTo(CX + 20, GY).lineTo(CX + 28, GY + 2)
      .stroke({ color: COL_GROUND_CRACK, width: 1, alpha: crackA * 0.7 });
    g.moveTo(CX, GY + 1).lineTo(CX - 8, GY + 3).lineTo(CX + 8, GY + 3)
      .stroke({ color: COL_GROUND_LAVA, width: 0.6, alpha: crackA * 0.5 });
  }

  // rear legs (brace)
  drawLeg(g, CX - 12, bodyY + 3, blStep, -1, 0);
  drawLeg(g, CX + 12, bodyY + 3, brStep, 1, 0);

  drawBody(g, CX, bodyY, rear * 0.5, 0.3 + rear * 0.7);

  // steam vents intense during rear
  if (rear > 0.3) {
    drawSteamVent(g, CX - 14, bodyY - 6, smokePhase, 1.5);
    drawSteamVent(g, CX + 14, bodyY - 6, smokePhase + 0.5, 1.5);
  }

  // crater erupts with a boulder launching
  drawCrater(g, CX + 2, bodyY - 7, smokePhase, rear * 0.6);

  // molten boulder in flight (launched on frame 4-5)
  if (launch > 0 && launchEnd < 1) {
    const boulderProgress = launch;
    const boulderT = 1 - launchEnd;
    const boulderX = (CX + 2) + boulderProgress * 22;
    const boulderY = (bodyY - 7) - boulderProgress * 14 + boulderProgress * boulderProgress * 12;
    const boulderR = 4 * boulderT;

    // molten boulder shell
    g.circle(boulderX, boulderY, boulderR + 1.5)
      .fill({ color: COL_BOULDER, alpha: 0.85 });
    g.circle(boulderX, boulderY, boulderR)
      .fill({ color: COL_BOULDER_GLOW, alpha: 0.8 });
    g.circle(boulderX, boulderY, boulderR * 0.55)
      .fill({ color: COL_MAGMA_BRIGHT, alpha: 0.7 });
    g.circle(boulderX, boulderY, boulderR * 0.3)
      .fill({ color: COL_MAGMA_CORE, alpha: 0.65 });

    // trailing lava sparks
    for (let i = 0; i < 5; i++) {
      const trailX = boulderX - boulderProgress * 5 - i * 2.5;
      const trailY = boulderY + i * 1.5;
      g.circle(trailX, trailY, 0.8 - i * 0.12)
        .fill({ color: COL_MAGMA_BRIGHT, alpha: clamp01((0.6 - i * 0.1) * boulderT) });
    }
  }

  // front legs raised during rear
  drawLeg(g, CX - 14, bodyY + 3, flStep, -2, 0);
  drawLeg(g, CX + 14, bodyY + 3, frStep, 2, 0);

  drawHead(g, CX - 6, headY, 1 - rear * 1.5, 0.4 + rear * 0.5);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 0-2: body glows hotter, magma veins pulse
  // 3-4: crater erupts fully, lava fountain
  // 5-6: full eruption, body glows intensely
  // 7: subsiding
  const t = frame / 7;
  const phase = t * Math.PI * 2;
  const eruptProgress = clamp01((t - 0.2) / 0.6);
  const peakGlow = Math.sin(t * Math.PI) * 0.9 + 0.1;
  const smokePhase = t;

  const breathe = Math.sin(phase) * 0.3;
  const bodyY = GY - 18 + breathe;
  const headY = bodyY - 12;

  drawShadow(g, CX);

  // intense ground cracks from heat
  if (eruptProgress > 0.4) {
    const crackA = (eruptProgress - 0.4) / 0.6;
    for (let i = 0; i < 4; i++) {
      const angle = -0.4 + i * 0.27;
      const len = crackA * 16;
      g.moveTo(CX + Math.cos(angle) * 5, GY)
        .lineTo(CX + Math.cos(angle) * len, GY + Math.sin(angle) * 3)
        .stroke({ color: COL_GROUND_CRACK, width: 0.9, alpha: crackA * 0.8 });
      g.moveTo(CX + Math.cos(angle) * 5, GY)
        .lineTo(CX + Math.cos(angle) * len * 0.6, GY + Math.sin(angle) * 2)
        .stroke({ color: COL_GROUND_LAVA, width: 0.4, alpha: crackA * 0.55 });
    }
  }

  // lava pooling on ground during eruption
  if (eruptProgress > 0.5) {
    const poolA = (eruptProgress - 0.5) * 2;
    g.ellipse(CX, GY + 1, 8 + poolA * 6, 2).fill({ color: COL_LAVA_POOL, alpha: poolA * 0.4 });
    g.ellipse(CX, GY + 1, 4 + poolA * 3, 1).fill({ color: COL_MAGMA_CORE, alpha: poolA * 0.25 });
  }

  // rear legs
  drawLeg(g, CX - 12, bodyY + 3, 0, 1, 0);
  drawLeg(g, CX + 12, bodyY + 3, 0, -1, 0);

  drawBody(g, CX, bodyY, breathe, peakGlow);

  // very active steam vents
  drawSteamVent(g, CX - 14, bodyY - 6, smokePhase, 1.8);
  drawSteamVent(g, CX + 14, bodyY - 6, smokePhase + 0.4, 1.8);
  // extra vent in middle of back during full eruption
  if (eruptProgress > 0.6) {
    drawSteamVent(g, CX - 5, bodyY - 8, smokePhase + 0.8, (eruptProgress - 0.6) * 2.5);
  }

  // full crater eruption
  drawCrater(g, CX + 2, bodyY - 7, smokePhase, eruptProgress);

  // lava droplets raining down from fountain apex
  if (eruptProgress > 0.45) {
    const dropCount = Math.round((eruptProgress - 0.45) * 12);
    for (let i = 0; i < dropCount; i++) {
      const seed = i * 97.3 + t * 15;
      const lx = CX + Math.sin(seed * 0.5) * 14;
      const ly = bodyY - 7 - eruptProgress * 22 + (seed % 18);
      if (ly > bodyY - 40 && ly < bodyY - 5) {
        g.circle(lx, ly, 0.9 + (i % 2) * 0.5)
          .fill({ color: i % 2 === 0 ? COL_MAGMA_BRIGHT : COL_MAGMA, alpha: 0.65 });
      }
    }
  }

  // intense body-glow ring during peak
  if (peakGlow > 0.5) {
    g.ellipse(CX, bodyY, 22, 14)
      .stroke({ color: COL_MAGMA, width: 2, alpha: (peakGlow - 0.5) * 0.3 });
    g.ellipse(CX, bodyY, 24, 16)
      .stroke({ color: COL_MAGMA_BRIGHT, width: 1, alpha: (peakGlow - 0.5) * 0.15 });
  }

  // front legs
  drawLeg(g, CX - 14, bodyY + 3, 0, -1, 0);
  drawLeg(g, CX + 14, bodyY + 3, 0, 1, 0);

  drawHead(g, CX - 6, headY + breathe * 0.3, 0.5, peakGlow);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  // phase 0-0.3: magma veins cool from bright to dark
  // phase 0.3-0.6: legs buckle, body sinks
  // phase 0.6-0.85: collapse to rubble heap
  // phase 0.85-1: final darkness
  const cool       = clamp01(t / 0.4);
  const buckle     = clamp01((t - 0.25) / 0.4);
  const collapse   = clamp01((t - 0.55) / 0.4);
  const finalDark  = clamp01((t - 0.82) / 0.18);

  // glow fades as magma cools
  const glowFade   = clamp01(1 - cool * 0.9);
  const magmaAlpha = clamp01(1 - cool * 1.1);

  const sinkY = buckle * 8 + collapse * 6;
  const bodyY = GY - 18 + sinkY;
  const headY = bodyY - 12 + collapse * 5;

  drawShadow(g, CX, 1 - collapse * 0.5);

  // dying smoke trails — dimming
  if (t > 0.1 && t < 0.75) {
    for (let i = 0; i < 3; i++) {
      const sy = bodyY - 10 - (t - 0.1) * 20 - i * 6;
      const sx = CX + Math.sin(i * 2.0 + t * 2.5) * 8;
      g.circle(sx, sy, 2 + i * 0.8)
        .fill({ color: COL_SMOKE_DK, alpha: 0.25 * (1 - t) });
    }
  }

  // rear legs buckle inward as they weaken
  // lerp from standing position (0) to full buckle+collapse (12) over death sequence
  const legSink = lerp(0, 12, clamp01(buckle * 0.4 + collapse * 0.85));

  if (collapse < 0.85) {
    drawLeg(g, CX - 12, bodyY + 3, legSink, 2, 0);
    drawLeg(g, CX + 12, bodyY + 3, legSink, -2, 0);
  }

  // body — rock darkens, cracks stop glowing
  if (collapse < 0.95) {
    // draw cooled body — same shape but with fading glow
    const bw = 20;
    const bh = 14;
    g.roundRect(CX - bw, bodyY - bh * 0.5, bw * 2, bh, 4)
      .fill({ color: cool > 0.6 ? COL_COOLED : COL_ROCK_DK });
    g.roundRect(CX - bw + 2, bodyY - bh * 0.5 + 1, bw * 2 - 4, bh - 2, 3)
      .fill({ color: cool > 0.6 ? COL_CRACK_DARK : COL_ROCK_MID });

    // fading magma veins — go dark as they cool
    if (magmaAlpha > 0.05) {
      g.moveTo(CX - bw + 3, bodyY - bh * 0.4)
        .quadraticCurveTo(CX - bw + 6, bodyY, CX - bw + 3, bodyY + bh * 0.4)
        .stroke({ color: COL_MAGMA, width: 1.5, alpha: magmaAlpha * 0.6 });
      g.moveTo(CX + bw - 3, bodyY - bh * 0.4)
        .quadraticCurveTo(CX + bw - 6, bodyY, CX + bw - 3, bodyY + bh * 0.4)
        .stroke({ color: COL_MAGMA, width: 1.5, alpha: magmaAlpha * 0.6 });
      g.moveTo(CX - 10, bodyY - bh * 0.35)
        .lineTo(CX + 4, bodyY + bh * 0.25)
        .stroke({ color: COL_MAGMA, width: 0.6, alpha: magmaAlpha * 0.4 });
    }
  }

  // crater goes dark — no more smoke or glow
  if (collapse < 0.75) {
    const craterGlow = glowFade * 0.5;
    g.ellipse(CX + 2, bodyY - 7, 7, 4).fill({ color: COL_CRATER_RIM });
    g.ellipse(CX + 2, bodyY - 7, 5.5, 3.2).fill({ color: COL_MAGMA, alpha: craterGlow * 0.5 });
    g.ellipse(CX + 2, bodyY - 6, 3.5, 2).fill({ color: COL_CRATER_GLOW, alpha: craterGlow * 0.4 });
  }

  // front legs buckle/collapse
  if (collapse < 0.9) {
    drawLeg(g, CX - 14, bodyY + 3, legSink, -3, 0);
    drawLeg(g, CX + 14, bodyY + 3, legSink, 3, 0);
  }

  // head — eyes go dark, head droops
  if (collapse < 0.85) {
    const headGlow = glowFade * 0.6;
    const hx = CX - 6;
    const hn = headY + 1 + collapse * 4;
    const hw = 11;
    const hh = 9;

    g.roundRect(hx - 6, hn - 2, 12, 7, 2)
      .fill({ color: cool > 0.7 ? COL_COOLED : COL_ROCK_DK });
    g.roundRect(hx - hw, hn - hh, hw * 2, hh, 3)
      .fill({ color: cool > 0.7 ? COL_COOLED : COL_ROCK_DK });
    g.roundRect(hx - hw + 1, hn - hh + 1, hw * 2 - 2, hh - 1, 2)
      .fill({ color: cool > 0.6 ? COL_CRACK_DARK : COL_ROCK_MID });
    g.roundRect(hx - hw - 1, hn - hh - 2, hw * 2 + 2, 5, 2)
      .fill({ color: COL_ROCK_DK });

    // dimming eyes
    if (cool < 0.8) {
      for (const side of [-1, 1] as const) {
        const ex = hx + side * 5;
        const ey = hn - hh + 3;
        g.ellipse(ex, ey, 2.5, 1.2).fill({ color: COL_CRACK_DARK });
        g.ellipse(ex, ey, 1.8, 0.8).fill({ color: COL_MAGMA_BRIGHT, alpha: headGlow * 0.8 });
      }
    }
  }

  // rubble chunks scatter during collapse
  if (collapse > 0.2) {
    const chunkCount = Math.min(8, Math.round((collapse - 0.2) * 14));
    for (let i = 0; i < chunkCount; i++) {
      const angle = i * 0.78 + collapse * 1.5;
      const dist  = (collapse - 0.2) * 18 + i * 2;
      const rx = CX + Math.cos(angle) * dist;
      const ry = bodyY + 4 + Math.sin(angle) * dist * 0.5 + collapse * 8;
      const rs = 2.5 - i * 0.25;
      if (rs > 0.4) {
        g.roundRect(rx - rs, ry - rs, rs * 2, rs * 2, 0.5)
          .fill({ color: cool > 0.5 ? COL_COOLED : COL_ROCK_DK, alpha: 1 - finalDark * 0.8 });
        // tiny magma glow in fresh cracks
        if (magmaAlpha > 0.1 && i < 4) {
          g.circle(rx, ry, rs * 0.4)
            .fill({ color: COL_MAGMA, alpha: magmaAlpha * 0.35 });
        }
      }
    }
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
 * Generate all Volcanic Behemoth sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateVolcanicBehemothFrames(renderer: Renderer): RenderTexture[] {
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
