// Procedural sprite generator for the Templar unit type.
//
// Draws a holy knight/templar at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • White/silver armor with gold trim
//   • Cross symbol on chest
//   • Sword and shield
//   • Helmet with cross

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_ARMOR = 0xdddddd;
const COL_ARMOR_LT = 0xffffff;
const COL_ARMOR_DK = 0xaaaaaa;

const COL_GOLD = 0xd4af37;
const COL_GOLD_LT = 0xf5d76e;

const COL_CROSS = 0x8b0000;

const COL_SKIN = 0xf5d0b0;

const COL_CLOAK = 0xeeeeee;
const COL_CLOAK_DK = 0xcccccc;

const COL_SWORD = 0xc0c8d0;
const COL_SWORD_HI = 0xe0e8f0;
const COL_SWORD_GRD = 0x886633;
const COL_SWORD_POM = 0x664422;

const COL_SHIELD = 0xdddddd;
const COL_SHIELD_CROSS = 0x8b0000;

const COL_EYE = 0x444444;

const COL_SHADOW = 0x000000;

export function generateTemplarFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createTemplarFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createTemplarFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleTemplar(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingTemplar(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingTemplar(g, column);
      break;
    case UnitState.CAST:
      drawCastingTemplar(g, column);
      break;
    case UnitState.DIE:
      drawDyingTemplar(g, column);
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

function drawIdleTemplar(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_CLOAK_DK });
  g.rect(CX - 10, GY - 8, 20, 12);

  g.fill({ color: COL_CLOAK });
  g.rect(CX - 8, GY - 6, 16, 8);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 7, GY - 22 + breathe, 14, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 20 + breathe, 12, 14);

  g.fill({ color: COL_ARMOR_LT });
  g.rect(CX - 5, GY - 18 + breathe, 10, 10);

  g.fill({ color: COL_CROSS });
  g.rect(CX - 1.5, GY - 18 + breathe, 3, 8);
  g.rect(CX - 3, GY - 16.5 + breathe, 7, 3);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GY - 22 + breathe, 12, 2);
  g.rect(CX - 6, GY - 8 + breathe, 12, 2);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: COL_GOLD_LT });
    g.circle(CX - 4 + i * 4, GY - 18 + breathe, 1);
  }

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 28 + breathe, 5, 10);
  g.rect(CX + 3, GY - 28 + breathe, 5, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 26 + breathe, 3, 8);
  g.rect(CX + 6, GY - 26 + breathe, 3, 8);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 9, GY - 34 + breathe, 6, 8);

  g.fill({ color: COL_ARMOR_LT });
  g.rect(CX - 8, GY - 33 + breathe, 4, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 30 + breathe, 1);
  g.circle(CX + 2, GY - 30 + breathe, 1);

  g.fill({ color: COL_SHIELD });
  g.rect(CX - 12, GY - 20 + breathe, 4, 12);

  g.fill({ color: COL_SHIELD_CROSS });
  g.rect(CX - 11.5, GY - 18 + breathe, 1, 6);
  g.rect(CX - 12.5, GY - 17 + breathe, 3, 1);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 8, GY - 22 + breathe, 2, 16);

  g.fill({ color: COL_SWORD_GRD });
  g.rect(CX + 7, GY - 24 + breathe, 4, 2);

  g.fill({ color: COL_SWORD_HI });
  g.rect(CX + 8.5, GY - 22 + breathe, 0.5, 14);

  g.fill({ color: COL_SWORD_POM });
  g.circle(CX + 9, GY - 5 + breathe, 2);
}

function drawWalkingTemplar(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_CLOAK_DK });
  g.rect(CX - 10, GY - 8 + bob, 20, 12);

  g.fill({ color: COL_CLOAK });
  g.rect(CX - 8, GY - 6 + bob, 16, 8);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 7, GY - 22 + bob, 14, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 20 + bob, 12, 14);

  g.fill({ color: COL_CROSS });
  g.rect(CX - 1.5, GY - 18 + bob, 3, 8);
  g.rect(CX - 3, GY - 16.5 + bob, 7, 3);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GY - 22 + bob, 12, 2);
  g.rect(CX - 6, GY - 8 + bob, 12, 2);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 28 + bob, 5, 10);
  g.rect(CX + 3, GY - 28 + bob, 5, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 26 + bob, 3, 8);
  g.rect(CX + 6, GY - 26 + bob, 3, 8);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 9, GY - 34 + bob, 6, 8);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 30 + bob, 1);
  g.circle(CX + 2, GY - 30 + bob, 1);

  g.fill({ color: COL_SHIELD });
  g.rect(CX - 12, GY - 20 + bob, 4, 12);

  g.fill({ color: COL_SHIELD_CROSS });
  g.rect(CX - 11.5, GY - 18 + bob, 1, 6);
  g.rect(CX - 12.5, GY - 17 + bob, 3, 1);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 8, GY - 22 + bob, 2, 16);
  g.rect(CX + 7, GY - 24 + bob, 4, 2);

  g.fill({ color: COL_SWORD_HI });
  g.rect(CX + 8.5, GY - 22 + bob, 0.5, 14);
}

