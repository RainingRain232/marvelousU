// ---------------------------------------------------------------------------
// Coven mode — polished dark hex map renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { hexKey, hexDistance } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import { CovenConfig } from "../config/CovenConfig";
import type { CovenState, CovenHex, CovenTerrain } from "../state/CovenState";
import { CovenPhase } from "../state/CovenState";
import { getCreatureDef } from "../config/CovenCreatures";

const HEX = 48;
const S3 = Math.sqrt(3);
const TAU = Math.PI * 2;

const TC: Record<string, { base: number; hi: number; lo: number }> = {};
for (const t of CovenConfig.TERRAIN_DEFS) TC[t.id] = { base: t.color, hi: t.hi, lo: t.lo };
TC["water"] = { base: 0x0a1a2a, hi: 0x1a2a3a, lo: 0x000a1a };

function rng(seed: number): () => number { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function h2p(h: HexCoord) { return { x: HEX * (S3 * h.q + S3 / 2 * h.r), y: HEX * 1.5 * h.r }; }
function corners(cx: number, cy: number, s: number) { const c: { x: number; y: number }[] = []; for (let i = 0; i < 6; i++) { const a = TAU / 6 * i - Math.PI / 6; c.push({ x: cx + HEX * s * Math.cos(a), y: cy + HEX * s * Math.sin(a) }); } return c; }
function hexPoly(g: Graphics, c: { x: number; y: number }[]) { g.moveTo(c[0].x, c[0].y); for (let i = 1; i < 6; i++) g.lineTo(c[i].x, c[i].y); g.closePath(); }

// ---------------------------------------------------------------------------
// Terrain detail functions — dark & atmospheric
// ---------------------------------------------------------------------------

function drawForest(g: Graphics, cx: number, cy: number, r: () => number) {
  // Twisted trunks with bezier curves + organic blob canopy
  for (let i = 0; i < 4; i++) {
    const tx = cx + (r() - 0.5) * HEX * 1.3, ty = cy + (r() - 0.5) * HEX * 0.85;
    const h = 6 + r() * 8;
    const lean = (r() - 0.5) * 5;
    // Trunk with bark texture (double stroke for thickness variation)
    g.moveTo(tx, ty + h * 0.4);
    g.bezierCurveTo(tx + lean * 0.3, ty, tx + lean * 0.7, ty - h * 0.5, tx + lean, ty - h);
    g.stroke({ color: 0x3a2a1a, width: 3, alpha: 0.5 });
    g.moveTo(tx + 0.5, ty + h * 0.4);
    g.bezierCurveTo(tx + lean * 0.3 + 0.5, ty, tx + lean * 0.7, ty - h * 0.5, tx + lean - 0.3, ty - h);
    g.stroke({ color: 0x4a3a2a, width: 1.5, alpha: 0.35 }); // bark highlight
    // Roots spreading
    g.moveTo(tx, ty + h * 0.4).bezierCurveTo(tx - 2, ty + h * 0.5, tx - 4, ty + h * 0.55, tx - 5, ty + h * 0.6).stroke({ color: 0x3a2a1a, width: 1.2, alpha: 0.3 });
    g.moveTo(tx, ty + h * 0.4).bezierCurveTo(tx + 2, ty + h * 0.5, tx + 4, ty + h * 0.55, tx + 5, ty + h * 0.6).stroke({ color: 0x3a2a1a, width: 1.2, alpha: 0.3 });
    // Canopy — organic blob shape (bezier quad instead of circles)
    const cx2 = tx + lean, cy2 = ty - h;
    const cr = h * 0.8;
    g.moveTo(cx2 - cr, cy2 + cr * 0.2);
    g.bezierCurveTo(cx2 - cr * 0.8, cy2 - cr * 0.6, cx2 - cr * 0.2, cy2 - cr * 0.8, cx2 + cr * 0.1, cy2 - cr * 0.7);
    g.bezierCurveTo(cx2 + cr * 0.5, cy2 - cr * 0.9, cx2 + cr * 0.9, cy2 - cr * 0.3, cx2 + cr, cy2 + cr * 0.1);
    g.bezierCurveTo(cx2 + cr * 0.7, cy2 + cr * 0.5, cx2 + cr * 0.2, cy2 + cr * 0.4, cx2, cy2 + cr * 0.3);
    g.bezierCurveTo(cx2 - cr * 0.4, cy2 + cr * 0.5, cx2 - cr * 0.8, cy2 + cr * 0.4, cx2 - cr, cy2 + cr * 0.2);
    g.fill({ color: 0x0a2a0a, alpha: 0.5 });
    // Lighter inner canopy blob
    g.moveTo(cx2 - cr * 0.5, cy2);
    g.bezierCurveTo(cx2 - cr * 0.3, cy2 - cr * 0.5, cx2 + cr * 0.3, cy2 - cr * 0.6, cx2 + cr * 0.5, cy2 - cr * 0.1);
    g.bezierCurveTo(cx2 + cr * 0.3, cy2 + cr * 0.2, cx2 - cr * 0.2, cy2 + cr * 0.2, cx2 - cr * 0.5, cy2);
    g.fill({ color: 0x1a3a1a, alpha: 0.45 });
    // Moonlight dapple
    g.circle(cx2 - 1, cy2 - cr * 0.4, cr * 0.25).fill({ color: 0x3a5a3a, alpha: 0.15 });
  }
  // Undergrowth (bezier ferns with fronds)
  for (let i = 0; i < 8; i++) {
    const bx = cx + (r() - 0.5) * HEX * 1.1, by = cy + (r() - 0.5) * HEX * 0.7;
    const fh = 3 + r() * 5;
    const fleaning = (r() - 0.5) * 4;
    // Main stem
    g.moveTo(bx, by);
    g.bezierCurveTo(bx + fleaning * 0.3, by - fh * 0.4, bx + fleaning * 0.7, by - fh * 0.7, bx + fleaning, by - fh);
    g.stroke({ color: r() < 0.5 ? 0x2a4a2a : 0x1a3a1a, width: 0.7 + r() * 0.4, alpha: 0.4 });
    // Tiny frond leaves along stem
    if (r() < 0.5) {
      g.moveTo(bx + fleaning * 0.3, by - fh * 0.3).lineTo(bx + fleaning * 0.3 + 2, by - fh * 0.35).stroke({ color: 0x2a4a2a, width: 0.5, alpha: 0.25 });
      g.moveTo(bx + fleaning * 0.5, by - fh * 0.5).lineTo(bx + fleaning * 0.5 - 2, by - fh * 0.55).stroke({ color: 0x2a4a2a, width: 0.5, alpha: 0.25 });
    }
  }
  // Glowing mushrooms — proper cap shape
  for (let i = 0; i < 3; i++) {
    const mx = cx + (r() - 0.5) * HEX * 0.8, my = cy + (r() - 0.5) * HEX * 0.5 + 5;
    // Stem
    g.rect(mx - 0.5, my, 1, 2.5).fill({ color: 0xaaffcc, alpha: 0.15 });
    // Cap (bezier dome)
    g.moveTo(mx - 2.5, my);
    g.bezierCurveTo(mx - 2.5, my - 2.5, mx - 1, my - 3, mx, my - 3);
    g.bezierCurveTo(mx + 1, my - 3, mx + 2.5, my - 2.5, mx + 2.5, my);
    g.closePath();
    g.fill({ color: 0x88ffaa, alpha: 0.25 });
    // Glow
    g.circle(mx, my - 1, 3.5).fill({ color: 0x88ffaa, alpha: 0.05 });
  }
}

function drawClearing(g: Graphics, cx: number, cy: number, r: () => number) {
  // Mushroom ring (fairy circle) — proper cap shapes
  for (let i = 0; i < 7; i++) {
    const a = TAU / 7 * i + 0.3, rad = HEX * 0.32;
    const mx = cx + Math.cos(a) * rad, my = cy + Math.sin(a) * rad;
    const capCol = r() < 0.5 ? 0xcc3333 : 0xdd8844;
    const sz = 1.8 + r() * 0.8;
    // Stem
    g.rect(mx - 0.5, my, 1, 2).fill({ color: 0xddccaa, alpha: 0.35 });
    // Cap (dome bezier)
    g.moveTo(mx - sz, my);
    g.bezierCurveTo(mx - sz, my - sz * 1.2, mx - sz * 0.3, my - sz * 1.5, mx, my - sz * 1.5);
    g.bezierCurveTo(mx + sz * 0.3, my - sz * 1.5, mx + sz, my - sz * 1.2, mx + sz, my);
    g.closePath();
    g.fill({ color: capCol, alpha: 0.45 });
    // Cap spots
    g.circle(mx - sz * 0.3, my - sz, 0.6).fill({ color: 0xffffff, alpha: 0.25 });
    g.circle(mx + sz * 0.2, my - sz * 1.2, 0.5).fill({ color: 0xffffff, alpha: 0.2 });
  }
  // Grass blades (bezier)
  for (let i = 0; i < 10; i++) {
    const bx = cx + (r() - 0.5) * HEX * 1.1, by = cy + (r() - 0.5) * HEX * 0.7;
    const gh = 3 + r() * 5, lean = (r() - 0.5) * 3;
    g.moveTo(bx, by);
    g.bezierCurveTo(bx + lean * 0.3, by - gh * 0.4, bx + lean, by - gh * 0.8, bx + lean * 1.2, by - gh);
    g.stroke({ color: [0x4a7a3a, 0x3a6a2a, 0x5a8a4a][Math.floor(r() * 3)], width: 0.7 + r() * 0.4, alpha: 0.5 });
  }
  // Wildflowers — petal shapes instead of circles
  for (let i = 0; i < 5; i++) {
    const fx = cx + (r() - 0.5) * HEX * 0.7, fy = cy + (r() - 0.5) * HEX * 0.5;
    const col = [0xddaa44, 0xcc5555, 0x8888dd, 0xffaadd, 0xffcc88][Math.floor(r() * 5)];
    const petals = 4 + Math.floor(r() * 3);
    // Stem
    g.moveTo(fx, fy + 1).lineTo(fx + (r() - 0.5), fy + 4).stroke({ color: 0x4a7a3a, width: 0.5, alpha: 0.3 });
    // Petals radiating from center
    for (let p = 0; p < petals; p++) {
      const pa = (TAU / petals) * p + r() * 0.3;
      const pr = 1.5 + r() * 0.5;
      const px = fx + Math.cos(pa) * pr, py = fy + Math.sin(pa) * pr;
      g.ellipse(px, py, pr * 0.6, pr * 0.3).fill({ color: col, alpha: 0.4 });
    }
    // Center dot
    g.circle(fx, fy, 0.7).fill({ color: 0xffee88, alpha: 0.4 });
  }
}

function drawGraveyard(g: Graphics, cx: number, cy: number, r: () => number) {
  // Tombstones — varied shapes (rounded, pointed, cross-topped)
  for (let i = 0; i < 5; i++) {
    const tx = cx + (r() - 0.5) * HEX * 0.9, ty = cy + (r() - 0.5) * HEX * 0.55;
    const w = 3 + r() * 2.5, h = 5 + r() * 5;
    const shape = Math.floor(r() * 3); // 0=rounded, 1=pointed, 2=cross

    if (shape === 0) {
      // Rounded-top tombstone
      g.rect(tx - w / 2, ty - h + w / 2, w, h - w / 2).fill({ color: 0x5a5a6a, alpha: 0.5 });
      g.moveTo(tx - w / 2, ty - h + w / 2);
      g.bezierCurveTo(tx - w / 2, ty - h - w * 0.2, tx + w / 2, ty - h - w * 0.2, tx + w / 2, ty - h + w / 2);
      g.closePath().fill({ color: 0x6a6a7a, alpha: 0.48 });
      g.rect(tx - w / 2, ty - h + w / 2, w, h - w / 2).stroke({ color: 0x4a4a5a, width: 0.5, alpha: 0.3 });
    } else if (shape === 1) {
      // Pointed Gothic tombstone
      g.rect(tx - w / 2, ty - h + 3, w, h - 3).fill({ color: 0x5a5a6a, alpha: 0.5 });
      g.moveTo(tx - w / 2, ty - h + 3).lineTo(tx, ty - h - 1).lineTo(tx + w / 2, ty - h + 3).closePath().fill({ color: 0x6a6a7a, alpha: 0.48 });
      g.rect(tx - w / 2, ty - h + 3, w, h - 3).stroke({ color: 0x4a4a5a, width: 0.5, alpha: 0.3 });
    } else {
      // Cross tombstone
      g.rect(tx - w / 2, ty - h + 4, w, h - 4).fill({ color: 0x5a5a6a, alpha: 0.5 });
      g.rect(tx - 0.8, ty - h - 1, 1.6, 5).fill({ color: 0x6a6a7a, alpha: 0.5 }); // vertical
      g.rect(tx - 2.5, ty - h + 1, 5, 1.2).fill({ color: 0x6a6a7a, alpha: 0.5 }); // horizontal
    }
    // Cross engraving (on non-cross shapes)
    if (shape !== 2) {
      g.moveTo(tx, ty - h + 3).lineTo(tx, ty - h * 0.5).stroke({ color: 0x7a7a8a, width: 0.5, alpha: 0.3 });
      g.moveTo(tx - 1.5, ty - h * 0.6).lineTo(tx + 1.5, ty - h * 0.6).stroke({ color: 0x7a7a8a, width: 0.5, alpha: 0.3 });
    }
    // Moss / lichen
    if (r() < 0.5) g.circle(tx - w / 3, ty - 2, 1.5 + r()).fill({ color: 0x3a5a3a, alpha: 0.2 + r() * 0.1 });
    // Tilt (leaning tombstone effect)
    if (r() < 0.3) g.circle(tx + w / 2, ty, 1).fill({ color: 0x4a4a3a, alpha: 0.15 }); // ground crack
  }
  // Ground mist (multiple layers)
  for (let i = 0; i < 3; i++) {
    const mx = cx + (r() - 0.5) * HEX * 0.5;
    g.ellipse(mx, cy + 6 + i * 3, HEX * 0.35 + r() * 10, 3 + r() * 2).fill({ color: 0x6a6a8a, alpha: 0.08 + r() * 0.04 });
  }
  // Skull — proper bone shape
  if (r() < 0.35) {
    const skx = cx + 8, sky = cy + 5;
    // Cranium (rounded top, flat jaw)
    g.moveTo(skx - 2.5, sky + 1);
    g.bezierCurveTo(skx - 3, sky - 1, skx - 2.5, sky - 3, skx, sky - 3.5);
    g.bezierCurveTo(skx + 2.5, sky - 3, skx + 3, sky - 1, skx + 2.5, sky + 1);
    g.lineTo(skx + 2, sky + 2);
    g.lineTo(skx - 2, sky + 2);
    g.closePath();
    g.fill({ color: 0xccccbb, alpha: 0.3 });
    g.stroke({ color: 0xaaaaaa, width: 0.3, alpha: 0.15 });
    // Eye sockets
    g.ellipse(skx - 1, sky - 0.5, 0.9, 0.7).fill({ color: 0x1a1a1a, alpha: 0.4 });
    g.ellipse(skx + 1, sky - 0.5, 0.9, 0.7).fill({ color: 0x1a1a1a, alpha: 0.4 });
    // Nasal cavity
    g.moveTo(skx - 0.3, sky + 0.5).lineTo(skx, sky + 0.1).lineTo(skx + 0.3, sky + 0.5).closePath().fill({ color: 0x1a1a1a, alpha: 0.3 });
    // Jaw line / teeth
    g.moveTo(skx - 1.5, sky + 1.5).lineTo(skx + 1.5, sky + 1.5).stroke({ color: 0xaaaaaa, width: 0.3, alpha: 0.2 });
  }
}

function drawSwamp(g: Graphics, cx: number, cy: number, r: () => number) {
  // Murky pools — organic blob shapes
  for (let i = 0; i < 3; i++) {
    const sx = cx + (r() - 0.5) * HEX * 1.0, sy = cy + (r() - 0.5) * HEX * 0.5;
    const pw = 6 + r() * 7, ph = 3 + r() * 3;
    // Irregular pool shape (6-point bezier blob)
    g.moveTo(sx - pw, sy);
    g.bezierCurveTo(sx - pw * 0.8, sy - ph, sx - pw * 0.2, sy - ph * 1.1, sx + pw * 0.1, sy - ph * 0.8);
    g.bezierCurveTo(sx + pw * 0.5, sy - ph * 0.6, sx + pw * 0.9, sy - ph * 0.3, sx + pw, sy + ph * 0.2);
    g.bezierCurveTo(sx + pw * 0.8, sy + ph, sx + pw * 0.2, sy + ph * 0.9, sx - pw * 0.3, sy + ph * 0.7);
    g.bezierCurveTo(sx - pw * 0.7, sy + ph * 0.5, sx - pw * 0.95, sy + ph * 0.2, sx - pw, sy);
    g.fill({ color: 0x0a1a0a, alpha: 0.45 });
    // Murky highlight
    g.ellipse(sx, sy - ph * 0.2, pw * 0.5, ph * 0.4).fill({ color: 0x1a2a1a, alpha: 0.15 });
    // Lily pad (occasional)
    if (r() < 0.4) {
      const lx = sx + (r() - 0.5) * pw, ly = sy + (r() - 0.5) * ph;
      // Circle with notch cut
      g.moveTo(lx + 2.5, ly);
      for (let a = 0.3; a < TAU - 0.3; a += 0.3) {
        g.lineTo(lx + Math.cos(a) * 2.5, ly + Math.sin(a) * 1.8);
      }
      g.closePath();
      g.fill({ color: 0x3a6a2a, alpha: 0.35 });
      g.circle(lx, ly, 0.5).fill({ color: 0x4a8a3a, alpha: 0.3 }); // center vein
    }
  }
  // Dead reeds — with drooping seedheads
  for (let i = 0; i < 7; i++) {
    const rx = cx + (r() - 0.5) * HEX * 1.1, ry = cy + (r() - 0.5) * HEX * 0.5;
    const rh = 6 + r() * 8;
    const lean = (r() - 0.5) * 3;
    g.moveTo(rx, ry);
    g.bezierCurveTo(rx + lean * 0.3, ry - rh * 0.4, rx + lean * 0.7, ry - rh * 0.7, rx + lean, ry - rh);
    g.stroke({ color: 0x5a6a3a, width: 0.8, alpha: 0.45 });
    // Seedhead (drooping oval at tip)
    if (r() < 0.5) {
      g.ellipse(rx + lean + 1, ry - rh + 1, 1.2, 2).fill({ color: 0x6a5a3a, alpha: 0.3 });
    }
  }
  // Bubbles with highlight
  for (let i = 0; i < 5; i++) {
    const bx = cx + (r() - 0.5) * HEX * 0.6, by = cy + (r() - 0.5) * HEX * 0.3;
    const br = 1 + r() * 1.5;
    g.circle(bx, by, br).stroke({ color: 0x3a5a3a, width: 0.6, alpha: 0.25 });
    g.circle(bx - br * 0.3, by - br * 0.3, br * 0.25).fill({ color: 0x5a7a5a, alpha: 0.2 }); // highlight
  }
  // Mist wisps — bezier curves instead of ellipses
  for (let i = 0; i < 2; i++) {
    const mx = cx + (r() - 0.5) * HEX * 0.5, my = cy + (r() - 0.5) * HEX * 0.3;
    const mw = 10 + r() * 6;
    g.moveTo(mx - mw, my);
    g.bezierCurveTo(mx - mw * 0.5, my - 3, mx + mw * 0.3, my - 2, mx + mw, my);
    g.bezierCurveTo(mx + mw * 0.5, my + 2, mx - mw * 0.3, my + 3, mx - mw, my);
    g.fill({ color: 0x4a5a3a, alpha: 0.07 });
  }
}

function drawRuins(g: Graphics, cx: number, cy: number, r: () => number) {
  // Broken walls — irregular jagged tops instead of rectangles
  for (let i = 0; i < 4; i++) {
    const wx = cx + (r() - 0.5) * HEX * 0.9, wy = cy + (r() - 0.5) * HEX * 0.5;
    const w = 6 + r() * 8, h = 5 + r() * 6;
    // Wall body with jagged broken top
    g.moveTo(wx, wy);
    g.lineTo(wx, wy - h * 0.6);
    g.lineTo(wx + w * 0.2, wy - h * 0.8);
    g.lineTo(wx + w * 0.35, wy - h * 0.55);
    g.lineTo(wx + w * 0.5, wy - h);
    g.lineTo(wx + w * 0.65, wy - h * 0.7);
    g.lineTo(wx + w * 0.8, wy - h * 0.85);
    g.lineTo(wx + w, wy - h * 0.5);
    g.lineTo(wx + w, wy);
    g.closePath();
    g.fill({ color: 0x5a4a3a, alpha: 0.45 });
    g.stroke({ color: 0x4a3a2a, width: 0.5, alpha: 0.3 });
    // Brick lines (horizontal mortar)
    for (let by = 0; by < h * 0.8; by += 3) {
      g.moveTo(wx, wy - by).lineTo(wx + w, wy - by).stroke({ color: 0x3a2a1a, width: 0.3, alpha: 0.15 });
    }
    // Vertical brick offset lines
    for (let bx = 0; bx < w; bx += 4) {
      const bh = h * (0.3 + r() * 0.4);
      g.moveTo(wx + bx, wy).lineTo(wx + bx, wy - bh).stroke({ color: 0x3a2a1a, width: 0.2, alpha: 0.1 });
    }
    // Crack (bezier)
    g.moveTo(wx + w * 0.3, wy - h * 0.5).bezierCurveTo(wx + w * 0.4, wy - h * 0.3, wx + w * 0.55, wy - h * 0.15, wx + w * 0.5, wy);
    g.stroke({ color: 0x2a1a0a, width: 0.7, alpha: 0.3 });
    // Moss on top edges
    if (r() < 0.6) {
      g.circle(wx + w * 0.3, wy - h * 0.7, 1.5).fill({ color: 0x3a5a2a, alpha: 0.2 });
      g.circle(wx + w * 0.7, wy - h * 0.6, 1.2).fill({ color: 0x4a6a3a, alpha: 0.15 });
    }
  }
  // Rubble — irregular stone shapes instead of circles
  for (let i = 0; i < 6; i++) {
    const rx = cx + (r() - 0.5) * HEX, ry = cy + (r() - 0.5) * HEX * 0.6;
    const rs = 1.5 + r() * 2;
    // 4-5 point irregular shape
    g.moveTo(rx - rs, ry + rs * 0.3);
    g.lineTo(rx - rs * 0.5, ry - rs * 0.4);
    g.lineTo(rx + rs * 0.3, ry - rs * 0.5);
    g.lineTo(rx + rs, ry + rs * 0.1);
    g.lineTo(rx + rs * 0.4, ry + rs);
    g.closePath();
    g.fill({ color: 0x6a5a4a, alpha: 0.25 });
  }
  // Glowing rune — proper pentagram
  if (r() < 0.5) {
    const runeR = 6;
    // Outer circle
    g.circle(cx, cy, runeR).stroke({ color: 0x7777cc, width: 0.8, alpha: 0.2 });
    // Pentagram (5-pointed star connected lines)
    for (let i = 0; i < 5; i++) {
      const a1 = (TAU / 5) * i - Math.PI / 2;
      const a2 = (TAU / 5) * ((i + 2) % 5) - Math.PI / 2;
      g.moveTo(cx + Math.cos(a1) * runeR, cy + Math.sin(a1) * runeR);
      g.lineTo(cx + Math.cos(a2) * runeR, cy + Math.sin(a2) * runeR);
      g.stroke({ color: 0x8888ff, width: 0.6, alpha: 0.25 });
    }
    // Center glow
    g.circle(cx, cy, 2).fill({ color: 0x8888ff, alpha: 0.25 });
    g.circle(cx, cy, runeR + 2).fill({ color: 0x6666aa, alpha: 0.04 });
  }
  // Fallen column — with fluting lines
  const colX = cx - 10, colY = cy + 4;
  g.rect(colX, colY, 18, 3.5).fill({ color: 0x8a7a6a, alpha: 0.25 });
  g.rect(colX, colY, 18, 3.5).stroke({ color: 0x7a6a5a, width: 0.3, alpha: 0.15 });
  // Fluting
  for (let fl = 0; fl < 4; fl++) {
    g.moveTo(colX + 2 + fl * 4, colY).lineTo(colX + 2 + fl * 4, colY + 3.5).stroke({ color: 0x6a5a4a, width: 0.3, alpha: 0.12 });
  }
  // Capital (ornamental end)
  g.ellipse(colX, colY + 1.75, 2.5, 2).fill({ color: 0x8a7a6a, alpha: 0.3 });
  g.ellipse(colX + 18, colY + 1.75, 2, 1.8).fill({ color: 0x8a7a6a, alpha: 0.2 }); // broken end
}

function drawLeyLine(g: Graphics, cx: number, cy: number, r: () => number, time: number) {
  // Energy channels radiating from center (animated)
  for (let i = 0; i < 5; i++) {
    const a = r() * TAU;
    const len = HEX * 0.3 + r() * HEX * 0.25;
    const pulse = 0.25 + 0.2 * Math.sin(time * 2 + i * 1.3);
    g.moveTo(cx, cy).lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len).stroke({ color: 0x7788ff, width: 1.8, alpha: pulse });
    // Spark at tip
    g.circle(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 1.5).fill({ color: 0xaabbff, alpha: pulse * 0.8 });
  }
  // Central pulsing glow
  const gr = 6 + Math.sin(time * 1.5) * 3;
  g.circle(cx, cy, gr).fill({ color: 0x5566cc, alpha: 0.12 });
  g.circle(cx, cy, gr * 1.5).fill({ color: 0x4455aa, alpha: 0.04 });
  // Crystals — faceted gems with multiple faces
  for (let i = 0; i < 3; i++) {
    const cx2 = cx + (r() - 0.5) * HEX * 0.6, cy2 = cy + (r() - 0.5) * HEX * 0.4;
    const ch = 5 + r() * 5, cw = 2 + r() * 1.5;
    // Left face (darker)
    g.moveTo(cx2 - cw, cy2 + 2).lineTo(cx2, cy2 - ch).lineTo(cx2, cy2 + 2).closePath().fill({ color: 0x7777dd, alpha: 0.35 });
    // Right face (brighter)
    g.moveTo(cx2 + cw, cy2 + 2).lineTo(cx2, cy2 - ch).lineTo(cx2, cy2 + 2).closePath().fill({ color: 0x9999ff, alpha: 0.4 });
    // Highlight edge
    g.moveTo(cx2, cy2 - ch).lineTo(cx2 + cw * 0.3, cy2 - ch * 0.3).stroke({ color: 0xbbbbff, width: 0.5, alpha: 0.3 });
    // Base
    g.moveTo(cx2 - cw, cy2 + 2).lineTo(cx2, cy2 + 3).lineTo(cx2 + cw, cy2 + 2).closePath().fill({ color: 0x5555aa, alpha: 0.25 });
    // Sparkle at tip
    g.circle(cx2, cy2 - ch, 1).fill({ color: 0xddddff, alpha: 0.3 + 0.15 * Math.sin(time * 3 + i) });
  }
}

