// Procedural sprite generator for the Constructionist unit type.
//
// Draws a medieval fantasy mage with brown robes at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 8, DIE 7).
//
// Visual features:
//   • Brown/earth-tone mage robes
//   • Hood
//   • Carries a staff
//   • Builds/summons golems

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xf5d0b0;

const COL_ROBE = 0x5c4033;
const COL_ROBE_DK = 0x3d2a22;
const COL_ROBE_LT = 0x7a5a45;

const COL_ROBE_BRWN_LT = 0x8b6443;

const COL_TRIM = 0xd4af37;
const COL_TRIM_DK = 0xaa8822;

const COL_HAIR = 0x3d2314;

const COL_STAFF = 0x4a3728;
const COL_STAFF_TOP = 0x886633;

const COL_EYE = 0x88ff88;
const COL_EYE_PUPIL = 0x224422;

const COL_SHADOW = 0x000000;

const COL_MAGIC = 0xaa8844;
const COL_MAGIC_LT = 0xccaa66;

export function generateConstructionistFrames(
  renderer: Renderer,
): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createConstructionistFrame(renderer, state, col);
      frames.push(texture);
    }
  }

  return frames;
}

function createConstructionistFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleConstructionist(g, column);
      break;
    case UnitState.MOVE:
      drawWalkingConstructionist(g, column);
      break;
    case UnitState.ATTACK:
      drawAttackingConstructionist(g, column);
      break;
    case UnitState.CAST:
      drawCastingConstructionist(g, column);
      break;
    case UnitState.DIE:
      drawDyingConstructionist(g, column);
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

function drawIdleConstructionist(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 0.5;
  const glow = (Math.sin(frame * 0.4) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 8, GY - 8, 16, 12);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 28 + breathe, 20, 22);
  g.rect(CX - 7, GY - 6, 14, 6);

  g.fill({ color: COL_ROBE_BRWN_LT });
  g.rect(CX - 8, GY - 26 + breathe, 16, 18);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 9, GY - 30 + breathe, 18, 4);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + breathe, 20, 2);
  g.rect(CX - 10, GY - 10 + breathe, 20, 2);

  for (let i = 0; i < 4; i++) {
    g.fill({ color: COL_TRIM_DK });
    g.circle(CX - 7 + i * 5, GY - 26 + breathe, 1.5);
  }

  g.fill({ color: COL_ROBE_LT });
  g.rect(CX - 8, GY - 35 + breathe, 16, 8);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 38 + breathe, 12, 5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 33 + breathe, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31 + breathe, 1.5);
  g.circle(CX + 2, GY - 31 + breathe, 1.5);

  g.fill({ color: COL_EYE_PUPIL });
  g.circle(CX - 2, GY - 31 + breathe, 0.8);
  g.circle(CX + 2, GY - 31 + breathe, 0.8);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 25 + breathe, 3, 12);
  g.rect(CX + 7, GY - 25 + breathe, 3, 12);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 20 + breathe, 4, 8);
  g.rect(CX + 7, GY - 20 + breathe, 4, 8);

  g.fill({ color: COL_STAFF });
  g.rect(CX + 12, GY - 35, 2, 35);

  g.fill({ color: COL_STAFF_TOP });
  g.circle(CX + 12, GY - 37, 3);

  if (glow > 0.6) {
    g.fill({ color: COL_MAGIC_LT });
    g.circle(CX + 12, GY - 37, 4);
  }
}

function drawWalkingConstructionist(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;
  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 8, GY - 8 + bob, 16, 12);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 28 + bob, 20, 22);
  g.rect(CX - 7, GY - 6 + bob, 14, 6);

  g.fill({ color: COL_ROBE_BRWN_LT });
  g.rect(CX - 8, GY - 26 + bob, 16, 18);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 9, GY - 30 + bob, 18, 4);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + bob, 20, 2);

  g.fill({ color: COL_ROBE_LT });
  g.rect(CX - 8, GY - 35 + bob, 16, 8);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 38 + bob, 12, 5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 33 + bob, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31 + bob, 1.5);
  g.circle(CX + 2, GY - 31 + bob, 1.5);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 25 + bob + armSwing * 0.5, 3, 12);
  g.rect(CX + 7, GY - 25 + bob - armSwing * 0.5, 3, 12);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 20 + bob + armSwing, 4, 8);
  g.rect(CX + 7, GY - 20 + bob - armSwing, 4, 8);

  g.fill({ color: COL_STAFF });
  g.rect(CX + 12, GY - 35 + bob, 2, 35);

  g.fill({ color: COL_STAFF_TOP });
  g.circle(CX + 12, GY - 37 + bob, 3);
}

function drawAttackingConstructionist(g: Graphics, frame: number): void {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 4;
  const staffSwing = attackProgress * 10;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 8, GY - 8 + lunge, 16, 12);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 28 + lunge, 20, 22);
  g.rect(CX - 7, GY - 6 + lunge, 14, 6);

  g.fill({ color: COL_ROBE_BRWN_LT });
  g.rect(CX - 8, GY - 26 + lunge, 16, 18);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 9, GY - 30 + lunge, 18, 4);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 + lunge, 20, 2);

  g.fill({ color: COL_ROBE_LT });
  g.rect(CX - 8, GY - 35 + lunge, 16, 8);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 38 + lunge, 12, 5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 33 + lunge, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31 + lunge, 1.5);
  g.circle(CX + 2, GY - 31 + lunge, 1.5);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 25 + lunge + staffSwing * 0.3, 3, 12);
  g.rect(CX + 7, GY - 25 + lunge - staffSwing * 0.3, 3, 12);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 20 + lunge + staffSwing, 4, 8);
  g.rect(CX + 7, GY - 20 + lunge - staffSwing, 4, 8);

  g.fill({ color: COL_STAFF });
  g.rect(CX + 12 + staffSwing, GY - 40 + lunge, 2, 35);

  g.fill({ color: COL_STAFF_TOP });
  g.circle(CX + 12 + staffSwing, GY - 42 + lunge, 4);

  for (let i = 0; i < 4; i++) {
    g.fill({ color: COL_MAGIC });
    g.circle(
      CX + 10 + i * 3 + staffSwing,
      GY - 40 + lunge - i * 2,
      2 - i * 0.3,
    );
  }
}

