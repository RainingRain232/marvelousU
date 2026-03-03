// Procedural sprite generator for the Hero unit type.
//
// Draws an imposing, heavily armored national hero at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Full plate armor — polished steel with gold trim and filigree
//   • Great helm with raised visor, gold crown band, flowing crimson plume
//   • Royal blue tabard over plate, with gold lion emblem
//   • Broad pauldrons with gold edge rivets
//   • Gauntleted hands gripping a longsword (right) and kite shield (left)
//   • Shield: blue field with gold lion rampant, steel rim
//   • Plate greaves and sabatons with gold knee cops
//   • Crimson cloak draped from shoulders, flowing behind
//   • Idle: noble stance, plume sways, slight breathing
//   • Move: marching stride, cape billows, armor jingles
//   • Attack: overhead sword cleave with impact flash
//   • Cast: raises sword skyward, radiant golden aura burst
//   • Die: staggers, falls to one knee, collapses with cloak pooling

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — polished plate armor
const COL_PLATE = 0xc0c8d0;        // polished steel
const COL_PLATE_HI = 0xd8dee8;     // highlight
const COL_PLATE_DK = 0x8890a0;     // shadow
const COL_PLATE_EDGE = 0x707888;   // plate edges

const COL_GOLD = 0xdda833;         // gold trim
const COL_GOLD_HI = 0xf0cc55;     // gold highlight
const COL_GOLD_DK = 0xaa7722;     // gold shadow

const COL_TABARD = 0x2244aa;       // royal blue tabard
const COL_TABARD_HI = 0x3366cc;

const COL_CAPE = 0x991122;         // crimson cloak
const COL_CAPE_DK = 0x660e18;
const COL_CAPE_HI = 0xbb2233;

const COL_PLUME = 0xcc1133;        // helmet plume
const COL_PLUME_DK = 0x990e22;
const COL_PLUME_HI = 0xee3355;

const COL_VISOR = 0x222222;        // helm visor slits
const COL_HELM = 0xbbc4cc;         // helm
const COL_HELM_DK = 0x8a929a;

const COL_SWORD = 0xc8d0d8;        // longsword blade
const COL_SWORD_HI = 0xe0e8f0;
const COL_SWORD_EDGE = 0x999db0;
const COL_CROSSGUARD = 0xdda833;   // gold crossguard
const COL_GRIP = 0x3a2820;         // leather grip
const COL_POMMEL = 0xdda833;

const COL_SHIELD_FACE = 0x2244aa;  // blue shield face
const COL_SHIELD_RIM = 0xaab0b8;   // steel rim
const COL_SHIELD_LION = 0xdda833;  // gold lion

const COL_SKIN = 0xd4a882;         // exposed chin
const COL_KNEE = 0xdda833;         // gold knee cops

const COL_GLOW = 0xffdd44;         // golden radiance for cast
const COL_GLOW_CORE = 0xffeebb;

const COL_IMPACT = 0xffffff;       // attack impact flash

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

/** Draw crimson cloak draped behind */
function drawCape(
  g: Graphics,
  cx: number, topY: number,
  sway: number,
  length: number,
  alpha: number,
): void {
  const sw = sway * 2;
  g.moveTo(cx - 6, topY)
    .quadraticCurveTo(cx - 8 + sw, topY + length * 0.5, cx - 5 + sw * 1.5, topY + length)
    .lineTo(cx + 5 + sw * 1.5, topY + length)
    .quadraticCurveTo(cx + 8 + sw, topY + length * 0.5, cx + 6, topY)
    .closePath()
    .fill({ color: COL_CAPE, alpha });

  // Cape highlight fold
  g.moveTo(cx - 2, topY + 2)
    .quadraticCurveTo(cx + sw * 0.5, topY + length * 0.4, cx + sw, topY + length - 2)
    .stroke({ color: COL_CAPE_HI, width: 0.8, alpha: alpha * 0.4 });

  // Dark inner edge
  g.moveTo(cx - 5, topY + 1)
    .quadraticCurveTo(cx - 7 + sw, topY + length * 0.5, cx - 4 + sw, topY + length - 1)
    .stroke({ color: COL_CAPE_DK, width: 0.6, alpha: alpha * 0.5 });
}

