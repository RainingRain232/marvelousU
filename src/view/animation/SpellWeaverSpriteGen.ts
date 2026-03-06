// Procedural sprite generator for the SpellWeaver unit type.
//
// Draws a dual-element wizard at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Deep purple robes with golden fire/lightning embroidery
//   • Tall pointed hat with constellation star patterns
//   • Elderly face with long silver-white beard
//   • Right hand wreathed in orange/red fire
//   • Left hand crackling with blue-white lightning
//   • Two glowing orbs (fire + lightning) orbiting the body
//   • Dual-element magic effects throughout all animations

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — deep purple robes, golden trim, dual elements
const COL_ROBE      = 0x2a0a4a; // deep purple
const COL_ROBE_MID  = 0x3d1466; // mid purple
const COL_ROBE_HI   = 0x6a2aaa; // lighter purple highlight
const COL_GOLD      = 0xffd700; // golden embroidery
const COL_GOLD_DK   = 0xb8960a; // dark gold

const COL_HAT       = 0x1a0633; // very dark purple hat
const COL_HAT_MID   = 0x2a0a4a;
const COL_HAT_BAND  = 0xffd700; // gold band

const COL_SKIN      = 0xd4a070; // aged skin tone
const COL_SKIN_DK   = 0xb07850;
const COL_BEARD     = 0xe8e8f0; // silver-white beard
const COL_BEARD_DK  = 0xb8b8c8;

const COL_STAR      = 0xffffff; // constellation stars on hat
const COL_STAR_DIM  = 0x8888cc;

const COL_EYE       = 0xddaaff; // glowing violet eyes
const COL_SHOE      = 0x1a0622;
const COL_SHOE_DK   = 0x0a0010;
const COL_SHADOW    = 0x000000;

// Fire element (right hand)
const COL_FIRE_CORE  = 0xff6600; // deep orange
const COL_FIRE_MID   = 0xff9922; // orange
const COL_FIRE_BRIGHT= 0xffcc44; // bright yellow-orange
const COL_FIRE_TIP   = 0xffeeaa; // pale yellow tip
// Lightning element (left hand)
const COL_LIGHT_CORE  = 0x4466ff; // deep blue
const COL_LIGHT_MID   = 0x88aaff; // mid blue
const COL_LIGHT_BRIGHT= 0xccddff; // pale blue-white
const COL_LIGHT_TIP   = 0xffffff; // pure white tip
/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(g: Graphics, cx: number, gy: number, w = 13, h = 3.5, alpha = 0.28): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawShoes(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bh = 5 - squash;
  // Pointed wizard shoes, left
  g.moveTo(cx - 7 + stanceL, gy)
    .lineTo(cx - 7 + stanceL, gy - bh)
    .lineTo(cx - 2 + stanceL, gy - bh)
    .lineTo(cx + 1 + stanceL, gy - bh - 2)
    .lineTo(cx + 1 + stanceL, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
  // Pointed wizard shoes, right
  g.moveTo(cx + 1 + stanceR, gy)
    .lineTo(cx + 1 + stanceR, gy - bh)
    .lineTo(cx + 6 + stanceR, gy - bh)
    .lineTo(cx + 9 + stanceR, gy - bh - 2)
    .lineTo(cx + 9 + stanceR, gy)
    .closePath()
    .fill({ color: COL_SHOE })
    .stroke({ color: COL_SHOE_DK, width: 0.5 });
  // Gold trim on shoe toes
  g.moveTo(cx - 1 + stanceL, gy - bh).lineTo(cx + 1 + stanceL, gy - bh - 2)
    .stroke({ color: COL_GOLD, width: 0.5, alpha: 0.6 });
  g.moveTo(cx + 6 + stanceR, gy - bh).lineTo(cx + 9 + stanceR, gy - bh - 2)
    .stroke({ color: COL_GOLD, width: 0.5, alpha: 0.6 });
}

function drawRobe(
  g: Graphics,
  cx: number,
  robeTop: number,
  robeH: number,
  tilt = 0,
  sway = 0,
): void {
  const topW = 13;
  const botW = 20 + Math.abs(sway);
  const x = cx + tilt;
  // Main robe body
  g.moveTo(x - topW / 2, robeTop)
    .lineTo(x + topW / 2, robeTop)
    .lineTo(x + botW / 2 + sway * 0.4, robeTop + robeH)
    .lineTo(x - botW / 2 + sway * 0.2, robeTop + robeH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_HAT, width: 0.8 });
  // Center highlight stripe
  g.moveTo(x, robeTop + 2)
    .lineTo(x + sway * 0.2, robeTop + robeH - 2)
    .stroke({ color: COL_ROBE_MID, width: 3, alpha: 0.4 });
  // Gold embroidery — hem line
  g.moveTo(x - botW / 2 + sway * 0.2, robeTop + robeH - 2)
    .lineTo(x + botW / 2 + sway * 0.4, robeTop + robeH - 2)
    .stroke({ color: COL_GOLD, width: 1, alpha: 0.7 });
  // Gold fire motif — left side
  g.moveTo(x - topW / 2 + 2, robeTop + 5)
    .quadraticCurveTo(x - topW / 2, robeTop + 8, x - topW / 2 + 3, robeTop + 11)
    .stroke({ color: COL_GOLD_DK, width: 0.6, alpha: 0.5 });
  // Gold lightning motif — right side
  g.moveTo(x + topW / 2 - 3, robeTop + 5)
    .lineTo(x + topW / 2 - 1, robeTop + 8)
    .lineTo(x + topW / 2 - 4, robeTop + 9)
    .lineTo(x + topW / 2, robeTop + 13)
    .stroke({ color: COL_GOLD_DK, width: 0.6, alpha: 0.5 });
  // Belt
  g.rect(x - topW / 2 + 1, robeTop + 8, topW - 2, 2)
    .fill({ color: COL_GOLD_DK, alpha: 0.8 });
  // Belt buckle
  g.rect(x - 2, robeTop + 8, 4, 2).fill({ color: COL_GOLD });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 13;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ROBE_MID })
    .stroke({ color: COL_HAT, width: 0.5 });
  // Gold V-collar
  g.moveTo(cx + tilt - 3, torsoTop)
    .lineTo(cx + tilt, torsoTop + 4)
    .lineTo(cx + tilt + 3, torsoTop)
    .stroke({ color: COL_GOLD, width: 0.8 });
  // Purple highlight down center
  g.moveTo(cx + tilt, torsoTop + 1).lineTo(cx + tilt, torsoTop + torsoH - 1)
    .stroke({ color: COL_ROBE_HI, width: 0.5, alpha: 0.3 });
}

