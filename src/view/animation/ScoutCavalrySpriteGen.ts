// Procedural sprite generator for the Scout Cavalry unit type.
//
// Draws a detailed side-view light scout rider on a fast courser at
// 96×96 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Side-view lean courser with clipped mane, fast gait
//   • Studded leather armor with fur-lined cloak
//   • Open-face leather helm with cheek guards
//   • Long spear held overhand for thrusting
//   • Small round buckler on left arm
//   • Saddlebags and scout's bedroll
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 96;          // frame width  (px) – 2 tiles wide
const FH = 96;          // frame height (px) – 2 tiles high
const OY = 30;          // vertical offset to center art in frame
const GY = FH - 4;      // ground line Y

// Palette ─ light scout cavalry
const COL_SKIN        = 0xc49868;
const COL_LEATHER     = 0x6a5030;
const COL_LEATHER_HI  = 0x8a7050;
const COL_LEATHER_DK  = 0x4a3018;
const COL_STUDS       = 0x9a8a6a;
const COL_CLOAK       = 0x4a6040;
const COL_CLOAK_HI    = 0x5a7050;
const COL_CLOAK_DK    = 0x3a5030;
const COL_FUR_TRIM    = 0x8a7a68;

const COL_HORSE       = 0x8a6a42;
const COL_HORSE_HI    = 0xaa8a62;
const COL_HORSE_DK    = 0x6a4a22;
const COL_HORSE_BELLY = 0x7a6a4a;
const COL_MANE        = 0x4a3a28;
const COL_HOOF        = 0x2a2218;

const COL_SADDLE      = 0x5a3818;
const COL_SADDLE_DK   = 0x3a2210;
const COL_SADDLEBAG   = 0x5a4a30;
const COL_BEDROLL     = 0x6a7a5a;
const COL_REINS       = 0x4a3a28;

const COL_SPEAR_SHAFT = 0x7a6040;
const COL_SPEAR_HI    = 0x9a8060;
const COL_SPEAR_TIP   = 0xb8c0c8;
const COL_SPEAR_TIP_HI = 0xd8e0e8;

const COL_BUCKLER     = 0x557744;
const COL_BUCKLER_RIM = 0x886644;
const COL_BUCKLER_BOSS = 0xaa9966;

