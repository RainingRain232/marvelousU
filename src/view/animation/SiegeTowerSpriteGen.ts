// Procedural sprite generator for the Siege Tower unit type.
//
// Massive multi-story wooden tower on iron-shod wheels, 96×96 pixels per frame.
// 2×2 tiles. Extremely tanky, rolls into buildings. siegeOnly.
//
// Visual features:
//   • Three-story wooden tower with individual plank detail and grain lines
//   • Iron-shod wheels with 8 spokes, hub detail, grease marks
//   • Drawbridge/ramp with hinge detail, rope pulleys, plank texture
//   • Ladders with rung detail, side rail grain, rope lashings
//   • Reinforced with detailed iron bands, rivets, corner brackets
//   • Arrow slits with depth illusion and occasional archer silhouettes
//   • Wet hide covering with seam stitching, patches, burn marks
//   • Crenellations with merlon texture and arrow loops
//   • Ram tip with iron head shape and reinforcement bands
//   • Pushers with helmets, chainmail, proper anatomy

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 96;
const CX = FW / 2;
const GY = FH - 6;

// Palette — siege tower (extended)
const COL_WOOD       = 0x6a4e32;
const COL_WOOD_DK    = 0x4a3220;
const COL_WOOD_LT    = 0x8a6e4a;
const COL_WOOD_GRAIN = 0x5a3e22;
const COL_PLANK_EDGE = 0x3e2818;
const COL_IRON       = 0x606068;
const COL_IRON_DK    = 0x404048;
const COL_IRON_HI    = 0x8a8a90;
const COL_RUST       = 0x8a4a2a;
const COL_RUST_DK    = 0x6a3218;
const COL_HIDE       = 0x7a6a50;
const COL_HIDE_DK    = 0x5a4a30;
const COL_HIDE_LT    = 0x8a7a60;
const COL_HIDE_BURN  = 0x3a2a18;
const COL_STITCH     = 0x9a8a68;
const COL_ROPE       = 0xb8a880;
const COL_ROPE_DK    = 0x8a7a58;
const COL_LADDER     = 0x8a6e4a;
const COL_SHADOW     = 0x000000;
const COL_SKIN       = 0xe8b89d;
const COL_TUNIC      = 0x6a3a2a;
const COL_CHAINMAIL  = 0x7a7a82;
const COL_HELMET     = 0x6a6a72;
const COL_HELMET_HI  = 0x9a9aa0;
const COL_NAIL       = 0x555560;
const COL_GREASE     = 0x3a3828;
const COL_DUST       = 0xb0a888;
const COL_DEBRIS_LT  = 0xa08050;
const COL_SLIT_INNER = 0x0a0808;
const COL_ARCHER     = 0x1a1412;

// Seeded pseudo-random for deterministic detail placement
function srand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Drawing helpers
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

// ---------------------------------------------------------------------------
// Plank / wood detail helpers
// ---------------------------------------------------------------------------

function drawNailHead(g: Graphics, x: number, y: number): void {
  circle(g, x, y, 0.7, COL_NAIL, 0.9);
  circle(g, x - 0.2, y - 0.2, 0.3, COL_IRON_HI, 0.5);
}

function drawWeatherMark(g: Graphics, x: number, y: number, seed: number): void {
  const len = 1.5 + srand(seed) * 2;
  const angle = srand(seed + 1) * 0.4 - 0.2;
  line(g, x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, COL_PLANK_EDGE, 0.5);
}

// ---------------------------------------------------------------------------
// Wheels (heavy iron-shod, 8 spokes with hub detail)
// ---------------------------------------------------------------------------

