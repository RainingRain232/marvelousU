// Procedural sprite generator for the Angel unit type.
//
// Draws a divine celestial warrior at 96×144 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Radiant golden armor with white robes
//   • Large feathery wings with gentle flap animation
//   • Glowing golden halo above head
//   • Blazing sword with flame effect
//   • Holy light aura

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F_W = 96;
const F_H = 144;
const CX = F_W / 2;
const GROUND_Y = F_H - 10;

const COL_GOLD = 0xffd700;
const COL_GOLD_LT = 0xfff8dc;

const COL_ARMOR = 0xfaf0e6;
const COL_ARMOR_DK = 0xd4c4b0;
const COL_ARMOR_LT = 0xffffff;

const COL_WINGS = 0xffffff;
const COL_WINGS_DK = 0xe8e8e8;
const COL_WINGS_EDGE = 0xccccee;

const COL_ROBE = 0xfffaf0;
const COL_ROBE_DK = 0xe8e0d8;

const COL_SKIN = 0xffe4c4;

const COL_HALO = 0xfffacd;
const COL_HALO_GLOW = 0xffffe0;

const COL_SWORD = 0xfff8dc;
const COL_SWORD_BLADE = 0xffffff;
const COL_SWORD_FLAME = 0xff8c00;
const COL_SWORD_FLAME_LT = 0xffff00;

const COL_EYE = 0x4169e1;
const COL_AURA = 0xfff8dc;

const COL_SHADOW = 0x000000;

export function generateAngelFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createAngelFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createAngelFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleAngel(g, column);
      break;
    case UnitState.MOVE:
      drawFlyingAngel(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingAngel(g, column);
      break;
    case UnitState.CAST:
      drawCastingAngel(g, column);
      break;
    case UnitState.DIE:
      drawDyingAngel(g, column);
      break;
  }

  const texture = RenderTexture.create({
    width: F_W,
    height: F_H,
  });
  renderer.render({ target: texture, container: g });
  g.destroy();

  return texture;
}

function drawIdleAngel(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const wingFlap = Math.sin(frame * 0.25) * 3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GROUND_Y + 2, 20, 5);

  g.fill({ color: COL_WINGS_DK, alpha: 0.6 });
  g.ellipse(CX - 30, GROUND_Y - 50 + wingFlap, 25, 15);
  g.ellipse(CX + 30, GROUND_Y - 50 + wingFlap, 25, 15);

  g.fill({ color: COL_WINGS, alpha: 0.8 });
  g.ellipse(CX - 28, GROUND_Y - 52 + wingFlap, 22, 12);
  g.ellipse(CX + 28, GROUND_Y - 52 + wingFlap, 22, 12);

  g.fill({ color: COL_WINGS_EDGE, alpha: 0.5 });
  g.ellipse(CX - 26, GROUND_Y - 54 + wingFlap, 18, 8);
  g.ellipse(CX + 26, GROUND_Y - 54 + wingFlap, 18, 8);

  for (let i = 0; i < 5; i++) {
    const featherX = CX - 35 + i * 3;
    g.fill({ color: COL_WINGS });
    g.ellipse(featherX, GROUND_Y - 45 + wingFlap + i * 2, 3, 8);
    g.fill({ color: COL_WINGS });
    g.ellipse(CX + 35 - i * 3, GROUND_Y - 45 + wingFlap + i * 2, 3, 8);
  }

  g.fill({ color: COL_AURA, alpha: 0.15 });
  g.ellipse(CX, GROUND_Y - 60, 35, 50);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 12, GROUND_Y - 40 + breathe, 24, 35);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GROUND_Y - 38 + breathe, 20, 32);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 8, GROUND_Y - 70 + breathe, 16, 32);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GROUND_Y - 68 + breathe, 12, 28);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GROUND_Y - 70 + breathe, 12, 3);
  g.rect(CX - 6, GROUND_Y - 40 + breathe, 12, 3);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 12, GROUND_Y - 80 + breathe, 6, 14);
  g.rect(CX + 6, GROUND_Y - 80 + breathe, 6, 14);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GROUND_Y - 78 + breathe, 4, 10);
  g.rect(CX + 10, GROUND_Y - 78 + breathe, 4, 10);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 14, GROUND_Y - 95 + breathe, 8, 18);

  g.fill({ color: COL_ARMOR_LT ?? COL_GOLD_LT });
  g.rect(CX - 12, GROUND_Y - 92 + breathe, 4, 12);

  g.fill({ color: COL_HALO_GLOW, alpha: 0.5 });
  g.ellipse(CX, GROUND_Y - 110 + breathe, 12, 4);

  g.fill({ color: COL_HALO });
  g.ellipse(CX, GROUND_Y - 108 + breathe, 10, 3);

  g.fill({ color: COL_EYE });
  g.circle(CX - 3, GROUND_Y - 95 + breathe, 2);
  g.circle(CX + 3, GROUND_Y - 95 + breathe, 2);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 14, GROUND_Y - 65 + breathe, 3, 20);

  g.fill({ color: COL_SWORD_BLADE });
  g.rect(CX + 15, GROUND_Y - 90 + breathe, 1, 30);

  for (let i = 0; i < 6; i++) {
    g.fill({ color: COL_SWORD_FLAME, alpha: 0.7 - i * 0.1 });
    g.ellipse(CX + 15, GROUND_Y - 95 - i * 4 + breathe, 2 + i * 0.5, 3);
  }
  g.fill({ color: COL_SWORD_FLAME_LT, alpha: 0.8 });
  g.ellipse(CX + 15, GROUND_Y - 95 + breathe, 1.5, 4);
}

