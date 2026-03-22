// ---------------------------------------------------------------------------
// Exodus mode — rich procedural hex map renderer (v3 — high-detail)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { hexKey, hexDistance } from "@world/hex/HexCoord";
import type { HexCoord } from "@world/hex/HexCoord";
import { ExodusConfig } from "../config/ExodusConfig";
import type { ExodusState, ExodusHex, ExodusTerrainType } from "../state/ExodusState";
import { ExodusPhase } from "../state/ExodusState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = 48; // increased from 34 for more detail
const SQRT3 = Math.sqrt(3);
const TAU = Math.PI * 2;

const TC: Record<ExodusTerrainType, { base: number; hi: number; lo: number }> = {
  plains:   { base: 0xd4b896, hi: 0xe8d8b8, lo: 0xb89870 },
  forest:   { base: 0x3a8a3a, hi: 0x50aa50, lo: 0x286828 },
  mountain: { base: 0x8a8a9a, hi: 0xaaaabc, lo: 0x6a6a7a },
  swamp:    { base: 0x4a5a3a, hi: 0x5a6a4a, lo: 0x3a4a2a },
  coast:    { base: 0x6a9aba, hi: 0x88b8da, lo: 0x4a7a9a },
  ruins:    { base: 0xa8854f, hi: 0xc09a60, lo: 0x886a3a },
  village:  { base: 0xc8a870, hi: 0xdac090, lo: 0xa88850 },
  water:    { base: 0x1a3a5a, hi: 0x3a5a7a, lo: 0x0a2a4a },
};

function sRng(seed: number): () => number {
  let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function h2p(h: HexCoord) { return { x: HEX_SIZE * (SQRT3 * h.q + SQRT3 / 2 * h.r), y: HEX_SIZE * 1.5 * h.r }; }
function hc(cx: number, cy: number, s: number) {
  const c: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) { const a = TAU / 6 * i - Math.PI / 6; c.push({ x: cx + HEX_SIZE * s * Math.cos(a), y: cy + HEX_SIZE * s * Math.sin(a) }); }
  return c;
}
function hp(g: Graphics, c: { x: number; y: number }[]) { g.moveTo(c[0].x, c[0].y); for (let i = 1; i < 6; i++) g.lineTo(c[i].x, c[i].y); g.closePath(); }

// ---------------------------------------------------------------------------
// Procedural terrain details (scaled for 48px hexes)
// ---------------------------------------------------------------------------

function drawGrass(g: Graphics, cx: number, cy: number, rng: () => number) {
  const cols = [0x7aaa5a, 0x6a9a4a, 0x8abb6a, 0x5a8a3a, 0x9acc7a];
  for (let i = 0; i < 12; i++) {
    const bx = cx + (rng() - 0.5) * HEX_SIZE * 1.4;
    const by = cy + (rng() - 0.5) * HEX_SIZE;
    const h = 5 + rng() * 9;
    const lean = (rng() - 0.5) * 4;
    g.moveTo(bx, by);
    g.bezierCurveTo(bx + lean * 0.3, by - h * 0.4, bx + lean, by - h * 0.8, bx + lean * 1.2, by - h);
    g.stroke({ color: cols[Math.floor(rng() * cols.length)], width: 0.8 + rng() * 0.6, alpha: 0.65 });
  }
  // Wildflowers
  for (let i = 0; i < 3; i++) {
    const fx = cx + (rng() - 0.5) * HEX_SIZE;
    const fy = cy + (rng() - 0.5) * HEX_SIZE * 0.7;
    g.circle(fx, fy, 1.2).fill({ color: rng() < 0.5 ? 0xddaa44 : 0xcc5555, alpha: 0.5 });
  }
}

function drawTrees(g: Graphics, cx: number, cy: number, rng: () => number) {
  for (let i = 0; i < 3 + Math.floor(rng() * 2); i++) {
    const tx = cx + (rng() - 0.5) * HEX_SIZE * 1.2;
    const ty = cy + (rng() - 0.5) * HEX_SIZE * 0.8;
    const r = 5 + rng() * 7;
    // Trunk
    g.moveTo(tx, ty + r * 0.4).lineTo(tx, ty + r * 1.3).stroke({ color: 0x5a4030, width: 2, alpha: 0.6 });
    // Roots
    g.moveTo(tx, ty + r * 1.3).lineTo(tx - 3, ty + r * 1.5).stroke({ color: 0x5a4030, width: 1, alpha: 0.3 });
    g.moveTo(tx, ty + r * 1.3).lineTo(tx + 3, ty + r * 1.5).stroke({ color: 0x5a4030, width: 1, alpha: 0.3 });
    // Canopy layers
    g.circle(tx - 2, ty - 1, r * 0.85).fill({ color: 0x2a6a2a, alpha: 0.5 });
    g.circle(tx + 1, ty, r).fill({ color: 0x3a8a3a, alpha: 0.55 });
    g.circle(tx, ty - 3, r * 0.65).fill({ color: 0x4aaa4a, alpha: 0.3 });
    g.circle(tx - 2, ty - 4, r * 0.4).fill({ color: 0x66cc66, alpha: 0.15 }); // highlight
  }
}

function drawRocks(g: Graphics, cx: number, cy: number, rng: () => number) {
  for (let i = 0; i < 3; i++) {
    const rx = cx + (rng() - 0.5) * HEX_SIZE * 1.2;
    const ry = cy + (rng() - 0.5) * HEX_SIZE * 0.8;
    const w = 5 + rng() * 8, h = 4 + rng() * 8;
    const col = [0x888898, 0x7a7a8a, 0x9a9aaa][Math.floor(rng() * 3)];
    g.moveTo(rx - w * 0.5, ry + h * 0.2).lineTo(rx - w * 0.3, ry - h * 0.4).lineTo(rx + w * 0.2, ry - h * 0.5)
      .lineTo(rx + w * 0.5, ry).lineTo(rx + w * 0.1, ry + h * 0.3).closePath();
    g.fill({ color: col, alpha: 0.5 });
    // Snow cap
    g.moveTo(rx - w * 0.25, ry - h * 0.35).lineTo(rx + w * 0.15, ry - h * 0.48);
    g.stroke({ color: 0xeeeeff, width: 1.5, alpha: 0.35 });
  }
  // Pebbles
  for (let i = 0; i < 5; i++) {
    g.circle(cx + (rng() - 0.5) * HEX_SIZE, cy + (rng() - 0.5) * HEX_SIZE * 0.6, 1 + rng()).fill({ color: 0x7a7a8a, alpha: 0.3 });
  }
}

