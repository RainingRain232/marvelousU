// Procedural sprite generator for the Golem/Summoner unit type.
//
// Draws a medieval fantasy golem at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 8, DIE 7).
//
// Visual features:
//   • Rocky/earth golem body
//   • Cracks in stone
//   • Glowing runes/magic symbols
//   • Heavy fists
//   • Sturdy stone feet
//   • Magical aura when casting

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_STONE = 0x6b5b4b;
const COL_STONE_DK = 0x4b3b2b;
const COL_STONE_LT = 0x8b7b6b;

const COL_CRACK = 0x3b2b1b;

const COL_RUNE = 0x44aaff;
const COL_RUNE_GLOW = 0x88ccff;

const COL_EYE = 0xffaa00;
const COL_EYE_GLOW = 0xffdd55;

const COL_FOOT_DK = 0x3b2b1b;

const COL_MAGIC = 0x8844ff;
const COL_MAGIC_LT = 0xaa88ff;

const COL_SHADOW = 0x000000;

export function generateGolemFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createGolemFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createGolemFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleGolem(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingGolem(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingGolem(g, column);
      break;
    case UnitState.CAST:
      drawCastingGolem(g, column);
      break;
    case UnitState.DIE:
      drawDyingGolem(g, column);
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

function drawIdleGolem(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.25) * 1;
  const runeGlow = (Math.sin(frame * 0.4) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  g.fill({ color: COL_FOOT_DK });
  g.ellipse(CX - 8, GY, 6, 4);
  g.ellipse(CX + 8, GY, 6, 4);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 10, GY - 8, 20, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 10, GY - 25 + breathe, 20, 20);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8, GY - 23 + breathe, 16, 16);

  g.stroke({ width: 1, color: COL_CRACK });
  g.moveTo(CX - 5, GY - 20 + breathe);
  g.lineTo(CX - 3, GY - 15 + breathe);
  g.moveTo(CX + 4, GY - 22 + breathe);
  g.lineTo(CX + 6, GY - 18 + breathe);
  g.stroke();

  const runeColor = runeGlow > 0.7 ? COL_RUNE_GLOW : COL_RUNE;
  g.fill({ color: runeColor });
  g.rect(CX - 4, GY - 15 + breathe, 3, 3);
  g.rect(CX + 1, GY - 15 + breathe, 3, 3);
  g.rect(CX - 1.5, GY - 18 + breathe, 3, 3);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 12, GY - 20 + breathe, 4, 12);
  g.rect(CX + 8, GY - 20 + breathe, 4, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 12, GY - 22 + breathe, 4, 8);
  g.rect(CX + 8, GY - 22 + breathe, 4, 8);

  g.fill({ color: COL_STONE });
  g.rect(CX - 9, GY - 32 + breathe, 8, 10);
  g.rect(CX + 1, GY - 32 + breathe, 8, 10);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8, GY - 31 + breathe, 6, 8);
  g.rect(CX + 2, GY - 31 + breathe, 6, 8);

  g.fill({ color: COL_STONE });
  g.rect(CX - 7, GY - 38 + breathe, 14, 8);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 5, GY - 37 + breathe, 10, 6);

  g.fill({ color: COL_EYE });
  g.rect(CX - 4, GY - 35 + breathe, 3, 3);
  g.rect(CX + 1, GY - 35 + breathe, 3, 3);

  if (runeGlow > 0.5) {
    g.fill({ color: COL_EYE_GLOW });
    g.circle(CX - 2.5, GY - 33.5 + breathe, 1);
    g.circle(CX + 2.5, GY - 33.5 + breathe, 1);
  }

  g.fill({ color: COL_CRACK });
  g.moveTo(CX, GY - 36 + breathe);
  g.lineTo(CX - 1, GY - 33 + breathe);
  g.lineTo(CX + 1, GY - 31 + breathe);
}

