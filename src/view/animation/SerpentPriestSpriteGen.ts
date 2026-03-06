// Procedural sprite generator for the Serpent Priest unit type.
//
// Draws a snake-scaled shaman at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Humanoid body — snake-scaled skin (emerald green, teal shadows)
//   • Cobra hood extending behind head — flares on IDLE/CAST
//   • Yellow slit-pupil eyes, forked tongue visible on hover/attack
//   • Bone necklace and feathered ritual garb (deep teal/ochre)
//   • Gnarled staff with carved snake-head finial, green glow
//   • Robes obscure legs — slithering glide movement, no feet
//   • Poison/nature magic: spiraling green vines, conjured snakes

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — serpent emerald & nature poison
const COL_SCALE_BASE = 0x2d6b3a; // deep emerald scale base
const COL_SCALE_MID = 0x3d8c4a; // mid green
const COL_SCALE_HI = 0x55bb66; // bright highlight
const COL_SCALE_DK = 0x1a3d22; // dark shadow between scales

const COL_SKIN_FACE = 0x3a8048; // face scale tone

const COL_EYE_SLIT = 0xffdd22; // bright yellow iris
const COL_EYE_PUPIL = 0x100800; // vertical slit pupil
const COL_EYE_GLOW = 0xffee88; // eye glow halo
const COL_TONGUE = 0xcc2244; // forked tongue crimson

const COL_HOOD_BASE = 0x1e5a2e; // hood base — dark green
const COL_HOOD_MID = 0x2d7a3e; // hood mid
const COL_HOOD_RIB = 0x55aa66; // lighter hood ribs
const COL_HOOD_EDGE = 0x0d3318; // hood outer edge

const COL_ROBE_BASE = 0x1a3d44; // deep teal ritual robe
const COL_ROBE_MID = 0x25566a; // mid teal
const COL_ROBE_HI = 0x3a7a90; // highlight
const COL_ROBE_DK = 0x0d2530; // robe deep shadow
const COL_FEATHER_A = 0xcc8822; // ochre feather
const COL_FEATHER_B = 0x882222; // dark crimson feather
const COL_FEATHER_C = 0x337744; // deep green feather

const COL_BONE = 0xddccaa; // bone necklace
const COL_BONE_DK = 0xaa9977;

const COL_STAFF_WOOD = 0x7a5a2a; // gnarled staff wood
const COL_STAFF_DK = 0x4a3510;
const COL_STAFF_HI = 0xaa8850;
const COL_STAFF_HEAD = 0x3d7040; // carved snake-head — deep green
const COL_STAFF_GLOW = 0x44ff66; // green glow
const COL_STAFF_GEM = 0x88ffaa; // gem at snake mouth

const COL_VINE = 0x33aa44; // web/vine projectile
const COL_VINE_HI = 0x77ee88;
const COL_POISON_DROP = 0xaaff44; // dripping poison

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
  alpha = 0.22,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

// Scale pattern — overlapping diamond rows across a rectangular region
function drawScalePattern(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.35,
): void {
  const cols = Math.ceil(w / 3);
  const rows = Math.ceil(h / 2.5);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = x + col * 3 + (row % 2) * 1.5;
      const oy = y + row * 2.5;
      g.moveTo(ox + 1.5, oy)
        .lineTo(ox + 3, oy + 1.5)
        .lineTo(ox + 1.5, oy + 3)
        .lineTo(ox, oy + 1.5)
        .closePath()
        .fill({ color: COL_SCALE_DK, alpha });
    }
  }
}

