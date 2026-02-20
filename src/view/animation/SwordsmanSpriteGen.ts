// Procedural sprite generator for the Swordsman unit type.
//
// Draws a detailed medieval fantasy swordsman at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.  Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Chainmail / plate armour torso with shoulder pauldrons
//   • Nasal helm with visor slit
//   • Longsword (blade + crossguard + pommel)
//   • Kite shield on off-hand
//   • Flowing cape
//   • Boots + legs with walk / collapse poses
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ medieval steel & cloth
const COL_SKIN      = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_ARMOR     = 0x8899aa;
const COL_ARMOR_HI  = 0xaabbcc;
const COL_ARMOR_DK  = 0x556677;
const COL_HELM      = 0x778899;
const COL_HELM_HI   = 0x99aabb;
const COL_VISOR     = 0x1a1a2e;
const COL_CAPE      = 0x8b2222;
const COL_CAPE_DK   = 0x6b1111;
const COL_SWORD_BLD = 0xc0c8d0;
const COL_SWORD_HI  = 0xe0e8f0;
const COL_SWORD_GRD = 0x886633;
const COL_SWORD_POM = 0x664422;
const COL_SHIELD    = 0x3355aa;
const COL_SHIELD_RIM= 0x886633;
const COL_SHIELD_EMB= 0xddcc44;
const COL_BOOT      = 0x443322;
const COL_BOOT_DK   = 0x332211;
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
function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

/** Boots — two small rounded rects. */
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5, bh = 5 - squash;
  // Left boot
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Right boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

/** Legs — two thin rectangles. */
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_ARMOR_DK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_ARMOR_DK });
}

/** Chainmail torso — rounded rect with horizontal line detail. */
function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0, // horizontal offset for leaning
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.7 });
  // Chainmail lines
  for (let row = 2; row < torsoH - 1; row += 3) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_ARMOR_HI, width: 0.3, alpha: 0.5 });
  }
  // Shoulder pauldrons
  g.ellipse(x + 1, torsoTop + 2, 4, 3).fill({ color: COL_ARMOR_HI });
  g.ellipse(x + tw - 1, torsoTop + 2, 4, 3).fill({ color: COL_ARMOR_HI });
}

/** Helm with nasal guard. */
function drawHelm(
  g: Graphics,
  cx: number,
  helmTop: number,
  tilt = 0,
): void {
  const hw = 10, hh = 9;
  const x = cx - hw / 2 + tilt;
  // Dome
  g.roundRect(x, helmTop, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_ARMOR_DK, width: 0.6 });
  // Highlight
  g.roundRect(x + 2, helmTop + 1, 4, 3, 1).fill({ color: COL_HELM_HI, alpha: 0.5 });
  // Visor slit
  g.rect(x + 2, helmTop + hh - 4, hw - 4, 2).fill({ color: COL_VISOR });
  // Nasal guard
  g.rect(cx - 1 + tilt, helmTop + 2, 2, hh - 2).fill({ color: COL_ARMOR_DK });
}

/** Cape flowing behind. */
function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number, // -1 to 1 horizontal sway
): void {
  const cw = 10;
  const x = cx - cw / 2 - 3; // behind character (offset left since facing right)
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
}

/** Sword — blade, crossguard, grip, pommel. */
function drawSword(
  g: Graphics,
  bladeX: number,
  bladeY: number,
  angle: number,   // radians — 0 = pointing up
  bladeLen = 16,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = bladeX + sin * bladeLen;
  const tipY = bladeY - cos * bladeLen;

  // Blade (thick line)
  g.moveTo(bladeX, bladeY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SWORD_BLD, width: 2.5 });
  // Highlight edge
  g.moveTo(bladeX + cos * 0.5, bladeY + sin * 0.5)
    .lineTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .stroke({ color: COL_SWORD_HI, width: 0.7, alpha: 0.7 });

  // Crossguard (perpendicular to blade)
  const cx1 = bladeX + cos * 3;
  const cy1 = bladeY + sin * 3;
  const cx2 = bladeX - cos * 3;
  const cy2 = bladeY - sin * 3;
  g.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: COL_SWORD_GRD, width: 2 });

  // Pommel (small circle below grip)
  const pomX = bladeX - sin * 3;
  const pomY = bladeY + cos * 3;
  g.circle(pomX, pomY, 1.5).fill({ color: COL_SWORD_POM });
}

