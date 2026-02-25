// Procedural cyclops sprite generator - creates massive cyclops sprites
import {
  RenderTexture,
  Graphics,
  type Renderer,
} from "pixi.js";
import { UnitState } from "@/types";

const CYCLOPS_FRAME_WIDTH = 96; // 2 tiles wide
const CYCLOPS_FRAME_HEIGHT = 144; // 3 tiles tall

// Cyclops color palette
export interface CyclopsPalette {
  skin: number;
  skinDark: number;
  rugs: number;
  rugsDark: number;
  trunk: number;
  trunkDark: number;
  trunkBark: number;
  leaves: number;
  eye: number;
  eyeGlow: number;
  mouth: number;
  teeth: number;
  outline: number;
  blood: number;
}

export const PALETTE_CYCLOPS: CyclopsPalette = {
  skin: 0x8B7355, // Tan skin color
  skinDark: 0x6B5345, // Darker skin for shading
  rugs: 0x654321, // Brown rags/tunic
  rugsDark: 0x4A3218, // Darker rags for shading
  trunk: 0x8B4513, // Tree trunk brown
  trunkDark: 0x654321, // Darker trunk for shading
  trunkBark: 0x4A3018, // Bark texture color
  leaves: 0x228B22, // Green leaves
  eye: 0xFF4444, // Giant red eye
  eyeGlow: 0xFF6666, // Eye glow effect
  mouth: 0x4B2F20, // Dark mouth interior
  teeth: 0xF5F5DC, // Yellowish teeth
  outline: 0x000000,
  blood: 0x8B0000, // Blood color for wounds
};

/**
 * Generate all cyclops animation frames (40 frames total - 8 per state)
 */
export function generateCyclopsFrames(renderer: Renderer, palette: CyclopsPalette): RenderTexture[] {
  const textures: RenderTexture[] = [];
  
  // Generate 8 frames for each animation state
  const states = [UnitState.IDLE, UnitState.MOVE, UnitState.ATTACK, UnitState.CAST, UnitState.DIE];
  
  for (const state of states) {
    for (let frame = 0; frame < 8; frame++) {
      const texture = createCyclopsFrame(renderer, palette, state, frame);
      textures.push(texture);
    }
  }
  
  return textures;
}

/**
 * Create a single cyclops frame for the given animation state and frame number.
 */
function createCyclopsFrame(
  renderer: Renderer,
  palette: CyclopsPalette,
  state: UnitState,
  frame: number
): RenderTexture {
  const g = new Graphics();
  
  // Clear graphics
  g.clear();

  // Draw cyclops based on animation state
  switch (state) {
    case UnitState.IDLE:
      drawIdleCyclops(g, palette, frame);
      break;
    case UnitState.MOVE:
      drawWalkingCyclops(g, palette, frame);
      break;
    case UnitState.ATTACK:
      drawAttackingCyclops(g, palette, frame);
      break;
    case UnitState.CAST:
      drawAttackingCyclops(g, palette, frame); // Cyclops uses same attack animation for cast
      break;
    case UnitState.DIE:
      drawDyingCyclops(g, palette, frame);
      break;
  }

  // Create render texture with cyclops dimensions
  const texture = RenderTexture.create({
    width: CYCLOPS_FRAME_WIDTH,
    height: CYCLOPS_FRAME_HEIGHT,
  });
  renderer.render({ target: texture, container: g });
  g.destroy();

  return texture;
}

