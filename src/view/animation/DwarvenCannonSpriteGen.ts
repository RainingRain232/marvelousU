// Procedural sprite generator for the Dwarven Cannon unit type.
//
// Draws a compact field cannon with a stocky dwarf operator at 48x48 pixels
// per frame using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Brass/bronze cannon barrel on iron-banded wooden carriage
//   - Two wooden wheels with iron rims
//   - Stocky dwarf operator with brown beard and leather apron
//   - Attack: cannon recoil + smoke puff + muzzle flash
//   - Move: dwarf pushes cannon forward from behind
//   - Dwarf has goggles pushed up on forehead
//   - Ammunition crate strapped to carriage

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- brass, iron, wood
const COL_BRASS = 0xb89840;
const COL_BRASS_HI = 0xd4b850;
const COL_BRASS_DK = 0x8a7030;

const COL_IRON = 0x555560;
const COL_IRON_HI = 0x707078;
const COL_IRON_DK = 0x3a3a42;

const COL_WOOD = 0x6e4e2a;
const COL_WOOD_HI = 0x8a6438;
const COL_WOOD_DK = 0x4e3418;

const COL_WHEEL_RIM = 0x484850;
const COL_WHEEL_SPOKE = 0x5a4028;
const COL_WHEEL_HUB = 0x444448;

const COL_SKIN = 0xd4a070;
const COL_SKIN_DK = 0xb88858;
const COL_BEARD = 0x6e4420;
const COL_BEARD_HI = 0x8a5c30;
const COL_HAIR = 0x5a3818;

const COL_APRON = 0x5a4a38;
const COL_APRON_DK = 0x443828;
const COL_SHIRT = 0x7a6a58;
const COL_PANTS = 0x4a3e30;
const COL_BOOT = 0x3a3028;

const COL_GOGGLES = 0x889098;
const COL_GOGGLE_LENS = 0x88ccdd;

const COL_SMOKE = 0xaaaaaa;
const COL_FLASH = 0xffdd44;
const COL_AMMO = 0x333338;

const COL_SHADOW = 0x000000;

/* -- helpers -------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------- */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 16,
  h = 3,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawWheel(g: Graphics, cx: number, cy: number, r: number, rotation = 0): void {
  // Iron rim
  g.circle(cx, cy, r).stroke({ color: COL_WHEEL_RIM, width: 1.5 });
  // Wooden interior
  g.circle(cx, cy, r - 1).fill({ color: COL_WOOD_DK });
  // Spokes
  for (let i = 0; i < 6; i++) {
    const angle = rotation + i * (Math.PI / 3);
    g.moveTo(cx, cy)
      .lineTo(cx + Math.cos(angle) * (r - 1), cy + Math.sin(angle) * (r - 1))
      .stroke({ color: COL_WHEEL_SPOKE, width: 0.8 });
  }
  // Hub
  g.circle(cx, cy, 1.5).fill({ color: COL_WHEEL_HUB });
  g.circle(cx, cy, 0.5).fill({ color: COL_IRON_HI });
}

