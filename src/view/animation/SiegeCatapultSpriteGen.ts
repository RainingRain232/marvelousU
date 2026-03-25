// Procedural sprite generator for the Siege Catapult unit type.
//
// A larger version of the regular catapult. 2 tiles wide × 1 tile tall.
// Draws at 96×48 pixels per frame (2× width of normal catapult).
// Enhanced with wood grain, iron fittings, detailed wheels, rope texture,
// boulder cracks, counterweight stones, operator details, and attack effects.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96; // frame width (2 tiles)
const FH = 48; // frame height (1 tile)
const CX = FW / 2;
const GY = FH - 4; // ground line

// Palette
const COL_WOOD = 0x7a5c3a;
const COL_WOOD_DK = 0x4e3622;
const COL_WOOD_LT = 0x9e7e56;
const COL_WOOD_GRAIN = 0x6a4c2a;
const COL_WOOD_KNOT = 0x3e2612;
const COL_WOOD_STAIN = 0x5a4020;
const COL_IRON = 0x707070;
const COL_IRON_DK = 0x4a4a4a;
const COL_IRON_HI = 0x999999;
const COL_IRON_RIVET = 0xaaaaaa;
const COL_ROPE = 0xb8a880;
const COL_ROPE_DK = 0x9a8a68;
const COL_ROPE_LT = 0xd0c098;
const COL_BOULDER = 0x888888;
const COL_BOULDER_DK = 0x666666;
const COL_BOULDER_LT = 0xa0a0a0;
const COL_BOULDER_CRACK = 0x555555;
const COL_LICHEN = 0x7a9a5a;
const COL_SHADOW = 0x000000;
const COL_CHAIN = 0x606060;
const COL_CHAIN_HI = 0x8a8a8a;
const COL_DUST = 0xc8b898;
const COL_DUST_LT = 0xe0d8c0;
const COL_STRESS = 0x9e7040;

// Operator palette
const COL_SKIN = 0xe8b89d;
const COL_SKIN_DK = 0xc89878;
const COL_HAIR = 0x4a3728;
const COL_BEARD = 0x5a4738;
const COL_TUNIC = 0x7a4a2a;
const COL_TUNIC_DK = 0x5a3a1a;
const COL_PANTS = 0x5c4033;
const COL_BOOTS = 0x3d2914;
const COL_BELT = 0x2a1a0a;
const COL_BELT_BUCKLE = 0xb89830;
const COL_GLOVE = 0x6a5030;
const COL_TOOL = 0x808080;
const COL_NAIL = 0x606060;
const COL_CW_STONE1 = 0x787878;
const COL_CW_STONE2 = 0x686868;
const COL_CW_STONE3 = 0x585858;

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function line(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  w = 1,
) {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function rect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.fill({ color });
  g.rect(x, y, w, h);
}

function circ(g: Graphics, x: number, y: number, r: number, color: number) {
  g.fill({ color });
  g.circle(x, y, r);
}

function ellipse(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
) {
  g.fill({ color });
  g.ellipse(x, y, rx, ry);
}

// ---------------------------------------------------------------------------
// Wood grain texture helper — draws grain lines along a rectangular beam
// ---------------------------------------------------------------------------

function drawWoodGrain(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean,
) {
  const grainCount = horizontal ? Math.floor(h / 2) : Math.floor(w / 2);
  for (let i = 0; i < grainCount; i++) {
    const offset = (i / grainCount) * (horizontal ? h : w);
    const wave = Math.sin(i * 2.7) * 0.5;
    if (horizontal) {
      line(g, x + 1, y + offset + wave, x + w - 1, y + offset + wave + Math.sin(i * 1.3) * 0.3, COL_WOOD_GRAIN, 0.3);
    } else {
      line(g, x + offset + wave, y + 1, x + offset + wave + Math.sin(i * 1.3) * 0.3, y + h - 1, COL_WOOD_GRAIN, 0.3);
    }
  }
}

// Draw a knot mark on wood
function drawKnot(g: Graphics, x: number, y: number) {
  circ(g, x, y, 1.2, COL_WOOD_KNOT);
  circ(g, x, y, 0.6, COL_WOOD_DK);
}