function drawCave(g: Graphics, cx: number, cy: number, r: () => number) {
  // Rock wall — irregular stone polygons
  for (let i = 0; i < 7; i++) {
    const rx = cx - 14 + i * 4.5 + (r() - 0.5) * 3;
    const ry = cy - HEX * 0.22 + (r() - 0.5) * 4;
    const rw = 3 + r() * 5, rh = 3 + r() * 4;
    const col = [0x3a3a3a, 0x4a4a4a, 0x333333, 0x3a3a40][Math.floor(r() * 4)];
    // Irregular 5-point rock shape
    g.moveTo(rx, ry + rh * 0.3);
    g.lineTo(rx + rw * 0.15, ry - rh * 0.1);
    g.lineTo(rx + rw * 0.5, ry - rh * 0.3);
    g.lineTo(rx + rw * 0.85, ry);
    g.lineTo(rx + rw, ry + rh * 0.4);
    g.lineTo(rx + rw * 0.7, ry + rh);
    g.lineTo(rx + rw * 0.2, ry + rh * 0.8);
    g.closePath();
    g.fill({ color: col, alpha: 0.4 });
    g.stroke({ color: 0x2a2a2a, width: 0.4, alpha: 0.2 });
    // Highlight edge
    g.moveTo(rx + rw * 0.15, ry - rh * 0.1).lineTo(rx + rw * 0.5, ry - rh * 0.3).stroke({ color: 0x5a5a5a, width: 0.5, alpha: 0.2 });
  }
  // Cave entrance — deeper void with layered edges
  g.ellipse(cx, cy + 2, HEX * 0.3, HEX * 0.22).fill({ color: 0x020202, alpha: 0.75 });
  g.ellipse(cx, cy + 2, HEX * 0.25, HEX * 0.18).fill({ color: 0x000000, alpha: 0.5 }); // inner darkness
  g.ellipse(cx, cy + 2, HEX * 0.3, HEX * 0.22).stroke({ color: 0x4a4a4a, width: 1.5, alpha: 0.4 });
  // Stalactites — tapered with width variation
  for (let i = 0; i < 5; i++) {
    const sx = cx - 12 + i * 5 + (r() - 0.5) * 4;
    const sh = 3 + r() * 6;
    const sw = 1 + r() * 0.8;
    g.moveTo(sx - sw, cy - HEX * 0.18).lineTo(sx, cy - HEX * 0.18 + sh).lineTo(sx + sw, cy - HEX * 0.18).closePath().fill({ color: 0x4a4a4a, alpha: 0.4 });
    // Drip at tip
    g.circle(sx, cy - HEX * 0.18 + sh + 1, 0.5).fill({ color: 0x5588aa, alpha: 0.2 });
  }
  // Bats — bezier wings for more organic look
  for (let i = 0; i < 3; i++) {
    const bx = cx + (r() - 0.5) * 12, by = cy - 6 + r() * 4;
    g.moveTo(bx - 3, by + 1.5).bezierCurveTo(bx - 1, by - 1, bx - 0.5, by, bx, by);
    g.bezierCurveTo(bx + 0.5, by, bx + 1, by - 1, bx + 3, by + 1.5);
    g.stroke({ color: 0x1a1a1a, width: 0.7, alpha: 0.4 });
    g.circle(bx, by + 0.3, 0.5).fill({ color: 0x1a1a1a, alpha: 0.4 }); // body
  }
}

