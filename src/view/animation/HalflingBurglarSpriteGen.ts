// Procedural sprite generator for the Halfling Burglar unit type.
//
// Draws a tiny sneaky halfling at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Small stature (drawn noticeably shorter, feet higher)
//   - Brown/dark green hooded clothing
//   - Mischievous grin visible under hood
//   - Small dagger in right hand
//   - Quick stabbing attack animation
//   - Very fast, bouncy movement cycle
//   - Leather pouches on belt (loot bags)

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- earthy rogue
const COL_SKIN = 0xe8c8a0;
const COL_SKIN_CHEEK = 0xd4a088;

const COL_HOOD = 0x2a3a22;        // dark forest green hood
const COL_HOOD_DK = 0x1e2c18;
const COL_HOOD_INNER = 0x141c10;

const COL_TUNIC = 0x5c4830;       // brown leather tunic
const COL_TUNIC_HI = 0x6e5a3e;
const COL_TUNIC_DK = 0x483820;

const COL_PANTS = 0x3a4a30;       // dark green trousers
const COL_PANTS_DK = 0x2a3820;

const COL_BOOT = 0x4a3a28;        // soft leather boots
const COL_BOOT_DK = 0x362a1c;
const COL_BOOT_SOLE = 0x2a2018;

const COL_BELT = 0x3e3020;
const COL_BELT_BUCKLE = 0xb0a060;
const COL_POUCH = 0x5a4832;
const COL_POUCH_CLASP = 0x908040;

const COL_DAGGER_BLADE = 0xb0b8c0;
const COL_DAGGER_HI = 0xd0d8e0;
const COL_DAGGER_HILT = 0x443828;
const COL_DAGGER_GUARD = 0x706050;

const COL_EYE = 0x224422;         // dark green eyes
const COL_EYE_WHITE = 0xe8e8e0;
const COL_HAIR = 0x8b6530;        // curly brown hair peeking out
const COL_MOUTH = 0x993333;

const COL_SHADOW = 0x000000;

const COL_SPARKLE = 0xffee88;     // stolen treasure glint

/* -- helpers -------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------- */