function drawFlyingAngel(g: Graphics, frame: number): void {
  const flyCycle = (frame % 8) / 8;
  const bob = Math.sin(flyCycle * Math.PI * 2) * 2;
  const wingFlap = Math.sin(flyCycle * Math.PI * 2) * 8;
  const hover = Math.sin(flyCycle * Math.PI * 2) * 3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GROUND_Y + 2, 18 - flyCycle * 4, 4 - flyCycle);

  g.fill({ color: COL_WINGS_DK, alpha: 0.6 });
  g.ellipse(CX - 35, GROUND_Y - 45 + wingFlap, 28 + flyCycle * 5, 18);
  g.ellipse(CX + 35, GROUND_Y - 45 + wingFlap, 28 + flyCycle * 5, 18);

  g.fill({ color: COL_WINGS, alpha: 0.8 });
  g.ellipse(CX - 32, GROUND_Y - 48 + wingFlap, 24 + flyCycle * 4, 14);
  g.ellipse(CX + 32, GROUND_Y - 48 + wingFlap, 24 + flyCycle * 4, 14);

  for (let i = 0; i < 6; i++) {
    g.fill({ color: COL_WINGS });
    g.ellipse(
      CX - 38 + i * 4,
      GROUND_Y - 40 + wingFlap + i * 3,
      4 - i * 0.3,
      10 - i,
    );
    g.ellipse(
      CX + 38 - i * 4,
      GROUND_Y - 40 + wingFlap + i * 3,
      4 - i * 0.3,
      10 - i,
    );
  }

  g.fill({ color: COL_AURA, alpha: 0.2 });
  g.ellipse(CX, GROUND_Y - 55 + hover, 38, 55);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 12, GROUND_Y - 35 + bob, 24, 30);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GROUND_Y - 33 + bob, 20, 26);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 8, GROUND_Y - 65 + bob, 16, 32);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GROUND_Y - 63 + bob, 12, 28);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GROUND_Y - 65 + bob, 12, 3);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 12, GROUND_Y - 75 + bob, 6, 14);
  g.rect(CX + 6, GROUND_Y - 75 + bob, 6, 14);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GROUND_Y - 73 + bob, 4, 10);
  g.rect(CX + 10, GROUND_Y - 73 + bob, 4, 10);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 14, GROUND_Y - 90 + bob, 8, 18);

  g.fill({ color: COL_HALO_GLOW, alpha: 0.6 });
  g.ellipse(CX, GROUND_Y - 105 + bob, 14, 5);

  g.fill({ color: COL_HALO });
  g.ellipse(CX, GROUND_Y - 103 + bob, 11, 4);

  g.fill({ color: COL_EYE });
  g.circle(CX - 3, GROUND_Y - 88 + bob, 2);
  g.circle(CX + 3, GROUND_Y - 88 + bob, 2);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 14, GROUND_Y - 60 + bob, 3, 20);

  g.fill({ color: COL_SWORD_BLADE });
  g.rect(CX + 15, GROUND_Y - 85 + bob, 1, 35);

  for (let i = 0; i < 7; i++) {
    g.fill({ color: COL_SWORD_FLAME, alpha: 0.7 - i * 0.08 });
    g.ellipse(CX + 15, GROUND_Y - 90 - i * 4 + bob, 2 + i * 0.5, 3 + i * 0.3);
  }
}

