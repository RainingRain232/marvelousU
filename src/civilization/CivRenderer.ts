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

interface Deco { trees?: number; hills?: number; peak?: boolean; waves?: number; reeds?: boolean; pillars?: boolean; glow?: number; sparkle?: boolean; river?: boolean; grass?: boolean; flowers?: boolean; rocks?: boolean; deadTree?: boolean; lilyPads?: boolean; }

const DECO: Record<string, Deco> = {
  forest:           { trees: 4 },
  enchanted_forest: { trees: 3, glow: 0x44FFAA, sparkle: true },
  hills:            { hills: 3, rocks: true },
  mountains:        { peak: true },
  ocean:            { waves: 3 },
  lake:             { waves: 2 },
  swamp:            { reeds: true, waves: 1, lilyPads: true },
  roman_ruins:      { pillars: true },
  holy_spring:      { glow: 0x88CCFF, sparkle: true, waves: 1 },
  river:            { river: true },
  wasteland:        { rocks: true, deadTree: true },
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

        // ── Coastline foam on land tiles adjacent to water ──
        if (td.passable && tile.terrain !== "ocean" && tile.terrain !== "lake") {
          const DIRS_E = [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]];
          const DIRS_O = [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
          const dirs = (hy & 1) === 0 ? DIRS_E : DIRS_O;
          const pts2 = hexPts(px, py, HEX_SIZE);
          for (let ei = 0; ei < 6; ei++) {
            const [dx, dy] = dirs[ei];
            const nx = hx + dx, ny = hy + dy;
            if (nx >= 0 && nx < state.mapWidth && ny >= 0 && ny < state.mapHeight) {
              const nt = state.tiles[ny][nx].terrain;
              if (nt === "ocean" || nt === "lake") {
                const ni = (ei + 1) % 6;
                const x1 = pts2[ei * 2], y1 = pts2[ei * 2 + 1];
                const x2 = pts2[ni * 2], y2 = pts2[ni * 2 + 1];
                // Sandy beach strip
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                g.moveTo(x1, y1); g.quadraticCurveTo(mx + (px - mx) * 0.15, my + (py - my) * 0.15, x2, y2);
                g.stroke({ color: 0xD4C8A0, alpha: 0.5, width: 3 });
                // White foam
                g.moveTo(x1, y1); g.lineTo(x2, y2);
                g.stroke({ color: 0xFFFFFF, alpha: 0.25, width: 1.5 });
              }
            }
          }
        }

        // ── Subtle terrain transition at edges ──
        if (tile.terrain === "grassland" || tile.terrain === "plains") {
          const DIRS_E = [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]];
          const DIRS_O = [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
          const dirs = (hy & 1) === 0 ? DIRS_E : DIRS_O;
          const pts3 = hexPts(px, py, HEX_SIZE * 0.85);
          for (let ei = 0; ei < 6; ei++) {
            const [dx, dy] = dirs[ei];
            const nx = hx + dx, ny = hy + dy;
            if (nx >= 0 && nx < state.mapWidth && ny >= 0 && ny < state.mapHeight) {
              const nt = state.tiles[ny][nx].terrain;
              if (nt === "forest" || nt === "enchanted_forest") {
                const ni = (ei + 1) % 6;
                const x1 = pts3[ei * 2], y1 = pts3[ei * 2 + 1];
                const x2 = pts3[ni * 2], y2 = pts3[ni * 2 + 1];
                g.moveTo(x1, y1); g.lineTo(x2, y2);
                g.stroke({ color: 0x2D5A1E, alpha: 0.15, width: 4 });
              }
            }
          }
        }

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
        const isConifer = (h + i * 0.37) % 1 > 0.5;

        // Shadow
        g.ellipse(tx + 1.5, ty + 2, sz * 0.45, 2.5);
        g.fill({ color: 0x000000, alpha: 0.12 });

        const leafColor = d.glow ? lerpColor(0x1A5A2A, d.glow, 0.35) : lerpColor(0x1A5A2A, 0x2D6B1E, h2);

        if (isConifer) {
          // Pine tree — trunk + 3 layered triangles
          g.rect(tx - 1.2, ty - 1, 2.4, sz * 0.55);
          g.fill({ color: 0x5A3A1A });
          for (let layer = 0; layer < 3; layer++) {
            const layerY = ty - 1 - layer * sz * 0.25;
            const layerW = sz * (0.6 - layer * 0.12);
            const layerH = sz * 0.35;
            g.moveTo(tx - layerW, layerY);
            g.lineTo(tx, layerY - layerH);
            g.lineTo(tx + layerW, layerY);
            g.closePath();
            g.fill({ color: darken(leafColor, 0.05 + layer * 0.05), alpha: 0.92 });
          }
        } else {
          // Deciduous tree — trunk + round canopy with highlight
          g.rect(tx - 1.5, ty - 1, 3, sz * 0.5);
          g.fill({ color: 0x5A3A1A });
          g.rect(tx - 0.8, ty - 1, 1.6, sz * 0.5);
          g.fill({ color: 0x6A4A2A, alpha: 0.5 }); // trunk highlight

          // Main canopy (rounded blob)
          const cr = sz * 0.45;
          const cy2 = ty - sz * 0.45;
          g.circle(tx, cy2, cr);
          g.fill({ color: leafColor, alpha: 0.9 });
          // Canopy shadow (bottom)
          g.ellipse(tx, cy2 + cr * 0.3, cr * 0.9, cr * 0.5);
          g.fill({ color: darken(leafColor, 0.2), alpha: 0.3 });
          // Canopy highlight (top-left)
          g.circle(tx - cr * 0.25, cy2 - cr * 0.25, cr * 0.5);
          g.fill({ color: lighten(leafColor, 0.2), alpha: 0.25 });
          // Small leaf clusters at edges
          for (let lc = 0; lc < 3; lc++) {
            const la = (lc / 3) * Math.PI * 2 + h * 3;
            const lx = tx + Math.cos(la) * cr * 0.7;
            const ly = cy2 + Math.sin(la) * cr * 0.6;
            g.circle(lx, ly, cr * 0.3);
            g.fill({ color: lerpColor(leafColor, lighten(leafColor, 0.15), h2), alpha: 0.5 });
          }
        }
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

    // ── Dead tree (wasteland) ──
    if (d.deadTree) {
      // Cracked earth lines
      for (let ci = 0; ci < 6; ci++) {
        const ca = (ci / 6) * Math.PI * 2 + h * 3;
        const cl = S * (0.15 + h * 0.2);
        g.moveTo(0, 0);
        g.lineTo(Math.cos(ca) * cl, Math.sin(ca) * cl);
        g.stroke({ color: darken(bc, 0.25), alpha: 0.35, width: 0.8 });
        // Branch crack
        if (ci % 2 === 0) {
          const bca = ca + (h2 - 0.5) * 0.8;
          g.moveTo(Math.cos(ca) * cl * 0.6, Math.sin(ca) * cl * 0.6);
          g.lineTo(Math.cos(bca) * cl * 0.9, Math.sin(bca) * cl * 0.9);
          g.stroke({ color: darken(bc, 0.2), alpha: 0.25, width: 0.6 });
        }
      }
      // Dead tree trunk
      const dtx = h * S * 0.2 - S * 0.1;
      g.moveTo(dtx, 2); g.lineTo(dtx - 1, -6); g.lineTo(dtx + 1.5, -8);
      g.stroke({ color: 0x4A3A2A, alpha: 0.7, width: 2 });
      // Dead branches
      g.moveTo(dtx, -4); g.lineTo(dtx - 4, -7);
      g.stroke({ color: 0x4A3A2A, alpha: 0.5, width: 1 });
      g.moveTo(dtx + 1, -6); g.lineTo(dtx + 5, -9);
      g.stroke({ color: 0x4A3A2A, alpha: 0.5, width: 1 });
      g.moveTo(dtx + 4, -8); g.lineTo(dtx + 6, -6);
      g.stroke({ color: 0x4A3A2A, alpha: 0.4, width: 0.8 });
    }

    // ── Lily pads (swamp) ──
    if (d.lilyPads) {
      for (let lp = 0; lp < 3; lp++) {
        const lpx = (h * 50 + lp * 19) % (S * 0.8) - S * 0.4;
        const lpy = (h2 * 35 + lp * 23) % (S * 0.6) - S * 0.2;
        const lpr = 2.5 + h * 1.5;
        // Pad (circle with wedge cut)
        g.moveTo(lpx, lpy);
        g.arc(lpx, lpy, lpr, 0.2, Math.PI * 2 - 0.2);
        g.closePath();
        g.fill({ color: 0x3A6A2A, alpha: 0.6 });
        // Pad vein
        g.moveTo(lpx, lpy); g.lineTo(lpx + lpr * 0.7, lpy - lpr * 0.3);
        g.stroke({ color: 0x2A5A1A, alpha: 0.3, width: 0.5 });
        // Flower on first pad
        if (lp === 0) {
          g.circle(lpx + lpr * 0.3, lpy - lpr * 0.2, 1.5);
          g.fill({ color: 0xFFAACC, alpha: 0.7 });
          g.circle(lpx + lpr * 0.3, lpy - lpr * 0.2, 0.7);
          g.fill({ color: 0xFFFFDD, alpha: 0.6 });
        }
      }
      // Murky pool highlight
      g.circle(h * S * 0.3, h2 * S * 0.2, S * 0.15);
      g.fill({ color: lighten(bc, 0.08), alpha: 0.2 });
    }

    // ── Mountain (detailed with face shading + snow) ──
    if (d.peak) {
      const mh = S * 0.72;
      const mw = S * 0.35;
      // Scree / base rubble
      for (let si = 0; si < 5; si++) {
        const sx = (h * 40 + si * 11) % (S * 0.7) - S * 0.35;
        const sy = S * 0.12 + (h2 * 20 + si * 7) % 5;
        const ss = 1.5 + h * 1.5;
        g.circle(sx, sy, ss);
        g.fill({ color: 0x666658, alpha: 0.4 });
      }
      // Main peak — shadow face (right)
      g.moveTo(0, S * 0.2); g.lineTo(0, -mh); g.lineTo(mw, S * 0.2); g.closePath();
      g.fill({ color: 0x505050, alpha: 0.88 });
      // Lit face (left)
      g.moveTo(0, S * 0.2); g.lineTo(0, -mh); g.lineTo(-mw + 1, S * 0.2); g.closePath();
      g.fill({ color: 0x8A8A8A, alpha: 0.88 });
      // Mid-mountain ridge line
      g.moveTo(-mw * 0.3, S * 0.1); g.lineTo(-mw * 0.05, -mh * 0.6);
      g.stroke({ color: 0x6A6A6A, alpha: 0.5, width: 0.8 });
      // Snow cap (larger, with drip)
      g.moveTo(-S * 0.12, -mh * 0.5); g.lineTo(0, -mh); g.lineTo(S * 0.12, -mh * 0.5);
      g.closePath();
      g.fill({ color: 0xEEEEFF, alpha: 0.93 });
      // Snow drip left
      g.moveTo(-S * 0.13, -mh * 0.48);
      g.quadraticCurveTo(-S * 0.08, -mh * 0.38, -S * 0.04, -mh * 0.44);
      g.stroke({ color: 0xDDDDEE, alpha: 0.55, width: 1.5 });
      // Snow drip right
      g.moveTo(S * 0.1, -mh * 0.47);
      g.quadraticCurveTo(S * 0.06, -mh * 0.4, S * 0.03, -mh * 0.44);
      g.stroke({ color: 0xDDDDEE, alpha: 0.4, width: 1 });
      // Secondary peak (smaller, offset)
      const mh2 = mh * 0.55;
      g.moveTo(-S * 0.18, S * 0.15); g.lineTo(-S * 0.08, -mh2); g.lineTo(S * 0.02, S * 0.12);
      g.closePath();
      g.fill({ color: 0x6A6A6A, alpha: 0.55 });
      // Tiny tertiary peak
      g.moveTo(S * 0.1, S * 0.15); g.lineTo(S * 0.18, -mh * 0.3); g.lineTo(S * 0.28, S * 0.15);
      g.closePath();
      g.fill({ color: 0x5A5A5A, alpha: 0.35 });
      // Cliff shadow detail lines
      g.moveTo(S * 0.05, -mh * 0.2); g.lineTo(S * 0.15, -mh * 0.05);
      g.stroke({ color: 0x444444, alpha: 0.3, width: 0.7 });
      g.moveTo(S * 0.1, -mh * 0.35); g.lineTo(S * 0.2, -mh * 0.15);
      g.stroke({ color: 0x444444, alpha: 0.25, width: 0.6 });
    }

    // (Water waves, reeds, and sparkles are animated in _animateWater for performance)

    // ── Roman ruin pillars ──
    if (d.pillars) {
      // Mosaic floor remnant
      g.rect(-S * 0.3, -2, S * 0.6, 5);
      g.fill({ color: 0x998866, alpha: 0.3 });
      // Mosaic pattern
      for (let mi = 0; mi < 4; mi++) {
        const mx = -S * 0.25 + mi * S * 0.15;
        g.rect(mx, -1, S * 0.1, 3);
        g.fill({ color: [0xBB9966, 0x886644, 0xAA8855, 0x997755][mi], alpha: 0.25 });
      }

      // Pillars (3, some broken)
      for (let i = 0; i < 3; i++) {
        const rx = (i - 1) * 9;
        const rh = 7 + h * 6;
        const broken = h2 + i * 0.3 > 0.8;
        const actualH = broken ? rh * 0.5 + h * 2 : rh;
        // Pillar shadow
        g.ellipse(rx + 1.5, 1, 2.5, 1);
        g.fill({ color: 0x000000, alpha: 0.1 });
        // Pillar body with fluting (vertical lines)
        g.rect(rx - 2, -actualH, 4, actualH);
        g.fill({ color: 0xBBAA88 });
        g.moveTo(rx - 0.5, -actualH); g.lineTo(rx - 0.5, 0);
        g.stroke({ color: 0xAA9977, alpha: 0.4, width: 0.5 });
        g.moveTo(rx + 0.5, -actualH); g.lineTo(rx + 0.5, 0);
        g.stroke({ color: 0xCCBB99, alpha: 0.3, width: 0.5 });
        g.rect(rx - 2, -actualH, 4, actualH);
        g.stroke({ color: 0x998877, width: 0.5 });
        // Ionic capital (scroll detail)
        g.rect(rx - 3.5, -actualH - 2.5, 7, 3);
        g.fill({ color: 0xCCBB99 });
        g.circle(rx - 3, -actualH - 1, 1.5);
        g.fill({ color: 0xBBAA88 });
        g.circle(rx + 3, -actualH - 1, 1.5);
        g.fill({ color: 0xBBAA88 });
        // Base
        g.rect(rx - 3, -1, 6, 2.5);
        g.fill({ color: 0xAA9977 });
        // Cracks on broken pillars
        if (broken) {
          g.moveTo(rx - 1.5, -actualH); g.lineTo(rx + 0.5, -actualH + 4);
          g.stroke({ color: 0x887766, alpha: 0.6, width: 0.8 });
          g.moveTo(rx + 1, -actualH + 1); g.lineTo(rx - 0.5, -actualH + 5);
          g.stroke({ color: 0x887766, alpha: 0.4, width: 0.5 });
        }
        // Ivy on some pillars
        if (!broken && i === 1) {
          for (let iv = 0; iv < 4; iv++) {
            const iy = -actualH + iv * (actualH / 4) + 2;
            const ix = rx + (iv % 2 === 0 ? 2 : -2);
            g.circle(ix, iy, 1.5);
            g.fill({ color: 0x448833, alpha: 0.5 });
            g.circle(ix + (iv % 2 === 0 ? 1 : -1), iy + 1, 1);
            g.fill({ color: 0x55AA44, alpha: 0.4 });
          }
        }
      }
      // Broken arch between pillars 0 and 1
      g.moveTo(-9, -8 - h * 5);
      g.quadraticCurveTo(-4.5, -14 - h * 4, 0, -8 - h * 5);
      g.stroke({ color: 0xBBAA88, alpha: 0.5, width: 2 });
      // Fallen stone blocks
      g.rect(4, 2, 5, 3);
      g.fill({ color: 0xAA9977, alpha: 0.5 });
      g.rect(6, 4, 3, 2.5);
      g.fill({ color: 0x998866, alpha: 0.4 });
      g.moveTo(4, 2); g.lineTo(9, 2); g.lineTo(9, 5); g.lineTo(4, 5); g.closePath();
      g.stroke({ color: 0x887766, alpha: 0.3, width: 0.5 });
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

    // Draw trade route lines between trading cities
    for (const city of state.cities) {
      for (const routeId of (city.tradeRoutes ?? [])) {
        if (routeId <= city.id) continue; // avoid drawing twice
        const partner = state.cities.find(c => c.id === routeId);
        if (!partner) continue;
        const from = this.hexToPixel(city.x, city.y);
        const to = this.hexToPixel(partner.x, partner.y);
        // Dashed gold line
        const dx = to.px - from.px, dy = to.py - from.py;
        const len = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.floor(len / 8);
        for (let si = 0; si < segments; si += 2) {
          const t1 = si / segments, t2 = Math.min(1, (si + 1) / segments);
          g.moveTo(from.px + dx * t1, from.py + dy * t1);
          g.lineTo(from.px + dx * t2, from.py + dy * t2);
          g.stroke({ color: 0xFFD700, alpha: 0.4, width: 1.5 });
        }
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

    // Highlight outer ring of reachable tiles
    if (state.reachableTiles && state.reachableTiles.length > 0) {
      const reachSet = new Set(state.reachableTiles.map(t => `${t.x},${t.y}`));
      for (const t of state.reachableTiles) {
        // Check if any neighbor is NOT reachable — this is an edge tile
        let isEdge = false;
        const DIRS = (t.y & 1) === 0
          ? [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]]
          : [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
        for (const [dx, dy] of DIRS) {
          if (!reachSet.has(`${t.x + dx},${t.y + dy}`)) { isEdge = true; break; }
        }
        if (isEdge) {
          const { px, py } = this.hexToPixel(t.x, t.y);
          this._hexOut(g, px, py, HEX_SIZE - 2, 0x88FF88, 0.5, 2);
        }
      }
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

    // Moat for fortified cities
    if (city.defense > 8) {
      g.ellipse(0, 2, (w / 2 + 9) * scale, 7 * scale);
      g.fill({ color: 0x3A6FB5, alpha: 0.2 });
      g.ellipse(0, 2, (w / 2 + 9) * scale, 7 * scale);
      g.stroke({ color: 0x4A8FC2, alpha: 0.25, width: 1 });
    }

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

    // Chimney
    g.rect(5 * scale, (top + 1) * scale, 3 * scale, -5 * scale);
    g.fill({ color: 0x6A5A4A });
    g.stroke({ color: 0x5A4A3A, width: 0.5 });

    // Smoke puffs (static — for animated smoke, would use particles)
    for (let si = 0; si < 3; si++) {
      const sx = 6.5 * scale + Math.sin(city.id + si * 2) * 2;
      const sy = (top - 2 - si * 4) * scale;
      const sr = 2 + si * 0.8;
      g.circle(sx, sy, sr);
      g.fill({ color: 0xBBBBAA, alpha: 0.15 - si * 0.03 });
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

    // Unit type silhouette behind label
    const sg = new Graphics();
    const def = CIV_UNIT_DEFS[u.type];
    if (def) {
      switch (def.unitClass) {
        case "melee":
          // Crossed swords
          sg.moveTo(-4, -5); sg.lineTo(4, 5); sg.stroke({ color: 0xFFFFFF, alpha: 0.2, width: 1.5 });
          sg.moveTo(4, -5); sg.lineTo(-4, 5); sg.stroke({ color: 0xFFFFFF, alpha: 0.2, width: 1.5 });
          break;
        case "cavalry":
          // Horse head silhouette (simplified)
          sg.moveTo(-3, 3); sg.quadraticCurveTo(-5, -2, -2, -5);
          sg.quadraticCurveTo(1, -6, 4, -3); sg.lineTo(5, 0);
          sg.stroke({ color: 0xFFFFFF, alpha: 0.2, width: 1.2 });
          break;
        case "ranged":
          // Bow
          sg.moveTo(-4, 4); sg.quadraticCurveTo(-6, 0, -4, -4);
          sg.stroke({ color: 0xFFFFFF, alpha: 0.2, width: 1.2 });
          sg.moveTo(-4, 4); sg.lineTo(4, -2);
          sg.stroke({ color: 0xFFFFFF, alpha: 0.15, width: 0.8 });
          break;
        case "siege":
          // Wheel
          sg.circle(0, 0, 5);
          sg.stroke({ color: 0xFFFFFF, alpha: 0.15, width: 1 });
          sg.moveTo(-5, 0); sg.lineTo(5, 0);
          sg.stroke({ color: 0xFFFFFF, alpha: 0.1, width: 0.8 });
          break;
      }
    }
    p.addChild(sg);

    // Unit class icon
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

    // Soft fog edges — draw larger, more transparent hexes at fog boundaries
    for (let hy2 = 0; hy2 < state.mapHeight; hy2++) {
      for (let hx2 = 0; hx2 < state.mapWidth; hx2++) {
        const v2 = vis[hy2]?.[hx2] ?? 0;
        if (v2 !== 1) continue; // only at explored-but-dark boundaries
        const { px: px2, py: py2 } = this.hexToPixel(hx2, hy2);
        if (px2 < vl || px2 > vr || py2 < vt || py2 > vb) continue;
        // Check if any neighbor is fully visible (v=2) — that's a fog edge
        const DIRS = (hy2 & 1) === 0
          ? [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]]
          : [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
        for (const [dx, dy] of DIRS) {
          const nx2 = hx2 + dx, ny2 = hy2 + dy;
          if (nx2 >= 0 && nx2 < state.mapWidth && ny2 >= 0 && ny2 < state.mapHeight) {
            if ((vis[ny2]?.[nx2] ?? 0) === 2) {
              // This is a fog edge — draw soft outer glow
              this._hex(g, px2, py2, HEX_SIZE * 1.2, 0x0A0A18, 0.12);
              break;
            }
          }
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
          // Show yield icons on worked tiles
          for (let ti = 0; ti < Math.min(c.tiles.length, c.population + 1); ti++) {
            const wt = c.tiles[ti];
            const { px: wpx, py: wpy } = this.hexToPixel(wt.x, wt.y);
            const terrain = TERRAIN_TYPES[state.tiles[wt.y]?.[wt.x]?.terrain ?? ""];
            if (terrain) {
              // Tiny yield indicators
              if (terrain.food > 0) {
                g.circle(wpx - 6, wpy + HEX_SIZE * 0.45, 2);
                g.fill({ color: 0x44CC44, alpha: 0.7 });
              }
              if (terrain.production > 0) {
                g.circle(wpx, wpy + HEX_SIZE * 0.45, 2);
                g.fill({ color: 0xCC8833, alpha: 0.7 });
              }
              if (terrain.gold > 0) {
                g.circle(wpx + 6, wpy + HEX_SIZE * 0.45, 2);
                g.fill({ color: 0xFFDD44, alpha: 0.7 });
              }
            }
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
