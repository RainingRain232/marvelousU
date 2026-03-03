// Procedural sprite generator for the War Wagon unit type.
//
// Heavy iron-banded war wagon with bolt launchers, 96×96 pixels per frame.
// A mobile armored platform — 2×2 tiles, can fight units and buildings.
//
// Visual features:
//   • Reinforced wooden wagon body with iron bands
//   • Bolt-launching slits on the sides
//   • Spiked iron wheels
//   • Armored canopy with banner
//   • Operator visible through slits
//   • Shadow ellipse at ground

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — heavy war wagon
const COL_WOOD       = 0x6a4e32;
const COL_WOOD_DK    = 0x4a3220;
const COL_WOOD_LT    = 0x8a6e4a;
const COL_IRON       = 0x606068;
const COL_IRON_DK    = 0x404048;
const COL_IRON_HI    = 0x8a8a90;
const COL_SPIKE      = 0x707078;
const COL_BOLT       = 0x8a7a5a;
const COL_BOLT_TIP   = 0xb0b8c0;
const COL_BANNER     = 0x882222;
const COL_BANNER_DK  = 0x661818;
const COL_ROPE       = 0xb8a880;
const COL_SHADOW     = 0x000000;
const COL_SKIN       = 0xe8b89d;

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
// Wheels (spiked iron)
// ---------------------------------------------------------------------------