function drawWheels(g: Graphics, roll: number, bounce: number): void {
  const wy = GY - 1 + bounce;

  for (const wx of [CX - 18, CX + 18]) {
    // Ground contact shadow
    ellipse(g, wx, wy + 6, 8, 2, COL_SHADOW, 0.2);

    // Iron tyre (outer rim)
    circle(g, wx, wy, 8, COL_IRON_DK);
    circle(g, wx, wy, 7, COL_IRON);
    // Tyre texture — rust marks
    for (let r = 0; r < 4; r++) {
      const a = roll + r * Math.PI * 0.5 + 0.3;
      const rx = wx + Math.cos(a) * 7.2;
      const ry = wy + Math.sin(a) * 7.2;
      circle(g, rx, ry, 0.8, COL_RUST, 0.5);
    }

    // Wooden wheel body
    circle(g, wx, wy, 6, COL_WOOD_DK);
    circle(g, wx, wy, 5.5, COL_WOOD);

    // 8 spokes with detail
    for (let s = 0; s < 8; s++) {
      const a = roll + (s * Math.PI) / 4;
      const ex = wx + Math.cos(a) * 5.5;
      const ey = wy + Math.sin(a) * 5.5;
      line(g, wx, wy, ex, ey, COL_WOOD_LT, 1);
      // Spoke shadow
      line(g, wx + 0.3, wy + 0.3, ex + 0.3, ey + 0.3, COL_WOOD_DK, 0.5);
    }

    // Iron hub (center)
    circle(g, wx, wy, 2.5, COL_IRON_DK);
    circle(g, wx, wy, 2, COL_IRON);
    circle(g, wx, wy, 1.2, COL_IRON_HI, 0.6);
    // Hub bolt
    circle(g, wx, wy, 0.6, COL_IRON_DK);

    // Iron band rivets on tyre
    for (let s = 0; s < 12; s++) {
      const a = roll + (s * Math.PI) / 6;
      const rx = wx + Math.cos(a) * 6.8;
      const ry = wy + Math.sin(a) * 6.8;
      circle(g, rx, ry, 0.5, COL_IRON_HI, 0.8);
    }

    // Grease marks near hub
    for (let gr = 0; gr < 3; gr++) {
      const a = roll * 0.3 + gr * 2.1;
      circle(g, wx + Math.cos(a) * 3, wy + Math.sin(a) * 3, 0.8, COL_GREASE, 0.4);
    }
  }
}

// ---------------------------------------------------------------------------
// Tower body with full plank detail
// ---------------------------------------------------------------------------

