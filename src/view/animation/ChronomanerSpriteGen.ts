// Procedural sprite generator for the Chronomaner unit type.
//
// Draws a time mage at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Deep purple/blue flowing robes with clock motifs
//   • Hourglass-topped staff in right hand
//   • Swirling time particles in purple/cyan
//   • Temporal distortion rings on cast animation
//   • Clock gear patterns on robe hems
//   • Mysterious ethereal glowing eyes
//   • Wispy, otherworldly presence

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — deep purple & temporal cyan
const COL_ROBE = 0x2a1848; // deep purple robe
const COL_ROBE_HI = 0x3e2860;
const COL_ROBE_DK = 0x1a1030;

const COL_ROBE_INNER = 0x181030; // darker inner robe
const COL_ROBE_TRIM = 0x4488aa; // cyan trim

const COL_SKIN = 0xc8b8a8; // pale, aged skin
const COL_SKIN_DK = 0xb0a090;

const COL_EYE = 0x66ddff; // glowing cyan eyes
const COL_EYE_GLOW = 0x88eeff;

const COL_STAFF_WOOD = 0x3a2828; // dark polished wood
const COL_STAFF_WOOD_HI = 0x4e3838;
const COL_STAFF_METAL = 0x8888aa; // arcane metal fittings

const COL_HOURGLASS_FRAME = 0x8888aa;
const COL_HOURGLASS_GLASS = 0x6688cc;
const COL_HOURGLASS_SAND = 0xd4a840;

const COL_GEAR = 0x607088; // clock gear motifs
const COL_GEAR_HI = 0x8090a8;

const COL_TIME_PARTICLE = 0x8844cc; // purple time particles
const COL_TIME_CYAN = 0x44ccee; // cyan time sparks
const COL_DISTORTION = 0x6644aa; // temporal distortion ring

const COL_BOOT = 0x1a1428;

const COL_SASH = 0x4466aa;
const COL_SASH_BUCKLE = 0x8888aa;

const COL_SHADOW = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 10,
  h = 3,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bh = 4 - squash;
  // Pointed mystic boots
  g.moveTo(cx - 7 + stanceL, gy)
    .lineTo(cx - 7 + stanceL, gy - bh)
    .lineTo(cx - 3 + stanceL, gy - bh)
    .lineTo(cx - 2 + stanceL, gy)
    .closePath()
    .fill({ color: COL_BOOT });
  g.moveTo(cx + 2 + stanceR, gy)
    .lineTo(cx + 2 + stanceR, gy - bh)
    .lineTo(cx + 6 + stanceR, gy - bh)
    .lineTo(cx + 7 + stanceR, gy)
    .closePath()
    .fill({ color: COL_BOOT });
}

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

function drawRobes(
  g: Graphics,
  cx: number,
  robeTop: number,
  robeH: number,
  wave: number,
  flare = 0,
): void {
  const rw = 14 + flare * 3;
  const x = cx - rw / 2;
  // Main robe body — flowing
  g.moveTo(x + 3, robeTop)
    .lineTo(x + rw - 3, robeTop)
    .lineTo(x + rw + wave * 1.5 + flare * 2, robeTop + robeH)
    .lineTo(x - wave + flare * -2, robeTop + robeH)
    .closePath()
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.5 });
  // Inner robe panel
  g.moveTo(cx - 2, robeTop + 2)
    .lineTo(cx + 2, robeTop + 2)
    .lineTo(cx + 3 + wave * 0.3, robeTop + robeH - 1)
    .lineTo(cx - 3 + wave * 0.3, robeTop + robeH - 1)
    .closePath()
    .fill({ color: COL_ROBE_INNER, alpha: 0.6 });
  // Cyan trim lines at hem
  g.moveTo(x - wave + flare * -2, robeTop + robeH)
    .lineTo(x + rw + wave * 1.5 + flare * 2, robeTop + robeH)
    .stroke({ color: COL_ROBE_TRIM, width: 1 });
  g.moveTo(x - wave * 0.8 + flare * -1.5, robeTop + robeH - 2)
    .lineTo(x + rw + wave * 1.2 + flare * 1.5, robeTop + robeH - 2)
    .stroke({ color: COL_ROBE_TRIM, width: 0.4, alpha: 0.5 });
  // Gear motifs on robe
  for (let i = 0; i < 3; i++) {
    const gx = x + 3 + i * 5 + wave * 0.2;
    const gy = robeTop + robeH - 6 + i * 0.5;
    drawGearMotif(g, gx, gy, 2 - i * 0.3);
  }
}