function drawAttackingAngel(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const windUp = Math.sin(attackProgress * Math.PI) * 8;
  const slash = attackProgress * 15;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GROUND_Y + 1, 18, 4);

  const wingFlap = Math.sin(frame * 0.3) * 4;
  g.fill({ color: COL_WINGS_DK, alpha: 0.6 });
  g.ellipse(CX - 30, GROUND_Y - 50 + wingFlap, 25, 15);
  g.ellipse(CX + 30, GROUND_Y - 50 + wingFlap, 25, 15);

  g.fill({ color: COL_WINGS });
  g.ellipse(CX - 28, GROUND_Y - 52 + wingFlap, 22, 12);
  g.ellipse(CX + 28, GROUND_Y - 52 + wingFlap, 22, 12);

  g.fill({ color: COL_AURA, alpha: 0.2 });
  g.ellipse(CX, GROUND_Y - 60, 35, 50);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 12, GROUND_Y - 40, 24, 35);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GROUND_Y - 38, 20, 32);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 8, GROUND_Y - 70, 16, 32);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GROUND_Y - 68, 12, 28);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GROUND_Y - 70, 12, 3);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 12, GROUND_Y - 80, 6, 14);
  g.rect(CX + 6, GROUND_Y - 80, 6, 14);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GROUND_Y - 78, 4, 10);
  g.rect(CX + 10, GROUND_Y - 78, 4, 10);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 14, GROUND_Y - 95, 8, 18);

  g.fill({ color: COL_HALO_GLOW, alpha: 0.6 });
  g.ellipse(CX, GROUND_Y - 110, 14, 5);

  g.fill({ color: COL_HALO });
  g.ellipse(CX, GROUND_Y - 108, 11, 4);

  g.fill({ color: COL_EYE });
  g.circle(CX - 3, GROUND_Y - 93, 2);
  g.circle(CX + 3, GROUND_Y - 93, 2);

  const swordX = CX + 16 + slash;
  const swordY = GROUND_Y - 65 + windUp;

  g.fill({ color: COL_SWORD });
  g.rect(swordX, swordY, 3, 20);

  g.fill({ color: COL_SWORD_BLADE });
  g.rect(swordX + 1, swordY - 25, 1, 35);

  for (let i = 0; i < 8; i++) {
    g.fill({ color: COL_SWORD_FLAME, alpha: 0.7 - i * 0.08 });
    g.ellipse(swordX + 1, swordY - 30 - i * 4, 2 + i * 0.5, 3 + i * 0.4);
  }

  g.fill({ color: 0xffffff, alpha: 0.3 });
  g.circle(swordX + 1, swordY - 10, 8 + attackProgress * 5);
}

function drawCastingAngel(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const rise = castProgress * 8;
  const glow = (Math.sin(frame * 0.5) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GROUND_Y + 1, 16, 4);

  const wingFlap = Math.sin(frame * 0.3) * 5;
  g.fill({ color: COL_WINGS_DK, alpha: 0.6 });
  g.ellipse(CX - 30, GROUND_Y - 50 + wingFlap, 25, 15);
  g.ellipse(CX + 30, GROUND_Y - 50 + wingFlap, 25, 15);

  g.fill({ color: COL_WINGS });
  g.ellipse(CX - 28, GROUND_Y - 52 + wingFlap, 22, 12);
  g.ellipse(CX + 28, GROUND_Y - 52 + wingFlap, 22, 12);

  g.fill({ color: COL_AURA, alpha: 0.25 + glow * 0.15 });
  g.ellipse(CX, GROUND_Y - 60 - rise, 40 + glow * 10, 55 + glow * 15);

  for (let i = 0; i < 8; i++) {
    const angle = frame * 0.2 + i * 0.8;
    const dist = 15 + castProgress * 20 + i * 5;
    const alpha = (0.6 - i * 0.06) * (0.4 + glow * 0.3);
    g.fill({ color: COL_HALO_GLOW, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GROUND_Y - 40 + Math.sin(angle) * dist * 0.6 - rise,
      4 - i * 0.3,
    );
  }

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 12, GROUND_Y - 40 - rise, 24, 35);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GROUND_Y - 38 - rise, 20, 32);

  g.fill({ color: COL_ARMOR_DK });
  g.rect(CX - 8, GROUND_Y - 70 - rise, 16, 32);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 6, GROUND_Y - 68 - rise, 12, 28);

  g.fill({ color: COL_GOLD });
  g.rect(CX - 6, GROUND_Y - 70 - rise, 12, 3);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 12, GROUND_Y - 80 - rise, 6, 14);
  g.rect(CX + 6, GROUND_Y - 80 - rise, 6, 14);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 14, GROUND_Y - 78 - rise, 4, 10);
  g.rect(CX + 10, GROUND_Y - 78 - rise, 4, 10);

  g.fill({ color: COL_ARMOR });
  g.rect(CX - 14, GROUND_Y - 95 - rise, 8, 18);

  g.fill({ color: COL_HALO_GLOW, alpha: 0.7 + glow * 0.3 });
  g.ellipse(CX, GROUND_Y - 110 - rise, 16 + glow * 4, 5 + glow);

  g.fill({ color: COL_HALO });
  g.ellipse(CX, GROUND_Y - 108 - rise, 13 + glow * 3, 4 + glow * 0.8);

  g.fill({ color: COL_EYE });
  g.circle(CX - 3, GROUND_Y - 93 - rise, 2);
  g.circle(CX + 3, GROUND_Y - 93 - rise, 2);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 14, GROUND_Y - 60 - rise, 3, 20);

  g.fill({ color: COL_SWORD_BLADE });
  g.rect(CX + 15, GROUND_Y - 85 - rise, 1, 30);

  for (let i = 0; i < 6; i++) {
    g.fill({ color: COL_SWORD_FLAME, alpha: 0.7 - i * 0.1 });
    g.ellipse(CX + 15, GROUND_Y - 90 - i * 4 - rise, 2 + i * 0.5, 3);
  }

  g.fill({ color: COL_HALO_GLOW, alpha: 0.4 + glow * 0.4 });
  g.circle(CX, GROUND_Y - 15 - rise, 15 + glow * 10);
}

