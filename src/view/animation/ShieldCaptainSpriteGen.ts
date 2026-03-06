// Procedural sprite generator for the Shield Captain unit type.
//
// Draws a heavy infantry shield-bearer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Enormous rectangular tower shield — royal blue / steel, gold eagle emblem
//   • Shield covers most of the body, only helmet plume and boots visible
//   • Short stabbing sword carried behind the shield
//   • Full plate armour with heavy sabatons
//   • Vivid red plume cresting the helmet — distinctive silhouette
//   • Deliberate, wall-like movement — the shield IS the weapon
//   • Shockwave burst when shield slams ground (cast)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — royal blue shield, steel plate, gold eagle, red plume
const COL_SKIN      = 0xd0a878; // sun-weathered skin (visible if visor open)
const COL_SKIN_DK   = 0xa07848; // skin shadow

const COL_PLATE     = 0x8898a8; // heavy plate steel
const COL_PLATE_HI  = 0xb8c8d8;
const COL_PLATE_DK  = 0x586878;
const COL_PLATE_SHD = 0x384858;

const COL_SHIELD_BG  = 0x1a3a7a; // deep royal blue field
const COL_SHIELD_MID = 0x2a50a0; // mid-tone blue
const COL_SHIELD_HI  = 0x4a72c8; // highlight blue
const COL_SHIELD_EDGE = 0x5a8adc;
const COL_SHIELD_RIM = 0x9aacbe; // steel rim
const COL_SHIELD_RIM_HI = 0xc8d8e8;

const COL_EAGLE     = 0xd8a820; // gold eagle emblem
const COL_EAGLE_HI  = 0xf0cc50;
const COL_EAGLE_DK  = 0xa07010;

const COL_PLUME     = 0xcc1010; // vivid red plume
const COL_PLUME_HI  = 0xee3030;
const COL_PLUME_DK  = 0x880808;

const COL_SWORD_BLADE = 0xb0c4d4;
const COL_SWORD_HI    = 0xd8eaf8;
const COL_SWORD_GRIP  = 0x4a3820;
const COL_SWORD_GUARD = 0x9aacbe;
const COL_SWORD_POME  = 0x8898a8;

const COL_BOOT      = 0x485870;
const COL_BOOT_HI   = 0x6878a0;

const COL_WAVE      = 0x80a8d8; // shockwave ripple
const COL_WAVE_HI   = 0xb0d0f0;
const COL_IMPACT    = 0xffffff;

