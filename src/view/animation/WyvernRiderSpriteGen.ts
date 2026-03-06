// Procedural sprite generator for the WyvernRider unit type.
//
// Draws an orc mounted on a wyvern at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Green-skinned orc in spiked leather armor with lance/spear
//   • Wyvern: dark green/grey bat-winged dragon-like creature
//   • Wyvern has no front legs — only powerful rear legs and wings
//   • Venomous barbed tail, leathery wings, yellow slit-pupil eyes
//   • Large unit that fills most of the 48×48 frame
//   • Poison-green color accents on tail and venom glands

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — wyvern dark greens and grey
const COL_WYV_BODY = 0x2d4a2a;      // dark forest green main body
const COL_WYV_BODY_DK = 0x1a2e18;   // deep shadow green
const COL_WYV_BELLY = 0x4a6644;     // lighter belly scales
const COL_WYV_SCALE_HI = 0x3d6038;  // highlight on scales
const COL_WYV_WING = 0x1f3320;      // very dark wing membrane
const COL_WYV_WING_MEM = 0x2a4428;  // wing membrane lighter
const COL_WYV_WING_VN = 0x1a2a1c;   // wing veins
const COL_WYV_EYE = 0xddcc00;       // yellow slit eye
const COL_WYV_PUPIL = 0x1a1000;     // dark pupil slit
const COL_WYV_TOOTH = 0xe8e0c0;     // ivory teeth
const COL_WYV_HORN = 0x3a3228;      // dark horn/spine
const COL_WYV_CLAW = 0x2a2820;      // dark talons

// Poison/venom
const COL_VENOM = 0x44dd44;         // bright poison green
const COL_VENOM_GLOW = 0x88ff88;    // venom glow
const COL_VENOM_DK = 0x228822;      // darker venom
const COL_TAIL_BARB = 0x556655;     // barbed tail tip

// Orc rider palette
const COL_ORC_SKIN = 0x3a7a2a;      // green orc skin
const COL_ORC_SKIN_DK = 0x286018;   // darker orc shadow
const COL_ORC_ARMOR = 0x3a3228;     // dark leather armor
const COL_ORC_ARMOR_HI = 0x554840;  // armor highlight
const COL_ORC_SPIKE = 0x5a5248;     // leather spikes
const COL_ORC_SPIKE_TIP = 0x8a7868; // spike metal tips
const COL_ORC_EYE = 0xdd4400;       // red orc eye
const COL_ORC_TUSK = 0xe8e0b0;      // ivory tusk
const COL_ORC_HAIR = 0x1a1410;      // dark orc hair (matted)

// Lance
const COL_LANCE_SHAFT = 0x5a4030;   // dark wood shaft
const COL_LANCE_HEAD = 0xb0b8c0;    // iron spearhead
const COL_LANCE_HEAD_HI = 0xd8e0e8; // spearhead gleam
const COL_LANCE_WRAP = 0x6a3020;    // leather binding

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
  w = 16,
  h = 3,
  alpha = 0.28,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

// Draw the wyvern's rear leg and foot
function drawWyvernLeg(
  g: Graphics,
  x: number,
  y: number,
  angle: number, // rotation of leg
  side: number,  // -1 left, 1 right
): void {
  const thighLen = 7;
  const shinLen = 6;
  const thighAngle = angle;
  const shinAngle = angle + 0.6 * side;

  const kneeX = x + Math.sin(thighAngle) * thighLen * side;
  const kneeY = y + Math.cos(thighAngle) * thighLen;
  const footX = kneeX + Math.sin(shinAngle) * shinLen * side;
  const footY = kneeY + Math.cos(shinAngle) * shinLen;

  // Thigh
  g.moveTo(x, y).lineTo(kneeX, kneeY)
    .stroke({ color: COL_WYV_BODY, width: 4 });
  g.moveTo(x, y).lineTo(kneeX, kneeY)
    .stroke({ color: COL_WYV_BODY_DK, width: 1.5, alpha: 0.5 });

  // Shin
  g.moveTo(kneeX, kneeY).lineTo(footX, footY)
    .stroke({ color: COL_WYV_BODY_DK, width: 3 });

  // Foot / talons
  for (let c = 0; c < 3; c++) {
    const ca = shinAngle + (c - 1) * 0.3 * side;
    const cLen = 3 + (c === 1 ? 1 : 0);
    g.moveTo(footX, footY)
      .lineTo(footX + Math.sin(ca) * cLen * side, footY + Math.cos(ca) * 2)
      .stroke({ color: COL_WYV_CLAW, width: 1.2 });
  }
}

