// Procedural sprite generator for the Questing Knight unit type.
//
// Draws a detailed templar knight on an armored warhorse at 72×72 pixels per
// frame using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - White surcoat with red templar cross over chainmail
//   - Ornate great helm
//   - Kite shield with cross emblem
//   - Raised sword in idle (love-heart floats from mouth)
//   - Armored warhorse (larger than normal cavalry)
//   - Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 72;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 6;      // ground Y (feet line)

// Palette — templar knight
const COL_CHAIN     = 0x999999; // chainmail
const COL_CHAIN_DK  = 0x777777;
const COL_SURCOAT   = 0xeeeeee; // white surcoat
const COL_SURCOAT_DK= 0xcccccc;
const COL_CROSS     = 0xcc0000; // red templar cross
const COL_HELM      = 0xaabbcc; // great helm
const COL_HELM_DK   = 0x889aaa;
const COL_HELM_HI   = 0xccddee;
const COL_HORSE     = 0x3b3025; // dark armored horse
const COL_HORSE_DK  = 0x251a15;
const COL_HORSE_HI  = 0x5b5045;
const COL_BARDING   = 0x888888; // horse armor (barding)
const COL_BARDING_HI= 0xaaaaaa;
const COL_MANE      = 0x1a1510;
const COL_SADDLE    = 0x664422;
const COL_SADDLE_DK = 0x443322;
const COL_SWORD     = 0xd0d8e0;
const COL_SWORD_HI  = 0xf0f4f8;
const COL_SWORD_GRD = 0xaa8844;
const COL_SWORD_POM = 0x664422;
const COL_SHIELD    = 0xdddddd;
const COL_SHIELD_RIM= 0xaa8844;
const COL_BOOT      = 0x443322;
const COL_SHADOW    = 0x000000;
const COL_HEART     = 0xff3366;
const COL_HEART_HI  = 0xff6699;

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

function drawGreatHelm(g: Graphics, x: number, y: number): void {
  // Great helm — flat-topped with visor slit
  g.fill({ color: COL_HELM });
  g.roundRect(x - 6, y - 7, 12, 14, 3);

  // Highlight
  g.fill({ color: COL_HELM_HI });
  g.roundRect(x - 5, y - 6, 10, 4, 2);

  // Visor slit
  g.fill({ color: 0x222222 });
  g.rect(x - 4, y, 8, 2);

  // Breathing holes (dots)
  drawCircle(g, x - 3, y + 4, 0.8, 0x222222);
  drawCircle(g, x, y + 4, 0.8, 0x222222);
  drawCircle(g, x + 3, y + 4, 0.8, 0x222222);

  // Darker edges
  g.fill({ color: COL_HELM_DK });
  g.rect(x - 6, y + 5, 12, 2);
}

function drawSurcoatBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Chainmail underneath (visible at edges)
  g.fill({ color: COL_CHAIN });
  g.rect(x - w / 2 - 1, y, w + 2, h);

  // White surcoat over chainmail
  g.fill({ color: COL_SURCOAT });
  g.rect(x - w / 2, y + 1, w, h - 2);

  // Surcoat shadow fold
  g.fill({ color: COL_SURCOAT_DK });
  g.rect(x - w / 2 + 1, y + h - 4, w - 2, 2);

  // Red templar cross on chest
  const crossCx = x;
  const crossCy = y + h / 2;
  g.fill({ color: COL_CROSS });
  // Vertical bar
  g.rect(crossCx - 1.5, crossCy - 5, 3, 10);
  // Horizontal bar
  g.rect(crossCx - 4, crossCy - 2, 8, 3);
}

function drawArmoredHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;

  // Horse body (larger than standard knight horse)
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 22, 11);

  // Highlights
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 19, 8);

  // Barding (horse armor plates)
  g.fill({ color: COL_BARDING });
  g.ellipse(x - 6, y + bob - 2, 8, 6);
  g.ellipse(x + 6, y + bob - 2, 8, 6);

  // Barding highlights
  g.fill({ color: COL_BARDING_HI });
  g.ellipse(x - 6, y + bob - 3, 6, 4);
  g.ellipse(x + 6, y + bob - 3, 6, 4);

  // Horse legs (4 legs, armored)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 3;

  g.fill({ color: COL_HORSE_DK });
  // Front legs
  g.rect(x - 12, y + 8 + bob, 3, 9);
  g.rect(x - 5, y + 8 + bob - legOffset, 3, 9 + legOffset);
  // Back legs
  g.rect(x + 2, y + 8 + bob - legOffset, 3, 9 + legOffset);
  g.rect(x + 9, y + 8 + bob, 3, 9);

  // Leg armor plates
  g.fill({ color: COL_BARDING });
  g.rect(x - 12, y + 8 + bob, 3, 4);
  g.rect(x - 5, y + 8 + bob - legOffset, 3, 4);
  g.rect(x + 2, y + 8 + bob - legOffset, 3, 4);
  g.rect(x + 9, y + 8 + bob, 3, 4);

  // Horse head (armored)
  g.fill({ color: COL_HORSE });
  g.ellipse(x - 18, y - 4 + bob, 6, 5);

  // Chanfron (head armor plate)
  g.fill({ color: COL_BARDING });
  g.ellipse(x - 18, y - 5 + bob, 4, 4);
  drawCircle(g, x - 20, y - 3 + bob, 1, 0x222222); // Eye

  // Mane
  g.fill({ color: COL_MANE });
  g.rect(x - 15, y - 8 + bob, 8, 4);

  // Tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 3;
  g.fill({ color: COL_MANE });
  g.rect(x + 18, y + tailSway, 8, 3);
}

