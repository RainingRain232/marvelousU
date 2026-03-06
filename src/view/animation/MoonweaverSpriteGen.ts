// Procedural sprite generator for the Moonweaver unit type.
//
// Draws an elven arcane mage channeling moonlight at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Flowing silver/blue layered robes with lunar trim
//   • Pale elven features, long white hair, pointed ears
//   • Crescent moon staff with glowing crystal tip
//   • Silver-blue arcane particles orbiting the figure
//   • Ethereal luminous quality — gentle inner glow
//
// Animation:
//   IDLE  — staff upright, particles orbit, hair drifts
//   MOVE  — gliding walk, robes trail, particles follow
//   ATTACK— staff thrust, silver-blue beam fires forward
//   CAST  — raises staff, crescent moon manifests above, distortion waves
//   DIE   — dissolves into cascade of moonlight particles, staff dims and falls

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — silver, lunar blue, elven pale
const COL_SKIN = 0xe8e0f0;       // very pale elven skin
const COL_SKIN_DK = 0xc8c0d8;

const COL_ROBE_BASE = 0x3a4a7a;  // deep midnight blue robe
const COL_ROBE_MID = 0x4a5a9a;   // mid-tone blue
const COL_ROBE_LT = 0x6a7aba;    // highlight blue

const COL_SILVER = 0xc0ccdc;     // silver trim and accents
const COL_SILVER_HI = 0xe0ecfc;  // bright silver highlight

const COL_HAIR = 0xf0f0f8;       // white/silver hair
const COL_HAIR_HI = 0xffffff;
const COL_HAIR_DK = 0xb8b8cc;    // shadow in hair

const COL_EYE = 0x88ccff;        // silver-blue eyes
const COL_EYE_PUPIL = 0x2244aa;
const COL_EAR = 0xe0d8ec;

const COL_STAFF_WOOD = 0x6a5080; // dark purple-grey staff shaft
const COL_STAFF_DK = 0x4a3060;
const COL_STAFF_HI = 0x9a80b8;

const COL_CRESCENT = 0xd0e0ff;   // crescent moon tip
const COL_CRESCENT_HI = 0xf0f8ff;
const COL_CRESCENT_GLOW = 0x88aaff;

const COL_CRYSTAL = 0xaaccff;    // crystal orb in crescent
const COL_CRYSTAL_CORE = 0xddeeff;

const COL_PARTICLE = 0x88aaff;   // orbiting particles
const COL_PARTICLE_HI = 0xccddff;
const COL_PARTICLE_CORE = 0xeef4ff;

const COL_BEAM = 0x99bbff;       // attack beam
const COL_BEAM_CORE = 0xddeeff;
const COL_BEAM_GLOW = 0x6688ff;

const COL_MOON_GLOW = 0xaabbff;  // lunar glow
const COL_MOON_CORE = 0xe8f0ff;
const COL_DISTORTION = 0x8899ff; // distortion wave color