function drawVillage(g: Graphics, cx: number, cy: number, r: () => number) {
  // Cottages — timber-framed with proper architecture
  for (let i = 0; i < 3; i++) {
    const hx = cx + (r() - 0.5) * HEX * 0.7, hy = cy + (r() - 0.5) * HEX * 0.4;
    const w = 7 + r() * 4, h = 5 + r() * 3;
    // Wall (plaster)
    g.rect(hx - w / 2, hy, w, h).fill({ color: 0x7a6a5a, alpha: 0.45 });
    // Timber frame beams
    g.moveTo(hx - w / 2, hy).lineTo(hx - w / 2, hy + h).stroke({ color: 0x4a3a2a, width: 1.2, alpha: 0.35 }); // left
    g.moveTo(hx + w / 2, hy).lineTo(hx + w / 2, hy + h).stroke({ color: 0x4a3a2a, width: 1.2, alpha: 0.35 }); // right
    g.moveTo(hx - w / 2, hy + h / 2).lineTo(hx + w / 2, hy + h / 2).stroke({ color: 0x4a3a2a, width: 0.8, alpha: 0.25 }); // horizontal beam
    // Cross beam (X pattern)
    g.moveTo(hx - w / 2, hy).lineTo(hx, hy + h / 2).stroke({ color: 0x4a3a2a, width: 0.6, alpha: 0.2 });
    g.moveTo(hx + w / 2, hy).lineTo(hx, hy + h / 2).stroke({ color: 0x4a3a2a, width: 0.6, alpha: 0.2 });
    // Thatched roof (layered strokes for texture)
    g.moveTo(hx - w / 2 - 2, hy).lineTo(hx, hy - h * 0.6).lineTo(hx + w / 2 + 2, hy).closePath().fill({ color: 0x4a2a1a, alpha: 0.5 });
    // Thatch lines
    for (let th = 0; th < 3; th++) {
      const thY = hy - h * 0.6 * (0.3 + th * 0.25);
      g.moveTo(hx - w / 2 * (0.3 + th * 0.25), thY).lineTo(hx + w / 2 * (0.3 + th * 0.25), thY).stroke({ color: 0x5a3a1a, width: 0.5, alpha: 0.15 });
    }
    // Chimney
    const chimX = hx + w / 3;
    g.rect(chimX - 1, hy - h * 0.4, 2.5, h * 0.4 + 2).fill({ color: 0x5a4a4a, alpha: 0.4 });
    // Chimney smoke (bezier puffs)
    if (r() < 0.6) {
      g.moveTo(chimX, hy - h * 0.4 - 1);
      g.bezierCurveTo(chimX - 2, hy - h * 0.6, chimX + 1, hy - h * 0.7, chimX - 1, hy - h * 0.85);
      g.stroke({ color: 0x777777, width: 1.5, alpha: 0.08 });
    }
    // Window — proper frame
    g.rect(hx - 1.5, hy + 1, 3, 2.5).fill({ color: 0xffcc66, alpha: 0.35 });
    g.rect(hx - 1.5, hy + 1, 3, 2.5).stroke({ color: 0x4a3a2a, width: 0.5, alpha: 0.3 }); // frame
    g.moveTo(hx, hy + 1).lineTo(hx, hy + 3.5).stroke({ color: 0x4a3a2a, width: 0.3, alpha: 0.2 }); // mullion
    g.circle(hx, hy + 2.3, 4).fill({ color: 0xffcc66, alpha: 0.04 }); // warm glow
    // Door
    g.rect(hx - 1.2, hy + h - 3.5, 2.4, 3.5).fill({ color: 0x3a2a1a, alpha: 0.45 });
    g.circle(hx + 0.5, hy + h - 1.8, 0.4).fill({ color: 0xccaa66, alpha: 0.3 }); // handle
  }
  // Well — stone ring with rope and bucket
  g.circle(cx, cy + 10, 4).stroke({ color: 0x6a6a6a, width: 1.5, alpha: 0.35 });
  g.circle(cx, cy + 10, 1.5).fill({ color: 0x2a4a6a, alpha: 0.3 });
  // Well posts + crossbar
  g.moveTo(cx - 3, cy + 7).lineTo(cx - 3, cy + 4).stroke({ color: 0x5a4a3a, width: 1, alpha: 0.3 });
  g.moveTo(cx + 3, cy + 7).lineTo(cx + 3, cy + 4).stroke({ color: 0x5a4a3a, width: 1, alpha: 0.3 });
  g.moveTo(cx - 3, cy + 4).lineTo(cx + 3, cy + 4).stroke({ color: 0x5a4a3a, width: 1, alpha: 0.3 });
  // Dirt path (bezier curve)
  g.moveTo(cx - 15, cy + 13).bezierCurveTo(cx - 5, cy + 11, cx + 5, cy + 13, cx + 15, cy + 12).stroke({ color: 0x7a6a5a, width: 3, alpha: 0.15 });
  // Path edges
  g.moveTo(cx - 14, cy + 14).bezierCurveTo(cx - 5, cy + 12, cx + 5, cy + 14, cx + 14, cy + 13).stroke({ color: 0x6a5a4a, width: 0.5, alpha: 0.1 });
}

