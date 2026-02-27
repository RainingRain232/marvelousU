// Procedural sprite generator for the Spider unit type.
//
// Draws a spider creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Dark body with purple highlights (void theme)
//   • 8 legs
//   • Fangs
//   • Walking animation

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_BODY = 0x2a1a2a;
const COL_BODY_DK = 0x1a0a1a;
const COL_BODY_LT = 0x4a3a4a;
const COL_LEG = 0x1a0a1a;
const COL_LEG_JOINT = 0x3a2a3a;
const COL_FANG = 0x6a5a6a;
const COL_EYE = 0xaa44aa;
const COL_PUPIL = 0x220022;
const COL_SHADOW = 0x000000;

function drawShadow(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx, cy + 2, 12, 3).fill({ color: COL_SHADOW, alpha: 0.4 });
}

function drawLeg(
  g: Graphics,
  cx: number,
  cy: number,
  side: number,
  phase: number,
): void {
  const legW = 14 * side;
  const bend1 = Math.sin(phase + side * 0.5) * 3;
  const bend2 = Math.sin(phase + side * 0.8) * 2;

  g.moveTo(cx, cy)
    .lineTo(cx + legW * 0.4, cy - 2 + bend1)
    .stroke({ color: COL_LEG, width: 2 });
  g.moveTo(cx + legW * 0.4, cy - 2 + bend1)
    .lineTo(cx + legW * 0.7, cy - 6 + bend2)
    .stroke({ color: COL_LEG_JOINT, width: 1.5 });
  g.moveTo(cx + legW * 0.7, cy - 6 + bend2)
    .lineTo(cx + legW, cy - 4 + bend1)
    .stroke({ color: COL_LEG, width: 1.5 });
}

function drawSpider(
  g: Graphics,
  cx: number,
  cy: number,
  legPhase: number,
): void {
  g.ellipse(cx, cy - 8, 10, 8)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 1 });

  g.ellipse(cx, cy - 6, 6, 4).fill({ color: COL_BODY_LT });

  g.ellipse(cx, cy - 12, 6, 5)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 0.5 });

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    g.ellipse(cx - 3, cy - 10 + yOff, 2, 1.5).fill({ color: COL_EYE });
    g.ellipse(cx - 3, cy - 10 + yOff, 1, 1).fill({ color: COL_PUPIL });
  }

  g.moveTo(cx - 3, cy - 8)
    .lineTo(cx - 8, cy - 4)
    .stroke({ color: COL_FANG, width: 1.5 });
  g.moveTo(cx + 3, cy - 8)
    .lineTo(cx + 8, cy - 4)
    .stroke({ color: COL_FANG, width: 1.5 });

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    drawLeg(g, cx + 8, cy - 10 + yOff, 1, legPhase + i * 0.5);
    drawLeg(g, cx - 8, cy - 10 + yOff, -1, legPhase + i * 0.5);
  }
}

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin((frame / 8) * Math.PI * 2) * 1;
  const legPhase = frame * 0.3;

  drawShadow(g, CX, GY);

  g.ellipse(CX, GY - 8 + breathe * 0.3, 10, 8)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 1 });
  g.ellipse(CX, GY - 6 + breathe * 0.3, 6, 4).fill({ color: COL_BODY_LT });
  g.ellipse(CX, GY - 12 + breathe * 0.3, 6, 5).fill({ color: COL_BODY });

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    g.ellipse(CX - 3, GY - 10 + yOff, 2, 1.5).fill({ color: COL_EYE });
    g.ellipse(CX - 3, GY - 10 + yOff, 1, 1).fill({ color: COL_PUPIL });
  }

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    drawLeg(g, CX + 8, GY - 10 + yOff + breathe * 0.2, 1, legPhase + i * 0.5);
    drawLeg(g, CX - 8, GY - 10 + yOff + breathe * 0.2, -1, legPhase + i * 0.5);
  }
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const legPhase = frame * 1.5;
  const bodyBob = Math.abs(Math.sin((frame / 8) * Math.PI * 2)) * 2;

  drawShadow(g, CX, GY);
  drawSpider(g, CX, GY - bodyBob, legPhase);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 5;
  let lunge = 0;
  let fangs = 0;

  if (progress < 0.4) {
    lunge = (progress / 0.4) * 6;
    fangs = progress / 0.4;
  } else if (progress < 0.6) {
    lunge = 6 - ((progress - 0.4) / 0.2) * 6;
    fangs = 1;
  } else {
    lunge = 0;
    fangs = 1 - (progress - 0.6) / 0.4;
  }

  const legPhase = frame * 0.5;

  drawShadow(g, CX, GY);

  const attackCX = CX - lunge;

  g.ellipse(attackCX, GY - 8, 10, 8)
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 1 });
  g.ellipse(attackCX, GY - 6, 6, 4).fill({ color: COL_BODY_LT });
  g.ellipse(attackCX, GY - 12, 6, 5).fill({ color: COL_BODY });

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    g.ellipse(attackCX - 3, GY - 10 + yOff, 2, 1.5).fill({ color: COL_EYE });
    g.ellipse(attackCX - 3, GY - 10 + yOff, 1, 1).fill({ color: COL_PUPIL });
  }

  const fangLen = 4 + fangs * 6;
  g.moveTo(attackCX - 3, GY - 8)
    .lineTo(attackCX - 8 - fangLen, GY - 4 - fangLen * 0.3)
    .stroke({ color: COL_FANG, width: 2 });
  g.moveTo(attackCX + 3, GY - 8)
    .lineTo(attackCX + 8 + fangLen, GY - 4 - fangLen * 0.3)
    .stroke({ color: COL_FANG, width: 2 });

  for (let i = 0; i < 4; i++) {
    const yOff = (i - 1.5) * 3;
    drawLeg(g, attackCX + 8, GY - 10 + yOff, 1, legPhase + i * 0.5);
    drawLeg(g, attackCX - 8, GY - 10 + yOff, -1, legPhase + i * 0.5);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateIdleFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress;
  const legsGone = progress * 8;

  g.alpha = fade;

  drawShadow(g, CX, GY);

  g.ellipse(
    CX,
    GY - 8 + legsGone * 0.3,
    10 - legsGone * 0.3,
    8 - legsGone * 0.2,
  )
    .fill({ color: COL_BODY })
    .stroke({ color: COL_BODY_DK, width: 1 });

  g.ellipse(CX, GY - 6 + legsGone * 0.3, 6, 4).fill({ color: COL_BODY_LT });
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

export function generateSpiderFrames(
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
