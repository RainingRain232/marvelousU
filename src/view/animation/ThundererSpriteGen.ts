// Procedural sprite generator for the Thunderer unit type.
//
// Draws a dwarven handgunner at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Short, stocky dwarven build
//   • Long ornate masterwork rifle with brass/gold fittings
//   • Wide-brimmed hat with feather
//   • Thick brown beard
//   • Green/brown military coat with leather bandolier of powder charges
//   • Sturdy iron-shod boots
//   • Idle: gun on shoulder, adjusts hat; Move: march with gun across chest
//   • Attack: aims and fires — muzzle flash + smoke puff + recoil
//   • Cast: full reload sequence (powder → ball → prime)
//   • Die: gun drops, stumbles, falls backward

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — military greens, dwarven browns, brass/gold metal
const COL_SKIN       = 0xc89060; // ruddy dwarven complexion
const COL_SKIN_DK    = 0xa07040;

const COL_COAT       = 0x4a6040; // dark military green coat
const COL_COAT_MID   = 0x3a5030;
const COL_COAT_DK    = 0x2a3820;
const COL_COAT_HI    = 0x607850;

const COL_BREECHES   = 0x8a7050; // brown breeches
const COL_BREECHES_DK= 0x6a5030;

const COL_BELT       = 0x3a2a10; // dark leather belt
const COL_BELT_BRASS = 0xc8901a; // brass buckle

const COL_BANDOLIER  = 0x4a3018; // leather bandolier
const COL_POWDER     = 0xb89060; // powder charge tubes
const COL_POWDER_CAP = 0xc8a030; // brass cap on powder charge

const COL_HAT        = 0x2a3820; // dark green wide-brimmed hat
const COL_HAT_BRIM   = 0x1e2c18;
const COL_HAT_BAND   = 0xc8901a; // brass/gold hat band
const COL_FEATHER    = 0xd4c060; // yellow feather

const COL_BEARD      = 0x7a5020; // thick brown beard
const COL_BEARD_HI   = 0xa07040;
const COL_BEARD_DK   = 0x4a3010;

const COL_BOOT       = 0x3a2a10; // dark leather boots
const COL_BOOT_DK    = 0x201808;
const COL_BOOT_HI    = 0x5a4020;

const COL_GUN_STOCK  = 0x6a4018; // walnut wood stock
const COL_GUN_STOCK_HI=0x8a6030;
const COL_GUN_BARREL = 0x7a8090; // blued steel barrel
const COL_GUN_BAR_HI = 0xa0aab8;
const COL_GUN_BRASS  = 0xc8901a; // brass fittings on gun
const COL_GUN_BRASS_HI=0xe8b030;
const COL_GUN_LOCK   = 0x909aa8; // flintlock mechanism

const COL_FLASH      = 0xffee44; // muzzle flash yellow
const COL_FLASH_HOT  = 0xffffff; // flash centre white
const COL_SMOKE      = 0xc0c0b0; // gunsmoke grey
const COL_SMOKE_DK   = 0x909088;

const COL_POWDER_PUFF= 0xd4d0b0; // powder smoke puff (reload)

const COL_SHADOW     = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 10,
  h = 2.5,
  alpha = 0.28,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

// Sturdy dwarven boots — iron-shod
function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  const bw = 5;
  const bh = 4;
  // Left boot
  g.roundRect(cx - 8 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Right boot
  g.roundRect(cx + 3 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // Top fold
  g.rect(cx - 8 + stanceL, gy - bh, bw, 1).fill({ color: COL_BOOT_HI, alpha: 0.5 });
  g.rect(cx + 3 + stanceR, gy - bh, bw, 1).fill({ color: COL_BOOT_HI, alpha: 0.5 });
  // Iron sole
  g.rect(cx - 8 + stanceL, gy - 1, bw, 1).fill({ color: COL_SHADOW, alpha: 0.4 });
  g.rect(cx + 3 + stanceR, gy - 1, bw, 1).fill({ color: COL_SHADOW, alpha: 0.4 });
}

// Short sturdy dwarven legs in breeches
function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 4;
  g.rect(cx - 8 + stanceL, legTop, lw, legH)
    .fill({ color: COL_BREECHES })
    .stroke({ color: COL_BREECHES_DK, width: 0.4 });
  g.rect(cx + 4 + stanceR, legTop, lw, legH)
    .fill({ color: COL_BREECHES })
    .stroke({ color: COL_BREECHES_DK, width: 0.4 });
  // Breeches highlight seam
  g.rect(cx - 7 + stanceL, legTop, 0.8, legH).fill({ color: COL_COAT_HI, alpha: 0.2 });
  g.rect(cx + 5 + stanceR, legTop, 0.8, legH).fill({ color: COL_COAT_HI, alpha: 0.2 });
}

