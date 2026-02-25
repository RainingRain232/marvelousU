// Procedural dragon sprite generator - creates red and frost dragon sprites
import {
  RenderTexture,
  Graphics,
  type Renderer,
} from "pixi.js";
import { UnitState } from "@/types";

const DRAGON_FRAME_WIDTH = 48; // 1 tile wide
const DRAGON_FRAME_HEIGHT = 96; // 2 tiles tall

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

  // Create render texture with dragon dimensions
  const texture = RenderTexture.create({
    width: DRAGON_FRAME_WIDTH,
    height: DRAGON_FRAME_HEIGHT,
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
  
  // Body - centered in 48x96 frame, taking up vertical space
  g.fill(palette.body);
  g.circle(24, 48 + breathe, 16);
  g.fill();
  
  // Head - positioned at top
  g.circle(24, 20 + breathe, 12);
  g.fill();
  
  // Wings - spread vertically
  g.fill(palette.wings);
  g.moveTo(15, 35 + breathe);
  g.lineTo(5, 25 + breathe);
  g.lineTo(10, 60 + breathe);
  g.lineTo(20, 55 + breathe);
  g.closePath();
  g.fill();
  
  g.moveTo(33, 35 + breathe);
  g.lineTo(43, 25 + breathe);
  g.lineTo(38, 60 + breathe);
  g.lineTo(28, 55 + breathe);
  g.closePath();
  g.fill();
  
  // Belly
  g.fill(palette.belly);
  g.circle(24, 52 + breathe, 10);
  g.fill();
  
  // Eyes
  g.fill(0xffffff);
  g.circle(20, 18 + breathe, 2);
  g.circle(28, 18 + breathe, 2);
  g.fill();
  
  g.fill(0x000000);
  g.circle(20, 18 + breathe, 1);
  g.circle(28, 18 + breathe, 1);
  g.fill();
  
  // Frost breath particles for frost dragon
  if (isFrost && frame % 4 === 0) {
    g.fill(frostEffect);
    g.circle(32, 20 + breathe, 1);
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
    g.circle(24, 70 + bodyBob, 1);
    g.fill();
  }
  
  // Body
  g.fill(palette.body);
  g.circle(24, 48 + bodyBob, 16);
  g.fill();
  
  // Head
  g.circle(24, 20 + bodyBob, 12);
  g.fill();
  
  // Wings (animated) - vertical layout
  g.fill(palette.wings);
  g.moveTo(15, 35 + bodyBob - wingFlap);
  g.lineTo(5, 25 + bodyBob - wingFlap * 2);
  g.lineTo(10, 60 + bodyBob);
  g.lineTo(20, 55 + bodyBob);
  g.closePath();
  g.fill();
  
  g.moveTo(33, 35 + bodyBob - wingFlap);
  g.lineTo(43, 25 + bodyBob - wingFlap * 2);
  g.lineTo(38, 60 + bodyBob);
  g.lineTo(28, 55 + bodyBob);
  g.closePath();
  g.fill();
  
  // Legs (walking animation) - positioned at bottom
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 4;
  g.fill(palette.body);
  g.rect(18, 68 + bodyBob, 3, 8 + legOffset);
  g.rect(27, 68 + bodyBob, 3, 8 - legOffset);
  g.fill();
  
  // Belly
  g.fill(palette.belly);
  g.circle(24, 52 + bodyBob, 10);
  g.fill();
}

function drawAttackingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 8; // Vertical lunge
  
  // Add ice particles for frost dragon attack
  if (isFrost) {
    g.fill(palette.ice);
    for (let i = 0; i < 3; i++) {
      g.circle(32 + i * 4, 20 - lunge + Math.sin(i) * 5, 1);
    }
    g.fill();
  }
  
  // Body (lunging forward/upward)
  g.fill(palette.body);
  g.circle(24, 48 - lunge * 0.3, 16);
  g.fill();
  
  // Head (biting motion) - lunging upward
  g.circle(24, 20 - lunge, 14);
  g.fill();
  
  // Wings (spread for attack) - vertical layout
  g.fill(palette.wings);
  g.moveTo(15, 35);
  g.lineTo(5, 25);
  g.lineTo(10, 60);
  g.lineTo(20, 55);
  g.closePath();
  g.fill();
  
  g.moveTo(33, 35);
  g.lineTo(43, 25);
  g.lineTo(38, 60);
  g.lineTo(28, 55);
  g.closePath();
  g.fill();
  
  // Teeth
  g.fill(0xffffff);
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 3;
    const y = 15 - lunge;
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
  const breathSize = 15 + breathProgress * 20;
  
  // Body
  g.fill(palette.body);
  g.circle(24, 48, 16);
  g.fill();
  
  // Head (mouth open)
  g.circle(24, 20, 12);
  g.fill();
  
  // Mouth
  g.fill(0x000000);
  g.arc(24, 22, 10, 0, Math.PI);
  g.fill();
  
  // Breath effect - shooting upward from vertical dragon
  const breathColor = isFrost ? palette.ice : palette.fire;
  g.fill(breathColor);
  
  if (isFrost) {
    // Ice crystals shooting upward
    for (let i = 0; i < 8; i++) {
      const x = 24 + Math.sin(i) * 8;
      const y = 15 - breathProgress * 20 - i * 4;
      g.drawPolygon([
        x, y - 3,
        x + 3, y,
        x, y + 3,
        x - 3, y,
      ]);
    }
  } else {
    // Fire cone shooting upward
    g.moveTo(20, 15);
    g.lineTo(20 - breathSize/2, 5 - breathProgress * 25);
    g.lineTo(28 + breathSize/2, 5 - breathProgress * 25);
    g.closePath();
    g.fill();
  }
  
  // Wings - spread wide for breath attack
  g.fill(palette.wings);
  g.moveTo(15, 35);
  g.lineTo(5, 25);
  g.lineTo(10, 60);
  g.lineTo(20, 55);
  g.closePath();
  g.fill();
  
  g.moveTo(33, 35);
  g.lineTo(43, 25);
  g.lineTo(38, 60);
  g.lineTo(28, 55);
  g.closePath();
  g.fill();
}

