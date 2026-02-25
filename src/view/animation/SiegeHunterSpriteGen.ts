// Procedural sprite generator for the Siege Hunter unit type.
//
// Draws a detailed medieval fantasy siege hunter at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Heavy armor with siege engineering tools
//   • Full helmet with visor
//   • Large hammer for destroying siege weapons
//   • Tool belt with wrenches and spikes
//   • Heavy boots for stability
//   • Shield for protection
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ heavy siege engineer
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x667788;
const COL_ARMOR_HI  = 0x8899aa;
const COL_ARMOR_DK  = 0x445566;
const COL_HELM      = 0x556677;
const COL_HELM_HI   = 0x778899;
const COL_VISOR     = 0x1a1a2e;
const COL_HAMMER    = 0x886633;
const COL_HAMMER_HI = 0xaaa855;
const COL_HAMMER_DK = 0x664422;
const COL_SHIELD    = 0x3355aa;
const COL_SHIELD_RIM= 0x886633;
const COL_TOOLBELT  = 0x4a3c28;
const COL_TOOLBELT_DK = 0x3a2c18;
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
  
  // Full helmet
  drawCircle(g, x, y, 7, COL_HELM);
  drawCircle(g, x, y, 6, COL_HELM_HI);
  
  // Visor
  drawLine(g, x - 7, y, x - 5, y + 2, COL_VISOR, 2);
  drawLine(g, x + 7, y, x + 5, y + 2, COL_VISOR, 2);
  drawLine(g, x - 5, y + 2, x + 5, y + 2, COL_VISOR, 2);
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Heavy armor torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor plates
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  g.rect(x - w/2 + 1, y + h - 3, w - 2, 2);
  
  // Armor shadows
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - w/2 + 2, y + 3, w - 4, 2);
}

function drawHammer(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Hammer handle
  const handleLength = 12;
  const handleEndX = x + Math.cos(angle) * handleLength;
  const handleEndY = y + Math.sin(angle) * handleLength;
  drawLine(g, x, y, handleEndX, handleEndY, COL_HAMMER_DK, 3);
  drawLine(g, x, y - 1, handleEndX, handleEndY - 1, COL_HAMMER, 1);
  
  // Hammer head
  const headSize = 6;
  const headX = handleEndX + Math.cos(angle) * headSize;
  const headY = handleEndY + Math.sin(angle) * headSize;
  
  // Perpendicular hammer head
  const perpAngle = angle + Math.PI / 2;
  const headWidth = 8;
  const headX1 = headX + Math.cos(perpAngle) * headWidth;
  const headY1 = headY + Math.sin(perpAngle) * headWidth;
  const headX2 = headX - Math.cos(perpAngle) * headWidth;
  const headY2 = headY - Math.sin(perpAngle) * headWidth;
  
  g.fill({ color: COL_HAMMER });
  g.moveTo(headX1, headY1)
    .lineTo(headX2, headY2)
    .lineTo(headX2 + Math.cos(angle) * 3, headY2 + Math.sin(angle) * 3)
    .lineTo(headX1 + Math.cos(angle) * 3, headY1 + Math.sin(angle) * 3)
    .fill();
  
  // Hammer head highlight
  g.fill({ color: COL_HAMMER_HI });
  g.moveTo(headX1, headY1)
    .lineTo(headX2, headY2)
    .lineTo(headX2 + Math.cos(angle) * 2, headY2 + Math.sin(angle) * 2)
    .lineTo(headX1 + Math.cos(angle) * 2, headY1 + Math.sin(angle) * 2)
    .fill();
}

function drawShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 10 * scale;
  const h = 12 * scale;
  
  // Kite shield
  g.fill({ color: COL_SHIELD });
  g.moveTo(x, y - h/2)
    .lineTo(x + w/2, y - h/3)
    .lineTo(x + w/2, y + h/3)
    .lineTo(x, y + h/2)
    .lineTo(x - w/2, y + h/3)
    .lineTo(x - w/2, y - h/3)
    .fill();
  
  // Shield rim
  g.fill({ color: COL_SHIELD_RIM });
  g.moveTo(x, y - h/2 + 1)
    .lineTo(x + w/2 - 1, y - h/3 + 1)
    .lineTo(x + w/2 - 1, y + h/3 - 1)
    .lineTo(x, y + h/2 - 1)
    .lineTo(x - w/2 + 1, y + h/3 - 1)
    .lineTo(x - w/2 + 1, y - h/3 + 1)
    .fill();
}

