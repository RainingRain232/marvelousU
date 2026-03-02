// Procedural sprite generator for the Rhino unit type.
//
// Draws a rhinoceros at 64×64 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Thick gray-brown skin
//   • Large horn on the nose
//   • Small second horn behind
//   • Heavy body with four legs
//   • Side view: front (right) to the left (from P1 perspective)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 64;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0x6b6b5a;
const COL_SKIN_DK = 0x4a4a3a;
const COL_SKIN_LT = 0x8a8a70;

const COL_HORN = 0xd4c4a4;
const COL_HORN_DK = 0xa09070;

const COL_EYE = 0x222222;

const COL_SHADOW = 0x000000;

const COL_HOOF = 0x2a2a20;

export function generateRhinoFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createRhinoFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createRhinoFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleRhino(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingRhino(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingRhino(g, column);
      break;
    case UnitState.CAST:
      drawIdleRhino(g, column);
      break;
    case UnitState.DIE:
      drawDyingRhino(g, column);
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

function drawIdleRhino(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 28, 6);

  const bodyX = CX - 4;
  const bodyY = GY - 20 + breathe;

  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 16, bodyY - 14, 36, 28);

  g.fill({ color: COL_SKIN });
  g.rect(bodyX - 14, bodyY - 12, 32, 24);

  g.fill({ color: COL_SKIN_LT });
  g.rect(bodyX - 10, bodyY - 8, 24, 16);

  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 18, bodyY - 8, 4, 20);
  g.rect(bodyX + 18, bodyY - 8, 4, 20);

  const legY = bodyY + 12;
  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 12, legY, 6, 10);
  g.rect(bodyX + 8, legY, 6, 10);

  g.fill({ color: COL_HOOF });
  g.rect(bodyX - 13, legY + 8, 8, 3);
  g.rect(bodyX + 7, legY + 8, 8, 3);

  const headX = bodyX + 18;
  const headY = bodyY - 8;

  g.fill({ color: COL_SKIN_DK });
  g.rect(headX - 4, headY - 10, 14, 16);

  g.fill({ color: COL_SKIN });
  g.rect(headX - 2, headY - 8, 10, 12);

  g.fill({ color: COL_EYE });
  g.circle(headX + 4, headY - 4, 2);

  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 8, headY - 6);
  g.lineTo(headX + 20, headY + 2);
  g.lineTo(headX + 8, headY + 4);
  g.closePath();

  g.fill({ color: COL_HORN });
  g.moveTo(headX + 8, headY - 5);
  g.lineTo(headX + 18, headY + 2);
  g.lineTo(headX + 8, headY + 3);
  g.closePath();

  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 2, headY - 4);
  g.lineTo(headX + 8, headY - 2);
  g.lineTo(headX + 2, headY);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.ellipse(headX - 2, headY, 4, 3);

  g.fill({ color: COL_SKIN_DK });
  g.ellipse(bodyX - 16, bodyY + 2, 4, 6);
}

function drawWalkingRhino(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 2;
  const legOffset1 = Math.sin(walkCycle * Math.PI * 2) * 4;
  const legOffset2 = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 28 - Math.abs(legOffset1) * 0.3, 6);

  const bodyX = CX - 4;
  const bodyY = GY - 20 + bob;

  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 16, bodyY - 14, 36, 28);

  g.fill({ color: COL_SKIN });
  g.rect(bodyX - 14, bodyY - 12, 32, 24);

  g.fill({ color: COL_SKIN_LT });
  g.rect(bodyX - 10, bodyY - 8, 24, 16);

  const legY = bodyY + 12;
  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 12, legY + legOffset1 * 0.3, 6, 10 - legOffset1 * 0.2);
  g.rect(bodyX + 8, legY + legOffset2 * 0.3, 6, 10 - legOffset2 * 0.2);

  g.fill({ color: COL_HOOF });
  g.rect(bodyX - 13, legY + 8 + legOffset1 * 0.3, 8, 3);
  g.rect(bodyX + 7, legY + 8 + legOffset2 * 0.3, 8, 3);

  const headX = bodyX + 18;
  const headY = bodyY - 8;

  g.fill({ color: COL_SKIN_DK });
  g.rect(headX - 4, headY - 10, 14, 16);

  g.fill({ color: COL_SKIN });
  g.rect(headX - 2, headY - 8, 10, 12);

  g.fill({ color: COL_EYE });
  g.circle(headX + 4, headY - 4, 2);

  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 8, headY - 6);
  g.lineTo(headX + 20, headY + 2);
  g.lineTo(headX + 8, headY + 4);
  g.closePath();

  g.fill({ color: COL_HORN });
  g.moveTo(headX + 8, headY - 5);
  g.lineTo(headX + 18, headY + 2);
  g.lineTo(headX + 8, headY + 3);
  g.closePath();

  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 2, headY - 4);
  g.lineTo(headX + 8, headY - 2);
  g.lineTo(headX + 2, headY);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.ellipse(headX - 2, headY, 4, 3);
}