function drawTower(g: Graphics, bounce: number, sway: number, frame: number = 0): void {
  const bx = CX - 22;
  const tw = 44;
  const baseY = GY - 12 + bounce;
  const topY = baseY - 68;
  const taper = 3;

  // Base platform with plank detail
  rect(g, bx - 2, baseY, tw + 4, 5, COL_WOOD_DK);
  for (let p = 0; p < 6; p++) {
    const px = bx - 2 + p * 8;
    line(g, px, baseY, px, baseY + 5, COL_PLANK_EDGE, 0.5);
    drawNailHead(g, px + 2, baseY + 1);
    drawNailHead(g, px + 2, baseY + 4);
  }

  // Tower walls — slight inward taper, with individual planks
  poly(g, [
    bx + sway, baseY,
    bx + tw + sway, baseY,
    bx + tw - taper + sway, topY,
    bx + taper + sway, topY,
  ], COL_WOOD);

  // Individual horizontal planks (board lines across tower)
  const plankCount = 14;
  for (let p = 0; p < plankCount; p++) {
    const py = topY + (p / plankCount) * (baseY - topY);
    const t = p / plankCount;
    const lx = bx + taper * (1 - t) + sway;
    const rx = bx + tw - taper * (1 - t) + sway;
    // Plank edge line
    line(g, lx, py, rx, py, COL_PLANK_EDGE, 0.6);
    // Grain lines within each plank
    const plankH = (baseY - topY) / plankCount;
    for (let gr = 0; gr < 2; gr++) {
      const gx = lx + 4 + srand(p * 17 + gr * 31) * (rx - lx - 8);
      const gy = py + 1;
      const wobble = srand(p * 23 + gr) * 1.5 - 0.75;
      line(g, gx, gy, gx + wobble, gy + plankH - 2, COL_WOOD_GRAIN, 0.4);
    }
    // Occasional nail heads
    if (srand(p * 41) > 0.5) {
      drawNailHead(g, lx + 3, py + plankH * 0.5);
      drawNailHead(g, rx - 3, py + plankH * 0.5);
    }
    // Occasional weathering marks
    if (srand(p * 53) > 0.6) {
      drawWeatherMark(g, lx + 5 + srand(p * 67) * (rx - lx - 10), py + 2, p * 71);
    }
    // Occasional knot holes
    if (srand(p * 79) > 0.8) {
      const kx = lx + 6 + srand(p * 83) * (rx - lx - 12);
      const ky = py + plankH * 0.5;
      circle(g, kx, ky, 1, COL_PLANK_EDGE, 0.6);
      circle(g, kx, ky, 0.5, COL_WOOD_DK, 0.7);
    }
  }

  // Wet hide covering (fire protection) on front face with texture
  poly(g, [
    bx + sway, baseY,
    bx + 12 + sway, baseY,
    bx + 12 + taper * 0.3 + sway, topY + 10,
    bx + taper * 0.3 + sway, topY + 10,
  ], COL_HIDE, 0.6);

  // Hide texture — bumpy surface
  for (let hy = 0; hy < 10; hy++) {
    for (let hx = 0; hx < 3; hx++) {
      const px = bx + 2 + hx * 3 + sway + srand(hy * 11 + hx) * 1.5;
      const py = topY + 12 + hy * 5 + srand(hy * 13 + hx + 1) * 2;
      circle(g, px, py, 0.5, srand(hy * 7 + hx) > 0.5 ? COL_HIDE_LT : COL_HIDE_DK, 0.3);
    }
  }

  // Hide seams with stitching detail
  for (let i = 0; i < 4; i++) {
    const sy = baseY - 10 - i * 14;
    line(g, bx + sway, sy, bx + 12 + sway, sy, COL_HIDE_DK, 1);
    // Cross-stitch pattern along seam
    for (let st = 0; st < 5; st++) {
      const sx = bx + 1 + st * 2.5 + sway;
      line(g, sx, sy - 1, sx + 1.5, sy + 1, COL_STITCH, 0.7);
      line(g, sx + 1.5, sy - 1, sx, sy + 1, COL_STITCH, 0.7);
    }
  }

  // Hide patches (repair patches)
  rect(g, bx + 2 + sway, baseY - 30, 5, 4, COL_HIDE_DK, 0.5);
  for (let ps = 0; ps < 4; ps++) {
    const psx = bx + 2 + ps * 1.5 + sway;
    circle(g, psx, baseY - 30, 0.3, COL_STITCH, 0.6);
    circle(g, psx, baseY - 26, 0.3, COL_STITCH, 0.6);
  }

  // Burn marks on hide
  circle(g, bx + 6 + sway, baseY - 42, 2, COL_HIDE_BURN, 0.4);
  circle(g, bx + 3 + sway, baseY - 20, 1.5, COL_HIDE_BURN, 0.35);

  // Wet sheen highlights
  for (let sh = 0; sh < 3; sh++) {
    const shx = bx + 3 + sh * 3 + sway;
    const shy = topY + 20 + sh * 15;
    rect(g, shx, shy, 1.5, 0.8, 0xffffff, 0.12);
  }

  // Iron bands (horizontal reinforcement) per floor — detailed
  for (let floor = 0; floor < 3; floor++) {
    const fy = baseY - 5 - floor * 22;
    const t = floor / 3;
    const fx1 = bx + taper * t + sway;
    const fx2 = bx + tw - taper * t + sway;
    // Main band
    rect(g, fx1, fy, fx2 - fx1, 3, COL_IRON_DK);
    // Band highlight (bevel)
    rect(g, fx1, fy, fx2 - fx1, 0.8, COL_IRON_HI, 0.3);

    // Rivets along iron band (more numerous)
    for (let r = 0; r < 8; r++) {
      const rx = fx1 + 2 + r * ((fx2 - fx1 - 4) / 7);
      circle(g, rx, fy + 1.5, 0.9, COL_IRON_HI, 0.8);
      circle(g, rx + 0.2, fy + 1.8, 0.4, COL_IRON_DK, 0.5); // rivet shadow
    }

    // Rust spots on bands
    for (let rs = 0; rs < 2; rs++) {
      const rsx = fx1 + 5 + srand(floor * 19 + rs * 37) * (fx2 - fx1 - 10);
      circle(g, rsx, fy + 1.5, 1, COL_RUST, 0.4);
    }

    // Corner brackets with bolts at band ends
    for (const cx of [fx1, fx2 - 4]) {
      rect(g, cx, fy - 2, 4, 7, COL_IRON, 0.7);
      circle(g, cx + 2, fy - 0.5, 0.7, COL_IRON_HI, 0.7);
      circle(g, cx + 2, fy + 3.5, 0.7, COL_IRON_HI, 0.7);
    }
  }

  // Vertical iron braces with more detail
  for (let i = 0; i < 3; i++) {
    const ix = bx + 8 + i * 12 + sway;
    const itaper = taper * ((ix - bx - sway) / tw);
    line(g, ix, baseY, ix + itaper * 0.1, topY, COL_IRON, 1.8);
    // Brace shadow
    line(g, ix + 0.5, baseY, ix + itaper * 0.1 + 0.5, topY, COL_IRON_DK, 0.8);
    // Cross-bolts along braces
    for (let b = 0; b < 4; b++) {
      const by = baseY - 10 - b * 15;
      const bxOff = itaper * 0.1 * (1 - (by - topY) / (baseY - topY));
      circle(g, ix + bxOff, by, 0.6, COL_IRON_HI, 0.7);
    }
  }

  // Arrow slits on each floor with depth illusion and archer silhouettes
  for (let floor = 0; floor < 3; floor++) {
    const fy = baseY - 12 - floor * 22;
    for (let s = 0; s < 2; s++) {
      const sx = bx + 10 + s * 18 + sway;
      // Outer slit frame (recessed shadow for depth)
      rect(g, sx - 1.5, fy - 0.5, 5, 8, COL_SHADOW, 0.4); // depth shadow
      rect(g, sx - 0.5, fy + 0.5, 3, 7, COL_SLIT_INNER, 0.9); // inner darkness
      // Cross shape
      rect(g, sx, fy, 2, 7, 0x0e0a08);
      rect(g, sx - 1, fy + 2, 4, 2, 0x0e0a08);
      // Inner shadow gradient (top darker)
      rect(g, sx, fy, 2, 2, COL_SHADOW, 0.3);

      // Archer silhouette (occasionally visible, varies by frame)
      const showArcher = srand(floor * 11 + s * 7 + frame * 3) > 0.55;
      if (showArcher) {
        // Tiny figure glimpsed through slit
        circle(g, sx + 1, fy + 1.5, 0.8, COL_ARCHER, 0.7); // head
        rect(g, sx + 0.3, fy + 2.3, 1.4, 3, COL_ARCHER, 0.6); // body
        // Arrow tip poking out
        line(g, sx - 1.5, fy + 3, sx + 0.3, fy + 3, COL_IRON_HI, 0.5);
      }
    }
  }

  // Ladder rungs with detail, rope lashings
  const ladderX = bx + tw - 6 + sway;
  // Side rails with grain
  line(g, ladderX, baseY, ladderX + taper * 0.1, topY + 5, COL_LADDER, 2);
  line(g, ladderX + 6, baseY, ladderX + 6 + taper * 0.1, topY + 5, COL_LADDER, 2);
  // Rail grain detail
  for (let rg = 0; rg < 4; rg++) {
    const rgy = baseY - 10 - rg * 16;
    const off = taper * 0.1 * (1 - (rgy - topY) / (baseY - topY));
    line(g, ladderX + 0.5 + off * 0.3, rgy, ladderX + 0.5 + off * 0.35, rgy - 8, COL_WOOD_GRAIN, 0.4);
    line(g, ladderX + 6.5 + off * 0.3, rgy, ladderX + 6.5 + off * 0.35, rgy - 8, COL_WOOD_GRAIN, 0.4);
  }

  for (let r = 0; r < 6; r++) {
    const ry = baseY - 6 - r * 11;
    const off = taper * 0.1 * (1 - (ry - topY) / (baseY - topY));
    // Rung with thickness
    rect(g, ladderX + off * 0.3, ry, 6, 2, COL_LADDER);
    // Rung shadow
    rect(g, ladderX + off * 0.3, ry + 1.5, 6, 0.5, COL_WOOD_DK, 0.4);
    // Rung grain
    line(g, ladderX + 1 + off * 0.3, ry + 0.5, ladderX + 5 + off * 0.3, ry + 0.5, COL_WOOD_GRAIN, 0.3);

    // Rope lashings at joints (X pattern)
    for (const lx of [ladderX + off * 0.3, ladderX + 5 + off * 0.3]) {
      line(g, lx - 0.5, ry - 0.5, lx + 1, ry + 2.5, COL_ROPE, 0.6);
      line(g, lx + 1, ry - 0.5, lx - 0.5, ry + 2.5, COL_ROPE, 0.6);
    }
  }

  // Crenellations at top with merlon texture and arrow loops
  const crenW = 5;
  for (let c = 0; c < 4; c++) {
    const cx = bx + taper + 2 + c * (crenW + 3) + sway;
    // Merlon body
    rect(g, cx, topY - 5, crenW, 5, COL_WOOD_DK);
    // Merlon cap (iron)
    rect(g, cx - 0.5, topY - 5, crenW + 1, 1.5, COL_IRON_DK);

    // Stone/wood texture on merlon
    for (let mt = 0; mt < 2; mt++) {
      const my = topY - 4 + mt * 2;
      line(g, cx + 0.5, my, cx + crenW - 0.5, my, COL_PLANK_EDGE, 0.4);
    }

    // Arrow loop in merlon center
    rect(g, cx + 1.5, topY - 4, 1.5, 3, COL_SLIT_INNER, 0.8);
    rect(g, cx + 0.8, topY - 2.5, 3, 1, COL_SLIT_INNER, 0.8);

    // Weathering on merlons
    if (srand(c * 29) > 0.5) {
      circle(g, cx + 1 + srand(c * 31) * 3, topY - 2, 0.8, COL_RUST_DK, 0.3);
    }
  }

  // Ram tip at base — detailed iron head with reinforcement bands
  const ramY = baseY - 2;
  // Wooden beam
  rect(g, bx - 8 + sway, ramY - 2.5, 10, 5, COL_WOOD_DK);
  // Beam grain
  line(g, bx - 7 + sway, ramY - 1, bx + 1 + sway, ramY - 1, COL_WOOD_GRAIN, 0.5);
  line(g, bx - 6 + sway, ramY + 1, bx + 1 + sway, ramY + 1, COL_WOOD_GRAIN, 0.5);
  // Reinforcement bands on beam
  for (let rb = 0; rb < 2; rb++) {
    const rbx = bx - 5 + rb * 5 + sway;
    rect(g, rbx, ramY - 3, 2, 6, COL_IRON, 0.7);
    circle(g, rbx + 1, ramY - 1.5, 0.4, COL_IRON_HI, 0.6);
    circle(g, rbx + 1, ramY + 1.5, 0.4, COL_IRON_HI, 0.6);
  }
  // Iron ram head (pointed shape)
  poly(g, [
    bx - 8 + sway, ramY - 3.5,
    bx - 14 + sway, ramY,
    bx - 8 + sway, ramY + 3.5,
  ], COL_IRON);
  // Ram head detail — edge highlight
  line(g, bx - 13.5 + sway, ramY, bx - 8 + sway, ramY - 3, COL_IRON_HI, 0.8);
  // Ram head rivets
  circle(g, bx - 10 + sway, ramY - 1, 0.5, COL_IRON_HI, 0.6);
  circle(g, bx - 10 + sway, ramY + 1, 0.5, COL_IRON_HI, 0.6);
  circle(g, bx - 12 + sway, ramY, 0.5, COL_IRON_HI, 0.7);
}

