// Procedural sprite generator for the Blade Adept unit type.
//
// Draws a mage-warrior hybrid at 48x48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Purple/silver robes with arcane trim
//   • Enchanted sword with purple arcane glow
//   • Slender build, elegant posture
//   • Arcane rune markings on robe
//   • Energy wisps around blade
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — arcane warrior
const COL_SKIN      = 0xd4a574;
const COL_SKIN_DK   = 0xb8875a;
const COL_ROBE      = 0x7744cc;
const COL_ROBE_DK   = 0x553399;
const COL_ROBE_LT   = 0x9966ee;
const COL_TRIM      = 0xaabbcc;
const COL_TRIM_HI   = 0xccddee;
const COL_BLADE     = 0xc0c8d0;
const COL_BLADE_HI  = 0xe0e8f0;
const COL_BLADE_GLOW= 0xaa66ff;
const COL_GUARD     = 0x886644;
const COL_POMMEL    = 0x664422;
const COL_HAIR      = 0x222244;
const COL_ENERGY    = 0xaa66ff;
const COL_ENERGY_LT = 0xcc99ff;
const COL_BOOT      = 0x443355;
const COL_BOOT_DK   = 0x332244;
const COL_SHADOW    = 0x000000;

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
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Slim boots. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 4, bh = 5;
  g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

/** Slim legs under robe. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 3, legH).fill({ color: COL_ROBE_DK });
  g.rect(cx + 2 + stanceR, legTop, 3, legH).fill({ color: COL_ROBE_DK });
}

/** Flowing robe torso — slender with silver trim. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  // Main robe body
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.6 });
  // Silver trim lines
  g.moveTo(x + 1, torsoTop + 1)
    .lineTo(x + 1, torsoTop + torsoH - 1)
    .stroke({ color: COL_TRIM, width: 0.8, alpha: 0.7 });
  g.moveTo(x + tw - 1, torsoTop + 1)
    .lineTo(x + tw - 1, torsoTop + torsoH - 1)
    .stroke({ color: COL_TRIM, width: 0.8, alpha: 0.7 });
  // Center seam
  g.moveTo(cx + tilt, torsoTop + 2)
    .lineTo(cx + tilt, torsoTop + torsoH)
    .stroke({ color: COL_ROBE_DK, width: 0.4 });
  // Shoulder trim
  g.moveTo(x, torsoTop + 1)
    .lineTo(x + tw, torsoTop + 1)
    .stroke({ color: COL_TRIM_HI, width: 1, alpha: 0.6 });
}

/** Robe skirt — flowing below torso. */
function drawRobeSkirt(
  g: Graphics,
  cx: number,
  skirtTop: number,
  skirtH: number,
  sway: number,
  tilt = 0,
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;
  // Flowing trapezoidal skirt
  g.moveTo(x + 1, skirtTop)
    .lineTo(x + tw - 1, skirtTop)
    .lineTo(x + tw + sway * 2, skirtTop + skirtH)
    .lineTo(x - 1 + sway, skirtTop + skirtH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.5 });
  // Trim at bottom
  g.moveTo(x - 1 + sway, skirtTop + skirtH)
    .lineTo(x + tw + sway * 2, skirtTop + skirtH)
    .stroke({ color: COL_TRIM, width: 1 });
  // Arcane rune on skirt
  g.circle(cx + tilt + sway * 0.5, skirtTop + skirtH * 0.5, 2)
    .stroke({ color: COL_ENERGY, width: 0.6, alpha: 0.5 });
}

/** Head with short dark hair. */
function drawHead(
  g: Graphics,
  cx: number,
  headTop: number,
  tilt = 0,
): void {
  const hw = 8, hh = 8;
  const x = cx - hw / 2 + tilt;
  // Hair (behind)
  g.roundRect(x - 1, headTop - 1, hw + 2, hh * 0.6, 3)
    .fill({ color: COL_HAIR });
  // Face
  g.ellipse(cx + tilt, headTop + hh * 0.5, hw * 0.45, hh * 0.48)
    .fill({ color: COL_SKIN });
  // Eyes
  g.rect(x + 2, headTop + 3, 1.5, 1).fill({ color: COL_HAIR });
  g.rect(x + hw - 3.5, headTop + 3, 1.5, 1).fill({ color: COL_HAIR });
}

