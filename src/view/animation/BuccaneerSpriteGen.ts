// Procedural sprite generator for the Buccaneer unit type.
//
// Draws an armored pirate at 48x48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Heavy leather coat with metal plates
//   • Buckler shield (leather rim, metal face)
//   • Cutlass sword
//   • Red bandana
//   • Anchor tattoo on exposed arm
//   • Stocky, wide stance
//   • Boots with buckles
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — armored pirate
const COL_SKIN       = 0xc8956e;
const COL_SKIN_DK    = 0xa87752;
const COL_COAT       = 0x554433;
const COL_COAT_DK    = 0x3a2e22;
const COL_COAT_HI    = 0x6b5843;
const COL_PLATE      = 0x778899;
const COL_PLATE_HI   = 0x99aabb;
const COL_PLATE_DK   = 0x556677;
const COL_BUCKLER_RIM= 0x886644;
const COL_BUCKLER    = 0x667788;
const COL_BUCKLER_HI = 0x88aabb;
const COL_CUTLASS    = 0xc0c8d0;
const COL_CUTLASS_HI = 0xe0e8f0;
const COL_GUARD      = 0x997744;
const COL_BANDANA    = 0xcc2222;
const COL_BANDANA_DK = 0x991111;
const COL_TATTOO     = 0x334455;
const COL_BOOT       = 0x443322;
const COL_BOOT_DK    = 0x332211;
const COL_BOOT_BUCKLE= 0x998866;
const COL_PANTS      = 0x554433;
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
function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Heavy boots with buckles. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 6, bh = 6 - squash;
  // Left boot
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  // Boot buckle
  g.rect(cx - 6 + stanceL, gy - bh + 1, 2, 1.5)
    .fill({ color: COL_BOOT_BUCKLE });
  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.6 });
  g.rect(cx + 4 + stanceR, gy - bh + 1, 2, 1.5)
    .fill({ color: COL_BOOT_BUCKLE });
}

/** Stocky legs in dark pants. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 6 + stanceL, legTop, 5, legH).fill({ color: COL_PANTS });
  g.rect(cx + 1 + stanceR, legTop, 5, legH).fill({ color: COL_PANTS });
}

/** Heavy leather coat torso with metal plates. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 16;
  const x = cx - tw / 2 + tilt;
  // Coat body
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_COAT })
    .stroke({ color: COL_COAT_DK, width: 0.7 });
  // Coat highlight
  g.roundRect(x + 2, torsoTop + 1, tw - 4, 3, 1)
    .fill({ color: COL_COAT_HI, alpha: 0.3 });
  // Metal plate on chest — left side
  g.roundRect(x + 2, torsoTop + 3, 5, 6, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.roundRect(x + 3, torsoTop + 4, 2, 2, 0.5)
    .fill({ color: COL_PLATE_HI, alpha: 0.4 });
  // Metal plate on chest — right side
  g.roundRect(x + tw - 7, torsoTop + 3, 5, 6, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Belt
  g.rect(x + 1, torsoTop + torsoH - 3, tw - 2, 2)
    .fill({ color: COL_COAT_DK });
  g.rect(cx - 1 + tilt, torsoTop + torsoH - 3, 2, 2)
    .fill({ color: COL_BOOT_BUCKLE });
}

/** Head with red bandana. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
): void {
  const hw = 10, hh = 9;
  const x = cx - hw / 2 + tilt;
  // Face
  g.ellipse(cx + tilt, headTop + hh * 0.55, hw * 0.46, hh * 0.48)
    .fill({ color: COL_SKIN });
  // Bandana
  g.roundRect(x - 1, headTop, hw + 2, 4, 1)
    .fill({ color: COL_BANDANA })
    .stroke({ color: COL_BANDANA_DK, width: 0.5 });
  // Bandana knot / tail on right
  g.moveTo(x + hw + 1, headTop + 2)
    .lineTo(x + hw + 4, headTop + 4)
    .lineTo(x + hw + 3, headTop + 6)
    .stroke({ color: COL_BANDANA, width: 1.2 });
  // Eyes — squinting
  g.rect(x + 2, headTop + 5, 2, 1).fill({ color: 0x1a1a2e });
  g.rect(x + hw - 4, headTop + 5, 2, 1).fill({ color: 0x1a1a2e });
  // Stubble dots
  g.circle(cx - 1 + tilt, headTop + hh - 1, 0.5).fill({ color: COL_SKIN_DK, alpha: 0.5 });
  g.circle(cx + 1 + tilt, headTop + hh - 1, 0.5).fill({ color: COL_SKIN_DK, alpha: 0.5 });
}

/** Cutlass — curved blade with guard. */
function drawCutlass(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  bladeLen = 14,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + sin * bladeLen;
  const tipY = baseY - cos * bladeLen;

  // Curved blade — using bezier for curve
  const midX = (baseX + tipX) / 2 + cos * 3;
  const midY = (baseY + tipY) / 2 + sin * 3;
  g.moveTo(baseX, baseY)
    .bezierCurveTo(midX - cos, midY - sin, midX + cos, midY + sin, tipX, tipY)
    .stroke({ color: COL_CUTLASS, width: 2.2 });
  // Blade highlight
  g.moveTo(baseX + cos * 0.5, baseY + sin * 0.5)
    .bezierCurveTo(midX, midY, midX + cos * 0.5, midY + sin * 0.5,
      tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_CUTLASS_HI, width: 0.6, alpha: 0.7 });

  // Guard — curved
  const gx1 = baseX + cos * 3;
  const gy1 = baseY + sin * 3;
  const gx2 = baseX - cos * 3;
  const gy2 = baseY - sin * 3;
  g.moveTo(gx1, gy1)
    .bezierCurveTo(gx1 - sin, gy1 + cos, gx2 - sin, gy2 + cos, gx2, gy2)
    .stroke({ color: COL_GUARD, width: 2 });

  // Pommel
  const pomX = baseX - sin * 2.5;
  const pomY = baseY + cos * 2.5;
  g.circle(pomX, pomY, 1.3).fill({ color: COL_COAT_DK });
}

