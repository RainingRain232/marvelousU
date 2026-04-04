// ---------------------------------------------------------------------------
// Kingdom – Renderer  (visual overhaul)
// Draws the entire game using PixiJS Graphics & Text
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  TileType, PowerState, KingdomPhase, KingdomChar, EnemyType, ItemType,
  CHAR_NAMES, CHAR_LIST,
} from "../types";
import type { KingdomState, Player, Enemy, GameItem, Projectile } from "../types";
import {
  WORLD_THEMES, CHAR_COLORS, CHAR_STATS,
  LEVEL_HEIGHT, GROUND_ROW, DRAGON_HP,
} from "../config/KingdomConfig";
import type { WorldTheme, CharColors } from "../config/KingdomConfig";

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function lighten(c: number, amt: number): number {
  let r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
  r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
  return (r << 16) | (g << 8) | b;
}
function darken(c: number, amt: number): number {
  let r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
  r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
  return (r << 16) | (g << 8) | b;
}
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
  const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}
function hslToHex(h: number, s: number, l: number): number {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return (Math.round(f(0) * 255) << 16) + (Math.round(f(8) * 255) << 8) + Math.round(f(4) * 255);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const FONT = "monospace";
const sty = (sz: number, fill: number, bold = false, ls = 0, shadow = false) => {
  const s: any = { fontFamily: FONT, fontSize: sz, fill, letterSpacing: ls };
  if (bold) s.fontWeight = "bold";
  if (shadow) { s.dropShadow = true; s.dropShadowColor = 0x000000; s.dropShadowDistance = 2; s.dropShadowAlpha = 0.7; }
  return new TextStyle(s);
};

const HUD_STYLE     = sty(16, 0xFFFFFF, true, 1, true);
const HUD_SMALL     = sty(12, 0xBBBBCC, false, 1);
const TITLE_STYLE   = sty(48, 0xFFD700, true, 6, true);
const SUBTITLE_STYLE = sty(18, 0xDDDDFF, false, 2);
const CHAR_NAME_STYLE = sty(22, 0xFFD700, true, 1, true);
const POPUP_STYLE   = sty(11, 0xFFFFFF, true, 0, true);
const BIG_TEXT       = sty(32, 0xFFD700, true, 3, true);
const GAME_OVER_STYLE = sty(48, 0xFF4444, true, 4, true);
const VICTORY_STYLE = sty(42, 0xFFD700, true, 4, true);

// ---------------------------------------------------------------------------
// Renderer class
// ---------------------------------------------------------------------------

export class KingdomRenderer {
  container = new Container();

  private _bg = new Graphics();
  private _bgDecor = new Graphics();
  private _tiles = new Graphics();
  private _entities = new Graphics();
  private _player = new Graphics();
  private _fx = new Graphics();
  private _hud = new Graphics();
  private _ui = new Graphics();

  private _hudTexts: Text[] = [];
  private _uiTexts: Text[] = [];
  private _popupTexts: Text[] = [];

  build(): void {
    this.container.addChild(
      this._bg, this._bgDecor, this._tiles,
      this._entities, this._player, this._fx, this._hud, this._ui,
    );
    for (let i = 0; i < 7; i++) {
      const t = new Text({ text: "", style: HUD_STYLE });
      this._hudTexts.push(t);
      this._hud.addChild(t);
    }
    for (let i = 0; i < 36; i++) {
      const t = new Text({ text: "", style: SUBTITLE_STYLE });
      t.visible = false;
      this._uiTexts.push(t);
      this._ui.addChild(t);
    }
    for (let i = 0; i < 12; i++) {
      const t = new Text({ text: "", style: POPUP_STYLE });
      t.visible = false;
      this._popupTexts.push(t);
      this._fx.addChild(t);
    }
  }

  destroy(): void {
    for (const t of this._hudTexts) t.destroy();
    for (const t of this._uiTexts) t.destroy();
    for (const t of this._popupTexts) t.destroy();
    this._hudTexts.length = 0;
    this._uiTexts.length = 0;
    this._popupTexts.length = 0;
    this.container.removeChildren();
    for (const g of [this._bg, this._bgDecor, this._tiles, this._entities, this._player, this._fx, this._hud, this._ui]) g.destroy();
  }

  draw(s: KingdomState): void {
    for (const g of [this._bg, this._bgDecor, this._tiles, this._entities, this._player, this._fx, this._hud, this._ui]) g.clear();
    for (const t of this._uiTexts) t.visible = false;
    for (const t of this._popupTexts) t.visible = false;

    const theme = WORLD_THEMES[Math.min(s.world - 1, WORLD_THEMES.length - 1)];

    switch (s.phase) {
      case KingdomPhase.TITLE:      this._drawTitle(s); return;
      case KingdomPhase.CHAR_SELECT: this._drawCharSelect(s); return;
      case KingdomPhase.GAME_OVER:  this._drawGameOver(s); return;
      case KingdomPhase.VICTORY:    this._drawVictory(s); return;
      case KingdomPhase.LEVEL_INTRO: this._drawLevelIntro(s); return;
      default: break;
    }

    this._drawBackground(s, theme);
    this._drawTiles(s, theme);
    // Apply screen shake offset
    const shakeX = s.screenShakeTimer > 0 ? (Math.random() - 0.5) * s.screenShakeIntensity * 2 : 0;
    const shakeY = s.screenShakeTimer > 0 ? (Math.random() - 0.5) * s.screenShakeIntensity * 2 : 0;
    this._tiles.x = shakeX; this._tiles.y = shakeY;
    this._entities.x = shakeX; this._entities.y = shakeY;
    this._player.x = shakeX; this._player.y = shakeY;
    this._fx.x = shakeX; this._fx.y = shakeY;

    this._drawMovingPlatforms(s);
    this._drawFloatingCoins(s);
    this._drawItems(s, theme);
    this._drawEnemies(s);
    this._drawPlayer(s);
    this._drawProjectiles(s);
    this._drawSwordSlash(s);
    this._drawParticles(s);
    this._drawCoinAnims(s);
    this._drawScorePopups(s);
    this._drawAmbientParticles(s, theme);
    this._drawForegroundDecor(s, theme);
    this._drawAtmosphericOverlay(s, theme);
    this._drawHUD(s);
    // Bonus room indicator
    if (s.phase === KingdomPhase.BONUS_ROOM) {
      const g2 = this._ui;
      const bx = s.sw / 2;
      g2.roundRect(bx - 50, 40, 100, 28, 6).fill({ color: 0xFFD700, alpha: 0.2 });
      const bt = this._uiTexts[0]; bt.visible = true; bt.style = sty(16, 0xFFD700, true, 2, true);
      bt.text = "BONUS!"; bt.x = bx - bt.width / 2; bt.y = 44;
    }
    // Boss death flash
    if (s.bossDeathActive && Math.random() < 0.15) {
      this._ui.rect(0, 0, s.sw, s.sh).fill({ color: 0xFFFFFF, alpha: 0.08 });
    }
    if (s.phase === KingdomPhase.PAUSED) this._drawEscMenu(s);
    if (s.phase === KingdomPhase.PAUSE_CONTROLS) this._drawEscSubpage(s, "controls");
    if (s.phase === KingdomPhase.PAUSE_INTRO) this._drawEscSubpage(s, "intro");
    if (s.phase === KingdomPhase.PAUSE_CONCEPTS) this._drawEscSubpage(s, "concepts");
  }

  // =======================================================================
  // AMBIENT PARTICLES — world-specific floating effects
  // =======================================================================

  private _drawAmbientParticles(s: KingdomState, t: WorldTheme): void {
    const g = this._fx;
    const sw = s.sw, sh = s.sh;
    const now = Date.now();
    const worldIdx = Math.min(s.world - 1, 3);

    for (let i = 0; i < 25; i++) {
      const seed = i * 137 + 31;
      const baseX = ((seed * 97 + now * 0.015 * (0.5 + (i % 3) * 0.3)) % (sw + 100)) - 50;
      const baseY = ((seed * 53 + now * 0.008 * (0.3 + (i % 4) * 0.2)) % (sh * 0.85));
      const wobble = Math.sin(now / 800 + i * 1.3) * 8;

      if (worldIdx === 0) {
        // Camelot Fields: butterflies & pollen
        if (i < 5) {
          // Butterfly
          const wingFlap = Math.sin(now / 120 + i * 2) * 4;
          const bCol = [0xFFAA44, 0xFF66AA, 0x66AAFF, 0xAAFF66, 0xFFFF44][i % 5];
          g.moveTo(baseX, baseY).lineTo(baseX - 5, baseY - 4 + wingFlap).lineTo(baseX - 2, baseY).fill({ color: bCol, alpha: 0.5 });
          g.moveTo(baseX, baseY).lineTo(baseX + 5, baseY - 4 + wingFlap).lineTo(baseX + 2, baseY).fill({ color: bCol, alpha: 0.5 });
          g.circle(baseX, baseY, 1).fill({ color: 0x000000, alpha: 0.4 });
        } else {
          // Pollen
          g.circle(baseX + wobble, baseY, 1.5).fill({ color: 0xFFFF88, alpha: 0.2 + Math.sin(now / 500 + i) * 0.1 });
        }
      } else if (worldIdx === 1) {
        // Enchanted Forest: fireflies & falling leaves
        if (i < 8) {
          // Firefly
          const glow = 0.3 + Math.sin(now / 300 + i * 2.5) * 0.25;
          g.circle(baseX + wobble, baseY, 2).fill({ color: 0x88FF44, alpha: glow });
          g.circle(baseX + wobble, baseY, 5).fill({ color: 0x88FF44, alpha: glow * 0.15 });
        } else {
          // Falling leaf
          const leafX = baseX + Math.sin(now / 600 + i) * 15;
          const leafRot = now / 400 + i;
          const lw = 4 * Math.abs(Math.sin(leafRot));
          g.ellipse(leafX, baseY, lw, 2).fill({ color: [0x88AA22, 0xAA8822, 0x66AA33][i % 3], alpha: 0.4 });
        }
      } else if (worldIdx === 2) {
        // Dragon Peaks: embers & ash
        if (i < 10) {
          // Ember — rises upward
          const emberY = sh - ((seed * 41 + now * 0.03) % sh);
          const emberGlow = 0.4 + Math.sin(now / 200 + i) * 0.2;
          g.circle(baseX, emberY, 2).fill({ color: 0xFF6600, alpha: emberGlow });
          g.circle(baseX, emberY, 4).fill({ color: 0xFF4400, alpha: emberGlow * 0.15 });
        } else {
          // Ash particle
          g.circle(baseX + wobble, baseY, 1).fill({ color: 0x888888, alpha: 0.15 });
        }
      } else {
        // Mordred's Fortress: dark motes & lightning flickers
        if (i < 12) {
          // Shadow mote
          g.circle(baseX + wobble, baseY, 2.5).fill({ color: 0x220033, alpha: 0.2 + Math.sin(now / 400 + i) * 0.1 });
        }
        // Occasional lightning flash
        if (i === 0 && Math.sin(now / 3000) > 0.98) {
          g.rect(0, 0, sw, sh).fill({ color: 0xFFFFFF, alpha: 0.06 });
        }
      }
    }
  }

  // =======================================================================
  // FOREGROUND DECORATION — grass blades, world-specific decor in front
  // =======================================================================

  private _drawForegroundDecor(s: KingdomState, t: WorldTheme): void {
    const g = this._fx;
    const ts = s.tileSize;
    const camX = s.cameraX;
    const sw = s.sw;
    const now = Date.now();
    const groundPx = GROUND_ROW * ts;
    const worldIdx = Math.min(s.world - 1, 3);

    // Foreground grass blades at ground level (parallax 0.95 — nearly 1:1)
    const fp = camX * 0.95 * ts;
    for (let i = 0; i < 30; i++) {
      const fx = ((i * 55 + 8) - fp) % (sw + 200) - 50;
      const fy = groundPx - 1;
      const lean = Math.sin(now / 500 + i * 0.7) * 3;
      const gh = 6 + (i % 4) * 3;
      const gCol = lighten(t.groundTopColor, 5 + (i % 3) * 5);

      // Grass blade (curved triangle)
      g.moveTo(fx, fy)
        .lineTo(fx + lean * 0.5, fy - gh * 0.5)
        .lineTo(fx + lean, fy - gh)
        .lineTo(fx + 2 + lean * 0.8, fy - gh + 2)
        .lineTo(fx + 1 + lean * 0.3, fy - gh * 0.4)
        .lineTo(fx + 2, fy)
        .fill({ color: gCol, alpha: 0.45 });

      // Second thinner blade
      if (i % 3 === 0) {
        const lean2 = Math.sin(now / 400 + i * 1.1) * 4;
        g.moveTo(fx + 3, fy)
          .lineTo(fx + 3 + lean2, fy - gh * 0.7)
          .lineTo(fx + 4 + lean2, fy - gh * 0.7 + 1)
          .lineTo(fx + 4, fy)
          .fill({ color: lighten(gCol, 10), alpha: 0.35 });
      }
    }

    // World-specific foreground elements
    if (worldIdx === 0) {
      // Dandelion seeds floating
      for (let i = 0; i < 5; i++) {
        const dx = ((i * 300 + now * 0.01) % (sw + 100)) - 50;
        const dy = groundPx - 20 - (i * 40 % 80) + Math.sin(now / 700 + i) * 10;
        g.circle(dx, dy, 1).fill({ color: 0xFFFFFF, alpha: 0.3 });
        // Seed strands
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * Math.PI * 2 + now / 2000;
          g.moveTo(dx, dy).lineTo(dx + Math.cos(a) * 4, dy + Math.sin(a) * 4)
            .stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.2 });
        }
      }
    } else if (worldIdx === 2) {
      // Lava glow from below (subtle orange tint at bottom of screen)
      const glowH = ts * 3;
      for (let band = 0; band < 4; band++) {
        const by = s.sh - glowH + band * (glowH / 4);
        g.rect(0, by, sw, glowH / 4).fill({ color: 0xFF4400, alpha: 0.03 * (4 - band) });
      }
    }
  }

  // =======================================================================
  // ATMOSPHERIC OVERLAY — vignette and world tinting
  // =======================================================================

  private _drawAtmosphericOverlay(s: KingdomState, t: WorldTheme): void {
    const g = this._fx;
    const sw = s.sw, sh = s.sh;
    const worldIdx = Math.min(s.world - 1, 3);

    // Subtle top/bottom depth shading
    const vigH = sh * 0.35;
    g.rect(0, 0, sw, vigH).fill({ color: 0x000000, alpha: 0.06 });
    g.rect(0, sh - vigH, sw, vigH).fill({ color: 0x000000, alpha: 0.04 });

    // World-specific tinting
    if (worldIdx === 1) {
      // Enchanted Forest: subtle green tint
      g.rect(0, 0, sw, sh).fill({ color: 0x003300, alpha: 0.04 });
    } else if (worldIdx === 2) {
      // Dragon Peaks: warm orange tint
      g.rect(0, 0, sw, sh).fill({ color: 0x331100, alpha: 0.05 });
    } else if (worldIdx === 3) {
      // Mordred's Fortress: cold blue-purple tint
      g.rect(0, 0, sw, sh).fill({ color: 0x110022, alpha: 0.06 });
      // Occasional distant lightning (glow in the sky area)
      if (Math.sin(Date.now() / 5000) > 0.95) {
        g.rect(0, 0, sw, sh * 0.3).fill({ color: 0x4444AA, alpha: 0.04 });
      }
    }
  }

  // =======================================================================
  // BACKGROUND — multi-layer parallax
  // =======================================================================

  private _drawBackground(s: KingdomState, t: WorldTheme): void {
    const g = this._bg;
    const gd = this._bgDecor;
    const sw = s.sw, sh = s.sh;
    const ts = s.tileSize;

    // 16-band smooth sky gradient
    const bands = 16;
    const bandH = sh / bands;
    for (let i = 0; i < bands; i++) {
      const color = lerpColor(t.skyTop, t.skyBottom, i / (bands - 1));
      g.rect(0, i * bandH, sw, bandH + 1).fill(color);
    }

    // Sun / moon glow
    const sunX = sw * 0.82;
    const sunY = sh * 0.1;
    const worldIdx = Math.min(s.world - 1, 3);
    if (worldIdx <= 1) {
      // Sun with corona
      for (let r = 5; r > 0; r--) {
        gd.circle(sunX, sunY, 12 + r * 8).fill({ color: 0xFFFF88, alpha: 0.03 * r });
      }
      gd.circle(sunX, sunY, 14).fill({ color: 0xFFEE44, alpha: 0.8 });
      gd.circle(sunX - 3, sunY - 3, 8).fill({ color: 0xFFFFAA, alpha: 0.5 });
      // Sun rays (triangles)
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + Date.now() / 8000;
        const rx = Math.cos(ang) * 30;
        const ry = Math.sin(ang) * 30;
        const rx2 = Math.cos(ang + 0.15) * 18;
        const ry2 = Math.sin(ang + 0.15) * 18;
        const rx3 = Math.cos(ang - 0.15) * 18;
        const ry3 = Math.sin(ang - 0.15) * 18;
        gd.moveTo(sunX + rx, sunY + ry).lineTo(sunX + rx2, sunY + ry2)
          .lineTo(sunX + rx3, sunY + ry3).fill({ color: 0xFFFF88, alpha: 0.15 });
      }
    } else {
      // Moon with craters
      gd.circle(sunX, sunY, 22).fill({ color: 0xEEDDCC, alpha: 0.7 });
      gd.circle(sunX + 6, sunY - 3, 18).fill(lerpColor(t.skyTop, t.skyBottom, 0.3));
      gd.circle(sunX - 5, sunY + 3, 3).fill({ color: 0xCCBBAA, alpha: 0.4 });
      gd.circle(sunX - 2, sunY - 4, 2).fill({ color: 0xCCBBAA, alpha: 0.3 });
      for (let r = 4; r > 0; r--) {
        gd.circle(sunX, sunY, 22 + r * 10).fill({ color: 0xDDCCBB, alpha: 0.02 * r });
      }
    }

    // Clouds — volumetric with 5-blob clusters
    const cp = s.cameraX * 0.08 * ts;
    for (let i = 0; i < 10; i++) {
      const cx = ((i * 200 + 50) - cp) % (sw + 400) - 150;
      const cy = 30 + ((i * 43) % 90);
      const cw = 40 + (i % 4) * 20;
      const ch = 10 + (i % 3) * 5;
      const a = 0.25 + (i % 3) * 0.08;
      // Shadow layer
      gd.ellipse(cx + 3, cy + 3, cw, ch).fill({ color: 0x000000, alpha: a * 0.15 });
      // Main blobs
      gd.ellipse(cx, cy, cw, ch).fill({ color: 0xFFFFFF, alpha: a });
      gd.ellipse(cx + cw * 0.35, cy - ch * 0.5, cw * 0.65, ch * 0.85).fill({ color: 0xFFFFFF, alpha: a });
      gd.ellipse(cx - cw * 0.3, cy + ch * 0.15, cw * 0.55, ch * 0.7).fill({ color: 0xFFFFFF, alpha: a * 0.85 });
      gd.ellipse(cx + cw * 0.55, cy + ch * 0.1, cw * 0.4, ch * 0.6).fill({ color: 0xFFFFFF, alpha: a * 0.7 });
      // Highlight
      gd.ellipse(cx - cw * 0.15, cy - ch * 0.3, cw * 0.4, ch * 0.4).fill({ color: 0xFFFFFF, alpha: a * 0.5 });
    }

    // Birds (parallax 0.12)
    const bp = s.cameraX * 0.12 * ts;
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 300 + 80) - bp) % (sw + 300) - 100;
      const by = 50 + ((i * 67) % 60);
      const flap = Math.sin(Date.now() / 200 + i * 2) * 4;
      gd.moveTo(bx - 6, by + flap).lineTo(bx, by).lineTo(bx + 6, by + flap).stroke({ color: 0x222222, width: 1.5, alpha: 0.35 });
    }

    // Far mountains — detailed with rocky faces, cliffs, and vegetation
    const mp = s.cameraX * 0.15 * ts;
    const mtCol = darken(t.skyBottom, 20);
    const mtCol2 = darken(t.skyBottom, 35);
    const mtLit = lighten(mtCol, 14);
    const mtDark = darken(mtCol, 12);
    // Back range — soft silhouettes
    for (let i = 0; i < 12; i++) {
      const mx = ((i * 160) - mp * 0.7) % (sw + 500) - 250;
      const mh = 60 + ((i * 53) % 50);
      const mw = 160 + ((i * 41) % 80);
      const my = sh * 0.56;
      // Jagged ridgeline (8 points)
      gd.moveTo(mx, my);
      for (let p = 1; p <= 6; p++) {
        const px2 = mx + (p / 7) * mw;
        const ph = mh * (0.3 + 0.7 * Math.sin(p * 1.1 + i) * 0.5 + 0.5);
        gd.lineTo(px2, my - ph);
      }
      gd.lineTo(mx + mw, my).fill(mtCol2);
    }
    // Front range — detailed mountains with faces
    for (let i = 0; i < 10; i++) {
      const mx = ((i * 180) - mp) % (sw + 400) - 200;
      const mh = 80 + ((i * 67) % 60);
      const mw = 140 + ((i * 31) % 80);
      const my = sh * 0.6;
      // Main body with 9-point ridgeline
      gd.moveTo(mx, my)
        .lineTo(mx + mw * 0.12, my - mh * 0.35)
        .lineTo(mx + mw * 0.22, my - mh * 0.55)
        .lineTo(mx + mw * 0.35, my - mh * 0.8)
        .lineTo(mx + mw * 0.45, my - mh * 0.92)
        .lineTo(mx + mw * 0.5, my - mh)
        .lineTo(mx + mw * 0.58, my - mh * 0.88)
        .lineTo(mx + mw * 0.68, my - mh * 0.65)
        .lineTo(mx + mw * 0.82, my - mh * 0.4)
        .lineTo(mx + mw, my).fill(mtCol);
      // Lit face — right slope gets sunlight
      gd.moveTo(mx + mw * 0.5, my - mh)
        .lineTo(mx + mw * 0.58, my - mh * 0.88)
        .lineTo(mx + mw * 0.68, my - mh * 0.65)
        .lineTo(mx + mw * 0.82, my - mh * 0.4)
        .lineTo(mx + mw, my)
        .lineTo(mx + mw * 0.55, my).fill({ color: mtLit, alpha: 0.5 });
      // Shadow face — left steep cliff
      gd.moveTo(mx, my)
        .lineTo(mx + mw * 0.12, my - mh * 0.35)
        .lineTo(mx + mw * 0.22, my - mh * 0.55)
        .lineTo(mx + mw * 0.35, my - mh * 0.8)
        .lineTo(mx + mw * 0.3, my).fill({ color: mtDark, alpha: 0.3 });
      // Rocky cliff lines
      gd.moveTo(mx + mw * 0.3, my - mh * 0.4).lineTo(mx + mw * 0.4, my - mh * 0.7)
        .lineTo(mx + mw * 0.38, my - mh * 0.68).lineTo(mx + mw * 0.28, my - mh * 0.38)
        .fill({ color: mtDark, alpha: 0.15 });
      // Snow cap with drip edge
      if (mh > 85) {
        gd.moveTo(mx + mw * 0.35, my - mh + 22)
          .lineTo(mx + mw * 0.42, my - mh + 10)
          .lineTo(mx + mw * 0.5, my - mh)
          .lineTo(mx + mw * 0.58, my - mh + 8)
          .lineTo(mx + mw * 0.65, my - mh + 25)
          .lineTo(mx + mw * 0.6, my - mh + 20)
          .lineTo(mx + mw * 0.53, my - mh + 28)
          .lineTo(mx + mw * 0.45, my - mh + 18)
          .lineTo(mx + mw * 0.38, my - mh + 26).fill({ color: 0xFFFFFF, alpha: 0.55 });
        // Snow highlight
        gd.moveTo(mx + mw * 0.48, my - mh + 2).lineTo(mx + mw * 0.5, my - mh)
          .lineTo(mx + mw * 0.55, my - mh + 5).fill({ color: 0xFFFFFF, alpha: 0.3 });
      }
      // Treeline at base
      for (let tr = 0; tr < 5; tr++) {
        const tx = mx + mw * 0.1 + tr * mw * 0.18;
        const th = 8 + (tr * 7 + i * 3) % 10;
        gd.moveTo(tx, my).lineTo(tx + 4, my - th).lineTo(tx + 8, my).fill({ color: darken(t.groundTopColor, 20), alpha: 0.3 });
      }
    }

    // Near hills — layered with varied profiles and foliage
    const hp2 = s.cameraX * 0.3 * ts;
    const hillCol = darken(t.groundTopColor, 15);
    const hillLit = darken(t.groundTopColor, 5);
    for (let i = 0; i < 14; i++) {
      const hx = ((i * 145) - hp2) % (sw + 500) - 200;
      const hy = sh * 0.68;
      const hrx = 60 + ((i * 23) % 55);
      const hry = 25 + ((i * 17) % 30);
      const hc = i % 2 === 0 ? hillCol : hillLit;
      // Hill body — smooth dome shape
      gd.ellipse(hx, hy, hrx, hry).fill(hc);
      // Lighter top highlight
      gd.ellipse(hx, hy - hry * 0.3, hrx * 0.7, hry * 0.35).fill({ color: lighten(hc, 12), alpha: 0.35 });
      // Grass tufts + small trees on hill
      for (let j = 0; j < 6; j++) {
        const gx2 = hx - hrx * 0.7 + j * hrx * 0.28;
        const gy2 = hy - hry + 6 + (j * 5 + i * 3) % 8;
        if (j % 3 === 0) {
          // Mini tree
          gd.rect(gx2 + 1, gy2 - 5, 2, 6).fill({ color: darken(t.groundColor, 10), alpha: 0.4 });
          gd.ellipse(gx2 + 2, gy2 - 7, 5, 4).fill({ color: hc, alpha: 0.6 });
          gd.ellipse(gx2 + 2, gy2 - 9, 3.5, 3).fill({ color: lighten(hc, 8), alpha: 0.5 });
        } else {
          // Grass tuft
          const lean = ((i + j) % 3) - 1;
          gd.moveTo(gx2, gy2).lineTo(gx2 + lean, gy2 - 6 - j).lineTo(gx2 + 2, gy2)
            .fill({ color: lighten(hc, 8), alpha: 0.45 });
          gd.moveTo(gx2 + 2, gy2).lineTo(gx2 + 2 - lean, gy2 - 4 - j * 0.5).lineTo(gx2 + 4, gy2)
            .fill({ color: lighten(hc, 12), alpha: 0.35 });
        }
      }
    }

    // Trees (parallax 0.4) — detailed with branches, leaves, bark
    const pp = s.cameraX * 0.4 * ts;
    const pineCol = darken(t.groundTopColor, 10);
    const pineLit = t.groundTopColor;
    const pineDark = darken(pineCol, 12);
    const trunkCol = darken(t.groundColor, 15);
    const barkCol = darken(t.groundColor, 25);
    const groundPx = GROUND_ROW * ts;
    for (let i = 0; i < 18; i++) {
      const px = ((i * 110 + 20) - pp) % (sw + 500) - 150;
      const py = groundPx - 2;
      const treeH = 35 + ((i * 31) % 30);
      if (i % 4 === 0) {
        // Pine tree — 4 layered canopy tiers with branch detail
        const tw = 12 + ((i * 7) % 8);
        const tcx = px + tw / 2;
        // Trunk with bark texture
        gd.rect(tcx - 3, py - treeH * 0.3, 6, treeH * 0.38).fill(trunkCol);
        gd.rect(tcx - 2, py - treeH * 0.3, 2, treeH * 0.38).fill(barkCol);
        gd.rect(tcx + 1, py - treeH * 0.1, 1, treeH * 0.2).fill({ color: 0x000000, alpha: 0.1 });
        // Exposed roots
        gd.moveTo(tcx - 5, py).lineTo(tcx - 3, py - 3).lineTo(tcx - 1, py).fill(trunkCol);
        gd.moveTo(tcx + 1, py).lineTo(tcx + 3, py - 3).lineTo(tcx + 5, py).fill(trunkCol);
        // 4 canopy layers
        for (let layer = 0; layer < 4; layer++) {
          const ly = py - treeH * 0.3 - layer * treeH * 0.18;
          const lw = tw * (1.1 - layer * 0.2);
          const lh = treeH * 0.28;
          // Main triangle
          gd.moveTo(tcx - lw / 2, ly).lineTo(tcx, ly - lh).lineTo(tcx + lw / 2, ly).fill(pineCol);
          // Lit right face
          gd.moveTo(tcx, ly - lh).lineTo(tcx + lw / 2, ly).lineTo(tcx + lw * 0.1, ly - lh * 0.35).fill({ color: pineLit, alpha: 0.35 });
          // Shadow left face
          gd.moveTo(tcx - lw / 2, ly).lineTo(tcx, ly - lh).lineTo(tcx - lw * 0.15, ly - lh * 0.3).fill({ color: pineDark, alpha: 0.25 });
          // Branch texture bumps on edge
          if (layer < 3) {
            gd.moveTo(tcx - lw / 2 - 2, ly - 1).lineTo(tcx - lw / 2 + 3, ly - 4).lineTo(tcx - lw / 2 + 1, ly).fill(pineCol);
            gd.moveTo(tcx + lw / 2 + 2, ly - 1).lineTo(tcx + lw / 2 - 3, ly - 4).lineTo(tcx + lw / 2 - 1, ly).fill(pineCol);
          }
        }
      } else if (i % 4 === 2) {
        // Deciduous tree — detailed trunk with branches and leaf clusters
        const cr = 14 + ((i * 11) % 10);
        const tcx = px + cr;
        // Trunk — tapered with bark lines
        gd.moveTo(tcx - 4, py).lineTo(tcx - 2, py - cr * 0.7).lineTo(tcx + 2, py - cr * 0.7).lineTo(tcx + 4, py).fill(trunkCol);
        gd.moveTo(tcx - 2, py - cr * 0.2).lineTo(tcx - 1, py - cr * 0.7).lineTo(tcx, py - cr * 0.7).lineTo(tcx - 1, py - cr * 0.2).fill(barkCol);
        // Roots
        gd.moveTo(tcx - 7, py).lineTo(tcx - 4, py - 4).lineTo(tcx - 2, py).fill(trunkCol);
        gd.moveTo(tcx + 2, py).lineTo(tcx + 4, py - 4).lineTo(tcx + 7, py).fill(trunkCol);
        // Branches (2 visible Y-branches)
        gd.moveTo(tcx - 1, py - cr * 0.6).lineTo(tcx - cr * 0.5, py - cr * 1.0).lineTo(tcx - cr * 0.45, py - cr * 0.95)
          .lineTo(tcx, py - cr * 0.55).fill(trunkCol);
        gd.moveTo(tcx + 1, py - cr * 0.6).lineTo(tcx + cr * 0.4, py - cr * 1.1).lineTo(tcx + cr * 0.35, py - cr * 1.05)
          .lineTo(tcx, py - cr * 0.55).fill(trunkCol);
        // Leaf clusters (5 overlapping blobs with depth)
        const canopyOffsets = [
          { dx: 0, dy: -1.3, rx: 1.0, ry: 0.65, c: pineCol },
          { dx: -0.35, dy: -1.5, rx: 0.65, ry: 0.55, c: pineLit },
          { dx: 0.4, dy: -1.2, rx: 0.55, ry: 0.5, c: pineCol },
          { dx: -0.15, dy: -1.65, rx: 0.45, ry: 0.4, c: lighten(pineLit, 8) },
          { dx: 0.25, dy: -1.55, rx: 0.4, ry: 0.35, c: pineLit },
        ];
        for (const co of canopyOffsets) {
          gd.ellipse(tcx + co.dx * cr, py + co.dy * cr, cr * co.rx, cr * co.ry).fill(co.c);
        }
        // Dappled light spots
        gd.ellipse(tcx - cr * 0.2, py - cr * 1.6, cr * 0.2, cr * 0.15).fill({ color: lighten(pineLit, 20), alpha: 0.3 });
      } else {
        // Bush — multi-lobe organic shape
        const bw = 16 + ((i * 13) % 12);
        const bcx = px + bw / 2;
        // 4-lobe bush
        gd.ellipse(bcx, py, bw * 0.5, bw * 0.35).fill(pineCol);
        gd.ellipse(bcx - bw * 0.2, py - bw * 0.1, bw * 0.35, bw * 0.3).fill(pineCol);
        gd.ellipse(bcx + bw * 0.25, py - bw * 0.05, bw * 0.3, bw * 0.28).fill(pineLit);
        gd.ellipse(bcx, py - bw * 0.15, bw * 0.3, bw * 0.22).fill(pineLit);
        // Highlight lobe
        gd.ellipse(bcx - bw * 0.1, py - bw * 0.2, bw * 0.18, bw * 0.12).fill({ color: lighten(pineLit, 15), alpha: 0.3 });
        // Berry dots
        if (i % 5 === 1) {
          for (let bd = 0; bd < 4; bd++) {
            const bx2 = bcx - bw * 0.2 + bd * bw * 0.15;
            const by2 = py - bw * 0.05 - bd * 2;
            gd.circle(bx2, by2, 1.8).fill(0xCC2222);
            gd.circle(bx2 - 0.5, by2 - 0.5, 0.8).fill(0xFF6666);
          }
        }
      }
    }

    // Foreground flowers & grass (parallax 0.6) — denser with more variety
    const fp = s.cameraX * 0.6 * ts;
    for (let i = 0; i < 28; i++) {
      const fx = ((i * 70 + 10) - fp) % (sw + 400) - 100;
      const fy = groundPx - 1;
      if (i % 4 === 0) {
        // Flower with stem, leaves, and petals
        const fc = [0xFF4466, 0xFFAA22, 0x66AAFF, 0xFFFF44, 0xCC44FF, 0xFF8844, 0x88DDFF][i % 7];
        const stemH = 7 + (i % 3) * 3;
        const lean = Math.sin(Date.now() / 500 + i * 0.8) * 2;
        // Stem
        gd.moveTo(fx, fy).lineTo(fx + lean * 0.3, fy - stemH * 0.5).lineTo(fx + lean, fy - stemH)
          .lineTo(fx + lean + 1, fy - stemH).lineTo(fx + lean * 0.3 + 1, fy - stemH * 0.5).lineTo(fx + 1, fy).fill(0x228822);
        // Leaf on stem
        gd.moveTo(fx + lean * 0.2, fy - stemH * 0.4).lineTo(fx + lean * 0.2 - 4, fy - stemH * 0.5)
          .lineTo(fx + lean * 0.2, fy - stemH * 0.35).fill(0x338833);
        // Petals (6-point, teardrop shaped)
        const fcx = fx + lean + 0.5;
        const fcy = fy - stemH - 1;
        for (let p = 0; p < 6; p++) {
          const pa = (p / 6) * Math.PI * 2 + Date.now() / 5000;
          const pdx = Math.cos(pa) * 4.5;
          const pdy = Math.sin(pa) * 4.5;
          gd.ellipse(fcx + pdx * 0.7, fcy + pdy * 0.7, 3, 2).fill({ color: fc, alpha: 0.7 });
        }
        // Center
        gd.circle(fcx, fcy, 2.5).fill(0xFFFF66);
        gd.circle(fcx - 0.5, fcy - 0.5, 1.2).fill(0xFFFFAA);
      } else if (i % 4 === 2) {
        // Mushroom
        const mh = 4 + (i % 3) * 2;
        gd.rect(fx, fy - mh, 2, mh).fill(0xDDDDCC);
        gd.ellipse(fx + 1, fy - mh - 1, 4, 3).fill(0xCC3333);
        gd.circle(fx - 1, fy - mh - 1, 1).fill(0xFFFFFF);
        gd.circle(fx + 2, fy - mh - 2, 0.8).fill(0xFFFFFF);
      } else {
        // Grass blade (double blade)
        const gh = 5 + (i % 4) * 2;
        const lean = Math.sin(Date.now() / 600 + i) * 2;
        gd.moveTo(fx, fy).lineTo(fx + lean, fy - gh).lineTo(fx + 1.5 + lean * 0.8, fy - gh + 1).lineTo(fx + 2, fy)
          .fill({ color: lighten(t.groundTopColor, 8 + (i % 4) * 3), alpha: 0.5 });
        // Second shorter blade
        gd.moveTo(fx + 2, fy).lineTo(fx + 2 - lean * 0.6, fy - gh * 0.65).lineTo(fx + 3, fy)
          .fill({ color: lighten(t.groundTopColor, 15), alpha: 0.35 });
      }
    }

    // Distant castle silhouette (parallax 0.2) — more detailed
    if (worldIdx <= 1) {
      const castP = s.cameraX * 0.2 * ts;
      const castX = ((700) - castP) % (sw + 600) - 100;
      const castY = sh * 0.55;
      const ca = { color: darken(t.skyBottom, 30), alpha: 0.25 };
      const caL = { color: darken(t.skyBottom, 22), alpha: 0.2 };
      // Main keep
      gd.rect(castX - 5, castY - 5, 40, 55).fill(ca);
      // Left tower with conical roof
      gd.rect(castX - 20, castY + 5, 20, 45).fill(ca);
      gd.moveTo(castX - 22, castY + 5).lineTo(castX - 10, castY - 18).lineTo(castX + 2, castY + 5).fill(ca);
      // Right tower
      gd.rect(castX + 30, castY + 3, 20, 47).fill(ca);
      gd.moveTo(castX + 28, castY + 3).lineTo(castX + 40, castY - 15).lineTo(castX + 52, castY + 3).fill(ca);
      // Central tall spire
      gd.moveTo(castX + 10, castY - 5).lineTo(castX + 17, castY - 35).lineTo(castX + 24, castY - 5).fill(ca);
      gd.moveTo(castX + 15, castY - 30).lineTo(castX + 17, castY - 35).lineTo(castX + 19, castY - 30).fill(caL);
      // Flag on spire
      gd.moveTo(castX + 17, castY - 35).lineTo(castX + 28, castY - 30).lineTo(castX + 17, castY - 25).fill(caL);
      // Battlements along walls
      for (let b = 0; b < 7; b++) {
        gd.rect(castX - 18 + b * 10, castY, 5, 6).fill(ca);
      }
      // Windows (warm glow)
      for (const wx of [castX - 12, castX + 6, castX + 18, castX + 38]) {
        gd.rect(wx, castY + 15, 5, 8).fill({ color: 0xFFAA44, alpha: 0.12 });
      }
      // Gate arch
      gd.roundRect(castX + 8, castY + 30, 14, 20, 7).fill({ color: 0x000000, alpha: 0.15 });
    }
  }

  // =======================================================================
  // TILES — 3D-shaded blocks, detailed patterns
  // =======================================================================

  private _drawTiles(s: KingdomState, theme: WorldTheme): void {
    const g = this._tiles;
    const ts = s.tileSize;
    const camX = s.cameraX;
    const startCol = Math.floor(camX);
    const endCol = Math.ceil(camX + s.sw / ts) + 1;

    for (let r = 0; r < LEVEL_HEIGHT; r++) {
      for (let c = startCol; c <= endCol && c < s.levelWidth; c++) {
        const tile = s.tiles[r]?.[c] as TileType | undefined;
        if (tile == null || tile === TileType.EMPTY) continue;

        const x = (c - camX) * ts;
        const y = r * ts;
        const m = Math.max(1, ts * 0.06); // margin for 3D effect

        switch (tile) {
          case TileType.GROUND:
            this._tileGround(g, x, y, ts, theme, false);
            break;
          case TileType.GROUND_TOP:
            this._tileGround(g, x, y, ts, theme, true);
            break;
          case TileType.BRICK:
            this._tileBrick(g, x, y, ts, m, theme);
            break;
          case TileType.QUESTION:
            this._tileQuestion(g, x, y, ts, m, theme, false);
            break;
          case TileType.USED_QUESTION:
            this._tileQuestion(g, x, y, ts, m, theme, true);
            break;
          case TileType.COIN_BLOCK:
            this._tileQuestion(g, x, y, ts, m, theme, false);
            break;
          case TileType.PIPE_TL: case TileType.PIPE_TR:
          case TileType.PIPE_BL: case TileType.PIPE_BR:
            this._tilePipe(g, x, y, ts, tile, theme);
            break;
          case TileType.CASTLE_WALL:
            this._tileCastleWall(g, x, y, ts, c, r, theme);
            break;
          case TileType.CASTLE_FLOOR: {
            g.rect(x, y, ts, ts).fill(theme.castleColor);
            g.rect(x, y, ts, m).fill(lighten(theme.castleColor, 25));
            g.rect(x, y + ts - m, ts, m).fill(darken(theme.castleColor, 20));
            // Floor tile pattern
            const fOff = (c % 2) * (ts * 0.5);
            g.rect(x + fOff, y, 1, ts).fill(darken(theme.castleColor, 12));
            g.rect(x, y + ts * 0.5, ts, 1).fill(darken(theme.castleColor, 10));
            // Worn spots
            const fSeed = ((c * 5 + r * 3) | 0) & 0xFF;
            if (fSeed % 9 === 0) {
              g.ellipse(x + (fSeed % ts), y + ts * 0.4, 3, 2).fill(darken(theme.castleColor, 6));
            }
            // Highlight on face
            g.rect(x + 2, y + 2, ts * 0.3, 1).fill({ color: 0xFFFFFF, alpha: 0.04 });
            break;
          }
          case TileType.FLAG_POLE:
            this._tileFlagPole(g, x, y, ts);
            break;
          case TileType.FLAG_TOP:
            this._tileFlagTop(g, x, y, ts);
            break;
          case TileType.LAVA:
            this._tileLava(g, x, y, ts, c);
            break;
          case TileType.BRIDGE:
            this._tileBridge(g, x, y, ts, c);
            break;
          case TileType.SPRING:
            this._tileSpring(g, x, y, ts);
            break;
          case TileType.HIDDEN:
            // Invisible — don't draw anything
            break;
          case TileType.PIPE_ENTER_L:
          case TileType.PIPE_ENTER_R:
            // Bonus room pipe — yellow pulsing arrow
            this._tilePipe(g, x, y, ts, tile === TileType.PIPE_ENTER_L ? TileType.PIPE_TL : TileType.PIPE_TR, theme);
            if (tile === TileType.PIPE_ENTER_L) {
              const ax = x + ts / 2 + ts * 0.5;
              const pulse = 0.5 + Math.sin(Date.now() / 300) * 0.3;
              g.moveTo(ax - 4, y - 8).lineTo(ax + 4, y - 8).lineTo(ax, y - 2).fill({ color: 0xFFFF44, alpha: pulse });
            }
            break;
          case TileType.PIPE_WARP_L:
          case TileType.PIPE_WARP_R: {
            // Warp pipe — same pipe body but cyan/blue pulsing arrow with star
            this._tilePipe(g, x, y, ts, tile === TileType.PIPE_WARP_L ? TileType.PIPE_TL : TileType.PIPE_TR, theme);
            if (tile === TileType.PIPE_WARP_L) {
              const ax = x + ts / 2 + ts * 0.5;
              const pulse = 0.5 + Math.sin(Date.now() / 250) * 0.3;
              // Arrow
              g.moveTo(ax - 4, y - 10).lineTo(ax + 4, y - 10).lineTo(ax, y - 2).fill({ color: 0x44EEFF, alpha: pulse });
              // Small star above arrow
              const st = Date.now() / 400;
              const sr = 3.5;
              for (let i = 0; i < 5; i++) {
                const a1 = (i * Math.PI * 2) / 5 - Math.PI / 2 + st * 0.3;
                const a2 = ((i + 0.5) * Math.PI * 2) / 5 - Math.PI / 2 + st * 0.3;
                if (i === 0) g.moveTo(ax + Math.cos(a1) * sr, y - 17 + Math.sin(a1) * sr);
                else g.lineTo(ax + Math.cos(a1) * sr, y - 17 + Math.sin(a1) * sr);
                g.lineTo(ax + Math.cos(a2) * (sr * 0.4), y - 17 + Math.sin(a2) * (sr * 0.4));
              }
              g.fill({ color: 0x44EEFF, alpha: pulse });
            }
            break;
          }
          case TileType.ONE_WAY:
            // One-way platform — thin with arrows
            g.rect(x, y, ts, ts * 0.3).fill(lighten(theme.groundTopColor, 20));
            g.rect(x, y, ts, 2).fill(lighten(theme.groundTopColor, 40));
            g.rect(x, y + ts * 0.3 - 2, ts, 2).fill(darken(theme.groundTopColor, 10));
            // Dotted underside to show passthrough
            for (let i = 0; i < 3; i++) {
              g.circle(x + ts * 0.2 + i * ts * 0.3, y + ts * 0.4, 1.5).fill({ color: theme.groundTopColor, alpha: 0.3 });
            }
            break;
        }
      }
    }
  }

  private _tileGround(g: Graphics, x: number, y: number, ts: number, t: WorldTheme, isTop: boolean): void {
    // Base ground with subtle noise pattern
    g.rect(x, y, ts, ts).fill(t.groundColor);
    const seed = ((x * 7 + y * 13) | 0) & 0xFFF;

    if (isTop) {
      // Grass layer — scalloped edge with multiple tones
      g.rect(x, y, ts, ts * 0.4).fill(t.groundTopColor);
      // Lighter grass strip at top
      g.rect(x, y, ts, 3).fill(lighten(t.groundTopColor, 35));
      // Darker grass transition band
      g.rect(x, y + ts * 0.32, ts, ts * 0.08).fill(darken(t.groundTopColor, 12));
      // Grass tufts — multiple sizes and colors
      for (let i = 0; i < 5; i++) {
        const gx = x + ((seed + i * 37) % (ts - 3)) + 1;
        const gh = 3 + ((seed + i * 11) % 5);
        const gc = i % 2 === 0 ? lighten(t.groundTopColor, 15 + (i * 5)) : t.groundTopColor;
        // Blade shape (triangle)
        const lean = ((seed + i * 23) % 5) - 2;
        g.moveTo(gx, y + 1).lineTo(gx + lean, y - gh + 2).lineTo(gx + 2, y + 1).fill(gc);
      }
      // Occasional flower
      if (seed % 17 === 0) {
        const fx = x + (seed % (ts - 6)) + 3;
        const fc = [0xFF6688, 0xFFDD44, 0x88AAFF, 0xFFAAFF][seed % 4];
        g.circle(fx, y - 1, 2.5).fill(fc);
        g.circle(fx, y - 1, 1).fill(0xFFFF88);
        g.rect(fx - 0.5, y - 1, 1, 4).fill(0x338833);
      }
      // Pebbles at grass/dirt transition
      if (seed % 11 === 0) {
        g.ellipse(x + (seed * 3 % ts), y + ts * 0.38, 2.5, 1.5).fill(darken(t.groundColor, 5));
      }
    } else {
      // Underground dirt — layered texture with rocks and roots
      // Horizontal sediment bands
      const bandOff = (seed % 3) * ts * 0.1;
      g.rect(x, y + bandOff + ts * 0.2, ts, 2).fill(darken(t.groundColor, 8));
      g.rect(x, y + bandOff + ts * 0.6, ts, 1).fill(darken(t.groundColor, 6));
      // Rocks
      if (seed % 5 === 0) {
        const rx = x + (seed * 3 % (ts - 5)) + 2;
        const ry = y + (seed * 7 % (ts - 5)) + 2;
        g.ellipse(rx, ry, 3, 2).fill(darken(t.groundColor, 18));
        g.ellipse(rx - 0.5, ry - 0.5, 2, 1.2).fill(darken(t.groundColor, 10));
      }
      // Root strand
      if (seed % 13 === 0) {
        const ry = y + (seed % (ts - 2));
        g.rect(x, ry, ts * 0.6, 1.5).fill(darken(t.groundColor, 20));
      }
      // Dirt speckle
      if (seed % 3 === 0) {
        g.circle(x + (seed * 11 % ts), y + (seed * 17 % ts), 1).fill(darken(t.groundColor, 12));
      }
    }
  }

  private _tileBrick(g: Graphics, x: number, y: number, ts: number, m: number, t: WorldTheme): void {
    // Base
    g.rect(x, y, ts, ts).fill(t.brickColor);
    // 3D bevel
    g.rect(x, y, ts, m).fill(lighten(t.brickColor, 40));
    g.rect(x, y, m, ts).fill(lighten(t.brickColor, 30));
    g.rect(x, y + ts - m, ts, m).fill(darken(t.brickColor, 35));
    g.rect(x + ts - m, y, m, ts).fill(darken(t.brickColor, 25));
    // Mortar lines — deeper recesses
    const mc = t.brickLine;
    const half = ts / 2;
    g.rect(x, y + half - 1, ts, 2).fill(mc);
    g.rect(x + ts * 0.25 - 1, y, 2, half).fill(mc);
    g.rect(x + ts * 0.75 - 1, y + half, 2, half).fill(mc);
    // Inner brick faces — slight color variation per brick
    const seed = ((x * 3 + y * 7) | 0) & 0xFF;
    const v1 = (seed % 7) - 3;
    const v2 = ((seed * 3) % 7) - 3;
    g.rect(x + m + 1, y + m + 1, ts * 0.25 - m - 2, half - m - 2).fill(lighten(t.brickColor, v1));
    g.rect(x + ts * 0.25 + 1, y + m + 1, ts * 0.75 - m - 2, half - m - 2).fill(lighten(t.brickColor, v2));
    g.rect(x + m + 1, y + half + 1, ts * 0.5 - 1, half - m - 2).fill(lighten(t.brickColor, v2));
    g.rect(x + ts * 0.5, y + half + 1, ts * 0.5 - m - 1, half - m - 2).fill(lighten(t.brickColor, v1));
    // Specular highlight on top-left brick
    g.rect(x + m + 2, y + m + 2, ts * 0.12, m).fill({ color: 0xFFFFFF, alpha: 0.08 });
  }

  private _tileQuestion(g: Graphics, x: number, y: number, ts: number, m: number, t: WorldTheme, used: boolean): void {
    if (used) {
      g.rect(x, y, ts, ts).fill(darken(t.questionDark, 30));
      g.rect(x, y, ts, m).fill(darken(t.questionDark, 10));
      g.rect(x, y + ts - m, ts, m).fill(darken(t.questionDark, 50));
      g.rect(x + m, y + m, ts - 2 * m, ts - 2 * m).fill(darken(t.questionDark, 20));
      // Subtle indent
      g.rect(x + m * 2, y + m * 2, ts - 4 * m, ts - 4 * m).fill(darken(t.questionDark, 25));
      return;
    }
    const now = Date.now();
    const pulse = Math.sin(now / 250) * 0.12 + 0.88;
    const shimmer = Math.sin(now / 150) * 0.1 + 0.9;
    // Outer frame
    g.rect(x, y, ts, ts).fill(t.questionDark);
    // 3D bevel — enhanced
    g.rect(x, y, ts, m).fill(lighten(t.questionColor, 50));
    g.rect(x, y, m, ts).fill(lighten(t.questionColor, 35));
    g.rect(x, y + ts - m, ts, m).fill(darken(t.questionDark, 30));
    g.rect(x + ts - m, y, m, ts).fill(darken(t.questionDark, 20));
    // Inner face — golden with gradient feel
    const inner = m * 2;
    g.rect(x + inner, y + inner, ts - inner * 2, ts - inner * 2).fill(t.questionColor);
    // Top-left shiny corner
    g.rect(x + inner + 1, y + inner + 1, ts * 0.25, ts * 0.2).fill({ color: 0xFFFFFF, alpha: 0.25 * shimmer });
    // Diagonal shine streak
    g.moveTo(x + inner + 2, y + inner + ts * 0.35)
      .lineTo(x + inner + ts * 0.2, y + inner + 2)
      .lineTo(x + inner + ts * 0.25, y + inner + 4)
      .lineTo(x + inner + 4, y + inner + ts * 0.38)
      .fill({ color: 0xFFFFFF, alpha: 0.15 * shimmer });
    // Corner dots (rivets)
    const ci = inner + 3;
    g.circle(x + ci, y + ci, 1.5).fill(darken(t.questionDark, 10));
    g.circle(x + ts - ci, y + ci, 1.5).fill(darken(t.questionDark, 10));
    g.circle(x + ci, y + ts - ci, 1.5).fill(darken(t.questionDark, 10));
    g.circle(x + ts - ci, y + ts - ci, 1.5).fill(darken(t.questionDark, 10));
    // "?" symbol — bolder and more readable
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const qs = Math.max(2, ts * 0.11);
    // Shadow of ?
    g.rect(cx - qs * 1.5 + 1, cy - qs * 2.5 + 1, qs * 3, qs).fill({ color: 0x000000, alpha: 0.15 });
    // ? body
    g.rect(cx - qs * 1.5, cy - qs * 2.5, qs * 3, qs).fill({ color: 0x553300, alpha: pulse });
    g.rect(cx + qs * 0.5, cy - qs * 1.5, qs, qs * 1.5).fill({ color: 0x553300, alpha: pulse });
    g.rect(cx - qs * 0.5, cy - qs * 0.3, qs, qs * 1.2).fill({ color: 0x553300, alpha: pulse });
    // Dot
    g.rect(cx - qs * 0.5, cy + qs * 1.3, qs, qs).fill({ color: 0x553300, alpha: pulse });
    // Ambient glow around block
    g.rect(x - 1, y - 1, ts + 2, ts + 2).fill({ color: t.questionColor, alpha: 0.04 * shimmer });
  }

  private _tilePipe(g: Graphics, x: number, y: number, ts: number, tile: TileType, t: WorldTheme): void {
    const isTop = tile === TileType.PIPE_TL || tile === TileType.PIPE_TR;
    const isLeft = tile === TileType.PIPE_TL || tile === TileType.PIPE_BL;
    // Base
    g.rect(x, y, ts, ts).fill(t.pipeColor);
    // Cylindrical shading — 4-band gradient across pipe width
    if (isLeft) {
      g.rect(x, y, ts * 0.1, ts).fill(t.pipeDark);
      g.rect(x + ts * 0.1, y, ts * 0.15, ts).fill(darken(t.pipeColor, 8));
      g.rect(x + ts * 0.25, y, ts * 0.3, ts).fill(lighten(t.pipeColor, 25));
      g.rect(x + ts * 0.55, y, ts * 0.2, ts).fill(lighten(t.pipeColor, 35));
      g.rect(x + ts * 0.75, y, ts * 0.25, ts).fill(lighten(t.pipeColor, 15));
    } else {
      g.rect(x, y, ts * 0.25, ts).fill(lighten(t.pipeColor, 15));
      g.rect(x + ts * 0.25, y, ts * 0.2, ts).fill(lighten(t.pipeColor, 35));
      g.rect(x + ts * 0.45, y, ts * 0.3, ts).fill(lighten(t.pipeColor, 25));
      g.rect(x + ts * 0.75, y, ts * 0.15, ts).fill(darken(t.pipeColor, 8));
      g.rect(x + ts * 0.9, y, ts * 0.1, ts).fill(t.pipeDark);
    }
    // Specular highlight line
    const hlX = isLeft ? x + ts * 0.6 : x + ts * 0.3;
    g.rect(hlX, y, 2, ts).fill({ color: 0xFFFFFF, alpha: 0.1 });

    if (isTop) {
      const rimH = ts * 0.25;
      const oh = ts * 0.15;
      const rx = isLeft ? x - oh : x;
      const rw = ts + oh;
      // Rim body
      g.rect(rx, y, rw, rimH).fill(lighten(t.pipeColor, 12));
      // Rim 3D: highlight top, dark bottom
      g.rect(rx, y, rw, 3).fill(lighten(t.pipeColor, 45));
      g.rect(rx, y + rimH - 3, rw, 3).fill(t.pipeDark);
      // Rim highlight strip (cylindrical)
      g.rect(rx + rw * 0.3, y + 1, rw * 0.3, rimH - 2).fill(lighten(t.pipeColor, 30));
      g.rect(rx + rw * 0.42, y + 2, 2, rimH - 4).fill({ color: 0xFFFFFF, alpha: 0.12 });
      // Inner shadow (pipe opening)
      g.rect(isLeft ? x + ts * 0.2 : x, y + 3, isLeft ? ts * 0.6 : ts * 0.8, rimH * 0.3).fill({ color: 0x000000, alpha: 0.15 });
    }
  }

  private _tileCastleWall(g: Graphics, x: number, y: number, ts: number, c: number, r: number, t: WorldTheme): void {
    g.rect(x, y, ts, ts).fill(t.castleColor);
    // Stone block pattern — staggered rows with individual stones
    const off = (r % 2) * (ts * 0.5);
    const mortarC = darken(t.castleColor, 22);
    const stoneLight = lighten(t.castleColor, 10);
    const stoneDark = darken(t.castleColor, 8);
    // Horizontal mortar
    g.rect(x, y, ts, 1.5).fill(mortarC);
    g.rect(x, y + ts - 1, ts, 1.5).fill(mortarC);
    // Vertical mortar (staggered)
    g.rect(x + off, y, 1.5, ts).fill(mortarC);
    if (off > 0) g.rect(x + off - ts * 0.5, y, 1.5, ts).fill(mortarC);
    // Individual stone faces with slight color variation
    const seed = ((c * 7 + r * 11) | 0) & 0xFF;
    const sv = (seed % 5) - 2;
    // Left stone
    g.rect(x + 2, y + 2, off > 0 ? off - 3 : ts * 0.5 - 3, ts - 4).fill(lighten(t.castleColor, sv));
    // Right stone
    const rx = off > 0 ? off + 2 : ts * 0.5 + 2;
    g.rect(x + rx, y + 2, ts - rx - 1, ts - 4).fill(lighten(t.castleColor, -sv));
    // Stone bevel — light top edge, dark bottom
    g.rect(x + 2, y + 2, ts - 4, 1).fill(stoneLight);
    g.rect(x + 2, y + ts - 3, ts - 4, 1).fill(stoneDark);
    // Cracks (seeded per-tile)
    if (seed % 7 === 0) {
      const cx = x + (seed * 3 % (ts - 6)) + 3;
      const cy = y + (seed * 5 % (ts - 4)) + 2;
      g.moveTo(cx, cy).lineTo(cx + 4, cy + 3).lineTo(cx + 2, cy + 5).stroke({ color: mortarC, width: 1 });
    }
    // Moss (occasional)
    if (seed % 11 === 0) {
      const mx = x + (seed % (ts - 4));
      g.circle(mx, y + ts - 3, 2).fill({ color: 0x335533, alpha: 0.3 });
      g.circle(mx + 3, y + ts - 2, 1.5).fill({ color: 0x336633, alpha: 0.25 });
    }
    // Torch (every 8 tiles on specific rows)
    if (c % 8 === 3 && r % 4 === 1) {
      const tx = x + ts / 2;
      const ty = y + ts * 0.2;
      // Bracket
      g.rect(tx - 2, ty + 4, 4, 8).fill(0x666666);
      g.rect(tx - 3, ty + 4, 6, 2).fill(0x777777);
      // Torch handle
      g.rect(tx - 1.5, ty - 2, 3, 8).fill(0x8B5A2B);
      // Flame (animated)
      const ft = Date.now() / 100 + c;
      const fh = 6 + Math.sin(ft) * 2;
      g.ellipse(tx, ty - 4, 3 + Math.sin(ft * 1.3), fh).fill({ color: 0xFF6600, alpha: 0.8 });
      g.ellipse(tx, ty - 5, 2, fh * 0.6).fill({ color: 0xFFAA00, alpha: 0.9 });
      g.ellipse(tx, ty - 6, 1, fh * 0.3).fill(0xFFEE44);
      // Glow
      g.circle(tx, ty - 3, ts * 0.5).fill({ color: 0xFF8800, alpha: 0.06 });
      g.circle(tx, ty - 3, ts * 0.3).fill({ color: 0xFFAA44, alpha: 0.04 });
    }
  }

  private _tileFlagPole(g: Graphics, x: number, y: number, ts: number): void {
    const px = x + ts / 2 - 2;
    // Pole with cylindrical shading
    g.rect(px, y, 5, ts).fill(0x888888);
    g.rect(px, y, 2, ts).fill(0xAAAAAA);
    g.rect(px + 1, y, 1, ts).fill(0xBBBBBB);
    g.rect(px + 4, y, 1, ts).fill(0x666666);
    // Ring details every quarter
    if (Math.floor(y / ts) % 3 === 0) {
      g.rect(px - 1, y + ts * 0.5 - 1, 7, 3).fill(0xCCCCCC);
      g.rect(px, y + ts * 0.5 - 1, 5, 1).fill(0xDDDDDD);
    }
  }

  private _tileFlagTop(g: Graphics, x: number, y: number, ts: number): void {
    const px = x + ts / 2 - 2;
    // Pole
    g.rect(px, y, 5, ts).fill(0x888888);
    g.rect(px, y, 2, ts).fill(0xAAAAAA);
    g.rect(px + 4, y, 1, ts).fill(0x666666);
    // Ornate ball finial
    g.circle(px + 2.5, y + 5, 5).fill(0xFFD700);
    g.circle(px + 2.5, y + 5, 3.5).fill(0xFFE844);
    g.circle(px + 1.5, y + 3.5, 2).fill(0xFFFF88);
    // Crown on finial
    g.moveTo(px - 1, y + 2).lineTo(px + 1, y - 2).lineTo(px + 2.5, y + 1)
      .lineTo(px + 4, y - 2).lineTo(px + 6, y + 2).fill(0xFFD700);

    // Pennant flag — waving polygon with multiple points
    const fx = px + 6;
    const fy = y + 7;
    const fw = ts * 0.75;
    const fh = ts * 0.5;
    const wave = Math.sin(Date.now() / 250) * 3;
    const wave2 = Math.sin(Date.now() / 200 + 1) * 2;
    g.moveTo(fx, fy)
      .lineTo(fx + fw * 0.3, fy + fh * 0.15 + wave * 0.3)
      .lineTo(fx + fw * 0.6, fy + fh * 0.05 + wave2 * 0.5)
      .lineTo(fx + fw, fy + fh * 0.45 + wave)
      .lineTo(fx + fw * 0.7, fy + fh * 0.55 + wave2 * 0.7)
      .lineTo(fx + fw * 0.4, fy + fh * 0.85 + wave * 0.4)
      .lineTo(fx, fy + fh)
      .fill(0xCC0000);
    // Flag inner (darker stripe)
    g.moveTo(fx + 2, fy + fh * 0.15)
      .lineTo(fx + fw * 0.5, fy + fh * 0.2 + wave * 0.3)
      .lineTo(fx + fw * 0.5, fy + fh * 0.6 + wave2 * 0.5)
      .lineTo(fx + 2, fy + fh * 0.85)
      .fill(0xAA0000);
    // Cross emblem on flag
    const crossX = fx + fw * 0.35;
    const crossY = fy + fh * 0.4 + wave * 0.3;
    g.rect(crossX - 1, crossY - 5, 3, 10).fill(0xFFD700);
    g.rect(crossX - 5, crossY - 1, 10, 3).fill(0xFFD700);
    // Pendragon emblem (small dragon silhouette)
    g.moveTo(crossX + 6, crossY - 3).lineTo(crossX + 9, crossY - 1).lineTo(crossX + 7, crossY + 2)
      .lineTo(crossX + 5, crossY + 1).fill({ color: 0xFFD700, alpha: 0.5 });
  }

  private _tileLava(g: Graphics, x: number, y: number, ts: number, c: number): void {
    const t = Date.now() / 150;
    // Deep lava base
    g.rect(x, y, ts, ts).fill(0x881100);
    // Flowing molten layers
    const wave1 = Math.sin(t + c * 0.8) * 3;
    const wave2 = Math.sin(t * 1.3 + c * 0.5 + 1) * 2;
    g.rect(x, y + ts * 0.6 + wave1, ts, ts * 0.4).fill(0xAA2200);
    g.rect(x, y + ts * 0.35 + wave2, ts, ts * 0.3).fill(0xCC3300);
    g.rect(x, y + ts * 0.15 + wave1 * 0.5, ts, ts * 0.25).fill(0xDD4400);
    g.rect(x, y + wave2 + 2, ts, ts * 0.12).fill(0xFF6600);
    // Bright crust cracks
    const crack1 = x + ((c * 37 + Math.floor(t * 1.5)) % (ts - 4));
    const crack2 = x + ((c * 53 + Math.floor(t * 0.8)) % (ts - 3));
    g.rect(crack1, y + ts * 0.2 + wave1, 2, ts * 0.3).fill({ color: 0xFFAA00, alpha: 0.6 });
    g.rect(crack2, y + ts * 0.5 + wave2, ts * 0.3, 2).fill({ color: 0xFFAA00, alpha: 0.5 });
    // Bubbles
    const bubbleT = (t * 2 + c * 7) % 8;
    if (bubbleT < 3) {
      const bx = x + ((c * 41) % (ts - 8)) + 4;
      const by = y + ts * 0.4 - bubbleT * 4;
      const br = 2 + bubbleT * 0.5;
      g.circle(bx, by + wave1, br).fill({ color: 0xFFCC00, alpha: 0.6 - bubbleT * 0.15 });
      g.circle(bx, by + wave1, br * 0.5).fill({ color: 0xFFEE66, alpha: 0.4 - bubbleT * 0.1 });
    }
    // Surface glow with shimmer
    const shimmer = 0.5 + Math.sin(t * 2 + c * 1.3) * 0.2;
    g.rect(x, y, ts, 4).fill({ color: 0xFF8800, alpha: shimmer });
    g.rect(x, y, ts, 2).fill({ color: 0xFFBB44, alpha: shimmer * 0.7 });
    // Upward glow (above lava)
    g.rect(x, y - 6, ts, 6).fill({ color: 0xFF4400, alpha: 0.06 });
  }

  private _tileBridge(g: Graphics, x: number, y: number, ts: number, c: number): void {
    const bh = ts * 0.55;
    // Main plank body
    g.rect(x, y, ts, bh).fill(0x7A4A1C);
    // Individual planks (3 across)
    const pw = ts / 3;
    for (let i = 0; i < 3; i++) {
      const px = x + i * pw;
      const shade = (c + i) % 3 === 0 ? 0x8B5A2B : (c + i) % 3 === 1 ? 0x7A4A1C : 0x8A5525;
      g.rect(px + 0.5, y + 1, pw - 1, bh - 2).fill(shade);
      // Plank edge shadow
      g.rect(px, y, 1, bh).fill(0x5A3A10);
      // Wood grain
      g.rect(px + pw * 0.3, y + 3, 1, bh - 6).fill({ color: 0x6A4218, alpha: 0.4 });
      if (i === 1) g.rect(px + pw * 0.6, y + 5, 1, bh - 8).fill({ color: 0x6A4218, alpha: 0.3 });
    }
    // Top edge highlight
    g.rect(x, y, ts, 2).fill(0xA0703C);
    // Bottom edge shadow
    g.rect(x, y + bh - 2, ts, 2).fill(0x5A3210);
    // Side rail
    g.rect(x, y - 2, ts, 3).fill(0x6A3A10);
    g.rect(x, y - 2, ts, 1).fill(0x8A5A2A);
    // Nails with highlight
    for (let i = 0; i < 3; i++) {
      const nx = x + pw * 0.5 + i * pw;
      g.circle(nx, y + bh * 0.3, 2).fill(0x555555);
      g.circle(nx - 0.5, y + bh * 0.3 - 0.5, 1).fill(0x777777);
      g.circle(nx, y + bh * 0.7, 2).fill(0x555555);
      g.circle(nx - 0.5, y + bh * 0.7 - 0.5, 1).fill(0x777777);
    }
    // Rope/chain underneath
    if (c % 2 === 0) {
      const cx = x + ts / 2;
      // Rope with twist
      for (let ri = 0; ri < 4; ri++) {
        const ry = y + bh + ri * 4;
        const rOff = Math.sin(ri * 1.5 + c) * 1.5;
        g.circle(cx + rOff, ry + 2, 2).fill(0x8B6914);
        g.circle(cx + rOff, ry + 2, 1).fill(0xAA8830);
      }
    }
    // Support beam (every 4th tile)
    if (c % 4 === 0) {
      g.rect(x + ts / 2 - 2, y + bh, 4, ts - bh).fill(0x6A4218);
      g.rect(x + ts / 2 - 1, y + bh, 2, ts - bh).fill(0x7A5228);
      // Cross brace
      g.moveTo(x + ts / 2 - 2, y + bh).lineTo(x + ts / 2 + 6, y + bh + (ts - bh) * 0.6)
        .lineTo(x + ts / 2 + 4, y + bh + (ts - bh) * 0.6).lineTo(x + ts / 2 - 4, y + bh)
        .fill(0x5A3210);
    }
  }

  private _tileSpring(g: Graphics, x: number, y: number, ts: number): void {
    const bounce = Math.sin(Date.now() / 200) * 2;
    // Base
    g.rect(x + 2, y + ts * 0.6, ts - 4, ts * 0.4).fill(0x888800);
    g.rect(x + 3, y + ts * 0.62, ts - 6, ts * 0.15).fill(0xAAAA22);
    // Spring coil
    g.rect(x + ts * 0.25, y + ts * 0.3 + bounce, ts * 0.5, ts * 0.35 - bounce).fill(0xCCCC00);
    g.rect(x + ts * 0.3, y + ts * 0.35 + bounce, ts * 0.4, 2).fill(0xEEEE44);
    g.rect(x + ts * 0.3, y + ts * 0.45 + bounce * 0.5, ts * 0.4, 2).fill(0xEEEE44);
    // Top platform
    g.roundRect(x + 1, y + ts * 0.2 + bounce, ts - 2, ts * 0.15, 2).fill(0xDD0000);
    g.rect(x + 3, y + ts * 0.22 + bounce, ts - 6, 2).fill(0xFF4444);
    // Arrow indicator
    g.moveTo(x + ts / 2 - 4, y + ts * 0.15 + bounce).lineTo(x + ts / 2, y + bounce)
      .lineTo(x + ts / 2 + 4, y + ts * 0.15 + bounce).fill({ color: 0xFFFF00, alpha: 0.5 });
  }

  private _drawMovingPlatforms(s: KingdomState): void {
    const g = this._tiles;
    const ts = s.tileSize;
    const now = Date.now();
    for (const mp of s.movingPlatforms) {
      const sx = (mp.x - s.cameraX) * ts;
      const sy = mp.y * ts;
      const w = mp.width * ts;
      const h = ts * 0.45;

      // Rail/guide line (behind platform)
      const startSx = (mp.startX - s.cameraX) * ts;
      const startSy = mp.startY * ts;
      const endSx = (mp.endX - s.cameraX) * ts;
      const endSy = mp.endY * ts;
      g.moveTo(startSx + w / 2, startSy + h / 2).lineTo(endSx + w / 2, endSy + h / 2)
        .stroke({ color: 0x555555, width: 2, alpha: 0.25 });

      // Platform shadow
      g.ellipse(sx + w / 2, sy + h + 3, w * 0.4, 3).fill({ color: 0x000000, alpha: 0.12 });

      // Main body — wooden with metal reinforcement
      g.roundRect(sx, sy, w, h, 4).fill(0x7A5533);
      g.roundRect(sx + 1, sy + 1, w - 2, h - 2, 3).fill(0x8A6543);
      // Top highlight
      g.roundRect(sx + 2, sy + 1, w - 4, 3, 1).fill(0xAA8866);
      // Bottom shadow
      g.rect(sx + 2, sy + h - 3, w - 4, 2).fill(0x5A3520);

      // Plank lines
      const planks = Math.floor(w / (ts * 0.5));
      for (let i = 1; i < planks; i++) {
        const px = sx + i * (w / planks);
        g.rect(px, sy + 2, 1, h - 4).fill(0x6A4A2A);
      }

      // Metal edge strips (top and bottom)
      g.rect(sx, sy, w, 2).fill(0x888888);
      g.rect(sx, sy, w, 1).fill(0xAAAAAA);
      g.rect(sx, sy + h - 2, w, 2).fill(0x666666);

      // Warning stripe triangles at edges
      for (let i = 0; i < 2; i++) {
        const ex = i === 0 ? sx + 2 : sx + w - 10;
        g.moveTo(ex, sy + 4).lineTo(ex + 4, sy + h / 2).lineTo(ex, sy + h - 4).fill(0xEEAA00);
        g.moveTo(ex + 2, sy + 6).lineTo(ex + 5, sy + h / 2).lineTo(ex + 2, sy + h - 6).fill(0x886600);
      }

      // Rivets with 3D highlight
      const rivets = [sx + 8, sx + w / 2, sx + w - 8];
      for (const rx of rivets) {
        g.circle(rx, sy + h / 2, 2.5).fill(0x666666);
        g.circle(rx - 0.5, sy + h / 2 - 0.5, 1.5).fill(0x888888);
        g.circle(rx + 0.5, sy + h / 2 + 0.5, 1).fill(0x444444);
      }

      // Gear on one side (animated)
      const gearX = sx - 5;
      const gearY = sy + h / 2;
      const gearR = 6;
      const gearRot = now / 500 * mp.direction;
      g.circle(gearX, gearY, gearR).fill(0x777777);
      g.circle(gearX, gearY, gearR - 2).fill(0x888888);
      g.circle(gearX, gearY, 2).fill(0x555555);
      // Gear teeth
      for (let t = 0; t < 6; t++) {
        const a = gearRot + (t / 6) * Math.PI * 2;
        const tx = gearX + Math.cos(a) * gearR;
        const ty = gearY + Math.sin(a) * gearR;
        g.circle(tx, ty, 2).fill(0x666666);
      }

      // Chain links hanging underneath
      const chainX = sx + w / 2;
      for (let ci = 0; ci < 3; ci++) {
        const cy = sy + h + 2 + ci * 5;
        const cw = ci % 2 === 0 ? 4 : 3;
        g.roundRect(chainX - cw / 2, cy, cw, 4, 1).stroke({ color: 0x777777, width: 1 });
      }
    }
  }

  // =======================================================================
  // PLAYER — detailed character sprite
  // =======================================================================

  private _drawPlayer(s: KingdomState): void {
    const p = s.player;
    const g = this._player;
    const ts = s.tileSize;

    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;

    const sx = (p.x - s.cameraX) * ts;
    const sy = p.y * ts;
    const w = p.width * ts;
    const h = p.height * ts;
    const colors = CHAR_COLORS[s.character];

    // Star power: rainbow aura
    if (p.starTimer > 0) {
      const hue = (Date.now() / 40) % 360;
      for (let i = 3; i > 0; i--) {
        const sc = hslToHex((hue + i * 40) % 360, 100, 60);
        g.roundRect(sx - i * 2, sy - i * 2, w + i * 4, h + i * 4, 4).fill({ color: sc, alpha: 0.15 });
      }
    }

    // Dash trail (Lancelot)
    if (p.dashTimer > 0) {
      for (let i = 1; i <= 3; i++) {
        g.rect(sx - p.facing * i * 8, sy + 2, w, h - 4).fill({ color: colors.secondary, alpha: 0.15 * (4 - i) });
      }
    }

    this._drawCharSprite(g, s.character, p, sx, sy, w, h, ts, colors);
  }

  private _drawCharSprite(
    g: Graphics, char: KingdomChar, p: Player,
    sx: number, sy: number, w: number, h: number, ts: number, c: CharColors,
  ): void {
    const big = p.power !== PowerState.SMALL;
    const fire = p.power === PowerState.FIRE;
    const f = p.facing;
    const primary = fire ? 0xEE3300 : c.primary;
    const primaryLt = lighten(primary, 25);
    const walk = p.grounded ? p.animFrame : -1;
    const jumpFrame = !p.grounded;

    // Animation offsets
    const bob = (walk >= 0 && walk % 2 === 1) ? -2 : 0;
    const legPhase = walk >= 0 ? walk % 4 : 0;

    if (big) {
      const headR = h * 0.13;
      const torsoTop = sy + headR * 2 + bob;
      const torsoH = h * 0.32;
      const legTop = torsoTop + torsoH;
      const legH = h - (headR * 2) - torsoH - bob;

      // Shadow
      g.ellipse(sx + w / 2, sy + h, w * 0.45, 3).fill({ color: 0x000000, alpha: 0.25 });

      // Cape (Arthur, Lancelot) — draw behind body
      if (char === KingdomChar.ARTHUR || char === KingdomChar.LANCELOT) {
        const capeX = f > 0 ? sx - 4 : sx + w - 6;
        const capeCol = char === KingdomChar.ARTHUR ? 0xAA0000 : 0x0033AA;
        const capeW2 = 10;
        const capeH2 = torsoH + legH * 0.4;
        const wave = Math.sin(Date.now() / 200 + p.x) * 3;
        // Cape body (flowing shape)
        g.moveTo(capeX, torsoTop + 3)
          .lineTo(capeX + capeW2, torsoTop + 3)
          .lineTo(capeX + capeW2 + wave, torsoTop + capeH2)
          .lineTo(capeX - 1 + wave * 0.5, torsoTop + capeH2 + 2)
          .fill(capeCol);
        // Cape highlight
        g.moveTo(capeX + 1, torsoTop + 4)
          .lineTo(capeX + capeW2 * 0.6, torsoTop + 4)
          .lineTo(capeX + capeW2 * 0.5 + wave * 0.3, torsoTop + capeH2 * 0.5)
          .lineTo(capeX + 1, torsoTop + capeH2 * 0.4)
          .fill({ color: lighten(capeCol, 25), alpha: 0.4 });
      }

      // Legs (rounded)
      const lw = w * 0.28;
      const l1off = legPhase === 1 ? 4 : legPhase === 3 ? -3 : 0;
      const l2off = legPhase === 1 ? -3 : legPhase === 3 ? 4 : 0;
      if (jumpFrame) {
        g.roundRect(sx + w * 0.12, legTop, lw, legH * 0.65, 3).fill(c.secondary);
        g.roundRect(sx + w * 0.6, legTop, lw, legH * 0.65, 3).fill(c.secondary);
      } else {
        g.roundRect(sx + w * 0.12, legTop + l1off, lw, legH - l1off, 3).fill(c.secondary);
        g.roundRect(sx + w * 0.6, legTop + l2off, lw, legH - l2off, 3).fill(c.secondary);
        // Knee highlight
        g.ellipse(sx + w * 0.26, legTop + legH * 0.35, lw * 0.3, 2).fill({ color: lighten(c.secondary, 20), alpha: 0.4 });
        g.ellipse(sx + w * 0.74, legTop + legH * 0.35, lw * 0.3, 2).fill({ color: lighten(c.secondary, 20), alpha: 0.4 });
      }
      // Shoes (rounded)
      g.roundRect(sx + w * 0.06, sy + h - 6, lw + 4, 6, 2).fill(darken(c.secondary, 30));
      g.roundRect(sx + w * 0.56, sy + h - 6, lw + 4, 6, 2).fill(darken(c.secondary, 30));

      // Torso (more rounded, with belt and highlights)
      g.roundRect(sx + 2, torsoTop, w - 4, torsoH, 4).fill(primary);
      g.roundRect(sx + 3, torsoTop + 1, (w - 6) * 0.5, 2, 1).fill({ color: primaryLt, alpha: 0.6 }); // shoulder highlight
      // Belt
      g.roundRect(sx + 3, torsoTop + torsoH - 5, w - 6, 4, 1).fill(darken(c.secondary, 15));
      g.circle(sx + w / 2, torsoTop + torsoH - 3, 2).fill(0xCCAA33); // belt buckle

      // Arms (rounded, with elbow)
      const armW = w * 0.17;
      const armH = torsoH * 0.75;
      const armY = torsoTop + 5;
      const armSwing = walk === 1 ? -4 : walk === 3 ? 4 : 0;
      if (f > 0) {
        g.roundRect(sx - armW + 2, armY, armW, armH, 3).fill(primary); // back arm
        g.roundRect(sx + w - 2, armY + armSwing, armW, armH, 3).fill(primaryLt); // front arm
        // Hand
        g.circle(sx + w - 2 + armW / 2, armY + armH + armSwing, armW * 0.35).fill(c.skin);
      } else {
        g.roundRect(sx + w - 2, armY, armW, armH, 3).fill(primary);
        g.roundRect(sx - armW + 2, armY + armSwing, armW, armH, 3).fill(primaryLt);
        g.circle(sx - armW + 2 + armW / 2, armY + armH + armSwing, armW * 0.35).fill(c.skin);
      }

      // Head
      const headCx = sx + w / 2;
      const headCy = sy + headR + bob;
      g.circle(headCx, headCy, headR).fill(c.skin);
      // Face highlight (cheek)
      g.ellipse(headCx - headR * 0.2, headCy - headR * 0.1, headR * 0.35, headR * 0.25).fill({ color: lighten(c.skin, 18), alpha: 0.45 });
      // Nose
      g.ellipse(headCx + f * headR * 0.12, headCy + headR * 0.15, headR * 0.08, headR * 0.06).fill(darken(c.skin, 18));

      // Both eyes visible (front-facing, shifted slightly toward facing direction)
      const eyeShift = f * headR * 0.08;
      for (const side of [-1, 1]) {
        const ex = headCx + side * headR * 0.3 + eyeShift;
        const ey = headCy - headR * 0.1;
        g.ellipse(ex, ey, headR * 0.2, headR * 0.18).fill(0xFFFFFF);
        g.circle(ex + f * headR * 0.06, ey, headR * 0.11).fill(0x334466);
        g.circle(ex + f * headR * 0.08, ey - headR * 0.02, headR * 0.06).fill(0x111122);
        // Eye glint
        g.circle(ex + f * headR * 0.02, ey - headR * 0.06, headR * 0.04).fill({ color: 0xFFFFFF, alpha: 0.7 });
        // Eyebrow
        g.moveTo(ex - headR * 0.16, ey - headR * 0.22)
          .lineTo(ex + side * headR * 0.06, ey - headR * 0.28)
          .lineTo(ex + headR * 0.16, ey - headR * 0.2)
          .lineTo(ex + headR * 0.14, ey - headR * 0.16)
          .lineTo(ex - headR * 0.14, ey - headR * 0.17).fill(darken(c.hair || c.skin, 30));
      }
      // Mouth
      g.moveTo(headCx - headR * 0.12, headCy + headR * 0.35)
        .lineTo(headCx, headCy + headR * 0.4)
        .lineTo(headCx + headR * 0.12, headCy + headR * 0.35).stroke({ color: darken(c.skin, 30), width: 1 });
      // Ears
      for (const side of [-1, 1]) {
        g.ellipse(headCx + side * headR * 0.88, headCy + headR * 0.05, headR * 0.12, headR * 0.2).fill(c.skin);
        g.ellipse(headCx + side * headR * 0.88, headCy + headR * 0.05, headR * 0.07, headR * 0.12).fill(darken(c.skin, 12));
      }

      this._drawCharAccent(g, char, headCx, headCy, headR, w, h, f, fire, torsoTop, torsoH, sx, sy, c);
    } else {
      // SMALL character — narrower visual width
      const sw = w * 0.7;           // visual width (narrower than hitbox)
      const ox = sx + (w - sw) / 2; // center the narrower sprite
      const headR = h * 0.22;
      const bodyTop = sy + headR * 2 + bob;
      const bodyH = h - headR * 2 - bob;

      // Shadow
      g.ellipse(ox + sw / 2, sy + h, sw * 0.4, 2.5).fill({ color: 0x000000, alpha: 0.25 });

      // Legs with boots (draw behind body)
      const lw = sw * 0.26;
      const legTop = bodyTop + bodyH * 0.52;
      const legH = h - headR * 2 - bodyH * 0.52 - bob;
      const bootH = 4;
      if (jumpFrame) {
        // Spread legs when jumping
        g.roundRect(ox + sw * 0.08, legTop, lw, legH * 0.6, 2).fill(c.secondary);
        g.roundRect(ox + sw * 0.62, legTop, lw, legH * 0.6, 2).fill(c.secondary);
        g.roundRect(ox + sw * 0.05, legTop + legH * 0.6 - 1, lw + 3, bootH, 2).fill(darken(c.secondary, 30));
        g.roundRect(ox + sw * 0.59, legTop + legH * 0.6 - 1, lw + 3, bootH, 2).fill(darken(c.secondary, 30));
      } else {
        const lo = legPhase === 1 ? 2 : legPhase === 3 ? -2 : 0;
        g.roundRect(ox + sw * 0.12, legTop + lo, lw, legH - lo, 2).fill(c.secondary);
        g.roundRect(ox + sw * 0.62, legTop - lo, lw, legH + lo, 2).fill(c.secondary);
        // Knee highlights
        g.ellipse(ox + sw * 0.25, legTop + legH * 0.3, lw * 0.25, 1.5).fill({ color: lighten(c.secondary, 18), alpha: 0.4 });
        g.ellipse(ox + sw * 0.75, legTop + legH * 0.3, lw * 0.25, 1.5).fill({ color: lighten(c.secondary, 18), alpha: 0.4 });
        // Boots
        g.roundRect(ox + sw * 0.06, sy + h - bootH, lw + 3, bootH, 2).fill(darken(c.secondary, 30));
        g.roundRect(ox + sw * 0.58, sy + h - bootH, lw + 3, bootH, 2).fill(darken(c.secondary, 30));
      }

      // Torso (with belt and shading)
      g.roundRect(ox + 1, bodyTop, sw - 2, bodyH * 0.55, 3).fill(primary);
      // Torso highlight
      g.roundRect(ox + 2, bodyTop + 1, (sw - 4) * 0.4, bodyH * 0.15, 1).fill({ color: primaryLt, alpha: 0.5 });
      // Torso shadow at bottom
      g.roundRect(ox + 2, bodyTop + bodyH * 0.4, sw - 4, bodyH * 0.12, 1).fill({ color: darken(primary, 20), alpha: 0.3 });
      // Belt
      g.roundRect(ox + 1, bodyTop + bodyH * 0.48, sw - 2, 3, 1).fill(darken(c.secondary, 20));
      g.circle(ox + sw / 2, bodyTop + bodyH * 0.5, 1.5).fill(0xCCAA33); // buckle

      // Arms (both visible, with hands)
      const armW2 = sw * 0.15;
      const armLen = bodyH * 0.42;
      const armSwing = walk === 1 ? -2 : walk === 3 ? 2 : 0;
      // Back arm
      const backArmX = f > 0 ? ox - armW2 + 1 : ox + sw - 1;
      g.roundRect(backArmX, bodyTop + 3 - armSwing, armW2, armLen, 2).fill(darken(primary, 15));
      g.circle(backArmX + armW2 / 2, bodyTop + 3 - armSwing + armLen, armW2 * 0.4).fill(darken(c.skin, 8));
      // Front arm
      const frontArmX = f > 0 ? ox + sw - 1 : ox - armW2 + 1;
      g.roundRect(frontArmX, bodyTop + 3 + armSwing, armW2, armLen, 2).fill(primaryLt);
      g.circle(frontArmX + armW2 / 2, bodyTop + 3 + armSwing + armLen, armW2 * 0.4).fill(c.skin);
      // Shoulder pads
      g.ellipse(ox + 1, bodyTop + 3, armW2 * 0.7, 2.5).fill(lighten(primary, 15));
      g.ellipse(ox + sw - 1, bodyTop + 3, armW2 * 0.7, 2.5).fill(lighten(primary, 15));

      // Head
      const headCx = ox + sw / 2;
      const headCy = sy + headR + bob;
      // Neck
      g.roundRect(headCx - 2, headCy + headR * 0.7, 4, headR * 0.4, 1).fill(c.skin);
      g.circle(headCx, headCy, headR).fill(c.skin);
      // Face highlight
      g.ellipse(headCx - headR * 0.2, headCy - headR * 0.1, headR * 0.3, headR * 0.2).fill({ color: lighten(c.skin, 18), alpha: 0.4 });

      // Both eyes (front-facing)
      const eyeShift = f * headR * 0.06;
      for (const side of [-1, 1]) {
        const ex = headCx + side * headR * 0.32 + eyeShift;
        const ey = headCy - headR * 0.08;
        g.ellipse(ex, ey, headR * 0.18, headR * 0.16).fill(0xFFFFFF);
        g.circle(ex + f * headR * 0.05, ey, headR * 0.1).fill(0x334466);
        g.circle(ex + f * headR * 0.07, ey - headR * 0.02, headR * 0.05).fill(0x111122);
        // Glint
        g.circle(ex, ey - headR * 0.05, headR * 0.035).fill({ color: 0xFFFFFF, alpha: 0.6 });
        // Eyebrow
        g.roundRect(ex - headR * 0.14, ey - headR * 0.22, headR * 0.28, 1.5, 0.5).fill(darken(c.hair || c.skin, 30));
      }
      // Nose
      g.ellipse(headCx + f * headR * 0.1, headCy + headR * 0.15, headR * 0.06, headR * 0.04).fill(darken(c.skin, 15));
      // Mouth
      g.moveTo(headCx - headR * 0.1, headCy + headR * 0.32)
        .lineTo(headCx, headCy + headR * 0.36)
        .lineTo(headCx + headR * 0.1, headCy + headR * 0.32).stroke({ color: darken(c.skin, 28), width: 0.8 });
      // Ears
      for (const side of [-1, 1]) {
        g.ellipse(headCx + side * headR * 0.88, headCy + headR * 0.05, headR * 0.1, headR * 0.16).fill(c.skin);
      }

      this._drawCharAccent(g, char, headCx, headCy, headR, sw, h, f, fire, bodyTop, bodyH, ox, sy, c);
    }

    // Fire power glow on hand
    if (fire) {
      const vw = big ? w : w * 0.7;
      const vx = sx + (w - vw) / 2;
      const handX = f > 0 ? vx + vw + 2 : vx - 6;
      const handY = sy + h * 0.45;
      g.circle(handX + 2, handY, 5).fill({ color: 0xFF6600, alpha: 0.6 + Math.sin(Date.now() / 80) * 0.2 });
      g.circle(handX + 2, handY, 3).fill({ color: 0xFFCC00, alpha: 0.8 });
    }
  }

  private _drawCharAccent(
    g: Graphics, char: KingdomChar,
    cx: number, cy: number, r: number,
    w: number, h: number, f: number, fire: boolean,
    torsoTop: number, torsoH: number,
    sx: number, sy: number, c: CharColors,
  ): void {
    switch (char) {
      case KingdomChar.ARTHUR: {
        // Crown — ornate 5-point with jewels and trim
        const crY = cy - r - 2;
        const crW = r * 1.7;
        const crH = r * 0.45;
        // Crown base band
        g.roundRect(cx - crW / 2, crY, crW, crH, 1).fill(0xFFD700);
        g.rect(cx - crW / 2, crY + crH - 2, crW, 2).fill(0xCCA800);
        g.rect(cx - crW / 2, crY, crW, 2).fill(0xFFEE55);
        // 5 crown points
        const pts = 5;
        for (let i = 0; i < pts; i++) {
          const px = cx - crW / 2 + (crW / (pts - 1)) * i;
          const ph = r * (i === 2 ? 0.55 : 0.35);
          g.moveTo(px - 2.5, crY).lineTo(px, crY - ph).lineTo(px + 2.5, crY).fill(0xFFD700);
          // Tip orb
          g.circle(px, crY - ph, 1.5).fill(0xFFEE66);
        }
        // Centre ruby
        g.circle(cx, crY + crH * 0.3, 3).fill(0xDD0000);
        g.circle(cx - 1, crY + crH * 0.2, 1.5).fill(0xFF6666);
        // Side sapphires
        g.circle(cx - crW * 0.3, crY + crH * 0.3, 2).fill(0x2244CC);
        g.circle(cx + crW * 0.3, crY + crH * 0.3, 2).fill(0x2244CC);
        // Sword held at side
        const swordX = f > 0 ? sx + w + 1 : sx - 6;
        const swordY = torsoTop + torsoH * 0.2;
        const sLen = torsoH * 1.1;
        g.rect(swordX + 1, swordY, 2, sLen).fill(0xBBBBCC); // blade
        g.rect(swordX, swordY, 4, 2).fill(0xDDDDEE); // tip
        g.rect(swordX - 2, swordY + sLen * 0.3, 8, 3).fill(0xFFD700); // cross-guard
        g.rect(swordX + 0.5, swordY + sLen * 0.3 + 3, 3, sLen * 0.25).fill(0x8B4513); // grip
        break;
      }
      case KingdomChar.MERLIN: {
        // Wizard hat — curved conical with brim and stars
        const hatY = cy - r - 1;
        const brim = r * 2;
        // Brim — elliptical
        g.ellipse(cx, hatY + r * 0.15, brim / 2, r * 0.2).fill(c.primary);
        g.ellipse(cx, hatY + r * 0.1, brim / 2 - 2, r * 0.12).fill(lighten(c.primary, 15));
        // Cone with curve
        g.moveTo(cx - r * 0.75, hatY)
          .lineTo(cx - r * 0.4, hatY - r * 1.2)
          .lineTo(cx + r * 0.15, hatY - r * 2.3) // tip bends
          .lineTo(cx + r * 0.4, hatY - r * 2.1)
          .lineTo(cx + r * 0.75, hatY).fill(c.primary);
        // Hat highlight
        g.moveTo(cx - r * 0.3, hatY - r * 0.5)
          .lineTo(cx + r * 0.1, hatY - r * 1.8)
          .lineTo(cx + r * 0.35, hatY - r * 1.6)
          .lineTo(cx + r * 0.1, hatY - r * 0.3).fill(lighten(c.primary, 18));
        // Hat band with buckle
        g.rect(cx - r * 0.7, hatY - 1, r * 1.4, 4).fill(darken(c.primary, 25));
        g.rect(cx - 2, hatY - 2, 4, 5).fill(0xFFD700); // buckle
        // Stars on hat
        this._star5(g, cx + r * 0.2, hatY - r * 1.4, 4, 0xFFD700);
        this._star5(g, cx - r * 0.15, hatY - r * 0.7, 2.5, 0xFFEE88);
        // Beard — flowing multi-strand
        const beardY = cy + r * 0.35;
        const beardW = r * 0.7;
        g.moveTo(cx - beardW, beardY)
          .lineTo(cx - beardW * 0.6, beardY + r * 1.4)
          .lineTo(cx - beardW * 0.2, beardY + r * 1.1)
          .lineTo(cx, beardY + r * 1.6)
          .lineTo(cx + beardW * 0.2, beardY + r * 1.1)
          .lineTo(cx + beardW * 0.6, beardY + r * 1.3)
          .lineTo(cx + beardW, beardY).fill(0xDDDDDD);
        // Beard highlight
        g.moveTo(cx - beardW * 0.4, beardY + 2)
          .lineTo(cx, beardY + r * 1.0)
          .lineTo(cx + beardW * 0.4, beardY + 2).fill(0xEEEEEE);
        // Staff
        const staffX = f > 0 ? sx + w + 2 : sx - 5;
        const staffY = torsoTop - r;
        const staffH = torsoH + h * 0.35;
        g.rect(staffX, staffY, 3, staffH).fill(0x8B5A2B);
        g.rect(staffX - 0.5, staffY, 4, 2).fill(0xAA7744);
        // Orb on staff
        g.circle(staffX + 1.5, staffY - 4, 5).fill({ color: 0x6644FF, alpha: 0.7 });
        g.circle(staffX + 1.5, staffY - 4, 3).fill({ color: 0xAA88FF, alpha: 0.8 });
        g.circle(staffX + 0.5, staffY - 5, 1.5).fill({ color: 0xFFFFFF, alpha: 0.5 });
        break;
      }
      case KingdomChar.GUINEVERE: {
        // Ornate tiara with multiple gems
        const tY = cy - r - 2;
        const tW = r * 1.7;
        g.roundRect(cx - tW / 2, tY, tW, r * 0.35, 2).fill(0xFFD700);
        g.rect(cx - tW / 2, tY + r * 0.25, tW, 2).fill(0xCCA800);
        g.rect(cx - tW / 2, tY, tW, 2).fill(0xFFEE55);
        // Central peak with sapphire
        g.moveTo(cx - 5, tY).lineTo(cx, tY - r * 0.5).lineTo(cx + 5, tY).fill(0xFFD700);
        g.circle(cx, tY - r * 0.2, 3.5).fill(0x4466FF);
        g.circle(cx - 1, tY - r * 0.25, 1.5).fill(0x88AAFF);
        // Side peaks
        g.moveTo(cx - tW * 0.35, tY).lineTo(cx - tW * 0.3, tY - r * 0.25).lineTo(cx - tW * 0.25, tY).fill(0xFFD700);
        g.moveTo(cx + tW * 0.25, tY).lineTo(cx + tW * 0.3, tY - r * 0.25).lineTo(cx + tW * 0.35, tY).fill(0xFFD700);
        // Small gems
        g.circle(cx - tW * 0.3, tY + r * 0.12, 1.5).fill(0xFF44AA);
        g.circle(cx + tW * 0.3, tY + r * 0.12, 1.5).fill(0xFF44AA);

        // Flowing hair — parted to frame face, originates from top of head
        const hairBase = cy - r * 0.85;
        const hairLen = r * 2.5;
        const waveT = Date.now() / 300;
        const hairOffsets = [-r * 0.8, -r * 0.65, -r * 0.5, r * 0.5, r * 0.65, r * 0.8];
        for (let strand = 0; strand < 6; strand++) {
          const strandX = cx + hairOffsets[strand];
          const strandW = 3 + (strand === 2 || strand === 3 ? 1 : 0);
          const wave1 = Math.sin(waveT * 1.8 + strand * 1.1) * 3;
          const wave2 = Math.sin(waveT * 1.2 + strand * 0.7) * 4;
          const len = hairLen * (0.8 + (strand === 2 || strand === 3 ? 0.2 : 0));
          g.moveTo(strandX - strandW / 2, hairBase)
            .lineTo(strandX - strandW / 2 + wave1, hairBase + len * 0.4)
            .lineTo(strandX + wave2, hairBase + len)
            .lineTo(strandX + strandW / 2 + wave2, hairBase + len)
            .lineTo(strandX + strandW / 2 + wave1, hairBase + len * 0.4)
            .lineTo(strandX + strandW / 2, hairBase).fill(strand % 3 === 0 ? lighten(c.hair, 15) : c.hair);
        }

        // Dress hem (decorative triangles)
        const hemY = torsoTop + torsoH;
        for (let i = 0; i < 3; i++) {
          const hx = sx + w * 0.15 + i * w * 0.25;
          g.moveTo(hx, hemY).lineTo(hx + w * 0.12, hemY + 4).lineTo(hx + w * 0.24, hemY)
            .fill({ color: c.accent, alpha: 0.5 });
        }
        break;
      }
      case KingdomChar.LANCELOT: {
        // Full great helm — detailed with rivets
        g.circle(cx, cy, r + 3).fill(darken(c.accent, 10));
        g.circle(cx, cy, r + 2).fill(c.accent);
        // Helmet highlight
        g.ellipse(cx - r * 0.25, cy - r * 0.35, r * 0.35, r * 0.3).fill({ color: 0xFFFFFF, alpha: 0.12 });
        // Visor with breathing holes
        g.roundRect(cx - r * 0.65, cy - r * 0.15, r * 1.3, r * 0.35, 2).fill(0x0A0A0A);
        // Breathing holes (dots)
        for (let i = 0; i < 3; i++) {
          g.circle(cx - r * 0.3 + i * r * 0.3, cy + r * 0.3, 1.5).fill(0x222222);
        }
        // Nose guard
        g.moveTo(cx - 2, cy - r * 0.5).lineTo(cx, cy - r * 0.6).lineTo(cx + 2, cy - r * 0.5)
          .lineTo(cx + 1.5, cy + r * 0.15).lineTo(cx - 1.5, cy + r * 0.15).fill(lighten(c.accent, 20));
        // Rivets on helm
        for (let i = 0; i < 6; i++) {
          const ra = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const rvx = cx + Math.cos(ra) * (r + 1);
          const rvy = cy + Math.sin(ra) * (r + 1);
          g.circle(rvx, rvy, 1.5).fill(0x999999);
          g.circle(rvx - 0.5, rvy - 0.5, 0.8).fill(0xBBBBBB);
        }
        // Plume — flowing feather shape
        const plumeH = r * 1.8;
        const plumeWave = Math.sin(Date.now() / 180) * 3;
        g.moveTo(cx, cy - r - 1)
          .lineTo(cx - 2, cy - r - plumeH * 0.4)
          .lineTo(cx + plumeWave, cy - r - plumeH)
          .lineTo(cx + 4 + plumeWave * 0.5, cy - r - plumeH * 0.5)
          .lineTo(cx + 3, cy - r - 1).fill(0x0044CC);
        // Plume highlight
        g.moveTo(cx + 1, cy - r - 2)
          .lineTo(cx + 1 + plumeWave * 0.5, cy - r - plumeH * 0.7)
          .lineTo(cx + 3 + plumeWave * 0.3, cy - r - plumeH * 0.3)
          .lineTo(cx + 2, cy - r - 2).fill(0x2266DD);
        // Shield on back arm
        const shX = f > 0 ? sx - 6 : sx + w;
        const shY = torsoTop + 4;
        const shW = w * 0.35;
        const shH = torsoH * 0.7;
        g.moveTo(shX, shY).lineTo(shX + shW, shY).lineTo(shX + shW / 2, shY + shH).fill(0x0044AA);
        g.moveTo(shX + 2, shY + 2).lineTo(shX + shW - 2, shY + 2).lineTo(shX + shW / 2, shY + shH - 4).fill(0x0055CC);
        // Shield cross
        g.rect(shX + shW * 0.4, shY + 3, shW * 0.2, shH * 0.6).fill(0xFFD700);
        g.rect(shX + shW * 0.15, shY + shH * 0.2, shW * 0.7, shH * 0.12).fill(0xFFD700);
        // Lance / weapon
        const wpX = f > 0 ? sx + w + 1 : sx - 4;
        g.rect(wpX, torsoTop - r * 0.5, 3, torsoH + h * 0.3).fill(0x8B5A2B);
        g.moveTo(wpX - 1, torsoTop - r * 0.5).lineTo(wpX + 1.5, torsoTop - r * 1.2)
          .lineTo(wpX + 4, torsoTop - r * 0.5).fill(0xBBBBCC);
        break;
      }
    }
  }

  /** Draws a 5-pointed star at (cx,cy) with given radius. */
  private _star5(g: Graphics, cx: number, cy: number, r: number, color: number): void {
    g.moveTo(cx, cy - r);
    for (let i = 1; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const sr = i % 2 === 0 ? r : r * 0.4;
      g.lineTo(cx + Math.cos(a) * sr, cy + Math.sin(a) * sr);
    }
    g.fill(color);
  }

  // =======================================================================
  // ENEMIES — more detailed and expressive
  // =======================================================================

  private _drawEnemies(s: KingdomState): void {
    const g = this._entities;
    const ts = s.tileSize;
    const camX = s.cameraX;
    const viewW = s.sw / ts;

    for (const e of s.enemies) {
      if (e.x < camX - 2 || e.x > camX + viewW + 2) continue;
      if (!e.alive && e.deathTimer <= 0) continue;

      const sx = (e.x - camX) * ts;
      const sy = e.y * ts;
      const w = e.width * ts;
      const h = e.height * ts;

      if (!e.alive) {
        // Flip & fade
        const a = Math.max(0, e.deathTimer / 0.5);
        g.rect(sx + 2, sy, w - 4, h).fill({ color: 0xFF4444, alpha: a * 0.6 });
        // X eyes
        g.rect(sx + w * 0.3, sy + h * 0.2, 4, 1).fill({ color: 0x000000, alpha: a });
        g.rect(sx + w * 0.6, sy + h * 0.2, 4, 1).fill({ color: 0x000000, alpha: a });
        continue;
      }

      // Shadow
      g.ellipse(sx + w / 2, sy + h, w * 0.4, 3).fill({ color: 0x000000, alpha: 0.15 });

      switch (e.type) {
        case EnemyType.GOBLIN:   this._goblin(g, sx, sy, w, h, e, ts); break;
        case EnemyType.DARK_KNIGHT: this._darkKnight(g, sx, sy, w, h, e, ts); break;
        case EnemyType.SKELETON:  this._skeleton(g, sx, sy, w, h, e, ts); break;
        case EnemyType.DRAGON:   this._dragon(g, sx, sy, w, h, e, ts); break;
        case EnemyType.BAT:     this._bat(g, sx, sy, w, h, e, ts); break;
        case EnemyType.BOAR:    this._boar(g, sx, sy, w, h, e, ts); break;
      }
    }
  }

  private _goblin(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const walk = e.animFrame;
    const cx = x + w / 2;

    // Body — round torso with belt
    g.ellipse(cx, y + h * 0.62, w * 0.38, h * 0.3).fill(0x7A5C30);
    g.ellipse(cx, y + h * 0.62, w * 0.32, h * 0.22).fill(0x8A6C40);
    // Belt
    g.rect(x + w * 0.15, y + h * 0.55, w * 0.7, 3).fill(0x554422);
    g.rect(cx - 2, y + h * 0.545, 4, 4).fill(0xBB9944); // buckle

    // Head — mushroom cap with spots
    g.ellipse(cx, y + h * 0.3, w * 0.55, h * 0.32).fill(0x2A6B18);
    g.ellipse(cx, y + h * 0.26, w * 0.48, h * 0.24).fill(0x3A8B28);
    // Spots on cap
    g.circle(cx - w * 0.2, y + h * 0.18, 3).fill(0x1A5510);
    g.circle(cx + w * 0.15, y + h * 0.22, 2.5).fill(0x1A5510);
    g.circle(cx + w * 0.3, y + h * 0.28, 2).fill(0x1A5510);
    // Cap highlight
    g.ellipse(cx - w * 0.1, y + h * 0.15, w * 0.15, h * 0.08).fill({ color: 0xFFFFFF, alpha: 0.1 });

    // Face plate
    g.ellipse(cx, y + h * 0.4, w * 0.32, h * 0.16).fill(0xDDBB88);
    g.ellipse(cx, y + h * 0.38, w * 0.28, h * 0.1).fill(0xEECC99);
    // Eyes — larger, angrier
    const ex1 = x + w * 0.34, ex2 = x + w * 0.56, ey = y + h * 0.37;
    g.ellipse(ex1, ey, 3.5, 3).fill(0xFFFFFF);
    g.ellipse(ex2, ey, 3.5, 3).fill(0xFFFFFF);
    g.circle(ex1 + e.facing * 1.2, ey + 0.5, 1.8).fill(0x111111);
    g.circle(ex2 + e.facing * 1.2, ey + 0.5, 1.8).fill(0x111111);
    // Angry brow ridges (angled)
    g.moveTo(ex1 - 4, ey - 3).lineTo(ex1 + 4, ey - 5).lineTo(ex1 + 4, ey - 3.5).lineTo(ex1 - 4, ey - 1.5).fill(0x2A5518);
    g.moveTo(ex2 - 4, ey - 5).lineTo(ex2 + 4, ey - 3).lineTo(ex2 + 4, ey - 1.5).lineTo(ex2 - 4, ey - 3.5).fill(0x2A5518);
    // Mouth with teeth
    g.rect(cx - 4, y + h * 0.44, 8, 3).fill(0x220000);
    g.moveTo(cx - 3, y + h * 0.44).lineTo(cx - 2, y + h * 0.44 + 2).lineTo(cx - 1, y + h * 0.44).fill(0xEEDDCC);
    g.moveTo(cx + 1, y + h * 0.44).lineTo(cx + 2, y + h * 0.44 + 2).lineTo(cx + 3, y + h * 0.44).fill(0xEEDDCC);
    // Ears (pointy)
    g.moveTo(x + w * 0.12, y + h * 0.32).lineTo(x + w * 0.02, y + h * 0.22).lineTo(x + w * 0.18, y + h * 0.28).fill(0x3A8B28);
    g.moveTo(x + w * 0.88, y + h * 0.32).lineTo(x + w * 0.98, y + h * 0.22).lineTo(x + w * 0.82, y + h * 0.28).fill(0x3A8B28);

    // Arms
    const armWalk = walk % 2 === 0 ? 0 : 2;
    g.rect(x + w * 0.05, y + h * 0.5 - armWalk, w * 0.12, h * 0.2 + armWalk).fill(0x7A5C30);
    g.rect(x + w * 0.83, y + h * 0.5 + armWalk, w * 0.12, h * 0.2 - armWalk).fill(0x7A5C30);
    // Clawed hands
    g.moveTo(x + w * 0.02, y + h * 0.7).lineTo(x + w * 0.06, y + h * 0.66).lineTo(x + w * 0.1, y + h * 0.7).fill(0xDDBB88);
    g.moveTo(x + w * 0.9, y + h * 0.7).lineTo(x + w * 0.94, y + h * 0.66).lineTo(x + w * 0.98, y + h * 0.7).fill(0xDDBB88);

    // Feet with toes
    const fo = walk % 2 === 0 ? 0 : 3;
    g.roundRect(x + w * 0.12, y + h - 7 - fo, w * 0.3, 7 + fo, 2).fill(0x5A3C10);
    g.roundRect(x + w * 0.58, y + h - 7 + fo, w * 0.3, 7 - fo, 2).fill(0x5A3C10);
    // Toes
    for (let t = 0; t < 2; t++) {
      g.circle(x + w * 0.14 + t * w * 0.12, y + h - 1 - fo, 2).fill(0x4A2C08);
      g.circle(x + w * 0.6 + t * w * 0.12, y + h - 1 + fo, 2).fill(0x4A2C08);
    }
  }

  private _darkKnight(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const cx = x + w / 2;
    if (e.isShell) {
      // Shell — multi-layered with scale pattern
      g.ellipse(cx, y + h / 2, w * 0.5, h * 0.46).fill(0x222233);
      g.ellipse(cx, y + h / 2, w * 0.44, h * 0.4).fill(0x2A2A3C);
      // Scale rows
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const sx = cx - w * 0.25 + col * w * 0.2;
          const sy = y + h * 0.25 + row * h * 0.18;
          g.ellipse(sx, sy, w * 0.1, h * 0.07).fill(0x3A3A55);
          g.ellipse(sx, sy - h * 0.02, w * 0.08, h * 0.04).fill(0x4A4A66);
        }
      }
      // Edge highlight
      g.ellipse(cx - w * 0.15, y + h * 0.28, w * 0.15, h * 0.1).fill({ color: 0xFFFFFF, alpha: 0.08 });
      if (e.shellMoving) {
        const spin = Date.now() / 40;
        for (let i = 0; i < 3; i++) {
          const a = 0.3 + Math.sin(spin + i * 2) * 0.2;
          g.rect(x + w * 0.1, y + h * 0.35 + i * h * 0.1, w * 0.8, 1).fill({ color: 0x8888AA, alpha: a });
        }
      }
      return;
    }
    // Full dark knight
    const walk = e.animFrame;
    const f = e.facing;
    // Shell (back) — layered
    g.ellipse(cx, y + h * 0.52, w * 0.5, h * 0.4).fill(0x1A1A2C);
    g.ellipse(cx, y + h * 0.5, w * 0.44, h * 0.33).fill(0x2A2A3C);
    g.ellipse(cx, y + h * 0.48, w * 0.36, h * 0.24).fill(0x3A3A55);
    // Shell ridge spikes
    for (let i = 0; i < 3; i++) {
      const spX = cx - w * 0.15 + i * w * 0.15;
      g.moveTo(spX, y + h * 0.22).lineTo(spX + w * 0.04, y + h * 0.14).lineTo(spX + w * 0.08, y + h * 0.22).fill(0x3A3A55);
    }
    // Body
    g.roundRect(x + w * 0.18, y + h * 0.3, w * 0.64, h * 0.42, 3).fill(0x2A5A2A);
    g.roundRect(x + w * 0.22, y + h * 0.32, w * 0.56, h * 0.3, 2).fill(0x337733);
    // Head
    const headOff = f > 0 ? w * 0.55 : w * 0.08;
    const headCx = x + headOff + w * 0.18;
    const headCy = y + h * 0.2;
    const headR = w * 0.22;
    g.circle(headCx, headCy, headR).fill(0x338833);
    g.circle(headCx, headCy, headR * 0.85).fill(0x44AA44);
    // Eye with slit pupil
    g.circle(headCx + f * 3, headCy - 1, 4).fill(0xFFFF88);
    g.ellipse(headCx + f * 3.5, headCy - 1, 1, 3).fill(0x000000);
    // Mouth
    g.rect(headCx - headR * 0.4, headCy + headR * 0.45, headR * 0.8, 2).fill(0x225522);
    // Helmet horn
    g.moveTo(headCx, headCy - headR).lineTo(headCx + f * 6, headCy - headR - 8)
      .lineTo(headCx + f * 2, headCy - headR + 2).fill(0x555566);

    // Arms with gauntlets
    const armX1 = f > 0 ? x + w * 0.05 : x + w * 0.75;
    const armX2 = f > 0 ? x + w * 0.75 : x + w * 0.05;
    g.rect(armX1, y + h * 0.38, w * 0.15, h * 0.3).fill(0x337733);
    g.rect(armX2, y + h * 0.38 + (walk % 2 === 0 ? 0 : 3), w * 0.15, h * 0.25).fill(0x337733);
    // Gauntlet spikes
    g.moveTo(armX2, y + h * 0.38).lineTo(armX2 + w * 0.07, y + h * 0.34).lineTo(armX2 + w * 0.14, y + h * 0.38).fill(0x555566);

    // Legs — armored
    const fo = walk % 2 === 0 ? 0 : 3;
    g.roundRect(x + w * 0.18, y + h - 8 - fo, w * 0.26, 8 + fo, 2).fill(0x226622);
    g.roundRect(x + w * 0.56, y + h - 8 + fo, w * 0.26, 8 - fo, 2).fill(0x226622);
    // Knee pads
    g.circle(x + w * 0.3, y + h * 0.78 - fo, 3).fill(0x555566);
    g.circle(x + w * 0.68, y + h * 0.78 + fo, 3).fill(0x555566);
    // Clawed feet
    for (let t = 0; t < 2; t++) {
      g.moveTo(x + w * 0.15 + t * w * 0.1, y + h - fo).lineTo(x + w * 0.2 + t * w * 0.1, y + h + 2 - fo)
        .lineTo(x + w * 0.25 + t * w * 0.1, y + h - fo).fill(0x226622);
      g.moveTo(x + w * 0.53 + t * w * 0.1, y + h + fo).lineTo(x + w * 0.58 + t * w * 0.1, y + h + 2 + fo)
        .lineTo(x + w * 0.63 + t * w * 0.1, y + h + fo).fill(0x226622);
    }
  }

  private _skeleton(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const cx = x + w / 2;
    const f = e.facing;

    // Spine — individual vertebrae
    for (let i = 0; i < 5; i++) {
      const vy = y + h * 0.3 + i * h * 0.09;
      g.roundRect(cx - 3, vy, 6, h * 0.06, 1).fill(0xCCCCBB);
      g.rect(cx - 1, vy, 2, h * 0.08).fill(0xBBBBAA);
    }
    // Ribcage — individual curved ribs
    for (let i = 0; i < 4; i++) {
      const ry = y + h * 0.32 + i * h * 0.08;
      const ribW = w * (0.28 - i * 0.02);
      // Left rib
      g.moveTo(cx - 2, ry).lineTo(cx - ribW, ry + 1).lineTo(cx - ribW, ry + 3)
        .lineTo(cx - 2, ry + 2).fill(0xDDDDCC);
      // Right rib
      g.moveTo(cx + 2, ry).lineTo(cx + ribW, ry + 1).lineTo(cx + ribW, ry + 3)
        .lineTo(cx + 2, ry + 2).fill(0xDDDDCC);
    }
    // Pelvis
    g.moveTo(cx - w * 0.2, y + h * 0.68).lineTo(cx, y + h * 0.62).lineTo(cx + w * 0.2, y + h * 0.68)
      .lineTo(cx, y + h * 0.72).fill(0xCCCCBB);

    // Skull — rounded with jaw
    g.circle(cx, y + h * 0.14, w * 0.28).fill(0xEEEEDD);
    g.circle(cx, y + h * 0.11, w * 0.26).fill(0xFFFFEE);
    // Cranium highlight
    g.ellipse(cx - w * 0.08, y + h * 0.06, w * 0.1, h * 0.04).fill({ color: 0xFFFFFF, alpha: 0.15 });
    // Eye sockets — deep set
    g.circle(x + w * 0.37, y + h * 0.13, 4).fill(0x111100);
    g.circle(x + w * 0.63, y + h * 0.13, 4).fill(0x111100);
    g.circle(x + w * 0.37, y + h * 0.13, 2).fill(0xFF2200);
    g.circle(x + w * 0.63, y + h * 0.13, 2).fill(0xFF2200);
    // Glow around eyes
    g.circle(x + w * 0.37, y + h * 0.13, 5).fill({ color: 0xFF4400, alpha: 0.15 });
    g.circle(x + w * 0.63, y + h * 0.13, 5).fill({ color: 0xFF4400, alpha: 0.15 });
    // Nose hole
    g.moveTo(cx - 2, y + h * 0.18).lineTo(cx, y + h * 0.16).lineTo(cx + 2, y + h * 0.18).fill(0x444433);
    // Jaw — separate with teeth
    g.moveTo(cx - w * 0.18, y + h * 0.22).lineTo(cx - w * 0.2, y + h * 0.26)
      .lineTo(cx, y + h * 0.28).lineTo(cx + w * 0.2, y + h * 0.26)
      .lineTo(cx + w * 0.18, y + h * 0.22).fill(0xDDDDCC);
    // Teeth
    for (let t = -2; t <= 2; t++) {
      g.rect(cx + t * 3 - 1, y + h * 0.21, 2, 3).fill(0xFFFFEE);
    }

    // Arm bones — upper + lower with joints
    const bowSide = f > 0 ? 1 : -1;
    // Near arm (holding bow)
    const nax = cx + bowSide * w * 0.2;
    g.rect(nax, y + h * 0.3, 3, h * 0.2).fill(0xCCCCBB);
    g.circle(nax + 1.5, y + h * 0.5, 2).fill(0xDDDDCC); // elbow joint
    g.rect(nax + bowSide * 3, y + h * 0.5, 3, h * 0.18).fill(0xCCCCBB);
    // Far arm
    g.rect(cx - bowSide * w * 0.2, y + h * 0.32, 3, h * 0.18).fill(0xBBBBAA);
    g.circle(cx - bowSide * w * 0.2 + 1.5, y + h * 0.5, 2).fill(0xCCCCBB);
    // Bony hand
    g.moveTo(nax + bowSide * 5, y + h * 0.66).lineTo(nax + bowSide * 7, y + h * 0.62)
      .lineTo(nax + bowSide * 8, y + h * 0.66).fill(0xDDDDCC);

    // Bow — proper curved with string and arrow
    const bowX = cx + bowSide * w * 0.42;
    const bowTop = y + h * 0.15;
    const bowBot = y + h * 0.65;
    const bowMid = (bowTop + bowBot) / 2;
    const bowCurve = bowSide * 8;
    g.moveTo(bowX, bowTop).lineTo(bowX + bowCurve, bowMid).lineTo(bowX, bowBot).stroke({ color: 0x8B5A2B, width: 3 });
    // Bowstring
    g.moveTo(bowX, bowTop).lineTo(bowX - bowSide * 4, bowMid).lineTo(bowX, bowBot).stroke({ color: 0x888888, width: 1 });
    // Arrow nocked
    g.rect(bowX - bowSide * 4 - 8, bowMid - 0.5, 16, 1.5).fill(0x8B6914);
    g.moveTo(bowX - bowSide * 4 - 8, bowMid).lineTo(bowX - bowSide * 4 - 12, bowMid - 2)
      .lineTo(bowX - bowSide * 4 - 12, bowMid + 2).fill(0x888888); // arrowhead

    // Leg bones with joints
    g.rect(x + w * 0.28, y + h * 0.72, 3, h * 0.14).fill(0xCCCCBB);
    g.circle(x + w * 0.295, y + h * 0.86, 2).fill(0xDDDDCC);
    g.rect(x + w * 0.28, y + h * 0.87, 3, h * 0.1).fill(0xCCCCBB);
    g.rect(x + w * 0.62, y + h * 0.72, 3, h * 0.14).fill(0xCCCCBB);
    g.circle(x + w * 0.635, y + h * 0.86, 2).fill(0xDDDDCC);
    g.rect(x + w * 0.62, y + h * 0.87, 3, h * 0.1).fill(0xCCCCBB);
    // Feet bones
    g.moveTo(x + w * 0.22, y + h).lineTo(x + w * 0.295, y + h - 3).lineTo(x + w * 0.36, y + h).fill(0xBBBBAA);
    g.moveTo(x + w * 0.56, y + h).lineTo(x + w * 0.635, y + h - 3).lineTo(x + w * 0.7, y + h).fill(0xBBBBAA);
  }

  private _dragon(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const f = e.facing;
    const cx = x + w / 2;
    const breathe = Math.sin(Date.now() / 400) * 0.05;
    const t = Date.now();

    // Tail — segmented with spade tip
    const tailBase = f > 0 ? x : x + w * 0.85;
    const tailDir = -f;
    g.moveTo(tailBase, y + h * 0.6)
      .lineTo(tailBase + tailDir * w * 0.12, y + h * 0.52)
      .lineTo(tailBase + tailDir * w * 0.22, y + h * 0.48 + Math.sin(t / 300) * 3)
      .lineTo(tailBase + tailDir * w * 0.3, y + h * 0.52 + Math.sin(t / 250) * 4)
      .lineTo(tailBase + tailDir * w * 0.25, y + h * 0.58)
      .lineTo(tailBase + tailDir * w * 0.15, y + h * 0.65)
      .fill(0xBB1100);
    // Tail spade
    const spadeX = tailBase + tailDir * w * 0.3;
    const spadeY = y + h * 0.5 + Math.sin(t / 250) * 4;
    g.moveTo(spadeX, spadeY).lineTo(spadeX + tailDir * w * 0.08, spadeY - 5)
      .lineTo(spadeX + tailDir * w * 0.12, spadeY).lineTo(spadeX + tailDir * w * 0.08, spadeY + 5).fill(0x991100);
    // Tail spines
    for (let i = 0; i < 3; i++) {
      const sx = tailBase + tailDir * w * (0.05 + i * 0.08);
      const sy = y + h * 0.53 + Math.sin(t / 280 + i) * 2;
      g.moveTo(sx, sy).lineTo(sx + tailDir * 2, sy - 4).lineTo(sx + tailDir * 4, sy).fill(0x881100);
    }

    // Body — thick muscular torso
    g.ellipse(cx, y + h * 0.6, w * 0.46, h * (0.39 + breathe)).fill(0xCC1100);
    g.ellipse(cx, y + h * 0.6, w * 0.42, h * (0.35 + breathe)).fill(0xDD2200);
    // Belly with scale rows
    g.ellipse(cx - w * 0.02, y + h * 0.65, w * 0.26, h * 0.3).fill(0xFF9922);
    for (let i = 0; i < 4; i++) {
      const scY = y + h * 0.52 + i * h * 0.08;
      g.ellipse(cx - w * 0.02, scY, w * 0.22 - i * w * 0.02, h * 0.03).fill(0xFFAA44);
    }
    // Dorsal spines
    for (let i = 0; i < 5; i++) {
      const spX = cx - w * 0.15 + i * w * 0.08;
      const spH = 5 + (i === 2 ? 4 : i === 1 || i === 3 ? 2 : 0);
      g.moveTo(spX, y + h * 0.25).lineTo(spX + w * 0.02, y + h * 0.25 - spH)
        .lineTo(spX + w * 0.04, y + h * 0.25).fill(0x991100);
    }

    // Legs — thick with claws
    const legW = w * 0.14;
    const legH = h * 0.2;
    g.roundRect(x + w * 0.12, y + h * 0.8, legW, legH, 3).fill(0xAA0000);
    g.roundRect(x + w * 0.58, y + h * 0.8, legW, legH, 3).fill(0xAA0000);
    // Muscle highlight
    g.ellipse(x + w * 0.19, y + h * 0.84, legW * 0.3, legH * 0.25).fill({ color: 0xDD3322, alpha: 0.5 });
    g.ellipse(x + w * 0.65, y + h * 0.84, legW * 0.3, legH * 0.25).fill({ color: 0xDD3322, alpha: 0.5 });
    // Claws — 3 toes per foot
    for (let foot = 0; foot < 2; foot++) {
      const footX = foot === 0 ? x + w * 0.1 : x + w * 0.56;
      for (let toe = 0; toe < 3; toe++) {
        const tx = footX + toe * (legW * 0.35);
        g.moveTo(tx, y + h).lineTo(tx + legW * 0.12, y + h + 4).lineTo(tx + legW * 0.24, y + h).fill(0x662200);
        g.moveTo(tx + legW * 0.08, y + h + 4).lineTo(tx + legW * 0.12, y + h + 6)
          .lineTo(tx + legW * 0.16, y + h + 4).fill(0x444444); // talon
      }
    }

    // Wings — multi-segment membrane
    const wingFlap = Math.sin(t / 280) * 10;
    const wingFlap2 = Math.sin(t / 280 + 0.5) * 6;
    for (let side = -1; side <= 1; side += 2) {
      const wbx = cx + side * w * 0.2;
      const wby = y + h * 0.28;
      const tipX = cx + side * w * 0.65;
      const tipY = y + h * 0.02 + wingFlap;
      const midX = cx + side * w * 0.45;
      const midY = y + h * 0.1 + wingFlap2;
      // Wing arm bone
      g.moveTo(wbx, wby).lineTo(midX, midY).lineTo(midX + side * 3, midY + 4)
        .lineTo(wbx + side * 3, wby + 3).fill(0xAA0000);
      // Outer wing bone
      g.moveTo(midX, midY).lineTo(tipX, tipY).lineTo(tipX + side * 2, tipY + 3)
        .lineTo(midX + side * 2, midY + 3).fill(0x990000);
      // Membrane panels
      g.moveTo(wbx, wby + 5).lineTo(midX, midY + 3).lineTo(midX - side * w * 0.05, wby + h * 0.1)
        .fill({ color: 0xFF4400, alpha: 0.3 });
      g.moveTo(midX, midY + 3).lineTo(tipX, tipY + 3).lineTo(midX + side * w * 0.05, wby + h * 0.15)
        .fill({ color: 0xFF3300, alpha: 0.25 });
      // Wing finger bones
      g.moveTo(midX, midY).lineTo(cx + side * w * 0.35, wby + h * 0.05 + wingFlap * 0.6)
        .lineTo(cx + side * w * 0.36, wby + h * 0.07 + wingFlap * 0.6).lineTo(midX + side * 1, midY + 1).fill(0x880000);
    }

    // Neck — thick S-curve
    const headX = f > 0 ? x + w * 0.72 : x + w * 0.02;
    const headY = y + h * 0.04;
    const headW = w * 0.38;
    const headH = h * 0.28;
    const neckMidX = cx + f * w * 0.15;
    g.moveTo(cx - w * 0.05, y + h * 0.3).lineTo(neckMidX - w * 0.06, y + h * 0.18)
      .lineTo(headX + headW * 0.4, headY + headH).lineTo(headX + headW * 0.6, headY + headH)
      .lineTo(neckMidX + w * 0.06, y + h * 0.2).lineTo(cx + w * 0.05, y + h * 0.32).fill(0xCC1100);
    // Neck spines
    for (let i = 0; i < 3; i++) {
      const nx = cx + f * w * (0.05 + i * 0.08);
      const ny = y + h * (0.28 - i * 0.04);
      g.moveTo(nx - 2, ny).lineTo(nx, ny - 5).lineTo(nx + 2, ny).fill(0x991100);
    }

    // Head — elongated with snout
    g.ellipse(headX + headW / 2, headY + headH * 0.45, headW / 2, headH * 0.45).fill(0xCC1100);
    // Snout — elongated
    const snoutX = headX + (f > 0 ? headW * 0.65 : headW * 0.05);
    g.ellipse(snoutX + f * headW * 0.12, headY + headH * 0.5, headW * 0.3, headH * 0.22).fill(0xBB0800);
    // Nostrils
    g.circle(snoutX + f * headW * 0.3, headY + headH * 0.42, 2).fill(0x220000);
    g.circle(snoutX + f * headW * 0.25, headY + headH * 0.48, 2).fill(0x220000);
    // Smoke / fire breath telegraph
    if (e.attackTimer < 0.8) {
      const smokeA = 1 - e.attackTimer / 0.8;
      for (let i = 0; i < 4; i++) {
        const smX = snoutX + f * (headW * 0.35 + i * 6);
        const smY = headY + headH * 0.45 + Math.sin(t / 100 + i) * 3;
        const smR = 3 + i * 2;
        g.circle(smX, smY, smR).fill({ color: i < 2 ? 0xFF6600 : 0x666666, alpha: smokeA * (0.4 - i * 0.08) });
      }
    }
    // Jaw with teeth
    g.moveTo(snoutX - f * headW * 0.05, headY + headH * 0.6)
      .lineTo(snoutX + f * headW * 0.35, headY + headH * 0.65)
      .lineTo(snoutX + f * headW * 0.3, headY + headH * 0.75)
      .lineTo(snoutX - f * headW * 0.1, headY + headH * 0.7).fill(0xAA0800);
    // Teeth — serrated
    for (let tooth = 0; tooth < 4; tooth++) {
      const tx = snoutX + f * headW * (0.05 + tooth * 0.08);
      g.moveTo(tx, headY + headH * 0.58).lineTo(tx + f * 2, headY + headH * 0.65)
        .lineTo(tx + f * 4, headY + headH * 0.58).fill(0xFFFFDD);
    }
    // Eye — reptilian slit
    const eyeX = headX + (f > 0 ? headW * 0.5 : headW * 0.35);
    const eyeY = headY + headH * 0.3;
    g.ellipse(eyeX, eyeY, 5, 4).fill(0xFFFF00);
    g.ellipse(eyeX, eyeY, 4, 3.5).fill(0xFFEE00);
    g.ellipse(eyeX, eyeY, 1.2, 3.5).fill(0x000000); // slit pupil
    g.circle(eyeX - 1.5, eyeY - 1, 1).fill({ color: 0xFFFFFF, alpha: 0.3 }); // specular
    // Brow ridge
    g.moveTo(eyeX - 6, eyeY - 4).lineTo(eyeX, eyeY - 6).lineTo(eyeX + 6, eyeY - 3)
      .lineTo(eyeX + 5, eyeY - 2).lineTo(eyeX, eyeY - 4.5).lineTo(eyeX - 5, eyeY - 2.5).fill(0xAA1100);
    // Horns — curved and ridged
    for (let horn = 0; horn < 2; horn++) {
      const hx = headX + headW * (0.3 + horn * 0.3);
      const hy = headY + headH * 0.1;
      const hDir = horn === 0 ? -1 : 1;
      g.moveTo(hx - 3, hy).lineTo(hx + hDir * 4, hy - h * 0.1)
        .lineTo(hx + hDir * 6, hy - h * 0.16).lineTo(hx + hDir * 5, hy - h * 0.15)
        .lineTo(hx + hDir * 3, hy - h * 0.08).lineTo(hx + 3, hy).fill(0x553311);
      g.moveTo(hx, hy + 1).lineTo(hx + hDir * 3, hy - h * 0.06)
        .lineTo(hx + hDir * 2.5, hy - h * 0.05).lineTo(hx - 0.5, hy + 1).fill(0x664422);
    }
    // Ear frills
    g.moveTo(headX + headW * 0.15, headY + headH * 0.15)
      .lineTo(headX + headW * 0.05, headY - 3).lineTo(headX + headW * 0.1, headY + headH * 0.1)
      .fill({ color: 0xFF4400, alpha: 0.4 });
    g.moveTo(headX + headW * 0.8, headY + headH * 0.15)
      .lineTo(headX + headW * 0.9, headY - 3).lineTo(headX + headW * 0.85, headY + headH * 0.1)
      .fill({ color: 0xFF4400, alpha: 0.4 });

    // HP bar — ornate
    const barW = w * 0.9;
    const barH = 7;
    const barX = x + w * 0.05;
    const barY = y - 16;
    g.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 3).fill(0x000000);
    g.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2).fill(0x331111);
    g.roundRect(barX, barY, barW, barH, 1).fill(0x441111);
    const hpRatio = Math.max(0, e.hp / DRAGON_HP);
    const hpColor = hpRatio > 0.5 ? 0xCC0000 : hpRatio > 0.25 ? 0xFF4400 : 0xFF0000;
    if (hpRatio > 0) {
      g.roundRect(barX, barY, barW * hpRatio, barH, 1).fill(hpColor);
      g.rect(barX + 1, barY + 1, barW * hpRatio - 2, 2).fill({ color: 0xFFFFFF, alpha: 0.2 });
      // Pulse when low
      if (hpRatio < 0.3) {
        g.roundRect(barX, barY, barW * hpRatio, barH, 1)
          .fill({ color: 0xFF0000, alpha: Math.sin(t / 100) * 0.15 });
      }
    }
    // Boss label
    g.rect(barX + barW * 0.3, barY - 10, barW * 0.4, 9).fill({ color: 0x000000, alpha: 0.6 });
  }

  private _bat(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const now = Date.now();
    const flap = Math.sin(now / 100 + e.x) * 8;
    const flap2 = Math.sin(now / 100 + e.x + 0.5) * 5;
    const cx = x + w / 2, cy = y + h / 2;

    // Swoop aura
    if (e.swooping) {
      g.circle(cx, cy, w * 0.55).fill({ color: 0xFF0000, alpha: 0.06 });
      g.circle(cx, cy, w * 0.4).fill({ color: 0xFF2200, alpha: 0.08 });
    }

    // Wings — multi-segment with finger bones and membranes
    for (const side of [-1, 1]) {
      const wingBase = cx + side * w * 0.18;
      // Upper arm bone
      const elbowX = cx + side * w * 0.38;
      const elbowY = cy - h * 0.15 + flap * 0.4;
      // Wing tip
      const tipX = cx + side * w * 0.6;
      const tipY = cy - h * 0.35 + flap;
      // Mid finger
      const midX = cx + side * w * 0.5;
      const midY = cy - h * 0.1 + flap2 * 0.6;
      // Lower finger
      const lowX = cx + side * w * 0.42;
      const lowY = cy + h * 0.15 + flap * 0.2;

      // Membrane panels (3 sections)
      g.moveTo(wingBase, cy - h * 0.1).lineTo(elbowX, elbowY).lineTo(tipX, tipY)
        .lineTo(midX, midY).lineTo(wingBase, cy + h * 0.05).fill(0x2A1A3A);
      g.moveTo(wingBase, cy + h * 0.05).lineTo(midX, midY).lineTo(lowX, lowY)
        .lineTo(wingBase, cy + h * 0.15).fill({ color: 0x3A2A4A, alpha: 0.8 });
      // Translucent inner membrane
      g.moveTo(wingBase, cy - h * 0.05).lineTo(elbowX, elbowY + 3).lineTo(midX, midY + 2)
        .lineTo(wingBase, cy + h * 0.1).fill({ color: 0x553366, alpha: 0.3 });
      // Finger bones
      g.moveTo(wingBase, cy - h * 0.08).lineTo(tipX, tipY).stroke({ color: 0x554466, width: 1.5 });
      g.moveTo(elbowX, elbowY).lineTo(midX, midY).stroke({ color: 0x554466, width: 1.2 });
      g.moveTo(elbowX - side * 2, elbowY + 3).lineTo(lowX, lowY).stroke({ color: 0x554466, width: 1 });
      // Wing claw at tip
      g.moveTo(tipX, tipY).lineTo(tipX + side * 3, tipY - 3).lineTo(tipX + side * 1, tipY + 1).fill(0x332244);
    }

    // Body — furry with texture
    g.ellipse(cx, cy, w * 0.22, h * 0.28).fill(0x3A2A4A);
    g.ellipse(cx, cy - h * 0.03, w * 0.18, h * 0.22).fill(0x4A3A5A);
    // Fur tufts on chest
    g.ellipse(cx, cy + h * 0.08, w * 0.12, h * 0.1).fill(0x5A4A6A);
    // Belly highlight
    g.ellipse(cx, cy + h * 0.02, w * 0.1, h * 0.12).fill({ color: 0x6A5A7A, alpha: 0.5 });

    // Head
    g.circle(cx, cy - h * 0.2, w * 0.14).fill(0x3A2A4A);
    g.circle(cx, cy - h * 0.22, w * 0.12).fill(0x4A3A5A);
    // Snout
    g.ellipse(cx, cy - h * 0.12, w * 0.08, h * 0.06).fill(0x5A4A6A);
    // Nose
    g.circle(cx, cy - h * 0.1, 2).fill(0x221133);

    // Ears — large, pointed with inner fold
    for (const side of [-1, 1]) {
      const earX = cx + side * w * 0.1;
      const earY = cy - h * 0.28;
      g.moveTo(earX - side * 2, earY + h * 0.06).lineTo(earX + side * 1, earY - h * 0.2)
        .lineTo(earX + side * 4, earY + h * 0.04).fill(0x3A2A4A);
      // Inner ear
      g.moveTo(earX - side * 1, earY + h * 0.04).lineTo(earX + side * 1, earY - h * 0.12)
        .lineTo(earX + side * 3, earY + h * 0.02).fill(0x664466);
    }

    // Eyes — large, glowing
    for (const side of [-1, 1]) {
      const ex = cx + side * w * 0.07;
      const ey = cy - h * 0.2;
      g.ellipse(ex, ey, 3.5, 3).fill(0xFF3333);
      g.ellipse(ex, ey, 2.5, 2.2).fill(0xFF5555);
      g.circle(ex + side * 0.5, ey - 0.5, 1.2).fill(0xFFAAAA);
      // Glow
      g.circle(ex, ey, 5).fill({ color: 0xFF2222, alpha: 0.08 });
    }

    // Mouth with multiple fangs
    g.rect(cx - 3, cy - h * 0.08, 6, 2).fill(0x220011);
    for (let fi = -1; fi <= 1; fi += 2) {
      g.moveTo(cx + fi * 1, cy - h * 0.07).lineTo(cx + fi * 0.5, cy - h * 0.02).lineTo(cx + fi * 2, cy - h * 0.07).fill(0xFFFFEE);
    }

    // Feet (small claws tucked under body)
    for (const side of [-1, 1]) {
      const fx = cx + side * w * 0.08;
      g.moveTo(fx - 2, cy + h * 0.25).lineTo(fx, cy + h * 0.32).lineTo(fx + 2, cy + h * 0.25).fill(0x332244);
    }
  }

  private _boar(g: Graphics, x: number, y: number, w: number, h: number, e: Enemy, ts: number): void {
    const f = e.facing;
    const cx = x + w / 2;
    const charging = e.charging;
    const now = Date.now();

    // Charge effects
    if (charging) {
      g.ellipse(cx, y + h * 0.55, w * 0.5, h * 0.45).fill({ color: 0xFF0000, alpha: 0.06 });
      // Speed lines behind
      for (let sl = 0; sl < 3; sl++) {
        const slx = x + (f > 0 ? -sl * 5 : w + sl * 5);
        const sly = y + h * 0.3 + sl * h * 0.15;
        g.rect(slx, sly, f > 0 ? -8 - sl * 3 : 8 + sl * 3, 1.5).fill({ color: 0xBBAA88, alpha: 0.2 - sl * 0.05 });
      }
    }

    // Body — muscular with layered fur
    g.ellipse(cx, y + h * 0.55, w * 0.46, h * 0.4).fill(0x6A4523);
    g.ellipse(cx, y + h * 0.53, w * 0.42, h * 0.35).fill(0x7A5533);
    g.ellipse(cx, y + h * 0.5, w * 0.36, h * 0.28).fill(0x8A6543);
    // Belly
    g.ellipse(cx + f * w * 0.05, y + h * 0.6, w * 0.25, h * 0.18).fill(0x9A7553);
    // Shoulder muscle
    g.ellipse(cx - f * w * 0.15, y + h * 0.42, w * 0.18, h * 0.2).fill({ color: 0x6A4523, alpha: 0.5 });

    // Mane/bristles — tall spiky ridge along back
    for (let i = 0; i < 7; i++) {
      const bx = cx - w * 0.22 + i * w * 0.07;
      const bh = 3 + (i === 3 ? 4 : i === 2 || i === 4 ? 3 : i === 1 || i === 5 ? 2 : 0);
      g.moveTo(bx, y + h * 0.2).lineTo(bx + 1.5, y + h * 0.2 - bh)
        .lineTo(bx + 3, y + h * 0.2).fill(0x443311);
      g.moveTo(bx + 0.5, y + h * 0.2).lineTo(bx + 1.5, y + h * 0.2 - bh + 1)
        .lineTo(bx + 2.5, y + h * 0.2).fill(0x554422);
    }

    // Head — detailed with jaw
    const headCx = f > 0 ? x + w * 0.72 : x + w * 0.28;
    const headCy = y + h * 0.4;
    g.ellipse(headCx, headCy, w * 0.2, h * 0.23).fill(0x7A5533);
    g.ellipse(headCx + f * w * 0.05, headCy, w * 0.17, h * 0.2).fill(0x8A6543);
    // Jaw
    g.ellipse(headCx + f * w * 0.08, headCy + h * 0.08, w * 0.12, h * 0.1).fill(0x7A5533);
    // Snout — protruding with flat end
    const snoutX = headCx + f * w * 0.2;
    const snoutY = headCy + h * 0.02;
    g.ellipse(snoutX, snoutY, w * 0.1, h * 0.1).fill(0x996655);
    g.ellipse(snoutX + f * w * 0.03, snoutY, w * 0.08, h * 0.08).fill(0xAA7766);
    // Nostrils
    g.circle(snoutX + f * 2 - 2, snoutY - 1, 2).fill(0x443322);
    g.circle(snoutX + f * 2 + 2, snoutY - 1, 2).fill(0x443322);

    // Tusks — curved ivory
    for (const tSide of [-1, 1]) {
      const tBase = snoutX + tSide * 3;
      g.moveTo(tBase, snoutY - 2)
        .lineTo(tBase + tSide * 2, snoutY - h * 0.15)
        .lineTo(tBase + tSide * 3, snoutY - h * 0.18)
        .lineTo(tBase + tSide * 2.5, snoutY - h * 0.12)
        .lineTo(tBase + tSide * 1, snoutY - 1).fill(0xFFFFDD);
      // Tusk highlight
      g.moveTo(tBase + tSide * 1.5, snoutY - h * 0.08)
        .lineTo(tBase + tSide * 2.5, snoutY - h * 0.15)
        .lineTo(tBase + tSide * 2, snoutY - h * 0.12).fill(0xFFFFFF);
    }

    // Eye — detailed with brow
    const eyeX = headCx + f * w * 0.06;
    const eyeY = headCy - h * 0.06;
    g.circle(eyeX, eyeY, 3).fill(0xFFFFFF);
    g.circle(eyeX + f * 0.8, eyeY, 1.8).fill(charging ? 0xFF0000 : 0x332211);
    if (charging) g.circle(eyeX + f * 0.8, eyeY, 1).fill(0xFF6644);
    // Brow ridge
    g.moveTo(eyeX - 4, eyeY - 3 + (charging ? -1 : 0)).lineTo(eyeX + 4, eyeY - 2 + (charging ? 1 : 0))
      .lineTo(eyeX + 4, eyeY - 1).lineTo(eyeX - 4, eyeY - 2).fill(0x5A3C10);
    // Ear (small, back of head)
    g.moveTo(headCx - f * w * 0.1, headCy - h * 0.15)
      .lineTo(headCx - f * w * 0.12, headCy - h * 0.25)
      .lineTo(headCx - f * w * 0.06, headCy - h * 0.15).fill(0x7A5533);

    // Legs — muscular with joints
    const fo = e.animFrame % 2 === 0 ? 0 : (charging ? 5 : 2);
    const legs: [number, number][] = [
      [x + w * 0.15, -fo], [x + w * 0.32, fo],
      [x + w * 0.55, -fo * 0.6], [x + w * 0.72, fo * 0.6],
    ];
    for (const [lx, lo] of legs) {
      const ly = y + h - 8 - lo;
      const lh = 8 + lo;
      // Upper leg
      g.roundRect(lx, ly, w * 0.13, lh * 0.55, 2).fill(0x6A4523);
      // Lower leg
      g.roundRect(lx + 1, ly + lh * 0.5, w * 0.11, lh * 0.5, 1).fill(0x5A3C10);
      // Joint
      g.circle(lx + w * 0.065, ly + lh * 0.5, 2).fill(0x7A5533);
      // Hoof — split
      g.moveTo(lx - 1, y + h).lineTo(lx + w * 0.05, y + h - 2).lineTo(lx + w * 0.065, y + h).fill(0x333333);
      g.moveTo(lx + w * 0.065, y + h).lineTo(lx + w * 0.09, y + h - 2).lineTo(lx + w * 0.14, y + h).fill(0x333333);
    }

    // Tail — curly
    const tailX = x + (f > 0 ? w * 0.02 : w * 0.88);
    const tw = Math.sin(now / 150 + e.x) * 3;
    g.moveTo(tailX, y + h * 0.3)
      .lineTo(tailX - f * 4 + tw, y + h * 0.22)
      .lineTo(tailX - f * 6 + tw * 1.5, y + h * 0.25)
      .lineTo(tailX - f * 5 + tw, y + h * 0.3)
      .lineTo(tailX - f * 3, y + h * 0.35).fill(0x554422);
    // Tail tuft
    g.circle(tailX - f * 6 + tw * 1.5, y + h * 0.24, 2.5).fill(0x443311);
  }

  // =======================================================================
  // ITEMS — with glow halos
  // =======================================================================

  private _drawItems(s: KingdomState, theme: WorldTheme): void {
    const g = this._entities;
    const ts = s.tileSize;

    for (const item of s.items) {
      if (!item.active) continue;
      const sx = (item.x - s.cameraX) * ts;
      const sy = item.y * ts;
      const w = item.width * ts;
      const h = item.height * ts;
      const cx = sx + w / 2;
      const cy = sy + h / 2;
      const bob = Math.sin(Date.now() / 250 + item.x) * 2;

      switch (item.type) {
        case ItemType.COIN: {
          const stretch = Math.abs(Math.sin(Date.now() / 200 + item.x));
          g.ellipse(cx, cy + bob, w * 0.25 * stretch + 2, h * 0.35).fill(0xFFD700);
          g.ellipse(cx - 1, cy + bob - 1, w * 0.12 * stretch + 1, h * 0.25).fill(0xFFEE66);
          g.circle(cx, cy + bob, w * 0.4).fill({ color: 0xFFFF88, alpha: 0.15 });
          break;
        }
        case ItemType.POTION: {
          // Growth potion — detailed glass bottle
          const by = bob;
          g.circle(cx, cy + by, w * 0.4).fill({ color: 0x44FF44, alpha: 0.12 });
          // Bottle body (rounded)
          g.moveTo(sx + w * 0.2, sy + h * 0.9 + by).lineTo(sx + w * 0.18, sy + h * 0.5 + by)
            .lineTo(sx + w * 0.3, sy + h * 0.35 + by).lineTo(sx + w * 0.7, sy + h * 0.35 + by)
            .lineTo(sx + w * 0.82, sy + h * 0.5 + by).lineTo(sx + w * 0.8, sy + h * 0.9 + by).fill(0x009900);
          // Inner liquid
          g.moveTo(sx + w * 0.24, sy + h * 0.85 + by).lineTo(sx + w * 0.22, sy + h * 0.52 + by)
            .lineTo(sx + w * 0.33, sy + h * 0.4 + by).lineTo(sx + w * 0.67, sy + h * 0.4 + by)
            .lineTo(sx + w * 0.78, sy + h * 0.52 + by).lineTo(sx + w * 0.76, sy + h * 0.85 + by).fill(0x00CC00);
          // Neck
          g.roundRect(sx + w * 0.35, sy + h * 0.12 + by, w * 0.3, h * 0.28, 2).fill(0x00AA00);
          g.roundRect(sx + w * 0.37, sy + h * 0.15 + by, w * 0.26, h * 0.2, 1).fill(0x00BB00);
          // Lip
          g.roundRect(sx + w * 0.32, sy + h * 0.08 + by, w * 0.36, h * 0.06, 2).fill(0x009900);
          // Cork
          g.roundRect(sx + w * 0.34, sy + h * 0.01 + by, w * 0.32, h * 0.1, 3).fill(0x8B6914);
          g.rect(sx + w * 0.36, sy + h * 0.03 + by, w * 0.28, 2).fill(0x9A7824);
          g.rect(sx + w * 0.36, sy + h * 0.07 + by, w * 0.28, 1).fill(0x7A5A10);
          // Glass shine
          g.moveTo(sx + w * 0.28, sy + h * 0.85 + by).lineTo(sx + w * 0.26, sy + h * 0.5 + by)
            .lineTo(sx + w * 0.3, sy + h * 0.42 + by).lineTo(sx + w * 0.32, sy + h * 0.42 + by)
            .lineTo(sx + w * 0.3, sy + h * 0.52 + by).lineTo(sx + w * 0.32, sy + h * 0.82 + by)
            .fill({ color: 0xFFFFFF, alpha: 0.2 });
          // Bubbles
          const bt = Date.now() / 300;
          for (let bi = 0; bi < 3; bi++) {
            const bbx = sx + w * 0.35 + (bi * w * 0.12);
            const bby = sy + h * 0.7 + by - ((bt + bi * 2) % 4) * h * 0.08;
            g.circle(bbx, bby, 1.5 + bi * 0.3).fill({ color: 0xAAFFAA, alpha: 0.5 - bi * 0.1 });
          }
          // Label
          g.roundRect(sx + w * 0.28, sy + h * 0.58 + by, w * 0.44, h * 0.15, 1).fill({ color: 0xFFFFDD, alpha: 0.4 });
          g.rect(sx + w * 0.35, sy + h * 0.62 + by, w * 0.3, 2).fill({ color: 0x006600, alpha: 0.3 });
          break;
        }
        case ItemType.DRAGON_BREATH: {
          // Dragon Breath — ornate fire chalice
          const ft = Date.now() / 100;
          const by = bob;
          g.circle(cx, cy + by, w * 0.45).fill({ color: 0xFF6600, alpha: 0.1 });
          // Chalice cup — flared polygon
          g.moveTo(sx + w * 0.15, sy + h * 0.48 + by).lineTo(sx + w * 0.25, sy + h * 0.6 + by)
            .lineTo(sx + w * 0.2, sy + h * 0.7 + by).lineTo(sx + w * 0.8, sy + h * 0.7 + by)
            .lineTo(sx + w * 0.75, sy + h * 0.6 + by).lineTo(sx + w * 0.85, sy + h * 0.48 + by).fill(0xBB8800);
          // Inner cup
          g.moveTo(sx + w * 0.2, sy + h * 0.5 + by).lineTo(sx + w * 0.28, sy + h * 0.6 + by)
            .lineTo(sx + w * 0.72, sy + h * 0.6 + by).lineTo(sx + w * 0.8, sy + h * 0.5 + by).fill(0xDDAA00);
          // Rim highlight
          g.moveTo(sx + w * 0.15, sy + h * 0.47 + by).lineTo(sx + w * 0.85, sy + h * 0.47 + by)
            .lineTo(sx + w * 0.83, sy + h * 0.5 + by).lineTo(sx + w * 0.17, sy + h * 0.5 + by).fill(0xEECC22);
          // Stem
          g.rect(sx + w * 0.42, sy + h * 0.7 + by, w * 0.16, h * 0.12).fill(0xAA7700);
          // Base
          g.moveTo(sx + w * 0.25, sy + h * 0.92 + by).lineTo(sx + w * 0.35, sy + h * 0.82 + by)
            .lineTo(sx + w * 0.65, sy + h * 0.82 + by).lineTo(sx + w * 0.75, sy + h * 0.92 + by).fill(0xBB8800);
          g.rect(sx + w * 0.22, sy + h * 0.9 + by, w * 0.56, h * 0.06).fill(0xDDAA00);
          // Dragon head emblem on cup
          g.moveTo(cx - 3, sy + h * 0.52 + by).lineTo(cx, sy + h * 0.48 + by)
            .lineTo(cx + 3, sy + h * 0.52 + by).lineTo(cx, sy + h * 0.58 + by).fill(0xFF4400);
          // Flames — multi-layered animated
          for (let fl = 0; fl < 3; fl++) {
            const fOff = fl * 0.7;
            const fW = w * (0.22 - fl * 0.05);
            const fH = h * (0.2 + Math.sin(ft + fOff) * 0.04);
            const fX = cx + Math.sin(ft * 1.5 + fl * 2) * 2;
            const fY = sy + h * (0.33 - fl * 0.06) + by;
            g.ellipse(fX, fY, fW, fH).fill([0xFF3300, 0xFF8800, 0xFFDD44][fl]);
          }
          // Ember sparks
          for (let sp = 0; sp < 2; sp++) {
            const spx = cx + Math.sin(ft * 2 + sp * 3) * 5;
            const spy = sy + h * 0.18 + by - sp * 4;
            g.circle(spx, spy, 1.5).fill({ color: 0xFFAA00, alpha: 0.5 });
          }
          break;
        }
        case ItemType.GRAIL_STAR: {
          // Holy Grail — ornate chalice with divine radiance
          const now = Date.now();
          const glow = 0.15 + Math.sin(now / 200) * 0.08;
          const by = bob;
          // Divine radiance rings
          for (let ri = 4; ri > 0; ri--) {
            g.circle(cx, cy + by, w * (0.3 + ri * 0.12)).fill({ color: 0xFFFF88, alpha: glow * (0.4 / ri) });
          }
          // Light rays (rotating)
          const rayRot = now / 3000;
          for (let ray = 0; ray < 6; ray++) {
            const a = rayRot + (ray / 6) * Math.PI * 2;
            const rx = Math.cos(a) * w * 0.5;
            const ry = Math.sin(a) * w * 0.5;
            g.moveTo(cx, cy + by).lineTo(cx + rx * 0.3, cy + by + ry * 0.3)
              .lineTo(cx + rx, cy + by + ry).lineTo(cx + rx * 0.25, cy + by + ry * 0.25)
              .fill({ color: 0xFFFFAA, alpha: glow * 0.3 });
          }
          // Cup — wider at top, tapers
          g.moveTo(sx + w * 0.12, sy + h * 0.3 + by).lineTo(sx + w * 0.2, sy + h * 0.65 + by)
            .lineTo(sx + w * 0.8, sy + h * 0.65 + by).lineTo(sx + w * 0.88, sy + h * 0.3 + by).fill(0xFFD700);
          // Cup inner
          g.moveTo(sx + w * 0.18, sy + h * 0.33 + by).lineTo(sx + w * 0.24, sy + h * 0.6 + by)
            .lineTo(sx + w * 0.76, sy + h * 0.6 + by).lineTo(sx + w * 0.82, sy + h * 0.33 + by).fill(0xFFE844);
          // Rim with ornate edge
          g.moveTo(sx + w * 0.1, sy + h * 0.28 + by).lineTo(sx + w * 0.9, sy + h * 0.28 + by)
            .lineTo(sx + w * 0.88, sy + h * 0.34 + by).lineTo(sx + w * 0.12, sy + h * 0.34 + by).fill(0xFFEE66);
          // Knob (stem node)
          g.circle(cx, sy + h * 0.7 + by, w * 0.08).fill(0xFFD700);
          // Stem
          g.rect(cx - w * 0.06, sy + h * 0.72 + by, w * 0.12, h * 0.1).fill(0xEEC800);
          // Base — ornate foot
          g.moveTo(sx + w * 0.22, sy + h * 0.92 + by).lineTo(sx + w * 0.35, sy + h * 0.82 + by)
            .lineTo(sx + w * 0.65, sy + h * 0.82 + by).lineTo(sx + w * 0.78, sy + h * 0.92 + by).fill(0xFFD700);
          g.rect(sx + w * 0.2, sy + h * 0.9 + by, w * 0.6, h * 0.05).fill(0xFFEE44);
          // Cross emblem
          g.rect(cx - 1.5, sy + h * 0.38 + by, 3, h * 0.2).fill(0xDD0000);
          g.rect(cx - h * 0.08, sy + h * 0.45 + by, h * 0.16, 3).fill(0xDD0000);
          // Jewels — 3 around the cup
          g.circle(sx + w * 0.25, sy + h * 0.48 + by, 3).fill(0x3355FF);
          g.circle(sx + w * 0.25, sy + h * 0.48 + by, 1.5).fill(0x88AAFF);
          g.circle(sx + w * 0.75, sy + h * 0.48 + by, 3).fill(0x33CC55);
          g.circle(sx + w * 0.75, sy + h * 0.48 + by, 1.5).fill(0x88FFAA);
          g.circle(cx, sy + h * 0.58 + by, 2.5).fill(0xCC3355);
          g.circle(cx, sy + h * 0.58 + by, 1.2).fill(0xFF88AA);
          // Filigree lines on cup
          g.moveTo(sx + w * 0.3, sy + h * 0.4 + by).lineTo(cx, sy + h * 0.36 + by)
            .lineTo(sx + w * 0.7, sy + h * 0.4 + by).stroke({ color: 0xCCA800, width: 1 });
          break;
        }
        case ItemType.LIFE_UP: {
          // 1-Up green crown — detailed with gems and cross
          const by = bob;
          g.circle(cx, cy + by, w * 0.4).fill({ color: 0x44FF44, alpha: 0.12 });
          // Crown base
          g.roundRect(sx + w * 0.15, sy + h * 0.4 + by, w * 0.7, h * 0.55, 3).fill(0x00AA00);
          g.roundRect(sx + w * 0.18, sy + h * 0.43 + by, w * 0.64, h * 0.38, 2).fill(0x00CC00);
          // Trim band
          g.rect(sx + w * 0.15, sy + h * 0.4 + by, w * 0.7, 3).fill(0x00DD00);
          g.rect(sx + w * 0.15, sy + h * 0.9 + by, w * 0.7, 3).fill(0x008800);
          // 5 crown points (proper triangles)
          for (let i = 0; i < 5; i++) {
            const px = sx + w * 0.18 + i * w * 0.135;
            const ph = h * (i === 2 ? 0.3 : i === 1 || i === 3 ? 0.22 : 0.16);
            g.moveTo(px, sy + h * 0.4 + by).lineTo(px + w * 0.06, sy + h * 0.4 - ph + by)
              .lineTo(px + w * 0.12, sy + h * 0.4 + by).fill(0x00AA00);
            // Tip orb
            g.circle(px + w * 0.06, sy + h * 0.4 - ph + by, 2.5).fill(0x00EE00);
            g.circle(px + w * 0.06 - 0.5, sy + h * 0.4 - ph + by - 0.5, 1).fill(0x88FF88);
          }
          // Centre gem
          g.circle(cx, sy + h * 0.58 + by, 3.5).fill(0xFFFFFF);
          g.circle(cx, sy + h * 0.58 + by, 2).fill(0xAAFFAA);
          // Side gems
          g.circle(sx + w * 0.3, sy + h * 0.58 + by, 2).fill(0xFFDD44);
          g.circle(sx + w * 0.7, sy + h * 0.58 + by, 2).fill(0xFFDD44);
          // Cross pattern
          g.rect(cx - 1, sy + h * 0.48 + by, 2, h * 0.2).fill(0x008800);
          g.rect(cx - h * 0.06, sy + h * 0.55 + by, h * 0.12, 2).fill(0x008800);
          break;
        }
      }
    }
  }

  // =======================================================================
  // PROJECTILES — with trails and glow
  // =======================================================================

  private _drawProjectiles(s: KingdomState): void {
    const g = this._entities;
    const ts = s.tileSize;

    for (const proj of s.projectiles) {
      if (!proj.active) continue;
      const sx = (proj.x - s.cameraX) * ts;
      const sy = proj.y * ts;
      const w = proj.width * ts;

      if (proj.fromPlayer) {
        const fcx = sx + w / 2, fcy = sy + w / 2;
        const t = Date.now() / 60;
        // Outer heat shimmer
        g.circle(fcx, fcy, w * 1.2).fill({ color: 0xFF4400, alpha: 0.08 });
        // Main fireball layers
        g.circle(fcx, fcy, w * 0.85).fill({ color: 0xFF5500, alpha: 0.35 });
        g.circle(fcx, fcy, w * 0.6).fill(0xFF4400);
        g.circle(fcx, fcy, w * 0.4).fill(0xFFAA00);
        g.circle(fcx - 1, fcy - 1, w * 0.2).fill(0xFFEE88);
        // Flickering flame wisps
        for (let fi = 0; fi < 4; fi++) {
          const fa = t * 3 + fi * 1.5;
          const fr = w * (0.3 + fi * 0.1);
          g.circle(fcx + Math.cos(fa) * fr, fcy + Math.sin(fa) * fr, w * 0.12)
            .fill({ color: 0xFF6600, alpha: 0.4 - fi * 0.08 });
        }
        // Trail (longer, more particles)
        for (let i = 1; i <= 5; i++) {
          const tx = fcx - proj.vx * 0.008 * i * ts;
          const ty = fcy + Math.sin(t + i * 2) * 1.5;
          g.circle(tx, ty, w * (0.3 - i * 0.05))
            .fill({ color: i < 3 ? 0xFF4400 : 0x883300, alpha: 0.35 - i * 0.06 });
        }
        // Smoke puff behind
        g.circle(fcx - proj.vx * 0.05 * ts, fcy, w * 0.25)
          .fill({ color: 0x444444, alpha: 0.12 });
      } else {
        // Enemy projectile — bone with rotation
        const ecx = sx + w / 2, ecy = sy + w / 2;
        const rot = Date.now() / 80;
        g.circle(ecx, ecy, w * 0.6).fill(0xDDDDCC);
        g.circle(ecx, ecy, w * 0.35).fill(0xEEEEDD);
        // Rotating cross-bone pattern
        for (let ci = 0; ci < 2; ci++) {
          const ca = rot + ci * Math.PI / 2;
          g.roundRect(ecx - 1 + Math.cos(ca) * w * 0.15, ecy - w * 0.28 + Math.sin(ca) * w * 0.1, 2, w * 0.55, 1)
            .fill({ color: 0xBBBBAA, alpha: 0.7 });
        }
        // Trail
        g.circle(ecx - proj.vx * 0.005 * ts, ecy, w * 0.2)
          .fill({ color: 0xCCCCBB, alpha: 0.15 });
      }
    }
  }

  // =======================================================================
  // PARTICLES, COINS, SCORE POPUPS
  // =======================================================================

  private _drawParticles(s: KingdomState): void {
    const g = this._fx;
    const ts = s.tileSize;
    for (const p of s.particles) {
      const sx = (p.x - s.cameraX) * ts;
      const sy = p.y * ts;
      const a = p.life / p.maxLife;
      const sz = p.size * ts * a;
      g.roundRect(sx - sz / 2, sy - sz / 2, sz, sz, 1).fill({ color: p.color, alpha: a });
    }
  }

  private _drawCoinAnims(s: KingdomState): void {
    const g = this._fx;
    const ts = s.tileSize;
    for (const c of s.coinAnims) {
      const sx = (c.x - s.cameraX) * ts;
      const sy = c.y * ts;
      const a = c.timer / 0.4;
      const stretch = Math.abs(Math.sin(Date.now() / 60));
      g.ellipse(sx, sy, 4 * stretch + 1, 6).fill({ color: 0xFFD700, alpha: a });
      g.ellipse(sx, sy, 2 * stretch, 4).fill({ color: 0xFFEE66, alpha: a });
    }
  }

  private _drawFloatingCoins(s: KingdomState): void {
    const g = this._entities;
    const ts = s.tileSize;
    const camX = s.cameraX;
    const viewW = s.sw / ts;
    const t = Date.now();

    for (const c of s.floatingCoins) {
      if (c.collected) continue;
      if (c.x < camX - 1 || c.x > camX + viewW + 1) continue;

      const bob = Math.sin(t / 300 + c.bobOffset) * 3;
      const sx = (c.x - camX) * ts;
      const sy = c.y * ts + bob;

      // Glow
      g.circle(sx, sy, ts * 0.35).fill({ color: 0xFFFF88, alpha: 0.12 });
      // Coin (spinning)
      const stretch = Math.abs(Math.sin(t / 200 + c.bobOffset));
      g.ellipse(sx, sy, ts * 0.2 * stretch + 2, ts * 0.25).fill(0xFFD700);
      g.ellipse(sx - 1, sy - 1, ts * 0.1 * stretch + 1, ts * 0.17).fill(0xFFEE66);
      // Sparkle
      if (Math.sin(t / 400 + c.x) > 0.7) {
        g.circle(sx + 4, sy - 4, 2).fill({ color: 0xFFFFFF, alpha: 0.6 });
      }
    }
  }

  private _drawSwordSlash(s: KingdomState): void {
    if (s.character !== KingdomChar.ARTHUR || s.player.swordTimer <= 0) return;
    const g = this._fx;
    const p = s.player;
    const ts = s.tileSize;
    const sx = (p.x - s.cameraX) * ts;
    const sy = p.y * ts;
    const w = p.width * ts;
    const h = p.height * ts;

    // Slash arc
    const slashProgress = 1 - (p.swordTimer / 0.2);
    const slashAlpha = 0.7 * (1 - slashProgress);
    const slashX = p.facing > 0 ? sx + w : sx;
    const slashLen = ts * 1.6;
    const centerY = sy + h * 0.4;
    const baseAng = p.facing > 0 ? -0.8 : 2.3;

    // Outer glow aura
    for (let r = 0; r < 3; r++) {
      const glowR = slashLen * (0.8 + r * 0.15);
      const glowAng = baseAng + slashProgress * 1.5;
      g.circle(slashX + Math.cos(glowAng) * glowR * 0.7, centerY + Math.sin(glowAng) * glowR * 0.7, 12 - r * 3)
        .fill({ color: 0xAABBFF, alpha: slashAlpha * 0.1 * (3 - r) });
    }

    // Arc sweep trail (more particles, varied sizes)
    for (let i = 0; i < 8; i++) {
      const ang = baseAng + (slashProgress + i * 0.035) * 1.6;
      const r = slashLen * (0.4 + i * 0.08);
      const px = slashX + Math.cos(ang) * r;
      const py = centerY + Math.sin(ang) * r;
      const sz = 5 - i * 0.4;
      g.circle(px, py, sz).fill({ color: 0xDDDDFF, alpha: slashAlpha * (1 - i * 0.1) });
      // Spark at each point
      if (i % 2 === 0) {
        g.circle(px + (Math.random() - 0.5) * 6, py + (Math.random() - 0.5) * 6, 1.5)
          .fill({ color: 0xFFFFFF, alpha: slashAlpha * 0.8 });
      }
    }

    // Main slash arc (thicker, tapered)
    const startAng = baseAng + slashProgress * 1.2;
    const midAng = startAng + 0.4;
    const endAng = startAng + 0.9;
    // Blade shape (tapered from thick to thin)
    g.moveTo(slashX + Math.cos(startAng) * slashLen * 0.25, centerY + Math.sin(startAng) * slashLen * 0.25)
      .lineTo(slashX + Math.cos(midAng) * slashLen * 0.9, centerY + Math.sin(midAng) * slashLen * 0.9)
      .lineTo(slashX + Math.cos(endAng) * slashLen, centerY + Math.sin(endAng) * slashLen)
      .lineTo(slashX + Math.cos(endAng - 0.08) * slashLen * 0.85, centerY + Math.sin(endAng - 0.08) * slashLen * 0.85)
      .lineTo(slashX + Math.cos(midAng - 0.06) * slashLen * 0.7, centerY + Math.sin(midAng - 0.06) * slashLen * 0.7)
      .fill({ color: 0xFFFFFF, alpha: slashAlpha * 0.8 });
    // Inner bright edge
    g.moveTo(slashX + Math.cos(startAng + 0.1) * slashLen * 0.3, centerY + Math.sin(startAng + 0.1) * slashLen * 0.3)
      .lineTo(slashX + Math.cos(endAng - 0.15) * slashLen * 0.9, centerY + Math.sin(endAng - 0.15) * slashLen * 0.9)
      .lineTo(slashX + Math.cos(endAng - 0.2) * slashLen * 0.75, centerY + Math.sin(endAng - 0.2) * slashLen * 0.75)
      .fill({ color: 0xFFFFFF, alpha: slashAlpha * 0.4 });
  }

  private _drawScorePopups(s: KingdomState): void {
    let i = 0;
    for (const pop of s.scorePopups) {
      if (i >= this._popupTexts.length) break;
      if (pop.value === 0 && !pop.text) continue;
      const t = this._popupTexts[i];
      t.visible = true;
      t.text = pop.text || String(pop.value);
      const sz = pop.big ? 15 : 11;
      const color = pop.color || 0xFFFFFF;
      t.style = sty(sz, color, !!pop.big, 0, true);
      t.x = (pop.x - s.cameraX) * s.tileSize;
      t.y = pop.y * s.tileSize;
      t.alpha = Math.min(1, pop.timer / 0.5);
      i++;
    }
  }

  // =======================================================================
  // HUD — polished with icons and shadows
  // =======================================================================

  private _drawHUD(s: KingdomState): void {
    const g = this._hud;
    const sw = s.sw;
    // Background bar with gradient feel
    g.rect(0, 0, sw, 36).fill({ color: 0x000000, alpha: 0.7 });
    g.rect(0, 36, sw, 2).fill({ color: 0xFFD700, alpha: 0.25 });

    const texts = this._hudTexts;
    const gap = sw / 6;
    const ty = 9;

    texts[0].style = HUD_STYLE; texts[0].text = `SCORE`; texts[0].x = 12; texts[0].y = ty;
    texts[1].style = sty(14, 0xFFFFFF, false, 1, true); texts[1].text = String(s.score).padStart(7, "0"); texts[1].x = 12; texts[1].y = ty + 12;

    // Coin icon
    g.circle(gap + 8, ty + 10, 7).fill(0xFFD700);
    g.circle(gap + 7, ty + 9, 3).fill(0xFFEE66);
    texts[2].style = HUD_STYLE; texts[2].text = `x${s.coins}`; texts[2].x = gap + 20; texts[2].y = ty + 3;

    texts[3].style = HUD_STYLE; texts[3].text = `WORLD ${s.world}-${s.level}`; texts[3].x = gap * 2 + 10; texts[3].y = ty + 3;

    // Time with warning color
    const timeVal = Math.ceil(Math.max(0, s.time));
    const timeFill = timeVal <= 60 ? 0xFF4444 : 0xFFFFFF;
    texts[4].style = sty(16, timeFill, true, 1, true); texts[4].text = `TIME ${timeVal}`; texts[4].x = gap * 3 + 10; texts[4].y = ty + 3;

    // Character icon
    const cc = CHAR_COLORS[s.character];
    const iconX = gap * 4 + 10;
    g.circle(iconX + 10, ty + 10, 10).fill(cc.primary);
    g.circle(iconX + 10, ty + 6, 6).fill(cc.skin);
    texts[5].style = HUD_STYLE; texts[5].text = `x${s.lives}`; texts[5].x = iconX + 24; texts[5].y = ty + 3;

    texts[6].style = sty(12, 0xAAAAAA, false, 1); texts[6].text = `HI ${String(s.highScore).padStart(7, "0")}`; texts[6].x = gap * 5 + 10; texts[6].y = ty + 5;

    // Progress bar at bottom of HUD
    const progW = sw * 0.15;
    const progH = 4;
    const progX = sw - progW - 12;
    const progY = 30;
    g.roundRect(progX - 1, progY - 1, progW + 2, progH + 2, 2).fill({ color: 0x000000, alpha: 0.4 });
    const progress = Math.min(1, (s.player.x / Math.max(1, s.levelWidth - 20)));
    g.roundRect(progX, progY, progW * progress, progH, 1).fill(0xFFD700);
    // Player dot on progress bar
    g.circle(progX + progW * progress, progY + progH / 2, 3).fill(0xFFFFFF);

    // Stomp combo indicator
    if (s.player.stompCombo > 1) {
      const comboAlpha = Math.min(1, s.player.stompComboTimer / 0.5);
      g.rect(sw / 2 - 40, 40, 80, 22).fill({ color: 0x000000, alpha: 0.5 * comboAlpha });
      // We can't dynamically create Text here, so we'll draw combo as colored rect indicator
      const comboW = Math.min(s.player.stompCombo * 12, 70);
      g.rect(sw / 2 - comboW / 2, 45, comboW, 12).fill({ color: 0xFF6600, alpha: comboAlpha });
      g.rect(sw / 2 - comboW / 2, 45, comboW, 3).fill({ color: 0xFFAA00, alpha: comboAlpha });
    }

    // Power-up indicator
    if (s.player.power === PowerState.FIRE) {
      g.circle(12, progY + 2, 5).fill(0xFF4400);
      g.circle(12, progY + 2, 3).fill(0xFFAA00);
    } else if (s.player.power === PowerState.BIG) {
      g.circle(12, progY + 2, 5).fill(0x00AA00);
      g.circle(12, progY + 2, 3).fill(0x44FF44);
    }
  }

  // =======================================================================
  // UI SCREENS
  // =======================================================================

  private _drawTitle(s: KingdomState): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh;
    const cx = sw / 2;

    // Sky gradient
    for (let i = 0; i < 12; i++) {
      const c = lerpColor(0x0A0A2E, 0x1A1A4E, i / 11);
      g.rect(0, i * (sh / 12), sw, sh / 12 + 1).fill(c);
    }

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx2 = ((i * 137 + 31) % sw);
      const sy2 = ((i * 89 + 17) % (sh * 0.55));
      const bright = 0.3 + Math.sin(Date.now() / 600 + i * 0.7) * 0.35;
      const sz = i % 5 === 0 ? 2 : 1;
      g.circle(sx2, sy2, sz).fill({ color: 0xFFFFFF, alpha: bright });
    }

    // Moon
    g.circle(sw * 0.8, sh * 0.12, 30).fill({ color: 0xFFEECC, alpha: 0.8 });
    g.circle(sw * 0.8 + 8, sh * 0.12 - 4, 26).fill(lerpColor(0x0A0A2E, 0x1A1A4E, 0.3));

    // Castle silhouette — detailed
    const baseY = sh * 0.52;
    // Main keep
    g.rect(cx - 60, baseY - 80, 120, 80 + sh - baseY).fill(0x111128);
    // Side towers
    g.rect(cx - 140, baseY - 50, 50, 50 + sh - baseY).fill(0x111128);
    g.rect(cx + 90, baseY - 50, 50, 50 + sh - baseY).fill(0x111128);
    // Tower tops
    g.moveTo(cx - 140, baseY - 50).lineTo(cx - 115, baseY - 90).lineTo(cx - 90, baseY - 50).fill(0x111128);
    g.moveTo(cx + 90, baseY - 50).lineTo(cx + 115, baseY - 90).lineTo(cx + 140, baseY - 50).fill(0x111128);
    g.moveTo(cx - 60, baseY - 80).lineTo(cx, baseY - 130).lineTo(cx + 60, baseY - 80).fill(0x111128);
    // Battlements
    for (let i = 0; i < 11; i++) {
      if (i % 2 === 0) g.rect(cx - 140 + i * 28, baseY - 15, 14, 15).fill(0x151530);
    }
    // Windows (warm glow)
    const winY = baseY - 30;
    for (const wx of [cx - 110, cx - 30, cx + 20, cx + 100]) {
      g.rect(wx - 6, winY, 12, 18).fill(0xFFAA44);
      g.rect(wx - 4, winY + 2, 8, 14).fill(0xFFCC66);
      g.rect(wx - 1, winY, 2, 18).fill(0xFFAA44); // cross bar
      g.rect(wx - 6, winY + 8, 12, 2).fill(0xFFAA44);
    }
    // Gate
    g.roundRect(cx - 22, baseY + 15, 44, sh - baseY - 15, 22).fill(0x050510);
    // Portcullis lines
    for (let i = 0; i < 5; i++) g.rect(cx - 18 + i * 9, baseY + 20, 1, 40).fill(0x333344);
    for (let i = 0; i < 3; i++) g.rect(cx - 18, baseY + 25 + i * 12, 36, 1).fill(0x333344);

    // Ground
    g.rect(0, baseY + 50, sw, sh - baseY - 50).fill(0x0A0A18);

    // Title text
    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = TITLE_STYLE;
    t0.text = "KINGDOM"; t0.x = cx - t0.width / 2; t0.y = sh * 0.08;

    const t1 = this._uiTexts[1]; t1.visible = true; t1.style = sty(20, 0xBBBBDD, false, 3);
    t1.text = "A Camelot Quest"; t1.x = cx - t1.width / 2; t1.y = sh * 0.08 + 60;

    // Subtitle
    const t2 = this._uiTexts[2]; t2.visible = true; t2.style = sty(14, 0x8888AA, false, 1);
    t2.text = "Mordred has stolen Excalibur. Reclaim it across 4 worlds.";
    t2.x = cx - t2.width / 2; t2.y = sh * 0.08 + 90;

    const t3 = this._uiTexts[3]; t3.visible = true; t3.style = SUBTITLE_STYLE;
    t3.text = "Press ENTER to Start";
    t3.x = cx - t3.width / 2; t3.y = sh * 0.82;
    t3.alpha = 0.5 + Math.sin(Date.now() / 350) * 0.35;

    const t4 = this._uiTexts[4]; t4.visible = true; t4.style = HUD_SMALL;
    t4.text = "ESC  return to menu"; t4.x = cx - t4.width / 2; t4.y = sh * 0.93;
  }

  private _drawCharSelect(s: KingdomState): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh, cx = sw / 2;
    const t = Date.now() / 1000;

    // Rich gradient background with dark vignette
    for (let i = 0; i < 16; i++) {
      const y0 = i * (sh / 16);
      g.rect(0, y0, sw, sh / 16 + 1).fill(lerpColor(0x05061A, 0x12143A, i / 15));
    }
    // Subtle radial vignette corners
    for (let corner = 0; corner < 4; corner++) {
      const vx = corner % 2 === 0 ? 0 : sw;
      const vy = corner < 2 ? 0 : sh;
      g.circle(vx, vy, sh * 0.5).fill({ color: 0x000000, alpha: 0.3 });
    }

    // Animated background particles (floating embers)
    for (let p = 0; p < 30; p++) {
      const px = ((p * 137.5 + t * 15 * (0.3 + (p % 5) * 0.15)) % sw);
      const py = sh - ((p * 73.7 + t * 25 * (0.4 + (p % 3) * 0.2)) % (sh * 1.2));
      const pa = 0.15 + Math.sin(t * 2 + p) * 0.1;
      const ps = 1.5 + Math.sin(t * 3 + p * 2) * 0.8;
      g.circle(px, py, ps).fill({ color: lerpColor(0xFFAA44, 0xFFD700, (p % 7) / 7), alpha: pa });
    }

    // Decorative border frame
    const frameM = 20;
    g.rect(frameM, frameM, sw - frameM * 2, 1).fill({ color: 0xFFD700, alpha: 0.15 });
    g.rect(frameM, sh - frameM, sw - frameM * 2, 1).fill({ color: 0xFFD700, alpha: 0.15 });
    g.rect(frameM, frameM, 1, sh - frameM * 2).fill({ color: 0xFFD700, alpha: 0.15 });
    g.rect(sw - frameM, frameM, 1, sh - frameM * 2).fill({ color: 0xFFD700, alpha: 0.15 });
    // Corner ornaments
    for (const [ox, oy] of [[frameM, frameM], [sw - frameM, frameM], [frameM, sh - frameM], [sw - frameM, sh - frameM]]) {
      g.circle(ox, oy, 4).fill({ color: 0xFFD700, alpha: 0.3 });
      g.circle(ox, oy, 2).fill({ color: 0xFFD700, alpha: 0.5 });
    }

    // Title with glow
    const titleGlow = 0.6 + Math.sin(t * 1.5) * 0.15;
    g.roundRect(cx - 220, 24, 440, 48, 6).fill({ color: 0xFFD700, alpha: 0.06 });
    g.rect(cx - 200, 76, 400, 2).fill({ color: 0xFFD700, alpha: titleGlow * 0.5 });
    g.rect(cx - 150, 80, 300, 1).fill({ color: 0xFFD700, alpha: titleGlow * 0.25 });
    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = BIG_TEXT;
    t0.text = "CHOOSE YOUR CHAMPION"; t0.x = cx - t0.width / 2; t0.y = 32;

    // Character cards
    const cardW = Math.min(220, (sw - 80) / 4);
    const gap = 14;
    const totalW = CHAR_LIST.length * cardW + (CHAR_LIST.length - 1) * gap;
    const startX = cx - totalW / 2;
    const cardY = sh * 0.13;
    const cardH = sh * 0.63;

    for (let i = 0; i < CHAR_LIST.length; i++) {
      const char = CHAR_LIST[i];
      const x = startX + i * (cardW + gap);
      const sel = i === s.charSelectIndex;
      const colors = CHAR_COLORS[char];
      const stats = CHAR_STATS[char];
      const pulse = sel ? 0.7 + Math.sin(t * 3) * 0.3 : 0;

      // Selected card: animated outer glow layers
      if (sel) {
        g.roundRect(x - 10, cardY - 10, cardW + 20, cardH + 20, 12).fill({ color: 0xFFD700, alpha: 0.08 });
        g.roundRect(x - 6, cardY - 6, cardW + 12, cardH + 12, 10).fill({ color: 0xFFD700, alpha: 0.12 + pulse * 0.08 });
        g.roundRect(x - 3, cardY - 3, cardW + 6, cardH + 6, 8).fill({ color: 0xFFD700, alpha: 0.25 + pulse * 0.1 });
      }

      // Card border
      const borderCol = sel ? 0xFFD700 : 0x2A2A4A;
      g.roundRect(x - 2, cardY - 2, cardW + 4, cardH + 4, 7).fill(borderCol);

      // Card background gradient
      const bgTop = sel ? 0x1A1A50 : 0x0E0E28;
      const bgBot = sel ? 0x101038 : 0x08081A;
      for (let row = 0; row < 8; row++) {
        const ry = cardY + row * (cardH / 8);
        g.rect(x, ry, cardW, cardH / 8 + 1).fill(lerpColor(bgTop, bgBot, row / 7));
      }
      // Inner border
      g.roundRect(x + 2, cardY + 2, cardW - 4, cardH - 4, 5).stroke({ color: sel ? 0x444488 : 0x222244, width: 1 });

      // --- Detailed character portrait ---
      const pcx = x + cardW / 2;
      const pcy = cardY + cardH * 0.35;
      const sc = Math.min(cardW / 80, 3.2); // scale factor

      // Ground shadow
      g.ellipse(pcx, pcy + 42 * sc, 22 * sc, 4 * sc).fill({ color: 0x000000, alpha: 0.3 });

      // Feet with boots
      const bootCol = darken(colors.secondary, 20);
      for (const side of [-1, 1]) {
        const fx = pcx + side * 5 * sc;
        g.roundRect(fx - 4 * sc, pcy + 34 * sc, 8 * sc, 8 * sc, 2 * sc).fill(bootCol);
        g.roundRect(fx - 4 * sc + side * 1.5 * sc, pcy + 39 * sc, 5 * sc, 3 * sc, 1 * sc).fill(darken(bootCol, 15)); // toe
      }

      // Legs with shading
      for (const side of [-1, 1]) {
        const lx = pcx + side * 5 * sc;
        g.roundRect(lx - 4 * sc, pcy + 18 * sc, 8 * sc, 18 * sc, 2 * sc).fill(colors.secondary);
        g.roundRect(lx - 2 * sc, pcy + 18 * sc, 4 * sc, 18 * sc, 1 * sc).fill(lighten(colors.secondary, 10)); // highlight
      }

      // Torso with armor detail
      const torsoY = pcy - 6 * sc;
      const torsoW = 26 * sc;
      const torsoH = 26 * sc;
      g.roundRect(pcx - torsoW / 2, torsoY, torsoW, torsoH, 3 * sc).fill(colors.primary);
      // Armor shading
      g.roundRect(pcx - torsoW / 2 + 2 * sc, torsoY + 2 * sc, torsoW / 2 - 3 * sc, torsoH - 4 * sc, 2 * sc).fill(lighten(colors.primary, 12));
      // Belt
      g.roundRect(pcx - torsoW / 2 - 1 * sc, torsoY + torsoH - 5 * sc, torsoW + 2 * sc, 4 * sc, 1 * sc).fill(darken(colors.secondary, 30));
      g.roundRect(pcx - 2 * sc, torsoY + torsoH - 5.5 * sc, 4 * sc, 5 * sc, 1 * sc).fill(0xCCA800); // buckle

      // Arms with gauntlets
      for (const side of [-1, 1]) {
        const ax = pcx + side * (torsoW / 2 + 2 * sc);
        // Upper arm
        g.roundRect(ax - 4 * sc, torsoY + 3 * sc, 8 * sc, 14 * sc, 2 * sc).fill(colors.primary);
        // Forearm
        g.roundRect(ax - 3.5 * sc, torsoY + 15 * sc, 7 * sc, 10 * sc, 2 * sc).fill(darken(colors.primary, 15));
        // Gauntlet
        g.roundRect(ax - 4 * sc, torsoY + 22 * sc, 8 * sc, 5 * sc, 1.5 * sc).fill(darken(colors.secondary, 10));
        // Shoulder pad
        g.ellipse(ax, torsoY + 3 * sc, 6 * sc, 4 * sc).fill(lighten(colors.primary, 20));
        g.ellipse(ax, torsoY + 2 * sc, 4 * sc, 2.5 * sc).fill(lighten(colors.primary, 35));
      }

      // Neck
      g.roundRect(pcx - 3 * sc, torsoY - 4 * sc, 6 * sc, 6 * sc, 1).fill(colors.skin);

      // Head
      const headR = 12 * sc;
      const headY = pcy - 24 * sc;
      g.circle(pcx, headY, headR).fill(colors.skin);
      // Face highlight
      g.ellipse(pcx - 2 * sc, headY - 2 * sc, headR * 0.5, headR * 0.4).fill(lighten(colors.skin, 15));

      // Eyes
      const eyeY = headY - 1 * sc;
      for (const side of [-1, 1]) {
        const ex = pcx + side * 4.5 * sc;
        g.ellipse(ex, eyeY, 3.2 * sc, 3 * sc).fill(0xFFFFFF);
        g.circle(ex + side * 0.8 * sc, eyeY, 1.8 * sc).fill(0x334466);
        g.circle(ex + side * 1.2 * sc, eyeY - 0.3 * sc, 0.8 * sc).fill(0x111122);
        g.circle(ex + side * 0.3 * sc, eyeY - 1 * sc, 0.6 * sc).fill({ color: 0xFFFFFF, alpha: 0.6 }); // glint
      }
      // Eyebrows
      for (const side of [-1, 1]) {
        const bx = pcx + side * 4.5 * sc;
        g.moveTo(bx - 3 * sc * side, eyeY - 4 * sc)
          .lineTo(bx + 3.5 * sc * side, eyeY - 4.5 * sc)
          .lineTo(bx + 3 * sc * side, eyeY - 3.5 * sc)
          .lineTo(bx - 3 * sc * side, eyeY - 3 * sc).fill(darken(colors.hair || colors.skin, 40));
      }
      // Mouth
      g.moveTo(pcx - 2.5 * sc, headY + 4 * sc)
        .lineTo(pcx, headY + 5 * sc)
        .lineTo(pcx + 2.5 * sc, headY + 4 * sc).stroke({ color: darken(colors.skin, 35), width: 1.2 });
      // Ears
      for (const side of [-1, 1]) {
        g.ellipse(pcx + side * headR * 0.9, headY + 1 * sc, 2.5 * sc, 4 * sc).fill(colors.skin);
        g.ellipse(pcx + side * headR * 0.9, headY + 1 * sc, 1.5 * sc, 2.5 * sc).fill(darken(colors.skin, 15));
      }

      // --- Character-specific details (high poly) ---
      switch (char) {
        case KingdomChar.ARTHUR: {
          // Crown — ornate 5-point with jewels
          const crY = headY - headR - 1 * sc;
          const crW = headR * 1.8;
          g.roundRect(pcx - crW / 2, crY, crW, 6 * sc, 2).fill(0xFFD700);
          g.roundRect(pcx - crW / 2, crY + 4 * sc, crW, 2 * sc, 1).fill(0xCCA800);
          g.roundRect(pcx - crW / 2, crY, crW, 2 * sc, 1).fill(0xFFEE55);
          for (let j = 0; j < 5; j++) {
            const cpx = pcx - crW / 2 + (crW / 4) * j;
            const cph = (j === 2 ? 10 : 7) * sc;
            g.moveTo(cpx - 3 * sc, crY).lineTo(cpx, crY - cph).lineTo(cpx + 3 * sc, crY).fill(0xFFD700);
            g.circle(cpx, crY - cph, 2 * sc).fill(0xFFEE66);
          }
          g.circle(pcx, crY + 3 * sc, 3 * sc).fill(0xDD0000); // ruby
          g.circle(pcx - 1 * sc, crY + 2 * sc, 1.5 * sc).fill({ color: 0xFF6666, alpha: 0.7 }); // ruby highlight
          g.circle(pcx - crW * 0.3, crY + 3 * sc, 2 * sc).fill(0x2244CC); // sapphire
          g.circle(pcx + crW * 0.3, crY + 3 * sc, 2 * sc).fill(0x2244CC); // sapphire
          // Royal cape behind
          g.moveTo(pcx - torsoW / 2 - 2 * sc, torsoY + 2 * sc)
            .lineTo(pcx - torsoW / 2 - 6 * sc, pcy + 40 * sc)
            .lineTo(pcx - torsoW / 2 + 4 * sc, pcy + 38 * sc).fill({ color: 0xAA0000, alpha: 0.6 });
          g.moveTo(pcx + torsoW / 2 + 2 * sc, torsoY + 2 * sc)
            .lineTo(pcx + torsoW / 2 + 6 * sc, pcy + 40 * sc)
            .lineTo(pcx + torsoW / 2 - 4 * sc, pcy + 38 * sc).fill({ color: 0xAA0000, alpha: 0.6 });
          // Cape ermine trim
          for (let ci = 0; ci < 3; ci++) {
            g.circle(pcx - torsoW / 2 - 4 * sc + ci * 3 * sc, pcy + 38 * sc, 1.5 * sc).fill(0xEEEEEE);
          }
          // Sword at side
          const swordX = pcx + torsoW / 2 + 5 * sc;
          g.rect(swordX, torsoY - 5 * sc, 2.5 * sc, 32 * sc).fill(0xBBBBCC);
          g.rect(swordX - 0.5 * sc, torsoY - 5 * sc, 3.5 * sc, 3 * sc).fill(0xDDDDEE); // tip
          g.rect(swordX - 3 * sc, torsoY + 12 * sc, 9 * sc, 3 * sc).fill(0xFFD700); // cross-guard
          g.roundRect(swordX - 0.5 * sc, torsoY + 15 * sc, 3.5 * sc, 8 * sc, 1).fill(0x8B4513); // grip
          g.circle(swordX + 1 * sc, torsoY + 24 * sc, 2.5 * sc).fill(0xFFD700); // pommel
          break;
        }
        case KingdomChar.MERLIN: {
          // Wizard hat — curved conical with stars and brim
          const hatY = headY - headR;
          const brim = headR * 2.2;
          g.ellipse(pcx, hatY + 2 * sc, brim / 2, 3 * sc).fill(colors.primary);
          g.ellipse(pcx, hatY + 1 * sc, brim / 2 - 2, 2 * sc).fill(lighten(colors.primary, 15));
          const hatTipX = pcx + 6 * sc + Math.sin(t * 2) * 2 * sc;
          const hatTipY = hatY - 35 * sc;
          g.moveTo(pcx - headR * 0.8, hatY)
            .lineTo(pcx - 5 * sc, hatY - 18 * sc)
            .lineTo(hatTipX, hatTipY)
            .lineTo(pcx + 6 * sc, hatY - 16 * sc)
            .lineTo(pcx + headR * 0.8, hatY).fill(colors.primary);
          // Hat highlight
          g.moveTo(pcx - 3 * sc, hatY - 8 * sc)
            .lineTo(hatTipX - 2 * sc, hatTipY + 4 * sc)
            .lineTo(pcx + 5 * sc, hatY - 6 * sc).fill(lighten(colors.primary, 18));
          // Hat band
          g.rect(pcx - headR * 0.75, hatY - 1 * sc, headR * 1.5, 4 * sc).fill(darken(colors.primary, 25));
          g.roundRect(pcx - 2 * sc, hatY - 2 * sc, 4 * sc, 6 * sc, 1).fill(0xFFD700); // buckle
          // Stars on hat
          this._star5(g, pcx + 4 * sc, hatY - 20 * sc, 4 * sc, 0xFFD700);
          this._star5(g, pcx - 2 * sc, hatY - 10 * sc, 2.5 * sc, 0xFFEE88);
          this._star5(g, pcx + 7 * sc, hatY - 28 * sc, 2 * sc, 0xFFDD44);
          // Flowing beard
          const beardY = headY + headR * 0.3;
          for (let strand = 0; strand < 5; strand++) {
            const sx2 = pcx + (strand - 2) * 4 * sc;
            const wave = Math.sin(t * 1.5 + strand * 1.3) * 2 * sc;
            const len = (16 + strand * 3) * sc;
            g.moveTo(sx2 - 2 * sc, beardY)
              .lineTo(sx2 - 2 * sc + wave * 0.5, beardY + len * 0.5)
              .lineTo(sx2 + wave, beardY + len)
              .lineTo(sx2 + 2 * sc + wave, beardY + len)
              .lineTo(sx2 + 2 * sc + wave * 0.5, beardY + len * 0.5)
              .lineTo(sx2 + 2 * sc, beardY).fill(strand % 2 === 0 ? 0xDDDDDD : 0xEEEEEE);
          }
          // Staff
          const staffX = pcx - torsoW / 2 - 6 * sc;
          g.rect(staffX, torsoY - 15 * sc, 3 * sc, 55 * sc).fill(0x8B5A2B);
          g.rect(staffX - 0.5 * sc, torsoY - 15 * sc, 4 * sc, 2 * sc).fill(0xAA7744);
          // Orb on staff with glow
          const orbGlow = 0.5 + Math.sin(t * 2.5) * 0.3;
          g.circle(staffX + 1.5 * sc, torsoY - 20 * sc, 8 * sc).fill({ color: 0x4422CC, alpha: 0.3 * orbGlow });
          g.circle(staffX + 1.5 * sc, torsoY - 20 * sc, 6 * sc).fill({ color: 0x6644FF, alpha: 0.7 });
          g.circle(staffX + 1.5 * sc, torsoY - 20 * sc, 4 * sc).fill({ color: 0xAA88FF, alpha: 0.8 });
          g.circle(staffX + 0 * sc, torsoY - 22 * sc, 2 * sc).fill({ color: 0xFFFFFF, alpha: 0.5 });
          // Robe details
          g.moveTo(pcx - 5 * sc, torsoY + torsoH).lineTo(pcx - 8 * sc, pcy + 42 * sc)
            .lineTo(pcx, pcy + 40 * sc).fill(lighten(colors.primary, 8));
          g.moveTo(pcx + 5 * sc, torsoY + torsoH).lineTo(pcx + 8 * sc, pcy + 42 * sc)
            .lineTo(pcx, pcy + 40 * sc).fill(lighten(colors.primary, 8));
          break;
        }
        case KingdomChar.GUINEVERE: {
          // Tiara
          const tY = headY - headR - 1 * sc;
          const tW = headR * 1.7;
          g.roundRect(pcx - tW / 2, tY, tW, 5 * sc, 2).fill(0xFFD700);
          g.roundRect(pcx - tW / 2, tY, tW, 2 * sc, 1).fill(0xFFEE55);
          g.moveTo(pcx - 5 * sc, tY).lineTo(pcx, tY - 8 * sc).lineTo(pcx + 5 * sc, tY).fill(0xFFD700);
          g.circle(pcx, tY - 3 * sc, 3.5 * sc).fill(0x4466FF);
          g.circle(pcx - 1 * sc, tY - 4 * sc, 1.5 * sc).fill({ color: 0x88AAFF, alpha: 0.7 });
          g.moveTo(pcx - tW * 0.38, tY).lineTo(pcx - tW * 0.3, tY - 4 * sc).lineTo(pcx - tW * 0.22, tY).fill(0xFFD700);
          g.moveTo(pcx + tW * 0.22, tY).lineTo(pcx + tW * 0.3, tY - 4 * sc).lineTo(pcx + tW * 0.38, tY).fill(0xFFD700);
          g.circle(pcx - tW * 0.3, tY + 2 * sc, 2 * sc).fill(0xFF44AA);
          g.circle(pcx + tW * 0.3, tY + 2 * sc, 2 * sc).fill(0xFF44AA);
          // Flowing hair — parted to frame face, originates from top of head
          const hairBase = headY - headR * 0.85;
          const hairLen = 38 * sc;
          const hairOffsets = [-15, -12, -9, 9, 12, 15];
          for (let strand = 0; strand < 6; strand++) {
            const hx = pcx + hairOffsets[strand] * sc;
            const hw = 4 * sc;
            const wave1 = Math.sin(t * 1.8 + strand * 1.1) * 3 * sc;
            const wave2 = Math.sin(t * 1.2 + strand * 0.7) * 4 * sc;
            const len = hairLen * (0.8 + (strand === 2 || strand === 3 ? 0.2 : 0));
            g.moveTo(hx - hw / 2, hairBase)
              .lineTo(hx - hw / 2 + wave1, hairBase + len * 0.4)
              .lineTo(hx + wave2, hairBase + len)
              .lineTo(hx + hw + wave2, hairBase + len)
              .lineTo(hx + hw / 2 + wave1, hairBase + len * 0.4)
              .lineTo(hx + hw / 2, hairBase).fill(strand % 3 === 0 ? lighten(colors.hair, 15) : colors.hair);
          }
          // Dress details — flowing skirt
          const skirtY = torsoY + torsoH - 2 * sc;
          g.moveTo(pcx - torsoW / 2 - 3 * sc, skirtY)
            .lineTo(pcx - torsoW / 2 - 8 * sc, pcy + 42 * sc)
            .lineTo(pcx + torsoW / 2 + 8 * sc, pcy + 42 * sc)
            .lineTo(pcx + torsoW / 2 + 3 * sc, skirtY).fill(colors.primary);
          // Dress hem triangles
          for (let hi = 0; hi < 5; hi++) {
            const hx = pcx - torsoW / 2 - 6 * sc + hi * 8 * sc;
            g.moveTo(hx, pcy + 40 * sc).lineTo(hx + 4 * sc, pcy + 44 * sc)
              .lineTo(hx + 8 * sc, pcy + 40 * sc).fill({ color: colors.accent, alpha: 0.4 });
          }
          // Bow at back
          const bowX = pcx;
          const bowY2 = torsoY + 3 * sc;
          g.moveTo(bowX, bowY2).lineTo(bowX - 6 * sc, bowY2 - 4 * sc).lineTo(bowX - 5 * sc, bowY2 + 5 * sc).fill(colors.accent);
          g.moveTo(bowX, bowY2).lineTo(bowX + 6 * sc, bowY2 - 4 * sc).lineTo(bowX + 5 * sc, bowY2 + 5 * sc).fill(colors.accent);
          g.circle(bowX, bowY2, 2 * sc).fill(lighten(colors.accent, 20));
          break;
        }
        case KingdomChar.LANCELOT: {
          // Full great helm with detailed visor
          const helmR = headR + 3 * sc;
          g.circle(pcx, headY, helmR + 2 * sc).fill(darken(colors.accent, 15));
          g.circle(pcx, headY, helmR).fill(colors.accent);
          g.ellipse(pcx - headR * 0.25, headY - headR * 0.35, headR * 0.4, headR * 0.35).fill({ color: 0xFFFFFF, alpha: 0.12 });
          // Visor slit
          g.roundRect(pcx - helmR * 0.7, headY - 2 * sc, helmR * 1.4, 5 * sc, 2).fill(0x0A0A0A);
          // Breathing holes
          for (let hi = 0; hi < 4; hi++)
            g.circle(pcx - helmR * 0.4 + hi * helmR * 0.26, headY + headR * 0.35, 1.5 * sc).fill(0x222222);
          // Nose guard
          g.moveTo(pcx - 2.5 * sc, headY - headR * 0.5).lineTo(pcx, headY - headR * 0.65)
            .lineTo(pcx + 2.5 * sc, headY - headR * 0.5)
            .lineTo(pcx + 2 * sc, headY + 2 * sc)
            .lineTo(pcx - 2 * sc, headY + 2 * sc).fill(lighten(colors.accent, 20));
          // Rivets
          for (let ri = 0; ri < 8; ri++) {
            const ra = (ri / 8) * Math.PI * 2 - Math.PI / 2;
            const rvx = pcx + Math.cos(ra) * (helmR + 0.5 * sc);
            const rvy = headY + Math.sin(ra) * (helmR + 0.5 * sc);
            g.circle(rvx, rvy, 1.5 * sc).fill(0x999999);
            g.circle(rvx - 0.5 * sc, rvy - 0.5 * sc, 0.7 * sc).fill(0xBBBBBB);
          }
          // Plume
          const plumeH = 25 * sc;
          const plumeWave = Math.sin(t * 2.5) * 4 * sc;
          g.moveTo(pcx - 1 * sc, headY - helmR)
            .lineTo(pcx - 3 * sc, headY - helmR - plumeH * 0.4)
            .lineTo(pcx + plumeWave, headY - helmR - plumeH)
            .lineTo(pcx + 5 * sc + plumeWave * 0.5, headY - helmR - plumeH * 0.5)
            .lineTo(pcx + 4 * sc, headY - helmR).fill(0x0044CC);
          g.moveTo(pcx + 1 * sc, headY - helmR - 2 * sc)
            .lineTo(pcx + 1 * sc + plumeWave * 0.5, headY - helmR - plumeH * 0.7)
            .lineTo(pcx + 4 * sc + plumeWave * 0.3, headY - helmR - plumeH * 0.3)
            .lineTo(pcx + 3 * sc, headY - helmR - 2 * sc).fill(0x2266DD);
          // Shield on arm
          const shX = pcx - torsoW / 2 - 8 * sc;
          const shY = torsoY + 5 * sc;
          const shW = 12 * sc;
          const shH2 = 18 * sc;
          g.moveTo(shX, shY).lineTo(shX + shW, shY).lineTo(shX + shW / 2, shY + shH2).fill(0x0044AA);
          g.moveTo(shX + 2 * sc, shY + 2 * sc).lineTo(shX + shW - 2 * sc, shY + 2 * sc)
            .lineTo(shX + shW / 2, shY + shH2 - 3 * sc).fill(0x0055CC);
          // Shield cross
          g.rect(shX + shW * 0.4, shY + 3 * sc, shW * 0.2, shH2 * 0.6).fill(0xFFD700);
          g.rect(shX + shW * 0.15, shY + shH2 * 0.2, shW * 0.7, shH2 * 0.12).fill(0xFFD700);
          // Lance
          const wpX = pcx + torsoW / 2 + 5 * sc;
          g.rect(wpX, torsoY - 18 * sc, 3 * sc, 58 * sc).fill(0x8B5A2B);
          g.moveTo(wpX - 2 * sc, torsoY - 18 * sc).lineTo(wpX + 1.5 * sc, torsoY - 28 * sc)
            .lineTo(wpX + 5 * sc, torsoY - 18 * sc).fill(0xBBBBCC);
          // Armor plate overlay on torso
          g.roundRect(pcx - 8 * sc, torsoY + 3 * sc, 16 * sc, 10 * sc, 2).fill({ color: lighten(colors.primary, 25), alpha: 0.3 });
          break;
        }
      }

      // --- Name ---
      const nameIdx = 1 + i;
      if (nameIdx < this._uiTexts.length) {
        const nt = this._uiTexts[nameIdx];
        nt.visible = true; nt.style = sel ? sty(24, 0xFFD700, true, 2, true) : sty(17, 0x7777AA, false, 1);
        nt.text = CHAR_NAMES[char]; nt.x = x + cardW / 2 - nt.width / 2; nt.y = cardY + cardH - 100;
      }

      // Special ability label
      const descIdx = 5 + i;
      if (descIdx < this._uiTexts.length) {
        const dt2 = this._uiTexts[descIdx];
        dt2.visible = true; dt2.style = sty(12, sel ? 0xBBBBDD : 0x555577, false, 0);
        dt2.text = stats.special; dt2.x = x + cardW / 2 - dt2.width / 2; dt2.y = cardY + cardH - 72;
      }

      // Stat bars with labels
      const barY = cardY + cardH - 55;
      const barW2 = cardW - 24;
      this._statBar(g, x + 12, barY, barW2, "SPD", stats.speedMul, sel);
      this._statBar(g, x + 12, barY + 16, barW2, "JMP", stats.jumpMul, sel);

      // Selection arrow
      if (sel) {
        const arrowY = cardY - 22 + Math.sin(t * 3) * 6;
        const arrowCx = x + cardW / 2;
        g.moveTo(arrowCx - 12, arrowY).lineTo(arrowCx + 12, arrowY)
          .lineTo(arrowCx, arrowY + 14).fill(0xFFD700);
        g.moveTo(arrowCx - 8, arrowY - 2).lineTo(arrowCx + 8, arrowY - 2)
          .lineTo(arrowCx, arrowY + 10).fill(0xFFEE66);
      }
    }

    // Description
    const selChar = CHAR_LIST[s.charSelectIndex];
    const descText = CHAR_STATS[selChar].desc;
    const t10 = this._uiTexts[10];
    if (t10) {
      t10.visible = true; t10.style = sty(14, 0xAAAACC, false, 1);
      t10.text = descText; t10.x = cx - t10.width / 2; t10.y = sh * 0.84;
    }

    // Controls
    const t11 = this._uiTexts[11];
    if (t11) {
      t11.visible = true; t11.style = sty(13, 0x555577, false, 1);
      t11.text = "< >  Select     ENTER  Confirm     ESC  Back";
      t11.x = cx - t11.width / 2; t11.y = sh * 0.92;
    }
  }

  private _statBar(g: Graphics, x: number, y: number, w: number, label: string, value: number, active: boolean): void {
    const labelW = 28;
    const barW = w - labelW - 4;
    const barH = 8;
    // Label drawn as small rect indicators
    const c = active ? 0x8888AA : 0x555566;
    // Bar background
    g.roundRect(x + labelW, y, barW, barH, 2).fill(0x1A1A2A);
    // Fill
    const fill = Math.min(1, (value - 0.5) / 0.8); // normalize 0.5–1.3 → 0–1
    const fillColor = fill > 0.7 ? 0x44CC44 : fill > 0.4 ? 0xCCCC44 : 0xCC6644;
    g.roundRect(x + labelW, y, barW * fill, barH, 2).fill(active ? fillColor : darken(fillColor, 40));
  }

  private _drawLevelIntro(s: KingdomState): void {
    const g = this._ui;
    g.rect(0, 0, s.sw, s.sh).fill(0x000000);
    const cx = s.sw / 2, cy = s.sh / 2;

    const theme = WORLD_THEMES[Math.min(s.world - 1, WORLD_THEMES.length - 1)];

    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = BIG_TEXT;
    t0.text = `WORLD ${s.world}-${s.level}`; t0.x = cx - t0.width / 2; t0.y = cy - 55;

    const t1 = this._uiTexts[1]; t1.visible = true; t1.style = sty(18, 0xAAAACC, false, 2);
    t1.text = theme.name; t1.x = cx - t1.width / 2; t1.y = cy - 10;

    // Character icon
    const colors = CHAR_COLORS[s.character];
    g.circle(cx - 30, cy + 50, 14).fill(colors.primary);
    g.circle(cx - 30, cy + 42, 8).fill(colors.skin);

    const t2 = this._uiTexts[2]; t2.visible = true; t2.style = SUBTITLE_STYLE;
    t2.text = `x ${s.lives}`; t2.x = cx - 8; t2.y = cy + 40;

    // Decorative line
    g.rect(cx - 80, cy + 80, 160, 1).fill({ color: 0xFFD700, alpha: 0.3 });
  }

  private _drawEscMenu(s: KingdomState): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh;
    const cx = sw / 2, cy = sh / 2;

    // Dimmed background
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });

    // Panel
    const panW = 320, panH = 340;
    const px = cx - panW / 2, py = cy - panH / 2;
    // Outer border
    g.roundRect(px - 3, py - 3, panW + 6, panH + 6, 10).fill({ color: 0xFFD700, alpha: 0.4 });
    // Panel body
    g.roundRect(px, py, panW, panH, 8).fill({ color: 0x0D0D24, alpha: 0.95 });
    // Inner border line
    g.roundRect(px + 4, py + 4, panW - 8, panH - 8, 6).stroke({ color: 0x333366, width: 1 });
    // Header bar
    g.roundRect(px + 8, py + 8, panW - 16, 40, 4).fill({ color: 0x1A1A44, alpha: 0.8 });
    g.rect(px + 8, py + 46, panW - 16, 1).fill({ color: 0xFFD700, alpha: 0.3 });

    // Title
    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = BIG_TEXT;
    t0.text = "PAUSED"; t0.x = cx - t0.width / 2; t0.y = py + 14;

    // Decorative swords crossed
    const decY = py + 30;
    g.moveTo(cx - 30, decY + 16).lineTo(cx - 10, decY + 8).lineTo(cx - 10, decY + 10).lineTo(cx - 28, decY + 18).fill({ color: 0x888899, alpha: 0.3 });
    g.moveTo(cx + 30, decY + 16).lineTo(cx + 10, decY + 8).lineTo(cx + 10, decY + 10).lineTo(cx + 28, decY + 18).fill({ color: 0x888899, alpha: 0.3 });

    // Menu items
    const items = ["Resume", "Controls", "Introduction", "Game Concepts", "Return to Menu"];
    const icons = ["\u25B6", "\u2328", "\u2139", "\u2694", "\u21A9"];
    const itemH = 42;
    const itemsStartY = py + 62;

    for (let i = 0; i < items.length; i++) {
      const iy = itemsStartY + i * itemH;
      const selected = i === s.pauseMenuIndex;
      const btnW = panW - 40;
      const btnX = px + 20;

      if (selected) {
        // Selected button glow
        g.roundRect(btnX - 2, iy - 2, btnW + 4, itemH - 6, 6).fill({ color: 0xFFD700, alpha: 0.15 });
        // Button body
        g.roundRect(btnX, iy, btnW, itemH - 8, 5).fill({ color: 0x1A1A55, alpha: 0.9 });
        // Gold left accent bar
        g.roundRect(btnX, iy, 4, itemH - 8, 2).fill(0xFFD700);
        // Selection arrow
        const arrowX = btnX + 12;
        const arrowY = iy + (itemH - 8) / 2;
        g.moveTo(arrowX, arrowY - 5).lineTo(arrowX + 6, arrowY).lineTo(arrowX, arrowY + 5).fill(0xFFD700);
      } else {
        // Unselected button
        g.roundRect(btnX, iy, btnW, itemH - 8, 5).fill({ color: 0x111133, alpha: 0.6 });
        g.roundRect(btnX, iy, 4, itemH - 8, 2).fill({ color: 0x444466, alpha: 0.5 });
      }

      // Button text
      const ti = 1 + i;
      if (ti < this._uiTexts.length) {
        const txt = this._uiTexts[ti];
        txt.visible = true;
        txt.style = selected ? sty(16, 0xFFD700, true, 1) : sty(15, 0x8888AA, false, 1);
        txt.text = items[i];
        txt.x = btnX + 28;
        txt.y = iy + (itemH - 8) / 2 - 9;
      }

      // Last item (return) gets red tint
      if (i === 4 && selected) {
        g.roundRect(btnX, iy, btnW, itemH - 8, 5).fill({ color: 0x330000, alpha: 0.3 });
      }
    }

    // Footer
    const tf = this._uiTexts[7];
    if (tf) {
      tf.visible = true; tf.style = sty(11, 0x555577, false, 1);
      tf.text = "\u2191\u2193 Navigate     ENTER Select     ESC Resume";
      tf.x = cx - tf.width / 2; tf.y = py + panH - 24;
    }

    // World info in corner
    const tw = this._uiTexts[8];
    if (tw) {
      tw.visible = true; tw.style = sty(10, 0x444466, false, 0);
      tw.text = `World ${s.world}-${s.level}  |  Score: ${s.score}  |  Lives: ${s.lives}`;
      tw.x = cx - tw.width / 2; tw.y = py + panH - 40;
    }
  }

  private _drawEscSubpage(s: KingdomState, page: "controls" | "intro" | "concepts"): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh;
    const cx = sw / 2, cy = sh / 2;

    // Dimmed background
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    // Panel
    const panW = 480, panH = 420;
    const px = cx - panW / 2, py = cy - panH / 2;
    g.roundRect(px - 3, py - 3, panW + 6, panH + 6, 10).fill({ color: 0xFFD700, alpha: 0.3 });
    g.roundRect(px, py, panW, panH, 8).fill({ color: 0x0D0D24, alpha: 0.95 });
    g.roundRect(px + 4, py + 4, panW - 8, panH - 8, 6).stroke({ color: 0x333366, width: 1 });
    // Header
    g.roundRect(px + 8, py + 8, panW - 16, 40, 4).fill({ color: 0x1A1A44, alpha: 0.8 });
    g.rect(px + 8, py + 46, panW - 16, 1).fill({ color: 0xFFD700, alpha: 0.3 });

    const titles: Record<string, string> = {
      controls: "CONTROLS",
      intro: "INTRODUCTION",
      concepts: "GAME CONCEPTS",
    };

    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = BIG_TEXT;
    t0.text = titles[page]; t0.x = cx - t0.width / 2; t0.y = py + 14;

    // Content area
    const contentX = px + 24;
    const contentY = py + 60;
    const lineH = 22;
    let line = 0;

    const drawLine = (text: string, bold = false, color = 0xBBBBDD, indent = 0) => {
      const idx = 1 + line;
      if (idx < this._uiTexts.length) {
        const t = this._uiTexts[idx]; t.visible = true;
        t.style = sty(bold ? 14 : 13, color, bold, bold ? 1 : 0);
        t.text = text; t.x = contentX + indent; t.y = contentY + line * lineH;
      }
      line++;
    };

    const drawKeyLine = (key: string, desc: string) => {
      const y = contentY + line * lineH;
      // Key badge background
      const badgeW = 80;
      g.roundRect(contentX - 2, y - 2, badgeW, lineH - 4, 3)
        .fill({ color: 0x222244, alpha: 0.6 });
      g.roundRect(contentX - 2, y - 2, badgeW, lineH - 4, 3)
        .stroke({ color: 0x444466, width: 1 });
      // Key label (gold, bold) — uses current line slot
      const idx = 1 + line;
      if (idx < this._uiTexts.length) {
        const t = this._uiTexts[idx]; t.visible = true;
        t.style = sty(13, 0xFFD700, true, 0);
        t.text = key;
        t.x = contentX + 4; t.y = y;
      }
      line++;
      // Description (next line slot, indented right of badge)
      const idx2 = 1 + line;
      if (idx2 < this._uiTexts.length) {
        const t = this._uiTexts[idx2]; t.visible = true;
        t.style = sty(13, 0xBBBBDD, false, 0);
        t.text = desc;
        t.x = contentX + badgeW + 12; t.y = y;
      }
      // Don't increment line again — key and desc share the same visual row
      // but use two text slots. Increment was already done above.
    };

    if (page === "controls") {
      drawLine("Movement & Actions", true, 0xFFD700);
      drawKeyLine("\u2190 \u2192 Arrows", "Move left / right");
      drawKeyLine("\u2191 / Space", "Jump (hold for higher)");
      drawKeyLine("\u2193 Down", "Crouch / Slide (while running)");
      drawKeyLine("Z / Shift", "Run (hold while moving)");
      drawKeyLine("X", "Fire / Sword (Arthur)");
      drawKeyLine("C", "Special ability");
      line++;
      drawLine("Character Abilities", true, 0xFFD700);
      drawLine("Arthur  — X: Sword slash (melee attack)", false, 0xCC4444);
      drawLine("Merlin  — Hold jump to hover mid-air", false, 0x4466CC);
      drawLine("Guinevere — Press jump again for double jump", false, 0xEEEEFF);
      drawLine("Lancelot — C: Shield dash (invincible charge)", false, 0xBBBBCC);
      line++;
      drawLine("Menu", true, 0xFFD700);
      drawKeyLine("ESC", "Pause / Resume");
      drawKeyLine("Enter", "Confirm selection");
    } else if (page === "intro") {
      drawLine("The Story of Kingdom", true, 0xFFD700);
      line++;
      drawLine("Mordred, the treacherous knight, has stolen Excalibur");
      drawLine("from Camelot and scattered his dark forces across the");
      drawLine("realm. The kingdom is in peril!");
      line++;
      drawLine("Choose your champion and quest through four worlds");
      drawLine("to reclaim the legendary blade:");
      line++;
      drawLine("World 1: Camelot Fields", false, 0x88CC88);
      drawLine("  The rolling green hills surrounding the castle.", false, 0x88AA88, 8);
      drawLine("World 2: Enchanted Forest", false, 0x44AA44);
      drawLine("  A dark and magical woodland of ancient trees.", false, 0x44AA44, 8);
      drawLine("World 3: Dragon Peaks", false, 0xFF8844);
      drawLine("  Volcanic mountains ruled by fierce dragons.", false, 0xCC6633, 8);
      drawLine("World 4: Mordred's Fortress", false, 0xAA88CC);
      drawLine("  The dark castle where Excalibur awaits.", false, 0x8866AA, 8);
    } else {
      drawLine("Core Mechanics", true, 0xFFD700);
      line++;
      drawLine("Power-ups", true, 0x44CC44);
      drawLine("  Potion (green) — Grow big, survive one extra hit", false, 0xBBBBDD, 8);
      drawLine("  Dragon Breath — Shoot fireballs at enemies", false, 0xBBBBDD, 8);
      drawLine("  Holy Grail — Temporary invincibility", false, 0xBBBBDD, 8);
      drawLine("  Green Crown — Extra life", false, 0xBBBBDD, 8);
      line++;
      drawLine("Enemies", true, 0xCC4444);
      drawLine("  Goblin — Walk into or stomp to defeat", false, 0xBBBBDD, 8);
      drawLine("  Dark Knight — Stomp to shell, kick to launch", false, 0xBBBBDD, 8);
      drawLine("  Bat — Flies and swoops, stomp from above", false, 0xBBBBDD, 8);
      drawLine("  Boar — Charges when near, dodge or stomp", false, 0xBBBBDD, 8);
      drawLine("  Skeleton — Ranged attacker, fires arrows", false, 0xBBBBDD, 8);
      drawLine("  Dragon (boss) — 5 HP, fireballs or stomp 5x", false, 0xBBBBDD, 8);
      line++;
      drawLine("Scoring", true, 0xFFAA00);
      drawLine("  Chain stomps for combo multipliers!", false, 0xBBBBDD, 8);
      drawLine("  100 coins = extra life", false, 0xBBBBDD, 8);
      drawLine("  Reach the flag pole high for bonus points", false, 0xBBBBDD, 8);
    }

    // Footer
    const tf = this._uiTexts[15];
    if (tf) {
      tf.visible = true; tf.style = sty(12, 0x555577, false, 1);
      tf.text = "Press ESC or ENTER to go back";
      tf.x = cx - tf.width / 2; tf.y = py + panH - 24;
    }

    // Decorative scroll corners
    const cornerSize = 12;
    for (const [ix, iy] of [[px + 6, py + 6], [px + panW - 6 - cornerSize, py + 6],
                              [px + 6, py + panH - 6 - cornerSize], [px + panW - 6 - cornerSize, py + panH - 6 - cornerSize]]) {
      g.roundRect(ix, iy, cornerSize, cornerSize, 2).stroke({ color: 0xFFD700, width: 1, alpha: 0.25 });
    }
  }

  private _drawGameOver(s: KingdomState): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh, cx = sw / 2;

    for (let i = 0; i < 6; i++) g.rect(0, i * (sh / 6), sw, sh / 6 + 1).fill(lerpColor(0x1A0000, 0x0A0000, i / 5));

    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = GAME_OVER_STYLE;
    t0.text = "GAME OVER"; t0.x = cx - t0.width / 2; t0.y = sh * 0.2;

    // Broken sword graphic
    const guardY = sh * 0.52;
    const breakY = sh * 0.40;
    const tipX = cx + 16, tipY = sh * 0.30;

    // Glow behind sword
    g.circle(cx, sh * 0.43, 50).fill({ color: 0x550000, alpha: 0.35 });

    // Lower blade (guard up to break, vertical)
    g.moveTo(cx - 5, guardY).lineTo(cx + 5, guardY)
     .lineTo(cx + 2, breakY).lineTo(cx - 2, breakY).fill(0x8899AA);
    // Lower blade highlight
    g.moveTo(cx - 1, guardY - 2).lineTo(cx + 1, guardY - 2)
     .lineTo(cx + 1, breakY + 6).lineTo(cx - 1, breakY + 6).fill(0xCCDDEE);

    // Upper blade (broken off, angled)
    g.moveTo(cx - 2, breakY).lineTo(cx + 2, breakY)
     .lineTo(tipX + 2, tipY + 4).lineTo(tipX, tipY).fill(0x8899AA);
    // Upper blade highlight
    g.moveTo(cx + 1, breakY - 2).lineTo(tipX, tipY + 3)
     .lineTo(tipX + 2, tipY + 5).lineTo(cx + 2, breakY).fill(0xCCDDEE);

    // Jagged break edge
    g.moveTo(cx - 6, breakY + 2).lineTo(cx - 2, breakY - 5)
     .lineTo(cx + 1, breakY - 1).lineTo(cx + 4, breakY - 7)
     .lineTo(cx + 6, breakY - 2).lineTo(cx + 4, breakY + 4)
     .lineTo(cx - 6, breakY + 4).fill(0xBB3322);

    // Cross guard
    g.roundRect(cx - 22, guardY, 44, 10, 4).fill(0x556633);
    g.roundRect(cx - 20, guardY + 2, 40, 5, 2).fill(0x778844);

    // Grip
    const gripTop = guardY + 10;
    g.rect(cx - 5, gripTop, 10, 28).fill(0x6B2E08);
    for (let wi = 0; wi < 3; wi++) {
      g.rect(cx - 5, gripTop + 4 + wi * 9, 10, 4).fill(0x4A1F05);
      g.rect(cx - 4, gripTop + 5 + wi * 9, 8, 2).fill(0x9B5523);
    }

    // Pommel
    const pommY = gripTop + 34;
    g.circle(cx, pommY, 9).fill(0x556633);
    g.circle(cx, pommY, 6).fill(0x778844);
    g.circle(cx, pommY, 3).fill(0x445522);

    const t1 = this._uiTexts[1]; t1.visible = true; t1.style = sty(20, 0xDDDDDD, false, 2);
    t1.text = `Score: ${String(s.score).padStart(7, "0")}`; t1.x = cx - t1.width / 2; t1.y = sh * 0.62;

    const t2 = this._uiTexts[2]; t2.visible = true; t2.style = sty(14, 0x888888, false, 1);
    t2.text = `High Score: ${String(s.highScore).padStart(7, "0")}`; t2.x = cx - t2.width / 2; t2.y = sh * 0.69;

    const t3 = this._uiTexts[3]; t3.visible = true; t3.style = SUBTITLE_STYLE;
    t3.text = "ENTER  try again     ESC  menu"; t3.x = cx - t3.width / 2; t3.y = sh * 0.82;
    t3.alpha = 0.6 + Math.sin(Date.now() / 400) * 0.3;
  }

  private _drawVictory(s: KingdomState): void {
    const g = this._ui;
    const sw = s.sw, sh = s.sh, cx = sw / 2;

    for (let i = 0; i < 8; i++) g.rect(0, i * (sh / 8), sw, sh / 8 + 1).fill(lerpColor(0x0A0A2E, 0x1A1A44, i / 7));

    // Particle sparkles
    for (let i = 0; i < 30; i++) {
      const px = ((i * 97 + Date.now() / 20) % sw);
      const py = ((i * 53 + Date.now() / 35) % sh);
      const a = 0.2 + Math.sin(Date.now() / 300 + i) * 0.2;
      g.circle(px, py, 2).fill({ color: 0xFFD700, alpha: a });
    }

    // Excalibur sword — glowing
    const swordY = sh * 0.22;
    const glow = 0.2 + Math.sin(Date.now() / 250) * 0.1;
    g.circle(cx, swordY + 30, 60).fill({ color: 0xFFD700, alpha: glow });
    g.circle(cx, swordY + 30, 35).fill({ color: 0xFFFFAA, alpha: glow * 1.5 });
    // Blade
    g.moveTo(cx - 5, swordY + 60).lineTo(cx, swordY - 20).lineTo(cx + 5, swordY + 60).fill(0xCCCCDD);
    g.moveTo(cx - 3, swordY + 55).lineTo(cx, swordY - 10).lineTo(cx + 3, swordY + 55).fill(0xDDDDEE);
    // Cross guard
    g.roundRect(cx - 18, swordY + 58, 36, 6, 2).fill(0xFFD700);
    // Grip
    g.rect(cx - 3, swordY + 64, 6, 18).fill(0x8B4513);
    // Pommel
    g.circle(cx, swordY + 85, 5).fill(0xFFD700);
    g.circle(cx, swordY + 85, 3).fill(0xFF4444);

    const t0 = this._uiTexts[0]; t0.visible = true; t0.style = VICTORY_STYLE;
    t0.text = "EXCALIBUR RECLAIMED!"; t0.x = cx - t0.width / 2; t0.y = sh * 0.07;

    const t1 = this._uiTexts[1]; t1.visible = true; t1.style = sty(20, 0xDDDDFF, false, 2);
    t1.text = `${CHAR_NAMES[s.character]} has saved Camelot!`; t1.x = cx - t1.width / 2; t1.y = sh * 0.58;

    const t2 = this._uiTexts[2]; t2.visible = true; t2.style = sty(18, 0xFFFFFF, true, 1, true);
    t2.text = `Final Score: ${String(s.score).padStart(7, "0")}`; t2.x = cx - t2.width / 2; t2.y = sh * 0.66;

    const t3 = this._uiTexts[3]; t3.visible = true; t3.style = sty(14, 0x888888, false, 1);
    t3.text = `High Score: ${String(s.highScore).padStart(7, "0")}`; t3.x = cx - t3.width / 2; t3.y = sh * 0.73;

    const t4 = this._uiTexts[4]; t4.visible = true; t4.style = SUBTITLE_STYLE;
    t4.text = "ENTER  play again     ESC  menu"; t4.x = cx - t4.width / 2; t4.y = sh * 0.85;
    t4.alpha = 0.6 + Math.sin(Date.now() / 400) * 0.3;
  }
}
