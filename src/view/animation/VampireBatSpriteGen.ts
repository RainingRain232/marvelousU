// Procedural sprite generator for the Vampire Bat unit type.
//
// Draws a 2×2-tile vampire bat hybrid at 96×96 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Half-man, half-vampire-bat hybrid — muscular humanoid torso with bat anatomy
//   • Large membranous wings with visible finger bones, veins, translucent membrane
//   • Bat-like head: pointed ears, fanged mouth, flat snout, glowing red eyes
//   • Grey-purple skin with darker patches and muscle definition
//   • Digitigrade legs with clawed talons
//   • Tattered dark cloth/loincloth at waist
//   • Clawed hands/fingers, elongated and sharp
//   • Idle: wings folded, subtle breathing, eyes pulsing
//   • Move: wings spread wide, swooping forward lean
//   • Attack: lunging claw swipe with blood splatter
//   • Cast: sonic screech — mouth wide open, shockwave rings
//   • Die: wings crumple, body falls, dissolves to dark mist

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette
const COL_SKIN = 0x5a4a5e;       // grey-purple skin
const COL_SKIN_DK = 0x3e2e42;    // darker skin shadow
const COL_SKIN_HI = 0x7a6a7e;    // highlighted skin
const COL_SKIN_MUSCLE = 0x4e3e52; // muscle definition

const COL_WING_MEMBRANE = 0x3a2a3e; // dark wing membrane
const COL_WING_BONE = 0x7a6a6e;    // finger bones in wings
const COL_WING_VEIN = 0x5a3a4a;    // veins visible through membrane
const COL_WING_EDGE = 0x2a1a2e;    // dark wing edges

const COL_EYE = 0xff2222;         // glowing red eyes
const COL_EYE_GLOW = 0xff6644;    // eye glow halo
const COL_EYE_PUPIL = 0x220000;

const COL_EAR = 0x5e4a60;         // pointed ears
const COL_SNOUT = 0x4a3a4e;       // flat bat snout

const COL_FANG = 0xeee8e0;        // ivory fangs
const COL_FANG_DK = 0xccbbaa;
const COL_MOUTH = 0x2a0a0a;       // dark mouth interior
const COL_TONGUE = 0xcc4444;

const COL_CLAW = 0xccccbb;        // sharp claws
const COL_CLAW_DK = 0x888877;

const COL_CLOTH = 0x1a1a22;       // tattered dark cloth
const COL_CLOTH_TORN = 0x2a2a34;

const COL_BLOOD = 0xaa1111;       // blood splatter
const COL_BLOOD_DK = 0x770808;

const COL_SCREECH = 0xccaaff;     // sonic screech ring
const COL_SCREECH_DK = 0x8866bb;

const COL_MIST = 0x2a1a2e;        // death mist
const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, x: number, y: number, rx: number, ry: number): void {
  g.ellipse(x, y, rx, ry).fill({ color: COL_SHADOW, alpha: 0.25 });
}

