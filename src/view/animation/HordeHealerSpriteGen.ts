// Procedural sprite generator for the Horde Healer unit type.
//
// Draws a tribal orc shaman with staff and bone necklace at 48x48 pixels
// per frame using PixiJS Graphics -> RenderTexture.  Produces textures for
// every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - Green orc skin
//   - Fur cloak with feathered headdress
//   - Bone necklace
//   - Gnarled staff with green crystal
//   - Tribal healing magic effects

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette - tribal shaman
const COL_SKIN        = 0x6b8e3a;
const COL_SKIN_DARK   = 0x4a6625;
const COL_FUR         = 0x8b7355;
const COL_FUR_DARK    = 0x6a5540;
const COL_FUR_HI      = 0xa89070;
const COL_BONE        = 0xe0d8c8;
const COL_BONE_DARK   = 0xc0b8a8;
const COL_STAFF_WOOD  = 0x664422;
const COL_STAFF_DARK  = 0x443311;
const COL_STAFF_HI    = 0x886644;
const COL_CRYSTAL     = 0x44ff44;
const COL_CRYSTAL_CORE = 0xaaffaa;
const COL_CRYSTAL_DK  = 0x22aa22;
const COL_FEATHER_RED = 0xcc4444;
const COL_FEATHER_GRN = 0x448844;
const COL_FEATHER_DK  = 0x993333;
const COL_HEAL_GLOW   = 0x44ff44;
const COL_HEAL_CORE   = 0xccffcc;
const COL_ENERGY_BOLT = 0x66ff66;
const COL_WRAP        = 0x997755;
const COL_SANDAL      = 0x664422;
const COL_SANDAL_DK   = 0x443311;
const COL_SHADOW      = 0x000000;
const COL_EYE         = 0xcc4400;
const COL_TUSK        = 0xe0d8c8;

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

/** Shadow. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

/** Crude sandals. */
function drawSandals(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  g.roundRect(cx - 6 + stanceL, gy - 4, 4, 4, 1)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - 4, 4, 4, 1)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
  // Wrapping straps up calf
  g.moveTo(cx - 5 + stanceL, gy - 5)
    .lineTo(cx - 4 + stanceL, gy - 7)
    .stroke({ color: COL_WRAP, width: 0.7 });
  g.moveTo(cx + 3 + stanceR, gy - 5)
    .lineTo(cx + 4 + stanceR, gy - 7)
    .stroke({ color: COL_WRAP, width: 0.7 });
}

