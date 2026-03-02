// Procedural sprite generator for Adept Mage unit types.
//
// Draws an adept mage at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Robed mage figure
//   • White beard
//   • Extra detailed robes with trim
//   • Pointed hat
//   • Different color schemes for fire, ice, lightning, distortion

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

export interface AdeptMagePalette {
  robe: number;
  robeDark: number;
  robeLight: number;
  trim: number;
  hat: number;
  hatTrim: number;
  skin: number;
  beard: number;
  eye: number;
}

export const PALETTE_FIRE_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0xcc3322,
  robeDark: 0x992211,
  robeLight: 0xee5544,
  trim: 0xffcc00,
  hat: 0xcc3322,
  hatTrim: 0xffcc00,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_COLD_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0x3388cc,
  robeDark: 0x225577,
  robeLight: 0x55aaff,
  trim: 0xccffff,
  hat: 0x3388cc,
  hatTrim: 0xccffff,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_LIGHTNING_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0xccaa33,
  robeDark: 0x997711,
  robeLight: 0xeecc55,
  trim: 0xffffaa,
  hat: 0xccaa33,
  hatTrim: 0xffffaa,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_DISTORTION_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0x8844cc,
  robeDark: 0x552288,
  robeLight: 0xaa66ee,
  trim: 0xff88ff,
  hat: 0x8844cc,
  hatTrim: 0xff88ff,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_FIRE_MASTER_MAGE: AdeptMagePalette = {
  robe: 0xaa2211,
  robeDark: 0x771100,
  robeLight: 0xcc4433,
  trim: 0xffdd44,
  hat: 0xaa2211,
  hatTrim: 0xffdd44,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_COLD_MASTER_MAGE: AdeptMagePalette = {
  robe: 0x2266aa,
  robeDark: 0x113366,
  robeLight: 0x4488cc,
  trim: 0xaaddff,
  hat: 0x2266aa,
  hatTrim: 0xaaddff,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_LIGHTNING_MASTER_MAGE: AdeptMagePalette = {
  robe: 0xaa8811,
  robeDark: 0x775500,
  robeLight: 0xccaa33,
  trim: 0xffff88,
  hat: 0xaa8811,
  hatTrim: 0xffff88,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export const PALETTE_DISTORTION_MASTER_MAGE: AdeptMagePalette = {
  robe: 0x662288,
  robeDark: 0x441166,
  robeLight: 0x8844aa,
  trim: 0xdd66ff,
  hat: 0x662288,
  hatTrim: 0xdd66ff,
  skin: 0xe8b89d,
  beard: 0xffffff,
  eye: 0x222222,
};

export function generateFireAdeptMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_FIRE_ADEPT_MAGE);
}

export function generateColdAdeptMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_COLD_ADEPT_MAGE);
}

export function generateLightningAdeptMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_LIGHTNING_ADEPT_MAGE);
}

export function generateDistortionAdeptMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_DISTORTION_ADEPT_MAGE);
}

export function generateFireMasterMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_FIRE_MASTER_MAGE);
}

export function generateColdMasterMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_COLD_MASTER_MAGE);
}

export function generateLightningMasterMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_LIGHTNING_MASTER_MAGE);
}

export function generateDistortionMasterMageFrames(
  renderer: Renderer,
): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_DISTORTION_MASTER_MAGE);
}

function generateAdeptMageFrames(
  renderer: Renderer,
  palette: AdeptMagePalette,
): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createAdeptMageFrame(renderer, state, col, palette);
      frames.push(texture);
    }
  }

  return frames;
}

