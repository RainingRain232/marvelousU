// Procedural sprite generator for the Powder Monkey unit type.
//
// Draws a young pirate crew member at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Ragged red/white striped shirt
//   * Bandana on head (red)
//   * Bare feet, small frame
//   * Holds a lit bomb (round black with fuse) in right hand
//   * Mischievous grin
//   * Throwing animation for attack -- lobbed arc
//   * Fireball/explosive arc on cast animation
//   * Scruffy, energetic stance

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- scrappy young pirate
const COL_SKIN = 0xd8b088;        // tanned skin
const COL_SKIN_DK = 0xb89068;     // skin shadow

const COL_SHIRT_RED = 0xcc2222;   // red stripes
const COL_SHIRT_WHITE = 0xe8e0d0; // white stripes
const COL_SHIRT_DK = 0xaa1818;    // shirt shadow

const COL_BANDANA = 0xcc2020;     // red bandana
const COL_BANDANA_DK = 0x991818;  // bandana shadow
const COL_BANDANA_KNOT = 0xaa1818;// bandana knot

const COL_PANTS = 0x6a5a3a;       // tattered brown shorts
const COL_PANTS_PATCH = 0x887040;  // patched area

const COL_HAIR = 0x5a3820;        // scruffy brown hair
const COL_HAIR_HI = 0x6a4830;     // hair highlight

const COL_EYE = 0x2a2a2a;         // dark eyes
const COL_EYE_WHITE = 0xe8e4d8;   // eye whites

const COL_BOMB = 0x1a1a1a;        // black bomb
const COL_BOMB_HI = 0x3a3a3a;     // bomb highlight
const COL_FUSE = 0x886830;        // rope fuse
const COL_FUSE_SPARK = 0xffaa22;  // fuse spark
const COL_FUSE_GLOW = 0xff6600;   // fuse glow

const COL_FIRE = 0xff6622;        // explosion fire
const COL_FIRE_HI = 0xffaa44;     // fire highlight
const COL_FIRE_DK = 0xcc3300;     // fire dark

const COL_TEETH = 0xe0d8c0;       // grinning teeth

const COL_SHADOW = 0x000000;

/* -- helpers ------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------ */

