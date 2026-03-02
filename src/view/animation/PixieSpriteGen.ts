// Procedural sprite generator for the Pixie unit type.
//
// Draws a small ethereal pixie at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Small body with fair skin
//   • Light blue ethereal wings
//   • Little green dress
//   • Floats above the ground
//   • Long waving red hair
//   • Stretches arms for magic casting (no bow)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 6;

const COL_SKIN = 0xffe4d4;

const COL_HAIR = 0xcc3333;
const COL_HAIR_DK = 0xaa2222;

const COL_DRESS = 0x33aa33;
const COL_DRESS_DK = 0x228822;
const COL_DRESS_LT = 0x44cc44;

const COL_WING = 0xaaaaff;
const COL_WING_ETHEREAL = 0xccccff;
const COL_WING_DK = 0x8888dd;

const COL_EYE = 0x222266;
const COL_EYE_WHITE = 0xffffff;

const COL_SHADOW = 0x000000;

export function generatePixieFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createPixieFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createPixieFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdlePixie(g, column);
      break;
    case UnitState.MOVE:
      drawFlyingPixie(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingPixie(g, column);
      break;
    case UnitState.CAST:
      drawAttackingPixie(g, column);
      break;
    case UnitState.DIE:
      drawDyingPixie(g, column);
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

function drawIdlePixie(g: Graphics, frame: number): void {
  const hover = Math.sin(frame * 0.4) * 2;
  const wingFlap = Math.sin(frame * 0.6) * 0.3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 4, 10, 3);

  const bodyY = GY - 16 + hover;

  drawWings(g, wingFlap, bodyY);

  g.fill({ color: COL_DRESS_DK });
  g.ellipse(CX, bodyY + 4, 8, 6);

  g.fill({ color: COL_DRESS });
  g.ellipse(CX, bodyY + 2, 7, 5);

  g.fill({ color: COL_DRESS_LT });
  g.ellipse(CX, bodyY, 5, 3);

  g.fill({ color: COL_SKIN });
  g.circle(CX, bodyY - 8, 6);

  g.fill({ color: COL_HAIR_DK });
  g.ellipse(CX - 3, bodyY - 12, 4, 8);
  g.ellipse(CX + 3, bodyY - 12, 4, 8);

  const hairWave = Math.sin(frame * 0.3) * 2;
  g.fill({ color: COL_HAIR });
  g.ellipse(CX - 4 + hairWave * 0.3, bodyY - 8, 3, 6);
  g.ellipse(CX + 4 + hairWave * 0.3, bodyY - 8, 3, 6);
  g.ellipse(CX, bodyY - 10, 4, 5);

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 9, 1.5);
  g.circle(CX + 2, bodyY - 9, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 9, 0.8);
  g.circle(CX + 2, bodyY - 9, 0.8);

  g.fill({ color: COL_SKIN });
  g.ellipse(CX - 6, bodyY - 4, 2, 4);
  g.ellipse(CX + 6, bodyY - 4, 2, 4);

  const armWave = Math.sin(frame * 0.4) * 1;
  g.fill({ color: COL_SKIN });
  g.rect(CX - 8, bodyY - 6 + armWave, 2, 6);
  g.rect(CX + 6, bodyY - 6 - armWave, 2, 6);
}

function drawWings(g: Graphics, flap: number, bodyY: number): void {
  g.fill({ color: COL_WING_DK, alpha: 0.5 });
  g.ellipse(CX - 12, bodyY - 10 - flap * 5, 8, 12 - flap * 3);
  g.ellipse(CX + 12, bodyY - 10 - flap * 5, 8, 12 - flap * 3);

  g.fill({ color: COL_WING_ETHEREAL, alpha: 0.7 });
  g.ellipse(CX - 11, bodyY - 10 - flap * 4, 6, 10 - flap * 2);
  g.ellipse(CX + 11, bodyY - 10 - flap * 4, 6, 10 - flap * 2);

  g.fill({ color: COL_WING, alpha: 0.6 });
  g.ellipse(CX - 10, bodyY - 9 - flap * 3, 4, 7 - flap);
  g.ellipse(CX + 10, bodyY - 9 - flap * 3, 4, 7 - flap);
}

function drawFlyingPixie(g: Graphics, frame: number): void {
  const flyCycle = (frame % 8) / 8;
  const hover = Math.sin(flyCycle * Math.PI * 2) * 3;
  const wingFlap = Math.sin(flyCycle * Math.PI * 4) * 0.4;

  g.fill({ color: COL_SHADOW, alpha: 0.5 });
  g.ellipse(CX, GY + 4, 8, 2);

  const bodyY = GY - 18 + hover;

  drawWings(g, wingFlap, bodyY);

  g.fill({ color: COL_DRESS_DK });
  g.ellipse(CX, bodyY + 4, 8, 6);

  g.fill({ color: COL_DRESS });
  g.ellipse(CX, bodyY + 2, 7, 5);

  g.fill({ color: COL_DRESS_LT });
  g.ellipse(CX, bodyY, 5, 3);

  g.fill({ color: COL_SKIN });
  g.circle(CX, bodyY - 8, 6);

  g.fill({ color: COL_HAIR_DK });
  g.ellipse(CX - 3, bodyY - 12, 4, 8);
  g.ellipse(CX + 3, bodyY - 12, 4, 8);

  const hairWave = Math.sin(flyCycle * Math.PI * 4) * 3;
  g.fill({ color: COL_HAIR });
  g.ellipse(CX - 4 + hairWave * 0.3, bodyY - 8, 3, 7);
  g.ellipse(CX + 4 + hairWave * 0.3, bodyY - 8, 3, 7);
  g.ellipse(CX, bodyY - 10, 4, 5);

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 9, 1.5);
  g.circle(CX + 2, bodyY - 9, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 9, 0.8);
  g.circle(CX + 2, bodyY - 9, 0.8);

  g.fill({ color: COL_SKIN });
  g.ellipse(CX - 6, bodyY - 4, 2, 4);
  g.ellipse(CX + 6, bodyY - 4, 2, 4);

  const armWave = Math.sin(flyCycle * Math.PI * 4) * 2;
  g.fill({ color: COL_SKIN });
  g.rect(CX - 8, bodyY - 6 + armWave, 2, 6);
  g.rect(CX + 6, bodyY - 6 - armWave, 2, 6);
}