function drawWalkingGolem(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  g.fill({ color: COL_FOOT_DK });
  g.ellipse(CX - 8 - legSwing * 0.5, GY + Math.abs(legSwing) * 0.3, 6, 4);
  g.ellipse(CX + 8 + legSwing * 0.5, GY + Math.abs(legSwing) * 0.3, 6, 4);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 10, GY - 8 + bob, 20, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 10, GY - 25 + bob, 20, 20);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8, GY - 23 + bob, 16, 16);

  g.stroke({ width: 1, color: COL_CRACK });
  g.moveTo(CX - 5, GY - 20 + bob);
  g.lineTo(CX - 3, GY - 15 + bob);
  g.stroke();

  g.fill({ color: COL_RUNE });
  g.rect(CX - 4, GY - 15 + bob, 3, 3);
  g.rect(CX + 1, GY - 15 + bob, 3, 3);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 12, GY - 20 + bob + legSwing * 0.3, 4, 12);
  g.rect(CX + 8, GY - 20 + bob - legSwing * 0.3, 4, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 12, GY - 22 + bob + legSwing * 0.3, 4, 8);
  g.rect(CX + 8, GY - 22 + bob - legSwing * 0.3, 4, 8);

  g.fill({ color: COL_STONE });
  g.rect(CX - 9, GY - 32 + bob, 8, 10);
  g.rect(CX + 1, GY - 32 + bob, 8, 10);

  g.fill({ color: COL_STONE });
  g.rect(CX - 7, GY - 38 + bob, 14, 8);

  g.fill({ color: COL_EYE });
  g.rect(CX - 4, GY - 35 + bob, 3, 3);
  g.rect(CX + 1, GY - 35 + bob, 3, 3);
}

function drawAttackingGolem(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 5;
  const armSwing = attackProgress * 12;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  g.fill({ color: COL_FOOT_DK });
  g.ellipse(CX - 8, GY, 6, 4);
  g.ellipse(CX + 8, GY, 6, 4);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 10, GY - 8 + lunge * 0.3, 20, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 10, GY - 25 + lunge * 0.3, 20, 20);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8, GY - 23 + lunge * 0.3, 16, 16);

  g.fill({ color: COL_RUNE });
  g.rect(CX - 4, GY - 15 + lunge * 0.3, 3, 3);
  g.rect(CX + 1, GY - 15 + lunge * 0.3, 3, 3);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 14, GY - 20 + lunge * 0.3 + armSwing * 0.5, 5, 14);
  g.rect(CX + 9, GY - 20 + lunge * 0.3 - armSwing * 0.5, 5, 14);

  g.fill({ color: COL_STONE });
  g.rect(CX - 14, GY - 22 + lunge * 0.3 + armSwing * 0.5, 5, 10);
  g.rect(CX + 9, GY - 22 + lunge * 0.3 - armSwing * 0.5, 5, 10);

  g.fill({ color: COL_STONE });
  g.rect(CX - 9, GY - 32 + lunge * 0.3, 8, 10);
  g.rect(CX + 1, GY - 32 + lunge * 0.3, 8, 10);

  g.fill({ color: COL_STONE });
  g.rect(CX - 7, GY - 38 + lunge * 0.3, 14, 8);

  g.fill({ color: COL_EYE });
  g.rect(CX - 4, GY - 35 + lunge * 0.3, 3, 3);
  g.rect(CX + 1, GY - 35 + lunge * 0.3, 3, 3);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: COL_MAGIC_LT });
    g.circle(
      CX - 12 - i * 4,
      GY - 15 + lunge * 0.3 + armSwing * 0.5 - i * 3,
      2,
    );
    g.circle(
      CX + 12 + i * 4,
      GY - 15 + lunge * 0.3 - armSwing * 0.5 - i * 3,
      2,
    );
  }
}

function drawCastingGolem(g: Graphics, frame: number): void {
  const castProgress = frame / 7;
  const raise = castProgress * 6;
  const runePulse = (Math.sin(frame * 0.5) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14, 4);

  g.fill({ color: COL_FOOT_DK });
  g.ellipse(CX - 8, GY, 6, 4);
  g.ellipse(CX + 8, GY, 6, 4);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.3 + i * 1.2;
    const dist = 8 + castProgress * 12 + i * 4;
    const alpha = 1 - i * 0.2;
    g.fill({ color: COL_MAGIC, alpha: alpha * 0.6 });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 25 + Math.sin(angle) * dist * 0.5,
      3 + i,
    );
  }

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 10, GY - 8, 20, 12);

  g.fill({ color: COL_STONE });
  g.rect(CX - 10, GY - 25, 20, 20);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8, GY - 23, 16, 16);

  const runeColor = runePulse > 0.5 ? COL_RUNE_GLOW : COL_RUNE;
  g.fill({ color: runeColor });
  g.rect(CX - 4, GY - 15, 3, 3);
  g.rect(CX + 1, GY - 15, 3, 3);
  g.rect(CX - 1.5, GY - 18, 3, 3);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 12, GY - 20 - raise, 4, 14);
  g.rect(CX + 8, GY - 20 - raise, 4, 14);

  g.fill({ color: COL_STONE });
  g.rect(CX - 12, GY - 22 - raise, 4, 10);
  g.rect(CX + 8, GY - 22 - raise, 4, 10);

  if (runePulse > 0.6) {
    g.fill({ color: COL_MAGIC_LT });
    g.circle(CX - 10, GY - 15 - raise, 3);
    g.circle(CX + 10, GY - 15 - raise, 3);
  }

  g.fill({ color: COL_STONE });
  g.rect(CX - 9, GY - 32, 8, 10);
  g.rect(CX + 1, GY - 32, 8, 10);

  g.fill({ color: COL_STONE });
  g.rect(CX - 7, GY - 38, 14, 8);

  g.fill({ color: COL_EYE_GLOW });
  g.rect(CX - 4, GY - 35, 3, 3);
  g.rect(CX + 1, GY - 35, 3, 3);

  g.fill({ color: COL_MAGIC });
  g.circle(CX, GY - 30, 4 + castProgress * 8);
}