/** The halfling is short -- feet sit higher (around GY-4) */
const FOOT_Y = GY - 2;

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 8,
  h = 2.5,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  fy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 4;
  const bh = 3;
  // Left boot -- soft round-toed
  g.roundRect(cx - 5 + stanceL, fy - bh, bw, bh, 1.5)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.rect(cx - 5 + stanceL, fy - 1, bw, 1).fill({ color: COL_BOOT_SOLE });

  // Right boot
  g.roundRect(cx + 1 + stanceR, fy - bh, bw, bh, 1.5)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.4 });
  g.rect(cx + 1 + stanceR, fy - 1, bw, 1).fill({ color: COL_BOOT_SOLE });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Stubby little legs in green pants
  g.rect(cx - 4 + stanceL, legTop, 3, legH).fill({ color: COL_PANTS });
  g.rect(cx + 1 + stanceR, legTop, 3, legH).fill({ color: COL_PANTS });
  // Knee patches
  g.rect(cx - 4 + stanceL, legTop + legH * 0.4, 3, 1.5).fill({
    color: COL_PANTS_DK,
    alpha: 0.4,
  });
  g.rect(cx + 1 + stanceR, legTop + legH * 0.4, 3, 1.5).fill({
    color: COL_PANTS_DK,
    alpha: 0.4,
  });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 10;
  const x = cx - tw / 2 + tilt;

  // Brown leather tunic
  g.roundRect(x, top, tw, h, 1.5)
    .fill({ color: COL_TUNIC })
    .stroke({ color: COL_TUNIC_DK, width: 0.5 });

  // Front lacing detail
  for (let row = 1; row < h - 2; row += 2) {
    g.moveTo(cx - 0.5 + tilt, top + row)
      .lineTo(cx + 0.5 + tilt, top + row + 1)
      .stroke({ color: COL_TUNIC_DK, width: 0.4, alpha: 0.5 });
  }

  // Highlight on shoulder area
  g.roundRect(x + 1, top + 1, tw - 2, 2, 1).fill({ color: COL_TUNIC_HI, alpha: 0.3 });

  // Belt with pouches
  g.rect(x, top + h - 2.5, tw, 2).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 1.5, 1).fill({ color: COL_BELT_BUCKLE });
  // Loot pouch left
  g.roundRect(x + 1, top + h - 3.5, 2.5, 2.5, 0.5).fill({ color: COL_POUCH });
  g.rect(x + 1.5, top + h - 3.5, 1.5, 0.5).fill({ color: COL_POUCH_CLASP });
  // Loot pouch right
  g.roundRect(x + tw - 3.5, top + h - 3.5, 2.5, 2.5, 0.5).fill({ color: COL_POUCH });
  g.rect(x + tw - 3, top + h - 3.5, 1.5, 0.5).fill({ color: COL_POUCH_CLASP });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  grinWidth = 0,
): void {
  const hw = 10;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Hood -- rounded, not too pointy (halfling style)
  g.moveTo(x + 1, top + hh)
    .lineTo(x, top + hh * 0.35)
    .quadraticCurveTo(x + hw * 0.5, top - 1, x + hw, top + hh * 0.35)
    .lineTo(x + hw - 1, top + hh)
    .closePath()
    .fill({ color: COL_HOOD })
    .stroke({ color: COL_HOOD_DK, width: 0.4 });

  // Hood inner shadow
  g.roundRect(x + 1.5, top + hh * 0.3, hw - 3, hh * 0.6, 1).fill({
    color: COL_HOOD_INNER,
  });

  // Face -- round and cheerful
  g.roundRect(x + 2, top + hh * 0.35, hw - 4, hh * 0.5, 2).fill({
    color: COL_SKIN,
  });

  // Rosy cheeks
  g.circle(cx - 2.5 + tilt, top + hh * 0.6, 1).fill({ color: COL_SKIN_CHEEK, alpha: 0.4 });
  g.circle(cx + 2.5 + tilt, top + hh * 0.6, 1).fill({ color: COL_SKIN_CHEEK, alpha: 0.4 });

  // Eyes -- bright and mischievous
  const eyeY = top + hh * 0.45;
  g.circle(cx - 1.8 + tilt, eyeY, 1.2).fill({ color: COL_EYE_WHITE });
  g.circle(cx + 1.8 + tilt, eyeY, 1.2).fill({ color: COL_EYE_WHITE });
  g.circle(cx - 1.8 + tilt, eyeY, 0.6).fill({ color: COL_EYE });
  g.circle(cx + 1.8 + tilt, eyeY, 0.6).fill({ color: COL_EYE });

  // Mischievous grin
  const gw = 2 + grinWidth;
  g.moveTo(cx - gw / 2 + tilt, top + hh * 0.65)
    .quadraticCurveTo(cx + tilt, top + hh * 0.75 + grinWidth * 0.3, cx + gw / 2 + tilt, top + hh * 0.65)
    .stroke({ color: COL_MOUTH, width: 0.7 });

  // Curly hair peeking from hood sides
  g.circle(x + 1.5, top + hh * 0.35, 1.5).fill({ color: COL_HAIR, alpha: 0.7 });
  g.circle(x + hw - 1.5, top + hh * 0.35, 1.5).fill({ color: COL_HAIR, alpha: 0.7 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Sleeve in tunic color
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_TUNIC_DK, width: 2.5 });
  // Small hand
  g.circle(ex, ey, 1.5).fill({ color: COL_SKIN });
}

function drawDagger(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 7,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;

  // Short straight blade
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_DAGGER_BLADE, width: 1.5 });
  // Highlight edge
  g.moveTo(bx + cos * 0.3, by + sin * 0.3)
    .lineTo(tipX + cos * 0.3, tipY + sin * 0.3)
    .stroke({ color: COL_DAGGER_HI, width: 0.4, alpha: 0.6 });

  // Guard
  const gx1 = bx + cos * 1.5;
  const gy1 = by + sin * 1.5;
  const gx2 = bx - cos * 1.5;
  const gy2 = by - sin * 1.5;
  g.moveTo(gx1, gy1).lineTo(gx2, gy2).stroke({ color: COL_DAGGER_GUARD, width: 1.2 });

  // Hilt
  const hx = bx - sin * 2;
  const hy = by + cos * 2;
  g.moveTo(bx, by).lineTo(hx, hy).stroke({ color: COL_DAGGER_HILT, width: 2 });
}

