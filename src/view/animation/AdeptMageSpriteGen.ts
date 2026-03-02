// Procedural sprite generator for Adept & Master Mage unit types.
//
// Draws a detailed side-view mage at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Flowing robe with folds, embroidery, elemental trim
//   • Pointed wizard hat with curved brim and gem
//   • Fair skin face with visible nose, brow, white beard
//   • Gnarled staff with ornate crystal top
//   • Spell glow during casting
//   • Leather sandals peeking beneath robe
//
// Master/elder mages additionally get:
//   • Shoulder mantle with glowing runes
//   • Taller hat, longer beard, larger staff crystal
//   • Extra spell particles during cast

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export interface AdeptMagePalette {
  robe: number;
  robeDark: number;
  robeLight: number;
  trim: number;
  hat: number;
  hatTrim: number;
  skin: number;
  beard: number;
  eye: number;
  elder?: boolean;
}

export const PALETTE_FIRE_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0xcc3322, robeDark: 0x992211, robeLight: 0xee5544,
  trim: 0xffcc00, hat: 0xcc3322, hatTrim: 0xffcc00,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222,
};
export const PALETTE_COLD_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0x3388cc, robeDark: 0x225577, robeLight: 0x55aaff,
  trim: 0xccffff, hat: 0x3388cc, hatTrim: 0xccffff,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222,
};
export const PALETTE_LIGHTNING_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0xccaa33, robeDark: 0x997711, robeLight: 0xeecc55,
  trim: 0xffffaa, hat: 0xccaa33, hatTrim: 0xffffaa,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222,
};
export const PALETTE_DISTORTION_ADEPT_MAGE: AdeptMagePalette = {
  robe: 0x8844cc, robeDark: 0x552288, robeLight: 0xaa66ee,
  trim: 0xff88ff, hat: 0x8844cc, hatTrim: 0xff88ff,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222,
};

export const PALETTE_FIRE_MASTER_MAGE: AdeptMagePalette = {
  robe: 0xbb3311, robeDark: 0x882200, robeLight: 0xdd5533,
  trim: 0xffdd44, hat: 0xbb3311, hatTrim: 0xffdd44,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222, elder: true,
};
export const PALETTE_COLD_MASTER_MAGE: AdeptMagePalette = {
  robe: 0x2266aa, robeDark: 0x113366, robeLight: 0x4488cc,
  trim: 0xaaddff, hat: 0x2266aa, hatTrim: 0xaaddff,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222, elder: true,
};
export const PALETTE_LIGHTNING_MASTER_MAGE: AdeptMagePalette = {
  robe: 0xaa8811, robeDark: 0x775500, robeLight: 0xccaa33,
  trim: 0xffff88, hat: 0xaa8811, hatTrim: 0xffff88,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222, elder: true,
};
export const PALETTE_DISTORTION_MASTER_MAGE: AdeptMagePalette = {
  robe: 0x7733aa, robeDark: 0x552277, robeLight: 0x9955cc,
  trim: 0xdd66ff, hat: 0x7733aa, hatTrim: 0xdd66ff,
  skin: 0xe8c8a8, beard: 0xeeeeee, eye: 0x222222, elder: true,
};

// ---------------------------------------------------------------------------
// Draw helpers — NOTE: poly draws shape THEN fills to avoid bleed-through
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.fill({ color, alpha }); g.ellipse(x, y, rx, ry);
}
function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fill({ color, alpha }); g.circle(x, y, r);
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha }); g.rect(x, y, w, h);
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.stroke({ color, width: w }); g.moveTo(x1, y1).lineTo(x2, y2);
}
function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.poly(pts); g.fill({ color, alpha });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COL_STAFF    = 0x6a4e38;
const COL_STAFF_HI = 0x8a6e58;
const COL_STAFF_DK = 0x4a3020;
const COL_SANDAL   = 0x8a6a40;
const COL_SANDAL_DK = 0x6a4a28;
const COL_SKIN_HI  = 0xf0d8b8;
const COL_SKIN_DK  = 0xc8a080;
const COL_NOSE     = 0xd8b898;
const COL_SHADOW   = 0x000000;

// ---------------------------------------------------------------------------
// Component drawing
// ---------------------------------------------------------------------------

