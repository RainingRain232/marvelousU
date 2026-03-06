// Procedural sprite generator for the Crystal Golem unit type.
//
// Draws a crystal construct at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Body of translucent angular crystal facets (light purple/white/cyan)
//   • Glowing energy core visible in the chest cavity
//   • Blue-white lightning arcs between joints
//   • Prismatic light reflections on crystal surfaces
//   • Geometric, angular silhouette — not organic
//   • Lightning trails on movement, bolt attack from palm, chain lightning cast
//   • Shattering crystal death with dissipating lightning

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — crystal purple/white + lightning blue-white
const COL_CRYSTAL_BASE = 0xc0b8e8; // light purple-white crystal
const COL_CRYSTAL_MID = 0xa8a0d8; // mid crystal
const COL_CRYSTAL_DK = 0x7068b0; // dark crystal face
const COL_CRYSTAL_HI = 0xe8e4ff; // bright highlight
const COL_CRYSTAL_TRANS = 0xd8d4ff; // translucent face

const COL_CORE = 0x80e0ff; // inner core — cyan glow
const COL_CORE_HI = 0xc0f4ff; // core bright center
const COL_CORE_DK = 0x4090c0; // core dim

const COL_LIGHTNING = 0xdcf0ff; // lightning bolt white-blue
const COL_LIGHTNING_CORE = 0xffffff; // hot center
const COL_LIGHTNING_ARC = 0x88ccff; // arc glow

const COL_JOINT = 0x9090c8; // crystal joint connector
const COL_JOINT_DK = 0x6060a0;

const COL_GROUND = 0x000000; // shadow
const COL_SHARD = 0xb8b4e0; // shattered shard

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
  w = 11,
  h = 3,
  alpha = 0.22,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_GROUND, alpha });
}

/** Draw a jagged lightning arc between two points. */
function drawLightningArc(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  jags = 4,
  alpha = 0.9,
  width = 0.8,
): void {
  const dx = (x2 - x1) / jags;
  const dy = (y2 - y1) / jags;

  // Glow pass
  g.moveTo(x1, y1);
  for (let i = 1; i <= jags; i++) {
    const ox = i < jags ? (Math.random() * 2 - 1) * 2.5 : 0;
    const oy = i < jags ? (Math.random() * 2 - 1) * 2.5 : 0;
    g.lineTo(x1 + dx * i + ox, y1 + dy * i + oy);
  }
  g.stroke({ color: COL_LIGHTNING_ARC, width: width + 2, alpha: alpha * 0.25 });

  // Core arc
  g.moveTo(x1, y1);
  for (let i = 1; i <= jags; i++) {
    const ox = i < jags ? (Math.random() * 2 - 1) * 2.5 : 0;
    const oy = i < jags ? (Math.random() * 2 - 1) * 2.5 : 0;
    g.lineTo(x1 + dx * i + ox, y1 + dy * i + oy);
  }
  g.stroke({ color: COL_LIGHTNING, width, alpha });
}

/** Crystal facet as a polygon defined by points. */
function drawFacet(
  g: Graphics,
  pts: [number, number][],
  fill: number,
  fillAlpha = 0.85,
  strokeColor = COL_CRYSTAL_DK,
  strokeWidth = 0.5,
): void {
  if (pts.length < 3) return;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath().fill({ color: fill, alpha: fillAlpha }).stroke({ color: strokeColor, width: strokeWidth });
}

/** Draw the core glow inside the chest cavity. */
function drawCore(g: Graphics, cx: number, cy: number, intensity: number, pulse: number): void {
  const r = 3.5 + pulse * 1.5;
  // Outer glow
  g.circle(cx, cy, r + 3).fill({ color: COL_CORE, alpha: 0.1 + pulse * 0.12 });
  g.circle(cx, cy, r + 1.5).fill({ color: COL_CORE, alpha: 0.2 + pulse * 0.15 });
  // Core body
  g.circle(cx, cy, r).fill({ color: COL_CORE, alpha: 0.7 + intensity * 0.2 });
  // Bright center
  g.circle(cx, cy, r * 0.45).fill({ color: COL_CORE_HI, alpha: 0.9 + pulse * 0.1 });
}