// ---------------------------------------------------------------------------
// Player witch — detailed figure
// ---------------------------------------------------------------------------

function drawWitch(g: Graphics, x: number, y: number, time: number) {
  // Magical aura — spiky star polygon instead of circles
  const auraPulse = 0.04 + 0.02 * Math.sin(time * 1.5);
  for (let layer = 0; layer < 3; layer++) {
    const ar = HEX * (0.6 - layer * 0.15);
    const col = [0x5533aa, 0x6644bb, 0x7755cc][layer];
    const a = auraPulse * (1 + layer * 0.5);
    const spikes = 9;
    const rot = time * 0.3 + layer * 0.5;
    g.moveTo(x + Math.cos(rot) * ar, y + Math.sin(rot) * ar);
    for (let i = 0; i < spikes; i++) {
      const outerA = rot + TAU / spikes * i;
      const innerA = rot + TAU / spikes * (i + 0.5);
      const innerR = ar * (0.6 + 0.1 * Math.sin(time * 2 + i));
      g.lineTo(x + Math.cos(outerA) * ar, y + Math.sin(outerA) * ar);
      g.lineTo(x + Math.cos(innerA) * innerR, y + Math.sin(innerA) * innerR);
    }
    g.closePath();
    g.fill({ color: col, alpha: a });
  }

  // Orbiting spell particles (3 arcane motes circling the witch)
  for (let i = 0; i < 3; i++) {
    const oa = time * 1.2 + i * TAU / 3;
    const or = HEX * 0.35 + Math.sin(time * 2 + i) * 3;
    const ox = x + Math.cos(oa) * or;
    const oy = y + Math.sin(oa) * or * 0.6 - 2;
    const sparkleAlpha = 0.25 + 0.2 * Math.sin(time * 3 + i * 2);
    // Diamond-shaped mote instead of circle
    const ds = 2;
    g.moveTo(ox, oy - ds).lineTo(ox + ds * 0.7, oy).lineTo(ox, oy + ds).lineTo(ox - ds * 0.7, oy).closePath();
    g.fill({ color: 0xaa88ff, alpha: sparkleAlpha });
    g.circle(ox, oy, 3.5).fill({ color: 0x8866cc, alpha: sparkleAlpha * 0.15 }); // glow
    // Trail — tiny 4-point star
    const tx = x + Math.cos(oa - 0.5) * or * 0.9;
    const ty = y + Math.sin(oa - 0.5) * or * 0.55 - 2;
    g.moveTo(tx, ty - 1).lineTo(tx + 0.6, ty).lineTo(tx, ty + 1).lineTo(tx - 0.6, ty).closePath();
    g.fill({ color: 0xaa88ff, alpha: sparkleAlpha * 0.3 });
  }

  // Cloak (flowing bezier with wind animation)
  const windOff = Math.sin(time * 2) * 1.5;
  g.moveTo(x - 7 + windOff * 0.3, y + 8);
  g.bezierCurveTo(x - 8 + windOff * 0.2, y + 5, x - 5, y, x - 3, y - 4);
  g.lineTo(x + 3, y - 4);
  g.bezierCurveTo(x + 5, y, x + 8 + windOff * 0.2, y + 5, x + 7 + windOff * 0.3, y + 8);
  // Flowing bottom edge (animated wave)
  const w1 = Math.sin(time * 2.5) * 1, w2 = Math.sin(time * 2.5 + 1) * 1, w3 = Math.sin(time * 2.5 + 2) * 1;
  g.bezierCurveTo(x + 5 + w1, y + 9.5 + w1 * 0.5, x + 3, y + 7, x + 1, y + 9 + w2 * 0.5);
  g.bezierCurveTo(x - 1 + w2 * 0.5, y + 10.5 + w3 * 0.5, x - 3, y + 7, x - 5, y + 9.5 + w3 * 0.5);
  g.bezierCurveTo(x - 6, y + 9, x - 7 + windOff * 0.3, y + 8.5, x - 7 + windOff * 0.3, y + 8);
  g.fill({ color: 0x1a0a2a, alpha: 0.85 });
  // Cloak edge highlight (catch moonlight)
  g.moveTo(x + 3, y - 4).bezierCurveTo(x + 5, y, x + 8 + windOff * 0.2, y + 5, x + 7 + windOff * 0.3, y + 8);
  g.stroke({ color: 0x3a2a4a, width: 0.8, alpha: 0.25 });
  // Inner fold
  g.moveTo(x - 4, y + 6).bezierCurveTo(x - 3, y + 2, x - 2, y, x - 1, y - 2).lineTo(x + 1, y - 2);
  g.bezierCurveTo(x + 2, y, x + 3, y + 2, x + 4, y + 6).closePath();
  g.fill({ color: 0x2a1a3a, alpha: 0.3 });
  // Clasp gem — hexagonal gem shape
  const cgy = y - 3.5, cgs = 1.5;
  g.moveTo(x, cgy - cgs).lineTo(x + cgs * 0.85, cgy - cgs * 0.4).lineTo(x + cgs * 0.85, cgy + cgs * 0.4)
    .lineTo(x, cgy + cgs).lineTo(x - cgs * 0.85, cgy + cgs * 0.4).lineTo(x - cgs * 0.85, cgy - cgs * 0.4).closePath();
  g.fill({ color: 0x7755aa, alpha: 0.5 });
  // Gem facet highlight
  g.moveTo(x, cgy - cgs).lineTo(x + cgs * 0.85, cgy - cgs * 0.4).lineTo(x, cgy).closePath().fill({ color: 0xccbbff, alpha: 0.2 });
  g.circle(x - 0.3, cgy - 0.5, 0.4).fill({ color: 0xffffff, alpha: 0.3 }); // sparkle

  // Head — oval with chin
  g.moveTo(x - 3, y - 6);
  g.bezierCurveTo(x - 3.5, y - 8, x - 2.5, y - 10, x, y - 10.5);
  g.bezierCurveTo(x + 2.5, y - 10, x + 3.5, y - 8, x + 3, y - 6);
  g.bezierCurveTo(x + 2.5, y - 4.5, x + 1, y - 4, x, y - 3.8);
  g.bezierCurveTo(x - 1, y - 4, x - 2.5, y - 4.5, x - 3, y - 6);
  g.fill({ color: 0xddbbaa, alpha: 0.75 });
  // Face highlight (cheek)
  g.circle(x - 1, y - 7.5, 1.5).fill({ color: 0xeeccbb, alpha: 0.12 });

  // Hair (flowing with wind, multiple strands)
  const hairWind = Math.sin(time * 1.8) * 2;
  // Left hair strands
  g.moveTo(x - 3, y - 8).bezierCurveTo(x - 5, y - 5, x - 7 + hairWind * 0.3, y - 1, x - 6 + hairWind * 0.5, y + 3).stroke({ color: 0x1a0a0a, width: 1.8, alpha: 0.5 });
  g.moveTo(x - 2.5, y - 8).bezierCurveTo(x - 4, y - 4, x - 6 + hairWind * 0.4, y, x - 5 + hairWind * 0.6, y + 4).stroke({ color: 0x2a1a1a, width: 1, alpha: 0.35 });
  g.moveTo(x - 3.5, y - 7).bezierCurveTo(x - 5.5, y - 3, x - 7.5 + hairWind * 0.3, y, x - 7 + hairWind * 0.4, y + 2).stroke({ color: 0x1a0a0a, width: 0.8, alpha: 0.3 });
  // Right hair strands
  g.moveTo(x + 3, y - 8).bezierCurveTo(x + 5, y - 5, x + 7 + hairWind * 0.3, y - 1, x + 6 + hairWind * 0.5, y + 3).stroke({ color: 0x1a0a0a, width: 1.8, alpha: 0.5 });
  g.moveTo(x + 2.5, y - 8).bezierCurveTo(x + 4, y - 4, x + 6 + hairWind * 0.4, y, x + 5 + hairWind * 0.6, y + 4).stroke({ color: 0x2a1a1a, width: 1, alpha: 0.35 });

  // Witch hat (curved tip with wind)
  const hatTip = Math.sin(time * 1.5) * 2;
  g.moveTo(x - 6, y - 8.5);
  g.bezierCurveTo(x - 4, y - 14, x - 1, y - 17, x + hatTip, y - 20); // curved tip
  g.bezierCurveTo(x + 2, y - 16, x + 5, y - 12, x + 6, y - 8.5);
  g.closePath();
  g.fill({ color: 0x1a0a2a, alpha: 0.85 });
  // Hat highlight edge
  g.moveTo(x + 6, y - 8.5).bezierCurveTo(x + 5, y - 12, x + 2, y - 16, x + hatTip, y - 20).stroke({ color: 0x2a1a3a, width: 0.6, alpha: 0.2 });
  // Hat band with pattern
  g.moveTo(x - 6, y - 9).bezierCurveTo(x - 3, y - 10, x + 3, y - 10, x + 6, y - 9).stroke({ color: 0x6644aa, width: 1.5, alpha: 0.5 });
  // Hat brim (bezier curve for 3D)
  g.moveTo(x - 9, y - 8).bezierCurveTo(x - 5, y - 9.5, x + 5, y - 9.5, x + 9, y - 8);
  g.bezierCurveTo(x + 5, y - 7.5, x - 5, y - 7.5, x - 9, y - 8);
  g.fill({ color: 0x1a0a2a, alpha: 0.7 });
  // Hat buckle — shield-shaped with inset gem
  const bx = x, by = y - 9.5;
  g.moveTo(bx - 1.8, by - 1.5).lineTo(bx + 1.8, by - 1.5).lineTo(bx + 1.8, by + 0.5).lineTo(bx, by + 1.8).lineTo(bx - 1.8, by + 0.5).closePath();
  g.fill({ color: 0xdaa520, alpha: 0.5 });
  g.moveTo(bx - 1.8, by - 1.5).lineTo(bx + 1.8, by - 1.5).lineTo(bx + 1.8, by + 0.5).lineTo(bx, by + 1.8).lineTo(bx - 1.8, by + 0.5).closePath();
  g.stroke({ color: 0xeebb33, width: 0.5, alpha: 0.35 });
  // Emerald inset (diamond)
  g.moveTo(bx, by - 0.8).lineTo(bx + 0.7, by).lineTo(bx, by + 0.8).lineTo(bx - 0.7, by).closePath();
  g.fill({ color: 0x44ff44, alpha: 0.4 });

  // Staff — gnarled with knots
  g.moveTo(x + 7, y - 3);
  g.bezierCurveTo(x + 7.5, y + 2, x + 8.5, y + 6, x + 9, y + 10);
  g.stroke({ color: 0x5a4030, width: 2.5, alpha: 0.7 });
  // Staff knot
  g.circle(x + 8, y + 3, 1.5).fill({ color: 0x4a3020, alpha: 0.4 });
  // Staff top fork (holds the orb)
  g.moveTo(x + 8.5, y + 9).bezierCurveTo(x + 7, y + 8, x + 7, y + 10, x + 8, y + 11).stroke({ color: 0x5a4030, width: 1, alpha: 0.5 });
  g.moveTo(x + 9.5, y + 9).bezierCurveTo(x + 11, y + 8, x + 11, y + 10, x + 10, y + 11).stroke({ color: 0x5a4030, width: 1, alpha: 0.5 });

  // Staff orb — faceted octagonal gem
  const orbGlow = 0.4 + 0.3 * Math.sin(time * 3);
  const ox = x + 9, oy = y + 11, os = 2.8;
  // Outer glow (spiky star)
  for (let i = 0; i < 6; i++) {
    const ga = TAU / 6 * i + time * 0.5;
    const gr = os * 1.5 + Math.sin(time * 3 + i) * 0.5;
    g.moveTo(ox, oy).lineTo(ox + Math.cos(ga) * gr, oy + Math.sin(ga) * gr);
    g.stroke({ color: 0x8866cc, width: 0.8, alpha: orbGlow * 0.15 });
  }
  // Gem body (octagon)
  g.moveTo(ox + os, oy);
  for (let i = 1; i <= 8; i++) {
    const ga = TAU / 8 * i;
    g.lineTo(ox + Math.cos(ga) * os, oy + Math.sin(ga) * os);
  }
  g.closePath();
  g.fill({ color: 0x8866cc, alpha: orbGlow });
  // Top facet highlight
  g.moveTo(ox, oy - os).lineTo(ox + os * 0.7, oy - os * 0.3).lineTo(ox, oy).lineTo(ox - os * 0.7, oy - os * 0.3).closePath();
  g.fill({ color: 0xccbbff, alpha: orbGlow * 0.35 });
  // Bright center
  g.circle(ox - 0.5, oy - 0.5, 0.8).fill({ color: 0xffffff, alpha: orbGlow * 0.5 });

  // Eyes — almond-shaped
  for (const ex of [-1.2, 1.2]) {
    g.moveTo(x + ex - 1, y - 7.5).bezierCurveTo(x + ex - 0.5, y - 8.2, x + ex + 0.5, y - 8.2, x + ex + 1, y - 7.5);
    g.bezierCurveTo(x + ex + 0.5, y - 6.8, x + ex - 0.5, y - 6.8, x + ex - 1, y - 7.5);
    g.fill({ color: 0x88aaff, alpha: 0.6 });
    g.circle(x + ex, y - 7.5, 0.4).fill({ color: 0xccddff, alpha: 0.4 }); // iris
  }
}

