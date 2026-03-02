// Procedural sprite generator for the Gladiator unit type.
//
// Draws a detailed side-view retiarius-style gladiator at 48×48 pixels
// per frame using PixiJS Graphics → RenderTexture.  Produces textures
// for every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Muscular build with asymmetric armor — right chest/shoulder plate
//   • Right arm covered in manica (segmented arm guard)
//   • Left arm bare with leather bracer
//   • Gladiator helm (galea) with wide brim and face grill
//   • Trident in right hand
//   • Weighted net (rete) in left hand — thrown during cast
//   • Loincloth / subligaculum
//   • Laced sandals (caligae)
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
const COL_SKIN_HI    = 0xe8c898;

const COL_ARMOR      = 0x889aaa;
const COL_ARMOR_HI   = 0xaabbcc;
const COL_ARMOR_DK   = 0x5c6b7a;
const COL_MANICA     = 0x7a8a9a; // segmented arm guard
const COL_MANICA_HI  = 0x9aacbc;

const COL_HELM       = 0x8090a0;
const COL_HELM_HI    = 0xa0b4c4;
const COL_HELM_DK    = 0x5a6a7a;
const COL_GRILL      = 0x334455;
const COL_CREST      = 0xcc3333;

const COL_LOINCLOTH  = 0x8b2222;
const COL_LOINCLOTH_DK = 0x6b1111;

const COL_BRACER     = 0x7a5a30;

const COL_TRIDENT    = 0xb0b8c0;
const COL_TRIDENT_HI = 0xd0d8e0;
const COL_SHAFT      = 0x664422;
const COL_SHAFT_HI   = 0x886644;

const COL_NET        = 0x9a8860;
const COL_NET_HI     = 0xbbaa77;
const COL_WEIGHT     = 0x555555;

const COL_SANDAL     = 0x8b6f47;
const COL_SANDAL_DK  = 0x6a5030;
const COL_LACE       = 0x9a7f57;

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

function drawHelm(g: Graphics, x: number, y: number, breathe: number): void {
  // Head underneath
  circle(g, x, y, 5, COL_SKIN);

  // Galea helm — wide brim, face grill, crest
  // Bowl
  ellipse(g, x, y - 1, 6, 5.5, COL_HELM);
  ellipse(g, x + 0.5, y - 2, 5.5, 4.5, COL_HELM_HI);
  // Wide brim
  ellipse(g, x, y + 2, 7.5, 2, COL_HELM_DK);
  ellipse(g, x, y + 1.5, 7, 1.5, COL_HELM);
  // Face grill (vertical bars)
  for (let i = -2; i <= 2; i++) {
    line(g, x + i * 1.8 - 2, y - 1, x + i * 1.8 - 2, y + 3, COL_GRILL, 0.8);
  }
  // Horizontal bar
  line(g, x - 6, y + 0.5, x - 1, y + 0.5, COL_GRILL, 1);
  // Crest (red plume running front to back)
  const cWave = Math.sin(breathe * 2 + 1) * 0.8;
  rect(g, x - 2, y - 6, 6, 2.5, COL_CREST);
  rect(g, x - 1, y - 5.5 + cWave * 0.3, 4, 1.5, 0xee4444);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Muscular torso — bare left side, armored right side
  // Base skin
  rect(g, x - 6, y, 12, 11, COL_SKIN);
  // Pec / ab definition
  line(g, x, y + 1, x, y + 9, COL_SKIN_DK, 1); // center line
  rect(g, x - 5, y + 1, 4, 2, COL_SKIN_HI); // left pec highlight
  rect(g, x - 4, y + 5, 3, 1, COL_SKIN_DK); // left ab line
  rect(g, x - 4, y + 7, 3, 1, COL_SKIN_DK);

  // Right chest/shoulder plate (asymmetric armor)
  rect(g, x + 1, y, 6, 8, COL_ARMOR);
  rect(g, x + 2, y + 1, 4, 2, COL_ARMOR_HI);
  rect(g, x + 2, y + 5, 4, 1, COL_ARMOR_DK);
  // Shoulder guard (right)
  ellipse(g, x + 7, y + 1 + breathe * 0.2, 4, 3.5, COL_ARMOR);
  ellipse(g, x + 7, y + 0.5 + breathe * 0.2, 3.5, 2.5, COL_ARMOR_HI);

  // Loincloth / subligaculum
  poly(g, [
    x - 6, y + 10,
    x + 6, y + 10,
    x + 5, y + 15,
    x, y + 16,
    x - 5, y + 15,
  ], COL_LOINCLOTH);
  // Belt
  rect(g, x - 6, y + 9, 12, 2, COL_LOINCLOTH_DK);
  // Fold highlight
  line(g, x, y + 11, x, y + 15, COL_LOINCLOTH_DK, 0.8);
}

