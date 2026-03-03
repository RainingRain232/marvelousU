// Procedural sprite generator for the Bat unit type.
//
// Draws a swarm of 3 bats at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • 3 individual bats with membranous wings (finger bone struts)
//   • Furry bodies with pointed ears and tiny fangs
//   • Red glowing eyes with light halos
//   • Wing membrane veins and translucency
//   • Echolocation / screech cast with sonic wave rings
//   • Swooping attack formation with claw strikes

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// --- palette ---
const COL_MEMBRANE      = 0x1a0808;  // wing membrane (near-black)
const COL_MEMBRANE_VEIN = 0x2a1212;  // vein detail on wings
const COL_FUR           = 0x2a1818;  // body fur
const COL_FUR_LT        = 0x3a2828;  // belly / highlights
const COL_EAR           = 0x3a2020;
const COL_EAR_INNER     = 0x4a2a2a;
const COL_EYE           = 0xff2222;
const COL_EYE_GLOW      = 0xff4444;
const COL_FANG          = 0xccbbaa;
const COL_CLAW          = 0x887766;
const COL_SONIC          = 0xaa66ff;
const COL_SHADOW        = 0x000000;

// --- helpers ---
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// --- sub-routines ---

/** Draw a single detailed bat */
function drawBat(
  g: Graphics,
  x: number, y: number,
  size: number,
  wingPhase: number,   // 0-2π wing flap cycle
  mouthOpen: number,   // 0-1
  detail: boolean,      // draw extra detail (for main/largest bat)
): void {
  const wingFlap = Math.sin(wingPhase);
  const wingExt = 0.7 + wingFlap * 0.3; // wing extension

  // --- wings (behind body) ---
  for (const side of [-1, 1] as const) {
    const wingTipY = y - size * 0.2 + wingFlap * size * 0.6;
    const wingSpan = size * 1.3 * wingExt;

    // main membrane shape: body → elbow → tip → trailing edge
    const elbowX = x + side * wingSpan * 0.5;
    const elbowY = y - size * 0.6 + wingFlap * size * 0.3;
    const tipX = x + side * wingSpan;
    const tipY = wingTipY;
    const trailX = x + side * wingSpan * 0.7;
    const trailY = y + size * 0.3;

    // membrane fill
    g.moveTo(x, y - size * 0.2)
      .lineTo(elbowX, elbowY)
      .lineTo(tipX, tipY)
      .lineTo(trailX, trailY)
      .lineTo(x, y + size * 0.1)
      .closePath()
      .fill({ color: COL_MEMBRANE, alpha: 0.85 });

    // finger bone struts (3 bones radiating from elbow)
    g.moveTo(x + side * size * 0.15, y - size * 0.15)
      .lineTo(elbowX, elbowY)
      .stroke({ color: COL_FUR, width: 1.0 });
    g.moveTo(elbowX, elbowY).lineTo(tipX, tipY)
      .stroke({ color: COL_FUR, width: 0.8 });
    g.moveTo(elbowX, elbowY).lineTo(trailX, trailY)
      .stroke({ color: COL_FUR, width: 0.7 });

    // membrane vein detail
    if (detail) {
      const midX = (elbowX + tipX) * 0.5;
      const midY = (elbowY + tipY) * 0.5;
      g.moveTo(elbowX, elbowY)
        .lineTo(midX + side * size * 0.1, midY + size * 0.15)
        .stroke({ color: COL_MEMBRANE_VEIN, width: 0.5 });
      g.moveTo(midX, midY)
        .lineTo(midX + side * size * 0.05, tipY + size * 0.1)
        .stroke({ color: COL_MEMBRANE_VEIN, width: 0.4 });
    }

    // wing claw at tip of leading finger bone
    g.circle(tipX, tipY, 0.6).fill({ color: COL_CLAW });
  }

  // --- body (furry oval) ---
  g.ellipse(x, y, size * 0.28, size * 0.38).fill({ color: COL_FUR });
  // belly highlight
  g.ellipse(x, y + size * 0.05, size * 0.18, size * 0.22).fill({ color: COL_FUR_LT, alpha: 0.4 });

  // fur texture lines
  if (detail) {
    for (let i = -1; i <= 1; i++) {
      g.moveTo(x + i * size * 0.08, y - size * 0.2)
        .lineTo(x + i * size * 0.1, y - size * 0.35)
        .stroke({ color: COL_FUR_LT, width: 0.4 });
    }
  }

  // --- head ---
  g.ellipse(x, y - size * 0.35, size * 0.2, size * 0.18).fill({ color: COL_FUR });

  // ears (pointed triangles)
  for (const side of [-1, 1] as const) {
    g.moveTo(x + side * size * 0.08, y - size * 0.42)
      .lineTo(x + side * size * 0.18, y - size * 0.6)
      .lineTo(x + side * size * 0.22, y - size * 0.38)
      .closePath()
      .fill({ color: COL_EAR });
    // inner ear
    g.moveTo(x + side * size * 0.1, y - size * 0.42)
      .lineTo(x + side * size * 0.17, y - size * 0.55)
      .lineTo(x + side * size * 0.2, y - size * 0.4)
      .closePath()
      .fill({ color: COL_EAR_INNER, alpha: 0.6 });
  }

  // eyes (glowing red)
  for (const side of [-1, 1] as const) {
    g.circle(x + side * size * 0.08, y - size * 0.36, size * 0.06)
      .fill({ color: COL_EYE });
    // glow halo
    g.circle(x + side * size * 0.08, y - size * 0.36, size * 0.1)
      .fill({ color: COL_EYE_GLOW, alpha: 0.15 });
  }

  // nose
  g.circle(x, y - size * 0.28, size * 0.04).fill({ color: COL_EAR_INNER });

  // mouth / fangs
  if (mouthOpen > 0.1) {
    const mw = size * 0.12 * mouthOpen;
    g.ellipse(x, y - size * 0.25, mw, mw * 0.6).fill({ color: 0x110000 });
    // tiny fangs
    for (const side of [-1, 1] as const) {
      const fangLen = size * 0.08 * mouthOpen;
      g.moveTo(x + side * mw * 0.5, y - size * 0.25)
        .lineTo(x + side * mw * 0.3, y - size * 0.25 + fangLen)
        .stroke({ color: COL_FANG, width: 0.6 });
    }
  }

  // --- feet (tiny claws tucked under body) ---
  for (const side of [-1, 1] as const) {
    g.moveTo(x + side * size * 0.1, y + size * 0.3)
      .lineTo(x + side * size * 0.14, y + size * 0.38)
      .stroke({ color: COL_CLAW, width: 0.6 });
  }
}