const COL_SHADOW    = 0x000000;

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
  w = 13,
  h = 3,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawSabatons(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Wide, heavy plate boots
  g.roundRect(cx - 9 + stanceL, gy - 5, 7, 5, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - 5, 7, 5, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Toe highlight
  g.rect(cx - 8 + stanceL, gy - 5, 5, 1.2).fill({ color: COL_BOOT_HI, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, gy - 5, 5, 1.2).fill({ color: COL_BOOT_HI, alpha: 0.5 });
}

function drawGreaves(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.roundRect(cx - 8 + stanceL, legTop, 6, legH, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, legTop, 6, legH, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Kneecap boss
  g.circle(cx - 5 + stanceL, legTop + legH * 0.28, 1.8).fill({ color: COL_PLATE_HI });
  g.circle(cx + 5 + stanceR, legTop + legH * 0.28, 1.8).fill({ color: COL_PLATE_HI });
}

function drawBody(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  // Visible torso peeking behind shield (shoulder area)
  const tw = 14;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Shoulder pauldrons — large
  g.roundRect(x - 2, top - 1, 6, 6, 1)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  g.roundRect(x + tw - 4, top - 1, 6, 6, 1)
    .fill({ color: COL_PLATE_HI })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Centre chest ridge
  g.moveTo(cx + tilt, top + 1).lineTo(cx + tilt, top + h - 2).stroke({
    color: COL_PLATE_HI,
    width: 0.8,
    alpha: 0.5,
  });
}

function drawHelmet(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  plumeWave = 0,
): void {
  const hw = 12;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Helmet body
  g.roundRect(x, top, hw, hh, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });

  // Face opening — visor closed (narrow slit showing face)
  g.rect(x + 2, top + 3, hw - 4, 1.8).fill({ color: COL_SKIN });
  g.rect(x + 2, top + 4.2, hw - 4, 0.6).fill({ color: COL_SKIN_DK, alpha: 0.5 });
  g.rect(x + 2, top + 3, hw - 4, 1.8).stroke({ color: COL_PLATE_SHD, width: 0.2 });
  // Visor slats
  for (let i = 0; i < 3; i++) {
    g.rect(x + 2.5 + i * 2.8, top + 3.2, 2, 0.8)
      .fill({ color: COL_PLATE_DK })
      .stroke({ color: COL_PLATE_SHD, width: 0.2 });
  }

  // Cheek guards
  g.roundRect(x, top + 2, 3, 6, 1).fill({ color: COL_PLATE_DK });
  g.roundRect(x + hw - 3, top + 2, 3, 6, 1).fill({ color: COL_PLATE_DK });

  // Helmet highlight ridge
  g.moveTo(cx + tilt - 0.5, top + 0.5)
    .lineTo(cx + tilt - 0.5, top + 2.5)
    .stroke({ color: COL_PLATE_HI, width: 1.2, alpha: 0.6 });

  // Red plume — flowing crest
  const plumeBase = cx + tilt;
  g.rect(plumeBase - 1.5, top - 5, 3, 6).fill({ color: COL_PLUME_DK });
  // Plume hairs fanning back
  for (let i = 0; i < 8; i++) {
    const px = plumeBase - 1 + i * 0.35;
    const waveOff = plumeWave * (i % 2 === 0 ? 1 : -1) * 1.2;
    const col = i < 4 ? COL_PLUME : COL_PLUME_HI;
    g.moveTo(px, top - 4)
      .quadraticCurveTo(px + waveOff - 3, top - 8 - i * 0.5, px + waveOff - 6, top - 10 - i * 0.6)
      .stroke({ color: col, width: 1.1 });
  }

  // Helmet trim
  g.moveTo(x, top + hh).lineTo(x + hw, top + hh).stroke({ color: COL_PLATE_HI, width: 0.8 });
}

function drawTowerShield(
  g: Graphics,
  cx: number,
  top: number,
  shieldTilt = 0,
  shieldBob = 0,
  alpha = 1,
): void {
  const sw = 20; // wide tower shield
  const sh = 28; // tall
  const sx = cx - sw / 2 + shieldTilt;
  const sy = top + shieldBob;

  // Shadow behind shield
  g.roundRect(sx + 1, sy + 1, sw, sh, 3).fill({ color: COL_SHADOW, alpha: 0.18 * alpha });

  // Shield body — deep blue
  g.roundRect(sx, sy, sw, sh, 3)
    .fill({ color: COL_SHIELD_BG })
    .stroke({ color: COL_PLATE_SHD, width: 0.5 });

  // Blue gradient panels
  g.roundRect(sx + 1, sy + 1, sw - 2, sh * 0.45, 2).fill({ color: COL_SHIELD_MID, alpha: 0.5 * alpha });
  g.roundRect(sx + 2, sy + 2, sw * 0.35, sh * 0.35, 1).fill({ color: COL_SHIELD_HI, alpha: 0.3 * alpha });
  // Edge highlight — catches light on facing edge
  g.moveTo(sx + sw - 1, sy + 2).lineTo(sx + sw - 1, sy + sh - 6).stroke({
    color: COL_SHIELD_EDGE,
    width: 0.6,
    alpha: 0.4 * alpha,
  });

  // Steel rim — top
  g.roundRect(sx, sy, sw, 2, 1).fill({ color: COL_SHIELD_RIM });
  g.moveTo(sx + 1, sy + 1).lineTo(sx + sw - 1, sy + 1).stroke({ color: COL_SHIELD_RIM_HI, width: 0.6 });
  // Steel rim — sides
  g.rect(sx, sy + 2, 2, sh - 4).fill({ color: COL_SHIELD_RIM });
  g.rect(sx + sw - 2, sy + 2, 2, sh - 4).fill({ color: COL_SHIELD_RIM });
  // Steel rim — bottom (pointed)
  g.moveTo(sx, sy + sh - 4)
    .lineTo(sx + sw / 2, sy + sh + 2)
    .lineTo(sx + sw, sy + sh - 4)
    .closePath()
    .fill({ color: COL_SHIELD_RIM })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });

  // Gold eagle emblem
  const ex = sx + sw / 2;
  const ey = sy + sh * 0.38;

  // Eagle body
  g.ellipse(ex, ey, 3.5, 4.5).fill({ color: COL_EAGLE });
  // Eagle head
  g.circle(ex + 0.5, ey - 4.5, 2).fill({ color: COL_EAGLE });
  // Beak
  g.moveTo(ex + 1.5, ey - 4.5)
    .lineTo(ex + 4, ey - 4)
    .lineTo(ex + 2, ey - 3.5)
    .closePath()
    .fill({ color: COL_EAGLE_DK });
  // Left wing
  g.moveTo(ex - 1, ey - 2)
    .bezierCurveTo(ex - 5, ey - 4, ex - 9, ey - 2, ex - 8, ey + 2)
    .bezierCurveTo(ex - 6, ey + 3, ex - 3, ey + 1, ex - 1, ey + 1)
    .closePath()
    .fill({ color: COL_EAGLE });
  // Right wing
  g.moveTo(ex + 1, ey - 2)
    .bezierCurveTo(ex + 5, ey - 4, ex + 9, ey - 2, ex + 8, ey + 2)
    .bezierCurveTo(ex + 6, ey + 3, ex + 3, ey + 1, ex + 1, ey + 1)
    .closePath()
    .fill({ color: COL_EAGLE });
  // Wing highlights
  g.moveTo(ex - 2, ey - 2).bezierCurveTo(ex - 6, ey - 3.5, ex - 8, ey - 1, ex - 7, ey + 1.5).stroke({
    color: COL_EAGLE_HI,
    width: 0.6,
    alpha: 0.6,
  });
  g.moveTo(ex + 2, ey - 2).bezierCurveTo(ex + 6, ey - 3.5, ex + 8, ey - 1, ex + 7, ey + 1.5).stroke({
    color: COL_EAGLE_HI,
    width: 0.6,
    alpha: 0.6,
  });
  // Eagle talons
  for (let i = -1; i <= 1; i++) {
    g.moveTo(ex + i * 1.2, ey + 4)
      .lineTo(ex + i * 1.8, ey + 7)
      .stroke({ color: COL_EAGLE_DK, width: 0.8 });
  }
  // Eagle eye
  g.circle(ex + 1, ey - 5, 0.5).fill({ color: COL_SHADOW });
}

