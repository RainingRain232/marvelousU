// Procedural sprite generator for the Warchief (Horde faction unit).
// A massive, brutish warrior with tribal armor, war paint, a huge
// cleaver, and a skull-topped totem pole on his back.  48×48 px per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;  // ground line

// Palette — earthy, savage tones
const COL_SKIN       = 0x6b8e23;   // olive-green skin
const COL_SKIN_HI    = 0x8fbc3f;   // highlight
const COL_SKIN_DK    = 0x4a6516;   // shadow
const COL_ARMOR      = 0x5c4033;   // dark leather
const COL_METAL      = 0x888888;   // iron studs/rivets
const COL_LOIN       = 0x8b4513;   // loincloth
const COL_CLEAVER    = 0xaaaaaa;   // steel blade
const COL_CLEAVER_HI = 0xcccccc;
const COL_CLEAVER_DK = 0x666666;
const COL_SHAFT      = 0x5c3d1e;   // wooden shaft
const COL_SKULL      = 0xe8e0d0;   // bone white
const COL_SKULL_DK   = 0xb0a890;
const COL_WARPAINT   = 0xcc2222;   // red war paint
const COL_BOOT       = 0x3a2a1a;   // dark hide boots
const COL_TUSK       = 0xfffff0;   // ivory tusks
const COL_EYE        = 0xff4400;   // fierce orange-red eyes
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.rect(x, y, w, h).fill({ color: c });
}
function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}
function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w: number): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow on the ground */
function drawShadow(g: Graphics, ox = 0, scale = 1): void {
  ellipse(g, CX + ox, GY, 10 * scale, 3, COL_SHADOW, 0.3);
}

/** Skull totem on the back */
function drawTotem(g: Graphics, baseY: number, bob: number): void {
  const tx = CX + 7;
  const ty = baseY + bob;
  // Pole
  rect(g, tx - 1, ty - 16, 2, 22, COL_SHAFT);
  // Skull
  ellipse(g, tx, ty - 18, 4, 3.5, COL_SKULL);
  ellipse(g, tx, ty - 17, 3.5, 2.5, COL_SKULL_DK);
  // Eye sockets
  circle(g, tx - 1.5, ty - 18, 1, COL_SHADOW);
  circle(g, tx + 1.5, ty - 18, 1, COL_SHADOW);
  // Jaw
  rect(g, tx - 2, ty - 15.5, 4, 1.5, COL_SKULL_DK);
}

/** Legs — wide, powerful */
function drawLegs(g: Graphics, legOff: number, bob: number): void {
  const ly = GY - 14 + bob;
  // Left leg
  rect(g, CX - 7, ly, 5, 10 + legOff, COL_SKIN_DK);
  rect(g, CX - 7, ly + 8 + legOff, 5, 4, COL_BOOT);
  // Right leg
  rect(g, CX + 2, ly, 5, 10 - legOff, COL_SKIN_DK);
  rect(g, CX + 2, ly + 8 - legOff, 5, 4, COL_BOOT);
  // Loincloth
  g.beginPath();
  g.moveTo(CX - 8, ly);
  g.lineTo(CX, ly + 6);
  g.lineTo(CX + 8, ly);
  g.closePath();
  g.fill({ color: COL_LOIN });
}

/** Torso — thick, barrel-chested with leather straps and studs */
function drawTorso(g: Graphics, bob: number): void {
  const ty = GY - 24 + bob;
  // Main body — wide
  g.roundRect(CX - 9, ty, 18, 14, 3).fill({ color: COL_SKIN });
  // Leather chest strap (X pattern)
  line(g, CX - 7, ty + 2, CX + 7, ty + 12, COL_ARMOR, 2);
  line(g, CX + 7, ty + 2, CX - 7, ty + 12, COL_ARMOR, 2);
  // Iron studs at intersections
  circle(g, CX, ty + 7, 1.5, COL_METAL);
  circle(g, CX - 5, ty + 4, 1, COL_METAL);
  circle(g, CX + 5, ty + 4, 1, COL_METAL);
  // Shoulder pads
  g.roundRect(CX - 12, ty - 1, 7, 5, 2).fill({ color: COL_ARMOR });
  g.roundRect(CX + 5, ty - 1, 7, 5, 2).fill({ color: COL_ARMOR });
  circle(g, CX - 8.5, ty + 1.5, 1, COL_METAL);
  circle(g, CX + 8.5, ty + 1.5, 1, COL_METAL);
}

