// Procedural sprite generator for the Questing Knight unit type.
//
// Draws a detailed side-view templar knight on an armored warhorse at
// 96×96 pixels per frame using PixiJS Graphics → RenderTexture.
// Produces textures for every animation state (IDLE 8, MOVE 8, ATTACK 7,
// CAST 6, DIE 7).
//
// Visual features:
//   • Side-view heavy armored warhorse with plate barding & white caparison
//   • White surcoat with red templar cross over chainmail hauberk
//   • Great helm with flat top, visor slit, and red plume
//   • Longsword (raised skyward in idle pose)
//   • White kite shield with red templar cross
//   • Floating love-heart (signature idle quirk)
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 96;          // frame width  (px) – 2 tiles wide
const FH = 96;          // frame height (px) – 2 tiles high
const OY = 30;          // vertical offset to center art in frame
const GY = FH - 4;      // ground line Y

// Palette ─ templar questing knight
const COL_CHAIN       = 0x999999;
const COL_CHAIN_DK    = 0x777777;
const COL_SURCOAT     = 0xeeeedd;
const COL_SURCOAT_DK  = 0xccccbb;
const COL_SURCOAT_HI  = 0xffffee;
const COL_CROSS       = 0xcc0000;
const COL_CROSS_DK    = 0x990000;

const COL_HELM        = 0x99aabb;
const COL_HELM_HI     = 0xbbccdd;
const COL_HELM_DK     = 0x778899;

const COL_HORSE       = 0x3a2c1e;
const COL_HORSE_HI    = 0x5a4c3e;
const COL_HORSE_DK    = 0x221a10;
const COL_HORSE_BELLY = 0x4a3c2e;
const COL_MANE        = 0x1a1510;
const COL_HOOF        = 0x1a1610;

const COL_BARDING     = 0x888899;
const COL_BARDING_TRIM = 0xaa8844;

const COL_CAPARISON   = 0xddddcc;
const COL_CAPARISON_TRIM = 0xcc0000;

const COL_SADDLE      = 0x664422;
const COL_SADDLE_DK   = 0x443322;
const COL_REINS       = 0x3a2a1a;

const COL_SWORD       = 0xd0d8e0;
const COL_SWORD_HI    = 0xf0f4f8;
const COL_GUARD       = 0xaa8844;
const COL_GRIP        = 0x553322;
const COL_POMMEL      = 0x664422;

const COL_SHIELD      = 0xddddcc;
const COL_SHIELD_RIM  = 0xaa8844;
const COL_SHIELD_BOSS = 0xbbaa77;

const COL_PLUME       = 0xcc0000;
const COL_PLUME_TIP   = 0xff3333;

const COL_BOOT        = 0x443322;
const COL_HEART       = 0xff3366;
const COL_HEART_HI    = 0xff6699;
const COL_SHADOW      = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.ellipse(x, y, rx, ry);
}

function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.circle(x, y, r);
}

function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.rect(x, y, w, h);
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.poly(pts);
  g.fill();
}