// ---------------------------------------------------------------------------
// Drawbridge / ramp with hinge, pulleys, and plank detail
// ---------------------------------------------------------------------------

function drawDrawbridge(g: Graphics, bounce: number, sway: number, dropAngle: number): void {
  const bx = CX - 22;
  const topY = GY - 80 + bounce;

  const rampLen = 16;
  const hingeX = bx + 3 + sway;
  const hingeY = topY + 4;

  const endX = hingeX + Math.cos(-dropAngle) * rampLen;
  const endY = hingeY + Math.sin(-dropAngle) * rampLen;

  const rampW = 3;
  const perpX = Math.sin(-dropAngle) * rampW;
  const perpY = -Math.cos(-dropAngle) * rampW;

  // Ramp body with plank texture
  poly(g, [
    hingeX - perpX, hingeY - perpY,
    hingeX + perpX, hingeY + perpY,
    endX + perpX, endY + perpY,
    endX - perpX, endY - perpY,
  ], COL_WOOD_DK);

  // Plank lines along ramp
  for (let p = 0; p < 4; p++) {
    const t = p / 4;
    const px1 = hingeX + (endX - hingeX) * t;
    const py1 = hingeY + (endY - hingeY) * t;
    const px2 = px1 + perpX * 2;
    const py2 = py1 + perpY * 2;
    line(g, px1 - perpX, py1 - perpY, px2 - perpX, py2 - perpY, COL_PLANK_EDGE, 0.5);
  }

  // Iron edge band on ramp
  line(g, endX - perpX, endY - perpY, endX + perpX, endY + perpY, COL_IRON, 1.5);

  // Hinge detail (iron brackets)
  circle(g, hingeX, hingeY, 2, COL_IRON_DK);
  circle(g, hingeX, hingeY, 1.2, COL_IRON_HI, 0.6);
  rect(g, hingeX - 3, hingeY - 0.5, 3, 1, COL_IRON, 0.8);

  // Rope pulleys at top
  const pulleyX = hingeX + sway + 2;
  const pulleyY = topY - 6;
  // Pulley wheel
  circle(g, pulleyX, pulleyY, 1.8, COL_IRON_DK);
  circle(g, pulleyX, pulleyY, 1, COL_IRON);
  circle(g, pulleyX, pulleyY, 0.4, COL_IRON_HI, 0.6);
  // Pulley bracket
  rect(g, pulleyX - 0.5, pulleyY - 4, 1, 3, COL_IRON, 0.8);

  // Rope from pulley to ramp
  const ropeMidX = (hingeX + endX) / 2;
  const ropeMidY = (hingeY + endY) / 2 - 2;
  line(g, pulleyX, pulleyY + 1.5, ropeMidX, ropeMidY, COL_ROPE, 1);
  // Second rope for realism
  line(g, pulleyX + 3, pulleyY + 1, ropeMidX + 2, ropeMidY, COL_ROPE_DK, 0.8);
}

