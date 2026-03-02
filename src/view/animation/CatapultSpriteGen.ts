// Procedural sprite generator for the Catapult unit type.
//
// Draws a medieval trebuchet/catapult at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 6, CAST 6, DIE 7).
//
// Visual: side-view catapult with a wooden frame, long throwing arm,
// counterweight, and a sling holding a boulder. An operator stands
// behind (right side) cranking the winch.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4; // ground line

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
// Shadow
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 18, 3, COL_SHADOW);
}

// ---------------------------------------------------------------------------
// Operator (stands on right/back side, operating the winch)
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, armAngle: number, tilt = 0) {
  const opX = CX + 16;
  const opBaseY = GY - 1;
  const bodyTilt = tilt * 0.3;

  // Legs
  line(g, opX - 2, opBaseY - 1, opX - 3 + bodyTilt, opBaseY - 9, COL_PANTS, 2.5);
  line(g, opX + 2, opBaseY - 1, opX + 3 + bodyTilt, opBaseY - 9, COL_PANTS, 2.5);

  // Boots
  rect(g, opX - 4 + bodyTilt, opBaseY - 2, 3, 2, COL_BOOTS);
  rect(g, opX + 1 + bodyTilt, opBaseY - 2, 3, 2, COL_BOOTS);

  // Torso (tunic)
  const tunicY = opBaseY - 18;
  rect(g, opX - 4 + bodyTilt, tunicY, 8, 10, COL_TUNIC);
  rect(g, opX - 3 + bodyTilt, tunicY + 1, 6, 8, COL_TUNIC_DK);

  // Belt
  rect(g, opX - 4 + bodyTilt, tunicY + 7, 8, 2, COL_BELT);

  // Arms reaching toward winch
  const shoulderY = tunicY + 2;
  const handX = CX + 8 + Math.cos(armAngle) * 3;
  const handY = GY - 16 + tilt + Math.sin(armAngle) * 3;

  line(g, opX - 3 + bodyTilt, shoulderY, handX, handY, COL_TUNIC, 2);
  line(g, opX + 3 + bodyTilt, shoulderY, handX + 2, handY, COL_TUNIC, 2);
  circ(g, handX, handY, 1.5, COL_SKIN);
  circ(g, handX + 2, handY, 1.5, COL_SKIN);

  // Head
  const headY = tunicY - 4;
  circ(g, opX + bodyTilt, headY, 3.5, COL_SKIN);
  ellipse(g, opX + bodyTilt, headY - 2, 3.5, 2.5, COL_HAIR);

  // Eyes
  if (bodyTilt < 3) {
    g.fill({ color: 0x222222 });
    g.circle(opX - 1 + bodyTilt * 0.3, headY, 0.5);
    g.circle(opX + 1 + bodyTilt * 0.3, headY, 0.5);
  }
}

// ---------------------------------------------------------------------------
// Catapult base frame
// ---------------------------------------------------------------------------

