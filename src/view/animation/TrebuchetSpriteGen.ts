// Procedural sprite generator for the Trebuchet unit type.
//
// A massive medieval trebuchet at 96×96 pixels per frame (2 tiles wide × 2 tiles tall).
// Features a tall A-frame tower with plank detail, iron bracket joints, diagonal bracing,
// tapered throwing arm with wood grain, hanging chain counterweight with stone weights,
// braided sling with leather pouch, 8-spoke wheels with iron tyre bands,
// realistic boulder with cracks/moss/3D shading, two crew operators with helmets/tool belts,
// winch with rope coiling and ratchet detail, and dramatic attack follow-through.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96; // frame width (2 tiles)
const FH = 96; // frame height (2 tiles)
const CX = FW / 2;
const GY = FH - 6; // ground line

// Palette
const COL_WOOD = 0x7a5c3a;
const COL_WOOD_DK = 0x4e3622;
const COL_WOOD_LT = 0x9e7e56;
const COL_WOOD_GRAIN = 0x6b4f30;
const COL_IRON = 0x707070;
const COL_IRON_DK = 0x4a4a4a;
const COL_IRON_HI = 0x999999;
const COL_IRON_RUST = 0x8b4513;
const COL_ROPE = 0xb8a880;
const COL_ROPE_DK = 0x9a8a68;
const COL_LEATHER = 0x6b4226;
const COL_LEATHER_DK = 0x4a2e18;
const COL_BOULDER = 0x888888;
const COL_BOULDER_DK = 0x666666;
const COL_BOULDER_LT = 0xaaaaaa;
const COL_BOULDER_CRACK = 0x555555;
const COL_MOSS = 0x5a7a3a;
const COL_STONE_TEX = 0x7a7a7a;
const COL_SHADOW = 0x000000;
const COL_CHAIN = 0x606060;
const COL_CHAIN_HI = 0x8a8a8a;
const COL_GREASE = 0x3a3520;
const COL_NAIL = 0x5a5a5a;
const COL_DUST = 0xc8b898;

// Operator palette
const COL_SKIN = 0xe8b89d;
const COL_TUNIC = 0x7a4a2a;
const COL_TUNIC_DK = 0x5a3a1a;
const COL_PANTS = 0x5c4033;
const COL_BOOTS = 0x3d2914;
const COL_BELT = 0x2a1a0a;
const COL_HELMET = 0x6a6a6a;
const COL_HELMET_HI = 0x909090;
const COL_TOOL = 0x888888;

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

/** Draw a small bolt/nail head */
function drawBolt(g: Graphics, x: number, y: number, color = COL_NAIL) {
  circ(g, x, y, 1, color);
  circ(g, x - 0.3, y - 0.3, 0.4, COL_IRON_HI);
}

/** Draw a chain link segment */
function drawChainLink(g: Graphics, x: number, y: number, horizontal: boolean, color = COL_CHAIN) {
  if (horizontal) {
    ellipse(g, x, y, 2.5, 1.2, color);
    ellipse(g, x, y, 1.5, 0.5, COL_IRON_DK);
  } else {
    ellipse(g, x, y, 1.2, 2.5, color);
    ellipse(g, x, y, 0.5, 1.5, COL_IRON_DK);
  }
  // Highlight on link
  circ(g, x - 0.5, y - 0.5, 0.4, COL_CHAIN_HI);
}

/** Draw iron bracket at a joint */
function drawIronBracket(g: Graphics, x: number, y: number, size = 4) {
  const hs = size / 2;
  // L-shaped bracket
  rect(g, x - hs, y - 1, size, 2, COL_IRON);
  rect(g, x - 1, y - hs, 2, size, COL_IRON);
  // Corner bolts
  drawBolt(g, x - hs + 1, y - 1);
  drawBolt(g, x + hs - 1, y - 1);
  drawBolt(g, x - 1, y - hs + 1);
  drawBolt(g, x + 1, y + hs - 1);
  // Rust mark
  circ(g, x + hs - 1.5, y + 0.5, 0.6, COL_IRON_RUST);
}

/** Draw wood plank with grain lines and weathering */
function drawPlank(g: Graphics, x: number, y: number, w: number, h: number, vertical = false) {
  rect(g, x, y, w, h, COL_WOOD);
  // Grain lines
  if (vertical) {
    for (let gy = y + 2; gy < y + h - 1; gy += 3) {
      const wobble = Math.sin(gy * 0.8) * 0.5;
      line(g, x + 1 + wobble, gy, x + 1 + wobble, gy + 2, COL_WOOD_GRAIN, 0.5);
      line(g, x + w - 2 + wobble, gy + 1, x + w - 2 + wobble, gy + 3, COL_WOOD_GRAIN, 0.5);
    }
  } else {
    for (let gx = x + 2; gx < x + w - 1; gx += 3) {
      const wobble = Math.sin(gx * 0.7) * 0.4;
      line(g, gx, y + 1 + wobble, gx + 2, y + 1 + wobble, COL_WOOD_GRAIN, 0.5);
      line(g, gx + 1, y + h - 2 + wobble, gx + 3, y + h - 2 + wobble, COL_WOOD_GRAIN, 0.5);
    }
  }
  // Weathering marks — small darker spots
  circ(g, x + w * 0.3, y + h * 0.4, 0.6, COL_WOOD_DK);
  circ(g, x + w * 0.7, y + h * 0.7, 0.4, COL_WOOD_DK);
}