// Cyclops drawing functions
function drawIdleCyclops(g: Graphics, palette: CyclopsPalette, frame: number) {
  const breathe = Math.sin(frame * 0.2) * 2;
  
  // Massive body with shading - centered in 2x3 frame
  g.fill(palette.skinDark);
  g.circle(50, 74 + breathe, 32); // Shadow layer
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48, 72 + breathe, 32); // Main body
  g.fill();
  
  // Body muscle definition
  g.fill(palette.skinDark);
  g.circle(35, 70 + breathe, 8); // Shoulder muscle
  g.circle(61, 70 + breathe, 8); // Other shoulder muscle
  g.fill();
  
  // Giant head with shading
  g.fill(palette.skinDark);
  g.circle(50, 34 + breathe, 24); // Head shadow
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48, 32 + breathe, 24); // Main head
  g.fill();
  
  // Jawline definition
  g.fill(palette.skinDark);
  g.moveTo(30, 40 + breathe);
  g.lineTo(66, 40 + breathe);
  g.lineTo(64, 48 + breathe);
  g.lineTo(32, 48 + breathe);
  g.closePath();
  g.fill();
  
  // Detailed mouth
  g.fill(palette.mouth);
  g.moveTo(35, 48 + breathe);
  g.lineTo(61, 48 + breathe);
  g.lineTo(58, 54 + breathe);
  g.lineTo(38, 54 + breathe);
  g.closePath();
  g.fill();
  
  // Teeth
  g.fill(palette.teeth);
  for (let i = 0; i < 6; i++) {
    const toothX = 38 + i * 4;
    g.moveTo(toothX, 48 + breathe);
    g.lineTo(toothX + 2, 50 + breathe);
    g.lineTo(toothX + 1, 52 + breathe);
    g.lineTo(toothX - 1, 50 + breathe);
    g.closePath();
    g.fill();
  }
  
  // Long tree trunk resting on shoulder
  g.fill(palette.trunkDark);
  g.rect(68, 35 + breathe, 12, 80); // Trunk shadow
  g.circle(74, 115 + breathe, 16); // Trunk end shadow
  g.fill();
  
  g.fill(palette.trunk);
  g.rect(65, 30 + breathe, 12, 80); // Main trunk
  g.circle(71, 110 + breathe, 16); // Trunk end
  g.fill();
  
  // Tree trunk bark texture
  g.stroke({ width: 1, color: palette.trunkBark });
  for (let i = 0; i < 8; i++) {
    const y = 40 + i * 10 + breathe;
    g.moveTo(65, y);
    g.lineTo(77, y);
  }
  // Vertical bark lines
  for (let i = 0; i < 3; i++) {
    const x = 68 + i * 3;
    g.moveTo(x, 30 + breathe);
    g.lineTo(x, 110 + breathe);
  }
  g.stroke();
  
  // Leaves at the end of trunk
  g.fill(palette.leaves);
  g.circle(71, 110 + breathe, 20); // Leaf cluster
  g.fill();
  g.fill(palette.leaves);
  for (let i = 0; i < 5; i++) {
    const leafX = 71 + Math.cos(i * Math.PI * 2 / 5) * 15;
    const leafY = 110 + breathe + Math.sin(i * Math.PI * 2 / 5) * 15;
    g.circle(leafX, leafY, 8);
  }
  g.fill();
  
  // Detailed rags/tunic with patches
  g.fill(palette.rugsDark);
  g.moveTo(22, 62 + breathe);
  g.lineTo(74, 62 + breathe);
  g.lineTo(70, 112 + breathe);
  g.lineTo(26, 112 + breathe);
  g.closePath();
  g.fill();
  
  g.fill(palette.rugs);
  g.moveTo(20, 60 + breathe);
  g.lineTo(76, 60 + breathe);
  g.lineTo(72, 110 + breathe);
  g.lineTo(24, 110 + breathe);
  g.closePath();
  g.fill();
  
  // Rag patches and tears
  g.fill(palette.rugsDark);
  g.circle(35, 75 + breathe, 4); // Patch
  g.circle(55, 85 + breathe, 3); // Another patch
  g.rect(45, 95 + breathe, 8, 4); // Tear
  g.fill();
  
  // Giant single eye with detail
  // Eye white
  g.fill(0xFFFFFF);
  g.circle(48, 28 + breathe, 10);
  g.fill();
  
  // Eye iris with glow
  g.fill(palette.eyeGlow);
  g.circle(48, 28 + breathe, 8);
  g.fill();
  
  g.fill(palette.eye);
  g.circle(48, 28 + breathe, 6);
  g.fill();
  
  // Eye pupil
  g.fill(0x000000);
  g.circle(48, 28 + breathe, 3);
  g.fill();
  
  // Eye shine
  g.fill(0xFFFFFF);
  g.circle(50, 26 + breathe, 1);
  g.fill();
  
  // Scars and wounds on body
  g.stroke({ width: 2, color: palette.blood });
  g.moveTo(40, 65 + breathe);
  g.lineTo(45, 70 + breathe);
  g.moveTo(55, 75 + breathe);
  g.lineTo(60, 80 + breathe);
  g.stroke();
  
  // Simple muscular legs with toes
  g.fill(palette.skinDark);
  g.rect(34, 102 + breathe, 12, 20); // Leg shadows
  g.rect(54, 102 + breathe, 12, 20);
  g.fill();
  
  g.fill(palette.skin);
  g.rect(32, 100 + breathe, 12, 20); // Main legs
  g.rect(52, 100 + breathe, 12, 20);
  g.fill();
  
  // Toes
  g.fill(palette.skin);
  for (let i = 0; i < 3; i++) {
    g.circle(35 + i * 4, 122 + breathe, 2); // Left foot toes
    g.circle(55 + i * 4, 122 + breathe, 2); // Right foot toes
  }
  g.fill();
}

