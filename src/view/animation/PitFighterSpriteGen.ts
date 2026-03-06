// Procedural sprite generator for the PitFighter unit type.
//
// Draws a scarred orcish gladiator at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Muscular green-skinned orc, heavy scarred build
//   • Twin hand axes: short hafts, wide curved brutal blades
//   • Minimal armor: leather chest harness, iron bracers on forearms
//   • Mohawk hairstyle, war paint across face, prominent tusks
//   • Many battle scars visible on skin
//   • Tribal tattoos — dark green geometric patterns on arms
//   • Aggressive crouching fight stance

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — orc green, battle-worn
const COL_SKIN = 0x3a7a28;          // green orc skin
const COL_SKIN_DK = 0x286018;       // deep shadow
const COL_SKIN_HI = 0x4a9a38;       // highlight on muscles
const COL_SCAR = 0x5a9050;          // raised scar tissue (lighter than skin)
const COL_SCAR_LINE = 0x2a5a1c;     // scar line depression (darker)

// War paint — red-orange streaks across face/arms
const COL_PAINT = 0xcc3300;
const COL_PAINT_DK = 0x882200;

// Tattoo — dark geometric
const COL_TATTOO = 0x1a4a10;

// Armor
const COL_HARNESS = 0x2a1e14;       // dark leather chest harness
const COL_HARNESS_STRAP = 0x3a2a1a; // leather strap
const COL_HARNESS_STUD = 0x6a5a48;  // brass studs
const COL_BRACER = 0x4a4040;        // iron bracer
const COL_BRACER_HI = 0x706060;     // bracer highlight
const COL_BRACER_RIVET = 0x908080;  // rivet

// Mohawk
const COL_MOHAWK = 0x882200;        // deep red mohawk
const COL_MOHAWK_HI = 0xbb4400;     // mohawk highlight

// Eyes
const COL_EYE = 0xee4400;           // bloodshot red-orange
const COL_EYE_WHITE = 0xddccaa;
const COL_PUPIL = 0x1a0800;

// Tusks
const COL_TUSK = 0xe8e0b0;
const COL_TUSK_DK = 0xb0a880;

// Axes
const COL_AXE_BLADE = 0x9090a0;     // iron grey blade
const COL_AXE_BLADE_HI = 0xc8c8d8;  // blade edge highlight
const COL_AXE_BLADE_DK = 0x606070;  // dark bevel
const COL_AXE_EDGE = 0xd8e0e8;      // sharpened edge gleam
const COL_AXE_HAFT = 0x4a3020;      // dark wood haft
const COL_AXE_HAFT_HI = 0x6a5030;
const COL_AXE_WRAP = 0x2a1810;      // leather grip wrap
const COL_AXE_SPIKE = 0xa0a0b0;     // top spike on axe head

// Loincloth/belt
const COL_LOIN = 0x2a1810;
const COL_BELT = 0x1a1208;
const COL_BELT_BUCKLE = 0x8a7048;

// Boots (heavy sandals)
const COL_SANDAL = 0x3a2818;
const COL_SANDAL_DK = 0x2a1e10;

const COL_SHADOW = 0x000000;

// Axe throw trail
const COL_AXE_TRAIL = 0xb0b8c8;

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

function drawSandals(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5;
  const bh = 4 - squash;
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 0.5)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 0.5)
    .fill({ color: COL_SANDAL })
    .stroke({ color: COL_SANDAL_DK, width: 0.5 });
  // Sandal straps
  g.rect(cx - 7 + stanceL, gy - bh + 1, bw, 0.8).fill({ color: COL_HARNESS, alpha: 0.6 });
  g.rect(cx + 2 + stanceR, gy - bh + 1, bw, 0.8).fill({ color: COL_HARNESS, alpha: 0.6 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 5; // thick muscular legs
  g.roundRect(cx - 7 + stanceL, legTop, lw, legH, 1)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });
  g.roundRect(cx + 2 + stanceR, legTop, lw, legH, 1)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });
  // Muscle highlights
  g.rect(cx - 6 + stanceL, legTop + 1, 2, legH - 3).fill({ color: COL_SKIN_HI, alpha: 0.3 });
  g.rect(cx + 3 + stanceR, legTop + 1, 2, legH - 3).fill({ color: COL_SKIN_HI, alpha: 0.3 });
  // Tattoo bands on shins
  g.rect(cx - 6 + stanceL, legTop + legH - 3, lw, 1).fill({ color: COL_TATTOO, alpha: 0.5 });
  g.rect(cx + 2 + stanceR, legTop + legH - 3, lw, 1).fill({ color: COL_TATTOO, alpha: 0.5 });
}

