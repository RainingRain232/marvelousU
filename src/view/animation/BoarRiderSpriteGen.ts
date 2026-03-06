// Procedural sprite generator for the Boar Rider unit type.
//
// Draws an orc mounted on a war boar at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Green-skinned orc rider with brown leather armor
//   • Tusked brown war boar mount with coarse hide
//   • Rider holds crude spear/axe in right hand
//   • Boar has prominent tusks and bristled mane
//   • Charge-style attack animation — boar head-down
//   • Heavy, brutal movement style
//   • Size 2x2 (96×96 rendered area, drawn larger)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — orcish brown & green
const COL_ORC_SKIN = 0x5a8844; // green orc skin
const COL_ORC_SKIN_DK = 0x4a7834;

const COL_ORC_LEATHER = 0x5a4430; // crude leather armor
const COL_ORC_LEATHER_HI = 0x6e5840;
const COL_ORC_LEATHER_DK = 0x3e2e20;

const COL_ORC_TUSK = 0xe8e0c8; // orc jaw tusks
const COL_ORC_EYE = 0xcc4422; // fierce red eyes

const COL_BOAR = 0x6e4e38; // brown boar hide
const COL_BOAR_HI = 0x8a6648;
const COL_BOAR_DK = 0x4a3428;
const COL_BOAR_BELLY = 0x8a7058;

const COL_BOAR_TUSK = 0xf0e8d0; // boar tusks
const COL_BOAR_MANE = 0x2e1e14; // dark bristled mane
const COL_BOAR_EYE = 0x881111;
const COL_BOAR_SNOUT = 0x8a5a44;

const COL_SPEAR_SHAFT = 0x6a5030; // crude wooden shaft
const COL_SPEAR_HEAD = 0x888888; // rough iron head
const COL_SPEAR_HEAD_HI = 0xaaaaaa;
const COL_SPEAR_WRAP = 0x884422; // leather binding

const COL_BELT = 0x3e2e1e;
const COL_BELT_BUCKLE = 0x706050;

const COL_SHADOW = 0x000000;

const COL_DUST = 0x9a8868; // charge dust

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
  h = 4,
  alpha = 0.35,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoarLegs(
  g: Graphics,
  cx: number,
  gy: number,
  frontStance: number,
  backStance: number,
): void {
  const legW = 4;
  const legH = 7;
  const baseY = gy - legH;
  // Thick stumpy boar legs
  // Back legs
  g.roundRect(cx - 9 + backStance, baseY, legW, legH, 1)
    .fill({ color: COL_BOAR_DK })
    .stroke({ color: COL_BOAR_DK, width: 0.3 });
  g.roundRect(cx - 5 + backStance * 0.7, baseY, legW, legH, 1)
    .fill({ color: COL_BOAR_DK });
  // Front legs
  g.roundRect(cx + 5 + frontStance, baseY, legW, legH, 1)
    .fill({ color: COL_BOAR })
    .stroke({ color: COL_BOAR_DK, width: 0.3 });
  g.roundRect(cx + 9 + frontStance * 0.7, baseY, legW, legH, 1)
    .fill({ color: COL_BOAR });
  // Hooves
  g.roundRect(cx - 9 + backStance, gy - 2, legW + 1, 2, 0.5).fill({ color: COL_BOAR_DK });
  g.roundRect(cx - 5 + backStance * 0.7, gy - 2, legW + 1, 2, 0.5).fill({ color: COL_BOAR_DK });
  g.roundRect(cx + 5 + frontStance, gy - 2, legW + 1, 2, 0.5).fill({ color: COL_BOAR_DK });
  g.roundRect(cx + 9 + frontStance * 0.7, gy - 2, legW + 1, 2, 0.5).fill({ color: COL_BOAR_DK });
}

