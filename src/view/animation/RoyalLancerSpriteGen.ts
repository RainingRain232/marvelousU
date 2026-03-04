// Procedural sprite generator for the Royal Lancer unit type.
//
// Draws a majestic royal cavalry lancer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Heavy gold-trimmed crimson plate armor
//   • Large warhorse with ornate barding & plume
//   • Long gilded lance with royal pennant
//   • Kite shield with royal crest
//   • Flowing crimson cape
//   • Plumed great helm

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Royal palette
const COL_SKIN       = 0xf5d0b0;
const COL_GOLD       = 0xd4af37;
const COL_GOLD_LT    = 0xf5d76e;
const COL_GOLD_DK    = 0x9a7b2c;
const COL_CRIMSON    = 0x8b0000;
const COL_CRIMSON_LT = 0xbb2222;
const COL_ARMOR      = 0x99aabb;
const COL_ARMOR_HI   = 0xbbd0e8;
const COL_ARMOR_DK   = 0x667788;
const COL_HORSE      = 0xfaf0e6;  // white royal steed
const COL_HORSE_DK   = 0xc8bca0;
const COL_HORSE_HI   = 0xffffff;
const COL_MANE       = 0xe8dcc8;
const COL_BARDING    = 0x8b0000;
const COL_BARDING_LT = 0xaa2222;
const COL_SADDLE     = 0x664422;
const COL_SADDLE_DK  = 0x443322;
const COL_LANCE      = 0x8b6f47;
const COL_LANCE_HI   = 0xb8996a;
const COL_LANCE_TIP  = 0xc0c8d0;
const COL_SHIELD     = 0x8b0000;
const COL_SHIELD_RIM = 0xd4af37;
const COL_BOOT       = 0x443322;
const COL_PENNANT    = 0xd4af37;
const COL_PLUME      = 0xcc0000;
const COL_CAPE       = 0x8b0000;
const COL_CAPE_HI    = 0xaa2233;
const COL_SHADOW     = 0x000000;
const COL_EYE        = 0x222222;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function drawEllipse(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.ellipse(x, y, w, h);
}

function drawCircle(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.fill({ color });
  g.circle(x, y, r);
}

function drawLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, width = 1): void {
  g.stroke({ color, width });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

// ---------------------------------------------------------------------------
// Component drawing functions
// ---------------------------------------------------------------------------

function drawRoyalHelm(g: Graphics, x: number, y: number): void {
  // Great helm base
  drawCircle(g, x, y, 6, COL_ARMOR_DK);
  drawCircle(g, x, y, 5.5, COL_ARMOR);

  // Gold crown band
  g.fill({ color: COL_GOLD });
  g.rect(x - 6, y - 2, 12, 3);

  // Crown points
  for (let i = -2; i <= 2; i++) {
    g.fill({ color: COL_GOLD_LT });
    g.rect(x + i * 2.5 - 0.5, y - 4, 1.5, 2);
  }

  // Visor slit
  g.fill({ color: COL_SKIN });
  g.rect(x - 3, y + 1, 6, 2);

  // Eyes
  g.fill({ color: COL_EYE });
  g.circle(x - 1.5, y + 1.5, 0.7);
  g.circle(x + 1.5, y + 1.5, 0.7);

  // Plume
  g.fill({ color: COL_PLUME });
  g.rect(x - 1, y - 10, 2, 7);
  g.fill({ color: COL_CRIMSON_LT });
  g.rect(x - 0.5, y - 9, 1, 5);
}

function drawRoyalBody(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Plate torso
  g.fill({ color: COL_ARMOR });
  g.rect(x - w / 2, y, w, h);

  // Armor highlights
  g.fill({ color: COL_ARMOR_HI });
  g.rect(x - w / 2 + 1, y + 1, w - 2, 2);

  // Gold trim top and bottom
  g.fill({ color: COL_GOLD });
  g.rect(x - w / 2, y, w, 1.5);
  g.rect(x - w / 2, y + h - 1.5, w, 1.5);

  // Royal crest on chest (crimson background with gold cross)
  g.fill({ color: COL_CRIMSON });
  g.rect(x - 3, y + 3, 6, 5);
  g.fill({ color: COL_GOLD });
  g.rect(x - 0.5, y + 3, 1, 5);
  g.rect(x - 3, y + 5, 6, 1);

  // Armor shadow
  g.fill({ color: COL_ARMOR_DK });
  g.rect(x - w / 2 + 1, y + h - 3, w - 2, 1);
}

function drawRoyalHorse(g: Graphics, x: number, y: number, walkCycle: number): void {
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1;

  // Horse body — white royal steed
  g.fill({ color: COL_HORSE_DK });
  g.ellipse(x, y + bob + 1, 15, 8);
  g.fill({ color: COL_HORSE });
  g.ellipse(x, y + bob, 14, 7);
  g.fill({ color: COL_HORSE_HI });
  g.ellipse(x, y + bob - 1, 11, 4);

  // Barding (ornate cloth over horse)
  g.fill({ color: COL_BARDING });
  g.rect(x - 12, y + bob - 3, 24, 5);
  g.fill({ color: COL_BARDING_LT });
  g.rect(x - 11, y + bob - 2, 22, 3);

  // Gold trim on barding
  g.fill({ color: COL_GOLD });
  g.rect(x - 12, y + bob - 3, 24, 1);
  g.rect(x - 12, y + bob + 1, 24, 1);

  // Legs
  const legOffset = Math.sin(walkCycle * Math.PI * 2) * 2.5;
  g.fill({ color: COL_HORSE_DK });
  g.rect(x - 8, y + 5 + bob, 2, 6);
  g.rect(x - 4, y + 5 + bob - legOffset, 2, 6 + legOffset);
  g.rect(x + 2, y + 5 + bob - legOffset, 2, 6 + legOffset);
  g.rect(x + 6, y + 5 + bob, 2, 6);

  // Horse head / neck
  g.fill({ color: COL_HORSE });
  g.rect(x - 11, y - 4 + bob, 5, 8);
  g.fill({ color: COL_HORSE_HI });
  g.rect(x - 10, y - 3 + bob, 3, 6);

  // Mane
  g.fill({ color: COL_MANE });
  g.rect(x - 12, y - 3 + bob, 3, 5);

  // Horse plume (small red on head)
  g.fill({ color: COL_PLUME });
  g.rect(x - 11, y - 7 + bob, 2, 4);

  // Tail
  const tailSway = Math.sin(walkCycle * Math.PI * 2 + Math.PI) * 2;
  g.fill({ color: COL_MANE });
  g.rect(x + 10, y + tailSway, 5, 2);
}

function drawRoyalSaddle(g: Graphics, x: number, y: number): void {
  g.fill({ color: COL_SADDLE });
  g.ellipse(x, y, 7, 3.5);
  g.fill({ color: COL_SADDLE_DK });
  g.ellipse(x, y + 1, 5, 2);

  // Gold saddle trim
  g.fill({ color: COL_GOLD });
  g.rect(x - 7, y - 1, 1, 3);
  g.rect(x + 6, y - 1, 1, 3);
}

function drawRoyalLance(g: Graphics, x: number, y: number, angle: number): void {
  const lanceLength = 18;
  const endX = x + Math.cos(angle) * lanceLength;
  const endY = y + Math.sin(angle) * lanceLength;

  // Lance shaft with gold highlights
  drawLine(g, x, y, endX, endY, COL_LANCE, 4);
  drawLine(g, x, y - 1, endX, endY - 1, COL_LANCE_HI, 2);

  // Gold rings along shaft
  const midX = (x + endX) / 2;
  const midY = (y + endY) / 2;
  drawCircle(g, midX, midY, 2, COL_GOLD);

  // Steel tip
  const tipLen = 6;
  const tipX = endX + Math.cos(angle) * tipLen;
  const tipY = endY + Math.sin(angle) * tipLen;
  drawLine(g, endX, endY, tipX, tipY, COL_LANCE_TIP, 3);
  drawLine(g, endX, endY - 1, tipX, tipY - 1, COL_ARMOR_HI, 1);

  // Royal pennant
  if (Math.abs(angle) < Math.PI / 2) {
    g.fill({ color: COL_PENNANT });
    g.rect(endX - 1, endY - 9, 2, 7);
    g.fill({ color: COL_CRIMSON });
    g.rect(endX - 0.5, endY - 8, 1, 5);
  }
}

function drawRoyalShield(g: Graphics, x: number, y: number, scale = 1): void {
  const w = 10 * scale;
  const h = 12 * scale;

  // Shield body (crimson)
  g.fill({ color: COL_SHIELD });
  g.moveTo(x, y - h / 2)
    .lineTo(x + w / 2, y - h / 3)
    .lineTo(x + w / 2, y + h / 3)
    .lineTo(x, y + h / 2)
    .lineTo(x - w / 2, y + h / 3)
    .lineTo(x - w / 2, y - h / 3)
    .fill();

  // Gold rim
  g.stroke({ color: COL_SHIELD_RIM, width: 1.5 });
  g.moveTo(x, y - h / 2)
    .lineTo(x + w / 2, y - h / 3)
    .lineTo(x + w / 2, y + h / 3)
    .lineTo(x, y + h / 2)
    .lineTo(x - w / 2, y + h / 3)
    .lineTo(x - w / 2, y - h / 3)
    .closePath()
    .stroke();

  // Royal cross on shield
  g.fill({ color: COL_GOLD });
  g.rect(x - 0.5, y - h / 3, 1, h * 0.6);
  g.rect(x - w / 4, y - 1, w / 2, 1.5);

  // Boss
  drawCircle(g, x, y, 1.5 * scale, COL_GOLD_LT);
}

function drawCape(g: Graphics, x: number, y: number, sway: number, length: number): void {
  g.fill({ color: COL_CAPE });
  g.moveTo(x - 4, y)
    .lineTo(x + 4, y)
    .lineTo(x + 5 + sway, y + length)
    .lineTo(x - 5 + sway, y + length)
    .fill();

  g.fill({ color: COL_CAPE_HI });
  g.moveTo(x - 3, y)
    .lineTo(x + 3, y)
    .lineTo(x + 3 + sway * 0.5, y + length * 0.6)
    .lineTo(x - 3 + sway * 0.5, y + length * 0.6)
    .fill();

  // Gold trim at bottom edge
  g.fill({ color: COL_GOLD_DK });
  g.rect(x - 5 + sway, y + length - 1, 10, 1);
}

function drawRoyalRider(g: Graphics, x: number, y: number, breathe: number, capeSway: number): void {
  // Cape (drawn behind rider)
  drawCape(g, x, y - 5 + breathe, capeSway, 12);

  // Body
  drawRoyalBody(g, x, y - 7 + breathe, 10, 10);

  // Helm
  drawRoyalHelm(g, x, y - 15 + breathe);

  // Arms (armored)
  g.fill({ color: COL_ARMOR });
  g.rect(x - 6, y - 4 + breathe, 3, 8);
  g.rect(x + 4, y - 4 + breathe, 3, 8);

  // Gauntlets
  g.fill({ color: COL_GOLD_DK });
  g.rect(x - 6, y + 2 + breathe, 3, 2);
  g.rect(x + 4, y + 2 + breathe, 3, 2);

  // Legs in stirrups
  g.fill({ color: COL_ARMOR });
  g.rect(x - 3, y + 2, 2, 4);
  g.rect(x + 1, y + 2, 2, 4);

  // Boots
  g.fill({ color: COL_BOOT });
  g.rect(x - 3, y + 4, 2, 2);
  g.rect(x + 1, y + 4, 2, 2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.3) * 1;
  const walkCycle = frame * 0.05;
  const capeSway = Math.sin(frame * 0.2) * 1.5;

  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  drawRoyalHorse(g, CX, 28, walkCycle);
  drawRoyalSaddle(g, CX, 24);
  drawRoyalRider(g, CX, 24, breathe, capeSway);
  drawRoyalLance(g, CX + 7, 17 + breathe, -Math.PI / 6);
  drawRoyalShield(g, CX - 9, 22 + breathe, 0.8);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walkCycle = frame / 8;
  const breathe = Math.sin(frame * 0.3) * 0.5;
  const riderBob = Math.sin(walkCycle * Math.PI * 2) * 2;
  const capeSway = Math.sin(walkCycle * Math.PI * 2 + 1) * 3;

  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  drawRoyalHorse(g, CX, 28, walkCycle);
  drawRoyalSaddle(g, CX, 24 + riderBob * 0.3);
  drawRoyalRider(g, CX, 24 + riderBob, breathe, capeSway);

  const lanceAngle = -Math.PI / 6 + Math.sin(walkCycle * Math.PI * 2) * 0.15;
  drawRoyalLance(g, CX + 7, 17 + riderBob + breathe, lanceAngle);
  drawRoyalShield(g, CX - 9, 22 + riderBob + breathe, 0.8);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const charge = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
  const lean = charge * 0.5;
  const horseBob = Math.sin(t * Math.PI * 4) * 2;
  const capeSway = -charge * 6; // cape trails behind during charge

  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);
  drawRoyalHorse(g, CX, 28 + horseBob, t * 2);
  drawRoyalSaddle(g, CX, 24 + horseBob);
  drawRoyalRider(g, CX + lean * 3, 24 + horseBob - lean * 2, 0, capeSway);

  // Lance swings from ready to thrust
  const lanceAngle = -Math.PI / 4 + charge * Math.PI / 3;
  drawRoyalLance(g, CX + 7 + lean * 4, 17 + horseBob - lean * 2, lanceAngle);

  // Shield tucked in during charge
  drawRoyalShield(g, CX - 12 - lean * 2, 22 + horseBob - lean * 2, 0.6);

  // Impact sparks at peak charge
  if (t > 0.3 && t < 0.7) {
    const sparkAlpha = 1 - Math.abs(t - 0.5) * 4;
    for (let i = 0; i < 3; i++) {
      g.fill({ color: COL_GOLD_LT, alpha: sparkAlpha * 0.8 });
      g.circle(
        CX + 16 + lean * 6 + i * 4,
        17 + horseBob - lean * 2 - i * 2,
        1.5 - i * 0.3,
      );
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const raise = t * 4;
  const capeSway = Math.sin(t * Math.PI * 2) * 2;

  drawEllipse(g, CX, GY, 16, 6, COL_SHADOW);

  // Golden glow particles
  for (let i = 0; i < 5; i++) {
    const angle = t * 2 + i * 1.26;
    const dist = 8 + t * 12 + i * 3;
    const alpha = (1 - i * 0.15) * 0.6;
    g.fill({ color: COL_GOLD_LT, alpha });
    g.circle(
      CX + Math.cos(angle) * dist,
      GY - 36 + Math.sin(angle) * dist * 0.5 - raise,
      2.5 - i * 0.3,
    );
  }

  drawRoyalHorse(g, CX, 28, 0);
  drawRoyalSaddle(g, CX, 24);
  drawRoyalRider(g, CX, 24 - raise * 0.5, 0, capeSway);

  // Lance raised overhead
  drawRoyalLance(g, CX + 5, 14 - raise, -Math.PI / 3 - t * 0.3);

  // Shield glows
  drawRoyalShield(g, CX - 9, 22 - raise * 0.5, 0.8);
  g.fill({ color: COL_GOLD_LT, alpha: 0.3 + t * 0.3 });
  g.circle(CX - 9, 22 - raise * 0.5, 5 + t * 3);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallX = t * 8;
  const dropY = t * 14;
  const tilt = t * 0.4;

  // Shadow shrinking
  drawEllipse(g, CX, GY, 16 * (1 - t * 0.6), 6 * (1 - t * 0.6), COL_SHADOW, 1 - t * 0.5);

  // Horse stumbles
  if (t < 0.8) {
    drawRoyalHorse(g, CX + fallX * 0.5, 28 + dropY * 0.4, 0);
  }

  // Saddle
  if (t < 0.7) {
    drawRoyalSaddle(g, CX + fallX * 0.5, 24 + dropY * 0.4);
  }

  // Cape falls separately
  if (t < 0.9) {
    drawCape(g, CX + fallX * 0.3, 19 + dropY, t * 5, 8 * (1 - t * 0.5));
  }

  // Rider falls off
  if (t < 0.85) {
    // Body tilting
    const bx = CX + fallX;
    const by = 24 + dropY;
    g.fill({ color: COL_ARMOR });
    g.rect(bx - 5 + tilt * 3, by - 7, 10, 10);
    g.fill({ color: COL_GOLD });
    g.rect(bx - 5 + tilt * 3, by - 7, 10, 1.5);
    g.fill({ color: COL_CRIMSON });
    g.rect(bx - 3 + tilt * 3, by - 4, 6, 5);

    // Head
    drawCircle(g, bx + tilt * 3, by - 12 + tilt * 4, 5, COL_ARMOR);
    g.fill({ color: COL_GOLD });
    g.rect(bx - 5 + tilt * 3, by - 14 + tilt * 4, 10, 2);

    // Closed eyes
    if (t > 0.4) {
      g.fill({ color: 0x333333 });
      g.circle(bx - 1.5 + tilt * 3, by - 11 + tilt * 4, 0.7);
      g.circle(bx + 1.5 + tilt * 3, by - 11 + tilt * 4, 0.7);
    }
  }

  // Lance falls separately
  if (t > 0.15) {
    const lanceDrop = (t - 0.15) * 20;
    drawLine(
      g,
      CX + fallX + 8, 17 + lanceDrop,
      CX + fallX + 8 + 12, 17 + lanceDrop + 10,
      COL_LANCE, 3,
    );
  }

  // Shield bouncing away
  if (t > 0.2 && t < 0.9) {
    const shieldT = (t - 0.2) / 0.7;
    drawRoyalShield(
      g,
      CX - 10 + shieldT * 6,
      22 + dropY + shieldT * 8,
      0.6 * (1 - shieldT),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 7 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

export function generateRoyalLancerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
