// Procedural sprite generator for the Diplomat unit type.
//
// Draws a medieval fantasy aristocrat/diplomat at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Fancy aristocrat doublet with gold trim
//   • Elegant cape
//   • Cravat or ruffled collar
//   • Fancy hat (beret or ornate cap)
//   • Carries scrolls of paper
//   • Expensive boots
//   • Medallion/necklace

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xf5d0b0;
const COL_SKIN_HI = 0xffe8d6;

const COL_DOUBLET = 0x2e1a47;
const COL_DOUBLET_LT = 0x4a2d6a;
const COL_TRIM = 0xd4af37;
const COL_TRIM_HI = 0xf5d76e;

const COL_CAPE_DK = 0x5c0000;

const COL_CRAVAT = 0xffffff;
const COL_CRAVAT_SH = 0xeeeeee;

const COL_PANT = 0x1a1a2e;

const COL_BOOT = 0x2a1810;

const COL_SCROLL = 0xf5f5dc;
const COL_SCROLL_DK = 0xd4d4aa;
const COL_SCROLL_TIE = 0x8b4513;

const COL_HAIR = 0x3d2314;
const COL_HAIR_LT = 0x5d3324;

const COL_SHADOW = 0x000000;

function drawCircle(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
): void {
  g.fill({ color });
  g.circle(x, y, r);
}

function drawScroll(
  g: Graphics,
  x: number,
  y: number,
  angle: number = 0,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const corners = [
    { dx: -2, dy: -5 },
    { dx: 2, dy: -5 },
    { dx: 2, dy: 5 },
    { dx: -2, dy: 5 },
  ];

  g.fill({ color: COL_SCROLL });
  g.beginPath();
  for (const c of corners) {
    const rx = x + c.dx * cos - c.dy * sin;
    const ry = y + c.dx * sin + c.dy * cos;
    if (c === corners[0]) g.moveTo(rx, ry);
    else g.lineTo(rx, ry);
  }
  g.closePath();
  g.fill();

  g.fill({ color: COL_SCROLL_DK });
  g.rect(x - 2, y - 5, 1, 10);
  g.rect(x + 1, y - 5, 1, 10);
  g.fill();

  g.fill({ color: COL_SCROLL_TIE });
  g.rect(x - 3, y - 1, 6, 1);
  g.fill();
}

export function generateDiplomatFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createDiplomatFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createDiplomatFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleDiplomat(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingDiplomat(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingDiplomat(g, column);
      break;
    case UnitState.CAST:
      drawCastingDiplomat(g, column);
      break;
    case UnitState.DIE:
      drawDyingDiplomat(g, column);
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

function drawIdleDiplomat(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_CAPE_DK });
  g.moveTo(CX - 14, GY - 5);
  g.lineTo(CX - 16, GY + 2);
  g.lineTo(CX + 16, GY + 2);
  g.lineTo(CX + 14, GY - 5);
  g.closePath();

  g.fill({ color: COL_PANT });
  g.rect(CX - 6, GY - 22 + breathe, 5, 20);
  g.rect(CX + 1, GY - 22 + breathe, 5, 20);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 4, 6, 5);
  g.rect(CX + 1, GY - 4, 6, 5);

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 10, GY - 30 + breathe, 20, 18);

  g.fill({ color: COL_DOUBLET_LT });
  g.rect(CX - 8, GY - 28 + breathe, 16, 14);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + breathe, 20, 2);
  g.rect(CX - 10, GY - 14 + breathe, 20, 2);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: COL_TRIM_HI });
    g.circle(CX - 6 + i * 6, GY - 24 + breathe, 1.5);
  }

  g.fill({ color: COL_CRAVAT });
  g.moveTo(CX, GY - 30 + breathe);
  g.lineTo(CX - 4, GY - 26 + breathe);
  g.lineTo(CX + 4, GY - 26 + breathe);
  g.closePath();

  g.fill({ color: COL_CRAVAT_SH });
  g.moveTo(CX, GY - 29 + breathe);
  g.lineTo(CX - 2, GY - 26 + breathe);
  g.lineTo(CX + 2, GY - 26 + breathe);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.rect(CX - 5, GY - 38 + breathe, 10, 10);

  g.fill({ color: COL_SKIN_HI });
  g.rect(CX - 4, GY - 37 + breathe, 8, 8);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 42 + breathe, 12, 6);
  g.circle(CX - 6, GY - 39 + breathe, 3);
  g.circle(CX + 6, GY - 39 + breathe, 3);

  g.fill({ color: COL_HAIR_LT });
  g.rect(CX - 4, GY - 41 + breathe, 8, 4);

  g.fill({ color: 0x222222 });
  g.rect(CX - 2, GY - 35 + breathe, 1.5, 2);
  g.rect(CX + 0.5, GY - 35 + breathe, 1.5, 2);

  g.fill({ color: COL_SKIN });
  drawCircle(g, CX - 6, GY - 30 + breathe, 2, COL_SKIN);
  drawCircle(g, CX + 6, GY - 30 + breathe, 2, COL_SKIN);

  drawScroll(g, CX + 10, GY - 20, -0.2);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 12, GY - 20, 2, 10);
}

