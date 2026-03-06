// Procedural sprite generator for the War Chaplain unit type.
//
// Draws a battlefield priest at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Heavy full plate armour in steel grey / silver
//   • White tabard with a gold cross emblazoned on the chest
//   • Helmet with visor raised, full brown beard beneath
//   • Holy mace in right hand — flanged head, wrapped grip
//   • Prayer book / holy symbol in left hand, glowing gold spine
//   • Warm golden light radiates during attack and cast phases
//   • Heavy, deliberate movement — armour weight felt in every frame

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — steel plate, white tabard, gold holy motifs
const COL_SKIN      = 0xd4a878; // warm bearded face
const COL_SKIN_DK   = 0xb08050;

const COL_PLATE     = 0x9aa8b8; // steel grey plate
const COL_PLATE_HI  = 0xc4d2e2; // highlight edge
const COL_PLATE_DK  = 0x6a7888; // shadow / joint
const COL_PLATE_SHD = 0x485868; // deep shadow

const COL_TABARD    = 0xf0f0f0; // white tabard
const COL_TABARD_DK = 0xd0d0d0;

const COL_CROSS     = 0xffd040; // gold cross
const COL_CROSS_HI  = 0xffe890;

const COL_GOLD      = 0xe8b820; // gold trim / accents
const COL_GOLD_HI   = 0xffd84a;
const COL_GOLD_DK   = 0xa07c10;

const COL_BEARD     = 0x7a5530; // brown beard
const COL_BEARD_HI  = 0xa07848;

const COL_MACE_HEAD = 0x889098; // flanged mace head (darker steel)
const COL_MACE_FLANGE = 0xaabac8;
const COL_MACE_SHAFT  = 0x6a5540; // dark wood shaft
const COL_MACE_WRAP   = 0x483830; // grip wrap

const COL_BOOK      = 0x5a3820; // leather-bound prayer book
const COL_BOOK_SPINE = 0xffc84a; // gold spine glow
const COL_BOOK_PAGE = 0xf8f0d8;

const COL_GLOW      = 0xffe080; // golden healing glow
const COL_GLOW_WRM  = 0xffaa20;
const COL_HALO      = 0xffd040;

