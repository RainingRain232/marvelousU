// Procedural sprite generator for the Ballista unit type.
//
// Draws a detailed medieval ballista at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 6, DIE 7).
//
// Visual features:
//   • Wooden wheeled carriage
//   • Metal bow arms
//   • Animated bowstring draw and release
//   • Crew member operating

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4b3020;
const COL_WOOD_LT = 0x8b6a4a;
const COL_IRON = 0x666666;
const COL_IRON_DK = 0x444444;
const COL_IRON_HI = 0x888888;
const COL_SKIN = 0xd4a574;
const COL_CLOTH = 0x8a4a2a;
const COL_CLOTH_DK = 0x6a3a1a;
const COL_HAIR = 0x4a3a2a;
const COL_SHADOW = 0x000000;
const COL_STRING = 0xaaa888;

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

function drawShadow(g: Graphics): void {
  drawEllipse(g, CX, GY, 14, 4, COL_SHADOW);
}

function drawCarriage(g: Graphics): void {
  const baseY = GY - 6;

  drawRect(g, 8, baseY, 32, 6, COL_WOOD_DK);

  drawCircle(g, 14, baseY + 6, 5, COL_WOOD);
  drawCircle(g, 14, baseY + 6, 3, COL_WOOD_DK);
  drawCircle(g, 34, baseY + 6, 5, COL_WOOD);
  drawCircle(g, 34, baseY + 6, 3, COL_WOOD_DK);

  drawRect(g, 6, baseY - 4, 4, 10, COL_WOOD);
  drawRect(g, 38, baseY - 4, 4, 10, COL_WOOD);

  drawRect(g, 4, baseY - 6, 8, 3, COL_WOOD_DK);
  drawRect(g, 36, baseY - 6, 8, 3, COL_WOOD_DK);
}

function drawBallistaArms(g: Graphics, drawPercent: number): void {
  const pivotX = CX;
  const pivotY = GY - 14;
  const armLength = 16;
  const pullBack = drawPercent * 8;

  drawRect(g, pivotX - 3, pivotY - 3, 6, 8, COL_WOOD_DK);

  const topArmEndX = pivotX - armLength - pullBack;
  const topArmEndY = pivotY - 12;
  const bottomArmEndX = pivotX - armLength - pullBack;
  const bottomArmEndY = pivotY + 8;

  drawLine(g, pivotX, pivotY - 2, topArmEndX, topArmEndY, COL_IRON, 3);
  drawLine(g, pivotX, pivotY + 2, bottomArmEndX, bottomArmEndY, COL_IRON, 3);

  const stringTopY = topArmEndY + 2;
  const stringBottomY = bottomArmEndY - 2;
  const stringPullX = pivotX - pullBack * 1.5;

  drawLine(
    g,
    topArmEndX,
    topArmEndY + 2,
    stringPullX,
    (stringTopY + stringBottomY) / 2,
    COL_STRING,
    1,
  );
  drawLine(
    g,
    bottomArmEndX,
    bottomArmEndY - 2,
    stringPullX,
    (stringTopY + stringBottomY) / 2,
    COL_STRING,
    1,
  );

  drawCircle(g, pivotX, pivotY, 3, COL_IRON_DK);
  drawCircle(g, pivotX, pivotY, 2, COL_IRON_HI);
}

function drawBolt(g: Graphics, drawPercent: number, fired: boolean): void {
  if (fired) return;

  const startX = CX - 20;
  const endX = CX - 6 - drawPercent * 8;
  const y = GY - 14;

  drawLine(g, startX, y, endX, y, COL_WOOD_LT, 2);

  drawLine(g, endX, y - 2, endX + 4, y, COL_IRON);
  drawLine(g, endX, y + 2, endX + 4, y, COL_IRON);

  drawLine(g, startX + 2, y - 1, startX + 4, y, 0xaa4444);
  drawLine(g, startX + 2, y + 1, startX + 4, y, 0xaa4444);
}

function drawOperator(g: Graphics): void {
  const ox = CX + 12;
  const oy = GY - 14;

  drawRect(g, ox - 3, oy - 6, 6, 8, COL_CLOTH);

  drawCircle(g, ox, oy - 9, 3, COL_SKIN);
  drawCircle(g, ox, oy - 11, 2, COL_HAIR);

  drawRect(g, ox - 4, oy, 2, 4, COL_CLOTH_DK);
  drawRect(g, ox + 2, oy, 2, 4, COL_CLOTH_DK);

  drawRect(g, ox + 2, oy - 6, 6, 2, COL_SKIN);
}

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const draw = 0.3 + Math.sin(cycle * Math.PI * 2) * 0.2;

  drawOperator(g);
  drawCarriage(g);
  drawBallistaArms(g, draw);
  drawBolt(g, draw, false);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const cycle = frame / 8;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 2)) * 2;
  const draw = 0.3;

  drawOperator(g);
  g.setTransform(1, 0, 0, 1, 0, bounce);
  drawCarriage(g);
  drawBallistaArms(g, draw);
  drawBolt(g, draw, false);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  drawOperator(g);
  drawCarriage(g);

  let draw = 0;
  let fired = false;
  let boltX = 0;

  if (frame < 2) {
    draw = ((frame + 1) / 2) * 0.8;
  } else if (frame < 4) {
    draw = 0.8;
  } else {
    draw = 0.8 - (frame - 4) * 0.4;
    if (frame >= 5) {
      fired = true;
      boltX = (frame - 4) * 8;
    }
  }

  drawBallistaArms(g, draw);

  if (!fired) {
    drawBolt(g, draw, false);
  } else {
    const boltY = GY - 14;
    drawLine(g, CX - 20 + boltX, boltY, CX - 6 + boltX, boltY, COL_WOOD_LT, 2);
    drawLine(g, CX - 16 + boltX, boltY - 2, CX - 12 + boltX, boltY, COL_IRON);
    drawLine(g, CX - 16 + boltX, boltY + 2, CX - 12 + boltX, boltY, COL_IRON);
  }
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;

  g.alpha = fade;

  const rot = progress * 90;
  const rad = (rot * Math.PI) / 180;
  const offsetY = progress * 20;
  const offsetX = Math.sin(rad) * 10 * progress;

  drawShadow(g);

  g.setTransform(1, 0, 0, 1, offsetX, offsetY);
  drawCarriage(g);
  drawBallistaArms(g, 0);
  drawBolt(g, 0, true);
  drawOperator(g);
}

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateBallistaFrames(
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