// ---------------------------------------------------------------------------
// Creature drawing — each type has distinct silhouette
// ---------------------------------------------------------------------------

function drawCreature(g: Graphics, x: number, y: number, type: string, time: number) {
  const def = getCreatureDef(type);
  const col = def?.color ?? 0x444444;

  if (type === "wolf" || type === "wolf_pack") {
    // Wolf — sleek predator with proper head polygon
    g.ellipse(x, y + 1, 8, 4.5).fill({ color: col, alpha: 0.5 });
    // Head — pointed snout polygon
    g.moveTo(x + 3, y - 3).lineTo(x + 5, y - 4).lineTo(x + 7, y - 3.5).lineTo(x + 10, y - 0.5) // snout tip
      .lineTo(x + 8, y + 1).lineTo(x + 5, y + 1.5).lineTo(x + 3, y + 0.5).closePath();
    g.fill({ color: col, alpha: 0.5 });
    // Snout bridge highlight
    g.moveTo(x + 5, y - 3.5).lineTo(x + 9, y - 1).stroke({ color: col, width: 1.5, alpha: 0.3 });
    // Tail — bezier curve
    g.moveTo(x - 5, y + 1).bezierCurveTo(x - 8, y - 1, x - 10, y - 2, x - 9, y - 4).stroke({ color: col, width: 2, alpha: 0.35 });
    // Ears (sharper triangles)
    g.moveTo(x + 4, y - 3.5).lineTo(x + 3, y - 7).lineTo(x + 5.5, y - 4).closePath().fill({ color: col, alpha: 0.55 });
    g.moveTo(x + 6, y - 3.5).lineTo(x + 5.5, y - 7).lineTo(x + 8, y - 3.5).closePath().fill({ color: col, alpha: 0.55 });
    // Inner ear
    g.moveTo(x + 4.2, y - 4).lineTo(x + 3.5, y - 6).lineTo(x + 5, y - 4.2).closePath().fill({ color: 0x8a6a5a, alpha: 0.2 });
    // Eyes (amber diamond)
    for (const ex of [5, 7]) {
      g.moveTo(x + ex, y - 2.2).lineTo(x + ex + 0.8, y - 1.5).lineTo(x + ex, y - 0.8).lineTo(x + ex - 0.8, y - 1.5).closePath();
      g.fill({ color: 0xffcc00, alpha: 0.8 });
    }
    // Nose
    g.circle(x + 9.5, y - 0.5, 0.6).fill({ color: 0x222222, alpha: 0.5 });
    // Pack indicator — extra eye pairs behind
    if (type === "wolf_pack") {
      g.moveTo(x - 3, y + 5).lineTo(x - 2.5, y + 4.5).lineTo(x - 2, y + 5).lineTo(x - 2.5, y + 5.5).closePath().fill({ color: 0xffcc00, alpha: 0.4 });
      g.moveTo(x + 2, y + 6).lineTo(x + 2.5, y + 5.5).lineTo(x + 3, y + 6).lineTo(x + 2.5, y + 6.5).closePath().fill({ color: 0xffcc00, alpha: 0.35 });
    }
  } else if (type === "wraith") {
    // Wraith — translucent ghostly figure
    g.circle(x, y, HEX * 0.3).fill({ color: col, alpha: 0.08 }); // eerie glow
    g.moveTo(x - 6, y + 8).bezierCurveTo(x - 4, y - 4, x + 4, y - 4, x + 6, y + 8);
    g.fill({ color: col, alpha: 0.3 });
    // Tattered edges (animated)
    for (let i = -5; i <= 5; i += 2) {
      g.moveTo(x + i, y + 8).lineTo(x + i + 0.5, y + 10 + Math.sin(time * 3 + i) * 2).stroke({ color: col, width: 0.7, alpha: 0.2 });
    }
    // Hollow face
    g.circle(x, y - 2, 3).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(x - 1.5, y - 2.5, 1.5).fill({ color: 0x88aaff, alpha: 0.7 });
    g.circle(x + 1.5, y - 2.5, 1.5).fill({ color: 0x88aaff, alpha: 0.7 });
  } else if (type === "dark_knight") {
    // Fallen Knight — armored ghost
    g.moveTo(x - 4, y + 7).lineTo(x - 3, y - 4).lineTo(x + 3, y - 4).lineTo(x + 4, y + 7).closePath().fill({ color: 0x3a3a4a, alpha: 0.55 });
    g.circle(x, y - 6, 3.5).fill({ color: 0x4a4a5a, alpha: 0.5 }); // helmet
    g.rect(x - 2, y - 6, 4, 1.5).fill({ color: 0x2a2a3a, alpha: 0.4 }); // visor
    // Ghost sword
    g.moveTo(x + 5, y - 3).lineTo(x + 6, y + 6).stroke({ color: 0x8888aa, width: 1.5, alpha: 0.4 });
    g.moveTo(x + 4, y - 3).lineTo(x + 7, y - 3).stroke({ color: 0x9999bb, width: 1, alpha: 0.35 });
    // Ghostly aura
    g.circle(x, y, HEX * 0.25).fill({ color: 0x4a4a6a, alpha: 0.06 });
    g.circle(x - 1, y - 6.5, 1.2).fill({ color: 0x88aaff, alpha: 0.5 });
    g.circle(x + 1, y - 6.5, 1.2).fill({ color: 0x88aaff, alpha: 0.5 });
  } else if (type === "wight") {
    // Barrow-Wight — massive undead king
    g.moveTo(x - 6, y + 8).lineTo(x - 4, y - 5).lineTo(x + 4, y - 5).lineTo(x + 6, y + 8).closePath().fill({ color: 0x3a4a3a, alpha: 0.5 });
    // Crown
    g.moveTo(x - 4, y - 7).lineTo(x - 3, y - 10).lineTo(x - 1, y - 8).lineTo(x, y - 11).lineTo(x + 1, y - 8).lineTo(x + 3, y - 10).lineTo(x + 4, y - 7).closePath().fill({ color: 0x8a7a3a, alpha: 0.45 });
    // Face
    g.circle(x, y - 5, 3).fill({ color: 0x2a2a2a, alpha: 0.4 });
    g.circle(x - 1.5, y - 5.5, 1.5).fill({ color: 0x44ff44, alpha: 0.7 });
    g.circle(x + 1.5, y - 5.5, 1.5).fill({ color: 0x44ff44, alpha: 0.7 });
    // Dark aura
    g.circle(x, y, HEX * 0.35).fill({ color: 0x1a2a1a, alpha: 0.08 });
  } else if (type === "drake") {
    // Drake — winged serpent with angular head
    g.ellipse(x, y + 1, 11, 6.5).fill({ color: col, alpha: 0.5 });
    // Head — angular jaw polygon
    g.moveTo(x + 5, y - 5).lineTo(x + 8, y - 6).lineTo(x + 12, y - 4).lineTo(x + 13, y - 2) // top jaw
      .lineTo(x + 12, y - 0.5).lineTo(x + 8, y + 0.5).lineTo(x + 5, y - 1).closePath();
    g.fill({ color: col, alpha: 0.5 });
    // Jaw line / mouth
    g.moveTo(x + 8, y - 1).lineTo(x + 13, y - 2).stroke({ color: 0x1a0a0a, width: 0.8, alpha: 0.3 });
    // Horns
    g.moveTo(x + 8, y - 6).lineTo(x + 6, y - 10).stroke({ color: col, width: 1.5, alpha: 0.4 });
    g.moveTo(x + 10, y - 6).lineTo(x + 12, y - 10).stroke({ color: col, width: 1.5, alpha: 0.4 });
    // Wings (bezier membrane)
    g.moveTo(x - 3, y - 2).bezierCurveTo(x - 12, y - 14, x - 2, y - 12, x, y - 2).fill({ color: col, alpha: 0.25 });
    g.moveTo(x + 2, y - 3).bezierCurveTo(x + 6, y - 14, x + 14, y - 10, x + 7, y - 2).fill({ color: col, alpha: 0.2 });
    // Wing struts
    g.moveTo(x - 3, y - 2).lineTo(x - 8, y - 10).stroke({ color: col, width: 0.8, alpha: 0.35 });
    g.moveTo(x - 3, y - 2).lineTo(x - 5, y - 12).stroke({ color: col, width: 0.8, alpha: 0.35 });
    // Tail
    g.moveTo(x - 8, y + 2).bezierCurveTo(x - 12, y + 4, x - 14, y + 1, x - 15, y - 1).stroke({ color: col, width: 2, alpha: 0.4 });
    // Fire eyes
    g.circle(x + 8, y - 4, 1.8).fill({ color: 0xff4400, alpha: 0.85 });
    g.circle(x + 10, y - 4, 1.8).fill({ color: 0xff4400, alpha: 0.85 });
    g.circle(x + 8, y - 4, 0.6).fill({ color: 0xffff00, alpha: 0.6 });
    g.circle(x + 10, y - 4, 0.6).fill({ color: 0xffff00, alpha: 0.6 });
    // Fire breath hint
    g.moveTo(x + 12, y - 2).lineTo(x + 15, y - 1).stroke({ color: 0xff6600, width: 1, alpha: 0.25 + 0.15 * Math.sin(time * 4) });
  } else if (type === "fae_trickster") {
    // Fae — tiny glowing winged figure with teardrop body
    g.circle(x, y, HEX * 0.25).fill({ color: 0xffaadd, alpha: 0.06 }); // pink glow
    // Teardrop body
    g.moveTo(x, y - 3).bezierCurveTo(x + 2.5, y - 1, x + 2, y + 2, x, y + 3);
    g.bezierCurveTo(x - 2, y + 2, x - 2.5, y - 1, x, y - 3);
    g.fill({ color: 0xffccee, alpha: 0.5 });
    // Face
    g.circle(x, y - 1.5, 1.5).fill({ color: 0xffeedd, alpha: 0.35 });
    // Wings (butterfly-like)
    g.moveTo(x, y).bezierCurveTo(x - 5, y - 6, x - 8, y - 2, x, y).fill({ color: 0xffaadd, alpha: 0.3 });
    g.moveTo(x, y).bezierCurveTo(x + 5, y - 6, x + 8, y - 2, x, y).fill({ color: 0xddaaff, alpha: 0.3 });
    // Sparkle trail
    for (let i = 0; i < 3; i++) {
      const sx = x + Math.sin(time * 2 + i * 2) * 5;
      const sy = y + Math.cos(time * 1.5 + i * 2) * 4;
      g.circle(sx, sy, 0.8).fill({ color: 0xffffff, alpha: 0.3 + 0.2 * Math.sin(time * 4 + i) });
    }
  } else if (type === "bog_beast") {
    // Bog Beast — hulking swamp mass
    g.ellipse(x, y + 2, 9, 7).fill({ color: 0x2a3a1a, alpha: 0.5 });
    g.ellipse(x, y - 2, 7, 5).fill({ color: 0x3a4a2a, alpha: 0.4 }); // upper body
    // Dripping (animated)
    for (let i = -3; i <= 3; i += 2) {
      const drip = (time * 0.5 + i * 0.3) % 1;
      g.circle(x + i * 2, y + 8 + drip * 4, 0.8).fill({ color: 0x3a5a2a, alpha: 0.3 * (1 - drip) });
    }
    // Eyes (murky yellow)
    g.circle(x - 3, y - 3, 1.5).fill({ color: 0xaaaa44, alpha: 0.6 });
    g.circle(x + 3, y - 3, 1.5).fill({ color: 0xaaaa44, alpha: 0.6 });
  } else if (type === "cave_spider") {
    // Giant Spider — 8-legged horror
    g.ellipse(x, y, 5, 4).fill({ color: 0x2a1a0a, alpha: 0.5 }); // abdomen
    g.circle(x + 3, y - 2, 3).fill({ color: 0x3a2a1a, alpha: 0.5 }); // head
    // Legs (4 visible per side)
    for (let i = 0; i < 4; i++) {
      const la = -0.6 + i * 0.4;
      const ll = 6 + i * 1.5;
      g.moveTo(x - 2, y + i - 1).bezierCurveTo(x - ll, y - 3 + i, x - ll - 1, y + i + 2, x - ll + 2, y + 5).stroke({ color: 0x3a2a1a, width: 0.8, alpha: 0.45 });
      g.moveTo(x + 2, y + i - 1).bezierCurveTo(x + ll, y - 3 + i, x + ll + 1, y + i + 2, x + ll - 2, y + 5).stroke({ color: 0x3a2a1a, width: 0.8, alpha: 0.45 });
    }
    // Eyes (cluster of 4 pairs)
    for (let i = 0; i < 4; i++) {
      g.circle(x + 2 + i * 0.8, y - 3 + (i % 2) * 0.8, 0.6).fill({ color: 0xff2222, alpha: 0.6 });
    }
    // Web strands
    g.moveTo(x - 5, y - 5).lineTo(x, y).stroke({ color: 0xdddddd, width: 0.3, alpha: 0.15 });
    g.moveTo(x + 5, y - 6).lineTo(x, y).stroke({ color: 0xdddddd, width: 0.3, alpha: 0.15 });
  } else if (type === "will_o_wisp") {
    // Will-o'-Wisp — spiky flame orb polygon
    const wobble = Math.sin(time * 3) * 2;
    const wx = x + wobble * 0.5, wy = y + wobble;
    g.circle(wx, wy, HEX * 0.22).fill({ color: 0x88ffaa, alpha: 0.06 }); // outer glow
    // Spiky orb (8-point star with animated spikes)
    const spikes = 8, outerR = 4.5, innerR = 2.5;
    g.moveTo(wx + outerR, wy);
    for (let i = 0; i < spikes; i++) {
      const oa = TAU / spikes * i;
      const ia = TAU / spikes * (i + 0.5);
      const spikeLen = outerR + Math.sin(time * 5 + i * 1.3) * 1;
      g.lineTo(wx + Math.cos(oa) * spikeLen, wy + Math.sin(oa) * spikeLen);
      g.lineTo(wx + Math.cos(ia) * innerR, wy + Math.sin(ia) * innerR);
    }
    g.closePath();
    g.fill({ color: 0x88ffaa, alpha: 0.3 + 0.15 * Math.sin(time * 4) });
    // Inner bright core
    g.circle(wx, wy - 0.5, 2).fill({ color: 0xccffdd, alpha: 0.4 });
    g.circle(wx - 0.3, wy - 1, 0.8).fill({ color: 0xffffff, alpha: 0.4 });
    // Trailing sparks
    for (let i = 1; i <= 3; i++) {
      const tx = x - i * 3 + Math.sin(time * 2 + i) * 1;
      const ty = y + i * 2 + wobble * 0.3;
      g.circle(tx, ty, 1 - i * 0.2).fill({ color: 0x88ffaa, alpha: 0.15 / i });
    }
  } else if (type === "inquisitor") {
    // Inquisitor as creature (combat encounter)
    drawInquisitor(g, x, y, time);
  } else {
    // Generic fallback
    g.ellipse(x, y + 2, 7, 5).fill({ color: 0x111111, alpha: 0.4 });
    g.circle(x - 3, y - 1, 2).fill({ color: 0xff2222, alpha: 0.7 });
    g.circle(x + 3, y - 1, 2).fill({ color: 0xff2222, alpha: 0.7 });
  }
}