function drawGearMotif(
  g: Graphics,
  x: number,
  y: number,
  r: number,
): void {
  // Small clock gear decorative element
  g.circle(x, y, r).stroke({ color: COL_GEAR, width: 0.5, alpha: 0.5 });
  g.circle(x, y, r * 0.4).fill({ color: COL_GEAR_HI, alpha: 0.3 });
  // Teeth
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      .lineTo(x + Math.cos(a) * (r + 0.8), y + Math.sin(a) * (r + 0.8))
      .stroke({ color: COL_GEAR, width: 0.4, alpha: 0.4 });
  }
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 11;
  const x = cx - tw / 2 + tilt;
  // Upper robe body
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_DK, width: 0.4 });
  // Collar — high, mystical
  g.moveTo(x + 2, top)
    .lineTo(cx + tilt, top - 2)
    .lineTo(x + tw - 2, top)
    .stroke({ color: COL_ROBE_HI, width: 1 });
  // Clock emblem on chest
  g.circle(cx + tilt, top + h * 0.4, 2.5).stroke({ color: COL_GEAR, width: 0.6 });
  // Clock hands
  g.moveTo(cx + tilt, top + h * 0.4)
    .lineTo(cx + tilt + 1.2, top + h * 0.4 - 1)
    .stroke({ color: COL_GEAR_HI, width: 0.4 });
  g.moveTo(cx + tilt, top + h * 0.4)
    .lineTo(cx + tilt - 0.5, top + h * 0.4 + 1.5)
    .stroke({ color: COL_GEAR_HI, width: 0.3 });
  // Sash belt
  g.rect(x, top + h - 3, tw, 2).fill({ color: COL_SASH });
  g.circle(cx + tilt, top + h - 2, 1).fill({ color: COL_SASH_BUCKLE });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  eyeGlow = 0,
): void {
  const hw = 10;
  const hh = 10;
  const x = cx - hw / 2 + tilt;
  // Hood — deep pointed cowl
  g.moveTo(x + 1, top + hh)
    .lineTo(x - 1, top + hh * 0.3)
    .lineTo(x + hw * 0.3, top - 1)
    .lineTo(x + hw * 0.5, top - 2) // peak
    .lineTo(x + hw * 0.7, top - 1)
    .lineTo(x + hw + 1, top + hh * 0.3)
    .lineTo(x + hw - 1, top + hh)
    .closePath()
    .fill({ color: COL_ROBE_DK })
    .stroke({ color: COL_ROBE_DK, width: 0.4 });
  // Hood inner darkness
  g.roundRect(x + 1.5, top + hh * 0.3, hw - 3, hh * 0.55, 1).fill({
    color: 0x080810,
  });
  // Face — barely visible, aged
  g.roundRect(x + 2.5, top + hh * 0.4, hw - 5, hh * 0.35, 1).fill({
    color: COL_SKIN,
    alpha: 0.5,
  });
  // Glowing cyan eyes
  const eyeY = top + hh * 0.48;
  const baseAlpha = 0.6 + eyeGlow * 0.4;
  g.circle(cx - 2 + tilt, eyeY, 1.2).fill({ color: COL_EYE, alpha: baseAlpha });
  g.circle(cx + 2 + tilt, eyeY, 1.2).fill({ color: COL_EYE, alpha: baseAlpha });
  // Eye glow halo
  g.circle(cx - 2 + tilt, eyeY, 2.5).fill({ color: COL_EYE_GLOW, alpha: baseAlpha * 0.15 });
  g.circle(cx + 2 + tilt, eyeY, 2.5).fill({ color: COL_EYE_GLOW, alpha: baseAlpha * 0.15 });
  // Wispy beard
  g.moveTo(cx - 1 + tilt, top + hh * 0.75)
    .quadraticCurveTo(cx + tilt, top + hh + 2, cx + 1 + tilt, top + hh * 0.75)
    .stroke({ color: COL_SKIN_DK, width: 0.5, alpha: 0.4 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Robe sleeve — wide
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE, width: 3.5 });
  // Sleeve trim
  g.circle(ex, ey, 2.5).fill({ color: COL_ROBE_DK, alpha: 0.5 });
  // Bony hand
  g.circle(ex, ey, 1.5).fill({ color: COL_SKIN_DK });
}

