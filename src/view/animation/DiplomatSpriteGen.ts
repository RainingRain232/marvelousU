// Procedural sprite generator for the Diplomat unit type.
//
// Draws a medieval fantasy aristocrat/diplomat at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Rich doublet with gold embroidery and gem buttons
//   • Flowing velvet cape with fur-trimmed collar
//   • Elaborate ruffled cravat with jewelled brooch
//   • Feathered beret with gold medallion
//   • Ornate scroll case with wax seal
//   • Leather gloves and polished buckled boots
//   • Signet ring and diplomatic sash
//   • Trimmed goatee and distinguished expression

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Skin
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_HI = 0xffe8d6;
const COL_SKIN_SH = 0xd4a880;

// Doublet — deep royal purple
const COL_DOUBLET = 0x2e1a47;
const COL_DOUBLET_LT = 0x4a2d6a;
const COL_DOUBLET_DK = 0x1a0e2e;

// Gold trim / embroidery
const COL_TRIM = 0xd4af37;
const COL_TRIM_HI = 0xf5d76e;
const COL_TRIM_DK = 0x9e8429;

// Cape — deep crimson
const COL_CAPE = 0x8b0000;
const COL_CAPE_LT = 0xa02020;
const COL_CAPE_DK = 0x5c0000;

// Cape fur trim
const COL_FUR = 0xe8dcc8;
const COL_FUR_DK = 0xc8b89a;

// Cravat
const COL_CRAVAT = 0xffffff;
const COL_CRAVAT_SH = 0xdddddd;

// Sash — diplomatic sash across chest
const COL_SASH = 0x1e3a6b;
const COL_SASH_LT = 0x2e4a8b;

// Pants
const COL_PANT = 0x1a1a2e;
const COL_PANT_LT = 0x2a2a3e;

// Boots
const COL_BOOT = 0x2a1810;
const COL_BOOT_HI = 0x3a2820;
const COL_BUCKLE = 0xd4af37;

// Scroll
const COL_SCROLL = 0xf5f5dc;
const COL_SCROLL_DK = 0xd4d4aa;
const COL_SCROLL_TIE = 0x8b4513;
const COL_WAX = 0xcc2222;

// Hair / hat
const COL_HAIR = 0x3d2314;
const COL_HAIR_LT = 0x5d3324;
const COL_HAT = 0x2e1a47;
const COL_HAT_LT = 0x3e2a57;
const COL_FEATHER = 0xcc2222;
const COL_FEATHER_TIP = 0xff6644;

// Gloves
const COL_GLOVE = 0x4a3020;
const COL_GLOVE_LT = 0x5a4030;

// Gem / brooch
const COL_GEM = 0x2266ff;
const COL_GEM_HI = 0x66aaff;
const COL_RING = 0xd4af37;

const COL_SHADOW = 0x000000;
const COL_EYE = 0x222222;
const COL_MOUTH = 0x994444;
const COL_GOATEE = 0x3d2314;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}
function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}
function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w: number): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

// ---------------------------------------------------------------------------
// Sub-routines — reusable body parts
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, ox = 0, scale = 1): void {
  ellipse(g, CX + ox, GY + 1, 12 * scale, 3, COL_SHADOW, 0.3);
}

function drawBoots(g: Graphics, lx: number, rx: number, ly: number, ry: number): void {
  // Left boot
  rect(g, lx, ly, 6, 6, COL_BOOT);
  rect(g, lx + 1, ly, 4, 5, COL_BOOT_HI);
  // Boot sole
  rect(g, lx - 1, ly + 5, 8, 1, COL_BOOT);
  // Buckle
  rect(g, lx + 1, ly + 1, 4, 2, COL_BUCKLE);
  circle(g, lx + 3, ly + 2, 0.8, COL_TRIM_HI);

  // Right boot
  rect(g, rx, ry, 6, 6, COL_BOOT);
  rect(g, rx + 1, ry, 4, 5, COL_BOOT_HI);
  rect(g, rx - 1, ry + 5, 8, 1, COL_BOOT);
  rect(g, rx + 1, ry + 1, 4, 2, COL_BUCKLE);
  circle(g, rx + 3, ry + 2, 0.8, COL_TRIM_HI);
}