/* -- frame generators ----------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const fidget = Math.sin(t * Math.PI * 4) * 0.3; // halflings fidget

  const legH = 5;
  const torsoH = 8;
  const legTop = FOOT_Y - 3 - legH;
  const torsoTop = legTop - torsoH + 1 + breathe;
  const headTop = torsoTop - 8;

  // Grin widens and narrows
  const grin = 0.5 + Math.sin(t * Math.PI * 2) * 0.5;

  drawShadow(g, CX, GY, 7, 2);
  drawBoots(g, CX, FOOT_Y, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, fidget, grin);

  // Right arm -- dagger held ready at side
  const daggerAngle = 0.2 + Math.sin(t * Math.PI * 2) * 0.04;
  const rHandX = CX + 7;
  const rHandY = torsoTop + torsoH - 2 + breathe;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY);
  drawDagger(g, rHandX, rHandY, daggerAngle);

  // Left arm -- hanging relaxed
  const lHandX = CX - 7;
  const lHandY = torsoTop + torsoH - 1;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  // Very fast, bouncy stride
  const walk = Math.sin(t * Math.PI * 4); // double speed cycle
  const bob = Math.abs(Math.sin(t * Math.PI * 4)) * 2.0; // exaggerated bounce

  const legH = 5;
  const torsoH = 8;
  const stanceL = Math.round(walk * 3.5);
  const stanceR = Math.round(-walk * 3.5);
  const legTop = FOOT_Y - 3 - legH;
  const torsoTop = legTop - torsoH + 1 - Math.round(bob * 0.5);
  const headTop = torsoTop - 8;

  drawShadow(g, CX, GY, 7 + Math.abs(walk) * 1.5, 2);
  drawBoots(g, CX, FOOT_Y, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHead(g, CX, headTop, walk * 0.4, 0.8); // always grinning while running

  // Arms pump with the stride
  const armSwing = walk * 2.5;
  const rHandX = CX + 7 + armSwing * 0.4;
  const rHandY = torsoTop + torsoH - 2;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY);
  drawDagger(g, rHandX, rHandY, 0.3 + walk * 0.08);

  const lHandX = CX - 7 - armSwing * 0.4;
  const lHandY = torsoTop + torsoH - 1;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Quick stabbing attack: 0=crouch, 1-2=dart forward, 3-4=stab stab, 5-6=twist, 7=hop back
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 5;
  const torsoH = 8;
  const legTop = FOOT_Y - 3 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 8;

  // Dart forward
  const lunge = t < 0.55 ? t * 5 : (1 - t) * 8;
  const crouch = t < 0.25 ? t * 3 : t < 0.7 ? 0.8 : (1 - t) * 2;

  drawShadow(g, CX + lunge * 0.4, GY, 7 + lunge * 0.5, 2);
  drawBoots(g, CX, FOOT_Y, -1, Math.round(lunge * 0.6));
  drawLegs(g, CX, legTop + crouch, legH, -1, Math.round(lunge * 0.6));
  drawTorso(g, CX, torsoTop + crouch, torsoH, lunge * 0.5);
  drawHead(g, CX, headTop + crouch, lunge * 0.3, 1.5); // big grin during attack!

  // Rapid dagger stab -- arm thrusts forward
  let daggerAngle: number;
  if (t < 0.25) {
    daggerAngle = lerp(0.2, -0.8, t / 0.25);
  } else if (t < 0.4) {
    daggerAngle = lerp(-0.8, 0.1, (t - 0.25) / 0.15); // first stab
  } else if (t < 0.55) {
    daggerAngle = lerp(0.1, -0.6, (t - 0.4) / 0.15); // second stab
  } else if (t < 0.7) {
    daggerAngle = lerp(-0.6, 0.0, (t - 0.55) / 0.15); // third stab
  } else {
    daggerAngle = lerp(0.0, 0.2, (t - 0.7) / 0.3);
  }

  const reach = t > 0.2 && t < 0.75 ? 4 + Math.sin(t * 20) * 2 : 0;
  const rHandX = CX + 6 + lunge * 0.6 + reach;
  const rHandY = torsoTop + 3 + crouch;
  drawArm(g, CX + 5 + lunge * 0.3, torsoTop + 2 + crouch, rHandX, rHandY);
  drawDagger(g, rHandX, rHandY, daggerAngle, 7);

  // Left arm tucked
  const lHandX = CX - 5 + lunge * 0.2;
  const lHandY = torsoTop + 5 + crouch;
  drawArm(g, CX - 5 + lunge * 0.2, torsoTop + 2 + crouch, lHandX, lHandY);

  // Stab sparkle effects
  if (t >= 0.3 && t <= 0.7) {
    const sparkAlpha = clamp01(Math.sin((t - 0.3) * 8) * 0.6);
    g.star(rHandX + 5, rHandY - 2, 4, 1.5, 0.5).fill({ color: COL_SPARKLE, alpha: sparkAlpha });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // "Cast" = throw a smoke bomb / flash powder
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 5;
  const torsoH = 8;
  const legTop = FOOT_Y - 3 - legH;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 8;

  // Smoke cloud particles expanding outward
  if (intensity > 0.3) {
    for (let i = 0; i < 8; i++) {
      const angle = t * Math.PI * 2 + i * (Math.PI / 4);
      const dist = intensity * 12 + i * 1.5;
      const px = CX + Math.cos(angle) * dist;
      const py = torsoTop + 6 + Math.sin(angle) * dist * 0.4;
      const pAlpha = clamp01(0.25 - i * 0.02) * (1 - t * 0.5);
      const pSize = 1.5 + i * 0.3 + pulse;
      g.circle(px, py, pSize).fill({ color: 0x888888, alpha: pAlpha });
    }
  }

  drawShadow(g, CX, GY, 7, 2, 0.3 + intensity * 0.1);
  drawBoots(g, CX, FOOT_Y, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHead(g, CX, headTop, 0, 1.2); // gleeful grin

  // Right arm throws upward
  const throwProgress = clamp01(t * 2);
  const rHandX = CX + 6 + throwProgress * 3;
  const rHandY = torsoTop + 2 - throwProgress * 6;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY);

  // Smoke bomb projectile (small sphere in hand then flying)
  if (t < 0.5) {
    g.circle(rHandX + 1, rHandY - 1, 2).fill({ color: 0x555555 });
    g.circle(rHandX + 1.5, rHandY - 1.5, 0.7).fill({ color: 0x888888, alpha: 0.5 });
  }

  // Left arm at side
  drawArm(g, CX - 5, torsoTop + 2, CX - 7, torsoTop + torsoH - 1);

  // Flash at peak
  if (t > 0.4 && t < 0.7) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.55) / 0.15) * 0.6;
    g.circle(CX + 8, torsoTop - 6, 4 + pulse * 2).fill({ color: COL_SPARKLE, alpha: flashAlpha });
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Halfling tumbles and falls: 0=hit, 1-2=stumble, 3-5=tumble roll, 6-7=splat
  const t = frame / 7;

  const legH = 5;
  const torsoH = 8;
  const legTop = FOOT_Y - 3 - legH;

  const fallX = t * 12;
  const dropY = t * t * 8;
  const tumbleAngle = t * Math.PI * 1.5; // rolling tumble

  const torsoTop = legTop - torsoH + 1 + dropY;
  const headTop = torsoTop - 8;

  drawShadow(g, CX + fallX * 0.3, GY, 7 + t * 4, 2.5, 0.3 * (1 - t * 0.4));

  // Boots fly off in late frames
  if (t < 0.7) {
    drawBoots(g, CX + fallX * 0.1, FOOT_Y, Math.round(t * 3), Math.round(-t * 2));
  }
  if (t < 0.6) {
    drawLegs(g, CX + fallX * 0.1, legTop + dropY * 0.4, legH, Math.round(t * 3), Math.round(-t * 2));
  }

  // Body tumbles
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.1),
    Math.sin(tumbleAngle) * 4,
  );
  drawHead(g, CX + fallX * 0.4, headTop + dropY * 0.3, Math.sin(tumbleAngle) * 3, 0);

  // Dagger flung away
  if (t < 0.6) {
    const dx = CX + 10 + t * 14;
    const dy = torsoTop + 2 + t * 4;
    drawDagger(g, dx, dy, t * 5, 7 * (1 - t * 0.3));
  }

  // Loot coins scatter
  if (t > 0.2) {
    for (let i = 0; i < 4; i++) {
      const coinX = CX + fallX * 0.3 + (i - 2) * 5 + t * (i - 1.5) * 3;
      const coinY = torsoTop + 4 + i * 3 + t * 6;
      const coinAlpha = clamp01(1 - t * 0.8);
      g.circle(coinX, Math.min(coinY, GY - 1), 1).fill({ color: COL_SPARKLE, alpha: coinAlpha });
    }
  }

  // Flopped arm
  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 3,
      torsoTop + 3,
      CX + fallX * 0.4 + 8,
      torsoTop + torsoH - 1,
    );
  }
}

/* -- public API ----------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all halfling burglar sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateHalflingBurglarFrames(renderer: Renderer): RenderTexture[] {
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