function drawWater(g: Graphics, cx: number, cy: number, rng: () => number, time: number) {
  // Wave lines (animated)
  for (let w = 0; w < 4; w++) {
    const wy = cy - 10 + w * 7;
    g.moveTo(cx - HEX_SIZE * 0.5, wy);
    for (let x = -HEX_SIZE * 0.5; x <= HEX_SIZE * 0.5; x += 3) {
      const wave = Math.sin((x + time * 40 + w * 20) / 10) * 2.5;
      g.lineTo(cx + x, wy + wave);
    }
    g.stroke({ color: w % 2 === 0 ? 0x4a7a9a : 0x3a6a8a, width: 1.2, alpha: 0.5 - w * 0.08 });
  }
  // Foam highlights
  for (let i = 0; i < 4; i++) {
    const fx = cx + (rng() - 0.5) * HEX_SIZE * 0.8;
    const fy = cy + (rng() - 0.5) * HEX_SIZE * 0.5;
    const foamAlpha = 0.2 * Math.max(0, Math.sin(time * 5 + i * 1.3));
    if (foamAlpha > 0.02) g.circle(fx + Math.sin(time * 2 + i) * 2, fy, 1).fill({ color: 0xddeeee, alpha: foamAlpha });
  }
  // Shimmer highlight
  g.moveTo(cx - 8, cy - 3);
  g.bezierCurveTo(cx - 4, cy - 5 + Math.sin(time * 3) * 2, cx + 4, cy - 1 + Math.sin(time * 3 + 1) * 2, cx + 8, cy - 3);
  g.stroke({ color: 0x88bbdd, width: 0.8, alpha: 0.25 });
}

function drawSwamp(g: Graphics, cx: number, cy: number, rng: () => number) {
  for (let i = 0; i < 4; i++) {
    g.ellipse(cx + (rng() - 0.5) * HEX_SIZE, cy + (rng() - 0.5) * HEX_SIZE * 0.6, 4 + rng() * 5, 2 + rng() * 3).fill({ color: 0x2a3a1a, alpha: 0.4 });
  }
  for (let i = 0; i < 6; i++) {
    const rx = cx + (rng() - 0.5) * HEX_SIZE;
    const ry = cy + (rng() - 0.5) * HEX_SIZE * 0.6;
    g.moveTo(rx, ry).lineTo(rx + (rng() - 0.5) * 3, ry - 5 - rng() * 6).stroke({ color: 0x6a7a4a, width: 0.8, alpha: 0.5 });
  }
  // Mist wisps
  for (let i = 0; i < 2; i++) {
    const mx = cx + (rng() - 0.5) * HEX_SIZE * 0.7;
    const my = cy + (rng() - 0.5) * HEX_SIZE * 0.4;
    g.ellipse(mx, my, 8 + rng() * 6, 3 + rng() * 2).fill({ color: 0x5a6a4a, alpha: 0.12 });
  }
}

function drawRuins(g: Graphics, cx: number, cy: number, rng: () => number) {
  // Broken walls
  for (let i = 0; i < 4; i++) {
    const wx = cx + (rng() - 0.5) * HEX_SIZE;
    const wy = cy + (rng() - 0.5) * HEX_SIZE * 0.6;
    const w = 5 + rng() * 8, h = 3 + rng() * 5;
    g.rect(wx, wy, w, h).fill({ color: 0x8a7a5a, alpha: 0.45 });
    g.rect(wx, wy, w, h).stroke({ color: 0x6a5a3a, width: 0.5, alpha: 0.3 });
    // Crack
    g.moveTo(wx + w * 0.3, wy).lineTo(wx + w * 0.5, wy + h).stroke({ color: 0x4a3a2a, width: 0.5, alpha: 0.3 });
  }
  // Rubble
  for (let i = 0; i < 8; i++) { g.circle(cx + (rng() - 0.5) * HEX_SIZE, cy + (rng() - 0.5) * HEX_SIZE * 0.7, 1 + rng() * 2).fill({ color: 0x7a6a4a, alpha: 0.3 }); }
  // Fallen column
  g.rect(cx - 8, cy + 3, 16, 3).fill({ color: 0x9a8a6a, alpha: 0.3 });
  g.ellipse(cx - 8, cy + 4.5, 2, 1.5).fill({ color: 0x9a8a6a, alpha: 0.35 });
}

function drawVillage(g: Graphics, cx: number, cy: number, rng: () => number) {
  for (let i = 0; i < 3; i++) {
    const hx = cx + (rng() - 0.5) * HEX_SIZE * 0.8;
    const hy = cy + (rng() - 0.5) * HEX_SIZE * 0.5;
    const w = 6 + rng() * 4, h = 5 + rng() * 3;
    g.rect(hx - w / 2, hy, w, h).fill({ color: 0xb09060, alpha: 0.5 });
    g.moveTo(hx - w / 2 - 1, hy).lineTo(hx, hy - h * 0.6).lineTo(hx + w / 2 + 1, hy).closePath().fill({ color: 0x884422, alpha: 0.5 });
    // Window
    g.rect(hx - 1, hy + 1, 2, 2).fill({ color: 0xffdd88, alpha: 0.4 });
    // Chimney smoke
    if (rng() < 0.5) g.circle(hx + w / 3, hy - h * 0.4, 2).fill({ color: 0x888888, alpha: 0.15 });
  }
  // Well
  g.circle(cx, cy + 8, 3).stroke({ color: 0x888888, width: 1, alpha: 0.4 });
  g.circle(cx, cy + 8, 1).fill({ color: 0x3a5a7a, alpha: 0.3 });
  // Path
  g.moveTo(cx - 12, cy + 10).lineTo(cx + 12, cy + 10).stroke({ color: 0x9a8a6a, width: 2.5, alpha: 0.2 });
}

function drawCoast(g: Graphics, cx: number, cy: number, rng: () => number, time: number) {
  // Sand area
  for (let i = 0; i < 8; i++) { g.circle(cx + (rng() - 0.5) * HEX_SIZE, cy + (rng() - 0.5) * HEX_SIZE * 0.7, 1.5 + rng()).fill({ color: 0xd8c8a0, alpha: 0.25 }); }
  // Animated wave lines
  for (let w = 0; w < 3; w++) {
    const wy = cy + 5 + w * 7;
    g.moveTo(cx - 14, wy);
    g.bezierCurveTo(cx - 7, wy - 3 + Math.sin(time * 2 + w) * 1.5, cx + 7, wy + 3 + Math.sin(time * 2 + w + 1) * 1.5, cx + 14, wy);
    g.stroke({ color: 0x88bbdd, width: 0.8 + w * 0.2, alpha: 0.3 - w * 0.05 });
  }
  // Shells
  for (let i = 0; i < 2; i++) {
    const sx = cx + (rng() - 0.5) * HEX_SIZE * 0.5;
    const sy = cy + rng() * HEX_SIZE * 0.3;
    g.circle(sx, sy, 1.5).fill({ color: 0xeeddcc, alpha: 0.35 });
  }
}