function drawLegs(g: Graphics, bob: number, legSwing = 0): void {
  const ly = GY - 20 + bob;
  // Left leg
  rect(g, CX - 6 - legSwing * 0.3, ly, 5, 16, COL_PANT);
  rect(g, CX - 5 - legSwing * 0.3, ly, 3, 15, COL_PANT_LT);
  // Right leg
  rect(g, CX + 1 + legSwing * 0.3, ly, 5, 16, COL_PANT);
  rect(g, CX + 2 + legSwing * 0.3, ly, 3, 15, COL_PANT_LT);

  // Boots
  drawBoots(
    g,
    CX - 7 - legSwing * 0.5, CX + 1 + legSwing * 0.5,
    GY - 5, GY - 5,
  );
}

function drawCape(g: Graphics, bob: number, capeWave = 0): void {
  // Main cape body
  g.beginPath();
  g.moveTo(CX - 10, GY - 28 + bob);
  g.lineTo(CX - 14 + capeWave, GY - 2);
  g.lineTo(CX + 14 - capeWave, GY - 2);
  g.lineTo(CX + 10, GY - 28 + bob);
  g.closePath();
  g.fill({ color: COL_CAPE_DK });

  // Cape inner lining
  g.beginPath();
  g.moveTo(CX - 8, GY - 26 + bob);
  g.lineTo(CX - 12 + capeWave, GY - 4);
  g.lineTo(CX + 12 - capeWave, GY - 4);
  g.lineTo(CX + 8, GY - 26 + bob);
  g.closePath();
  g.fill({ color: COL_CAPE });

  // Cape highlight fold
  g.beginPath();
  g.moveTo(CX, GY - 26 + bob);
  g.lineTo(CX - 3, GY - 6);
  g.lineTo(CX + 3, GY - 6);
  g.closePath();
  g.fill({ color: COL_CAPE_LT, alpha: 0.3 });

  // Fur collar trim
  ellipse(g, CX, GY - 28 + bob, 12, 3, COL_FUR);
  ellipse(g, CX, GY - 28 + bob, 10, 2.5, COL_FUR_DK);
  // Fur tufts
  for (let i = -3; i <= 3; i++) {
    circle(g, CX + i * 3, GY - 28 + bob, 1.5, COL_FUR);
  }
}

function drawDoublet(g: Graphics, bob: number): void {
  const ty = GY - 28 + bob;
  // Main doublet body
  rect(g, CX - 10, ty, 20, 16, COL_DOUBLET);
  rect(g, CX - 8, ty + 2, 16, 12, COL_DOUBLET_LT);

  // Gold trim — top edge
  rect(g, CX - 10, ty, 20, 2, COL_TRIM);
  rect(g, CX - 10, ty, 20, 1, COL_TRIM_HI);
  // Gold trim — bottom edge
  rect(g, CX - 10, ty + 14, 20, 2, COL_TRIM);
  // Gold trim — center line
  rect(g, CX - 1, ty + 2, 2, 12, COL_TRIM_DK);

  // Embroidery — gold diamond pattern on sides
  for (let i = 0; i < 3; i++) {
    const ey = ty + 4 + i * 4;
    // Left side
    circle(g, CX - 6, ey, 0.8, COL_TRIM);
    circle(g, CX - 4, ey + 1, 0.5, COL_TRIM_HI);
    // Right side
    circle(g, CX + 6, ey, 0.8, COL_TRIM);
    circle(g, CX + 4, ey + 1, 0.5, COL_TRIM_HI);
  }

  // Gem buttons down the center
  for (let i = 0; i < 3; i++) {
    const by = ty + 4 + i * 4;
    circle(g, CX, by, 1.5, COL_GEM);
    circle(g, CX - 0.5, by - 0.5, 0.7, COL_GEM_HI);
  }

  // Diplomatic sash (diagonal across chest)
  line(g, CX - 8, ty + 2, CX + 8, ty + 14, COL_SASH, 3);
  line(g, CX - 7, ty + 2, CX + 9, ty + 14, COL_SASH_LT, 1);

  // Shoulder epaulettes
  ellipse(g, CX - 10, ty + 2, 3, 2, COL_TRIM);
  ellipse(g, CX + 10, ty + 2, 3, 2, COL_TRIM);
  circle(g, CX - 10, ty + 2, 1, COL_TRIM_HI);
  circle(g, CX + 10, ty + 2, 1, COL_TRIM_HI);
}

