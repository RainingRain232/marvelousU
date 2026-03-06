// Renders the overworld tile map, party sprite, entities, and fog of war
import { Container, Graphics, Text, AnimatedSprite } from "pixi.js";
import { OverworldTileType, UnitType, UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { OverworldState, OverworldEntity, RoamingEnemyData, ShrineData, HerbNodeData, FishingSpotData } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { GamePhase } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";
import { HamletRenderer } from "@view/entities/HamletRenderer";

// ---------------------------------------------------------------------------
// Tile colours
// ---------------------------------------------------------------------------

const TILE_COLORS: Record<string, number> = {
  [OverworldTileType.GRASS]: 0x4a8c3f,
  [OverworldTileType.FOREST]: 0x2d6b2d,
  [OverworldTileType.MOUNTAIN]: 0x7a7a7a,
  [OverworldTileType.WATER]: 0x3366aa,
  [OverworldTileType.PATH]: 0xc4a76c,
  [OverworldTileType.SAND]: 0xd4b86a,
  [OverworldTileType.SNOW]: 0xe8e8f0,
};

const FOG_COLOR = 0x111122;
const FOG_ALPHA = 0.7;

// ---------------------------------------------------------------------------
// Tile hash & RNG (borrowed from world hex renderer)
// ---------------------------------------------------------------------------

function _tileHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) >>> 0;
}

function _hashFloat(x: number, y: number, seed: number): number {
  return (_tileHash(x, y, seed) & 0x7fffffff) / 0x7fffffff;
}

class TileRng {
  private _x: number;
  private _y: number;
  private _idx = 0;
  constructor(x: number, y: number) { this._x = x; this._y = y; }
  next(): number { return _hashFloat(this._x, this._y, 9999 + this._idx++); }
  nextInt(max: number): number { return _tileHash(this._x, this._y, 9999 + this._idx++) % max; }
}

function _darken(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const gc = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (Math.min(r, 255) << 16) | (Math.min(gc, 255) << 8) | Math.min(b, 255);
}

function _lighten(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const gc = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (gc << 8) | b;
}

// ---------------------------------------------------------------------------
// Terrain base painting (organic splotches like world hex tiles)
// ---------------------------------------------------------------------------

function _paintTileBase(
  g: Graphics, cx: number, cy: number, ts: number,
  baseColor: number, splotchColors: number[], rng: TileRng,
  splotchCount = 8, extraFn?: (g: Graphics, cx: number, cy: number, ts: number, rng: TileRng) => void,
): void {
  // Organic color splotches
  for (let i = 0; i < splotchCount; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.95;
    const ay = cy + (rng.next() - 0.5) * ts * 0.95;
    const r = ts * (0.12 + rng.next() * 0.25);
    const col = splotchColors[rng.nextInt(splotchColors.length)];
    g.circle(ax, ay, r);
    g.fill({ color: col, alpha: 0.1 + rng.next() * 0.15 });
  }
  // Fine texture
  for (let i = 0; i < 8; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.9;
    const s = 1 + rng.next() * 3;
    g.rect(ax, ay, s, s * 0.6);
    g.fill({ color: _darken(baseColor, 0.7 + rng.next() * 0.3), alpha: 0.04 + rng.next() * 0.04 });
  }
  if (extraFn) extraFn(g, cx, cy, ts, rng);
}

// ---------------------------------------------------------------------------
// Terrain decoration drawing functions (adapted from world hex)
// ---------------------------------------------------------------------------

function _drawOWGrassTufts(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number): void {
  const grassColors = [0x3d8829, 0x55aa3d, 0x4a9930, 0x62b848, 0x358822];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.9;
    const h = ts * (0.12 + rng.next() * 0.18);
    const w = ts * (0.06 + rng.next() * 0.06);
    const blades = 2 + Math.floor(rng.next() * 3);
    const alpha = 0.4 + rng.next() * 0.4;
    const gc = grassColors[rng.nextInt(grassColors.length)];
    for (let b = 0; b < blades; b++) {
      const bOff = (b - (blades - 1) / 2) * (w / blades);
      const tipSway = (rng.next() - 0.5) * w * 1.5;
      g.moveTo(ax + bOff * 0.3, ay);
      g.bezierCurveTo(
        ax + bOff * 0.6, ay - h * 0.3,
        ax + bOff + tipSway * 0.5, ay - h * 0.65,
        ax + tipSway, ay - h,
      );
      g.stroke({ color: _lighten(gc, 0.9 + rng.next() * 0.35), width: 0.8 + rng.next() * 0.5, alpha });
    }
  }
}

function _drawOWFlowers(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number): void {
  const palettes = [
    [0xff6688, 0xff4466], [0xffaa44, 0xff8822], [0xffee55, 0xddcc33],
    [0xcc88ff, 0xaa66dd], [0xffffff, 0xdddddd],
  ];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.85;
    const r = 1.5 + rng.next() * 2.5;
    const pal = palettes[rng.nextInt(palettes.length)];
    const petals = 4 + Math.floor(rng.next() * 2);
    const alpha = 0.65 + rng.next() * 0.3;
    // Stem
    const stemH = 3 + rng.next() * 5;
    g.moveTo(ax, ay + r);
    g.lineTo(ax + (rng.next() - 0.5) * 2, ay + r + stemH);
    g.stroke({ color: 0x3a7a22, width: 0.6, alpha });
    // Petals
    for (let p = 0; p < petals; p++) {
      const pa = (Math.PI * 2 / petals) * p + rng.next() * 0.4;
      const pr = r * (0.5 + rng.next() * 0.15);
      g.ellipse(ax + Math.cos(pa) * pr, ay + Math.sin(pa) * pr, r * 0.4, r * 0.25);
      g.fill({ color: rng.next() < 0.6 ? pal[0] : pal[1], alpha });
    }
    // Center
    g.circle(ax, ay, r * 0.25);
    g.fill({ color: 0xffdd44, alpha });
  }
}

function _drawOWRocks(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number): void {
  const rockColors = [0x888888, 0x777772, 0x8a8a80, 0x6e6e68];
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.8;
    const w = ts * (0.08 + rng.next() * 0.12);
    const h = ts * (0.05 + rng.next() * 0.08);
    const col = rockColors[rng.nextInt(rockColors.length)];
    // Shadow
    g.ellipse(ax + 1.5, ay + 1, w * 1.05, h * 0.4);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // Rock
    g.ellipse(ax, ay, w, h);
    g.fill({ color: col, alpha: 0.65 + rng.next() * 0.25 });
    // Highlight
    g.ellipse(ax - w * 0.15, ay - h * 0.3, w * 0.4, h * 0.3);
    g.fill({ color: _lighten(col, 1.4), alpha: 0.2 });
  }
}