// Draw nail heads
function drawNail(g: Graphics, x: number, y: number) {
  circ(g, x, y, 0.5, COL_NAIL);
  circ(g, x - 0.2, y - 0.2, 0.2, COL_IRON_HI);
}

// Draw saw-cut marks
function drawSawMarks(g: Graphics, x: number, y: number, w: number) {
  for (let i = 0; i < 3; i++) {
    const sx = x + (w * (i + 1)) / 4;
    line(g, sx, y, sx, y + 1, COL_WOOD_STAIN, 0.3);
  }
}

// Draw iron bracket with rivets
function drawBracket(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  _angle = 0,
) {
  const s = size;
  // L-shaped bracket
  rect(g, x - s * 0.5, y - s * 0.5, s, s * 0.3, COL_IRON_DK);
  rect(g, x - s * 0.5, y - s * 0.5, s * 0.3, s, COL_IRON_DK);
  // Rivets at corners
  circ(g, x - s * 0.3, y - s * 0.3, 0.4, COL_IRON_RIVET);
  circ(g, x + s * 0.3, y - s * 0.3, 0.4, COL_IRON_RIVET);
  circ(g, x - s * 0.3, y + s * 0.3, 0.4, COL_IRON_RIVET);
}

// Draw rope coil texture
function drawRopeSegment(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w = 1.5,
) {
  // Main rope
  line(g, x1, y1, x2, y2, COL_ROPE, w);
  // Braid highlights
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const segments = Math.max(2, Math.floor(len / 2));
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const mx = x1 + dx * t;
    const my = y1 + dy * t;
    const side = i % 2 === 0 ? 0.3 : -0.3;
    circ(g, mx + nx * side, my + ny * side, w * 0.25, COL_ROPE_LT);
  }
}

// Draw chain links between two points
function drawChain(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const links = Math.max(2, Math.floor(len / 2.5));
  for (let i = 0; i < links; i++) {
    const t = (i + 0.5) / links;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const horizontal = i % 2 === 0;
    if (horizontal) {
      ellipse(g, cx, cy, 1.2, 0.6, COL_CHAIN);
      ellipse(g, cx, cy, 0.8, 0.3, COL_CHAIN_HI);
    } else {
      ellipse(g, cx, cy, 0.6, 1.2, COL_CHAIN);
      ellipse(g, cx, cy, 0.3, 0.8, COL_CHAIN_HI);
    }
  }
}

// ---------------------------------------------------------------------------
// Shadow (wider for siege catapult)
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 34, 4, COL_SHADOW);
}

