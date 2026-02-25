// Procedural dragon sprite generator - creates red and frost dragon sprites
import {
  RenderTexture,
  Graphics,
  type Renderer,
} from "pixi.js";
import { UnitState } from "@/types";

const FRAME_SIZE = 48;

// Dragon color palettes
export interface DragonPalette {
  body: number;
  wings: number;
  belly: number;
  fire: number;
  ice: number;
  outline: number;
}

export const PALETTE_RED_DRAGON: DragonPalette = {
  body: 0xcc2222,
  wings: 0x881111,
  belly: 0xff4444,
  fire: 0xff6600,
  ice: 0x000000,
  outline: 0x440000,
};

export const PALETTE_FROST_DRAGON: DragonPalette = {
  body: 0x4488ff,
  wings: 0x2266cc,
  belly: 0x66aaff,
  fire: 0x000000,
  ice: 0x00ccff,
  outline: 0x003388,
};

/**
 * Generate all 40 frames (8x5 grid) for a dragon sprite sheet.
 */
export function generateDragonFrames(
  renderer: Renderer,
  palette: DragonPalette,
  isFrost: boolean = false
): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const texture = createDragonFrame(renderer, palette, state, col, isFrost);
      frames.push(texture);
    }
  }

  return frames;
}

/**
 * Create a single dragon frame for the given animation state and column.
 */
function createDragonFrame(
  renderer: Renderer,
  palette: DragonPalette,
  state: UnitState,
  column: number,
  isFrost: boolean
): RenderTexture {
  const g = new Graphics();
  
  // Clear graphics
  g.clear();

  // Draw dragon based on animation state
  switch (state) {
    case UnitState.IDLE:
      drawIdleDragon(g, palette, column, isFrost);
      break;
    case UnitState.MOVE:
      drawWalkingDragon(g, palette, column, isFrost);
      break;
    case UnitState.ATTACK:
      drawAttackingDragon(g, palette, column, isFrost);
      break;
    case UnitState.CAST:
      drawBreathingDragon(g, palette, column, isFrost);
      break;
    case UnitState.DIE:
      drawDyingDragon(g, palette, column, isFrost);
      break;
  }

  // Create render texture
  const texture = RenderTexture.create({
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  });
  renderer.render({ target: texture, container: g });
  g.destroy();

  return texture;
}

// Dragon drawing functions
function drawIdleDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const breathe = Math.sin(frame * 0.3) * 2;
  
  // Add frost effect for frost dragon
  const frostEffect = isFrost ? 0x88ccff : 0x000000;
  
  // Body
  g.fill(palette.body);
  g.circle(24, 20 + breathe, 12);
  g.fill();
  
  // Head
  g.circle(24, 8 + breathe, 8);
  g.fill();
  
  // Wings
  g.fill(palette.wings);
  g.moveTo(12, 15 + breathe);
  g.lineTo(4, 10 + breathe);
  g.lineTo(6, 25 + breathe);
  g.lineTo(15, 22 + breathe);
  g.closePath();
  g.fill();
  
  g.moveTo(36, 15 + breathe);
  g.lineTo(44, 10 + breathe);
  g.lineTo(42, 25 + breathe);
  g.lineTo(33, 22 + breathe);
  g.closePath();
  g.fill();
  
  // Belly
  g.fill(palette.belly);
  g.circle(24, 22 + breathe, 6);
  g.fill();
  
  // Eyes
  g.fill(0xffffff);
  g.circle(20, 6 + breathe, 2);
  g.circle(28, 6 + breathe, 2);
  g.fill();
  
  g.fill(0x000000);
  g.circle(20, 6 + breathe, 1);
  g.circle(28, 6 + breathe, 1);
  g.fill();
  
  // Frost breath particles for frost dragon
  if (isFrost && frame % 4 === 0) {
    g.fill(frostEffect);
    g.circle(32, 8 + breathe, 1);
    g.fill();
  }
}

function drawWalkingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const walkCycle = (frame % 8) / 8;
  const bodyBob = Math.sin(walkCycle * Math.PI * 2) * 3;
  const wingFlap = Math.sin(walkCycle * Math.PI * 2) * 2;
  
  // Add frost trail for frost dragon
  if (isFrost && frame % 3 === 0) {
    g.fill(palette.ice);
    g.circle(20 - walkCycle * 8, 32 + bodyBob, 1);
    g.fill();
  }
  
  // Body
  g.fill(palette.body);
  g.circle(24, 20 + bodyBob, 12);
  g.fill();
  
  // Head
  g.circle(24, 8 + bodyBob, 8);
  g.fill();
  
  // Wings (animated)
  g.fill(palette.wings);
  g.moveTo(12, 15 + bodyBob - wingFlap);
  g.lineTo(4, 8 + bodyBob - wingFlap * 2);
  g.lineTo(6, 25 + bodyBob);
  g.lineTo(15, 22 + bodyBob);
  g.closePath();
  g.fill();
  
  g.moveTo(36, 15 + bodyBob - wingFlap);
  g.lineTo(44, 8 + bodyBob - wingFlap * 2);
  g.lineTo(42, 25 + bodyBob);
  g.lineTo(33, 22 + bodyBob);
  g.closePath();
  g.fill();
  
  // Legs (walking animation)
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 4;
  g.fill(palette.body);
  g.rect(18, 28 + bodyBob, 3, 8 + legOffset);
  g.rect(27, 28 + bodyBob, 3, 8 - legOffset);
  g.fill();
  
  // Belly
  g.fill(palette.belly);
  g.circle(24, 22 + bodyBob, 6);
  g.fill();
}

function drawAttackingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 8;
  
  // Add ice particles for frost dragon attack
  if (isFrost) {
    g.fill(palette.ice);
    for (let i = 0; i < 3; i++) {
      g.circle(30 + lunge + i * 4, 10 + Math.sin(i) * 5, 1);
    }
    g.fill();
  }
  
  // Body (lunging forward)
  g.fill(palette.body);
  g.circle(24 + lunge * 0.3, 20, 12);
  g.fill();
  
  // Head (biting motion)
  g.circle(24 + lunge, 8, 9);
  g.fill();
  
  // Wings (spread for attack)
  g.fill(palette.wings);
  g.moveTo(12, 15);
  g.lineTo(2, 5);
  g.lineTo(4, 25);
  g.lineTo(15, 22);
  g.closePath();
  g.fill();
  
  g.moveTo(36, 15);
  g.lineTo(46, 5);
  g.lineTo(44, 25);
  g.lineTo(33, 22);
  g.closePath();
  g.fill();
  
  // Teeth
  g.fill(0xffffff);
  for (let i = 0; i < 3; i++) {
    const x = 30 + lunge + i * 2;
    const y = 8;
    g.moveTo(x, y);
    g.lineTo(x + 2, y + 2);
    g.lineTo(x, y + 4);
    g.lineTo(x - 2, y + 2);
    g.closePath();
    g.fill();
  }
}

function drawBreathingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const breathProgress = frame / 5;
  const breathSize = 10 + breathProgress * 15;
  
  // Body
  g.fill(palette.body);
  g.circle(24, 20, 12);
  g.fill();
  
  // Head (mouth open)
  g.circle(24, 8, 8);
  g.fill();
  
  // Mouth
  g.fill(0x000000);
  g.arc(24, 10, 6, 0, Math.PI);
  g.fill();
  
  // Breath effect
  const breathColor = isFrost ? palette.ice : palette.fire;
  g.fill(breathColor);
  
  if (isFrost) {
    // Ice crystals
    for (let i = 0; i < 5; i++) {
      const x = 32 + breathProgress * 10 + i * 3;
      const y = 8 + Math.sin(i) * 3;
      g.drawPolygon([
        x, y - 2,
        x + 2, y,
        x, y + 2,
        x - 2, y,
      ]);
    }
  } else {
    // Fire cone
    g.moveTo(30, 8);
    g.lineTo(30 + breathSize, 4);
    g.lineTo(30 + breathSize, 12);
    g.closePath();
    g.fill();
  }
  
  // Wings
  g.fill(palette.wings);
  g.moveTo(12, 15);
  g.lineTo(4, 10);
  g.lineTo(6, 25);
  g.lineTo(15, 22);
  g.closePath();
  g.fill();
  
  g.moveTo(36, 15);
  g.lineTo(44, 10);
  g.lineTo(42, 25);
  g.lineTo(33, 22);
  g.closePath();
  g.fill();
}

function drawDyingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const deathProgress = frame / 6;
  const bodyY = 20 + deathProgress * 8;
  
  // Add frost particles dissipating for frost dragon
  if (isFrost && deathProgress < 0.5) {
    g.fill(palette.ice);
    for (let i = 0; i < 2; i++) {
      g.circle(24 + Math.random() * 10 - 5, bodyY - 20 + i * 5, 1);
    }
    g.fill();
  }
  
  // Body (falling)
  g.fill(palette.body);
  g.circle(24, bodyY, 12 - deathProgress * 2);
  g.fill();
  
  // Head (drooping)
  g.circle(24 - deathProgress * 4, bodyY - 12 + deathProgress * 8, 8 - deathProgress);
  g.fill();
  
  // Wings (limp)
  g.fill(palette.wings);
  g.moveTo(12, bodyY - 5);
  g.lineTo(4, bodyY - 10);
  g.lineTo(6, bodyY + 5);
  g.lineTo(15, bodyY + 2);
  g.closePath();
  g.fill();
  
  g.moveTo(36, bodyY - 5);
  g.lineTo(44, bodyY - 10);
  g.lineTo(42, bodyY + 5);
  g.lineTo(33, bodyY + 2);
  g.closePath();
  g.fill();
  
  // X eyes for death
  if (deathProgress > 0.3) {
    g.stroke({ width: 1, color: 0x000000 });
    g.moveTo(18, bodyY - 14);
    g.lineTo(22, bodyY - 10);
    g.moveTo(22, bodyY - 14);
    g.lineTo(18, bodyY - 10);
    g.moveTo(26, bodyY - 14);
    g.lineTo(30, bodyY - 10);
    g.moveTo(30, bodyY - 14);
    g.lineTo(26, bodyY - 10);
    g.stroke();
  }
}