function _drawOWTrees(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number, treeType: string): void {
  const trees: { x: number; y: number; sc: number }[] = [];
  for (let i = 0; i < count; i++) {
    trees.push({
      x: cx + (rng.next() - 0.5) * ts * 0.85,
      y: cy + (rng.next() - 0.5) * ts * 0.75,
      sc: 0.6 + rng.next() * 0.5,
    });
  }
  trees.sort((a, b) => a.y - b.y);

  for (const t of trees) {
    const sc = t.sc * ts / 40; // scale relative to tile
    if (treeType === "pine") {
      const trunkH = (10 + rng.next() * 8) * sc;
      const trunkW = (2 + rng.next() * 1.5) * sc;
      // Shadow
      g.ellipse(t.x + 2 * sc, t.y + 1, trunkW * 2, 2.5 * sc);
      g.fill({ color: 0x000000, alpha: 0.1 });
      // Trunk
      g.rect(t.x - trunkW * 0.4, t.y - trunkH, trunkW * 0.8, trunkH);
      g.fill({ color: 0x5a3a1a });
      // Layers
      const layers = 3;
      for (let l = 0; l < layers; l++) {
        const lw = (10 + (layers - l) * 6 + rng.next() * 4) * sc;
        const lh = (8 + rng.next() * 5) * sc;
        const ly = t.y - trunkH - l * (7 * sc) + 3 * sc;
        const gc = [0x1a5520, 0x2a6628, 0x1a4a1e][rng.nextInt(3)];
        g.moveTo(t.x, ly - lh);
        g.lineTo(t.x - lw / 2, ly);
        g.lineTo(t.x + lw / 2, ly);
        g.closePath();
        g.fill({ color: gc });
        // Shadow face
        g.moveTo(t.x, ly - lh);
        g.lineTo(t.x + lw * 0.1, ly);
        g.lineTo(t.x + lw / 2, ly);
        g.closePath();
        g.fill({ color: _darken(gc, 0.7), alpha: 0.25 });
      }
    } else {
      // Deciduous
      const trunkH = (8 + rng.next() * 7) * sc;
      const trunkW = (2 + rng.next() * 1.5) * sc;
      const canopyR = (9 + rng.next() * 7) * sc;
      const ty = t.y - trunkH - canopyR * 0.5;
      // Shadow
      g.ellipse(t.x + 2 * sc, t.y + 1, canopyR * 0.9, 3 * sc);
      g.fill({ color: 0x000000, alpha: 0.1 });
      // Trunk
      g.rect(t.x - trunkW * 0.4, t.y - trunkH, trunkW * 0.8, trunkH);
      g.fill({ color: 0x6b4a2a });
      // Canopy blobs
      const gc = [0x3a8a2e, 0x4a9a38, 0x55a844, 0x358828][rng.nextInt(4)];
      g.circle(t.x, ty, canopyR * 0.75);
      g.fill({ color: gc, alpha: 0.6 });
      for (let b = 0; b < 5; b++) {
        const ba = rng.next() * Math.PI * 2;
        const bd = canopyR * 0.3 * rng.next();
        const br = canopyR * (0.35 + rng.next() * 0.35);
        g.circle(t.x + Math.cos(ba) * bd, ty + Math.sin(ba) * bd, br);
        g.fill({ color: _lighten(gc, 0.85 + rng.next() * 0.4), alpha: 0.25 + rng.next() * 0.2 });
      }
      // Highlight
      g.circle(t.x - canopyR * 0.2, ty - canopyR * 0.25, canopyR * 0.3);
      g.fill({ color: _lighten(gc, 1.4), alpha: 0.15 });
    }
  }
}

function _drawOWFerns(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number): void {
  for (let i = 0; i < count; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.8;
    const size = ts * (0.1 + rng.next() * 0.12);
    const alpha = 0.4 + rng.next() * 0.3;
    const gc = [0x3a8a28, 0x4a9a35, 0x2a7a20][rng.nextInt(3)];
    // Central stem
    g.moveTo(ax, ay);
    g.lineTo(ax, ay - size);
    g.stroke({ color: gc, width: 0.8, alpha });
    // Fronds
    const fronds = 3 + Math.floor(rng.next() * 3);
    for (let f = 0; f < fronds; f++) {
      const fy = ay - size * (0.2 + f * 0.6 / fronds);
      const fLen = size * (0.3 + 0.15 * (1 - f / fronds));
      for (const dir of [-1, 1]) {
        g.moveTo(ax, fy);
        g.quadraticCurveTo(ax + dir * fLen * 0.5, fy - fLen * 0.2, ax + dir * fLen, fy + fLen * 0.1);
        g.stroke({ color: _lighten(gc, 1 + rng.next() * 0.2), width: 0.6, alpha });
      }
    }
  }
}

function _drawOWWaves(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng): void {
  // Deep caustic shapes
  for (let i = 0; i < 4; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.8;
    g.moveTo(ax, ay);
    for (let p = 0; p < 3; p++) {
      g.lineTo(ax + (rng.next() - 0.5) * ts * 0.4, ay + (rng.next() - 0.5) * ts * 0.3);
    }
    g.closePath();
    g.fill({ color: rng.next() < 0.5 ? 0x1a3a70 : 0x2a5090, alpha: 0.06 });
  }
  // Wave ripples
  const waveColors = [0x5588cc, 0x77aadd, 0x4477bb, 0x6699cc];
  for (let i = 0; i < 6; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.85;
    const w = ts * (0.1 + rng.next() * 0.25);
    g.moveTo(ax - w, ay);
    g.bezierCurveTo(ax - w * 0.3, ay - 2 - rng.next() * 3, ax + w * 0.3, ay + 1 + rng.next() * 2, ax + w, ay);
    g.stroke({ color: waveColors[rng.nextInt(waveColors.length)], width: 0.6 + rng.next() * 0.8, alpha: 0.15 + rng.next() * 0.15 });
  }
  // Foam patches
  for (let i = 0; i < 3; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.8;
    const ay = cy + (rng.next() - 0.5) * ts * 0.7;
    const w = ts * (0.05 + rng.next() * 0.12);
    g.ellipse(ax, ay, w, w * 0.25);
    g.fill({ color: 0xffffff, alpha: 0.04 + rng.next() * 0.05 });
  }
  // Sparkles
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.85;
    g.circle(ax, ay, 0.6 + rng.next() * 1.5);
    g.fill({ color: 0xffffff, alpha: 0.1 + rng.next() * 0.2 });
  }
}