function drawWheels(g: Graphics, roll: number, bounce: number): void {
  const wy = GY - 1 + bounce;
  const wheelR = 8;

  for (const wx of [CX - 24, CX + 24]) {
    // Outer rim
    circle(g, wx, wy, wheelR, COL_IRON_DK);
    circle(g, wx, wy, wheelR - 1.5, COL_WOOD_DK);
    // Hub
    circle(g, wx, wy, 3, COL_IRON);
    circle(g, wx, wy, 1.5, COL_IRON_HI);

    // Spokes
    for (let s = 0; s < 6; s++) {
      const a = roll + (s * Math.PI) / 3;
      const sx = Math.cos(a) * (wheelR - 2);
      const sy = Math.sin(a) * (wheelR - 2);
      line(g, wx, wy, wx + sx, wy + sy, COL_WOOD_LT, 1.2);
    }

    // Iron spikes on rim
    for (let s = 0; s < 4; s++) {
      const a = roll + (s * Math.PI) / 2 + Math.PI / 4;
      const tipX = wx + Math.cos(a) * (wheelR + 3);
      const tipY = wy + Math.sin(a) * (wheelR + 3);
      const baseX = wx + Math.cos(a) * (wheelR - 1);
      const baseY = wy + Math.sin(a) * (wheelR - 1);
      line(g, baseX, baseY, tipX, tipY, COL_SPIKE, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Wagon body
// ---------------------------------------------------------------------------

function drawBody(g: Graphics, bounce: number, breathe: number): void {
  const by = GY - 18 + bounce;

  // Wagon floor
  rect(g, CX - 30, by + 10, 60, 5, COL_WOOD_DK);

  // Main body walls
  rect(g, CX - 30, by - 12, 60, 22, COL_WOOD);

  // Iron bands (horizontal reinforcement)
  for (let i = 0; i < 4; i++) {
    const iy = by - 10 + i * 6;
    rect(g, CX - 30, iy, 60, 2, COL_IRON_DK);
  }

  // Vertical iron braces
  for (let i = 0; i < 5; i++) {
    const ix = CX - 28 + i * 14;
    rect(g, ix, by - 12, 2, 22, COL_IRON);
  }

  // Bolt launching slits (dark gaps)
  for (let i = 0; i < 3; i++) {
    const sx = CX - 20 + i * 14;
    const sy = by - 4;
    rect(g, sx, sy, 8, 3, 0x1a1210);
    // Bolt tips poking out
    rect(g, sx + 2, sy + 0.5, 4, 2, COL_BOLT_TIP);
  }

  // Operator faces visible behind slits
  const opBreathe = Math.sin(breathe) * 0.5;
  circle(g, CX - 16, by - 6 + opBreathe, 2, COL_SKIN, 0.6);
  circle(g, CX - 2, by - 6 + opBreathe, 2, COL_SKIN, 0.6);

  // Armored canopy (angled roof)
  poly(g, [
    CX - 32, by - 12,
    CX + 32, by - 12,
    CX + 28, by - 22,
    CX - 28, by - 22,
  ], COL_WOOD_DK);
  // Roof iron bands
  rect(g, CX - 28, by - 20, 56, 2, COL_IRON);
  rect(g, CX - 28, by - 15, 56, 2, COL_IRON_DK);

  // Iron ridge cap
  rect(g, CX - 26, by - 22, 52, 2, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function drawBanner(g: Graphics, bounce: number, wave: number): void {
  const px = CX;
  const py = GY - 42 + bounce;

  // Pole
  line(g, px, py + 20, px, py, COL_WOOD_DK, 2);

  // Flag
  const w = 12;
  const h = 8;
  poly(g, [
    px, py,
    px - w + wave, py + 2,
    px - w + wave * 1.2, py + h + 1,
    px, py + h,
  ], COL_BANNER);
  // Dark stripe
  line(g, px, py + h / 2, px - w + wave * 1.1, py + h / 2 + 1, COL_BANNER_DK, 2);
}

// ---------------------------------------------------------------------------
// Bolt projectile (for attack frames)
// ---------------------------------------------------------------------------

function drawFlyingBolt(g: Graphics, x: number, y: number): void {
  const len = 10;
  line(g, x, y, x - len, y, COL_BOLT, 2);
  // Metal tip
  poly(g, [x - len, y, x - len - 3, y - 1.5, x - len - 3, y + 1.5], COL_BOLT_TIP);
  // Fletching
  poly(g, [x, y, x + 2, y - 2, x + 2, y + 2], COL_BANNER, 0.7);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.5) * 0.5;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);
  drawWheels(g, 0, 0);
  drawBody(g, 0, breathe);
  drawBanner(g, 0, Math.sin(frame * 0.4) * 2);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const roll = cycle * Math.PI * 2;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 4)) * 2;
  const wave = Math.sin(cycle * Math.PI * 3) * 3;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);
  drawWheels(g, roll, bounce);
  drawBody(g, bounce, cycle);
  drawBanner(g, bounce, wave);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const recoil = frame === 2 || frame === 3 ? 1.5 : 0;

  ellipse(g, CX, GY, 32, 5, COL_SHADOW, 0.3);
  drawWheels(g, 0, recoil * 0.5);
  drawBody(g, recoil * 0.5, 0);
  drawBanner(g, recoil * 0.5, Math.sin(t * Math.PI) * 2);

  // Flying bolts after fire
  if (frame >= 2 && frame <= 5) {
    const dist = (frame - 2) * 18;
    drawFlyingBolt(g, CX - 32 - dist, GY - 22);
    if (frame >= 3) {
      drawFlyingBolt(g, CX - 32 - dist + 10, GY - 18);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fade = Math.max(0, 1 - t * 0.8);
  const topple = t * 15;
  const drop = t * t * 10;

  g.alpha = fade;

  ellipse(g, CX, GY, 32 * (1 - t * 0.4), 5 * (1 - t * 0.4), COL_SHADOW, 0.3 * fade);

  const roll = t * 0.5;
  drawWheels(g, roll, drop);
  drawBody(g, drop + topple * 0.3, 0);

  // Debris
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const dx = (i - 2) * 8 + t * (i - 1.5) * 5;
      const dy = -t * 12 + t * t * 20 + i * 3;
      rect(g, CX + dx, GY - 20 + dy, 3, 2, COL_WOOD_DK, fade);
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

export function generateWarWagonFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