/** Draw a single membranous wing */
function drawWing(
  g: Graphics,
  baseX: number, baseY: number,
  spread: number,         // 0 = folded, 1 = fully spread
  side: number,           // -1 = left, 1 = right
  alpha: number,
): void {
  const dir = side;
  const wingLen = lerp(8, 36, spread);
  const wingDrop = lerp(10, -4, spread);

  // Finger bones (3 main digits)
  const boneCount = 3;
  for (let b = 0; b < boneCount; b++) {
    const frac = b / (boneCount - 1);
    const angle = lerp(-0.3, 0.5, frac) * spread;
    const boneLen = wingLen * lerp(0.7, 1.0, 1 - frac);

    const endX = baseX + dir * Math.cos(angle) * boneLen;
    const endY = baseY + wingDrop + Math.sin(angle) * boneLen * -0.5;

    // Bone
    g.setStrokeStyle({ width: 1.8, color: COL_WING_BONE, alpha: alpha * 0.9 });
    g.moveTo(baseX, baseY).lineTo(endX, endY).stroke();

    // Joint knob
    g.circle(endX, endY, 1.2).fill({ color: COL_WING_BONE, alpha: alpha * 0.7 });
  }

  // Membrane between bones
  const tip0Angle = -0.3 * spread;
  const tip2Angle = 0.5 * spread;
  const tip0X = baseX + dir * Math.cos(tip0Angle) * wingLen * 0.7;
  const tip0Y = baseY + wingDrop + Math.sin(tip0Angle) * wingLen * -0.35;
  const tip1X = baseX + dir * Math.cos(0.1 * spread) * wingLen;
  const tip1Y = baseY + wingDrop + Math.sin(0.1 * spread) * wingLen * -0.5;
  const tip2X = baseX + dir * Math.cos(tip2Angle) * wingLen;
  const tip2Y = baseY + wingDrop + Math.sin(tip2Angle) * wingLen * -0.5;

  g.moveTo(baseX, baseY)
    .lineTo(tip0X, tip0Y)
    .lineTo(tip1X, tip1Y)
    .lineTo(tip2X, tip2Y)
    .lineTo(baseX, baseY + 12)
    .closePath()
    .fill({ color: COL_WING_MEMBRANE, alpha: alpha * 0.6 });

  // Veins on membrane
  g.setStrokeStyle({ width: 0.5, color: COL_WING_VEIN, alpha: alpha * 0.35 });
  const midMX = (baseX + tip1X) / 2;
  const midMY = (baseY + tip1Y) / 2;
  g.moveTo(baseX, baseY + 4).lineTo(midMX, midMY).stroke();
  g.moveTo(baseX, baseY + 8).lineTo(lerp(baseX, tip2X, 0.6), lerp(baseY + 8, tip2Y, 0.6)).stroke();

  // Wing edge highlight
  g.setStrokeStyle({ width: 0.7, color: COL_WING_EDGE, alpha: alpha * 0.5 });
  g.moveTo(tip0X, tip0Y).lineTo(tip1X, tip1Y).lineTo(tip2X, tip2Y).stroke();
}

/** Draw the bat-like head */
function drawHead(
  g: Graphics,
  hx: number, hy: number,
  mouthOpen: number,  // 0 = closed, 1 = wide open
  eyeGlow: number,    // 0–1 glow intensity
): void {
  // Head shape — slightly elongated snout
  g.ellipse(hx, hy, 7, 8).fill({ color: COL_SKIN });
  g.ellipse(hx, hy - 1, 6, 6).fill({ color: COL_SKIN_HI, alpha: 0.3 });

  // Snout
  g.ellipse(hx, hy + 4, 4.5, 3).fill({ color: COL_SNOUT });
  // Nostrils
  g.circle(hx - 1.5, hy + 3, 0.8).fill({ color: COL_MOUTH, alpha: 0.7 });
  g.circle(hx + 1.5, hy + 3, 0.8).fill({ color: COL_MOUTH, alpha: 0.7 });

  // Ears — tall pointed bat ears
  for (const side of [-1, 1]) {
    const ex = hx + side * 7;
    const ey = hy - 5;
    g.moveTo(hx + side * 4, hy - 5)
      .lineTo(ex, ey - 10)
      .lineTo(ex + side * 2, ey - 3)
      .closePath()
      .fill({ color: COL_EAR });
    // Inner ear
    g.moveTo(hx + side * 4.5, hy - 5)
      .lineTo(ex, ey - 8)
      .lineTo(ex + side * 1, ey - 3)
      .closePath()
      .fill({ color: COL_SKIN, alpha: 0.5 });
  }

  // Eyes — glowing red
  for (const side of [-1, 1]) {
    const eyeX = hx + side * 3.5;
    const eyeY = hy - 2;
    // Glow halo
    if (eyeGlow > 0.1) {
      g.circle(eyeX, eyeY, 3 + eyeGlow * 1.5).fill({ color: COL_EYE_GLOW, alpha: eyeGlow * 0.25 });
    }
    // Eye
    g.ellipse(eyeX, eyeY, 2, 1.5).fill({ color: COL_EYE, alpha: 0.8 + eyeGlow * 0.2 });
    // Pupil slit
    g.ellipse(eyeX, eyeY, 0.6, 1.3).fill({ color: COL_EYE_PUPIL });
  }

  // Mouth
  if (mouthOpen > 0.05) {
    const mw = 4 + mouthOpen * 3;
    const mh = 1 + mouthOpen * 4;
    g.ellipse(hx, hy + 6 + mouthOpen * 2, mw, mh).fill({ color: COL_MOUTH });
    // Tongue
    if (mouthOpen > 0.3) {
      g.ellipse(hx, hy + 7 + mouthOpen * 2.5, 2, mouthOpen * 2).fill({ color: COL_TONGUE, alpha: 0.7 });
    }
    // Fangs
    for (const side of [-1, 1]) {
      const fx = hx + side * 2.5;
      const fy = hy + 5 + mouthOpen;
      g.moveTo(fx - 0.8, fy).lineTo(fx, fy + 3 + mouthOpen * 2).lineTo(fx + 0.8, fy).closePath()
        .fill({ color: COL_FANG });
      g.setStrokeStyle({ width: 0.4, color: COL_FANG_DK });
      g.moveTo(fx, fy).lineTo(fx, fy + 3 + mouthOpen * 2).stroke();
    }
  } else {
    // Closed mouth line
    g.setStrokeStyle({ width: 0.8, color: COL_MOUTH });
    g.moveTo(hx - 3, hy + 6).quadraticCurveTo(hx, hy + 7.5, hx + 3, hy + 6).stroke();
    // Fangs peeking out
    for (const side of [-1, 1]) {
      g.moveTo(hx + side * 2 - 0.5, hy + 6).lineTo(hx + side * 2, hy + 8.5).lineTo(hx + side * 2 + 0.5, hy + 6)
        .closePath().fill({ color: COL_FANG });
    }
  }
}

