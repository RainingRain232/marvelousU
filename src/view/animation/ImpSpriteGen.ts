// Procedural sprite generator for the Imp unit types.
//
// Draws a small imp at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Small body with imp-like features
//   • Horns on head
//   • Pointed tail
//   • Wings (smaller than pixie)
//   • Floats above the ground
//   • Stretches arms for magic casting
//   • Different color schemes for fire (red), ice (blue), lightning (yellow)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 6;

export interface ImpPalette {
  skin: number;
  skinDark: number;
  skinLight: number;
  wing: number;
  wingDark: number;
  wingLight: number;
  horn: number;
  accent: number;
  projectile: number;
}

export const PALETTE_FIRE_IMP: ImpPalette = {
  skin: 0xcc3333,
  skinDark: 0xaa2222,
  skinLight: 0xee4444,
  wing: 0xff6644,
  wingDark: 0xcc4422,
  wingLight: 0xffaa66,
  horn: 0x442200,
  accent: 0xffaa00,
  projectile: 0xff4400,
};

export const PALETTE_ICE_IMP: ImpPalette = {
  skin: 0x6699cc,
  skinDark: 0x447799,
  skinLight: 0x88bbff,
  wing: 0x88ccff,
  wingDark: 0x5588aa,
  wingLight: 0xbbddff,
  horn: 0x224466,
  accent: 0x00ccff,
  projectile: 0x44aaff,
};

export const PALETTE_LIGHTNING_IMP: ImpPalette = {
  skin: 0xcccc44,
  skinDark: 0xaaaa33,
  skinLight: 0xeeee66,
  wing: 0xffff88,
  wingDark: 0xcccc66,
  wingLight: 0xffffaa,
  horn: 0x666622,
  accent: 0xffff00,
  projectile: 0xffdd00,
};

export const PALETTE_DISTORTION_IMP: ImpPalette = {
  skin: 0x9966cc,
  skinDark: 0x7744aa,
  skinLight: 0xbbaadd,
  wing: 0xcc88ff,
  wingDark: 0x9966cc,
  wingLight: 0xeeccff,
  horn: 0x442266,
  accent: 0xff66ff,
  projectile: 0xaa44ff,
};

const COL_EYE = 0x222222;
const COL_EYE_WHITE = 0xffffff;
const COL_TAIL_TIP = 0x222222;
const COL_SHADOW = 0x000000;

export function generateFireImpFrames(renderer: Renderer): RenderTexture[] {
  return generateImpFrames(renderer, PALETTE_FIRE_IMP);
}

export function generateIceImpFrames(renderer: Renderer): RenderTexture[] {
  return generateImpFrames(renderer, PALETTE_ICE_IMP);
}

export function generateLightningImpFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateImpFrames(renderer, PALETTE_LIGHTNING_IMP);
}

export function generateDistortionImpFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateImpFrames(renderer, PALETTE_DISTORTION_IMP);
}

function generateImpFrames(
  renderer: Renderer,
  palette: ImpPalette,
): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createImpFrame(renderer, state, col, palette);
      frames.push(texture);
    }
  }

  return frames;
}

function createImpFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
  palette: ImpPalette,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleImp(g, column, palette);
      break;
    case UnitState.MOVE:
      drawFlyingImp(g, column, palette);
      break;
    case UnitState.ATTACK:
      drawAttackingImp(g, column, palette);
      break;
    case UnitState.CAST:
      drawAttackingImp(g, column, palette);
      break;
    case UnitState.DIE:
      drawDyingImp(g, column, palette);
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

function drawTail(g: Graphics, offset: number, bodyY: number): void {
  g.fill({ color: COL_TAIL_TIP });
  g.moveTo(CX - 6 + offset, bodyY + 4);
  g.lineTo(CX - 14 + offset, bodyY + 10);
  g.lineTo(CX - 12 + offset, bodyY + 6);
  g.closePath();
}

function drawWings(
  g: Graphics,
  flap: number,
  bodyY: number,
  palette: ImpPalette,
): void {
  g.fill({ color: palette.wingDark, alpha: 0.6 });
  g.ellipse(CX - 10, bodyY - 4 - flap * 4, 6, 10 - flap * 2);
  g.ellipse(CX + 10, bodyY - 4 - flap * 4, 6, 10 - flap * 2);

  g.fill({ color: palette.wing, alpha: 0.7 });
  g.ellipse(CX - 9, bodyY - 4 - flap * 3, 4, 8 - flap);
  g.ellipse(CX + 9, bodyY - 4 - flap * 3, 4, 8 - flap);

  g.fill({ color: palette.wingLight, alpha: 0.5 });
  g.ellipse(CX - 8, bodyY - 3 - flap * 2, 2, 5);
  g.ellipse(CX + 8, bodyY - 3 - flap * 2, 2, 5);
}