/** Draw the crystal feet/base blocks. */
function drawFeet(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  // Left foot — angular crystal block
  drawFacet(
    g,
    [
      [cx - 9 + stanceL, gy - 3],
      [cx - 5 + stanceL, gy - 3],
      [cx - 4 + stanceL, gy],
      [cx - 10 + stanceL, gy],
    ],
    COL_CRYSTAL_MID,
    0.88,
  );
  drawFacet(
    g,
    [
      [cx - 9 + stanceL, gy - 3],
      [cx - 5 + stanceL, gy - 3],
      [cx - 5 + stanceL, gy - 5],
      [cx - 9 + stanceL, gy - 5],
    ],
    COL_CRYSTAL_TRANS,
    0.7,
  );

  // Right foot
  drawFacet(
    g,
    [
      [cx + 4 + stanceR, gy - 3],
      [cx + 8 + stanceR, gy - 3],
      [cx + 9 + stanceR, gy],
      [cx + 3 + stanceR, gy],
    ],
    COL_CRYSTAL_MID,
    0.88,
  );
  drawFacet(
    g,
    [
      [cx + 4 + stanceR, gy - 3],
      [cx + 8 + stanceR, gy - 3],
      [cx + 8 + stanceR, gy - 5],
      [cx + 4 + stanceR, gy - 5],
    ],
    COL_CRYSTAL_TRANS,
    0.7,
  );
}

/** Draw the crystalline legs as angular segments. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Left leg segments
  drawFacet(
    g,
    [
      [cx - 8 + stanceL, legTop],
      [cx - 4 + stanceL, legTop],
      [cx - 5 + stanceL, legTop + legH],
      [cx - 9 + stanceL, legTop + legH],
    ],
    COL_CRYSTAL_BASE,
    0.8,
  );
  // Joint highlight
  g.circle(cx - 6.5 + stanceL, legTop + legH * 0.45, 2)
    .fill({ color: COL_JOINT, alpha: 0.7 })
    .stroke({ color: COL_JOINT_DK, width: 0.4 });

  // Right leg segments
  drawFacet(
    g,
    [
      [cx + 3 + stanceR, legTop],
      [cx + 7 + stanceR, legTop],
      [cx + 8 + stanceR, legTop + legH],
      [cx + 4 + stanceR, legTop + legH],
    ],
    COL_CRYSTAL_BASE,
    0.8,
  );
  g.circle(cx + 5.5 + stanceR, legTop + legH * 0.45, 2)
    .fill({ color: COL_JOINT, alpha: 0.7 })
    .stroke({ color: COL_JOINT_DK, width: 0.4 });
}

/** Draw the angular crystal torso. */
function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  coreIntensity = 1,
  corePulse = 0,
): void {
  const hw = 13;

  // Main body facets — angular hexagonal-ish shape
  // Front main face
  drawFacet(
    g,
    [
      [cx - hw / 2 + 2 + tilt, top],
      [cx + hw / 2 - 2 + tilt, top],
      [cx + hw / 2 + tilt, top + 3],
      [cx + hw / 2 + tilt, top + h - 3],
      [cx + hw / 2 - 2 + tilt, top + h],
      [cx - hw / 2 + 2 + tilt, top + h],
      [cx - hw / 2 + tilt, top + h - 3],
      [cx - hw / 2 + tilt, top + 3],
    ],
    COL_CRYSTAL_TRANS,
    0.78,
  );

  // Left side facet (darker)
  drawFacet(
    g,
    [
      [cx - hw / 2 + tilt, top + 3],
      [cx - hw / 2 + 2 + tilt, top],
      [cx - hw / 2 + 2 + tilt, top + h],
      [cx - hw / 2 + tilt, top + h - 3],
    ],
    COL_CRYSTAL_DK,
    0.7,
  );

  // Right side facet (highlight)
  drawFacet(
    g,
    [
      [cx + hw / 2 - 2 + tilt, top],
      [cx + hw / 2 + tilt, top + 3],
      [cx + hw / 2 + tilt, top + h - 3],
      [cx + hw / 2 - 2 + tilt, top + h],
    ],
    COL_CRYSTAL_HI,
    0.5,
  );

  // Upper diamond highlight
  drawFacet(
    g,
    [
      [cx + tilt, top + 1],
      [cx + 3 + tilt, top + 4],
      [cx + tilt, top + 7],
      [cx - 3 + tilt, top + 4],
    ],
    COL_CRYSTAL_HI,
    0.35,
  );

  // Core window in chest — where the glow shows through
  const coreY = top + h * 0.42;
  drawCore(g, cx + tilt, coreY, coreIntensity, corePulse);

  // Crystal lattice lines across torso surface
  g.moveTo(cx - 3 + tilt, top + 2)
    .lineTo(cx + tilt, top + 5)
    .lineTo(cx + 3 + tilt, top + 2)
    .stroke({ color: COL_CRYSTAL_HI, width: 0.4, alpha: 0.4 });
  g.moveTo(cx - 3 + tilt, top + h - 4)
    .lineTo(cx + tilt, top + h - 1)
    .lineTo(cx + 3 + tilt, top + h - 4)
    .stroke({ color: COL_CRYSTAL_HI, width: 0.4, alpha: 0.3 });

  // Shoulder joints
  g.circle(cx - hw / 2 + 1 + tilt, top + 2, 2.5)
    .fill({ color: COL_JOINT })
    .stroke({ color: COL_JOINT_DK, width: 0.4 });
  g.circle(cx + hw / 2 - 1 + tilt, top + 2, 2.5)
    .fill({ color: COL_JOINT })
    .stroke({ color: COL_JOINT_DK, width: 0.4 });
}

