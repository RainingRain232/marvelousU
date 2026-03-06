// Procedural sprite generator for the Ironbreaker unit type.
//
// Draws an elite dwarven infantry unit at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Short, stocky dwarven build (2/3 height of human)
//   • Dark silver/blue-steel gromril plate armour
//   • Gold rune engravings that glow with magical energy
//   • Large round clan shield with embossed emblem
//   • Heavy dwarven war-axe
//   • Magnificent braided beard with metal rings
//   • Horned helmet with nose guard
//   • Idle breathing pulses rune glow; attack is powerful overhead chop

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — gromril steel, gold runes, dwarven earth tones
const COL_SKIN       = 0xd4a87a; // ruddy dwarven skin

const COL_GROMRIL    = 0x6a7a9a; // dark blue-steel plate
const COL_GROMRIL_HI = 0x8a9abb; // highlight on armour
const COL_GROMRIL_DK = 0x3a4a6a; // deep shadow in plate
const COL_GROMRIL_RIM= 0xaabbcc; // bright rim light

const COL_RUNE       = 0xffcc44; // gold rune engravings
const COL_RUNE_GLOW  = 0xffaa00; // rune glow pulse
const COL_RUNE_BRIGHT= 0xffee88; // rune peak brightness

const COL_GOLD       = 0xc8a030; // gold trim on helmet, shield boss
const COL_GOLD_HI    = 0xf0cc60;
const COL_GOLD_DK    = 0x8a6010;

const COL_SHIELD     = 0x4a5a7a; // shield face (gromril)
const COL_SHIELD_RIM = 0x8a9abb;
const COL_SHIELD_BOSS= 0xc8a030; // gold central boss

const COL_AXE_BLADE  = 0x9aaabb; // axe blade steel
const COL_AXE_HI     = 0xccddee;
const COL_AXE_HAFT   = 0x5a3a1e; // dark wood haft
const COL_AXE_HAFT_HI= 0x7a5a3a;
const COL_AXE_BAND   = 0xc8a030; // gold bands on haft

const COL_BEARD      = 0x8a6a3a; // brown-gold beard
const COL_BEARD_HI   = 0xb08050;
const COL_BEARD_DK   = 0x5a4020;
const COL_BEARD_RING = 0xc8a030; // metal rings in beard

const COL_HELMET     = 0x5a6a8a; // helmet (darker gromril)
const COL_HELMET_HI  = 0x7a8aaa;
const COL_HORN       = 0xd4b070; // horn tips
const COL_NOSEGUARD  = 0x4a5a7a;

const COL_BOOT       = 0x3a4a6a; // armoured sabatons
const COL_BOOT_DK    = 0x2a3050;

const COL_SHADOW     = 0x000000;

const COL_MAGIC_GLOW = 0x88aaff; // protective magic glow (cast)
const COL_MAGIC_RING = 0xaaccff;

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
  h = 2.5,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

// Armoured sabatons — heavy square-toed dwarven boots
function drawSabatons(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 5;
  const bh = 4;
  // Left sabaton
  g.rect(cx - 8 + stanceL, gy - bh, bw, bh)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Right sabaton
  g.rect(cx + 3 + stanceR, gy - bh, bw, bh)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Plate highlight on toe
  g.rect(cx - 8 + stanceL, gy - bh, bw, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, gy - bh, bw, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.5 });
  // Gold toe rim
  g.rect(cx - 8 + stanceL, gy - 1.5, bw, 1.5).fill({ color: COL_GOLD, alpha: 0.4 });
  g.rect(cx + 3 + stanceR, gy - 1.5, bw, 1.5).fill({ color: COL_GOLD, alpha: 0.4 });
}