function drawArms(
  g: Graphics, x: number, y: number, breathe: number,
  tridentAngle: number, netAngle: number,
): void {
  // ── Right arm (armored manica, holds trident) ──
  const rax = x + 8;
  const ray = y + 3 + breathe * 0.3;
  // Upper arm — manica segments
  for (let i = 0; i < 3; i++) {
    rect(g, rax - 1, ray + i * 2.5, 3.5, 2, i % 2 === 0 ? COL_MANICA : COL_MANICA_HI);
  }
  // Forearm + gauntlet
  const rfDist = 7;
  const rfX = rax + Math.cos(tridentAngle) * rfDist;
  const rfY = ray + 4 + Math.sin(tridentAngle) * rfDist;
  line(g, rax + 1, ray + 6, rfX, rfY, COL_MANICA, 3);
  circle(g, rfX, rfY, 2, COL_ARMOR_DK);

  // ── Left arm (bare with leather bracer, holds net) ──
  const lax = x - 7;
  const lay = y + 3 + breathe * 0.3;
  // Bare upper arm
  rect(g, lax - 1, lay, 3, 6, COL_SKIN);
  rect(g, lax, lay + 1, 1, 3, COL_SKIN_HI);
  // Leather bracer
  rect(g, lax - 1.5, lay + 4, 4, 3, COL_BRACER);
  line(g, lax - 1, lay + 5, lax + 2, lay + 5, COL_SANDAL_DK, 0.7);
  // Forearm + hand
  const lfDist = 6;
  const lfX = lax + Math.cos(netAngle) * lfDist;
  const lfY = lay + 5 + Math.sin(netAngle) * lfDist;
  line(g, lax, lay + 6, lfX, lfY, COL_SKIN, 2.5);
  circle(g, lfX, lfY, 1.5, COL_SKIN_DK);
}

function drawTrident(g: Graphics, x: number, y: number, angle: number, ext: number): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const shaftLen = 16 + ext;
  const tipX = x + ca * shaftLen;
  const tipY = y + sa * shaftLen;

  // Shaft
  line(g, x, y, tipX, tipY, COL_SHAFT, 2);
  line(g, x + 0.5, y - 0.5, tipX + 0.5, tipY - 0.5, COL_SHAFT_HI, 0.7);

  // Three prongs
  const pa = angle + Math.PI / 2;
  const prongLen = 4;
  const spread = 2.5;
  for (let i = -1; i <= 1; i++) {
    const px = tipX + Math.cos(pa) * spread * i;
    const py = tipY + Math.sin(pa) * spread * i;
    const ptx = px + ca * prongLen;
    const pty = py + sa * prongLen;
    line(g, px, py, ptx, pty, COL_TRIDENT, 1.5);
    // Barb
    line(g, ptx, pty, ptx - ca * 1.5 + Math.cos(pa) * 1, pty - sa * 1.5 + Math.sin(pa) * 1, COL_TRIDENT_HI, 1);
  }
}

