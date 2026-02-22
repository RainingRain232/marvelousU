// Procedural sprite generator for the Storm Mage (lightning mage) unit type.
//
// Draws a detailed medieval fantasy storm mage at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Blue wizard robe with hem detail
//   • Tall pointed blue wizard hat with brim
//   • Long grey beard
//   • Wooden crooked staff
//   • Leather pointy shoes
//   • Lightning FX on eyes and hands during attack/cast
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette
const COL_ROBE       = 0x2244aa;
const COL_ROBE_DK    = 0x1a3388;
const COL_ROBE_HI    = 0x3366cc;
const COL_HAT        = 0x1e3a8a;
const COL_HAT_DK     = 0x142866;
const COL_HAT_BAND   = 0xffd700;
const COL_SKIN       = 0xd4a574;
const COL_SKIN_DK    = 0xb8875a;
const COL_BEARD      = 0xaaaaaa;
const COL_BEARD_DK   = 0x888888;
const COL_STAFF_WOOD = 0x8b5a2b;
const COL_STAFF_DK   = 0x5d3d1d;
const COL_SHOE       = 0x6b4226;
const COL_SHOE_DK    = 0x4a2e1a;
const COL_LIGHTNING   = 0x88ccff;
const COL_LIGHTNING_HI= 0xeeffff;
const COL_EYE        = 0x222244;
const COL_SHADOW     = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
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

function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3.5): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

/** Pointy leather shoes. */
function drawShoes(
  g: Graphics, cx: number, gy: number,
  stanceL: number, stanceR: number, squash = 0,
): void {
  const bh = 4 - squash;
  // Left shoe — pointy toe
  g.moveTo(cx - 7 + stanceL, gy)
    .lineTo(cx - 7 + stanceL, gy - bh)
    .lineTo(cx - 2 + stanceL, gy - bh)
    .lineTo(cx + 0 + stanceL, gy - bh - 2) // pointy tip
    .lineTo(cx + 0 + stanceL, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
  // Right shoe
  g.moveTo(cx + 1 + stanceR, gy)
    .lineTo(cx + 1 + stanceR, gy - bh)
    .lineTo(cx + 6 + stanceR, gy - bh)
    .lineTo(cx + 8 + stanceR, gy - bh - 2)
    .lineTo(cx + 8 + stanceR, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
}

/** Robe — long trapezoid from torso to feet. */
function drawRobe(
  g: Graphics, cx: number,
  robeTop: number, robeH: number,
  tilt = 0, wave = 0,
): void {
  const topW = 12;
  const botW = 18 + wave;
  const x = cx + tilt;
  // Main robe body
  g.moveTo(x - topW / 2, robeTop)
    .lineTo(x + topW / 2, robeTop)
    .lineTo(x + botW / 2 + wave * 0.5, robeTop + robeH)
    .lineTo(x - botW / 2 + wave * 0.3, robeTop + robeH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.7 });

  // Robe hem detail (lighter stripe)
  g.moveTo(x - botW / 2 + wave * 0.3, robeTop + robeH - 2)
    .lineTo(x + botW / 2 + wave * 0.5, robeTop + robeH - 2)
    .stroke({ color: COL_ROBE_HI, width: 1, alpha: 0.5 });

  // Belt / sash
  g.rect(x - topW / 2 + 1, robeTop + 7, topW - 2, 2)
    .fill({ color: COL_HAT_BAND, alpha: 0.7 });
}

/** Upper torso/shoulders — visible above robe. */
function drawTorso(
  g: Graphics, cx: number,
  torsoTop: number, torsoH: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.5 });
}

