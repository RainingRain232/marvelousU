// Procedural sprite generator for the Scout Cavalry unit type.
//
// Draws a detailed medieval fantasy scout cavalry at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Light armor for speed and mobility
//   • Small horse for scouting
//   • Short sword for quick strikes
//   • Light shield for defense
//   • Scout gear (binoculars, maps)
//   • Fast riding boots
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ light fast cavalry
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x99aabb;
const COL_ARMOR_HI  = 0xbbccdd;
const COL_ARMOR_DK  = 0x667788;
const COL_HORSE     = 0xa08866;
const COL_HORSE_DK  = 0x806846;
const COL_HORSE_HI  = 0xb0a896;
const COL_MANE      = 0x664422;
const COL_SADDLE    = 0x4a3c28;
const COL_SADDLE_DK = 0x3a2c18;
const COL_SWORD     = 0xc0c8d0;
const COL_SWORD_HI  = 0xe0e8f0;
const COL_SHIELD    = 0x558833;
const COL_SHIELD_RIM= 0x886633;
const COL_BOOT      = 0x443322;
const COL_SCOUT_GEAR = 0x8b6f47;
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
  drawCircle(g, x, y, 5, COL_SKIN);
  
  // Light helmet
  drawCircle(g, x, y, 6, COL_ARMOR);
  drawCircle(g, x, y, 5, COL_ARMOR_HI);
  
  // Visor opening
  g.fill({ color: COL_SKIN });
  g.ellipse(x, y + 1, 4, 3);
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Light armor torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  
  // Scout gear on back
  g.fill({ color: COL_SCOUT_GEAR });
  g.rect(x + w/2 - 3, y + 2, 2, h - 2);
}

function drawSmallHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;
  
  // Small horse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 12, 6);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 10, 4);
  
  // Horse legs (4 legs, faster movement)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 3;
  
  // Front legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 6, y + 3 + bob, 1.5, 5);
  g.rect(x - 3, y + 3 + bob - legOffset, 1.5, 5 + legOffset);
  
  // Back legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x + 1.5, y + 3 + bob - legOffset, 1.5, 5 + legOffset);
  g.rect(x + 4.5, y + 3 + bob, 1.5, 5);
  
  // Short mane
  g.fill({ color: COL_MANE });
  g.rect(x - 8, y - 1 + bob, 3, 4);
  
  // Short tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 3;
  g.fill({ color: COL_MANE });
  g.rect(x + 8, y + tailSway, 4, 1.5);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Light saddle
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 6, 3);
  
  // Saddle details
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 4, 1.5);
  
  // Saddle straps
  drawLine(g, x - 4, y, x - 4, y + 3, COL_SADDLE_DK, 1);
  drawLine(g, x + 4, y, x + 4, y + 3, COL_SADDLE_DK, 1);
}

function drawSword(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Short sword
  const swordLength = 8;
  const swordEndX = x + Math.cos(angle) * swordLength;
  const swordEndY = y + Math.sin(angle) * swordLength;
  
  drawLine(g, x, y, swordEndX, swordEndY, COL_SWORD, 2);
  drawLine(g, x, y - 0.5, swordEndX, swordEndY - 0.5, COL_SWORD_HI, 1);
  
  // Crossguard
  const crossguardAngle = angle + Math.PI / 2;
  const crossguardWidth = 4;
  const crossguardX1 = x + Math.cos(crossguardAngle) * crossguardWidth;
  const crossguardY1 = y + Math.sin(crossguardAngle) * crossguardWidth;
  const crossguardX2 = x - Math.cos(crossguardAngle) * crossguardWidth;
  const crossguardY2 = y - Math.sin(crossguardAngle) * crossguardWidth;
  
  g.fill({ color: COL_SWORD });
  g.moveTo(crossguardX1, crossguardY1)
    .lineTo(crossguardX2, crossguardY2)
    .lineTo(crossguardX2 + Math.cos(angle) * 1, crossguardY2 + Math.sin(angle) * 1)
    .lineTo(crossguardX1 + Math.cos(angle) * 1, crossguardY1 + Math.sin(angle) * 1)
    .fill();
  
  // Pommel
  drawCircle(g, swordEndX, swordEndY, 1.5, COL_ARMOR_DK);
}

function drawLightShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 8 * scale;
  
  // Light round shield
  drawCircle(g, x, y, w/2, COL_SHIELD);
  drawCircle(g, x, y, w/2 - 1, COL_SHIELD_RIM);
  
  // Shield boss
  drawCircle(g, x, y, 1.5 * scale, COL_ARMOR);
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on small horse
  drawBody(g, x, y - 6 + breathe, 7, 8);
  drawHead(g, x, y - 14 + breathe);
  
  // Arms holding sword
  drawLine(g, x - 3, y - 2 + breathe, x + 4, y - 4 + breathe, COL_ARMOR, 1.5);
  drawLine(g, x - 3, y - 4 + breathe, x + 4, y - 6 + breathe, COL_ARMOR, 1.5);
  
  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 2, y + 1, 1.5, 3);
  g.rect(x + 0.5, y + 1, 1.5, 3);
  
  g.fill({ color: COL_BOOT });
  g.rect(x - 2, y + 3, 1.5, 1.5);
  g.rect(x + 0.5, y + 3, 1.5, 1.5);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.1;
  
  // Shadow
  drawEllipse(g, CX, GY, 14, 5, COL_SHADOW);
  
  // Small horse
  drawSmallHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Sword (ready position)
  drawSword(g, CX + 5, 20 + breathe, -Math.PI / 4);
  
  // Light shield
  drawLightShield(g, CX - 6, 22 + breathe, 0.7);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 14, 5, COL_SHADOW);
  
  // Small horse (fast walking)
  drawSmallHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Sword (swaying with movement)
  const swordAngle = -Math.PI / 4 + Math.sin(walkCycle * Math.PI * 2) * 0.3;
  drawSword(g, CX + 5, 20 + riderBob + breathe, swordAngle);
  
  // Light shield
  drawLightShield(g, CX - 6, 22 + riderBob + breathe, 0.7);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const strike = t < 0.5 ? t * 2 : (1 - t) * 2; // Quick strike then back
  const lean = strike * 0.2; // Lean into strike
  
  // Shadow
  drawEllipse(g, CX, GY, 14, 5, COL_SHADOW);
  
  // Small horse (stationary during attack)
  drawSmallHorse(g, CX, 28, 0);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (leaning forward)
  drawRider(g, CX + lean * 3, 24 - lean * 2);
  
  // Sword (fast strike)
  const swordAngle = -Math.PI / 2 + strike * Math.PI / 3;
  drawSword(g, CX + 5 + lean * 3, 20 - lean * 2, swordAngle);
  
  // Light shield (held back during strike)
  drawLightShield(g, CX - 10, 22 - lean * 2, 0.5);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Scout Cavalry doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 14 * (1 - t), 5 * (1 - t), COL_SHADOW);
  
  // Small horse (falling)
  if (t < 0.7) {
    drawSmallHorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Sword (dropping)
  if (t < 0.4) {
    drawSword(g, CX + fallX + 5, 20 + dropY, Math.PI / 4);
  }
  
  // Light shield (dropping)
  if (t < 0.4) {
    drawLightShield(g, CX + fallX - 6, 22 + dropY, 0.7 * (1 - t));
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

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
