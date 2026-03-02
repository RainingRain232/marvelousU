// Procedural sprite generator for the Pikeman unit type.
//
// Draws a detailed side-view pikeman at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Half-plate over chainmail — breastplate, pauldrons, vambraces
//   • Open-face bascinet helm with aventail
//   • Long pike held two-handed (extends beyond frame)
//   • Leaf-shaped pike head with lugs
//   • Leather belt with tassets
//   • Leather boots
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

const COL_CHAIN      = 0x8899aa;
const COL_CHAIN_HI   = 0xa0b0c0;
const COL_PLATE      = 0x99aabb;
const COL_PLATE_HI   = 0xbbccdd;
const COL_PLATE_DK   = 0x6a7a8a;

const COL_HELM       = 0x8a9aaa;
const COL_HELM_HI    = 0xaabbcc;
const COL_HELM_DK    = 0x5a6a7a;
const COL_AVENTAIL   = 0x778899;

const COL_SHAFT      = 0x7a5e38;
const COL_SHAFT_HI   = 0x9a7e58;
const COL_PIKE_HEAD  = 0xc0c8d0;
const COL_PIKE_HI    = 0xe0e8f0;

const COL_BELT       = 0x6a5030;
const COL_BELT_DK    = 0x4a3820;
const COL_BOOT       = 0x443322;
const COL_BOOT_HI    = 0x5a4432;

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

function drawHelm(g: Graphics, x: number, y: number, seed: number): void {
  // Face
  circle(g, x, y + 1, 4, COL_SKIN);
  // Eye
  circle(g, x - 3, y, 0.8, 0x222222);

  // Bascinet helm (pointed top, open face)
  // Bowl
  ellipse(g, x + 1, y - 1, 5.5, 5, COL_HELM);
  ellipse(g, x + 1.5, y - 2, 5, 4, COL_HELM_HI);
  // Pointed apex
  const apexSway = Math.sin(seed * Math.PI * 2) * 0.3;
  poly(g, [x - 1, y - 5.5, x + 1 + apexSway, y - 8, x + 3, y - 5.5], COL_HELM_HI);
  // Brow ridge
  line(g, x - 4, y - 1, x - 1, y - 1, COL_HELM_DK, 1.5);
  // Aventail (chainmail neck guard)
  rect(g, x + 1, y + 3, 6, 3, COL_AVENTAIL);
  line(g, x + 1, y + 4, x + 7, y + 4, COL_CHAIN_HI, 0.7);
  // Chin strap
  line(g, x - 3, y + 2, x - 2, y + 4, COL_BELT_DK, 0.8);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  // Chainmail hauberk base
  rect(g, x - 6, y, 12, 12, COL_CHAIN);
  rect(g, x - 5, y + 1, 10, 1, COL_CHAIN_HI);
  // Chain texture lines
  line(g, x - 4, y + 4, x + 4, y + 4, COL_CHAIN_HI, 0.5);
  line(g, x - 4, y + 7, x + 4, y + 7, COL_CHAIN_HI, 0.5);

  // Breastplate over chainmail
  rect(g, x - 5, y + 1, 10, 8, COL_PLATE);
  rect(g, x - 4, y + 2, 8, 2, COL_PLATE_HI); // upper highlight
  line(g, x, y + 1, x, y + 9, COL_PLATE_HI, 1); // center ridge
  rect(g, x - 4, y + 7, 8, 1, COL_PLATE_DK); // lower shadow

  // Pauldrons (shoulder plates)
  ellipse(g, x - 6, y + 1 + breathe * 0.2, 3.5, 3, COL_PLATE);
  ellipse(g, x - 6, y + 0.5 + breathe * 0.2, 3, 2.5, COL_PLATE_HI);
  ellipse(g, x + 6, y + 1 + breathe * 0.2, 3.5, 3, COL_PLATE);
  ellipse(g, x + 6, y + 0.5 + breathe * 0.2, 3, 2.5, COL_PLATE_HI);

  // Belt with tassets
  rect(g, x - 6, y + 10, 12, 2, COL_BELT);
  rect(g, x - 5, y + 10.5, 10, 1, COL_BELT_DK);
  // Tassets (hanging plates)
  rect(g, x - 5, y + 12, 3, 3, COL_PLATE_DK);
  rect(g, x - 1, y + 12, 3, 3, COL_PLATE_DK);
  rect(g, x + 3, y + 12, 3, 3, COL_PLATE_DK);
  rect(g, x - 4, y + 12, 2, 2, COL_PLATE);
  rect(g, x, y + 12, 2, 2, COL_PLATE);
  rect(g, x + 4, y + 12, 2, 2, COL_PLATE);
}

function drawArms(g: Graphics, x: number, y: number, breathe: number, pikeGrip: number): void {
  // Arms — vambraces (forearm armor) over chainmail sleeves
  // Right arm (rear hand on pike)
  const rax = x + 7;
  const ray = y + 3 + breathe * 0.3;
  rect(g, rax, ray, 3, 5, COL_CHAIN); // sleeve
  rect(g, rax, ray + 3, 3, 4, COL_PLATE_DK); // vambrace
  rect(g, rax + 0.5, ray + 3.5, 2, 1, COL_PLATE); // vambrace highlight
  circle(g, rax + 1, ray + 8, 1.5, COL_SKIN_DK); // hand

  // Left arm (front hand on pike — shifted by grip)
  const lax = x - 8 + pikeGrip * 0.3;
  const lay = y + 3 + breathe * 0.3;
  rect(g, lax, lay, 3, 5, COL_CHAIN);
  rect(g, lax, lay + 3, 3, 4, COL_PLATE_DK);
  rect(g, lax + 0.5, lay + 3.5, 2, 1, COL_PLATE);
  circle(g, lax + 1, lay + 8, 1.5, COL_SKIN_DK);
}