function drawShadow(g: Graphics, cx: number, gy: number, w = 9, h = 3, alpha = 0.3): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawFeet(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  // Bare feet -- small and dirty
  g.ellipse(cx - 5 + stanceL, gy - 1, 3, 1.5).fill({ color: COL_SKIN_DK });
  g.ellipse(cx + 5 + stanceR, gy - 1, 3, 1.5).fill({ color: COL_SKIN_DK });
  // Toes
  for (let i = 0; i < 3; i++) {
    g.circle(cx - 6 + stanceL + i * 1.2, gy - 2, 0.5).fill({ color: COL_SKIN, alpha: 0.6 });
    g.circle(cx + 4 + stanceR + i * 1.2, gy - 2, 0.5).fill({ color: COL_SKIN, alpha: 0.6 });
  }
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  // Thin kid legs in tattered shorts
  // Shorts
  g.rect(cx - 5 + stanceL, legTop, 4, legH * 0.5).fill({ color: COL_PANTS });
  g.rect(cx + 1 + stanceR, legTop, 4, legH * 0.5).fill({ color: COL_PANTS });
  // Patch on one short leg
  g.rect(cx - 4 + stanceL, legTop + 1, 2, 2).fill({ color: COL_PANTS_PATCH, alpha: 0.5 });
  // Bare legs below shorts
  g.rect(cx - 4 + stanceL, legTop + legH * 0.5, 3, legH * 0.5).fill({ color: COL_SKIN });
  g.rect(cx + 1 + stanceR, legTop + legH * 0.5, 3, legH * 0.5).fill({ color: COL_SKIN });
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 10;
  const x = cx - tw / 2 + tilt;

  // Striped shirt body
  g.roundRect(x, top, tw, h, 1)
    .fill({ color: COL_SHIRT_WHITE })
    .stroke({ color: COL_SHIRT_DK, width: 0.3 });

  // Red stripes (horizontal)
  for (let row = 1; row < h - 1; row += 2) {
    g.rect(x + 1, top + row, tw - 2, 1).fill({ color: COL_SHIRT_RED });
  }

  // Ragged bottom edge
  for (let i = 0; i < tw; i += 2) {
    const rh = (i % 4 === 0) ? 1 : 0;
    g.rect(x + i, top + h - 1, 1, 1 + rh).fill({ color: COL_SHIRT_WHITE, alpha: 0.5 });
  }

  // Collar / neckline
  g.moveTo(cx - 2 + tilt, top).quadraticCurveTo(cx + tilt, top + 2, cx + 2 + tilt, top)
    .stroke({ color: COL_SKIN, width: 1 });
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 8;
  const hh = 8;
  const x = cx - hw / 2 + tilt;

  // Scruffy hair behind
  g.roundRect(x - 1, top + 1, hw + 2, hh - 2, 3).fill({ color: COL_HAIR });
  // Messy hair tufts
  g.moveTo(x, top + 2).lineTo(x - 2, top - 1).lineTo(x + 1, top + 1)
    .stroke({ color: COL_HAIR, width: 1 });
  g.moveTo(x + hw, top + 2).lineTo(x + hw + 1, top).lineTo(x + hw - 1, top + 1)
    .stroke({ color: COL_HAIR_HI, width: 0.8 });

  // Face -- round, young
  g.roundRect(x + 1, top + 2, hw - 2, hh - 3, 2).fill({ color: COL_SKIN });

  // Bandana
  g.moveTo(x - 1, top + 2)
    .lineTo(x + hw + 1, top + 2)
    .lineTo(x + hw, top + 4)
    .lineTo(x, top + 4)
    .closePath()
    .fill({ color: COL_BANDANA });
  g.rect(x, top + 2, hw, 1).fill({ color: COL_BANDANA_DK, alpha: 0.3 });
  // Bandana knot at back
  g.moveTo(x + hw + 1, top + 3)
    .lineTo(x + hw + 4, top + 4)
    .stroke({ color: COL_BANDANA_KNOT, width: 1 });
  g.moveTo(x + hw + 1, top + 3)
    .lineTo(x + hw + 3, top + 5)
    .stroke({ color: COL_BANDANA_KNOT, width: 0.8 });

  // Eyes -- big, mischievous
  g.circle(cx - 1.5 + tilt, top + 5, 1.5).fill({ color: COL_EYE_WHITE });
  g.circle(cx + 1.5 + tilt, top + 5, 1.5).fill({ color: COL_EYE_WHITE });
  g.circle(cx - 1.5 + tilt, top + 5, 0.8).fill({ color: COL_EYE });
  g.circle(cx + 1.5 + tilt, top + 5, 0.8).fill({ color: COL_EYE });
  // Eyebrow -- raised mischievously on one side
  g.moveTo(cx - 2.5 + tilt, top + 3.5).lineTo(cx - 0.5 + tilt, top + 3.8)
    .stroke({ color: COL_HAIR, width: 0.6 });
  g.moveTo(cx + 0.5 + tilt, top + 3.2).lineTo(cx + 2.5 + tilt, top + 3.8)
    .stroke({ color: COL_HAIR, width: 0.6 });

  // Mischievous grin
  g.moveTo(cx - 2 + tilt, top + 6.5)
    .quadraticCurveTo(cx + tilt, top + 8, cx + 2 + tilt, top + 6.5)
    .stroke({ color: COL_SKIN_DK, width: 0.6 });
  // Teeth showing in grin
  g.rect(cx - 1 + tilt, top + 6.5, 2, 1).fill({ color: COL_TEETH, alpha: 0.7 });

  // Freckles
  g.circle(cx - 2.5 + tilt, top + 6, 0.3).fill({ color: COL_SKIN_DK, alpha: 0.4 });
  g.circle(cx + 2.5 + tilt, top + 6, 0.3).fill({ color: COL_SKIN_DK, alpha: 0.4 });
  g.circle(cx - 1.5 + tilt, top + 6.5, 0.3).fill({ color: COL_SKIN_DK, alpha: 0.3 });
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number): void {
  // Thin kid arm with striped sleeve
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SHIRT_WHITE, width: 2.5 });
  // Stripe on sleeve
  const mx = lerp(sx, ex, 0.4);
  const my = lerp(sy, ey, 0.4);
  g.circle(mx, my, 1.5).fill({ color: COL_SHIRT_RED, alpha: 0.6 });
  // Hand
  g.circle(ex, ey, 1.5).fill({ color: COL_SKIN });
}