// swarm positions (relative offsets from center, deterministic)
const SWARM = [
  { dx: -5, dy: -18, size: 9, phaseOff: 0,   detail: true },
  { dx:  6, dy: -12, size: 7, phaseOff: 0.7,  detail: false },
  { dx: -2, dy: -26, size: 6, phaseOff: 1.4,  detail: false },
];

function drawShadow(g: Graphics, alpha: number): void {
  g.ellipse(CX, GY + 2, 14, 4).fill({ color: COL_SHADOW, alpha: alpha * 0.3 });
}

// --- state frame generators ---

function drawIdleBat(g: Graphics, frame: number): void {
  const t = frame / 8;
  const floatY = Math.sin(t * Math.PI * 2) * 3;
  const wingPhase = t * Math.PI * 2 * 0.8;

  drawShadow(g, 1);

  for (const bat of SWARM) {
    const by = bat.dy + floatY * (0.8 + bat.phaseOff * 0.15);
    drawBat(g, CX + bat.dx, GY + by, bat.size, wingPhase + bat.phaseOff, 0, bat.detail);
  }
}

function drawFlyingBat(g: Graphics, frame: number): void {
  const t = frame / 8;
  const wingPhase = t * Math.PI * 2 * 1.5;  // fast flapping
  const swirl = t * Math.PI * 2;

  drawShadow(g, 1);

  for (let i = 0; i < SWARM.length; i++) {
    const bat = SWARM[i];
    // formation moves in a slight figure-8
    const offX = Math.sin(swirl + bat.phaseOff) * 3;
    const offY = Math.cos(swirl * 2 + bat.phaseOff) * 2;
    drawBat(g, CX + bat.dx + offX, GY + bat.dy + offY, bat.size,
      wingPhase + bat.phaseOff, 0, bat.detail);
  }
}