/** Draw plate armor legs (greaves + sabatons) */
function drawLegs(
  g: Graphics,
  cx: number, hipY: number,
  walkPhase: number,
): void {
  for (const side of [-1, 1]) {
    const offset = Math.sin(walkPhase * Math.PI * 2 + (side > 0 ? Math.PI : 0)) * 3;
    const lx = cx + side * 3;
    const footY = hipY + 14 - Math.abs(offset) * 0.3;

    // Upper leg (plate cuisses)
    g.rect(lx - 2.5, hipY, 5, 7 + offset * 0.3).fill({ color: COL_PLATE_DK });
    g.rect(lx - 2, hipY + 0.5, 4, 6 + offset * 0.3).fill({ color: COL_PLATE });

    // Gold knee cop
    g.circle(lx, hipY + 7 + offset * 0.3, 2.5).fill({ color: COL_KNEE });
    g.circle(lx, hipY + 7 + offset * 0.3, 1.2).fill({ color: COL_GOLD_HI, alpha: 0.5 });

    // Lower leg (greaves)
    g.rect(lx - 2, hipY + 8 + offset * 0.3, 4, 5).fill({ color: COL_PLATE });
    g.setStrokeStyle({ width: 0.5, color: COL_PLATE_EDGE, alpha: 0.4 });
    g.moveTo(lx, hipY + 8 + offset * 0.3).lineTo(lx, hipY + 13 + offset * 0.3).stroke();

    // Sabaton (armored boot)
    g.ellipse(lx + side * 0.5, footY, 3, 1.5).fill({ color: COL_PLATE_DK });
    g.ellipse(lx + side * 0.5, footY - 0.3, 2.5, 1.2).fill({ color: COL_PLATE });
  }
}

/** Draw plate torso + tabard */
function drawTorso(
  g: Graphics,
  tx: number, ty: number,
  lean: number,
): void {
  const lx = tx + lean * 2;

  // Plate cuirass (back)
  g.roundRect(lx - 8, ty, 16, 14, 2).fill({ color: COL_PLATE_DK });
  // Front plate
  g.roundRect(lx - 7, ty + 0.5, 14, 13, 2).fill({ color: COL_PLATE });

  // Plate highlight (chest curve)
  g.ellipse(lx, ty + 5, 5, 4).fill({ color: COL_PLATE_HI, alpha: 0.25 });

  // Tabard over plate
  g.rect(lx - 5, ty + 3, 10, 10).fill({ color: COL_TABARD });
  g.rect(lx - 4.5, ty + 3.5, 9, 9).fill({ color: COL_TABARD_HI, alpha: 0.15 });

  // Gold lion emblem on tabard
  // Simplified lion: circle head + mane lines
  g.circle(lx, ty + 7, 2).fill({ color: COL_GOLD });
  g.circle(lx, ty + 7, 2).stroke({ color: COL_GOLD_DK, width: 0.5 });
  // Mane rays
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI - Math.PI * 0.5;
    g.moveTo(lx + Math.cos(a) * 2, ty + 7 + Math.sin(a) * 2)
      .lineTo(lx + Math.cos(a) * 3.5, ty + 7 + Math.sin(a) * 3.5)
      .stroke({ color: COL_GOLD, width: 0.6 });
  }

  // Gold trim along tabard edge
  g.rect(lx - 5, ty + 3, 10, 1).fill({ color: COL_GOLD, alpha: 0.6 });
  g.rect(lx - 5, ty + 12, 10, 0.8).fill({ color: COL_GOLD, alpha: 0.5 });

  // Gorget (neck plate)
  g.rect(lx - 4, ty - 1, 8, 2).fill({ color: COL_PLATE });
  g.rect(lx - 4, ty - 1, 8, 0.5).fill({ color: COL_GOLD, alpha: 0.4 });

  // Pauldrons (shoulder plates)
  for (const side of [-1, 1]) {
    const px = lx + side * 9;
    g.ellipse(px, ty + 2, 4.5, 3.5).fill({ color: COL_PLATE_DK });
    g.ellipse(px, ty + 1.5, 4, 3).fill({ color: COL_PLATE });
    g.ellipse(px, ty + 1, 3, 2).fill({ color: COL_PLATE_HI, alpha: 0.3 });
    // Gold edge rivets
    for (let r = 0; r < 3; r++) {
      const ra = (r / 3) * Math.PI * 0.8 + Math.PI * 0.1;
      g.circle(px + Math.cos(ra) * side * 3.5, ty + 2 + Math.sin(ra) * 2.5, 0.6)
        .fill({ color: COL_GOLD });
    }
  }
}