function _drawOWMountainPeaks(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng, count: number): void {
  const peaks: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < count; i++) {
    peaks.push({
      x: cx + (rng.next() - 0.5) * ts * 0.7,
      y: cy + (rng.next() - 0.5) * ts * 0.5,
      w: ts * (0.2 + rng.next() * 0.25),
      h: ts * (0.3 + rng.next() * 0.35),
    });
  }
  peaks.sort((a, b) => a.y - b.y);
  for (const p of peaks) {
    // Scree
    for (let r = 0; r < 2; r++) {
      const rx = p.x + (rng.next() - 0.5) * p.w * 0.8;
      const ry = p.y - rng.next() * p.h * 0.05;
      g.ellipse(rx, ry, 2 + rng.next() * 3, 1 + rng.next() * 2);
      g.fill({ color: 0x5a5a62, alpha: 0.3 });
    }
    // Shadow
    g.moveTo(p.x - p.w / 2 + 3, p.y + 3);
    g.lineTo(p.x + 2, p.y - p.h + 3);
    g.lineTo(p.x + p.w / 2 + 3, p.y + 3);
    g.closePath();
    g.fill({ color: 0x000000, alpha: 0.1 });
    const mc = [0x6a6a72, 0x7a7a82, 0x626268][rng.nextInt(3)];
    // Right face
    g.moveTo(p.x + p.w * 0.05, p.y);
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w / 2, p.y);
    g.closePath();
    g.fill({ color: _lighten(mc, 1.15), alpha: 0.9 });
    // Left face (shadow)
    g.moveTo(p.x - p.w / 2, p.y);
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * 0.05, p.y);
    g.closePath();
    g.fill({ color: _darken(mc, 0.75), alpha: 0.9 });
    // Ridge line
    g.moveTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * 0.05, p.y);
    g.stroke({ color: _darken(mc, 0.5), width: 0.8, alpha: 0.25 });
    // Rock cracks
    for (let c = 0; c < 2; c++) {
      const cy2 = p.y - p.h * (0.15 + rng.next() * 0.5);
      const cxO = (rng.next() - 0.5) * p.w * 0.3;
      g.moveTo(p.x + cxO, cy2);
      g.lineTo(p.x + cxO + (rng.next() - 0.5) * 6, cy2 + rng.next() * 6);
      g.stroke({ color: _darken(mc, 0.5), width: 0.5, alpha: 0.15 });
    }
    // Snow cap
    const snowH = 0.2 + rng.next() * 0.15;
    g.moveTo(p.x - p.w * snowH * 0.6, p.y - p.h * (1 - snowH));
    g.lineTo(p.x, p.y - p.h);
    g.lineTo(p.x + p.w * snowH * 0.5, p.y - p.h * (1 - snowH * 0.85));
    g.closePath();
    g.fill({ color: 0xeeeef4, alpha: 0.8 });
  }
}

function _drawOWSandDeco(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng): void {
  // Sand dunes
  for (let i = 0; i < 3; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.75;
    const w = ts * (0.2 + rng.next() * 0.3);
    const h = ts * (0.06 + rng.next() * 0.1);
    g.ellipse(ax, ay, w, h);
    g.fill({ color: 0xe8d080, alpha: 0.15 + rng.next() * 0.1 });
    g.ellipse(ax, ay + h * 0.3, w * 0.95, h * 0.5);
    g.fill({ color: 0xb89844, alpha: 0.08 });
  }
  // Wind streaks
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.85;
    const w = ts * (0.08 + rng.next() * 0.18);
    g.moveTo(ax - w, ay);
    g.quadraticCurveTo(ax, ay - 1 - rng.next() * 2, ax + w, ay);
    g.stroke({ color: rng.next() < 0.5 ? 0xd0b860 : 0xc0a850, width: 0.4, alpha: 0.1 });
  }
  // Features: cacti, dry bushes, rocks
  for (let i = 0; i < 3; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.8;
    const ay = cy + (rng.next() - 0.5) * ts * 0.75;
    const feat = rng.next();
    if (feat < 0.3) {
      // Cactus
      const ch = ts * (0.15 + rng.next() * 0.2);
      g.rect(ax - 1.5, ay - ch, 3, ch);
      g.fill({ color: 0x4a8a30, alpha: 0.75 });
      // Arms
      const armH = ch * (0.35 + rng.next() * 0.2);
      g.rect(ax - 6, ay - armH, 5, 1.5);
      g.fill({ color: 0x4a8a30, alpha: 0.75 });
      g.rect(ax - 6, ay - armH - 5, 1.5, 5.5);
      g.fill({ color: 0x4a8a30, alpha: 0.75 });
      g.rect(ax + 1.5, ay - armH * 0.7, 4, 1.5);
      g.fill({ color: 0x4a8a30, alpha: 0.75 });
      g.rect(ax + 4, ay - armH * 0.7 - 4, 1.5, 4.5);
      g.fill({ color: 0x4a8a30, alpha: 0.75 });
      // Shadow
      g.ellipse(ax + 2, ay + 1, 4, 1.5);
      g.fill({ color: 0x000000, alpha: 0.07 });
    } else if (feat < 0.55) {
      // Rock cluster
      for (let r = 0; r < 2; r++) {
        const rx = ax + (rng.next() - 0.5) * 8;
        const ry = ay + (rng.next() - 0.5) * 5;
        const rw = 2 + rng.next() * 5;
        const rh = 1.5 + rng.next() * 3;
        g.ellipse(rx, ry, rw, rh);
        g.fill({ color: rng.next() < 0.5 ? 0xaa9966 : 0x998855, alpha: 0.5 });
      }
    } else if (feat < 0.72) {
      // Dry bush
      const br = 3 + rng.next() * 5;
      for (let b = 0; b < 6; b++) {
        const ba = rng.next() * Math.PI * 2;
        g.moveTo(ax, ay);
        g.lineTo(ax + Math.cos(ba) * br, ay + Math.sin(ba) * br);
        g.stroke({ color: 0x8a7a4a, width: 0.6, alpha: 0.4 });
      }
    } else if (feat < 0.85) {
      // Skull
      g.ellipse(ax, ay - 2, 3, 2.5);
      g.fill({ color: 0xe0d8c8, alpha: 0.5 });
      g.circle(ax - 1.2, ay - 2.5, 0.8);
      g.fill({ color: 0x3a3a3a, alpha: 0.5 });
      g.circle(ax + 1.2, ay - 2.5, 0.8);
      g.fill({ color: 0x3a3a3a, alpha: 0.5 });
    } else {
      // Bone
      g.moveTo(ax - 5, ay);
      g.quadraticCurveTo(ax, ay - 2 - rng.next() * 3, ax + 5 + rng.next() * 5, ay + rng.next() * 2);
      g.stroke({ color: 0xddccbb, width: 1, alpha: 0.3 });
    }
  }
}

function _drawOWSnowDeco(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng): void {
  // Snow drifts
  for (let i = 0; i < 4; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.85;
    const ay = cy + (rng.next() - 0.5) * ts * 0.75;
    const w = ts * (0.15 + rng.next() * 0.25);
    const h = ts * (0.04 + rng.next() * 0.07);
    g.ellipse(ax, ay, w, h);
    g.fill({ color: 0xdde8f0, alpha: 0.15 + rng.next() * 0.1 });
  }
  // Sparse dead grass
  for (let i = 0; i < 5; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.85;
    const h = ts * (0.05 + rng.next() * 0.08);
    for (let b = -1; b <= 1; b++) {
      g.moveTo(ax + b * 1.5, ay);
      g.quadraticCurveTo(ax + b * 2, ay - h * 0.6, ax + b * 1.8, ay - h);
      g.stroke({ color: 0x8a7a5a, width: 0.6, alpha: 0.25 });
    }
  }
  // Frost rocks
  for (let i = 0; i < 2; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.8;
    const ay = cy + (rng.next() - 0.5) * ts * 0.7;
    const rw = ts * (0.05 + rng.next() * 0.08);
    const rh = ts * (0.03 + rng.next() * 0.05);
    g.ellipse(ax, ay, rw, rh);
    g.fill({ color: 0x8a8a8a, alpha: 0.45 });
    // Frost on top
    g.ellipse(ax - rw * 0.15, ay - rh * 0.3, rw * 0.45, rh * 0.35);
    g.fill({ color: 0xdde8f0, alpha: 0.25 });
  }
  // Frost crystals
  for (let i = 0; i < 8; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.9;
    const ay = cy + (rng.next() - 0.5) * ts * 0.9;
    g.circle(ax, ay, 0.8 + rng.next() * 1.5);
    g.fill({ color: 0xffffff, alpha: 0.06 + rng.next() * 0.06 });
  }
}