// ---------------------------------------------------------------------------
// Horse (side-view, facing left – heavy armored templar warhorse)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.3;
  const by = oy + bob;

  // ── Legs ──────────────────────────────────────────────────────────────
  const legLen = 14;
  const legW = 3;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs
  const blx = ox + 10;
  rect(g, blx - 1, by + 7, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 7 + legLen + kneeOff2, legW + 1, 2.5, COL_HOOF);
  rect(g, blx + 3, by + 7, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 7 + legLen + kneeOff, legW + 1, 2.5, COL_HOOF);
  // Leg barding
  rect(g, blx + 2.5, by + 7, legW + 1, 5, COL_BARDING, 0.7);

  // Front legs
  const flx = ox - 14;
  rect(g, flx - 1, by + 6, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 6 + legLen + kneeOff, legW + 1, 2.5, COL_HOOF);
  rect(g, flx + 3, by + 6, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 6 + legLen + kneeOff2, legW + 1, 2.5, COL_HOOF);
  rect(g, flx + 2.5, by + 6, legW + 1, 5, COL_BARDING, 0.7);

  // ── Barrel (body) ────────────────────────────────────────────────────
  ellipse(g, ox, by, 21, 10, COL_HORSE);
  ellipse(g, ox, by + 3, 18, 6, COL_HORSE_BELLY);
  ellipse(g, ox, by - 4, 17, 4, COL_HORSE_HI);

  // ── Plate barding ────────────────────────────────────────────────────
  // Crupper
  poly(g, [
    ox + 7, by - 9,
    ox + 19, by - 4,
    ox + 19, by + 5,
    ox + 12, by + 9,
    ox + 5, by + 5,
  ], COL_BARDING, 0.8);
  line(g, ox + 7, by - 9, ox + 19, by - 4, COL_BARDING_TRIM, 1.5);

  // Peytral
  poly(g, [
    ox - 15, by - 7,
    ox - 7, by - 10,
    ox - 3, by - 4,
    ox - 7, by + 6,
    ox - 17, by + 2,
  ], COL_BARDING, 0.8);
  line(g, ox - 15, by - 7, ox - 7, by - 10, COL_BARDING_TRIM, 1.5);

  // ── White caparison with red cross ───────────────────────────────────
  const capWave = Math.sin(gait * Math.PI * 2 + 0.5) * 1;
  poly(g, [
    ox - 2, by - 9,
    ox + 7, by - 9,
    ox + 9, by + 8 + capWave,
    ox - 4, by + 8 + capWave,
  ], COL_CAPARISON, 0.8);
  // Red cross on caparison
  rect(g, ox + 1, by - 6, 2, 12 + capWave, COL_CAPARISON_TRIM, 0.7);
  rect(g, ox - 2, by - 1, 8, 2, COL_CAPARISON_TRIM, 0.7);
  // Trim
  line(g, ox - 4, by + 8 + capWave, ox + 9, by + 8 + capWave, COL_CAPARISON_TRIM, 1.5);

  // ── Tail ─────────────────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 21;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 6, ty + tailSway, tx + 10, ty + 7 + tailSway, tx + 8, ty + 14);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 18;
  const ny = by - 7 + tilt * 2;
  poly(g, [
    ox - 14, by - 9,
    nx, ny - 10,
    nx + 7, ny - 13,
    ox - 8, by - 11,
  ], COL_HORSE);
  // Crinet barding
  poly(g, [
    nx + 2, ny - 11,
    ox - 10, by - 10,
    ox - 12, by - 7,
    nx, ny - 8,
  ], COL_BARDING, 0.7);
  line(g, nx + 2, ny - 11, ox - 10, by - 10, COL_BARDING_TRIM, 1);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 4;
  const hy = ny - 12 + tilt * 2;
  // Chanfron
  ellipse(g, hx, hy, 8, 5.5, COL_BARDING);
  // Skull/muzzle
  ellipse(g, hx - 5, hy + 2, 4, 3, COL_HORSE_HI);
  circle(g, hx - 7, hy + 2, 1, COL_HORSE_DK);
  // Eye
  circle(g, hx - 1, hy - 2, 1.5, 0x111111);
  circle(g, hx - 1.5, hy - 2.5, 0.5, 0xffffff);
  // Ear
  poly(g, [hx + 3, hy - 5, hx + 2, hy - 10, hx + 5, hy - 6], COL_HORSE_DK);

  // ── Mane ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 12 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 2;
    line(g, mx, my, mx + maneWave - 2, my + 5, COL_MANE, 2);
  }

  // ── Bridle ───────────────────────────────────────────────────────────
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle ───────────────────────────────────────────────────────────
  ellipse(g, ox - 2, by - 11, 9, 3.5, COL_SADDLE);
  rect(g, ox - 12, by - 14, 4, 6, COL_SADDLE_DK);
  rect(g, ox + 4, by - 13, 4, 5, COL_SADDLE_DK);
  line(g, ox - 4, by - 9, ox - 6, by + 5, COL_SADDLE_DK, 1);
  rect(g, ox - 8, by + 4, 5, 2, COL_HELM_DK);
}

