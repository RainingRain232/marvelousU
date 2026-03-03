// Procedural sprite generator for the Fisherman unit type.
//
// 48×48 pixel frames. A fisherman with a fishing rod and net.
// Based on the Gladiator pattern but with fishing gear instead of gladiator gear.
// States: IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb8875a;

const COL_HAT = 0x7a6633;
const COL_HAT_HI = 0x9a8855;
const COL_HAT_DK = 0x5a4422;

const COL_SHIRT = 0x667788;
const COL_SHIRT_HI = 0x8899aa;

const COL_VEST = 0x553322;
const COL_VEST_DK = 0x3a2211;

const COL_PANTS = 0x556644;
const COL_PANTS_DK = 0x3a4422;

const COL_BOOT = 0x5a4a33;
const COL_BOOT_DK = 0x3a3022;

const COL_ROD = 0x886644;
const COL_ROD_HI = 0xaa8866;
const COL_LINE = 0xcccccc;
const COL_HOOK = 0xaaaaaa;

const COL_NET = 0x9a8860;
const COL_NET_HI = 0xbbaa77;
const COL_WEIGHT = 0x555555;

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

function drawHat(g: Graphics, x: number, y: number, _breathe: number): void {
  // Wide-brimmed fishing hat
  circle(g, x, y, 5, COL_SKIN);
  // Hat crown
  ellipse(g, x, y - 3, 5, 4, COL_HAT);
  ellipse(g, x + 0.5, y - 4, 4, 3, COL_HAT_HI);
  // Wide brim
  ellipse(g, x, y, 8, 2, COL_HAT_DK);
  ellipse(g, x, y - 0.5, 7.5, 1.5, COL_HAT);
  // Face
  circle(g, x - 2, y - 0.5, 1, 0x222222); // eye
  circle(g, x - 2.2, y - 0.7, 0.4, 0xffffff);
  line(g, x - 3, y + 2, x + 1, y + 2, COL_SKIN_DK, 0.7); // beard stubble
  // Beard
  rect(g, x - 3, y + 2, 5, 3, COL_HAT_DK, 0.5);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Shirt
  rect(g, x - 5, y, 10, 10, COL_SHIRT);
  rect(g, x - 4, y + 1, 8, 3, COL_SHIRT_HI);
  // Vest over shirt
  rect(g, x - 5, y, 3, 10, COL_VEST);
  rect(g, x + 2, y, 3, 10, COL_VEST);
  rect(g, x - 5, y + 8, 10, 2, COL_VEST_DK);
  // Sleeves
  ellipse(g, x - 6, y + 2 + breathe * 0.2, 3, 2.5, COL_SHIRT);
  ellipse(g, x + 6, y + 2 + breathe * 0.2, 3, 2.5, COL_SHIRT);
}

function drawArms(
  g: Graphics, x: number, y: number, breathe: number,
  rodAngle: number, netAngle: number,
): void {
  // Right arm (holds rod)
  const rax = x + 7;
  const ray = y + 3 + breathe * 0.3;
  const rfDist = 7;
  const rfX = rax + Math.cos(rodAngle) * rfDist;
  const rfY = ray + Math.sin(rodAngle) * rfDist;
  line(g, rax, ray, rfX, rfY, COL_SKIN, 2.5);
  circle(g, rfX, rfY, 1.5, COL_SKIN_DK);

  // Left arm (holds net)
  const lax = x - 7;
  const lay = y + 3 + breathe * 0.3;
  const lfDist = 6;
  const lfX = lax + Math.cos(netAngle) * lfDist;
  const lfY = lay + Math.sin(netAngle) * lfDist;
  line(g, lax, lay, lfX, lfY, COL_SKIN, 2.5);
  circle(g, lfX, lfY, 1.5, COL_SKIN_DK);
}

function drawRod(g: Graphics, x: number, y: number, angle: number, ext: number): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const rodLen = 18 + ext;
  const tipX = x + ca * rodLen;
  const tipY = y + sa * rodLen;

  // Rod shaft (tapers)
  line(g, x, y, tipX, tipY, COL_ROD, 2);
  line(g, x + ca * rodLen * 0.3, y + sa * rodLen * 0.3, tipX, tipY, COL_ROD_HI, 1);

  // Fishing line dangling from tip
  const lineLen = 6;
  line(g, tipX, tipY, tipX, tipY + lineLen, COL_LINE, 0.5);
  // Hook
  line(g, tipX, tipY + lineLen, tipX - 1.5, tipY + lineLen + 2, COL_HOOK, 0.8);
  line(g, tipX - 1.5, tipY + lineLen + 2, tipX, tipY + lineLen + 1, COL_HOOK, 0.8);
}

function drawNet(g: Graphics, x: number, y: number, spread: number, alpha: number): void {
  const sz = 4 + spread * 6;
  const steps = 4;
  const step = sz / steps;

  for (let i = 0; i <= steps; i++) {
    const off = -sz / 2 + i * step;
    line(g, x + off, y - sz / 2, x + off, y + sz / 2, COL_NET, 0.7 * alpha);
    line(g, x - sz / 2, y + off, x + sz / 2, y + off, COL_NET, 0.7 * alpha);
  }
  for (let i = 0; i <= steps; i++) {
    const off = -sz / 2 + i * step;
    line(g, x + off, y - sz / 2, x + off + sz / 2, y, COL_NET_HI, 0.5 * alpha);
  }
  circle(g, x - sz / 2, y - sz / 2, 1.2, COL_WEIGHT, alpha);
  circle(g, x + sz / 2, y - sz / 2, 1.2, COL_WEIGHT, alpha);
  circle(g, x - sz / 2, y + sz / 2, 1.2, COL_WEIGHT, alpha);
  circle(g, x + sz / 2, y + sz / 2, 1.2, COL_WEIGHT, alpha);
}