function drawHat(
  g: Graphics,
  cx: number,
  hatBase: number,
  tilt = 0,
  droop = 0,
  twinkle = 0,
): void {
  const x = cx + tilt;
  const brimW = 15;
  const hatH = 16;
  // Brim
  g.ellipse(x, hatBase, brimW / 2, 3)
    .fill({ color: COL_HAT })
    .stroke({ color: COL_GOLD_DK, width: 0.8 });
  // Hat body — tall cone
  g.moveTo(x - 6, hatBase - 1)
    .lineTo(x + 6, hatBase - 1)
    .lineTo(x + 2 + droop, hatBase - hatH)
    .lineTo(x - 2 + droop * 0.3, hatBase - 1)
    .closePath()
    .fill({ color: COL_HAT })
    .stroke({ color: COL_HAT_MID, width: 0.5 });
  // Hat highlight ridge
  g.moveTo(x, hatBase - 2)
    .lineTo(x + 1 + droop * 0.6, hatBase - hatH + 2)
    .stroke({ color: COL_ROBE_HI, width: 0.6, alpha: 0.3 });
  // Gold band
  g.rect(x - 6, hatBase - 4, 12, 2.5).fill({ color: COL_HAT_BAND });
  // Constellation stars
  const starPositions = [
    { rx: -3, ry: -6 },
    { rx: 1, ry: -9 },
    { rx: -1, ry: -12 },
    { rx: 2, ry: -5 },
    { rx: -2, ry: -14 },
  ];
  for (let i = 0; i < starPositions.length; i++) {
    const sp = starPositions[i];
    const starAlpha = 0.4 + twinkle * (i % 2 === 0 ? 0.5 : -0.2);
    const starCol = i % 2 === 0 ? COL_STAR : COL_STAR_DIM;
    g.circle(x + sp.rx + droop * 0.3, hatBase + sp.ry, 0.7 + twinkle * 0.3)
      .fill({ color: starCol, alpha: clamp01(starAlpha) });
  }
  // Connect stars with faint lines
  g.moveTo(x - 3 + droop * 0.3, hatBase - 6)
    .lineTo(x + 1 + droop * 0.3, hatBase - 9)
    .lineTo(x - 1 + droop * 0.3, hatBase - 12)
    .stroke({ color: COL_STAR_DIM, width: 0.3, alpha: 0.25 });
}