function drawWalkingDiplomat(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 4;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_PANT });
  g.rect(CX - 6 - legSwing * 0.3, GY - 22 + bob, 5, 20);
  g.rect(CX + 1 + legSwing * 0.3, GY - 22 + bob, 5, 20);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7 - legSwing * 0.5, GY - 4, 6, 5);
  g.rect(CX + 1 + legSwing * 0.5, GY - 4, 6, 5);

  g.fill({ color: COL_CAPE_DK });
  g.moveTo(CX - 14, GY - 5 + bob);
  g.lineTo(CX - 16 - legSwing * 0.2, GY + 2);
  g.lineTo(CX + 16 + legSwing * 0.2, GY + 2);
  g.lineTo(CX + 14, GY - 5 + bob);
  g.closePath();

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 10, GY - 30 + bob, 20, 18);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + bob, 20, 2);

  g.fill({ color: COL_CRAVAT });
  g.moveTo(CX, GY - 30 + bob);
  g.lineTo(CX - 4, GY - 26 + bob);
  g.lineTo(CX + 4, GY - 26 + bob);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.rect(CX - 5, GY - 38 + bob, 10, 10);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 42 + bob, 12, 6);

  g.fill({ color: 0x222222 });
  g.rect(CX - 2, GY - 35 + bob, 1.5, 2);
  g.rect(CX + 0.5, GY - 35 + bob, 1.5, 2);

  g.fill({ color: COL_SKIN });
  drawCircle(g, CX - 6, GY - 30 + bob, 2, COL_SKIN);
  drawCircle(g, CX + 6, GY - 30 + bob, 2, COL_SKIN);

  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 3;
  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 12, GY - 25 + bob + armSwing, 3, 10);
  g.rect(CX + 9, GY - 25 + bob - armSwing, 3, 10);

  drawScroll(g, CX + 10, GY - 18 - armSwing, -0.2 + armSwing * 0.05);
}

function drawAttackingDiplomat(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 4;
  const armRaise = attackProgress * 8;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_PANT });
  g.rect(CX - 6, GY - 22 + lunge, 5, 20);
  g.rect(CX + 1, GY - 22 + lunge, 5, 20);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 4, 6, 5);
  g.rect(CX + 1, GY - 4, 6, 5);

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 10, GY - 30 + lunge, 20, 18);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + lunge, 20, 2);

  g.fill({ color: COL_CRAVAT });
  g.moveTo(CX, GY - 30 + lunge);
  g.lineTo(CX - 4, GY - 26 + lunge);
  g.lineTo(CX + 4, GY - 26 + lunge);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.rect(CX - 5, GY - 38 + lunge, 10, 10);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 42 + lunge, 12, 6);

  g.fill({ color: 0x222222 });
  g.rect(CX - 2, GY - 35 + lunge, 1.5, 2);
  g.rect(CX + 0.5, GY - 35 + lunge, 1.5, 2);

  g.fill({ color: COL_SKIN });
  drawCircle(g, CX - 6, GY - 30 + lunge, 2, COL_SKIN);
  drawCircle(g, CX + 6, GY - 30 + lunge, 2, COL_SKIN);

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 12, GY - 25 + lunge + armRaise, 3, 10);
  g.rect(CX + 9, GY - 25 + lunge - armRaise, 3, 10);

  g.fill({ color: COL_TRIM });
  g.rect(CX + 6, GY - 28 + lunge - armRaise, 6, 2);
  g.rect(CX + 6, GY - 24 + lunge - armRaise, 6, 2);

  drawScroll(g, CX + 14, GY - 20 - armRaise, -0.5);

  for (let i = 0; i < 3; i++) {
    g.fill({ color: 0xffffff });
    g.circle(CX + 12 + i * 3, GY - 25 - armRaise + i * 2, 1);
  }
}