/** Head — broad, fierce, with tusks and war paint */
function drawHead(g: Graphics, bob: number): void {
  const hx = CX;
  const hy = GY - 32 + bob;
  // Neck
  rect(g, hx - 3, hy + 3, 6, 4, COL_SKIN_DK);
  // Head shape — broad and angular
  g.roundRect(hx - 6, hy - 6, 12, 10, 3).fill({ color: COL_SKIN });
  // Brow ridge
  rect(g, hx - 5, hy - 4, 10, 2, COL_SKIN_DK);
  // Eyes — fierce orange
  circle(g, hx - 2.5, hy - 2, 1.5, COL_EYE);
  circle(g, hx + 2.5, hy - 2, 1.5, COL_EYE);
  circle(g, hx - 2.5, hy - 2, 0.7, COL_SHADOW);
  circle(g, hx + 2.5, hy - 2, 0.7, COL_SHADOW);
  // Nose — flat, wide
  rect(g, hx - 1, hy, 2, 2, COL_SKIN_DK);
  // Tusks curving upward from lower jaw
  g.moveTo(hx - 3, hy + 3).quadraticCurveTo(hx - 4, hy - 1, hx - 3, hy - 2)
    .stroke({ color: COL_TUSK, width: 1.5 });
  g.moveTo(hx + 3, hy + 3).quadraticCurveTo(hx + 4, hy - 1, hx + 3, hy - 2)
    .stroke({ color: COL_TUSK, width: 1.5 });
  // War paint — two red streaks under each eye
  line(g, hx - 5, hy - 1, hx - 1, hy + 1, COL_WARPAINT, 1);
  line(g, hx + 1, hy + 1, hx + 5, hy - 1, COL_WARPAINT, 1);
  // Mohawk / top-knot
  g.beginPath();
  g.moveTo(hx - 2, hy - 6);
  g.quadraticCurveTo(hx, hy - 12, hx + 2, hy - 6);
  g.fill({ color: COL_SHADOW });
}

/** Left arm (shield side) */
function drawArmLeft(g: Graphics, bob: number, raised = false): void {
  const ax = CX - 10;
  const ay = GY - 22 + bob;
  if (raised) {
    // Arm raised for attack wind-up
    line(g, ax, ay, ax - 3, ay - 8, COL_SKIN, 4);
    circle(g, ax - 3, ay - 8, 2, COL_SKIN_HI);
  } else {
    line(g, ax, ay, ax - 2, ay + 8, COL_SKIN, 4);
    circle(g, ax - 2, ay + 8, 2, COL_SKIN_HI);
  }
}

/** Right arm (cleaver arm) */
function drawArmRight(g: Graphics, bob: number, angle = 0): void {
  const ax = CX + 10;
  const ay = GY - 22 + bob;
  const handX = ax + Math.sin(angle) * 10;
  const handY = ay - Math.cos(angle) * 10;
  line(g, ax, ay, handX, handY, COL_SKIN, 4);
  circle(g, handX, handY, 2, COL_SKIN_HI);
}

/** The massive cleaver weapon */
function drawCleaver(g: Graphics, bob: number, angle = 0): void {
  const ax = CX + 10;
  const ay = GY - 22 + bob;
  const handX = ax + Math.sin(angle) * 10;
  const handY = ay - Math.cos(angle) * 10;
  // Direction the blade extends
  const bladeX = handX + Math.sin(angle) * 12;
  const bladeY = handY - Math.cos(angle) * 12;
  // Shaft
  line(g, handX, handY, bladeX, bladeY, COL_SHAFT, 2);
  // Blade — wide curved cleaver head
  const perpX = Math.cos(angle) * 5;
  const perpY = Math.sin(angle) * 5;
  g.beginPath();
  g.moveTo(bladeX - perpX, bladeY - perpY);
  g.lineTo(bladeX + Math.sin(angle) * 4, bladeY - Math.cos(angle) * 4);
  g.lineTo(bladeX + perpX, bladeY + perpY);
  g.lineTo(bladeX - perpX * 0.3, bladeY - perpY * 0.3);
  g.closePath();
  g.fill({ color: COL_CLEAVER });
  g.stroke({ color: COL_CLEAVER_DK, width: 0.5 });
  // Edge highlight
  g.moveTo(bladeX - perpX * 0.8, bladeY - perpY * 0.8)
    .lineTo(bladeX + Math.sin(angle) * 3, bladeY - Math.cos(angle) * 3)
    .stroke({ color: COL_CLEAVER_HI, width: 0.5 });
}

// ---------------------------------------------------------------------------
// Full-frame composers per state
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number): void {
  const breathe = Math.sin((frame * Math.PI) / 4) * 1;
  drawShadow(g);
  drawTotem(g, 0, breathe);
  drawLegs(g, 0, 0);
  drawTorso(g, breathe);
  drawArmLeft(g, breathe);
  drawArmRight(g, breathe, 0.3);
  drawCleaver(g, breathe, 0.3);
  drawHead(g, breathe);
}

