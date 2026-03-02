// Procedural sprite generator for the Trebuchet unit type.
//
// A massive medieval trebuchet at 96×96 pixels per frame (2 tiles wide × 2 tiles tall).
// Features a tall A-frame tower, very long throwing arm with heavy counterweight,
// sling with boulder, and an operator at the winch.

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
const COL_IRON = 0x707070;
const COL_IRON_DK = 0x4a4a4a;
const COL_IRON_HI = 0x999999;
const COL_ROPE = 0xb8a880;
const COL_BOULDER = 0x888888;
const COL_BOULDER_DK = 0x666666;
const COL_SHADOW = 0x000000;

// Operator palette
const COL_SKIN = 0xe8b89d;
const COL_HAIR = 0x4a3728;
const COL_TUNIC = 0x7a4a2a;
const COL_TUNIC_DK = 0x5a3a1a;
const COL_PANTS = 0x5c4033;
const COL_BOOTS = 0x3d2914;
const COL_BELT = 0x2a1a0a;

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
// Shadow (large)
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 40, 5, COL_SHADOW);
}

// ---------------------------------------------------------------------------
// Operator
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, armAngle: number, tilt = 0) {
  const opX = CX + 32;
  const opBaseY = GY - 1;
  const bodyTilt = tilt * 0.25;

  // Legs
  line(g, opX - 2, opBaseY - 1, opX - 3 + bodyTilt, opBaseY - 12, COL_PANTS, 3);
  line(g, opX + 2, opBaseY - 1, opX + 3 + bodyTilt, opBaseY - 12, COL_PANTS, 3);

  // Boots
  rect(g, opX - 5 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);
  rect(g, opX + 1 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);

  // Torso
  const tunicY = opBaseY - 24;
  rect(g, opX - 5 + bodyTilt, tunicY, 10, 13, COL_TUNIC);
  rect(g, opX - 4 + bodyTilt, tunicY + 1, 8, 11, COL_TUNIC_DK);

  // Belt
  rect(g, opX - 5 + bodyTilt, tunicY + 10, 10, 2, COL_BELT);

  // Arms reaching toward winch
  const shoulderY = tunicY + 2;
  const handX = CX + 18 + Math.cos(armAngle) * 5;
  const handY = GY - 22 + tilt + Math.sin(armAngle) * 5;

  line(g, opX - 4 + bodyTilt, shoulderY, handX, handY, COL_TUNIC, 2.5);
  line(g, opX + 4 + bodyTilt, shoulderY, handX + 3, handY, COL_TUNIC, 2.5);
  circ(g, handX, handY, 2, COL_SKIN);
  circ(g, handX + 3, handY, 2, COL_SKIN);

  // Head
  const headY = tunicY - 5;
  circ(g, opX + bodyTilt, headY, 4.5, COL_SKIN);
  ellipse(g, opX + bodyTilt, headY - 2.5, 4.5, 3, COL_HAIR);

  // Eyes
  if (bodyTilt < 3) {
    g.fill({ color: 0x222222 });
    g.circle(opX - 1.5 + bodyTilt * 0.3, headY, 0.7);
    g.circle(opX + 1.5 + bodyTilt * 0.3, headY, 0.7);
  }
}

// ---------------------------------------------------------------------------
// Base frame — tall A-frame tower structure
// ---------------------------------------------------------------------------

function drawBase(g: Graphics, tilt = 0) {
  const baseY = GY - 4 + tilt;

  // Bottom platform beam — wide and thick
  rect(g, CX - 38, baseY, 60, 5, COL_WOOD_DK);

  // Secondary platform beam (depth)
  rect(g, CX - 36, baseY - 2, 56, 3, COL_WOOD);

  // Wheels (4 large wheels)
  for (const wx of [CX - 32, CX - 14, CX + 4, CX + 18]) {
    circ(g, wx, baseY + 6, 6, COL_WOOD);
    circ(g, wx, baseY + 6, 4, COL_WOOD_DK);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      line(g, wx, baseY + 6, wx + Math.cos(angle) * 5, baseY + 6 + Math.sin(angle) * 5, COL_WOOD_LT, 0.7);
    }
  }

  // Tall A-frame tower uprights
  const pivotX = CX - 8;
  const topY = baseY - 50; // Very tall tower

  // Left upright
  line(g, pivotX - 14, baseY, pivotX, topY, COL_WOOD_DK, 5);
  // Right upright
  line(g, pivotX + 14, baseY, pivotX, topY, COL_WOOD_DK, 5);

  // Cross braces (3 levels for tall tower)
  const braceY1 = baseY - 14;
  const braceY2 = baseY - 28;
  const braceY3 = baseY - 40;
  line(g, pivotX - 11, braceY1, pivotX + 11, braceY1, COL_WOOD_LT, 2);
  line(g, pivotX - 8, braceY2, pivotX + 8, braceY2, COL_WOOD_LT, 2);
  line(g, pivotX - 5, braceY3, pivotX + 5, braceY3, COL_WOOD_LT, 1.5);

  // Diagonal braces for extra structural detail
  line(g, pivotX - 11, braceY1, pivotX + 8, braceY2, COL_WOOD, 1);
  line(g, pivotX + 11, braceY1, pivotX - 8, braceY2, COL_WOOD, 1);

  // Iron pivot joint at top
  circ(g, pivotX, topY, 4, COL_IRON_DK);
  circ(g, pivotX, topY, 2.5, COL_IRON_HI);

  // Side support struts from base to tower
  line(g, CX - 38, baseY, pivotX - 10, braceY2, COL_WOOD, 2);
  line(g, CX + 22, baseY, pivotX + 10, braceY2, COL_WOOD, 2);
}