function drawAttackingTemplar(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 4;
  const slash = attackProgress * 8;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_CLOAK_DK });
  g.rect(CX - 10, GY - 8 + lunge, 20, 12);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 7, GY - 22 + lunge, 14, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 20 + lunge, 12, 14);

  g.fill({ color: COL_CROSS });
  g.rect(CX - 1.5, GY - 18 + lunge, 3, 8);
  g.rect(CX - 3, GY - 16.5 + lunge, 7, 3);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GY - 22 + lunge, 12, 2);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 28 + lunge, 5, 10);
  g.rect(CX + 3, GY - 28 + lunge, 5, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 26 + lunge, 3, 8);
  g.rect(CX + 6, GY - 26 + lunge, 3, 8);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 9, GY - 34 + lunge, 6, 8);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 30 + lunge, 1);
  g.circle(CX + 2, GY - 30 + lunge, 1);

  g.fill({ color: COL_SHIELD });
  g.rect(CX - 12, GY - 20 + lunge, 4, 12);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 10 + slash, GY - 25 + lunge, 2, 16);
  g.rect(CX + 9 + slash, GY - 27 + lunge, 4, 2);

  g.fill({ color: COL_SWORD_HI });
  g.rect(CX + 10.5 + slash, GY - 25 + lunge, 0.5, 14);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: 0xffffff });
    g.circle(CX + 8 + slash + i * 3, GY - 20 + lunge - i * 2, 1.5 - i * 0.3);
  }
}

function drawCastingTemplar(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const raise = castProgress * 5;
  const glow = (Math.sin(frame * 0.4) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.3 + i * 1.2;
    const dist = 6 + castProgress * 12 + i * 3;
    const alpha = (1 - i * 0.15) * (0.3 + glow * 0.3);
    g.fill({ color: COL_GOLD_LT, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 25 + Math.sin(angle) * dist * 0.5 - raise,
      3 - i * 0.4,
    );
  }

  g.fill({ color: COL_CLOAK_DK });
  g.rect(CX - 10, GY - 8, 20, 12);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 7, GY - 22 - raise, 14, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GY - 20 - raise, 12, 14);

  g.fill({ color: COL_CROSS });
  g.rect(CX - 1.5, GY - 18 - raise, 3, 8);
  g.rect(CX - 3, GY - 16.5 - raise, 7, 3);

  g.fill({ color: COL_GOLD_LT });
  g.rect(CX - 6, GY - 22 - raise, 12, 2);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 9, GY - 34 - raise, 6, 8);

  g.fill({ color: COL_GOLD_LT });
  g.circle(CX, GY - 15 - raise, 8 + glow * 4);
}

function drawDyingTemplar(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const rotation = deathProgress * 0.2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const rotX = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 20);
    return CX + dx * cos - dy * sin;
  };
  const rotY = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 20);
    return GY - 20 + dx * sin + dy * cos;
  };

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(
    rotX(CX, GY + 1),
    rotY(CX, GY + 1),
    12 - deathProgress * 4,
    3 - deathProgress,
  );

  g.fill({ color: COL_ARMOR });
  g.rect(rotX(CX - 6, GY - 20 + fall), rotY(CX - 6, GY - 20 + fall), 12, 14);

  g.fill({ color: COL_CROSS });
  g.rect(rotX(CX - 1.5, GY - 18 + fall), rotY(CX - 1.5, GY - 18 + fall), 3, 8);
  g.rect(rotX(CX - 3, GY - 16.5 + fall), rotY(CX - 3, GY - 16.5 + fall), 7, 3);

  g.fill({ color: COL_ARMOR });
  g.rect(rotX(CX - 9, GY - 34 + fall), rotY(CX - 9, GY - 34 + fall), 6, 8);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x333333 });
    g.circle(rotX(CX - 2, GY - 30 + fall), rotY(CX - 2, GY - 30 + fall), 1);
    g.circle(rotX(CX + 2, GY - 30 + fall), rotY(CX + 2, GY - 30 + fall), 1);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(rotX(CX - 2, GY - 30 + fall), rotY(CX - 2, GY - 30 + fall), 1);
    g.circle(rotX(CX + 2, GY - 30 + fall), rotY(CX + 2, GY - 30 + fall), 1);
  }

  g.fill({ color: COL_SHIELD });
  g.rect(rotX(CX - 12, GY - 20 + fall), rotY(CX - 12, GY - 20 + fall), 4, 12);

  g.fill({ color: COL_SWORD });
  g.rect(rotX(CX + 8, GY - 22 + fall), rotY(CX + 8, GY - 22 + fall), 2, 16);

  g.fill({ color: COL_SWORD_GRD });
  g.rect(rotX(CX + 7, GY - 24 + fall), rotY(CX + 7, GY - 24 + fall), 4, 2);

  g.fill({ color: COL_SWORD_HI });
  g.rect(
    rotX(CX + 8.5, GY - 22 + fall),
    rotY(CX + 8.5, GY - 22 + fall),
    0.5,
    14,
  );
}
