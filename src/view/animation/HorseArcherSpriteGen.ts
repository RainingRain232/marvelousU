// Procedural sprite generator for the Horse Archer unit type.
//
// Draws a detailed medieval fantasy horse archer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Mounted on horse with detailed saddle
//   • Light armor for mobility
//   • Bow with arrows
//   • Quiver on back
//   • Horse with mane and tail
//   • Riding boots
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ mobile mounted archer
const COL_SKIN      = 0xd4a574;
const COL_ARMOR     = 0x99aabb;
const COL_ARMOR_HI  = 0xbbccdd;
const COL_ARMOR_DK  = 0x667788;
const COL_HORSE     = 0x8b6f47;
const COL_HORSE_DK  = 0x6b5737;
const COL_HORSE_HI  = 0x9b8567;
const COL_MANE      = 0x4a3c28;
const COL_SADDLE    = 0x664422;
const COL_SADDLE_DK = 0x443322;
const COL_BOW       = 0x886633;
const COL_BOW_HI    = 0xaaa855;
const COL_ARROW     = 0xc0c8d0;
const COL_ARROW_HI  = 0xe0e8f0;
const COL_QUIVER    = 0x4a3c28;
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
  
  // Quiver on back
  g.fill({ color: COL_QUIVER });
  g.rect(x + w/2 - 2, y + 2, 3, h - 2);
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x + w/2 - 1, y + 3, 1, h - 4);
}

function drawHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Horse body
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 14, 8);
  
  // Horse highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 12, 6);
  
  // Horse legs (4 legs)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Front legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 8, y + 4 + bob, 2, 6);
  g.rect(x - 4, y + 4 + bob - legOffset, 2, 6 + legOffset);
  
  // Back legs
  g.fill({ color: COL_HORSE_DK });
  g.rect(x + 2, y + 4 + bob - legOffset, 2, 6 + legOffset);
  g.rect(x + 6, y + 4 + bob, 2, 6);
  
  // Mane
  g.fill({ color: COL_MANE });
  g.rect(x - 12, y - 2 + bob, 4, 6);
  
  // Tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2;
  g.fill({ color: COL_MANE });
  g.rect(x + 10, y + tailSway, 6, 2);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  // Saddle
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 8, 4);
  
  // Saddle details
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 6, 2);
  
  // Saddle straps
  drawLine(g, x - 6, y, x - 6, y + 4, COL_SADDLE_DK, 1);
  drawLine(g, x + 6, y, x + 6, y + 4, COL_SADDLE_DK, 1);
}

function drawBow(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Bow body
  const bowLength = 10;
  const bowEndX = x + Math.cos(angle) * bowLength;
  const bowEndY = y + Math.sin(angle) * bowLength;
  
  drawLine(g, x, y, bowEndX, bowEndY, COL_BOW, 3);
  drawLine(g, x, y - 1, bowEndX, bowEndY - 1, COL_BOW_HI, 1);
  
  // Bow string
  const stringAngle = angle + Math.PI / 6;
  const stringEndX = x + Math.cos(stringAngle) * bowLength;
  const stringEndY = y + Math.sin(stringAngle) * bowLength;
  
  drawLine(g, x - 2, y, stringEndX, stringEndY, COL_ARMOR_DK, 1);
  drawLine(g, x + 2, y, stringEndX, stringEndY, COL_ARMOR_DK, 1);
  
  // Arrow (when ready to fire)
  if (angle === 0) {
    drawLine(g, x + 8, y, x + 15, y, COL_ARROW, 2);
    drawLine(g, x + 8, y - 1, x + 15, y - 1, COL_ARROW_HI, 1);
    
    // Arrow head
    drawCircle(g, x + 15, y, 1.5, COL_ARROW);
  }
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Rider sits on horse
  drawBody(g, x, y - 8 + breathe, 8, 10);
  drawHead(g, x, y - 16 + breathe);
  
  // Arms holding bow
  drawLine(g, x - 4, y - 4 + breathe, x + 6, y - 6 + breathe, COL_ARMOR, 2);
  drawLine(g, x - 4, y - 6 + breathe, x + 6, y - 8 + breathe, COL_ARMOR, 2);
  
  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 3, y + 2, 2, 4);
  g.rect(x + 1, y + 2, 2, 4);
  
  g.fill({ color: COL_BOOT });
  g.rect(x - 3, y + 4, 2, 2);
  g.rect(x + 1, y + 4, 2, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.1;
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  
  // Horse
  drawHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider
  drawRider(g, CX, 24, breathe);
  
  // Bow (ready position)
  drawBow(g, CX + 6, 18 + breathe, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  
  // Horse (walking)
  drawHorse(g, CX, 28, walkCycle);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  drawRider(g, CX, 24 + riderBob, breathe);
  
  // Bow (angled for movement)
  const bowAngle = Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawBow(g, CX + 6, 18 + riderBob + breathe, bowAngle);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const draw = t < 0.6 ? t / 0.6 : (1 - t) / 0.4; // Draw then release
  
  // Shadow
  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  
  // Horse (stationary during attack)
  drawHorse(g, CX, 28, 0);
  
  // Saddle
  drawSaddle(g, CX, 24);
  
  // Rider (leaning forward)
  const lean = draw * 0.3;
  drawRider(g, CX + lean * 2, 24 - lean * 2);
  
  // Bow (drawing and firing)
  const bowAngle = -Math.PI / 6 * draw;
  drawBow(g, CX + 6 + lean * 2, 18 - lean * 2, bowAngle);
  
  // Flying arrow (released at frame 4-5)
  if (t > 0.5 && t < 0.8) {
    const arrowDist = (t - 0.5) * 40;
    drawLine(g, CX + 20 + arrowDist, 12, CX + 25 + arrowDist, 12, COL_ARROW, 2);
    drawLine(g, CX + 20 + arrowDist, 11, CX + 25 + arrowDist, 11, COL_ARROW_HI, 1);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Horse Archer doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 8;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 16 * (1 - t), 6 * (1 - t), COL_SHADOW);
  
  // Horse (falling)
  if (t < 0.7) {
    drawHorse(g, CX + fallX, 28 + dropY, 0);
  }
  
  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 24 + dropY);
  }
  
  // Rider (falling)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 24 + dropY);
  }
  
  // Bow (dropping)
  if (t < 0.4) {
    drawBow(g, CX + fallX + 6, 18 + dropY, Math.PI / 4);
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
 * Generate all horse archer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateHorseArcherFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