// Cobra hood — fan behind and around the head
function drawHood(
  g: Graphics,
  hx: number,
  hy: number,
  flare: number, // 0 = resting narrow, 1 = fully spread
  tilt = 0,
): void {
  const hoodW = 16 + flare * 14;
  const hoodH = 18 + flare * 8;
  const mx = hx - hoodW / 2 + tilt;

  // Outer edge (darkest)
  g.ellipse(hx + tilt, hy + hoodH * 0.45, hoodW * 0.55, hoodH * 0.55)
    .fill({ color: COL_HOOD_EDGE });

  // Main hood span
  g.ellipse(hx + tilt, hy + hoodH * 0.42, hoodW * 0.5, hoodH * 0.5)
    .fill({ color: COL_HOOD_BASE });

  // Hood rib lines radiating from neck center
  const ribCount = 5 + Math.round(flare * 3);
  for (let i = 0; i < ribCount; i++) {
    const ang = Math.PI * lerp(0.1, 0.9, i / (ribCount - 1)) + Math.PI; // upward arc
    const rx = hx + tilt + Math.cos(ang) * hoodW * 0.48;
    const ry = hy + hoodH * 0.45 + Math.sin(ang) * hoodH * 0.48;
    g.moveTo(hx + tilt, hy + hoodH * 0.65)
      .lineTo(rx, ry)
      .stroke({ color: COL_HOOD_RIB, width: 0.6, alpha: 0.5 + flare * 0.25 });
  }

  // Inner brighter center
  g.ellipse(hx + tilt, hy + hoodH * 0.44, hoodW * 0.3, hoodH * 0.35)
    .fill({ color: COL_HOOD_MID, alpha: 0.6 });

  // Subtle scale pattern on hood
  drawScalePattern(g, mx + 2, hy - hoodH * 0.1, hoodW - 4, hoodH * 0.8, 0.2 + flare * 0.1);
}

// Snake-scaled head — flat, wedge-shaped
function drawHead(
  g: Graphics,
  hx: number,
  hy: number,
  tongueOut: number, // 0–1
  tilt = 0,
): void {
  const hw = 10;
  const hh = 9;
  const mx = hx - hw / 2 + tilt;

  // Head shape — slightly angular/wedge
  g.roundRect(mx, hy + 1, hw, hh - 1, 2).fill({ color: COL_SKIN_FACE });
  // Scale highlight top
  g.roundRect(mx + 1, hy + 1, hw - 2, 3, 1).fill({ color: COL_SCALE_MID, alpha: 0.5 });
  // Subtle scales
  drawScalePattern(g, mx, hy + 1, hw, hh - 1, 0.25);

  // Yellow slit eyes — glowing
  const eyeY = hy + hh * 0.38;
  const eyeLX = hx - 2.8 + tilt;
  const eyeRX = hx + 2.8 + tilt;
  // Glow halo
  g.circle(eyeLX, eyeY, 2.4).fill({ color: COL_EYE_GLOW, alpha: 0.2 });
  g.circle(eyeRX, eyeY, 2.4).fill({ color: COL_EYE_GLOW, alpha: 0.2 });
  // Iris
  g.ellipse(eyeLX, eyeY, 1.8, 1.4).fill({ color: COL_EYE_SLIT });
  g.ellipse(eyeRX, eyeY, 1.8, 1.4).fill({ color: COL_EYE_SLIT });
  // Vertical slit pupil
  g.ellipse(eyeLX, eyeY, 0.45, 1.2).fill({ color: COL_EYE_PUPIL });
  g.ellipse(eyeRX, eyeY, 0.45, 1.2).fill({ color: COL_EYE_PUPIL });

  // Mouth line — thin horizontal
  const mouthY = hy + hh * 0.7;
  g.moveTo(mx + 1, mouthY).lineTo(mx + hw - 1, mouthY).stroke({ color: COL_SCALE_DK, width: 0.5 });

  // Forked tongue flicks out
  if (tongueOut > 0.05) {
    const tlen = tongueOut * 7;
    const ty = mouthY + 1;
    g.moveTo(hx + tilt, ty)
      .lineTo(hx + tilt, ty + tlen)
      .stroke({ color: COL_TONGUE, width: 0.9 });
    // Fork tips
    g.moveTo(hx + tilt, ty + tlen)
      .lineTo(hx + tilt - 2, ty + tlen + tongueOut * 2.5)
      .stroke({ color: COL_TONGUE, width: 0.7 });
    g.moveTo(hx + tilt, ty + tlen)
      .lineTo(hx + tilt + 2, ty + tlen + tongueOut * 2.5)
      .stroke({ color: COL_TONGUE, width: 0.7 });
  }
}

