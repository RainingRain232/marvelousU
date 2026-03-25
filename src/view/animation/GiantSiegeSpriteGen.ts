// Procedural sprite generator for the Giant Siege unit.
//
// 96x144 pixel frames (2w x 3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A colossal boulder-throwing giant — the biggest, most brutish of the giants.
// Massive hunched humanoid with rough stone-like gray-brown skin, iron bands
// wrapped around arms/torso, animal hide loincloth, heavy brow, small glowing
// eyes, tusks, thick stubby legs with iron ankle bands, rubble/debris at feet.
// Holding a massive boulder in both hands (attack = hurling it).
// States: IDLE 8, MOVE 8, ATTACK 6, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;  // 2 tiles wide
const FH = 144; // 3 tiles tall
const CX = FW / 2;
const GY = FH - 6;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const COL_SKIN       = 0x8a7a68; // gray-brown stone-like skin
const COL_SKIN_DK    = 0x6a5a48; // skin shadow
const COL_SKIN_HI    = 0xa89a82; // skin highlight
const COL_SKIN_CRACK = 0x5a4a38; // cracks in skin (rocky texture)
const COL_SKIN_MOSS  = 0x5a6a3a; // moss/lichen patches
const COL_SKIN_MOSS2 = 0x4a5a2e; // darker moss
const COL_SKIN_FACET = 0x9a8a76; // stone facet edge highlights
const COL_SCAR       = 0x7a6858; // old scar tissue

const COL_IRON       = 0x666666; // iron bands / fittings
const COL_IRON_DK    = 0x444444; // iron shadow
const COL_IRON_HI    = 0x888888; // iron highlight
const COL_IRON_RIVET = 0x999999; // rivet / stud
const COL_IRON_RUST  = 0x8a5533; // rust spots
const COL_CHAIN      = 0x777777; // chain link color
const COL_CHAIN_DK   = 0x555555; // chain shadow
const COL_PADDING    = 0x554433; // leather padding under iron

const COL_HIDE       = 0x6b5030; // animal hide loincloth
const COL_HIDE_DK    = 0x4a3520; // hide shadow
const COL_HIDE_HI    = 0x8a6a42; // hide highlight
const COL_HIDE_FUR   = 0x7a6040; // individual fur tufts
const COL_BONE_DECO  = 0xd8ccb0; // bone/tooth decorations
const COL_BONE_DK    = 0xb0a490; // bone shadow
const COL_STITCH     = 0x3a2a1a; // stitching thread

const COL_EYE        = 0xff6622; // small glowing eyes
const COL_EYE_GLOW   = 0xff9944; // eye glow halo
const COL_EYE_DIM    = 0x662200; // dimming eye (death)
const COL_WARPAINT   = 0x882222; // war paint marks
const COL_TEETH      = 0xc8bca0; // teeth inside mouth
const COL_NOSTRIL    = 0x4a3a28; // nostril dark
const COL_STEAM      = 0xcccccc; // breath steam

const COL_TUSK       = 0xe8dcc0; // tusks
const COL_TUSK_DK    = 0xc8b8a0; // tusk shadow
const COL_TUSK_GRAIN = 0xd8ccb0; // ivory grain lines
const COL_TUSK_CHIP  = 0xb0a488; // chipped edge
const COL_TUSK_BLOOD = 0x882222; // blood stain at base

const COL_BOULDER    = 0x7a7a72; // boulder main
const COL_BOULDER_DK = 0x5a5a52; // boulder shadow
const COL_BOULDER_HI = 0x9a9a90; // boulder highlight
const COL_BOULDER_CR = 0x4a4a42; // boulder cracks
const COL_CRYSTAL    = 0x8899aa; // crystal inclusions
const COL_CRYSTAL_HI = 0xaabbcc; // crystal shine
const COL_FOSSIL     = 0x9a9080; // embedded fossils/bones
const COL_STRATUM    = 0x6a6a5a; // geological strata lines

const COL_RUBBLE     = 0x6a6a62; // rubble at feet
const COL_RUBBLE_DK  = 0x4a4a44; // rubble shadow

const COL_VEIN       = 0x6a5548; // veins on arms
const COL_KNUCKLE    = 0x5a4a38; // knuckle scars
const COL_TOENAIL    = 0x9a8a78; // toenails
const COL_KNEE_PLATE = 0x5a5a5a; // knee armor

const COL_SHADOW     = 0x000000;
const COL_DUST       = 0x8a8070; // dust/debris color
const COL_SHOCKWAVE  = 0xaa9980; // shockwave ring

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha });
}
function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.circle(x, y, r).fill({ color, alpha });
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.rect(x, y, w, h).fill({ color, alpha });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: w });
}
function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.poly(pts).fill({ color, alpha });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function drawGroundShadow(g: Graphics, cx: number, gy: number, rx = 34, ry = 9, alpha = 0.3): void {
  ellipse(g, cx, gy + 2, rx, ry, COL_SHADOW, alpha);
}

function drawRubble(g: Graphics, cx: number, gy: number): void {
  // Scattered rubble/debris at feet
  const stones = [
    [-28, -2, 4, 3], [-20, 0, 3, 2], [-14, 1, 5, 3],
    [14, -1, 4, 3], [22, 0, 3, 2], [28, 1, 4, 2],
    [-8, 2, 3, 2], [6, 1, 4, 3], [0, 3, 3, 2],
  ];
  for (const [dx, dy, rx, ry] of stones) {
    ellipse(g, cx + dx, gy + dy, rx, ry, COL_RUBBLE);
    ellipse(g, cx + dx - 0.5, gy + dy - 0.5, rx * 0.6, ry * 0.5, COL_RUBBLE_DK, 0.3);
  }
}

function drawSkinCracks(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Branching crack patterns across a region
  // Main cracks
  line(g, x - w * 0.4, y - h * 0.3, x - w * 0.1, y + h * 0.1, COL_SKIN_CRACK, 1.2);
  // Branch off main crack
  line(g, x - w * 0.25, y - h * 0.1, x - w * 0.35, y + h * 0.15, COL_SKIN_CRACK, 0.7);
  line(g, x - w * 0.25, y - h * 0.1, x - w * 0.1, y - h * 0.25, COL_SKIN_CRACK, 0.6);

  line(g, x + w * 0.2, y - h * 0.35, x + w * 0.35, y + h * 0.05, COL_SKIN_CRACK, 1.1);
  // Branches
  line(g, x + w * 0.28, y - h * 0.15, x + w * 0.4, y - h * 0.1, COL_SKIN_CRACK, 0.6);
  line(g, x + w * 0.28, y - h * 0.15, x + w * 0.2, y + h * 0.05, COL_SKIN_CRACK, 0.5);

  // Secondary cracks
  line(g, x - w * 0.15, y + h * 0.2, x + w * 0.05, y + h * 0.35, COL_SKIN_CRACK, 0.8);
  line(g, x + w * 0.1, y + h * 0.15, x + w * 0.3, y + h * 0.3, COL_SKIN_CRACK, 0.7);
}

