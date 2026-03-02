// Procedural sprite generator for the Siege Catapult unit type.
//
// A larger version of the regular catapult. 2 tiles wide × 1 tile tall.
// Draws at 96×48 pixels per frame (2× width of normal catapult).
// Reuses the same visual style but everything is scaled up.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96; // frame width (2 tiles)
const FH = 48; // frame height (1 tile)
const CX = FW / 2;
const GY = FH - 4; // ground line

// Palette (same as catapult)
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
// Shadow (wider for siege catapult)
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 34, 4, COL_SHADOW);
}

// ---------------------------------------------------------------------------
// Operator (stands on right/back side, slightly larger)
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, armAngle: number, tilt = 0) {
  const opX = CX + 28;
  const opBaseY = GY - 1;
  const bodyTilt = tilt * 0.3;

  // Legs
  line(g, opX - 2, opBaseY - 1, opX - 3 + bodyTilt, opBaseY - 11, COL_PANTS, 3);
  line(g, opX + 2, opBaseY - 1, opX + 3 + bodyTilt, opBaseY - 11, COL_PANTS, 3);

  // Boots
  rect(g, opX - 5 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);
  rect(g, opX + 1 + bodyTilt, opBaseY - 2, 4, 3, COL_BOOTS);

  // Torso (tunic)
  const tunicY = opBaseY - 22;
  rect(g, opX - 5 + bodyTilt, tunicY, 10, 12, COL_TUNIC);
  rect(g, opX - 4 + bodyTilt, tunicY + 1, 8, 10, COL_TUNIC_DK);

  // Belt
  rect(g, opX - 5 + bodyTilt, tunicY + 9, 10, 2, COL_BELT);

  // Arms reaching toward winch
  const shoulderY = tunicY + 2;
  const handX = CX + 14 + Math.cos(armAngle) * 4;
  const handY = GY - 20 + tilt + Math.sin(armAngle) * 4;

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
// Catapult base frame (larger)
// ---------------------------------------------------------------------------

function drawBase(g: Graphics, tilt = 0) {
  const baseY = GY - 3 + tilt;

  // Bottom beam (horizontal) — wider
  rect(g, CX - 32, baseY, 50, 4, COL_WOOD_DK);

  // Wheels (larger, 3 wheels for stability)
  circ(g, CX - 26, baseY + 4, 5.5, COL_WOOD);
  circ(g, CX - 26, baseY + 4, 3.5, COL_WOOD_DK);
  circ(g, CX - 4, baseY + 4, 5.5, COL_WOOD);
  circ(g, CX - 4, baseY + 4, 3.5, COL_WOOD_DK);
  circ(g, CX + 14, baseY + 4, 5.5, COL_WOOD);
  circ(g, CX + 14, baseY + 4, 3.5, COL_WOOD_DK);

  // Wheel spokes
  for (const wx of [CX - 26, CX - 4, CX + 14]) {
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      const cos = Math.cos(angle) * 4;
      const sin = Math.sin(angle) * 4;
      line(g, wx, baseY + 4, wx + cos, baseY + 4 + sin, COL_WOOD_LT, 0.7);
    }
  }

  // Upright supports (A-frame) — taller and thicker
  const topY = baseY - 24;
  const pivotX = CX - 6;

  // Left upright
  line(g, pivotX - 10, baseY, pivotX, topY, COL_WOOD_DK, 4);
  // Right upright
  line(g, pivotX + 10, baseY, pivotX, topY, COL_WOOD_DK, 4);

  // Cross brace
  const braceY = baseY - 13;
  line(g, pivotX - 7, braceY, pivotX + 7, braceY, COL_WOOD_LT, 2);

  // Second cross brace (extra reinforcement for siege version)
  const braceY2 = baseY - 7;
  line(g, pivotX - 9, braceY2, pivotX + 9, braceY2, COL_WOOD_LT, 1.5);

  // Iron pivot joint at top
  circ(g, pivotX, topY, 3.5, COL_IRON_DK);
  circ(g, pivotX, topY, 2, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Throwing arm (longer)
// ---------------------------------------------------------------------------

function drawArm(g: Graphics, armAngle: number, tilt = 0) {
  const baseY = GY - 3 + tilt;
  const pivotX = CX - 6;
  const pivotY = baseY - 24;

  // Arm lengths: longer than regular catapult
  const shortLen = 12; // counterweight side
  const longLen = 28; // sling/throwing side

  // Short end (counterweight side)
  const cwX = pivotX + Math.cos(armAngle) * shortLen;
  const cwY = pivotY + Math.sin(armAngle) * shortLen;

  // Long end (throwing side)
  const throwX = pivotX - Math.cos(armAngle) * longLen;
  const throwY = pivotY - Math.sin(armAngle) * longLen;

  // Draw the arm beam (thicker)
  line(g, cwX, cwY, throwX, throwY, COL_WOOD, 4);

  // Counterweight (larger hanging box)
  const cwHangY = cwY + 6;
  rect(g, cwX - 5, cwHangY - 3, 10, 7, COL_IRON_DK);
  rect(g, cwX - 4, cwHangY - 2, 8, 5, COL_IRON);
  // Rope connecting counterweight
  line(g, cwX, cwY, cwX, cwHangY - 3, COL_ROPE, 1.5);

  return { throwX, throwY };
}

// ---------------------------------------------------------------------------
// Boulder in sling (larger)
// ---------------------------------------------------------------------------

function drawBoulder(g: Graphics, x: number, y: number, visible = true) {
  if (!visible) return;

  // Sling ropes
  line(g, x, y - 4, x - 3, y + 1, COL_ROPE, 1.5);
  line(g, x, y - 4, x + 3, y + 1, COL_ROPE, 1.5);

  // Boulder (bigger)
  circ(g, x, y + 4, 5, COL_BOULDER_DK);
  circ(g, x, y + 3.5, 4.5, COL_BOULDER);

  // Highlight
  circ(g, x - 1.5, y + 2, 1.5, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Winch at the back (larger)
// ---------------------------------------------------------------------------

function drawWinch(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 16;
  const wy = GY - 15 + tilt;

  // Winch drum
  rect(g, wx - 3, wy - 3, 6, 6, COL_WOOD_DK);
  circ(g, wx, wy, 3, COL_IRON_DK);

  // Crank handle
  const crankLen = 6;
  const hx = wx + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;
  line(g, wx, wy, hx, hy, COL_IRON, 2);
  circ(g, hx, hy, 1.5, COL_IRON_HI);
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
  drawBase(g);
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
  drawBase(g, tilt + bounce);
  const { throwX, throwY } = drawArm(g, armAngle, tilt + bounce);
  drawBoulder(g, throwX, throwY);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  let armAngle: number;
  let boulderVisible = true;
  let recoil = 0;

  if (frame < 2) {
    armAngle = 0.4 + frame * 0.1;
  } else if (frame === 2) {
    armAngle = 0.1;
  } else if (frame === 3) {
    armAngle = -0.8;
    boulderVisible = false;
    recoil = 1.5;
  } else if (frame === 4) {
    armAngle = -1.2;
    boulderVisible = false;
    recoil = 3;
  } else {
    armAngle = -0.6;
    boulderVisible = false;
    recoil = 1.5;
  }

  drawOperator(g, frame * 0.8, recoil);
  drawWinch(g, frame * 0.8, recoil);
  drawBase(g, recoil);
  const { throwX, throwY } = drawArm(g, armAngle, recoil);
  drawBoulder(g, throwX, throwY, boulderVisible);
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
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
  drawBase(g);
  drawArm(g, 0.4);
  drawWinch(g, 0);

  // Boulder falls off
  if (progress < 0.4) {
    const boulderDrop = progress * 10;
    circ(g, CX - 28, GY - 22 + boulderDrop, 4.5, COL_BOULDER);
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
