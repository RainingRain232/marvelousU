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
    const dayness = Math.max(0, Math.min(1, Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    const horizonness = Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 2.5);
    const time = state.totalTime;
    const g = this._skyGfx;
    g.clear();

    // --- Sky gradient (16 bands for smooth transition) ---
    const bands = 16;
    const bandH = sh / bands;
    for (let i = 0; i < bands; i++) {
      const frac = i / bands;
      const nightR = 0x04 + frac * 0x0A; const nightG = 0x04 + frac * 0x0E; const nightB = 0x14 + frac * 0x14;
      const dayR = 0x38 + frac * 0x50; const dayG = 0x78 + frac * 0x58; const dayB = 0xD0 + frac * 0x1B;
      const dawnR = 0xDD - frac * 0x40; const dawnG = 0x55 + frac * 0x40; const dawnB = 0x22 + frac * 0x55;
      let r = _lerp(nightR, dayR, dayness), gr = _lerp(nightG, dayG, dayness), b = _lerp(nightB, dayB, dayness);
      if (horizonness > 0.05 && frac > 0.35) {
        const w = horizonness * Math.min(1, (frac - 0.35) * 2.5) * 0.75;
        r = _lerp(r, dawnR, w); gr = _lerp(gr, dawnG, w); b = _lerp(b, dawnB, w);
      }
      g.rect(0, i * bandH, sw, bandH + 1);
      g.fill((_clamp8(r) << 16) | (_clamp8(gr) << 8) | _clamp8(b));
    }

    // --- Milky Way nebula (night only) ---
    if (dayness < 0.35) {
      const nebulaAlpha = Math.min(1, (0.35 - dayness) * 4) * 0.12;
      const nebulaY = sh * 0.15;
      // Broad nebula band (diagonal across sky)
      for (let i = 0; i < 30; i++) {
        const nx = _pseudoRand(9000 + i) * sw;
        const ny = nebulaY + Math.sin(nx * 0.003 + 1.5) * sh * 0.15 + (_pseudoRand(9100 + i) - 0.5) * 50;
        const nw = 20 + _pseudoRand(9200 + i) * 60;
        const nh = 8 + _pseudoRand(9300 + i) * 20;
        const nc = i % 3 === 0 ? 0x6644AA : i % 3 === 1 ? 0x4466BB : 0x885599;
        g.ellipse(nx, ny, nw, nh);
        g.fill({ color: nc, alpha: nebulaAlpha * (0.5 + _pseudoRand(9400 + i) * 0.5) });
      }
      // Dense star clusters in nebula
      for (let i = 0; i < 40; i++) {
        const sx2 = _pseudoRand(9500 + i) * sw;
        const sy2 = nebulaY + Math.sin(sx2 * 0.003 + 1.5) * sh * 0.12 + (_pseudoRand(9600 + i) - 0.5) * 30;
        g.circle(sx2, sy2, 0.5 + _pseudoRand(9700 + i) * 0.8);
        g.fill({ color: 0xDDDDFF, alpha: nebulaAlpha * 3 });
      }
    }

    // --- Stars (120 with varied colors and sizes) ---
    if (dayness < 0.5) {
      const starAlpha = Math.min(1, (0.5 - dayness) * 2.5);
      const starSeed = 12345;
      const starColors = [0xFFFFFF, 0xFFEECC, 0xCCDDFF, 0xFFCCCC, 0xCCFFCC, 0xFFFFDD];
      for (let i = 0; i < 120; i++) {
        const sx2 = _pseudoRand(starSeed + i * 3) * sw;
        const sy2 = _pseudoRand(starSeed + i * 3 + 1) * sh * 0.7;
        const size = 0.5 + _pseudoRand(starSeed + i * 3 + 2) * 2;
        const twinkle = 0.4 + Math.sin(time * (1.2 + i * 0.07) + i * 0.5) * 0.6;
        const sc = starColors[i % starColors.length];
        g.circle(sx2, sy2, size);
        g.fill({ color: sc, alpha: starAlpha * twinkle * 0.8 });
        // Bright stars get cross-shaped diffraction spikes
        if (size > 1.8 && twinkle > 0.7) {
          const spikeLen = size * 2.5;
          g.moveTo(sx2 - spikeLen, sy2); g.lineTo(sx2 + spikeLen, sy2);
          g.stroke({ color: sc, width: 0.4, alpha: starAlpha * twinkle * 0.3 });
          g.moveTo(sx2, sy2 - spikeLen); g.lineTo(sx2, sy2 + spikeLen);
          g.stroke({ color: sc, width: 0.4, alpha: starAlpha * twinkle * 0.3 });
        }
      }
      // Constellations with more complex shapes
      if (starAlpha > 0.25) {
        const constellations = [
          [0, 3, 7, 12, 8, 3], // pentagon
          [20, 24, 27, 30, 27, 24], // back-and-forth
          [40, 43, 46, 49, 44, 40], // loop
          [60, 63, 67, 70], // line
          [80, 85, 82, 88, 84], // W shape
        ];
        for (const group of constellations) {
          for (let j = 1; j < group.length; j++) {
            const ax = _pseudoRand(starSeed + group[j - 1] * 3) * sw;
            const ay = _pseudoRand(starSeed + group[j - 1] * 3 + 1) * sh * 0.7;
            const bx = _pseudoRand(starSeed + group[j] * 3) * sw;
            const by = _pseudoRand(starSeed + group[j] * 3 + 1) * sh * 0.7;
            g.moveTo(ax, ay); g.lineTo(bx, by);
            g.stroke({ color: 0x7788BB, width: 0.5, alpha: starAlpha * 0.2 });
          }
        }
      }

      // --- Shooting star (occasional) ---
      const shootPhase = Math.floor(time * 0.15);
      const shootFrac = (time * 0.15) - shootPhase;
      if (_pseudoRand(shootPhase * 17) < 0.3 && shootFrac < 0.3) {
        const ssx = _pseudoRand(shootPhase * 31) * sw;
        const ssy = _pseudoRand(shootPhase * 37) * sh * 0.4;
        const trailLen = 40 + _pseudoRand(shootPhase * 41) * 60;
        const angle = 0.3 + _pseudoRand(shootPhase * 43) * 0.5;
        const progress = shootFrac / 0.3;
        const headX = ssx + Math.cos(angle) * trailLen * progress;
        const headY = ssy + Math.sin(angle) * trailLen * progress;
        const tailX = ssx + Math.cos(angle) * trailLen * Math.max(0, progress - 0.4);
        const tailY = ssy + Math.sin(angle) * trailLen * Math.max(0, progress - 0.4);
        g.moveTo(tailX, tailY); g.lineTo(headX, headY);
        g.stroke({ color: 0xFFFFFF, width: 1.5, alpha: starAlpha * (1 - progress) * 0.8 });
        g.circle(headX, headY, 1.5);
        g.fill({ color: 0xFFFFFF, alpha: starAlpha * (1 - progress) });
      }

      // --- Aurora Borealis (rare, high in sky) ---
      const auroraPhase = Math.sin(time * 0.05);
      if (auroraPhase > 0.3 && dayness < 0.2) {
        const auroraAlpha = (auroraPhase - 0.3) * 0.15;
        for (let i = 0; i < 12; i++) {
          const ax = (i / 12) * sw;
          const wave1 = Math.sin(time * 0.4 + i * 0.8) * 25;
          const wave2 = Math.sin(time * 0.25 + i * 1.2 + 2) * 15;
          const ay = sh * 0.08 + wave1 + wave2;
          const ah = 15 + Math.sin(time * 0.6 + i) * 8;
          const ac = i % 2 === 0 ? 0x44FF88 : 0x4488FF;
          g.rect(ax, ay, sw / 12 + 4, ah);
          g.fill({ color: ac, alpha: auroraAlpha * (0.5 + Math.sin(time * 0.8 + i * 0.6) * 0.5) });
        }
      }
    }

    // --- Sun with corona and lens flare ---
    const celestialX = sw * 0.5 + Math.cos(sunAngle) * sw * 0.4;
    const celestialY = sh * 0.35 - Math.sin(sunAngle) * sh * 0.3;

    if (dayness > 0.12) {
      const sunAlpha = Math.min(1, (dayness - 0.12) * 3);
      // Outer corona
      g.circle(celestialX, celestialY, 40);
      g.fill({ color: 0xFFDD44, alpha: sunAlpha * 0.06 });
      // Mid corona
      g.circle(celestialX, celestialY, 26);
      g.fill({ color: 0xFFEE66, alpha: sunAlpha * 0.12 });
      // Inner glow
      g.circle(celestialX, celestialY, 16);
      g.fill({ color: 0xFFEE88, alpha: sunAlpha * 0.25 });
      // Sun body
      g.circle(celestialX, celestialY, 10);
      g.fill({ color: 0xFFFFA0, alpha: sunAlpha });
      // Sun surface detail (darker spots)
      g.circle(celestialX - 2, celestialY + 1, 2);
      g.fill({ color: 0xEEDD66, alpha: sunAlpha * 0.3 });
      g.circle(celestialX + 3, celestialY - 1, 1.5);
      g.fill({ color: 0xEEDD66, alpha: sunAlpha * 0.2 });
      // Corona rays (12 tapered triangles)
      for (let r = 0; r < 12; r++) {
        const angle = r * Math.PI / 6 + time * 0.12;
        const inner = 11;
        const outer = 20 + Math.sin(time * 2.5 + r * 1.3) * 5;
        const spread = 0.08 + Math.sin(time * 1.5 + r) * 0.03;
        g.moveTo(celestialX + Math.cos(angle - spread) * inner, celestialY + Math.sin(angle - spread) * inner);
        g.lineTo(celestialX + Math.cos(angle) * outer, celestialY + Math.sin(angle) * outer);
        g.lineTo(celestialX + Math.cos(angle + spread) * inner, celestialY + Math.sin(angle + spread) * inner);
        g.closePath();
        g.fill({ color: 0xFFEE66, alpha: sunAlpha * 0.25 });
      }
      // Lens flare (line of dots extending from sun toward center)
      if (sunAlpha > 0.5) {
        const flareAngle = Math.atan2(sh / 2 - celestialY, sw / 2 - celestialX);
        for (let i = 1; i <= 4; i++) {
          const fd = 30 + i * 25;
          const fx = celestialX + Math.cos(flareAngle) * fd;
          const fy = celestialY + Math.sin(flareAngle) * fd;
          const fr = 4 - i * 0.5;
          const fc = i % 2 === 0 ? 0xFFDD88 : 0xAABBFF;
          g.circle(fx, fy, fr);
          g.fill({ color: fc, alpha: sunAlpha * 0.08 });
        }
      }
    }

    // --- Moon with earthshine, crescent, and surface detail ---
    if (dayness < 0.45) {
      const moonX = sw * 0.5 - Math.cos(sunAngle) * sw * 0.4;
      const moonY = sh * 0.3 + Math.sin(sunAngle) * sh * 0.25;
      const moonAlpha = Math.min(1, (0.45 - dayness) * 3);
      const moonR = 10;
      // Moonlight glow (wide)
      g.circle(moonX, moonY, moonR * 3);
      g.fill({ color: 0xBBBBEE, alpha: moonAlpha * 0.06 });
      g.circle(moonX, moonY, moonR * 2);
      g.fill({ color: 0xCCCCFF, alpha: moonAlpha * 0.1 });
      // Moon body (full circle)
      g.circle(moonX, moonY, moonR);
      g.fill({ color: 0xEEEEFF, alpha: moonAlpha * 0.85 });
      // Crescent shadow (simulate phase with overlapping dark circle)
      const phaseOffset = Math.sin(time * 0.01) * 3 + 4;
      g.circle(moonX + phaseOffset, moonY - 1, moonR * 0.9);
      g.fill({ color: _lerpColor(0x060610, 0x1a1a30, dayness), alpha: moonAlpha * 0.7 });
      // Earthshine on dark side (faint illumination)
      g.circle(moonX + phaseOffset * 0.3, moonY, moonR * 0.85);
      g.fill({ color: 0x334466, alpha: moonAlpha * 0.08 });
      // Mare (dark patches on lit surface)
      g.ellipse(moonX - 3, moonY - 1, 3, 2);
      g.fill({ color: 0xBBBBCC, alpha: moonAlpha * 0.25 });
      g.circle(moonX - 1, moonY + 2, 2);
      g.fill({ color: 0xBBBBCC, alpha: moonAlpha * 0.2 });
      g.circle(moonX + 1, moonY - 3, 1.2);
      g.fill({ color: 0xBBBBCC, alpha: moonAlpha * 0.15 });
      // Craters (small circles)
      g.circle(moonX - 4, moonY + 1, 1);
      g.fill({ color: 0xAAAABB, alpha: moonAlpha * 0.35 });
      g.circle(moonX - 2, moonY - 2, 0.8);
      g.fill({ color: 0xAAAABB, alpha: moonAlpha * 0.3 });
      g.circle(moonX + 2, moonY + 3, 1.2);
      g.fill({ color: 0xAAAABB, alpha: moonAlpha * 0.25 });
      // Crater highlights (tiny bright dots on crater rims)
      g.circle(moonX - 4.5, moonY + 0.5, 0.4);
      g.fill({ color: 0xFFFFFF, alpha: moonAlpha * 0.3 });
    }
  }

  // ---------------------------------------------------------------------------
  // Parallax
  // ---------------------------------------------------------------------------

  private _drawParallax(state: TerrariaState, camera: TerrariaCamera, sw: number, sh: number): void {
    const g = this._parallaxGfx;
    g.clear();
    const dayness = Math.max(0, Math.min(1, Math.sin(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    const time = state.totalTime;

    // Helper: generate mountain ridge Y at x with harmonics
    const ridge = (x: number, seed: number, scale: number) =>
      Math.sin((x + seed) * 0.15) * 55 * scale +
      Math.sin((x + seed) * 0.37 + 1.7) * 30 * scale +
      Math.sin((x + seed) * 0.73 + 0.3) * 18 * scale +
      Math.sin((x + seed) * 1.51 + 2.1) * 8 * scale +
      Math.sin((x + seed) * 2.7 + 0.9) * 4 * scale;

    // ========= LAYER 1: Far mountain range (0.04x) =========
    {
      const ox = ((-camera.x * 0.04 * TS) % (sw * 3) + sw * 3) % (sw * 3) - sw;
      const by = sh * 0.48;
      for (let pass = 0; pass < 3; pass++) {
        const s = pass * 50 + 7;
        const hm = [1.0, 0.75, 0.55][pass];
        const al = [0.22, 0.18, 0.14][pass];
        const c = _lerpColor([0x1A2A3A, 0x152535, 0x101A25][pass], [0x2A4A3A, 0x354A35, 0x2A402A][pass], dayness);
        const pox = ox + pass * 60;
        g.moveTo(pox, by);
        for (let i = 0; i <= 80; i++) {
          g.lineTo(pox + (i / 80) * sw * 3, by - 35 * hm - ridge(i, s, hm));
        }
        g.lineTo(pox + sw * 3, sh); g.lineTo(pox, sh); g.closePath();
        g.fill({ color: c, alpha: al });
      }
      // Snow caps
      const snowC = _lerpColor(0x888899, 0xDDDDEE, dayness);
      const pox0 = ox;
      for (let i = 0; i <= 80; i++) {
        const fx = pox0 + (i / 80) * sw * 3;
        const pk = ridge(i, 7, 1.0);
        if (pk > 55) {
          const peakY = by - 35 - pk;
          g.moveTo(fx - 3, peakY + 5);
          g.lineTo(fx, peakY);
          g.lineTo(fx + 3, peakY + 5);
          g.closePath();
          g.fill({ color: snowC, alpha: dayness * 0.2 });
        }
      }
    }

    // ========= LAYER 2: Mid mountains with cliffs (0.1x) =========
    {
      const ox = ((-camera.x * 0.1 * TS) % (sw * 2.5) + sw * 2.5) % (sw * 2.5) - sw * 0.5;
      const by = sh * 0.56;
      const c = _lerpColor(0x1A3020, 0x3A5A30, dayness);
      const cliffC = _lerpColor(0x22281A, 0x4A5A38, dayness);
      g.moveTo(ox, by);
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const fx = ox + (i / steps) * sw * 2.5;
        const pk = ridge(i, 100, 0.85);
        g.lineTo(fx, by - 25 - pk);
      }
      g.lineTo(ox + sw * 2.5, sh); g.lineTo(ox, sh); g.closePath();
      g.fill({ color: c, alpha: 0.32 });
      // Cliff faces (vertical rock surfaces on steep slopes)
      for (let i = 1; i <= steps; i++) {
        const pk0 = ridge(i - 1, 100, 0.85);
        const pk1 = ridge(i, 100, 0.85);
        if (pk1 - pk0 > 8) { // steep upslope = cliff face
          const fx = ox + (i / steps) * sw * 2.5;
          const top = by - 25 - pk1;
          const bot = by - 25 - pk0;
          g.rect(fx - 2, top, 4, bot - top);
          g.fill({ color: cliffC, alpha: 0.2 });
        }
      }
      // Waterfall (on one steep cliff)
      const wfIdx = 18;
      const wfPk = ridge(wfIdx, 100, 0.85);
      if (wfPk > 40) {
        const wfX = ox + (wfIdx / steps) * sw * 2.5;
        const wfTop = by - 25 - wfPk;
        const wfBot = by - 5;
        // Water stream
        for (let wy = 0; wy < wfBot - wfTop; wy += 3) {
          const wobble = Math.sin(time * 3 + wy * 0.3) * 1;
          g.rect(wfX + wobble - 1, wfTop + wy, 2, 3);
          g.fill({ color: 0x88BBFF, alpha: 0.15 + Math.sin(time * 4 + wy) * 0.05 });
        }
        // Splash pool
        g.ellipse(wfX, wfBot, 6, 2);
        g.fill({ color: 0x88BBFF, alpha: 0.1 });
      }
    }

    // ========= LAYER 3: Near hills with varied trees and structures (0.18x) =========
    {
      const ox = ((-camera.x * 0.18 * TS) % (sw * 2) + sw * 2) % (sw * 2) - sw * 0.3;
      const by = sh * 0.64;
      const hillC = _lerpColor(0x14261A, 0x2A4A28, dayness);
      const treeC = _lerpColor(0x0A1A0E, 0x1A3A18, dayness);
      const treeCLight = _lerpColor(0x102A14, 0x2A5A2A, dayness);

      // Hill polygon
      const steps = 80;
      const hillAt = (i: number) => Math.sin((i + 200) * 0.12) * 35 + Math.sin((i + 200) * 0.31 + 1.5) * 20 + Math.sin((i + 200) * 0.7 + 0.8) * 10 + Math.sin((i + 200) * 1.4 + 0.3) * 5;
      g.moveTo(ox, by);
      for (let i = 0; i <= steps; i++) g.lineTo(ox + (i / steps) * sw * 2, by - 18 - hillAt(i));
      g.lineTo(ox + sw * 2, sh); g.lineTo(ox, sh); g.closePath();
      g.fill({ color: hillC, alpha: 0.4 });

      // Trees: mix of conifers, round oaks, and tall pines
      for (let i = 0; i < 60; i++) {
        const tx = ox + _pseudoRand(300 + i) * sw * 2;
        const ti = Math.floor((tx - ox) / (sw * 2) * steps);
        const hillY = by - 18 - hillAt(ti);
        const treeType = Math.floor(_pseudoRand(350 + i) * 3);
        const th = 6 + _pseudoRand(400 + i) * 16;
        const tw = 3 + _pseudoRand(500 + i) * 8;
        const tc = i % 3 === 0 ? treeCLight : treeC;

        // Trunk
        g.rect(tx - 0.8, hillY - th, 1.6, th);
        g.fill({ color: treeC, alpha: 0.45 });

        if (treeType === 0) {
          // Conifer (layered triangles)
          for (let layer = 0; layer < 3; layer++) {
            const ly = hillY - th + layer * th * 0.2;
            const lw = tw * (1 - layer * 0.2);
            g.moveTo(tx - lw / 2, ly + th * 0.25);
            g.lineTo(tx, ly);
            g.lineTo(tx + lw / 2, ly + th * 0.25);
            g.closePath();
            g.fill({ color: tc, alpha: 0.4 + layer * 0.05 });
          }
        } else if (treeType === 1) {
          // Round oak (ellipse canopy)
          g.ellipse(tx, hillY - th - tw * 0.3, tw * 0.6, tw * 0.5);
          g.fill({ color: tc, alpha: 0.42 });
          // Highlight
          g.ellipse(tx - tw * 0.15, hillY - th - tw * 0.4, tw * 0.25, tw * 0.2);
          g.fill({ color: treeCLight, alpha: 0.12 });
        } else {
          // Tall pine (narrow triangle)
          g.moveTo(tx - tw * 0.3, hillY);
          g.lineTo(tx, hillY - th - tw * 0.4);
          g.lineTo(tx + tw * 0.3, hillY);
          g.closePath();
          g.fill({ color: tc, alpha: 0.4 });
        }
      }

      // Distant village/ruins silhouette (one per screen width)
      const villageOx = ox + sw * 0.4;
      const vi = Math.floor((villageOx - ox) / (sw * 2) * steps);
      const villageY = by - 18 - hillAt(vi);
      const vAlpha = dayness < 0.3 ? 0.1 : 0.06;
      const vColor = _lerpColor(0x0A1510, 0x2A3528, dayness);
      // Small houses (rectangles with triangle roofs)
      for (let h = 0; h < 4; h++) {
        const hx = villageOx + h * 12 - 24;
        const hh = 6 + _pseudoRand(1500 + h) * 5;
        const hw2 = 4 + _pseudoRand(1600 + h) * 4;
        g.rect(hx - hw2 / 2, villageY - hh, hw2, hh);
        g.fill({ color: vColor, alpha: vAlpha });
        // Roof
        g.moveTo(hx - hw2 / 2 - 1, villageY - hh);
        g.lineTo(hx, villageY - hh - hw2 * 0.4);
        g.lineTo(hx + hw2 / 2 + 1, villageY - hh);
        g.closePath();
        g.fill({ color: vColor, alpha: vAlpha * 1.2 });
        // Window glow at night
        if (dayness < 0.3) {
          g.rect(hx - 1, villageY - hh + 2, 2, 2);
          g.fill({ color: 0xFFAA44, alpha: 0.15 });
        }
      }
      // Church spire
      g.rect(villageOx + 20, villageY - 16, 4, 16);
      g.fill({ color: vColor, alpha: vAlpha });
      g.moveTo(villageOx + 18, villageY - 16);
      g.lineTo(villageOx + 22, villageY - 24);
      g.lineTo(villageOx + 26, villageY - 16);
      g.closePath();
      g.fill({ color: vColor, alpha: vAlpha * 1.3 });

      // River/stream polygon (winding through hills)
      const riverColor = _lerpColor(0x223355, 0x4488BB, dayness);
      g.moveTo(ox + sw * 0.1, by);
      g.bezierCurveTo(ox + sw * 0.3, by - 8, ox + sw * 0.5, by - 3, ox + sw * 0.7, by);
      g.bezierCurveTo(ox + sw * 0.85, by + 3, ox + sw * 1.0, by - 5, ox + sw * 1.2, by);
      g.lineTo(ox + sw * 1.2, by + 3);
      g.bezierCurveTo(ox + sw * 1.0, by - 2, ox + sw * 0.85, by + 6, ox + sw * 0.7, by + 3);
      g.bezierCurveTo(ox + sw * 0.5, by, ox + sw * 0.3, by - 5, ox + sw * 0.1, by + 3);
      g.closePath();
      g.fill({ color: riverColor, alpha: 0.12 });

      // Flying birds (small V shapes)
      for (let i = 0; i < 5; i++) {
        const bx = ox + ((time * 15 + i * sw * 0.4) % (sw * 2));
        const birdY = by - 50 - _pseudoRand(700 + i) * 40 + Math.sin(time * 2 + i * 2) * 5;
        const wingPhase = Math.sin(time * 6 + i * 3) * 3;
        g.moveTo(bx - 4, birdY + wingPhase);
        g.lineTo(bx, birdY);
        g.lineTo(bx + 4, birdY + wingPhase);
        g.stroke({ color: _lerpColor(0x111111, 0x333333, dayness), width: 0.8, alpha: 0.3 });
      }
    }

    // ========= LAYER 4: Atmospheric haze =========
    {
      const hazeY = sh * 0.58;
      const hazeH = sh * 0.18;
      for (let i = 0; i < 6; i++) {
        const frac = i / 6;
        const hazeAlpha = dayness > 0.3 ? 0.06 - frac * 0.01 : 0.025;
        g.rect(0, hazeY + frac * hazeH, sw, hazeH / 6 + 2);
        g.fill({ color: dayness > 0.3 ? 0xCCDDEE : 0x223344, alpha: hazeAlpha });
      }
    }

    // ========= FOG BANK (low rolling fog patches) =========
    {
      const fogY = sh * 0.68;
      const fogAlpha = dayness < 0.3 ? 0.08 : 0.04;
      const fogOx = (time * 3) % (sw * 1.5);
      for (let i = 0; i < 8; i++) {
        const fx = ((i * sw * 0.2 - fogOx) % (sw * 1.5) + sw * 1.5) % (sw * 1.5) - sw * 0.2;
        const fw = 60 + _pseudoRand(1000 + i) * 100;
        const fh = 8 + _pseudoRand(1100 + i) * 12;
        g.ellipse(fx, fogY + Math.sin(time * 0.5 + i) * 3, fw, fh);
        g.fill({ color: 0xCCCCDD, alpha: fogAlpha * (0.5 + _pseudoRand(1200 + i) * 0.5) });
      }
    }

    // ========= CLOUDS (3 layers) =========
    {
      const cloudAlpha = dayness > 0.2 ? 0.28 : 0.1;
      const cloudColor = dayness > 0.2 ? 0xFFFFFF : 0x7788AA;
      const sunsetCloudColor = _lerpColor(cloudColor, 0xFF9966, Math.max(0, 1 - Math.abs(Math.sin(state.timeOfDay * Math.PI * 2 - Math.PI / 2)) * 3));

      // High wispy cirrus
      const co3 = (time * 14) % (sw * 3);
      for (let i = 0; i < 8; i++) {
        const s = 850 + i;
        const cx2 = ((_pseudoRand(s) * sw * 3 - co3) % (sw * 3) + sw * 3) % (sw * 3) - sw * 0.2;
        const cy2 = 10 + _pseudoRand(s + 1) * 35;
        const cw2 = 60 + _pseudoRand(s + 2) * 140;
        // Wisp as bezier curve
        g.moveTo(cx2 - cw2 / 2, cy2);
        g.bezierCurveTo(cx2 - cw2 * 0.2, cy2 - 3, cx2 + cw2 * 0.2, cy2 + 2, cx2 + cw2 / 2, cy2);
        g.bezierCurveTo(cx2 + cw2 * 0.2, cy2 + 4, cx2 - cw2 * 0.2, cy2 + 5, cx2 - cw2 / 2, cy2);
        g.closePath();
        g.fill({ color: cloudColor, alpha: cloudAlpha * 0.25 });
      }

      // Mid cumulus (fluffy multi-puff)
      const co1 = (time * 5) % (sw * 2.5);
      for (let i = 0; i < 12; i++) {
        const s = 600 + i;
        const cx2 = ((_pseudoRand(s) * sw * 2.5 - co1) % (sw * 2.5) + sw * 2.5) % (sw * 2.5) - sw * 0.3;
        const cy2 = 25 + _pseudoRand(s + 1) * sh * 0.15;
        const cw2 = 40 + _pseudoRand(s + 2) * 90;
        const ch2 = 10 + _pseudoRand(s + 3) * 12;
        const puffs = 3 + Math.floor(_pseudoRand(s + 4) * 3);
        // Shadow underneath
        g.ellipse(cx2, cy2 + ch2 * 0.4, cw2 * 0.8, ch2 * 0.3);
        g.fill({ color: 0x888899, alpha: cloudAlpha * 0.08 });
        // Puffs
        for (let p = 0; p < puffs; p++) {
          const pox = (p - puffs / 2) * cw2 * 0.28;
          const poy = _pseudoRand(s + 10 + p) * 4 - 2;
          const pw = cw2 * (0.35 + _pseudoRand(s + 20 + p) * 0.3);
          const ph2 = ch2 * (0.5 + _pseudoRand(s + 30 + p) * 0.5);
          g.ellipse(cx2 + pox, cy2 + poy, pw, ph2);
          g.fill({ color: sunsetCloudColor, alpha: cloudAlpha * (0.55 + _pseudoRand(s + 40 + p) * 0.45) });
        }
        // Top highlight
        g.ellipse(cx2 - cw2 * 0.1, cy2 - ch2 * 0.3, cw2 * 0.35, ch2 * 0.2);
        g.fill({ color: 0xFFFFFF, alpha: cloudAlpha * 0.12 });
      }
    }

    // ========= CASTLE SILHOUETTE (detailed with windows, bridge, walls) =========
    {
      const castleOx = ((-camera.x * 0.07 * TS) % (sw * 3) + sw * 3) % (sw * 3);
      const cx2 = castleOx + sw * 0.7;
      const cy2 = sh * 0.47;
      const ca = dayness < 0.3 ? 0.14 : 0.07;
      const cc = _lerpColor(0x080F18, 0x283830, dayness);
      const ccLit = _lerpColor(0x0A1520, 0x3A4540, dayness);

      // Curtain wall
      g.rect(cx2 - 35, cy2 - 8, 70, 8 + (sh - cy2)); g.fill({ color: cc, alpha: ca * 0.7 });
      // Wall battlements
      for (let b = -35; b <= 35; b += 5) {
        g.rect(cx2 + b, cy2 - 11, 3, 3); g.fill({ color: cc, alpha: ca });
      }
      // Main keep
      g.rect(cx2 - 10, cy2 - 30, 20, 30); g.fill({ color: cc, alpha: ca });
      g.rect(cx2 - 12, cy2 - 32, 24, 3); g.fill({ color: ccLit, alpha: ca * 0.8 });
      // Keep windows
      for (let wy2 = 0; wy2 < 3; wy2++) {
        for (let wx2 = 0; wx2 < 2; wx2++) {
          const winX = cx2 - 5 + wx2 * 10;
          const winY = cy2 - 26 + wy2 * 8;
          g.rect(winX, winY, 3, 4); g.fill({ color: dayness < 0.3 ? 0xFFAA44 : 0x000000, alpha: dayness < 0.3 ? 0.15 : ca * 0.5 });
        }
      }
      // Left tower (round = octagon)
      g.rect(cx2 - 22, cy2 - 38, 10, 38); g.fill({ color: cc, alpha: ca });
      g.moveTo(cx2 - 24, cy2 - 38); g.lineTo(cx2 - 17, cy2 - 48); g.lineTo(cx2 - 10, cy2 - 38);
      g.closePath(); g.fill({ color: cc, alpha: ca });
      // Right tower
      g.rect(cx2 + 12, cy2 - 38, 10, 38); g.fill({ color: cc, alpha: ca });
      g.moveTo(cx2 + 10, cy2 - 38); g.lineTo(cx2 + 17, cy2 - 48); g.lineTo(cx2 + 24, cy2 - 38);
      g.closePath(); g.fill({ color: cc, alpha: ca });
      // Gate arch
      g.moveTo(cx2 - 4, cy2); g.lineTo(cx2 - 4, cy2 - 6);
      g.quadraticCurveTo(cx2, cy2 - 10, cx2 + 4, cy2 - 6);
      g.lineTo(cx2 + 4, cy2); g.closePath(); g.fill({ color: 0x000000, alpha: ca });
      // Drawbridge
      g.moveTo(cx2 - 4, cy2); g.lineTo(cx2 - 6, cy2 + 4); g.lineTo(cx2 + 6, cy2 + 4);
      g.lineTo(cx2 + 4, cy2); g.closePath(); g.fill({ color: 0x5A3A1A, alpha: ca * 0.8 });
      // Flags on towers
      for (const fx of [cx2 - 17, cx2 + 17]) {
        const fw = Math.sin(time * 3.5 + fx) * 2;
        g.moveTo(fx, cy2 - 48); g.lineTo(fx, cy2 - 54);
        g.stroke({ color: cc, width: 0.8, alpha: ca });
        g.moveTo(fx, cy2 - 54); g.lineTo(fx + 5 + fw, cy2 - 52); g.lineTo(fx, cy2 - 50);
        g.closePath(); g.fill({ color: 0xCC2222, alpha: ca * 1.5 });
      }
      // Torch glow at gate (night)
      if (dayness < 0.3) {
        g.circle(cx2 - 6, cy2 - 5, 3); g.fill({ color: 0xFFAA44, alpha: 0.08 });
        g.circle(cx2 + 6, cy2 - 5, 3); g.fill({ color: 0xFFAA44, alpha: 0.08 });
      }
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

        // ---- SPECIAL TRANSPARENT BLOCK POLYGONS ----
        if (_drawSpecialBlock(gfx, bt, px, py, color, h, time, wx)) continue;

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

        // (Torch rendering handled by _drawSpecialBlock above)
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

    // Placement preview (ghost block) — always visible, color indicates state
    const hover = p.hoverTarget;
    if (hover && !mt) {
      const { sx: hsx, sy: hsy } = camera.worldToScreen(hover.wx, hover.wy + 1);
      if (hover.canPlace && hover.canReach && held && held.color) {
        // Valid placement: green ghost
        this._cursorGfx.rect(hsx + 1, hsy + 1, TS - 2, TS - 2);
        this._cursorGfx.fill({ color: held.color, alpha: 0.35 });
        this._cursorGfx.rect(hsx, hsy, TS, TS);
        this._cursorGfx.stroke({ color: 0x44FF44, width: 1, alpha: 0.6 });
      } else if (!hover.canReach) {
        // Out of reach: dim white dashed outline
        this._cursorGfx.rect(hsx, hsy, TS, TS);
        this._cursorGfx.stroke({ color: 0xFFFFFF, width: 0.8, alpha: 0.15 });
      } else {
        // In reach but can't place: red outline
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

// ---------------------------------------------------------------------------
// Special block polygon renderers (transparent/decorative blocks)
// Returns true if block was drawn (skip default rect renderer)
// ---------------------------------------------------------------------------

function _drawSpecialBlock(g: Graphics, bt: number, px: number, py: number, color: number, h: number, time: number, wx: number): boolean {
  const cx = px + TS / 2;
  const cy = py + TS / 2;

  // ---- TORCH / ENCHANTED TORCH ----
  if (bt === BlockType.TORCH || bt === BlockType.ENCHANTED_TORCH) {
    const enchanted = bt === BlockType.ENCHANTED_TORCH;
    const flameC = enchanted ? 0xAA55FF : 0xFFAA00;
    const innerC = enchanted ? 0xDDBBFF : 0xFFFF88;
    const f1 = Math.sin(time * 8 + wx * 3) * 1.5;
    const f2 = Math.sin(time * 10 + wx * 5 + 1) * 1;
    // Wall mount bracket
    g.rect(cx - 3, py + TS * 0.55, 6, 2);
    g.fill(0x555555);
    // Stick
    g.moveTo(cx - 1, py + TS * 0.3); g.lineTo(cx + 1, py + TS * 0.3);
    g.lineTo(cx + 1, py + TS); g.lineTo(cx - 1, py + TS); g.closePath();
    g.fill(0x8B6914);
    // Wood grain line
    g.moveTo(cx, py + TS * 0.4); g.lineTo(cx, py + TS * 0.9);
    g.stroke({ color: 0x6B4226, width: 0.5, alpha: 0.3 });
    // Outer flame (5-point organic shape)
    g.moveTo(cx - 3, py + TS * 0.35);
    g.quadraticCurveTo(cx - 3.5 + f2, py + TS * 0.15, cx - 1 + f1 * 0.3, py - 2 + f1);
    g.quadraticCurveTo(cx + f1 * 0.2, py - 3 + f1 * 0.7, cx + 1 - f2 * 0.3, py - 1 + f1 * 0.5);
    g.quadraticCurveTo(cx + 3.5 + f2, py + TS * 0.15, cx + 3, py + TS * 0.35);
    g.closePath();
    g.fill({ color: flameC, alpha: 0.75 });
    // Mid flame
    g.moveTo(cx - 1.5, py + TS * 0.3);
    g.quadraticCurveTo(cx + f1 * 0.15, py + TS * 0.05 + f1 * 0.3, cx + 1.5, py + TS * 0.3);
    g.closePath();
    g.fill({ color: innerC, alpha: 0.5 });
    // Hot core
    g.circle(cx + f1 * 0.1, py + TS * 0.22 + f1 * 0.2, 1.2);
    g.fill({ color: 0xFFFFCC, alpha: 0.7 });
    // Glow
    g.circle(cx, py + TS * 0.2, 6);
    g.fill({ color: flameC, alpha: 0.08 });
    return true;
  }

  // ---- RED FLOWER ----
  if (bt === BlockType.RED_FLOWER) {
    // Stem
    g.moveTo(cx, py + TS); g.quadraticCurveTo(cx - 1, py + TS * 0.55, cx, py + TS * 0.4);
    g.stroke({ color: 0x337722, width: 1.2 });
    // Leaf on stem
    g.moveTo(cx, py + TS * 0.65); g.quadraticCurveTo(cx + 3, py + TS * 0.55, cx + 1, py + TS * 0.7);
    g.fill({ color: 0x448833, alpha: 0.7 });
    // 5 petals (star pattern)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const pr = 3.5;
      const ppx = cx + Math.cos(a) * pr;
      const ppy = py + TS * 0.35 + Math.sin(a) * pr;
      g.ellipse(ppx, ppy, 2.2, 1.5);
      g.fill({ color: 0xDD3333, alpha: 0.85 });
    }
    // Center
    g.circle(cx, py + TS * 0.35, 1.5);
    g.fill(0xFFDD44);
    return true;
  }

  // ---- BLUE FLOWER ----
  if (bt === BlockType.BLUE_FLOWER) {
    // Stem
    g.moveTo(cx, py + TS); g.quadraticCurveTo(cx + 1, py + TS * 0.5, cx - 0.5, py + TS * 0.35);
    g.stroke({ color: 0x337722, width: 1.2 });
    // 6 petals
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const pr = 3;
      const ppx = cx - 0.5 + Math.cos(a) * pr;
      const ppy = py + TS * 0.3 + Math.sin(a) * pr;
      g.ellipse(ppx, ppy, 2, 1.3);
      g.fill({ color: 0x4488FF, alpha: 0.85 });
    }
    // Center
    g.circle(cx - 0.5, py + TS * 0.3, 1.2);
    g.fill(0xFFFFAA);
    return true;
  }

  // ---- MUSHROOM ----
  if (bt === BlockType.MUSHROOM) {
    // Stem
    g.moveTo(cx - 1.5, py + TS); g.lineTo(cx - 1, py + TS * 0.5);
    g.lineTo(cx + 1, py + TS * 0.5); g.lineTo(cx + 1.5, py + TS); g.closePath();
    g.fill(0xDDDDBB);
    // Cap (dome polygon)
    g.moveTo(cx - 5, py + TS * 0.52);
    g.quadraticCurveTo(cx - 5, py + TS * 0.2, cx - 2, py + TS * 0.15);
    g.quadraticCurveTo(cx, py + TS * 0.08, cx + 2, py + TS * 0.15);
    g.quadraticCurveTo(cx + 5, py + TS * 0.2, cx + 5, py + TS * 0.52);
    g.closePath();
    g.fill(0xCC8844);
    // Cap spots
    g.circle(cx - 1.5, py + TS * 0.28, 1); g.fill({ color: 0xFFDDAA, alpha: 0.5 });
    g.circle(cx + 2, py + TS * 0.32, 0.8); g.fill({ color: 0xFFDDAA, alpha: 0.4 });
    // Cap highlight
    g.ellipse(cx - 1, py + TS * 0.22, 2.5, 1);
    g.fill({ color: 0xFFFFFF, alpha: 0.1 });
    return true;
  }

  // ---- TALL GRASS ----
  if (bt === BlockType.TALL_GRASS) {
    const sway = Math.sin(time * 1.5 + wx * 0.6) * 1.5;
    // 4-5 grass blades of varying height
    for (let i = 0; i < 5; i++) {
      const bx = px + 1 + i * 3 + (h + i) % 2;
      const bh = 6 + ((h * (i + 1) * 7) % 6);
      const tipSway = sway * (0.5 + i * 0.15);
      const baseY = py + TS;
      g.moveTo(bx - 0.5, baseY);
      g.quadraticCurveTo(bx + tipSway * 0.4, baseY - bh * 0.5, bx + tipSway, baseY - bh);
      g.quadraticCurveTo(bx + tipSway * 0.4 + 1, baseY - bh * 0.5, bx + 1, baseY);
      g.closePath();
      const gc = i % 2 === 0 ? 0x5BAF50 : 0x4A9A42;
      g.fill({ color: gc, alpha: 0.75 });
    }
    return true;
  }

  // ---- CHEST ----
  if (bt === BlockType.CHEST) {
    const cw = TS * 0.8;
    const ch2 = TS * 0.6;
    const clx = cx - cw / 2;
    const cly = py + TS - ch2;
    // Body (front face)
    g.rect(clx, cly, cw, ch2);
    g.fill(0xB8860B);
    // Top edge (lid)
    g.rect(clx - 1, cly - 2, cw + 2, 3);
    g.fill(0xD4A030);
    // Lid top surface (lighter)
    g.rect(clx, cly - 4, cw, 3);
    g.fill(0xC49820);
    // Front panel lines
    g.rect(clx + 1, cly + 2, cw - 2, 1); g.fill({ color: 0x000000, alpha: 0.12 });
    g.rect(clx + 1, cly + ch2 - 3, cw - 2, 1); g.fill({ color: 0x000000, alpha: 0.12 });
    // Metal clasp (center)
    g.rect(cx - 2, cly, 4, ch2); g.fill({ color: 0x8B6914, alpha: 0.3 });
    // Lock
    g.rect(cx - 1.5, cly + ch2 * 0.3, 3, 3); g.fill(0xFFD700);
    g.rect(cx - 0.5, cly + ch2 * 0.3 + 1, 1, 1); g.fill(0x000000);
    // Highlight
    g.rect(clx + 1, cly - 3, cw * 0.4, 1); g.fill({ color: 0xFFFFFF, alpha: 0.15 });
    // Shadow
    g.rect(clx, cly + ch2, cw, 1); g.fill({ color: 0x000000, alpha: 0.2 });
    return true;
  }

  // ---- WOODEN DOOR ----
  if (bt === BlockType.WOODEN_DOOR) {
    const dw = TS * 0.5;
    const dlx = cx - dw / 2;
    // Door frame
    g.rect(dlx - 1, py, dw + 2, TS); g.fill(0x6B4226);
    // Door panels (4 panels)
    g.rect(dlx, py + 1, dw, TS * 0.45); g.fill(0x8B6914);
    g.rect(dlx, py + TS * 0.55, dw, TS * 0.43); g.fill(0x8B6914);
    // Panel insets
    g.rect(dlx + 1, py + 2, dw - 2, TS * 0.4); g.fill({ color: 0x7A5A10, alpha: 0.6 });
    g.rect(dlx + 1, py + TS * 0.57, dw - 2, TS * 0.38); g.fill({ color: 0x7A5A10, alpha: 0.6 });
    // Handle
    g.circle(dlx + dw - 2, cy, 1.2); g.fill(0xCCAA44);
    // Highlight
    g.rect(dlx, py, 1, TS); g.fill({ color: 0xFFFFFF, alpha: 0.08 });
    return true;
  }

  // ---- IRON DOOR ----
  if (bt === BlockType.IRON_DOOR) {
    const dw = TS * 0.5;
    const dlx = cx - dw / 2;
    // Frame
    g.rect(dlx - 1, py, dw + 2, TS); g.fill(0x666666);
    // Door face
    g.rect(dlx, py + 1, dw, TS - 2); g.fill(0x999999);
    // Rivets
    for (let ry = 0; ry < 3; ry++) {
      g.circle(dlx + 2, py + 3 + ry * 5, 0.8); g.fill(0xBBBBBB);
      g.circle(dlx + dw - 2, py + 3 + ry * 5, 0.8); g.fill(0xBBBBBB);
    }
    // Cross brace
    g.moveTo(dlx, py + 1); g.lineTo(dlx + dw, py + TS - 1);
    g.stroke({ color: 0x777777, width: 1, alpha: 0.3 });
    // Handle
    g.rect(dlx + dw - 3, cy - 1, 2, 3); g.fill(0xCCCCCC);
    // Highlight
    g.rect(dlx, py, 1, TS); g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    return true;
  }

  // ---- ROUND TABLE (workbench) ----
  if (bt === BlockType.ROUND_TABLE) {
    const tw = TS * 0.85;
    const tlx = cx - tw / 2;
    // Legs
    g.rect(tlx + 1, py + TS * 0.45, 2, TS * 0.55); g.fill(0x7A5A20);
    g.rect(tlx + tw - 3, py + TS * 0.45, 2, TS * 0.55); g.fill(0x7A5A20);
    // Cross brace between legs
    g.moveTo(tlx + 2, py + TS * 0.7); g.lineTo(tlx + tw - 2, py + TS * 0.7);
    g.stroke({ color: 0x6A4A18, width: 1 });
    // Table top (thick plank)
    g.rect(tlx - 1, py + TS * 0.3, tw + 2, 4); g.fill(0xA0785A);
    // Top surface
    g.rect(tlx, py + TS * 0.22, tw, 3); g.fill(0xB08868);
    // Woodgrain on top
    g.moveTo(tlx + 2, py + TS * 0.27); g.lineTo(tlx + tw - 2, py + TS * 0.27);
    g.stroke({ color: 0x8A6840, width: 0.5, alpha: 0.3 });
    // Item on table (small tool hint)
    g.rect(cx - 1, py + TS * 0.15, 2, 4); g.fill({ color: 0xCCAA44, alpha: 0.4 });
    // Shadow under table
    g.ellipse(cx, py + TS - 1, tw * 0.4, 1.5); g.fill({ color: 0x000000, alpha: 0.1 });
    return true;
  }

  // ---- FORGE ----
  if (bt === BlockType.FORGE) {
    // Stone body
    g.rect(px + 1, py + TS * 0.3, TS - 2, TS * 0.7); g.fill(0x666666);
    // Stone bricks
    g.rect(px + 1, py + TS * 0.3, (TS - 2) / 2, TS * 0.35); g.fill(0x5A5A5A);
    g.rect(px + TS / 2, py + TS * 0.65, (TS - 2) / 2, TS * 0.35); g.fill(0x5A5A5A);
    // Chimney
    g.rect(cx + 1, py, 4, TS * 0.35); g.fill(0x555555);
    // Fire opening (arch)
    g.moveTo(cx - 3, py + TS); g.lineTo(cx - 3, py + TS * 0.55);
    g.quadraticCurveTo(cx, py + TS * 0.4, cx + 3, py + TS * 0.55);
    g.lineTo(cx + 3, py + TS); g.closePath();
    g.fill(0x111111);
    // Fire inside
    const ff = Math.sin(time * 6 + wx * 2) * 1;
    g.moveTo(cx - 2, py + TS);
    g.quadraticCurveTo(cx + ff * 0.3, py + TS * 0.55 + ff, cx + 2, py + TS);
    g.closePath();
    g.fill({ color: 0xFF6600, alpha: 0.7 });
    g.circle(cx + ff * 0.2, py + TS * 0.75 + ff * 0.3, 1.2);
    g.fill({ color: 0xFFDD44, alpha: 0.5 });
    // Smoke from chimney
    if (Math.sin(time * 3 + wx) > 0) {
      g.circle(cx + 3 + Math.sin(time * 2) * 1.5, py - 2 + Math.sin(time * 1.5) * 1, 1.5);
      g.fill({ color: 0x888888, alpha: 0.15 });
    }
    return true;
  }

  // ---- BANNER ----
  if (bt === BlockType.BANNER) {
    const bw = TS * 0.45;
    const sway = Math.sin(time * 2 + wx * 0.8) * 1;
    // Pole
    g.rect(cx - 0.5, py, 1, TS); g.fill(0x8B6914);
    // Banner cloth (flowing polygon)
    g.moveTo(cx + 0.5, py + 2);
    g.lineTo(cx + bw + sway, py + 3);
    g.quadraticCurveTo(cx + bw + sway * 1.2, py + TS * 0.5, cx + bw * 0.8 + sway, py + TS * 0.8);
    g.lineTo(cx + bw * 0.3 + sway * 0.5, py + TS * 0.85);
    g.lineTo(cx + 0.5, py + TS * 0.7);
    g.closePath();
    g.fill(0xCC0000);
    // Heraldic cross
    g.rect(cx + bw * 0.35 + sway * 0.5, py + TS * 0.2, bw * 0.3, 1); g.fill({ color: 0xFFD700, alpha: 0.5 });
    g.rect(cx + bw * 0.45 + sway * 0.5, py + TS * 0.1, 1, TS * 0.3); g.fill({ color: 0xFFD700, alpha: 0.5 });
    return true;
  }

  // ---- THRONE ----
  if (bt === BlockType.THRONE) {
    // Seat
    g.rect(px + 2, py + TS * 0.55, TS - 4, TS * 0.45); g.fill(0x6A2A6A);
    // Back (tall)
    g.rect(px + 2, py, TS * 0.25, TS * 0.6); g.fill(0x7A3A7A);
    // Crown ornament on top
    g.moveTo(px + 2, py); g.lineTo(px + 4, py - 3); g.lineTo(px + 6, py);
    g.closePath(); g.fill(0xFFD700);
    // Cushion
    g.rect(px + 4, py + TS * 0.55, TS - 8, 3); g.fill(0xAA4444);
    // Armrest
    g.rect(px + TS - 4, py + TS * 0.4, 2, TS * 0.2); g.fill(0x6A2A6A);
    // Gold trim
    g.rect(px + 2, py + TS * 0.54, TS - 4, 1); g.fill({ color: 0xFFD700, alpha: 0.4 });
    return true;
  }

  // ---- GRAIL PEDESTAL ----
  if (bt === BlockType.GRAIL_PEDESTAL) {
    // Base
    g.rect(px + 2, py + TS * 0.7, TS - 4, TS * 0.3); g.fill(0xCCBB88);
    // Column
    g.rect(cx - 2, py + TS * 0.3, 4, TS * 0.4); g.fill(0xDDCCA0);
    // Top plate
    g.rect(px + 3, py + TS * 0.25, TS - 6, 2); g.fill(0xEEDDB0);
    // Glowing grail/item on top
    const glow = 0.5 + Math.sin(time * 2) * 0.3;
    g.circle(cx, py + TS * 0.15, 4); g.fill({ color: 0xFFD700, alpha: glow * 0.2 });
    // Cup shape
    g.moveTo(cx - 2.5, py + TS * 0.22); g.lineTo(cx - 1.5, py + TS * 0.05);
    g.lineTo(cx + 1.5, py + TS * 0.05); g.lineTo(cx + 2.5, py + TS * 0.22);
    g.lineTo(cx + 1, py + TS * 0.24); g.lineTo(cx - 1, py + TS * 0.24); g.closePath();
    g.fill(0xFFD700);
    // Cup highlight
    g.circle(cx - 0.5, py + TS * 0.12, 0.8); g.fill({ color: 0xFFFFFF, alpha: 0.4 });
    return true;
  }

  // ---- LEAVES (all types) ----
  if (bt === BlockType.OAK_LEAVES || bt === BlockType.WILLOW_LEAVES || bt === BlockType.DARK_OAK_LEAVES) {
    // Draw as organic cluster of overlapping ellipses
    g.rect(px, py, TS, TS); g.fill(color);
    // Leaf cluster detail
    for (let i = 0; i < 4; i++) {
      const lx2 = px + ((h * (i + 1) * 11) % (TS - 4)) + 2;
      const ly2 = py + ((h * (i + 1) * 13) % (TS - 4)) + 2;
      g.ellipse(lx2, ly2, 2.5, 1.8);
      g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    }
    // Darker veins
    g.moveTo(px + 2, py + TS / 2); g.lineTo(px + TS - 2, py + TS / 2 + 1);
    g.stroke({ color: 0x000000, width: 0.5, alpha: 0.08 });
    // Small gap holes (transparency effect)
    if (h % 5 === 0) {
      g.rect(px + (h % (TS - 2)), py + ((h * 3) % (TS - 2)), 2, 2);
      g.fill({ color: 0x000000, alpha: 0.15 });
    }
    return false; // still apply bevel edges
  }

  return false; // not a special block, use default renderer
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
