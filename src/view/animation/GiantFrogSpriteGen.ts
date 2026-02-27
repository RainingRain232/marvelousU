// Procedural sprite generator for the Giant Frog unit type.
//
// Draws a giant frog creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Large green body
//   • Bulging eyes
//   • Large mouth
//   • Stubby legs
//   • Hopping animation

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0x4a8a4a;
const COL_SKIN_DK = 0x3a6a3a;
const COL_SKIN_LT = 0x6aaa6a;
const COL_BELLY = 0x9aba9a;
const COL_EYE = 0xffffff;
const COL_PUPIL = 0x111111;
const COL_TONGUE = 0xcc4444;
const COL_SHADOW = 0x000000;

function drawShadow(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx, cy + 2, 16, 4).fill({
    color: COL_SHADOW,
    alpha: 0.3,
  });
}

function generateIdleFrames(g: Graphics, frame: number): void {
  const breath = Math.sin((frame / 8) * Math.PI * 2) * 2;

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 10 + breath * 0.3, 18, 14 + breath)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 1 });

  g.ellipse(CX, GY - 6 + breath * 0.3, 12, 8 + breath * 0.5).fill({
    color: COL_BELLY,
  });

  g.ellipse(CX - 8, GY - 18 + breath * 0.2, 7, 6)
    .fill({ color: COL_SKIN_LT })
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
  g.ellipse(CX - 8, GY - 18 + breath * 0.2, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX - 8, GY - 18 + breath * 0.2, 1.5, 1.5).fill({
    color: COL_PUPIL,
  });

  g.ellipse(CX + 8, GY - 18 + breath * 0.2, 7, 6)
    .fill({ color: COL_SKIN_LT })
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
  g.ellipse(CX + 8, GY - 18 + breath * 0.2, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX + 8, GY - 18 + breath * 0.2, 1.5, 1.5).fill({
    color: COL_PUPIL,
  });

  g.ellipse(CX, GY - 4, 8, 3).fill({ color: 0x2a4a2a });

  g.ellipse(CX - 10, GY - 2, 4, 5).fill({ color: COL_SKIN_DK });
  g.ellipse(CX + 10, GY - 2, 4, 5).fill({ color: COL_SKIN_DK });
  g.ellipse(CX - 5, GY, 3, 4).fill({ color: COL_SKIN_DK });
  g.ellipse(CX + 5, GY, 3, 4).fill({ color: COL_SKIN_DK });
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const hop = Math.abs(Math.sin((frame / 8) * Math.PI * 2)) * 4;

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 10 - hop, 18, 14)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 1 });

  g.ellipse(CX, GY - 6 - hop, 12, 8).fill({ color: COL_BELLY });

  const legOffset = Math.sin((frame / 8) * Math.PI * 2) * 3;
  g.ellipse(CX - 12 - legOffset, GY - 4 - hop, 4, 6).fill({
    color: COL_SKIN_DK,
  });
  g.ellipse(CX + 12 + legOffset, GY - 4 - hop, 4, 6).fill({
    color: COL_SKIN_DK,
  });
  g.ellipse(CX - 6 - legOffset * 0.5, GY - 2 - hop, 3, 5).fill({
    color: COL_SKIN_DK,
  });
  g.ellipse(CX + 6 + legOffset * 0.5, GY - 2 - hop, 3, 5).fill({
    color: COL_SKIN_DK,
  });

  g.ellipse(CX - 8, GY - 18 - hop, 7, 6).fill({ color: COL_SKIN_LT });
  g.ellipse(CX - 8, GY - 18 - hop, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX - 8, GY - 18 - hop, 1.5, 1.5).fill({ color: COL_PUPIL });

  g.ellipse(CX + 8, GY - 18 - hop, 7, 6).fill({ color: COL_SKIN_LT });
  g.ellipse(CX + 8, GY - 18 - hop, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX + 8, GY - 18 - hop, 1.5, 1.5).fill({ color: COL_PUPIL });
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 5;
  let tongueExtend = 0;
  let mouthOpen = 0;

  if (progress < 0.3) {
    mouthOpen = progress / 0.3;
  } else if (progress < 0.5) {
    tongueExtend = (progress - 0.3) / 0.2;
    mouthOpen = 1;
  } else if (progress < 0.8) {
    tongueExtend = 1 - (progress - 0.5) / 0.3;
    mouthOpen = 1;
  } else {
    tongueExtend = 0;
    mouthOpen = 1 - (progress - 0.8) / 0.2;
  }

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 10, 18, 14)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 1 });

  g.ellipse(CX, GY - 6, 12, 8).fill({ color: COL_BELLY });

  g.ellipse(CX - 8, GY - 18, 7, 6).fill({ color: COL_SKIN_LT });
  g.ellipse(CX - 8, GY - 18, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX - 8, GY - 18, 1.5, 1.5).fill({ color: COL_PUPIL });

  g.ellipse(CX + 8, GY - 18, 7, 6).fill({ color: COL_SKIN_LT });
  g.ellipse(CX + 8, GY - 18, 3, 3).fill({ color: COL_EYE });
  g.ellipse(CX + 8, GY - 18, 1.5, 1.5).fill({ color: COL_PUPIL });

  const mouthW = 6 + mouthOpen * 4;
  const mouthH = 2 + mouthOpen * 4;
  g.ellipse(CX, GY - 4, mouthW, mouthH).fill({ color: 0x2a1a1a });

  if (tongueExtend > 0) {
    const tongueLen = tongueExtend * 15;
    g.rect(CX - 2, GY - 2, 4, tongueLen).fill({ color: COL_TONGUE });
    g.ellipse(CX, GY - 2 + tongueLen, 4, 3).fill({ color: 0xaa3333 });
  }

  g.ellipse(CX - 10, GY - 2, 4, 5).fill({ color: COL_SKIN_DK });
  g.ellipse(CX + 10, GY - 2, 4, 5).fill({ color: COL_SKIN_DK });
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateIdleFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;
  const squash = progress * 10;

  g.alpha = fade;

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 10 + squash, 18 + squash, 14 - squash * 0.5)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 1 });

  g.ellipse(CX - 8, GY - 18 + squash, 7, 6).fill({ color: COL_SKIN_LT });
  g.ellipse(CX + 8, GY - 18 + squash, 7, 6).fill({ color: COL_SKIN_LT });
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

export function generateGiantFrogFrames(
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