function drawWalkingCyclops(g: Graphics, palette: CyclopsPalette, frame: number) {
  const walkCycle = (frame % 8) / 8;
  const bodyBob = Math.sin(walkCycle * Math.PI * 2) * 4;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 8;
  
  // Massive body with shading
  g.fill(palette.skinDark);
  g.circle(50, 74 + bodyBob, 32); // Shadow layer
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48, 72 + bodyBob, 32); // Main body
  g.fill();
  
  // Muscle definition that moves with walk
  g.fill(palette.skinDark);
  g.circle(35 + Math.sin(walkCycle * Math.PI * 2) * 2, 70 + bodyBob, 8);
  g.circle(61 - Math.sin(walkCycle * Math.PI * 2) * 2, 70 + bodyBob, 8);
  g.fill();
  
  // Head with movement
  g.fill(palette.skinDark);
  g.circle(50, 34 + bodyBob, 24); // Head shadow
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48, 32 + bodyBob, 24); // Main head
  g.fill();
  
  // Jawline
  g.fill(palette.skinDark);
  g.moveTo(30, 40 + bodyBob);
  g.lineTo(66, 40 + bodyBob);
  g.lineTo(64, 48 + bodyBob);
  g.lineTo(32, 48 + bodyBob);
  g.closePath();
  g.fill();
  
  // Detailed mouth
  g.fill(palette.mouth);
  g.moveTo(35, 48 + bodyBob);
  g.lineTo(61, 48 + bodyBob);
  g.lineTo(58, 54 + bodyBob);
  g.lineTo(38, 54 + bodyBob);
  g.closePath();
  g.fill();
  
  // Teeth
  g.fill(palette.teeth);
  for (let i = 0; i < 6; i++) {
    const toothX = 38 + i * 4;
    g.moveTo(toothX, 48 + bodyBob);
    g.lineTo(toothX + 2, 50 + bodyBob);
    g.lineTo(toothX + 1, 52 + bodyBob);
    g.lineTo(toothX - 1, 50 + bodyBob);
    g.closePath();
    g.fill();
  }
  
  // Tree trunk swaying with walk
  g.fill(palette.trunkDark);
  const trunkSwing = Math.sin(walkCycle * Math.PI * 2) * 6;
  g.rect(68 + trunkSwing, 35 + bodyBob, 12, 80); // Trunk shadow
  g.circle(74 + trunkSwing, 115 + bodyBob, 16); // Trunk end shadow
  g.fill();
  
  g.fill(palette.trunk);
  g.rect(65 + trunkSwing, 30 + bodyBob, 12, 80); // Main trunk
  g.circle(71 + trunkSwing, 110 + bodyBob, 16); // Trunk end
  g.fill();
  
  // Trunk bark texture
  g.stroke({ width: 1, color: palette.trunkBark });
  for (let i = 0; i < 8; i++) {
    const y = 40 + i * 10 + bodyBob;
    g.moveTo(65 + trunkSwing, y);
    g.lineTo(77 + trunkSwing, y);
  }
  for (let i = 0; i < 3; i++) {
    const x = 68 + i * 3 + trunkSwing;
    g.moveTo(x, 30 + bodyBob);
    g.lineTo(x, 110 + bodyBob);
  }
  g.stroke();
  
  // Leaves at end of trunk
  g.fill(palette.leaves);
  g.circle(71 + trunkSwing, 110 + bodyBob, 20); // Leaf cluster
  g.fill();
  for (let i = 0; i < 5; i++) {
    const leafX = 71 + trunkSwing + Math.cos(i * Math.PI * 2 / 5) * 15;
    const leafY = 110 + bodyBob + Math.sin(i * Math.PI * 2 / 5) * 15;
    g.circle(leafX, leafY, 8);
  }
  g.fill();
  
  // Rags with movement
  g.fill(palette.rugsDark);
  g.moveTo(22, 62 + bodyBob);
  g.lineTo(74, 62 + bodyBob);
  g.lineTo(70, 112 + bodyBob);
  g.lineTo(26, 112 + bodyBob);
  g.closePath();
  g.fill();
  
  g.fill(palette.rugs);
  g.moveTo(20, 60 + bodyBob);
  g.lineTo(76, 60 + bodyBob);
  g.lineTo(72, 110 + bodyBob);
  g.lineTo(24, 110 + bodyBob);
  g.closePath();
  g.fill();
  
  // Rag patches that move with walk
  g.fill(palette.rugsDark);
  g.circle(35 + Math.sin(walkCycle * Math.PI * 4) * 2, 75 + bodyBob, 4);
  g.circle(55 - Math.sin(walkCycle * Math.PI * 4) * 2, 85 + bodyBob, 3);
  g.fill();
  
  // Giant eye with movement
  g.fill(0xFFFFFF);
  g.circle(48, 28 + bodyBob, 10);
  g.fill();
  
  g.fill(palette.eyeGlow);
  g.circle(48, 28 + bodyBob, 8);
  g.fill();
  
  g.fill(palette.eye);
  g.circle(48, 28 + bodyBob, 6);
  g.fill();
  
  g.fill(0x000000);
  g.circle(48, 28 + bodyBob, 3);
  g.fill();
  
  g.fill(0xFFFFFF);
  g.circle(50, 26 + bodyBob, 1);
  g.fill();
  
  // Scars
  g.stroke({ width: 2, color: palette.blood });
  g.moveTo(40, 65 + bodyBob);
  g.lineTo(45, 70 + bodyBob);
  g.moveTo(55, 75 + bodyBob);
  g.lineTo(60, 80 + bodyBob);
  g.stroke();
  
  // Walking legs with detailed animation
  g.fill(palette.skinDark);
  g.rect(34, 102 + bodyBob, 12, 20 + legSwing); // Leg shadows
  g.rect(54, 102 + bodyBob, 12, 20 - legSwing);
  g.fill();
  
  g.fill(palette.skin);
  g.rect(32, 100 + bodyBob, 12, 20 + legSwing); // Main legs
  g.rect(52, 100 + bodyBob, 12, 20 - legSwing);
  g.fill();
  
  // Animated toes
  for (let i = 0; i < 3; i++) {
    const toeOffset = Math.sin(walkCycle * Math.PI * 2 + i) * 2;
    g.circle(35 + i * 4, 122 + bodyBob + toeOffset, 2); // Left foot toes
    g.circle(55 + i * 4, 122 + bodyBob - toeOffset, 2); // Right foot toes
  }
  g.fill();
}