function createAdeptMageFrame(
  renderer: Renderer,
  state: UnitState,
  column: number,
  palette: AdeptMagePalette,
): RenderTexture {
  const g = new Graphics();
  g.clear();

  switch (state) {
    case UnitState.IDLE:
      drawIdleAdeptMage(g, column, palette);
      break;
    case UnitState.MOVE:
      drawWalkingAdeptMage(g, column, palette);
      break;
    case UnitState.ATTACK:
    case UnitState.CAST:
      drawCastingAdeptMage(g, column, palette);
      break;
    case UnitState.DIE:
      drawDyingAdeptMage(g, column, palette);
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

function drawIdleAdeptMage(
  g: Graphics,
  frame: number,
  palette: AdeptMagePalette,
): void {
  const breathe = Math.sin(frame * 0.25) * 0.5;

  g.fill({ color: 0x000000, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 12, 4);

  const baseY = GY - 12 + breathe;

  g.fill({ color: palette.robeDark });
  g.rect(CX - 8, baseY - 4, 16, 24);

  g.fill({ color: palette.robe });
  g.rect(CX - 6, baseY - 2, 12, 22);

  g.fill({ color: palette.trim });
  g.rect(CX - 8, baseY - 4, 2, 24);
  g.rect(CX + 6, baseY - 4, 2, 24);

  g.fill({ color: palette.robeDark });
  g.rect(CX - 10, baseY + 12, 4, 10);
  g.rect(CX + 6, baseY + 12, 4, 10);

  g.fill({ color: palette.trim });
  g.rect(CX - 10, baseY + 12, 1, 10);
  g.rect(CX + 9, baseY + 12, 1, 10);

  g.fill({ color: palette.skin });
  g.circle(CX, baseY - 8, 6);

  g.fill({ color: palette.beard });
  g.moveTo(CX - 5, baseY - 6);
  g.lineTo(CX, baseY + 2);
  g.lineTo(CX + 5, baseY - 6);
  g.closePath();

  g.fill({ color: palette.hat });
  g.moveTo(CX - 8, baseY - 10);
  g.lineTo(CX, baseY - 26);
  g.lineTo(CX + 8, baseY - 10);
  g.closePath();

  g.fill({ color: palette.hatTrim });
  g.rect(CX - 7, baseY - 11, 14, 2);
  g.rect(CX - 1, baseY - 25, 2, 4);

  g.fill({ color: palette.eye });
  g.circle(CX - 2, baseY - 9, 1);
  g.circle(CX + 2, baseY - 9, 1);

  g.fill({ color: palette.skin });
  g.rect(CX - 8, baseY - 2, 3, 8);
  g.rect(CX + 5, baseY - 2, 3, 8);

  const staffBob = Math.sin(frame * 0.3) * 1;
  g.fill({ color: 0x5c4033 });
  g.rect(CX + 12, baseY - 20 + staffBob, 2, 28);

  g.fill({ color: palette.trim });
  g.rect(CX + 11, baseY - 20 + staffBob, 4, 3);

  g.fill({ color: palette.robeLight, alpha: 0.5 });
  g.circle(CX + 12, baseY - 18 + staffBob, 3);
}

function drawWalkingAdeptMage(
  g: Graphics,
  frame: number,
  palette: AdeptMagePalette,
): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 2;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 3;

  g.fill({ color: 0x000000, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 12, 4);

  const baseY = GY - 12 + bob;

  g.fill({ color: palette.robeDark });
  g.rect(CX - 8, baseY - 4, 16, 24);

  g.fill({ color: palette.robe });
  g.rect(CX - 6, baseY - 2, 12, 22);

  g.fill({ color: palette.trim });
  g.rect(CX - 8, baseY - 4, 2, 24);
  g.rect(CX + 6, baseY - 4, 2, 24);

  g.fill({ color: palette.robeDark });
  g.rect(CX - 10 - legSwing * 0.3, baseY + 12, 4, 10);
  g.rect(CX + 6 + legSwing * 0.3, baseY + 12, 4, 10);

  g.fill({ color: palette.trim });
  g.rect(CX - 10 - legSwing * 0.3, baseY + 12, 1, 10);
  g.rect(CX + 9 + legSwing * 0.3, baseY + 12, 1, 10);

  g.fill({ color: palette.skin });
  g.circle(CX, baseY - 8, 6);

  g.fill({ color: palette.beard });
  g.moveTo(CX - 5, baseY - 6);
  g.lineTo(CX, baseY + 2);
  g.lineTo(CX + 5, baseY - 6);
  g.closePath();

  g.fill({ color: palette.hat });
  g.moveTo(CX - 8, baseY - 10);
  g.lineTo(CX, baseY - 26);
  g.lineTo(CX + 8, baseY - 10);
  g.closePath();

  g.fill({ color: palette.hatTrim });
  g.rect(CX - 7, baseY - 11, 14, 2);
  g.rect(CX - 1, baseY - 25, 2, 4);

  g.fill({ color: palette.eye });
  g.circle(CX - 2, baseY - 9, 1);
  g.circle(CX + 2, baseY - 9, 1);

  g.fill({ color: palette.skin });
  g.rect(CX - 8, baseY - 2 + legSwing * 0.2, 3, 8);
  g.rect(CX + 5, baseY - 2 - legSwing * 0.2, 3, 8);

  g.fill({ color: 0x5c4033 });
  g.rect(CX + 12, baseY - 20 + bob, 2, 28);

  g.fill({ color: palette.trim });
  g.rect(CX + 11, baseY - 20 + bob, 4, 3);

  g.fill({ color: palette.robeLight, alpha: 0.5 });
  g.circle(CX + 12, baseY - 18 + bob, 3);
}

function drawCastingAdeptMage(
  g: Graphics,
  frame: number,
  palette: AdeptMagePalette,
): void {
  const castProgress = frame / 5;
  const castBob = Math.sin(castProgress * Math.PI) * 2;

  g.fill({ color: 0x000000, alpha: 0.3 });
  g.ellipse(CX, GY + 2, 12, 4);

  const baseY = GY - 12 + castBob;

  g.fill({ color: palette.robeDark });
  g.rect(CX - 8, baseY - 4, 16, 24);

  g.fill({ color: palette.robe });
  g.rect(CX - 6, baseY - 2, 12, 22);

  g.fill({ color: palette.trim });
  g.rect(CX - 8, baseY - 4, 2, 24);
  g.rect(CX + 6, baseY - 4, 2, 24);

  g.fill({ color: palette.robeDark });
  g.rect(CX - 10, baseY + 12, 4, 10);
  g.rect(CX + 6, baseY + 12, 4, 10);

  g.fill({ color: palette.trim });
  g.rect(CX - 10, baseY + 12, 1, 10);
  g.rect(CX + 9, baseY + 12, 1, 10);

  g.fill({ color: palette.skin });
  g.circle(CX, baseY - 8, 6);

  g.fill({ color: palette.beard });
  g.moveTo(CX - 5, baseY - 6);
  g.lineTo(CX, baseY + 2 + castBob * 0.5);
  g.lineTo(CX + 5, baseY - 6);
  g.closePath();

  g.fill({ color: palette.hat });
  g.moveTo(CX - 8, baseY - 10);
  g.lineTo(CX, baseY - 26);
  g.lineTo(CX + 8, baseY - 10);
  g.closePath();

  g.fill({ color: palette.hatTrim });
  g.rect(CX - 7, baseY - 11, 14, 2);
  g.rect(CX - 1, baseY - 25, 2, 4);

  g.fill({ color: palette.eye });
  g.circle(CX - 2, baseY - 9, 1);
  g.circle(CX + 2, baseY - 9, 1);

  g.fill({ color: palette.skin });
  const armExtend = castProgress * 6;
  g.rect(CX - 8 - armExtend, baseY - 2, 3, 8);
  g.rect(CX + 5 + armExtend, baseY - 2, 3, 8);

  g.fill({ color: palette.robeLight, alpha: 0.6 + castProgress * 0.3 });
  g.circle(CX + 8 + armExtend, baseY, 5 + castProgress * 3);
  g.circle(CX - 8 - armExtend, baseY, 4 + castProgress * 2);
}

function drawDyingAdeptMage(
  g: Graphics,
  frame: number,
  palette: AdeptMagePalette,
): void {
  const deathProgress = frame / 6;
  const fall = deathProgress * 20;
  const fade = 1 - deathProgress;

  g.alpha = fade;

  g.fill({ color: 0x000000, alpha: 0.3 * fade });
  g.ellipse(CX, GY + 2 + fall * 0.5, 12 - deathProgress * 4, 4 - deathProgress);

  const baseY = GY - 12 + fall;

  g.fill({ color: palette.robeDark });
  g.rect(CX - 8, baseY - 4, 16, 24);

  g.fill({ color: palette.robe });
  g.rect(CX - 6, baseY - 2, 12, 22);

  g.fill({ color: palette.skin });
  g.circle(CX, baseY - 8, 6);

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333333 });
  } else {
    g.fill({ color: palette.beard });
  }
  g.moveTo(CX - 5, baseY - 6);
  g.lineTo(CX, baseY + 2);
  g.lineTo(CX + 5, baseY - 6);
  g.closePath();

  g.fill({ color: palette.hat });
  g.moveTo(CX - 8, baseY - 10);
  g.lineTo(CX, baseY - 26);
  g.lineTo(CX + 8, baseY - 10);
  g.closePath();

  if (deathProgress > 0.5) {
    g.fill({ color: 0x333333 });
  } else {
    g.fill({ color: palette.eye });
    g.circle(CX - 2, baseY - 9, 1);
    g.circle(CX + 2, baseY - 9, 1);
  }

  g.fill({ color: 0x5c4033 });
  g.rect(CX + 12, baseY - 20, 2, 28);
}