/** Kite shield on off-hand side. */
function drawShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
): void {
  const sw = 8 * scale;
  const sh = 11 * scale;
  // Shield body — pointed bottom
  g.moveTo(sx, sy)
    .lineTo(sx + sw, sy)
    .lineTo(sx + sw, sy + sh * 0.6)
    .lineTo(sx + sw / 2, sy + sh)
    .lineTo(sx, sy + sh * 0.6)
    .closePath()
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1 });
  // Emblem — small diamond
  const emx = sx + sw / 2;
  const emy = sy + sh * 0.35;
  g.moveTo(emx, emy - 2)
    .lineTo(emx + 2, emy)
    .lineTo(emx, emy + 2)
    .lineTo(emx - 2, emy)
    .closePath()
    .fill({ color: COL_SHIELD_EMB });
}

/** Arm — simple thick line from shoulder to hand position. */
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 3 });
  // Hand circle
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DARK });
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1); // -1..1 vertical bob

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 9 + bob;

  const capeWave = (t - 0.5) * 0.6;

  drawShadow(g, CX, gy2);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Sword arm (right) — sword resting at side
  const swordAngle = 0.15 + t * 0.05;
  drawArm(g, CX + 6, torsoTop + 4, CX + 10, torsoTop + torsoH - 1);
  drawSword(g, CX + 10, torsoTop + torsoH - 1, swordAngle, 14);

  // Shield arm (left) — shield at rest
  drawArm(g, CX - 6, torsoTop + 4, CX - 10, torsoTop + 8);
  drawShield(g, CX - 15, torsoTop + 4, 0.9);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 2;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const helmTop = torsoTop - 9;

  const capeWave = -walkCycle * 1.2; // cape flows opposite to movement

  drawShadow(g, CX, gy2, 14 + Math.abs(walkCycle) * 2, 4);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.5);
  drawHelm(g, CX, helmTop, walkCycle * 0.5);

  // Sword arm — sword angled forward
  const armEndX = CX + 10 + walkCycle;
  const armEndY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 4, armEndX, armEndY);
  drawSword(g, armEndX, armEndY, 0.3 + walkCycle * 0.1, 14);

  // Shield arm — bouncing with stride
  drawArm(g, CX - 6, torsoTop + 4, CX - 9, torsoTop + 7 - walkCycle);
  drawShield(g, CX - 14, torsoTop + 3 - walkCycle * 0.5, 0.85);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=windup, 1-2=raise, 3=apex, 4-5=slash down, 6=follow-through
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;

  // Body leans forward during slash
  const lean = t < 0.55 ? t * 3 : (1 - t) * 5;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  // Sword angle: starts low (0.5), raises high (-1.5), slashes down (1.2)
  let swordAngle: number;
  if (t < 0.35) {
    swordAngle = lerp(0.3, -1.8, t / 0.35); // raise up & back
  } else if (t < 0.75) {
    swordAngle = lerp(-1.8, 1.5, (t - 0.35) / 0.4); // slash downward
  } else {
    swordAngle = lerp(1.5, 0.5, (t - 0.75) / 0.25); // recover
  }

  // Sword arm extends during slash
  const armReach = t < 0.55 ? t * 4 : (1 - t) * 6;

  drawShadow(g, CX + lean, gy2, 14 + lean, 4);
  drawCape(g, CX + lean * 0.3, torsoTop + 2, legH + torsoH - 2, -lean * 0.5);

  // Lunge: front foot forward
  const lunge = t > 0.3 && t < 0.8 ? 3 : 0;
  drawBoots(g, CX, gy2, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);

  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.7);

  // Sword arm
  const sArmX = CX + 7 + lean + armReach;
  const sArmY = torsoTop + 3;
  drawArm(g, CX + 6 + lean, torsoTop + 4, sArmX, sArmY);
  drawSword(g, sArmX, sArmY, swordAngle, 16);

  // Shield pulled back during slash
  const shieldBack = lean * 0.4;
  drawArm(g, CX - 6 + lean, torsoTop + 4, CX - 9 - shieldBack, torsoTop + 8);
  drawShield(g, CX - 14 - shieldBack, torsoTop + 4, 0.8);

  // Slash trail effect at peak
  if (t >= 0.4 && t <= 0.7) {
    const trailAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    g.moveTo(sArmX + 2, sArmY - 10)
      .bezierCurveTo(sArmX + 8, sArmY - 4, sArmX + 10, sArmY + 4, sArmX + 6, sArmY + 10)
      .stroke({ color: 0xffffff, width: 1.5, alpha: trailAlpha * 0.6 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: sword raised overhead with magical glow
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX, gy2);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.4 - 0.2);
  drawBoots(g, CX, gy2, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Both arms raised — sword overhead
  drawArm(g, CX + 6, torsoTop + 3, CX + 4, torsoTop - 4);
  drawArm(g, CX - 6, torsoTop + 3, CX - 2, torsoTop - 3);
  drawSword(g, CX + 3, torsoTop - 5, -0.1, 15);

  // Magical glow around sword
  const glowR = 6 + pulse * 4;
  g.circle(CX + 3, torsoTop - 12, glowR)
    .fill({ color: 0xffdd44, alpha: 0.15 + pulse * 0.15 });
  g.circle(CX + 3, torsoTop - 12, glowR * 0.6)
    .fill({ color: 0xffff88, alpha: 0.2 + pulse * 0.1 });

  // Shield on back
  drawShield(g, CX - 12, torsoTop + 1, 0.7);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=hit, 1-2=stagger, 3-4=knees buckle, 5-6=collapse
  const t = frame / 6;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;

  // Progressive collapse
  const fallAngle = t * 1.2;
  const fallX = t * 10;
  const dropY = t * t * 8;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.5, gy2, 14 + t * 4, 4);

  // Cape crumples
  drawCape(g, CX + fallX * 0.3, torsoTop + 2, (legH + torsoH - 2) * (1 - t * 0.3), t * 2);

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.2, gy2, t * 2, -t * 1, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.2, legTop + dropY * 0.5, legH - squash, t * 2, -t * 1);
  }

  // Torso tilts and drops
  drawTorso(g, CX + fallX * 0.5, torsoTop, torsoH * (1 - t * 0.2), fallAngle * 3);
  drawHelm(g, CX + fallX * 0.5, helmTop + dropY * 0.5, fallAngle * 4);

  // Sword drops — falls away
  const swordDropX = CX + 12 + t * 8;
  const swordDropY = torsoTop + torsoH * 0.5 + t * 6;
  const swordDropAngle = 0.3 + t * 2.5;
  if (t < 0.85) {
    drawSword(g, swordDropX, swordDropY, swordDropAngle, 14 * (1 - t * 0.3));
  }

  // Shield falls
  if (t < 0.6) {
    drawShield(g, CX - 14 + fallX * 0.3, torsoTop + 4 + dropY * 0.5, 0.8 * (1 - t * 0.3));
  }

  // Faint arm on ground in late frames
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.5 + 5, torsoTop + 5, CX + fallX * 0.5 + 10, torsoTop + torsoH - 2, COL_ARMOR);
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
 * Generate all swordsman sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateSwordsmanFrames(
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