function drawCravat(g: Graphics, bob: number): void {
  const ty = GY - 28 + bob;
  // Ruffled cravat
  g.beginPath();
  g.moveTo(CX, ty - 1);
  g.lineTo(CX - 5, ty + 4);
  g.lineTo(CX, ty + 3);
  g.lineTo(CX + 5, ty + 4);
  g.closePath();
  g.fill({ color: COL_CRAVAT });

  // Ruffles
  g.beginPath();
  g.moveTo(CX - 4, ty + 3);
  g.lineTo(CX - 3, ty + 1);
  g.lineTo(CX - 1, ty + 3);
  g.lineTo(CX + 1, ty + 1);
  g.lineTo(CX + 3, ty + 3);
  g.stroke({ color: COL_CRAVAT_SH, width: 0.5 });

  // Brooch gem at center of cravat
  circle(g, CX, ty + 1, 2, COL_RING);
  circle(g, CX, ty + 1, 1.2, COL_GEM);
  circle(g, CX - 0.3, ty + 0.7, 0.5, COL_GEM_HI);
}

function drawHead(g: Graphics, bob: number): void {
  const hy = GY - 36 + bob;

  // Neck
  rect(g, CX - 3, hy + 6, 6, 4, COL_SKIN);

  // Head shape
  rect(g, CX - 5, hy, 10, 10, COL_SKIN);
  rect(g, CX - 4, hy + 1, 8, 8, COL_SKIN_HI);
  // Jaw shadow
  rect(g, CX - 4, hy + 7, 8, 2, COL_SKIN_SH);

  // Eyes
  rect(g, CX - 3, hy + 3, 2, 2, 0xffffff);
  rect(g, CX + 1, hy + 3, 2, 2, 0xffffff);
  rect(g, CX - 2.5, hy + 3.5, 1.2, 1.2, COL_EYE);
  rect(g, CX + 1.5, hy + 3.5, 1.2, 1.2, COL_EYE);
  // Eyebrows
  rect(g, CX - 3.5, hy + 2, 3, 0.8, COL_HAIR);
  rect(g, CX + 0.5, hy + 2, 3, 0.8, COL_HAIR);

  // Nose
  rect(g, CX - 0.5, hy + 4, 1, 2, COL_SKIN_SH);

  // Mouth
  rect(g, CX - 1.5, hy + 7, 3, 0.8, COL_MOUTH);

  // Goatee
  rect(g, CX - 1.5, hy + 8, 3, 2, COL_GOATEE);
  rect(g, CX - 1, hy + 9.5, 2, 1, COL_GOATEE);

  // Ears
  circle(g, CX - 5, hy + 4, 1.5, COL_SKIN);
  circle(g, CX + 5, hy + 4, 1.5, COL_SKIN);
  circle(g, CX - 5, hy + 4, 0.7, COL_SKIN_SH);
  circle(g, CX + 5, hy + 4, 0.7, COL_SKIN_SH);
}

function drawHat(g: Graphics, bob: number, tilt = 0): void {
  const hy = GY - 36 + bob;

  // Hair visible under hat
  rect(g, CX - 5, hy + 1, 2, 5, COL_HAIR);
  rect(g, CX + 3, hy + 1, 2, 5, COL_HAIR);
  rect(g, CX - 4, hy, 8, 2, COL_HAIR_LT);

  // Beret body
  ellipse(g, CX + tilt, hy - 2, 8, 4, COL_HAT);
  ellipse(g, CX + tilt, hy - 2, 7, 3, COL_HAT_LT);
  // Brim
  rect(g, CX - 7 + tilt, hy, 14, 2, COL_HAT);

  // Gold medallion on hat
  circle(g, CX - 3 + tilt, hy - 1, 2, COL_TRIM);
  circle(g, CX - 3 + tilt, hy - 1, 1.2, COL_TRIM_HI);

  // Feather
  const fx = CX + 5 + tilt;
  const fy = hy - 3;
  // Feather quill
  line(g, fx, fy + 4, fx + 2, fy - 8, COL_FEATHER, 1);
  // Feather barbs
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const px = fx + 2 * t;
    const py = fy + 4 - 12 * t;
    line(g, px, py, px + 3, py - 1, COL_FEATHER, 1.5);
    line(g, px, py, px - 2, py - 1, COL_FEATHER, 0.8);
  }
  // Feather tip
  circle(g, fx + 2, fy - 8, 1.5, COL_FEATHER_TIP);
}