// Green military coat body — stocky dwarven build
function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;

  // Coat body
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_COAT })
    .stroke({ color: COL_COAT_DK, width: 0.5 });

  // Coat lapels
  g.moveTo(cx + tilt - 2, top)
    .lineTo(cx + tilt - 3.5, top + 4)
    .lineTo(cx + tilt - 1, top + 5)
    .closePath()
    .fill({ color: COL_COAT_MID });
  g.moveTo(cx + tilt + 2, top)
    .lineTo(cx + tilt + 3.5, top + 4)
    .lineTo(cx + tilt + 1, top + 5)
    .closePath()
    .fill({ color: COL_COAT_MID });

  // Button row
  for (let i = 0; i < 3; i++) {
    g.circle(cx + tilt, top + 3 + i * 2.5, 0.5).fill({ color: COL_GUN_BRASS, alpha: 0.8 });
  }

  // Shoulder epaulette nub (right)
  g.roundRect(x + tw - 1, top, 3, 3, 1).fill({ color: COL_COAT_HI, alpha: 0.5 });
  g.circle(x + tw + 1, top + 1.5, 0.6).fill({ color: COL_GUN_BRASS, alpha: 0.6 });

  // Coat tail / skirt split at bottom
  g.rect(x, top + h - 2, tw / 2, 2).fill({ color: COL_COAT_MID });
  g.rect(x + tw / 2, top + h - 2, tw / 2, 2).fill({ color: COL_COAT_DK });

  // Leather bandolier — diagonal strap with powder charges
  const bx1 = cx + tilt - 5;
  const by1 = top;
  const bx2 = cx + tilt + 4;
  const by2 = top + h;
  g.moveTo(bx1, by1).lineTo(bx2, by2).stroke({ color: COL_BANDOLIER, width: 2.5 });
  // Powder charges hung on bandolier
  const numCharges = 4;
  for (let i = 0; i < numCharges; i++) {
    const bt = (i + 0.5) / numCharges;
    const pcx = lerp(bx1, bx2, bt) + 2;
    const pcy = lerp(by1, by2, bt);
    // Charge tube
    g.roundRect(pcx, pcy - 1, 2, 4, 0.5).fill({ color: COL_POWDER });
    // Brass cap
    g.rect(pcx, pcy - 1, 2, 1).fill({ color: COL_POWDER_CAP });
  }

  // Belt
  g.rect(x, top + h - 3, tw, 2).fill({ color: COL_BELT });
  g.circle(cx + tilt, top + h - 2, 1.8).fill({ color: COL_BELT_BRASS });
  g.circle(cx + tilt, top + h - 2, 0.8).fill({ color: COL_GUN_BRASS_HI, alpha: 0.7 });
}

