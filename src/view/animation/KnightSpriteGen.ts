// Procedural sprite generator for the Knight unit type.
//
// Draws a detailed side-view armored knight on horseback at 96×48 pixels
// per frame using PixiJS Graphics → RenderTexture.  Produces textures for
// every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Side-view destrier warhorse with barding, flowing mane & tail
//   • Fully articulated plate armor with pauldrons, gauntlets, greaves
//   • Great helm with visor slit and tall plume
//   • Kite shield with heraldic crest on left arm
//   • Longsword held in right hand
//   • Caparison / horse cloth with heraldic trim
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 96;          // frame width  (px) – 2 tiles wide
const FH = 96;          // frame height (px) – 2 tiles high
const OY = 30;           // vertical offset to center art in taller frame
const GY = FH - 4;      // ground line Y

// Palette ─ royal knight cavalry
const COL_PLATE       = 0x8899aa;
const COL_PLATE_HI    = 0xaabbcc;
const COL_PLATE_DK    = 0x5c6b7a;
const COL_PLATE_EDGE  = 0x4a5868;
const COL_CHAINMAIL   = 0x778899;

const COL_HORSE       = 0x6b4f32;
const COL_HORSE_HI    = 0x8b6f52;
const COL_HORSE_DK    = 0x4b3722;
const COL_HORSE_BELLY = 0x7b5f42;
const COL_MANE        = 0x2a1e14;
const COL_HOOF        = 0x2a2218;

const COL_CAPARISON   = 0x2244aa;
const COL_CAPARISON_TRIM = 0xddaa33;

const COL_SADDLE      = 0x5a3318;
const COL_SADDLE_DK   = 0x3a2210;
const COL_REINS       = 0x3a2a1a;

const COL_SWORD       = 0xc8d0d8;
const COL_SWORD_HI    = 0xe8f0f8;
const COL_SWORD_EDGE  = 0xa0a8b0;
const COL_GUARD       = 0x886633;
const COL_POMMEL      = 0x664422;
const COL_GRIP        = 0x443322;

const COL_SHIELD      = 0x2244aa;
const COL_SHIELD_RIM  = 0x997744;
const COL_SHIELD_BOSS = 0xbbaa77;
const COL_CREST       = 0xcc2222;

