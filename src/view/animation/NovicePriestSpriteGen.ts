// Procedural sprite generator for the Novice Priest unit type.
//
// Draws a humble healer in white/gold robes at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   - White hooded robe with gold trim
//   - Bare hands with healing glow
//   - Prayer book in off-hand
//   - Small, humble figure
//   - Green healing energy effects

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette - white robes & gold trim
const COL_ROBE       = 0xf0f0e8;
const COL_ROBE_SHADE = 0xd4d4c8;
const COL_ROBE_DARK  = 0xb8b8aa;
const COL_GOLD_TRIM  = 0xddcc44;
const COL_GOLD_DARK  = 0xaa9922;
const COL_SKIN       = 0xd4a574;
const COL_SKIN_DARK  = 0xb8875a;
const COL_HOOD       = 0xe0e0d4;
const COL_HOOD_INNER = 0x665544;
const COL_BOOK_COVER = 0x664422;
const COL_BOOK_PAGES = 0xeeeedd;
const COL_BOOK_SPINE = 0x443311;
const COL_HEAL_GLOW  = 0x88ff88;
const COL_HEAL_CORE  = 0xccffcc;
const COL_SANDAL     = 0x997755;
const COL_SANDAL_DK  = 0x775533;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

/** Shadow ellipse at feet. */
function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

/** Sandals - simple footwear. */
function drawSandals(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  g.roundRect(cx - 6 + stanceL, gy - 3, 4, 3, 1)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - 3, 4, 3, 1)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
}

/** Robe body - long flowing garment from shoulders to ankles. */
function drawRobe(
  g: Graphics,
  cx: number,
  robeTop: number,
  robeH: number,
  flare: number,
  tilt = 0,
): void {
  const topW = 12;
  const botW = 16 + flare;
  const x = cx + tilt;

  // Main robe shape - trapezoid
  g.moveTo(x - topW / 2, robeTop)
    .lineTo(x + topW / 2, robeTop)
    .lineTo(x + botW / 2, robeTop + robeH)
    .lineTo(x - botW / 2, robeTop + robeH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_SHADE, width: 0.5 });

  // Center fold line
  g.moveTo(x, robeTop + 2)
    .lineTo(x, robeTop + robeH - 1)
    .stroke({ color: COL_ROBE_SHADE, width: 0.5 });

  // Robe side folds
  g.moveTo(x - 3, robeTop + 4)
    .lineTo(x - 4, robeTop + robeH - 2)
    .stroke({ color: COL_ROBE_DARK, width: 0.3, alpha: 0.5 });
  g.moveTo(x + 3, robeTop + 4)
    .lineTo(x + 4, robeTop + robeH - 2)
    .stroke({ color: COL_ROBE_DARK, width: 0.3, alpha: 0.5 });

  // Gold trim at hem
  g.moveTo(x - botW / 2, robeTop + robeH - 1)
    .lineTo(x + botW / 2, robeTop + robeH - 1)
    .stroke({ color: COL_GOLD_TRIM, width: 1.5 });

  // Gold trim at waist
  g.moveTo(x - topW / 2 + 1, robeTop + 5)
    .lineTo(x + topW / 2 - 1, robeTop + 5)
    .stroke({ color: COL_GOLD_TRIM, width: 1 });

  // Sash/belt
  g.rect(x - topW / 2 + 1, robeTop + 4, topW - 2, 2)
    .fill({ color: COL_GOLD_DARK, alpha: 0.6 });
}

