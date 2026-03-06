// Procedural sprite generator for the Siege Automaton unit type.
//
// Draws a mechanical stone golem at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Grey/brown stone body -- massive and blocky
//   * Blue rune inscriptions that glow and pulse
//   * Visible gear/clockwork joints at shoulders, elbows, knees
//   * Large crushing fists with metal reinforcement
//   * Lumbering, mechanical movement animation
//   * Heavy ground-shake on attack
//   * Blue rune energy burst on cast
//   * Crumbles apart on death

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- stone and metal construct
const COL_STONE = 0x706858;       // grey-brown stone body
const COL_STONE_HI = 0x8a8070;    // stone highlight
const COL_STONE_DK = 0x504840;    // stone shadow
const COL_STONE_CRACK = 0x3a3430; // crack lines

const COL_METAL = 0x808890;       // reinforcement plates
const COL_METAL_HI = 0xa0a8b0;    // metal highlight
const COL_METAL_DK = 0x606870;    // metal shadow

const COL_GEAR = 0x707880;        // clockwork gears
const COL_GEAR_HI = 0x909898;     // gear tooth highlight
const COL_GEAR_AXLE = 0x505858;   // gear axle

const COL_RUNE = 0x3388cc;        // blue rune glow
const COL_RUNE_HI = 0x66bbff;     // bright rune highlight

const COL_FIST = 0x606060;        // metal fist plates
const COL_FIST_HI = 0x808080;     // fist highlight

const COL_EYE = 0x44aaee;         // blue glowing eyes
const COL_EYE_GLOW = 0x66ccff;    // eye glow halo

const COL_SHADOW = 0x000000;

/* -- helpers ------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------ */

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4, alpha = 0.35): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawFeet(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  // Massive stone feet -- flat and wide
  g.roundRect(cx - 9 + stanceL, gy - 4, 8, 4, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.6 });
  g.rect(cx - 8 + stanceL, gy - 3, 6, 1).fill({ color: COL_METAL, alpha: 0.4 });

  g.roundRect(cx + 1 + stanceR, gy - 4, 8, 4, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.6 });
  g.rect(cx + 2 + stanceR, gy - 3, 6, 1).fill({ color: COL_METAL, alpha: 0.4 });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  // Thick stone column legs
  g.roundRect(cx - 8 + stanceL, legTop, 6, legH, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.4 });
  g.roundRect(cx + 2 + stanceR, legTop, 6, legH, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.4 });

  // Knee gear joints
  const kneeY = legTop + legH * 0.4;
  drawGear(g, cx - 5 + stanceL, kneeY, 2.5);
  drawGear(g, cx + 5 + stanceR, kneeY, 2.5);

  // Rune on legs
  g.rect(cx - 7 + stanceL, legTop + 2, 1, legH - 4).fill({ color: COL_RUNE, alpha: 0.3 });
  g.rect(cx + 7 + stanceR, legTop + 2, 1, legH - 4).fill({ color: COL_RUNE, alpha: 0.3 });
}