// ---------------------------------------------------------------------------
// Operators pushing — with helmets, chainmail, anatomy
// ---------------------------------------------------------------------------

function drawPushers(g: Graphics, bounce: number, pushPhase: number): void {
  for (let i = 0; i < 2; i++) {
    const px = CX + 26 + i * 8;
    const py = GY - 2 + bounce;
    const lean = Math.sin(pushPhase + i * Math.PI) * 2;
    const strain = Math.abs(Math.sin(pushPhase + i * Math.PI)) * 0.5;

    // Feet
    rect(g, px - 1, py - 1, 3, 2, COL_WOOD_DK);
    rect(g, px + 2, py - 1, 3, 2, COL_WOOD_DK);

    // Legs (strained pose — one forward, one back)
    const legSpread = 1 + strain;
    line(g, px - legSpread, py - 1, px + lean * 0.3, py - 7, COL_TUNIC, 2.2);
    line(g, px + 3 + legSpread, py - 1, px + 3 + lean * 0.3, py - 7, COL_TUNIC, 2.2);

    // Torso (leaning into push, broader)
    rect(g, px - 1.5 + lean, py - 15, 6, 9, COL_TUNIC);
    // Chainmail texture dots on torso
    for (let cy = 0; cy < 3; cy++) {
      for (let cx = 0; cx < 3; cx++) {
        circle(g, px + cx * 2 + lean, py - 14 + cy * 3, 0.4, COL_CHAINMAIL, 0.5);
      }
    }
    // Belt
    rect(g, px - 1.5 + lean, py - 7, 6, 1.2, COL_WOOD_DK);
    circle(g, px + 1.5 + lean, py - 6.4, 0.6, COL_IRON_HI, 0.5); // buckle

    // Arms pushing against tower (strained, muscular)
    const armEndX = CX + 22;
    const armEndY = py - 10 + bounce;
    // Upper arm
    line(g, px + lean + 1, py - 13, px + lean - 2, py - 11, COL_SKIN, 2.5);
    // Forearm pushing
    line(g, px + lean - 2, py - 11, armEndX, armEndY, COL_SKIN, 2.2);
    // Hand
    circle(g, armEndX, armEndY, 1.2, COL_SKIN);

    // Head
    circle(g, px + 1.5 + lean, py - 17, 2.8, COL_SKIN);
    // Helmet
    const hx = px + 1.5 + lean;
    const hy = py - 17;
    // Helmet dome
    ellipse(g, hx, hy - 1.5, 3, 2, COL_HELMET);
    // Helmet brim
    rect(g, hx - 3.5, hy - 0.5, 7, 1, COL_HELMET, 0.8);
    // Helmet highlight
    ellipse(g, hx - 0.5, hy - 2, 1.5, 1, COL_HELMET_HI, 0.4);
    // Nose guard
    rect(g, hx - 0.3, hy - 0.5, 0.6, 2, COL_HELMET, 0.7);

    // Eye (strained expression)
    circle(g, hx + 1, hy, 0.4, COL_SHADOW, 0.7);
  }
}