/** Wizard hat — tall pointed cone with brim. */
function drawHat(
  g: Graphics, cx: number, hatBase: number,
  tilt = 0, droop = 0,
): void {
  const x = cx + tilt;
  const brimW = 14;
  const hatH = 14;

  // Brim (ellipse)
  g.ellipse(x, hatBase, brimW / 2, 2.5)
    .fill({ color: COL_HAT })
    .stroke({ color: COL_HAT_DK, width: 0.5 });

  // Cone
  g.moveTo(x - 5, hatBase - 1)
    .lineTo(x + 5, hatBase - 1)
    .lineTo(x + 3 + droop, hatBase - hatH)
    .lineTo(x - 1, hatBase - 1)
    .closePath()
    .fill({ color: COL_HAT })
    .stroke({ color: COL_HAT_DK, width: 0.5 });

  // Hat band
  g.rect(x - 5, hatBase - 3, 10, 2).fill({ color: COL_HAT_BAND });

  // Highlight on hat
  g.moveTo(x - 1, hatBase - 2)
    .lineTo(x + 2 + droop * 0.5, hatBase - hatH + 2)
    .stroke({ color: COL_ROBE_HI, width: 0.8, alpha: 0.4 });
}

/** Face — skin circle with eyes. */
function drawFace(
  g: Graphics, cx: number, faceY: number,
  tilt = 0, lightningEyes = false,
): void {
  const x = cx + tilt;
  // Face
  g.circle(x, faceY, 5).fill({ color: COL_SKIN });

  // Eyes
  const eyeCol = lightningEyes ? COL_LIGHTNING_HI : COL_EYE;
  g.circle(x - 2, faceY - 1, 0.8).fill({ color: eyeCol });
  g.circle(x + 2, faceY - 1, 0.8).fill({ color: eyeCol });

  // Lightning eye glow
  if (lightningEyes) {
    g.circle(x - 2, faceY - 1, 2).fill({ color: COL_LIGHTNING, alpha: 0.3 });
    g.circle(x + 2, faceY - 1, 2).fill({ color: COL_LIGHTNING, alpha: 0.3 });
  }

  // Nose
  g.circle(x, faceY + 0.5, 0.5).fill({ color: COL_SKIN_DK });
}

/** Long grey beard. */
function drawBeard(
  g: Graphics, cx: number, beardTop: number,
  beardLen: number, tilt = 0, wave = 0,
): void {
  const x = cx + tilt;
  // Main beard shape
  g.moveTo(x - 3, beardTop)
    .lineTo(x + 3, beardTop)
    .lineTo(x + 2 + wave, beardTop + beardLen)
    .lineTo(x + wave * 0.5, beardTop + beardLen + 2)  // pointed tip
    .lineTo(x - 2 + wave * 0.3, beardTop + beardLen)
    .closePath()
    .fill({ color: COL_BEARD })
    .stroke({ color: COL_BEARD_DK, width: 0.4 });

  // Beard texture lines
  for (let i = 2; i < beardLen; i += 3) {
    g.moveTo(x - 2, beardTop + i)
      .lineTo(x + 2, beardTop + i)
      .stroke({ color: COL_BEARD_DK, width: 0.3, alpha: 0.4 });
  }
}

/** Crooked wooden staff. */
function drawStaff(
  g: Graphics,
  baseX: number, baseY: number,
  topX: number, topY: number,
  crookDir = 1, // 1 = right, -1 = left
): void {
  // Main shaft
  g.moveTo(baseX, baseY)
    .lineTo(topX, topY)
    .stroke({ color: COL_STAFF_WOOD, width: 2.5 });
  // Dark edge
  g.moveTo(baseX + 0.5, baseY)
    .lineTo(topX + 0.5, topY)
    .stroke({ color: COL_STAFF_DK, width: 0.5, alpha: 0.5 });

  // Crooked top hook
  const hookLen = 5;
  g.moveTo(topX, topY)
    .quadraticCurveTo(
      topX + crookDir * 4, topY - 3,
      topX + crookDir * hookLen, topY + 1,
    )
    .stroke({ color: COL_STAFF_WOOD, width: 2 });

  // Knob at hook end
  g.circle(topX + crookDir * hookLen, topY + 1, 1.5)
    .fill({ color: COL_STAFF_DK });
}

/** Arm — simple thick line. */
function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 2.5 });
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