function drawHourglassStaff(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  staffLen = 18,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * staffLen;
  const tipY = by - cos * staffLen;
  // Staff shaft — dark polished wood
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_STAFF_WOOD, width: 2 });
  // Wood highlight
  g.moveTo(bx + cos * 0.3, by + sin * 0.3)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_STAFF_WOOD_HI, width: 0.5, alpha: 0.5 });
  // Metal fittings
  const m1x = lerp(bx, tipX, 0.3);
  const m1y = lerp(by, tipY, 0.3);
  g.circle(m1x, m1y, 1.5).fill({ color: COL_STAFF_METAL, alpha: 0.5 });
  const m2x = lerp(bx, tipX, 0.6);
  const m2y = lerp(by, tipY, 0.6);
  g.circle(m2x, m2y, 1.2).fill({ color: COL_STAFF_METAL, alpha: 0.5 });
  // Hourglass at top
  const hgX = tipX;
  const hgY = tipY;
  // Frame
  g.rect(hgX - 2.5, hgY - 4, 5, 1).fill({ color: COL_HOURGLASS_FRAME });
  g.rect(hgX - 2.5, hgY + 3, 5, 1).fill({ color: COL_HOURGLASS_FRAME });
  // Glass bulbs
  g.moveTo(hgX - 2, hgY - 3)
    .lineTo(hgX + 2, hgY - 3)
    .lineTo(hgX + 0.5, hgY)
    .lineTo(hgX - 0.5, hgY)
    .closePath()
    .fill({ color: COL_HOURGLASS_GLASS, alpha: 0.5 });
  g.moveTo(hgX - 2, hgY + 3)
    .lineTo(hgX + 2, hgY + 3)
    .lineTo(hgX + 0.5, hgY)
    .lineTo(hgX - 0.5, hgY)
    .closePath()
    .fill({ color: COL_HOURGLASS_GLASS, alpha: 0.5 });
  // Sand
  g.moveTo(hgX - 1, hgY - 2)
    .lineTo(hgX + 1, hgY - 2)
    .lineTo(hgX, hgY - 0.5)
    .closePath()
    .fill({ color: COL_HOURGLASS_SAND, alpha: 0.6 });
  g.rect(hgX - 1, hgY + 1, 2, 2).fill({ color: COL_HOURGLASS_SAND, alpha: 0.4 });
  // Butt end of staff
  const buttX = bx - sin * 3;
  const buttY = by + cos * 3;
  g.circle(buttX, buttY, 1).fill({ color: COL_STAFF_METAL });
}