function drawIdleImp(g: Graphics, frame: number, palette: ImpPalette): void {
  const hover = Math.sin(frame * 0.4) * 2;
  const wingFlap = Math.sin(frame * 0.6) * 0.3;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 4, 10, 3);

  const bodyY = GY - 16 + hover;

  drawTail(g, 0, bodyY);
  drawWings(g, wingFlap, bodyY, palette);

  g.fill({ color: palette.skinDark });
  g.ellipse(CX, bodyY + 3, 8, 7);

  g.fill({ color: palette.skin });
  g.ellipse(CX, bodyY + 1, 7, 6);

  g.fill({ color: palette.skinLight });
  g.ellipse(CX, bodyY - 1, 5, 4);

  g.fill({ color: palette.horn });
  g.moveTo(CX - 4, bodyY - 8);
  g.lineTo(CX - 7, bodyY - 14);
  g.lineTo(CX - 3, bodyY - 9);
  g.closePath();

  g.moveTo(CX + 4, bodyY - 8);
  g.lineTo(CX + 7, bodyY - 14);
  g.lineTo(CX + 3, bodyY - 9);
  g.closePath();

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 5, 1.5);
  g.circle(CX + 2, bodyY - 5, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 5, 0.8);
  g.circle(CX + 2, bodyY - 5, 0.8);

  g.fill({ color: palette.skin });
  g.ellipse(CX - 6, bodyY, 2, 5);
  g.ellipse(CX + 6, bodyY, 2, 5);

  const armWave = Math.sin(frame * 0.4) * 1;
  g.fill({ color: palette.skin });
  g.rect(CX - 8, bodyY - 2 + armWave, 2, 6);
  g.rect(CX + 6, bodyY - 2 - armWave, 2, 6);

  g.fill({ color: palette.accent, alpha: 0.3 });
  g.circle(CX - 8, bodyY - 2 + armWave, 3);
  g.circle(CX + 8, bodyY - 2 - armWave, 3);
}

function drawFlyingImp(g: Graphics, frame: number, palette: ImpPalette): void {
  const flyCycle = (frame % 8) / 8;
  const hover = Math.sin(flyCycle * Math.PI * 2) * 3;
  const wingFlap = Math.sin(flyCycle * Math.PI * 4) * 0.4;

  g.fill({ color: COL_SHADOW, alpha: 0.5 });
  g.ellipse(CX, GY + 4, 8, 2);

  const bodyY = GY - 18 + hover;

  drawTail(g, 0, bodyY);
  drawWings(g, wingFlap, bodyY, palette);

  g.fill({ color: palette.skinDark });
  g.ellipse(CX, bodyY + 3, 8, 7);

  g.fill({ color: palette.skin });
  g.ellipse(CX, bodyY + 1, 7, 6);

  g.fill({ color: palette.skinLight });
  g.ellipse(CX, bodyY - 1, 5, 4);

  g.fill({ color: palette.horn });
  g.moveTo(CX - 4, bodyY - 8);
  g.lineTo(CX - 7, bodyY - 14);
  g.lineTo(CX - 3, bodyY - 9);
  g.closePath();

  g.moveTo(CX + 4, bodyY - 8);
  g.lineTo(CX + 7, bodyY - 14);
  g.lineTo(CX + 3, bodyY - 9);
  g.closePath();

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 5, 1.5);
  g.circle(CX + 2, bodyY - 5, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 5, 0.8);
  g.circle(CX + 2, bodyY - 5, 0.8);

  g.fill({ color: palette.skin });
  g.ellipse(CX - 6, bodyY, 2, 5);
  g.ellipse(CX + 6, bodyY, 2, 5);

  const armWave = Math.sin(flyCycle * Math.PI * 4) * 2;
  g.fill({ color: palette.skin });
  g.rect(CX - 8, bodyY - 2 + armWave, 2, 6);
  g.rect(CX + 6, bodyY - 2 - armWave, 2, 6);

  g.fill({ color: palette.accent, alpha: 0.3 });
  g.circle(CX - 8, bodyY - 2 + armWave, 3);
  g.circle(CX + 8, bodyY - 2 - armWave, 3);
}