/** Draw the great helm with crown band and plume */
function drawHelm(
  g: Graphics,
  hx: number, hy: number,
  plumeSway: number,
  visorUp: boolean,
): void {
  // Helm body
  g.ellipse(hx, hy, 6, 7).fill({ color: COL_HELM_DK });
  g.ellipse(hx, hy - 0.5, 5.5, 6.5).fill({ color: COL_HELM });
  // Top highlight
  g.ellipse(hx - 1, hy - 3, 3, 2).fill({ color: COL_PLATE_HI, alpha: 0.3 });

  // Crown band (gold circlet around helm)
  g.ellipse(hx, hy - 1, 5.5, 2).fill({ color: COL_GOLD, alpha: 0 }); // invisible fill for stroke reference
  g.setStrokeStyle({ width: 1.5, color: COL_GOLD });
  g.ellipse(hx, hy - 1, 5.5, 1.5).stroke();
  // Crown points
  for (let i = -2; i <= 2; i++) {
    const px = hx + i * 2.2;
    const py = hy - 2.5;
    g.moveTo(px - 1, py).lineTo(px, py - 2).lineTo(px + 1, py).closePath()
      .fill({ color: COL_GOLD });
  }

  // Visor
  if (visorUp) {
    // Visor raised — show face beneath
    g.rect(hx - 4, hy + 0.5, 8, 4).fill({ color: COL_VISOR });
    // Chin visible
    g.ellipse(hx, hy + 3.5, 3, 2).fill({ color: COL_SKIN });
    // Eyes
    for (const side of [-1, 1]) {
      g.rect(hx + side * 2 - 0.8, hy + 1, 1.6, 1).fill({ color: 0xffffff, alpha: 0.8 });
      g.rect(hx + side * 2 - 0.4, hy + 1.2, 0.8, 0.6).fill({ color: 0x334466 });
    }
  } else {
    // Visor down — T-shaped slit
    g.setStrokeStyle({ width: 0.8, color: COL_VISOR });
    g.moveTo(hx - 4, hy + 1).lineTo(hx + 4, hy + 1).stroke();
    g.moveTo(hx, hy + 1).lineTo(hx, hy + 4).stroke();
    // Ventilation holes on left cheek
    for (let v = 0; v < 3; v++) {
      g.circle(hx - 3, hy + 2 + v * 1.2, 0.3).fill({ color: COL_VISOR });
    }
  }

  // Plume — flowing crest
  const plumeBaseX = hx;
  const plumeBaseY = hy - 7;
  const sw = plumeSway * 3;

  // Plume body
  g.moveTo(plumeBaseX - 1.5, plumeBaseY)
    .quadraticCurveTo(plumeBaseX - 3 + sw, plumeBaseY - 4, plumeBaseX - 2 + sw * 1.5, plumeBaseY - 8)
    .lineTo(plumeBaseX + 2 + sw * 1.5, plumeBaseY - 8)
    .quadraticCurveTo(plumeBaseX + 3 + sw, plumeBaseY - 4, plumeBaseX + 1.5, plumeBaseY)
    .closePath()
    .fill({ color: COL_PLUME });

  // Plume highlight
  g.moveTo(plumeBaseX + sw * 0.3, plumeBaseY - 1)
    .quadraticCurveTo(plumeBaseX + 1 + sw, plumeBaseY - 5, plumeBaseX + sw * 1.2, plumeBaseY - 7)
    .stroke({ color: COL_PLUME_HI, width: 0.8, alpha: 0.5 });

  // Plume dark edge
  g.moveTo(plumeBaseX - 1 + sw * 0.2, plumeBaseY - 1)
    .quadraticCurveTo(plumeBaseX - 2 + sw * 0.8, plumeBaseY - 5, plumeBaseX - 1 + sw * 1.2, plumeBaseY - 7)
    .stroke({ color: COL_PLUME_DK, width: 0.6, alpha: 0.4 });
}

/** Draw gauntleted arm */
function drawArm(
  g: Graphics,
  shoulderX: number, shoulderY: number,
  elbowAngle: number,   // 0 = down, 1 = raised
  side: number,
): void {
  const dir = side;
  const elbowX = shoulderX + dir * 5;
  const elbowY = shoulderY + lerp(8, 1, elbowAngle);
  const handX = elbowX + dir * lerp(1, 4, elbowAngle);
  const handY = elbowY + lerp(5, -1, elbowAngle);

  // Upper arm
  g.setStrokeStyle({ width: 3.5, color: COL_PLATE_DK });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY).stroke();
  g.setStrokeStyle({ width: 2.5, color: COL_PLATE });
  g.moveTo(shoulderX, shoulderY).lineTo(elbowX, elbowY).stroke();

  // Elbow cop
  g.circle(elbowX, elbowY, 1.8).fill({ color: COL_GOLD });

  // Forearm
  g.setStrokeStyle({ width: 3, color: COL_PLATE_DK });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY).stroke();
  g.setStrokeStyle({ width: 2, color: COL_PLATE });
  g.moveTo(elbowX, elbowY).lineTo(handX, handY).stroke();

  // Gauntlet
  g.circle(handX, handY, 2).fill({ color: COL_PLATE_DK });
  g.circle(handX, handY, 1.5).fill({ color: COL_PLATE });
}