function _drawOWPathDeco(g: Graphics, cx: number, cy: number, ts: number, rng: TileRng): void {
  // Cart ruts / worn path lines
  for (let i = 0; i < 3; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.3;
    const ay = cy - ts * 0.4;
    const endY = cy + ts * 0.4;
    g.moveTo(ax, ay);
    g.bezierCurveTo(
      ax + (rng.next() - 0.5) * ts * 0.15, ay + ts * 0.25,
      ax + (rng.next() - 0.5) * ts * 0.15, endY - ts * 0.25,
      ax + (rng.next() - 0.5) * ts * 0.1, endY,
    );
    g.stroke({ color: 0x9a8a6a, width: 1 + rng.next() * 1.5, alpha: 0.08 + rng.next() * 0.06 });
  }
  // Scattered pebbles
  for (let i = 0; i < 6; i++) {
    const ax = cx + (rng.next() - 0.5) * ts * 0.7;
    const ay = cy + (rng.next() - 0.5) * ts * 0.7;
    const r = 0.8 + rng.next() * 1.8;
    g.circle(ax, ay, r);
    g.fill({ color: rng.next() < 0.5 ? 0x9a8a6a : 0x8a7a5a, alpha: 0.25 + rng.next() * 0.15 });
  }
  // Footprints (subtle)
  if (rng.next() < 0.4) {
    for (let i = 0; i < 3; i++) {
      const fx = cx + (rng.next() - 0.5) * ts * 0.3;
      const fy = cy + (rng.next() - 0.5) * ts * 0.5;
      g.ellipse(fx, fy, 1.5, 2.5);
      g.fill({ color: _darken(0xc4a76c, 0.8), alpha: 0.08 });
    }
  }
  // Tufts of grass at edges
  _drawOWGrassTufts(g, cx, cy, ts, rng, 3);
}

// ---------------------------------------------------------------------------
// Main tile decoration dispatcher
// ---------------------------------------------------------------------------