function drawNet(g: Graphics, x: number, y: number, spread: number, alpha: number): void {
  // Weighted net — diamond mesh pattern
  const sz = 4 + spread * 6;
  const steps = 4;
  const step = sz / steps;

  // Mesh lines
  for (let i = 0; i <= steps; i++) {
    const off = -sz / 2 + i * step;
    line(g, x + off, y - sz / 2, x + off, y + sz / 2, COL_NET, 0.7 * alpha);
    line(g, x - sz / 2, y + off, x + sz / 2, y + off, COL_NET, 0.7 * alpha);
  }
  // Diagonal mesh
  for (let i = 0; i <= steps; i++) {
    const off = -sz / 2 + i * step;
    line(g, x + off, y - sz / 2, x + off + sz / 2, y, COL_NET_HI, 0.5 * alpha);
  }
  // Corner weights
  const wr = 1.2;
  circle(g, x - sz / 2, y - sz / 2, wr, COL_WEIGHT, alpha);
  circle(g, x + sz / 2, y - sz / 2, wr, COL_WEIGHT, alpha);
  circle(g, x - sz / 2, y + sz / 2, wr, COL_WEIGHT, alpha);
  circle(g, x + sz / 2, y + sz / 2, wr, COL_WEIGHT, alpha);
}

function drawNetBundled(g: Graphics, x: number, y: number): void {
  // Bundled net held in hand — coiled rope look
  ellipse(g, x, y, 3, 4, COL_NET);
  ellipse(g, x, y - 1, 2.5, 3, COL_NET_HI, 0.7);
  // Weights dangling
  circle(g, x - 2, y + 3, 1, COL_WEIGHT);
  circle(g, x + 2, y + 3, 1, COL_WEIGHT);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2.5;

  // Front leg
  rect(g, x - 4, y, 4, 9, COL_SKIN);
  rect(g, x - 3, y + 1, 2, 3, COL_SKIN_HI); // quad highlight
  // Sandal
  rect(g, x - 5, y + 8 + stride * 0.2, 5, 2.5, COL_SANDAL);
  rect(g, x - 4, y + 9 + stride * 0.2, 3, 1.5, COL_SANDAL_DK);
  // Laces going up calf
  line(g, x - 3, y + 7, x - 2, y + 5, COL_LACE, 0.7);
  line(g, x - 2, y + 5, x - 3, y + 3, COL_LACE, 0.7);

  // Back leg
  rect(g, x + 1, y - stride * 0.3, 4, 9 + stride * 0.3, COL_SKIN);
  rect(g, x + 2, y + 1 - stride * 0.3, 2, 3, COL_SKIN_DK);
  // Sandal
  rect(g, x, y + 8, 5, 2.5, COL_SANDAL);
  rect(g, x + 1, y + 9, 3, 1.5, COL_SANDAL_DK);
  // Laces
  line(g, x + 2, y + 7, x + 3, y + 5, COL_LACE, 0.7);
  line(g, x + 3, y + 5, x + 2, y + 3, COL_LACE, 0.7);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Legs
  drawLegs(g, CX, 30, 0);

  // Body
  drawBody(g, CX, 16 + breathe, breathe);

  // Arms
  drawArms(g, CX, 16 + breathe, breathe, -Math.PI * 0.3, -Math.PI * 0.5);

  // Trident (right side, angled up)
  drawTrident(g, CX + 10, 22 + breathe, -Math.PI * 0.35, 0);

  // Net bundled (left hand)
  drawNetBundled(g, CX - 10, 26 + breathe);

  // Helm
  drawHelm(g, CX, 10 + breathe, t);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.8;

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Legs
  drawLegs(g, CX + sway, 30, t);

  // Body
  drawBody(g, CX + sway, 16 + bob, bob);

  // Arms
  drawArms(g, CX + sway, 16 + bob, bob,
    -Math.PI * 0.3 + sway * 0.06, -Math.PI * 0.5 - sway * 0.04);

  // Trident (swaying)
  drawTrident(g, CX + 10 + sway, 22 + bob, -Math.PI * 0.33 + sway * 0.05, 0);

  // Net bundled
  drawNetBundled(g, CX - 10 + sway, 26 + bob);

  // Helm
  drawHelm(g, CX + sway, 10 + bob, t);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;

  // Trident thrust: wind-up → thrust → retract
  let tridentAngle: number;
  let tridentExt: number;
  let lean: number;

  if (t < 0.3) {
    // Pull back
    const p = t / 0.3;
    tridentAngle = -Math.PI * 0.35 - p * 0.2;
    tridentExt = -p * 3;
    lean = -p * 2;
  } else if (t < 0.6) {
    // Thrust forward
    const p = (t - 0.3) / 0.3;
    tridentAngle = -Math.PI * 0.55 + p * Math.PI * 0.45;
    tridentExt = -3 + p * 10;
    lean = -2 + p * 5;
  } else {
    // Retract
    const p = (t - 0.6) / 0.4;
    tridentAngle = -Math.PI * 0.1 - p * 0.25;
    tridentExt = 7 - p * 7;
    lean = 3 - p * 3;
  }

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Legs (planted)
  drawLegs(g, CX, 30, 0);

  // Body
  drawBody(g, CX + lean, 16, 0);

  // Arms
  drawArms(g, CX + lean, 16, 0, tridentAngle, -Math.PI * 0.6);

  // Trident (thrusting)
  drawTrident(g, CX + 10 + lean, 20, tridentAngle, tridentExt);

  // Net bundled (held back)
  drawNetBundled(g, CX - 11 + lean * 0.3, 24);

  // Helm
  drawHelm(g, CX + lean, 10, 0);
}

