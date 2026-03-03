// Procedural sprite generator for the Hellfire Mortar unit type.
//
// Squat iron mortar on a reinforced platform, 96×96 pixels per frame.
// 2×2 tiles. Lobs flaming pitch at extreme range. siegeOnly.
//
// Visual features:
//   • Heavy squat mortar barrel angled upward
//   • Reinforced wooden/iron platform base
//   • Glowing embers inside barrel
//   • Flaming projectile arc during attack
//   • Cauldron of burning pitch nearby
//   • Two operators — one loading, one firing
//   • Heavy smoke/fire effects

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — hellfire mortar
const COL_IRON       = 0x505058;
const COL_IRON_DK    = 0x303038;
const COL_IRON_HI    = 0x707078;
const COL_WOOD       = 0x6a4e32;
const COL_WOOD_DK    = 0x4a3220;
const COL_WOOD_LT    = 0x8a6e4a;
const COL_FIRE       = 0xff6622;
const COL_FIRE_HI    = 0xffaa44;
const COL_FIRE_DK    = 0xcc3300;
const COL_EMBER      = 0xff4400;
const COL_PITCH      = 0x2a1a0a;
const COL_SMOKE      = 0x888888;
const COL_SMOKE_DK   = 0x555555;
const COL_CAULDRON   = 0x3a3a40;
const COL_CHAIN      = 0x505058;
const COL_ROPE       = 0xb8a880;
const COL_SHADOW     = 0x000000;
const COL_SKIN       = 0xe8b89d;
const COL_TUNIC      = 0x5a2a1a;
const COL_APRON      = 0x4a4a4a;
const COL_HAIR       = 0x3a2818;

// ---------------------------------------------------------------------------
// Drawing helpers
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
// Platform base
// ---------------------------------------------------------------------------

function drawPlatform(g: Graphics, bounce: number): void {
  const py = GY - 4 + bounce;

  // Heavy wooden platform
  rect(g, CX - 28, py, 56, 5, COL_WOOD_DK);
  rect(g, CX - 26, py + 1, 52, 3, COL_WOOD);

  // Iron corner brackets
  rect(g, CX - 28, py, 4, 5, COL_IRON_DK);
  rect(g, CX + 24, py, 4, 5, COL_IRON_DK);

  // Cross beams
  rect(g, CX - 28, py + 5, 56, 3, COL_WOOD_DK);
  // Rivets
  for (let i = 0; i < 6; i++) {
    circle(g, CX - 24 + i * 10, py + 6, 1, COL_IRON_HI);
  }
}

// ---------------------------------------------------------------------------
// Mortar barrel (angled upward)
// ---------------------------------------------------------------------------

