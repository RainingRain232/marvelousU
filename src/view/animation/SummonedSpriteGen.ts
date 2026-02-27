// Procedural sprite generator for the Summoned unit type.
//
// Draws an ethereal ghostly warrior at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 8, DIE 7).
//
// Visual features:
//   • Ghostly ethereal appearance
//   • Glowing runes/tattoos
//   • Semi-transparent flowing robes
//   • Floating effect
//   • Glowing eyes
//   • Dissolve particles on death

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_ETH_REAL = 0x9988ff;
const COL_ETH_LT = 0xbb99ff;
const COL_ETH_GLOW = 0xddbbff;

const COL_ROBE = 0x4433aa;
const COL_ROBE_DK = 0x332277;
const COL_ROBE_LT = 0x5544bb;

const COL_RUNE = 0x44ffaa;
const COL_RUNE_GLOW = 0x88ffcc;

const COL_EYE = 0xffffff;
const COL_EYE_PUPIL = 0x222244;

const COL_SHADOW = 0x000000;

export function generateSummonedFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createSummonedFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createSummonedFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleSummoned(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingSummoned(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingSummoned(g, column);
      break;
    case UnitState.CAST:
      drawCastingSummoned(g, column);
      break;
    case UnitState.DIE:
      drawDyingSummoned(g, column);
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

function drawIdleSummoned(g: Graphics, frame: number): void {
  const float = Math.sin(frame * 0.3) * 1.5;
  const glowPulse = (Math.sin(frame * 0.4) + 1) * 0.5;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 10, 3);

  for (let i = 0; i < 3; i++) {
    const alpha = 0.1 + glowPulse * 0.1;
    g.fill({ color: COL_ETH_GLOW, alpha });
    g.circle(CX, GY - 20 + float - i * 5, 8 - i * 1.5);
  }

  g.fill({ color: COL_ROBE_DK, alpha: 0.7 });
  g.moveTo(CX - 10, GY - 5);
  g.lineTo(CX - 12, GY + 2);
  g.lineTo(CX + 12, GY + 2);
  g.lineTo(CX + 10, GY - 5);
  g.closePath();

  g.fill({ color: COL_ROBE, alpha: 0.7 });
  g.moveTo(CX - 8, GY - 15 + float);
  g.lineTo(CX - 10, GY - 5);
  g.lineTo(CX + 10, GY - 5);
  g.lineTo(CX + 8, GY - 15 + float);
  g.closePath();

  g.fill({ color: COL_ROBE_LT, alpha: 0.6 });
  g.rect(CX - 6, GY - 12 + float, 12, 8);

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 4, GY - 28 + float, 8, 14);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 3, GY - 26 + float, 6, 10);

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 6, GY - 34 + float, 5, 8);
  g.rect(CX + 1, GY - 34 + float, 5, 8);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 5, GY - 32 + float, 3, 6);
  g.rect(CX + 2, GY - 32 + float, 3, 6);

  const runeColor = glowPulse > 0.6 ? COL_RUNE_GLOW : COL_RUNE;
  g.fill({ color: runeColor, alpha: 0.8 + glowPulse * 0.2 });
  g.circle(CX - 4, GY - 24 + float, 1.5);
  g.circle(CX + 4, GY - 24 + float, 1.5);

  g.fill({ color: COL_EYE, alpha: 0.9 });
  g.circle(CX - 3, GY - 36 + float, 2);
  g.circle(CX + 3, GY - 36 + float, 2);

  g.fill({ color: COL_EYE_PUPIL, alpha: 0.9 });
  g.circle(CX - 2.5, GY - 36 + float, 1);
  g.circle(CX + 3.5, GY - 36 + float, 1);

  if (glowPulse > 0.5) {
    g.fill({ color: COL_ETH_GLOW, alpha: 0.4 });
    g.circle(CX - 3, GY - 36 + float, 3);
    g.circle(CX + 3, GY - 36 + float, 3);
  }

  for (let i = 0; i < 4; i++) {
    g.fill({ color: COL_ETH_GLOW, alpha: 0.2 + glowPulse * 0.2 });
    g.circle(
      CX + Math.sin(frame * 0.2 + i) * 8,
      GY - 20 + float + Math.cos(frame * 0.2 + i) * 3,
      1 + i * 0.5,
    );
  }
}