// ---------------------------------------------------------------------------
// Inquisitor — detailed armored figure with torch
// ---------------------------------------------------------------------------

function drawInquisitor(g: Graphics, x: number, y: number, time: number) {
  // Torch light radius (warm orange glow illuminating the area)
  const torchPulse = 0.06 + 0.03 * Math.sin(time * 4);
  g.circle(x, y, HEX * 0.7).fill({ color: 0xff8844, alpha: torchPulse * 0.4 });
  g.circle(x, y, HEX * 0.5).fill({ color: 0xff8844, alpha: torchPulse * 0.7 });
  g.circle(x, y, HEX * 0.3).fill({ color: 0xffaa66, alpha: torchPulse });

  // Armored body
  g.moveTo(x - 3, y + 7).lineTo(x - 2, y - 3).lineTo(x + 2, y - 3).lineTo(x + 3, y + 7).closePath().fill({ color: 0x7a7a8a, alpha: 0.55 });
  // Tabard (white cross)
  g.moveTo(x, y - 1).lineTo(x, y + 4).stroke({ color: 0xcccccc, width: 1, alpha: 0.3 });
  g.moveTo(x - 1.5, y + 1).lineTo(x + 1.5, y + 1).stroke({ color: 0xcccccc, width: 1, alpha: 0.3 });

  // Helmet — pointed great helm polygon
  g.moveTo(x - 3, y - 2).lineTo(x - 3.5, y - 5).lineTo(x - 2.5, y - 7.5).lineTo(x, y - 8.5).lineTo(x + 2.5, y - 7.5).lineTo(x + 3.5, y - 5).lineTo(x + 3, y - 2).closePath();
  g.fill({ color: 0x8a8a9a, alpha: 0.55 });
  g.stroke({ color: 0x7a7a8a, width: 0.5, alpha: 0.3 });
  // Visor slit (horizontal bar across face)
  g.moveTo(x - 2.5, y - 4.5).lineTo(x + 2.5, y - 4.5).stroke({ color: 0x2a2a3a, width: 1.5, alpha: 0.5 });
  // Helmet crest ridge
  g.moveTo(x, y - 8.5).lineTo(x, y - 2).stroke({ color: 0x9a9aaa, width: 0.5, alpha: 0.2 });
  // Face shadow behind visor
  g.rect(x - 2, y - 5.5, 4, 2).fill({ color: 0x000000, alpha: 0.25 });

  // Torch
  g.moveTo(x + 5, y - 2).lineTo(x + 6, y - 10).stroke({ color: 0x6a4a2a, width: 1.5, alpha: 0.65 });
  // Flame (animated)
  const flicker = Math.sin(time * 6) * 1;
  g.circle(x + 6, y - 11 + flicker * 0.3, 2.5).fill({ color: 0xff6622, alpha: 0.6 + 0.15 * Math.sin(time * 5) });
  g.circle(x + 6, y - 12 + flicker * 0.5, 1.5).fill({ color: 0xffaa44, alpha: 0.5 });
  g.circle(x + 6, y - 12.5 + flicker, 0.8).fill({ color: 0xffdd88, alpha: 0.4 });

  // Sword
  g.moveTo(x - 4, y - 1).lineTo(x - 5, y + 8).stroke({ color: 0xaaaaaa, width: 1.2, alpha: 0.4 });
  g.moveTo(x - 5.5, y - 1).lineTo(x - 3.5, y - 1).stroke({ color: 0xcccccc, width: 1, alpha: 0.35 }); // crossguard
}

// ---------------------------------------------------------------------------
// Main renderer class
// ---------------------------------------------------------------------------

export class CovenRenderer {
  readonly container = new Container();
  private _mapLayer = new Container();
  private _animLayer = new Graphics();
  private _particleLayer = new Graphics();
  private _spellFxLayer = new Graphics(); // spell cast visual effects
  private _lightGlowLayer = new Graphics();
  private _entityLayer = new Container();
  private _creatureAnimLayer = new Graphics(); // per-frame creature redraws
  private _lightOverlay = new Graphics();
  private _dayNightOverlay = new Graphics();
  private _minimapLayer = new Container();
  private _playerGfx = new Graphics();
  private _adjacentGfx: Graphics[] = [];
  private _tempObjects: (Text | Graphics)[] = [];
  private _animHexes: { coord: HexCoord; terrain: CovenTerrain }[] = [];
  private _offsetX = 0; _offsetY = 0; _zoom = 1.0; _time = 0;
  private _spellFlash = 0; // countdown for spell cast visual
  private _spellFlashColor = 0xaa88ff;

  init(): void {
    this.container.addChild(this._mapLayer, this._animLayer, this._particleLayer, this._lightGlowLayer, this._entityLayer, this._creatureAnimLayer, this._spellFxLayer, this._lightOverlay, this._dayNightOverlay, this._minimapLayer);
    this._entityLayer.addChild(this._playerGfx);
  }

  drawMap(state: CovenState, sw: number, sh: number): void {
    this._mapLayer.removeChildren();
    for (const g of this._adjacentGfx) g.destroy(); this._adjacentGfx = [];
    for (const o of this._tempObjects) o.destroy(); this._tempObjects = [];
    this._animHexes = [];

    const cp = h2p(state.playerPosition);
    this._offsetX = sw / 2 - cp.x * this._zoom; this._offsetY = sh / 2 - cp.y * this._zoom;
    for (const l of [this._mapLayer, this._animLayer, this._entityLayer]) { l.scale.set(this._zoom); l.position.set(this._offsetX, this._offsetY); }

    for (const [, hex] of state.hexes) {
      const g = new Graphics();
      if (hex.revealed) { this._drawHex(g, hex, state); if (hex.terrain === "ley_line") this._animHexes.push({ coord: hex.coord, terrain: hex.terrain }); }
      else this._drawFog(g, hex);
      this._mapLayer.addChild(g);
    }

    this._drawAdjacent(state);
    this._drawCreatures(state);
    this._drawInquisitors(state);
    this._drawPlayer(state);
    this._drawMinimap(state, sw, sh);
  }

