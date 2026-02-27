// Procedural sprite generator for the Devourer unit type.
//
// Draws a spectral beast creature at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Glowing ethereal body (ghostly theme)
//   • Spectral wisps/appendages
//   • Glowing eyes
//   • Floating movement
//   • Ethereal attack with energy beams

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_BODY = 0x4a2a6a;
const COL_BODY_GLOW = 0x8a4aaa;
const COL_BODY_DK = 0x2a1a4a;
const COL_WISP = 0xaa6aaa;
const COL_EYE = 0xffffff;
const COL_PUPIL = 0xaa44aa;
const COL_ENERGY = 0xcc88ff;
const COL_SHADOW = 0x000000;

function drawShadow(g: Graphics, cx: number, cy: number): void {
  g.ellipse(cx, cy + 2, 12, 3).fill({ color: COL_SHADOW, alpha: 0.15 });
}

function drawSpectralBody(
  g: Graphics,
  cx: number,
  cy: number,
  float: number,
): void {
  const glowIntensity = 0.3 + float * 0.1;

  g.ellipse(cx, cy - 10, 14, 12).fill({ color: COL_BODY, alpha: 0.6 });
  g.ellipse(cx, cy - 10, 12, 10).fill({
    color: COL_BODY_GLOW,
    alpha: glowIntensity,
  });

  for (let i = 0; i < 5; i++) {
    const wispAngle = (i / 5) * Math.PI * 2 + float * 0.5;
    const wispDist = 8 + Math.sin(float * 2 + i) * 3;
    const wx = cx + Math.cos(wispAngle) * wispDist;
    const wy = cy - 10 + Math.sin(wispAngle) * 8;
    g.ellipse(
      wx,
      wy,
      3 + Math.sin(float + i) * 1,
      4 + Math.sin(float + i) * 1,
    ).fill({ color: COL_WISP, alpha: 0.4 });
  }

  g.ellipse(cx, cy - 6, 8, 6).fill({ color: COL_BODY_DK, alpha: 0.5 });

  g.ellipse(cx - 4, cy - 14 + float, 3, 4).fill({ color: COL_EYE, alpha: 0.8 });
  g.ellipse(cx - 4, cy - 14 + float, 1.5, 2).fill({ color: COL_PUPIL });

  g.ellipse(cx + 4, cy - 14 + float, 3, 4).fill({ color: COL_EYE, alpha: 0.8 });
  g.ellipse(cx + 4, cy - 14 + float, 1.5, 2).fill({ color: COL_PUPIL });
}

function drawSpectralTail(
  g: Graphics,
  cx: number,
  cy: number,
  wave: number,
): void {
  for (let i = 0; i < 4; i++) {
    const segmentY = cy - 4 + i * 6;
    const segmentX = cx - 10 + Math.sin(wave + i * 0.8) * (4 + i * 2);
    const alpha = 0.5 - i * 0.1;
    g.ellipse(segmentX, segmentY, 4 - i * 0.5, 3 - i * 0.3).fill({
      color: COL_WISP,
      alpha: alpha,
    });
  }
}

function generateIdleFrames(g: Graphics, frame: number): void {
  const float = Math.sin((frame / 8) * Math.PI * 2) * 2;
  const wave = frame * 0.5;

  drawShadow(g, CX, GY);
  drawSpectralBody(g, CX, GY - float, float / 4);
  drawSpectralTail(g, CX, GY, wave);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const float = Math.abs(Math.sin((frame / 8) * Math.PI * 2)) * 3;
  const wave = frame * 1.5;
  const bob = Math.sin((frame / 8) * Math.PI * 2) * 2;

  drawShadow(g, CX, GY);

  const spectralY = GY - float - bob;
  drawSpectralBody(g, CX, spectralY, float / 4 + 0.2);
  drawSpectralTail(g, CX, spectralY, wave);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const progress = frame / 5;
  let energy = 0;
  let float = Math.sin((frame / 8) * Math.PI * 2) * 2;
  const wave = frame * 0.5;

  if (progress < 0.3) {
    energy = progress / 0.3;
  } else if (progress < 0.6) {
    energy = 1;
  } else {
    energy = 1 - (progress - 0.6) / 0.4;
  }

  drawShadow(g, CX, GY);
  drawSpectralBody(g, CX, GY - float, float / 4 + energy * 0.3);
  drawSpectralTail(g, CX, GY, wave);

  if (energy > 0) {
    const beamStart = CX + 12;
    const beamEnd = CX + 35 + energy * 10;
    const beamWobble = Math.sin(frame * 3) * 2;

    for (let i = 0; i < 3; i++) {
      const beamY = GY - 10 + i * 8 + beamWobble * 0.5;
      g.moveTo(beamStart, beamY)
        .lineTo(beamEnd, beamY + beamWobble)
        .stroke({
          color: COL_ENERGY,
          width: 4 - i,
          alpha: energy * (0.8 - i * 0.2),
        });
    }

    const orbX = beamEnd;
    const orbY = GY - 10 + beamWobble;
    g.ellipse(orbX, orbY, 5 + energy * 2, 4 + energy * 1.5).fill({
      color: COL_ENERGY,
      alpha: energy * 0.8,
    });
    g.ellipse(orbX, orbY, 3, 2).fill({ color: 0xffffff, alpha: energy });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const float = Math.sin((frame / 8) * Math.PI * 2) * 2;
  const wave = frame * 0.8;

  drawShadow(g, CX, GY);

  const spectralY = GY - float - 3;
  drawSpectralBody(g, CX, spectralY, float / 4 + 0.3);
  drawSpectralTail(g, CX, spectralY, wave);

  if (frame % 16 < 8) {
    const orbX = CX + 15;
    const orbY = GY - 10 + Math.sin(frame * 2) * 3;
    g.ellipse(orbX, orbY, 6, 5).fill({ color: COL_ENERGY, alpha: 0.6 });
    g.ellipse(orbX, orbY, 3, 2).fill({ color: 0xffffff, alpha: 0.5 });
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;
  const fade = 1 - progress * 0.8;
  const dissolve = progress * 15;
  const wave = frame * 0.5;

  g.alpha = fade;

  drawShadow(g, CX, GY);

  const spectralY = GY + dissolve;
  drawSpectralBody(g, CX, spectralY, 0);
  drawSpectralTail(g, CX, spectralY, wave);

  for (let i = 0; i < 5; i++) {
    const particleX = CX + Math.sin(progress * 5 + i) * dissolve * 0.5;
    const particleY = GY - 10 - dissolve * 0.3 + i * 5;
    g.ellipse(particleX, particleY, 3 - progress * 2, 2 - progress).fill({
      color: COL_WISP,
      alpha: fade * 0.5,
    });
  }
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

export function generateDevourerFrames(
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