function drawArms(g: Graphics, bob: number, lArmY = 0, rArmY = 0): void {
  // Left arm
  rect(g, CX - 13, GY - 24 + bob + lArmY, 4, 10, COL_DOUBLET);
  rect(g, CX - 12, GY - 24 + bob + lArmY, 2, 9, COL_DOUBLET_LT);
  // Gold cuff
  rect(g, CX - 13, GY - 15 + bob + lArmY, 4, 2, COL_TRIM);
  // Gloved hand
  circle(g, CX - 11, GY - 12 + bob + lArmY, 2.5, COL_GLOVE);
  circle(g, CX - 11, GY - 12 + bob + lArmY, 1.5, COL_GLOVE_LT);

  // Right arm
  rect(g, CX + 9, GY - 24 + bob + rArmY, 4, 10, COL_DOUBLET);
  rect(g, CX + 10, GY - 24 + bob + rArmY, 2, 9, COL_DOUBLET_LT);
  // Gold cuff
  rect(g, CX + 9, GY - 15 + bob + rArmY, 4, 2, COL_TRIM);
  // Gloved hand
  circle(g, CX + 11, GY - 12 + bob + rArmY, 2.5, COL_GLOVE);
  circle(g, CX + 11, GY - 12 + bob + rArmY, 1.5, COL_GLOVE_LT);
  // Signet ring on right hand
  circle(g, CX + 12.5, GY - 12 + bob + rArmY, 1, COL_RING);
}

function drawScroll(g: Graphics, x: number, y: number, angle = 0): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const transform = (dx: number, dy: number) => ({
    x: x + dx * cos - dy * sin,
    y: y + dx * sin + dy * cos,
  });

  // Scroll tube
  const corners = [
    transform(-2.5, -6),
    transform(2.5, -6),
    transform(2.5, 6),
    transform(-2.5, 6),
  ];
  g.beginPath();
  g.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
  g.closePath();
  g.fill({ color: COL_SCROLL });

  // Scroll shading lines
  const sl1 = transform(-1, -5);
  const sl2 = transform(-1, 5);
  line(g, sl1.x, sl1.y, sl2.x, sl2.y, COL_SCROLL_DK, 0.5);
  const sr1 = transform(1, -5);
  const sr2 = transform(1, 5);
  line(g, sr1.x, sr1.y, sr2.x, sr2.y, COL_SCROLL_DK, 0.5);

  // Scroll end caps (rolled edges)
  const topC = transform(0, -6);
  const botC = transform(0, 6);
  ellipse(g, topC.x, topC.y, 3, 1.5, COL_SCROLL_DK);
  ellipse(g, botC.x, botC.y, 3, 1.5, COL_SCROLL_DK);

  // Ribbon tie
  const tie = transform(0, 0);
  rect(g, tie.x - 3.5, tie.y - 0.5, 7, 1.5, COL_SCROLL_TIE);
  // Wax seal
  circle(g, tie.x + 3, tie.y, 2, COL_WAX);
  circle(g, tie.x + 3, tie.y, 1, 0xee4444);
}

// ---------------------------------------------------------------------------
// Full figure composites
// ---------------------------------------------------------------------------

function drawFullDiplomat(g: Graphics, bob: number, legSwing = 0, armL = 0, armR = 0, capeWave = 0, hatTilt = 0): void {
  drawShadow(g);
  drawCape(g, bob, capeWave);
  drawLegs(g, bob, legSwing);
  drawDoublet(g, bob);
  drawCravat(g, bob);
  drawArms(g, bob, armL, armR);
  drawHead(g, bob);
  drawHat(g, bob, hatTilt);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function drawIdleDiplomat(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.8) * 0.5;
  drawFullDiplomat(g, breathe);

  // Scroll in right hand
  drawScroll(g, CX + 12, GY - 14 + breathe, -0.15);

  // Subtle cape sway indicator — gold clasp chain
  const chainSway = Math.sin(frame * 0.5) * 0.5;
  line(g, CX - 8, GY - 26 + breathe, CX + 8, GY - 26 + breathe + chainSway, COL_TRIM, 0.5);
}