// Squat greaved legs
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 4;
  // Left leg
  g.rect(cx - 8 + stanceL, legTop, lw, legH)
    .fill({ color: COL_GROMRIL })
    .stroke({ color: COL_GROMRIL_DK, width: 0.4 });
  // Right leg
  g.rect(cx + 4 + stanceR, legTop, lw, legH)
    .fill({ color: COL_GROMRIL })
    .stroke({ color: COL_GROMRIL_DK, width: 0.4 });
  // Highlight edge
  g.rect(cx - 8 + stanceL, legTop, 1, legH).fill({ color: COL_GROMRIL_HI, alpha: 0.35 });
  g.rect(cx + 4 + stanceR, legTop, 1, legH).fill({ color: COL_GROMRIL_HI, alpha: 0.35 });
  // Knee plate bulge
  const kY = legTop + legH * 0.45;
  g.roundRect(cx - 9 + stanceL, kY, lw + 2, 3, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.6 });
  g.roundRect(cx + 3 + stanceR, kY, lw + 2, 3, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.6 });
}

// Barrel-chested dwarven plate torso
function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  runeAlpha = 0.6,
): void {
  const tw = 13; // broad dwarven chest
  const x = cx - tw / 2 + tilt;

  // Breastplate body
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_GROMRIL })
    .stroke({ color: COL_GROMRIL_DK, width: 0.5 });

  // Chest highlight — rim light
  g.roundRect(x + 0.5, top + 0.5, tw - 1, 2.5, 1.5).fill({ color: COL_GROMRIL_RIM, alpha: 0.3 });
  // Left edge highlight
  g.moveTo(x + 0.5, top + 2).lineTo(x + 0.5, top + h - 2).stroke({ color: COL_GROMRIL_HI, width: 0.8, alpha: 0.4 });

  // Central breastplate seam
  g.moveTo(cx + tilt, top + 1).lineTo(cx + tilt, top + h - 2).stroke({ color: COL_GROMRIL_DK, width: 0.5, alpha: 0.5 });

  // Pauldron overlaps (shoulder plates)
  g.roundRect(x - 2, top, 5, 4, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.5 });
  g.roundRect(x + tw - 3, top, 5, 4, 1).fill({ color: COL_GROMRIL_HI, alpha: 0.5 });

  // Rune engravings
  const r1x = cx + tilt - 2;
  const r1y = top + 3;
  // Rune 1 — angular dwarf rune (top centre)
  g.moveTo(r1x, r1y)
    .lineTo(r1x + 1.5, r1y + 2.5)
    .lineTo(r1x + 3, r1y)
    .stroke({ color: COL_RUNE, width: 0.8, alpha: runeAlpha });
  g.moveTo(r1x + 1.5, r1y)
    .lineTo(r1x + 1.5, r1y + 2.5)
    .stroke({ color: COL_RUNE, width: 0.8, alpha: runeAlpha });

  // Rune 2 — left chest
  const r2x = cx + tilt - 5;
  const r2y = top + 5;
  g.moveTo(r2x, r2y)
    .lineTo(r2x, r2y + 2.5)
    .moveTo(r2x, r2y + 1.2)
    .lineTo(r2x + 1.8, r2y + 1.2)
    .lineTo(r2x + 1.8, r2y + 2.5)
    .stroke({ color: COL_RUNE, width: 0.7, alpha: runeAlpha });

  // Belt — thick armour band at waist
  g.rect(x, top + h - 3, tw, 3).fill({ color: COL_GROMRIL_DK });
  g.rect(x, top + h - 3, tw, 1).fill({ color: COL_GOLD, alpha: 0.45 });
  // Belt buckle
  g.roundRect(cx + tilt - 2, top + h - 3, 4, 3, 0.5).fill({ color: COL_GOLD_DK });
  g.rect(cx + tilt - 1, top + h - 2, 2, 1.5).fill({ color: COL_GOLD_HI, alpha: 0.7 });
}