function drawFace(
  g: Graphics,
  cx: number,
  faceY: number,
  tilt = 0,
  glowEyes = false,
): void {
  const x = cx + tilt;
  // Head
  g.circle(x, faceY, 5.5).fill({ color: COL_SKIN }).stroke({ color: COL_SKIN_DK, width: 0.4 });
  // Bushy eyebrows
  g.moveTo(x - 3.5, faceY - 2)
    .quadraticCurveTo(x - 1.5, faceY - 3, x - 0.5, faceY - 2)
    .stroke({ color: COL_BEARD_DK, width: 1.2 });
  g.moveTo(x + 0.5, faceY - 2)
    .quadraticCurveTo(x + 2, faceY - 3, x + 3.5, faceY - 2)
    .stroke({ color: COL_BEARD_DK, width: 1.2 });
  // Eyes
  const eyeCol = glowEyes ? COL_EYE : 0x444466;
  g.circle(x - 2, faceY - 1, 0.9).fill({ color: eyeCol });
  g.circle(x + 2, faceY - 1, 0.9).fill({ color: eyeCol });
  if (glowEyes) {
    g.circle(x - 2, faceY - 1, 2.5).fill({ color: COL_EYE, alpha: 0.25 });
    g.circle(x + 2, faceY - 1, 2.5).fill({ color: COL_EYE, alpha: 0.25 });
  }
  // Nose — slightly bulbous elderly
  g.circle(x, faceY + 0.8, 0.8).fill({ color: COL_SKIN_DK, alpha: 0.5 });
  // Thin-lipped mouth
  g.moveTo(x - 1.5, faceY + 2.5)
    .lineTo(x + 1.5, faceY + 2.5)
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
}