function drawBoarBody(
  g: Graphics,
  cx: number,
  bodyY: number,
  tilt = 0,
): void {
  const bw = 28;
  const bh = 11;
  const x = cx - bw / 2 + tilt;
  // Main barrel body — chunky
  g.roundRect(x, bodyY, bw, bh, 4)
    .fill({ color: COL_BOAR })
    .stroke({ color: COL_BOAR_DK, width: 0.6 });
  // Belly lighter area
  g.roundRect(x + 4, bodyY + bh - 4, bw - 8, 3, 2).fill({ color: COL_BOAR_BELLY, alpha: 0.4 });
  // Bristle mane ridge along spine
  for (let i = 0; i < 8; i++) {
    const mx = x + 4 + i * 3;
    g.moveTo(mx, bodyY)
      .lineTo(mx + 0.5, bodyY - 2)
      .lineTo(mx + 1, bodyY)
      .stroke({ color: COL_BOAR_MANE, width: 0.8 });
  }
  // Hide texture — coarse spots
  for (let r = 2; r < bh - 2; r += 3) {
    for (let c = 3; c < bw - 2; c += 4) {
      g.circle(x + c, bodyY + r, 0.5).fill({ color: COL_BOAR_HI, alpha: 0.2 });
    }
  }
}

function drawBoarHead(
  g: Graphics,
  cx: number,
  bodyY: number,
  headDip = 0,
): void {
  const hx = cx + 14;
  const hy = bodyY - 1 + headDip;
  // Thick neck
  g.moveTo(cx + 10, bodyY + 3)
    .lineTo(hx - 2, hy + 4)
    .stroke({ color: COL_BOAR, width: 7 });
  // Head — wedge shape
  g.moveTo(hx - 3, hy)
    .lineTo(hx + 5, hy + 2)
    .lineTo(hx + 5, hy + 5)
    .lineTo(hx - 3, hy + 7)
    .closePath()
    .fill({ color: COL_BOAR })
    .stroke({ color: COL_BOAR_DK, width: 0.4 });
  // Snout
  g.roundRect(hx + 3, hy + 1.5, 4, 4, 1).fill({ color: COL_BOAR_SNOUT });
  // Nostrils
  g.circle(hx + 5.5, hy + 2.5, 0.6).fill({ color: COL_BOAR_DK });
  g.circle(hx + 5.5, hy + 4.5, 0.6).fill({ color: COL_BOAR_DK });
  // Beady eye
  g.circle(hx + 1, hy + 2, 1).fill({ color: COL_BOAR_EYE });
  g.circle(hx + 1, hy + 2, 0.4).fill({ color: 0x111111 });
  // Tusks — prominent curved
  g.moveTo(hx + 4, hy + 5)
    .quadraticCurveTo(hx + 7, hy + 3, hx + 6, hy)
    .stroke({ color: COL_BOAR_TUSK, width: 1.5 });
  g.moveTo(hx + 3, hy + 5.5)
    .quadraticCurveTo(hx + 6, hy + 4, hx + 5, hy + 1)
    .stroke({ color: COL_BOAR_TUSK, width: 1 });
  // Ear
  g.moveTo(hx - 1, hy)
    .lineTo(hx - 2, hy - 2)
    .lineTo(hx, hy)
    .closePath()
    .fill({ color: COL_BOAR });
}

function drawBoarTail(
  g: Graphics,
  cx: number,
  bodyY: number,
  wave: number,
): void {
  const tx = cx - 15;
  const ty = bodyY + 3;
  g.moveTo(tx, ty)
    .quadraticCurveTo(tx - 3 + wave, ty - 2, tx - 4 + wave, ty - 4)
    .stroke({ color: COL_BOAR_DK, width: 1.5 });
}

function drawRiderTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 11;
  const x = cx - tw / 2 + tilt;
  // Crude leather chest armor
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_ORC_LEATHER })
    .stroke({ color: COL_ORC_LEATHER_DK, width: 0.5 });
  // Highlight
  g.roundRect(x + 1, top + 1, tw - 2, 2, 1).fill({ color: COL_ORC_LEATHER_HI, alpha: 0.3 });
  // Crossed leather straps
  g.moveTo(x + 1, top + 1)
    .lineTo(x + tw - 1, top + h - 1)
    .stroke({ color: COL_ORC_LEATHER_DK, width: 0.8 });
  g.moveTo(x + tw - 1, top + 1)
    .lineTo(x + 1, top + h - 1)
    .stroke({ color: COL_ORC_LEATHER_DK, width: 0.8 });
  // Belt
  g.rect(x, top + h - 2, tw, 2).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 1, 1).fill({ color: COL_BELT_BUCKLE });
  // Bare green arms visible at shoulders
  g.roundRect(x - 2, top, 3, 3, 1).fill({ color: COL_ORC_SKIN });
  g.roundRect(x + tw - 1, top, 3, 3, 1).fill({ color: COL_ORC_SKIN });
}

function drawRiderHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 9;
  const hh = 8;
  const x = cx - hw / 2 + tilt;
  // Bald green orc head — brutish
  g.roundRect(x, top, hw, hh, 2)
    .fill({ color: COL_ORC_SKIN })
    .stroke({ color: COL_ORC_SKIN_DK, width: 0.4 });
  // Heavy brow ridge
  g.roundRect(x + 1, top + 1, hw - 2, 2, 0.5).fill({ color: COL_ORC_SKIN_DK, alpha: 0.4 });
  // Fierce red eyes
  const eyeY = top + hh * 0.4;
  g.rect(cx - 2 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_ORC_EYE });
  g.rect(cx + 0.5 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_ORC_EYE });
  // Pupil dots
  g.circle(cx - 1 + tilt, eyeY + 0.6, 0.3).fill({ color: COL_SHADOW });
  g.circle(cx + 1.5 + tilt, eyeY + 0.6, 0.3).fill({ color: COL_SHADOW });
  // Lower jaw with tusks
  g.roundRect(x + 1, top + hh * 0.6, hw - 2, hh * 0.35, 1).fill({ color: COL_ORC_SKIN_DK });
  // Tusks from jaw
  g.moveTo(cx - 2 + tilt, top + hh * 0.6)
    .lineTo(cx - 2.5 + tilt, top + hh * 0.35)
    .stroke({ color: COL_ORC_TUSK, width: 1.2 });
  g.moveTo(cx + 2 + tilt, top + hh * 0.6)
    .lineTo(cx + 2.5 + tilt, top + hh * 0.35)
    .stroke({ color: COL_ORC_TUSK, width: 1.2 });
  // Snarl mouth
  g.moveTo(cx - 1.5 + tilt, top + hh * 0.7)
    .lineTo(cx + 1.5 + tilt, top + hh * 0.7)
    .stroke({ color: 0x2a1a10, width: 0.5 });
}

function drawRiderArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_ORC_SKIN, width: 3 });
  // Crude bracer
  const mx = lerp(sx, ex, 0.6);
  const my = lerp(sy, ey, 0.6);
  g.circle(mx, my, 2).fill({ color: COL_ORC_LEATHER_DK });
  // Fist
  g.circle(ex, ey, 1.8).fill({ color: COL_ORC_SKIN_DK });
}

