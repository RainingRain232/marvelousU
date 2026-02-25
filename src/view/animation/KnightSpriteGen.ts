// Procedural sprite generator for the Knight unit type.
//
// Draws a detailed medieval fantasy knight at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Full plate armor with knight insignia
//   • Medium warhorse for balanced combat
//   • Long sword for melee combat
//   • Shield for defense
//   • Ornate helmet with plume
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

// Palette ─ royal knight cavalry
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
const COL_SWORD     = 0xc0c8d0;
const COL_SWORD_HI  = 0xe0e8f0;
const COL_SWORD_GRD = 0x886633;
const COL_SWORD_POM = 0x664422;
const COL_SHIELD    = 0x4455aa;
const COL_SHIELD_RIM= 0x886633;
const COL_PLUME     = 0xffd700;
const COL_CREST     = 0xff0000;
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
  drawCircle(g, x, y, 5, COL_SKIN);
  
  // Full plate helmet
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
  
  // Crest on helmet
  g.fill({ color: COL_CREST });
  g.moveTo(x - 1, y - 8)
    .lineTo(x, y - 11)
    .lineTo(x + 1, y - 8)
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
  g.moveTo(x - 2, y + 3)
    .lineTo(x + 2, y + 3)
    .lineTo(x + 2, y + 7)
    .lineTo(x, y + 9)
    .lineTo(x - 2, y + 7)
    .lineTo(x - 2, y + 3)
    .fill();
  
  // Armor shadows
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - w/2 + 2, y + 3, w - 4, 2);
}

function drawWarhorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Warhorse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 15, 8);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 13, 6);
  
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
  
  // Mane
  g.fill({ color: COL_MANE });
  g.rect(x - 11, y - 2 + bob, 5, 6);
  
  // Tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2;
  g.fill({ color: COL_MANE });
  g.rect(x + 12, y + tailSway, 6, 2.5);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Royal saddle
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

function drawSword(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Long sword
  const swordLength = 12;
  const swordEndX = x + Math.cos(angle) * swordLength;
  const swordEndY = y + Math.sin(angle) * swordLength;
  
  drawLine(g, x, y, swordEndX, swordEndY, COL_SWORD, 3);
  drawLine(g, x, y - 1, swordEndX, swordEndY - 1, COL_SWORD_HI, 1.5);
  
  // Crossguard
  const crossguardAngle = angle + Math.PI / 2;
  const crossguardWidth = 5;
  const crossguardX1 = x + Math.cos(crossguardAngle) * crossguardWidth;
  const crossguardY1 = y + Math.sin(crossguardAngle) * crossguardWidth;
  const crossguardX2 = x - Math.cos(crossguardAngle) * crossguardWidth;
  const crossguardY2 = y - Math.sin(crossguardAngle) * crossguardWidth;
  
  g.fill({ color: COL_SWORD_GRD });
  g.moveTo(crossguardX1, crossguardY1)
    .lineTo(crossguardX2, crossguardY2)
    .lineTo(crossguardX2 + Math.cos(angle) * 1, crossguardY2 + Math.sin(angle) * 1)
    .lineTo(crossguardX1 + Math.cos(angle) * 1, crossguardY1 + Math.sin(angle) * 1)
    .fill();
  
  // Pommel
  drawCircle(g, swordEndX, swordEndY, 2, COL_SWORD_POM);
}

function drawShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 11 * scale;
  const h = 13 * scale;
  
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
  drawCircle(g, x, y, 2.5 * scale, COL_ARMOR);
  
  // Knight crest on shield
  g.fill({ color: COL_CREST });
  g.moveTo(x - 2, y - 2)
    .lineTo(x + 2, y - 2)
    .lineTo(x + 2, y + 2)
    .lineTo(x, y + 4)
    .lineTo(x - 2, y + 2)
    .lineTo(x - 2, y - 2)
    .fill();
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on warhorse
  drawBody(g, x, y - 8 + breathe, 10, 11);
  drawHead(g, x, y - 16 + breathe);
  
  // Arms holding sword
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
  
  // Warhorse
  drawWarhorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Sword (ready position)
  drawSword(g, CX + 7, 18 + breathe, -Math.PI / 6);
  
  // Shield
  drawShield(g, CX - 9, 22 + breathe, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 7, COL_SHADOW);
  
  // Warhorse (walking)
  drawWarhorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Sword (swaying with movement)
  const swordAngle = -Math.PI / 6 + Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawSword(g, CX + 7, 18 + riderBob + breathe, swordAngle);
  
  // Shield
  drawShield(g, CX - 9, 22 + riderBob + breathe, 0.9);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const strike = t < 0.6 ? t / 0.6 : (1 - t) / 0.4; // Strike forward then back
  const lean = strike * 0.4; // Lean into strike
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 7, COL_SHADOW);
  
  // Warhorse (charging)
  const horseBob = Math.sin(t * Math.PI * 4) * 2;
  drawWarhorse(g, CX, 28 + horseBob, 0);
  
  // Saddle
  drawSaddle(g, CX, 24 + horseBob);
  
  // Rider (leaning forward)
  drawRider(g, CX + lean * 4, 24 + horseBob - lean * 3);
  
  // Sword (powerful strike)
  const swordAngle = -Math.PI / 4 + strike * Math.PI / 2;
  drawSword(g, CX + 7 + lean * 4, 18 + horseBob - lean * 3, swordAngle);
  
  // Shield (held back during strike)
  drawShield(g, CX - 13, 22 + horseBob - lean * 3, 0.7);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Knight doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 16 * (1 - t), 7 * (1 - t), COL_SHADOW);
  
  // Warhorse (falling)
  if (t < 0.7) {
    drawWarhorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Sword (falling separately)
  if (t > 0.2) {
    drawSword(g, CX + fallX + 7, 18 + dropY, Math.PI / 2);
  }
  
  // Shield (dropping)
  if (t < 0.6) {
    drawShield(g, CX + fallX - 9, 22 + dropY, 0.9 * (1 - t));
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
 * Generate all knight sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateKnightFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
