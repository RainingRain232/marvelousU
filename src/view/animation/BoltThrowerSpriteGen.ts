// Procedural sprite generator for the Bolt Thrower unit type.
//
// Draws a medieval ballista at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 6, DIE 7).
//
// Visual: heavy wooden crossbow mounted on a sturdy A-frame tripod with
// a windlass crank at the rear. No operator — the machine itself is the unit.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4; // ground line

// Palette
const COL_WOOD      = 0x7a5c3a;
const COL_WOOD_DK   = 0x4e3622;
const COL_WOOD_LT   = 0x9e7e56;
const COL_IRON      = 0x707070;
const COL_IRON_DK   = 0x4a4a4a;
const COL_IRON_HI   = 0x999999;
const COL_STRING     = 0xc8c098;
const COL_BOLT_SHAFT = 0xb89060;
const COL_BOLT_TIP   = 0x555555;
const COL_BOLT_FLETCH = 0x993333;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1) {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.fill({ color });
  g.rect(x, y, w, h);
}

function circ(g: Graphics, x: number, y: number, r: number, color: number) {
  g.fill({ color });
  g.circle(x, y, r);
}

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number) {
  g.fill({ color });
  g.ellipse(x, y, rx, ry);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ellipse(g, CX, GY, 16, 3, COL_SHADOW);
}

/** A-frame tripod: two front legs splay outward, one rear leg. */
function drawTripod(g: Graphics, tilt = 0) {
  const baseY = GY - 2;
  const topY = GY - 22 + tilt;
  const topX = CX - 2;

  // Front left leg
  line(g, topX, topY, CX - 14, baseY, COL_WOOD_DK, 3);
  // Front right leg
  line(g, topX, topY, CX + 6, baseY, COL_WOOD_DK, 3);
  // Rear support leg (angled back)
  line(g, topX, topY, CX + 16, baseY, COL_WOOD, 2.5);

  // Cross brace between front legs
  const braceY = topY + (baseY - topY) * 0.6;
  line(g, CX - 10, braceY, CX + 4, braceY, COL_WOOD_LT, 1.5);

  // Iron fittings at the top joint
  circ(g, topX, topY, 2.5, COL_IRON_DK);
  circ(g, topX, topY, 1.5, COL_IRON_HI);
}

/** The main stock — a thick horizontal beam the bolt rides along. */
function drawStock(g: Graphics, tilt = 0) {
  const sy = GY - 22 + tilt;
  const sx = CX - 22;
  const sw = 30;

  // Main stock beam
  rect(g, sx, sy - 2, sw, 4, COL_WOOD);
  // Top rail (guide groove)
  rect(g, sx, sy - 2, sw, 1.5, COL_WOOD_LT);
  // Metal cap at front
  rect(g, sx - 2, sy - 3, 3, 6, COL_IRON);
}

/** Prod (bow limbs) at the front of the stock — flexes based on drawPct. */
function drawProd(g: Graphics, drawPct: number, tilt = 0) {
  const px = CX - 22;
  const py = GY - 22 + tilt;
  const flex = drawPct * 4; // limbs bend back when drawn

  // Upper limb
  const topEndX = px - 8 + flex;
  const topEndY = py - 14;
  line(g, px, py - 1, topEndX, topEndY, COL_WOOD_DK, 3);
  // Limb tip
  circ(g, topEndX, topEndY, 1.5, COL_IRON);

  // Lower limb
  const botEndX = px - 8 + flex;
  const botEndY = py + 12;
  line(g, px, py + 1, botEndX, botEndY, COL_WOOD_DK, 3);
  // Limb tip
  circ(g, botEndX, botEndY, 1.5, COL_IRON);

  // Bowstring
  const stringPullX = px + drawPct * 12;
  line(g, topEndX, topEndY, stringPullX, py, COL_STRING, 1);
  line(g, botEndX, botEndY, stringPullX, py, COL_STRING, 1);
}

