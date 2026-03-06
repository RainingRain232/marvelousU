// Procedural sprite generator for the BloodBerserker unit type.
//
// Draws a frenzied twin-axe warrior at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Bare muscular torso smeared with red warpaint and fresh blood
//   • Wild red-tinged hair whipping behind, shaved sides
//   • Two heavy serrated hand axes with dark iron heads
//   • Minimal armor: leather chest straps, fur loincloth, bone fetishes
//   • Crazed expression — wide eyes, teeth bared, veins visible
//   • IDLE: twitchy micro-sways, axes dripping red, shoulders heaving
//   • MOVE: aggressive forward-lean sprint, hair streams behind
//   • ATTACK: wild spinning double-axe strike with blood-trail arc
//   • CAST: howls to sky, crimson berserk aura pulses outward
//   • DIE: falls mid-swing, both axes plant in ground, crumples

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — blood, iron, fury
const COL_SKIN        = 0xc08060; // weathered tanned skin
const COL_SKIN_HI     = 0xd89870;
const COL_SKIN_DK     = 0x9a6040;
const COL_SKIN_SHADOW = 0x7a4428;

const COL_HAIR        = 0x8a2010; // deep blood-red hair
const COL_HAIR_HI     = 0xb03020;
const COL_HAIR_DK     = 0x5a1008;

const COL_BLOOD       = 0xaa1a10; // fresh blood smears
const COL_BLOOD_DK    = 0x7a0e08;
const COL_BLOOD_DRIP  = 0xcc2218; // drip highlight

const COL_WARPAINT    = 0xcc2010; // bright red face warpaint
const COL_VEIN        = 0x882020; // bulging veins

const COL_STRAP       = 0x3e2a18; // dark leather chest straps
const COL_STRAP_HI    = 0x5a3e28;
const COL_BONE        = 0xd0c8a0; // bone fetish beads
const COL_BONE_DK     = 0xa89878;

const COL_LOIN        = 0x5a3e28; // fur loincloth
const COL_LOIN_DK     = 0x3c2818;
const COL_FUR         = 0x9a8060; // fur accent
const COL_FUR_DK      = 0x6a5838;

const COL_AXE_HEAD    = 0x7a8898; // heavy dark iron
const COL_AXE_HI      = 0xa0b0c0; // ground edge highlight
const COL_AXE_DK      = 0x4a5868;
const COL_AXE_SERR    = 0x5a6878; // serration shadow
const COL_AXE_HAFT    = 0x4a3018; // thick dark wood haft
const COL_AXE_HAFT_DK = 0x2e1e08;
const COL_AXE_WRAP    = 0x6a3818; // leather haft wrap
const COL_AXE_BLOOD   = 0xcc2010; // blood on blade

const COL_RAGE        = 0xdd1a08; // berserk aura
const COL_RAGE_CORE   = 0xff6030;
const COL_RAGE_RING   = 0xff8844;

