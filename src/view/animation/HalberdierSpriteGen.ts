// Procedural sprite generator for the Halberdier unit.
// Heavier armour than the Pikeman — full plate chest, greathelm, and a
// halberd (longer axe-tip rather than a plain spear).  48×48 px per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — heavier than pikeman, more blue-steel
const COL_PLATE      = 0x6677aa;   // blue-steel plate
const COL_PLATE_HI   = 0x99aacc;
const COL_PLATE_DK   = 0x445588;
const COL_HELM       = 0x556699;
const COL_HELM_HI    = 0x7799bb;
const COL_VISOR      = 0x222233;
const COL_SHAFT      = 0x7a5a30;
const COL_BLADE      = 0xc8ccd8;
const COL_BLADE_HI   = 0xe8ecf8;
const COL_SPIKE      = 0xd0d4e0;
const COL_BOOT       = 0x334455;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.fill({ color: c });
  g.ellipse(x, y, w, h);
}
function circle(g: Graphics, x: number, y: number, r: number, c: number): void {
  g.fill({ color: c });
  g.circle(x, y, r);
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.fill({ color: c });
  g.rect(x, y, w, h);
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w = 1): void {
  g.stroke({ color: c, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

// ---------------------------------------------------------------------------
// Component drawing
// ---------------------------------------------------------------------------

function drawHelm(g: Graphics, cx: number, cy: number): void {
  // Greathelm — full covering, narrow visor slit
  circle(g, cx, cy, 8, COL_HELM);
  circle(g, cx, cy, 7, COL_HELM_HI);
  // Visor slit
  rect(g, cx - 4, cy, 8, 2, COL_VISOR);
  // Cheek curve
  line(g, cx - 8, cy - 2, cx - 8, cy + 5, COL_PLATE_DK, 2);
  line(g, cx + 8, cy - 2, cx + 8, cy + 5, COL_PLATE_DK, 2);
}

function drawBody(g: Graphics, cx: number, cy: number): void {
  // Plate torso
  rect(g, cx - 6, cy, 12, 13, COL_PLATE);
  rect(g, cx - 5, cy + 1, 10, 2, COL_PLATE_HI);   // highlight
  rect(g, cx - 5, cy + 10, 10, 2, COL_PLATE_DK);  // shadow
  // Waist belt
  rect(g, cx - 6, cy + 11, 12, 2, COL_PLATE_DK);
}

function drawLegs(g: Graphics, cx: number, cy: number, phase: number): void {
  const o = Math.sin(phase * Math.PI * 2) * 2.5;
  // Left leg
  rect(g, cx - 5, cy, 4, 9, COL_PLATE);
  rect(g, cx - 5, cy + 7, 4, 4, COL_BOOT);
  // Right leg (opposite phase)
  rect(g, cx + 1, cy - o, 4, 9 + o, COL_PLATE);
  rect(g, cx + 1, cy + 7 - o, 4, 4, COL_BOOT);
}

function drawHalberd(g: Graphics, x1: number, y1: number, x2: number, y2: number, tip: number): void {
  // Shaft
  line(g, x1, y1, x2, y2, COL_SHAFT, 3);
  // Axe blade (wider than a spear tip)
  const bx = x2 + tip * 3;
  const by = y2;
  g.fill({ color: COL_BLADE });
  g.moveTo(bx - tip * 2, by - 6)
   .lineTo(bx + tip * 4, by)
   .lineTo(bx - tip * 2, by + 4)
   .lineTo(bx - tip * 1, by)
   .fill();
  g.fill({ color: COL_BLADE_HI });
  g.moveTo(bx - tip * 2, by - 4).lineTo(bx + tip * 3, by).lineTo(bx - tip * 1, by).fill();
  // Top spike
  g.fill({ color: COL_SPIKE });
  g.moveTo(x2 - 1, y2 - 7).lineTo(x2 + 1, y2 - 7).lineTo(x2, y2 - 12).fill();
}

// ---------------------------------------------------------------------------
// State generators
// ---------------------------------------------------------------------------

function idle(g: Graphics, frame: number): void {
  const b = Math.sin(frame * 0.35) * 1.0;
  ellipse(g, CX, GY, 13, 4, COL_SHADOW);
  drawBody(g, CX, 19 + b);
  drawHelm(g, CX, 12 + b);
  drawHalberd(g, CX - 6, 17 + b, CX + 14, 7 + b, -1);
  drawLegs(g, CX, 32, 0);
}

function move(g: Graphics, frame: number): void {
  const phase = frame / 8;
  const bob   = Math.abs(Math.sin(phase * Math.PI * 2)) * 2;
  const sway  = Math.sin(phase * Math.PI * 2) * 1;
  ellipse(g, CX, GY, 13, 4, COL_SHADOW);
  drawBody(g, CX + sway, 19 + bob);
  drawHelm(g, CX + sway, 12 + bob);
  const lean = Math.sin(phase * Math.PI * 2) * 0.3;
  drawHalberd(g, CX - 6 + sway, 17 + bob, CX + 12 + sway + lean * 6, 8 + bob + lean * 3, -1);
  drawLegs(g, CX + sway, 32, phase);
}

function attack(g: Graphics, frame: number): void {
  const t      = frame / 6;
  const thrust = t < 0.5 ? t * 2 : (1 - t) * 2;
  ellipse(g, CX, GY, 13, 4, COL_SHADOW);
  drawBody(g, CX + thrust * 5, 19 - thrust * 2);
  drawHelm(g, CX + thrust * 5, 12 - thrust * 2);
  const reach = t < 0.5 ? t * 22 : (1 - t) * 22 + 12;
  drawHalberd(g, CX - 6 + thrust * 5, 17 - thrust * 2, CX + reach, 9 - thrust * 2, 1);
  drawLegs(g, CX + thrust * 3, 32, 0);
}

function die(g: Graphics, frame: number): void {
  const t   = frame / 6;
  const fx  = t * 10;
  const fy  = t * 14;
  ellipse(g, CX, GY, 13 * (1 - t), 4 * (1 - t), COL_SHADOW);
  if (t < 0.8) drawBody(g, CX + fx, 19 + fy);
  if (t < 0.6) drawHelm(g, CX + fx, 12 + fy);
  if (t > 0.2) {
    const pf = (t - 0.2) * 18;
    drawHalberd(g, CX + fx + pf, 17 + fy, CX + fx + pf + 14, 9 + fy, 0.5);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const STATE_GENS: Record<UnitState, { gen: (g: Graphics, f: number) => void; count: number }> = {
  [UnitState.IDLE]:   { gen: idle,   count: 8 },
  [UnitState.MOVE]:   { gen: move,   count: 8 },
  [UnitState.ATTACK]: { gen: attack, count: 7 },
  [UnitState.CAST]:   { gen: attack, count: 6 }, // reuse attack
  [UnitState.DIE]:    { gen: die,    count: 7 },
};

export function generateHalberdierFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