function drawConsumed(g: Graphics, cx: number, cy: number, rng: () => number, time: number) {
  // Large fire embers
  for (let i = 0; i < 5; i++) {
    const ex = cx + (rng() - 0.5) * HEX_SIZE * 1.1;
    const ey = cy + (rng() - 0.5) * HEX_SIZE * 0.8;
    const flicker = 0.5 + 0.5 * Math.sin(time * 8 + i * 2.3);
    g.circle(ex, ey, 2 + rng() * 2).fill({ color: 0xff6600, alpha: 0.6 * flicker });
    g.circle(ex, ey, 3 + rng() * 3).fill({ color: 0xffaa00, alpha: 0.15 * flicker }); // glow
  }
  // Small embers
  for (let i = 0; i < 8; i++) {
    g.circle(cx + (rng() - 0.5) * HEX_SIZE, cy + (rng() - 0.5) * HEX_SIZE * 0.7, 0.8 + rng()).fill({ color: rng() < 0.4 ? 0xff4400 : 0xaa2200, alpha: 0.4 + rng() * 0.3 });
  }
  // Smoke clouds
  for (let i = 0; i < 4; i++) {
    const sx = cx + (rng() - 0.5) * HEX_SIZE * 0.8;
    const sy = cy + (rng() - 0.5) * HEX_SIZE * 0.5 - 5;
    const sr = 5 + rng() * 5;
    g.circle(sx, sy - Math.sin(time * 0.5 + i) * 2, sr).fill({ color: 0x333333, alpha: 0.2 + 0.05 * Math.sin(time * 0.5 + i) });
  }
  // Scorch marks
  for (let i = 0; i < 5; i++) {
    const sx = cx + (rng() - 0.5) * HEX_SIZE;
    const sy = cy + (rng() - 0.5) * HEX_SIZE * 0.6;
    g.moveTo(sx, sy).lineTo(sx + (rng() - 0.5) * 10, sy + (rng() - 0.5) * 6).stroke({ color: 0x110000, width: 1.5, alpha: 0.4 });
  }
  // Skull accent
  const skx = cx + 5, sky = cy + 3;
  g.circle(skx, sky, 3).fill({ color: 0xddddbb, alpha: 0.4 });
  g.circle(skx - 1, sky - 0.5, 0.7).fill({ color: 0x111111, alpha: 0.6 });
  g.circle(skx + 1, sky - 0.5, 0.7).fill({ color: 0x111111, alpha: 0.6 });
  // Ruined structure fragment
  g.rect(cx - 10, cy - 4, 8, 5).fill({ color: 0x4a3a2a, alpha: 0.35 });
  g.rect(cx - 10, cy - 4, 8, 5).stroke({ color: 0x331a0a, width: 0.5, alpha: 0.3 });
}

// ---------------------------------------------------------------------------
// Caravan — detailed multi-wagon with crew
// ---------------------------------------------------------------------------

function drawCaravan(g: Graphics, x: number, y: number, members: number, time: number) {
  // === Wagon 1 (main supply) ===
  const w1x = x - 8;
  // Wheels
  for (const wx of [w1x - 6, w1x + 6]) {
    g.circle(wx, y + 7, 4).stroke({ color: 0x8a6a3a, width: 1.5, alpha: 0.7 });
    g.circle(wx, y + 7, 1.5).fill({ color: 0x6a4a2a, alpha: 0.5 });
    // Spokes
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2 + time * 1.5;
      g.moveTo(wx + Math.cos(a) * 1.5, y + 7 + Math.sin(a) * 1.5).lineTo(wx + Math.cos(a) * 3.5, y + 7 + Math.sin(a) * 3.5);
      g.stroke({ color: 0x6a4a2a, width: 0.5, alpha: 0.3 });
    }
  }
  // Bed
  g.rect(w1x - 9, y - 1, 18, 9).fill({ color: 0x8a6a3a, alpha: 0.85 });
  g.rect(w1x - 9, y - 1, 18, 9).stroke({ color: 0x6a4a2a, width: 1, alpha: 0.5 });
  // Canvas cover
  g.moveTo(w1x - 8, y - 1);
  g.bezierCurveTo(w1x - 4, y - 13, w1x + 4, y - 13, w1x + 8, y - 1);
  g.closePath();
  g.fill({ color: 0xddccaa, alpha: 0.4 });
  g.moveTo(w1x - 8, y - 1);
  g.bezierCurveTo(w1x - 4, y - 13, w1x + 4, y - 13, w1x + 8, y - 1);
  g.stroke({ color: 0xccbbaa, width: 1.5, alpha: 0.6 });
  // Cargo
  g.rect(w1x - 5, y, 5, 4).fill({ color: 0x9a7a4a, alpha: 0.5 });
  g.rect(w1x + 1, y - 1, 4, 5).fill({ color: 0xb08a5a, alpha: 0.45 });

  // === Wagon 2 (smaller) ===
  const w2x = x + 12;
  for (const wx of [w2x - 5, w2x + 5]) {
    g.circle(wx, y + 7, 3.5).stroke({ color: 0x8a6a3a, width: 1.5, alpha: 0.6 });
    g.circle(wx, y + 7, 1).fill({ color: 0x6a4a2a, alpha: 0.5 });
  }
  g.rect(w2x - 7, y, 14, 8).fill({ color: 0x8a6a3a, alpha: 0.75 });
  g.rect(w2x - 7, y, 14, 8).stroke({ color: 0x6a4a2a, width: 1, alpha: 0.4 });
  // Ox pulling
  const ox = w2x + 11;
  g.ellipse(ox, y + 3, 5, 3.5).fill({ color: 0x7a5a3a, alpha: 0.6 });
  g.circle(ox + 4, y + 1, 2.5).fill({ color: 0x7a5a3a, alpha: 0.5 });
  // Horns
  g.moveTo(ox + 3, y - 1).lineTo(ox + 2, y - 3).stroke({ color: 0xccccbb, width: 1, alpha: 0.5 });
  g.moveTo(ox + 5, y - 1).lineTo(ox + 6, y - 3).stroke({ color: 0xccccbb, width: 1, alpha: 0.5 });
  // Yoke line
  g.moveTo(w2x + 7, y + 3).lineTo(ox - 3, y + 3).stroke({ color: 0x6a4a2a, width: 1, alpha: 0.4 });

  // === Walking crew ===
  const crew = Math.min(8, Math.ceil(members / 4));
  for (let i = 0; i < crew; i++) {
    const px = x - 22 + i * 5 + (i % 2) * 1;
    const py = y + 3 + (i % 2) * 2;
    const bobY = Math.sin(time * 2 + i * 0.7) * 0.8;
    // Head
    g.circle(px, py - 6 + bobY, 2).fill({ color: 0xddbbaa, alpha: 0.7 });
    // Body
    g.moveTo(px, py - 4 + bobY).lineTo(px, py + 1 + bobY).stroke({ color: i < 2 ? 0x884422 : 0x888888, width: 1.3, alpha: 0.6 });
    // Legs (walking animation)
    const legAnim = Math.sin(time * 3 + i * 1.2) * 1.5;
    g.moveTo(px, py + 1 + bobY).lineTo(px - 1 + legAnim * 0.5, py + 5 + bobY).stroke({ color: 0x666666, width: 0.8, alpha: 0.5 });
    g.moveTo(px, py + 1 + bobY).lineTo(px + 1 - legAnim * 0.5, py + 5 + bobY).stroke({ color: 0x666666, width: 0.8, alpha: 0.5 });
    // Pack/shield (first 2 are guards with gear)
    if (i < 2) {
      g.rect(px + 1, py - 5 + bobY, 2, 3).fill({ color: 0xccccdd, alpha: 0.4 }); // shield
    } else if (i < 5) {
      g.rect(px - 2, py - 5 + bobY, 2, 2.5).fill({ color: 0x8a7a5a, alpha: 0.4 }); // pack
    }
  }

  // === Banner ===
  const flagY = y - 17;
  g.moveTo(x, flagY + 4).lineTo(x, flagY - 6).stroke({ color: 0x6a4a2a, width: 1.5, alpha: 0.8 });
  // Animated flag
  const fw = Math.sin(time * 3) * 1.5;
  g.moveTo(x, flagY - 6).lineTo(x + 7 + fw, flagY - 4).lineTo(x + 6 + fw * 0.8, flagY - 1).lineTo(x, flagY - 2).closePath();
  g.fill({ color: 0xffd700, alpha: 0.85 });
  g.stroke({ color: 0xdaa520, width: 0.5, alpha: 0.5 });
}

