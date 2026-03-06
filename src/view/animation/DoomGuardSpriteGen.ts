// Procedural sprite generator for the Doom Guard unit type.
//
// Draws an armored demon at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Dark red/crimson skin with shadow shading
//   • Thick black plate armor adorned with iron spikes
//   • Massive two-handed fel-iron greatsword with green-glowing edges
//   • Curved horns flanking the helmet, burning yellow eyes
//   • Taller and broader than a human unit
//   • Disciplined, measured fighting style throughout all animations

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — crimson demon & fel iron
const COL_SKIN_DK   = 0x5a0d0d; // deep shadow on crimson skin

const COL_ARMOR     = 0x1a1a1f; // black plate armor
const COL_ARMOR_HI  = 0x34343d; // armor highlight edge
const COL_ARMOR_RIM = 0x4a4a55; // lighter rim shine
const COL_SPIKE     = 0x252530; // spikes on armor

const COL_HORN      = 0x2a1a0a; // dark curved horns
const COL_HORN_HI   = 0x4a3020; // horn highlight

const COL_EYE       = 0xffe040; // burning yellow eyes
const COL_EYE_GLOW  = 0xff9900; // orange inner glow

const COL_BLADE     = 0x3a3a3a; // dark iron greatsword body
const COL_BLADE_HI  = 0x6a6a6a; // edge shine
const COL_FEL_GLOW  = 0x22ff44; // fel-green glow
const COL_FEL_HI    = 0x88ffaa; // bright fel highlight
const COL_FEL_TRAIL = 0x00dd33; // swinging trail

const COL_GRIP      = 0x3d2a18; // leather-wrapped grip
const COL_POMMEL    = 0x4a4a50; // iron pommel
const COL_CROSSGUARD = 0x2d2d32; // crossguard

const COL_BOOT      = 0x141418; // armored sabatons
const COL_BOOT_HI   = 0x2a2a2f;

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
  w = 11,
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
  squash = 0,
): void {
  const bw = 5;
  const bh = 5 - squash;
  // Heavy armored sabatons
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_HI, width: 0.5 });
  g.roundRect(cx + 3 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_HI, width: 0.5 });
  // Sabaton rim highlight
  g.rect(cx - 8 + stanceL, gy - bh, bw, 1).fill({ color: COL_ARMOR_RIM, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, gy - bh, bw, 1).fill({ color: COL_ARMOR_RIM, alpha: 0.5 });
}

function drawGreaves(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 5;
  // Thick armored greaves
  g.roundRect(cx - 8 + stanceL, legTop, lw, legH, 1)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_HI, width: 0.5 });
  g.roundRect(cx + 3 + stanceR, legTop, lw, legH, 1)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_HI, width: 0.5 });
  // Central ridge on each greave
  g.moveTo(cx - 5.5 + stanceL, legTop + 1)
    .lineTo(cx - 5.5 + stanceL, legTop + legH - 1)
    .stroke({ color: COL_ARMOR_RIM, width: 0.5, alpha: 0.6 });
  g.moveTo(cx + 5.5 + stanceR, legTop + 1)
    .lineTo(cx + 5.5 + stanceR, legTop + legH - 1)
    .stroke({ color: COL_ARMOR_RIM, width: 0.5, alpha: 0.6 });
  // Knee cops — small rounded plates
  const kneeMid = legTop + legH * 0.45;
  g.roundRect(cx - 9 + stanceL, kneeMid, 6, 3, 1).fill({ color: COL_ARMOR_HI });
  g.roundRect(cx + 3 + stanceR, kneeMid, 6, 3, 1).fill({ color: COL_ARMOR_HI });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 14; // broad demonic build
  const x = cx - tw / 2 + tilt;
  // Chest plate
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_HI, width: 0.6 });
  // Central chest ridge
  g.moveTo(cx + tilt, top + 1)
    .lineTo(cx + tilt, top + h - 2)
    .stroke({ color: COL_ARMOR_RIM, width: 0.8, alpha: 0.5 });
  // Shoulder pauldron spikes
  g.moveTo(x - 1, top)
    .lineTo(x - 2, top - 3)
    .lineTo(x + 2, top)
    .closePath()
    .fill({ color: COL_SPIKE });
  g.moveTo(x + tw + 1, top)
    .lineTo(x + tw + 2, top - 3)
    .lineTo(x + tw - 2, top)
    .closePath()
    .fill({ color: COL_SPIKE });
  // Pauldrons (shoulder plates)
  g.roundRect(x - 3, top, 5, 5, 1)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_RIM, width: 0.4 });
  g.roundRect(x + tw - 2, top, 5, 5, 1)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_RIM, width: 0.4 });
  // Abdominal plates
  for (let row = 0; row < 2; row++) {
    g.rect(x + 2, top + h - 5 + row * 2.5, tw - 4, 2).fill({ color: COL_ARMOR_HI, alpha: 0.35 });
  }
  // Crimson skin visible at neck gap
  g.roundRect(cx + tilt - 1.5, top - 1, 3, 2, 0.5).fill({ color: COL_SKIN_DK });
}

