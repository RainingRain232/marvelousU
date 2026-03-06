// Procedural sprite generator for the Succubus unit type.
//
// Draws a demonic enchantress at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Deep red/purple skin with glowing yellow eyes
//   * Small decorative bat-like wings at shoulders
//   * Dark red flowing hair
//   * Revealing dark armor with spiked pauldrons
//   * Whip/chain weapon in right hand
//   * Seductive, dangerous stance with hip tilt
//   * Dark purple web tendrils on cast animation
//   * Pointed tail

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- demonic enchantress
const COL_SKIN = 0x8b3060;       // deep red-purple skin
const COL_SKIN_HI = 0xa83870;    // skin highlight
const COL_SKIN_DK = 0x6a2048;    // skin shadow

const COL_HAIR = 0x881122;       // dark red hair
const COL_HAIR_HI = 0xaa2233;    // hair highlight
const COL_HAIR_DK = 0x660011;    // hair shadow

const COL_ARMOR = 0x1a1018;      // dark armor plates
const COL_ARMOR_HI = 0x2a1828;   // armor highlight
const COL_ARMOR_DK = 0x0e080c;   // armor dark edge

const COL_SPIKE = 0x444040;      // pauldron spikes
const COL_SPIKE_HI = 0x666060;   // spike tip highlight

const COL_EYE = 0xffcc00;        // glowing yellow eyes
const COL_EYE_GLOW = 0xffaa00;   // eye glow halo

const COL_WING = 0x2a1020;       // bat wing membrane
const COL_WING_BONE = 0x3a2030;  // wing bone struts

const COL_WHIP = 0x444444;       // chain/whip metal
const COL_WHIP_HI = 0x888888;    // whip highlight
const COL_WHIP_HANDLE = 0x2a1818;// leather handle

const COL_TAIL = 0x7a2850;       // tail color
const COL_TAIL_TIP = 0x4a1830;   // spade tip

const COL_BOOT = 0x1e1018;       // thigh-high boot
const COL_BOOT_HI = 0x2e1828;    // boot highlight

const COL_WEB = 0x7722aa;        // cast web tendrils
const COL_WEB_GLOW = 0x9944cc;   // web glow

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
  const bw = 4;
  const bh = 8;
  // Left boot -- thigh-high heeled
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_HI, width: 0.4 });
  // Heel
  g.rect(cx - 7 + stanceL, gy - 2, 1, 2).fill({ color: COL_ARMOR_DK });
  // Right boot
  g.roundRect(cx + 3 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_HI, width: 0.4 });
  g.rect(cx + 6 + stanceR, gy - 2, 1, 2).fill({ color: COL_ARMOR_DK });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  // Slender legs with skin visible
  g.rect(cx - 6 + stanceL, legTop, 3, legH).fill({ color: COL_SKIN });
  g.rect(cx + 3 + stanceR, legTop, 3, legH).fill({ color: COL_SKIN });
  // Armor straps on thighs
  g.rect(cx - 6 + stanceL, legTop + 1, 3, 1).fill({ color: COL_ARMOR, alpha: 0.7 });
  g.rect(cx + 3 + stanceR, legTop + 1, 3, 1).fill({ color: COL_ARMOR, alpha: 0.7 });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 11;
  const x = cx - tw / 2 + tilt;
  // Dark armor corset -- narrow waist, wider chest
  g.moveTo(x + 1, top + h)
    .lineTo(x, top + 3)
    .lineTo(x + 2, top)
    .lineTo(x + tw - 2, top)
    .lineTo(x + tw, top + 3)
    .lineTo(x + tw - 1, top + h)
    .closePath()
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.5 });
  // Chest highlight
  g.roundRect(x + 2, top + 1, tw - 4, 3, 1).fill({ color: COL_ARMOR_HI, alpha: 0.4 });
  // Skin neckline visible
  g.roundRect(x + 3, top, tw - 6, 2, 0.5).fill({ color: COL_SKIN_HI, alpha: 0.5 });
  // Waist cinch detail
  g.rect(x + 2, top + h - 2, tw - 4, 1).fill({ color: COL_SPIKE, alpha: 0.5 });
}