function drawMossPatches(g: Graphics, x: number, y: number, scale = 1): void {
  // Moss/lichen patches in crevices
  ellipse(g, x - 4 * scale, y + 2 * scale, 3 * scale, 1.5 * scale, COL_SKIN_MOSS, 0.5);
  ellipse(g, x + 3 * scale, y - 1 * scale, 2 * scale, 1.2 * scale, COL_SKIN_MOSS2, 0.4);
  circle(g, x - 2 * scale, y + 3 * scale, 1.5 * scale, COL_SKIN_MOSS, 0.35);
  // Tiny lichen dots
  circle(g, x + 5 * scale, y + 1 * scale, 0.8 * scale, COL_SKIN_MOSS, 0.3);
  circle(g, x - 6 * scale, y - 1 * scale, 0.6 * scale, COL_SKIN_MOSS2, 0.25);
}

function drawFacetEdges(g: Graphics, x: number, y: number, w: number, h: number): void {
  // Stone-like faceting with highlight edges
  line(g, x - w * 0.3, y - h * 0.2, x + w * 0.1, y - h * 0.35, COL_SKIN_FACET, 0.5);
  line(g, x + w * 0.1, y - h * 0.35, x + w * 0.35, y - h * 0.1, COL_SKIN_FACET, 0.4);
  line(g, x - w * 0.35, y + h * 0.1, x - w * 0.15, y + h * 0.25, COL_SKIN_FACET, 0.3);
}

function drawHead(g: Graphics, x: number, y: number, tilt = 0, breathePhase = 0): void {
  const hx = x + tilt;

  // Massive, heavy-browed head — wider than tall, very brutish
  // Skull
  ellipse(g, hx, y, 16, 14, COL_SKIN);

  // Stone faceting on skull
  drawFacetEdges(g, hx, y, 16, 14);

  // Rocky skin texture — branching cracks across skull
  line(g, hx - 8, y - 6, hx - 3, y - 2, COL_SKIN_CRACK, 1);
  line(g, hx - 5, y - 4, hx - 7, y - 1, COL_SKIN_CRACK, 0.6); // branch
  line(g, hx + 5, y - 8, hx + 9, y - 3, COL_SKIN_CRACK, 1);
  line(g, hx + 7, y - 5, hx + 10, y - 6, COL_SKIN_CRACK, 0.5); // branch
  line(g, hx - 10, y + 2, hx - 5, y + 6, COL_SKIN_CRACK, 0.8);
  line(g, hx - 7, y + 4, hx - 9, y + 7, COL_SKIN_CRACK, 0.5); // branch

  // Scars on face
  line(g, hx + 10, y - 2, hx + 12, y + 5, COL_SCAR, 0.8);
  line(g, hx - 12, y + 1, hx - 10, y + 6, COL_SCAR, 0.6);

  // Moss patch on skull
  ellipse(g, hx - 9, y - 5, 2.5, 1.5, COL_SKIN_MOSS, 0.4);
  circle(g, hx + 11, y - 3, 1.2, COL_SKIN_MOSS2, 0.3);

  // Highlight on dome
  ellipse(g, hx - 2, y - 6, 8, 5, COL_SKIN_HI, 0.2);

  // Heavy brow ridge — huge overhanging ridge
  poly(g, [
    hx - 16, y - 2,
    hx + 16, y - 2,
    hx + 14, y + 4,
    hx - 14, y + 4,
  ], COL_SKIN_DK);
  // Brow ridge highlight
  rect(g, hx - 14, y - 2, 28, 2, COL_SKIN_HI, 0.15);
  // Brow ridge crack
  line(g, hx - 12, y, hx - 6, y + 2, COL_SKIN_CRACK, 0.6);

  // War paint marks — tribal stripes under eyes and on brow
  line(g, hx - 12, y - 1, hx - 8, y + 3, COL_WARPAINT, 1.5);
  line(g, hx + 8, y + 3, hx + 12, y - 1, COL_WARPAINT, 1.5);
  // Forehead war paint dashes
  rect(g, hx - 3, y - 10, 6, 1.5, COL_WARPAINT, 0.6);
  rect(g, hx - 5, y - 8, 2, 1, COL_WARPAINT, 0.4);
  rect(g, hx + 3, y - 8, 2, 1, COL_WARPAINT, 0.4);

  // Deep brow shadow over eyes
  ellipse(g, hx - 6, y + 1, 4, 2.5, COL_SHADOW, 0.25);
  ellipse(g, hx + 6, y + 1, 4, 2.5, COL_SHADOW, 0.25);

  // Small glowing eyes deep-set under brow
  circle(g, hx - 6, y + 1, 2.5, COL_EYE);
  circle(g, hx + 6, y + 1, 2.5, COL_EYE);
  // Pupil dot
  circle(g, hx - 6, y + 1, 1, COL_SHADOW, 0.5);
  circle(g, hx + 6, y + 1, 1, COL_SHADOW, 0.5);
  // Eye glow halo
  circle(g, hx - 6, y + 1, 4, COL_EYE_GLOW, 0.25);
  circle(g, hx + 6, y + 1, 4, COL_EYE_GLOW, 0.25);

  // Flat nose — wide brutish nose with detailed nostrils
  poly(g, [
    hx - 3, y + 2,
    hx + 3, y + 2,
    hx + 4, y + 8,
    hx - 4, y + 8,
  ], COL_SKIN_DK);
  // Nostrils
  circle(g, hx - 2, y + 7, 1.5, COL_NOSTRIL);
  circle(g, hx + 2, y + 7, 1.5, COL_NOSTRIL);
  // Nose bridge highlight
  line(g, hx, y + 2, hx, y + 6, COL_SKIN_HI, 0.6);

  // Breath steam from nostrils (subtle, phased)
  const steamAlpha = 0.08 + Math.sin(breathePhase * Math.PI * 2) * 0.05;
  circle(g, hx - 3, y + 9, 2, COL_STEAM, steamAlpha);
  circle(g, hx + 3, y + 9, 2, COL_STEAM, steamAlpha);
  circle(g, hx - 4, y + 11, 1.5, COL_STEAM, steamAlpha * 0.6);
  circle(g, hx + 4, y + 11, 1.5, COL_STEAM, steamAlpha * 0.6);

  // Wide mouth / jaw
  rect(g, hx - 10, y + 9, 20, 4, COL_SKIN_DK);
  // Teeth detail inside mouth
  rect(g, hx - 8, y + 9, 16, 2, COL_SHADOW, 0.4);
  for (let i = -7; i <= 7; i += 3) {
    rect(g, hx + i, y + 9, 2, 1.5, COL_TEETH, 0.6);
  }

  // Tusks — battle-worn with chips and ivory grain
  // Left tusk
  poly(g, [
    hx - 9, y + 9,
    hx - 7, y + 1,
    hx - 5, y + 9,
  ], COL_TUSK);
  // Ivory grain lines on left tusk
  line(g, hx - 8, y + 3, hx - 7.5, y + 8, COL_TUSK_GRAIN, 0.5);
  line(g, hx - 7, y + 4, hx - 6.5, y + 8, COL_TUSK_GRAIN, 0.4);
  // Chip on left tusk tip
  circle(g, hx - 7, y + 1.5, 1, COL_TUSK_CHIP, 0.6);
  // Shadow edge
  line(g, hx - 8, y + 3, hx - 7, y + 8, COL_TUSK_DK, 0.8);
  // Blood stain at base
  circle(g, hx - 7, y + 8, 1.5, COL_TUSK_BLOOD, 0.4);
  ellipse(g, hx - 8, y + 9, 2, 1, COL_TUSK_BLOOD, 0.3);

  // Right tusk
  poly(g, [
    hx + 5, y + 9,
    hx + 7, y + 2,
    hx + 9, y + 9,
  ], COL_TUSK);
  // Ivory grain lines on right tusk
  line(g, hx + 7, y + 4, hx + 7.5, y + 8, COL_TUSK_GRAIN, 0.5);
  line(g, hx + 6.5, y + 5, hx + 6.8, y + 8, COL_TUSK_GRAIN, 0.4);
  // Chip on right tusk — larger battle damage
  poly(g, [hx + 7, y + 2, hx + 8, y + 3, hx + 7.5, y + 4], COL_TUSK_CHIP, 0.5);
  line(g, hx + 8, y + 3, hx + 7, y + 8, COL_TUSK_DK, 0.8);
  // Blood stain at base
  circle(g, hx + 7, y + 8, 1.5, COL_TUSK_BLOOD, 0.4);
  ellipse(g, hx + 8, y + 9, 2, 1, COL_TUSK_BLOOD, 0.3);

  // Chin / lower jaw
  ellipse(g, hx, y + 14, 10, 4, COL_SKIN);
  ellipse(g, hx, y + 14, 8, 3, COL_SKIN_DK, 0.2);
  // Chin crack
  line(g, hx - 2, y + 13, hx + 1, y + 16, COL_SKIN_CRACK, 0.5);
}

