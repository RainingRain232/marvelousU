// Procedural sprite generator for the Siege Hunter unit type.
//
// Draws a detailed side-view siege hunter on horseback at 96×96 pixels
// per frame using PixiJS Graphics → RenderTexture.  Produces textures
// for every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Side-view dark warhorse with soot-streaked barding
//   • Heavy soot-stained plate armor with sallet helm
//   • Flaming sword – blade wreathed in animated fire
//   • Off-hand torch with flickering flame
//   • Demolition tool belt
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

// Palette ─ soot-stained siege hunter
const COL_ARMOR      = 0x556070;
const COL_ARMOR_HI   = 0x728090;
const COL_ARMOR_DK   = 0x3a4450;
const COL_SOOT       = 0x333344;

const COL_HELM       = 0x5a6575;
const COL_HELM_HI    = 0x788898;
const COL_VISOR      = 0x111122;

const COL_BLADE      = 0xc0c8d0;
const COL_BLADE_HI   = 0xe0e8f0;
const COL_GUARD      = 0x886633;
const COL_GRIP       = 0x553322;

const COL_FIRE1      = 0xff6600;
const COL_FIRE2      = 0xffaa00;
const COL_FIRE3      = 0xffdd44;
const COL_EMBER      = 0xff3300;

const COL_TORCH_WOOD = 0x664422;
const COL_TORCH_WRAP = 0x443311;

const COL_BELT       = 0x4a3828;
const COL_BELT_DK    = 0x3a2818;

const COL_HORSE      = 0x3a3028;
const COL_HORSE_HI   = 0x5a4e40;
const COL_HORSE_DK   = 0x2a201a;
const COL_HORSE_BELLY = 0x4a3e32;
const COL_MANE       = 0x1a1410;
const COL_HOOF       = 0x2a2218;

const COL_BARDING    = 0x444e58;
const COL_BARDING_HI = 0x5e6a76;

const COL_SADDLE     = 0x5a3318;
const COL_SADDLE_DK  = 0x3a2210;
const COL_REINS      = 0x3a2a1a;

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
// Fire / flame drawing
// ---------------------------------------------------------------------------

function drawFlame(g: Graphics, fx: number, fy: number, size: number, seed: number): void {
  const s1 = Math.sin(seed * 3.7) * 1.5;
  const s2 = Math.cos(seed * 2.3) * 1.2;
  const s3 = Math.sin(seed * 5.1) * 1.0;

  ellipse(g, fx + s1, fy - size * 0.6, size * 0.7, size * 1.1, COL_FIRE1, 0.8);
  ellipse(g, fx + s2 * 0.5, fy - size * 0.7, size * 0.5, size * 0.8, COL_FIRE2, 0.85);
  ellipse(g, fx + s3 * 0.3, fy - size * 0.6, size * 0.3, size * 0.55, COL_FIRE3, 0.9);

  const spkY = fy - size * 1.4 - Math.abs(s1) * 2;
  circle(g, fx + s2 * 2, spkY, 0.7, COL_FIRE3, 0.7);
  circle(g, fx - s1 * 1.5, spkY - 1.5, 0.5, COL_EMBER, 0.6);
}

function drawBladeFire(g: Graphics, bx: number, by: number, tx: number, ty: number, seed: number): void {
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.3) / steps;
    const px = bx + (tx - bx) * t;
    const py = by + (ty - by) * t;
    const sz = 3.0 - t * 1.2;
    const off = Math.sin(seed * 4.1 + i * 2.0) * 1.5;
    ellipse(g, px + off * 0.3, py - sz * 0.4 + off * 0.2, sz * 0.6, sz * 0.9, COL_FIRE1, 0.7);
    ellipse(g, px, py - sz * 0.5, sz * 0.35, sz * 0.6, COL_FIRE2, 0.8);
  }
  circle(g, tx, ty, 1.8, COL_FIRE3, 0.6);
}