function drawSaddle(g: Graphics, x: number, y: number): void {
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 10, 5);

  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 8, 3);

  // Saddle straps
  drawLine(g, x - 8, y, x - 8, y + 5, COL_SADDLE_DK, 1);
  drawLine(g, x + 8, y, x + 8, y + 5, COL_SADDLE_DK, 1);
}

function drawSword(g: Graphics, x: number, y: number, angle: number = 0): void {
  const swordLength = 16;
  const swordEndX = x + Math.cos(angle) * swordLength;
  const swordEndY = y + Math.sin(angle) * swordLength;

  drawLine(g, x, y, swordEndX, swordEndY, COL_SWORD, 3.5);
  drawLine(g, x, y - 1, swordEndX, swordEndY - 1, COL_SWORD_HI, 1.5);

  // Crossguard
  const crossAngle = angle + Math.PI / 2;
  const crossW = 6;
  const cx1 = x + Math.cos(crossAngle) * crossW;
  const cy1 = y + Math.sin(crossAngle) * crossW;
  const cx2 = x - Math.cos(crossAngle) * crossW;
  const cy2 = y - Math.sin(crossAngle) * crossW;

  g.fill({ color: COL_SWORD_GRD });
  g.moveTo(cx1, cy1)
    .lineTo(cx2, cy2)
    .lineTo(cx2 + Math.cos(angle) * 1.5, cy2 + Math.sin(angle) * 1.5)
    .lineTo(cx1 + Math.cos(angle) * 1.5, cy1 + Math.sin(angle) * 1.5)
    .fill();

  // Pommel
  drawCircle(g, swordEndX, swordEndY, 2.5, COL_SWORD_POM);
}

function drawShield(g: Graphics, x: number, y: number, scale: number = 1): void {
  const w = 13 * scale;
  const h = 15 * scale;

  // Kite shield — white with red cross
  g.fill({ color: COL_SHIELD });
  g.moveTo(x, y - h / 2)
    .lineTo(x + w / 2, y - h / 3)
    .lineTo(x + w / 2, y + h / 3)
    .lineTo(x, y + h / 2)
    .lineTo(x - w / 2, y + h / 3)
    .lineTo(x - w / 2, y - h / 3)
    .fill();

  // Shield rim
  g.fill({ color: COL_SHIELD_RIM });
  g.moveTo(x, y - h / 2 + 1)
    .lineTo(x + w / 2 - 1, y - h / 3 + 1)
    .lineTo(x + w / 2 - 1, y + h / 3 - 1)
    .lineTo(x, y + h / 2 - 1)
    .lineTo(x - w / 2 + 1, y + h / 3 - 1)
    .lineTo(x - w / 2 + 1, y - h / 3 + 1)
    .fill();

  // Red templar cross on shield
  g.fill({ color: COL_CROSS });
  g.rect(x - 1.5, y - 4 * scale, 3, 8 * scale); // vertical
  g.rect(x - 3.5 * scale, y - 1.5, 7 * scale, 3); // horizontal

  // Shield boss
  drawCircle(g, x, y, 2 * scale, COL_HELM);
}

function drawRider(g: Graphics, x: number, y: number, breathe: number = 0): void {
  // Surcoat body over chainmail
  drawSurcoatBody(g, x, y - 10 + breathe, 12, 14);
  // Great helm
  drawGreatHelm(g, x, y - 20 + breathe);

  // Arms (chainmail visible)
  drawLine(g, x - 4, y - 4 + breathe, x + 9, y - 6 + breathe, COL_CHAIN, 3);
  drawLine(g, x - 4, y - 6 + breathe, x + 9, y - 8 + breathe, COL_CHAIN_DK, 3);

  // Legs in stirrups
  g.fill({ color: COL_CHAIN });
  g.rect(x - 5, y + 2, 3, 5);
  g.rect(x + 2, y + 2, 3, 5);

  g.fill({ color: COL_BOOT });
  g.rect(x - 5, y + 5, 3, 3);
  g.rect(x + 2, y + 5, 3, 3);
}

