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

    // Dark interior ceiling (no sky – indoors)
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Warm ambient light gradient from below
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: 0x332211, alpha: 0.3 });

    // Vaulted ceiling arches
    for (let i = 0; i < 6; i++) {
      const cx = sw * (0.1 + i * 0.16);
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x3a2a22, width: 8 });
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x4a3a30, width: 4 });
    }
    // Ceiling keystone line
    g.moveTo(0, floorY * 0.08);
    g.lineTo(sw, floorY * 0.08);
    g.stroke({ color: 0x4a3a30, width: 3 });

    // Back wall
    const wallY = floorY * 0.15;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x443322 });
    // Stone texture
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

    // Large tapestries on back wall
    const tapestryXs = [sw * 0.12, sw * 0.32, sw * 0.68, sw * 0.88];
    const tapColors = [0xaa2222, 0x2244aa, 0xaa2222, 0x2244aa];
    for (let i = 0; i < tapestryXs.length; i++) {
      const tx = tapestryXs[i];
      const ty = wallY + 20;
      const tw = 40;
      const th = 80;
      // Rod
      g.rect(tx - tw / 2 - 4, ty - 4, tw + 8, 4);
      g.fill({ color: 0x8b7355 });
      // Tapestry body
      g.rect(tx - tw / 2, ty, tw, th);
      g.fill({ color: tapColors[i] });
      // Gold border
      g.rect(tx - tw / 2, ty, tw, th);
      g.stroke({ color: a.accentColor, width: 2 });
      // Central emblem (shield shape)
      g.moveTo(tx, ty + 15);
      g.lineTo(tx - 10, ty + 25);
      g.lineTo(tx - 10, ty + 45);
      g.lineTo(tx, ty + 55);
      g.lineTo(tx + 10, ty + 45);
      g.lineTo(tx + 10, ty + 25);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.5 });
      // Fringe at bottom
      for (let fx = tx - tw / 2 + 3; fx < tx + tw / 2; fx += 5) {
        g.moveTo(fx, ty + th);
        g.lineTo(fx, ty + th + 6);
        g.stroke({ color: a.accentColor, width: 1, alpha: 0.6 });
      }
      // Register for banner sway animation
      this._banners.push({
        x: tx - tw / 2, y: ty, width: tw, height: th,
        phase: i * 1.5, color: tapColors[i], trimColor: a.accentColor,
      });
    }

    // Round table in background (perspective ellipse)
    const tableX = sw * 0.5;
    const tableY = floorY * 0.72;
    const tableRX = sw * 0.22;
    const tableRY = 18;
    // Table shadow
    g.ellipse(tableX, tableY + 6, tableRX + 4, tableRY + 2);
    g.fill({ color: 0x000000, alpha: 0.2 });
    // Table body (thick wooden ring)
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.fill({ color: 0x5a3a1a });
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.stroke({ color: 0x4a2a0a, width: 3 });
    // Inner gap (the round table's open center)
    g.ellipse(tableX, tableY, tableRX * 0.65, tableRY * 0.6);
    g.fill({ color: 0x443322 });
    // Table highlight
    g.ellipse(tableX, tableY - 2, tableRX * 0.9, tableRY * 0.5);
    g.stroke({ color: 0x7a5a3a, width: 1, alpha: 0.4 });

    // Chairs around the table (small rectangles)
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const cx = tableX + Math.cos(angle) * (tableRX + 14);
      const cy = tableY + Math.sin(angle) * (tableRY + 10);
      g.roundRect(cx - 4, cy - 6, 8, 12, 2);
      g.fill({ color: 0x4a2a12 });
    }

    // Candelabras on table
    const candleXs = [tableX - tableRX * 0.4, tableX, tableX + tableRX * 0.4];
    for (const cx of candleXs) {
      // Base
      g.rect(cx - 3, tableY - 10, 6, 10);
      g.fill({ color: 0x8b7355 });
      // Candle
      g.rect(cx - 1.5, tableY - 20, 3, 10);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: tableY - 24, baseRadius: 4, phase: cx * 0.2 });
    }

    // Wall sconce torches
    const sconces = [sw * 0.04, sw * 0.22, sw * 0.5, sw * 0.78, sw * 0.96];
    for (const sx of sconces) {
      const sy = wallY + 50;
      g.rect(sx - 2, sy, 4, 15);
      g.fill({ color: 0x3a3a3a });
      g.rect(sx - 5, sy + 10, 10, 3);
      g.fill({ color: 0x3a3a3a });
      g.rect(sx - 1.5, sy - 8, 3, 12);
      g.fill({ color: 0x6b4c2a });
      this._flames.push({ x: sx, y: sy - 12, baseRadius: 5, phase: sx * 0.15 });
      // Glow
      for (let r = 35; r > 0; r -= 5) {
        g.circle(sx, sy - 12, r);
        g.fill({ color: 0xff8833, alpha: 0.006 });
      }
    }

    // Stone floor with rich tiles
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Tile pattern
    let tRow = 0;
    for (let y = floorY + 2; y < sh; y += 20) {
      const off = (tRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.roundRect(x + 1, y + 1, 38, 18, 1);
        g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.2 });
        // Alternating dark tiles
        if ((Math.floor(x / 40) + tRow) % 2 === 0) {
          g.roundRect(x + 1, y + 1, 38, 18, 1);
          g.fill({ color: 0x000000, alpha: 0.06 });
        }
      }
      tRow++;
    }

    // Fog / warm ambient
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_round_table(time: number): void {
    const g = this._animGfx;
    // Flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 2;
      const flicker2 = Math.cos(time * 12 + f.phase * 1.7) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 3 + Math.sin(time * 5 + f.phase) * 1);
      g.fill({ color: 0xff6600, alpha: 0.12 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.5, f.baseRadius, f.baseRadius + 2 + flicker);
      g.fill({ color: 0xff6611, alpha: 0.7 });
      g.ellipse(f.x, f.y - 1, f.baseRadius * 0.5, f.baseRadius + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.9 });
      g.circle(f.x, f.y + 1, 1.5);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
    // Subtle tapestry sway
    for (const b of this._banners) {
      const sway = Math.sin(time * 0.8 + b.phase) * 1.5;
      // Just re-draw slight highlight shift
      g.rect(b.x + sway * 0.3, b.y + b.height * 0.3, b.width * 0.3, b.height * 0.4);
      g.fill({ color: 0xffffff, alpha: 0.02 + Math.sin(time + b.phase) * 0.01 });
    }
  }

  // =========================================================================
  // MORDRED'S THRONE — Dark corrupted throne room, purple flames, cracked floor
  // =========================================================================

  private _build_mordred_throne(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Very dark interior
    this._drawSkyGradient(g, a, sw, floorY, 10);

    // Back wall — dark stone with purple veins
    const wallY = floorY * 0.2;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x1a1122 });
    // Stone texture
    for (let y = wallY + 12; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x151020, width: 0.7, alpha: 0.5 });
    }
    // Purple corruption veins on walls
    const veins = [
      [sw * 0.1, wallY + 30, sw * 0.15, floorY - 10],
      [sw * 0.3, wallY + 50, sw * 0.28, floorY - 20],
      [sw * 0.7, wallY + 20, sw * 0.72, floorY - 15],
      [sw * 0.9, wallY + 40, sw * 0.88, floorY - 10],
    ];
    for (const [x1, y1, x2, y2] of veins) {
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x1 + 20, (y1 + y2) / 2, x2, y2);
      g.stroke({ color: 0x6622aa, width: 2, alpha: 0.3 });
      g.moveTo(x1 + 2, y1 + 5);
      g.quadraticCurveTo(x1 + 18, (y1 + y2) / 2 + 10, x2 - 5, y2);
      g.stroke({ color: 0x8833cc, width: 1, alpha: 0.2 });
    }

    // Massive dark throne in center background
    const throneX = sw * 0.5;
    const throneY = wallY + 20;
    // Throne back (tall, pointed)
    g.moveTo(throneX - 35, floorY - 5);
    g.lineTo(throneX - 30, throneY + 30);
    g.lineTo(throneX - 20, throneY);
    g.lineTo(throneX - 8, throneY - 20);
    g.lineTo(throneX, throneY - 30);
    g.lineTo(throneX + 8, throneY - 20);
    g.lineTo(throneX + 20, throneY);
    g.lineTo(throneX + 30, throneY + 30);
    g.lineTo(throneX + 35, floorY - 5);
    g.closePath();
    g.fill({ color: 0x1a1025 });
    g.moveTo(throneX - 35, floorY - 5);
    g.lineTo(throneX - 30, throneY + 30);
    g.lineTo(throneX - 20, throneY);
    g.lineTo(throneX - 8, throneY - 20);
    g.lineTo(throneX, throneY - 30);
    g.lineTo(throneX + 8, throneY - 20);
    g.lineTo(throneX + 20, throneY);
    g.lineTo(throneX + 30, throneY + 30);
    g.lineTo(throneX + 35, floorY - 5);
    g.stroke({ color: 0x331155, width: 2 });
    // Throne seat
    g.rect(throneX - 22, floorY * 0.6, 44, 14);
    g.fill({ color: 0x221133 });
    // Skull motifs
    for (const sx of [throneX - 15, throneX + 15]) {
      g.circle(sx, throneY + 40, 5);
      g.fill({ color: 0x443355 });
      g.circle(sx - 2, throneY + 38, 1.2);
      g.fill({ color: 0x220033 });
      g.circle(sx + 2, throneY + 38, 1.2);
      g.fill({ color: 0x220033 });
    }
    // Glowing eye on throne top
    g.circle(throneX, throneY - 22, 4);
    g.fill({ color: a.accentColor, alpha: 0.6 });
    for (let r = 15; r > 0; r -= 3) {
      g.circle(throneX, throneY - 22, r);
      g.fill({ color: a.accentColor, alpha: 0.01 });
    }

    // Pillars
    for (const px of [sw * 0.15, sw * 0.85]) {
      g.rect(px - 12, wallY, 24, floorY - wallY);
      g.fill({ color: 0x1a1025 });
      g.rect(px - 14, wallY, 28, 10);
      g.fill({ color: 0x221133 });
      g.rect(px - 14, floorY - 10, 28, 10);
      g.fill({ color: 0x221133 });
      // Purple rune on pillar
      g.circle(px, wallY + (floorY - wallY) * 0.4, 6);
      g.fill({ color: a.accentColor, alpha: 0.2 });
      g.circle(px, wallY + (floorY - wallY) * 0.4, 3);
      g.fill({ color: a.accentColor, alpha: 0.4 });
    }

    // Purple flame braziers
    for (const bx of [sw * 0.25, sw * 0.75]) {
      // Brazier stand
      g.moveTo(bx - 8, floorY);
      g.lineTo(bx - 5, floorY - 30);
      g.lineTo(bx + 5, floorY - 30);
      g.lineTo(bx + 8, floorY);
      g.closePath();
      g.fill({ color: 0x2a1a33 });
      // Bowl
      g.arc(bx, floorY - 30, 10, Math.PI, 0);
      g.fill({ color: 0x331144 });
      this._flames.push({ x: bx, y: floorY - 38, baseRadius: 7, phase: bx * 0.1 });
    }

    // Cracked floor
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Cracks
    const cracks = [
      [sw * 0.15, floorY + 3, sw * 0.25, floorY + 15, sw * 0.2, floorY + 25],
      [sw * 0.4, floorY + 5, sw * 0.5, floorY + 12, sw * 0.55, floorY + 20],
      [sw * 0.65, floorY + 2, sw * 0.7, floorY + 18, sw * 0.75, floorY + 10],
      [sw * 0.85, floorY + 8, sw * 0.9, floorY + 20, sw * 0.88, floorY + 28],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of cracks) {
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.lineTo(x3, y3);
      g.stroke({ color: 0x110015, width: 1.5, alpha: 0.6 });
      // Purple glow in cracks
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.2 });
    }

    // Register purple smoke particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.5 + Math.random() * floorY * 0.4,
        vx: (Math.random() - 0.5) * 0.15, vy: -0.1 - Math.random() * 0.15,
        radius: 1.5 + Math.random() * 2, alpha: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_mordred_throne(time: number): void {
    const g = this._animGfx;
    // Purple flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 7 + f.phase) * 2.5;
      const flicker2 = Math.cos(time * 11 + f.phase * 1.5) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 5 + Math.sin(time * 4 + f.phase) * 2);
      g.fill({ color: 0x6622cc, alpha: 0.12 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.4, f.baseRadius, f.baseRadius + 3 + flicker);
      g.fill({ color: 0x7733dd, alpha: 0.65 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.5, f.baseRadius + flicker * 0.3);
      g.fill({ color: 0xcc66ff, alpha: 0.85 });
      g.circle(f.x, f.y + 1, 2);
      g.fill({ color: 0xeeccff, alpha: 0.9 });
    }
    // Floating purple particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.2) { p.y = this._floorY * 0.9; p.x = Math.random() * this._sw; }
      const pulse = p.alpha * (0.4 + Math.sin(time * 2 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: pulse * 0.15 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: pulse });
    }
    // Pulsing throne eye
    const eyePulse = 0.3 + Math.sin(time * 1.5) * 0.2;
    g.circle(this._sw * 0.5, this._floorY * 0.2 + 20 - 22, 6);
    g.fill({ color: 0xcc44ff, alpha: eyePulse });
  }

  // =========================================================================
  // GLASTONBURY ABBEY — Ruined abbey, broken arches, holy light
  // =========================================================================

  private _build_glastonbury(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Hazy golden horizon
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: 0xddcc88, alpha: 0.08 });

    // Rolling green hills in background
    g.moveTo(0, floorY * 0.6);
    g.quadraticCurveTo(sw * 0.15, floorY * 0.5, sw * 0.3, floorY * 0.55);
    g.quadraticCurveTo(sw * 0.5, floorY * 0.48, sw * 0.7, floorY * 0.53);
    g.quadraticCurveTo(sw * 0.85, floorY * 0.5, sw, floorY * 0.58);
    g.lineTo(sw, floorY * 0.7);
    g.lineTo(0, floorY * 0.7);
    g.closePath();
    g.fill({ color: 0x557744, alpha: 0.35 });

    // Abbey ruins — tall broken arches
    const archPositions = [sw * 0.15, sw * 0.35, sw * 0.55, sw * 0.75];
    for (let i = 0; i < archPositions.length; i++) {
      const ax = archPositions[i];
      const archH = 100 + (i % 2) * 20;
      const pillarW = 12;
      // Left pillar
      g.rect(ax - 20, floorY - archH, pillarW, archH);
      g.fill({ color: 0x8a8a7a });
      // Right pillar
      g.rect(ax + 8, floorY - archH + (i % 2) * 15, pillarW, archH - (i % 2) * 15);
      g.fill({ color: 0x8a8a7a });
      // Pointed gothic arch (if not broken)
      if (i % 2 === 0) {
        g.moveTo(ax - 20, floorY - archH);
        g.quadraticCurveTo(ax - 6, floorY - archH - 25, ax + 8, floorY - archH);
        g.stroke({ color: 0x8a8a7a, width: 10 });
      }
      // Stone texture on pillars
      for (let y = floorY - archH + 5; y < floorY; y += 12) {
        g.moveTo(ax - 20, y).lineTo(ax - 20 + pillarW, y);
        g.stroke({ color: 0x7a7a6a, width: 0.5, alpha: 0.4 });
      }
    }

    // Rose window (circular, broken) in center
    const wX = sw * 0.5;
    const wY = floorY * 0.35;
    g.circle(wX, wY, 28);
    g.stroke({ color: 0x8a8a7a, width: 6 });
    g.circle(wX, wY, 25);
    g.fill({ color: 0x4466aa, alpha: 0.2 });
    // Radial spokes
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.moveTo(wX, wY);
      g.lineTo(wX + Math.cos(angle) * 24, wY + Math.sin(angle) * 24);
      g.stroke({ color: 0x8a8a7a, width: 2 });
    }
    // Colored glass fragments
    const glassColors = [0xaa3333, 0x3355aa, 0xddaa33, 0x33aa55];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const gx = wX + Math.cos(angle) * 14;
      const gy = wY + Math.sin(angle) * 14;
      g.circle(gx, gy, 6);
      g.fill({ color: glassColors[i % glassColors.length], alpha: 0.25 });
    }

    // Gravestones scattered
    const graves = [sw * 0.08, sw * 0.22, sw * 0.42, sw * 0.62, sw * 0.82, sw * 0.92];
    for (const gx of graves) {
      g.roundRect(gx - 5, floorY - 16, 10, 16, 3);
      g.fill({ color: 0x777768 });
      g.roundRect(gx - 5, floorY - 16, 10, 16, 3);
      g.stroke({ color: 0x666658, width: 1 });
      // Cross
      g.rect(gx - 1, floorY - 14, 2, 8);
      g.fill({ color: 0x888878, alpha: 0.5 });
      g.rect(gx - 3, floorY - 12, 6, 2);
      g.fill({ color: 0x888878, alpha: 0.5 });
    }

    // Overgrown ivy on ruins
    for (let i = 0; i < 8; i++) {
      const ix = sw * 0.1 + i * sw * 0.1 + Math.sin(i * 2) * 20;
      const iy = floorY - 40 - Math.sin(i * 3) * 30;
      g.moveTo(ix, iy);
      g.quadraticCurveTo(ix + 5, iy + 15, ix - 3, iy + 25);
      g.stroke({ color: 0x336622, width: 2, alpha: 0.4 });
      // Leaf clusters
      g.circle(ix - 1, iy + 8, 4);
      g.fill({ color: 0x447733, alpha: 0.35 });
    }

    // Ground — old stone and grass
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Grass patches
    for (let x = 0; x < sw; x += 15) {
      const blades = 2 + (Math.sin(x * 0.6) > 0 ? 1 : 0);
      for (let b = 0; b < blades; b++) {
        g.moveTo(x + b * 3, floorY + 2);
        g.lineTo(x + b * 3 + (b - 1) * 2, floorY - 4 - b * 2);
        g.stroke({ color: 0x558844, width: 1, alpha: 0.4 });
      }
    }

    // Holy light beams through window
    g.moveTo(wX - 15, wY + 25);
    g.lineTo(wX + 15, wY + 25);
    g.lineTo(wX + 50, floorY);
    g.lineTo(wX - 50, floorY);
    g.closePath();
    g.fill({ color: 0xeedd88, alpha: 0.04 });

    // Particles
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: wX - 30 + Math.random() * 60, y: wY + Math.random() * (floorY - wY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0.05 + Math.random() * 0.1,
        radius: 0.8 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: 0xeedd88,
      });
    }
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_glastonbury(time: number): void {
    const g = this._animGfx;
    // Dust motes in light beams
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.5 + p.phase) * 0.1;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.35; p.x = this._sw * 0.5 - 30 + Math.random() * 60; }
      const pulse = p.alpha * (0.5 + Math.sin(time * 1.5 + p.phase) * 0.5);
      g.circle(p.x, p.y, p.radius + 1);
      g.fill({ color: p.color, alpha: pulse * 0.2 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulse });
    }
    // Pulsing window glow
    const wX = this._sw * 0.5;
    const wY = this._floorY * 0.35;
    const pulse = 0.15 + Math.sin(time * 0.8) * 0.05;
    g.circle(wX, wY, 26);
    g.fill({ color: 0xeedd88, alpha: pulse });
  }

  // =========================================================================
  // ORKNEY WASTES — Desolate windswept wasteland, fog, dead trees
  // =========================================================================

  private _build_orkney(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Heavy overcast
    for (let i = 0; i < 12; i++) {
      const cx = sw * (Math.sin(i * 2.3) * 0.4 + 0.5);
      const cy = floorY * (0.05 + Math.sin(i * 1.7) * 0.06);
      const cr = 40 + (i % 4) * 15;
      g.circle(cx, cy, cr);
      g.fill({ color: 0x556666, alpha: 0.35 });
      g.circle(cx + cr * 0.3, cy + 5, cr * 0.7);
      g.fill({ color: 0x667777, alpha: 0.25 });
    }

    // Distant barren hills
    g.moveTo(0, floorY * 0.55);
    for (let x = 0; x <= sw; x += sw / 8) {
      g.lineTo(x, floorY * (0.45 + Math.sin(x * 0.005 + 1) * 0.06));
    }
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(0, floorY * 0.65);
    g.closePath();
    g.fill({ color: 0x445544, alpha: 0.35 });

    // Closer hills
    g.moveTo(0, floorY * 0.68);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.58 + Math.sin(x * 0.008 + 3) * 0.05));
    }
    g.lineTo(sw, floorY * 0.75);
    g.lineTo(0, floorY * 0.75);
    g.closePath();
    g.fill({ color: 0x554e40, alpha: 0.45 });

    // Dead trees (skeletal, leafless)
    const deadTrees = [
      { x: sw * 0.05, h: 100 }, { x: sw * 0.18, h: 80 },
      { x: sw * 0.4, h: 60 }, { x: sw * 0.6, h: 70 },
      { x: sw * 0.82, h: 90 }, { x: sw * 0.95, h: 85 },
    ];
    for (const t of deadTrees) {
      // Trunk
      g.moveTo(t.x - 3, floorY);
      g.lineTo(t.x - 1, floorY - t.h);
      g.lineTo(t.x + 1, floorY - t.h);
      g.lineTo(t.x + 3, floorY);
      g.closePath();
      g.fill({ color: 0x3a3028 });
      // Branches (crooked, bare)
      const branchCount = 3 + Math.floor(Math.sin(t.x) * 2);
      for (let b = 0; b < branchCount; b++) {
        const by = floorY - t.h + b * (t.h * 0.2);
        const dir = b % 2 === 0 ? 1 : -1;
        const bLen = 20 + b * 8;
        const ex = t.x + dir * bLen;
        const ey = by - 10 + b * 3;
        g.moveTo(t.x, by);
        g.quadraticCurveTo(t.x + dir * bLen * 0.5, by - 15, ex, ey);
        g.stroke({ color: 0x3a3028, width: 2 - b * 0.3, cap: "round" });
        // Sub-branches
        g.moveTo(ex, ey);
        g.lineTo(ex + dir * 10, ey - 8);
        g.stroke({ color: 0x3a3028, width: 1, cap: "round", alpha: 0.6 });
      }
    }

    // Standing stones (circle of menhirs)
    const stoneXs = [sw * 0.3, sw * 0.45, sw * 0.55, sw * 0.7];
    for (const sx of stoneXs) {
      const sh2 = 25 + Math.sin(sx * 0.1) * 10;
      g.moveTo(sx - 8, floorY);
      g.lineTo(sx - 5, floorY - sh2);
      g.quadraticCurveTo(sx, floorY - sh2 - 5, sx + 5, floorY - sh2);
      g.lineTo(sx + 8, floorY);
      g.closePath();
      g.fill({ color: 0x666655 });
      g.stroke({ color: 0x555544, width: 1 });
    }

    // Scattered bones/debris
    for (let i = 0; i < 8; i++) {
      const bx = sw * (0.1 + i * 0.1) + Math.sin(i * 5) * 15;
      const by = floorY + 3;
      g.moveTo(bx, by);
      g.lineTo(bx + 8 + i % 3 * 3, by + 1);
      g.stroke({ color: 0xaaa899, width: 1.5, cap: "round", alpha: 0.4 });
    }

    // Ground — muddy, barren
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Muddy puddle patches
    for (let i = 0; i < 5; i++) {
      const px = sw * (0.15 + i * 0.18);
      g.ellipse(px, floorY + 8, 18 + i * 3, 4);
      g.fill({ color: 0x444435, alpha: 0.3 });
    }

    // Heavy fog
    for (let i = 0; i < 5; i++) {
      this._mistLayers.push({
        y: floorY - 15 + i * 12, speed: 0.3 + i * 0.1,
        offset: i * 80, alpha: 0.06 - i * 0.005, height: 30 + i * 8,
      });
    }
    // Wind-blown particles
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.5 + Math.random() * floorY * 0.4,
        vx: 0.5 + Math.random() * 0.5, vy: (Math.random() - 0.5) * 0.2,
        radius: 0.5 + Math.random() * 1, alpha: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2, color: 0x998877,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_orkney(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Wind-blown dust
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy + Math.cos(time * 1.5 + p.phase) * 0.1;
      if (p.x > sw + 10) { p.x = -10; p.y = this._floorY * 0.5 + Math.random() * this._floorY * 0.4; }
      const fade = p.alpha * (0.5 + Math.sin(time * 3 + p.phase) * 0.3);
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 30 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 70) {
        const mx = (x + offset) % (sw + 200) - 100;
        g.ellipse(mx, m.y + Math.sin(time * 0.4 + x * 0.01) * 5, 55, m.height / 2);
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
    for (let i = 0; i < 8; i++) {
      const cx = sw * (0.1 + i * 0.12);
      const cy = floorY * (0.08 + Math.sin(i * 1.5) * 0.04);
      g.ellipse(cx, cy, 35 + i * 5, 12);
      g.fill({ color: 0xddeeff, alpha: 0.15 });
    }

    // Distant mountains
    g.moveTo(0, floorY * 0.45);
    g.lineTo(sw * 0.15, floorY * 0.32);
    g.lineTo(sw * 0.3, floorY * 0.38);
    g.lineTo(sw * 0.5, floorY * 0.28);
    g.lineTo(sw * 0.7, floorY * 0.35);
    g.lineTo(sw * 0.85, floorY * 0.3);
    g.lineTo(sw, floorY * 0.4);
    g.lineTo(sw, floorY * 0.5);
    g.lineTo(0, floorY * 0.5);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.3 });

    // Lake water body
    const waterY = floorY * 0.55;
    g.rect(0, waterY, sw, floorY - waterY);
    g.fill({ color: 0x2a5577 });
    // Water surface shimmer
    g.rect(0, waterY, sw, 4);
    g.fill({ color: 0x5599bb, alpha: 0.4 });

    // Willow trees on edges
    for (const tx of [-5, sw * 0.06, sw * 0.92, sw + 5]) {
      const th = 110 + Math.sin(tx * 0.1) * 20;
      g.rect(tx - 6, floorY - th, 12, th);
      g.fill({ color: 0x3a2a18 });
      g.ellipse(tx, floorY - th, 35, 25);
      g.fill({ color: 0x336633, alpha: 0.5 });
      // Drooping branches
      for (let b = 0; b < 8; b++) {
        const bx = tx - 30 + b * 8;
        g.moveTo(bx, floorY - th + 10);
        g.quadraticCurveTo(bx + 3, floorY - th + 40, bx + 1, floorY - 15);
        g.stroke({ color: 0x448833, width: 1.2, alpha: 0.35 });
      }
    }

    // Stone platform / bridge
    g.rect(sw * 0.08, floorY - 5, sw * 0.84, 8);
    g.fill({ color: 0x667766 });
    g.rect(sw * 0.08, floorY - 5, sw * 0.84, 2);
    g.fill({ color: 0x778877, alpha: 0.5 });
    // Pillars under platform
    for (const px of [sw * 0.2, sw * 0.5, sw * 0.8]) {
      g.rect(px - 5, floorY + 3, 10, 25);
      g.fill({ color: 0x667766 });
    }

    // Lily pads on water
    for (let i = 0; i < 8; i++) {
      const lx = sw * (0.1 + i * 0.11);
      const ly = waterY + 10 + (i % 3) * 8;
      g.ellipse(lx, ly, 6, 3);
      g.fill({ color: 0x337733, alpha: 0.5 });
      if (i % 3 === 0) {
        g.circle(lx, ly - 3, 2);
        g.fill({ color: 0xeeddff, alpha: 0.5 });
      }
    }

    // Water reflections
    for (let y = waterY + 8; y < floorY; y += 6) {
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

    // Ripples
    for (let i = 0; i < 10; i++) {
      this._ripples.push({
        y: waterY + 3 + i * 5, amplitude: 1 + Math.random() * 1.5,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.6 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.08,
      });
    }
    // Sparkle particles
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: Math.random() * sw, y: waterY + Math.random() * (floorY - waterY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0,
        radius: 1 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
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
    // Water sparkles
    for (const p of this._particles) {
      p.x += Math.sin(time * 0.3 + p.phase) * 0.2;
      const pulse = p.alpha * (0.3 + Math.sin(time * 3 + p.phase) * 0.7);
      if (pulse > 0.15) {
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: 0xffffff, alpha: pulse });
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
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: 0xff4400, alpha: 0.06 });

    // Volcanic mountain background
    g.moveTo(0, floorY * 0.7);
    g.lineTo(sw * 0.2, floorY * 0.45);
    g.lineTo(sw * 0.35, floorY * 0.22);
    g.lineTo(sw * 0.5, floorY * 0.15);
    g.lineTo(sw * 0.65, floorY * 0.22);
    g.lineTo(sw * 0.8, floorY * 0.4);
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(sw, floorY);
    g.lineTo(0, floorY);
    g.closePath();
    g.fill({ color: 0x2a1a0a });
    // Lava glow at peak
    g.circle(sw * 0.5, floorY * 0.12, 20);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    g.circle(sw * 0.5, floorY * 0.12, 10);
    g.fill({ color: 0xff6622, alpha: 0.25 });
    // Smoke from peak
    for (let i = 0; i < 5; i++) {
      g.circle(sw * 0.5 + i * 8 - 16, floorY * 0.08 - i * 5, 12 + i * 3);
      g.fill({ color: 0x332222, alpha: 0.2 - i * 0.03 });
    }

    // Lava rivers flowing down mountain
    const lavaStreams = [
      { x1: sw * 0.45, y1: floorY * 0.2, x2: sw * 0.3, y2: floorY * 0.65 },
      { x1: sw * 0.55, y1: floorY * 0.2, x2: sw * 0.68, y2: floorY * 0.6 },
    ];
    for (const ls of lavaStreams) {
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 10, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff4400, width: 4, alpha: 0.3 });
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 10, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff8844, width: 2, alpha: 0.4 });
    }

    // Dragon bones (ribs and skull)
    const boneX = sw * 0.2;
    const boneY = floorY - 5;
    // Spine
    g.moveTo(boneX - 40, boneY);
    g.quadraticCurveTo(boneX, boneY - 15, boneX + 50, boneY - 5);
    g.stroke({ color: 0xccbb99, width: 4, cap: "round" });
    // Ribs
    for (let i = 0; i < 5; i++) {
      const rx = boneX - 20 + i * 15;
      const ry = boneY - 10 - Math.sin(i * 0.5) * 3;
      g.moveTo(rx, ry);
      g.quadraticCurveTo(rx + 5, ry - 25, rx + 2, ry - 35);
      g.stroke({ color: 0xccbb99, width: 2.5, cap: "round", alpha: 0.7 });
    }
    // Skull
    const skullX = sw * 0.78;
    g.ellipse(skullX, floorY - 12, 18, 12);
    g.fill({ color: 0xccbb99 });
    g.ellipse(skullX, floorY - 12, 18, 12);
    g.stroke({ color: 0xaa9977, width: 1 });
    // Eye sockets
    g.circle(skullX - 6, floorY - 14, 4);
    g.fill({ color: 0x331100 });
    g.circle(skullX + 6, floorY - 14, 4);
    g.fill({ color: 0x331100 });
    // Horns
    g.moveTo(skullX - 12, floorY - 20);
    g.quadraticCurveTo(skullX - 22, floorY - 35, skullX - 18, floorY - 40);
    g.stroke({ color: 0xaa9977, width: 3, cap: "round" });
    g.moveTo(skullX + 12, floorY - 20);
    g.quadraticCurveTo(skullX + 22, floorY - 35, skullX + 18, floorY - 40);
    g.stroke({ color: 0xaa9977, width: 3, cap: "round" });

    // Rocky ground with lava cracks
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Lava cracks in ground
    for (let i = 0; i < 6; i++) {
      const cx = sw * (0.1 + i * 0.15);
      g.moveTo(cx, floorY + 2);
      g.lineTo(cx + 10, floorY + 12);
      g.lineTo(cx + 5, floorY + 20);
      g.stroke({ color: 0xff4400, width: 1.5, alpha: 0.3 });
    }

    // Ember particles
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.5,
        radius: 1 + Math.random() * 2, alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, color: i % 3 === 0 ? 0xff8844 : 0xff4422,
      });
    }
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_dragon_peak(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Rising embers
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy;
      if (p.y < this._floorY * 0.1) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 4 + p.phase) * 0.5);
      g.circle(p.x, p.y, p.radius + 1);
      g.fill({ color: p.color, alpha: fade * 0.2 });
      g.circle(p.x, p.y, p.radius * 0.6);
      g.fill({ color: 0xffcc44, alpha: fade });
    }
    // Lava glow pulse at peak
    const pulse = 0.1 + Math.sin(time * 1.5) * 0.05;
    g.circle(sw * 0.5, this._floorY * 0.12, 25);
    g.fill({ color: 0xff4400, alpha: pulse });
    // Heat shimmer above lava
    for (let x = 0; x < sw; x += 20) {
      const shimmer = Math.sin(time * 3 + x * 0.05) * 2;
      g.moveTo(x, this._floorY * 0.65 + shimmer);
      g.lineTo(x + 15, this._floorY * 0.65 - shimmer);
      g.stroke({ color: 0xff6633, width: 1, alpha: 0.03 });
    }
  }

  // =========================================================================
  // GRAIL CHAPEL — Sacred interior, stained glass, altar, divine light
  // =========================================================================

  private _build_grail_chapel(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Dark interior with golden ambient
    this._drawSkyGradient(g, a, sw, floorY, 8);

    // Vaulted ceiling with pointed arches
    for (let i = 0; i < 5; i++) {
      const cx = sw * (0.1 + i * 0.2);
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.05, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 6 });
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.04, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x6a6554, width: 3 });
    }

    // Stone walls
    const wallY = floorY * 0.12;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x665544 });
    for (let y = wallY + 14; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x5a4a3a, width: 0.6, alpha: 0.35 });
    }

    // Stained glass windows
    const windowXs = [sw * 0.15, sw * 0.38, sw * 0.62, sw * 0.85];
    const windowColors = [
      [0xaa3333, 0x3344aa, 0xddaa33],
      [0x3366cc, 0xdd8833, 0x33aa55],
      [0xcc3355, 0x44aa88, 0xddcc44],
      [0x5533aa, 0xaa4422, 0x44ccaa],
    ];
    for (let i = 0; i < windowXs.length; i++) {
      const wx = windowXs[i];
      const wy = wallY + 20;
      const ww = 30;
      const wh = 60;
      // Window frame
      g.rect(wx - ww / 2 - 3, wy - 3, ww + 6, wh + 6);
      g.fill({ color: 0x5a5544 });
      // Pointed top
      g.moveTo(wx - ww / 2 - 3, wy - 3);
      g.quadraticCurveTo(wx, wy - 25, wx + ww / 2 + 3, wy - 3);
      g.fill({ color: 0x5a5544 });
      // Glass
      g.rect(wx - ww / 2, wy, ww, wh);
      g.fill({ color: 0x222244, alpha: 0.3 });
      // Colored glass sections
      const cols = windowColors[i];
      g.rect(wx - ww / 2, wy, ww / 3, wh / 2);
      g.fill({ color: cols[0], alpha: 0.2 });
      g.rect(wx - ww / 2 + ww / 3, wy, ww / 3, wh / 2);
      g.fill({ color: cols[1], alpha: 0.2 });
      g.rect(wx - ww / 2 + ww * 2 / 3, wy, ww / 3, wh / 2);
      g.fill({ color: cols[2], alpha: 0.2 });
      g.rect(wx - ww / 2, wy + wh / 2, ww, wh / 2);
      g.fill({ color: cols[1], alpha: 0.15 });
      // Dividers
      g.moveTo(wx, wy).lineTo(wx, wy + wh);
      g.stroke({ color: 0x5a5544, width: 2 });
      g.moveTo(wx - ww / 2, wy + wh / 2).lineTo(wx + ww / 2, wy + wh / 2);
      g.stroke({ color: 0x5a5544, width: 2 });
      // Light beam from window
      g.moveTo(wx - ww / 2, wy + wh);
      g.lineTo(wx + ww / 2, wy + wh);
      g.lineTo(wx + ww / 2 + 20, floorY);
      g.lineTo(wx - ww / 2 - 10, floorY);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.03 });
    }

    // Central altar with grail
    const altarX = sw * 0.5;
    const altarY = floorY - 8;
    // Altar table
    g.rect(altarX - 28, altarY - 25, 56, 25);
    g.fill({ color: 0x776655 });
    g.rect(altarX - 28, altarY - 25, 56, 25);
    g.stroke({ color: 0x665544, width: 1.5 });
    // Altar cloth
    g.rect(altarX - 25, altarY - 25, 50, 6);
    g.fill({ color: 0xeeddcc });
    g.rect(altarX - 25, altarY - 25, 50, 6);
    g.stroke({ color: a.accentColor, width: 1 });
    // Grail cup
    g.moveTo(altarX - 6, altarY - 32);
    g.lineTo(altarX - 8, altarY - 25);
    g.lineTo(altarX + 8, altarY - 25);
    g.lineTo(altarX + 6, altarY - 32);
    g.closePath();
    g.fill({ color: 0xddaa33 });
    g.stroke({ color: 0xbb8822, width: 1 });
    // Grail stem
    g.rect(altarX - 2, altarY - 25, 4, 6);
    g.fill({ color: 0xddaa33 });
    // Grail base
    g.ellipse(altarX, altarY - 19, 6, 2);
    g.fill({ color: 0xddaa33 });
    // Grail glow
    for (let r = 20; r > 0; r -= 3) {
      g.circle(altarX, altarY - 30, r);
      g.fill({ color: a.accentColor, alpha: 0.008 });
    }
    // Candles on altar
    for (const cx of [altarX - 18, altarX + 18]) {
      g.rect(cx - 1.5, altarY - 35, 3, 10);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: altarY - 38, baseRadius: 3.5, phase: cx * 0.2 });
    }

    // Floor — polished stone tiles
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Checkered floor
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

    // Dust particles in light beams
    for (let i = 0; i < 18; i++) {
      this._particles.push({
        x: Math.random() * sw, y: wallY + Math.random() * (floorY - wallY),
        vx: (Math.random() - 0.5) * 0.05, vy: 0.03 + Math.random() * 0.05,
        radius: 0.5 + Math.random() * 1, alpha: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
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
    // Dust motes
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.4 + p.phase) * 0.08;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.12; }
      const pulse = p.alpha * (0.3 + Math.sin(time * 1.5 + p.phase) * 0.5);
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulse });
    }
    // Grail glow pulse
    const altarX = this._sw * 0.5;
    const altarY = this._floorY - 8;
    const pulse = 0.06 + Math.sin(time * 1.2) * 0.03;
    g.circle(altarX, altarY - 30, 18);
    g.fill({ color: 0xffee88, alpha: pulse });
  }

  // =========================================================================
  // CORNWALL COAST — Sunny coastal beach, waves, cliffs, lighthouse
  // =========================================================================

  private _build_cornwall(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Bright fluffy clouds
    for (let i = 0; i < 6; i++) {
      const cx = sw * (0.08 + i * 0.17);
      const cy = floorY * (0.1 + Math.sin(i * 1.8) * 0.04);
      for (let j = 0; j < 3; j++) {
        g.ellipse(cx + j * 18 - 18, cy + j * 3, 25 + j * 5, 12 + j * 2);
        g.fill({ color: 0xffffff, alpha: 0.2 - j * 0.04 });
      }
    }

    // Sun
    const sunX = sw * 0.8;
    const sunY = floorY * 0.12;
    for (let r = 50; r > 0; r -= 4) {
      g.circle(sunX, sunY, r);
      g.fill({ color: 0xffdd88, alpha: 0.006 });
    }
    g.circle(sunX, sunY, 18);
    g.fill({ color: 0xffee99, alpha: 0.7 });

    // Ocean
    const seaY = floorY * 0.5;
    g.rect(0, seaY, sw, floorY - seaY);
    g.fill({ color: 0x3366aa });
    g.rect(0, seaY, sw, 3);
    g.fill({ color: 0x5588cc, alpha: 0.5 });
    // Ocean color variation
    g.rect(0, seaY + (floorY - seaY) * 0.5, sw, (floorY - seaY) * 0.5);
    g.fill({ color: 0x225588, alpha: 0.3 });

    // Lighthouse on distant cliff (right side)
    const lhX = sw * 0.88;
    const lhCliffY = seaY + 20;
    // Cliff
    g.moveTo(lhX - 30, floorY * 0.75);
    g.lineTo(lhX - 20, lhCliffY);
    g.lineTo(lhX + 25, lhCliffY + 5);
    g.lineTo(lhX + 35, floorY * 0.75);
    g.closePath();
    g.fill({ color: 0x667766 });
    // Lighthouse tower
    g.rect(lhX - 5, lhCliffY - 50, 10, 50);
    g.fill({ color: 0xeeeedd });
    // Red stripe
    g.rect(lhX - 5, lhCliffY - 35, 10, 10);
    g.fill({ color: 0xcc3333 });
    // Lamp room
    g.rect(lhX - 7, lhCliffY - 55, 14, 8);
    g.fill({ color: 0xffee88, alpha: 0.6 });
    g.rect(lhX - 7, lhCliffY - 55, 14, 8);
    g.stroke({ color: 0x333333, width: 1 });
    // Roof
    g.moveTo(lhX - 8, lhCliffY - 55);
    g.lineTo(lhX, lhCliffY - 62);
    g.lineTo(lhX + 8, lhCliffY - 55);
    g.closePath();
    g.fill({ color: 0x444444 });

    // Coastal cliffs (left foreground)
    g.moveTo(-10, floorY * 0.6);
    g.lineTo(-10, seaY + 10);
    g.lineTo(sw * 0.12, seaY + 5);
    g.lineTo(sw * 0.18, floorY * 0.7);
    g.lineTo(sw * 0.15, floorY);
    g.lineTo(-10, floorY);
    g.closePath();
    g.fill({ color: 0x778877 });
    // Cliff face detail
    for (let y = seaY + 15; y < floorY; y += 10) {
      g.moveTo(0, y).lineTo(sw * 0.12, y + 2);
      g.stroke({ color: 0x667766, width: 0.6, alpha: 0.3 });
    }

    // Beach / sand ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Sand texture
    for (let i = 0; i < 20; i++) {
      const sx = Math.sin(i * 7.7) * sw * 0.45 + sw * 0.5;
      g.ellipse(sx, floorY + 5 + (i % 4) * 3, 4 + i % 3, 1.5);
      g.fill({ color: a.groundHighlight, alpha: 0.15 });
    }
    // Shells
    for (let i = 0; i < 6; i++) {
      const sx = sw * (0.15 + i * 0.14);
      g.ellipse(sx, floorY + 4, 3, 2);
      g.fill({ color: 0xeeddcc, alpha: 0.4 });
    }

    // Register wave ripples
    for (let i = 0; i < 8; i++) {
      this._ripples.push({
        y: seaY + 4 + i * 6, amplitude: 1.5 + Math.random() * 2,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.8 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, alpha: 0.12 + Math.random() * 0.08,
      });
    }
    // Seagull-like particles
    for (let i = 0; i < 6; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * (0.15 + Math.random() * 0.25),
        vx: 0.3 + Math.random() * 0.4, vy: Math.sin(i) * 0.1,
        radius: 1.5, alpha: 0.5, phase: Math.random() * Math.PI * 2, color: 0xffffff,
      });
    }
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });
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
    const seaY = this._floorY * 0.5;
    for (let i = 0; i < 3; i++) {
      const fy = seaY + 10 + i * 15;
      for (let x = 0; x < sw; x += 50) {
        const fx = x + Math.sin(time * (1 + i * 0.3) + x * 0.01) * 15;
        g.moveTo(fx, fy);
        g.lineTo(fx + 14, fy - 1);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.12 + Math.sin(time * 2 + i) * 0.05 });
      }
    }
    // Seagulls — simple V shapes drifting
    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(time * 2 + p.phase) * 0.15;
      if (p.x > sw + 20) { p.x = -20; p.y = this._floorY * (0.15 + Math.random() * 0.2); }
      // V shape (wings)
      g.moveTo(p.x - 4, p.y + 2);
      g.lineTo(p.x, p.y);
      g.lineTo(p.x + 4, p.y + 2);
      g.stroke({ color: 0xffffff, width: 1.2, alpha: p.alpha });
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

    // Massive dark fortress wall
    const wallY = floorY * 0.18;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x0a0a18 });
    // Faint stone lines
    for (let y = wallY + 18; y < floorY; y += 18) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x0e0e20, width: 0.7, alpha: 0.5 });
    }

    // Massive pillars
    for (const px of [sw * 0.1, sw * 0.3, sw * 0.5, sw * 0.7, sw * 0.9]) {
      g.rect(px - 14, wallY, 28, floorY - wallY);
      g.fill({ color: 0x0c0c1a });
      g.rect(px - 16, wallY, 32, 12);
      g.fill({ color: 0x101028 });
      g.rect(px - 16, floorY - 12, 32, 12);
      g.fill({ color: 0x101028 });
    }

    // Glowing rune circles on walls
    const runeXs = [sw * 0.2, sw * 0.4, sw * 0.6, sw * 0.8];
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (floorY - wallY) * 0.35;
      // Outer circle
      g.circle(rx, ry, 14);
      g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.2 });
      // Inner rune (triangle)
      g.moveTo(rx, ry - 8);
      g.lineTo(rx - 7, ry + 5);
      g.lineTo(rx + 7, ry + 5);
      g.closePath();
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.3 });
      // Center dot
      g.circle(rx, ry, 2.5);
      g.fill({ color: a.accentColor, alpha: 0.3 });
    }

    // Hanging chains (static base)
    for (let i = 0; i < 8; i++) {
      const cx = sw * (0.05 + i * 0.12);
      const cy1 = wallY + 5;
      const cy2 = wallY + 40 + (i % 3) * 20;
      g.moveTo(cx, cy1);
      g.lineTo(cx, cy2);
      g.stroke({ color: 0x333344, width: 2 });
      // Chain links
      for (let y = cy1; y < cy2; y += 8) {
        g.ellipse(cx, y, 2.5, 4);
        g.stroke({ color: 0x444455, width: 1 });
      }
    }

    // Dark floor
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 2);
    g.fill({ color: a.groundHighlight, alpha: 0.3 });
    // Rune lines on floor
    for (let x = sw * 0.2; x < sw * 0.8; x += 40) {
      g.moveTo(x, floorY + 4);
      g.lineTo(x + 20, floorY + 4);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.15 });
    }

    // Purple mist particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.2, vy: -0.05 - Math.random() * 0.1,
        radius: 2 + Math.random() * 2.5, alpha: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    // Mist layers
    for (let i = 0; i < 4; i++) {
      this._mistLayers.push({
        y: floorY - 10 + i * 8, speed: 0.2 + i * 0.08,
        offset: i * 60, alpha: 0.05, height: 25 + i * 6,
      });
    }
    g.rect(0, floorY * 0.3, sw, floorY * 0.7);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });
  }

  private _update_shadow_keep(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Pulsing runes
    const runeXs = [sw * 0.2, sw * 0.4, sw * 0.6, sw * 0.8];
    const wallY = this._floorY * 0.18;
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (this._floorY - wallY) * 0.35;
      const pulse = 0.15 + Math.sin(time * 1.5 + i * 1.2) * 0.1;
      g.circle(rx, ry, 16);
      g.fill({ color: 0x8844cc, alpha: pulse * 0.3 });
      g.circle(rx, ry, 3);
      g.fill({ color: 0xaa66ee, alpha: pulse });
    }
    // Floating shadow particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.15) { p.y = this._floorY * 0.85; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.4 + Math.sin(time * 1.5 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: fade * 0.15 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Dark fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 20 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 80) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 55, m.height / 2);
        g.fill({ color: 0x110022, alpha: m.alpha });
      }
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
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: 0xcc4422, alpha: 0.08 });
    g.rect(0, floorY * 0.75, sw, floorY * 0.25);
    g.fill({ color: 0xff6633, alpha: 0.05 });

    // Smoke clouds
    for (let i = 0; i < 10; i++) {
      const cx = sw * (Math.sin(i * 2.1) * 0.4 + 0.5);
      const cy = floorY * (0.05 + i * 0.04);
      g.circle(cx, cy, 30 + i * 4);
      g.fill({ color: 0x443333, alpha: 0.25 - i * 0.02 });
    }

    // Distant burning buildings
    for (const bx of [sw * 0.15, sw * 0.4, sw * 0.7, sw * 0.9]) {
      const bh = 30 + Math.sin(bx) * 15;
      const by = floorY * 0.55;
      // Building silhouette
      g.rect(bx - 12, by - bh, 24, bh + 10);
      g.fill({ color: 0x2a2020, alpha: 0.5 });
      // Fire glow on top
      g.circle(bx, by - bh, 10);
      g.fill({ color: 0xff4400, alpha: 0.15 });
      this._flames.push({ x: bx, y: by - bh - 5, baseRadius: 5, phase: bx * 0.1 });
    }

    // Broken siege equipment
    // Broken wagon wheel (left)
    const wheelX = sw * 0.2;
    g.circle(wheelX, floorY - 5, 15);
    g.stroke({ color: 0x4a3a2a, width: 3 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      g.moveTo(wheelX, floorY - 5);
      g.lineTo(wheelX + Math.cos(angle) * 13, floorY - 5 + Math.sin(angle) * 13);
      g.stroke({ color: 0x4a3a2a, width: 1.5 });
    }

    // Broken spears / weapons stuck in ground
    const weaponXs = [sw * 0.12, sw * 0.28, sw * 0.45, sw * 0.58, sw * 0.72, sw * 0.88];
    for (let i = 0; i < weaponXs.length; i++) {
      const wx = weaponXs[i];
      const angle = -0.15 + (i % 3) * 0.1;
      const wLen = 35 + (i % 2) * 15;
      const topX = wx + Math.sin(angle) * wLen;
      const topY = floorY - Math.cos(angle) * wLen;
      // Shaft
      g.moveTo(wx, floorY + 2);
      g.lineTo(topX, topY);
      g.stroke({ color: 0x5a4a3a, width: 2.5, cap: "round" });
      // Point or broken top
      if (i % 2 === 0) {
        g.moveTo(topX - 3, topY + 2);
        g.lineTo(topX, topY - 6);
        g.lineTo(topX + 3, topY + 2);
        g.closePath();
        g.fill({ color: 0x888899 });
      }
    }

    // Shields scattered on ground
    for (const sx of [sw * 0.35, sw * 0.65]) {
      g.ellipse(sx, floorY + 2, 12, 5);
      g.fill({ color: 0x883322 });
      g.ellipse(sx, floorY + 2, 12, 5);
      g.stroke({ color: 0x5a2a1a, width: 1 });
      g.circle(sx, floorY + 2, 3);
      g.fill({ color: 0x888899 });
    }

    // Trenches / disturbed earth
    for (let i = 0; i < 4; i++) {
      const tx = sw * (0.15 + i * 0.22);
      g.ellipse(tx, floorY + 4, 25, 5);
      g.fill({ color: 0x3a2a1a, alpha: 0.4 });
    }

    // Ground — muddy, scarred earth
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Blood/mud stains
    for (let i = 0; i < 8; i++) {
      const sx = sw * (0.08 + i * 0.11);
      g.ellipse(sx, floorY + 6 + (i % 3) * 4, 8 + i % 4 * 3, 3);
      g.fill({ color: 0x4a2020, alpha: 0.2 });
    }

    // Smoke / fire particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.25,
        radius: 1.5 + Math.random() * 2, alpha: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? 0xff6633 : 0x664444,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
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
      g.fill({ color: 0xff4400, alpha: 0.15 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.3, f.baseRadius, f.baseRadius + 2 + flicker);
      g.fill({ color: 0xff6622, alpha: 0.5 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.4, f.baseRadius * 0.7);
      g.fill({ color: 0xffcc44, alpha: 0.7 });
    }
    // Smoke and ember particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.2;
      p.y += p.vy;
      if (p.y < this._floorY * 0.1) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 2.5 + p.phase) * 0.4);
      if (p.color === 0x664444) {
        // Smoke — larger, more diffuse
        g.circle(p.x, p.y, p.radius + 3);
        g.fill({ color: p.color, alpha: fade * 0.3 });
      } else {
        // Ember — small bright
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: p.color, alpha: fade });
        g.circle(p.x, p.y, p.radius * 0.5);
        g.fill({ color: 0xffcc44, alpha: fade * 0.8 });
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