// Draw wyvern wing (folded or spread)
function drawWyvernWing(
  g: Graphics,
  rootX: number,
  rootY: number,
  spread: number,  // 0=folded, 1=fully spread
  side: number,    // -1=left, 1=right
  waveOffset = 0,
): void {
  const elbX = rootX + side * (4 + spread * 16);
  const elbY = rootY - (4 + spread * 10) + waveOffset;
  const tipX = elbX + side * (3 + spread * 12);
  const tipY = elbY + (6 - spread * 8) + waveOffset * 0.5;

  // Wing membrane (filled polygon)
  const memAlpha = 0.88;

  // Main membrane from root to tip
  const ctrl1X = rootX + side * (8 + spread * 10);
  const ctrl1Y = rootY - (2 + spread * 14);
  const ctrl2X = tipX - side * 4;
  const ctrl2Y = tipY - 4;

  g.moveTo(rootX, rootY)
    .bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tipX, tipY)
    .lineTo(rootX + side * 2, rootY + 6)
    .closePath()
    .fill({ color: COL_WYV_WING_MEM, alpha: memAlpha });

  // Wing arm/bone
  g.moveTo(rootX, rootY).lineTo(elbX, elbY)
    .stroke({ color: COL_WYV_BODY, width: 2.5 });
  g.moveTo(elbX, elbY).lineTo(tipX, tipY)
    .stroke({ color: COL_WYV_BODY_DK, width: 1.8 });

  // Wing veins
  const veinAlpha = 0.35;
  for (let v = 0; v < 4; v++) {
    const vt = (v + 1) / 5;
    const vStartX = lerp(rootX, elbX, vt * 0.7);
    const vStartY = lerp(rootY, elbY, vt * 0.7);
    const vEndX = vStartX + side * (3 + spread * 6 * (1 - vt));
    const vEndY = vStartY + 5 + spread * 3;
    g.moveTo(vStartX, vStartY).lineTo(vEndX, vEndY)
      .stroke({ color: COL_WYV_WING_VN, width: 0.7, alpha: veinAlpha });
  }

  // Wing tip finger bones
  if (spread > 0.3) {
    for (let f = 0; f < 3; f++) {
      const fAngle = (f - 1) * 0.3;
      g.moveTo(tipX, tipY)
        .lineTo(tipX + side * Math.cos(fAngle) * (3 + spread * 3), tipY + Math.sin(fAngle + 0.5) * 4)
        .stroke({ color: COL_WYV_BODY_DK, width: 0.8, alpha: 0.6 });
    }
  }
}

// Draw the wyvern's barbed tail
function drawWyvernTail(
  g: Graphics,
  rootX: number,
  rootY: number,
  curve: number,  // tail curve factor
  venomGlow = 0,  // 0-1 for poison mist
): void {
  // Tail segments — 3 bezier curves tapering
  const seg1EndX = rootX - 8 - curve * 2;
  const seg1EndY = rootY + 3 + curve;
  const seg2EndX = seg1EndX - 7 - curve;
  const seg2EndY = seg1EndY - 2 + curve * 2;
  const barbX = seg2EndX - 5;
  const barbY = seg2EndY + curve * 3;

  // Tail width gradient
  g.moveTo(rootX, rootY)
    .bezierCurveTo(rootX - 3, rootY + 2, seg1EndX + 2, seg1EndY - 1, seg1EndX, seg1EndY)
    .stroke({ color: COL_WYV_BODY, width: 4 });
  g.moveTo(seg1EndX, seg1EndY)
    .bezierCurveTo(seg1EndX - 2, seg1EndY + 1, seg2EndX + 2, seg2EndY - 1, seg2EndX, seg2EndY)
    .stroke({ color: COL_WYV_BODY_DK, width: 2.5 });

  // Scale ridge along tail
  for (let s = 0; s < 4; s++) {
    const st = s / 4;
    const sx = lerp(rootX, seg2EndX, st);
    const sy = lerp(rootY, seg2EndY, st);
    g.circle(sx, sy, 1 - st * 0.5).fill({ color: COL_WYV_BODY_DK, alpha: 0.4 });
  }

  // Barb tip
  g.moveTo(seg2EndX, seg2EndY)
    .lineTo(barbX, barbY)
    .stroke({ color: COL_TAIL_BARB, width: 1.5 });
  // Barb triangle
  g.moveTo(barbX, barbY)
    .lineTo(barbX - 3, barbY - 2)
    .lineTo(barbX + 1, barbY - 4)
    .closePath()
    .fill({ color: COL_TAIL_BARB });
  // Barb venom glands
  g.circle(barbX - 1, barbY - 1, 1.2).fill({ color: COL_VENOM_DK });

  // Venom drip/glow
  if (venomGlow > 0) {
    g.circle(barbX, barbY + 1, 2 + venomGlow * 2).fill({ color: COL_VENOM, alpha: venomGlow * 0.5 });
    g.circle(barbX, barbY + 1, 1).fill({ color: COL_VENOM_GLOW, alpha: venomGlow * 0.8 });
  }
}