function drawSword(g: Graphics, bx: number, by: number, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bladeLen = 13;
  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;
  const pomX = bx - sin * 3;
  const pomY = by + cos * 3;

  // Grip
  g.moveTo(pomX, pomY).lineTo(bx, by).stroke({ color: COL_SWORD_GRIP, width: 2.5 });
  // Pommel
  g.circle(pomX, pomY, 2).fill({ color: COL_SWORD_POME }).stroke({ color: COL_PLATE_DK, width: 0.3 });
  // Guard (crossguard)
  g.moveTo(bx - cos * 3.5, by - sin * 3.5)
    .lineTo(bx + cos * 3.5, by + sin * 3.5)
    .stroke({ color: COL_SWORD_GUARD, width: 2 });
  // Blade
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_SWORD_BLADE, width: 2 });
  // Blade edge highlight
  g.moveTo(bx + cos * 0.4, by + sin * 0.4)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_SWORD_HI, width: 0.7, alpha: 0.8 });
  // Fuller (groove)
  g.moveTo(bx - cos * 0.2, by - sin * 0.2)
    .lineTo(lerp(bx, tipX, 0.8) - cos * 0.2, lerp(by, tipY, 0.8) - sin * 0.2)
    .stroke({ color: COL_PLATE_DK, width: 0.4, alpha: 0.5 });
}

function drawSwordArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_PLATE, width: 3 });
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);
  g.circle(mx, my, 1.8).fill({ color: COL_PLATE_HI });
  g.roundRect(ex - 1.8, ey - 1.5, 3.6, 3, 1).fill({ color: COL_PLATE }).stroke({ color: COL_PLATE_DK, width: 0.3 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.35;
  const shieldBob = Math.sin(t * Math.PI * 2) * 0.4;
  const plumeWave = Math.sin(t * Math.PI * 2) * 0.6;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 12;

  drawShadow(g, CX, GY, 13, 3);

  // Braced behind shield — shield is forward and slightly angled
  // Draw legs and body first, then shield on top
  drawSabatons(g, CX, GY, 0, 0);
  drawGreaves(g, CX, legTop, legH, 0, 0);
  drawBody(g, CX, torsoTop, torsoH);
  drawHelmet(g, CX, headTop, 0, plumeWave);

  // Sword held behind body, just visible
  drawSwordArm(g, CX + 6, torsoTop + 3, CX + 10, torsoTop + torsoH + 1);
  drawSword(g, CX + 10, torsoTop + torsoH, 0.1);

  // Tower shield braced in front — dominates the frame
  drawTowerShield(g, CX - 2, torsoTop - 6, -1, shieldBob);

  // Shield arm (barely visible behind shield)
  g.circle(CX - 1, torsoTop + torsoH * 0.4, 2).fill({ color: COL_PLATE, alpha: 0.6 });

  // Peer over top of shield — eyes visible
  const peekY = torsoTop - 6 + shieldBob; // shield top
  const eyeY = headTop + 4;
  if (eyeY > peekY - 2) {
    // Eyes above shield rim
    g.ellipse(CX - 1.8, eyeY, 1, 0.7).fill({ color: 0x5577cc, alpha: 0.8 });
    g.ellipse(CX + 1.8, eyeY, 1, 0.7).fill({ color: 0x5577cc, alpha: 0.8 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 0.7; // heavy armored bob
  const plumeWave = -stride * 1.5;

  const legH = 9;
  const torsoH = 11;
  // Heavy march — legs stride, shield stays level
  const stanceL = Math.round(stride * 3.5);
  const stanceR = Math.round(-stride * 3.5);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const headTop = torsoTop - 12;

  drawShadow(g, CX, GY, 13 + Math.abs(stride), 3);
  drawSabatons(g, CX, GY, stanceL, stanceR);
  drawGreaves(g, CX, legTop, legH, stanceL, stanceR);
  drawBody(g, CX, torsoTop, torsoH, stride * 0.3);
  drawHelmet(g, CX, headTop, stride * 0.2, plumeWave);

  // Sword ready, barely visible
  drawSwordArm(g, CX + 6, torsoTop + 3, CX + 9, torsoTop + torsoH);
  drawSword(g, CX + 9, torsoTop + torsoH, 0.1 + stride * 0.05);

  // Shield pressed forward like a wall — slight forward lean
  const shieldTilt = stride * 0.4;
  drawTowerShield(g, CX - 3 + stride * 0.3, torsoTop - 5, shieldTilt);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Quick stab sequence:
  // 0-1: coil behind shield
  // 2-4: sword arm extends — thrusts out from behind shield right side
  // 5-6: retract
  // 7: reset
  const phases = [0, 0.08, 0.2, 0.45, 0.62, 0.78, 0.9, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 12;

  // Lunge forward slightly
  const lunge = clamp01(t * 4 - 0.4) * clamp01(1 - (t - 0.5) * 3) * 4;

  drawShadow(g, CX, GY, 13 + lunge * 0.5, 3);
  drawSabatons(g, CX, GY, -lunge * 0.3, lunge);
  drawGreaves(g, CX, legTop, legH, -lunge * 0.3, lunge);
  drawBody(g, CX + lunge * 0.3, torsoTop, torsoH, lunge * 0.5);
  drawHelmet(g, CX + lunge * 0.2, headTop, lunge * 0.3, lunge * 0.2);

  // Shield stays in front — braced
  drawTowerShield(g, CX - 3 + lunge * 0.2, torsoTop - 5, -0.5);

  // Sword thrust — arm extends from right edge of shield
  let thrustX: number;
  let thrustY: number;
  let swordAngle: number;

  if (t < 0.2) {
    // Coiled back
    thrustX = CX + 8;
    thrustY = torsoTop + torsoH - 2;
    swordAngle = 0.2;
  } else if (t < 0.62) {
    // Thrusting out — shoots forward and right
    const thr = clamp01((t - 0.2) / 0.42);
    thrustX = lerp(CX + 8, CX + 15, thr);
    thrustY = lerp(torsoTop + torsoH - 2, torsoTop + 4, thr);
    swordAngle = lerp(0.2, 1.5, thr);
  } else {
    // Retracting
    const ret = clamp01((t - 0.62) / 0.38);
    thrustX = lerp(CX + 15, CX + 8, ret);
    thrustY = lerp(torsoTop + 4, torsoTop + torsoH - 2, ret);
    swordAngle = lerp(1.5, 0.2, ret);
  }

  drawSwordArm(g, CX + 7, torsoTop + 3, thrustX, thrustY);
  drawSword(g, thrustX, thrustY, swordAngle);

  // Flash at tip of thrust
  if (t > 0.3 && t < 0.55) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.42) / 0.12) * 0.6;
    g.circle(thrustX + Math.sin(swordAngle) * 13, thrustY - Math.cos(swordAngle) * 13, 2.5).fill({
      color: COL_SWORD_HI,
      alpha: flashAlpha,
    });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Shield slam — raise shield overhead, then SLAM into ground creating shockwave
  // 0-2: raise shield high
  // 3-4: SLAM down
  // 5-7: shockwave expands, dust settles
  const phases = [0, 0.12, 0.28, 0.5, 0.68, 0.78, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 12;

  const slamPhase = t > 0.5 && t < 0.75;
  const wavePhase = t >= 0.68;

  // Impact shockwave
  if (wavePhase) {
    const wt = clamp01((t - 0.68) / 0.32);
    const waveR = wt * 20;
    const waveAlpha = (1 - wt) * 0.55;
    // Ground shockwave rings
    g.ellipse(CX, GY + 1, waveR, waveR * 0.35)
      .fill({ color: COL_SHADOW, alpha: 0 })
      .stroke({ color: COL_WAVE, width: 2 - wt, alpha: waveAlpha });
    g.ellipse(CX, GY + 1, waveR * 0.6, waveR * 0.6 * 0.35)
      .fill({ color: COL_SHADOW, alpha: 0 })
      .stroke({ color: COL_WAVE_HI, width: 1.5 - wt * 0.5, alpha: waveAlpha * 0.7 });
    // Impact flash
    if (wt < 0.25) {
      const flashA = (1 - wt / 0.25) * 0.7;
      g.circle(CX, GY - 2, 8 * wt + 2).fill({ color: COL_IMPACT, alpha: flashA * 0.3 });
    }
    // Ground cracks — radiating lines
    for (let i = 0; i < 6; i++) {
      const ca = (i / 6) * Math.PI * 2 + 0.2;
      const cl = wt * 12;
      g.moveTo(CX + Math.cos(ca) * 3, GY + Math.sin(ca) * 1.5)
        .lineTo(CX + Math.cos(ca) * cl, GY + Math.sin(ca) * cl * 0.35)
        .stroke({ color: COL_WAVE, width: 0.7, alpha: waveAlpha * 0.5 });
    }
  }

  drawShadow(g, CX, GY, 13 + (wavePhase ? clamp01((t - 0.68) / 0.32) * 4 : 0), 3);

  // Legs braced wide for the slam
  const wideStance = clamp01(t * 4) * 2.5;
  drawSabatons(g, CX, GY, -wideStance, wideStance);
  drawGreaves(g, CX, legTop, legH, -wideStance, wideStance);
  drawBody(g, CX, torsoTop, torsoH);

  // Shield position — raised up then slammed to ground
  let shieldY: number;
  let shieldTilt: number;
  const plumeWave = slamPhase ? 4 : 0.5;
  drawHelmet(g, CX, headTop, 0, plumeWave);

  if (t < 0.5) {
    // Raising shield overhead
    const raise = clamp01(t / 0.5);
    shieldY = torsoTop - 6 - raise * 14;
    shieldTilt = raise * -1.5; // tilts back as raised
  } else if (t < 0.68) {
    // Slamming down — fast
    const slam = clamp01((t - 0.5) / 0.18);
    shieldY = lerp(torsoTop - 20, GY - 28 + 5, slam);
    shieldTilt = lerp(-1.5, 0, slam);
  } else {
    // Shield planted in ground
    shieldY = GY - 28 + 5;
    shieldTilt = 0;
  }

  // Both arms holding shield
  const shieldCX = CX;
  const shieldTop = shieldY;
  drawTowerShield(g, shieldCX - 10, shieldTop, shieldTilt);

  // Sword arm — reaching up with the shield
  if (t < 0.68) {
    const rHandX = CX + 8;
    const rHandY = t < 0.5 ? torsoTop + 1 - clamp01(t / 0.5) * 10 : torsoTop - 5;
    drawSwordArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
    drawSword(g, rHandX, rHandY, -0.2 + t * 0.1);
  } else {
    // Sword planted at side, arms spread
    drawSwordArm(g, CX + 5, torsoTop + 3, CX + 9, torsoTop + torsoH);
    drawSword(g, CX + 9, torsoTop + torsoH, 0.1);
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;

  // Shield falls forward (tilts out toward viewer), character stumbles back
  const shieldFall = clamp01(t * 2);
  const bodyStumble = clamp01((t - 0.2) * 1.8);

  const stumbleX = bodyStumble * 5; // stumbles right/back
  const stumbleY = bodyStumble * 4;

  const torsoTop = legTop - torsoH + 2 + stumbleY;
  const headTop = torsoTop - 12;

  drawShadow(g, CX + stumbleX * 0.3, GY, 13 + shieldFall * 3, 3, 0.3 * (1 - t * 0.4));

  // Shield topples forward and down — massive clang
  if (shieldFall < 1.0) {
    const shieldAngle = shieldFall * 1.2; // rotating forward
    const shieldX = CX - 3 - shieldFall * 4;
    const shieldDropY = lerp(torsoTop - 5, GY - 8, shieldFall);
    // Shield tilted — approximate with horizontal stretch
    drawTowerShield(g, shieldX, shieldDropY, -shieldAngle * 2, 0, 1 - shieldFall * 0.3);
  } else {
    // Shield flat on ground
    g.roundRect(CX - 14, GY - 5, 22, 5, 2)
      .fill({ color: COL_SHIELD_BG })
      .stroke({ color: COL_SHIELD_RIM, width: 0.8 });
    // Gold eagle visible from above
    g.ellipse(CX - 3, GY - 2.5, 4, 2).fill({ color: COL_EAGLE, alpha: 0.7 });
  }

  // Stumbling body
  if (t < 0.9) {
    drawSabatons(g, CX + stumbleX * 0.5, GY, stumbleX * 0.3, -stumbleX * 0.1);
    drawGreaves(g, CX + stumbleX * 0.3, legTop + stumbleY * 0.5, legH, stumbleX * 0.2, 0);
    drawBody(g, CX + stumbleX * 0.5, torsoTop, torsoH, stumbleX * 0.5);
  }
  if (t < 0.8) {
    drawHelmet(g, CX + stumbleX * 0.5, headTop, stumbleX * 0.4, bodyStumble * 2);
  }

  // Sword arm flailing
  if (t < 0.7) {
    const sHandX = CX + 8 + stumbleX;
    const sHandY = torsoTop + torsoH * 0.4 - bodyStumble * 4;
    drawSwordArm(g, CX + stumbleX + 5, torsoTop + 3, sHandX, sHandY);
    drawSword(g, sHandX, sHandY, 0.3 + bodyStumble * 0.8);
  } else {
    // Sword dropped
    const dropT = clamp01((t - 0.7) / 0.3);
    const sdX = CX + 12 + dropT * 4;
    const sdY = GY - 3 - (1 - dropT) * 6;
    drawSword(g, sdX, sdY, Math.PI * 0.5 + dropT * 0.4);
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
 * Generate all Shield Captain sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateShieldCaptainFrames(renderer: Renderer): RenderTexture[] {
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
