// ---------------------------------------------------------------------------
// Duel mode – richly detailed procedural arena background renderer
// Inspired by fantasiaCup fighting game stages
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  DUEL_ARENAS,
  type DuelArenaDef,
} from "../../duel/config/DuelArenaDefs";

// ---------------------------------------------------------------------------
// Animated element types
// ---------------------------------------------------------------------------

interface Banner {
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  color: number;
  trimColor: number;
}

interface Flame {
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  color: number;
}

interface MistLayer {
  y: number;
  speed: number;
  offset: number;
  alpha: number;
  height: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface Ripple {
  y: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  alpha: number;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export class DuelArenaRenderer {
  readonly container = new Container();

  private _staticGfx = new Graphics();
  private _animGfx = new Graphics();
  private _sw = 0;
  private _floorY = 0;
  private _arenaId = "";
  private _arena: DuelArenaDef | null = null;

  // Animated element pools
  private _banners: Banner[] = [];
  private _flames: Flame[] = [];
  private _particles: Particle[] = [];
  private _mistLayers: MistLayer[] = [];
  private _stars: Star[] = [];
  private _ripples: Ripple[] = [];

  build(arenaId: string, sw: number, sh: number): void {
    this.container.removeChildren();
    this._staticGfx = new Graphics();
    this._animGfx = new Graphics();
    this._banners = [];
    this._flames = [];
    this._particles = [];
    this._mistLayers = [];
    this._stars = [];
    this._ripples = [];
    this._sw = sw;
    this._floorY = Math.round(sh * 0.82);
    this._arenaId = arenaId;
    this._arena = DUEL_ARENAS[arenaId] ?? null;
    if (!this._arena) return;

    switch (arenaId) {
      case "camelot":
        this._buildCamelot(this._arena, sw, sh);
        break;
      case "avalon":
        this._buildAvalon(this._arena, sw, sh);
        break;
      case "excalibur":
        this._buildExcalibur(this._arena, sw, sh);
        break;
      case "broceliande":
        this._buildBroceliande(this._arena, sw, sh);
        break;
      case "tintagel":
        this._buildTintagel(this._arena, sw, sh);
        break;
      default:
        this._buildGeneric(this._arena, sw, sh);
        break;
    }

    this.container.addChild(this._staticGfx);
    this.container.addChild(this._animGfx);
  }

  update(time: number): void {
    if (!this._arena) return;
    this._animGfx.clear();
    switch (this._arenaId) {
      case "camelot":
        this._updateCamelot(time);
        break;
      case "avalon":
        this._updateAvalon(time);
        break;
      case "excalibur":
        this._updateExcalibur(time);
        break;
      case "broceliande":
        this._updateBroceliande(time);
        break;
      case "tintagel":
        this._updateTintagel(time);
        break;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // CAMELOT COURTYARD
  // =========================================================================

  private _buildCamelot(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Multi-layered sky gradient (dawn/dusk blues into warm horizon) ---
    const skyBands = 12;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const bandY = floorY * t;
      const bandH = floorY / skyBands + 1;
      // Lerp from skyTop to skyBottom
      const r1 = (a.skyTop >> 16) & 0xff,
        g1 = (a.skyTop >> 8) & 0xff,
        b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff,
        g2 = (a.skyBottom >> 8) & 0xff,
        b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, bandY, sw, bandH);
      g.fill({ color: col });
    }
    // Warm horizon band
    g.rect(0, floorY * 0.75, sw, floorY * 0.25);
    g.fill({ color: 0xcc8855, alpha: 0.12 });
    g.rect(0, floorY * 0.85, sw, floorY * 0.15);
    g.fill({ color: 0xddaa66, alpha: 0.08 });

    // --- Distant mountain silhouettes (layer 1 – far) ---
    g.moveTo(0, floorY * 0.48);
    g.lineTo(sw * 0.08, floorY * 0.36);
    g.lineTo(sw * 0.18, floorY * 0.42);
    g.lineTo(sw * 0.28, floorY * 0.3);
    g.lineTo(sw * 0.4, floorY * 0.38);
    g.lineTo(sw * 0.52, floorY * 0.28);
    g.lineTo(sw * 0.62, floorY * 0.35);
    g.lineTo(sw * 0.72, floorY * 0.32);
    g.lineTo(sw * 0.85, floorY * 0.38);
    g.lineTo(sw * 0.95, floorY * 0.34);
    g.lineTo(sw, floorY * 0.4);
    g.lineTo(sw, floorY * 0.5);
    g.lineTo(0, floorY * 0.5);
    g.closePath();
    g.fill({ color: 0x556680, alpha: 0.3 });

    // Mountain silhouettes (layer 2 – closer)
    g.moveTo(0, floorY * 0.52);
    g.lineTo(sw * 0.1, floorY * 0.44);
    g.lineTo(sw * 0.22, floorY * 0.48);
    g.lineTo(sw * 0.35, floorY * 0.4);
    g.lineTo(sw * 0.48, floorY * 0.46);
    g.lineTo(sw * 0.6, floorY * 0.38);
    g.lineTo(sw * 0.7, floorY * 0.44);
    g.lineTo(sw * 0.82, floorY * 0.4);
    g.lineTo(sw * 0.92, floorY * 0.46);
    g.lineTo(sw, floorY * 0.48);
    g.lineTo(sw, floorY * 0.55);
    g.lineTo(0, floorY * 0.55);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.4 });

    // --- Massive castle wall backdrop ---
    const wallH = floorY * 0.55;
    const wallY = floorY - wallH;

    // Wall main body
    g.rect(0, wallY, sw, wallH);
    g.fill({ color: 0x6a6a62 });

    // Stone texture lines – horizontal mortar
    for (let y = wallY + 15; y < floorY; y += 18) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x5a5a52, width: 0.7, alpha: 0.5 });
    }
    // Stone texture lines – vertical mortar (offset every other row)
    let rowIdx = 0;
    for (let y = wallY; y < floorY; y += 18) {
      const offset = (rowIdx % 2) * 22;
      for (let x = offset; x < sw; x += 44) {
        g.moveTo(x, y).lineTo(x, y + 18);
        g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.4 });
      }
      rowIdx++;
    }

    // --- Crenellated battlements (merlons and crenels) ---
    const merlonW = 22;
    const merlonH = 18;
    const crenelW = 14;
    for (let x = 0; x < sw; x += merlonW + crenelW) {
      // Merlon (raised part)
      g.rect(x, wallY - merlonH, merlonW, merlonH);
      g.fill({ color: 0x6a6a62 });
      g.rect(x, wallY - merlonH, merlonW, merlonH);
      g.stroke({ color: 0x555550, width: 1 });
      // Stone line on merlon
      g.moveTo(x, wallY - merlonH / 2).lineTo(x + merlonW, wallY - merlonH / 2);
      g.stroke({ color: 0x5a5a52, width: 0.5, alpha: 0.4 });
    }

    // --- Large arched gateway in center background ---
    const gateX = sw / 2;
    const gateW = 60;
    const gateH = wallH * 0.65;
    const gateTop = floorY - gateH;
    // Dark interior
    g.rect(gateX - gateW / 2, gateTop + 20, gateW, gateH - 20);
    g.fill({ color: 0x1a1a22 });
    // Arch top
    g.arc(gateX, gateTop + 20, gateW / 2, Math.PI, 0);
    g.lineTo(gateX + gateW / 2, gateTop + 20);
    g.lineTo(gateX - gateW / 2, gateTop + 20);
    g.closePath();
    g.fill({ color: 0x1a1a22 });
    // Gate arch frame
    g.arc(gateX, gateTop + 20, gateW / 2 + 5, Math.PI, 0);
    g.stroke({ color: 0x7a7a72, width: 5 });
    // Vertical frame pillars
    g.rect(gateX - gateW / 2 - 5, gateTop + 20, 5, gateH - 20);
    g.fill({ color: 0x7a7a72 });
    g.rect(gateX + gateW / 2, gateTop + 20, 5, gateH - 20);
    g.fill({ color: 0x7a7a72 });
    // Portcullis lines
    for (let px = gateX - gateW / 2 + 8; px < gateX + gateW / 2; px += 10) {
      g.moveTo(px, gateTop + 22).lineTo(px, floorY);
      g.stroke({ color: 0x444440, width: 1.5, alpha: 0.6 });
    }
    for (let py = gateTop + 30; py < floorY; py += 12) {
      g.moveTo(gateX - gateW / 2 + 5, py).lineTo(gateX + gateW / 2 - 5, py);
      g.stroke({ color: 0x444440, width: 1, alpha: 0.4 });
    }

    // --- Arrow slit windows with dark interiors ---
    const windowPositions = [
      sw * 0.08, sw * 0.18, sw * 0.28, sw * 0.38,
      sw * 0.62, sw * 0.72, sw * 0.82, sw * 0.92,
    ];
    for (const wx of windowPositions) {
      const wy = wallY + wallH * 0.2;
      // Dark slit
      g.roundRect(wx - 4, wy, 8, 28, 4);
      g.fill({ color: 0x111118 });
      // Stone frame
      g.roundRect(wx - 6, wy - 2, 12, 32, 5);
      g.stroke({ color: 0x7a7a72, width: 1.5 });
      // Cross slit detail
      g.moveTo(wx - 6, wy + 14).lineTo(wx + 6, wy + 14);
      g.stroke({ color: 0x111118, width: 2 });
    }

    // --- Torch sconces (static brackets, flames are animated) ---
    const torchXs = [
      sw * 0.12, sw * 0.24, sw * 0.36,
      sw * 0.64, sw * 0.76, sw * 0.88,
    ];
    for (const tx of torchXs) {
      const ty = wallY + wallH * 0.45;
      // Iron bracket
      g.rect(tx - 2, ty, 4, 18);
      g.fill({ color: 0x3a3a3a });
      g.rect(tx - 6, ty + 12, 12, 4);
      g.fill({ color: 0x3a3a3a });
      // Torch handle
      g.rect(tx - 2, ty - 10, 4, 14);
      g.fill({ color: 0x6b4c2a });
      // Register flame for animation
      this._flames.push({ x: tx, y: ty - 14, baseRadius: 6, phase: tx * 0.1 });
    }

    // --- Static torch glow (radial gradient simulation) ---
    for (const tx of torchXs) {
      const ty = wallY + wallH * 0.45 - 14;
      for (let r = 40; r > 0; r -= 5) {
        g.circle(tx, ty, r);
        g.fill({ color: 0xff8833, alpha: 0.008 });
      }
    }

    // --- Banners (register for animation) ---
    const bannerXs = [
      sw * 0.06, sw * 0.16, sw * 0.3,
      sw * 0.46, sw * 0.56, sw * 0.7, sw * 0.84, sw * 0.94,
    ];
    for (let i = 0; i < bannerXs.length; i++) {
      const bx = bannerXs[i];
      const by = wallY + 12;
      // Static pole
      g.rect(bx - 1.5, by - 55, 3, 75);
      g.fill({ color: 0x8b7355 });
      g.circle(bx, by - 55, 3);
      g.fill({ color: 0xddaa33 });
      // Register banner for animated sway
      this._banners.push({
        x: bx + 2,
        y: by - 50,
        width: 26,
        height: 45,
        phase: i * 0.8,
        color: i % 2 === 0 ? a.accentColor : 0xcc1111,
        trimColor: 0xddaa33,
      });
    }

    // --- Stone cobblestone floor ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Floor highlight strip
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.6 });

    // Worn stone edge detail
    for (let x = 0; x < sw; x += 8) {
      const h = 1 + Math.sin(x * 0.3) * 1.5;
      g.rect(x, floorY - 1, 6, h + 1);
      g.fill({ color: 0x777770, alpha: 0.5 });
    }

    // Cobblestone mortar grid
    let tileRow = 0;
    for (let y = floorY + 2; y < sh; y += 16) {
      const off = (tileRow % 2) * 18;
      for (let x = off; x < sw; x += 36) {
        g.roundRect(x + 1, y + 1, 34, 14, 2);
        g.stroke({ color: a.groundHighlight, width: 0.6, alpha: 0.25 });
      }
      tileRow++;
    }

    // Cobblestone color variation
    for (let y = floorY + 2; y < sh; y += 16) {
      for (let x = 0; x < sw; x += 36) {
        const seed = Math.sin(x * 0.7 + y * 0.3) * 0.5 + 0.5;
        if (seed > 0.7) {
          g.rect(x + 2, y + 2, 32, 12);
          g.fill({ color: a.groundHighlight, alpha: 0.08 });
        }
      }
    }

    // Floor shadow near wall
    g.rect(0, floorY, sw, 10);
    g.fill({ color: 0x000000, alpha: 0.08 });

    // --- Atmospheric fog overlay ---
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _updateCamelot(time: number): void {
    const g = this._animGfx;

    // Animated banners (gentle sway)
    for (const b of this._banners) {
      const sway = Math.sin(time * 1.5 + b.phase) * 4;
      const sway2 = Math.sin(time * 2.3 + b.phase) * 2;
      // Banner cloth with sway (drawn as a distorted quad)
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway * 0.3, b.y);
      g.lineTo(b.x + b.width + sway, b.y + b.height * 0.5);
      g.lineTo(b.x + b.width + sway2, b.y + b.height);
      g.lineTo(b.x + sway2 * 0.5, b.y + b.height);
      g.lineTo(b.x + sway * 0.2, b.y + b.height * 0.5);
      g.closePath();
      g.fill({ color: b.color });
      // Gold trim at top
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway * 0.3, b.y);
      g.lineTo(b.x + b.width + sway * 0.35, b.y + 5);
      g.lineTo(b.x, b.y + 5);
      g.closePath();
      g.fill({ color: b.trimColor });
      // Gold trim at bottom
      g.moveTo(b.x + sway2 * 0.5, b.y + b.height - 4);
      g.lineTo(b.x + b.width + sway2, b.y + b.height - 4);
      g.lineTo(b.x + b.width + sway2, b.y + b.height);
      g.lineTo(b.x + sway2 * 0.5, b.y + b.height);
      g.closePath();
      g.fill({ color: b.trimColor, alpha: 0.7 });
      // Center emblem (simple diamond)
      const cx = b.x + b.width / 2 + sway * 0.5;
      const cy = b.y + b.height * 0.45;
      g.moveTo(cx, cy - 6);
      g.lineTo(cx + 5, cy);
      g.lineTo(cx, cy + 6);
      g.lineTo(cx - 5, cy);
      g.closePath();
      g.fill({ color: b.trimColor, alpha: 0.9 });
    }

    // Animated flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 2;
      const flicker2 = Math.cos(time * 12 + f.phase * 1.7) * 1.5;
      const flicker3 = Math.sin(time * 5 + f.phase * 0.5) * 1;
      // Outer glow
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 4 + flicker3);
      g.fill({ color: 0xff6600, alpha: 0.15 });
      // Outer flame
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.5, f.baseRadius + 1, f.baseRadius + 3 + flicker);
      g.fill({ color: 0xff6611, alpha: 0.7 });
      // Middle flame
      g.ellipse(f.x - flicker2 * 0.3, f.y - 1 - flicker * 0.3, f.baseRadius * 0.7, f.baseRadius + 1 + flicker * 0.5);
      g.fill({ color: 0xff8833, alpha: 0.85 });
      // Inner flame
      g.ellipse(f.x + flicker2 * 0.2, f.y - flicker * 0.2, f.baseRadius * 0.4, f.baseRadius * 0.7 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.95 });
      // Bright core
      g.circle(f.x, f.y + 1, 2);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
  }

  // =========================================================================
  // AVALON SHORE
  // =========================================================================

  private _buildAvalon(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Ethereal sky gradient (deep purple -> misty blue -> silver horizon) ---
    const skyColors = [
      0x2a1848, 0x332255, 0x3d3066, 0x4a4077, 0x556088,
      0x607099, 0x7088aa, 0x8099bb, 0x99aacc, 0xaabbdd,
      0xbbccdd, 0xccdde8,
    ];
    const bandH = floorY / skyColors.length + 1;
    for (let i = 0; i < skyColors.length; i++) {
      g.rect(0, bandH * i, sw, bandH + 1);
      g.fill({ color: skyColors[i] });
    }
    // Silver horizon glow
    g.rect(0, floorY * 0.8, sw, floorY * 0.2);
    g.fill({ color: 0xddeeff, alpha: 0.1 });

    // --- Moonbeam from top left ---
    g.moveTo(0, 0);
    g.lineTo(sw * 0.15, 0);
    g.lineTo(sw * 0.55, floorY);
    g.lineTo(sw * 0.2, floorY);
    g.closePath();
    g.fill({ color: 0xccddff, alpha: 0.04 });
    g.moveTo(sw * 0.02, 0);
    g.lineTo(sw * 0.1, 0);
    g.lineTo(sw * 0.42, floorY);
    g.lineTo(sw * 0.28, floorY);
    g.closePath();
    g.fill({ color: 0xddeeFF, alpha: 0.03 });

    // --- Moon ---
    const moonX = sw * 0.12;
    const moonY = floorY * 0.15;
    // Moon glow rings
    for (let r = 40; r > 0; r -= 4) {
      g.circle(moonX, moonY, r);
      g.fill({ color: 0xccddff, alpha: 0.006 });
    }
    g.circle(moonX, moonY, 18);
    g.fill({ color: 0xeeeeff, alpha: 0.8 });
    g.circle(moonX + 6, moonY - 4, 15);
    g.fill({ color: skyColors[0] }); // crescent

    // --- Distant isle silhouette (Avalon island) floating in mist ---
    const isleX = sw * 0.5;
    const isleY = floorY * 0.62;
    // Mist around island
    g.ellipse(isleX, isleY + 8, 90, 12);
    g.fill({ color: 0xaabbcc, alpha: 0.2 });
    // Island shape
    g.moveTo(isleX - 70, isleY);
    g.quadraticCurveTo(isleX - 40, isleY - 30, isleX - 10, isleY - 35);
    g.quadraticCurveTo(isleX + 10, isleY - 50, isleX + 25, isleY - 35);
    g.quadraticCurveTo(isleX + 50, isleY - 25, isleX + 70, isleY);
    g.closePath();
    g.fill({ color: 0x334455, alpha: 0.5 });
    // Tower on island
    g.rect(isleX - 5, isleY - 60, 10, 28);
    g.fill({ color: 0x3a4a5a, alpha: 0.45 });
    g.moveTo(isleX - 8, isleY - 60);
    g.lineTo(isleX, isleY - 72);
    g.lineTo(isleX + 8, isleY - 60);
    g.closePath();
    g.fill({ color: 0x3a4a5a, alpha: 0.45 });
    // Tower window
    g.circle(isleX, isleY - 48, 2);
    g.fill({ color: 0xaaddff, alpha: 0.3 });

    // --- Tree silhouettes (layer 1 – far, ethereal) ---
    const farTrees = [
      { x: sw * 0.02, h: 80 }, { x: sw * 0.08, h: 100 },
      { x: sw * 0.15, h: 70 }, { x: sw * 0.85, h: 90 },
      { x: sw * 0.9, h: 110 }, { x: sw * 0.97, h: 75 },
    ];
    for (const t of farTrees) {
      // Bare willow silhouette
      g.rect(t.x - 3, floorY - t.h, 6, t.h);
      g.fill({ color: 0x2a3a44, alpha: 0.35 });
      // Branches
      for (let b = 0; b < 5; b++) {
        const angle = -0.8 + b * 0.4;
        const bLen = 25 + b * 5;
        const bx = t.x + Math.cos(angle) * bLen;
        const by = floorY - t.h + 15 + Math.sin(angle) * bLen * 0.3;
        g.moveTo(t.x, floorY - t.h + 15);
        g.lineTo(bx, by);
        g.stroke({ color: 0x2a3a44, width: 1.5, alpha: 0.3 });
        // Drooping willow tendrils
        for (let d = 0; d < 3; d++) {
          const dx = bx + (d - 1) * 6;
          g.moveTo(dx, by);
          g.lineTo(dx + 2, by + 20 + d * 5);
          g.stroke({ color: 0x2a3a44, width: 0.8, alpha: 0.2 });
        }
      }
    }

    // --- Tree silhouettes (layer 2 – closer) ---
    const nearTrees = [
      { x: -10, h: 130 }, { x: sw * 0.04, h: 110 },
      { x: sw * 0.95, h: 120 }, { x: sw + 10, h: 115 },
    ];
    for (const t of nearTrees) {
      g.rect(t.x - 5, floorY - t.h, 10, t.h);
      g.fill({ color: 0x1a2a33, alpha: 0.5 });
      // Canopy
      g.ellipse(t.x, floorY - t.h - 10, 30, 22);
      g.fill({ color: 0x1a2a33, alpha: 0.4 });
      // Branches
      for (let b = 0; b < 4; b++) {
        const angle = -1 + b * 0.5;
        const bLen = 35;
        g.moveTo(t.x, floorY - t.h + 20);
        g.lineTo(t.x + Math.cos(angle) * bLen, floorY - t.h + 20 + Math.sin(angle) * 15);
        g.stroke({ color: 0x1a2a33, width: 2, alpha: 0.4 });
      }
    }

    // --- Sandy/earthy ground with grass tufts ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    // Earthy texture bands
    g.rect(0, floorY, sw, 4);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    g.rect(0, floorY + 4, sw, 2);
    g.fill({ color: 0x443322, alpha: 0.3 });

    // Grass tufts along shore
    for (let x = 0; x < sw; x += 12 + Math.sin(x) * 4) {
      const baseY = floorY;
      const blades = 3 + Math.floor(Math.sin(x * 0.5) * 2);
      for (let b = 0; b < blades; b++) {
        const bx = x + (b - blades / 2) * 2;
        const bh = 6 + Math.sin(x * 0.7 + b) * 3;
        g.moveTo(bx, baseY);
        g.lineTo(bx + (b - 1) * 1.5, baseY - bh);
        g.stroke({ color: 0x557744, width: 1, alpha: 0.5 });
      }
    }

    // --- Rocks and pebbles along the shoreline ---
    const rocks = [
      { x: sw * 0.1, y: floorY + 3, rx: 12, ry: 6 },
      { x: sw * 0.25, y: floorY + 2, rx: 8, ry: 4 },
      { x: sw * 0.42, y: floorY + 4, rx: 15, ry: 7 },
      { x: sw * 0.58, y: floorY + 2, rx: 10, ry: 5 },
      { x: sw * 0.75, y: floorY + 3, rx: 14, ry: 6 },
      { x: sw * 0.9, y: floorY + 2, rx: 9, ry: 4 },
    ];
    for (const r of rocks) {
      g.ellipse(r.x, r.y, r.rx, r.ry);
      g.fill({ color: 0x667766 });
      g.ellipse(r.x, r.y, r.rx, r.ry);
      g.stroke({ color: 0x556655, width: 1 });
      // Highlight
      g.ellipse(r.x - r.rx * 0.2, r.y - r.ry * 0.3, r.rx * 0.5, r.ry * 0.4);
      g.fill({ color: 0x778877, alpha: 0.4 });
    }
    // Pebbles
    for (let i = 0; i < 20; i++) {
      const px = Math.sin(i * 7.3) * sw * 0.45 + sw * 0.5;
      const py = floorY + 6 + (i % 4) * 3;
      g.ellipse(px, py, 3 + (i % 3), 2);
      g.fill({ color: 0x778877, alpha: 0.4 });
    }

    // --- Water surface below the fighting area ---
    const waterY = floorY + 18;
    // Water body
    g.rect(0, waterY, sw, sh - waterY);
    g.fill({ color: 0x2a4455 });
    // Water color variation
    g.rect(0, waterY, sw, 6);
    g.fill({ color: 0x3a5566, alpha: 0.5 });
    g.rect(0, waterY + (sh - waterY) * 0.5, sw, (sh - waterY) * 0.5);
    g.fill({ color: 0x1a3344, alpha: 0.3 });

    // --- Moonlight reflection on water ---
    const refX = sw * 0.25;
    for (let i = 0; i < 8; i++) {
      const ry = waterY + 8 + i * 6;
      const rw = 20 - i * 2;
      g.rect(refX - rw / 2 + Math.sin(i * 0.8) * 4, ry, rw, 2);
      g.fill({ color: 0xccddff, alpha: 0.12 - i * 0.01 });
    }

    // --- Lily pads with flowers ---
    const lilies = [
      { x: sw * 0.2, y: waterY + 14 },
      { x: sw * 0.45, y: waterY + 20 },
      { x: sw * 0.65, y: waterY + 12 },
      { x: sw * 0.8, y: waterY + 22 },
      { x: sw * 0.35, y: waterY + 28 },
    ];
    for (const l of lilies) {
      // Pad
      g.ellipse(l.x, l.y, 8, 4);
      g.fill({ color: 0x336633, alpha: 0.6 });
      // Notch
      g.moveTo(l.x, l.y);
      g.lineTo(l.x + 5, l.y - 2);
      g.lineTo(l.x + 5, l.y + 2);
      g.closePath();
      g.fill({ color: 0x2a4455 });
      // Flower (every other)
      if (Math.sin(l.x) > 0) {
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          g.ellipse(l.x + Math.cos(pa) * 3, l.y - 4 + Math.sin(pa) * 2, 2, 1.5);
          g.fill({ color: 0xeeddff, alpha: 0.7 });
        }
        g.circle(l.x, l.y - 4, 1.5);
        g.fill({ color: 0xffee88, alpha: 0.8 });
      }
    }

    // --- Register animated ripples ---
    for (let i = 0; i < 8; i++) {
      this._ripples.push({
        y: waterY + 4 + i * 7,
        amplitude: 1.5 + Math.random() * 1.5,
        frequency: 0.04 + Math.random() * 0.02,
        speed: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.1,
      });
    }

    // --- Register mist/fog layers ---
    for (let i = 0; i < 5; i++) {
      this._mistLayers.push({
        y: floorY * 0.55 + i * floorY * 0.1,
        speed: 8 + i * 5,
        offset: i * 200,
        alpha: 0.06 + i * 0.015,
        height: 20 + i * 8,
      });
    }

    // --- Register firefly-like magical sparkle particles ---
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.15,
        radius: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });
  }

  private _updateAvalon(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;

    // Animated water ripples
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        const yOff = Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude;
        g.lineTo(x, r.y + yOff);
      }
      g.lineTo(sw, r.y);
      g.stroke({ color: 0x6699aa, width: 0.8, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }

    // Animated glow spots on water
    const waterY = this._floorY + 18;
    for (let i = 0; i < 4; i++) {
      const gx = sw * 0.2 + i * sw * 0.2 + Math.sin(time * 0.3 + i * 2) * 15;
      const gy = waterY + 10 + Math.sin(time * 0.5 + i) * 5;
      const gAlpha = 0.08 + Math.sin(time * 0.7 + i * 1.5) * 0.04;
      g.circle(gx, gy, 10);
      g.fill({ color: 0x88ccff, alpha: gAlpha });
      g.circle(gx, gy, 4);
      g.fill({ color: 0xaaddff, alpha: gAlpha * 1.5 });
    }

    // Animated rolling mist layers
    for (const m of this._mistLayers) {
      const offset = (time * m.speed + m.offset) % (sw + 200) - 100;
      // Draw several mist blobs per layer
      for (let i = 0; i < 6; i++) {
        const mx = (offset + i * (sw / 5)) % (sw + 100) - 50;
        const pulse = Math.sin(time * 0.4 + i + m.y * 0.01) * 0.02;
        g.ellipse(mx, m.y, 60 + i * 10, m.height * 0.5);
        g.fill({ color: 0xaabbcc, alpha: m.alpha + pulse });
      }
    }

    // Animated magical sparkle particles (fireflies)
    for (const p of this._particles) {
      // Update position
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.2;
      p.y += p.vy + Math.cos(time * 1.2 + p.phase) * 0.15;
      // Wrap around
      if (p.y < this._floorY * 0.3) {
        p.y = this._floorY * 0.9;
        p.x = Math.random() * sw;
      }
      if (p.x < -10) p.x = sw + 10;
      if (p.x > sw + 10) p.x = -10;
      // Pulsing alpha
      const pulseAlpha = p.alpha * (0.5 + Math.sin(time * 2 + p.phase) * 0.5);
      // Glow
      g.circle(p.x, p.y, p.radius + 3);
      g.fill({ color: p.color, alpha: pulseAlpha * 0.2 });
      // Core
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulseAlpha });
    }
  }

  // =========================================================================
  // EXCALIBUR'S STONE
  // =========================================================================

  private _buildExcalibur(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Deep dark sky ---
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Subtle color at horizon
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: a.skyBottom, alpha: 0.3 });

    // --- Stars (register for twinkling animation) ---
    for (let i = 0; i < 60; i++) {
      const sx = Math.sin(i * 7.3 + 1.2) * sw * 0.48 + sw * 0.5;
      const sy = Math.cos(i * 4.1 + 0.8) * floorY * 0.35 + floorY * 0.18;
      const sr = 0.5 + Math.sin(i * 3.3) * 0.5;
      const baseAlpha = 0.4 + Math.sin(i * 2.1) * 0.3;
      this._stars.push({
        x: sx, y: sy, radius: sr,
        baseAlpha, twinkleSpeed: 1 + Math.sin(i) * 1.5, phase: i * 1.7,
      });
      // Static star base
      g.circle(sx, sy, sr);
      g.fill({ color: 0xffffff, alpha: baseAlpha * 0.5 });
    }

    // --- Large crescent moon with glow ---
    const moonX = sw * 0.78;
    const moonY = floorY * 0.18;
    // Moon glow layers
    for (let r = 50; r > 0; r -= 4) {
      g.circle(moonX, moonY, r);
      g.fill({ color: 0xeeddcc, alpha: 0.005 });
    }
    // Moon body
    g.circle(moonX, moonY, 28);
    g.fill({ color: 0xeeeedd, alpha: 0.85 });
    // Crescent cutout
    g.circle(moonX + 10, moonY - 6, 23);
    g.fill({ color: a.skyTop });
    // Moonbeam illuminating the sword (center)
    const beamCX = sw / 2;
    g.moveTo(moonX - 15, moonY + 20);
    g.lineTo(moonX + 5, moonY + 20);
    g.lineTo(beamCX + 35, floorY);
    g.lineTo(beamCX - 35, floorY);
    g.closePath();
    g.fill({ color: 0xeeddcc, alpha: 0.035 });
    g.moveTo(moonX - 8, moonY + 20);
    g.lineTo(moonX, moonY + 20);
    g.lineTo(beamCX + 18, floorY);
    g.lineTo(beamCX - 18, floorY);
    g.closePath();
    g.fill({ color: 0xeeddcc, alpha: 0.025 });

    // --- Dense dark forest backdrop (layer 1 – furthest) ---
    for (let i = 0; i < 18; i++) {
      const tx = i * (sw / 17) - 10 + Math.sin(i * 2.7) * 15;
      const th = 60 + (i % 5) * 18 + Math.sin(i * 1.3) * 10;
      const treeBot = floorY * 0.65 + (i % 3) * 8;
      // Trunk
      g.rect(tx - 3, treeBot - th, 6, th);
      g.fill({ color: 0x0e1a0e, alpha: 0.4 });
      // Tree top (triangular, layered)
      for (let j = 0; j < 3; j++) {
        const layerH = 22 + j * 6;
        const layerW = 18 + j * 6;
        const layerY = treeBot - th - 10 + j * 14;
        g.moveTo(tx, layerY);
        g.lineTo(tx - layerW, layerY + layerH);
        g.lineTo(tx + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x0e1a0e, alpha: 0.35 });
      }
    }

    // --- Forest backdrop (layer 2 – middle) ---
    for (let i = 0; i < 14; i++) {
      const tx = i * (sw / 13) - 5 + Math.sin(i * 3.2 + 1) * 20;
      const th = 80 + (i % 4) * 22;
      const treeBot = floorY * 0.72 + (i % 3) * 6;
      g.rect(tx - 4, treeBot - th, 8, th);
      g.fill({ color: 0x111e11, alpha: 0.55 });
      for (let j = 0; j < 3; j++) {
        const layerH = 25 + j * 8;
        const layerW = 20 + j * 8;
        const layerY = treeBot - th - 12 + j * 16;
        g.moveTo(tx, layerY);
        g.lineTo(tx - layerW, layerY + layerH);
        g.lineTo(tx + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x142214, alpha: 0.5 });
      }
    }

    // --- Forest backdrop (layer 3 – closest, flanking) ---
    const closeTrees = [
      { x: -15, h: 150 }, { x: sw * 0.04, h: 140 },
      { x: sw * 0.1, h: 130 }, { x: sw * 0.16, h: 145 },
      { x: sw * 0.84, h: 135 }, { x: sw * 0.9, h: 148 },
      { x: sw * 0.96, h: 130 }, { x: sw + 15, h: 145 },
    ];
    for (const t of closeTrees) {
      const treeBot = floorY;
      g.rect(t.x - 6, treeBot - t.h, 12, t.h);
      g.fill({ color: 0x0c180c });
      for (let j = 0; j < 4; j++) {
        const layerH = 28 + j * 10;
        const layerW = 24 + j * 10;
        const layerY = treeBot - t.h - 15 + j * 18;
        g.moveTo(t.x, layerY);
        g.lineTo(t.x - layerW, layerY + layerH);
        g.lineTo(t.x + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x1a2e1a, alpha: 0.7 });
      }
      // Roots at base
      for (let r = 0; r < 3; r++) {
        const rx = t.x + (r - 1) * 10;
        g.moveTo(t.x, treeBot - 5);
        g.quadraticCurveTo(rx, treeBot, rx + (r - 1) * 8, treeBot + 3);
        g.stroke({ color: 0x1a2a1a, width: 2, alpha: 0.6 });
      }
    }

    // --- Central sword-in-stone monument ---
    const stoneX = sw / 2;
    const stoneY = floorY - 3;

    // Large stone base with irregular shape
    g.moveTo(stoneX - 38, stoneY);
    g.lineTo(stoneX - 35, stoneY - 22);
    g.lineTo(stoneX - 28, stoneY - 32);
    g.lineTo(stoneX - 18, stoneY - 38);
    g.lineTo(stoneX - 5, stoneY - 42);
    g.lineTo(stoneX + 8, stoneY - 40);
    g.lineTo(stoneX + 22, stoneY - 34);
    g.lineTo(stoneX + 32, stoneY - 24);
    g.lineTo(stoneX + 38, stoneY - 10);
    g.lineTo(stoneX + 40, stoneY);
    g.closePath();
    g.fill({ color: 0x556655 });
    g.moveTo(stoneX - 38, stoneY);
    g.lineTo(stoneX - 35, stoneY - 22);
    g.lineTo(stoneX - 28, stoneY - 32);
    g.lineTo(stoneX - 18, stoneY - 38);
    g.lineTo(stoneX - 5, stoneY - 42);
    g.lineTo(stoneX + 8, stoneY - 40);
    g.lineTo(stoneX + 22, stoneY - 34);
    g.lineTo(stoneX + 32, stoneY - 24);
    g.lineTo(stoneX + 38, stoneY - 10);
    g.lineTo(stoneX + 40, stoneY);
    g.closePath();
    g.stroke({ color: 0x445544, width: 1.5 });

    // Stone texture cracks
    g.moveTo(stoneX - 20, stoneY - 35);
    g.lineTo(stoneX - 15, stoneY - 20);
    g.lineTo(stoneX - 22, stoneY - 10);
    g.stroke({ color: 0x4a5a4a, width: 0.8 });
    g.moveTo(stoneX + 15, stoneY - 32);
    g.lineTo(stoneX + 10, stoneY - 18);
    g.stroke({ color: 0x4a5a4a, width: 0.8 });

    // Moss on stone
    g.ellipse(stoneX - 25, stoneY - 18, 10, 5);
    g.fill({ color: 0x336633, alpha: 0.5 });
    g.ellipse(stoneX + 18, stoneY - 12, 8, 4);
    g.fill({ color: 0x2a5a2a, alpha: 0.45 });
    g.ellipse(stoneX + 5, stoneY - 5, 12, 4);
    g.fill({ color: 0x336633, alpha: 0.4 });

    // Sword slit in stone
    g.rect(stoneX - 3, stoneY - 42, 6, 10);
    g.fill({ color: 0x3a3a44 });

    // Excalibur blade
    g.moveTo(stoneX, stoneY - 90);
    g.lineTo(stoneX - 3.5, stoneY - 42);
    g.lineTo(stoneX + 3.5, stoneY - 42);
    g.closePath();
    g.fill({ color: 0xccccdd });
    // Blade edge highlight
    g.moveTo(stoneX, stoneY - 88);
    g.lineTo(stoneX - 1, stoneY - 44);
    g.stroke({ color: 0xeeeeff, width: 1, alpha: 0.6 });

    // Blade fuller (center groove)
    g.moveTo(stoneX, stoneY - 85);
    g.lineTo(stoneX, stoneY - 48);
    g.stroke({ color: 0xaaaabc, width: 1.5, alpha: 0.5 });

    // Crossguard
    g.moveTo(stoneX - 14, stoneY - 44);
    g.lineTo(stoneX - 16, stoneY - 40);
    g.lineTo(stoneX + 16, stoneY - 40);
    g.lineTo(stoneX + 14, stoneY - 44);
    g.closePath();
    g.fill({ color: 0xddaa33 });
    g.moveTo(stoneX - 14, stoneY - 44);
    g.lineTo(stoneX - 16, stoneY - 40);
    g.lineTo(stoneX + 16, stoneY - 40);
    g.lineTo(stoneX + 14, stoneY - 44);
    g.closePath();
    g.stroke({ color: 0xbb8822, width: 1 });

    // Grip
    g.rect(stoneX - 2.5, stoneY - 40, 5, 10);
    g.fill({ color: 0x553311 });
    // Grip wrap lines
    for (let gy = stoneY - 39; gy < stoneY - 31; gy += 2.5) {
      g.moveTo(stoneX - 2.5, gy).lineTo(stoneX + 2.5, gy + 1.5);
      g.stroke({ color: 0x442200, width: 0.6 });
    }

    // Pommel
    g.circle(stoneX, stoneY - 30, 4);
    g.fill({ color: 0xddaa33 });
    g.circle(stoneX, stoneY - 30, 4);
    g.stroke({ color: 0xbb8822, width: 1 });
    // Pommel jewel
    g.circle(stoneX, stoneY - 30, 1.8);
    g.fill({ color: 0xff4444, alpha: 0.8 });

    // Static golden glow around sword
    for (let r = 35; r > 0; r -= 3) {
      g.circle(stoneX, stoneY - 55, r);
      g.fill({ color: a.accentColor, alpha: 0.008 });
    }

    // --- Moss-covered boulders and rocks scattered around ---
    const boulders = [
      { x: sw * 0.15, y: floorY, rx: 28, ry: 14 },
      { x: sw * 0.28, y: floorY + 2, rx: 18, ry: 9 },
      { x: sw * 0.72, y: floorY + 1, rx: 22, ry: 11 },
      { x: sw * 0.85, y: floorY, rx: 30, ry: 15 },
      { x: sw * 0.38, y: floorY + 3, rx: 12, ry: 6 },
      { x: sw * 0.62, y: floorY + 2, rx: 14, ry: 7 },
    ];
    for (const b of boulders) {
      // Rock body
      g.ellipse(b.x, b.y, b.rx, b.ry);
      g.fill({ color: 0x445544 });
      g.ellipse(b.x, b.y, b.rx, b.ry);
      g.stroke({ color: 0x3a4a3a, width: 1 });
      // Highlight
      g.ellipse(b.x - b.rx * 0.2, b.y - b.ry * 0.4, b.rx * 0.5, b.ry * 0.4);
      g.fill({ color: 0x556655, alpha: 0.4 });
      // Moss
      g.ellipse(b.x + b.rx * 0.1, b.y - b.ry * 0.5, b.rx * 0.6, b.ry * 0.3);
      g.fill({ color: 0x336633, alpha: 0.5 });
    }

    // --- Forest floor: dark earth with roots, leaves, and mossy patches ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Floor highlight
    g.rect(0, floorY, sw, 2);
    g.fill({ color: a.groundHighlight, alpha: 0.3 });

    // Dark earthy texture bands
    for (let y = floorY + 6; y < sh; y += 10) {
      const alpha = 0.05 + Math.sin(y * 0.3) * 0.03;
      g.rect(0, y, sw, 4);
      g.fill({ color: 0x221a11, alpha });
    }

    // Root-like lines across the ground
    const rootPaths = [
      { sx: sw * 0.1, sy: floorY + 2, ex: sw * 0.25, ey: floorY + 8 },
      { sx: sw * 0.18, sy: floorY + 1, ex: sw * 0.35, ey: floorY + 10 },
      { sx: sw * 0.65, sy: floorY + 3, ex: sw * 0.82, ey: floorY + 7 },
      { sx: sw * 0.78, sy: floorY + 1, ex: sw * 0.92, ey: floorY + 9 },
    ];
    for (const rp of rootPaths) {
      g.moveTo(rp.sx, rp.sy);
      g.quadraticCurveTo((rp.sx + rp.ex) / 2, rp.sy + 6, rp.ex, rp.ey);
      g.stroke({ color: 0x2a2210, width: 2, alpha: 0.4 });
    }

    // Fallen leaves
    for (let i = 0; i < 30; i++) {
      const lx = Math.sin(i * 5.7 + 0.3) * sw * 0.48 + sw * 0.5;
      const ly = floorY + 3 + (i % 6) * 5;
      const lr = 2 + (i % 3);
      const leafColor = i % 3 === 0 ? 0x664422 : i % 3 === 1 ? 0x554411 : 0x885522;
      g.ellipse(lx, ly, lr, lr * 0.5);
      g.fill({ color: leafColor, alpha: 0.35 });
    }

    // Mossy patches on ground
    const mossPatches = [sw * 0.2, sw * 0.4, sw * 0.6, sw * 0.8];
    for (const mx of mossPatches) {
      g.ellipse(mx, floorY + 4, 20, 4);
      g.fill({ color: 0x2a5522, alpha: 0.25 });
    }

    // Twigs
    for (let i = 0; i < 8; i++) {
      const tx = Math.sin(i * 9 + 2) * sw * 0.4 + sw * 0.5;
      const ty = floorY + 2 + (i % 4) * 4;
      const tLen = 8 + (i % 3) * 4;
      const tAngle = Math.sin(i * 3) * 0.3;
      g.moveTo(tx, ty);
      g.lineTo(tx + Math.cos(tAngle) * tLen, ty + Math.sin(tAngle) * 2);
      g.stroke({ color: 0x3a2a1a, width: 1.2, alpha: 0.35 });
    }

    // --- Register magical mist particles rising from ground ---
    for (let i = 0; i < 18; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.2 - Math.random() * 0.3,
        radius: 1 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }

    // --- Register fireflies ---
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.5 + Math.random() * floorY * 0.45,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 1 + Math.random() * 1.2,
        alpha: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: 0x88ff88,
      });
    }

    // --- Register mist layers ---
    for (let i = 0; i < 4; i++) {
      this._mistLayers.push({
        y: floorY - 10 + i * 8,
        speed: 3 + i * 2,
        offset: i * 150,
        alpha: 0.04 + i * 0.01,
        height: 14 + i * 4,
      });
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _updateExcalibur(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    const floorY = this._floorY;
    const a = this._arena!;

    // Twinkling stars
    for (const s of this._stars) {
      const twinkle = 0.5 + Math.sin(time * s.twinkleSpeed + s.phase) * 0.5;
      const alpha = s.baseAlpha * twinkle;
      if (alpha > 0.15) {
        g.circle(s.x, s.y, s.radius + twinkle * 0.5);
        g.fill({ color: 0xffffff, alpha });
        // Star glow for bright ones
        if (alpha > 0.5) {
          g.circle(s.x, s.y, s.radius + 3);
          g.fill({ color: 0xccddff, alpha: alpha * 0.15 });
        }
      }
    }

    // Animated magical glow/particles around the sword
    const stoneX = sw / 2;
    const stoneY = floorY - 3;
    // Pulsing sword glow
    const glowPulse = 0.5 + Math.sin(time * 1.2) * 0.3;
    for (let r = 30; r > 0; r -= 4) {
      g.circle(stoneX, stoneY - 55, r);
      g.fill({ color: a.accentColor, alpha: 0.012 * glowPulse });
    }
    // Orbiting sparkles around the sword
    for (let i = 0; i < 6; i++) {
      const angle = time * 0.8 + (i / 6) * Math.PI * 2;
      const orbitR = 18 + Math.sin(time * 1.5 + i) * 5;
      const ox = stoneX + Math.cos(angle) * orbitR;
      const oy = stoneY - 55 + Math.sin(angle) * orbitR * 0.5;
      const oAlpha = 0.4 + Math.sin(time * 2 + i * 1.3) * 0.3;
      g.circle(ox, oy, 1.5);
      g.fill({ color: a.accentColor, alpha: oAlpha });
      g.circle(ox, oy, 4);
      g.fill({ color: a.accentColor, alpha: oAlpha * 0.15 });
    }

    // Animated mist rising from ground
    for (const m of this._mistLayers) {
      const offset = (time * m.speed + m.offset) % (sw + 200) - 100;
      for (let i = 0; i < 5; i++) {
        const mx = (offset + i * (sw / 4)) % (sw + 100) - 50;
        const pulse = Math.sin(time * 0.3 + i + m.y * 0.02) * 0.015;
        g.ellipse(mx, m.y, 50 + i * 8, m.height * 0.5);
        g.fill({ color: 0x224433, alpha: m.alpha + pulse });
      }
    }

    // Animated particles (magical mist + fireflies)
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.15;
      p.y += p.vy + Math.cos(time * 0.8 + p.phase) * 0.1;

      // Wrap/reset
      if (p.color === 0x88ff88) {
        // Fireflies: wander
        if (p.y < floorY * 0.3) p.vy = Math.abs(p.vy);
        if (p.y > floorY - 5) p.vy = -Math.abs(p.vy);
        if (p.x < -10) p.x = sw + 10;
        if (p.x > sw + 10) p.x = -10;
      } else {
        // Magic mist: rise and reset
        if (p.y < floorY * 0.4) {
          p.y = floorY - Math.random() * 10;
          p.x = Math.random() * sw;
        }
      }

      const pulseAlpha = p.alpha * (0.4 + Math.sin(time * 2.5 + p.phase) * 0.6);
      // Glow
      g.circle(p.x, p.y, p.radius + 3);
      g.fill({ color: p.color, alpha: pulseAlpha * 0.15 });
      // Core
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: pulseAlpha });
    }
  }

  // =========================================================================
  // GENERIC FALLBACK
  // =========================================================================

  // =========================================================================
  // BROCÉLIANDE FOREST — enchanted woodland, ancient oaks, fireflies, roots
  // =========================================================================

  private _buildBroceliande(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Deep forest canopy sky (very dark greens) ---
    const skyBands = 10;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, floorY * t, sw, floorY / skyBands + 1);
      g.fill({ color: col });
    }

    // --- Dappled light beams through canopy ---
    const beams = [sw * 0.15, sw * 0.4, sw * 0.65, sw * 0.85];
    for (const bx of beams) {
      g.moveTo(bx - 10, 0);
      g.lineTo(bx + 15, 0);
      g.lineTo(bx + 40, floorY);
      g.lineTo(bx - 20, floorY);
      g.closePath();
      g.fill({ color: 0x88cc66, alpha: 0.03 });
    }

    // --- Distant tree layer (far silhouettes) ---
    for (let x = -20; x < sw + 20; x += 50 + Math.sin(x * 0.02) * 20) {
      const h = floorY * (0.3 + Math.sin(x * 0.03) * 0.08);
      const treeY = floorY - h;
      const trunkW = 8 + Math.sin(x * 0.07) * 3;
      // Trunk
      g.rect(x - trunkW / 2, treeY + h * 0.4, trunkW, h * 0.6);
      g.fill({ color: 0x1a2a18, alpha: 0.4 });
      // Canopy
      g.circle(x, treeY + h * 0.25, h * 0.35);
      g.fill({ color: 0x1a3322, alpha: 0.45 });
      g.circle(x - 8, treeY + h * 0.3, h * 0.25);
      g.fill({ color: 0x162a1c, alpha: 0.4 });
    }

    // --- Large foreground trees (left and right frame) ---
    // Left massive oak
    const oakLX = sw * 0.02;
    g.rect(oakLX - 18, floorY * 0.2, 36, floorY * 0.8);
    g.fill({ color: 0x2a1a10 });
    // Bark texture
    for (let y = floorY * 0.25; y < floorY; y += 12) {
      g.moveTo(oakLX - 14, y);
      g.quadraticCurveTo(oakLX - 10, y + 6, oakLX - 15, y + 12);
      g.stroke({ color: 0x221508, width: 1.5, alpha: 0.4 });
    }
    // Left canopy
    g.circle(oakLX - 5, floorY * 0.15, 60);
    g.fill({ color: 0x1a3322, alpha: 0.6 });
    g.circle(oakLX + 20, floorY * 0.1, 45);
    g.fill({ color: 0x224428, alpha: 0.5 });
    // Hanging moss
    for (let i = 0; i < 5; i++) {
      const mx = oakLX - 30 + i * 14;
      const my = floorY * 0.22 + i * 4;
      g.moveTo(mx, my);
      g.quadraticCurveTo(mx + 2, my + 18, mx - 2, my + 30);
      g.stroke({ color: 0x446633, width: 2, alpha: 0.3 });
    }

    // Right massive oak
    const oakRX = sw * 0.98;
    g.rect(oakRX - 16, floorY * 0.15, 32, floorY * 0.85);
    g.fill({ color: 0x2a1a10 });
    for (let y = floorY * 0.2; y < floorY; y += 12) {
      g.moveTo(oakRX + 12, y);
      g.quadraticCurveTo(oakRX + 8, y + 6, oakRX + 13, y + 12);
      g.stroke({ color: 0x221508, width: 1.5, alpha: 0.4 });
    }
    g.circle(oakRX + 5, floorY * 0.1, 55);
    g.fill({ color: 0x1a3322, alpha: 0.6 });
    g.circle(oakRX - 20, floorY * 0.08, 40);
    g.fill({ color: 0x224428, alpha: 0.5 });

    // --- Gnarled roots across the ground ---
    const rootPositions = [sw * 0.08, sw * 0.25, sw * 0.5, sw * 0.72, sw * 0.9];
    for (const rx of rootPositions) {
      const rw = 30 + Math.sin(rx) * 15;
      g.moveTo(rx - rw / 2, floorY);
      g.quadraticCurveTo(rx - rw / 4, floorY - 8, rx, floorY - 4);
      g.quadraticCurveTo(rx + rw / 4, floorY - 10, rx + rw / 2, floorY);
      g.stroke({ color: 0x3a2a18, width: 5, cap: "round" });
      g.moveTo(rx - rw / 2, floorY);
      g.quadraticCurveTo(rx - rw / 4, floorY - 6, rx, floorY - 2);
      g.quadraticCurveTo(rx + rw / 4, floorY - 8, rx + rw / 2, floorY);
      g.stroke({ color: 0x4a3a22, width: 3, cap: "round" });
    }

    // --- Mushroom patches ---
    const mushPositions = [sw * 0.15, sw * 0.38, sw * 0.62, sw * 0.85];
    for (const mx of mushPositions) {
      // Stem
      g.rect(mx - 2, floorY - 8, 4, 8);
      g.fill({ color: 0xccbb99 });
      // Cap
      g.arc(mx, floorY - 8, 7, Math.PI, 0);
      g.fill({ color: 0xcc4433 });
      // Spots
      g.circle(mx - 2, floorY - 11, 1.5);
      g.fill({ color: 0xeeddcc });
      g.circle(mx + 3, floorY - 10, 1.2);
      g.fill({ color: 0xeeddcc });
    }

    // --- Standing stone (druidic menhir) in background center ---
    const stoneX = sw * 0.5;
    const stoneY = floorY - 60;
    g.moveTo(stoneX - 14, floorY);
    g.lineTo(stoneX - 10, stoneY);
    g.quadraticCurveTo(stoneX, stoneY - 10, stoneX + 10, stoneY);
    g.lineTo(stoneX + 14, floorY);
    g.closePath();
    g.fill({ color: 0x555555, alpha: 0.5 });
    // Rune carvings
    g.moveTo(stoneX - 3, stoneY + 10);
    g.lineTo(stoneX, stoneY + 5);
    g.lineTo(stoneX + 3, stoneY + 10);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.4 });
    g.moveTo(stoneX, stoneY + 15);
    g.lineTo(stoneX, stoneY + 28);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.3 });

    // --- Forest floor ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Leaf litter texture
    for (let x = 0; x < sw; x += 12) {
      const seed = Math.sin(x * 0.4) * 0.5 + 0.5;
      if (seed > 0.4) {
        g.circle(x + 4, floorY + 4 + seed * 4, 3 + seed * 2);
        g.fill({ color: seed > 0.7 ? 0x443318 : 0x3a2a15, alpha: 0.3 });
      }
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // Register firefly particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 1.5 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? 0x88ff66 : 0xffee44,
      });
    }

    // Register mist layers
    for (let i = 0; i < 4; i++) {
      this._mistLayers.push({
        y: floorY - 20 + i * 8,
        speed: 0.3 + i * 0.15,
        offset: i * 100,
        alpha: 0.06 - i * 0.01,
        height: 30 + i * 10,
      });
    }
  }

  private _updateBroceliande(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;

    // Fireflies — glowing dots drifting lazily
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.3;
      p.y += p.vy + Math.cos(time * 0.6 + p.phase) * 0.2;
      // Wrap around
      if (p.x < -10) p.x = sw + 10;
      if (p.x > sw + 10) p.x = -10;

      const pulse = 0.4 + Math.sin(time * 2 + p.phase) * 0.3 + Math.sin(time * 5.3 + p.phase * 2) * 0.15;
      // Glow
      g.circle(p.x, p.y, p.radius * 3 + pulse * 2);
      g.fill({ color: p.color, alpha: pulse * 0.08 });
      // Core
      g.circle(p.x, p.y, p.radius * (0.5 + pulse * 0.5));
      g.fill({ color: p.color, alpha: pulse * 0.7 });
      // Bright center
      g.circle(p.x, p.y, p.radius * 0.3);
      g.fill({ color: 0xffffff, alpha: pulse * 0.5 });
    }

    // Ground mist drifting
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 40 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 80) {
        const mx = x + offset;
        const wave = Math.sin(time * 0.5 + x * 0.01) * 8;
        g.ellipse(mx % (sw + 200) - 100, m.y + wave, 60, m.height / 2);
        g.fill({ color: 0x446644, alpha: m.alpha });
      }
    }
  }

  // =========================================================================
  // TINTAGEL CLIFFS — windswept coastal cliffs, crashing waves, ruins, gulls
  // =========================================================================

  private _buildTintagel(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Stormy sky gradient (dark slate to grey-blue) ---
    const skyBands = 12;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, floorY * t, sw, floorY / skyBands + 1);
      g.fill({ color: col });
    }

    // --- Storm clouds ---
    const cloudPositions = [
      { x: sw * 0.1, y: floorY * 0.08, r: 45 },
      { x: sw * 0.25, y: floorY * 0.05, r: 55 },
      { x: sw * 0.4, y: floorY * 0.1, r: 40 },
      { x: sw * 0.6, y: floorY * 0.06, r: 50 },
      { x: sw * 0.8, y: floorY * 0.09, r: 48 },
      { x: sw * 0.15, y: floorY * 0.14, r: 35 },
      { x: sw * 0.5, y: floorY * 0.13, r: 42 },
      { x: sw * 0.75, y: floorY * 0.04, r: 52 },
      { x: sw * 0.9, y: floorY * 0.12, r: 38 },
    ];
    for (const c of cloudPositions) {
      g.circle(c.x, c.y, c.r);
      g.fill({ color: 0x3a4455, alpha: 0.5 });
      g.circle(c.x + c.r * 0.4, c.y - c.r * 0.15, c.r * 0.7);
      g.fill({ color: 0x445566, alpha: 0.4 });
    }

    // --- Distant ocean (mid-background) ---
    const seaY = floorY * 0.55;
    g.rect(0, seaY, sw, floorY - seaY);
    g.fill({ color: 0x334455 });
    // Horizon line
    g.rect(0, seaY, sw, 2);
    g.fill({ color: 0x667788, alpha: 0.5 });
    // Ocean wave lines
    for (let y = seaY + 10; y < floorY * 0.75; y += 8) {
      for (let x = 0; x < sw; x += 40) {
        const wx = x + Math.sin(y * 0.1) * 10;
        g.moveTo(wx, y);
        g.quadraticCurveTo(wx + 12, y - 2, wx + 24, y);
        g.stroke({ color: 0x556677, width: 1, alpha: 0.3 });
      }
    }

    // --- Cliff face (main fighting platform) ---
    const cliffTop = floorY * 0.7;
    // Cliff body — rugged stone
    g.moveTo(0, cliffTop);
    g.lineTo(sw, cliffTop);
    g.lineTo(sw, floorY + 20);
    g.lineTo(0, floorY + 20);
    g.closePath();
    g.fill({ color: 0x555550 });

    // Cliff edge — jagged top
    for (let x = 0; x < sw; x += 16) {
      const jag = Math.sin(x * 0.2) * 4 + Math.sin(x * 0.5) * 2;
      g.rect(x, cliffTop + jag - 3, 14, 6);
      g.fill({ color: 0x605850 });
    }

    // Rock strata lines
    for (let y = cliffTop + 12; y < floorY; y += 14) {
      g.moveTo(0, y + Math.sin(y * 0.1) * 3);
      for (let x = 0; x < sw; x += 30) {
        g.lineTo(x + 30, y + Math.sin((x + y) * 0.08) * 4);
      }
      g.stroke({ color: 0x4a4a44, width: 0.8, alpha: 0.4 });
    }

    // --- Castle ruins (broken walls, columns) ---
    // Left ruin wall
    const ruinLX = sw * 0.08;
    g.rect(ruinLX, cliffTop - 70, 14, 70);
    g.fill({ color: 0x6a6a62 });
    g.rect(ruinLX, cliffTop - 80, 20, 15);
    g.fill({ color: 0x6a6a62 });
    // Broken top (jagged)
    g.moveTo(ruinLX, cliffTop - 80);
    g.lineTo(ruinLX + 6, cliffTop - 90);
    g.lineTo(ruinLX + 12, cliffTop - 82);
    g.lineTo(ruinLX + 20, cliffTop - 88);
    g.lineTo(ruinLX + 20, cliffTop - 80);
    g.closePath();
    g.fill({ color: 0x6a6a62 });
    // Stone lines
    for (let y = cliffTop - 75; y < cliffTop; y += 10) {
      g.moveTo(ruinLX + 1, y).lineTo(ruinLX + 13, y);
      g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.5 });
    }

    // Right ruin tower (taller, partially standing)
    const ruinRX = sw * 0.88;
    g.rect(ruinRX, cliffTop - 110, 18, 110);
    g.fill({ color: 0x6a6a62 });
    // Arched window
    g.roundRect(ruinRX + 4, cliffTop - 90, 10, 18, 5);
    g.fill({ color: 0x222233 });
    // Broken top
    g.moveTo(ruinRX, cliffTop - 110);
    g.lineTo(ruinRX + 4, cliffTop - 120);
    g.lineTo(ruinRX + 10, cliffTop - 112);
    g.lineTo(ruinRX + 14, cliffTop - 125);
    g.lineTo(ruinRX + 18, cliffTop - 115);
    g.lineTo(ruinRX + 18, cliffTop - 110);
    g.closePath();
    g.fill({ color: 0x6a6a62 });
    // Stone texture
    for (let y = cliffTop - 105; y < cliffTop; y += 10) {
      g.moveTo(ruinRX + 1, y).lineTo(ruinRX + 17, y);
      g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.5 });
    }

    // Center arch ruin (broken gateway)
    const archX = sw * 0.48;
    // Left pillar
    g.rect(archX - 20, cliffTop - 60, 12, 60);
    g.fill({ color: 0x6a6a62 });
    // Right pillar
    g.rect(archX + 12, cliffTop - 55, 12, 55);
    g.fill({ color: 0x6a6a62 });
    // Partial arch (broken)
    g.arc(archX + 2, cliffTop - 50, 22, Math.PI, Math.PI + 0.8);
    g.stroke({ color: 0x6a6a62, width: 10 });

    // Scattered rubble
    const rubble = [sw * 0.2, sw * 0.35, sw * 0.55, sw * 0.75];
    for (const rx of rubble) {
      for (let i = 0; i < 3; i++) {
        const bx = rx + i * 8 - 8;
        const bw = 6 + Math.sin(bx) * 3;
        const bh = 4 + Math.cos(bx) * 2;
        g.roundRect(bx, floorY - bh, bw, bh, 1);
        g.fill({ color: 0x666660, alpha: 0.6 });
      }
    }

    // --- Grass tufts on cliff edge ---
    for (let x = 10; x < sw; x += 20 + Math.sin(x * 0.3) * 8) {
      const gy = cliffTop - 2;
      for (let b = 0; b < 3; b++) {
        const bx = x + b * 3 - 3;
        g.moveTo(bx, gy);
        g.quadraticCurveTo(bx - 2, gy - 10, bx + 1, gy - 14);
        g.stroke({ color: 0x556633, width: 1.5, alpha: 0.5 });
      }
    }

    // --- Fighting platform (cliff top surface) ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Stone texture on ground
    let tileRow = 0;
    for (let y = floorY + 2; y < sh; y += 18) {
      const off = (tileRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.roundRect(x + 1, y + 1, 38, 16, 2);
        g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.2 });
      }
      tileRow++;
    }

    // --- Sea spray / fog ---
    g.rect(0, cliffTop * 0.8, sw, floorY * 0.3);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // Register particles for sea spray
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.6 + Math.random() * floorY * 0.3,
        vx: 0.5 + Math.random() * 0.8,
        vy: -0.3 - Math.random() * 0.5,
        radius: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        color: 0xccddee,
      });
    }

    // Register mist layers (sea fog)
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY * 0.65 + i * 15,
        speed: 0.6 + i * 0.2,
        offset: i * 120,
        alpha: 0.04,
        height: 25 + i * 8,
      });
    }
  }

  private _updateTintagel(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    const floorY = this._floorY;

    // Ocean waves (animated undulation on the sea surface)
    const seaY = floorY * 0.55;
    for (let y = seaY + 4; y < floorY * 0.72; y += 6) {
      const waveOffset = time * 30 + y * 2;
      g.moveTo(0, y);
      for (let x = 0; x < sw; x += 8) {
        const wy = y + Math.sin((x + waveOffset) * 0.04) * 2.5;
        g.lineTo(x, wy);
      }
      g.stroke({ color: 0x667788, width: 1, alpha: 0.15 + Math.sin(time + y * 0.1) * 0.05 });
    }

    // White wave crests (foam lines)
    for (let i = 0; i < 3; i++) {
      const wy = seaY + 15 + i * 20;
      const wavePhase = time * (1.2 + i * 0.3);
      for (let x = 0; x < sw; x += 60) {
        const cx = x + Math.sin(wavePhase + x * 0.01) * 20;
        const cy = wy + Math.sin(wavePhase * 1.5 + x * 0.02) * 3;
        g.moveTo(cx, cy);
        g.lineTo(cx + 18, cy - 1);
        g.stroke({ color: 0xccddee, width: 1.5, alpha: 0.15 + Math.sin(time * 2 + i + x * 0.01) * 0.1 });
      }
    }

    // Sea spray particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.5;
      p.y += p.vy + Math.sin(time + p.phase) * 0.3;
      // Reset when drifted off
      if (p.x > sw + 20 || p.y < floorY * 0.3) {
        p.x = Math.random() * sw * 0.3;
        p.y = floorY * 0.6 + Math.random() * floorY * 0.25;
      }
      const fade = 0.5 + Math.sin(time * 3 + p.phase) * 0.3;
      g.circle(p.x, p.y, p.radius * fade);
      g.fill({ color: p.color, alpha: p.alpha * fade });
    }

    // Sea fog drifting
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 25 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 90) {
        const mx = (x + offset) % (sw + 200) - 100;
        const wave = Math.sin(time * 0.4 + x * 0.008) * 5;
        g.ellipse(mx, m.y + wave, 70, m.height / 2);
        g.fill({ color: 0x889999, alpha: m.alpha });
      }
    }
  }

  private _buildGeneric(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;
    // Simple sky
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.skyBottom, alpha: 0.4 });
    // Ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
  }
}