/** Enchanted sword — blade with arcane glow. */
function drawEnchantedBlade(
  g: Graphics,
  baseX: number,
  baseY: number,
  angle: number,
  bladeLen = 16,
  glowIntensity = 0.5,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = baseX + sin * bladeLen;
  const tipY = baseY - cos * bladeLen;

  // Blade glow aura
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE_GLOW, width: 5, alpha: glowIntensity * 0.2 });

  // Blade body
  g.moveTo(baseX, baseY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE, width: 2.2 });
  // Blade highlight
  g.moveTo(baseX + cos * 0.4, baseY + sin * 0.4)
    .lineTo(tipX + cos * 0.4, tipY + sin * 0.4)
    .stroke({ color: COL_BLADE_HI, width: 0.6, alpha: 0.8 });

  // Crossguard
  const cx1 = baseX + cos * 3;
  const cy1 = baseY + sin * 3;
  const cx2 = baseX - cos * 3;
  const cy2 = baseY - sin * 3;
  g.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: COL_GUARD, width: 2 });

  // Pommel
  const pomX = baseX - sin * 3;
  const pomY = baseY + cos * 3;
  g.circle(pomX, pomY, 1.5).fill({ color: COL_POMMEL });

  // Arcane glow at tip
  g.circle(tipX, tipY, 2 + glowIntensity * 2)
    .fill({ color: COL_ENERGY, alpha: glowIntensity * 0.3 });
}

/** Slim arm. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_LT, width: 2.5 });
  // Hand
  g.circle(ex, ey, 1.8).fill({ color });
}

/** Purple energy wisps around a point. */
function drawEnergyWisps(
  g: Graphics,
  cx: number,
  cy: number,
  frame: number,
  total: number,
  count = 3,
  radius = 8,
  alpha = 0.4,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (frame / total) * Math.PI * 2;
    const dist = radius + Math.sin(angle * 2) * 2;
    const wx = cx + Math.cos(angle) * dist;
    const wy = cy + Math.sin(angle) * dist * 0.5;
    g.circle(wx, wy, 1.2).fill({ color: COL_ENERGY_LT, alpha });
    // Wisp trail
    const trailX = cx + Math.cos(angle - 0.5) * (dist - 2);
    const trailY = cy + Math.sin(angle - 0.5) * (dist - 2) * 0.5;
    g.moveTo(wx, wy).lineTo(trailX, trailY)
      .stroke({ color: COL_ENERGY, width: 0.6, alpha: alpha * 0.5 });
  }
}