function drawChainLinks(g: Graphics, x: number, y: number, count: number, horizontal: boolean): void {
  // Individual chain link details along iron bands
  for (let i = 0; i < count; i++) {
    const lx = horizontal ? x + i * 4 : x;
    const ly = horizontal ? y : y + i * 4;
    ellipse(g, lx, ly, 1.5, 1, COL_CHAIN, 0.6);
    ellipse(g, lx, ly, 1, 0.6, COL_CHAIN_DK, 0.3);
  }
}

function drawIronBandDetailed(g: Graphics, x: number, y: number, w: number, hasBuckle: boolean, damage = 0): void {
  // Padding visible at edges
  rect(g, x - 1, y - 1, w + 2, 6, COL_PADDING, 0.4);
  // Main iron band
  rect(g, x, y, w, 4, COL_IRON);
  rect(g, x, y, w, 1.5, COL_IRON_HI, 0.2);
  // Dents / battle damage
  if (damage > 0) {
    circle(g, x + w * 0.3, y + 2, 1.5, COL_IRON_DK, 0.4);
  }
  if (damage > 1) {
    circle(g, x + w * 0.7, y + 1.5, 1, COL_IRON_DK, 0.3);
  }
  // Rust spots
  circle(g, x + w * 0.2, y + 3, 1, COL_IRON_RUST, 0.3);
  circle(g, x + w * 0.8, y + 1, 0.8, COL_IRON_RUST, 0.25);
  // Buckle detail
  if (hasBuckle) {
    rect(g, x + w * 0.45, y - 1, 5, 6, COL_IRON_HI, 0.5);
    rect(g, x + w * 0.46, y, 3, 4, COL_IRON_DK, 0.4);
    circle(g, x + w * 0.48, y + 2, 0.8, COL_IRON_RIVET);
  }
}

function drawTorso(g: Graphics, cx: number, topY: number, h: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  const w = 44; // Very wide, stocky

  // Main torso — massive barrel chest, hunched
  g.roundRect(x - w / 2, topY, w, h + breathe * 0.5, 6).fill({ color: COL_SKIN });
  // Skin highlight
  ellipse(g, x - 4, topY + h * 0.3, w * 0.2, h * 0.2, COL_SKIN_HI, 0.2);

  // Stone faceting highlights
  drawFacetEdges(g, x, topY + h * 0.3, w, h);

  // Rocky skin crack texture — branching patterns
  drawSkinCracks(g, x, topY + h * 0.4, w * 0.8, h * 0.6);

  // Moss patches in crevices
  drawMossPatches(g, x - 12, topY + h * 0.6, 0.8);
  ellipse(g, x + 14, topY + h * 0.3, 2, 1.2, COL_SKIN_MOSS, 0.35);

  // Scars on torso
  line(g, x - 10, topY + h * 0.2, x - 6, topY + h * 0.4, COL_SCAR, 0.7);
  line(g, x + 8, topY + h * 0.55, x + 14, topY + h * 0.65, COL_SCAR, 0.6);

  // Iron bands wrapped around torso — with detail
  const bandY1 = topY + 8;
  const bandY2 = topY + h * 0.45;
  const bandY3 = topY + h * 0.75;
  drawIronBandDetailed(g, x - w / 2 + 2, bandY1, w - 4, true, 1);
  drawIronBandDetailed(g, x - w / 2 + 2, bandY2, w - 4, false, 2);
  drawIronBandDetailed(g, x - w / 2 + 2, bandY3, w - 4, true, 1);

  // Chain links between bands
  drawChainLinks(g, x - 16, bandY1 + 5, 3, false);
  drawChainLinks(g, x + 16, bandY1 + 5, 3, false);

  // Rivets on iron bands
  circle(g, x - 16, bandY1 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x + 16, bandY1 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x - 16, bandY2 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x + 16, bandY2 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x - 10, bandY3 + 2, 1.5, COL_IRON_RIVET);
  circle(g, x + 10, bandY3 + 2, 1.5, COL_IRON_RIVET);

  // Vertical iron strap (cross-brace)
  rect(g, x - 2, topY + 4, 4, h - 8, COL_IRON_DK);
  rect(g, x - 1, topY + 4, 2, h - 8, COL_IRON_HI, 0.15);
  // Rivets along vertical strap
  circle(g, x, topY + 14, 1, COL_IRON_RIVET, 0.7);
  circle(g, x, topY + h * 0.55, 1, COL_IRON_RIVET, 0.7);
}