function drawBase(g: Graphics, tilt = 0) {
  const baseY = GY - 3 + tilt;

  // Bottom beam (horizontal)
  rect(g, CX - 18, baseY, 28, 3, COL_WOOD_DK);

  // Wheels
  circ(g, CX - 14, baseY + 3, 4, COL_WOOD);
  circ(g, CX - 14, baseY + 3, 2.5, COL_WOOD_DK);
  circ(g, CX + 6, baseY + 3, 4, COL_WOOD);
  circ(g, CX + 6, baseY + 3, 2.5, COL_WOOD_DK);

  // Wheel spokes
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2;
    const cos = Math.cos(angle) * 3;
    const sin = Math.sin(angle) * 3;
    line(g, CX - 14, baseY + 3, CX - 14 + cos, baseY + 3 + sin, COL_WOOD_LT, 0.5);
    line(g, CX + 6, baseY + 3, CX + 6 + cos, baseY + 3 + sin, COL_WOOD_LT, 0.5);
  }

  // Upright supports (A-frame)
  const topY = baseY - 18;
  const pivotX = CX - 4;

  // Left upright
  line(g, pivotX - 6, baseY, pivotX, topY, COL_WOOD_DK, 3);
  // Right upright
  line(g, pivotX + 6, baseY, pivotX, topY, COL_WOOD_DK, 3);

  // Cross brace
  const braceY = baseY - 10;
  line(g, pivotX - 4, braceY, pivotX + 4, braceY, COL_WOOD_LT, 1.5);

  // Iron pivot joint at top
  circ(g, pivotX, topY, 2.5, COL_IRON_DK);
  circ(g, pivotX, topY, 1.5, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Throwing arm
// ---------------------------------------------------------------------------

/** Arm angle: 0 = cocked (arm tip pointing right/down), PI = fired (arm tip pointing left/up) */
function drawArm(g: Graphics, armAngle: number, tilt = 0) {
  const baseY = GY - 3 + tilt;
  const pivotX = CX - 4;
  const pivotY = baseY - 18;

  // Arm lengths: short end (counterweight) vs long end (sling)
  const shortLen = 8; // counterweight side (right)
  const longLen = 18; // sling/throwing side (left)

  // Short end (counterweight side) — goes opposite to throwing direction
  const cwX = pivotX + Math.cos(armAngle) * shortLen;
  const cwY = pivotY + Math.sin(armAngle) * shortLen;

  // Long end (throwing side) — opposite direction
  const throwX = pivotX - Math.cos(armAngle) * longLen;
  const throwY = pivotY - Math.sin(armAngle) * longLen;

  // Draw the arm beam
  line(g, cwX, cwY, throwX, throwY, COL_WOOD, 3);

  // Counterweight (hanging box)
  const cwHangY = cwY + 4;
  rect(g, cwX - 3, cwHangY - 2, 6, 5, COL_IRON_DK);
  rect(g, cwX - 2, cwHangY - 1, 4, 3, COL_IRON);
  // Rope connecting counterweight
  line(g, cwX, cwY, cwX, cwHangY - 2, COL_ROPE, 1);

  return { throwX, throwY };
}

// ---------------------------------------------------------------------------
// Boulder in sling
// ---------------------------------------------------------------------------

function drawBoulder(g: Graphics, x: number, y: number, visible = true) {
  if (!visible) return;

  // Sling ropes
  line(g, x, y - 3, x - 2, y + 1, COL_ROPE, 1);
  line(g, x, y - 3, x + 2, y + 1, COL_ROPE, 1);

  // Boulder
  circ(g, x, y + 3, 3.5, COL_BOULDER_DK);
  circ(g, x, y + 2.5, 3, COL_BOULDER);

  // Highlight
  circ(g, x - 1, y + 1.5, 1, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Winch at the back
// ---------------------------------------------------------------------------

function drawWinch(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 10;
  const wy = GY - 12 + tilt;

  // Winch drum
  rect(g, wx - 2, wy - 2, 4, 4, COL_WOOD_DK);
  circ(g, wx, wy, 2, COL_IRON_DK);

  // Crank handle
  const crankLen = 4;
  const hx = wx + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;
  line(g, wx, wy, hx, hy, COL_IRON, 1.5);
  circ(g, hx, hy, 1, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const breathe = Math.sin(cycle * Math.PI * 2) * 0.5;
  // Arm is in cocked position (angled ~30 degrees from horizontal, tip to the right/down)
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

  // Attack sequence:
  // frame 0-1: arm is winding back (cocked position)
  // frame 2: arm starts swinging forward
  // frame 3: arm at peak release — boulder launches
  // frame 4-5: arm follow-through, no boulder

  let armAngle: number;
  let boulderVisible = true;
  let recoil = 0;

  if (frame < 2) {
    // Winding tension
    armAngle = 0.4 + frame * 0.1;
  } else if (frame === 2) {
    // Start swing
    armAngle = 0.1;
  } else if (frame === 3) {
    // Full swing — release point
    armAngle = -0.8;
    boulderVisible = false;
    recoil = 1;
  } else if (frame === 4) {
    // Follow-through
    armAngle = -1.2;
    boulderVisible = false;
    recoil = 2;
  } else {
    // Recovery
    armAngle = -0.6;
    boulderVisible = false;
    recoil = 1;
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
  const shatter = Math.sin(rad) * 8 * progress;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, shatter, offsetY);
  drawOperator(g, 0);
  drawBase(g);
  drawArm(g, 0.4);
  drawWinch(g, 0);

  // Boulder falls off
  if (progress < 0.4) {
    const boulderDrop = progress * 8;
    circ(g, CX - 16, GY - 18 + boulderDrop, 3, COL_BOULDER);
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

export function generateCatapultFrames(
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