/** Draw the humanoid torso */
function drawTorso(
  g: Graphics,
  tx: number, ty: number,
  lean: number,   // forward lean for movement
): void {
  const lx = tx + lean * 3;

  // Main torso — muscular
  g.moveTo(lx - 10, ty)
    .quadraticCurveTo(lx - 12, ty + 10, lx - 8, ty + 20)
    .lineTo(lx + 8, ty + 20)
    .quadraticCurveTo(lx + 12, ty + 10, lx + 10, ty)
    .closePath()
    .fill({ color: COL_SKIN });

  // Chest muscles
  g.ellipse(lx - 3, ty + 6, 5, 4).fill({ color: COL_SKIN_HI, alpha: 0.25 });
  g.ellipse(lx + 3, ty + 6, 5, 4).fill({ color: COL_SKIN_HI, alpha: 0.25 });

  // Center line / sternum
  g.setStrokeStyle({ width: 0.6, color: COL_SKIN_MUSCLE, alpha: 0.4 });
  g.moveTo(lx, ty + 2).lineTo(lx, ty + 18).stroke();

  // Ab definition
  for (let i = 0; i < 3; i++) {
    const ay = ty + 11 + i * 3;
    g.setStrokeStyle({ width: 0.5, color: COL_SKIN_MUSCLE, alpha: 0.3 });
    g.moveTo(lx - 4, ay).quadraticCurveTo(lx, ay + 0.5, lx + 4, ay).stroke();
  }

  // Shoulder caps
  for (const side of [-1, 1]) {
    g.ellipse(lx + side * 11, ty + 2, 5, 4).fill({ color: COL_SKIN_DK });
    g.ellipse(lx + side * 11, ty + 1, 4, 3).fill({ color: COL_SKIN, alpha: 0.6 });
  }
}

/** Draw tattered cloth at waist */
function drawCloth(g: Graphics, cx: number, cy: number, sway: number): void {
  // Belt line
  g.rect(cx - 9, cy - 1, 18, 3).fill({ color: COL_CLOTH });

  // Hanging cloth strips
  const strips = 5;
  for (let i = 0; i < strips; i++) {
    const sx = cx - 7 + (i / (strips - 1)) * 14;
    const stripW = 3 + (i % 2);
    const stripH = 6 + (i % 3) * 3;
    const swayX = Math.sin(sway + i * 1.2) * 1.5;

    g.moveTo(sx, cy + 2)
      .lineTo(sx + swayX - stripW / 2, cy + 2 + stripH)
      .lineTo(sx + swayX + stripW / 2, cy + 2 + stripH)
      .closePath()
      .fill({ color: i % 2 === 0 ? COL_CLOTH : COL_CLOTH_TORN });
  }
}

