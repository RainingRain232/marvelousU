// Procedural sprite generator for the Heavy Lancer unit type.
//
// Draws a knight on horseback in full plate with a long lance at 48x48 pixels
// per frame using PixiJS Graphics -> RenderTexture.  Produces textures for
// every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - Full plate armor rider with red plume
//   - Barded horse (brown body, plate armor)
//   - Long lance with steel tip
//   - Uses full 48x48 frame for mounted unit
//   - Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette - plate armor & horse
const COL_PLATE       = 0x8899aa;
const COL_PLATE_HI    = 0xaabbcc;
const COL_PLATE_DK    = 0x667788;
const COL_PLATE_EDGE  = 0x556677;

const COL_HORSE       = 0x886644;
const COL_HORSE_HI    = 0xaa8866;
const COL_HORSE_DK    = 0x664422;
const COL_HORSE_BELLY = 0x775533;
const COL_MANE        = 0x332211;
const COL_HOOF        = 0x221100;

const COL_BARDING     = 0x8899aa;
const COL_BARDING_TRIM = 0xddcc44;

const COL_LANCE_SHAFT = 0x886644;
const COL_LANCE_TIP   = 0xaabbcc;
const COL_LANCE_TIP_HI = 0xccddee;

const COL_PLUME       = 0xcc2222;
const COL_PLUME_DK    = 0x991111;

const COL_VISOR       = 0x111122;
const COL_SHADOW      = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow under the horse. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 18, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Horse body, legs, head, tail — side view facing right. */
function drawHorse(
  g: Graphics,
  ox: number,
  oy: number,
  gait: number,
  tilt: number,
): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1;
  const by = oy + bob;

  // Legs
  const legLen = 10;
  const legW = 2.5;
  const kn1 = Math.sin(gait * Math.PI * 2) * 3;
  const kn2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 3;

  // Back legs (behind barrel)
  g.rect(ox + 7, by + 5, legW, legLen + kn2).fill({ color: COL_HORSE_DK });
  g.rect(ox + 7, by + 5 + legLen + kn2, legW + 0.5, 2).fill({ color: COL_HOOF });
  g.rect(ox + 10, by + 5, legW, legLen + kn1).fill({ color: COL_HORSE });
  g.rect(ox + 10, by + 5 + legLen + kn1, legW + 0.5, 2).fill({ color: COL_HOOF });

  // Front legs
  g.rect(ox - 9, by + 4, legW, legLen + kn1).fill({ color: COL_HORSE_DK });
  g.rect(ox - 9, by + 4 + legLen + kn1, legW + 0.5, 2).fill({ color: COL_HOOF });
  g.rect(ox - 6, by + 4, legW, legLen + kn2).fill({ color: COL_HORSE });
  g.rect(ox - 6, by + 4 + legLen + kn2, legW + 0.5, 2).fill({ color: COL_HOOF });

  // Barrel (body)
  g.ellipse(ox, by, 14, 7).fill({ color: COL_HORSE });
  g.ellipse(ox, by + 2, 12, 4).fill({ color: COL_HORSE_BELLY });
  g.ellipse(ox, by - 3, 11, 3).fill({ color: COL_HORSE_HI });

  // Barding (horse armor plates)
  // Chest plate
  g.moveTo(ox - 10, by - 5)
    .lineTo(ox - 5, by - 7)
    .lineTo(ox - 2, by - 2)
    .lineTo(ox - 6, by + 4)
    .lineTo(ox - 12, by)
    .closePath()
    .fill({ color: COL_BARDING })
    .stroke({ color: COL_PLATE_EDGE, width: 0.5 });

  // Flank plate
  g.moveTo(ox + 4, by - 6)
    .lineTo(ox + 12, by - 3)
    .lineTo(ox + 12, by + 4)
    .lineTo(ox + 6, by + 5)
    .closePath()
    .fill({ color: COL_BARDING })
    .stroke({ color: COL_PLATE_EDGE, width: 0.5 });

  // Barding trim
  g.moveTo(ox - 10, by - 5).lineTo(ox - 5, by - 7)
    .stroke({ color: COL_BARDING_TRIM, width: 1 });
  g.moveTo(ox + 4, by - 6).lineTo(ox + 12, by - 3)
    .stroke({ color: COL_BARDING_TRIM, width: 1 });

  // Tail
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 2;
  g.moveTo(ox + 14, by - 1)
    .bezierCurveTo(ox + 18, by + tailSway, ox + 20, by + 5 + tailSway, ox + 17, by + 10)
    .stroke({ color: COL_MANE, width: 2.5 });

  // Neck
  const nx = ox - 12 + tilt;
  const ny = by - 10 + tilt;
  g.moveTo(ox - 10, by - 6)
    .lineTo(nx - 2, ny)
    .lineTo(nx + 4, ny - 2)
    .lineTo(ox - 6, by - 7)
    .closePath()
    .fill({ color: COL_HORSE });

  // Head armor (chanfron)
  g.ellipse(nx - 3, ny - 2, 5, 3.5).fill({ color: COL_BARDING });
  // Underlying head
  g.ellipse(nx - 6, ny, 3, 2).fill({ color: COL_HORSE_HI });
  // Eye
  g.circle(nx - 4, ny - 3, 1).fill({ color: 0x111111 });
  // Nostril
  g.circle(nx - 8, ny, 0.7).fill({ color: COL_HORSE_DK });
  // Ear
  g.moveTo(nx, ny - 4).lineTo(nx - 1, ny - 7).lineTo(nx + 2, ny - 4)
    .closePath().fill({ color: COL_HORSE_DK });

  // Mane
  for (let i = 0; i < 4; i++) {
    const mx = nx + 2 + i * 2;
    const my = ny - 3 + i;
    const mw = Math.sin(gait * Math.PI * 2 + i * 0.8) * 1.5;
    g.moveTo(mx, my).lineTo(mx + mw - 1, my + 4)
      .stroke({ color: COL_MANE, width: 2 });
  }

  // Saddle
  g.ellipse(ox - 1, by - 7, 5, 2).fill({ color: 0x664422 });
  g.rect(ox - 6, by - 9, 2, 4).fill({ color: 0x553311 });
  g.rect(ox + 2, by - 9, 2, 4).fill({ color: 0x553311 });
}

