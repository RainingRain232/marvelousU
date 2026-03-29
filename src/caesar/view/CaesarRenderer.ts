// ---------------------------------------------------------------------------
// Caesar – 2D Pixi.js Renderer (high polygon count procedural graphics)
// ---------------------------------------------------------------------------

import * as PIXI from "pixi.js";
import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";
import { tileAt, type CaesarTerrain } from "../state/CaesarMap";
import { canPlaceBuilding } from "../systems/CaesarBuildingSystem";

// ---- Seeded RNG ----
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawStar(g: PIXI.Graphics, cx: number, cy: number, outerR: number, innerR: number, points: number): void {
  const verts: number[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.poly(verts);
}

function shadeColor(c: number, f: number): number {
  return (Math.min(255, Math.max(0, ((c >> 16) & 0xff) * f | 0)) << 16) |
         (Math.min(255, Math.max(0, ((c >> 8) & 0xff) * f | 0)) << 8) |
          Math.min(255, Math.max(0, (c & 0xff) * f | 0));
}

// ---- Palettes ----
const GRASS = [0x5a8f3c, 0x4e8233, 0x66993f, 0x528736, 0x5d9140, 0x4a7a30];
const WATER_BASE = [0x2a6ec4, 0x3178cc, 0x2564b8, 0x3a82d4];
const WATER_HI = 0x6ab0ee;
const FOREST_G = [0x2d6b1e, 0x256218, 0x347522, 0x1e5812, 0x2a7020];
const HILL_C = [0x8b7355, 0x7e6848, 0x96805e, 0x887050];
const STONE_C = [0x9e9e9e, 0x8a8a8a, 0xaaaaaa, 0x959595];
const IRON_C = [0x607d8b, 0x546e7a, 0x6d8c99, 0x4a6878];
const FLOWER_COLORS = [0xff6b6b, 0xffeb3b, 0xba68c8, 0x64b5f6, 0xff8a65, 0xffffff, 0xe040fb, 0x7cb342];
const MUSHROOM_COLORS = [0xd4a057, 0xc62828, 0xffffff, 0x8d6e63];
const LEAF_COLORS = [0x558b2f, 0x6d9b2a, 0x8bc34a, 0x9e9d24, 0xc0a030];

const ROAD_BASE = 0x9e8c74;
const ROAD_STONE = 0xb8a890;
const ROAD_EDGE = 0x7a6a54;
const ROAD_CRACK = 0x6a5a44;

const H_WALLS = [0xb89878, 0xc4a282, 0xd4b896, 0xe0c8a4, 0xf0dcc0];
const H_ROOFS = [0x8b4513, 0xa0522d, 0xbc6c3c, 0xcc7a44, 0xd4944c];
const H_ROOF_HI = [0xa05828, 0xb86838, 0xcc8048, 0xdc9050, 0xe4a460];

const W_BODY: Record<string, number> = { service: 0x4488aa, immigrant: 0x55aa55, bandit: 0x882222, militia: 0x2244aa };
const W_HEAD: Record<string, number> = { service: 0xf0d0a0, immigrant: 0xf0d0a0, bandit: 0x664444, militia: 0xf0d0a0 };
const W_LEGS: Record<string, number> = { service: 0x336688, immigrant: 0x448844, bandit: 0x553333, militia: 0x223388 };

export class CaesarRenderer {
  private _app: PIXI.Application | null = null;
  private _terrainLayer = new PIXI.Container();
  private _decorLayer = new PIXI.Container();
  private _gridLayer = new PIXI.Container();
  private _shadowLayer = new PIXI.Container();
  private _buildingLayer = new PIXI.Container();
  private _walkerLayer = new PIXI.Container();
  private _fxLayer = new PIXI.Container();
  private _overlayLayer = new PIXI.Container();
  private _uiLayer = new PIXI.Container();

  private _cameraX = 0;
  private _cameraY = 0;
  private _zoom = 1;
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _camStartX = 0;
  private _camStartY = 0;
  private _keys = new Set<string>();
  private _panRAF: number | null = null;

  private _terrainGfx: PIXI.Graphics | null = null;
  private _decorGfx: PIXI.Graphics | null = null;
  private _gridGfx: PIXI.Graphics | null = null;
  private _terrainDirty = true;
  private _highlightGfx = new PIXI.Graphics();
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _time = 0;
  private _smoke: { x: number; y: number; age: number; life: number; vx: number; vy: number; sz: number }[] = [];
  private _sparks: { x: number; y: number; age: number; life: number; vx: number; vy: number; c: number }[] = [];
  private _fireParticles: { x: number; y: number; age: number; life: number; vx: number; vy: number; sz: number }[] = [];
  private _envParticles: { x: number; y: number; age: number; life: number; vx: number; vy: number; type: "leaf" | "dust" | "butterfly"; c: number }[] = [];

  onMinimapClick: ((tx: number, ty: number) => void) | null = null;

  get canvas(): HTMLCanvasElement | null { return this._app?.canvas as HTMLCanvasElement ?? null; }

  async init(sw: number, sh: number): Promise<void> {
    this._app = new PIXI.Application();
    await this._app.init({ width: sw, height: sh, backgroundColor: 0x4a7a2c, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
    const canvas = this._app.canvas as HTMLCanvasElement;
    canvas.style.zIndex = "1";
    document.body.appendChild(canvas);
    const s = this._app.stage;
    s.addChild(this._terrainLayer); s.addChild(this._decorLayer); s.addChild(this._gridLayer);
    s.addChild(this._shadowLayer); s.addChild(this._buildingLayer); s.addChild(this._walkerLayer);
    s.addChild(this._fxLayer); s.addChild(this._overlayLayer); s.addChild(this._uiLayer);
    this._overlayLayer.addChild(this._highlightGfx);
    this._shadowLayer.alpha = 0.12;
    this._cameraX = 0; this._cameraY = 0;
    this._setupInput(); this._createMinimap();
  }

  private _setupInput(): void {
    const c = this._app!.canvas as HTMLCanvasElement;
    c.addEventListener("wheel", (e) => { e.preventDefault(); const wx = e.clientX / this._zoom + this._cameraX; const wy = e.clientY / this._zoom + this._cameraY; this._zoom = Math.max(0.3, Math.min(3, this._zoom * (e.deltaY > 0 ? 0.9 : 1.1))); this._cameraX = wx - e.clientX / this._zoom; this._cameraY = wy - e.clientY / this._zoom; this._clampCamera(); });
    c.addEventListener("mousedown", (e) => { if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) { this._isDragging = true; this._dragStartX = e.clientX; this._dragStartY = e.clientY; this._camStartX = this._cameraX; this._camStartY = this._cameraY; } });
    c.addEventListener("mousemove", (e) => { if (this._isDragging) { this._cameraX = this._camStartX - (e.clientX - this._dragStartX) / this._zoom; this._cameraY = this._camStartY - (e.clientY - this._dragStartY) / this._zoom; this._clampCamera(); } });
    c.addEventListener("mouseup", () => { this._isDragging = false; });
    window.addEventListener("keydown", (e) => this._keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this._keys.delete(e.key.toLowerCase()));
    const sp = 8;
    const pan = (): void => { if (this._keys.has("a") || this._keys.has("arrowleft")) this._cameraX -= sp / this._zoom; if (this._keys.has("d") || this._keys.has("arrowright")) this._cameraX += sp / this._zoom; if (this._keys.has("w") || this._keys.has("arrowup")) this._cameraY -= sp / this._zoom; if (this._keys.has("s") || this._keys.has("arrowdown")) this._cameraY += sp / this._zoom; this._clampCamera(); this._panRAF = requestAnimationFrame(pan); };
    this._panRAF = requestAnimationFrame(pan);
  }

  private _createMinimap(): void {
    this._minimapCanvas = document.createElement("canvas"); this._minimapCanvas.width = 180; this._minimapCanvas.height = 120;
    this._minimapCanvas.style.cssText = `position:fixed;bottom:50px;right:8px;z-index:110;border:2px solid #5a4020;border-radius:4px;cursor:pointer;image-rendering:pixelated;background:#111;`;
    document.body.appendChild(this._minimapCanvas);
    this._minimapCanvas.addEventListener("click", (e) => { const r = this._minimapCanvas!.getBoundingClientRect(); this.centerOn(Math.floor(((e.clientX - r.left) / r.width) * CB.MAP_WIDTH), Math.floor(((e.clientY - r.top) / r.height) * CB.MAP_HEIGHT)); });
  }

  screenToTile(sx: number, sy: number) { return { x: Math.floor((sx / this._zoom + this._cameraX) / CB.TILE_SIZE), y: Math.floor((sy / this._zoom + this._cameraY) / CB.TILE_SIZE) }; }
  centerOn(tx: number, ty: number) { const sw = this._app?.screen.width ?? 800; const sh = this._app?.screen.height ?? 600; this._cameraX = tx * CB.TILE_SIZE - sw / (2 * this._zoom); this._cameraY = ty * CB.TILE_SIZE - sh / (2 * this._zoom); this._clampCamera(); }

  private _clampCamera(): void {
    const sw = this._app?.screen.width ?? 800;
    const sh = this._app?.screen.height ?? 600;
    const mapPxW = CB.MAP_WIDTH * CB.TILE_SIZE;
    const mapPxH = CB.MAP_HEIGHT * CB.TILE_SIZE;
    const viewW = sw / this._zoom;
    const viewH = sh / this._zoom;
    // Clamp so camera never shows beyond map edges
    const maxX = Math.max(0, mapPxW - viewW);
    const maxY = Math.max(0, mapPxH - viewH);
    this._cameraX = Math.max(0, Math.min(maxX, this._cameraX));
    this._cameraY = Math.max(0, Math.min(maxY, this._cameraY));
  }
  markTerrainDirty() { this._terrainDirty = true; }

  render(state: CaesarState, dt: number): void {
    if (!this._app) return;
    this._time += dt;
    const s = this._app.stage;
    s.scale.set(this._zoom);
    s.position.set(-this._cameraX * this._zoom, -this._cameraY * this._zoom);
    this._renderTerrain(state);
    this._renderBuildings(state, dt);
    this._renderWalkers(state);
    this._renderFX(state, dt);
    this._renderHighlight(state);
    this._renderMinimap(state);
  }

  // ==================================================================
  // TERRAIN
  // ==================================================================
  private _renderTerrain(state: CaesarState): void {
    if (!this._terrainDirty) return;
    this._terrainDirty = false;
    if (this._terrainGfx) { this._terrainLayer.removeChild(this._terrainGfx); this._terrainGfx.destroy(); }
    if (this._decorGfx) { this._decorLayer.removeChild(this._decorGfx); this._decorGfx.destroy(); }
    if (this._gridGfx) { this._gridLayer.removeChild(this._gridGfx); this._gridGfx.destroy(); }

    const g = new PIXI.Graphics();
    const d = new PIXI.Graphics();
    const gr = new PIXI.Graphics();
    const map = state.map;
    const ts = CB.TILE_SIZE;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y * map.width + x];
        const rng = mulberry32(x * 7919 + y * 104729);
        const px = x * ts, py = y * ts;

        // ---- Base tile with sub-tile color variation ----
        let base: number;
        switch (tile.terrain) {
          case "grass": base = GRASS[Math.floor(rng() * GRASS.length)]; base = shadeColor(base, 0.9 + tile.elevation * 0.2 + rng() * 0.1); break;
          case "water": base = WATER_BASE[Math.floor(rng() * WATER_BASE.length)]; break;
          case "forest": base = GRASS[Math.floor(rng() * GRASS.length)]; base = shadeColor(base, 0.8 + tile.elevation * 0.15); break;
          case "hill": base = HILL_C[Math.floor(rng() * HILL_C.length)]; base = shadeColor(base, 0.85 + tile.elevation * 0.3); break;
          case "stone_deposit": base = STONE_C[Math.floor(rng() * STONE_C.length)]; break;
          case "iron_deposit": base = IRON_C[Math.floor(rng() * IRON_C.length)]; break;
          default: base = 0x5a8f3c;
        }
        // Split tile into 4 quadrants with slight color shifts
        const q = ts / 2;
        for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
          const qc = shadeColor(base, 0.96 + rng() * 0.08);
          g.rect(px + qx * q, py + qy * q, q, q);
          g.fill(qc);
        }

        // ---- Grass: dense tufts, flowers, mushrooms, pebbles, bushes ----
        if (tile.terrain === "grass") {
          // Dense grass tufts (V shapes) — more per tile
          const tufts = 4 + Math.floor(rng() * 6);
          for (let i = 0; i < tufts; i++) {
            const tx = px + 2 + rng() * (ts - 4);
            const ty = py + 2 + rng() * (ts - 4);
            const th = 2 + rng() * 3;
            const tc = shadeColor(base, 1.05 + rng() * 0.25);
            // 3-blade grass tuft
            d.moveTo(tx - 1.2, ty); d.lineTo(tx - 0.3, ty - th); d.stroke({ color: tc, width: 0.7 });
            d.moveTo(tx, ty); d.lineTo(tx, ty - th * 1.1); d.stroke({ color: shadeColor(tc, 1.1), width: 0.8 });
            d.moveTo(tx + 1.2, ty); d.lineTo(tx + 0.3, ty - th); d.stroke({ color: tc, width: 0.7 });
          }
          // Wildflower clusters (2 flowers close together)
          if (rng() < 0.2) {
            for (let fc = 0; fc < 1 + Math.floor(rng() * 2); fc++) {
              const fx = px + 3 + rng() * (ts - 6);
              const fy = py + 3 + rng() * (ts - 6);
              const col = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
              const stemH = 3 + rng() * 2;
              // Stem with slight curve
              d.moveTo(fx, fy); d.lineTo(fx + rng() * 1.5 - 0.75, fy - stemH);
              d.stroke({ color: 0x4a7a30, width: 0.6 });
              // Petals (5-6)
              const petals = 5 + Math.floor(rng() * 2);
              for (let p = 0; p < petals; p++) {
                const a = (p / petals) * Math.PI * 2 + rng() * 0.3;
                const pr = 1 + rng() * 0.5;
                d.ellipse(fx + Math.cos(a) * pr, fy - stemH + Math.sin(a) * pr, 0.8, 0.6);
                d.fill(col);
              }
              d.circle(fx, fy - stemH, 0.5); d.fill(0xffeb3b); // center
              // Leaf on stem
              d.ellipse(fx + 1.5, fy - stemH * 0.4, 1.5, 0.6);
              d.fill(0x558b2f);
            }
          }
          // Pebbles
          if (rng() < 0.12) {
            const pebbles = 2 + Math.floor(rng() * 3);
            for (let p = 0; p < pebbles; p++) {
              const ppx = px + 3 + rng() * (ts - 6);
              const ppy = py + 3 + rng() * (ts - 6);
              d.ellipse(ppx, ppy, 0.8 + rng() * 0.8, 0.5 + rng() * 0.5);
              d.fill(shadeColor(0x999999, 0.7 + rng() * 0.5));
            }
          }
          // Mushroom
          if (rng() < 0.05) {
            const mx = px + 4 + rng() * (ts - 8);
            const my = py + ts * 0.5 + rng() * (ts * 0.4);
            const mc = MUSHROOM_COLORS[Math.floor(rng() * MUSHROOM_COLORS.length)];
            // Stem
            d.roundRect(mx - 0.5, my - 1, 1, 2.5, 0.3); d.fill(0xfaf0e0);
            // Cap
            d.ellipse(mx, my - 1.5, 2 + rng(), 1.2); d.fill(mc);
            // Cap spots
            d.circle(mx - 0.5, my - 1.8, 0.3); d.fill({ color: 0xffffff, alpha: 0.5 });
            d.circle(mx + 0.7, my - 1.5, 0.25); d.fill({ color: 0xffffff, alpha: 0.5 });
          }
          // Bush with berries
          if (rng() < 0.07) {
            const bx = px + 4 + rng() * (ts - 8);
            const by = py + ts * 0.5 + rng() * (ts * 0.35);
            const bsz = 3 + rng() * 3;
            // Multi-ellipse bush
            d.ellipse(bx, by, bsz, bsz * 0.65); d.fill(shadeColor(0x3d7a28, 0.85 + rng() * 0.3));
            d.ellipse(bx - bsz * 0.3, by - bsz * 0.15, bsz * 0.7, bsz * 0.5); d.fill(shadeColor(0x4a8a30, 0.95 + rng() * 0.2));
            d.ellipse(bx + bsz * 0.2, by - bsz * 0.2, bsz * 0.5, bsz * 0.35); d.fill({ color: 0xffffff, alpha: 0.05 });
            // Berries
            if (rng() < 0.5) {
              for (let br = 0; br < 3; br++) {
                d.circle(bx + (rng() - 0.5) * bsz, by + (rng() - 0.5) * bsz * 0.5, 0.6);
                d.fill(rng() > 0.5 ? 0xc62828 : 0x7b1fa2);
              }
            }
          }
        }

        // ---- Forest: dense trees, fallen logs, leaf litter, undergrowth ----
        if (tile.terrain === "forest") {
          // Leaf litter on ground
          const litter = 3 + Math.floor(rng() * 5);
          for (let l = 0; l < litter; l++) {
            const lx = px + 2 + rng() * (ts - 4);
            const ly = py + 2 + rng() * (ts - 4);
            const lc = LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)];
            d.ellipse(lx, ly, 1 + rng(), 0.5 + rng() * 0.5);
            d.fill({ color: lc, alpha: 0.3 + rng() * 0.3 });
          }
          // Undergrowth ferns
          if (rng() < 0.4) {
            const ux = px + 3 + rng() * (ts - 6);
            const uy = py + ts * 0.7 + rng() * (ts * 0.25);
            for (let f = 0; f < 3; f++) {
              const fa = (f / 3) * Math.PI - Math.PI / 4;
              const fl = 2.5 + rng() * 2;
              d.moveTo(ux, uy);
              d.lineTo(ux + Math.cos(fa) * fl, uy + Math.sin(fa) * fl - 1);
              d.stroke({ color: 0x2d6b1e, width: 0.7 });
              // Fern leaves (tiny lines off the stem)
              for (let lf = 0; lf < 3; lf++) {
                const lt = (lf + 1) / 4;
                const lbx = ux + Math.cos(fa) * fl * lt;
                const lby = uy + (Math.sin(fa) * fl - 1) * lt;
                d.moveTo(lbx, lby);
                d.lineTo(lbx + Math.cos(fa + 1) * 1.5, lby + Math.sin(fa + 1) * 1.5 - 0.5);
                d.stroke({ color: 0x3d8a28, width: 0.4 });
              }
            }
          }
          // Fallen log
          if (rng() < 0.08) {
            const lx = px + 3 + rng() * (ts - 10);
            const ly = py + ts * 0.6 + rng() * (ts * 0.3);
            const ll = 5 + rng() * 6;
            rng();
            d.roundRect(lx, ly, ll, 2.5, 1);
            d.fill(0x5d4037);
            // Bark texture
            d.moveTo(lx + ll * 0.3, ly); d.lineTo(lx + ll * 0.3, ly + 2.5);
            d.stroke({ color: 0x4a3328, width: 0.3 });
            // Moss
            d.ellipse(lx + ll * 0.5, ly, ll * 0.2, 1);
            d.fill({ color: 0x558b2f, alpha: 0.4 });
          }
          // Trees (more per tile with larger tile size)
          const tc = 2 + Math.floor(rng() * 3);
          for (let t = 0; t < tc; t++) {
            const tx = px + 4 + rng() * (ts - 8);
            const ty = py + ts * 0.45 + rng() * (ts * 0.45);
            this._drawDetailedTree(d, tx, ty, ts, rng);
          }
          // Small saplings
          if (rng() < 0.3) {
            const sx = px + 3 + rng() * (ts - 6);
            const sy = py + ts * 0.7 + rng() * (ts * 0.2);
            d.moveTo(sx, sy); d.lineTo(sx, sy - 3); d.stroke({ color: 0x5d4037, width: 0.5 });
            d.circle(sx, sy - 3.5, 1.5 + rng()); d.fill(shadeColor(0x3d8a28, 0.9 + rng() * 0.3));
          }
        }

        // ---- Water decorations: lily pads, bubbles ----
        if (tile.terrain === "water") {
          // Lily pads (only on non-shore water)
          let isShore = false;
          for (const [ddx, ddy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nt = tileAt(map, x + ddx, y + ddy);
            if (nt && nt.terrain !== "water") { isShore = true; break; }
          }
          if (!isShore && rng() < 0.15) {
            const lpx = px + 4 + rng() * (ts - 8);
            const lpy = py + 4 + rng() * (ts - 8);
            const lpr = 2 + rng() * 2;
            // Pad (circle with notch)
            d.circle(lpx, lpy, lpr); d.fill(0x2e7d32);
            d.circle(lpx, lpy, lpr); d.stroke({ color: 0x1b5e20, width: 0.4 });
            // Notch (small triangle cut)
            d.poly([lpx, lpy, lpx + lpr, lpy - lpr * 0.3, lpx + lpr * 0.6, lpy + lpr * 0.3]);
            d.fill(WATER_BASE[0]);
            // Flower on some pads
            if (rng() < 0.4) {
              d.circle(lpx - lpr * 0.2, lpy - lpr * 0.1, lpr * 0.35); d.fill(0xffffff);
              for (let p = 0; p < 5; p++) {
                const a = (p / 5) * Math.PI * 2;
                d.ellipse(lpx - lpr * 0.2 + Math.cos(a) * lpr * 0.3, lpy - lpr * 0.1 + Math.sin(a) * lpr * 0.3, lpr * 0.2, lpr * 0.12);
                d.fill(rng() > 0.5 ? 0xffc0cb : 0xffffff);
              }
              d.circle(lpx - lpr * 0.2, lpy - lpr * 0.1, lpr * 0.12); d.fill(0xffeb3b);
            }
          }
          // Bubbles
          if (rng() < 0.08) {
            for (let bb = 0; bb < 2; bb++) {
              const bx = px + 4 + rng() * (ts - 8);
              const by = py + 4 + rng() * (ts - 8);
              d.circle(bx, by, 0.6 + rng() * 0.6);
              d.fill({ color: 0xaaddff, alpha: 0.25 });
              d.circle(bx, by, 0.6 + rng() * 0.6);
              d.stroke({ color: 0x88bbee, width: 0.3, alpha: 0.3 });
            }
          }

          // Depth gradient — deeper water toward center vs shoreline
          let nearLand = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx2 = x + dx, ny2 = y + dy;
            if (nx2 >= 0 && nx2 < map.width && ny2 >= 0 && ny2 < map.height) {
              const nt = map.tiles[ny2 * map.width + nx2].terrain;
              if (nt !== "water") nearLand = true;
            }
          }
          if (nearLand) {
            // Shallow water — lighter, sandy undertone
            d.rect(px + 2, py + 2, ts - 4, ts - 4);
            d.fill({ color: 0x4A90C8, alpha: 0.15 });
            // Sand edge toward neighboring land
            for (let dy2 = -1; dy2 <= 1; dy2++) for (let dx2 = -1; dx2 <= 1; dx2++) {
              const nx3 = x + dx2, ny3 = y + dy2;
              if (nx3 >= 0 && nx3 < map.width && ny3 >= 0 && ny3 < map.height) {
                const nt2 = map.tiles[ny3 * map.width + nx3].terrain;
                if (nt2 !== "water") {
                  const ex = dx2 > 0 ? ts - 3 : (dx2 < 0 ? 0 : ts / 2 - 2);
                  const ey = dy2 > 0 ? ts - 3 : (dy2 < 0 ? 0 : ts / 2 - 2);
                  d.rect(px + ex, py + ey, 4, 4);
                  d.fill({ color: 0xC8B888, alpha: 0.2 });
                }
              }
            }
          } else {
            // Deep water — darker overlay
            d.rect(px + 1, py + 1, ts - 2, ts - 2);
            d.fill({ color: 0x1A3A7A, alpha: 0.15 });
          }
        }

        // ---- Hills: layered rocks with facets ----
        if (tile.terrain === "hill" || tile.terrain === "stone_deposit" || tile.terrain === "iron_deposit") {
          // Gravel patches
          const gravel = 4 + Math.floor(rng() * 6);
          for (let gv = 0; gv < gravel; gv++) {
            const gx = px + 2 + rng() * (ts - 4);
            const gy = py + 2 + rng() * (ts - 4);
            d.circle(gx, gy, 0.4 + rng() * 0.5);
            d.fill(shadeColor(0x777777, 0.7 + rng() * 0.6));
          }
          // Rocks (more, bigger)
          const rc = 3 + Math.floor(rng() * 3);
          for (let r = 0; r < rc; r++) {
            const rx = px + 4 + rng() * (ts - 8);
            const ry = py + 4 + rng() * (ts - 8);
            this._drawRock(d, rx, ry, 2.5 + rng() * 4, tile.terrain === "iron_deposit" ? 0x4a6070 : 0x888888, rng);
          }
          // Elevation contour lines
          d.moveTo(px + 2 + rng() * 4, py + ts * 0.3 + rng() * 3);
          d.lineTo(px + ts - 2 - rng() * 4, py + ts * 0.35 + rng() * 3);
          d.stroke({ color: shadeColor(base, 0.85), width: 0.6, alpha: 0.3 });
          d.moveTo(px + 3 + rng() * 5, py + ts * 0.65 + rng() * 3);
          d.lineTo(px + ts - 3 - rng() * 5, py + ts * 0.7 + rng() * 3);
          d.stroke({ color: shadeColor(base, 1.15), width: 0.5, alpha: 0.25 });
          // Ore veins (more, branching)
          if (tile.terrain === "iron_deposit") {
            for (let v = 0; v < 3; v++) {
              const vx = px + 4 + rng() * (ts - 8); const vy = py + 4 + rng() * (ts - 8);
              const vex = vx + rng() * 8 - 4; const vey = vy + rng() * 6 - 3;
              d.moveTo(vx, vy); d.lineTo(vex, vey);
              d.stroke({ color: 0x8b5e3c, width: 1.2, alpha: 0.55 });
              // Branch
              d.moveTo(vex, vey); d.lineTo(vex + rng() * 4 - 2, vey + rng() * 3 - 1.5);
              d.stroke({ color: 0x7a4e30, width: 0.7, alpha: 0.4 });
            }
            // Sparkle points (mineral glints)
            for (let sp = 0; sp < 2; sp++) {
              const spx = px + 5 + rng() * (ts - 10);
              const spy = py + 5 + rng() * (ts - 10);
              d.circle(spx, spy, 0.5); d.fill({ color: 0xddccaa, alpha: 0.4 });
            }
          }
          if (tile.terrain === "stone_deposit") {
            // Cut stone block patterns
            for (let v = 0; v < 3; v++) {
              const vx = px + 4 + rng() * (ts - 10); const vy = py + 4 + rng() * (ts - 10);
              d.rect(vx, vy, 3 + rng() * 3, 2 + rng() * 2);
              d.stroke({ color: 0xbbbbbb, width: 0.5, alpha: 0.3 });
              d.rect(vx, vy, 3 + rng() * 3, 2 + rng() * 2);
              d.fill({ color: 0xcccccc, alpha: 0.08 });
            }
          }
        }

        // ---- Water: shore with sand gradient, reeds ----
        if (tile.terrain === "water") {
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dx, dy] of dirs) {
            const nt = tileAt(map, x + dx, y + dy);
            if (nt && nt.terrain !== "water") {
              // Multi-layer shore gradient
              for (let sl = 0; sl < 4; sl++) {
                const eX = dx === 1 ? px + ts - 1 - sl : dx === -1 ? px + sl : px;
                const eY = dy === 1 ? py + ts - 1 - sl : dy === -1 ? py + sl : py;
                const eW = dx !== 0 ? 1 : ts; const eH = dy !== 0 ? 1 : ts;
                g.rect(eX, eY, eW, eH);
                g.fill({ color: 0xc2b280, alpha: 0.35 - sl * 0.08 });
              }
              // Reeds near shore (more, with cattails)
              if (rng() < 0.4) {
                const reeds = 3 + Math.floor(rng() * 4);
                for (let r = 0; r < reeds; r++) {
                  const rx = dx !== 0 ? (dx === 1 ? px + ts - 3 : px + 3) : px + 3 + rng() * (ts - 6);
                  const ry = dy !== 0 ? (dy === 1 ? py + ts - 3 : py + 3) : py + 3 + rng() * (ts - 6);
                  const rh = 4 + rng() * 5;
                  const sway = rng() * 2 - 1;
                  d.moveTo(rx, ry); d.lineTo(rx + sway, ry - rh);
                  d.stroke({ color: 0x6d8b2a, width: 0.8 });
                  // Cattail head on some reeds
                  if (rng() < 0.4) {
                    d.ellipse(rx + sway, ry - rh - 1, 0.8, 1.5);
                    d.fill(0x5d4037);
                  }
                  // Reed leaf
                  d.moveTo(rx + sway * 0.5, ry - rh * 0.5);
                  d.lineTo(rx + sway * 0.5 + 2, ry - rh * 0.5 + 1);
                  d.stroke({ color: 0x7aa830, width: 0.5 });
                }
              }
            }
          }
        }
      }
    }

    // Grid
    for (let y = 0; y <= map.height; y++) { gr.moveTo(0, y * ts); gr.lineTo(map.width * ts, y * ts); gr.stroke({ width: 0.5, color: 0x000000, alpha: 0.05 }); }
    for (let x = 0; x <= map.width; x++) { gr.moveTo(x * ts, 0); gr.lineTo(x * ts, map.height * ts); gr.stroke({ width: 0.5, color: 0x000000, alpha: 0.05 }); }

    this._terrainGfx = g; this._decorGfx = d; this._gridGfx = gr;
    this._terrainLayer.addChild(g); this._decorLayer.addChild(d); this._gridLayer.addChild(gr);
  }

  private _drawDetailedTree(g: PIXI.Graphics, x: number, y: number, ts: number, rng: () => number): void {
    const trunkH = ts * 0.25 + rng() * ts * 0.12;
    const trunkW = 1.5 + rng();
    const crownR = ts * 0.28 + rng() * ts * 0.18;
    const cy = y - trunkH;
    const col = FOREST_G[Math.floor(rng() * FOREST_G.length)];

    // Trunk with bark texture
    g.roundRect(x - trunkW / 2, y - trunkH, trunkW, trunkH, 0.5);
    g.fill(0x5d4037);
    g.moveTo(x - trunkW * 0.3, y - trunkH * 0.3); g.lineTo(x - trunkW * 0.1, y);
    g.stroke({ color: 0x4a3328, width: 0.4 });

    // Crown layers (3-4 overlapping ellipses for volume)
    const layers = 3 + Math.floor(rng() * 2);
    for (let l = 0; l < layers; l++) {
      const lx = x + (rng() - 0.5) * crownR * 0.6;
      const ly = cy + (rng() - 0.5) * crownR * 0.4;
      const lr = crownR * (0.6 + rng() * 0.5);
      g.ellipse(lx, ly, lr, lr * 0.8);
      g.fill(shadeColor(col, 0.75 + rng() * 0.5));
    }
    // Top highlight
    g.ellipse(x - crownR * 0.15, cy - crownR * 0.2, crownR * 0.4, crownR * 0.3);
    g.fill({ color: 0xffffff, alpha: 0.06 });

    // Shadow under tree
    g.ellipse(x, y + 1, crownR * 0.6, crownR * 0.2);
    g.fill({ color: 0x000000, alpha: 0.08 });
  }

  private _drawRock(g: PIXI.Graphics, x: number, y: number, sz: number, baseCol: number, rng: () => number): void {
    // Irregular polygon rock (5-7 points)
    const pts = 5 + Math.floor(rng() * 3);
    const verts: number[] = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
      const r = sz * (0.6 + rng() * 0.5);
      verts.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7);
    }
    g.poly(verts); g.fill(shadeColor(baseCol, 0.8 + rng() * 0.4));
    g.poly(verts); g.stroke({ color: shadeColor(baseCol, 0.6), width: 0.5 });
    // Highlight facet
    if (pts >= 3) {
      g.poly([verts[0], verts[1], verts[2], verts[3], x, y - sz * 0.3]);
      g.fill({ color: 0xffffff, alpha: 0.08 });
    }
  }

  // ==================================================================
  // BUILDINGS
  // ==================================================================
  private _renderBuildings(state: CaesarState, _dt: number): void {
    for (const c of this._buildingLayer.removeChildren()) c.destroy();
    for (const c of this._shadowLayer.removeChildren()) c.destroy();
    const ts = CB.TILE_SIZE;

    for (const b of state.buildings.values()) {
      const bdef = CAESAR_BUILDING_DEFS[b.type];
      const px = b.tileX * ts, py = b.tileY * ts;
      const pw = bdef.footprint.w * ts, ph = bdef.footprint.h * ts;

      // Enhanced shadow
      const sh = new PIXI.Graphics();
      const shX = px + 3, shY = py + 3;
      // Softer outer shadow
      sh.roundRect(shX + 1, shY + 1, pw + 2, ph + 2, 3); sh.fill({ color: 0x000000, alpha: 0.35 });
      // Main shadow
      sh.roundRect(shX, shY, pw, ph, 2); sh.fill({ color: 0x000000, alpha: 0.7 });
      this._shadowLayer.addChild(sh);

      const g = new PIXI.Graphics();
      const rng = mulberry32(b.id * 1337);

      if (!b.built) { this._drawConstruction(g, b, px, py, pw, ph, ts); }
      else switch (b.type) {
        case CaesarBuildingType.ROAD: this._drawRoad(g, state, b, px, py, ts); break;
        case CaesarBuildingType.HOUSING: this._drawHousing(g, b, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.WALL: this._drawWall(g, b, px, py, ts, rng); break;
        case CaesarBuildingType.GATE: this._drawGate(g, px, py, ts); break;
        case CaesarBuildingType.TOWER: this._drawTower(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.WELL: this._drawWell(g, px, py, ts); break;
        case CaesarBuildingType.FARM: this._drawFarm(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.MILL: this._drawMill(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.BAKERY: this._drawBakery(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.BUTCHER: this._drawButcher(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.MARKET: this._drawMarket(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.GRANARY: this._drawGranary(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.WAREHOUSE: this._drawWarehouse(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.LUMBER_CAMP: this._drawLumber(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.QUARRY: this._drawQuarry(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.IRON_MINE: this._drawIronMine(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.BLACKSMITH: this._drawBlacksmith(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.WEAVER: this._drawWeaver(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.CHAPEL: case CaesarBuildingType.CHURCH: case CaesarBuildingType.CATHEDRAL:
          this._drawReligion(g, b, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.WATCHPOST: this._drawWatchpost(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.BARRACKS: this._drawBarracks(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.TAVERN: this._drawTavern(g, px, py, pw, ph, ts); break;
        case CaesarBuildingType.FESTIVAL_GROUND: this._drawFestival(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.JOUSTING_ARENA: this._drawJousting(g, px, py, pw, ph, ts, rng); break;
        case CaesarBuildingType.GUILD_HALL: this._drawGuild(g, px, py, pw, ph, ts); break;
        default: this._drawGeneric(g, b, px, py, pw, ph, ts); break;
      }

      // Pseudo-3D: right side wall depth strip for non-road buildings
      if (b.built && b.type !== CaesarBuildingType.ROAD && b.type !== CaesarBuildingType.WALL &&
          b.type !== CaesarBuildingType.GATE && pw >= ts) {
        const depthW = Math.min(3, pw * 0.08);
        g.rect(px + pw - depthW - 1, py + 3, depthW, ph - 5);
        g.fill({ color: 0x000000, alpha: 0.1 });
        // Bottom edge depth
        g.rect(px + 2, py + ph - 3, pw - 4, 2);
        g.fill({ color: 0x000000, alpha: 0.06 });
      }

      // HP bar
      if (b.built && b.hp > 0 && b.hp < b.maxHp) {
        const r = b.hp / b.maxHp;
        g.roundRect(px + 2, py - 1, pw - 4, 3, 1); g.fill(0x222222);
        g.roundRect(px + 2, py - 1, (pw - 4) * r, 3, 1); g.fill(r > 0.5 ? 0x4caf50 : 0xf44336);
      }

      // Building level badge (stars)
      if (b.built && b.level > 1 && b.type !== CaesarBuildingType.ROAD) {
        for (let s = 0; s < b.level - 1; s++) {
          const sx = px + pw - 4 - s * 5;
          const sy = py + 3;
          // Tiny star
          drawStar(g, sx, sy, 2, 1, 5); g.fill(0xffd700);
          drawStar(g, sx, sy, 2, 1, 5); g.stroke({ color: 0xaa8800, width: 0.3 });
        }
      }

      // Upgrading shimmer
      if (b.upgrading) {
        const shimmer = Math.sin(this._time * 6) * 0.5 + 0.5;
        g.roundRect(px, py, pw, ph, 2);
        g.fill({ color: 0xffd700, alpha: shimmer * 0.12 });
        // Progress bar
        g.roundRect(px + 3, py + ph - 4, pw - 6, 3, 1); g.fill(0x333333);
        g.roundRect(px + 3, py + ph - 4, (pw - 6) * b.upgradeProgress, 3, 1); g.fill(0xffd700);
      }

      // Fire visual overlay!
      if (b.onFire) {
        // Red-orange pulsing glow
        const fireGlow = 0.4 + Math.sin(this._time * 8 + b.id) * 0.15;
        g.roundRect(px, py, pw, ph, 2);
        g.fill({ color: 0xff2200, alpha: fireGlow * 0.3 });
        g.roundRect(px + 1, py + 1, pw - 2, ph - 2, 2);
        g.stroke({ color: 0xff6600, width: 1.5, alpha: fireGlow });

        // Spawn fire particles
        if (Math.random() < 0.15) {
          const fpx = px + Math.random() * pw;
          const fpy = py + Math.random() * ph * 0.5;
          this._fireParticles.push({
            x: fpx, y: fpy, age: 0, life: 0.5 + Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 10,
            sz: 1.5 + Math.random() * 2,
          });
        }
        // Spawn dark smoke from fires
        if (Math.random() < 0.06) {
          this._smoke.push({
            x: px + Math.random() * pw, y: py + 1, age: 0, life: 2 + Math.random(),
            vx: (Math.random() - 0.5) * 4, vy: -8 - Math.random() * 5, sz: 2 + Math.random() * 2,
          });
        }
      }

      // Selection glow
      if (state.selectedBuildingId === b.id) {
        g.roundRect(px - 1, py - 1, pw + 2, ph + 2, 2);
        g.stroke({ color: 0xffdd44, width: 2, alpha: 0.85 + Math.sin(this._time * 4) * 0.15 });
      }

      this._buildingLayer.addChild(g);

      // Smoke from production
      if (b.built && !b.onFire && bdef.productionTime > 0 && b.workers > 0 && Math.random() < 0.015) {
        this._smoke.push({ x: px + pw * 0.6 + Math.random() * 4 - 2, y: py + 2, age: 0, life: 1.5 + Math.random(), vx: (Math.random() - 0.5) * 3, vy: -6 - Math.random() * 4, sz: 1.5 + Math.random() });
      }
      // Extra thick smoke from bakery ovens
      if (b.built && !b.onFire && b.type === CaesarBuildingType.BAKERY && b.workers > 0 && Math.random() < 0.04) {
        this._smoke.push({ x: px + pw * 0.7 + Math.random() * 3 - 1.5, y: py + 1, age: 0, life: 2 + Math.random(), vx: 1 + Math.random() * 2, vy: -8 - Math.random() * 5, sz: 2 + Math.random() * 1.5 });
      }
      // Forge sparks
      if (b.built && b.type === CaesarBuildingType.BLACKSMITH && b.workers > 0 && Math.random() < 0.04) {
        for (let i = 0; i < 3; i++) this._sparks.push({ x: px + pw * 0.5, y: py + ph * 0.6, age: 0, life: 0.4 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 15, c: Math.random() > 0.5 ? 0xff8800 : 0xffcc00 });
      }
    }
  }

  // ---- Building draw methods ----

  private _drawConstruction(g: PIXI.Graphics, b: CaesarBuilding, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const p = b.constructionProgress;
    g.rect(px + 1, py + 1, pw - 2, ph - 2); g.fill({ color: 0x8b7355, alpha: 0.35 });
    const bH = (ph - 4) * p;
    // Stone foundation
    g.rect(px + 2, py + ph - 2 - Math.min(bH, ph * 0.15), pw - 4, Math.min(bH, ph * 0.15)); g.fill(0x9e9e9e);
    // Rising walls
    if (p > 0.15) { g.rect(px + 3, py + ph - 2 - bH, pw - 6, bH - ph * 0.15); g.fill(0xc2a882); }
    // Scaffold poles
    g.moveTo(px + 3, py + 2); g.lineTo(px + 3, py + ph - 2); g.stroke({ color: 0x5d4037, width: 1, alpha: 0.7 });
    g.moveTo(px + pw - 3, py + 2); g.lineTo(px + pw - 3, py + ph - 2); g.stroke({ color: 0x5d4037, width: 1, alpha: 0.7 });
    // Cross braces
    const braces = Math.floor(p * 5);
    for (let i = 0; i < braces; i++) {
      const ly = py + ph - 2 - (bH / 5) * (i + 1);
      g.moveTo(px + 3, ly); g.lineTo(px + pw - 3, ly); g.stroke({ color: 0x5d4037, width: 1, alpha: 0.7 });
    }
    // Diagonal warning stripes on construction site
    const stripeGap = 6;
    for (let i = -ph; i < pw + ph; i += stripeGap) {
      const x0 = px + 2 + i, y0 = py + 2;
      const x1 = x0 - ph + 4, y1 = py + ph - 2;
      g.moveTo(Math.max(px + 2, Math.min(px + pw - 2, x0)), y0);
      g.lineTo(Math.max(px + 2, Math.min(px + pw - 2, x1)), y1);
      g.stroke({ color: 0xffa000, width: 0.7, alpha: 0.25 });
    }
    // Progress bar
    g.roundRect(px + 4, py + ph - 5, pw - 8, 3, 1); g.fill(0x333333);
    g.roundRect(px + 4, py + ph - 5, (pw - 8) * p, 3, 1); g.fill(0x4caf50);
  }

  private _drawRoad(g: PIXI.Graphics, state: CaesarState, b: CaesarBuilding, px: number, py: number, ts: number): void {
    const cx = b.tileX, cy = b.tileY;
    const N = this._hasRoad(state, cx, cy - 1), S = this._hasRoad(state, cx, cy + 1);
    const E = this._hasRoad(state, cx + 1, cy), W = this._hasRoad(state, cx - 1, cy);
    const rng = mulberry32(cx * 31 + cy * 97);
    const hw = ts * 0.32;

    g.rect(px, py, ts, ts); g.fill(ROAD_BASE);

    // Road surface with edge trim
    const mx = px + ts / 2, my = py + ts / 2;
    if (N || S || E || W) {
      g.roundRect(mx - hw, my - hw, hw * 2, hw * 2, 2); g.fill(ROAD_STONE);
    }
    if (N) { g.rect(mx - hw, py, hw * 2, ts / 2); g.fill(ROAD_STONE); g.rect(mx - hw, py, 1, ts / 2); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); g.rect(mx + hw - 1, py, 1, ts / 2); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); }
    if (S) { g.rect(mx - hw, my, hw * 2, ts / 2); g.fill(ROAD_STONE); g.rect(mx - hw, my, 1, ts / 2); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); g.rect(mx + hw - 1, my, 1, ts / 2); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); }
    if (E) { g.rect(mx, my - hw, ts / 2, hw * 2); g.fill(ROAD_STONE); g.rect(mx, my - hw, ts / 2, 1); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); g.rect(mx, my + hw - 1, ts / 2, 1); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); }
    if (W) { g.rect(px, my - hw, ts / 2, hw * 2); g.fill(ROAD_STONE); g.rect(px, my - hw, ts / 2, 1); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); g.rect(px, my + hw - 1, ts / 2, 1); g.fill({ color: ROAD_EDGE, alpha: 0.4 }); }
    if (!N && !S && !E && !W) { g.roundRect(px + 2, py + 2, ts - 4, ts - 4, 2); g.fill(ROAD_STONE); }

    // Stone cobble dots & cracks
    for (let d = 0; d < 5; d++) {
      const dx = px + 2 + rng() * (ts - 4), dy = py + 2 + rng() * (ts - 4);
      g.circle(dx, dy, 0.5 + rng() * 0.6); g.fill({ color: ROAD_EDGE, alpha: 0.2 + rng() * 0.3 });
    }
    if (rng() < 0.3) { const cx2 = px + 4 + rng() * (ts - 8); const cy2 = py + 4 + rng() * (ts - 8); g.moveTo(cx2, cy2); g.lineTo(cx2 + rng() * 5 - 2.5, cy2 + rng() * 5 - 2.5); g.stroke({ color: ROAD_CRACK, width: 0.4, alpha: 0.3 }); }
    // Road wear marks
    if (rng() < 0.3) {
      const wx = px + rng() * ts * 0.6 + ts * 0.2;
      const wy = py + rng() * ts * 0.6 + ts * 0.2;
      g.circle(wx, wy, 1 + rng());
      g.fill({ color: ROAD_CRACK, alpha: 0.3 });
    }
  }

  private _hasRoad(s: CaesarState, tx: number, ty: number): boolean {
    for (const b of s.buildings.values()) if ((b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.GATE) && b.tileX === tx && b.tileY === ty) return true;
    return false;
  }

  private _drawHousing(g: PIXI.Graphics, b: CaesarBuilding, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    const t = b.housingTier;
    const wc = H_WALLS[t], rc = H_ROOFS[t], rh = H_ROOF_HI[t];
    const m = 2, roofH = ph * 0.38;

    // Foundation
    g.roundRect(px + m, py + ph - 2, pw - m * 2, 2, 0.5); g.fill(0x8a7a66);

    // Wall
    g.roundRect(px + m, py + roofH - 1, pw - m * 2, ph - roofH - 1, 1); g.fill(wc);
    // Wall shadow
    g.rect(px + pw * 0.55, py + roofH, pw * 0.45 - m, ph - roofH - 2); g.fill({ color: 0x000000, alpha: 0.05 });

    // Timber framing for tier 2+
    if (t >= 2) {
      g.moveTo(px + m + 1, py + roofH + (ph - roofH) * 0.5); g.lineTo(px + pw - m - 1, py + roofH + (ph - roofH) * 0.5); g.stroke({ width: 0.8, color: 0x5d4037, alpha: 0.3 });
      g.moveTo(px + pw * 0.5, py + roofH); g.lineTo(px + pw * 0.5, py + ph - 2); g.stroke({ width: 0.8, color: 0x5d4037, alpha: 0.3 });
    }

    // Roof
    g.poly([px + m - 2, py + roofH + 1, px + pw / 2, py + m, px + pw - m + 2, py + roofH + 1]); g.fill(rc);
    // Roof lit side
    g.poly([px + m, py + roofH, px + pw / 2, py + m + 1, px + pw / 2, py + roofH]); g.fill({ color: rh, alpha: 0.45 });
    // Roof ridge
    g.moveTo(px + pw * 0.25, py + roofH * 0.55); g.lineTo(px + pw * 0.75, py + roofH * 0.55);
    g.stroke({ color: shadeColor(rc, 0.7), width: 0.6 });

    // Door
    const dw = Math.max(3, pw * 0.16), dh = (ph - roofH) * 0.52;
    g.roundRect(px + pw / 2 - dw / 2, py + ph - m - dh, dw, dh, dw * 0.3); g.fill(0x5d4037);
    g.circle(px + pw / 2 + dw * 0.25, py + ph - m - dh * 0.45, 0.5); g.fill(0xffd700); // doorknob

    // Warm door glow for occupied housing
    if (b.residents > 0) {
      const doorX = px + pw / 2;
      const doorY = py + ph - 2;
      g.circle(doorX, doorY, 4);
      g.fill({ color: 0xFFCC44, alpha: 0.08 });
      g.circle(doorX, doorY, 2);
      g.fill({ color: 0xFFDD66, alpha: 0.12 });
    }

    // Windows
    const ws = Math.max(2, pw * 0.11);
    const wy = py + roofH + (ph - roofH) * 0.22;
    if (t >= 1) {
      this._drawWindow(g, px + pw * 0.18, wy, ws, ws, t >= 4);
      if (t >= 2) this._drawWindow(g, px + pw * 0.72, wy, ws, ws, t >= 4);
      if (t >= 3) { // Upper windows
        this._drawWindow(g, px + pw * 0.18, wy - ws * 1.5, ws * 0.8, ws * 0.8, false);
        this._drawWindow(g, px + pw * 0.72, wy - ws * 1.5, ws * 0.8, ws * 0.8, false);
      }
    }

    // Chimney
    if (t >= 2) {
      const chx = px + pw * 0.72, chw = 3, chh = roofH * 0.55;
      g.rect(chx, py + m - chh + 3, chw, chh); g.fill(0x795548);
      g.rect(chx - 0.5, py + m - chh + 2, chw + 1, 1.5); g.fill(0x8b6b5a); // cap
    }

    // Garden fence for tier 3+
    if (t >= 3) {
      const fy = py + ph - 1;
      for (let fx = px + 1; fx < px + pw - 1; fx += 3) { g.moveTo(fx, fy); g.lineTo(fx, fy + 2); g.stroke({ width: 0.6, color: 0x8b7355, alpha: 0.5 }); }
      g.moveTo(px + 1, fy + 1); g.lineTo(px + pw - 1, fy + 1); g.stroke({ width: 0.6, color: 0x8b7355, alpha: 0.5 });
    }

    // Balcony for tier 4
    if (t >= 4) {
      g.roundRect(px + pw * 0.3, py + roofH + 1, pw * 0.4, 3, 1); g.fill(0x8b7355);
      for (let bx = px + pw * 0.32; bx < px + pw * 0.68; bx += 2.5) { g.moveTo(bx, py + roofH + 1); g.lineTo(bx, py + roofH + 4); g.stroke({ width: 0.5, color: 0x6a5a44 }); }
    }

    // Pop label
    if (b.residents > 0) {
      const txt = new PIXI.Text({ text: `${b.residents}`, style: { fontSize: 8, fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold", stroke: { color: 0x000000, width: 2 } } });
      txt.position.set(px + 1, py + 1); g.addChild(txt);
    }
  }

  private _drawWindow(g: PIXI.Graphics, x: number, y: number, w: number, h: number, stained: boolean): void {
    g.rect(x, y, w, h); g.fill(stained ? 0xffd54f : 0x90caf9);
    g.rect(x, y, w, h); g.stroke({ color: 0x5d4037, width: 0.5 });
    // Cross bars
    g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke({ color: 0x5d4037, width: 0.4 });
    g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke({ color: 0x5d4037, width: 0.4 });
  }

  private _drawWall(g: PIXI.Graphics, _b: CaesarBuilding, px: number, py: number, ts: number, _rng: () => number): void {
    const pw = ts, ph = ts;
    const m = 1;
    // Main wall body with stone texture
    g.rect(px + m, py + m, pw - m * 2, ph - m * 2); g.fill(0x8a8070);
    // Stone block pattern
    for (let row = 0; row < 3; row++) {
      const ry = py + m + row * (ph - m * 2) / 3;
      const offset = row % 2 === 0 ? 0 : (pw - m * 2) / 6;
      for (let col = 0; col < 3; col++) {
        const rx = px + m + offset + col * (pw - m * 2) / 3;
        g.rect(rx + 0.5, ry + 0.5, (pw - m * 2) / 3 - 1, (ph - m * 2) / 3 - 1);
        g.stroke({ color: 0x6a6050, alpha: 0.4, width: 0.5 });
      }
    }
    // Battlements on top
    const batCount = Math.max(2, Math.floor(pw / 5));
    const batW = (pw - m * 2) / (batCount * 2);
    for (let i = 0; i < batCount; i++) {
      g.rect(px + m + i * batW * 2, py - 2, batW, 3);
      g.fill(0x8a8070);
      g.rect(px + m + i * batW * 2, py - 2, batW, 3);
      g.stroke({ color: 0x6a6050, alpha: 0.5, width: 0.4 });
    }
    // Top edge highlight
    g.moveTo(px + m, py + m); g.lineTo(px + pw - m, py + m);
    g.stroke({ color: 0x9a9080, alpha: 0.5, width: 1 });
    // Shadow at bottom
    g.moveTo(px + m, py + ph - m); g.lineTo(px + pw - m, py + ph - m);
    g.stroke({ color: 0x5a5040, alpha: 0.4, width: 1.5 });
  }

  private _drawGate(g: PIXI.Graphics, px: number, py: number, ts: number): void {
    g.rect(px, py, ts, ts); g.fill(0x8b7355);
    const aw = ts * 0.6, ah = ts * 0.72;
    g.roundRect(px + (ts - aw) / 2, py + ts - ah, aw, ah, aw / 2); g.fill(0x4a3828);
    // Portcullis grid
    const gx = px + (ts - aw) / 2;
    for (let i = 1; i < 4; i++) { g.moveTo(gx + aw * i / 4, py + ts - ah + 4); g.lineTo(gx + aw * i / 4, py + ts - 1); g.stroke({ width: 0.8, color: 0x555555, alpha: 0.6 }); }
    for (let i = 1; i < 4; i++) { g.moveTo(gx + 2, py + ts - ah + ah * i / 4); g.lineTo(gx + aw - 2, py + ts - ah + ah * i / 4); g.stroke({ width: 0.8, color: 0x555555, alpha: 0.6 }); }
  }

  private _drawTower(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    // Base
    g.roundRect(px + 2, py + ph * 0.28, pw - 4, ph * 0.72 - 2, 2); g.fill(0x757575);
    // Stone pattern
    for (let by = 0; by < 3; by++) for (let bx = 0; bx < 3; bx++) {
      g.rect(px + 3 + bx * (pw - 6) / 3, py + ph * 0.3 + by * ph * 0.2, (pw - 6) / 3 - 1, ph * 0.18);
      g.stroke({ color: 0x555555, width: 0.3 });
    }
    // Upper turret
    const inset = pw * 0.12;
    g.rect(px + inset, py + 2, pw - inset * 2, ph * 0.32); g.fill(0x888888);
    // Crenellations
    const cw = (pw - inset * 2) / 7;
    for (let i = 0; i < 7; i++) if (i % 2 === 0) { g.rect(px + inset + i * cw, py, cw, 4); g.fill(0x999999); }
    // Arrow slits
    g.rect(px + pw * 0.35 - 1, py + ph * 0.42, 2, 7); g.fill(0x333333);
    g.rect(px + pw * 0.65 - 1, py + ph * 0.42, 2, 7); g.fill(0x333333);
    // Flag
    g.moveTo(px + pw * 0.75, py); g.lineTo(px + pw * 0.75, py - 8); g.stroke({ color: 0x5d4037, width: 1.2 });
    g.poly([px + pw * 0.75, py - 8, px + pw * 0.75 + 7, py - 5.5, px + pw * 0.75, py - 3]); g.fill(0xd32f2f);
    // Flag cross
    g.rect(px + pw * 0.75 + 1.5, py - 7, 4, 0.8); g.fill(0xffffff);
    g.rect(px + pw * 0.75 + 3, py - 8, 0.8, 3); g.fill(0xffffff);
  }

  private _drawWell(g: PIXI.Graphics, px: number, py: number, ts: number): void {
    const cx = px + ts / 2, cy = py + ts / 2;
    // Stone rim (multiple rings)
    g.circle(cx, cy, ts * 0.38); g.fill(0x8e8e8e);
    g.circle(cx, cy, ts * 0.32); g.fill(0x9e9e9e);
    g.circle(cx, cy, ts * 0.24); g.fill(0x3a7acc);
    // Water ripple
    g.circle(cx - 1, cy - 1, ts * 0.12); g.fill({ color: 0x80c0ff, alpha: 0.4 });
    g.circle(cx, cy, ts * 0.18); g.stroke({ color: 0x5a9ee6, width: 0.5, alpha: 0.3 });
    // Posts
    g.roundRect(cx - ts * 0.22, py + ts * 0.12, 2, ts * 0.4, 0.5); g.fill(0x5d4037);
    g.roundRect(cx + ts * 0.2, py + ts * 0.12, 2, ts * 0.4, 0.5); g.fill(0x5d4037);
    // Crossbeam
    g.rect(cx - ts * 0.22, py + ts * 0.12, ts * 0.44, 2); g.fill(0x5d4037);
    // Bucket rope
    g.moveTo(cx, py + ts * 0.14); g.lineTo(cx, cy - ts * 0.1);
    g.stroke({ color: 0x8b7355, width: 0.6 });
    // Bucket
    g.roundRect(cx - 1.5, cy - ts * 0.12, 3, 3, 0.5); g.fill(0x795548);
  }

  private _drawFarm(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    g.roundRect(px + 1, py + 1, pw - 2, ph - 2, 2); g.fill(0x8b7d4a);
    // Plowed rows with individual wheat stalks
    const rows = Math.floor(ph / 3.5);
    for (let r = 0; r < rows; r++) {
      const ry = py + 3 + r * 3.5;
      g.moveTo(px + 3, ry); g.lineTo(px + pw - 3, ry); g.stroke({ color: 0x6a5a34, width: 0.5, alpha: 0.4 });
      // Wheat stalks
      for (let s = 0; s < Math.floor((pw - 6) / 2.5); s++) {
        const sx = px + 3 + s * 2.5 + rng() * 1.5;
        const sh = 2 + rng() * 2;
        g.moveTo(sx, ry); g.lineTo(sx + rng() * 1 - 0.5, ry - sh);
        g.stroke({ color: 0x7a9b2a, width: 0.6 });
        // Wheat head
        g.ellipse(sx, ry - sh - 0.5, 0.6, 1); g.fill(0xcddc39);
      }
    }
    // Farmhouse
    const fhW = pw * 0.22, fhH = ph * 0.22;
    g.roundRect(px + 2, py + 2, fhW, fhH, 1); g.fill(0xc2956b);
    g.poly([px + 1, py + 2 + fhH * 0.35, px + 2 + fhW / 2, py + 1, px + 3 + fhW, py + 2 + fhH * 0.35]); g.fill(0x8b4513);
    // Scarecrow
    const scx = px + pw * 0.75, scy = py + ph * 0.35;
    g.moveTo(scx, scy + 6); g.lineTo(scx, scy - 2); g.stroke({ color: 0x5d4037, width: 1 });
    g.moveTo(scx - 3, scy); g.lineTo(scx + 3, scy); g.stroke({ color: 0x5d4037, width: 0.8 });
    g.circle(scx, scy - 3, 1.5); g.fill(0xddc888);
  }

  private _drawMill(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    // Body
    g.roundRect(px + 3, py + ph * 0.3, pw - 6, ph * 0.7 - 2, 2); g.fill(0xf0e0c0);
    g.roundRect(px + 2, py + ph * 0.25, pw - 4, ph * 0.1, 1); g.fill(shadeColor(0xf0e0c0, 0.85));
    // Windmill blades (animated)
    const cx = px + pw / 2, cy = py + ph * 0.28;
    const angle = this._time * 1.5;
    for (let i = 0; i < 4; i++) {
      const a = angle + (i * Math.PI / 2);
      const bLen = pw * 0.35;
      const ex = cx + Math.cos(a) * bLen, ey = cy + Math.sin(a) * bLen;
      g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke({ color: 0x5d4037, width: 1.5 });
      // Blade sail
      const perpX = Math.cos(a + Math.PI / 2) * 2;
      const perpY = Math.sin(a + Math.PI / 2) * 2;
      g.poly([cx + Math.cos(a) * bLen * 0.3, cy + Math.sin(a) * bLen * 0.3, ex, ey, ex + perpX, ey + perpY]);
      g.fill({ color: 0xfaf0e0, alpha: 0.7 });
    }
    g.circle(cx, cy, 2); g.fill(0x5d4037);
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - 3 - 5, 4, 5, 1); g.fill(0x5d4037);
  }

  private _drawBakery(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.28;
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0xd4a057);
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(0xa05828);
    // Chimney
    const chX = px + pw * 0.7, chW = 3, chH = 6;
    g.rect(chX - chW / 2, py + m - chH, chW, chH); g.fill(0x6d4c41);
    g.rect(chX - chW / 2 - 0.5, py + m - chH, chW + 1, 1.5); g.fill(0x5d4037);
    // Oven glow
    g.circle(px + pw * 0.7, py + ph * 0.6, pw * 0.12); g.fill({ color: 0xff6600, alpha: 0.4 });
    g.circle(px + pw * 0.7, py + ph * 0.6, pw * 0.07); g.fill({ color: 0xffaa00, alpha: 0.5 });
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - m - 5, 4, 5, 1); g.fill(0x5d4037);
    // Bread sign
    g.circle(px + pw * 0.25, py + roofH + 3, 2); g.fill(0xdaa520);
    const t = new PIXI.Text({ text: "Bak", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph / 2 - t.height / 2); g.addChild(t);
  }

  private _drawButcher(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.28;
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0xc04040);
    // Darker half for depth
    g.roundRect(px + pw / 2, py + roofH, pw / 2 - m, ph - roofH - m, 2); g.fill({ color: 0xa03030, alpha: 0.3 });
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(0x8b2020);
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - m - 6, 4, 6, 1); g.fill(0x5d2020);
    // Hanging meat hooks
    for (let hi = 0; hi < 3; hi++) {
      const hx = px + pw * (0.2 + hi * 0.3);
      g.moveTo(hx, py + roofH + 1); g.lineTo(hx, py + roofH + 3); g.stroke({ color: 0x999999, width: 0.8 });
      g.ellipse(hx, py + roofH + 5, 1.5, 2); g.fill(0xcc6666);
    }
    // Blood drip stain
    g.circle(px + pw * 0.3, py + ph - m - 1, 1.5); g.fill({ color: 0x880000, alpha: 0.3 });
    // Cleaver sign
    g.moveTo(px + pw - m - 4, py + roofH + 2); g.lineTo(px + pw - m - 2, py + roofH + 5);
    g.stroke({ color: 0xaaaaaa, width: 1.2 });
    const t = new PIXI.Text({ text: "But", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.45); g.addChild(t);
  }

  private _drawMarket(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    // Open-air stalls with canopy
    g.roundRect(px + 1, py + ph * 0.4, pw - 2, ph * 0.6 - 1, 1); g.fill(0xe08830);
    // Striped canopy
    for (let s = 0; s < 4; s++) {
      const sw2 = (pw - 4) / 4;
      g.rect(px + 2 + s * sw2, py + 2, sw2, ph * 0.38);
      g.fill(s % 2 === 0 ? 0xee4444 : 0xffffff);
    }
    // Canopy front edge (scalloped)
    for (let i = 0; i < 6; i++) {
      const sx = px + 2 + i * (pw - 4) / 6;
      g.arc(sx + (pw - 4) / 12, py + ph * 0.4, (pw - 4) / 12, 0, Math.PI);
      g.fill(0xee4444);
    }
    // Goods on table
    const colors = [0xff9800, 0x8bc34a, 0xf44336, 0xffd54f, 0x795548];
    for (let i = 0; i < 5; i++) {
      const gx = px + 4 + i * (pw - 8) / 5 + rng() * 2;
      const gy = py + ph * 0.55 + rng() * 4;
      g.circle(gx, gy, 1.5 + rng()); g.fill(colors[i % colors.length]);
    }
    // Posts
    g.rect(px + 2, py + 2, 1.5, ph - 3); g.fill(0x5d4037);
    g.rect(px + pw - 3.5, py + 2, 1.5, ph - 3); g.fill(0x5d4037);
  }

  private _drawGranary(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    g.roundRect(px + 2, py + ph * 0.2, pw - 4, ph * 0.8 - 2, 2); g.fill(0xa08060);
    // Lit face
    g.roundRect(px + 2, py + ph * 0.2, (pw - 4) * 0.5, ph * 0.8 - 2, 2); g.fill({ color: 0xb09070, alpha: 0.3 });
    g.roundRect(px + 1, py + 2, pw - 2, ph * 0.22, 2); g.fill(0x8b6b50);
    // Large barn door
    g.roundRect(px + pw / 2 - 4, py + ph - 4 - 8, 8, 8, 1); g.fill(0x6a5040);
    g.moveTo(px + pw / 2, py + ph - 4 - 8); g.lineTo(px + pw / 2, py + ph - 4);
    g.stroke({ color: 0x5a4030, width: 0.5 });
    // Grain sacks (more detailed)
    for (let i = 0; i < 5; i++) {
      const sx = px + 5 + i * (pw - 10) / 5 + rng() * 2;
      const sy = py + ph * 0.45 + rng() * (ph * 0.2);
      g.ellipse(sx, sy, 3, 2.5); g.fill(0xc8b080);
      g.ellipse(sx, sy - 0.5, 2, 1.2); g.fill({ color: 0xddc090, alpha: 0.3 });
      // Tied top
      g.moveTo(sx - 0.5, sy - 2.5); g.lineTo(sx + 0.5, sy - 3);
      g.stroke({ color: 0x8a7050, width: 0.5 });
    }
    // Wheat sheaf decoration
    g.moveTo(px + 4, py + ph * 0.25); g.lineTo(px + 4, py + ph * 0.35);
    g.stroke({ color: 0xdaa520, width: 1 });
    g.circle(px + 4, py + ph * 0.24, 1.5); g.fill(0xdaa520);
    const t = new PIXI.Text({ text: "Grn", style: { fontSize: 8, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.28); g.addChild(t);
  }

  private _drawWarehouse(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    g.roundRect(px + 2, py + ph * 0.2, pw - 4, ph * 0.8 - 2, 2); g.fill(0x604030);
    g.roundRect(px + 1, py + 2, pw - 2, ph * 0.22, 2); g.fill(0x4a3020);
    // Large door
    g.roundRect(px + pw / 2 - pw * 0.15, py + ph - 3 - ph * 0.3, pw * 0.3, ph * 0.3, 2); g.fill(0x3a2515);
    // Crates
    for (let i = 0; i < 5; i++) {
      const cx2 = px + 6 + rng() * (pw - 14), cy2 = py + ph * 0.35 + rng() * (ph * 0.3);
      const cs = 3 + rng() * 2;
      g.rect(cx2, cy2, cs, cs); g.fill(0x8b7355); g.rect(cx2, cy2, cs, cs); g.stroke({ color: 0x6a5a44, width: 0.4 });
    }
    const t = new PIXI.Text({ text: "Whs", style: { fontSize: 8, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.28); g.addChild(t);
  }

  private _drawLumber(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    g.roundRect(px + 2, py + ph * 0.35, pw - 4, ph * 0.65 - 2, 2); g.fill(0x7a5a40);
    // Shed roof
    g.poly([px + 1, py + ph * 0.35, px + pw / 2, py + 2, px + pw - 1, py + ph * 0.35]); g.fill(0x5d4037);
    // Log pile
    for (let l = 0; l < 6; l++) {
      const lx = px + 4 + (l % 3) * (pw * 0.25);
      const ly = py + ph * 0.55 + Math.floor(l / 3) * 5;
      g.roundRect(lx, ly, pw * 0.2, 3, 1); g.fill(0x8b6b50);
      g.circle(lx, ly + 1.5, 1.5); g.fill(0x6a5038); // end grain
    }
    // Saw
    g.moveTo(px + pw * 0.7, py + ph * 0.4); g.lineTo(px + pw * 0.85, py + ph * 0.6);
    g.stroke({ color: 0xaaaaaa, width: 1 });
  }

  private _drawQuarry(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    g.roundRect(px + 1, py + 1, pw - 2, ph - 2, 2); g.fill(0x777777);
    // Excavated pit
    g.roundRect(px + 4, py + 4, pw - 8, ph - 8, 3); g.fill(0x666666);
    g.roundRect(px + 6, py + 6, pw - 12, ph - 12, 2); g.fill(0x555555);
    // Cut stone blocks
    for (let i = 0; i < 4; i++) {
      const bx = px + 3 + rng() * (pw - 10), by = py + 3 + rng() * (ph - 10);
      g.rect(bx, by, 4, 3); g.fill(0xaaaaaa); g.rect(bx, by, 4, 3); g.stroke({ color: 0x888888, width: 0.4 });
    }
    const t = new PIXI.Text({ text: "Qry", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph / 2 - t.height / 2); g.addChild(t);
  }

  private _drawIronMine(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    g.roundRect(px + 1, py + 1, pw - 2, ph - 2, 2); g.fill(0x506070);
    // Mine entrance
    g.roundRect(px + pw * 0.3, py + ph * 0.5, pw * 0.4, ph * 0.45, pw * 0.08); g.fill(0x333333);
    // Timber supports
    g.rect(px + pw * 0.3, py + ph * 0.5, 2, ph * 0.45); g.fill(0x5d4037);
    g.rect(px + pw * 0.7 - 2, py + ph * 0.5, 2, ph * 0.45); g.fill(0x5d4037);
    g.rect(px + pw * 0.3, py + ph * 0.48, pw * 0.4, 2); g.fill(0x5d4037);
    // Mine cart
    g.roundRect(px + pw * 0.35, py + ph * 0.78, pw * 0.3, ph * 0.12, 1); g.fill(0x888888);
    g.circle(px + pw * 0.4, py + ph * 0.92, 1.5); g.fill(0x555555);
    g.circle(px + pw * 0.6, py + ph * 0.92, 1.5); g.fill(0x555555);
    // Ore pile
    for (let i = 0; i < 3; i++) { g.circle(px + 5 + rng() * 6, py + ph * 0.4 + rng() * 4, 2); g.fill(0x4a6070); }
    const t = new PIXI.Text({ text: "Mine", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.25); g.addChild(t);
  }

  private _drawBlacksmith(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.28;
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0x404850);
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(0x333840);
    // Forge glow
    g.circle(px + pw * 0.3, py + ph * 0.55, pw * 0.14); g.fill({ color: 0xff4400, alpha: 0.35 });
    g.circle(px + pw * 0.3, py + ph * 0.55, pw * 0.08); g.fill({ color: 0xff8800, alpha: 0.45 });
    // Anvil
    g.poly([px + pw * 0.55, py + ph * 0.65, px + pw * 0.75, py + ph * 0.65, px + pw * 0.7, py + ph * 0.55, px + pw * 0.6, py + ph * 0.55]);
    g.fill(0x666666);
    // Chimney with wider cap
    g.rect(px + pw * 0.2, py + m - 5, 4, 7); g.fill(0x555555);
    g.rect(px + pw * 0.2 - 1, py + m - 6, 6, 2); g.fill(0x666666);
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - m - 5, 4, 5, 1); g.fill(0x333333);
    const t = new PIXI.Text({ text: "Blk", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.35); g.addChild(t);
  }

  private _drawWeaver(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.28;
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0xc090d0);
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(0x9060a0);
    // Loom frame
    const lx = px + pw * 0.2, ly = py + ph * 0.38, lw = pw * 0.55, lh = ph * 0.32;
    g.rect(lx, ly, lw, lh); g.fill(0x5d4037);
    g.rect(lx, ly, lw, lh); g.stroke({ color: 0x4a3028, width: 0.5 });
    // Warp threads (vertical)
    for (let i = 0; i < 8; i++) { g.moveTo(lx + 1 + i * lw / 8, ly); g.lineTo(lx + 1 + i * lw / 8, ly + lh); g.stroke({ color: 0xe1bee7, alpha: 0.5, width: 0.4 }); }
    // Weft threads (horizontal, colored)
    const weftColors = [0xe1bee7, 0xce93d8, 0xba68c8, 0xab47bc];
    for (let i = 0; i < 5; i++) { g.moveTo(lx, ly + 2 + i * lh / 5); g.lineTo(lx + lw, ly + 2 + i * lh / 5); g.stroke({ color: weftColors[i % 4], alpha: 0.6, width: 0.6 }); }
    // Cloth rolls (multiple)
    g.ellipse(px + pw * 0.82, py + ph * 0.65, 2, 3.5); g.fill(0xe1bee7);
    g.ellipse(px + pw * 0.82, py + ph * 0.65, 1.5, 2.5); g.fill({ color: 0xf0d0f0, alpha: 0.3 });
    g.ellipse(px + pw * 0.85, py + ph * 0.78, 1.8, 2.5); g.fill(0xce93d8);
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - m - 5, 4, 5, 1); g.fill(0x5d4037);
    // Scissors sign
    g.moveTo(px + m + 2, py + roofH + 2); g.lineTo(px + m + 5, py + roofH + 5);
    g.moveTo(px + m + 5, py + roofH + 2); g.lineTo(px + m + 2, py + roofH + 5);
    g.stroke({ color: 0x888888, width: 0.8 });
  }

  private _drawReligion(g: PIXI.Graphics, b: CaesarBuilding, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    const isCath = b.type === CaesarBuildingType.CATHEDRAL;
    const isChurch = b.type === CaesarBuildingType.CHURCH;
    const wallCol = isCath ? 0xfff0c0 : isChurch ? 0xfff5e0 : 0xfafafa;

    // Main body
    g.roundRect(px + 3, py + ph * 0.32, pw - 6, ph * 0.68 - 2, 2); g.fill(wallCol);
    // Buttresses for church/cathedral
    if (isChurch || isCath) {
      g.rect(px + 2, py + ph * 0.4, 2, ph * 0.5); g.fill(shadeColor(wallCol, 0.9));
      g.rect(px + pw - 4, py + ph * 0.4, 2, ph * 0.5); g.fill(shadeColor(wallCol, 0.9));
    }
    // Steeple
    const spW = Math.min(10, pw * 0.22);
    const spX = px + pw / 2;
    g.poly([spX - spW, py + ph * 0.32, spX, py + 3, spX + spW, py + ph * 0.32]); g.fill(0xdddddd);
    // Cross
    g.rect(spX - 0.5, py, 1.5, 5); g.fill(0xffd700);
    g.rect(spX - 2.5, py + 1.5, 6, 1.5); g.fill(0xffd700);
    // Rose window for cathedral
    if (isCath) {
      const rwx = px + pw / 2, rwy = py + ph * 0.48, rwr = pw * 0.09;
      g.circle(rwx, rwy, rwr + 1); g.fill(0x5d4037);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.poly([rwx, rwy, rwx + Math.cos(a) * rwr, rwy + Math.sin(a) * rwr, rwx + Math.cos(a + Math.PI / 8) * rwr, rwy + Math.sin(a + Math.PI / 8) * rwr]);
        g.fill(i % 2 === 0 ? 0xff6f00 : 0x2196f3);
      }
    }
    // Arched windows
    if (isChurch || isCath) {
      const wwh = ph * 0.15;
      g.roundRect(px + pw * 0.2, py + ph * 0.5, 3, wwh, 1.5); g.fill(0x90caf9);
      g.roundRect(px + pw * 0.75, py + ph * 0.5, 3, wwh, 1.5); g.fill(0x90caf9);
    }
    // Door (arched)
    const dw = Math.max(4, pw * 0.14);
    g.roundRect(px + pw / 2 - dw / 2, py + ph - 2 - ph * 0.22, dw, ph * 0.22, dw * 0.4); g.fill(0x5d4037);
    // Steps
    g.rect(px + pw / 2 - dw / 2 - 1, py + ph - 2, dw + 2, 2); g.fill(0x9e9e9e);
  }

  private _drawWatchpost(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, towerW = pw * 0.5, towerH = ph * 0.8;
    const tx2 = px + (pw - towerW) / 2;
    // Tower base (wider)
    g.roundRect(px + m, py + ph * 0.6, pw - m * 2, ph * 0.4 - m, 2); g.fill(0x7a7060);
    // Tower body
    g.rect(tx2, py + ph * 0.15, towerW, towerH); g.fill(0x8a8070);
    // Lit face
    g.rect(tx2, py + ph * 0.15, towerW * 0.5, towerH); g.fill({ color: 0x9a9080, alpha: 0.3 });
    // Battlements
    for (let i = 0; i < 3; i++) {
      g.rect(tx2 + i * towerW / 3, py + ph * 0.1, towerW / 3 - 1, 3); g.fill(0x8a8070);
    }
    // Pointed cap
    g.poly([tx2 - 1, py + ph * 0.15, tx2 + towerW / 2, py + m, tx2 + towerW + 1, py + ph * 0.15]); g.fill(0xaa3333);
    // Window slit
    g.rect(tx2 + towerW / 2 - 1, py + ph * 0.35, 2, 5); g.fill(0x333333);
    // Torch glow
    g.circle(tx2 + towerW / 2, py + ph * 0.3, 3); g.fill({ color: 0xff8800, alpha: 0.15 });
    // Flag pole
    g.moveTo(tx2 + towerW / 2, py + m); g.lineTo(tx2 + towerW / 2, py - 3);
    g.stroke({ color: 0x444444, width: 1 });
    // Small flag
    g.poly([tx2 + towerW / 2, py - 3, tx2 + towerW / 2 + 5, py - 1.5, tx2 + towerW / 2, py]); g.fill(0xcc2222);
    const t = new PIXI.Text({ text: "Wch", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.65); g.addChild(t);
  }

  private _drawBarracks(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    g.roundRect(px + 2, py + ph * 0.25, pw - 4, ph * 0.75 - 2, 2); g.fill(0x903030);
    // Flat military roof
    g.roundRect(px + 1, py + 2, pw - 2, ph * 0.25, 2); g.fill(0x7a2020);
    // Multiple doors
    for (let d = 0; d < 3; d++) {
      g.roundRect(px + 4 + d * (pw - 8) / 3, py + ph - 3 - ph * 0.2, (pw - 12) / 3, ph * 0.2, 1); g.fill(0x5d2020);
    }
    // Training dummies
    const dx = px + pw * 0.75, dy = py + ph * 0.5;
    g.moveTo(dx, dy + 4); g.lineTo(dx, dy - 3); g.stroke({ color: 0x5d4037, width: 1 });
    g.moveTo(dx - 3, dy - 1); g.lineTo(dx + 3, dy - 1); g.stroke({ color: 0x5d4037, width: 0.8 });
    g.circle(dx, dy - 4, 2); g.fill(0xddc888);
    // Weapon rack
    for (let i = 0; i < 3; i++) {
      g.moveTo(px + 5 + i * 3, py + ph * 0.35); g.lineTo(px + 5 + i * 3, py + ph * 0.55);
      g.stroke({ color: 0x888888, width: 0.8 });
    }
    // Banner on top
    g.moveTo(px + pw * 0.5, py + 2); g.lineTo(px + pw * 0.5, py - 6); g.stroke({ color: 0x5d4037, width: 1.2 });
    g.poly([px + pw * 0.5, py - 6, px + pw * 0.5 + 6, py - 3.5, px + pw * 0.5, py - 1]); g.fill(0xd32f2f);
  }

  private _drawTavern(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.3;
    // Main body
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0xa07848);
    // Thatched roof
    g.poly([px, py + roofH, px + pw / 2, py + m, px + pw, py + roofH]); g.fill(0x8b7355);
    // Roof thatch lines
    for (let i = 0; i < 5; i++) {
      const t2 = i / 5;
      g.moveTo(px + pw * t2, py + roofH - (roofH - m) * Math.min(t2 * 2, 2 - t2 * 2));
      g.lineTo(px + pw * t2, py + roofH);
      g.stroke({ color: 0x7a6345, alpha: 0.4, width: 0.5 });
    }
    // Door
    g.roundRect(px + pw / 2 - 3, py + ph - m - 7, 6, 7, 1); g.fill(0x5d3a20);
    // Door handle
    g.circle(px + pw / 2 + 1, py + ph - m - 3, 0.8); g.fill(0xccaa44);
    // Windows with warm glow
    g.rect(px + m + 3, py + roofH + 4, 4, 4); g.fill(0xffcc44); g.fill({ color: 0xffee88, alpha: 0.3 });
    g.rect(px + pw - m - 7, py + roofH + 4, 4, 4); g.fill(0xffcc44); g.fill({ color: 0xffee88, alpha: 0.3 });
    // Window panes
    g.moveTo(px + m + 5, py + roofH + 4); g.lineTo(px + m + 5, py + roofH + 8); g.stroke({ color: 0x5d4037, width: 0.5 });
    g.moveTo(px + m + 3, py + roofH + 6); g.lineTo(px + m + 7, py + roofH + 6); g.stroke({ color: 0x5d4037, width: 0.5 });
    // Signboard
    g.rect(px + pw - m - 3, py + roofH - 2, 5, 4); g.fill(0x5d4037);
    g.moveTo(px + pw - m - 0.5, py + roofH - 2); g.lineTo(px + pw - m - 0.5, py + roofH - 5);
    g.stroke({ color: 0x5d4037, width: 1 });
    // Beer mug icon on sign
    g.circle(px + pw - m - 1, py + roofH - 0.5, 1.5); g.fill(0xdaa520);
    const t = new PIXI.Text({ text: "Tav", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.45); g.addChild(t);
  }

  private _drawFestival(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, rng: () => number): void {
    const m = 2;
    // Open arena / fairground
    g.roundRect(px + m, py + m, pw - m * 2, ph - m * 2, 3); g.fill(0xc8a870);
    g.roundRect(px + m + 2, py + m + 2, pw - m * 2 - 4, ph - m * 2 - 4, 2); g.fill(0xd4b880);
    // Stage platform
    g.rect(px + pw * 0.15, py + ph * 0.2, pw * 0.7, ph * 0.15); g.fill(0x8b6914);
    g.rect(px + pw * 0.15, py + ph * 0.2, pw * 0.7, 2); g.fill(0xa07a24);
    // Colorful bunting/pennants
    const pennantColors = [0xff4444, 0x4488ff, 0xffdd44, 0x44cc44, 0xff88cc];
    for (let pi = 0; pi < 5; pi++) {
      const ppx = px + pw * 0.15 + pi * pw * 0.14 + 3;
      g.poly([ppx, py + ph * 0.18, ppx + 3, py + ph * 0.18, ppx + 1.5, py + ph * 0.25]);
      g.fill(pennantColors[pi]);
    }
    // Bunting line
    g.moveTo(px + pw * 0.1, py + ph * 0.18); g.lineTo(px + pw * 0.9, py + ph * 0.18);
    g.stroke({ color: 0x666666, width: 0.5 });
    // Audience dots
    for (let ai = 0; ai < 8; ai++) {
      const ax = px + pw * 0.1 + ai * pw * 0.1 + rng() * 4;
      const ay = py + ph * 0.55 + rng() * (ph * 0.25);
      g.circle(ax, ay, 1.5); g.fill([0xf0d0a0, 0xd4a070, 0xe0c090][ai % 3]);
    }
    // Maypole
    g.rect(px + pw / 2 - 0.5, py + ph * 0.35, 1, ph * 0.3); g.fill(0x5d4037);
    // Ribbons from pole top
    for (let ri = 0; ri < 4; ri++) {
      const a2 = (ri / 4) * Math.PI * 2;
      g.moveTo(px + pw / 2, py + ph * 0.35);
      g.lineTo(px + pw / 2 + Math.cos(a2) * 6, py + ph * 0.35 + Math.sin(a2) * 4 + 3);
      g.stroke({ color: pennantColors[ri], alpha: 0.6, width: 0.8 });
    }
    const t = new PIXI.Text({ text: "Fst", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.42); g.addChild(t);
  }

  private _drawJousting(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number, _rng: () => number): void {
    const m = 2;
    // Arena ground
    g.roundRect(px + m, py + m, pw - m * 2, ph - m * 2, 3); g.fill(0xa08050);
    // Sand/dirt lane
    g.rect(px + pw * 0.15, py + ph * 0.35, pw * 0.7, ph * 0.3); g.fill(0xc0a870);
    // Central barrier (tilt)
    g.rect(px + pw / 2 - 0.5, py + ph * 0.3, 1, ph * 0.4); g.fill(0x5d4037);
    // Fence posts
    for (let fi = 0; fi < 4; fi++) {
      const fx = px + pw * 0.1 + fi * pw * 0.27;
      g.rect(fx, py + ph * 0.3, 1.5, ph * 0.4); g.fill(0x5d4037);
      g.rect(fx - 0.5, py + ph * 0.3, 2.5, 1.5); g.fill(0x6a5038);
    }
    // Spectator stands (left)
    g.rect(px + m, py + ph * 0.1, pw * 0.1, ph * 0.55); g.fill(0x7a6040);
    g.rect(px + pw - m - pw * 0.1, py + ph * 0.1, pw * 0.1, ph * 0.55); g.fill(0x7a6040);
    // Royal box
    g.rect(px + pw - m - pw * 0.12, py + ph * 0.08, pw * 0.14, ph * 0.18); g.fill(0x8b1a1a);
    g.rect(px + pw - m - pw * 0.12, py + ph * 0.08, pw * 0.14, 2); g.fill(0xffd700);
    // Flags at corners
    for (const [fx2, fy2] of [[px + m + 2, py + m], [px + pw - m - 3, py + m]]) {
      g.moveTo(fx2, fy2 + 8); g.lineTo(fx2, fy2); g.stroke({ color: 0x444444, width: 0.8 });
      g.poly([fx2, fy2, fx2 + 4, fy2 + 2, fx2, fy2 + 4]); g.fill(0xcc2222);
    }
    const t = new PIXI.Text({ text: "Jst", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.78); g.addChild(t);
  }

  private _drawGuild(g: PIXI.Graphics, px: number, py: number, pw: number, ph: number, _ts: number): void {
    const m = 2, roofH = ph * 0.3;
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(0x8b6914);
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(0x6b4a0a);
    // Ornate facade
    g.rect(px + pw * 0.15, py + roofH + 2, pw * 0.7, 2); g.fill(0xdaa520);
    // Columns
    g.rect(px + m + 2, py + roofH + 4, 2, ph * 0.55); g.fill(0xa08040);
    g.rect(px + pw - m - 4, py + roofH + 4, 2, ph * 0.55); g.fill(0xa08040);
    // Grand door
    g.roundRect(px + pw / 2 - 4, py + ph - m - 8, 8, 8, 2); g.fill(0x4a3010);
    g.circle(px + pw / 2, py + ph - m - 4, 0.8); g.fill(0xdaa520); // door handle
    // Guild emblem (circle with tools)
    g.circle(px + pw / 2, py + ph * 0.42, 4); g.fill(0x6b4a0a);
    g.circle(px + pw / 2, py + ph * 0.42, 3.5); g.fill(0xdaa520);
    g.circle(px + pw / 2, py + ph * 0.42, 2); g.fill(0x8b6914);
    // Coin stacks
    for (let ci = 0; ci < 3; ci++) {
      g.rect(px + pw * 0.2 + ci * 4, py + ph * 0.65, 3, 2); g.fill(0xffd700);
      g.rect(px + pw * 0.2 + ci * 4, py + ph * 0.63, 3, 2); g.fill(0xffdd44);
    }
    const t = new PIXI.Text({ text: "Gld", style: { fontSize: 7, fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph * 0.28); g.addChild(t);
  }

  private _drawGeneric(g: PIXI.Graphics, b: CaesarBuilding, px: number, py: number, pw: number, ph: number, ts: number): void {
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const col = this._getCol(b);
    const m = 2, roofH = ph * 0.25;
    // Body
    g.roundRect(px + m, py + roofH, pw - m * 2, ph - roofH - m, 2); g.fill(col);
    // Roof
    g.roundRect(px + m - 1, py + m, pw - m * 2 + 2, roofH, 2); g.fill(shadeColor(col, 0.7));
    // Door
    g.roundRect(px + pw / 2 - 2, py + ph - m - 6, 4, 6, 1); g.fill(0x5d4037);
    // Window
    g.rect(px + m + 3, py + roofH + 3, 3, 3); g.fill(0xffdd88);
    // Shadow
    g.moveTo(px + m, py + ph - m); g.lineTo(px + pw - m, py + ph - m);
    g.stroke({ color: 0x000000, alpha: 0.1, width: 1 });
    const t = new PIXI.Text({ text: bdef.label.substring(0, 3), style: { fontSize: Math.min(9, ts * 0.4), fill: 0xffffff, fontFamily: "monospace", stroke: { color: 0x000000, width: 2 } } });
    t.position.set(px + pw / 2 - t.width / 2, py + ph / 2 - t.height / 2 + 1); g.addChild(t);
  }

  private _getCol(b: CaesarBuilding): number {
    const c: Partial<Record<CaesarBuildingType, number>> = {
      [CaesarBuildingType.MILL]: 0xf0e0c0, [CaesarBuildingType.BAKERY]: 0xd4a057, [CaesarBuildingType.BUTCHER]: 0xc04040,
      [CaesarBuildingType.GRANARY]: 0xa08060, [CaesarBuildingType.MARKET]: 0xe08020, [CaesarBuildingType.LUMBER_CAMP]: 0x7a5a40,
      [CaesarBuildingType.QUARRY]: 0x888888, [CaesarBuildingType.IRON_MINE]: 0x506070, [CaesarBuildingType.BLACKSMITH]: 0x404850,
      [CaesarBuildingType.WEAVER]: 0xc090d0, [CaesarBuildingType.WATCHPOST]: 0xb83030, [CaesarBuildingType.BARRACKS]: 0x903030,
      [CaesarBuildingType.TAVERN]: 0xd09030, [CaesarBuildingType.FESTIVAL_GROUND]: 0xd06820, [CaesarBuildingType.JOUSTING_ARENA]: 0xc05010,
      [CaesarBuildingType.GUILD_HALL]: 0x3060a0, [CaesarBuildingType.WAREHOUSE]: 0x604030,
    };
    return c[b.type] ?? 0x888888;
  }

  // ==================================================================
  // WALKERS — detailed humanoid with limbs
  // ==================================================================
  private _renderWalkers(state: CaesarState): void {
    for (const c of this._walkerLayer.removeChildren()) c.destroy();
    const ts = CB.TILE_SIZE;

    for (const w of state.walkers.values()) {
      if (!w.alive) continue;
      const g = new PIXI.Graphics();
      const wx = w.x * ts, wy = w.y * ts;
      const bc = W_BODY[w.walkerType] ?? 0xffffff;
      const hc = W_HEAD[w.walkerType] ?? 0xf0d0a0;
      const lc = W_LEGS[w.walkerType] ?? 0x444444;
      const sc = w.walkerType === "bandit" ? 1.4 : 1;
      const t = this._time;

      // Walking cycle
      const walkPhase = Math.sin(t * 10 + w.id * 3);
      const legSpread = walkPhase * 1.5 * sc;
      const armSwing = walkPhase * 1.2 * sc;
      const bodyBob = Math.abs(Math.sin(t * 10 + w.id * 3)) * 0.4;

      // Shadow
      g.ellipse(wx, wy + 3 * sc, 3 * sc, 1.2 * sc); g.fill({ color: 0x000000, alpha: 0.1 });

      // Legs
      g.moveTo(wx - 1 * sc, wy + 1 * sc); g.lineTo(wx - 1 * sc - legSpread, wy + 4.5 * sc);
      g.stroke({ color: lc, width: 1.2 * sc });
      g.moveTo(wx + 1 * sc, wy + 1 * sc); g.lineTo(wx + 1 * sc + legSpread, wy + 4.5 * sc);
      g.stroke({ color: lc, width: 1.2 * sc });

      // Body (torso)
      g.roundRect(wx - 2.2 * sc, wy - 2 * sc - bodyBob, 4.4 * sc, 4 * sc, 1.2);
      g.fill(bc);
      // Belt
      g.rect(wx - 2.2 * sc, wy + 0.5 * sc - bodyBob, 4.4 * sc, 0.8 * sc);
      g.fill(shadeColor(bc, 0.7));

      // Arms
      g.moveTo(wx - 2.2 * sc, wy - 0.5 * sc - bodyBob); g.lineTo(wx - 3.5 * sc + armSwing, wy + 2 * sc - bodyBob);
      g.stroke({ color: hc, width: 1 * sc });
      g.moveTo(wx + 2.2 * sc, wy - 0.5 * sc - bodyBob); g.lineTo(wx + 3.5 * sc - armSwing, wy + 2 * sc - bodyBob);
      g.stroke({ color: hc, width: 1 * sc });

      // Head
      g.circle(wx, wy - 3.5 * sc - bodyBob, 2.5 * sc); g.fill(hc);
      // Eyes
      g.circle(wx - 0.8 * sc, wy - 3.8 * sc - bodyBob, 0.3 * sc); g.fill(0x333333);
      g.circle(wx + 0.8 * sc, wy - 3.8 * sc - bodyBob, 0.3 * sc); g.fill(0x333333);

      // Type-specific equipment
      if (w.walkerType === "bandit") {
        // Helmet (horned)
        g.arc(wx, wy - 5.5 * sc - bodyBob, 2.8 * sc, Math.PI, 0); g.fill(0x555555);
        g.moveTo(wx - 2.5 * sc, wy - 5.5 * sc - bodyBob); g.lineTo(wx - 3.5 * sc, wy - 8 * sc - bodyBob); g.stroke({ color: 0x555555, width: 1 });
        g.moveTo(wx + 2.5 * sc, wy - 5.5 * sc - bodyBob); g.lineTo(wx + 3.5 * sc, wy - 8 * sc - bodyBob); g.stroke({ color: 0x555555, width: 1 });
        // Sword
        g.moveTo(wx + 3.5 * sc - armSwing, wy + 2 * sc - bodyBob); g.lineTo(wx + 6 * sc - armSwing, wy - 2 * sc - bodyBob);
        g.stroke({ color: 0xaaaaaa, width: 1.3 });
        // Cross guard
        g.moveTo(wx + 3 * sc - armSwing, wy + 2 * sc - bodyBob); g.lineTo(wx + 4 * sc - armSwing, wy + 2.5 * sc - bodyBob);
        g.stroke({ color: 0x888888, width: 1.5 });
      }
      if (w.walkerType === "militia") {
        // Helmet
        g.arc(wx, wy - 5.2 * sc - bodyBob, 3 * sc, Math.PI, 0); g.fill(0x5577aa);
        g.rect(wx - 3 * sc, wy - 5.2 * sc - bodyBob, 6 * sc, 0.8 * sc); g.fill(0x4466aa); // brim
        // Shield (on left arm)
        g.roundRect(wx - 5.5 * sc + armSwing, wy - 1 * sc - bodyBob, 3 * sc, 4 * sc, 1);
        g.fill(0x4466aa);
        g.roundRect(wx - 5.5 * sc + armSwing, wy - 1 * sc - bodyBob, 3 * sc, 4 * sc, 1);
        g.stroke({ color: 0x334488, width: 0.5 });
        // Shield cross
        g.rect(wx - 4.5 * sc + armSwing, wy + 0.5 * sc - bodyBob, 1 * sc, 2 * sc); g.fill(0xffffff);
        g.rect(wx - 5 * sc + armSwing, wy + 1 * sc - bodyBob, 2 * sc, 0.8 * sc); g.fill(0xffffff);
        // Spear
        g.moveTo(wx + 3.5 * sc - armSwing, wy + 2 * sc - bodyBob); g.lineTo(wx + 3 * sc - armSwing, wy - 8 * sc - bodyBob);
        g.stroke({ color: 0x5d4037, width: 1 });
        g.poly([wx + 2.5 * sc - armSwing, wy - 8 * sc - bodyBob, wx + 3 * sc - armSwing, wy - 10 * sc - bodyBob, wx + 3.5 * sc - armSwing, wy - 8 * sc - bodyBob]);
        g.fill(0xaaaaaa);
      }
      if (w.walkerType === "service") {
        // Carrying basket/satchel
        g.roundRect(wx - 1.5 * sc, wy - bodyBob, 3 * sc, 2 * sc, 0.5); g.fill(0x8b7355);
        // Service icon above head
        const ic = ({ food: 0x8bc34a, religion: 0xffd700, safety: 0xf44336, entertainment: 0xff9800, commerce: 0x2196f3, water: 0x42a5f5 } as Record<string, number>)[w.service ?? ""] ?? 0xffffff;
        g.circle(wx, wy - 7 * sc - bodyBob, 2); g.fill(ic);
        g.circle(wx, wy - 7 * sc - bodyBob, 2); g.stroke({ color: shadeColor(ic, 0.7), width: 0.5 });
      }

      // HP bar
      if ((w.walkerType === "bandit" || w.walkerType === "militia") && w.hp < w.maxHp) {
        const bw = 12 * sc, r = w.hp / w.maxHp;
        g.roundRect(wx - bw / 2, wy - 10 * sc - bodyBob, bw, 2.5, 1); g.fill(0x222222);
        g.roundRect(wx - bw / 2, wy - 10 * sc - bodyBob, bw * r, 2.5, 1); g.fill(r > 0.5 ? 0x4caf50 : 0xf44336);
      }

      this._walkerLayer.addChild(g);
    }
  }

  // ==================================================================
  // FX
  // ==================================================================
  private _renderFX(state: CaesarState, dt: number): void {
    for (const c of this._fxLayer.removeChildren()) c.destroy();
    const g = new PIXI.Graphics();
    const ts = CB.TILE_SIZE;
    const T = this._time;

    // ---- Fire particles (orange/yellow flames rising) ----
    for (let i = this._fireParticles.length - 1; i >= 0; i--) {
      const p = this._fireParticles[i]; p.age += dt;
      if (p.age >= p.life) { this._fireParticles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.95;
      const t = p.age / p.life;
      const sz = p.sz * (1 - t * 0.6);
      // Flame color: yellow core → orange → red tip → dark smoke
      let fc: number;
      if (t < 0.2) fc = 0xffee44;       // bright yellow
      else if (t < 0.5) fc = 0xff8800;   // orange
      else if (t < 0.8) fc = 0xdd3300;   // red
      else fc = 0x555555;                 // smoke-dark
      g.circle(p.x, p.y, sz); g.fill({ color: fc, alpha: (1 - t) * 0.85 });
      // Inner glow
      if (t < 0.4) { g.circle(p.x, p.y, sz * 0.5); g.fill({ color: 0xffffcc, alpha: (1 - t) * 0.4 }); }
    }

    // ---- Smoke (grey, from chimneys + fires) ----
    for (let i = this._smoke.length - 1; i >= 0; i--) {
      const p = this._smoke[i]; p.age += dt;
      if (p.age >= p.life) { this._smoke.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.97;
      const t = p.age / p.life;
      const sz = p.sz + t * 5;
      // Dark smoke from fires, lighter from production
      const smokeCol = p.sz > 2 ? 0x444444 : 0xbbbbbb;
      g.circle(p.x, p.y, sz); g.fill({ color: smokeCol, alpha: (1 - t) * 0.22 });
      g.circle(p.x + 0.5, p.y - 0.5, sz * 0.55); g.fill({ color: 0xdddddd, alpha: (1 - t) * 0.08 });
    }

    // ---- Sparks (forge, orange/yellow) ----
    for (let i = this._sparks.length - 1; i >= 0; i--) {
      const p = this._sparks[i]; p.age += dt;
      if (p.age >= p.life) { this._sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
      const t = p.age / p.life;
      g.circle(p.x, p.y, 1.2 - t * 0.9); g.fill({ color: p.c, alpha: 1 - t });
      // Spark trail
      g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * dt * 2, p.y - p.vy * dt * 2);
      g.stroke({ color: p.c, width: 0.5, alpha: (1 - t) * 0.5 });
    }

    // ---- Animated wheat swaying on farm tiles (viewport-culled) ----
    {
      const fxVl = this._cameraX - ts;
      const fxVt = this._cameraY - ts;
      const fxSw = this._app?.screen.width ?? 800;
      const fxSh = this._app?.screen.height ?? 600;
      const fxVr = this._cameraX + fxSw / this._zoom + ts;
      const fxVb = this._cameraY + fxSh / this._zoom + ts;
      for (const b of state.buildings.values()) {
        if (b.type !== CaesarBuildingType.FARM || !b.built) continue;
        const bdef = CAESAR_BUILDING_DEFS[b.type];
        const fpx = b.tileX * ts, fpy = b.tileY * ts;
        const fpw = bdef.footprint.w * ts, fph = bdef.footprint.h * ts;
        // Skip farms outside viewport
        if (fpx + fpw < fxVl || fpx > fxVr || fpy + fph < fxVt || fpy > fxVb) continue;
        const rng = mulberry32(b.id * 4217);
        const rows = Math.floor(fph / 3.5);
        for (let r = 2; r < rows; r++) {
          const ry = fpy + 6 + r * 3.5;
          for (let s = 0; s < Math.floor((fpw - 10) / 3); s++) {
            const sx = fpx + 5 + s * 3 + rng() * 1.5;
            const sway = Math.sin(T * 2.5 + sx * 0.15 + ry * 0.1) * 1.2;
            const shh = 2.5 + rng() * 1.5;
            g.moveTo(sx, ry); g.lineTo(sx + sway, ry - shh);
            g.stroke({ color: 0x8aaa3a, width: 0.7, alpha: 0.6 });
            g.ellipse(sx + sway, ry - shh - 0.5, 0.7, 1.1);
            g.fill({ color: 0xdde040, alpha: 0.7 });
          }
        }
      }
    }

    // ---- Water shimmer — only animate a few visible water tiles, not entire map ----
    const map = state.map;
    const vl = Math.max(0, Math.floor(this._cameraX / ts) - 1);
    const vt2 = Math.max(0, Math.floor(this._cameraY / ts) - 1);
    const sw2 = this._app?.screen.width ?? 800;
    const sh2 = this._app?.screen.height ?? 600;
    const vr = Math.min(map.width, Math.ceil((this._cameraX + sw2 / this._zoom) / ts) + 1);
    const vb = Math.min(map.height, Math.ceil((this._cameraY + sh2 / this._zoom) / ts) + 1);
    for (let y = vt2; y < vb; y++) for (let x = vl; x < vr; x++) {
      const tile = map.tiles[y * map.width + x];
      if (!tile || tile.terrain !== "water") continue;
      const px = x * ts, py = y * ts;
      const phase1 = Math.sin(T * 2.5 + x * 0.4 + y * 0.3);
      if (phase1 > 0.5) {
        g.rect(px + 2, py + ts * 0.2 + phase1 * ts * 0.2, ts - 4, 1.2);
        g.fill({ color: WATER_HI, alpha: (phase1 - 0.5) * 0.45 });
      }
    }

    // ---- Environmental particles (leaves, dust, butterflies) ----
    // Spawn new particles occasionally (increased rate for ambient atmosphere)
    if (Math.random() < 0.1) {
      const mapW = map.width * ts, mapH = map.height * ts;
      const epx = Math.random() * mapW;
      const epy = Math.random() * mapH * 0.3; // spawn in upper portion
      const types: Array<"leaf" | "dust" | "butterfly"> = ["leaf", "leaf", "dust", "butterfly"];
      const etype = types[Math.floor(Math.random() * types.length)];
      this._envParticles.push({
        x: epx, y: epy, age: 0,
        life: etype === "butterfly" ? 6 + Math.random() * 4 : 3 + Math.random() * 3,
        vx: 3 + Math.random() * 6,
        vy: etype === "butterfly" ? Math.random() * 2 - 1 : 4 + Math.random() * 4,
        type: etype,
        c: etype === "leaf" ? LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]
         : etype === "butterfly" ? FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]
         : 0xddccaa,
      });
    }
    // Cap env particles
    while (this._envParticles.length > 60) this._envParticles.shift();

    for (let i = this._envParticles.length - 1; i >= 0; i--) {
      const p = this._envParticles[i]; p.age += dt;
      if (p.age >= p.life) { this._envParticles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const t = p.age / p.life;
      const alpha = t < 0.1 ? t * 10 : t > 0.8 ? (1 - t) * 5 : 1; // fade in/out

      if (p.type === "leaf") {
        // Tumbling leaf (rotating ellipse)
        const rot = p.age * 3 + p.x * 0.01;
        const lw = 2 * Math.abs(Math.cos(rot));
        const lh = 1.2;
        g.ellipse(p.x, p.y, Math.max(0.5, lw), lh);
        g.fill({ color: p.c, alpha: alpha * 0.6 });
      } else if (p.type === "dust") {
        g.circle(p.x, p.y, 0.5 + t * 0.5);
        g.fill({ color: p.c, alpha: alpha * 0.2 });
      } else if (p.type === "butterfly") {
        // Fluttering wings
        const wingPhase = Math.sin(p.age * 12) * 2;
        p.vy = Math.sin(p.age * 2) * 3; // sinusoidal flight
        // Left wing
        g.ellipse(p.x - 1.5, p.y, 1.5, Math.abs(wingPhase) * 0.5 + 0.3);
        g.fill({ color: p.c, alpha: alpha * 0.7 });
        // Right wing
        g.ellipse(p.x + 1.5, p.y, 1.5, Math.abs(wingPhase) * 0.5 + 0.3);
        g.fill({ color: p.c, alpha: alpha * 0.7 });
        // Body
        g.ellipse(p.x, p.y, 0.4, 1.2);
        g.fill({ color: 0x333333, alpha: alpha * 0.8 });
      }
    }

    // AO terrain edge shadows moved to _renderTerrain (static, only needs redraw on terrain change)

    this._fxLayer.addChild(g);
  }

  // ==================================================================
  // HIGHLIGHT
  // ==================================================================
  private _renderHighlight(state: CaesarState): void {
    this._highlightGfx.clear();
    if (state.hoveredTileX < 0 || state.hoveredTileY < 0) return;
    const ts = CB.TILE_SIZE;
    let w = 1, h = 1;
    const bm = state.selectedTool === "build" && state.selectedBuildingType;
    const rm = state.selectedTool === "road";
    if (bm) { const bd = CAESAR_BUILDING_DEFS[state.selectedBuildingType!]; w = bd.footprint.w; h = bd.footprint.h; }
    const px = state.hoveredTileX * ts, py = state.hoveredTileY * ts;
    let ok = true, reason = "";
    if (bm) { const r = canPlaceBuilding(state, state.selectedBuildingType!, state.hoveredTileX, state.hoveredTileY); ok = r.ok; reason = r.reason; }
    else if (rm) { const r = canPlaceBuilding(state, CaesarBuildingType.ROAD, state.hoveredTileX, state.hoveredTileY); ok = r.ok; reason = r.reason; }
    state.tooltipText = reason;
    const pulse = 0.7 + Math.sin(this._time * 4) * 0.3;
    const c = ok ? 0x44ff44 : 0xff4444;
    this._highlightGfx.roundRect(px + 1, py + 1, w * ts - 2, h * ts - 2, 2);
    this._highlightGfx.stroke({ color: c, width: 2, alpha: pulse });
    this._highlightGfx.roundRect(px + 1, py + 1, w * ts - 2, h * ts - 2, 2);
    this._highlightGfx.fill({ color: c, alpha: 0.08 + (1 - pulse) * 0.04 });
  }

  // ==================================================================
  // MINIMAP
  // ==================================================================
  private _minimapThrottle = 0;
  private _renderMinimap(state: CaesarState): void {
    if (!this._minimapCanvas) return;
    // Only redraw minimap every 10 frames to avoid per-frame full-map iteration
    this._minimapThrottle++;
    if (this._minimapThrottle % 10 !== 0 && !this._terrainDirty) {
      // Still draw viewport rect cheaply
      const ctx2 = this._minimapCanvas.getContext("2d"); if (!ctx2) return;
      const sw3 = this._app?.screen.width ?? 800, sh3 = this._app?.screen.height ?? 600;
      const sx3 = this._minimapCanvas.width / state.map.width, sy3 = this._minimapCanvas.height / state.map.height;
      ctx2.strokeStyle = "#ffdd44"; ctx2.lineWidth = 1.5;
      ctx2.strokeRect((this._cameraX / CB.TILE_SIZE) * sx3, (this._cameraY / CB.TILE_SIZE) * sy3, (sw3 / (CB.TILE_SIZE * this._zoom)) * sx3, (sh3 / (CB.TILE_SIZE * this._zoom)) * sy3);
      return;
    }
    const ctx = this._minimapCanvas.getContext("2d"); if (!ctx) return;
    const map = state.map, mw = this._minimapCanvas.width, mh = this._minimapCanvas.height;
    const sx = mw / map.width, sy = mh / map.height;
    const tc: Record<CaesarTerrain, number> = { grass: 0x5a8f3c, water: 0x2a6ec4, forest: 0x2d6b1e, hill: 0x8b7355, stone_deposit: 0x9e9e9e, iron_deposit: 0x607d8b };
    const img = ctx.createImageData(mw, mh);
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const c = tc[map.tiles[y * map.width + x].terrain] ?? 0x5a8f3c;
      const px = Math.floor(x * sx), py = Math.floor(y * sy);
      if (px < mw && py < mh) { const i = (py * mw + px) * 4; img.data[i] = (c >> 16) & 0xff; img.data[i + 1] = (c >> 8) & 0xff; img.data[i + 2] = c & 0xff; img.data[i + 3] = 255; }
    }
    for (const b of state.buildings.values()) {
      const bd = CAESAR_BUILDING_DEFS[b.type];
      const c = b.type === CaesarBuildingType.HOUSING ? H_WALLS[b.housingTier] : b.type === CaesarBuildingType.ROAD ? ROAD_STONE : this._getCol(b);
      for (let dy = 0; dy < bd.footprint.h; dy++) for (let dx = 0; dx < bd.footprint.w; dx++) {
        const px = Math.floor((b.tileX + dx) * sx), py = Math.floor((b.tileY + dy) * sy);
        if (px >= 0 && px < mw && py >= 0 && py < mh) { const i = (py * mw + px) * 4; img.data[i] = (c >> 16) & 0xff; img.data[i + 1] = (c >> 8) & 0xff; img.data[i + 2] = c & 0xff; }
      }
    }
    for (const w of state.walkers.values()) {
      if (!w.alive || w.walkerType !== "bandit") continue;
      const px = Math.floor(w.x * sx), py = Math.floor(w.y * sy);
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const fx = px + dx, fy = py + dy; if (fx >= 0 && fx < mw && fy >= 0 && fy < mh) { const i = (fy * mw + fx) * 4; img.data[i] = 255; img.data[i + 1] = 40; img.data[i + 2] = 40; } }
    }
    ctx.putImageData(img, 0, 0);
    const sw = this._app?.screen.width ?? 800, sh = this._app?.screen.height ?? 600;
    ctx.strokeStyle = "#ffdd44"; ctx.lineWidth = 1.5;
    ctx.strokeRect((this._cameraX / CB.TILE_SIZE) * sx, (this._cameraY / CB.TILE_SIZE) * sy, (sw / (CB.TILE_SIZE * this._zoom)) * sx, (sh / (CB.TILE_SIZE * this._zoom)) * sy);
  }

  destroy(): void {
    if (this._panRAF !== null) cancelAnimationFrame(this._panRAF);
    if (this._minimapCanvas) { this._minimapCanvas.remove(); this._minimapCanvas = null; }
    if (this._app) { const c = this._app.canvas as HTMLCanvasElement; if (c.parentNode) c.parentNode.removeChild(c); this._app.destroy(true); this._app = null; }
  }
}