// ---------------------------------------------------------------------------
// Shadow (large)
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 40, 5, COL_SHADOW);
}

// ---------------------------------------------------------------------------
// Wheels — 8 spokes, iron tyre band, hub bolts, grease marks
// ---------------------------------------------------------------------------

function drawWheel(g: Graphics, wx: number, wy: number, rotation: number) {
  const r = 6;

  // Iron tyre band (outer rim)
  circ(g, wx, wy, r + 1, COL_IRON_DK);
  circ(g, wx, wy, r, COL_IRON);

  // Wooden wheel body
  circ(g, wx, wy, r - 0.5, COL_WOOD);

  // 8 spokes
  for (let a = 0; a < 8; a++) {
    const angle = rotation + (a * Math.PI) / 4;
    const sx = Math.cos(angle) * (r - 1);
    const sy = Math.sin(angle) * (r - 1);
    line(g, wx, wy, wx + sx, wy + sy, COL_WOOD_DK, 0.8);
  }

  // Hub
  circ(g, wx, wy, 2, COL_IRON_DK);
  circ(g, wx, wy, 1.2, COL_IRON_HI);

  // Hub bolts (4)
  for (let a = 0; a < 4; a++) {
    const angle = rotation + (a * Math.PI) / 2;
    drawBolt(g, wx + Math.cos(angle) * 1.5, wy + Math.sin(angle) * 1.5, COL_IRON);
  }

  // Grease marks near hub
  circ(g, wx + 1.5, wy + 1, 0.5, COL_GREASE);
  circ(g, wx - 1, wy + 1.5, 0.4, COL_GREASE);

  // Iron tyre band rivets (4)
  for (let a = 0; a < 4; a++) {
    const angle = rotation * 0.5 + (a * Math.PI) / 2;
    drawBolt(g, wx + Math.cos(angle) * (r + 0.3), wy + Math.sin(angle) * (r + 0.3), COL_IRON_HI);
  }
}

// ---------------------------------------------------------------------------
// Operators — two crew members with helmets and tool belts
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, armAngle: number, tilt = 0, posX = CX + 32, facingLeft = true) {
  const opX = posX;
  const opBaseY = GY - 1;
  const bodyTilt = tilt * 0.25;
  const dir = facingLeft ? -1 : 1;

  // Legs
  line(g, opX - 2, opBaseY - 1, opX - 3 + bodyTilt, opBaseY - 12, COL_PANTS, 3);
  line(g, opX + 2, opBaseY - 1, opX + 3 + bodyTilt, opBaseY - 12, COL_PANTS, 3);

  // Boots — slightly better shape
  rect(g, opX - 5 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);
  rect(g, opX + 1 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);
  // Boot soles
  rect(g, opX - 5 + bodyTilt, opBaseY + 1, 5, 1, COL_WOOD_DK);
  rect(g, opX + 1 + bodyTilt, opBaseY + 1, 5, 1, COL_WOOD_DK);

  // Torso
  const tunicY = opBaseY - 24;
  rect(g, opX - 5 + bodyTilt, tunicY, 10, 13, COL_TUNIC);
  rect(g, opX - 4 + bodyTilt, tunicY + 1, 8, 11, COL_TUNIC_DK);
  // Tunic seam line
  line(g, opX + bodyTilt, tunicY + 2, opX + bodyTilt, tunicY + 11, COL_WOOD_DK, 0.5);

  // Belt with tool belt detail
  rect(g, opX - 5 + bodyTilt, tunicY + 10, 10, 2, COL_BELT);
  // Belt buckle
  rect(g, opX - 1 + bodyTilt, tunicY + 10, 2, 2, COL_IRON);
  // Hammer tool hanging from belt
  line(g, opX + 4 + bodyTilt, tunicY + 11, opX + 5 + bodyTilt, tunicY + 16, COL_TOOL, 1);
  rect(g, opX + 3.5 + bodyTilt, tunicY + 16, 3, 2, COL_IRON);
  // Pouch on belt
  rect(g, opX - 5 + bodyTilt, tunicY + 11, 3, 3, COL_LEATHER);

  // Arms reaching toward winch
  const shoulderY = tunicY + 2;
  const handX = facingLeft ? CX + 18 + Math.cos(armAngle) * 5 : opX + dir * 6 + Math.cos(armAngle) * 3;
  const handY = GY - 22 + tilt + Math.sin(armAngle) * 5;

  line(g, opX - 4 + bodyTilt, shoulderY, handX, handY, COL_TUNIC, 2.5);
  line(g, opX + 4 + bodyTilt, shoulderY, handX + 3, handY, COL_TUNIC, 2.5);
  circ(g, handX, handY, 2, COL_SKIN);
  circ(g, handX + 3, handY, 2, COL_SKIN);

  // Head
  const headY = tunicY - 5;
  circ(g, opX + bodyTilt, headY, 4.5, COL_SKIN);

  // Helmet instead of hair — iron pot helm
  // Helmet dome
  g.fill({ color: COL_HELMET });
  g.moveTo(opX - 4.5 + bodyTilt, headY);
  g.arc(opX + bodyTilt, headY - 1, 5, Math.PI, 0);
  g.lineTo(opX + 5 + bodyTilt, headY);
  g.fill();

  // Helmet rim
  rect(g, opX - 5.5 + bodyTilt, headY - 0.5, 11, 1.5, COL_HELMET);
  // Helmet highlight
  line(g, opX - 2 + bodyTilt, headY - 4, opX + 2 + bodyTilt, headY - 4, COL_HELMET_HI, 0.8);
  // Helmet nose guard
  rect(g, opX - 0.5 + bodyTilt, headY - 1, 1, 3, COL_HELMET);

  // Eyes (visible through helmet)
  if (bodyTilt < 3) {
    g.fill({ color: 0x222222 });
    g.circle(opX - 1.5 + bodyTilt * 0.3, headY + 0.5, 0.7);
    g.circle(opX + 1.5 + bodyTilt * 0.3, headY + 0.5, 0.7);
  }
}

