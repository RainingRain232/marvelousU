// Procedural sprite generator for the Mage Hunter unit type.
//
// Draws a detailed side-view mage hunter at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Chainmail hauberk with leather over-vest
//   • Flowing dark cape billowing behind
//   • Two shortswords — one in each hand
//   • Open-face leather hood over mail coif
//   • Leather boots and bracers
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F  = 48;          // frame size (px)
const CX = F / 2;       // center X
const GY = F - 4;       // ground Y (feet line)

// Palette
const COL_SKIN       = 0xd4a574;
const COL_SKIN_DK    = 0xb8875a;

const COL_CHAIN      = 0x7a8a9a;
const COL_CHAIN_HI   = 0x9aaaba;
const COL_CHAIN_DK   = 0x5a6a7a;

const COL_VEST       = 0x3a3028;
const COL_VEST_HI    = 0x5a4e40;

const COL_CAPE       = 0x2a2a3a;
const COL_CAPE_DK    = 0x1a1a28;
const COL_CAPE_HI    = 0x3a3a4a;

const COL_HOOD       = 0x3a3028;
const COL_HOOD_HI    = 0x4a4038;
const COL_COIF       = 0x6a7a8a;

const COL_BLADE      = 0xb8c0c8;
const COL_BLADE_HI   = 0xd8e0e8;
const COL_GUARD      = 0x886633;
const COL_GRIP       = 0x443322;
const COL_POMMEL     = 0x664422;

const COL_BRACER     = 0x5a4430;
const COL_BOOT       = 0x3a2a1a;
const COL_BOOT_HI    = 0x4a3a2a;

const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

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

function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.poly(pts);
  g.fill();
}

// ---------------------------------------------------------------------------
// Component drawing
// ---------------------------------------------------------------------------

function drawCape(g: Graphics, x: number, y: number, sway: number): void {
  // Cape billowing behind (drawn first, behind body)
  const sw = sway * 2;
  poly(g, [
    x + 4, y,
    x + 6, y,
    x + 14 + sw, y + 8 + sw * 0.3,
    x + 16 + sw * 1.2, y + 18 + sw * 0.2,
    x + 10 + sw * 0.8, y + 22,
    x + 4, y + 16,
  ], COL_CAPE);
  // Cape fold highlight
  poly(g, [
    x + 5, y + 2,
    x + 6, y + 1,
    x + 12 + sw * 0.8, y + 10 + sw * 0.2,
    x + 8 + sw * 0.5, y + 18,
    x + 5, y + 14,
  ], COL_CAPE_HI);
  // Dark inner fold
  line(g, x + 5, y + 4, x + 9 + sw * 0.6, y + 16, COL_CAPE_DK, 1.5);
}

function drawHead(g: Graphics, x: number, y: number): void {
  // Mail coif (under hood)
  circle(g, x, y, 5.5, COL_COIF);
  // Face
  circle(g, x - 1, y + 1, 4, COL_SKIN);
  // Eye
  circle(g, x - 3, y, 0.8, 0x222222);

  // Leather hood (open-face)
  ellipse(g, x + 1, y - 2, 5.5, 4, COL_HOOD);
  ellipse(g, x + 1.5, y - 2.5, 5, 3.5, COL_HOOD_HI);
  // Hood sides draping down
  rect(g, x + 3, y, 3, 4, COL_HOOD);
  // Coif edge visible at chin
  line(g, x - 4, y + 3, x + 2, y + 4, COL_COIF, 0.8);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Chainmail hauberk
  rect(g, x - 6, y, 12, 12 + breathe * 0.3, COL_CHAIN);
  rect(g, x - 5, y + 1, 10, 1, COL_CHAIN_HI);
  // Chain texture
  line(g, x - 4, y + 4, x + 4, y + 4, COL_CHAIN_HI, 0.5);
  line(g, x - 4, y + 7, x + 4, y + 7, COL_CHAIN_HI, 0.5);
  line(g, x - 4, y + 10, x + 4, y + 10, COL_CHAIN_DK, 0.5);

  // Leather over-vest (sleeveless, open front)
  rect(g, x - 5, y + 1, 3, 10, COL_VEST); // left panel
  rect(g, x + 2, y + 1, 3, 10, COL_VEST); // right panel
  rect(g, x - 4, y + 2, 2, 3, COL_VEST_HI); // left highlight
  rect(g, x + 3, y + 2, 2, 3, COL_VEST_HI); // right highlight
  // Vest bottom trim
  line(g, x - 5, y + 11, x - 2, y + 11, COL_VEST_HI, 0.8);
  line(g, x + 2, y + 11, x + 5, y + 11, COL_VEST_HI, 0.8);

  // Belt
  rect(g, x - 6, y + 11, 12, 2, COL_BRACER);
  line(g, x - 5, y + 11.5, x + 5, y + 11.5, COL_BOOT, 0.8);
  // Belt buckle
  rect(g, x - 1, y + 11, 2, 2, COL_GUARD);
}