/** Draw the angular crystal head. */
function drawHead(g: Graphics, cx: number, top: number, tilt = 0, pulse = 0): void {
  const hw = 9;
  const hh = 8;
  const x = cx - hw / 2 + tilt;

  // Cranial crystal — pointed top like a crown gem
  drawFacet(
    g,
    [
      [cx + tilt, top],
      [x + hw - 1, top + 3],
      [x + hw, top + hh],
      [x, top + hh],
      [x + 1, top + 3],
    ],
    COL_CRYSTAL_BASE,
    0.85,
  );

  // Left face
  drawFacet(
    g,
    [
      [x + 1, top + 3],
      [cx + tilt, top],
      [x, top + hh],
    ],
    COL_CRYSTAL_DK,
    0.65,
  );

  // Right face
  drawFacet(
    g,
    [
      [cx + tilt, top],
      [x + hw - 1, top + 3],
      [x + hw, top + hh],
    ],
    COL_CRYSTAL_HI,
    0.45,
  );

  // Eye crystals — two glowing triangular gems
  const eyeY = top + hh * 0.55;
  // Left eye
  drawFacet(
    g,
    [
      [cx - 3 + tilt, eyeY - 1.5],
      [cx - 1 + tilt, eyeY - 1.5],
      [cx - 2 + tilt, eyeY + 1],
    ],
    COL_CORE,
    0.9 + pulse * 0.1,
    COL_CORE_DK,
    0.5,
  );
  // Right eye
  drawFacet(
    g,
    [
      [cx + 1 + tilt, eyeY - 1.5],
      [cx + 3 + tilt, eyeY - 1.5],
      [cx + 2 + tilt, eyeY + 1],
    ],
    COL_CORE,
    0.9 + pulse * 0.1,
    COL_CORE_DK,
    0.5,
  );

  // Eye glow
  g.circle(cx - 2 + tilt, eyeY - 0.5, 1.2).fill({ color: COL_CORE_HI, alpha: 0.6 + pulse * 0.3 });
  g.circle(cx + 2 + tilt, eyeY - 0.5, 1.2).fill({ color: COL_CORE_HI, alpha: 0.6 + pulse * 0.3 });

  // Crown spikes at top
  g.moveTo(cx + tilt, top).lineTo(cx - 1 + tilt, top - 3).stroke({ color: COL_CRYSTAL_HI, width: 1 });
  g.moveTo(cx + tilt, top).lineTo(cx + 2 + tilt, top - 4).stroke({ color: COL_CRYSTAL_HI, width: 1 });
  g.moveTo(cx + tilt, top).lineTo(cx - 3 + tilt, top - 1.5).stroke({ color: COL_CRYSTAL_MID, width: 0.6 });
}