// Wide-brimmed hat with feather
function drawHat(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  featherBob = 0,
): void {
  const hw = 13; // hat is wide
  const crownH = 6;
  const x = cx - hw / 2 + tilt;

  // Hat crown
  g.roundRect(x + 2, top, hw - 4, crownH, 2)
    .fill({ color: COL_HAT })
    .stroke({ color: COL_HAT_BRIM, width: 0.4 });

  // Crown highlight
  g.roundRect(x + 3, top + 0.5, hw - 8, 1.5, 1).fill({ color: COL_COAT_HI, alpha: 0.2 });

  // Hat band (brass)
  g.rect(x + 2, top + crownH - 1.5, hw - 4, 1.5).fill({ color: COL_HAT_BAND });
  g.rect(x + 2, top + crownH - 1.5, hw - 4, 0.6).fill({ color: COL_GUN_BRASS_HI, alpha: 0.5 });

  // Wide brim
  g.roundRect(x, top + crownH - 1, hw, 2.5, 1)
    .fill({ color: COL_HAT_BRIM })
    .stroke({ color: COL_SHADOW, width: 0.3 });

  // Brim highlight on left edge
  g.moveTo(x + 0.5, top + crownH - 0.5).lineTo(x + 0.5, top + crownH + 1).stroke({ color: COL_COAT_HI, width: 0.5, alpha: 0.3 });

  // Feather — yellow plume on right side of hat
  const fx = x + hw - 3 + tilt;
  const fy = top + crownH - 2;
  const fwave = Math.sin(featherBob * Math.PI * 2) * 1.5;
  g.moveTo(fx, fy)
    .quadraticCurveTo(fx + 4, fy - 4 + fwave, fx + 5, fy - 9 + fwave)
    .stroke({ color: COL_FEATHER, width: 1.8 });
  // Feather fronds
  for (let i = 0; i < 4; i++) {
    const ft = (i + 1) / 5;
    const fpx = lerp(fx, fx + 5, ft);
    const fpy = lerp(fy, fy - 9 + fwave, ft) + lerp(0, fwave * 0.3, ft);
    g.moveTo(fpx, fpy)
      .lineTo(fpx + 2, fpy - 1.5)
      .stroke({ color: COL_FEATHER, width: 0.6, alpha: 0.5 });
  }
}

// Head — ruddy dwarven face, no helmet
function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 8;
  const hh = 7;
  const x = cx - hw / 2 + tilt;

  // Face
  g.roundRect(x + 0.5, top + 1, hw - 1, hh - 1, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.3 });

  // Eyes — squinting determined look
  const eyeY = top + hh * 0.38;
  g.rect(cx + tilt - 3, eyeY, 1.6, 0.9).fill({ color: COL_SHADOW });
  g.rect(cx + tilt + 1.4, eyeY, 1.6, 0.9).fill({ color: COL_SHADOW });
  // Brow furrow
  g.moveTo(cx + tilt - 3.2, eyeY - 1.2)
    .lineTo(cx + tilt - 1, eyeY - 1.5)
    .stroke({ color: COL_BEARD_DK, width: 0.5 });
  g.moveTo(cx + tilt + 3.2, eyeY - 1.2)
    .lineTo(cx + tilt + 1, eyeY - 1.5)
    .stroke({ color: COL_BEARD_DK, width: 0.5 });

  // Nose — bulbous dwarven nose
  g.circle(cx + tilt, top + hh * 0.58, 1.2).fill({ color: COL_SKIN_DK });

  // Mouth
  g.moveTo(cx + tilt - 1.2, top + hh * 0.75)
    .lineTo(cx + tilt + 1.2, top + hh * 0.75)
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
}

// Magnificent thick beard
function drawBeard(
  g: Graphics,
  cx: number,
  top: number,
  wave: number,
  tilt = 0,
): void {
  const bw = 9;
  const bh = 10;
  const x = cx - bw / 2 + tilt;

  // Main beard mass
  g.roundRect(x, top, bw, bh, 3)
    .fill({ color: COL_BEARD })
    .stroke({ color: COL_BEARD_DK, width: 0.4 });

  // Beard highlight texture lines
  for (let i = 0; i < 4; i++) {
    const lx = x + 1.5 + i * 2;
    const dw = wave * (i % 2 === 0 ? 1 : -1) * 0.8;
    g.moveTo(lx, top + 1)
      .quadraticCurveTo(lx + dw, top + bh * 0.5, lx + dw * 1.3, top + bh - 1)
      .stroke({ color: i % 2 === 0 ? COL_BEARD_HI : COL_BEARD_DK, width: 0.7, alpha: 0.5 });
  }

  // Beard lower mass — widens slightly
  g.roundRect(x - 1, top + bh - 3, bw + 2, 4, 2).fill({ color: COL_BEARD });

  // Bottom fringe
  for (let i = 0; i < 5; i++) {
    const fx = x + i * 2.2 + wave * (i % 2 === 0 ? 0.4 : -0.4);
    g.moveTo(fx, top + bh + 1)
      .lineTo(fx + 0.5, top + bh + 2.5)
      .stroke({ color: COL_BEARD_DK, width: 1 });
  }

  // Beard highlight
  g.roundRect(x + 2, top + 1, 3, 2, 1).fill({ color: COL_BEARD_HI, alpha: 0.35 });
}