function drawSpear(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  shaftLen = 16,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * shaftLen;
  const tipY = by - cos * shaftLen;
  // Shaft
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_SPEAR_SHAFT, width: 2 });
  // Spearhead — crude triangular
  const headLen = 5;
  const htX = tipX + sin * headLen;
  const htY = tipY - cos * headLen;
  g.moveTo(tipX + cos * 2, tipY + sin * 2)
    .lineTo(htX, htY)
    .lineTo(tipX - cos * 2, tipY - sin * 2)
    .closePath()
    .fill({ color: COL_SPEAR_HEAD })
    .stroke({ color: COL_SPEAR_HEAD_HI, width: 0.4 });
  // Leather binding wrap
  g.moveTo(bx + sin * 2, by - cos * 2)
    .lineTo(bx + sin * 4 + cos, by - cos * 4 + sin)
    .stroke({ color: COL_SPEAR_WRAP, width: 2.5 });
  // Butt end
  const buttX = bx - sin * 3;
  const buttY = by + cos * 3;
  g.circle(buttX, buttY, 1.2).fill({ color: COL_SPEAR_SHAFT });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const tailWag = Math.sin(t * Math.PI * 4) * 1.5;

  const boarBodyY = GY - 15;
  const riderTop = boarBodyY - 11 + breathe;
  const headTop = riderTop - 9;

  drawShadow(g, CX, GY, 16, 4);
  drawBoarTail(g, CX, boarBodyY, tailWag);
  drawBoarLegs(g, CX, GY, 0, 0);
  drawBoarBody(g, CX, boarBodyY);
  drawBoarHead(g, CX, boarBodyY, breathe * 0.3);
  drawRiderTorso(g, CX, riderTop, 9);
  drawRiderHead(g, CX, headTop);

  // Right arm — spear held upright
  const rHandX = CX + 7;
  const rHandY = riderTop + 4;
  drawRiderArm(g, CX + 6, riderTop + 2, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, 0.05 + breathe * 0.02, 15);

  // Left arm resting on boar
  drawRiderArm(g, CX - 6, riderTop + 2, CX - 8, riderTop + 7);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const trot = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(trot) * 2;

  const frontStance = Math.round(trot * 5);
  const backStance = Math.round(-trot * 5);

  const boarBodyY = GY - 15 - bob * 0.4;
  const riderTop = boarBodyY - 11;
  const headTop = riderTop - 9;
  const tailWag = -trot * 2;

  drawShadow(g, CX, GY, 16 + Math.abs(trot) * 2, 4);
  drawBoarTail(g, CX, boarBodyY, tailWag);
  drawBoarLegs(g, CX, GY, frontStance, backStance);
  drawBoarBody(g, CX, boarBodyY, trot * 0.3);
  drawBoarHead(g, CX, boarBodyY, trot * 1.5);
  drawRiderTorso(g, CX, riderTop, 9, trot * 0.3);
  drawRiderHead(g, CX, headTop, trot * 0.3);

  // Spear bounces with trot
  const rHandX = CX + 7 + trot * 0.5;
  const rHandY = riderTop + 4 - bob * 0.3;
  drawRiderArm(g, CX + 6, riderTop + 2, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, 0.05 + trot * 0.06, 15);

  // Left arm grips boar
  drawRiderArm(g, CX - 6, riderTop + 2, CX - 8, riderTop + 7);

  // Dust particles from hooves
  if (Math.abs(trot) > 0.6) {
    for (let i = 0; i < 3; i++) {
      const dx = CX - 5 + i * 4 + backStance;
      const dy = GY - 1 + Math.random() * 2;
      g.circle(dx, dy, 0.8 + i * 0.3).fill({ color: COL_DUST, alpha: 0.2 });
    }
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Charge attack: 0-1=rear up 2-4=charge forward 5-6=impact 7=recover
  const phases = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1.0];
  const t = phases[Math.min(frame, 7)];

  const boarBodyY = GY - 15;
  const riderTop = boarBodyY - 11;
  const headTop = riderTop - 9;

  // Charge momentum
  const charge = t < 0.5 ? t * 8 : t < 0.65 ? 4 : (1 - t) * 10;
  // Head dips down for charge
  const headDip = t > 0.15 && t < 0.65 ? 3 : t > 0.65 ? (1 - t) * 4 : 0;
  // Legs pump
  const frontPump = t < 0.5 ? t * 6 : (1 - t) * 8;
  const backPump = t < 0.5 ? -t * 4 : -(1 - t) * 6;

  drawShadow(g, CX + charge * 0.3, GY, 16 + charge, 4);
  drawBoarTail(g, CX, boarBodyY, -charge * 0.3);
  drawBoarLegs(g, CX, GY, frontPump, backPump);
  drawBoarBody(g, CX + charge * 0.15, boarBodyY, charge * 0.08);
  drawBoarHead(g, CX + charge * 0.15, boarBodyY, headDip);
  drawRiderTorso(g, CX + charge * 0.1, riderTop, 9, charge * 0.1);
  drawRiderHead(g, CX + charge * 0.1, headTop, charge * 0.08);

  // Spear lowered for charge
  let spearAngle: number;
  if (t < 0.2) {
    spearAngle = lerp(0.05, 0.8, t / 0.2); // raise up
  } else if (t < 0.5) {
    spearAngle = lerp(0.8, 1.4, (t - 0.2) / 0.3); // level forward
  } else {
    spearAngle = lerp(1.4, 0.05, (t - 0.5) / 0.5); // recover
  }

  const rHandX = CX + 7 + charge * 0.8;
  const rHandY = riderTop + 3;
  drawRiderArm(g, CX + 6 + charge * 0.1, riderTop + 2, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, spearAngle, 16);

  // Left arm gripping tightly
  drawRiderArm(g, CX - 6 + charge * 0.1, riderTop + 2, CX - 6 + charge * 0.2, riderTop + 6);

  // Impact flash at spear tip
  if (t >= 0.55 && t <= 0.7) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.62) / 0.08) * 0.6;
    const tipReach = rHandX + 16;
    g.star(tipReach, rHandY - 8, 5, 4, 2).fill({ color: 0xffaa44, alpha: flashAlpha });
  }

  // Dust cloud during charge
  if (t > 0.15 && t < 0.7) {
    const dustAlpha = clamp01(0.3 - Math.abs(t - 0.4) * 0.5);
    for (let i = 0; i < 4; i++) {
      const dx = CX - 12 + i * 3 + backPump;
      const dy = GY - 1 + i * 0.5;
      g.circle(dx, dy, 1.5 + i * 0.5).fill({ color: COL_DUST, alpha: dustAlpha });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // War cry / buff — rider raises spear, boar rears
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const boarBodyY = GY - 15;
  const riderTop = boarBodyY - 11;
  const headTop = riderTop - 9;

  // Boar rearing slightly
  const rear = intensity * 2;

  // War cry rings expanding
  for (let i = 0; i < 4; i++) {
    const ringR = 5 + intensity * 10 + i * 5 + pulse * 2;
    const ringAlpha = clamp01(0.25 - i * 0.06 - intensity * 0.05) + pulse * 0.05;
    g.circle(CX, riderTop + 2, ringR).stroke({
      color: 0xff8844,
      width: 1,
      alpha: ringAlpha,
    });
  }

  drawShadow(g, CX, GY, 16, 4, 0.35 + intensity * 0.1);
  drawBoarTail(g, CX, boarBodyY, pulse * 2);
  drawBoarLegs(g, CX, GY, rear, -rear * 0.5);
  drawBoarBody(g, CX, boarBodyY - rear * 0.5);
  drawBoarHead(g, CX, boarBodyY - rear * 0.5, -rear);
  drawRiderTorso(g, CX, riderTop - rear * 0.3, 9);
  drawRiderHead(g, CX, headTop - rear * 0.3);

  // Spear raised high — war cry
  const raise = intensity * 7;
  const rHandX = CX + 5;
  const rHandY = riderTop - raise;
  drawRiderArm(g, CX + 6, riderTop + 2 - rear * 0.3, rHandX, rHandY);
  drawSpear(g, rHandX, rHandY, -0.2 + pulse * 0.15, 16);

  // Left fist raised
  drawRiderArm(g, CX - 6, riderTop + 2 - rear * 0.3, CX - 8, riderTop - raise * 0.5);

  // Rage glow on orc
  if (intensity > 0.3) {
    const glowAlpha = 0.1 + pulse * 0.15;
    g.circle(CX, riderTop + 4 - rear * 0.3, 8).fill({ color: 0xff4422, alpha: glowAlpha });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const boarBodyY = GY - 15;
  const riderTop = boarBodyY - 11;
  const headTop = riderTop - 9;

  const fallX = t * 8;
  const dropY = t * t * 10;
  const tilt = t * 1.5;

  // Boar stumbles and falls
  const boarLean = t * 4;
  const legBuckle = t * 5;

  drawShadow(g, CX + fallX * 0.2, GY, 16 + t * 4, 4, 0.35 * (1 - t * 0.4));

  if (t < 0.9) {
    drawBoarTail(g, CX, boarBodyY + dropY * 0.3, t * 3);
    drawBoarLegs(g, CX, GY, legBuckle, -legBuckle * 0.5);
    drawBoarBody(g, CX + boarLean * 0.5, boarBodyY + dropY * 0.3, boarLean * 0.5);
    drawBoarHead(g, CX + boarLean * 0.5, boarBodyY + dropY * 0.3, t * 5);
  }

  // Rider topples off
  drawRiderTorso(
    g,
    CX + fallX * 0.6,
    riderTop + dropY,
    9 * (1 - t * 0.1),
    tilt * 3.5,
  );

  if (t < 0.85) {
    drawRiderHead(g, CX + fallX * 0.6, headTop + dropY * 0.5, tilt * 4);
  }

  // Spear tumbles away
  if (t < 0.6) {
    const sbx = CX + 12 + t * 16;
    const sby = riderTop + dropY * 0.5;
    drawSpear(g, sbx, sby, 0.2 + t * 5, 15 * (1 - t * 0.3));
  }

  // Rider arm dragging
  if (t > 0.4) {
    drawRiderArm(
      g,
      CX + fallX * 0.6 + 3,
      riderTop + dropY + 3,
      CX + fallX * 0.6 + 10,
      riderTop + dropY + 8,
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
 * Generate all Boar Rider sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateBoarRiderFrames(renderer: Renderer): RenderTexture[] {
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
