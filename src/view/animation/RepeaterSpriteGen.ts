// Procedural sprite generator for the Repeater unit type.
//
// Draws a medieval fantasy crossbowman with rapid-fire crossbow at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Leather crossbow with mechanism
//   • Quiver of bolts on back
//   • Light armor
//   • Quick-draw stance

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xf5d0b0;

const COL_LEATHER = 0x8b4513;
const COL_LEATHER_DK = 0x5c2d0a;
const COL_LEATHER_LT = 0xa65c23;

const COL_BOLT = 0x654321;
const COL_BOLT_TIP = 0xc0c0c0;
const COL_BOLT_FLETCH = 0xaa4444;

const COL_ARMOR = 0x666666;
const COL_ARMOR_LT = 0x888888;

const COL_HAIR = 0x4a3020;

const COL_EYE = 0x448844;

const COL_SHADOW = 0x000000;

export function generateRepeaterFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createRepeaterFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createRepeaterFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleRepeater(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingRepeater(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingRepeater(g, column);
      break;
    case UnitState.CAST:
      drawCastingRepeater(g, column);
      break;
    case UnitState.DIE:
      drawDyingRepeater(g, column);
      break;
  }

  const texture = RenderTexture.create({
    width: F,
    height: F,
  });
  renderer.render({ target: texture, container: g });
  g.destroy();

  return texture;
}

function drawIdleRepeater(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_LEATHER_DK });
  g.rect(CX - 6, GY - 6, 5, 8);
  g.rect(CX + 1, GY - 6, 5, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 7, GY - 26 + breathe, 14, 22);

  g.fill({ color: COL_LEATHER_LT });
  g.rect(CX - 5, GY - 24 + breathe, 10, 18);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 30 + breathe, 12, 6);

  g.fill({ color: COL_ARMOR_LT });
  g.rect(CX - 4, GY - 29 + breathe, 8, 4);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 36 + breathe, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 32 + breathe, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31 + breathe, 1);
  g.circle(CX + 2, GY - 31 + breathe, 1);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 8, GY - 20 + breathe, 3, 10);
  g.rect(CX + 5, GY - 20 + breathe, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + breathe, 4, 8);
  g.rect(CX + 5, GY - 18 + breathe, 4, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX + 8, GY - 22 + breathe, 8, 3);

  g.fill({ color: COL_LEATHER_DK });
  g.rect(CX + 9, GY - 23 + breathe, 6, 2);

  g.fill({ color: COL_BOLT_TIP });
  g.rect(CX + 9, GY - 21 + breathe, 2, 1);
}

function drawWalkingRepeater(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_LEATHER_DK });
  g.rect(CX - 6 - legSwing * 0.3, GY - 6 + bob, 5, 8);
  g.rect(CX + 1 + legSwing * 0.3, GY - 6 + bob, 5, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 7, GY - 26 + bob, 14, 22);

  g.fill({ color: COL_LEATHER_LT });
  g.rect(CX - 5, GY - 24 + bob, 10, 18);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 30 + bob, 12, 6);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 36 + bob, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 32 + bob, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31 + bob, 1);
  g.circle(CX + 2, GY - 31 + bob, 1);

  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 3;
  g.fill({ color: COL_LEATHER });
  g.rect(CX - 8, GY - 20 + bob + armSwing * 0.5, 3, 10);
  g.rect(CX + 5, GY - 20 + bob - armSwing * 0.5, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + bob + armSwing, 4, 8);
  g.rect(CX + 5, GY - 18 + bob - armSwing, 4, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX + 8, GY - 22 + bob, 8, 3);
}

