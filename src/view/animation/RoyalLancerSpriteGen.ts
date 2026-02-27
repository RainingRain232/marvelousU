// Procedural sprite generator for the Royal Lancer unit type.
//
// Draws a majestic royal cavalry lancer at 64×64 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Royal gold and crimson armor
//   • Long charging lance
//   • Ornate helmet with plume
//   • Majestic warhorse with barding
//   • Shield with royal crest

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 64;
const CX = F / 2;
const GY = F - 4;

const COL_GOLD = 0xd4af37;
const COL_GOLD_LT = 0xf5d76e;

const COL_CRIMSON = 0x8b0000;

const COL_ARMOR = 0x888899;
const COL_ARMOR_LT = 0xaaaabc;

const COL_SKIN = 0xf5d0b0;

const COL_HAIR = 0x4a3020;

const COL_HORSE = 0x3d2314;
const COL_HORSE_DK = 0x1d0314;

const COL_HORSE_BARDING = 0x8b0000;
const COL_HORSE_BARDING_LT = 0xaa2222;

const COL_LANCE = 0x8b4513;
const COL_LANCE_TIP = 0xc0c8d0;

const COL_EYE = 0x222222;

const COL_SHADOW = 0x000000;

const COL_PLUME = 0xd4af37;

export function generateRoyalLancerFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createRoyalLancerFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createRoyalLancerFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleRoyalLancer(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingRoyalLancer(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingRoyalLancer(g, column);
      break;
    case UnitState.CAST:
      drawCastingRoyalLancer(g, column);
      break;
    case UnitState.DIE:
      drawDyingRoyalLancer(g, column);
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

function drawIdleRoyalLancer(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;
  const horseBob = Math.sin(frame * 0.2) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 20, 5);

  g.fill({ color: COL_HORSE_DK });
  g.ellipse(CX - 8, GY - 8 + horseBob, 18, 12);
  g.ellipse(CX + 8, GY - 8 + horseBob, 18, 12);

  g.fill({ color: COL_HORSE });
  g.ellipse(CX - 8, GY - 10 + horseBob, 16, 10);
  g.ellipse(CX + 8, GY - 10 + horseBob, 16, 10);

  g.fill({ color: COL_HORSE_BARDING_LT });
  g.rect(CX - 12, GY - 18 + horseBob, 24, 12);

  g.fill({ color: COL_HORSE_BARDING });
  g.rect(CX - 10, GY - 16 + horseBob, 20, 8);

  g.fill({ color: COL_HORSE });
  g.rect(CX - 8, GY - 30 + horseBob, 6, 16);
  g.rect(CX + 2, GY - 30 + horseBob, 6, 16);

  g.fill({ color: COL_HORSE_DK });
  g.ellipse(CX - 5, GY - 32 + horseBob, 4, 4);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 42 + breathe, 16, 14);

  g.fill({ color: COL_ARMOR_LT });
  g.rect(CX - 6, GY - 40 + breathe, 12, 10);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 8, GY - 42 + breathe, 16, 2);
  g.rect(CX - 8, GY - 30 + breathe, 16, 2);

  g.fill({ color: COL_CRIMSON });
  g.rect(CX - 5, GY - 38 + breathe, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 50 + breathe, 8, 10);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 54 + breathe, 10, 5);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GY - 56 + breathe, 12, 4);

  g.fill({ color: COL_PLUME });
  g.rect(CX - 2, GY - 62 + breathe, 4, 8);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 48 + breathe, 1);
  g.circle(CX + 2, GY - 48 + breathe, 1);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 10, GY - 36 + breathe, 3, 10);
  g.rect(CX + 7, GY - 36 + breathe, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 34 + breathe, 4, 8);
  g.rect(CX + 7, GY - 34 + breathe, 4, 8);

  g.fill({ color: COL_LANCE });
  g.rect(CX + 10, GY - 50, 2, 45);

  g.fill({ color: COL_LANCE_TIP });
  g.rect(CX + 10, GY - 52, 2, 3);

  g.fill({ color: COL_GOLD });
  g.rect(CX + 8, GY - 8, 5, 4);
}