function drawRobe(g: Graphics, x: number, y: number, p: AdeptMagePalette, breathe: number, sway: number): void {
  const h = 20;

  // Main robe body — tapered A-line
  poly(g, [x - 5, y, x + 5, y, x + 9, y + h, x + 7, y + h + 1, x - 7, y + h + 1, x - 9, y + h], p.robe);

  // Light inner panel (center)
  poly(g, [x - 2, y + 2, x + 2, y + 2, x + 3, y + h - 2, x - 3, y + h - 2], p.robeLight);

  // Fold shadows (organic curves via thin rects angled)
  line(g, x - 3, y + 3, x - 6 + sway * 0.3, y + h - 1, p.robeDark, 1);
  line(g, x + 3, y + 3, x + 6 - sway * 0.3, y + h - 1, p.robeDark, 1);
  line(g, x, y + 4, x + sway * 0.2, y + h - 2, p.robeDark, 0.6);

  // Side shading
  ellipse(g, x - 7, y + h * 0.6, 2, h * 0.35, p.robeDark, 0.5);
  ellipse(g, x + 7, y + h * 0.6, 2, h * 0.35, p.robeDark, 0.5);

  // Collar — rounded
  ellipse(g, x, y + 1, 5, 2, p.robeDark);
  ellipse(g, x, y + 0.5, 4, 1.5, p.trim);

  // Sash / belt with buckle
  const sy = y + 8 + breathe * 0.2;
  rect(g, x - 7, sy, 14, 2, p.trim);
  rect(g, x - 1, sy - 0.5, 2, 3, p.hatTrim);
  // Sash tails
  poly(g, [x - 3, sy + 2, x - 5 + sway * 0.5, sy + 6, x - 2, sy + 5], p.trim);

  // Hem — scalloped trim
  for (let i = -4; i <= 4; i++) {
    const hx = x + i * 2;
    ellipse(g, hx, y + h, 1.5, 1, p.trim);
  }

  // Embroidery — small diamond/dot pattern along robe edge
  for (let i = 0; i < 3; i++) {
    const ey = y + 12 + i * 3;
    circle(g, x - 5, ey, 0.5, p.trim, 0.6);
    circle(g, x + 5, ey, 0.5, p.trim, 0.6);
  }

  // Elder mantle with rune glow
  if (p.elder) {
    // Shoulder mantle — curved, layered
    ellipse(g, x, y + 1, 10, 4, p.robeDark);
    ellipse(g, x, y + 0.5, 9, 3.5, p.robe);
    // Mantle trim edge
    g.stroke({ color: p.trim, width: 0.8 });
    g.moveTo(x - 9, y + 3).bezierCurveTo(x - 6, y + 5, x + 6, y + 5, x + 9, y + 3);
    // Glowing rune circles
    circle(g, x - 5, y + 2, 1, p.trim, 0.8);
    circle(g, x, y + 2.5, 1, p.trim, 0.8);
    circle(g, x + 5, y + 2, 1, p.trim, 0.8);
    // Connecting rune lines
    line(g, x - 4, y + 2, x - 1, y + 2.5, p.trim, 0.5);
    line(g, x + 1, y + 2.5, x + 4, y + 2, p.trim, 0.5);
  }
}

function drawSleeve(g: Graphics, x: number, y: number, angle: number, p: AdeptMagePalette): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const len = 8;
  const ex = x + ca * len;
  const ey = y + sa * len;

  // Billowy sleeve (tapered)
  g.stroke({ color: p.robe, width: 5 });
  g.moveTo(x, y).lineTo(ex, ey);
  g.stroke({ color: p.robeLight, width: 3 });
  g.moveTo(x, y).lineTo(ex, ey);
  // Cuff trim
  circle(g, ex, ey, 2.5, p.trim);
  // Hand
  circle(g, ex + ca * 2, ey + sa * 2, 2, COL_SKIN_HI);
  circle(g, ex + ca * 2.5, ey + sa * 2.5, 1.5, COL_NOSE);
}

function drawCastSleeve(g: Graphics, x: number, y: number, angle: number, glow: number, p: AdeptMagePalette): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const len = 10;
  const ex = x + ca * len;
  const ey = y + sa * len;

  // Extended sleeve
  g.stroke({ color: p.robe, width: 5 });
  g.moveTo(x, y).lineTo(ex, ey);
  g.stroke({ color: p.robeLight, width: 3 });
  g.moveTo(x, y).lineTo(ex, ey);
  circle(g, ex, ey, 2.5, p.trim);
  // Hand
  circle(g, ex + ca * 2, ey + sa * 2, 2, COL_SKIN_HI);
  // Spell glow in palm
  circle(g, ex + ca * 4, ey + sa * 4, 3 + glow * 3, p.robeLight, 0.3 + glow * 0.3);
  circle(g, ex + ca * 4, ey + sa * 4, 1.5 + glow * 1.5, p.trim, 0.4 + glow * 0.4);
}