/** Lightning bolt FX between two points. */
function drawLightningBolt(
  g: Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
  segments = 4,
  alpha = 0.8,
): void {
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  let px = x1, py = y1;

  g.moveTo(px, py);
  for (let i = 1; i < segments; i++) {
    const nx = x1 + dx * i + (Math.random() - 0.5) * 6;
    const ny = y1 + dy * i + (Math.random() - 0.5) * 4;
    g.lineTo(nx, ny);
    px = nx; py = ny;
  }
  g.lineTo(x2, y2);
  g.stroke({ color: COL_LIGHTNING_HI, width: 1.5, alpha });

  // Glow pass
  g.moveTo(x1, y1);
  px = x1; py = y1;
  for (let i = 1; i < segments; i++) {
    const nx = x1 + dx * i + (Math.random() - 0.5) * 8;
    const ny = y1 + dy * i + (Math.random() - 0.5) * 5;
    g.lineTo(nx, ny);
  }
  g.lineTo(x2, y2);
  g.stroke({ color: COL_LIGHTNING, width: 3, alpha: alpha * 0.3 });
}

/** Hand glow effect (lightning sparks around hand). */
function drawHandGlow(g: Graphics, hx: number, hy: number, intensity = 1): void {
  g.circle(hx, hy, 3 * intensity).fill({ color: COL_LIGHTNING, alpha: 0.25 });
  g.circle(hx, hy, 1.5 * intensity).fill({ color: COL_LIGHTNING_HI, alpha: 0.4 });
  // Small sparks
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 3;
    g.moveTo(hx, hy)
      .lineTo(hx + Math.cos(angle) * r, hy + Math.sin(angle) * r)
      .stroke({ color: COL_LIGHTNING_HI, width: 0.6, alpha: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Frame generators per state
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 1.5 - 0.75);

  // Slumped over, leaning on staff — exhausted pose
  const slump = 2; // forward lean
  const robeH = 18;
  const robeTop = GY - robeH - 2 + bob;
  const torsoTop = robeTop - 4 + bob;
  const faceY = torsoTop - 3 + bob;
  const hatBase = faceY - 4 + bob;

  drawShadow(g, CX, GY);
  drawRobe(g, CX, robeTop, robeH, slump, t * 0.5 - 0.25);
  drawShoes(g, CX, GY, 0, 0);
  drawTorso(g, CX, torsoTop, 6, slump);

  // Staff (leaning on it, slightly to the right)
  const staffBaseX = CX + 8;
  const staffBaseY = GY;
  const staffTopX = CX + 6 + slump;
  const staffTopY = torsoTop - 12;
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 1);

  // Right arm — resting on staff
  drawArm(g, CX + 5 + slump, torsoTop + 3, staffTopX + 1, staffTopY + 6);

  // Left arm — hanging down (tired)
  const armDangle = Math.sin(t * Math.PI * 2) * 0.5;
  drawArm(g, CX - 5 + slump, torsoTop + 3, CX - 8 + slump, torsoTop + 10 + armDangle);

  // Face (slightly tilted down from exhaustion)
  drawFace(g, CX, faceY, slump);

  // Beard (long, hanging)
  drawBeard(g, CX, faceY + 3, 8, slump, t * 0.3 - 0.15);

  // Hat
  drawHat(g, CX, hatBase, slump, 2 + t); // slightly drooping hat tip
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const stanceL = Math.round(walk * 2.5);
  const stanceR = Math.round(-walk * 2.5);
  const robeH = 18;
  const robeTop = GY - robeH - 2 - Math.round(bob * 0.5);
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX, GY, 12 + Math.abs(walk) * 2);
  drawRobe(g, CX, robeTop, robeH, walk * 0.5, walk * 1.5);
  drawShoes(g, CX, GY, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, 6, walk * 0.3);

  // Staff held in right hand while walking
  const staffBaseX = CX + 10 + walk;
  const staffBaseY = GY - 2;
  const staffTopX = CX + 8 + walk * 0.5;
  const staffTopY = torsoTop - 14;
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 1);

  // Right arm holding staff
  drawArm(g, CX + 5 + walk * 0.3, torsoTop + 3, staffTopX + 1, staffTopY + 8);

  // Left arm swinging
  const lArmSwing = walk * 3;
  drawArm(g, CX - 5 + walk * 0.3, torsoTop + 3,
    CX - 7 + lArmSwing, torsoTop + 8 - Math.abs(walk));

  // Face
  drawFace(g, CX, faceY, walk * 0.3);

  // Beard swaying
  drawBeard(g, CX, faceY + 3, 8, walk * 0.3, -walk * 0.6);

  // Hat
  drawHat(g, CX, hatBase, walk * 0.3, 1 - walk * 0.5);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=prepare, 1-2=arms rising, 3=peak (calling thunder),
  // 4-5=lightning strike, 6=recovery
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const robeH = 18;
  const robeTop = GY - robeH - 2;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  // At peak, body lifts slightly
  const lift = t > 0.3 && t < 0.8 ? 2 : 0;

  drawShadow(g, CX, GY);
  drawRobe(g, CX, robeTop - lift, robeH + lift, 0, 0);
  drawShoes(g, CX, GY, -1, 1);
  drawTorso(g, CX, torsoTop - lift, 6);

  // Arms spread to sides, rising with t
  // Right arm: raises staff to the right side
  const rArmRaise = t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45;
  const rHandX = CX + 8 + rArmRaise * 6;
  const rHandY = torsoTop + 2 - lift - rArmRaise * 12;

  // Staff follows right hand up and out
  const staffTopX = rHandX + 2;
  const staffTopY = rHandY - 10;
  const staffBaseX = rHandX;
  const staffBaseY = rHandY + 4;
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 1);
  drawArm(g, CX + 5, torsoTop + 3 - lift, rHandX, rHandY);

  // Left arm: rises to the left side (no staff)
  const lArmRaise = t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45;
  const lHandX = CX - 8 - lArmRaise * 6;
  const lHandY = torsoTop + 2 - lift - lArmRaise * 12;
  drawArm(g, CX - 5, torsoTop + 3 - lift, lHandX, lHandY);

  // Lightning eyes during peak
  const isLightning = t >= 0.3 && t <= 0.85;
  drawFace(g, CX, faceY - lift, 0, isLightning);
  drawBeard(g, CX, faceY + 3 - lift, 8, 0, 0);
  drawHat(g, CX, hatBase - lift, 0, 1);

  // Hand glow during charge-up and strike
  if (t >= 0.2) {
    const intensity = t < 0.55 ? (t - 0.2) / 0.35 : 1 - (t - 0.55) / 0.45;
    drawHandGlow(g, rHandX, rHandY, intensity);
    drawHandGlow(g, lHandX, lHandY, intensity);
  }

  // Lightning bolts at peak (frames 3-5)
  if (t >= 0.4 && t <= 0.85) {
    const boltAlpha = t < 0.55 ? 0.9 : lerp(0.9, 0.2, (t - 0.55) / 0.3);
    // Right hand lightning — arcs upward
    drawLightningBolt(g, rHandX, rHandY, rHandX + 4, rHandY - 16, 4, boltAlpha);
    // Left hand lightning — arcs upward
    drawLightningBolt(g, lHandX, lHandY, lHandX - 4, lHandY - 16, 4, boltAlpha);

    // Central lightning strike from above
    if (t >= 0.5 && t <= 0.8) {
      const strikeAlpha = 1 - Math.abs(t - 0.65) / 0.15;
      drawLightningBolt(g, CX, 0, CX + 3, GY - 5, 6, strikeAlpha * 0.7);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // 6 frames: channeling pose with both arms out, staff raised, eyes glowing
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const robeH = 18;
  const lift = 1 + pulse;
  const robeTop = GY - robeH - 2 - lift;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX, GY);
  drawRobe(g, CX, robeTop, robeH + lift, 0, pulse);
  drawShoes(g, CX, GY, -1, 1);
  drawTorso(g, CX, torsoTop, 6);

  // Both arms raised with staff held overhead
  // Right hand with staff
  const rHandX = CX + 6;
  const rHandY = torsoTop - 6 - pulse * 2;
  drawStaff(g, rHandX, rHandY + 3, rHandX + 2, rHandY - 10, 1);
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);

  // Left hand raised
  const lHandX = CX - 6;
  const lHandY = torsoTop - 4 - pulse * 2;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);

  // Face with lightning eyes
  drawFace(g, CX, faceY, 0, true);
  drawBeard(g, CX, faceY + 3, 8, 0, pulse * 0.3);
  drawHat(g, CX, hatBase, 0, 1 + pulse * 0.5);

  // Glow on hands
  drawHandGlow(g, rHandX, rHandY, 0.6 + pulse * 0.4);
  drawHandGlow(g, lHandX, lHandY, 0.6 + pulse * 0.4);

  // Swirling lightning around staff top
  const crookX = rHandX + 7;
  const crookY = rHandY - 9;
  g.circle(crookX, crookY, 4 + pulse * 3)
    .fill({ color: COL_LIGHTNING, alpha: 0.15 + pulse * 0.15 });
  g.circle(crookX, crookY, 2 + pulse * 2)
    .fill({ color: COL_LIGHTNING_HI, alpha: 0.2 + pulse * 0.1 });
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: 0=hit stagger, 1-2=knees buckle, 3-4=fall, 5-6=collapse
  const t = frame / 6;

  const robeH = 18;
  const fallX = t * 8;
  const dropY = t * t * 10;

  const robeTop = GY - robeH - 2 + dropY;
  const torsoTop = robeTop - 4;
  const faceY = torsoTop - 3;
  const hatBase = faceY - 4;

  drawShadow(g, CX + fallX * 0.5, GY, 12 + t * 6);

  // Robe crumples
  if (t < 0.8) {
    drawRobe(g, CX + fallX * 0.4, robeTop, robeH * (1 - t * 0.3), t * 2, t * 2);
  }

  // Shoes spread
  const squash = Math.round(t * 3);
  drawShoes(g, CX + fallX * 0.3, GY, t * 3, -t * 2, squash);

  // Torso tilts
  if (t < 0.7) {
    drawTorso(g, CX + fallX * 0.5, torsoTop, 6 * (1 - t * 0.3), t * 3);
  }

  // Face
  if (t < 0.8) {
    drawFace(g, CX + fallX * 0.5, faceY + dropY * 0.3, t * 3);
    drawBeard(g, CX + fallX * 0.5, faceY + 3 + dropY * 0.3, 8 * (1 - t * 0.3), t * 3, t * 2);
  }

  // Hat falls off
  if (t < 0.5) {
    drawHat(g, CX + fallX * 0.5, hatBase + dropY * 0.2, t * 4, 2 + t * 4);
  } else if (t < 0.9) {
    // Hat on ground
    const hatGroundX = CX + 14;
    const hatGroundY = GY - 3;
    g.ellipse(hatGroundX, hatGroundY, 5, 2).fill({ color: COL_HAT });
    g.moveTo(hatGroundX - 3, hatGroundY)
      .lineTo(hatGroundX + 2, hatGroundY - 6)
      .lineTo(hatGroundX + 3, hatGroundY)
      .fill({ color: COL_HAT });
  }

  // Staff falls away
  if (t < 0.7) {
    const sDropX = CX + 12 + t * 10;
    const sDropY = torsoTop - 2 + dropY;
    const angle = t * 2;
    drawStaff(g,
      sDropX, sDropY + 10,
      sDropX + Math.sin(angle) * 8, sDropY - Math.cos(angle) * 10,
      1,
    );
  }

  // Arm on ground in late frames
  if (t > 0.5) {
    drawArm(g, CX + fallX * 0.5 + 4, torsoTop + 3,
      CX + fallX * 0.5 + 10, torsoTop + 6, COL_ROBE);
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
 * Generate all storm mage sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateStormMageFrames(
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