const COL_PLUME       = 0xcc2222;
const COL_PLUME_TIP   = 0xff4444;

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
// Horse (side-view, facing left)
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number): void {
  // The horse faces LEFT.  ox, oy is center of the barrel.
  const bob = Math.sin(gait * Math.PI * 2) * 1.5;
  const by = oy + bob; // barrel center Y

  // ── Legs ──────────────────────────────────────────────────────────────
  // Four legs with alternating gait.  Front pair and back pair.
  const legLen = 14;
  const legW = 3;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs (behind barrel – draw first)
  const blx = ox + 10;
  // Far back leg
  rect(g, blx - 1, by + 6, legW, legLen + kneeOff2, COL_HORSE_DK);
  rect(g, blx - 1, by + 6 + legLen + kneeOff2, legW + 1, 2, COL_HOOF); // hoof
  // Near back leg
  rect(g, blx + 3, by + 6, legW, legLen + kneeOff, COL_HORSE);
  rect(g, blx + 3, by + 6 + legLen + kneeOff, legW + 1, 2, COL_HOOF);

  // Front legs
  const flx = ox - 14;
  // Far front leg
  rect(g, flx - 1, by + 5, legW, legLen + kneeOff, COL_HORSE_DK);
  rect(g, flx - 1, by + 5 + legLen + kneeOff, legW + 1, 2, COL_HOOF);
  // Near front leg
  rect(g, flx + 3, by + 5, legW, legLen + kneeOff2, COL_HORSE);
  rect(g, flx + 3, by + 5 + legLen + kneeOff2, legW + 1, 2, COL_HOOF);

  // ── Barrel (body) ────────────────────────────────────────────────────
  ellipse(g, ox, by, 20, 10, COL_HORSE);
  // Belly highlight
  ellipse(g, ox, by + 3, 17, 6, COL_HORSE_BELLY);
  // Back highlight
  ellipse(g, ox, by - 4, 16, 4, COL_HORSE_HI);

  // ── Caparison (horse cloth) ──────────────────────────────────────────
  // Drapes over back half
  poly(g, [
    ox - 4, by - 9,
    ox + 16, by - 6,
    ox + 18, by + 4,
    ox + 14, by + 10,
    ox - 2, by + 10,
    ox - 8, by - 2,
  ], COL_CAPARISON, 0.85);
  // Trim
  line(g, ox - 4, by - 9, ox + 16, by - 6, COL_CAPARISON_TRIM, 1.5);
  line(g, ox - 2, by + 10, ox + 14, by + 10, COL_CAPARISON_TRIM, 1.5);

  // ── Tail ─────────────────────────────────────────────────────────────
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 20;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 6, ty + tailSway, tx + 10, ty + 6 + tailSway, tx + 8, ty + 12);
  g.stroke({ color: COL_MANE, width: 2 });
  g.moveTo(tx, ty + 1).bezierCurveTo(tx + 4, ty + tailSway + 2, tx + 8, ty + 8 + tailSway, tx + 6, ty + 14);

  // ── Neck ─────────────────────────────────────────────────────────────
  const nx = ox - 18;
  const ny = by - 6 + tilt * 2;
  poly(g, [
    ox - 14, by - 8,
    nx, ny - 10,
    nx + 6, ny - 12,
    ox - 8, by - 10,
  ], COL_HORSE);
  // Neck highlight
  line(g, nx + 2, ny - 11, ox - 10, by - 9, COL_HORSE_HI, 2);

  // ── Head ─────────────────────────────────────────────────────────────
  const hx = nx - 4;
  const hy = ny - 12 + tilt * 2;
  // Skull
  ellipse(g, hx, hy, 8, 5, COL_HORSE);
  // Muzzle
  ellipse(g, hx - 6, hy + 2, 4, 3, COL_HORSE_HI);
  // Nostril
  circle(g, hx - 8, hy + 2, 1, COL_HORSE_DK);
  // Eye
  circle(g, hx - 2, hy - 2, 1.5, 0x111111);
  circle(g, hx - 2.5, hy - 2.5, 0.5, 0xffffff);
  // Ear
  poly(g, [hx + 2, hy - 5, hx + 1, hy - 9, hx + 4, hy - 6], COL_HORSE_DK);

  // ── Mane ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const mx = nx + 1 + i * 2.5;
    const my = ny - 12 + i * 1.5;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.7) * 2;
    line(g, mx, my, mx + maneWave - 2, my + 5, COL_MANE, 2);
  }

  // ── Bridle / Reins ───────────────────────────────────────────────────
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1);
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle ───────────────────────────────────────────────────────────
  ellipse(g, ox - 4, by - 10, 8, 3, COL_SADDLE);
  rect(g, ox - 12, by - 12, 3, 5, COL_SADDLE_DK); // pommel
  rect(g, ox + 2, by - 11, 3, 4, COL_SADDLE_DK);  // cantle
  // Stirrup strap
  line(g, ox - 6, by - 8, ox - 8, by + 4, COL_SADDLE_DK, 1);
  // Stirrup
  rect(g, ox - 10, by + 3, 4, 2, COL_PLATE_DK);
}

// ---------------------------------------------------------------------------
// Rider (armored knight, side-view, facing left)
// ---------------------------------------------------------------------------