function drawHead(g: Graphics, x: number, y: number, p: AdeptMagePalette, breathe: number): void {
  // Neck
  rect(g, x - 2, y + 3, 4, 3, p.skin);

  // Head (slightly oval)
  ellipse(g, x, y, 5, 5.5, p.skin);
  // Cheek highlight
  ellipse(g, x - 1, y + 1, 3, 3, COL_SKIN_HI, 0.4);

  // Brow ridge
  line(g, x - 4, y - 2, x + 1, y - 2.5, COL_SKIN_DK, 1);
  // Eye (side view — one visible)
  circle(g, x - 2.5, y - 1, 1.2, 0xffffff);
  circle(g, x - 2.5, y - 1, 0.7, p.eye);
  // Nose
  line(g, x - 4, y - 1, x - 5, y + 0.5, COL_NOSE, 1);
  circle(g, x - 5, y + 0.5, 0.7, COL_NOSE);
  // Mouth line
  line(g, x - 3.5, y + 1.5, x - 1, y + 1.5, COL_SKIN_DK, 0.5);
  // Ear (far side, peeking)
  ellipse(g, x + 4, y - 0.5, 1.5, 2, COL_SKIN_DK);
  ellipse(g, x + 4, y - 0.5, 1, 1.5, p.skin);

  // Beard — flowing, layered
  const beardLen = p.elder ? 12 : 7;
  const bw = breathe * 0.4;
  // Base beard shape
  poly(g, [
    x - 4, y + 2, x + 1, y + 2,
    x + 0.5 + bw, y + 2 + beardLen * 0.7,
    x - 1 + bw * 0.5, y + 2 + beardLen,
    x - 4 + bw * 0.3, y + 2 + beardLen * 0.8,
  ], p.beard);
  // Beard highlight strands
  line(g, x - 2, y + 3, x - 2.5 + bw * 0.3, y + 2 + beardLen * 0.8, 0xffffff, 0.6);
  line(g, x, y + 3, x - 0.5 + bw * 0.4, y + 2 + beardLen * 0.6, 0xffffff, 0.5);
  // Mustache
  line(g, x - 4, y + 1.5, x - 2, y + 3, p.beard, 1.5);
  line(g, x - 1, y + 1.5, x, y + 3, p.beard, 1);

  // Hat — curved pointed wizard hat
  const hatH = p.elder ? 16 : 12;

  // Brim — curved ellipse
  ellipse(g, x, y - 4.5, 7.5, 2.5, p.hat);
  ellipse(g, x, y - 4, 7, 2, p.hat);
  // Brim trim
  g.stroke({ color: p.hatTrim, width: 1 });
  g.moveTo(x - 7, y - 4).bezierCurveTo(x - 4, y - 2.5, x + 4, y - 2.5, x + 7, y - 4);

  // Hat cone — slightly curved, not straight
  poly(g, [x - 5, y - 5, x + 1, y - 5 - hatH, x + 5, y - 5], p.hat);
  // Hat cone light side
  poly(g, [x + 1, y - 5 - hatH, x + 5, y - 5, x + 2, y - 5], p.robeLight, 0.3);
  // Hat band
  ellipse(g, x, y - 6.5, 5.5, 1.5, p.hatTrim);
  // Tip gem
  circle(g, x + 1, y - 5 - hatH, 2, p.trim);
  circle(g, x + 1, y - 5 - hatH, 1.2, p.robeLight, 0.8);

  // Elder hat extras
  if (p.elder) {
    // Stars along hat
    circle(g, x + 2, y - 10, 0.8, p.trim);
    circle(g, x - 1, y - 14, 0.8, p.trim);
    circle(g, x + 3, y - 17, 0.6, p.trim);
    // Hat crescent moon
    ellipse(g, x + 2, y - 12, 1.5, 2, p.hatTrim, 0.6);
  }
}