function drawLoincloth(g: Graphics, cx: number, top: number, tilt = 0): void {
  // Simple triangle loincloth
  g.moveTo(cx - 5 + tilt, top)
    .lineTo(cx + 5 + tilt, top)
    .lineTo(cx + 3 + tilt, top + 6)
    .lineTo(cx - 3 + tilt, top + 6)
    .closePath()
    .fill({ color: COL_LOIN });
  // Belt
  g.rect(cx - 6 + tilt, top - 1, 12, 2).fill({ color: COL_BELT });
  g.circle(cx + tilt, top, 1.5).fill({ color: COL_BELT_BUCKLE });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  breathe = 0,
): void {
  const tw = 13; // very wide muscular torso
  const x = cx - tw / 2 + tilt;

  // Bare skin — massive torso
  g.roundRect(x, top, tw, h + breathe * 0.2, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });

  // Muscle definition — pecs
  g.moveTo(cx + tilt, top + h * 0.3)
    .lineTo(cx + tilt, top + h * 0.65)
    .stroke({ color: COL_SKIN_DK, width: 0.5, alpha: 0.4 });

  // Pec shadows
  g.roundRect(x + 1, top + 1, 5, 4, 1).fill({ color: COL_SKIN_HI, alpha: 0.15 });
  g.roundRect(x + tw - 6, top + 1, 5, 4, 1).fill({ color: COL_SKIN_HI, alpha: 0.15 });

  // Abs definition
  for (let ab = 0; ab < 3; ab++) {
    g.moveTo(cx - 3 + tilt, top + h * 0.35 + ab * 3)
      .lineTo(cx + 3 + tilt, top + h * 0.35 + ab * 3)
      .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.3 });
  }

  // Leather chest harness
  // Diagonal straps crossing chest
  g.moveTo(cx - 5 + tilt, top + 1)
    .lineTo(cx + 5 + tilt, top + h - 1)
    .stroke({ color: COL_HARNESS_STRAP, width: 1.8 });
  g.moveTo(cx + 5 + tilt, top + 1)
    .lineTo(cx - 5 + tilt, top + h - 1)
    .stroke({ color: COL_HARNESS_STRAP, width: 1.8 });
  // Central ring
  g.circle(cx + tilt, top + h * 0.45, 1.8)
    .fill({ color: COL_HARNESS })
    .stroke({ color: COL_HARNESS_STUD, width: 0.5 });
  // Shoulder strap studs
  g.circle(cx - 4 + tilt, top + 2, 0.8).fill({ color: COL_HARNESS_STUD });
  g.circle(cx + 4 + tilt, top + 2, 0.8).fill({ color: COL_HARNESS_STUD });

  // Battle scars — raised tissue (lighter) with dark center line
  // Scar 1
  g.moveTo(cx - 4 + tilt, top + 2.5).lineTo(cx + 1.5 + tilt, top + 6.5)
    .stroke({ color: COL_SCAR, width: 1.5, alpha: 0.5 });
  g.moveTo(cx - 3 + tilt, top + 3).lineTo(cx + 1 + tilt, top + 6)
    .stroke({ color: COL_SCAR_LINE, width: 0.5, alpha: 0.6 });
  // Scar 2
  g.moveTo(cx + 3.5 + tilt, top + 4.5).lineTo(cx + 6.5 + tilt, top + 10.5)
    .stroke({ color: COL_SCAR, width: 1.5, alpha: 0.4 });
  g.moveTo(cx + 4 + tilt, top + 5).lineTo(cx + 6 + tilt, top + 10)
    .stroke({ color: COL_SCAR_LINE, width: 0.5, alpha: 0.5 });
  // Scar 3
  g.moveTo(cx - 5.5 + tilt, top + 7.5).lineTo(cx - 1.5 + tilt, top + 13.5)
    .stroke({ color: COL_SCAR, width: 1.5, alpha: 0.35 });
  g.moveTo(cx - 5 + tilt, top + 8).lineTo(cx - 2 + tilt, top + 13)
    .stroke({ color: COL_SCAR_LINE, width: 0.5, alpha: 0.4 });

  // Tribal tattoo on left pec
  g.moveTo(cx - 5 + tilt, top + 5)
    .lineTo(cx - 3 + tilt, top + 2)
    .lineTo(cx - 1 + tilt, top + 5)
    .stroke({ color: COL_TATTOO, width: 0.7, alpha: 0.6 });
  g.moveTo(cx - 4 + tilt, top + 7)
    .lineTo(cx - 1 + tilt, top + 5)
    .stroke({ color: COL_TATTOO, width: 0.7, alpha: 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  side: number, // -1 left, 1 right
): void {
  // Upper arm
  const mx = lerp(sx, ex, 0.45);
  const my = lerp(sy, ey, 0.45);
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_SKIN, width: 5 });
  // Lower arm / forearm
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 4 });

  // Muscle highlights
  g.moveTo(sx + side * 0.5, sy).lineTo(mx + side * 0.5, my)
    .stroke({ color: COL_SKIN_HI, width: 1.5, alpha: 0.3 });

  // Tattoo band on upper arm
  const tatX = lerp(sx, mx, 0.4);
  const tatY = lerp(sy, my, 0.4);
  g.moveTo(tatX - side * 2, tatY - 1)
    .lineTo(tatX + side * 2, tatY + 1)
    .stroke({ color: COL_TATTOO, width: 1, alpha: 0.55 });

  // Iron bracer on forearm
  const bracerX = lerp(mx, ex, 0.35);
  const bracerY = lerp(my, ey, 0.35);
  const bw = 4;
  const bh = 3;
  const bAngle = Math.atan2(ey - my, ex - mx);
  // Bracer as rotated rect approximation via two lines
  g.moveTo(bracerX - Math.sin(bAngle) * bw, bracerY + Math.cos(bAngle) * bw)
    .lineTo(bracerX + Math.sin(bAngle) * bw, bracerY - Math.cos(bAngle) * bw)
    .stroke({ color: COL_BRACER, width: bh });
  g.moveTo(bracerX - Math.sin(bAngle) * bw, bracerY + Math.cos(bAngle) * bw)
    .lineTo(bracerX + Math.sin(bAngle) * bw, bracerY - Math.cos(bAngle) * bw)
    .stroke({ color: COL_BRACER_HI, width: 0.8, alpha: 0.5 });
  // Rivets on bracer
  g.circle(bracerX - Math.sin(bAngle) * 1.5, bracerY + Math.cos(bAngle) * 1.5, 0.7)
    .fill({ color: COL_BRACER_RIVET });
  g.circle(bracerX + Math.sin(bAngle) * 1.5, bracerY - Math.cos(bAngle) * 1.5, 0.7)
    .fill({ color: COL_BRACER_RIVET });

  // Hand
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DK });
  g.circle(ex, ey, 1.3).fill({ color: COL_SKIN });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 9; // wide orc head
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Heavy jaw / skull
  g.roundRect(x, top + 2, hw, hh - 2, 1.5)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.4 });
  // Brow ridge (prominent)
  g.roundRect(x - 0.5, top, hw + 1, 4, 1)
    .fill({ color: COL_SKIN_DK })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  // Deep-set eyes — small, red
  const eyeY = top + hh * 0.38;
  g.ellipse(cx - 2 + tilt, eyeY, 1.4, 0.9).fill({ color: COL_EYE_WHITE });
  g.ellipse(cx + 2 + tilt, eyeY, 1.4, 0.9).fill({ color: COL_EYE_WHITE });
  g.ellipse(cx - 2 + tilt, eyeY, 1, 0.7).fill({ color: COL_EYE });
  g.ellipse(cx + 2 + tilt, eyeY, 1, 0.7).fill({ color: COL_EYE });
  g.circle(cx - 2 + tilt, eyeY, 0.35).fill({ color: COL_PUPIL });
  g.circle(cx + 2 + tilt, eyeY, 0.35).fill({ color: COL_PUPIL });

  // War paint — diagonal red slashes across face
  g.moveTo(cx - 4 + tilt, eyeY - 2)
    .lineTo(cx - 1 + tilt, eyeY + 2)
    .stroke({ color: COL_PAINT, width: 1.2 });
  g.moveTo(cx + 1 + tilt, eyeY - 2)
    .lineTo(cx + 4 + tilt, eyeY + 2)
    .stroke({ color: COL_PAINT, width: 1.2 });
  // Nose stripe
  g.moveTo(cx + tilt, eyeY + 1)
    .lineTo(cx + tilt, top + hh * 0.72)
    .stroke({ color: COL_PAINT_DK, width: 0.8 });

  // Broad orc nose
  g.roundRect(cx - 1.5 + tilt, top + hh * 0.52, 3, 2.5, 1)
    .fill({ color: COL_SKIN_DK, alpha: 0.5 });

  // Tusks — lower jaw, curving up
  g.moveTo(cx - 1.5 + tilt, top + hh * 0.78)
    .quadraticCurveTo(cx - 2.5 + tilt, top + hh + 1, cx - 1 + tilt, top + hh + 2.5)
    .stroke({ color: COL_TUSK, width: 1.5 });
  g.moveTo(cx + 1.5 + tilt, top + hh * 0.78)
    .quadraticCurveTo(cx + 2.5 + tilt, top + hh + 1, cx + 1 + tilt, top + hh + 2.5)
    .stroke({ color: COL_TUSK, width: 1.5 });
  // Tusk tips darker
  g.moveTo(cx - 1 + tilt, top + hh + 2.5).lineTo(cx - 1 + tilt, top + hh + 3)
    .stroke({ color: COL_TUSK_DK, width: 1 });
  g.moveTo(cx + 1 + tilt, top + hh + 2.5).lineTo(cx + 1 + tilt, top + hh + 3)
    .stroke({ color: COL_TUSK_DK, width: 1 });

  // Mouth — grimace
  g.moveTo(cx - 2 + tilt, top + hh * 0.72)
    .lineTo(cx + 2 + tilt, top + hh * 0.72)
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
}

