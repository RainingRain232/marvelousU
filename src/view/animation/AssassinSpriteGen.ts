// Procedural sprite generator for the Assassin unit type.
//
// Draws a medieval fantasy assassin at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Black stealthy garb
//   • Hood
//   • Sword in right hand
//   • Dagger in left hand
//   • Dark boots
//   • Sneaky demeanor

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xf5d0b0;

const COL_BLACK = 0x1a1a1a;
const COL_BLACK_LT = 0x2a2a2a;

const COL_HOOD = 0x111111;
const COL_HOOD_LT = 0x222222;

const COL_SWORD = 0xc0c8d0;
const COL_SWORD_POM = 0x664422;

const COL_DAGGER = 0xaaaabb;
const COL_DAGGER_GRD = 0x665544;

const COL_BOOT = 0x0a0808;

const COL_EYE = 0x444444;
const COL_EYE_GLOW = 0xaa0000;

const COL_SHADOW = 0x000000;

export function generateAssassinFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createAssassinFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createAssassinFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleAssassin(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingAssassin(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingAssassin(g, column);
      break;
    case UnitState.CAST:
      drawCastingAssassin(g, column);
      break;
    case UnitState.DIE:
      drawDyingAssassin(g, column);
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

function drawIdleAssassin(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 5, 5, 6);
  g.rect(CX + 2, GY - 5, 5, 6);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 6, GY - 24 + breathe, 12, 20);

  g.fill({ color: COL_BLACK_LT });
  g.rect(CX - 5, GY - 22 + breathe, 10, 16);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 5, GY - 28 + breathe, 10, 6);

  g.fill({ color: COL_HOOD });
  g.rect(CX - 7, GY - 36 + breathe, 14, 10);
  g.rect(CX - 6, GY - 34 + breathe, 12, 6);

  g.fill({ color: COL_HOOD_LT });
  g.rect(CX - 5, GY - 35 + breathe, 10, 4);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 32 + breathe, 6, 5);

  g.fill({ color: COL_EYE });
  g.rect(CX - 2, GY - 32 + breathe, 1.5, 1.5);
  g.rect(CX + 0.5, GY - 32 + breathe, 1.5, 1.5);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 8, GY - 20 + breathe, 3, 10);
  g.rect(CX + 5, GY - 20 + breathe, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + breathe, 4, 8);
  g.rect(CX + 5, GY - 18 + breathe, 4, 8);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 8, GY - 20 + breathe, 2, 18);
  g.rect(CX + 7, GY - 22 + breathe, 4, 3);

  g.fill({ color: COL_SWORD_POM });
  g.circle(CX + 9, GY - 3 + breathe, 2);

  g.fill({ color: COL_DAGGER });
  g.rect(CX - 10, GY - 14 + breathe, 1.5, 10);
  g.rect(CX - 11, GY - 15 + breathe, 3, 2);

  g.fill({ color: COL_DAGGER_GRD });
  g.rect(CX - 10.5, GY - 6 + breathe, 2, 1);
}

function drawWalkingAssassin(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7 - legSwing * 0.3, GY - 5, 5, 6);
  g.rect(CX + 2 + legSwing * 0.3, GY - 5, 5, 6);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 6, GY - 24 + bob, 12, 20);

  g.fill({ color: COL_BLACK_LT });
  g.rect(CX - 5, GY - 22 + bob, 10, 16);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 5, GY - 28 + bob, 10, 6);

  g.fill({ color: COL_HOOD });
  g.rect(CX - 7, GY - 36 + bob, 14, 10);
  g.rect(CX - 6, GY - 34 + bob, 12, 6);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 32 + bob, 6, 5);

  g.fill({ color: COL_EYE });
  g.rect(CX - 2, GY - 32 + bob, 1.5, 1.5);
  g.rect(CX + 0.5, GY - 32 + bob, 1.5, 1.5);

  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 3;
  g.fill({ color: COL_BLACK });
  g.rect(CX - 8, GY - 20 + bob + armSwing, 3, 10);
  g.rect(CX + 5, GY - 20 + bob - armSwing, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + bob + armSwing, 4, 8);
  g.rect(CX + 5, GY - 18 + bob - armSwing, 4, 8);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 8, GY - 20 + bob - armSwing, 2, 18);
  g.rect(CX + 7, GY - 22 + bob - armSwing, 4, 3);

  g.fill({ color: COL_DAGGER });
  g.rect(CX - 10, GY - 14 + bob + armSwing, 1.5, 10);
  g.rect(CX - 11, GY - 15 + bob + armSwing, 3, 2);
}