  update(state: CovenState, dt: number, sw: number, sh: number): void {
    this._time += dt;
    const cp = h2p(state.playerPosition);
    const tx = sw / 2 - cp.x * this._zoom, ty = sh / 2 - cp.y * this._zoom;
    this._offsetX += (tx - this._offsetX) * Math.min(1, dt * 4);
    this._offsetY += (ty - this._offsetY) * Math.min(1, dt * 4);
    for (const l of [this._mapLayer, this._animLayer, this._particleLayer, this._lightGlowLayer, this._entityLayer]) l.position.set(this._offsetX, this._offsetY);

    // Player bob
    const bob = Math.sin(this._time * 2) * 1.5 + Math.sin(this._time * 0.7) * 0.5;
    this._playerGfx.position.set(Math.sin(this._time * 0.9) * 0.5, bob);
    this._playerGfx.alpha = 0.85 + 0.15 * Math.sin(this._time * 1.8);

    const aa = 0.3 + 0.2 * Math.sin(this._time * 2.2);
    for (const g of this._adjacentGfx) g.alpha = aa;

    // Animated ley line hexes
    this._animLayer.clear();
    this._animLayer.scale.set(this._zoom);
    for (const ah of this._animHexes) {
      const p = h2p(ah.coord);
      const r2 = rng(ah.coord.q * 1000 + ah.coord.r * 37);
      drawLeyLine(this._animLayer, p.x, p.y, r2, this._time);
    }

    // Animated particles on nearby revealed hexes
    this._particleLayer.clear();
    this._particleLayer.scale.set(this._zoom);
    this._drawParticles(state);

    // Player light radius glow (warm circle around player position)
    this._lightGlowLayer.clear();
    this._lightGlowLayer.scale.set(this._zoom);
    const isNightPhase = state.phase === CovenPhase.NIGHT || state.phase === CovenPhase.DUSK;
    if (isNightPhase) {
      const pp = h2p(state.playerPosition);
      const glowR = HEX * 2.5;
      this._lightGlowLayer.circle(pp.x, pp.y + bob, glowR).fill({ color: 0xffcc88, alpha: 0.03 });
      this._lightGlowLayer.circle(pp.x, pp.y + bob, glowR * 0.7).fill({ color: 0xffcc88, alpha: 0.04 });
      this._lightGlowLayer.circle(pp.x, pp.y + bob, glowR * 0.4).fill({ color: 0xffcc88, alpha: 0.05 });
      // Staff orb light
      this._lightGlowLayer.circle(pp.x + 9, pp.y + bob + 11, HEX * 0.5).fill({ color: 0x8866cc, alpha: 0.04 });
    }

    // Animated creature redraws (creatures breathe/shift per frame)
    this._creatureAnimLayer.clear();
    this._creatureAnimLayer.scale.set(this._zoom);
    this._creatureAnimLayer.position.set(this._offsetX, this._offsetY);
    for (const creature of state.creatures) {
      const cp2 = h2p(creature.position);
      const hex = state.hexes.get(hexKey(creature.position.q, creature.position.r));
      if (!hex?.revealed || hex.lightLevel === 0) continue;
      drawCreature(this._creatureAnimLayer, cp2.x, cp2.y, creature.type, this._time);
    }

    // Spell cast effect (flash at player position when casting)
    this._spellFxLayer.clear();
    this._spellFxLayer.scale.set(this._zoom);
    this._spellFxLayer.position.set(this._offsetX, this._offsetY);
    if (this._spellFlash > 0) {
      this._spellFlash -= dt;
      const pp = h2p(state.playerPosition);
      const intensity = Math.min(1, this._spellFlash / 0.15);
      // Expanding ring
      const ringR = HEX * 0.4 + (1 - intensity) * HEX * 0.8;
      this._spellFxLayer.circle(pp.x, pp.y + bob, ringR).stroke({ color: this._spellFlashColor, width: 2 * intensity, alpha: intensity * 0.5 });
      // Central flash
      this._spellFxLayer.circle(pp.x, pp.y + bob, HEX * 0.2 * intensity).fill({ color: this._spellFlashColor, alpha: intensity * 0.3 });
      // Projectile particles flying outward
      for (let i = 0; i < 5; i++) {
        const a = TAU / 5 * i + this._time * 3;
        const pr = ringR * 0.8;
        this._spellFxLayer.circle(pp.x + Math.cos(a) * pr, pp.y + bob + Math.sin(a) * pr * 0.6, 1.5 * intensity).fill({ color: this._spellFlashColor, alpha: intensity * 0.4 });
      }
    }

    // Ambient rain during night (subtle diagonal lines)
    if (isNightPhase && state.day > 3) {
      const r2 = rng(Math.floor(this._time * 2) * 1000 + 77);
      for (let i = 0; i < 8; i++) {
        const rx = (r2() * sw - this._offsetX) / this._zoom;
        const ry = (r2() * sh - this._offsetY) / this._zoom;
        this._particleLayer.moveTo(rx, ry).lineTo(rx + 3, ry + 8).stroke({ color: 0x6688aa, width: 0.5, alpha: 0.06 });
      }
    }

    this._drawDarkness(state, sw, sh);
  }

  /** Trigger a spell cast visual flash. Call from CovenGame when a spell is cast. */
  triggerSpellFlash(color: number): void {
    this._spellFlash = 0.4; // 0.4 second flash
    this._spellFlashColor = color;
  }

  private _drawHex(g: Graphics, hex: CovenHex, state: CovenState): void {
    const p = h2p(hex.coord);
    const t = TC[hex.terrain] ?? TC["water"];
    const r2 = rng(hex.coord.q * 1000 + hex.coord.r * 37);
    const lightAlpha = hex.lightLevel === 2 ? 0.92 : hex.lightLevel === 1 ? 0.55 : 0.28;

    const outer = corners(p.x, p.y, 0.95);
    hexPoly(g, outer); g.fill({ color: t.base, alpha: lightAlpha });
    hexPoly(g, corners(p.x, p.y + 2, 0.7)); g.fill({ color: t.lo, alpha: 0.1 });
    hexPoly(g, corners(p.x, p.y - 1, 0.72)); g.fill({ color: t.hi, alpha: 0.12 });
    hexPoly(g, outer); g.stroke({ color: 0x000000, width: 1, alpha: 0.4 });

    if (hex.lightLevel >= 1) {
      switch (hex.terrain) {
        case "deep_woods": drawForest(g, p.x, p.y, r2); break;
        case "clearing": drawClearing(g, p.x, p.y, r2); break;
        case "swamp": drawSwamp(g, p.x, p.y, r2); break;
        case "graveyard": drawGraveyard(g, p.x, p.y, r2); break;
        case "ruins": drawRuins(g, p.x, p.y, r2); break;
        case "cave": drawCave(g, p.x, p.y, r2); break;
        case "village": drawVillage(g, p.x, p.y, r2); break;
        case "ley_line": break; // animated layer
      }
    }

    // Ward glow (multi-ring)
    if (hex.wardId) {
      const wardPulse = 0.25 + 0.12 * Math.sin(this._time * 2);
      g.circle(p.x, p.y, HEX * 0.45).stroke({ color: 0x8888ff, width: 2, alpha: wardPulse });
      g.circle(p.x, p.y, HEX * 0.35).stroke({ color: 0x6666cc, width: 1, alpha: wardPulse * 0.5 });
      g.circle(p.x, p.y, HEX * 0.5).fill({ color: 0x5555aa, alpha: 0.04 });
    }

    // Ritual component (golden star)
    if (hex.ritualComponent && hex.lightLevel >= 1) {
      const rp = 0.6 + 0.3 * Math.sin(this._time * 2);
      g.circle(p.x, p.y, 6).fill({ color: 0xffd700, alpha: 0.06 });
      const t2 = new Text({ text: "\u2726", style: new TextStyle({ fontSize: 14, fill: 0xffd700 }) });
      t2.anchor.set(0.5); t2.position.set(p.x, p.y); t2.alpha = rp; g.addChild(t2);
    }

    // Ingredient indicator
    if (hex.ingredients.length > 0 && hex.lightLevel >= 1 && !hex.visited) {
      const t2 = new Text({ text: "\u2618", style: new TextStyle({ fontSize: 10, fill: 0x88cc88 }) });
      t2.anchor.set(0.5); t2.position.set(p.x - HEX * 0.28, p.y - HEX * 0.3); t2.alpha = 0.6; g.addChild(t2);
    }
  }

  private _drawFog(g: Graphics, hex: CovenHex): void {
    const p = h2p(hex.coord);
    hexPoly(g, corners(p.x, p.y, 0.95)); g.fill({ color: 0x030306, alpha: 0.5 });
    hexPoly(g, corners(p.x, p.y, 0.95)); g.stroke({ color: 0x08080e, width: 0.5, alpha: 0.2 });
    // Stippled mystery
    const r2 = rng(hex.coord.q * 333 + hex.coord.r * 17);
    for (let i = 0; i < 5; i++) g.circle(p.x + (r2() - 0.5) * HEX * 0.8, p.y + (r2() - 0.5) * HEX * 0.5, 0.5 + r2() * 0.7).fill({ color: 0x0a0a14, alpha: 0.3 });
    // Edge fog wisps (bezier tendrils reaching into the hex)
    for (let i = 0; i < 3; i++) {
      const a = r2() * TAU;
      const startR = HEX * 0.6;
      const sx = p.x + Math.cos(a) * startR, sy = p.y + Math.sin(a) * startR;
      const endR = HEX * 0.2 + r2() * HEX * 0.2;
      const ex = p.x + Math.cos(a) * endR, ey = p.y + Math.sin(a) * endR;
      const cx1 = (sx + ex) / 2 + (r2() - 0.5) * 8, cy1 = (sy + ey) / 2 + (r2() - 0.5) * 8;
      g.moveTo(sx, sy).bezierCurveTo(cx1, cy1, ex + (r2() - 0.5) * 3, ey + (r2() - 0.5) * 3, ex, ey);
      g.stroke({ color: 0x0a0a18, width: 1.5 + r2(), alpha: 0.15 + r2() * 0.1 });
    }
  }

  private _drawAdjacent(state: CovenState): void {
    for (const coord of state.adjacentHexes) {
      const p = h2p(coord);
      const g = new Graphics();
      hexPoly(g, corners(p.x, p.y, 0.86)); g.stroke({ color: 0x9988bb, width: 2.5, alpha: 0.4 });
      hexPoly(g, corners(p.x, p.y, 0.8)); g.fill({ color: 0x9988bb, alpha: 0.04 });

      const hex = state.hexes.get(hexKey(coord.q, coord.r));
      if (hex?.creatureId) {
        const t = new Text({ text: "\u2620", style: new TextStyle({ fontSize: 11, fill: 0xff4444 }) });
        t.anchor.set(0.5); t.position.set(p.x, p.y + HEX * 0.42); g.addChild(t);
      }

      g.eventMode = "static"; g.cursor = "pointer";
      g.hitArea = { contains: (mx: number, my: number) => { const dx = mx - p.x, dy = my - p.y; return dx * dx + dy * dy < HEX * HEX * 0.7; }};
      this._entityLayer.addChild(g); this._adjacentGfx.push(g);
    }
  }

  private _drawPlayer(state: CovenState): void {
    const p = h2p(state.playerPosition);
    this._playerGfx.clear();
    drawWitch(this._playerGfx, p.x, p.y, this._time);
  }

  private _drawCreatures(state: CovenState): void {
    for (const creature of state.creatures) {
      const p = h2p(creature.position);
      const hex = state.hexes.get(hexKey(creature.position.q, creature.position.r));
      if (!hex?.revealed || hex.lightLevel === 0) continue;
      const g = new Graphics();
      drawCreature(g, p.x, p.y, creature.type, this._time);
      this._mapLayer.addChild(g);
    }
  }

