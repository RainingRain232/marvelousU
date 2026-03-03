// Procedural sprite generator for the Bombard unit type.
//
// Heavy bronze cannon on a wheeled iron carriage, 96×48 pixels per frame.
// 2 tiles wide × 1 tile tall. Enormous single-hit damage, very slow reload.
//
// Visual features:
//   • Heavy bronze cannon barrel with riveted bands
//   • Wheeled iron carriage with reinforced axle
//   • Powder barrel and cannonball stack nearby
//   • Operator with firing torch
//   • Smoke/flash on fire, muzzle flash
//   • Shadow ellipse at ground

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 48;
const CX = FW / 2;
const GY = FH - 4;

// Palette — bronze bombard
const COL_BRONZE     = 0x8a7040;
const COL_BRONZE_DK  = 0x6a5030;
const COL_BRONZE_HI  = 0xaa9060;
const COL_IRON       = 0x606068;
const COL_IRON_DK    = 0x404048;
const COL_IRON_HI    = 0x8a8a90;
const COL_WOOD       = 0x6a4e32;
const COL_WOOD_DK    = 0x4a3220;
const COL_WOOD_LT    = 0x8a6e4a;
const COL_ROPE       = 0xb8a880;
const COL_BALL       = 0x555555;
const COL_BALL_HI    = 0x777777;
const COL_POWDER     = 0x2a2a2a;
const COL_POWDER_BRL = 0x5a3a1e;
const COL_SMOKE      = 0xaaaaaa;
const COL_FLASH      = 0xffcc44;
const COL_FUSE       = 0xcc6622;
const COL_SHADOW     = 0x000000;
const COL_SKIN       = 0xe8b89d;
const COL_TUNIC      = 0x6a3a2a;
const COL_PANTS      = 0x4a3020;
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
// Carriage & wheels
// ---------------------------------------------------------------------------

function drawCarriage(g: Graphics, bounce: number, roll: number): void {
  const cy = GY - 6 + bounce;

  // Carriage beam
  rect(g, CX - 20, cy, 30, 4, COL_IRON_DK);
  rect(g, CX - 18, cy + 1, 26, 2, COL_IRON);

  // Axle
  rect(g, CX - 22, cy + 3, 34, 2, COL_IRON_DK);

  // Wheels
  for (const wx of [CX - 22, CX + 12]) {
    const wy = cy + 5;
    circle(g, wx, wy, 5, COL_WOOD_DK);
    circle(g, wx, wy, 3.5, COL_WOOD);
    circle(g, wx, wy, 1.5, COL_IRON);
    // Spokes
    for (let s = 0; s < 4; s++) {
      const a = roll + (s * Math.PI) / 2;
      line(g, wx, wy, wx + Math.cos(a) * 3.5, wy + Math.sin(a) * 3.5, COL_WOOD_LT, 0.8);
    }
  }

  // Trunnion supports (barrel holders)
  rect(g, CX - 14, cy - 4, 3, 4, COL_IRON_DK);
  rect(g, CX + 2, cy - 4, 3, 4, COL_IRON_DK);
}

// ---------------------------------------------------------------------------
// Cannon barrel
// ---------------------------------------------------------------------------

function drawBarrel(g: Graphics, bounce: number, recoil: number): void {
  const bx = CX - 6 - recoil;
  const by = GY - 14 + bounce;
  const barrelLen = 28;

  // Main barrel (bronze tube)
  rect(g, bx - barrelLen, by - 3, barrelLen, 7, COL_BRONZE);
  // Barrel top highlight
  rect(g, bx - barrelLen, by - 3, barrelLen, 2, COL_BRONZE_HI);

  // Muzzle ring
  rect(g, bx - barrelLen - 2, by - 4, 3, 9, COL_BRONZE_DK);
  rect(g, bx - barrelLen - 2, by - 4, 3, 2, COL_BRONZE_HI);

  // Reinforcement bands
  for (let i = 0; i < 3; i++) {
    const rx = bx - 8 - i * 8;
    rect(g, rx, by - 4, 2, 9, COL_IRON_DK);
  }

  // Breech (back end)
  rect(g, bx - 1, by - 4, 5, 9, COL_BRONZE_DK);
  circle(g, bx + 2, by + 0.5, 2, COL_IRON); // touch hole

  // Barrel bore (dark opening)
  rect(g, bx - barrelLen - 3, by - 1, 2, 3, 0x1a1a1a);
}

// ---------------------------------------------------------------------------
// Powder barrel & cannonballs
// ---------------------------------------------------------------------------

function drawAmmo(g: Graphics, bounce: number): void {
  const ax = CX + 22;
  const ay = GY - 4 + bounce;

  // Powder barrel
  ellipse(g, ax, ay - 4, 5, 6, COL_POWDER_BRL);
  ellipse(g, ax, ay - 7, 4, 2, COL_WOOD_DK);
  // Band
  rect(g, ax - 5, ay - 5, 10, 1.5, COL_IRON_DK);
  // Fuse sticking out
  line(g, ax + 2, ay - 9, ax + 5, ay - 12, COL_ROPE, 1);

  // Cannonball stack
  circle(g, ax + 12, ay, 3, COL_BALL);
  circle(g, ax + 18, ay, 3, COL_BALL);
  circle(g, ax + 15, ay - 4, 3, COL_BALL);
  // Highlights
  circle(g, ax + 11, ay - 1, 1, COL_BALL_HI, 0.5);
  circle(g, ax + 14, ay - 5, 1, COL_BALL_HI, 0.5);
}

// ---------------------------------------------------------------------------
// Operator
// ---------------------------------------------------------------------------