function drawMohawk(
  g: Graphics,
  cx: number,
  top: number,
  sway = 0,
  tilt = 0,
): void {
  // Mohawk strip — central crest
  for (let s = 0; s < 6; s++) {
    const sx = cx - 1 + tilt + Math.sin(s * 0.8) * sway * 0.3;
    const sy = top - s * 1.6;
    const sw = 2 + (s < 2 ? 1 : 0);
    g.rect(sx - sw / 2, sy - 1.2, sw, 1.8)
      .fill({ color: s % 2 === 0 ? COL_MOHAWK : COL_MOHAWK_HI });
  }
}

// Draw a hand axe
function drawHandAxe(
  g: Graphics,
  hx: number,
  hy: number,
  angle: number, // angle — 0=head up, positive CW
  spin = 0,      // additional spinning (for thrown axe)
): void {
  const totalAngle = angle + spin;
  const cos = Math.cos(totalAngle);
  const sin = Math.sin(totalAngle);

  // Haft — short and thick
  const haftLen = 8;
  const haftEndX = hx + sin * haftLen;
  const haftEndY = hy - cos * haftLen;
  const haftBaseX = hx - sin * (haftLen * 0.4);
  const haftBaseY = hy + cos * (haftLen * 0.4);

  g.moveTo(haftBaseX, haftBaseY).lineTo(haftEndX, haftEndY)
    .stroke({ color: COL_AXE_HAFT, width: 2.2 });
  // Haft highlight
  g.moveTo(haftBaseX + cos * 0.4, haftBaseY + sin * 0.4)
    .lineTo(haftEndX + cos * 0.4, haftEndY + sin * 0.4)
    .stroke({ color: COL_AXE_HAFT_HI, width: 0.6, alpha: 0.5 });
  // Grip wrapping bands
  for (let w = 0; w < 3; w++) {
    const wt = 0.1 + w * 0.25;
    const wx = lerp(haftBaseX, haftEndX, wt);
    const wy = lerp(haftBaseY, haftEndY, wt);
    g.moveTo(wx - cos * 2, wy - sin * 2)
      .lineTo(wx + cos * 2, wy + sin * 2)
      .stroke({ color: COL_AXE_WRAP, width: 1.5 });
  }

  // Axe head at the top — wide, curved, brutal
  // The head is at haftEndX/Y pointing in direction of angle
  const headW = 7; // width of blade from center line to outer edge
  const headH = 5; // height of head along haft axis

  // Main blade body — crescent shape
  const bladeCenter = { x: haftEndX, y: haftEndY };

  // Blade vertices relative to haft direction
  const bTopX = bladeCenter.x + sin * 1.5 - cos * headH * 0.5;
  const bTopY = bladeCenter.y - cos * 1.5 - sin * headH * 0.5;
  const bBotX = bladeCenter.x - sin * 1.5 - cos * headH * 0.5;
  const bBotY = bladeCenter.y + cos * 1.5 - sin * headH * 0.5;
  const bOutTopX = bladeCenter.x + sin * (headW + 1) + cos * 1;
  const bOutTopY = bladeCenter.y - cos * (headW + 1) + sin * 1;
  const bOutBotX = bladeCenter.x - sin * (headW - 1) + cos * 1;
  const bOutBotY = bladeCenter.y + cos * (headW - 1) + sin * 1;
  const bTipX = bladeCenter.x + sin * headW * 0.5 + cos * (headH * 0.5);
  const bTipY = bladeCenter.y - cos * headW * 0.5 + sin * (headH * 0.5);

  // Blade fill
  g.moveTo(bTopX, bTopY)
    .quadraticCurveTo(bOutTopX, bOutTopY, bTipX, bTipY)
    .quadraticCurveTo(bOutBotX, bOutBotY, bBotX, bBotY)
    .lineTo(bladeCenter.x, bladeCenter.y)
    .closePath()
    .fill({ color: COL_AXE_BLADE })
    .stroke({ color: COL_AXE_BLADE_DK, width: 0.4 });

  // Edge highlight — the sharpened cutting edge
  g.moveTo(bOutTopX, bOutTopY)
    .quadraticCurveTo(bTipX + sin * 0.5, bTipY - cos * 0.5, bOutBotX, bOutBotY)
    .stroke({ color: COL_AXE_EDGE, width: 1 });

  // Blade bevel light
  g.moveTo(bTopX + sin * 1, bTopY - cos * 1)
    .quadraticCurveTo(bOutTopX - sin * 1.5, bOutTopY + cos * 1.5, bTipX, bTipY)
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.6, alpha: 0.7 });

  // Top spike
  const spikeBaseX = bladeCenter.x + cos * headH * 0.15;
  const spikeBaseY = bladeCenter.y + sin * headH * 0.15;
  const spikeTipX = spikeBaseX + cos * 4;
  const spikeTipY = spikeBaseY + sin * 4;
  g.moveTo(spikeBaseX - sin * 1.5, spikeBaseY + cos * 1.5)
    .lineTo(spikeTipX, spikeTipY)
    .lineTo(spikeBaseX + sin * 1.5, spikeBaseY - cos * 1.5)
    .closePath()
    .fill({ color: COL_AXE_SPIKE })
    .stroke({ color: COL_AXE_BLADE_HI, width: 0.3 });

  // Haft end cap (butt)
  g.circle(haftBaseX, haftBaseY, 1.2).fill({ color: COL_AXE_BLADE_DK });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const weightShift = Math.sin(t * Math.PI * 2) * 1.2;
  const mohawkSway = Math.sin(t * Math.PI * 2) * 0.4;

  const legH = 9;
  const torsoH = 11;
  const stanceL = Math.round(weightShift * 0.4);
  const stanceR = Math.round(-weightShift * 0.3);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe * 0.2;
  const headTop = torsoTop - 9 + breathe * 0.1;

  drawShadow(g, CX, GY, 10 + Math.abs(weightShift) * 0.3, 2.5);
  drawSandals(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawLoincloth(g, CX, legTop - 1, weightShift * 0.05);
  drawMohawk(g, CX, headTop, mohawkSway);
  drawTorso(g, CX, torsoTop, torsoH, 0, breathe);
  drawHead(g, CX, headTop);

  // Arms: axes crossed at chest
  // Right arm — axe pointing upward right
  const rArmX = CX + 6;
  const rArmY = torsoTop + 4 + breathe * 0.2;
  drawArm(g, CX + 5, torsoTop + 2, rArmX, rArmY, 1);
  drawHandAxe(g, rArmX + 2, rArmY - 1, -0.4 + weightShift * 0.02);

  // Left arm — axe pointing upward left, crossed over right
  const lArmX = CX - 6;
  const lArmY = torsoTop + 4 + breathe * 0.2;
  drawArm(g, CX - 5, torsoTop + 2, lArmX, lArmY, -1);
  drawHandAxe(g, lArmX - 2, lArmY - 1, 0.4 - weightShift * 0.02);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.5;

  const legH = 9;
  const torsoH = 11;
  const stanceL = Math.round(stride * 5);
  const stanceR = Math.round(-stride * 5);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const headTop = torsoTop - 9;

  // Aggressive forward lean
  const lean = -1.5 - Math.abs(stride) * 0.5;

  drawShadow(g, CX, GY, 10 + Math.abs(stride) * 2, 2.5);
  drawSandals(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawLoincloth(g, CX, legTop - 1, lean * 0.1);
  drawMohawk(g, CX, headTop, -stride * 1.5, lean * 0.1);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.1, 0);
  drawHead(g, CX, headTop, lean * 0.12);

  // Arms pump aggressively — axes swinging
  const armSwing = stride * 5;
  const rHandX = CX + 8 + armSwing * 0.3;
  const rHandY = torsoTop + torsoH - 3 + armSwing * 0.4;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY, 1);
  drawHandAxe(g, rHandX + 1, rHandY - 1, -0.3 + stride * 0.2);

  const lHandX = CX - 8 - armSwing * 0.3;
  const lHandY = torsoTop + torsoH - 3 - armSwing * 0.4;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY, -1);
  drawHandAxe(g, lHandX - 1, lHandY - 1, 0.3 - stride * 0.2);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Rapid alternating chops: L-R-L pattern across 8 frames
  // frames 0-1: left chop wind-up  2-3: left chop  4-5: right chop  6-7: left chop again
  const phases = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Body rotates to power each swing
  const torsoTwist = Math.sin(t * Math.PI * 4) * 2.5;

  drawShadow(g, CX, GY, 11, 2.5);
  drawSandals(g, CX, GY, -1.5, 1.5);
  drawLegs(g, CX, legTop, legH, -1.5, 1.5);
  drawLoincloth(g, CX, legTop - 1, torsoTwist * 0.05);
  drawMohawk(g, CX, headTop, torsoTwist * 0.3, torsoTwist * 0.05);
  drawTorso(g, CX, torsoTop, torsoH, torsoTwist * 0.12, 0);
  drawHead(g, CX, headTop, torsoTwist * 0.1);

  // Left axe — chops on frames 0-2 and 6-7
  let lAngle: number;
  let lHandX: number, lHandY: number;
  if (t < 0.15) {
    // Wind up — raise left
    lAngle = lerp(0.4, -0.8, t / 0.15);
    lHandX = CX - 5;
    lHandY = lerp(torsoTop + 6, torsoTop - 2, t / 0.15);
  } else if (t < 0.35) {
    // Chop down-forward
    lAngle = lerp(-0.8, 1.2, (t - 0.15) / 0.2);
    lHandX = lerp(CX - 5, CX + 4, (t - 0.15) / 0.2);
    lHandY = lerp(torsoTop - 2, torsoTop + 9, (t - 0.15) / 0.2);
  } else if (t < 0.55) {
    // Hold — right axe attacking
    lAngle = 1.2;
    lHandX = CX + 4;
    lHandY = torsoTop + 9;
  } else if (t < 0.72) {
    // Retract left
    lAngle = lerp(1.2, 0.4, (t - 0.55) / 0.17);
    lHandX = lerp(CX + 4, CX - 5, (t - 0.55) / 0.17);
    lHandY = lerp(torsoTop + 9, torsoTop + 6, (t - 0.55) / 0.17);
  } else {
    // Second left chop
    lAngle = lerp(0.4, 1.4, (t - 0.72) / 0.28);
    lHandX = lerp(CX - 5, CX + 5, (t - 0.72) / 0.28);
    lHandY = lerp(torsoTop + 6, torsoTop + 10, (t - 0.72) / 0.28);
  }
  drawArm(g, CX - 5 + torsoTwist * 0.1, torsoTop + 3, lHandX, lHandY, -1);
  drawHandAxe(g, lHandX - 1, lHandY - 1, lAngle);

  // Left axe chop trail
  if (t >= 0.15 && t <= 0.38) {
    const trailA = clamp01(1 - Math.abs(t - 0.25) / 0.12) * 0.45;
    g.moveTo(lHandX - 4, lHandY - 8)
      .bezierCurveTo(lHandX + 6, lHandY - 4, lHandX + 8, lHandY + 2, lHandX + 3, lHandY + 6)
      .stroke({ color: COL_AXE_TRAIL, width: 1.5, alpha: trailA });
  }
  if (t >= 0.72) {
    const trailA = clamp01(1 - Math.abs(t - 0.86) / 0.12) * 0.4;
    g.moveTo(lHandX - 3, lHandY - 7)
      .bezierCurveTo(lHandX + 5, lHandY - 3, lHandX + 7, lHandY + 2, lHandX + 2, lHandY + 5)
      .stroke({ color: COL_AXE_TRAIL, width: 1.2, alpha: trailA });
  }

  // Right axe — chops on frames 4-5
  let rAngle: number;
  let rHandX: number, rHandY: number;
  if (t < 0.42) {
    // Primed / returning
    rAngle = lerp(-0.35, -0.9, clamp01(t / 0.42));
    rHandX = CX + 6;
    rHandY = torsoTop + 5;
  } else if (t < 0.58) {
    // Chop right
    rAngle = lerp(-0.9, 1.3, (t - 0.42) / 0.16);
    rHandX = lerp(CX + 6, CX + 8, (t - 0.42) / 0.16);
    rHandY = lerp(torsoTop + 5, torsoTop + 10, (t - 0.42) / 0.16);
  } else {
    // Recover right
    rAngle = lerp(1.3, -0.35, (t - 0.58) / 0.42);
    rHandX = lerp(CX + 8, CX + 6, (t - 0.58) / 0.42);
    rHandY = lerp(torsoTop + 10, torsoTop + 5, (t - 0.58) / 0.42);
  }
  drawArm(g, CX + 5 + torsoTwist * 0.1, torsoTop + 3, rHandX, rHandY, 1);
  drawHandAxe(g, rHandX + 1, rHandY - 1, rAngle);

  // Right axe chop trail
  if (t >= 0.42 && t <= 0.62) {
    const trailA = clamp01(1 - Math.abs(t - 0.52) / 0.1) * 0.5;
    g.moveTo(rHandX - 2, rHandY - 8)
      .bezierCurveTo(rHandX + 8, rHandY - 3, rHandX + 10, rHandY + 3, rHandX + 4, rHandY + 8)
      .stroke({ color: COL_AXE_TRAIL, width: 1.8, alpha: trailA });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Throw right axe → spinning arc → catch back
  // 0-1: wind up throw  2-3: release, axe spinning out  4-5: axe at apex  6-7: axe returns, catch
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Throw lean
  const throwLean = t < 0.4 ? t * 6 : t < 0.6 ? 2.5 : (1 - t) * 5;

  drawShadow(g, CX, GY, 10 + pulse * 0.5, 2.5);
  drawSandals(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawLoincloth(g, CX, legTop - 1, throwLean * 0.05);
  drawMohawk(g, CX, headTop, throwLean * 0.2 + pulse * 0.3, throwLean * 0.06);
  drawTorso(g, CX, torsoTop, torsoH, throwLean * 0.12, 0);
  drawHead(g, CX, headTop, throwLean * 0.1);

  // Left axe stays held, defensive
  const lHandX = CX - 7;
  const lHandY = torsoTop + 6;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY, -1);
  drawHandAxe(g, lHandX - 1, lHandY - 1, 0.5);

  // Right arm — throwing motion
  let rHandX: number, rHandY: number;
  let rArmAngle: number;

  if (t < 0.32) {
    // Wind up: arm pulled back
    rHandX = lerp(CX + 5, CX + 2, t / 0.32);
    rHandY = lerp(torsoTop + 4, torsoTop - 2, t / 0.32);
    rArmAngle = lerp(-0.3, -1.1, t / 0.32);
  } else if (t < 0.48) {
    // Release
    rHandX = lerp(CX + 2, CX + 10, (t - 0.32) / 0.16);
    rHandY = lerp(torsoTop - 2, torsoTop + 2, (t - 0.32) / 0.16);
    rArmAngle = lerp(-1.1, 0.4, (t - 0.32) / 0.16);
  } else if (t < 0.72) {
    // Follow through — hand extended
    rHandX = CX + 10;
    rHandY = torsoTop + 3;
    rArmAngle = 0.4;
  } else {
    // Catch: arm comes back to receive
    rHandX = lerp(CX + 10, CX + 6, (t - 0.72) / 0.28);
    rHandY = lerp(torsoTop + 3, torsoTop + 4, (t - 0.72) / 0.28);
    rArmAngle = lerp(0.4, -0.2, (t - 0.72) / 0.28);
  }
  drawArm(g, CX + 5 + throwLean * 0.1, torsoTop + 3, rHandX, rHandY, 1);

  // Draw the thrown axe — spinning boomerang arc
  if (t >= 0.32 && t < 0.88) {
    // Axe in flight
    const flyT = (t - 0.32) / 0.56;
    // Arc: out and back
    const arcX = CX + 10 + Math.sin(flyT * Math.PI) * 12;
    const arcY = torsoTop + 2 - Math.sin(flyT * Math.PI) * 8; // parabolic arc
    const spinAngle = flyT * Math.PI * 6; // spinning rapidly
    drawHandAxe(g, arcX, arcY, spinAngle);

    // Blur/trail behind spinning axe
    const trailAlpha = 0.35 * clamp01(1 - Math.abs(flyT - 0.5) / 0.4);
    if (trailAlpha > 0.05) {
      const prevFlyT = Math.max(0, flyT - 0.12);
      const trailX = CX + 10 + Math.sin(prevFlyT * Math.PI) * 12;
      const trailY = torsoTop + 2 - Math.sin(prevFlyT * Math.PI) * 8;
      g.moveTo(trailX, trailY).lineTo(arcX, arcY)
        .stroke({ color: COL_AXE_TRAIL, width: 2.5, alpha: trailAlpha });
    }
  } else if (t >= 0.88) {
    // Caught — back in hand
    drawHandAxe(g, rHandX + 1, rHandY - 1, rArmAngle - 0.2);
  } else {
    // Still in wind-up — in hand
    drawHandAxe(g, rHandX + 1, rHandY - 1, rArmAngle);
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const fall = t * t; // quadratic fall

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + fall * 8;
  const headTop = torsoTop - 9;

  // Falling forward — body tilts forward/down
  const fwdTilt = t * 4;
  const dropX = t * 5; // falls slightly forward

  drawShadow(g, CX + dropX * 0.3, GY, 10 + fall * 4, 2.5 + fall, 0.3 * (1 - t * 0.4));

  // Legs buckle
  if (t < 0.75) {
    drawSandals(g, CX, GY, t * 2, -t * 1, Math.round(fall * 2));
    drawLegs(g, CX, legTop, legH * (1 - fall * 0.3), t * 2, -t);
  }

  // Loincloth
  if (t < 0.85) {
    drawLoincloth(g, CX + dropX * 0.3, legTop - 1 + fall * 4, fwdTilt * 0.08);
  }

  // Axes drop
  if (t < 0.4) {
    // Clutches wound — both axes start to drop
    const dropR = (t / 0.4) * 8;
    drawHandAxe(g, CX + 9 + dropR * 0.5, torsoTop + 4 + dropR, -0.3 + t * 2, t * 3);
  } else if (t < 0.7) {
    // Axes on ground
    g.moveTo(CX + 8, GY - 1).lineTo(CX + 16, GY - 3)
      .stroke({ color: COL_AXE_HAFT, width: 2 });
    drawHandAxe(g, CX + 16, GY - 3, 1.8);
  }

  if (t < 0.35) {
    drawHandAxe(g, CX - 8, torsoTop + 5 + t * 8, 0.5 + t * 2, t * 2);
  } else {
    g.moveTo(CX - 14, GY - 2).lineTo(CX - 8, GY - 1)
      .stroke({ color: COL_AXE_HAFT, width: 2 });
    drawHandAxe(g, CX - 14, GY - 2, -1.5);
  }

  // Torso pitching forward
  drawTorso(g, CX + dropX * 0.4, torsoTop, torsoH * (1 - fall * 0.15), fwdTilt * 0.3, 0);

  // Arms flail out then go limp
  if (t < 0.5) {
    // Arms thrown out for balance
    const flareLR = (t / 0.5);
    drawArm(g, CX + 5 + dropX * 0.4, torsoTop + 3, CX + 10 + flareLR * 4 + dropX * 0.4, torsoTop + 5 + flareLR * 4, 1);
    drawArm(g, CX - 5 + dropX * 0.3, torsoTop + 3, CX - 10 - flareLR * 3 + dropX * 0.3, torsoTop + 5 + flareLR * 3, -1);
  } else {
    // Arms limp/out
    drawArm(g, CX + 5 + dropX, torsoTop + 4, CX + 12 + dropX, torsoTop + 10, 1);
    drawArm(g, CX - 4 + dropX * 0.5, torsoTop + 4, CX - 2 + dropX * 0.5, torsoTop + 12, -1);
  }

  // Head pitches forward last
  if (t < 0.9) {
    drawMohawk(g, CX + dropX * 0.5, headTop, fall * 2, fwdTilt * 0.4);
    drawHead(g, CX + dropX * 0.5, headTop, fwdTilt * 0.35);
  } else {
    // Face-down on ground
    g.roundRect(CX + 2, GY - 8, 9, 7, 1)
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.3 });
    // Mohawk now horizontal
    g.rect(CX + 3, GY - 9, 2, 5).fill({ color: COL_MOHAWK });
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
 * Generate all PitFighter sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generatePitFighterFrames(renderer: Renderer): RenderTexture[] {
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