function drawToolBelt(g: Graphics, x: number, y: number): void {
  // Belt
  g.fill({ color: COL_TOOLBELT });
  g.rect(x - 8, y, 16, 3);
  
  // Belt shadow
  g.fill({ color: COL_TOOLBELT_DK });
  g.rect(x - 7, y + 1, 14, 1);
  
  // Tools on belt
  drawCircle(g, x - 5, y + 1.5, 1.5, COL_HAMMER_DK); // Wrench
  drawCircle(g, x + 5, y + 1.5, 1, COL_ARMOR); // Spike
}

function drawLegs(g: Graphics, x: number, y: number, walkCycle: number): void {
  const offset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Left leg
  g.fill({ color: COL_ARMOR });
  g.rect(x - 4, y, 3, 8);
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - 3, y + 2, 1, 4);
  g.fill({ color: COL_BOOT });
  g.rect(x - 4, y + 6, 3, 4);
  
  // Right leg (opposite phase)
  g.fill({ color: COL_ARMOR });
  g.rect(x + 1, y - offset, 3, 8 + offset);
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x + 2, y + 2 - offset, 1, 4);
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
  
  // Legs
  drawLegs(g, CX, 32, 0);
  
  // Body
  drawBody(g, CX, 20 + breathe, 12, 12);
  
  // Tool belt
  drawToolBelt(g, CX, 28 + breathe);
  
  // Head
  drawHead(g, CX, 14 + breathe);
  
  // Shield
  drawShield(g, CX - 8, 22 + breathe, 0.8);
  
  // Hammer (resting on shoulder)
  drawHammer(g, CX + 8, 18 + breathe, -Math.PI / 4);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const bob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * 2;
  const sway = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Legs (walking)
  drawLegs(g, CX + sway, 32, walkCycle);
  
  // Body
  drawBody(g, CX + sway, 20 + bob, 12, 12);
  
  // Tool belt
  drawToolBelt(g, CX + sway, 28 + bob);
  
  // Head
  drawHead(g, CX + sway, 14 + bob);
  
  // Shield
  drawShield(g, CX - 8 + sway, 22 + bob, 0.8);
  
  // Hammer (swaying with movement)
  const hammerAngle = -Math.PI / 4 + Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawHammer(g, CX + 8 + sway, 18 + bob, hammerAngle);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const swing = t < 0.5 ? t * 2 : (1 - t) * 2; // Swing forward then back
  const lean = swing * 0.3; // Lean into swing
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Legs (planted stance)
  drawLegs(g, CX, 32, 0);
  
  // Body (leaning forward)
  drawBody(g, CX + lean * 4, 20 - lean * 2, 12, 12);
  
  // Tool belt
  drawToolBelt(g, CX + lean * 4, 28 - lean * 2);
  
  // Head
  drawHead(g, CX + lean * 4, 14 - lean * 2);
  
  // Shield (held back during swing)
  drawShield(g, CX - 12, 22 - lean * 2, 0.6);
  
  // Hammer (powerful overhead swing)
  const hammerAngle = -Math.PI + swing * Math.PI;
  drawHammer(g, CX + 8 + lean * 4, 18 - lean * 2, hammerAngle);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Siege Hunter doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 12 * (1 - t), 4 * (1 - t), COL_SHADOW);
  
  // Legs (falling)
  if (t < 0.7) {
    drawLegs(g, CX + fallX, 32, 0);
  }
  
  // Body (falling)
  if (t < 0.6) {
    drawBody(g, CX + fallX, 20 + dropY, 12, 12);
  }
  
  // Tool belt
  if (t < 0.5) {
    drawToolBelt(g, CX + fallX, 28 + dropY);
  }
  
  // Head
  if (t < 0.4) {
    drawHead(g, CX + fallX, 14 + dropY);
  }
  
  // Shield (dropping)
  if (t < 0.6) {
    drawShield(g, CX + fallX, 22 + dropY, 0.8 * (1 - t));
  }
  
  // Hammer (falling separately)
  if (t > 0.2) {
    drawHammer(g, CX + fallX + 8, 18 + dropY, Math.PI / 2);
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

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