function drawWalkingSummoned(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 2;
  const flow = Math.sin(walkCycle * Math.PI * 2) * 3;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 10, 3);

  g.fill({ color: COL_ROBE_DK, alpha: 0.7 });
  g.moveTo(CX - 10, GY - 5 + bob);
  g.lineTo(CX - 12 - flow * 0.5, GY + 2);
  g.lineTo(CX + 12 + flow * 0.5, GY + 2);
  g.lineTo(CX + 10, GY - 5 + bob);
  g.closePath();

  g.fill({ color: COL_ROBE, alpha: 0.7 });
  g.moveTo(CX - 8, GY - 15 + bob);
  g.lineTo(CX - 10, GY - 5 + bob);
  g.lineTo(CX + 10, GY - 5 + bob);
  g.lineTo(CX + 8, GY - 15 + bob);
  g.closePath();

  g.fill({ color: COL_ROBE_LT, alpha: 0.6 });
  g.rect(CX - 6, GY - 12 + bob, 12, 8);

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 4, GY - 28 + bob, 8, 14);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 3, GY - 26 + bob, 6, 10);

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 6, GY - 34 + bob, 5, 8);
  g.rect(CX + 1, GY - 34 + bob, 5, 8);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 5, GY - 32 + bob, 3, 6);
  g.rect(CX + 2, GY - 32 + bob, 3, 6);

  g.fill({ color: COL_RUNE });
  g.circle(CX - 4, GY - 24 + bob, 1.5);
  g.circle(CX + 4, GY - 24 + bob, 1.5);

  g.fill({ color: COL_EYE, alpha: 0.9 });
  g.circle(CX - 3, GY - 36 + bob, 2);
  g.circle(CX + 3, GY - 36 + bob, 2);

  g.fill({ color: COL_EYE_PUPIL, alpha: 0.9 });
  g.circle(CX - 2.5, GY - 36 + bob, 1);
  g.circle(CX + 3.5, GY - 36 + bob, 1);

  for (let i = 0; i < 4; i++) {
    g.fill({ color: COL_ETH_GLOW, alpha: 0.3 });
    g.circle(
      CX + Math.sin(frame * 0.3 + i) * 6,
      GY - 18 + bob + i * 2,
      1 + i * 0.5,
    );
  }
}

function drawAttackingSummoned(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 4;
  const slash = attackProgress * 8;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 10, 3);

  g.fill({ color: COL_ROBE_DK, alpha: 0.7 });
  g.moveTo(CX - 10, GY - 5 + lunge);
  g.lineTo(CX - 12, GY + 2);
  g.lineTo(CX + 12, GY + 2);
  g.lineTo(CX + 10, GY - 5 + lunge);
  g.closePath();

  g.fill({ color: COL_ROBE, alpha: 0.7 });
  g.moveTo(CX - 8, GY - 15 + lunge);
  g.lineTo(CX - 10, GY - 5 + lunge);
  g.lineTo(CX + 10, GY - 5 + lunge);
  g.lineTo(CX + 8, GY - 15 + lunge);
  g.closePath();

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 4, GY - 28 + lunge, 8, 14);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 3, GY - 26 + lunge, 6, 10);

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 6 - slash * 0.3, GY - 34 + lunge, 5, 8);
  g.rect(CX + 1 + slash * 0.3, GY - 34 + lunge, 5, 8);

  g.fill({ color: COL_RUNE_GLOW, alpha: 0.9 });
  g.circle(CX - 4, GY - 24 + lunge, 2);
  g.circle(CX + 4, GY - 24 + lunge, 2);

  g.fill({ color: COL_EYE, alpha: 0.9 });
  g.circle(CX - 3, GY - 36 + lunge, 2);
  g.circle(CX + 3, GY - 36 + lunge, 2);

  g.fill({ color: COL_EYE_PUPIL, alpha: 0.9 });
  g.circle(CX - 2, GY - 36 + lunge, 1);
  g.circle(CX + 4, GY - 36 + lunge, 1);

  for (let i = 0; i < 5; i++) {
    g.fill({ color: COL_ETH_GLOW, alpha: 0.6 });
    g.circle(CX - 10 - i * 3, GY - 25 + lunge + i * 2, 2 - i * 0.3);
    g.circle(CX + 10 + i * 3, GY - 25 + lunge + i * 2, 2 - i * 0.3);
  }
}