/** Draw the longsword */
function drawSword(
  g: Graphics,
  baseX: number, baseY: number,
  angle: number,  // rotation angle of sword
  length: number,
): void {
  const tipX = baseX + Math.sin(angle) * length;
  const tipY = baseY - Math.cos(angle) * length;

  // Blade
  g.setStrokeStyle({ width: 2.2, color: COL_SWORD_EDGE });
  g.moveTo(baseX, baseY).lineTo(tipX, tipY).stroke();
  g.setStrokeStyle({ width: 1.4, color: COL_SWORD });
  g.moveTo(baseX, baseY).lineTo(tipX, tipY).stroke();
  // Central fuller (groove)
  g.setStrokeStyle({ width: 0.5, color: COL_SWORD_HI, alpha: 0.5 });
  g.moveTo(baseX + (tipX - baseX) * 0.1, baseY + (tipY - baseY) * 0.1)
    .lineTo(baseX + (tipX - baseX) * 0.85, baseY + (tipY - baseY) * 0.85)
    .stroke();

  // Crossguard
  const cgPerp = angle + Math.PI / 2;
  const cgLen = 3;
  g.setStrokeStyle({ width: 1.5, color: COL_CROSSGUARD });
  g.moveTo(baseX + Math.cos(cgPerp) * cgLen, baseY + Math.sin(cgPerp) * cgLen)
    .lineTo(baseX - Math.cos(cgPerp) * cgLen, baseY - Math.sin(cgPerp) * cgLen)
    .stroke();

  // Grip
  const gripX = baseX - Math.sin(angle) * 3;
  const gripY = baseY + Math.cos(angle) * 3;
  g.setStrokeStyle({ width: 2, color: COL_GRIP });
  g.moveTo(baseX, baseY).lineTo(gripX, gripY).stroke();

  // Pommel
  g.circle(gripX, gripY, 1.2).fill({ color: COL_POMMEL });
}

/** Draw kite shield */
function drawShield(
  g: Graphics,
  sx: number, sy: number,
  tilt: number,
): void {
  // Shield shape — kite/heater
  const w = 6 + tilt * 0.5;
  const h = 9;
  g.moveTo(sx, sy - h * 0.4)
    .lineTo(sx + w * 0.5, sy - h * 0.15)
    .lineTo(sx + w * 0.4, sy + h * 0.3)
    .lineTo(sx, sy + h * 0.5)
    .lineTo(sx - w * 0.4, sy + h * 0.3)
    .lineTo(sx - w * 0.5, sy - h * 0.15)
    .closePath()
    .fill({ color: COL_SHIELD_FACE });

  // Steel rim
  g.moveTo(sx, sy - h * 0.4)
    .lineTo(sx + w * 0.5, sy - h * 0.15)
    .lineTo(sx + w * 0.4, sy + h * 0.3)
    .lineTo(sx, sy + h * 0.5)
    .lineTo(sx - w * 0.4, sy + h * 0.3)
    .lineTo(sx - w * 0.5, sy - h * 0.15)
    .closePath()
    .stroke({ color: COL_SHIELD_RIM, width: 1 });

  // Gold lion on shield
  g.circle(sx, sy, 2).fill({ color: COL_SHIELD_LION });
  // Lion mane rays
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.moveTo(sx + Math.cos(a) * 1.5, sy + Math.sin(a) * 1.5)
      .lineTo(sx + Math.cos(a) * 3, sy + Math.sin(a) * 3)
      .stroke({ color: COL_SHIELD_LION, width: 0.6 });
  }

  // Center boss
  g.circle(sx, sy, 1).fill({ color: COL_GOLD_HI, alpha: 0.6 });
}

