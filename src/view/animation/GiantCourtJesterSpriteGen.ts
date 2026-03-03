// Procedural sprite generator for the Giant Court Jester.
//
// 48×48 pixel frames. A large, rotund jester with bells and motley.
// Visual size 2w×3h applied via UnitDefinitions size property.
// States: IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — vibrant motley jester colors
const COL_SKIN = 0xeeccaa;
const COL_LEFT = 0xdd3333; // left half of motley
const COL_LEFT_DK = 0xaa2222;
const COL_RIGHT = 0x3333dd; // right half of motley
const COL_RIGHT_DK = 0x2222aa;
const COL_YELLOW = 0xffcc00; // accents
const COL_YELLOW_DK = 0xcc9900;
const COL_BELL = 0xffdd44;
const COL_BELL_DK = 0xccaa22;
const COL_SHOE = 0x882288;
const COL_SHOE_TIP = 0xffdd44;
const COL_SHADOW = 0x000000;
const COL_SMILE = 0xcc3333;
const COL_EYE = 0x222222;
const COL_NOSE = 0xff4444;

// Helpers
function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.ellipse(x, y, rx, ry);
}
function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.circle(x, y, r);
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.rect(x, y, w, h);
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawHat(g: Graphics, x: number, y: number, bounce: number): void {
  // Three-pointed jester hat
  // Left point
  const lx = x - 7;
  const ly = y - 7 + bounce * 0.5;
  line(g, x - 3, y - 3, lx, ly, COL_LEFT, 2.5);
  circle(g, lx, ly, 1.5, COL_BELL);
  circle(g, lx + 0.3, ly - 0.3, 0.8, COL_BELL_DK);

  // Right point
  const rx = x + 7;
  const ry = y - 7 - bounce * 0.5;
  line(g, x + 3, y - 3, rx, ry, COL_RIGHT, 2.5);
  circle(g, rx, ry, 1.5, COL_BELL);
  circle(g, rx + 0.3, ry - 0.3, 0.8, COL_BELL_DK);

  // Center point
  const cy = y - 10 + bounce;
  line(g, x, y - 3, x, cy, COL_YELLOW, 2.5);
  circle(g, x, cy, 1.5, COL_BELL);

  // Hat base
  ellipse(g, x, y - 2, 7, 3, COL_YELLOW_DK);
}

function drawHead(g: Graphics, x: number, y: number, breathe: number): void {
  // Big round face
  circle(g, x, y, 6, COL_SKIN);
  circle(g, x + 0.5, y - 0.5, 5, COL_SKIN, 0.3);
  // Rosy cheeks
  circle(g, x - 4, y + 1, 2, 0xffaaaa, 0.4);
  circle(g, x + 4, y + 1, 2, 0xffaaaa, 0.4);
  // Eyes (happy/squinting)
  line(g, x - 3, y - 1.5, x - 1, y - 2.5, COL_EYE, 1.5);
  line(g, x - 1, y - 2.5, x + 1, y - 1.5, COL_EYE, 1.5);
  // Pupils
  circle(g, x - 1, y - 1.5, 0.8, COL_EYE);
  // Big red nose
  circle(g, x, y + 1, 2, COL_NOSE);
  circle(g, x - 0.4, y + 0.6, 0.8, 0xff6666);
  // Wide smile
  line(g, x - 4, y + 3, x, y + 4.5, COL_SMILE, 1.2);
  line(g, x, y + 4.5, x + 4, y + 3, COL_SMILE, 1.2);

  drawHat(g, x, y, breathe);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Big round belly — motley pattern (split colors)
  // Left half
  ellipse(g, x - 2, y + 5, 7, 8 + breathe * 0.3, COL_LEFT);
  rect(g, x - 1, y - 2, 2, 15, COL_YELLOW, 0.6); // center stripe
  // Right half
  ellipse(g, x + 2, y + 5, 7, 8 + breathe * 0.3, COL_RIGHT);
  // Diamond pattern on belly
  for (let i = 0; i < 3; i++) {
    const dy = y + 2 + i * 4;
    rect(g, x - 3, dy, 2, 2, COL_YELLOW, 0.5);
    rect(g, x + 1, dy, 2, 2, COL_YELLOW, 0.5);
  }
  // Ruffled collar
  for (let i = -3; i <= 3; i++) {
    circle(g, x + i * 2, y - 2, 2, COL_YELLOW);
  }
}

