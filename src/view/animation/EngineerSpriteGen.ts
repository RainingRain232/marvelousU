// Procedural sprite generator for the Engineer unit type.
//
// Draws a medieval engineer/builder at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Grey work tunic with leather apron
//   • Tool belt with hammer
//   • Simple hardhat/cap
//   • Carrying wooden planks or tools

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Skin
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_SH = 0xd4a880;

// Tunic — grey work clothes
const COL_TUNIC = 0x6b6b6b;
const COL_TUNIC_LT = 0x8b8b8b;
const COL_TUNIC_DK = 0x4a4a4a;

// Apron — leather brown
const COL_APRON = 0x8b6339;
const COL_APRON_DK = 0x6b4a2a;

// Pants
const COL_PANT = 0x4a4a3e;
const COL_PANT_LT = 0x5a5a4e;

// Boots
const COL_BOOT = 0x3a2a1a;
const COL_BOOT_HI = 0x4a3a2a;

// Hat/cap
const COL_HAT = 0x8b7355;
const COL_HAT_DK = 0x6b5335;

// Tool belt
const COL_BELT = 0x5c3a1e;
const COL_BELT_BUCKLE = 0xc0a030;

// Hammer/tools
const COL_HANDLE = 0x6b4a2a;
const COL_METAL = 0x999999;
const COL_METAL_HI = 0xbbbbbb;

// Planks
const COL_WOOD = 0xc8a848;
const COL_WOOD_DK = 0xa08838;

const COL_SHADOW = 0x000000;
const COL_EYE = 0x222222;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}

// ---------------------------------------------------------------------------
// Base engineer drawing
// ---------------------------------------------------------------------------

function drawEngineerBase(g: Graphics, bobY: number, legOffset: number): void {
  // Shadow
  rect(g, CX - 8, GY - 1, 16, 3, COL_SHADOW, 0.25);

  // Boots
  const bootY = GY - 6 + bobY;
  rect(g, CX - 7, bootY - legOffset, 5, 4, COL_BOOT);
  rect(g, CX + 2, bootY + legOffset, 5, 4, COL_BOOT);
  rect(g, CX - 7, bootY - legOffset, 2, 2, COL_BOOT_HI);
  rect(g, CX + 2, bootY + legOffset, 2, 2, COL_BOOT_HI);

  // Legs/pants
  const legY = GY - 14 + bobY;
  rect(g, CX - 6, legY - legOffset, 4, 9, COL_PANT);
  rect(g, CX + 2, legY + legOffset, 4, 9, COL_PANT);
  rect(g, CX - 5, legY - legOffset, 2, 4, COL_PANT_LT);

  // Tunic body
  const bodyY = GY - 24 + bobY;
  rect(g, CX - 8, bodyY, 16, 12, COL_TUNIC);
  rect(g, CX - 7, bodyY + 1, 4, 6, COL_TUNIC_LT);
  rect(g, CX - 8, bodyY + 10, 16, 2, COL_TUNIC_DK);

  // Apron
  rect(g, CX - 5, bodyY + 4, 10, 8, COL_APRON);
  rect(g, CX - 4, bodyY + 5, 3, 4, COL_APRON_DK);

  // Belt
  rect(g, CX - 8, bodyY + 8, 16, 2, COL_BELT);
  rect(g, CX - 1, bodyY + 8, 3, 2, COL_BELT_BUCKLE);

  // Arms
  rect(g, CX - 10, bodyY + 1, 3, 10, COL_TUNIC);
  rect(g, CX + 7, bodyY + 1, 3, 10, COL_TUNIC);
  // Hands
  rect(g, CX - 10, bodyY + 10, 3, 3, COL_SKIN);
  rect(g, CX + 7, bodyY + 10, 3, 3, COL_SKIN);

  // Neck
  const neckY = bodyY - 2;
  rect(g, CX - 2, neckY, 4, 3, COL_SKIN);

  // Head
  const headY = bodyY - 10;
  rect(g, CX - 5, headY, 10, 9, COL_SKIN);
  rect(g, CX - 4, headY + 1, 3, 3, COL_SKIN_SH);

  // Eyes
  rect(g, CX - 3, headY + 3, 2, 2, COL_EYE);
  rect(g, CX + 1, headY + 3, 2, 2, COL_EYE);

  // Hat/cap
  rect(g, CX - 6, headY - 3, 12, 4, COL_HAT);
  rect(g, CX - 7, headY, 14, 2, COL_HAT_DK);

  // Hammer on belt (right side)
  rect(g, CX + 6, bodyY + 5, 2, 7, COL_HANDLE);
  rect(g, CX + 5, bodyY + 4, 4, 3, COL_METAL);
  rect(g, CX + 5, bodyY + 4, 2, 1, COL_METAL_HI);

  // Wooden planks on back
  rect(g, CX - 11, bodyY - 4, 3, 16, COL_WOOD);
  rect(g, CX - 10, bodyY - 3, 2, 8, COL_WOOD_DK);
}

// ---------------------------------------------------------------------------
// State-specific drawing functions
// ---------------------------------------------------------------------------

function drawIdleEngineer(g: Graphics, frame: number): void {
  const bobY = frame % 2 === 0 ? 0 : -1;
  drawEngineerBase(g, bobY, 0);
}

function drawWalkingEngineer(g: Graphics, frame: number): void {
  const bobY = frame % 2 === 0 ? 0 : -1;
  const legOff = [0, 1, 2, 1, 0, -1, -2, -1][frame % 8];
  drawEngineerBase(g, bobY, legOff);
}

function drawAttackingEngineer(g: Graphics, frame: number): void {
  // Engineer doesn't attack — just idle pose
  drawIdleEngineer(g, frame);
}

function drawCastingEngineer(g: Graphics, frame: number): void {
  drawIdleEngineer(g, frame);
}

function drawDyingEngineer(g: Graphics, frame: number): void {
  const progress = Math.min(frame / 6, 1);

  // Shadow shrinks
  const shadowW = 16 * (1 - progress * 0.5);
  rect(g, CX - shadowW / 2, GY - 1, shadowW, 3, COL_SHADOW, 0.25 * (1 - progress));

  const fallY = progress * 8;
  const alpha = 1 - progress * 0.6;

  // Simplified falling body
  const bodyY = GY - 24 + fallY;
  rect(g, CX - 8, bodyY, 16, 12, COL_TUNIC_DK, alpha);
  rect(g, CX - 5, bodyY + 4, 10, 8, COL_APRON_DK, alpha);

  // Hat falls off
  rect(g, CX - 6 + frame * 2, bodyY - 6 + frame * 3, 12, 4, COL_HAT, alpha * 0.7);

  // Head
  rect(g, CX - 5, bodyY - 8 + fallY * 0.5, 10, 9, COL_SKIN, alpha);

  // Legs
  rect(g, CX - 6, bodyY + 10, 12, 8, COL_PANT, alpha);
  rect(g, CX - 7, bodyY + 16, 14, 4, COL_BOOT, alpha);
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export function generateEngineerFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();

      switch (state) {
        case UnitState.IDLE:
          drawIdleEngineer(g, col);
          break;
        case UnitState.MOVE:
          drawWalkingEngineer(g, col);
          break;
        case UnitState.ATTACK:
          drawAttackingEngineer(g, col);
          break;
        case UnitState.CAST:
          drawCastingEngineer(g, col);
          break;
        case UnitState.DIE:
          drawDyingEngineer(g, col);
          break;
      }

      const texture = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }

  return frames;
}