/** Draw second operator on the other side */
function drawSecondOperator(g: Graphics, armAngle: number, tilt = 0) {
  drawOperator(g, armAngle + Math.PI * 0.3, tilt, CX - 32, false);
}

// ---------------------------------------------------------------------------
// Base frame — tall A-frame tower with plank detail, iron brackets, platforms
// ---------------------------------------------------------------------------

function drawBase(g: Graphics, tilt = 0, moveFrame = -1) {
  const baseY = GY - 4 + tilt;

  // Bottom platform beam — wide and thick, with plank detail
  drawPlank(g, CX - 38, baseY, 60, 5);
  // Nail heads along platform
  for (let nx = CX - 35; nx < CX + 20; nx += 8) {
    drawBolt(g, nx, baseY + 1);
    drawBolt(g, nx, baseY + 3);
  }

  // Secondary platform beam (depth) with plank detail
  drawPlank(g, CX - 36, baseY - 2, 56, 3);

  // Rust marks on platform
  circ(g, CX - 20, baseY + 1, 0.7, COL_IRON_RUST);
  circ(g, CX + 10, baseY + 2, 0.5, COL_IRON_RUST);

  // Wheels (4 large wheels with rotation tracking)
  const rot = moveFrame >= 0 ? (moveFrame / 8) * Math.PI * 2 : 0;
  for (const wx of [CX - 32, CX - 14, CX + 4, CX + 18]) {
    drawWheel(g, wx, baseY + 6, rot);
  }

  // Tall A-frame tower uprights with plank texture
  const pivotX = CX - 8;
  const topY = baseY - 50; // Very tall tower

  // Left upright — draw as tapered beam
  line(g, pivotX - 14, baseY, pivotX, topY, COL_WOOD_DK, 5);
  // Wood grain on left upright
  for (let t = 0.1; t < 0.9; t += 0.15) {
    const ux = pivotX - 14 + (pivotX - (pivotX - 14)) * t;
    const uy = baseY + (topY - baseY) * t;
    line(g, ux - 1, uy - 1, ux + 1, uy + 1, COL_WOOD_GRAIN, 0.4);
  }

  // Right upright
  line(g, pivotX + 14, baseY, pivotX, topY, COL_WOOD_DK, 5);
  // Wood grain on right upright
  for (let t = 0.1; t < 0.9; t += 0.15) {
    const ux = pivotX + 14 + (pivotX - (pivotX + 14)) * t;
    const uy = baseY + (topY - baseY) * t;
    line(g, ux - 1, uy - 1, ux + 1, uy + 1, COL_WOOD_GRAIN, 0.4);
  }

  // Cross braces (3 levels for tall tower)
  const braceY1 = baseY - 14;
  const braceY2 = baseY - 28;
  const braceY3 = baseY - 40;

  // Calculate upright X positions at brace heights (linear interpolation)
  const leftAtY1 = pivotX - 14 + (14 * (baseY - braceY1)) / (baseY - topY);
  const rightAtY1 = pivotX + 14 - (14 * (baseY - braceY1)) / (baseY - topY);
  const leftAtY2 = pivotX - 14 + (14 * (baseY - braceY2)) / (baseY - topY);
  const rightAtY2 = pivotX + 14 - (14 * (baseY - braceY2)) / (baseY - topY);
  const leftAtY3 = pivotX - 14 + (14 * (baseY - braceY3)) / (baseY - topY);
  const rightAtY3 = pivotX + 14 - (14 * (baseY - braceY3)) / (baseY - topY);

  // Cross brace planks
  drawPlank(g, leftAtY1, braceY1 - 1, rightAtY1 - leftAtY1, 2);
  drawPlank(g, leftAtY2, braceY2 - 1, rightAtY2 - leftAtY2, 2);
  drawPlank(g, leftAtY3, braceY3 - 1, rightAtY3 - leftAtY3, 1.5);

  // Iron bracket joints at each cross brace intersection
  drawIronBracket(g, leftAtY1 + 1, braceY1, 3);
  drawIronBracket(g, rightAtY1 - 1, braceY1, 3);
  drawIronBracket(g, leftAtY2 + 1, braceY2, 3);
  drawIronBracket(g, rightAtY2 - 1, braceY2, 3);
  drawIronBracket(g, leftAtY3 + 1, braceY3, 2.5);
  drawIronBracket(g, rightAtY3 - 1, braceY3, 2.5);

  // Diagonal braces with iron bolts
  line(g, leftAtY1, braceY1, rightAtY2, braceY2, COL_WOOD, 1.2);
  line(g, rightAtY1, braceY1, leftAtY2, braceY2, COL_WOOD, 1.2);
  line(g, leftAtY2, braceY2, rightAtY3, braceY3, COL_WOOD, 1);
  line(g, rightAtY2, braceY2, leftAtY3, braceY3, COL_WOOD, 1);

  // Iron bolts at diagonal brace midpoints
  const diagMidX1 = (leftAtY1 + rightAtY2) / 2;
  const diagMidY1 = (braceY1 + braceY2) / 2;
  drawBolt(g, diagMidX1, diagMidY1, COL_IRON);
  const diagMidX2 = (rightAtY1 + leftAtY2) / 2;
  drawBolt(g, diagMidX2, diagMidY1, COL_IRON);

  // Tower stage platforms (small ledges at brace levels)
  rect(g, leftAtY1 - 2, braceY1, rightAtY1 - leftAtY1 + 4, 1, COL_WOOD_LT);
  rect(g, leftAtY2 - 1, braceY2, rightAtY2 - leftAtY2 + 2, 1, COL_WOOD_LT);

  // Iron pivot joint at top
  circ(g, pivotX, topY, 4, COL_IRON_DK);
  circ(g, pivotX, topY, 2.5, COL_IRON);
  // Pivot highlight
  circ(g, pivotX - 1, topY - 1, 1, COL_IRON_HI);
  // Rust on pivot
  circ(g, pivotX + 2, topY + 1, 0.6, COL_IRON_RUST);

  // Side support struts from base to tower with bolts
  line(g, CX - 38, baseY, pivotX - 10, braceY2, COL_WOOD, 2);
  line(g, CX + 22, baseY, pivotX + 10, braceY2, COL_WOOD, 2);
  // Bolt at strut connections
  drawBolt(g, CX - 38, baseY);
  drawBolt(g, CX + 22, baseY);
  drawBolt(g, pivotX - 10, braceY2);
  drawBolt(g, pivotX + 10, braceY2);

  // Wood weathering — additional dark spots and streaks on frame
  for (let wy = braceY1; wy < baseY; wy += 10) {
    circ(g, pivotX - 12 + Math.sin(wy) * 2, wy, 0.5, COL_WOOD_DK);
  }
}