/** Windlass crank at the rear of the stock. */
function drawWindlass(g: Graphics, angle: number, tilt = 0) {
  const wx = CX + 10;
  const wy = GY - 22 + tilt;

  // Windlass drum
  rect(g, wx - 2, wy - 3, 5, 6, COL_WOOD_DK);

  // Crank handle
  const crankLen = 6;
  const hx = wx + 1 + Math.cos(angle) * crankLen;
  const hy = wy + Math.sin(angle) * crankLen;
  line(g, wx + 1, wy, hx, hy, COL_IRON, 1.5);
  circ(g, hx, hy, 1.5, COL_IRON_HI);
}

/** Bolt projectile sitting in the stock groove. */
function drawBolt(g: Graphics, drawPct: number, tilt = 0, visible = true) {
  if (!visible) return;

  const sy = GY - 22 + tilt;
  const boltStart = CX - 22 + drawPct * 12; // retracts with string
  const boltEnd = boltStart - 16;

  // Shaft
  line(g, boltEnd, sy, boltStart, sy, COL_BOLT_SHAFT, 2);
  // Iron tip (arrowhead)
  line(g, boltEnd - 3, sy - 2, boltEnd, sy, COL_BOLT_TIP, 1.5);
  line(g, boltEnd - 3, sy + 2, boltEnd, sy, COL_BOLT_TIP, 1.5);
  // Fletching
  line(g, boltStart, sy - 2, boltStart + 3, sy, COL_BOLT_FLETCH, 1);
  line(g, boltStart, sy + 2, boltStart + 3, sy, COL_BOLT_FLETCH, 1);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  // Gentle sway — windlass crank rotates slowly
  const crankAngle = cycle * Math.PI * 2;
  const drawPct = 0.3 + Math.sin(cycle * Math.PI * 2) * 0.05;

  drawTripod(g);
  drawStock(g);
  drawProd(g, drawPct);
  drawBolt(g, drawPct);
  drawWindlass(g, crankAngle);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  // Bounce as it's carried/pushed forward
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 2;
  const tilt = Math.sin(cycle * Math.PI * 2) * 1;

  drawTripod(g, tilt + bounce);
  drawStock(g, tilt + bounce);
  drawProd(g, 0.3, tilt + bounce);
  drawBolt(g, 0.3, tilt + bounce);
  drawWindlass(g, cycle * Math.PI * 4, tilt + bounce);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  let drawPct = 0;
  let boltVisible = true;

  if (frame < 2) {
    // Winding — string pulls back
    drawPct = 0.3 + ((frame + 1) / 2) * 0.5;
  } else if (frame < 4) {
    // Fully drawn, about to fire
    drawPct = 0.8;
  } else {
    // Release — string snaps forward
    drawPct = 0.8 - (frame - 3) * 0.4;
    if (drawPct < 0) drawPct = 0;
    boltVisible = false;
  }

  // Recoil tilt on release
  const recoilTilt = frame >= 4 ? (frame - 3) * 1.5 : 0;

  drawTripod(g, recoilTilt);
  drawStock(g, recoilTilt);
  drawProd(g, drawPct, recoilTilt);
  drawBolt(g, drawPct, recoilTilt, boltVisible);
  drawWindlass(g, frame * 0.8, recoilTilt);
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;

  g.alpha = fade;

  // Topple sideways
  const topple = progress * 25;
  const rad = (topple * Math.PI) / 180;
  const offsetY = progress * 12;
  const shatter = Math.sin(rad) * 8 * progress;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, shatter, offsetY);
  drawTripod(g);
  drawStock(g);
  drawProd(g, 0);
  drawWindlass(g, 0);

  // Bolt falls loose
  if (progress < 0.5) {
    const boltDrop = progress * 6;
    drawBolt(g, 0, boltDrop, true);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,   count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,    count: 7 },
};

export function generateBoltThrowerFrames(
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
