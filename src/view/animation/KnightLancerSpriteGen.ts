// Procedural sprite generator for the Knight Lancer unit type.
//
// Draws a detailed medieval fantasy knight lancer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Full plate armor with knight insignia
//   • Massive warhorse for maximum impact
//   • Enchanted lance with glowing tip
//   • Tower shield with knight crest
//   • Ornate helmet with crown plume
//   • Royal heraldic colors
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ royal knight lancer
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x8899aa;
const COL_ARMOR_HI  = 0xaabbcc;
const COL_ARMOR_DK  = 0x667788;
const COL_HORSE     = 0x332211;
const COL_HORSE_DK  = 0x231101;
const COL_HORSE_HI  = 0x433321;
const COL_MANE      = 0x1a1a1a;
const COL_SADDLE    = 0x886633;
const COL_SADDLE_DK = 0x664422;
const COL_LANCE     = 0xaaaadd;
const COL_LANCE_HI = 0xccddff;
const COL_LANCE_GLOW = 0xffffff;
const COL_SHIELD    = 0x4455aa;
const COL_SHIELD_RIM= 0x886633;
const COL_PLUME     = 0xffd700;
const COL_CREST     = 0xff0000;
const COL_BOOT      = 0x443322;
const COL_BANNER    = 0x000080;
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
  
  // Full plate helmet
  drawCircle(g, x, y, 6, COL_ARMOR);
  drawCircle(g, x, y, 5, COL_ARMOR_HI);
  
  // Visor opening
  g.fill({ color: COL_SKIN });
  g.ellipse(x, y + 1, 3, 2.5);
  
  // Crown plume
  g.fill({ color: COL_PLUME });
  g.moveTo(x, y - 7)
    .lineTo(x - 3, y - 11)
    .lineTo(x + 3, y - 11)
    .lineTo(x, y - 7)
    .fill();
  
  // Crown points
  g.fill({ color: COL_CREST });
  g.moveTo(x - 2, y - 9)
    .lineTo(x - 1, y - 12)
    .lineTo(x, y - 9)
    .lineTo(x + 1, y - 12)
    .lineTo(x + 2, y - 9)
    .lineTo(x, y - 7)
    .fill();
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Full plate armor torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w/2, y, w, h);
  
  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 2);
  
  // Knight crest on chest
  g.fill({ color: COL_CREST });
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

function drawMassiveHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 0.5;
  
  // Massive horse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 17, 9);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 15, 7);
  
  // Horse legs (4 legs)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Front legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 9, y + 5 + bob, 3, 7);
  g.rect(x - 3, y + 5 + bob - legOffset, 3, 7 + legOffset);
  
  // Back legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x + 0, y + 5 + bob - legOffset, 3, 7 + legOffset);
  g.rect(x + 6, y + 5 + bob, 3, 7);
  
  // Black mane
  g.fill({ color: COL_MANE });
  g.rect(x - 13, y - 2 + bob, 6, 7);
  
  // Black tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2;
  g.fill({ color: COL_MANE });
  g.rect(x + 13, y + tailSway, 7, 3);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Royal saddle
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 9, 4.5);
  
  // Saddle details
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 7, 3);
  
  // Saddle straps
  drawLine(g, x - 7, y, x - 7, y + 4.5, COL_SADDLE_DK, 1);
  drawLine(g, x + 7, y, x + 7, y + 4.5, COL_SADDLE_DK, 1);
  
  // Banner attachment
  drawLine(g, x, y, x, y - 7, COL_SADDLE, 2);
}

function drawEnchantedLance(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Enchanted lance shaft
  const lanceLength = 22;
  const lanceEndX = x + Math.cos(angle) * lanceLength;
  const lanceEndY = y + Math.sin(angle) * lanceLength;
  
  drawLine(g, x, y, lanceEndX, lanceEndY, COL_LANCE, 6);
  drawLine(g, x, y - 1, lanceEndX, lanceEndY - 1, COL_LANCE_HI, 3);
  
  // Enchanted lance tip
  const tipLength = 10;
  const tipX = lanceEndX + Math.cos(angle) * tipLength;
  const tipY = lanceEndY + Math.sin(angle) * tipLength;
  
  // Glowing tip
  g.fill({ color: COL_LANCE_GLOW });
  g.moveTo(tipX - Math.cos(angle) * 4, tipY - Math.sin(angle) * 4)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 2, tipY - Math.sin(angle) * 2)
    .fill();
  
  g.fill({ color: COL_LANCE });
  g.moveTo(tipX - Math.cos(angle) * 3, tipY - Math.sin(angle) * 3)
    .lineTo(tipX, tipY)
    .lineTo(tipX - Math.cos(angle) * 1.5, tipY - Math.sin(angle) * 1.5)
    .fill();
  
  // Royal lance banner
  if (angle === 0) {
    g.fill({ color: COL_BANNER });
    g.rect(lanceEndX - 2, lanceEndY - 12, 4, 10);
    g.fill({ color: COL_PLUME });
    g.rect(lanceEndX - 1.5, lanceEndY - 11, 3, 8);
    
    // Royal cross on banner
    g.fill({ color: COL_CREST });
    g.moveTo(lanceEndX - 0.5, lanceEndY - 8)
      .lineTo(lanceEndX + 0.5, lanceEndY - 8)
      .lineTo(lanceEndX + 0.5, lanceEndY - 6)
      .lineTo(lanceEndX + 1, lanceEndY - 6)
      .lineTo(lanceEndX + 1, lanceEndY - 8)
      .lineTo(lanceEndX + 0.5, lanceEndY - 8)
      .lineTo(lanceEndX + 0.5, lanceEndY - 10)
      .lineTo(lanceEndX - 0.5, lanceEndY - 10)
      .lineTo(lanceEndX - 0.5, lanceEndY - 8)
      .lineTo(lanceEndX - 1, lanceEndY - 8)
      .lineTo(lanceEndX - 1, lanceEndY - 6)
      .lineTo(lanceEndX - 0.5, lanceEndY - 6)
      .lineTo(lanceEndX - 0.5, lanceEndY - 8)
      .fill();
  }
}

function drawTowerShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 14 * scale;
  const h = 16 * scale;
  
  // Tower shield
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
  drawCircle(g, x, y, 3 * scale, COL_ARMOR);
  
  // Knight crest on shield
  g.fill({ color: COL_CREST });
  g.moveTo(x - 3, y - 3)
    .lineTo(x + 3, y - 3)
    .lineTo(x + 3, y + 3)
    .lineTo(x, y + 5)
    .lineTo(x - 3, y + 3)
    .lineTo(x - 3, y - 3)
    .fill();
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on massive horse
  drawBody(g, x, y - 9 + breathe, 11, 12);
  drawHead(g, x, y - 17 + breathe);
  
  // Arms holding enchanted lance
  drawLine(g, x - 3, y - 3 + breathe, x + 8, y - 5 + breathe, COL_ARMOR, 3);
  drawLine(g, x - 3, y - 5 + breathe, x + 8, y - 7 + breathe, COL_ARMOR, 3);
  
  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 4, y + 1, 3, 4);
  g.rect(x + 1, y + 1, 3, 4);
  
  g.fill({ color: COL_BOOT });
  g.rect(x - 4, y + 3, 3, 2);
  g.rect(x + 1, y + 3, 3, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.1;
  
  // Shadow
  drawEllipse(g, CX, GY, 17, 8, COL_SHADOW);
  
  // Massive horse
  drawMassiveHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Enchanted lance (ready position)
  drawEnchantedLance(g, CX + 8, 18 + breathe, -Math.PI / 10);
  
  // Tower shield
  drawTowerShield(g, CX - 10, 22 + breathe, 1);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 17, 8, COL_SHADOW);
  
  // Massive horse (walking)
  drawMassiveHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Enchanted lance (angled for movement)
  const lanceAngle = -Math.PI / 10 + Math.sin(walkCycle * Math.PI * 2) * 0.1;
  drawEnchantedLance(g, CX + 8, 18 + riderBob + breathe, lanceAngle);
  
  // Tower shield
  drawTowerShield(g, CX - 10, 22 + riderBob + breathe, 1);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const charge = t < 0.6 ? t / 0.6 : (1 - t) / 0.4; // Devastating charge
  const lean = charge * 0.6; // Lean heavily into charge
  
  // Shadow
  drawEllipse(g, CX, GY, 17, 8, COL_SHADOW);
  
  // Massive horse (charging)
  const horseBob = Math.sin(t * Math.PI * 4) * 3;
  drawMassiveHorse(g, CX, 28 + horseBob, 0);
  
  // Saddle
  drawSaddle(g, CX, 24 + horseBob);
  
  // Rider (leaning forward)
  drawRider(g, CX + lean * 6, 24 + horseBob - lean * 4);
  
  // Enchanted lance (devastating charge)
  const lanceAngle = -Math.PI / 8 + charge * Math.PI / 2;
  drawEnchantedLance(g, CX + 8 + lean * 6, 18 + horseBob - lean * 4, lanceAngle);
  
  // Tower shield (held back during charge)
  drawTowerShield(g, CX - 16, 22 + horseBob - lean * 4, 0.8);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Knight Lancer doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 17 * (1 - t), 8 * (1 - t), COL_SHADOW);
  
  // Massive horse (falling)
  if (t < 0.7) {
    drawMassiveHorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Enchanted lance (falling separately)
  if (t > 0.2) {
    drawEnchantedLance(g, CX + fallX + 8, 18 + dropY, Math.PI / 2);
  }
  
  // Tower shield (dropping)
  if (t < 0.6) {
    drawTowerShield(g, CX + fallX - 10, 22 + dropY, 1 * (1 - t));
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
 * Generate all knight lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateKnightLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