// Masterwork dwarven firearm — long rifle with brass fittings
// Returns the muzzle tip position
function drawGun(
  g: Graphics,
  stockX: number,
  stockY: number,
  tipX: number,
  tipY: number,
): { tipX: number; tipY: number } {
  // Stock (wood)
  const len = Math.sqrt((tipX - stockX) ** 2 + (tipY - stockY) ** 2);
  const dx = (tipX - stockX) / len;
  const dy = (tipY - stockY) / len;
  const perp = { x: -dy, y: dx };

  // Stock body
  g.moveTo(stockX + perp.x * 2, stockY + perp.y * 2)
    .lineTo(stockX - perp.x * 1, stockY - perp.y * 1)
    .lineTo(tipX - perp.x * 0.8, tipY - perp.y * 0.8)
    .lineTo(tipX + perp.x * 1, tipY + perp.y * 1)
    .closePath()
    .fill({ color: COL_GUN_STOCK })
    .stroke({ color: COL_BEARD_DK, width: 0.3 });

  // Stock highlight grain
  g.moveTo(stockX + perp.x * 0.8, stockY + perp.y * 0.8)
    .lineTo(tipX + perp.x * 0.4, tipY + perp.y * 0.4)
    .stroke({ color: COL_GUN_STOCK_HI, width: 0.6, alpha: 0.4 });

  // Barrel (blued steel — narrower, along top of stock)
  const barrelStart = 0.35; // starts 35% along
  const bsx = lerp(stockX, tipX, barrelStart);
  const bsy = lerp(stockY, tipY, barrelStart);
  g.moveTo(bsx + perp.x * 1.2, bsy + perp.y * 1.2)
    .lineTo(bsx - perp.x * 0.4, bsy - perp.y * 0.4)
    .lineTo(tipX - perp.x * 0.4, tipY - perp.y * 0.4)
    .lineTo(tipX + perp.x * 1.2, tipY + perp.y * 1.2)
    .closePath()
    .fill({ color: COL_GUN_BARREL })
    .stroke({ color: COL_SHADOW, width: 0.3, alpha: 0.4 });

  // Barrel highlight
  g.moveTo(bsx + perp.x * 0.9, bsy + perp.y * 0.9)
    .lineTo(tipX + perp.x * 0.9, tipY + perp.y * 0.9)
    .stroke({ color: COL_GUN_BAR_HI, width: 0.6, alpha: 0.5 });

  // Brass bands on barrel
  const bandPositions = [0.4, 0.6, 0.8];
  for (const bp of bandPositions) {
    const bpx = lerp(bsx, tipX, bp);
    const bpy = lerp(bsy, tipY, bp);
    g.moveTo(bpx + perp.x * 1.4, bpy + perp.y * 1.4)
      .lineTo(bpx - perp.x * 0.6, bpy - perp.y * 0.6)
      .stroke({ color: COL_GUN_BRASS, width: 1.2 });
  }

  // Flintlock mechanism (near stock-barrel junction)
  const lockX = lerp(stockX, tipX, 0.38);
  const lockY = lerp(stockY, tipY, 0.38);
  g.roundRect(lockX - perp.x * 0.8 - 1.5, lockY - perp.y * 0.8 - 1, 3.5, 2.5, 0.8)
    .fill({ color: COL_GUN_LOCK })
    .stroke({ color: COL_SHADOW, width: 0.3 });
  // Flint hammer
  g.moveTo(lockX - perp.x * 0.5, lockY - perp.y * 0.5 - 2)
    .lineTo(lockX - perp.x * 0.5 + 2, lockY - perp.y * 0.5)
    .stroke({ color: COL_GUN_BRASS, width: 1.2 });

  // Trigger guard (brass curve)
  g.arc(lockX + 3, lockY - perp.y * 0.2, 2, 0.2, Math.PI - 0.2).stroke({ color: COL_GUN_BRASS, width: 0.8 });

  // Muzzle crown (brass ring at tip)
  g.circle(tipX, tipY, 1.2).fill({ color: COL_GUN_BRASS });
  g.circle(tipX, tipY, 0.6).fill({ color: COL_SHADOW, alpha: 0.8 });

  return { tipX, tipY };
}