function drawCastingDiplomat(g: Graphics, frame: number): void {
  const castProgress = frame / 5;
  const raise = castProgress * 5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_PANT });
  g.rect(CX - 6, GY - 22, 5, 20);
  g.rect(CX + 1, GY - 22, 5, 20);

  g.fill({ color: COL_BOOT });
  g.rect(CX - 7, GY - 4, 6, 5);
  g.rect(CX + 1, GY - 4, 6, 5);

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 10, GY - 30, 20, 18);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30, 20, 2);

  g.fill({ color: COL_CRAVAT });
  g.moveTo(CX, GY - 30);
  g.lineTo(CX - 4, GY - 26);
  g.lineTo(CX + 4, GY - 26);
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.rect(CX - 5, GY - 38, 10, 10);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 42, 12, 6);

  g.fill({ color: 0x222222 });
  g.rect(CX - 2, GY - 35, 1.5, 2);
  g.rect(CX + 0.5, GY - 35, 1.5, 2);

  g.fill({ color: COL_SKIN });
  drawCircle(g, CX - 6, GY - 30, 2, COL_SKIN);
  drawCircle(g, CX + 6, GY - 30, 2, COL_SKIN);

  g.fill({ color: COL_DOUBLET });
  g.rect(CX - 12, GY - 25 - raise, 3, 10);
  g.rect(CX + 9, GY - 25 - raise, 3, 10);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 13, GY - 30 - raise, 2, 8);
  g.rect(CX + 11, GY - 30 - raise, 2, 8);

  drawScroll(g, CX - 14, GY - 22 - raise, -0.3);
  drawScroll(g, CX + 16, GY - 22 - raise, 0.3);

  g.fill({ color: 0xd4af37 });
  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.3 + i * 0.5;
    const dist = 10 + castProgress * 15 + i * 3;
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 35 + Math.sin(angle) * dist - raise,
      2,
    );
  }
}

function drawDyingDiplomat(g: Graphics, frame: number): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 25;
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

  g.fill({ color: COL_SHADOW });
  g.ellipse(
    rotX(CX, GY + 1),
    rotY(CX, GY + 1),
    12 - deathProgress * 4,
    3 - deathProgress,
  );

  g.fill({ color: COL_PANT });
  g.rect(rotX(CX - 6, GY - 22 + fall), rotY(CX - 6, GY - 22 + fall), 5, 20);
  g.rect(rotX(CX + 1, GY - 22 + fall), rotY(CX + 1, GY - 22 + fall), 5, 20);

  g.fill({ color: COL_BOOT });
  g.rect(
    rotX(CX - 7, GY - 4 + fall * 0.3),
    rotY(CX - 7, GY - 4 + fall * 0.3),
    6,
    5,
  );
  g.rect(
    rotX(CX + 1, GY - 4 + fall * 0.3),
    rotY(CX + 1, GY - 4 + fall * 0.3),
    6,
    5,
  );

  g.fill({ color: COL_CAPE_DK });
  g.moveTo(rotX(CX - 14, GY - 5 + fall), rotY(CX - 14, GY - 5 + fall));
  g.lineTo(rotX(CX - 16, GY + 2 + fall), rotY(CX - 16, GY + 2 + fall));
  g.lineTo(rotX(CX + 16, GY + 2 + fall), rotY(CX + 16, GY + 2 + fall));
  g.lineTo(rotX(CX + 14, GY - 5 + fall), rotY(CX + 14, GY - 5 + fall));
  g.closePath();

  g.fill({ color: COL_DOUBLET });
  g.rect(rotX(CX - 10, GY - 30 + fall), rotY(CX - 10, GY - 30 + fall), 20, 18);

  g.fill({ color: COL_TRIM });
  g.rect(rotX(CX - 10, GY - 30 + fall), rotY(CX - 10, GY - 30 + fall), 20, 2);

  g.fill({ color: COL_CRAVAT });
  g.moveTo(rotX(CX, GY - 30 + fall), rotY(CX, GY - 30 + fall));
  g.lineTo(rotX(CX - 4, GY - 26 + fall), rotY(CX - 4, GY - 26 + fall));
  g.lineTo(rotX(CX + 4, GY - 26 + fall), rotY(CX + 4, GY - 26 + fall));
  g.closePath();

  g.fill({ color: COL_SKIN });
  g.rect(rotX(CX - 5, GY - 38 + fall), rotY(CX - 5, GY - 38 + fall), 10, 10);

  g.fill({ color: COL_HAIR });
  g.rect(rotX(CX - 6, GY - 42 + fall), rotY(CX - 6, GY - 42 + fall), 12, 6);

  g.fill({ color: 0x222222 });
  g.rect(rotX(CX - 2, GY - 35 + fall), rotY(CX - 2, GY - 35 + fall), 1.5, 2);
  g.rect(
    rotX(CX + 0.5, GY - 35 + fall),
    rotY(CX + 0.5, GY - 35 + fall),
    1.5,
    2,
  );

  drawCircle(
    g,
    rotX(CX - 6, GY - 30 + fall),
    rotY(CX - 6, GY - 30 + fall),
    2,
    COL_SKIN,
  );
  drawCircle(
    g,
    rotX(CX + 6, GY - 30 + fall),
    rotY(CX + 6, GY - 30 + fall),
    2,
    COL_SKIN,
  );

  drawScroll(
    g,
    rotX(CX + 10, GY - 20 + fall),
    rotY(CX + 10, GY - 20 + fall),
    -0.2 + deathProgress,
  );
}