function drawCastingConstructionist(g: Graphics, frame: number): void {
  const castProgress = frame / 7;
  const raise = castProgress * 6;
  const pulse = (Math.sin(frame * 0.5) + 1) * 0.5;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 1, 12, 3);

  for (let i = 0; i < 5; i++) {
    const angle = frame * 0.2 + i * 1.2;
    const dist = 6 + castProgress * 12 + i * 3;
    const alpha = (1 - i * 0.15) * (0.3 + pulse * 0.3);
    g.fill({ color: COL_MAGIC_LT, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 25 + Math.sin(angle) * dist * 0.5 - raise,
      3 - i * 0.4,
    );
  }

  g.fill({ color: COL_ROBE_DK });
  g.rect(CX - 8, GY - 8, 16, 12);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 28, 20, 22);
  g.rect(CX - 7, GY - 6, 14, 6);

  g.fill({ color: COL_ROBE_BRWN_LT });
  g.rect(CX - 8, GY - 26, 16, 18);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 9, GY - 30 - raise, 18, 4);

  g.fill({ color: COL_TRIM });
  g.rect(CX - 10, GY - 30 - raise, 20, 2);

  g.fill({ color: COL_ROBE_LT });
  g.rect(CX - 8, GY - 35 - raise, 16, 8);

  g.fill({ color: COL_HAIR });
  g.rect(CX - 6, GY - 38, 12, 5);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 4, GY - 33, 8, 6);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, GY - 31, 2);
  g.circle(CX + 2, GY - 31, 2);

  g.fill({ color: COL_MAGIC_LT });
  g.circle(CX - 2, GY - 31, 2.5);
  g.circle(CX + 2, GY - 31, 2.5);

  g.fill({ color: COL_ROBE });
  g.rect(CX - 10, GY - 25 - raise, 3, 12);
  g.rect(CX + 7, GY - 25 - raise, 3, 12);

  g.fill({ color: COL_SKIN });
  g.rect(CX - 11, GY - 20 - raise, 4, 10);
  g.rect(CX + 7, GY - 20 - raise, 4, 10);

  g.fill({ color: COL_STAFF });
  g.rect(CX + 12, GY - 35 - raise, 2, 35);

  g.fill({ color: COL_STAFF_TOP });
  g.circle(CX + 12, GY - 37 - raise, 4 + pulse * 2);

  g.fill({ color: COL_MAGIC });
  g.circle(CX + 12, GY - 37 - raise, 5 + pulse * 3);
}

function drawDyingConstructionist(g: Graphics, frame: number): void {
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

  g.fill({ color: COL_SHADOW });
  g.ellipse(
    rotX(CX, GY + 1),
    rotY(CX, GY + 1),
    12 - deathProgress * 4,
    3 - deathProgress,
  );

  g.fill({ color: COL_ROBE_DK });
  g.rect(rotX(CX - 8, GY - 8 + fall), rotY(CX - 8, GY - 8 + fall), 16, 12);

  g.fill({ color: COL_ROBE });
  g.rect(rotX(CX - 10, GY - 28 + fall), rotY(CX - 10, GY - 28 + fall), 20, 22);

  g.fill({ color: COL_ROBE_BRWN_LT });
  g.rect(rotX(CX - 8, GY - 26 + fall), rotY(CX - 8, GY - 26 + fall), 16, 18);

  g.fill({ color: COL_ROBE });
  g.rect(rotX(CX - 9, GY - 30 + fall), rotY(CX - 9, GY - 30 + fall), 18, 4);

  g.fill({ color: COL_TRIM });
  g.rect(rotX(CX - 10, GY - 30 + fall), rotY(CX - 10, GY - 30 + fall), 20, 2);

  g.fill({ color: COL_ROBE_LT });
  g.rect(rotX(CX - 8, GY - 35 + fall), rotY(CX - 8, GY - 35 + fall), 16, 8);

  g.fill({ color: COL_HAIR });
  g.rect(rotX(CX - 6, GY - 38 + fall), rotY(CX - 6, GY - 38 + fall), 12, 5);

  g.fill({ color: COL_SKIN });
  g.rect(rotX(CX - 4, GY - 33 + fall), rotY(CX - 4, GY - 33 + fall), 8, 6);

  if (deathProgress > 0.4) {
    g.fill({ color: 0x444444 });
    g.circle(rotX(CX - 2, GY - 31 + fall), rotY(CX - 2, GY - 31 + fall), 1);
    g.circle(rotX(CX + 2, GY - 31 + fall), rotY(CX + 2, GY - 31 + fall), 1);
  } else {
    g.fill({ color: COL_EYE });
    g.circle(rotX(CX - 2, GY - 31 + fall), rotY(CX - 2, GY - 31 + fall), 1.5);
    g.circle(rotX(CX + 2, GY - 31 + fall), rotY(CX + 2, GY - 31 + fall), 1.5);
  }

  g.fill({ color: COL_STAFF });
  g.rect(rotX(CX + 12, GY - 35 + fall), rotY(CX + 12, GY - 35 + fall), 2, 35);

  g.fill({ color: COL_STAFF_TOP });
  g.circle(rotX(CX + 12, GY - 37 + fall), rotY(CX + 12, GY - 37 + fall), 3);
}