function drawOperator(g: Graphics, bounce: number, torchAngle: number): void {
  const ox = CX + 8;
  const oy = GY - 2 + bounce;

  // Legs
  line(g, ox - 1, oy, ox - 2, oy - 8, COL_PANTS, 2.5);
  line(g, ox + 2, oy, ox + 3, oy - 8, COL_PANTS, 2.5);

  // Torso
  rect(g, ox - 3, oy - 16, 7, 9, COL_TUNIC);

  // Head
  circle(g, ox + 0.5, oy - 19, 3.5, COL_SKIN);
  ellipse(g, ox + 0.5, oy - 21, 3.5, 2.5, COL_HAIR);

  // Arm with torch/linstock
  const armX = ox - 4;
  const armY = oy - 14;
  const torchX = armX + Math.cos(torchAngle) * 10;
  const torchY = armY + Math.sin(torchAngle) * 10;
  line(g, armX, armY, torchX, torchY, COL_WOOD_DK, 2);
  // Torch tip
  circle(g, torchX, torchY, 2, COL_FUSE);
  circle(g, torchX, torchY - 1, 1.5, COL_FLASH, 0.5);
}

// ---------------------------------------------------------------------------
// Smoke / muzzle flash
// ---------------------------------------------------------------------------

function drawSmoke(g: Graphics, x: number, y: number, size: number, alpha: number): void {
  circle(g, x, y, size, COL_SMOKE, alpha);
  circle(g, x - size * 0.5, y - size * 0.3, size * 0.7, COL_SMOKE, alpha * 0.6);
}

function drawFlash(g: Graphics, x: number, y: number, size: number): void {
  circle(g, x, y, size, COL_FLASH, 0.8);
  circle(g, x, y, size * 0.5, 0xffffff, 0.5);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.5) * 0.3;
  ellipse(g, CX, GY, 34, 4, COL_SHADOW, 0.3);
  drawCarriage(g, 0, 0);
  drawBarrel(g, 0, 0);
  drawAmmo(g, 0);
  drawOperator(g, 0, -Math.PI * 0.3 + breathe * 0.1);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const roll = cycle * Math.PI * 2;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 4)) * 1.5;

  ellipse(g, CX, GY, 34, 4, COL_SHADOW, 0.3);
  drawCarriage(g, bounce, roll);
  drawBarrel(g, bounce, 0);
  drawAmmo(g, bounce);
  drawOperator(g, bounce, -Math.PI * 0.3);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 0: aim, 1: light fuse, 2: FIRE (flash+recoil), 3: smoke, 4: smoke clears, 5: reload
  let recoil = 0;

  ellipse(g, CX, GY, 34, 4, COL_SHADOW, 0.3);

  if (frame <= 1) {
    // Aiming / lighting fuse
    drawCarriage(g, 0, 0);
    drawBarrel(g, 0, 0);
    drawAmmo(g, 0);
    const torchAngle = -Math.PI * 0.3 + frame * 0.3;
    drawOperator(g, 0, torchAngle);
    if (frame === 1) {
      // Fuse sparks
      circle(g, CX + 4, GY - 14, 2, COL_FLASH, 0.7);
    }
  } else if (frame === 2) {
    // FIRE — muzzle flash + heavy recoil
    recoil = 6;
    drawCarriage(g, 1, 0);
    drawBarrel(g, 1, recoil);
    drawAmmo(g, 1);
    drawOperator(g, 1, -Math.PI * 0.5);
    // Muzzle flash
    drawFlash(g, CX - 38, GY - 13, 8);
    drawSmoke(g, CX - 30, GY - 18, 6, 0.6);
  } else if (frame === 3) {
    // Recoil settling + smoke cloud
    recoil = 3;
    drawCarriage(g, 0.5, 0);
    drawBarrel(g, 0.5, recoil);
    drawAmmo(g, 0.5);
    drawOperator(g, 0.5, -Math.PI * 0.4);
    drawSmoke(g, CX - 34, GY - 20, 10, 0.5);
    drawSmoke(g, CX - 26, GY - 24, 7, 0.3);
  } else if (frame === 4) {
    // Smoke clearing
    drawCarriage(g, 0, 0);
    drawBarrel(g, 0, 1);
    drawAmmo(g, 0);
    drawOperator(g, 0, -Math.PI * 0.35);
    drawSmoke(g, CX - 38, GY - 26, 8, 0.2);
  } else {
    // Reload
    drawCarriage(g, 0, 0);
    drawBarrel(g, 0, 0);
    drawAmmo(g, 0);
    drawOperator(g, 0, -Math.PI * 0.3);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fade = Math.max(0, 1 - t * 0.8);
  const drop = t * t * 10;
  const tilt = t * 12;

  g.alpha = fade;

  ellipse(g, CX, GY, 34 * (1 - t * 0.3), 4 * (1 - t * 0.3), COL_SHADOW, 0.3 * fade);
  drawCarriage(g, drop, t * 2);
  drawBarrel(g, drop + tilt * 0.2, 0);

  // Barrel breaks apart
  if (t > 0.4) {
    const debris = (t - 0.4) * 15;
    rect(g, CX - 20 - debris, GY - 16 + drop, 6, 3, COL_BRONZE_DK, fade);
    rect(g, CX - 10 + debris * 0.5, GY - 20 + drop - debris, 4, 3, COL_IRON_DK, fade);
  }

  // Powder explosion
  if (t > 0.3 && t < 0.7) {
    const expSize = (t - 0.3) * 20;
    circle(g, CX + 22, GY - 8, expSize, COL_FLASH, 0.4 * fade);
    drawSmoke(g, CX + 22, GY - 12, expSize * 0.8, 0.3 * fade);
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

export function generateBombardFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