// Draw the wyvern body and head
function drawWyvernBody(
  g: Graphics,
  cx: number,
  cy: number,
  breathe = 0,
  headAngle = 0, // head tilt
): void {
  // Main body — elongated, no front legs
  g.roundRect(cx - 12, cy - 4 + breathe * 0.3, 22, 12 - breathe * 0.3, 4)
    .fill({ color: COL_WYV_BODY })
    .stroke({ color: COL_WYV_BODY_DK, width: 0.5 });

  // Belly scales (lighter underside)
  g.roundRect(cx - 9, cy + 2, 16, 5, 2)
    .fill({ color: COL_WYV_BELLY, alpha: 0.7 });

  // Scale texture on back
  for (let s = 0; s < 5; s++) {
    const sx = cx - 10 + s * 4;
    g.roundRect(sx, cy - 3, 3, 2, 0.5)
      .fill({ color: COL_WYV_SCALE_HI, alpha: 0.3 });
  }

  // Neck
  const neckEndX = cx + 8 + headAngle * 3;
  const neckEndY = cy - 6 - headAngle * 2;
  g.moveTo(cx + 6, cy - 2)
    .quadraticCurveTo(cx + 9, cy - 5, neckEndX, neckEndY)
    .stroke({ color: COL_WYV_BODY, width: 6 });
  g.moveTo(cx + 6, cy - 2)
    .quadraticCurveTo(cx + 9, cy - 5, neckEndX, neckEndY)
    .stroke({ color: COL_WYV_BODY_DK, width: 1.5, alpha: 0.4 });

  // Head
  const hx = neckEndX + 2;
  const hy = neckEndY - 4;
  g.roundRect(hx - 3, hy, 8, 6, 2)
    .fill({ color: COL_WYV_BODY })
    .stroke({ color: COL_WYV_BODY_DK, width: 0.5 });

  // Snout/jaw
  g.roundRect(hx + 3, hy + 2, 5, 4, 1)
    .fill({ color: COL_WYV_BODY_DK });

  // Eye — yellow slit
  g.ellipse(hx + 1, hy + 2, 2, 1.5).fill({ color: COL_WYV_EYE });
  g.rect(hx + 0.5, hy + 1.2, 0.8, 1.6).fill({ color: COL_WYV_PUPIL }); // slit pupil

  // Horns
  g.moveTo(hx - 1, hy)
    .lineTo(hx - 3, hy - 4)
    .stroke({ color: COL_WYV_HORN, width: 1.5 });
  g.moveTo(hx + 1, hy)
    .lineTo(hx + 1, hy - 3)
    .stroke({ color: COL_WYV_HORN, width: 1.2 });

  // Teeth
  g.moveTo(hx + 3, hy + 3).lineTo(hx + 4, hy + 5).stroke({ color: COL_WYV_TOOTH, width: 1 });
  g.moveTo(hx + 5, hy + 3).lineTo(hx + 6, hy + 5).stroke({ color: COL_WYV_TOOTH, width: 0.8 });

  // Dorsal spines on back
  for (let sp = 0; sp < 4; sp++) {
    const spx = cx - 8 + sp * 5;
    const spLen = 2 + (sp % 2) * 1.5;
    g.moveTo(spx, cy - 4)
      .lineTo(spx + 1, cy - 4 - spLen)
      .stroke({ color: COL_WYV_HORN, width: 1.2 });
  }
}

