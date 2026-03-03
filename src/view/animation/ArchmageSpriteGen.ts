// Procedural sprite generator for the Archmage (Adept faction unit).
// An elegant, powerful mage in layered arcane robes with floating rune
// sigils, a crystal-topped staff, and swirling magical energy.  48×48 px.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — deep purple / arcane tones
const COL_ROBE       = 0x4422aa;   // deep purple robe
const COL_ROBE_DK    = 0x331188;
const COL_ROBE_LT    = 0x6644cc;
const COL_TRIM       = 0xddaa44;   // gold trim
const COL_SASH       = 0xcc8833;   // golden sash
const COL_SKIN       = 0xe8c8a8;   // fair skin
const COL_SKIN_DK    = 0xc8a888;
const COL_HAIR       = 0xcccccc;   // silver-white hair
const COL_BEARD      = 0xdddddd;
const COL_EYE        = 0x44ddff;   // glowing cyan eyes
const COL_STAFF      = 0x5c3d1e;   // dark wood
const COL_CRYSTAL    = 0x88ccff;   // arcane crystal
const COL_CRYSTAL_HI = 0xccffff;
const COL_RUNE       = 0xaa88ff;   // floating rune glyphs
const COL_MAGIC      = 0x7744ff;   // arcane energy
const COL_MAGIC_HI   = 0xbb88ff;
const COL_SANDAL     = 0x553322;
const COL_SHADOW     = 0x000000;
const COL_HAT        = 0x3311aa;
const COL_HAT_TRIM   = 0xddaa44;

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
// Sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, scale = 1): void {
  ellipse(g, CX, GY, 8 * scale, 3, COL_SHADOW, 0.3);
}

/** Floating rune sigils orbiting the mage */
function drawRunes(g: Graphics, bob: number, time: number, intensity = 1): void {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const angle = time + (i * Math.PI * 2) / count;
    const rx = CX + Math.cos(angle) * 12 * intensity;
    const ry = GY - 20 + bob + Math.sin(angle) * 5;
    const a = 0.3 + Math.sin(time * 2 + i) * 0.2;
    // Small diamond-shaped rune
    g.beginPath();
    g.moveTo(rx, ry - 2);
    g.lineTo(rx + 1.5, ry);
    g.lineTo(rx, ry + 2);
    g.lineTo(rx - 1.5, ry);
    g.closePath();
    g.fill({ color: COL_RUNE, alpha: a * intensity });
  }
}

/** Robe — long flowing with folds and gold trim */
function drawRobe(g: Graphics, bob: number, sway = 0): void {
  const ry = GY - 16 + bob;
  // Main robe body
  g.beginPath();
  g.moveTo(CX - 7, ry);
  g.lineTo(CX - 9 + sway, GY);
  g.lineTo(CX + 9 + sway, GY);
  g.lineTo(CX + 7, ry);
  g.closePath();
  g.fill({ color: COL_ROBE });
  // Darker fold down center
  g.beginPath();
  g.moveTo(CX - 1, ry + 2);
  g.lineTo(CX - 2 + sway * 0.5, GY);
  g.lineTo(CX + 2 + sway * 0.5, GY);
  g.lineTo(CX + 1, ry + 2);
  g.closePath();
  g.fill({ color: COL_ROBE_DK });
  // Gold trim at hem
  line(g, CX - 9 + sway, GY - 1, CX + 9 + sway, GY - 1, COL_TRIM, 1);
  // Sandals peeking out
  rect(g, CX - 5 + sway, GY - 2, 3, 2, COL_SANDAL);
  rect(g, CX + 2 + sway, GY - 2, 3, 2, COL_SANDAL);
}

/** Upper body — torso with sash */
function drawTorso(g: Graphics, bob: number): void {
  const ty = GY - 24 + bob;
  // Upper robe
  g.roundRect(CX - 7, ty, 14, 10, 2).fill({ color: COL_ROBE });
  // Lighter panel
  g.roundRect(CX - 4, ty + 1, 8, 8, 1).fill({ color: COL_ROBE_LT });
  // Gold sash across chest
  line(g, CX - 6, ty + 3, CX + 6, ty + 7, COL_SASH, 1.5);
  // Arcane gem on sash
  circle(g, CX, ty + 5, 2, COL_CRYSTAL);
  circle(g, CX, ty + 5, 1, COL_CRYSTAL_HI, 0.7);
}