function drawDyingGolem(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const crumble = 1 - deathProgress * 0.3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 14 - deathProgress * 6, 4 - deathProgress * 2);

  g.fill({ color: COL_FOOT_DK });
  g.ellipse(CX - 8, GY + fall * 0.3, 6 * crumble, 4 * crumble);
  g.ellipse(CX + 8, GY + fall * 0.3, 6 * crumble, 4 * crumble);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 10 * crumble, GY - 8 + fall * 0.5, 20 * crumble, 12 * crumble);

  g.fill({ color: COL_STONE });
  g.rect(CX - 10 * crumble, GY - 25 + fall * 0.5, 20 * crumble, 20 * crumble);

  g.fill({ color: COL_STONE_LT });
  g.rect(CX - 8 * crumble, GY - 23 + fall * 0.5, 16 * crumble, 16 * crumble);

  g.fill({ color: COL_CRACK });
  g.moveTo(CX - 5, GY - 20 + fall * 0.5);
  g.lineTo(CX - 3, GY - 15 + fall * 0.5);
  g.lineTo(CX + 3, GY - 10 + fall * 0.5);
  g.stroke();

  g.fill({ color: 0x333333 });
  g.rect(CX - 4, GY - 15 + fall * 0.5, 3, 3);
  g.rect(CX + 1, GY - 15 + fall * 0.5, 3, 3);

  g.fill({ color: COL_STONE_DK });
  g.rect(CX - 12 * crumble, GY - 20 + fall * 0.5, 4 * crumble, 12 * crumble);
  g.rect(CX + 8 * crumble, GY - 20 + fall * 0.5, 4 * crumble, 12 * crumble);

  g.fill({ color: COL_STONE });
  g.rect(CX - 9 * crumble, GY - 32 + fall * 0.5, 8 * crumble, 10 * crumble);
  g.rect(CX + 1 * crumble, GY - 32 + fall * 0.5, 8 * crumble, 10 * crumble);

  g.fill({ color: COL_STONE });
  g.rect(CX - 7 * crumble, GY - 38 + fall * 0.5, 14 * crumble, 8 * crumble);

  if (deathProgress > 0.3) {
    g.fill({ color: 0x333333 });
    g.rect(CX - 4, GY - 35 + fall * 0.5, 3, 1);
    g.rect(CX + 1, GY - 35 + fall * 0.5, 3, 1);
  } else {
    g.fill({ color: COL_EYE });
    g.rect(CX - 4, GY - 35 + fall * 0.5, 3, 3);
    g.rect(CX + 1, GY - 35 + fall * 0.5, 3, 3);
  }

  if (deathProgress > 0.4) {
    g.fill({ color: COL_CRACK });
    g.moveTo(CX, GY - 36 + fall * 0.5);
    g.lineTo(CX - 2, GY - 32 + fall * 0.5);
    g.lineTo(CX + 2, GY - 28 + fall * 0.5);
    g.stroke();
  }

  if (deathProgress < 0.5) {
    g.fill({ color: COL_STONE_DK });
    for (let i = 0; i < 5; i++) {
      g.circle(
        CX + Math.random() * 20 - 10,
        GY - 10 + fall * 0.5 + Math.random() * 20,
        2 + Math.random() * 2,
      );
    }
  }
}