function drawAttackingBat(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // swoop: descend and lunge forward, then pull back
  let lunge = 0;
  let dive = 0;
  let mouthOpen = 0;

  if (t < 0.35) {
    const lt = t / 0.35;
    lunge = lt * 10;
    dive = lt * 6;
    mouthOpen = lt;
  } else if (t < 0.55) {
    lunge = 10;
    dive = 6;
    mouthOpen = 1;
  } else {
    const lt = (t - 0.55) / 0.45;
    lunge = 10 - lt * 10;
    dive = 6 - lt * 6;
    mouthOpen = 1 - lt;
  }

  const wingPhase = frame * 1.2;

  drawShadow(g, 1);

  for (let i = 0; i < SWARM.length; i++) {
    const bat = SWARM[i];
    // leader bat dives more, followers trail
    const trail = i * 0.15;
    const bLunge = lunge * (1 - trail);
    const bDive = dive * (1 - trail * 0.5);
    drawBat(
      g,
      CX + bat.dx - bLunge,
      GY + bat.dy + bDive,
      bat.size,
      wingPhase + bat.phaseOff,
      mouthOpen * (1 - trail),
      bat.detail,
    );
  }

  // claw strike marks at impact point
  if (t > 0.3 && t < 0.65) {
    const strikeAlpha = t < 0.45 ? (t - 0.3) / 0.15 : 1 - (t - 0.45) / 0.2;
    for (let i = 0; i < 3; i++) {
      const sx = CX - 12 - lunge + i * 3;
      const sy = GY - 14 + dive + i * 4;
      g.moveTo(sx, sy).lineTo(sx - 3, sy + 4)
        .stroke({ color: 0xffdddd, width: 1.2, alpha: strikeAlpha * 0.7 });
    }
  }
}

function drawCastingBat(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);
  const wingPhase = frame * 0.9;

  drawShadow(g, 1);

  // bats cluster together
  for (let i = 0; i < SWARM.length; i++) {
    const bat = SWARM[i];
    // converge toward center
    const convergeFactor = Math.sin(t * Math.PI) * 0.5;
    const bx = CX + bat.dx * (1 - convergeFactor);
    const by = GY + bat.dy * (1 - convergeFactor * 0.3);
    drawBat(g, bx, by, bat.size, wingPhase + bat.phaseOff, 0.6 * t, bat.detail);
  }

  // sonic/echolocation rings expanding outward
  if (t > 0.15) {
    const sonicT = (t - 0.15) / 0.85;
    for (let r = 0; r < 4; r++) {
      const ringT = clamp01(sonicT - r * 0.15);
      if (ringT <= 0) continue;
      const radius = 4 + ringT * 18;
      const alpha = (1 - ringT) * 0.5;
      g.circle(CX - 4, GY - 18, radius)
        .stroke({ color: COL_SONIC, width: 1.2 - r * 0.2, alpha });
    }
  }

  // small note-like particles
  if (t > 0.3) {
    const partT = (t - 0.3) / 0.7;
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.26 + partT * 2;
      const dist = 8 + partT * 14 + i * 3;
      const px = CX - 4 + Math.cos(angle) * dist;
      const py = GY - 18 + Math.sin(angle) * dist * 0.5;
      const pa = (1 - partT) * 0.6;
      g.circle(px, py, 1.0 - i * 0.12).fill({ color: COL_SONIC, alpha: pa });
    }
  }
}

function drawDyingBat(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.8;
  const fall = t * 22;
  const tumble = t * Math.PI * 1.5;  // rotation effect via position

  g.alpha = fade;

  drawShadow(g, 1 - t);

  // bats scatter and fall
  for (let i = 0; i < SWARM.length; i++) {
    const bat = SWARM[i];
    // each bat falls differently
    const scatterX = Math.sin(tumble + i * 2.1) * (5 + i * 3) * t;
    const fallY = fall * (0.7 + i * 0.15);
    const shrink = lerp(bat.size, bat.size * 0.3, t);
    const wingFreeze = 0.5 + t * 2;  // wings slow then stop

    drawBat(
      g,
      CX + bat.dx + scatterX,
      GY + bat.dy + fallY,
      shrink,
      wingFreeze,
      0,
      false,
    );
  }

  // feather/fur particles falling
  if (t > 0.2 && t < 0.8) {
    const partAlpha = 1 - (t - 0.2) / 0.6;
    for (let i = 0; i < 4; i++) {
      const px = CX + Math.sin(i * 1.7 + t * 3) * 12;
      const py = GY - 20 + fall * 0.5 + i * 4;
      g.circle(px, py, 0.6).fill({ color: COL_FUR_LT, alpha: partAlpha * 0.5 });
    }
  }
}

// --- public API ---

export function generateBatFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  const stateGens: [UnitState, (g: Graphics, frame: number) => void][] = [
    [UnitState.IDLE,   drawIdleBat],
    [UnitState.MOVE,   drawFlyingBat],
    [UnitState.ATTACK, drawAttackingBat],
    [UnitState.CAST,   drawCastingBat],
    [UnitState.DIE,    drawDyingBat],
  ];

  for (const [, gen] of stateGens) {
    for (let col = 0; col < 8; col++) {
      const g = new Graphics();
      gen(g, col);
      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: rt, container: g });
      frames.push(rt);
      g.destroy();
    }
  }

  return frames;
}