function drawNetBundled(g: Graphics, x: number, y: number): void {
  ellipse(g, x, y, 3, 4, COL_NET);
  ellipse(g, x, y - 1, 2.5, 3, COL_NET_HI, 0.7);
  circle(g, x - 2, y + 3, 1, COL_WEIGHT);
  circle(g, x + 2, y + 3, 1, COL_WEIGHT);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2.5;

  // Front leg
  rect(g, x - 4, y, 4, 8, COL_PANTS);
  rect(g, x - 3, y + 1, 2, 3, COL_PANTS_DK);
  rect(g, x - 5, y + 7 + stride * 0.2, 5, 3, COL_BOOT);
  rect(g, x - 4, y + 8 + stride * 0.2, 3, 2, COL_BOOT_DK);

  // Back leg
  rect(g, x + 1, y - stride * 0.3, 4, 8 + stride * 0.3, COL_PANTS);
  rect(g, x + 2, y + 1 - stride * 0.3, 2, 3, COL_PANTS_DK);
  rect(g, x, y + 7, 5, 3, COL_BOOT);
  rect(g, x + 1, y + 8, 3, 2, COL_BOOT_DK);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX, 30, 0);
  drawBody(g, CX, 16 + breathe, breathe);
  drawArms(g, CX, 16 + breathe, breathe, -Math.PI * 0.3, -Math.PI * 0.5);
  drawRod(g, CX + 10, 22 + breathe, -Math.PI * 0.35, 0);
  drawNetBundled(g, CX - 10, 26 + breathe);
  drawHat(g, CX, 10 + breathe, breathe);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.8;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX + sway, 30, t);
  drawBody(g, CX + sway, 16 + bob, bob);
  drawArms(g, CX + sway, 16 + bob, bob,
    -Math.PI * 0.3 + sway * 0.06, -Math.PI * 0.5 - sway * 0.04);
  drawRod(g, CX + 10 + sway, 22 + bob, -Math.PI * 0.33 + sway * 0.05, 0);
  drawNetBundled(g, CX - 10 + sway, 26 + bob);
  drawHat(g, CX + sway, 10 + bob, bob);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;

  // Rod swing: wind-up → swing → retract
  let rodAngle: number;
  let rodExt: number;
  let lean: number;

  if (t < 0.3) {
    const p = t / 0.3;
    rodAngle = -Math.PI * 0.35 - p * 0.2;
    rodExt = -p * 3;
    lean = -p * 2;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    rodAngle = -Math.PI * 0.55 + p * Math.PI * 0.45;
    rodExt = -3 + p * 8;
    lean = -2 + p * 5;
  } else {
    const p = (t - 0.6) / 0.4;
    rodAngle = -Math.PI * 0.1 - p * 0.25;
    rodExt = 5 - p * 5;
    lean = 3 - p * 3;
  }

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX, 30, 0);
  drawBody(g, CX + lean, 16, 0);
  drawArms(g, CX + lean, 16, 0, rodAngle, -Math.PI * 0.6);
  drawRod(g, CX + 10 + lean, 20, rodAngle, rodExt);
  drawNetBundled(g, CX - 11 + lean * 0.3, 24);
  drawHat(g, CX + lean, 10, 0);
}

function generateCast(g: Graphics, frame: number): void {
  const t = frame / 5;

  // Net throw
  let netDist: number;
  let netSpread: number;
  let netAlpha: number;
  let lean: number;

  if (t < 0.3) {
    const p = t / 0.3;
    netDist = -p * 3;
    netSpread = 0;
    netAlpha = 1;
    lean = -p * 1.5;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    netDist = -3 + p * 18;
    netSpread = p;
    netAlpha = 1;
    lean = -1.5 + p * 3;
  } else {
    const p = (t - 0.6) / 0.4;
    netDist = 15 + p * 4;
    netSpread = 1 + p * 0.5;
    netAlpha = 1 - p * 0.3;
    lean = 1.5 - p * 1.5;
  }

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);
  drawLegs(g, CX, 30, 0);
  drawBody(g, CX + lean, 16, 0);
  const throwArmAngle = t < 0.3 ? -Math.PI * 0.7 : -Math.PI * 0.2;
  drawArms(g, CX + lean, 16, 0, -Math.PI * 0.35, throwArmAngle);
  drawRod(g, CX + 10 + lean, 22, -Math.PI * 0.35, 0);

  if (t > 0.2) {
    const nx = CX - 10 + lean * 0.3 - netDist;
    const ny = 18;
    drawNet(g, nx, ny, netSpread, netAlpha);
  } else {
    drawNetBundled(g, CX - 10 + lean * 0.3, 24);
  }

  drawHat(g, CX + lean, 10, 0);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 7;
  const drop = t * 14;
  const fade = 1 - t;

  ellipse(g, CX, GY, 10 * fade, 3.5 * fade, COL_SHADOW, 0.3 * fade);

  if (t < 0.85) drawLegs(g, CX + fall * 0.4, 30 + drop * 0.2, 0);
  if (t < 0.75) drawBody(g, CX + fall, 16 + drop, 0);
  if (t < 0.65) drawHat(g, CX + fall * 1.2, 10 + drop * 0.7, 0);
  if (t < 0.7) {
    const ta = -Math.PI * 0.35 + t * 1.2;
    drawRod(g, CX + 10 + fall * 0.6, 22 + drop * 0.4, ta, 0);
  }
  if (t < 0.6) drawNetBundled(g, CX - 8 + fall * 0.8, 26 + drop * 0.5);
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

export function generateFishermanFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