// ---------------------------------------------------------------------------
// Rider (templar questing knight, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, swordAngle: number, swordExt: number): void {
  const rb = breathe;

  // ── Legs ─────────────────────────────────────────────────────────────
  rect(g, ox - 8, oy + 2, 4, 10, COL_CHAIN);
  rect(g, ox - 8, oy + 2, 4, 2, COL_CHAIN_DK);
  rect(g, ox - 9, oy + 11, 5, 3, COL_BOOT);

  // ── Torso ────────────────────────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 11 + rb;

  // Chainmail hauberk (visible at edges)
  rect(g, tx - 6, ty - 1, 14, 16, COL_CHAIN);
  // Chain texture
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      circle(g, tx - 4 + col * 3, ty + 1 + row * 3, 0.4, COL_CHAIN_DK, 0.5);
    }
  }

  // White surcoat over chainmail
  rect(g, tx - 5, ty, 12, 15, COL_SURCOAT);
  // Surcoat highlight
  rect(g, tx - 4, ty + 1, 10, 2, COL_SURCOAT_HI);
  // Surcoat shadow fold
  rect(g, tx - 4, ty + 12, 10, 2, COL_SURCOAT_DK);
  // Center seam
  line(g, tx + 1, ty, tx + 1, ty + 15, COL_SURCOAT_DK, 0.8);

  // Red templar cross on chest
  rect(g, tx - 1, ty + 2, 3, 10, COL_CROSS);
  rect(g, tx - 4, ty + 5, 9, 3, COL_CROSS);
  // Cross shadow
  rect(g, tx - 1, ty + 2, 1, 10, COL_CROSS_DK, 0.3);

  // Surcoat skirt (below belt)
  for (let i = 0; i < 3; i++) {
    rect(g, tx - 5 + i * 4, ty + 15, 4, 3, i % 2 === 0 ? COL_SURCOAT : COL_SURCOAT_DK);
  }

  // ── Pauldrons (chainmail covered) ────────────────────────────────────
  ellipse(g, tx - 6, ty + 1, 4, 3.5, COL_CHAIN);
  ellipse(g, tx + 8, ty + 1, 4, 3.5, COL_CHAIN);

  // ── Shield arm (left) ────────────────────────────────────────────────
  rect(g, tx - 9, ty + 3, 3, 8, COL_CHAIN);
  rect(g, tx - 9, ty + 10, 3, 2, COL_CHAIN_DK);

  // ── Kite shield (white with red templar cross) ───────────────────────
  const sx = tx - 11;
  const sy = ty + 4;
  poly(g, [
    sx, sy - 7,
    sx + 7, sy - 4,
    sx + 7, sy + 6,
    sx, sy + 11,
    sx - 7, sy + 6,
    sx - 7, sy - 4,
  ], COL_SHIELD);
  // Rim
  g.stroke({ color: COL_SHIELD_RIM, width: 1.5 });
  g.poly([sx, sy - 7, sx + 7, sy - 4, sx + 7, sy + 6, sx, sy + 11, sx - 7, sy + 6, sx - 7, sy - 4]);
  g.stroke();
  // Boss
  circle(g, sx, sy + 1, 2, COL_SHIELD_BOSS);
  // Red templar cross on shield
  rect(g, sx - 1, sy - 4, 2, 12, COL_CROSS);
  rect(g, sx - 4, sy - 1, 8, 2, COL_CROSS);

  // ── Sword arm (right) ────────────────────────────────────────────────
  const armX = tx + 9;
  const armY = ty + 5;
  rect(g, armX - 1, ty + 3, 3, 7, COL_CHAIN);
  // Forearm
  const faDist = 6;
  const faX = armX + Math.cos(swordAngle) * faDist;
  const faY = armY + Math.sin(swordAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_CHAIN, 3);
  circle(g, faX, faY, 2, COL_CHAIN_DK);

  // ── Longsword ────────────────────────────────────────────────────────
  const sLen = 16 + swordExt;
  const sEndX = faX + Math.cos(swordAngle) * sLen;
  const sEndY = faY + Math.sin(swordAngle) * sLen;

  // Blade
  line(g, faX, faY, sEndX, sEndY, COL_SWORD, 2.5);
  line(g, faX, faY - 0.5, sEndX, sEndY - 0.5, COL_SWORD_HI, 1);

  // Crossguard (gold)
  const cgAngle = swordAngle + Math.PI / 2;
  const cgLen = 5;
  line(g,
    faX + Math.cos(cgAngle) * cgLen, faY + Math.sin(cgAngle) * cgLen,
    faX - Math.cos(cgAngle) * cgLen, faY - Math.sin(cgAngle) * cgLen,
    COL_GUARD, 2.5
  );

  // Grip
  const gripLen = 5;
  const gEndX = faX - Math.cos(swordAngle) * gripLen;
  const gEndY = faY - Math.sin(swordAngle) * gripLen;
  line(g, faX, faY, gEndX, gEndY, COL_GRIP, 2);
  // Pommel
  circle(g, gEndX, gEndY, 2, COL_POMMEL);

  // ── Head (flat-topped great helm) ────────────────────────────────────
  const headX = tx + 1;
  const headY = ty - 8 + rb;

  // Helm body (flat-topped barrel helm)
  g.fill({ color: COL_HELM });
  g.roundRect(headX - 6, headY - 6, 12, 14, 2);
  // Flat top
  rect(g, headX - 6, headY - 6, 12, 3, COL_HELM_HI);
  // Front face
  rect(g, headX - 6, headY - 3, 4, 10, COL_HELM_DK);
  // Visor slit (horizontal)
  rect(g, headX - 6, headY, 5, 1.5, 0x111111);
  // Breathing holes
  for (let i = 0; i < 3; i++) {
    circle(g, headX - 5, headY + 3 + i * 1.5, 0.5, 0x111111);
  }
  // Helm bottom edge
  line(g, headX - 6, headY + 6, headX + 6, headY + 6, COL_HELM_DK, 1.5);
  // Gold band
  line(g, headX - 6, headY - 3, headX + 6, headY - 3, COL_GUARD, 1);

  // ── Red plume ────────────────────────────────────────────────────────
  const plumeWave = Math.sin(breathe * 3 + 1) * 2;
  g.stroke({ color: COL_PLUME, width: 3 });
  g.moveTo(headX + 1, headY - 6).bezierCurveTo(
    headX + 6, headY - 14,
    headX + 12 + plumeWave, headY - 16,
    headX + 16 + plumeWave, headY - 12
  );
  g.stroke({ color: COL_PLUME_TIP, width: 2 });
  g.moveTo(headX + 1, headY - 6).bezierCurveTo(
    headX + 5, headY - 12,
    headX + 10 + plumeWave, headY - 14,
    headX + 14 + plumeWave, headY - 10
  );
}