// Dwarven horned helmet with nose guard
function drawHelmet(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 11;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Helmet dome
  g.roundRect(x, top, hw, hh, 3)
    .fill({ color: COL_HELMET })
    .stroke({ color: COL_GROMRIL_DK, width: 0.5 });

  // Helmet highlight
  g.roundRect(x + 1, top + 1, hw - 4, 3, 2).fill({ color: COL_HELMET_HI, alpha: 0.4 });

  // Brow rim band (gold)
  g.rect(x, top + hh - 2.5, hw, 2).fill({ color: COL_GOLD });
  g.rect(x, top + hh - 2.5, hw, 0.8).fill({ color: COL_GOLD_HI, alpha: 0.6 });

  // Left horn
  g.moveTo(x + 1, top + 2)
    .quadraticCurveTo(x - 4, top - 1, x - 3, top - 5)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.circle(x - 3, top - 5, 1).fill({ color: COL_HORN });

  // Right horn
  g.moveTo(x + hw - 1, top + 2)
    .quadraticCurveTo(x + hw + 4, top - 1, x + hw + 3, top - 5)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.circle(x + hw + 3, top - 5, 1).fill({ color: COL_HORN });

  // Nose guard
  g.rect(cx + tilt - 1, top + hh - 1.5, 2, 4.5)
    .fill({ color: COL_NOSEGUARD })
    .stroke({ color: COL_GROMRIL_DK, width: 0.3 });
  g.rect(cx + tilt - 0.3, top + hh - 1.5, 0.6, 4.5).fill({ color: COL_GROMRIL_HI, alpha: 0.4 });

  // Eyes in helmet shadow
  const eyeY = top + hh * 0.45;
  g.rect(cx + tilt - 3.5, eyeY, 1.3, 0.8).fill({ color: COL_SKIN, alpha: 0.9 });
  g.rect(cx + tilt + 2.2, eyeY, 1.3, 0.8).fill({ color: COL_SKIN, alpha: 0.9 });
  // Pupils
  g.circle(cx + tilt - 2.8, eyeY + 0.4, 0.4).fill({ color: COL_SHADOW });
  g.circle(cx + tilt + 2.8, eyeY + 0.4, 0.4).fill({ color: COL_SHADOW });
}

// Glorious braided beard with metal rings
function drawBeard(
  g: Graphics,
  cx: number,
  helmetBottom: number,
  sway: number,
  tilt = 0,
): void {
  const bw = 9;
  const x = cx - bw / 2 + tilt;

  // Upper beard mass (from under helmet)
  g.roundRect(x, helmetBottom - 1, bw, 5, 2).fill({ color: COL_BEARD });

  // Three main braids flowing down
  const braids = [-3, 0, 3];
  braids.forEach((offset, i) => {
    const bx = cx + offset + tilt + sway * (i % 2 === 0 ? 1 : -0.7) * 0.8;
    const braidLen = 9 - Math.abs(offset) * 0.5;
    g.moveTo(cx + offset * 0.6 + tilt, helmetBottom + 3)
      .quadraticCurveTo(bx, helmetBottom + 5, bx, helmetBottom + braidLen)
      .stroke({ color: i === 1 ? COL_BEARD : COL_BEARD_DK, width: 2.8 });
    // Braid highlight
    g.moveTo(cx + offset * 0.6 + tilt + 0.4, helmetBottom + 3)
      .quadraticCurveTo(bx + 0.4, helmetBottom + 5, bx + 0.4, helmetBottom + braidLen)
      .stroke({ color: COL_BEARD_HI, width: 0.6, alpha: 0.4 });

    // Metal ring on braid
    const ringY = helmetBottom + braidLen * 0.65;
    g.circle(bx, ringY, 1.4).fill({ color: COL_BEARD_RING });
    g.circle(bx, ringY, 0.7).fill({ color: COL_GOLD_HI, alpha: 0.7 });

    // Braid tip
    g.circle(bx, helmetBottom + braidLen, 1).fill({ color: COL_BEARD_DK });
  });

  // Side beard volume
  g.moveTo(x - 1, helmetBottom + 1)
    .quadraticCurveTo(x - 3, helmetBottom + 5, x - 1, helmetBottom + 9)
    .stroke({ color: COL_BEARD_DK, width: 1.8 });
  g.moveTo(x + bw + 1, helmetBottom + 1)
    .quadraticCurveTo(x + bw + 3, helmetBottom + 5, x + bw + 1, helmetBottom + 9)
    .stroke({ color: COL_BEARD_DK, width: 1.8 });
}