function drawHideLoincloth(g: Graphics, cx: number, waistY: number, breathe: number, tilt = 0): void {
  const x = cx + tilt;
  // Ragged animal hide hanging from waist
  poly(g, [
    x - 20, waistY,
    x + 20, waistY,
    x + 24, waistY + 20 + breathe * 0.3,
    x + 16, waistY + 26 + breathe * 0.4,
    x + 4, waistY + 22 + breathe * 0.3,
    x - 6, waistY + 28 + breathe * 0.5,
    x - 16, waistY + 24 + breathe * 0.3,
    x - 24, waistY + 18 + breathe * 0.2,
  ], COL_HIDE);
  // Hide texture / shading
  poly(g, [
    x - 18, waistY + 2,
    x + 18, waistY + 2,
    x + 14, waistY + 10,
    x - 14, waistY + 10,
  ], COL_HIDE_DK, 0.3);

  // Individual fur tufts along top edge and surface
  for (let i = -18; i <= 18; i += 3) {
    const tuftH = 2 + Math.abs(i % 5) * 0.5;
    line(g, x + i, waistY - 1, x + i - 0.5, waistY + tuftH, COL_HIDE_FUR, 0.9);
    line(g, x + i + 1, waistY, x + i + 0.5, waistY + tuftH - 0.5, COL_HIDE_DK, 0.5);
  }
  // Fur tufts on body of loincloth
  for (let i = -12; i <= 12; i += 5) {
    line(g, x + i, waistY + 10, x + i - 1, waistY + 14, COL_HIDE_FUR, 0.4);
    line(g, x + i + 2, waistY + 12, x + i + 1, waistY + 16, COL_HIDE_FUR, 0.3);
  }

  // Stitching detail
  for (let i = -14; i <= 14; i += 4) {
    line(g, x + i, waistY + 8, x + i + 2, waistY + 10, COL_STITCH, 0.6);
  }

  // Bone/tooth decorations hanging from belt
  const decos = [-16, -8, 0, 8, 16];
  for (const dx of decos) {
    const decoY = waistY + 18 + breathe * 0.3 + Math.abs(dx) * 0.15;
    // Tooth/bone shape
    poly(g, [
      x + dx - 1, decoY,
      x + dx + 1, decoY,
      x + dx, decoY + 4,
    ], COL_BONE_DECO, 0.7);
    line(g, x + dx, decoY, x + dx, decoY + 3.5, COL_BONE_DK, 0.4);
  }

  // Ragged edge highlight
  line(g, x - 22, waistY + 18, x - 14, waistY + 24, COL_HIDE_HI, 0.8);
  line(g, x + 14, waistY + 22, x + 22, waistY + 18, COL_HIDE_HI, 0.8);
}

function drawArm(
  g: Graphics,
  sx: number, sy: number,
  ex: number, ey: number,
): void {
  // Very thick brutish arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 14 });
  // Muscle definition — highlight on top
  g.moveTo(sx + 1, sy - 2).lineTo(ex + 1, ey - 2).stroke({ color: COL_SKIN_HI, width: 3, alpha: 0.2 });
  // Shadow underneath
  g.moveTo(sx + 1, sy + 3).lineTo(ex + 1, ey + 3).stroke({ color: COL_SKIN_DK, width: 3, alpha: 0.4 });

  // Veins along arm
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  line(g, sx + 3, sy + 2, mx + 2, my, COL_VEIN, 0.6);
  line(g, mx + 2, my, mx + 4, my + 3, COL_VEIN, 0.5);
  line(g, mx - 3, my - 1, ex - 2, ey - 3, COL_VEIN, 0.5);

  // Rocky texture cracks on arm — branching
  line(g, mx - 3, my - 2, mx + 2, my + 3, COL_SKIN_CRACK, 0.8);
  line(g, mx, my, mx + 3, my - 2, COL_SKIN_CRACK, 0.5);
  // Scar
  line(g, sx + 4, sy + 1, sx + 6, sy + 5, COL_SCAR, 0.5);

  // Iron band on upper arm with chain detail
  const ubx = sx + (ex - sx) * 0.25;
  const uby = sy + (ey - sy) * 0.25;
  circle(g, ubx, uby, 8, COL_IRON);
  circle(g, ubx, uby, 6, COL_IRON_HI, 0.2);
  circle(g, ubx, uby, 2, COL_IRON_RIVET, 0.6);
  // Dent
  circle(g, ubx + 3, uby - 2, 1.5, COL_IRON_DK, 0.3);
  // Chain links dangling
  circle(g, ubx - 5, uby + 4, 1, COL_CHAIN, 0.4);
  circle(g, ubx - 5, uby + 6, 1, COL_CHAIN, 0.3);

  // Iron band on wrist
  const wbx = sx + (ex - sx) * 0.8;
  const wby = sy + (ey - sy) * 0.8;
  circle(g, wbx, wby, 8, COL_IRON);
  circle(g, wbx, wby, 6, COL_IRON_HI, 0.2);
  // Rust on wrist band
  circle(g, wbx + 2, wby + 1, 1, COL_IRON_RUST, 0.3);

  // Fist — more detailed with finger segments
  circle(g, ex, ey, 8, COL_SKIN);
  circle(g, ex - 1, ey - 1, 6, COL_SKIN_HI, 0.2);
  // Knuckle ridges with scars
  circle(g, ex - 4, ey - 3, 2.5, COL_SKIN_DK, 0.5);
  circle(g, ex - 1, ey - 4, 2.5, COL_SKIN_DK, 0.5);
  circle(g, ex + 2, ey - 3, 2.5, COL_SKIN_DK, 0.5);
  // Knuckle scars
  line(g, ex - 4, ey - 4, ex - 3, ey - 2, COL_KNUCKLE, 0.5);
  line(g, ex + 1, ey - 5, ex + 2, ey - 2, COL_KNUCKLE, 0.4);
  // Finger segments on fist (curled fingers)
  line(g, ex - 5, ey, ex - 4, ey + 3, COL_SKIN_DK, 0.5);
  line(g, ex - 2, ey + 1, ex - 1, ey + 4, COL_SKIN_DK, 0.4);
  line(g, ex + 1, ey, ex + 2, ey + 3, COL_SKIN_DK, 0.4);
  // Thumb
  ellipse(g, ex + 5, ey + 1, 2.5, 2, COL_SKIN, 0.8);
  line(g, ex + 4, ey, ex + 6, ey + 2, COL_SKIN_DK, 0.4);
}