function drawAttackingCyclops(g: Graphics, palette: CyclopsPalette, frame: number) {
  const attackProgress = frame / 8;
  const lift = attackProgress * 40; // How high he lifts the trunk
  const hit = attackProgress > 0.5; // Hit happens in second half of animation
  
  // Body (leaning into attack) with shading
  g.fill(palette.skinDark);
  g.circle(50 + (hit ? -10 : 0), 74, 32); // Shadow layer
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48 + (hit ? -10 : 0), 72, 32); // Main body
  g.fill();
  
  // Tensed muscles during attack
  g.fill(palette.skinDark);
  g.circle(35 + (hit ? -5 : 0), 70, 10); // Flexed shoulder
  g.circle(61 + (hit ? -5 : 0), 70, 10); // Other flexed shoulder
  g.fill();
  
  // Head (leaning forward during hit)
  g.fill(palette.skinDark);
  g.circle(50 + (hit ? -12 : 0), 34, 24); // Head shadow
  g.fill();
  
  g.fill(palette.skin);
  g.circle(48 + (hit ? -12 : 0), 32, 24); // Main head
  g.fill();
  
  // Angry jawline
  g.fill(palette.skinDark);
  g.moveTo(30 + (hit ? -12 : 0), 40);
  g.lineTo(66 + (hit ? -12 : 0), 40);
  g.lineTo(64 + (hit ? -12 : 0), 48);
  g.lineTo(32 + (hit ? -12 : 0), 48);
  g.closePath();
  g.fill();
  
  // Detailed mouth (opens wider during attack)
  g.fill(palette.mouth);
  const mouthWidth = hit ? 30 : 26;
  g.moveTo(35 + (hit ? -12 : 0), 48);
  g.lineTo(35 + mouthWidth + (hit ? -12 : 0), 48);
  g.lineTo(32 + mouthWidth + (hit ? -12 : 0), 54);
  g.lineTo(38 + (hit ? -12 : 0), 54);
  g.closePath();
  g.fill();
  
  // Teeth (more visible during attack)
  g.fill(palette.teeth);
  for (let i = 0; i < 6; i++) {
    const toothX = 38 + i * 4 + (hit ? -12 : 0);
    const toothHeight = hit ? 6 : 4;
    g.moveTo(toothX, 48);
    g.lineTo(toothX + 2, 50);
    g.lineTo(toothX + 1, 50 + toothHeight);
    g.lineTo(toothX - 1, 50);
    g.closePath();
    g.fill();
  }
  
  // Tree trunk being lifted and swung
  g.fill(palette.trunkDark);
  const trunkCenterX = 71;
  const trunkCenterY = 70 - lift;
  
  // Trunk shaft (vertical when lifted, horizontal when hitting)
  if (hit) {
    // Horizontal trunk for hitting
    g.rect(trunkCenterX - 60, trunkCenterY - 6, 120, 12); // Trunk shadow
    g.circle(trunkCenterX - 70, trunkCenterY, 16); // Trunk end shadow
  } else {
    // Vertical trunk when lifting
    g.rect(trunkCenterX - 6, trunkCenterY, 12, 80); // Trunk shadow
    g.circle(trunkCenterX, trunkCenterY + 80, 16); // Trunk end shadow
  }
  g.fill();
  
  g.fill(palette.trunk);
  if (hit) {
    // Horizontal trunk for hitting
    g.rect(trunkCenterX - 60, trunkCenterY - 4, 120, 12); // Main trunk
    g.circle(trunkCenterX - 70, trunkCenterY, 16); // Trunk end
  } else {
    // Vertical trunk when lifting
    g.rect(trunkCenterX - 4, trunkCenterY, 12, 80); // Main trunk
    g.circle(trunkCenterX, trunkCenterY + 80, 16); // Trunk end
  }
  g.fill();
  
  // Trunk bark texture
  g.stroke({ width: 1, color: palette.trunkBark });
  if (hit) {
    // Horizontal bark lines
    for (let i = -50; i <= 50; i += 10) {
      g.moveTo(trunkCenterX + i, trunkCenterY - 4);
      g.lineTo(trunkCenterX + i, trunkCenterY + 4);
    }
    // Vertical bark lines
    for (let i = -4; i <= 4; i += 3) {
      g.moveTo(trunkCenterX + i, trunkCenterY - 60);
      g.lineTo(trunkCenterX + i, trunkCenterY + 60);
    }
  } else {
    // Vertical bark lines
    for (let i = 0; i < 8; i++) {
      const y = trunkCenterY + i * 10;
      g.moveTo(trunkCenterX - 4, y);
      g.lineTo(trunkCenterX + 4, y);
    }
    // Horizontal bark lines
    for (let i = -3; i <= 3; i += 3) {
      const x = trunkCenterX + i;
      g.moveTo(x, trunkCenterY);
      g.lineTo(x, trunkCenterY + 80);
    }
  }
  g.stroke();
  
  // Leaves at the end of trunk
  g.fill(palette.leaves);
  if (hit) {
    g.circle(trunkCenterX - 70, trunkCenterY, 20); // Leaf cluster
  } else {
    g.circle(trunkCenterX, trunkCenterY + 80, 20); // Leaf cluster
  }
  g.fill();
  
  // Individual leaves
  for (let i = 0; i < 5; i++) {
    const leafCenterX = hit ? trunkCenterX - 70 : trunkCenterX;
    const leafCenterY = hit ? trunkCenterY : trunkCenterY + 80;
    const leafX = leafCenterX + Math.cos(i * Math.PI * 2 / 5) * 15;
    const leafY = leafCenterY + Math.sin(i * Math.PI * 2 / 5) * 15;
    g.circle(leafX, leafY, 8);
  }
  g.fill();
  
  // Rags flapping during attack
  g.fill(palette.rugsDark);
  const ragFlap = Math.sin(attackProgress * Math.PI) * 3;
  g.moveTo(20 + ragFlap, 60);
  g.lineTo(76 - ragFlap, 60);
  g.lineTo(72 - ragFlap, 110);
  g.lineTo(24 + ragFlap, 110);
  g.closePath();
  g.fill();
  
  g.fill(palette.rugs);
  g.moveTo(20 + ragFlap, 60);
  g.lineTo(76 - ragFlap, 60);
  g.lineTo(72 - ragFlap, 110);
  g.lineTo(24 + ragFlap, 110);
  g.closePath();
  g.fill();
  
  // Angry giant eye with enhanced detail
  g.fill(0xFFFFFF);
  g.circle(48 + (hit ? -12 : 0), 28, 12); // Eye gets bigger when attacking
  g.fill();
  
  g.fill(palette.eyeGlow);
  g.circle(48 + (hit ? -12 : 0), 28, 10);
  g.fill();
  
  g.fill(palette.eye);
  g.circle(48 + (hit ? -12 : 0), 28, 8);
  g.fill();
  
  g.fill(0x000000);
  g.circle(48 + (hit ? -12 : 0), 28, 4);
  g.fill();
  
  // Eye shine intensifies when angry
  g.fill(0xFFFFFF);
  g.circle(50 + (hit ? -12 : 0), 26, 2);
  g.fill();
  
  // Scars more visible during attack
  g.stroke({ width: 3, color: palette.blood });
  g.moveTo(40, 65);
  g.lineTo(45, 70);
  g.moveTo(55, 75);
  g.lineTo(60, 80);
  g.stroke();
  
  // Legs planted firmly for attack
  g.fill(palette.skinDark);
  g.rect(28, 100, 16, 20); // Leg shadows
  g.rect(52, 100, 16, 20);
  g.fill();
  
  g.fill(palette.skin);
  g.rect(30, 100, 14, 20); // Main legs
  g.rect(52, 100, 14, 20);
  g.fill();
  
  // Toes gripping ground
  for (let i = 0; i < 3; i++) {
    g.circle(33 + i * 4, 122, 2); // Left foot toes
    g.circle(53 + i * 4, 122, 2); // Right foot toes
  }
  g.fill();
}