// Large round dwarven clan shield
function drawShield(
  g: Graphics,
  shieldX: number,
  shieldY: number,
  glowAlpha = 0,
): void {
  const sr = 8; // shield radius

  // Magic glow aura behind shield (for cast)
  if (glowAlpha > 0.01) {
    g.circle(shieldX, shieldY, sr + 4).fill({ color: COL_MAGIC_RING, alpha: glowAlpha * 0.3 });
    g.circle(shieldX, shieldY, sr + 2).fill({ color: COL_MAGIC_GLOW, alpha: glowAlpha * 0.2 });
  }

  // Shield face
  g.circle(shieldX, shieldY, sr)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_GROMRIL_DK, width: 0.5 });

  // Rim
  g.circle(shieldX, shieldY, sr).stroke({ color: COL_SHIELD_RIM, width: 1.5, alpha: 0.6 });
  g.circle(shieldX, shieldY, sr - 0.5).stroke({ color: COL_GOLD, width: 0.8, alpha: 0.5 });

  // Clan emblem — stylised dwarven mountain peak
  g.moveTo(shieldX - 5, shieldY + 3)
    .lineTo(shieldX - 2, shieldY - 3)
    .lineTo(shieldX, shieldY - 5)
    .lineTo(shieldX + 2, shieldY - 3)
    .lineTo(shieldX + 5, shieldY + 3)
    .stroke({ color: COL_RUNE, width: 0.9, alpha: 0.8 });
  // Snow cap on peak
  g.moveTo(shieldX - 1.2, shieldY - 3.5)
    .lineTo(shieldX, shieldY - 5)
    .lineTo(shieldX + 1.2, shieldY - 3.5)
    .stroke({ color: COL_GOLD_HI, width: 0.7 });

  // Cross-straps on back (visible at edges)
  g.moveTo(shieldX - 5, shieldY - 2).lineTo(shieldX + 5, shieldY + 2).stroke({ color: COL_GROMRIL_DK, width: 0.5, alpha: 0.3 });
  g.moveTo(shieldX - 5, shieldY + 2).lineTo(shieldX + 5, shieldY - 2).stroke({ color: COL_GROMRIL_DK, width: 0.5, alpha: 0.3 });

  // Gold central boss
  g.circle(shieldX, shieldY, 2.5).fill({ color: COL_SHIELD_BOSS });
  g.circle(shieldX, shieldY, 2.5).stroke({ color: COL_GOLD_DK, width: 0.4 });
  g.circle(shieldX, shieldY, 1.2).fill({ color: COL_GOLD_HI, alpha: 0.8 });

  // Shield highlight (top-left rim)
  g.arc(shieldX, shieldY, sr - 1, Math.PI * 1.15, Math.PI * 1.65).stroke({ color: COL_GROMRIL_RIM, width: 1, alpha: 0.5 });
}