const COL_SHADOW      = 0x000000;

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
// Horse (side-view, facing left – lean fast courser)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.8;
  const by = oy + bob;

  // ── Legs (long, slender – built for speed) ───────────────────────────
  const legLen = 14;
  const legW = 2.5;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 5;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 5;

  // Back legs
  const blx = ox + 9;
  rect(g, blx - 1, by + 6, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 6 + legLen + kneeOff2, legW + 0.5, 2, COL_HOOF);
  rect(g, blx + 3, by + 6, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 6 + legLen + kneeOff, legW + 0.5, 2, COL_HOOF);

  // Front legs
  const flx = ox - 13;
  rect(g, flx - 1, by + 5, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 5 + legLen + kneeOff, legW + 0.5, 2, COL_HOOF);
  rect(g, flx + 3, by + 5, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 5 + legLen + kneeOff2, legW + 0.5, 2, COL_HOOF);

  // ── Barrel (body – lean, athletic) ───────────────────────────────────
  ellipse(g, ox, by, 18, 8, COL_HORSE);
  ellipse(g, ox, by + 2, 15, 5, COL_HORSE_BELLY);
  ellipse(g, ox, by - 3, 14, 4, COL_HORSE_HI);

  // ── Tail (short-docked, practical) ───────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 18;
  const ty = by - 1;
  g.stroke({ color: COL_MANE, width: 2.5 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 4, ty + tailSway, tx + 6, ty + 5 + tailSway, tx + 5, ty + 10);

  // ── Saddlebags ───────────────────────────────────────────────────────
  // Near side saddlebag
  poly(g, [
    ox + 4, by + 2,
    ox + 10, by + 2,
    ox + 10, by + 8,
    ox + 4, by + 8,
  ], COL_SADDLEBAG, 0.85);
  // Bag flap
  rect(g, ox + 4, by + 2, 6, 2, COL_LEATHER_DK, 0.8);
  // Buckle
  rect(g, ox + 6, by + 3, 1.5, 1.5, COL_STUDS);

  // ── Bedroll (strapped behind saddle) ─────────────────────────────────
  ellipse(g, ox + 2, by - 9, 4, 2.5, COL_BEDROLL);
  // Straps
  line(g, ox, by - 9, ox + 4, by - 9, COL_LEATHER_DK, 0.8);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 16;
  const ny = by - 5 + tilt * 2;
  poly(g, [
    ox - 12, by - 7,
    nx, ny - 8,
    nx + 6, ny - 11,
    ox - 7, by - 9,
  ], COL_HORSE);
  line(g, nx + 2, ny - 10, ox - 8, by - 8, COL_HORSE_HI, 1.5);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 3;
  const hy = ny - 10 + tilt * 2;
  // Skull
  ellipse(g, hx, hy, 7, 4.5, COL_HORSE);
  // Muzzle
  ellipse(g, hx - 5, hy + 1.5, 3.5, 2.5, COL_HORSE_HI);
  // Nostril (flared – alert)
  circle(g, hx - 7, hy + 2, 1, COL_HORSE_DK);
  // Eye (wide, alert)
  circle(g, hx - 1, hy - 2, 1.8, 0x221100);
  circle(g, hx - 1.5, hy - 2.5, 0.6, 0xffffff);
  // Ears (pricked forward, alert)
  poly(g, [hx + 2, hy - 4, hx + 1, hy - 9, hx + 4, hy - 5], COL_HORSE_DK);
  poly(g, [hx - 1, hy - 4, hx - 2, hy - 9, hx + 1, hy - 5], COL_HORSE_DK);

  // ── Clipped mane (short, practical) ──────────────────────────────────
  for (let i = 0; i < 5; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 10 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.8) * 1;
    line(g, mx, my, mx + maneWave, my + 3, COL_MANE, 2);
  }

  // ── Bridle (simple) ──────────────────────────────────────────────────
  line(g, hx - 4, hy + 2, hx + 3, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 3, hy - 1).bezierCurveTo(nx + 6, ny - 3, ox - 12, by - 3, ox - 10, by - 1);

  // ── Saddle (light, practical) ────────────────────────────────────────
  ellipse(g, ox - 2, by - 9, 7, 3, COL_SADDLE);
  rect(g, ox - 9, by - 11, 3, 4, COL_SADDLE_DK);
  rect(g, ox + 2, by - 10, 3, 3, COL_SADDLE_DK);
  // Stirrup
  line(g, ox - 4, by - 7, ox - 6, by + 3, COL_SADDLE_DK, 1);
  rect(g, ox - 8, by + 2, 4, 2, COL_LEATHER_DK);
}