function drawDyingCyclops(g: Graphics, palette: CyclopsPalette, frame: number) {
  const deathProgress = frame / 5;
  const fallAngle = deathProgress * 0.8;
  const fallRad = fallAngle * Math.PI / 180;
  
  // Calculate rotated positions for falling body
  const centerX = 48;
  const centerY = 72;
  
  // Falling body (rotated position)
  const bodyX = centerX + Math.cos(fallRad) * 0 - Math.sin(fallRad) * 0;
  const bodyY = centerY + Math.sin(fallRad) * 0 + Math.cos(fallRad) * 0;
  g.fill(palette.skin);
  g.circle(bodyX, bodyY, 32 - deathProgress * 5);
  g.fill();
  
  // Falling head (rotated position relative to body)
  const headOffsetX = 0;
  const headOffsetY = -40;
  const headX = centerX + Math.cos(fallRad) * headOffsetX - Math.sin(fallRad) * headOffsetY;
  const headY = centerY + Math.sin(fallRad) * headOffsetX + Math.cos(fallRad) * headOffsetY;
  g.circle(headX, headY, 24 - deathProgress * 3);
  g.fill();
  
  // Club dropping (falls separately)
  g.fill(palette.trunk);
  g.rect(65, 40 + deathProgress * 20, 12, 80); // Trunk falling
  g.circle(71, 100 + deathProgress * 20, 16); // Trunk end falling
  g.fill();
  
  // Rags (rotated with body)
  const ragPoints = [
    {x: 20, y: 60},
    {x: 76, y: 60},
    {x: 72, y: 110},
    {x: 24, y: 110},
  ];
  
  g.fill(palette.rugs);
  g.moveTo(
    centerX + Math.cos(fallRad) * (ragPoints[0].x - centerX) - Math.sin(fallRad) * (ragPoints[0].y - centerY),
    centerY + Math.sin(fallRad) * (ragPoints[0].x - centerX) + Math.cos(fallRad) * (ragPoints[0].y - centerY)
  );
  for (let i = 1; i < ragPoints.length; i++) {
    const point = ragPoints[i];
    g.lineTo(
      centerX + Math.cos(fallRad) * (point.x - centerX) - Math.sin(fallRad) * (point.y - centerY),
      centerY + Math.sin(fallRad) * (point.x - centerX) + Math.cos(fallRad) * (point.y - centerY)
    );
  }
  g.closePath();
  g.fill();
  
  // Closing eye (on rotated head)
  g.fill(palette.eye);
  const eyeSize = 8 * (1 - deathProgress);
  const eyeX = headX;
  const eyeY = headY - 4;
  g.circle(eyeX, eyeY, eyeSize);
  g.fill();
  
  if (eyeSize > 2) {
    g.fill(0x000000);
    g.circle(eyeX, eyeY, eyeSize * 0.5);
    g.fill();
  }
  
  // Legs collapsing (rotated with body)
  g.fill(palette.skin);
  const leg1X = centerX + Math.cos(fallRad) * (38 - centerX) - Math.sin(fallRad) * (100 - centerY);
  const leg1Y = centerY + Math.sin(fallRad) * (38 - centerX) + Math.cos(fallRad) * (100 - centerY);
  g.rect(leg1X, leg1Y, 12, 20 - deathProgress * 10);
  
  const leg2X = centerX + Math.cos(fallRad) * (58 - centerX) - Math.sin(fallRad) * (100 - centerY);
  const leg2Y = centerY + Math.sin(fallRad) * (58 - centerX) + Math.cos(fallRad) * (100 - centerY);
  g.rect(leg2X, leg2Y, 12, 20 - deathProgress * 10);
  g.fill();
}
