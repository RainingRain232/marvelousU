// Procedural sprite generator for the Siege Hunter unit type.
//
// Draws a detailed side-view siege hunter on horseback at 96×96 pixels
// per frame using PixiJS Graphics → RenderTexture.  Produces textures
// for every animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   • Side-view dark warhorse with muscle definition, vein detail, fetlock feathering
//   • Articulated plate barding with rivets, chain mail at joints, heraldic dents
//   • Heavy soot-stained articulated plate armor with scratches and dents
//   • Sallet helm with breathing holes, riveted edge, plume, neck guard
//   • Flaming sword with fuller groove, beveled edge, layered fire, sparks, heat shimmer
//   • Off-hand torch with oil drips, smoke wisps, falling embers
//   • Demolition tool belt with visible tools (hammer, chisel, rope, flask)
//   • Detailed saddle with leather stitching, stirrup iron, blanket edge
//   • Shadow ellipse at hooves

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FW = 96;          // frame width  (px) – 2 tiles wide
const FH = 96;          // frame height (px) – 2 tiles high
const OY = 30;          // vertical offset to center art in frame
const GY = FH - 4;      // ground line Y

// Palette ─ soot-stained siege hunter
const COL_ARMOR      = 0x556070;
const COL_ARMOR_HI   = 0x728090;
const COL_ARMOR_DK   = 0x3a4450;
const COL_SOOT       = 0x333344;

const COL_HELM       = 0x5a6575;
const COL_HELM_HI    = 0x788898;
const COL_VISOR      = 0x111122;

const COL_BLADE      = 0xc0c8d0;
const COL_BLADE_HI   = 0xe0e8f0;
const COL_BLADE_DK   = 0x8890a0;
const COL_FULLER     = 0x99a0aa;
const COL_GUARD      = 0x886633;
const COL_GRIP       = 0x553322;

const COL_FIRE1      = 0xff6600;
const COL_FIRE2      = 0xffaa00;
const COL_FIRE3      = 0xffdd44;
const COL_FIRE4      = 0xffee88;
const COL_EMBER      = 0xff3300;
const COL_EMBER_DIM  = 0xcc2200;

const COL_TORCH_WOOD = 0x664422;
const COL_TORCH_WRAP = 0x443311;
const COL_TORCH_OIL  = 0x332211;
const COL_SMOKE      = 0x667788;

const COL_BELT       = 0x4a3828;
const COL_BELT_DK    = 0x3a2818;
const COL_BELT_BUCKLE = 0x8a7a5a;
const COL_TOOL_METAL = 0x6a7080;
const COL_ROPE       = 0x8a7a58;
const COL_FLASK      = 0x4a5a3a;

const COL_HORSE      = 0x3a3028;
const COL_HORSE_HI   = 0x5a4e40;
const COL_HORSE_DK   = 0x2a201a;
const COL_HORSE_BELLY = 0x4a3e32;
const COL_HORSE_MUSCLE = 0x4a4038;
const COL_HORSE_VEIN = 0x352a22;
const COL_MANE       = 0x1a1410;
const COL_HOOF       = 0x2a2218;
const COL_FETLOCK    = 0x3a3430;
const COL_NOSTRIL    = 0x1a1210;

const COL_BARDING    = 0x444e58;
const COL_BARDING_HI = 0x5e6a76;
const COL_BARDING_DK = 0x343e48;
const COL_RIVET      = 0x8890a0;
const COL_CHAIN      = 0x5a6270;

const COL_SADDLE     = 0x5a3318;
const COL_SADDLE_DK  = 0x3a2210;
const COL_STITCH     = 0x7a5a38;
const COL_STIRRUP    = 0x5a6070;
const COL_BLANKET    = 0x6a2828;
const COL_REINS      = 0x3a2a1a;

const COL_PLUME      = 0x880022;
const COL_PLUME_HI   = 0xaa1133;

const COL_SCRATCH    = 0x7a8898;
const COL_DENT       = 0x484e58;

const COL_SHADOW     = 0x000000;

const COL_SHIMMER    = 0xffcc66;

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.ellipse(x, y, rx, ry);
}

function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.circle(x, y, r);
}

function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.rect(x, y, w, h);
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.stroke({ color, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}

function poly(g: Graphics, pts: number[], color: number, alpha = 1): void {
  g.fill({ color, alpha });
  g.poly(pts);
  g.fill();
}

function dot(g: Graphics, x: number, y: number, color: number, alpha = 1): void {
  circle(g, x, y, 0.6, color, alpha);
}

// ---------------------------------------------------------------------------
// Fire / flame drawing (multi-layer)
// ---------------------------------------------------------------------------

function drawFlame(g: Graphics, fx: number, fy: number, size: number, seed: number): void {
  const s1 = Math.sin(seed * 3.7) * 1.5;
  const s2 = Math.cos(seed * 2.3) * 1.2;
  const s3 = Math.sin(seed * 5.1) * 1.0;
  const s4 = Math.cos(seed * 4.3) * 0.8;

  // Outermost glow
  ellipse(g, fx + s1 * 0.8, fy - size * 0.4, size * 1.0, size * 1.4, COL_EMBER, 0.25);
  // Outer flame
  ellipse(g, fx + s1, fy - size * 0.6, size * 0.7, size * 1.1, COL_FIRE1, 0.8);
  // Mid flame
  ellipse(g, fx + s2 * 0.5, fy - size * 0.7, size * 0.5, size * 0.8, COL_FIRE2, 0.85);
  // Inner flame
  ellipse(g, fx + s3 * 0.3, fy - size * 0.65, size * 0.35, size * 0.6, COL_FIRE3, 0.9);
  // Core white-hot
  ellipse(g, fx + s4 * 0.2, fy - size * 0.55, size * 0.15, size * 0.3, COL_FIRE4, 0.7);

  // Spark particles rising
  for (let i = 0; i < 3; i++) {
    const spkSeed = seed * (2.3 + i * 1.7);
    const spkX = fx + Math.sin(spkSeed) * size * 0.8;
    const spkY = fy - size * (1.2 + i * 0.4) - Math.abs(Math.sin(spkSeed * 0.7)) * 3;
    const spkA = Math.max(0, 0.7 - i * 0.2);
    circle(g, spkX, spkY, 0.6 - i * 0.1, i === 0 ? COL_FIRE3 : COL_EMBER, spkA);
  }
}

function drawBladeFire(g: Graphics, bx: number, by: number, tx: number, ty: number, seed: number): void {
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.2) / steps;
    const px = bx + (tx - bx) * t;
    const py = by + (ty - by) * t;
    const sz = 3.2 - t * 1.0;
    const off = Math.sin(seed * 4.1 + i * 1.8) * 1.5;
    const off2 = Math.cos(seed * 3.3 + i * 2.2) * 1.0;

    // Outer glow
    ellipse(g, px + off * 0.5, py - sz * 0.3 + off2 * 0.3, sz * 0.8, sz * 1.1, COL_FIRE1, 0.4);
    // Mid flame
    ellipse(g, px + off * 0.3, py - sz * 0.4 + off2 * 0.2, sz * 0.6, sz * 0.9, COL_FIRE1, 0.7);
    // Inner flame
    ellipse(g, px, py - sz * 0.5, sz * 0.35, sz * 0.6, COL_FIRE2, 0.8);
    // Core
    ellipse(g, px - off * 0.1, py - sz * 0.45, sz * 0.15, sz * 0.3, COL_FIRE3, 0.6);
  }

  // Tip flame
  circle(g, tx, ty, 2.0, COL_FIRE3, 0.7);
  circle(g, tx, ty - 1, 1.2, COL_FIRE4, 0.5);

  // Ember trail (sparks falling behind the blade)
  for (let i = 0; i < 4; i++) {
    const et = (i + 0.5) / 4;
    const ex = bx + (tx - bx) * et;
    const ey = by + (ty - by) * et;
    const eSeed = seed * 3.1 + i * 2.5;
    const drift = Math.sin(eSeed) * 3;
    const fall = Math.abs(Math.cos(eSeed * 0.6)) * 4;
    circle(g, ex + drift, ey + fall, 0.5, COL_EMBER, 0.5 - i * 0.1);
  }
}