function drawCastingSummoned(g: Graphics, frame: number): void {
  const castProgress = frame / 7;
  const raise = castProgress * 5;
  const pulse = (Math.sin(frame * 0.5) + 1) * 0.5;

  g.fill({ color: COL_SHADOW, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 10, 3);

  for (let i = 0; i < 6; i++) {
    const angle = frame * 0.2 + i * 1.0;
    const dist = 6 + castProgress * 15 + i * 3;
    const alpha = (1 - i * 0.15) * (0.3 + pulse * 0.3);
    g.fill({ color: COL_RUNE_GLOW, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 20 + Math.sin(angle) * dist * 0.5 - raise,
      3 - i * 0.3,
    );
  }

  g.fill({ color: COL_ROBE_DK, alpha: 0.7 });
  g.moveTo(CX - 10, GY - 5);
  g.lineTo(CX - 12, GY + 2);
  g.lineTo(CX + 12, GY + 2);
  g.lineTo(CX + 10, GY - 5);
  g.closePath();

  g.fill({ color: COL_ROBE, alpha: 0.7 });
  g.moveTo(CX - 8, GY - 15 - raise);
  g.lineTo(CX - 10, GY - 5);
  g.lineTo(CX + 10, GY - 5);
  g.lineTo(CX + 8, GY - 15 - raise);
  g.closePath();

  g.fill({ color: COL_ETH_REAL, alpha: 0.7 });
  g.rect(CX - 4, GY - 28 - raise, 8, 14);

  g.fill({ color: COL_ETH_LT, alpha: 0.8 });
  g.rect(CX - 3, GY - 26 - raise, 6, 10);

  g.fill({ color: COL_RUNE_GLOW, alpha: 0.9 });
  g.circle(CX - 4, GY - 24 - raise, 2.5);
  g.circle(CX + 4, GY - 24 - raise, 2.5);

  g.fill({ color: COL_EYE, alpha: 0.9 });
  g.circle(CX - 3, GY - 36 - raise, 2.5);
  g.circle(CX + 3, GY - 36 - raise, 2.5);

  g.fill({ color: COL_EYE_PUPIL, alpha: 0.9 });
  g.circle(CX - 2, GY - 36 - raise, 1.2);
  g.circle(CX + 4, GY - 36 - raise, 1.2);

  g.fill({ color: COL_ETH_GLOW, alpha: 0.4 + pulse * 0.3 });
  g.circle(CX, GY - 30 - raise, 8 + pulse * 6);
}

function drawDyingSummoned(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fade = 0.7 - deathProgress * 0.7;
  const dissolve = deathProgress * 15;

  g.fill({ color: COL_SHADOW, alpha: 0.3 * fade });
  g.ellipse(CX, GY + 2, 10 - deathProgress * 4, 3 - deathProgress);

  g.fill({ color: COL_ROBE_DK, alpha: fade * 0.7 });
  g.moveTo(CX - 10, GY - 5 + dissolve);
  g.lineTo(CX - 12, GY + 2);
  g.lineTo(CX + 12, GY + 2);
  g.lineTo(CX + 10, GY - 5 + dissolve);
  g.closePath();

  g.fill({ color: COL_ROBE, alpha: fade * 0.7 });
  g.moveTo(CX - 8, GY - 15 + dissolve);
  g.lineTo(CX - 10, GY - 5 + dissolve);
  g.lineTo(CX + 10, GY - 5 + dissolve);
  g.lineTo(CX + 8, GY - 15 + dissolve);
  g.closePath();

  g.fill({ color: COL_ETH_REAL, alpha: fade * 0.7 });
  g.rect(CX - 4, GY - 28 + dissolve, 8, 14);

  g.fill({ color: COL_RUNE, alpha: fade * 0.8 });
  g.circle(CX - 4, GY - 24 + dissolve, 1.5);
  g.circle(CX + 4, GY - 24 + dissolve, 1.5);

  if (deathProgress < 0.5) {
    g.fill({ color: COL_EYE, alpha: fade * 0.9 });
    g.circle(CX - 3, GY - 36 + dissolve, 2);
    g.circle(CX + 3, GY - 36 + dissolve, 2);
  } else {
    g.fill({ color: 0x444444, alpha: fade * 0.5 });
    g.circle(CX - 3, GY - 36 + dissolve, 1);
    g.circle(CX + 3, GY - 36 + dissolve, 1);
  }

  for (let i = 0; i < 8; i++) {
    const alpha = (1 - deathProgress) * 0.5;
    g.fill({ color: COL_ETH_GLOW, alpha });
    g.circle(
      CX + Math.random() * 20 - 10,
      GY - 30 + dissolve - Math.random() * 30,
      2 + Math.random() * 2,
    );
  }

  for (let i = 0; i < 6; i++) {
    const alpha = (1 - deathProgress) * 0.4;
    g.fill({ color: COL_RUNE_GLOW, alpha });
    g.circle(
      CX + Math.sin(frame + i * 2) * 10,
      GY - 20 + dissolve - i * 5 - Math.random() * 5,
      1.5 + Math.random(),
    );
  }
}
