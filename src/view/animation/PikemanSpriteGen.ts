// Procedural sprite generator for the Pikeman unit type.
//
// Draws a detailed medieval fantasy pikeman at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Light chainmail with leather accents
//   • Open-face helmet with cheek guards
//   • Long pike (polearm) with spear tip
//   • Small round shield
//   • Leather boots and leggings
//   • Two-handed grip on pike
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ light infantry with polearm
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x99aabb;
const COL_ARMOR_HI  = 0xbbccdd;
const COL_LEATHER   = 0x8b6f47;
const COL_HELM      = 0x8899aa;
const COL_HELM_HI   = 0xaabbcc;
const COL_PIKE_SHAFT = 0x8b6f47;
const COL_PIKE_TIP  = 0xc0c8d0;
const COL_PIKE_TIP_HI = 0xe0e8f0;
const COL_SHIELD    = 0x558833;
const COL_SHIELD_RIM= 0x886633;
const COL_BOOT      = 0x443322;
const COL_SHADOW    = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function drawEllipse(g: Graphics, x: number, y: number, w: number, h: number, color: number): void {
  g.fill({ color });
  g.ellipse(x, y, w, h);
}

function drawCircle(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.fill({ color });
  g.circle(x, y, r);
}

function drawLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, width: number = 1): void {
  g.stroke({ color, width });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

// ---------------------------------------------------------------------------
// Component drawing functions
// ---------------------------------------------------------------------------

function drawHead(g: Graphics, x: number, y: number): void {
  // Head
  drawCircle(g, x, y, 6, COL_SKIN);
  
  // Open-face helmet
  drawCircle(g, x, y, 7, COL_HELM);
  drawCircle(g, x, y, 6, COL_HELM_HI);
  
  // Cheek guards
  drawLine(g, x - 7, y, x - 9, y + 3, COL_HELM, 2);
  drawLine(g, x + 7, y, x + 9, y + 3, COL_HELM, 2);
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Chainmail torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  g.rect(x - w/2 + 1, y + h - 3, w - 2, 2);
  
  // Leather accents
  g.fill({ color: COL_LEATHER });
  g.rect(x - w/2, y + h/2, w, 3);
}

function drawPike(g: Graphics, x1: number, y1: number, x2: number, y2: number, tipDir: number = 1): void {
  // Pike shaft
  drawLine(g, x1, y1, x2, y2, COL_PIKE_SHAFT, 3);
  drawLine(g, x1, y1 - 1, x2, y2 - 1, COL_PIKE_SHAFT, 1);
  
  // Spear tip
  const tipX = x2 + tipDir * 4;
  const tipY = y2;
  g.fill({ color: COL_PIKE_TIP });
  g.moveTo(tipX - tipDir * 3, tipY - 3)
    .lineTo(tipX, tipY)
    .lineTo(tipX - tipDir * 3, tipY + 3)
    .lineTo(tipX - tipDir * 2, tipY)
    .fill();
  
  g.fill({ color: COL_PIKE_TIP_HI });
  g.moveTo(tipX - tipDir * 2, tipY - 1)
    .lineTo(tipX - tipDir * 1, tipY)
    .lineTo(tipX - tipDir * 2, tipY + 1)
    .fill();
}

function drawShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const r = 6 * scale;
  // Round shield
  drawCircle(g, x, y, r, COL_SHIELD);
  drawCircle(g, x, y, r - 1, COL_SHIELD_RIM);
  
  // Shield boss
  drawCircle(g, x, y, 2 * scale, COL_SHIELD_RIM);
}

function drawLegs(g: Graphics, x: number, y: number, walkCycle: number): void {
  const offset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Left leg
  g.fill({ color: COL_LEATHER });
  g.rect(x - 4, y, 3, 8);
  g.fill({ color: COL_BOOT });
  g.rect(x - 4, y + 6, 3, 4);
  
  // Right leg (opposite phase)
  g.fill({ color: COL_LEATHER });
  g.rect(x + 1, y - offset, 3, 8 + offset);
  g.fill({ color: COL_BOOT });
  g.rect(x + 1, y + 6 - offset, 3, 4);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Body
  drawBody(g, CX, 20 + breathe, 10, 12);
  
  // Head
  drawHead(g, CX, 14 + breathe);
  
  // Pike (resting on shoulder)
  drawPike(g, CX - 8, 18 + breathe, CX + 12, 8 + breathe, -1);
  
  // Shield
  drawShield(g, CX + 8, 22 + breathe, 0.8);
  
  // Legs
  drawLegs(g, CX, 32, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const bob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * 2;
  const sway = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Body
  drawBody(g, CX + sway, 20 + bob, 10, 12);
  
  // Head
  drawHead(g, CX + sway, 14 + bob);
  
  // Pike (angled for movement)
  const pikeAngle = Math.sin(walkCycle * Math.PI * 2) * 0.3;
  drawPike(g, CX - 8 + sway, 18 + bob, CX + 10 + sway + pikeAngle * 8, 10 + bob + pikeAngle * 4, -1);
  
  // Shield
  drawShield(g, CX + 8 + sway, 22 + bob, 0.8);
  
  // Legs (walking)
  drawLegs(g, CX + sway, 32, walkCycle);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const lunge = t < 0.5 ? t * 2 : (1 - t) * 2; // Forward then back
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Body (leaning forward)
  drawBody(g, CX + lunge * 4, 20 - lunge * 2, 10, 12);
  
  // Head
  drawHead(g, CX + lunge * 4, 14 - lunge * 2);
  
  // Pike (thrusting motion)
  const thrust = t < 0.5 ? t * 20 : (1 - t) * 20 + 10;
  drawPike(g, CX - 8 + lunge * 4, 18 - lunge * 2, CX + thrust, 10 - lunge * 2, 1);
  
  // Shield (held back during thrust)
  drawShield(g, CX - 8, 22 - lunge * 2, 0.6);
  
  // Legs (planted stance)
  drawLegs(g, CX + lunge * 2, 32, 0);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Pikeman doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 8;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 12 * (1 - t), 4 * (1 - t), COL_SHADOW);
  
  // Body (falling)
  if (t < 0.8) {
    drawBody(g, CX + fallX, 20 + dropY, 10, 12);
  }
  
  // Head
  if (t < 0.6) {
    drawHead(g, CX + fallX, 14 + dropY);
  }
  
  // Pike (falling separately)
  if (t > 0.2) {
    const pikeFall = (t - 0.2) * 20;
    drawPike(g, CX + fallX + pikeFall, 18 + dropY, CX + fallX + pikeFall + 15, 10 + dropY, 0.5);
  }
  
  // Shield (dropping)
  if (t < 0.7) {
    drawShield(g, CX + fallX, 22 + dropY, 0.8 * (1 - t));
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
