// Procedural sprite generator for the Crossbowman unit type.
//
// Draws a crossbowman archer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Chain mail armor (grey/silver)
//   • Crossbow with mechanical spanning mechanism
//   • Bolt loaded in the crossbow
//   • Walking / attack poses

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xd4a574;
const COL_CHAIN = 0x888888;
const COL_CHAIN_DK = 0x666666;
const COL_CHAIN_LT = 0xaaaaaa;
const COL_LEATHER = 0x5d3a1a;
const COL_LEATHER_DK = 0x3d2610;
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4b3020;
const COL_BOLT = 0xbbbbbb;
const COL_BOOT = 0x3d2610;
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

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  g.roundRect(cx - 6 + stanceL, gy - 4, 4, 4, 1).fill({ color: COL_BOOT });
  g.roundRect(cx + 2 + stanceR, gy - 4, 4, 4, 1).fill({ color: COL_BOOT });
}

function drawChainmail(g: Graphics, cx: number, cy: number): void {
  g.rect(cx - 6, cy - 8, 12, 10).fill({ color: COL_CHAIN });
  g.rect(cx - 5, cy - 7, 10, 8).fill({ color: COL_CHAIN_LT });

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      g.circle(cx - 4 + i * 3, cy - 6 + j * 3, 1).fill({ color: COL_CHAIN_DK });
    }
  }

  g.rect(cx - 6, cy + 2, 12, 4).fill({ color: COL_CHAIN_DK });
}

function drawHead(g: Graphics, cx: number, y: number): void {
  g.circle(cx, y, 4.5).fill({ color: COL_SKIN });
  g.circle(cx, y - 1, 5).fill({ color: COL_LEATHER });
  g.circle(cx, y - 2, 4).fill({ color: COL_LEATHER_DK });
  g.circle(cx - 1.5, y - 0.5, 0.8).fill({ color: 0x2a1a0a });
}

function drawCrossbow(
  g: Graphics,
  cx: number,
  cy: number,
  spanPercent: number,
): void {
  const stockLen = 20;
  const bowHeight = 22;

  g.rect(cx - 2, cy - 3, stockLen, 6)
    .fill({ color: COL_WOOD })
    .stroke({ color: COL_WOOD_DK, width: 0.5 });

  g.rect(cx + stockLen - 2, cy - 4, 4, 8).fill({ color: COL_WOOD_DK });

  const spanBack = spanPercent * 10;

  g.moveTo(cx + 4, cy - bowHeight / 2)
    .lineTo(cx + 4 - spanBack, cy - bowHeight / 2 - 4)
    .stroke({ color: COL_WOOD, width: 3 });
  g.moveTo(cx + 4, cy + bowHeight / 2)
    .lineTo(cx + 4 - spanBack, cy + bowHeight / 2 + 4)
    .stroke({ color: COL_WOOD, width: 3 });

  g.moveTo(cx + 4 - spanBack, cy - bowHeight / 2 - 4)
    .lineTo(cx + 4 - spanBack, cy + bowHeight / 2 + 4)
    .stroke({ color: COL_CHAIN, width: 1.5 });

  if (spanPercent > 0.1) {
    const boltX = cx + 6;
    g.moveTo(boltX - spanBack, cy)
      .lineTo(boltX + 12 - spanBack, cy)
      .stroke({ color: COL_BOLT, width: 1.5 });
    g.moveTo(boltX + 10 - spanBack, cy - 2)
      .lineTo(boltX + 14 - spanBack, cy)
      .lineTo(boltX + 10 - spanBack, cy + 2)
      .fill({ color: 0x444444 });
  }

  g.circle(cx + 6, cy, 3).fill({ color: COL_LEATHER });
  g.rect(cx + 3, cy + 3, 6, 2).fill({ color: COL_LEATHER_DK });
}

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, GY - 10, 0, 0);
  drawChainmail(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawCrossbow(g, CX + 6, GY - 16, 0.3 + sin01(frame, 8) * 0.1);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const stance = Math.sin(cycle * Math.PI * 2) * 2;

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, -stance, stance);
  drawLegs(g, CX, GY - 10, -stance, stance);
  drawChainmail(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawCrossbow(g, CX + 6, GY - 16, 0.3);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  let spanPercent = 0;

  if (progress < 0.4) {
    spanPercent = progress / 0.4;
  } else if (progress < 0.6) {
    spanPercent = 1;
  } else {
    spanPercent = 1 - (progress - 0.6) / 0.4;
  }

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, -2, 0);
  drawLegs(g, CX, GY - 10, -2, 0);
  drawChainmail(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawCrossbow(g, CX + 6, GY - 16, spanPercent);
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
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, GY - 10, -2, 2);
  drawChainmail(g, CX, GY - 18);
  drawHead(g, CX, GY - 30);
  drawCrossbow(g, CX + 6, GY - 16, 0);
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

export function generateCrossbowmanFrames(
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
