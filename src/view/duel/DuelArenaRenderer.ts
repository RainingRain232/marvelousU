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
      case "camelot": this._build_camelot(this._arena, sw, sh); break;
      case "avalon": this._build_avalon(this._arena, sw, sh); break;
      case "excalibur": this._build_excalibur(this._arena, sw, sh); break;
      case "broceliande": this._build_broceliande(this._arena, sw, sh); break;
      case "tintagel": this._build_tintagel(this._arena, sw, sh); break;
      case "round_table": this._build_round_table(this._arena, sw, sh); break;
      case "mordred_throne": this._build_mordred_throne(this._arena, sw, sh); break;
      case "glastonbury": this._build_glastonbury(this._arena, sw, sh); break;
      case "orkney": this._build_orkney(this._arena, sw, sh); break;
      case "lake": this._build_lake(this._arena, sw, sh); break;
      case "dragon_peak": this._build_dragon_peak(this._arena, sw, sh); break;
      case "grail_chapel": this._build_grail_chapel(this._arena, sw, sh); break;
      case "cornwall": this._build_cornwall(this._arena, sw, sh); break;
      case "shadow_keep": this._build_shadow_keep(this._arena, sw, sh); break;
      case "camlann": this._build_camlann(this._arena, sw, sh); break;
      default: this._buildGeneric(this._arena, sw, sh); break;
    }

    this.container.addChild(this._staticGfx);
    this.container.addChild(this._animGfx);
  }

  update(time: number): void {
    if (!this._arena) return;
    this._animGfx.clear();
    switch (this._arenaId) {
      case "camelot": this._update_camelot(time); break;
      case "avalon": this._update_avalon(time); break;
      case "excalibur": this._update_excalibur(time); break;
      case "broceliande": this._update_broceliande(time); break;
      case "tintagel": this._update_tintagel(time); break;
      case "round_table": this._update_round_table(time); break;
      case "mordred_throne": this._update_mordred_throne(time); break;
      case "glastonbury": this._update_glastonbury(time); break;
      case "orkney": this._update_orkney(time); break;
      case "lake": this._update_lake(time); break;
      case "dragon_peak": this._update_dragon_peak(time); break;
      case "grail_chapel": this._update_grail_chapel(time); break;
      case "cornwall": this._update_cornwall(time); break;
      case "shadow_keep": this._update_shadow_keep(time); break;
      case "camlann": this._update_camlann(time); break;
      default: this._updateGeneric(time); break;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // CAMELOT COURTYARD
  // =========================================================================

  private _build_camelot(a: DuelArenaDef, sw: number, sh: number): void {
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

  private _update_camelot(time: number): void {
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

  private _build_avalon(a: DuelArenaDef, sw: number, sh: number): void {
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

  private _update_avalon(time: number): void {
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

  private _build_excalibur(a: DuelArenaDef, sw: number, sh: number): void {
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

  private _update_excalibur(time: number): void {
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
  // Helper: draw a sky gradient from arena palette
  // =========================================================================

  private _drawSkyGradient(g: Graphics, a: DuelArenaDef, sw: number, floorY: number, bands = 12): void {
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const col = (Math.round(r1 + (r2 - r1) * t) << 16) |
                  (Math.round(g1 + (g2 - g1) * t) << 8) |
                   Math.round(b1 + (b2 - b1) * t);
      g.rect(0, floorY * t, sw, floorY / bands + 1);
      g.fill({ color: col });
    }
  }

  // =========================================================================
  // THE ROUND TABLE — Grand hall interior, circular table, candles, tapestries
  // =========================================================================

  private _build_round_table(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Dark interior ceiling
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Warm ambient light gradient from below
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: 0x332211, alpha: 0.3 });

    // Ceiling beams (heavy timber)
    for (let i = 0; i < 8; i++) {
      const bx = sw * (0.06 + i * 0.13);
      g.rect(bx - 4, 0, 8, floorY * 0.08);
      g.fill({ color: 0x3a2a18 });
      g.rect(bx - 3, 0, 6, floorY * 0.08);
      g.fill({ color: 0x4a3a28, alpha: 0.5 });
    }
    // Cross beams
    g.rect(0, floorY * 0.06, sw, 6);
    g.fill({ color: 0x3a2a18 });
    g.rect(0, floorY * 0.06, sw, 3);
    g.fill({ color: 0x4a3a28, alpha: 0.5 });

    // Vaulted ceiling arches
    for (let i = 0; i < 6; i++) {
      const cx = sw * (0.1 + i * 0.16);
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x3a2a22, width: 8 });
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x4a3a30, width: 4 });
      // Keystone detail
      g.rect(cx - 4, floorY * 0.08 - 4, 8, 8);
      g.fill({ color: 0x5a4a38 });
    }
    // Ceiling keystone line
    g.moveTo(0, floorY * 0.08);
    g.lineTo(sw, floorY * 0.08);
    g.stroke({ color: 0x4a3a30, width: 3 });

    // Back wall with rich stone
    const wallY = floorY * 0.12;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x443322 });
    // Stone block pattern
    for (let y = wallY + 10; y < floorY; y += 16) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x3a2a1a, width: 0.6, alpha: 0.4 });
    }
    let sRow = 0;
    for (let y = wallY; y < floorY; y += 16) {
      const off = (sRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.moveTo(x, y).lineTo(x, y + 16);
        g.stroke({ color: 0x3a2a1a, width: 0.5, alpha: 0.3 });
      }
      sRow++;
    }
    // Mortar highlights on wall
    for (let y = wallY + 10; y < floorY; y += 32) {
      g.moveTo(0, y + 1).lineTo(sw, y + 1);
      g.stroke({ color: 0x554433, width: 0.4, alpha: 0.2 });
    }

    // Grand fireplace (center back wall)
    const fpX = sw * 0.5;
    const fpY = floorY * 0.45;
    // Mantle
    g.rect(fpX - 50, fpY - 10, 100, 10);
    g.fill({ color: 0x5a4a38 });
    g.rect(fpX - 52, fpY - 12, 104, 4);
    g.fill({ color: 0x6a5a48 });
    // Firebox
    g.moveTo(fpX - 40, fpY);
    g.lineTo(fpX - 35, fpY - 50);
    g.quadraticCurveTo(fpX, fpY - 65, fpX + 35, fpY - 50);
    g.lineTo(fpX + 40, fpY);
    g.closePath();
    g.fill({ color: 0x1a0a00 });
    // Fire glow inside
    for (let r = 30; r > 0; r -= 5) {
      g.circle(fpX, fpY - 15, r);
      g.fill({ color: 0xff6622, alpha: 0.008 });
    }
    // Logs
    g.moveTo(fpX - 20, fpY - 5);
    g.lineTo(fpX + 15, fpY - 8);
    g.stroke({ color: 0x3a2a15, width: 5, cap: "round" });
    g.moveTo(fpX - 15, fpY - 3);
    g.lineTo(fpX + 20, fpY - 6);
    g.stroke({ color: 0x4a3a25, width: 4, cap: "round" });
    this._flames.push({ x: fpX, y: fpY - 20, baseRadius: 10, phase: 0 });
    this._flames.push({ x: fpX - 8, y: fpY - 16, baseRadius: 7, phase: 1.2 });
    this._flames.push({ x: fpX + 8, y: fpY - 16, baseRadius: 7, phase: 2.4 });

    // Large tapestries on back wall
    const tapestryXs = [sw * 0.1, sw * 0.28, sw * 0.72, sw * 0.9];
    const tapColors = [0xaa2222, 0x2244aa, 0xaa2222, 0x2244aa];
    for (let i = 0; i < tapestryXs.length; i++) {
      const tx = tapestryXs[i];
      const ty = wallY + 15;
      const tw = 44;
      const th = 90;
      // Rod with finials
      g.rect(tx - tw / 2 - 6, ty - 5, tw + 12, 5);
      g.fill({ color: 0x8b7355 });
      g.circle(tx - tw / 2 - 6, ty - 2, 3);
      g.fill({ color: 0x8b7355 });
      g.circle(tx + tw / 2 + 6, ty - 2, 3);
      g.fill({ color: 0x8b7355 });
      // Tapestry body
      g.rect(tx - tw / 2, ty, tw, th);
      g.fill({ color: tapColors[i] });
      // Gold border with inner border
      g.rect(tx - tw / 2, ty, tw, th);
      g.stroke({ color: a.accentColor, width: 2 });
      g.rect(tx - tw / 2 + 4, ty + 4, tw - 8, th - 8);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.4 });
      // Central emblem (shield shape)
      g.moveTo(tx, ty + 15);
      g.lineTo(tx - 12, ty + 28);
      g.lineTo(tx - 12, ty + 50);
      g.lineTo(tx, ty + 62);
      g.lineTo(tx + 12, ty + 50);
      g.lineTo(tx + 12, ty + 28);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.4 });
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.6 });
      // Cross or crown on emblem
      if (i % 2 === 0) {
        g.rect(tx - 1, ty + 22, 2, 20);
        g.fill({ color: a.accentColor, alpha: 0.6 });
        g.rect(tx - 6, ty + 30, 12, 2);
        g.fill({ color: a.accentColor, alpha: 0.6 });
      } else {
        // Crown
        g.moveTo(tx - 8, ty + 42);
        g.lineTo(tx - 6, ty + 30);
        g.lineTo(tx - 2, ty + 36);
        g.lineTo(tx, ty + 28);
        g.lineTo(tx + 2, ty + 36);
        g.lineTo(tx + 6, ty + 30);
        g.lineTo(tx + 8, ty + 42);
        g.closePath();
        g.fill({ color: a.accentColor, alpha: 0.5 });
      }
      // Fringe
      for (let fx = tx - tw / 2 + 3; fx < tx + tw / 2; fx += 4) {
        g.moveTo(fx, ty + th);
        g.lineTo(fx, ty + th + 8);
        g.stroke({ color: a.accentColor, width: 1, alpha: 0.5 });
      }
      this._banners.push({
        x: tx - tw / 2, y: ty, width: tw, height: th,
        phase: i * 1.5, color: tapColors[i], trimColor: a.accentColor,
      });
    }

    // Weapon displays between tapestries
    for (const wx of [sw * 0.19, sw * 0.81]) {
      const wy = wallY + 40;
      // Shield
      g.circle(wx, wy, 12);
      g.fill({ color: 0x883322 });
      g.circle(wx, wy, 12);
      g.stroke({ color: 0x665522, width: 2 });
      g.circle(wx, wy, 4);
      g.fill({ color: 0xbbaa55 });
      // Crossed swords behind shield
      g.moveTo(wx - 18, wy - 18);
      g.lineTo(wx + 18, wy + 18);
      g.stroke({ color: 0x999999, width: 2 });
      g.moveTo(wx + 18, wy - 18);
      g.lineTo(wx - 18, wy + 18);
      g.stroke({ color: 0x999999, width: 2 });
    }

    // Round table in background (perspective ellipse)
    const tableX = sw * 0.5;
    const tableY = floorY * 0.74;
    const tableRX = sw * 0.24;
    const tableRY = 20;
    // Table shadow
    g.ellipse(tableX, tableY + 8, tableRX + 6, tableRY + 3);
    g.fill({ color: 0x000000, alpha: 0.2 });
    // Table body — outer ring
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.fill({ color: 0x5a3a1a });
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.stroke({ color: 0x4a2a0a, width: 3 });
    // Wood grain ring
    g.ellipse(tableX, tableY, tableRX * 0.85, tableRY * 0.8);
    g.stroke({ color: 0x6a4a2a, width: 1, alpha: 0.3 });
    // Inner gap (open center)
    g.ellipse(tableX, tableY, tableRX * 0.6, tableRY * 0.55);
    g.fill({ color: 0x443322 });
    // Gold Pendragon crest inlay on table
    g.ellipse(tableX, tableY, tableRX * 0.75, tableRY * 0.7);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.2 });

    // Chairs with high backs
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const cx = tableX + Math.cos(angle) * (tableRX + 16);
      const cy = tableY + Math.sin(angle) * (tableRY + 12);
      // Chair back
      g.roundRect(cx - 5, cy - 10, 10, 16, 2);
      g.fill({ color: 0x4a2a12 });
      g.roundRect(cx - 5, cy - 10, 10, 16, 2);
      g.stroke({ color: 0x3a1a08, width: 0.5 });
      // Seat cushion
      g.roundRect(cx - 4, cy + 2, 8, 4, 1);
      g.fill({ color: 0x882222, alpha: 0.5 });
    }

    // Candelabras on table
    const candleXs = [tableX - tableRX * 0.45, tableX - tableRX * 0.15, tableX + tableRX * 0.15, tableX + tableRX * 0.45];
    for (const cx of candleXs) {
      // Ornate base
      g.moveTo(cx - 5, tableY - 4);
      g.lineTo(cx - 3, tableY - 12);
      g.lineTo(cx + 3, tableY - 12);
      g.lineTo(cx + 5, tableY - 4);
      g.closePath();
      g.fill({ color: 0x8b7355 });
      // Arms (3 candle holders)
      for (const off of [-6, 0, 6]) {
        g.rect(cx + off - 1, tableY - 22, 2, 10);
        g.fill({ color: 0xeeddcc });
        this._flames.push({ x: cx + off, y: tableY - 25, baseRadius: 3.5, phase: (cx + off) * 0.2 });
      }
      // Horizontal arm
      g.moveTo(cx - 7, tableY - 14);
      g.lineTo(cx + 7, tableY - 14);
      g.stroke({ color: 0x8b7355, width: 2 });
    }

    // Wall sconce torches
    const sconces = [sw * 0.04, sw * 0.19, sw * 0.38, sw * 0.62, sw * 0.81, sw * 0.96];
    for (const sx of sconces) {
      const sy = wallY + 45;
      // Bracket
      g.moveTo(sx, sy + 15);
      g.lineTo(sx - 6, sy + 8);
      g.lineTo(sx, sy);
      g.lineTo(sx + 6, sy + 8);
      g.closePath();
      g.fill({ color: 0x3a3a3a });
      // Torch
      g.rect(sx - 1.5, sy - 10, 3, 14);
      g.fill({ color: 0x6b4c2a });
      this._flames.push({ x: sx, y: sy - 14, baseRadius: 5, phase: sx * 0.15 });
      // Warm glow pools
      for (let r = 40; r > 0; r -= 5) {
        g.circle(sx, sy - 14, r);
        g.fill({ color: 0xff8833, alpha: 0.005 });
      }
    }

    // Carpet runner on floor (red with gold trim)
    g.rect(sw * 0.35, floorY, sw * 0.3, sh - floorY);
    g.fill({ color: 0x882222, alpha: 0.15 });
    g.rect(sw * 0.35, floorY, 3, sh - floorY);
    g.fill({ color: a.accentColor, alpha: 0.1 });
    g.rect(sw * 0.65 - 3, floorY, 3, sh - floorY);
    g.fill({ color: a.accentColor, alpha: 0.1 });

    // Stone floor with rich tile pattern
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    let tRow = 0;
    for (let y = floorY + 2; y < sh; y += 20) {
      const off = (tRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.roundRect(x + 1, y + 1, 38, 18, 1);
        g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.2 });
        if ((Math.floor(x / 40) + tRow) % 2 === 0) {
          g.roundRect(x + 1, y + 1, 38, 18, 1);
          g.fill({ color: 0x000000, alpha: 0.06 });
        }
      }
      tRow++;
    }
    // Light pools on floor from torches
    for (const sx of sconces) {
      g.ellipse(sx, floorY + 8, 25, 6);
      g.fill({ color: 0xff8833, alpha: 0.03 });
    }

    // Warm fog
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_round_table(time: number): void {
    const g = this._animGfx;
    // Flames (all torches + candelabras + fireplace)
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 2;
      const flicker2 = Math.cos(time * 12 + f.phase * 1.7) * 1.5;
      // Outer glow
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 4 + Math.sin(time * 5 + f.phase) * 1.5);
      g.fill({ color: 0xff6600, alpha: 0.1 });
      // Flame body
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.5, f.baseRadius * 0.8, f.baseRadius + 2.5 + flicker);
      g.fill({ color: 0xff6611, alpha: 0.65 });
      // Inner bright
      g.ellipse(f.x, f.y - 1, f.baseRadius * 0.4, f.baseRadius * 0.8 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.85 });
      // Hot core
      g.circle(f.x, f.y + 1, 1.5);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
    // Subtle tapestry sway
    for (const b of this._banners) {
      const sway = Math.sin(time * 0.8 + b.phase) * 1.5;
      g.rect(b.x + sway * 0.3, b.y + b.height * 0.3, b.width * 0.3, b.height * 0.4);
      g.fill({ color: 0xffffff, alpha: 0.02 + Math.sin(time + b.phase) * 0.01 });
    }
    // Fireplace glow pulse
    const fpX = this._sw * 0.5;
    const fpY = this._floorY * 0.45;
    const pulse = 0.04 + Math.sin(time * 1.2) * 0.02;
    g.circle(fpX, fpY - 15, 35);
    g.fill({ color: 0xff6622, alpha: pulse });
  }

  // =========================================================================
  // MORDRED'S THRONE — Dark corrupted throne room, purple flames, cracked floor
  // =========================================================================

  private _build_mordred_throne(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Very dark interior
    this._drawSkyGradient(g, a, sw, floorY, 10);

    // Corrupted ceiling with hanging stalactite formations
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.05 + i * 0.1);
      const cLen = 15 + Math.sin(i * 3.7) * 10;
      g.moveTo(cx - 3, 0);
      g.lineTo(cx, cLen);
      g.lineTo(cx + 3, 0);
      g.closePath();
      g.fill({ color: 0x1a1025, alpha: 0.6 });
    }

    // Back wall — dark stone with purple veins
    const wallY = floorY * 0.18;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x1a1122 });
    // Stone texture with varying darkness
    for (let y = wallY + 12; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x151020, width: 0.7, alpha: 0.5 });
    }
    let mRow = 0;
    for (let y = wallY; y < floorY; y += 14) {
      const off = (mRow % 2) * 18;
      for (let x = off; x < sw; x += 36) {
        g.moveTo(x, y).lineTo(x, y + 14);
        g.stroke({ color: 0x151020, width: 0.4, alpha: 0.3 });
      }
      mRow++;
    }

    // Purple corruption veins — more extensive network
    const veins = [
      [sw * 0.08, wallY + 20, sw * 0.12, floorY - 10],
      [sw * 0.22, wallY + 40, sw * 0.2, floorY - 20],
      [sw * 0.35, wallY + 15, sw * 0.38, floorY * 0.7],
      [sw * 0.48, wallY + 50, sw * 0.5, floorY - 15],
      [sw * 0.62, wallY + 10, sw * 0.6, floorY - 25],
      [sw * 0.75, wallY + 35, sw * 0.78, floorY - 10],
      [sw * 0.88, wallY + 25, sw * 0.85, floorY - 15],
    ];
    for (const [x1, y1, x2, y2] of veins) {
      // Main vein
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x1 + 20, (y1 + y2) / 2, x2, y2);
      g.stroke({ color: 0x6622aa, width: 2.5, alpha: 0.3 });
      // Glow around vein
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x1 + 20, (y1 + y2) / 2, x2, y2);
      g.stroke({ color: 0x8833cc, width: 5, alpha: 0.06 });
      // Branch veins
      const midX = (x1 + x2) / 2 + 10;
      const midY = (y1 + y2) / 2;
      g.moveTo(midX, midY);
      g.lineTo(midX + 15, midY - 20);
      g.stroke({ color: 0x6622aa, width: 1.5, alpha: 0.2 });
      g.moveTo(midX, midY + 15);
      g.lineTo(midX - 12, midY + 30);
      g.stroke({ color: 0x6622aa, width: 1, alpha: 0.15 });
    }

    // Massive dark throne in center background
    const throneX = sw * 0.5;
    const throneY = wallY + 15;
    // Throne back (tall, pointed, more ornate)
    g.moveTo(throneX - 40, floorY - 5);
    g.lineTo(throneX - 35, throneY + 35);
    g.lineTo(throneX - 25, throneY + 5);
    g.lineTo(throneX - 15, throneY - 10);
    g.lineTo(throneX - 8, throneY - 25);
    g.lineTo(throneX, throneY - 35);
    g.lineTo(throneX + 8, throneY - 25);
    g.lineTo(throneX + 15, throneY - 10);
    g.lineTo(throneX + 25, throneY + 5);
    g.lineTo(throneX + 35, throneY + 35);
    g.lineTo(throneX + 40, floorY - 5);
    g.closePath();
    g.fill({ color: 0x1a1025 });
    // Throne outline
    g.moveTo(throneX - 40, floorY - 5);
    g.lineTo(throneX - 35, throneY + 35);
    g.lineTo(throneX - 25, throneY + 5);
    g.lineTo(throneX - 15, throneY - 10);
    g.lineTo(throneX - 8, throneY - 25);
    g.lineTo(throneX, throneY - 35);
    g.lineTo(throneX + 8, throneY - 25);
    g.lineTo(throneX + 15, throneY - 10);
    g.lineTo(throneX + 25, throneY + 5);
    g.lineTo(throneX + 35, throneY + 35);
    g.lineTo(throneX + 40, floorY - 5);
    g.stroke({ color: 0x331155, width: 2 });
    // Throne seat
    g.rect(throneX - 24, floorY * 0.58, 48, 16);
    g.fill({ color: 0x221133 });
    g.rect(throneX - 24, floorY * 0.58, 48, 16);
    g.stroke({ color: 0x331144, width: 1 });
    // Armrests
    g.rect(throneX - 28, floorY * 0.56, 8, 22);
    g.fill({ color: 0x1a1025 });
    g.rect(throneX + 20, floorY * 0.56, 8, 22);
    g.fill({ color: 0x1a1025 });
    // Skull motifs on armrests and throne
    for (const sx of [throneX - 18, throneX + 18, throneX - 24, throneX + 24]) {
      const sy = throneY + 40;
      g.circle(sx, sy, 5);
      g.fill({ color: 0x443355 });
      g.circle(sx - 2, sy - 2, 1.2);
      g.fill({ color: 0x220033 });
      g.circle(sx + 2, sy - 2, 1.2);
      g.fill({ color: 0x220033 });
      g.moveTo(sx - 2, sy + 2);
      g.lineTo(sx + 2, sy + 2);
      g.stroke({ color: 0x220033, width: 0.8 });
    }
    // Glowing evil eye on throne top
    g.circle(throneX, throneY - 27, 5);
    g.fill({ color: a.accentColor, alpha: 0.6 });
    for (let r = 20; r > 0; r -= 3) {
      g.circle(throneX, throneY - 27, r);
      g.fill({ color: a.accentColor, alpha: 0.012 });
    }
    // Slit pupil
    g.moveTo(throneX, throneY - 31);
    g.lineTo(throneX, throneY - 23);
    g.stroke({ color: 0x110011, width: 2, alpha: 0.8 });

    // Dark pillars with gargoyles
    for (const px of [sw * 0.12, sw * 0.88]) {
      g.rect(px - 14, wallY, 28, floorY - wallY);
      g.fill({ color: 0x1a1025 });
      g.rect(px - 16, wallY, 32, 12);
      g.fill({ color: 0x221133 });
      g.rect(px - 16, floorY - 12, 32, 12);
      g.fill({ color: 0x221133 });
      // Pillar detail lines
      g.rect(px - 2, wallY + 12, 4, floorY - wallY - 24);
      g.fill({ color: 0x151020, alpha: 0.5 });
      // Gargoyle at top
      g.circle(px, wallY + 22, 8);
      g.fill({ color: 0x2a1a33 });
      g.circle(px - 3, wallY + 20, 1.5);
      g.fill({ color: 0xcc44ff, alpha: 0.3 });
      g.circle(px + 3, wallY + 20, 1.5);
      g.fill({ color: 0xcc44ff, alpha: 0.3 });
      // Purple rune on pillar
      g.circle(px, wallY + (floorY - wallY) * 0.4, 8);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.2 });
      g.circle(px, wallY + (floorY - wallY) * 0.4, 4);
      g.fill({ color: a.accentColor, alpha: 0.3 });
    }

    // Additional wall pillars
    for (const px of [sw * 0.32, sw * 0.68]) {
      g.rect(px - 10, wallY, 20, floorY - wallY);
      g.fill({ color: 0x151020 });
      g.rect(px - 12, wallY, 24, 8);
      g.fill({ color: 0x1a1128 });
      g.rect(px - 12, floorY - 8, 24, 8);
      g.fill({ color: 0x1a1128 });
    }

    // Corrupted banners
    for (const bx of [sw * 0.22, sw * 0.78]) {
      const by = wallY + 25;
      g.rect(bx - 15, by, 30, 60);
      g.fill({ color: 0x220033 });
      g.rect(bx - 15, by, 30, 60);
      g.stroke({ color: 0x331144, width: 1 });
      // Torn bottom edge
      for (let i = 0; i < 6; i++) {
        g.moveTo(bx - 15 + i * 6, by + 60);
        g.lineTo(bx - 12 + i * 6, by + 65 + (i % 2) * 5);
        g.lineTo(bx - 9 + i * 6, by + 60);
        g.fill({ color: 0x220033 });
      }
      // Skull emblem
      g.circle(bx, by + 25, 8);
      g.fill({ color: 0x443355, alpha: 0.5 });
    }

    // Purple flame braziers
    for (const bx of [sw * 0.22, sw * 0.42, sw * 0.58, sw * 0.78]) {
      g.moveTo(bx - 8, floorY);
      g.lineTo(bx - 5, floorY - 32);
      g.lineTo(bx + 5, floorY - 32);
      g.lineTo(bx + 8, floorY);
      g.closePath();
      g.fill({ color: 0x2a1a33 });
      // Ornate bowl
      g.arc(bx, floorY - 32, 10, Math.PI, 0);
      g.fill({ color: 0x331144 });
      g.arc(bx, floorY - 32, 12, Math.PI, 0);
      g.stroke({ color: 0x441155, width: 1 });
      this._flames.push({ x: bx, y: floorY - 40, baseRadius: 7, phase: bx * 0.1 });
    }

    // Cracked floor with purple glow
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Extensive cracks
    const cracks = [
      [sw * 0.1, floorY + 2, sw * 0.18, floorY + 14, sw * 0.15, floorY + 22],
      [sw * 0.25, floorY + 4, sw * 0.35, floorY + 10, sw * 0.4, floorY + 18],
      [sw * 0.45, floorY + 3, sw * 0.5, floorY + 15, sw * 0.48, floorY + 24],
      [sw * 0.55, floorY + 5, sw * 0.62, floorY + 12, sw * 0.65, floorY + 20],
      [sw * 0.7, floorY + 2, sw * 0.78, floorY + 16, sw * 0.75, floorY + 8],
      [sw * 0.82, floorY + 6, sw * 0.88, floorY + 18, sw * 0.9, floorY + 25],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of cracks) {
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.lineTo(x3, y3);
      g.stroke({ color: 0x110015, width: 1.5, alpha: 0.6 });
      // Purple glow in cracks
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke({ color: a.accentColor, width: 3, alpha: 0.08 });
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.25 });
    }
    // Corruption puddles on floor
    for (let i = 0; i < 4; i++) {
      const px = sw * (0.2 + i * 0.2);
      g.ellipse(px, floorY + 8, 12, 4);
      g.fill({ color: 0x330044, alpha: 0.2 });
      g.ellipse(px, floorY + 8, 8, 2.5);
      g.fill({ color: a.accentColor, alpha: 0.06 });
    }

    // Purple smoke particles
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.15, vy: -0.1 - Math.random() * 0.15,
        radius: 1.5 + Math.random() * 2.5, alpha: 0.12 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    // Mist layers
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY - 8 + i * 10, speed: 0.15 + i * 0.05,
        offset: i * 70, alpha: 0.04, height: 20 + i * 5,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_mordred_throne(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Purple flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 7 + f.phase) * 2.5;
      const flicker2 = Math.cos(time * 11 + f.phase * 1.5) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 5 + Math.sin(time * 4 + f.phase) * 2);
      g.fill({ color: 0x6622cc, alpha: 0.1 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.4, f.baseRadius, f.baseRadius + 3 + flicker);
      g.fill({ color: 0x7733dd, alpha: 0.6 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.5, f.baseRadius + flicker * 0.3);
      g.fill({ color: 0xcc66ff, alpha: 0.8 });
      g.circle(f.x, f.y + 1, 2);
      g.fill({ color: 0xeeccff, alpha: 0.9 });
    }
    // Floating purple particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.15) { p.y = this._floorY * 0.85; p.x = Math.random() * sw; }
      const pulse = p.alpha * (0.4 + Math.sin(time * 2 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: pulse * 0.12 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: pulse });
    }
    // Pulsing throne eye
    const eyePulse = 0.3 + Math.sin(time * 1.5) * 0.2;
    const throneY = this._floorY * 0.18 + 15;
    g.circle(this._sw * 0.5, throneY - 27, 7);
    g.fill({ color: 0xcc44ff, alpha: eyePulse });
    // Dark fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 20 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 80) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 50, m.height / 2);
        g.fill({ color: 0x220033, alpha: m.alpha });
      }
    }
  }

  // =========================================================================
  // GLASTONBURY ABBEY — Ruined abbey, broken arches, holy light
  // =========================================================================

  private _build_glastonbury(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Hazy golden horizon
    g.rect(0, floorY * 0.65, sw, floorY * 0.35);
    g.fill({ color: 0xddcc88, alpha: 0.08 });

    // Layered rolling hills
    // Far hills
    g.moveTo(0, floorY * 0.52);
    g.quadraticCurveTo(sw * 0.12, floorY * 0.44, sw * 0.25, floorY * 0.48);
    g.quadraticCurveTo(sw * 0.4, floorY * 0.42, sw * 0.55, floorY * 0.46);
    g.quadraticCurveTo(sw * 0.7, floorY * 0.41, sw * 0.85, floorY * 0.45);
    g.quadraticCurveTo(sw * 0.95, floorY * 0.43, sw, floorY * 0.5);
    g.lineTo(sw, floorY * 0.6);
    g.lineTo(0, floorY * 0.6);
    g.closePath();
    g.fill({ color: 0x4a6638, alpha: 0.25 });
    // Mid hills
    g.moveTo(0, floorY * 0.58);
    g.quadraticCurveTo(sw * 0.15, floorY * 0.5, sw * 0.3, floorY * 0.54);
    g.quadraticCurveTo(sw * 0.5, floorY * 0.48, sw * 0.7, floorY * 0.52);
    g.quadraticCurveTo(sw * 0.85, floorY * 0.49, sw, floorY * 0.56);
    g.lineTo(sw, floorY * 0.7);
    g.lineTo(0, floorY * 0.7);
    g.closePath();
    g.fill({ color: 0x557744, alpha: 0.35 });
    // Near hills
    g.moveTo(0, floorY * 0.68);
    g.quadraticCurveTo(sw * 0.2, floorY * 0.62, sw * 0.4, floorY * 0.66);
    g.quadraticCurveTo(sw * 0.6, floorY * 0.6, sw * 0.8, floorY * 0.64);
    g.lineTo(sw, floorY * 0.7);
    g.lineTo(sw, floorY * 0.8);
    g.lineTo(0, floorY * 0.8);
    g.closePath();
    g.fill({ color: 0x668855, alpha: 0.4 });

    // Distant cross on hilltop
    g.rect(sw * 0.78, floorY * 0.38, 3, 20);
    g.fill({ color: 0x999988, alpha: 0.4 });
    g.rect(sw * 0.78 - 5, floorY * 0.42, 13, 2);
    g.fill({ color: 0x999988, alpha: 0.4 });

    // Abbey ruins — tall broken arches with buttresses
    const archPositions = [sw * 0.12, sw * 0.3, sw * 0.48, sw * 0.66, sw * 0.84];
    for (let i = 0; i < archPositions.length; i++) {
      const ax = archPositions[i];
      const archH = 105 + (i % 2) * 25;
      const pillarW = 14;
      // Flying buttress (behind)
      if (i > 0 && i < archPositions.length - 1) {
        g.moveTo(ax - 25, floorY - archH * 0.6);
        g.lineTo(ax - 35, floorY - 10);
        g.stroke({ color: 0x7a7a6a, width: 4, alpha: 0.4 });
      }
      // Left pillar
      g.rect(ax - 22, floorY - archH, pillarW, archH);
      g.fill({ color: 0x8a8a7a });
      g.rect(ax - 22, floorY - archH, 3, archH);
      g.fill({ color: 0x9a9a8a, alpha: 0.3 });
      // Right pillar (some broken shorter)
      const rh = archH - (i % 2) * 20;
      g.rect(ax + 8, floorY - rh, pillarW, rh);
      g.fill({ color: 0x8a8a7a });
      g.rect(ax + 8, floorY - rh, 3, rh);
      g.fill({ color: 0x9a9a8a, alpha: 0.3 });
      // Gothic arch
      if (i % 2 === 0) {
        g.moveTo(ax - 22, floorY - archH);
        g.quadraticCurveTo(ax - 4, floorY - archH - 30, ax + 8, floorY - archH);
        g.stroke({ color: 0x8a8a7a, width: 10 });
        // Inner arch line
        g.moveTo(ax - 18, floorY - archH + 4);
        g.quadraticCurveTo(ax - 4, floorY - archH - 22, ax + 12, floorY - archH + 4);
        g.stroke({ color: 0x7a7a6a, width: 3 });
      }
      // Pillar capitals
      g.rect(ax - 24, floorY - archH, pillarW + 4, 6);
      g.fill({ color: 0x9a9a8a });
      // Stone texture
      for (let y = floorY - archH + 8; y < floorY; y += 12) {
        g.moveTo(ax - 22, y).lineTo(ax - 22 + pillarW, y);
        g.stroke({ color: 0x7a7a6a, width: 0.5, alpha: 0.4 });
      }
    }

    // Rose window (circular) — more detailed
    const wX = sw * 0.5;
    const wY = floorY * 0.3;
    // Frame
    g.circle(wX, wY, 32);
    g.stroke({ color: 0x8a8a7a, width: 7 });
    g.circle(wX, wY, 28);
    g.fill({ color: 0x223355, alpha: 0.2 });
    // Outer ring tracery
    g.circle(wX, wY, 24);
    g.stroke({ color: 0x8a8a7a, width: 2 });
    // Radial spokes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      g.moveTo(wX, wY);
      g.lineTo(wX + Math.cos(angle) * 27, wY + Math.sin(angle) * 27);
      g.stroke({ color: 0x8a8a7a, width: 1.5 });
    }
    // Colored glass — 12 petals
    const glassColors = [0xaa3333, 0x3355aa, 0xddaa33, 0x33aa55, 0xaa3366, 0x3388aa];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.15;
      const gx = wX + Math.cos(angle) * 16;
      const gy = wY + Math.sin(angle) * 16;
      g.circle(gx, gy, 5);
      g.fill({ color: glassColors[i % glassColors.length], alpha: 0.25 });
    }
    // Center rosette
    g.circle(wX, wY, 6);
    g.fill({ color: 0xddaa33, alpha: 0.3 });
    g.circle(wX, wY, 6);
    g.stroke({ color: 0x8a8a7a, width: 1.5 });

    // Gravestones — more detailed
    const graves = [sw * 0.06, sw * 0.18, sw * 0.36, sw * 0.54, sw * 0.72, sw * 0.86, sw * 0.94];
    for (let gi = 0; gi < graves.length; gi++) {
      const gx = graves[gi];
      const gh = 14 + (gi % 3) * 4;
      // Stone
      g.roundRect(gx - 6, floorY - gh, 12, gh, 3);
      g.fill({ color: 0x777768 });
      g.roundRect(gx - 6, floorY - gh, 12, gh, 3);
      g.stroke({ color: 0x666658, width: 1 });
      // Cross on some
      if (gi % 2 === 0) {
        g.rect(gx - 1, floorY - gh + 3, 2, 8);
        g.fill({ color: 0x888878, alpha: 0.5 });
        g.rect(gx - 3, floorY - gh + 5, 6, 2);
        g.fill({ color: 0x888878, alpha: 0.5 });
      }
      // Moss at base
      g.ellipse(gx, floorY - 1, 8, 3);
      g.fill({ color: 0x447733, alpha: 0.2 });
    }

    // Overgrown ivy on ruins — more extensive
    for (let i = 0; i < 14; i++) {
      const ix = sw * 0.05 + i * sw * 0.07 + Math.sin(i * 2.3) * 15;
      const iy = floorY - 35 - Math.sin(i * 2.8) * 40;
      // Main vine
      g.moveTo(ix, iy);
      g.quadraticCurveTo(ix + 4, iy + 20, ix - 2, iy + 35);
      g.stroke({ color: 0x336622, width: 1.5, alpha: 0.45 });
      // Leaf clusters at intervals
      for (let l = 0; l < 3; l++) {
        const lx = ix + Math.sin(l * 2) * 4;
        const ly = iy + 8 + l * 10;
        g.circle(lx, ly, 3.5);
        g.fill({ color: 0x447733, alpha: 0.3 });
        g.circle(lx + 2, ly - 1, 2.5);
        g.fill({ color: 0x558844, alpha: 0.25 });
      }
    }

    // Wildflowers
    for (let i = 0; i < 12; i++) {
      const fx = sw * (0.05 + i * 0.08);
      const fy = floorY - 2;
      // Stem
      g.moveTo(fx, fy);
      g.lineTo(fx + (i % 2 ? 1 : -1), fy - 6 - (i % 3) * 2);
      g.stroke({ color: 0x448833, width: 0.8, alpha: 0.5 });
      // Flower head
      const flowerColors = [0xeeddff, 0xffddee, 0xffffdd, 0xddeeff];
      g.circle(fx + (i % 2 ? 1 : -1), fy - 7 - (i % 3) * 2, 2);
      g.fill({ color: flowerColors[i % flowerColors.length], alpha: 0.4 });
    }

    // Ground — old stone and grass
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Grass patches — denser
    for (let x = 0; x < sw; x += 10) {
      const blades = 2 + (Math.sin(x * 0.6) > 0 ? 1 : 0);
      for (let b = 0; b < blades; b++) {
        g.moveTo(x + b * 3, floorY + 2);
        g.lineTo(x + b * 3 + (b - 1) * 2, floorY - 4 - b * 2);
        g.stroke({ color: 0x558844, width: 1, alpha: 0.4 });
      }
    }
    // Scattered rubble
    for (let i = 0; i < 8; i++) {
      const rx = sw * (0.1 + i * 0.1) + Math.sin(i * 4) * 10;
      g.roundRect(rx, floorY + 2, 5 + i % 3 * 2, 3 + i % 2 * 2, 1);
      g.fill({ color: 0x8a8a7a, alpha: 0.3 });
    }

    // Holy light beams through window — wider, more visible
    g.moveTo(wX - 18, wY + 30);
    g.lineTo(wX + 18, wY + 30);
    g.lineTo(wX + 60, floorY + 10);
    g.lineTo(wX - 60, floorY + 10);
    g.closePath();
    g.fill({ color: 0xeedd88, alpha: 0.04 });
    // Secondary beam
    g.moveTo(wX - 10, wY + 30);
    g.lineTo(wX + 10, wY + 30);
    g.lineTo(wX + 35, floorY + 10);
    g.lineTo(wX - 35, floorY + 10);
    g.closePath();
    g.fill({ color: 0xffeebb, alpha: 0.03 });

    // Dust mote particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: wX - 40 + Math.random() * 80, y: wY + Math.random() * (floorY - wY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0.05 + Math.random() * 0.1,
        radius: 0.8 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: 0xeedd88,
      });
    }
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_glastonbury(time: number): void {
    const g = this._animGfx;
    // Dust motes in light beams
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.5 + p.phase) * 0.1;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.3; p.x = this._sw * 0.5 - 40 + Math.random() * 80; }
      const pulse = p.alpha * (0.5 + Math.sin(time * 1.5 + p.phase) * 0.5);
      g.circle(p.x, p.y, p.radius + 1);
      g.fill({ color: p.color, alpha: pulse * 0.2 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulse });
    }
    // Pulsing window glow
    const wX = this._sw * 0.5;
    const wY = this._floorY * 0.3;
    const pulse = 0.12 + Math.sin(time * 0.8) * 0.05;
    g.circle(wX, wY, 30);
    g.fill({ color: 0xeedd88, alpha: pulse });
    g.circle(wX, wY, 18);
    g.fill({ color: 0xffeeaa, alpha: pulse * 0.5 });
  }

  // =========================================================================
  // ORKNEY WASTES — Desolate windswept wasteland, fog, dead trees
  // =========================================================================

  private _build_orkney(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Heavy overcast sky layers
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 8; i++) {
        const cx = sw * (Math.sin(i * 2.3 + layer) * 0.4 + 0.5);
        const cy = floorY * (0.03 + layer * 0.04 + Math.sin(i * 1.7 + layer) * 0.04);
        const cr = 35 + (i % 4) * 12 + layer * 8;
        g.circle(cx, cy, cr);
        g.fill({ color: 0x556666 - layer * 0x111111, alpha: 0.25 - layer * 0.05 });
        g.circle(cx + cr * 0.3, cy + 4, cr * 0.7);
        g.fill({ color: 0x667777 - layer * 0x111111, alpha: 0.2 - layer * 0.05 });
      }
    }

    // Distant barren hills — 3 layers for depth
    g.moveTo(0, floorY * 0.5);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.4 + Math.sin(x * 0.004 + 0.5) * 0.06));
    }
    g.lineTo(sw, floorY * 0.55);
    g.lineTo(0, floorY * 0.55);
    g.closePath();
    g.fill({ color: 0x3a4a3a, alpha: 0.3 });

    g.moveTo(0, floorY * 0.58);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.48 + Math.sin(x * 0.006 + 2) * 0.06));
    }
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(0, floorY * 0.65);
    g.closePath();
    g.fill({ color: 0x445544, alpha: 0.35 });

    g.moveTo(0, floorY * 0.68);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.58 + Math.sin(x * 0.008 + 3) * 0.05));
    }
    g.lineTo(sw, floorY * 0.75);
    g.lineTo(0, floorY * 0.75);
    g.closePath();
    g.fill({ color: 0x554e40, alpha: 0.45 });

    // Dead trees (skeletal, leafless) — more detailed
    const deadTrees = [
      { x: sw * 0.03, h: 110 }, { x: sw * 0.14, h: 85 },
      { x: sw * 0.32, h: 55 }, { x: sw * 0.5, h: 45 },
      { x: sw * 0.68, h: 65 }, { x: sw * 0.82, h: 95 },
      { x: sw * 0.95, h: 100 },
    ];
    for (const t of deadTrees) {
      // Trunk with taper
      g.moveTo(t.x - 4, floorY);
      g.lineTo(t.x - 1.5, floorY - t.h);
      g.lineTo(t.x + 1.5, floorY - t.h);
      g.lineTo(t.x + 4, floorY);
      g.closePath();
      g.fill({ color: 0x3a3028 });
      // Bark texture
      for (let y = floorY - t.h + 10; y < floorY; y += 12) {
        g.moveTo(t.x - 2, y);
        g.lineTo(t.x + 1, y + 3);
        g.stroke({ color: 0x2a2018, width: 0.6, alpha: 0.4 });
      }
      // Roots at base
      g.moveTo(t.x - 4, floorY);
      g.quadraticCurveTo(t.x - 10, floorY + 2, t.x - 14, floorY + 3);
      g.stroke({ color: 0x3a3028, width: 2, cap: "round" });
      g.moveTo(t.x + 4, floorY);
      g.quadraticCurveTo(t.x + 10, floorY + 2, t.x + 12, floorY + 4);
      g.stroke({ color: 0x3a3028, width: 2, cap: "round" });
      // Branches
      const branchCount = 3 + Math.floor(Math.abs(Math.sin(t.x)) * 2);
      for (let b = 0; b < branchCount; b++) {
        const by = floorY - t.h + b * (t.h * 0.18) + 5;
        const dir = b % 2 === 0 ? 1 : -1;
        const bLen = 18 + b * 8;
        const ex = t.x + dir * bLen;
        const ey = by - 8 + b * 3;
        g.moveTo(t.x, by);
        g.quadraticCurveTo(t.x + dir * bLen * 0.5, by - 12, ex, ey);
        g.stroke({ color: 0x3a3028, width: 2 - b * 0.25, cap: "round" });
        // Sub-branches
        g.moveTo(ex, ey);
        g.lineTo(ex + dir * 10, ey - 8);
        g.stroke({ color: 0x3a3028, width: 0.8, cap: "round", alpha: 0.6 });
        g.moveTo(ex * 0.95 + t.x * 0.05, ey + 3);
        g.lineTo(ex + dir * 6, ey + 8);
        g.stroke({ color: 0x3a3028, width: 0.6, cap: "round", alpha: 0.5 });
      }
    }

    // Standing stones — more detailed menhirs
    const stoneXs = [sw * 0.26, sw * 0.38, sw * 0.48, sw * 0.58, sw * 0.72];
    for (const sx of stoneXs) {
      const sh2 = 28 + Math.sin(sx * 0.1) * 12;
      g.moveTo(sx - 9, floorY);
      g.lineTo(sx - 6, floorY - sh2);
      g.quadraticCurveTo(sx, floorY - sh2 - 6, sx + 6, floorY - sh2);
      g.lineTo(sx + 9, floorY);
      g.closePath();
      g.fill({ color: 0x666655 });
      g.stroke({ color: 0x555544, width: 1 });
      // Weathering marks
      g.moveTo(sx - 4, floorY - sh2 + 8);
      g.lineTo(sx - 2, floorY - sh2 + 18);
      g.stroke({ color: 0x555544, width: 0.5, alpha: 0.5 });
      // Lichen patches
      g.circle(sx + 2, floorY - sh2 + 12, 3);
      g.fill({ color: 0x778866, alpha: 0.25 });
    }

    // Cairn (stacked stones)
    const cairnX = sw * 0.88;
    for (let i = 0; i < 4; i++) {
      g.roundRect(cairnX - 8 + i * 2, floorY - 8 - i * 6, 16 - i * 4, 7, 2);
      g.fill({ color: 0x777766 });
      g.roundRect(cairnX - 8 + i * 2, floorY - 8 - i * 6, 16 - i * 4, 7, 2);
      g.stroke({ color: 0x666655, width: 0.5 });
    }

    // Scattered bones/debris
    for (let i = 0; i < 10; i++) {
      const bx = sw * (0.08 + i * 0.09) + Math.sin(i * 5) * 12;
      const by = floorY + 3;
      g.moveTo(bx, by);
      g.lineTo(bx + 6 + i % 3 * 3, by + 1);
      g.stroke({ color: 0xaaa899, width: 1.5, cap: "round", alpha: 0.35 });
    }

    // Ground — muddy, barren
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Muddy puddle patches
    for (let i = 0; i < 6; i++) {
      const px = sw * (0.1 + i * 0.15);
      g.ellipse(px, floorY + 7, 16 + i * 3, 4);
      g.fill({ color: 0x444435, alpha: 0.3 });
      g.ellipse(px, floorY + 7, 10, 2.5);
      g.fill({ color: 0x556655, alpha: 0.12 });
    }
    // Dead grass patches
    for (let x = 10; x < sw; x += 25) {
      for (let b = 0; b < 2; b++) {
        g.moveTo(x + b * 3, floorY + 2);
        g.lineTo(x + b * 3 + (b - 1) * 3, floorY - 3);
        g.stroke({ color: 0x887755, width: 0.8, alpha: 0.3 });
      }
    }

    // Heavy fog layers
    for (let i = 0; i < 6; i++) {
      this._mistLayers.push({
        y: floorY - 20 + i * 12, speed: 0.25 + i * 0.08,
        offset: i * 70, alpha: 0.06 - i * 0.005, height: 28 + i * 8,
      });
    }
    // Wind-blown particles
    for (let i = 0; i < 18; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: 0.4 + Math.random() * 0.5, vy: (Math.random() - 0.5) * 0.2,
        radius: 0.5 + Math.random() * 1, alpha: 0.1 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2, color: 0x998877,
      });
    }
    g.rect(0, floorY * 0.35, sw, floorY * 0.65);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_orkney(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Wind-blown dust
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy + Math.cos(time * 1.5 + p.phase) * 0.1;
      if (p.x > sw + 10) { p.x = -10; p.y = this._floorY * 0.4 + Math.random() * this._floorY * 0.5; }
      const fade = p.alpha * (0.5 + Math.sin(time * 3 + p.phase) * 0.3);
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Fog drift — more layers
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 30 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 60) {
        const mx = (x + offset) % (sw + 200) - 100;
        g.ellipse(mx, m.y + Math.sin(time * 0.4 + x * 0.01) * 5, 50, m.height / 2);
        g.fill({ color: 0x998877, alpha: m.alpha });
      }
    }
  }

  // =========================================================================
  // LAKE SANCTUARY — Serene lake, platforms, waterfalls, willows
  // =========================================================================

  private _build_lake(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Soft clouds
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.05 + i * 0.1);
      const cy = floorY * (0.06 + Math.sin(i * 1.5) * 0.04);
      g.ellipse(cx, cy, 30 + i * 4, 10 + i % 3 * 2);
      g.fill({ color: 0xddeeff, alpha: 0.15 });
      g.ellipse(cx + 15, cy + 3, 20 + i * 2, 8);
      g.fill({ color: 0xddeeff, alpha: 0.1 });
    }

    // Distant mountains — more detailed with snow caps
    g.moveTo(0, floorY * 0.42);
    g.lineTo(sw * 0.1, floorY * 0.35);
    g.lineTo(sw * 0.18, floorY * 0.28);
    g.lineTo(sw * 0.28, floorY * 0.35);
    g.lineTo(sw * 0.4, floorY * 0.3);
    g.lineTo(sw * 0.52, floorY * 0.22);
    g.lineTo(sw * 0.62, floorY * 0.3);
    g.lineTo(sw * 0.72, floorY * 0.25);
    g.lineTo(sw * 0.82, floorY * 0.32);
    g.lineTo(sw * 0.92, floorY * 0.28);
    g.lineTo(sw, floorY * 0.38);
    g.lineTo(sw, floorY * 0.5);
    g.lineTo(0, floorY * 0.5);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.3 });
    // Snow caps
    g.moveTo(sw * 0.16, floorY * 0.3);
    g.lineTo(sw * 0.18, floorY * 0.28);
    g.lineTo(sw * 0.2, floorY * 0.3);
    g.closePath();
    g.fill({ color: 0xeeeeff, alpha: 0.3 });
    g.moveTo(sw * 0.5, floorY * 0.24);
    g.lineTo(sw * 0.52, floorY * 0.22);
    g.lineTo(sw * 0.54, floorY * 0.24);
    g.closePath();
    g.fill({ color: 0xeeeeff, alpha: 0.3 });

    // Treeline below mountains
    g.moveTo(0, floorY * 0.48);
    for (let x = 0; x <= sw; x += 12) {
      g.lineTo(x, floorY * (0.44 + Math.sin(x * 0.03) * 0.02));
    }
    g.lineTo(sw, floorY * 0.52);
    g.lineTo(0, floorY * 0.52);
    g.closePath();
    g.fill({ color: 0x2a4422, alpha: 0.35 });

    // Lake water body
    const waterY = floorY * 0.52;
    g.rect(0, waterY, sw, floorY - waterY);
    g.fill({ color: 0x2a5577 });
    // Water surface shimmer
    g.rect(0, waterY, sw, 4);
    g.fill({ color: 0x5599bb, alpha: 0.4 });
    // Depth gradient
    g.rect(0, waterY + (floorY - waterY) * 0.4, sw, (floorY - waterY) * 0.6);
    g.fill({ color: 0x1a3355, alpha: 0.2 });
    // Mountain reflection in water
    g.moveTo(0, waterY + 10);
    for (let x = 0; x <= sw; x += sw / 6) {
      g.lineTo(x, waterY + 10 + Math.sin(x * 0.01 + 1) * 8);
    }
    g.lineTo(sw, waterY + 25);
    g.lineTo(0, waterY + 25);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.1 });

    // Willow trees on edges — more lush
    for (const tx of [-8, sw * 0.05, sw * 0.93, sw + 8]) {
      const th = 115 + Math.sin(tx * 0.1) * 20;
      // Trunk with bark detail
      g.rect(tx - 7, floorY - th, 14, th);
      g.fill({ color: 0x3a2a18 });
      g.rect(tx - 7, floorY - th, 4, th);
      g.fill({ color: 0x4a3a28, alpha: 0.3 });
      // Canopy
      g.ellipse(tx, floorY - th - 5, 40, 28);
      g.fill({ color: 0x336633, alpha: 0.45 });
      g.ellipse(tx + 5, floorY - th, 30, 20);
      g.fill({ color: 0x448844, alpha: 0.35 });
      // Drooping branches — more
      for (let b = 0; b < 12; b++) {
        const bx = tx - 35 + b * 6;
        g.moveTo(bx, floorY - th + 8);
        g.quadraticCurveTo(bx + 3, floorY - th + 45, bx + 1, floorY - 10);
        g.stroke({ color: 0x448833, width: 1, alpha: 0.3 });
        // Leaf cluster at tip
        g.circle(bx + 1, floorY - 12, 2.5);
        g.fill({ color: 0x55aa44, alpha: 0.2 });
      }
    }

    // Reeds along water edge
    for (let x = sw * 0.15; x < sw * 0.85; x += 20) {
      for (let r = 0; r < 3; r++) {
        const rx = x + r * 3 - 3;
        g.moveTo(rx, floorY);
        g.lineTo(rx + Math.sin(rx * 0.5) * 2, floorY - 12 - r * 4);
        g.stroke({ color: 0x557733, width: 1, alpha: 0.4 });
      }
    }

    // Stone platform / bridge — more detailed
    g.rect(sw * 0.06, floorY - 6, sw * 0.88, 10);
    g.fill({ color: 0x667766 });
    g.rect(sw * 0.06, floorY - 6, sw * 0.88, 3);
    g.fill({ color: 0x778877, alpha: 0.5 });
    // Stone block texture
    for (let x = sw * 0.06; x < sw * 0.94; x += 30) {
      g.moveTo(x, floorY - 6);
      g.lineTo(x, floorY + 4);
      g.stroke({ color: 0x556655, width: 0.5, alpha: 0.3 });
    }
    // Moss on bridge
    for (let i = 0; i < 6; i++) {
      const mx = sw * (0.12 + i * 0.14);
      g.ellipse(mx, floorY - 4, 8, 2);
      g.fill({ color: 0x447733, alpha: 0.15 });
    }
    // Support pillars
    for (const px of [sw * 0.18, sw * 0.38, sw * 0.58, sw * 0.78]) {
      g.rect(px - 6, floorY + 4, 12, 28);
      g.fill({ color: 0x667766 });
      g.rect(px - 6, floorY + 4, 3, 28);
      g.fill({ color: 0x778877, alpha: 0.3 });
    }

    // Lily pads on water — more with flowers
    for (let i = 0; i < 12; i++) {
      const lx = sw * (0.08 + i * 0.08);
      const ly = waterY + 8 + (i % 4) * 7;
      g.ellipse(lx, ly, 6 + i % 2 * 2, 3);
      g.fill({ color: 0x337733, alpha: 0.45 });
      g.ellipse(lx, ly, 6 + i % 2 * 2, 3);
      g.stroke({ color: 0x226622, width: 0.5, alpha: 0.3 });
      // Flower on some
      if (i % 3 === 0) {
        g.circle(lx, ly - 3, 2.5);
        g.fill({ color: 0xeeddff, alpha: 0.5 });
        g.circle(lx, ly - 3, 1);
        g.fill({ color: 0xffee88, alpha: 0.6 });
      }
    }

    // Dragonflies (static base positions)
    for (let i = 0; i < 5; i++) {
      this._particles.push({
        x: sw * (0.2 + i * 0.15), y: waterY - 10 - i * 5,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
        radius: 1.5, alpha: 0.4, phase: Math.random() * Math.PI * 2, color: 0x44ddff,
      });
    }

    // Water reflections
    for (let y = waterY + 6; y < floorY; y += 5) {
      const alpha = 0.08 - (y - waterY) * 0.001;
      g.moveTo(0, y);
      g.lineTo(sw, y);
      g.stroke({ color: 0x88bbcc, width: 0.8, alpha: Math.max(0.02, alpha) });
    }

    // Ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Water ripples
    for (let i = 0; i < 12; i++) {
      this._ripples.push({
        y: waterY + 3 + i * 4, amplitude: 1 + Math.random() * 1.5,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.5 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.06,
      });
    }
    // Sparkle particles
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: Math.random() * sw, y: waterY + Math.random() * (floorY - waterY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0,
        radius: 1 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.45, sw, floorY * 0.55);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });
  }

  private _update_lake(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Water ripples
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        g.lineTo(x, r.y + Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude);
      }
      g.stroke({ color: 0x88ccdd, width: 0.8, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }
    // Water sparkles + dragonflies
    for (const p of this._particles) {
      if (p.color === 0x44ddff) {
        // Dragonfly — erratic movement
        p.x += Math.sin(time * 4 + p.phase) * 1.5;
        p.y += Math.cos(time * 3 + p.phase * 1.3) * 1;
        // Wings
        g.moveTo(p.x - 4, p.y - 1);
        g.lineTo(p.x, p.y);
        g.lineTo(p.x - 4, p.y + 1);
        g.stroke({ color: 0xaaeeff, width: 0.8, alpha: 0.4 });
        g.moveTo(p.x + 4, p.y - 1);
        g.lineTo(p.x, p.y);
        g.lineTo(p.x + 4, p.y + 1);
        g.stroke({ color: 0xaaeeff, width: 0.8, alpha: 0.4 });
        // Body
        g.circle(p.x, p.y, 1);
        g.fill({ color: 0x44ddff, alpha: 0.6 });
      } else {
        p.x += Math.sin(time * 0.3 + p.phase) * 0.2;
        const pulse = p.alpha * (0.3 + Math.sin(time * 3 + p.phase) * 0.7);
        if (pulse > 0.15) {
          g.circle(p.x, p.y, p.radius);
          g.fill({ color: 0xffffff, alpha: pulse });
        }
      }
    }
  }

  // =========================================================================
  // DRAGON'S PEAK — Volcanic mountain, lava flows, dragon bones, embers
  // =========================================================================

  private _build_dragon_peak(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY, 10);
    // Red glow at horizon
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: 0xff4400, alpha: 0.06 });
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: 0xff2200, alpha: 0.04 });

    // Volcanic mountain background — more detail
    g.moveTo(0, floorY * 0.7);
    g.lineTo(sw * 0.12, floorY * 0.5);
    g.lineTo(sw * 0.25, floorY * 0.35);
    g.lineTo(sw * 0.38, floorY * 0.2);
    g.lineTo(sw * 0.5, floorY * 0.12);
    g.lineTo(sw * 0.62, floorY * 0.2);
    g.lineTo(sw * 0.75, floorY * 0.35);
    g.lineTo(sw * 0.88, floorY * 0.5);
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(sw, floorY);
    g.lineTo(0, floorY);
    g.closePath();
    g.fill({ color: 0x2a1a0a });
    // Rock face detail
    for (let i = 0; i < 8; i++) {
      const rx = sw * (0.2 + i * 0.08);
      const ry = floorY * (0.3 + Math.abs(rx / sw - 0.5) * 0.8);
      g.moveTo(rx, ry);
      g.lineTo(rx + 15, ry + 20);
      g.stroke({ color: 0x1a0a00, width: 1.5, alpha: 0.3 });
    }
    // Mountain ridges
    g.moveTo(sw * 0.3, floorY * 0.3);
    g.lineTo(sw * 0.42, floorY * 0.18);
    g.lineTo(sw * 0.5, floorY * 0.12);
    g.stroke({ color: 0x3a2a1a, width: 1.5, alpha: 0.5 });
    g.moveTo(sw * 0.5, floorY * 0.12);
    g.lineTo(sw * 0.58, floorY * 0.18);
    g.lineTo(sw * 0.7, floorY * 0.3);
    g.stroke({ color: 0x3a2a1a, width: 1.5, alpha: 0.5 });

    // Volcano crater glow
    g.circle(sw * 0.5, floorY * 0.1, 25);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    g.circle(sw * 0.5, floorY * 0.1, 14);
    g.fill({ color: 0xff6622, alpha: 0.25 });
    g.circle(sw * 0.5, floorY * 0.1, 6);
    g.fill({ color: 0xffaa44, alpha: 0.35 });
    // Smoke from peak
    for (let i = 0; i < 8; i++) {
      g.circle(sw * 0.5 + (i - 4) * 7, floorY * 0.06 - i * 4, 10 + i * 3);
      g.fill({ color: 0x332222, alpha: 0.2 - i * 0.02 });
    }

    // Lava rivers — more streams
    const lavaStreams = [
      { x1: sw * 0.42, y1: floorY * 0.18, x2: sw * 0.25, y2: floorY * 0.65 },
      { x1: sw * 0.48, y1: floorY * 0.15, x2: sw * 0.35, y2: floorY * 0.5 },
      { x1: sw * 0.52, y1: floorY * 0.15, x2: sw * 0.65, y2: floorY * 0.5 },
      { x1: sw * 0.58, y1: floorY * 0.18, x2: sw * 0.72, y2: floorY * 0.6 },
    ];
    for (const ls of lavaStreams) {
      // Glow around lava
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff4400, width: 8, alpha: 0.06 });
      // Main flow
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff4400, width: 4, alpha: 0.3 });
      // Bright center
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff8844, width: 2, alpha: 0.5 });
    }

    // Lava pool at base
    g.ellipse(sw * 0.3, floorY * 0.68, 25, 8);
    g.fill({ color: 0xff4400, alpha: 0.2 });
    g.ellipse(sw * 0.3, floorY * 0.68, 15, 5);
    g.fill({ color: 0xff8844, alpha: 0.25 });

    // Rocky outcrops in foreground
    for (const rx of [sw * 0.05, sw * 0.15, sw * 0.85, sw * 0.95]) {
      const rh = 15 + Math.sin(rx * 0.2) * 8;
      g.moveTo(rx - 10, floorY);
      g.lineTo(rx - 6, floorY - rh);
      g.lineTo(rx + 2, floorY - rh + 3);
      g.lineTo(rx + 10, floorY);
      g.closePath();
      g.fill({ color: 0x2a1a0a });
      g.stroke({ color: 0x1a0a00, width: 0.8 });
    }

    // Dragon bones (ribs and skull) — more detailed
    const boneX = sw * 0.2;
    const boneY = floorY - 5;
    // Spine with vertebrae detail
    g.moveTo(boneX - 45, boneY);
    g.quadraticCurveTo(boneX, boneY - 18, boneX + 55, boneY - 6);
    g.stroke({ color: 0xccbb99, width: 5, cap: "round" });
    // Vertebra bumps
    for (let i = 0; i < 8; i++) {
      const vx = boneX - 35 + i * 11;
      const vy = boneY - 5 - Math.sin(i * 0.5) * 8;
      g.circle(vx, vy - 3, 3);
      g.fill({ color: 0xccbb99, alpha: 0.6 });
    }
    // Ribs — more
    for (let i = 0; i < 7; i++) {
      const rx = boneX - 25 + i * 12;
      const ry = boneY - 12 - Math.sin(i * 0.5) * 4;
      g.moveTo(rx, ry);
      g.quadraticCurveTo(rx + 4, ry - 28, rx + 2, ry - 40);
      g.stroke({ color: 0xccbb99, width: 2.5, cap: "round", alpha: 0.6 + (i % 2) * 0.15 });
    }
    // Tail bones trailing
    for (let i = 0; i < 5; i++) {
      g.circle(boneX + 60 + i * 8, boneY - 4 + i * 1.5, 2.5 - i * 0.3);
      g.fill({ color: 0xccbb99, alpha: 0.5 - i * 0.08 });
    }

    // Dragon skull — more detailed
    const skullX = sw * 0.78;
    // Skull shape
    g.ellipse(skullX, floorY - 14, 20, 14);
    g.fill({ color: 0xccbb99 });
    g.ellipse(skullX, floorY - 14, 20, 14);
    g.stroke({ color: 0xaa9977, width: 1.5 });
    // Snout
    g.moveTo(skullX + 18, floorY - 16);
    g.lineTo(skullX + 30, floorY - 12);
    g.lineTo(skullX + 28, floorY - 8);
    g.lineTo(skullX + 18, floorY - 10);
    g.closePath();
    g.fill({ color: 0xccbb99 });
    g.stroke({ color: 0xaa9977, width: 1 });
    // Eye sockets
    g.circle(skullX - 6, floorY - 16, 5);
    g.fill({ color: 0x331100 });
    g.circle(skullX + 6, floorY - 16, 5);
    g.fill({ color: 0x331100 });
    // Glowing eyes (faint ember)
    g.circle(skullX - 6, floorY - 16, 2);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    g.circle(skullX + 6, floorY - 16, 2);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    // Teeth
    for (let i = 0; i < 5; i++) {
      g.moveTo(skullX + 20 + i * 2.5, floorY - 8);
      g.lineTo(skullX + 21 + i * 2.5, floorY - 5);
      g.stroke({ color: 0xccbb99, width: 1.5 });
    }
    // Horns — curved
    g.moveTo(skullX - 14, floorY - 22);
    g.quadraticCurveTo(skullX - 26, floorY - 40, skullX - 20, floorY - 48);
    g.stroke({ color: 0xaa9977, width: 3.5, cap: "round" });
    g.moveTo(skullX + 14, floorY - 22);
    g.quadraticCurveTo(skullX + 26, floorY - 40, skullX + 20, floorY - 48);
    g.stroke({ color: 0xaa9977, width: 3.5, cap: "round" });

    // Obsidian shards
    for (const ox of [sw * 0.42, sw * 0.55, sw * 0.62]) {
      g.moveTo(ox, floorY);
      g.lineTo(ox - 3, floorY - 12);
      g.lineTo(ox + 4, floorY - 15);
      g.lineTo(ox + 2, floorY);
      g.closePath();
      g.fill({ color: 0x111118 });
      g.stroke({ color: 0x222228, width: 0.5 });
    }

    // Rocky ground with lava cracks
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // More extensive lava cracks
    for (let i = 0; i < 8; i++) {
      const cx = sw * (0.08 + i * 0.12);
      g.moveTo(cx, floorY + 2);
      g.lineTo(cx + 8, floorY + 10);
      g.lineTo(cx + 4, floorY + 18);
      g.stroke({ color: 0xff4400, width: 1.5, alpha: 0.25 });
      g.moveTo(cx, floorY + 2);
      g.lineTo(cx + 8, floorY + 10);
      g.stroke({ color: 0xff8844, width: 0.8, alpha: 0.3 });
    }
    // Scorched earth patches
    for (let i = 0; i < 5; i++) {
      const px = sw * (0.15 + i * 0.18);
      g.ellipse(px, floorY + 6, 14, 4);
      g.fill({ color: 0x1a0a00, alpha: 0.2 });
    }

    // Ember particles
    for (let i = 0; i < 30; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.2 + Math.random() * floorY * 0.7,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.5,
        radius: 1 + Math.random() * 2, alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, color: i % 3 === 0 ? 0xff8844 : 0xff4422,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_dragon_peak(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Rising embers
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy;
      if (p.y < this._floorY * 0.05) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 4 + p.phase) * 0.5);
      // Glow
      g.circle(p.x, p.y, p.radius + 1.5);
      g.fill({ color: p.color, alpha: fade * 0.15 });
      // Core
      g.circle(p.x, p.y, p.radius * 0.6);
      g.fill({ color: 0xffcc44, alpha: fade });
    }
    // Lava glow pulse at peak
    const pulse = 0.12 + Math.sin(time * 1.5) * 0.06;
    g.circle(sw * 0.5, this._floorY * 0.1, 28);
    g.fill({ color: 0xff4400, alpha: pulse });
    g.circle(sw * 0.5, this._floorY * 0.1, 12);
    g.fill({ color: 0xff8844, alpha: pulse * 1.5 });
    // Heat shimmer
    for (let x = sw * 0.15; x < sw * 0.85; x += 15) {
      const shimmer = Math.sin(time * 3 + x * 0.05) * 2;
      g.moveTo(x, this._floorY * 0.6 + shimmer);
      g.lineTo(x + 10, this._floorY * 0.6 - shimmer);
      g.stroke({ color: 0xff6633, width: 1, alpha: 0.03 });
    }
    // Skull eye flicker
    const skullX = sw * 0.78;
    const eyeGlow = 0.1 + Math.sin(time * 2) * 0.08;
    g.circle(skullX - 6, this._floorY - 16, 3);
    g.fill({ color: 0xff4400, alpha: eyeGlow });
    g.circle(skullX + 6, this._floorY - 16, 3);
    g.fill({ color: 0xff4400, alpha: eyeGlow });
  }

  // =========================================================================
  // GRAIL CHAPEL — Sacred interior, stained glass, altar, divine light
  // =========================================================================

  private _build_grail_chapel(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Dark interior with golden ambient
    this._drawSkyGradient(g, a, sw, floorY, 8);

    // Vaulted ceiling with ornate pointed arches
    for (let i = 0; i < 5; i++) {
      const cx = sw * (0.1 + i * 0.2);
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.05, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 6 });
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.04, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x6a6554, width: 3 });
      // Rib vault lines converging to keystone
      g.moveTo(cx, floorY * 0.01);
      g.lineTo(cx - sw * 0.08, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 2, alpha: 0.5 });
      g.moveTo(cx, floorY * 0.01);
      g.lineTo(cx + sw * 0.08, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 2, alpha: 0.5 });
      // Keystone
      g.roundRect(cx - 4, 0, 8, 8, 2);
      g.fill({ color: 0x6a6554 });
    }

    // Stone walls with column details
    const wallY = floorY * 0.12;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x665544 });
    for (let y = wallY + 14; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x5a4a3a, width: 0.6, alpha: 0.35 });
    }
    // Block pattern
    let wRow = 0;
    for (let y = wallY; y < floorY; y += 14) {
      const off = (wRow % 2) * 16;
      for (let x = off; x < sw; x += 32) {
        g.moveTo(x, y).lineTo(x, y + 14);
        g.stroke({ color: 0x5a4a3a, width: 0.4, alpha: 0.25 });
      }
      wRow++;
    }

    // Wall columns
    for (const px of [sw * 0.1, sw * 0.3, sw * 0.5, sw * 0.7, sw * 0.9]) {
      g.rect(px - 8, wallY, 16, floorY - wallY);
      g.fill({ color: 0x6a5a48 });
      g.rect(px - 8, wallY, 4, floorY - wallY);
      g.fill({ color: 0x7a6a58, alpha: 0.3 });
      // Capital
      g.rect(px - 10, wallY, 20, 8);
      g.fill({ color: 0x7a6a58 });
      // Base
      g.rect(px - 10, floorY - 8, 20, 8);
      g.fill({ color: 0x7a6a58 });
    }

    // Stained glass windows — richer detail
    const windowXs = [sw * 0.15, sw * 0.38, sw * 0.62, sw * 0.85];
    const windowColors = [
      [0xaa3333, 0x3344aa, 0xddaa33],
      [0x3366cc, 0xdd8833, 0x33aa55],
      [0xcc3355, 0x44aa88, 0xddcc44],
      [0x5533aa, 0xaa4422, 0x44ccaa],
    ];
    for (let i = 0; i < windowXs.length; i++) {
      const wx = windowXs[i];
      const wy = wallY + 16;
      const ww = 34;
      const wh = 68;
      // Frame
      g.rect(wx - ww / 2 - 4, wy - 4, ww + 8, wh + 8);
      g.fill({ color: 0x5a5544 });
      // Pointed top
      g.moveTo(wx - ww / 2 - 4, wy - 4);
      g.quadraticCurveTo(wx, wy - 28, wx + ww / 2 + 4, wy - 4);
      g.fill({ color: 0x5a5544 });
      // Glass background
      g.rect(wx - ww / 2, wy, ww, wh);
      g.fill({ color: 0x222244, alpha: 0.3 });
      // Pointed glass top
      g.moveTo(wx - ww / 2, wy);
      g.quadraticCurveTo(wx, wy - 22, wx + ww / 2, wy);
      g.fill({ color: 0x222244, alpha: 0.2 });
      // Colored glass — 6 sections
      const cols = windowColors[i];
      const secW = ww / 3;
      const secH = wh / 3;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          g.rect(wx - ww / 2 + sx * secW, wy + sy * secH, secW, secH);
          g.fill({ color: cols[sx % cols.length], alpha: 0.15 + (sy === 1 ? 0.05 : 0) });
        }
      }
      // Lead dividers — grid
      for (let d = 1; d < 3; d++) {
        g.moveTo(wx - ww / 2 + d * secW, wy).lineTo(wx - ww / 2 + d * secW, wy + wh);
        g.stroke({ color: 0x5a5544, width: 1.5 });
      }
      for (let d = 1; d < 3; d++) {
        g.moveTo(wx - ww / 2, wy + d * secH).lineTo(wx + ww / 2, wy + d * secH);
        g.stroke({ color: 0x5a5544, width: 1.5 });
      }
      // Rosette at top
      g.circle(wx, wy - 8, 6);
      g.fill({ color: cols[1], alpha: 0.25 });
      g.circle(wx, wy - 8, 6);
      g.stroke({ color: 0x5a5544, width: 1.5 });
      // Light beam from window
      g.moveTo(wx - ww / 2, wy + wh);
      g.lineTo(wx + ww / 2, wy + wh);
      g.lineTo(wx + ww / 2 + 25, floorY);
      g.lineTo(wx - ww / 2 - 12, floorY);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.025 });
    }

    // Pews (rows of benches)
    for (let row = 0; row < 3; row++) {
      const py = floorY * (0.65 + row * 0.08);
      for (const side of [-1, 1]) {
        const px = sw * 0.5 + side * sw * 0.22;
        g.rect(px - 25, py, 50, 6);
        g.fill({ color: 0x5a3a1a });
        // Back rest
        g.rect(px - 25, py - 8, 50, 3);
        g.fill({ color: 0x5a3a1a });
        g.rect(px - 25, py - 8, 1, 8);
        g.fill({ color: 0x4a2a0a });
        g.rect(px + 24, py - 8, 1, 8);
        g.fill({ color: 0x4a2a0a });
      }
    }

    // Central altar with grail — more detailed
    const altarX = sw * 0.5;
    const altarY = floorY - 8;
    // Steps leading up
    g.rect(altarX - 45, altarY - 5, 90, 5);
    g.fill({ color: 0x887766 });
    g.rect(altarX - 38, altarY - 10, 76, 5);
    g.fill({ color: 0x887766 });
    // Altar table
    g.rect(altarX - 30, altarY - 30, 60, 20);
    g.fill({ color: 0x776655 });
    g.rect(altarX - 30, altarY - 30, 60, 20);
    g.stroke({ color: 0x665544, width: 1.5 });
    // Altar front carved panel
    g.rect(altarX - 25, altarY - 28, 50, 16);
    g.fill({ color: 0x6a5a48 });
    // Cross carved into panel
    g.rect(altarX - 1.5, altarY - 27, 3, 12);
    g.fill({ color: 0x887766, alpha: 0.5 });
    g.rect(altarX - 5, altarY - 23, 10, 2);
    g.fill({ color: 0x887766, alpha: 0.5 });
    // Altar cloth with lace edge
    g.rect(altarX - 28, altarY - 30, 56, 6);
    g.fill({ color: 0xeeddcc });
    g.rect(altarX - 28, altarY - 30, 56, 6);
    g.stroke({ color: a.accentColor, width: 1 });
    // Lace edge pattern
    for (let lx = altarX - 26; lx < altarX + 26; lx += 6) {
      g.arc(lx, altarY - 24, 3, 0, Math.PI);
      g.stroke({ color: 0xeeddcc, width: 0.8, alpha: 0.5 });
    }
    // Grail cup — more ornate
    g.moveTo(altarX - 7, altarY - 38);
    g.lineTo(altarX - 9, altarY - 30);
    g.lineTo(altarX + 9, altarY - 30);
    g.lineTo(altarX + 7, altarY - 38);
    g.closePath();
    g.fill({ color: 0xddaa33 });
    g.stroke({ color: 0xbb8822, width: 1 });
    // Gemstone on cup
    g.circle(altarX, altarY - 34, 2);
    g.fill({ color: 0xcc3333, alpha: 0.6 });
    // Stem
    g.rect(altarX - 2, altarY - 30, 4, 7);
    g.fill({ color: 0xddaa33 });
    // Base
    g.ellipse(altarX, altarY - 23, 7, 2.5);
    g.fill({ color: 0xddaa33 });
    g.ellipse(altarX, altarY - 23, 7, 2.5);
    g.stroke({ color: 0xbb8822, width: 0.8 });
    // Grail divine glow
    for (let r = 25; r > 0; r -= 3) {
      g.circle(altarX, altarY - 35, r);
      g.fill({ color: a.accentColor, alpha: 0.01 });
    }

    // Candles on altar + tall candlesticks
    for (const cx of [altarX - 20, altarX + 20]) {
      g.rect(cx - 1.5, altarY - 38, 3, 8);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: altarY - 41, baseRadius: 3.5, phase: cx * 0.2 });
    }
    // Tall floor candlesticks
    for (const cx of [altarX - 40, altarX + 40]) {
      g.rect(cx - 2, altarY - 50, 4, 42);
      g.fill({ color: 0x8b7355 });
      g.ellipse(cx, altarY - 8, 5, 2);
      g.fill({ color: 0x8b7355 });
      g.rect(cx - 1.5, altarY - 58, 3, 8);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: altarY - 61, baseRadius: 4, phase: cx * 0.15 });
    }

    // Incense brazier
    const incX = altarX;
    const incY = altarY - 12;
    g.arc(incX, incY, 6, Math.PI, 0);
    g.fill({ color: 0x8b7355 });
    // Incense smoke particles
    for (let i = 0; i < 8; i++) {
      this._particles.push({
        x: incX + (Math.random() - 0.5) * 5, y: incY - 5 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.08, vy: -0.05 - Math.random() * 0.05,
        radius: 1 + Math.random() * 2, alpha: 0.08 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2, color: 0xddddcc,
      });
    }

    // Floor — polished stone tiles with central aisle
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Checkered pattern
    let tRow = 0;
    for (let y = floorY + 2; y < sh; y += 18) {
      for (let x = 0; x < sw; x += 36) {
        if ((Math.floor(x / 36) + tRow) % 2 === 0) {
          g.rect(x, y, 36, 18);
          g.fill({ color: 0x000000, alpha: 0.08 });
        }
      }
      tRow++;
    }
    // Central carpet runner
    g.rect(sw * 0.42, floorY, sw * 0.16, sh - floorY);
    g.fill({ color: 0x882222, alpha: 0.1 });

    // Dust/light particles
    for (let i = 0; i < 14; i++) {
      this._particles.push({
        x: Math.random() * sw, y: wallY + Math.random() * (floorY - wallY),
        vx: (Math.random() - 0.5) * 0.05, vy: 0.03 + Math.random() * 0.05,
        radius: 0.5 + Math.random() * 1, alpha: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_grail_chapel(time: number): void {
    const g = this._animGfx;
    // Candle flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 1.5;
      const flicker2 = Math.cos(time * 11 + f.phase * 1.5) * 1;
      g.ellipse(f.x + flicker2 * 0.3, f.y - flicker * 0.3, f.baseRadius * 0.7, f.baseRadius + 1.5 + flicker);
      g.fill({ color: 0xff8833, alpha: 0.6 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.4, f.baseRadius * 0.7 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.9 });
      g.circle(f.x, f.y + 1, 1.5);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
    // Dust motes + incense smoke
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.4 + p.phase) * 0.08;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.12; }
      if (p.y < 0) { p.y = this._floorY * 0.5; }
      const pulse = p.alpha * (0.3 + Math.sin(time * 1.5 + p.phase) * 0.5);
      if (p.color === 0xddddcc) {
        // Incense — larger, more diffuse
        g.circle(p.x, p.y, p.radius + 2);
        g.fill({ color: p.color, alpha: pulse * 0.3 });
      } else {
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: 0xffffff, alpha: pulse });
      }
    }
    // Grail glow pulse
    const altarX = this._sw * 0.5;
    const altarY = this._floorY - 8;
    const pulse = 0.06 + Math.sin(time * 1.2) * 0.03;
    g.circle(altarX, altarY - 35, 20);
    g.fill({ color: 0xffee88, alpha: pulse });
    g.circle(altarX, altarY - 35, 10);
    g.fill({ color: 0xffffcc, alpha: pulse * 0.8 });
  }

  // =========================================================================
  // CORNWALL COAST — Sunny coastal beach, waves, cliffs, lighthouse
  // =========================================================================

  private _build_cornwall(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Bright fluffy clouds — multiple layers
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 6; i++) {
        const cx = sw * (0.06 + i * 0.17 + layer * 0.08);
        const cy = floorY * (0.08 + layer * 0.05 + Math.sin(i * 1.8 + layer) * 0.04);
        for (let j = 0; j < 3; j++) {
          g.ellipse(cx + j * 16 - 16, cy + j * 3, 22 + j * 5, 10 + j * 2);
          g.fill({ color: 0xffffff, alpha: 0.18 - j * 0.04 - layer * 0.04 });
        }
      }
    }

    // Sun with rays
    const sunX = sw * 0.82;
    const sunY = floorY * 0.1;
    // Rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      g.moveTo(sunX + Math.cos(angle) * 20, sunY + Math.sin(angle) * 20);
      g.lineTo(sunX + Math.cos(angle) * 55, sunY + Math.sin(angle) * 55);
      g.stroke({ color: 0xffee88, width: 1.5, alpha: 0.04 });
    }
    for (let r = 55; r > 0; r -= 4) {
      g.circle(sunX, sunY, r);
      g.fill({ color: 0xffdd88, alpha: 0.006 });
    }
    g.circle(sunX, sunY, 18);
    g.fill({ color: 0xffee99, alpha: 0.7 });
    g.circle(sunX, sunY, 12);
    g.fill({ color: 0xffffff, alpha: 0.3 });

    // Ocean — layered colors
    const seaY = floorY * 0.48;
    // Horizon line haze
    g.rect(0, seaY - 5, sw, 10);
    g.fill({ color: 0xaabbcc, alpha: 0.1 });
    // Main ocean
    g.rect(0, seaY, sw, floorY - seaY);
    g.fill({ color: 0x3366aa });
    g.rect(0, seaY, sw, 3);
    g.fill({ color: 0x5588cc, alpha: 0.5 });
    // Depth layers
    g.rect(0, seaY + (floorY - seaY) * 0.3, sw, (floorY - seaY) * 0.3);
    g.fill({ color: 0x225588, alpha: 0.2 });
    g.rect(0, seaY + (floorY - seaY) * 0.6, sw, (floorY - seaY) * 0.4);
    g.fill({ color: 0x1a4466, alpha: 0.15 });
    // Sun reflection on water
    g.moveTo(sunX - 30, seaY + 5);
    g.lineTo(sunX + 30, seaY + 5);
    g.lineTo(sunX + 15, seaY + 40);
    g.lineTo(sunX - 15, seaY + 40);
    g.closePath();
    g.fill({ color: 0xffee88, alpha: 0.05 });

    // Distant sailing ship
    const shipX = sw * 0.55;
    const shipY = seaY + 15;
    // Hull
    g.moveTo(shipX - 10, shipY);
    g.lineTo(shipX - 8, shipY + 4);
    g.lineTo(shipX + 8, shipY + 4);
    g.lineTo(shipX + 10, shipY);
    g.closePath();
    g.fill({ color: 0x4a3a2a, alpha: 0.5 });
    // Mast
    g.moveTo(shipX, shipY);
    g.lineTo(shipX, shipY - 15);
    g.stroke({ color: 0x4a3a2a, width: 1, alpha: 0.5 });
    // Sail
    g.moveTo(shipX, shipY - 14);
    g.lineTo(shipX + 8, shipY - 8);
    g.lineTo(shipX, shipY - 3);
    g.closePath();
    g.fill({ color: 0xeeeedd, alpha: 0.4 });

    // Lighthouse on cliff (right) — more detailed
    const lhX = sw * 0.9;
    const lhCliffY = seaY + 18;
    // Cliff with layers
    g.moveTo(lhX - 35, floorY * 0.8);
    g.lineTo(lhX - 25, lhCliffY);
    g.lineTo(lhX + 28, lhCliffY + 3);
    g.lineTo(lhX + 40, floorY * 0.8);
    g.closePath();
    g.fill({ color: 0x667766 });
    // Cliff face strata
    for (let y = lhCliffY + 5; y < floorY * 0.8; y += 8) {
      g.moveTo(lhX - 30, y);
      g.lineTo(lhX + 35, y + 2);
      g.stroke({ color: 0x556655, width: 0.6, alpha: 0.3 });
    }
    // Lighthouse tower — tapered
    g.moveTo(lhX - 6, lhCliffY);
    g.lineTo(lhX - 4, lhCliffY - 52);
    g.lineTo(lhX + 4, lhCliffY - 52);
    g.lineTo(lhX + 6, lhCliffY);
    g.closePath();
    g.fill({ color: 0xeeeedd });
    // Red stripes
    g.rect(lhX - 5, lhCliffY - 38, 10, 10);
    g.fill({ color: 0xcc3333 });
    g.rect(lhX - 5, lhCliffY - 18, 10, 10);
    g.fill({ color: 0xcc3333 });
    // Lamp room
    g.rect(lhX - 7, lhCliffY - 58, 14, 8);
    g.fill({ color: 0xffee88, alpha: 0.6 });
    g.rect(lhX - 7, lhCliffY - 58, 14, 8);
    g.stroke({ color: 0x333333, width: 1 });
    // Window panes
    g.moveTo(lhX, lhCliffY - 58);
    g.lineTo(lhX, lhCliffY - 50);
    g.stroke({ color: 0x333333, width: 0.8 });
    // Roof
    g.moveTo(lhX - 8, lhCliffY - 58);
    g.lineTo(lhX, lhCliffY - 65);
    g.lineTo(lhX + 8, lhCliffY - 58);
    g.closePath();
    g.fill({ color: 0x444444 });
    // Light beam
    this._flames.push({ x: lhX, y: lhCliffY - 54, baseRadius: 5, phase: 0 });

    // Coastal cliffs (left) — larger, more detail
    g.moveTo(-15, floorY * 0.55);
    g.lineTo(-15, seaY + 8);
    g.lineTo(sw * 0.1, seaY + 3);
    g.lineTo(sw * 0.16, seaY + 12);
    g.lineTo(sw * 0.22, floorY * 0.7);
    g.lineTo(sw * 0.2, floorY);
    g.lineTo(-15, floorY);
    g.closePath();
    g.fill({ color: 0x778877 });
    // Cliff face detail
    for (let y = seaY + 12; y < floorY; y += 8) {
      g.moveTo(0, y).lineTo(sw * 0.15, y + 2);
      g.stroke({ color: 0x667766, width: 0.6, alpha: 0.3 });
    }
    // Grass on cliff top
    for (let x = 0; x < sw * 0.12; x += 6) {
      g.moveTo(x, seaY + 5 + x * 0.2);
      g.lineTo(x + 1, seaY + 1 + x * 0.2);
      g.stroke({ color: 0x558844, width: 1, alpha: 0.5 });
    }

    // Rock pools (foreground, near shore)
    for (const rpx of [sw * 0.3, sw * 0.5, sw * 0.7]) {
      g.ellipse(rpx, floorY + 3, 10, 4);
      g.fill({ color: 0x336699, alpha: 0.2 });
      g.ellipse(rpx, floorY + 3, 10, 4);
      g.stroke({ color: 0x667766, width: 1, alpha: 0.3 });
    }

    // Beach / sand ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Sand texture
    for (let i = 0; i < 25; i++) {
      const sx = Math.sin(i * 7.7) * sw * 0.45 + sw * 0.5;
      g.ellipse(sx, floorY + 4 + (i % 4) * 3, 4 + i % 3, 1.5);
      g.fill({ color: a.groundHighlight, alpha: 0.12 });
    }
    // Driftwood
    g.moveTo(sw * 0.4, floorY + 5);
    g.lineTo(sw * 0.48, floorY + 3);
    g.stroke({ color: 0x8a7a5a, width: 3, cap: "round" });
    g.moveTo(sw * 0.42, floorY + 4);
    g.lineTo(sw * 0.44, floorY + 2);
    g.stroke({ color: 0x8a7a5a, width: 1.5, cap: "round" });
    // Shells
    for (let i = 0; i < 8; i++) {
      const sx = sw * (0.12 + i * 0.11);
      g.ellipse(sx, floorY + 4, 3, 2);
      g.fill({ color: 0xeeddcc, alpha: 0.4 });
    }
    // Seaweed
    for (let i = 0; i < 4; i++) {
      const sx = sw * (0.25 + i * 0.18);
      g.moveTo(sx, floorY + 2);
      g.quadraticCurveTo(sx + 3, floorY - 3, sx + 6, floorY + 1);
      g.stroke({ color: 0x336633, width: 1.5, alpha: 0.3 });
    }

    // Beach grass tufts
    for (const bx of [sw * 0.08, sw * 0.18]) {
      for (let b = 0; b < 5; b++) {
        g.moveTo(bx + b * 2, floorY);
        g.lineTo(bx + b * 2 + (b - 2) * 2, floorY - 8 - b);
        g.stroke({ color: 0x88aa55, width: 0.8, alpha: 0.5 });
      }
    }

    // Wave ripples
    for (let i = 0; i < 10; i++) {
      this._ripples.push({
        y: seaY + 4 + i * 5, amplitude: 1.5 + Math.random() * 2,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.8 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.08,
      });
    }
    // Seagulls
    for (let i = 0; i < 8; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * (0.12 + Math.random() * 0.25),
        vx: 0.3 + Math.random() * 0.4, vy: Math.sin(i) * 0.1,
        radius: 1.5, alpha: 0.5, phase: Math.random() * Math.PI * 2, color: 0xffffff,
      });
    }
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.4 });
  }

  private _update_cornwall(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Ocean waves
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        g.lineTo(x, r.y + Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude);
      }
      g.stroke({ color: 0x88bbdd, width: 1, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }
    // Wave foam
    const seaY = this._floorY * 0.48;
    for (let i = 0; i < 4; i++) {
      const fy = seaY + 8 + i * 12;
      for (let x = 0; x < sw; x += 45) {
        const fx = x + Math.sin(time * (1 + i * 0.3) + x * 0.01) * 15;
        g.moveTo(fx, fy);
        g.lineTo(fx + 12, fy - 1);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.1 + Math.sin(time * 2 + i) * 0.04 });
      }
    }
    // Shore wash
    const washY = this._floorY - 3;
    const washPhase = (Math.sin(time * 0.5) + 1) * 0.5;
    g.moveTo(sw * 0.15, washY + 3);
    for (let x = sw * 0.15; x < sw * 0.85; x += 8) {
      g.lineTo(x, washY + 3 - washPhase * 4 + Math.sin(x * 0.08 + time * 2) * 1);
    }
    g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.08 * washPhase });
    // Seagulls — V shapes
    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(time * 2 + p.phase) * 0.15;
      if (p.x > sw + 20) { p.x = -20; p.y = this._floorY * (0.12 + Math.random() * 0.2); }
      const wingFlap = Math.sin(time * 6 + p.phase) * 2;
      g.moveTo(p.x - 5, p.y + wingFlap);
      g.lineTo(p.x, p.y);
      g.lineTo(p.x + 5, p.y + wingFlap);
      g.stroke({ color: 0xffffff, width: 1.2, alpha: p.alpha });
    }
    // Lighthouse beam sweep
    for (const f of this._flames) {
      const beamAngle = time * 0.5;
      const bx = f.x + Math.cos(beamAngle) * 40;
      const by = f.y + Math.sin(beamAngle) * 20;
      g.moveTo(f.x, f.y);
      g.lineTo(bx, by);
      g.stroke({ color: 0xffee88, width: 3, alpha: 0.06 });
      g.circle(f.x, f.y, 6 + Math.sin(time * 3) * 1);
      g.fill({ color: 0xffee88, alpha: 0.3 });
    }
  }

  // =========================================================================
  // SHADOW KEEP — Ultra dark fortress, purple runes, floating chains, dark fog
  // =========================================================================

  private _build_shadow_keep(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Near-black background
    this._drawSkyGradient(g, a, sw, floorY, 8);

    // Barely visible distant towers/turrets through darkness
    for (const tx of [sw * 0.15, sw * 0.4, sw * 0.6, sw * 0.85]) {
      const th = 40 + Math.sin(tx * 0.1) * 15;
      g.rect(tx - 8, floorY * 0.06 - th, 16, th);
      g.fill({ color: 0x060610, alpha: 0.5 });
      // Turret top
      g.moveTo(tx - 10, floorY * 0.06 - th);
      g.lineTo(tx, floorY * 0.06 - th - 10);
      g.lineTo(tx + 10, floorY * 0.06 - th);
      g.closePath();
      g.fill({ color: 0x060610, alpha: 0.5 });
    }

    // Massive dark fortress wall
    const wallY = floorY * 0.15;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x0a0a18 });
    // Stone lines
    for (let y = wallY + 18; y < floorY; y += 18) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x0e0e20, width: 0.7, alpha: 0.5 });
    }
    let kRow = 0;
    for (let y = wallY; y < floorY; y += 18) {
      const off = (kRow % 2) * 22;
      for (let x = off; x < sw; x += 44) {
        g.moveTo(x, y).lineTo(x, y + 18);
        g.stroke({ color: 0x0e0e20, width: 0.4, alpha: 0.3 });
      }
      kRow++;
    }

    // Portcullis (center back)
    const portX = sw * 0.5;
    const portY = wallY + 10;
    const portW = 50;
    const portH = floorY - portY - 5;
    g.roundRect(portX - portW / 2 - 4, portY - 4, portW + 8, portH + 4, 3);
    g.fill({ color: 0x080818 });
    // Iron bars (vertical)
    for (let x = portX - portW / 2 + 5; x < portX + portW / 2; x += 8) {
      g.moveTo(x, portY);
      g.lineTo(x, portY + portH);
      g.stroke({ color: 0x333344, width: 2 });
    }
    // Iron bars (horizontal)
    for (let y = portY + 10; y < portY + portH; y += 12) {
      g.moveTo(portX - portW / 2, y);
      g.lineTo(portX + portW / 2, y);
      g.stroke({ color: 0x333344, width: 1.5 });
    }
    // Darkness beyond
    g.rect(portX - portW / 2, portY, portW, portH);
    g.fill({ color: 0x020208, alpha: 0.6 });

    // Massive pillars with gargoyles
    for (const px of [sw * 0.08, sw * 0.28, sw * 0.72, sw * 0.92]) {
      g.rect(px - 16, wallY, 32, floorY - wallY);
      g.fill({ color: 0x0c0c1a });
      g.rect(px - 16, wallY, 6, floorY - wallY);
      g.fill({ color: 0x0e0e1e, alpha: 0.5 });
      // Capital
      g.rect(px - 18, wallY, 36, 14);
      g.fill({ color: 0x101028 });
      // Base
      g.rect(px - 18, floorY - 14, 36, 14);
      g.fill({ color: 0x101028 });
      // Gargoyle
      g.circle(px, wallY + 22, 7);
      g.fill({ color: 0x151530 });
      g.circle(px - 2.5, wallY + 20, 1.5);
      g.fill({ color: a.accentColor, alpha: 0.3 });
      g.circle(px + 2.5, wallY + 20, 1.5);
      g.fill({ color: a.accentColor, alpha: 0.3 });
      // Wing-like protrusions
      g.moveTo(px - 7, wallY + 22);
      g.lineTo(px - 14, wallY + 18);
      g.stroke({ color: 0x151530, width: 2 });
      g.moveTo(px + 7, wallY + 22);
      g.lineTo(px + 14, wallY + 18);
      g.stroke({ color: 0x151530, width: 2 });
    }

    // Glowing rune circles — more ornate
    const runeXs = [sw * 0.18, sw * 0.38, sw * 0.62, sw * 0.82];
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (floorY - wallY) * 0.4;
      // Outer circle
      g.circle(rx, ry, 16);
      g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.2 });
      // Middle circle
      g.circle(rx, ry, 11);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.15 });
      // Inner rune (triangle + inverted triangle = star)
      g.moveTo(rx, ry - 9);
      g.lineTo(rx - 8, ry + 5);
      g.lineTo(rx + 8, ry + 5);
      g.closePath();
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.25 });
      g.moveTo(rx, ry + 9);
      g.lineTo(rx - 8, ry - 5);
      g.lineTo(rx + 8, ry - 5);
      g.closePath();
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.2 });
      // Center eye
      g.circle(rx, ry, 3);
      g.fill({ color: a.accentColor, alpha: 0.3 });
    }

    // Hanging chains — more detailed with hooks
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.04 + i * 0.1);
      const cy1 = wallY + 3;
      const cy2 = wallY + 35 + (i % 4) * 18;
      // Chain links
      for (let y = cy1; y < cy2; y += 7) {
        g.ellipse(cx + Math.sin(y * 0.3) * 1, y, 2.5, 3.5);
        g.stroke({ color: 0x444455, width: 1 });
      }
      // Hook or weight at bottom
      if (i % 3 === 0) {
        g.moveTo(cx, cy2);
        g.quadraticCurveTo(cx + 5, cy2 + 8, cx, cy2 + 12);
        g.stroke({ color: 0x444455, width: 1.5 });
      } else {
        g.circle(cx, cy2 + 4, 4);
        g.fill({ color: 0x222233 });
        g.circle(cx, cy2 + 4, 4);
        g.stroke({ color: 0x444455, width: 1 });
      }
    }

    // Weapon racks on walls
    for (const wx of [sw * 0.15, sw * 0.85]) {
      const wy = wallY + (floorY - wallY) * 0.6;
      // Rack
      g.rect(wx - 18, wy, 36, 3);
      g.fill({ color: 0x222233 });
      // Weapons
      g.moveTo(wx - 12, wy);
      g.lineTo(wx - 12, wy - 25);
      g.stroke({ color: 0x555566, width: 2 });
      g.moveTo(wx, wy);
      g.lineTo(wx + 2, wy - 30);
      g.stroke({ color: 0x555566, width: 2 });
      g.moveTo(wx + 12, wy);
      g.lineTo(wx + 10, wy - 22);
      g.stroke({ color: 0x555566, width: 2 });
      // Blade tips
      g.moveTo(wx - 14, wy - 25);
      g.lineTo(wx - 12, wy - 30);
      g.lineTo(wx - 10, wy - 25);
      g.closePath();
      g.fill({ color: 0x777788 });
    }

    // Dark floor with purple rune patterns
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 2);
    g.fill({ color: a.groundHighlight, alpha: 0.3 });
    // Rune circle on floor (center)
    g.ellipse(sw * 0.5, floorY + 8, 60, 8);
    g.stroke({ color: a.accentColor, width: 1, alpha: 0.1 });
    g.ellipse(sw * 0.5, floorY + 8, 40, 5);
    g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.08 });
    // Rune lines on floor
    for (let x = sw * 0.15; x < sw * 0.85; x += 35) {
      g.moveTo(x, floorY + 3);
      g.lineTo(x + 18, floorY + 3);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.12 });
    }

    // Purple mist particles
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.2, vy: -0.05 - Math.random() * 0.1,
        radius: 2 + Math.random() * 2.5, alpha: 0.1 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    // Dark mist layers
    for (let i = 0; i < 5; i++) {
      this._mistLayers.push({
        y: floorY - 12 + i * 8, speed: 0.15 + i * 0.06,
        offset: i * 55, alpha: 0.05, height: 22 + i * 6,
      });
    }
    g.rect(0, floorY * 0.25, sw, floorY * 0.75);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_shadow_keep(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Pulsing runes
    const runeXs = [sw * 0.18, sw * 0.38, sw * 0.62, sw * 0.82];
    const wallY = this._floorY * 0.15;
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (this._floorY - wallY) * 0.4;
      const pulse = 0.15 + Math.sin(time * 1.5 + i * 1.2) * 0.1;
      g.circle(rx, ry, 18);
      g.fill({ color: 0x8844cc, alpha: pulse * 0.2 });
      g.circle(rx, ry, 4);
      g.fill({ color: 0xaa66ee, alpha: pulse });
    }
    // Floor rune circle pulse
    const floorPulse = 0.05 + Math.sin(time * 0.8) * 0.03;
    g.ellipse(sw * 0.5, this._floorY + 8, 60, 8);
    g.stroke({ color: 0x8844cc, width: 1.5, alpha: floorPulse });
    // Floating shadow particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.1) { p.y = this._floorY * 0.85; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.4 + Math.sin(time * 1.5 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: fade * 0.12 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Dark fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 20 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 70) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 50, m.height / 2);
        g.fill({ color: 0x110022, alpha: m.alpha });
      }
    }
    // Swaying chains
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.04 + i * 0.1);
      const sway = Math.sin(time * 0.6 + i * 0.8) * 2;
      g.moveTo(cx + sway * 0.3, this._floorY * 0.15 + 35 + (i % 4) * 18);
      g.lineTo(cx + sway, this._floorY * 0.15 + 40 + (i % 4) * 18);
      g.stroke({ color: 0x444455, width: 1, alpha: 0.3 });
    }
  }

  // =========================================================================
  // CAMLANN BATTLEFIELD — War-torn, broken weapons, siege fires, red sky
  // =========================================================================

  private _build_camlann(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Red/orange glow at horizon (fires)
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: 0xcc4422, alpha: 0.08 });
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: 0xff6633, alpha: 0.06 });

    // Smoke clouds — layered
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 8; i++) {
        const cx = sw * (Math.sin(i * 2.1 + layer * 1.5) * 0.4 + 0.5);
        const cy = floorY * (0.03 + layer * 0.06 + i * 0.03);
        g.circle(cx, cy, 28 + i * 4 + layer * 8);
        g.fill({ color: 0x443333 - layer * 0x111111, alpha: 0.2 - i * 0.015 - layer * 0.05 });
      }
    }

    // Distant hills / terrain
    g.moveTo(0, floorY * 0.55);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.45 + Math.sin(x * 0.006 + 1) * 0.05));
    }
    g.lineTo(sw, floorY * 0.6);
    g.lineTo(0, floorY * 0.6);
    g.closePath();
    g.fill({ color: 0x3a2a20, alpha: 0.4 });

    // Distant burning buildings — more
    for (const bx of [sw * 0.1, sw * 0.25, sw * 0.42, sw * 0.58, sw * 0.75, sw * 0.92]) {
      const bh = 25 + Math.sin(bx * 0.7) * 15;
      const by = floorY * 0.5;
      // Building silhouette
      g.rect(bx - 10, by - bh, 20, bh + 8);
      g.fill({ color: 0x2a2020, alpha: 0.45 });
      // Partial collapse
      if (Math.sin(bx * 1.3) > 0) {
        g.moveTo(bx - 8, by - bh);
        g.lineTo(bx + 5, by - bh + 8);
        g.lineTo(bx + 10, by - bh);
        g.closePath();
        g.fill({ color: 0x443333, alpha: 0.3 });
      }
      // Fire glow on top
      g.circle(bx, by - bh, 8);
      g.fill({ color: 0xff4400, alpha: 0.12 });
      this._flames.push({ x: bx, y: by - bh - 4, baseRadius: 4, phase: bx * 0.1 });
    }

    // Siege tower ruin (left)
    const stX = sw * 0.08;
    g.rect(stX - 15, floorY - 70, 30, 70);
    g.fill({ color: 0x3a2a1a, alpha: 0.6 });
    // Tilted/broken top
    g.moveTo(stX - 15, floorY - 70);
    g.lineTo(stX - 10, floorY - 80);
    g.lineTo(stX + 20, floorY - 65);
    g.lineTo(stX + 15, floorY - 70);
    g.closePath();
    g.fill({ color: 0x3a2a1a, alpha: 0.5 });
    // Crossbeams
    for (let y = floorY - 60; y < floorY; y += 15) {
      g.moveTo(stX - 15, y);
      g.lineTo(stX + 15, y);
      g.stroke({ color: 0x2a1a0a, width: 2, alpha: 0.5 });
    }
    // Fire on siege tower
    this._flames.push({ x: stX, y: floorY - 75, baseRadius: 8, phase: 3.5 });

    // Broken wagon wheel
    const wheelX = sw * 0.22;
    g.circle(wheelX, floorY - 5, 16);
    g.stroke({ color: 0x4a3a2a, width: 3 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      g.moveTo(wheelX, floorY - 5);
      g.lineTo(wheelX + Math.cos(angle) * 14, floorY - 5 + Math.sin(angle) * 14);
      g.stroke({ color: 0x4a3a2a, width: 1.5 });
    }
    // Second broken wheel (tilted)
    g.ellipse(wheelX + 25, floorY - 2, 10, 6);
    g.stroke({ color: 0x4a3a2a, width: 2 });

    // Broken spears / weapons stuck in ground — more variety
    const weaponXs = [sw * 0.15, sw * 0.3, sw * 0.38, sw * 0.48, sw * 0.56, sw * 0.65, sw * 0.75, sw * 0.85];
    for (let i = 0; i < weaponXs.length; i++) {
      const wx = weaponXs[i];
      const angle = -0.2 + (i % 4) * 0.08;
      const wLen = 30 + (i % 3) * 12;
      const topX = wx + Math.sin(angle) * wLen;
      const topY = floorY - Math.cos(angle) * wLen;
      g.moveTo(wx, floorY + 2);
      g.lineTo(topX, topY);
      g.stroke({ color: 0x5a4a3a, width: 2, cap: "round" });
      // Spear point, axe head, or broken
      if (i % 3 === 0) {
        g.moveTo(topX - 3, topY + 2);
        g.lineTo(topX, topY - 7);
        g.lineTo(topX + 3, topY + 2);
        g.closePath();
        g.fill({ color: 0x888899 });
      } else if (i % 3 === 1) {
        // Axe head
        g.moveTo(topX, topY);
        g.quadraticCurveTo(topX + 8, topY - 5, topX + 6, topY + 6);
        g.lineTo(topX, topY);
        g.fill({ color: 0x888899 });
      }
    }

    // Fallen knight helmets
    for (const hx of [sw * 0.35, sw * 0.62]) {
      g.ellipse(hx, floorY + 1, 7, 5);
      g.fill({ color: 0x666677 });
      g.ellipse(hx, floorY + 1, 7, 5);
      g.stroke({ color: 0x555566, width: 1 });
      // Visor slit
      g.moveTo(hx - 3, floorY);
      g.lineTo(hx + 3, floorY);
      g.stroke({ color: 0x333344, width: 1 });
    }

    // Shields scattered
    for (const sx of [sw * 0.28, sw * 0.5, sw * 0.72]) {
      g.ellipse(sx, floorY + 2, 12, 5);
      g.fill({ color: 0x883322 });
      g.ellipse(sx, floorY + 2, 12, 5);
      g.stroke({ color: 0x5a2a1a, width: 1 });
      g.circle(sx, floorY + 2, 3);
      g.fill({ color: 0x888899 });
    }

    // Tattered banner on pole
    const bannerX = sw * 0.45;
    g.moveTo(bannerX, floorY + 3);
    g.lineTo(bannerX - 1, floorY - 55);
    g.stroke({ color: 0x5a4a3a, width: 3, cap: "round" });
    // Torn banner
    g.moveTo(bannerX, floorY - 52);
    g.lineTo(bannerX + 22, floorY - 48);
    g.lineTo(bannerX + 18, floorY - 38);
    g.lineTo(bannerX + 25, floorY - 35);
    g.lineTo(bannerX + 15, floorY - 28);
    g.lineTo(bannerX, floorY - 32);
    g.closePath();
    g.fill({ color: 0x882222, alpha: 0.5 });
    this._banners.push({
      x: bannerX, y: floorY - 52, width: 25, height: 24,
      phase: 0, color: 0x882222, trimColor: 0xddaa33,
    });

    // Trenches / disturbed earth
    for (let i = 0; i < 5; i++) {
      const tx = sw * (0.12 + i * 0.18);
      g.ellipse(tx, floorY + 5, 22, 5);
      g.fill({ color: 0x3a2a1a, alpha: 0.35 });
    }

    // Ground — muddy, scarred earth
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Blood/mud stains
    for (let i = 0; i < 10; i++) {
      const sx = sw * (0.06 + i * 0.09);
      g.ellipse(sx, floorY + 5 + (i % 3) * 4, 7 + i % 4 * 3, 3);
      g.fill({ color: 0x4a2020, alpha: 0.2 });
    }
    // Crater
    g.ellipse(sw * 0.6, floorY + 6, 20, 5);
    g.fill({ color: 0x3a2a1a, alpha: 0.3 });
    g.ellipse(sw * 0.6, floorY + 6, 20, 5);
    g.stroke({ color: 0x4a3a2a, width: 0.8, alpha: 0.3 });

    // Smoke / fire particles — more
    for (let i = 0; i < 28; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.25,
        radius: 1.5 + Math.random() * 2, alpha: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? 0xff6633 : i % 4 === 1 ? 0xffaa44 : 0x664444,
      });
    }
    // Mist layers
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY - 5 + i * 10, speed: 0.2 + i * 0.1,
        offset: i * 80, alpha: 0.04, height: 20 + i * 6,
      });
    }
    g.rect(0, floorY * 0.35, sw, floorY * 0.65);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_camlann(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Distant fires
    for (const f of this._flames) {
      const flicker = Math.sin(time * 6 + f.phase) * 2;
      const flicker2 = Math.cos(time * 9 + f.phase) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y, f.baseRadius + 3 + flicker);
      g.fill({ color: 0xff4400, alpha: 0.12 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.3, f.baseRadius, f.baseRadius + 2 + flicker);
      g.fill({ color: 0xff6622, alpha: 0.45 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.4, f.baseRadius * 0.7);
      g.fill({ color: 0xffcc44, alpha: 0.65 });
    }
    // Smoke and ember particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.2;
      p.y += p.vy;
      if (p.y < this._floorY * 0.05) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 2.5 + p.phase) * 0.4);
      if (p.color === 0x664444) {
        // Smoke
        g.circle(p.x, p.y, p.radius + 3);
        g.fill({ color: p.color, alpha: fade * 0.25 });
      } else {
        // Ember
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: p.color, alpha: fade });
        g.circle(p.x, p.y, p.radius * 0.5);
        g.fill({ color: 0xffcc44, alpha: fade * 0.8 });
      }
    }
    // Banner sway
    for (const b of this._banners) {
      const sway = Math.sin(time * 1.5 + b.phase) * 3;
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway, b.y + 4 + sway * 0.5);
      g.lineTo(b.x + b.width * 0.7 + sway * 0.8, b.y + b.height * 0.5);
      g.stroke({ color: b.color, width: 1.5, alpha: 0.3 });
    }
    // Smoke drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 25 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 70) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 45, m.height / 2);
        g.fill({ color: 0x443333, alpha: m.alpha });
      }
    }
  }

  // =========================================================================
  // GENERIC FALLBACK
  // =========================================================================

  // =========================================================================
  // BROCÉLIANDE FOREST — enchanted woodland, ancient oaks, fireflies, roots
  // =========================================================================

  private _build_broceliande(a: DuelArenaDef, sw: number, sh: number): void {
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

  private _update_broceliande(time: number): void {
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

  private _build_tintagel(a: DuelArenaDef, sw: number, sh: number): void {
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

  private _update_tintagel(time: number): void {
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

    // Sky gradient bands
    const skyBands = 8;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const bandY = floorY * t;
      const bandH = floorY / skyBands + 1;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      g.rect(0, bandY, sw, bandH);
      g.fill({ color: (r << 16) | (gc << 8) | b });
    }

    // Ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    // Ground highlight strip
    g.rect(0, floorY, sw, 4);
    g.fill({ color: a.groundHighlight });

    // Accent line on horizon
    g.moveTo(0, floorY);
    g.lineTo(sw, floorY);
    g.stroke({ color: a.accentColor, width: 2, alpha: 0.3 });

    // Fog layer
    if (a.fogAlpha > 0) {
      g.rect(0, floorY - 40, sw, 60);
      g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });
    }

    // Initialize particles for animation
    this._particles = [];
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: Math.random() * floorY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.2,
        radius: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }
  }

  private _updateGeneric(time: number): void {
    if (!this._arena) return;
    const g = this._animGfx;

    // Animate floating particles
    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = this._floorY; p.x = Math.random() * this._sw; }
      if (p.x < -10) p.x = this._sw;
      if (p.x > this._sw + 10) p.x = 0;
      const flicker = Math.sin(time * 2 + p.phase) * 0.1;
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: Math.max(0.05, p.alpha + flicker) });
    }

    // Subtle fog drift
    if (this._arena.fogAlpha > 0) {
      const fogDrift = Math.sin(time * 0.3) * 20;
      g.rect(fogDrift, this._floorY - 30, this._sw, 40);
      g.fill({ color: this._arena.fogColor, alpha: this._arena.fogAlpha * 0.15 });
    }
  }
}