function drawHeart(g: Graphics, x: number, y: number, size: number, alpha: number): void {
  // Simple heart shape from two circles and a triangle
  const s = size;
  g.fill({ color: COL_HEART, alpha });
  g.circle(x - s * 0.3, y - s * 0.15, s * 0.4);
  g.circle(x + s * 0.3, y - s * 0.15, s * 0.4);
  g.fill({ color: COL_HEART, alpha });
  g.moveTo(x - s * 0.6, y)
    .lineTo(x + s * 0.6, y)
    .lineTo(x, y + s * 0.7)
    .fill();

  // Heart highlight
  g.fill({ color: COL_HEART_HI, alpha: alpha * 0.6 });
  g.circle(x - s * 0.2, y - s * 0.25, s * 0.2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.08;

  // Shadow
  drawEllipse(g, CX, GY, 24, 9, COL_SHADOW);

  // Armored warhorse
  drawArmoredHorse(g, CX, 42, walkCycle);

  // Saddle
  drawSaddle(g, CX, 37);

  // Rider
  drawRider(g, CX, 37, breathe);

  // Sword raised upward (signature idle pose)
  const swordRaise = Math.sin(frame * 0.4) * 0.15;
  drawSword(g, CX + 9, 22 + breathe, -Math.PI / 2 + swordRaise);

  // Shield at rest
  drawShield(g, CX - 12, 34 + breathe, 0.9);

  // Love heart floating from mouth area
  // Cycle: appears every 8 frames, rises and fades
  const heartPhase = (frame % 8) / 8; // 0 → 1
  if (heartPhase < 0.8) {
    const heartY = 18 + breathe - heartPhase * 18; // rises upward
    const heartAlpha = 1 - heartPhase * 1.25;
    const heartSize = 3 + heartPhase * 1.5;
    drawHeart(g, CX + 2, heartY, heartSize, Math.max(0, heartAlpha));
  }
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 1;

  // Shadow
  drawEllipse(g, CX, GY, 24, 9, COL_SHADOW);

  // Armored warhorse (galloping)
  drawArmoredHorse(g, CX, 42, walkCycle);

  // Saddle
  drawSaddle(g, CX, 37);

  // Rider (bobbing with horse)
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2.5;
  drawRider(g, CX, 37 + riderBob, breathe);

  // Sword (swaying with movement)
  const swordAngle = -Math.PI / 6 + Math.sin(walkCycle * Math.PI * 2) * 0.25;
  drawSword(g, CX + 9, 24 + riderBob + breathe, swordAngle);

  // Shield
  drawShield(g, CX - 12, 34 + riderBob + breathe, 0.9);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const strike = t < 0.6 ? t / 0.6 : (1 - t) / 0.4;
  const lean = strike * 0.5;

  // Shadow
  drawEllipse(g, CX, GY, 24, 9, COL_SHADOW);

  // Warhorse (charging)
  const horseBob = Math.sin(t * Math.PI * 4) * 2.5;
  drawArmoredHorse(g, CX, 42 + horseBob, 0);

  // Saddle
  drawSaddle(g, CX, 37 + horseBob);

  // Rider (leaning forward into strike)
  drawRider(g, CX + lean * 5, 37 + horseBob - lean * 4);

  // Sword (powerful downward strike arc)
  const swordAngle = -Math.PI / 3 + strike * Math.PI * 0.6;
  drawSword(g, CX + 9 + lean * 5, 22 + horseBob - lean * 4, swordAngle);

  // Shield (held back during strike)
  drawShield(g, CX - 16, 34 + horseBob - lean * 3, 0.7);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Reuse attack animation for cast
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 8;
  const dropY = t * 20;

  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 24 * (1 - t), 9 * (1 - t), COL_SHADOW);

  // Warhorse (falling)
  if (t < 0.7) {
    drawArmoredHorse(g, CX + fallX, 42 + dropY, 0);
  }

  // Saddle
  if (t < 0.6) {
    drawSaddle(g, CX + fallX, 37 + dropY);
  }

  // Rider (falling off)
  if (t < 0.5) {
    drawRider(g, CX + fallX, 37 + dropY);
  }

  // Sword (falling separately)
  if (t > 0.2) {
    drawSword(g, CX + fallX + 9, 22 + dropY, Math.PI / 2);
  }

  // Shield (dropping)
  if (t < 0.6) {
    drawShield(g, CX + fallX - 12, 34 + dropY, 0.9 * (1 - t));
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
 * Generate all Questing Knight sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateQuestingKnightFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
