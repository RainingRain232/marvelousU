// Procedural sprite generator for the Gladiator unit type.
//
// Draws a detailed medieval fantasy gladiator at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Minimal armor (loincloth and bracers)
//   • Muscular physique
//   • Net launcher weapon
//   • Short sword for close combat
//   • Gladiator helmet with visor
//   • Sandals
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ gladiator with minimal armor
const COL_SKIN      = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_SKIN_HI   = 0xe4c594;
const COL_LOINCLOTH = 0x8b2222;
const COL_LOINCLOTH_DK = 0x6b1111;
const COL_METAL     = 0x8899aa;
const COL_METAL_HI  = 0xaabbcc;
const COL_HELM      = 0x778899;
const COL_HELM_HI   = 0x99aabb;
const COL_VISOR     = 0x1a1a2e;
const COL_NET       = 0x886633;
const COL_NET_HI    = 0xaaa855;
const COL_SWORD     = 0xc0c8d0;
const COL_SWORD_HI  = 0xe0e8f0;
const COL_SWORD_GRD = 0x886633;
const COL_SWORD_POM = 0x664422;
const COL_SANDAL    = 0x8b6f47;
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
  drawCircle(g, x, y - 1, 5, COL_SKIN_HI); // Highlight
  
  // Gladiator helmet
  drawCircle(g, x, y, 7, COL_HELM);
  drawCircle(g, x, y, 6, COL_HELM_HI);
  
  // Visor
  drawLine(g, x - 7, y, x - 5, y + 2, COL_VISOR, 2);
  drawLine(g, x + 7, y, x + 5, y + 2, COL_VISOR, 2);
  drawLine(g, x - 5, y + 2, x + 5, y + 2, COL_VISOR, 2);
}

function drawMuscularBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Muscular torso
  g.fill({ color: COL_SKIN });
  g.rect(x - w/2, y, w, h);
  
  // Muscle definition
  g.fill({ color: COL_SKIN_DARK });
  g.rect(x - w/2 + 1, y + 2, w - 2, 2);
  g.rect(x - w/2 + 2, y + h - 3, w - 4, 2);
  
  // Muscle highlights
  g.fill({ color: COL_SKIN_HI });
  g.rect(x - w/2 + 1, y + 1, w - 2, 1);
  g.rect(x - w/2 + 2, y + h/2, w - 4, 1);
}

function drawLoincloth(g: Graphics, x: number, y: number): void {
  // Loincloth
  g.fill({ color: COL_LOINCLOTH });
  g.moveTo(x - 8, y)
    .lineTo(x + 8, y)
    .lineTo(x + 6, y + 8)
    .lineTo(x - 6, y + 8)
    .fill();
  
  // Loincloth shadow
  g.fill({ color: COL_LOINCLOTH_DK });
  g.moveTo(x - 6, y + 2)
    .lineTo(x + 6, y + 2)
    .lineTo(x + 4, y + 6)
    .lineTo(x - 4, y + 6)
    .fill();
}

function drawNetLauncher(g: Graphics, x: number, y: number, angle: number = 0): void {
  // Launcher body
  g.fill({ color: COL_METAL });
  g.rect(x - 6, y - 2, 12, 4);
  
  // Launcher details
  g.fill({ color: COL_METAL_HI });
  g.rect(x - 5, y - 1, 10, 1);
  
  // Net (when fired)
  if (angle !== 0) {
    const netDist = Math.abs(angle) * 20;
    drawLine(g, x + 6, y, x + 6 + netDist, y + angle * 10, COL_NET, 2);
    drawLine(g, x + 6, y - 1, x + 6 + netDist, y + angle * 10 - 1, COL_NET_HI, 1);
  }
}

function drawSword(g: Graphics, x: number, y: number, scale: number = 1): void {
  // Sword blade
  g.fill({ color: COL_SWORD });
  g.rect(x - 1, y - 6 * scale, 2, 12 * scale);
  
  // Sword details
  g.fill({ color: COL_SWORD_HI });
  g.rect(x - 0.5, y - 5 * scale, 1, 10 * scale);
  
  // Crossguard
  g.fill({ color: COL_SWORD_GRD });
  g.rect(x - 4, y, 8, 2);
  
  // Pommel
  drawCircle(g, x, y + 6 * scale, 2, COL_SWORD_POM);
}

function drawBracers(g: Graphics, x: number, y: number): void {
  // Left bracer
  g.fill({ color: COL_METAL });
  g.rect(x - 8, y + 2, 3, 6);
  g.fill({ color: COL_METAL_HI });
  g.rect(x - 7, y + 3, 1, 4);
  
  // Right bracer
  g.fill({ color: COL_METAL });
  g.rect(x + 5, y + 2, 3, 6);
  g.fill({ color: COL_METAL_HI });
  g.rect(x + 6, y + 3, 1, 4);
}