// ---------------------------------------------------------------------------
// Pursuer army
// ---------------------------------------------------------------------------

function drawPursuer(g: Graphics, x: number, y: number, strength: number, time: number) {
  // Dark banner
  g.moveTo(x, y - 14).lineTo(x, y - 24).stroke({ color: 0x333333, width: 2, alpha: 0.8 });
  const bf = Math.sin(time * 2.5) * 2;
  g.moveTo(x, y - 24).lineTo(x + 8 + bf, y - 21).lineTo(x + 7 + bf * 0.7, y - 17).lineTo(x, y - 19).closePath();
  g.fill({ color: 0x440000, alpha: 0.85 });
  g.stroke({ color: 0x660000, width: 0.5, alpha: 0.5 });
  // Skull on banner
  g.circle(x + 3 + bf * 0.4, y - 20.5, 1.5).fill({ color: 0xddddbb, alpha: 0.5 });

  // Spear tips
  const spears = Math.min(10, Math.ceil(strength / 6));
  for (let i = 0; i < spears; i++) {
    const sx = x - 12 + i * 3;
    const sy = y - 2 - (i % 2) * 3;
    g.moveTo(sx, sy).lineTo(sx, sy - 10).stroke({ color: 0x888888, width: 0.7, alpha: 0.4 });
    g.moveTo(sx - 1.2, sy - 10).lineTo(sx, sy - 13).lineTo(sx + 1.2, sy - 10).closePath().fill({ color: 0xaaaaaa, alpha: 0.45 });
  }

  // Army mass
  g.ellipse(x, y + 3, 16, 8).fill({ color: 0x0a0505, alpha: 0.55 });
  g.ellipse(x, y + 1, 13, 6).fill({ color: 0x331111, alpha: 0.5 });
  g.ellipse(x, y + 3, 16, 8).stroke({ color: 0x551111, width: 1, alpha: 0.3 });

  // Commander eyes
  g.circle(x - 4, y - 2, 3).fill({ color: 0xff0000, alpha: 0.9 });
  g.circle(x + 4, y - 2, 3).fill({ color: 0xff0000, alpha: 0.9 });
  g.circle(x - 4, y - 2, 1).fill({ color: 0xffff00, alpha: 0.8 });
  g.circle(x + 4, y - 2, 1).fill({ color: 0xffff00, alpha: 0.8 });

  // Jagged teeth
  for (let i = -6; i <= 6; i += 2) {
    g.moveTo(x + i, y + 5).lineTo(x + i + 1, y + 3).stroke({ color: 0xffaaaa, width: 1, alpha: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Avalon — magical island beacon
// ---------------------------------------------------------------------------

function drawAvalon(g: Graphics, x: number, y: number, time: number) {
  // Light rays
  for (let i = 0; i < 8; i++) {
    const a = (TAU / 8) * i;
    const len = 22 + 6 * Math.sin(time * 1.5 + i * 0.8);
    g.moveTo(x, y).lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke({ color: 0x88ffcc, width: 1.5, alpha: 0.18 + 0.07 * Math.sin(time * 2 + i) });
    // Ray tip glow
    g.circle(x + Math.cos(a) * len, y + Math.sin(a) * len, 2.5).fill({ color: 0x88ffcc, alpha: 0.1 });
  }

  // Aura rings
  for (let r = 0; r < 3; r++) {
    const radius = 20 + r * 10 + Math.sin(time * 2 + r * 0.7) * 3;
    g.circle(x, y, radius).stroke({ color: 0x44ffaa, width: 0.8, alpha: 0.15 - r * 0.04 });
  }

  // Radiant glow layers
  g.circle(x, y, HEX_SIZE * 0.7).fill({ color: 0x44ffaa, alpha: 0.04 });
  g.circle(x, y, HEX_SIZE * 0.5).fill({ color: 0x44ffaa, alpha: 0.07 });

  // Island
  g.ellipse(x, y + 3, 18, 10).fill({ color: 0x44aa44, alpha: 0.6 });
  g.ellipse(x, y + 3, 18, 10).stroke({ color: 0x66cc66, width: 1.5, alpha: 0.4 });
  // Sand beach
  g.ellipse(x + 8, y + 6, 5, 2).fill({ color: 0xd8c8a0, alpha: 0.25 });

  // Tree
  g.moveTo(x, y + 3).lineTo(x, y - 8).stroke({ color: 0x5a4030, width: 2, alpha: 0.7 });
  g.moveTo(x, y + 3).lineTo(x - 4, y + 6).stroke({ color: 0x5a4030, width: 1, alpha: 0.3 });
  g.moveTo(x, y + 3).lineTo(x + 4, y + 6).stroke({ color: 0x5a4030, width: 1, alpha: 0.3 });
  g.circle(x - 2, y - 9, 6).fill({ color: 0x2a6a2a, alpha: 0.65 });
  g.circle(x + 1, y - 8, 5.5).fill({ color: 0x3a8a3a, alpha: 0.55 });
  g.circle(x, y - 11, 4).fill({ color: 0x44aa44, alpha: 0.4 });
  g.circle(x - 2, y - 12, 2.5).fill({ color: 0x66cc66, alpha: 0.2 });

  // Star
  const sy = y - 20;
  for (let i = 0; i < 5; i++) {
    const a = (TAU / 5) * i - Math.PI / 2;
    const ox = x + 7 * Math.cos(a), oy = sy + 7 * Math.sin(a);
    const ia = a + Math.PI / 5;
    const ix = x + 3 * Math.cos(ia), iy = sy + 3 * Math.sin(ia);
    if (i === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy); g.lineTo(ix, iy);
  }
  g.closePath().fill({ color: 0x88ffcc, alpha: 0.8 });
  g.circle(x, sy, 3).fill({ color: 0xffffff, alpha: 0.4 });

  // Orbiting sparkles
  for (let i = 0; i < 3; i++) {
    const sa = time * 0.8 + i * TAU / 3;
    const sr = 14;
    const sx = x + Math.cos(sa) * sr;
    const ssy = y - 6 + Math.sin(sa) * sr * 0.6;
    g.circle(sx, ssy, 1.2).fill({ color: 0xffffff, alpha: 0.4 + 0.3 * Math.sin(time * 3 + i) });
  }
}

// ---------------------------------------------------------------------------
// ExodusRenderer
// ---------------------------------------------------------------------------

export class ExodusRenderer {
  readonly container = new Container();
  private _mapLayer = new Container();
  private _trailLayer = new Container();
  private _animLayer = new Graphics(); // per-frame animated effects (water, fire)
  private _roadLayer = new Graphics(); // road connections between visited hexes
  private _entityLayer = new Container();
  private _vignetteOverlay = new Graphics();
  private _dayNightOverlay = new Graphics();
  private _minimapLayer = new Container();
  private _caravanGfx = new Graphics();
  private _pursuerGfx = new Graphics();
  private _goalGfx = new Graphics();
  private _pathTrail = new Graphics();
  private _adjacentGfx: Graphics[] = [];
  private _tempObjects: (Text | Graphics)[] = [];
  private _offsetX = 0;
  private _offsetY = 0;
  private _zoom = 1.0;
  private _time = 0;
  private _visitedPath: HexCoord[] = [];
  private _animatedHexes: { coord: HexCoord; type: "water" | "coast" | "consumed"; seed: number }[] = [];
  private _visitedHexCoords: { coord: HexCoord }[] = [];
  private _vignetteBuilt = false;

  init(): void {
    this.container.addChild(this._mapLayer, this._trailLayer, this._roadLayer, this._animLayer, this._pathTrail, this._entityLayer, this._dayNightOverlay, this._vignetteOverlay, this._minimapLayer);
    this._entityLayer.addChild(this._goalGfx, this._pursuerGfx, this._caravanGfx);
  }

  drawMap(state: ExodusState, sw: number, sh: number): void {
    this._mapLayer.removeChildren(); this._trailLayer.removeChildren();
    for (const g of this._adjacentGfx) g.destroy(); this._adjacentGfx = [];
    for (const o of this._tempObjects) o.destroy(); this._tempObjects = [];
    this._animatedHexes = [];
    this._visitedHexCoords = [];

    const cp = h2p(state.caravanPosition);
    this._offsetX = sw / 2 - cp.x * this._zoom;
    this._offsetY = sh / 2 - cp.y * this._zoom;
    for (const l of [this._mapLayer, this._trailLayer, this._entityLayer, this._pathTrail]) { l.scale.set(this._zoom); l.position.set(this._offsetX, this._offsetY); }

    const ck = hexKey(state.caravanPosition.q, state.caravanPosition.r);
    if (!this._visitedPath.length || hexKey(this._visitedPath[this._visitedPath.length - 1].q, this._visitedPath[this._visitedPath.length - 1].r) !== ck) {
      this._visitedPath.push({ ...state.caravanPosition });
    }

    const drawnR = new Set<number>();
    for (const [, hex] of state.hexes) {
      const g = new Graphics();
      if (hex.consumed) { this._drawConsumedHex(g, hex); this._trailLayer.addChild(g); }
      else if (hex.revealed) {
        this._drawRevealedHex(g, hex);
        this._mapLayer.addChild(g);
        if (!drawnR.has(hex.region) && hex.visited) {
          drawnR.add(hex.region);
          const rd = ExodusConfig.REGION_DEFS[hex.region];
          if (rd) { const p = h2p(hex.coord); const l = new Text({ text: rd.name, style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 8, fill: rd.color, fontStyle: "italic" }) }); l.anchor.set(0.5); l.alpha = 0.55; l.position.set(p.x, p.y + HEX_SIZE * 0.72); this._mapLayer.addChild(l); this._tempObjects.push(l); }
        }
      } else { this._drawFogHex(g, hex); this._mapLayer.addChild(g); }
    }
    this._drawPathTrail();
    this._drawAdjacentHighlights(state);
    this._drawGoal(state);
    this._drawPursuer(state);
    this._drawCaravan(state);
    this._drawMinimap(state, sw, sh);
  }

  update(state: ExodusState, dt: number, sw: number, sh: number): void {
    this._time += dt;
    const cp = h2p(state.caravanPosition);
    const tx = sw / 2 - cp.x * this._zoom, ty = sh / 2 - cp.y * this._zoom;
    this._offsetX += (tx - this._offsetX) * Math.min(1, dt * 4);
    this._offsetY += (ty - this._offsetY) * Math.min(1, dt * 4);
    for (const l of [this._mapLayer, this._trailLayer, this._animLayer, this._roadLayer, this._entityLayer, this._pathTrail]) l.position.set(this._offsetX, this._offsetY);

    // Entity animations
    const bob = Math.sin(this._time * 2.5) * 2.5 + Math.sin(this._time * 0.7) * 0.8;
    this._caravanGfx.position.set(Math.sin(this._time * 1.1) * 1, bob);
    this._caravanGfx.alpha = 0.85 + 0.15 * Math.sin(this._time * 2);
    if (state.pursuer.active) this._pursuerGfx.alpha = 0.5 + 0.5 * Math.sin(this._time * 1.8);
    this._goalGfx.alpha = 0.55 + 0.35 * Math.sin(this._time * 1.2) + 0.1 * Math.sin(this._time * 3.7);
    this._goalGfx.rotation = Math.sin(this._time * 0.4) * 0.04;
    const aa = 0.35 + 0.2 * Math.sin(this._time * 2.2);
    for (const g of this._adjacentGfx) g.alpha = aa;

    // Per-frame animated hex effects (water waves, fire embers)
    this._animLayer.clear();
    this._animLayer.scale.set(this._zoom);
    for (const ah of this._animatedHexes) {
      const p = h2p(ah.coord);
      const rng = sRng(ah.seed + 99);
      if (ah.type === "water") drawWater(this._animLayer, p.x, p.y, rng, this._time);
      else if (ah.type === "coast") drawCoast(this._animLayer, p.x, p.y, rng, this._time);
      else if (ah.type === "consumed") drawConsumed(this._animLayer, p.x, p.y, rng, this._time);
    }

    // Road connections (drawn once, then cached — only redraw if visited changed)
    this._drawRoads();

    // Vignette (draw once)
    if (!this._vignetteBuilt) {
      this._buildVignette(sw, sh);
      this._vignetteBuilt = true;
    }

    this._drawDayNight(state, sw, sh);
  }

  private _drawDayNight(state: ExodusState, sw: number, sh: number): void {
    this._dayNightOverlay.clear();
    let a = 0, c = 0;
    switch (state.phase) {
      case ExodusPhase.DAWN: a = 0.1; c = 0x221100; break;
      case ExodusPhase.NIGHT: a = 0.28; c = 0x000033; break;
      case ExodusPhase.BATTLE: a = 0.06 + 0.03 * Math.sin(this._time * 5); c = 0x330000; break;
      case ExodusPhase.GAME_OVER: a = 0.5; c = 0x000000; break;
      case ExodusPhase.VICTORY: a = 0.06; c = 0x002200; break;
    }
    if (a > 0) this._dayNightOverlay.rect(0, 0, sw, sh).fill({ color: c, alpha: a });
  }

  private _drawRevealedHex(g: Graphics, hex: ExodusHex): void {
    const p = h2p(hex.coord);
    const t = TC[hex.terrain];
    const alpha = hex.visited ? 0.92 : 0.65;
    const rng = sRng(hex.coord.q * 1000 + hex.coord.r * 37 + 42);

    const outer = hc(p.x, p.y, 0.95);
    hp(g, outer); g.fill({ color: t.base, alpha });
    hp(g, hc(p.x, p.y + 2, 0.7)); g.fill({ color: t.lo, alpha: 0.12 });
    hp(g, hc(p.x, p.y - 1, 0.72)); g.fill({ color: t.hi, alpha: 0.15 });
    const rd = ExodusConfig.REGION_DEFS[hex.region];
    if (rd) { hp(g, hc(p.x, p.y, 0.93)); g.stroke({ color: rd.color, width: 1.2, alpha: 0.18 }); }
    hp(g, outer); g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });

    // Hex texture (subtle cross-hatch for parchment feel)
    if (hex.visited) {
      for (let ti = 0; ti < 3; ti++) {
        const tx1 = p.x - HEX_SIZE * 0.3 + rng() * HEX_SIZE * 0.6;
        const ty1 = p.y - HEX_SIZE * 0.2 + rng() * HEX_SIZE * 0.4;
        g.moveTo(tx1, ty1).lineTo(tx1 + 4 + rng() * 4, ty1 + 2 + rng() * 3);
        g.stroke({ color: t.lo, width: 0.4, alpha: 0.08 });
      }
    }

    if (hex.visited || alpha > 0.6) {
      switch (hex.terrain) {
        case "plains": drawGrass(g, p.x, p.y, rng); break;
        case "forest": drawTrees(g, p.x, p.y, rng); break;
        case "mountain": drawRocks(g, p.x, p.y, rng); break;
        case "water": break; // drawn in animated layer
        case "swamp": drawSwamp(g, p.x, p.y, rng); break;
        case "ruins": drawRuins(g, p.x, p.y, rng); break;
        case "village": drawVillage(g, p.x, p.y, rng); break;
        case "coast": break; // drawn in animated layer
      }
    }

    // Track hexes that need per-frame animation
    if (hex.terrain === "water" || hex.terrain === "coast") {
      this._animatedHexes.push({ coord: hex.coord, type: hex.terrain as "water" | "coast", seed: hex.coord.q * 1000 + hex.coord.r * 37 });
    }
    if (hex.visited) {
      this._visitedHexCoords.push({ coord: hex.coord });
    }

    if (hex.dangerLevel >= 4 && !hex.visited) { const t2 = new Text({ text: "\u2620", style: new TextStyle({ fontSize: 10, fill: 0xff4444 }) }); t2.anchor.set(0.5); t2.position.set(p.x + HEX_SIZE * 0.32, p.y - HEX_SIZE * 0.35); g.addChild(t2); }
    else if (hex.dangerLevel >= 3 && !hex.visited) { const t2 = new Text({ text: "!", style: new TextStyle({ fontSize: 11, fill: 0xff8844, fontWeight: "bold" }) }); t2.anchor.set(0.5); t2.position.set(p.x + HEX_SIZE * 0.32, p.y - HEX_SIZE * 0.35); g.addChild(t2); }
    if (hex.loot && !hex.visited) { const t2 = new Text({ text: "\u2726", style: new TextStyle({ fontSize: 11, fill: 0xffd700 }) }); t2.anchor.set(0.5); t2.position.set(p.x - HEX_SIZE * 0.28, p.y - HEX_SIZE * 0.35); g.addChild(t2); }
  }

  private _drawConsumedHex(g: Graphics, hex: ExodusHex): void {
    const p = h2p(hex.coord);
    const outer = hc(p.x, p.y, 0.95);
    hp(g, outer); g.fill({ color: 0x0a0505, alpha: 0.94 });
    hp(g, hc(p.x, p.y, 0.8)); g.fill({ color: 0x220808, alpha: 0.2 });
    hp(g, outer); g.stroke({ color: 0x661111, width: 1.5, alpha: 0.4 });
    // Static consumed detail (scorch marks, skull, ruins)
    const rng = sRng(hex.coord.q * 777 + hex.coord.r * 13);
    for (let i = 0; i < 5; i++) {
      const sx = p.x + (rng() - 0.5) * HEX_SIZE;
      const sy = p.y + (rng() - 0.5) * HEX_SIZE * 0.6;
      g.moveTo(sx, sy).lineTo(sx + (rng() - 0.5) * 10, sy + (rng() - 0.5) * 6).stroke({ color: 0x110000, width: 1.5, alpha: 0.4 });
    }
    const skx = p.x + 5, sky = p.y + 3;
    g.circle(skx, sky, 3).fill({ color: 0xddddbb, alpha: 0.4 });
    g.circle(skx - 1, sky - 0.5, 0.7).fill({ color: 0x111111, alpha: 0.6 });
    g.circle(skx + 1, sky - 0.5, 0.7).fill({ color: 0x111111, alpha: 0.6 });
    g.rect(p.x - 10, p.y - 4, 8, 5).fill({ color: 0x4a3a2a, alpha: 0.35 });
    // Track for animated fire/smoke overlay
    this._animatedHexes.push({ coord: hex.coord, type: "consumed", seed: hex.coord.q * 777 + hex.coord.r * 13 });
  }

  private _drawFogHex(g: Graphics, hex: ExodusHex): void {
    const p = h2p(hex.coord);
    hp(g, hc(p.x, p.y, 0.95)); g.fill({ color: 0x08080e, alpha: 0.4 });
    hp(g, hc(p.x, p.y, 0.95)); g.stroke({ color: 0x111122, width: 0.5, alpha: 0.2 });
    // Stippled fog texture (mystery dots)
    const rng = sRng(hex.coord.q * 333 + hex.coord.r * 17);
    for (let i = 0; i < 6; i++) {
      const dx = p.x + (rng() - 0.5) * HEX_SIZE * 0.9;
      const dy = p.y + (rng() - 0.5) * HEX_SIZE * 0.6;
      g.circle(dx, dy, 0.5 + rng() * 0.8).fill({ color: 0x151520, alpha: 0.3 + rng() * 0.2 });
    }
    // Mystery symbol on some fog hexes
    if (hex.coord.q % 3 === 0 && hex.coord.r % 2 === 0) {
      const t = new Text({ text: "?", style: new TextStyle({ fontSize: 9, fill: 0x222233, fontStyle: "italic" }) });
      t.anchor.set(0.5); t.alpha = 0.3; t.position.set(p.x, p.y); g.addChild(t);
    }
  }

  private _drawPathTrail(): void {
    this._pathTrail.clear();
    if (this._visitedPath.length < 2) return;
    for (let i = 1; i < this._visitedPath.length; i++) {
      const prev = h2p(this._visitedPath[i - 1]), curr = h2p(this._visitedPath[i]);
      const dx = curr.x - prev.x, dy = curr.y - prev.y, len = Math.sqrt(dx * dx + dy * dy);
      const dots = Math.max(2, Math.floor(len / 6));
      const age = (this._visitedPath.length - i) / this._visitedPath.length;
      for (let d = 0; d < dots; d++) { const t = d / dots; this._pathTrail.circle(prev.x + dx * t, prev.y + dy * t, 1.2).fill({ color: 0xdaa520, alpha: 0.1 + age * 0.15 }); }
    }
  }

  private _drawAdjacentHighlights(state: ExodusState): void {
    for (const coord of state.adjacentHexes) {
      const p = h2p(coord);
      const g = new Graphics();
      hp(g, hc(p.x, p.y, 0.88)); g.stroke({ color: 0xffffff, width: 2.5, alpha: 0.45 });
      hp(g, hc(p.x, p.y, 0.82)); g.fill({ color: 0xffffff, alpha: 0.05 });
      hp(g, hc(p.x, p.y, 0.78)); g.stroke({ color: 0xffffff, width: 1, alpha: 0.18 });
      const hex = state.hexes.get(hexKey(coord.q, coord.r));
      const cost = hex ? (ExodusConfig.TERRAIN_COST[hex.terrain] ?? 1) : 1;
      if (cost >= 1.5) { const t = new Text({ text: cost >= 2 ? "Slow" : "Rough", style: new TextStyle({ fontSize: 8, fill: 0xffaa44, fontWeight: "bold" }) }); t.anchor.set(0.5); t.position.set(p.x, p.y + HEX_SIZE * 0.5); g.addChild(t); }
      g.eventMode = "static"; g.cursor = "pointer";
      g.hitArea = { contains: (mx: number, my: number) => { const dx = mx - p.x, dy = my - p.y; return dx * dx + dy * dy < HEX_SIZE * HEX_SIZE * 0.7; }};
      this._entityLayer.addChild(g); this._adjacentGfx.push(g);
    }
  }

  private _drawCaravan(state: ExodusState): void {
    const p = h2p(state.caravanPosition);
    const g = this._caravanGfx; g.clear(); while (g.children.length) g.removeChildAt(0);
    g.circle(p.x, p.y, HEX_SIZE * 0.65).fill({ color: 0xffd700, alpha: 0.05 });
    g.circle(p.x, p.y, HEX_SIZE * 0.5).fill({ color: 0xffd700, alpha: 0.08 });
    drawCaravan(g, p.x, p.y, state.members.length, this._time);
  }

  private _drawPursuer(state: ExodusState): void {
    const g = this._pursuerGfx; g.clear(); while (g.children.length) g.removeChildAt(0);
    if (!state.pursuer.active) return;
    const p = h2p(state.pursuer.position);
    g.circle(p.x, p.y, HEX_SIZE * 0.75).fill({ color: 0x220000, alpha: 0.15 });
    g.circle(p.x, p.y, HEX_SIZE * 0.6).fill({ color: 0x330000, alpha: 0.25 });
    drawPursuer(g, p.x, p.y, state.pursuer.strength, this._time);
    const st = new Text({ text: `${state.pursuer.strength}`, style: new TextStyle({ fontSize: 8, fill: 0xff6666 }) });
    st.anchor.set(0.5); st.position.set(p.x, p.y + HEX_SIZE * 0.65); g.addChild(st);
  }

  private _drawGoal(state: ExodusState): void {
    const g = this._goalGfx; g.clear(); while (g.children.length) g.removeChildAt(0);
    const p = h2p(state.goalHex);
    drawAvalon(g, p.x, p.y, this._time);
    const lbl = new Text({ text: "\u2726 Avalon \u2726", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 10, fill: 0x88ffdd, fontWeight: "bold" }) });
    lbl.anchor.set(0.5); lbl.position.set(p.x, p.y + HEX_SIZE * 0.75); g.addChild(lbl);
  }

  private _drawMinimap(state: ExodusState, sw: number, sh: number): void {
    this._minimapLayer.removeChildren();
    const g = new Graphics();
    const mw = 140, mh = 110, mx = sw - mw - 10, my = sh - mh - 10;
    const sc = mw / (state.mapRadius * 2 * SQRT3 * 0.8);
    g.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 4).fill({ color: 0x000000, alpha: 0.6 });
    g.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 4).stroke({ color: 0xdaa520, width: 1, alpha: 0.3 });
    const ccx = mx + mw / 2, ccy = my + mh / 2;
    for (const [, hex] of state.hexes) {
      const hp2 = h2p(hex.coord);
      const px = ccx + hp2.x * sc, py = ccy + hp2.y * sc;
      if (px < mx || px > mx + mw || py < my || py > my + mh) continue;
      let col = 0x222222;
      if (hex.consumed) col = 0x440000;
      else if (hex.revealed) col = TC[hex.terrain]?.base ?? 0x666666;
      g.rect(px - 1.2, py - 1.2, 2.4, 2.4).fill({ color: col, alpha: hex.revealed ? 0.8 : 0.3 });
    }
    const cp2 = h2p(state.caravanPosition);
    g.circle(ccx + cp2.x * sc, ccy + cp2.y * sc, 3.5).fill({ color: 0xffd700, alpha: 0.95 });
    if (state.pursuer.active) { const pp = h2p(state.pursuer.position); g.circle(ccx + pp.x * sc, ccy + pp.y * sc, 2.5).fill({ color: 0xff2222, alpha: 0.9 }); }
    const gp = h2p(state.goalHex);
    g.circle(ccx + gp.x * sc, ccy + gp.y * sc, 3).fill({ color: 0x44ffaa, alpha: 0.9 });
    this._minimapLayer.addChild(g);
    const lbl = new Text({ text: "Map", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 8, fill: 0x888888 }) });
    lbl.position.set(mx, my - 12); this._minimapLayer.addChild(lbl);
  }

  // Road connections between visited hexes
  private _lastRoadCount = 0;
  private _drawRoads(): void {
    if (this._visitedHexCoords.length === this._lastRoadCount) return; // no change
    this._lastRoadCount = this._visitedHexCoords.length;
    this._roadLayer.clear();
    this._roadLayer.scale.set(this._zoom);

    // Draw dotted road segments between adjacent visited hexes
    const visitedSet = new Set(this._visitedHexCoords.map(v => hexKey(v.coord.q, v.coord.r)));
    for (const vh of this._visitedHexCoords) {
      const p = h2p(vh.coord);
      // Check each of 6 neighbors
      for (let d = 0; d < 6; d++) {
        const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
        const nq = vh.coord.q + dirs[d][0], nr = vh.coord.r + dirs[d][1];
        const nk = hexKey(nq, nr);
        if (visitedSet.has(nk) && nk > hexKey(vh.coord.q, vh.coord.r)) { // avoid double-draw
          const np = h2p({ q: nq, r: nr });
          // Dashed road line
          const dx = np.x - p.x, dy = np.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const dashes = Math.floor(len / 6);
          for (let i = 0; i < dashes; i++) {
            const t1 = (i + 0.2) / dashes, t2 = (i + 0.7) / dashes;
            this._roadLayer.moveTo(p.x + dx * t1, p.y + dy * t1).lineTo(p.x + dx * t2, p.y + dy * t2);
            this._roadLayer.stroke({ color: 0x9a8a6a, width: 1.5, alpha: 0.15 });
          }
        }
      }
    }
  }

  // Atmospheric vignette (darkens screen edges for focus)
  private _buildVignette(sw: number, sh: number): void {
    this._vignetteOverlay.clear();
    const edgeW = sw * 0.15;
    const edgeH = sh * 0.15;
    // Top
    this._vignetteOverlay.rect(0, 0, sw, edgeH).fill({ color: 0x000000, alpha: 0.2 });
    // Bottom
    this._vignetteOverlay.rect(0, sh - edgeH, sw, edgeH).fill({ color: 0x000000, alpha: 0.15 });
    // Left
    this._vignetteOverlay.rect(0, 0, edgeW, sh).fill({ color: 0x000000, alpha: 0.12 });
    // Right
    this._vignetteOverlay.rect(sw - edgeW, 0, edgeW, sh).fill({ color: 0x000000, alpha: 0.12 });
    // Corners (extra dark)
    const co = 80;
    this._vignetteOverlay.circle(0, 0, co).fill({ color: 0x000000, alpha: 0.15 });
    this._vignetteOverlay.circle(sw, 0, co).fill({ color: 0x000000, alpha: 0.15 });
    this._vignetteOverlay.circle(0, sh, co).fill({ color: 0x000000, alpha: 0.15 });
    this._vignetteOverlay.circle(sw, sh, co).fill({ color: 0x000000, alpha: 0.15 });
  }

  getClickedHex(worldX: number, worldY: number, state: ExodusState): HexCoord | null {
    const mx = (worldX - this._offsetX) / this._zoom, my = (worldY - this._offsetY) / this._zoom;
    for (const coord of state.adjacentHexes) { const p = h2p(coord); const dx = mx - p.x, dy = my - p.y; if (dx * dx + dy * dy < HEX_SIZE * HEX_SIZE * 0.7) return coord; }
    return null;
  }

  cleanup(): void {
    for (const g of this._adjacentGfx) g.destroy(); this._adjacentGfx = [];
    for (const o of this._tempObjects) o.destroy(); this._tempObjects = [];
    this._visitedPath = []; this._animatedHexes = []; this._visitedHexCoords = [];
    this._vignetteBuilt = false; this._lastRoadCount = 0;
    this._mapLayer.removeChildren(); this._trailLayer.removeChildren(); this._entityLayer.removeChildren();
    this._minimapLayer.removeChildren(); this._pathTrail.clear(); this._animLayer.clear();
    this._roadLayer.clear(); this._dayNightOverlay.clear(); this._vignetteOverlay.clear();
    this.container.removeChildren();
  }
}