function drawHelm(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 11;
  const hh = 10;
  const x = cx - hw / 2 + tilt;
  // Main helm shape — heavy and rounded
  g.roundRect(x, top + 1, hw, hh - 1, 3)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_HI, width: 0.5 });
  // Visor slit — glowing eyes peer through
  const eyeY = top + hh * 0.52;
  // Eye glow inner
  g.ellipse(cx - 2.5 + tilt, eyeY, 1.4, 0.9).fill({ color: COL_EYE_GLOW, alpha: 0.5 });
  g.ellipse(cx + 2.5 + tilt, eyeY, 1.4, 0.9).fill({ color: COL_EYE_GLOW, alpha: 0.5 });
  // Bright eye pupils
  g.ellipse(cx - 2.5 + tilt, eyeY, 0.9, 0.6).fill({ color: COL_EYE });
  g.ellipse(cx + 2.5 + tilt, eyeY, 0.9, 0.6).fill({ color: COL_EYE });
  // Visor ridge between eyes
  g.moveTo(cx - 1.5 + tilt, eyeY - 1)
    .lineTo(cx + 1.5 + tilt, eyeY - 1)
    .stroke({ color: COL_ARMOR_HI, width: 0.5, alpha: 0.6 });
  // Helm ridge top
  g.moveTo(cx + tilt, top + 1)
    .lineTo(cx + tilt, top + hh * 0.4)
    .stroke({ color: COL_ARMOR_RIM, width: 1, alpha: 0.5 });
  // Curved horns
  // Left horn
  g.moveTo(x + 1, top + 2)
    .quadraticCurveTo(x - 5, top - 3, x - 3, top - 8)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.moveTo(x + 1, top + 2)
    .quadraticCurveTo(x - 4, top - 2, x - 2.5, top - 7)
    .stroke({ color: COL_HORN_HI, width: 0.8, alpha: 0.5 });
  // Right horn
  g.moveTo(x + hw - 1, top + 2)
    .quadraticCurveTo(x + hw + 5, top - 3, x + hw + 3, top - 8)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.moveTo(x + hw - 1, top + 2)
    .quadraticCurveTo(x + hw + 4, top - 2, x + hw + 2.5, top - 7)
    .stroke({ color: COL_HORN_HI, width: 0.8, alpha: 0.5 });
  // Chin guard
  g.roundRect(cx + tilt - 3, top + hh - 2, 6, 3, 1)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_HI, width: 0.4 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  reversed = false,
): void {
  // Upper arm plate
  const mx = lerp(sx, ex, 0.45);
  const my = lerp(sy, ey, 0.45);
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_ARMOR, width: 4 });
  g.moveTo(sx, sy).lineTo(mx, my).stroke({ color: COL_ARMOR_HI, width: 1, alpha: 0.4 });
  // Forearm — slightly thinner
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_ARMOR, width: 3 });
  g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: COL_ARMOR_HI, width: 0.8, alpha: 0.3 });
  // Elbow spike
  g.circle(mx, my, 2).fill({ color: COL_SPIKE });
  g.moveTo(mx, my).lineTo(mx + (reversed ? 2 : -2), my - 3).stroke({ color: COL_SPIKE, width: 1.5 });
  // Gauntlet
  g.circle(ex, ey, 2).fill({ color: COL_ARMOR_HI });
}