function drawMove(g: Graphics, frame: number): void {
  const cycle = (frame / 8) * Math.PI * 2;
  const legOff = Math.sin(cycle) * 3;
  const bob = Math.abs(Math.sin(cycle)) * 1.5;
  drawShadow(g);
  drawTotem(g, 0, bob);
  drawLegs(g, legOff, 0);
  drawTorso(g, bob);
  drawArmLeft(g, bob);
  drawArmRight(g, bob, 0.3 + Math.sin(cycle) * 0.15);
  drawCleaver(g, bob, 0.3 + Math.sin(cycle) * 0.15);
  drawHead(g, bob);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 7;
  // Wind-up (0–0.4), strike (0.4–0.7), follow-through (0.7–1)
  let cleaverAngle: number;
  let armRaised = false;
  let bob = 0;
  if (t < 0.4) {
    // Wind up — raise cleaver overhead
    cleaverAngle = 0.3 + t * 5;   // swing back
    armRaised = true;
    bob = -t * 3;
  } else if (t < 0.7) {
    // Strike — slam downward
    const st = (t - 0.4) / 0.3;
    cleaverAngle = 2.3 - st * 3.5; // swing forward
    bob = -1.2 + st * 4;
  } else {
    // Follow through
    const ft = (t - 0.7) / 0.3;
    cleaverAngle = -1.2 + ft * 1.5;
    bob = 2.8 - ft * 2.8;
  }

  drawShadow(g);
  drawTotem(g, 0, bob);
  drawLegs(g, 0, 0);
  drawTorso(g, bob);
  drawArmLeft(g, bob, armRaised);
  drawArmRight(g, bob, cleaverAngle);
  drawCleaver(g, bob, cleaverAngle);
  drawHead(g, bob);

  // Impact flash on the strike frames
  if (t >= 0.45 && t < 0.65) {
    const flashA = 1 - Math.abs(t - 0.55) * 10;
    circle(g, CX + 4, GY - 8, 6 + flashA * 3, 0xffaa00, flashA * 0.5);
  }
}

function drawCast(g: Graphics, frame: number): void {
  // The warchief doesn't cast magic — this is a war cry / rally
  const t = frame / 7;
  const bob = Math.sin(t * Math.PI) * -2;
  const armSpread = t < 0.5 ? t * 2 : 1;

  drawShadow(g);
  drawTotem(g, 0, bob);
  drawLegs(g, 0, 0);
  drawTorso(g, bob);
  // Both arms spread wide
  const lx = CX - 10;
  const ly = GY - 22 + bob;
  line(g, lx, ly, lx - 8 * armSpread, ly - 4, COL_SKIN, 4);
  circle(g, lx - 8 * armSpread, ly - 4, 2, COL_SKIN_HI);
  const rx = CX + 10;
  line(g, rx, ly, rx + 6 * armSpread, ly - 6, COL_SKIN, 4);
  circle(g, rx + 6 * armSpread, ly - 6, 2, COL_SKIN_HI);
  // Cleaver held out to side
  drawCleaver(g, bob, -0.5 + armSpread * 0.8);
  drawHead(g, bob);

  // War cry shockwave rings
  if (t > 0.3) {
    const ringT = (t - 0.3) / 0.7;
    const ringR = 8 + ringT * 14;
    const ringA = (1 - ringT) * 0.4;
    circle(g, CX, GY - 18, ringR, COL_WARPAINT, ringA);
    if (ringT > 0.2) {
      circle(g, CX, GY - 18, ringR * 0.6, COL_EYE, ringA * 0.5);
    }
  }
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fall = t * 8;
  const tilt = t * 0.6;
  const alpha = 1 - t * 0.4;

  g.alpha = alpha;
  drawShadow(g, fall * 0.5, 1 - t * 0.3);

  // Shift everything right as it falls
  const ox = fall;
  const bob = fall * 0.3;

  // Save/restore via container offset
  g.position.set(ox, bob);

  drawLegs(g, 0, 0);
  drawTorso(g, 0);
  drawArmLeft(g, 0);
  drawArmRight(g, 0, 0.3 + tilt * 2);
  drawCleaver(g, 0, 0.3 + tilt * 2);
  drawHead(g, 0);
  drawTotem(g, 0, 0);

  g.position.set(0, 0);
  g.rotation = tilt;
}

// ---------------------------------------------------------------------------
// State → generator map
// ---------------------------------------------------------------------------

const STATE_GENS: Record<UnitState, { gen: (g: Graphics, i: number) => void; count: number }> = {
  [UnitState.IDLE]:   { gen: drawIdle,   count: 8 },
  [UnitState.MOVE]:   { gen: drawMove,   count: 8 },
  [UnitState.ATTACK]: { gen: drawAttack, count: 8 },
  [UnitState.CAST]:   { gen: drawCast,   count: 8 },
  [UnitState.DIE]:    { gen: drawDie,    count: 8 },
};

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function generateWarchiefFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