function drawWalkingDiplomat(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 4;
  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 3;
  const capeWave = Math.sin(walkCycle * Math.PI * 2 + 1) * 2;

  drawFullDiplomat(g, bob, legSwing, armSwing, -armSwing, capeWave, Math.sin(walkCycle * Math.PI * 2) * 0.5);

  // Scroll bounces in right hand
  drawScroll(g, CX + 12, GY - 14 + bob - armSwing, -0.15 + armSwing * 0.04);
}

function drawAttackingDiplomat(g: Graphics, frame: number): void {
  const t = frame / 6;
  const lunge = Math.sin(t * Math.PI) * 3;
  const armRaise = t * 8;

  drawShadow(g);
  drawCape(g, lunge, -lunge * 0.5);
  drawLegs(g, lunge);
  drawDoublet(g, lunge);
  drawCravat(g, lunge);

  // Left arm normal
  rect(g, CX - 13, GY - 24 + lunge, 4, 10, COL_DOUBLET);
  rect(g, CX - 13, GY - 15 + lunge, 4, 2, COL_TRIM);
  circle(g, CX - 11, GY - 12 + lunge, 2.5, COL_GLOVE);

  // Right arm raised — presenting scroll
  rect(g, CX + 9, GY - 24 + lunge - armRaise, 4, 10, COL_DOUBLET);
  rect(g, CX + 9, GY - 15 + lunge - armRaise, 4, 2, COL_TRIM);
  circle(g, CX + 11, GY - 12 + lunge - armRaise, 2.5, COL_GLOVE);
  circle(g, CX + 12.5, GY - 12 + lunge - armRaise, 1, COL_RING);

  // Scroll being presented
  drawScroll(g, CX + 14, GY - 16 - armRaise, -0.4);

  drawHead(g, lunge);
  drawHat(g, lunge);

  // Diplomatic sparkle effects when presenting
  if (t > 0.3) {
    const sparkleAlpha = Math.min(1, (t - 0.3) * 2);
    for (let i = 0; i < 4; i++) {
      const angle = frame * 0.4 + i * Math.PI * 0.5;
      const dist = 6 + t * 8;
      const sx = CX + 14 + Math.cos(angle) * dist;
      const sy = GY - 20 - armRaise + Math.sin(angle) * dist;
      circle(g, sx, sy, 1.2, COL_TRIM_HI, sparkleAlpha);
      circle(g, sx, sy, 0.6, 0xffffff, sparkleAlpha);
    }
  }
}

function drawCastingDiplomat(g: Graphics, frame: number): void {
  const t = frame / 5;
  const raise = t * 5;

  drawShadow(g);
  drawCape(g, 0, Math.sin(t * Math.PI) * 1.5);
  drawLegs(g, 0);
  drawDoublet(g, 0);
  drawCravat(g, 0);

  // Both arms raised with scrolls
  const armY = -raise;
  rect(g, CX - 13, GY - 24 + armY, 4, 10, COL_DOUBLET);
  rect(g, CX - 13, GY - 15 + armY, 4, 2, COL_TRIM);
  circle(g, CX - 11, GY - 12 + armY, 2.5, COL_GLOVE);

  rect(g, CX + 9, GY - 24 + armY, 4, 10, COL_DOUBLET);
  rect(g, CX + 9, GY - 15 + armY, 4, 2, COL_TRIM);
  circle(g, CX + 11, GY - 12 + armY, 2.5, COL_GLOVE);
  circle(g, CX + 12.5, GY - 12 + armY, 1, COL_RING);

  // Two scrolls — one in each hand
  drawScroll(g, CX - 14, GY - 16 + armY, -0.3);
  drawScroll(g, CX + 16, GY - 16 + armY, 0.3);

  drawHead(g, 0);
  drawHat(g, 0);

  // Diplomatic aura — gold particles spiraling outward
  const particleCount = 6;
  for (let i = 0; i < particleCount; i++) {
    const angle = t * 2 + i * (Math.PI * 2 / particleCount);
    const dist = 8 + t * 14 + i * 2;
    const px = CX + Math.cos(angle) * dist;
    const py = GY - 30 + Math.sin(angle) * dist * 0.6 - raise;
    const alpha = Math.max(0, 1 - t * 0.5);
    circle(g, px, py, 1.5, COL_TRIM, alpha);
    circle(g, px, py, 0.7, COL_TRIM_HI, alpha);
  }

  // Seal glow at center
  const glowAlpha = Math.sin(t * Math.PI) * 0.5;
  circle(g, CX, GY - 30, 4 + t * 3, COL_TRIM, glowAlpha * 0.3);
  circle(g, CX, GY - 30, 2 + t * 2, COL_TRIM_HI, glowAlpha * 0.5);
}