// Heat shimmer effect (wavy distortion lines above fire)
function drawHeatShimmer(g: Graphics, x: number, y: number, width: number, seed: number): void {
  for (let i = 0; i < 3; i++) {
    const sy = y - 4 - i * 3;
    const wave = Math.sin(seed * 3.0 + i * 2.0);
    const sx = x - width * 0.5 + wave * 2;
    g.stroke({ color: COL_SHIMMER, width: 0.5 });
    g.moveTo(sx, sy).bezierCurveTo(
      sx + width * 0.3, sy - 1 + Math.sin(seed * 4 + i) * 1.5,
      sx + width * 0.6, sy + 1 + Math.cos(seed * 3.5 + i) * 1.5,
      sx + width, sy + wave * 0.5,
    );
  }
}

// ---------------------------------------------------------------------------
// Horse (dark warhorse, side-view facing left) — enhanced with muscles, veins, feathering
// ---------------------------------------------------------------------------

function drawHorse(g: Graphics, ox: number, oy: number, gait: number, tilt: number, nostrilFlare = 0): void {
  const bob = Math.sin(gait * Math.PI * 2) * 1.5;
  const by = oy + bob;

  // ── Legs with muscle, veins, fetlock feathering ──
  const legLen = 14;
  const legW = 3;
  const kneeOff = Math.sin(gait * Math.PI * 2) * 4;
  const kneeOff2 = Math.sin(gait * Math.PI * 2 + Math.PI) * 4;

  // Back legs
  const blx = ox + 10;
  // Far back leg
  rect(g, blx - 1, by + 6, legW, legLen + kneeOff2, COL_HORSE_DK);
  // Knee joint detail
  ellipse(g, blx, by + 6 + (legLen + kneeOff2) * 0.45, 2.2, 1.5, COL_HORSE_MUSCLE, 0.5);
  // Vein on leg
  g.stroke({ color: COL_HORSE_VEIN, width: 0.5 });
  g.moveTo(blx, by + 8).bezierCurveTo(blx - 0.5, by + 11, blx + 0.5, by + 14, blx, by + 6 + legLen + kneeOff2 - 2);
  // Fetlock feathering
  for (let f = 0; f < 3; f++) {
    const ffx = blx - 1.5 + f * 1.2;
    const ffy = by + 6 + legLen + kneeOff2 - 1;
    line(g, ffx, ffy, ffx - 0.5 + f * 0.3, ffy + 2.5, COL_FETLOCK, 1);
  }
  // Hoof
  rect(g, blx - 1, by + 6 + legLen + kneeOff2, legW + 1, 2, COL_HOOF);
  line(g, blx - 1, by + 6 + legLen + kneeOff2, blx + legW, by + 6 + legLen + kneeOff2, COL_HORSE_DK, 0.5);

  // Near back leg
  rect(g, blx + 3, by + 6, legW, legLen + kneeOff, COL_HORSE);
  ellipse(g, blx + 4.5, by + 6 + (legLen + kneeOff) * 0.45, 2.2, 1.5, COL_HORSE_MUSCLE, 0.5);
  g.stroke({ color: COL_HORSE_VEIN, width: 0.5 });
  g.moveTo(blx + 4.5, by + 8).bezierCurveTo(blx + 4, by + 11, blx + 5, by + 14, blx + 4.5, by + 6 + legLen + kneeOff - 2);
  for (let f = 0; f < 3; f++) {
    const ffx = blx + 2.5 + f * 1.2;
    const ffy = by + 6 + legLen + kneeOff - 1;
    line(g, ffx, ffy, ffx - 0.5 + f * 0.3, ffy + 2.5, COL_FETLOCK, 1);
  }
  rect(g, blx + 3, by + 6 + legLen + kneeOff, legW + 1, 2, COL_HOOF);
  line(g, blx + 3, by + 6 + legLen + kneeOff, blx + 3 + legW + 1, by + 6 + legLen + kneeOff, COL_HORSE_DK, 0.5);

  // Front legs
  const flx = ox - 14;
  // Far front leg
  rect(g, flx - 1, by + 5, legW, legLen + kneeOff, COL_HORSE_DK);
  ellipse(g, flx + 0.5, by + 5 + (legLen + kneeOff) * 0.45, 2, 1.4, COL_HORSE_MUSCLE, 0.5);
  g.stroke({ color: COL_HORSE_VEIN, width: 0.5 });
  g.moveTo(flx + 0.5, by + 7).bezierCurveTo(flx, by + 10, flx + 1, by + 13, flx + 0.5, by + 5 + legLen + kneeOff - 2);
  for (let f = 0; f < 3; f++) {
    const ffx = flx - 1.5 + f * 1.2;
    const ffy = by + 5 + legLen + kneeOff - 1;
    line(g, ffx, ffy, ffx - 0.5 + f * 0.3, ffy + 2.5, COL_FETLOCK, 1);
  }
  rect(g, flx - 1, by + 5 + legLen + kneeOff, legW + 1, 2, COL_HOOF);

  // Near front leg
  rect(g, flx + 3, by + 5, legW, legLen + kneeOff2, COL_HORSE);
  ellipse(g, flx + 4.5, by + 5 + (legLen + kneeOff2) * 0.45, 2, 1.4, COL_HORSE_MUSCLE, 0.5);
  g.stroke({ color: COL_HORSE_VEIN, width: 0.5 });
  g.moveTo(flx + 4.5, by + 7).bezierCurveTo(flx + 4, by + 10, flx + 5, by + 13, flx + 4.5, by + 5 + legLen + kneeOff2 - 2);
  for (let f = 0; f < 3; f++) {
    const ffx = flx + 2.5 + f * 1.2;
    const ffy = by + 5 + legLen + kneeOff2 - 1;
    line(g, ffx, ffy, ffx - 0.5 + f * 0.3, ffy + 2.5, COL_FETLOCK, 1);
  }
  rect(g, flx + 3, by + 5 + legLen + kneeOff2, legW + 1, 2, COL_HOOF);

  // ── Barrel (body) with muscle definition ──
  ellipse(g, ox, by, 20, 10, COL_HORSE);
  // Belly
  ellipse(g, ox, by + 3, 17, 6, COL_HORSE_BELLY);
  // Topline highlight
  ellipse(g, ox, by - 4, 16, 4, COL_HORSE_HI);
  // Chest muscle (forward bulge)
  ellipse(g, ox - 12, by - 1, 6, 7, COL_HORSE_MUSCLE, 0.5);
  // Shoulder muscle
  ellipse(g, ox - 8, by - 3, 5, 5, COL_HORSE_HI, 0.35);
  // Haunch muscle (rear bulge)
  ellipse(g, ox + 12, by - 2, 7, 6, COL_HORSE_MUSCLE, 0.45);
  // Haunch highlight
  ellipse(g, ox + 13, by - 4, 4, 3, COL_HORSE_HI, 0.3);

  // ── Barding — articulated plate segments with rivets, chain mail, dents ──
  // Main croup plate
  poly(g, [
    ox + 4, by - 9,
    ox + 18, by - 5,
    ox + 19, by + 3,
    ox + 15, by + 7,
    ox + 4, by + 5,
  ], COL_BARDING, 0.85);
  // Segment division lines
  line(g, ox + 8, by - 8, ox + 8, by + 5, COL_BARDING_DK, 1);
  line(g, ox + 12, by - 7, ox + 13, by + 6, COL_BARDING_DK, 1);
  // Highlight on top edge
  line(g, ox + 4, by - 9, ox + 18, by - 5, COL_BARDING_HI, 1.5);
  // Rivets along top edge
  for (let i = 0; i < 4; i++) {
    const rx = ox + 6 + i * 3.5;
    const ry = by - 8 + i * 0.8;
    circle(g, rx, ry, 0.7, COL_RIVET, 0.8);
    dot(g, rx - 0.2, ry - 0.2, COL_BARDING_HI, 0.6); // rivet highlight
  }
  // Rivets along bottom edge
  for (let i = 0; i < 3; i++) {
    const rx = ox + 6 + i * 4;
    const ry = by + 5 + i * 0.3;
    circle(g, rx, ry, 0.6, COL_RIVET, 0.7);
  }

  // Forward peytral plate (chest armor)
  poly(g, [
    ox - 6, by - 9,
    ox + 5, by - 9,
    ox + 5, by + 4,
    ox - 2, by + 7,
    ox - 10, by - 2,
  ], COL_BARDING, 0.82);
  line(g, ox - 6, by - 9, ox + 5, by - 9, COL_BARDING_HI, 1.5);
  line(g, ox, by - 8, ox, by + 5, COL_BARDING_DK, 0.8);
  // Rivets on peytral
  for (let i = 0; i < 3; i++) {
    circle(g, ox - 4 + i * 3, by - 8, 0.6, COL_RIVET, 0.7);
  }

  // Chain mail visible at joint between plates
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const cx = ox + 3 + j * 1.2;
      const cy = by - 4 + i * 2.5;
      circle(g, cx, cy, 0.4, COL_CHAIN, 0.5);
    }
  }

  // Heraldic dents on barding
  ellipse(g, ox + 10, by - 2, 2, 1.5, COL_BARDING_DK, 0.5);
  line(g, ox + 9, by - 2, ox + 11, by - 1, COL_SCRATCH, 0.3);
  ellipse(g, ox - 3, by + 1, 1.5, 1, COL_BARDING_DK, 0.4);

  // Soot streaks on barding (varied)
  rect(g, ox + 2, by - 4, 3, 6, COL_SOOT, 0.25);
  rect(g, ox + 8, by - 2, 2, 5, COL_SOOT, 0.2);
  // Diagonal soot streak
  line(g, ox + 14, by - 4, ox + 16, by + 2, COL_SOOT, 1.5);
  // Splash soot pattern
  circle(g, ox + 6, by + 2, 1.5, COL_SOOT, 0.3);
  circle(g, ox + 7, by + 3, 1, COL_SOOT, 0.25);

  // ── Tail ──
  const tailSway = Math.sin(gait * Math.PI * 2 + 1) * 3;
  const tx = ox + 20;
  const ty = by - 2;
  g.stroke({ color: COL_MANE, width: 3 });
  g.moveTo(tx, ty).bezierCurveTo(tx + 6, ty + tailSway, tx + 10, ty + 6 + tailSway, tx + 8, ty + 12);
  g.stroke({ color: COL_MANE, width: 2 });
  g.moveTo(tx, ty + 1).bezierCurveTo(tx + 4, ty + tailSway + 2, tx + 8, ty + 8 + tailSway, tx + 6, ty + 14);
  // Individual tail strands
  g.stroke({ color: COL_HORSE_DK, width: 1 });
  g.moveTo(tx + 1, ty).bezierCurveTo(tx + 7, ty + tailSway - 1, tx + 11, ty + 5 + tailSway, tx + 9, ty + 11);
  g.moveTo(tx - 1, ty + 1).bezierCurveTo(tx + 3, ty + tailSway + 3, tx + 7, ty + 9 + tailSway, tx + 5, ty + 15);

  // ── Neck ──
  const nx = ox - 18;
  const ny = by - 6 + tilt * 2;
  poly(g, [
    ox - 14, by - 8,
    nx, ny - 10,
    nx + 6, ny - 12,
    ox - 8, by - 10,
  ], COL_HORSE);
  // Neck muscle highlight
  line(g, nx + 2, ny - 11, ox - 10, by - 9, COL_HORSE_HI, 2);
  // Neck underside shadow
  line(g, nx + 1, ny - 8, ox - 12, by - 6, COL_HORSE_DK, 1.5);
  // Neck vein
  g.stroke({ color: COL_HORSE_VEIN, width: 0.5 });
  g.moveTo(nx + 3, ny - 9).bezierCurveTo(nx + 6, ny - 8, ox - 14, by - 7, ox - 12, by - 6);

  // ── Head ──
  const hx = nx - 4;
  const hy = ny - 12 + tilt * 2;
  // Main head shape
  ellipse(g, hx, hy, 8, 5, COL_HORSE);
  // Jaw/muzzle
  ellipse(g, hx - 6, hy + 2, 4, 3, COL_HORSE_HI);
  // Jaw line
  line(g, hx - 3, hy + 3, hx - 8, hy + 3, COL_HORSE_DK, 0.8);
  // Cheek muscle
  ellipse(g, hx - 1, hy + 1, 3, 2.5, COL_HORSE_MUSCLE, 0.35);
  // Nostril with flare
  const nostrilSize = 1 + nostrilFlare * 0.5;
  ellipse(g, hx - 8, hy + 2, nostrilSize, nostrilSize * 0.8, COL_NOSTRIL);
  // Nostril rim highlight
  g.stroke({ color: COL_HORSE_DK, width: 0.5 });
  g.moveTo(hx - 9 - nostrilFlare * 0.3, hy + 1.5).bezierCurveTo(
    hx - 9 - nostrilFlare * 0.5, hy + 2.5,
    hx - 8, hy + 3,
    hx - 7, hy + 2.5,
  );
  // Eye
  circle(g, hx - 2, hy - 2, 1.5, 0x111111);
  circle(g, hx - 2.5, hy - 2.5, 0.5, 0xffffff);
  // Ear
  poly(g, [hx + 2, hy - 5, hx + 1, hy - 9, hx + 4, hy - 6], COL_HORSE_DK);
  // Inner ear
  poly(g, [hx + 2.5, hy - 5.5, hx + 1.5, hy - 8, hx + 3.5, hy - 6.2], COL_HORSE, 0.6);

  // ── Mane — individual strands with wave ──
  for (let i = 0; i < 8; i++) {
    const mx = nx + 0.5 + i * 2;
    const my = ny - 12 + i * 1.3;
    const maneWave = Math.sin(gait * Math.PI * 2 + i * 0.6) * 2.5;
    const maneWave2 = Math.cos(gait * Math.PI * 2 + i * 0.9) * 1.5;
    // Thicker strand base
    g.stroke({ color: COL_MANE, width: 2.2 });
    g.moveTo(mx, my).bezierCurveTo(
      mx + maneWave - 1, my + 2,
      mx + maneWave2 - 2, my + 4,
      mx + maneWave - 2.5, my + 6,
    );
    // Thinner strand overlay for detail
    g.stroke({ color: COL_HORSE_DK, width: 0.8 });
    g.moveTo(mx + 0.5, my + 0.5).bezierCurveTo(
      mx + maneWave - 0.5, my + 2.5,
      mx + maneWave2 - 1.5, my + 4.5,
      mx + maneWave - 2, my + 6.5,
    );
  }
  // Forelock strands
  for (let i = 0; i < 3; i++) {
    const flockX = hx + 1 + i * 1;
    const flockY = hy - 5;
    const fw = Math.sin(gait * Math.PI * 2 + i) * 1.5;
    g.stroke({ color: COL_MANE, width: 1.5 });
    g.moveTo(flockX, flockY).bezierCurveTo(flockX + fw - 1, flockY + 2, flockX + fw - 2, flockY + 4, flockX + fw - 1.5, flockY + 5);
  }

  // ── Bridle / Reins ──
  line(g, hx - 4, hy + 3, hx + 4, hy - 1, COL_REINS, 1);
  // Browband
  line(g, hx - 3, hy - 3, hx + 3, hy - 4, COL_REINS, 1);
  // Noseband
  line(g, hx - 7, hy + 1, hx - 3, hy + 4, COL_REINS, 0.8);
  // Reins to rider
  g.stroke({ color: COL_REINS, width: 1 });
  g.moveTo(hx + 4, hy - 1).bezierCurveTo(nx + 8, ny - 4, ox - 14, by - 4, ox - 12, by - 2);

  // ── Saddle with leather stitching, stirrup iron, blanket edge ──
  // Saddle blanket visible underneath
  poly(g, [
    ox - 14, by - 9,
    ox + 6, by - 9,
    ox + 8, by - 6,
    ox - 14, by - 6,
  ], COL_BLANKET, 0.7);
  // Blanket fringe/edge
  for (let i = 0; i < 5; i++) {
    const bfx = ox - 13 + i * 4.5;
    line(g, bfx, by - 6, bfx, by - 4, COL_BLANKET, 1);
    line(g, bfx + 1.5, by - 6, bfx + 1.5, by - 3.5, COL_BLANKET, 0.8);
  }

  // Saddle seat
  ellipse(g, ox - 4, by - 10, 8, 3, COL_SADDLE);
  // Saddle highlight
  ellipse(g, ox - 4, by - 11, 6, 1.5, COL_STITCH, 0.3);
  // Pommel (front)
  rect(g, ox - 12, by - 12, 3, 5, COL_SADDLE_DK);
  // Cantle (rear)
  rect(g, ox + 2, by - 11, 3, 4, COL_SADDLE_DK);

  // Leather stitching on saddle
  for (let i = 0; i < 6; i++) {
    const sx = ox - 10 + i * 2.5;
    const sy = by - 10;
    dot(g, sx, sy, COL_STITCH, 0.6);
  }
  // Stitching along skirt
  for (let i = 0; i < 4; i++) {
    const sx = ox - 8 + i * 3;
    const sy = by - 7.5;
    dot(g, sx, sy, COL_STITCH, 0.5);
  }

  // Stirrup leather
  g.stroke({ color: COL_SADDLE_DK, width: 1.2 });
  g.moveTo(ox - 6, by - 8).bezierCurveTo(ox - 7, by - 2, ox - 8, by + 2, ox - 9, by + 3);
  // Stirrup iron (D-shaped)
  poly(g, [
    ox - 11, by + 3,
    ox - 7, by + 3,
    ox - 6.5, by + 5,
    ox - 11.5, by + 5,
  ], COL_STIRRUP, 0.9);
  // Stirrup tread
  rect(g, ox - 11, by + 5, 5, 1, COL_ARMOR_DK);
  // Stirrup highlight
  line(g, ox - 11, by + 3, ox - 7, by + 3, COL_ARMOR_HI, 0.5);
}