function drawPike(g: Graphics, x: number, y: number, angle: number, ext: number): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const shaftLen = 22 + ext;
  const tipX = x + ca * shaftLen;
  const tipY = y + sa * shaftLen;
  const buttX = x - ca * 8;
  const buttY = y - sa * 8;

  // Shaft
  line(g, buttX, buttY, tipX, tipY, COL_SHAFT, 2.5);
  line(g, buttX + 0.5, buttY - 0.5, tipX + 0.5, tipY - 0.5, COL_SHAFT_HI, 0.8);

  // Pike head — leaf-shaped with lugs
  const headLen = 5;
  const htx = tipX + ca * headLen;
  const hty = tipY + sa * headLen;
  const pa = angle + Math.PI / 2;
  // Blade
  poly(g, [
    tipX + Math.cos(pa) * 2, tipY + Math.sin(pa) * 2,
    htx, hty,
    tipX - Math.cos(pa) * 2, tipY - Math.sin(pa) * 2,
  ], COL_PIKE_HEAD);
  // Highlight
  line(g, tipX, tipY, htx, hty, COL_PIKE_HI, 1);
  // Lugs (cross-pieces at base of head)
  line(g,
    tipX + Math.cos(pa) * 3, tipY + Math.sin(pa) * 3,
    tipX - Math.cos(pa) * 3, tipY - Math.sin(pa) * 3,
    COL_PIKE_HEAD, 1.5,
  );

  // Butt cap
  circle(g, buttX, buttY, 1.5, COL_PLATE_DK);
}

function drawLegs(g: Graphics, x: number, y: number, step: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 2.5;

  // Front leg
  rect(g, x - 4, y, 4, 8, COL_CHAIN); // chainmail legging
  rect(g, x - 3, y + 1, 2, 2, COL_PLATE_DK); // knee cop
  rect(g, x - 5, y + 7 + stride * 0.2, 5, 3, COL_BOOT);
  rect(g, x - 4, y + 7.5 + stride * 0.2, 3, 1, COL_BOOT_HI);

  // Back leg
  rect(g, x + 1, y - stride * 0.3, 4, 8 + stride * 0.3, COL_CHAIN);
  rect(g, x + 2, y + 1 - stride * 0.3, 2, 2, COL_PLATE_DK);
  rect(g, x, y + 7, 5, 3, COL_BOOT);
  rect(g, x + 1, y + 7.5, 3, 1, COL_BOOT_HI);
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
  drawArms(g, CX, 16 + breathe, breathe, 0);

  // Pike (held upright, angled slightly back)
  drawPike(g, CX + 6, 24 + breathe, -Math.PI * 0.42, 0);

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
  drawArms(g, CX + sway, 16 + bob, bob, sway);

  // Pike (angled forward for marching, slight sway)
  drawPike(g, CX + 6 + sway, 24 + bob,
    -Math.PI * 0.38 + sway * 0.04, 0);

  // Helm
  drawHelm(g, CX + sway, 10 + bob, t);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;

  // Pike thrust: pull back → thrust → retract
  let pikeAngle: number;
  let pikeExt: number;
  let lean: number;

  if (t < 0.3) {
    // Pull back
    const p = t / 0.3;
    pikeAngle = -Math.PI * 0.42 + p * 0.15;
    pikeExt = -p * 4;
    lean = -p * 2;
  } else if (t < 0.6) {
    // Thrust forward
    const p = (t - 0.3) / 0.3;
    pikeAngle = -Math.PI * 0.27 - p * Math.PI * 0.08;
    pikeExt = -4 + p * 14;
    lean = -2 + p * 5;
  } else {
    // Retract
    const p = (t - 0.6) / 0.4;
    pikeAngle = -Math.PI * 0.35 - p * 0.07;
    pikeExt = 10 - p * 10;
    lean = 3 - p * 3;
  }

  // Shadow
  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Legs (planted wide)
  drawLegs(g, CX, 30, 0);

  // Body (leaning)
  drawBody(g, CX + lean, 16, 0);

  // Arms (grip shifts with thrust)
  drawArms(g, CX + lean, 16, 0, lean);

  // Pike (thrusting)
  drawPike(g, CX + 6 + lean, 22, pikeAngle, pikeExt);

  // Helm
  drawHelm(g, CX + lean, 10, 0);
}

function generateCast(g: Graphics, frame: number): void {
  // Pikeman cast = same as attack (pike thrust)
  generateAttack(g, frame);
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

  // Pike falls & rotates
  if (t < 0.8) {
    const pa = -Math.PI * 0.42 + t * 1.5;
    drawPike(g, CX + 6 + fall * 0.5, 24 + drop * 0.4, pa, 0);
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
 * Generate all pikeman sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generatePikemanFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