function drawRider(g: Graphics, ox: number, oy: number, breathe: number, swordAngle: number, swordExt: number): void {
  // ox, oy = seat position (on horse's back)
  const rb = breathe; // breathing offset

  // ── Legs (in stirrups) ───────────────────────────────────────────────
  // Near leg (armored greave + sabaton)
  rect(g, ox - 8, oy + 2, 4, 10, COL_PLATE);
  rect(g, ox - 8, oy + 2, 4, 2, COL_PLATE_HI); // knee cop
  rect(g, ox - 9, oy + 11, 5, 3, COL_PLATE_DK); // sabaton

  // ── Torso ────────────────────────────────────────────────────────────
  const tx = ox - 2;
  const ty = oy - 10 + rb;

  // Chainmail undercoat peek
  rect(g, tx - 4, ty + 8, 10, 3, COL_CHAINMAIL);

  // Breastplate
  rect(g, tx - 5, ty, 12, 12, COL_PLATE);
  // Center ridge
  line(g, tx + 1, ty, tx + 1, ty + 12, COL_PLATE_HI, 1.5);
  // Upper highlight
  rect(g, tx - 4, ty + 1, 10, 2, COL_PLATE_HI);
  // Lower shadow
  rect(g, tx - 4, ty + 9, 10, 2, COL_PLATE_DK);
  // Fauld (skirt plates)
  for (let i = 0; i < 3; i++) {
    rect(g, tx - 5 + i * 4, ty + 12, 4, 3, i % 2 === 0 ? COL_PLATE : COL_PLATE_DK);
  }

  // ── Pauldrons (shoulder plates) ──────────────────────────────────────
  // Near pauldron (left shoulder – shield side)
  ellipse(g, tx - 5, ty + 1, 4, 3.5, COL_PLATE_HI);
  ellipse(g, tx - 5, ty + 1, 3, 2.5, COL_PLATE);
  // Far pauldron (right shoulder – sword side)
  ellipse(g, tx + 7, ty + 1, 4, 3.5, COL_PLATE);
  ellipse(g, tx + 7, ty + 1, 3, 2.5, COL_PLATE_DK);

  // ── Shield arm (left) ────────────────────────────────────────────────
  // Upper arm
  rect(g, tx - 8, ty + 3, 3, 7, COL_PLATE);
  // Gauntlet
  rect(g, tx - 8, ty + 9, 3, 3, COL_PLATE_DK);

  // ── Kite shield ──────────────────────────────────────────────────────
  const sx = tx - 10;
  const sy = ty + 3;
  // Shield body (kite shape)
  poly(g, [
    sx, sy - 6,
    sx + 6, sy - 3,
    sx + 6, sy + 5,
    sx, sy + 10,
    sx - 6, sy + 5,
    sx - 6, sy - 3,
  ], COL_SHIELD);
  // Rim
  g.stroke({ color: COL_SHIELD_RIM, width: 1.5 });
  g.poly([sx, sy - 6, sx + 6, sy - 3, sx + 6, sy + 5, sx, sy + 10, sx - 6, sy + 5, sx - 6, sy - 3]);
  g.stroke();
  // Boss
  circle(g, sx, sy + 1, 2, COL_SHIELD_BOSS);
  // Heraldic cross
  rect(g, sx - 1, sy - 4, 2, 12, COL_CREST);
  rect(g, sx - 4, sy - 1, 8, 2, COL_CREST);

  // ── Sword arm (right) ────────────────────────────────────────────────
  const armX = tx + 8;
  const armY = ty + 4;
  // Upper arm
  rect(g, armX, ty + 3, 3, 6, COL_PLATE);
  // Forearm + gauntlet
  const faDist = 6;
  const faX = armX + Math.cos(swordAngle) * faDist;
  const faY = armY + Math.sin(swordAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_PLATE, 3);
  circle(g, faX, faY, 2, COL_PLATE_DK); // gauntlet

  // ── Sword ────────────────────────────────────────────────────────────
  const sLen = 14 + swordExt;
  const sEndX = faX + Math.cos(swordAngle) * sLen;
  const sEndY = faY + Math.sin(swordAngle) * sLen;

  // Blade
  line(g, faX, faY, sEndX, sEndY, COL_SWORD, 2.5);
  line(g, faX, faY - 0.5, sEndX, sEndY - 0.5, COL_SWORD_HI, 1); // highlight
  line(g, faX, faY + 0.5, sEndX, sEndY + 0.5, COL_SWORD_EDGE, 0.5); // edge

  // Crossguard
  const cgAngle = swordAngle + Math.PI / 2;
  const cgLen = 4;
  line(g,
    faX + Math.cos(cgAngle) * cgLen, faY + Math.sin(cgAngle) * cgLen,
    faX - Math.cos(cgAngle) * cgLen, faY - Math.sin(cgAngle) * cgLen,
    COL_GUARD, 2
  );

  // Grip
  const gripLen = 4;
  const gEndX = faX - Math.cos(swordAngle) * gripLen;
  const gEndY = faY - Math.sin(swordAngle) * gripLen;
  line(g, faX, faY, gEndX, gEndY, COL_GRIP, 2);
  // Pommel
  circle(g, gEndX, gEndY, 1.5, COL_POMMEL);

  // ── Head (great helm) ────────────────────────────────────────────────
  const headX = tx + 1;
  const headY = ty - 7 + rb;

  // Helm body
  ellipse(g, headX, headY, 5, 6, COL_PLATE);
  // Flat front face
  rect(g, headX - 5, headY - 4, 4, 8, COL_PLATE_DK);
  // Visor slit
  rect(g, headX - 5, headY - 1, 5, 1.5, 0x111111);
  // Breathing holes
  for (let i = 0; i < 3; i++) {
    circle(g, headX - 4, headY + 2 + i * 1.5, 0.4, 0x111111);
  }
  // Helm top ridge
  line(g, headX - 3, headY - 6, headX + 3, headY - 6, COL_PLATE_HI, 1.5);
  // Edge trim
  line(g, headX - 5, headY + 4, headX + 5, headY + 4, COL_PLATE_EDGE, 1);

  // ── Plume ────────────────────────────────────────────────────────────
  const plumeWave = Math.sin(breathe * 3 + 1) * 1.5;
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
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.8;
  const gait = frame * 0.05; // very slow shuffle

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse
  drawHorse(g, 48, OY + 24, gait, 0);

  // Rider
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.5, breathe, -Math.PI * 0.35, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8; // full cycle over 8 frames
  const breathe = Math.sin(frame * 0.5) * 0.6;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (trotting)
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.3);

  // Rider (bobbing with horse)
  drawRider(g, 44, OY + 14 + horseBob, breathe, -Math.PI * 0.35 + Math.sin(gait * Math.PI * 2) * 0.1, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 → ~1
  // Wind up (0-0.4), strike (0.4-0.7), follow through (0.7-1)
  let swordAngle: number;
  let swordExt: number;
  let lean: number;

  if (t < 0.4) {
    // Wind up – raise sword overhead
    const p = t / 0.4;
    swordAngle = -Math.PI * 0.35 + p * (-Math.PI * 0.6);
    swordExt = p * 2;
    lean = 0;
  } else if (t < 0.7) {
    // Strike down
    const p = (t - 0.4) / 0.3;
    swordAngle = -Math.PI * 0.95 + p * Math.PI * 0.9;
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

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (charging)
  drawHorse(g, 48 - lean, OY + 24, t * 2, -0.3);

  // Rider
  drawRider(g, 44 - lean, OY + 14 + horseSurge * 0.5, 0, swordAngle, swordExt);
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Knight doesn't truly cast – reuse attack with slight variation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6; // 0 → ~1

  // Progressive fall: rider slides off horse then both collapse
  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  // Shadow (shrinking)
  ellipse(g, 44, GY, 22 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  // Horse (stumbling)
  if (t < 0.85) {
    const stumble = t * 3;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.5, stumble, fallAngle * 2);
  }

  // Rider (falling off)
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
 * Generate all knight sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateKnightFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