function drawBoulder(g: Graphics, x: number, y: number, size = 16): void {
  // Massive rough boulder with geological detail
  ellipse(g, x, y, size, size * 0.85, COL_BOULDER);

  // Stratified layers — geological strata
  for (let i = -2; i <= 2; i++) {
    const ly = y + i * size * 0.2;
    line(g, x - size * 0.7, ly, x + size * 0.6, ly + 1, COL_STRATUM, 0.6);
  }

  // Highlight on top
  ellipse(g, x - size * 0.2, y - size * 0.25, size * 0.5, size * 0.35, COL_BOULDER_HI, 0.3);
  // Shadow on bottom
  ellipse(g, x + size * 0.1, y + size * 0.2, size * 0.6, size * 0.3, COL_BOULDER_DK, 0.3);

  // Cracks on surface — deeper and more varied
  line(g, x - size * 0.5, y - size * 0.1, x + size * 0.1, y + size * 0.3, COL_BOULDER_CR, 1.5);
  line(g, x - size * 0.3, y + size * 0.05, x - size * 0.5, y + size * 0.25, COL_BOULDER_CR, 0.8); // branch
  line(g, x - size * 0.2, y - size * 0.4, x + size * 0.3, y + size * 0.1, COL_BOULDER_CR, 1);
  line(g, x + size * 0.05, y - size * 0.15, x - size * 0.1, y + size * 0.05, COL_BOULDER_CR, 0.7); // branch
  line(g, x + size * 0.1, y - size * 0.2, x + size * 0.4, y + size * 0.2, COL_BOULDER_CR, 0.8);

  // Crystal inclusions — small glinting crystals
  poly(g, [
    x - size * 0.25, y - size * 0.15,
    x - size * 0.2, y - size * 0.25,
    x - size * 0.15, y - size * 0.15,
    x - size * 0.2, y - size * 0.1,
  ], COL_CRYSTAL, 0.5);
  circle(g, x - size * 0.2, y - size * 0.17, 0.8, COL_CRYSTAL_HI, 0.6);

  poly(g, [
    x + size * 0.3, y + size * 0.05,
    x + size * 0.35, y - size * 0.02,
    x + size * 0.38, y + size * 0.08,
  ], COL_CRYSTAL, 0.4);
  circle(g, x + size * 0.33, y + size * 0.03, 0.6, COL_CRYSTAL_HI, 0.5);

  // Embedded fossil / bone fragment
  ellipse(g, x + size * 0.05, y + size * 0.15, 2.5, 1.5, COL_FOSSIL, 0.5);
  line(g, x + size * 0.02, y + size * 0.14, x + size * 0.08, y + size * 0.16, COL_FOSSIL, 0.6);
  // Tiny bone shape
  circle(g, x - size * 0.1, y + size * 0.3, 1, COL_FOSSIL, 0.4);
  line(g, x - size * 0.12, y + size * 0.28, x - size * 0.08, y + size * 0.32, COL_FOSSIL, 0.5);

  // Small rock chips / texture
  circle(g, x - size * 0.3, y + size * 0.1, 2, COL_BOULDER_DK, 0.4);
  circle(g, x + size * 0.25, y - size * 0.15, 1.5, COL_BOULDER_DK, 0.3);
  // Moss on boulder
  ellipse(g, x - size * 0.35, y - size * 0.05, 1.5, 1, COL_SKIN_MOSS, 0.3);
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  const lw = 14; // Very thick stubby legs

  // Left leg — thick, stubby with muscle groups
  g.roundRect(cx - 16 + stanceL, legTop, lw, legH, 4).fill({ color: COL_SKIN });
  // Inner shadow (muscle separation)
  g.roundRect(cx - 15 + stanceL, legTop + 2, lw - 4, legH - 4, 3).fill({ color: COL_SKIN_DK, alpha: 0.25 });
  // Outer highlight (quad muscle)
  ellipse(g, cx - 12 + stanceL, legTop + legH * 0.3, 3, legH * 0.2, COL_SKIN_HI, 0.15);
  // Calf muscle bulge
  ellipse(g, cx - 10 + stanceL, legTop + legH * 0.65, 4, 3, COL_SKIN_HI, 0.12);
  // Rocky texture
  line(g, cx - 12 + stanceL, legTop + legH * 0.3, cx - 8 + stanceL, legTop + legH * 0.5, COL_SKIN_CRACK, 0.8);
  line(g, cx - 10 + stanceL, legTop + legH * 0.45, cx - 13 + stanceL, legTop + legH * 0.55, COL_SKIN_CRACK, 0.5);

  // Knee armor plate — left
  const kneeYL = legTop + legH * 0.35;
  rect(g, cx - 17 + stanceL, kneeYL, lw + 3, 5, COL_KNEE_PLATE, 0.7);
  rect(g, cx - 16 + stanceL, kneeYL, lw + 1, 2, COL_IRON_HI, 0.2);
  circle(g, cx - 9 + stanceL, kneeYL + 2.5, 1, COL_IRON_RIVET, 0.5);

  // Iron ankle band
  rect(g, cx - 17 + stanceL, legTop + legH - 8, lw + 2, 5, COL_IRON);
  rect(g, cx - 16 + stanceL, legTop + legH - 8, lw, 2, COL_IRON_HI, 0.2);
  circle(g, cx - 9 + stanceL, legTop + legH - 6, 1.5, COL_IRON_RIVET, 0.6);
  // Rust on ankle
  circle(g, cx - 12 + stanceL, legTop + legH - 5, 0.8, COL_IRON_RUST, 0.3);

  // Right leg
  g.roundRect(cx + 2 + stanceR, legTop, lw, legH, 4).fill({ color: COL_SKIN });
  g.roundRect(cx + 3 + stanceR, legTop + 2, lw - 4, legH - 4, 3).fill({ color: COL_SKIN_DK, alpha: 0.25 });
  ellipse(g, cx + 6 + stanceR, legTop + legH * 0.3, 3, legH * 0.2, COL_SKIN_HI, 0.15);
  ellipse(g, cx + 8 + stanceR, legTop + legH * 0.65, 4, 3, COL_SKIN_HI, 0.12);
  line(g, cx + 6 + stanceR, legTop + legH * 0.3, cx + 10 + stanceR, legTop + legH * 0.5, COL_SKIN_CRACK, 0.8);
  line(g, cx + 8 + stanceR, legTop + legH * 0.45, cx + 5 + stanceR, legTop + legH * 0.55, COL_SKIN_CRACK, 0.5);

  // Knee armor plate — right
  const kneeYR = legTop + legH * 0.35;
  rect(g, cx + 1 + stanceR, kneeYR, lw + 3, 5, COL_KNEE_PLATE, 0.7);
  rect(g, cx + 2 + stanceR, kneeYR, lw + 1, 2, COL_IRON_HI, 0.2);
  circle(g, cx + 9 + stanceR, kneeYR + 2.5, 1, COL_IRON_RIVET, 0.5);

  // Iron ankle band — right
  rect(g, cx + 1 + stanceR, legTop + legH - 8, lw + 2, 5, COL_IRON);
  rect(g, cx + 2 + stanceR, legTop + legH - 8, lw, 2, COL_IRON_HI, 0.2);
  circle(g, cx + 9 + stanceR, legTop + legH - 6, 1.5, COL_IRON_RIVET, 0.6);
  circle(g, cx + 6 + stanceR, legTop + legH - 5, 0.8, COL_IRON_RUST, 0.3);
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Heavy bare feet with thick toes and toenails
  // Left foot
  ellipse(g, cx - 10 + stanceL, gy - 3, 10, 5, COL_SKIN);
  ellipse(g, cx - 10 + stanceL, gy - 3, 8, 3, COL_SKIN_DK, 0.2);
  // Toes with toenails
  circle(g, cx - 16 + stanceL, gy - 1, 2.5, COL_SKIN);
  circle(g, cx - 16 + stanceL, gy - 2.5, 1, COL_TOENAIL, 0.6);
  circle(g, cx - 12 + stanceL, gy, 2.5, COL_SKIN);
  circle(g, cx - 12 + stanceL, gy - 1.5, 1, COL_TOENAIL, 0.6);
  circle(g, cx - 8 + stanceL, gy, 2, COL_SKIN);
  circle(g, cx - 8 + stanceL, gy - 1, 0.8, COL_TOENAIL, 0.5);

  // Right foot
  ellipse(g, cx + 10 + stanceR, gy - 3, 10, 5, COL_SKIN);
  ellipse(g, cx + 10 + stanceR, gy - 3, 8, 3, COL_SKIN_DK, 0.2);
  circle(g, cx + 8 + stanceR, gy, 2, COL_SKIN);
  circle(g, cx + 8 + stanceR, gy - 1, 0.8, COL_TOENAIL, 0.5);
  circle(g, cx + 12 + stanceR, gy, 2.5, COL_SKIN);
  circle(g, cx + 12 + stanceR, gy - 1.5, 1, COL_TOENAIL, 0.6);
  circle(g, cx + 16 + stanceR, gy - 1, 2.5, COL_SKIN);
  circle(g, cx + 16 + stanceR, gy - 2.5, 1, COL_TOENAIL, 0.6);
}