function drawPauldrons(g: Graphics, cx: number, shoulderY: number, tilt = 0): void {
  // Left spiked pauldron
  g.roundRect(cx - 10 + tilt, shoulderY, 5, 4, 1).fill({ color: COL_ARMOR });
  g.moveTo(cx - 10 + tilt, shoulderY).lineTo(cx - 12 + tilt, shoulderY - 3)
    .stroke({ color: COL_SPIKE, width: 1.2 });
  g.circle(cx - 12 + tilt, shoulderY - 3, 0.5).fill({ color: COL_SPIKE_HI });
  // Right spiked pauldron
  g.roundRect(cx + 5 + tilt, shoulderY, 5, 4, 1).fill({ color: COL_ARMOR });
  g.moveTo(cx + 10 + tilt, shoulderY).lineTo(cx + 12 + tilt, shoulderY - 3)
    .stroke({ color: COL_SPIKE, width: 1.2 });
  g.circle(cx + 12 + tilt, shoulderY - 3, 0.5).fill({ color: COL_SPIKE_HI });
}

function drawWings(g: Graphics, cx: number, wingTop: number, flapAngle = 0): void {
  // Left bat wing -- small decorative
  const lx = cx - 9;
  const span = 10 + flapAngle * 3;
  g.moveTo(lx, wingTop + 3)
    .lineTo(lx - span, wingTop - 2 - flapAngle * 2)
    .lineTo(lx - span + 3, wingTop + 1)
    .lineTo(lx - span * 0.6, wingTop + 5 - flapAngle)
    .lineTo(lx - 2, wingTop + 6)
    .closePath()
    .fill({ color: COL_WING, alpha: 0.8 });
  // Wing bone struts
  g.moveTo(lx, wingTop + 3).lineTo(lx - span, wingTop - 2 - flapAngle * 2)
    .stroke({ color: COL_WING_BONE, width: 0.7 });
  g.moveTo(lx, wingTop + 3).lineTo(lx - span * 0.6, wingTop + 5 - flapAngle)
    .stroke({ color: COL_WING_BONE, width: 0.5 });
  // Right bat wing
  const rx = cx + 9;
  g.moveTo(rx, wingTop + 3)
    .lineTo(rx + span, wingTop - 2 - flapAngle * 2)
    .lineTo(rx + span - 3, wingTop + 1)
    .lineTo(rx + span * 0.6, wingTop + 5 - flapAngle)
    .lineTo(rx + 2, wingTop + 6)
    .closePath()
    .fill({ color: COL_WING, alpha: 0.8 });
  g.moveTo(rx, wingTop + 3).lineTo(rx + span, wingTop - 2 - flapAngle * 2)
    .stroke({ color: COL_WING_BONE, width: 0.7 });
  g.moveTo(rx, wingTop + 3).lineTo(rx + span * 0.6, wingTop + 5 - flapAngle)
    .stroke({ color: COL_WING_BONE, width: 0.5 });
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 9;
  const hh = 9;
  const x = cx - hw / 2 + tilt;
  // Hair behind head
  g.roundRect(x - 1, top - 1, hw + 2, hh + 4, 3).fill({ color: COL_HAIR_DK });
  // Head shape
  g.roundRect(x + 1, top + 1, hw - 2, hh - 2, 3).fill({ color: COL_SKIN });
  // Hair on top -- flowing
  g.moveTo(x, top)
    .quadraticCurveTo(x + hw / 2, top - 3, x + hw, top)
    .lineTo(x + hw + 1, top + 4)
    .quadraticCurveTo(x + hw / 2, top + 2, x - 1, top + 4)
    .closePath()
    .fill({ color: COL_HAIR });
  // Hair highlight
  g.moveTo(x + 2, top).quadraticCurveTo(x + hw / 2, top - 2, x + hw - 2, top)
    .stroke({ color: COL_HAIR_HI, width: 0.6, alpha: 0.5 });
  // Small horns
  g.moveTo(x + 1, top + 1).lineTo(x - 1, top - 3).stroke({ color: COL_SKIN_DK, width: 1.2 });
  g.moveTo(x + hw - 1, top + 1).lineTo(x + hw + 1, top - 3).stroke({ color: COL_SKIN_DK, width: 1.2 });
  // Glowing yellow eyes
  g.rect(cx - 2.5 + tilt, top + 4, 2, 1.5).fill({ color: COL_EYE });
  g.rect(cx + 0.5 + tilt, top + 4, 2, 1.5).fill({ color: COL_EYE });
  // Eye glow
  g.circle(cx - 1.5 + tilt, top + 4.5, 2).fill({ color: COL_EYE_GLOW, alpha: 0.12 });
  g.circle(cx + 1.5 + tilt, top + 4.5, 2).fill({ color: COL_EYE_GLOW, alpha: 0.12 });
  // Lips -- smirk
  g.moveTo(cx - 1.5 + tilt, top + 6.5)
    .quadraticCurveTo(cx + tilt, top + 7.5, cx + 1.5 + tilt, top + 6.2)
    .stroke({ color: COL_SKIN_HI, width: 0.6 });
}

