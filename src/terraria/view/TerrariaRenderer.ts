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
  private _screenFx = new Graphics();     // damage flash, underwater tint, weather
  private _dmgNumbers = new Graphics();    // floating damage numbers

  // Chunk graphics cache
  private _chunkBlockGfx = new Map<number, Graphics>();
  private _chunkWallGfx = new Map<number, Graphics>();

  // Screen FX state
  private _damageFlash = 0;
  private _healFlash = 0;
  private _prevHp = -1;

  // Floating damage/heal numbers
  private _floatingTexts: { x: number; y: number; text: string; color: number; life: number }[] = [];

  init(): void {
    this.worldLayer.addChild(this._skyGfx);
    this.worldLayer.addChild(this._parallaxGfx);
    this.worldLayer.addChild(this._wallLayer);
    this.worldLayer.addChild(this._blockLayer);
    this.worldLayer.addChild(this._entityLayer);
    this.worldLayer.addChild(this._lightOverlay);
    this.worldLayer.addChild(this._cursorGfx);
    this.worldLayer.addChild(this._dmgNumbers);
    this.worldLayer.addChild(this._screenFx);
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

    // Floating damage numbers
    this._drawFloatingTexts(camera);

    // Screen-space FX (damage flash, underwater tint, vignette, weather)
    this._drawScreenFX(state, camera, sw, sh);
  }

  /** Spawn a floating damage/heal number at world position. */
  addFloatingText(wx: number, wy: number, text: string, color: number): void {
    this._floatingTexts.push({ x: wx, y: wy, text, color, life: 1.2 });
  }

  /** Call once per frame to advance floating text timers. */
  updateFloatingTexts(dt: number): void {
    for (const ft of this._floatingTexts) {
      ft.y += dt * 2.5; // float upward
      ft.life -= dt;
    }
    this._floatingTexts = this._floatingTexts.filter(f => f.life > 0);
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

    const time = state.totalTime ?? 0;

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
        const h = _tileHash(wx, y);

        // Depth-based darkening
        let color = def.color;
        if (def.solid && y < TB.SURFACE_Y) {
          color = _darkenColor(color, Math.max(0.5, 1 - (TB.SURFACE_Y - y) / (TB.SURFACE_Y * 1.4)));
        }

        // ---- LIQUID RENDERING (water/lava) ----
        if (def.liquid) {
          const isLava = bt === BlockType.LAVA;
          const aboveIsAir = y < WH - 1 && chunk.getBlock(lx, y + 1) === BlockType.AIR;
          const waveOffset = aboveIsAir ? Math.sin(wx * 0.4 + time * 2.5) * 2 + Math.sin(wx * 0.9 + time * 1.8) * 1 : 0;

          // Base liquid body
          gfx.rect(px, py + waveOffset, TS, TS - waveOffset);
          gfx.fill({ color, alpha: isLava ? 0.9 : 0.65 });

          if (!isLava) {
            // Water gradient: lighter on top, darker below
            gfx.rect(px, py + waveOffset, TS, 3);
            gfx.fill({ color: 0x88BBFF, alpha: 0.2 });
            gfx.rect(px, py + TS - 3, TS, 3);
            gfx.fill({ color: 0x001133, alpha: 0.15 });
            // Shimmer
            const shimX = px + ((h * 7) % (TS - 3));
            const shimW = 2 + (h % 3);
            gfx.rect(shimX, py + waveOffset + 1, shimW, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.15 + Math.sin(time * 3 + wx) * 0.08 });
          } else {
            // Lava: molten surface with bubbles
            gfx.rect(px, py + waveOffset, TS, 2);
            gfx.fill({ color: 0xFFAA00, alpha: 0.3 });
            // Bubbles
            if (aboveIsAir && Math.sin(time * 4 + wx * 1.7 + y * 0.3) > 0.6) {
              const bx = px + 3 + (h % (TS - 6));
              gfx.circle(bx, py + waveOffset + 2, 1.5);
              gfx.fill({ color: 0xFFDD44, alpha: 0.4 });
            }
            // Inner glow
            gfx.rect(px + 2, py + 4, TS - 4, TS - 6);
            gfx.fill({ color: 0xFF6600, alpha: 0.15 + Math.sin(time * 2 + wx * 0.5) * 0.08 });
          }
          continue;
        }

        // ---- SOLID BLOCK RENDERING ----
        gfx.rect(px, py, TS, TS);
        gfx.fill(color);

        // 3D bevel edges (top-left highlight, bottom-right shadow)
        if (def.solid && !def.transparent) {
          // Top highlight
          gfx.rect(px, py, TS - 1, 1);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.12 });
          // Left highlight
          gfx.rect(px, py + 1, 1, TS - 2);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.07 });
          // Bottom shadow
          gfx.rect(px + 1, py + TS - 1, TS - 1, 1);
          gfx.fill({ color: 0x000000, alpha: 0.2 });
          // Right shadow
          gfx.rect(px + TS - 1, py, 1, TS - 1);
          gfx.fill({ color: 0x000000, alpha: 0.1 });
        }

        // ---- PER-BLOCK-TYPE TEXTURE PATTERNS ----
        if (bt === BlockType.STONE) {
          // Diagonal crack lines
          for (let i = 0; i < 2; i++) {
            const cx1 = px + ((h + i * 37) % (TS - 4)) + 2;
            const cy1 = py + ((h * 3 + i * 53) % (TS - 4)) + 2;
            gfx.moveTo(cx1, cy1);
            gfx.lineTo(cx1 + 3, cy1 + 2);
            gfx.stroke({ color: 0x000000, width: 0.6, alpha: 0.12 });
          }
          // Subtle speckles
          if (h % 3 === 0) {
            gfx.rect(px + (h % (TS - 2)), py + ((h * 5) % (TS - 2)), 2, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.06 });
          }
        } else if (bt === BlockType.DIRT) {
          // Dirt speckle pattern
          for (let i = 0; i < 3; i++) {
            const dx = (h * (i + 1) * 13) % (TS - 2);
            const dy = (h * (i + 1) * 17) % (TS - 2);
            gfx.rect(px + dx, py + dy, 1, 1);
            gfx.fill({ color: (h + i) % 2 === 0 ? 0xFFFFFF : 0x000000, alpha: 0.08 });
          }
        } else if (bt === BlockType.COBBLESTONE || bt === BlockType.STONE_BRICKS || bt === BlockType.CASTLE_WALL) {
          // Mortar grid pattern
          const gridX = bt === BlockType.CASTLE_WALL ? 8 : bt === BlockType.STONE_BRICKS ? 8 : 6;
          const gridY = bt === BlockType.CASTLE_WALL ? 8 : bt === BlockType.STONE_BRICKS ? 4 : 5;
          const offsetRow = Math.floor(y * gridY / TS) % 2 === 0 ? gridX / 2 : 0;
          for (let gx = 0; gx < TS; gx++) {
            if ((gx + offsetRow) % gridX === 0) {
              gfx.rect(px + gx, py, 1, TS);
              gfx.fill({ color: 0x000000, alpha: 0.1 });
            }
          }
          for (let gy = 0; gy < TS; gy++) {
            if (gy % gridY === 0) {
              gfx.rect(px, py + gy, TS, 1);
              gfx.fill({ color: 0x000000, alpha: 0.1 });
            }
          }
        } else if (bt === BlockType.PLANKS || bt === BlockType.OAK_LOG || bt === BlockType.WILLOW_LOG || bt === BlockType.DARK_OAK_LOG) {
          // Wood grain pattern (horizontal lines)
          for (let gy = 2; gy < TS; gy += 3) {
            const waveX = Math.sin(gy * 0.8 + h * 0.3) * 1;
            gfx.moveTo(px + waveX, py + gy);
            gfx.lineTo(px + TS + waveX, py + gy);
            gfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.12 });
          }
          // Knot
          if (h % 7 === 0) {
            gfx.circle(px + (h % (TS - 4)) + 2, py + ((h * 3) % (TS - 4)) + 2, 1.5);
            gfx.fill({ color: 0x000000, alpha: 0.1 });
          }
        } else if (bt === BlockType.MARBLE) {
          // Marble veining
          const vx1 = px + (h % TS);
          const vy1 = py;
          gfx.moveTo(vx1, vy1);
          gfx.bezierCurveTo(vx1 + 4, vy1 + TS * 0.3, vx1 - 3, vy1 + TS * 0.6, vx1 + 2, vy1 + TS);
          gfx.stroke({ color: 0xBBBBCC, width: 0.7, alpha: 0.2 });
        } else if (bt === BlockType.SAND) {
          // Sand grain dots
          for (let i = 0; i < 4; i++) {
            const sx2 = px + ((h * (i + 3)) % (TS - 1));
            const sy2 = py + ((h * (i + 7)) % (TS - 1));
            gfx.rect(sx2, sy2, 1, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.06 });
          }
        } else if (bt === BlockType.SNOW || bt === BlockType.ICE) {
          // Sparkle
          if (Math.sin(time * 2 + wx * 3 + y * 2) > 0.7) {
            gfx.circle(px + (h % (TS - 2)) + 1, py + ((h * 3) % (TS - 2)) + 1, 0.8);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.3 });
          }
        }

        // ---- ORE FACETS & SPARKLE ----
        if (bt === BlockType.IRON_ORE || bt === BlockType.GOLD_ORE || bt === BlockType.CRYSTAL_ORE || bt === BlockType.DRAGON_BONE_ORE) {
          // Faceted ore chunks inside stone
          const oreColor = def.color;
          const numFacets = 2 + (h % 3);
          for (let i = 0; i < numFacets; i++) {
            const fx = px + 2 + ((h * (i + 1) * 11) % (TS - 5));
            const fy = py + 2 + ((h * (i + 1) * 13) % (TS - 5));
            const fs = 2 + (h + i) % 3;
            // Diamond shape
            gfx.moveTo(fx + fs / 2, fy);
            gfx.lineTo(fx + fs, fy + fs / 2);
            gfx.lineTo(fx + fs / 2, fy + fs);
            gfx.lineTo(fx, fy + fs / 2);
            gfx.closePath();
            gfx.fill(oreColor);
            // Highlight on facet
            gfx.moveTo(fx + fs / 2, fy);
            gfx.lineTo(fx + fs, fy + fs / 2);
            gfx.lineTo(fx + fs / 2, fy + fs * 0.4);
            gfx.closePath();
            gfx.fill({ color: 0xFFFFFF, alpha: 0.2 });
          }
          // Sparkle effect
          if (Math.sin(time * 3 + wx * 2 + y * 1.7) > 0.8) {
            const spx = px + (h % (TS - 2)) + 1;
            const spy = py + ((h * 5) % (TS - 2)) + 1;
            gfx.circle(spx, spy, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.5 });
          }
        }

        // ---- GRASS OVERHANG + BLADES ----
        if (bt === BlockType.GRASS || bt === BlockType.SNOW || bt === BlockType.MUD) {
          const grassColor = bt === BlockType.SNOW ? 0xE8E8FF : bt === BlockType.MUD ? 0x4A3828 : 0x4CAF50;
          const bladeColor = bt === BlockType.SNOW ? 0xF8F8FF : bt === BlockType.MUD ? 0x5C4033 : 0x5CBF55;
          // Grass blades on top
          const aboveAir = y < WH - 1 && chunk.getBlock(lx, y + 1) === BlockType.AIR;
          if (aboveAir) {
            for (let gx = 0; gx < TS; gx += 2) {
              const gh = 1 + ((wx * 31 + gx * 17) >>> 0) % 4;
              const sway = Math.sin(time * 1.5 + wx * 0.5 + gx * 0.3) * 0.5;
              gfx.moveTo(px + gx + sway, py - gh);
              gfx.lineTo(px + gx, py);
              gfx.stroke({ color: bladeColor, width: 1, alpha: 0.7 });
            }
          }
          // Overhang: draw grass color 2px into block below
          const belowBt = y > 0 ? chunk.getBlock(lx, y - 1) : BlockType.AIR;
          if (belowBt === BlockType.DIRT || belowBt === BlockType.CLAY) {
            const belowPy = py + TS;
            gfx.rect(px, belowPy, TS, 2);
            gfx.fill({ color: grassColor, alpha: 0.35 });
          }
        }

        // ---- GLOW EFFECT for light-emitting blocks ----
        if (def.lightEmit > 2) {
          const glowColor = _getBlockGlowColor(bt, def.color);
          const glowR = def.lightEmit * 0.6;
          gfx.circle(px + TS / 2, py + TS / 2, TS * 0.5 + glowR);
          gfx.fill({ color: glowColor, alpha: 0.12 });
          gfx.circle(px + TS / 2, py + TS / 2, TS * 0.3 + glowR * 0.5);
          gfx.fill({ color: glowColor, alpha: 0.08 });
        }

        // ---- TORCH flame animation ----
        if (bt === BlockType.TORCH || bt === BlockType.ENCHANTED_TORCH) {
          const flameColor = bt === BlockType.ENCHANTED_TORCH ? 0xAA55FF : 0xFFAA00;
          const flicker = Math.sin(time * 8 + wx * 3) * 1.5;
          // Torch stick
          gfx.rect(px + TS / 2 - 1, py + TS * 0.3, 2, TS * 0.7);
          gfx.fill(0x8B6914);
          // Flame
          gfx.moveTo(px + TS / 2 - 2, py + TS * 0.35);
          gfx.lineTo(px + TS / 2 + flicker * 0.3, py - 1 + flicker);
          gfx.lineTo(px + TS / 2 + 2, py + TS * 0.35);
          gfx.closePath();
          gfx.fill({ color: flameColor, alpha: 0.8 });
          // Inner flame
          gfx.circle(px + TS / 2 + flicker * 0.2, py + TS * 0.2 + flicker * 0.3, 1.5);
          gfx.fill({ color: 0xFFFF88, alpha: 0.6 });
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
      const wx = cx * CW + lx;
      const minY = Math.max(0, bounds.minY);
      const maxY = Math.min(WH - 1, bounds.maxY);
      for (let y = minY; y <= maxY; y++) {
        const wt = chunk.getWall(lx, y);
        if (wt === WallType.NONE) continue;
        const bt = chunk.getBlock(lx, y);
        if (bt !== BlockType.AIR && BLOCK_DEFS[bt]?.solid && !BLOCK_DEFS[bt]?.transparent) continue;

        const px = lx * TS;
        const py = (camY - y) * TS + screenH / 2 - TS;
        const color = wallColors[wt] ?? 0x333333;

        gfx.rect(px, py, TS, TS);
        gfx.fill({ color, alpha: 0.65 });

        // Wall texture pattern
        if (wt === WallType.STONE_WALL) {
          // Subtle brick pattern
          const offRow = y % 2 === 0 ? 4 : 0;
          for (let gx = offRow; gx < TS; gx += 8) {
            gfx.rect(px + gx, py, 1, TS);
            gfx.fill({ color: 0x000000, alpha: 0.06 });
          }
          for (let gy = 0; gy < TS; gy += 4) {
            gfx.rect(px, py + gy, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.06 });
          }
        } else if (wt === WallType.WOOD_WALL) {
          // Plank lines
          for (let gy = 3; gy < TS; gy += 5) {
            gfx.rect(px, py + gy, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
        } else if (wt === WallType.DIRT_WALL) {
          // Speckles
          const h = _tileHash(wx, y);
          if (h % 4 === 0) {
            gfx.rect(px + (h % (TS - 1)), py + ((h * 3) % (TS - 1)), 1, 1);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
        }

        // Depth fade
        gfx.rect(px, py, TS, TS);
        gfx.fill({ color: 0x000000, alpha: 0.08 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Light overlay
  // ---------------------------------------------------------------------------

  private _drawLightOverlay(state: TerrariaState, camera: TerrariaCamera, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this._lightOverlay.clear();

    const minX = Math.max(0, bounds.minX);
    const maxX = Math.min(state.worldWidth - 1, bounds.maxX);
    const minY = Math.max(0, bounds.minY);
    const maxY = Math.min(WH - 1, bounds.maxY);

    for (let wx = minX; wx <= maxX; wx++) {
      for (let wy = minY; wy <= maxY; wy++) {
        const chunkIdx = worldToChunkX(wx);
        const chunk = state.chunks.get(chunkIdx);
        if (!chunk) continue;
        const lx = worldToLocalX(wx);
        const light = chunk.getLight(lx, wy);
        if (light >= TB.MAX_LIGHT) continue;

        const darkness = (TB.MAX_LIGHT - light) / TB.MAX_LIGHT;
        if (darkness < 0.03) continue;

        const { sx, sy } = camera.worldToScreen(wx, wy + 1);

        // Base darkness
        this._lightOverlay.rect(sx, sy, TS, TS);
        this._lightOverlay.fill({ color: 0x000000, alpha: darkness * 0.82 });

        // Colored light tinting: check nearby light sources for color
        if (light > 0 && light < TB.MAX_LIGHT - 2) {
          const tint = _getNearbyLightColor(state, wx, wy);
          if (tint !== 0) {
            const tintStrength = Math.min(0.18, (1 - darkness) * 0.25);
            this._lightOverlay.rect(sx, sy, TS, TS);
            this._lightOverlay.fill({ color: tint, alpha: tintStrength });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Block cursor
  // ---------------------------------------------------------------------------

  private _drawCursor(state: TerrariaState, camera: TerrariaCamera): void {
    this._cursorGfx.clear();
    const p = state.player;
    const held = p.inventory.hotbar[p.inventory.selectedSlot];

    const mt = p.miningTarget;
    if (mt) {
      const { sx, sy } = camera.worldToScreen(mt.wx, mt.wy + 1);
      // Selection outline
      this._cursorGfx.rect(sx, sy, TS, TS);
      this._cursorGfx.stroke({ color: 0xFFFFFF, width: 1.5, alpha: 0.7 });
      // Animated corners
      const cl = 4;
      this._cursorGfx.moveTo(sx, sy + cl); this._cursorGfx.lineTo(sx, sy); this._cursorGfx.lineTo(sx + cl, sy);
      this._cursorGfx.moveTo(sx + TS - cl, sy); this._cursorGfx.lineTo(sx + TS, sy); this._cursorGfx.lineTo(sx + TS, sy + cl);
      this._cursorGfx.moveTo(sx + TS, sy + TS - cl); this._cursorGfx.lineTo(sx + TS, sy + TS); this._cursorGfx.lineTo(sx + TS - cl, sy + TS);
      this._cursorGfx.moveTo(sx + cl, sy + TS); this._cursorGfx.lineTo(sx, sy + TS); this._cursorGfx.lineTo(sx, sy + TS - cl);
      this._cursorGfx.stroke({ color: 0xFFDD44, width: 1.5, alpha: 0.9 });

      // Mining progress
      if (mt.progress > 0) {
        const h = TS * mt.progress;
        this._cursorGfx.rect(sx + 1, sy + TS - h, TS - 2, h);
        this._cursorGfx.fill({ color: 0xFF4444, alpha: 0.35 });
        // Crack lines
        const cracks = Math.floor(mt.progress * 4);
        for (let i = 0; i < cracks; i++) {
          const cx = sx + 3 + (i * 3) % (TS - 6);
          const cy = sy + 3 + (i * 7) % (TS - 6);
          this._cursorGfx.moveTo(cx, cy);
          this._cursorGfx.lineTo(cx + 3, cy + 2);
          this._cursorGfx.lineTo(cx + 1, cy + 4);
          this._cursorGfx.stroke({ color: 0x000000, width: 1, alpha: 0.4 + mt.progress * 0.3 });
        }
      }
    }

    // Placement preview (ghost block)
    const hover = p.hoverTarget;
    if (hover && !mt) {
      const { sx: hsx, sy: hsy } = camera.worldToScreen(hover.wx, hover.wy + 1);
      if (hover.canPlace && held && held.color) {
        // Ghost block preview
        this._cursorGfx.rect(hsx + 1, hsy + 1, TS - 2, TS - 2);
        this._cursorGfx.fill({ color: held.color, alpha: 0.35 });
        this._cursorGfx.rect(hsx, hsy, TS, TS);
        this._cursorGfx.stroke({ color: 0x44FF44, width: 1, alpha: 0.6 });
      } else {
        // Can't place here - red outline
        this._cursorGfx.rect(hsx, hsy, TS, TS);
        this._cursorGfx.stroke({ color: 0xFF4444, width: 1, alpha: 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Floating damage/heal numbers
  // ---------------------------------------------------------------------------

  private _drawFloatingTexts(camera: TerrariaCamera): void {
    this._dmgNumbers.clear();
    for (const ft of this._floatingTexts) {
      const { sx, sy } = camera.worldToScreen(ft.x, ft.y);
      const alpha = Math.min(1, ft.life * 2);
      const scale = ft.life > 0.8 ? 1.3 - (ft.life - 0.8) * 0.75 : 1; // pop-in
      const size = 5 * scale;

      // Shadow
      this._dmgNumbers.circle(sx + 0.5, sy + 0.5, size * 0.7);
      this._dmgNumbers.fill({ color: 0x000000, alpha: alpha * 0.3 });
      // Main dot (represents damage number - text rendering not available in Graphics)
      this._dmgNumbers.circle(sx, sy, size * 0.6);
      this._dmgNumbers.fill({ color: ft.color, alpha: alpha * 0.9 });
      // Highlight
      this._dmgNumbers.circle(sx - size * 0.15, sy - size * 0.15, size * 0.25);
      this._dmgNumbers.fill({ color: 0xFFFFFF, alpha: alpha * 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Screen-space FX
  // ---------------------------------------------------------------------------

  private _drawScreenFX(state: TerrariaState, camera: TerrariaCamera, sw: number, sh: number): void {
    this._screenFx.clear();

    // Track HP changes for damage/heal flash
    if (this._prevHp >= 0) {
      const diff = state.player.hp - this._prevHp;
      if (diff < -1) this._damageFlash = 0.3;
      if (diff > 1) this._healFlash = 0.2;
    }
    this._prevHp = state.player.hp;
    if (this._damageFlash > 0) this._damageFlash -= 0.016;
    if (this._healFlash > 0) this._healFlash -= 0.016;

    // --- Damage red flash ---
    if (this._damageFlash > 0) {
      this._screenFx.rect(0, 0, sw, sh);
      this._screenFx.fill({ color: 0xFF0000, alpha: this._damageFlash * 0.4 });
    }

    // --- Heal green flash ---
    if (this._healFlash > 0) {
      this._screenFx.rect(0, 0, sw, sh);
      this._screenFx.fill({ color: 0x44FF44, alpha: this._healFlash * 0.25 });
    }

    // --- Underwater tint ---
    const playerY = state.player.y;
    if (playerY < TB.SEA_LEVEL) {
      // Check if player is surrounded by water (approximate: just check player block)
      const px = Math.floor(state.player.x);
      const py = Math.floor(playerY);
      const cx = worldToChunkX(px);
      const chunk = state.chunks.get(cx);
      if (chunk) {
        const lx = worldToLocalX(px);
        const bt = chunk.getBlock(lx, py);
        if (bt === BlockType.WATER) {
          this._screenFx.rect(0, 0, sw, sh);
          this._screenFx.fill({ color: 0x1144AA, alpha: 0.2 });
          // Animated caustic lines
          const time = state.totalTime;
          for (let i = 0; i < 8; i++) {
            const cx2 = Math.sin(time * 1.2 + i * 1.7) * sw * 0.4 + sw * 0.5;
            const cy2 = Math.sin(time * 0.9 + i * 2.3) * sh * 0.3 + sh * 0.5;
            const len = 30 + Math.sin(time + i) * 15;
            const angle = time * 0.3 + i * 0.8;
            this._screenFx.moveTo(cx2, cy2);
            this._screenFx.lineTo(cx2 + Math.cos(angle) * len, cy2 + Math.sin(angle) * len);
            this._screenFx.stroke({ color: 0x88CCFF, width: 1, alpha: 0.08 });
          }
        }
        // Lava proximity heat haze
        if (bt === BlockType.LAVA || playerY < TB.UNDERWORLD_Y + 5) {
          this._screenFx.rect(0, 0, sw, sh);
          this._screenFx.fill({ color: 0xFF2200, alpha: 0.08 });
        }
      }
    }

    // --- Vignette (subtle darkening at screen edges) ---
    const vignetteAlpha = 0.2;
    const vigSize = Math.max(sw, sh) * 0.4;
    // Top
    this._screenFx.rect(0, 0, sw, vigSize);
    this._screenFx.fill({ color: 0x000000, alpha: vignetteAlpha * 0.3 });
    // Bottom
    this._screenFx.rect(0, sh - vigSize, sw, vigSize);
    this._screenFx.fill({ color: 0x000000, alpha: vignetteAlpha * 0.4 });
    // Left
    this._screenFx.rect(0, 0, vigSize * 0.5, sh);
    this._screenFx.fill({ color: 0x000000, alpha: vignetteAlpha * 0.2 });
    // Right
    this._screenFx.rect(sw - vigSize * 0.5, 0, vigSize * 0.5, sh);
    this._screenFx.fill({ color: 0x000000, alpha: vignetteAlpha * 0.2 });

    // --- Night surface darkness (radial falloff from player) ---
    const dayness = Math.max(0, Math.min(1, Math.sin(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    if (dayness < 0.4 && playerY >= TB.SURFACE_Y - 10) {
      const nightAlpha = (0.4 - dayness) * 0.5;
      this._screenFx.rect(0, 0, sw, sh);
      this._screenFx.fill({ color: 0x0a0a20, alpha: nightAlpha });
      // Radial light around player (punch a hole)
      const { sx: psx, sy: psy } = camera.worldToScreen(state.player.x, state.player.y + TB.PLAYER_HEIGHT / 2);
      const lightR = 120;
      // Draw concentric rings to fake radial gradient (lighter near player)
      for (let r = lightR; r > 20; r -= 15) {
        this._screenFx.circle(psx, psy, r);
        this._screenFx.fill({ color: 0x0a0a20, alpha: -nightAlpha * 0.12 }); // negative won't work, but we clear area
      }
      // Bright area near player
      this._screenFx.circle(psx, psy, lightR);
      this._screenFx.fill({ color: 0xFFEEDD, alpha: nightAlpha * 0.04 });
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

/** Fast deterministic tile hash for procedural patterns. Returns 0-255. */
function _tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) & 0xFF;
}

/** Get glow color for light-emitting blocks. */
function _getBlockGlowColor(bt: number, fallback: number): number {
  if (bt === BlockType.TORCH) return 0xFFAA33;
  if (bt === BlockType.LAVA) return 0xFF5500;
  if (bt === BlockType.FORGE) return 0xFF6622;
  if (bt === BlockType.ENCHANTED_TORCH) return 0xAA55FF;
  if (bt === BlockType.CRYSTAL_ORE) return 0xBB66FF;
  if (bt === BlockType.HOLY_STONE) return 0xFFEEAA;
  if (bt === BlockType.ENCHANTED_STONE) return 0x9966FF;
  if (bt === BlockType.GRAIL_PEDESTAL) return 0xFFDD44;
  if (bt === BlockType.DRAGON_BONE_ORE) return 0xFF4422;
  return fallback;
}

/** Sample nearby blocks for colored light tinting. */
function _getNearbyLightColor(state: TerrariaState, wx: number, wy: number): number {
  // Check 5x5 area for light-emitting blocks, pick strongest
  let bestColor = 0;
  let bestEmit = 0;
  const r = 3;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const nx = wx + dx;
      const ny = wy + dy;
      if (nx < 0 || nx >= state.worldWidth || ny < 0 || ny >= TB.WORLD_HEIGHT) continue;
      const ncx = worldToChunkX(nx);
      const nchunk = state.chunks.get(ncx);
      if (!nchunk) continue;
      const nlx = worldToLocalX(nx);
      const nbt = nchunk.getBlock(nlx, ny);
      const ndef = BLOCK_DEFS[nbt];
      if (ndef && ndef.lightEmit > bestEmit) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < ndef.lightEmit * 0.5) {
          bestEmit = ndef.lightEmit;
          bestColor = _getBlockGlowColor(nbt, ndef.color);
        }
      }
    }
  }
  return bestColor;
}