function drawDyingDiplomat(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 20;
  const lean = t * 0.25;
  const fadeAlpha = Math.max(0, 1 - t * 0.3);

  // Shrinking shadow
  ellipse(g, CX, GY + 1, 12 - t * 4, 3 - t, COL_SHADOW, 0.3 * fadeAlpha);

  // Apply leaning rotation via offset approximation
  const ox = t * 6;
  const oy = fall;

  // Cape crumples
  g.beginPath();
  g.moveTo(CX - 10 + ox, GY - 28 + oy);
  g.lineTo(CX - 14 + ox, GY - 2 + oy * 0.5);
  g.lineTo(CX + 14 + ox, GY - 2 + oy * 0.5);
  g.lineTo(CX + 10 + ox, GY - 28 + oy);
  g.closePath();
  g.fill({ color: COL_CAPE_DK, alpha: fadeAlpha });

  // Legs
  rect(g, CX - 6 + ox, GY - 20 + oy, 5, 16, COL_PANT);
  rect(g, CX + 1 + ox, GY - 20 + oy, 5, 16, COL_PANT);

  // Boots
  rect(g, CX - 7 + ox, GY - 5 + oy * 0.3, 6, 5, COL_BOOT);
  rect(g, CX + 1 + ox, GY - 5 + oy * 0.3, 6, 5, COL_BOOT);

  // Doublet
  rect(g, CX - 10 + ox, GY - 28 + oy, 20, 16, COL_DOUBLET);
  // Sash
  line(g, CX - 8 + ox, GY - 26 + oy, CX + 8 + ox, GY - 14 + oy, COL_SASH, 2);

  // Cravat
  g.beginPath();
  g.moveTo(CX + ox, GY - 29 + oy);
  g.lineTo(CX - 4 + ox, GY - 25 + oy);
  g.lineTo(CX + 4 + ox, GY - 25 + oy);
  g.closePath();
  g.fill({ color: COL_CRAVAT, alpha: fadeAlpha });

  // Head
  rect(g, CX - 5 + ox, GY - 36 + oy, 10, 10, COL_SKIN);
  // Eyes closed
  rect(g, CX - 3 + ox, GY - 33 + oy + lean * 4, 2, 0.8, COL_EYE);
  rect(g, CX + 1 + ox, GY - 33 + oy + lean * 4, 2, 0.8, COL_EYE);

  // Hat falling off
  const hatFall = t * 8;
  const hatDrift = t * 12;
  ellipse(g, CX + hatDrift, GY - 38 + oy - hatFall * 0.3, 8, 4, COL_HAT);
  // Feather detaching
  if (t > 0.3) {
    const featherDrift = (t - 0.3) * 15;
    line(g, CX + hatDrift + 5, GY - 40 + oy, CX + hatDrift + 5 + featherDrift, GY - 44 + oy + featherDrift * 0.5, COL_FEATHER, 1);
  }

  // Arms limp
  rect(g, CX - 13 + ox, GY - 24 + oy + fall * 0.3, 4, 10, COL_DOUBLET);
  circle(g, CX - 11 + ox, GY - 12 + oy + fall * 0.3, 2.5, COL_GLOVE);
  rect(g, CX + 9 + ox, GY - 24 + oy + fall * 0.5, 4, 10, COL_DOUBLET);
  circle(g, CX + 11 + ox, GY - 12 + oy + fall * 0.5, 2.5, COL_GLOVE);

  // Scroll falling away
  if (t > 0.2) {
    const scrollFall = (t - 0.2) * 10;
    drawScroll(g, CX + 16 + scrollFall * 2, GY - 14 + oy + scrollFall * 3, t * 1.5);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateDiplomatFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();

      switch (state) {
        case UnitState.IDLE:
          drawIdleDiplomat(g, col);
          break;
        case UnitState.MOVE:
          drawWalkingDiplomat(g, col);
          break;
        case UnitState.ATTACK:
          drawAttackingDiplomat(g, col);
          break;
        case UnitState.CAST:
          drawCastingDiplomat(g, col);
          break;
        case UnitState.DIE:
          drawDyingDiplomat(g, col);
          break;
      }

      const texture = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }

  return frames;
}
