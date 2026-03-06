// Procedural sprite generator for the Valkyrie unit type.
//
// Draws a winged holy warrior at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Golden/white plate armor with ornate trim
//   * Feathered white wings at shoulders (small, decorative)
//   * Blonde hair flowing beneath a winged helm
//   * Spear in right hand, round shield on left arm
//   * Divine golden glow aura
//   * Upright heroic stance
//   * Charge attack with spear thrust forward

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- divine holy warrior
const COL_SKIN = 0xf0d0a8;       // fair skin

const COL_HAIR = 0xf0d060;       // blonde hair
const COL_HAIR_DK = 0xc8a840;    // hair shadow

const COL_ARMOR = 0xd4b868;      // golden plate armor
const COL_ARMOR_HI = 0xf0d888;   // armor highlight
const COL_ARMOR_DK = 0xa89048;   // armor shadow
const COL_ARMOR_WHITE = 0xe8e0d0;// white armor sections

const COL_HELM = 0xc8a850;       // winged helm
const COL_HELM_HI = 0xe0c878;    // helm highlight
const COL_HELM_WING = 0xe8e4d8;  // helm wing feather

const COL_WING = 0xf0eee8;       // white feather wings
const COL_WING_DK = 0xd0ccc0;    // wing shadow
const COL_WING_BONE = 0xe0d8c8;  // wing leading edge

const COL_SPEAR_SHAFT = 0x604828; // wooden shaft
const COL_SPEAR_HEAD = 0xc0c8d0;  // steel spear tip
const COL_SPEAR_HI = 0xe0e8f0;    // spear highlight

const COL_SHIELD = 0xc8a848;      // golden round shield
const COL_SHIELD_HI = 0xe0c868;   // shield highlight
const COL_SHIELD_RIM = 0x907830;  // shield rim
const COL_SHIELD_EMBLEM = 0xf0f0f0;// white emblem

const COL_BOOT = 0x907838;        // armored boot
const COL_BOOT_DK = 0x705828;     // boot shadow

const COL_SKIRT = 0xe0d8c8;       // armored skirt/tabard
const COL_SKIRT_DK = 0xc0b8a0;    // skirt shadow

const COL_GLOW = 0xffd040;        // divine golden glow
const COL_SHADOW = 0x000000;

/* -- helpers ------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------ */

function drawShadow(g: Graphics, cx: number, gy: number, w = 11, h = 3, alpha = 0.3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  const bw = 5;
  const bh = 5;
  // Left armored boot
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.rect(cx - 6 + stanceL, gy - bh + 1, 3, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
  // Right armored boot
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.rect(cx + 3 + stanceR, gy - bh + 1, 3, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  // Armored leg greaves
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_ARMOR });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_ARMOR });
  // Knee guards
  g.circle(cx - 3 + stanceL, legTop + legH * 0.4, 1.5).fill({ color: COL_ARMOR_HI, alpha: 0.5 });
  g.circle(cx + 3 + stanceR, legTop + legH * 0.4, 1.5).fill({ color: COL_ARMOR_HI, alpha: 0.5 });
}

