// ============================================================================
// CivRenderer.ts — Rich Pixi.js hex-map renderer for Arthurian Civilization
// ============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { TERRAIN_TYPES, CIV_FACTIONS, CIV_UNIT_DEFS, HEX_SIZE, HEX_W, HEX_H } from "./CivConfig";
import type { CivGameState, CivUnit, CivCity } from "./CivState";
import { getUnit, getCity } from "./CivState";

// ---------------------------------------------------------------------------
// Hex geometry
// ---------------------------------------------------------------------------

const HEX_ANGLES: number[] = [];
for (let i = 0; i < 6; i++) HEX_ANGLES.push((Math.PI * 2 / 6) * i);

function hexPts(cx: number, cy: number, r: number): number[] {
  const p: number[] = [];
  for (let i = 0; i < 6; i++) { p.push(cx + r * Math.cos(HEX_ANGLES[i])); p.push(cy + r * Math.sin(HEX_ANGLES[i])); }
  return p;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
function darken(c: number, a: number): number { return lerpColor(c, 0x000000, a); }
function lighten(c: number, a: number): number { return lerpColor(c, 0xFFFFFF, a); }

/** Deterministic per-tile hash [0,1). */
function th(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
/** Second hash channel for more variety */
function th2(x: number, y: number): number { return th(x + 9999, y + 7777); }

// ---------------------------------------------------------------------------
// Text styles (cached for performance)
// ---------------------------------------------------------------------------

const S_CITY_NAME = new TextStyle({ fontFamily: "serif", fontSize: 12, fontWeight: "bold", fill: 0xffffff, stroke: { color: 0x000000, width: 3 }, align: "center", letterSpacing: 0.5 });
const S_CITY_POP = new TextStyle({ fontFamily: "serif", fontSize: 10, fontWeight: "bold", fill: 0xffee99, stroke: { color: 0x000000, width: 2 }, align: "center" });
const S_UNIT = new TextStyle({ fontFamily: "monospace", fontSize: 10, fontWeight: "bold", fill: 0xffffff, stroke: { color: 0x000000, width: 2 }, align: "center" });
const S_STACK = new TextStyle({ fontFamily: "sans-serif", fontSize: 9, fontWeight: "bold", fill: 0xffff00, stroke: { color: 0x000000, width: 2 } });
const S_RESOURCE = new TextStyle({ fontFamily: "sans-serif", fontSize: 9, fill: 0xFFD700, stroke: { color: 0x000000, width: 1 } });
const S_IMPROVE = new TextStyle({ fontFamily: "sans-serif", fontSize: 8, fill: 0xDDCCAA, stroke: { color: 0x000000, width: 1 } });
const S_TINY = new TextStyle({ fontSize: 7, fill: 0xFFFFFF, stroke: { color: 0x000000, width: 1 } });

// ---------------------------------------------------------------------------
// Terrain decoration configs
// ---------------------------------------------------------------------------

interface Deco { trees?: number; hills?: number; peak?: boolean; waves?: number; reeds?: boolean; pillars?: boolean; glow?: number; sparkle?: boolean; river?: boolean; grass?: boolean; flowers?: boolean; rocks?: boolean; }

const DECO: Record<string, Deco> = {
  forest:           { trees: 4 },
  enchanted_forest: { trees: 3, glow: 0x44FFAA, sparkle: true },
  hills:            { hills: 3, rocks: true },
  mountains:        { peak: true },
  ocean:            { waves: 3 },
  lake:             { waves: 2 },
  swamp:            { reeds: true, waves: 1 },
  roman_ruins:      { pillars: true },
  holy_spring:      { glow: 0x88CCFF, sparkle: true, waves: 1 },
  river:            { river: true },
  wasteland:        { rocks: true },
  plains:           { grass: true },
  grassland:        { grass: true, flowers: true },
};

const RES_SYM: Record<string, string> = { iron: "⚒", gold_ore: "⚜", horses: "🐎", timber: "⌘", fish: "≋", holy_relic: "✝", mana_crystal: "◈", stone: "⬡" };
const IMP_SYM: Record<string, string> = { farm: "⌂", mine: "⛏", road: "═", lumber_camp: "⚒", pasture: "◎", holy_shrine: "♱" };

// ============================================================================
// CivRenderer
// ============================================================================

export class CivRenderer {
  private world!: Container;
  private terrainGfx!: Graphics;
  private decoC!: Container;
  private borderGfx!: Graphics;
  private overlayGfx!: Graphics;
  private cityC!: Container;
  private unitC!: Container;
  private fogGfx!: Graphics;
  private selGfx!: Graphics;
  private ambientC!: Container; // floating particles, clouds

  private cam = { x: 0, y: 0, z: 1 };
  private dirty = true;
  private terrainDirty = true; // only redraw terrain when camera/state changes
  private lastCamX = -999; private lastCamY = -999; private lastCamZ = -1;
  private f = 0; // frame counter

  private anims: Map<number, { fx: number; fy: number; tx: number; ty: number; p: number }> = new Map();
  private flashes: { x: number; y: number; t: number; c: number }[] = [];
  private floatingTexts: { x: number; y: number; text: string; color: number; t: number }[] = [];
  private cityObjs: Map<number, Container> = new Map();
  private unitObjs: Map<string, Container> = new Map();
  // Cached animated elements (avoid per-frame allocation)
  private waterGfx: Graphics | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  init(_s: CivGameState): void {
    this.world = new Container();
    this.world.sortableChildren = true;

    this.terrainGfx = new Graphics();  this.terrainGfx.zIndex = 0;
    this.decoC = new Container();      this.decoC.zIndex = 1;
    this.borderGfx = new Graphics();   this.borderGfx.zIndex = 2;
    this.overlayGfx = new Graphics();  this.overlayGfx.zIndex = 3;
    this.cityC = new Container();      this.cityC.zIndex = 4;
    this.unitC = new Container();      this.unitC.zIndex = 5;
    this.ambientC = new Container();   this.ambientC.zIndex = 6;
    this.fogGfx = new Graphics();      this.fogGfx.zIndex = 7;
    this.selGfx = new Graphics();      this.selGfx.zIndex = 8;

    this.world.addChild(this.terrainGfx, this.decoC, this.borderGfx, this.overlayGfx, this.cityC, this.unitC, this.ambientC, this.fogGfx, this.selGfx);
    viewManager.layers.background.addChild(this.world);
    this.dirty = true;
  }

  destroy(): void {
    this.cityObjs.clear(); this.unitObjs.clear(); this.anims.clear(); this.flashes.length = 0;
    if (this.world) this.world.destroy({ children: true });
    viewManager.clearWorld();
  }

  // ── Coordinates ──────────────────────────────────────────────────────────

  hexToPixel(hx: number, hy: number): { px: number; py: number } {
    return { px: hx * HEX_W + (hy % 2) * HEX_W / 2, py: hy * HEX_H * 0.75 };
  }

  pixelToHex(px: number, py: number): { x: number; y: number } {
    const row = Math.round(py / (HEX_H * 0.75));
    const col = Math.round((px - (row % 2) * HEX_W / 2) / HEX_W);
    let bx = col, by = row, bd = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const c = this.hexToPixel(col + dx, row + dy);
      const d = (c.px - px) ** 2 + (c.py - py) ** 2;
      if (d < bd) { bd = d; bx = col + dx; by = row + dy; }
    }
    return { x: bx, y: by };
  }

  // ── Camera ───────────────────────────────────────────────────────────────

  panCamera(dx: number, dy: number): void { this.cam.x += dx; this.cam.y += dy; this.dirty = true; }
  zoomCamera(d: number): void { this.cam.z = Math.min(3.5, Math.max(0.1, this.cam.z + d)); this.dirty = true; }
  centerOn(hx: number, hy: number): void {
    const { px, py } = this.hexToPixel(hx, hy);
    const s = viewManager.app.screen;
    this.cam.x = px - s.width / (2 * this.cam.z); this.cam.y = py - s.height / (2 * this.cam.z);
    this.dirty = true;
  }
  markDirty(): void { this.dirty = true; this.terrainDirty = true; }

  animateUnitMove(uid: number, fx: number, fy: number, tx: number, ty: number): void {
    this.anims.set(uid, { fx, fy, tx, ty, p: 0 }); this.dirty = true;
  }
  addCombatFlash(hx: number, hy: number, c: number = 0xFF4444): void {
    this.flashes.push({ x: hx, y: hy, t: 1.0, c }); this.dirty = true;
  }
  addFloatingText(hx: number, hy: number, text: string, color: number = 0xFFFFFF): void {
    this.floatingTexts.push({ x: hx, y: hy, text, color, t: 1.5 }); this.dirty = true;
  }

  getTileAtScreen(sx: number, sy: number): { x: number; y: number } | null {
    return this.pixelToHex(sx / this.cam.z + this.cam.x, sy / this.cam.z + this.cam.y);
  }

  // ── Main render ──────────────────────────────────────────────────────────

  render(state: CivGameState, hp: number): void {
    this.f++;
    for (const [uid, a] of this.anims) { a.p += 0.08; if (a.p >= 1) this.anims.delete(uid); this.dirty = true; }
    if (this.flashes.length > 0 || this.floatingTexts.length > 0) this.dirty = true;

    if (!this.dirty) return;
    this.dirty = false;

    // Camera transform
    this.world.position.set(-this.cam.x * this.cam.z, -this.cam.y * this.cam.z);
    this.world.scale.set(this.cam.z);

    const scr = viewManager.app.screen;
    const inv = 1 / this.cam.z;
    const vl = this.cam.x - 3 * HEX_W, vt = this.cam.y - 3 * HEX_H;
    const vr = this.cam.x + scr.width * inv + 3 * HEX_W, vb = this.cam.y + scr.height * inv + 3 * HEX_H;

    // Only redraw expensive terrain when camera moves significantly
    const camDx = Math.abs(this.cam.x - this.lastCamX);
    const camDy = Math.abs(this.cam.y - this.lastCamY);
    if (this.terrainDirty || camDx > HEX_W * 0.5 || camDy > HEX_H * 0.5 || this.cam.z !== this.lastCamZ) {
      this._terrain(state, hp, vl, vt, vr, vb);
      this._borders(state, vl, vt, vr, vb);
      this._fog(state, hp, vl, vt, vr, vb);
      this.lastCamX = this.cam.x; this.lastCamY = this.cam.y; this.lastCamZ = this.cam.z;
      this.terrainDirty = false;
    }

    // Animate water/sparkles cheaply (reuse Graphics)
    this._animateWater(state, vl, vt, vr, vb);

    // Always update dynamic layers
    this._overlay(state);
    this._cities(state, hp);
    this._units(state, hp);
    this._ambient(state);
    this._selection(state);
  }

  // ── Terrain ──────────────────────────────────────────────────────────────

  private _terrain(state: CivGameState, _hp: number, vl: number, vt: number, vr: number, vb: number): void {
    const g = this.terrainGfx;
    g.clear();
    while (this.decoC.children.length > 0) this.decoC.removeChildAt(0);

    for (let hy = 0; hy < state.mapHeight; hy++) {
      for (let hx = 0; hx < state.mapWidth; hx++) {
        const { px, py } = this.hexToPixel(hx, hy);
        if (px < vl || px > vr || py < vt || py > vb) continue;

        const tile = state.tiles[hy][hx];
        const td = TERRAIN_TYPES[tile.terrain];
        if (!td) continue;

        const h = th(hx, hy), h2 = th2(hx, hy);

        // ── Base hex with per-tile noise ──
        const v = h * 0.14 - 0.07;
        const bc = v > 0 ? lighten(td.color, v) : darken(td.color, -v);
        this._hex(g, px, py, HEX_SIZE, bc, 1.0);

        // ── Hex inner highlight (top-left lit, bottom-right darker) ──
        this._hex(g, px - 1.5, py - 2.5, HEX_SIZE * 0.55, lighten(bc, 0.12), 0.25);
        // Dark bottom edge
        const pts = hexPts(px, py, HEX_SIZE);
        g.moveTo(pts[6], pts[7]); g.lineTo(pts[8], pts[9]); g.lineTo(pts[10], pts[11]);
        g.stroke({ color: darken(bc, 0.2), alpha: 0.4, width: 1.5 });

        // ── Grid border ──
        this._hexOut(g, px, py, HEX_SIZE, darken(bc, 0.3), 0.4, 0.7);

        // ── Deco (static only — water/sparkles animated separately) ──
        const deco = DECO[tile.terrain];
        if (deco) this._deco(px, py, deco, h, h2, bc);

        // ── Resource ──
        if (tile.resource) {
          const s = RES_SYM[tile.resource];
          if (s) { const t = new Text({ text: s, style: S_RESOURCE }); t.anchor.set(0.5); t.position.set(px + HEX_SIZE * 0.35, py - HEX_SIZE * 0.35); this.decoC.addChild(t); }
        }
        // ── Improvement ──
        if (tile.improvement) {
          const s = IMP_SYM[tile.improvement];
          if (s) { const t = new Text({ text: s, style: S_IMPROVE }); t.anchor.set(0.5); t.position.set(px - HEX_SIZE * 0.3, py + HEX_SIZE * 0.35); this.decoC.addChild(t); }
        }
      }
    }
  }

  private _deco(px: number, py: number, d: Deco, h: number, h2: number, bc: number): void {
    const g = new Graphics();
    const S = HEX_SIZE;

    // ── Grass tufts ──
    if (d.grass) {
      for (let i = 0; i < 5; i++) {
        const gx = (h * 60 + i * 17) % (S * 1.2) - S * 0.6;
        const gy = (h2 * 40 + i * 23) % (S * 0.8) - S * 0.3;
        const gh = 3 + h * 3;
        g.moveTo(gx - 1, gy); g.lineTo(gx, gy - gh); g.stroke({ color: lighten(bc, 0.15), alpha: 0.5, width: 1 });
        g.moveTo(gx + 1, gy); g.lineTo(gx + 2, gy - gh * 0.7); g.stroke({ color: lighten(bc, 0.1), alpha: 0.4, width: 1 });
      }
    }

    // ── Flowers ──
    if (d.flowers) {
      for (let i = 0; i < 3; i++) {
        const fx = (h2 * 55 + i * 19) % (S * 1.0) - S * 0.5;
        const fy = (h * 35 + i * 29) % (S * 0.6) - S * 0.2;
        const fc = [0xFF6688, 0xFFCC44, 0xCC88FF, 0xFF9944][Math.floor((h + i * 0.3) * 4) % 4];
        g.circle(fx, fy, 1.8);
        g.fill({ color: fc, alpha: 0.8 });
        g.circle(fx, fy, 0.8);
        g.fill({ color: 0xFFFFFF, alpha: 0.6 });
      }
    }

    // ── Trees (multi-layered, varied sizes) ──
    if (d.trees) {
      const n = d.trees;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + h * 2.5;
        const dist = S * 0.22 + h * S * 0.14;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const sz = 5 + h2 * 4 + i * 0.5;

        // Shadow
        g.ellipse(tx + 1, ty + 1, sz * 0.4, 2);
        g.fill({ color: 0x000000, alpha: 0.15 });

        // Trunk
        g.rect(tx - 1, ty - 1, 2, sz * 0.5);
        g.fill({ color: 0x5A3A1A });

        const leafColor = d.glow ? lerpColor(0x1A5A2A, d.glow, 0.35) : lerpColor(0x1A5A2A, 0x2D6B1E, h2);
        // Two canopy layers for fullness
        g.moveTo(tx - sz * 0.55, ty - 1);
        g.lineTo(tx, ty - sz * 0.8);
        g.lineTo(tx + sz * 0.55, ty - 1);
        g.closePath();
        g.fill({ color: darken(leafColor, 0.1), alpha: 0.95 });

        g.moveTo(tx - sz * 0.4, ty - sz * 0.3);
        g.lineTo(tx, ty - sz);
        g.lineTo(tx + sz * 0.4, ty - sz * 0.3);
        g.closePath();
        g.fill({ color: leafColor, alpha: 0.9 });
      }
    }

    // ── Hills (layered bumps with shading) ──
    if (d.hills) {
      for (let i = 0; i < d.hills; i++) {
        const ox = (i - 1) * S * 0.3 + h * 3;
        const sz = S * (0.2 + h2 * 0.12);
        // Dark back bump
        g.moveTo(ox - sz * 1.1, 4); g.quadraticCurveTo(ox, 4 - sz * 0.9, ox + sz * 1.1, 4);
        g.fill({ color: darken(bc, 0.15), alpha: 0.5 });
        // Light front bump
        g.moveTo(ox - sz, 3); g.quadraticCurveTo(ox, 3 - sz * 0.75, ox + sz, 3);
        g.fill({ color: lighten(bc, 0.12), alpha: 0.6 });
        // Top highlight
        g.moveTo(ox - sz * 0.4, 3 - sz * 0.5); g.quadraticCurveTo(ox, 3 - sz * 0.72, ox + sz * 0.4, 3 - sz * 0.5);
        g.stroke({ color: lighten(bc, 0.25), alpha: 0.3, width: 1 });
      }
    }

    // ── Rocks ──
    if (d.rocks) {
      for (let i = 0; i < 2; i++) {
        const rx = (h * 45 + i * 21) % S - S * 0.5;
        const ry = (h2 * 30 + i * 13) % (S * 0.5);
        const rs = 2 + h * 2;
        g.moveTo(rx - rs, ry); g.lineTo(rx - rs * 0.5, ry - rs); g.lineTo(rx + rs * 0.3, ry - rs * 0.8); g.lineTo(rx + rs, ry); g.closePath();
        g.fill({ color: 0x777766, alpha: 0.6 });
      }
    }

    // ── Mountain (detailed with face shading + snow) ──
    if (d.peak) {
      const mh = S * 0.72;
      // Shadow/dark face
      g.moveTo(0, S * 0.2); g.lineTo(0, -mh); g.lineTo(S * 0.35, S * 0.2); g.closePath();
      g.fill({ color: 0x555555, alpha: 0.85 });
      // Lit face
      g.moveTo(0, S * 0.2); g.lineTo(0, -mh); g.lineTo(-S * 0.32, S * 0.2); g.closePath();
      g.fill({ color: 0x8A8A8A, alpha: 0.85 });
      // Snow cap
      g.moveTo(-S * 0.1, -mh * 0.55); g.lineTo(0, -mh); g.lineTo(S * 0.1, -mh * 0.55); g.closePath();
      g.fill({ color: 0xEEEEFF, alpha: 0.92 });
      // Snow drip
      g.moveTo(-S * 0.12, -mh * 0.5); g.quadraticCurveTo(-S * 0.06, -mh * 0.42, -S * 0.02, -mh * 0.47);
      g.stroke({ color: 0xDDDDEE, alpha: 0.6, width: 1.5 });
      // Secondary peak
      g.moveTo(-S * 0.15, S * 0.15); g.lineTo(-S * 0.05, -mh * 0.45); g.lineTo(S * 0.05, S * 0.12); g.closePath();
      g.fill({ color: 0x6A6A6A, alpha: 0.5 });
    }

    // (Water waves, reeds, and sparkles are animated in _animateWater for performance)

    // ── Roman ruin pillars ──
    if (d.pillars) {
      for (let i = 0; i < 3; i++) {
        const rx = (i - 1) * 9;
        const rh = 7 + h * 6;
        const broken = h2 + i * 0.3 > 0.8;
        const actualH = broken ? rh * 0.6 : rh;
        // Pillar body
        g.rect(rx - 2, -actualH, 4, actualH);
        g.fill({ color: 0xBBAA88 });
        g.stroke({ color: 0x998877, width: 0.5 });
        // Capital
        g.rect(rx - 3, -actualH - 2, 6, 2.5);
        g.fill({ color: 0xCCBB99 });
        // Base
        g.rect(rx - 3, -1, 6, 2);
        g.fill({ color: 0xAA9977 });
        // Cracks
        if (broken) {
          g.moveTo(rx - 1, -actualH); g.lineTo(rx + 1, -actualH + 3);
          g.stroke({ color: 0x887766, width: 0.7 });
        }
      }
      // Fallen stone block
      g.rect(4, 2, 5, 3);
      g.fill({ color: 0xAA9977, alpha: 0.6 });
    }

    // ── River (static base — animation in _animateWater) ──
    if (d.river) {
      g.moveTo(-S * 0.45, -1);
      g.bezierCurveTo(-S * 0.15, 4, S * 0.15, -2, S * 0.45, 0);
      g.stroke({ color: 0x4488BB, alpha: 0.7, width: 4 });
      g.moveTo(-S * 0.4, 0);
      g.bezierCurveTo(-S * 0.12, 3, S * 0.12, -1, S * 0.4, 0.5);
      g.stroke({ color: 0x66AADD, alpha: 0.4, width: 2 });
    }

    // ── Sparkle glow base (animation in _animateWater) ──
    if (d.sparkle && d.glow) {
      g.circle(0, 0, S * 0.3);
      g.fill({ color: d.glow, alpha: 0.05 });
    }

    g.position.set(px, py);
    this.decoC.addChild(g);
  }

  // ── Animated water/sparkle overlay (cheap per-frame) ────────────────────

  private _animateWater(state: CivGameState, vl: number, vt: number, vr: number, vb: number): void {
    if (!this.waterGfx) { this.waterGfx = new Graphics(); this.waterGfx.zIndex = 1.5; this.world.addChild(this.waterGfx); }
    const g = this.waterGfx;
    g.clear();
    const S = HEX_SIZE;
    let hasAnimated = false;

    for (let hy = 0; hy < state.mapHeight; hy++) {
      for (let hx = 0; hx < state.mapWidth; hx++) {
        const { px, py } = this.hexToPixel(hx, hy);
        if (px < vl || px > vr || py < vt || py > vb) continue;
        const terrain = state.tiles[hy][hx].terrain;
        const h = th(hx, hy);
        const deco = DECO[terrain];
        if (!deco) continue;

        // Animated waves
        if (deco.waves) {
          const phase = (this.f * 0.035 + h * 6.28) % (Math.PI * 2);
          const bc = TERRAIN_TYPES[terrain]?.color ?? 0x1A4F7A;
          for (let i = 0; i < deco.waves; i++) {
            const wy = py + (i - (deco.waves - 1) * 0.5) * 7;
            g.moveTo(px - S * 0.35, wy);
            g.bezierCurveTo(px - S * 0.15, wy + Math.sin(phase) * 2.5, px + S * 0.05, wy - Math.sin(phase + 1) * 2.5, px + S * 0.35, wy);
            g.stroke({ color: lighten(bc, 0.22), alpha: 0.4, width: 1.5 });
          }
          hasAnimated = true;
        }

        // Animated sparkles
        if (deco.sparkle && deco.glow) {
          const p = (this.f * 0.025 + h * 10) % (Math.PI * 2);
          for (let i = 0; i < 4; i++) {
            const sx = px + Math.cos(p + i * 1.57) * S * 0.25;
            const sy = py + Math.sin(p + i * 1.57) * S * 0.18;
            const sa = 0.2 + Math.sin(p + i * 2.1) * 0.25;
            g.circle(sx, sy, 1.2);
            g.fill({ color: deco.glow, alpha: Math.max(0, sa) });
          }
          hasAnimated = true;
        }

        // Swaying reeds
        if (deco.reeds) {
          for (let i = 0; i < 4; i++) {
            const rx = px + (h * 50 + i * 11) % S - S / 2;
            const ry = py + ((th2(hx, hy) * 30 + i * 17) % S) * 0.35 - S * 0.1;
            const sway = Math.sin(this.f * 0.02 + i * 1.3) * 1.5;
            g.moveTo(rx, ry);
            g.lineTo(rx + sway * 0.5, ry - 6 - h * 4);
            g.stroke({ color: 0x667744, width: 1.2 });
          }
          hasAnimated = true;
        }
      }
    }

    if (hasAnimated) this.dirty = true; // keep rendering but skip expensive terrain
  }

  // ── Territory borders ────────────────────────────────────────────────────

  private _borders(state: CivGameState, vl: number, vt: number, vr: number, vb: number): void {
    const g = this.borderGfx; g.clear();
    const DIRS_E = [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]];
    const DIRS_O = [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];

    for (let hy = 0; hy < state.mapHeight; hy++) {
      for (let hx = 0; hx < state.mapWidth; hx++) {
        const tile = state.tiles[hy][hx];
        if (tile.owner < 0) continue;
        const { px, py } = this.hexToPixel(hx, hy);
        if (px < vl || px > vr || py < vt || py > vb) continue;

        const fc = tile.owner < CIV_FACTIONS.length ? CIV_FACTIONS[tile.owner].color : 0x888888;
        const dirs = (hy & 1) === 0 ? DIRS_E : DIRS_O;
        const pts = hexPts(px, py, HEX_SIZE);

        for (let i = 0; i < 6; i++) {
          const [dx, dy] = dirs[i];
          const nx = hx + dx, ny = hy + dy;
          const no = (nx >= 0 && nx < state.mapWidth && ny >= 0 && ny < state.mapHeight) ? state.tiles[ny][nx].owner : -1;
          if (no !== tile.owner) {
            const ni = (i + 1) % 6;
            // Outer glow
            g.moveTo(pts[i * 2], pts[i * 2 + 1]); g.lineTo(pts[ni * 2], pts[ni * 2 + 1]);
            g.stroke({ color: lighten(fc, 0.3), alpha: 0.2, width: 5 });
            // Main line
            g.moveTo(pts[i * 2], pts[i * 2 + 1]); g.lineTo(pts[ni * 2], pts[ni * 2 + 1]);
            g.stroke({ color: fc, alpha: 0.65, width: 2.5 });
          }
        }
        // Subtle territory tint
        this._hex(g, px, py, HEX_SIZE * 0.92, fc, 0.05);
      }
    }
  }

  // ── Overlays ─────────────────────────────────────────────────────────────

  private _overlay(state: CivGameState): void {
    const g = this.overlayGfx; g.clear();

    // Reachable
    if (state.reachableTiles) {
      for (const t of state.reachableTiles) {
        const { px, py } = this.hexToPixel(t.x, t.y);
        this._hex(g, px, py, HEX_SIZE - 1, 0x44FF44, 0.12);
        this._hexOut(g, px, py, HEX_SIZE - 1, 0x44FF44, 0.4, 1.5);
        // Dotted center marker
        g.circle(px, py, 2); g.fill({ color: 0x44FF44, alpha: 0.5 });
      }
    }

    // Attackable (pulsing)
    if (state.attackableTiles) {
      const pulse = 0.35 + Math.sin(this.f * 0.12) * 0.25;
      for (const t of state.attackableTiles) {
        const { px, py } = this.hexToPixel(t.x, t.y);
        this._hex(g, px, py, HEX_SIZE - 1, 0xFF2222, 0.18);
        this._hexOut(g, px, py, HEX_SIZE - 1, 0xFF4444, pulse, 2);
        // Sword icon
        const sw = new Text({ text: "⚔", style: S_TINY }); sw.anchor.set(0.5); sw.position.set(px, py);
        sw.alpha = pulse; this.decoC.addChild(sw);
      }
      this.dirty = true;
    }

    // Combat flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t -= 0.035;
      if (f.t <= 0) { this.flashes.splice(i, 1); continue; }
      const { px, py } = this.hexToPixel(f.x, f.y);
      // Expanding ring burst
      const r = HEX_SIZE * (1.8 - f.t);
      this._hexOut(g, px, py, r, f.c, f.t * 0.7, 3);
      this._hexOut(g, px, py, r * 0.6, lighten(f.c, 0.5), f.t * 0.5, 2);
      // Central flash
      this._hex(g, px, py, HEX_SIZE * f.t * 0.8, 0xFFFFFF, f.t * 0.35);
      // Sparks
      for (let j = 0; j < 4; j++) {
        const sa = (this.f * 0.3 + j * 1.57) % (Math.PI * 2);
        const sd = HEX_SIZE * (1.2 - f.t) * 0.8;
        g.circle(px + Math.cos(sa) * sd, py + Math.sin(sa) * sd, 2 * f.t);
        g.fill({ color: 0xFFCC44, alpha: f.t * 0.6 });
      }
      this.dirty = true;
    }
  }

  // ── Ambient (floating particles, damage numbers) ─────────────────────────

  private _ambient(_state: CivGameState): void {
    while (this.ambientC.children.length > 0) this.ambientC.removeChildAt(0);

    // Floating texts (damage numbers, event text)
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.t -= 0.025;
      if (ft.t <= 0) { this.floatingTexts.splice(i, 1); continue; }
      const { px, py } = this.hexToPixel(ft.x, ft.y);
      const yOff = (1.5 - ft.t) * 30; // float upward
      const txt = new Text({ text: ft.text, style: new TextStyle({ fontFamily: "serif", fontSize: 14, fontWeight: "bold", fill: ft.color, stroke: { color: 0x000000, width: 2 } }) });
      txt.anchor.set(0.5); txt.position.set(px, py - 20 - yOff); txt.alpha = Math.min(1, ft.t * 2);
      this.ambientC.addChild(txt);
      this.dirty = true;
    }
  }

  // ── Cities ───────────────────────────────────────────────────────────────

  private _cities(state: CivGameState, hp: number): void {
    const alive = new Set<number>();
    for (const city of state.cities) {
      alive.add(city.id);
      if (hp >= 0 && state.visibility[hp]) { if ((state.visibility[hp][city.y]?.[city.x] ?? 0) === 0) continue; }
      let c = this.cityObjs.get(city.id);
      if (!c) { c = new Container(); this.cityC.addChild(c); this.cityObjs.set(city.id, c); }
      c.removeChildren();
      const { px, py } = this.hexToPixel(city.x, city.y);
      c.position.set(px, py);
      const fc = city.owner >= 0 && city.owner < CIV_FACTIONS.length ? CIV_FACTIONS[city.owner].color : 0x888888;
      this._castle(c, fc, city);
    }
    for (const [id, c] of this.cityObjs) { if (!alive.has(id)) { c.destroy({ children: true }); this.cityObjs.delete(id); } }
  }

  private _castle(p: Container, fc: number, city: CivCity): void {
    const g = new Graphics();
    const w = 24, h = 20, top = -h;

    // Ground shadow
    g.ellipse(0, 4, w * 0.65, 5);
    g.fill({ color: 0x000000, alpha: 0.2 });

    // City size scaling — bigger cities get bigger castles
    const scale = 0.85 + Math.min(city.population, 10) * 0.02;

    // Outer walls (if defense > base)
    if (city.defense > 6) {
      g.rect((-w / 2 - 6) * scale, (top - 3) * scale, (w + 12) * scale, (h + 6) * scale);
      g.fill({ color: 0x6A6A5A, alpha: 0.5 });
      g.stroke({ color: 0x555544, width: 1.5 });
    }

    // Main keep
    g.rect(-w / 2 * scale, top * scale, w * scale, h * scale);
    g.fill({ color: 0x8A8070 });
    // Lit face (left half lighter)
    g.rect(-w / 2 * scale, top * scale, w * 0.5 * scale, h * scale);
    g.fill({ color: 0x9A9080, alpha: 0.4 });

    g.rect(-w / 2 * scale, top * scale, w * scale, h * scale);
    g.stroke({ color: darken(fc, 0.25), width: 1.5 });

    // Left tower
    const tw = 7, th2 = h + 6;
    g.rect((-w / 2 - 4) * scale, (top - 3) * scale, tw * scale, th2 * scale);
    g.fill({ color: 0x7A7060 });
    g.stroke({ color: darken(fc, 0.3), width: 1 });
    // Right tower
    g.rect((w / 2 - 3) * scale, (top - 3) * scale, tw * scale, th2 * scale);
    g.fill({ color: 0x7A7060 });
    g.stroke({ color: darken(fc, 0.3), width: 1 });

    // Tower caps (pointed)
    const capH = 6 * scale;
    g.moveTo((-w / 2 - 4) * scale, (top - 3) * scale);
    g.lineTo((-w / 2 - 0.5) * scale, (top - 3) * scale - capH);
    g.lineTo((-w / 2 + 3) * scale, (top - 3) * scale);
    g.closePath();
    g.fill({ color: fc, alpha: 0.8 });

    g.moveTo((w / 2 - 3) * scale, (top - 3) * scale);
    g.lineTo((w / 2 + 0.5) * scale, (top - 3) * scale - capH);
    g.lineTo((w / 2 + 4) * scale, (top - 3) * scale);
    g.closePath();
    g.fill({ color: fc, alpha: 0.8 });

    // Battlements
    const bw = 4, bh = 5;
    for (let i = -1; i <= 1; i++) {
      g.rect((i * (bw + 2) - bw / 2) * scale, (top - bh) * scale, bw * scale, bh * scale);
      g.fill({ color: 0x8A8070 });
      g.stroke({ color: darken(fc, 0.2), width: 0.8 });
    }

    // Flag pole + banner
    const flagX = 0, flagTop = (top - bh - 16) * scale;
    g.moveTo(flagX, (top - bh) * scale); g.lineTo(flagX, flagTop);
    g.stroke({ color: 0x444444, width: 1.2 });
    // Waving flag
    const wave = Math.sin(this.f * 0.05 + city.id) * 2;
    g.moveTo(flagX, flagTop);
    g.quadraticCurveTo(flagX + 5, flagTop + 2 + wave, flagX + 9, flagTop + 1 + wave * 0.5);
    g.lineTo(flagX, flagTop + 5);
    g.closePath();
    g.fill({ color: fc });
    // Flag waves — animation handled by city redraw on dirty

    // Arched door
    g.moveTo(-3 * scale, 0); g.lineTo(-3 * scale, (top + h - 7) * scale);
    g.quadraticCurveTo(0, (top + h - 10) * scale, 3 * scale, (top + h - 7) * scale);
    g.lineTo(3 * scale, 0); g.closePath();
    g.fill({ color: 0x3A2210 });

    // Windows (warm glow)
    for (const wx of [-7, 4]) {
      g.rect(wx * scale, (top + 4) * scale, 3 * scale, 3.5 * scale);
      g.fill({ color: 0xFFDD66, alpha: 0.75 });
      g.rect((wx + 0.5) * scale, (top + 4.5) * scale, 2 * scale, 2.5 * scale);
      g.fill({ color: 0xFFEE88, alpha: 0.5 });
    }

    p.addChild(g);

    // City name
    const nm = new Text({ text: city.name, style: S_CITY_NAME });
    nm.anchor.set(0.5, 0); nm.position.set(0, 8); p.addChild(nm);

    // Population badge
    const pg = new Graphics();
    pg.circle(0, 22, 8);
    pg.fill({ color: darken(fc, 0.4), alpha: 0.9 });
    pg.stroke({ color: fc, width: 1.2 });
    p.addChild(pg);
    const pop = new Text({ text: String(city.population), style: S_CITY_POP });
    pop.anchor.set(0.5, 0.5); pop.position.set(0, 22); p.addChild(pop);

    // Capital star
    if (city.isCapital) {
      const s = new Text({ text: "★", style: new TextStyle({ fontFamily: "sans-serif", fontSize: 16, fill: 0xFFD700, stroke: { color: 0x000000, width: 2 } }) });
      s.anchor.set(0.5, 0.5); s.position.set(w / 2 * scale + 10, top * scale + h / 2); p.addChild(s);
    }

    // Defense bar
    if (city.defense > 0) {
      const dg = new Graphics();
      const barW = 22, barH = 3.5, barY = (top - bh - 18) * scale;
      dg.rect(-barW / 2, barY, barW, barH); dg.fill({ color: 0x111111, alpha: 0.6 });
      const frac = Math.min(1, city.defense / 15);
      dg.rect(-barW / 2, barY, barW * frac, barH); dg.fill({ color: 0x4488FF });
      dg.rect(-barW / 2, barY, barW * frac, barH * 0.4); dg.fill({ color: 0x66AAFF, alpha: 0.4 }); // highlight
      p.addChild(dg);
    }

    // Happiness indicator
    const hc = city.happiness >= 5 ? 0x44CC44 : city.happiness >= 0 ? 0xFFAA22 : 0xFF3333;
    const hg = new Graphics();
    hg.circle((-w / 2 - 8) * scale, top * scale + h / 2, 3.5);
    hg.fill({ color: hc }); hg.stroke({ color: darken(hc, 0.3), width: 0.8 });
    p.addChild(hg);
  }

  // ── Units ────────────────────────────────────────────────────────────────

  private _units(state: CivGameState, hp: number): void {
    this.unitC.removeChildren(); this.unitObjs.clear();
    const tm = new Map<string, CivUnit[]>();
    for (const u of state.units) {
      if (hp >= 0 && state.visibility[hp]) { if ((state.visibility[hp][u.y]?.[u.x] ?? 0) < 2) continue; }
      const k = `${u.x},${u.y}`;
      let a = tm.get(k); if (!a) { a = []; tm.set(k, a); } a.push(u);
    }
    for (const [key, units] of tm) {
      const u = units[0];
      const an = this.anims.get(u.id);
      let dx: number, dy: number;
      if (an) {
        const fp = this.hexToPixel(an.fx, an.fy), tp = this.hexToPixel(an.tx, an.ty);
        const t = Math.min(1, an.p);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        dx = fp.px + (tp.px - fp.px) * e; dy = fp.py + (tp.py - fp.py) * e;
      } else { const p = this.hexToPixel(u.x, u.y); dx = p.px; dy = p.py; }
      const c = new Container(); c.position.set(dx, dy);
      const fc = u.owner >= 0 && u.owner < CIV_FACTIONS.length ? CIV_FACTIONS[u.owner].color : 0xaaaaaa;
      this._unit(c, u, fc, units.length, state);
      this.unitC.addChild(c); this.unitObjs.set(key, c);
    }
  }

  private _unit(p: Container, u: CivUnit, fc: number, stack: number, state: CivGameState): void {
    const g = new Graphics();
    const r = 13;
    const sel = state.selectedUnitId === u.id;

    // Shadow
    g.ellipse(1.5, r + 3, r * 0.7, 3.5);
    g.fill({ color: 0x000000, alpha: 0.25 });

    // Selection aura
    if (sel) {
      const pulse = 0.5 + Math.sin(this.f * 0.13) * 0.5;
      g.circle(0, 0, r + 6); g.stroke({ color: 0xFFFFFF, alpha: pulse * 0.6, width: 3 });
      g.circle(0, 0, r + 4); g.stroke({ color: fc, alpha: pulse * 0.8, width: 2 });
      g.circle(0, 0, r + 8); g.fill({ color: 0xFFFFFF, alpha: pulse * 0.05 });
      this.dirty = true;
    }

    // Hero golden ring with glow
    if (u.isHero) {
      g.circle(0, 0, r + 3); g.fill({ color: 0xFFD700, alpha: 0.08 });
      g.circle(0, 0, r + 3); g.stroke({ color: 0xFFD700, width: 2.5 });
    }

    // Main circle — outer ring darker, inner lighter
    g.circle(0, 0, r); g.fill({ color: fc });
    g.circle(0, 0, r); g.stroke({ color: darken(fc, 0.5), width: 1.5 });
    // 3D highlight (top-left)
    g.circle(-2, -2, r * 0.55); g.fill({ color: lighten(fc, 0.3), alpha: 0.3 });
    g.circle(-3, -3, r * 0.25); g.fill({ color: lighten(fc, 0.5), alpha: 0.15 });

    // Fortified ring
    if (u.fortified) {
      g.circle(0, 0, r + 1.5); g.stroke({ color: 0x44BBFF, width: 2 });
      g.circle(0, 0, r + 1.5); g.stroke({ color: 0x88DDFF, alpha: 0.3, width: 4 }); // glow
    }

    // Sleeping
    if (u.sleeping) {
      const zt = new Text({ text: "z", style: new TextStyle({ fontSize: 9, fill: 0xAAAAFF, fontWeight: "bold" }) });
      zt.anchor.set(0.5); zt.position.set(r + 4, -r - 4); zt.alpha = 0.6 + Math.sin(this.f * 0.05) * 0.3;
      p.addChild(zt); this.dirty = true;
    }

    p.addChild(g);

    // Unit class icon
    const def = CIV_UNIT_DEFS[u.type];
    const icons: Record<string, string> = { melee: "⚔", ranged: "➶", cavalry: "♞", siege: "⚙", naval: "⚓", hero: "♛", settler: "⌂", worker: "⚒", scout: "◉", special: "✦" };
    const icon = icons[def?.unitClass ?? ""] ?? "";
    if (icon) {
      const ci = new Text({ text: icon, style: S_TINY }); ci.anchor.set(0.5); ci.position.set(-r + 3, -r + 3); ci.alpha = 0.75; p.addChild(ci);
    }

    // Label
    const lb = new Text({ text: u.label, style: S_UNIT }); lb.anchor.set(0.5); lb.position.set(0, 1); p.addChild(lb);

    // HP bar
    const hpF = u.hp / u.maxHp;
    if (hpF < 1.0) {
      const bw = r * 2, bh = 3.5, by = r + 5;
      const hc = hpF > 0.6 ? 0x4CAF50 : hpF > 0.3 ? 0xFFC107 : 0xF44336;
      const bg = new Graphics();
      bg.rect(-bw / 2, by, bw, bh); bg.fill({ color: 0x111111, alpha: 0.7 });
      bg.rect(-bw / 2, by, bw * hpF, bh); bg.fill({ color: hc });
      bg.rect(-bw / 2, by, bw * hpF, bh * 0.35); bg.fill({ color: lighten(hc, 0.3), alpha: 0.4 }); // bar highlight
      p.addChild(bg);
    }

    // XP pips
    if (u.level > 0) {
      const xg = new Graphics();
      for (let i = 0; i < u.level && i < 5; i++) {
        xg.circle(-r + 4 + i * 5, r + 11, 1.8);
        xg.fill({ color: 0xFFD700 });
        xg.circle(-r + 4 + i * 5, r + 10.5, 0.8);
        xg.fill({ color: 0xFFEE88, alpha: 0.5 }); // highlight
      }
      p.addChild(xg);
    }

    // Stack
    if (stack > 1) {
      const st = new Text({ text: `+${stack - 1}`, style: S_STACK }); st.anchor.set(0, 0.5); st.position.set(r + 3, -r + 3); p.addChild(st);
    }
  }

  // ── Fog of War ───────────────────────────────────────────────────────────

  private _fog(state: CivGameState, hp: number, vl: number, vt: number, vr: number, vb: number): void {
    const g = this.fogGfx; g.clear();
    if (hp < 0 || !state.visibility[hp]) return;
    const vis = state.visibility[hp];
    for (let hy = 0; hy < state.mapHeight; hy++) {
      for (let hx = 0; hx < state.mapWidth; hx++) {
        const v = vis[hy]?.[hx] ?? 0;
        if (v === 2) continue;
        const { px, py } = this.hexToPixel(hx, hy);
        if (px < vl || px > vr || py < vt || py > vb) continue;
        if (v === 0) {
          this._hex(g, px, py, HEX_SIZE + 1, 0x080810, 0.97);
        } else {
          this._hex(g, px, py, HEX_SIZE + 1, 0x0A0A18, 0.5);
          // Slight blue tint for explored area
          this._hex(g, px, py, HEX_SIZE, 0x1A1A3A, 0.08);
        }
      }
    }
  }

  // ── Selection ────────────────────────────────────────────────────────────

  private _selection(state: CivGameState): void {
    const g = this.selGfx; g.clear();

    if (state.selectedUnitId >= 0) {
      const u = getUnit(state, state.selectedUnitId);
      if (u) {
        const { px, py } = this.hexToPixel(u.x, u.y);
        const p = 0.4 + Math.sin(this.f * 0.09) * 0.6;
        this._hexOut(g, px, py, HEX_SIZE + 5, 0xFFFFFF, p * 0.7, 2.5);
        this._hexOut(g, px, py, HEX_SIZE + 3, 0xFFDD44, p * 0.5, 1.5);
        this.dirty = true;
      }
    }

    if (state.selectedCityId >= 0) {
      const c = getCity(state, state.selectedCityId);
      if (c) {
        const { px, py } = this.hexToPixel(c.x, c.y);
        const p = 0.7 + Math.sin(this.f * 0.06) * 0.3;
        this._hexOut(g, px, py, HEX_SIZE + 2, 0xFFDD00, p, 3);
        // Show city worked tiles radius
        if (c.tiles) {
          for (const t of c.tiles) {
            const tp = this.hexToPixel(t.x, t.y);
            this._hexOut(g, tp.px, tp.py, HEX_SIZE - 2, 0xFFDD00, 0.12, 1);
          }
        }
        this.dirty = true;
      }
    }
  }

  // ── Drawing primitives ───────────────────────────────────────────────────

  private _hex(g: Graphics, px: number, py: number, r: number, c: number, a: number): void {
    const pts = hexPts(px, py, r);
    g.moveTo(pts[0], pts[1]); for (let i = 2; i < 12; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath(); g.fill({ color: c, alpha: a });
  }

  private _hexOut(g: Graphics, px: number, py: number, r: number, c: number, a: number, w: number): void {
    const pts = hexPts(px, py, r);
    g.moveTo(pts[0], pts[1]); for (let i = 2; i < 12; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath(); g.stroke({ color: c, alpha: a, width: w });
  }
}