const COL_BOOT      = 0x5a6070; // armoured sabatons
const COL_BOOT_HI   = 0x7a8090;

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
): void {
  // Heavy plate sabatons — wide and flat
  g.roundRect(cx - 8 + stanceL, gy - 4, 6, 4, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - 4, 6, 4, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Toe highlight
  g.rect(cx - 7 + stanceL, gy - 4, 4, 1).fill({ color: COL_BOOT_HI, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, gy - 4, 4, 1).fill({ color: COL_BOOT_HI, alpha: 0.5 });
  // Gold ankle trim
  g.moveTo(cx - 8 + stanceL, gy - 4)
    .lineTo(cx - 2 + stanceL, gy - 4)
    .stroke({ color: COL_GOLD, width: 0.7 });
  g.moveTo(cx + 2 + stanceR, gy - 4)
    .lineTo(cx + 8 + stanceR, gy - 4)
    .stroke({ color: COL_GOLD, width: 0.7 });
}

function drawGreaves(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Plate greaves — chunky
  g.roundRect(cx - 7 + stanceL, legTop, 5, legH, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  g.roundRect(cx + 2 + stanceR, legTop, 5, legH, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Kneecap rivets
  g.circle(cx - 4.5 + stanceL, legTop + legH * 0.25, 1.2).fill({ color: COL_PLATE_HI });
  g.circle(cx + 4.5 + stanceR, legTop + legH * 0.25, 1.2).fill({ color: COL_PLATE_HI });
  // Highlight ridge
  g.moveTo(cx - 5 + stanceL, legTop + 2)
    .lineTo(cx - 5 + stanceL, legTop + legH - 2)
    .stroke({ color: COL_PLATE_HI, width: 0.5, alpha: 0.6 });
  g.moveTo(cx + 4.5 + stanceR, legTop + 2)
    .lineTo(cx + 4.5 + stanceR, legTop + legH - 2)
    .stroke({ color: COL_PLATE_HI, width: 0.5, alpha: 0.6 });
}

function drawTabardLower(g: Graphics, cx: number, top: number, tilt = 0): void {
  // Lower flap of tabard between legs
  g.moveTo(cx - 4 + tilt, top)
    .lineTo(cx + 4 + tilt, top)
    .lineTo(cx + 3 + tilt, top + 6)
    .lineTo(cx + tilt, top + 7)
    .lineTo(cx - 3 + tilt, top + 6)
    .closePath()
    .fill({ color: COL_TABARD })
    .stroke({ color: COL_TABARD_DK, width: 0.3 });
}

function drawBreastplate(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 13;
  const x = cx - tw / 2 + tilt;

  // Backplate / shoulder bulk
  g.roundRect(x - 1, top, tw + 2, h, 2)
    .fill({ color: COL_PLATE_DK })
    .stroke({ color: COL_PLATE_SHD, width: 0.4 });

  // White tabard over breastplate
  g.roundRect(x + 1, top + 1, tw - 2, h - 1, 1)
    .fill({ color: COL_TABARD })
    .stroke({ color: COL_TABARD_DK, width: 0.3 });

  // Gold cross on tabard
  const crossCX = cx + tilt;
  const crossCY = top + h * 0.45;
  // Vertical bar
  g.rect(crossCX - 0.8, crossCY - 3.5, 1.6, 7)
    .fill({ color: COL_CROSS })
    .stroke({ color: COL_GOLD_DK, width: 0.2 });
  // Horizontal bar
  g.rect(crossCX - 3, crossCY - 1, 6, 1.6)
    .fill({ color: COL_CROSS })
    .stroke({ color: COL_GOLD_DK, width: 0.2 });
  // Cross highlight
  g.rect(crossCX - 0.3, crossCY - 3, 0.6, 2.5).fill({ color: COL_CROSS_HI, alpha: 0.7 });

  // Shoulder pauldrons
  g.roundRect(x - 2, top, 5, 5, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  g.roundRect(x + tw - 3, top, 5, 5, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Gold trim on shoulders
  g.moveTo(x - 2, top + 5).lineTo(x + 3, top + 5).stroke({ color: COL_GOLD, width: 0.7 });
  g.moveTo(x + tw - 3, top + 5)
    .lineTo(x + tw + 2, top + 5)
    .stroke({ color: COL_GOLD, width: 0.7 });

  // Belt at waist
  g.rect(x + 1, top + h - 3, tw - 2, 2.5).fill({ color: COL_PLATE_DK });
  // Belt buckle
  g.rect(cx + tilt - 2, top + h - 3, 4, 2.5)
    .fill({ color: COL_GOLD })
    .stroke({ color: COL_GOLD_DK, width: 0.3 });
}

function drawHelmet(g: Graphics, cx: number, top: number, tilt = 0): void {
  const hw = 11;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Helmet shell — full plate
  g.roundRect(x, top, hw, hh, 2)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });

  // Visor slot (raised) — shows bearded face below
  g.roundRect(x + 2, top + 3, hw - 4, 5, 1)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
  // Face shadow on right side
  g.rect(x + hw - 4, top + 3.5, 1.2, 4).fill({ color: COL_SKIN_DK, alpha: 0.4 });

  // Beard in visor gap
  g.roundRect(x + 2, top + 5.5, hw - 4, 3.5, 1).fill({ color: COL_BEARD });
  // Beard highlight
  g.moveTo(x + 3.5, top + 6).lineTo(x + 3.5, top + 8.5).stroke({ color: COL_BEARD_HI, width: 0.5 });
  g.moveTo(x + 5.5, top + 6).lineTo(x + 5.5, top + 9).stroke({ color: COL_BEARD_HI, width: 0.5 });
  g.moveTo(x + 7.5, top + 6).lineTo(x + 7.5, top + 8.5).stroke({ color: COL_BEARD_HI, width: 0.5 });

  // Eyes in visor
  const eyeY = top + 4.5;
  g.ellipse(cx - 2 + tilt, eyeY, 1.1, 0.8).fill({ color: 0x4466aa });
  g.ellipse(cx + 2 + tilt, eyeY, 1.1, 0.8).fill({ color: 0x4466aa });
  g.circle(cx - 2 + tilt, eyeY, 0.4).fill({ color: COL_SHADOW });
  g.circle(cx + 2 + tilt, eyeY, 0.4).fill({ color: COL_SHADOW });

  // Raised visor bar
  g.rect(x + 1, top + 3, hw - 2, 0.8)
    .fill({ color: COL_PLATE_DK })
    .stroke({ color: COL_PLATE_SHD, width: 0.2 });

  // Helmet highlight ridge
  g.moveTo(cx + tilt - 0.5, top + 0.5)
    .lineTo(cx + tilt - 0.5, top + hh - 1.5)
    .stroke({ color: COL_PLATE_HI, width: 0.8, alpha: 0.5 });

  // Gold trim around helmet brim
  g.moveTo(x, top + hh).lineTo(x + hw, top + hh).stroke({ color: COL_GOLD, width: 1 });
  // Gold nasal bar
  g.rect(cx + tilt - 0.5, top, 1, 3).fill({ color: COL_GOLD });
  g.rect(cx + tilt - 0.3, top + 0.3, 0.5, 2).fill({ color: COL_GOLD_HI, alpha: 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  _right = true,
): void {
  // Upper arm — plate pauldron connects
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_PLATE, width: 3.5 });
  // Elbow cop
  const mx = lerp(sx, ex, 0.5);
  const my = lerp(sy, ey, 0.5);
  g.circle(mx, my, 2).fill({ color: COL_PLATE_HI });
  g.circle(mx, my, 2).stroke({ color: COL_PLATE_DK, width: 0.4 });
  // Vambrace highlight
  g.moveTo(lerp(mx, ex, 0.2), lerp(my, ey, 0.2))
    .lineTo(lerp(mx, ex, 0.8), lerp(my, ey, 0.8))
    .stroke({ color: COL_PLATE_HI, width: 0.6, alpha: 0.5 });
  // Gauntlet hand
  g.roundRect(ex - 2, ey - 1.5, 4, 3, 1)
    .fill({ color: COL_PLATE })
    .stroke({ color: COL_PLATE_DK, width: 0.3 });
}

function drawMace(g: Graphics, bx: number, by: number, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const shaftLen = 11;
  const tipX = bx + sin * shaftLen;
  const tipY = by - cos * shaftLen;
  const gripX = bx - sin * 3;
  const gripY = by + cos * 3;

  // Shaft
  g.moveTo(gripX, gripY)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_MACE_SHAFT, width: 2.5 });
  // Grip wrap bands
  for (let i = 0; i < 3; i++) {
    const bwt = 0.2 + i * 0.15;
    const wx = lerp(gripX, bx, bwt);
    const wy = lerp(gripY, by, bwt);
    g.circle(wx, wy, 1.2).fill({ color: COL_MACE_WRAP });
  }
  // Flanged head
  const headCX = tipX;
  const headCY = tipY;
  g.circle(headCX, headCY, 4.5)
    .fill({ color: COL_MACE_HEAD })
    .stroke({ color: COL_PLATE_DK, width: 0.5 });
  // Flanges — 6 radiating fins
  for (let i = 0; i < 6; i++) {
    const fa = angle + i * (Math.PI / 3);
    const fx1 = headCX + Math.cos(fa) * 3;
    const fy1 = headCY + Math.sin(fa) * 3;
    const fx2 = headCX + Math.cos(fa) * 6;
    const fy2 = headCY + Math.sin(fa) * 6;
    g.moveTo(fx1, fy1).lineTo(fx2, fy2).stroke({ color: COL_MACE_FLANGE, width: 1.8 });
  }
  // Head highlight
  g.circle(headCX - sin * 1.2 - cos * 0.8, headCY + cos * 1.2 - sin * 0.8, 1.5).fill({
    color: COL_PLATE_HI,
    alpha: 0.6,
  });
}

function drawHolyBook(g: Graphics, bx: number, by: number, _angle: number): void {
  // Book body
  const bw = 5;
  const bh = 7;
  g.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 0.5)
    .fill({ color: COL_BOOK })
    .stroke({ color: 0x2a1808, width: 0.5 });
  // Pages
  g.rect(bx - bw / 2 + 1, by - bh / 2 + 0.5, bw - 2.5, bh - 1).fill({ color: COL_BOOK_PAGE });
  // Page lines
  for (let i = 0; i < 4; i++) {
    g.moveTo(bx - bw / 2 + 1.2, by - bh / 2 + 2 + i * 1.2)
      .lineTo(bx + bw / 2 - 1.8, by - bh / 2 + 2 + i * 1.2)
      .stroke({ color: 0xb0a080, width: 0.3 });
  }
  // Gold spine
  g.rect(bx + bw / 2 - 1, by - bh / 2, 1, bh)
    .fill({ color: COL_BOOK_SPINE })
    .stroke({ color: COL_GOLD_DK, width: 0.2 });
  // Small cross on cover
  g.rect(bx - 0.4, by - 1.5, 0.8, 3).fill({ color: COL_CROSS });
  g.rect(bx - 1.2, by - 0.4, 2.4, 0.8).fill({ color: COL_CROSS });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.4; // subtle chest rise

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 11;

  drawShadow(g, CX, GY);
  drawSabatons(g, CX, GY, 0, 0);
  drawGreaves(g, CX, legTop, legH, 0, 0);
  drawTabardLower(g, CX, legTop + 2);
  drawBreastplate(g, CX, torsoTop, torsoH);
  drawHelmet(g, CX, headTop);

  // Right arm — mace held at side, tip down
  const rHandX = CX + 9;
  const rHandY = torsoTop + torsoH - 1;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY, true);
  drawMace(g, rHandX, rHandY + 1, 0.08 + Math.sin(t * Math.PI * 2) * 0.04);

  // Left arm — book raised in prayer
  const bookLift = Math.sin(t * Math.PI * 2) * 1.0;
  const lHandX = CX - 8;
  const lHandY = torsoTop + 4 - bookLift;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY, false);
  drawHolyBook(g, lHandX, lHandY, 0.1);

  // Faint golden glow from book during prayer
  const glowAlpha = 0.06 + Math.sin(t * Math.PI * 2) * 0.04;
  g.circle(lHandX, lHandY, 5).fill({ color: COL_GLOW, alpha: glowAlpha });
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 0.8; // heavy armor bob

  const legH = 9;
  const torsoH = 11;
  const stanceL = Math.round(stride * 3);
  const stanceR = Math.round(-stride * 3);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const headTop = torsoTop - 11;

  const lean = stride * 0.5; // slight forward lean on stride

  drawShadow(g, CX, GY, 11 + Math.abs(stride), 3);
  drawSabatons(g, CX, GY, stanceL, stanceR);
  drawGreaves(g, CX, legTop, legH, stanceL, stanceR);
  drawTabardLower(g, CX, legTop + 2, lean * 0.3);
  drawBreastplate(g, CX, torsoTop, torsoH, lean * 0.3);
  drawHelmet(g, CX, headTop, lean * 0.2);

  // Right arm — mace tucked close, slight swing
  const maceSway = stride * 0.12;
  const rHandX = CX + 8 + stride * 0.5;
  const rHandY = torsoTop + torsoH;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY, true);
  drawMace(g, rHandX, rHandY + 1, 0.08 + maceSway);

  // Left arm — book tucked against chest
  const lHandX = CX - 7 - stride * 0.5;
  const lHandY = torsoTop + 5;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY, false);
  drawHolyBook(g, lHandX, lHandY, 0.05);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0-1: wind up raising holy symbol
  // 2-4: golden light radiates outward
  // 5-7: hold / lower
  const phases = [0, 0.1, 0.25, 0.45, 0.6, 0.75, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  const raise = clamp01(t * 3) * 8; // book raises overhead
  const radiate = t > 0.2 && t < 0.7;
  const intensity = radiate ? clamp01((t - 0.2) / 0.25) * clamp01(1 - (t - 0.45) / 0.25) : 0;

  // Golden light burst
  if (radiate && intensity > 0.05) {
    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const ra = (i / rays) * Math.PI * 2 + t * 0.5;
      const r0 = 4;
      const r1 = 4 + intensity * 18;
      g.moveTo(CX + Math.cos(ra) * r0, headTop - 4 + Math.sin(ra) * r0 * 0.5)
        .lineTo(CX + Math.cos(ra) * r1, headTop - 4 + Math.sin(ra) * r1 * 0.5)
        .stroke({ color: COL_GLOW, width: 1.2, alpha: intensity * 0.5 });
    }
    // Soft bloom
    g.circle(CX, headTop - 2, 6 + intensity * 12).fill({
      color: COL_GLOW,
      alpha: intensity * 0.12,
    });
    g.circle(CX, headTop - 2, 4 + intensity * 6).fill({
      color: COL_GLOW_WRM,
      alpha: intensity * 0.25,
    });
  }

  drawShadow(g, CX, GY, 11, 3);
  drawSabatons(g, CX, GY, -1, 1);
  drawGreaves(g, CX, legTop, legH, -1, 1);
  drawTabardLower(g, CX, legTop + 2);
  drawBreastplate(g, CX, torsoTop, torsoH);
  drawHelmet(g, CX, headTop);

  // Right arm — holds mace at guard
  const rHandX = CX + 8;
  const rHandY = torsoTop + torsoH - 1;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY, true);
  drawMace(g, rHandX, rHandY + 1, 0.1);

  // Left arm — raises holy book skyward
  const lHandX = CX - 3 + t * 2;
  const lHandY = torsoTop + 3 - raise;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY, false);
  drawHolyBook(g, lHandX, lHandY, -0.3 - t * 0.2);

  // Glowing aura around the book when raised
  if (raise > 2) {
    const bookGlow = clamp01(raise / 8);
    g.circle(lHandX, lHandY, 6 + bookGlow * 4).fill({
      color: COL_GLOW,
      alpha: bookGlow * 0.2,
    });
    g.circle(lHandX, lHandY, 3 + bookGlow * 2).fill({
      color: COL_CROSS,
      alpha: bookGlow * 0.4,
    });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 2);

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 11;

  // Halo ring above helmet
  const haloY = headTop - 5;
  const haloR = 6 + pulse * 2;
  g.ellipse(CX, haloY, haloR, haloR * 0.35)
    .fill({ color: 0x000000, alpha: 0 }) // transparent fill
    .stroke({ color: COL_HALO, width: 1.5 + pulse, alpha: 0.6 + intensity * 0.3 });
  // Second halo (inner)
  g.ellipse(CX, haloY, haloR * 0.6, haloR * 0.6 * 0.35)
    .fill({ color: 0x000000, alpha: 0 })
    .stroke({ color: COL_GLOW, width: 0.7, alpha: 0.4 + pulse * 0.3 });

  // Channeling golden energy particles swirling down from above
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 3 + i * (Math.PI / 4);
    const dist = 8 + intensity * 12 + i * 1.2;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + 4 + Math.sin(angle) * dist * 0.35;
    const pAlpha = clamp01(0.2 + pulse * 0.3 - i * 0.02);
    const pSize = 0.8 + pulse * 0.5;
    g.circle(px, py, pSize).fill({ color: COL_GLOW, alpha: pAlpha });
  }

  // Warm bloom around whole body
  g.circle(CX, torsoTop + torsoH / 2, 14 + intensity * 4).fill({
    color: COL_GLOW_WRM,
    alpha: intensity * 0.08 + pulse * 0.04,
  });

  drawShadow(g, CX, GY, 11, 3, 0.3 + intensity * 0.1);
  drawSabatons(g, CX, GY, -2, 2);
  drawGreaves(g, CX, legTop, legH, -2, 2);
  drawTabardLower(g, CX, legTop + 2);
  drawBreastplate(g, CX, torsoTop, torsoH);
  drawHelmet(g, CX, headTop);

  // Both arms raised, channeling
  const armRaise = intensity * 7 + pulse * 1.5;

  const rHandX = CX + 7;
  const rHandY = torsoTop + 1 - armRaise;
  drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY, true);
  drawMace(g, rHandX, rHandY - 1, -0.4 - pulse * 0.1);

  const lHandX = CX - 7;
  const lHandY = torsoTop + 1 - armRaise;
  drawArm(g, CX - 5, torsoTop + 2, lHandX, lHandY, false);
  drawHolyBook(g, lHandX, lHandY, 0.4 + pulse * 0.1);

  // Golden energy between hands
  g.moveTo(rHandX, rHandY)
    .quadraticCurveTo(CX, rHandY - 3 - pulse * 3, lHandX, lHandY)
    .stroke({ color: COL_GLOW, width: 1.5 + pulse, alpha: 0.35 + intensity * 0.3 });

  // Bright focal point between hands
  g.circle(CX, (rHandY + lHandY) / 2 - 2, 2.5 + pulse * 1.5).fill({
    color: COL_CROSS,
    alpha: intensity * 0.6 + pulse * 0.2,
  });
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 9;
  const torsoH = 11;
  const legTop = GY - 4 - legH;

  // Drops to knees, then slumps forward
  const kneeDown = clamp01(t * 2.5) * 6;
  const slump = clamp01((t - 0.35) * 2) * 8;
  const fallAngle = clamp01((t - 0.3) * 2) * 0.6;

  const torsoTop = legTop - torsoH + 2 + kneeDown;
  const headTop = torsoTop - 11 + slump * 0.5;

  drawShadow(g, CX + slump * 0.3, GY, 11 + t * 2, 3, 0.3 * (1 - t * 0.4));

  // Legs collapse
  if (t < 0.5) {
    drawSabatons(g, CX, GY, 0, 0);
    drawGreaves(g, CX, legTop + kneeDown * 0.8, legH - kneeDown * 0.5, 0, 0);
  } else {
    // Crumpled on knees
    drawSabatons(g, CX, GY, -1, 1);
    drawGreaves(g, CX, legTop + kneeDown * 0.8, legH, -2, 2);
  }

  drawTabardLower(g, CX, legTop + 2 + kneeDown * 0.5, fallAngle * 2);
  drawBreastplate(g, CX + slump * 0.3, torsoTop, torsoH, fallAngle * 4);
  if (t < 0.9) {
    drawHelmet(g, CX + slump * 0.3, headTop, fallAngle * 4);
  }

  // Mace falls and clangs
  if (t < 0.4) {
    const rHandX = CX + 8;
    const rHandY = torsoTop + torsoH - 1;
    drawArm(g, CX + 5, torsoTop + 2, rHandX, rHandY, true);
    drawMace(g, rHandX, rHandY + 1, 0.08);
  } else {
    // Mace dropped — lying on ground
    const maceFallT = clamp01((t - 0.4) / 0.3);
    const macePX = CX + 8 + maceFallT * 5;
    const macePY = GY - 2 - (1 - maceFallT) * 8;
    drawMace(g, macePX, macePY, Math.PI * 0.5 + maceFallT * 0.3);
    // Arm flopped
    drawArm(g, CX + slump * 0.3 + 5, torsoTop + 2, CX + slump * 0.3 + 9, torsoTop + torsoH + 1, true);
  }

  // Book hand slumps
  const lHandX = CX - 8 + slump * 0.2;
  const lHandY = torsoTop + 5 + slump * 0.4;
  if (t < 0.85) {
    drawArm(g, CX + slump * 0.2 - 5, torsoTop + 2, lHandX, lHandY, false);
    drawHolyBook(g, lHandX, lHandY, 0.1 + fallAngle * 0.5);
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
 * Generate all War Chaplain sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateWarChaplainFrames(renderer: Renderer): RenderTexture[] {
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