// Robes — trapezoid draping down from torso, obscuring legs
function drawRobes(
  g: Graphics,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  sway = 0,
): void {
  // Main robe body — widens at bottom (trailing)
  const bottomW = rw + 6;
  g.moveTo(rx, ry)
    .lineTo(rx + rw, ry)
    .lineTo(rx + rw + 3 + sway, ry + rh)
    .lineTo(rx - 3 + sway, ry + rh)
    .closePath()
    .fill({ color: COL_ROBE_BASE });

  // Mid highlight stripe down center
  g.moveTo(rx + rw * 0.3, ry + 2)
    .lineTo(rx + rw * 0.3 + sway * 0.5, ry + rh - 2)
    .stroke({ color: COL_ROBE_MID, width: 3, alpha: 0.5 });
  g.moveTo(rx + rw * 0.35, ry + 2)
    .lineTo(rx + rw * 0.35 + sway * 0.5, ry + rh - 2)
    .stroke({ color: COL_ROBE_HI, width: 1, alpha: 0.3 });

  // Hem decorations — small triangles bottom edge
  const hemCount = 6;
  for (let i = 0; i < hemCount; i++) {
    const hx = rx - 3 + sway + i * (bottomW / (hemCount - 1));
    const hy = ry + rh;
    g.moveTo(hx, hy)
      .lineTo(hx + bottomW / (hemCount * 2), hy + 2)
      .lineTo(hx + bottomW / hemCount, hy)
      .closePath()
      .fill({ color: COL_SCALE_MID, alpha: 0.55 });
  }

  // Dark shadow fold left side
  g.moveTo(rx, ry)
    .lineTo(rx - 3 + sway, ry + rh)
    .stroke({ color: COL_ROBE_DK, width: 2, alpha: 0.4 });
}

// Torso — body core with scale chest
function drawTorso(
  g: Graphics,
  tx: number,
  ty: number,
  tw: number,
  th: number,
  sway = 0,
): void {
  g.roundRect(tx + sway * 0.3, ty, tw, th, 3).fill({ color: COL_SCALE_BASE });
  // Chest scale highlight
  g.roundRect(tx + sway * 0.3 + 1, ty + 1, tw - 2, th * 0.45, 2).fill({
    color: COL_SCALE_MID,
    alpha: 0.55,
  });
  drawScalePattern(g, tx + sway * 0.3, ty, tw, th, 0.3);

  // Bone necklace — two rows of small rounded bones
  const neckY = ty + 2;
  const neckCX = tx + tw / 2 + sway * 0.3;
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * lerp(0.15, 0.85, i / 6);
    const bx = neckCX + Math.cos(ang) * 5;
    const by = neckY + Math.sin(ang) * 2;
    g.ellipse(bx, by, 0.9, 1.3).fill({ color: COL_BONE });
    g.ellipse(bx, by, 0.4, 0.8).fill({ color: COL_BONE_DK, alpha: 0.5 });
  }
  // Pendant — larger skull/snake vertebra
  g.ellipse(neckCX, neckY + 3, 1.5, 2).fill({ color: COL_BONE });
  g.ellipse(neckCX, neckY + 3, 0.6, 1).fill({ color: COL_BONE_DK, alpha: 0.6 });

  // Feathers at hip flanks
  const feathers = [
    { ox: -4, col: COL_FEATHER_A },
    { ox: -2, col: COL_FEATHER_C },
    { ox: tw + 1, col: COL_FEATHER_B },
    { ox: tw + 3, col: COL_FEATHER_A },
  ];
  for (const { ox, col } of feathers) {
    const fx = tx + ox + sway * 0.2;
    const fy = ty + th - 1;
    g.moveTo(fx, fy)
      .quadraticCurveTo(fx - 1.5, fy + 5, fx, fy + 9)
      .stroke({ color: col, width: 1.5, alpha: 0.7 });
    g.moveTo(fx, fy)
      .quadraticCurveTo(fx + 1.5, fy + 5, fx, fy + 9)
      .stroke({ color: col, width: 0.7, alpha: 0.4 });
  }
}

