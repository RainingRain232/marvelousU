// Procedural sprite generator for the Skirmisher unit type.
//
// Draws a lean, agile javelin-thrower in light leather armor at 48x48 pixels
// per frame using PixiJS Graphics -> RenderTexture.  Produces textures for
// every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - Light leather armor with green cloak
//   - Javelins (shaft + metal tip)
//   - Red headband
//   - Lean, agile build
//   - Fast, bouncy movement style

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette - leather & green cloak
const COL_LEATHER      = 0x997744;
const COL_LEATHER_DARK = 0x775533;
const COL_LEATHER_HI   = 0xbb9966;
const COL_CLOAK        = 0x448844;
const COL_CLOAK_DARK   = 0x336633;
const COL_CLOAK_EDGE   = 0x2a5a2a;
const COL_HEADBAND     = 0xcc4444;
const COL_HEADBAND_DK  = 0x993333;
const COL_SKIN         = 0xd4a574;
const COL_SKIN_DARK    = 0xb8875a;
const COL_HAIR         = 0x443322;
const COL_JAV_SHAFT    = 0x886644;
const COL_JAV_TIP      = 0xaabbcc;
const COL_JAV_TIP_HI   = 0xccddee;
const COL_JAV_WRAP     = 0x997755;
const COL_BOOT         = 0x664422;
const COL_BOOT_DK      = 0x443311;
const COL_SHADOW       = 0x000000;

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
function drawShadow(g: Graphics, cx: number, gy: number, w = 11, h = 3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

/** Light boots - agile footwear. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 4, bh = 5;
  g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

/** Lean legs. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 3, legH).fill({ color: COL_LEATHER_DARK });
  g.rect(cx + 2 + stanceR, legTop, 3, legH).fill({ color: COL_LEATHER_DARK });
}

/** Light leather torso - fitted and slim. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 11;
  const x = cx - tw / 2 + tilt;

  // Main leather body
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_LEATHER })
    .stroke({ color: COL_LEATHER_DARK, width: 0.6 });

  // Stitching detail
  g.moveTo(x + tw / 2, torsoTop + 1)
    .lineTo(x + tw / 2, torsoTop + torsoH - 1)
    .stroke({ color: COL_LEATHER_HI, width: 0.3, alpha: 0.6 });

  // Belt
  g.rect(x + 1, torsoTop + torsoH - 3, tw - 2, 2)
    .fill({ color: COL_LEATHER_DARK });
  // Belt buckle
  g.rect(x + tw / 2 - 1, torsoTop + torsoH - 3, 2, 2)
    .fill({ color: COL_JAV_TIP });
}

/** Green cloak behind character. */
function drawCloak(
  g: Graphics,
  cx: number,
  cloakTop: number,
  cloakH: number,
  wave: number,
): void {
  const cw = 12;
  const x = cx - cw / 2 - 2;

  g.moveTo(x + 2, cloakTop)
    .lineTo(x + cw - 2, cloakTop)
    .lineTo(x + cw + wave * 4, cloakTop + cloakH)
    .bezierCurveTo(
      x + cw / 2 + wave * 2, cloakTop + cloakH + 2,
      x + wave, cloakTop + cloakH + 1,
      x + wave * 2, cloakTop + cloakH
    )
    .closePath()
    .fill({ color: COL_CLOAK })
    .stroke({ color: COL_CLOAK_DARK, width: 0.5 });

  // Cloak edge trim
  g.moveTo(x + wave * 2, cloakTop + cloakH)
    .lineTo(x + cw + wave * 4, cloakTop + cloakH)
    .stroke({ color: COL_CLOAK_EDGE, width: 1 });
}

/** Head with headband. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
): void {
  const hx = cx + tilt;

  // Hair behind
  g.ellipse(hx, headTop + 4, 5.5, 5.5).fill({ color: COL_HAIR });

  // Face
  g.ellipse(hx, headTop + 4, 4.5, 5).fill({ color: COL_SKIN });

  // Headband
  g.rect(hx - 5, headTop + 1, 10, 2.5)
    .fill({ color: COL_HEADBAND });
  // Headband tail flowing back
  g.moveTo(hx + 5, headTop + 1)
    .bezierCurveTo(hx + 8, headTop, hx + 10, headTop + 2, hx + 9, headTop + 5)
    .stroke({ color: COL_HEADBAND, width: 1.5 });
  g.moveTo(hx + 5, headTop + 2)
    .bezierCurveTo(hx + 7, headTop + 1, hx + 9, headTop + 4, hx + 8, headTop + 7)
    .stroke({ color: COL_HEADBAND_DK, width: 1 });

  // Eyes - alert expression
  g.circle(hx - 2, headTop + 3.5, 0.8).fill({ color: 0x222211 });
  g.circle(hx + 1.5, headTop + 3.5, 0.8).fill({ color: 0x222211 });
  // Eye highlights
  g.circle(hx - 1.5, headTop + 3, 0.3).fill({ color: 0xffffff });
  g.circle(hx + 2, headTop + 3, 0.3).fill({ color: 0xffffff });

  // Nose
  g.moveTo(hx, headTop + 4).lineTo(hx - 0.5, headTop + 5.5)
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });

  // Determined mouth
  g.moveTo(hx - 1.5, headTop + 6.5).lineTo(hx + 1, headTop + 6.5)
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });
}

/** Arm. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  armored = true,
): void {
  const col = armored ? COL_LEATHER : COL_SKIN;
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: col, width: 2.5 });
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN });
}

/** Javelin weapon. */
function drawJavelin(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  length = 18,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + cos * length;
  const tipY = baseY + sin * length;

  // Shaft
  g.moveTo(baseX, baseY).lineTo(tipX, tipY)
    .stroke({ color: COL_JAV_SHAFT, width: 2 });

  // Grip wrapping near base
  for (let i = 0; i < 3; i++) {
    const wx = baseX + cos * (2 + i * 2);
    const wy = baseY + sin * (2 + i * 2);
    g.moveTo(wx - sin * 1.5, wy + cos * 1.5)
      .lineTo(wx + sin * 1.5, wy - cos * 1.5)
      .stroke({ color: COL_JAV_WRAP, width: 0.8 });
  }

  // Metal tip
  const tipStartX = baseX + cos * (length - 4);
  const tipStartY = baseY + sin * (length - 4);
  g.moveTo(tipStartX, tipStartY).lineTo(tipX, tipY)
    .stroke({ color: COL_JAV_TIP, width: 2.5 });
  // Tip highlight
  g.moveTo(tipStartX + sin * 0.5, tipStartY - cos * 0.5)
    .lineTo(tipX + sin * 0.3, tipY - cos * 0.3)
    .stroke({ color: COL_JAV_TIP_HI, width: 0.8, alpha: 0.8 });
}

/** Spare javelins on back. */
function drawBackJavelins(
  g: Graphics,
  cx: number,
  topY: number,
  count = 2,
): void {
  for (let i = 0; i < count; i++) {
    const ox = cx + 3 + i * 2;
    g.moveTo(ox, topY - 4)
      .lineTo(ox + 1, topY + 14)
      .stroke({ color: COL_JAV_SHAFT, width: 1.5 });
    // Tiny tip visible
    g.moveTo(ox, topY - 4)
      .lineTo(ox - 0.3, topY - 7)
      .stroke({ color: COL_JAV_TIP, width: 1.5 });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  // Bouncing on toes
  const bounce = Math.abs(Math.sin(frame / 8 * Math.PI * 2)) * 2;
  const bob = Math.round(bounce);

  const gy2 = GY;
  const legH = 7;
  const torsoH = 10;
  const legTop = gy2 - 5 - legH + bob;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  const cloakWave = (t - 0.5) * 0.5;

  drawShadow(g, CX, gy2, 11 - bounce * 0.5, 3);
  drawCloak(g, CX, torsoTop + 2, legH + torsoH - 4, cloakWave);
  drawBackJavelins(g, CX, torsoTop);
  drawBoots(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Right arm holding javelin ready
  const armEndX = CX + 8;
  const armEndY = torsoTop + 4;
  drawArm(g, CX + 5, torsoTop + 3, armEndX, armEndY);
  drawJavelin(g, armEndX, armEndY, -Math.PI * 0.4 + t * 0.05, 16);

  // Left arm relaxed at side
  drawArm(g, CX - 5, torsoTop + 3, CX - 7, torsoTop + 8);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const run = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(run) * 3;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 10;
  // Wide strides
  const stanceL = Math.round(run * 5);
  const stanceR = Math.round(-run * 5);
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const headTop = torsoTop - 10;

  const cloakWave = -run * 1.5;

  drawShadow(g, CX, gy2, 11 + Math.abs(run) * 2, 3);
  drawCloak(g, CX, torsoTop + 2, legH + torsoH - 2, cloakWave);
  drawBackJavelins(g, CX, torsoTop);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, run * 0.8);
  drawHead(g, CX, headTop, run * 0.5);

  // Right arm - javelin held forward while running
  const armEndX = CX + 7 + run * 2;
  const armEndY = torsoTop + 5 - run;
  drawArm(g, CX + 5, torsoTop + 3, armEndX, armEndY);
  drawJavelin(g, armEndX, armEndY, -Math.PI * 0.3, 16);

  // Left arm pumping
  drawArm(g, CX - 5, torsoTop + 3, CX - 8 - run * 2, torsoTop + 6 + run * 2);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0-1=wind up, 2-3=pull back, 4=release, 5-6=follow through
  const phases = [0, 0.12, 0.3, 0.5, 0.65, 0.82, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 7;
  const torsoH = 10;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Body leans back then forward for throw
  const lean = t < 0.5 ? -t * 4 : (t - 0.5) * 8;
  const lunge = t > 0.4 ? (t - 0.4) * 5 : 0;

  drawShadow(g, CX + lean * 0.3, gy2);
  drawCloak(g, CX + lean * 0.2, torsoTop + 2, legH + torsoH - 4, -lean * 0.4);
  drawBackJavelins(g, CX + lean * 0.2, torsoTop, t > 0.65 ? 1 : 2);
  drawBoots(g, CX, gy2, -1 - lunge * 0.3, lunge);
  drawLegs(g, CX, legTop, legH, -1, Math.round(lunge));
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.6);

  // Throwing arm animation
  let javAngle: number;
  let armEndX: number;
  let armEndY: number;

  if (t < 0.3) {
    // Pull back
    javAngle = lerp(-Math.PI * 0.4, -Math.PI * 0.8, t / 0.3);
    armEndX = CX + 5 - t * 8;
    armEndY = torsoTop + 2;
  } else if (t < 0.65) {
    // Hurl forward
    const p = (t - 0.3) / 0.35;
    javAngle = lerp(-Math.PI * 0.8, -Math.PI * 0.1, p);
    armEndX = CX + 5 + p * 12;
    armEndY = torsoTop + 2 + p * 3;
  } else {
    // Follow through
    javAngle = -Math.PI * 0.05;
    armEndX = CX + 14;
    armEndY = torsoTop + 6;
  }

  drawArm(g, CX + 5 + lean, torsoTop + 3, armEndX, armEndY);

  // Javelin in hand until release
  if (t < 0.6) {
    drawJavelin(g, armEndX, armEndY, javAngle, 16);
  } else {
    // Released javelin flying away
    const flyT = (t - 0.6) / 0.4;
    const flyX = CX + 18 + flyT * 16;
    const flyY = torsoTop + 2 - flyT * 2;
    drawJavelin(g, flyX, flyY, -Math.PI * 0.08, 16);
  }

  // Off arm for balance
  drawArm(g, CX - 5 + lean, torsoTop + 3, CX - 9 - lean, torsoTop + 7);

  // Motion blur on throw
  if (t >= 0.4 && t <= 0.7) {
    const blurAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    g.moveTo(armEndX, armEndY)
      .lineTo(armEndX + 8, armEndY - 2)
      .stroke({ color: 0xffffff, width: 1, alpha: blurAlpha * 0.4 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: dodge roll / evasive maneuver
  const t = frame / 5;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 10;

  // Roll trajectory
  const rollX = Math.sin(t * Math.PI) * 10;
  const rollY = -Math.sin(t * Math.PI) * 6;
  const legTop = gy2 - 5 - legH + rollY;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Smaller shadow during jump
  drawShadow(g, CX + rollX, gy2, 8 + (1 - Math.abs(rollY) / 6) * 3, 2);

  if (t < 0.3) {
    // Crouch phase
    const crouch = t / 0.3;
    drawCloak(g, CX, torsoTop + 4, legH + torsoH - 6, -crouch);
    drawBoots(g, CX, gy2, -2 * crouch, 2 * crouch);
    drawLegs(g, CX, legTop + crouch * 3, legH - crouch * 2, -1, 1);
    drawTorso(g, CX, torsoTop + crouch * 3, torsoH - crouch * 2, -crouch * 2);
    drawHead(g, CX, headTop + crouch * 4, -crouch);
    drawArm(g, CX + 5, torsoTop + 5, CX + 8, torsoTop + 8);
    drawArm(g, CX - 5, torsoTop + 5, CX - 8, torsoTop + 8);
  } else if (t < 0.8) {
    // Mid-roll
    const rollP = (t - 0.3) / 0.5;
    const cx2 = CX + rollX;
    const cy2 = torsoTop + rollY * 0.5;

    // Tucked body
    drawCloak(g, cx2, cy2 + 2, torsoH, rollP * 2 - 1);
    drawTorso(g, cx2, cy2, torsoH * 0.8, -rollP * 4);
    drawHead(g, cx2, cy2 - 8, -rollP * 3);

    // Tucked legs
    drawLegs(g, cx2, cy2 + torsoH * 0.7, legH * 0.6, -2, 2);
    drawBoots(g, cx2, cy2 + torsoH * 0.7 + legH * 0.5, -2, 2);

    // Arms tucked
    drawArm(g, cx2 + 4, cy2 + 3, cx2 + 2, cy2 + 8);
    drawArm(g, cx2 - 4, cy2 + 3, cx2 - 2, cy2 + 8);

    // Dust particles
    if (rollP > 0.3) {
      for (let i = 0; i < 3; i++) {
        const dx = cx2 - rollX * 0.5 + i * 3;
        const dy = gy2 - 2 - i * 2;
        g.circle(dx, dy, 1 + (1 - rollP) * 1.5)
          .fill({ color: 0xbbaa88, alpha: (1 - rollP) * 0.5 });
      }
    }
  } else {
    // Recovery
    const recP = (t - 0.8) / 0.2;
    const cx2 = CX + rollX * (1 - recP);
    drawCloak(g, cx2, torsoTop + 2, legH + torsoH - 4, 0.5);
    drawBoots(g, cx2, gy2, -1, 2);
    drawLegs(g, cx2, legTop, legH, -1, 2);
    drawTorso(g, cx2, torsoTop, torsoH, -(1 - recP) * 2);
    drawHead(g, cx2, headTop, -(1 - recP));
    drawArm(g, cx2 + 5, torsoTop + 3, cx2 + 8, torsoTop + 5);
    drawArm(g, cx2 - 5, torsoTop + 3, cx2 - 7, torsoTop + 7);
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: spins and falls, javelins scatter
  const t = frame / 6;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 10;
  const legTop = gy2 - 5 - legH;

  const spinX = t * 8;
  const dropY = t * t * 10;
  const spin = t * 3;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 10;

  drawShadow(g, CX + spinX * 0.3, gy2, 11 + t * 2, 3);

  // Cloak flaring out during spin
  drawCloak(g, CX + spinX * 0.2, torsoTop + 2, (legH + torsoH - 4) * (1 - t * 0.2), spin);

  // Javelins scattering
  if (t > 0.15) {
    const scatterT = (t - 0.15) / 0.85;
    // Javelin 1 - flies right
    const j1x = CX + 8 + scatterT * 14;
    const j1y = torsoTop - 4 + scatterT * scatterT * 16;
    if (scatterT < 0.8) {
      drawJavelin(g, j1x, j1y, -Math.PI * 0.2 + scatterT * 1.5, 14);
    }
    // Javelin 2 - flies left
    const j2x = CX - 4 - scatterT * 8;
    const j2y = torsoTop - 2 + scatterT * scatterT * 18;
    if (scatterT < 0.7) {
      drawJavelin(g, j2x, j2y, -Math.PI * 0.7 - scatterT, 12);
    }
  }

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + spinX * 0.3, gy2, t * 3, -t * 2);
  if (t < 0.8) {
    drawLegs(g, CX + spinX * 0.3, legTop + dropY * 0.5, legH - squash, t * 2, -t);
  }

  // Body falling
  drawTorso(g, CX + spinX * 0.4, torsoTop, torsoH * (1 - t * 0.15), spin * 2);

  if (t < 0.9) {
    drawHead(g, CX + spinX * 0.5, headTop + dropY * 0.4, spin * 1.5);
  }

  // Arms flailing
  if (t < 0.7) {
    const flailAngle = spin * 2;
    drawArm(g, CX + 5 + spinX * 0.4, torsoTop + 3,
      CX + 10 + spinX * 0.5 + Math.cos(flailAngle) * 4,
      torsoTop + 2 + Math.sin(flailAngle) * 4);
    drawArm(g, CX - 5 + spinX * 0.3, torsoTop + 3,
      CX - 8 + spinX * 0.2 + Math.cos(flailAngle + Math.PI) * 3,
      torsoTop + 5 + Math.sin(flailAngle + Math.PI) * 3);
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
 * Generate all skirmisher sprite frames procedurally.
 *
 * Returns a map from `UnitState` -> ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateSkirmisherFrames(
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
