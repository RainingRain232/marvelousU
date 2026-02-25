// Procedural sprite generator for the Mage Hunter unit type.
//
// Draws a detailed medieval fantasy mage hunter at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Dark leather armor with metal plates
//   • Hooded cloak with anti-mage symbols
//   • Crossbow with magical bolts
//   • Dagger for close combat
//   • Anti-magic talismans
//   • Light boots for mobility
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ dark hunter with anti-magic theme
const COL_SKIN      = 0xd4a574;
const COL_LEATHER   = 0x4a3c28;
const COL_LEATHER_HI = 0x6a5c48;
const COL_METAL     = 0x8899aa;
const COL_METAL_HI  = 0xaabbcc;
const COL_CLOAK     = 0x2a2a3a;
const COL_CLOAK_DK  = 0x1a1a2a;
const COL_SYMBOL    = 0x8b2222;
const COL_CROSSBOW  = 0x664422;
const COL_CROSSBOW_HI = 0x886644;
const COL_BOLT      = 0xaa4488;
const COL_BOLT_HI   = 0xcc66aa;
const COL_DAGGER    = 0x8899aa;
const COL_DAGGER_HI = 0xaabbcc;
const COL_BOOT      = 0x332211;
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
  
  // Hood
  g.fill({ color: COL_CLOAK });
  g.moveTo(x - 8, y - 6)
    .lineTo(x + 8, y - 6)
    .lineTo(x + 6, y + 2)
    .lineTo(x, y + 4)
    .lineTo(x - 6, y + 2)
    .fill();
  
  // Hood shadow
  g.fill({ color: COL_CLOAK_DK });
  g.moveTo(x - 6, y - 4)
    .lineTo(x + 6, y - 4)
    .lineTo(x + 4, y + 1)
    .lineTo(x, y + 2)
    .lineTo(x - 4, y + 1)
    .fill();
  
  // Anti-mage symbol on hood
  drawCircle(g, x, y - 2, 2, COL_SYMBOL);
}

function drawBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Leather armor
  g.fill({ color: COL_LEATHER });
  g.rect(x - w/2, y, w, h);
  
  // Metal plates
  g.fill({ color: COL_METAL });
  g.rect(x - w/2 + 1, y + 2, w - 2, 3);
  g.rect(x - w/2 + 1, y + h - 4, w - 2, 2);
  
  // Armor highlights
  g.fill({ color: COL_LEATHER_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 1);
  g.fill({ color: COL_METAL_HI });
  g.rect(x - w/2 + 2, y + 3, w - 4, 1);
}

function drawCrossbow(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Crossbow stock
  g.fill({ color: COL_CROSSBOW });
  g.rect(x - 8, y - 2, 16, 4);
  
  // Crossbow details
  g.fill({ color: COL_CROSSBOW_HI });
  g.rect(x - 7, y - 1, 14, 1);
  
  // Bow arms
  drawLine(g, x - 8, y, x - 12, y - 6, COL_CROSSBOW, 3);
  drawLine(g, x + 8, y, x + 12, y - 6, COL_CROSSBOW, 3);
  drawLine(g, x - 8, y, x - 12, y + 6, COL_CROSSBOW, 3);
  drawLine(g, x + 8, y, x + 12, y + 6, COL_CROSSBOW, 3);
  
  // String
  drawLine(g, x - 12, y - 6, x + 12, y - 6, COL_METAL, 1);
  drawLine(g, x - 12, y + 6, x + 12, y + 6, COL_METAL, 1);
  
  // Magical bolt
  if (angle === 0) {
    drawLine(g, x + 12, y, x + 18, y, COL_BOLT, 2);
    drawLine(g, x + 12, y - 1, x + 18, y - 1, COL_BOLT_HI, 1);
  }
}

function drawDagger(g: Graphics, x: number, y: number, scale: number = 1): void {
  // Dagger blade
  g.fill({ color: COL_DAGGER });
  g.moveTo(x, y - 4 * scale)
    .lineTo(x + 1, y - 2 * scale)
    .lineTo(x + 1, y + 2 * scale)
    .lineTo(x, y + 4 * scale)
    .lineTo(x - 1, y + 2 * scale)
    .lineTo(x - 1, y - 2 * scale)
    .fill();
  
  // Dagger hilt
  g.fill({ color: COL_METAL });
  g.rect(x - 1, y + 2 * scale, 2, 3 * scale);
  
  // Dagger guard
  g.fill({ color: COL_DAGGER_HI });
  g.rect(x - 2, y + 2 * scale, 4, 1);
}

