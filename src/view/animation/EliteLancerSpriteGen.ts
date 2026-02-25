// Procedural sprite generator for the Elite Lancer unit type.
//
// Draws a detailed medieval fantasy elite lancer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Heavy armor for maximum protection
//   • Large warhorse for devastating charges
//   • Very long lance with banner
//   • Large shield with heraldic design
//   • Ornate helmet with plume
//   • Elite heraldic symbols
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ elite heavy cavalry
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x778899;
const COL_ARMOR_HI  = 0x99aabb;
const COL_ARMOR_DK  = 0x556677;
const COL_HORSE     = 0x4a3c28;
const COL_HORSE_DK  = 0x3a2c18;
const COL_HORSE_HI  = 0x5a4c38;
const COL_MANE      = 0x332211;
const COL_SADDLE    = 0x664422;
const COL_SADDLE_DK = 0x443322;
const COL_LANCE     = 0x8b6f47;
const COL_LANCE_HI = 0x9b8567;
const COL_SHIELD    = 0x3355aa;
const COL_SHIELD_RIM= 0x886633;
const COL_PLUME     = 0xff0000;
const COL_HERALD    = 0xffd700;
const COL_BOOT      = 0x443322;
const COL_BANNER    = 0x0000ff;
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
  
  // Heavy helmet
  drawCircle(g, x, y, 6, COL_ARMOR);
  drawCircle(g, x, y, 5, COL_ARMOR_HI);
  
  // Visor opening
  g.fill({ color: COL_SKIN });
  g.ellipse(x, y + 1, 3, 2.5);
  
  // Plume
  g.fill({ color: COL_PLUME });
  g.moveTo(x, y - 6)
    .lineTo(x - 2, y - 10)
    .lineTo(x + 2, y - 10)
    .lineTo(x, y - 6)
    .fill();
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Heavy armor torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  
  // Elite heraldic symbol on chest
  g.fill({ color: COL_HERALD });
  g.moveTo(x - 3, y + 3)
    .lineTo(x + 3, y + 3)
    .lineTo(x + 3, y + 7)
    .lineTo(x, y + 9)
    .lineTo(x - 3, y + 7)
    .lineTo(x - 3, y + 3)
    .fill();
  
  // Armor shadows
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - w/2 + 2, y + 3, w - 4, 2);
}

function drawLargeHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 0.5;
  
  // Large horse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 16, 8);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 14, 6);
  
  // Horse legs (4 legs)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Front legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 8, y + 5 + bob, 2.5, 6);
  g.rect(x - 3, y + 5 + bob - legOffset, 2.5, 6 + legOffset);
  
  // Back legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x + 0.5, y + 5 + bob - legOffset, 2.5, 6 + legOffset);
  g.rect(x + 5.5, y + 5 + bob, 2.5, 6);
  
  // Large mane
  g.fill({ color: COL_MANE });
  g.rect(x - 12, y - 2 + bob, 5, 6);
  
  // Large tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2;
  g.fill({ color: COL_MANE });
  g.rect(x + 11, y + tailSway, 6, 2.5);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Heavy saddle
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 8, 4);
  
  // Saddle details
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 6, 2.5);
  
  // Saddle straps
  drawLine(g, x - 6, y, x - 6, y + 4, COL_SADDLE_DK, 1);
  drawLine(g, x + 6, y, x + 6, y + 4, COL_SADDLE_DK, 1);
  
  // Banner attachment
  drawLine(g, x, y, x, y - 6, COL_SADDLE, 2);
}

function drawLongLance(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Very long lance shaft
  const lanceLength = 20;
  const lanceEndX = x + Math.cos(angle) * lanceLength;
  const lanceEndY = y + Math.sin(angle) * lanceLength;
  
  drawLine(g, x, y, lanceEndX, lanceEndY, COL_LANCE, 5);
  drawLine(g, x, y - 1, lanceEndX, lanceEndY - 1, COL_LANCE_HI, 2);
  
  // Lance tip
  const tipLength = 8;
  const tipX = lanceEndX + Math.cos(angle) * tipLength;
  const tipY = lanceEndY + Math.sin(angle) * tipLength;
  
  g.fill({ color: COL_LANCE });
  g.moveTo(tipX - Math.cos(angle) * 3, tipY - Math.sin(angle) * 3)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 1.5, tipY - Math.sin(angle) * 1.5)
    .fill();
  
  // Lance tip highlight
  g.fill({ color: COL_LANCE_HI });
  g.moveTo(tipX - Math.cos(angle) * 2, tipY - Math.sin(angle) * 2)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 1, tipY - Math.sin(angle) * 1)
    .fill();
  
  // Large lance banner
  if (angle === 0) {
    g.fill({ color: COL_BANNER });
    g.rect(lanceEndX - 1.5, lanceEndY - 10, 3, 8);
    g.fill({ color: COL_HERALD });
    g.rect(lanceEndX - 1, lanceEndY - 9, 2, 6);
    
    // Cross on banner
    g.fill({ color: COL_PLUME });
    g.moveTo(lanceEndX - 0.5, lanceEndY - 7)
      .lineTo(lanceEndX + 0.5, lanceEndY - 7)
      .lineTo(lanceEndX + 0.5, lanceEndY - 5)
      .lineTo(lanceEndX + 1, lanceEndY - 5)
      .lineTo(lanceEndX + 1, lanceEndY - 7)
      .lineTo(lanceEndX + 0.5, lanceEndY - 7)
      .lineTo(lanceEndX + 0.5, lanceEndY - 9)
      .lineTo(lanceEndX - 0.5, lanceEndY - 9)
      .lineTo(lanceEndX - 0.5, lanceEndY - 7)
      .lineTo(lanceEndX - 1, lanceEndY - 7)
      .lineTo(lanceEndX - 1, lanceEndY - 5)
      .lineTo(lanceEndX - 0.5, lanceEndY - 5)
      .lineTo(lanceEndX - 0.5, lanceEndY - 7)
      .fill();
  }
}

function drawLargeShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 12 * scale;
  const h = 14 * scale;
  
  // Large kite shield
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
  
  // Shield boss
  drawCircle(g, x, y, 2.5 * scale, COL_ARMOR);
  
  // Heraldic symbol on shield
  g.fill({ color: COL_HERALD });
  g.moveTo(x - 2, y - 2)
    .lineTo(x + 2, y - 2)
    .lineTo(x + 2, y + 2)
    .lineTo(x, y + 4)
    .lineTo(x - 2, y + 2)
    .lineTo(x - 2, y - 2)
    .fill();
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on large horse
  drawBody(g, x, y - 8 + breathe, 10, 11);
  drawHead(g, x, y - 16 + breathe);
  
  // Arms holding lance
  drawLine(g, x - 3, y - 3 + breathe, x + 7, y - 5 + breathe, COL_ARMOR, 2.5);
  drawLine(g, x - 3, y - 5 + breathe, x + 7, y - 7 + breathe, COL_ARMOR, 2.5);
  
  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 3.5, y + 1, 2.5, 4);
  g.rect(x + 1, y + 1, 2.5, 4);
  
  g.fill({ color: COL_BOOT });
  g.rect(x - 3.5, y + 3, 2.5, 2);
  g.rect(x + 1, y + 3, 2.5, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.1;
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 7, COL_SHADOW);
  
  // Large horse
  drawLargeHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Long lance (ready position)
  drawLongLance(g, CX + 7, 18 + breathe, -Math.PI / 8);
  
  // Large shield
  drawLargeShield(g, CX - 9, 22 + breathe, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 7, COL_SHADOW);
  
  // Large horse (walking)
  drawLargeHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Long lance (angled for movement)
  const lanceAngle = -Math.PI / 8 + Math.sin(walkCycle * Math.PI * 2) * 0.15;
  drawLongLance(g, CX + 7, 18 + riderBob + breathe, lanceAngle);
  
  // Large shield
  drawLargeShield(g, CX - 9, 22 + riderBob + breathe, 0.9);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const charge = t < 0.6 ? t / 0.6 : (1 - t) / 0.4; // Devastating charge
  const lean = charge * 0.5; // Lean heavily into charge
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 7, COL_SHADOW);
  
  // Large horse (charging)
  const horseBob = Math.sin(t * Math.PI * 4) * 3;
  drawLargeHorse(g, CX, 28 + horseBob, 0);
  
  // Saddle
  drawSaddle(g, CX, 24 + horseBob);
  
  // Rider (leaning forward)
  drawRider(g, CX + lean * 5, 24 + horseBob - lean * 3);
  
  // Long lance (devastating charge)
  const lanceAngle = -Math.PI / 6 + charge * Math.PI / 2;
  drawLongLance(g, CX + 7 + lean * 5, 18 + horseBob - lean * 3, lanceAngle);
  
  // Large shield (held back during charge)
  drawLargeShield(g, CX - 14, 22 + horseBob - lean * 3, 0.7);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Elite Lancer doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 16 * (1 - t), 7 * (1 - t), COL_SHADOW);
  
  // Large horse (falling)
  if (t < 0.7) {
    drawLargeHorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Long lance (falling separately)
  if (t > 0.2) {
    drawLongLance(g, CX + fallX + 7, 18 + dropY, Math.PI / 2);
  }
  
  // Large shield (dropping)
  if (t < 0.6) {
    drawLargeShield(g, CX + fallX - 9, 22 + dropY, 0.9 * (1 - t));
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
 * Generate all elite lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateEliteLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