const COL_BOOT = 0x2a3060;       // dark blue boots
const COL_BOOT_DK = 0x1a2040;
const COL_SASH = 0x7080c0;       // waist sash

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
  w = 8,
  h = 2,
  alpha = 0.2,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  g.roundRect(cx - 5 + stanceL, gy - 4, 4, 4, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.roundRect(cx + 1 + stanceR, gy - 4, 4, 4, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  // Silver pointed toe tip
  g.moveTo(cx - 5 + stanceL, gy)
    .lineTo(cx - 7 + stanceL, gy - 1)
    .stroke({ color: COL_SILVER, width: 0.6, alpha: 0.5 });
  g.moveTo(cx + 5 + stanceR, gy)
    .lineTo(cx + 7 + stanceR, gy - 1)
    .stroke({ color: COL_SILVER, width: 0.6, alpha: 0.5 });
}

function drawRobeBottom(
  g: Graphics,
  cx: number,
  gy: number,
  sway: number,
  trailAmt: number,
): void {
  // Flowing robe skirt — wider than body, trails behind
  const rw = 14;
  const rh = 12;
  const rx = cx - rw / 2 + sway;
  g.roundRect(rx, gy - rh, rw, rh, 2)
    .fill({ color: COL_ROBE_BASE })
    .stroke({ color: COL_ROBE_MID, width: 0.4 });

  // Robe fold lines
  g.moveTo(rx + 2, gy - rh)
    .lineTo(rx + 1 + sway * 0.3, gy - 1)
    .stroke({ color: COL_ROBE_LT, width: 0.5, alpha: 0.25 });
  g.moveTo(rx + rw - 2, gy - rh)
    .lineTo(rx + rw - 1 + sway * 0.3, gy - 1)
    .stroke({ color: COL_ROBE_LT, width: 0.5, alpha: 0.25 });
  g.moveTo(cx + sway * 0.1, gy - rh)
    .lineTo(cx + sway * 0.2, gy - 1)
    .stroke({ color: COL_ROBE_MID, width: 0.4, alpha: 0.3 });

  // Silver lunar trim at hem
  g.moveTo(rx, gy - 1)
    .lineTo(rx + rw, gy - 1)
    .stroke({ color: COL_SILVER, width: 0.8 });
  // Small crescent motifs on hem
  for (let i = 0; i < 3; i++) {
    const mx = rx + 2 + i * 5;
    g.moveTo(mx, gy - 2.5)
      .quadraticCurveTo(mx + 1.5, gy - 3.5, mx + 3, gy - 2.5)
      .stroke({ color: COL_SILVER, width: 0.4, alpha: 0.55 });
  }

  // Trailing robe panel behind (billowing)
  if (trailAmt > 0.05) {
    const tx = cx + rw * 0.3 + sway * 0.6;
    g.moveTo(cx - 3 + sway, gy - rh + 1)
      .quadraticCurveTo(tx - trailAmt * 5, gy - rh * 0.5, tx, gy)
      .lineTo(cx + 2 + sway, gy - 1)
      .closePath()
      .fill({ color: COL_ROBE_MID, alpha: 0.35 });
  }
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 9;
  const x = cx - tw / 2 + tilt;
  // Fitted upper robe
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ROBE_MID })
    .stroke({ color: COL_ROBE_BASE, width: 0.4 });

  // Silver clasp at chest
  g.circle(cx + tilt, top + 3, 1.5).fill({ color: COL_SILVER });
  g.circle(cx + tilt, top + 3, 0.8).fill({ color: COL_SILVER_HI });

  // Silver shoulder epaulettes
  g.roundRect(x - 2, top, 2, 3, 0.5).fill({ color: COL_SILVER, alpha: 0.6 });
  g.roundRect(x + tw, top, 2, 3, 0.5).fill({ color: COL_SILVER, alpha: 0.6 });

  // Lunar rune on chest (simplified crescent)
  g.moveTo(cx + tilt - 1, top + 5)
    .quadraticCurveTo(cx + tilt - 2, top + 7, cx + tilt - 0.5, top + 8)
    .stroke({ color: COL_SILVER_HI, width: 0.4, alpha: 0.55 });

  // Waist sash
  g.rect(x, top + h - 2, tw, 2).fill({ color: COL_SASH });
  g.circle(cx + tilt, top + h - 1, 1.2).fill({ color: COL_SILVER, alpha: 0.6 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 7;
  const hh = 7;
  const x = cx - hw / 2 + tilt;

  // Face — slender elven, very pale
  g.roundRect(x + 0.5, top + 1.5, hw - 1, hh - 2, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  // Pointed ears
  g.moveTo(x, top + hh * 0.3)
    .lineTo(x - 2.5, top + hh * 0.1)
    .lineTo(x + 0.5, top + hh * 0.42)
    .closePath()
    .fill({ color: COL_EAR });
  g.moveTo(x + hw, top + hh * 0.3)
    .lineTo(x + hw + 2.5, top + hh * 0.1)
    .lineTo(x + hw - 0.5, top + hh * 0.42)
    .closePath()
    .fill({ color: COL_EAR });

  // Almond eyes — silver-blue, luminous
  const eyeY = top + hh * 0.42;
  g.ellipse(cx - 1.5 + tilt, eyeY, 1.3, 0.8).fill({ color: COL_EYE });
  g.ellipse(cx + 1.5 + tilt, eyeY, 1.3, 0.8).fill({ color: COL_EYE });
  // Pupils
  g.circle(cx - 1.5 + tilt, eyeY, 0.4).fill({ color: COL_EYE_PUPIL });
  g.circle(cx + 1.5 + tilt, eyeY, 0.4).fill({ color: COL_EYE_PUPIL });
  // Eye reflection shine
  g.circle(cx - 1.8 + tilt, eyeY - 0.4, 0.25).fill({ color: COL_SILVER_HI });
  g.circle(cx + 1.2 + tilt, eyeY - 0.4, 0.25).fill({ color: COL_SILVER_HI });

  // Fine arched brows
  g.moveTo(cx - 2.8 + tilt, eyeY - 1.4)
    .lineTo(cx - 0.6 + tilt, eyeY - 1.7)
    .stroke({ color: COL_HAIR_DK, width: 0.4 });
  g.moveTo(cx + 2.8 + tilt, eyeY - 1.4)
    .lineTo(cx + 0.6 + tilt, eyeY - 1.7)
    .stroke({ color: COL_HAIR_DK, width: 0.4 });

  // Small elegant mouth
  g.moveTo(cx - 0.8 + tilt, top + hh * 0.72)
    .lineTo(cx + 0.8 + tilt, top + hh * 0.72)
    .stroke({ color: COL_SKIN_DK, width: 0.4 });
}

function drawHair(
  g: Graphics,
  cx: number,
  top: number,
  wave: number,
  tilt = 0,
): void {
  const hw = 9;
  const x = cx - hw / 2 + tilt;

  // Hair top — smooth white cap
  g.roundRect(x, top, hw, 4, 2).fill({ color: COL_HAIR });
  // Highlight
  g.roundRect(x + 2, top + 0.5, 4, 1.5, 1).fill({ color: COL_HAIR_HI, alpha: 0.5 });

  // Long flowing strands — white hair drifting
  for (let i = 0; i < 6; i++) {
    const sx = x + 0.5 + i * 1.5;
    const ew = wave * (i % 2 === 0 ? 1 : -1) * 2;
    const col = i % 3 === 0 ? COL_HAIR_HI : i % 3 === 1 ? COL_HAIR : COL_HAIR_DK;
    g.moveTo(sx, top + 3)
      .quadraticCurveTo(sx + ew * 0.5, top + 8, sx + ew, top + 14)
      .stroke({ color: col, width: 1.1 });
  }
}

function drawStaff(
  g: Graphics,
  bx: number,
  by: number,
  topX: number,
  topY: number,
  glowPulse: number,
): void {
  // Staff shaft
  g.moveTo(bx, by).lineTo(topX, topY).stroke({ color: COL_STAFF_WOOD, width: 1.8 });
  // Highlight edge
  g.moveTo(bx - 0.4, by).lineTo(topX - 0.4, topY)
    .stroke({ color: COL_STAFF_HI, width: 0.5, alpha: 0.45 });

  // Staff rings
  const r1 = 0.3;
  const r1x = lerp(bx, topX, r1);
  const r1y = lerp(by, topY, r1);
  g.rect(r1x - 1.5, r1y - 0.8, 3, 1.4).fill({ color: COL_SILVER, alpha: 0.6 });

  // Crescent moon tip
  const ex = topX;
  const ey = topY;

  // Outer glow aura
  g.circle(ex, ey, 4.5 + glowPulse * 1.5).fill({
    color: COL_CRESCENT_GLOW,
    alpha: 0.08 + glowPulse * 0.1,
  });

  // Crescent shape — draw as two overlapping circles (moon-ring)
  g.circle(ex, ey, 4).fill({ color: COL_CRESCENT });
  g.circle(ex + 2.2, ey - 0.5, 3).fill({ color: COL_STAFF_WOOD }); // bite out to form crescent

  // Crystal orb in crescent cup
  g.circle(ex, ey + 1, 1.8).fill({ color: COL_CRYSTAL });
  g.circle(ex, ey + 1, 1).fill({ color: COL_CRYSTAL_CORE, alpha: 0.8 + glowPulse * 0.2 });

  // Crescent highlight
  g.moveTo(ex - 2.5, ey - 2.5)
    .quadraticCurveTo(ex - 4, ey, ex - 2.5, ey + 2.5)
    .stroke({ color: COL_CRESCENT_HI, width: 0.7, alpha: 0.6 });
}

function drawOrbitingParticles(
  g: Graphics,
  cx: number,
  cy: number,
  t: number,
  count: number,
  radius: number,
  alpha: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = t * Math.PI * 2 + (i / count) * Math.PI * 2;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius * 0.35; // elliptical orbit
    const pSize = 1.0 + (i % 3 === 0 ? 0.4 : 0);
    g.circle(px, py, pSize).fill({ color: COL_PARTICLE, alpha });
    if (i % 3 === 0) {
      g.circle(px, py, 0.5).fill({ color: COL_PARTICLE_CORE, alpha: alpha * 0.9 });
    }
    // Small trailing tail
    const prevAngle = angle - 0.4;
    const ppx = cx + Math.cos(prevAngle) * radius;
    const ppy = cy + Math.sin(prevAngle) * radius * 0.35;
    g.moveTo(ppx, ppy).lineTo(px, py)
      .stroke({ color: COL_PARTICLE, width: 0.5, alpha: alpha * 0.35 });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const hairWave = Math.sin(t * Math.PI * 2) * 1.2;
  const glowPulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY);

  // Ambient moonlight glow around figure
  g.circle(CX, torsoTop + torsoH * 0.4, 12).fill({
    color: COL_MOON_GLOW,
    alpha: 0.04 + glowPulse * 0.03,
  });

  drawBoots(g, CX, GY, 0, 0);
  drawRobeBottom(g, CX, GY - 4, 0, 0);
  drawHair(g, CX, headTop, hairWave);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Left arm — relaxed at side
  const lHandX = CX - 7;
  const lHandY = torsoTop + torsoH;
  g.moveTo(CX - 4, torsoTop + 3).lineTo(lHandX, lHandY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(lHandX, lHandY, 1.2).fill({ color: COL_SKIN });

  // Right arm — holds staff upright
  const staffBaseX = CX + 8;
  const staffBaseY = torsoTop + torsoH - 1;
  const staffTopX = CX + 8;
  const staffTopY = headTop - 10;
  g.moveTo(CX + 4, torsoTop + 3).lineTo(staffBaseX, staffBaseY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(staffBaseX, staffBaseY, 1.2).fill({ color: COL_SKIN });
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, glowPulse);

  // Orbiting particles around staff tip and body
  drawOrbitingParticles(g, staffTopX, staffTopY + 3, t, 4, 5, 0.45 + glowPulse * 0.25);
  drawOrbitingParticles(g, CX, torsoTop + 4, t * 0.7, 3, 9, 0.2 + glowPulse * 0.1);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 0.6;
  const glide = stride * 1.5; // gentle gliding sway

  const legH = 7;
  const torsoH = 9;
  const stanceL = Math.round(stride * 2.5);
  const stanceR = Math.round(-stride * 2.5);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 8;
  const hairWave = -stride * 2.5;

  const glowPulse = 0.5;

  drawShadow(g, CX, GY, 8 + Math.abs(stride), 2);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawRobeBottom(g, CX, GY - 4, glide * 0.3, Math.abs(stride));
  drawHair(g, CX, headTop, hairWave, glide * 0.2);
  drawTorso(g, CX, torsoTop, torsoH, glide * 0.25);
  drawHead(g, CX, headTop, glide * 0.2);

  // Left arm swings gently
  const lHandX = CX - 6 - stride;
  const lHandY = torsoTop + torsoH - 1;
  g.moveTo(CX - 4 + glide * 0.1, torsoTop + 3).lineTo(lHandX, lHandY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(lHandX, lHandY, 1.2).fill({ color: COL_SKIN });

  // Right arm holds staff — slight tilt with movement
  const staffBaseX = CX + 8 + stride * 0.5;
  const staffBaseY = torsoTop + torsoH - 1;
  const staffTopX = staffBaseX - stride * 0.3;
  const staffTopY = headTop - 10;
  g.moveTo(CX + 4 + glide * 0.1, torsoTop + 3).lineTo(staffBaseX, staffBaseY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(staffBaseX, staffBaseY, 1.2).fill({ color: COL_SKIN });
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, glowPulse);

  // Particles trail behind movement
  drawOrbitingParticles(g, staffTopX, staffTopY + 3, t, 4, 5, 0.4);
  // A couple of stray particles left behind
  if (Math.abs(stride) > 0.4) {
    const trailX = staffBaseX - stride * 4;
    const trailY = staffBaseY - 4;
    g.circle(trailX, trailY, 0.9).fill({ color: COL_PARTICLE, alpha: 0.3 });
    g.circle(trailX - stride * 2, trailY - 2, 0.6).fill({ color: COL_PARTICLE, alpha: 0.15 });
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: draw back, 2-3: thrust forward, 4-5: beam fires, 6-7: withdraw
  const phases = [0, 0.1, 0.22, 0.38, 0.55, 0.7, 0.84, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  // Thrust lean forward
  const lean = t < 0.55 ? t * 3 : (1 - t) * 5.5;
  const lunge = t > 0.18 && t < 0.8 ? 2 : 0;

  drawShadow(g, CX + lean * 0.3, GY, 8 + lean * 0.5, 2);
  drawBoots(g, CX, GY, -1, lunge);
  drawRobeBottom(g, CX, GY - 4, lean * 0.4, 0.3);
  drawHair(g, CX, headTop, -lean * 0.6);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.5);
  drawHead(g, CX, headTop, lean * 0.3);

  // Left arm — brace gesture
  const lHandX = CX - 6 + lean * 0.2;
  const lHandY = torsoTop + 3;
  g.moveTo(CX - 4 + lean * 0.3, torsoTop + 3).lineTo(lHandX, lHandY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(lHandX, lHandY, 1.2).fill({ color: COL_SKIN });

  // Staff thrust angle — point forward
  let staffTopX: number;
  let staffTopY: number;
  const staffBaseX = CX + 5 + lean;
  const staffBaseY = torsoTop + 2;

  if (t < 0.22) {
    // Draw back
    staffTopX = lerp(CX + 8, CX - 2 + lean, t / 0.22);
    staffTopY = lerp(headTop - 10, headTop - 6, t / 0.22);
  } else if (t < 0.55) {
    // Thrust — staff levels out pointing forward
    const st = (t - 0.22) / 0.33;
    staffTopX = lerp(CX - 2 + lean, CX + 22 + lean, st);
    staffTopY = lerp(headTop - 6, torsoTop + 4, st);
  } else {
    // Withdraw
    const rt = (t - 0.55) / 0.45;
    staffTopX = lerp(CX + 22 + lean, CX + 8, rt);
    staffTopY = lerp(torsoTop + 4, headTop - 10, rt);
  }

  g.moveTo(CX + 4 + lean * 0.5, torsoTop + 3).lineTo(staffBaseX, staffBaseY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(staffBaseX, staffBaseY, 1.2).fill({ color: COL_SKIN });
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, t < 0.6 ? 0.8 : 0.3);

  // Beam of moonlight during thrust/fire phase
  if (t >= 0.38 && t <= 0.75) {
    const beamT = clamp01(1 - Math.abs(t - 0.57) / 0.19);
    // Outer glow
    g.moveTo(staffTopX, staffTopY)
      .lineTo(staffTopX + 22, staffTopY + 1)
      .stroke({ color: COL_BEAM_GLOW, width: 5, alpha: beamT * 0.25 });
    // Mid beam
    g.moveTo(staffTopX, staffTopY)
      .lineTo(staffTopX + 22, staffTopY + 1)
      .stroke({ color: COL_BEAM, width: 2.5, alpha: beamT * 0.6 });
    // Bright core
    g.moveTo(staffTopX, staffTopY)
      .lineTo(staffTopX + 22, staffTopY + 1)
      .stroke({ color: COL_BEAM_CORE, width: 0.8, alpha: beamT * 0.9 });

    // Impact sparkle at beam end
    g.circle(staffTopX + 22, staffTopY + 1, 3).fill({ color: COL_PARTICLE_CORE, alpha: beamT * 0.4 });
    g.circle(staffTopX + 22, staffTopY + 1, 1.5).fill({ color: 0xffffff, alpha: beamT * 0.5 });

    // Particle scatter at tip
    for (let i = 0; i < 4; i++) {
      const pa = i * (Math.PI / 2) + t * 3;
      g.circle(staffTopX + Math.cos(pa) * 3, staffTopY + Math.sin(pa) * 2, 0.8)
        .fill({ color: COL_PARTICLE_HI, alpha: beamT * 0.5 });
    }
  }

  // Orbiting particles still present
  drawOrbitingParticles(g, staffTopX, staffTopY, t * 1.5, 3, 4, 0.35 * (1 - lean * 0.1));
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Arms raise, staff lifts high, crescent moon glows above, distortion waves radiate
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.3);
  const hairWave = Math.sin(t * Math.PI * 2) * 2;

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  // Expanding lunar glow behind the caster
  const outerGlowR = 12 + intensity * 16 + pulse * 4;
  g.circle(CX, torsoTop + 4, outerGlowR).fill({
    color: COL_MOON_GLOW,
    alpha: 0.04 + intensity * 0.08,
  });
  g.circle(CX, torsoTop + 4, outerGlowR * 0.5).fill({
    color: COL_MOON_GLOW,
    alpha: 0.06 + intensity * 0.07 + pulse * 0.03,
  });

  // Crescent moon manifestation above figure
  if (intensity > 0.2) {
    const moonCY = headTop - 8 - intensity * 5;
    const moonAlpha = clamp01(intensity - 0.2) * (0.7 + pulse * 0.3);

    // Moon glow aura
    g.circle(CX, moonCY, 8 + pulse * 2).fill({
      color: COL_MOON_GLOW,
      alpha: moonAlpha * 0.18,
    });
    // Moon disc
    g.circle(CX, moonCY, 6).fill({ color: COL_MOON_CORE, alpha: moonAlpha * 0.65 });
    // Crescent cutout simulation (darker overlay)
    g.circle(CX + 3.5, moonCY - 1, 4.5).fill({ color: COL_ROBE_BASE, alpha: moonAlpha * 0.55 });
    // Moon highlight rim
    g.moveTo(CX - 5, moonCY - 2)
      .quadraticCurveTo(CX - 7, moonCY, CX - 5, moonCY + 2)
      .stroke({ color: COL_MOON_CORE, width: 1, alpha: moonAlpha * 0.7 });
    // Sparkle points
    for (let i = 0; i < 5; i++) {
      const sa = (i / 5) * Math.PI * 2 + t * 1.5;
      const sd = 8 + i * 1.5;
      g.circle(CX + Math.cos(sa) * sd, moonCY + Math.sin(sa) * sd * 0.6, 0.8)
        .fill({ color: COL_PARTICLE_CORE, alpha: moonAlpha * (0.3 + pulse * 0.3) });
    }
  }

  // Distortion wave rings (radiate outward from caster)
  if (intensity > 0.1) {
    for (let ring = 0; ring < 3; ring++) {
      const waveR = (intensity * 14 + ring * 5) % 18;
      const wAlpha = clamp01(1 - waveR / 18) * clamp01(intensity - 0.1) * 0.3;
      if (wAlpha > 0.03) {
        g.circle(CX, torsoTop + 5, waveR).stroke({
          color: COL_DISTORTION,
          width: 0.7,
          alpha: wAlpha,
        });
      }
    }
  }

  drawShadow(g, CX, GY, 8, 2, 0.2 + intensity * 0.12);
  drawBoots(g, CX, GY, -1.5, 1.5);
  drawRobeBottom(g, CX, GY - 4, 0, 0.1);
  drawHair(g, CX, headTop, hairWave);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Both arms raised — channeling pose
  const raise = intensity * 9;

  // Left arm raised
  const lHandX = CX - 5;
  const lHandY = torsoTop - raise + 2;
  g.moveTo(CX - 4, torsoTop + 3).lineTo(lHandX, lHandY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(lHandX, lHandY, 1.2).fill({ color: COL_SKIN });
  // Moon glow on left hand
  if (intensity > 0.3) {
    g.circle(lHandX, lHandY, 2.5).fill({ color: COL_MOON_GLOW, alpha: clamp01(intensity - 0.3) * 0.35 });
  }

  // Right arm raises staff high
  const staffBaseX = CX + 5;
  const staffBaseY = torsoTop - raise + 3;
  const staffTopX = CX + 5;
  const staffTopY = staffBaseY - 14 - intensity * 2;
  g.moveTo(CX + 4, torsoTop + 3).lineTo(staffBaseX, staffBaseY)
    .stroke({ color: COL_ROBE_MID, width: 2 });
  g.circle(staffBaseX, staffBaseY, 1.2).fill({ color: COL_SKIN });
  drawStaff(g, staffBaseX, staffBaseY, staffTopX, staffTopY, 0.6 + intensity * 0.4 + pulse * 0.2);

  // Dense particle cloud around staff tip
  const tipY = staffTopY;
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 4 + i * (Math.PI / 4);
    const dist = 4 + intensity * 6 + i * 0.5;
    const px = staffTopX + Math.cos(angle) * dist;
    const py = tipY + Math.sin(angle) * dist * 0.45;
    const pAlpha = clamp01(0.2 + pulse * 0.3 - i * 0.02);
    g.circle(px, py, 1 + (i % 3 === 0 ? 0.4 : 0)).fill({ color: COL_PARTICLE, alpha: pAlpha });
    if (i % 4 === 0) {
      g.circle(px, py, 0.4).fill({ color: COL_PARTICLE_CORE, alpha: pAlpha * 0.9 });
    }
  }

  // Body orbiting particles — fast during cast
  drawOrbitingParticles(g, CX, torsoTop + 4, t * 1.8, 5, 10, 0.22 + intensity * 0.12 + pulse * 0.06);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Dissolves into cascade of moonlight particles; staff falls and dims
  const t = frame / 7;

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  const dissolve = clamp01(t * 1.2); // 0=solid → 1=fully dissolved
  const opacity = 1 - dissolve;

  const driftX = t * 4;
  const riseY = t * 6; // body seems to lift/fade upward

  drawShadow(g, CX + driftX * 0.2, GY, 8 * (1 - t * 0.7), 2, 0.2 * opacity);

  // Dissolving particle burst — scatter outward
  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const pAngle = (i / particleCount) * Math.PI * 2;
    const pDist = dissolve * (10 + i * 1.2);
    const px = CX + Math.cos(pAngle) * pDist;
    const py = torsoTop + 4 - riseY + Math.sin(pAngle) * pDist * 0.55;
    const pAlpha = clamp01(dissolve * 1.5) * clamp01(1 - dissolve * 0.9) * 0.7;
    if (pAlpha > 0.04) {
      g.circle(px, py, 1.2 - i * 0.04).fill({ color: COL_PARTICLE, alpha: pAlpha });
    }
  }

  // Secondary larger glow puffs
  for (let i = 0; i < 5; i++) {
    const pa = i * (Math.PI * 2 / 5) + t * 0.8;
    const pd = dissolve * (7 + i * 2.5);
    const pAlpha = clamp01(dissolve * 1.2) * clamp01(1 - dissolve) * 0.35;
    g.circle(CX + Math.cos(pa) * pd, torsoTop + 4 - riseY * 0.8 + Math.sin(pa) * pd * 0.4, 2.5)
      .fill({ color: COL_MOON_GLOW, alpha: pAlpha });
  }

  // Body elements fade out and drift apart
  if (opacity > 0.05) {
    // Boots still visible early
    if (t < 0.5) {
      drawBoots(g, CX + driftX * 0.1, GY, 0, 0);
    }

    // Robe fading
    const robeAlpha = opacity * 0.8;
    if (robeAlpha > 0.05) {
      g.localAlpha = robeAlpha;
      drawRobeBottom(g, CX + driftX * 0.2, GY - 4 - riseY * 0.4, driftX * 0.1, 0.1);
      g.localAlpha = 1;
    }

    // Hair streams upward as dissolving
    if (t < 0.7) {
      const hairAlpha = opacity;
      g.localAlpha = hairAlpha;
      drawHair(g, CX + driftX * 0.3, headTop - riseY * 0.6, t * 4);
      g.localAlpha = 1;
    }

    // Torso dissolves
    if (t < 0.65) {
      g.localAlpha = opacity * 0.75;
      drawTorso(g, CX + driftX * 0.2, torsoTop - riseY * 0.5, torsoH);
      g.localAlpha = 1;
    }

    // Face fades last
    if (t < 0.55) {
      g.localAlpha = opacity;
      drawHead(g, CX + driftX * 0.25, headTop - riseY * 0.55);
      g.localAlpha = 1;
    }
  }

  // Staff falls — drops and dims as magic leaves it
  const staffFallAngle = t * 1.4; // rotating as it falls
  const staffFallX = CX + 8 + t * 8;
  const staffFallY = torsoTop + torsoH - 1 + t * t * 10;
  const staffLen = 14;
  const stx2 = staffFallX + Math.sin(staffFallAngle) * staffLen;
  const sty2 = staffFallY - Math.cos(staffFallAngle) * staffLen;
  if (t < 0.9) {
    drawStaff(g, staffFallX, staffFallY, stx2, sty2, opacity * 0.5);
  } else {
    // Dimmed staff on ground
    g.moveTo(CX + 12, GY - 1)
      .lineTo(CX + 22, GY - 3)
      .stroke({ color: COL_STAFF_DK, width: 1.5, alpha: 0.5 });
  }

  // Moonlight shimmer trail as staff falls
  if (t > 0.1 && t < 0.8) {
    const trailAlpha = clamp01(t * 2) * clamp01(1 - t) * 0.3;
    g.moveTo(staffFallX, staffFallY)
      .lineTo(stx2, sty2)
      .stroke({ color: COL_CRESCENT_GLOW, width: 3, alpha: trailAlpha });
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
 * Generate all Moonweaver sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateMoonweaverFrames(renderer: Renderer): RenderTexture[] {
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