// ---------------------------------------------------------------------------
// Throwing arm — tapered beam with wood grain, iron band at pivot
// ---------------------------------------------------------------------------

function drawArm(g: Graphics, armAngle: number, tilt = 0) {
  const baseY = GY - 4 + tilt;
  const pivotX = CX - 8;
  const pivotY = baseY - 50;

  // Very long arm — characteristic of trebuchets
  const shortLen = 16; // counterweight side
  const longLen = 38; // sling/throwing side

  // Short end (counterweight side)
  const cwX = pivotX + Math.cos(armAngle) * shortLen;
  const cwY = pivotY + Math.sin(armAngle) * shortLen;

  // Long end (throwing side)
  const throwX = pivotX - Math.cos(armAngle) * longLen;
  const throwY = pivotY - Math.sin(armAngle) * longLen;

  // Calculate perpendicular direction for beam width tapering
  const dx = throwX - cwX;
  const dy = throwY - cwY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;

  // Tapered beam — thicker at pivot, thinner at ends
  const pivotHalf = 3.5; // half-width at pivot
  const cwHalf = 2.0;    // half-width at counterweight end
  const throwHalf = 1.5; // half-width at throwing end

  // Draw tapered beam as polygon
  // Interpolate from cw end through pivot to throw end
  const pivotT = shortLen / (shortLen + longLen); // parameter at pivot

  g.fill({ color: COL_WOOD });
  g.moveTo(cwX + nx * cwHalf, cwY + ny * cwHalf);
  g.lineTo(pivotX + nx * pivotHalf, pivotY + ny * pivotHalf);
  g.lineTo(throwX + nx * throwHalf, throwY + ny * throwHalf);
  g.lineTo(throwX - nx * throwHalf, throwY - ny * throwHalf);
  g.lineTo(pivotX - nx * pivotHalf, pivotY - ny * pivotHalf);
  g.lineTo(cwX - nx * cwHalf, cwY - ny * cwHalf);
  g.closePath();
  g.fill();

  // Dark edge on one side for depth
  g.stroke({ color: COL_WOOD_DK, width: 0.5 });
  g.moveTo(cwX - nx * cwHalf, cwY - ny * cwHalf);
  g.lineTo(pivotX - nx * pivotHalf, pivotY - ny * pivotHalf);
  g.lineTo(throwX - nx * throwHalf, throwY - ny * throwHalf);

  // Wood grain lines along the beam
  for (let t = 0.05; t < 1.0; t += 0.08) {
    const gx = cwX + dx * t;
    const gy = cwY + dy * t;
    // Interpolate half-width
    let hw: number;
    if (t < pivotT) {
      hw = cwHalf + (pivotHalf - cwHalf) * (t / pivotT);
    } else {
      hw = pivotHalf + (throwHalf - pivotHalf) * ((t - pivotT) / (1 - pivotT));
    }
    const grainOff = (hw * 0.5) * (Math.sin(t * 30) * 0.3 + 0.5);
    const gx1 = gx + nx * grainOff;
    const gy1 = gy + ny * grainOff;
    const segDx = dx / len * 3;
    const segDy = dy / len * 3;
    line(g, gx1, gy1, gx1 + segDx, gy1 + segDy, COL_WOOD_GRAIN, 0.4);
  }

  // Iron band at pivot point
  const bandW = 2;
  rect(g, pivotX - bandW / 2 - nx * pivotHalf, pivotY - bandW / 2 - ny * pivotHalf, 0, 0, COL_IRON);
  // Draw iron band as short cross-lines over the beam at pivot
  for (let b = -pivotHalf; b <= pivotHalf; b += 0.8) {
    line(g, pivotX + nx * b - dx / len, pivotY + ny * b - dy / len,
         pivotX + nx * b + dx / len, pivotY + ny * b + dy / len, COL_IRON, 0.6);
  }
  // Iron band border lines
  line(g, pivotX - nx * pivotHalf - dx / len * 1.2, pivotY - ny * pivotHalf - dy / len * 1.2,
       pivotX + nx * pivotHalf - dx / len * 1.2, pivotY + ny * pivotHalf - dy / len * 1.2, COL_IRON_DK, 0.8);
  line(g, pivotX - nx * pivotHalf + dx / len * 1.2, pivotY - ny * pivotHalf + dy / len * 1.2,
       pivotX + nx * pivotHalf + dx / len * 1.2, pivotY + ny * pivotHalf + dy / len * 1.2, COL_IRON_DK, 0.8);

  // Bolt heads on iron band
  drawBolt(g, pivotX + nx * (pivotHalf * 0.5), pivotY + ny * (pivotHalf * 0.5), COL_IRON_HI);
  drawBolt(g, pivotX - nx * (pivotHalf * 0.5), pivotY - ny * (pivotHalf * 0.5), COL_IRON_HI);

  return { throwX, throwY, cwX, cwY, pivotX, pivotY };
}