// Draw the orc rider
function drawOrcRider(
  g: Graphics,
  cx: number,
  cy: number,
  tilt = 0,
  headBob = 0,
): void {
  const torsoTop = cy - 16 + headBob * 0.3;
  const torsoH = 8;
  const headTop = torsoTop - 8;

  // Torso — spiked leather armor
  g.roundRect(cx - 5 + tilt, torsoTop, 10, torsoH, 1)
    .fill({ color: COL_ORC_ARMOR })
    .stroke({ color: COL_ORC_ARMOR_HI, width: 0.4 });

  // Armor details: chest studs
  g.circle(cx - 2 + tilt, torsoTop + 2, 1).fill({ color: COL_ORC_SPIKE_TIP });
  g.circle(cx + 2 + tilt, torsoTop + 2, 1).fill({ color: COL_ORC_SPIKE_TIP });

  // Shoulder spikes
  for (let s = 0; s < 2; s++) {
    const sx = cx + (s === 0 ? -5 : 5) + tilt;
    g.moveTo(sx, torsoTop + 1)
      .lineTo(sx + (s === 0 ? -2 : 2), torsoTop - 3)
      .stroke({ color: COL_ORC_SPIKE, width: 2 });
    g.moveTo(sx + (s === 0 ? -2 : 2), torsoTop - 3)
      .lineTo(sx + (s === 0 ? -2 : 2), torsoTop - 4.5)
      .stroke({ color: COL_ORC_SPIKE_TIP, width: 1.2 });
  }

  // Head — green orc
  const hw = 7;
  const hh = 7;
  g.roundRect(cx - hw / 2 + tilt, headTop, hw, hh, 1.5)
    .fill({ color: COL_ORC_SKIN })
    .stroke({ color: COL_ORC_SKIN_DK, width: 0.4 });

  // Orc features: low brow, tusks, red eyes
  const eyeY = headTop + hh * 0.38;
  g.ellipse(cx - 1.5 + tilt, eyeY, 1, 0.7).fill({ color: COL_ORC_EYE });
  g.ellipse(cx + 1.5 + tilt, eyeY, 1, 0.7).fill({ color: COL_ORC_EYE });

  // Heavy brow ridge
  g.moveTo(cx - 3.5 + tilt, eyeY - 1.2)
    .lineTo(cx + 3.5 + tilt, eyeY - 1.2)
    .stroke({ color: COL_ORC_SKIN_DK, width: 1.2 });

  // Tusks
  g.moveTo(cx - 1.2 + tilt, headTop + hh * 0.7)
    .lineTo(cx - 1.5 + tilt, headTop + hh + 1.5)
    .stroke({ color: COL_ORC_TUSK, width: 1.2 });
  g.moveTo(cx + 1.2 + tilt, headTop + hh * 0.7)
    .lineTo(cx + 1.5 + tilt, headTop + hh + 1.5)
    .stroke({ color: COL_ORC_TUSK, width: 1.2 });

  // Matted dark hair / mohawk
  g.roundRect(cx - 1 + tilt, headTop, 2, 3, 0.5).fill({ color: COL_ORC_HAIR });
}