function drawGear(g: Graphics, cx: number, cy: number, r: number): void {
  // Clockwork gear
  g.circle(cx, cy, r)
    .fill({ color: COL_GEAR })
    .stroke({ color: COL_GEAR_AXLE, width: 0.5 });
  // Teeth around edge
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tx = cx + Math.cos(a) * (r + 0.8);
    const ty = cy + Math.sin(a) * (r + 0.8);
    g.circle(tx, ty, 0.6).fill({ color: COL_GEAR_HI });
  }
  // Center axle
  g.circle(cx, cy, r * 0.3).fill({ color: COL_GEAR_AXLE });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 18;
  const x = cx - tw / 2 + tilt;

  // Massive stone chest block
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.7 });

  // Stone highlight / weathering
  g.roundRect(x + 1, top + 1, tw - 2, 3, 1).fill({ color: COL_STONE_HI, alpha: 0.3 });

  // Crack lines for texture
  g.moveTo(x + 3, top + 2).lineTo(x + 5, top + h - 2)
    .stroke({ color: COL_STONE_CRACK, width: 0.4, alpha: 0.5 });
  g.moveTo(x + tw - 4, top + 3).lineTo(x + tw - 6, top + h - 1)
    .stroke({ color: COL_STONE_CRACK, width: 0.3, alpha: 0.4 });

  // Metal reinforcement band across chest
  g.rect(x + 1, top + h * 0.4, tw - 2, 2)
    .fill({ color: COL_METAL })
    .stroke({ color: COL_METAL_DK, width: 0.3 });
  // Rivets
  for (let i = 0; i < 4; i++) {
    g.circle(x + 3 + i * 4, top + h * 0.4 + 1, 0.7).fill({ color: COL_METAL_HI });
  }

  // Central rune inscription -- glowing
  g.moveTo(cx + tilt, top + 3)
    .lineTo(cx - 2 + tilt, top + h * 0.4 - 1)
    .lineTo(cx + tilt, top + h - 3)
    .lineTo(cx + 2 + tilt, top + h * 0.4 - 1)
    .closePath()
    .stroke({ color: COL_RUNE, width: 0.8, alpha: 0.7 });
  g.circle(cx + tilt, top + h * 0.4, 1.5).fill({ color: COL_RUNE, alpha: 0.4 });
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0, runePulse = 0): void {
  const hw = 12;
  const hh = 8;
  const x = cx - hw / 2 + tilt;

  // Blocky stone head
  g.roundRect(x, top, hw, hh, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.5 });

  // Flat stone brow ridge
  g.rect(x, top, hw, 2).fill({ color: COL_STONE_DK });
  g.rect(x + 1, top, hw - 2, 1).fill({ color: COL_METAL, alpha: 0.3 });

  // Glowing blue eyes -- slits
  const eyeAlpha = 0.6 + runePulse * 0.4;
  g.rect(cx - 3.5 + tilt, top + 3, 3, 1.5).fill({ color: COL_EYE, alpha: eyeAlpha });
  g.rect(cx + 0.5 + tilt, top + 3, 3, 1.5).fill({ color: COL_EYE, alpha: eyeAlpha });
  // Eye glow halo
  g.circle(cx - 2 + tilt, top + 3.5, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha * 0.15 });
  g.circle(cx + 2 + tilt, top + 3.5, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha * 0.15 });

  // Rune on forehead
  g.moveTo(cx - 1.5 + tilt, top + 1).lineTo(cx + tilt, top + 2.5).lineTo(cx + 1.5 + tilt, top + 1)
    .stroke({ color: COL_RUNE, width: 0.6, alpha: 0.4 + runePulse * 0.4 });

  // Jaw line -- no mouth, stone face
  g.rect(x + 2, top + hh - 2, hw - 4, 1).fill({ color: COL_STONE_CRACK, alpha: 0.4 });
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  // Thick stone arm segment
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_STONE, width: 5 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_STONE_HI, width: 1, alpha: 0.2 });
  // Elbow gear
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);
  drawGear(g, mx, my, 2);
}

function drawFist(g: Graphics, cx: number, cy: number, size = 4): void {
  // Massive metal-reinforced fist
  g.roundRect(cx - size, cy - size, size * 2, size * 2, 2)
    .fill({ color: COL_FIST })
    .stroke({ color: COL_METAL_DK, width: 0.6 });
  // Metal plates on knuckles
  g.rect(cx - size + 1, cy - size + 1, size * 2 - 2, 2).fill({ color: COL_FIST_HI, alpha: 0.4 });
  // Rune on fist
  g.circle(cx, cy, 1.2).fill({ color: COL_RUNE, alpha: 0.3 });
}