function drawSkirt(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  // Armored battle skirt / tabard
  const sw = 14;
  const x = cx - sw / 2 + tilt;
  g.moveTo(x + 2, top)
    .lineTo(x + sw - 2, top)
    .lineTo(x + sw + 1, top + h)
    .lineTo(x - 1, top + h)
    .closePath()
    .fill({ color: COL_SKIRT })
    .stroke({ color: COL_SKIRT_DK, width: 0.4 });
  // Center stripe
  g.rect(cx - 1 + tilt, top, 2, h).fill({ color: COL_ARMOR, alpha: 0.3 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  // Golden plate armor chest
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.6 });
  // White center plate
  g.roundRect(x + 3, top + 1, tw - 6, h - 3, 1).fill({ color: COL_ARMOR_WHITE, alpha: 0.5 });
  // Chest highlight
  g.roundRect(x + 1, top + 1, tw - 2, 2, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
  // Ornate trim lines
  g.moveTo(x + 1, top + h - 1).lineTo(x + tw - 1, top + h - 1)
    .stroke({ color: COL_ARMOR_HI, width: 0.5, alpha: 0.6 });
}

function drawPauldrons(g: Graphics, cx: number, shoulderY: number, tilt = 0): void {
  // Left golden pauldron -- rounded
  g.roundRect(cx - 11 + tilt, shoulderY - 1, 6, 5, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.4 });
  g.roundRect(cx - 10 + tilt, shoulderY, 4, 2, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
  // Right golden pauldron
  g.roundRect(cx + 5 + tilt, shoulderY - 1, 6, 5, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.4 });
  g.roundRect(cx + 6 + tilt, shoulderY, 4, 2, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
}

function drawWings(g: Graphics, cx: number, wingTop: number, flapAngle = 0): void {
  // Left feathered wing
  const lx = cx - 8;
  const span = 11 + flapAngle * 4;
  // Primary feathers
  g.moveTo(lx, wingTop + 4)
    .lineTo(lx - span, wingTop - 3 - flapAngle * 3)
    .lineTo(lx - span + 2, wingTop - 1 - flapAngle * 2)
    .lineTo(lx - span * 0.7, wingTop + 2 - flapAngle)
    .lineTo(lx - span * 0.4, wingTop + 5)
    .lineTo(lx - 2, wingTop + 7)
    .closePath()
    .fill({ color: COL_WING });
  // Wing highlight on leading edge
  g.moveTo(lx, wingTop + 4).lineTo(lx - span, wingTop - 3 - flapAngle * 3)
    .stroke({ color: COL_WING_BONE, width: 1 });
  // Feather details
  for (let i = 1; i < 4; i++) {
    const frac = i / 4;
    const fx = lx - span * frac;
    const fy = wingTop + 2 - flapAngle * frac * 2;
    g.moveTo(lx - 1, wingTop + 5).lineTo(fx, fy)
      .stroke({ color: COL_WING_DK, width: 0.3, alpha: 0.5 });
  }

  // Right feathered wing
  const rx = cx + 8;
  g.moveTo(rx, wingTop + 4)
    .lineTo(rx + span, wingTop - 3 - flapAngle * 3)
    .lineTo(rx + span - 2, wingTop - 1 - flapAngle * 2)
    .lineTo(rx + span * 0.7, wingTop + 2 - flapAngle)
    .lineTo(rx + span * 0.4, wingTop + 5)
    .lineTo(rx + 2, wingTop + 7)
    .closePath()
    .fill({ color: COL_WING });
  g.moveTo(rx, wingTop + 4).lineTo(rx + span, wingTop - 3 - flapAngle * 3)
    .stroke({ color: COL_WING_BONE, width: 1 });
  for (let i = 1; i < 4; i++) {
    const frac = i / 4;
    const fx = rx + span * frac;
    const fy = wingTop + 2 - flapAngle * frac * 2;
    g.moveTo(rx + 1, wingTop + 5).lineTo(fx, fy)
      .stroke({ color: COL_WING_DK, width: 0.3, alpha: 0.5 });
  }
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 9;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Blonde hair flowing behind helm
  g.roundRect(x - 1, top + 3, hw + 2, hh + 2, 2).fill({ color: COL_HAIR_DK });
  g.moveTo(x - 1, top + 6).quadraticCurveTo(x - 2, top + hh + 5, x + 1, top + hh + 4)
    .stroke({ color: COL_HAIR, width: 2 });
  g.moveTo(x + hw + 1, top + 6).quadraticCurveTo(x + hw + 2, top + hh + 5, x + hw - 1, top + hh + 4)
    .stroke({ color: COL_HAIR, width: 2 });

  // Face
  g.roundRect(x + 1, top + 3, hw - 2, hh - 3, 2).fill({ color: COL_SKIN });

  // Winged helm
  g.moveTo(x, top + 4)
    .lineTo(x + 1, top)
    .lineTo(x + hw - 1, top)
    .lineTo(x + hw, top + 4)
    .lineTo(x + hw - 1, top + 3)
    .lineTo(x + 1, top + 3)
    .closePath()
    .fill({ color: COL_HELM })
    .stroke({ color: COL_ARMOR_DK, width: 0.4 });
  // Helm highlight
  g.rect(x + 2, top + 1, hw - 4, 1).fill({ color: COL_HELM_HI, alpha: 0.5 });
  // Helm wing decorations
  g.moveTo(x, top + 2).lineTo(x - 3, top - 2).lineTo(x - 1, top + 1)
    .stroke({ color: COL_HELM_WING, width: 1 });
  g.moveTo(x + hw, top + 2).lineTo(x + hw + 3, top - 2).lineTo(x + hw + 1, top + 1)
    .stroke({ color: COL_HELM_WING, width: 1 });

  // Eyes -- bright blue
  g.rect(cx - 2.5 + tilt, top + 5, 2, 1.2).fill({ color: 0x4488cc });
  g.rect(cx + 0.5 + tilt, top + 5, 2, 1.2).fill({ color: 0x4488cc });
  // Pupils
  g.circle(cx - 1.5 + tilt, top + 5.6, 0.4).fill({ color: 0x224466 });
  g.circle(cx + 1.5 + tilt, top + 5.6, 0.4).fill({ color: 0x224466 });
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ARMOR, width: 3 });
  // Gauntlet
  g.circle(ex, ey, 2).fill({ color: COL_ARMOR_HI });
}