function drawArms(g: Graphics, x: number, y: number, breathe: number, leftAngle: number, rightAngle: number): void {
  // Left arm (red sleeve)
  const lx = x - 8;
  const ly = y + 2 + breathe * 0.3;
  const lhx = lx + Math.cos(leftAngle) * 8;
  const lhy = ly + Math.sin(leftAngle) * 8;
  line(g, lx, ly, lhx, lhy, COL_LEFT_DK, 3);
  circle(g, lhx, lhy, 2, COL_SKIN);
  // Bell on left wrist
  circle(g, lhx - 1, lhy + 2, 1, COL_BELL);

  // Right arm (blue sleeve)
  const rxx = x + 8;
  const ry = y + 2 + breathe * 0.3;
  const rhx = rxx + Math.cos(rightAngle) * 8;
  const rhy = ry + Math.sin(rightAngle) * 8;
  line(g, rxx, ry, rhx, rhy, COL_RIGHT_DK, 3);
  circle(g, rhx, rhy, 2, COL_SKIN);
  circle(g, rhx + 1, rhy + 2, 1, COL_BELL);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2;

  // Left leg (red)
  rect(g, x - 4, y, 4, 6 + stride * 0.3, COL_LEFT_DK);
  // Curly-toe shoe
  ellipse(g, x - 3, y + 6 + stride * 0.3, 3, 2, COL_SHOE);
  circle(g, x - 6, y + 5.5 + stride * 0.3, 1, COL_SHOE_TIP);

  // Right leg (blue)
  rect(g, x + 1, y, 4, 6 - stride * 0.3, COL_RIGHT_DK);
  ellipse(g, x + 2, y + 6 - stride * 0.3, 3, 2, COL_SHOE);
  circle(g, x - 1, y + 5.5 - stride * 0.3, 1, COL_SHOE_TIP);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;
  const jingle = Math.sin(t * Math.PI * 4) * 0.5;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX, GY - 9, 0);
  drawBody(g, CX, GY - 22 + breathe, breathe);
  drawArms(g, CX, GY - 22 + breathe, breathe,
    -Math.PI * 0.4 + jingle * 0.1, -Math.PI * 0.6 - jingle * 0.1);
  drawHead(g, CX, GY - 32 + breathe, jingle);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 2;
  const sway = Math.sin(t * Math.PI * 2) * 1;
  const jingle = Math.sin(t * Math.PI * 4) * 1;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX + sway, GY - 9, t);
  drawBody(g, CX + sway, GY - 22 - bob, bob * 0.3);
  drawArms(g, CX + sway, GY - 22 - bob, bob * 0.3,
    -Math.PI * 0.3 + sway * 0.1, -Math.PI * 0.7 - sway * 0.1);
  drawHead(g, CX + sway, GY - 32 - bob, jingle);
}

function generateAttack(g: Graphics, frame: number): void {
  // Jester slaps weakly
  const t = frame / 6;
  let lean = 0;
  let armSwing = -Math.PI * 0.4;

  if (t < 0.3) {
    lean = -t / 0.3 * 1;
    armSwing = -Math.PI * 0.4 - (t / 0.3) * 0.3;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    lean = -1 + p * 3;
    armSwing = -Math.PI * 0.7 + p * Math.PI * 0.5;
  } else {
    const p = (t - 0.6) / 0.4;
    lean = 2 - p * 2;
    armSwing = -Math.PI * 0.2 - p * 0.2;
  }

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX, GY - 9, 0);
  drawBody(g, CX + lean, GY - 22, 0);
  drawArms(g, CX + lean, GY - 22, 0, armSwing, -Math.PI * 0.6);
  drawHead(g, CX + lean, GY - 32, 0);
}

function generateCast(g: Graphics, frame: number): void {
  generateAttack(g, frame);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 7;
  const drop = t * 12;
  const fade = 1 - t;

  ellipse(g, CX, GY, 10 * fade, 3.5 * fade, COL_SHADOW, 0.3 * fade);

  if (t < 0.85) drawLegs(g, CX + fall * 0.3, GY - 9 + drop * 0.2, 0);
  if (t < 0.75) drawBody(g, CX + fall, GY - 22 + drop, 0);
  if (t < 0.65) drawHead(g, CX + fall * 1.2, GY - 32 + drop * 0.7, 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdle,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMove,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttack, count: 7 },
  [UnitState.CAST]:   { gen: generateCast,   count: 6 },
  [UnitState.DIE]:    { gen: generateDie,    count: 7 },
};

export function generateGiantCourtJesterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