function drawAttackingPixie(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const hover = Math.sin(frame * 0.4) * 2;
  const wingFlap = Math.sin(frame * 0.3) * 0.2;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 4, 10, 3);

  const bodyY = GY - 16 + hover;

  drawWings(g, wingFlap, bodyY);

  g.fill({ color: COL_DRESS_DK });
  g.ellipse(CX, bodyY + 4, 8, 6);

  g.fill({ color: COL_DRESS });
  g.ellipse(CX, bodyY + 2, 7, 5);

  g.fill({ color: COL_DRESS_LT });
  g.ellipse(CX, bodyY, 5, 3);

  g.fill({ color: COL_SKIN });
  g.circle(CX, bodyY - 8, 6);

  const hairFlow = attackProgress * 4;
  g.fill({ color: COL_HAIR_DK });
  g.ellipse(CX - 3, bodyY - 12, 4, 8);
  g.ellipse(CX + 3, bodyY - 12, 4, 8);

  g.fill({ color: COL_HAIR });
  g.ellipse(CX - 4 - hairFlow * 0.3, bodyY - 8, 3, 7);
  g.ellipse(CX + 4 + hairFlow * 0.3, bodyY - 8, 3, 7);
  g.ellipse(CX, bodyY - 10, 4, 5);

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 9, 1.5);
  g.circle(CX + 2, bodyY - 9, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 9, 0.8);
  g.circle(CX + 2, bodyY - 9, 0.8);

  g.fill({ color: COL_SKIN });
  g.ellipse(CX - 6, bodyY - 4, 2, 4);
  g.ellipse(CX + 6, bodyY - 4, 2, 4);

  const armExtend = attackProgress * 8;
  g.fill({ color: COL_SKIN });
  g.rect(CX - 8 - armExtend, bodyY - 5, 2, 5);
  g.rect(CX + 6 + armExtend, bodyY - 5, 2, 5);

  if (attackProgress > 0.3) {
    const sparkleIntensity = Math.sin(attackProgress * Math.PI) * 0.8;
    const sparkleX = CX + 10 + armExtend;
    const sparkleY = bodyY - 5;

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + frame * 0.5;
      const dist = 6 + Math.sin(frame * 0.8 + i) * 3;
      g.fill({ color: 0xffffaa, alpha: sparkleIntensity * 0.6 });
      g.circle(
        sparkleX + Math.cos(angle) * dist,
        sparkleY + Math.sin(angle) * dist,
        2 - i * 0.5,
      );
    }

    g.fill({ color: 0xffffff, alpha: sparkleIntensity * 0.8 });
    g.circle(sparkleX, sparkleY, 3);

    g.fill({ color: 0xaaffaa, alpha: sparkleIntensity * 0.5 });
    g.circle(sparkleX + 4, sparkleY - 2, 2);
  }
}

function drawDyingPixie(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const fade = 1 - deathProgress;

  g.alpha = fade;

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(CX, GY + 4 + fall * 0.5, 10 - deathProgress * 5, 3 - deathProgress);

  const bodyY = GY - 16 + fall;

  const wingFall = deathProgress * 0.5;
  g.fill({ color: COL_WING_DK, alpha: 0.5 * fade });
  g.ellipse(CX - 12, bodyY - 10 - wingFall * 5, 8, 12 - wingFall * 3);
  g.ellipse(CX + 12, bodyY - 10 - wingFall * 5, 8, 12 - wingFall * 3);

  g.fill({ color: COL_DRESS_DK });
  g.ellipse(CX, bodyY + 4, 8, 6);

  g.fill({ color: COL_DRESS });
  g.ellipse(CX, bodyY + 2, 7, 5);

  g.fill({ color: COL_SKIN });
  g.circle(CX, bodyY - 8, 6);

  g.fill({ color: COL_HAIR_DK });
  g.ellipse(CX - 3, bodyY - 12, 4, 8);
  g.ellipse(CX + 3, bodyY - 12, 4, 8);

  g.fill({ color: COL_HAIR });
  g.ellipse(CX - 4, bodyY - 8, 3, 7);
  g.ellipse(CX + 4, bodyY - 8, 3, 7);

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333344 });
  } else {
    g.fill({ color: COL_EYE_WHITE });
  }
  g.circle(CX - 2, bodyY - 9, 1.5);
  g.circle(CX + 2, bodyY - 9, 1.5);

  if (deathProgress < 0.5) {
    g.fill({ color: COL_EYE });
    g.circle(CX - 2, bodyY - 9, 0.8);
    g.circle(CX + 2, bodyY - 9, 0.8);
  }
}
