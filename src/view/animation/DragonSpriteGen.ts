// Procedural dragon sprite generator - creates red and frost dragon sprites
import { RenderTexture, Graphics, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const DRAGON_FRAME_WIDTH = 64;
const DRAGON_FRAME_HEIGHT = 128;

// Dragon color palettes
export interface DragonPalette {
  body: number;
  bodyDark: number;
  wings: number;
  wingsMembrane: number;
  belly: number;
  bellyScale: number;
  fire: number;
  ice: number;
  outline: number;
  horn: number;
  claw: number;
  eye: number;
  eyePupil: number;
}

export const PALETTE_RED_DRAGON: DragonPalette = {
  body: 0xcc3333,
  bodyDark: 0x881111,
  wings: 0x992222,
  wingsMembrane: 0x661111,
  belly: 0xff6644,
  bellyScale: 0xffaa66,
  fire: 0xff6600,
  ice: 0x000000,
  outline: 0x330000,
  horn: 0xddaa44,
  claw: 0x222222,
  eye: 0xffcc00,
  eyePupil: 0x000000,
};

export const PALETTE_FROST_DRAGON: DragonPalette = {
  body: 0x5588cc,
  bodyDark: 0x335599,
  wings: 0x4477aa,
  wingsMembrane: 0x224466,
  belly: 0x88bbff,
  bellyScale: 0xaaddff,
  fire: 0x000000,
  ice: 0x88ddff,
  outline: 0x112244,
  horn: 0xccddff,
  claw: 0x333344,
  eye: 0x88ffff,
  eyePupil: 0x001133,
};

export function generateDragonFrames(
  renderer: Renderer,
  palette: DragonPalette,
  isFrost: boolean = false,
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

function createDragonFrame(
  renderer: Renderer,
  palette: DragonPalette,
  state: UnitState,
  column: number,
  isFrost: boolean,
): RenderTexture {
  const g = new Graphics();
  g.clear();

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

  const texture = RenderTexture.create({
    width: DRAGON_FRAME_WIDTH,
    height: DRAGON_FRAME_HEIGHT,
  });
  renderer.render({ target: texture, container: g });
  g.destroy();

  return texture;
}

function drawScales(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  palette: DragonPalette,
) {
  const scaleSize = 4;
  const numScales = Math.floor((radius * 2) / scaleSize);

  for (let row = 0; row < numScales; row++) {
    const offset = (row % 2) * (scaleSize / 2);
    for (let col = 0; col < numScales; col++) {
      const sx = cx - radius + col * scaleSize + offset;
      const sy = cy - radius + row * scaleSize;
      const dist = Math.sqrt((sx - cx) ** 2 + (sy - cy) ** 2);
      if (dist < radius - 2) {
        g.fill(row % 2 === 0 ? palette.body : palette.bodyDark);
        g.circle(sx, sy, 2);
        g.fill();
      }
    }
  }
}

function drawBellyScales(
  g: Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  palette: DragonPalette,
) {
  const scaleWidth = 5;
  const scaleHeight = 4;
  const rows = Math.floor(height / scaleHeight);
  const cols = Math.floor(width / scaleWidth);

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (scaleWidth / 2);
    for (let col = 0; col < cols; col++) {
      const sx = cx - width / 2 + col * scaleWidth + offset;
      const sy = cy - height / 2 + row * scaleHeight;
      g.fill(row % 2 === 0 ? palette.bellyScale : palette.belly);
      g.ellipse(sx, sy, scaleWidth / 2 - 0.5, scaleHeight / 2 - 0.5);
      g.fill();
    }
  }
}

function drawWing(
  g: Graphics,
  startX: number,
  startY: number,
  side: number,
  frame: number,
  palette: DragonPalette,
  isFrost: boolean,
) {
  const flap = Math.sin(frame * 0.4) * 8 * side;
  const flap2 = Math.sin(frame * 0.4 + 0.5) * 5 * side;

  g.fill(palette.wings);

  // Wing arm bones
  g.moveTo(startX, startY);
  g.lineTo(startX + 25 * side, startY - 15 + flap);
  g.lineTo(startX + 30 * side, startY - 5 + flap2);
  g.lineTo(startX + 20 * side, startY + 20);
  g.lineTo(startX + 10 * side, startY + 15);
  g.closePath();
  g.fill();

  // Wing membrane
  g.fill(palette.wingsMembrane);
  g.moveTo(startX + 5 * side, startY + 5);
  g.lineTo(startX + 25 * side, startY - 10 + flap);
  g.lineTo(startX + 28 * side, startY + flap2);
  g.lineTo(startX + 18 * side, startY + 15);
  g.lineTo(startX + 8 * side, startY + 12);
  g.closePath();
  g.fill();

  // Membrane details
  g.stroke({ width: 1, color: palette.bodyDark });
  g.moveTo(startX + 10 * side, startY + 5);
  g.lineTo(startX + 22 * side, startY - 5 + flap);
  g.moveTo(startX + 8 * side, startY + 8);
  g.lineTo(startX + 18 * side, startY + 5 + flap2);
  g.stroke();

  // Frost shimmer on wing edges
  if (isFrost) {
    g.fill(0xaaeeff);
    g.circle(startX + 25 * side, startY - 8 + flap, 1.5);
    g.circle(startX + 20 * side, startY + flap2, 1.5);
    g.fill();
  }
}

function drawHorn(
  g: Graphics,
  x: number,
  y: number,
  angle: number,
  length: number,
  palette: DragonPalette,
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = x + cos * length;
  const tipY = y + sin * length;
  const perpX = -sin * 2;
  const perpY = cos * 2;

  g.fill(palette.horn);
  g.moveTo(x - perpX, y - perpY);
  g.lineTo(tipX, tipY);
  g.lineTo(x + perpX, y + perpY);
  g.closePath();
  g.fill();

  g.stroke({ width: 1, color: palette.bodyDark });
  for (let i = 3; i < length; i += 4) {
    const ix = x + cos * i;
    const iy = y + sin * i;
    g.moveTo(ix - perpX * 0.5, iy - perpY * 0.5);
    g.lineTo(ix + perpX * 0.5, iy + perpY * 0.5);
  }
  g.stroke();
}

function drawClaw(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  palette: DragonPalette,
) {
  g.fill(palette.claw);
  g.moveTo(x - size / 2, y);
  g.lineTo(x, y - size);
  g.lineTo(x + size / 2, y);
  g.closePath();
  g.fill();
}

function drawIdleDragon(
  g: Graphics,
  palette: DragonPalette,
  frame: number,
  isFrost: boolean,
) {
  const breathe = Math.sin(frame * 0.25) * 2;
  const cx = 32;
  const bodyY = 70;
  const headY = 35;

  // Rear legs (idle)
  g.fill(palette.body);
  g.ellipse(25, bodyY + 25, 6, 10);
  g.ellipse(39, bodyY + 25, 6, 10);
  g.fill();

  // Claws
  drawClaw(g, 22, bodyY + 34, 4, palette);
  drawClaw(g, 28, bodyY + 34, 4, palette);
  drawClaw(g, 36, bodyY + 34, 4, palette);
  drawClaw(g, 42, bodyY + 34, 4, palette);

  // Tail
  g.fill(palette.body);
  g.moveTo(cx, bodyY + 15);
  g.quadraticCurveTo(cx + 20, bodyY + 25, cx + 15, bodyY + 45);
  g.quadraticCurveTo(cx + 10, bodyY + 55, cx + 5, bodyY + 60);
  g.lineTo(cx - 5, bodyY + 58);
  g.quadraticCurveTo(cx + 5, bodyY + 50, cx + 10, bodyY + 40);
  g.quadraticCurveTo(cx + 15, bodyY + 25, cx, bodyY + 18);
  g.fill();

  // Tail spikes
  g.fill(palette.bodyDark);
  g.circle(cx + 8, bodyY + 52, 2);
  g.circle(cx + 3, bodyY + 58, 2);
  g.fill();

  // Main body
  g.fill(palette.body);
  g.ellipse(cx, bodyY + breathe, 20, 25);
  g.fill();

  // Body scales
  drawScales(g, cx - 5, bodyY + breathe - 5, 12, palette);
  drawScales(g, cx + 5, bodyY + breathe + 5, 10, palette);

  // Belly
  g.fill(palette.belly);
  g.ellipse(cx, bodyY + 8 + breathe, 14, 18);
  g.fill();

  // Belly scales
  drawBellyScales(g, cx, bodyY + 10 + breathe, 20, 20, palette);

  // Neck
  g.fill(palette.body);
  g.ellipse(cx - 3, headY + 15 + breathe * 0.5, 10, 15);
  g.fill();

  // Neck scales
  drawScales(g, cx - 3, headY + 18, 8, palette);

  // Head
  g.fill(palette.body);
  g.ellipse(cx, headY + breathe, 14, 12);
  g.fill();

  // Head scales
  drawScales(g, cx - 3, headY + breathe - 2, 8, palette);

  // Snout
  g.fill(palette.bodyDark);
  g.ellipse(cx, headY + 8 + breathe, 8, 6);
  g.fill();

  // Nostrils with smoke/frost
  g.fill(0x000000);
  g.circle(cx - 3, headY + 10 + breathe, 1.5);
  g.circle(cx + 3, headY + 10 + breathe, 1.5);
  g.fill();

  if (isFrost) {
    g.fill(palette.ice);
    g.circle(cx - 3, headY + 7 + breathe, 2);
    g.circle(cx + 3, headY + 7 + breathe, 2);
    g.fill();
  } else {
    g.fill(palette.fire);
    g.circle(cx - 3, headY + 7 + breathe, 2);
    g.circle(cx + 3, headY + 7 + breathe, 2);
    g.fill();
  }

  // Jaw
  g.fill(palette.bodyDark);
  g.ellipse(cx, headY + 12 + breathe, 7, 4);
  g.fill();

  // Teeth
  g.fill(0xffffff);
  for (let i = 0; i < 3; i++) {
    g.moveTo(cx - 4 + i * 3, headY + 12 + breathe);
    g.lineTo(cx - 3 + i * 3, headY + 16 + breathe);
    g.lineTo(cx - 2 + i * 3, headY + 12 + breathe);
  }
  g.fill();

  // Eyes
  g.fill(palette.eye);
  g.ellipse(cx - 6, headY - 2 + breathe, 4, 5);
  g.ellipse(cx + 6, headY - 2 + breathe, 4, 5);
  g.fill();

  g.fill(palette.eyePupil);
  g.ellipse(cx - 6, headY - 1 + breathe, 2, 3);
  g.ellipse(cx + 6, headY - 1 + breathe, 2, 3);
  g.fill();

  // Eye highlight
  g.fill(0xffffff);
  g.circle(cx - 5, headY - 3 + breathe, 1);
  g.circle(cx + 7, headY - 3 + breathe, 1);
  g.fill();

  // Horns
  drawHorn(g, cx - 8, headY - 8 + breathe, -0.4, 12, palette);
  drawHorn(g, cx + 8, headY - 8 + breathe, 0.4, 12, palette);

  // Brow ridges
  g.fill(palette.bodyDark);
  g.ellipse(cx - 6, headY - 6 + breathe, 5, 2);
  g.ellipse(cx + 6, headY - 6 + breathe, 5, 2);
  g.fill();

  // Wings
  drawWing(g, 20, 50, -1, frame, palette, isFrost);
  drawWing(g, 44, 50, 1, frame, palette, isFrost);

  // Front legs (tucked)
  g.fill(palette.body);
  g.ellipse(22, bodyY + 20, 5, 12);
  g.ellipse(42, bodyY + 20, 5, 12);
  g.fill();

  // Frost particles
  if (isFrost && frame % 3 === 0) {
    g.fill(palette.ice);
    g.circle(
      cx + 15 + Math.random() * 10,
      headY + 5 - Math.random() * 10,
      1 + Math.random(),
    );
    g.circle(
      cx - 15 - Math.random() * 10,
      headY + 5 - Math.random() * 10,
      1 + Math.random(),
    );
    g.fill();
  }
}

function drawWalkingDragon(
  g: Graphics,
  palette: DragonPalette,
  frame: number,
  isFrost: boolean,
) {
  const walkCycle = (frame % 8) / 8;
  const bodyBob = Math.sin(walkCycle * Math.PI * 2) * 3;

  const cx = 32;
  const bodyY = 70 + bodyBob;
  const headY = 35 + bodyBob;

  // Tail (swaying)
  const tailSway = Math.sin(walkCycle * Math.PI * 2) * 5;
  g.fill(palette.body);
  g.moveTo(cx, bodyY + 15);
  g.quadraticCurveTo(
    cx + 20 + tailSway,
    bodyY + 25,
    cx + 15 + tailSway,
    bodyY + 45,
  );
  g.quadraticCurveTo(
    cx + 10 + tailSway,
    bodyY + 55,
    cx + 5 + tailSway * 0.5,
    bodyY + 60,
  );
  g.lineTo(cx - 5 + tailSway * 0.5, bodyY + 58);
  g.quadraticCurveTo(
    cx + 5 + tailSway,
    bodyY + 50,
    cx + 10 + tailSway,
    bodyY + 40,
  );
  g.quadraticCurveTo(cx + 15 + tailSway, bodyY + 25, cx, bodyY + 18);
  g.fill();

  // Rear legs (walking)
  const legPhase = walkCycle * Math.PI * 2;
  const rearLegOffset = Math.sin(legPhase) * 8;
  const frontLegOffset = Math.sin(legPhase + Math.PI) * 8;

  g.fill(palette.body);
  g.ellipse(25 + rearLegOffset * 0.3, bodyY + 25, 6, 10);
  g.ellipse(39 - rearLegOffset * 0.3, bodyY + 25, 6, 10);
  g.fill();

  // Claws on ground
  drawClaw(g, 22 + rearLegOffset * 0.3, bodyY + 34, 4, palette);
  drawClaw(g, 28 + rearLegOffset * 0.3, bodyY + 34, 4, palette);
  drawClaw(g, 36 - rearLegOffset * 0.3, bodyY + 34, 4, palette);
  drawClaw(g, 42 - rearLegOffset * 0.3, bodyY + 34, 4, palette);

  // Main body
  g.fill(palette.body);
  g.ellipse(cx, bodyY, 20, 25);
  g.fill();

  // Body scales
  drawScales(g, cx - 5, bodyY - 5, 12, palette);
  drawScales(g, cx + 5, bodyY + 5, 10, palette);

  // Belly
  g.fill(palette.belly);
  g.ellipse(cx, bodyY + 8, 14, 18);
  g.fill();

  // Neck
  g.fill(palette.body);
  g.ellipse(cx - 3, headY + 15, 10, 15);
  g.fill();

  // Head
  g.fill(palette.body);
  g.ellipse(cx, headY, 14, 12);
  g.fill();

  // Snout
  g.fill(palette.bodyDark);
  g.ellipse(cx, headY + 8, 8, 6);
  g.fill();

  // Nostrils
  g.fill(0x000000);
  g.circle(cx - 3, headY + 10, 1.5);
  g.circle(cx + 3, headY + 10, 1.5);
  g.fill();

  // Eyes
  g.fill(palette.eye);
  g.ellipse(cx - 6, headY - 2, 4, 5);
  g.ellipse(cx + 6, headY - 2, 4, 5);
  g.fill();

  g.fill(palette.eyePupil);
  g.ellipse(cx - 6, headY - 1, 2, 3);
  g.ellipse(cx + 6, headY - 1, 2, 3);
  g.fill();

  // Horns
  drawHorn(g, cx - 8, headY - 8, -0.4, 12, palette);
  drawHorn(g, cx + 8, headY - 8, 0.4, 12, palette);

  // Wings (slight flap while walking)
  drawWing(g, 20, 50, -1, frame * 2, palette, isFrost);
  drawWing(g, 44, 50, 1, frame * 2, palette, isFrost);

  // Front legs (walking)
  g.fill(palette.body);
  g.ellipse(
    22 + frontLegOffset * 0.3,
    bodyY + 20 + Math.abs(frontLegOffset) * 0.5,
    5,
    12,
  );
  g.ellipse(
    42 - frontLegOffset * 0.3,
    bodyY + 20 + Math.abs(frontLegOffset) * 0.5,
    5,
    12,
  );
  g.fill();

  // Frost trail
  if (isFrost && frame % 2 === 0) {
    g.fill(palette.ice);
    g.circle(
      cx - 10 - Math.random() * 5,
      bodyY + 35 + Math.random() * 5,
      1 + Math.random(),
    );
    g.circle(
      cx + 10 + Math.random() * 5,
      bodyY + 35 + Math.random() * 5,
      1 + Math.random(),
    );
    g.fill();
  }
}

function drawAttackingDragon(
  g: Graphics,
  palette: DragonPalette,
  frame: number,
  isFrost: boolean,
) {
  const attackProgress = frame / 7;
  const lunge = attackProgress * 10;
  const bodyY = 70 - lunge * 0.3;
  const headY = 35 - lunge;

  const cx = 32;

  // Wings spread wide
  g.fill(palette.wings);
  g.moveTo(20, 50);
  g.lineTo(-5, 30);
  g.lineTo(5, 70);
  g.lineTo(20, 65);
  g.closePath();
  g.fill();

  g.moveTo(44, 50);
  g.lineTo(69, 30);
  g.lineTo(59, 70);
  g.lineTo(44, 65);
  g.closePath();
  g.fill();

  // Body
  g.fill(palette.body);
  g.ellipse(cx, bodyY, 20, 25);
  g.fill();

  // Belly
  g.fill(palette.belly);
  g.ellipse(cx, bodyY + 8, 14, 18);
  g.fill();

  // Neck (extended for attack)
  g.fill(palette.body);
  g.ellipse(cx - 3, headY + 20, 8, 18);
  g.fill();

  // Head (lunging)
  g.fill(palette.body);
  g.ellipse(cx, headY, 16, 14);
  g.fill();

  // Snout (open)
  g.fill(palette.bodyDark);
  g.ellipse(cx, headY + 10, 10, 8);
  g.fill();

  // Open mouth
  g.fill(0x220000);
  g.ellipse(cx, headY + 12, 8, 6);
  g.fill();

  // Teeth (extended)
  g.fill(0xffffff);
  for (let i = 0; i < 5; i++) {
    g.moveTo(cx - 5 + i * 2.5, headY + 10);
    g.lineTo(cx - 4 + i * 2.5, headY + 16 + lunge * 0.3);
    g.lineTo(cx - 3 + i * 2.5, headY + 10);
  }
  g.fill();

  // Eyes (angry)
  g.fill(palette.eye);
  g.ellipse(cx - 6, headY - 3, 4, 4);
  g.ellipse(cx + 6, headY - 3, 4, 4);
  g.fill();

  g.fill(palette.eyePupil);
  g.circle(cx - 5, headY - 2, 2);
  g.circle(cx + 7, headY - 2, 2);
  g.fill();

  // Angry brow
  g.fill(palette.bodyDark);
  g.ellipse(cx - 6, headY - 8, 5, 3);
  g.ellipse(cx + 6, headY - 8, 5, 3);
  g.fill();

  // Horns
  drawHorn(g, cx - 9, headY - 10, -0.3, 14, palette);
  drawHorn(g, cx + 9, headY - 10, 0.3, 14, palette);

  // Claws (extended)
  const clawExtend = lunge * 0.8;
  g.fill(palette.body);
  g.ellipse(20, bodyY + 30 + clawExtend, 6, 10);
  g.ellipse(44, bodyY + 30 + clawExtend, 6, 10);
  g.fill();

  drawClaw(g, 17, bodyY + 38 + clawExtend, 5, palette);
  drawClaw(g, 23, bodyY + 38 + clawExtend, 5, palette);
  drawClaw(g, 41, bodyY + 38 + clawExtend, 5, palette);
  drawClaw(g, 47, bodyY + 38 + clawExtend, 5, palette);

  // Attack particles
  if (isFrost) {
    g.fill(palette.ice);
    for (let i = 0; i < 5; i++) {
      g.circle(
        cx + 5 + i * 5 + Math.random() * 3,
        headY + 15 - i * 3 + Math.random() * 3,
        2,
      );
    }
    g.fill();
  } else {
    g.fill(palette.fire);
    for (let i = 0; i < 5; i++) {
      g.circle(
        cx + 5 + i * 5 + Math.random() * 3,
        headY + 15 - i * 3 + Math.random() * 3,
        2 + Math.random(),
      );
    }
    g.fill();
  }
}

function drawBreathingDragon(
  g: Graphics,
  palette: DragonPalette,
  frame: number,
  isFrost: boolean,
) {
  const breathProgress = frame / 5;
  const breathHeight = 15 + breathProgress * 25;
  const headY = 35 - breathProgress * 3;

  const cx = 32;
  const bodyY = 70;

  // Wings (raised for breath)
  g.fill(palette.wings);
  g.moveTo(20, 45);
  g.lineTo(0, 20);
  g.lineTo(10, 60);
  g.lineTo(20, 55);
  g.closePath();
  g.fill();

  g.moveTo(44, 45);
  g.lineTo(64, 20);
  g.lineTo(54, 60);
  g.lineTo(44, 55);
  g.closePath();
  g.fill();

  // Body
  g.fill(palette.body);
  g.ellipse(cx, bodyY, 20, 25);
  g.fill();

  // Belly
  g.fill(palette.belly);
  g.ellipse(cx, bodyY + 8, 14, 18);
  g.fill();

  // Neck
  g.fill(palette.body);
  g.ellipse(cx - 3, headY + 18, 10, 18);
  g.fill();

  // Head
  g.fill(palette.body);
  g.ellipse(cx, headY, 14, 12);
  g.fill();

  // Snout (open wide)
  g.fill(palette.bodyDark);
  g.ellipse(cx, headY + 10, 10, 8);
  g.fill();

  // Open mouth
  g.fill(0x000000);
  g.ellipse(cx, headY + 12, 8, 6);
  g.fill();

  // Throat glow
  const breathColor = isFrost ? palette.ice : palette.fire;
  g.fill(breathColor);
  g.ellipse(cx, headY + 14, 5, 4);
  g.fill();

  // Breath effect
  if (isFrost) {
    // Ice crystal beam
    for (let i = 0; i < 10; i++) {
      const bx = cx + 5 + i * 3 + Math.sin(i * 0.5) * 4;
      const by = headY - 5 - i * 4 - breathProgress * 5;
      const size = 4 - i * 0.3;

      g.fill(breathColor);
      g.moveTo(bx, by - size);
      g.lineTo(bx + size * 0.5, by);
      g.lineTo(bx, by + size);
      g.lineTo(bx - size * 0.5, by);
      g.closePath();
      g.fill();

      // Inner glow
      g.fill(0xffffff);
      g.circle(bx, by, size * 0.3);
      g.fill();
    }
  } else {
    // Fire cone
    g.fill(palette.fire);
    g.moveTo(cx - 8, headY);
    g.lineTo(cx - 15 - breathProgress * 10, headY - breathHeight);
    g.lineTo(cx + 15 + breathProgress * 10, headY - breathHeight);
    g.lineTo(cx + 8, headY);
    g.closePath();
    g.fill();

    // Inner fire
    g.fill(0xffff00);
    g.moveTo(cx - 4, headY);
    g.lineTo(cx - 8 - breathProgress * 5, headY - breathHeight * 0.7);
    g.lineTo(cx + 8 + breathProgress * 5, headY - breathHeight * 0.7);
    g.lineTo(cx + 4, headY);
    g.closePath();
    g.fill();

    // Fire core
    g.fill(0xffffff);
    g.moveTo(cx - 2, headY);
    g.lineTo(cx - 4 - breathProgress * 2, headY - breathHeight * 0.4);
    g.lineTo(cx + 4 + breathProgress * 2, headY - breathHeight * 0.4);
    g.lineTo(cx + 2, headY);
    g.closePath();
    g.fill();
  }

  // Eyes (focused)
  g.fill(palette.eye);
  g.ellipse(cx - 6, headY - 2, 4, 5);
  g.ellipse(cx + 6, headY - 2, 4, 5);
  g.fill();

  g.fill(palette.eyePupil);
  g.ellipse(cx - 5, headY - 1, 2, 3);
  g.ellipse(cx + 7, headY - 1, 2, 3);
  g.fill();

  // Horns
  drawHorn(g, cx - 8, headY - 8, -0.4, 12, palette);
  drawHorn(g, cx + 8, headY - 8, 0.4, 12, palette);
}

function drawDyingDragon(
  g: Graphics,
  palette: DragonPalette,
  frame: number,
  isFrost: boolean,
) {
  const deathProgress = frame / 6;
  const bodyY = 70 + deathProgress * 25;
  const headY = 35 + deathProgress * 35;
  const rotation = deathProgress * 0.3;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const cx = 32;

  const rotX = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - bodyY;
    return [cx + dx * cos - dy * sin, bodyY + dx * sin + dy * cos];
  };

  // Collapsed wings
  g.fill(palette.wings);
  g.moveTo(...rotX(20, 55));
  g.lineTo(...rotX(10, 45));
  g.lineTo(...rotX(15, 70));
  g.lineTo(...rotX(25, 65));
  g.closePath();
  g.fill();

  g.moveTo(...rotX(44, 55));
  g.lineTo(...rotX(54, 45));
  g.lineTo(...rotX(49, 70));
  g.lineTo(...rotX(39, 65));
  g.closePath();
  g.fill();

  // Body (crumbling)
  const bodyScale = 1 - deathProgress * 0.2;
  const [bodyRX, bodyRY] = rotX(cx, bodyY);
  g.fill(palette.body);
  g.ellipse(bodyRX, bodyRY, 20 * bodyScale, 25 * bodyScale);
  g.fill();

  // Belly
  const [bellyRX, bellyRY] = rotX(cx, bodyY + 8);
  g.fill(palette.belly);
  g.ellipse(bellyRX, bellyRY, 14 * bodyScale, 18 * bodyScale);
  g.fill();

  // Neck (drooping)
  const [neckRX, neckRY] = rotX(cx - 5, headY - 10);
  g.fill(palette.body);
  g.ellipse(neckRX, neckRY, 8 * bodyScale, 15 * bodyScale);
  g.fill();

  // Head (drooping)
  const [headRX, headRY] = rotX(cx - 8, headY);
  g.fill(palette.body);
  g.ellipse(headRX, headRY, 12 * bodyScale, 10 * bodyScale);
  g.fill();

  // Closed eyes (X marks)
  if (deathProgress > 0.3) {
    const [eye1X1, eye1Y1] = rotX(cx - 12, headY - 3);
    const [eye1X2, eye1Y2] = rotX(cx - 6, headY + 3);
    const [eye2X1, eye2Y1] = rotX(cx - 4, headY - 3);
    const [eye2X2, eye2Y2] = rotX(cx + 2, headY + 3);
    g.stroke({ width: 2, color: palette.eyePupil });
    g.moveTo(eye1X1, eye1Y1);
    g.lineTo(eye1X2, eye1Y2);
    g.moveTo(eye1X2, eye1Y2);
    g.lineTo(eye1X1, eye1Y1 + 6);
    g.moveTo(eye2X1, eye2Y1);
    g.lineTo(eye2X2, eye2Y2);
    g.moveTo(eye2X2, eye2Y2);
    g.lineTo(eye2X1, eye2Y1 + 6);
    g.stroke();
  }

  // Tongue (lolling)
  if (deathProgress > 0.2) {
    const [tongueX, tongueY] = rotX(cx - 8, headY + 8 + deathProgress * 5);
    g.fill(0x884444);
    g.ellipse(tongueX, tongueY, 6, 4);
    g.fill();
  }

  // Tail (on ground)
  g.fill(palette.body);
  g.moveTo(cx, bodyY + 15);
  g.quadraticCurveTo(cx + 20, bodyY + 30, cx + 25, bodyY + 50);
  g.lineTo(cx + 15, bodyY + 52);
  g.quadraticCurveTo(cx + 15, bodyY + 35, cx, bodyY + 20);
  g.fill();

  // Death particles
  if (isFrost && deathProgress < 0.6) {
    g.fill(palette.ice);
    for (let i = 0; i < 8; i++) {
      g.circle(
        cx + Math.random() * 30 - 15,
        bodyY - 20 - deathProgress * 30 + Math.random() * 30,
        1 + Math.random() * 2,
      );
    }
    g.fill();
  }
}