// Arm reaching toward staff, sleeved in robe fabric
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_MID, width: 3.5 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ROBE_HI, width: 1, alpha: 0.4 });
  // Scale-covered hand
  g.circle(ex, ey, 1.6).fill({ color: COL_SCALE_BASE });
  g.circle(ex, ey, 0.8).fill({ color: COL_SCALE_MID, alpha: 0.5 });
}

// Gnarled staff with snake-head finial and green glow
function drawStaff(
  g: Graphics,
  sx: number,
  sy: number, // base
  ex: number,
  ey: number, // tip / head position
  glowIntensity = 0.5,
): void {
  // Glow halo at snake-head
  g.circle(ex, ey, 5 + glowIntensity * 3).fill({
    color: COL_STAFF_GLOW,
    alpha: 0.08 + glowIntensity * 0.12,
  });

  // Staff shaft — slightly curved gnarled wood
  const midX = lerp(sx, ex, 0.5) + 1.5;
  const midY = lerp(sy, ey, 0.5);
  g.moveTo(sx, sy).quadraticCurveTo(midX, midY, ex, ey).stroke({
    color: COL_STAFF_DK,
    width: 3,
  });
  g.moveTo(sx, sy).quadraticCurveTo(midX, midY, ex, ey).stroke({
    color: COL_STAFF_WOOD,
    width: 2,
  });
  // Highlight grain line
  g.moveTo(sx + 0.5, sy).quadraticCurveTo(midX + 0.5, midY, ex + 0.5, ey).stroke({
    color: COL_STAFF_HI,
    width: 0.6,
    alpha: 0.45,
  });
  // Knots on shaft
  g.circle(lerp(sx, ex, 0.35) + 1, lerp(sy, ey, 0.35), 1.2).fill({
    color: COL_STAFF_DK,
    alpha: 0.5,
  });
  g.circle(lerp(sx, ex, 0.65) + 1, lerp(sy, ey, 0.65), 1).fill({
    color: COL_STAFF_DK,
    alpha: 0.4,
  });

  // Snake head finial — carved serpent
  g.roundRect(ex - 3, ey - 2, 6, 4, 1.5).fill({ color: COL_STAFF_HEAD }); // head body
  g.moveTo(ex + 1, ey) // snout protrusion
    .lineTo(ex + 4, ey - 1)
    .lineTo(ex + 4, ey + 1)
    .closePath()
    .fill({ color: COL_STAFF_HEAD });
  // Snake eye on finial
  g.circle(ex - 0.5, ey - 0.5, 0.8).fill({ color: COL_STAFF_GEM });
  g.circle(ex - 0.5, ey - 0.5, 0.3).fill({ color: COL_SHADOW, alpha: 0.5 });

  // Gem at mouth — glowing orb
  g.circle(ex + 4, ey, 2).fill({ color: COL_STAFF_GLOW, alpha: 0.25 + glowIntensity * 0.35 });
  g.circle(ex + 4, ey, 1.2).fill({ color: COL_STAFF_GEM, alpha: 0.7 + glowIntensity * 0.2 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const sway = Math.sin(t * Math.PI * 2) * 0.9; // gentle body sway
  const tongueFlick = frame === 3 || frame === 7 ? 0.7 : 0; // tongue flick rhythm
  const glowPulse = Math.sin(t * Math.PI * 2) * 0.3 + 0.6; // staff glow
  const hoodFlare = Math.sin(t * Math.PI * 2) * 0.12 + 0.15; // subtle hood flare

  const torsoX = CX - 6 + sway * 0.4;
  const torsoY = 17;
  const torsoW = 13;
  const torsoH = 10;

  const robeX = CX - 8 + sway * 0.5;
  const robeY = torsoY + torsoH - 1;
  const robeW = 16;
  const robeH = 16;

  const headCX = CX + sway * 0.5;
  const headY = torsoY - 11;

  // Staff position — held in right hand at side
  const staffBaseX = CX + 10 + sway * 0.2;
  const staffBaseY = GY - 3;
  const staffTipX = staffBaseX - 2;
  const staffTipY = headY - 4;

  drawShadow(g, CX + sway * 0.3, GY);
  drawRobes(g, robeX, robeY, robeW, robeH, sway);
  drawTorso(g, torsoX, torsoY, torsoW, torsoH, sway);

  // Right arm holding staff
  drawArm(g, torsoX + torsoW - 1, torsoY + 3, staffBaseX - 3, torsoY + torsoH);
  drawStaff(g, staffBaseX, staffBaseY, staffTipX, staffTipY, glowPulse);

  // Left arm — relaxed, slight raised
  drawArm(g, torsoX + 2, torsoY + 3, torsoX - 3, torsoY + 6 + sway * 0.3);

  // Hood behind head
  drawHood(g, headCX, headY - 3, hoodFlare, sway * 0.3);
  drawHead(g, headCX, headY, tongueFlick, sway * 0.3);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const glide = Math.sin(t * Math.PI * 2); // side-to-side slither undulation
  const bob = Math.abs(glide) * 0.8; // subtle vertical bob
  const glowPulse = Math.sin(t * Math.PI * 3) * 0.2 + 0.55;

  // Body drifts side to side — slithering robe
  const bodyDrift = glide * 3;
  const headLag = glide * 1.5; // head trails the body sway slightly less

  const torsoX = CX - 6 + bodyDrift;
  const torsoY = 17 - bob * 0.5;
  const torsoW = 13;
  const torsoH = 10;

  const robeX = CX - 8 + bodyDrift;
  const robeY = torsoY + torsoH - 1;
  const robeW = 16;
  const robeH = 16;

  // Robes trail — bottom hem shifts more than top (slither effect)
  const robeTrail = -glide * 3;

  const headCX = CX + headLag;
  const headY = torsoY - 11;

  // Staff angles forward as priest strides
  const staffLean = -glide * 4;
  const staffBaseX = CX + 10 + bodyDrift * 0.5;
  const staffBaseY = GY - 2;
  const staffTipX = staffBaseX + staffLean - 2;
  const staffTipY = headY - 6;

  drawShadow(g, CX + bodyDrift * 0.4, GY, 8 + Math.abs(glide), 2);
  drawRobes(g, robeX, robeY, robeW, robeH, robeTrail);
  drawTorso(g, torsoX, torsoY, torsoW, torsoH, bodyDrift * 0.2);
  drawArm(g, torsoX + torsoW - 1, torsoY + 3, staffBaseX - 3, torsoY + torsoH);
  drawStaff(g, staffBaseX, staffBaseY, staffTipX, staffTipY, glowPulse);
  drawArm(g, torsoX + 2, torsoY + 3, torsoX - 4 + glide * 1.5, torsoY + 7);
  drawHood(g, headCX, headY - 3, 0.1, headLag * 0.3);
  drawHead(g, headCX, headY, 0, headLag * 0.3);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0–1: chamber staff back; 2–3: thrust forward; 4–5: vine launches; 6–7: recover
  const phases = [0, 0.13, 0.27, 0.42, 0.58, 0.72, 0.86, 1.0];
  const t = phases[Math.min(frame, 7)];

  const lunge = t < 0.55 ? t * 1.8 : (1 - t) * 2.2; // body leans forward
  const staffThrust = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;

  const torsoX = CX - 7 + lunge * 3;
  const torsoY = 17;
  const torsoW = 13;
  const torsoH = 10;

  const robeX = CX - 8 + lunge * 2;
  const robeY = torsoY + torsoH - 1;
  const headCX = CX + lunge * 2.5;
  const headY = torsoY - 11;

  // Staff thrusts forward, nearly horizontal at peak
  const staffAngle = lerp(-Math.PI * 0.55, -Math.PI * 0.2, staffThrust);
  const staffLen = 28;
  const staffBaseX = torsoX + torsoW + 1;
  const staffBaseY = torsoY + 5;
  const staffTipX = staffBaseX + Math.cos(staffAngle) * staffLen;
  const staffTipY = staffBaseY + Math.sin(staffAngle) * staffLen;

  drawShadow(g, CX + lunge, GY, 8 + lunge * 2, 2);
  drawRobes(g, robeX, robeY, 16, 16, lunge * 1.5);
  drawTorso(g, torsoX, torsoY, torsoW, torsoH, lunge * 0.5);
  drawArm(g, torsoX + torsoW - 1, torsoY + 4, staffBaseX, staffBaseY);
  drawStaff(g, staffBaseX, staffBaseY, staffTipX, staffTipY, 0.8 + staffThrust * 0.4);

  // Left arm reaches forward too — power gesture
  drawArm(g, torsoX + 2, torsoY + 3, torsoX - 2 + lunge * 2, torsoY + 4);

  drawHood(g, headCX, headY - 3, lunge * 0.35, lunge * 0.4);
  drawHead(g, headCX, headY, staffThrust * 0.4, lunge * 0.4);

  // Green web/vine launches from staff tip (frames 4–6)
  if (t >= 0.42 && t <= 0.86) {
    const webProgress = clamp01((t - 0.42) / 0.44);
    const webLen = webProgress * 18;
    // Central vine
    g.moveTo(staffTipX, staffTipY)
      .lineTo(staffTipX + webLen, staffTipY - webLen * 0.3)
      .stroke({ color: COL_VINE, width: 1.8, alpha: 0.85 });
    // Branching tendril vines
    for (let i = 0; i < 4; i++) {
      const bLen = webLen * (0.5 + i * 0.15);
      const ang = -0.5 + i * 0.35;
      g.moveTo(staffTipX + webLen * 0.3, staffTipY - 3)
        .lineTo(staffTipX + webLen * 0.3 + Math.cos(ang) * bLen, staffTipY - 3 + Math.sin(ang) * bLen)
        .stroke({ color: i % 2 === 0 ? COL_VINE : COL_VINE_HI, width: 0.9, alpha: 0.6 });
    }
    // Poison drip drops
    for (let d = 0; d < 3; d++) {
      const dropT = (webProgress + d * 0.3) % 1;
      g.circle(
        staffTipX + webLen * (0.3 + d * 0.25),
        staffTipY + dropT * 5,
        0.8,
      ).fill({ color: COL_POISON_DROP, alpha: 0.6 * (1 - dropT) });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);
  const glowIntensity = 0.7 + pulse * 0.4;

  const torsoX = CX - 7;
  const torsoY = 16;
  const torsoW = 13;
  const torsoH = 10;
  const headCX = CX;
  const headY = torsoY - 12;

  // Green nature spiral magic rising from hands
  for (let ring = 0; ring < 4; ring++) {
    const ringPhase = (t * 2 + ring * 0.25) % 1;
    const ringR = 6 + ringPhase * 18;
    const ringAlpha = (1 - ringPhase) * 0.3 * intensity;
    g.circle(CX, torsoY - 5, ringR).stroke({ color: COL_STAFF_GLOW, width: 1.2, alpha: ringAlpha });
  }

  // Spiral particles
  for (let i = 0; i < 10; i++) {
    const ang = t * Math.PI * 5 + i * (Math.PI * 2 / 10);
    const dist = 4 + intensity * 14 + i * 1.2;
    const riseY = t * 12;
    const px = CX + Math.cos(ang) * dist;
    const py = torsoY - 5 - riseY * (i / 10) + Math.sin(ang) * dist * 0.3;
    g.circle(px, py, 0.8 + pulse * 0.6).fill({
      color: i % 2 === 0 ? COL_VINE : COL_POISON_DROP,
      alpha: 0.4 + pulse * 0.3,
    });
  }

  // Conjured snakes writhing upward
  for (let s = 0; s < 3; s++) {
    const snakeT = (t + s * 0.33) % 1;
    const snakeX = CX - 8 + s * 8;
    const snakeBaseY = torsoY + 8;
    const snakeRise = snakeT * 22;
    const wiggle = Math.sin(t * Math.PI * 6 + s * 2) * 3;
    g.moveTo(snakeX, snakeBaseY)
      .quadraticCurveTo(snakeX + wiggle, snakeBaseY - snakeRise * 0.5, snakeX - wiggle, snakeBaseY - snakeRise)
      .stroke({
        color: COL_SCALE_MID,
        width: 1.8,
        alpha: clamp01(snakeT * 3) * 0.65,
      });
    // Snake head dot at top
    g.circle(snakeX - wiggle, snakeBaseY - snakeRise, 1.5).fill({
      color: COL_SCALE_HI,
      alpha: clamp01(snakeT * 3) * 0.6,
    });
  }

  drawShadow(g, CX, GY, 8, 2, 0.22 + intensity * 0.1);
  drawRobes(g, torsoX - 2, torsoY + torsoH - 1, 18, 16, 0);
  drawTorso(g, torsoX, torsoY, torsoW, torsoH);

  // Both arms raised wide — channeling
  const armRaise = intensity * 9;
  const armSpread = intensity * 5;
  const lHandX = torsoX - 4 - armSpread;
  const lHandY = torsoY - armRaise;
  const rHandX = torsoX + torsoW + 4 + armSpread;
  const rHandY = torsoY - armRaise;

  drawArm(g, torsoX + 2, torsoY + 2, lHandX, lHandY);
  drawArm(g, torsoX + torsoW - 2, torsoY + 2, rHandX, rHandY);

  // Glow orbs at palms
  g.circle(lHandX, lHandY, 3 + pulse * 1.5).fill({ color: COL_STAFF_GLOW, alpha: 0.15 + pulse * 0.2 });
  g.circle(lHandX, lHandY, 1.5 + pulse * 0.5).fill({ color: COL_STAFF_GEM, alpha: 0.6 + pulse * 0.2 });
  g.circle(rHandX, rHandY, 3 + pulse * 1.5).fill({ color: COL_STAFF_GLOW, alpha: 0.15 + pulse * 0.2 });
  g.circle(rHandX, rHandY, 1.5 + pulse * 0.5).fill({ color: COL_STAFF_GEM, alpha: 0.6 + pulse * 0.2 });

  // Staff floating beside — tip blazing
  const staffX = torsoX + torsoW + 8;
  const staffBY = GY - 2;
  drawStaff(g, staffX, staffBY, staffX - 2, headY - 4, glowIntensity);

  // Hood fully flared during cast
  drawHood(g, headCX, headY - 3, 0.7 + pulse * 0.3, 0);
  drawHead(g, headCX, headY, 0.5 + pulse * 0.3, 0);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fall = t * t; // accelerated collapse

  const torsoX = CX - 7 + fall * 4;
  const torsoY = 17 + fall * 8;
  const torsoW = 13;
  const torsoH = 10;
  const headCX = CX + fall * 5;
  const headY = torsoY - 12 + fall * 6;

  // Hood collapses — flare drops to zero and dims
  const hoodFlare = (1 - fall) * 0.2;
  const hoodAlpha = 1 - fall * 0.8;

  // Scales fade to grey
  const fadeAlpha = fall * 0.7;

  // Shadow stretches as body slumps to side
  drawShadow(g, CX + fall * 3, GY, 8 + fall * 4, 2 + fall * 1.5, 0.22 + fall * 0.1);

  drawRobes(g, torsoX - 2 + fall * 2, torsoY + torsoH - 1, 16, 16 * (1 - fall * 0.15), fall * 5);
  drawTorso(g, torsoX, torsoY, torsoW, torsoH, fall * 3);

  // Grey desaturation overlay on torso
  if (fall > 0.2) {
    g.roundRect(torsoX, torsoY, torsoW, torsoH, 3).fill({
      color: 0x888888,
      alpha: fadeAlpha * 0.5,
    });
  }

  // Staff falls away from hand
  if (t < 0.7) {
    const staffFallAngle = t * Math.PI * 0.7;
    const staffPivotX = torsoX + torsoW + 3;
    const staffPivotY = torsoY + 4;
    const staffTipX = staffPivotX + Math.sin(staffFallAngle) * 26;
    const staffTipY = staffPivotY - Math.cos(staffFallAngle) * 26;
    drawArm(g, torsoX + torsoW - 2, torsoY + 3, staffPivotX, staffPivotY);
    drawStaff(g, staffPivotX, staffPivotY, staffTipX, staffTipY, (1 - t) * 0.5);
  }

  // Left arm drops limp
  if (t < 0.85) {
    drawArm(
      g,
      torsoX + 2,
      torsoY + 3,
      torsoX - 4 + fall * 2,
      torsoY + 5 + fall * 8,
    );
  }

  // Hood collapses around head (gets smaller and dims)
  if (hoodAlpha > 0.05) {
    g.alpha = hoodAlpha;
    drawHood(g, headCX, headY - 3, hoodFlare, fall * 2);
    g.alpha = 1;
  }

  // Head — eyes dim to grey, tongue retracts
  if (t < 0.9) {
    drawHead(g, headCX, headY, 0, fall * 2);
    // Eye grey overlay — slit closes
    if (fall > 0.15) {
      const eyeY = headY + 9 * 0.38;
      g.ellipse(headCX - 2.8 + fall * 2, eyeY, 1.8 * (1 - fall * 0.8), 1.4).fill({
        color: 0x888888,
        alpha: fadeAlpha * 0.8,
      });
      g.ellipse(headCX + 2.8 + fall * 2, eyeY, 1.8 * (1 - fall * 0.8), 1.4).fill({
        color: 0x888888,
        alpha: fadeAlpha * 0.8,
      });
    }
  }

  // Dissolve into snakes — small snake shapes scatter (frames 5–7)
  if (t >= 0.6) {
    const dissolveT = clamp01((t - 0.6) / 0.4);
    for (let s = 0; s < 5; s++) {
      const ang = s * (Math.PI * 2 / 5) + t * 2;
      const dist = dissolveT * (8 + s * 3);
      const sx = CX + Math.cos(ang) * dist;
      const sy = torsoY + 5 + Math.sin(ang) * dist * 0.6;
      // Small snake body
      g.moveTo(sx, sy)
        .lineTo(sx + Math.cos(ang + 0.5) * 5, sy + Math.sin(ang + 0.5) * 5 * 0.4)
        .stroke({ color: COL_SCALE_MID, width: 1.5, alpha: (1 - dissolveT) * 0.6 });
      // Head dot
      g.circle(sx, sy, 1).fill({ color: COL_SCALE_HI, alpha: (1 - dissolveT) * 0.55 });
    }
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
 * Generate all Serpent Priest sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSerpentPriestFrames(renderer: Renderer): RenderTexture[] {
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