function drawBeard(
  g: Graphics,
  cx: number,
  beardTop: number,
  beardLen: number,
  tilt = 0,
  sway = 0,
): void {
  const x = cx + tilt;
  // Long flowing beard
  g.moveTo(x - 4, beardTop)
    .lineTo(x + 4, beardTop)
    .lineTo(x + 3 + sway, beardTop + beardLen)
    .lineTo(x + sway * 0.6, beardTop + beardLen + 3)
    .lineTo(x - 2 + sway * 0.3, beardTop + beardLen)
    .closePath()
    .fill({ color: COL_BEARD })
    .stroke({ color: COL_BEARD_DK, width: 0.4 });
  // Beard detail strands
  for (let i = 2; i < beardLen; i += 3) {
    g.moveTo(x - 3 + sway * (i / beardLen) * 0.4, beardTop + i)
      .lineTo(x + 3 + sway * (i / beardLen) * 0.8, beardTop + i)
      .stroke({ color: COL_BEARD_DK, width: 0.3, alpha: 0.35 });
  }
  // Mustache
  g.moveTo(x - 3.5, beardTop + 0.5)
    .quadraticCurveTo(x, beardTop - 0.5, x + 3.5, beardTop + 0.5)
    .stroke({ color: COL_BEARD_DK, width: 1.5 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_MID, width: 3 });
  // Cuff gold trim
  const mx = lerp(sx, ex, 0.8);
  const my = lerp(sy, ey, 0.8);
  g.moveTo(mx - 1, my - 1).lineTo(mx + 1, my + 1)
    .stroke({ color: COL_GOLD, width: 1.5, alpha: 0.6 });
  // Hand
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

function drawFireHand(
  g: Graphics,
  hx: number,
  hy: number,
  intensity = 1,
  pulse = 0,
): void {
  // Outer glow aura
  g.circle(hx, hy, 5 * intensity + pulse).fill({ color: COL_FIRE_CORE, alpha: 0.12 });
  // Mid glow
  g.circle(hx, hy, 3.5 * intensity + pulse * 0.5).fill({ color: COL_FIRE_MID, alpha: 0.2 });
  // Inner bright core
  g.circle(hx, hy, 2 * intensity).fill({ color: COL_FIRE_BRIGHT, alpha: 0.45 });
  g.circle(hx, hy, 1 * intensity).fill({ color: COL_FIRE_TIP, alpha: 0.7 });
  // Flickering flame tongues
  const numFlames = 4;
  for (let i = 0; i < numFlames; i++) {
    const baseAngle = (i / numFlames) * Math.PI * 2 + pulse * 0.8;
    const flameLen = (2.5 + pulse * 1.5) * intensity;
    const fx = hx + Math.cos(baseAngle) * flameLen;
    const fy = hy + Math.sin(baseAngle) * flameLen * 0.7 - 1;
    const fCol = i % 2 === 0 ? COL_FIRE_CORE : COL_FIRE_MID;
    g.moveTo(hx, hy).lineTo(fx, fy).stroke({ color: fCol, width: 1.2, alpha: 0.6 });
    g.circle(fx, fy, 0.5 + pulse * 0.3).fill({ color: COL_FIRE_TIP, alpha: 0.5 });
  }
}

function drawLightningHand(
  g: Graphics,
  hx: number,
  hy: number,
  intensity = 1,
  pulse = 0,
  frameOffset = 0,
): void {
  // Outer glow aura
  g.circle(hx, hy, 5 * intensity + pulse).fill({ color: COL_LIGHT_CORE, alpha: 0.12 });
  // Mid glow
  g.circle(hx, hy, 3.5 * intensity + pulse * 0.5).fill({ color: COL_LIGHT_MID, alpha: 0.2 });
  // Inner core
  g.circle(hx, hy, 2 * intensity).fill({ color: COL_LIGHT_BRIGHT, alpha: 0.45 });
  g.circle(hx, hy, 1 * intensity).fill({ color: COL_LIGHT_TIP, alpha: 0.7 });
  // Crackling arcs
  const numArcs = 3;
  for (let i = 0; i < numArcs; i++) {
    const baseAngle = (i / numArcs) * Math.PI * 2 + frameOffset * 1.1 + pulse * 0.6;
    const arcLen = (3 + pulse * 2) * intensity;
    const midOffX = (i % 2 === 0 ? 1.5 : -1.5) * intensity;
    const ex = hx + Math.cos(baseAngle) * arcLen;
    const ey = hy + Math.sin(baseAngle) * arcLen;
    g.moveTo(hx, hy)
      .lineTo(hx + Math.cos(baseAngle + 0.4) * arcLen * 0.5 + midOffX, hy + Math.sin(baseAngle + 0.4) * arcLen * 0.5)
      .lineTo(ex, ey)
      .stroke({ color: COL_LIGHT_BRIGHT, width: 0.8, alpha: 0.7 });
    // Glow trace
    g.moveTo(hx, hy).lineTo(ex, ey).stroke({ color: COL_LIGHT_MID, width: 2, alpha: 0.15 });
  }
}

function drawFireOrb(
  g: Graphics,
  ox: number,
  oy: number,
  size = 1,
  pulse = 0,
): void {
  g.circle(ox, oy, 3 * size + pulse * 0.5).fill({ color: COL_FIRE_CORE, alpha: 0.2 });
  g.circle(ox, oy, 2 * size).fill({ color: COL_FIRE_MID, alpha: 0.5 });
  g.circle(ox, oy, 1.2 * size).fill({ color: COL_FIRE_BRIGHT, alpha: 0.7 });
  g.circle(ox, oy, 0.6 * size + pulse * 0.3).fill({ color: COL_FIRE_TIP, alpha: 0.9 });
}

function drawLightningOrb(
  g: Graphics,
  ox: number,
  oy: number,
  size = 1,
  pulse = 0,
): void {
  g.circle(ox, oy, 3 * size + pulse * 0.5).fill({ color: COL_LIGHT_CORE, alpha: 0.2 });
  g.circle(ox, oy, 2 * size).fill({ color: COL_LIGHT_MID, alpha: 0.5 });
  g.circle(ox, oy, 1.2 * size).fill({ color: COL_LIGHT_BRIGHT, alpha: 0.7 });
  g.circle(ox, oy, 0.6 * size + pulse * 0.3).fill({ color: COL_LIGHT_TIP, alpha: 0.9 });
}

function drawOrbits(
  g: Graphics,
  cx: number,
  centerY: number,
  orbitAngle: number,
  orbitRadius: number,
  pulse: number,
): void {
  // Fire orb — orbit around body
  const fireAngle = orbitAngle;
  const fox = cx + Math.cos(fireAngle) * orbitRadius;
  const foy = centerY + Math.sin(fireAngle) * orbitRadius * 0.45;
  drawFireOrb(g, fox, foy, 0.85, pulse * 0.5);

  // Lightning orb — opposite side
  const lightAngle = orbitAngle + Math.PI;
  const lox = cx + Math.cos(lightAngle) * orbitRadius;
  const loy = centerY + Math.sin(lightAngle) * orbitRadius * 0.45;
  drawLightningOrb(g, lox, loy, 0.85, pulse * 0.5);

  // Faint orbit trail
  g.circle(cx, centerY, orbitRadius)
    .stroke({ color: COL_ROBE_HI, width: 0.3, alpha: 0.08 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2);
  const pulse = breathe * 0.5 + 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.25;
  const twinkle = pulse;

  const robeH = 18;
  const robeTop = GY - robeH - 3 + breathe * 0.4;
  const torsoTop = robeTop - 5 + breathe * 0.4;
  const faceY = torsoTop - 4 + breathe * 0.4;
  const hatBase = faceY - 5 + breathe * 0.4;
  const orbitAngle = t * Math.PI * 2;

  // Orbs (drawn behind body)
  const orbCenterY = torsoTop + 5;
  drawOrbits(g, CX, orbCenterY, orbitAngle, 11, pulse);

  drawShadow(g, CX, GY);
  drawRobe(g, CX, robeTop, robeH, 0, sway * 2);
  drawShoes(g, CX, GY, 0, 0);
  drawTorso(g, CX, torsoTop, 6, 0);

  // Right arm — fire hand raised slightly
  const rPulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const rHandX = CX + 9;
  const rHandY = torsoTop + 3 - rPulse * 1.5;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawFireHand(g, rHandX, rHandY, 0.7, rPulse * 0.8);

  // Left arm — lightning hand raised slightly, out of phase
  const lPulse = Math.sin(t * Math.PI * 2 + Math.PI) * 0.5 + 0.5;
  const lHandX = CX - 9;
  const lHandY = torsoTop + 3 - lPulse * 1.5;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
  drawLightningHand(g, lHandX, lHandY, 0.7, lPulse * 0.8, frame);

  drawFace(g, CX, faceY);
  drawBeard(g, CX, faceY + 3.5, 9, 0, sway * 0.4);
  drawHat(g, CX, hatBase, 0, 1 + breathe * 0.3, twinkle);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.5;
  const stanceL = Math.round(stride * 2.5);
  const stanceR = Math.round(-stride * 2.5);
  const robeH = 18;
  const robeTop = GY - robeH - 3 - Math.round(bob * 0.4);
  const torsoTop = robeTop - 5;
  const faceY = torsoTop - 4;
  const hatBase = faceY - 5;
  const sway = stride * 2;
  const orbitAngle = t * Math.PI * 2 * 1.5; // faster orbit when moving

  // Mana trail behind (fire + lightning wisps)
  for (let i = 0; i < 3; i++) {
    const trailX = CX - 5 - i * 4;
    const trailY = torsoTop + 8 + i * 1.5;
    const ta = 0.08 - i * 0.02;
    g.circle(trailX, trailY, 1.5 - i * 0.3).fill({ color: COL_FIRE_MID, alpha: ta });
    g.circle(trailX, trailY - 2, 1.5 - i * 0.3).fill({ color: COL_LIGHT_MID, alpha: ta });
  }

  const orbCenterY = torsoTop + 5;
  drawOrbits(g, CX, orbCenterY, orbitAngle, 11, 0.5);

  drawShadow(g, CX, GY, 13 + Math.abs(stride) * 2);
  drawRobe(g, CX, robeTop, robeH, stride * 0.4, sway * 1.8);
  drawShoes(g, CX, GY, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, 6, stride * 0.3);

  // Arms swing with movement
  const rArmSwing = stride * 2;
  const rHandX = CX + 9 + rArmSwing * 0.4;
  const rHandY = torsoTop + 4 - Math.abs(stride) * 0.5;
  drawArm(g, CX + 5 + stride * 0.3, torsoTop + 3, rHandX, rHandY);
  drawFireHand(g, rHandX, rHandY, 0.6, 0.5);

  const lArmSwing = -stride * 2;
  const lHandX = CX - 9 + lArmSwing * 0.4;
  const lHandY = torsoTop + 4 - Math.abs(stride) * 0.5;
  drawArm(g, CX - 5 + stride * 0.3, torsoTop + 3, lHandX, lHandY);
  drawLightningHand(g, lHandX, lHandY, 0.6, 0.5, frame);

  drawFace(g, CX, faceY, stride * 0.3);
  drawBeard(g, CX, faceY + 3.5, 9, stride * 0.3, -stride * 0.8);
  drawHat(g, CX, hatBase, stride * 0.3, 1.5 - stride * 0.4, 0.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Wind up → thrust both hands forward → elements spiral together → recover
  const phases = [0, 0.12, 0.25, 0.42, 0.58, 0.72, 0.86, 1.0];
  const t = phases[Math.min(frame, 7)];

  const robeH = 18;
  const robeTop = GY - robeH - 3;
  const torsoTop = robeTop - 5;
  const faceY = torsoTop - 4;
  const hatBase = faceY - 5;

  // Lean into attack
  const lean = t < 0.6 ? t * 1.8 : (1 - t) * 4.5;
  const thrust = t >= 0.25 && t <= 0.75 ? clamp01((t - 0.25) / 0.2) : 0;

  drawShadow(g, CX + lean * 0.6, GY, 13 + lean, 3.5);
  drawRobe(g, CX, robeTop, robeH, lean * 0.4, -lean * 0.5);
  drawShoes(g, CX, GY, -1, Math.round(thrust * 3));
  drawTorso(g, CX, torsoTop, 6, lean * 0.5);

  // Both hands thrust forward
  const raiseFactor = t < 0.42 ? t / 0.42 : t < 0.75 ? 1.0 : 1 - (t - 0.75) / 0.25;
  const rHandX = CX + 8 + thrust * 5;
  const rHandY = torsoTop + 2 - raiseFactor * 4;
  drawArm(g, CX + 5 + lean * 0.4, torsoTop + 3, rHandX, rHandY);
  drawFireHand(g, rHandX, rHandY, 0.5 + thrust * 1.2, thrust * 1.5);

  const lHandX = CX - 4 + thrust * 7;
  const lHandY = torsoTop + 2 - raiseFactor * 4;
  drawArm(g, CX - 5 + lean * 0.4, torsoTop + 3, lHandX, lHandY);
  drawLightningHand(g, lHandX, lHandY, 0.5 + thrust * 1.2, thrust * 1.5, frame);

  // Spiral combining beam when thrusting — fire+lightning twist together
  if (thrust > 0.2) {
    const beamAlpha = clamp01(thrust * 1.2) * 0.8;
    const bx1 = lerp(rHandX, lHandX, 0.5);
    const by1 = lerp(rHandY, lHandY, 0.5);
    const targetX = bx1 + 12;
    const targetY = by1 - 8;
    // Fire spiral strand
    g.moveTo(rHandX, rHandY)
      .bezierCurveTo(rHandX + 5, rHandY - 3, targetX - 3, targetY + 2, targetX, targetY)
      .stroke({ color: COL_FIRE_MID, width: 1.5, alpha: beamAlpha });
    // Lightning spiral strand
    g.moveTo(lHandX, lHandY)
      .bezierCurveTo(lHandX + 3, lHandY - 5, targetX - 2, targetY + 4, targetX, targetY)
      .stroke({ color: COL_LIGHT_MID, width: 1.5, alpha: beamAlpha });
    // Impact glow
    if (thrust > 0.6) {
      const impactAlpha = (thrust - 0.6) / 0.4 * 0.7;
      g.circle(targetX, targetY, 4 + thrust * 3).fill({ color: COL_FIRE_CORE, alpha: impactAlpha * 0.3 });
      g.circle(targetX, targetY, 3 + thrust * 2).fill({ color: COL_LIGHT_CORE, alpha: impactAlpha * 0.3 });
      g.circle(targetX, targetY, 1.5).fill({ color: 0xffffff, alpha: impactAlpha * 0.8 });
    }
  }

  drawFace(g, CX, faceY, lean * 0.3, thrust > 0.3);
  drawBeard(g, CX, faceY + 3.5, 9, lean * 0.3, -lean * 0.5);
  drawHat(g, CX, hatBase, lean * 0.3, 1 + lean * 0.2, thrust);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);
  const vortexSize = intensity * 14;

  const robeH = 18;
  const lift = pulse * 1.5;
  const robeTop = GY - robeH - 3 - lift * 0.5;
  const torsoTop = robeTop - 5;
  const faceY = torsoTop - 4;
  const hatBase = faceY - 5;

  // Massive dual vortex above — fire (right) and lightning (left) spiraling
  if (intensity > 0.1) {
    for (let ring = 0; ring < 5; ring++) {
      const ringRadius = (vortexSize - ring * 2) * 0.5;
      if (ringRadius <= 0) continue;
      const ringAngle = t * Math.PI * 4 + ring * (Math.PI / 2.5);
      const vortexCX = CX - 4;
      const vortexCY = torsoTop - vortexSize * 0.6 - ring * 1.2;
      // Fire half
      for (let p = 0; p < 4; p++) {
        const pAngle = ringAngle + p * (Math.PI / 2);
        if (pAngle % (Math.PI * 2) < Math.PI) {
          const px = vortexCX + Math.cos(pAngle) * ringRadius;
          const py = vortexCY + Math.sin(pAngle) * ringRadius * 0.5;
          g.circle(px, py, 1.5 - ring * 0.2).fill({ color: COL_FIRE_MID, alpha: 0.25 + pulse * 0.15 });
        } else {
          const px = vortexCX + Math.cos(pAngle) * ringRadius;
          const py = vortexCY + Math.sin(pAngle) * ringRadius * 0.5;
          g.circle(px, py, 1.5 - ring * 0.2).fill({ color: COL_LIGHT_MID, alpha: 0.25 + pulse * 0.15 });
        }
      }
    }
    // Vortex eye — white-hot center
    const vortexCX = CX - 4;
    const vortexCY = torsoTop - vortexSize * 0.6;
    g.circle(vortexCX, vortexCY, 3 + pulse * 2).fill({ color: 0xffffff, alpha: 0.1 + pulse * 0.2 });
    g.circle(vortexCX, vortexCY, 1.5 + pulse).fill({ color: 0xffffff, alpha: 0.5 + pulse * 0.3 });
    // Fire outer ring
    g.circle(vortexCX, vortexCY, vortexSize * 0.5 + pulse * 2)
      .stroke({ color: COL_FIRE_CORE, width: 1.5, alpha: 0.2 + pulse * 0.1 });
    // Lightning outer ring
    g.circle(vortexCX, vortexCY, vortexSize * 0.45 + pulse * 1.5)
      .stroke({ color: COL_LIGHT_CORE, width: 1.5, alpha: 0.2 + pulse * 0.1 });
  }

  // Orbs expand and speed up during cast
  const orbRadius = 11 + intensity * 3;
  const orbitAngle = t * Math.PI * 4;
  drawOrbits(g, CX, torsoTop + 5, orbitAngle, orbRadius, pulse * 0.8);

  drawShadow(g, CX, GY, 13, 3.5, 0.3 + intensity * 0.15);
  drawRobe(g, CX, robeTop, robeH + lift, 0, pulse * 0.8);
  drawShoes(g, CX, GY, -2, 2);
  drawTorso(g, CX, torsoTop, 6, 0);

  // Both arms raised — channeling the vortex
  const raise = intensity * 8 + pulse * 1.5;
  const rHandX = CX + 5;
  const rHandY = torsoTop - raise;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawFireHand(g, rHandX, rHandY, 0.7 + intensity * 0.5, pulse * 1.2);

  const lHandX = CX - 5;
  const lHandY = torsoTop - raise;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
  drawLightningHand(g, lHandX, lHandY, 0.7 + intensity * 0.5, pulse * 1.2, frame);

  drawFace(g, CX, faceY, 0, true);
  drawBeard(g, CX, faceY + 3.5, 9, 0, pulse * 0.5);
  drawHat(g, CX, hatBase, 0, 1 + pulse * 0.8, pulse);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const robeH = 18;
  const fallX = t * 8;
  const dropY = t * t * 10;
  const robeTop = GY - robeH - 3 + dropY;
  const torsoTop = robeTop - 5;
  const faceY = torsoTop - 4;
  const hatBase = faceY - 5;

  // Explosion of dual elements outward
  if (t < 0.6) {
    const explodeRadius = t * 22;
    const explodeAlpha = (1 - t / 0.6) * 0.6;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ex = CX + Math.cos(angle) * explodeRadius;
      const ey = (torsoTop + 5) + Math.sin(angle) * explodeRadius * 0.5;
      const col = i % 2 === 0 ? COL_FIRE_MID : COL_LIGHT_MID;
      g.circle(ex, ey, 2 - t * 2).fill({ color: col, alpha: explodeAlpha });
      g.moveTo(CX, torsoTop + 5).lineTo(ex, ey)
        .stroke({ color: col, width: 0.6, alpha: explodeAlpha * 0.5 });
    }
  }

  drawShadow(g, CX + fallX * 0.4, GY, 13 + t * 4, 3.5, 0.28 * (1 - t * 0.5));

  // Robes collapse — empty after elements leave
  if (t < 0.85) {
    const robeAlpha = 1 - t * 0.6;
    g.moveTo(CX + fallX * 0.3 - 7, robeTop + dropY * 0.3)
      .lineTo(CX + fallX * 0.3 + 7, robeTop + dropY * 0.3)
      .lineTo(CX + fallX * 0.3 + 10 + t * 3, robeTop + dropY * 0.3 + robeH * (1 - t * 0.25))
      .lineTo(CX + fallX * 0.3 - 9 + t * 2, robeTop + dropY * 0.3 + robeH * (1 - t * 0.25))
      .closePath()
      .fill({ color: COL_ROBE, alpha: robeAlpha });
  }

  const squash = Math.round(t * 3);
  drawShoes(g, CX + fallX * 0.2, GY, t * 2.5, -t * 1, squash);

  if (t < 0.7) {
    drawTorso(g, CX + fallX * 0.4, torsoTop + dropY * 0.4, 6 * (1 - t * 0.2), t * 3);
  }

  if (t < 0.75) {
    drawFace(g, CX + fallX * 0.4, faceY + dropY * 0.35, t * 3.5);
    drawBeard(g, CX + fallX * 0.4, faceY + 3.5 + dropY * 0.35, 9 * (1 - t * 0.3), t * 3.5, t * 3);
    drawHat(g, CX + fallX * 0.4, hatBase + dropY * 0.2, t * 5, 2 + t * 6, 0);
  } else {
    // Hat fallen to ground
    g.ellipse(CX + 14, GY - 4, 6, 2.5).fill({ color: COL_HAT });
    g.moveTo(CX + 11, GY - 4).lineTo(CX + 15, GY - 11).lineTo(CX + 17, GY - 4)
      .fill({ color: COL_HAT });
  }

  // Scattered orbs fizzing out
  if (t < 0.5) {
    const scatterT = t / 0.5;
    const fireOrbX = CX + 12 + scatterT * 8;
    const fireOrbY = torsoTop + 2 + scatterT * 5;
    drawFireOrb(g, fireOrbX, fireOrbY, 0.8 * (1 - scatterT), 0);
    const lightOrbX = CX - 10 - scatterT * 6;
    const lightOrbY = torsoTop + dropY * 0.3 - scatterT * 4;
    drawLightningOrb(g, lightOrbX, lightOrbY, 0.8 * (1 - scatterT), 0);
  }

  // Arm flopped at side late in animation
  if (t > 0.4) {
    drawArm(
      g,
      CX + fallX * 0.4 + 4,
      torsoTop + dropY * 0.4 + 3,
      CX + fallX * 0.4 + 10,
      torsoTop + dropY * 0.4 + 8,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all SpellWeaver sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSpellWeaverFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
