// Procedural sprite generator for the Siege Tower unit type.
//
// Massive multi-story wooden tower on iron-shod wheels, 96×96 pixels per frame.
// 2×2 tiles. Extremely tanky, rolls into buildings. siegeOnly.
//
// Visual features:
//   • Three-story wooden tower with iron plating
//   • Iron-shod wheels at base
//   • Drawbridge/ramp at top that drops on attack
//   • Ladders visible inside through windows
//   • Reinforced with iron bands and bolts
//   • Arrow slits on each level
//   • Ram tip at the base for impact

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — siege tower
const COL_WOOD       = 0x6a4e32;
const COL_WOOD_DK    = 0x4a3220;
const COL_WOOD_LT    = 0x8a6e4a;
const COL_IRON       = 0x606068;
const COL_IRON_DK    = 0x404048;
const COL_IRON_HI    = 0x8a8a90;
const COL_HIDE       = 0x7a6a50;  // wet hide covering (fire protection)
const COL_HIDE_DK    = 0x5a4a30;
const COL_ROPE       = 0xb8a880;
const COL_LADDER     = 0x8a6e4a;
const COL_SHADOW     = 0x000000;
const COL_SKIN       = 0xe8b89d;
const COL_TUNIC      = 0x6a3a2a;

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
// Wheels (heavy iron-shod)
// ---------------------------------------------------------------------------

function drawWheels(g: Graphics, roll: number, bounce: number): void {
  const wy = GY - 1 + bounce;

  for (const wx of [CX - 18, CX + 18]) {
    // Large iron-banded wheel
    circle(g, wx, wy, 7, COL_IRON_DK);
    circle(g, wx, wy, 5.5, COL_WOOD_DK);
    circle(g, wx, wy, 2, COL_IRON);

    // Spokes
    for (let s = 0; s < 6; s++) {
      const a = roll + (s * Math.PI) / 3;
      line(g, wx, wy, wx + Math.cos(a) * 5, wy + Math.sin(a) * 5, COL_WOOD_LT, 1);
    }

    // Iron band rivets
    for (let s = 0; s < 8; s++) {
      const a = roll + (s * Math.PI) / 4;
      circle(g, wx + Math.cos(a) * 6, wy + Math.sin(a) * 6, 0.8, COL_IRON_HI);
    }
  }
}

// ---------------------------------------------------------------------------
// Tower body
// ---------------------------------------------------------------------------

function drawTower(g: Graphics, bounce: number, sway: number): void {
  const bx = CX - 22;
  const tw = 44;
  const baseY = GY - 12 + bounce;
  const topY = baseY - 68;

  // Base platform
  rect(g, bx - 2, baseY, tw + 4, 5, COL_WOOD_DK);

  // Tower walls — slight inward taper
  const taper = 3;
  poly(g, [
    bx + sway, baseY,
    bx + tw + sway, baseY,
    bx + tw - taper + sway, topY,
    bx + taper + sway, topY,
  ], COL_WOOD);

  // Wet hide covering (fire protection) on front face
  poly(g, [
    bx + sway, baseY,
    bx + 12 + sway, baseY,
    bx + 12 + taper * 0.3 + sway, topY + 10,
    bx + taper * 0.3 + sway, topY + 10,
  ], COL_HIDE, 0.6);
  // Hide seams
  for (let i = 0; i < 4; i++) {
    const sy = baseY - 10 - i * 14;
    line(g, bx + sway, sy, bx + 12 + sway, sy, COL_HIDE_DK, 0.8);
  }

  // Iron bands (horizontal reinforcement) per floor
  for (let floor = 0; floor < 3; floor++) {
    const fy = baseY - 5 - floor * 22;
    const fx1 = bx + taper * (floor / 3) + sway;
    const fx2 = bx + tw - taper * (floor / 3) + sway;
    rect(g, fx1, fy, fx2 - fx1, 2, COL_IRON_DK);

    // Rivets along iron band
    for (let r = 0; r < 5; r++) {
      const rx = fx1 + 4 + r * ((fx2 - fx1 - 8) / 4);
      circle(g, rx, fy + 1, 0.8, COL_IRON_HI);
    }
  }

  // Vertical iron braces
  for (let i = 0; i < 3; i++) {
    const ix = bx + 8 + i * 12 + sway;
    const itaper = taper * ((ix - bx - sway) / tw);
    line(g, ix, baseY, ix + itaper * 0.1, topY, COL_IRON, 1.5);
  }

  // Arrow slits on each floor
  for (let floor = 0; floor < 3; floor++) {
    const fy = baseY - 12 - floor * 22;
    for (let s = 0; s < 2; s++) {
      const sx = bx + 10 + s * 18 + sway;
      rect(g, sx, fy, 2, 7, 0x1a1210);
      rect(g, sx - 1, fy + 2, 4, 2, 0x1a1210);
    }
  }

  // Ladder rungs visible through side opening
  const ladderX = bx + tw - 6 + sway;
  for (let r = 0; r < 6; r++) {
    const ry = baseY - 6 - r * 11;
    rect(g, ladderX, ry, 6, 1.5, COL_LADDER);
  }
  // Ladder rails
  line(g, ladderX, baseY, ladderX + taper * 0.1, topY + 5, COL_LADDER, 1.5);
  line(g, ladderX + 6, baseY, ladderX + 6 + taper * 0.1, topY + 5, COL_LADDER, 1.5);

  // Crenellations at top
  const crenW = 5;
  for (let c = 0; c < 4; c++) {
    const cx = bx + taper + 2 + c * (crenW + 3) + sway;
    rect(g, cx, topY - 4, crenW, 4, COL_WOOD_DK);
    rect(g, cx, topY - 4, crenW, 1.5, COL_IRON_DK);
  }

  // Ram tip at base (iron-tipped protruding beam)
  const ramY = baseY - 2;
  rect(g, bx - 8 + sway, ramY - 2, 10, 4, COL_WOOD_DK);
  poly(g, [
    bx - 8 + sway, ramY - 3,
    bx - 12 + sway, ramY,
    bx - 8 + sway, ramY + 3,
  ], COL_IRON);
}