function drawWalkingRoyalLancer(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;
  const horseBob = Math.sin(walkCycle * Math.PI * 2) * 1;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 20, 5);

  g.fill({ color: COL_HORSE_DK });
  g.ellipse(CX - 8 - legSwing * 0.3, GY - 8 + horseBob, 18, 12);
  g.ellipse(CX + 8 + legSwing * 0.3, GY - 8 + horseBob, 18, 12);

  g.fill({ color: COL_HORSE });
  g.ellipse(CX - 8 - legSwing * 0.3, GY - 10 + horseBob, 16, 10);
  g.ellipse(CX + 8 + legSwing * 0.3, GY - 10 + horseBob, 16, 10);

  g.fill({ color: COL_HORSE_BARDING_LT });
  g.rect(CX - 12, GY - 18 + horseBob, 24, 12);

  g.fill({ color: COL_HORSE_BARDING });
  g.rect(CX - 10, GY - 16 + horseBob, 20, 8);

  g.fill({ color: COL_HORSE });
  g.rect(CX - 8, GY - 30 + horseBob, 6, 16);
  g.rect(CX + 2, GY - 30 + horseBob, 6, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 42 + bob, 16, 14);

  g.fill({ color: COL_ARMOR_LT });
  g.rect(CX - 6, GY - 40 + bob, 12, 10);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 8, GY - 42 + bob, 16, 2);
  g.rect(CX - 8, GY - 30 + bob, 16, 2);

  g.fill({ color: COL_CRIMSON });
  g.rect(CX - 5, GY - 38 + bob, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 50 + bob, 8, 10);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 5, GY - 54 + bob, 10, 5);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GY - 56 + bob, 12, 4);

  g.fill({ color: COL_PLUME });
  g.rect(CX - 2, GY - 62 + bob, 4, 8);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 48 + bob, 1);
  g.circle(CX + 2, GY - 48 + bob, 1);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 10, GY - 36 + bob, 3, 10);
  g.rect(CX + 7, GY - 36 + bob, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 34 + bob, 4, 8);
  g.rect(CX + 7, GY - 34 + bob, 4, 8);

  g.fill({ color: COL_LANCE });
  g.rect(CX + 10, GY - 50, 2, 45);

  g.fill({ color: COL_LANCE_TIP });
  g.rect(CX + 10, GY - 52, 2, 3);
}

function drawAttackingRoyalLancer(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 8;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 20, 5);

  g.fill({ color: COL_HORSE_DK });
  g.ellipse(CX - 8 + lunge * 0.3, GY - 8, 18, 12);
  g.ellipse(CX + 8 + lunge * 0.3, GY - 8, 18, 12);

  g.fill({ color: COL_HORSE });
  g.ellipse(CX - 8 + lunge * 0.3, GY - 10, 16, 10);
  g.ellipse(CX + 8 + lunge * 0.3, GY - 10, 16, 10);

  g.fill({ color: COL_HORSE_BARDING_LT });
  g.rect(CX - 12 + lunge * 0.3, GY - 18, 24, 12);

  g.fill({ color: COL_HORSE_BARDING });
  g.rect(CX - 10 + lunge * 0.3, GY - 16, 20, 8);

  g.fill({ color: COL_HORSE });
  g.rect(CX - 8 + lunge * 0.3, GY - 30, 6, 16);
  g.rect(CX + 2 + lunge * 0.3, GY - 30, 6, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8 + lunge * 0.3, GY - 42, 16, 14);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 8 + lunge * 0.3, GY - 42, 16, 2);
  g.rect(CX - 8 + lunge * 0.3, GY - 30, 16, 2);

  g.fill({ color: COL_CRIMSON });
  g.rect(CX - 5 + lunge * 0.3, GY - 38, 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4 + lunge * 0.3, GY - 50, 8, 10);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6 + lunge * 0.3, GY - 56, 12, 4);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2 + lunge * 0.3, GY - 48, 1);
  g.circle(CX + 2 + lunge * 0.3, GY - 48, 1);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 10 + lunge * 0.3 + lunge * 0.5, GY - 36, 3, 10);
  g.rect(CX + 7 + lunge * 0.3, GY - 36, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11 + lunge * 0.3 + lunge * 0.5, GY - 34, 4, 8);
  g.rect(CX + 7 + lunge * 0.3, GY - 34, 4, 8);

  g.fill({ color: COL_LANCE });
  g.rect(CX + 10 + lunge, GY - 50 - lunge * 0.5, 2, 45);

  g.fill({ color: COL_LANCE_TIP });
  g.rect(CX + 10 + lunge, GY - 52 - lunge * 0.5, 2, 3);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: 0xffffff });
    g.circle(CX + 14 + lunge + i * 5, GY - 50 - lunge * 0.5 - i * 3, 1.5);
  }
}