function drawCannon(
  g: Graphics,
  cx: number,
  gy: number,
  recoil = 0,
  elevation = 0,
): void {
  const barrelLen = 16;
  const barrelW = 4;
  const carriageW = 14;
  const carriageH = 6;

  // Carriage (wooden platform)
  const carriageX = cx - carriageW / 2 + recoil * 0.3;
  const carriageY = gy - 10;
  g.roundRect(carriageX, carriageY, carriageW, carriageH, 1)
    .fill({ color: COL_WOOD })
    .stroke({ color: COL_WOOD_DK, width: 0.5 });
  // Iron bands
  g.rect(carriageX + 2, carriageY, 1, carriageH).fill({ color: COL_IRON, alpha: 0.6 });
  g.rect(carriageX + carriageW - 3, carriageY, 1, carriageH).fill({ color: COL_IRON, alpha: 0.6 });
  // Wood grain
  g.moveTo(carriageX + 5, carriageY + 1)
    .lineTo(carriageX + 5, carriageY + carriageH - 1)
    .stroke({ color: COL_WOOD_HI, width: 0.3, alpha: 0.3 });

  // Ammo crate strapped to side
  g.roundRect(carriageX + carriageW - 5, carriageY + 1, 4, 3.5, 0.5)
    .fill({ color: COL_WOOD_DK })
    .stroke({ color: COL_IRON_DK, width: 0.3 });
  // Cannonball visible
  g.circle(carriageX + carriageW - 3, carriageY + 2.5, 1).fill({ color: COL_AMMO });

  // Wheels (slightly behind carriage)
  const wheelR = 4;
  const wheelY = gy - 2;
  drawWheel(g, cx - 7, wheelY, wheelR, recoil * 0.3);
  drawWheel(g, cx + 7, wheelY, wheelR, recoil * 0.3);

  // Barrel -- brass tube pointing right
  const barrelStartX = cx - 2 + recoil;
  const barrelStartY = carriageY + 1 - elevation;
  const barrelEndX = barrelStartX + barrelLen;
  const barrelEndY = barrelStartY - elevation * 0.5;

  // Barrel body
  g.moveTo(barrelStartX, barrelStartY - barrelW / 2)
    .lineTo(barrelEndX, barrelEndY - barrelW / 2 + 0.5)
    .lineTo(barrelEndX, barrelEndY + barrelW / 2 - 0.5)
    .lineTo(barrelStartX, barrelStartY + barrelW / 2)
    .closePath()
    .fill({ color: COL_BRASS })
    .stroke({ color: COL_BRASS_DK, width: 0.5 });

  // Barrel highlight
  g.moveTo(barrelStartX + 1, barrelStartY - barrelW / 2 + 0.5)
    .lineTo(barrelEndX - 1, barrelEndY - barrelW / 2 + 1)
    .stroke({ color: COL_BRASS_HI, width: 0.8, alpha: 0.5 });

  // Muzzle ring
  g.roundRect(barrelEndX - 1.5, barrelEndY - barrelW / 2 - 0.5, 2, barrelW + 1, 0.5)
    .fill({ color: COL_BRASS_DK })
    .stroke({ color: COL_IRON, width: 0.3 });

  // Reinforcement rings
  g.rect(barrelStartX + 4, barrelStartY - barrelW / 2 - 0.3, 1.5, barrelW + 0.6).fill({
    color: COL_IRON,
    alpha: 0.5,
  });
  g.rect(barrelStartX + 9, barrelStartY - barrelW / 2 - 0.3, 1.5, barrelW + 0.6).fill({
    color: COL_IRON,
    alpha: 0.5,
  });

  // Trunnion mount (connects barrel to carriage)
  g.circle(barrelStartX + 2, barrelStartY + barrelW / 2 + 1, 1.5).fill({ color: COL_IRON });
}