function drawDyingAngel(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 25;
  const rotation = deathProgress * 0.3;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const wingFall = Math.sin(frame * 0.3) * 10;

  const rotX = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GROUND_Y - 40);
    return CX + dx * cos - dy * sin;
  };
  const rotY = (x: number, y: number): number => {
    const dx = x - CX;
    const dy = y - (GROUND_Y - 40);
    return GROUND_Y - 40 + dx * sin + dy * cos;
  };

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(
    rotX(CX, GROUND_Y + 1),
    rotY(CX, GROUND_Y + 1),
    18 - deathProgress * 6,
    4 - deathProgress,
  );

  g.fill({ color: COL_WINGS_DK, alpha: 0.5 * (1 - deathProgress) });
  g.ellipse(
    rotX(CX - 30, GROUND_Y - 50 + wingFall + fall),
    rotY(CX - 30, GROUND_Y - 50 + wingFall + fall),
    25,
    15,
  );
  g.ellipse(
    rotX(CX + 30, GROUND_Y - 50 + wingFall + fall),
    rotY(CX + 30, GROUND_Y - 50 + wingFall + fall),
    25,
    15,
  );

  g.fill({ color: COL_ROBE, alpha: 1 - deathProgress });
  g.rect(
    rotX(CX - 10, GROUND_Y - 38 + fall),
    rotY(CX - 10, GROUND_Y - 38 + fall),
    20,
    32,
  );

  g.fill({ color: COL_ARMOR, alpha: 1 - deathProgress });
  g.rect(
    rotX(CX - 6, GROUND_Y - 68 + fall),
    rotY(CX - 6, GROUND_Y - 68 + fall),
    12,
    28,
  );

  g.fill({ color: COL_GOLD, alpha: 1 - deathProgress });
  g.rect(
    rotX(CX - 6, GROUND_Y - 70 + fall),
    rotY(CX - 6, GROUND_Y - 70 + fall),
    12,
    3,
  );

  g.fill({ color: COL_ARMOR, alpha: 1 - deathProgress });
  g.rect(
    rotX(CX - 14, GROUND_Y - 95 + fall),
    rotY(CX - 14, GROUND_Y - 95 + fall),
    8,
    18,
  );

  g.fill({ color: COL_HALO_GLOW, alpha: 0.5 * (1 - deathProgress) });
  g.ellipse(
    rotX(CX, GROUND_Y - 108 + fall),
    rotY(CX, GROUND_Y - 108 + fall),
    14,
    5,
  );

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333333, alpha: 1 - deathProgress });
    g.circle(
      rotX(CX - 3, GROUND_Y - 93 + fall),
      rotY(CX - 3, GROUND_Y - 93 + fall),
      2,
    );
    g.circle(
      rotX(CX + 3, GROUND_Y - 93 + fall),
      rotY(CX + 3, GROUND_Y - 93 + fall),
      2,
    );
  } else {
    g.fill({ color: COL_EYE });
    g.circle(
      rotX(CX - 3, GROUND_Y - 93 + fall),
      rotY(CX - 3, GROUND_Y - 93 + fall),
      2,
    );
    g.circle(
      rotX(CX + 3, GROUND_Y - 93 + fall),
      rotY(CX + 3, GROUND_Y - 93 + fall),
      2,
    );
  }

  g.fill({ color: COL_SWORD, alpha: 1 - deathProgress });
  g.rect(
    rotX(CX + 14, GROUND_Y - 65 + fall),
    rotY(CX + 14, GROUND_Y - 65 + fall),
    3,
    20,
  );
}
