// Procedural sprite generator for the Troll unit type.
//
// Draws a massive troll at 64×64 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Massive greenish-brown body
//   • Large club
//   • Tattered clothes
//   • Small eyes

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 64;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0x5a6e4a;
const COL_SKIN_LT = 0x7a8e6a;

const COL_CLOTH = 0x4a3a2a;
const COL_CLOTH_DK = 0x2a1a0a;

const COL_CLUB = 0x5c4033;
const COL_CLUB_DK = 0x3c2820;

const COL_EYE = 0xffff00;
const COL_EYE_PUPIL = 0x000000;

const COL_SHADOW = 0x000000;

export function generateTrollFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createTrollFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createTrollFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleTroll(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingTroll(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingTroll(g, column);
      break;
    case UnitState.CAST:
      drawCastingTroll(g, column);
      break;
    case UnitState.DIE:
      drawDyingTroll(g, column);
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

function drawIdleTroll(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.2) * 1;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 22, 6);

  g.fill({ color: COL_CLOTH_DK });
  g.rect(CX - 12, GY - 10, 24, 14);

  g.fill({ color: COL_CLOTH });
  g.rect(CX - 10, GY - 8, 20, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GY - 40 + breathe, 28, 32);

  g.fill({ color: COL_SKIN_LT });
  g.rect(CX - 12, GY - 38 + breathe, 24, 28);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 16, GY - 48 + breathe, 10, 12);
  g.rect(CX + 6, GY - 48 + breathe, 10, 12);

  g.fill({ color: COL_EYE });
  g.circle(CX - 5, GY - 35 + breathe, 3);
  g.circle(CX + 5, GY - 35 + breathe, 3);

  g.fill({ color: COL_EYE_PUPIL });
  g.circle(CX - 4, GY - 35 + breathe, 1.5);
  g.circle(CX + 6, GY - 35 + breathe, 1.5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 25 + breathe, 6, 8);

  g.fill({ color: COL_CLUB });
  g.rect(CX + 18, GY - 45, 6, 40);

  g.fill({ color: COL_CLUB_DK });
  g.rect(CX + 19, GY - 47, 4, 4);
}

function drawWalkingTroll(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 2;
  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 22, 6);

  g.fill({ color: COL_CLOTH_DK });
  g.rect(CX - 12, GY - 10 + bob, 24, 14);

  g.fill({ color: COL_CLOTH });
  g.rect(CX - 10, GY - 8 + bob, 20, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GY - 40 + bob, 28, 32);

  g.fill({ color: COL_SKIN_LT });
  g.rect(CX - 12, GY - 38 + bob, 24, 28);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 16, GY - 48 + bob, 10, 12);
  g.rect(CX + 6, GY - 48 + bob, 10, 12);

  g.fill({ color: COL_EYE });
  g.circle(CX - 5, GY - 35 + bob, 3);
  g.circle(CX + 5, GY - 35 + bob, 3);

  g.fill({ color: COL_EYE_PUPIL });
  g.circle(CX - 4, GY - 35 + bob, 1.5);
  g.circle(CX + 6, GY - 35 + bob, 1.5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 25 + bob, 6, 8);

  g.fill({ color: COL_CLUB });
  g.rect(CX + 18 + armSwing * 0.5, GY - 45 + bob, 6, 40);
}

function drawAttackingTroll(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const swing = attackProgress * 15;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 22, 6);

  g.fill({ color: COL_CLOTH_DK });
  g.rect(CX - 12, GY - 10, 24, 14);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GY - 40, 28, 32);

  g.fill({ color: COL_SKIN_LT });
  g.rect(CX - 12, GY - 38, 24, 28);

  g.fill({ color: COL_EYE });
  g.circle(CX - 5, GY - 35, 3);
  g.circle(CX + 5, GY - 35, 3);

  g.fill({ color: COL_EYE_PUPIL });
  g.circle(CX - 4, GY - 35, 1.5);
  g.circle(CX + 6, GY - 35, 1.5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 25, 6, 8);

  g.fill({ color: COL_CLUB });
  g.rect(CX + 18 + swing, GY - 45 - swing * 0.3, 6, 40);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: 0xffffff });
    g.circle(CX + 25 + swing + i * 3, GY - 40 - i * 4 - swing * 0.3, 2);
  }
}

function drawCastingTroll(g: Graphics, frame: number): void {
  const castProgress = frame / 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 22, 6);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.2 + i * 1.2;
    const dist = 8 + castProgress * 12 + i * 4;
    g.fill({ color: COL_EYE, alpha: 0.6 - i * 0.1 });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 35 + Math.sin(angle) * 5,
      4 - i * 0.5,
    );
  }

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GY - 40, 28, 32);

  g.fill({ color: COL_CLUB });
  g.rect(CX + 18, GY - 45, 6, 40);
}

function drawDyingTroll(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(CX, GY + 2, 22 - deathProgress * 8, 6 - deathProgress * 3);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GY - 40 + fall, 28, 32);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x333333 });
    g.circle(CX - 5, GY - 35 + fall, 2);
    g.circle(CX + 5, GY - 35 + fall, 2);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(CX - 5, GY - 35 + fall, 3);
    g.circle(CX + 5, GY - 35 + fall, 3);
  }

  g.fill({ color: COL_CLUB });
  g.rect(CX + 18, GY - 45 + fall, 6, 40);
}
