// Procedural sprite generator for the BatteringRam unit type.
//
// Draws a detailed medieval battering ram at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 5, DIE 7).
//
// Visual features:
//   • Wooden frame with wheels
//   • Metal-tipped battering ram
//   • Crew of soldiers pushing
//   • Animated ram head swinging

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4b3020;
const COL_WOOD_LT = 0x8b6a4a;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_IRON_HI = 0x777777;
const COL_SKIN = 0xd4a574;
const COL_CLOTH = 0x4a6a8a;
const COL_CLOTH_DK = 0x3a5a7a;
const COL_HAIR = 0x4a3a2a;
const COL_SHADOW = 0x000000;

function drawRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  g.fill({ color });
  g.rect(x, y, w, h);
}

function drawCircle(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
): void {
  g.fill({ color });
  g.circle(x, y, r);
}

function drawLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number = 1,
): void {
  g.stroke({ color, width });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function drawEllipse(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  g.fill({ color });
  g.ellipse(x, y, w, h);
}

function drawShadow(g: Graphics): void {
  drawEllipse(g, CX, GY, 16, 4, COL_SHADOW);
}

function drawRamFrame(g: Graphics, offsetX: number = 0): void {
  const baseY = GY - 8;

  drawRect(g, 10 + offsetX, baseY, 28, 6, COL_WOOD_DK);

  drawCircle(g, 14 + offsetX, baseY + 6, 5, COL_WOOD);
  drawCircle(g, 14 + offsetX, baseY + 6, 3, COL_WOOD_DK);
  drawCircle(g, 34 + offsetX, baseY + 6, 5, COL_WOOD);
  drawCircle(g, 34 + offsetX, baseY + 6, 3, COL_WOOD_DK);

  drawRect(g, 8 + offsetX, baseY - 4, 4, 12, COL_WOOD);
  drawRect(g, 36 + offsetX, baseY - 4, 4, 12, COL_WOOD);

  drawRect(g, 6 + offsetX, baseY - 8, 8, 4, COL_WOOD_DK);
  drawRect(g, 34 + offsetX, baseY - 8, 8, 4, COL_WOOD_DK);
}

function drawRamHead(g: Graphics, swingAngle: number): void {
  const pivotX = CX;
  const pivotY = GY - 12;
  const armLength = 20;

  const rad = (swingAngle * Math.PI) / 180;
  const tipX = pivotX + Math.sin(rad) * armLength;
  const tipY = pivotY - Math.cos(rad) * armLength;

  drawLine(g, pivotX, pivotY, tipX, tipY, COL_WOOD_LT, 5);
  drawLine(g, pivotX, pivotY, tipX, tipY, COL_WOOD_DK, 2);

  g.fill({ color: COL_IRON_DK });
  g.moveTo(tipX - 4, tipY - 8)
    .lineTo(tipX + 12, tipY)
    .lineTo(tipX - 4, tipY + 8)
    .closePath();

  g.fill({ color: COL_IRON });
  g.moveTo(tipX, tipY - 4)
    .lineTo(tipX + 8, tipY)
    .lineTo(tipX, tipY + 4)
    .closePath();

  drawCircle(g, tipX + 4, tipY, 3, COL_IRON_HI);
}

function drawPusher(g: Graphics, x: number, y: number): void {
  drawRect(g, x - 2, y - 6, 4, 6, COL_CLOTH);
  drawCircle(g, x, y - 8, 2, COL_SKIN);
  drawCircle(g, x, y - 10, 2, COL_HAIR);

  drawRect(g, x - 3, y, 2, 4, COL_CLOTH_DK);
  drawRect(g, x + 1, y, 2, 4, COL_CLOTH_DK);
}

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.sin(cycle * Math.PI * 2) * 1;

  drawRamFrame(g, bounce * 0.5);
  drawRamHead(g, Math.sin(cycle * Math.PI * 2) * 5);

  drawPusher(g, CX - 8, GY - 10);
  drawPusher(g, CX + 8, GY - 10);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 2;
  const lean = Math.sin(cycle * Math.PI * 2) * 2;

  drawRamFrame(g, lean);
  drawRamHead(g, lean + bounce);

  drawPusher(g, CX - 10 - lean, GY - 10 + bounce);
  drawPusher(g, CX - 2 - lean * 0.5, GY - 10 + bounce);
  drawPusher(g, CX + 6 + lean * 0.5, GY - 10 + bounce);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  drawRamFrame(g);

  const swing = ((frame + 1) / 5) * 60 - 30;
  drawRamHead(g, swing);

  if (frame < 3) {
    drawPusher(g, CX - 10, GY - 10);
    drawPusher(g, CX - 4, GY - 10);
    drawPusher(g, CX + 2, GY - 10);
  } else {
    const push = (frame - 3) * 3;
    drawPusher(g, CX - 10 + push, GY - 10);
    drawPusher(g, CX - 4 + push, GY - 10);
    drawPusher(g, CX + 2 + push, GY - 10);
  }
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const rot = progress * 90;
  const fade = 1 - progress;

  g.alpha = fade;

  const rad = (rot * Math.PI) / 180;
  const offsetX = Math.sin(rad) * 10 * progress;
  const offsetY = progress * 20;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, offsetX, offsetY);
  drawRamFrame(g);
  drawRamHead(g, 0);

  drawPusher(g, CX - 8, GY - 10 + offsetY);
  drawPusher(g, CX + 8, GY - 10 + offsetY);
}

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 5 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateBatteringRamFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
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