function drawFootprintCrater(g: Graphics, x: number, y: number, intensity: number): void {
  // Ground crater from heavy footstep
  ellipse(g, x, y, 8 * intensity, 3 * intensity, COL_SHADOW, 0.15 * intensity);
  ellipse(g, x, y, 6 * intensity, 2 * intensity, COL_RUBBLE_DK, 0.1 * intensity);
  // Displaced earth chips
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI + 0.3;
    const dist = 6 + i * 2;
    circle(g, x + Math.cos(angle) * dist * intensity, y - 2 - i * intensity, 1.5, COL_RUBBLE, 0.2 * intensity);
  }
}

function drawGroundCrater(g: Graphics, cx: number, gy: number, intensity: number): void {
  // Impact crater from boulder or stomp
  ellipse(g, cx, gy, 14 * intensity, 5 * intensity, COL_SHADOW, 0.2 * intensity);
  ellipse(g, cx, gy - 1, 10 * intensity, 3 * intensity, COL_RUBBLE_DK, 0.15 * intensity);
  // Crater rim
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rx = 12 * intensity;
    const ry = 4 * intensity;
    circle(g, cx + Math.cos(angle) * rx, gy + Math.sin(angle) * ry, 1.5, COL_RUBBLE, 0.2 * intensity);
  }
}

function drawShockwaveRings(g: Graphics, cx: number, gy: number, t: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const ringT = t - i * 0.15;
    if (ringT > 0 && ringT < 1) {
      const radius = 10 + ringT * 30;
      const alpha = (1 - ringT) * 0.15;
      g.ellipse(cx, gy, radius, radius * 0.3).stroke({ color: COL_SHOCKWAVE, width: 1.5, alpha });
    }
  }
}

function drawFlyingDebris(g: Graphics, cx: number, gy: number, t: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + t * 2;
    const dist = t * (15 + i * 6);
    const dx = cx + Math.cos(angle) * dist;
    const dy = gy - 4 - t * 12 + Math.sin(angle) * dist * 0.3;
    const fragSize = 2 - t * 1.2;
    if (fragSize > 0.3) {
      circle(g, dx, dy, fragSize, COL_RUBBLE, (1 - t) * 0.5);
    }
  }
}

function drawDustCloud(g: Graphics, cx: number, gy: number, t: number, scale = 1): void {
  const alpha = (1 - t) * 0.25;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI;
    const dist = t * 18 * scale;
    const dx = cx + Math.cos(angle) * dist - dist * 0.3;
    const dy = gy - 2 - t * 8 * scale;
    const r = (3 + t * 6) * scale;
    circle(g, dx, dy, r, COL_DUST, alpha * 0.6);
    circle(g, dx + 2, dy - 1, r * 0.7, COL_DUST, alpha * 0.4);
  }
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 2;

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 + breathe;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  drawGroundShadow(g, CX, GY);
  drawRubble(g, CX, GY);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawHideLoincloth(g, CX, waistY, breathe);
  drawTorso(g, CX, torsoTop, torsoH, breathe);

  // Both arms forward, holding boulder
  const boulderY = shoulderY + 18 + breathe * 0.5;
  const boulderX = CX;
  drawArm(g, CX - 22, shoulderY + 6, CX - 14, boulderY);
  drawArm(g, CX + 22, shoulderY + 6, CX + 14, boulderY);
  drawBoulder(g, boulderX, boulderY - 2, 14 + breathe * 0.3);

  drawHead(g, CX, headY, 0, t);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 4;

  const legH = 20;
  const torsoH = 44;
  const stanceL = Math.round(walk * 5);
  const stanceR = Math.round(-walk * 5);
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4 - Math.round(bob * 0.3);
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  // Heavier shadow on impact frames
  if (Math.abs(walk) > 0.8) {
    drawGroundShadow(g, CX, GY, 38, 11, 0.35);
  } else {
    drawGroundShadow(g, CX, GY, 34 + Math.abs(walk) * 4, 9);
  }

  drawRubble(g, CX, GY);

  // Footprint craters from heavy steps
  if (Math.abs(walk) > 0.7) {
    const stepFoot = walk > 0 ? stanceL : stanceR;
    const stepX = walk > 0 ? CX - 10 + stepFoot : CX + 10 + stepFoot;
    drawFootprintCrater(g, stepX, GY, Math.abs(walk) - 0.5);
  }

  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawHideLoincloth(g, CX, waistY, bob * 0.3, walk * 0.4);
  drawTorso(g, CX, torsoTop, torsoH, bob * 0.3, walk * 0.5);

  // Arms hold boulder while walking — sway with gait
  const armSwing = walk * 3;
  const boulderY = shoulderY + 18;
  drawArm(g, CX - 22 + walk * 0.4, shoulderY + 6, CX - 14 - armSwing, boulderY);
  drawArm(g, CX + 22 + walk * 0.4, shoulderY + 6, CX + 14 + armSwing, boulderY);
  drawBoulder(g, CX, boulderY - 2, 14);

  drawHead(g, CX, headY, walk * 0.4, t);

  // Heavier ground impact effects — dust, shaking, debris
  if (Math.abs(walk) > 0.85) {
    const dustX = walk > 0 ? CX - 14 + stanceL : CX + 14 + stanceR;
    // Large dust puffs
    const impactT = (Math.abs(walk) - 0.85) / 0.15;
    for (let i = 0; i < 5; i++) {
      const dx = dustX + (i - 2) * 7;
      const dy = GY - 2 - i * 2.5;
      circle(g, dx, dy, 3.5 - i * 0.5, COL_DUST, 0.15 * (1 - impactT * 0.5));
    }
    // Tree-shaking dust (particles falling from above)
    for (let i = 0; i < 3; i++) {
      const px = CX + (i - 1) * 20;
      const py = GY - 40 - i * 15 + impactT * 8;
      circle(g, px, py, 1, COL_DUST, 0.1);
    }
    // Small shockwave ring at feet
    drawShockwaveRings(g, dustX, GY, impactT, 1);
  }
}