// ---------------------------------------------------------------------------
// Rider (soot-stained siege hunter, side-view facing left) — enhanced armor detail
// ---------------------------------------------------------------------------

function drawRider(
  g: Graphics, ox: number, oy: number,
  breathe: number, swordAngle: number, swordExt: number, seed: number,
): void {
  const rb = breathe;

  // ── Leg in stirrup — greave with articulation ──
  rect(g, ox - 8, oy + 2, 4, 10, COL_ARMOR);
  // Greave highlight
  rect(g, ox - 8, oy + 2, 1, 10, COL_ARMOR_HI, 0.5);
  // Knee cop (articulated)
  ellipse(g, ox - 6, oy + 2, 3, 2, COL_ARMOR_HI, 0.8);
  circle(g, ox - 6, oy + 2, 0.6, COL_RIVET, 0.7); // knee rivet
  // Sabaton (foot armor)
  rect(g, ox - 9, oy + 11, 5, 3, COL_ARMOR_DK);
  line(g, ox - 9, oy + 12, ox - 4, oy + 12, COL_ARMOR, 0.5);

  // ── Torso — articulated plates with scratches and dents ──
  const tx = ox - 2;
  const ty = oy - 10 + rb;

  // Base breastplate
  rect(g, tx - 5, ty, 12, 12, COL_ARMOR);
  // Central ridge on breastplate
  line(g, tx + 1, ty, tx + 1, ty + 12, COL_ARMOR_HI, 1.5);
  // Upper plate segment
  rect(g, tx - 4, ty + 1, 10, 2, COL_ARMOR_HI);
  // Lower plate segment
  rect(g, tx - 4, ty + 9, 10, 2, COL_ARMOR_DK);
  // Horizontal segment divisions
  line(g, tx - 4, ty + 4, tx + 6, ty + 4, COL_ARMOR_DK, 0.8);
  line(g, tx - 4, ty + 7, tx + 6, ty + 7, COL_ARMOR_DK, 0.8);
  // Rivets along plate edges
  for (let i = 0; i < 3; i++) {
    circle(g, tx - 3 + i * 4, ty + 1, 0.5, COL_RIVET, 0.6);
    circle(g, tx - 3 + i * 4, ty + 9, 0.5, COL_RIVET, 0.6);
  }
  // Armor scratches
  line(g, tx - 2, ty + 3, tx + 1, ty + 5, COL_SCRATCH, 0.3);
  line(g, tx + 3, ty + 2, tx + 5, ty + 4, COL_SCRATCH, 0.25);
  line(g, tx - 1, ty + 6, tx + 2, ty + 8, COL_SCRATCH, 0.2);
  // Dented area on breastplate
  ellipse(g, tx + 4, ty + 5, 1.5, 1, COL_DENT, 0.4);
  // Soot streaks on breastplate (varied patterns)
  rect(g, tx - 2, ty + 4, 2, 5, COL_SOOT, 0.3);
  rect(g, tx + 3, ty + 3, 1, 4, COL_SOOT, 0.25);
  line(g, tx - 3, ty + 2, tx - 1, ty + 6, COL_SOOT, 1);

  // Fauld (articulated lame segments)
  for (let i = 0; i < 3; i++) {
    rect(g, tx - 5 + i * 4, ty + 12, 4, 3, i % 2 === 0 ? COL_ARMOR : COL_ARMOR_DK);
    // Lower edge highlight per segment
    line(g, tx - 5 + i * 4, ty + 14.5, tx - 1 + i * 4, ty + 14.5, COL_ARMOR_HI, 0.5);
    // Rivet per fauld segment
    circle(g, tx - 3 + i * 4, ty + 13, 0.4, COL_RIVET, 0.5);
  }

  // ── Demolition tool belt — individual tools visible ──
  rect(g, tx - 6, ty + 14.5, 14, 2.5, COL_BELT);
  rect(g, tx - 5, ty + 15, 12, 1.2, COL_BELT_DK);
  // Belt buckle (square with prong)
  rect(g, tx, ty + 14.5, 2.5, 2.5, COL_BELT_BUCKLE);
  rect(g, tx + 0.5, ty + 15, 1.5, 1.5, COL_BELT_DK, 0.7);
  dot(g, tx + 1.2, ty + 15.7, COL_BELT_BUCKLE, 0.8); // buckle prong

  // Hammer head hanging from belt
  rect(g, tx - 5, ty + 13, 1, 3, COL_TORCH_WOOD, 0.8); // handle
  rect(g, tx - 6, ty + 12.5, 3, 1.5, COL_TOOL_METAL, 0.8); // head

  // Chisel
  line(g, tx - 2, ty + 14, tx - 2, ty + 12, COL_TOOL_METAL, 1.2);
  dot(g, tx - 2, ty + 11.8, COL_TOOL_METAL, 0.7); // chisel tip

  // Rope coil
  g.stroke({ color: COL_ROPE, width: 1 });
  g.moveTo(tx + 4, ty + 13).bezierCurveTo(tx + 5.5, ty + 12, tx + 6.5, ty + 13, tx + 5.5, ty + 14);
  g.moveTo(tx + 4.5, ty + 13.5).bezierCurveTo(tx + 5, ty + 12.5, tx + 6, ty + 13.5, tx + 5, ty + 14.2);

  // Oil flask
  ellipse(g, tx + 7, ty + 13, 1.5, 2, COL_FLASK, 0.8);
  rect(g, tx + 6.5, ty + 11, 1, 1, COL_FLASK, 0.8); // flask neck
  dot(g, tx + 7, ty + 10.8, COL_TOOL_METAL, 0.6); // flask cap

  // ── Pauldrons with ridges and rivets ──
  // Left pauldron (far side)
  ellipse(g, tx - 5, ty + 1, 4, 3.5, COL_ARMOR_HI);
  ellipse(g, tx - 5, ty + 1, 3, 2.5, COL_ARMOR);
  // Pauldron ridges
  line(g, tx - 7, ty, tx - 3, ty, COL_ARMOR_HI, 0.8);
  line(g, tx - 7.5, ty + 1.5, tx - 2.5, ty + 1.5, COL_ARMOR_DK, 0.8);
  // Rivet on pauldron
  circle(g, tx - 5, ty - 0.5, 0.5, COL_RIVET, 0.7);

  // Right pauldron (near side, slightly larger)
  ellipse(g, tx + 7, ty + 1, 4, 3.5, COL_ARMOR);
  ellipse(g, tx + 7, ty + 1, 3, 2.5, COL_ARMOR_DK);
  // Ridges
  line(g, tx + 5, ty, tx + 9, ty, COL_ARMOR_HI, 0.8);
  line(g, tx + 4.5, ty + 1.5, tx + 9.5, ty + 1.5, COL_ARMOR_DK, 0.8);
  // Rivet
  circle(g, tx + 7, ty - 0.5, 0.5, COL_RIVET, 0.7);
  // Scratch on pauldron
  line(g, tx + 6, ty - 0.5, tx + 8.5, ty + 1.5, COL_SCRATCH, 0.3);

  // Chain mail visible between pauldron and torso
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      circle(g, tx - 5 + j * 1, ty + 3.5 + i * 1, 0.35, COL_CHAIN, 0.5);
      circle(g, tx + 7 + j * 1, ty + 3.5 + i * 1, 0.35, COL_CHAIN, 0.5);
    }
  }

  // ── Torch arm (left) — vambrace with detail ──
  rect(g, tx - 8, ty + 3, 3, 7, COL_ARMOR);
  // Vambrace ridge
  line(g, tx - 8, ty + 6, tx - 5, ty + 6, COL_ARMOR_HI, 0.7);
  // Vambrace rivet
  circle(g, tx - 6.5, ty + 4.5, 0.4, COL_RIVET, 0.6);
  // Lower arm / gauntlet cuff
  rect(g, tx - 8, ty + 9, 3, 3, COL_ARMOR_DK);
  // Gauntlet finger segments
  for (let i = 0; i < 3; i++) {
    rect(g, tx - 8.5 + i * 1.2, ty + 11.5, 1, 1.2, COL_ARMOR, 0.8);
  }

  // ── Torch — better wrapping, oil drips, smoke, embers ──
  const torchX = tx - 10;
  const torchY = ty + 4;
  const torchAngle = -Math.PI * 0.65;
  const tLen = 12;
  const tca = Math.cos(torchAngle);
  const tsa = Math.sin(torchAngle);
  const ttx = torchX + tca * tLen;
  const tty = torchY + tsa * tLen;
  // Torch shaft
  line(g, torchX, torchY, ttx, tty, COL_TORCH_WOOD, 3);
  // Wrapped head with criss-cross wrapping detail
  const twx = ttx - tca * 3;
  const twy = tty - tsa * 3;
  line(g, twx, twy, ttx, tty, COL_TORCH_WRAP, 4.5);
  // Wrapping cross-hatching
  for (let i = 0; i < 3; i++) {
    const wt = i / 3;
    const wx = twx + (ttx - twx) * wt;
    const wy = twy + (tty - twy) * wt;
    const perpX = -tsa * 2;
    const perpY = tca * 2;
    line(g, wx - perpX, wy - perpY, wx + perpX, wy + perpY, COL_TORCH_WOOD, 0.7);
  }
  // Oil drip marks running down torch
  const oilDripSeed = seed * 0.3;
  for (let i = 0; i < 2; i++) {
    const ot = 0.3 + i * 0.2;
    const odx = twx + (ttx - twx) * ot + Math.sin(oilDripSeed + i) * 0.5;
    const ody = twy + (tty - twy) * ot + Math.abs(Math.sin(oilDripSeed * 2 + i)) * 1.5;
    circle(g, odx, ody + 1, 0.6, COL_TORCH_OIL, 0.6);
    circle(g, odx, ody + 2.5, 0.4, COL_TORCH_OIL, 0.4);
  }

  // Torch flame
  drawFlame(g, ttx, tty, 5, seed);

  // Smoke wisps rising from torch
  for (let i = 0; i < 3; i++) {
    const smokeSeed = seed * 2.1 + i * 1.7;
    const smokeX = ttx + Math.sin(smokeSeed) * 2;
    const smokeY = tty - 8 - i * 4 - Math.abs(Math.sin(smokeSeed * 0.5)) * 3;
    const smokeAlpha = Math.max(0, 0.3 - i * 0.1);
    const smokeR = 1.5 + i * 0.8;
    circle(g, smokeX, smokeY, smokeR, COL_SMOKE, smokeAlpha);
  }

  // Falling ember particles from torch
  for (let i = 0; i < 2; i++) {
    const emberSeed = seed * 3.7 + i * 2.3;
    const ex = ttx + Math.sin(emberSeed) * 4;
    const ey = tty + 2 + Math.abs(Math.sin(emberSeed * 0.8)) * 6;
    circle(g, ex, ey, 0.4, COL_EMBER, 0.5 - i * 0.15);
  }

  // ── Sword arm (right) — articulated vambrace, gauntlet fingers ──
  const armX = tx + 8;
  const armY = ty + 4;
  // Upper arm plate
  rect(g, armX, ty + 3, 3, 6, COL_ARMOR);
  // Vambrace ridge
  line(g, armX, ty + 5, armX + 3, ty + 5, COL_ARMOR_HI, 0.7);
  // Elbow cop
  ellipse(g, armX + 1.5, ty + 6, 2, 1.5, COL_ARMOR_HI, 0.6);
  // Forearm
  const faDist = 6;
  const faX = armX + Math.cos(swordAngle) * faDist;
  const faY = armY + Math.sin(swordAngle) * faDist;
  line(g, armX + 1, armY, faX, faY, COL_ARMOR, 3);
  // Gauntlet
  circle(g, faX, faY, 2.2, COL_ARMOR_DK);
  // Gauntlet fingers (gripping)
  for (let i = 0; i < 3; i++) {
    const fingerAngle = swordAngle + Math.PI * 0.5 + (i - 1) * 0.3;
    const fx = faX + Math.cos(fingerAngle) * 2.2;
    const fy = faY + Math.sin(fingerAngle) * 2.2;
    circle(g, fx, fy, 0.6, COL_ARMOR, 0.8);
  }

  // ── Flaming sword — fuller groove, beveled edge, layered fire, heat shimmer ──
  const sLen = 16 + swordExt;
  const sEndX = faX + Math.cos(swordAngle) * sLen;
  const sEndY = faY + Math.sin(swordAngle) * sLen;

  // Blade — wide flat with bevel
  const perpAngle = swordAngle + Math.PI / 2;
  const bevelW = 1.2;
  // Dark edge (away side)
  line(g,
    faX + Math.cos(perpAngle) * bevelW, faY + Math.sin(perpAngle) * bevelW,
    sEndX + Math.cos(perpAngle) * bevelW * 0.3, sEndY + Math.sin(perpAngle) * bevelW * 0.3,
    COL_BLADE_DK, 1.5,
  );
  // Main blade body
  line(g, faX, faY, sEndX, sEndY, COL_BLADE, 2.5);
  // Bright edge (near side)
  line(g,
    faX - Math.cos(perpAngle) * bevelW, faY - Math.sin(perpAngle) * bevelW,
    sEndX - Math.cos(perpAngle) * bevelW * 0.3, sEndY - Math.sin(perpAngle) * bevelW * 0.3,
    COL_BLADE_HI, 1,
  );
  // Fuller groove (central channel)
  const fullerStart = 0.15;
  const fullerEnd = 0.85;
  line(g,
    faX + Math.cos(swordAngle) * sLen * fullerStart,
    faY + Math.sin(swordAngle) * sLen * fullerStart,
    faX + Math.cos(swordAngle) * sLen * fullerEnd,
    faY + Math.sin(swordAngle) * sLen * fullerEnd,
    COL_FULLER, 0.8,
  );

  // Cross-guard (ornate)
  const cgAngle = swordAngle + Math.PI / 2;
  line(g,
    faX + Math.cos(cgAngle) * 4.5, faY + Math.sin(cgAngle) * 4.5,
    faX - Math.cos(cgAngle) * 4.5, faY - Math.sin(cgAngle) * 4.5,
    COL_GUARD, 2.5,
  );
  // Cross-guard tips
  circle(g, faX + Math.cos(cgAngle) * 4.5, faY + Math.sin(cgAngle) * 4.5, 1, COL_GUARD);
  circle(g, faX - Math.cos(cgAngle) * 4.5, faY - Math.sin(cgAngle) * 4.5, 1, COL_GUARD);

  // Grip + pommel
  const gEndX = faX - Math.cos(swordAngle) * 5;
  const gEndY = faY - Math.sin(swordAngle) * 5;
  line(g, faX, faY, gEndX, gEndY, COL_GRIP, 2);
  // Grip wrapping
  for (let i = 0; i < 3; i++) {
    const wt = (i + 0.5) / 3;
    const gwx = faX + (gEndX - faX) * wt;
    const gwy = faY + (gEndY - faY) * wt;
    circle(g, gwx, gwy, 0.3, COL_GUARD, 0.5);
  }
  // Pommel (ornate)
  circle(g, gEndX, gEndY, 2, COL_GUARD);
  circle(g, gEndX, gEndY, 1, COL_GRIP, 0.6);

  // Fire wreathing blade (multi-layer)
  drawBladeFire(g, faX, faY, sEndX, sEndY, seed);

  // Heat shimmer above blade
  const shimX = (faX + sEndX) * 0.5;
  const shimY = Math.min(faY, sEndY) - 3;
  drawHeatShimmer(g, shimX, shimY, 8, seed);

  // ── Sallet helm — breathing holes, riveted edge, plume, neck guard ──
  const headX = tx + 1;
  const headY = ty - 7 + rb;

  // Neck guard (articulated lames)
  poly(g, [
    headX + 3, headY + 4,
    headX + 8, headY + 3,
    headX + 9, headY + 6,
    headX + 4, headY + 7,
  ], COL_HELM, 0.8);
  line(g, headX + 4, headY + 5, headX + 8, headY + 4, COL_HELM_HI, 0.5);
  // Second lame
  poly(g, [
    headX + 4, headY + 6,
    headX + 9, headY + 5.5,
    headX + 9.5, headY + 7.5,
    headX + 5, headY + 8,
  ], COL_ARMOR_DK, 0.7);

  // Main helm dome
  ellipse(g, headX, headY, 5.5, 6, COL_HELM);
  ellipse(g, headX + 0.5, headY - 1, 5, 5.5, COL_HELM_HI);

  // Visor with breathing holes
  rect(g, headX - 5, headY - 0.5, 7, 1.5, COL_VISOR);
  // Breathing holes (row of small dots)
  for (let i = 0; i < 4; i++) {
    circle(g, headX - 4 + i * 1.5, headY + 1.5, 0.35, COL_VISOR, 0.9);
  }
  // Visor slit detail
  line(g, headX - 5, headY - 0.5, headX + 2, headY - 0.5, COL_HELM_HI, 0.5);
  line(g, headX - 5, headY + 1, headX + 2, headY + 1, COL_ARMOR_DK, 0.5);

  // Riveted edge around helm
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * 0.6 + i * (Math.PI * 0.85 / 5);
    const rx = headX + Math.cos(angle) * 5.5;
    const ry = headY + Math.sin(angle) * 6;
    circle(g, rx, ry, 0.4, COL_RIVET, 0.6);
  }

  // Tail of sallet (rear extension)
  poly(g, [headX + 3, headY + 3, headX + 7, headY + 2, headX + 6, headY + 4], COL_HELM);

  // Plume / crest on top of helm
  const plumeSeed = seed * 0.4;
  const plumeWave = Math.sin(plumeSeed * 2) * 1;
  // Crest base
  rect(g, headX - 1, headY - 7, 2, 2, COL_HELM, 0.9);
  // Plume flowing backwards
  g.stroke({ color: COL_PLUME, width: 2.5 });
  g.moveTo(headX, headY - 7).bezierCurveTo(
    headX + 3, headY - 8 + plumeWave,
    headX + 7, headY - 7 + plumeWave,
    headX + 10, headY - 5 + plumeWave * 0.5,
  );
  // Plume highlight strand
  g.stroke({ color: COL_PLUME_HI, width: 1.2 });
  g.moveTo(headX + 0.5, headY - 7.5).bezierCurveTo(
    headX + 3.5, headY - 8.5 + plumeWave,
    headX + 7, headY - 7.5 + plumeWave,
    headX + 9.5, headY - 5.5 + plumeWave * 0.5,
  );
  // Second plume strand
  g.stroke({ color: COL_PLUME, width: 1.5 });
  g.moveTo(headX, headY - 6.5).bezierCurveTo(
    headX + 4, headY - 7 + plumeWave * 0.8,
    headX + 8, headY - 6 + plumeWave * 0.8,
    headX + 11, headY - 4 + plumeWave * 0.3,
  );

  // Soot marks on helm
  circle(g, headX - 2, headY + 2, 1.5, COL_SOOT, 0.35);
  circle(g, headX + 3, headY - 3, 1, COL_SOOT, 0.25);
  // Additional soot streak
  line(g, headX - 1, headY - 4, headX + 2, headY - 2, COL_SOOT, 1);
}