/** Hooded head with face in shadow. */
function drawHood(
  g: Graphics,
  cx: number,
  hoodTop: number,
  tilt = 0,
): void {
  const hx = cx + tilt;

  // Hood outer shape - rounded
  g.roundRect(hx - 6, hoodTop, 12, 10, 4)
    .fill({ color: COL_HOOD })
    .stroke({ color: COL_ROBE_SHADE, width: 0.5 });

  // Hood peak
  g.moveTo(hx - 3, hoodTop)
    .lineTo(hx, hoodTop - 2)
    .lineTo(hx + 3, hoodTop)
    .closePath()
    .fill({ color: COL_HOOD });

  // Face shadow inside hood
  g.ellipse(hx, hoodTop + 5, 4, 4)
    .fill({ color: COL_HOOD_INNER });

  // Visible face - just a hint of skin
  g.ellipse(hx, hoodTop + 5, 3, 3)
    .fill({ color: COL_SKIN });

  // Eyes - gentle expression
  g.circle(hx - 1.5, hoodTop + 4, 0.6).fill({ color: 0x443322 });
  g.circle(hx + 1.5, hoodTop + 4, 0.6).fill({ color: 0x443322 });

  // Slight smile
  g.moveTo(hx - 1, hoodTop + 6)
    .bezierCurveTo(hx - 0.5, hoodTop + 7, hx + 0.5, hoodTop + 7, hx + 1, hoodTop + 6)
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });
}

/** Bare arm with hand. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Sleeve (robe colored)
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_SHADE, width: 3.5 });
  // Hand
  g.circle(ex, ey, 2).fill({ color: COL_SKIN });
}

/** Prayer book. */
function drawBook(
  g: Graphics,
  bx: number,
  by: number,
  openness = 0,
  angle = 0,
): void {
  void angle; // reserved for future rotation
  const bw = 6 + openness * 2;
  const bh = 8;

  // Book cover
  g.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 1)
    .fill({ color: COL_BOOK_COVER })
    .stroke({ color: COL_BOOK_SPINE, width: 0.8 });

  // Pages visible if open
  if (openness > 0) {
    g.rect(bx - bw / 2 + 1, by - bh / 2 + 1, bw - 2, bh - 2)
      .fill({ color: COL_BOOK_PAGES });
    // Text lines
    for (let i = 0; i < 3; i++) {
      g.moveTo(bx - bw / 2 + 2, by - bh / 2 + 2.5 + i * 2)
        .lineTo(bx + bw / 2 - 2, by - bh / 2 + 2.5 + i * 2)
        .stroke({ color: COL_BOOK_SPINE, width: 0.3, alpha: 0.5 });
    }
  }

  // Spine
  g.moveTo(bx, by - bh / 2)
    .lineTo(bx, by + bh / 2)
    .stroke({ color: COL_BOOK_SPINE, width: 1 });

  // Gold cross on cover
  g.moveTo(bx, by - 2).lineTo(bx, by + 2)
    .stroke({ color: COL_GOLD_TRIM, width: 0.8 });
  g.moveTo(bx - 1.5, by - 0.5).lineTo(bx + 1.5, by - 0.5)
    .stroke({ color: COL_GOLD_TRIM, width: 0.8 });
}

/** Healing glow effect. */
function drawHealGlow(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
): void {
  // Outer glow
  g.circle(cx, cy, radius)
    .fill({ color: COL_HEAL_GLOW, alpha: 0.1 * intensity });
  // Middle ring
  g.circle(cx, cy, radius * 0.65)
    .fill({ color: COL_HEAL_GLOW, alpha: 0.15 * intensity });
  // Core
  g.circle(cx, cy, radius * 0.3)
    .fill({ color: COL_HEAL_CORE, alpha: 0.25 * intensity });
}