/* ── frame generators ──────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const plumeSway = Math.sin(t * Math.PI * 2 + 0.3) * 0.3;

  // Shadow
  drawShadow(g, CX, GY, 9, 3);

  // Cape
  drawCape(g, CX, GY - 28 + breathe, plumeSway, 18, 0.9);

  // Legs — standing
  drawLegs(g, CX, GY - 18, 0);

  // Torso
  drawTorso(g, CX, GY - 32 + breathe, 0);

  // Shield arm + shield
  drawArm(g, CX - 9, GY - 30 + breathe, 0.15, -1);
  drawShield(g, CX - 12, GY - 22 + breathe, 0);

  // Sword arm + sword (held upright at side)
  drawArm(g, CX + 9, GY - 30 + breathe, 0.2, 1);
  drawSword(g, CX + 14, GY - 24 + breathe, 0, 12);

  // Helm
  drawHelm(g, CX, GY - 38 + breathe, plumeSway, true);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.sin(t * Math.PI * 4) * 1.5;
  const plumeSway = Math.sin(t * Math.PI * 4 + 0.5) * 0.5;
  const capeSway = Math.sin(t * Math.PI * 4 - 0.3) * 0.6;

  // Shadow
  drawShadow(g, CX, GY, 9, 3);

  // Cape — billowing with movement
  drawCape(g, CX, GY - 27 + bob, capeSway, 19, 0.9);

  // Legs — marching
  drawLegs(g, CX, GY - 17 + bob * 0.5, t);

  // Torso
  drawTorso(g, CX, GY - 31 + bob, 0.15);

  // Shield arm + shield (raised slightly in march)
  drawArm(g, CX - 9, GY - 29 + bob, 0.25, -1);
  drawShield(g, CX - 13, GY - 22 + bob, 0.2);

  // Sword arm + sword (carried at angle)
  drawArm(g, CX + 9, GY - 29 + bob, 0.3, 1);
  drawSword(g, CX + 14, GY - 23 + bob, 0.3, 11);

  // Helm
  drawHelm(g, CX, GY - 37 + bob, plumeSway, true);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const t = frame / 8;

  // Phases: 0–0.25 wind up, 0.25–0.5 strike, 0.5–1.0 recover
  const windUp = clamp01(t / 0.25);
  const strike = clamp01((t - 0.25) / 0.25);
  const recover = clamp01((t - 0.5) / 0.5);

  const swordAngle = windUp > 0 && strike === 0
    ? lerp(0, -1.2, windUp)       // wind back
    : strike > 0 && recover === 0
      ? lerp(-1.2, 1.8, strike)   // swing forward
      : lerp(1.8, 0, recover);    // return to neutral

  const lunge = strike > 0 && recover === 0
    ? strike * 4 : recover > 0 ? (1 - recover) * 4 : 0;

  const shieldBrace = strike > 0 ? 0.4 : 0.15;

  // Shadow
  drawShadow(g, CX + lunge * 0.3, GY, 9, 3);

  // Cape
  drawCape(g, CX + lunge * 0.2, GY - 28, -lunge * 0.1, 18, 0.85);

  // Legs
  drawLegs(g, CX + lunge * 0.2, GY - 18, t * 0.2);

  // Torso
  drawTorso(g, CX + lunge * 0.3, GY - 32, lunge * 0.04);

  // Shield arm (braced)
  drawArm(g, CX - 9 + lunge * 0.2, GY - 30, shieldBrace, -1);
  drawShield(g, CX - 12 + lunge * 0.1, GY - 23, shieldBrace * 2);

  // Sword arm + sword
  const armRaise = windUp > 0 && strike === 0
    ? lerp(0.2, 0.9, windUp)
    : strike > 0 && recover === 0
      ? lerp(0.9, 0.3, strike)
      : lerp(0.3, 0.2, recover);

  drawArm(g, CX + 9 + lunge * 0.3, GY - 30, armRaise, 1);
  drawSword(g, CX + 14 + lunge * 0.4, GY - 25 - armRaise * 4, swordAngle, 13);

  // Helm
  drawHelm(g, CX + lunge * 0.3, GY - 38, -lunge * 0.05, false);

  // Impact flash on strike frames
  if (strike > 0.3 && recover < 0.3) {
    const flashAlpha = (1 - recover) * 0.6;
    const fx = CX + 16 + lunge;
    const fy = GY - 20;
    g.star(fx, fy, 4, 2, 5, 0).fill({ color: COL_IMPACT, alpha: flashAlpha });
    g.circle(fx, fy, 3).fill({ color: COL_GOLD_HI, alpha: flashAlpha * 0.5 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 8;

  // Build up → radiant burst → fade
  const buildUp = clamp01(t / 0.35);
  const burst = clamp01((t - 0.35) / 0.2);
  const fade = clamp01((t - 0.55) / 0.45);

  const swordRaise = buildUp * 1.0 + burst * 0.2 - fade * 0.8;
  const glowIntensity = burst > 0 ? (1 - fade) : buildUp * 0.3;

  // Shadow
  drawShadow(g, CX, GY, 9 + glowIntensity * 3, 3);

  // Cape
  drawCape(g, CX, GY - 28, burst * 0.3, 18, 0.9);

  // Legs
  drawLegs(g, CX, GY - 18, 0);

  // Torso
  drawTorso(g, CX, GY - 32, 0);

  // Shield arm
  drawArm(g, CX - 9, GY - 30, 0.3 + buildUp * 0.2, -1);
  drawShield(g, CX - 12, GY - 23, 0.3);

  // Sword arm raised high
  drawArm(g, CX + 9, GY - 30, 0.3 + swordRaise * 0.7, 1);
  drawSword(g, CX + 13, GY - 30 - swordRaise * 6, -0.2 + swordRaise * 0.3, 13);

  // Helm
  drawHelm(g, CX, GY - 38, 0, false);

  // Golden radiance aura
  if (glowIntensity > 0.05) {
    // Outer glow
    g.circle(CX, GY - 25, 12 + glowIntensity * 8)
      .fill({ color: COL_GLOW, alpha: glowIntensity * 0.15 });
    // Inner bright core
    g.circle(CX + 13, GY - 36 - swordRaise * 6, 3 + glowIntensity * 4)
      .fill({ color: COL_GLOW_CORE, alpha: glowIntensity * 0.4 });
    // Radiant rays from sword tip
    if (burst > 0.2) {
      const rayAlpha = (1 - fade) * 0.35;
      const rayCount = 6;
      for (let r = 0; r < rayCount; r++) {
        const angle = (r / rayCount) * Math.PI * 2 + t * 2;
        const rayLen = 5 + burst * 8;
        const rx = CX + 13 + Math.cos(angle) * rayLen;
        const ry = GY - 36 - swordRaise * 6 + Math.sin(angle) * rayLen;
        g.setStrokeStyle({ width: 1, color: COL_GLOW, alpha: rayAlpha });
        g.moveTo(CX + 13, GY - 36 - swordRaise * 6).lineTo(rx, ry).stroke();
      }
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 8;

  const stagger = clamp01(t / 0.3);
  const kneel = clamp01((t - 0.2) / 0.3);
  const collapse = clamp01((t - 0.5) / 0.5);

  const tilt = stagger * 3 + collapse * 10;
  const dropY = kneel * 6 + collapse * 12;
  const bodyAlpha = 1 - collapse * 0.3;

  // Shadow (stays)
  drawShadow(g, CX - tilt * 0.2, GY, lerp(9, 12, collapse), lerp(3, 2, collapse));

  g.alpha = bodyAlpha;

  // Cape — pools on ground
  drawCape(g, CX - tilt * 0.3, GY - 28 + dropY, collapse * 0.5, lerp(18, 12, collapse), bodyAlpha * 0.8);

  // Legs — kneeling then collapsed
  const legPhase = kneel * 0.25;
  drawLegs(g, CX - tilt * 0.2, GY - 18 + dropY, legPhase);

  // Torso — tilting
  drawTorso(g, CX - tilt * 0.3, GY - 32 + dropY, tilt * 0.03);

  // Shield drops
  drawArm(g, CX - 9 - tilt * 0.2, GY - 30 + dropY, lerp(0.15, 0, collapse), -1);
  if (collapse < 0.7) {
    drawShield(g, CX - 12 - tilt * 0.3, GY - 22 + dropY + collapse * 5, collapse);
  }

  // Sword drops
  drawArm(g, CX + 9 - tilt * 0.2, GY - 30 + dropY, lerp(0.2, 0, collapse), 1);
  if (collapse < 0.8) {
    drawSword(g, CX + 14 - tilt * 0.2, GY - 24 + dropY + collapse * 4, collapse * 1.5, lerp(12, 8, collapse));
  }

  // Helm
  drawHelm(g, CX - tilt * 0.4, GY - 38 + dropY + tilt * 0.2, collapse * 0.3, false);

  g.alpha = 1;
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
 * Generate all hero sprite frames procedurally.
 *
 * Returns a Map from UnitState → ordered Texture[], at 48×48 pixels per frame.
 */
export function generateHeroFrames(
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