const COL_SHADOW      = 0x000000;

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
  h = 3.5,
  alpha = 0.32,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5;
  const bh = 5 - squash;
  // Bare lower leg wraps — fur-bound
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_LOIN_DK })
    .stroke({ color: COL_SHADOW, width: 0.4, alpha: 0.3 });
  g.ellipse(cx - 4.5 + stanceL, gy - bh, 3.5, 1.5).fill({ color: COL_FUR });

  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_LOIN_DK })
    .stroke({ color: COL_SHADOW, width: 0.4, alpha: 0.3 });
  g.ellipse(cx + 4.5 + stanceR, gy - bh, 3.5, 1.5).fill({ color: COL_FUR });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Bare muscular legs with fur wraps
  g.rect(cx - 6 + stanceL, legTop, 4, legH).fill({ color: COL_SKIN_DK });
  g.rect(cx + 2 + stanceR,  legTop, 4, legH).fill({ color: COL_SKIN_DK });
  // Muscle shadow
  g.moveTo(cx - 4 + stanceL, legTop)
    .lineTo(cx - 4 + stanceL, legTop + legH)
    .stroke({ color: COL_SKIN_SHADOW, width: 0.4, alpha: 0.3 });
  g.moveTo(cx + 4 + stanceR, legTop)
    .lineTo(cx + 4 + stanceR, legTop + legH)
    .stroke({ color: COL_SKIN_SHADOW, width: 0.4, alpha: 0.3 });
  // Blood splatter on legs
  g.circle(cx - 5 + stanceL, legTop + legH * 0.4, 1).fill({ color: COL_BLOOD, alpha: 0.45 });
  g.circle(cx + 4 + stanceR,  legTop + legH * 0.6, 0.8).fill({ color: COL_BLOOD, alpha: 0.35 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 14; // muscular but leaner than regular berserker
  const x  = cx - tw / 2 + tilt;

  // Bare torso — skin with heavy muscle definition
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.5 });

  // Pectoral highlights
  g.ellipse(cx - 2.5 + tilt, top + 3, 3.5, 2.2).fill({ color: COL_SKIN_HI, alpha: 0.28 });
  g.ellipse(cx + 2.5 + tilt, top + 3, 3.5, 2.2).fill({ color: COL_SKIN_HI, alpha: 0.28 });
  // Sternum line
  g.moveTo(cx + tilt, top + 1)
    .lineTo(cx + tilt, top + h - 4)
    .stroke({ color: COL_SKIN_DK, width: 0.35, alpha: 0.35 });
  // Abs
  for (let row = 5; row < h - 3; row += 2.2) {
    g.moveTo(cx - 2.5 + tilt, top + row)
      .lineTo(cx + 2.5 + tilt, top + row)
      .stroke({ color: COL_SKIN_SHADOW, width: 0.3, alpha: 0.3 });
  }

  // Heavy red blood smears across chest — diagonal
  g.moveTo(x + 1, top + 2)
    .lineTo(x + tw - 3, top + h - 3)
    .stroke({ color: COL_BLOOD, width: 2, alpha: 0.5 });
  g.moveTo(x + 3, top + 1)
    .lineTo(x + tw - 5, top + h - 5)
    .stroke({ color: COL_BLOOD_DK, width: 1, alpha: 0.35 });
  // Splatter dots
  g.circle(cx - 3 + tilt, top + 5,  1.2).fill({ color: COL_BLOOD, alpha: 0.55 });
  g.circle(cx + 4 + tilt, top + 8,  0.9).fill({ color: COL_BLOOD_DK, alpha: 0.5 });
  g.circle(cx - 1 + tilt, top + 11, 1.0).fill({ color: COL_BLOOD, alpha: 0.45 });

  // Warpaint — red war-stripe across chest (horizontal bands)
  g.moveTo(x + 2, top + 4)
    .lineTo(x + tw - 2, top + 4)
    .stroke({ color: COL_WARPAINT, width: 1.2, alpha: 0.55 });
  g.moveTo(x + 3, top + 6)
    .lineTo(x + tw - 3, top + 6)
    .stroke({ color: COL_WARPAINT, width: 0.8, alpha: 0.38 });

  // Leather chest straps — X cross
  g.moveTo(x + 1, top)
    .lineTo(x + tw - 1, top + h - 2)
    .stroke({ color: COL_STRAP, width: 1.5 });
  g.moveTo(x + tw - 1, top)
    .lineTo(x + 1, top + h - 2)
    .stroke({ color: COL_STRAP, width: 1.5 });
  // Strap highlight edge
  g.moveTo(x + 1, top)
    .lineTo(x + tw - 1, top + h - 2)
    .stroke({ color: COL_STRAP_HI, width: 0.5, alpha: 0.4 });

  // Bone fetish at strap crossing
  const boneX = cx + tilt;
  const boneY = top + h * 0.48;
  g.circle(boneX, boneY, 2).fill({ color: COL_BONE }).stroke({ color: COL_BONE_DK, width: 0.4 });
  g.circle(boneX - 0.5, boneY - 0.5, 0.6).fill({ color: 0xffffff, alpha: 0.35 });

  // Fur loincloth hanging from belt
  g.moveTo(x + 2, top + h - 2)
    .lineTo(x + 3, top + h + 5)
    .lineTo(x + tw - 3, top + h + 5)
    .lineTo(x + tw - 2, top + h - 2)
    .closePath()
    .fill({ color: COL_LOIN })
    .stroke({ color: COL_LOIN_DK, width: 0.4 });
  // Fur texture lines
  g.moveTo(x + 5, top + h + 5)
    .lineTo(x + 4, top + h + 8)
    .stroke({ color: COL_FUR_DK, width: 0.8 });
  g.moveTo(x + tw - 5, top + h + 5)
    .lineTo(x + tw - 6, top + h + 7)
    .stroke({ color: COL_FUR_DK, width: 0.8 });
  // Fur trim on loincloth top
  g.ellipse(cx + tilt, top + h - 2, tw * 0.42, 1.8).fill({ color: COL_FUR });

  // Bulging veins on forearms (drawn on torso sides)
  g.moveTo(x - 0.5, top + 3)
    .lineTo(x - 1, top + h * 0.55)
    .stroke({ color: COL_VEIN, width: 0.5, alpha: 0.35 });
  g.moveTo(x + tw + 0.5, top + 3)
    .lineTo(x + tw + 1, top + h * 0.55)
    .stroke({ color: COL_VEIN, width: 0.5, alpha: 0.35 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 11;
  const hh = 10;
  const x  = cx - hw / 2 + tilt;

  // Wild hair mass — shaved sides, thick mohawk-ish crest
  // Side stubble
  g.roundRect(x - 0.5, top + 1, 3, hh - 2, 1).fill({ color: COL_HAIR_DK, alpha: 0.4 });
  g.roundRect(x + hw - 2.5, top + 1, 3, hh - 2, 1).fill({ color: COL_HAIR_DK, alpha: 0.4 });

  // Face base
  g.roundRect(x + 1, top + 2, hw - 2, hh - 3, 2).fill({ color: COL_SKIN });
  // Jaw shadow
  g.roundRect(x + 2, top + hh - 4, hw - 4, 2, 0.8).fill({ color: COL_SKIN_DK, alpha: 0.35 });

  // Warpaint on face — thick red lines through eyes
  g.moveTo(x + 1, top + 4.5)
    .lineTo(x + hw - 1, top + 4.5)
    .stroke({ color: COL_WARPAINT, width: 1.8, alpha: 0.65 });
  // Nose bridge stripe
  g.moveTo(cx + tilt, top + 2)
    .lineTo(cx + tilt, top + 7)
    .stroke({ color: COL_WARPAINT, width: 1.2, alpha: 0.5 });

  // Crazed wide eyes (whites showing, pinpoint pupils)
  g.rect(cx - 3.5 + tilt, top + 4, 2.8, 2).fill({ color: 0xffffff });
  g.rect(cx + 0.7 + tilt,  top + 4, 2.8, 2).fill({ color: 0xffffff });
  // Blood-shot veins in whites
  g.moveTo(cx - 3.5 + tilt, top + 5)
    .lineTo(cx - 1.5 + tilt, top + 5.2)
    .stroke({ color: COL_BLOOD, width: 0.3, alpha: 0.55 });
  g.moveTo(cx + 3.5 + tilt, top + 5)
    .lineTo(cx + 1.5 + tilt, top + 5.2)
    .stroke({ color: COL_BLOOD, width: 0.3, alpha: 0.55 });
  // Tiny pinpoint pupils (off-center for crazed look)
  g.circle(cx - 2.3 + tilt, top + 4.8, 0.55).fill({ color: 0x110000 });
  g.circle(cx + 1.8 + tilt,  top + 5.2, 0.55).fill({ color: 0x110000 });
  // Furious angled brows
  g.moveTo(cx - 4 + tilt, top + 3.5)
    .lineTo(cx - 0.8 + tilt, top + 4.2)
    .stroke({ color: COL_HAIR_DK, width: 0.9 });
  g.moveTo(cx + 4 + tilt, top + 3.5)
    .lineTo(cx + 0.8 + tilt, top + 4.2)
    .stroke({ color: COL_HAIR_DK, width: 0.9 });

  // Nose
  g.roundRect(cx - 1.5 + tilt, top + 6.2, 3, 2, 0.6).fill({ color: COL_SKIN_DK, alpha: 0.55 });
  // Bared teeth / open mouth (crazed snarl)
  g.roundRect(cx - 2.5 + tilt, top + 7.8, 5, 1.8, 0.5).fill({ color: COL_SKIN_SHADOW });
  // Teeth
  for (let i = 0; i < 3; i++) {
    g.rect(cx - 2 + tilt + i * 1.5, top + 7.8, 1.2, 1.5).fill({ color: 0xeee8d8 });
  }
  // Blood at mouth corner
  g.circle(cx + 2.5 + tilt, top + 8.5, 0.7).fill({ color: COL_BLOOD, alpha: 0.7 });

  // Hair crest rising above head — red streaked wild locks
  const crests: [number, number, number][] = [
    [-3, -5, 1.4], [-1, -6, 1.6], [1, -7, 1.8],
    [3, -6, 1.5],  [4.5, -4, 1.2],
  ];
  for (const [hx, hy, hw2] of crests) {
    g.moveTo(cx + hx - hw2 * 0.5 + tilt, top + 2)
      .lineTo(cx + hx + tilt, top + hy)
      .lineTo(cx + hx + hw2 * 0.5 + tilt, top + 2)
      .closePath()
      .fill({ color: COL_HAIR });
    // Red streak through hair
    g.moveTo(cx + hx + tilt, top + 2)
      .lineTo(cx + hx + tilt, top + hy + 1)
      .stroke({ color: COL_HAIR_HI, width: 0.5, alpha: 0.5 });
  }
  // Blood drip from hair onto forehead
  g.moveTo(cx + 1 + tilt, top + 2)
    .lineTo(cx + 1 + tilt, top + 4)
    .stroke({ color: COL_BLOOD, width: 0.8, alpha: 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Muscular bare arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 3.5 });
  // Muscle highlight
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.circle(mx, my, 2).fill({ color: COL_SKIN_HI, alpha: 0.28 });
  // Vein along arm
  g.moveTo(lerp(sx, ex, 0.2), lerp(sy, ey, 0.2))
    .lineTo(lerp(sx, ex, 0.7), lerp(sy, ey, 0.7))
    .stroke({ color: COL_VEIN, width: 0.4, alpha: 0.32 });
  // Leather wrist wrap
  const wx = lerp(sx, ex, 0.82);
  const wy = lerp(sy, ey, 0.82);
  g.circle(wx, wy, 1.8).fill({ color: COL_STRAP });
  // Blood smear on arm
  g.circle(lerp(sx, ex, 0.45), lerp(sy, ey, 0.5), 0.9).fill({ color: COL_BLOOD, alpha: 0.38 });
  // Knuckles
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

function drawHandAxe(
  g: Graphics,
  hx: number,
  hy: number,
  angle: number,
  haftLen = 15,
  bloodAmount = 0.6,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const headX = hx + sin * haftLen;
  const headY = hy - cos * haftLen;

  // Thick dark haft
  g.moveTo(hx, hy).lineTo(headX, headY)
    .stroke({ color: COL_AXE_HAFT, width: 2.5 });
  // Wood grain
  g.moveTo(hx + cos * 0.4, hy + sin * 0.4)
    .lineTo(headX + cos * 0.4, headY + sin * 0.4)
    .stroke({ color: COL_AXE_HAFT_DK, width: 0.5 });

  // Leather grip wrap (lower third)
  for (let i = 0; i < 4; i++) {
    const wt  = 0.05 + i * 0.06;
    const wpx = lerp(hx, headX, wt);
    const wpy = lerp(hy, headY, wt);
    g.circle(wpx, wpy, 1.6).fill({ color: COL_AXE_WRAP });
  }

  // Iron collar at haft top
  g.circle(lerp(hx, headX, 0.78), lerp(hy, headY, 0.78), 2.2)
    .fill({ color: COL_AXE_DK })
    .stroke({ color: COL_AXE_HEAD, width: 0.4 });

  // Axe head — heavy forward-heavy shape with serrated lower edge
  const bladeH = 9;
  const bladeW = 6;

  // Main blade body (swept forward)
  const t1x = headX + cos * bladeW * 0.3 + sin * bladeH;
  const t1y = headY + sin * bladeW * 0.3 - cos * bladeH;
  const t2x = headX + cos * bladeW;
  const t2y = headY + sin * bladeW;
  const t3x = headX + cos * bladeW * 0.3 - sin * (bladeH * 0.4);
  const t3y = headY + sin * bladeW * 0.3 + cos * (bladeH * 0.4);

  g.moveTo(headX - cos * 0.5, headY - sin * 0.5)
    .lineTo(t1x, t1y)
    .lineTo(t2x, t2y)
    .lineTo(t3x, t3y)
    .closePath()
    .fill({ color: COL_AXE_HEAD })
    .stroke({ color: COL_AXE_DK, width: 0.5 });

  // Serrated lower edge — 3 notches
  const notches = 3;
  for (let i = 1; i <= notches; i++) {
    const nt = i / (notches + 1);
    const nx1 = lerp(headX - cos * 0.5, t3x, nt);
    const ny1 = lerp(headY - sin * 0.5, t3y, nt);
    const nx2 = lerp(headX - cos * 0.5, t3x, nt + 0.08);
    const ny2 = lerp(headY - sin * 0.5, t3y, nt + 0.08);
    g.moveTo(nx1, ny1)
      .lineTo(nx1 - cos * 1.8, ny1 - sin * 1.8)
      .lineTo(nx2, ny2)
      .stroke({ color: COL_AXE_SERR, width: 0.7 });
  }

  // Sharpened edge highlight (top-forward sweep)
  g.moveTo(t1x, t1y).lineTo(t2x, t2y)
    .stroke({ color: COL_AXE_HI, width: 1.2, alpha: 0.75 });

  // Blood coating on blade
  if (bloodAmount > 0) {
    g.moveTo(t1x, t1y).lineTo(t2x, t2y).lineTo(t3x, t3y)
      .stroke({ color: COL_AXE_BLOOD, width: 1.5, alpha: bloodAmount * 0.55 });
    // Drip off lower tip
    const drip1X = lerp(t2x, t3x, 0.6) + sin * 1;
    const drip1Y = lerp(t2y, t3y, 0.6) - cos * 1;
    g.circle(drip1X, drip1Y, 0.8).fill({ color: COL_BLOOD_DRIP, alpha: bloodAmount * 0.7 });
    const drip2X = t3x + sin * 2;
    const drip2Y = t3y - cos * 2;
    g.circle(drip2X, drip2Y, 0.6).fill({ color: COL_BLOOD, alpha: bloodAmount * 0.6 });
  }
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  // Twitchy micro-sways — shoulders heaving with rage-breathe
  const breathe = Math.sin(t * Math.PI * 2) * 0.7;
  const twitch  = Math.sin(t * Math.PI * 4) * 0.25; // fast micro-twitch
  const sway    = Math.sin(t * Math.PI * 2) * 0.5;

  const legH     = 8;
  const torsoH   = 13;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop  = torsoTop - 10;

  // Drip below each axe
  const lAxeBaseX = CX - 9 + twitch;
  const lAxeBaseY = torsoTop + torsoH - 2;
  const rAxeBaseX = CX + 9;
  const rAxeBaseY = torsoTop + torsoH - 2;

  // Axe blood drips hitting floor
  if (frame % 3 === 0) {
    g.circle(lAxeBaseX - 3, GY - 1, 0.7).fill({ color: COL_BLOOD, alpha: 0.4 });
  }
  if (frame % 5 === 0) {
    g.circle(rAxeBaseX + 3, GY - 1, 0.6).fill({ color: COL_BLOOD_DK, alpha: 0.35 });
  }

  drawShadow(g, CX, GY);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX + twitch * 0.3, torsoTop, torsoH, sway * 0.2);
  drawHead(g, CX, headTop, sway * 0.18);

  // Left axe — held at side, pointed slightly inward, twitching
  const lAngle = -0.2 + twitch * 0.08;
  drawArm(g, CX - 7, torsoTop + 3, lAxeBaseX, lAxeBaseY);
  drawHandAxe(g, lAxeBaseX, lAxeBaseY, lAngle, 14, 0.65);

  // Right axe — held at side, mirrored
  const rAngle = 0.2 - twitch * 0.08;
  drawArm(g, CX + 7, torsoTop + 3, rAxeBaseX, rAxeBaseY);
  drawHandAxe(g, rAxeBaseX, rAxeBaseY, rAngle, 14, 0.7);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t     = frame / 8;
  const sprint = Math.sin(t * Math.PI * 2);
  const bob    = Math.abs(sprint) * 1.8;

  const legH     = 8;
  const torsoH   = 13;
  const stanceL  = Math.round(sprint * 4);
  const stanceR  = Math.round(-sprint * 4);
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.45);
  const headTop  = torsoTop - 10;

  // Aggressive lean forward
  const lean  = 2.5; // constant forward lean
  const tilt  = lean + sprint * 0.5;

  drawShadow(g, CX + lean, GY, 13 + Math.abs(sprint) * 2, 3.5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX + lean * 0.5, torsoTop, torsoH, tilt * 0.6);
  drawHead(g, CX + lean * 0.4, headTop, tilt * 0.45);

  // Hair streams behind (animated wave)
  const hairStream = -sprint * 3 - lean;
  // Hair streaks
  for (let i = 0; i < 5; i++) {
    const hsx = CX + lean * 0.4 - 2 + i * 1.5;
    const hsy = headTop + 1;
    g.moveTo(hsx, hsy)
      .quadraticCurveTo(hsx + hairStream * 0.8, hsy - 2, hsx + hairStream * 1.6, hsy + 3 + i * 0.5)
      .stroke({ color: i % 2 === 0 ? COL_HAIR : COL_HAIR_HI, width: 1.2 });
  }

  // Arms pump — axes trail back during sprint
  const armSwing = sprint * 3.5;
  const lHandX   = CX + lean * 0.5 - 8 - armSwing;
  const lHandY   = torsoTop + torsoH - 2;
  drawArm(g, CX + lean * 0.5 - 7, torsoTop + 3, lHandX, lHandY);
  drawHandAxe(g, lHandX, lHandY, -0.3 - sprint * 0.12, 13, 0.6);

  const rHandX = CX + lean * 0.5 + 8 + armSwing;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + lean * 0.5 + 7, torsoTop + 3, rHandX, rHandY);
  drawHandAxe(g, rHandX, rHandY, 0.3 + sprint * 0.12, 13, 0.65);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: windup/spin start; 2-4: full wild double spinning slash; 5-6: follow through; 7: recover
  const phases = [0, 0.1, 0.22, 0.36, 0.52, 0.66, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH     = 8;
  const torsoH   = 13;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop  = torsoTop - 10;

  // Spinning body tilt
  const spin  = Math.sin(t * Math.PI * 1.5) * 4; // total body lean
  const lunge = t > 0.18 && t < 0.88 ? 4 : 0;

  drawShadow(g, CX + spin * 0.3, GY, 13 + Math.abs(spin) * 0.5, 3.5);
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, spin * 0.45);
  drawHead(g, CX, headTop, spin * 0.35);

  // Blood trail arcs (spinning creates arc)
  if (t >= 0.22 && t <= 0.66) {
    const arcT     = (t - 0.22) / 0.44;
    const trailA   = (1 - Math.abs(arcT - 0.5) * 1.6) * 0.55;
    // Right axe arc trail
    g.moveTo(CX + 12, torsoTop - 4)
      .bezierCurveTo(
        CX + 20, torsoTop,
        CX + 18, torsoTop + 10,
        CX + 10, torsoTop + 14,
      )
      .stroke({ color: COL_BLOOD, width: 2, alpha: trailA * 0.55 });
    // Left axe arc trail
    g.moveTo(CX - 14, torsoTop - 2)
      .bezierCurveTo(
        CX - 20, torsoTop + 4,
        CX - 16, torsoTop + 12,
        CX - 6, torsoTop + 14,
      )
      .stroke({ color: COL_BLOOD, width: 1.8, alpha: trailA * 0.45 });
    // Blood splatter droplets along path
    for (let i = 0; i < 4; i++) {
      const pf   = arcT + (i - 2) * 0.08;
      const px   = CX + 8 + Math.cos(pf * Math.PI) * 12;
      const py   = torsoTop + 5 + Math.sin(pf * Math.PI) * 8;
      const pAlpha = trailA * 0.4 * (1 - Math.abs(i - 1.5) * 0.35);
      g.circle(px, py, 1 + i * 0.3).fill({ color: COL_BLOOD_DRIP, alpha: pAlpha });
    }
  }

  // Right axe — sweeping wide arc
  let rAngle: number;
  if (t < 0.22) {
    rAngle = lerp(0.25, -1.4, t / 0.22);
  } else if (t < 0.52) {
    rAngle = lerp(-1.4, 1.8, (t - 0.22) / 0.3);
  } else {
    rAngle = lerp(1.8, 0.25, (t - 0.52) / 0.48);
  }
  const rReach  = t > 0.18 && t < 0.7 ? clamp01((t - 0.18) / 0.2) * 4 : 0;
  const rHandX  = CX + 8 + spin * 0.5 + rReach;
  const rHandY  = torsoTop + 2;
  drawArm(g, CX + 7 + spin * 0.4, torsoTop + 3, rHandX, rHandY);
  drawHandAxe(g, rHandX, rHandY, rAngle, 14, 0.8);

  // Left axe — delayed spinning slash (half-cycle offset)
  let lAngle: number;
  if (t < 0.36) {
    lAngle = lerp(-0.3, -2.0, clamp01(t / 0.36));
  } else if (t < 0.66) {
    lAngle = lerp(-2.0, 1.5, (t - 0.36) / 0.3);
  } else {
    lAngle = lerp(1.5, -0.3, (t - 0.66) / 0.34);
  }
  const lReach  = t > 0.28 && t < 0.75 ? clamp01((t - 0.28) / 0.2) * 4 : 0;
  const lHandX  = CX - 8 + spin * 0.3 - lReach;
  const lHandY  = torsoTop + 4;
  drawArm(g, CX - 7 + spin * 0.3, torsoTop + 3, lHandX, lHandY);
  drawHandAxe(g, lHandX, lHandY, lAngle, 14, 0.75);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Howls to sky — crimson berserk aura pulses outward, eyes glow, veins pop
  const t         = frame / 7;
  const pulse     = Math.sin(t * Math.PI * 2.5) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.6);

  const legH     = 8;
  const torsoH   = 13;
  const legTop   = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop  = torsoTop - 10;

  // Berserk aura — concentric crimson rings
  const auraR  = 12 + intensity * 11 + pulse * 5;
  g.circle(CX, torsoTop + torsoH * 0.35, auraR)
    .fill({ color: COL_RAGE, alpha: 0.05 + intensity * 0.08 });
  g.circle(CX, torsoTop + torsoH * 0.35, auraR * 0.65)
    .fill({ color: COL_RAGE, alpha: 0.08 + intensity * 0.1 });
  g.circle(CX, torsoTop + torsoH * 0.35, auraR * 0.35)
    .fill({ color: COL_RAGE_CORE, alpha: 0.1 + intensity * 0.12 + pulse * 0.06 });
  // Pulsing outer ring stroke
  g.circle(CX, torsoTop + torsoH * 0.35, auraR)
    .stroke({ color: COL_RAGE_RING, width: 0.8, alpha: 0.12 + pulse * 0.1 });

  // Energy sparks radiating outward
  if (intensity > 0.25) {
    for (let i = 0; i < 8; i++) {
      const ang  = t * Math.PI * 3 + i * (Math.PI / 4);
      const dist = auraR * 0.75 + i * 1.2;
      const px   = CX + Math.cos(ang) * dist;
      const py   = torsoTop + torsoH * 0.35 + Math.sin(ang) * dist * 0.5;
      const pA   = clamp01(0.1 + pulse * 0.25 - i * 0.02) * clamp01(intensity - 0.25);
      g.circle(px, py, 0.9 + pulse * 0.4).fill({ color: COL_RAGE_RING, alpha: pA });
    }
  }

  drawShadow(g, CX, GY, 13, 3.5, 0.32 + intensity * 0.18);
  drawBoots(g, CX, GY, -2, 2);
  drawLegs(g, CX, legTop, legH, -2, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop - intensity * 1.5); // head tilts back as howling

  // Arms thrown wide — howl pose
  const raise  = intensity * 5;
  const spread = intensity * 4;
  drawArm(g, CX + 7, torsoTop + 4, CX + 12 + spread, torsoTop + 1 - raise);
  drawArm(g, CX - 7, torsoTop + 4, CX - 12 - spread, torsoTop + 1 - raise);

  // Both axes raised — glinting with aura light
  const rAxeGlow = 0.6 + pulse * 0.3;
  const lAxeGlow = 0.55 + pulse * 0.3;
  drawHandAxe(g, CX + 12 + spread, torsoTop + 1 - raise, -0.7 + pulse * 0.08, 14, rAxeGlow);
  drawHandAxe(g, CX - 12 - spread, torsoTop + 1 - raise, 0.7 - pulse * 0.08, 14, lAxeGlow);

  // Rage veins on torso bulging
  if (intensity > 0.3) {
    const vA = clamp01(intensity - 0.3) * 0.5;
    const tw = 14;
    const tx = CX - tw / 2;
    g.moveTo(tx + 2, torsoTop + 3)
      .lineTo(tx,     torsoTop + 8)
      .stroke({ color: COL_VEIN, width: 0.7, alpha: vA });
    g.moveTo(tx + tw - 2, torsoTop + 3)
      .lineTo(tx + tw, torsoTop + 8)
      .stroke({ color: COL_VEIN, width: 0.7, alpha: vA });
    g.moveTo(CX, torsoTop + 4)
      .lineTo(CX - 1, torsoTop + 9)
      .stroke({ color: COL_VEIN, width: 0.5, alpha: vA * 0.8 });
  }

  // Howl scream lines from mouth
  if (intensity > 0.4) {
    const screamA = clamp01(intensity - 0.4) * 0.55;
    for (let i = 0; i < 5; i++) {
      const ang    = -1.1 + i * 0.55;
      const sLen   = 4 + pulse * 3 + i * 0.5;
      const startR = 5;
      const sx     = CX + Math.cos(ang) * startR;
      const sy     = headTop + 7 + Math.sin(ang) * startR * 0.4;
      const ex     = CX + Math.cos(ang) * (startR + sLen);
      const ey     = headTop + 7 + Math.sin(ang) * (startR + sLen) * 0.4;
      g.moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({ color: COL_RAGE_RING, width: 0.7, alpha: screamA });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 0: hit mid-swing → 1-2: momentum carries, stumbles → 3-5: falls forward → 6-7: axes plant, crumple
  const t = frame / 7;

  const legH     = 8;
  const torsoH   = 13;
  const legTop   = GY - 5 - legH;

  const fallX    = t * 12;  // falls forward (right)
  const dropY    = t * t * 11;
  const fallAngle = t * 1.0; // tip forward

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop  = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.4, GY, 13 + t * 4.5, 3.5, 0.32 * (1 - t * 0.4));

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.15, GY, t * 1.5, -t * 0.8, squash);
  if (t < 0.65) {
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 1.5, -t * 0.8);
  }

  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.12), fallAngle * 3.5);
  if (t < 0.85) {
    drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.35, fallAngle * 4.2);
  }

  // Left axe plants in ground mid-swing as warrior falls
  if (t > 0.35) {
    const plantT = clamp01((t - 0.35) / 0.3);
    // Axe arcs from hand down into ground
    const lAxeX = CX + fallX * 0.2 - 6 + plantT * 2;
    const lAxeY = lerp(torsoTop + torsoH - 2, GY - 4, plantT);
    const lAngle = lerp(-0.3, 0.8, plantT); // tip forward as it plants
    drawHandAxe(g, lAxeX, lAxeY, lAngle, 14 * (1 - plantT * 0.1), 0.9);
  } else {
    // Still in mid-swing before planting
    const lHandX = CX + fallX * 0.3 - 10;
    const lHandY = torsoTop + 2;
    drawArm(g, CX + fallX * 0.4 - 7, torsoTop + 3, lHandX, lHandY);
    drawHandAxe(g, lHandX, lHandY, -1.2, 14, 0.85);
  }

  // Right axe — carries through the swing, plants on the other side
  if (t > 0.48) {
    const plantT2 = clamp01((t - 0.48) / 0.3);
    const rAxeX   = CX + fallX * 0.4 + 8 + plantT2 * 3;
    const rAxeY   = lerp(torsoTop + 2, GY - 4, plantT2);
    const rAngle  = lerp(1.6, -0.5, plantT2);
    drawHandAxe(g, rAxeX, rAxeY, rAngle, 14 * (1 - plantT2 * 0.08), 0.9);
  } else {
    const rHandX = CX + fallX * 0.4 + 11;
    const rHandY = torsoTop + 2;
    drawArm(g, CX + fallX * 0.4 + 7, torsoTop + 3, rHandX, rHandY);
    drawHandAxe(g, rHandX, rHandY, 1.6, 14, 0.85);
  }

  // Body crumple — arm flops
  if (t > 0.55) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 3,
      CX + fallX * 0.4 + 10,
      torsoTop + torsoH - 1,
    );
  }

  // Blood pool spreading on ground (final frames)
  if (t > 0.72) {
    const poolT = (t - 0.72) / 0.28;
    g.ellipse(CX + fallX * 0.35, GY + 1, 6 + poolT * 5, 2.5 + poolT * 1.5)
      .fill({ color: COL_BLOOD, alpha: poolT * 0.35 });
    g.ellipse(CX + fallX * 0.35, GY + 1, 3 + poolT * 3, 1 + poolT)
      .fill({ color: COL_BLOOD_DK, alpha: poolT * 0.3 });
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame,   8],
  [generateMoveFrame,   8],
  [generateAttackFrame, 8],
  [generateCastFrame,   8],
  [generateDieFrame,    8],
];

/**
 * Generate all BloodBerserker sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBloodBerserkerFrames(renderer: Renderer): RenderTexture[] {
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