// ---------------------------------------------------------------------------
// Counterweight — hanging chain links, stone weights, swing motion
// ---------------------------------------------------------------------------

function drawCounterweight(g: Graphics, cwX: number, cwY: number, armAngle: number, swingPhase = 0) {
  // Counterweight swings with pendulum motion
  const swing = Math.sin(armAngle + swingPhase) * 3;
  const cwHangLen = 10;
  const cwHangX = cwX + swing;
  const cwHangY = cwY + cwHangLen;

  // Chain links from arm to counterweight (proper linked chain)
  const chainSteps = 4;
  for (let i = 0; i < chainSteps; i++) {
    const t = (i + 0.5) / chainSteps;
    const lx = cwX + (cwHangX - 3 - cwX) * t + swing * t * 0.3;
    const ly = cwY + (cwHangY - 4 - cwY) * t;
    drawChainLink(g, lx, ly, i % 2 === 0);
  }
  // Right chain
  for (let i = 0; i < chainSteps; i++) {
    const t = (i + 0.5) / chainSteps;
    const lx = cwX + (cwHangX + 3 - cwX) * t + swing * t * 0.3;
    const ly = cwY + (cwHangY - 4 - cwY) * t;
    drawChainLink(g, lx, ly, i % 2 === 0);
  }

  // Counterweight box — large and heavy looking
  const bx = cwHangX - 8;
  const by = cwHangY - 5;
  const bw = 16;
  const bh = 12;

  // Box outer (dark iron frame)
  rect(g, bx, by, bw, bh, COL_IRON_DK);
  // Box inner (lighter)
  rect(g, bx + 1, by + 1, bw - 2, bh - 2, COL_IRON);

  // Stone weights inside — visible stone texture
  for (let sy = by + 2; sy < by + bh - 2; sy += 3) {
    for (let sx = bx + 2; sx < bx + bw - 2; sx += 4) {
      // Individual stone blocks
      const sw = 3 + Math.sin(sx + sy) * 0.5;
      const sh = 2;
      rect(g, sx, sy, sw, sh, COL_STONE_TEX);
      // Stone texture — lighter edge
      line(g, sx, sy, sx + sw, sy, COL_BOULDER_LT, 0.3);
      // Dark mortar gap
      line(g, sx, sy + sh, sx + sw, sy + sh, COL_BOULDER_DK, 0.3);
    }
  }

  // Iron bands across the box
  line(g, bx, by + bh / 3, bx + bw, by + bh / 3, COL_IRON_DK, 1.2);
  line(g, bx, by + (bh * 2) / 3, bx + bw, by + (bh * 2) / 3, COL_IRON_DK, 1.2);

  // Iron band bolts
  drawBolt(g, bx + 1, by + bh / 3, COL_IRON_HI);
  drawBolt(g, bx + bw - 1, by + bh / 3, COL_IRON_HI);
  drawBolt(g, bx + 1, by + (bh * 2) / 3, COL_IRON_HI);
  drawBolt(g, bx + bw - 1, by + (bh * 2) / 3, COL_IRON_HI);

  // Rust marks on counterweight
  circ(g, bx + 3, by + bh - 2, 0.8, COL_IRON_RUST);
  circ(g, bx + bw - 4, by + 2, 0.6, COL_IRON_RUST);
}