/** Draw digitigrade legs with claws */
function drawLegs(
  g: Graphics,
  lx: number, ly: number,
  walkPhase: number,  // 0–1 walk cycle
): void {
  for (const side of [-1, 1]) {
    const offset = Math.sin(walkPhase * Math.PI * 2 + (side > 0 ? Math.PI : 0)) * 4;
    const hipX = lx + side * 5;
    const kneeX = hipX + side * 2;
    const kneeY = ly + 12 + offset * 0.5;
    const ankleX = kneeX - side * 1;
    const ankleY = ly + 22 - Math.abs(offset) * 0.3;
    const footX = ankleX + side * 3;
    const footY = ly + 26 - Math.abs(offset) * 0.5;

    // Upper leg (thigh)
    g.setStrokeStyle({ width: 5, color: COL_SKIN_DK });
    g.moveTo(hipX, ly).lineTo(kneeX, kneeY).stroke();
    g.setStrokeStyle({ width: 4, color: COL_SKIN });
    g.moveTo(hipX, ly).lineTo(kneeX, kneeY).stroke();

    // Knee joint
    g.circle(kneeX, kneeY, 2.5).fill({ color: COL_SKIN_DK });

    // Lower leg (shin — reversed, digitigrade)
    g.setStrokeStyle({ width: 3.5, color: COL_SKIN_DK });
    g.moveTo(kneeX, kneeY).lineTo(ankleX, ankleY).stroke();
    g.setStrokeStyle({ width: 2.5, color: COL_SKIN });
    g.moveTo(kneeX, kneeY).lineTo(ankleX, ankleY).stroke();

    // Ankle
    g.circle(ankleX, ankleY, 1.5).fill({ color: COL_SKIN_DK });

    // Foot
    g.setStrokeStyle({ width: 2, color: COL_SKIN_DK });
    g.moveTo(ankleX, ankleY).lineTo(footX, footY).stroke();

    // Talons (3 forward claws)
    for (let c = -1; c <= 1; c++) {
      const clawX = footX + c * 2;
      const clawEndX = clawX + c * 1.5 + side * 1;
      g.setStrokeStyle({ width: 1, color: COL_CLAW });
      g.moveTo(clawX, footY).lineTo(clawEndX, footY + 2.5).stroke();
      g.circle(clawEndX, footY + 2.5, 0.5).fill({ color: COL_CLAW });
    }
  }
}

/** Draw clawed arms/hands */
function drawArm(
  g: Graphics,
  shoulderX: number, shoulderY: number,
  elbowAngle: number,   // 0 = down, 1 = raised
  side: number,
  clawExtend: number,    // 0 = relaxed, 1 = extended for attack
): void {
  const dir = side;
  const elbowX = shoulderX + dir * 8;
  const elbowY = shoulderY + lerp(12, 2, elbowAngle);
  const handX = elbowX + dir * lerp(2, 8, clawExtend);
  const handY = elbowY + lerp(8, -2, elbowAngle);

  // Upper arm
  g.setStrokeStyle({ width: 4, color: COL_SKIN_DK });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY).stroke();
  g.setStrokeStyle({ width: 3, color: COL_SKIN });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY).stroke();

  // Elbow
  g.circle(elbowX, elbowY, 2).fill({ color: COL_SKIN_DK });

  // Forearm
  g.setStrokeStyle({ width: 3, color: COL_SKIN_DK });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY).stroke();
  g.setStrokeStyle({ width: 2, color: COL_SKIN });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY).stroke();

  // Claws (3 long sharp fingers)
  for (let c = -1; c <= 1; c++) {
    const clawLen = 4 + clawExtend * 4;
    const spread = c * (0.3 + clawExtend * 0.3);
    const cx = handX + Math.cos(spread) * clawLen * dir;
    const cy = handY + Math.sin(spread) * clawLen * 0.3 + lerp(2, -3, elbowAngle);

    g.setStrokeStyle({ width: 1.2, color: COL_CLAW });
    g.moveTo(handX, handY).lineTo(cx, cy).stroke();
    // Claw tip
    g.circle(cx, cy, 0.7).fill({ color: COL_CLAW_DK });
  }
}

