// Procedural true-dragon sprite generator — side-view, Age of Wonders inspired
// Draws a reptilian dragon seen from the side with scales, wings, long neck/tail
// Frame size: 64×128 pixels (2×3 tile native, do NOT stretch)
import { RenderTexture, Graphics, type Renderer } from "pixi.js";
import { UnitState } from "@/types";
import type { DragonPalette } from "./DragonSpriteGen";

const FRAME_W = 64;
const FRAME_H = 128;

// ---------------------------------------------------------------------------
// Fire Dragon palette – deep crimson / black / ember
// ---------------------------------------------------------------------------
export const PALETTE_FIRE_DRAGON: DragonPalette = {
  body: 0x881111,
  bodyDark: 0x550808,
  wings: 0x772211,
  wingsMembrane: 0x441100,
  belly: 0xdd7733,
  bellyScale: 0xeeaa55,
  fire: 0xff5500,
  ice: 0x000000,
  outline: 0x220000,
  horn: 0x443322,
  claw: 0x111111,
  eye: 0xffaa00,
  eyePupil: 0x220000,
};

// ---------------------------------------------------------------------------
// Ice Dragon palette – midnight blue / crystal / frost
// ---------------------------------------------------------------------------
export const PALETTE_ICE_DRAGON: DragonPalette = {
  body: 0x224488,
  bodyDark: 0x112244,
  wings: 0x335599,
  wingsMembrane: 0x1a3366,
  belly: 0x99bbee,
  bellyScale: 0xbbddff,
  fire: 0x000000,
  ice: 0x99ddff,
  outline: 0x0a1122,
  horn: 0x99aacc,
  claw: 0x223344,
  eye: 0x66ffff,
  eyePupil: 0x001133,
};