function drawTimeParticles(
  g: Graphics,
  cx: number,
  cy: number,
  t: number,
  intensity: number,
  count = 5,
): void {
  for (let i = 0; i < count; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI * 2 / count);
    const dist = 6 + intensity * 7 + i * 1.5;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist * 0.5;
    const pAlpha = clamp01(0.15 + intensity * 0.2 - i * 0.02);
    const color = i % 2 === 0 ? COL_TIME_PARTICLE : COL_TIME_CYAN;
    g.circle(px, py, 1 + intensity * 0.3).fill({ color, alpha: pAlpha });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const hover = Math.sin(t * Math.PI * 2) * 1; // slight levitation bob

  const legH = 6;
  const torsoH = 10;
  const legTop = GY - 4 - legH - hover;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 11;

  const robeWave = Math.sin(t * Math.PI * 2) * 0.4;

  // Ambient time particles
  drawTimeParticles(g, CX, torsoTop + 4, t, 0.3, 4);

  drawShadow(g, CX, GY, 10 - hover * 0.5, 3, 0.3 - hover * 0.02);
  drawRobes(g, CX, torsoTop + 2, legH + torsoH - 2, robeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, 0);

  // Right arm — hourglass staff
  const rHandX = CX + 9;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawHourglassStaff(g, rHandX, rHandY, 0.1 + breathe * 0.02, 17);

  // Left arm at side
  drawArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop + 8);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const glide = Math.sin(t * Math.PI * 2);
  const hover = 1.5 + Math.sin(t * Math.PI * 2) * 0.8; // floating movement

  const legH = 6;
  const torsoH = 10;
  const legTop = GY - 4 - legH - hover;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  const robeWave = -glide * 1.5;

  // Trailing time particles
  drawTimeParticles(g, CX - glide * 3, torsoTop + 6, t, 0.4, 5);

  drawShadow(g, CX, GY, 10 - hover * 0.3, 3, 0.25);
  drawRobes(g, CX, torsoTop + 2, legH + torsoH - 2, robeWave, Math.abs(glide) * 0.3);
  drawBoots(g, CX, GY - hover, glide * 1.5, -glide * 1.5);
  drawLegs(g, CX, legTop, legH, glide * 1.5, -glide * 1.5);
  drawTorso(g, CX, torsoTop, torsoH, glide * 0.3);
  drawHead(g, CX, headTop, glide * 0.2, 0);

  // Staff sways
  const rHandX = CX + 9 + glide * 0.5;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawHourglassStaff(g, rHandX, rHandY, 0.1 + glide * 0.06, 17);

  drawArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop + 8);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 6;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  const lean = t < 0.55 ? t * 2 : (1 - t) * 3;

  drawShadow(g, CX + lean * 0.3, GY);

  // Time distortion burst on attack
  if (t >= 0.3 && t <= 0.7) {
    const burstAlpha = clamp01(1 - Math.abs(t - 0.5) / 0.2) * 0.4;
    const burstR = 3 + (t - 0.3) * 25;
    g.circle(CX + 10, torsoTop + 4, burstR).stroke({
      color: COL_DISTORTION,
      width: 1.5,
      alpha: burstAlpha,
    });
    g.circle(CX + 10, torsoTop + 4, burstR * 0.6).stroke({
      color: COL_TIME_CYAN,
      width: 1,
      alpha: burstAlpha * 0.7,
    });
  }

  drawRobes(g, CX, torsoTop + 2, legH + torsoH - 2, -lean * 0.4);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHead(g, CX, headTop, lean * 0.4, t);

  // Staff thrust forward
  let staffAngle: number;
  if (t < 0.25) {
    staffAngle = lerp(0.1, -0.5, t / 0.25);
  } else if (t < 0.55) {
    staffAngle = lerp(-0.5, 1.2, (t - 0.25) / 0.3);
  } else {
    staffAngle = lerp(1.2, 0.1, (t - 0.55) / 0.45);
  }

  const staffReach = t < 0.55 ? t * 3 : (1 - t) * 5;
  const rHandX = CX + 8 + lean + staffReach;
  const rHandY = torsoTop + 3;
  drawArm(g, CX + 6 + lean, torsoTop + 3, rHandX, rHandY);
  drawHourglassStaff(g, rHandX, rHandY, staffAngle, 17);

  // Left hand channeling gesture
  const lReach = t > 0.2 && t < 0.7 ? 3 : 0;
  const lHandX = CX - 5 + lean * 0.5 + lReach;
  const lHandY = torsoTop + 5;
  drawArm(g, CX - 6 + lean, torsoTop + 3, lHandX, lHandY);

  // Time particles at impact
  if (t >= 0.35 && t <= 0.65) {
    drawTimeParticles(g, CX + 12, torsoTop + 4, t * 3, 0.6, 6);
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 6;
  const torsoH = 10;
  const hover = intensity * 2; // levitate during cast
  const legTop = GY - 4 - legH - hover;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  // Temporal distortion rings — signature effect
  for (let i = 0; i < 5; i++) {
    const ringPhase = t * 2 + i * 0.4;
    const ringR = 4 + (ringPhase % 1) * 18;
    const ringAlpha = clamp01(0.35 - (ringPhase % 1) * 0.35) + pulse * 0.05;
    const ringTilt = 0.3 + i * 0.1;
    // Elliptical ring to simulate 3D rotation
    g.ellipse(CX, torsoTop + 4, ringR, ringR * ringTilt).stroke({
      color: i % 2 === 0 ? COL_DISTORTION : COL_TIME_CYAN,
      width: 1 + pulse * 0.5,
      alpha: ringAlpha,
    });
  }

  // Dense time particle cloud
  drawTimeParticles(g, CX, torsoTop + 2, t * 2, intensity, 8);

  drawShadow(g, CX, GY, 10 - hover * 0.4, 3, 0.25);
  drawRobes(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.6, intensity * 0.5);
  drawBoots(g, CX, GY - hover, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, intensity);

  // Staff raised — channeling temporal energy
  const raise = intensity * 5;
  const rHandX = CX + 6;
  const rHandY = torsoTop + 1 - raise;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawHourglassStaff(g, rHandX, rHandY, -0.3 + pulse * 0.1, 17);

  // Left hand extended — casting gesture
  const lHandX = CX - 7;
  const lHandY = torsoTop + 3 - raise * 0.5;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);

  // Hourglass glow intensifies
  const glowAlpha = 0.15 + intensity * 0.4 + pulse * 0.15;
  g.circle(rHandX, rHandY - 17, 4 + pulse * 2).fill({ color: COL_TIME_CYAN, alpha: glowAlpha * 0.2 });
  g.circle(rHandX, rHandY - 17, 2 + pulse).fill({ color: COL_EYE_GLOW, alpha: glowAlpha * 0.5 });

  // Casting hand energy
  g.circle(lHandX, lHandY, 2 + pulse).fill({ color: COL_DISTORTION, alpha: glowAlpha * 0.3 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 6;
  const torsoH = 10;
  const legTop = GY - 4 - legH;

  const fallX = t * 8;
  const dropY = t * t * 9;
  const fallAngle = t * 0.7;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 11;

  // Time particles scatter and fade
  if (t < 0.8) {
    for (let i = 0; i < 5; i++) {
      const angle = t * Math.PI * 5 + i * (Math.PI * 2 / 5);
      const dist = 5 + t * 15;
      const px = CX + Math.cos(angle) * dist;
      const py = torsoTop + Math.sin(angle) * dist * 0.5;
      const pAlpha = clamp01(0.3 * (1 - t));
      g.circle(px, py, 1).fill({ color: COL_TIME_PARTICLE, alpha: pAlpha });
    }
  }

  drawShadow(g, CX + fallX * 0.3, GY, 10 + t * 3, 3, 0.3 * (1 - t * 0.5));

  // Robe crumples
  if (t < 0.85) {
    drawRobes(
      g,
      CX + fallX * 0.2,
      torsoTop + 2,
      (legH + torsoH - 2) * (1 - t * 0.25),
      t * 2,
      t * 0.5,
    );
  }

  const squash = Math.round(t * 2.5);
  drawBoots(g, CX + fallX * 0.1, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.4, legH - squash, t * 2, -t);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.12), fallAngle * 3);
  if (t < 0.85) {
    drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.3, fallAngle * 3.5, 1 - t);
  }

  // Staff falls away
  if (t < 0.7) {
    const sbx = CX + 10 + t * 12;
    const sby = torsoTop + torsoH * 0.3 + t * 6;
    drawHourglassStaff(g, sbx, sby, 0.2 + t * 3.5, 17 * (1 - t * 0.2));
  }

  // Arm flopped
  if (t > 0.45) {
    drawArm(
      g,
      CX + fallX * 0.4 + 4,
      torsoTop + 3,
      CX + fallX * 0.4 + 10,
      torsoTop + torsoH - 1,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all Chronomaner sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateChromanerFrames(renderer: Renderer): RenderTexture[] {
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