function generateAttackFrames(g: Graphics, frame: number): void {
  // 6 frames: wind up -> lift boulder overhead -> hurl forward
  const t = frame / 5; // 0..1 over 6 frames (0..5)

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;
  const torsoTop = legTop - torsoH + 4;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  let lean = 0;
  let boulderX = CX;
  let boulderY = shoulderY + 18;
  let boulderSize = 14;
  let showBoulder = true;
  let armLX: number, armLY: number, armRX: number, armRY: number;

  if (t < 0.3) {
    // Wind-up: lean back, lift boulder overhead
    const p = t / 0.3;
    lean = -p * 5;
    boulderX = CX + lean * 0.5;
    boulderY = shoulderY + 18 - p * 40;
    armLX = CX - 14 + lean * 0.3 - p * 4;
    armLY = boulderY + 4;
    armRX = CX + 14 + lean * 0.3 + p * 4;
    armRY = boulderY + 4;
  } else if (t < 0.5) {
    // Hold overhead — peak of windup
    const p = (t - 0.3) / 0.2;
    lean = -5 + p * 2;
    boulderX = CX + lean * 0.5;
    boulderY = shoulderY - 22 - p * 4;
    armLX = CX - 18 + lean * 0.3;
    armLY = boulderY + 4;
    armRX = CX + 18 + lean * 0.3;
    armRY = boulderY + 4;
  } else if (t < 0.7) {
    // Hurl forward — fast swing
    const p = (t - 0.5) / 0.2;
    lean = -3 + p * 12;
    boulderX = CX + 10 + p * 30;
    boulderY = shoulderY - 26 + p * 20;
    boulderSize = 14 - p * 4; // boulder shrinks as it flies away
    armLX = CX - 10 + lean * 0.5 + p * 12;
    armLY = shoulderY + 4 + p * 6;
    armRX = CX + 10 + lean * 0.5 + p * 12;
    armRY = shoulderY + 4 + p * 6;
    if (p > 0.5) {
      showBoulder = true; // still visible flying away
    }
  } else {
    // Recovery — boulder is gone, flying off-screen
    const p = (t - 0.7) / 0.3;
    lean = 9 - p * 9;
    showBoulder = false; // boulder has left
    armLX = CX - 10 + lean * 0.3 - p * 4;
    armLY = shoulderY + 10 - p * 6;
    armRX = CX + 10 + lean * 0.3 + p * 4;
    armRY = shoulderY + 10 - p * 6;
  }

  drawGroundShadow(g, CX + lean * 0.4, GY, 34 + Math.abs(lean), 9);
  drawRubble(g, CX, GY);

  // Ground crater on impact (during and after hurl)
  if (t >= 0.5) {
    const craterT = Math.min((t - 0.5) / 0.2, 1);
    drawGroundCrater(g, CX + lean * 0.3, GY, craterT);
  }

  drawFeet(g, CX, GY, -2, lean > 4 ? 4 : 0);
  drawLegs(g, CX, legTop, legH, -2, lean > 4 ? 4 : 0);
  drawHideLoincloth(g, CX, waistY, 0, lean * 0.2);
  drawTorso(g, CX, torsoTop, torsoH, 0, lean * 0.3);

  // Arms
  drawArm(g, CX - 22 + lean * 0.3, shoulderY + 6, armLX, armLY);
  drawArm(g, CX + 22 + lean * 0.3, shoulderY + 6, armRX, armRY);

  // Boulder with trailing fragments
  if (showBoulder) {
    drawBoulder(g, boulderX, boulderY, boulderSize);
    // Trailing fragments behind boulder during throw
    if (t >= 0.5 && t <= 0.7) {
      const fragT = (t - 0.5) / 0.2;
      for (let i = 0; i < 6; i++) {
        const fragX = boulderX - 6 - i * 5 - fragT * 10;
        const fragY = boulderY + (i - 3) * 4 + fragT * i * 2;
        const fragSize = 2.5 - i * 0.3;
        if (fragSize > 0.5) {
          circle(g, fragX, fragY, fragSize, COL_BOULDER, (1 - fragT) * 0.5);
          // Tiny dust trails behind each fragment
          circle(g, fragX - 2, fragY + 1, fragSize * 0.5, COL_DUST, (1 - fragT) * 0.2);
        }
      }
    }
  }

  drawHead(g, CX, headY, lean * 0.2, t);

  // Shockwave rings on hurl release
  if (t >= 0.5 && t <= 0.8) {
    const shockT = (t - 0.5) / 0.3;
    drawShockwaveRings(g, CX + lean * 0.3, GY, shockT, 3);
  }

  // Flying dust/debris during hurl
  if (t >= 0.45 && t <= 0.75) {
    const debrisT = (t - 0.45) / 0.3;
    drawFlyingDebris(g, CX + lean * 0.3, GY, debrisT, 8);
  }

  // Dust cloud at stomp point
  if (t >= 0.5 && t <= 0.85) {
    const dustT = (t - 0.5) / 0.35;
    drawDustCloud(g, CX + lean * 0.3, GY, dustT, 0.8);
  }

  // Ground shake on hurl release
  if (t >= 0.45 && t <= 0.65) {
    const shakeT = 1 - Math.abs(t - 0.55) / 0.1;
    for (let i = 0; i < 5; i++) {
      const sx = CX + lean * 0.4 + (i - 2) * 10;
      circle(g, sx, GY - 1, 3, COL_SHADOW, shakeT * 0.12);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // Same as attack animation
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  // 7 frames: stagger -> crumbling collapse (stone-like)
  const t = frame / 6; // 0..1 over 7 frames (0..6)

  const legH = 20;
  const torsoH = 44;
  const legTop = GY - 8 - legH;

  const fallX = t * 14;
  const dropY = t * t * 20;
  const tilt = t * 6;

  const torsoTop = legTop - torsoH + 4 + dropY;
  const shoulderY = torsoTop + 8;
  const headY = torsoTop - 12;
  const waistY = torsoTop + torsoH - 4;

  // Shadow shrinks and moves as giant falls
  drawGroundShadow(g, CX + fallX * 0.4, GY, 34 + t * 8, 9, 0.3 * (1 - t * 0.4));

  // Rubble spreads as giant crumbles
  drawRubble(g, CX, GY);

  // Feet spread and buckle
  drawFeet(g, CX + fallX * 0.15, GY, t * 4, -t * 3);

  // Legs buckle and collapse
  if (t < 0.7) {
    const squash = Math.round(t * 5);
    drawLegs(g, CX + fallX * 0.15, legTop + dropY * 0.5, legH - squash, t * 4, -t * 3);
  }

  // Loincloth flutters
  if (t < 0.85) {
    drawHideLoincloth(g, CX + fallX * 0.3, waistY, 0, tilt);
  }

  // Torso crashes forward
  drawTorso(g, CX + fallX * 0.4, torsoTop, torsoH * (1 - t * 0.1), 0, tilt);

  // Iron bands snapping off — flying away as giant crumbles
  if (t > 0.3 && t < 0.8) {
    const snapT = (t - 0.3) / 0.5;
    // Band 1 snaps off
    const band1X = CX + fallX * 0.4 + snapT * 20;
    const band1Y = torsoTop + 8 - snapT * 15;
    rect(g, band1X, band1Y, 10, 3, COL_IRON, (1 - snapT) * 0.7);
    // Band 2 snaps off in opposite direction
    const band2X = CX + fallX * 0.4 - snapT * 16;
    const band2Y = torsoTop + torsoH * 0.45 + snapT * 10;
    rect(g, band2X, band2Y, 8, 3, COL_IRON, (1 - snapT) * 0.6);
    // Rivet fragments
    for (let i = 0; i < 3; i++) {
      const rx = band1X + snapT * (5 + i * 8);
      const ry = band1Y - snapT * (3 + i * 5);
      circle(g, rx, ry, 1, COL_IRON_RIVET, (1 - snapT) * 0.5);
    }
  }

  // Arms flop
  if (t < 0.75) {
    drawArm(g, CX - 22 + fallX * 0.3, shoulderY + 6, CX - 24 + fallX * 0.6, torsoTop + torsoH - 4 + t * 10);
    drawArm(g, CX + 22 + fallX * 0.3, shoulderY + 6, CX + 26 + fallX * 0.8, torsoTop + torsoH + t * 6);
  }

  // Boulder drops and rolls away
  if (t < 0.5) {
    const boulderRollX = CX + 10 + t * 24;
    const boulderRollY = shoulderY + 18 + t * 20;
    drawBoulder(g, boulderRollX, boulderRollY, 14 * (1 - t * 0.3));
  }

  // Head with dimming eyes
  if (t < 0.6) {
    drawHead(g, CX + fallX * 0.5, headY + dropY * 0.4, tilt * 1.2, 0);
    // Eyes dimming as life fades
    const dimAlpha = 1 - t * 1.2;
    if (dimAlpha > 0) {
      circle(g, CX + fallX * 0.5 - 6 + tilt * 1.2, headY + dropY * 0.4 + 1, 3, COL_EYE_DIM, dimAlpha * 0.5);
      circle(g, CX + fallX * 0.5 + 6 + tilt * 1.2, headY + dropY * 0.4 + 1, 3, COL_EYE_DIM, dimAlpha * 0.5);
    }
  } else if (t < 0.85) {
    // Head tilts further as giant crumbles
    const rollT = (t - 0.6) / 0.25;
    const hx = CX + fallX * 0.5 + rollT * 12;
    const hy = headY + dropY * 0.4 + rollT * 18;
    drawHead(g, hx, hy, tilt * 1.2 + rollT * 6, 0);
    // Eyes fully dim
    circle(g, hx - 6 + (tilt * 1.2 + rollT * 6), hy + 1, 3, COL_EYE_DIM, 0.3 * (1 - rollT));
    circle(g, hx + 6 + (tilt * 1.2 + rollT * 6), hy + 1, 3, COL_EYE_DIM, 0.3 * (1 - rollT));
  }

  // Skin crumbling in chunks — larger stone fragments breaking off body
  if (t > 0.3) {
    const crumbleT = (t - 0.3) / 0.7;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + t * 2;
      const dist = crumbleT * (14 + i * 5);
      const cx2 = CX + fallX * 0.4 + Math.cos(angle) * dist;
      const cy = torsoTop + torsoH * 0.5 + Math.sin(angle) * dist * 0.6 + crumbleT * 12;
      const fragSize = 4 - i * 0.3;
      if (fragSize > 0.5) {
        // Chunky stone fragments instead of smooth circles
        const fAlpha = (1 - crumbleT) * 0.6;
        poly(g, [
          cx2 - fragSize, cy - fragSize * 0.5,
          cx2 + fragSize * 0.5, cy - fragSize,
          cx2 + fragSize, cy + fragSize * 0.3,
          cx2 - fragSize * 0.3, cy + fragSize,
        ], COL_SKIN, fAlpha);
        // Crack on fragment
        line(g, cx2 - fragSize * 0.3, cy, cx2 + fragSize * 0.3, cy + fragSize * 0.2, COL_SKIN_CRACK, fAlpha * 0.5);
      }
    }
  }

  // Dust mushroom cloud on final impact
  if (t > 0.6) {
    const dustT = (t - 0.6) / 0.4;
    const dustAlpha = (1 - dustT) * 0.25;

    // Mushroom cloud stem
    const stemX = CX + fallX * 0.4;
    const stemBase = GY - 2;
    const stemTop = stemBase - dustT * 30;
    rect(g, stemX - 4, stemTop, 8, stemBase - stemTop, COL_DUST, dustAlpha * 0.5);

    // Mushroom cloud cap
    ellipse(g, stemX, stemTop, 12 + dustT * 15, 6 + dustT * 6, COL_DUST, dustAlpha * 0.6);
    ellipse(g, stemX - 3, stemTop - 2, 8 + dustT * 10, 4 + dustT * 4, COL_DUST, dustAlpha * 0.4);

    // Expanding base cloud
    for (let i = 0; i < 8; i++) {
      const dx = stemX + (i - 3.5) * (6 + dustT * 4);
      const dy = GY - 3 - dustT * 5;
      circle(g, dx, dy, 5 + dustT * 6, COL_SHADOW, dustAlpha * 0.5);
    }

    // Rising dust particles
    for (let i = 0; i < 6; i++) {
      const px = stemX + (i - 3) * 8;
      const py = stemTop - 3 + i * 2 - dustT * 5;
      circle(g, px, py, 2, COL_DUST, dustAlpha * 0.3);
    }
  }

  // Scattered stone chips at impact point
  if (t > 0.5) {
    const chipT = (t - 0.5) / 0.5;
    for (let i = 0; i < 8; i++) {
      const chipX = CX + fallX * 0.4 + (i - 4) * 8;
      const chipY = GY - 2 - chipT * 5 * (i % 3 + 1);
      const chipSize = 3 - chipT * 1.5;
      if (chipSize > 0.5) {
        ellipse(g, chipX, chipY, chipSize, chipSize * 0.6, COL_RUBBLE, (1 - chipT) * 0.5);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: FrameGen; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,   count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,    count: 7 },
};

export function generateGiantSiegeFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);
      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