function drawAttackingRhino(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 12;
  const hornRaise = Math.sin(attackProgress * Math.PI) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 28, 6);

  const bodyX = CX - 4 - lunge;
  const bodyY = GY - 20;

  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 16, bodyY - 14, 36, 28);

  g.fill({ color: COL_SKIN });
  g.rect(bodyX - 14, bodyY - 12, 32, 24);

  g.fill({ color: COL_SKIN_LT });
  g.rect(bodyX - 10, bodyY - 8, 24, 16);

  const legY = bodyY + 12;
  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 12, legY, 6, 10);
  g.rect(bodyX + 8, legY, 6, 10);

  g.fill({ color: COL_HOOF });
  g.rect(bodyX - 13, legY + 8, 8, 3);
  g.rect(bodyX + 7, legY + 8, 8, 3);

  const headX = bodyX + 18;
  const headY = bodyY - 8 - hornRaise;

  g.fill({ color: COL_SKIN_DK });
  g.rect(headX - 4, headY - 10, 14, 16);

  g.fill({ color: COL_SKIN });
  g.rect(headX - 2, headY - 8, 10, 12);

  g.fill({ color: COL_EYE });
  g.circle(headX + 4, headY - 4, 2);

  const hornOffset = hornRaise * 0.5;
  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 8, headY - 6 + hornOffset);
  g.lineTo(headX + 22, headY + 2 + hornOffset);
  g.lineTo(headX + 8, headY + 4 + hornOffset);
  g.closePath();

  g.fill({ color: COL_HORN });
  g.moveTo(headX + 8, headY - 5 + hornOffset);
  g.lineTo(headX + 20, headY + 2 + hornOffset);
  g.lineTo(headX + 8, headY + 3 + hornOffset);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.ellipse(headX - 2, headY, 4, 3);

  if (attackProgress > 0.3 && attackProgress < 0.8) {
    g.fill({ color: 0xffffff, alpha: 0.3 });
    g.circle(headX + 24, headY + 2 + hornOffset, 8);
  }
}

function drawDyingRhino(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 25;
  const fade = 1 - deathProgress;

  g.alpha = fade;

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress * 0.5 });
  g.ellipse(
    CX,
    GY + 2 + fall * 0.5,
    28 - deathProgress * 10,
    6 - deathProgress * 3,
  );

  const bodyX = CX - 4;
  const bodyY = GY - 20 + fall;

  g.fill({ color: COL_SKIN_DK });
  g.rect(bodyX - 16, bodyY - 14, 36, 28);

  g.fill({ color: COL_SKIN });
  g.rect(bodyX - 14, bodyY - 12, 32, 24);

  const headX = bodyX + 18;
  const headY = bodyY - 8;

  g.fill({ color: COL_SKIN_DK });
  g.rect(headX - 4, headY - 10, 14, 16);

  g.fill({ color: COL_HORN_DK });
  g.moveTo(headX + 8, headY - 6);
  g.lineTo(headX + 20, headY + 2);
  g.lineTo(headX + 8, headY + 4);
  g.closePath();

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333333 });
    g.circle(headX + 4, headY - 4, 2);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(headX + 4, headY - 4, 2);
  }
}