function drawDyingDragon(g: Graphics, palette: DragonPalette, frame: number, isFrost: boolean) {
  const deathProgress = frame / 6;
  const bodyY = 48 + deathProgress * 20; // Falling downward in tall frame
  
  // Add frost particles dissipating for frost dragon
  if (isFrost && deathProgress < 0.5) {
    g.fill(palette.ice);
    for (let i = 0; i < 3; i++) {
      g.circle(24 + Math.random() * 10 - 5, 30 - deathProgress * 15 + i * 5, 1);
    }
    g.fill();
  }
  
  // Body (falling) - larger
  g.fill(palette.body);
  g.circle(24, bodyY, 16 - deathProgress * 3);
  g.fill();
  
  // Head (drooping) - positioned for vertical sprite
  g.circle(24, bodyY - 28 + deathProgress * 10, 12 - deathProgress);
  g.fill();
  
  // Wings (limp) - vertical layout
  g.fill(palette.wings);
  g.moveTo(15, bodyY - 13);
  g.lineTo(5, bodyY - 23);
  g.lineTo(10, bodyY + 7);
  g.lineTo(20, bodyY + 2);
  g.closePath();
  g.fill();
  
  g.moveTo(33, bodyY - 13);
  g.lineTo(43, bodyY - 23);
  g.lineTo(38, bodyY + 7);
  g.lineTo(28, bodyY + 2);
  g.closePath();
  g.fill();
  
  // X eyes for death
  if (deathProgress > 0.3) {
    g.stroke({ width: 1, color: 0x000000 });
    g.moveTo(20, bodyY - 30);
    g.lineTo(28, bodyY - 22);
    g.moveTo(28, bodyY - 30);
    g.lineTo(20, bodyY - 22);
    g.moveTo(20, bodyY - 26);
    g.lineTo(28, bodyY - 18);
    g.moveTo(28, bodyY - 26);
    g.lineTo(20, bodyY - 18);
    g.stroke();
  }
}