// Muzzle flash effect
function drawMuzzleFlash(
  g: Graphics,
  mx: number,
  my: number,
  dx: number,
  dy: number,
  intensity: number,
): void {
  // Flash rays
  const numRays = 7;
  for (let i = 0; i < numRays; i++) {
    const spread = ((i / numRays) - 0.5) * Math.PI * 0.7;
    const angle = Math.atan2(dy, dx) + spread;
    const len = (4 + (i % 3) * 2) * intensity;
    const fx = mx + Math.cos(angle) * len;
    const fy = my + Math.sin(angle) * len;
    g.moveTo(mx, my)
      .lineTo(fx, fy)
      .stroke({ color: i % 3 === 0 ? COL_FLASH_HOT : COL_FLASH, width: 1.5 - i * 0.1, alpha: intensity * 0.85 });
  }
  // Core glow
  g.circle(mx, my, 3 * intensity).fill({ color: COL_FLASH, alpha: intensity * 0.7 });
  g.circle(mx, my, 1.5 * intensity).fill({ color: COL_FLASH_HOT, alpha: intensity });
}

// Smoke puff
function drawSmoke(
  g: Graphics,
  mx: number,
  my: number,
  phase: number, // 0=fresh dense, 1=dispersed
): void {
  const numPuffs = 5;
  for (let i = 0; i < numPuffs; i++) {
    const angle = -Math.PI * 0.5 + (i - numPuffs / 2) * 0.18 - phase * 0.15;
    const dist = 3 + phase * 8 + i * 1.2;
    const px = mx + Math.cos(angle) * dist;
    const py = my + Math.sin(angle) * dist;
    const radius = 1.5 + phase * 3 + (i % 2) * 0.8;
    g.circle(px, py, radius).fill({ color: i % 2 === 0 ? COL_SMOKE : COL_SMOKE_DK, alpha: (1 - phase) * 0.5 });
  }
}