function _drawTileDecoration(
  g: Graphics, tileType: string, cx: number, cy: number, ts: number,
): void {
  const rng = new TileRng(Math.round(cx), Math.round(cy));
  const variant = _tileHash(Math.round(cx), Math.round(cy), 0);

  switch (tileType) {
    case OverworldTileType.GRASS: {
      _paintTileBase(g, cx, cy, ts, 0x4a8c3f,
        [0x327020, 0x55aa3d, 0x62b848, 0x4a9030, 0x3a7a22], rng);
      const v = variant % 3;
      if (v === 0) {
        _drawOWGrassTufts(g, cx, cy, ts, rng, 8);
        _drawOWFlowers(g, cx, cy, ts, rng, 4);
        _drawOWRocks(g, cx, cy, ts, rng, 1);
      } else if (v === 1) {
        _drawOWGrassTufts(g, cx, cy, ts, rng, 6);
        _drawOWRocks(g, cx, cy, ts, rng, 2);
        _drawOWFlowers(g, cx, cy, ts, rng, 2);
      } else {
        _drawOWGrassTufts(g, cx, cy, ts, rng, 10);
        _drawOWFlowers(g, cx, cy, ts, rng, 6);
      }
      break;
    }
    case OverworldTileType.FOREST: {
      _paintTileBase(g, cx, cy, ts, 0x2d6b2d,
        [0x142a12, 0x1e4a1a, 0x2a5a25, 0x357a30, 0x1a3a18], rng, 10);
      const v = variant % 3;
      if (v === 0) {
        _drawOWFerns(g, cx, cy, ts, rng, 2);
        _drawOWTrees(g, cx, cy, ts, rng, 3, "deciduous");
        _drawOWGrassTufts(g, cx, cy, ts, rng, 3);
      } else if (v === 1) {
        _drawOWTrees(g, cx, cy, ts, rng, 3, "pine");
        _drawOWFerns(g, cx, cy, ts, rng, 2);
        _drawOWRocks(g, cx, cy, ts, rng, 1);
      } else {
        _drawOWTrees(g, cx, cy, ts, rng, 2, "pine");
        _drawOWTrees(g, cx, cy, ts, rng, 2, "deciduous");
        _drawOWFerns(g, cx, cy, ts, rng, 1);
      }
      break;
    }
    case OverworldTileType.MOUNTAIN: {
      _paintTileBase(g, cx, cy, ts, 0x7a7a7a,
        [0x44444e, 0x7a7a84, 0x5a5a64, 0x8a8a92, 0x626268], rng, 8,
        // Rock grain lines
        (g2, cx2, cy2, ts2, rng2) => {
          for (let i = 0; i < 4; i++) {
            const ax = cx2 + (rng2.next() - 0.5) * ts2 * 0.8;
            const ay = cy2 + (rng2.next() - 0.5) * ts2 * 0.8;
            const w = ts2 * (0.1 + rng2.next() * 0.2);
            g2.moveTo(ax - w, ay);
            g2.lineTo(ax + w, ay + rng2.next() * 4 - 2);
            g2.stroke({ color: 0x3a3a44, width: 0.6, alpha: 0.07 });
          }
        });
      _drawOWMountainPeaks(g, cx, cy, ts, rng, 2 + (variant % 2));
      _drawOWRocks(g, cx, cy, ts, rng, 3);
      break;
    }
    case OverworldTileType.WATER: {
      _paintTileBase(g, cx, cy, ts, 0x3366aa,
        [0x1e3a70, 0x3060a0, 0x4488cc, 0x205088], rng, 6);
      _drawOWWaves(g, cx, cy, ts, rng);
      break;
    }
    case OverworldTileType.PATH: {
      _paintTileBase(g, cx, cy, ts, 0xc4a76c,
        [0xb89850, 0xd0b870, 0xa89040, 0xc0a858], rng, 6);
      _drawOWPathDeco(g, cx, cy, ts, rng);
      break;
    }
    case OverworldTileType.SAND: {
      _paintTileBase(g, cx, cy, ts, 0xd4b86a,
        [0xccaa50, 0xe8d080, 0xb89844, 0xd0bc60, 0xc0a848], rng, 8);
      _drawOWSandDeco(g, cx, cy, ts, rng);
      break;
    }
    case OverworldTileType.SNOW: {
      _paintTileBase(g, cx, cy, ts, 0xe8e8f0,
        [0xd0d8e4, 0xf0f0f8, 0xdde4ee, 0xe0e8f2], rng, 6);
      _drawOWSnowDeco(g, cx, cy, ts, rng);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the most common unit type from an array (for roaming enemy display). */
export function getMostCommonUnit(unitTypes: UnitType[]): UnitType {
  const counts = new Map<UnitType, number>();
  for (const ut of unitTypes) counts.set(ut, (counts.get(ut) ?? 0) + 1);
  let best = unitTypes[0];
  let bestCount = 0;
  for (const ut of unitTypes) {
    const c = counts.get(ut)!;
    if (c > bestCount) { bestCount = c; best = ut; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// OverworldView
// ---------------------------------------------------------------------------

export class OverworldView {
  private vm!: ViewManager;
  private overworld!: OverworldState;
  rpg!: RPGState;

  private mapContainer = new Container();
  private entityContainer = new Container();
  private fogContainer = new Container();
  private partyContainer = new Container();
  private entityLabels: Text[] = [];
  private _hamlets: Map<string, HamletRenderer> = new Map();

  private _tileGraphics = new Graphics();
  private _fogGraphics = new Graphics();
  private _entityGraphics = new Graphics();

  private _partySprite: AnimatedSprite | null = null;
  private _partyShadow = new Graphics();
  private _partyState: UnitState = UnitState.IDLE;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _moveResetTimer: ReturnType<typeof setTimeout> | null = null;

  // Roaming enemy sprites
  private _roamingEnemySprites: Map<string, { sprite: AnimatedSprite; shadow: Graphics; container: Container }> = new Map();

  // NPC sprites
  private _npcSprites: Map<string, { sprite: AnimatedSprite; shadow: Graphics; container: Container }> = new Map();

  // Day/night overlay
  private _dayNightOverlay = new Graphics();

  // Weather particles
  private _weatherContainer = new Container();
  private _weatherParticles: Graphics[] = [];
  private _weatherFogOverlay: Graphics | null = null;
  private _currentWeather: string = "clear";
  private _weatherTime = 0;

  // Banter speech bubble
  private _banterContainer = new Container();
  /** @internal stored for cleanup */ private _banterBg: Graphics | null = null;
  private _banterText: Text | null = null;
  private _banterTimer = 0;
  private _banterFadeTimer = 0;

  private _unsubs: Array<() => void> = [];

  private TILE_SIZE = RPGBalance.OVERWORLD_TILE_SIZE;

  // Viewport culling – track last rendered tile bounds to avoid redrawing
  private _lastTileBounds = { x0: -1, y0: -1, x1: -1, y1: -1 };
  private static readonly TILE_BUFFER = 5; // extra tiles beyond viewport edge

  init(vm: ViewManager, overworld: OverworldState, rpg: RPGState): void {
    this.vm = vm;
    this.overworld = overworld;
    this.rpg = rpg;

    // Add containers to layers
    this.mapContainer.addChild(this._tileGraphics);
    vm.addToLayer("background", this.mapContainer);

    this.entityContainer.addChild(this._entityGraphics);
    vm.addToLayer("buildings", this.entityContainer);

    this.fogContainer.addChild(this._fogGraphics);
    vm.addToLayer("groundfx", this.fogContainer);

    vm.addToLayer("units", this.partyContainer);

    // Day/night overlay (above fog, below UI)
    vm.addToLayer("fx", this._dayNightOverlay);

    // Weather particle container
    vm.addToLayer("fx", this._weatherContainer);

    // Banter bubble above party
    this._banterContainer.visible = false;
    vm.addToLayer("ui", this._banterContainer);

    // Set map size on camera
    vm.camera.setMapSize(overworld.width, overworld.height);

    // Create party animated sprite
    this._createPartySprite();

    // Position camera first so viewport culling works correctly
    this._updatePartyPosition();
    this._centerCamera();

    // Initial render (only visible tiles)
    this._drawMap();
    this._drawEntities();
    this._drawFog();

    // Per-frame updates
    this._unsubs.push(vm.onUpdate((_state, dt) => {
      for (const hamlet of this._hamlets.values()) {
        hamlet.tick(dt, GamePhase.PREP);
      }
      this._updateRoamingEnemies();
      this._updateDayNightOverlay();
      this._updateWeather(dt);
      this._updateBanter(dt);
    }));

    // Listen for movement
    this._unsubs.push(EventBus.on("rpgPartyMoved", () => {
      this._updatePartyPosition();
      this._setPartyAnimation(UnitState.MOVE);
      this._centerCamera();
      this._drawMapIfNeeded();
      this._drawFog();
      this._drawEntities();

      // Return to idle after short delay
      if (this._moveResetTimer) clearTimeout(this._moveResetTimer);
      this._moveResetTimer = setTimeout(() => {
        this._setPartyAnimation(UnitState.IDLE);
        this._scheduleIdleInterrupt();
      }, 400);
    }));

    // Listen for banter events
    this._unsubs.push(EventBus.on("rpgBanter", ({ text }) => {
      this._showBanter(text);
    }));

    // Schedule occasional idle animation
    this._scheduleIdleInterrupt();
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    if (this._idleTimer) clearTimeout(this._idleTimer);
    if (this._moveResetTimer) clearTimeout(this._moveResetTimer);

    // Destroy hamlet renderers
    for (const hamlet of this._hamlets.values()) hamlet.destroy();
    this._hamlets.clear();

    // Destroy roaming enemy sprites
    for (const entry of this._roamingEnemySprites.values()) {
      entry.container.destroy({ children: true });
    }
    this._roamingEnemySprites.clear();

    // Destroy NPC sprites
    for (const entry of this._npcSprites.values()) {
      entry.container.destroy({ children: true });
    }
    this._npcSprites.clear();

    this.vm.removeFromLayer("background", this.mapContainer);
    this.vm.removeFromLayer("buildings", this.entityContainer);
    this.vm.removeFromLayer("groundfx", this.fogContainer);
    this.vm.removeFromLayer("units", this.partyContainer);
    this.vm.removeFromLayer("fx", this._dayNightOverlay);
    this.vm.removeFromLayer("fx", this._weatherContainer);
    this.vm.removeFromLayer("ui", this._banterContainer);

    for (const label of this.entityLabels) label.destroy();
    this.entityLabels = [];

    this.mapContainer.destroy({ children: true });
    this.entityContainer.destroy({ children: true });
    this.fogContainer.destroy({ children: true });
    this.partyContainer.destroy({ children: true });
    this._dayNightOverlay.destroy();
    this._weatherContainer.destroy({ children: true });
    this._banterContainer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Party sprite
  // ---------------------------------------------------------------------------

  private _createPartySprite(): void {
    const ts = this.TILE_SIZE;

    // Shadow ellipse
    this._partyShadow.ellipse(0, 4, ts * 0.3, ts * 0.12);
    this._partyShadow.fill({ color: 0x000000, alpha: 0.3 });
    this.partyContainer.addChild(this._partyShadow);

    // Animated sprite using swordsman
    const frames = animationManager.getFrames(UnitType.SWORDSMAN, UnitState.IDLE);
    const frameSet = animationManager.getFrameSet(UnitType.SWORDSMAN, UnitState.IDLE);

    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.75);
    sprite.width = ts * 1.0;
    sprite.height = ts * 1.0;
    sprite.animationSpeed = frameSet.fps / 60;
    sprite.loop = true;
    sprite.tint = 0x6699ff; // Blue shield tint
    sprite.play();

    this.partyContainer.addChild(sprite);
    this._partySprite = sprite;
    this._partyState = UnitState.IDLE;
  }

  private _setPartyAnimation(state: UnitState): void {
    if (!this._partySprite || this._partyState === state) return;
    this._partyState = state;

    const frames = animationManager.getFrames(UnitType.SWORDSMAN, state);
    const frameSet = animationManager.getFrameSet(UnitType.SWORDSMAN, state);

    this._partySprite.textures = frames;
    this._partySprite.animationSpeed = frameSet.fps / 60;
    this._partySprite.loop = true;
    this._partySprite.gotoAndPlay(0);
  }

  private _scheduleIdleInterrupt(): void {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    // Occasionally play idle animation variant (every 3-6 seconds)
    const delay = 3000 + Math.random() * 3000;
    this._idleTimer = setTimeout(() => {
      if (this._partyState !== UnitState.MOVE) {
        // Toggle between IDLE state to create visual variety
        this._setPartyAnimation(UnitState.IDLE);
      }
      this._scheduleIdleInterrupt();
    }, delay);
  }

  private _updatePartyPosition(): void {
    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2;
    this.partyContainer.position.set(px, py);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /** Return the tile coordinate range currently visible on screen (clamped). */
  private _getVisibleTileBounds(): { x0: number; y0: number; x1: number; y1: number } {
    const ts = this.TILE_SIZE;
    const cam = this.vm.camera;
    const visW = this.vm.screenWidth / cam.zoom;
    const visH = this.vm.screenHeight / cam.zoom;
    const buf = OverworldView.TILE_BUFFER;

    const x0 = Math.max(0, Math.floor(-cam.x / ts) - buf);
    const y0 = Math.max(0, Math.floor(-cam.y / ts) - buf);
    const x1 = Math.min(this.overworld.width - 1, Math.floor((-cam.x + visW) / ts) + buf);
    const y1 = Math.min(this.overworld.height - 1, Math.floor((-cam.y + visH) / ts) + buf);

    return { x0, y0, x1, y1 };
  }

  private _drawMap(): void {
    const g = this._tileGraphics;
    g.clear();

    const ts = this.TILE_SIZE;
    const { x0, y0, x1, y1 } = this._getVisibleTileBounds();
    this._lastTileBounds = { x0, y0, x1, y1 };

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const tile = this.overworld.grid[y][x];
        const color = TILE_COLORS[tile.type] ?? 0x333333;
        // Base fill
        g.rect(x * ts, y * ts, ts, ts);
        g.fill({ color });
        // Terrain decorations
        const cx = x * ts + ts / 2;
        const cy = y * ts + ts / 2;
        _drawTileDecoration(g, tile.type, cx, cy, ts);
      }
    }
  }

  /** Redraw map only if the viewport has moved enough to show new tiles. */
  private _drawMapIfNeeded(): void {
    const cur = this._getVisibleTileBounds();
    const last = this._lastTileBounds;
    if (cur.x0 !== last.x0 || cur.y0 !== last.y0 || cur.x1 !== last.x1 || cur.y1 !== last.y1) {
      this._drawMap();
    }
  }

  private _drawEntities(): void {
    const g = this._entityGraphics;
    g.clear();

    // Destroy old labels
    for (const label of this.entityLabels) label.destroy();
    this.entityLabels = [];

    const ts = this.TILE_SIZE;
    const halfTs = ts / 2;
    const { x0, y0, x1, y1 } = this._getVisibleTileBounds();

    // Track which hamlets/npcs are visible this frame
    const visibleHamlets = new Set<string>();
    const visibleNpcs = new Set<string>();

    for (const entity of this.overworld.entities.values()) {
      const ex = entity.position.x;
      const ey = entity.position.y;

      // Towns are 4×4 tiles — check if any part is visible
      const townSize = entity.type === "town" ? 4 : 1;
      if (ex + townSize - 1 < x0 || ex > x1 || ey + townSize - 1 < y0 || ey > y1) continue;

      const tile = this.overworld.grid[ey]?.[ex];
      if (!tile?.discovered) continue;

      if (entity.type === "town") {
        // Use HamletRenderer for towns
        visibleHamlets.add(entity.id);
        if (!this._hamlets.has(entity.id)) {
          const hamlet = new HamletRenderer(entity.id);
          hamlet.container.position.set(ex * ts, ey * ts);
          this.entityContainer.addChild(hamlet.container);
          this._hamlets.set(entity.id, hamlet);
        }

        // Label centered on the 4×4 area
        const labelX = ex * ts + 2 * ts;
        const labelY = (ey + 4) * ts + 4;
        const label = new Text({
          text: entity.name,
          style: {
            fontFamily: "monospace",
            fontSize: 11,
            fill: 0xffffff,
            fontWeight: "bold",
            align: "center",
          },
        });
        label.anchor.set(0.5, 0);
        label.position.set(labelX, labelY);
        this.entityContainer.addChild(label);
        this.entityLabels.push(label);
      } else if (entity.type === "roaming_enemy") {
        // Handled by _updateRoamingEnemies() with animated sprites
        continue;
      } else if (entity.type === "npc") {
        // Animated NPC sprite
        visibleNpcs.add(entity.id);
        this._updateNpcSprite(entity, ex, ey, ts);

        // Label
        const cx = ex * ts + halfTs;
        const cy = ey * ts + halfTs;
        const label = new Text({
          text: entity.name,
          style: {
            fontFamily: "monospace",
            fontSize: 9,
            fill: 0xffffff,
            align: "center",
          },
        });
        label.anchor.set(0.5, 0);
        label.position.set(cx, cy + halfTs * 0.7);
        this.entityContainer.addChild(label);
        this.entityLabels.push(label);
      } else {
        const cx = ex * ts + halfTs;
        const cy = ey * ts + halfTs;

        this._drawEntityMarker(g, entity, cx, cy, halfTs * 0.6);

        // Label
        const label = new Text({
          text: entity.name,
          style: {
            fontFamily: "monospace",
            fontSize: 9,
            fill: 0xffffff,
            align: "center",
          },
        });
        label.anchor.set(0.5, 0);
        label.position.set(cx, cy + halfTs * 0.7);
        this.entityContainer.addChild(label);
        this.entityLabels.push(label);
      }
    }

    // Remove hamlets that are no longer visible
    for (const [id, hamlet] of this._hamlets) {
      if (!visibleHamlets.has(id)) {
        hamlet.destroy();
        this._hamlets.delete(id);
      }
    }

    // Remove NPC sprites that are no longer visible
    this._cleanupNpcSprites(visibleNpcs);
  }

  private _drawEntityMarker(
    g: Graphics,
    entity: OverworldEntity,
    cx: number,
    cy: number,
    r: number,
  ): void {
    switch (entity.type) {
      case "dungeon_entrance":
        // Triangle for dungeons
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy + r);
        g.lineTo(cx - r, cy + r);
        g.closePath();
        g.fill({ color: 0xaa3333 });
        g.stroke({ color: 0xff6666, width: 1 });
        break;
      case "npc":
        // Small person shape
        g.circle(cx, cy - r * 0.4, r * 0.35);
        g.fill({ color: 0x66aaff });
        g.rect(cx - r * 0.25, cy - r * 0.1, r * 0.5, r * 0.8);
        g.fill({ color: 0x66aaff });
        break;
      case "arcane_library":
        // Star shape for the arcane library
        g.rect(cx - r, cy - r * 0.5, r * 2, r * 1.5);
        g.fill({ color: 0x4422aa });
        // Tower on top
        g.rect(cx - r * 0.3, cy - r * 1.2, r * 0.6, r * 0.8);
        g.fill({ color: 0x6633cc });
        // Glow outline
        g.roundRect(cx - r * 1.1, cy - r * 1.3, r * 2.2, r * 2.9, 2);
        g.stroke({ color: 0xaa66ff, width: 1, alpha: 0.6 });
        break;
      case "shrine": {
        const shrineData = entity.data as ShrineData;
        const dimAlpha = shrineData.used ? 0.3 : 1.0;
        // Stone column
        g.rect(cx - r * 0.25, cy - r * 0.6, r * 0.5, r * 1.2);
        g.fill({ color: 0x888888, alpha: dimAlpha });
        // Glowing circle on top – color based on buff type
        const buffColors: Record<string, number> = {
          attack: 0xff4444, defense: 0x4488ff, speed: 0x44ff44,
          hp: 0xff88cc, mana: 0x8844ff,
        };
        const glowColor = buffColors[shrineData.buff.type] ?? 0xffcc44;
        g.circle(cx, cy - r * 0.7, r * 0.35);
        g.fill({ color: glowColor, alpha: 0.8 * dimAlpha });
        // Glow halo
        g.circle(cx, cy - r * 0.7, r * 0.55);
        g.fill({ color: glowColor, alpha: 0.15 * dimAlpha });
        break;
      }
      case "herb_node": {
        const herbData = entity.data as HerbNodeData;
        const dimAlpha = herbData.herbCount <= 0 ? 0.3 : 1.0;
        // 3 leaf shapes
        for (let i = -1; i <= 1; i++) {
          const lx = cx + i * r * 0.35;
          const ly = cy - r * 0.1 + Math.abs(i) * r * 0.15;
          g.ellipse(lx, ly - r * 0.3, r * 0.18, r * 0.4);
          g.fill({ color: 0x33aa33, alpha: 0.8 * dimAlpha });
          // Stem
          g.moveTo(lx, ly);
          g.lineTo(lx, ly + r * 0.3);
          g.stroke({ color: 0x227722, width: 1, alpha: 0.7 * dimAlpha });
        }
        break;
      }
      case "fishing_spot": {
        const fishData = entity.data as FishingSpotData;
        const dimAlpha = fishData.used ? 0.3 : 1.0;
        // Blue wavy circle
        g.circle(cx, cy, r * 0.55);
        g.fill({ color: 0x3388dd, alpha: 0.5 * dimAlpha });
        // Wavy ring
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 / 8) * i;
          const wobble = r * 0.05 * Math.sin(i * 3);
          const px = cx + Math.cos(a) * (r * 0.6 + wobble);
          const py = cy + Math.sin(a) * (r * 0.4 + wobble);
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.stroke({ color: 0x66bbff, width: 1.5, alpha: 0.6 * dimAlpha });
        break;
      }
      default:
        // Circle for others
        g.circle(cx, cy, r * 0.5);
        g.fill({ color: 0xffaa00 });
        break;
    }
  }

  private _drawFog(): void {
    const g = this._fogGraphics;
    g.clear();

    const ts = this.TILE_SIZE;
    const { x0, y0, x1, y1 } = this._getVisibleTileBounds();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const tile = this.overworld.grid[y][x];
        if (!tile.discovered) {
          g.rect(x * ts, y * ts, ts, ts);
          g.fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Roaming enemies
  // ---------------------------------------------------------------------------

  private _updateRoamingEnemies(): void {
    const ts = this.TILE_SIZE;
    const activeIds = new Set<string>();

    for (const entity of this.overworld.entities.values()) {
      if (entity.type !== "roaming_enemy") continue;
      activeIds.add(entity.id);

      const enemyData = entity.data as RoamingEnemyData;

      if (!this._roamingEnemySprites.has(entity.id)) {
        // Create sprite for this roaming enemy
        const unitType = enemyData.displayUnitType as UnitType;
        const frames = animationManager.getFrames(unitType, UnitState.IDLE);
        const frameSet = animationManager.getFrameSet(unitType, UnitState.IDLE);

        const container = new Container();
        const shadow = new Graphics();
        shadow.ellipse(0, 4, ts * 0.25, ts * 0.1);
        shadow.fill({ color: 0x000000, alpha: 0.25 });
        container.addChild(shadow);

        const sprite = new AnimatedSprite(frames);
        sprite.anchor.set(0.5, 0.75);
        sprite.width = ts * 1.0;
        sprite.height = ts * 1.0;
        sprite.animationSpeed = frameSet.fps / 60;
        sprite.loop = true;
        sprite.play();
        container.addChild(sprite);

        this.entityContainer.addChild(container);
        this._roamingEnemySprites.set(entity.id, { sprite, shadow, container });
      }

      const entry = this._roamingEnemySprites.get(entity.id)!;
      // Update position
      const px = entity.position.x * ts + ts / 2;
      const py = entity.position.y * ts + ts / 2;
      entry.container.position.set(px, py);
      // Hide if defeated
      entry.container.visible = !enemyData.defeated;
    }

    // Remove sprites for entities that no longer exist
    for (const [id, entry] of this._roamingEnemySprites) {
      if (!activeIds.has(id)) {
        entry.container.destroy({ children: true });
        this._roamingEnemySprites.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // NPC sprites
  // ---------------------------------------------------------------------------

  private static readonly NPC_UNIT_TYPES: UnitType[] = [
    UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.CLERIC,
    UnitType.MONK, UnitType.TEMPLAR, UnitType.SAINT, UnitType.DEFENDER,
  ];

  private _updateNpcSprite(entity: OverworldEntity, ex: number, ey: number, ts: number): void {
    if (!this._npcSprites.has(entity.id)) {
      // Deterministic unit type based on entity id hash
      let hash = 0;
      for (let i = 0; i < entity.id.length; i++) {
        hash = ((hash << 5) - hash + entity.id.charCodeAt(i)) | 0;
      }
      const types = OverworldView.NPC_UNIT_TYPES;
      const unitType = types[((hash >>> 0) % types.length)];

      const frames = animationManager.getFrames(unitType, UnitState.IDLE);
      const frameSet = animationManager.getFrameSet(unitType, UnitState.IDLE);

      const container = new Container();
      const shadow = new Graphics();
      shadow.ellipse(0, 4, ts * 0.25, ts * 0.1);
      shadow.fill({ color: 0x000000, alpha: 0.25 });
      container.addChild(shadow);

      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.75);
      sprite.width = ts * 1.0;
      sprite.height = ts * 1.0;
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true;
      sprite.play();
      container.addChild(sprite);

      this.entityContainer.addChild(container);
      this._npcSprites.set(entity.id, { sprite, shadow, container });
    }

    const entry = this._npcSprites.get(entity.id)!;
    const px = ex * ts + ts / 2;
    const py = ey * ts + ts / 2;
    entry.container.position.set(px, py);
  }

  /** Remove NPC sprites for entities no longer visible. Called at end of _drawEntities. */
  private _cleanupNpcSprites(visibleNpcIds: Set<string>): void {
    for (const [id, entry] of this._npcSprites) {
      if (!visibleNpcIds.has(id)) {
        entry.container.destroy({ children: true });
        this._npcSprites.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Day/Night overlay
  // ---------------------------------------------------------------------------

  private _updateDayNightOverlay(): void {
    const g = this._dayNightOverlay;
    g.clear();

    const timeOfDay = this.rpg.timeOfDay;
    let color = 0x000000;
    let alpha = 0;

    if (timeOfDay >= 0 && timeOfDay < 60) {
      // Morning: warm tint
      color = 0xffeecc;
      alpha = 0.05;
    } else if (timeOfDay >= 60 && timeOfDay < 120) {
      // Day: no overlay
      alpha = 0;
    } else if (timeOfDay >= 120 && timeOfDay < 180) {
      // Evening: warm orange
      color = 0xff8844;
      alpha = 0.15;
    } else {
      // Night: dark blue-black
      color = 0x000033;
      alpha = 0.35;
    }

    if (alpha > 0) {
      const cam = this.vm.camera;
      const visW = this.vm.screenWidth / cam.zoom;
      const visH = this.vm.screenHeight / cam.zoom;
      g.rect(-cam.x, -cam.y, visW, visH);
      g.fill({ color, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Weather particles
  // ---------------------------------------------------------------------------

  private _updateWeather(dt: number): void {
    const weather = this.rpg.weather;
    this._weatherTime += dt;

    // Rebuild particles if weather changed
    if (weather !== this._currentWeather) {
      this._currentWeather = weather;
      this._clearWeatherParticles();
      this._createWeatherParticles(weather);
    }

    const cam = this.vm.camera;
    const visW = this.vm.screenWidth / cam.zoom;
    const visH = this.vm.screenHeight / cam.zoom;
    const ox = -cam.x;
    const oy = -cam.y;

    if (weather === "rain") {
      for (const p of this._weatherParticles) {
        p.x += 2.5;
        p.y += 6.0;
        // Wrap around
        if (p.x > ox + visW) p.x = ox - 5;
        if (p.y > oy + visH) p.y = oy - 10;
      }
    } else if (weather === "snow") {
      for (let i = 0; i < this._weatherParticles.length; i++) {
        const p = this._weatherParticles[i];
        p.x += Math.sin(this._weatherTime * 0.8 + i * 1.3) * 0.4;
        p.y += 1.2;
        if (p.y > oy + visH) p.y = oy - 5;
        if (p.x > ox + visW) p.x = ox;
        if (p.x < ox) p.x = ox + visW;
      }
    } else if (weather === "fog") {
      if (this._weatherFogOverlay) {
        this._weatherFogOverlay.clear();
        const fogAlpha = 0.2 + Math.sin(this._weatherTime * 0.5) * 0.03;
        this._weatherFogOverlay.rect(ox, oy, visW, visH);
        this._weatherFogOverlay.fill({ color: 0xffffff, alpha: fogAlpha });
      }
    }
  }

  private _createWeatherParticles(weather: string): void {
    const cam = this.vm.camera;
    const visW = this.vm.screenWidth / cam.zoom;
    const visH = this.vm.screenHeight / cam.zoom;
    const ox = -cam.x;
    const oy = -cam.y;

    if (weather === "rain") {
      const count = 20 + Math.floor(Math.random() * 11); // 20-30
      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        p.moveTo(0, 0);
        p.lineTo(-4, -10);
        p.stroke({ color: 0x6688cc, width: 1.5, alpha: 0.5 });
        p.x = ox + Math.random() * visW;
        p.y = oy + Math.random() * visH;
        this._weatherContainer.addChild(p);
        this._weatherParticles.push(p);
      }
    } else if (weather === "snow") {
      const count = 15 + Math.floor(Math.random() * 6); // 15-20
      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        const r = 1.5 + Math.random() * 2;
        p.circle(0, 0, r);
        p.fill({ color: 0xffffff, alpha: 0.7 });
        p.x = ox + Math.random() * visW;
        p.y = oy + Math.random() * visH;
        this._weatherContainer.addChild(p);
        this._weatherParticles.push(p);
      }
    } else if (weather === "fog") {
      const fog = new Graphics();
      fog.rect(ox, oy, visW, visH);
      fog.fill({ color: 0xffffff, alpha: 0.2 });
      this._weatherContainer.addChild(fog);
      this._weatherFogOverlay = fog;
    }
  }

  private _clearWeatherParticles(): void {
    for (const p of this._weatherParticles) p.destroy();
    this._weatherParticles = [];
    if (this._weatherFogOverlay) {
      this._weatherFogOverlay.destroy();
      this._weatherFogOverlay = null;
    }
    this._weatherContainer.removeChildren();
    this._weatherTime = 0;
  }

  // ---------------------------------------------------------------------------
  // Banter speech bubbles
  // ---------------------------------------------------------------------------

  private _showBanter(text: string): void {
    // Clear old banter
    this._banterContainer.removeChildren();
    if (this._banterBg) { this._banterBg.destroy(); this._banterBg = null; }
    if (this._banterText) { this._banterText.destroy(); this._banterText = null; }

    const bg = new Graphics();
    const label = new Text({
      text,
      style: {
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0x000000,
        wordWrap: true,
        wordWrapWidth: 140,
      },
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -4);

    // Background rounded rect
    const padX = 8;
    const padY = 5;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;
    bg.roundRect(-w / 2, -h - 4, w, h, 6);
    bg.fill({ color: 0xffffff, alpha: 0.92 });
    bg.stroke({ color: 0x000000, width: 1, alpha: 0.3 });

    this._banterContainer.addChild(bg);
    this._banterContainer.addChild(label);
    this._banterBg = bg;
    this._banterText = label;
    this._banterContainer.visible = true;
    this._banterContainer.alpha = 1;
    this._banterTimer = 3.0; // show for 3 seconds
    this._banterFadeTimer = 0;
  }

  private _updateBanter(dt: number): void {
    if (!this._banterContainer.visible) return;

    // Position above party sprite
    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2 - ts * 0.8;
    this._banterContainer.position.set(px, py);

    if (this._banterTimer > 0) {
      this._banterTimer -= dt / 1000;
      if (this._banterTimer <= 0) {
        this._banterFadeTimer = 0.5; // fade out over 0.5s
      }
    } else if (this._banterFadeTimer > 0) {
      this._banterFadeTimer -= dt / 1000;
      this._banterContainer.alpha = Math.max(0, this._banterFadeTimer / 0.5);
      if (this._banterFadeTimer <= 0) {
        this._banterContainer.visible = false;
      }
    }
  }

  private _centerCamera(): void {
    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2;

    // Center camera on party
    const visW = this.vm.screenWidth / this.vm.camera.zoom;
    const visH = this.vm.screenHeight / this.vm.camera.zoom;
    this.vm.camera.x = -px + visW / 2;
    this.vm.camera.y = -py + visH / 2;
  }
}