function drawStaff(g: Graphics, x: number, y: number, glow: number, p: AdeptMagePalette): void {
  const h = 30;

  // Shaft — gnarled look with knots
  line(g, x + 1, y, x + 1, y + h, COL_STAFF, 2.5);
  line(g, x + 1.5, y, x + 1.5, y + h, COL_STAFF_HI, 1);
  // Knots
  circle(g, x + 1, y + 8, 1.5, COL_STAFF_DK);
  circle(g, x + 1, y + 8, 1, COL_STAFF);
  circle(g, x + 1, y + 18, 1.2, COL_STAFF_DK);
  // Tip (bottom)
  circle(g, x + 1, y + h, 1.5, COL_STAFF_DK);

  // Crystal mount — ornate prongs
  const cy = y - 1;
  line(g, x - 1, cy + 2, x - 2, cy - 2, p.trim, 1.2);
  line(g, x + 3, cy + 2, x + 4, cy - 2, p.trim, 1.2);
  line(g, x + 1, cy + 1, x + 1, cy - 3, p.trim, 1);

  // Crystal
  const cr = p.elder ? 4 : 3;
  circle(g, x + 1, cy - 3, cr, p.robeLight, 0.6 + glow * 0.4);
  circle(g, x + 1, cy - 3, cr * 0.6, p.trim, 0.5 + glow * 0.3);
  // Sparkle
  if (glow > 0.3) {
    circle(g, x, cy - 4, 0.8, 0xffffff, glow * 0.6);
  }
  // Glow halo
  if (glow > 0.1) {
    circle(g, x + 1, cy - 3, cr + 3, p.trim, glow * 0.2);
  }
}

function drawSandals(g: Graphics, x: number, y: number): void {
  ellipse(g, x - 3, y + 1, 2.5, 1.5, COL_SANDAL);
  ellipse(g, x + 3, y + 1, 2.5, 1.5, COL_SANDAL);
  // Straps
  line(g, x - 4, y, x - 2, y + 1, COL_SANDAL_DK, 0.6);
  line(g, x + 2, y, x + 4, y + 1, COL_SANDAL_DK, 0.6);
}

// ---------------------------------------------------------------------------
// Animation frames
// ---------------------------------------------------------------------------

function drawIdle(g: Graphics, frame: number, p: AdeptMagePalette): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.8;
  const pulse = Math.sin(t * Math.PI * 2 + 1) * 0.5 + 0.5;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  drawSandals(g, CX, GY - 3);

  // Staff (behind body)
  drawStaff(g, CX + 8, 12 + breathe, pulse, p);

  drawRobe(g, CX, 20 + breathe, p, breathe, 0);

  // Sleeves / arms
  drawSleeve(g, CX + 6, 23 + breathe, Math.PI * 0.35, p); // staff-holding arm
  drawSleeve(g, CX - 6, 23 + breathe, Math.PI * 0.55, p); // resting arm

  drawHead(g, CX, 14 + breathe, p, breathe);
}

function drawMove(g: Graphics, frame: number, p: AdeptMagePalette): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.8;

  ellipse(g, CX, GY, 10, 3.5, COL_SHADOW, 0.3);

  // Sandals alternating
  const step = Math.sin(t * Math.PI * 2) * 2;
  ellipse(g, CX - 3 - step * 0.3, GY - 2, 2.5, 1.5, COL_SANDAL);
  ellipse(g, CX + 3 + step * 0.3, GY - 2, 2.5, 1.5, COL_SANDAL);

  drawStaff(g, CX + 8 + sway, 12 + bob, 0.3, p);

  drawRobe(g, CX + sway, 20 + bob, p, bob, sway);

  // Arms swaying
  drawSleeve(g, CX + 6 + sway, 23 + bob, Math.PI * 0.35 + sway * 0.05, p);
  drawSleeve(g, CX - 6 + sway, 23 + bob, Math.PI * 0.55 - sway * 0.05, p);

  drawHead(g, CX + sway, 14 + bob, p, bob);
}