// Arm
function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_COAT, width: 3 });
  g.moveTo(sx + 0.4, sy).lineTo(ex + 0.4, ey).stroke({ color: COL_COAT_HI, width: 0.7, alpha: 0.3 });
  // Cuff
  const cuffT = 0.8;
  g.circle(lerp(sx, ex, cuffT), lerp(sy, ey, cuffT), 1.5).fill({ color: COL_COAT_MID });
  // Hand
  g.circle(ex, ey, 1.3).fill({ color: COL_SKIN });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const featherBob = t;
  // Adjusts hat on frame 4-5 (t ~ 0.5)
  const hatAdjust = frame >= 3 && frame <= 5 ? Math.sin((frame - 3) / 2 * Math.PI) * 1.5 : 0;

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + breathe;
  const headTop = torsoTop - 7;
  const hatTop = headTop - 6;

  drawShadow(g, CX, GY, 10, 2.5);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);

  // Gun resting on right shoulder — barrel pointing up-right
  const gunStockX = CX + 5;
  const gunStockY = torsoTop + 3;
  const gunTipX = CX + 14;
  const gunTipY = torsoTop - 8;
  drawGun(g, gunStockX, gunStockY, gunTipX, gunTipY);

  // Right arm holds gun on shoulder
  drawArm(g, CX + 4, torsoTop + 2, gunStockX - 1, gunStockY + 1);

  // Left arm — raised to adjust hat on frames 3-5
  const leftHandX = CX - 7;
  const leftHandY = frame >= 3 && frame <= 5 ? headTop + hatAdjust : torsoTop + 5;
  drawArm(g, CX - 4, torsoTop + 2, leftHandX, leftHandY);

  drawBeard(g, CX, headTop + 7, Math.sin(t * Math.PI * 2) * 0.3);
  drawHead(g, CX, headTop);
  drawHat(g, CX, hatTop, 0, featherBob);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const stride = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(stride) * 0.9;

  const legH = 7;
  const torsoH = 10;
  const stanceL = Math.round(stride * 2.8);
  const stanceR = Math.round(-stride * 2.8);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH - bob;
  const headTop = torsoTop - 7;
  const hatTop = headTop - 6;

  const beardBounce = Math.sin(t * Math.PI * 4) * 0.4;
  const featherBob = t;

  drawShadow(g, CX, GY, 10 + Math.abs(stride), 2.5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH);

  // Gun held across chest — both hands on it
  const gunStockX = CX - 6;
  const gunStockY = torsoTop + 5;
  const gunTipX = CX + 9;
  const gunTipY = torsoTop + 2;
  drawGun(g, gunStockX, gunStockY, gunTipX, gunTipY);

  // Both arms holding gun
  drawArm(g, CX - 4, torsoTop + 2, gunStockX + 2, gunStockY);
  drawArm(g, CX + 4, torsoTop + 2, gunTipX - 4, gunTipY + 1);

  // Powder charges bounce on bandolier — subtle
  // (already drawn in torso, this just re-emphasises bob)

  drawBeard(g, CX, headTop + 7, beardBounce);
  drawHead(g, CX, headTop);
  drawHat(g, CX, hatTop, 0, featherBob);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 0: aim settling 1-2: aimed 3: fire (flash peak) 4: recoil 5-6: recoil settle 7: recover
  const phases = [0, 0.13, 0.26, 0.38, 0.52, 0.65, 0.8, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 7;
  const hatTop = headTop - 6;

  // Firing stance — left foot forward
  const stanceL = -3;
  const stanceR = 1;

  // Recoil at frame 4
  const recoilT = frame === 4 ? 1.0 : frame === 5 ? 0.5 : frame === 6 ? 0.2 : 0.0;
  const recoilPush = recoilT * 2; // gun kicks back

  // Lean forward to aim
  const aimLean = t < 0.5 ? lerp(0, 1.5, t / 0.35) : lerp(1.5, 0, (t - 0.5) / 0.5);

  drawShadow(g, CX + aimLean, GY, 12, 2.5);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, aimLean * 0.4);

  // Gun aimed forward — nearly horizontal pointing right
  const gunStockX = CX - 2 + aimLean - recoilPush;
  const gunStockY = torsoTop + 4;
  const gunTipX = CX + 14 + aimLean;
  const gunTipY = torsoTop + 2;
  drawGun(g, gunStockX, gunStockY, gunTipX, gunTipY);

  // Muzzle flash at frame 3
  if (frame === 3) {
    const flashDir = { x: gunTipX - gunStockX, y: gunTipY - gunStockY };
    const fLen = Math.sqrt(flashDir.x ** 2 + flashDir.y ** 2);
    drawMuzzleFlash(g, gunTipX, gunTipY, flashDir.x / fLen, flashDir.y / fLen, 1.0);
  }
  // Smoke after shot (frames 4-6)
  if (frame >= 4 && frame <= 6) {
    const smokePhase = (frame - 4) / 2;
    drawSmoke(g, gunTipX, gunTipY, smokePhase);
  }

  // Arms hold gun
  drawArm(g, CX - 3 + aimLean, torsoTop + 2, gunStockX + 3, gunStockY - 1);
  drawArm(g, CX + 4 + aimLean, torsoTop + 2, gunTipX - 5, gunTipY + 1);

  drawBeard(g, CX, headTop + 7, 0);
  drawHead(g, CX, headTop, aimLean * 0.3);
  drawHat(g, CX, hatTop, aimLean * 0.3);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Reload animation — 8 frames of mechanical action
  // 0-1: open pan / blow powder 2-3: pour powder from charge 4: ram ball 5-6: prime pan 7: snap lock shut
  const t = frame / 7;
  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 7;
  const hatTop = headTop - 6;

  // Gun held vertically downward for reload
  const gunStockX = CX + 4;
  const gunStockY = torsoTop + 5;
  const gunTipX = CX + 2;
  const gunTipY = GY - 2;

  drawShadow(g, CX, GY, 11, 2.5);
  drawBoots(g, CX, GY, -1, 2);
  drawLegs(g, CX, legTop, legH, -1, 2);
  drawTorso(g, CX, torsoTop, torsoH);
  drawGun(g, gunStockX, gunStockY, gunTipX, gunTipY);

  // Frame-specific reload actions
  if (frame <= 1) {
    // Open pan — left hand reaches for pan cover
    drawArm(g, CX - 4, torsoTop + 2, gunStockX - 2, gunStockY - 2 - frame);
    // Blow powder from pan (puff)
    if (frame === 1) {
      drawSmoke(g, CX - 3, headTop + 8, 0.3);
    }
    drawArm(g, CX + 4, torsoTop + 2, gunStockX + 2, gunStockY - 1);
  } else if (frame <= 3) {
    // Pour powder — left hand tips charge over muzzle
    const pourT = (frame - 2) / 1;
    const chargeX = CX - 8 + pourT * 6;
    const chargeY = torsoTop + 2 - pourT * 4;
    // Draw held powder charge
    g.roundRect(chargeX - 1, chargeY - 3, 2.5, 5, 0.5).fill({ color: COL_POWDER });
    g.rect(chargeX - 1, chargeY - 3, 2.5, 1.2).fill({ color: COL_POWDER_CAP });
    // Powder stream
    if (pourT > 0.5) {
      const psx = chargeX;
      const psy = chargeY + 2;
      g.moveTo(psx, psy)
        .quadraticCurveTo(psx + 1, psy + 4, gunTipX + 0.5, gunTipY - 2)
        .stroke({ color: COL_POWDER_PUFF, width: 0.8, alpha: 0.6 });
    }
    drawArm(g, CX - 4, torsoTop + 2, chargeX, chargeY + 2);
    drawArm(g, CX + 4, torsoTop + 2, gunStockX + 2, gunStockY - 1);
  } else if (frame === 4) {
    // Ram ball — right arm punches down with ramrod
    const ramrodX = gunTipX + 0.5;
    g.moveTo(ramrodX, gunTipY - 6)
      .lineTo(ramrodX, gunTipY - 16)
      .stroke({ color: COL_BELT, width: 1.5 });
    // Ramrod handle
    g.circle(ramrodX, gunTipY - 16, 1.2).fill({ color: COL_GUN_BRASS });
    drawArm(g, CX + 4, torsoTop + 2, ramrodX, gunTipY - 10);
    drawArm(g, CX - 4, torsoTop + 2, gunStockX - 1, gunStockY + 1);
  } else if (frame <= 6) {
    // Prime the pan — careful left-hand action
    const primeT = (frame - 5) / 1;
    const primeX = gunStockX - 2 + primeT;
    const primeY = gunStockY - 3 - primeT * 2;
    drawArm(g, CX - 4, torsoTop + 2, primeX, primeY);
    drawArm(g, CX + 4, torsoTop + 2, gunStockX + 2, gunStockY - 1);
    // Small powder pinch visible
    g.circle(primeX, primeY, 1.5).fill({ color: COL_POWDER_PUFF, alpha: 0.5 });
  } else {
    // Snap lock shut — both hands back on gun
    drawArm(g, CX - 4, torsoTop + 2, gunStockX - 1, gunStockY + 1);
    drawArm(g, CX + 4, torsoTop + 2, gunStockX + 2, gunStockY - 1);
    // Spark from lock snapping
    g.circle(gunStockX + 1, gunStockY - 3, 1).fill({ color: COL_FLASH, alpha: 0.7 });
  }

  drawBeard(g, CX, headTop + 7, t * 0.4);
  // Dwarf looks down at gun during reload
  drawHead(g, CX, headTop, 0.3);
  drawHat(g, CX, hatTop, 0.3);
}

