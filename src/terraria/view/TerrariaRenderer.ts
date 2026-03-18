// ---------------------------------------------------------------------------
// Terraria – Main tile renderer (PixiJS 2D)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import { BlockType, BLOCK_DEFS, WallType } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { worldToChunkX, worldToLocalX } from "../state/TerrariaChunk";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;
const CW = TB.CHUNK_W;
const WH = TB.WORLD_HEIGHT;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class TerrariaRenderer {
  readonly worldLayer = new Container();
  private _skyGfx = new Graphics();
  private _parallaxGfx = new Graphics();
  private _wallLayer = new Container();
  private _blockLayer = new Container();
  private _entityLayer = new Container();
  private _lightOverlay = new Graphics();
  private _cursorGfx = new Graphics();

  // Chunk graphics cache: key = chunk cx
  private _chunkBlockGfx = new Map<number, Graphics>();
  private _chunkWallGfx = new Map<number, Graphics>();

  init(): void {
    this.worldLayer.addChild(this._skyGfx);
    this.worldLayer.addChild(this._parallaxGfx);
    this.worldLayer.addChild(this._wallLayer);
    this.worldLayer.addChild(this._blockLayer);
    this.worldLayer.addChild(this._entityLayer);
    this.worldLayer.addChild(this._lightOverlay);
    this.worldLayer.addChild(this._cursorGfx);
  }

  get entityLayer(): Container { return this._entityLayer; }

  cleanup(): void {
    for (const g of this._chunkBlockGfx.values()) g.destroy();
    for (const g of this._chunkWallGfx.values()) g.destroy();
    this._chunkBlockGfx.clear();
    this._chunkWallGfx.clear();
    this.worldLayer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Draw frame
  // ---------------------------------------------------------------------------

  draw(state: TerrariaState, camera: TerrariaCamera): void {
    const sw = camera.screenW;
    const sh = camera.screenH;
    const bounds = camera.getVisibleBounds();

    // Sky background
    this._drawSky(state, sw, sh);

    // Parallax mountains
    this._drawParallax(state, camera, sw, sh);

    // Determine visible chunks
    const minCX = worldToChunkX(Math.max(0, bounds.minX));
    const maxCX = worldToChunkX(Math.min(TB.WORLD_WIDTH - 1, bounds.maxX));

    // Draw walls and blocks for visible chunks
    for (let cx = minCX; cx <= maxCX; cx++) {
      const chunk = state.chunks.get(cx);
      if (!chunk) continue;

      // Walls
      if (chunk.dirty || !this._chunkWallGfx.has(cx)) {
        this._rebuildChunkWalls(cx, state, bounds);
      }
      const wallGfx = this._chunkWallGfx.get(cx)!;
      const wallScreenX = cx * CW * TS - camera.x * TS + sw / 2;
      wallGfx.position.set(wallScreenX, 0);
      wallGfx.visible = true;

      // Blocks
      if (chunk.dirty || !this._chunkBlockGfx.has(cx)) {
        this._rebuildChunkBlocks(cx, state, bounds);
        chunk.dirty = false;
      }
      const blockGfx = this._chunkBlockGfx.get(cx)!;
      blockGfx.position.set(wallScreenX, 0);
      blockGfx.visible = true;
    }

    // Hide off-screen chunk graphics
    for (const [cx, gfx] of this._chunkBlockGfx) {
      if (cx < minCX || cx > maxCX) gfx.visible = false;
    }
    for (const [cx, gfx] of this._chunkWallGfx) {
      if (cx < minCX || cx > maxCX) gfx.visible = false;
    }

    // Light overlay
    this._drawLightOverlay(state, camera, bounds);

    // Block cursor
    this._drawCursor(state, camera);
  }

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------

  private _drawSky(state: TerrariaState, sw: number, sh: number): void {
    const t = state.timeOfDay;
    // dayness: 0 at midnight, 1 at noon
    const dayness = Math.max(0, Math.min(1, Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    // dawn/dusk warmth (peaks near 0.25 and 0.75)
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    const horizonness = Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 2.5); // strong near horizon

    this._skyGfx.clear();

    // --- Sky gradient (4 horizontal bands blended) ---
    const bands = 8;
    const bandH = sh / bands;
    for (let i = 0; i < bands; i++) {
      const frac = i / bands; // 0=top, 1=bottom
      // Top of sky: deeper blue / darker at night
      // Bottom of sky: lighter / horizon glow
      const nightR = 0x06 + frac * 0x08;
      const nightG = 0x06 + frac * 0x0C;
      const nightB = 0x18 + frac * 0x10;
      const dayR = 0x40 + frac * 0x47;
      const dayG = 0x80 + frac * 0x4E;
      const dayB = 0xE0 + frac * 0x0B;
      // Sunset/sunrise tint
      const dawnR = 0xCC - frac * 0x30;
      const dawnG = 0x66 + frac * 0x30;
      const dawnB = 0x33 + frac * 0x44;

      let r = _lerp(nightR, dayR, dayness);
      let g = _lerp(nightG, dayG, dayness);
      let b = _lerp(nightB, dayB, dayness);
      // Blend in dawn/dusk warmth at horizon bands
      if (horizonness > 0.05 && frac > 0.4) {
        const warmBlend = horizonness * Math.min(1, (frac - 0.4) * 3) * 0.7;
        r = _lerp(r, dawnR, warmBlend);
        g = _lerp(g, dawnG, warmBlend);
        b = _lerp(b, dawnB, warmBlend);
      }
      const color = (_clamp8(r) << 16) | (_clamp8(g) << 8) | _clamp8(b);
      this._skyGfx.rect(0, i * bandH, sw, bandH + 1);
      this._skyGfx.fill(color);
    }

    // --- Stars (visible at night) ---
    if (dayness < 0.5) {
      const starAlpha = Math.min(1, (0.5 - dayness) * 2.5);
      const starSeed = 12345;
      for (let i = 0; i < 80; i++) {
        const sx = _pseudoRand(starSeed + i * 3) * sw;
        const sy = _pseudoRand(starSeed + i * 3 + 1) * sh * 0.7;
        const size = 1 + _pseudoRand(starSeed + i * 3 + 2) * 1.5;
        const twinkle = 0.5 + Math.sin(state.totalTime * (1.5 + i * 0.1) + i) * 0.5;
        this._skyGfx.circle(sx, sy, size);
        this._skyGfx.fill({ color: 0xFFFFFF, alpha: starAlpha * twinkle * 0.8 });
      }
      // Constellations (connect a few stars with dim lines)
      if (starAlpha > 0.3) {
        const constellations = [
          [0, 3, 7, 12, 8], [20, 24, 27, 30], [40, 43, 46, 49, 44],
        ];
        for (const group of constellations) {
          for (let j = 1; j < group.length; j++) {
            const ax = _pseudoRand(starSeed + group[j - 1] * 3) * sw;
            const ay = _pseudoRand(starSeed + group[j - 1] * 3 + 1) * sh * 0.7;
            const bx = _pseudoRand(starSeed + group[j] * 3) * sw;
            const by = _pseudoRand(starSeed + group[j] * 3 + 1) * sh * 0.7;
            this._skyGfx.moveTo(ax, ay);
            this._skyGfx.lineTo(bx, by);
            this._skyGfx.stroke({ color: 0x8888CC, width: 0.5, alpha: starAlpha * 0.25 });
          }
        }
      }
    }

    // --- Sun / Moon ---
    const celestialX = sw * 0.5 + Math.cos(sunAngle) * sw * 0.4;
    const celestialY = sh * 0.35 - Math.sin(sunAngle) * sh * 0.3;

    if (dayness > 0.15) {
      // Sun
      const sunAlpha = Math.min(1, (dayness - 0.15) * 3);
      // Sun glow (large soft circle)
      this._skyGfx.circle(celestialX, celestialY, 28);
      this._skyGfx.fill({ color: 0xFFDD44, alpha: sunAlpha * 0.15 });
      this._skyGfx.circle(celestialX, celestialY, 18);
      this._skyGfx.fill({ color: 0xFFEE66, alpha: sunAlpha * 0.3 });
      // Sun body
      this._skyGfx.circle(celestialX, celestialY, 10);
      this._skyGfx.fill({ color: 0xFFFF88, alpha: sunAlpha });
      // Sun rays
      for (let r = 0; r < 8; r++) {
        const angle = r * Math.PI / 4 + state.totalTime * 0.15;
        const inner = 12;
        const outer = 18 + Math.sin(state.totalTime * 2 + r) * 3;
        this._skyGfx.moveTo(
          celestialX + Math.cos(angle) * inner,
          celestialY + Math.sin(angle) * inner,
        );
        this._skyGfx.lineTo(
          celestialX + Math.cos(angle) * outer,
          celestialY + Math.sin(angle) * outer,
        );
        this._skyGfx.stroke({ color: 0xFFEE66, width: 1.5, alpha: sunAlpha * 0.5 });
      }
    }
    if (dayness < 0.45) {
      // Moon (opposite side of the sky from sun)
      const moonX = sw * 0.5 - Math.cos(sunAngle) * sw * 0.4;
      const moonY = sh * 0.3 + Math.sin(sunAngle) * sh * 0.25;
      const moonAlpha = Math.min(1, (0.45 - dayness) * 3);
      // Moon glow
      this._skyGfx.circle(moonX, moonY, 16);
      this._skyGfx.fill({ color: 0xCCCCFF, alpha: moonAlpha * 0.12 });
      // Moon body
      this._skyGfx.circle(moonX, moonY, 8);
      this._skyGfx.fill({ color: 0xEEEEFF, alpha: moonAlpha * 0.9 });
      // Craters
      this._skyGfx.circle(moonX - 2, moonY - 1, 2);
      this._skyGfx.fill({ color: 0xCCCCDD, alpha: moonAlpha * 0.5 });
      this._skyGfx.circle(moonX + 3, moonY + 2, 1.5);
      this._skyGfx.fill({ color: 0xCCCCDD, alpha: moonAlpha * 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Parallax
  // ---------------------------------------------------------------------------

  private _drawParallax(state: TerrariaState, camera: TerrariaCamera, sw: number, sh: number): void {
    this._parallaxGfx.clear();
    const t = state.timeOfDay;
    const dayness = Math.max(0, Math.min(1, Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));

    // === LAYER 1: Far mountains (very slow, ~0.05x camera) ===
    {
      const ox = ((-camera.x * 0.05 * TS) % (sw * 3) + sw * 3) % (sw * 3) - sw;
      const baseY = sh * 0.50;
      const g = this._parallaxGfx;
      // Two overlapping mountain ranges
      for (let pass = 0; pass < 2; pass++) {
        const seed = pass * 50 + 7;
        const heightMult = pass === 0 ? 1.0 : 0.7;
        const alpha = pass === 0 ? 0.25 : 0.18;
        const color = pass === 0
          ? _lerpColor(0x1A2A3A, 0x2A4A3A, dayness)
          : _lerpColor(0x152535, 0x354A35, dayness);
        const passOx = ox + pass * 80;

        g.moveTo(passOx, baseY);
        // Generate jagged peaks with multiple sine harmonics
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const fx = passOx + (i / steps) * sw * 3;
          const n = i + seed;
          const peak =
            Math.sin(n * 0.15) * 55 * heightMult +
            Math.sin(n * 0.37 + 1.7) * 30 * heightMult +
            Math.sin(n * 0.73 + 0.3) * 18 * heightMult +
            Math.sin(n * 1.51 + 2.1) * 8 * heightMult;
          g.lineTo(fx, baseY - 40 * heightMult - peak);
        }
        g.lineTo(passOx + sw * 3, sh);
        g.lineTo(passOx, sh);
        g.closePath();
        g.fill({ color, alpha });
      }
    }

    // === LAYER 2: Mid mountains (0.12x camera) ===
    {
      const ox = ((-camera.x * 0.12 * TS) % (sw * 2.5) + sw * 2.5) % (sw * 2.5) - sw * 0.5;
      const baseY = sh * 0.58;
      const g = this._parallaxGfx;
      const color = _lerpColor(0x1E3020, 0x3A5A30, dayness);

      g.moveTo(ox, baseY);
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
        const fx = ox + (i / steps) * sw * 2.5;
        const n = i + 100;
        const peak =
          Math.sin(n * 0.2 + 0.5) * 45 +
          Math.sin(n * 0.53 + 2.2) * 25 +
          Math.sin(n * 1.1 + 1.0) * 12 +
          Math.sin(n * 2.3) * 5;
        g.lineTo(fx, baseY - 30 - peak);
      }
      g.lineTo(ox + sw * 2.5, sh);
      g.lineTo(ox, sh);
      g.closePath();
      g.fill({ color, alpha: 0.35 });

      // Snow caps on the tallest peaks
      g.moveTo(ox, baseY);
      for (let i = 0; i <= steps; i++) {
        const fx = ox + (i / steps) * sw * 2.5;
        const n = i + 100;
        const peak =
          Math.sin(n * 0.2 + 0.5) * 45 +
          Math.sin(n * 0.53 + 2.2) * 25 +
          Math.sin(n * 1.1 + 1.0) * 12 +
          Math.sin(n * 2.3) * 5;
        const peakY = baseY - 30 - peak;
        // Only draw snow on peaks above a threshold
        if (peak > 50) {
          g.lineTo(fx, peakY);
        } else {
          g.lineTo(fx, peakY + 6); // skip below snow line
        }
      }
      g.lineTo(ox + sw * 2.5, baseY);
      g.lineTo(ox, baseY);
      g.closePath();
      g.fill({ color: 0xDDDDEE, alpha: dayness * 0.15 });
    }

    // === LAYER 3: Near hills with trees silhouettes (0.2x camera) ===
    {
      const ox = ((-camera.x * 0.2 * TS) % (sw * 2) + sw * 2) % (sw * 2) - sw * 0.3;
      const baseY = sh * 0.65;
      const g = this._parallaxGfx;
      const color = _lerpColor(0x14261A, 0x2A4A28, dayness);

      // Rolling hills
      g.moveTo(ox, baseY);
      const steps = 70;
      for (let i = 0; i <= steps; i++) {
        const fx = ox + (i / steps) * sw * 2;
        const n = i + 200;
        const hill =
          Math.sin(n * 0.12) * 35 +
          Math.sin(n * 0.31 + 1.5) * 20 +
          Math.sin(n * 0.7 + 0.8) * 10;
        g.lineTo(fx, baseY - 20 - hill);
      }
      g.lineTo(ox + sw * 2, sh);
      g.lineTo(ox, sh);
      g.closePath();
      g.fill({ color, alpha: 0.4 });

      // Tree silhouettes on the hills
      const treeColor = _lerpColor(0x0A1A0E, 0x1A3A18, dayness);
      for (let i = 0; i < 40; i++) {
        const tx = ox + _pseudoRand(300 + i) * sw * 2;
        const n = Math.floor((tx - ox) / (sw * 2) * steps) + 200;
        const hill =
          Math.sin(n * 0.12) * 35 +
          Math.sin(n * 0.31 + 1.5) * 20 +
          Math.sin(n * 0.7 + 0.8) * 10;
        const treeBaseY = baseY - 20 - hill;
        const th = 8 + _pseudoRand(400 + i) * 14;
        const tw = 4 + _pseudoRand(500 + i) * 8;

        // Trunk
        g.rect(tx - 1, treeBaseY - th, 2, th);
        g.fill({ color: treeColor, alpha: 0.5 });
        // Canopy (triangle)
        g.moveTo(tx - tw / 2, treeBaseY - th + 3);
        g.lineTo(tx, treeBaseY - th - tw * 0.6);
        g.lineTo(tx + tw / 2, treeBaseY - th + 3);
        g.closePath();
        g.fill({ color: treeColor, alpha: 0.45 });
      }
    }

    // === LAYER 4: Atmospheric haze (horizon band) ===
    {
      const g = this._parallaxGfx;
      const hazeY = sh * 0.6;
      const hazeH = sh * 0.15;
      for (let i = 0; i < 4; i++) {
        const frac = i / 4;
        const hazeAlpha = dayness > 0.3 ? 0.08 - frac * 0.02 : 0.03;
        g.rect(0, hazeY + frac * hazeH, sw, hazeH / 4);
        g.fill({ color: dayness > 0.3 ? 0xCCDDEE : 0x334466, alpha: hazeAlpha });
      }
    }

    // === CLOUDS (layered, varied shapes) ===
    {
      const g = this._parallaxGfx;
      const cloudAlpha = dayness > 0.2 ? 0.3 : 0.1;
      const cloudColor = dayness > 0.2 ? 0xFFFFFF : 0x8888AA;

      // Slow cloud layer
      const cloudOx1 = ((state.totalTime * 5) % (sw * 2.5));
      for (let i = 0; i < 10; i++) {
        const seed = 600 + i;
        const cx = ((_pseudoRand(seed) * sw * 2.5 - cloudOx1) % (sw * 2.5) + sw * 2.5) % (sw * 2.5) - sw * 0.3;
        const cy = 30 + _pseudoRand(seed + 1) * sh * 0.18;
        const cw = 50 + _pseudoRand(seed + 2) * 80;
        const ch = 12 + _pseudoRand(seed + 3) * 10;
        // Multi-ellipse cloud
        const puffs = 2 + Math.floor(_pseudoRand(seed + 4) * 3);
        for (let p = 0; p < puffs; p++) {
          const pox = (p - puffs / 2) * cw * 0.3;
          const poy = _pseudoRand(seed + 10 + p) * 4 - 2;
          const pw = cw * (0.4 + _pseudoRand(seed + 20 + p) * 0.3);
          const ph = ch * (0.6 + _pseudoRand(seed + 30 + p) * 0.4);
          g.ellipse(cx + pox, cy + poy, pw, ph);
          g.fill({ color: cloudColor, alpha: cloudAlpha * (0.6 + _pseudoRand(seed + 40 + p) * 0.4) });
        }
      }

      // Faster wispy clouds (higher, thinner)
      const cloudOx2 = ((state.totalTime * 12) % (sw * 3));
      for (let i = 0; i < 6; i++) {
        const seed = 800 + i;
        const cx = ((_pseudoRand(seed) * sw * 3 - cloudOx2) % (sw * 3) + sw * 3) % (sw * 3) - sw * 0.2;
        const cy = 15 + _pseudoRand(seed + 1) * 40;
        const cw = 80 + _pseudoRand(seed + 2) * 120;
        const ch = 3 + _pseudoRand(seed + 3) * 5;
        g.ellipse(cx, cy, cw, ch);
        g.fill({ color: cloudColor, alpha: cloudAlpha * 0.35 });
      }
    }

    // === Castle silhouette on far horizon (Easter egg landmark) ===
    {
      const g = this._parallaxGfx;
      const castleOx = ((-camera.x * 0.08 * TS) % (sw * 3) + sw * 3) % (sw * 3);
      const castleX = castleOx + sw * 0.7;
      const castleY = sh * 0.49;
      const castleAlpha = dayness < 0.3 ? 0.12 : 0.08;
      const castleColor = _lerpColor(0x0A1520, 0x2A3530, dayness);

      // Main keep
      g.rect(castleX - 8, castleY - 25, 16, 25);
      g.fill({ color: castleColor, alpha: castleAlpha });
      // Towers
      g.rect(castleX - 16, castleY - 30, 8, 30);
      g.fill({ color: castleColor, alpha: castleAlpha });
      g.rect(castleX + 8, castleY - 30, 8, 30);
      g.fill({ color: castleColor, alpha: castleAlpha });
      // Tower caps (triangles)
      g.moveTo(castleX - 18, castleY - 30);
      g.lineTo(castleX - 12, castleY - 38);
      g.lineTo(castleX - 6, castleY - 30);
      g.closePath();
      g.fill({ color: castleColor, alpha: castleAlpha });
      g.moveTo(castleX + 6, castleY - 30);
      g.lineTo(castleX + 12, castleY - 38);
      g.lineTo(castleX + 18, castleY - 30);
      g.closePath();
      g.fill({ color: castleColor, alpha: castleAlpha });
      // Battlements
      for (let b = -7; b <= 7; b += 3) {
        g.rect(castleX + b - 1, castleY - 27, 2, 3);
        g.fill({ color: castleColor, alpha: castleAlpha });
      }
      // Flag
      const flagWave = Math.sin(state.totalTime * 3) * 2;
      g.moveTo(castleX, castleY - 38);
      g.lineTo(castleX, castleY - 45);
      g.stroke({ color: castleColor, width: 1, alpha: castleAlpha });
      g.moveTo(castleX, castleY - 45);
      g.lineTo(castleX + 6 + flagWave, castleY - 43);
      g.lineTo(castleX, castleY - 41);
      g.closePath();
      g.fill({ color: 0xCC2222, alpha: castleAlpha * 1.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Chunk rendering
  // ---------------------------------------------------------------------------

  private _rebuildChunkBlocks(cx: number, state: TerrariaState, bounds: { minY: number; maxY: number }): void {
    let gfx = this._chunkBlockGfx.get(cx);
    if (!gfx) {
      gfx = new Graphics();
      this._blockLayer.addChild(gfx);
      this._chunkBlockGfx.set(cx, gfx);
    }
    gfx.clear();

    const chunk = state.chunks.get(cx);
    if (!chunk) return;

    const screenH = state.screenH;
    const camY = state.camY;

    for (let lx = 0; lx < CW; lx++) {
      const wx = cx * CW + lx;
      const minY = Math.max(0, bounds.minY);
      const maxY = Math.min(WH - 1, bounds.maxY);
      for (let y = minY; y <= maxY; y++) {
        const bt = chunk.getBlock(lx, y);
        if (bt === BlockType.AIR) continue;
        const def = BLOCK_DEFS[bt];
        if (!def) continue;

        const px = lx * TS;
        const py = (camY - y) * TS + screenH / 2 - TS;

        // Depth-based color darkening (deeper = slightly darker)
        let color = def.color;
        if (def.solid && y < TB.SURFACE_Y) {
          const depthFactor = Math.max(0.55, 1 - (TB.SURFACE_Y - y) / (TB.SURFACE_Y * 1.5));
          color = _darkenColor(color, depthFactor);
        }

        gfx.rect(px, py, TS, TS);
        gfx.fill(color);

        // Block detail texturing
        if (def.solid && !def.transparent) {
          // Top highlight
          gfx.rect(px, py, TS, 1);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.1 });
          // Bottom shadow
          gfx.rect(px, py + TS - 1, TS, 1);
          gfx.fill({ color: 0x000000, alpha: 0.18 });
          // Left edge
          gfx.rect(px, py, 1, TS);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.05 });

          // Procedural noise detail for stone/dirt (subtle pixel dots)
          if (bt === BlockType.STONE || bt === BlockType.COBBLESTONE || bt === BlockType.DIRT) {
            const hash = ((wx * 374761393 + y * 668265263) >>> 0) % 100;
            if (hash < 20) {
              const dotX = px + (hash % 4) * 4 + 2;
              const dotY = py + ((hash * 7) % 4) * 4 + 2;
              gfx.rect(dotX, dotY, 2, 2);
              gfx.fill({ color: hash < 10 ? 0xFFFFFF : 0x000000, alpha: 0.08 });
            }
          }

          // Grass top decoration
          if (bt === BlockType.GRASS) {
            // Little grass blades on top
            for (let gx = 0; gx < TS; gx += 3) {
              const gh = 1 + ((wx * 31 + gx * 17) >>> 0) % 3;
              gfx.rect(px + gx, py - gh, 1, gh);
              gfx.fill({ color: 0x5CBF55, alpha: 0.6 });
            }
          }
        }

        // Special block glow effects
        if (def.lightEmit > 4) {
          gfx.rect(px - 1, py - 1, TS + 2, TS + 2);
          gfx.fill({ color: def.color, alpha: 0.15 });
        }

        // Liquid shimmer
        if (def.liquid) {
          const shimmer = Math.sin((state.totalTime ?? 0) * 2 + wx * 0.5 + y * 0.3) * 0.1;
          gfx.rect(px, py, TS, 2);
          gfx.fill({ color: 0xFFFFFF, alpha: Math.max(0, 0.1 + shimmer) });
        }
      }
    }
  }

  private _rebuildChunkWalls(cx: number, state: TerrariaState, bounds: { minY: number; maxY: number }): void {
    let gfx = this._chunkWallGfx.get(cx);
    if (!gfx) {
      gfx = new Graphics();
      this._wallLayer.addChild(gfx);
      this._chunkWallGfx.set(cx, gfx);
    }
    gfx.clear();

    const chunk = state.chunks.get(cx);
    if (!chunk) return;

    const screenH = state.screenH;
    const camY = state.camY;

    const wallColors: Record<number, number> = {
      [WallType.NONE]: 0,
      [WallType.DIRT_WALL]: 0x453010,
      [WallType.STONE_WALL]: 0x404040,
      [WallType.WOOD_WALL]: 0x604020,
      [WallType.CASTLE_WALL]: 0x505060,
    };

    for (let lx = 0; lx < CW; lx++) {
      const minY = Math.max(0, bounds.minY);
      const maxY = Math.min(WH - 1, bounds.maxY);
      for (let y = minY; y <= maxY; y++) {
        const wt = chunk.getWall(lx, y);
        if (wt === WallType.NONE) continue;
        // Don't draw wall behind solid blocks
        const bt = chunk.getBlock(lx, y);
        if (bt !== BlockType.AIR && BLOCK_DEFS[bt]?.solid && !BLOCK_DEFS[bt]?.transparent) continue;

        const px = lx * TS;
        const py = (camY - y) * TS + screenH / 2 - TS;
        const color = wallColors[wt] ?? 0x333333;

        gfx.rect(px, py, TS, TS);
        gfx.fill({ color, alpha: 0.7 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Light overlay
  // ---------------------------------------------------------------------------

  private _drawLightOverlay(state: TerrariaState, camera: TerrariaCamera, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this._lightOverlay.clear();

    const minX = Math.max(0, bounds.minX);
    const maxX = Math.min(TB.WORLD_WIDTH - 1, bounds.maxX);
    const minY = Math.max(0, bounds.minY);
    const maxY = Math.min(WH - 1, bounds.maxY);

    for (let wx = minX; wx <= maxX; wx++) {
      for (let wy = minY; wy <= maxY; wy++) {
        const cx = worldToChunkX(wx);
        const chunk = state.chunks.get(cx);
        if (!chunk) continue;
        const lx = worldToLocalX(wx);
        const light = chunk.getLight(lx, wy);
        if (light >= TB.MAX_LIGHT) continue;

        const darkness = (TB.MAX_LIGHT - light) / TB.MAX_LIGHT;
        if (darkness < 0.05) continue;

        const { sx, sy } = camera.worldToScreen(wx, wy + 1);
        this._lightOverlay.rect(sx, sy, TS, TS);
        this._lightOverlay.fill({ color: 0x000000, alpha: darkness * 0.85 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Block cursor
  // ---------------------------------------------------------------------------

  private _drawCursor(state: TerrariaState, camera: TerrariaCamera): void {
    this._cursorGfx.clear();
    const mt = state.player.miningTarget;
    if (!mt) return;

    const { sx, sy } = camera.worldToScreen(mt.wx, mt.wy + 1);
    // Selection outline
    this._cursorGfx.rect(sx, sy, TS, TS);
    this._cursorGfx.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.6 });

    // Mining progress overlay
    if (mt.progress > 0) {
      const h = TS * mt.progress;
      this._cursorGfx.rect(sx, sy + TS - h, TS, h);
      this._cursorGfx.fill({ color: 0xFF0000, alpha: 0.3 });
    }
  }

  /** Force all chunks to redraw next frame. */
  markAllDirty(state: TerrariaState): void {
    for (const chunk of state.chunks.values()) {
      chunk.dirty = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function _darkenColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xFF) * factor);
  const g = Math.floor(((color >> 8) & 0xFF) * factor);
  const b = Math.floor((color & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
}

function _lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function _clamp8(v: number): number { return Math.max(0, Math.min(255, Math.floor(v))); }

function _lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
  const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
  return (_clamp8(_lerp(ar, br, t)) << 16) | (_clamp8(_lerp(ag, bg, t)) << 8) | _clamp8(_lerp(ab, bb, t));
}

/** Deterministic pseudo-random 0-1 from integer seed */
function _pseudoRand(seed: number): number {
  let h = (seed * 374761393 + 1234567) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