// Heavy dwarven war-axe
function drawAxe(
  g: Graphics,
  haftX: number,
  haftY: number,
  tipX: number,
  tipY: number,
  angle: number, // rotation of the axe head
): void {
  // Haft
  g.moveTo(haftX, haftY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_AXE_HAFT, width: 2.2 });
  // Haft highlight
  g.moveTo(haftX + 0.5, haftY)
    .lineTo(tipX + 0.5, tipY)
    .stroke({ color: COL_AXE_HAFT_HI, width: 0.7, alpha: 0.5 });
  // Gold bands on haft
  const mid1 = 0.35;
  const mid2 = 0.65;
  g.circle(lerp(haftX, tipX, mid1), lerp(haftY, tipY, mid1), 1.4).fill({ color: COL_AXE_BAND });
  g.circle(lerp(haftX, tipX, mid2), lerp(haftY, tipY, mid2), 1.4).fill({ color: COL_AXE_BAND });

  // Axe head at tip
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bladeH = 9;

  // Blade shape — broad crescent
  const b1x = tipX + cos * 4;
  const b1y = tipY + sin * 4;
  const b2x = tipX - cos * 2;
  const b2y = tipY - sin * 2;

  // Blade polygon
  g.moveTo(tipX, tipY)
    .lineTo(b1x - sin * (bladeH / 2), b1y + cos * (bladeH / 2))
    .quadraticCurveTo(b1x + cos * 1, b1y + sin * 1, b1x + sin * (bladeH / 2), b1y - cos * (bladeH / 2))
    .lineTo(tipX, tipY)
    .closePath()
    .fill({ color: COL_AXE_BLADE })
    .stroke({ color: COL_GROMRIL_DK, width: 0.4 });

  // Beard (lower extension of dwarven axe blade)
  g.moveTo(tipX, tipY)
    .lineTo(b1x - sin * (bladeH / 2), b1y + cos * (bladeH / 2))
    .lineTo(b2x - sin * (bladeH / 2 + 2), b2y + cos * (bladeH / 2 + 2))
    .closePath()
    .fill({ color: COL_GROMRIL_DK, alpha: 0.4 });

  // Blade highlight (edge)
  g.moveTo(b1x - sin * (bladeH / 2), b1y + cos * (bladeH / 2))
    .lineTo(b1x + sin * (bladeH / 2), b1y - cos * (bladeH / 2))
    .stroke({ color: COL_AXE_HI, width: 1 });

  // Rune on axe head
  g.moveTo(b1x - 1.5, b1y)
    .lineTo(b1x + 1.5, b1y)
    .moveTo(b1x, b1y - 2)
    .lineTo(b1x, b1y + 2)
    .stroke({ color: COL_RUNE, width: 0.6, alpha: 0.7 });
}

// Armoured arm
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Upper arm plate
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_GROMRIL, width: 3.5 });
  // Highlight
  g.moveTo(sx + 0.5, sy).lineTo(ex + 0.5, ey).stroke({ color: COL_GROMRIL_HI, width: 1, alpha: 0.35 });
  // Gold elbow/wrist band
  const elbowT = 0.5;
  const ex2 = lerp(sx, ex, elbowT);
  const ey2 = lerp(sy, ey, elbowT);
  g.circle(ex2, ey2, 1.8).fill({ color: COL_GOLD, alpha: 0.5 });
  // Gauntlet
  g.roundRect(ex - 2, ey - 2, 4, 3.5, 1)
    .fill({ color: COL_GROMRIL_DK })
    .stroke({ color: COL_GOLD, width: 0.4, alpha: 0.5 });
}

