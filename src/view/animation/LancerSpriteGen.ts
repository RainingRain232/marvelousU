// Procedural sprite generator for the Lancer unit type.
//
// Draws a detailed medieval fantasy lancer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Medium armor for balance of protection and speed
//   • Medium warhorse for charging
//   • Long lance for devastating charges
//   • Shield for defense
//   • Heraldic symbols on armor
//   • Heavy riding boots
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ medium cavalry with lance
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x8899aa;
const COL_ARMOR_HI  = 0xaabbcc;
const COL_ARMOR_DK  = 0x667788;
const COL_HORSE     = 0x6b5737;
const COL_HORSE_DK  = 0x4b4727;
const COL_HORSE_HI  = 0x7b7757;
const COL_MANE      = 0x4a3c28;
const COL_SADDLE    = 0x664422;
const COL_SADDLE_DK = 0x443322;
const COL_LANCE     = 0x8b6f47;
const COL_LANCE_HI = 0x9b8567;
const COL_SHIELD    = 0x4455aa;
const COL_SHIELD_RIM= 0x886633;
const COL_HERALD    = 0xffd700;
const COL_BOOT      = 0x443322;
const COL_BANNER    = 0xff0000;
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
  
  // Medium helmet
  drawCircle(g, x, y, 6, COL_ARMOR);
  drawCircle(g, x, y, 5, COL_ARMOR_HI);
  
  // Visor opening
  g.fill({ color: COL_SKIN });
  g.ellipse(x, y + 1, 4, 3);
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Medium armor torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  
  // Heraldic symbol on chest
  g.fill({ color: COL_HERALD });
  g.moveTo(x - 2, y + 4)
    .lineTo(x + 2, y + 4)
    .lineTo(x + 2, y + 8)
    .lineTo(x, y + 10)
    .lineTo(x - 2, y + 8)
    .lineTo(x - 2, y + 4)
    .fill();
  
  // Armor shadows
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - w/2 + 2, y + 3, w - 4, 2);
}

function drawMediumHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Medium horse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 14, 7);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 12, 5);
  
  // Horse legs (4 legs)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 2.5;
  
  // Front legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 7, y + 4 + bob, 2, 6);
  g.rect(x - 3, y + 4 + bob - legOffset, 2, 6 + legOffset);
  
  // Back legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x + 1, y + 4 + bob - legOffset, 2, 6 + legOffset);
  g.rect(x + 5, y + 4 + bob, 2, 6);
  
  // Medium mane
  g.fill({ color: COL_MANE });
  g.rect(x - 10, y - 2 + bob, 4, 5);
  
  // Medium tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2.5;
  g.fill({ color: COL_MANE });
  g.rect(x + 9, y + tailSway, 5, 2);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Medium saddle
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 7, 3.5);
  
  // Saddle details
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 5, 2);
  
  // Saddle straps
  drawLine(g, x - 5, y, x - 5, y + 3.5, COL_SADDLE_DK, 1);
  drawLine(g, x + 5, y, x + 5, y + 3.5, COL_SADDLE_DK, 1);
  
  // Banner attachment
  drawLine(g, x, y, x, y - 5, COL_SADDLE, 2);
}

function drawLance(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Lance shaft
  const lanceLength = 16;
  const lanceEndX = x + Math.cos(angle) * lanceLength;
  const lanceEndY = y + Math.sin(angle) * lanceLength;
  
  drawLine(g, x, y, lanceEndX, lanceEndY, COL_LANCE, 4);
  drawLine(g, x, y - 1, lanceEndX, lanceEndY - 1, COL_LANCE_HI, 2);
  
  // Lance tip
  const tipLength = 6;
  const tipX = lanceEndX + Math.cos(angle) * tipLength;
  const tipY = lanceEndY + Math.sin(angle) * tipLength;
  
  g.fill({ color: COL_LANCE });
  g.moveTo(tipX - Math.cos(angle) * 2, tipY - Math.sin(angle) * 2)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 1, tipY - Math.sin(angle) * 1)
    .fill();
  
  // Lance tip highlight
  g.fill({ color: COL_LANCE_HI });
  g.moveTo(tipX - Math.cos(angle) * 1.5, tipY - Math.sin(angle) * 1.5)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 0.5, tipY - Math.sin(angle) * 0.5)
    .fill();
  
  // Lance banner
  if (angle === 0) {
    g.fill({ color: COL_BANNER });
    g.rect(lanceEndX - 1, lanceEndY - 8, 2, 6);
    g.fill({ color: COL_HERALD });
    g.rect(lanceEndX - 0.5, lanceEndY - 7, 1, 4);
  }
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
  
  // Shield boss
  drawCircle(g, x, y, 2 * scale, COL_ARMOR);
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on medium horse
  drawBody(g, x, y - 7 + breathe, 9, 10);
  drawHead(g, x, y - 15 + breathe);
  
  // Arms holding lance
  drawLine(g, x - 3, y - 3 + breathe, x + 6, y - 5 + breathe, COL_ARMOR, 2);
  drawLine(g, x - 3, y - 5 + breathe, x + 6, y - 7 + breathe, COL_ARMOR, 2);
  
  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 3, y + 1, 2, 4);
  g.rect(x + 1, y + 1, 2, 4);
  
  g.fill({ color: COL_BOOT });
  g.rect(x - 3, y + 3, 2, 2);
  g.rect(x + 1, y + 3, 2, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.1;
  
  // Shadow
  drawEllipse(g, CX, GY, 15, 6, COL_SHADOW);
  
  // Medium horse
  drawMediumHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Lance (ready position)
  drawLance(g, CX + 6, 18 + breathe, -Math.PI / 6);
  
  // Shield
  drawShield(g, CX - 8, 22 + breathe, 0.8);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 15, 6, COL_SHADOW);
  
  // Medium horse (walking)
  drawMediumHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Lance (angled for movement)
  const lanceAngle = -Math.PI / 6 + Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawLance(g, CX + 6, 18 + riderBob + breathe, lanceAngle);
  
  // Shield
  drawShield(g, CX - 8, 22 + riderBob + breathe, 0.8);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const charge = t < 0.6 ? t / 0.6 : (1 - t) / 0.4; // Charge forward then back
  const lean = charge * 0.4; // Lean into charge
  
  // Shadow
  drawEllipse(g, CX, GY, 15, 6, COL_SHADOW);
  
  // Medium horse (charging)
  const horseBob = Math.sin(t * Math.PI * 4) * 2;
  drawMediumHorse(g, CX, 28 + horseBob, 0);
  
  // Saddle
  drawSaddle(g, CX, 24 + horseBob);
  
  // Rider (leaning forward)
  drawRider(g, CX + lean * 4, 24 + horseBob - lean * 2);
  
  // Lance (charging position)
  const lanceAngle = -Math.PI / 4 + charge * Math.PI / 3;
  drawLance(g, CX + 6 + lean * 4, 18 + horseBob - lean * 2, lanceAngle);
  
  // Shield (held back during charge)
  drawShield(g, CX - 12, 22 + horseBob - lean * 2, 0.6);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Lancer doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 15 * (1 - t), 6 * (1 - t), COL_SHADOW);
  
  // Medium horse (falling)
  if (t < 0.7) {
    drawMediumHorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Lance (falling separately)
  if (t > 0.2) {
    drawLance(g, CX + fallX + 6, 18 + dropY, Math.PI / 2);
  }
  
  // Shield (dropping)
  if (t < 0.6) {
    drawShield(g, CX + fallX - 8, 22 + dropY, 0.8 * (1 - t));
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
 * Generate all lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