/* ── frame generators ──────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const eyePulse = 0.5 + Math.sin(t * Math.PI * 2 + 0.5) * 0.3;
  const wingBob = Math.sin(t * Math.PI * 2) * 0.08;

  // Shadow
  drawShadow(g, CX, GY, 18, 5);

  // Legs — standing still
  drawLegs(g, CX, GY - 28, 0);

  // Cloth
  drawCloth(g, CX, GY - 28, t * Math.PI * 2);

  // Torso
  drawTorso(g, CX, GY - 48 + breathe, 0);

  // Wings — folded behind
  drawWing(g, CX - 10, GY - 46 + breathe, 0.15 + wingBob, -1, 0.8);
  drawWing(g, CX + 10, GY - 46 + breathe, 0.15 + wingBob, 1, 0.8);

  // Arms — relaxed at sides
  drawArm(g, CX - 11, GY - 46 + breathe, 0.1, -1, 0);
  drawArm(g, CX + 11, GY - 46 + breathe, 0.1, 1, 0);

  // Head
  drawHead(g, CX, GY - 58 + breathe, 0, eyePulse);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const wingFlap = Math.sin(t * Math.PI * 4) * 0.5 + 0.5; // 0→1 flap cycle
  const bob = Math.sin(t * Math.PI * 4) * 2;
  const lean = 0.3; // forward lean

  // Shadow — wider when wings spread
  drawShadow(g, CX + 3, GY, 20 + wingFlap * 10, 5);

  // Legs — walking
  drawLegs(g, CX + 2, GY - 26 + bob * 0.5, t);

  // Cloth
  drawCloth(g, CX + 1, GY - 26 + bob * 0.5, t * Math.PI * 4);

  // Torso — leaning forward
  drawTorso(g, CX, GY - 46 + bob, lean);

  // Wings — spread wide in flight
  drawWing(g, CX - 10, GY - 44 + bob, 0.4 + wingFlap * 0.5, -1, 0.9);
  drawWing(g, CX + 10, GY - 44 + bob, 0.4 + wingFlap * 0.5, 1, 0.9);

  // Arms — reaching forward
  drawArm(g, CX - 11 + lean * 3, GY - 44 + bob, 0.3, -1, 0.2);
  drawArm(g, CX + 11 + lean * 3, GY - 44 + bob, 0.3, 1, 0.2);

  // Head — looking forward
  drawHead(g, CX + lean * 4, GY - 56 + bob, 0, 0.7);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = frame / 8;

  // Phase: 0-0.3 = wind up, 0.3-0.5 = strike, 0.5-1.0 = follow through
  const windUp = clamp01(t / 0.3);
  const strike = clamp01((t - 0.3) / 0.2);
  const followThrough = clamp01((t - 0.5) / 0.5);

  const lunge = strike > 0 ? strike * 8 - followThrough * 5 : -windUp * 3;
  const armRaise = windUp * 0.8 - followThrough * 0.3;
  const clawExt = strike > 0 ? 0.6 + strike * 0.4 : windUp * 0.3;
  const wingSpread = 0.3 + strike * 0.6 - followThrough * 0.3;
  const mouthOpen = strike * 0.6;

  // Shadow
  drawShadow(g, CX + lunge * 0.5, GY, 18 + wingSpread * 8, 5);

  // Legs
  drawLegs(g, CX + lunge * 0.3, GY - 27, t * 0.3);

  // Cloth
  drawCloth(g, CX + lunge * 0.3, GY - 27, t * Math.PI);

  // Torso — lunging forward
  drawTorso(g, CX + lunge * 0.4, GY - 47, lunge * 0.05);

  // Wings spread during strike
  drawWing(g, CX - 10 + lunge * 0.3, GY - 45, wingSpread, -1, 0.85);
  drawWing(g, CX + 10 + lunge * 0.3, GY - 45, wingSpread, 1, 0.85);

  // Arms — one slashing, one bracing
  drawArm(g, CX - 11 + lunge * 0.4, GY - 45, armRaise, -1, clawExt);
  drawArm(g, CX + 11 + lunge * 0.4, GY - 45, armRaise * 0.6, 1, clawExt * 0.7);

  // Head
  drawHead(g, CX + lunge * 0.5, GY - 57, mouthOpen, 0.9);

  // Blood splatter on strike frames
  if (strike > 0.3 && followThrough < 0.7) {
    const splashAlpha = (1 - followThrough) * 0.7;
    const splatX = CX + lunge + 12;
    const splatY = GY - 40;
    for (let s = 0; s < 5; s++) {
      const angle = (s / 5) * Math.PI * 0.8 - Math.PI * 0.2;
      const dist = 4 + s * 3 * strike;
      const bx = splatX + Math.cos(angle) * dist;
      const by = splatY + Math.sin(angle) * dist;
      g.circle(bx, by, 1 + Math.random() * 1.5).fill({ color: s % 2 === 0 ? COL_BLOOD : COL_BLOOD_DK, alpha: splashAlpha });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 8;

  // Screech: build up → release → fade
  const buildUp = clamp01(t / 0.3);
  const release = clamp01((t - 0.3) / 0.2);
  const fade = clamp01((t - 0.5) / 0.5);

  const mouthOpen = buildUp * 0.5 + release * 0.5 - fade * 0.5;
  const wingSpread = 0.3 + release * 0.7 - fade * 0.3;
  const headTilt = release * 3 - fade * 2;

  // Shadow
  drawShadow(g, CX, GY, 18 + wingSpread * 10, 5);

  // Legs
  drawLegs(g, CX, GY - 27, 0);

  // Cloth
  drawCloth(g, CX, GY - 27, t * Math.PI * 3);

  // Torso — puffed up
  drawTorso(g, CX, GY - 48 - headTilt * 0.5, 0);

  // Wings — spread wide during screech
  drawWing(g, CX - 10, GY - 46, wingSpread, -1, 0.9);
  drawWing(g, CX + 10, GY - 46, wingSpread, 1, 0.9);

  // Arms — spread out
  drawArm(g, CX - 11, GY - 46, 0.5 + release * 0.3, -1, 0.3);
  drawArm(g, CX + 11, GY - 46, 0.5 + release * 0.3, 1, 0.3);

  // Head — tilted back screaming
  drawHead(g, CX, GY - 58 - headTilt, mouthOpen, 1.0);

  // Sonic screech rings
  if (release > 0.1) {
    const ringAlpha = (1 - fade) * 0.5;
    const numRings = 3;
    for (let r = 0; r < numRings; r++) {
      const ringT = clamp01((t - 0.35 - r * 0.08) / 0.4);
      if (ringT <= 0) continue;
      const ringR = 5 + ringT * 30;
      const rAlpha = ringAlpha * (1 - ringT);
      g.circle(CX, GY - 55 - headTilt, ringR)
        .stroke({ color: r % 2 === 0 ? COL_SCREECH : COL_SCREECH_DK, width: 1.5, alpha: rAlpha });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const collapse = clamp01(t / 0.6);
  const dissolve = clamp01((t - 0.4) / 0.6);

  const bodyAlpha = 1 - dissolve * 0.8;
  const tilt = collapse * 15;
  const dropY = collapse * 20;

  // Shadow — shrinks
  drawShadow(g, CX, GY, lerp(18, 10, dissolve), lerp(5, 3, dissolve));

  // Only draw body if not fully dissolved
  if (bodyAlpha > 0.05) {
    g.alpha = bodyAlpha;

    // Legs — crumpling
    const legY = GY - 28 + dropY;
    drawLegs(g, CX - tilt * 0.3, legY, 0);

    // Cloth
    drawCloth(g, CX - tilt * 0.3, legY, t * Math.PI);

    // Torso — falling forward
    drawTorso(g, CX - tilt * 0.5, GY - 48 + dropY + tilt * 0.3, collapse * 0.5);

    // Wings — crumpling down
    drawWing(g, CX - 10 - tilt * 0.3, GY - 46 + dropY + tilt * 0.2, lerp(0.15, 0.02, collapse), -1, bodyAlpha * 0.7);
    drawWing(g, CX + 10 - tilt * 0.3, GY - 46 + dropY + tilt * 0.2, lerp(0.15, 0.02, collapse), 1, bodyAlpha * 0.7);

    // Arms — going limp
    drawArm(g, CX - 11 - tilt * 0.5, GY - 46 + dropY + tilt * 0.3, lerp(0.1, 0, collapse), -1, 0);
    drawArm(g, CX + 11 - tilt * 0.5, GY - 46 + dropY + tilt * 0.3, lerp(0.1, 0, collapse), 1, 0);

    // Head — drooping
    drawHead(g, CX - tilt * 0.6, GY - 58 + dropY + tilt * 0.5, 0, lerp(0.5, 0, collapse));

    g.alpha = 1;
  }

  // Dark mist particles during dissolve
  if (dissolve > 0.1) {
    const mistCount = 8;
    for (let m = 0; m < mistCount; m++) {
      const angle = (m / mistCount) * Math.PI * 2 + t * 2;
      const dist = dissolve * (8 + m * 3);
      const mx = CX + Math.cos(angle) * dist - tilt * 0.3;
      const my = GY - 35 + dropY + Math.sin(angle) * dist * 0.6;
      const size = 2 + dissolve * 3;
      g.circle(mx, my, size).fill({ color: COL_MIST, alpha: (1 - dissolve) * 0.5 });
    }
  }
}

/* ── state map & export ──────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrame, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrame, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrame, count: 8 },
  [UnitState.CAST]: { gen: generateCastFrame, count: 8 },
  [UnitState.DIE]: { gen: generateDieFrame, count: 8 },
};

/**
 * Generate all vampire bat sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[], at 96×96 pixels per frame.
 */
export function generateVampireBatFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
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