/** Purple slash arc trail. */
function drawSlashArc(
  g: Graphics,
  cx: number,
  cy: number,
  startAngle: number,
  endAngle: number,
  radius: number,
  alpha: number,
): void {
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps;
    const t2 = (i + 1) / steps;
    const a1 = lerp(startAngle, endAngle, t1);
    const a2 = lerp(startAngle, endAngle, t2);
    g.moveTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius)
      .lineTo(cx + Math.cos(a2) * radius, cy + Math.sin(a2) * radius)
      .stroke({ color: COL_ENERGY, width: 2 - t1 * 1.5, alpha: alpha * (1 - t1 * 0.5) });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);

  const gy2 = GY;
  const legH = 6;
  const torsoH = 11;
  const skirtH = 5;
  const legTop = gy2 - 5 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 2 + bob;
  const headTop = torsoTop - 8 + bob;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawRobeSkirt(g, CX, skirtTop, skirtH, (t - 0.5) * 0.5);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Right arm — blade held vertically before face
  const bladeAngle = -0.05 + (t - 0.5) * 0.03;
  drawArm(g, CX + 5, torsoTop + 3, CX + 3, torsoTop - 2 + bob);
  drawEnchantedBlade(g, CX + 3, torsoTop - 2 + bob, bladeAngle, 14, 0.3 + t * 0.4);

  // Left arm relaxed at side
  drawArm(g, CX - 5, torsoTop + 3, CX - 8, torsoTop + torsoH - 2 + bob);

  // Purple energy wisps around blade
  drawEnergyWisps(g, CX + 3, torsoTop - 8 + bob, frame, 8, 3, 6, 0.2 + t * 0.2);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 11;
  const skirtH = 5;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 5 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 8;

  // Flowing robe sway
  const sway = -walkCycle * 1.5;

  drawShadow(g, CX, gy2, 12 + Math.abs(walkCycle) * 2, 3);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawRobeSkirt(g, CX, skirtTop, skirtH, sway, walkCycle * 0.3);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHead(g, CX, headTop, walkCycle * 0.3);

  // Right arm — blade at side, angled back
  const armX = CX + 8 + walkCycle;
  const armY = torsoTop + torsoH - 3;
  drawArm(g, CX + 5, torsoTop + 3, armX, armY);
  drawEnchantedBlade(g, armX, armY, 0.4 + walkCycle * 0.1, 14, 0.3);

  // Left arm swinging
  drawArm(g, CX - 5, torsoTop + 3, CX - 7 - walkCycle * 2, torsoTop + 7 + walkCycle * 2);

  // Subtle energy trail
  g.circle(CX - walkCycle * 4, torsoTop + torsoH * 0.5, 2)
    .fill({ color: COL_ENERGY, alpha: 0.08 });
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=stance, 1-2=slash wind-up, 3-4=fast slash, 5-6=follow through
  const phases = [0, 0.12, 0.28, 0.48, 0.68, 0.85, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 6;
  const torsoH = 11;
  const skirtH = 5;
  const legTop = gy2 - 5 - legH;
  const skirtTop = legTop - skirtH + 2;

  // Lean into slash
  const lean = t < 0.48 ? t * 3 : (1 - t) * 4;
  const torsoTop = skirtTop - torsoH + 2;
  const headTop = torsoTop - 8;

  // Blade angle: ready → raised → slash down → follow-through
  let bladeAngle: number;
  if (t < 0.28) {
    bladeAngle = lerp(0.2, -1.6, t / 0.28);
  } else if (t < 0.68) {
    bladeAngle = lerp(-1.6, 1.8, (t - 0.28) / 0.4);
  } else {
    bladeAngle = lerp(1.8, 0.4, (t - 0.68) / 0.32);
  }

  const lunge = t > 0.28 && t < 0.85 ? 3 : 0;

  drawShadow(g, CX + lean, gy2, 12 + lean, 3);
  drawBoots(g, CX, gy2, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawRobeSkirt(g, CX, skirtTop, skirtH, -lean * 0.5, lean * 0.5);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.7);

  // Sword arm extends during slash
  const armReach = t < 0.48 ? t * 4 : (1 - t) * 6;
  const sArmX = CX + 6 + lean + armReach;
  const sArmY = torsoTop + 3;
  drawArm(g, CX + 5 + lean, torsoTop + 3, sArmX, sArmY);
  drawEnchantedBlade(g, sArmX, sArmY, bladeAngle, 16,
    t > 0.2 && t < 0.8 ? 0.8 : 0.3);

  // Off-hand drawn back
  drawArm(g, CX - 5 + lean, torsoTop + 3, CX - 9 - lean * 0.3, torsoTop + 8);

  // Purple slash arc trail
  if (t >= 0.3 && t <= 0.75) {
    const arcT = (t - 0.3) / 0.45;
    drawSlashArc(g, sArmX + 2, sArmY, -1.5, 1.5, 10 + arcT * 4,
      0.6 - arcT * 0.4);
  }

  // Impact sparks at peak
  if (t >= 0.45 && t <= 0.7) {
    const sparkAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    for (let i = 0; i < 4; i++) {
      const sa = (i / 4) * Math.PI + t * 6;
      const sd = 4 + (t - 0.45) * 20;
      g.circle(sArmX + 4 + Math.cos(sa) * sd, sArmY + Math.sin(sa) * sd, 0.8)
        .fill({ color: COL_ENERGY_LT, alpha: sparkAlpha * 0.7 });
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: channels energy through blade, sword glows intensely
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const glowIntensity = 0.4 + t * 0.6;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 11;
  const skirtH = 5;
  const legTop = gy2 - 5 - legH;
  const skirtTop = legTop - skirtH + 2;
  const torsoTop = skirtTop - torsoH + 2;
  const headTop = torsoTop - 8;

  drawShadow(g, CX, gy2, 12 + t * 4, 3 + t);
  drawBoots(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawRobeSkirt(g, CX, skirtTop, skirtH, pulse * 0.5 - 0.25);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Both arms raising sword overhead
  const raiseT = Math.min(t * 2, 1);
  const bladeY = lerp(torsoTop + 2, torsoTop - 8, raiseT);
  drawArm(g, CX + 5, torsoTop + 3, CX + 3, bladeY + 4);
  drawArm(g, CX - 5, torsoTop + 3, CX - 1, bladeY + 5);
  drawEnchantedBlade(g, CX + 2, bladeY + 3, -0.1, 16, glowIntensity);

  // Intense glow aura around blade
  const glowR = 6 + glowIntensity * 6 + pulse * 3;
  g.circle(CX + 2, bladeY - 5, glowR)
    .fill({ color: COL_ENERGY, alpha: 0.1 + glowIntensity * 0.12 });
  g.circle(CX + 2, bladeY - 5, glowR * 0.5)
    .fill({ color: COL_ENERGY_LT, alpha: 0.15 + glowIntensity * 0.1 });

  // Energy wisps spiraling around blade — more intense
  drawEnergyWisps(g, CX + 2, bladeY - 5, frame, 6, 5, 8 + t * 4, glowIntensity * 0.5);

  // Energy channeling from hands up blade
  if (t > 0.3) {
    const chanT = (t - 0.3) / 0.7;
    g.moveTo(CX + 3, bladeY + 3)
      .lineTo(CX + 2, bladeY - 10 - chanT * 4)
      .stroke({ color: COL_ENERGY, width: 1.5, alpha: chanT * 0.5 });
  }
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: blade enchantment shatters, collapses gracefully
  const t = frame / 6;

  const gy2 = GY;
  const legH = 6;
  const torsoH = 11;
  const skirtH = 5;
  const legTop = gy2 - 5 - legH;
  const skirtTop = legTop - skirtH + 2;

  // Graceful collapse — sinks and tilts
  const fallAngle = t * 0.8;
  const fallX = t * 6;
  const dropY = t * t * 6;
  const torsoTop = skirtTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 8;

  drawShadow(g, CX + fallX * 0.5, gy2, 12 + t * 3, 3);

  // Legs buckle
  if (t < 0.8) {
    drawBoots(g, CX + fallX * 0.2, gy2, t * 2, -t);
    drawLegs(g, CX + fallX * 0.2, legTop + dropY * 0.5, legH * (1 - t * 0.3), t * 2, -t);
  }

  // Robe skirt crumples
  drawRobeSkirt(g, CX + fallX * 0.3, skirtTop + dropY * 0.7, skirtH * (1 - t * 0.2),
    t * 2, fallAngle * 3);

  // Torso tilts
  drawTorso(g, CX + fallX * 0.5, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 3);
  drawHead(g, CX + fallX * 0.5, headTop + dropY * 0.3, fallAngle * 4);

  // Blade flies away and its enchantment shatters
  if (t < 0.7) {
    const bladeDropX = CX + 10 + t * 10;
    const bladeDropY = torsoTop + t * 4 + t * t * 6;
    const bladeDropAngle = 0.3 + t * 3;
    drawEnchantedBlade(g, bladeDropX, bladeDropY, bladeDropAngle, 14, Math.max(0, 0.6 - t));
  }

  // Enchantment shatter sparks
  if (t >= 0.2 && t <= 0.8) {
    const sparkT = (t - 0.2) / 0.6;
    const sparkCX = CX + 10 + t * 10;
    const sparkCY = torsoTop + 4;
    for (let i = 0; i < 6; i++) {
      const sa = (i / 6) * Math.PI * 2 + t * 4;
      const sd = sparkT * 12 + i;
      const sparkAlpha = Math.max(0, 0.8 - sparkT);
      g.circle(sparkCX + Math.cos(sa) * sd, sparkCY + Math.sin(sa) * sd + sparkT * 4, 1)
        .fill({ color: i % 2 === 0 ? COL_ENERGY : COL_ENERGY_LT, alpha: sparkAlpha });
    }
  }

  // Arm collapses
  if (t < 0.6) {
    drawArm(g, CX + 5 + fallX * 0.5, torsoTop + 3,
      CX + 8 + fallX, torsoTop + torsoH - 2 + t * 4);
  }
  drawArm(g, CX - 5 + fallX * 0.3, torsoTop + 3,
    CX - 7 + fallX * 0.2, torsoTop + torsoH + t * 3, COL_SKIN_DK);
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
 * Generate all Blade Adept sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateBladeAdeptFrames(
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
