// Procedural sprite generator for Rufus — the king's loyal dog.
//
// 48×48 pixel frames. A small dog shape running on four legs.
// States: IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette
const COL_FUR = 0xb8722d;
const COL_FUR_DK = 0x8e5a1e;
const COL_FUR_LT = 0xd49a50;
const COL_BELLY = 0xdbb880;
const COL_NOSE = 0x222222;
const COL_EYE = 0x111111;
const COL_TONGUE = 0xdd5555;
const COL_SHADOW = 0x000000;
const COL_COLLAR = 0xcc2222;
const COL_COLLAR_HI = 0xff4444;

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
// Drawing components
// ---------------------------------------------------------------------------

function drawTail(g: Graphics, x: number, y: number, wag: number): void {
  const tipX = x + 8 + wag * 2;
  const tipY = y - 5 + Math.abs(wag) * 1.5;
  line(g, x, y, tipX, tipY, COL_FUR, 2);
  circle(g, tipX, tipY, 1.2, COL_FUR_LT);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Main body (elongated)
  ellipse(g, x, y, 10, 5 + breathe * 0.3, COL_FUR);
  // Belly highlight
  ellipse(g, x - 1, y + 2, 7, 3, COL_BELLY);
  // Back
  ellipse(g, x + 1, y - 2, 8, 3, COL_FUR_DK);
}

function drawHead(g: Graphics, x: number, y: number, breathe: number, mouthOpen: number): void {
  // Head
  ellipse(g, x, y, 5, 4.5, COL_FUR);
  // Snout
  ellipse(g, x - 4, y + 1, 3.5, 2.5, COL_FUR_LT);
  // Nose
  circle(g, x - 6.5, y, 1.2, COL_NOSE);
  // Eye
  circle(g, x - 1.5, y - 1.5, 1.3, COL_EYE);
  circle(g, x - 1.8, y - 1.8, 0.5, 0xffffff);
  // Ear (floppy)
  ellipse(g, x + 2, y - 4 + breathe * 0.3, 2.5, 4, COL_FUR_DK);
  // Mouth / tongue
  if (mouthOpen > 0.3) {
    line(g, x - 5, y + 2, x - 3, y + 2, COL_FUR_DK, 0.8);
    circle(g, x - 5, y + 3, 1, COL_TONGUE, mouthOpen);
  }
  // Collar
  rect(g, x + 3, y - 1, 3, 3, COL_COLLAR);
  rect(g, x + 3.5, y - 0.5, 2, 1, COL_COLLAR_HI);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 3;
  // Front legs
  rect(g, x - 6 + stride * 0.5, y, 2, 7, COL_FUR);
  rect(g, x - 3 - stride * 0.5, y, 2, 7, COL_FUR_DK);
  // Paws front
  ellipse(g, x - 5 + stride * 0.5, y + 7, 1.5, 1, COL_FUR_LT);
  ellipse(g, x - 2 - stride * 0.5, y + 7, 1.5, 1, COL_FUR_LT);
  // Hind legs
  rect(g, x + 4 - stride * 0.5, y - 1, 2.5, 8, COL_FUR);
  rect(g, x + 7 + stride * 0.5, y - 1, 2.5, 8, COL_FUR_DK);
  // Paws hind
  ellipse(g, x + 5.2 - stride * 0.5, y + 7, 1.5, 1, COL_FUR_LT);
  ellipse(g, x + 8.2 + stride * 0.5, y + 7, 1.5, 1, COL_FUR_LT);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const wag = Math.sin(t * Math.PI * 4) * 0.8;

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawTail(g, CX + 8, GY - 14 + breathe, wag);
  drawLegs(g, CX, GY - 8, 0);
  drawBody(g, CX + 1, GY - 13 + breathe, breathe);
  drawHead(g, CX - 8, GY - 14 + breathe, breathe, 0.5 + breathe * 0.3);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 2;
  const wag = Math.sin(t * Math.PI * 4) * 1.5;

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawTail(g, CX + 8, GY - 14 - bob, wag);
  drawLegs(g, CX, GY - 8, t);
  drawBody(g, CX + 1, GY - 13 - bob, bob * 0.3);
  drawHead(g, CX - 8, GY - 15 - bob, bob * 0.3, 0.7);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  let lean = 0;
  let mouthOpen = 0;

  if (t < 0.3) {
    lean = -t / 0.3 * 2;
    mouthOpen = 0.3;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    lean = -2 + p * 6;
    mouthOpen = 0.5 + p * 0.5;
  } else {
    const p = (t - 0.6) / 0.4;
    lean = 4 - p * 4;
    mouthOpen = 1 - p * 0.7;
  }

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawTail(g, CX + 8 - lean * 0.3, GY - 14, 0);
  drawLegs(g, CX, GY - 8, 0);
  drawBody(g, CX + 1 + lean * 0.3, GY - 13, 0);
  drawHead(g, CX - 8 + lean, GY - 14, 0, mouthOpen);
}

function generateCast(g: Graphics, frame: number): void {
  // Rufus barks (same as attack but shorter)
  generateAttack(g, frame);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 6;
  const fade = 1 - t;

  ellipse(g, CX, GY, 8 * fade, 3 * fade, COL_SHADOW, 0.25 * fade);

  if (t < 0.8) {
    drawLegs(g, CX + fall * 0.3, GY - 8 + fall * 1.5, 0);
  }
  if (t < 0.9) {
    drawBody(g, CX + 1 + fall, GY - 13 + fall * 2, 0);
  }
  if (t < 0.85) {
    drawHead(g, CX - 8 + fall * 0.5, GY - 14 + fall * 2.5, 0, 0);
  }
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

export function generateRufusFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
