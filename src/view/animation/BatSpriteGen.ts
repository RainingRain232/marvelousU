// Procedural sprite generator for the Bat unit type.
//
// Draws a swarm of bats at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Multiple small bats flying together
//   • Dark wings
//   • Red eyes

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_WING = 0x1a0a0a;

const COL_BODY = 0x2a1a1a;

const COL_EYE = 0xff0000;
const COL_EYE_GLOW = 0xff4444;

const COL_SHADOW = 0x000000;

export function generateBatFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createBatFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createBatFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleBat(g, column);
      break;
    case UnitState.MOVE:
      drawFlyingBat(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingBat(g, column);
      break;
    case UnitState.CAST:
      drawCastingBat(g, column);
      break;
    case UnitState.DIE:
      drawDyingBat(g, column);
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

function drawBat(
  g: Graphics,
  x: number,
  y: number,
  wingPhase: number,
  size: number,
): void {
  const wingFlap = Math.sin(wingPhase) * size * 0.4;

  g.fill({ color: COL_WING });
  g.ellipse(x - size * 0.8, y, size * 0.6, size * 0.3 + wingFlap);
  g.ellipse(x + size * 0.8, y, size * 0.6, size * 0.3 + wingFlap);

  g.fill({ color: COL_BODY });
  g.ellipse(x, y, size * 0.3, size * 0.4);

  g.fill({ color: COL_EYE });
  g.circle(x - size * 0.1, y - size * 0.1, size * 0.08);
  g.circle(x + size * 0.1, y - size * 0.1, size * 0.08);
}

function drawIdleBat(g: Graphics, frame: number): void {
  const float = Math.sin(frame * 0.4) * 3;
  const wingPhase = frame * 0.5;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 14, 4);

  drawBat(g, CX - 6, GY - 20 + float, wingPhase, 8);
  drawBat(g, CX + 5, GY - 15 + float * 0.8, wingPhase + 0.5, 6);
  drawBat(g, CX - 2, GY - 28 + float * 1.2, wingPhase + 1, 5);
}

function drawFlyingBat(g: Graphics, frame: number): void {
  const wingPhase = frame * 0.8;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 14, 4);

  drawBat(g, CX - 8, GY - 18, wingPhase, 10);
  drawBat(g, CX + 6, GY - 12, wingPhase + 0.3, 8);
  drawBat(g, CX - 3, GY - 25, wingPhase + 0.6, 7);
}

function drawAttackingBat(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 8;
  const wingPhase = frame;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  drawBat(g, CX - 8 - lunge, GY - 18 - lunge * 0.3, wingPhase, 10);
  drawBat(g, CX + 6 - lunge, GY - 12 - lunge * 0.3, wingPhase + 0.3, 8);
  drawBat(g, CX - 3 - lunge, GY - 25 - lunge * 0.3, wingPhase + 0.6, 7);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: COL_EYE_GLOW });
    g.circle(CX - 10 - lunge - i * 4, GY - 20 - i * 3, 1.5 - i * 0.3);
  }
}

function drawCastingBat(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const wingPhase = frame * 0.6;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.3 + i * 1.2;
    const dist = 5 + castProgress * 10 + i * 3;
    g.fill({ color: COL_EYE_GLOW, alpha: 0.8 - i * 0.15 });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 20 + Math.sin(angle) * 4,
      3 - i * 0.4,
    );
  }

  drawBat(g, CX, GY - 20, wingPhase, 12);
}

function drawDyingBat(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 25;
  const wingPhase = frame * 0.3;

  g.fill({ color: COL_SHADOW, alpha: 0.3 - deathProgress * 0.3 });
  g.ellipse(CX, GY + 2, 14 - deathProgress * 6, 4 - deathProgress * 2);

  drawBat(g, CX - 6, GY - 20 + fall, wingPhase, 8 - deathProgress * 3);
  drawBat(
    g,
    CX + 5,
    GY - 15 + fall * 0.8,
    wingPhase + 0.5,
    6 - deathProgress * 2,
  );

  if (deathProgress < 0.5) {
    for (let i = 0; i < 4; i++) {
      g.fill({ color: COL_EYE_GLOW, alpha: 0.5 - deathProgress });
      g.circle(
        CX + Math.random() * 20 - 10,
        GY - 20 + fall - Math.random() * 15,
        1 + Math.random(),
      );
    }
  }
}