// ---------------------------------------------------------------------------
// Love heart helper
// ---------------------------------------------------------------------------

function drawHeart(g: Graphics, x: number, y: number, size: number, alpha: number): void {
  const s = size;
  g.fill({ color: COL_HEART, alpha });
  g.circle(x - s * 0.3, y - s * 0.15, s * 0.4);
  g.circle(x + s * 0.3, y - s * 0.15, s * 0.4);
  g.fill({ color: COL_HEART, alpha });
  g.moveTo(x - s * 0.6, y)
    .lineTo(x + s * 0.6, y)
    .lineTo(x, y + s * 0.7)
    .fill();
  // Highlight
  g.fill({ color: COL_HEART_HI, alpha: alpha * 0.6 });
  g.circle(x - s * 0.2, y - s * 0.25, s * 0.2);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.35) * 0.7;
  const gait = frame * 0.04;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, 0);

  // Sword raised skyward (signature idle pose)
  const swordRaise = Math.sin(frame * 0.4) * 0.1;
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.4, breathe, -Math.PI * 0.65 + swordRaise, 0);

  // Floating love heart
  const heartPhase = (frame % 12) / 12;
  if (heartPhase < 0.9) {
    const heartY = OY + 2 - heartPhase * 14;
    const heartAlpha = 1 - heartPhase * 1.1;
    const heartSize = 3 + heartPhase * 2;
    drawHeart(g, 60, heartY, heartSize, Math.max(0, heartAlpha));
  }
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.5;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.25);

  // Sword held ready (angled)
  const swordSway = Math.sin(gait * Math.PI * 2) * 0.08;
  drawRider(g, 44, OY + 14 + horseBob, breathe, -Math.PI * 0.35 + swordSway, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  let swordAngle: number;
  let swordExt: number;
  let lean: number;

  if (t < 0.4) {
    // Wind up – raise sword overhead
    const p = t / 0.4;
    swordAngle = -Math.PI * 0.35 + p * (-Math.PI * 0.55);
    swordExt = p * 2;
    lean = 0;
  } else if (t < 0.7) {
    // Strike down
    const p = (t - 0.4) / 0.3;
    swordAngle = -Math.PI * 0.9 + p * Math.PI * 0.85;
    swordExt = 2 + p * 4;
    lean = p * 3;
  } else {
    // Follow through
    const p = (t - 0.7) / 0.3;
    swordAngle = -Math.PI * 0.05 - p * 0.3;
    swordExt = 6 - p * 4;
    lean = 3 - p * 3;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2;

  ellipse(g, 44, GY, 24, 5, COL_SHADOW, 0.3);
  drawHorse(g, 48 - lean, OY + 24, t * 2, -0.3);
  drawRider(g, 44 - lean, OY + 14 + horseSurge * 0.5, 0, swordAngle, swordExt);
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  ellipse(g, 44, GY, 24 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.5, stumble, fallAngle * 2);
  }

  if (t < 0.95) {
    drawRider(g, 44 + slideX, OY + 14 + dropY, 0, -Math.PI * 0.5 - fallAngle, 0);
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

/**
 * Generate all Questing Knight sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateQuestingKnightFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