function drawRunes(g: Graphics, cx: number, top: number, h: number, pulse: number): void {
  // Glowing rune inscriptions along the body
  const runeAlpha = 0.2 + pulse * 0.3;
  // Left side rune line
  g.moveTo(cx - 7, top + 2).lineTo(cx - 9, top + h * 0.5).lineTo(cx - 7, top + h - 2)
    .stroke({ color: COL_RUNE, width: 0.6, alpha: runeAlpha });
  // Right side rune line
  g.moveTo(cx + 7, top + 2).lineTo(cx + 9, top + h * 0.5).lineTo(cx + 7, top + h - 2)
    .stroke({ color: COL_RUNE, width: 0.6, alpha: runeAlpha });
  // Shoulder rune dots
  g.circle(cx - 9, top + 1, 1).fill({ color: COL_RUNE_HI, alpha: runeAlpha * 0.6 });
  g.circle(cx + 9, top + 1, 1).fill({ color: COL_RUNE_HI, alpha: runeAlpha * 0.6 });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const runePulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.3;

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY, 14, 4);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, sway);
  drawRunes(g, CX, torsoTop, torsoH, runePulse);
  drawHead(g, CX, headTop, sway * 0.3, runePulse);

  // Shoulder gear joints
  drawGear(g, CX - 10, torsoTop + 2, 3);
  drawGear(g, CX + 10, torsoTop + 2, 3);

  // Arms hanging with fists
  const rHandX = CX + 12;
  const rHandY = torsoTop + torsoH;
  drawArm(g, CX + 9, torsoTop + 3, rHandX, rHandY);
  drawFist(g, rHandX, rHandY + 2, 3.5);

  const lHandX = CX - 12;
  const lHandY = torsoTop + torsoH;
  drawArm(g, CX - 9, torsoTop + 3, lHandX, lHandY);
  drawFist(g, lHandX, lHandY + 2, 3.5);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const step = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(step) * 1.5;

  const legH = 7;
  const torsoH = 13;
  const stanceL = Math.round(step * 2);
  const stanceR = Math.round(-step * 2);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.2);
  const headTop = torsoTop - 8;

  const runePulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

  // Ground shake effect
  const shakeX = step * 0.5;

  drawShadow(g, CX + shakeX, GY, 14 + Math.abs(step), 4);
  drawFeet(g, CX + shakeX, GY, stanceL, stanceR);
  drawLegs(g, CX + shakeX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX + shakeX, torsoTop, torsoH, step * 0.3);
  drawRunes(g, CX + shakeX, torsoTop, torsoH, runePulse);
  drawHead(g, CX + shakeX, headTop, step * 0.2, runePulse);

  drawGear(g, CX - 10 + shakeX, torsoTop + 2, 3);
  drawGear(g, CX + 10 + shakeX, torsoTop + 2, 3);

  // Arms swing slightly -- mechanical
  const armSwing = step * 1.5;
  const rHandX = CX + 12 + shakeX + armSwing * 0.3;
  const rHandY = torsoTop + torsoH - armSwing * 0.5;
  drawArm(g, CX + 9 + shakeX, torsoTop + 3, rHandX, rHandY);
  drawFist(g, rHandX, rHandY + 2, 3.5);

  const lHandX = CX - 12 + shakeX - armSwing * 0.3;
  const lHandY = torsoTop + torsoH + armSwing * 0.5;
  drawArm(g, CX - 9 + shakeX, torsoTop + 3, lHandX, lHandY);
  drawFist(g, lHandX, lHandY + 2, 3.5);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Overhead fist slam -- ground pound
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  const lean = t < 0.45 ? t * 2 : (1 - t) * 2.5;
  const runePulse = t < 0.55 ? t * 2 : (1 - t) * 2;

  // Ground impact shake
  const shake = t > 0.4 && t < 0.65 ? Math.sin(t * 40) * 1.5 : 0;

  drawShadow(g, CX + shake, GY, 14 + lean * 2, 4, 0.35 + runePulse * 0.1);
  drawFeet(g, CX + shake, GY, -1, 2);
  drawLegs(g, CX + shake, legTop, legH, -1, 2);
  drawTorso(g, CX + shake, torsoTop, torsoH, lean);
  drawRunes(g, CX + shake, torsoTop, torsoH, runePulse);
  drawHead(g, CX + shake, headTop, lean * 0.3, runePulse);

  drawGear(g, CX - 10 + shake, torsoTop + 2, 3);
  drawGear(g, CX + 10 + shake, torsoTop + 2, 3);

  // Right fist -- overhead slam arc
  let rFistX: number;
  let rFistY: number;
  if (t < 0.25) {
    // Wind up -- raise fist overhead
    rFistX = CX + 10 + lean;
    rFistY = lerp(torsoTop + torsoH, torsoTop - 6, t / 0.25);
  } else if (t < 0.5) {
    // Slam down
    rFistX = CX + 10 + lean * 2;
    rFistY = lerp(torsoTop - 6, GY - 4, (t - 0.25) / 0.25);
  } else {
    // Recover
    rFistX = CX + 10 + lean;
    rFistY = lerp(GY - 4, torsoTop + torsoH, (t - 0.5) / 0.5);
  }
  drawArm(g, CX + 9 + shake + lean, torsoTop + 3, rFistX + shake, rFistY);
  drawFist(g, rFistX + shake, rFistY + 2, 4);

  // Left arm braces
  const lHandX = CX - 11;
  const lHandY = torsoTop + torsoH - 2;
  drawArm(g, CX - 9 + shake, torsoTop + 3, lHandX + shake, lHandY);
  drawFist(g, lHandX + shake, lHandY + 2, 3.5);

  // Impact shockwave
  if (t > 0.4 && t < 0.65) {
    const waveAlpha = clamp01(1 - Math.abs(t - 0.52) / 0.13) * 0.4;
    const waveR = (t - 0.4) * 40;
    g.ellipse(rFistX + shake, GY, waveR, waveR * 0.3)
      .stroke({ color: COL_RUNE, width: 1.5, alpha: waveAlpha });
    // Debris particles
    for (let i = 0; i < 4; i++) {
      const dx = rFistX + shake + (i - 1.5) * 5;
      const dy = GY - 2 - (t - 0.4) * 15 * (1 - i * 0.15);
      g.rect(dx, dy, 2, 2).fill({ color: COL_STONE, alpha: waveAlpha });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Rune energy channel -- all runes blaze bright
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  // Rune energy expanding outward
  for (let ring = 0; ring < 3; ring++) {
    const r = 8 + ring * 6 + intensity * 8;
    const ringAlpha = clamp01(0.15 + pulse * 0.15 - ring * 0.04);
    g.ellipse(CX, torsoTop + torsoH / 2, r, r * 0.6)
      .stroke({ color: COL_RUNE, width: 1, alpha: ringAlpha });
  }

  // Rune symbols floating around
  for (let i = 0; i < 6; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 3);
    const dist = 10 + intensity * 6;
    const rx = CX + Math.cos(angle) * dist;
    const ry = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.5;
    const sAlpha = clamp01(0.2 + pulse * 0.3 - i * 0.02);
    // Small rune diamond
    g.moveTo(rx, ry - 2).lineTo(rx + 1.5, ry).lineTo(rx, ry + 2).lineTo(rx - 1.5, ry).closePath()
      .fill({ color: COL_RUNE_HI, alpha: sAlpha });
  }

  drawShadow(g, CX, GY, 14, 4, 0.35 + intensity * 0.15);
  drawFeet(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);

  // Intensified rune glow
  const runeGlow = 0.5 + intensity * 0.5;
  drawRunes(g, CX, torsoTop, torsoH, runeGlow);

  drawHead(g, CX, headTop, 0, runeGlow);

  drawGear(g, CX - 10, torsoTop + 2, 3);
  drawGear(g, CX + 10, torsoTop + 2, 3);

  // Arms spread wide -- channeling
  const spread = intensity * 4;
  drawArm(g, CX + 9, torsoTop + 3, CX + 14 + spread, torsoTop + 4);
  drawFist(g, CX + 14 + spread, torsoTop + 6, 3.5);
  drawArm(g, CX - 9, torsoTop + 3, CX - 14 - spread, torsoTop + 4);
  drawFist(g, CX - 14 - spread, torsoTop + 6, 3.5);

  // Rune glow from fists
  g.circle(CX + 14 + spread, torsoTop + 6, 4).fill({ color: COL_RUNE, alpha: 0.1 + pulse * 0.15 });
  g.circle(CX - 14 - spread, torsoTop + 6, 4).fill({ color: COL_RUNE, alpha: 0.1 + pulse * 0.15 });

  // Eye blaze
  g.circle(CX - 2, headTop + 3.5, 3).fill({ color: COL_EYE_GLOW, alpha: intensity * 0.25 });
  g.circle(CX + 2, headTop + 3.5, 3).fill({ color: COL_EYE_GLOW, alpha: intensity * 0.25 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Crumbles apart -- stone pieces scatter
  const t = frame / 7;

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;

  const dropY = t * t * 6;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 8;

  // Runes flicker and die
  const runeFlicker = (1 - t) * Math.sin(t * 20) * 0.5 + 0.5;

  drawShadow(g, CX, GY, 14 + t * 4, 4, 0.35 * (1 - t * 0.4));

  // Body starts to separate and crumble
  if (t < 0.8) {
    drawFeet(g, CX, GY, t * 3, -t * 2);
  }
  if (t < 0.7) {
    drawLegs(g, CX, legTop + dropY * 0.5, legH * (1 - t * 0.2), t * 3, -t * 2);
  }

  // Torso splits
  if (t < 0.85) {
    const splitX = t * 3;
    // Left half
    g.roundRect(CX - 9 - splitX, torsoTop, 8, torsoH * (1 - t * 0.2), 1)
      .fill({ color: COL_STONE, alpha: 1 - t * 0.3 });
    // Right half
    g.roundRect(CX + 1 + splitX, torsoTop, 8, torsoH * (1 - t * 0.2), 1)
      .fill({ color: COL_STONE, alpha: 1 - t * 0.3 });
    // Dying runes
    drawRunes(g, CX, torsoTop, torsoH, runeFlicker * (1 - t));
  }

  // Head topples off
  if (t < 0.75) {
    const headTumble = t * 4;
    const headDropX = t * 6;
    drawHead(g, CX + headDropX, headTop + dropY * 0.8, headTumble, runeFlicker * (1 - t));
  }

  // Arms fall off
  if (t < 0.6) {
    const armDrop = t * 8;
    drawArm(g, CX + 9, torsoTop + 3, CX + 14 + t * 4, torsoTop + torsoH + armDrop);
    drawFist(g, CX + 14 + t * 4, torsoTop + torsoH + armDrop + 2, 3 * (1 - t * 0.3));
  }
  if (t < 0.65) {
    const armDrop = t * 7;
    drawArm(g, CX - 9, torsoTop + 3, CX - 13 - t * 3, torsoTop + torsoH + armDrop);
    drawFist(g, CX - 13 - t * 3, torsoTop + torsoH + armDrop + 2, 3 * (1 - t * 0.3));
  }

  // Stone debris scattering
  if (t > 0.3) {
    const debrisAlpha = (1 - t) * 0.6;
    for (let i = 0; i < 6; i++) {
      const dx = CX + Math.sin(t * 4 + i * 1.2) * (8 + i * 3);
      const dy = torsoTop + i * 4 + t * 5;
      const size = 1.5 - i * 0.15;
      g.rect(dx, dy, size, size).fill({ color: COL_STONE, alpha: debrisAlpha });
    }
  }

  // Gears scatter
  if (t > 0.2 && t < 0.8) {
    const gearAlpha = (1 - t) * 0.5;
    drawGear(g, CX - 8 - t * 4, torsoTop + 6 + t * 6, 2);
    g.circle(CX - 8 - t * 4, torsoTop + 6 + t * 6, 2).fill({ color: COL_GEAR, alpha: gearAlpha });
    drawGear(g, CX + 10 + t * 3, torsoTop + 4 + t * 8, 1.5);
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
 * Generate all siege automaton sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSiegeAutomatonFrames(renderer: Renderer): RenderTexture[] {
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