// ---------------------------------------------------------------------------
// Rider (scout, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, spearAngle: number, spearExt: number): void {
  const rb = breathe;

  // ── Cloak (billowing behind – draw first) ────────────────────────────
  const tx = ox - 2;
  const ty = oy - 10 + rb;
  const cloakWave = Math.sin(breathe * 3 + 0.5) * 2;
  poly(g, [
    tx + 5, ty + 2,
    tx + 14 + cloakWave, ty + 4,
    tx + 16 + cloakWave, ty + 16,
    tx + 6, ty + 14,
  ], COL_CLOAK, 0.85);
  // Cloak highlight
  poly(g, [
    tx + 6, ty + 3,
    tx + 12 + cloakWave, ty + 5,
    tx + 13 + cloakWave, ty + 10,
    tx + 7, ty + 9,
  ], COL_CLOAK_HI, 0.5);
  // Cloak edge
  line(g, tx + 14 + cloakWave, ty + 4, tx + 16 + cloakWave, ty + 16, COL_CLOAK_DK, 1.5);

  // ── Legs (in stirrups, riding boots) ─────────────────────────────────
  rect(g, ox - 7, oy + 2, 3.5, 10, COL_LEATHER);
  rect(g, ox - 7, oy + 2, 3.5, 2, COL_LEATHER_HI);
  // Riding boot (tall, practical)
  rect(g, ox - 8, oy + 10, 4.5, 4, COL_LEATHER_DK);
  // Boot strap
  line(g, ox - 8, oy + 12, ox - 3.5, oy + 12, COL_STUDS, 0.8);

  // ── Torso ────────────────────────────────────────────────────────────
  // Studded leather jerkin
  rect(g, tx - 5, ty, 12, 13, COL_LEATHER);
  // Stud rows
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = tx - 3 + col * 3;
      const sy = ty + 2 + row * 3;
      circle(g, sx, sy, 0.7, COL_STUDS);
    }
  }
  // Center seam
  line(g, tx + 1, ty, tx + 1, ty + 13, COL_LEATHER_HI, 0.8);
  // Leather highlight
  rect(g, tx - 4, ty + 1, 10, 1.5, COL_LEATHER_HI);

  // Fur-lined collar
  ellipse(g, tx + 1, ty, 7, 2.5, COL_FUR_TRIM);
  // Fur texture
  for (let i = 0; i < 5; i++) {
    line(g, tx - 4 + i * 2, ty - 1, tx - 3 + i * 2, ty + 1, COL_LEATHER_HI, 0.6);
  }

  // Belt with pouches
  rect(g, tx - 5, ty + 13, 12, 2, COL_LEATHER_DK);
  // Belt buckle
  rect(g, tx, ty + 13, 2, 2, COL_STUDS);
  // Small belt pouch
  rect(g, tx + 3, ty + 12, 3, 3, COL_SADDLEBAG);
  rect(g, tx + 3, ty + 12, 3, 1, COL_LEATHER_DK);

  // ── Shoulders (leather pads) ─────────────────────────────────────────
  ellipse(g, tx - 5, ty + 2, 4, 3, COL_LEATHER_HI);
  ellipse(g, tx + 7, ty + 2, 4, 3, COL_LEATHER);
  // Stud on each shoulder
  circle(g, tx - 5, ty + 2, 1, COL_STUDS);
  circle(g, tx + 7, ty + 2, 1, COL_STUDS);

  // ── Buckler arm (left) ───────────────────────────────────────────────
  rect(g, tx - 8, ty + 4, 3, 7, COL_LEATHER);
  // Bracer
  rect(g, tx - 8, ty + 9, 3, 2, COL_LEATHER_DK);

  // ── Buckler (small round shield) ─────────────────────────────────────
  const bx = tx - 10;
  const bby = ty + 6;
  circle(g, bx, bby, 5, COL_BUCKLER);
  // Rim
  g.stroke({ color: COL_BUCKLER_RIM, width: 1.5 });
  g.circle(bx, bby, 5);
  g.stroke();
  // Boss
  circle(g, bx, bby, 2, COL_BUCKLER_BOSS);
  circle(g, bx, bby, 1, COL_STUDS);

  // ── Spear arm (right) ────────────────────────────────────────────────
  const armX = tx + 8;
  const armY = ty + 5;
  rect(g, armX, ty + 3, 3, 7, COL_LEATHER);
  // Bracer
  rect(g, armX, ty + 8, 3, 2, COL_LEATHER_DK);
  // Forearm following spear angle
  const faDist = 5;
  const faX = armX + Math.cos(spearAngle) * faDist;
  const faY = armY + Math.sin(spearAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_LEATHER, 2.5);
  // Hand
  circle(g, faX, faY, 2, COL_SKIN);

  // ── Long spear ───────────────────────────────────────────────────────
  const sLen = 28 + spearExt;
  const sEndX = faX + Math.cos(spearAngle) * sLen;
  const sEndY = faY + Math.sin(spearAngle) * sLen;

  // Shaft (ash wood)
  line(g, faX, faY, sEndX, sEndY, COL_SPEAR_SHAFT, 2.5);
  line(g, faX, faY - 0.5, sEndX, sEndY - 0.5, COL_SPEAR_HI, 1);

  // Spearhead (leaf-shaped)
  const tipLen = 5;
  const tipX = sEndX + Math.cos(spearAngle) * tipLen;
  const tipY = sEndY + Math.sin(spearAngle) * tipLen;
  // Blade
  const perpX = Math.sin(spearAngle) * 2.5;
  const perpY = -Math.cos(spearAngle) * 2.5;
  poly(g, [
    sEndX, sEndY,
    tipX, tipY,
    sEndX + perpX, sEndY + perpY,
  ], COL_SPEAR_TIP);
  poly(g, [
    sEndX, sEndY,
    tipX, tipY,
    sEndX - perpX, sEndY - perpY,
  ], COL_SPEAR_TIP_HI);
  // Socket
  rect(g, sEndX - Math.cos(spearAngle) * 2 - 1, sEndY - Math.sin(spearAngle) * 2 - 1, 2, 2, COL_STUDS);

  // Butt spike (rear end)
  const buttLen = 8;
  const buttX = faX - Math.cos(spearAngle) * buttLen;
  const buttY = faY - Math.sin(spearAngle) * buttLen;
  line(g, faX, faY, buttX, buttY, COL_SPEAR_SHAFT, 2.5);
  // Small metal cap
  circle(g, buttX, buttY, 1.5, COL_STUDS);

  // ── Head (open-face leather helm) ────────────────────────────────────
  const headX = tx + 1;
  const headY = ty - 6 + rb;

  // Face
  circle(g, headX, headY, 4.5, COL_SKIN);
  // Eye
  circle(g, headX - 3, headY - 1, 1, 0x332200);
  circle(g, headX - 3.3, headY - 1.3, 0.3, 0xffffff);
  // Slight smile/determined look
  line(g, headX - 3, headY + 1.5, headX - 1, headY + 1, COL_LEATHER_DK, 0.5);

  // Leather helm (open face)
  ellipse(g, headX, headY - 2, 5.5, 4, COL_LEATHER);
  ellipse(g, headX, headY - 2, 4.5, 3, COL_LEATHER_HI);
  // Nasal guard
  rect(g, headX - 4.5, headY - 3, 1.5, 5, COL_LEATHER_DK);
  // Cheek guards
  poly(g, [
    headX - 4, headY,
    headX - 5, headY + 3,
    headX - 3, headY + 4,
    headX - 2, headY + 1,
  ], COL_LEATHER);
  poly(g, [
    headX + 3, headY,
    headX + 4, headY + 3,
    headX + 2, headY + 4,
    headX + 1, headY + 1,
  ], COL_LEATHER);
  // Chin strap
  line(g, headX - 3, headY + 4, headX + 2, headY + 4, COL_LEATHER_DK, 0.8);
  // Helm rivets
  circle(g, headX - 3, headY - 4, 0.6, COL_STUDS);
  circle(g, headX + 3, headY - 4, 0.6, COL_STUDS);
  circle(g, headX, headY - 5, 0.6, COL_STUDS);

  // ── Scout feather (small, practical) ─────────────────────────────────
  const featherWave = Math.sin(breathe * 3 + 1) * 1;
  g.stroke({ color: COL_CLOAK_DK, width: 1.5 });
  g.moveTo(headX + 2, headY - 5).bezierCurveTo(
    headX + 5, headY - 10,
    headX + 7 + featherWave, headY - 13,
    headX + 9 + featherWave, headY - 11
  );
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.7;
  const gait = frame * 0.05;

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, 0);
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.4, breathe, -Math.PI * 0.38, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2.5;

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.35);
  const sAngle = -Math.PI * 0.38 + Math.sin(gait * Math.PI * 2) * 0.08;
  drawRider(g, 44, OY + 14 + horseBob, breathe, sAngle, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  // Pull back (0-0.3), thrust (0.3-0.6), hold (0.6-0.8), recover (0.8-1)
  let spearAngle: number;
  let spearExt: number;
  let lean: number;

  if (t < 0.3) {
    // Pull back
    const p = t / 0.3;
    spearAngle = -Math.PI * 0.38 - p * 0.15;
    spearExt = -p * 3;
    lean = 0;
  } else if (t < 0.6) {
    // Thrust forward
    const p = (t - 0.3) / 0.3;
    spearAngle = -Math.PI * 0.53 + p * (Math.PI * 0.53 - Math.PI * 0.08);
    spearExt = -3 + p * 10;
    lean = p * 4;
  } else if (t < 0.8) {
    // Hold at full extension
    spearAngle = -Math.PI * 0.08;
    spearExt = 7;
    lean = 4;
  } else {
    // Recover
    const p = (t - 0.8) / 0.2;
    spearAngle = -Math.PI * 0.08 - p * 0.3;
    spearExt = 7 - p * 7;
    lean = 4 - p * 4;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2;

  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48 - lean * 0.5, OY + 24, t * 2, -0.2);
  drawRider(g, 44 - lean, OY + 14 + horseSurge * 0.3, 0, spearAngle, spearExt);
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  ellipse(g, 44, GY, 22 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.4, stumble, fallAngle * 2);
  }

  if (t < 0.95) {
    drawRider(g, 44 + slideX, OY + 14 + dropY, 0, -Math.PI * 0.5 - fallAngle, 0);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 7 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

/**
 * Generate all scout cavalry sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateScoutCavalryFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