// Rune glow on armour (drawn over torso)
function drawRuneGlow(
  g: Graphics,
  cx: number,
  torsoTop: number,
  intensity: number,
): void {
  const alpha = intensity;
  // Halo around chest runes
  g.circle(cx - 0.5, torsoTop + 4.5, 2 + intensity * 1.5).fill({ color: COL_RUNE_GLOW, alpha: alpha * 0.35 });
  // Left rune glow
  g.circle(cx - 3.5, torsoTop + 6.5, 1.5 + intensity).fill({ color: COL_RUNE_GLOW, alpha: alpha * 0.25 });
  // Bright centre dot
  g.circle(cx - 0.5, torsoTop + 4.5, 0.8).fill({ color: COL_RUNE_BRIGHT, alpha: alpha * 0.8 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6; // subtle chest rise
  const runePulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0..1
  const beardSway = Math.sin(t * Math.PI * 2) * 0.4;

  // Dwarf proportions: short and wide
  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + breathe;
  const helmetTop = torsoTop - 9;

  drawShadow(g, CX, GY, 11, 2.5);

  // Shield braced on left arm
  const shieldX = CX - 11;
  const shieldY = torsoTop + 4;
  drawShield(g, shieldX, shieldY);

  drawSabatons(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, 0, 0.4 + runePulse * 0.5);
  drawRuneGlow(g, CX, torsoTop, 0.2 + runePulse * 0.45);

  // Shield arm (left) — braced forward
  drawArm(g, CX - 3, torsoTop + 2, shieldX + 6, shieldY);

  // Axe arm (right) — held ready at side
  const axeHandX = CX + 9;
  const axeHandY = torsoTop + 5;
  drawArm(g, CX + 5, torsoTop + 2, axeHandX, axeHandY);
  drawAxe(g, axeHandX, axeHandY, axeHandX + 2, axeHandY - 10, 0.15);

  drawHelmet(g, CX, helmetTop);
  drawBeard(g, CX, helmetTop + 9, beardSway);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 0.8; // heavy footstep bob

  const legH = 7;
  const torsoH = 9;
  const stanceL = Math.round(stride * 2.5);
  const stanceR = Math.round(-stride * 2.5);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH - bob;
  const helmetTop = torsoTop - 9;

  const beardSway = -stride * 1.2;
  const march = stride * 0.5; // slight torso sway in march

  drawShadow(g, CX, GY, 11, 2.5);

  // Shield stays forward — march with shield raised
  const shieldX = CX - 10 + march;
  const shieldY = torsoTop + 3;
  drawShield(g, shieldX, shieldY);

  drawSabatons(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, march, 0.6);
  drawRuneGlow(g, CX, torsoTop, 0.3);

  drawArm(g, CX - 3 + march, torsoTop + 2, shieldX + 6, shieldY);

  // Axe pumps slightly with march
  const axeHandX = CX + 9 + march;
  const axeHandY = torsoTop + 5 - stride * 1.5;
  drawArm(g, CX + 5 + march, torsoTop + 2, axeHandX, axeHandY);
  drawAxe(g, axeHandX, axeHandY, axeHandX + 2, axeHandY - 10, 0.15 + march * 0.1);

  drawHelmet(g, CX, helmetTop, march * 0.4);
  drawBeard(g, CX, helmetTop + 9, beardSway, march * 0.4);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up (axe raises behind head) 2-3: overhead chop (axe slams down) 4-5: impact 6-7: recover
  const phases = [0, 0.13, 0.28, 0.43, 0.58, 0.71, 0.84, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;
  const helmetTop = torsoTop - 9;

  // Lunging forward on chop
  const lunge = t > 0.25 && t < 0.75 ? Math.sin((t - 0.25) / 0.5 * Math.PI) * 4 : 0;
  const stanceR = Math.round(lunge);

  // Torso leans forward into chop
  const lean = t < 0.45 ? lerp(0, 2.5, clamp01(t / 0.3)) : lerp(2.5, 0, clamp01((t - 0.45) / 0.55));

  drawShadow(g, CX + lean * 0.4, GY, 12 + lunge, 2.5);

  // Shield stays braced during attack
  const shieldX = CX - 9 + lean * 0.3;
  const shieldY = torsoTop + 4;
  drawShield(g, shieldX, shieldY);

  drawSabatons(g, CX, GY, -1, stanceR);
  drawLegs(g, CX, legTop, legH, -1, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, lean, 0.7);
  drawRuneGlow(g, CX, torsoTop, 0.5 + lean * 0.1);

  // Shield arm
  drawArm(g, CX - 3 + lean, torsoTop + 2, shieldX + 6, shieldY);

  // Axe arm — overhead wind-up then chop
  let axeAngle: number;
  let axeHandX: number;
  let axeHandY: number;

  if (t < 0.3) {
    // Wind up — raise axe above head and back
    const ut = t / 0.3;
    axeHandX = CX + 6 + lean - ut * 2;
    axeHandY = torsoTop + 4 - ut * 10;
    axeAngle = lerp(0.15, -1.2, ut); // axe rotates back
  } else if (t < 0.55) {
    // Chop DOWN — fast powerful swing
    const ct = (t - 0.3) / 0.25;
    axeHandX = CX + 8 + lean + ct * 4;
    axeHandY = torsoTop - 6 + ct * 16;
    axeAngle = lerp(-1.2, 1.0, ct);
  } else {
    // Follow-through and recovery
    const rt = (t - 0.55) / 0.45;
    axeHandX = CX + 12 + lean - rt * 4;
    axeHandY = torsoTop + 10 - rt * 6;
    axeAngle = lerp(1.0, 0.15, rt);
  }

  drawArm(g, CX + 5 + lean, torsoTop + 2, axeHandX, axeHandY);
  drawAxe(g, axeHandX, axeHandY, axeHandX + 1.5, axeHandY - 10, axeAngle);

  // Impact shockwave at frame 3-4
  if (t >= 0.4 && t <= 0.65) {
    const impT = (t - 0.4) / 0.25;
    const r = impT * 6;
    g.circle(axeHandX + 2, axeHandY + 2, r).stroke({ color: COL_RUNE_GLOW, width: 0.8, alpha: (1 - impT) * 0.5 });
  }

  drawHelmet(g, CX, helmetTop, lean * 0.3);
  drawBeard(g, CX, helmetTop + 9, -lean * 0.5, lean * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5; // fast pulse
  const buildup = clamp01(t * 1.4);

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;
  const helmetTop = torsoTop - 9;

  // Magical energy circles around dwarf
  for (let i = 0; i < 5; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI * 2 / 5);
    const dist = 7 + buildup * 8;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + 3 + Math.sin(angle) * dist * 0.35;
    g.circle(px, py, 0.8 + pulse * 0.5).fill({ color: COL_RUNE_GLOW, alpha: 0.15 + pulse * 0.2 });
  }

  // Larger protective ring
  const ringR = 10 + buildup * 6;
  g.circle(CX, torsoTop + 3, ringR).stroke({ color: COL_MAGIC_RING, width: 1, alpha: 0.12 + pulse * 0.1 });
  g.circle(CX, torsoTop + 3, ringR - 3).stroke({ color: COL_MAGIC_GLOW, width: 0.5, alpha: 0.08 + pulse * 0.08 });

  drawShadow(g, CX, GY, 11 + buildup * 3, 2.5, 0.3 + buildup * 0.1);

  // Shield raised high, blazing with protective runes
  const shieldX = CX - 10;
  const shieldY = torsoTop + 1 - buildup * 2;
  drawShield(g, shieldX, shieldY, 0.25 + pulse * 0.35);

  drawSabatons(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH, 0, 0.5 + pulse * 0.7); // runes at full intensity
  drawRuneGlow(g, CX, torsoTop, 0.4 + pulse * 0.6);

  // Shield arm raised high
  drawArm(g, CX - 3, torsoTop + 2, shieldX + 5, shieldY + 5);

  // Axe arm — raised pointing skyward, channeling magic
  const axeHandX = CX + 7;
  const axeHandY = torsoTop - 2 - buildup * 3;
  drawArm(g, CX + 5, torsoTop + 2, axeHandX, axeHandY);
  drawAxe(g, axeHandX, axeHandY, axeHandX + 1, axeHandY - 9, -0.1);

  // Rune flash on axe head
  const axeTipX = axeHandX + 1;
  const axeTipY = axeHandY - 9;
  g.circle(axeTipX + 3, axeTipY, 1.5 + pulse * 2).fill({ color: COL_RUNE_BRIGHT, alpha: (0.2 + pulse * 0.5) });
  g.circle(axeTipX + 3, axeTipY, 0.7).fill({ color: COL_RUNE_BRIGHT, alpha: 0.9 });

  drawHelmet(g, CX, helmetTop);
  // Helmet rune on visor also glowing
  g.rect(CX - 1, helmetTop + 5, 2, 3).fill({ color: COL_RUNE_GLOW, alpha: pulse * 0.5 });

  drawBeard(g, CX, helmetTop + 9, pulse * 0.3);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 7;
  const torsoH = 9;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;

  // Dwarf falls to knee on shield, then slumps sideways
  // Phase 1 (t<0.4): knee drop — sinks down
  // Phase 2 (t>=0.4): sideways slump to the right

  const sinkDown = Math.min(t / 0.4, 1.0) * 5; // how much it drops
  const slump = Math.max((t - 0.4) / 0.6, 0); // sideways tip
  const slumpX = slump * 10;
  const slumpAngle = slump * 0.65;

  const adjTop = torsoTop + sinkDown;
  const adjHelmetTop = adjTop - 9;

  drawShadow(g, CX + slumpX * 0.3, GY, 11 + slump * 4, 2.5 + sinkDown * 0.2);

  // Shield hits the ground first (plants as dwarf kneels)
  if (t < 0.6) {
    const sdy = torsoTop + 4 + sinkDown * 0.6;
    const sdx = CX - 9 + slumpX * 0.2;
    drawShield(g, sdx, sdy);
  } else {
    // Shield on the ground
    const sdy = GY - 4;
    const sdx = CX - 7 + slumpX * 0.3;
    drawShield(g, sdx, sdy);
  }

  // Legs — one kneeling
  if (t < 0.5) {
    drawSabatons(g, CX, GY, 0, 0);
    drawLegs(g, CX, legTop + sinkDown * 0.5, legH, 0, 0);
  } else {
    // Both legs splayed
    drawSabatons(g, CX, GY, -3 - slumpX * 0.1, 2 + slumpX * 0.2);
    drawLegs(g, CX, legTop + sinkDown * 0.6, legH * 0.7, -3, 2 + slumpX * 0.2);
  }

  drawTorso(g, CX + slumpX * 0.4, adjTop, torsoH * (1 - slump * 0.1), slumpAngle * 2.5, 0.15);
  drawRuneGlow(g, CX + slumpX * 0.4, adjTop, (1 - t) * 0.3);

  // Axe drops and falls
  if (t < 0.7) {
    const dropT = Math.max(0, (t - 0.2) / 0.5);
    const axeX = CX + 9 + slumpX * 0.4 + dropT * 8;
    const axeY = adjTop + 4 + dropT * 10;
    drawAxe(g, axeX, axeY, axeX + 1, axeY - 8, 0.2 + dropT * 1.5);
  } else {
    // Axe lying on ground
    drawAxe(g, CX + 14, GY - 2, CX + 16, GY - 9, 1.5);
  }

  // Shield arm — braced on shield
  if (t < 0.6) {
    const sdx = CX - 9 + slumpX * 0.2;
    const sdy = torsoTop + 4 + sinkDown * 0.6;
    drawArm(g, CX - 3 + slumpX * 0.2, adjTop + 2, sdx + 5, sdy);
  }

  // Axe arm — falls limp
  if (t > 0.3) {
    drawArm(
      g,
      CX + 5 + slumpX * 0.4,
      adjTop + 2,
      CX + 12 + slumpX * 0.5,
      adjTop + 9 + sinkDown,
    );
  }

  drawHelmet(g, CX + slumpX * 0.4, adjHelmetTop, slumpAngle * 2.5);
  drawBeard(g, CX + slumpX * 0.4, adjHelmetTop + 9, slumpX * 0.2, slumpAngle * 2.5);
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
 * Generate all Ironbreaker sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateIronbreakerFrames(renderer: Renderer): RenderTexture[] {
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