function generateCast(g: Graphics, frame: number): void {
  const t = frame / 5;

  // Net throw: wind-up → throw → net spreads
  let netDist: number;
  let netSpread: number;
  let netAlpha: number;
  let lean: number;

  if (t < 0.3) {
    // Wind-up (pull net back)
    const p = t / 0.3;
    netDist = -p * 3;
    netSpread = 0;
    netAlpha = 1;
    lean = -p * 1.5;
  } else if (t < 0.6) {
    // Release
    const p = (t - 0.3) / 0.3;
    netDist = -3 + p * 18;
    netSpread = p;
    netAlpha = 1;
    lean = -1.5 + p * 3;
  } else {
    // Net deployed, spreading
    const p = (t - 0.6) / 0.4;
    netDist = 15 + p * 4;
    netSpread = 1 + p * 0.5;
    netAlpha = 1 - p * 0.3;
    lean = 1.5 - p * 1.5;
  }

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Legs
  drawLegs(g, CX, 30, 0);

  // Body
  drawBody(g, CX + lean, 16, 0);

  // Arms (left arm extends forward for throw)
  const throwArmAngle = t < 0.3 ? -Math.PI * 0.7 : -Math.PI * 0.2;
  drawArms(g, CX + lean, 16, 0, -Math.PI * 0.35, throwArmAngle);

  // Trident (held passive in right hand)
  drawTrident(g, CX + 10 + lean, 22, -Math.PI * 0.35, 0);

  // Flying net
  if (t > 0.2) {
    const nx = CX - 10 + lean * 0.3 - netDist;
    const ny = 18;
    drawNet(g, nx, ny, netSpread, netAlpha);
  } else {
    // Still held
    drawNetBundled(g, CX - 10 + lean * 0.3, 24);
  }

  // Helm
  drawHelm(g, CX + lean, 10, 0);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 7;
  const drop = t * 14;
  const fade = 1 - t;

  // Shadow (shrinking)
  ellipse(g, CX, GY, 10 * fade, 3.5 * fade, COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    drawLegs(g, CX + fall * 0.4, 30 + drop * 0.2, 0);
  }

  if (t < 0.75) {
    drawBody(g, CX + fall, 16 + drop, 0);
  }

  if (t < 0.65) {
    drawHelm(g, CX + fall * 1.2, 10 + drop * 0.7, 0);
  }

  // Trident falls
  if (t < 0.7) {
    const ta = -Math.PI * 0.35 + t * 1.2;
    drawTrident(g, CX + 10 + fall * 0.6, 22 + drop * 0.4, ta, 0);
  }

  // Net drops
  if (t < 0.6) {
    drawNetBundled(g, CX - 8 + fall * 0.8, 26 + drop * 0.5);
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
 * Generate all gladiator sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateGladiatorFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