function drawSword(g: Graphics, x: number, y: number, angle: number): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const bladeLen = 11;
  const tipX = x + ca * bladeLen;
  const tipY = y + sa * bladeLen;

  // Grip
  const gx = x - ca * 3;
  const gy = y - sa * 3;
  line(g, gx, gy, x, y, COL_GRIP, 2);
  // Pommel
  circle(g, gx, gy, 1.2, COL_POMMEL);
  // Cross-guard
  const pa = angle + Math.PI / 2;
  line(g, x + Math.cos(pa) * 2.5, y + Math.sin(pa) * 2.5,
       x - Math.cos(pa) * 2.5, y - Math.sin(pa) * 2.5, COL_GUARD, 1.5);
  // Blade
  line(g, x, y, tipX, tipY, COL_BLADE, 2);
  line(g, x + 0.3, y - 0.3, tipX + 0.3, tipY - 0.3, COL_BLADE_HI, 0.8);
}

function drawArms(
  g: Graphics, x: number, y: number, breathe: number,
  rightAngle: number, leftAngle: number,
): void {
  // Right arm (chainmail sleeve + bracer)
  const rax = x + 7;
  const ray = y + 3 + breathe * 0.3;
  rect(g, rax, ray, 3, 5, COL_CHAIN);
  rect(g, rax, ray + 4, 3, 3, COL_BRACER); // bracer
  rect(g, rax + 0.5, ray + 4.5, 2, 1, COL_VEST_HI);
  // Hand
  const rfDist = 6;
  const rfX = rax + Math.cos(rightAngle) * rfDist;
  const rfY = ray + 5 + Math.sin(rightAngle) * rfDist;
  line(g, rax + 1, ray + 7, rfX, rfY, COL_CHAIN, 2.5);
  circle(g, rfX, rfY, 1.5, COL_SKIN_DK);

  // Left arm
  const lax = x - 8;
  const lay = y + 3 + breathe * 0.3;
  rect(g, lax, lay, 3, 5, COL_CHAIN);
  rect(g, lax, lay + 4, 3, 3, COL_BRACER);
  rect(g, lax + 0.5, lay + 4.5, 2, 1, COL_VEST_HI);
  // Hand
  const lfX = lax + Math.cos(leftAngle) * rfDist;
  const lfY = lay + 5 + Math.sin(leftAngle) * rfDist;
  line(g, lax + 1, lay + 7, lfX, lfY, COL_CHAIN, 2.5);
  circle(g, lfX, lfY, 1.5, COL_SKIN_DK);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2.5;

  // Front leg
  rect(g, x - 4, y, 4, 8, COL_CHAIN);
  rect(g, x - 5, y + 7 + stride * 0.2, 5, 3, COL_BOOT);
  rect(g, x - 4, y + 7.5 + stride * 0.2, 3, 1, COL_BOOT_HI);

  // Back leg
  rect(g, x + 1, y - stride * 0.3, 4, 8 + stride * 0.3, COL_CHAIN);
  rect(g, x, y + 7, 5, 3, COL_BOOT);
  rect(g, x + 1, y + 7.5, 3, 1, COL_BOOT_HI);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;
  const capeSway = Math.sin(t * Math.PI * 2 + 0.5) * 0.6;

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Cape (behind everything)
  drawCape(g, CX, 14 + breathe, capeSway);

  // Legs
  drawLegs(g, CX, 30, 0);

  // Body
  drawBody(g, CX, 16 + breathe, breathe);

  // Arms
  drawArms(g, CX, 16 + breathe, breathe, -Math.PI * 0.3, -Math.PI * 0.6);

  // Right shortsword (held down at side)
  drawSword(g, CX + 10, 26 + breathe, -Math.PI * 0.25);

  // Left shortsword (reverse grip, angled back)
  drawSword(g, CX - 10, 26 + breathe, -Math.PI * 0.7);

  // Head
  drawHead(g, CX, 10 + breathe);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.8;
  const capeSway = Math.sin(t * Math.PI * 2 + 1) * 1.5;

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Cape (billowing more during movement)
  drawCape(g, CX + sway, 14 + bob, capeSway);

  // Legs
  drawLegs(g, CX + sway, 30, t);

  // Body
  drawBody(g, CX + sway, 16 + bob, bob);

  // Arms (swinging with stride)
  drawArms(g, CX + sway, 16 + bob, bob,
    -Math.PI * 0.3 + sway * 0.08, -Math.PI * 0.6 - sway * 0.08);

  // Swords swaying with run
  drawSword(g, CX + 10 + sway, 26 + bob, -Math.PI * 0.25 + sway * 0.06);
  drawSword(g, CX - 10 + sway, 26 + bob, -Math.PI * 0.7 - sway * 0.06);

  // Head
  drawHead(g, CX + sway, 10 + bob);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;

  // Dual slash: right slash first, left follows
  let rAngle: number;
  let lAngle: number;
  let lean: number;

  if (t < 0.3) {
    // Wind-up: both swords pull back
    const p = t / 0.3;
    rAngle = -Math.PI * 0.25 - p * Math.PI * 0.45;
    lAngle = -Math.PI * 0.7 - p * 0.3;
    lean = -p * 1.5;
  } else if (t < 0.55) {
    // Right sword slashes forward
    const p = (t - 0.3) / 0.25;
    rAngle = -Math.PI * 0.7 + p * Math.PI * 0.75;
    lAngle = -Math.PI * 1.0 + p * 0.2;
    lean = -1.5 + p * 4;
  } else if (t < 0.8) {
    // Left sword follows through
    const p = (t - 0.55) / 0.25;
    rAngle = Math.PI * 0.05 - p * 0.15;
    lAngle = -Math.PI * 0.8 + p * Math.PI * 0.65;
    lean = 2.5 - p * 0.5;
  } else {
    // Recovery
    const p = (t - 0.8) / 0.2;
    rAngle = -Math.PI * 0.1 - p * 0.15;
    lAngle = -Math.PI * 0.15 - p * 0.55;
    lean = 2.0 - p * 2.0;
  }

  const capeSway = Math.sin(t * Math.PI * 3) * 1.5;

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Cape
  drawCape(g, CX + lean * 0.3, 14, capeSway);

  // Legs
  drawLegs(g, CX, 30, 0);

  // Body
  drawBody(g, CX + lean, 16, 0);

  // Arms
  drawArms(g, CX + lean, 16, 0, rAngle, lAngle);

  // Swords
  drawSword(g, CX + 10 + lean, 24, rAngle);
  drawSword(g, CX - 10 + lean * 0.5, 24, lAngle);

  // Head
  drawHead(g, CX + lean, 10);
}