/** Healing circle effect on ground. */
function drawHealCircle(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
): void {
  // Outer ring
  g.ellipse(cx, cy, radius, radius * 0.4)
    .stroke({ color: COL_HEAL_GLOW, width: 1.5, alpha });
  // Inner ring
  g.ellipse(cx, cy, radius * 0.6, radius * 0.25)
    .stroke({ color: COL_HEAL_CORE, width: 1, alpha: alpha * 0.8 });
  // Cross pattern inside circle
  g.moveTo(cx - radius * 0.4, cy)
    .lineTo(cx + radius * 0.4, cy)
    .stroke({ color: COL_HEAL_GLOW, width: 0.8, alpha: alpha * 0.6 });
  g.moveTo(cx, cy - radius * 0.2)
    .lineTo(cx, cy + radius * 0.2)
    .stroke({ color: COL_HEAL_GLOW, width: 0.8, alpha: alpha * 0.6 });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const gy2 = GY;
  const robeH = 18;
  const robeTop = gy2 - 3 - robeH + bob;
  const hoodTop = robeTop - 9 + bob;

  drawShadow(g, CX, gy2);
  drawSandals(g, CX, gy2, 0, 0);
  drawRobe(g, CX, robeTop, robeH, 0);
  drawHood(g, CX, hoodTop);

  // Hands clasped at waist level
  const handY = robeTop + 7 + bob;
  drawArm(g, CX - 5, robeTop + 3, CX - 2, handY);
  drawArm(g, CX + 5, robeTop + 3, CX + 2, handY);

  // Clasped hands
  g.ellipse(CX, handY, 3, 2).fill({ color: COL_SKIN });

  // Subtle green glow from clasped hands
  const glowPulse = 0.4 + t * 0.6;
  drawHealGlow(g, CX, handY, 5 + t * 2, glowPulse);

  // Book tucked under arm (left side)
  drawBook(g, CX - 9, robeTop + 8 + bob, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const gy2 = GY;
  const robeH = 18;
  const stanceL = Math.round(walkCycle * 2);
  const stanceR = Math.round(-walkCycle * 2);
  const robeTop = gy2 - 3 - robeH - Math.round(bob * 0.3);
  const hoodTop = robeTop - 9;

  // Robe flow based on movement
  const robeFlare = Math.abs(walkCycle) * 3;

  drawShadow(g, CX, gy2, 12 + Math.abs(walkCycle), 3);
  drawSandals(g, CX, gy2, stanceL, stanceR);
  drawRobe(g, CX, robeTop, robeH, robeFlare, walkCycle * 0.5);
  drawHood(g, CX, hoodTop, walkCycle * 0.3);

  // Right arm swinging with walk
  const rArmEndX = CX + 6 + walkCycle * 2;
  const rArmEndY = robeTop + 9 - walkCycle;
  drawArm(g, CX + 5, robeTop + 3, rArmEndX, rArmEndY);

  // Left arm holds book at side
  const lArmEndX = CX - 7;
  const lArmEndY = robeTop + 9 + walkCycle;
  drawArm(g, CX - 5, robeTop + 3, lArmEndX, lArmEndY);
  drawBook(g, lArmEndX - 2, lArmEndY + 1, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0-1=raise hands, 2-3=extend forward, 4-5=pulse, 6=recover
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const robeH = 18;
  const robeTop = gy2 - 3 - robeH;
  const hoodTop = robeTop - 9;

  drawShadow(g, CX, gy2);
  drawSandals(g, CX, gy2, -1, 1);
  drawRobe(g, CX, robeTop, robeH, 1);
  drawHood(g, CX, hoodTop);

  // Book dropped behind/down during attack
  drawBook(g, CX - 9, robeTop + 10, 0);

  // Arms extend forward with healing energy
  const reach = t < 0.55 ? t * 8 : (1 - t) * 10;
  const armH = t < 0.35 ? lerp(robeTop + 9, robeTop + 5, t / 0.35) : robeTop + 5;

  const rArmX = CX + 5 + reach;
  const lArmX = CX - 5 + reach * 0.5;
  drawArm(g, CX + 5, robeTop + 3, rArmX, armH);
  drawArm(g, CX - 5, robeTop + 3, lArmX, armH + 1);

  // Healing energy pulse from extended hands
  if (t >= 0.3 && t <= 0.9) {
    const pulseT = (t - 0.3) / 0.6;
    const pulseR = 4 + pulseT * 10;
    const pulseAlpha = 1 - pulseT * 0.7;

    // Energy stream from hands
    g.moveTo(rArmX + 2, armH)
      .lineTo(rArmX + 2 + pulseR, armH)
      .stroke({ color: COL_HEAL_GLOW, width: 3, alpha: pulseAlpha * 0.5 });
    g.moveTo(rArmX + 2, armH)
      .lineTo(rArmX + 2 + pulseR, armH)
      .stroke({ color: COL_HEAL_CORE, width: 1.5, alpha: pulseAlpha * 0.7 });

    // Energy ball at front
    drawHealGlow(g, rArmX + 2 + pulseR, armH, 4 + pulseT * 3, pulseAlpha);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: full healing cast - arms raised, large green circle
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const robeH = 18;
  const robeTop = gy2 - 3 - robeH;
  const hoodTop = robeTop - 9;

  drawShadow(g, CX, gy2, 12 + pulse * 3, 3 + pulse);

  // Ground healing circle expands
  const circleRadius = 6 + t * 14;
  const circleAlpha = t < 0.2 ? t * 5 : (t > 0.8 ? (1 - t) * 5 : 1);
  drawHealCircle(g, CX, gy2 - 1, circleRadius, circleAlpha * 0.6);

  drawSandals(g, CX, gy2, -2, 2);
  drawRobe(g, CX, robeTop, robeH, 2 + pulse * 2);
  drawHood(g, CX, hoodTop);

  // Both arms raised high
  const armRaise = lerp(robeTop + 5, robeTop - 6, Math.min(t * 2, 1));
  drawArm(g, CX + 5, robeTop + 3, CX + 4, armRaise);
  drawArm(g, CX - 5, robeTop + 3, CX - 4, armRaise);

  // Hands open upward
  g.circle(CX + 4, armRaise, 2).fill({ color: COL_SKIN });
  g.circle(CX - 4, armRaise, 2).fill({ color: COL_SKIN });

  // Powerful healing glow from raised hands
  const glowR = 6 + pulse * 6;
  drawHealGlow(g, CX, armRaise - 2, glowR, 0.7 + pulse * 0.3);

  // Rising energy particles
  for (let i = 0; i < 4; i++) {
    const px = CX + Math.sin(t * Math.PI * 4 + i * 1.5) * (6 + i * 2);
    const py = gy2 - 4 - (t * 20 + i * 5) % 25;
    const pAlpha = 0.3 + pulse * 0.4;
    g.circle(px, py, 1 + pulse).fill({ color: COL_HEAL_GLOW, alpha: pAlpha });
  }

  // Book floating/glowing near body
  drawBook(g, CX + 10, robeTop + 6 - pulse * 2, 0.3 + pulse * 0.3);
  drawHealGlow(g, CX + 10, robeTop + 6 - pulse * 2, 3, pulse * 0.5);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: falls backward, book drops, robe crumples
  const t = frame / 6;

  const gy2 = GY;
  const robeH = 18;
  const fallX = t * 6;
  const dropY = t * t * 10;
  const tiltBack = t * 4;

  const robeTop = gy2 - 3 - robeH + dropY;
  const hoodTop = robeTop - 9;

  drawShadow(g, CX - fallX * 0.3, gy2, 12 + t * 3, 3);

  // Book falls away
  if (t < 0.7) {
    const bookX = CX - 8 - t * 6;
    const bookY = robeTop + 10 + t * t * 12;
    drawBook(g, bookX, bookY, t * 0.5);
  } else {
    // Book on ground
    g.roundRect(CX - 18, gy2 - 3, 8, 3, 0.5)
      .fill({ color: COL_BOOK_COVER });
  }

  drawSandals(g, CX - fallX * 0.2, gy2, t * 2, -t);

  // Robe crumples as priest falls
  const crumple = t * 3;
  drawRobe(g, CX - fallX * 0.3, robeTop, robeH * (1 - t * 0.2), crumple, -tiltBack);

  if (t < 0.85) {
    drawHood(g, CX - fallX * 0.4, hoodTop + dropY * 0.4, -tiltBack * 0.7);
  }

  // Arms fall limp
  if (t < 0.6) {
    drawArm(g, CX - 5 - fallX * 0.3, robeTop + 3,
      CX - 8 - fallX, robeTop + 8 + dropY * 0.5);
    drawArm(g, CX + 5 - fallX * 0.3, robeTop + 3,
      CX + 3 - fallX * 0.5, robeTop + 10 + dropY * 0.3);
  }

  // Fading heal glow on death
  if (t < 0.4) {
    const fadeGlow = 1 - t * 2.5;
    drawHealGlow(g, CX - fallX * 0.3, robeTop + 7, 4, fadeGlow);
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
 * Generate all novice priest sprite frames procedurally.
 *
 * Returns a map from `UnitState` -> ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateNovicePriestFrames(
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
