// Procedural sprite generator for the Elven Archer unit.
// Slender elf with leaf-green clothing, pointed ears, and a tall elven longbow.
// 48×48 px per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — forest elf
const COL_SKIN      = 0xe8c89a;   // slightly lighter / more golden than human
const COL_HAIR      = 0xd4a020;   // golden-blonde
const COL_CLOAK     = 0x2e6b2e;   // deep forest green
const COL_CLOAK_HI  = 0x3d8a3d;
const COL_CLOAK_DK  = 0x1e4a1e;
const COL_TUNIC     = 0x5a8a3a;   // lighter green tunic
const COL_BELT      = 0x8b6030;
const COL_BOOT      = 0x3a2d1a;
const COL_BOW       = 0x7a5a20;   // pale willow
const COL_BOW_HI    = 0xb08040;
const COL_STRING    = 0xd4c080;
const COL_ARROW     = 0xb08040;
const COL_ARROW_TIP = 0xd0d8c0;   // silvery elven metal
const COL_SHADOW    = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.fill({ color: c }); g.ellipse(x, y, w, h);
}
function circle(g: Graphics, x: number, y: number, r: number, c: number): void {
  g.fill({ color: c }); g.circle(x, y, r);
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.fill({ color: c }); g.rect(x, y, w, h);
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w = 1): void {
  g.stroke({ color: c, width: w }); g.moveTo(x1, y1).lineTo(x2, y2);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawHead(g: Graphics, cx: number, cy: number): void {
  // Head
  circle(g, cx, cy, 5, COL_SKIN);
  // Pointed ear (left)
  g.fill({ color: COL_SKIN });
  g.moveTo(cx - 5, cy - 1).lineTo(cx - 9, cy - 5).lineTo(cx - 5, cy + 2).fill();
  // Hair
  ellipse(g, cx, cy - 3, 5, 3, COL_HAIR);
}

function drawBody(g: Graphics, cx: number, cy: number): void {
  // Slender torso (8 wide vs pikeman's 10)
  rect(g, cx - 4, cy, 8, 12, COL_CLOAK);
  rect(g, cx - 3, cy + 1, 6, 2, COL_CLOAK_HI);
  // Belt
  rect(g, cx - 4, cy + 10, 8, 2, COL_BELT);
  // Tunic accent
  rect(g, cx - 3, cy + 3, 6, 5, COL_TUNIC);
}

function drawLegs(g: Graphics, cx: number, cy: number, phase: number): void {
  const o = Math.sin(phase * Math.PI * 2) * 2;
  rect(g, cx - 4, cy, 3, 8, COL_CLOAK_DK);
  rect(g, cx - 4, cy + 6, 3, 4, COL_BOOT);
  rect(g, cx + 1, cy - o, 3, 8 + o, COL_CLOAK_DK);
  rect(g, cx + 1, cy + 6 - o, 3, 4, COL_BOOT);
}

/** Draw an elegant tall elven bow.  cx/cy = hand position */
function drawBow(g: Graphics, cx: number, cy: number, drawn: number = 0): void {
  // Bow stave — curved using bezier
  const bh = 16; // half-height of bow
  const bx = cx - 3 + drawn * 4;
  // Outer curve
  g.stroke({ color: COL_BOW, width: 2 });
  g.moveTo(bx, cy - bh).bezierCurveTo(bx - 8, cy - bh / 2, bx - 8, cy + bh / 2, bx, cy + bh);
  g.stroke({ color: COL_BOW_HI, width: 1 });
  g.moveTo(bx + 1, cy - bh + 2).bezierCurveTo(bx - 5, cy, bx - 5, cy + 2, bx + 1, cy + bh - 2);
  // String
  const sx = bx + drawn * 6;
  g.stroke({ color: COL_STRING, width: 1 });
  g.moveTo(bx, cy - bh).lineTo(sx, cy).lineTo(bx, cy + bh);
}

function drawArrow(g: Graphics, cx: number, cy: number): void {
  // Arrow nocked, pointing right
  line(g, cx - 2, cy, cx + 14, cy, COL_ARROW, 1);
  // Tip
  g.fill({ color: COL_ARROW_TIP });
  g.moveTo(cx + 12, cy - 2).lineTo(cx + 16, cy).lineTo(cx + 12, cy + 2).fill();
  // Fletch (left side)
  g.fill({ color: COL_CLOAK_HI });
  g.moveTo(cx - 4, cy - 1).lineTo(cx - 1, cy).lineTo(cx - 4, cy + 1).fill();
}

// ---------------------------------------------------------------------------
// State generators
// ---------------------------------------------------------------------------

function idle(g: Graphics, frame: number): void {
  const b = Math.sin(frame * 0.3) * 0.8;
  ellipse(g, CX, GY, 10, 3, COL_SHADOW);
  drawBody(g, CX, 20 + b);
  drawHead(g, CX, 13 + b);
  drawBow(g, CX + 6, 25 + b, 0);
  drawLegs(g, CX, 32, 0);
}

function move(g: Graphics, frame: number): void {
  const phase = frame / 8;
  const bob   = Math.abs(Math.sin(phase * Math.PI * 2)) * 1.5;
  const sway  = Math.sin(phase * Math.PI * 2) * 1;
  ellipse(g, CX, GY, 10, 3, COL_SHADOW);
  drawBody(g, CX + sway, 20 + bob);
  drawHead(g, CX + sway, 13 + bob);
  drawBow(g, CX + 6 + sway, 25 + bob, 0);
  drawLegs(g, CX + sway, 32, phase);
}

function attack(g: Graphics, frame: number): void {
  // Draw → aim → release
  const t     = frame / 6;
  const drawn = t < 0.5 ? t * 2 : Math.max(0, 1 - (t - 0.5) * 4);
  ellipse(g, CX, GY, 10, 3, COL_SHADOW);
  drawBody(g, CX, 20);
  drawHead(g, CX, 13);
  drawBow(g, CX + 5, 24, drawn);
  if (t < 0.6) drawArrow(g, CX + 5, 24);
  drawLegs(g, CX, 32, 0);
}

function die(g: Graphics, frame: number): void {
  const t  = frame / 6;
  const fx = t * 8;
  const fy = t * 12;
  ellipse(g, CX, GY, 10 * (1 - t), 3 * (1 - t), COL_SHADOW);
  if (t < 0.8) drawBody(g, CX + fx, 20 + fy);
  if (t < 0.6) drawHead(g, CX + fx, 13 + fy);
  if (t < 0.7) drawBow(g, CX + 5 + fx, 24 + fy, 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const STATE_GENS: Record<UnitState, { gen: (g: Graphics, f: number) => void; count: number }> = {
  [UnitState.IDLE]:   { gen: idle,   count: 8 },
  [UnitState.MOVE]:   { gen: move,   count: 8 },
  [UnitState.ATTACK]: { gen: attack, count: 7 },
  [UnitState.CAST]:   { gen: attack, count: 6 },
  [UnitState.DIE]:    { gen: die,    count: 7 },
};

export function generateElvenArcherFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();
  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENS[state];
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