// ---------------------------------------------------------------------------
// Throwing arm (very long)
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

  // Draw the arm beam (thick)
  line(g, cwX, cwY, throwX, throwY, COL_WOOD, 5);

  // Large counterweight box (heavy, hanging on chains)
  const cwHangLen = 10;
  const cwHangX = cwX;
  const cwHangY = cwY + cwHangLen;

  // Chain/rope to counterweight
  line(g, cwX, cwY, cwHangX - 2, cwHangY - 4, COL_IRON, 1.5);
  line(g, cwX, cwY, cwHangX + 2, cwHangY - 4, COL_IRON, 1.5);

  // Counterweight box — large and heavy looking
  rect(g, cwHangX - 7, cwHangY - 4, 14, 10, COL_IRON_DK);
  rect(g, cwHangX - 6, cwHangY - 3, 12, 8, COL_IRON);
  // Iron bands
  line(g, cwHangX - 7, cwHangY, cwHangX + 7, cwHangY, COL_IRON_DK, 1.5);

  return { throwX, throwY };
}

// ---------------------------------------------------------------------------
// Sling and boulder
// ---------------------------------------------------------------------------

function drawSling(g: Graphics, throwX: number, throwY: number, armAngle: number, visible = true) {
  if (!visible) return;

  // Sling hangs from the end of the arm — longer than catapult sling
  const slingLen = 14;
  // Sling swings slightly based on arm angle
  const swingOffset = Math.sin(armAngle) * 4;

  const slingEndX = throwX + swingOffset;
  const slingEndY = throwY + slingLen;

  // Two rope lines forming the sling
  line(g, throwX - 2, throwY, slingEndX - 3, slingEndY - 2, COL_ROPE, 1.5);
  line(g, throwX + 2, throwY, slingEndX + 3, slingEndY - 2, COL_ROPE, 1.5);

  // Sling pouch (small arc between rope ends)
  line(g, slingEndX - 3, slingEndY - 2, slingEndX, slingEndY, COL_ROPE, 2);
  line(g, slingEndX + 3, slingEndY - 2, slingEndX, slingEndY, COL_ROPE, 2);

  // Boulder in sling (large)
  circ(g, slingEndX, slingEndY + 3, 6, COL_BOULDER_DK);
  circ(g, slingEndX, slingEndY + 2, 5.5, COL_BOULDER);
  circ(g, slingEndX - 2, slingEndY, 2, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Winch mechanism (larger)
// ---------------------------------------------------------------------------

function drawWinch(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 20;
  const wy = GY - 18 + tilt;

  // Winch frame
  rect(g, wx - 4, wy - 4, 8, 8, COL_WOOD_DK);
  circ(g, wx, wy, 3.5, COL_IRON_DK);
  circ(g, wx, wy, 2, COL_IRON);

  // Crank handle
  const crankLen = 7;
  const hx = wx + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;
  line(g, wx, wy, hx, hy, COL_IRON, 2);
  circ(g, hx, hy, 2, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const breathe = Math.sin(cycle * Math.PI * 2) * 0.5;
  const armAngle = 0.5 + breathe * 0.02;

  drawOperator(g, cycle * Math.PI * 2);
  drawWinch(g, cycle * Math.PI * 2);
  drawBase(g);
  const { throwX, throwY } = drawArm(g, armAngle);
  drawSling(g, throwX, throwY, armAngle);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 1.5;
  const tilt = Math.sin(cycle * Math.PI * 2) * 0.4;
  const armAngle = 0.5;

  drawOperator(g, cycle * Math.PI * 4, tilt + bounce);
  drawWinch(g, cycle * Math.PI * 4, tilt + bounce);
  drawBase(g, tilt + bounce);
  const { throwX, throwY } = drawArm(g, armAngle, tilt + bounce);
  drawSling(g, throwX, throwY, armAngle);
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

  if (frame < 2) {
    // Winding tension
    armAngle = 0.5 + frame * 0.12;
  } else if (frame === 2) {
    // Start swing
    armAngle = 0.15;
  } else if (frame === 3) {
    // Full swing — release point
    armAngle = -0.7;
    boulderVisible = false;
    recoil = 2;
  } else if (frame === 4) {
    // Follow-through — arm swings past vertical
    armAngle = -1.1;
    boulderVisible = false;
    recoil = 3;
  } else {
    // Recovery
    armAngle = -0.5;
    boulderVisible = false;
    recoil = 1.5;
  }

  drawOperator(g, frame * 0.7, recoil);
  drawWinch(g, frame * 0.7, recoil);
  drawBase(g, recoil);
  const { throwX, throwY } = drawArm(g, armAngle, recoil);
  drawSling(g, throwX, throwY, armAngle, boulderVisible);
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
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
  drawOperator(g, 0);
  drawBase(g);
  drawArm(g, 0.5);
  drawWinch(g, 0);

  // Boulder tumbles off
  if (progress < 0.5) {
    const boulderDrop = progress * 14;
    circ(g, CX - 34, GY - 40 + boulderDrop, 5, COL_BOULDER);
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