function drawMortar(g: Graphics, bounce: number, recoil: number, firePhase: number): void {
  const mx = CX - 4;
  const my = GY - 16 + bounce + recoil * 2;

  // Mortar angle (pointing up-left)
  const angle = -Math.PI * 0.35;
  const barrelLen = 22;
  const barrelW = 10;

  // Barrel body (thick iron tube)
  const tipX = mx + Math.cos(angle) * barrelLen;
  const tipY = my + Math.sin(angle) * barrelLen;
  const perpX = Math.sin(angle) * barrelW / 2;
  const perpY = -Math.cos(angle) * barrelW / 2;

  // Main barrel
  poly(g, [
    mx - perpX, my - perpY,
    mx + perpX, my + perpY,
    tipX + perpX * 1.3, tipY + perpY * 1.3,
    tipX - perpX * 1.3, tipY - perpY * 1.3,
  ], COL_IRON_DK);

  // Barrel highlight
  poly(g, [
    mx - perpX * 0.6, my - perpY * 0.6,
    mx - perpX * 0.2, my - perpY * 0.2,
    tipX - perpX * 0.3, tipY - perpY * 0.3,
    tipX - perpX * 0.8, tipY - perpY * 0.8,
  ], COL_IRON_HI, 0.4);

  // Muzzle ring (wider at mouth)
  const muzzlePerpX = perpX * 1.5;
  const muzzlePerpY = perpY * 1.5;
  poly(g, [
    tipX - muzzlePerpX, tipY - muzzlePerpY,
    tipX + muzzlePerpX, tipY + muzzlePerpY,
    tipX + muzzlePerpX + Math.cos(angle) * 3, tipY + muzzlePerpY + Math.sin(angle) * 3,
    tipX - muzzlePerpX + Math.cos(angle) * 3, tipY - muzzlePerpY + Math.sin(angle) * 3,
  ], COL_IRON);

  // Reinforcement bands
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.3;
    const bx = mx + Math.cos(angle) * barrelLen * t;
    const by = my + Math.sin(angle) * barrelLen * t;
    const bw = barrelW / 2 + i * 0.5;
    const bpx = Math.sin(angle) * bw;
    const bpy = -Math.cos(angle) * bw;
    line(g, bx - bpx, by - bpy, bx + bpx, by + bpy, COL_IRON, 2);
  }

  // Ember glow inside barrel
  if (firePhase > 0) {
    const glowSize = 3 + firePhase * 3;
    circle(g, tipX + Math.cos(angle) * 2, tipY + Math.sin(angle) * 2, glowSize, COL_EMBER, 0.3 + firePhase * 0.3);
    circle(g, tipX + Math.cos(angle) * 2, tipY + Math.sin(angle) * 2, glowSize * 0.5, COL_FIRE_HI, 0.2 + firePhase * 0.2);
  }

  // Trunnion mount (barrel sits on this)
  rect(g, mx - 6, my + 2, 12, 6, COL_IRON_DK);
  rect(g, mx - 4, my + 3, 8, 4, COL_IRON);
  // Pivot bolt
  circle(g, mx, my + 5, 2.5, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Cauldron of burning pitch
// ---------------------------------------------------------------------------

function drawCauldron(g: Graphics, bounce: number, flicker: number): void {
  const cx = CX + 24;
  const cy = GY - 8 + bounce;

  // Tripod legs
  line(g, cx - 5, cy + 6, cx - 8, cy + 12, COL_IRON_DK, 2);
  line(g, cx + 5, cy + 6, cx + 8, cy + 12, COL_IRON_DK, 2);
  line(g, cx, cy + 6, cx, cy + 12, COL_IRON_DK, 2);

  // Cauldron body
  ellipse(g, cx, cy, 8, 5, COL_CAULDRON);
  ellipse(g, cx, cy - 1, 7, 3, COL_IRON_DK);

  // Pitch inside (dark bubbling)
  ellipse(g, cx, cy - 2, 5, 2, COL_PITCH);

  // Fire glow on pitch
  circle(g, cx + flicker, cy - 3, 2, COL_FIRE, 0.5);
  circle(g, cx - 1 + flicker * 0.5, cy - 2, 1.5, COL_FIRE_HI, 0.4);

  // Flames above cauldron
  const flameH = 6 + flicker * 2;
  g.stroke({ color: COL_FIRE, width: 2 });
  g.moveTo(cx - 2, cy - 4).bezierCurveTo(cx - 3, cy - 4 - flameH * 0.5, cx, cy - 4 - flameH, cx + 1, cy - 4 - flameH * 0.7);
  g.stroke({ color: COL_FIRE_HI, width: 1 });
  g.moveTo(cx + 1, cy - 4).bezierCurveTo(cx + 2, cy - 4 - flameH * 0.3, cx + 1, cy - 4 - flameH * 0.6, cx, cy - 4 - flameH * 0.5);

  // Chain to carry
  line(g, cx - 6, cy - 2, cx - 6, cy - 8, COL_CHAIN, 1.5);
  line(g, cx + 6, cy - 2, cx + 6, cy - 8, COL_CHAIN, 1.5);
}

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

function drawOperators(g: Graphics, bounce: number, phase: number): void {
  // Loader (left side)
  const lx = CX - 26;
  const ly = GY - 2 + bounce;
  const loadLean = Math.sin(phase) * 2;

  line(g, lx, ly, lx + loadLean * 0.3, ly - 7, COL_TUNIC, 2);
  line(g, lx + 3, ly, lx + 3 + loadLean * 0.3, ly - 7, COL_TUNIC, 2);
  rect(g, lx - 1 + loadLean, ly - 14, 5, 8, COL_APRON);
  // Arms carrying pitch ball
  line(g, lx - 1 + loadLean, ly - 12, lx + 8, ly - 14, COL_SKIN, 2);
  circle(g, lx + 0.5 + loadLean, ly - 16, 2.5, COL_SKIN);
  ellipse(g, lx + 0.5 + loadLean, ly - 18, 2.5, 2, COL_HAIR);

  // Firer (right side, near cauldron)
  const rx = CX + 14;
  const ry = GY - 2 + bounce;
  const fireLean = Math.sin(phase + Math.PI * 0.5) * 1.5;

  line(g, rx, ry, rx + fireLean * 0.3, ry - 7, COL_TUNIC, 2);
  line(g, rx + 3, ry, rx + 3 + fireLean * 0.3, ry - 7, COL_TUNIC, 2);
  rect(g, rx - 1 + fireLean, ry - 14, 5, 8, COL_TUNIC);
  // Arm with long ladle
  const ladleX = rx - 2 + fireLean;
  const ladleY = ry - 12;
  line(g, ladleX, ladleY, ladleX - 10, ladleY - 6, COL_WOOD_DK, 2);
  circle(g, ladleX - 10, ladleY - 5, 2.5, COL_IRON_DK);
  circle(g, rx + 1 + fireLean, ry - 16, 2.5, COL_SKIN);
  ellipse(g, rx + 1 + fireLean, ry - 18, 2.5, 2, COL_HAIR);
}

// ---------------------------------------------------------------------------
// Flaming projectile (for attack frames)
// ---------------------------------------------------------------------------

function drawFlamingProjectile(g: Graphics, x: number, y: number, size: number): void {
  // Pitch ball
  circle(g, x, y, size, COL_PITCH);
  // Flames wrapping around
  circle(g, x, y, size + 2, COL_FIRE, 0.4);
  circle(g, x - 1, y - 2, size * 0.8, COL_FIRE_HI, 0.5);
  // Trailing fire
  g.stroke({ color: COL_FIRE, width: 2 });
  g.moveTo(x + size, y).bezierCurveTo(x + size + 4, y + 2, x + size + 6, y, x + size + 8, y + 1);
  g.stroke({ color: COL_FIRE_DK, width: 1 });
  g.moveTo(x + size, y + 1).bezierCurveTo(x + size + 3, y + 4, x + size + 5, y + 3, x + size + 7, y + 4);
}

// ---------------------------------------------------------------------------
// Smoke effects
// ---------------------------------------------------------------------------

function drawSmoke(g: Graphics, x: number, y: number, size: number, alpha: number): void {
  circle(g, x, y, size, COL_SMOKE, alpha);
  circle(g, x + size * 0.4, y - size * 0.3, size * 0.6, COL_SMOKE_DK, alpha * 0.7);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4);
  const flicker = Math.sin(frame * 0.8) * 1.5;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);
  drawPlatform(g, 0);
  drawMortar(g, 0, 0, 0.2);
  drawCauldron(g, 0, flicker);
  drawOperators(g, 0, breathe);

  // Light smoke from cauldron
  drawSmoke(g, CX + 24, GY - 22, 4 + flicker, 0.15);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 4)) * 1.5;
  const flicker = Math.sin(cycle * Math.PI * 6) * 1.5;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);
  drawPlatform(g, bounce);
  drawMortar(g, bounce, 0, 0.15);
  drawCauldron(g, bounce, flicker);
  drawOperators(g, bounce, cycle * Math.PI * 4);

  // Smoke trails while moving
  drawSmoke(g, CX + 24, GY - 24 + bounce, 5 + flicker, 0.12);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 0: loading, 1: aiming, 2: FIRE (massive blast), 3: projectile arc,
  // 4: smoke clearing, 5: reload
  let recoil = 0;
  let firePhase = 0;
  const flicker = Math.sin(frame * 1.2) * 1.5;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);

  if (frame === 0) {
    // Loading pitch ball
    drawPlatform(g, 0);
    drawMortar(g, 0, 0, 0.3);
    drawCauldron(g, 0, flicker);
    drawOperators(g, 0, 0);
  } else if (frame === 1) {
    // Aiming — fuse lit, glow building
    firePhase = 0.5;
    drawPlatform(g, 0);
    drawMortar(g, 0, 0, firePhase);
    drawCauldron(g, 0, flicker);
    drawOperators(g, 0, 0.5);
    // Fuse spark
    circle(g, CX - 4, GY - 20, 2, COL_FIRE_HI, 0.7);
  } else if (frame === 2) {
    // FIRE — massive blast, recoil, muzzle flash
    recoil = 4;
    firePhase = 1;
    drawPlatform(g, recoil * 0.5);
    drawMortar(g, recoil * 0.5, recoil, firePhase);
    drawCauldron(g, recoil * 0.3, 3);
    drawOperators(g, recoil * 0.3, 1);

    // Massive muzzle flash
    const flashX = CX - 20;
    const flashY = GY - 40;
    circle(g, flashX, flashY, 12, COL_FIRE, 0.6);
    circle(g, flashX, flashY, 8, COL_FIRE_HI, 0.7);
    circle(g, flashX, flashY, 4, 0xffffff, 0.5);

    // Initial smoke
    drawSmoke(g, flashX + 4, flashY - 6, 8, 0.5);
  } else if (frame === 3) {
    // Projectile in flight (arcing upward)
    recoil = 2;
    drawPlatform(g, recoil * 0.3);
    drawMortar(g, recoil * 0.3, recoil, 0.3);
    drawCauldron(g, recoil * 0.2, flicker);
    drawOperators(g, recoil * 0.2, 1.5);

    // Flaming projectile arcing
    drawFlamingProjectile(g, CX - 34, GY - 55, 4);

    // Smoke from barrel
    drawSmoke(g, CX - 16, GY - 36, 10, 0.4);
    drawSmoke(g, CX - 10, GY - 42, 7, 0.25);
  } else if (frame === 4) {
    // Smoke clearing
    drawPlatform(g, 0);
    drawMortar(g, 0, 0.5, 0.1);
    drawCauldron(g, 0, flicker);
    drawOperators(g, 0, 2);

    // Dissipating smoke
    drawSmoke(g, CX - 20, GY - 44, 12, 0.2);
    drawSmoke(g, CX - 8, GY - 50, 8, 0.1);
  } else {
    // Reload
    drawPlatform(g, 0);
    drawMortar(g, 0, 0, 0.15);
    drawCauldron(g, 0, flicker);
    drawOperators(g, 0, 2.5);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fade = Math.max(0, 1 - t * 0.7);
  const drop = t * t * 12;
  const tilt = t * 10;

  g.alpha = fade;

  ellipse(g, CX, GY, 32 * (1 - t * 0.3), 5 * (1 - t * 0.3), COL_SHADOW, 0.3 * fade);

  drawPlatform(g, drop);

  // Mortar topples
  if (t < 0.7) {
    drawMortar(g, drop, tilt, 0);
  }

  // Cauldron spills — pitch fire everywhere
  if (t < 0.5) {
    drawCauldron(g, drop + tilt * 0.3, 2);
  }

  // Fire from spilled pitch
  if (t > 0.2) {
    const fireSize = (t - 0.2) * 20;
    circle(g, CX + 20, GY - 4 + drop, fireSize, COL_FIRE, 0.4 * fade);
    circle(g, CX + 15, GY - 8 + drop, fireSize * 0.7, COL_FIRE_HI, 0.3 * fade);
    circle(g, CX + 24, GY - 2 + drop, fireSize * 0.5, COL_FIRE_DK, 0.5 * fade);
    // Thick black smoke
    drawSmoke(g, CX + 18, GY - 20 + drop, fireSize * 0.8, 0.3 * fade);
  }

  // Debris
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const dx = (i - 2) * 8 + t * (i - 1.5) * 5;
      const dy = -20 + t * t * 20 + i * 4;
      rect(g, CX + dx, GY - 20 + dy, 3, 2, COL_IRON_DK, fade);
    }
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

export function generateHellfireMortarFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