/** Buckler shield — small round shield. */
function drawBuckler(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
): void {
  const r = 6 * scale;
  // Shield face
  g.circle(sx, sy, r)
    .fill({ color: COL_BUCKLER })
    .stroke({ color: COL_BUCKLER_RIM, width: 1.5 });
  // Inner ring
  g.circle(sx, sy, r * 0.6)
    .stroke({ color: COL_BUCKLER_HI, width: 0.8, alpha: 0.5 });
  // Center boss
  g.circle(sx, sy, r * 0.25)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Highlight
  g.circle(sx - r * 0.2, sy - r * 0.2, r * 0.2)
    .fill({ color: COL_BUCKLER_HI, alpha: 0.3 });
}

/** Arm with optional anchor tattoo. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  showTattoo = false,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 3.5 });
  // Hand
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });

  // Anchor tattoo on exposed arm
  if (showTattoo) {
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    // Anchor vertical line
    g.moveTo(mx, my - 2).lineTo(mx, my + 2)
      .stroke({ color: COL_TATTOO, width: 0.7 });
    // Anchor crossbar
    g.moveTo(mx - 1.5, my - 1).lineTo(mx + 1.5, my - 1)
      .stroke({ color: COL_TATTOO, width: 0.6 });
    // Anchor curve
    g.moveTo(mx - 1, my + 2)
      .bezierCurveTo(mx - 1, my + 3, mx + 1, my + 3, mx + 1, my + 2)
      .stroke({ color: COL_TATTOO, width: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);
  const weightShift = (t - 0.5) * 1.5;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const legTop = gy2 - 6 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const headTop = torsoTop - 9 + bob;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH, weightShift * 0.3);
  drawHead(g, CX, headTop, weightShift * 0.2);

  // Left arm — shield forward
  drawArm(g, CX - 7, torsoTop + 4, CX - 12, torsoTop + 6 + bob, false);
  drawBuckler(g, CX - 14, torsoTop + 6 + bob, 0.9);

  // Right arm — cutlass at rest, with tattoo showing
  drawArm(g, CX + 7, torsoTop + 4, CX + 11, torsoTop + torsoH - 2 + bob, true);
  drawCutlass(g, CX + 11, torsoTop + torsoH - 2 + bob, 0.2 + t * 0.05, 13);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 2;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 6 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const headTop = torsoTop - 9;

  drawShadow(g, CX, gy2, 14 + Math.abs(walkCycle) * 2, 4);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.5);
  drawHead(g, CX, headTop, walkCycle * 0.4);

  // Left arm — buckler up and forward
  const shieldBob = -walkCycle * 1.5;
  drawArm(g, CX - 7 + walkCycle * 0.5, torsoTop + 4,
    CX - 12 + shieldBob, torsoTop + 5 + walkCycle, false);
  drawBuckler(g, CX - 14 + shieldBob, torsoTop + 5 + walkCycle, 0.85);

  // Right arm — cutlass ready, swinging with walk
  drawArm(g, CX + 7 + walkCycle * 0.5, torsoTop + 4,
    CX + 10 + walkCycle, torsoTop + torsoH - 3, true);
  drawCutlass(g, CX + 10 + walkCycle, torsoTop + torsoH - 3,
    0.3 + walkCycle * 0.1, 13);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0-1=shield bash windup, 2-3=bash forward, 4-5=cutlass slash, 6=recover
  const phases = [0, 0.14, 0.28, 0.43, 0.58, 0.78, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const legTop = gy2 - 6 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Lean into attack
  const lean = t < 0.43 ? t * 4 : (1 - t) * 3.5;

  // Shield bash phase (0-0.43) then cutlass slash (0.43-1.0)
  let shieldX: number, shieldY: number;
  if (t < 0.28) {
    // Pull shield back
    shieldX = CX - 14 - t * 6;
    shieldY = torsoTop + 5;
  } else if (t < 0.43) {
    // Bash forward
    const bashT = (t - 0.28) / 0.15;
    shieldX = CX - 20 + bashT * 22;
    shieldY = torsoTop + 4;
  } else {
    // Shield returns to guard
    const retT = (t - 0.43) / 0.57;
    shieldX = CX + 2 - retT * 16;
    shieldY = torsoTop + 5 + retT;
  }

  // Cutlass angle
  let cutlassAngle: number;
  if (t < 0.43) {
    cutlassAngle = 0.3;
  } else if (t < 0.58) {
    cutlassAngle = lerp(0.3, -1.5, (t - 0.43) / 0.15);
  } else if (t < 0.78) {
    cutlassAngle = lerp(-1.5, 1.4, (t - 0.58) / 0.2);
  } else {
    cutlassAngle = lerp(1.4, 0.3, (t - 0.78) / 0.22);
  }

  const lunge = lean > 1.5 ? 3 : 0;

  drawShadow(g, CX + lean, gy2, 14 + lean, 4);
  drawBoots(g, CX, gy2, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.6);

  // Shield arm + buckler
  drawArm(g, CX - 7 + lean, torsoTop + 4, shieldX, shieldY, false);
  drawBuckler(g, shieldX, shieldY, t >= 0.28 && t < 0.43 ? 1.1 : 0.85);

  // Shield bash impact effect
  if (t >= 0.35 && t <= 0.5) {
    const impactAlpha = 1 - Math.abs(t - 0.42) / 0.08;
    g.circle(shieldX + 4, shieldY, 5 + impactAlpha * 4)
      .stroke({ color: 0xffddaa, width: 1.5, alpha: impactAlpha * 0.6 });
  }

  // Cutlass arm
  const cutlassReach = t > 0.43 ? (t < 0.7 ? (t - 0.43) * 15 : (1 - t) * 8) : 0;
  const cArmX = CX + 8 + lean + cutlassReach;
  const cArmY = torsoTop + 3 + (t > 0.58 ? 2 : 0);
  drawArm(g, CX + 7 + lean, torsoTop + 4, cArmX, cArmY, true);
  drawCutlass(g, cArmX, cArmY, cutlassAngle, 14);

  // Cutlass slash trail
  if (t >= 0.55 && t <= 0.78) {
    const trailAlpha = 1 - Math.abs(t - 0.65) / 0.13;
    g.moveTo(cArmX + 2, cArmY - 8)
      .bezierCurveTo(cArmX + 8, cArmY - 3, cArmX + 10, cArmY + 5, cArmX + 5, cArmY + 10)
      .stroke({ color: 0xffffff, width: 1.5, alpha: trailAlpha * 0.5 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: raises buckler overhead, defensive stance, shield glows
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const legTop = gy2 - 6 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  drawShadow(g, CX, gy2, 14 + t * 3, 4);
  drawBoots(g, CX, gy2, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Shield arm raises overhead
  const raiseT = Math.min(t * 2.5, 1);
  const shieldArmY = lerp(torsoTop + 5, torsoTop - 6, raiseT);
  drawArm(g, CX - 7, torsoTop + 4, CX - 2, shieldArmY, false);
  drawBuckler(g, CX - 2, shieldArmY, 1.0 + pulse * 0.15);

  // Shield glow effect
  if (t > 0.2) {
    const glowT = (t - 0.2) / 0.8;
    const glowR = 8 + glowT * 6 + pulse * 3;
    g.circle(CX - 2, shieldArmY, glowR)
      .fill({ color: 0xffdd88, alpha: 0.08 + glowT * 0.08 });
    g.circle(CX - 2, shieldArmY, glowR * 0.6)
      .fill({ color: 0xffeeaa, alpha: 0.12 + glowT * 0.06 });
  }

  // Cutlass arm lowered — defensive ready
  drawArm(g, CX + 7, torsoTop + 4, CX + 10, torsoTop + torsoH - 1, true);
  drawCutlass(g, CX + 10, torsoTop + torsoH - 1, 0.1, 13);

  // Protective particles around shield
  if (t > 0.3) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + t * 4;
      const dist = 8 + pulse * 2;
      g.circle(CX - 2 + Math.cos(angle) * dist, shieldArmY + Math.sin(angle) * dist, 1)
        .fill({ color: 0xffddaa, alpha: 0.4 * (1 - t * 0.3) });
    }
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: falls backward over shield, cutlass clatters
  const t = frame / 6;

  const gy2 = GY;
  const legH = 7;
  const torsoH = 12;
  const legTop = gy2 - 6 - legH;

  // Falls backward
  const fallBack = t * 8;
  const dropY = t * t * 6;
  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX - fallBack * 0.3, gy2, 14 + t * 4, 4);

  // Legs buckle forward
  if (t < 0.8) {
    const squash = Math.round(t * 3);
    drawBoots(g, CX - fallBack * 0.2, gy2, -t * 2, t, squash);
    drawLegs(g, CX - fallBack * 0.2, legTop + dropY * 0.4,
      legH * (1 - t * 0.3), -t * 2, t);
  }

  // Torso falls backward
  drawTorso(g, CX - fallBack * 0.4, torsoTop, torsoH * (1 - t * 0.15), -t * 3);
  drawHead(g, CX - fallBack * 0.5, headTop + dropY * 0.3, -t * 4);

  // Shield falls to ground — character falls over it
  if (t < 0.5) {
    drawBuckler(g, CX - 10 - t * 3, torsoTop + 6 + t * 8, 0.85 * (1 - t * 0.3));
  } else {
    // Shield flat on ground
    g.ellipse(CX - 12, gy2 - 2, 5, 2)
      .fill({ color: COL_BUCKLER, alpha: 0.7 })
      .stroke({ color: COL_BUCKLER_RIM, width: 0.8, alpha: 0.7 });
  }

  // Cutlass clatters away
  if (t < 0.75) {
    const cutlassX = CX + 12 + t * 12;
    const cutlassY = torsoTop + torsoH * 0.5 + t * t * 10;
    const cutlassAngle = t * 4;
    drawCutlass(g, cutlassX, cutlassY, cutlassAngle, 13 * (1 - t * 0.2));
  }

  // Clatter sparks from cutlass hitting ground
  if (t >= 0.4 && t <= 0.65) {
    const sparkT = (t - 0.4) / 0.25;
    const sparkX = CX + 12 + t * 12;
    for (let i = 0; i < 3; i++) {
      g.circle(sparkX + i * 3 - 3, gy2 - 2 - sparkT * 4 * (i + 1), 0.8)
        .fill({ color: 0xffddaa, alpha: 0.7 - sparkT * 0.6 });
    }
  }

  // Arms flail
  if (t < 0.7) {
    drawArm(g, CX - 7 - fallBack * 0.4, torsoTop + 4,
      CX - 12 - fallBack * 0.3, torsoTop + 8 + t * 5, false);
    drawArm(g, CX + 7 - fallBack * 0.3, torsoTop + 4,
      CX + 10 + t * 4, torsoTop + 3 + t * 8, false);
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
 * Generate all Buccaneer sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateBuccaneerFrames(
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