function generateDieFrame(g: Graphics, frame: number): void {
  const t = frame / 7;

  const legH = 7;
  const torsoH = 10;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH;
  const headTop = torsoTop - 7;
  const hatTop = headTop - 6;

  // Stumble backwards and fall on back
  // t=0 upright, t=0.3 stumble begins, t=1 fully on back
  const fallAngle = Math.min(t / 0.7, 1.0) * 0.7; // tip backward
  const fallX = -t * 7; // slides left as falls back
  const sinkY = t * t * 8; // drops as falls

  const adjTorsoTop = torsoTop + sinkY * 0.3;
  const adjHeadTop = headTop + sinkY * 0.2;

  drawShadow(g, CX + fallX * 0.2, GY, 10 + t * 5, 2.5, 0.28);

  // Legs collapse
  if (t < 0.6) {
    const legStaggerL = -t * 2;
    const legStaggerR = t * 3;
    drawBoots(g, CX + fallX * 0.1, GY, legStaggerL, legStaggerR);
    drawLegs(g, CX + fallX * 0.1, legTop + sinkY * 0.2, legH, legStaggerL, legStaggerR);
  } else {
    // Legs played out — both near ground
    drawBoots(g, CX + fallX * 0.15, GY, -4, 3);
    drawLegs(g, CX + fallX * 0.15, legTop + sinkY * 0.5, legH * 0.6, -4, 3);
  }

  drawTorso(g, CX + fallX * 0.4, adjTorsoTop, torsoH * (1 - t * 0.1), -fallAngle * 2.5);

  // Gun drops separately — falls forward
  if (t < 0.5) {
    const gunDrop = t / 0.5;
    const gsX = CX + 5 + gunDrop * 8;
    const gsY = torsoTop + 3 + gunDrop * 6;
    const gtX = CX + 14 + gunDrop * 2;
    const gtY = torsoTop + 1 + gunDrop * 10;
    drawGun(g, gsX, gsY, gtX, gtY);
  } else {
    // Gun on ground
    drawGun(g, CX + 13, GY - 1, CX + 1, GY - 1);
  }

  // Left arm flails
  if (t < 0.7) {
    drawArm(
      g,
      CX - 3 + fallX * 0.3,
      adjTorsoTop + 2,
      CX - 10 + fallX * 0.4,
      adjTorsoTop - 3 + sinkY * 0.5,
    );
  } else {
    // Arm lands on ground
    drawArm(
      g,
      CX - 3 + fallX * 0.3,
      adjTorsoTop + 2,
      CX - 9 + fallX * 0.3,
      GY - 2,
    );
  }

  // Right arm (gun arm) also flies up then down
  if (t < 0.45) {
    drawArm(
      g,
      CX + 4 + fallX * 0.3,
      adjTorsoTop + 2,
      CX + 12 + fallX * 0.1,
      adjTorsoTop - 5 + t * 10,
    );
  }

  if (t < 0.8) {
    drawBeard(g, CX + fallX * 0.4, adjHeadTop + 7, t * 2, -fallAngle * 2);
    drawHead(g, CX + fallX * 0.4, adjHeadTop, -fallAngle * 2);
  }

  // Hat flies off at t>0.25
  if (t > 0.25 && t < 0.85) {
    const hatFlyX = (t - 0.25) * 20;
    const hatFlyY = -(t - 0.25) * 12 + (t - 0.25) ** 2 * 30;
    drawHat(g, CX + hatFlyX + fallX * 0.2, hatTop + hatFlyY, -(t - 0.25) * 0.5, t);
  } else if (t >= 0.85) {
    // Hat lands on ground
    drawHat(g, CX + 12, GY - 4, -0.15, 1.0);
  } else {
    drawHat(g, CX + fallX * 0.4, hatTop, -fallAngle * 2);
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
 * Generate all Thunderer sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateThundererFrames(renderer: Renderer): RenderTexture[] {
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