function generateCast(g: Graphics, frame: number): void {
  // Mage Hunter cast = same as attack (dual slash)
  generateAttack(g, frame);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 7;
  const drop = t * 14;
  const fade = 1 - t;

  // Shadow (shrinking)
  ellipse(g, CX, GY, 10 * fade, 3.5 * fade, COL_SHADOW, 0.3 * fade);

  // Cape (crumpling)
  if (t < 0.9) {
    drawCape(g, CX + fall * 0.5, 14 + drop * 0.5, t * 2);
  }

  if (t < 0.85) {
    drawLegs(g, CX + fall * 0.4, 30 + drop * 0.2, 0);
  }

  if (t < 0.75) {
    drawBody(g, CX + fall, 16 + drop, 0);
  }

  if (t < 0.65) {
    drawHead(g, CX + fall * 1.2, 10 + drop * 0.7);
  }

  // Right sword drops
  if (t < 0.7) {
    drawSword(g, CX + 10 + fall * 0.8, 26 + drop * 0.4,
      -Math.PI * 0.25 + t * 1.5);
  }

  // Left sword drops
  if (t < 0.6) {
    drawSword(g, CX - 8 + fall * 0.6, 26 + drop * 0.5,
      -Math.PI * 0.7 - t * 0.8);
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

/**
 * Generate all mage hunter sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateMageHunterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