// ---------------------------------------------------------------------------
// Sling — braided rope texture, leather pouch, physics-based swing
// ---------------------------------------------------------------------------

function drawSling(g: Graphics, throwX: number, throwY: number, armAngle: number, visible = true, swingPhase = 0) {
  if (!visible) return;

  // Sling hangs from the end of the arm — longer than catapult sling
  const slingLen = 14;
  // Physics-based swing: pendulum effect
  const pendulum = Math.sin(armAngle * 2 + swingPhase) * 5;
  const gravity = Math.cos(armAngle) * 2;

  const slingEndX = throwX + pendulum;
  const slingEndY = throwY + slingLen + gravity;

  // Two braided rope lines forming the sling
  // Braided texture — alternating bumps along the rope
  const ropeSteps = 6;
  for (let r = 0; r < 2; r++) {
    const ropeStartX = throwX + (r === 0 ? -2 : 2);
    const ropeEndX = slingEndX + (r === 0 ? -3 : 3);
    const ropeEndY = slingEndY - 2;

    for (let s = 0; s < ropeSteps; s++) {
      const t1 = s / ropeSteps;
      const t2 = (s + 1) / ropeSteps;
      const x1 = ropeStartX + (ropeEndX - ropeStartX) * t1;
      const y1 = throwY + (ropeEndY - throwY) * t1;
      const x2 = ropeStartX + (ropeEndX - ropeStartX) * t2;
      const y2 = throwY + (ropeEndY - throwY) * t2;
      // Alternate color for braid effect
      const col = s % 2 === 0 ? COL_ROPE : COL_ROPE_DK;
      line(g, x1, y1, x2, y2, col, 1.8);
      // Small bump perpendicular to rope
      const bump = (s % 2 === 0 ? 0.5 : -0.5);
      circ(g, (x1 + x2) / 2 + bump, (y1 + y2) / 2, 0.5, COL_ROPE_DK);
    }
  }

  // Leather pouch — more detailed
  const pouchX = slingEndX;
  const pouchY = slingEndY - 1;

  // Pouch shape — curved leather
  g.fill({ color: COL_LEATHER });
  g.moveTo(pouchX - 5, pouchY - 2);
  g.quadraticCurveTo(pouchX - 6, pouchY + 2, pouchX - 3, pouchY + 4);
  g.quadraticCurveTo(pouchX, pouchY + 5, pouchX + 3, pouchY + 4);
  g.quadraticCurveTo(pouchX + 6, pouchY + 2, pouchX + 5, pouchY - 2);
  g.fill();

  // Pouch stitching
  for (let st = -4; st <= 4; st += 2) {
    circ(g, pouchX + st, pouchY - 1.5, 0.3, COL_LEATHER_DK);
  }
  // Pouch darker center
  ellipse(g, pouchX, pouchY + 1.5, 3, 2, COL_LEATHER_DK);

  // Boulder in pouch
  drawBoulder(g, pouchX, pouchY + 3);
}

// ---------------------------------------------------------------------------
// Boulder — realistic with cracks, moss, 3D shading
// ---------------------------------------------------------------------------

function drawBoulder(g: Graphics, x: number, y: number) {
  const r = 5.5;

  // Shadow underneath
  ellipse(g, x + 1, y + 1, r, r * 0.9, COL_BOULDER_DK);

  // Main boulder body — slightly irregular
  circ(g, x, y, r, COL_BOULDER);

  // 3D shading — lighter top-left, darker bottom-right
  // Highlight arc (top-left quadrant)
  g.fill({ color: COL_BOULDER_LT });
  g.moveTo(x - 2, y - 1);
  g.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.7);
  g.lineTo(x - 1, y - 2);
  g.fill();

  // Core highlight spot
  circ(g, x - 1.5, y - 1.5, 1.8, COL_BOULDER_LT);
  circ(g, x - 1, y - 1, 0.8, 0xbbbbbb);

  // Shadow crescent (bottom-right)
  g.fill({ color: COL_BOULDER_DK });
  g.arc(x, y, r, -0.3, Math.PI * 0.6);
  g.arc(x + 0.5, y + 0.5, r * 0.7, Math.PI * 0.6, -0.3, true);
  g.fill();

  // Cracks — jagged lines across the surface
  g.stroke({ color: COL_BOULDER_CRACK, width: 0.6 });
  g.moveTo(x - 3, y - 1);
  g.lineTo(x - 1, y);
  g.lineTo(x + 1, y + 2);
  g.lineTo(x + 3, y + 1);

  g.stroke({ color: COL_BOULDER_CRACK, width: 0.5 });
  g.moveTo(x + 1, y - 2);
  g.lineTo(x, y - 0.5);
  g.lineTo(x - 1, y + 1);

  // Moss spots — small green patches
  circ(g, x + 2.5, y - 1, 1, COL_MOSS);
  circ(g, x - 1, y + 3, 0.8, COL_MOSS);
  circ(g, x + 3, y + 2, 0.6, COL_MOSS);

  // Surface texture — tiny dots for rough stone
  for (let d = 0; d < 5; d++) {
    const dx = Math.cos(d * 1.3) * r * 0.5;
    const dy = Math.sin(d * 1.7) * r * 0.5;
    circ(g, x + dx, y + dy, 0.3, COL_BOULDER_DK);
  }
}