/** Legs with fur wrappings. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_SKIN_DARK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_SKIN_DARK });
  // Fur wrapping on legs
  g.rect(cx - 5 + stanceL, legTop + 1, 4, 3).fill({ color: COL_FUR_DARK, alpha: 0.7 });
  g.rect(cx + 1 + stanceR, legTop + 1, 4, 3).fill({ color: COL_FUR_DARK, alpha: 0.7 });
}

/** Shaman torso with fur cloak. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 13;
  const x = cx - tw / 2 + tilt;

  // Bare skin underneath
  g.roundRect(x + 1, torsoTop, tw - 2, torsoH, 2)
    .fill({ color: COL_SKIN });

  // Fur cloak/vest over torso
  g.moveTo(x, torsoTop)
    .lineTo(x + tw, torsoTop)
    .lineTo(x + tw + 1, torsoTop + torsoH * 0.7)
    .lineTo(x + tw - 2, torsoTop + torsoH)
    .lineTo(x + 2, torsoTop + torsoH)
    .lineTo(x - 1, torsoTop + torsoH * 0.7)
    .closePath()
    .fill({ color: COL_FUR })
    .stroke({ color: COL_FUR_DARK, width: 0.5 });

  // Fur texture - short strokes along edges
  for (let i = 0; i < 5; i++) {
    const fy = torsoTop + 1 + i * 2;
    g.moveTo(x, fy).lineTo(x - 1, fy + 1)
      .stroke({ color: COL_FUR_HI, width: 0.6, alpha: 0.6 });
    g.moveTo(x + tw, fy).lineTo(x + tw + 1, fy + 1)
      .stroke({ color: COL_FUR_HI, width: 0.6, alpha: 0.6 });
  }

  // Bone necklace across chest
  const neckY = torsoTop + 2;
  for (let i = 0; i < 5; i++) {
    const bx = x + 2 + i * 2.2;
    const by = neckY + Math.sin(i * 0.8) * 1;
    // Small bone piece
    g.roundRect(bx, by, 2, 1, 0.5)
      .fill({ color: COL_BONE })
      .stroke({ color: COL_BONE_DARK, width: 0.3 });
  }
  // String connecting bones
  g.moveTo(x + 2, neckY + 0.5)
    .bezierCurveTo(x + tw / 3, neckY + 2, x + tw * 2 / 3, neckY + 2, x + tw - 2, neckY + 0.5)
    .stroke({ color: COL_WRAP, width: 0.5 });

  // Center bone pendant (larger)
  g.moveTo(cx + tilt, neckY + 2)
    .lineTo(cx + tilt - 1.5, neckY + 5)
    .lineTo(cx + tilt + 1.5, neckY + 5)
    .closePath()
    .fill({ color: COL_BONE });
}

/** Shaman head with feathered headdress. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
): void {
  const hx = cx + tilt;

  // Head - slightly rounder than warrior orc
  g.roundRect(hx - 5, headTop, 10, 10, 3)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });

  // Wrinkled brow (older/wiser orc)
  g.moveTo(hx - 3, headTop + 2)
    .lineTo(hx + 3, headTop + 2)
    .stroke({ color: COL_SKIN_DARK, width: 0.8 });
  g.moveTo(hx - 2.5, headTop + 1)
    .lineTo(hx + 2.5, headTop + 1)
    .stroke({ color: COL_SKIN_DARK, width: 0.4, alpha: 0.5 });

  // Wise eyes (less angry than warrior)
  g.circle(hx - 2, headTop + 3.5, 1).fill({ color: COL_EYE });
  g.circle(hx + 2, headTop + 3.5, 1).fill({ color: COL_EYE });
  g.circle(hx - 2, headTop + 3.5, 0.4).fill({ color: 0x111100 });
  g.circle(hx + 2, headTop + 3.5, 0.4).fill({ color: 0x111100 });

  // Nose
  g.roundRect(hx - 1.5, headTop + 5, 3, 1.5, 0.5)
    .fill({ color: COL_SKIN_DARK });

  // Small tusks (older, more worn)
  g.moveTo(hx - 2, headTop + 7.5)
    .lineTo(hx - 1.5, headTop + 6)
    .stroke({ color: COL_TUSK, width: 1.2 });
  g.moveTo(hx + 2, headTop + 7.5)
    .lineTo(hx + 1.5, headTop + 6)
    .stroke({ color: COL_TUSK, width: 1.2 });

  // Mouth
  g.moveTo(hx - 2, headTop + 7.5)
    .lineTo(hx + 2, headTop + 7.5)
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });

  // Feathered headdress
  // Base headband
  g.rect(hx - 5, headTop - 1, 10, 2)
    .fill({ color: COL_WRAP });
  g.rect(hx - 5, headTop - 1, 10, 0.8)
    .fill({ color: COL_FEATHER_RED, alpha: 0.5 });

  // Feathers sticking up
  // Red feather (tall center)
  g.moveTo(hx, headTop - 1)
    .bezierCurveTo(hx + 1, headTop - 6, hx + 2, headTop - 9, hx + 1, headTop - 11)
    .stroke({ color: COL_FEATHER_RED, width: 1.8 });
  g.moveTo(hx + 0.5, headTop - 1)
    .bezierCurveTo(hx + 1.5, headTop - 5, hx + 2.5, headTop - 8, hx + 1.5, headTop - 10)
    .stroke({ color: COL_FEATHER_DK, width: 0.8 });

  // Green feather (left, shorter)
  g.moveTo(hx - 3, headTop - 1)
    .bezierCurveTo(hx - 4, headTop - 5, hx - 3, headTop - 7, hx - 2, headTop - 8)
    .stroke({ color: COL_FEATHER_GRN, width: 1.5 });

  // Red feather (right, medium)
  g.moveTo(hx + 3, headTop - 1)
    .bezierCurveTo(hx + 4, headTop - 4, hx + 5, headTop - 6, hx + 4, headTop - 8)
    .stroke({ color: COL_FEATHER_RED, width: 1.3 });

  // Small bone/bead on headband
  g.circle(hx - 4, headTop, 0.8).fill({ color: COL_BONE });
  g.circle(hx + 4, headTop, 0.8).fill({ color: COL_BONE });
}

/** Orc arm. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey)
    .stroke({ color: COL_SKIN, width: 3 });
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DARK });
}

/** Gnarled staff with green crystal on top. */
function drawStaff(
  g: Graphics,
  baseX: number,
  baseY: number,
  topX: number,
  topY: number,
  crystalGlow: number,
): void {
  // Gnarled staff shaft - slightly curved
  const midX = (baseX + topX) / 2 + 2;
  const midY = (baseY + topY) / 2;

  g.moveTo(baseX, baseY)
    .bezierCurveTo(midX - 1, midY + 3, midX + 1, midY - 3, topX, topY)
    .stroke({ color: COL_STAFF_WOOD, width: 3 });
  // Wood grain
  g.moveTo(baseX + 0.5, baseY)
    .bezierCurveTo(midX - 0.5, midY + 3, midX + 1.5, midY - 3, topX + 0.5, topY)
    .stroke({ color: COL_STAFF_HI, width: 0.8, alpha: 0.5 });

  // Knots on staff
  g.circle(midX, midY, 1.5).fill({ color: COL_STAFF_DARK });
  g.circle(midX - 1, midY + 6, 1).fill({ color: COL_STAFF_DARK });

  // Wrapping near grip
  for (let i = 0; i < 3; i++) {
    const wrapY = baseY - 3 - i * 2.5;
    const wrapX = baseX + (topX - baseX) * ((baseY - wrapY) / (baseY - topY));
    g.moveTo(wrapX - 2, wrapY)
      .lineTo(wrapX + 2, wrapY - 1)
      .stroke({ color: COL_WRAP, width: 1 });
  }

  // Crystal at top
  const crystalSize = 3;
  // Crystal glow aura
  if (crystalGlow > 0) {
    g.circle(topX, topY, crystalSize + 3 + crystalGlow * 3)
      .fill({ color: COL_HEAL_GLOW, alpha: 0.08 * crystalGlow });
    g.circle(topX, topY, crystalSize + 1 + crystalGlow * 2)
      .fill({ color: COL_HEAL_GLOW, alpha: 0.15 * crystalGlow });
  }

  // Crystal shape (hexagonal)
  g.moveTo(topX, topY - crystalSize - 1)
    .lineTo(topX + crystalSize, topY - 1)
    .lineTo(topX + crystalSize, topY + 1)
    .lineTo(topX, topY + crystalSize + 1)
    .lineTo(topX - crystalSize, topY + 1)
    .lineTo(topX - crystalSize, topY - 1)
    .closePath()
    .fill({ color: COL_CRYSTAL })
    .stroke({ color: COL_CRYSTAL_DK, width: 0.5 });

  // Crystal highlight
  g.moveTo(topX - 1, topY - crystalSize)
    .lineTo(topX + 1, topY - 1)
    .lineTo(topX - 1, topY)
    .closePath()
    .fill({ color: COL_CRYSTAL_CORE, alpha: 0.6 });

  // Crystal inner glow
  g.circle(topX, topY, crystalSize * 0.4)
    .fill({ color: COL_CRYSTAL_CORE, alpha: 0.3 + crystalGlow * 0.3 });
}