function drawAttackingImp(
  g: Graphics,
  frame: number,
  palette: ImpPalette,
): void {
  const attackProgress = frame / 7;
  const hover = Math.sin(frame * 0.4) * 2;
  const wingFlap = Math.sin(frame * 0.3) * 0.2;

  g.fill({ color: COL_SHADOW });
  g.ellipse(CX, GY + 4, 10, 3);

  const bodyY = GY - 16 + hover;

  drawTail(g, attackProgress * 2, bodyY);
  drawWings(g, wingFlap, bodyY, palette);

  g.fill({ color: palette.skinDark });
  g.ellipse(CX, bodyY + 3, 8, 7);

  g.fill({ color: palette.skin });
  g.ellipse(CX, bodyY + 1, 7, 6);

  g.fill({ color: palette.skinLight });
  g.ellipse(CX, bodyY - 1, 5, 4);

  const hornTilt = attackProgress * 2;
  g.fill({ color: palette.horn });
  g.moveTo(CX - 4 - hornTilt, bodyY - 8);
  g.lineTo(CX - 7 - hornTilt, bodyY - 14);
  g.lineTo(CX - 3 - hornTilt, bodyY - 9);
  g.closePath();

  g.moveTo(CX + 4 + hornTilt, bodyY - 8);
  g.lineTo(CX + 7 + hornTilt, bodyY - 14);
  g.lineTo(CX + 3 + hornTilt, bodyY - 9);
  g.closePath();

  g.fill({ color: COL_EYE_WHITE });
  g.circle(CX - 2, bodyY - 5, 1.5);
  g.circle(CX + 2, bodyY - 5, 1.5);

  g.fill({ color: COL_EYE });
  g.circle(CX - 2, bodyY - 5, 0.8);
  g.circle(CX + 2, bodyY - 5, 0.8);

  g.fill({ color: palette.skin });
  g.ellipse(CX - 6, bodyY, 2, 5);
  g.ellipse(CX + 6, bodyY, 2, 5);

  const armExtend = attackProgress * 8;
  g.fill({ color: palette.skin });
  g.rect(CX - 8 - armExtend, bodyY - 1, 2, 5);
  g.rect(CX + 6 + armExtend, bodyY - 1, 2, 5);

  if (attackProgress > 0.3) {
    const projectileIntensity = Math.sin(attackProgress * Math.PI) * 0.8;
    const projectileX = CX + 10 + armExtend;
    const projectileY = bodyY - 1;

    g.fill({ color: palette.projectile, alpha: projectileIntensity * 0.8 });
    g.circle(projectileX, projectileY, 5 - attackProgress * 2);

    g.fill({ color: palette.accent, alpha: projectileIntensity * 0.6 });
    g.circle(projectileX, projectileY, 3 - attackProgress);

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + frame * 0.5;
      const dist = 4 + Math.sin(frame * 0.8 + i) * 2;
      g.fill({ color: palette.accent, alpha: projectileIntensity * 0.5 });
      g.circle(
        projectileX + Math.cos(angle) * dist,
        projectileY + Math.sin(angle) * dist,
        1.5 - i * 0.4,
      );
    }
  }
}

function drawDyingImp(g: Graphics, frame: number, palette: ImpPalette): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const fade = 1 - deathProgress;

  g.alpha = fade;

  g.fill({ color: COL_SHADOW, alpha: 1 - deathProgress });
  g.ellipse(CX, GY + 4 + fall * 0.5, 10 - deathProgress * 5, 3 - deathProgress);

  const bodyY = GY - 16 + fall;

  drawTail(g, 0, bodyY);

  const wingFall = deathProgress * 0.5;
  g.fill({ color: palette.wingDark, alpha: 0.6 * fade });
  g.ellipse(CX - 10, bodyY - 4 - wingFall * 4, 6, 10 - wingFall * 2);
  g.ellipse(CX + 10, bodyY - 4 - wingFall * 4, 6, 10 - wingFall * 2);

  g.fill({ color: palette.skinDark });
  g.ellipse(CX, bodyY + 3, 8, 7);

  g.fill({ color: palette.skin });
  g.ellipse(CX, bodyY + 1, 7, 6);

  g.fill({ color: palette.horn });
  g.moveTo(CX - 4, bodyY - 8);
  g.lineTo(CX - 7, bodyY - 14);
  g.lineTo(CX - 3, bodyY - 9);
  g.closePath();

  g.moveTo(CX + 4, bodyY - 8);
  g.lineTo(CX + 7, bodyY - 14);
  g.lineTo(CX + 3, bodyY - 9);
  g.closePath();

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333333 });
  } else {
    g.fill({ color: COL_EYE_WHITE });
  }
  g.circle(CX - 2, bodyY - 5, 1.5);
  g.circle(CX + 2, bodyY - 5, 1.5);

  if (deathProgress < 0.5) {
    g.fill({ color: COL_EYE });
    g.circle(CX - 2, bodyY - 5, 0.8);
    g.circle(CX + 2, bodyY - 5, 0.8);
  }
}