// ---------------------------------------------------------------------------
// Winch — rope coiling on drum, handle grip, ratchet mechanism
// ---------------------------------------------------------------------------

function drawWinch(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 20;
  const wy = GY - 18 + tilt;

  // Winch frame — wooden posts
  drawPlank(g, wx - 6, wy - 6, 3, 12, true);
  drawPlank(g, wx + 3, wy - 6, 3, 12, true);

  // Cross beam
  drawPlank(g, wx - 6, wy - 7, 12, 2);

  // Drum (central cylinder)
  rect(g, wx - 3, wy - 3, 6, 6, COL_WOOD_DK);
  ellipse(g, wx, wy, 3.5, 3.5, COL_WOOD);
  // Drum end cap
  circ(g, wx, wy, 2, COL_IRON_DK);

  // Rope coiling on drum — concentric wraps
  for (let coil = 0; coil < 3; coil++) {
    const coilR = 2.8 + coil * 0.4;
    const coilAngle = angle + coil * 0.5;
    // Draw partial rope arcs
    g.stroke({ color: COL_ROPE, width: 0.8 });
    g.arc(wx, wy, coilR, coilAngle, coilAngle + Math.PI * 1.2);
    g.stroke({ color: COL_ROPE_DK, width: 0.5 });
    g.arc(wx, wy, coilR, coilAngle + Math.PI * 1.2, coilAngle + Math.PI * 1.8);
  }

  // Ratchet mechanism — gear teeth around drum edge
  for (let rt = 0; rt < 6; rt++) {
    const rAngle = (rt * Math.PI) / 3 + angle * 0.5;
    const rx = wx + Math.cos(rAngle) * 4;
    const ry = wy + Math.sin(rAngle) * 4;
    rect(g, rx - 0.5, ry - 0.5, 1, 1, COL_IRON);
  }
  // Ratchet pawl — small angled piece
  const pawlAngle = Math.floor(angle / (Math.PI / 3)) * (Math.PI / 3);
  const pawlX = wx + Math.cos(pawlAngle) * 5;
  const pawlY = wy + Math.sin(pawlAngle) * 5;
  line(g, wx + 5, wy - 4, pawlX, pawlY, COL_IRON, 1.2);
  circ(g, pawlX, pawlY, 0.8, COL_IRON_HI);

  // Crank handle — with grip detail
  const crankLen = 7;
  const hx = wx + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;

  // Handle shaft
  line(g, wx, wy, hx, hy, COL_IRON, 2);

  // Handle grip — wrapped leather
  const gripLen = 2.5;
  const gripDx = Math.cos(angle);
  const gripDy = Math.sin(angle);
  const gripStartX = hx - gripDx * gripLen;
  const gripStartY = hy - gripDy * gripLen;

  // Grip wrapping
  for (let gw = 0; gw < 4; gw++) {
    const t = gw / 4;
    const gx = gripStartX + (hx - gripStartX) * t;
    const gy = gripStartY + (hy - gripStartY) * t;
    circ(g, gx, gy, 1.5, gw % 2 === 0 ? COL_LEATHER : COL_LEATHER_DK);
  }

  // Handle knob
  circ(g, hx, hy, 2.2, COL_IRON_HI);
  circ(g, hx, hy, 1.5, COL_IRON);

  // Bolt through center
  drawBolt(g, wx, wy, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Dust effect for attack recoil
// ---------------------------------------------------------------------------

function drawDust(g: Graphics, intensity: number) {
  if (intensity <= 0) return;
  for (let d = 0; d < 6; d++) {
    const dx = CX - 20 + Math.sin(d * 2.3) * 25;
    const dy = GY - 2 + Math.cos(d * 1.7) * 3;
    const dr = 1 + intensity * (1 + Math.sin(d) * 0.5);
    circ(g, dx, dy, dr, COL_DUST);
  }
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const breathe = Math.sin(cycle * Math.PI * 2) * 0.5;
  const armAngle = 0.5 + breathe * 0.02;

  drawSecondOperator(g, cycle * Math.PI * 2 + 1);
  drawOperator(g, cycle * Math.PI * 2);
  drawWinch(g, cycle * Math.PI * 2);
  drawBase(g);
  const { throwX, throwY, cwX, cwY } = drawArm(g, armAngle);
  drawCounterweight(g, cwX, cwY, armAngle, cycle * Math.PI * 2);
  drawSling(g, throwX, throwY, armAngle, true, cycle * Math.PI * 2);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 1.5;
  const tilt = Math.sin(cycle * Math.PI * 2) * 0.4;
  const armAngle = 0.5;


  drawSecondOperator(g, cycle * Math.PI * 4 + 1, tilt + bounce);
  drawOperator(g, cycle * Math.PI * 4, tilt + bounce);
  drawWinch(g, cycle * Math.PI * 4, tilt + bounce);
  drawBase(g, tilt + bounce, frame);
  const { throwX, throwY, cwX, cwY } = drawArm(g, armAngle, tilt + bounce);
  // Counterweight swings more during movement
  drawCounterweight(g, cwX, cwY, armAngle, cycle * Math.PI * 3);
  // Sling has physics swing during movement
  drawSling(g, throwX, throwY, armAngle, true, cycle * Math.PI * 4);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  // Attack sequence: slow windup, dramatic release
  // frame 0-1: arm winding back (tensioning)
  // frame 2: arm starts swinging
  // frame 3: arm at peak release — boulder launches from sling
  // frame 4-5: arm follow-through, sling whips forward

  let armAngle: number;
  let boulderVisible = true;
  let recoil = 0;
  let dustIntensity = 0;
  let swingPhase = 0;

  if (frame < 2) {
    // Winding tension
    armAngle = 0.5 + frame * 0.12;
    swingPhase = frame * 0.3;
  } else if (frame === 2) {
    // Start swing
    armAngle = 0.15;
    recoil = 1;
    dustIntensity = 0.5;
    swingPhase = 1.5;
  } else if (frame === 3) {
    // Full swing — release point — counterweight swings dramatically
    armAngle = -0.7;
    boulderVisible = false;
    recoil = 3;
    dustIntensity = 2;
    swingPhase = 3;
  } else if (frame === 4) {
    // Follow-through — arm swings past vertical, sling whips forward
    armAngle = -1.1;
    boulderVisible = false;
    recoil = 4;
    dustIntensity = 2.5;
    swingPhase = 5;
  } else {
    // Recovery
    armAngle = -0.5;
    boulderVisible = false;
    recoil = 2;
    dustIntensity = 1;
    swingPhase = 4;
  }

  // Dust at base during recoil
  drawDust(g, dustIntensity);

  drawSecondOperator(g, frame * 0.7 + 1, recoil);
  drawOperator(g, frame * 0.7, recoil);
  drawWinch(g, frame * 0.7, recoil);
  drawBase(g, recoil);
  const { throwX, throwY, cwX, cwY } = drawArm(g, armAngle, recoil);
  // Counterweight swings dramatically during attack
  drawCounterweight(g, cwX, cwY, armAngle, swingPhase);
  drawSling(g, throwX, throwY, armAngle, boulderVisible, swingPhase);

  // Flying boulder during release frames
  if (frame === 3) {
    // Boulder just released — near top
    drawBoulder(g, throwX - 10, throwY - 12);
  } else if (frame === 4) {
    // Boulder flying away
    drawBoulder(g, throwX - 20, throwY - 25);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Cast uses a modified idle with winch activity
  drawShadow(g);

  const cycle = frame / 6;
  const armAngle = 0.5 + Math.sin(cycle * Math.PI * 2) * 0.04;
  const winchSpeed = cycle * Math.PI * 6; // faster winch cranking

  drawSecondOperator(g, winchSpeed + 1);
  drawOperator(g, winchSpeed);
  drawWinch(g, winchSpeed);
  drawBase(g);
  const { throwX, throwY, cwX, cwY } = drawArm(g, armAngle);
  drawCounterweight(g, cwX, cwY, armAngle, cycle * Math.PI * 2);
  drawSling(g, throwX, throwY, armAngle, true, cycle * Math.PI * 2);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;

  g.alpha = fade;

  const topple = progress * 20;
  const rad = (topple * Math.PI) / 180;
  const offsetY = progress * 14;
  const shatter = Math.sin(rad) * 14 * progress;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, shatter, offsetY);

  drawSecondOperator(g, 0);
  drawOperator(g, 0);
  drawBase(g);
  const armResult = drawArm(g, 0.5);
  drawCounterweight(g, armResult.cwX, armResult.cwY, 0.5, 0);
  drawWinch(g, 0);

  // Boulder tumbles off
  if (progress < 0.5) {
    const boulderDrop = progress * 14;
    drawBoulder(g, CX - 34, GY - 40 + boulderDrop);
  }

  // Debris particles
  if (progress > 0.3) {
    const debris = (progress - 0.3) * 10;
    for (let d = 0; d < 4; d++) {
      const dx = CX - 10 + Math.sin(d * 2 + progress * 5) * 20;
      const dy = GY - 30 + debris * d * 2;
      rect(g, dx, dy, 2, 1, COL_WOOD);
      circ(g, dx + 5, dy - 3, 0.8, COL_IRON);
    }
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

export function generateTrebuchetFrames(
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