// ---------------------------------------------------------------------------
// Dust cloud effect
// ---------------------------------------------------------------------------

function drawDustCloud(g: Graphics, cx: number, cy: number, spread: number, alpha: number): void {
  for (let i = 0; i < 6; i++) {
    const dx = (srand(i * 17) - 0.5) * spread * 2;
    const dy = (srand(i * 23) - 0.5) * spread;
    const r = 2 + srand(i * 31) * 3;
    circle(g, cx + dx, cy + dy, r, COL_DUST, alpha * (0.3 + srand(i * 41) * 0.3));
  }
}

// ---------------------------------------------------------------------------
// Debris particles
// ---------------------------------------------------------------------------

function drawDebris(g: Graphics, ox: number, oy: number, t: number, seed: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = srand(seed + i * 7) * Math.PI * 2;
    const speed = 3 + srand(seed + i * 13) * 8;
    const dx = ox + Math.cos(angle) * speed * t;
    const dy = oy + Math.sin(angle) * speed * t + t * t * 15; // gravity
    const size = 1 + srand(seed + i * 19) * 3;
    const rot = t * (srand(seed + i * 29) - 0.5) * 4;

    // Splinter shapes
    const col = srand(seed + i * 37) > 0.5 ? COL_WOOD_LT : COL_WOOD_DK;
    const alpha = Math.max(0, 1 - t * 0.8);

    // Rotated splinter
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const hw = size * 0.5;
    const hh = size * 0.2;
    poly(g, [
      dx - c * hw + s * hh, dy - s * hw - c * hh,
      dx + c * hw + s * hh, dy + s * hw - c * hh,
      dx + c * hw - s * hh, dy + s * hw + c * hh,
      dx - c * hw - s * hh, dy - s * hw + c * hh,
    ], col, alpha);
  }
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.4) * 0.3;

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, 0, 0);
  drawTower(g, 0, 0, frame);
  drawDrawbridge(g, 0, 0, Math.PI * 0.1);
  drawPushers(g, 0, breathe);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const cycle = frame / 8;
  const roll = cycle * Math.PI * 2;
  const bounce = Math.abs(Math.sin(cycle * Math.PI * 4)) * 1.5;
  const sway = Math.sin(cycle * Math.PI * 2) * 1;
  const pushPhase = cycle * Math.PI * 4;

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, roll, bounce);
  drawTower(g, bounce, sway, frame);
  drawDrawbridge(g, bounce, sway, Math.PI * 0.1);
  drawPushers(g, bounce, pushPhase);

  // Subtle dust from wheels while moving
  drawDustCloud(g, CX, GY + 2, 8, 0.15);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  let sway = 0;
  let dropAngle = Math.PI * 0.1;
  let impact = 0;

  if (frame <= 1) {
    sway = -frame * 1.5;
  } else if (frame === 2) {
    sway = -3;
    dropAngle = Math.PI * 0.4;
  } else if (frame === 3) {
    sway = -5;
    dropAngle = Math.PI * 0.5;
    impact = 2;
  } else if (frame === 4) {
    sway = -3;
    dropAngle = Math.PI * 0.5;
    impact = 1;
  } else {
    sway = -1;
    dropAngle = Math.PI * 0.3;
  }

  ellipse(g, CX, GY, 28, 5, COL_SHADOW, 0.3);
  drawWheels(g, frame * 0.2, impact);
  drawTower(g, impact, sway, frame);
  drawDrawbridge(g, impact, sway, dropAngle);
  drawPushers(g, impact, frame * 0.8);

  // Impact shockwave ring
  if (frame === 3) {
    ellipse(g, CX - 20, GY - 30, 12, 4, 0xffffff, 0.15);
    ellipse(g, CX - 20, GY - 30, 8, 2.5, 0xffffff, 0.1);
  }
  if (frame === 4) {
    ellipse(g, CX - 22, GY - 28, 16, 5, 0xffffff, 0.08);
  }

  // Splintering wood debris on impact
  if (frame >= 3 && frame <= 4) {
    const t = (frame - 2) / 3;
    drawDebris(g, CX - 15 + sway, GY - 40, t, 42, 8);

    // Additional large splinters
    for (let i = 0; i < 6; i++) {
      const dx = -15 - i * 3 + sway;
      const dy = -25 + i * 5 - impact * 3;
      const sw = 1 + srand(i * 53) * 3;
      const sh = 0.8 + srand(i * 59) * 1.5;
      const col = i % 3 === 0 ? COL_IRON_DK : (i % 2 === 0 ? COL_WOOD_LT : COL_DEBRIS_LT);
      rect(g, CX + dx, GY + dy, sw, sh, col, 0.7);
    }
  }

  // Dust cloud on impact
  if (frame >= 3) {
    const dustAlpha = frame === 3 ? 0.35 : (frame === 4 ? 0.25 : 0.1);
    const dustSpread = frame === 3 ? 12 : (frame === 4 ? 18 : 22);
    drawDustCloud(g, CX - 18 + sway, GY - 15, dustSpread, dustAlpha);
  }

  // Drawbridge slam effect (frame 3)
  if (frame === 3) {
    // Slam impact lines
    for (let sl = 0; sl < 3; sl++) {
      const slx = CX - 25 + sway + srand(sl * 17) * 6;
      const sly = GY - 70 + srand(sl * 23) * 10;
      line(g, slx, sly, slx - 3 - sl * 2, sly + sl, 0xffffff, 0.8);
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  generateAttackFrames(g, frame);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fade = Math.max(0, 1 - t * 0.6);

  g.alpha = fade;

  ellipse(g, CX, GY, 28 * (1 - t * 0.3), 5 * (1 - t * 0.3), COL_SHADOW, 0.3 * fade);

  // Tower splits and collapses floor by floor
  const bx = CX - 22;
  const tw = 44;
  const baseY = GY - 12;
  void (baseY - 68); // topY
  const taper = 3;
  const tilt = t * t * 12;
  const topple = t * t * 25;

  // Draw collapsing wheels (splaying out)
  const wheelSpread = t * 8;
  for (const side of [-1, 1]) {
    const wx = CX + side * (18 + wheelSpread);
    const wy = GY - 1 + topple * 0.2;
    circle(g, wx, wy, 7 * (1 - t * 0.2), COL_IRON_DK, fade);
    circle(g, wx, wy, 5 * (1 - t * 0.2), COL_WOOD_DK, fade);
    for (let s = 0; s < 8; s++) {
      const a = t * 3 + (s * Math.PI) / 4;
      const r = 5 * (1 - t * 0.2);
      line(g, wx, wy, wx + Math.cos(a) * r, wy + Math.sin(a) * r, COL_WOOD_LT, 0.8);
    }
  }

  // Floor-by-floor collapse (top floor goes first)
  for (let floor = 2; floor >= 0; floor--) {
    const floorT = Math.max(0, t - (2 - floor) * 0.15); // staggered timing
    if (floorT <= 0 && floor < 2) continue;

    const fy1 = baseY - (floor + 1) * 22;
    const fy2 = baseY - floor * 22;
    const floorTilt = -tilt * (floor + 1) * 0.4;
    const floorDrop = floorT * floorT * 20 * (3 - floor);
    const floorShift = floorT * (floor - 1) * 5;

    const ft = floor / 3;
    const fx1 = bx + taper * ft + floorShift;
    const fx2 = bx + tw - taper * ft + floorShift;

    // Floor section tilting and falling
    const cx = (fx1 + fx2) / 2;
    const cy = (fy1 + fy2) / 2 + floorDrop;

    // Simplified floor section
    const hw = (fx2 - fx1) / 2;
    const hh = (fy2 - fy1) / 2;
    const cosT = Math.cos(floorTilt * 0.05);
    const sinT = Math.sin(floorTilt * 0.05);

    poly(g, [
      cx + (-hw * cosT - (-hh) * sinT), cy + (-hw * sinT + (-hh) * cosT),
      cx + (hw * cosT - (-hh) * sinT), cy + (hw * sinT + (-hh) * cosT),
      cx + (hw * cosT - hh * sinT), cy + (hw * sinT + hh * cosT),
      cx + (-hw * cosT - hh * sinT), cy + (-hw * sinT + hh * cosT),
    ], floor === 2 ? COL_WOOD : (floor === 1 ? COL_WOOD_DK : COL_WOOD_LT), fade * (1 - floorT * 0.5));

    // Iron band on floor section
    rect(g, fx1 + floorShift * 0.5, cy - 1 + floorDrop * 0.3, fx2 - fx1, 2, COL_IRON_DK, fade * 0.7);

    // Floor debris cascading
    if (floorT > 0.2) {
      for (let d = 0; d < 4; d++) {
        const dx = cx + (srand(floor * 11 + d * 7) - 0.5) * tw;
        const dy = cy + floorT * floorT * 15 + srand(floor * 13 + d * 11) * 10;
        const ds = 1 + srand(floor * 17 + d * 19) * 2;
        rect(g, dx, dy, ds, ds * 0.6,
          d % 2 === 0 ? COL_WOOD_DK : COL_IRON_DK,
          fade * Math.max(0, 1 - floorT));
      }
    }
  }

  // Cascading debris from all floors
  if (t > 0.2) {
    drawDebris(g, CX - tilt, GY - 40, t - 0.2, 77, 10);
  }

  // Large structural pieces falling
  if (t > 0.3) {
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2.5) * 8 + t * (i - 2) * 6;
      const dy = -35 + t * t * 30 + i * 7;
      const w = 3 + srand(i * 41) * 3;
      const h = 2 + srand(i * 43) * 2;
      const rot = t * (srand(i * 47) - 0.5) * 3;
      const col = i % 3 === 0 ? COL_IRON : (i % 2 === 0 ? COL_WOOD_DK : COL_WOOD_LT);

      // Rotated debris piece
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const pcx = CX + dx;
      const pcy = GY + dy;
      poly(g, [
        pcx - c * w * 0.5 + s * h * 0.5, pcy - s * w * 0.5 - c * h * 0.5,
        pcx + c * w * 0.5 + s * h * 0.5, pcy + s * w * 0.5 - c * h * 0.5,
        pcx + c * w * 0.5 - s * h * 0.5, pcy + s * w * 0.5 + c * h * 0.5,
        pcx - c * w * 0.5 - s * h * 0.5, pcy - s * w * 0.5 + c * h * 0.5,
      ], col, fade * 0.8);
    }
  }

  // Billowing dust clouds
  if (t > 0.15) {
    const dustAlpha = Math.min(0.5, (t - 0.15) * 1.5) * fade;
    const dustSpread = 10 + t * 30;
    drawDustCloud(g, CX - tilt * 0.5, GY - 5, dustSpread, dustAlpha);
    // Rising dust
    if (t > 0.4) {
      drawDustCloud(g, CX - tilt, GY - 25, dustSpread * 0.7, dustAlpha * 0.6);
    }
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 7 },
};

export function generateSiegeTowerFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