function drawGreatsword(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 20,
  glowAlpha = 0.3,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;
  const pomX = bx - sin * (bladeLen * 0.22);
  const pomY = by + cos * (bladeLen * 0.22);
  const gripEnd = bx - sin * (bladeLen * 0.15);
  const gripEndY = by + cos * (bladeLen * 0.15);

  // Fel glow aura along blade
  g.moveTo(bx, by)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_FEL_GLOW, width: 5, alpha: glowAlpha * 0.4 });

  // Blade body — wide iron
  g.moveTo(bx + cos * 1.5, by + sin * 1.5)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE, width: 3 });
  // Blade edge shine
  g.moveTo(bx + cos * 1.5, by + sin * 1.5)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_BLADE_HI, width: 0.7, alpha: 0.7 });
  // Fel-green glowing edge
  g.moveTo(bx + cos * 1.2, by + sin * 1.2)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_FEL_GLOW, width: 1.2, alpha: glowAlpha });
  g.moveTo(bx - cos * 1.2, by - sin * 1.2)
    .lineTo(tipX - cos * 0.5, tipY - sin * 0.5)
    .stroke({ color: COL_FEL_HI, width: 0.5, alpha: glowAlpha * 0.6 });

  // Crossguard — wide horizontal bar
  const gLx = bx - cos * 5;
  const gLy = by - sin * 5;
  const gRx = bx + cos * 5;
  const gRy = by + sin * 5;
  g.moveTo(gLx, gLy).lineTo(gRx, gRy).stroke({ color: COL_CROSSGUARD, width: 2.5 });
  // Guard end spikes
  g.circle(gLx, gLy, 1.2).fill({ color: COL_SPIKE });
  g.circle(gRx, gRy, 1.2).fill({ color: COL_SPIKE });

  // Grip — leather wrapped
  g.moveTo(bx, by).lineTo(gripEnd, gripEndY).stroke({ color: COL_GRIP, width: 2.5 });
  // Wrap lines on grip
  for (let w = 0; w < 3; w++) {
    const wt = (w + 1) * 0.25;
    const wx = lerp(bx, gripEnd, wt);
    const wy = lerp(by, gripEndY, wt);
    g.moveTo(wx - cos * 1.5, wy - sin * 1.5)
      .lineTo(wx + cos * 1.5, wy + sin * 1.5)
      .stroke({ color: COL_BLADE, width: 0.5, alpha: 0.5 });
  }

  // Pommel — iron sphere
  g.circle(pomX, pomY, 2.2).fill({ color: COL_POMMEL });
  g.circle(pomX - 0.5, pomY - 0.5, 0.7).fill({ color: COL_ARMOR_RIM, alpha: 0.5 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  // Greatsword planted tip-down, hands on pommel, menacing slow breathe
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const sway = Math.sin(t * Math.PI * 2) * 0.25;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1 + breathe;
  const headTop = torsoTop - 10;

  // Sword planted ahead of unit, slightly angled
  const swordBX = CX + 9;
  const swordTipY = GY - 1; // tip on ground
  // The sword is held upright; "bx,by" is where hands grip (at crossguard)
  const swordGripY = torsoTop + 4;

  // Fel glow pool on ground where tip rests
  const glowPulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;
  g.ellipse(swordBX, swordTipY, 5 + glowPulse * 2, 1.5).fill({ color: COL_FEL_GLOW, alpha: 0.12 + glowPulse * 0.08 });

  drawShadow(g, CX, GY, 11 + sway * 0.3, 3);
  drawSabatons(g, CX, GY, -1, 2);
  drawGreaves(g, CX, legTop, legH, -1, 2);

  // Draw sword behind body first (planted)
  // Sword runs from tip (ground) up to grip height — angle nearly straight
  const plantAngle = 0.12 + sway * 0.04; // very slight tilt
  // We draw from crossguard position downward to tip
  drawGreatsword(g, swordBX, swordGripY, plantAngle, 18, 0.35 + glowPulse * 0.15);

  drawTorso(g, CX, torsoTop, torsoH, sway * 0.3);
  drawHelm(g, CX, headTop, sway * 0.2);

  // Both arms reach forward/right onto pommel
  drawArm(g, CX + 6, torsoTop + 3, swordBX - 1, swordGripY + 3);
  drawArm(g, CX + 4, torsoTop + 5, swordBX + 1, swordGripY + 5, true);

  // Eye glow brightens on pulse
  const eyeGlowAlpha = 0.15 + glowPulse * 0.2;
  g.ellipse(CX - 2.5 + sway * 0.2, headTop + 5.5, 2.5, 1.5).fill({ color: COL_EYE, alpha: eyeGlowAlpha });
  g.ellipse(CX + 2.5 + sway * 0.2, headTop + 5.5, 2.5, 1.5).fill({ color: COL_EYE, alpha: eyeGlowAlpha });
}

function generateMoveFrame(g: Graphics, frame: number): void {
  // Measured march — greatsword resting on shoulder, disciplined stride
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 0.8;

  const legH = 9;
  const torsoH = 11;
  const stanceL = Math.round(stride * 4);
  const stanceR = Math.round(-stride * 4);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1 - Math.round(bob * 0.25);
  const headTop = torsoTop - 10;

  const tilt = stride * 0.5; // slight body lean with march

  drawShadow(g, CX, GY, 11 + Math.abs(stride) * 1.5, 3);
  drawSabatons(g, CX, GY, stanceL, stanceR);
  drawGreaves(g, CX, legTop, legH, stanceL, stanceR);

  // Sword carried on right shoulder — draw behind torso
  const swordShoulderX = CX + 8 + tilt;
  const swordShoulderY = torsoTop + 1;
  // Slight bob of sword on shoulder
  const shoulderBob = stride * 0.5;
  drawGreatsword(g, swordShoulderX, swordShoulderY + shoulderBob, -0.5 + stride * 0.05, 20, 0.25);

  drawTorso(g, CX, torsoTop, torsoH, tilt);
  drawHelm(g, CX, headTop, tilt * 0.5);

  // Right arm holds sword on shoulder
  drawArm(g, CX + 6, torsoTop + 2, swordShoulderX - 1, swordShoulderY + shoulderBob + 2);

  // Left arm swings opposite to stride (military bearing)
  const lSwing = -stride * 2.5;
  drawArm(g, CX - 5, torsoTop + 4, CX - 8 + lSwing, torsoTop + torsoH - 2, true);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Two-handed overhead cleave: wind-up → apex → devastating downswing → impact → recover
  const phases = [0, 0.1, 0.22, 0.38, 0.52, 0.65, 0.78, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 10;

  // Lunge forward and lean into the swing
  const lean = t < 0.38 ? lerp(0, 1.5, t / 0.38) : t < 0.65 ? 1.5 : lerp(1.5, 0, (t - 0.65) / 0.35);
  const bodyTilt = t < 0.38 ? lerp(0, -1, t / 0.38) : t < 0.65 ? lerp(-1, 2, (t - 0.38) / 0.27) : lerp(2, 0, (t - 0.65) / 0.35);
  const lunge = t > 0.2 && t < 0.85 ? 3 : 0;

  drawShadow(g, CX + lean, GY, 12 + lean * 1.5, 3);
  drawSabatons(g, CX, GY, -2, lunge);
  drawGreaves(g, CX, legTop, legH, -2, lunge);

  // Sword swing angle: up behind → over head → down through
  let swordAngle: number;
  if (t < 0.22) {
    swordAngle = lerp(0.1, -2.4, t / 0.22); // windup back
  } else if (t < 0.52) {
    swordAngle = lerp(-2.4, 1.8, (t - 0.22) / 0.3); // cleave downward
  } else {
    swordAngle = lerp(1.8, 0.1, (t - 0.52) / 0.48); // recover
  }

  // Hands move with the arc
  const handRaise = t < 0.38 ? lerp(0, -8, t / 0.38) : t < 0.6 ? lerp(-8, 4, (t - 0.38) / 0.22) : lerp(4, 0, (t - 0.6) / 0.4);
  const handX = CX + 3 + lean + bodyTilt;
  const handY = torsoTop + 3 + handRaise;

  drawTorso(g, CX, torsoTop, torsoH, bodyTilt);
  drawHelm(g, CX, headTop, bodyTilt * 0.4);

  // Fel trail during downswing
  if (t >= 0.25 && t <= 0.55) {
    const trailFade = clamp01(1 - Math.abs(t - 0.4) / 0.15);
    // Arc trail from upper left to lower right
    g.moveTo(handX - 8, handY - 12)
      .bezierCurveTo(handX + 2, handY - 8, handX + 10, handY + 2, handX + 14, handY + 10)
      .stroke({ color: COL_FEL_TRAIL, width: 2.5, alpha: trailFade * 0.45 });
    g.moveTo(handX - 6, handY - 10)
      .bezierCurveTo(handX + 4, handY - 5, handX + 11, handY + 4, handX + 13, handY + 11)
      .stroke({ color: COL_FEL_HI, width: 0.8, alpha: trailFade * 0.25 });
  }

  // Impact flash at frame 4-5
  if (t >= 0.5 && t <= 0.68) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.58) / 0.09) * 0.5;
    g.ellipse(CX + 8, GY - 3, 10, 4).fill({ color: COL_FEL_GLOW, alpha: flashAlpha * 0.3 });
    g.ellipse(CX + 8, GY - 3, 5, 2).fill({ color: COL_FEL_HI, alpha: flashAlpha * 0.5 });
  }

  drawGreatsword(g, handX, handY, swordAngle, 20, 0.4);

  // Both hands grip the sword
  drawArm(g, CX + 5 + bodyTilt, torsoTop + 3, handX, handY);
  drawArm(g, CX + 2 + bodyTilt, torsoTop + 5, handX - 1, handY + 3, true);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Sword planted in ground, fel energy channels through blade into the earth
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2.5) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.4);

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 10;

  // Fel energy channels down the blade into a ground circle
  const channelAngle = t * Math.PI * 3;
  const groundRadius = 5 + intensity * 10;

  // Ground energy circle — grows as channel intensifies
  g.ellipse(CX + 6, GY, groundRadius, groundRadius * 0.3)
    .stroke({ color: COL_FEL_GLOW, width: 1.2, alpha: 0.15 + pulse * 0.25 });
  g.ellipse(CX + 6, GY, groundRadius * 0.55, groundRadius * 0.15)
    .fill({ color: COL_FEL_GLOW, alpha: 0.06 + pulse * 0.1 });

  // Fel runes orbit around the channel point
  for (let i = 0; i < 5; i++) {
    const runeAngle = channelAngle + i * (Math.PI * 2 / 5);
    const runeDist = 3 + intensity * 7 + i * 0.8;
    const rx = CX + 6 + Math.cos(runeAngle) * runeDist;
    const ry = GY - 2 + Math.sin(runeAngle) * runeDist * 0.3;
    const rAlpha = clamp01(0.2 + pulse * 0.4 - i * 0.03);
    g.rect(rx - 1, ry - 1, 2, 2).fill({ color: COL_FEL_GLOW, alpha: rAlpha });
  }

  // Energy particles rising along blade
  for (let p = 0; p < 4; p++) {
    const pt = ((t * 3 + p * 0.25) % 1);
    const px = CX + 8;
    const py = lerp(GY - 2, torsoTop + 3, pt);
    const pAlpha = Math.sin(pt * Math.PI) * 0.5 * intensity;
    g.circle(px + (Math.random() * 2 - 1), py, 0.8 + pulse * 0.3)
      .fill({ color: pt > 0.5 ? COL_FEL_HI : COL_FEL_GLOW, alpha: pAlpha });
  }

  drawShadow(g, CX, GY, 11, 3, 0.3 + intensity * 0.15);
  drawSabatons(g, CX, GY, -3, 3);
  drawGreaves(g, CX, legTop, legH, -3, 3);

  // Sword planted tip-down, glowing intensely
  const swordX = CX + 8;
  const swordGripY = torsoTop + 3;
  drawGreatsword(g, swordX, swordGripY, 0.1, 18, 0.3 + intensity * 0.5 + pulse * 0.2);

  // Bright energy at tip on ground
  g.circle(swordX + 1.5, GY - 1, 2 + pulse * 2).fill({ color: COL_FEL_GLOW, alpha: 0.25 + pulse * 0.3 });
  g.circle(swordX + 1.5, GY - 1, 0.8 + pulse).fill({ color: COL_FEL_HI, alpha: 0.5 + pulse * 0.3 });

  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, headTop);

  // Arms channeling — both grip pommel with focus
  drawArm(g, CX + 6, torsoTop + 2, swordX - 1, swordGripY + 2);
  drawArm(g, CX + 4, torsoTop + 4, swordX + 1, swordGripY + 4, true);

  // Helm eyes blaze intensely during channel
  const eyeBlaze = 0.3 + intensity * 0.5 + pulse * 0.2;
  g.ellipse(CX - 2.5, headTop + 5.5, 2, 1.2).fill({ color: COL_EYE, alpha: eyeBlaze });
  g.ellipse(CX + 2.5, headTop + 5.5, 2, 1.2).fill({ color: COL_EYE, alpha: eyeBlaze });
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Sword falls first, demon crumbles to knees, armor cracks — weighty collapse
  const t = frame / 7;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 5 - legH;

  // Kneel then topple — first fall to knees, then slump forward
  const kneel = clamp01(t * 2.2);
  const topple = clamp01((t - 0.4) * 2.0);
  const dropY = kneel * 6 + topple * topple * 8;
  const fallAngle = topple * 0.65;

  const torsoTop = legTop - torsoH + 1 + dropY;
  const headTop = torsoTop - 10;
  const lean = topple * 8;

  drawShadow(g, CX + lean * 0.4, GY, 11 + lean, 3, 0.3 * (1 - t * 0.4));

  drawSabatons(g, CX, GY, t * 1, -t * 0.5, Math.round(kneel * 2));
  if (t < 0.7) {
    drawGreaves(g, CX, legTop + dropY * 0.35, legH * (1 - kneel * 0.4), t * 1.5, -t * 0.5);
  }

  // Sword falls and clatters — drops right first, tips to ground
  const swordFallT = clamp01(t * 2.5);
  if (swordFallT < 0.95) {
    const swordX = CX + 8 + swordFallT * 10;
    const swordY = torsoTop + 2 + swordFallT * swordFallT * 12;
    const swordFallAngle = lerp(0.1, 2.1, swordFallT);
    drawGreatsword(g, swordX, swordY, swordFallAngle, 20 * (1 - swordFallT * 0.2), 0.2 * (1 - swordFallT));
  }

  // Armor crack lines appear as t progresses
  if (t > 0.35) {
    const crackAlpha = clamp01((t - 0.35) * 2.5) * 0.6;
    const tx = CX + lean * 0.4;
    const ty = torsoTop;
    g.moveTo(tx - 2, ty + 3)
      .lineTo(tx + 3, ty + 7)
      .lineTo(tx + 1, ty + 11)
      .stroke({ color: COL_SKIN_DK, width: 0.7, alpha: crackAlpha });
    g.moveTo(tx + 4, ty + 4)
      .lineTo(tx + 1, ty + 9)
      .stroke({ color: COL_SKIN_DK, width: 0.5, alpha: crackAlpha * 0.7 });
  }

  // Fading eye glow
  if (t < 0.85) {
    const eyeFade = (1 - t) * 0.5;
    g.ellipse(CX + lean * 0.5 - 2.5, headTop + 5.5, 2, 1.2).fill({ color: COL_EYE, alpha: eyeFade });
    g.ellipse(CX + lean * 0.5 + 2.5, headTop + 5.5, 2, 1.2).fill({ color: COL_EYE, alpha: eyeFade });
  }

  drawTorso(g, CX + lean * 0.4, torsoTop, torsoH * (1 - topple * 0.15), fallAngle * 2.5);
  if (t < 0.9) {
    drawHelm(g, CX + lean * 0.4, headTop + dropY * 0.2, fallAngle * 3);
  }

  // Limp arms
  if (t > 0.4) {
    drawArm(
      g,
      CX + lean * 0.4 + 5,
      torsoTop + 3,
      CX + lean * 0.4 + 11,
      torsoTop + torsoH,
    );
  }
  if (t > 0.6) {
    drawArm(
      g,
      CX + lean * 0.4 - 4,
      torsoTop + 4,
      CX + lean * 0.4 - 9,
      torsoTop + torsoH - 2,
      true,
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
 * Generate all Doom Guard sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateDoomGuardFrames(renderer: Renderer): RenderTexture[] {
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