function drawTail(g: Graphics, cx: number, tailBase: number, wave: number): void {
  // Sinuous tail curving behind
  const tx = cx + 2;
  g.moveTo(tx, tailBase)
    .quadraticCurveTo(tx + 8 + wave * 2, tailBase + 4, tx + 12 + wave * 3, tailBase - 2)
    .stroke({ color: COL_TAIL, width: 1.5 });
  // Spade tip
  g.moveTo(tx + 12 + wave * 3, tailBase - 2)
    .lineTo(tx + 14 + wave * 3, tailBase - 5)
    .lineTo(tx + 10 + wave * 3, tailBase - 4)
    .closePath()
    .fill({ color: COL_TAIL_TIP });
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 2.5 });
  // Bracer
  const mx = lerp(sx, ex, 0.55);
  const my = lerp(sy, ey, 0.55);
  g.circle(mx, my, 2).fill({ color: COL_ARMOR });
  // Hand
  g.circle(ex, ey, 1.6).fill({ color: COL_SKIN_HI });
}

function drawWhip(g: Graphics, bx: number, by: number, wave: number, length = 18): void {
  // Chain whip -- curved sinusoid
  const segments = 6;
  g.moveTo(bx, by);
  for (let i = 1; i <= segments; i++) {
    const frac = i / segments;
    const sx = bx + frac * length;
    const sy = by + Math.sin(frac * Math.PI * 2 + wave) * (3 + frac * 2);
    if (i === 1) {
      g.lineTo(sx, sy);
    } else {
      const px = bx + ((i - 0.5) / segments) * length;
      const py = by + Math.sin(((i - 0.5) / segments) * Math.PI * 2 + wave) * (3 + ((i - 0.5) / segments) * 2);
      g.quadraticCurveTo(px, py, sx, sy);
    }
  }
  g.stroke({ color: COL_WHIP, width: 1.2 });
  // Handle
  g.rect(bx - 2, by - 1, 3, 3).fill({ color: COL_WHIP_HANDLE });
  // Tip barb
  const tipX = bx + length;
  const tipY = by + Math.sin(wave) * 5;
  g.circle(tipX, tipY, 1.2).fill({ color: COL_WHIP_HI });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const hipSway = Math.sin(t * Math.PI * 2) * 0.8;

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 9;
  const wingFlap = Math.sin(t * Math.PI * 2) * 0.3;

  drawShadow(g, CX, GY);
  drawTail(g, CX, torsoTop + torsoH, Math.sin(t * Math.PI * 2) * 1.5);
  drawWings(g, CX, torsoTop + 1, wingFlap);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, hipSway * 0.3);
  drawPauldrons(g, CX, torsoTop, hipSway * 0.3);
  drawHead(g, CX, headTop, hipSway * 0.2);

  // Right arm -- whip held loosely
  const rHandX = CX + 9;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawWhip(g, rHandX, rHandY, t * Math.PI * 2, 14);

  // Left arm -- resting on hip
  const lHandX = CX - 7;
  const lHandY = torsoTop + torsoH - 1;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.0;

  const legH = 8;
  const torsoH = 10;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 9;
  const wingFlap = walk * 0.6;

  drawShadow(g, CX, GY, 11 + Math.abs(walk) * 2, 3);
  drawTail(g, CX, torsoTop + torsoH, -walk * 2.5);
  drawWings(g, CX, torsoTop + 1, wingFlap);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawPauldrons(g, CX, torsoTop, walk * 0.4);
  drawHead(g, CX, headTop, walk * 0.3);

  // Arms swing
  const armSwing = walk * 2;
  const rHandX = CX + 9 + armSwing * 0.4;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 6, torsoTop + 3, rHandX, rHandY);
  drawWhip(g, rHandX, rHandY, t * Math.PI * 4, 12);

  const lHandX = CX - 8 - armSwing * 0.4;
  const lHandY = torsoTop + 6;
  drawArm(g, CX - 6, torsoTop + 3, lHandX, lHandY);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Lean into lash
  const lean = t < 0.55 ? t * 2.5 : (1 - t) * 3;
  const wingFlare = t < 0.4 ? t * 2 : (1 - t) * 1.5;

  drawShadow(g, CX + lean, GY, 11 + lean, 3);
  drawTail(g, CX, torsoTop + torsoH, -lean * 1.5);
  drawWings(g, CX, torsoTop + 1, wingFlare);
  drawBoots(g, CX, GY, -1, t > 0.2 && t < 0.8 ? 3 : 0);
  drawLegs(g, CX, legTop, legH, -1, t > 0.2 && t < 0.8 ? 3 : 0);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawPauldrons(g, CX, torsoTop, lean);
  drawHead(g, CX, headTop, lean * 0.4);

  // Whip lash -- extends far with crack
  const whipLen = t < 0.4 ? lerp(14, 24, t / 0.4) : lerp(24, 14, (t - 0.4) / 0.6);
  const whipWave = t * Math.PI * 6;
  const rHandX = CX + 8 + lean * 2;
  const rHandY = torsoTop + 3;
  drawArm(g, CX + 6 + lean, torsoTop + 3, rHandX, rHandY);
  drawWhip(g, rHandX, rHandY, whipWave, whipLen);

  // Left arm braces
  const lHandX = CX - 7;
  const lHandY = torsoTop + 6;
  drawArm(g, CX - 6 + lean, torsoTop + 3, lHandX, lHandY);

  // Whip crack spark
  if (t >= 0.35 && t <= 0.55) {
    const sparkAlpha = clamp01(1 - Math.abs(t - 0.45) / 0.1);
    const sparkX = rHandX + whipLen;
    const sparkY = rHandY + Math.sin(whipWave) * 5;
    g.circle(sparkX, sparkY, 2).fill({ color: 0xffcc44, alpha: sparkAlpha * 0.7 });
    g.circle(sparkX, sparkY, 4).fill({ color: 0xffaa22, alpha: sparkAlpha * 0.2 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Web tendrils emanating outward
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 4);
    const dist = 6 + intensity * 14;
    const ex = CX + Math.cos(angle) * dist;
    const ey = torsoTop + 4 + Math.sin(angle) * dist * 0.5;
    const midX = CX + Math.cos(angle) * dist * 0.5 + Math.sin(angle + t * 3) * 3;
    const midY = torsoTop + 4 + Math.sin(angle) * dist * 0.3;
    const webAlpha = clamp01(0.2 + pulse * 0.3 - i * 0.02);
    g.moveTo(CX, torsoTop + 4).quadraticCurveTo(midX, midY, ex, ey)
      .stroke({ color: COL_WEB, width: 1, alpha: webAlpha });
    g.circle(ex, ey, 1).fill({ color: COL_WEB_GLOW, alpha: webAlpha * 0.7 });
  }

  drawShadow(g, CX, GY, 11, 3, 0.3 + intensity * 0.2);
  drawTail(g, CX, torsoTop + torsoH, pulse * 2);
  drawWings(g, CX, torsoTop + 1, 1 + pulse * 0.5);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawPauldrons(g, CX, torsoTop);
  drawHead(g, CX, headTop);

  // Enhanced eye glow during cast
  const glowAlpha = 0.3 + intensity * 0.5;
  g.circle(CX - 1.5, headTop + 4.5, 3).fill({ color: COL_EYE_GLOW, alpha: glowAlpha * 0.3 });
  g.circle(CX + 1.5, headTop + 4.5, 3).fill({ color: COL_EYE_GLOW, alpha: glowAlpha * 0.3 });

  // Arms raised -- channeling dark magic
  const raise = intensity * 4;
  drawArm(g, CX + 6, torsoTop + 3, CX + 11, torsoTop + 2 - raise);
  drawArm(g, CX - 6, torsoTop + 3, CX - 11, torsoTop + 2 - raise);

  // Orbs in hands
  g.circle(CX + 11, torsoTop + 2 - raise, 2.5).fill({ color: COL_WEB, alpha: 0.5 + pulse * 0.3 });
  g.circle(CX - 11, torsoTop + 2 - raise, 2.5).fill({ color: COL_WEB, alpha: 0.5 + pulse * 0.3 });
  g.circle(CX + 11, torsoTop + 2 - raise, 4).fill({ color: COL_WEB_GLOW, alpha: 0.1 + pulse * 0.1 });
  g.circle(CX - 11, torsoTop + 2 - raise, 4).fill({ color: COL_WEB_GLOW, alpha: 0.1 + pulse * 0.1 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 8;
  const torsoH = 10;
  const legTop = GY - 8 - legH;

  const fallX = t * 8;
  const dropY = t * t * 10;
  const fallAngle = t * 0.7;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.3, GY, 11 + t * 3, 3, 0.3 * (1 - t * 0.5));

  // Wings crumple
  if (t < 0.8) {
    drawWings(g, CX + fallX * 0.2, torsoTop + 1, -t * 1.5);
  }

  // Tail goes limp
  if (t < 0.7) {
    drawTail(g, CX + fallX * 0.2, torsoTop + torsoH, t * 3);
  }

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.1, GY, t * 2, -t);
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.5, legH - squash, t * 2, -t);
  }

  drawTorso(g, CX + fallX * 0.3, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 3);
  drawPauldrons(g, CX + fallX * 0.3, torsoTop, fallAngle * 3);
  drawHead(g, CX + fallX * 0.3, headTop + dropY * 0.4, fallAngle * 3.5);

  // Whip drops
  if (t < 0.5) {
    const wdx = CX + 12 + t * 10;
    const wdy = torsoTop + torsoH * 0.5 + t * 8;
    drawWhip(g, wdx, wdy, t * 4, 10 * (1 - t));
  }

  // Fading particles
  if (t > 0.4) {
    const fadeAlpha = (1 - t) * 0.4;
    for (let i = 0; i < 4; i++) {
      const px = CX + fallX * 0.3 + Math.sin(t * 5 + i * 1.5) * 6;
      const py = torsoTop - 2 + i * 4;
      g.circle(px, py, 1).fill({ color: COL_WEB, alpha: fadeAlpha });
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
 * Generate all succubus sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSuccubusFrames(renderer: Renderer): RenderTexture[] {
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