// ---------------------------------------------------------------------------
// Animation state generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.8;
  const gait = frame * 0.05;
  const seed = frame * 0.75;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (subtle nostril flare on breathing)
  const nFlare = Math.sin(frame * 0.4) * 0.3 + 0.3;
  drawHorse(g, 48, OY + 24, gait, 0, nFlare);

  // Rider
  drawRider(g, 44, OY + 14 + Math.sin(gait * Math.PI * 2) * 0.5, breathe, -Math.PI * 0.35, 0, seed);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const gait = frame / 8;
  const breathe = Math.sin(frame * 0.5) * 0.6;
  const horseBob = Math.sin(gait * Math.PI * 2) * 2;
  const seed = frame * 0.75;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (trotting with nostril flare during movement)
  const nFlare = Math.abs(Math.sin(gait * Math.PI * 2)) * 0.8;
  drawHorse(g, 48, OY + 24, gait, Math.sin(gait * Math.PI * 2) * 0.3, nFlare);

  // Rider
  drawRider(g, 44, OY + 14 + horseBob, breathe,
    -Math.PI * 0.35 + Math.sin(gait * Math.PI * 2) * 0.1, 0, seed);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const seed = frame * 1.2;

  let swordAngle: number;
  let swordExt: number;
  let lean: number;

  if (t < 0.35) {
    // Wind up – raise flaming sword overhead
    const p = t / 0.35;
    swordAngle = -Math.PI * 0.35 - p * Math.PI * 0.55;
    swordExt = p * 3;
    lean = 0;
  } else if (t < 0.6) {
    // Slash down with fire burst
    const p = (t - 0.35) / 0.25;
    swordAngle = -Math.PI * 0.9 + p * Math.PI * 0.95;
    swordExt = 3 + p * 4;
    lean = p * 3;
  } else {
    // Follow through
    const p = (t - 0.6) / 0.4;
    swordAngle = Math.PI * 0.05 - p * 0.2;
    swordExt = 7 - p * 5;
    lean = 3 - p * 3;
  }

  const horseSurge = Math.sin(t * Math.PI) * 2;

  // Shadow
  ellipse(g, 44, GY, 22, 5, COL_SHADOW, 0.3);

  // Horse (charging, rearing slightly during impact)
  const rearAngle = t > 0.35 && t < 0.65 ? Math.sin((t - 0.35) / 0.3 * Math.PI) * 0.4 : 0;
  const nFlare = t > 0.3 ? 1.0 : 0.3;
  drawHorse(g, 48 - lean, OY + 24 - rearAngle * 3, t * 2, -0.3 - rearAngle, nFlare);

  // Rider
  drawRider(g, 44 - lean, OY + 14 + horseSurge * 0.5 - rearAngle * 2, 0, swordAngle, swordExt, seed);

  // Fire explosion burst on impact with expanding ring
  if (t > 0.4 && t < 0.7) {
    const burst = (t - 0.4) / 0.3;
    const impactX = 30 - lean;
    const impactY = OY + 20;

    // Expanding fire ring
    const ringR = 4 + burst * 12;
    const ringAlpha = Math.max(0, 0.6 * (1 - burst));
    g.stroke({ color: COL_FIRE2, width: 1.5 });
    g.fill({ color: COL_FIRE1, alpha: ringAlpha * 0.3 });
    g.circle(impactX, impactY, ringR);

    // Inner bright ring
    const innerR = 2 + burst * 8;
    g.stroke({ color: COL_FIRE3, width: 1 });
    g.fill({ color: COL_FIRE3, alpha: ringAlpha * 0.2 });
    g.circle(impactX, impactY, innerR);

    // Central flame burst
    drawFlame(g, impactX, impactY, 6 * (1 - burst), seed + 2);

    // Sparks flying in arc from impact point
    for (let i = 0; i < 6; i++) {
      const sparkAngle = -Math.PI * 0.8 + i * (Math.PI * 0.8 / 5);
      const sparkDist = burst * 14 + i * 1.5;
      const sparkX = impactX + Math.cos(sparkAngle) * sparkDist;
      const sparkY = impactY + Math.sin(sparkAngle) * sparkDist - burst * 4;
      const sparkAlpha = Math.max(0, 0.8 * (1 - burst) - i * 0.08);
      circle(g, sparkX, sparkY, 0.8 - burst * 0.3, i % 2 === 0 ? COL_FIRE3 : COL_EMBER, sparkAlpha);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const seed = frame * 1.5;
  const raise = Math.sin(t * Math.PI) * 1.5;
  const gait = frame * 0.05;

  // Shadow
  ellipse(g, 44, GY, 22 + raise, 5 + raise * 0.3, COL_SHADOW, 0.3);

  // Horse
  drawHorse(g, 48, OY + 24, gait, 0, 0.5);

  // Rider – sword held high, channeling fire
  drawRider(g, 44, OY + 14 - raise, 0, -Math.PI * 0.7, 2, seed);

  // Extra flames radiating from blade
  drawFlame(g, 30, OY + 6 - raise, 5, seed + 1);
  drawFlame(g, 36, OY + 2 - raise, 4, seed + 3);

  // Heat shimmer above
  drawHeatShimmer(g, 33, OY - 2 - raise, 10, seed);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const seed = frame * 0.8;

  const fallAngle = t * 0.4;
  const slideX = t * 8;
  const dropY = t * t * 14;
  const fade = Math.max(0, 1 - t * 0.7);

  // Shadow (shrinking)
  ellipse(g, 44, GY, 22 * (1 - t * 0.5), 5 * (1 - t * 0.5), COL_SHADOW, 0.3 * fade);

  // Horse (stumbling with leg buckle)
  if (t < 0.85) {
    const stumble = Math.min(t * 2, 1);
    // Legs buckle forward as horse stumbles
    const legBuckle = stumble * 0.5;
    drawHorse(g, 48 + slideX * 0.3, OY + 24 + dropY * 0.5 + stumble * 3, t * 3, fallAngle * 2 + legBuckle, 0.1);
    // Knee buckling effect — extra lines showing collapsed front legs
    if (t > 0.3) {
      const buckleAlpha = Math.min((t - 0.3) * 2, 1) * fade;
      const bhx = 48 + slideX * 0.3;
      const bhy = OY + 24 + dropY * 0.5 + stumble * 3;
      line(g, bhx - 14, bhy + 8, bhx - 16, bhy + 14, COL_HORSE_DK, 2 * buckleAlpha);
      line(g, bhx - 10, bhy + 8, bhx - 13, bhy + 15, COL_HORSE, 2 * buckleAlpha);
    }
  }

  // Rider (thrown off with ragdoll physics)
  if (t < 0.95) {
    // Ragdoll: rider separates from horse, limbs flail
    const throwDist = t > 0.3 ? (t - 0.3) * 12 : 0;
    const ragdollRot = t > 0.3 ? (t - 0.3) * 2 : 0;
    const riderX = 44 + slideX + throwDist * 0.5;
    const riderY = OY + 14 + dropY - (t > 0.3 ? Math.sin((t - 0.3) * Math.PI * 2) * 5 : 0);
    const swordAng = -Math.PI * 0.5 - fallAngle - ragdollRot;

    drawRider(g, riderX, riderY, ragdollRot * 2, swordAng, 0, seed * fade);

    // Extra ragdoll limb flailing — loose arm
    if (t > 0.3) {
      const flingAngle = ragdollRot * 3;
      const flingX = riderX - 2 + Math.cos(flingAngle) * 6;
      const flingY = riderY - 10 + Math.sin(flingAngle) * 6;
      line(g, riderX - 2, riderY - 8, flingX, flingY, COL_ARMOR, 2 * fade);
    }
  }

  // Torch falls and extinguishes
  if (t > 0.2 && t < 0.9) {
    const torchFall = (t - 0.2) / 0.7;
    const torchX = 34 + slideX * 0.5 + torchFall * 10;
    const torchY = OY + 8 + torchFall * torchFall * 30;
    const torchRot = torchFall * Math.PI;
    const torchLen = 8;
    const tcx = torchX + Math.cos(torchRot) * torchLen;
    const tcy = torchY + Math.sin(torchRot) * torchLen;
    line(g, torchX, torchY, tcx, tcy, COL_TORCH_WOOD, 2.5 * fade);
    // Diminishing flame on torch
    const flameSize = 4 * (1 - torchFall);
    if (flameSize > 0.5) {
      drawFlame(g, tcx, tcy, flameSize, seed * 0.5);
    }
    // Smoke from extinguishing
    if (torchFall > 0.5) {
      const smokeAlpha = (torchFall - 0.5) * 0.6;
      circle(g, tcx, tcy - 3, 2, COL_SMOKE, smokeAlpha * fade);
      circle(g, tcx + 1, tcy - 6, 1.5, COL_SMOKE, smokeAlpha * 0.6 * fade);
    }
  }

  // Sword fire dims as rider falls
  if (t > 0.2) {
    const dimFactor = Math.max(0, 1 - (t - 0.2) * 1.5);
    if (dimFactor > 0.1) {
      const swordFireX = 44 + slideX + 5;
      const swordFireY = OY + 8 + dropY * 0.5;
      circle(g, swordFireX, swordFireY, 2 * dimFactor, COL_FIRE1, 0.5 * dimFactor);
      circle(g, swordFireX, swordFireY - 1, 1.2 * dimFactor, COL_FIRE2, 0.4 * dimFactor);
    }
  }

  // Dying embers scattered
  if (t > 0.3) {
    const ef = (1 - t) * 0.6;
    for (let i = 0; i < 4; i++) {
      const emberSeed = seed + i * 1.7;
      const ex = 36 + slideX * (0.8 + i * 0.2) + Math.sin(emberSeed) * 5;
      const ey = OY + 8 + dropY * (0.2 + i * 0.1) + Math.cos(emberSeed) * 3;
      const eCol = i % 2 === 0 ? COL_EMBER : COL_EMBER_DIM;
      circle(g, ex, ey, (1.5 - i * 0.2) * ef, eCol, ef * (0.8 - i * 0.15));
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 7 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

/**
 * Generate all siege hunter sprite frames procedurally.
 *
 * Returns a map from `UnitState` → ordered `Texture[]`, ready to be
 * injected into the AnimationManager cache.
 */
export function generateSiegeHunterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