// ---------------------------------------------------------------------------
// Horse (dark warhorse, side-view facing left)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.5;
  const by = oy + bob;

  // ── Legs ──
  const legLen = 14;
  const legW = 3;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs
  const blx = ox + 10;
  rect(g, blx - 1, by + 6, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 6 + legLen + kneeOff2, legW + 1, 2, COL_HOOF);
  rect(g, blx + 3, by + 6, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 6 + legLen + kneeOff, legW + 1, 2, COL_HOOF);

  // Front legs
  const flx = ox - 14;
  rect(g, flx - 1, by + 5, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 5 + legLen + kneeOff, legW + 1, 2, COL_HOOF);
  rect(g, flx + 3, by + 5, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 5 + legLen + kneeOff2, legW + 1, 2, COL_HOOF);

  // ── Barrel (body) ──
  ellipse(g, ox, by, 20, 10, COL_HORSE);
  ellipse(g, ox, by + 3, 17, 6, COL_HORSE_BELLY);
  ellipse(g, ox, by - 4, 16, 4, COL_HORSE_HI);

  // ── Barding (soot-streaked armor plates) ──
  poly(g, [
    ox - 6, by - 9,
    ox + 16, by - 6,
    ox + 18, by + 4,
    ox + 14, by + 8,
    ox - 2, by + 8,
    ox - 10, by - 2,
  ], COL_BARDING, 0.8);
  line(g, ox - 6, by - 9, ox + 16, by - 6, COL_BARDING_HI, 1.5);
  // Soot streaks on barding
  rect(g, ox + 2, by - 4, 3, 6, COL_SOOT, 0.3);
  rect(g, ox + 8, by - 2, 2, 5, COL_SOOT, 0.25);

  // ── Tail ──
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 20;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 6, ty + tailSway, tx + 10, ty + 6 + tailSway, tx + 8, ty + 12);
  g.stroke({ color: COL_MANE, width: 2 });
  g.moveTo(tx, ty + 1).bezierCurveTo(tx + 4, ty + tailSway + 2, tx + 8, ty + 8 + tailSway, tx + 6, ty + 14);

  // ── Neck ──
  const nx = ox - 18;
  const ny = by - 6 + tilt * 2;
  poly(g, [
    ox - 14, by - 8,
    nx, ny - 10,
    nx + 6, ny - 12,
    ox - 8, by - 10,
  ], COL_HORSE);
  line(g, nx + 2, ny - 11, ox - 10, by - 9, COL_HORSE_HI, 2);

  // ── Head ──
  const hx = nx - 4;
  const hy = ny - 12 + tilt * 2;
  ellipse(g, hx, hy, 8, 5, COL_HORSE);
  ellipse(g, hx - 6, hy + 2, 4, 3, COL_HORSE_HI);
  circle(g, hx - 8, hy + 2, 1, COL_HORSE_DK);
  circle(g, hx - 2, hy - 2, 1.5, 0x111111);
  circle(g, hx - 2.5, hy - 2.5, 0.5, 0xffffff);
  poly(g, [hx + 2, hy - 5, hx + 1, hy - 9, hx + 4, hy - 6], COL_HORSE_DK);

  // ── Mane ──
  for (let i = 0; i < 6; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 12 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 2;
    line(g, mx, my, mx + maneWave - 2, my + 5, COL_MANE, 2);
  }

  // ── Bridle / Reins ──
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle ──
  ellipse(g, ox - 4, by - 10, 8, 3, COL_SADDLE);
  rect(g, ox - 12, by - 12, 3, 5, COL_SADDLE_DK);
  rect(g, ox + 2, by - 11, 3, 4, COL_SADDLE_DK);
  line(g, ox - 6, by - 8, ox - 8, by + 4, COL_SADDLE_DK, 1);
  rect(g, ox - 10, by + 3, 4, 2, COL_ARMOR_DK);
}

// ---------------------------------------------------------------------------
// Rider (soot-stained siege hunter, side-view facing left)
// ---------------------------------------------------------------------------