function drawAttackingAssassin(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 4;
  const slash = attackProgress * 8;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 5, 5, 6);
  g.rect(CX + 2, GY - 5, 5, 6);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 6, GY - 24 + lunge, 12, 20);

  g.fill({ color: COL_BLACK_LT });
  g.rect(CX - 5, GY - 22 + lunge, 10, 16);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 5, GY - 28 + lunge, 10, 6);

  g.fill({ color: COL_HOOD });
  g.rect(CX - 7, GY - 36 + lunge, 14, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 32 + lunge, 6, 5);

  g.fill({ color: COL_EYE });
  g.rect(CX - 2, GY - 32 + lunge, 1.5, 1.5);
  g.rect(CX + 0.5, GY - 32 + lunge, 1.5, 1.5);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 8, GY - 20 + lunge + slash * 0.5, 3, 10);
  g.rect(CX + 5, GY - 20 + lunge - slash * 0.5, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 + lunge + slash, 4, 8);
  g.rect(CX + 5, GY - 18 + lunge - slash, 4, 8);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 10 + slash, GY - 25 + lunge, 2, 18);
  g.rect(CX + 9 + slash, GY - 27 + lunge, 4, 3);

  g.fill({ color: COL_DAGGER });
  g.rect(CX - 10 - slash * 0.5, GY - 18 + lunge, 1.5, 12);
  g.rect(CX - 11 - slash * 0.5, GY - 19 + lunge, 3, 2);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: 0xffffff, alpha: 0.8 });
    g.circle(CX + 8 + slash + i * 3, GY - 20 + lunge - i * 2, 1.5 - i * 0.3);
  }
}

function drawCastingAssassin(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const raise = castProgress * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 10, 3);

  for (let i = 0; i < 4; i++) {
    const angle = frame * 0.3 + i * 1.5;
    const dist = 8 + castProgress * 10 + i * 3;
    const alpha = (1 - i * 0.2) * 0.5;
    g.fill({ color: COL_EYE_GLOW, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 25 + Math.sin(angle) * dist * 0.5 - raise,
      2 - i * 0.3,
    );
  }

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 5, 5, 6);
  g.rect(CX + 2, GY - 5, 5, 6);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 6, GY - 24, 12, 20);

  g.fill({ color: COL_BLACK_LT });
  g.rect(CX - 5, GY - 22, 10, 16);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 5, GY - 28 - raise, 10, 6);

  g.fill({ color: COL_HOOD });
  g.rect(CX - 7, GY - 36 - raise, 14, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 3, GY - 32, 6, 5);

  g.fill({ color: COL_EYE_GLOW });
  g.circle(CX - 2, GY - 32, 2);
  g.circle(CX + 2, GY - 32, 2);

  g.fill({ color: COL_BLACK });
  g.rect(CX - 8, GY - 20 - raise, 3, 10);
  g.rect(CX + 5, GY - 20 - raise, 3, 10);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 9, GY - 18 - raise, 4, 8);
  g.rect(CX + 5, GY - 18 - raise, 4, 8);

  g.fill({ color: COL_SWORD });
  g.rect(CX + 8, GY - 20 - raise, 2, 18);

  g.fill({ color: COL_DAGGER });
  g.rect(CX - 10, GY - 14 - raise, 1.5, 10);
}

function drawDyingAssassin(g: Graphics, frame: number): void {
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
    10 - deathProgress * 4,
    3 - deathProgress,
  );

  g.fill({ color: COL_BOOT });
  g.rect(
    rotX(CX - 7, GY - 5 + fall * 0.3),
    rotY(CX - 7, GY - 5 + fall * 0.3),
    5,
    6,
  );
  g.rect(
    rotX(CX + 2, GY - 5 + fall * 0.3),
    rotY(CX + 2, GY - 5 + fall * 0.3),
    5,
    6,
  );

  g.fill({ color: COL_BLACK });
  g.rect(rotX(CX - 6, GY - 24 + fall), rotY(CX - 6, GY - 24 + fall), 12, 20);

  g.fill({ color: COL_BLACK_LT });
  g.rect(rotX(CX - 5, GY - 22 + fall), rotY(CX - 5, GY - 22 + fall), 10, 16);

  g.fill({ color: COL_BLACK });
  g.rect(rotX(CX - 5, GY - 28 + fall), rotY(CX - 5, GY - 28 + fall), 10, 6);

  g.fill({ color: COL_HOOD });
  g.rect(rotX(CX - 7, GY - 36 + fall), rotY(CX - 7, GY - 36 + fall), 14, 10);

  g.fill({ color: COL_SKIN });
  g.rect(rotX(CX - 3, GY - 32 + fall), rotY(CX - 3, GY - 32 + fall), 6, 5);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x333333 });
    g.rect(
      rotX(CX - 2.5, GY - 32 + fall),
      rotY(CX - 2.5, GY - 32 + fall),
      1.5,
      1,
    );
    g.rect(rotX(CX + 1, GY - 32 + fall), rotY(CX + 1, GY - 32 + fall), 1.5, 1);
  } else {
    g.fill({ color: COL_EYE });
    g.rect(
      rotX(CX - 2, GY - 32 + fall),
      rotY(CX - 2, GY - 32 + fall),
      1.5,
      1.5,
    );
    g.rect(
      rotX(CX + 0.5, GY - 32 + fall),
      rotY(CX + 0.5, GY - 32 + fall),
      1.5,
      1.5,
    );
  }

  g.fill({ color: COL_SWORD });
  g.rect(rotX(CX + 8, GY - 20 + fall), rotY(CX + 8, GY - 20 + fall), 2, 18);

  g.fill({ color: COL_DAGGER });
  g.rect(rotX(CX - 10, GY - 14 + fall), rotY(CX - 10, GY - 14 + fall), 1.5, 10);
}