/** Staff — tall, with crystal on top */
function drawStaff(g: Graphics, bob: number, tilt = 0): void {
  const sx = CX - 9;
  const sy = GY - 34 + bob;
  const bx = sx + Math.sin(tilt) * 3;
  const by = GY - 2;
  // Shaft
  line(g, bx, by, sx, sy, COL_STAFF, 2);
  // Crystal mount
  circle(g, sx, sy, 3.5, COL_CRYSTAL, 0.8);
  circle(g, sx, sy, 2, COL_CRYSTAL_HI, 0.9);
  // Crystal glow
  circle(g, sx, sy, 5, COL_MAGIC, 0.15);
}

/** Head — wise face with pointed hat, silver hair, glowing eyes */
function drawHead(g: Graphics, bob: number): void {
  const hx = CX + 1;
  const hy = GY - 30 + bob;
  // Neck
  rect(g, hx - 2, hy + 3, 4, 3, COL_SKIN_DK);
  // Face
  g.roundRect(hx - 4, hy - 4, 8, 8, 3).fill({ color: COL_SKIN });
  // Glowing eyes
  circle(g, hx - 1.5, hy - 1, 1.2, COL_EYE);
  circle(g, hx + 1.5, hy - 1, 1.2, COL_EYE);
  // Eyebrows
  line(g, hx - 3, hy - 3, hx - 0.5, hy - 2.5, COL_HAIR, 0.8);
  line(g, hx + 0.5, hy - 2.5, hx + 3, hy - 3, COL_HAIR, 0.8);
  // Nose
  line(g, hx, hy, hx, hy + 1.5, COL_SKIN_DK, 0.8);
  // Beard — long and flowing
  g.beginPath();
  g.moveTo(hx - 3, hy + 2);
  g.quadraticCurveTo(hx, hy + 10, hx + 3, hy + 2);
  g.fill({ color: COL_BEARD });
  // Silver hair at sides
  rect(g, hx - 5, hy - 3, 2, 5, COL_HAIR);
  rect(g, hx + 3, hy - 3, 2, 5, COL_HAIR);
  // Pointed wizard hat
  g.beginPath();
  g.moveTo(hx - 6, hy - 3);
  g.lineTo(hx, hy - 16);
  g.lineTo(hx + 6, hy - 3);
  g.closePath();
  g.fill({ color: COL_HAT });
  // Hat brim
  g.beginPath();
  g.moveTo(hx - 7, hy - 3);
  g.quadraticCurveTo(hx, hy - 1, hx + 7, hy - 3);
  g.quadraticCurveTo(hx, hy - 5, hx - 7, hy - 3);
  g.fill({ color: COL_HAT });
  // Hat trim band
  line(g, hx - 6, hy - 4, hx + 6, hy - 4, COL_HAT_TRIM, 1.5);
  // Hat gem
  circle(g, hx, hy - 5, 1.5, COL_CRYSTAL);
  circle(g, hx, hy - 5, 0.8, COL_CRYSTAL_HI);
  // Hat tip — slight curve
  g.moveTo(hx, hy - 16).quadraticCurveTo(hx + 4, hy - 14, hx + 3, hy - 12)
    .stroke({ color: COL_HAT, width: 2 });
}

/** Arms */
function drawArms(g: Graphics, bob: number, castSpread = 0): void {
  const ty = GY - 22 + bob;
  // Left arm (staff hand) — tucked
  line(g, CX - 7, ty, CX - 9, ty + 6, COL_ROBE_LT, 3);
  circle(g, CX - 9, ty + 6, 1.5, COL_SKIN);
  // Right arm — extends during cast
  const rx = CX + 7 + castSpread * 5;
  const ry = ty + 2 - castSpread * 4;
  line(g, CX + 7, ty, rx, ry, COL_ROBE_LT, 3);
  circle(g, rx, ry, 1.5, COL_SKIN);
  // Hand glow when casting
  if (castSpread > 0.3) {
    circle(g, rx, ry, 3 + castSpread * 2, COL_MAGIC, castSpread * 0.4);
  }
}

// ---------------------------------------------------------------------------
// Full frame composers
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number): void {
  const breathe = Math.sin((frame * Math.PI) / 4) * 1;
  const runeTime = (frame / 8) * Math.PI * 2;
  drawShadow(g);
  drawStaff(g, breathe);
  drawRobe(g, breathe);
  drawTorso(g, breathe);
  drawArms(g, breathe);
  drawHead(g, breathe);
  drawRunes(g, breathe, runeTime, 0.6);
}

function drawMove(g: Graphics, frame: number): void {
  const cycle = (frame / 8) * Math.PI * 2;
  const bob = Math.abs(Math.sin(cycle)) * 1.5;
  const sway = Math.sin(cycle) * 1;
  const runeTime = (frame / 8) * Math.PI * 2;
  drawShadow(g);
  drawStaff(g, bob, Math.sin(cycle) * 0.1);
  drawRobe(g, bob, sway);
  drawTorso(g, bob);
  drawArms(g, bob);
  drawHead(g, bob);
  drawRunes(g, bob, runeTime, 0.8);
}

