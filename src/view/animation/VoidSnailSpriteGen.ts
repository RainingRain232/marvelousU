// Procedural sprite generator for the Void Snail unit type.
//
// Draws a void snail creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Large spiral shell (purple/void theme)
//   • Slime trail
//   • Eye stalks
//   • Slow crawling movement

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SHELL = 0x4a2a6a;
const COL_SHELL_DK = 0x3a1a5a;
const COL_SHELL_LT = 0x6a4a8a;
const COL_BODY = 0x6a5a7a;
const COL_BODY_DK = 0x4a4a5a;
const COL_EYE = 0xaa44aa;
const COL_PUPIL = 0x220022;
const COL_SLIME = 0x8aaa9a;
const COL_SHADOW = 0x000000;

function drawShadow(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx, cy + 2, 14, 3).fill({ color: COL_SHADOW, alpha: 0.3 });
}

function drawShell(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx, cy - 8, 16, 14)
    .fill({ color: COL_SHELL })
    .stroke({ color: COL_SHELL_DK, width: 1.5 });

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const rx = cx + Math.cos(angle) * 8;
    const ry = cy - 8 + Math.sin(angle) * 7;
    g.ellipse(rx, ry, 5, 4).fill({ color: COL_SHELL_LT });
  }

  g.ellipse(cx, cy - 8, 5, 4).fill({ color: COL_SHELL_DK });
  g.ellipse(cx, cy - 9, 2, 2).fill({ color: 0x2a1a4a });
}

function drawBody(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx - 10, cy, 14, 6)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 0.5 });
}

function drawEyeStalk(
  g: Graphics,
  cx: number,
  cy: number,
  offsetX: number,
  sway: number,
): void {
  const stalkX = cx - 10 + offsetX;
  const stalkY = cy - 8;

  g.rect(stalkX - 1, stalkY - 8 + sway * 0.5, 2, 10).fill({
    color: COL_BODY_DK,
  });

  g.ellipse(stalkX, stalkY - 10 + sway * 0.5, 4, 3).fill({ color: COL_EYE });
  g.ellipse(stalkX, stalkY - 10 + sway * 0.5, 2, 1.5).fill({
    color: COL_PUPIL,
  });
}

function generateIdleFrames(g: Graphics, frame: number): void {
  const sway = Math.sin((frame / 8) * Math.PI * 2) * 1;

  drawShadow(g, CX, GY);
  drawBody(g, CX, GY);
  drawShell(g, CX, GY);
  drawEyeStalk(g, CX, GY, -3, sway);
  drawEyeStalk(g, CX, GY, 3, -sway);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const crawl = Math.sin((frame / 8) * Math.PI * 2) * 2;
  const sway = Math.sin((frame / 8) * Math.PI * 2) * 1.5;

  drawShadow(g, CX, GY);

  if (frame % 16 < 8) {
    g.ellipse(CX - 8 + crawl, GY + 1, 16, 5).fill({ color: COL_SLIME });
  }

  drawBody(g, CX + crawl * 0.5, GY);
  drawShell(g, CX + crawl, GY);
  drawEyeStalk(g, CX + crawl * 0.5, GY, -3, sway);
  drawEyeStalk(g, CX + crawl * 0.5, GY, 3, -sway);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 5;
  let spit = 0;
  let mouthOpen = 0;

  if (progress < 0.3) {
    mouthOpen = progress / 0.3;
  } else if (progress < 0.5) {
    spit = (progress - 0.3) / 0.2;
  } else {
    spit = 1 - (progress - 0.5) / 0.5;
  }

  const sway = Math.sin((frame / 8) * Math.PI * 2) * 1;

  drawShadow(g, CX, GY);
  drawBody(g, CX, GY);
  drawShell(g, CX, GY);
  drawEyeStalk(g, CX, GY, -3, sway);
  drawEyeStalk(g, CX, GY, 3, -sway);

  const mouthY = GY - 2;
  if (mouthOpen > 0) {
    g.ellipse(CX - 18, mouthY, 3 + mouthOpen * 2, 2 + mouthOpen).fill({
      color: 0x3a2a4a,
    });
  }

  if (spit > 0) {
    const projX = CX - 20 - spit * 20;
    const projY = mouthY + Math.sin(spit * Math.PI) * 3;
    g.ellipse(projX, projY, 4, 3).fill({ color: 0x6a4a8a });
    g.ellipse(projX, projY, 2, 1.5).fill({ color: 0x4a2a6a });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateIdleFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;
  const collapse = progress * 8;

  g.alpha = fade;

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 8 + collapse, 16 - collapse, 14 - collapse * 0.5)
    .fill({ color: COL_SHELL })
    .stroke({ color: COL_SHELL_DK, width: 1 });

  g.ellipse(CX - 10, GY + collapse * 0.5, 14, 6 - collapse * 0.3).fill({
    color: COL_BODY,
  });
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

export function generateVoidSnailFrames(
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