function drawDwarf(
  g: Graphics,
  cx: number,
  gy: number,
  posX = 0,
  armAngle = 0,
  lean = 0,
): void {
  // Stocky dwarf operator -- standing behind cannon
  const dwarfCX = cx - 8 + posX;
  const dwarfGY = gy;

  // Boots
  g.roundRect(dwarfCX - 4, dwarfGY - 3, 3.5, 3, 1)
    .fill({ color: COL_BOOT });
  g.roundRect(dwarfCX + 0.5, dwarfGY - 3, 3.5, 3, 1)
    .fill({ color: COL_BOOT });

  // Stubby legs
  g.rect(dwarfCX - 3, dwarfGY - 7, 3, 4).fill({ color: COL_PANTS });
  g.rect(dwarfCX + 0.5, dwarfGY - 7, 3, 4).fill({ color: COL_PANTS });

  // Torso with leather apron
  const torsoTop = dwarfGY - 14;
  g.roundRect(dwarfCX - 4, torsoTop, 8, 7, 1)
    .fill({ color: COL_SHIRT });
  // Apron over shirt
  g.roundRect(dwarfCX - 3.5, torsoTop + 2, 7, 6, 0.5)
    .fill({ color: COL_APRON })
    .stroke({ color: COL_APRON_DK, width: 0.4 });
  // Apron strap
  g.moveTo(dwarfCX - 1, torsoTop)
    .lineTo(dwarfCX - 2, torsoTop + 2)
    .stroke({ color: COL_APRON_DK, width: 0.6 });
  g.moveTo(dwarfCX + 1, torsoTop)
    .lineTo(dwarfCX + 2, torsoTop + 2)
    .stroke({ color: COL_APRON_DK, width: 0.6 });

  // Head
  const headTop = torsoTop - 7;
  const headW = 8;
  const headH = 7;
  const hx = dwarfCX - headW / 2 + lean;

  // Head shape
  g.roundRect(hx, headTop, headW, headH, 2)
    .fill({ color: COL_SKIN });

  // Hair
  g.roundRect(hx, headTop, headW, 3, 2).fill({ color: COL_HAIR });

  // Goggles pushed up on forehead
  g.roundRect(hx + 1, headTop + 1, headW - 2, 2, 1)
    .fill({ color: COL_GOGGLES, alpha: 0.8 });
  g.circle(hx + 2.5, headTop + 2, 1).fill({ color: COL_GOGGLE_LENS, alpha: 0.6 });
  g.circle(hx + headW - 2.5, headTop + 2, 1).fill({ color: COL_GOGGLE_LENS, alpha: 0.6 });

  // Eyes
  const eyeY = headTop + 3.5;
  g.rect(dwarfCX - 2 + lean, eyeY, 1.5, 1).fill({ color: 0x334433 });
  g.rect(dwarfCX + 0.5 + lean, eyeY, 1.5, 1).fill({ color: 0x334433 });

  // Big bushy beard
  g.moveTo(hx + 1, headTop + 4.5)
    .quadraticCurveTo(dwarfCX + lean, headTop + headH + 4, hx + headW - 1, headTop + 4.5)
    .fill({ color: COL_BEARD });
  // Beard highlight
  g.moveTo(hx + 2, headTop + 5.5)
    .quadraticCurveTo(dwarfCX + lean, headTop + headH + 2, hx + headW - 2, headTop + 5.5)
    .stroke({ color: COL_BEARD_HI, width: 0.4, alpha: 0.4 });

  // Arms
  const shoulderY = torsoTop + 2;
  const armEndX = dwarfCX + 5 + Math.cos(armAngle) * 4;
  const armEndY = shoulderY + 2 + Math.sin(armAngle) * 4;
  g.moveTo(dwarfCX + 4, shoulderY)
    .lineTo(armEndX, armEndY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(armEndX, armEndY, 1.3).fill({ color: COL_SKIN_DK });

  const lArmEndX = dwarfCX - 5 + Math.cos(Math.PI - armAngle) * 3;
  const lArmEndY = shoulderY + 2 + Math.sin(Math.PI - armAngle) * 3;
  g.moveTo(dwarfCX - 4, shoulderY)
    .lineTo(lArmEndX, lArmEndY)
    .stroke({ color: COL_SHIRT, width: 2.5 });
  g.circle(lArmEndX, lArmEndY, 1.3).fill({ color: COL_SKIN_DK });
}

/* -- frame generators ----------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.3;

  drawShadow(g, CX + 2, GY, 16, 3);
  drawCannon(g, CX + 4, GY, 0, 0);
  drawDwarf(g, CX, GY, 0, 0.3 + breathe * 0.1, 0);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const push = Math.sin(t * Math.PI * 4) * 0.5;

  // Dwarf pushes from behind, leaning forward
  const cannonBob = Math.abs(walk) * 0.3;

  drawShadow(g, CX + 2, GY, 16 + Math.abs(walk), 3);

  // Draw cannon with slight wheel rotation
  const recoil = -push * 0.5; // slight forward/back from pushing
  drawCannon(g, CX + 4, GY, recoil, cannonBob * 0.3);

  // Dwarf leaning forward, pushing
  drawDwarf(g, CX, GY, walk * 1.5, 0.8 + push * 0.2, walk * 0.3);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Fire sequence: 0-1=aim, 2=fire!, 3-4=recoil+smoke, 5-7=settle
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  // Recoil peaks at t=0.4, then settles
  let recoil = 0;
  if (t < 0.25) {
    recoil = 0;
  } else if (t < 0.55) {
    recoil = -((t - 0.25) / 0.3) * 6; // kick back
  } else {
    recoil = lerp(-6, 0, (t - 0.55) / 0.45); // settle
  }

  drawShadow(g, CX + 2, GY, 16, 3);
  drawCannon(g, CX + 4, GY, recoil, t < 0.25 ? t * 3 : lerp(0.75, 0, clamp01((t - 0.25) / 0.75)));

  // Muzzle flash
  if (t > 0.2 && t < 0.45) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.3) / 0.15) * 0.8;
    const flashX = CX + 22 + recoil;
    const flashY = GY - 11;
    g.circle(flashX, flashY, 4).fill({ color: COL_FLASH, alpha: flashAlpha });
    g.circle(flashX, flashY, 6).fill({ color: COL_FLASH, alpha: flashAlpha * 0.3 });
    // Fire streaks
    for (let i = 0; i < 4; i++) {
      const angle = -0.3 + i * 0.2;
      g.moveTo(flashX, flashY)
        .lineTo(flashX + Math.cos(angle) * 7, flashY + Math.sin(angle) * 7)
        .stroke({ color: 0xff8822, width: 1, alpha: flashAlpha * 0.6 });
    }
  }

  // Smoke cloud expands from muzzle
  if (t > 0.25) {
    const smokeProgress = (t - 0.25) / 0.75;
    for (let i = 0; i < 6; i++) {
      const sx = CX + 20 + recoil + smokeProgress * (8 + i * 3);
      const sy = GY - 12 + (i - 3) * 2 * smokeProgress + smokeProgress * i;
      const sAlpha = clamp01(0.4 - smokeProgress * 0.35 - i * 0.04);
      const sSize = 2 + smokeProgress * (3 + i);
      g.circle(sx, sy, sSize).fill({ color: COL_SMOKE, alpha: sAlpha });
    }
  }

  // Dwarf reacts to recoil -- leans back, covers ears briefly
  const dwarfLean = t > 0.25 && t < 0.55 ? -1.5 : 0;
  drawDwarf(g, CX, GY, recoil * 0.2, 0.3 + dwarfLean * 0.2, dwarfLean);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Special shot -- loads a special round, fires with extra effects
  const t = frame / 7;
  const intensity = clamp01(t * 1.5);

  drawShadow(g, CX + 2, GY, 16, 3, 0.3 + intensity * 0.1);

  // Dwarf loading a glowing cannonball
  const loadProgress = clamp01(t * 2);
  if (t < 0.5) {
    // Glowing cannonball in hand
    const ballX = CX - 3 + loadProgress * 10;
    const ballY = GY - 14 - loadProgress * 2;
    g.circle(ballX, ballY, 2.5).fill({ color: COL_AMMO });
    g.circle(ballX, ballY, 2).fill({ color: COL_FLASH, alpha: 0.3 + intensity * 0.2 });
    // Rune markings
    g.circle(ballX, ballY, 1.5).stroke({ color: COL_FLASH, width: 0.4, alpha: 0.5 });
  }

  const firePhase = clamp01((t - 0.5) * 2);

  // Recoil for special shot (bigger)
  let recoil = 0;
  if (t > 0.5) {
    recoil = t < 0.7 ? -((t - 0.5) / 0.2) * 8 : lerp(-8, 0, (t - 0.7) / 0.3);
  }

  drawCannon(g, CX + 4, GY, recoil, 0);

  // Special muzzle flash -- bigger, more colorful
  if (t > 0.5 && t < 0.75) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.6) / 0.15) * 0.9;
    const flashX = CX + 22 + recoil;
    const flashY = GY - 11;
    g.circle(flashX, flashY, 5).fill({ color: COL_FLASH, alpha: flashAlpha });
    g.circle(flashX, flashY, 8).fill({ color: 0xff6622, alpha: flashAlpha * 0.3 });
    // Arcane sparks
    for (let i = 0; i < 6; i++) {
      const angle = i * (Math.PI / 3) + t * 4;
      const dist = 4 + firePhase * 6;
      g.circle(flashX + Math.cos(angle) * dist, flashY + Math.sin(angle) * dist, 0.8)
        .fill({ color: COL_FLASH, alpha: flashAlpha * 0.5 });
    }
  }

  // Rune-smoke
  if (t > 0.55) {
    const smokeProgress = (t - 0.55) / 0.45;
    for (let i = 0; i < 5; i++) {
      const sx = CX + 20 + recoil + smokeProgress * (6 + i * 4);
      const sy = GY - 12 + (i - 2) * 3 * smokeProgress;
      const sAlpha = clamp01(0.35 - smokeProgress * 0.3);
      g.circle(sx, sy, 2.5 + smokeProgress * 2).fill({ color: 0xddaa44, alpha: sAlpha });
    }
  }

  drawDwarf(g, CX, GY, recoil * 0.15, t < 0.5 ? 1.2 : 0.3, 0);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Cannon destroyed: 0=hit, 1-2=cannon breaks, 3-5=dwarf stumbles, 6-7=wreckage
  const t = frame / 7;

  const breakApart = clamp01(t * 1.5);
  const dwarfFall = clamp01((t - 0.2) / 0.8);

  drawShadow(g, CX + 2, GY, 16 - t * 4, 3, 0.3 * (1 - t * 0.5));

  // Cannon breaks apart
  if (t < 0.7) {
    // Tilting barrel
    const tiltRecoil = breakApart * -4;
    const tiltUp = breakApart * 3;
    drawCannon(g, CX + 4 + breakApart * 2, GY, tiltRecoil, tiltUp);
  }

  // Wreckage in later frames
  if (t > 0.4) {
    const wreckAlpha = clamp01(1 - (t - 0.4));
    // Broken wheel
    g.circle(CX - 4, GY - 1, 3).stroke({ color: COL_WHEEL_RIM, width: 1, alpha: wreckAlpha });
    // Wood splinters
    for (let i = 0; i < 4; i++) {
      const sx = CX + (i - 2) * 6 + breakApart * (i - 1.5) * 3;
      const sy = GY - 4 + breakApart * i * 2;
      g.rect(sx, Math.min(sy, GY - 1), 2, 1).fill({ color: COL_WOOD, alpha: wreckAlpha });
    }
  }

  // Smoke from destroyed cannon
  if (t > 0.2) {
    for (let i = 0; i < 4; i++) {
      const smokeT = clamp01((t - 0.2 - i * 0.05) / 0.5);
      const sx = CX + 5 + smokeT * 3 + i * 2;
      const sy = GY - 10 - smokeT * 8 - i * 3;
      const sAlpha = clamp01(0.3 - smokeT * 0.25);
      g.circle(sx, sy, 2 + smokeT * 2).fill({ color: COL_SMOKE, alpha: sAlpha });
    }
  }

  // Dwarf stumbles backward
  if (t < 0.85) {
    const dwarfX = -dwarfFall * 8;
    const dwarfLean = -dwarfFall * 3;
    drawDwarf(g, CX, GY, dwarfX, 0.3, dwarfLean);
  } else {
    // Dwarf on ground
    const armX = CX - 12;
    const bodyY = GY - 4;
    g.roundRect(armX, bodyY, 8, 3, 1).fill({ color: COL_SHIRT });
    g.circle(armX - 1, bodyY, 3).fill({ color: COL_SKIN });
    // Beard splayed
    g.ellipse(armX - 1, bodyY + 2, 3, 2).fill({ color: COL_BEARD, alpha: 0.7 });
  }
}

/* -- public API ----------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all dwarven cannon sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateDwarvenCannonFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