/** Rider in full plate. */
function drawRider(
  g: Graphics,
  ox: number,
  oy: number,
  breathe: number,
  lanceAngle: number,
  lanceExt: number,
): void {
  const rb = breathe;

  // Rider legs in stirrups
  g.rect(ox - 4, oy + 1, 3, 7).fill({ color: COL_PLATE });
  g.rect(ox - 5, oy + 7, 4, 2).fill({ color: COL_PLATE_DK });

  // Torso - plate armor
  const tx = ox;
  const ty = oy - 7 + rb;

  g.roundRect(tx - 5, ty, 10, 10, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_EDGE, width: 0.5 });
  // Center ridge
  g.moveTo(tx, ty + 1).lineTo(tx, ty + 9)
    .stroke({ color: COL_PLATE_HI, width: 1 });
  // Fauld plates
  for (let i = 0; i < 3; i++) {
    g.rect(tx - 4 + i * 3, ty + 9, 3, 2)
      .fill({ color: i % 2 === 0 ? COL_PLATE : COL_PLATE_DK });
  }

  // Pauldrons
  g.ellipse(tx - 5, ty + 1, 3.5, 2.5).fill({ color: COL_PLATE_HI });
  g.ellipse(tx + 5, ty + 1, 3.5, 2.5).fill({ color: COL_PLATE });

  // Lance arm (right)
  const armX = tx + 6;
  const armY = ty + 3;
  g.rect(armX - 1, ty + 2, 3, 5).fill({ color: COL_PLATE });

  // Lance
  const cos = Math.cos(lanceAngle);
  const sin = Math.sin(lanceAngle);
  const lLen = 22 + lanceExt;
  const lEndX = armX + cos * lLen;
  const lEndY = armY + sin * lLen;

  // Shaft
  g.moveTo(armX, armY).lineTo(lEndX, lEndY)
    .stroke({ color: COL_LANCE_SHAFT, width: 2.5 });
  // Shaft highlight
  g.moveTo(armX, armY - 0.5).lineTo(lEndX, lEndY - 0.5)
    .stroke({ color: COL_HORSE_HI, width: 0.8 });

  // Steel tip
  const tipStart = lLen - 4;
  const tsX = armX + cos * tipStart;
  const tsY = armY + sin * tipStart;
  g.moveTo(tsX, tsY).lineTo(lEndX, lEndY)
    .stroke({ color: COL_LANCE_TIP, width: 2.5 });
  g.moveTo(tsX, tsY - 0.3).lineTo(lEndX, lEndY - 0.3)
    .stroke({ color: COL_LANCE_TIP_HI, width: 0.7 });

  // Butt end behind rider
  const buttLen = 6;
  const bX = armX - cos * buttLen;
  const bY = armY - sin * buttLen;
  g.moveTo(armX, armY).lineTo(bX, bY)
    .stroke({ color: COL_LANCE_SHAFT, width: 2 });

  // Shield arm (left)
  g.rect(tx - 7, ty + 2, 3, 5).fill({ color: COL_PLATE });
  // Small shield
  g.moveTo(tx - 9, ty + 1)
    .lineTo(tx - 5, ty + 1)
    .lineTo(tx - 5, ty + 7)
    .lineTo(tx - 7, ty + 9)
    .lineTo(tx - 9, ty + 7)
    .closePath()
    .fill({ color: 0x3355aa })
    .stroke({ color: 0x886633, width: 0.8 });
  // Shield emblem
  g.circle(tx - 7, ty + 4, 1.2).fill({ color: COL_BARDING_TRIM });

  // Helm with visor
  const hx = tx;
  const hy = ty - 6 + rb;
  g.roundRect(hx - 4, hy, 8, 7, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_EDGE, width: 0.5 });
  // Visor slit
  g.rect(hx - 3, hy + 3, 5, 1.2).fill({ color: COL_VISOR });
  // Helm highlight
  g.roundRect(hx - 2, hy + 1, 3, 2, 1).fill({ color: COL_PLATE_HI, alpha: 0.5 });
  // Nasal guard
  g.rect(hx - 0.5, hy + 1, 1, 4).fill({ color: COL_PLATE_EDGE });

  // Red plume on top of helm
  const plumeWave = Math.sin(breathe * 3 + 1) * 1.5;
  g.moveTo(hx, hy)
    .bezierCurveTo(hx + 1, hy - 5, hx + 4 + plumeWave, hy - 6, hx + 6 + plumeWave, hy - 3)
    .stroke({ color: COL_PLUME, width: 3 });
  g.moveTo(hx + 1, hy)
    .bezierCurveTo(hx + 2, hy - 4, hx + 5 + plumeWave, hy - 5, hx + 7 + plumeWave, hy - 2)
    .stroke({ color: COL_PLUME_DK, width: 1.5 });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.35) * 0.5;
  const gait = frame * 0.03;

  drawShadow(g, CX, GY, 18, 4);
  drawHorse(g, CX, GY - 18, gait, 0);
  drawRider(g, CX - 1, GY - 25 + Math.sin(gait * Math.PI * 2) * 0.3, breathe, -Math.PI * 0.42, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.4;
  const horseBob = Math.sin(gait * Math.PI * 2) * 1.5;

  drawShadow(g, CX, GY, 18, 4);
  drawHorse(g, CX, GY - 18, gait, Math.sin(gait * Math.PI * 2) * 0.15);
  // Lance lowers slightly during gallop
  const lAngle = -Math.PI * 0.38 + Math.sin(gait * Math.PI * 2) * 0.04;
  drawRider(g, CX - 1, GY - 25 + horseBob, breathe, lAngle, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  let lanceAngle: number;
  let lanceExt: number;
  let lean: number;

  if (t < 0.25) {
    // Lower lance for charge
    const p = t / 0.25;
    lanceAngle = lerp(-Math.PI * 0.42, -Math.PI * 0.08, p);
    lanceExt = 0;
    lean = 0;
  } else if (t < 0.65) {
    // Full charge
    const p = (t - 0.25) / 0.4;
    lanceAngle = -Math.PI * 0.08 - p * 0.02;
    lanceExt = p * 5;
    lean = p * 2;
  } else {
    // Impact + pull back
    const p = (t - 0.65) / 0.35;
    lanceAngle = -Math.PI * 0.1 + p * (-Math.PI * 0.12);
    lanceExt = 5 - p * 3;
    lean = 2 - p * 2;
  }

  const gait = t * 3;

  drawShadow(g, CX, GY, 18, 4);
  drawHorse(g, CX - lean, GY - 18, gait, -0.3);
  drawRider(g, CX - 1 - lean, GY - 25 + Math.sin(gait * Math.PI) * 1.5, 0, lanceAngle, lanceExt);

  // Sparks on impact (frame 4-5)
  if (t >= 0.6 && t <= 0.8) {
    const sparkAlpha = 1 - Math.abs(t - 0.7) / 0.1;
    const tipX = CX - 1 - lean + 6 + Math.cos(lanceAngle) * (22 + lanceExt);
    const tipY = GY - 25 + 3 + Math.sin(lanceAngle) * (22 + lanceExt);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + t * 4;
      const dist = 2 + Math.random() * 4;
      g.circle(tipX + Math.cos(angle) * dist, tipY + Math.sin(angle) * dist, 0.8)
        .fill({ color: 0xffdd44, alpha: sparkAlpha * 0.8 });
    }
    g.circle(tipX, tipY, 3)
      .fill({ color: 0xffffff, alpha: sparkAlpha * 0.3 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Horse rears up on hind legs
  const t = frame / 5;

  const rearUp = Math.sin(t * Math.PI);
  const rearAngle = rearUp * 0.4;

  drawShadow(g, CX + 2, GY, 16, 3 + rearUp);

  // Horse with adjusted position for rearing
  const horseOY = GY - 18 - rearUp * 6;
  // Draw horse body manually adjusted for rearing
  const bob = rearUp * -2;
  const hox = CX + rearUp * 2;
  const hoy = horseOY + bob;

  // Back legs (planted)
  g.rect(hox + 7, hoy + 5, 2.5, 10 + rearUp * 4).fill({ color: COL_HORSE_DK });
  g.rect(hox + 10, hoy + 5, 2.5, 10 + rearUp * 3).fill({ color: COL_HORSE });
  g.rect(hox + 7, hoy + 15 + rearUp * 4, 3, 2).fill({ color: COL_HOOF });
  g.rect(hox + 10, hoy + 15 + rearUp * 3, 3, 2).fill({ color: COL_HOOF });

  // Front legs (raised)
  const frontLegRaise = rearUp * 8;
  g.rect(hox - 9, hoy + 4 - frontLegRaise, 2.5, 10).fill({ color: COL_HORSE_DK });
  g.rect(hox - 6, hoy + 4 - frontLegRaise, 2.5, 10).fill({ color: COL_HORSE });
  g.rect(hox - 9, hoy + 14 - frontLegRaise, 3, 2).fill({ color: COL_HOOF });
  g.rect(hox - 6, hoy + 14 - frontLegRaise, 3, 2).fill({ color: COL_HOOF });

  // Barrel (body) — tilted back during rear
  g.ellipse(hox, hoy, 14, 7).fill({ color: COL_HORSE });
  g.ellipse(hox, hoy + 2, 12, 4).fill({ color: COL_HORSE_BELLY });

  // Barding plates
  g.moveTo(hox - 10, hoy - 5).lineTo(hox - 5, hoy - 7)
    .lineTo(hox - 2, hoy - 2).lineTo(hox - 6, hoy + 4).lineTo(hox - 12, hoy)
    .closePath().fill({ color: COL_BARDING });
  g.moveTo(hox - 10, hoy - 5).lineTo(hox - 5, hoy - 7)
    .stroke({ color: COL_BARDING_TRIM, width: 1 });

  // Neck raised higher during rear
  const ny = hoy - 10 - rearUp * 4;
  const nx = hox - 12;
  g.moveTo(hox - 10, hoy - 6).lineTo(nx - 2, ny)
    .lineTo(nx + 4, ny - 2).lineTo(hox - 6, hoy - 7)
    .closePath().fill({ color: COL_HORSE });

  // Head
  g.ellipse(nx - 3, ny - 2, 5, 3.5).fill({ color: COL_BARDING });
  g.ellipse(nx - 6, ny, 3, 2).fill({ color: COL_HORSE_HI });
  g.circle(nx - 4, ny - 3, 1).fill({ color: 0x111111 });
  g.moveTo(nx, ny - 4).lineTo(nx - 1, ny - 7).lineTo(nx + 2, ny - 4)
    .closePath().fill({ color: COL_HORSE_DK });

  // Mane flowing
  for (let i = 0; i < 4; i++) {
    const mx = nx + 2 + i * 2;
    const my = ny - 3 + i;
    g.moveTo(mx, my).lineTo(mx + rearUp * 2, my + 4)
      .stroke({ color: COL_MANE, width: 2 });
  }

  // Tail
  g.moveTo(hox + 14, hoy - 1)
    .bezierCurveTo(hox + 18, hoy + rearUp * 3, hox + 20, hoy + 5, hox + 17, hoy + 10)
    .stroke({ color: COL_MANE, width: 2.5 });

  // Saddle
  g.ellipse(hox - 1, hoy - 7, 5, 2).fill({ color: 0x664422 });

  // Rider stays on top
  drawRider(g, hox - 1, hoy - 12 - rearUp * 3, 0, -Math.PI * 0.5 + rearAngle * 0.3, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // Horse collapses, rider thrown forward
  const t = frame / 6;

  const slideX = t * 6;
  const dropY = t * t * 12;

  drawShadow(g, CX, GY, 18 * (1 - t * 0.3), 4 * (1 - t * 0.3));

  // Horse collapsing
  if (t < 0.85) {
    const collapseY = GY - 18 + dropY * 0.5;

    // Simplified collapsing horse
    g.ellipse(CX + slideX * 0.2, collapseY + dropY * 0.3, 14 * (1 - t * 0.1), 7 - t * 2)
      .fill({ color: COL_HORSE });

    // Legs splaying
    if (t < 0.6) {
      g.rect(CX - 9 + slideX * 0.1, collapseY + 4, 2.5, 10 - t * 3)
        .fill({ color: COL_HORSE });
      g.rect(CX + 7 + slideX * 0.1, collapseY + 4, 2.5, 10 - t * 4)
        .fill({ color: COL_HORSE_DK });
    }

    // Barding visible
    g.ellipse(CX + slideX * 0.2 - 4, collapseY - 2 + dropY * 0.2, 5, 3)
      .fill({ color: COL_BARDING, alpha: 1 - t * 0.5 });
  }

  // Rider thrown forward
  if (t < 0.95) {
    const throwX = t * 12;
    const throwY = -Math.sin(t * Math.PI) * 8 + t * t * 10;
    const riderX = CX - 1 + throwX;
    const riderY = GY - 25 + throwY;
    const tumble = t * 4;

    // Simplified falling rider
    g.roundRect(riderX - 4, riderY + tumble * 2, 8, 8 * (1 - t * 0.2), 1)
      .fill({ color: COL_PLATE })
      .stroke({ color: COL_PLATE_EDGE, width: 0.5 });

    // Helm
    if (t < 0.7) {
      g.roundRect(riderX - 3, riderY - 4 + tumble, 6, 5, 2)
        .fill({ color: COL_PLATE });
      g.rect(riderX - 2, riderY - 1 + tumble, 4, 1).fill({ color: COL_VISOR });
    } else {
      // Helm flying off
      const helmFlyT = (t - 0.7) / 0.3;
      g.roundRect(riderX + 6 + helmFlyT * 5, riderY - 8 + helmFlyT * helmFlyT * 12, 5, 4, 2)
        .fill({ color: COL_PLATE });
    }

    // Lance flying away
    if (t > 0.2) {
      const lanceT = (t - 0.2) / 0.8;
      const lx = riderX + 8 + lanceT * 10;
      const ly = riderY - 4 + lanceT * lanceT * 14;
      const la = -Math.PI * 0.3 + lanceT * 2;
      g.moveTo(lx, ly).lineTo(lx + Math.cos(la) * 12, ly + Math.sin(la) * 12)
        .stroke({ color: COL_LANCE_SHAFT, width: 2 });
    }

    // Flailing arms
    if (t < 0.8) {
      g.moveTo(riderX + 4, riderY + 2 + tumble)
        .lineTo(riderX + 8 + Math.cos(tumble * 2) * 3, riderY + tumble + Math.sin(tumble * 2) * 4)
        .stroke({ color: COL_PLATE, width: 2.5 });
      g.moveTo(riderX - 4, riderY + 2 + tumble)
        .lineTo(riderX - 7 + Math.cos(tumble * 2 + Math.PI) * 3, riderY + 1 + tumble + Math.sin(tumble * 2 + Math.PI) * 3)
        .stroke({ color: COL_PLATE, width: 2.5 });
    }
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
 * Generate all heavy lancer sprite frames procedurally.
 *
 * Returns a map from `UnitState` -> ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateHeavyLancerFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
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