// ---------------------------------------------------------------------------
// Operator (stands on right/back side, with detail)
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, armAngle: number, tilt = 0) {
  const opX = CX + 28;
  const opBaseY = GY - 1;
  const bodyTilt = tilt * 0.3;

  // Legs — slightly separated, with calf/thigh shape
  const legLX = opX - 2 + bodyTilt;
  const legRX = opX + 2 + bodyTilt;
  const hipY = opBaseY - 11;
  // Left leg
  line(g, legLX - 1, opBaseY - 1, legLX - 2, hipY, COL_PANTS, 2.5);
  line(g, legLX - 1, opBaseY - 1, legLX, opBaseY - 6, COL_PANTS, 3); // calf thicker
  // Right leg
  line(g, legRX + 1, opBaseY - 1, legRX + 2, hipY, COL_PANTS, 2.5);
  line(g, legRX + 1, opBaseY - 1, legRX, opBaseY - 6, COL_PANTS, 3);

  // Boots with soles
  rect(g, opX - 6 + bodyTilt, opBaseY - 2, 5, 3, COL_BOOTS);
  rect(g, opX + 1 + bodyTilt, opBaseY - 2, 5, 3, COL_BOOTS);
  // Boot soles
  rect(g, opX - 6 + bodyTilt, opBaseY + 1, 5, 1, COL_WOOD_DK);
  rect(g, opX + 1 + bodyTilt, opBaseY + 1, 5, 1, COL_WOOD_DK);

  // Torso (tunic) with folds
  const tunicY = opBaseY - 22;
  rect(g, opX - 5 + bodyTilt, tunicY, 10, 12, COL_TUNIC);
  rect(g, opX - 4 + bodyTilt, tunicY + 1, 8, 10, COL_TUNIC_DK);
  // Tunic fold lines
  line(g, opX - 2 + bodyTilt, tunicY + 2, opX - 2 + bodyTilt, tunicY + 10, COL_TUNIC_DK, 0.3);
  line(g, opX + 2 + bodyTilt, tunicY + 3, opX + 2 + bodyTilt, tunicY + 9, COL_TUNIC_DK, 0.3);

  // Belt with buckle and tool pouch
  rect(g, opX - 5 + bodyTilt, tunicY + 9, 10, 2, COL_BELT);
  // Belt buckle
  rect(g, opX - 1 + bodyTilt, tunicY + 9, 2, 2, COL_BELT_BUCKLE);
  circ(g, opX + bodyTilt, tunicY + 10, 0.5, COL_BELT);
  // Tool pouch on belt
  rect(g, opX + 3 + bodyTilt, tunicY + 9, 2, 3, COL_BELT);
  // Hammer in pouch
  line(g, opX + 4 + bodyTilt, tunicY + 9, opX + 4 + bodyTilt, tunicY + 7, COL_TOOL, 0.7);
  rect(g, opX + 3 + bodyTilt, tunicY + 6.5, 2.5, 1.5, COL_TOOL);

  // Arms reaching toward winch
  const shoulderY = tunicY + 2;
  const handX = CX + 14 + Math.cos(armAngle) * 4;
  const handY = GY - 20 + tilt + Math.sin(armAngle) * 4;

  // Upper arms (tunic-colored sleeve)
  const elbowLX = opX - 4 + bodyTilt + (handX - (opX - 4 + bodyTilt)) * 0.5;
  const elbowLY = shoulderY + (handY - shoulderY) * 0.4 - 2;
  line(g, opX - 4 + bodyTilt, shoulderY, elbowLX, elbowLY, COL_TUNIC, 2.5);
  line(g, elbowLX, elbowLY, handX, handY, COL_TUNIC_DK, 2);
  const elbowRX = opX + 4 + bodyTilt + (handX + 3 - (opX + 4 + bodyTilt)) * 0.5;
  const elbowRY = shoulderY + (handY - shoulderY) * 0.4 - 1;
  line(g, opX + 4 + bodyTilt, shoulderY, elbowRX, elbowRY, COL_TUNIC, 2.5);
  line(g, elbowRX, elbowRY, handX + 3, handY, COL_TUNIC_DK, 2);

  // Gloves
  circ(g, handX, handY, 2, COL_GLOVE);
  circ(g, handX + 3, handY, 2, COL_GLOVE);
  // Glove cuff line
  circ(g, handX, handY - 1.5, 0.5, COL_GLOVE);
  circ(g, handX + 3, handY - 1.5, 0.5, COL_GLOVE);

  // Head — larger with more detail
  const headY = tunicY - 5;
  const headX = opX + bodyTilt;
  circ(g, headX, headY, 4.5, COL_SKIN);
  // Hair on top
  ellipse(g, headX, headY - 2.5, 4.5, 3, COL_HAIR);
  // Side hair / sideburns
  rect(g, headX - 4.5, headY - 2, 1.5, 4, COL_HAIR);
  rect(g, headX + 3, headY - 2, 1.5, 4, COL_HAIR);

  // Face details
  if (bodyTilt < 3) {
    const ft = bodyTilt * 0.3;
    // Eyes
    g.fill({ color: 0xffffff });
    g.circle(headX - 1.5 + ft, headY, 1);
    g.circle(headX + 1.5 + ft, headY, 1);
    g.fill({ color: 0x222222 });
    g.circle(headX - 1.5 + ft, headY, 0.5);
    g.circle(headX + 1.5 + ft, headY, 0.5);

    // Nose
    line(g, headX + ft, headY + 0.5, headX + ft - 0.5, headY + 1.5, COL_SKIN_DK, 0.5);
    circ(g, headX + ft, headY + 1.5, 0.4, COL_SKIN_DK);

    // Beard
    ellipse(g, headX + ft, headY + 3.5, 3, 2.5, COL_BEARD);
    // Beard texture lines
    for (let i = -2; i <= 2; i++) {
      line(
        g,
        headX + ft + i * 0.8,
        headY + 2.5,
        headX + ft + i * 0.6,
        headY + 5,
        COL_HAIR,
        0.3,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Detailed wheel with spokes, iron rim, hub bolts
// ---------------------------------------------------------------------------

function drawWheel(
  g: Graphics,
  wx: number,
  wy: number,
  frame: number,
  wheelIndex: number,
) {
  const outerR = 5.5;
  const innerR = 1.8;
  const spokeCount = 7;

  // Iron tire band (outer rim)
  circ(g, wx, wy, outerR + 0.8, COL_IRON_DK);
  circ(g, wx, wy, outerR + 0.3, COL_IRON);
  // Rim highlight
  g.stroke({ color: COL_IRON_HI, width: 0.3 });
  g.arc(wx, wy, outerR + 0.5, -Math.PI * 0.4, Math.PI * 0.2);
  g.stroke();

  // Wooden wheel body
  circ(g, wx, wy, outerR, COL_WOOD);
  circ(g, wx, wy, outerR - 0.5, COL_WOOD_LT);

  // Spokes — different angle offset per frame for rotation effect
  const spokeOffset = (frame * Math.PI * 2) / 8 + wheelIndex * 0.4;
  for (let a = 0; a < spokeCount; a++) {
    const angle = spokeOffset + (a * Math.PI * 2) / spokeCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Spoke body
    line(g, wx + cos * innerR, wy + sin * innerR, wx + cos * (outerR - 0.5), wy + sin * (outerR - 0.5), COL_WOOD_DK, 0.8);
    // Spoke grain
    line(g, wx + cos * (innerR + 1), wy + sin * (innerR + 1), wx + cos * (outerR - 1), wy + sin * (outerR - 1), COL_WOOD_GRAIN, 0.3);
  }

  // Hub
  circ(g, wx, wy, innerR + 0.5, COL_IRON_DK);
  circ(g, wx, wy, innerR, COL_IRON);
  circ(g, wx, wy, innerR - 0.5, COL_IRON_HI);

  // Hub bolts
  for (let b = 0; b < 4; b++) {
    const bAngle = spokeOffset + (b * Math.PI) / 2;
    circ(g, wx + Math.cos(bAngle) * (innerR - 0.3), wy + Math.sin(bAngle) * (innerR - 0.3), 0.35, COL_IRON_RIVET);
  }
}

// ---------------------------------------------------------------------------
// Catapult base frame with wood grain, planking, nail heads, iron brackets
// ---------------------------------------------------------------------------

function drawBase(g: Graphics, tilt = 0, frame = 0) {
  const baseY = GY - 3 + tilt;

  // Bottom beam (horizontal) — with planking detail
  rect(g, CX - 32, baseY, 50, 4, COL_WOOD_DK);
  // Planking lines
  for (let p = 0; p < 5; p++) {
    const px = CX - 32 + p * 10;
    line(g, px, baseY, px, baseY + 4, COL_WOOD_KNOT, 0.3);
  }
  // Wood grain on horizontal beam
  drawWoodGrain(g, CX - 32, baseY, 50, 4, true);
  // Nail heads on beam
  drawNail(g, CX - 28, baseY + 1);
  drawNail(g, CX - 18, baseY + 1);
  drawNail(g, CX - 8, baseY + 1);
  drawNail(g, CX + 2, baseY + 1);
  drawNail(g, CX + 12, baseY + 1);
  // Saw-cut marks at beam ends
  drawSawMarks(g, CX - 32, baseY, 8);
  drawSawMarks(g, CX + 10, baseY, 8);
  // Weathering/staining spots
  circ(g, CX - 20, baseY + 2, 1.5, COL_WOOD_STAIN);
  circ(g, CX + 5, baseY + 1.5, 1, COL_WOOD_STAIN);

  // Wheels (3 for stability, with detail)
  drawWheel(g, CX - 26, baseY + 4, frame, 0);
  drawWheel(g, CX - 4, baseY + 4, frame, 1);
  drawWheel(g, CX + 14, baseY + 4, frame, 2);

  // Upright supports (A-frame) — with grain and brackets
  const topY = baseY - 24;
  const pivotX = CX - 6;

  // Left upright
  line(g, pivotX - 10, baseY, pivotX, topY, COL_WOOD_DK, 4);
  // Left upright grain
  for (let gl = 0; gl < 4; gl++) {
    const t = (gl + 0.5) / 4;
    const gx1 = pivotX - 10 + (pivotX - (pivotX - 10)) * t - 0.5;
    const gy1 = baseY + (topY - baseY) * t;
    const gx2 = gx1 + 0.3;
    const gy2 = gy1 + 3;
    line(g, gx1, gy1, gx2, gy2, COL_WOOD_GRAIN, 0.3);
  }
  // Right upright
  line(g, pivotX + 10, baseY, pivotX, topY, COL_WOOD_DK, 4);
  // Right upright grain
  for (let gl = 0; gl < 4; gl++) {
    const t = (gl + 0.5) / 4;
    const gx1 = pivotX + 10 + (pivotX - (pivotX + 10)) * t + 0.5;
    const gy1 = baseY + (topY - baseY) * t;
    const gx2 = gx1 - 0.3;
    const gy2 = gy1 + 3;
    line(g, gx1, gy1, gx2, gy2, COL_WOOD_GRAIN, 0.3);
  }

  // Knot marks on uprights
  drawKnot(g, pivotX - 5, baseY - 10);
  drawKnot(g, pivotX + 4, baseY - 16);

  // Iron brackets at beam joins
  drawBracket(g, pivotX - 8, baseY - 1, 4);
  drawBracket(g, pivotX + 8, baseY - 1, 4);

  // Cross brace with grain
  const braceY = baseY - 13;
  line(g, pivotX - 7, braceY, pivotX + 7, braceY, COL_WOOD_LT, 2);
  drawWoodGrain(g, pivotX - 7, braceY - 1, 14, 2, true);
  // Bracket at cross brace intersection
  drawBracket(g, pivotX, braceY, 3);

  // Second cross brace
  const braceY2 = baseY - 7;
  line(g, pivotX - 9, braceY2, pivotX + 9, braceY2, COL_WOOD_LT, 1.5);
  drawWoodGrain(g, pivotX - 9, braceY2 - 0.75, 18, 1.5, true);

  // Iron pivot joint at top — with gear detail
  circ(g, pivotX, topY, 4, COL_IRON_DK);
  circ(g, pivotX, topY, 2.5, COL_IRON);
  circ(g, pivotX, topY, 1.2, COL_IRON_HI);
  // Gear teeth around pivot
  for (let gt = 0; gt < 8; gt++) {
    const ga = (gt * Math.PI * 2) / 8;
    const gx = pivotX + Math.cos(ga) * 3.5;
    const gy = topY + Math.sin(ga) * 3.5;
    circ(g, gx, gy, 0.6, COL_IRON);
  }
  // Pivot bolt center
  circ(g, pivotX, topY, 0.6, COL_IRON_RIVET);
}

// ---------------------------------------------------------------------------
// Throwing arm with wood grain and iron fittings
// ---------------------------------------------------------------------------

function drawArm(
  g: Graphics,
  armAngle: number,
  tilt = 0,
  stressLines = false,
) {
  const baseY = GY - 3 + tilt;
  const pivotX = CX - 6;
  const pivotY = baseY - 24;

  const shortLen = 12; // counterweight side
  const longLen = 28; // sling/throwing side

  // Short end (counterweight side)
  const cwX = pivotX + Math.cos(armAngle) * shortLen;
  const cwY = pivotY + Math.sin(armAngle) * shortLen;

  // Long end (throwing side)
  const throwX = pivotX - Math.cos(armAngle) * longLen;
  const throwY = pivotY - Math.sin(armAngle) * longLen;

  // Draw the arm beam (thicker, with grain)
  line(g, cwX, cwY, throwX, throwY, COL_WOOD, 4);
  // Grain lines along beam
  const dx = throwX - cwX;
  const dy = throwY - cwY;
  const armLen = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / armLen;
  const ny = dx / armLen;
  for (let gl = 0; gl < 3; gl++) {
    const offset = (gl - 1) * 1;
    line(
      g,
      cwX + nx * offset,
      cwY + ny * offset,
      throwX + nx * offset,
      throwY + ny * offset,
      COL_WOOD_GRAIN,
      0.3,
    );
  }
  // Knot on arm
  const knotT = 0.6;
  drawKnot(g, cwX + dx * knotT, cwY + dy * knotT);

  // Iron band around arm at pivot point
  const bandX = pivotX;
  const bandY = pivotY;
  circ(g, bandX, bandY, 2.5, COL_IRON_DK);
  circ(g, bandX, bandY, 1.8, COL_WOOD);

  // Stress lines when firing
  if (stressLines) {
    for (let sl = 0; sl < 4; sl++) {
      const t = 0.3 + sl * 0.15;
      const sx = cwX + dx * t;
      const sy = cwY + dy * t;
      line(g, sx - nx * 2, sy - ny * 2, sx + nx * 2, sy + ny * 2, COL_STRESS, 0.4);
    }
  }

  // Counterweight — box with visible stones inside, chain links
  const cwHangY = cwY + 6;
  // Chain instead of rope
  drawChain(g, cwX, cwY, cwX, cwHangY - 3);

  // Counterweight box outer
  rect(g, cwX - 6, cwHangY - 4, 12, 8, COL_IRON_DK);
  // Inner area
  rect(g, cwX - 5, cwHangY - 3, 10, 6, COL_IRON);
  // Iron bracket edges
  line(g, cwX - 6, cwHangY - 4, cwX + 6, cwHangY - 4, COL_IRON_HI, 0.5);
  line(g, cwX - 6, cwHangY - 4, cwX - 6, cwHangY + 4, COL_IRON_HI, 0.5);
  // Corner rivets
  circ(g, cwX - 5, cwHangY - 3, 0.4, COL_IRON_RIVET);
  circ(g, cwX + 5, cwHangY - 3, 0.4, COL_IRON_RIVET);
  circ(g, cwX - 5, cwHangY + 2, 0.4, COL_IRON_RIVET);
  circ(g, cwX + 5, cwHangY + 2, 0.4, COL_IRON_RIVET);

  // Stones inside counterweight
  circ(g, cwX - 2, cwHangY - 1, 2, COL_CW_STONE1);
  circ(g, cwX + 2, cwHangY, 1.8, COL_CW_STONE2);
  circ(g, cwX, cwHangY + 1.5, 1.5, COL_CW_STONE3);
  circ(g, cwX - 3, cwHangY + 1, 1.2, COL_CW_STONE2);
  circ(g, cwX + 3, cwHangY + 1.5, 1, COL_CW_STONE1);
  // Stone highlights
  circ(g, cwX - 2.5, cwHangY - 1.5, 0.5, COL_IRON_HI);
  circ(g, cwX + 1.5, cwHangY - 0.5, 0.4, COL_IRON_HI);

  return { throwX, throwY };
}

// ---------------------------------------------------------------------------
// Boulder with rock texture, cracks, lichen, multiple shading layers
// ---------------------------------------------------------------------------

function drawBoulder(g: Graphics, x: number, y: number, visible = true) {
  if (!visible) return;

  // Sling with braided rope look
  drawRopeSegment(g, x, y - 4, x - 4, y + 1, 1.5);
  drawRopeSegment(g, x, y - 4, x + 4, y + 1, 1.5);

  // Sling pouch — curved cradle shape
  g.fill({ color: COL_ROPE_DK });
  g.moveTo(x - 4, y + 1);
  g.quadraticCurveTo(x - 3, y + 4, x, y + 3);
  g.quadraticCurveTo(x + 3, y + 4, x + 4, y + 1);
  g.closePath();
  g.fill();
  // Pouch stitching
  for (let st = -3; st <= 3; st++) {
    circ(g, x + st, y + 2 + Math.abs(st) * 0.3, 0.2, COL_ROPE_LT);
  }

  // Boulder — multiple layers for 3D look
  // Shadow/base layer
  circ(g, x + 0.5, y + 4.5, 5.5, COL_BOULDER_DK);
  // Main body
  circ(g, x, y + 4, 5, COL_BOULDER);
  // Lighter upper area
  ellipse(g, x - 0.5, y + 3, 3.5, 3, COL_BOULDER_LT);
  // Highlight
  circ(g, x - 1.5, y + 2.5, 1.5, 0xb0b0b0);

  // Cracks
  line(g, x - 2, y + 2, x + 1, y + 5, COL_BOULDER_CRACK, 0.5);
  line(g, x + 1, y + 5, x + 3, y + 4, COL_BOULDER_CRACK, 0.4);
  line(g, x - 1, y + 4, x - 3, y + 6, COL_BOULDER_CRACK, 0.3);
  // Secondary crack
  line(g, x + 1, y + 2, x + 2, y + 4, COL_BOULDER_CRACK, 0.3);

  // Lichen spots
  circ(g, x + 2, y + 2.5, 0.8, COL_LICHEN);
  circ(g, x - 2.5, y + 5, 0.6, COL_LICHEN);
  circ(g, x + 0.5, y + 6, 0.5, COL_LICHEN);
}

// ---------------------------------------------------------------------------
// Flying boulder (during attack, in the air)
// ---------------------------------------------------------------------------

function drawFlyingBoulder(
  g: Graphics,
  x: number,
  y: number,
  frame: number,
) {
  const spin = frame * 0.8;
  // Shadow layer
  circ(g, x + 0.5, y + 0.5, 4, COL_BOULDER_DK);
  // Main body
  circ(g, x, y, 3.5, COL_BOULDER);
  // Rotating highlight
  circ(g, x + Math.cos(spin) * 1.5, y + Math.sin(spin) * 1.5, 1, COL_BOULDER_LT);
  // Crack
  line(g, x - 1, y - 1, x + 1, y + 1, COL_BOULDER_CRACK, 0.4);
}

// ---------------------------------------------------------------------------
// Winch at the back (with coiled rope)
// ---------------------------------------------------------------------------

function drawWinch(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 16;
  const wy = GY - 15 + tilt;

  // Winch frame supports
  line(g, wx - 4, wy + 8, wx - 3, wy - 4, COL_WOOD_DK, 2);
  line(g, wx + 4, wy + 8, wx + 3, wy - 4, COL_WOOD_DK, 2);
  // Grain on winch supports
  line(g, wx - 3.5, wy + 6, wx - 3, wy - 2, COL_WOOD_GRAIN, 0.3);
  line(g, wx + 3.5, wy + 6, wx + 3, wy - 2, COL_WOOD_GRAIN, 0.3);

  // Winch drum
  rect(g, wx - 3, wy - 3, 6, 6, COL_WOOD_DK);
  drawWoodGrain(g, wx - 3, wy - 3, 6, 6, false);
  circ(g, wx, wy, 3, COL_IRON_DK);
  circ(g, wx, wy, 2.2, COL_IRON);

  // Rope coiled on drum
  for (let rc = 0; rc < 4; rc++) {
    const ra = angle + (rc * Math.PI) / 2;
    circ(g, wx + Math.cos(ra) * 2, wy + Math.sin(ra) * 2, 0.6, COL_ROPE);
  }

  // Crank handle
  const crankLen = 6;
  const hx = wx + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;
  line(g, wx, wy, hx, hy, COL_IRON, 2);
  circ(g, hx, hy, 1.5, COL_IRON_HI);
  // Crank grip
  circ(g, hx, hy, 1, COL_WOOD_DK);
}

// ---------------------------------------------------------------------------
// Dust cloud effect (during attack)
// ---------------------------------------------------------------------------

function drawDustCloud(
  g: Graphics,
  x: number,
  y: number,
  intensity: number,
) {
  if (intensity <= 0) return;
  const alpha = intensity * 0.5;
  g.alpha = alpha;
  // Multiple dust puffs
  circ(g, x - 3, y, 3 * intensity, COL_DUST);
  circ(g, x + 4, y - 1, 2.5 * intensity, COL_DUST_LT);
  circ(g, x - 1, y + 2, 2 * intensity, COL_DUST);
  circ(g, x + 2, y + 1, 1.8 * intensity, COL_DUST_LT);
  circ(g, x - 5, y + 1, 1.5 * intensity, COL_DUST);
  circ(g, x + 6, y, 1.2 * intensity, COL_DUST_LT);
  g.alpha = 1;
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const breathe = Math.sin(cycle * Math.PI * 2) * 0.5;
  const armAngle = 0.4 + breathe * 0.02;

  drawOperator(g, cycle * Math.PI * 2);
  drawWinch(g, cycle * Math.PI * 2);
  drawBase(g, 0, 0);
  const { throwX, throwY } = drawArm(g, armAngle);
  drawBoulder(g, throwX, throwY);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 2;
  const tilt = Math.sin(cycle * Math.PI * 2) * 0.5;
  const armAngle = 0.4;

  drawOperator(g, cycle * Math.PI * 4, tilt + bounce);
  drawWinch(g, cycle * Math.PI * 4, tilt + bounce);
  drawBase(g, tilt + bounce, frame);
  const { throwX, throwY } = drawArm(g, armAngle, tilt + bounce);
  drawBoulder(g, throwX, throwY);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  let armAngle: number;
  let boulderVisible = true;
  let recoil = 0;
  let dustIntensity = 0;
  let stressLines = false;
  let flyingBoulder = false;
  let flyBX = 0;
  let flyBY = 0;

  if (frame < 2) {
    // Windup — tension building
    armAngle = 0.4 + frame * 0.1;
    stressLines = true;
  } else if (frame === 2) {
    // Release moment
    armAngle = 0.1;
    stressLines = true;
  } else if (frame === 3) {
    // Arm swings up, boulder launches
    armAngle = -0.8;
    boulderVisible = false;
    recoil = 1.5;
    dustIntensity = 0.8;
    stressLines = true;
    flyingBoulder = true;
    flyBX = CX - 20;
    flyBY = GY - 34;
  } else if (frame === 4) {
    // Full extension, maximum recoil
    armAngle = -1.2;
    boulderVisible = false;
    recoil = 3;
    dustIntensity = 1.0;
    flyingBoulder = true;
    flyBX = CX - 30;
    flyBY = GY - 38;
  } else {
    // Recovery
    armAngle = -0.6;
    boulderVisible = false;
    recoil = 1.5;
    dustIntensity = 0.4;
  }

  drawOperator(g, frame * 0.8, recoil);
  drawWinch(g, frame * 0.8, recoil);
  drawBase(g, recoil, 0);
  const { throwX, throwY } = drawArm(g, armAngle, recoil, stressLines);
  drawBoulder(g, throwX, throwY, boulderVisible);

  // Dust cloud at base during firing
  if (dustIntensity > 0) {
    drawDustCloud(g, CX - 10, GY - 2, dustIntensity);
  }

  // Flying boulder
  if (flyingBoulder) {
    drawFlyingBoulder(g, flyBX, flyBY, frame);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Cast uses idle-like animation with slight glow
  generateIdleFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;

  g.alpha = fade;

  const topple = progress * 25;
  const rad = (topple * Math.PI) / 180;
  const offsetY = progress * 12;
  const shatter = Math.sin(rad) * 12 * progress;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, shatter, offsetY);
  drawOperator(g, 0);
  drawBase(g, 0, 0);
  drawArm(g, 0.4);
  drawWinch(g, 0);

  // Boulder falls off
  if (progress < 0.4) {
    const boulderDrop = progress * 10;
    // Falling boulder with detail
    circ(g, CX - 28, GY - 22 + boulderDrop + 0.5, 5, COL_BOULDER_DK);
    circ(g, CX - 28, GY - 22 + boulderDrop, 4.5, COL_BOULDER);
    circ(g, CX - 29, GY - 23 + boulderDrop, 1.5, COL_BOULDER_LT);
    line(g, CX - 30, GY - 23 + boulderDrop, CX - 27, GY - 20 + boulderDrop, COL_BOULDER_CRACK, 0.4);
  }

  // Debris particles as it breaks apart
  if (progress > 0.3) {
    const debrisProgress = (progress - 0.3) / 0.7;
    for (let d = 0; d < 5; d++) {
      const dx = CX - 10 + d * 8 + shatter * (d * 0.3);
      const dy = GY - 15 + debrisProgress * 20 + d * 3;
      circ(g, dx, dy, 1 - debrisProgress * 0.5, COL_WOOD_DK);
    }
  }

  // Dust from collapse
  if (progress > 0.5) {
    const dustP = (progress - 0.5) * 2;
    drawDustCloud(g, CX + shatter, GY - 2 + offsetY, dustP);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateSiegeCatapultFrames(
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