function drawRider(
  g: Graphics, ox: number, oy: number,
  breathe: number, swordAngle: number, swordExt: number, seed: number,
): void {
  const rb = breathe;

  // ── Leg in stirrup ──
  rect(g, ox - 8, oy + 2, 4, 10, COL_ARMOR);
  rect(g, ox - 8, oy + 2, 4, 2, COL_ARMOR_HI);
  rect(g, ox - 9, oy + 11, 5, 3, COL_ARMOR_DK);

  // ── Torso ──
  const tx = ox - 2;
  const ty = oy - 10 + rb;

  rect(g, tx - 5, ty, 12, 12, COL_ARMOR);
  line(g, tx + 1, ty, tx + 1, ty + 12, COL_ARMOR_HI, 1.5);
  rect(g, tx - 4, ty + 1, 10, 2, COL_ARMOR_HI);
  rect(g, tx - 4, ty + 9, 10, 2, COL_ARMOR_DK);
  // Soot streaks on breastplate
  rect(g, tx - 2, ty + 4, 2, 5, COL_SOOT, 0.3);
  rect(g, tx + 3, ty + 3, 1, 4, COL_SOOT, 0.25);
  // Fauld
  for (let i = 0; i < 3; i++) {
    rect(g, tx - 5 + i * 4, ty + 12, 4, 3, i % 2 === 0 ? COL_ARMOR : COL_ARMOR_DK);
  }

  // ── Demolition tool belt ──
  rect(g, tx - 6, ty + 14, 14, 2, COL_BELT);
  rect(g, tx - 5, ty + 14.5, 12, 1, COL_BELT_DK);
  rect(g, tx - 4, ty + 13, 2, 2, COL_BELT_DK);
  rect(g, tx + 4, ty + 13, 2, 2, COL_BELT_DK);
  circle(g, tx + 5, ty + 13.5, 0.8, COL_ARMOR_HI);

  // ── Pauldrons ──
  ellipse(g, tx - 5, ty + 1, 4, 3.5, COL_ARMOR_HI);
  ellipse(g, tx - 5, ty + 1, 3, 2.5, COL_ARMOR);
  ellipse(g, tx + 7, ty + 1, 4, 3.5, COL_ARMOR);
  ellipse(g, tx + 7, ty + 1, 3, 2.5, COL_ARMOR_DK);

  // ── Torch arm (left) ──
  rect(g, tx - 8, ty + 3, 3, 7, COL_ARMOR);
  rect(g, tx - 8, ty + 9, 3, 3, COL_ARMOR_DK);

  // ── Torch ──
  const torchX = tx - 10;
  const torchY = ty + 4;
  const torchAngle = -Math.PI * 0.65;
  const tLen = 12;
  const tca = Math.cos(torchAngle);
  const tsa = Math.sin(torchAngle);
  const ttx = torchX + tca * tLen;
  const tty = torchY + tsa * tLen;
  line(g, torchX, torchY, ttx, tty, COL_TORCH_WOOD, 3);
  const twx = ttx - tca * 2.5;
  const twy = tty - tsa * 2.5;
  line(g, twx, twy, ttx, tty, COL_TORCH_WRAP, 4);
  drawFlame(g, ttx, tty, 5, seed);

  // ── Sword arm (right) ──
  const armX = tx + 8;
  const armY = ty + 4;
  rect(g, armX, ty + 3, 3, 6, COL_ARMOR);
  const faDist = 6;
  const faX = armX + Math.cos(swordAngle) * faDist;
  const faY = armY + Math.sin(swordAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_ARMOR, 3);
  circle(g, faX, faY, 2, COL_ARMOR_DK);

  // ── Flaming sword ──
  const sLen = 16 + swordExt;
  const sEndX = faX + Math.cos(swordAngle) * sLen;
  const sEndY = faY + Math.sin(swordAngle) * sLen;

  // Blade
  line(g, faX, faY, sEndX, sEndY, COL_BLADE, 2.5);
  line(g, faX, faY - 0.5, sEndX, sEndY - 0.5, COL_BLADE_HI, 1);

  // Cross-guard
  const cgAngle = swordAngle + Math.PI / 2;
  line(g,
    faX + Math.cos(cgAngle) * 4, faY + Math.sin(cgAngle) * 4,
    faX - Math.cos(cgAngle) * 4, faY - Math.sin(cgAngle) * 4,
    COL_GUARD, 2,
  );

  // Grip + pommel
  const gEndX = faX - Math.cos(swordAngle) * 4;
  const gEndY = faY - Math.sin(swordAngle) * 4;
  line(g, faX, faY, gEndX, gEndY, COL_GRIP, 2);
  circle(g, gEndX, gEndY, 1.5, COL_GUARD);

  // Fire wreathing blade
  drawBladeFire(g, faX, faY, sEndX, sEndY, seed);

  // ── Sallet helm ──
  const headX = tx + 1;
  const headY = ty - 7 + rb;

  ellipse(g, headX, headY, 5.5, 6, COL_HELM);
  ellipse(g, headX + 0.5, headY - 1, 5, 5.5, COL_HELM_HI);
  rect(g, headX - 5, headY - 0.5, 7, 1.5, COL_VISOR);
  poly(g, [headX + 3, headY + 3, headX + 7, headY + 2, headX + 6, headY + 4], COL_HELM);
  // Soot marks on helm
  circle(g, headX - 2, headY + 2, 1.5, COL_SOOT, 0.35);
  circle(g, headX + 3, headY - 3, 1, COL_SOOT, 0.25);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.8;
  const gait = frame * 0.05;
  const seed = frame * 0.75;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse
  drawHorse(g, 48, OY + 24, gait, 0);

  // Rider
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.5, breathe, -Math.PI * 0.35, 0, seed);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.6;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;
  const seed = frame * 0.75;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (trotting)
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.3);

  // Rider
  drawRider(g, 44, OY + 14 + horseBob, breathe,
    -Math.PI * 0.35 + Math.sin(gait * Math.PI * 2) * 0.1, 0, seed);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const seed = frame * 1.2;

  let swordAngle: number;
  let swordExt: number;
  let lean: number;

  if (t < 0.35) {
    // Wind up – raise flaming sword overhead
    const p = t / 0.35;
    swordAngle = -Math.PI * 0.35 - p * Math.PI * 0.55;
    swordExt = p * 3;
    lean = 0;
  } else if (t < 0.6) {
    // Slash down with fire burst
    const p = (t - 0.35) / 0.25;
    swordAngle = -Math.PI * 0.9 + p * Math.PI * 0.95;
    swordExt = 3 + p * 4;
    lean = p * 3;
  } else {
    // Follow through
    const p = (t - 0.6) / 0.4;
    swordAngle = Math.PI * 0.05 - p * 0.2;
    swordExt = 7 - p * 5;
    lean = 3 - p * 3;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (charging)
  drawHorse(g, 48 - lean, OY + 24, t * 2, -0.3);

  // Rider
  drawRider(g, 44 - lean, OY + 14 + horseSurge * 0.5, 0, swordAngle, swordExt, seed);

  // Extra fire burst on impact
  if (t > 0.4 && t < 0.65) {
    const burst = (t - 0.4) / 0.25;
    drawFlame(g, 30 - lean, OY + 20, 6 * (1 - burst), seed + 2);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const seed = frame * 1.5;
  const raise = Math.sin(t * Math.PI) * 1.5;
  const gait = frame * 0.05;

  // Shadow
  ellipse(g, 44, GY, 22 + raise, 5 + raise * 0.3, COL_SHADOW, 0.3);

  // Horse
  drawHorse(g, 48, OY + 24, gait, 0);

  // Rider – sword held high, channeling fire
  drawRider(g, 44, OY + 14 - raise, 0, -Math.PI * 0.7, 2, seed);

  // Extra flames radiating from blade
  drawFlame(g, 30, OY + 6 - raise, 5, seed + 1);
  drawFlame(g, 36, OY + 2 - raise, 4, seed + 3);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const seed = frame * 0.8;

  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  // Shadow (shrinking)
  ellipse(g, 44, GY, 22 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  // Horse (stumbling)
  if (t < 0.85) {
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.5, t * 3, fallAngle * 2);
  }

  // Rider (falling off, fire dying)
  if (t < 0.95) {
    drawRider(g, 44 + slideX, OY + 14 + dropY, 0,
      -Math.PI * 0.5 - fallAngle, 0, seed * fade);
  }

  // Dying embers scattered
  if (t > 0.3) {
    const ef = (1 - t) * 0.6;
    circle(g, 38 + slideX * 1.2, OY + 10 + dropY * 0.4, 2 * ef, COL_EMBER, ef);
    circle(g, 50 + slideX * 0.8, OY + 6 + dropY * 0.3, 1.5 * ef, COL_FIRE1, ef * 0.7);
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
 * Generate all siege hunter sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateSiegeHunterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