function drawAttack(g: Graphics, frame: number): void {
  const t = frame / 7;
  const bob = Math.sin(t * Math.PI) * -1;
  // Arm extends forward to cast bolt
  const castSpread = t < 0.4 ? t * 2.5 : (1 - t) * 1.67;
  const runeTime = (frame / 8) * Math.PI * 2;

  drawShadow(g);
  drawStaff(g, bob);
  drawRobe(g, bob);
  drawTorso(g, bob);
  drawArms(g, bob, castSpread);
  drawHead(g, bob);
  drawRunes(g, bob, runeTime, 1.2);

  // Arcane bolt forming / launching
  if (t > 0.3 && t < 0.8) {
    const boltT = (t - 0.3) / 0.5;
    const bx = CX + 14 + boltT * 10;
    const by = GY - 24 + bob;
    const boltA = t < 0.6 ? 1 : (1 - (t - 0.6) / 0.2);
    circle(g, bx, by, 3 + boltT * 2, COL_MAGIC, boltA * 0.6);
    circle(g, bx, by, 2, COL_MAGIC_HI, boltA * 0.8);
    // Trail sparks
    for (let i = 0; i < 3; i++) {
      const sx = bx - 3 - i * 3;
      const sy = by + (Math.random() - 0.5) * 4;
      circle(g, sx, sy, 1, COL_RUNE, boltA * 0.4);
    }
  }
}

function drawCast(g: Graphics, frame: number): void {
  const t = frame / 7;
  const bob = -2 + Math.sin(t * Math.PI) * 2;
  const castSpread = Math.min(t * 2, 1);
  const runeTime = (frame / 8) * Math.PI * 4; // faster spin

  drawShadow(g);
  drawStaff(g, bob, -0.1);
  drawRobe(g, bob);
  drawTorso(g, bob);
  // Both arms raised for big spell
  const ty = GY - 22 + bob;
  line(g, CX - 7, ty, CX - 10, ty - 6 * castSpread, COL_ROBE_LT, 3);
  circle(g, CX - 10, ty - 6 * castSpread, 1.5, COL_SKIN);
  line(g, CX + 7, ty, CX + 10, ty - 6 * castSpread, COL_ROBE_LT, 3);
  circle(g, CX + 10, ty - 6 * castSpread, 1.5, COL_SKIN);
  // Hand glows
  if (castSpread > 0.3) {
    circle(g, CX - 10, ty - 6 * castSpread, 3, COL_MAGIC, castSpread * 0.5);
    circle(g, CX + 10, ty - 6 * castSpread, 3, COL_MAGIC, castSpread * 0.5);
  }
  drawHead(g, bob);

  // Arcane circle on ground
  if (t > 0.2) {
    const circleA = Math.min((t - 0.2) / 0.3, 1) * 0.4;
    ellipse(g, CX, GY - 2, 14, 4, COL_MAGIC, circleA);
    ellipse(g, CX, GY - 2, 10, 3, COL_MAGIC_HI, circleA * 0.5);
  }

  // Many fast-orbiting runes
  drawRunes(g, bob, runeTime, 1.5);

  // Energy column above
  if (t > 0.5) {
    const colA = (t - 0.5) / 0.5 * 0.3;
    rect(g, CX - 2, GY - 38 + bob, 4, 20, COL_MAGIC);
    g.rect(CX - 2, GY - 38 + bob, 4, 20).fill({ color: COL_MAGIC, alpha: colA });
  }
}

function drawDie(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fall = t * 6;
  const alpha = 1 - t * 0.5;

  g.alpha = alpha;
  drawShadow(g, 1 - t * 0.3);

  const bob = fall * 0.5;
  g.position.set(fall * 0.5, bob);

  drawStaff(g, 0, t * 0.4);
  drawRobe(g, 0);
  drawTorso(g, 0);
  drawArms(g, 0);
  drawHead(g, 0);

  g.position.set(0, 0);
  g.rotation = t * 0.5;

  // Dissipating magic particles
  if (t > 0.2) {
    const pT = (t - 0.2) / 0.8;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + t * 3;
      const dist = 5 + pT * 15;
      const px = CX + Math.cos(angle) * dist;
      const py = GY - 18 + Math.sin(angle) * dist * 0.5;
      circle(g, px, py, 1.5 - pT, COL_RUNE, (1 - pT) * 0.5);
    }
  }
}

// ---------------------------------------------------------------------------
// State map
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

export function generateArchmageFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
