// Procedural sprite generator for the Longbowman unit type.
//
// Draws a longbowman archer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Forest green leather tunic
//   • Brown leather hood
//   • Large English longbow (tall, curved)
//   • Dynamic bowstring pulling and releasing
//   • Quiver on back with many arrows
//   • Boots + legs with walk / attack poses

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xf0c8a0;
const COL_LEATHER = 0x5d3a1a;
const COL_LEATHER_DK = 0x3d2610;
const COL_FOREST = 0x2d4d2d;
const COL_FOREST_DK = 0x1d331d;
const COL_HOOD = 0x4a3728;
const COL_HOOD_DK = 0x34261c;
const COL_WOOD = 0x8b5a2b;
const COL_WOOD_DK = 0x5d3d1d;
const COL_STRING = 0xddddcc;
const COL_ARROW = 0xcccccc;
const COL_SHADOW = 0x000000;

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

function drawShadow(g: Graphics, cx: number, gy: number): void {
  g.ellipse(cx, gy + 1, 12, 3.5).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 4.5 + stanceL, legTop, 3, 10).fill({ color: COL_LEATHER_DK });
  g.rect(cx + 1.5 + stanceR, legTop, 3, 10).fill({ color: COL_LEATHER_DK });
}

function drawTorso(g: Graphics, cx: number, torsoTop: number, tilt = 0): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, 14, 2)
    .fill({ color: COL_FOREST })
    .stroke({ color: COL_FOREST_DK, width: 0.8 });
  g.rect(x, torsoTop + 9, tw, 2).fill({ color: COL_LEATHER_DK });
}

function drawQuiver(g: Graphics, cx: number, cy: number): void {
  g.moveTo(cx - 10, cy - 2)
    .lineTo(cx - 6, cy - 3)
    .lineTo(cx - 4, cy + 9)
    .lineTo(cx - 8, cy + 10)
    .closePath()
    .fill({ color: COL_LEATHER });
  g.rect(cx - 9, cy - 6, 2, 5).fill({ color: COL_ARROW });
  g.rect(cx - 7, cy - 5, 2, 4).fill({ color: 0x886644 });
}

function drawHead(
  g: Graphics,
  cx: number,
  y: number,
  hasHood: boolean = true,
): void {
  g.circle(cx, y, 4.5).fill({ color: COL_SKIN });
  if (hasHood) {
    g.circle(cx, y - 1, 5.5).fill({ color: COL_HOOD });
    g.circle(cx, y - 2, 4.5).fill({ color: COL_HOOD_DK });
  }
  g.circle(cx - 1.5, y - 0.5, 0.8).fill({ color: 0x2a1a0a });
}

function drawLongbow(
  g: Graphics,
  cx: number,
  cy: number,
  drawPercent: number,
): void {
  const bowHeight = 84;
  const bowWidth = 8;
  const curve = 18;

  const topY = cy - bowHeight / 2;
  const bottomY = cy + bowHeight / 2;
  const midY = cy;

  g.moveTo(cx - bowWidth / 2, topY + curve)
    .quadraticCurveTo(cx, midY - curve / 2, cx - bowWidth / 2, bottomY - curve)
    .stroke({ color: COL_WOOD, width: 3 });

  g.moveTo(cx - bowWidth / 2, topY + curve)
    .quadraticCurveTo(cx, midY + curve / 2, cx - bowWidth / 2, bottomY - curve)
    .stroke({ color: COL_WOOD_DK, width: 1 });

  const pullBack = drawPercent * 12;
  const stringTopX = cx - bowWidth / 2;
  const stringBottomX = cx - bowWidth / 2;
  const stringMidX = cx - bowWidth / 2 - pullBack;

  g.moveTo(stringTopX, topY + curve + 2)
    .lineTo(stringMidX, midY)
    .lineTo(stringBottomX, bottomY - curve - 2)
    .stroke({ color: COL_STRING, width: 0.8 });

  if (drawPercent > 0.1) {
    const arrowStartX = cx - bowWidth / 2 - pullBack;
    g.moveTo(arrowStartX, midY)
      .lineTo(arrowStartX + 30, midY)
      .stroke({ color: COL_ARROW, width: 1.5 });
    g.moveTo(arrowStartX + 27, midY - 2)
      .lineTo(arrowStartX + 30, midY)
      .lineTo(arrowStartX + 27, midY + 2)
      .fill({ color: 0x444444 });
  }
}

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g, CX, GY);
  drawLegs(g, CX, GY - 10, 0, 0);
  drawTorso(g, CX, GY - 24);
  drawQuiver(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawLongbow(g, CX + 5, GY - 18, 0.3 + sin01(frame, 8) * 0.1);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const stance = Math.sin(cycle * Math.PI * 2) * 2;

  drawShadow(g, CX, GY);
  drawLegs(g, CX, GY - 10, -stance, stance);
  drawTorso(g, CX, GY - 24, stance * 0.3);
  drawQuiver(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawLongbow(g, CX + 5, GY - 18, 0.3);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  let drawPercent = 0;
  let aimTilt = 0;

  if (progress < 0.4) {
    drawPercent = progress / 0.4;
  } else if (progress < 0.6) {
    drawPercent = 1;
    aimTilt = ((progress - 0.4) / 0.2) * 2;
  } else {
    drawPercent = 1 - (progress - 0.6) / 0.4;
  }

  drawShadow(g, CX, GY);
  drawLegs(g, CX, GY - 10, -2, 0);
  drawTorso(g, CX, GY - 24, aimTilt);
  drawQuiver(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawLongbow(g, CX + 5, GY - 18, drawPercent);
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateIdleFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const rot = progress * 80;
  const fade = 1 - progress;

  g.alpha = fade;

  const rad = (rot * Math.PI) / 180;
  const offsetX = Math.sin(rad) * 8 * progress;
  const offsetY = progress * 15;

  drawShadow(g, CX, GY);
  g.setTransform(1, 0, 0, 1, offsetX, offsetY);
  drawLegs(g, CX, GY - 10, -2, 2);
  drawTorso(g, CX, GY - 24);
  drawQuiver(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawLongbow(g, CX + 5, GY - 18, 0);
}

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 7 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateLongbowmanFrames(
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