  private _drawInquisitors(state: CovenState): void {
    for (const inq of state.inquisitors) {
      const p = h2p(inq.position);
      const hex = state.hexes.get(hexKey(inq.position.q, inq.position.r));
      if (!hex?.revealed) continue;
      const g = new Graphics();
      drawInquisitor(g, p.x, p.y, this._time);
      this._mapLayer.addChild(g);
    }
  }

  private _drawDarkness(state: CovenState, sw: number, sh: number): void {
    this._dayNightOverlay.clear();
    const isNight = state.phase === CovenPhase.NIGHT || state.phase === CovenPhase.DUSK;
    let alpha = 0, color = 0x000011;
    if (isNight) { alpha = 0.35; color = 0x000022; }
    else if (state.phase === CovenPhase.DAWN) { alpha = 0.08; color = 0x110011; }
    else if (state.phase === CovenPhase.COMBAT) { alpha = 0.12 + 0.03 * Math.sin(this._time * 5); color = 0x220000; }
    else if (state.phase === CovenPhase.GAME_OVER) { alpha = 0.6; color = 0x000000; }
    else if (state.phase === CovenPhase.VICTORY) { alpha = 0.06; color = 0x110022; }
    if (alpha > 0) this._dayNightOverlay.rect(0, 0, sw, sh).fill({ color, alpha });
    // Vignette
    const ew = sw * 0.15, eh = sh * 0.15;
    this._dayNightOverlay.rect(0, 0, sw, eh).fill({ color: 0x000000, alpha: 0.22 });
    this._dayNightOverlay.rect(0, sh - eh, sw, eh).fill({ color: 0x000000, alpha: 0.18 });
    this._dayNightOverlay.rect(0, 0, ew, sh).fill({ color: 0x000000, alpha: 0.14 });
    this._dayNightOverlay.rect(sw - ew, 0, ew, sh).fill({ color: 0x000000, alpha: 0.14 });
  }

  private _drawMinimap(state: CovenState, sw: number, sh: number): void {
    this._minimapLayer.removeChildren();
    const g = new Graphics();
    const mw = 130, mh = 100, mx = sw - mw - 10, my = sh - mh - 10;
    const sc = mw / (state.mapRadius * 2 * S3 * 0.8);
    g.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 4).fill({ color: 0x000000, alpha: 0.65 });
    g.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 4).stroke({ color: 0x6644aa, width: 1, alpha: 0.3 });
    const ccx = mx + mw / 2, ccy = my + mh / 2;
    for (const [, hex] of state.hexes) {
      const p2 = h2p(hex.coord);
      const px = ccx + p2.x * sc, py = ccy + p2.y * sc;
      if (px < mx || px > mx + mw || py < my || py > my + mh) continue;
      const col = hex.revealed ? (TC[hex.terrain]?.base ?? 0x333333) : 0x080808;
      g.rect(px - 1.2, py - 1.2, 2.4, 2.4).fill({ color: col, alpha: hex.revealed ? 0.7 : 0.15 });
    }
    const cp2 = h2p(state.playerPosition);
    g.circle(ccx + cp2.x * sc, ccy + cp2.y * sc, 3.5).fill({ color: 0xaa66ff, alpha: 0.95 });
    for (const inq of state.inquisitors) { const ip = h2p(inq.position); g.circle(ccx + ip.x * sc, ccy + ip.y * sc, 2).fill({ color: 0xff6622, alpha: 0.8 }); }
    for (const c of state.creatures) { const cp3 = h2p(c.position); const hex = state.hexes.get(hexKey(c.position.q, c.position.r)); if (hex?.revealed) g.circle(ccx + cp3.x * sc, ccy + cp3.y * sc, 1.5).fill({ color: 0xff2222, alpha: 0.6 }); }
    this._minimapLayer.addChild(g);
    const lbl = new Text({ text: "Map", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 8, fill: 0x777777 }) });
    lbl.position.set(mx, my - 12); this._minimapLayer.addChild(lbl);
  }

  private _drawParticles(state: CovenState): void {
    const t = this._time;
    const pp = state.playerPosition;

    // Only draw particles on hexes near the player (performance)
    for (const [, hex] of state.hexes) {
      if (!hex.revealed || hex.lightLevel === 0) continue;
      const dist = Math.abs(hex.coord.q - pp.q) + Math.abs(hex.coord.r - pp.r);
      if (dist > 3) continue; // only nearby hexes

      const p = h2p(hex.coord);
      const r2 = rng(hex.coord.q * 571 + hex.coord.r * 239);

      if (hex.terrain === "clearing") {
        // Fireflies — small golden dots drifting on sine paths
        for (let i = 0; i < 3; i++) {
          const phase = r2() * TAU;
          const fx = p.x + Math.sin(t * 0.8 + phase) * HEX * 0.3 + (r2() - 0.5) * HEX * 0.4;
          const fy = p.y + Math.cos(t * 0.6 + phase) * HEX * 0.2 + (r2() - 0.5) * HEX * 0.3;
          const fa = 0.15 + 0.25 * Math.max(0, Math.sin(t * 3 + phase));
          this._particleLayer.circle(fx, fy, 1.2).fill({ color: 0xffee88, alpha: fa });
          this._particleLayer.circle(fx, fy, 3).fill({ color: 0xffee88, alpha: fa * 0.15 }); // glow
        }
      } else if (hex.terrain === "swamp") {
        // Floating spores — green particles drifting upward
        for (let i = 0; i < 2; i++) {
          const phase = r2() * TAU;
          const sx = p.x + (r2() - 0.5) * HEX * 0.6;
          const sy = p.y + (r2() - 0.5) * HEX * 0.4 - ((t * 0.3 + phase) % 2) * HEX * 0.3;
          const sa = 0.15 + 0.1 * Math.sin(t * 2 + phase);
          this._particleLayer.circle(sx, sy, 0.8 + r2() * 0.5).fill({ color: 0x88cc66, alpha: sa });
        }
      } else if (hex.terrain === "cave") {
        // Dust motes — tiny grey particles floating lazily
        for (let i = 0; i < 2; i++) {
          const phase = r2() * TAU;
          const dx = p.x + Math.sin(t * 0.5 + phase) * HEX * 0.25 + (r2() - 0.5) * HEX * 0.3;
          const dy = p.y + Math.cos(t * 0.3 + phase) * HEX * 0.15 + (r2() - 0.5) * HEX * 0.2;
          this._particleLayer.circle(dx, dy, 0.6).fill({ color: 0x888888, alpha: 0.15 + 0.1 * Math.sin(t * 2 + phase) });
        }
      } else if (hex.terrain === "graveyard") {
        // Ghost wisps — faint white shapes drifting
        for (let i = 0; i < 1; i++) {
          const phase = r2() * TAU;
          const gx = p.x + Math.sin(t * 0.4 + phase) * HEX * 0.3;
          const gy = p.y - 5 + Math.sin(t * 0.3 + phase) * HEX * 0.15;
          const ga = 0.05 + 0.05 * Math.sin(t * 1.5 + phase);
          this._particleLayer.ellipse(gx, gy, 3 + Math.sin(t + phase) * 1, 2).fill({ color: 0xaaaacc, alpha: ga });
        }
      } else if (hex.terrain === "ley_line") {
        // Arcane sparks — blue-purple motes orbiting center
        for (let i = 0; i < 4; i++) {
          const a = t * 1.2 + i * TAU / 4;
          const or = HEX * 0.25 + Math.sin(t * 2 + i) * 3;
          const sx = p.x + Math.cos(a) * or;
          const sy = p.y + Math.sin(a) * or * 0.7;
          this._particleLayer.circle(sx, sy, 1).fill({ color: 0xaabbff, alpha: 0.3 + 0.2 * Math.sin(t * 3 + i) });
        }
      } else if (hex.terrain === "deep_woods") {
        // Falling leaves (occasional, slow)
        const phase = r2() * TAU;
        const leafY = ((t * 0.15 + phase) % 1) * HEX * 0.8;
        const leafX = p.x + Math.sin(t * 0.8 + phase) * HEX * 0.2 + (r2() - 0.5) * HEX * 0.3;
        this._particleLayer.ellipse(leafX, p.y - HEX * 0.3 + leafY, 1.5, 0.8).fill({ color: 0x6a4a2a, alpha: 0.2 });
      }
    }

    // Familiar companion near player (if active)
    for (const familiar of state.familiars) {
      if (!familiar.active) continue;
      const fp = h2p(pp);
      const fa = t * 1.5;
      const fx = fp.x + Math.cos(fa) * 12;
      const fy = fp.y + Math.sin(fa) * 8 - 5;
      if (familiar.type === "cat") {
        this._particleLayer.ellipse(fx, fy, 3, 2).fill({ color: 0x222222, alpha: 0.45 });
        this._particleLayer.circle(fx + 2, fy - 1, 1.5).fill({ color: 0x222222, alpha: 0.4 });
        this._particleLayer.circle(fx + 1.5, fy - 1.5, 0.5).fill({ color: 0x44ff44, alpha: 0.5 });
        this._particleLayer.circle(fx + 2.5, fy - 1.5, 0.5).fill({ color: 0x44ff44, alpha: 0.5 });
      } else if (familiar.type === "owl") {
        this._particleLayer.ellipse(fx, fy, 3, 2.5).fill({ color: 0x8a7a5a, alpha: 0.4 });
        this._particleLayer.moveTo(fx - 4, fy).bezierCurveTo(fx - 2, fy - 4, fx + 2, fy - 4, fx + 4, fy).fill({ color: 0x8a7a5a, alpha: 0.3 });
        this._particleLayer.circle(fx - 1, fy - 0.5, 1).fill({ color: 0xffcc00, alpha: 0.5 });
        this._particleLayer.circle(fx + 1, fy - 0.5, 1).fill({ color: 0xffcc00, alpha: 0.5 });
      } else if (familiar.type === "raven") {
        this._particleLayer.ellipse(fx, fy, 2.5, 2).fill({ color: 0x111111, alpha: 0.5 });
        this._particleLayer.moveTo(fx - 3, fy).bezierCurveTo(fx - 1, fy - 3, fx + 1, fy - 3, fx + 3, fy).fill({ color: 0x111122, alpha: 0.35 });
        this._particleLayer.circle(fx + 1.5, fy - 0.5, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
      } else if (familiar.type === "toad") {
        this._particleLayer.ellipse(fx, fy + 1, 3, 2).fill({ color: 0x3a5a2a, alpha: 0.45 });
        this._particleLayer.circle(fx - 1.5, fy - 1, 1).fill({ color: 0xaacc44, alpha: 0.4 });
        this._particleLayer.circle(fx + 1.5, fy - 1, 1).fill({ color: 0xaacc44, alpha: 0.4 });
      }
    }
  }

  getClickedHex(worldX: number, worldY: number, state: CovenState): HexCoord | null {
    const mx = (worldX - this._offsetX) / this._zoom, my = (worldY - this._offsetY) / this._zoom;
    for (const coord of state.adjacentHexes) { const p = h2p(coord); const dx = mx - p.x, dy = my - p.y; if (dx * dx + dy * dy < HEX * HEX * 0.7) return coord; }
    return null;
  }

  cleanup(): void {
    for (const g of this._adjacentGfx) g.destroy(); this._adjacentGfx = [];
    for (const o of this._tempObjects) o.destroy(); this._tempObjects = [];
    this._animHexes = [];
    this._mapLayer.removeChildren(); this._entityLayer.removeChildren(); this._minimapLayer.removeChildren();
    this._animLayer.clear(); this._particleLayer.clear(); this._lightGlowLayer.clear();
    this._spellFxLayer.clear(); this._creatureAnimLayer.clear();
    this._dayNightOverlay.clear(); this._lightOverlay.clear(); this.container.removeChildren();
  }
}