// ---------------------------------------------------------------------------
// Drawbridge / ramp
// ---------------------------------------------------------------------------

function drawDrawbridge(g: Graphics, bounce: number, sway: number, dropAngle: number): void {
  const bx = CX - 22;
  const topY = GY - 80 + bounce;

  // Drawbridge is a hinged ramp at the top that drops forward during attack
  const rampLen = 16;
  const hingeX = bx + 3 + sway;
  const hingeY = topY + 4;

  const endX = hingeX + Math.cos(-dropAngle) * rampLen;
  const endY = hingeY + Math.sin(-dropAngle) * rampLen;

  // Ramp
  const rampW = 2;
  const perpX = Math.sin(-dropAngle) * rampW;
  const perpY = -Math.cos(-dropAngle) * rampW;

  poly(g, [
    hingeX - perpX, hingeY - perpY,
    hingeX + perpX, hingeY + perpY,
    endX + perpX, endY + perpY,
    endX - perpX, endY - perpY,
  ], COL_WOOD_DK);

  // Rope holding ramp
  line(g, hingeX + sway, topY - 8, (hingeX + endX) / 2, (hingeY + endY) / 2 - 2, COL_ROPE, 1);
}

// ---------------------------------------------------------------------------
// Operators pushing (visible at base)
// ---------------------------------------------------------------------------

function drawPushers(g: Graphics, bounce: number, pushPhase: number): void {
  for (let i = 0; i < 2; i++) {
    const px = CX + 26 + i * 8;
    const py = GY - 2 + bounce;
    const lean = Math.sin(pushPhase + i * Math.PI) * 2;

    // Legs
    line(g, px, py, px + lean * 0.5, py - 7, COL_TUNIC, 2);
    line(g, px + 3, py, px + 3 + lean * 0.5, py - 7, COL_TUNIC, 2);

    // Torso (leaning into push)
    rect(g, px - 1 + lean, py - 14, 5, 8, COL_TUNIC);

    // Arms pushing against tower
    line(g, px + lean, py - 12, CX + 22, py - 10 + bounce, COL_SKIN, 2);

    // Head
    circle(g, px + 1.5 + lean, py - 16, 2.5, COL_SKIN);
  }
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.3;

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, 0, 0);
  drawTower(g, 0, 0);
  drawDrawbridge(g, 0, 0, Math.PI * 0.1); // mostly closed
  drawPushers(g, 0, breathe);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const roll = cycle * Math.PI * 2;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 4)) * 1.5;
  const sway = Math.sin(cycle * Math.PI * 2) * 1;
  const pushPhase = cycle * Math.PI * 4;

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, roll, bounce);
  drawTower(g, bounce, sway);
  drawDrawbridge(g, bounce, sway, Math.PI * 0.1);
  drawPushers(g, bounce, pushPhase);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 0-1: approach, 2: drawbridge drops, 3-4: CRASH into building, 5: settle
  let sway = 0;
  let dropAngle = Math.PI * 0.1;
  let impact = 0;

  if (frame <= 1) {
    sway = -frame * 1.5;
  } else if (frame === 2) {
    sway = -3;
    dropAngle = Math.PI * 0.4; // drawbridge dropping
  } else if (frame === 3) {
    sway = -5;
    dropAngle = Math.PI * 0.5; // fully open
    impact = 2;
  } else if (frame === 4) {
    sway = -3;
    dropAngle = Math.PI * 0.5;
    impact = 1;
  } else {
    sway = -1;
    dropAngle = Math.PI * 0.3; // pulling back
  }

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, frame * 0.2, impact);
  drawTower(g, impact, sway);
  drawDrawbridge(g, impact, sway, dropAngle);
  drawPushers(g, impact, frame * 0.8);

  // Impact debris
  if (frame >= 3 && frame <= 4) {
    for (let i = 0; i < 5; i++) {
      const dx = -15 - i * 4 + sway;
      const dy = -20 + i * 6 - impact * 3;
      rect(g, CX + dx, GY + dy, 3, 2, COL_WOOD_LT, 0.6);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fade = Math.max(0, 1 - t * 0.7);
  const topple = t * t * 20;
  const tilt = t * 8;

  g.alpha = fade;

  ellipse(g, CX, GY, 28 * (1 - t * 0.3), 5 * (1 - t * 0.3), COL_SHADOW, 0.3 * fade);

  drawWheels(g, t * 1.5, topple * 0.3);
  drawTower(g, topple * 0.3, -tilt);

  // Tower collapsing — debris flying
  if (t > 0.3) {
    for (let i = 0; i < 6; i++) {
      const dx = (i - 3) * 6 + t * (i - 2.5) * 4;
      const dy = -30 + t * t * 25 + i * 5;
      rect(g, CX + dx, GY - 40 + dy, 4, 3, i % 2 === 0 ? COL_WOOD_DK : COL_IRON_DK, fade);
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

export function generateSiegeTowerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