/** Draw a crystal arm as angular segments. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  lightningAlpha = 0,
): void {
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);

  // Upper segment
  drawFacet(
    g,
    [
      [sx - 2, sy],
      [sx + 2, sy],
      [mx + 2, my],
      [mx - 2, my],
    ],
    COL_CRYSTAL_MID,
    0.82,
  );

  // Elbow joint
  g.circle(mx, my, 2.2)
    .fill({ color: COL_JOINT })
    .stroke({ color: COL_JOINT_DK, width: 0.4 });

  // Lower segment
  drawFacet(
    g,
    [
      [mx - 1.5, my],
      [mx + 1.5, my],
      [ex + 1.5, ey],
      [ex - 1.5, ey],
    ],
    COL_CRYSTAL_BASE,
    0.8,
  );

  // Crystal hand/palm — angular
  drawFacet(
    g,
    [
      [ex - 3, ey],
      [ex + 3, ey],
      [ex + 2, ey + 3],
      [ex - 2, ey + 3],
    ],
    COL_CRYSTAL_TRANS,
    0.75,
  );

  // Lightning at joint if active
  if (lightningAlpha > 0) {
    drawLightningArc(g, sx, sy, mx, my, 3, lightningAlpha, 0.6);
    drawLightningArc(g, mx, my, ex, ey, 3, lightningAlpha, 0.6);
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const shimmer = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

  const legH = 9;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY);

  // Prismatic shimmer particles
  for (let i = 0; i < 4; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 2);
    const dist = 10 + Math.sin(t * Math.PI * 2 + i) * 2;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.35;
    const shimA = 0.1 + shimmer * 0.12;
    g.circle(px, py, 1 + shimmer * 0.5).fill({
      color: i % 2 === 0 ? COL_CORE : COL_CRYSTAL_HI,
      alpha: shimA,
    });
  }

  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, 0, 1, pulse);
  drawHead(g, CX, headTop, 0, pulse);

  // Arms at sides — lightning arcing between joints
  drawArm(g, CX - 7, torsoTop + 2, CX - 13, torsoTop + torsoH - 2, 0.3 + shimmer * 0.4);
  drawArm(g, CX + 7, torsoTop + 2, CX + 13, torsoTop + torsoH - 2, 0.3 + shimmer * 0.4);

  // Inter-joint lightning arcs (body surface)
  if (pulse > 0.6) {
    drawLightningArc(g, CX - 7, torsoTop + 2, CX + 7, torsoTop + 2, 3, pulse * 0.35, 0.5);
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.2;
  const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

  const legH = 9;
  const torsoH = 13;
  const stanceL = Math.round(stride * 4);
  const stanceR = Math.round(-stride * 4);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const headTop = torsoTop - 10;

  // Ground impact flash on stomp
  const impactAlpha = Math.max(0, Math.abs(stride) - 0.7) * 0.5;
  if (impactAlpha > 0) {
    g.ellipse(CX, GY, 14, 3).fill({ color: COL_LIGHTNING_ARC, alpha: impactAlpha * 0.3 });
  }

  drawShadow(g, CX, GY, 11 + Math.abs(stride) * 2, 3);
  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);

  const bodyTilt = stride * 0.5;
  drawTorso(g, CX, torsoTop, torsoH, bodyTilt, 1, pulse * 0.5);
  drawHead(g, CX, headTop, bodyTilt * 0.5, pulse * 0.4);

  // Arm swing opposite to legs
  const armSwing = -stride * 3;
  drawArm(g, CX - 7 + bodyTilt, torsoTop + 2, CX - 11 + armSwing, torsoTop + torsoH - 3, 0.5);
  drawArm(g, CX + 7 + bodyTilt, torsoTop + 2, CX + 11 - armSwing, torsoTop + torsoH - 3, 0.5);

  // Lightning trail behind moving form
  if (Math.abs(stride) > 0.3) {
    const trailAlpha = (Math.abs(stride) - 0.3) * 0.5;
    drawLightningArc(
      g,
      CX - 6 - Math.abs(stride) * 5,
      torsoTop + torsoH / 2,
      CX - 6,
      torsoTop + torsoH / 2,
      4,
      trailAlpha,
      0.8,
    );
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up, 2-3: arm extends, 4-5: lightning fires, 6-7: recoil/recover
  const phases = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  const lean = t < 0.55 ? t * 2.5 : (1 - t) * 3.5;
  const lunge = t > 0.2 && t < 0.85 ? 4 : 0;
  const pulse = t > 0.4 && t < 0.75 ? 1 : 0;

  drawShadow(g, CX + lean * 0.5, GY, 12 + lean * 0.5, 3);
  drawFeet(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.4, 1 + pulse * 0.5, pulse * 0.8);
  drawHead(g, CX, headTop, lean * 0.3, pulse * 0.5);

  // Left arm back
  drawArm(g, CX - 7 + lean, torsoTop + 2, CX - 12, torsoTop + torsoH - 4, pulse * 0.3);

  // Right arm — extending forward with lightning palm
  let armExtend: number;
  if (t < 0.25) {
    armExtend = lerp(0, -3, t / 0.25);
  } else if (t < 0.55) {
    armExtend = lerp(-3, 10, (t - 0.25) / 0.3);
  } else {
    armExtend = lerp(10, 0, (t - 0.55) / 0.45);
  }

  const rHandX = CX + 10 + armExtend + lean;
  const rHandY = torsoTop + 5;
  drawArm(g, CX + 7 + lean, torsoTop + 2, rHandX, rHandY, pulse * 0.8);

  // Lightning bolt from palm — fires in frames 4-5
  if (t >= 0.55 && t <= 0.85) {
    const boltAlpha = clamp01(1 - Math.abs(t - 0.65) / 0.2) * 0.95;

    // Main bolt to edge
    const boltLen = 18;
    drawLightningArc(g, rHandX + 2, rHandY + 1, rHandX + boltLen, rHandY - 2, 6, boltAlpha, 1.5);
    drawLightningArc(g, rHandX + 2, rHandY + 1, rHandX + boltLen, rHandY - 2, 6, boltAlpha * 0.5, 3);

    // Impact flash
    g.circle(rHandX + boltLen, rHandY - 2, 3 + boltAlpha * 2)
      .fill({ color: COL_LIGHTNING_CORE, alpha: boltAlpha * 0.7 });

    // Palm glow
    g.circle(rHandX + 1, rHandY + 1, 3.5).fill({ color: COL_CORE, alpha: boltAlpha * 0.5 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 9;
  const torsoH = 13;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Overcharge aura — body opens up with blazing core
  const auraR = 4 + intensity * 16 + pulse * 3;
  const coreCY = torsoTop + torsoH * 0.42;

  // Outer energy ring
  g.circle(CX, coreCY, auraR + 4).stroke({ color: COL_LIGHTNING_ARC, width: 1, alpha: 0.12 + pulse * 0.1 });
  g.circle(CX, coreCY, auraR + 8).stroke({ color: COL_LIGHTNING_ARC, width: 0.6, alpha: 0.07 + pulse * 0.07 });

  // Chain lightning — arcs out in 4 directions
  if (intensity > 0.2) {
    const numArcs = Math.floor(intensity * 5) + 1;
    for (let i = 0; i < numArcs; i++) {
      const angle = (i / numArcs) * Math.PI * 2 + t * Math.PI;
      const dist = 8 + intensity * 16;
      const ex = CX + Math.cos(angle) * dist;
      const ey = coreCY + Math.sin(angle) * dist * 0.6;
      drawLightningArc(g, CX, coreCY, ex, ey, 5, 0.6 + pulse * 0.35, 0.9);
    }
  }

  drawShadow(g, CX, GY, 11, 3, 0.25 + intensity * 0.2);
  drawFeet(g, CX, GY, -3, 3);
  drawLegs(g, CX, legTop, legH, -3, 3);

  // Torso "opens" — drawn with higher intensity core
  drawTorso(g, CX, torsoTop, torsoH, 0, 1 + intensity * 1.5, pulse);
  drawHead(g, CX, headTop, 0, pulse);

  // Arms raised and spread — channeling
  const raise = intensity * 8;
  drawArm(g, CX - 7, torsoTop + 2, CX - 15, torsoTop - raise, 0.6 + pulse * 0.4);
  drawArm(g, CX + 7, torsoTop + 2, CX + 15, torsoTop - raise, 0.6 + pulse * 0.4);

  // Hand glow at raised palms
  const glowA = 0.3 + intensity * 0.5 + pulse * 0.2;
  g.circle(CX - 15, torsoTop - raise, 3 + pulse * 1.5).fill({ color: COL_CORE, alpha: glowA });
  g.circle(CX + 15, torsoTop - raise, 3 + pulse * 1.5).fill({ color: COL_CORE, alpha: glowA });
  g.circle(CX - 15, torsoTop - raise, 1.5).fill({ color: COL_LIGHTNING_CORE, alpha: glowA * 0.8 });
  g.circle(CX + 15, torsoTop - raise, 1.5).fill({ color: COL_LIGHTNING_CORE, alpha: glowA * 0.8 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 9;
  const torsoH = 13;
  const legTop = GY - 5 - legH;

  const fallX = t * 10;
  const dropY = t * t * 12;
  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 10;

  // Lightning rapidly dissipates
  const lightningFade = clamp01(1 - t * 1.8);

  // Ground crack effect near end
  if (t > 0.6) {
    const crackAlpha = (t - 0.6) * 0.8;
    g.moveTo(CX - 8, GY + 1)
      .lineTo(CX - 2, GY - 1)
      .lineTo(CX + 6, GY + 1)
      .stroke({ color: COL_CRYSTAL_DK, width: 0.8, alpha: crackAlpha });
    g.moveTo(CX, GY)
      .lineTo(CX + 4, GY + 2)
      .stroke({ color: COL_CRYSTAL_DK, width: 0.6, alpha: crackAlpha });
  }

  drawShadow(g, CX + fallX * 0.3, GY, 11 + t * 4, 3, 0.22 * (1 - t * 0.4));

  // Shatter — crystal shards fly off
  if (t > 0.25) {
    const shardCount = Math.floor((t - 0.25) / 0.75 * 8);
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 3;
      const dist = (t - 0.25) * 22 + i * 1.5;
      const sx = CX + Math.cos(angle) * dist;
      const sy = torsoTop + torsoH * 0.4 + Math.sin(angle) * dist * 0.5 + t * 5;
      const shardA = clamp01(1 - (t - 0.25) * 1.2);
      const shardSize = 1.5 + (i % 3);
      // Tiny triangular shard
      g.moveTo(sx, sy - shardSize)
        .lineTo(sx + shardSize * 0.7, sy + shardSize * 0.7)
        .lineTo(sx - shardSize * 0.7, sy + shardSize * 0.5)
        .closePath()
        .fill({ color: COL_SHARD, alpha: shardA })
        .stroke({ color: COL_CRYSTAL_HI, width: 0.3, alpha: shardA * 0.6 });
    }
  }

  // Dissipating lightning sparks
  if (lightningFade > 0.05) {
    for (let i = 0; i < 3; i++) {
      const angle = t * 6 + i * 2.1;
      const sx = CX + Math.cos(angle) * 6;
      const sy = torsoTop + torsoH * 0.4 + Math.sin(angle) * 4;
      drawLightningArc(g, sx, sy, sx + Math.cos(angle + 1) * 8, sy + Math.sin(angle + 1) * 5, 3, lightningFade * 0.7, 0.6);
    }
  }

  // Feet — crumble in place
  if (t < 0.85) {
    drawFeet(g, CX + fallX * 0.05, GY, t * 1.5, -t * 1.5);
  }

  // Legs — crumble inward
  if (t < 0.65) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.5, legH * (1 - t * 0.5), t * 2, -t);
  }

  // Torso — topples forward (increases tilt over time)
  const crashTilt = t * 4.5;
  if (t < 0.9) {
    drawTorso(g, CX + fallX * 0.35, torsoTop, torsoH * (1 - t * 0.2), crashTilt, clamp01(1 - t), 0);
  }

  // Head — falls last
  if (t < 0.8) {
    drawHead(g, CX + fallX * 0.35, headTop + dropY * 0.4, crashTilt * 0.8, 0);
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
 * Generate all Crystal Golem sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateCrystalGolemFrames(renderer: Renderer): RenderTexture[] {
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