function drawSpear(g: Graphics, bx: number, by: number, angle: number, len = 20): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * len;
  const tipY = by - cos * len;

  // Shaft
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_SPEAR_SHAFT, width: 1.8 });
  // Spear head -- diamond shape
  const headLen = 4;
  const hx = tipX + sin * headLen;
  const hy = tipY - cos * headLen;
  g.moveTo(tipX - cos * 1.5, tipY - sin * 1.5)
    .lineTo(hx, hy)
    .lineTo(tipX + cos * 1.5, tipY + sin * 1.5)
    .closePath()
    .fill({ color: COL_SPEAR_HEAD });
  // Highlight on blade
  g.moveTo(tipX, tipY).lineTo(hx, hy)
    .stroke({ color: COL_SPEAR_HI, width: 0.5, alpha: 0.7 });
  // Butt of shaft
  const buttX = bx - sin * 3;
  const buttY = by + cos * 3;
  g.circle(buttX, buttY, 1).fill({ color: COL_ARMOR_DK });
}

function drawShield(g: Graphics, cx: number, cy: number, size = 7): void {
  // Round shield
  g.circle(cx, cy, size)
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1 });
  // Inner ring
  g.circle(cx, cy, size - 2).stroke({ color: COL_SHIELD_HI, width: 0.5, alpha: 0.5 });
  // Center boss
  g.circle(cx, cy, 2).fill({ color: COL_SHIELD_RIM });
  g.circle(cx, cy, 1).fill({ color: COL_SHIELD_HI });
  // White wing emblem
  g.moveTo(cx - 2, cy).lineTo(cx, cy - 2).lineTo(cx + 2, cy)
    .stroke({ color: COL_SHIELD_EMBLEM, width: 0.8 });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 9;
  const wingFlap = Math.sin(t * Math.PI * 2) * 0.2;

  // Subtle divine glow behind
  g.circle(CX, torsoTop + 5, 14).fill({ color: COL_GLOW, alpha: 0.04 + Math.sin(t * Math.PI * 2) * 0.02 });

  drawShadow(g, CX, GY);
  drawWings(g, CX, torsoTop, wingFlap);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawSkirt(g, CX, legTop - 1, 4);
  drawTorso(g, CX, torsoTop, torsoH);
  drawPauldrons(g, CX, torsoTop);
  drawHead(g, CX, headTop);

  // Right arm -- spear held upright
  const rHandX = CX + 8;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, 0.05 + Math.sin(t * Math.PI * 2) * 0.02, 20);

  // Left arm -- shield held at side
  const lHandX = CX - 9;
  const lHandY = torsoTop + 6;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY + 1, 6);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.0;

  const legH = 7;
  const torsoH = 10;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 9;
  const wingFlap = walk * 0.5;

  g.circle(CX, torsoTop + 5, 12).fill({ color: COL_GLOW, alpha: 0.03 });

  drawShadow(g, CX, GY, 11 + Math.abs(walk) * 2, 3);
  drawWings(g, CX, torsoTop, wingFlap);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawSkirt(g, CX, legTop - 1, 4, walk * 0.3);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.3);
  drawPauldrons(g, CX, torsoTop, walk * 0.3);
  drawHead(g, CX, headTop, walk * 0.2);

  // Arms swing with march
  const armSwing = walk * 1.5;
  const rHandX = CX + 8 + armSwing * 0.3;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, 0.1 + walk * 0.04, 20);

  const lHandX = CX - 9 - armSwing * 0.3;
  const lHandY = torsoTop + 6;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
  drawShield(g, lHandX - 1, lHandY + 1, 6);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Charge attack -- spear thrust forward
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Charge lean
  const lean = t < 0.5 ? t * 4 : (1 - t) * 5;
  const lunge = t > 0.2 && t < 0.8 ? 4 : 0;
  const wingFlare = t < 0.4 ? t * 2.5 : (1 - t) * 2;

  // Golden charge glow
  if (t > 0.2 && t < 0.7) {
    const glowAlpha = clamp01(1 - Math.abs(t - 0.45) / 0.25) * 0.15;
    g.circle(CX + lean * 2, torsoTop + 5, 16).fill({ color: COL_GLOW, alpha: glowAlpha });
  }

  drawShadow(g, CX + lean, GY, 12 + lean, 3);
  drawWings(g, CX, torsoTop, wingFlare);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawSkirt(g, CX, legTop - 1, 4, lean * 0.5);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawPauldrons(g, CX, torsoTop, lean);
  drawHead(g, CX, headTop, lean * 0.4);

  // Spear thrust -- angles forward during charge
  let spearAngle: number;
  if (t < 0.25) {
    spearAngle = lerp(0.1, -0.6, t / 0.25); // pull back
  } else if (t < 0.55) {
    spearAngle = lerp(-0.6, 1.4, (t - 0.25) / 0.3); // thrust forward
  } else {
    spearAngle = lerp(1.4, 0.1, (t - 0.55) / 0.45); // recover
  }
  const spearReach = t < 0.55 ? t * 3 : (1 - t) * 5;
  const rHandX = CX + 8 + lean + spearReach;
  const rHandY = torsoTop + 4;
  drawArm(g, CX + 6 + lean, torsoTop + 3, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, spearAngle, 22);

  // Shield raised defensively
  const lHandX = CX - 8 + lean * 0.3;
  const lHandY = torsoTop + 4;
  drawArm(g, CX - 6 + lean, torsoTop + 3, lHandX, lHandY);
  drawShield(g, lHandX - 2, lHandY, 6);

  // Thrust trail
  if (t >= 0.3 && t <= 0.55) {
    const trailAlpha = clamp01(1 - Math.abs(t - 0.42) / 0.12) * 0.4;
    g.moveTo(rHandX + 10, rHandY - 2)
      .lineTo(rHandX + 18, rHandY)
      .lineTo(rHandX + 10, rHandY + 2)
      .stroke({ color: COL_GLOW, width: 1, alpha: trailAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Divine blessing -- golden light radiates upward
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Divine light rays radiating upward
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i - 2.5) * 0.3 + Math.sin(t * Math.PI * 3 + i) * 0.1;
    const dist = 10 + intensity * 12;
    const rx = CX + Math.cos(angle) * dist;
    const ry = headTop - 4 + Math.sin(angle) * dist;
    const rayAlpha = clamp01(0.1 + pulse * 0.15 - i * 0.01);
    g.moveTo(CX, headTop).lineTo(rx, ry)
      .stroke({ color: COL_GLOW, width: 1.5, alpha: rayAlpha });
  }

  // Halo
  const haloAlpha = 0.15 + pulse * 0.15;
  g.circle(CX, headTop + 2, 8).stroke({ color: COL_GLOW, width: 1, alpha: haloAlpha });
  g.circle(CX, headTop + 2, 12).stroke({ color: COL_GLOW, width: 0.5, alpha: haloAlpha * 0.5 });

  drawShadow(g, CX, GY, 11, 3, 0.3 + intensity * 0.15);
  drawWings(g, CX, torsoTop, 1.5 + pulse * 0.5);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawSkirt(g, CX, legTop - 1, 4);
  drawTorso(g, CX, torsoTop, torsoH);
  drawPauldrons(g, CX, torsoTop);
  drawHead(g, CX, headTop);

  // Spear raised high in right hand
  const raise = intensity * 5;
  drawArm(g, CX + 6, torsoTop + 3, CX + 10, torsoTop + 2 - raise);
  drawSpear(g, CX + 10, torsoTop + 2 - raise, -0.1 + pulse * 0.05, 20);

  // Shield arm lowered
  drawArm(g, CX - 6, torsoTop + 3, CX - 9, torsoTop + 6);
  drawShield(g, CX - 10, torsoTop + 7, 6);

  // Golden sparks around spear tip
  if (intensity > 0.3) {
    for (let i = 0; i < 4; i++) {
      const sa = t * Math.PI * 4 + i * (Math.PI / 2);
      const sd = 3 + i;
      const sx = CX + 10 + Math.cos(sa) * sd;
      const sy = torsoTop - 16 - raise + Math.sin(sa) * sd;
      g.circle(sx, sy, 0.8).fill({ color: COL_GLOW, alpha: clamp01(intensity - i * 0.15) * 0.6 });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 5 - legH;

  const fallX = t * 9;
  const dropY = t * t * 10;
  const fallAngle = t * 0.7;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.3, GY, 11 + t * 3, 3, 0.3 * (1 - t * 0.5));

  // Wings droop
  if (t < 0.85) {
    drawWings(g, CX + fallX * 0.2, torsoTop, -t * 2);
  }

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.1, GY, t * 2, -t);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.5, legH - squash, t * 2, -t);
  }

  drawSkirt(g, CX + fallX * 0.3, legTop - 1 + dropY * 0.5, 4, fallAngle * 3);
  drawTorso(g, CX + fallX * 0.3, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 3);
  drawPauldrons(g, CX + fallX * 0.3, torsoTop, fallAngle * 3);
  drawHead(g, CX + fallX * 0.3, headTop + dropY * 0.4, fallAngle * 3.5);

  // Spear drops and clatters
  if (t < 0.6) {
    const sdx = CX + 12 + t * 14;
    const sdy = torsoTop + 4 + t * 8;
    drawSpear(g, sdx, sdy, 0.3 + t * 4, 18 * (1 - t * 0.3));
  }

  // Shield rolls away
  if (t < 0.7) {
    const shx = CX - 10 + fallX * 0.2 - t * 6;
    const shy = torsoTop + 8 + dropY * 0.3;
    drawShield(g, shx, shy, 5 * (1 - t * 0.3));
  }

  // Fading golden motes
  if (t > 0.3) {
    const fadeAlpha = (1 - t) * 0.5;
    for (let i = 0; i < 5; i++) {
      const px = CX + fallX * 0.3 + Math.sin(t * 4 + i * 1.3) * 8;
      const py = torsoTop - 4 - i * 3 - t * 6;
      g.circle(px, py, 0.7).fill({ color: COL_GLOW, alpha: fadeAlpha });
    }
  }
}

/* -- public API ---------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all valkyrie sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateValkyrieFrames(renderer: Renderer): RenderTexture[] {
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