function drawCast(g: Graphics, frame: number, p: AdeptMagePalette): void {
  const t = frame / 5;
  const raise = Math.sin(t * Math.PI) * 1.5;
  const glow = Math.sin(t * Math.PI) * 0.8 + 0.2;

  ellipse(g, CX, GY, 10 + raise * 0.5, 3.5, COL_SHADOW, 0.3);

  drawSandals(g, CX, GY - 3);

  // Staff raised (behind)
  drawStaff(g, CX + 8, 8 - raise * 2, glow, p);

  drawRobe(g, CX, 20 - raise * 0.5, p, 0, 0);

  // Staff arm (right) — raised
  drawSleeve(g, CX + 6, 21 - raise, Math.PI * 0.2 - raise * 0.1, p);

  // Cast arm (left) — extended forward with spell glow
  drawCastSleeve(g, CX - 6, 21 - raise, -Math.PI * 0.15, glow, p);

  // Elder extra particles
  if (p.elder && glow > 0.5) {
    const sp = glow - 0.5;
    circle(g, CX - 16, 17 - raise * 2, 2 * sp, p.trim, sp * 0.7);
    circle(g, CX - 12, 13 - raise * 3, 1.5 * sp, p.robeLight, sp * 0.6);
    circle(g, CX - 18, 20 - raise, 1 * sp, p.trim, sp * 0.4);
  }

  drawHead(g, CX, 14 - raise * 0.5, p, 0);
}

function drawDie(g: Graphics, frame: number, p: AdeptMagePalette): void {
  const t = frame / 6;
  const fall = t * 7;
  const drop = t * 14;
  const fade = 1 - t;

  ellipse(g, CX, GY, 10 * fade, 3.5 * fade, COL_SHADOW, 0.3 * fade);

  // Staff falls
  if (t < 0.8) {
    const sa = t * 1.8;
    const sx = CX + 10 + fall * 0.5;
    const sy = 12 + drop * 0.4;
    line(g, sx, sy, sx + Math.sin(sa) * 16, sy + Math.cos(sa) * 16, COL_STAFF, 2.5);
    circle(g, sx, sy, 2.5 * fade, p.robeLight, 0.5 * fade);
  }

  // Robe collapsing
  if (t < 0.85) {
    const rx = CX + fall;
    const ry = 20 + drop;
    poly(g, [
      rx - 5, ry, rx + 5, ry,
      rx + 8 - t * 4, ry + 18 - t * 8,
      rx - 8 + t * 4, ry + 18 - t * 8,
    ], p.robe);
    // Trim still visible
    rect(g, rx - 6, ry + 7, 12, 1.5, p.trim, fade);
  }

  // Head falling
  if (t < 0.7) {
    drawHead(g, CX + fall * 1.2, 14 + drop * 0.7, p, 0);
  }
}

// ---------------------------------------------------------------------------
// State routing
// ---------------------------------------------------------------------------

type DrawFn = (g: Graphics, frame: number, p: AdeptMagePalette) => void;

const STATE_DRAW: Record<UnitState, { draw: DrawFn; count: number }> = {
  [UnitState.IDLE]:   { draw: drawIdle, count: 8 },
  [UnitState.MOVE]:   { draw: drawMove, count: 8 },
  [UnitState.ATTACK]: { draw: drawCast, count: 7 },
  [UnitState.CAST]:   { draw: drawCast, count: 6 },
  [UnitState.DIE]:    { draw: drawDie,  count: 7 },
};

// ---------------------------------------------------------------------------
// Generator (flat array: 5 rows × 8 cols)
// ---------------------------------------------------------------------------

function generateAdeptMageFrames(renderer: Renderer, palette: AdeptMagePalette): RenderTexture[] {
  const frames: RenderTexture[] = [];
  const states = Object.values(UnitState);

  for (let row = 0; row < states.length; row++) {
    const state = states[row];
    const { draw, count } = STATE_DRAW[state];

    for (let col = 0; col < 8; col++) {
      const g = new Graphics();
      draw(g, col % count, palette);
      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);
      g.destroy();
    }
  }

  return frames;
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export function generateFireAdeptMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_FIRE_ADEPT_MAGE);
}
export function generateColdAdeptMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_COLD_ADEPT_MAGE);
}
export function generateLightningAdeptMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_LIGHTNING_ADEPT_MAGE);
}
export function generateDistortionAdeptMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_DISTORTION_ADEPT_MAGE);
}
export function generateFireMasterMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_FIRE_MASTER_MAGE);
}
export function generateColdMasterMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_COLD_MASTER_MAGE);
}
export function generateLightningMasterMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_LIGHTNING_MASTER_MAGE);
}
export function generateDistortionMasterMageFrames(renderer: Renderer): RenderTexture[] {
  return generateAdeptMageFrames(renderer, PALETTE_DISTORTION_MASTER_MAGE);
}