function drawLegs(g: Graphics, x: number, y: number, walkCycle: number): void {
  const offset = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Left leg (muscular)
  g.fill({ color: COL_SKIN });
  g.rect(x - 4, y, 3, 8);
  g.fill({ color: COL_SKIN_DARK });
  g.rect(x - 3, y + 2, 1, 4);
  
  // Left sandal
  g.fill({ color: COL_SANDAL });
  g.rect(x - 4, y + 6, 3, 3);
  
  // Right leg (opposite phase)
  g.fill({ color: COL_SKIN });
  g.rect(x + 1, y - offset, 3, 8 + offset);
  g.fill({ color: COL_SKIN_DARK });
  g.rect(x + 2, y + 2 - offset, 1, 4);
  
  // Right sandal
  g.fill({ color: COL_SANDAL });
  g.rect(x + 1, y + 6 - offset, 3, 3);
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
  
  // Loincloth
  drawLoincloth(g, CX, 24 + breathe);
  
  // Muscular body
  drawMuscularBody(g, CX, 18 + breathe, 12, 10);
  
  // Bracers
  drawBracers(g, CX, 20 + breathe);
  
  // Head
  drawHead(g, CX, 12 + breathe);
  
  // Net launcher (resting)
  drawNetLauncher(g, CX - 10, 20 + breathe);
  
  // Sword
  drawSword(g, CX + 8, 20 + breathe, 0.8);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const bob = Math.abs(Math.sin(walkCycle * Math.PI * 2)) * 2;
  const sway = Math.sin(walkCycle * Math.PI * 2) * 1;
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Legs (walking)
  drawLegs(g, CX + sway, 32, walkCycle);
  
  // Loincloth
  drawLoincloth(g, CX + sway, 24 + bob);
  
  // Muscular body
  drawMuscularBody(g, CX + sway, 18 + bob, 12, 10);
  
  // Bracers
  drawBracers(g, CX + sway, 20 + bob);
  
  // Head
  drawHead(g, CX + sway, 12 + bob);
  
  // Net launcher (swaying with movement)
  const launcherAngle = Math.sin(walkCycle * Math.PI * 2) * 0.2;
  drawNetLauncher(g, CX - 10 + sway, 20 + bob, launcherAngle);
  
  // Sword
  drawSword(g, CX + 8 + sway, 20 + bob, 0.8);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 to 1
  const throwNet = t < 0.5 ? t * 2 : 1; // Net thrown in first half
  const swordStrike = t > 0.5 ? (t - 0.5) * 2 : 0; // Sword strike in second half
  
  // Shadow
  drawEllipse(g, CX, GY, 12, 4, COL_SHADOW);
  
  // Legs (planted stance)
  drawLegs(g, CX, 32, 0);
  
  // Loincloth
  drawLoincloth(g, CX, 24);
  
  // Muscular body (leaning forward for net, back for sword)
  const bodyLean = throwNet * 2 - swordStrike * 2;
  drawMuscularBody(g, CX + bodyLean, 18, 12, 10);
  
  // Bracers
  drawBracers(g, CX + bodyLean, 20);
  
  // Head
  drawHead(g, CX + bodyLean, 12);
  
  // Net launcher (throwing motion)
  drawNetLauncher(g, CX - 10 + bodyLean, 20, throwNet);
  
  // Sword (striking motion)
  if (swordStrike > 0) {
    const swordAngle = swordStrike * Math.PI / 4;
    const swordX = CX + 8 + Math.cos(swordAngle) * 10;
    const swordY = 20 + Math.sin(swordAngle) * 10;
    drawSword(g, swordX, swordY, 1.2);
  } else {
    drawSword(g, CX + 8, 20, 0.8);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Gladiator uses net attack as "cast"
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 8;
  const dropY = t * 16;
  
  // Shadow (shrinking)
  drawEllipse(g, CX, GY, 12 * (1 - t), 4 * (1 - t), COL_SHADOW);
  
  // Legs (falling)
  if (t < 0.7) {
    drawLegs(g, CX + fallX, 32, 0);
  }
  
  // Loincloth (falling)
  if (t < 0.8) {
    drawLoincloth(g, CX + fallX, 24 + dropY);
  }
  
  // Muscular body (falling)
  if (t < 0.6) {
    drawMuscularBody(g, CX + fallX, 18 + dropY, 12, 10);
  }
  
  // Bracers (falling)
  if (t < 0.5) {
    drawBracers(g, CX + fallX, 20 + dropY);
  }
  
  // Head
  if (t < 0.4) {
    drawHead(g, CX + fallX, 12 + dropY);
  }
  
  // Net launcher (falling separately)
  if (t > 0.2) {
    drawNetLauncher(g, CX + fallX, 18 + dropY);
  }
  
  // Sword (dropping)
  if (t < 0.6) {
    drawSword(g, CX + fallX + 8, 22 + dropY, 0.8 * (1 - t));
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
 * Generate all gladiator sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateGladiatorFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