function drawBomb(g: Graphics, cx: number, cy: number, fuseFlicker = 0): void {
  // Round black bomb
  g.circle(cx, cy, 3.5)
    .fill({ color: COL_BOMB })
    .stroke({ color: COL_BOMB_HI, width: 0.4 });
  // Highlight
  g.circle(cx - 1, cy - 1, 1).fill({ color: COL_BOMB_HI, alpha: 0.3 });
  // Fuse on top
  g.moveTo(cx + 1, cy - 3)
    .quadraticCurveTo(cx + 3, cy - 5, cx + 2, cy - 6)
    .stroke({ color: COL_FUSE, width: 0.8 });
  // Fuse spark
  const sparkAlpha = 0.5 + fuseFlicker * 0.5;
  g.circle(cx + 2, cy - 6, 1.5).fill({ color: COL_FUSE_SPARK, alpha: sparkAlpha });
  g.circle(cx + 2, cy - 6, 2.5).fill({ color: COL_FUSE_GLOW, alpha: sparkAlpha * 0.3 });
  // Tiny sparks flying off
  g.circle(cx + 3 + fuseFlicker, cy - 7, 0.5).fill({ color: COL_FUSE_SPARK, alpha: sparkAlpha * 0.5 });
  g.circle(cx + 1, cy - 7 - fuseFlicker * 0.5, 0.4).fill({ color: COL_FIRE_HI, alpha: sparkAlpha * 0.3 });
}