function drawAttackingRepeater(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const draw = attackProgress * 6;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_LEATHER_DK });
  g.rect(CX - 6, GY - 6, 5, 8);
  g.rect(CX + 1, GY - 6, 5, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 7, GY - 26, 14, 22);

  g.fill({ color: COL_LEATHER_LT });
  g.rect(CX - 5, GY - 24, 10, 18);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 30, 12, 6);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 36, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 32, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31, 1);
  g.circle(CX + 2, GY - 31, 1);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 8, GY - 20 + draw, 3, 10);
  g.rect(CX + 5, GY - 20 - draw * 0.5, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + draw, 4, 8);
  g.rect(CX + 5, GY - 18 - draw * 0.5, 4, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX + 8, GY - 22 - draw, 10, 4);

  g.fill({ color: COL_BOLT });
  g.rect(CX + 10, GY - 21 - draw, 8, 2);

  g.fill({ color: COL_BOLT_TIP });
  g.rect(CX + 18, GY - 21.5 - draw, 2, 1);

  for (let i = 0; i < 2; i++) {
    g.fill({ color: COL_BOLT_FLETCH });
    g.rect(CX + 11 + i * 3, GY - 20 - draw, 1, 3);
    g.rect(CX + 11 + i * 3, GY - 23 - draw, 1, 3);
  }

  for (let i = 0; i < 3; i++) {
    g.fill({ color: COL_BOLT_TIP });
    g.circle(CX + 16 + i * 4 + draw * 0.5, GY - 20 - i * 2 - draw * 0.5, 1);
  }
}

function drawCastingRepeater(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const raise = castProgress * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_LEATHER_DK });
  g.rect(CX - 6, GY - 6, 5, 8);
  g.rect(CX + 1, GY - 6, 5, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 7, GY - 26, 14, 22);

  g.fill({ color: COL_LEATHER_LT });
  g.rect(CX - 5, GY - 24, 10, 18);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 30 - raise, 12, 6);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 36, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 32, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31, 1.5);
  g.circle(CX + 2, GY - 31, 1.5);

  g.fill({ color: COL_LEATHER });
  g.rect(CX - 8, GY - 20 - raise, 3, 10);
  g.rect(CX + 5, GY - 20 - raise, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 - raise, 4, 8);
  g.rect(CX + 5, GY - 18 - raise, 4, 8);

  g.fill({ color: COL_LEATHER });
  g.rect(CX + 8, GY - 22 - raise, 8, 3);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.3 + i * 1.2;
    const dist = 8 + castProgress * 12 + i * 3;
    const alpha = (1 - i * 0.15) * 0.6;
    g.fill({ color: COL_BOLT_TIP, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 20 + Math.sin(angle) * dist * 0.5 - raise,
      2 - i * 0.3,
    );
  }
}

function drawDyingRepeater(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const rotation = deathProgress * 0.2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const rotX = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 20);
    return CX + dx * cos - dy * sin;
  };
  const rotY = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 20);
    return GY - 20 + dx * sin + dy * cos;
  };

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(
    rotX(CX, GY + 1),
    rotY(CX, GY + 1),
    10 - deathProgress * 4,
    3 - deathProgress,
  );

  g.fill({ color: COL_LEATHER_DK });
  g.rect(
    rotX(CX - 6, GY - 6 + fall * 0.3),
    rotY(CX - 6, GY - 6 + fall * 0.3),
    5,
    8,
  );
  g.rect(
    rotX(CX + 1, GY - 6 + fall * 0.3),
    rotY(CX + 1, GY - 6 + fall * 0.3),
    5,
    8,
  );

  g.fill({ color: COL_LEATHER });
  g.rect(rotX(CX - 7, GY - 26 + fall), rotY(CX - 7, GY - 26 + fall), 14, 22);

  g.fill({ color: COL_LEATHER_LT });
  g.rect(rotX(CX - 5, GY - 24 + fall), rotY(CX - 5, GY - 24 + fall), 10, 18);

  g.fill({ color: COL_ARMOR });
  g.rect(rotX(CX - 6, GY - 30 + fall), rotY(CX - 6, GY - 30 + fall), 12, 6);

  g.fill({ color: COL_HAIR });
  g.rect(rotX(CX - 5, GY - 36 + fall), rotY(CX - 5, GY - 36 + fall), 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(rotX(CX - 4, GY - 32 + fall), rotY(CX - 4, GY - 32 + fall), 8, 6);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x333333 });
    g.circle(rotX(CX - 2, GY - 31 + fall), rotY(CX - 2, GY - 31 + fall), 1);
    g.circle(rotX(CX + 2, GY - 31 + fall), rotY(CX + 2, GY - 31 + fall), 1);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(rotX(CX - 2, GY - 31 + fall), rotY(CX - 2, GY - 31 + fall), 1);
    g.circle(rotX(CX + 2, GY - 31 + fall), rotY(CX + 2, GY - 31 + fall), 1);
  }

  g.fill({ color: COL_LEATHER });
  g.rect(rotX(CX + 8, GY - 22 + fall), rotY(CX + 8, GY - 22 + fall), 8, 3);
}