function drawCloak(g: Graphics, x: number, y: number, sway: number = 0): void {
  // Cloak
  g.fill({ color: COL_CLOAK });
  g.moveTo(x - 10 + sway, y)
    .lineTo(x + 10 + sway, y)
    .lineTo(x + 8 + sway, y + 20)
    .lineTo(x - 8 + sway, y + 20)
    .fill();
  
  // Cloak shadow
  g.fill({ color: COL_CLOAK_DK });
  g.moveTo(x - 8 + sway, y + 2)
    .lineTo(x + 8 + sway, y + 2)
    .lineTo(x + 6 + sway, y + 18)
    .lineTo(x - 6 + sway, y + 18)
    .fill();
  
  // Anti-mage symbols on cloak
  drawCircle(g, x - 4 + sway, y + 8, 1, COL_SYMBOL);
  drawCircle(g, x + 4 + sway, y + 12, 1, COL_SYMBOL);
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
  const cloakSway = Math.sin(frame * 0.2) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Cloak
  drawCloak(g, CX, 24 + breathe, cloakSway);
  
  // Body
  drawBody(g, CX, 20 + breathe, 10, 12);
  
  // Head
  drawHead(g, CX, 14 + breathe);
  
  // Crossbow
  drawCrossbow(g, CX + 8, 18 + breathe);
  
  // Dagger
  drawDagger(g, CX - 8, 22 + breathe, 0.8);
  
  // Legs
  drawLegs(g, CX, 32, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const bob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * 2;
  const sway = Math.sin(walkCycle * Math.PI * 2) * 1;
  const cloakSway = Math.sin(walkCycle * Math.PI * 4) * 2;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Cloak
  drawCloak(g, CX + sway, 24 + bob, cloakSway);
  
  // Body
  drawBody(g, CX + sway, 20 + bob, 10, 12);
  
  // Head
  drawHead(g, CX + sway, 14 + bob);
  
  // Crossbow (angled for movement)
  const bowAngle = Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawCrossbow(g, CX + 8 + sway, 18 + bob, bowAngle);
  
  // Dagger
  drawDagger(g, CX - 8 + sway, 22 + bob, 0.8);
  
  // Legs (walking)
  drawLegs(g, CX + sway, 32, walkCycle);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const aim = t < 0.3 ? t * 3 : 1; // Quick aim, then hold
  const recoil = t > 0.3 && t < 0.5 ? (t - 0.3) * 5 : 0; // Recoil at 0.3-0.5
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Cloak
  drawCloak(g, CX, 24, 0);
  
  // Body (leaning back slightly)
  drawBody(g, CX - recoil * 2, 20, 10, 12);
  
  // Head
  drawHead(g, CX - recoil * 2, 14);
  
  // Crossbow (aiming and firing)
  drawCrossbow(g, CX + 8 - recoil * 3, 18, aim * 0.1);
  
  // Magical bolt (fired at frame 3-4)
  if (t > 0.3 && t < 0.6) {
    const boltDist = (t - 0.3) * 40;
    drawLine(g, CX + 20 + boltDist, 18, CX + 25 + boltDist, 18, COL_BOLT, 2);
    drawLine(g, CX + 20 + boltDist, 17, CX + 25 + boltDist, 17, COL_BOLT_HI, 1);
  }
  
  // Dagger
  drawDagger(g, CX - 8, 22, 0.8);
  
  // Legs (planted stance)
  drawLegs(g, CX, 32, 0);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Mage Hunter doesn't cast, but reuse attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 6;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 12 * (1 - t), 4 * (1 - t), COL_SHADOW);
  
  // Cloak (falling)
  if (t < 0.8) {
    drawCloak(g, CX + fallX, 24 + dropY, 0);
  }
  
  // Body (falling)
  if (t < 0.7) {
    drawBody(g, CX + fallX, 20 + dropY, 10, 12);
  }
  
  // Head
  if (t < 0.5) {
    drawHead(g, CX + fallX, 14 + dropY);
  }
  
  // Crossbow (falling separately)
  if (t > 0.2) {
    drawCrossbow(g, CX + fallX + 8, 18 + dropY, 0.5);
  }
  
  // Dagger (dropping)
  if (t < 0.6) {
    drawDagger(g, CX + fallX, 22 + dropY, 0.8 * (1 - t));
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
 * Generate all mage hunter sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateMageHunterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