function drawExplosion(g: Graphics, cx: number, cy: number, size: number, alpha: number): void {
  // Fireball explosion effect
  g.circle(cx, cy, size).fill({ color: COL_FIRE, alpha: alpha * 0.6 });
  g.circle(cx, cy, size * 0.7).fill({ color: COL_FIRE_HI, alpha: alpha * 0.8 });
  g.circle(cx, cy, size * 0.3).fill({ color: 0xffee88, alpha });
  // Outer glow
  g.circle(cx, cy, size * 1.3).fill({ color: COL_FIRE_DK, alpha: alpha * 0.2 });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4;
  const bounce = Math.sin(t * Math.PI * 4) * 0.3; // energetic kid bouncing
  const fuseFlicker = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;

  const legH = 6;
  const torsoH = 9;
  const legTop = GY - 2 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe + bounce;
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY, 9, 2);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop);

  // Right arm -- holding bomb up proudly
  const rHandX = CX + 7;
  const rHandY = torsoTop + 3;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawBomb(g, rHandX + 1, rHandY - 2, fuseFlicker);

  // Left arm -- at side, slightly back
  const lHandX = CX - 7;
  const lHandY = torsoTop + torsoH - 2;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const run = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(run) * 1.5;
  const fuseFlicker = Math.sin(t * Math.PI * 8) * 0.5 + 0.5;

  const legH = 6;
  const torsoH = 9;
  const stanceL = Math.round(run * 4); // wide running stride
  const stanceR = Math.round(-run * 4);
  const legTop = GY - 2 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY, 9 + Math.abs(run) * 2, 2);
  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, run * 0.5);
  drawHead(g, CX, headTop, run * 0.4);

  // Arms swing wildly -- running
  const armSwing = run * 3;
  const rHandX = CX + 7 + armSwing * 0.3;
  const rHandY = torsoTop + 4 - bob * 0.3;
  drawArm(g, CX + 5, torsoTop + 3, rHandX, rHandY);
  drawBomb(g, rHandX + 1, rHandY - 2, fuseFlicker);

  const lHandX = CX - 7 - armSwing * 0.3;
  const lHandY = torsoTop + torsoH - 2 + bob * 0.3;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);

  // Bandana tails flap
  g.moveTo(CX + 5, headTop + 3)
    .quadraticCurveTo(CX + 8 - run * 2, headTop + 4, CX + 7 - run * 3, headTop + 5)
    .stroke({ color: COL_BANDANA, width: 0.8 });
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Throwing animation -- wind up, release bomb in arc
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 6;
  const torsoH = 9;
  const legTop = GY - 2 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  const lean = t < 0.45 ? t * 2 : (1 - t) * 3;
  const fuseFlicker = Math.sin(t * Math.PI * 10) * 0.5 + 0.5;

  drawShadow(g, CX + lean, GY, 9 + lean, 2);
  drawFeet(g, CX, GY, -1, t > 0.2 && t < 0.7 ? 3 : 0);
  drawLegs(g, CX, legTop, legH, -1, t > 0.2 && t < 0.7 ? 3 : 0);
  drawTorso(g, CX, torsoTop, torsoH, lean * 0.8);
  drawHead(g, CX, headTop, lean * 0.5);

  // Left arm braces
  const lHandX = CX - 6;
  const lHandY = torsoTop + torsoH - 2;
  drawArm(g, CX - 5, torsoTop + 3, lHandX, lHandY);

  // Right arm -- throwing arc
  let rHandX: number;
  let rHandY: number;
  if (t < 0.25) {
    // Wind up -- arm pulls back
    rHandX = CX + 5 - t * 8;
    rHandY = torsoTop + 2 - t * 8;
  } else if (t < 0.45) {
    // Release -- arm swings forward
    rHandX = lerp(CX + 3, CX + 12, (t - 0.25) / 0.2);
    rHandY = lerp(torsoTop - 2, torsoTop + 4, (t - 0.25) / 0.2);
  } else {
    // Follow through
    rHandX = lerp(CX + 12, CX + 7, (t - 0.45) / 0.55);
    rHandY = lerp(torsoTop + 4, torsoTop + torsoH - 2, (t - 0.45) / 0.55);
  }
  drawArm(g, CX + 5 + lean, torsoTop + 3, rHandX, rHandY);

  // Bomb -- in hand during windup, then flying
  if (t < 0.35) {
    drawBomb(g, rHandX + 1, rHandY - 2, fuseFlicker);
  } else {
    // Bomb flies in an arc
    const bombT = (t - 0.35) / 0.65;
    const bombX = lerp(CX + 10, CX + 22, bombT);
    const bombY = torsoTop - 4 - Math.sin(bombT * Math.PI) * 12 + bombT * 10;
    if (bombT < 0.8) {
      drawBomb(g, bombX, bombY, fuseFlicker);
    }
    // Explosion at landing
    if (bombT >= 0.7) {
      const explodeAlpha = clamp01((bombT - 0.7) / 0.3);
      drawExplosion(g, bombX, bombY + 4, 4 + explodeAlpha * 4, explodeAlpha * 0.8);
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Fireball throw -- larger explosive arc with trail
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 6;
  const torsoH = 9;
  const legTop = GY - 2 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY, 9, 2, 0.3 + intensity * 0.1);
  drawFeet(g, CX, GY, -1, 2);
  drawLegs(g, CX, legTop, legH, -1, 2);
  drawTorso(g, CX, torsoTop, torsoH, intensity * 1.5);
  drawHead(g, CX, headTop, intensity);

  // Left arm balancing
  drawArm(g, CX - 5, torsoTop + 3, CX - 8, torsoTop + 5);

  // Right arm raised high -- throwing pose
  const raise = intensity * 5;
  drawArm(g, CX + 5, torsoTop + 3, CX + 9 + intensity * 3, torsoTop + 2 - raise);

  // Fireball forming in hand then launching
  if (t < 0.4) {
    // Fireball charges in hand
    const chargeSize = 2 + t * 6;
    const chargeAlpha = 0.3 + t * 0.7;
    drawExplosion(g, CX + 9 + intensity * 3, torsoTop - 3 - raise, chargeSize, chargeAlpha);
  } else {
    // Fireball launches in an arc
    const fireT = (t - 0.4) / 0.6;
    const fireX = lerp(CX + 12, CX + 24, fireT);
    const fireY = torsoTop - 8 - Math.sin(fireT * Math.PI) * 10 + fireT * 6;
    const fireSize = 3 + pulse * 1.5;

    // Fire trail
    for (let i = 0; i < 4; i++) {
      const trailT = Math.max(0, fireT - i * 0.08);
      const trailX = lerp(CX + 12, CX + 24, trailT);
      const trailY = torsoTop - 8 - Math.sin(trailT * Math.PI) * 10 + trailT * 6;
      const trailAlpha = clamp01(0.3 - i * 0.08);
      g.circle(trailX, trailY, fireSize * (1 - i * 0.15))
        .fill({ color: COL_FIRE_DK, alpha: trailAlpha });
    }

    // Main fireball
    drawExplosion(g, fireX, fireY, fireSize, 0.8);

    // Smoke puffs behind
    for (let i = 0; i < 3; i++) {
      const smokeT = Math.max(0, fireT - i * 0.12);
      const smokeX = lerp(CX + 12, CX + 24, smokeT) + Math.sin(t * 5 + i) * 2;
      const smokeY = torsoTop - 6 - Math.sin(smokeT * Math.PI) * 8 + smokeT * 8;
      g.circle(smokeX, smokeY, 1.5 + i * 0.5).fill({ color: 0x555555, alpha: 0.15 - i * 0.03 });
    }
  }

  // Face lit by fire glow
  const glowAlpha = 0.1 + intensity * 0.15;
  g.circle(CX, headTop + 4, 5).fill({ color: COL_FIRE_HI, alpha: glowAlpha });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 6;
  const torsoH = 9;
  const legTop = GY - 2 - legH;

  const fallX = t * 8;
  const dropY = t * t * 10;
  const fallAngle = t * 0.6;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 8;

  drawShadow(g, CX + fallX * 0.3, GY, 9 + t * 2, 2, 0.3 * (1 - t * 0.5));

  const squash = Math.round(t * 2);
  if (t < 0.8) {
    drawFeet(g, CX + fallX * 0.1, GY, t * 2, -t);
  }
  if (t < 0.7) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.5, legH - squash, t * 2, -t);
  }

  drawTorso(g, CX + fallX * 0.3, torsoTop, torsoH * (1 - t * 0.15), fallAngle * 3);
  drawHead(g, CX + fallX * 0.35, headTop + dropY * 0.4, fallAngle * 4);

  // Bandana flies off
  if (t > 0.3 && t < 0.9) {
    const bandanaX = CX + fallX * 0.3 + (t - 0.3) * 10;
    const bandanaY = headTop + dropY * 0.2 - (t - 0.3) * 8;
    g.rect(bandanaX, bandanaY, 4, 2).fill({ color: COL_BANDANA, alpha: 1 - t });
  }

  // Arms flail
  if (t < 0.7) {
    drawArm(
      g,
      CX + fallX * 0.3 + 4,
      torsoTop + 3,
      CX + fallX * 0.3 + 10,
      torsoTop + torsoH - 2 + t * 3,
    );
  }

  // Bomb rolls away and explodes
  if (t < 0.5) {
    const bombX = CX + 10 + t * 12;
    const bombY = GY - 3 - (1 - t * 2) * 4;
    drawBomb(g, bombX, bombY, t * 4);
  } else if (t < 0.8) {
    // Small explosion where bomb landed
    const explodeAlpha = clamp01(1 - (t - 0.5) / 0.3) * 0.6;
    drawExplosion(g, CX + 16, GY - 3, 5 + (t - 0.5) * 8, explodeAlpha);
  }

  // Stars/dizzy effect late frames
  if (t > 0.5) {
    const starAlpha = (1 - t) * 0.5;
    for (let i = 0; i < 3; i++) {
      const sa = t * Math.PI * 3 + i * (Math.PI * 2 / 3);
      const sd = 5;
      const sx = CX + fallX * 0.35 + Math.cos(sa) * sd;
      const sy = headTop + dropY * 0.4 - 2 + Math.sin(sa) * sd * 0.5;
      g.moveTo(sx, sy - 1).lineTo(sx, sy + 1).stroke({ color: 0xffff44, width: 0.6, alpha: starAlpha });
      g.moveTo(sx - 1, sy).lineTo(sx + 1, sy).stroke({ color: 0xffff44, width: 0.6, alpha: starAlpha });
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
 * Generate all powder monkey sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generatePowderMonkeyFrames(renderer: Renderer): RenderTexture[] {
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