// ---------------------------------------------------------------------------
// Public entry point – generate 40 frames (5 states × 8 frames)
// ---------------------------------------------------------------------------
export function generateTrueDragonFrames(
  renderer: Renderer,
  palette: DragonPalette,
  isFrost: boolean,
): RenderTexture[] {
  const frames: RenderTexture[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      frames.push(_createFrame(renderer, palette, state, col, isFrost));
    }
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Frame dispatcher
// ---------------------------------------------------------------------------
function _createFrame(
  renderer: Renderer,
  p: DragonPalette,
  state: UnitState,
  col: number,
  frost: boolean,
): RenderTexture {
  const g = new Graphics();
  g.clear();
  switch (state) {
    case UnitState.IDLE:
      _drawIdle(g, p, col, frost);
      break;
    case UnitState.MOVE:
      _drawWalk(g, p, col, frost);
      break;
    case UnitState.ATTACK:
      _drawAttack(g, p, col, frost);
      break;
    case UnitState.CAST:
      _drawBreath(g, p, col, frost);
      break;
    case UnitState.DIE:
      _drawDie(g, p, col, frost);
      break;
  }
  const tex = RenderTexture.create({ width: FRAME_W, height: FRAME_H });
  renderer.render({ target: tex, container: g });
  g.destroy();
  return tex;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Draw overlapping scales along a curved line */
function _drawScaleRow(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  count: number,
  size: number,
  p: DragonPalette,
) {
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const sx = x0 + (x1 - x0) * t;
    const sy = y0 + (y1 - y0) * t;
    g.fill(i % 2 === 0 ? p.body : p.bodyDark);
    g.ellipse(sx, sy, size, size * 0.6);
    g.fill();
  }
}

/** Draw row of belly plates */
function _drawBellyPlates(
  g: Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  p: DragonPalette,
) {
  const rows = Math.floor(h / 4);
  for (let i = 0; i < rows; i++) {
    const py = cy - h / 2 + i * 4 + 2;
    g.fill(i % 2 === 0 ? p.bellyScale : p.belly);
    g.ellipse(cx, py, w / 2 - 1, 1.8);
    g.fill();
  }
}

/** Draw a single bat-wing from shoulder point */
function _drawWingSide(
  g: Graphics,
  sx: number,
  sy: number,
  flapOff: number,
  p: DragonPalette,
) {
  // Wing bones
  const tipX = sx - 8;
  const tipY = sy - 30 + flapOff;
  const midX = sx - 20;
  const midY = sy - 22 + flapOff * 0.7;
  const elbowX = sx - 14;
  const elbowY = sy - 35 + flapOff;

  // Membrane (filled first, behind bones)
  g.fill(p.wingsMembrane);
  g.moveTo(sx, sy);
  g.lineTo(elbowX, elbowY);
  g.lineTo(midX, midY);
  g.lineTo(sx - 22, sy + 5);
  g.lineTo(sx - 10, sy + 12);
  g.closePath();
  g.fill();

  // Second membrane segment
  g.fill(p.wingsMembrane);
  g.moveTo(elbowX, elbowY);
  g.lineTo(tipX, tipY);
  g.lineTo(tipX + 8, tipY + 12);
  g.lineTo(midX, midY);
  g.closePath();
  g.fill();

  // Bone structure
  g.stroke({ width: 1.5, color: p.wings });
  g.moveTo(sx, sy);
  g.lineTo(elbowX, elbowY);
  g.lineTo(tipX, tipY);
  g.stroke();

  // Finger bones
  g.stroke({ width: 1, color: p.wings });
  g.moveTo(elbowX, elbowY);
  g.lineTo(midX, midY);
  g.moveTo(elbowX, elbowY);
  g.lineTo(sx - 22, sy + 5);
  g.stroke();

  // Claw at wing tip
  g.fill(p.claw);
  g.moveTo(tipX - 1, tipY);
  g.lineTo(tipX - 3, tipY - 4);
  g.lineTo(tipX + 1, tipY);
  g.closePath();
  g.fill();
}

/** Spines along the back / neck */
function _drawSpines(
  g: Graphics,
  pts: [number, number][],
  size: number,
  p: DragonPalette,
) {
  for (const [sx, sy] of pts) {
    g.fill(p.bodyDark);
    g.moveTo(sx, sy);
    g.lineTo(sx - 1.5, sy - size);
    g.lineTo(sx + 1.5, sy);
    g.closePath();
    g.fill();
  }
}

/** Reptilian eye with vertical slit pupil */
function _drawEye(
  g: Graphics,
  ex: number,
  ey: number,
  size: number,
  p: DragonPalette,
) {
  // Sclera
  g.fill(p.eye);
  g.ellipse(ex, ey, size, size * 1.2);
  g.fill();
  // Slit pupil
  g.fill(p.eyePupil);
  g.ellipse(ex, ey, size * 0.3, size * 1.0);
  g.fill();
  // Highlight
  g.fill(0xffffff);
  g.circle(ex + size * 0.3, ey - size * 0.4, size * 0.25);
  g.fill();
}

/** Side-view head with snout, jaw, horns */
function _drawHead(
  g: Graphics,
  hx: number,
  hy: number,
  p: DragonPalette,
  jawOpen: number,
  frost: boolean,
) {
  // Skull
  g.fill(p.body);
  g.ellipse(hx, hy, 9, 7);
  g.fill();

  // Brow ridge
  g.fill(p.bodyDark);
  g.ellipse(hx + 2, hy - 5, 7, 2);
  g.fill();

  // Snout (extends right)
  g.fill(p.body);
  g.moveTo(hx + 6, hy - 3);
  g.lineTo(hx + 16, hy + 1);
  g.lineTo(hx + 14, hy + 4);
  g.lineTo(hx + 6, hy + 3);
  g.closePath();
  g.fill();

  // Snout scales
  g.fill(p.bodyDark);
  g.circle(hx + 10, hy, 1.5);
  g.circle(hx + 13, hy + 1, 1);
  g.fill();

  // Nostril
  g.fill(0x000000);
  g.circle(hx + 14, hy + 1, 1);
  g.fill();

  // Nostril smoke / frost
  if (frost) {
    g.fill(p.ice);
    g.circle(hx + 16, hy, 1.5);
    g.circle(hx + 17, hy - 1, 1);
    g.fill();
  } else {
    g.fill(p.fire);
    g.circle(hx + 16, hy, 1.5);
    g.circle(hx + 17, hy + 1, 1);
    g.fill();
  }

  // Jaw (opens downward based on jawOpen 0-1)
  const jawDrop = jawOpen * 6;
  g.fill(p.bodyDark);
  g.moveTo(hx + 5, hy + 4);
  g.lineTo(hx + 14, hy + 4 + jawDrop * 0.3);
  g.lineTo(hx + 12, hy + 7 + jawDrop);
  g.lineTo(hx + 4, hy + 7 + jawDrop * 0.5);
  g.closePath();
  g.fill();

  // Teeth (upper)
  g.fill(0xeeeedd);
  for (let i = 0; i < 4; i++) {
    const tx = hx + 7 + i * 2;
    g.moveTo(tx, hy + 3 + jawDrop * 0.1);
    g.lineTo(tx + 0.5, hy + 6 + jawDrop * 0.2);
    g.lineTo(tx + 1, hy + 3 + jawDrop * 0.1);
  }
  g.fill();

  // Teeth (lower) visible when jaw open
  if (jawOpen > 0.2) {
    g.fill(0xddddcc);
    for (let i = 0; i < 3; i++) {
      const tx = hx + 8 + i * 2;
      const jy = hy + 7 + jawDrop;
      g.moveTo(tx, jy);
      g.lineTo(tx + 0.5, jy - 3);
      g.lineTo(tx + 1, jy);
    }
    g.fill();
  }

  // Eye
  _drawEye(g, hx + 2, hy - 2, 3, p);

  // Horns (swept back)
  g.fill(p.horn);
  g.moveTo(hx - 3, hy - 5);
  g.lineTo(hx - 10, hy - 14);
  g.lineTo(hx - 5, hy - 6);
  g.closePath();
  g.fill();

  // Second smaller horn
  g.fill(p.horn);
  g.moveTo(hx - 1, hy - 6);
  g.lineTo(hx - 5, hy - 13);
  g.lineTo(hx - 2, hy - 7);
  g.closePath();
  g.fill();

  // Horn ridges
  g.stroke({ width: 0.5, color: p.bodyDark });
  g.moveTo(hx - 5, hy - 8);
  g.lineTo(hx - 4, hy - 9);
  g.moveTo(hx - 7, hy - 10);
  g.lineTo(hx - 6, hy - 11);
  g.stroke();
}

/** A single leg with thigh, shin, claws */
function _drawLeg(
  g: Graphics,
  lx: number,
  ly: number,
  kneeAngle: number,
  p: DragonPalette,
) {
  const kneeX = lx + Math.sin(kneeAngle) * 6;
  const kneeY = ly + 12;
  const footX = kneeX + 2;
  const footY = kneeY + 10;

  // Thigh
  g.fill(p.body);
  g.moveTo(lx - 4, ly);
  g.lineTo(kneeX - 3, kneeY);
  g.lineTo(kneeX + 3, kneeY);
  g.lineTo(lx + 4, ly);
  g.closePath();
  g.fill();

  // Shin
  g.fill(p.body);
  g.moveTo(kneeX - 2, kneeY);
  g.lineTo(footX - 2, footY);
  g.lineTo(footX + 3, footY);
  g.lineTo(kneeX + 3, kneeY);
  g.closePath();
  g.fill();

  // Knee joint
  g.fill(p.bodyDark);
  g.circle(kneeX, kneeY, 3);
  g.fill();

  // Claws (3 forward, 1 back)
  g.fill(p.claw);
  for (let i = 0; i < 3; i++) {
    const cx = footX - 2 + i * 2.5;
    g.moveTo(cx, footY);
    g.lineTo(cx + 0.5, footY + 4);
    g.lineTo(cx + 1.5, footY);
  }
  g.fill();

  // Back claw
  g.fill(p.claw);
  g.moveTo(footX - 2, footY);
  g.lineTo(footX - 4, footY + 2);
  g.lineTo(footX - 1, footY);
  g.fill();
}

/** Front paw / arm — shorter and wider than hind leg, with spread toes */
function _drawFrontPaw(
  g: Graphics,
  px: number,
  py: number,
  reach: number,
  p: DragonPalette,
) {
  // Upper arm
  const elbowX = px + 3 + reach * 0.4;
  const elbowY = py + 8;
  g.fill(p.body);
  g.moveTo(px - 3, py);
  g.lineTo(elbowX - 3, elbowY);
  g.lineTo(elbowX + 3, elbowY);
  g.lineTo(px + 3, py);
  g.closePath();
  g.fill();

  // Forearm
  const pawX = elbowX + 1 + reach * 0.3;
  const pawY = elbowY + 8;
  g.fill(p.body);
  g.moveTo(elbowX - 2, elbowY);
  g.lineTo(pawX - 3, pawY);
  g.lineTo(pawX + 4, pawY);
  g.lineTo(elbowX + 3, elbowY);
  g.closePath();
  g.fill();

  // Elbow joint
  g.fill(p.bodyDark);
  g.circle(elbowX, elbowY, 2.5);
  g.fill();

  // Paw pad (wider than hind foot)
  g.fill(p.bodyDark);
  g.ellipse(pawX, pawY + 1, 4, 2);
  g.fill();

  // Claws (4 spread toes)
  g.fill(p.claw);
  for (let i = 0; i < 4; i++) {
    const cx = pawX - 3 + i * 2.2;
    g.moveTo(cx, pawY + 1);
    g.lineTo(cx + 0.4, pawY + 4 + reach * 0.2);
    g.lineTo(cx + 1.2, pawY + 1);
  }
  g.fill();
}

/** Thick tail curving down-left with spaded tip */
function _drawTail(
  g: Graphics,
  tx: number,
  ty: number,
  sway: number,
  p: DragonPalette,
) {
  // Main tail body
  g.fill(p.body);
  g.moveTo(tx, ty - 5);
  g.quadraticCurveTo(tx - 12 + sway, ty + 15, tx - 18 + sway * 1.5, ty + 35);
  g.quadraticCurveTo(
    tx - 22 + sway * 2,
    ty + 45,
    tx - 20 + sway * 2,
    ty + 50,
  );
  // Return stroke (thinner)
  g.lineTo(tx - 16 + sway * 2, ty + 48);
  g.quadraticCurveTo(tx - 18 + sway * 1.5, ty + 40, tx - 10 + sway, ty + 15);
  g.quadraticCurveTo(tx - 5, ty + 5, tx, ty + 2);
  g.closePath();
  g.fill();

  // Tail spade
  const spadeX = tx - 20 + sway * 2;
  const spadeY = ty + 50;
  g.fill(p.bodyDark);
  g.moveTo(spadeX, spadeY - 2);
  g.lineTo(spadeX - 5, spadeY + 4);
  g.lineTo(spadeX, spadeY + 2);
  g.lineTo(spadeX + 5, spadeY + 4);
  g.closePath();
  g.fill();

  // Tail scales
  _drawScaleRow(
    g,
    tx - 3,
    ty + 5,
    tx - 15 + sway,
    ty + 30,
    5,
    2,
    p,
  );

  // Tail spines
  _drawSpines(
    g,
    [
      [tx - 5, ty + 5],
      [tx - 9 + sway * 0.3, ty + 15],
      [tx - 14 + sway * 0.8, ty + 25],
    ],
    4,
    p,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// IDLE — standing, gentle breathing
// ═══════════════════════════════════════════════════════════════════════════
function _drawIdle(
  g: Graphics,
  p: DragonPalette,
  frame: number,
  frost: boolean,
) {
  const breathe = Math.sin(frame * 0.3) * 1.5;
  const bodyX = 28;
  const bodyY = 68 + breathe;
  const wingFlap = Math.sin(frame * 0.2) * 3;

  // Tail
  _drawTail(g, bodyX - 6, bodyY + 5, Math.sin(frame * 0.15) * 2, p);

  // Back leg (slightly behind)
  _drawLeg(g, bodyX - 4, bodyY + 15, -0.1, p);

  // Body (large oval, side view)
  g.fill(p.body);
  g.ellipse(bodyX, bodyY, 16, 20);
  g.fill();

  // Body scale pattern
  _drawScaleRow(g, bodyX - 8, bodyY - 10, bodyX + 8, bodyY - 5, 6, 3, p);
  _drawScaleRow(g, bodyX - 10, bodyY - 3, bodyX + 6, bodyY + 2, 6, 3, p);
  _drawScaleRow(g, bodyX - 8, bodyY + 5, bodyX + 8, bodyY + 8, 5, 2.5, p);

  // Belly
  g.fill(p.belly);
  g.ellipse(bodyX + 3, bodyY + 8, 10, 12);
  g.fill();
  _drawBellyPlates(g, bodyX + 3, bodyY + 8, 16, 18, p);

  // Neck (curving up-right)
  const neckMidX = bodyX + 8;
  const neckMidY = bodyY - 25 + breathe * 0.5;
  g.fill(p.body);
  g.moveTo(bodyX + 2, bodyY - 15);
  g.quadraticCurveTo(neckMidX, neckMidY - 5, bodyX + 14, bodyY - 38);
  g.lineTo(bodyX + 20, bodyY - 36);
  g.quadraticCurveTo(neckMidX + 6, neckMidY, bodyX + 8, bodyY - 12);
  g.closePath();
  g.fill();

  // Neck scales
  _drawScaleRow(
    g,
    bodyX + 4,
    bodyY - 18,
    bodyX + 14,
    bodyY - 32,
    4,
    2.5,
    p,
  );

  // Neck belly scales
  g.fill(p.belly);
  g.moveTo(bodyX + 7, bodyY - 14);
  g.quadraticCurveTo(neckMidX + 5, neckMidY - 2, bodyX + 19, bodyY - 36);
  g.lineTo(bodyX + 16, bodyY - 37);
  g.quadraticCurveTo(neckMidX + 2, neckMidY + 2, bodyX + 5, bodyY - 12);
  g.closePath();
  g.fill();

  // Back spines (neck + body)
  _drawSpines(
    g,
    [
      [bodyX + 5, bodyY - 30],
      [bodyX + 2, bodyY - 24],
      [bodyX, bodyY - 18],
      [bodyX - 2, bodyY - 12],
      [bodyX - 5, bodyY - 5],
      [bodyX - 7, bodyY + 2],
    ],
    5,
    p,
  );

  // Wing
  _drawWingSide(g, bodyX - 2, bodyY - 12, wingFlap, p);

  // Front paws
  _drawFrontPaw(g, bodyX + 8, bodyY + 5, 0, p);
  _drawFrontPaw(g, bodyX + 2, bodyY + 6, -1, p);

  // Head
  const headX = bodyX + 14;
  const headY = bodyY - 40 + breathe * 0.3;
  _drawHead(g, headX, headY, p, 0, frost);

  // Frost / fire ambient particles
  if (frost) {
    g.fill(p.ice);
    for (let i = 0; i < 3; i++) {
      const px = bodyX + 20 + (frame * 3 + i * 7) % 15;
      const py = headY - 5 + Math.sin(frame * 0.5 + i) * 4;
      g.circle(px, py, 1 + (i % 2) * 0.5);
    }
    g.fill();
  } else if (frame % 3 === 0) {
    g.fill(p.fire);
    g.circle(bodyX + 30, headY + 2, 1.5);
    g.circle(bodyX + 28, headY - 1, 1);
    g.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WALK — legs moving, body bobbing, tail swaying
// ═══════════════════════════════════════════════════════════════════════════
function _drawWalk(
  g: Graphics,
  p: DragonPalette,
  frame: number,
  frost: boolean,
) {
  const cycle = (frame % 8) / 8;
  const bob = Math.sin(cycle * Math.PI * 2) * 2;
  const bodyX = 28;
  const bodyY = 68 + bob;
  const tailSway = Math.sin(cycle * Math.PI * 2) * 4;
  const legPhase = cycle * Math.PI * 2;
  const wingFlap = Math.sin(cycle * Math.PI * 2 + 0.5) * 5;

  // Tail
  _drawTail(g, bodyX - 6, bodyY + 5, tailSway, p);

  // Back leg (offset phase)
  const backKnee = Math.sin(legPhase + Math.PI) * 0.3;
  _drawLeg(g, bodyX - 4 + Math.sin(legPhase + Math.PI) * 2, bodyY + 15, backKnee, p);

  // Body
  g.fill(p.body);
  g.ellipse(bodyX, bodyY, 16, 20);
  g.fill();

  // Body scales
  _drawScaleRow(g, bodyX - 8, bodyY - 10, bodyX + 8, bodyY - 5, 6, 3, p);
  _drawScaleRow(g, bodyX - 10, bodyY - 3, bodyX + 6, bodyY + 2, 6, 3, p);

  // Belly
  g.fill(p.belly);
  g.ellipse(bodyX + 3, bodyY + 8, 10, 12);
  g.fill();
  _drawBellyPlates(g, bodyX + 3, bodyY + 8, 16, 18, p);

  // Neck
  g.fill(p.body);
  g.moveTo(bodyX + 2, bodyY - 15);
  g.quadraticCurveTo(bodyX + 8, bodyY - 28, bodyX + 14, bodyY - 38);
  g.lineTo(bodyX + 20, bodyY - 36);
  g.quadraticCurveTo(bodyX + 14, bodyY - 24, bodyX + 8, bodyY - 12);
  g.closePath();
  g.fill();

  // Neck belly
  g.fill(p.belly);
  g.moveTo(bodyX + 7, bodyY - 14);
  g.quadraticCurveTo(bodyX + 13, bodyY - 26, bodyX + 19, bodyY - 36);
  g.lineTo(bodyX + 16, bodyY - 37);
  g.quadraticCurveTo(bodyX + 10, bodyY - 24, bodyX + 5, bodyY - 12);
  g.closePath();
  g.fill();

  // Spines
  _drawSpines(
    g,
    [
      [bodyX + 5, bodyY - 30],
      [bodyX + 2, bodyY - 24],
      [bodyX, bodyY - 18],
      [bodyX - 2, bodyY - 12],
      [bodyX - 5, bodyY - 5],
    ],
    5,
    p,
  );

  // Wing (slightly flapping while walking)
  _drawWingSide(g, bodyX - 2, bodyY - 12, wingFlap, p);

  // Front paws (walking animation — alternating reach)
  const frontReach = Math.sin(legPhase) * 3;
  _drawFrontPaw(g, bodyX + 8 + Math.sin(legPhase) * 1.5, bodyY + 5, frontReach, p);
  _drawFrontPaw(g, bodyX + 2 + Math.sin(legPhase + Math.PI) * 1.5, bodyY + 6, -frontReach, p);

  // Head
  const headX = bodyX + 14;
  const headY = bodyY - 40 + bob * 0.3;
  _drawHead(g, headX, headY, p, 0, frost);

  // Footstep dust
  if (frame % 4 === 0) {
    g.fill(0x887766);
    g.circle(bodyX + 10, bodyY + 38, 1.5);
    g.circle(bodyX + 5, bodyY + 39, 1);
    g.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK — lunging forward, jaw open wide, claws extended
// ═══════════════════════════════════════════════════════════════════════════
function _drawAttack(
  g: Graphics,
  p: DragonPalette,
  frame: number,
  frost: boolean,
) {
  const progress = frame / 7;
  const lunge = Math.sin(progress * Math.PI) * 8;
  const bodyX = 28;
  const bodyY = 68 - lunge * 0.3;

  // Tail (raised aggressively)
  _drawTail(g, bodyX - 6, bodyY + 3, -3 + progress * 2, p);

  // Back leg (braced)
  _drawLeg(g, bodyX - 5, bodyY + 15, -0.3, p);

  // Body
  g.fill(p.body);
  g.ellipse(bodyX, bodyY, 16, 20);
  g.fill();

  // Body scales
  _drawScaleRow(g, bodyX - 8, bodyY - 10, bodyX + 8, bodyY - 5, 6, 3, p);

  // Belly
  g.fill(p.belly);
  g.ellipse(bodyX + 3, bodyY + 8, 10, 12);
  g.fill();

  // Neck (extended forward for strike)
  const neckExtend = lunge * 0.5;
  g.fill(p.body);
  g.moveTo(bodyX + 2, bodyY - 15);
  g.quadraticCurveTo(
    bodyX + 10 + neckExtend * 0.3,
    bodyY - 30,
    bodyX + 16 + neckExtend,
    bodyY - 42,
  );
  g.lineTo(bodyX + 22 + neckExtend, bodyY - 39);
  g.quadraticCurveTo(
    bodyX + 16 + neckExtend * 0.3,
    bodyY - 25,
    bodyX + 8,
    bodyY - 12,
  );
  g.closePath();
  g.fill();

  // Neck belly
  g.fill(p.belly);
  g.moveTo(bodyX + 7, bodyY - 14);
  g.quadraticCurveTo(
    bodyX + 15 + neckExtend * 0.3,
    bodyY - 27,
    bodyX + 21 + neckExtend,
    bodyY - 39,
  );
  g.lineTo(bodyX + 18 + neckExtend, bodyY - 40);
  g.quadraticCurveTo(
    bodyX + 12 + neckExtend * 0.2,
    bodyY - 25,
    bodyX + 5,
    bodyY - 12,
  );
  g.closePath();
  g.fill();

  // Spines (bristling)
  _drawSpines(
    g,
    [
      [bodyX + 7 + neckExtend * 0.5, bodyY - 34],
      [bodyX + 4, bodyY - 26],
      [bodyX + 1, bodyY - 18],
      [bodyX - 2, bodyY - 12],
      [bodyX - 5, bodyY - 5],
    ],
    6,
    p,
  );

  // Wings spread wide
  g.fill(p.wings);
  g.moveTo(bodyX - 2, bodyY - 12);
  g.lineTo(bodyX - 25, bodyY - 45);
  g.lineTo(bodyX - 30, bodyY - 30);
  g.lineTo(bodyX - 20, bodyY + 5);
  g.lineTo(bodyX - 8, bodyY);
  g.closePath();
  g.fill();

  // Wing membrane
  g.fill(p.wingsMembrane);
  g.moveTo(bodyX - 5, bodyY - 8);
  g.lineTo(bodyX - 22, bodyY - 38);
  g.lineTo(bodyX - 28, bodyY - 25);
  g.lineTo(bodyX - 18, bodyY + 2);
  g.closePath();
  g.fill();

  // Wing bone lines
  g.stroke({ width: 1, color: p.wings });
  g.moveTo(bodyX - 2, bodyY - 12);
  g.lineTo(bodyX - 25, bodyY - 45);
  g.moveTo(bodyX - 10, bodyY - 20);
  g.lineTo(bodyX - 28, bodyY - 28);
  g.moveTo(bodyX - 8, bodyY - 5);
  g.lineTo(bodyX - 20, bodyY + 2);
  g.stroke();

  // Front paws (extended forward for strike)
  _drawFrontPaw(g, bodyX + 8, bodyY + 5, lunge * 0.5, p);
  _drawFrontPaw(g, bodyX + 2, bodyY + 6, lunge * 0.3, p);

  // Head (jaw wide open for bite)
  const headX = bodyX + 16 + neckExtend;
  const headY = bodyY - 44;
  _drawHead(g, headX, headY, p, 0.6 + progress * 0.4, frost);

  // Attack particles
  if (frost) {
    g.fill(p.ice);
    for (let i = 0; i < 4; i++) {
      g.circle(
        headX + 12 + i * 3,
        headY + 2 + Math.sin(i * 1.5) * 3,
        1.5,
      );
    }
    g.fill();
  } else {
    g.fill(p.fire);
    for (let i = 0; i < 4; i++) {
      g.circle(
        headX + 12 + i * 3,
        headY + 1 + Math.sin(i * 1.2) * 3,
        1.5 + Math.sin(frame + i) * 0.5,
      );
    }
    g.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAST (BREATH) — head raised, breath weapon streaming
// ═══════════════════════════════════════════════════════════════════════════
function _drawBreath(
  g: Graphics,
  p: DragonPalette,
  frame: number,
  frost: boolean,
) {
  const progress = frame / 5;
  const bodyX = 28;
  const bodyY = 70;

  // Tail
  _drawTail(g, bodyX - 6, bodyY + 5, -1, p);

  // Back leg
  _drawLeg(g, bodyX - 4, bodyY + 15, -0.1, p);

  // Body
  g.fill(p.body);
  g.ellipse(bodyX, bodyY, 16, 20);
  g.fill();

  _drawScaleRow(g, bodyX - 8, bodyY - 10, bodyX + 8, bodyY - 5, 6, 3, p);

  // Belly
  g.fill(p.belly);
  g.ellipse(bodyX + 3, bodyY + 8, 10, 12);
  g.fill();
  _drawBellyPlates(g, bodyX + 3, bodyY + 8, 16, 18, p);

  // Neck (raised higher, throat exposed — glowing)
  g.fill(p.body);
  g.moveTo(bodyX + 2, bodyY - 15);
  g.quadraticCurveTo(bodyX + 6, bodyY - 32, bodyX + 12, bodyY - 45);
  g.lineTo(bodyX + 19, bodyY - 43);
  g.quadraticCurveTo(bodyX + 14, bodyY - 28, bodyX + 8, bodyY - 12);
  g.closePath();
  g.fill();

  // Neck belly (glowing during breath)
  const glowColor = frost ? p.ice : p.fire;
  g.fill(glowColor);
  g.moveTo(bodyX + 7, bodyY - 14);
  g.quadraticCurveTo(bodyX + 13, bodyY - 30, bodyX + 18, bodyY - 43);
  g.lineTo(bodyX + 15, bodyY - 44);
  g.quadraticCurveTo(bodyX + 10, bodyY - 28, bodyX + 5, bodyY - 12);
  g.closePath();
  g.fill();

  // Spines
  _drawSpines(
    g,
    [
      [bodyX + 3, bodyY - 35],
      [bodyX + 1, bodyY - 28],
      [bodyX - 1, bodyY - 20],
      [bodyX - 3, bodyY - 12],
      [bodyX - 5, bodyY - 5],
    ],
    6,
    p,
  );

  // Wings (raised for dramatic pose)
  _drawWingSide(g, bodyX - 2, bodyY - 12, -8, p);

  // Front paws (braced)
  _drawFrontPaw(g, bodyX + 8, bodyY + 5, 1, p);
  _drawFrontPaw(g, bodyX + 2, bodyY + 6, 0, p);

  // Head (mouth wide open)
  const headX = bodyX + 12;
  const headY = bodyY - 48;
  _drawHead(g, headX, headY, p, 1.0, frost);

  // Breath weapon effect
  const breathLen = 15 + progress * 20;
  if (frost) {
    // Ice crystal beam
    for (let i = 0; i < 12; i++) {
      const bx = headX + 14 + i * 2.5;
      const by = headY + 3 + Math.sin(i * 0.7 + frame * 0.5) * (2 + i * 0.3);
      const sz = 3 - i * 0.2;
      if (bx > headX + 14 + breathLen) break;

      // Crystal shape
      g.fill(p.ice);
      g.moveTo(bx, by - sz);
      g.lineTo(bx + sz * 0.5, by);
      g.lineTo(bx, by + sz);
      g.lineTo(bx - sz * 0.5, by);
      g.closePath();
      g.fill();

      // Inner glow
      g.fill(0xeeffff);
      g.circle(bx, by, sz * 0.25);
      g.fill();
    }
  } else {
    // Fire cone
    g.fill(p.fire);
    g.moveTo(headX + 14, headY + 1);
    g.lineTo(headX + 14 + breathLen, headY - 6 - progress * 4);
    g.lineTo(headX + 14 + breathLen, headY + 10 + progress * 4);
    g.closePath();
    g.fill();

    // Inner fire (yellow)
    g.fill(0xffcc00);
    g.moveTo(headX + 14, headY + 2);
    g.lineTo(headX + 14 + breathLen * 0.7, headY - 2 - progress * 2);
    g.lineTo(headX + 14 + breathLen * 0.7, headY + 7 + progress * 2);
    g.closePath();
    g.fill();

    // White-hot core
    g.fill(0xffffff);
    g.moveTo(headX + 14, headY + 2);
    g.lineTo(headX + 14 + breathLen * 0.35, headY + 1);
    g.lineTo(headX + 14 + breathLen * 0.35, headY + 4);
    g.closePath();
    g.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DIE — collapsing, wings folding
// ═══════════════════════════════════════════════════════════════════════════
function _drawDie(
  g: Graphics,
  p: DragonPalette,
  frame: number,
  frost: boolean,
) {
  const progress = frame / 6;
  const collapse = progress * 30;
  const tilt = progress * 0.25;
  const bodyX = 28;
  const bodyY = 68 + collapse;

  // Tail (limp)
  g.fill(p.body);
  g.moveTo(bodyX - 6, bodyY + 5);
  g.quadraticCurveTo(bodyX - 18, bodyY + 15, bodyX - 22, bodyY + 25);
  g.lineTo(bodyX - 18, bodyY + 23);
  g.quadraticCurveTo(bodyX - 14, bodyY + 12, bodyX - 6, bodyY + 8);
  g.closePath();
  g.fill();

  // Collapsed wing
  g.fill(p.wings);
  g.moveTo(bodyX - 2, bodyY - 8);
  g.lineTo(bodyX - 12, bodyY - 12 + collapse * 0.3);
  g.lineTo(bodyX - 15, bodyY + 5 + collapse * 0.2);
  g.lineTo(bodyX - 5, bodyY + 2);
  g.closePath();
  g.fill();

  // Wing membrane
  g.fill(p.wingsMembrane);
  g.moveTo(bodyX - 4, bodyY - 5);
  g.lineTo(bodyX - 10, bodyY - 8 + collapse * 0.3);
  g.lineTo(bodyX - 12, bodyY + 3 + collapse * 0.2);
  g.lineTo(bodyX - 3, bodyY + 1);
  g.closePath();
  g.fill();

  // Body (tilting)
  const bScale = 1 - progress * 0.15;
  g.fill(p.body);
  g.ellipse(bodyX + tilt * 10, bodyY, 16 * bScale, 20 * bScale);
  g.fill();

  // Belly
  g.fill(p.belly);
  g.ellipse(bodyX + 3 + tilt * 10, bodyY + 8, 10 * bScale, 12 * bScale);
  g.fill();

  // Neck (drooping)
  const headDroop = collapse * 0.6;
  g.fill(p.body);
  g.moveTo(bodyX + 2, bodyY - 12);
  g.quadraticCurveTo(bodyX + 8, bodyY - 15 + headDroop * 0.3, bodyX + 14, bodyY - 10 + headDroop);
  g.lineTo(bodyX + 18, bodyY - 8 + headDroop);
  g.quadraticCurveTo(bodyX + 10, bodyY - 12 + headDroop * 0.3, bodyX + 6, bodyY - 10);
  g.closePath();
  g.fill();

  // Head (drooping)
  const headX = bodyX + 16;
  const headY = bodyY - 10 + headDroop;
  g.fill(p.body);
  g.ellipse(headX, headY, 8 * bScale, 6 * bScale);
  g.fill();

  // Closed eyes (X marks)
  if (progress > 0.3) {
    g.stroke({ width: 1.5, color: p.eyePupil });
    g.moveTo(headX + 1, headY - 3);
    g.lineTo(headX + 4, headY);
    g.moveTo(headX + 4, headY - 3);
    g.lineTo(headX + 1, headY);
    g.stroke();
  } else {
    // Fading eye
    _drawEye(g, headX + 2, headY - 2, 2, p);
  }

  // Tongue
  if (progress > 0.2) {
    g.fill(0x884444);
    g.ellipse(headX + 8, headY + 3 + progress * 3, 4, 2);
    g.fill();
  }

  // Hind legs (crumpled)
  g.fill(p.body);
  g.ellipse(bodyX - 2, bodyY + 18, 4, 6);
  g.ellipse(bodyX + 4, bodyY + 20, 4, 5);
  g.fill();

  // Front paws (splayed out, limp)
  g.fill(p.body);
  g.ellipse(bodyX + 12, bodyY + 10 + headDroop * 0.3, 3, 5);
  g.ellipse(bodyX + 8, bodyY + 12 + headDroop * 0.2, 3, 4);
  g.fill();
  // Paw pads
  g.fill(p.bodyDark);
  g.ellipse(bodyX + 13, bodyY + 14 + headDroop * 0.3, 3, 1.5);
  g.ellipse(bodyX + 9, bodyY + 15 + headDroop * 0.2, 2.5, 1.5);
  g.fill();
  // Limp claws
  g.fill(p.claw);
  for (let i = 0; i < 3; i++) {
    const cx = bodyX + 11 + i * 1.8;
    const cy = bodyY + 15 + headDroop * 0.3;
    g.moveTo(cx, cy);
    g.lineTo(cx + 0.3, cy + 2.5);
    g.lineTo(cx + 1, cy);
  }
  g.fill();

  // Death particles
  if (progress < 0.5) {
    const particleColor = frost ? p.ice : p.fire;
    g.fill(particleColor);
    for (let i = 0; i < 5; i++) {
      g.circle(
        bodyX + Math.sin(i * 2.1) * 15,
        bodyY - 15 - progress * 20 + Math.cos(i * 1.7) * 10,
        1.5,
      );
    }
    g.fill();
  }
}
