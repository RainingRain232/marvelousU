// Procedural sprite generator for the Troubadour — a wandering bard.
//
// 48×48 pixel frames. Humanoid figure with a lute/instrument.
// States: IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;
const COL_SKIN_HI = 0xe8c898;
const COL_HAT = 0x882266;
const COL_HAT_HI = 0xaa3388;
const COL_FEATHER = 0xeecc44;
const COL_TUNIC = 0x3355aa;
const COL_TUNIC_DK = 0x223388;
const COL_TUNIC_HI = 0x4477cc;
const COL_BELT = 0x664422;
const COL_PANTS = 0x553311;
const COL_PANTS_DK = 0x3a2208;
const COL_BOOT = 0x443322;
const COL_LUTE_BODY = 0xcc8833;
const COL_LUTE_DK = 0x996622;
const COL_LUTE_NECK = 0x885522;
const COL_STRING = 0xddddaa;
const COL_SHADOW = 0x000000;

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

function drawHead(g: Graphics, x: number, y: number, breathe: number): void {
  // Head
  circle(g, x, y, 5, COL_SKIN);
  circle(g, x + 0.5, y - 0.5, 4, COL_SKIN_HI, 0.3);
  // Eyes
  circle(g, x - 2, y - 1, 1, 0x222222);
  circle(g, x - 2.2, y - 1.2, 0.4, 0xffffff);
  // Mouth (slight smile)
  line(g, x - 2.5, y + 2, x + 0.5, y + 1.5, COL_SKIN_DK, 0.7);
  // Beret / floppy hat
  ellipse(g, x, y - 4, 6, 3, COL_HAT);
  ellipse(g, x + 1, y - 5, 5, 2.5, COL_HAT_HI);
  // Droopy part
  ellipse(g, x + 5, y - 3 + breathe * 0.3, 3, 2.5, COL_HAT);
  // Feather
  line(g, x + 3, y - 6, x + 7, y - 10 + breathe * 0.5, COL_FEATHER, 1.5);
  line(g, x + 7, y - 10 + breathe * 0.5, x + 9, y - 8, COL_FEATHER, 1);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Tunic
  rect(g, x - 5, y, 10, 10, COL_TUNIC);
  rect(g, x - 4, y + 1, 8, 3, COL_TUNIC_HI);
  rect(g, x - 5, y + 5, 10, 2, COL_TUNIC_DK);
  // Belt
  rect(g, x - 5, y + 9, 10, 2, COL_BELT);
  // Puffy sleeves
  ellipse(g, x - 6, y + 2 + breathe * 0.2, 3, 3, COL_TUNIC_HI);
  ellipse(g, x + 6, y + 2 + breathe * 0.2, 3, 3, COL_TUNIC_HI);
}

function drawLute(g: Graphics, x: number, y: number, strumPhase: number): void {
  // Lute body (pear-shaped)
  ellipse(g, x, y, 4, 5, COL_LUTE_BODY);
  ellipse(g, x, y + 1, 3.5, 4, COL_LUTE_DK, 0.4);
  // Sound hole
  circle(g, x, y - 0.5, 1.2, COL_LUTE_DK);
  // Neck
  rect(g, x - 1, y - 10, 2, 7, COL_LUTE_NECK);
  // Headstock
  rect(g, x - 1.5, y - 12, 3, 2.5, COL_LUTE_NECK);
  // Strings
  for (let i = -1; i <= 1; i++) {
    const vibrate = Math.sin(strumPhase * Math.PI * 2 + i) * 0.4;
    line(g, x + i * 0.7, y - 10, x + i * 0.7 + vibrate, y + 3, COL_STRING, 0.5);
  }
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2;
  // Front leg
  rect(g, x - 3, y + stride * 0.3, 3, 8 - stride * 0.3, COL_PANTS);
  rect(g, x - 3, y + 7, 4, 3, COL_BOOT);
  // Back leg
  rect(g, x + 1, y - stride * 0.3, 3, 8 + stride * 0.3, COL_PANTS_DK);
  rect(g, x, y + 7, 4, 3, COL_BOOT);
}

function drawArm(g: Graphics, x: number, y: number, angle: number): void {
  const dx = Math.cos(angle) * 6;
  const dy = Math.sin(angle) * 6;
  line(g, x, y, x + dx, y + dy, COL_SKIN, 2.5);
  circle(g, x + dx, y + dy, 1.5, COL_SKIN_DK);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const strum = t * 4;

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawLegs(g, CX, GY - 11, 0);
  drawBody(g, CX, GY - 22 + breathe, breathe);
  // Left arm holding lute neck
  drawArm(g, CX - 7, GY - 19 + breathe, -Math.PI * 0.4);
  // Right arm strumming
  drawArm(g, CX + 7, GY - 19 + breathe, -Math.PI * 0.3 + Math.sin(strum * Math.PI * 2) * 0.15);
  // Lute
  drawLute(g, CX - 9, GY - 15 + breathe, strum);
  drawHead(g, CX, GY - 28 + breathe, breathe);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.5;

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawLegs(g, CX, GY - 11, t);
  drawBody(g, CX + sway, GY - 22 - bob, bob * 0.3);
  drawArm(g, CX - 7 + sway, GY - 19 - bob, -Math.PI * 0.4);
  drawArm(g, CX + 7 + sway, GY - 19 - bob, -Math.PI * 0.3);
  drawLute(g, CX - 9 + sway, GY - 15 - bob, t * 2);
  drawHead(g, CX + sway, GY - 28 - bob, bob * 0.3);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  let lean = 0;
  let swingAngle = -Math.PI * 0.3;

  if (t < 0.3) {
    const p = t / 0.3;
    lean = -p * 2;
    swingAngle = -Math.PI * 0.3 - p * 0.5;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    lean = -2 + p * 5;
    swingAngle = -Math.PI * 0.8 + p * Math.PI * 0.7;
  } else {
    const p = (t - 0.6) / 0.4;
    lean = 3 - p * 3;
    swingAngle = -Math.PI * 0.1 - p * 0.2;
  }

  ellipse(g, CX, GY, 8, 3, COL_SHADOW, 0.25);
  drawLegs(g, CX, GY - 11, 0);
  drawBody(g, CX + lean, GY - 22, 0);
  drawArm(g, CX - 7 + lean, GY - 19, -Math.PI * 0.5);
  drawArm(g, CX + 7 + lean, GY - 19, swingAngle);
  drawLute(g, CX - 9 + lean * 1.5, GY - 15, 0);
  drawHead(g, CX + lean, GY - 28, 0);
}

function generateCast(g: Graphics, frame: number): void {
  generateAttack(g, frame);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 8;
  const drop = t * 12;
  const fade = 1 - t;

  ellipse(g, CX, GY, 8 * fade, 3 * fade, COL_SHADOW, 0.25 * fade);

  if (t < 0.85) drawLegs(g, CX + fall * 0.3, GY - 11 + drop * 0.2, 0);
  if (t < 0.75) drawBody(g, CX + fall, GY - 22 + drop, 0);
  if (t < 0.6) drawLute(g, CX - 9 + fall * 1.2, GY - 15 + drop * 0.8, 0);
  if (t < 0.65) drawHead(g, CX + fall * 1.1, GY - 28 + drop * 0.6, 0);
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

export function generateTroubadourFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