function drawCastingRoyalLancer(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const raise = castProgress * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 2, 20, 5);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.2 + i * 1.2;
    const dist = 10 + castProgress * 15 + i * 4;
    const alpha = (1 - i * 0.15) * 0.5;
    g.fill({ color: COL_GOLD_LT, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 40 + Math.sin(angle) * dist * 0.5 - raise,
      3 - i * 0.4,
    );
  }

  g.fill({ color: COL_HORSE_DK });
  g.ellipse(CX - 8, GY - 8, 18, 12);
  g.ellipse(CX + 8, GY - 8, 18, 12);

  g.fill({ color: COL_HORSE });
  g.ellipse(CX - 8, GY - 10, 16, 10);
  g.ellipse(CX + 8, GY - 10, 16, 10);

  g.fill({ color: COL_HORSE_BARDING_LT });
  g.rect(CX - 12, GY - 18, 24, 12);

  g.fill({ color: COL_HORSE_BARDING });
  g.rect(CX - 10, GY - 16, 20, 8);

  g.fill({ color: COL_HORSE });
  g.rect(CX - 8, GY - 30, 6, 16);
  g.rect(CX + 2, GY - 30, 6, 16);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 8, GY - 42 - raise, 16, 14);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 8, GY - 42 - raise, 16, 2);

  g.fill({ color: COL_CRIMSON });
  g.rect(CX - 5, GY - 38 - raise, 10, 6);

  g.fill({ color: COL_GOLD_LT });
  g.circle(CX, GY - 35 - raise, 6 + castProgress * 4);
}

function drawDyingRoyalLancer(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 25;
  const rotation = deathProgress * 0.3;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const rotX = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 30);
    return CX + dx * cos - dy * sin;
  };
  const rotY = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GY - 30);
    return GY - 30 + dx * sin + dy * cos;
  };

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(
    rotX(CX, GY + 2),
    rotY(CX, GY + 2),
    20 - deathProgress * 8,
    5 - deathProgress * 2,
  );

  g.fill({ color: COL_HORSE });
  g.ellipse(
    rotX(CX - 8, GY - 10 + fall * 0.3),
    rotY(CX - 8, GY - 10 + fall * 0.3),
    16,
    10,
  );

  g.fill({ color: COL_HORSE_BARDING });
  g.rect(
    rotX(CX - 10, GY - 16 + fall * 0.3),
    rotY(CX - 10, GY - 16 + fall * 0.3),
    20,
    8,
  );

  g.fill({ color: COL_ARMOR });
  g.rect(rotX(CX - 8, GY - 42 + fall), rotY(CX - 8, GY - 42 + fall), 16, 14);

  g.fill({ color: COL_GOLD });
  g.rect(rotX(CX - 8, GY - 42 + fall), rotY(CX - 8, GY - 42 + fall), 16, 2);

  g.fill({ color: COL_CRIMSON });
  g.rect(rotX(CX - 5, GY - 38 + fall), rotY(CX - 5, GY - 38 + fall), 10, 6);

  g.fill({ color: COL_SKIN });
  g.rect(rotX(CX - 4, GY - 50 + fall), rotY(CX - 4, GY - 50 + fall), 8, 10);

  g.fill({ color: COL_GOLD });
  g.rect(rotX(CX - 6, GY - 56 + fall), rotY(CX - 6, GY - 56 + fall), 12, 4);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x333333 });
    g.circle(rotX(CX - 2, GY - 48 + fall), rotY(CX - 2, GY - 48 + fall), 1);
    g.circle(rotX(CX + 2, GY - 48 + fall), rotY(CX + 2, GY - 48 + fall), 1);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(rotX(CX - 2, GY - 48 + fall), rotY(CX - 2, GY - 48 + fall), 1);
    g.circle(rotX(CX + 2, GY - 48 + fall), rotY(CX + 2, GY - 48 + fall), 1);
  }

  g.fill({ color: COL_LANCE });
  g.rect(rotX(CX + 10, GY - 50 + fall), rotY(CX + 10, GY - 50 + fall), 2, 45);
}