/** Green healing energy effect. */
function drawHealEffect(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
): void {
  g.circle(cx, cy, radius)
    .fill({ color: COL_HEAL_GLOW, alpha: 0.1 * intensity });
  g.circle(cx, cy, radius * 0.6)
    .fill({ color: COL_HEAL_GLOW, alpha: 0.2 * intensity });
  g.circle(cx, cy, radius * 0.25)
    .fill({ color: COL_HEAL_CORE, alpha: 0.3 * intensity });
}

/** Bone rattle particles for cast. */
function drawBoneParticles(
  g: Graphics,
  cx: number,
  cy: number,
  spread: number,
  count: number,
  seed: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = seed + (i / count) * Math.PI * 2;
    const dist = spread * (0.5 + Math.sin(seed * 3 + i * 1.7) * 0.5);
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    // Tiny bone fragment
    g.roundRect(bx - 1, by - 0.5, 2, 1, 0.3)
      .fill({ color: COL_BONE, alpha: 0.7 });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);

  const gy2 = GY;
  const legH = 7;
  const torsoH = 11;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const headTop = torsoTop - 10 + bob;

  // Crystal glow pulsing
  const crystalPulse = 0.3 + t * 0.7;

  drawShadow(g, CX, gy2);
  drawSandals(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Left arm resting on staff
  drawArm(g, CX - 6, torsoTop + 3, CX - 8, torsoTop + 7);

  // Staff planted on ground, held by left hand
  drawStaff(g, CX - 9, gy2 - 2, CX - 10, headTop - 4 + bob, crystalPulse);

  // Right arm at side
  drawArm(g, CX + 6, torsoTop + 3, CX + 8, torsoTop + 8 + bob);

  // Subtle ambient heal glow near crystal
  drawHealEffect(g, CX - 10, headTop - 4 + bob, 5 + t * 2, crystalPulse * 0.4);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 11;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 10;

  drawShadow(g, CX, gy2, 12 + Math.abs(walk), 3);
  drawSandals(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.5);
  drawHead(g, CX, headTop, walk * 0.3);

  // Staff used as walking stick - moves with stride
  const staffBaseX = CX - 8 + walk * 2;
  const staffBaseY = gy2 - 2;
  const staffTopX = staffBaseX - 1;
  const staffTopY = headTop - 4;

  drawArm(g, CX - 6, torsoTop + 3, staffBaseX + 1, torsoTop + 7);
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 0.3);

  // Right arm swinging
  drawArm(g, CX + 6, torsoTop + 3, CX + 8 - walk * 2, torsoTop + 7 + walk * 2);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: point staff forward, green energy bolt
  const phases = [0, 0.12, 0.3, 0.5, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 7;
  const torsoH = 11;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  const lean = t < 0.5 ? t * 3 : (1 - t) * 4;

  drawShadow(g, CX + lean * 0.3, gy2);
  drawSandals(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.5);

  // Staff swings forward to point at target
  let staffAngle: number;
  if (t < 0.3) {
    staffAngle = lerp(-Math.PI * 0.5, -Math.PI * 0.15, t / 0.3);
  } else if (t < 0.7) {
    staffAngle = -Math.PI * 0.15;
  } else {
    staffAngle = lerp(-Math.PI * 0.15, -Math.PI * 0.45, (t - 0.7) / 0.3);
  }

  // Staff held forward
  const staffGripX = CX - 4 + lean * 2;
  const staffGripY = torsoTop + 5;
  const staffLen = 22;
  const staffTopX = staffGripX + Math.cos(staffAngle) * staffLen;
  const staffTopY = staffGripY + Math.sin(staffAngle) * staffLen;
  const staffBaseX = staffGripX - Math.cos(staffAngle) * 8;
  const staffBaseY = staffGripY - Math.sin(staffAngle) * 8;

  drawArm(g, CX - 6, torsoTop + 3, staffGripX, staffGripY);
  drawArm(g, CX + 6, torsoTop + 3, staffGripX + 3, staffGripY + 2);

  // Staff with crystal aiming forward
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, t < 0.5 ? t * 2 : 1);

  // Energy bolt fires from crystal
  if (t >= 0.4 && t <= 0.95) {
    const boltT = (t - 0.4) / 0.55;
    const boltLen = boltT * 18;
    const boltX = staffTopX + Math.cos(staffAngle) * boltLen;
    const boltY = staffTopY + Math.sin(staffAngle) * boltLen;
    const boltAlpha = 1 - boltT * 0.6;

    // Energy bolt trail
    g.moveTo(staffTopX, staffTopY)
      .lineTo(boltX, boltY)
      .stroke({ color: COL_ENERGY_BOLT, width: 3, alpha: boltAlpha * 0.5 });
    g.moveTo(staffTopX, staffTopY)
      .lineTo(boltX, boltY)
      .stroke({ color: COL_HEAL_CORE, width: 1.5, alpha: boltAlpha * 0.7 });

    // Bolt head
    drawHealEffect(g, boltX, boltY, 3 + boltT * 2, boltAlpha);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: raises staff high, large green healing burst, bones rattle
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 11;
  const legTop = gy2 - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  drawShadow(g, CX, gy2, 12 + pulse * 4, 3 + pulse * 1.5);

  // Ground healing burst
  if (t > 0.15) {
    const burstT = (t - 0.15) / 0.85;
    const burstR = burstT * 20;
    const burstAlpha = Math.max(0, 1 - burstT * 0.8);

    g.ellipse(CX, gy2, burstR, burstR * 0.35)
      .stroke({ color: COL_HEAL_GLOW, width: 1.5, alpha: burstAlpha * 0.5 });
    g.ellipse(CX, gy2, burstR * 0.7, burstR * 0.25)
      .fill({ color: COL_HEAL_GLOW, alpha: burstAlpha * 0.1 });

    // Rune-like marks in circle
    for (let i = 0; i < 6; i++) {
      const ra = (i / 6) * Math.PI * 2 + t * 2;
      const rx = CX + Math.cos(ra) * burstR * 0.5;
      const ry = gy2 + Math.sin(ra) * burstR * 0.2;
      g.circle(rx, ry, 1)
        .fill({ color: COL_HEAL_CORE, alpha: burstAlpha * 0.6 });
    }
  }

  // Bone particles rattling
  drawBoneParticles(g, CX, torsoTop + 3, 8 + pulse * 5, 6, t * Math.PI * 4);

  drawSandals(g, CX, gy2, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Both arms raise staff overhead
  const raiseT = Math.min(t * 2.5, 1);
  const staffTopY2 = lerp(headTop - 4, headTop - 14, raiseT);
  const staffTopX2 = CX - 1;

  drawArm(g, CX - 6, torsoTop + 3, CX - 3, lerp(torsoTop + 7, torsoTop - 2, raiseT));
  drawArm(g, CX + 6, torsoTop + 3, CX + 1, lerp(torsoTop + 8, torsoTop - 1, raiseT));

  // Staff raised high
  drawStaff(g, CX, torsoTop + 2, staffTopX2, staffTopY2, 0.5 + pulse * 0.5);

  // Large crystal glow burst
  const glowR = 6 + pulse * 8;
  drawHealEffect(g, staffTopX2, staffTopY2, glowR, 0.6 + pulse * 0.4);

  // Rising energy particles from crystal
  for (let i = 0; i < 5; i++) {
    const px = staffTopX2 + Math.sin(t * Math.PI * 3 + i * 1.3) * (5 + i * 2);
    const py = staffTopY2 + 2 - (t * 15 + i * 4) % 18;
    const pAlpha = 0.2 + pulse * 0.5;
    g.circle(px, py, 0.8 + pulse * 0.6)
      .fill({ color: COL_HEAL_GLOW, alpha: pAlpha });
  }

  // Energy streams from crystal downward
  if (t > 0.3) {
    const streamAlpha = Math.min((t - 0.3) * 3, 1) * (1 - t * 0.3);
    for (let i = 0; i < 3; i++) {
      const sx2 = staffTopX2 + (i - 1) * 5;
      g.moveTo(staffTopX2, staffTopY2 + 3)
        .bezierCurveTo(
          sx2, staffTopY2 + 10,
          sx2 + (i - 1) * 3, gy2 - 10,
          CX + (i - 1) * 8, gy2 - 2
        )
        .stroke({ color: COL_HEAL_GLOW, width: 1.5, alpha: streamAlpha * 0.4 });
    }
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: falls to knees, staff drops, crystal dims
  const t = frame / 6;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 11;
  const legTop = gy2 - 4 - legH;

  const dropY = t * t * 8;
  const fallX = t * 4;
  const tiltBack = t * 2;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 10;

  drawShadow(g, CX - fallX * 0.2, gy2, 12 + t * 2, 3);

  // Staff drops and falls
  if (t < 0.5) {
    // Staff tilting away from hand
    const staffTilt = t * 3;
    drawStaff(g, CX - 8, gy2 - 2 + t * 4, CX - 10 - staffTilt * 3, headTop - 4 + dropY + staffTilt * 4, 1 - t * 2);
  } else {
    // Staff on ground, crystal dimming
    const dimT = (t - 0.5) / 0.5;
    const crystalDim = Math.max(0, 1 - dimT * 2);

    // Staff lying on ground
    g.moveTo(CX - 18, gy2 - 2)
      .lineTo(CX - 4, gy2 - 3)
      .stroke({ color: COL_STAFF_WOOD, width: 2.5 });

    // Crystal at end, dimming
    if (crystalDim > 0) {
      g.moveTo(CX - 18, gy2 - 3)
        .lineTo(CX - 19, gy2 - 5)
        .lineTo(CX - 17, gy2 - 5)
        .closePath()
        .fill({ color: COL_CRYSTAL, alpha: crystalDim });
      drawHealEffect(g, CX - 18, gy2 - 4, 2, crystalDim * 0.3);
    }
  }

  // Falling to knees
  drawSandals(g, CX - fallX * 0.2, gy2, t, -t * 0.5);

  if (t < 0.5) {
    drawLegs(g, CX - fallX * 0.2, legTop + dropY * 0.5, legH, 0, 0);
  } else {
    // Kneeling - legs folded
    g.rect(CX - 5 - fallX * 0.2, gy2 - 6, 4, 4).fill({ color: COL_SKIN_DARK });
    g.rect(CX + 1 - fallX * 0.2, gy2 - 6, 4, 4).fill({ color: COL_SKIN_DARK });
  }

  // Torso slumping
  drawTorso(g, CX - fallX * 0.3, torsoTop, torsoH * (1 - t * 0.15), -tiltBack);

  // Head dropping
  if (t < 0.9) {
    drawHead(g, CX - fallX * 0.4, headTop + dropY * 0.5, -tiltBack * 0.8);
  }

  // Arms going limp
  if (t < 0.5) {
    drawArm(g, CX - 6 - fallX * 0.3, torsoTop + 3,
      CX - 9 - fallX, torsoTop + 7 + dropY * 0.3);
    drawArm(g, CX + 6 - fallX * 0.3, torsoTop + 3,
      CX + 4 - fallX * 0.5, torsoTop + 8 + dropY * 0.3);
  } else {
    const cx2 = CX - fallX * 0.4;
    drawArm(g, cx2 - 5, torsoTop + 3, cx2 - 8, torsoTop + torsoH - 1);
    drawArm(g, cx2 + 5, torsoTop + 3, cx2 + 2, torsoTop + torsoH);
  }

  // Feathers falling off headdress
  if (t > 0.3) {
    const featherT = (t - 0.3) / 0.7;
    const fx = CX - fallX * 0.4 + featherT * 8;
    const fy = headTop - 8 + featherT * featherT * 16;
    if (featherT < 0.8) {
      g.moveTo(fx, fy)
        .lineTo(fx + 1, fy + 3)
        .stroke({ color: COL_FEATHER_RED, width: 1.2 });
    }
    const fx2 = CX - fallX * 0.4 - featherT * 5;
    const fy2 = headTop - 6 + featherT * featherT * 14;
    if (featherT < 0.7) {
      g.moveTo(fx2, fy2)
        .lineTo(fx2 - 0.5, fy2 + 2.5)
        .stroke({ color: COL_FEATHER_GRN, width: 1 });
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
 * Generate all horde healer sprite frames procedurally.
 *
 * Returns a map from `UnitState` -> ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateHordeHealerFrames(
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