// Draw the lance/spear
function drawLance(
  g: Graphics,
  hx: number,
  hy: number,
  angle: number,   // angle in radians (0=up, positive=tilting right)
  length = 22,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = hx + sin * length;
  const tipY = hy - cos * length;
  const buttX = hx - sin * (length * 0.35);
  const buttY = hy + cos * (length * 0.35);

  // Shaft
  g.moveTo(buttX, buttY).lineTo(tipX, tipY)
    .stroke({ color: COL_LANCE_SHAFT, width: 2 });

  // Leather wrapping bands
  for (let w = 0; w < 3; w++) {
    const wt = 0.2 + w * 0.2;
    const wx = lerp(buttX, tipX, wt);
    const wy = lerp(buttY, tipY, wt);
    g.moveTo(wx - cos * 1.5, wy - sin * 1.5)
      .lineTo(wx + cos * 1.5, wy + sin * 1.5)
      .stroke({ color: COL_LANCE_WRAP, width: 1.8 });
  }

  // Spearhead — elongated triangle
  const headLen = 6;
  const headW = 1.5;
  g.moveTo(tipX, tipY)
    .lineTo(tipX - sin * headLen * 0.3 - cos * headW, tipY + cos * headLen * 0.3 - sin * headW)
    .lineTo(tipX - sin * headLen, tipY + cos * headLen)
    .lineTo(tipX - sin * headLen * 0.3 + cos * headW, tipY + cos * headLen * 0.3 + sin * headW)
    .closePath()
    .fill({ color: COL_LANCE_HEAD })
    .stroke({ color: COL_LANCE_HEAD_HI, width: 0.5 });
  // Head highlight gleam
  g.moveTo(tipX - sin * 0.5 - cos * 0.5, tipY + cos * 0.5 - sin * 0.5)
    .lineTo(tipX - sin * headLen * 0.6 - cos * 0.3, tipY + cos * headLen * 0.6 - sin * 0.3)
    .stroke({ color: COL_LANCE_HEAD_HI, width: 0.8, alpha: 0.7 });

  // Butt cap
  g.circle(buttX, buttY, 1.5).fill({ color: COL_ORC_SPIKE_TIP });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.6;
  const tailCurve = Math.sin(t * Math.PI * 2) * 1.5;
  const wingFold = 0.08 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.05; // mostly folded

  const bodyY = 30 + breathe * 0.3;

  drawShadow(g, CX, GY, 17, 3);

  // Tail (drawn first, behind body)
  drawWyvernTail(g, CX - 10, bodyY + 2, tailCurve);

  // Wings folded close
  drawWyvernWing(g, CX - 8, bodyY - 2, wingFold, -1, breathe * 0.2);
  drawWyvernWing(g, CX - 2, bodyY - 2, wingFold, 1, breathe * 0.2);

  // Rear legs perched/gripping ground
  drawWyvernLeg(g, CX - 6, bodyY + 5, 0.15, -1);
  drawWyvernLeg(g, CX + 4, bodyY + 5, 0.15, 1);

  // Wyvern body and head
  drawWyvernBody(g, CX, bodyY, breathe, 0.1);

  // Orc rider sits upright, surveying
  drawOrcRider(g, CX + 2, bodyY, 0.1, breathe * 0.3);

  // Lance held upright at side
  drawLance(g, CX + 8, bodyY - 12, 0.15, 20);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 1.2;
  const wingSpread = 0.65 + Math.sin(t * Math.PI * 2) * 0.2; // wings spread for glide
  const waveOffset = Math.sin(t * Math.PI * 4) * 1.5;

  const bodyY = 28 - bob * 0.4;

  drawShadow(g, CX + 2, GY, 18, 2.5, 0.2 + wingSpread * 0.08);

  // Tail streams behind
  drawWyvernTail(g, CX - 10, bodyY + 2, -stride * 2 - 1);

  // Wings spread for gliding forward motion
  drawWyvernWing(g, CX - 8, bodyY - 2, wingSpread, -1, waveOffset);
  drawWyvernWing(g, CX - 2, bodyY - 2, wingSpread, 1, -waveOffset);

  // Legs tucked back in flight
  const legLift = 0.3 + stride * 0.15;
  drawWyvernLeg(g, CX - 5, bodyY + 5, legLift, -1);
  drawWyvernLeg(g, CX + 4, bodyY + 5, legLift, 1);

  // Wyvern body, head turned forward aggressively
  drawWyvernBody(g, CX, bodyY, 0, 0.25);

  // Orc leans forward with lance leveled
  drawOrcRider(g, CX + 2, bodyY, -0.15, -bob * 0.4);

  // Lance angled forward for charge
  drawLance(g, CX + 6, bodyY - 13, -0.4, 22);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1=dive wind up, 2-3=dive peak, 4-5=thrust lance, 6-7=recover
  const phases = [0, 0.12, 0.28, 0.45, 0.6, 0.75, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const diveDrop = t < 0.5 ? t * 10 : (1 - t) * 10;
  const bodyY = 24 + diveDrop;
  const wingBack = t < 0.5 ? 0.3 - t * 0.5 : t * 0.5; // wings swept back on dive

  drawShadow(g, CX, GY, 15 + diveDrop * 0.5, 2.5 + diveDrop * 0.1);

  // Tail swept back in dive
  drawWyvernTail(g, CX - 10, bodyY + 2, -2 - t * 2);

  // Wings swept back during dive
  drawWyvernWing(g, CX - 6, bodyY - 2, Math.max(0.05, wingBack), -1, 0);
  drawWyvernWing(g, CX - 2, bodyY - 2, Math.max(0.05, wingBack), 1, 0);

  // Legs extended to strike
  const legExtend = t > 0.4 && t < 0.75 ? (t - 0.4) * 3 : 0;
  drawWyvernLeg(g, CX - 5, bodyY + 5, 0.4 + legExtend * 0.2, -1);
  drawWyvernLeg(g, CX + 3, bodyY + 5, 0.4 + legExtend * 0.2, 1);

  // Wyvern dives forward, head lunging
  drawWyvernBody(g, CX, bodyY, 0, 0.4 + t * 0.2);

  // Orc leans into thrust
  const orcLean = t > 0.45 && t < 0.8 ? -0.4 : -0.1;
  drawOrcRider(g, CX + 3, bodyY, orcLean, 0);

  // Lance thrust downward during attack phase
  let lanceAngle: number;
  if (t < 0.4) {
    lanceAngle = lerp(-0.3, -0.8, t / 0.4); // wind up
  } else if (t < 0.65) {
    lanceAngle = lerp(-0.8, 0.6, (t - 0.4) / 0.25); // thrust down-forward
  } else {
    lanceAngle = lerp(0.6, -0.3, (t - 0.65) / 0.35); // recover
  }
  drawLance(g, CX + 7, bodyY - 13, lanceAngle, 22);

  // Lance impact flash at tip
  if (t >= 0.48 && t <= 0.62) {
    const lAlpha = clamp01(1 - Math.abs(t - 0.55) / 0.07) * 0.6;
    const cos = Math.cos(lanceAngle);
    const sin = Math.sin(lanceAngle);
    const tipX = CX + 7 + sin * 22;
    const tipY = bodyY - 13 - cos * 22;
    g.circle(tipX, tipY, 4).fill({ color: COL_LANCE_HEAD_HI, alpha: lAlpha * 0.5 });
    g.circle(tipX, tipY, 1.5).fill({ color: 0xffffff, alpha: lAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.2);
  const tailCurve = 3 + Math.sin(t * Math.PI * 2) * 2;

  const bodyY = 27;

  // Venom mist particles
  for (let p = 0; p < 8; p++) {
    const pa = t * Math.PI * 3 + p * (Math.PI / 4);
    const pDist = 4 + intensity * 10 + p * 1.2;
    const px = CX - 18 + Math.cos(pa) * pDist * 1.5;
    const py = bodyY + 8 + Math.sin(pa) * pDist * 0.6;
    const pAlpha = clamp01(0.2 + pulse * 0.4 - p * 0.02) * intensity;
    g.circle(px, py, 1.5 + pulse * 0.8).fill({ color: COL_VENOM, alpha: pAlpha });
  }

  // Venom cloud from tail barb
  const cloudAlpha = intensity * 0.3 + pulse * 0.15;
  g.circle(CX - 22, bodyY + 6, 5 + intensity * 8 + pulse * 2)
    .fill({ color: COL_VENOM, alpha: cloudAlpha * 0.4 });
  g.circle(CX - 22, bodyY + 6, 3 + intensity * 4)
    .fill({ color: COL_VENOM_GLOW, alpha: cloudAlpha * 0.6 });

  drawShadow(g, CX, GY, 17, 3);

  // Tail rears up with venom dripping
  drawWyvernTail(g, CX - 10, bodyY + 2, -tailCurve, 0.4 + pulse * 0.5);

  // Wings spread wide in display
  const displaySpread = 0.75 + pulse * 0.1;
  drawWyvernWing(g, CX - 8, bodyY - 2, displaySpread, -1, pulse * 0.5);
  drawWyvernWing(g, CX - 2, bodyY - 2, displaySpread, 1, -pulse * 0.5);

  // Legs planted
  drawWyvernLeg(g, CX - 6, bodyY + 5, 0.1, -1);
  drawWyvernLeg(g, CX + 4, bodyY + 5, 0.1, 1);

  // Wyvern rears up, head raised
  drawWyvernBody(g, CX, bodyY - intensity * 2, pulse * 0.3, -0.3 - intensity * 0.4);

  // Orc raises lance high
  drawOrcRider(g, CX + 2, bodyY - intensity * 2, 0.1, -intensity * 2);

  // Lance raised upward during cast
  const lanceAngle = lerp(0.15, -0.8, intensity + pulse * 0.1);
  drawLance(g, CX + 8, bodyY - 14 - intensity * 2, lanceAngle, 22);

  // Lance tip glow — imbued with venom
  const glowAlpha = intensity * 0.5 + pulse * 0.25;
  const lcos = Math.cos(lanceAngle);
  const lsin = Math.sin(lanceAngle);
  const ltipX = CX + 8 + lsin * 22;
  const ltipY = bodyY - 14 - intensity * 2 - lcos * 22;
  g.circle(ltipX, ltipY, 3 + pulse * 2).fill({ color: COL_VENOM, alpha: glowAlpha * 0.5 });
  g.circle(ltipX, ltipY, 1.5).fill({ color: COL_VENOM_GLOW, alpha: glowAlpha });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const crash = t * t; // accelerate crash
  const bodyY = 24 + crash * 12;
  const bodyTilt = t * 0.5; // wyvern tilting/crashing

  drawShadow(g, CX, GY, 17 + crash * 3, 3 + crash, 0.28 * (1 - t * 0.4));

  // Tail goes limp, drags
  drawWyvernTail(g, CX - 10 + t * 3, bodyY + 2, crash * 3);

  // Wings crumple progressively
  const crumpleL = Math.max(0.05, 0.5 - crash * 0.5);
  const crumpleR = Math.max(0.05, 0.35 - crash * 0.3);
  if (t < 0.8) {
    drawWyvernWing(g, CX - 8, bodyY - 2, crumpleL, -1, crash * 3);
  } else {
    // Wing fully crumpled on ground
    g.roundRect(CX - 20, bodyY + 3, 14, 3, 1).fill({ color: COL_WYV_WING, alpha: 0.6 });
  }
  if (t < 0.7) {
    drawWyvernWing(g, CX - 2, bodyY - 2, crumpleR, 1, crash * 2);
  }

  // Legs buckle
  drawWyvernLeg(g, CX - 5, bodyY + 5, 0.4 + crash * 0.4, -1);
  drawWyvernLeg(g, CX + 4, bodyY + 5, 0.3 + crash * 0.3, 1);

  // Wyvern body crashes down
  drawWyvernBody(g, CX + bodyTilt * 3, bodyY, 0, -0.2 + bodyTilt * 0.3);

  // Orc thrown from saddle after frame 3
  if (t < 0.45) {
    // Still mounted, lurching
    drawOrcRider(g, CX + 2 + t * 3, bodyY, bodyTilt * 2, crash * 3);
    // Lance drops
    if (t < 0.3) {
      drawLance(g, CX + 8 + t * 5, bodyY - 12 + crash * 8, 0.8 + t * 1.5, 20);
    }
  } else {
    // Orc thrown — tumbling separately
    const throwX = CX + 8 + (t - 0.45) * 18;
    const throwY = bodyY - 16 + (t - 0.45) * (t - 0.45) * 60;
    if (throwY < GY && t < 0.92) {
      drawOrcRider(g, throwX, throwY, (t - 0.45) * 3, (t - 0.45) * 8);
    }
    // Lance spinning away
    if (t < 0.75) {
      drawLance(g, throwX + 4, throwY - 4, 0.5 + t * 5, 18);
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
 * Generate all WyvernRider sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateWyvernRiderFrames(renderer: Renderer): RenderTexture[] {
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
