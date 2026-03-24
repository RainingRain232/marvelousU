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
  private _particleGfx = new Graphics();   // ambient particles (fireflies, dust, rain)
  private _screenFx = new Graphics();     // damage flash, underwater tint, weather
  private _dmgNumbers = new Graphics();    // floating damage numbers

  // Chunk graphics cache
  private _chunkBlockGfx = new Map<number, Graphics>();
  private _chunkWallGfx = new Map<number, Graphics>();

  // Screen FX state
  private _damageFlash = 0;
  private _healFlash = 0;
  private _prevHp = -1;

  // Ambient particles
  private _particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number; type: 'firefly' | 'dust' | 'rain' | 'leaf' | 'butterfly' | 'spore' | 'ember' }[] = [];
  private _particleTimer = 0;

  // Floating damage/heal numbers
  private _floatingTexts: { x: number; y: number; text: string; color: number; life: number }[] = [];

  init(): void {
    this.worldLayer.addChild(this._skyGfx);
    this.worldLayer.addChild(this._parallaxGfx);
    this.worldLayer.addChild(this._wallLayer);
    this.worldLayer.addChild(this._blockLayer);
    this.worldLayer.addChild(this._entityLayer);
    this.worldLayer.addChild(this._lightOverlay);
    this.worldLayer.addChild(this._particleGfx);
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

    // Parallax background layers (mountains, castles, trees, clouds)
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

    // Ambient particles
    this._updateAndDrawParticles(state, camera, sw, sh);

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

        // Solid opaque blocks are rendered here (foreground layer)

        let color = def.color;

        // Depth-based tinting: blocks get slightly bluer/darker underground
        if (y < TB.SURFACE_Y && !def.liquid && def.lightEmit === 0) {
          const depthFrac = Math.min(1, (TB.SURFACE_Y - y) / (TB.SURFACE_Y - TB.UNDERWORLD_Y));
          const depthTint = depthFrac * 0.25;
          const cr = ((color >> 16) & 0xFF);
          const cg = ((color >> 8) & 0xFF);
          const cb = (color & 0xFF);
          const nr = Math.floor(cr * (1 - depthTint));
          const ng = Math.floor(cg * (1 - depthTint * 0.7));
          const nb = Math.min(255, Math.floor(cb * (1 - depthTint * 0.3) + depthTint * 15));
          color = (nr << 16) | (ng << 8) | nb;
        }

        // ---- LIQUID RENDERING (water/lava) ----
        if (def.liquid) {
          const isLava = bt === BlockType.LAVA;
          const aboveIsAir = y < WH - 1 && chunk.getBlock(lx, y + 1) === BlockType.AIR;
          const leftIsAir = lx > 0 ? chunk.getBlock(lx - 1, y) === BlockType.AIR : false;
          const rightIsAir = lx < CW - 1 ? chunk.getBlock(lx + 1, y) === BlockType.AIR : false;
          const wave1 = Math.sin(wx * 0.4 + time * 2.5) * 2;
          const wave2 = Math.sin(wx * 0.9 + time * 1.8) * 1;
          const waveOffset = aboveIsAir ? wave1 + wave2 : 0;

          if (!isLava) {
            // Water depth: count water blocks above for deeper color
            let waterDepth = 0;
            for (let dy = 1; dy <= 8; dy++) {
              if (y + dy < WH && chunk.getBlock(lx, y + dy) === BlockType.WATER) waterDepth++;
              else break;
            }
            const depthT = Math.min(1, waterDepth / 6);

            // Base water body with depth-based color
            const baseR = Math.floor(0x22 + (1 - depthT) * 0x33);
            const baseG = Math.floor(0x66 + (1 - depthT) * 0x33);
            const baseB = Math.floor(0xAA + (1 - depthT) * 0x22);
            const waterColor = (baseR << 16) | (baseG << 8) | baseB;
            gfx.rect(px, py + waveOffset, TS, TS - waveOffset);
            gfx.fill({ color: waterColor, alpha: 0.55 + depthT * 0.15 });

            // Surface effects (top of water)
            if (aboveIsAir) {
              // Foam/froth line at surface
              gfx.rect(px, py + waveOffset, TS, 1.5);
              gfx.fill({ color: 0xCCDDFF, alpha: 0.35 });
              // Ripple highlights
              const rip1 = Math.sin(time * 2.2 + wx * 0.7) * 0.5 + 0.5;
              const rip2 = Math.sin(time * 3.1 + wx * 1.3 + 2) * 0.5 + 0.5;
              gfx.rect(px + rip1 * (TS - 4), py + waveOffset + 1, 3, 0.8);
              gfx.fill({ color: 0xFFFFFF, alpha: 0.18 });
              gfx.rect(px + rip2 * (TS - 3) + 1, py + waveOffset + 2.5, 2, 0.6);
              gfx.fill({ color: 0xFFFFFF, alpha: 0.12 });
              // Reflection shimmer (larger, animated)
              const shimPhase = Math.sin(time * 1.5 + wx * 0.3);
              if (shimPhase > 0.3) {
                const shimAlpha = (shimPhase - 0.3) * 0.3;
                gfx.rect(px + 2, py + waveOffset + 0.5, TS - 4, 1);
                gfx.fill({ color: 0xFFFFFF, alpha: shimAlpha });
              }
            }
            // Bottom darkening
            gfx.rect(px, py + TS - 3, TS, 3);
            gfx.fill({ color: 0x001133, alpha: 0.18 + depthT * 0.08 });
            // Caustic light patterns (animated)
            if (waterDepth < 4) {
              const cx1 = px + ((Math.floor(Math.sin(time * 1.8 + wx * 0.5) * 4) + TS / 2) % (TS - 2));
              const cy1 = py + ((Math.floor(Math.cos(time * 1.3 + y * 0.7) * 3) + TS / 2) % (TS - 2));
              gfx.moveTo(cx1, cy1);
              gfx.lineTo(cx1 + 3, cy1 + 1);
              gfx.lineTo(cx1 + 1, cy1 + 3);
              gfx.closePath();
              gfx.fill({ color: 0x88CCFF, alpha: 0.08 });
            }
            // Edge foam where water meets solid blocks on sides
            if (leftIsAir || rightIsAir) {
              const edgeX = leftIsAir ? px : px + TS - 1;
              for (let ey = 0; ey < TS; ey += 3) {
                const bubble = Math.sin(time * 3 + y * 2 + ey) * 0.5 + 0.5;
                if (bubble > 0.4) {
                  gfx.circle(edgeX + (leftIsAir ? -1 : 1), py + ey + 1, 0.6);
                  gfx.fill({ color: 0xDDEEFF, alpha: 0.2 });
                }
              }
            }
          } else {
            // Lava base with molten gradient
            gfx.rect(px, py + waveOffset, TS, TS - waveOffset);
            gfx.fill({ color, alpha: 0.9 });
            // Molten core (brighter center)
            gfx.rect(px + 2, py + waveOffset + 2, TS - 4, TS - waveOffset - 4);
            gfx.fill({ color: 0xFF6600, alpha: 0.2 + Math.sin(time * 2 + wx * 0.5) * 0.1 });
            // Surface crust (dark patches that float)
            if (aboveIsAir) {
              gfx.rect(px, py + waveOffset, TS, 2);
              gfx.fill({ color: 0xFFAA00, alpha: 0.35 });
              // Crusted spots
              const crust1 = (h * 3 + Math.floor(time * 0.5)) % (TS - 4);
              const crust2 = (h * 7 + Math.floor(time * 0.3)) % (TS - 3);
              gfx.rect(px + crust1, py + waveOffset, 3, 1.5);
              gfx.fill({ color: 0x442200, alpha: 0.3 });
              gfx.rect(px + crust2 + 1, py + waveOffset + 0.5, 2, 1);
              gfx.fill({ color: 0x331100, alpha: 0.25 });
            }
            // Bubbles (multiple, animated)
            for (let bi = 0; bi < 2; bi++) {
              const bubPhase = Math.sin(time * (3 + bi) + wx * 1.7 + y * 0.3 + bi * 2);
              if (aboveIsAir && bubPhase > 0.5) {
                const bx = px + 2 + ((h + bi * 5) % (TS - 4));
                const bSize = 1 + (bubPhase - 0.5) * 2;
                gfx.circle(bx, py + waveOffset + 1 + bi, bSize);
                gfx.fill({ color: 0xFFDD44, alpha: 0.35 });
                // Bubble highlight
                gfx.circle(bx - 0.3, py + waveOffset + 0.5 + bi, bSize * 0.3);
                gfx.fill({ color: 0xFFFFAA, alpha: 0.25 });
              }
            }
            // Heat distortion glow
            gfx.circle(px + TS / 2, py + TS / 2, TS * 0.7);
            gfx.fill({ color: 0xFF4400, alpha: 0.06 + Math.sin(time * 1.5 + wx) * 0.03 });
          }
          continue;
        }

        // ---- SPECIAL TRANSPARENT BLOCK POLYGONS ----
        if (_drawSpecialBlock(gfx, bt, px, py, color, h, time, wx)) continue;

        // ---- SOLID BLOCK RENDERING ----
        gfx.rect(px, py, TS, TS);
        gfx.fill(color);

        // 3D bevel edges (only where block faces air/transparent — smart connectivity)
        if (def.solid && !def.transparent) {
          const topAir = y < WH - 1 && (chunk.getBlock(lx, y + 1) === BlockType.AIR || (BLOCK_DEFS[chunk.getBlock(lx, y + 1)]?.transparent ?? false));
          const botAir = y > 0 && (chunk.getBlock(lx, y - 1) === BlockType.AIR || (BLOCK_DEFS[chunk.getBlock(lx, y - 1)]?.transparent ?? false));
          const leftAir = lx > 0 && (chunk.getBlock(lx - 1, y) === BlockType.AIR || (BLOCK_DEFS[chunk.getBlock(lx - 1, y)]?.transparent ?? false));
          const rightAir = lx < CW - 1 && (chunk.getBlock(lx + 1, y) === BlockType.AIR || (BLOCK_DEFS[chunk.getBlock(lx + 1, y)]?.transparent ?? false));
          // Top highlight (only if air above)
          if (topAir) {
            gfx.rect(px, py, TS, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.15 });
          }
          // Left highlight
          if (leftAir) {
            gfx.rect(px, py, 1, TS);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.09 });
          }
          // Bottom shadow (only if air below)
          if (botAir) {
            gfx.rect(px, py + TS - 1, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.22 });
          }
          // Right shadow
          if (rightAir) {
            gfx.rect(px + TS - 1, py, 1, TS);
            gfx.fill({ color: 0x000000, alpha: 0.12 });
          }
          // Inner ambient occlusion (darken corners that touch air on two sides)
          if (topAir && leftAir) {
            gfx.rect(px, py, 3, 3);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.06 });
          }
          if (botAir && rightAir) {
            gfx.rect(px + TS - 3, py + TS - 3, 3, 3);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
        }

        // ---- PER-BLOCK-TYPE TEXTURE PATTERNS ----
        if (bt === BlockType.STONE) {
          // Organic crack network (branching cracks)
          const crackSeed = (h * 7 + 3) & 0xFF;
          for (let i = 0; i < 3; i++) {
            const cx1 = px + ((crackSeed + i * 37) % (TS - 4)) + 2;
            const cy1 = py + ((crackSeed * 3 + i * 53) % (TS - 4)) + 2;
            const dx1 = ((crackSeed + i * 11) % 5) - 2;
            const dy1 = ((crackSeed + i * 7) % 4) - 1;
            gfx.moveTo(cx1, cy1);
            gfx.lineTo(cx1 + dx1 + 2, cy1 + dy1 + 1.5);
            gfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
            // Branch
            if (i === 0) {
              gfx.moveTo(cx1 + dx1 + 1, cy1 + dy1 + 1);
              gfx.lineTo(cx1 + dx1 + 3, cy1 + dy1 + 3);
              gfx.stroke({ color: 0x000000, width: 0.4, alpha: 0.07 });
            }
          }
          // Mineral speckles (varied sizes and colors)
          for (let i = 0; i < 4; i++) {
            const sx2 = px + ((h * (i + 2) * 11) % (TS - 2));
            const sy2 = py + ((h * (i + 3) * 7) % (TS - 2));
            const spColor = (i % 3 === 0) ? 0xFFFFFF : (i % 3 === 1) ? 0x999999 : 0xAAAAAA;
            gfx.rect(sx2, sy2, 1 + (i % 2), 1);
            gfx.fill({ color: spColor, alpha: 0.05 + (i % 2) * 0.02 });
          }
          // Subtle gradient variation (top lighter)
          gfx.rect(px, py, TS, 2);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.02 });
        } else if (bt === BlockType.DIRT) {
          // Dirt texture: pebbles, root fragments, organic matter
          for (let i = 0; i < 5; i++) {
            const dx = (h * (i + 1) * 13) % (TS - 2);
            const dy = (h * (i + 1) * 17) % (TS - 2);
            if (i < 2) {
              // Pebbles (small rounded)
              gfx.ellipse(px + dx + 0.5, py + dy + 0.5, 1 + (h + i) % 2, 0.8);
              gfx.fill({ color: 0x888877, alpha: 0.1 });
            } else if (i < 4) {
              // Dark organic spots
              gfx.rect(px + dx, py + dy, 1, 1);
              gfx.fill({ color: 0x3A2510, alpha: 0.1 });
            } else {
              // Light clay speck
              gfx.rect(px + dx, py + dy, 1, 1);
              gfx.fill({ color: 0xBB9966, alpha: 0.06 });
            }
          }
          // Root fragment (rare)
          if (h % 11 === 0) {
            const rx = px + (h % (TS - 4)) + 2;
            const ry = py + ((h * 5) % (TS - 4)) + 2;
            gfx.moveTo(rx, ry);
            gfx.quadraticCurveTo(rx + 2, ry + 1, rx + 4, ry - 0.5);
            gfx.stroke({ color: 0x5A3A1A, width: 0.6, alpha: 0.12 });
          }
        } else if (bt === BlockType.GRAVEL) {
          // Gravel: many small pebbles of varying shades
          for (let i = 0; i < 7; i++) {
            const gx = px + ((h * (i + 1) * 11) % (TS - 3)) + 1;
            const gy = py + ((h * (i + 1) * 13) % (TS - 3)) + 1;
            const gs = 1 + (h + i) % 2;
            const gColors = [0xB0B0B0, 0x8A8A8A, 0x7A7A7A, 0xA0A0A0, 0x959595];
            gfx.ellipse(gx, gy, gs, gs * 0.7);
            gfx.fill({ color: gColors[i % gColors.length], alpha: 0.2 });
          }
          // Pebble highlights
          if (h % 3 === 0) {
            const hx = px + (h % (TS - 2)) + 1;
            const hy = py + ((h * 3) % (TS - 2)) + 1;
            gfx.ellipse(hx, hy, 1, 0.5);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.06 });
          }
        } else if (bt === BlockType.CLAY) {
          // Clay: smooth with subtle cracks and color bands
          gfx.rect(px, py, TS, 3);
          gfx.fill({ color: 0xC09070, alpha: 0.08 });
          gfx.rect(px, py + 6, TS, 3);
          gfx.fill({ color: 0x906050, alpha: 0.06 });
          // Fine cracks
          if (h % 5 < 2) {
            const crx = px + (h % (TS - 3)) + 1;
            const cry = py + ((h * 5) % (TS - 2));
            gfx.moveTo(crx, cry);
            gfx.lineTo(crx + 2, cry + 3);
            gfx.stroke({ color: 0x000000, width: 0.4, alpha: 0.08 });
          }
        } else if (bt === BlockType.MUD) {
          // Mud: wet sheen and bubble holes
          gfx.rect(px, py, TS, 1);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.04 });
          for (let i = 0; i < 3; i++) {
            const mx = px + ((h * (i + 2) * 7) % (TS - 2));
            const my = py + ((h * (i + 3) * 11) % (TS - 2));
            gfx.circle(mx, my, 0.8);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
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
        } else if (bt === BlockType.PLANKS) {
          // Planks: individual plank lines with nails
          for (let gy = 0; gy < TS; gy += 4) {
            gfx.rect(px, py + gy, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.1 });
            // Plank grain within each plank
            const grainY = py + gy + 2;
            const wv = Math.sin((gy + h) * 0.6) * 0.8;
            gfx.moveTo(px + wv, grainY);
            gfx.lineTo(px + TS + wv, grainY);
            gfx.stroke({ color: 0x000000, width: 0.3, alpha: 0.06 });
          }
          // Nail heads
          if (h % 4 < 2) {
            const nx = px + (h % (TS - 2)) + 1;
            const ny = py + ((h * 5) % (TS - 2)) + 1;
            gfx.circle(nx, ny, 0.6);
            gfx.fill({ color: 0x888888, alpha: 0.15 });
          }
        } else if (bt === BlockType.OAK_LOG) {
          // Oak: vertical bark with rough edges
          for (let gx = 2; gx < TS; gx += 3) {
            const wv = Math.sin(gx * 0.7 + h * 0.4) * 0.8;
            gfx.moveTo(px + gx, py + wv);
            gfx.lineTo(px + gx, py + TS + wv);
            gfx.stroke({ color: 0x000000, width: 0.6, alpha: 0.1 });
          }
          // Bark texture ridges
          for (let i = 0; i < 3; i++) {
            const rx = px + ((h * (i + 1) * 7) % (TS - 2));
            const ry = py + ((h * (i + 2) * 5) % (TS - 4)) + 2;
            gfx.moveTo(rx, ry);
            gfx.quadraticCurveTo(rx + 1, ry + 2, rx - 0.5, ry + 4);
            gfx.stroke({ color: 0x4A2A10, width: 0.7, alpha: 0.1 });
          }
          // Knot hole
          if (h % 8 === 0) {
            gfx.circle(px + (h % (TS - 4)) + 2, py + ((h * 3) % (TS - 4)) + 2, 1.5);
            gfx.fill({ color: 0x3A1A08, alpha: 0.12 });
            gfx.circle(px + (h % (TS - 4)) + 2, py + ((h * 3) % (TS - 4)) + 2, 0.6);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
        } else if (bt === BlockType.WILLOW_LOG) {
          // Willow: smooth, lighter bark with peeling strips
          for (let gy = 2; gy < TS; gy += 4) {
            const wv = Math.sin(gy * 0.5 + h * 0.2) * 1.2;
            gfx.moveTo(px + wv, py + gy);
            gfx.lineTo(px + TS + wv, py + gy);
            gfx.stroke({ color: 0x000000, width: 0.4, alpha: 0.08 });
          }
          // Peeling bark strip (lighter color hanging)
          if (h % 6 < 2) {
            const sx2 = px + (h % (TS - 3)) + 1;
            gfx.moveTo(sx2, py);
            gfx.quadraticCurveTo(sx2 + 1.5, py + TS * 0.5, sx2 + 0.5, py + TS);
            gfx.stroke({ color: 0x7A6A50, width: 1, alpha: 0.1 });
          }
          // Lichen patches
          if (h % 9 === 0) {
            gfx.ellipse(px + (h % (TS - 3)) + 1, py + ((h * 3) % (TS - 3)) + 1, 2, 1.5);
            gfx.fill({ color: 0x6A8A5A, alpha: 0.1 });
          }
        } else if (bt === BlockType.DARK_OAK_LOG) {
          // Dark oak: thick, deeply furrowed bark
          for (let gx = 1; gx < TS; gx += 2) {
            const wv1 = Math.sin(gx * 1.2 + h * 0.5) * 0.5;
            const wv2 = Math.sin(gx * 0.6 + h * 0.3 + 1) * 0.3;
            gfx.moveTo(px + gx + wv1, py);
            gfx.bezierCurveTo(px + gx + wv2, py + TS * 0.3, px + gx + wv1, py + TS * 0.7, px + gx + wv2, py + TS);
            gfx.stroke({ color: 0x000000, width: 0.7, alpha: 0.12 });
          }
          // Deep furrows
          for (let i = 0; i < 2; i++) {
            const fx = px + ((h + i * 7) % (TS - 2));
            gfx.rect(fx, py, 1.5, TS);
            gfx.fill({ color: 0x1A0A04, alpha: 0.08 });
          }
          // Shelf fungus (rare)
          if (h % 11 === 0) {
            const fy = py + ((h * 3) % (TS - 4)) + 2;
            gfx.moveTo(px + TS, fy);
            gfx.quadraticCurveTo(px + TS + 2, fy + 1, px + TS + 1, fy + 3);
            gfx.lineTo(px + TS, fy + 3);
            gfx.closePath();
            gfx.fill({ color: 0x8A6A4A, alpha: 0.15 });
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
        } else if (bt === BlockType.SNOW) {
          // Snow: crystalline sparkles and subtle blue shadows
          for (let si = 0; si < 2; si++) {
            if (Math.sin(time * (2 + si * 0.7) + wx * 3 + y * 2 + si * 1.5) > 0.7) {
              const spx = px + ((h + si * 5) % (TS - 2)) + 1;
              const spy = py + (((h * 3 + si * 7)) % (TS - 2)) + 1;
              // Cross-shaped sparkle
              gfx.moveTo(spx - 1.2, spy); gfx.lineTo(spx + 1.2, spy);
              gfx.stroke({ color: 0xFFFFFF, width: 0.6, alpha: 0.35 });
              gfx.moveTo(spx, spy - 1.2); gfx.lineTo(spx, spy + 1.2);
              gfx.stroke({ color: 0xFFFFFF, width: 0.6, alpha: 0.35 });
            }
          }
          // Subtle blue shadow on lower half
          gfx.rect(px, py + TS * 0.6, TS, TS * 0.4);
          gfx.fill({ color: 0x8888CC, alpha: 0.04 });
        } else if (bt === BlockType.ICE) {
          // Ice: refractive lines, deep blue tint, cracks
          // Refractive diagonal lines
          for (let i = 0; i < 3; i++) {
            const ix = px + ((h + i * 3) % (TS - 1));
            gfx.moveTo(ix, py);
            gfx.lineTo(ix + 4, py + TS);
            gfx.stroke({ color: 0xBBDDFF, width: 0.5, alpha: 0.12 });
          }
          // Inner blue depth
          gfx.rect(px + 2, py + 2, TS - 4, TS - 4);
          gfx.fill({ color: 0x4488CC, alpha: 0.06 });
          // Sparkle
          if (Math.sin(time * 2.5 + wx * 3 + y * 2) > 0.75) {
            const spx = px + (h % (TS - 2)) + 1;
            const spy = py + ((h * 3) % (TS - 2)) + 1;
            gfx.circle(spx, spy, 1);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.4 });
          }
          // Air bubble trapped inside
          if (h % 7 === 0) {
            const bx = px + (h % (TS - 4)) + 2;
            const by = py + ((h * 5) % (TS - 4)) + 2;
            gfx.ellipse(bx, by, 1.5, 1);
            gfx.fill({ color: 0xDDEEFF, alpha: 0.12 });
            gfx.ellipse(bx - 0.3, by - 0.3, 0.5, 0.3);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.15 });
          }
        } else if (bt === BlockType.HOLY_STONE) {
          // Holy stone: warm golden glow, sacred patterns
          const holyPulse = Math.sin(time * 1.5 + wx * 0.5 + y * 0.3) * 0.5 + 0.5;
          // Sacred circle pattern
          gfx.circle(px + TS / 2, py + TS / 2, TS * 0.35);
          gfx.stroke({ color: 0xFFDD88, width: 0.6, alpha: 0.08 + holyPulse * 0.04 });
          // Cross mark
          gfx.moveTo(px + TS * 0.3, py + TS * 0.5);
          gfx.lineTo(px + TS * 0.7, py + TS * 0.5);
          gfx.moveTo(px + TS * 0.5, py + TS * 0.3);
          gfx.lineTo(px + TS * 0.5, py + TS * 0.7);
          gfx.stroke({ color: 0xFFEEAA, width: 0.5, alpha: 0.1 + holyPulse * 0.05 });
          // Golden speckles
          for (let i = 0; i < 3; i++) {
            const sx2 = px + ((h * (i + 1) * 11) % (TS - 2));
            const sy2 = py + ((h * (i + 1) * 7) % (TS - 2));
            gfx.rect(sx2, sy2, 1, 1);
            gfx.fill({ color: 0xFFDD88, alpha: 0.08 });
          }
        } else if (bt === BlockType.ENCHANTED_STONE) {
          // Enchanted stone: purple arcane runes, pulsing energy
          const enchPulse = Math.sin(time * 2 + wx * 0.8 + y * 0.5) * 0.5 + 0.5;
          // Arcane rune lines
          const rx = px + (h % (TS - 4)) + 2;
          const ry = py + ((h * 3) % (TS - 4)) + 2;
          gfx.moveTo(rx, ry);
          gfx.lineTo(rx + 3, ry - 2);
          gfx.lineTo(rx + 5, ry + 1);
          gfx.lineTo(rx + 2, ry + 3);
          gfx.closePath();
          gfx.stroke({ color: 0xAA66FF, width: 0.7, alpha: 0.12 + enchPulse * 0.08 });
          // Energy vein
          gfx.moveTo(px + 1, py + (h % TS));
          gfx.bezierCurveTo(px + TS * 0.3, py + ((h * 5) % TS), px + TS * 0.7, py + ((h * 7) % TS), px + TS - 1, py + ((h * 11) % TS));
          gfx.stroke({ color: 0x8844DD, width: 0.5, alpha: 0.1 + enchPulse * 0.06 });
          // Sparkle
          if (enchPulse > 0.7) {
            gfx.circle(px + (h % (TS - 2)) + 1, py + ((h * 3) % (TS - 2)) + 1, 1);
            gfx.fill({ color: 0xCC88FF, alpha: (enchPulse - 0.7) * 0.6 });
          }
        } else if (bt === BlockType.MOSS_STONE) {
          // Moss stone: stone base with green moss patches
          // Stone cracks
          const cx1 = px + ((h + 37) % (TS - 4)) + 2;
          const cy1 = py + ((h * 3 + 53) % (TS - 4)) + 2;
          gfx.moveTo(cx1, cy1);
          gfx.lineTo(cx1 + 3, cy1 + 2);
          gfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.1 });
          // Moss patches (green splotches)
          for (let i = 0; i < 3; i++) {
            const mx = px + ((h * (i + 2) * 7) % (TS - 3)) + 1;
            const my = py + ((h * (i + 3) * 11) % (TS - 3)) + 1;
            const mSize = 1.5 + (h + i) % 2;
            gfx.ellipse(mx, my, mSize, mSize * 0.7);
            gfx.fill({ color: 0x3A7A2A, alpha: 0.2 });
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
          const bladeColorDark = bt === BlockType.SNOW ? 0xDDDDEE : bt === BlockType.MUD ? 0x4A3020 : 0x3A8A35;
          // Grass blades on top (more varied, denser)
          const aboveAir = y < WH - 1 && chunk.getBlock(lx, y + 1) === BlockType.AIR;
          if (aboveAir) {
            for (let gx = 0; gx < TS; gx += 1) {
              const seed2 = ((wx * 31 + gx * 17) >>> 0);
              const gh = 1 + seed2 % 5;
              const sway = Math.sin(time * 1.5 + wx * 0.5 + gx * 0.3) * (0.3 + gh * 0.15);
              const bc = (seed2 % 3 === 0) ? bladeColorDark : bladeColor;
              gfx.moveTo(px + gx + sway, py - gh);
              gfx.quadraticCurveTo(px + gx + sway * 0.3, py - gh * 0.4, px + gx, py);
              gfx.stroke({ color: bc, width: 0.8, alpha: 0.65 });
            }
            // Side grass: blades extending off left/right edges
            const leftAir = lx > 0 ? chunk.getBlock(lx - 1, y) === BlockType.AIR : false;
            const rightAir = lx < CW - 1 ? chunk.getBlock(lx + 1, y) === BlockType.AIR : false;
            if (leftAir && h % 3 === 0) {
              for (let gy = 0; gy < 3; gy++) {
                const bladeH = 2 + (h + gy) % 3;
                const by2 = py + 2 + gy * 4;
                gfx.moveTo(px, by2);
                gfx.lineTo(px - bladeH, by2 - 1);
                gfx.stroke({ color: bladeColor, width: 0.7, alpha: 0.4 });
              }
            }
            if (rightAir && h % 3 === 1) {
              for (let gy = 0; gy < 3; gy++) {
                const bladeH = 2 + (h + gy) % 3;
                const by2 = py + 2 + gy * 4;
                gfx.moveTo(px + TS, by2);
                gfx.lineTo(px + TS + bladeH, by2 - 1);
                gfx.stroke({ color: bladeColor, width: 0.7, alpha: 0.4 });
              }
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

        // ---- VINE DECORATIONS (hanging from blocks above air underground) ----
        if (bt === BlockType.STONE || bt === BlockType.MOSS_STONE || bt === BlockType.DIRT) {
          if (y > 1 && y < TB.SURFACE_Y - 2 && h % 9 < 2) {
            const belowBt2 = chunk.getBlock(lx, y - 1);
            if (belowBt2 === BlockType.AIR) {
              const vineLen = 2 + h % 4;
              const vineX = px + 3 + (h % (TS - 6));
              const vineBase = py + TS;
              const vineSway = Math.sin(time * 0.8 + wx * 0.4) * 0.8;
              // Vine segments
              for (let vi = 0; vi < vineLen; vi++) {
                const vy2 = vineBase + vi * 3;
                const vSway = vineSway * (vi + 1) * 0.3;
                gfx.moveTo(vineX + vSway, vy2);
                gfx.lineTo(vineX + vSway, vy2 + 3);
                gfx.stroke({ color: 0x2A6A1A, width: 1, alpha: 0.5 });
                // Small leaves on vine
                if (vi % 2 === 0) {
                  const leafDir = (vi % 4 < 2) ? 1 : -1;
                  gfx.moveTo(vineX + vSway, vy2 + 1);
                  gfx.lineTo(vineX + vSway + leafDir * 2.5, vy2 + 2.5);
                  gfx.lineTo(vineX + vSway + leafDir * 0.5, vy2 + 3);
                  gfx.closePath();
                  gfx.fill({ color: 0x3A8A2A, alpha: 0.45 });
                }
              }
            }
          }
        }

        // ---- BLOCK TRANSITION BLENDING (where different block types meet) ----
        if (def.solid && !def.transparent && !def.liquid) {
          // Blend edges where this block meets a different solid block
          const neighbors: [number, number, number, number, number][] = [ // [nlx, ny, edgeX, edgeY, size]
            [lx, y + 1, px, py, TS],        // top neighbor -> blend on our top edge
            [lx, y - 1, px, py + TS - 2, TS], // bottom
            [lx - 1, y, px, py, 2],          // left
            [lx + 1, y, px + TS - 2, py, 2], // right
          ];
          for (let ni = 0; ni < 2; ni++) { // Only top and bottom for perf
            const [nlx2, ny2, ex, ey, ew] = neighbors[ni];
            if (nlx2 < 0 || nlx2 >= CW || ny2 < 0 || ny2 >= WH) continue;
            const nbt = chunk.getBlock(nlx2, ny2);
            if (nbt === BlockType.AIR || nbt === bt) continue;
            const ndef = BLOCK_DEFS[nbt];
            if (!ndef || !ndef.solid || ndef.transparent || ndef.liquid) continue;
            // Draw a thin gradient of the neighbor's color at the edge
            const ncolor = ndef.color;
            if (ni === 0) { // Top edge: neighbor above is different
              gfx.rect(ex, ey, ew, 2);
              gfx.fill({ color: ncolor, alpha: 0.08 });
              gfx.rect(ex, ey + 2, ew, 1);
              gfx.fill({ color: ncolor, alpha: 0.03 });
            } else { // Bottom edge
              gfx.rect(ex, ey, ew, 2);
              gfx.fill({ color: ncolor, alpha: 0.08 });
              gfx.rect(ex, ey - 1, ew, 1);
              gfx.fill({ color: ncolor, alpha: 0.03 });
            }
          }
        }

        // ---- CAVE DETAILS: stalactites, moss, dripping water ----
        if (def.solid && !def.transparent && y < TB.SURFACE_Y - 3) {
          // Stalactites hanging from cave ceilings (stone below air)
          if ((bt === BlockType.STONE || bt === BlockType.COBBLESTONE) && y > 1) {
            const belowBt = chunk.getBlock(lx, y - 1);
            if (belowBt === BlockType.AIR) {
              const stalH = 2 + (h % 4);
              const stalW = 0.8 + (h % 3) * 0.4;
              if (h % 5 < 2) {
                // Stalactite (triangle hanging down)
                const stalPy = py + TS;
                gfx.moveTo(px + (h % (TS - 4)) + 2 - stalW, stalPy);
                gfx.lineTo(px + (h % (TS - 4)) + 2, stalPy + stalH);
                gfx.lineTo(px + (h % (TS - 4)) + 2 + stalW, stalPy);
                gfx.closePath();
                gfx.fill({ color: 0x777788, alpha: 0.6 });
                // Drip at tip
                if (Math.sin(time * 2.5 + wx * 1.3 + y * 0.7) > 0.85) {
                  const dripY = stalPy + stalH + Math.sin(time * 3 + wx) * 2 + 2;
                  gfx.circle(px + (h % (TS - 4)) + 2, dripY, 0.8);
                  gfx.fill({ color: 0x6699CC, alpha: 0.4 });
                }
              }
            }
          }
          // Moss patches on cave walls (stone next to air on sides)
          if (bt === BlockType.STONE && h % 7 < 2) {
            const leftAir = lx > 0 && chunk.getBlock(lx - 1, y) === BlockType.AIR;
            const rightAir = lx < CW - 1 && chunk.getBlock(lx + 1, y) === BlockType.AIR;
            if (leftAir) {
              for (let mi = 0; mi < 3; mi++) {
                const my2 = py + 2 + ((h + mi * 5) % (TS - 4));
                const mw = 1.5 + (h + mi) % 2;
                gfx.rect(px, my2, mw, 1);
                gfx.fill({ color: 0x3A6A2A, alpha: 0.35 });
              }
            }
            if (rightAir) {
              for (let mi = 0; mi < 3; mi++) {
                const my2 = py + 2 + ((h + mi * 7) % (TS - 4));
                const mw = 1.5 + (h + mi) % 2;
                gfx.rect(px + TS - mw, my2, mw, 1);
                gfx.fill({ color: 0x3A6A2A, alpha: 0.35 });
              }
            }
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

    const time = state.totalTime ?? 0;

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
        const h = _tileHash(wx, y);
        let color = wallColors[wt] ?? 0x333333;

        // Depth-based wall tinting (deeper = darker, bluer)
        if (y < TB.SURFACE_Y) {
          const depthFrac = Math.min(1, (TB.SURFACE_Y - y) / (TB.SURFACE_Y - TB.UNDERWORLD_Y));
          const cr = ((color >> 16) & 0xFF);
          const cg = ((color >> 8) & 0xFF);
          const cb = (color & 0xFF);
          const dt2 = depthFrac * 0.3;
          color = (Math.floor(cr * (1 - dt2)) << 16) | (Math.floor(cg * (1 - dt2 * 0.6)) << 8) | Math.min(255, Math.floor(cb * (1 - dt2 * 0.2) + dt2 * 10));
        }

        // Per-tile color variation for natural look
        const varR = ((h * 3) % 7) - 3;
        const varG = ((h * 5) % 7) - 3;
        const varB = ((h * 7) % 7) - 3;
        const vr = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + varR));
        const vg = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + varG));
        const vb = Math.max(0, Math.min(255, (color & 0xFF) + varB));
        color = (vr << 16) | (vg << 8) | vb;

        gfx.rect(px, py, TS, TS);
        gfx.fill({ color, alpha: 0.65 });

        // Wall texture pattern
        if (wt === WallType.STONE_WALL) {
          // Brick pattern with mortar lines
          const offRow = y % 2 === 0 ? 4 : 0;
          for (let gx = offRow; gx < TS; gx += 8) {
            gfx.rect(px + gx, py, 1, TS);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
          for (let gy = 0; gy < TS; gy += 4) {
            gfx.rect(px, py + gy, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
          // Per-brick variation (alternating slightly lighter/darker)
          const brickIdx = (Math.floor(wx / 1) + y * 3) & 3;
          if (brickIdx === 0) {
            gfx.rect(px + 1, py + 1, 6, 3);
            gfx.fill({ color: 0xFFFFFF, alpha: 0.03 });
          } else if (brickIdx === 2) {
            gfx.rect(px + 1, py + 1, 6, 3);
            gfx.fill({ color: 0x000000, alpha: 0.03 });
          }
          // Cracks (rare)
          if (h % 13 === 0) {
            const crx = px + (h % (TS - 3)) + 1;
            const cry = py + ((h * 3) % (TS - 3)) + 1;
            gfx.moveTo(crx, cry);
            gfx.lineTo(crx + 2, cry + 1.5);
            gfx.lineTo(crx + 1, cry + 3);
            gfx.stroke({ color: 0x000000, width: 0.5, alpha: 0.12 });
          }
          // Glowing fungi on stone walls (rare, animated)
          if (h % 19 === 0 && y < TB.UNDERGROUND_Y) {
            const fgx = px + (h % (TS - 4)) + 2;
            const fgy = py + ((h * 5) % (TS - 4)) + 2;
            const glowPulse = 0.3 + Math.sin(time * 1.5 + wx * 0.7 + y * 0.5) * 0.15;
            // Tiny mushroom shape
            gfx.circle(fgx, fgy, 1.5);
            gfx.fill({ color: 0x44DDAA, alpha: glowPulse });
            gfx.rect(fgx - 0.3, fgy + 1, 0.6, 2);
            gfx.fill({ color: 0x338866, alpha: glowPulse * 0.7 });
            // Glow halo
            gfx.circle(fgx, fgy, 4);
            gfx.fill({ color: 0x44FFAA, alpha: glowPulse * 0.06 });
          }
          // Crystal veins on deep walls
          if (h % 23 === 0 && y < TB.CAVERN_Y) {
            const cvx = px + (h % (TS - 2));
            const cvy = py + ((h * 7) % (TS - 2));
            const cvLen = 3 + h % 4;
            const cvAngle = (h % 6) * 0.5;
            gfx.moveTo(cvx, cvy);
            gfx.lineTo(cvx + Math.cos(cvAngle) * cvLen, cvy + Math.sin(cvAngle) * cvLen);
            gfx.stroke({ color: 0x8866DD, width: 0.8, alpha: 0.2 + Math.sin(time * 2 + wx + y) * 0.08 });
          }
        } else if (wt === WallType.WOOD_WALL) {
          // Plank lines with variation
          for (let gy = 3; gy < TS; gy += 5) {
            gfx.rect(px, py + gy, TS, 1);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
          }
          // Wood grain (wavy lines)
          const grainOff = (h % 3) * 2;
          gfx.moveTo(px, py + grainOff + 1);
          gfx.quadraticCurveTo(px + TS / 2, py + grainOff + 2 + (h % 2), px + TS, py + grainOff + 1);
          gfx.stroke({ color: 0x000000, width: 0.4, alpha: 0.06 });
          // Knot hole (rare)
          if (h % 11 === 0) {
            gfx.circle(px + (h % (TS - 4)) + 2, py + ((h * 3) % (TS - 4)) + 2, 1.2);
            gfx.fill({ color: 0x000000, alpha: 0.08 });
            gfx.circle(px + (h % (TS - 4)) + 2, py + ((h * 3) % (TS - 4)) + 2, 0.6);
            gfx.fill({ color: 0x000000, alpha: 0.06 });
          }
        } else if (wt === WallType.DIRT_WALL) {
          // Dirt speckles and root tendrils
          for (let si = 0; si < 3; si++) {
            const sx2 = px + ((h * (si + 1) * 11) % (TS - 1));
            const sy2 = py + ((h * (si + 1) * 13) % (TS - 1));
            gfx.rect(sx2, sy2, 1, 1);
            gfx.fill({ color: (si % 2 === 0) ? 0x5A4020 : 0x3A2010, alpha: 0.1 });
          }
          // Root tendrils (near surface)
          if (y > TB.SURFACE_Y - 15 && h % 8 < 2) {
            const rx = px + (h % (TS - 2));
            gfx.moveTo(rx, py);
            gfx.quadraticCurveTo(rx + 2, py + TS * 0.5, rx - 1, py + TS);
            gfx.stroke({ color: 0x4A3018, width: 0.6, alpha: 0.12 });
          }
          // Worm holes (tiny dark spots)
          if (h % 15 === 0) {
            gfx.circle(px + (h % (TS - 2)) + 1, py + ((h * 3) % (TS - 2)) + 1, 0.8);
            gfx.fill({ color: 0x000000, alpha: 0.12 });
          }
        } else if (wt === WallType.CASTLE_WALL) {
          // Castle wall with large bricks and mortar
          const offRow = y % 2 === 0 ? 0 : 8;
          gfx.rect(px + offRow, py, 1, TS);
          gfx.fill({ color: 0x000000, alpha: 0.07 });
          gfx.rect(px, py + 8, TS, 1);
          gfx.fill({ color: 0x000000, alpha: 0.07 });
          // Moss in joints (occasional)
          if (h % 7 === 0) {
            gfx.rect(px + (h % (TS - 3)), py + 7, 3, 2);
            gfx.fill({ color: 0x2A4A1A, alpha: 0.15 });
          }
        }

        // Depth fade (stronger for deeper walls)
        const depthFade = y < TB.SURFACE_Y ? 0.08 + Math.min(0.08, (TB.SURFACE_Y - y) * 0.0005) : 0.06;
        gfx.rect(px, py, TS, TS);
        gfx.fill({ color: 0x000000, alpha: depthFade });
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
  // Ambient particles
  // ---------------------------------------------------------------------------

  private _updateAndDrawParticles(state: TerrariaState, camera: TerrariaCamera, sw: number, sh: number): void {
    const dt = 1 / 60;
    const time = state.totalTime ?? 0;
    const dayness = Math.max(0, Math.min(1, Math.sin(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    const px = state.player.x;
    const py = state.player.y;
    const isUnderground = py < TB.SURFACE_Y - 5;
    const isNight = dayness < 0.3;

    this._particleTimer += dt;

    // Spawn particles
    if (this._particleTimer > 0.06 && this._particles.length < 120) {
      this._particleTimer = 0;

      if (isNight && !isUnderground) {
        // Fireflies near surface at night
        const fx = px + (Math.random() - 0.5) * 30;
        const fy = py + (Math.random() - 0.5) * 15;
        this._particles.push({
          x: fx, y: fy,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 0.8,
          life: 3 + Math.random() * 4, maxLife: 3 + Math.random() * 4,
          color: 0xAAFF44, size: 1.5, type: 'firefly',
        });
      }

      if (isUnderground) {
        // Dust motes floating in caves
        const dx = px + (Math.random() - 0.5) * 25;
        const dy = py + (Math.random() - 0.5) * 12;
        this._particles.push({
          x: dx, y: dy,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.1 + Math.random() * 0.2,
          life: 4 + Math.random() * 3, maxLife: 4 + Math.random() * 3,
          color: 0x886644, size: 0.8, type: 'dust',
        });
        // Glowing spores (deep underground)
        if (py < TB.UNDERGROUND_Y && Math.random() < 0.3) {
          const spx = px + (Math.random() - 0.5) * 20;
          const spy = py + (Math.random() - 0.5) * 10;
          const sporeColors = [0x44DDAA, 0x66BBDD, 0xAA88FF, 0x88FFAA];
          this._particles.push({
            x: spx, y: spy,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 0.1 + Math.random() * 0.3,
            life: 5 + Math.random() * 4, maxLife: 5 + Math.random() * 4,
            color: sporeColors[Math.floor(Math.random() * sporeColors.length)],
            size: 1, type: 'spore',
          });
        }
        // Embers near lava (underworld)
        if (py < TB.UNDERWORLD_Y + 15 && Math.random() < 0.4) {
          this._particles.push({
            x: px + (Math.random() - 0.5) * 20,
            y: py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 0.5 + Math.random() * 1.5,
            life: 1.5 + Math.random() * 2, maxLife: 1.5 + Math.random() * 2,
            color: Math.random() > 0.5 ? 0xFF6622 : 0xFFAA00, size: 1, type: 'ember',
          });
        }
      }

      if (!isUnderground) {
        // Falling leaves (surface, daytime)
        const lx = px + (Math.random() - 0.5) * 30;
        const ly = py + 8 + Math.random() * 5;
        this._particles.push({
          x: lx, y: ly,
          vx: 0.5 + Math.random() * 1,
          vy: -0.3 - Math.random() * 0.5,
          life: 4 + Math.random() * 3, maxLife: 4 + Math.random() * 3,
          color: dayness > 0.3 ? 0x55AA33 : 0x447722, size: 1.2, type: 'leaf',
        });
        // Butterflies (daytime, surface, rarer)
        if (dayness > 0.3 && Math.random() < 0.15) {
          const bColors = [0xFF8844, 0x44AAFF, 0xFFFF44, 0xFF44AA, 0xAAFF44];
          this._particles.push({
            x: px + (Math.random() - 0.5) * 25,
            y: py + 3 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 0.5,
            life: 6 + Math.random() * 5, maxLife: 6 + Math.random() * 5,
            color: bColors[Math.floor(Math.random() * bColors.length)],
            size: 1.8, type: 'butterfly',
          });
        }
      }
    }

    // Update and draw
    this._particleGfx.clear();
    const alive: typeof this._particles = [];
    for (const p of this._particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) continue;

      const { sx, sy } = camera.worldToScreen(p.x, p.y);
      if (sx < -20 || sx > sw + 20 || sy < -20 || sy > sh + 20) continue;

      alive.push(p);
      const lifeFrac = p.life / p.maxLife;
      const fadeAlpha = Math.min(1, lifeFrac * 3) * Math.min(1, p.life * 2);

      if (p.type === 'firefly') {
        const glow = 0.3 + Math.sin(time * 5 + p.x * 2) * 0.3;
        // Wander
        p.vx += (Math.sin(time * 2 + p.x) - 0.5) * dt * 3;
        p.vy += (Math.cos(time * 1.5 + p.y) - 0.5) * dt * 2;
        // Glow halo
        this._particleGfx.circle(sx, sy, p.size * 3);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * glow * 0.15 });
        // Core
        this._particleGfx.circle(sx, sy, p.size);
        this._particleGfx.fill({ color: 0xFFFFAA, alpha: fadeAlpha * (0.4 + glow * 0.5) });
      } else if (p.type === 'dust') {
        // Gentle drift
        p.vx += Math.sin(time * 0.8 + p.y * 0.5) * dt * 0.2;
        this._particleGfx.circle(sx, sy, p.size);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * 0.2 });
      } else if (p.type === 'leaf') {
        // Leaf drifts and tumbles
        p.vx += Math.sin(time * 1.2 + p.x) * dt * 0.5;
        const rot = time * 2 + p.x * 3;
        const lw = p.size * 1.5 * Math.abs(Math.cos(rot));
        this._particleGfx.ellipse(sx, sy, lw, p.size * 0.5);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * 0.45 });
        // Leaf vein line
        this._particleGfx.moveTo(sx - lw * 0.7, sy);
        this._particleGfx.lineTo(sx + lw * 0.7, sy);
        this._particleGfx.stroke({ color: p.color, width: 0.3, alpha: fadeAlpha * 0.2 });
      } else if (p.type === 'butterfly') {
        // Erratic fluttering motion
        p.vx += (Math.sin(time * 4 + p.x * 3) - 0.3) * dt * 4;
        p.vy += (Math.cos(time * 3 + p.y * 2) - 0.3) * dt * 2;
        p.vx = Math.max(-3, Math.min(3, p.vx));
        p.vy = Math.max(-1.5, Math.min(1.5, p.vy));
        const wingPhase = Math.sin(time * 12 + p.x * 5);
        const wingW = p.size * 2 * (0.3 + Math.abs(wingPhase) * 0.7);
        const wingH = p.size * 1.2;
        // Left wing
        this._particleGfx.ellipse(sx - wingW * 0.4, sy - wingH * 0.2, wingW, wingH);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * 0.55 });
        // Right wing
        this._particleGfx.ellipse(sx + wingW * 0.4, sy - wingH * 0.2, wingW, wingH);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * 0.55 });
        // Body
        this._particleGfx.ellipse(sx, sy, 0.5, p.size * 0.6);
        this._particleGfx.fill({ color: 0x222222, alpha: fadeAlpha * 0.6 });
        // Wing pattern dots
        this._particleGfx.circle(sx - wingW * 0.3, sy - wingH * 0.15, wingW * 0.2);
        this._particleGfx.fill({ color: 0xFFFFFF, alpha: fadeAlpha * 0.2 });
        this._particleGfx.circle(sx + wingW * 0.3, sy - wingH * 0.15, wingW * 0.2);
        this._particleGfx.fill({ color: 0xFFFFFF, alpha: fadeAlpha * 0.2 });
      } else if (p.type === 'spore') {
        // Float upward with gentle spiral
        p.vx += Math.sin(time * 1.5 + p.y * 0.8) * dt * 0.3;
        p.vy += 0.02 * dt;
        const glow = 0.4 + Math.sin(time * 3 + p.x * 1.5 + p.y * 0.5) * 0.3;
        // Outer glow
        this._particleGfx.circle(sx, sy, p.size * 3.5);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * glow * 0.08 });
        // Mid glow
        this._particleGfx.circle(sx, sy, p.size * 2);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * glow * 0.15 });
        // Core
        this._particleGfx.circle(sx, sy, p.size);
        this._particleGfx.fill({ color: 0xFFFFFF, alpha: fadeAlpha * glow * 0.4 });
      } else if (p.type === 'ember') {
        // Rise and flicker
        p.vy += 0.5 * dt;
        p.vx += (Math.random() - 0.5) * dt * 3;
        const flicker = 0.5 + Math.sin(time * 8 + p.x * 5) * 0.5;
        // Glow
        this._particleGfx.circle(sx, sy, p.size * 2);
        this._particleGfx.fill({ color: p.color, alpha: fadeAlpha * flicker * 0.12 });
        // Core
        this._particleGfx.circle(sx, sy, p.size * (0.5 + flicker * 0.5));
        this._particleGfx.fill({ color: 0xFFDD66, alpha: fadeAlpha * flicker * 0.7 });
        // Trail
        this._particleGfx.moveTo(sx, sy);
        this._particleGfx.lineTo(sx - p.vx * 0.15, sy - p.vy * 0.15);
        this._particleGfx.stroke({ color: p.color, width: 0.6, alpha: fadeAlpha * flicker * 0.3 });
      }
    }
    this._particles = alive;
  }

  // ---------------------------------------------------------------------------
  // Screen-space FX
  // ---------------------------------------------------------------------------

  private _drawScreenFX(state: TerrariaState, _camera: TerrariaCamera, sw: number, sh: number): void {
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
    const time = state.totalTime ?? 0;
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

    // --- Rain weather (cyclic, surface only) ---
    const rainPhase = Math.sin(time * 0.03 + 2.5);
    if (rainPhase > 0.4 && playerY >= TB.SURFACE_Y - 15) {
      const rainIntensity = (rainPhase - 0.4) * 1.6;
      const rainCount = Math.floor(rainIntensity * 50);
      // Rain streaks
      for (let i = 0; i < rainCount; i++) {
        const rx = ((time * 80 + i * 37 + _pseudoRand(2000 + i) * sw * 3) % sw);
        const ry = ((time * 350 + i * 73 + _pseudoRand(2100 + i) * sh * 3) % sh);
        const rLen = 6 + _pseudoRand(2200 + i) * 8;
        this._screenFx.moveTo(rx, ry);
        this._screenFx.lineTo(rx - 1.5, ry + rLen);
        this._screenFx.stroke({ color: 0x8899BB, width: 0.8, alpha: 0.2 * rainIntensity });
      }
      // Splashes at bottom of screen
      for (let i = 0; i < Math.floor(rainCount * 0.3); i++) {
        const sx2 = _pseudoRand(2300 + i + Math.floor(time * 5)) * sw;
        const sy2 = sh * 0.7 + _pseudoRand(2400 + i) * sh * 0.25;
        const splashR = 1 + _pseudoRand(2500 + i) * 2;
        this._screenFx.circle(sx2, sy2, splashR);
        this._screenFx.stroke({ color: 0x8899BB, width: 0.5, alpha: 0.12 * rainIntensity });
      }
      // Overall rain fog
      this._screenFx.rect(0, 0, sw, sh);
      this._screenFx.fill({ color: 0x889AAA, alpha: 0.03 * rainIntensity });
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

    // --- Sun rays (god rays) on surface during day ---
    const dayness = Math.max(0, Math.min(1, Math.sin(state.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    if (dayness > 0.4 && playerY >= TB.SURFACE_Y - 10 && rainPhase < 0.3) {
      const sunAngle = state.timeOfDay * Math.PI * 2 - Math.PI / 2;
      const sunX = sw * 0.5 + Math.cos(sunAngle) * sw * 0.4;
      const rayAlpha = (dayness - 0.4) * 0.08;
      // Diagonal light shafts from sun direction
      for (let i = 0; i < 5; i++) {
        const rx = sunX + (i - 2) * sw * 0.12;
        const rw = 15 + _pseudoRand(3000 + i) * 25;
        const rAngle = 0.15 + _pseudoRand(3100 + i) * 0.2;
        const drift = Math.sin(time * 0.3 + i * 1.5) * 20;
        this._screenFx.moveTo(rx + drift, 0);
        this._screenFx.lineTo(rx + drift + rw, 0);
        this._screenFx.lineTo(rx + drift + rw * 0.5 + Math.tan(rAngle) * sh, sh);
        this._screenFx.lineTo(rx + drift - rw * 0.5 + Math.tan(rAngle) * sh, sh);
        this._screenFx.closePath();
        this._screenFx.fill({ color: 0xFFEEAA, alpha: rayAlpha * (0.5 + _pseudoRand(3200 + i) * 0.5) });
      }
    }

    // --- Underground atmosphere (depth-based color overlay) ---
    if (playerY < TB.SURFACE_Y - 5) {
      const depthFrac = Math.min(1, (TB.SURFACE_Y - playerY) / (TB.SURFACE_Y - TB.UNDERWORLD_Y));
      // Cavern fog (subtle, depth-tinted)
      if (depthFrac > 0.1) {
        const fogAlpha = depthFrac * 0.06;
        const fogColor = depthFrac > 0.7 ? 0x220808 : depthFrac > 0.4 ? 0x111828 : 0x0A1420;
        this._screenFx.rect(0, 0, sw, sh);
        this._screenFx.fill({ color: fogColor, alpha: fogAlpha });
      }
      // Deep underworld heat shimmer
      if (playerY < TB.UNDERWORLD_Y + 20) {
        const heatFrac = Math.min(1, (TB.UNDERWORLD_Y + 20 - playerY) / 20);
        this._screenFx.rect(0, 0, sw, sh);
        this._screenFx.fill({ color: 0xFF2200, alpha: heatFrac * 0.06 });
        // Ember-like particles at edges
        for (let i = 0; i < Math.floor(heatFrac * 6); i++) {
          const ex = _pseudoRand(3300 + i + Math.floor(time * 2)) * sw;
          const ey = sh - _pseudoRand(3400 + i) * sh * 0.3;
          this._screenFx.circle(ex, ey, 1 + _pseudoRand(3500 + i));
          this._screenFx.fill({ color: 0xFF6622, alpha: heatFrac * 0.15 * (Math.sin(time * 4 + i * 2) * 0.5 + 0.5) });
        }
      }
    }

    // --- Night surface darkness ---
    if (dayness < 0.4 && playerY >= TB.SURFACE_Y - 10) {
      const nightAlpha = (0.4 - dayness) * 0.5;
      this._screenFx.rect(0, 0, sw, sh);
      this._screenFx.fill({ color: 0x0a0a20, alpha: nightAlpha });
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
    const sparkC = enchanted ? 0xCC88FF : 0xFFDD44;
    const f1 = Math.sin(time * 8 + wx * 3) * 1.5;
    const f2 = Math.sin(time * 10 + wx * 5 + 1) * 1;
    const f3 = Math.sin(time * 12 + wx * 7 + 2) * 0.8;
    // Outer glow (larger, softer)
    g.circle(cx, py + TS * 0.15, 10);
    g.fill({ color: flameC, alpha: 0.05 });
    // Wall mount bracket
    g.rect(cx - 3, py + TS * 0.55, 6, 2);
    g.fill(0x555555);
    g.rect(cx - 3, py + TS * 0.55, 6, 0.5);
    g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    // Stick (tapered)
    g.moveTo(cx - 1.2, py + TS * 0.28); g.lineTo(cx + 1.2, py + TS * 0.28);
    g.lineTo(cx + 0.8, py + TS); g.lineTo(cx - 0.8, py + TS); g.closePath();
    g.fill(0x8B6914);
    // Wood grain
    g.moveTo(cx - 0.2, py + TS * 0.35); g.lineTo(cx + 0.2, py + TS * 0.85);
    g.stroke({ color: 0x6B4226, width: 0.4, alpha: 0.25 });
    // Charred tip
    g.rect(cx - 1.2, py + TS * 0.26, 2.4, 3);
    g.fill({ color: 0x222222, alpha: 0.3 });
    // Smoke wisps (rising from flame)
    for (let si = 0; si < 3; si++) {
      const smokeT = (time * 1.5 + si * 1.2) % 3;
      const smokeY = py + TS * 0.1 - smokeT * 6;
      const smokeX = cx + Math.sin(time * 2 + si * 2 + smokeT) * (1 + smokeT * 0.5);
      const smokeAlpha = Math.max(0, 0.08 - smokeT * 0.025);
      if (smokeAlpha > 0.01) {
        g.circle(smokeX, smokeY, 1.5 + smokeT * 0.8);
        g.fill({ color: 0x888888, alpha: smokeAlpha });
      }
    }
    // Outer flame (organic, multi-point)
    g.moveTo(cx - 3.5, py + TS * 0.35);
    g.quadraticCurveTo(cx - 4 + f2, py + TS * 0.12, cx - 1.5 + f1 * 0.3, py - 3 + f1);
    g.quadraticCurveTo(cx + f1 * 0.15, py - 4 + f1 * 0.6, cx + f3, py - 2 + f1 * 0.4);
    g.quadraticCurveTo(cx + 1.5 - f2 * 0.2, py - 3 + f3 * 0.8, cx + 2 - f2 * 0.3, py - 1 + f1 * 0.5);
    g.quadraticCurveTo(cx + 4 + f2, py + TS * 0.12, cx + 3.5, py + TS * 0.35);
    g.closePath();
    g.fill({ color: flameC, alpha: 0.7 });
    // Mid flame (hotter zone)
    g.moveTo(cx - 2, py + TS * 0.32);
    g.quadraticCurveTo(cx - 1 + f1 * 0.1, py + TS * 0.05 + f1 * 0.2, cx + f3 * 0.3, py - 1 + f1 * 0.3);
    g.quadraticCurveTo(cx + 1 + f2 * 0.1, py + TS * 0.05 + f2 * 0.2, cx + 2, py + TS * 0.32);
    g.closePath();
    g.fill({ color: innerC, alpha: 0.5 });
    // Hot core (white-hot center)
    g.ellipse(cx + f1 * 0.08, py + TS * 0.22 + f1 * 0.15, 1.5, 2);
    g.fill({ color: 0xFFFFEE, alpha: 0.65 });
    g.circle(cx + f1 * 0.05, py + TS * 0.2 + f1 * 0.1, 0.8);
    g.fill({ color: 0xFFFFFF, alpha: 0.5 });
    // Flying sparks (tiny bright dots)
    for (let si = 0; si < 2; si++) {
      const sparkPhase = (time * 4 + si * 1.5 + wx) % 2;
      if (sparkPhase < 1) {
        const sparkX = cx + Math.sin(time * 6 + si * 3) * 3 + f1 * 0.5;
        const sparkY = py + TS * 0.1 - sparkPhase * 8;
        g.circle(sparkX, sparkY, 0.5);
        g.fill({ color: sparkC, alpha: (1 - sparkPhase) * 0.6 });
      }
    }
    // Inner glow
    g.circle(cx, py + TS * 0.18, 6);
    g.fill({ color: flameC, alpha: 0.1 });
    return true;
  }

  // ---- RED FLOWER ----
  if (bt === BlockType.RED_FLOWER) {
    const sway = Math.sin(time * 1.2 + wx * 0.5) * 0.8;
    // Stem (curved, swaying)
    g.moveTo(cx, py + TS);
    g.quadraticCurveTo(cx - 1 + sway * 0.3, py + TS * 0.6, cx + sway, py + TS * 0.35);
    g.stroke({ color: 0x337722, width: 1.3 });
    // Leaves on stem (two, opposite sides)
    g.moveTo(cx - 0.5 + sway * 0.2, py + TS * 0.65);
    g.quadraticCurveTo(cx + 3.5, py + TS * 0.52, cx + 0.5, py + TS * 0.7);
    g.fill({ color: 0x448833, alpha: 0.7 });
    g.moveTo(cx + sway * 0.15, py + TS * 0.78);
    g.quadraticCurveTo(cx - 3, py + TS * 0.7, cx - 0.5, py + TS * 0.82);
    g.fill({ color: 0x3A7728, alpha: 0.6 });
    // 5 petals (layered - back petals darker)
    const flowerCx = cx + sway;
    const flowerCy = py + TS * 0.32;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const pr = 3.8;
      const ppx = flowerCx + Math.cos(a) * pr;
      const ppy = flowerCy + Math.sin(a) * pr;
      g.ellipse(ppx, ppy, 2.4, 1.6);
      g.fill({ color: i < 2 ? 0xBB2222 : 0xDD3333, alpha: 0.85 });
    }
    // Petal highlights
    for (let i = 0; i < 3; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const ppx = flowerCx + Math.cos(a) * 2.5;
      const ppy = flowerCy + Math.sin(a) * 2.5;
      g.ellipse(ppx, ppy, 1, 0.6);
      g.fill({ color: 0xFF6666, alpha: 0.25 });
    }
    // Center (pistil)
    g.circle(flowerCx, flowerCy, 1.8);
    g.fill(0xFFDD44);
    g.circle(flowerCx - 0.3, flowerCy - 0.3, 0.8);
    g.fill({ color: 0xFFFFAA, alpha: 0.4 });
    // Tiny pollen dots
    g.circle(flowerCx + 1.2, flowerCy - 0.5, 0.3);
    g.fill({ color: 0xFFEE66, alpha: 0.5 });
    g.circle(flowerCx - 0.8, flowerCy + 0.8, 0.3);
    g.fill({ color: 0xFFEE66, alpha: 0.5 });
    return true;
  }

  // ---- BLUE FLOWER ----
  if (bt === BlockType.BLUE_FLOWER) {
    const sway = Math.sin(time * 1.4 + wx * 0.7 + 0.5) * 0.7;
    const flowerCx = cx - 0.5 + sway;
    const flowerCy = py + TS * 0.28;
    // Stem (curved with sway)
    g.moveTo(cx, py + TS);
    g.quadraticCurveTo(cx + 1 + sway * 0.3, py + TS * 0.55, flowerCx, flowerCy + 3);
    g.stroke({ color: 0x337722, width: 1.3 });
    // Leaf on stem
    g.moveTo(cx + 0.5 + sway * 0.15, py + TS * 0.7);
    g.quadraticCurveTo(cx - 3, py + TS * 0.6, cx - 0.5, py + TS * 0.74);
    g.fill({ color: 0x3A7A28, alpha: 0.6 });
    // 6 petals (layered, back darker)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const pr = 3.3;
      const ppx = flowerCx + Math.cos(a) * pr;
      const ppy = flowerCy + Math.sin(a) * pr;
      g.ellipse(ppx, ppy, 2.2, 1.4);
      g.fill({ color: i < 3 ? 0x3366DD : 0x4488FF, alpha: 0.85 });
    }
    // Petal inner highlights
    for (let i = 0; i < 6; i += 2) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const ppx = flowerCx + Math.cos(a) * 2;
      const ppy = flowerCy + Math.sin(a) * 2;
      g.ellipse(ppx, ppy, 1, 0.6);
      g.fill({ color: 0x88BBFF, alpha: 0.2 });
    }
    // Center with stamen detail
    g.circle(flowerCx, flowerCy, 1.6);
    g.fill(0xFFFFAA);
    g.circle(flowerCx - 0.3, flowerCy - 0.2, 0.6);
    g.fill({ color: 0xFFFFDD, alpha: 0.5 });
    // Pollen dots
    g.circle(flowerCx + 0.8, flowerCy - 0.6, 0.25);
    g.fill({ color: 0xFFFF88, alpha: 0.6 });
    g.circle(flowerCx - 0.6, flowerCy + 0.7, 0.25);
    g.fill({ color: 0xFFFF88, alpha: 0.6 });
    return true;
  }

  // ---- MUSHROOM ----
  if (bt === BlockType.MUSHROOM) {
    // Ground shadow
    g.ellipse(cx, py + TS - 0.5, 4, 1);
    g.fill({ color: 0x000000, alpha: 0.12 });
    // Stem with slight curve
    g.moveTo(cx - 1.5, py + TS);
    g.quadraticCurveTo(cx - 1.8, py + TS * 0.6, cx - 0.8, py + TS * 0.48);
    g.lineTo(cx + 0.8, py + TS * 0.48);
    g.quadraticCurveTo(cx + 1.2, py + TS * 0.6, cx + 1.5, py + TS);
    g.closePath();
    g.fill(0xEEEECC);
    // Stem shadow
    g.moveTo(cx + 0.3, py + TS * 0.5); g.lineTo(cx + 0.8, py + TS);
    g.stroke({ color: 0x000000, width: 0.5, alpha: 0.08 });
    // Cap (fuller dome)
    g.moveTo(cx - 5.5, py + TS * 0.52);
    g.quadraticCurveTo(cx - 6, py + TS * 0.3, cx - 3.5, py + TS * 0.16);
    g.quadraticCurveTo(cx - 1, py + TS * 0.06, cx + 1, py + TS * 0.06);
    g.quadraticCurveTo(cx + 3.5, py + TS * 0.16, cx + 6, py + TS * 0.3);
    g.quadraticCurveTo(cx + 5.5, py + TS * 0.52, cx + 5.5, py + TS * 0.52);
    g.closePath();
    g.fill(0xCC8844);
    // Cap shading (darker underside)
    g.moveTo(cx - 5, py + TS * 0.48);
    g.quadraticCurveTo(cx, py + TS * 0.56, cx + 5, py + TS * 0.48);
    g.lineTo(cx + 5.5, py + TS * 0.52);
    g.quadraticCurveTo(cx, py + TS * 0.58, cx - 5.5, py + TS * 0.52);
    g.closePath();
    g.fill({ color: 0x885522, alpha: 0.35 });
    // Cap spots (multiple, varied)
    g.circle(cx - 2.5, py + TS * 0.25, 1.2); g.fill({ color: 0xFFDDAA, alpha: 0.5 });
    g.circle(cx + 1.5, py + TS * 0.22, 0.9); g.fill({ color: 0xFFDDAA, alpha: 0.45 });
    g.circle(cx + 3, py + TS * 0.35, 0.7); g.fill({ color: 0xFFDDAA, alpha: 0.35 });
    g.circle(cx - 0.5, py + TS * 0.33, 1); g.fill({ color: 0xFFDDAA, alpha: 0.4 });
    // Cap highlight (glossy)
    g.ellipse(cx - 1.5, py + TS * 0.18, 2.5, 1.2);
    g.fill({ color: 0xFFFFFF, alpha: 0.14 });
    // Tiny glow (bioluminescence hint)
    g.circle(cx, py + TS * 0.3, 5);
    g.fill({ color: 0xFFCC88, alpha: 0.04 });
    return true;
  }

  // ---- TALL GRASS ----
  if (bt === BlockType.TALL_GRASS) {
    const sway = Math.sin(time * 1.5 + wx * 0.6) * 1.5;
    const sway2 = Math.sin(time * 2.1 + wx * 0.9 + 1.5) * 0.8;
    const bladeCount = 6 + (h % 3);
    const baseY = py + TS;
    // Background blades (darker, shorter)
    for (let i = 0; i < 3; i++) {
      const bx = px + 2 + ((h + i * 5) % (TS - 4));
      const bh = 4 + ((h * (i + 3)) % 4);
      const tipSway2 = (sway + sway2) * (0.3 + i * 0.1);
      g.moveTo(bx - 0.3, baseY);
      g.quadraticCurveTo(bx + tipSway2 * 0.3, baseY - bh * 0.5, bx + tipSway2, baseY - bh);
      g.quadraticCurveTo(bx + tipSway2 * 0.3 + 0.8, baseY - bh * 0.5, bx + 0.8, baseY);
      g.closePath();
      g.fill({ color: 0x3A7A32, alpha: 0.45 });
    }
    // Main blades (varied greens, taller)
    for (let i = 0; i < bladeCount; i++) {
      const bx = px + 0.5 + ((i * TS) / bladeCount) + (h + i) % 2;
      const bh = 6 + ((h * (i + 1) * 7) % 7);
      const tipSway2 = sway * (0.4 + i * 0.12) + sway2 * (i % 2 === 0 ? 0.3 : -0.2);
      g.moveTo(bx - 0.5, baseY);
      g.quadraticCurveTo(bx + tipSway2 * 0.4, baseY - bh * 0.5, bx + tipSway2, baseY - bh);
      g.quadraticCurveTo(bx + tipSway2 * 0.4 + 1, baseY - bh * 0.5, bx + 1, baseY);
      g.closePath();
      const greens = [0x5BAF50, 0x4A9A42, 0x6AC060, 0x3E8836];
      g.fill({ color: greens[i % greens.length], alpha: 0.7 });
      // Blade highlight (one side lighter)
      if (i % 3 === 0) {
        g.moveTo(bx, baseY);
        g.quadraticCurveTo(bx + tipSway2 * 0.35, baseY - bh * 0.5, bx + tipSway2 * 0.8, baseY - bh * 0.7);
        g.stroke({ color: 0x88DD77, width: 0.4, alpha: 0.3 });
      }
    }
    // Tiny flower specks at blade tips (occasional)
    if (h % 5 === 0) {
      const fi = h % bladeCount;
      const fbx = px + 0.5 + ((fi * TS) / bladeCount) + (h + fi) % 2;
      const fbh = 6 + ((h * (fi + 1) * 7) % 7);
      const fSway = sway * (0.4 + fi * 0.12);
      const flowerColors = [0xFFDD44, 0xFFAAFF, 0xAADDFF];
      g.circle(fbx + fSway, baseY - fbh, 1);
      g.fill({ color: flowerColors[h % 3], alpha: 0.6 });
    }
    return true;
  }

  // ---- CHEST ----
  if (bt === BlockType.CHEST) {
    const cw = TS * 0.82;
    const ch2 = TS * 0.62;
    const clx = cx - cw / 2;
    const cly = py + TS - ch2;
    // Ground shadow
    g.ellipse(cx, py + TS, cw * 0.5, 1.5);
    g.fill({ color: 0x000000, alpha: 0.15 });
    // Body (front face with gradient feel)
    g.rect(clx, cly, cw, ch2);
    g.fill(0xB8860B);
    // Body bottom half darker
    g.rect(clx, cly + ch2 * 0.5, cw, ch2 * 0.5);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // Side face (3D effect - right)
    g.moveTo(clx + cw, cly); g.lineTo(clx + cw + 2, cly - 1);
    g.lineTo(clx + cw + 2, cly + ch2 - 1); g.lineTo(clx + cw, cly + ch2);
    g.closePath(); g.fill(0x9A7208);
    // Lid (curved top with 3D beveled edge)
    g.rect(clx - 1, cly - 2.5, cw + 2, 3);
    g.fill(0xD4A030);
    // Lid top surface (lighter, slight curve implied)
    g.rect(clx, cly - 5, cw, 3.5);
    g.fill(0xC49820);
    // Lid 3D top
    g.moveTo(clx, cly - 5); g.lineTo(clx + 1, cly - 6);
    g.lineTo(clx + cw + 1, cly - 6); g.lineTo(clx + cw, cly - 5);
    g.closePath(); g.fill(0xD5AA38);
    // Metal bands (horizontal)
    g.rect(clx, cly + 2, cw, 1.5); g.fill({ color: 0x8B6914, alpha: 0.35 });
    g.rect(clx, cly + ch2 - 3.5, cw, 1.5); g.fill({ color: 0x8B6914, alpha: 0.35 });
    // Metal clasp (center vertical)
    g.rect(cx - 1.5, cly, 3, ch2); g.fill({ color: 0x8B6914, alpha: 0.25 });
    // Lock plate
    g.roundRect(cx - 2.5, cly + ch2 * 0.25, 5, 4, 0.5); g.fill(0xFFD700);
    // Lock keyhole
    g.circle(cx, cly + ch2 * 0.32, 0.8); g.fill(0x332200);
    g.rect(cx - 0.3, cly + ch2 * 0.35, 0.6, 1.5); g.fill(0x332200);
    // Corner rivets
    g.circle(clx + 2, cly + 2, 0.7); g.fill({ color: 0xEEC060, alpha: 0.5 });
    g.circle(clx + cw - 2, cly + 2, 0.7); g.fill({ color: 0xEEC060, alpha: 0.5 });
    g.circle(clx + 2, cly + ch2 - 2, 0.7); g.fill({ color: 0xEEC060, alpha: 0.5 });
    g.circle(clx + cw - 2, cly + ch2 - 2, 0.7); g.fill({ color: 0xEEC060, alpha: 0.5 });
    // Lid highlight
    g.rect(clx + 1, cly - 5, cw * 0.5, 1); g.fill({ color: 0xFFFFFF, alpha: 0.18 });
    // Subtle shimmer (treasure glow)
    const chestGlow = Math.sin(time * 2 + wx * 1.5) * 0.5 + 0.5;
    g.circle(cx, cly + ch2 * 0.4, 6);
    g.fill({ color: 0xFFDD44, alpha: chestGlow * 0.05 });
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
  // ---- LADDER ----
  if (bt === BlockType.LADDER) {
    // Two vertical rails
    g.rect(px + 2, py, 1.5, TS); g.fill(0x8B6914);
    g.rect(px + TS - 3.5, py, 1.5, TS); g.fill(0x8B6914);
    // Rungs
    for (let gy = 2; gy < TS; gy += 4) {
      g.rect(px + 3.5, py + gy, TS - 7, 1.5); g.fill(0xA07840);
      // Rung highlight
      g.rect(px + 3.5, py + gy, TS - 7, 0.5); g.fill({ color: 0xFFFFFF, alpha: 0.08 });
    }
    // Rail highlights
    g.rect(px + 2, py, 0.5, TS); g.fill({ color: 0xFFFFFF, alpha: 0.06 });
    return true;
  }

  // ---- ROPE ----
  if (bt === BlockType.ROPE) {
    const sway = Math.sin(time * 1 + wx * 0.5) * 0.8;
    g.moveTo(cx + sway * 0.2, py);
    g.bezierCurveTo(cx + sway * 0.5, py + TS * 0.3, cx + sway, py + TS * 0.7, cx + sway * 0.3, py + TS);
    g.stroke({ color: 0xAA8844, width: 2 });
    // Fibers
    g.moveTo(cx + sway * 0.2 + 0.5, py);
    g.bezierCurveTo(cx + sway * 0.5 + 0.5, py + TS * 0.3, cx + sway + 0.5, py + TS * 0.7, cx + sway * 0.3 + 0.5, py + TS);
    g.stroke({ color: 0xBB9955, width: 0.5, alpha: 0.4 });
    return true;
  }

  // ---- CAMPFIRE ----
  if (bt === BlockType.CAMPFIRE) {
    // Logs (crossed)
    g.moveTo(px + 2, py + TS); g.lineTo(px + TS - 2, py + TS - 3);
    g.stroke({ color: 0x6B4226, width: 2.5 });
    g.moveTo(px + TS - 2, py + TS); g.lineTo(px + 2, py + TS - 3);
    g.stroke({ color: 0x5A3A1A, width: 2.5 });
    // Stones (ring around base)
    for (let i = 0; i < 5; i++) {
      const sx2 = px + 1 + i * (TS - 2) / 5;
      g.ellipse(sx2 + 1, py + TS - 1, 1.8, 1.2);
      g.fill(0x777777);
    }
    // Fire (animated, layered)
    const f1 = Math.sin(time * 7 + wx * 3) * 2;
    const f2 = Math.sin(time * 9 + wx * 5 + 1) * 1.5;
    // Outer flame
    g.moveTo(px + 3, py + TS - 3);
    g.quadraticCurveTo(cx + f1, py + TS * 0.15 + f2, px + TS - 3, py + TS - 3);
    g.closePath();
    g.fill({ color: 0xFF6622, alpha: 0.7 });
    // Inner flame
    g.moveTo(px + 5, py + TS - 3);
    g.quadraticCurveTo(cx + f2, py + TS * 0.3 + f1, px + TS - 5, py + TS - 3);
    g.closePath();
    g.fill({ color: 0xFFAA22, alpha: 0.6 });
    // Core
    g.moveTo(px + 6, py + TS - 3);
    g.quadraticCurveTo(cx + f1 * 0.3, py + TS * 0.45 + f2 * 0.5, px + TS - 6, py + TS - 3);
    g.closePath();
    g.fill({ color: 0xFFFF88, alpha: 0.5 });
    // Sparks
    for (let si = 0; si < 3; si++) {
      const sp = (time * 3 + si * 1.5) % 2;
      if (sp < 1) {
        const spx = cx + Math.sin(time * 5 + si * 2) * 3;
        const spy = py + TS * 0.3 - sp * 8;
        g.circle(spx, spy, 0.5);
        g.fill({ color: 0xFFDD44, alpha: (1 - sp) * 0.5 });
      }
    }
    // Smoke
    for (let si = 0; si < 2; si++) {
      const smokeT = (time * 1.2 + si * 1.5) % 3;
      const smokeY = py + TS * 0.1 - smokeT * 5;
      const smokeX = cx + Math.sin(time * 1.5 + si * 2 + smokeT) * 2;
      if (smokeT < 2.5) {
        g.circle(smokeX, smokeY, 1.5 + smokeT * 0.5);
        g.fill({ color: 0x888888, alpha: Math.max(0, 0.06 - smokeT * 0.02) });
      }
    }
    // Glow
    g.circle(cx, py + TS * 0.5, 8);
    g.fill({ color: 0xFF6622, alpha: 0.06 });
    return true;
  }

  // ---- BED ----
  if (bt === BlockType.BED) {
    const bw = TS * 0.9;
    const bh = TS * 0.45;
    const blx = cx - bw / 2;
    const bly = py + TS - bh;
    // Bed frame (dark wood)
    g.rect(blx - 1, bly - 1, bw + 2, bh + 1); g.fill(0x5A3A1A);
    // Mattress
    g.rect(blx, bly, bw, bh); g.fill(0xCC4444);
    // Pillow
    g.rect(blx + 1, bly - 2, bw * 0.3, 3); g.fill(0xDDDDCC);
    g.rect(blx + 1, bly - 2, bw * 0.3, 0.5); g.fill({ color: 0xFFFFFF, alpha: 0.15 });
    // Blanket fold
    g.rect(blx + bw * 0.3, bly, bw * 0.7, 1.5); g.fill({ color: 0xAA2222, alpha: 0.3 });
    // Headboard
    g.rect(blx - 1, bly - 4, 2, 5); g.fill(0x4A2A10);
    // Footboard
    g.rect(blx + bw - 1, bly - 2, 2, 3); g.fill(0x4A2A10);
    // Legs
    g.rect(blx, py + TS - 2, 2, 2); g.fill(0x4A2A10);
    g.rect(blx + bw - 2, py + TS - 2, 2, 2); g.fill(0x4A2A10);
    return true;
  }

  // ---- ALCHEMY LAB ----
  if (bt === BlockType.ALCHEMY_LAB) {
    // Table surface
    g.rect(px + 1, py + TS * 0.45, TS - 2, 2); g.fill(0x5A5A5A);
    // Legs
    g.rect(px + 2, py + TS * 0.47, 1.5, TS * 0.53); g.fill(0x444444);
    g.rect(px + TS - 3.5, py + TS * 0.47, 1.5, TS * 0.53); g.fill(0x444444);
    // Flask (left)
    g.moveTo(px + 3, py + TS * 0.45);
    g.lineTo(px + 3, py + TS * 0.25);
    g.lineTo(px + 2, py + TS * 0.15);
    g.lineTo(px + 6, py + TS * 0.15);
    g.lineTo(px + 5, py + TS * 0.25);
    g.lineTo(px + 5, py + TS * 0.45);
    g.closePath(); g.fill({ color: 0x88DDBB, alpha: 0.5 });
    g.rect(px + 2.5, py + TS * 0.13, 3, 1); g.fill(0x666666);
    // Bubbling flask (right, animated)
    const bubY = py + TS * 0.3 + Math.sin(time * 4 + wx) * 1;
    g.moveTo(px + TS - 6, py + TS * 0.45);
    g.lineTo(px + TS - 6, py + TS * 0.28);
    g.quadraticCurveTo(px + TS - 4, py + TS * 0.15, px + TS - 2, py + TS * 0.28);
    g.lineTo(px + TS - 2, py + TS * 0.45);
    g.closePath(); g.fill({ color: 0xAA44DD, alpha: 0.5 });
    // Bubbles
    g.circle(px + TS - 4.5, bubY, 0.6); g.fill({ color: 0xCC66FF, alpha: 0.4 });
    g.circle(px + TS - 3.5, bubY - 1.5, 0.4); g.fill({ color: 0xCC66FF, alpha: 0.3 });
    // Book on table
    g.rect(px + 6, py + TS * 0.38, 3, 2); g.fill(0x5A2A0A);
    g.rect(px + 6, py + TS * 0.38, 3, 0.5); g.fill({ color: 0xFFDD44, alpha: 0.2 });
    // Glow
    g.circle(cx, py + TS * 0.3, 5);
    g.fill({ color: 0x44AA88, alpha: 0.05 });
    return true;
  }

  // ---- SPIKE TRAP ----
  if (bt === BlockType.SPIKE_TRAP) {
    // Base plate
    g.rect(px + 1, py + TS - 2, TS - 2, 2);
    g.fill(0x666666);
    // Spikes (5 pointed triangles)
    for (let i = 0; i < 5; i++) {
      const sx2 = px + 1.5 + i * (TS - 3) / 5;
      g.moveTo(sx2, py + TS - 2);
      g.lineTo(sx2 + (TS - 3) / 10, py + TS * 0.3);
      g.lineTo(sx2 + (TS - 3) / 5, py + TS - 2);
      g.closePath();
      g.fill(0x999999);
      // Spike tip highlight
      g.moveTo(sx2 + (TS - 3) / 10 - 0.3, py + TS * 0.35);
      g.lineTo(sx2 + (TS - 3) / 10, py + TS * 0.3);
      g.lineTo(sx2 + (TS - 3) / 10 + 0.3, py + TS * 0.35);
      g.stroke({ color: 0xDDDDDD, width: 0.4, alpha: 0.4 });
    }
    // Blood stain (occasional)
    if (h % 4 === 0) {
      g.circle(px + (h % (TS - 3)) + 2, py + TS - 3, 1);
      g.fill({ color: 0x882222, alpha: 0.2 });
    }
    return true;
  }

  // ---- COBWEB ----
  if (bt === BlockType.COBWEB) {
    const webAlpha = 0.35;
    // Cross threads (corner to corner)
    g.moveTo(px, py); g.lineTo(px + TS, py + TS);
    g.stroke({ color: 0xDDDDDD, width: 0.5, alpha: webAlpha });
    g.moveTo(px + TS, py); g.lineTo(px, py + TS);
    g.stroke({ color: 0xDDDDDD, width: 0.5, alpha: webAlpha });
    // Vertical and horizontal
    g.moveTo(cx, py); g.lineTo(cx, py + TS);
    g.stroke({ color: 0xDDDDDD, width: 0.4, alpha: webAlpha * 0.7 });
    g.moveTo(px, cy); g.lineTo(px + TS, cy);
    g.stroke({ color: 0xDDDDDD, width: 0.4, alpha: webAlpha * 0.7 });
    // Spiral rings (concentric arcs)
    for (let r = 2; r <= 6; r += 2) {
      g.moveTo(cx - r, cy);
      g.quadraticCurveTo(cx - r, cy - r * 0.7, cx, cy - r);
      g.quadraticCurveTo(cx + r * 0.7, cy - r, cx + r, cy);
      g.stroke({ color: 0xDDDDDD, width: 0.3, alpha: webAlpha * 0.5 });
      g.moveTo(cx + r, cy);
      g.quadraticCurveTo(cx + r, cy + r * 0.7, cx, cy + r);
      g.quadraticCurveTo(cx - r * 0.7, cy + r, cx - r, cy);
      g.stroke({ color: 0xDDDDDD, width: 0.3, alpha: webAlpha * 0.5 });
    }
    // Dew drops
    if (h % 5 < 2) {
      const dx2 = px + (h % (TS - 2)) + 1;
      const dy2 = py + ((h * 3) % (TS - 2)) + 1;
      g.circle(dx2, dy2, 0.7);
      g.fill({ color: 0xFFFFFF, alpha: 0.2 });
    }
    return true;
  }

  if (bt === BlockType.OAK_LEAVES || bt === BlockType.WILLOW_LEAVES || bt === BlockType.DARK_OAK_LEAVES) {
    // Base fill
    g.rect(px, py, TS, TS); g.fill(color);
    // Animated rustle offset (subtle movement)
    const rustleX = Math.sin(time * 2 + wx * 0.4 + h * 0.2) * 0.3;
    const rustleY = Math.cos(time * 1.7 + wx * 0.3 + h * 0.15) * 0.2;
    // Leaf cluster detail (overlapping ellipses, more varied)
    const leafColors = bt === BlockType.DARK_OAK_LEAVES
      ? [0x1A4A18, 0x2A5A22, 0x1A3A14]
      : bt === BlockType.WILLOW_LEAVES
      ? [0x5AAA48, 0x6ABB55, 0x4A9A3A]
      : [0x4AAA38, 0x5ABB45, 0x3A9A2A];
    for (let i = 0; i < 6; i++) {
      const lx2 = px + ((h * (i + 1) * 11) % (TS - 3)) + 1.5 + rustleX * (i % 2 === 0 ? 1 : -1);
      const ly2 = py + ((h * (i + 1) * 13) % (TS - 3)) + 1.5 + rustleY * (i % 3 === 0 ? 1 : -1);
      const lr = 2 + (h + i) % 2;
      g.ellipse(lx2, ly2, lr, lr * 0.7);
      g.fill({ color: leafColors[i % leafColors.length], alpha: 0.25 });
    }
    // Dappled light (sunlight filtering through)
    const dapple = Math.sin(time * 0.8 + wx * 0.7 + h) * 0.5 + 0.5;
    if (dapple > 0.5 && h % 3 < 2) {
      const dx = px + (h % (TS - 4)) + 2 + rustleX * 2;
      const dy = py + ((h * 3) % (TS - 4)) + 2 + rustleY * 2;
      g.ellipse(dx, dy, 2 + dapple, 1.5 + dapple * 0.5);
      g.fill({ color: 0xFFFFCC, alpha: (dapple - 0.5) * 0.12 });
    }
    // Darker veins (multiple, organic)
    g.moveTo(px + 2, py + TS * 0.4);
    g.quadraticCurveTo(px + TS * 0.5, py + TS * 0.45 + rustleY, px + TS - 2, py + TS * 0.42);
    g.stroke({ color: 0x000000, width: 0.5, alpha: 0.06 });
    g.moveTo(px + 3, py + TS * 0.7);
    g.quadraticCurveTo(px + TS * 0.4, py + TS * 0.68, px + TS - 3, py + TS * 0.72);
    g.stroke({ color: 0x000000, width: 0.4, alpha: 0.05 });
    // Sky-holes (gaps where sky peeks through, more natural shapes)
    if (h % 4 === 0) {
      const gx = px + (h % (TS - 3)) + 1;
      const gy = py + ((h * 3) % (TS - 3)) + 1;
      g.ellipse(gx, gy, 1.5 + (h % 2), 1);
      g.fill({ color: 0x88BBDD, alpha: 0.12 });
    }
    if (h % 6 === 0) {
      const gx2 = px + ((h * 7) % (TS - 2)) + 1;
      const gy2 = py + ((h * 11) % (TS - 2)) + 1;
      g.circle(gx2, gy2, 1);
      g.fill({ color: 0x88BBDD, alpha: 0.08 });
    }
    // Leaf edge irregularity (subtle outer bumps)
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
