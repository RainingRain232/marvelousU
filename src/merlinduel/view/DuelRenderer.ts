// ---------------------------------------------------------------------------
// Merlin's Duel — PixiJS Renderer
// Procedural canvas drawing each frame with atmospheric wizard combat visuals
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { DuelPhase, Element, SpellId } from "../types";
import type { DuelState, DuelMeta, Projectile } from "../types";
import { DUEL_BALANCE as B, SHOP_ITEMS, OPPONENTS, getElementColor } from "../config/DuelBalance";
import { getAvailableSpells } from "../systems/DuelGameSystem";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0x7744dd, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x110033, distance: 5, blur: 14, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: 0x8899cc, fontStyle: "italic", letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 4, alpha: 0.5 } });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x6688aa, lineHeight: 19, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.3 } });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xdddddd, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.7 } });
const STYLE_HUD_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x99aacc, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.5 } });
const STYLE_COUNTDOWN = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 72, fill: 0xffdd44, fontWeight: "bold", dropShadow: { color: 0x442200, distance: 4, blur: 12, alpha: 0.9 } });
const STYLE_ROUND_END = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 44, fill: 0x44dd66, fontWeight: "bold", dropShadow: { color: 0x114422, distance: 4, blur: 10, alpha: 0.9 } });
const STYLE_DEFEAT_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 44, fill: 0xff4466, fontWeight: "bold", dropShadow: { color: 0x440011, distance: 4, blur: 10, alpha: 0.9 } });
const STYLE_VICTORY_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0xffd700, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x443300, distance: 5, blur: 14, alpha: 0.9 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xdddddd, lineHeight: 24, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.4 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 20, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x220044, distance: 2, blur: 5, alpha: 0.6 } });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 36, fill: 0xbb99ee, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x220044, distance: 3, blur: 8, alpha: 0.7 } });
const STYLE_SHOP_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 26, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x442200, distance: 3, blur: 8, alpha: 0.8 } });
const STYLE_SHOP_ITEM = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xdddddd, lineHeight: 20, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.4 } });
const STYLE_ELEMENT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_MSG = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8899aa, lineHeight: 16, wordWrap: true, wordWrapWidth: 250, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.4 } });

const FLOAT_POOL = 16;
const ELEM_ORDER: Element[] = [Element.FIRE, Element.ICE, Element.LIGHTNING, Element.ARCANE];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sign(v: number): number { return v > 0 ? 1 : v < 0 ? -1 : 0; }

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class DuelRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudSmall = new Text({ text: "", style: STYLE_HUD_SMALL });
  private _titleText = new Text({ text: "MERLIN'S DUEL", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "A Wizard's Tournament of Elemental Mastery", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _deathTitle = new Text({ text: "", style: STYLE_DEFEAT_TITLE });
  private _victoryTitle = new Text({ text: "GRAND CHAMPION!", style: STYLE_VICTORY_TITLE });
  private _roundEndText = new Text({ text: "", style: STYLE_ROUND_END });
  private _statsText = new Text({ text: "", style: STYLE_STAT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _countdownText = new Text({ text: "", style: STYLE_COUNTDOWN });
  private _msgText = new Text({ text: "", style: STYLE_MSG });
  private _shopTitle = new Text({ text: "", style: STYLE_SHOP_TITLE });
  private _shopItems = new Text({ text: "", style: STYLE_SHOP_ITEM });
  private _elementText = new Text({ text: "", style: STYLE_ELEMENT });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _sw = 0; private _sh = 0;

  // Ambient background sparkles (initialized once)
  private _sparkles: { x: number; y: number; sz: number; phase: number; speed: number; color: number }[] = [];
  private _sparklesInit = false;
  // Fog wisps drifting across
  private _fogWisps: { x: number; y: number; w: number; h: number; speed: number; phase: number }[] = [];
  private _fogWispsInit = false;
  // Static rune positions on arena floor
  private _runes: { x: number; y: number; angle: number; sz: number }[] = [];
  private _runesInit = false;

  build(sw: number, sh: number): void {
    this._sw = sw; this._sh = sh;
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);

    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.95 } }) });
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
    this.container.addChild(this._floatContainer);

    for (const txt of [
      this._hudText, this._hudSmall, this._titleText, this._subtitleText,
      this._controlsText, this._promptText, this._deathTitle, this._victoryTitle,
      this._roundEndText, this._statsText, this._pauseText, this._countdownText,
      this._msgText, this._shopTitle, this._shopItems, this._elementText,
    ]) {
      txt.visible = false;
      this.container.addChild(txt);
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
    this._uiGfx.destroy();
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  render(state: DuelState, sw: number, sh: number, meta: DuelMeta): void {
    this._sw = sw; this._sh = sh;
    const g = this._gfx;
    const ui = this._uiGfx;
    g.clear(); ui.clear();

    const scaleX = sw / B.CANVAS_W, scaleY = sh / B.CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    const offX = (sw - B.CANVAS_W * scale) / 2;
    const offY = (sh - B.CANVAS_H * scale) / 2;

    let shakeX = 0, shakeY = 0, shakeRot = 0;
    if (state.screenShake > 0) {
      const intensity = B.SHAKE_INTENSITY * (state.screenShake / B.SHAKE_DURATION);
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
      shakeRot = (Math.random() - 0.5) * intensity * 0.008;
    }

    // Apply slight rotation via container pivot for shake
    this._gfx.rotation = shakeRot;
    this._gfx.pivot.set(sw / 2, sh / 2);
    this._gfx.position.set(sw / 2, sh / 2);

    const tx = (x: number) => offX + x * scale + shakeX;
    const ty = (y: number) => offY + y * scale + shakeY;
    const ts = (s: number) => s * scale;
    const time = state.time;

    // Background with atmospheric effects
    this._drawBackground(g, tx, ty, ts, time);

    this._hideAll();

    switch (state.phase) {
      case DuelPhase.START:
        this._renderStart(state, meta, g, tx, ty, ts, time);
        break;
      case DuelPhase.COUNTDOWN:
        this._drawArena(g, tx, ty, ts, time);
        this._drawWizards(g, state, tx, ty, ts, time);
        this._drawHUD(state, ui, tx, ty, ts);
        this._renderCountdown(state, g, tx, ty, ts);
        break;
      case DuelPhase.FIGHTING:
        this._drawArena(g, tx, ty, ts, time);
        this._drawShield(g, state, tx, ty, ts, time);
        this._drawProjectiles(g, state, tx, ty, ts, time);
        this._drawWizards(g, state, tx, ty, ts, time);
        this._drawParticles(g, state, tx, ty, ts);
        this._drawHUD(state, ui, tx, ty, ts);
        this._drawSpellBar(g, ui, state, tx, ty, ts, time);
        break;
      case DuelPhase.ROUND_END:
        this._drawArena(g, tx, ty, ts, time);
        this._drawWizards(g, state, tx, ty, ts, time);
        this._drawParticles(g, state, tx, ty, ts);
        this._renderRoundEnd(state, g, tx, ty, ts, time);
        break;
      case DuelPhase.SHOP:
        this._renderShop(state, g, tx, ty, ts, time);
        break;
      case DuelPhase.VICTORY:
        this._renderVictory(state, meta, g, tx, ty, ts, time);
        break;
      case DuelPhase.DEFEAT:
        this._renderDefeat(state, meta, g, tx, ty, ts, time);
        break;
      case DuelPhase.PAUSED:
        this._drawArena(g, tx, ty, ts, time);
        this._drawShield(g, state, tx, ty, ts, time);
        this._drawProjectiles(g, state, tx, ty, ts, time);
        this._drawWizards(g, state, tx, ty, ts, time);
        this._drawParticles(g, state, tx, ty, ts);
        this._drawHUD(state, ui, tx, ty, ts);
        this._drawSpellBar(g, ui, state, tx, ty, ts, time);
        this._renderPause(g, tx, ty);
        break;
    }

    // Screen flash overlay with element tint and radial bloom from impact
    if (state.screenFlash > 0) {
      const flashRatio = state.screenFlash / B.FLASH_DURATION;
      const flashAlpha = Math.min(0.35, flashRatio * 0.35);
      const flashCol = getElementColor(state.selectedElement);
      // Full screen tint
      g.rect(0, 0, sw, sh).fill({ color: flashCol, alpha: flashAlpha * 0.6 });
      // Radial bloom rings from center expanding outward
      for (let r = 0; r < 5; r++) {
        const bloomR = (1 - flashRatio) * 200 + r * 40;
        const bloomA = flashAlpha * (0.12 - r * 0.02);
        if (bloomA > 0) {
          g.circle(tx(B.CANVAS_W / 2), ty(B.CANVAS_H / 2), ts(bloomR)).fill({ color: flashCol, alpha: bloomA });
        }
      }
      // Bright core flash
      g.circle(tx(B.CANVAS_W / 2), ty(B.CANVAS_H / 2), ts(40 * flashRatio)).fill({ color: 0xffffff, alpha: flashAlpha * 0.3 });
    }

    // Vignette darkens more during intense moments (combat with many projectiles)
    if (state.phase === DuelPhase.FIGHTING && state.projectiles.length > 3) {
      const vigIntensity = Math.min(0.12, state.projectiles.length * 0.015);
      const ve2 = 80;
      g.rect(0, 0, sw, ve2).fill({ color: 0x000000, alpha: vigIntensity });
      g.rect(0, sh - ve2, sw, ve2).fill({ color: 0x000000, alpha: vigIntensity });
      g.rect(0, 0, ve2, sh).fill({ color: 0x000000, alpha: vigIntensity * 0.7 });
      g.rect(sw - ve2, 0, ve2, sh).fill({ color: 0x000000, alpha: vigIntensity * 0.7 });
    }

    this._renderFloatTexts(state, tx, ty);
  }

  // -----------------------------------------------------------------------
  // Background — dark gradient, nebula glow, sparkles, vignette
  // -----------------------------------------------------------------------

  private _initSparkles(): void {
    if (this._sparklesInit) return; this._sparklesInit = true;
    const cols = [0x6644aa, 0x4466cc, 0x8855dd, 0x5533bb, 0x7766ee, 0x3344aa, 0x9977ff, 0x5544bb, 0xaabbff, 0x8899dd, 0xccaaff];
    for (let i = 0; i < 200; i++) {
      this._sparkles.push({
        x: Math.random() * B.CANVAS_W, y: Math.random() * B.CANVAS_H,
        sz: Math.random() * 3.0 + 0.2, phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.7 + 0.15,
        color: cols[Math.floor(Math.random() * cols.length)],
      });
    }
  }

  private _initFogWisps(): void {
    if (this._fogWispsInit) return; this._fogWispsInit = true;
    for (let i = 0; i < 12; i++) {
      this._fogWisps.push({
        x: Math.random() * B.CANVAS_W,
        y: 80 + Math.random() * (B.CANVAS_H - 160),
        w: 60 + Math.random() * 120,
        h: 8 + Math.random() * 20,
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _drawBackground(g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    g.rect(0, 0, this._sw, this._sh).fill(B.COLOR_BG);

    // Subtle gradient layers — top darker
    for (let i = 0; i < 8; i++) {
      const y = i * (B.CANVAS_H / 8);
      const a = 0.045 - i * 0.005;
      if (a > 0) g.rect(tx(0), ty(y), ts(B.CANVAS_W), ts(B.CANVAS_H / 8)).fill({ color: 0x000011, alpha: a });
    }

    // Distant mountain/tower silhouettes in the background
    const horizonY = B.ARENA_TOP + 30;
    // Mountain range
    const mtnPts = [
      [0, horizonY + 20], [60, horizonY - 10], [110, horizonY + 5], [170, horizonY - 30], [220, horizonY - 5],
      [280, horizonY - 45], [330, horizonY - 15], [400, horizonY - 55], [470, horizonY - 20],
      [520, horizonY - 40], [580, horizonY - 10], [640, horizonY - 25], [700, horizonY + 5],
      [750, horizonY - 15], [800, horizonY + 20],
    ];
    g.moveTo(tx(0), ty(B.ARENA_BOTTOM));
    for (const [mx, my] of mtnPts) g.lineTo(tx(mx), ty(my));
    g.lineTo(tx(B.CANVAS_W), ty(B.ARENA_BOTTOM)).closePath().fill({ color: 0x0a0a1e, alpha: 0.35 });
    // Second layer (closer mountains, slightly lighter)
    g.moveTo(tx(0), ty(B.ARENA_BOTTOM));
    g.lineTo(tx(0), ty(horizonY + 40)).lineTo(tx(80), ty(horizonY + 10)).lineTo(tx(160), ty(horizonY + 30));
    g.lineTo(tx(250), ty(horizonY)).lineTo(tx(350), ty(horizonY + 25)).lineTo(tx(450), ty(horizonY - 10));
    g.lineTo(tx(550), ty(horizonY + 15)).lineTo(tx(650), ty(horizonY + 5)).lineTo(tx(740), ty(horizonY + 30));
    g.lineTo(tx(B.CANVAS_W), ty(horizonY + 20)).lineTo(tx(B.CANVAS_W), ty(B.ARENA_BOTTOM)).closePath()
      .fill({ color: 0x0e0e24, alpha: 0.25 });

    // Tower silhouettes
    const towers = [[150, 55], [400, 70], [650, 50]];
    for (const [towerX, towerH] of towers) {
      const tw = 8, tBase = horizonY - 5;
      g.rect(tx(towerX - tw / 2), ty(tBase - towerH), ts(tw), ts(towerH)).fill({ color: 0x08081a, alpha: 0.4 });
      // Turret top
      g.moveTo(tx(towerX - tw), ty(tBase - towerH)).lineTo(tx(towerX), ty(tBase - towerH - 12))
        .lineTo(tx(towerX + tw), ty(tBase - towerH)).closePath().fill({ color: 0x08081a, alpha: 0.4 });
      // Tiny window glow
      const windowGlow = 0.15 + Math.sin(time * 0.5 + towerX * 0.01) * 0.08;
      g.circle(tx(towerX), ty(tBase - towerH * 0.6), ts(1.5)).fill({ color: 0xffcc44, alpha: windowGlow });
    }

    // Nebula glow patches
    const np = time * 0.15;
    g.circle(tx(240), ty(150), ts(180)).fill({ color: 0x220044, alpha: 0.04 + Math.sin(np) * 0.01 });
    g.circle(tx(560), ty(200), ts(150)).fill({ color: 0x001133, alpha: 0.035 + Math.sin(np + 2) * 0.01 });
    g.circle(tx(400), ty(300), ts(200)).fill({ color: 0x110033, alpha: 0.03 + Math.sin(np + 4) * 0.008 });
    g.circle(tx(120), ty(100), ts(120)).fill({ color: 0x110022, alpha: 0.025 + Math.sin(np + 1) * 0.008 });
    g.circle(tx(680), ty(120), ts(100)).fill({ color: 0x001122, alpha: 0.03 + Math.sin(np + 3) * 0.01 });

    // Floating sparkle particles with size variation and glow halos
    this._initSparkles();
    for (const s of this._sparkles) {
      const twinkle = Math.sin(time * s.speed + s.phase);
      const a = 0.18 + twinkle * 0.15;
      if (a > 0.05) {
        // Large sparkles get extra halo layers
        if (s.sz > 2.0) {
          g.circle(tx(s.x), ty(s.y), ts(s.sz * 5)).fill({ color: s.color, alpha: a * 0.06 });
        }
        g.circle(tx(s.x), ty(s.y), ts(s.sz * 3)).fill({ color: s.color, alpha: a * 0.12 });
        g.circle(tx(s.x), ty(s.y), ts(s.sz)).fill({ color: s.color, alpha: a });
        // Bright core for larger sparkles
        if (s.sz > 1.5) {
          g.circle(tx(s.x), ty(s.y), ts(s.sz * 0.4)).fill({ color: 0xffffff, alpha: a * 0.3 });
        }
      }
    }

    // Atmospheric fog wisps drifting across
    this._initFogWisps();
    for (const fw of this._fogWisps) {
      const driftX = (fw.x + time * fw.speed * 15) % (B.CANVAS_W + fw.w * 2) - fw.w;
      const driftY = fw.y + Math.sin(time * 0.3 + fw.phase) * 8;
      const fogAlpha = 0.02 + Math.sin(time * 0.5 + fw.phase) * 0.01;
      g.ellipse(tx(driftX), ty(driftY), ts(fw.w), ts(fw.h)).fill({ color: 0x6655aa, alpha: fogAlpha });
      g.ellipse(tx(driftX + fw.w * 0.3), ty(driftY - fw.h * 0.2), ts(fw.w * 0.6), ts(fw.h * 0.7))
        .fill({ color: 0x8877cc, alpha: fogAlpha * 0.6 });
    }

    // Vignette — darken edges with smoother falloff
    const ve = 60;
    for (let v = 0; v < 3; v++) {
      const vOff = v * (ve / 3);
      const vA = 0.08 * (1 - v / 3);
      g.rect(tx(0), ty(vOff), ts(B.CANVAS_W), ts(ve / 3)).fill({ color: 0x000000, alpha: vA });
      g.rect(tx(0), ty(B.CANVAS_H - ve + vOff), ts(B.CANVAS_W), ts(ve / 3)).fill({ color: 0x000000, alpha: 0.1 * (1 - v / 3) });
      g.rect(tx(vOff), ty(0), ts(ve / 3), ts(B.CANVAS_H)).fill({ color: 0x000000, alpha: vA * 0.8 });
      g.rect(tx(B.CANVAS_W - ve + vOff), ty(0), ts(ve / 3), ts(B.CANVAS_H)).fill({ color: 0x000000, alpha: vA * 0.8 });
    }
  }

  // -----------------------------------------------------------------------
  // Arena — stone floor, arcane circles, runes, pillars
  // -----------------------------------------------------------------------

  private _initRunes(): void {
    if (this._runesInit) return; this._runesInit = true;
    for (let i = 0; i < 14; i++) {
      this._runes.push({
        x: 60 + Math.random() * (B.CANVAS_W - 120),
        y: B.ARENA_BOTTOM - 8 + Math.random() * 16,
        angle: Math.random() * Math.PI * 2,
        sz: 4 + Math.random() * 6,
      });
    }
  }

  private _drawArena(g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const floorY = B.ARENA_BOTTOM;

    // Stone floor
    g.rect(tx(0), ty(floorY), ts(B.CANVAS_W), ts(B.CANVAS_H - floorY)).fill(B.COLOR_ARENA_FLOOR);

    // Floor edge highlight
    g.setStrokeStyle({ width: ts(1.5), color: 0x444466, alpha: 0.5 });
    g.moveTo(tx(0), ty(floorY)).lineTo(tx(B.CANVAS_W), ty(floorY)).stroke();

    // Stone tile texture with individual tile lines
    for (let x = 0; x < B.CANVAS_W; x += 40) {
      const h = ((x * 374761 + 137) ^ ((x * 374761 + 137) >> 13)) >>> 0;
      const shade = 0x1a1a30 + (h % 16) * 0x010101;
      g.rect(tx(x), ty(floorY + 2), ts(38), ts(B.CANVAS_H - floorY - 2)).fill({ color: shade, alpha: 0.25 });
      // Vertical tile divider lines
      g.setStrokeStyle({ width: ts(0.5), color: 0x111122, alpha: 0.4 });
      g.moveTo(tx(x), ty(floorY + 1)).lineTo(tx(x), ty(B.CANVAS_H)).stroke();
    }
    // Horizontal tile line
    g.setStrokeStyle({ width: ts(0.5), color: 0x111122, alpha: 0.3 });
    g.moveTo(tx(0), ty(floorY + 18)).lineTo(tx(B.CANVAS_W), ty(floorY + 18)).stroke();

    // Floor cracks
    const cracks = [[80, floorY + 5, 35, 12], [250, floorY + 8, 20, 8], [500, floorY + 3, 30, 15], [650, floorY + 10, 25, 6]];
    g.setStrokeStyle({ width: ts(0.6), color: 0x0a0a18, alpha: 0.35 });
    for (const [cx2, cy2, len, depth] of cracks) {
      g.moveTo(tx(cx2), ty(cy2));
      g.lineTo(tx(cx2 + len * 0.4), ty(cy2 + depth * 0.3));
      g.lineTo(tx(cx2 + len * 0.6), ty(cy2 + depth * 0.7));
      g.lineTo(tx(cx2 + len), ty(cy2 + depth)).stroke();
      // Branch crack
      g.moveTo(tx(cx2 + len * 0.4), ty(cy2 + depth * 0.3));
      g.lineTo(tx(cx2 + len * 0.5 + 8), ty(cy2 + depth * 0.1)).stroke();
    }

    // Moss patches on floor
    const mosses = [[120, floorY + 6], [340, floorY + 12], [580, floorY + 4], [720, floorY + 14]];
    for (const [mx, my] of mosses) {
      g.ellipse(tx(mx), ty(my), ts(8), ts(3)).fill({ color: 0x224422, alpha: 0.18 });
      g.ellipse(tx(mx + 3), ty(my - 1), ts(5), ts(2)).fill({ color: 0x336633, alpha: 0.12 });
      g.circle(tx(mx - 2), ty(my + 1), ts(2)).fill({ color: 0x2a4a2a, alpha: 0.1 });
    }

    // Arena border lines
    g.rect(tx(0), ty(B.ARENA_TOP), ts(B.CANVAS_W), ts(2)).fill({ color: 0x334466, alpha: 0.5 });
    g.rect(tx(0), ty(B.ARENA_BOTTOM - 2), ts(B.CANVAS_W), ts(2)).fill({ color: 0x334466, alpha: 0.5 });

    // Arcane circles in center — 7 nested rings with different rotation speeds
    const cx = B.CANVAS_W / 2, cy = (B.ARENA_TOP + B.ARENA_BOTTOM) / 2;
    const cr = 65;
    const ca = 0.07 + Math.sin(time * 0.8) * 0.025;
    // Outermost fill
    g.circle(tx(cx), ty(cy), ts(cr + 8)).fill({ color: 0x3311aa, alpha: ca * 0.15 });
    g.circle(tx(cx), ty(cy), ts(cr)).fill({ color: 0x4422aa, alpha: ca * 0.4 });

    // 7 concentric rings with varied speeds and colors
    const ringDefs = [
      { ratio: 1.12, w: 0.8, col: 0x3311aa, aMul: 0.4, speed: 0.15, dots: 12 },
      { ratio: 1.0,  w: 1.5, col: 0x6644cc, aMul: 1.0, speed: 0.25, dots: 8 },
      { ratio: 0.82, w: 1.0, col: 0x7755dd, aMul: 0.7, speed: -0.35, dots: 10 },
      { ratio: 0.65, w: 0.9, col: 0x5533bb, aMul: 0.55, speed: 0.5, dots: 6 },
      { ratio: 0.48, w: 0.8, col: 0x8866ee, aMul: 0.5, speed: -0.4, dots: 8 },
      { ratio: 0.32, w: 0.7, col: 0x6644cc, aMul: 0.45, speed: 0.6, dots: 5 },
      { ratio: 0.18, w: 0.6, col: 0x9977ff, aMul: 0.4, speed: -0.8, dots: 4 },
    ];
    for (const rd of ringDefs) {
      g.setStrokeStyle({ width: ts(rd.w), color: rd.col, alpha: ca * rd.aMul });
      g.circle(tx(cx), ty(cy), ts(cr * rd.ratio)).stroke();
      // Rune dots rotating on this ring
      for (let i = 0; i < rd.dots; i++) {
        const a = (i / rd.dots) * Math.PI * 2 + time * rd.speed;
        const rx = cx + Math.cos(a) * cr * rd.ratio * 0.95;
        const ry = cy + Math.sin(a) * cr * rd.ratio * 0.5;
        g.circle(tx(rx), ty(ry), ts(1.5)).fill({ color: 0x8866ee, alpha: ca * rd.aMul * 1.2 });
      }
    }

    // Pulsing energy veins connecting player and enemy positions
    const playerFloorX = B.PLAYER_X, enemyFloorX = B.ENEMY_X;
    const veinY = floorY + 5;
    const veinPulse = time * 3;
    const veinSegs = 24;
    for (let v = 0; v < 3; v++) {
      const veinOffY = v * 5;
      g.setStrokeStyle({ width: ts(0.6 + v * 0.2), color: 0x4422aa, alpha: 0.04 + Math.sin(veinPulse + v) * 0.02 });
      g.moveTo(tx(playerFloorX + 20), ty(veinY + veinOffY));
      for (let s = 1; s <= veinSegs; s++) {
        const t = s / veinSegs;
        const vx = playerFloorX + 20 + (enemyFloorX - 20 - playerFloorX - 20) * t;
        const vy = veinY + veinOffY + Math.sin(t * Math.PI * 4 + veinPulse + v * 2) * 3;
        g.lineTo(tx(vx), ty(vy));
      }
      g.stroke();
    }
    // Pulsing energy nodes along veins
    for (let n = 0; n < 8; n++) {
      const t = (n + 0.5) / 8;
      const nx = playerFloorX + 20 + (enemyFloorX - 20 - playerFloorX - 20) * t;
      const nodePulse = Math.sin(veinPulse * 1.5 + n * 1.2) * 0.5 + 0.5;
      g.circle(tx(nx), ty(veinY + 5), ts(2)).fill({ color: 0x6644cc, alpha: 0.06 * nodePulse });
      g.circle(tx(nx), ty(veinY + 5), ts(4)).fill({ color: 0x4422aa, alpha: 0.025 * nodePulse });
    }

    // Floor runes (glowing)
    this._initRunes();
    for (const r of this._runes) {
      const ra = 0.05 + Math.sin(time * 0.5 + r.angle) * 0.025;
      g.circle(tx(r.x), ty(r.y), ts(r.sz)).fill({ color: 0x4422aa, alpha: ra });
      const rs = r.sz * 0.5;
      g.setStrokeStyle({ width: ts(0.7), color: 0x7755dd, alpha: ra * 2 });
      g.moveTo(tx(r.x - rs), ty(r.y)).lineTo(tx(r.x + rs), ty(r.y)).stroke();
      g.moveTo(tx(r.x), ty(r.y - rs)).lineTo(tx(r.x), ty(r.y + rs)).stroke();
      // Diagonal rune crosses
      g.setStrokeStyle({ width: ts(0.5), color: 0x6644cc, alpha: ra * 1.2 });
      g.moveTo(tx(r.x - rs * 0.7), ty(r.y - rs * 0.7)).lineTo(tx(r.x + rs * 0.7), ty(r.y + rs * 0.7)).stroke();
      g.moveTo(tx(r.x + rs * 0.7), ty(r.y - rs * 0.7)).lineTo(tx(r.x - rs * 0.7), ty(r.y + rs * 0.7)).stroke();
    }

    // Pillars on sides
    this._drawPillar(g, 15, floorY, tx, ty, ts, time);
    this._drawPillar(g, B.CANVAS_W - 35, floorY, tx, ty, ts, time);
  }

  private _drawPillar(g: Graphics, x: number, floorY: number, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const pw = 20, ph = 170, py = floorY - ph;
    // Body
    g.rect(tx(x), ty(py), ts(pw), ts(ph)).fill({ color: 0x333355, alpha: 0.65 });
    // Highlight edge
    g.rect(tx(x + 2), ty(py), ts(3), ts(ph)).fill({ color: 0x444477, alpha: 0.25 });

    // Brick/stone texture pattern
    const brickH = 10;
    for (let by = 0; by < ph; by += brickH) {
      const row = Math.floor(by / brickH);
      const brickOff = (row % 2) * (pw * 0.4);
      // Horizontal mortar line
      g.setStrokeStyle({ width: ts(0.4), color: 0x222244, alpha: 0.35 });
      g.moveTo(tx(x), ty(py + by)).lineTo(tx(x + pw), ty(py + by)).stroke();
      // Vertical mortar (staggered)
      g.moveTo(tx(x + brickOff + pw * 0.5), ty(py + by)).lineTo(tx(x + brickOff + pw * 0.5), ty(py + by + brickH)).stroke();
      // Slight color variation per brick
      const brickShade = ((row * 7 + 3) % 5) * 0.01;
      if (brickShade > 0.02) {
        g.rect(tx(x + 1), ty(py + by + 1), ts(pw - 2), ts(brickH - 1)).fill({ color: 0x444477, alpha: brickShade });
      }
    }

    // Cap
    g.rect(tx(x - 3), ty(py - 5), ts(pw + 6), ts(8)).fill({ color: 0x444466, alpha: 0.75 });
    g.rect(tx(x - 1), ty(py - 3), ts(pw + 2), ts(3)).fill({ color: 0x555577, alpha: 0.3 });
    // Base with stepped detail
    g.rect(tx(x - 2), ty(floorY - 4), ts(pw + 4), ts(6)).fill({ color: 0x444466, alpha: 0.75 });
    g.rect(tx(x - 4), ty(floorY - 2), ts(pw + 8), ts(4)).fill({ color: 0x3a3a5a, alpha: 0.5 });

    // Ivy/moss patches on pillar
    const ivyPatches = [
      [x + 1, py + 20, 6, 10], [x + pw - 5, py + 60, 5, 12],
      [x + 2, py + 100, 7, 8], [x + pw - 7, py + 140, 6, 14],
    ];
    for (const [ix, iy, iw, ih] of ivyPatches) {
      g.ellipse(tx(ix + iw / 2), ty(iy + ih / 2), ts(iw / 2), ts(ih / 2)).fill({ color: 0x2a4a2a, alpha: 0.2 });
      // Ivy leaf dots
      for (let l = 0; l < 3; l++) {
        const lx = ix + Math.random() * iw;
        const ly = iy + l * (ih / 3);
        g.circle(tx(lx), ty(ly), ts(1.5)).fill({ color: 0x336633, alpha: 0.18 });
      }
    }

    // Flickering torch flame on top (replaces simple orb)
    const ox = x + pw / 2, oy = py - 10;
    const flicker = Math.sin(time * 8 + x) * 0.3 + Math.sin(time * 13 + x * 2) * 0.15;
    const flameIntensity = 0.7 + flicker;

    // Torch bracket
    g.rect(tx(ox - 2), ty(py - 2), ts(4), ts(4)).fill({ color: 0x554433, alpha: 0.7 });

    // Multi-layer fire: outer (red), mid (orange), inner (yellow), core (white)
    // Outer flame
    g.moveTo(tx(ox - 5), ty(oy + 2)).quadraticCurveTo(tx(ox - 6 + flicker * 3), ty(oy - 10), tx(ox), ty(oy - 16 - flicker * 4))
      .quadraticCurveTo(tx(ox + 6 - flicker * 2), ty(oy - 10), tx(ox + 5), ty(oy + 2)).closePath()
      .fill({ color: 0xcc2200, alpha: 0.35 * flameIntensity });
    // Mid flame
    g.moveTo(tx(ox - 3.5), ty(oy + 1)).quadraticCurveTo(tx(ox - 4 + flicker * 2), ty(oy - 7), tx(ox), ty(oy - 12 - flicker * 3))
      .quadraticCurveTo(tx(ox + 4 - flicker), ty(oy - 7), tx(ox + 3.5), ty(oy + 1)).closePath()
      .fill({ color: 0xff6600, alpha: 0.5 * flameIntensity });
    // Inner flame
    g.moveTo(tx(ox - 2), ty(oy)).quadraticCurveTo(tx(ox - 2 + flicker), ty(oy - 5), tx(ox), ty(oy - 8 - flicker * 2))
      .quadraticCurveTo(tx(ox + 2 - flicker * 0.5), ty(oy - 5), tx(ox + 2), ty(oy)).closePath()
      .fill({ color: 0xffaa22, alpha: 0.65 * flameIntensity });
    // Core
    g.ellipse(tx(ox), ty(oy - 3), ts(1.2), ts(3)).fill({ color: 0xffeeaa, alpha: 0.8 * flameIntensity });

    // Fire glow halos
    g.circle(tx(ox), ty(oy - 6), ts(14)).fill({ color: 0xff6600, alpha: 0.05 * flameIntensity });
    g.circle(tx(ox), ty(oy - 6), ts(25)).fill({ color: 0xff4400, alpha: 0.02 * flameIntensity });

    // Sparks flying up from torch
    for (let s = 0; s < 4; s++) {
      const sparkPhase = (time * 4 + s * 1.7 + x * 0.1) % 3;
      if (sparkPhase < 2) {
        const sparkX = ox + Math.sin(time * 6 + s * 2.5) * 4;
        const sparkY = oy - 8 - sparkPhase * 14;
        const sparkA = 0.4 * (1 - sparkPhase / 2);
        g.circle(tx(sparkX), ty(sparkY), ts(0.8)).fill({ color: 0xffcc44, alpha: sparkA });
      }
    }

    // Smoke wisps above flame
    for (let s = 0; s < 2; s++) {
      const smokePhase = (time * 1.5 + s * 2 + x * 0.05) % 4;
      const smokeX = ox + Math.sin(time * 0.8 + s * 3) * 6;
      const smokeY = oy - 18 - smokePhase * 8;
      const smokeAlpha = 0.04 * Math.max(0, 1 - smokePhase / 4);
      if (smokeAlpha > 0.005) {
        g.ellipse(tx(smokeX), ty(smokeY), ts(3 + smokePhase * 1.5), ts(2 + smokePhase)).fill({ color: 0x555566, alpha: smokeAlpha });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Wizard sprites (procedural)
  // -----------------------------------------------------------------------

  private _drawWizards(g: Graphics, state: DuelState, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    // Player (Merlin) with idle bobbing
    const pBob = Math.sin(time * 2) * 2;
    let casting = false;
    if (state.playerCooldowns) { for (const k in state.playerCooldowns) { if (state.playerCooldowns[k] > 0) { casting = true; break; } } }
    this._drawMerlin(g, B.PLAYER_X, state.playerY + pBob, tx, ty, ts, time, casting, state.playerHp < state.playerMaxHp * 0.3, state.shieldActive);

    // Enemy wizard
    if (state.enemy && !state.enemy.defeated) {
      const eBob = Math.sin(time * 2.2 + 1) * 2;
      this._drawEnemyWizard(g, state.enemy.color, B.ENEMY_X, state.enemyY + eBob, state.enemy.hp / state.enemy.maxHp, tx, ty, ts, time);
    }
  }

  private _drawMerlin(g: Graphics, x: number, y: number, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number, casting: boolean, lowHp: boolean, shielding: boolean): void {
    const bH = 36, bTop = y - bH;
    const topW = 10, botW = 18;

    // Idle breathing bob
    const breathBob = Math.sin(time * 1.8) * 0.8;
    const drawY = y + breathBob;
    const drawBTop = bTop + breathBob;

    // Overall magic aura
    g.circle(tx(x), ty(drawY - bH / 2), ts(42)).fill({ color: 0x4466cc, alpha: 0.025 + Math.sin(time * 1.2) * 0.01 });
    g.circle(tx(x), ty(drawY - bH / 2), ts(55)).fill({ color: 0x3355aa, alpha: 0.01 + Math.sin(time * 0.8) * 0.005 });

    // Cape billowing behind (wave animation)
    const capeWave = Math.sin(time * 2.5) * 3;
    const capeWave2 = Math.sin(time * 3.2 + 1) * 2;
    g.moveTo(tx(x - topW - 2), ty(drawBTop + 2))
      .quadraticCurveTo(tx(x - topW - 8 + capeWave), ty(drawBTop + bH * 0.3), tx(x - botW - 6 + capeWave2), ty(drawBTop + bH * 0.6))
      .lineTo(tx(x - botW - 6 + capeWave2), ty(drawY + 4))
      .lineTo(tx(x - botW), ty(drawY))
      .lineTo(tx(x - topW), ty(drawBTop)).closePath()
      .fill({ color: 0x1a2288, alpha: 0.7 });
    // Cape inner lining
    g.moveTo(tx(x - topW - 1), ty(drawBTop + 4))
      .quadraticCurveTo(tx(x - topW - 5 + capeWave * 0.7), ty(drawBTop + bH * 0.35), tx(x - botW - 3 + capeWave2 * 0.7), ty(drawBTop + bH * 0.6))
      .lineTo(tx(x - botW - 3 + capeWave2 * 0.7), ty(drawY + 2))
      .lineTo(tx(x - botW + 2), ty(drawY - 2))
      .lineTo(tx(x - topW + 2), ty(drawBTop + 3)).closePath()
      .fill({ color: 0x6622aa, alpha: 0.25 });

    // Outer cloak layer
    g.moveTo(tx(x - topW - 1), ty(drawBTop)).lineTo(tx(x + topW + 1), ty(drawBTop))
      .lineTo(tx(x + botW + 2), ty(drawY + 2)).lineTo(tx(x - botW - 2), ty(drawY + 2)).closePath()
      .fill({ color: 0x1a2288, alpha: 0.5 });

    // Inner robe body — tapered trapezoid, blue/purple
    g.moveTo(tx(x - topW), ty(drawBTop)).lineTo(tx(x + topW), ty(drawBTop))
      .lineTo(tx(x + botW), ty(drawY)).lineTo(tx(x - botW), ty(drawY)).closePath()
      .fill({ color: 0x2233aa, alpha: 0.9 });
    // Robe highlight
    g.moveTo(tx(x - topW + 3), ty(drawBTop + 2)).lineTo(tx(x + topW - 6), ty(drawBTop + 2))
      .lineTo(tx(x + botW - 8), ty(drawY - 2)).lineTo(tx(x - botW + 5), ty(drawY - 2)).closePath()
      .fill({ color: 0x3344cc, alpha: 0.25 });

    // Belt with buckle
    const beltY = drawBTop + bH * 0.55;
    const beltHalfW = topW + (botW - topW) * 0.55;
    g.rect(tx(x - beltHalfW), ty(beltY - 1.5), ts(beltHalfW * 2), ts(3)).fill({ color: 0x553311, alpha: 0.7 });
    // Buckle
    g.rect(tx(x - 2.5), ty(beltY - 2), ts(5), ts(4)).fill({ color: 0xccaa44, alpha: 0.6 });
    g.rect(tx(x - 1.5), ty(beltY - 1), ts(3), ts(2)).fill({ color: 0xffdd66, alpha: 0.4 });

    // Fold lines (multiple)
    g.setStrokeStyle({ width: ts(0.7), color: 0x111144, alpha: 0.35 });
    g.moveTo(tx(x), ty(drawBTop + 5)).lineTo(tx(x - 3), ty(drawY)).stroke();
    g.moveTo(tx(x + 4), ty(drawBTop + 8)).lineTo(tx(x + 6), ty(drawY)).stroke();
    g.moveTo(tx(x - 6), ty(drawBTop + 10)).lineTo(tx(x - 8), ty(drawY)).stroke();
    g.setStrokeStyle({ width: ts(0.5), color: 0x111144, alpha: 0.2 });
    g.moveTo(tx(x + 8), ty(beltY + 3)).lineTo(tx(x + 12), ty(drawY)).stroke();
    g.moveTo(tx(x - 10), ty(beltY + 3)).lineTo(tx(x - 14), ty(drawY)).stroke();

    // Head
    const headY = drawBTop - 10;
    g.circle(tx(x), ty(headY), ts(8)).fill({ color: 0xeeccaa, alpha: 0.9 });
    // Shadow under hat brim
    g.ellipse(tx(x), ty(headY - 2), ts(7), ts(3)).fill({ color: 0xbb9977, alpha: 0.2 });

    // Detailed face
    // Eyebrows
    g.setStrokeStyle({ width: ts(0.8), color: 0x888888, alpha: 0.5 });
    g.moveTo(tx(x - 5), ty(headY - 4.5)).lineTo(tx(x - 1.5), ty(headY - 4)).stroke();
    g.moveTo(tx(x + 5), ty(headY - 4.5)).lineTo(tx(x + 1.5), ty(headY - 4)).stroke();
    // Eyes with pupils
    g.circle(tx(x - 3), ty(headY - 2), ts(1.5)).fill({ color: 0xffffff, alpha: 0.7 });
    g.circle(tx(x + 3), ty(headY - 2), ts(1.5)).fill({ color: 0xffffff, alpha: 0.7 });
    g.circle(tx(x - 3), ty(headY - 2), ts(0.9)).fill(0x222244);
    g.circle(tx(x + 3), ty(headY - 2), ts(0.9)).fill(0x222244);
    // Eye glint
    g.circle(tx(x - 2.5), ty(headY - 2.5), ts(0.4)).fill({ color: 0xffffff, alpha: 0.6 });
    g.circle(tx(x + 3.5), ty(headY - 2.5), ts(0.4)).fill({ color: 0xffffff, alpha: 0.6 });
    // Nose
    g.setStrokeStyle({ width: ts(0.5), color: 0xccaa88, alpha: 0.4 });
    g.moveTo(tx(x), ty(headY - 1)).lineTo(tx(x - 0.5), ty(headY + 1.5)).stroke();

    // Flowing beard with multiple strands
    g.moveTo(tx(x - 6), ty(headY + 3)).quadraticCurveTo(tx(x - 2), ty(headY + 12), tx(x), ty(headY + 20 + Math.sin(time * 2) * 1.5))
      .quadraticCurveTo(tx(x + 2), ty(headY + 12), tx(x + 6), ty(headY + 3)).closePath()
      .fill({ color: 0xdddddd, alpha: 0.85 });
    // Beard strand lines
    g.setStrokeStyle({ width: ts(0.4), color: 0xbbbbbb, alpha: 0.3 });
    g.moveTo(tx(x - 4), ty(headY + 5)).quadraticCurveTo(tx(x - 3), ty(headY + 12), tx(x - 1.5), ty(headY + 18 + Math.sin(time * 2.2) * 1)).stroke();
    g.moveTo(tx(x), ty(headY + 6)).lineTo(tx(x), ty(headY + 19 + Math.sin(time * 2) * 1.5)).stroke();
    g.moveTo(tx(x + 4), ty(headY + 5)).quadraticCurveTo(tx(x + 3), ty(headY + 12), tx(x + 1.5), ty(headY + 18 + Math.sin(time * 1.9 + 0.5) * 1)).stroke();
    g.moveTo(tx(x - 2), ty(headY + 4)).quadraticCurveTo(tx(x - 1.5), ty(headY + 10), tx(x - 0.5), ty(headY + 17)).stroke();
    g.moveTo(tx(x + 2), ty(headY + 4)).quadraticCurveTo(tx(x + 1.5), ty(headY + 10), tx(x + 0.5), ty(headY + 17)).stroke();

    // Pointed hat — multi-layer
    const hatBase = headY - 6;
    // Hat outer layer
    g.moveTo(tx(x - 12), ty(hatBase + 3)).lineTo(tx(x + 2), ty(hatBase - 28)).lineTo(tx(x + 12), ty(hatBase + 3)).closePath()
      .fill({ color: 0x1a2288, alpha: 0.95 });
    // Hat inner layer (lighter)
    g.moveTo(tx(x - 8), ty(hatBase + 1)).lineTo(tx(x + 1), ty(hatBase - 22)).lineTo(tx(x + 9), ty(hatBase + 1)).closePath()
      .fill({ color: 0x2a33aa, alpha: 0.4 });
    // Hat droopy tip curving
    g.moveTo(tx(x + 2), ty(hatBase - 28)).quadraticCurveTo(tx(x + 8), ty(hatBase - 30), tx(x + 10), ty(hatBase - 24)).stroke();
    g.setStrokeStyle({ width: ts(1), color: 0x2233aa, alpha: 0.5 });
    g.moveTo(tx(x + 2), ty(hatBase - 28)).quadraticCurveTo(tx(x + 8), ty(hatBase - 30), tx(x + 10), ty(hatBase - 24)).stroke();
    // Hat brim
    g.ellipse(tx(x), ty(hatBase + 2), ts(15), ts(4.5)).fill({ color: 0x1a2288, alpha: 0.85 });
    // Hat band with ornamental pattern
    g.setStrokeStyle({ width: ts(2), color: 0x4455cc, alpha: 0.45 });
    g.moveTo(tx(x - 10), ty(hatBase + 1)).lineTo(tx(x + 10), ty(hatBase + 1)).stroke();
    g.setStrokeStyle({ width: ts(0.6), color: 0x6677dd, alpha: 0.3 });
    g.moveTo(tx(x - 9), ty(hatBase - 0.5)).lineTo(tx(x + 9), ty(hatBase - 0.5)).stroke();
    // Star on hat
    const starY = hatBase - 18;
    const starP = 0.6 + Math.sin(time * 3) * 0.4;
    this._drawStar4(g, tx(x + 1), ty(starY), ts(4), 0xffdd44, starP);
    // Second smaller star
    this._drawStar4(g, tx(x - 4), ty(hatBase - 10), ts(2), 0xaaccff, starP * 0.6);

    // Staff (right side) with ornate details
    const staffX = x + 22;
    const staffTopY = casting ? drawBTop - 32 : drawBTop - 16;
    const staffBotY = drawY + 5;
    // Main shaft
    g.setStrokeStyle({ width: ts(3), color: 0x664422, alpha: 0.9 });
    g.moveTo(tx(staffX), ty(staffTopY)).lineTo(tx(staffX), ty(staffBotY)).stroke();
    // Wood grain lines
    g.setStrokeStyle({ width: ts(0.8), color: 0x553311, alpha: 0.25 });
    g.moveTo(tx(staffX - 0.7), ty(staffTopY + 10)).lineTo(tx(staffX - 0.7), ty(staffBotY - 5)).stroke();
    g.moveTo(tx(staffX + 0.7), ty(staffTopY + 15)).lineTo(tx(staffX + 0.5), ty(staffBotY - 8)).stroke();

    // Ornate rings on staff
    const ringPositions = [staffTopY + 8, staffTopY + (staffBotY - staffTopY) * 0.35, staffTopY + (staffBotY - staffTopY) * 0.65];
    for (const ry of ringPositions) {
      g.setStrokeStyle({ width: ts(1.2), color: 0xccaa44, alpha: 0.5 });
      g.moveTo(tx(staffX - 2.5), ty(ry)).lineTo(tx(staffX + 2.5), ty(ry)).stroke();
    }
    // Wrapped grip section
    const gripTop = staffTopY + (staffBotY - staffTopY) * 0.5;
    const gripBot = staffTopY + (staffBotY - staffTopY) * 0.7;
    for (let gy = gripTop; gy < gripBot; gy += 3) {
      g.setStrokeStyle({ width: ts(0.5), color: 0x886644, alpha: 0.3 });
      g.moveTo(tx(staffX - 2), ty(gy)).lineTo(tx(staffX + 2), ty(gy + 1.5)).stroke();
    }

    // Crystal orb on staff with inner glow + outer halo
    const orbY = staffTopY - 5;
    const orbGlow = casting ? 1.0 : 0.5 + Math.sin(time * 2) * 0.2;
    const orbPulse = Math.sin(time * 3) * 0.15;
    const orbC = 0x44aaff;
    // Orb prongs/cradle
    g.setStrokeStyle({ width: ts(1), color: 0x886644, alpha: 0.6 });
    g.moveTo(tx(staffX - 3), ty(staffTopY + 2)).quadraticCurveTo(tx(staffX - 5), ty(orbY), tx(staffX - 2), ty(orbY - 4)).stroke();
    g.moveTo(tx(staffX + 3), ty(staffTopY + 2)).quadraticCurveTo(tx(staffX + 5), ty(orbY), tx(staffX + 2), ty(orbY - 4)).stroke();
    // Outer halo
    g.circle(tx(staffX), ty(orbY), ts(22)).fill({ color: orbC, alpha: 0.025 * orbGlow });
    g.circle(tx(staffX), ty(orbY), ts(14)).fill({ color: orbC, alpha: 0.06 * orbGlow });
    // Orb layers
    g.circle(tx(staffX), ty(orbY), ts(7 + orbPulse)).fill({ color: orbC, alpha: 0.6 * orbGlow });
    g.circle(tx(staffX), ty(orbY), ts(5 + orbPulse * 0.7)).fill({ color: 0x66bbff, alpha: 0.75 * orbGlow });
    g.circle(tx(staffX), ty(orbY), ts(3.5)).fill({ color: 0x88ccff, alpha: 0.85 * orbGlow });
    // Inner glow core
    g.circle(tx(staffX), ty(orbY), ts(2)).fill({ color: 0xcceeFF, alpha: 0.95 * orbGlow });
    g.circle(tx(staffX), ty(orbY), ts(1)).fill({ color: 0xffffff, alpha: orbGlow });
    // Inner sparkle that rotates
    const innerSparkA = time * 4;
    g.circle(tx(staffX + Math.cos(innerSparkA) * 2.5), ty(orbY + Math.sin(innerSparkA) * 2.5), ts(0.6))
      .fill({ color: 0xffffff, alpha: 0.5 * orbGlow });

    // Casting: element-colored energy spirals up staff
    if (casting) {
      g.circle(tx(staffX), ty(orbY), ts(30)).fill({ color: orbC, alpha: 0.04 });
      // Energy spiral wrapping up the staff
      for (let i = 0; i < 12; i++) {
        const t = i / 12;
        const spiralY = staffBotY - (staffBotY - orbY) * t;
        const spiralPhase = time * 8 + t * Math.PI * 6;
        const spiralR = 4 + Math.sin(t * Math.PI) * 3;
        const spiralX = staffX + Math.cos(spiralPhase) * spiralR;
        const spiralAlpha = 0.2 * t;
        g.circle(tx(spiralX), ty(spiralY), ts(1.2)).fill({ color: orbC, alpha: spiralAlpha });
      }
      // Sparkles around orb
      for (let i = 0; i < 6; i++) {
        const sa = (i / 6) * Math.PI * 2 + time * 5;
        const sr = 9 + Math.sin(time * 3 + i) * 3;
        g.circle(tx(staffX + Math.cos(sa) * sr), ty(orbY + Math.sin(sa) * sr), ts(1.2)).fill({ color: 0xaaddff, alpha: 0.3 });
        g.circle(tx(staffX + Math.cos(sa) * sr), ty(orbY + Math.sin(sa) * sr), ts(3)).fill({ color: orbC, alpha: 0.06 });
      }
    }

    // Low HP warning pulse — more intense, multi-layer
    if (lowHp) {
      const hpP = Math.sin(time * 4) * 0.5 + 0.5;
      const hpP2 = Math.sin(time * 6 + 1) * 0.5 + 0.5;
      g.circle(tx(x), ty(drawY - bH / 2), ts(36)).fill({ color: 0xff2222, alpha: 0.05 * hpP });
      g.circle(tx(x), ty(drawY - bH / 2), ts(28)).fill({ color: 0xff4444, alpha: 0.04 * hpP2 });
      // Danger pulsing outline
      g.setStrokeStyle({ width: ts(1), color: 0xff2222, alpha: 0.1 * hpP });
      g.circle(tx(x), ty(drawY - bH / 2), ts(30)).stroke();
    }

    // Shield indicator glow on wizard when active
    if (shielding) {
      g.circle(tx(x), ty(drawY - bH / 2), ts(28)).fill({ color: 0x44aaff, alpha: 0.05 + Math.sin(time * 4) * 0.02 });
      g.circle(tx(x), ty(drawY - bH / 2), ts(20)).fill({ color: 0x66ccff, alpha: 0.03 + Math.sin(time * 5) * 0.01 });
    }
  }

  private _drawEnemyWizard(g: Graphics, col: number, x: number, y: number, hpRatio: number, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const bH = 36, bTop = y - bH;
    const lightCol = lerpColor(col, 0xffffff, 0.3);
    const darkCol = lerpColor(col, 0x000000, 0.3);
    const topW = 10, botW = 18;

    // Element-themed aura (intensified)
    g.circle(tx(x), ty(y - bH / 2), ts(50)).fill({ color: col, alpha: 0.015 + Math.sin(time * 1.5) * 0.008 });
    g.circle(tx(x), ty(y - bH / 2), ts(42)).fill({ color: col, alpha: 0.025 + Math.sin(time * 1.5) * 0.012 });

    // Element-specific ambient effects (drawn behind body)
    const isFire = (col & 0xff0000) > 0x880000 && (col & 0x00ff00) < 0x004400;
    const isIce = (col & 0x0000ff) > 0x000088 && (col & 0x00ff00) > 0x006600;
    const isLightning = (col & 0xffff00) === (col & 0xffff00) && (col & 0xff0000) > 0xcc0000 && (col & 0x00ff00) > 0x008800;
    const isArcane = (col & 0xff00ff) > 0x440044;

    if (isFire) {
      // Flame particles rising from shoulders
      for (let i = 0; i < 6; i++) {
        const fPhase = (time * 3 + i * 1.1) % 2;
        const fx = x + (i < 3 ? -topW - 2 : topW + 2) + Math.sin(time * 4 + i) * 2;
        const fy = bTop + 5 - fPhase * 18;
        const fa = 0.25 * Math.max(0, 1 - fPhase / 2);
        if (fa > 0.02) {
          g.circle(tx(fx), ty(fy), ts(1.5 - fPhase * 0.4)).fill({ color: i % 2 === 0 ? 0xff6600 : 0xff2200, alpha: fa });
          g.circle(tx(fx), ty(fy), ts(3)).fill({ color: 0xff4400, alpha: fa * 0.2 });
        }
      }
    } else if (isIce) {
      // Frost crystals floating around
      for (let i = 0; i < 5; i++) {
        const ca = (i / 5) * Math.PI * 2 + time * 0.8;
        const cr = 20 + Math.sin(time * 1.5 + i) * 5;
        const cx2 = x + Math.cos(ca) * cr;
        const cy2 = y - bH / 2 + Math.sin(ca) * cr * 0.6;
        this._drawStar4(g, tx(cx2), ty(cy2), ts(2), 0x88ddff, 0.18 + Math.sin(time * 2 + i) * 0.08);
      }
    } else if (isLightning) {
      // Crackling arc bolts around body
      for (let i = 0; i < 3; i++) {
        if (Math.sin(time * 8 + i * 3) > 0.3) {
          const arcSx = x + (Math.random() - 0.5) * 20;
          const arcSy = y - bH / 2 + (Math.random() - 0.5) * 30;
          const arcEx = arcSx + (Math.random() - 0.5) * 15;
          const arcEy = arcSy + (Math.random() - 0.5) * 15;
          g.setStrokeStyle({ width: ts(0.6), color: 0xffee88, alpha: 0.2 });
          g.moveTo(tx(arcSx), ty(arcSy)).lineTo(tx(arcEx), ty(arcEy)).stroke();
          g.circle(tx(arcSx), ty(arcSy), ts(1)).fill({ color: 0xffffff, alpha: 0.15 });
        }
      }
    } else if (isArcane) {
      // Floating rune symbols orbiting
      for (let i = 0; i < 4; i++) {
        const ra = (i / 4) * Math.PI * 2 + time * 1.2;
        const rr = 24 + Math.sin(time + i * 2) * 4;
        const rx2 = x + Math.cos(ra) * rr;
        const ry2 = y - bH / 2 + Math.sin(ra) * rr * 0.5;
        const runeA = 0.15 + Math.sin(time * 2 + i) * 0.05;
        // Mini rune cross
        g.setStrokeStyle({ width: ts(0.5), color: col, alpha: runeA });
        g.moveTo(tx(rx2 - 2), ty(ry2)).lineTo(tx(rx2 + 2), ty(ry2)).stroke();
        g.moveTo(tx(rx2), ty(ry2 - 2)).lineTo(tx(rx2), ty(ry2 + 2)).stroke();
        g.circle(tx(rx2), ty(ry2), ts(3)).fill({ color: col, alpha: runeA * 0.3 });
      }
    }

    // Robe body
    g.moveTo(tx(x - topW), ty(bTop)).lineTo(tx(x + topW), ty(bTop))
      .lineTo(tx(x + botW), ty(y)).lineTo(tx(x - botW), ty(y)).closePath()
      .fill({ color: col, alpha: 0.85 });
    // Highlight
    g.moveTo(tx(x - topW + 6), ty(bTop + 2)).lineTo(tx(x + topW - 3), ty(bTop + 2))
      .lineTo(tx(x + botW - 5), ty(y - 2)).lineTo(tx(x - botW + 8), ty(y - 2)).closePath()
      .fill({ color: lightCol, alpha: 0.18 });
    // Multiple fold lines
    g.setStrokeStyle({ width: ts(0.6), color: darkCol, alpha: 0.3 });
    g.moveTo(tx(x - 2), ty(bTop + 6)).lineTo(tx(x + 2), ty(y)).stroke();
    g.moveTo(tx(x + 6), ty(bTop + 10)).lineTo(tx(x + 8), ty(y)).stroke();
    g.moveTo(tx(x - 7), ty(bTop + 8)).lineTo(tx(x - 9), ty(y)).stroke();

    // Belt
    const beltY2 = bTop + bH * 0.55;
    const beltHW = topW + (botW - topW) * 0.55;
    g.rect(tx(x - beltHW), ty(beltY2 - 1), ts(beltHW * 2), ts(2.5)).fill({ color: darkCol, alpha: 0.45 });

    // Head
    const headY = bTop - 10;
    g.circle(tx(x), ty(headY), ts(8)).fill({ color: 0xddbb99, alpha: 0.9 });

    // Pointed hat
    const hatBase = headY - 6;
    g.moveTo(tx(x - 10), ty(hatBase + 2)).lineTo(tx(x), ty(hatBase - 24)).lineTo(tx(x + 10), ty(hatBase + 2)).closePath()
      .fill({ color: col, alpha: 0.95 });
    // Hat inner highlight
    g.moveTo(tx(x - 6), ty(hatBase + 1)).lineTo(tx(x - 1), ty(hatBase - 18)).lineTo(tx(x + 5), ty(hatBase + 1)).closePath()
      .fill({ color: lightCol, alpha: 0.15 });
    g.ellipse(tx(x), ty(hatBase + 2), ts(14), ts(4)).fill({ color: darkCol, alpha: 0.85 });
    // Hat emblem
    g.circle(tx(x), ty(hatBase - 12), ts(2.5)).fill({ color: lightCol, alpha: 0.35 + Math.sin(time * 2) * 0.15 });

    // Glowing eyes — more intense
    const eyeGlow = 0.7 + Math.sin(time * 3 + 2) * 0.3;
    g.circle(tx(x - 3), ty(headY - 2), ts(1.8)).fill({ color: col, alpha: eyeGlow });
    g.circle(tx(x + 3), ty(headY - 2), ts(1.8)).fill({ color: col, alpha: eyeGlow });
    // Bright eye core
    g.circle(tx(x - 3), ty(headY - 2), ts(0.8)).fill({ color: 0xffffff, alpha: eyeGlow * 0.5 });
    g.circle(tx(x + 3), ty(headY - 2), ts(0.8)).fill({ color: 0xffffff, alpha: eyeGlow * 0.5 });
    // Eye glow halos (larger)
    g.circle(tx(x - 3), ty(headY - 2), ts(4)).fill({ color: col, alpha: eyeGlow * 0.1 });
    g.circle(tx(x + 3), ty(headY - 2), ts(4)).fill({ color: col, alpha: eyeGlow * 0.1 });

    // Staff (left side, mirrored)
    const staffX = x - 22;
    const staffTopY = bTop - 16;
    g.setStrokeStyle({ width: ts(3), color: 0x554433, alpha: 0.9 });
    g.moveTo(tx(staffX), ty(staffTopY)).lineTo(tx(staffX), ty(y + 5)).stroke();
    // Wood grain
    g.setStrokeStyle({ width: ts(0.7), color: 0x443322, alpha: 0.25 });
    g.moveTo(tx(staffX + 0.7), ty(staffTopY + 8)).lineTo(tx(staffX + 0.5), ty(y)).stroke();
    // Staff rings
    g.setStrokeStyle({ width: ts(1), color: darkCol, alpha: 0.4 });
    g.moveTo(tx(staffX - 2.5), ty(staffTopY + 10)).lineTo(tx(staffX + 2.5), ty(staffTopY + 10)).stroke();
    g.moveTo(tx(staffX - 2.5), ty(staffTopY + (y - staffTopY) * 0.5)).lineTo(tx(staffX + 2.5), ty(staffTopY + (y - staffTopY) * 0.5)).stroke();

    // Staff orb — enhanced
    const orbGlow = 0.5 + Math.sin(time * 2.5 + 1) * 0.3;
    g.circle(tx(staffX), ty(staffTopY - 4), ts(14)).fill({ color: col, alpha: 0.03 * orbGlow });
    g.circle(tx(staffX), ty(staffTopY - 4), ts(6)).fill({ color: col, alpha: 0.55 * orbGlow });
    g.circle(tx(staffX), ty(staffTopY - 4), ts(4)).fill({ color: lightCol, alpha: 0.7 * orbGlow });
    g.circle(tx(staffX), ty(staffTopY - 4), ts(2)).fill({ color: 0xffffff, alpha: 0.85 * orbGlow });
    g.circle(tx(staffX), ty(staffTopY - 4), ts(0.8)).fill({ color: 0xffffff, alpha: orbGlow });

    // Better damage flash — multi-layer white flash with red outline
    if (hpRatio < 0.95 && Math.sin(time * 14) > 0.75) {
      g.circle(tx(x), ty(y - bH / 2), ts(26)).fill({ color: 0xffffff, alpha: 0.1 });
      g.circle(tx(x), ty(y - bH / 2), ts(20)).fill({ color: 0xffffff, alpha: 0.06 });
      g.setStrokeStyle({ width: ts(1), color: 0xff4444, alpha: 0.15 });
      g.circle(tx(x), ty(y - bH / 2), ts(24)).stroke();
    }

    // Low HP warning glow for enemy too
    if (hpRatio < 0.3) {
      const hpWarn = Math.sin(time * 5) * 0.5 + 0.5;
      g.circle(tx(x), ty(y - bH / 2), ts(30)).fill({ color: 0xff2222, alpha: 0.04 * hpWarn });
      g.setStrokeStyle({ width: ts(0.8), color: 0xff4444, alpha: 0.08 * hpWarn });
      g.circle(tx(x), ty(y - bH / 2), ts(28)).stroke();
    }
  }

  private _drawStar4(g: Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
    g.moveTo(x, y - size).lineTo(x + size * 0.3, y - size * 0.3)
      .lineTo(x + size, y).lineTo(x + size * 0.3, y + size * 0.3)
      .lineTo(x, y + size).lineTo(x - size * 0.3, y + size * 0.3)
      .lineTo(x - size, y).lineTo(x - size * 0.3, y - size * 0.3)
      .closePath().fill({ color, alpha });
    g.circle(x, y, size * 0.35).fill({ color: 0xffffff, alpha: alpha * 0.5 });
  }

  // -----------------------------------------------------------------------
  // Shield — translucent semicircle barrier with ripple
  // -----------------------------------------------------------------------

  private _drawShield(g: Graphics, state: DuelState, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    if (!state.shieldActive) return;
    const sx = B.PLAYER_X + 26;
    const sy = state.playerY;
    const r = 34;
    const elemCol = getElementColor(state.selectedElement);
    const lightElem = lerpColor(elemCol, 0xffffff, 0.4);
    const ripple = Math.sin(time * 6) * 2;
    const ripple2 = Math.sin(time * 8 + 1) * 1.5;
    const manaRatio = state.playerMana / state.playerMaxMana;

    // Multi-layer outer glow halos
    g.circle(tx(sx + ripple * 0.3), ty(sy), ts(r + 18)).fill({ color: elemCol, alpha: 0.012 });
    g.circle(tx(sx + ripple * 0.3), ty(sy), ts(r + 12)).fill({ color: elemCol, alpha: 0.02 });
    g.circle(tx(sx + ripple * 0.3), ty(sy), ts(r + 6)).fill({ color: elemCol, alpha: 0.035 });

    // Shield arc dots (denser)
    for (let a = -Math.PI * 0.55; a <= Math.PI * 0.55; a += 0.08) {
      const px = sx + Math.cos(a) * (r + ripple * Math.sin(a * 3 + time * 4));
      const py = sy + Math.sin(a) * (r + ripple * Math.cos(a * 2 + time * 3));
      const da = 0.15 + Math.sin(time * 5 + a * 4) * 0.08;
      g.circle(tx(px), ty(py), ts(1.5)).fill({ color: elemCol, alpha: da });
    }

    // Multi-layer translucent dome
    g.ellipse(tx(sx), ty(sy), ts(r * 0.4), ts(r * 1.05)).fill({ color: elemCol, alpha: 0.04 + Math.sin(time * 4) * 0.015 });
    g.ellipse(tx(sx - 1), ty(sy), ts(r * 0.35), ts(r)).fill({ color: elemCol, alpha: 0.05 + Math.sin(time * 4.5 + 0.5) * 0.02 });
    g.ellipse(tx(sx + 1), ty(sy), ts(r * 0.3), ts(r * 0.92)).fill({ color: lightElem, alpha: 0.03 + Math.sin(time * 5) * 0.01 });

    // Ripple wave animation across shield surface
    const rippleWaveCount = 3;
    for (let rw = 0; rw < rippleWaveCount; rw++) {
      const rwPhase = (time * 2 + rw * 2.1) % 3;
      const rwY = sy - r + rwPhase * r * 0.67;
      const rwAlpha = 0.08 * Math.sin(rwPhase / 3 * Math.PI);
      if (rwAlpha > 0.01) {
        g.ellipse(tx(sx), ty(rwY), ts(r * 0.35 * Math.sin((rwPhase / 3) * Math.PI * 0.8 + 0.2)), ts(2))
          .fill({ color: lightElem, alpha: rwAlpha });
      }
    }

    // Hexagonal grid pattern on shield surface
    const hexSize = 6;
    const hexRows = Math.floor((r * 2) / (hexSize * 1.5));
    const hexCols = Math.floor((r * 0.7) / (hexSize * 1.73));
    for (let hr = -hexRows / 2; hr <= hexRows / 2; hr++) {
      for (let hc = -hexCols / 2; hc <= hexCols / 2; hc++) {
        const hx = sx + hc * hexSize * 1.73 * 0.35 + (hr % 2) * hexSize * 0.86 * 0.35;
        const hy = sy + hr * hexSize * 1.5;
        // Check if inside the ellipse
        const nx = (hx - sx) / (r * 0.38);
        const ny = (hy - sy) / r;
        if (nx * nx + ny * ny > 0.85) continue;
        const hexAlpha = 0.06 + Math.sin(time * 3 + hr * 0.5 + hc * 0.7) * 0.03;
        // Draw tiny hex outline
        g.setStrokeStyle({ width: ts(0.3), color: elemCol, alpha: hexAlpha });
        const hs = hexSize * 0.35;
        g.moveTo(tx(hx + hs), ty(hy));
        for (let hi = 1; hi <= 6; hi++) {
          const ha = (hi / 6) * Math.PI * 2;
          g.lineTo(tx(hx + Math.cos(ha) * hs), ty(hy + Math.sin(ha) * hs));
        }
        g.stroke();
      }
    }

    // Element-colored energy flowing across shield
    for (let ef = 0; ef < 5; ef++) {
      const efPhase = (time * 1.5 + ef * 1.3) % (Math.PI * 2);
      const efAngle = -Math.PI * 0.4 + efPhase * 0.25;
      const efDist = r * 0.85;
      const efx = sx + Math.cos(efAngle) * efDist * 0.35;
      const efy = sy + Math.sin(efAngle) * efDist;
      const efAlpha = 0.1 + Math.sin(time * 4 + ef * 2) * 0.05;
      g.circle(tx(efx), ty(efy), ts(2)).fill({ color: elemCol, alpha: efAlpha });
      g.circle(tx(efx), ty(efy), ts(4)).fill({ color: elemCol, alpha: efAlpha * 0.3 });
    }

    // Outer stroke layers
    g.setStrokeStyle({ width: ts(2), color: elemCol, alpha: 0.15 + Math.sin(time * 5) * 0.05 });
    g.ellipse(tx(sx), ty(sy), ts(r * 0.38), ts(r * 1.02)).stroke();
    g.setStrokeStyle({ width: ts(1), color: lightElem, alpha: 0.1 + Math.sin(time * 6) * 0.04 });
    g.ellipse(tx(sx), ty(sy), ts(r * 0.35), ts(r)).stroke();
    // Inner shimmer
    g.setStrokeStyle({ width: ts(0.8), color: 0xffffff, alpha: 0.06 + ripple2 * 0.01 });
    g.ellipse(tx(sx), ty(sy), ts(r * 0.22), ts(r * 0.78)).stroke();

    // Cracks at low mana
    if (manaRatio < 0.3) {
      const crackIntensity = (1 - manaRatio / 0.3);
      const crackAlpha = 0.12 * crackIntensity + Math.sin(time * 8) * 0.04;
      g.setStrokeStyle({ width: ts(0.8), color: 0xffffff, alpha: crackAlpha });
      // Crack lines across shield
      g.moveTo(tx(sx - 3), ty(sy - r * 0.4)).lineTo(tx(sx + 1), ty(sy - r * 0.15))
        .lineTo(tx(sx - 2), ty(sy + r * 0.1)).stroke();
      g.moveTo(tx(sx + 2), ty(sy + r * 0.2)).lineTo(tx(sx - 1), ty(sy + r * 0.5)).stroke();
      if (crackIntensity > 0.5) {
        g.moveTo(tx(sx + 1), ty(sy - r * 0.6)).lineTo(tx(sx + 3), ty(sy - r * 0.3))
          .lineTo(tx(sx), ty(sy)).stroke();
      }
      // Sparking at crack points
      if (Math.sin(time * 12) > 0.5) {
        g.circle(tx(sx + 1), ty(sy - r * 0.15), ts(1.5)).fill({ color: 0xffffff, alpha: crackAlpha * 1.5 });
      }
    }

    // Block flash effect (bright burst when shield is freshly active based on time flicker)
    const blockFlash = Math.sin(time * 20) > 0.95 ? 0.08 : 0;
    if (blockFlash > 0) {
      g.ellipse(tx(sx), ty(sy), ts(r * 0.4), ts(r * 1.1)).fill({ color: 0xffffff, alpha: blockFlash });
    }
  }

  // -----------------------------------------------------------------------
  // Spell projectiles — element-specific visuals
  // -----------------------------------------------------------------------

  private _drawProjectiles(g: Graphics, state: DuelState, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    for (const p of state.projectiles) {
      switch (p.element) {
        case Element.FIRE: this._drawFireProj(g, p, tx, ty, ts, time); break;
        case Element.ICE: this._drawIceProj(g, p, tx, ty, ts, time); break;
        case Element.LIGHTNING: this._drawLightningProj(g, p, tx, ty, ts, time); break;
        case Element.ARCANE: this._drawArcaneProj(g, p, tx, ty, ts, time); break;
      }
    }
  }

  private _drawFireProj(g: Graphics, p: Projectile, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const { x, y, size } = p;
    const dx = -sign(p.vx);
    const isInferno = p.spell === SpellId.INFERNO;
    const sizeMul = isInferno ? 1.6 : 1;

    // Smoke wisps trailing behind
    for (let i = 0; i < 4; i++) {
      const smokeAge = (time * 2.5 + i * 1.3) % 3;
      const smX = x + dx * (12 + smokeAge * 15);
      const smY = y - smokeAge * 6 + Math.sin(time * 1.5 + i) * 3;
      const smA = 0.04 * Math.max(0, 1 - smokeAge / 3);
      if (smA > 0.005) {
        g.ellipse(tx(smX), ty(smY), ts(3 + smokeAge * 2.5), ts(2 + smokeAge * 1.5)).fill({ color: 0x443322, alpha: smA });
      }
    }

    // 8+ trailing flame segments with sinusoidal wave
    for (let i = 1; i <= 10; i++) {
      const trailT = i / 10;
      const tpx = x + dx * i * (isInferno ? 7 : 5);
      const tpy = y + Math.sin(time * 12 + i * 0.8) * (3 + i * 0.3);
      const trailSize = size * sizeMul * (1 - trailT * 0.7);
      const trailColor = i < 3 ? 0xff6600 : i < 6 ? 0xff4400 : 0xcc2200;
      g.circle(tx(tpx), ty(tpy), ts(trailSize)).fill({ color: trailColor, alpha: 0.18 * (1 - trailT) });
      // Inner bright core of each trail segment
      g.circle(tx(tpx), ty(tpy), ts(trailSize * 0.4)).fill({ color: 0xffaa44, alpha: 0.1 * (1 - trailT) });
    }

    // Scattered ember particles with glow
    for (let i = 0; i < 8; i++) {
      const ex = x + dx * (5 + ((time * 80 + i * 37) % 22));
      const ey = y + ((time * 60 + i * 53) % 16) - 8;
      const ep = (time * 6 + i * 1.1) % 1;
      const emberSize = 0.8 + Math.sin(time * 10 + i * 3) * 0.3;
      g.circle(tx(ex), ty(ey - ep * 12), ts(emberSize)).fill({ color: 0xffcc44, alpha: 0.35 * (1 - ep) });
      // Ember glow halo
      g.circle(tx(ex), ty(ey - ep * 12), ts(emberSize * 3)).fill({ color: 0xff6600, alpha: 0.06 * (1 - ep) });
    }

    // INFERNO: trailing fire vortex
    if (isInferno) {
      for (let i = 0; i < 12; i++) {
        const va = (i / 12) * Math.PI * 2 + time * 8;
        const vr = size * 1.2 + i * 1.5;
        const vx2 = x + dx * (i * 3) + Math.cos(va) * vr * 0.4;
        const vy2 = y + Math.sin(va) * vr * 0.5;
        g.circle(tx(vx2), ty(vy2), ts(2.5)).fill({ color: 0xff4400, alpha: 0.15 * (1 - i / 12) });
        g.circle(tx(vx2), ty(vy2), ts(5)).fill({ color: 0xcc2200, alpha: 0.04 * (1 - i / 12) });
      }
      // Massive outer heat distortion glow
      g.circle(tx(x), ty(y), ts(size * 6)).fill({ color: 0xff2200, alpha: 0.03 });
    }

    // Multi-layer fireball core: dark red outer, orange mid, yellow inner, white-hot center
    g.circle(tx(x), ty(y), ts((size + 4) * sizeMul)).fill({ color: 0x881100, alpha: 0.4 });
    g.circle(tx(x), ty(y), ts((size + 2) * sizeMul)).fill({ color: 0xcc2200, alpha: 0.55 });
    g.circle(tx(x), ty(y), ts(size * sizeMul)).fill({ color: 0xff6600, alpha: 0.8 });
    g.circle(tx(x), ty(y), ts(size * 0.65 * sizeMul)).fill({ color: 0xffaa22, alpha: 0.9 });
    g.circle(tx(x), ty(y), ts(size * 0.35 * sizeMul)).fill({ color: 0xffdd66, alpha: 0.95 });
    g.circle(tx(x), ty(y), ts(size * 0.15 * sizeMul)).fill({ color: 0xffffff, alpha: 1 });

    // Outer glow halos
    g.circle(tx(x), ty(y), ts(size * 2.5 * sizeMul)).fill({ color: 0xff4400, alpha: 0.06 });
    g.circle(tx(x), ty(y), ts(size * 4 * sizeMul)).fill({ color: 0xff2200, alpha: 0.025 });
    g.circle(tx(x), ty(y), ts(size * 5.5 * sizeMul)).fill({ color: 0xcc1100, alpha: 0.012 });
  }

  private _drawIceProj(g: Graphics, p: Projectile, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const { x, y, size } = p;
    const dx = -sign(p.vx);
    const isBlizzard = p.spell === SpellId.BLIZZARD;

    // Cold mist halo around projectile
    g.ellipse(tx(x), ty(y), ts(size * 3), ts(size * 2.2)).fill({ color: 0x88ccee, alpha: 0.04 });
    g.ellipse(tx(x), ty(y), ts(size * 2), ts(size * 1.5)).fill({ color: 0xaaddff, alpha: 0.06 });

    // Frost trail with branching crystalline patterns
    for (let i = 1; i <= 7; i++) {
      const tpx = x + dx * i * 6;
      const tpy = y + Math.sin(time * 6 + i * 2) * 1.5;
      const trailSize = size * 0.5 * (1 - i * 0.12);
      g.circle(tx(tpx), ty(tpy), ts(trailSize)).fill({ color: 0x88ddff, alpha: 0.1 * (1 - i / 8) });
      // Branching frost lines from trail
      if (i % 2 === 0) {
        const branchLen = trailSize * 2;
        for (let b = 0; b < 3; b++) {
          const ba = (b / 3) * Math.PI - Math.PI / 2 + Math.sin(time + i) * 0.3;
          g.setStrokeStyle({ width: ts(0.5), color: 0xaaeeff, alpha: 0.08 * (1 - i / 8) });
          g.moveTo(tx(tpx), ty(tpy)).lineTo(tx(tpx + Math.cos(ba) * branchLen), ty(tpy + Math.sin(ba) * branchLen)).stroke();
        }
      }
    }

    // Snowflake particles (6-armed stars)
    for (let i = 0; i < 6; i++) {
      const spx = x + dx * (3 + ((time * 50 + i * 37) % 22));
      const spy = y + ((time * 40 + i * 53) % 14) - 7;
      const sp = (time * 4 + i * 1.5) % 1;
      const sfSize = isBlizzard ? 1.2 : 1.8;
      // Draw 6-armed snowflake
      const sfx = tx(spx), sfy = ty(spy + sp * 6);
      const sfA = 0.2 * (1 - sp);
      for (let arm = 0; arm < 6; arm++) {
        const ang = (arm / 6) * Math.PI * 2 + time * 2;
        g.setStrokeStyle({ width: ts(0.4), color: 0xcceeFF, alpha: sfA });
        g.moveTo(sfx, sfy).lineTo(sfx + ts(Math.cos(ang) * sfSize * 1.5), sfy + ts(Math.sin(ang) * sfSize * 1.5)).stroke();
      }
      g.circle(sfx, sfy, ts(0.5)).fill({ color: 0xeeffff, alpha: sfA });
    }

    // BLIZZARD: multiple smaller shards with own trails
    if (isBlizzard) {
      for (let s = 0; s < 5; s++) {
        const sa = (s / 5) * Math.PI * 2 + time * 3;
        const sr = size * 1.2 + Math.sin(time * 4 + s) * 3;
        const sx2 = x + Math.cos(sa) * sr;
        const sy2 = y + Math.sin(sa) * sr;
        // Mini crystal shard
        const ms = size * 0.35;
        g.moveTo(tx(sx2 + ms), ty(sy2)).lineTo(tx(sx2), ty(sy2 - ms * 0.7))
          .lineTo(tx(sx2 - ms), ty(sy2)).lineTo(tx(sx2), ty(sy2 + ms * 0.7)).closePath()
          .fill({ color: 0x66ccff, alpha: 0.45 });
        // Mini trail
        for (let t = 1; t <= 3; t++) {
          g.circle(tx(sx2 + dx * t * 3), ty(sy2), ts(1)).fill({ color: 0x88ddff, alpha: 0.08 * (1 - t / 4) });
        }
      }
    }

    // Crystal body -- faceted diamond shape
    const cs = size;
    // Outer facet
    g.moveTo(tx(x + cs * 1.4), ty(y)).lineTo(tx(x), ty(y - cs * 1.1)).lineTo(tx(x - cs * 1.4), ty(y)).lineTo(tx(x), ty(y + cs * 1.1)).closePath()
      .fill({ color: 0x33aadd, alpha: 0.5 });
    // Inner facet
    g.moveTo(tx(x + cs * 1.2), ty(y)).lineTo(tx(x), ty(y - cs * 0.9)).lineTo(tx(x - cs * 1.2), ty(y)).lineTo(tx(x), ty(y + cs * 0.9)).closePath()
      .fill({ color: 0x44ccff, alpha: 0.7 });
    // Faceted highlight (top-right triangle)
    g.moveTo(tx(x + cs * 0.9), ty(y)).lineTo(tx(x + cs * 0.1), ty(y - cs * 0.7)).lineTo(tx(x - cs * 0.3), ty(y)).closePath()
      .fill({ color: 0xaaeeff, alpha: 0.4 });
    // Second highlight facet (bottom-left)
    g.moveTo(tx(x - cs * 0.2), ty(y)).lineTo(tx(x - cs * 0.1), ty(y + cs * 0.5)).lineTo(tx(x - cs * 0.7), ty(y)).closePath()
      .fill({ color: 0x99ddff, alpha: 0.2 });
    // Bright core
    g.circle(tx(x), ty(y), ts(size * 0.3)).fill({ color: 0xeeffff, alpha: 0.95 });
    g.circle(tx(x), ty(y), ts(size * 0.15)).fill({ color: 0xffffff, alpha: 1 });

    // Glow
    g.circle(tx(x), ty(y), ts(size * 2.5)).fill({ color: 0x44ccff, alpha: 0.06 });
    g.circle(tx(x), ty(y), ts(size * 4)).fill({ color: 0x2299cc, alpha: 0.025 });
  }

  private _drawLightningProj(g: Graphics, p: Projectile, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, _time: number): void {
    const { x, y, size } = p;
    const dir = sign(p.vx);
    const isChain = p.spell === SpellId.CHAIN_LIGHTNING;
    const isThunder = p.spell === SpellId.THUNDERSTORM;
    const boltLen = isChain ? 15 : 24, segs = 7, segLen = boltLen / segs;

    // THUNDERSTORM: brief dark cloud above
    if (isThunder) {
      const cloudY = y - 35;
      g.ellipse(tx(x), ty(cloudY), ts(25), ts(8)).fill({ color: 0x222244, alpha: 0.35 });
      g.ellipse(tx(x - 8), ty(cloudY + 2), ts(15), ts(6)).fill({ color: 0x1a1a33, alpha: 0.25 });
      g.ellipse(tx(x + 10), ty(cloudY - 1), ts(18), ts(7)).fill({ color: 0x252540, alpha: 0.3 });
      // Lightning from cloud to bolt
      g.setStrokeStyle({ width: ts(1), color: 0xffee88, alpha: 0.3 });
      g.moveTo(tx(x), ty(cloudY + 6)).lineTo(tx(x + (Math.random() - 0.5) * 6), ty(y - size)).stroke();
    }

    // Bright flash at origin point
    g.circle(tx(x - dir * boltLen / 2), ty(y), ts(size * 2)).fill({ color: 0xffffcc, alpha: 0.08 });
    g.circle(tx(x - dir * boltLen / 2), ty(y), ts(size)).fill({ color: 0xffffff, alpha: 0.12 });

    // Secondary crackling arc branches (more numerous)
    for (let a = 0; a < 5; a++) {
      const arcAngle = (Math.random() - 0.5) * Math.PI * 0.8;
      const arcLen = 8 + Math.random() * 12;
      // Wider yellow glow line
      g.setStrokeStyle({ width: ts(1.8), color: 0xffdd44, alpha: 0.12 });
      g.moveTo(tx(x), ty(y)).lineTo(tx(x + Math.cos(arcAngle) * arcLen * dir), ty(y + Math.sin(arcAngle) * arcLen)).stroke();
      // Thin bright core of branch
      g.setStrokeStyle({ width: ts(0.5), color: 0xffffff, alpha: 0.25 });
      g.moveTo(tx(x), ty(y)).lineTo(tx(x + Math.cos(arcAngle) * arcLen * dir), ty(y + Math.sin(arcAngle) * arcLen)).stroke();
    }

    // Outer glow bolt (wide, faint yellow)
    let bx = x - dir * boltLen / 2, by = y;
    g.setStrokeStyle({ width: ts(4), color: 0xffdd44, alpha: 0.25 });
    g.moveTo(tx(bx), ty(by));
    for (let i = 0; i < segs; i++) { bx += dir * segLen; by = y + (Math.random() - 0.5) * size * 2; g.lineTo(tx(bx), ty(by)); }
    g.stroke();

    // Main jagged bolt (multi-segment)
    bx = x - dir * boltLen / 2; by = y;
    g.setStrokeStyle({ width: ts(2.5), color: 0xffee66, alpha: 0.7 });
    g.moveTo(tx(bx), ty(by));
    for (let i = 0; i < segs; i++) { bx += dir * segLen; by = y + (Math.random() - 0.5) * size * 1.5; g.lineTo(tx(bx), ty(by)); }
    g.stroke();

    // Bright white core trace
    bx = x - dir * boltLen / 2; by = y;
    g.setStrokeStyle({ width: ts(1.2), color: 0xffffff, alpha: 0.9 });
    g.moveTo(tx(bx), ty(by));
    for (let i = 0; i < segs; i++) { bx += dir * segLen; by = y + (Math.random() - 0.5) * size * 0.8; g.lineTo(tx(bx), ty(by)); }
    g.stroke();

    // CHAIN_LIGHTNING: visible arc connection lines radiating out
    if (isChain) {
      for (let c = 0; c < 3; c++) {
        const ca = (c / 3) * Math.PI * 2 + p.age * 6;
        const cr = 18 + c * 5;
        const cx2 = x + Math.cos(ca) * cr;
        const cy2 = y + Math.sin(ca) * cr;
        g.setStrokeStyle({ width: ts(1), color: 0xffee88, alpha: 0.2 });
        g.moveTo(tx(x), ty(y)).lineTo(tx(cx2), ty(cy2)).stroke();
        g.circle(tx(cx2), ty(cy2), ts(1.5)).fill({ color: 0xffffff, alpha: 0.3 });
      }
    }

    // Central glow halos
    g.circle(tx(x), ty(y), ts(size * 2)).fill({ color: 0xffdd44, alpha: 0.1 });
    g.circle(tx(x), ty(y), ts(size * 3.5)).fill({ color: 0xffee88, alpha: 0.04 });
    g.circle(tx(x), ty(y), ts(size * 5)).fill({ color: 0xffdd44, alpha: 0.015 });
    // Bright white center dot
    g.circle(tx(x), ty(y), ts(2.5)).fill({ color: 0xffffff, alpha: 0.95 });
    g.circle(tx(x), ty(y), ts(1.2)).fill({ color: 0xffffff, alpha: 1 });
  }

  private _drawArcaneProj(g: Graphics, p: Projectile, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const { x, y, size } = p;
    const dx = -sign(p.vx);
    const isVoidBeam = p.spell === SpellId.VOID_BEAM;
    const isManaBurst = p.spell === SpellId.MANA_BURST;

    // Prismatic color shift
    const hueShift = (time * 2) % 1;
    const prismaticColors = [0xaa44ff, 0x4488ff, 0x44ffaa, 0xffaa44, 0xff44aa];
    const prismaticCol = prismaticColors[Math.floor(hueShift * prismaticColors.length) % prismaticColors.length];

    // Rune symbols trailing and fading
    for (let i = 1; i <= 6; i++) {
      const tpx = x + dx * i * 8;
      const tpy = y + Math.sin(time * 7 + i * 1.7) * 3;
      const tp = (time * 2.5 + i * 0.7) % 1;
      const runeAlpha = 0.12 * (1 - tp);
      // Rune: small cross with circle
      const rs = ts(2.5 * (1 - tp * 0.4));
      g.setStrokeStyle({ width: ts(0.5), color: prismaticCol, alpha: runeAlpha });
      g.moveTo(tx(tpx) - rs, ty(tpy)).lineTo(tx(tpx) + rs, ty(tpy)).stroke();
      g.moveTo(tx(tpx), ty(tpy) - rs).lineTo(tx(tpx), ty(tpy) + rs).stroke();
      g.setStrokeStyle({ width: ts(0.4), color: 0xcc88ff, alpha: runeAlpha * 0.7 });
      g.circle(tx(tpx), ty(tpy), rs * 0.7).stroke();
    }

    // MANA_BURST: sparkle trail
    if (isManaBurst) {
      for (let i = 0; i < 10; i++) {
        const spx = x + dx * (2 + ((time * 70 + i * 31) % 25));
        const spy = y + ((time * 50 + i * 47) % 14) - 7;
        const sp = (time * 5 + i * 1.3) % 1;
        this._drawStar4(g, tx(spx), ty(spy), ts(1.5 * (1 - sp)), prismaticCol, 0.25 * (1 - sp));
        g.circle(tx(spx), ty(spy), ts(3)).fill({ color: prismaticCol, alpha: 0.04 * (1 - sp) });
      }
    }

    // VOID_BEAM: continuous beam with pulsing nodes
    if (isVoidBeam) {
      const beamLen = 60;
      // Wide beam glow
      g.setStrokeStyle({ width: ts(8), color: 0x6622aa, alpha: 0.12 });
      g.moveTo(tx(x - dx * beamLen), ty(y)).lineTo(tx(x + dx * 5), ty(y)).stroke();
      // Core beam
      g.setStrokeStyle({ width: ts(3), color: 0xaa44ff, alpha: 0.35 });
      g.moveTo(tx(x - dx * beamLen), ty(y)).lineTo(tx(x + dx * 5), ty(y)).stroke();
      g.setStrokeStyle({ width: ts(1.2), color: 0xddbbff, alpha: 0.6 });
      g.moveTo(tx(x - dx * beamLen), ty(y)).lineTo(tx(x + dx * 5), ty(y)).stroke();
      // Pulsing nodes along beam
      for (let n = 0; n < 6; n++) {
        const nt = n / 6;
        const nx = x - dx * beamLen * nt;
        const nodeSize = 2 + Math.sin(time * 8 + n * 2) * 1;
        g.circle(tx(nx), ty(y), ts(nodeSize)).fill({ color: 0xcc88ff, alpha: 0.4 });
        g.circle(tx(nx), ty(y), ts(nodeSize * 2.5)).fill({ color: 0x7722cc, alpha: 0.08 });
      }
    }

    // Orbiting star particles (swirling vortex)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + time * 5;
      const oR = size * 1.3 + Math.sin(time * 3 + i) * 2;
      const ox = x + Math.cos(a) * oR;
      const oy = y + Math.sin(a) * oR;
      this._drawStar4(g, tx(ox), ty(oy), ts(1.8), prismaticCol, 0.35);
      g.circle(tx(ox), ty(oy), ts(3)).fill({ color: prismaticCol, alpha: 0.06 });
    }

    // Swirling vortex lines
    for (let v = 0; v < 3; v++) {
      const va = time * 4 + v * (Math.PI * 2 / 3);
      g.setStrokeStyle({ width: ts(0.6), color: 0xaa44ff, alpha: 0.1 });
      const vr1 = size * 0.5, vr2 = size * 1.5;
      g.moveTo(tx(x + Math.cos(va) * vr1), ty(y + Math.sin(va) * vr1))
        .lineTo(tx(x + Math.cos(va + 0.5) * vr2), ty(y + Math.sin(va + 0.5) * vr2)).stroke();
    }

    // Core orb -- layered glow with prismatic shift
    g.circle(tx(x), ty(y), ts(size + 2)).fill({ color: 0x5511aa, alpha: 0.35 });
    g.circle(tx(x), ty(y), ts(size + 1)).fill({ color: 0x7722cc, alpha: 0.5 });
    g.circle(tx(x), ty(y), ts(size)).fill({ color: prismaticCol, alpha: 0.65 });
    g.circle(tx(x), ty(y), ts(size * 0.6)).fill({ color: 0xcc88ff, alpha: 0.85 });
    g.circle(tx(x), ty(y), ts(size * 0.3)).fill({ color: 0xeeddff, alpha: 0.95 });
    g.circle(tx(x), ty(y), ts(size * 0.12)).fill({ color: 0xffffff, alpha: 1 });

    // Glow halos
    g.circle(tx(x), ty(y), ts(size * 2.5)).fill({ color: prismaticCol, alpha: 0.07 });
    g.circle(tx(x), ty(y), ts(size * 4)).fill({ color: 0x7722cc, alpha: 0.03 });
    g.circle(tx(x), ty(y), ts(size * 5.5)).fill({ color: 0x441188, alpha: 0.012 });
  }

  // -----------------------------------------------------------------------
  // Particles (damage numbers, fire sparks, ice crystals, etc.)
  // -----------------------------------------------------------------------

  private _drawParticles(g: Graphics, state: DuelState, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number): void {
    for (const p of state.particles) {
      if (p.text) continue; // handled by float text pool
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const px = tx(p.x), py = ty(p.y);
      const pSize = ts(p.size * lifeRatio);

      // Outer glow halo (all particles)
      g.circle(px, py, pSize * 3.5).fill({ color: p.color, alpha: lifeRatio * 0.06 });
      g.circle(px, py, pSize * 2).fill({ color: p.color, alpha: lifeRatio * 0.12 });

      // Element-specific shapes
      const col = p.color;
      const isFireColor = (col & 0xff0000) > 0x880000 && (col & 0x00ff00) < 0x008800 && (col & 0x0000ff) < 0x000044;
      const isIceColor = (col & 0x0000ff) > 0x000088 && (col & 0x00ff00) > 0x006600;
      const isLightningColor = (col & 0xff0000) > 0xbb0000 && (col & 0x00ff00) > 0x008800;
      const isArcaneColor = (col & 0xff0000) > 0x660000 && (col & 0x0000ff) > 0x000088;

      if (isFireColor) {
        // Fire particles: ember trail shape (elongated upward)
        g.ellipse(px, py - pSize * 0.3, pSize * 0.6, pSize).fill({ color: p.color, alpha: lifeRatio * 0.8 });
        g.ellipse(px, py - pSize * 0.5, pSize * 0.3, pSize * 0.6).fill({ color: 0xffaa44, alpha: lifeRatio * 0.5 });
        g.circle(px, py, pSize * 0.35).fill({ color: 0xffdd88, alpha: lifeRatio * 0.6 });
      } else if (isIceColor) {
        // Ice particles: crystalline diamond shape
        const hs = pSize * 0.8;
        g.moveTo(px + hs, py).lineTo(px, py - hs * 0.7).lineTo(px - hs, py).lineTo(px, py + hs * 0.7).closePath()
          .fill({ color: p.color, alpha: lifeRatio * 0.75 });
        g.circle(px, py, pSize * 0.25).fill({ color: 0xeeffff, alpha: lifeRatio * 0.6 });
      } else if (isLightningColor) {
        // Lightning particles: bright flash dots
        g.circle(px, py, pSize).fill({ color: 0xffffff, alpha: lifeRatio * 0.7 });
        g.circle(px, py, pSize * 0.5).fill({ color: 0xffffff, alpha: lifeRatio * 0.95 });
      } else if (isArcaneColor) {
        // Arcane particles: star shapes with glow
        this._drawStar4(g, px, py, pSize, p.color, lifeRatio * 0.7);
      } else {
        // Default circle
        g.circle(px, py, pSize).fill({ color: p.color, alpha: lifeRatio * 0.8 });
      }
    }

    // Impact burst: radial burst of element-colored particles on recent hits
    if (state.screenShake > 0) {
      const burstIntensity = state.screenShake / B.SHAKE_DURATION;
      const burstCol = getElementColor(state.selectedElement);
      const burstX = B.ENEMY_X, burstY = (B.ARENA_TOP + B.ARENA_BOTTOM) / 2;
      for (let i = 0; i < 12; i++) {
        const ba = (i / 12) * Math.PI * 2;
        const br = (1 - burstIntensity) * 40;
        const bpx = burstX + Math.cos(ba) * br;
        const bpy = burstY + Math.sin(ba) * br;
        g.circle(tx(bpx), ty(bpy), ts(2 * burstIntensity)).fill({ color: burstCol, alpha: 0.3 * burstIntensity });
        g.circle(tx(bpx), ty(bpy), ts(5 * burstIntensity)).fill({ color: burstCol, alpha: 0.06 * burstIntensity });
      }
    }
  }

  // -----------------------------------------------------------------------
  // HUD — HP bars, mana bars, round info, gold, score
  // -----------------------------------------------------------------------

  private _drawHUD(state: DuelState, ui: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number): void {
    const bw = 150, bh = 12;
    const bx = 20, by = 10;
    const time = state.time;

    // --- Player HP bar with gradient fill ---
    ui.rect(tx(bx - 1), ty(by - 1), ts(bw + 2), ts(bh + 2)).fill({ color: 0x221111, alpha: 0.8 });
    const hpR = Math.max(0, state.playerHp / state.playerMaxHp);
    // Gradient: green -> yellow -> red based on HP%
    const hpFillW = bw * hpR;
    const hpSegments = Math.ceil(hpFillW / 3);
    for (let s = 0; s < hpSegments; s++) {
      const segX = bx + s * 3;
      const segW = Math.min(3, hpFillW - s * 3);
      const segT = s / Math.max(1, hpSegments - 1);
      let segColor: number;
      if (hpR > 0.5) {
        segColor = lerpColor(0x44dd44, 0xdddd44, segT);
      } else if (hpR > 0.25) {
        segColor = lerpColor(0xdddd44, 0xdd6622, segT);
      } else {
        segColor = lerpColor(0xdd4422, 0xcc1111, segT);
      }
      ui.rect(tx(segX), ty(by), ts(segW), ts(bh)).fill({ color: segColor, alpha: 0.85 });
    }
    // Inner bevel highlight stripe
    if (hpFillW > 2) {
      ui.rect(tx(bx), ty(by + 1), ts(hpFillW), ts(2)).fill({ color: 0xffffff, alpha: 0.12 });
    }
    // Tick marks every 25%
    for (let t = 1; t <= 3; t++) {
      const tickX = bx + bw * (t / 4);
      ui.rect(tx(tickX), ty(by), ts(0.8), ts(bh)).fill({ color: 0x000000, alpha: 0.3 });
    }
    // Border
    ui.setStrokeStyle({ width: ts(1.2), color: 0x664444, alpha: 0.6 });
    ui.rect(tx(bx), ty(by), ts(bw), ts(bh)).stroke();

    // --- Player mana bar with blue gradient and shimmer ---
    const mby = by + bh + 4;
    ui.rect(tx(bx - 1), ty(mby - 1), ts(bw + 2), ts(bh + 2)).fill({ color: 0x111133, alpha: 0.8 });
    const mR = Math.max(0, state.playerMana / state.playerMaxMana);
    const mFillW = bw * mR;
    // Blue gradient fill
    const mSegs = Math.ceil(mFillW / 3);
    for (let s = 0; s < mSegs; s++) {
      const segX = bx + s * 3;
      const segW = Math.min(3, mFillW - s * 3);
      const segT = s / Math.max(1, mSegs - 1);
      const segColor = lerpColor(0x2244cc, 0x44aaff, segT);
      ui.rect(tx(segX), ty(mby), ts(segW), ts(bh)).fill({ color: segColor, alpha: 0.85 });
    }
    // Shimmer sweep animation
    const shimmerX = ((time * 60) % (bw + 30)) - 15;
    if (shimmerX < mFillW) {
      const shX = bx + Math.max(0, shimmerX);
      const shW = Math.min(15, mFillW - shimmerX);
      if (shW > 0) {
        ui.rect(tx(shX), ty(mby + 1), ts(shW), ts(bh - 2)).fill({ color: 0xaaddff, alpha: 0.15 });
      }
    }
    // Inner bevel
    if (mFillW > 2) {
      ui.rect(tx(bx), ty(mby + 1), ts(mFillW), ts(2)).fill({ color: 0xffffff, alpha: 0.1 });
    }
    ui.setStrokeStyle({ width: ts(1.2), color: 0x444488, alpha: 0.6 });
    ui.rect(tx(bx), ty(mby), ts(bw), ts(bh)).stroke();

    // Numeric text overlays on bars
    this._hudText.visible = true;
    this._hudText.x = tx(bx); this._hudText.y = ty(mby + bh + 4);
    this._hudText.text = `HP: ${Math.floor(state.playerHp)}/${state.playerMaxHp}  MP: ${Math.floor(state.playerMana)}/${state.playerMaxMana}`;

    // --- Enemy HP bar (top-right, fills from right) ---
    if (state.enemy && !state.enemy.defeated) {
      const ebx = B.CANVAS_W - bx - bw;
      ui.rect(tx(ebx - 1), ty(by - 1), ts(bw + 2), ts(bh + 2)).fill({ color: 0x221111, alpha: 0.8 });
      const eHpR = Math.max(0, state.enemy.hp / state.enemy.maxHp);
      const eHpFillW = bw * eHpR;
      const eStartX = ebx + bw - eHpFillW;
      // Gradient fill for enemy
      const eSegs = Math.ceil(eHpFillW / 3);
      for (let s = 0; s < eSegs; s++) {
        const segX = eStartX + s * 3;
        const segW = Math.min(3, eHpFillW - s * 3);
        const segT = s / Math.max(1, eSegs - 1);
        const segColor = lerpColor(lerpColor(state.enemy.color, 0x000000, 0.3), state.enemy.color, segT);
        ui.rect(tx(segX), ty(by), ts(segW), ts(bh)).fill({ color: segColor, alpha: 0.85 });
      }
      if (eHpFillW > 2) {
        ui.rect(tx(eStartX), ty(by + 1), ts(eHpFillW), ts(2)).fill({ color: 0xffffff, alpha: 0.1 });
      }
      for (let t = 1; t <= 3; t++) {
        const tickX = ebx + bw * (t / 4);
        ui.rect(tx(tickX), ty(by), ts(0.8), ts(bh)).fill({ color: 0x000000, alpha: 0.3 });
      }
      ui.setStrokeStyle({ width: ts(1.2), color: 0x664444, alpha: 0.6 });
      ui.rect(tx(ebx), ty(by), ts(bw), ts(bh)).stroke();

      // Enemy mana bar
      ui.rect(tx(ebx - 1), ty(mby - 1), ts(bw + 2), ts(bh + 2)).fill({ color: 0x111133, alpha: 0.8 });
      const eMR = Math.max(0, state.enemy.mana / state.enemy.maxMana);
      const eMFillW = bw * eMR;
      const eMStartX = ebx + bw - eMFillW;
      const eMSegs = Math.ceil(eMFillW / 3);
      for (let s = 0; s < eMSegs; s++) {
        const segX = eMStartX + s * 3;
        const segW = Math.min(3, eMFillW - s * 3);
        const segT = s / Math.max(1, eMSegs - 1);
        ui.rect(tx(segX), ty(mby), ts(segW), ts(bh)).fill({ color: lerpColor(0x2244cc, 0x44aaff, segT), alpha: 0.7 });
      }
      ui.setStrokeStyle({ width: ts(1.2), color: 0x444488, alpha: 0.6 });
      ui.rect(tx(ebx), ty(mby), ts(bw), ts(bh)).stroke();
    }

    // --- Top center: Round indicator with decorative ornate frame, gold coin, score star ---
    const centerX = B.CANVAS_W / 2;

    // Ornate round indicator frame
    const frameW = 280, frameH = 22;
    const frameX = centerX - frameW / 2, frameY = 3;
    // Background panel
    ui.rect(tx(frameX), ty(frameY), ts(frameW), ts(frameH)).fill({ color: 0x111122, alpha: 0.7 });
    // Double border
    ui.setStrokeStyle({ width: ts(1.5), color: 0x554488, alpha: 0.5 });
    ui.rect(tx(frameX), ty(frameY), ts(frameW), ts(frameH)).stroke();
    ui.setStrokeStyle({ width: ts(0.7), color: 0x443366, alpha: 0.3 });
    ui.rect(tx(frameX + 2), ty(frameY + 2), ts(frameW - 4), ts(frameH - 4)).stroke();
    // Corner decorations
    const cornSize = 3;
    const fCorners = [[frameX, frameY], [frameX + frameW, frameY], [frameX, frameY + frameH], [frameX + frameW, frameY + frameH]];
    for (const [fcx, fcy] of fCorners) {
      ui.circle(tx(fcx), ty(fcy), ts(cornSize)).fill({ color: 0x6644cc, alpha: 0.25 });
      ui.circle(tx(fcx), ty(fcy), ts(1.2)).fill({ color: 0xbbaaff, alpha: 0.35 });
    }

    // Gold coin icon (yellow circle with inner ring)
    const goldIconX = centerX + 60, goldIconY = frameY + frameH / 2;
    ui.circle(tx(goldIconX), ty(goldIconY), ts(5)).fill({ color: 0xffd700, alpha: 0.7 });
    ui.circle(tx(goldIconX), ty(goldIconY), ts(3.5)).fill({ color: 0xffee66, alpha: 0.5 });
    ui.setStrokeStyle({ width: ts(0.8), color: 0xccaa00, alpha: 0.5 });
    ui.circle(tx(goldIconX), ty(goldIconY), ts(3)).stroke();
    ui.circle(tx(goldIconX), ty(goldIconY), ts(1)).fill({ color: 0xffdd44, alpha: 0.4 });

    // Score star icon
    const starIconX = centerX + 20, starIconY = frameY + frameH / 2;
    this._drawStar4(ui, tx(starIconX), ty(starIconY), ts(4), 0xffdd44, 0.5);

    this._hudSmall.visible = true;
    this._hudSmall.anchor.set(0.5, 0);
    this._hudSmall.x = tx(centerX); this._hudSmall.y = ty(frameY + 3);
    if (state.enemy) {
      this._hudSmall.text = `R${state.round}  ${state.enemy.name} ${state.enemy.title}     ${state.score}       ${state.gold}`;
    } else {
      this._hudSmall.text = `R${state.round}     ${state.score}       ${state.gold}`;
    }
  }

  // -----------------------------------------------------------------------
  // Spell bar (bottom) — 4 element slots with icons, selected highlight, cooldowns
  // -----------------------------------------------------------------------

  private _drawSpellBar(_g: Graphics, ui: Graphics, state: DuelState, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, _time: number): void {
    const slotW = 56, slotH = 44, gap = 8;
    const totalW = ELEM_ORDER.length * slotW + (ELEM_ORDER.length - 1) * gap;
    const startX = (B.CANVAS_W - totalW) / 2;
    const barY = B.CANVAS_H - 62;
    const time = state.time;

    for (let i = 0; i < ELEM_ORDER.length; i++) {
      const elem = ELEM_ORDER[i];
      const sx = startX + i * (slotW + gap);
      const selected = state.selectedElement === elem;
      const col = getElementColor(elem);

      // Slot background
      ui.rect(tx(sx), ty(barY), ts(slotW), ts(slotH)).fill({ color: selected ? 0x222244 : 0x111122, alpha: 0.85 });

      if (selected) {
        // Animated glow border that pulses
        const glowPulse = 0.6 + Math.sin(time * 4) * 0.25;
        ui.rect(tx(sx - 4), ty(barY - 4), ts(slotW + 8), ts(slotH + 8)).fill({ color: col, alpha: 0.04 * glowPulse });
        ui.rect(tx(sx - 2), ty(barY - 2), ts(slotW + 4), ts(slotH + 4)).fill({ color: col, alpha: 0.06 * glowPulse });
        // Bright animated border
        ui.setStrokeStyle({ width: ts(2.5), color: col, alpha: 0.5 + glowPulse * 0.3 });
        ui.rect(tx(sx), ty(barY), ts(slotW), ts(slotH)).stroke();
        // Inner bright border
        ui.setStrokeStyle({ width: ts(0.8), color: lerpColor(col, 0xffffff, 0.4), alpha: 0.3 * glowPulse });
        ui.rect(tx(sx + 2), ty(barY + 2), ts(slotW - 4), ts(slotH - 4)).stroke();
      } else {
        ui.setStrokeStyle({ width: ts(1), color: 0x444466, alpha: 0.45 });
        ui.rect(tx(sx), ty(barY), ts(slotW), ts(slotH)).stroke();
      }

      // Element-specific mini-icons inside each slot
      const iconX = tx(sx + slotW / 2), iconY = ty(barY + 14);
      const iconS = ts(7);
      this._drawElementIcon(ui, elem, iconX, iconY, iconS);

      // Element label under icon
      // Key indicator at bottom of slot
      const keyY = ty(barY + slotH - 6);
      ui.rect(tx(sx + slotW / 2 - 5), keyY - ts(1), ts(10), ts(8)).fill({ color: 0x222233, alpha: 0.5 });
      ui.setStrokeStyle({ width: ts(0.5), color: 0x555577, alpha: 0.4 });
      ui.rect(tx(sx + slotW / 2 - 5), keyY - ts(1), ts(10), ts(8)).stroke();

      // Cooldown overlay: circular clock-wipe
      let spell: { element: Element; unlocked: boolean; id: string; cooldown: number } | undefined;
      for (let si = 0; si < state.playerSpells.length; si++) { const s = state.playerSpells[si]; if (s.element === elem && s.unlocked) { spell = s; break; } }
      if (spell) {
        const cd = state.playerCooldowns[spell.id] || 0;
        if (cd > 0) {
          const cdR = Math.min(1, cd / spell.cooldown);
          // Dark overlay
          ui.rect(tx(sx + 1), ty(barY + 1), ts(slotW - 2), ts(slotH - 2)).fill({ color: 0x000000, alpha: 0.45 });
          // Circular clock-wipe: draw arc segments to show cooldown
          const cwX = tx(sx + slotW / 2), cwY = ty(barY + slotH / 2);
          const cwR = ts(Math.min(slotW, slotH) / 2 - 2);
          const cwAngle = cdR * Math.PI * 2;
          // Draw the remaining arc as a "ready" indicator
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + cwAngle;
          // Cooldown sweep (the portion still on cooldown)
          ui.moveTo(cwX, cwY);
          for (let a = 0; a <= 16; a++) {
            const t = a / 16;
            const ang = startAngle + (endAngle - startAngle) * t;
            ui.lineTo(cwX + Math.cos(ang) * cwR, cwY + Math.sin(ang) * cwR);
          }
          ui.closePath().fill({ color: col, alpha: 0.12 });
          // Sweeping edge line
          ui.setStrokeStyle({ width: ts(1.5), color: col, alpha: 0.35 });
          ui.moveTo(cwX, cwY).lineTo(cwX + Math.cos(endAngle) * cwR, cwY + Math.sin(endAngle) * cwR).stroke();
        }
      }
    }

    // Element / spell text at bottom
    this._elementText.visible = true;
    this._elementText.anchor.set(0.5, 0);
    this._elementText.x = tx(B.CANVAS_W / 2); this._elementText.y = ty(B.CANVAS_H - 16);
    const avail = getAvailableSpells(state);
    const spellNames = avail.map((s, i) => {
      const key = i === 0 ? "Q" : i === 1 ? "W" : "E";
      const cd = state.playerCooldowns[s.id] ?? 0;
      const cdStr = cd > 0 ? ` (${cd.toFixed(1)}s)` : "";
      return `[${key}] ${s.name}${cdStr}`;
    }).join("  ");
    this._elementText.text = `${state.selectedElement.toUpperCase()}  |  1-4: Element  |  ${spellNames}`;
    this._elementText.style.fill = getElementColor(state.selectedElement);
  }

  private _drawElementIcon(g: Graphics, elem: Element, x: number, y: number, size: number): void {
    const col = getElementColor(elem);
    switch (elem) {
      case Element.FIRE:
        g.moveTo(x, y - size).lineTo(x + size * 0.6, y + size * 0.3)
          .quadraticCurveTo(x, y + size, x - size * 0.6, y + size * 0.3)
          .closePath().fill({ color: col, alpha: 0.8 });
        g.circle(x, y, size * 0.3).fill({ color: 0xffaa44, alpha: 0.65 });
        break;
      case Element.ICE:
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 - Math.PI / 2;
          g.setStrokeStyle({ width: size * 0.18, color: col, alpha: 0.7 });
          g.moveTo(x, y).lineTo(x + Math.cos(ang) * size, y + Math.sin(ang) * size).stroke();
        }
        g.circle(x, y, size * 0.2).fill({ color: 0xeeffff, alpha: 0.9 });
        break;
      case Element.LIGHTNING:
        g.setStrokeStyle({ width: size * 0.28, color: col, alpha: 0.8 });
        g.moveTo(x - size * 0.3, y - size)
          .lineTo(x + size * 0.1, y - size * 0.2)
          .lineTo(x - size * 0.2, y + size * 0.2)
          .lineTo(x + size * 0.4, y + size).stroke();
        g.circle(x, y, size * 0.15).fill({ color: 0xffffff, alpha: 0.8 });
        break;
      case Element.ARCANE:
        g.setStrokeStyle({ width: size * 0.14, color: col, alpha: 0.55 });
        g.circle(x, y, size * 0.7).stroke();
        for (let a = 0; a < 5; a++) {
          const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
          g.circle(x + Math.cos(ang) * size * 0.6, y + Math.sin(ang) * size * 0.6, size * 0.12).fill({ color: col, alpha: 0.7 });
        }
        g.circle(x, y, size * 0.25).fill({ color: 0xcc88ff, alpha: 0.8 });
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Phase: START — title, magic effects, "Press SPACE"
  // -----------------------------------------------------------------------

  private _renderStart(_state: DuelState, meta: DuelMeta, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const cx = B.CANVAS_W / 2, cy = B.CANVAS_H / 2 - 40;

    // Merlin silhouette on the left side
    const silX = cx - 200, silY = cy + 60;
    // Robe silhouette
    g.moveTo(tx(silX - 18), ty(silY - 50)).lineTo(tx(silX + 18), ty(silY - 50))
      .lineTo(tx(silX + 28), ty(silY + 10)).lineTo(tx(silX - 28), ty(silY + 10)).closePath()
      .fill({ color: 0x1a1a44, alpha: 0.35 });
    // Hat silhouette
    g.moveTo(tx(silX - 16), ty(silY - 48)).lineTo(tx(silX + 3), ty(silY - 95))
      .lineTo(tx(silX + 16), ty(silY - 48)).closePath()
      .fill({ color: 0x1a1a44, alpha: 0.35 });
    // Hat tip curve
    g.setStrokeStyle({ width: ts(1.5), color: 0x2a2a55, alpha: 0.25 });
    g.moveTo(tx(silX + 3), ty(silY - 95)).quadraticCurveTo(tx(silX + 12), ty(silY - 98), tx(silX + 15), ty(silY - 88)).stroke();
    // Staff silhouette
    g.setStrokeStyle({ width: ts(2.5), color: 0x1a1a44, alpha: 0.3 });
    g.moveTo(tx(silX + 30), ty(silY - 65)).lineTo(tx(silX + 30), ty(silY + 15)).stroke();
    // Staff orb glow
    g.circle(tx(silX + 30), ty(silY - 68), ts(6)).fill({ color: 0x4466cc, alpha: 0.15 + Math.sin(time * 2) * 0.05 });
    g.circle(tx(silX + 30), ty(silY - 68), ts(12)).fill({ color: 0x3355aa, alpha: 0.04 });

    // Animated magic circles behind title
    for (let ring = 0; ring < 3; ring++) {
      const r = 90 - ring * 14;
      const rot = time * (0.3 + ring * 0.1) * (ring % 2 === 0 ? 1 : -1);
      g.setStrokeStyle({ width: ts(1), color: 0x6644cc, alpha: 0.07 + ring * 0.015 });
      g.circle(tx(cx), ty(cy), ts(r)).stroke();
      for (let j = 0; j < 6 + ring * 2; j++) {
        const a = (j / (6 + ring * 2)) * Math.PI * 2 + rot;
        g.circle(tx(cx + Math.cos(a) * r), ty(cy + Math.sin(a) * r), ts(1.5)).fill({ color: 0x8866ee, alpha: 0.12 + Math.sin(time * 2 + j) * 0.06 });
      }
    }

    // Element orbs orbiting
    for (let i = 0; i < 4; i++) {
      const elem = ELEM_ORDER[i];
      const col = getElementColor(elem);
      const a = (i / 4) * Math.PI * 2 + time * 0.8;
      const oR = 120;
      const ox = cx + Math.cos(a) * oR;
      const oy = cy + Math.sin(a) * oR * 0.45;
      g.circle(tx(ox), ty(oy), ts(5)).fill({ color: col, alpha: 0.5 });
      g.circle(tx(ox), ty(oy), ts(3)).fill({ color: lerpColor(col, 0xffffff, 0.4), alpha: 0.7 });
      g.circle(tx(ox), ty(oy), ts(12)).fill({ color: col, alpha: 0.05 });
    }

    // Floating sparkles around title
    for (let i = 0; i < 14; i++) {
      const sa = (i / 14) * Math.PI * 2 + time * 0.5;
      const sr = 75 + Math.sin(time * 1.5 + i * 0.8) * 18;
      const sx = cx + Math.cos(sa) * sr;
      const sy = cy + Math.sin(sa) * sr * 0.5;
      const spa = 0.12 + Math.sin(time * 3 + i) * 0.08;
      g.circle(tx(sx), ty(sy), ts(1.2)).fill({ color: 0xbbaaff, alpha: spa });
      g.circle(tx(sx), ty(sy), ts(3)).fill({ color: 0x7744cc, alpha: spa * 0.25 });
    }

    this._titleText.visible = true;
    this._titleText.anchor.set(0.5); this._titleText.x = tx(cx); this._titleText.y = ty(cy - 20);

    this._subtitleText.visible = true;
    this._subtitleText.anchor.set(0.5); this._subtitleText.x = tx(cx); this._subtitleText.y = ty(cy + 25);

    this._controlsText.visible = true;
    this._controlsText.anchor.set(0.5);
    this._controlsText.x = tx(cx); this._controlsText.y = ty(cy + 60);
    this._controlsText.text =
      "1-4: Select element  |  Q/W/E: Cast spells\n" +
      "Arrow Up/Down: Move  |  Shift: Shield\n" +
      "Space: Quick cast  |  Esc: Pause/Exit";

    // Tournament bracket preview: 8 opponents as colored dots/icons
    const bracketX = cx + 140, bracketY = cy + 55;
    // Bracket frame
    g.setStrokeStyle({ width: ts(0.8), color: 0x443366, alpha: 0.3 });
    g.rect(tx(bracketX - 30), ty(bracketY - 5), ts(60), ts(75)).stroke();
    // "Tournament" label position
    for (let i = 0; i < Math.min(8, OPPONENTS.length); i++) {
      const opp = OPPONENTS[i];
      const row = i;
      const oy = bracketY + row * 8 + 2;
      // Opponent dot with their color
      g.circle(tx(bracketX - 18), ty(oy), ts(3)).fill({ color: opp.color, alpha: 0.55 });
      g.circle(tx(bracketX - 18), ty(oy), ts(1.5)).fill({ color: lerpColor(opp.color, 0xffffff, 0.3), alpha: 0.4 });
      // Connecting bracket line
      g.setStrokeStyle({ width: ts(0.5), color: 0x443366, alpha: 0.2 });
      g.moveTo(tx(bracketX - 14), ty(oy)).lineTo(tx(bracketX + 20), ty(oy)).stroke();
      // Round number
      g.circle(tx(bracketX + 22), ty(oy), ts(1)).fill({ color: 0x6644cc, alpha: 0.3 });
    }

    // Pulsing prompt
    this._promptText.visible = true;
    this._promptText.anchor.set(0.5); this._promptText.x = tx(cx); this._promptText.y = ty(cy + 140);
    this._promptText.alpha = 0.5 + Math.sin(time * 2.5) * 0.3;

    // Meta stats
    this._statsText.visible = true;
    this._statsText.anchor.set(0.5);
    this._statsText.x = tx(cx); this._statsText.y = ty(cy + 175);
    this._statsText.text = `Shards: ${meta.shards}  |  Best Round: ${meta.highestRound}  |  Wins: ${meta.totalWins}`;
  }

  // -----------------------------------------------------------------------
  // Phase: COUNTDOWN — "3... 2... 1... DUEL!"
  // -----------------------------------------------------------------------

  private _renderCountdown(state: DuelState, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number): void {
    const cx = B.CANVAS_W / 2, cy = B.CANVAS_H / 2;
    const ct = state.countdownTimer;
    const sec = Math.ceil(ct);
    const frac = ct - Math.floor(ct);
    const time = state.time;
    const isDuel = sec <= 0;

    // Multiple expanding ring pulses with each count
    for (let r = 0; r < 3; r++) {
      const ringFrac = ((frac + r * 0.15) % 1);
      const ringR = 30 + (1 - ringFrac) * 70;
      g.setStrokeStyle({ width: ts(2.5 - r * 0.6), color: isDuel ? 0xff4444 : 0xffdd44, alpha: ringFrac * (0.15 - r * 0.04) });
      g.circle(tx(cx), ty(cy), ts(ringR)).stroke();
    }

    // Element rings pulsing with each count
    for (let i = 0; i < 4; i++) {
      const elem = ELEM_ORDER[i];
      const col = getElementColor(elem);
      const elemR = 55 + Math.sin(frac * Math.PI) * 15;
      const a = (i / 4) * Math.PI * 2 + time * 1.2;
      const ex = cx + Math.cos(a) * elemR;
      const ey = cy + Math.sin(a) * elemR;
      const pulse = 0.3 + Math.sin(frac * Math.PI) * 0.3;
      g.circle(tx(ex), ty(ey), ts(5)).fill({ color: col, alpha: pulse * 0.5 });
      g.circle(tx(ex), ty(ey), ts(10)).fill({ color: col, alpha: pulse * 0.08 });
    }

    // Center glow (brighter)
    g.circle(tx(cx), ty(cy), ts(50)).fill({ color: isDuel ? 0xff4444 : 0xffdd44, alpha: 0.06 });
    g.circle(tx(cx), ty(cy), ts(30)).fill({ color: isDuel ? 0xff6644 : 0xffee88, alpha: 0.04 });

    // Number scale animation: scale up then shrink within each second
    const scalePhase = Math.sin(frac * Math.PI); // peaks at 0.5
    this._countdownText.visible = true;
    this._countdownText.anchor.set(0.5);
    this._countdownText.x = tx(cx); this._countdownText.y = ty(cy);
    this._countdownText.text = isDuel ? "DUEL!" : String(sec);
    // Scale the text
    const textScale = isDuel ? (1.0 + (1 - frac) * 0.4) : (0.85 + scalePhase * 0.3);
    this._countdownText.scale.set(textScale);

    // "DUEL!" burst effect
    if (isDuel) {
      // Radial burst lines
      for (let i = 0; i < 16; i++) {
        const ba = (i / 16) * Math.PI * 2;
        const br1 = 25 + (1 - frac) * 20;
        const br2 = 45 + (1 - frac) * 40;
        g.setStrokeStyle({ width: ts(1.5), color: 0xff6644, alpha: frac * 0.2 });
        g.moveTo(tx(cx + Math.cos(ba) * br1), ty(cy + Math.sin(ba) * br1))
          .lineTo(tx(cx + Math.cos(ba) * br2), ty(cy + Math.sin(ba) * br2)).stroke();
      }
      // Central flash
      g.circle(tx(cx), ty(cy), ts(35)).fill({ color: 0xffffff, alpha: frac * 0.08 });
    }

    if (state.enemy) {
      this._msgText.visible = true;
      this._msgText.anchor.set(0.5);
      this._msgText.x = tx(cx); this._msgText.y = ty(cy + 65);
      this._msgText.text = `Round ${state.round}: ${state.enemy.name} ${state.enemy.title}`;
    }
  }

  // -----------------------------------------------------------------------
  // Phase: ROUND_END — "VICTORY!" with gold earned and celebratory sparkles
  // -----------------------------------------------------------------------

  private _renderRoundEnd(state: DuelState, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const cx = B.CANVAS_W / 2, cy = B.CANVAS_H / 2;

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.3 });

    // Element-colored firework bursts (expanding rings with scattered sparks)
    const elemCol = getElementColor(state.selectedElement);
    const fwPositions = [[cx - 120, cy - 60], [cx + 130, cy - 50], [cx - 60, cy - 90], [cx + 80, cy - 80], [cx, cy - 70]];
    for (let fw = 0; fw < fwPositions.length; fw++) {
      const [fwx, fwy] = fwPositions[fw];
      const fwPhase = (time * 1.5 + fw * 1.2) % 3;
      if (fwPhase < 2) {
        const fwR = fwPhase * 35;
        const fwA = 0.3 * (1 - fwPhase / 2);
        // Expanding ring
        g.setStrokeStyle({ width: ts(1.5), color: elemCol, alpha: fwA });
        g.circle(tx(fwx), ty(fwy), ts(fwR)).stroke();
        // Second ring
        g.setStrokeStyle({ width: ts(0.8), color: lerpColor(elemCol, 0xffffff, 0.4), alpha: fwA * 0.5 });
        g.circle(tx(fwx), ty(fwy), ts(fwR * 0.7)).stroke();
        // Scattered sparks radiating outward
        for (let sp = 0; sp < 10; sp++) {
          const spa = (sp / 10) * Math.PI * 2 + fw;
          const spr = fwR * (0.8 + Math.sin(sp * 3) * 0.3);
          const spx = fwx + Math.cos(spa) * spr;
          const spy = fwy + Math.sin(spa) * spr;
          const sparkCol = sp % 3 === 0 ? 0xffd700 : sp % 3 === 1 ? elemCol : 0xffffff;
          g.circle(tx(spx), ty(spy), ts(1.2)).fill({ color: sparkCol, alpha: fwA * 0.8 });
        }
      }
    }

    // Gold coins raining down as yellow dots
    for (let i = 0; i < 20; i++) {
      const coinSeed = (i * 137 + 7) % 97;
      const coinX = 50 + (coinSeed / 97) * (B.CANVAS_W - 100);
      const coinY = ((time * 40 + i * 23) % (B.CANVAS_H + 20)) - 10;
      const coinWobble = Math.sin(time * 4 + i * 2) * 3;
      const coinAlpha = 0.35 + Math.sin(time * 3 + i) * 0.15;
      // Coin (small yellow circle with inner ring)
      g.circle(tx(coinX + coinWobble), ty(coinY), ts(3)).fill({ color: 0xffd700, alpha: coinAlpha });
      g.circle(tx(coinX + coinWobble), ty(coinY), ts(1.8)).fill({ color: 0xffee88, alpha: coinAlpha * 0.6 });
      g.setStrokeStyle({ width: ts(0.4), color: 0xccaa00, alpha: coinAlpha * 0.5 });
      g.circle(tx(coinX + coinWobble), ty(coinY), ts(1.5)).stroke();
    }

    // Celebratory sparkles
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + time;
      const r = 55 + Math.sin(time * 2 + i) * 18;
      const sx = cx + Math.cos(a) * r;
      const sy = cy - 35 + Math.sin(a) * r * 0.35;
      const cols = [0xffd700, 0xffee88, 0x44dd66, 0xffffff];
      g.circle(tx(sx), ty(sy), ts(1.5)).fill({ color: cols[i % cols.length], alpha: 0.25 + Math.sin(time * 3 + i) * 0.12 });
    }

    this._roundEndText.visible = true;
    this._roundEndText.anchor.set(0.5);
    this._roundEndText.x = tx(cx); this._roundEndText.y = ty(cy - 40);
    this._roundEndText.text = "VICTORY!";

    this._statsText.visible = true;
    this._statsText.anchor.set(0.5);
    this._statsText.x = tx(cx); this._statsText.y = ty(cy + 10);
    this._statsText.text = `+${B.GOLD_PER_ROUND} Gold earned\nPress SPACE to continue`;
  }

  // -----------------------------------------------------------------------
  // Phase: SHOP — grid of upgrades with costs, decorative border
  // -----------------------------------------------------------------------

  private _renderShop(state: DuelState, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0a1a, alpha: 0.95 });

    // Ornate scroll/parchment border (double frame with corner decorations)
    // Outer frame
    g.setStrokeStyle({ width: ts(3), color: 0x554422, alpha: 0.4 });
    g.rect(tx(15), ty(15), ts(B.CANVAS_W - 30), ts(B.CANVAS_H - 30)).stroke();
    // Inner frame
    g.setStrokeStyle({ width: ts(1.5), color: 0x665533, alpha: 0.3 });
    g.rect(tx(22), ty(22), ts(B.CANVAS_W - 44), ts(B.CANVAS_H - 44)).stroke();
    // Decorative line between frames
    g.setStrokeStyle({ width: ts(0.5), color: 0x443322, alpha: 0.2 });
    g.rect(tx(18), ty(18), ts(B.CANVAS_W - 36), ts(B.CANVAS_H - 36)).stroke();

    // Ornate corner decorations with flourishes
    const corners = [[22, 22], [B.CANVAS_W - 22, 22], [22, B.CANVAS_H - 22], [B.CANVAS_W - 22, B.CANVAS_H - 22]];
    for (let ci = 0; ci < corners.length; ci++) {
      const [rx, ry] = corners[ci];
      const p = Math.sin(time * 1.2 + rx * 0.1) * 0.3 + 0.7;
      // Corner gem
      g.circle(tx(rx), ty(ry), ts(5)).fill({ color: 0x6644cc, alpha: 0.2 * p });
      g.circle(tx(rx), ty(ry), ts(3)).fill({ color: 0xbbaaff, alpha: 0.25 * p });
      g.circle(tx(rx), ty(ry), ts(1.5)).fill({ color: 0xffffff, alpha: 0.15 * p });
      g.circle(tx(rx), ty(ry), ts(10)).fill({ color: 0x4422aa, alpha: 0.04 * p });
      // Flourish lines extending from corner
      const dirX = rx < B.CANVAS_W / 2 ? 1 : -1;
      const dirY = ry < B.CANVAS_H / 2 ? 1 : -1;
      g.setStrokeStyle({ width: ts(0.8), color: 0x665533, alpha: 0.2 });
      g.moveTo(tx(rx), ty(ry)).quadraticCurveTo(tx(rx + dirX * 15), ty(ry + dirY * 3), tx(rx + dirX * 25), ty(ry)).stroke();
      g.moveTo(tx(rx), ty(ry)).quadraticCurveTo(tx(rx + dirX * 3), ty(ry + dirY * 15), tx(rx), ty(ry + dirY * 25)).stroke();
    }

    // Parchment texture (subtle horizontal lines)
    for (let ly = 30; ly < B.CANVAS_H - 30; ly += 12) {
      g.setStrokeStyle({ width: ts(0.3), color: 0x332211, alpha: 0.04 });
      g.moveTo(tx(25), ty(ly)).lineTo(tx(B.CANVAS_W - 25), ty(ly)).stroke();
    }

    this._shopTitle.visible = true;
    this._shopTitle.anchor.set(0.5);
    this._shopTitle.x = tx(B.CANVAS_W / 2); this._shopTitle.y = ty(40);
    this._shopTitle.text = `ARCANE SHOP  \u2014  Gold: ${state.gold}  \u00b7  HP: ${Math.floor(state.playerHp)}/${state.playerMaxHp}`;

    // Shop items in grid (2 rows x 4 cols) with element-colored borders
    const cols = 4;
    const itemW = 160, itemH = 72, gapX = 12, gapY = 10;
    const gridW = cols * itemW + (cols - 1) * gapX;
    const gridStartX = (B.CANVAS_W - gridW) / 2;
    const gridStartY = 85;

    // Element colors for item card borders
    const elemColors = [0xff4400, 0x44ccff, 0xffdd44, 0xaa44ff, 0x44dd66, 0xffaa22, 0x4488ff, 0xcc44aa];

    for (let i = 0; i < SHOP_ITEMS.length && i < 8; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const ix = gridStartX + col * (itemW + gapX);
      const iy = gridStartY + row * (itemH + gapY);
      const item = SHOP_ITEMS[i];
      const canAfford = state.gold >= item.cost;
      const cardColor = elemColors[i % elemColors.length];

      // Card background with subtle gradient
      g.rect(tx(ix), ty(iy), ts(itemW), ts(itemH)).fill({ color: canAfford ? 0x1a1a33 : 0x111122, alpha: 0.85 });
      // Top highlight
      g.rect(tx(ix + 1), ty(iy + 1), ts(itemW - 2), ts(3)).fill({ color: cardColor, alpha: canAfford ? 0.08 : 0.03 });
      // Element-colored border
      g.setStrokeStyle({ width: ts(canAfford ? 1.5 : 0.8), color: canAfford ? cardColor : 0x333344, alpha: canAfford ? 0.5 : 0.35 });
      g.rect(tx(ix), ty(iy), ts(itemW), ts(itemH)).stroke();
      // Inner border for depth
      if (canAfford) {
        g.setStrokeStyle({ width: ts(0.5), color: cardColor, alpha: 0.15 });
        g.rect(tx(ix + 2), ty(iy + 2), ts(itemW - 4), ts(itemH - 4)).stroke();
      }

      // Cost coin indicator (more detailed)
      const coinX = ix + itemW - 16, coinY = iy + 12;
      g.circle(tx(coinX), ty(coinY), ts(6)).fill({ color: canAfford ? B.COLOR_GOLD : 0x666666, alpha: 0.5 });
      g.circle(tx(coinX), ty(coinY), ts(4.5)).fill({ color: canAfford ? 0xffee66 : 0x555555, alpha: 0.4 });
      g.setStrokeStyle({ width: ts(0.6), color: canAfford ? 0xccaa00 : 0x444444, alpha: 0.4 });
      g.circle(tx(coinX), ty(coinY), ts(3.5)).stroke();
      g.circle(tx(coinX), ty(coinY), ts(1.5)).fill({ color: canAfford ? 0xffdd44 : 0x444444, alpha: 0.35 });
    }

    // Text block for all items
    let itemLines = "";
    for (let i = 0; i < SHOP_ITEMS.length; i++) {
      const item = SHOP_ITEMS[i];
      const affordable = state.gold >= item.cost ? "" : " [need gold]";
      itemLines += `[${i + 1}] ${item.name} \u2014 ${item.description} (${item.cost}g)${affordable}\n`;
    }
    itemLines += "\nPress SPACE to continue to next round";

    this._shopItems.visible = true;
    this._shopItems.anchor.set(0.5, 0);
    this._shopItems.x = tx(B.CANVAS_W / 2); this._shopItems.y = ty(gridStartY + 2 * (itemH + gapY) + 15);
    this._shopItems.text = itemLines;
  }

  // -----------------------------------------------------------------------
  // Phase: VICTORY — grand celebration with magic circles and gold cascade
  // -----------------------------------------------------------------------

  private _renderVictory(state: DuelState, meta: DuelMeta, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const cx = B.CANVAS_W / 2, cy = B.CANVAS_H / 2;

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0a1a, alpha: 0.9 });

    // Golden rays radiating from center
    for (let i = 0; i < 16; i++) {
      const ra = (i / 16) * Math.PI * 2 + time * 0.15;
      const rayW = 3 + Math.sin(time * 2 + i) * 1.5;
      const innerR = 40, outerR = 200;
      g.setStrokeStyle({ width: ts(rayW), color: 0xffd700, alpha: 0.04 + Math.sin(time + i * 0.7) * 0.02 });
      g.moveTo(tx(cx + Math.cos(ra) * innerR), ty(cy - 40 + Math.sin(ra) * innerR))
        .lineTo(tx(cx + Math.cos(ra) * outerR), ty(cy - 40 + Math.sin(ra) * outerR)).stroke();
    }

    // Trophy/grail shape at center above title
    const trophyX = cx, trophyY = cy - 95;
    // Cup body (trapezoid widening upward)
    g.moveTo(tx(trophyX - 8), ty(trophyY + 20)).lineTo(tx(trophyX - 18), ty(trophyY))
      .quadraticCurveTo(tx(trophyX), ty(trophyY - 8), tx(trophyX + 18), ty(trophyY))
      .lineTo(tx(trophyX + 8), ty(trophyY + 20)).closePath()
      .fill({ color: 0xffd700, alpha: 0.5 });
    // Cup highlight
    g.moveTo(tx(trophyX - 5), ty(trophyY + 18)).lineTo(tx(trophyX - 12), ty(trophyY + 2))
      .lineTo(tx(trophyX - 2), ty(trophyY + 2)).closePath()
      .fill({ color: 0xffee88, alpha: 0.3 });
    // Stem
    g.rect(tx(trophyX - 3), ty(trophyY + 20), ts(6), ts(10)).fill({ color: 0xccaa00, alpha: 0.5 });
    // Base
    g.rect(tx(trophyX - 10), ty(trophyY + 29), ts(20), ts(4)).fill({ color: 0xffd700, alpha: 0.45 });
    // Handles
    g.setStrokeStyle({ width: ts(1.5), color: 0xccaa00, alpha: 0.4 });
    g.moveTo(tx(trophyX - 17), ty(trophyY + 3)).quadraticCurveTo(tx(trophyX - 25), ty(trophyY + 10), tx(trophyX - 17), ty(trophyY + 16)).stroke();
    g.moveTo(tx(trophyX + 17), ty(trophyY + 3)).quadraticCurveTo(tx(trophyX + 25), ty(trophyY + 10), tx(trophyX + 17), ty(trophyY + 16)).stroke();
    // Trophy glow
    g.circle(tx(trophyX), ty(trophyY + 10), ts(30)).fill({ color: 0xffd700, alpha: 0.06 });
    g.circle(tx(trophyX), ty(trophyY + 10), ts(18)).fill({ color: 0xffee88, alpha: 0.08 });
    // Star on trophy
    this._drawStar4(g, tx(trophyX), ty(trophyY + 8), ts(4), 0xffffff, 0.35 + Math.sin(time * 3) * 0.15);

    // Grand celebration magic circles
    for (let ring = 0; ring < 4; ring++) {
      const r = 70 + ring * 28;
      const rot = time * (0.2 + ring * 0.08) * (ring % 2 === 0 ? 1 : -1);
      g.setStrokeStyle({ width: ts(1.5), color: 0xffd700, alpha: 0.06 + ring * 0.015 });
      g.circle(tx(cx), ty(cy - 25), ts(r)).stroke();
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2 + rot;
        g.circle(tx(cx + Math.cos(a) * r), ty(cy - 25 + Math.sin(a) * r), ts(2)).fill({ color: 0xffee88, alpha: 0.18 });
      }
    }

    // Gold particle cascade
    for (let i = 0; i < 30; i++) {
      const px = (i * 27 + time * 40) % B.CANVAS_W;
      const py = (i * 43 + time * 55) % B.CANVAS_H;
      const sp = Math.sin(time * 4 + i) * 0.5 + 0.5;
      g.circle(tx(px), ty(py), ts(1 + sp)).fill({ color: 0xffd700, alpha: 0.12 * sp });
    }

    // All 8 opponent icons shown defeated (row at bottom)
    const oppRowY = cy + 100;
    const oppCount = Math.min(8, OPPONENTS.length);
    const oppGap = 50;
    const oppStartX = cx - (oppCount - 1) * oppGap / 2;
    for (let i = 0; i < oppCount; i++) {
      const opp = OPPONENTS[i];
      const ox = oppStartX + i * oppGap;
      // Defeated indicator (X mark)
      g.circle(tx(ox), ty(oppRowY), ts(8)).fill({ color: opp.color, alpha: 0.3 });
      g.circle(tx(ox), ty(oppRowY), ts(5)).fill({ color: lerpColor(opp.color, 0x000000, 0.3), alpha: 0.4 });
      // X mark over each
      g.setStrokeStyle({ width: ts(1.5), color: 0xff4444, alpha: 0.5 });
      g.moveTo(tx(ox - 4), ty(oppRowY - 4)).lineTo(tx(ox + 4), ty(oppRowY + 4)).stroke();
      g.moveTo(tx(ox + 4), ty(oppRowY - 4)).lineTo(tx(ox - 4), ty(oppRowY + 4)).stroke();
    }

    this._victoryTitle.visible = true;
    this._victoryTitle.anchor.set(0.5);
    this._victoryTitle.x = tx(cx); this._victoryTitle.y = ty(cy - 55);

    this._statsText.visible = true;
    this._statsText.anchor.set(0.5);
    this._statsText.x = tx(cx); this._statsText.y = ty(cy - 5);
    this._statsText.text =
      `Score: ${state.score}  |  Rounds Won: ${state.round}\n` +
      `Shards Earned: ${state.round + B.SHARDS_PER_WIN}  |  Total Shards: ${meta.shards}\n\n` +
      `Press SPACE to play again  |  ESC to exit`;

    this._renderUpgrades(meta, tx, ty, cy + 125);
  }

  // -----------------------------------------------------------------------
  // Phase: DEFEAT — stats, shard rewards, meta upgrade hints
  // -----------------------------------------------------------------------

  private _renderDefeat(state: DuelState, meta: DuelMeta, g: Graphics, tx: (n: number) => number, ty: (n: number) => number, ts: (n: number) => number, time: number): void {
    const cx = B.CANVAS_W / 2, cy = B.CANVAS_H / 2;

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x0a0a12, alpha: 0.92 });

    // Dark energy wisps (more dramatic, with trails)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 0.3;
      const r = 75 + Math.sin(time + i) * 22;
      const wx = cx + Math.cos(a) * r;
      const wy = cy - 30 + Math.sin(a) * r * 0.4;
      // Main wisp
      g.ellipse(tx(wx), ty(wy), ts(16 + Math.sin(time * 2 + i) * 6), ts(8 + Math.sin(time * 1.5 + i) * 3))
        .fill({ color: 0x220011, alpha: 0.1 });
      // Trailing wisp
      const trailA = a - 0.3;
      const trailR = r * 0.85;
      g.ellipse(tx(cx + Math.cos(trailA) * trailR), ty(cy - 30 + Math.sin(trailA) * trailR * 0.4),
        ts(10), ts(5)).fill({ color: 0x110008, alpha: 0.06 });
    }

    // Shard crystal icon above title
    const shardX = cx, shardY = cy - 110;
    // Crystal shape (hexagonal shard)
    g.moveTo(tx(shardX), ty(shardY - 15)).lineTo(tx(shardX + 10), ty(shardY - 5))
      .lineTo(tx(shardX + 10), ty(shardY + 8)).lineTo(tx(shardX), ty(shardY + 15))
      .lineTo(tx(shardX - 10), ty(shardY + 8)).lineTo(tx(shardX - 10), ty(shardY - 5))
      .closePath().fill({ color: 0x882244, alpha: 0.4 });
    // Crystal facet highlight
    g.moveTo(tx(shardX), ty(shardY - 13)).lineTo(tx(shardX + 8), ty(shardY - 4))
      .lineTo(tx(shardX + 2), ty(shardY + 3)).lineTo(tx(shardX - 3), ty(shardY - 3))
      .closePath().fill({ color: 0xcc4466, alpha: 0.25 });
    // Crystal glow
    g.circle(tx(shardX), ty(shardY), ts(20)).fill({ color: 0xff2244, alpha: 0.04 });
    g.circle(tx(shardX), ty(shardY), ts(4)).fill({ color: 0xff6688, alpha: 0.15 });
    // Crack lines on crystal
    g.setStrokeStyle({ width: ts(0.5), color: 0xff4466, alpha: 0.15 });
    g.moveTo(tx(shardX - 2), ty(shardY - 10)).lineTo(tx(shardX + 3), ty(shardY)).lineTo(tx(shardX - 1), ty(shardY + 8)).stroke();
    g.moveTo(tx(shardX + 5), ty(shardY - 3)).lineTo(tx(shardX + 1), ty(shardY + 5)).stroke();

    this._deathTitle.visible = true;
    this._deathTitle.anchor.set(0.5);
    this._deathTitle.x = tx(cx); this._deathTitle.y = ty(cy - 80);
    this._deathTitle.text = "DEFEATED";

    // Stats in bordered panels
    const panelW = 250, panelH = 60;
    const panelX = cx - panelW / 2, panelY = cy - 30;
    // Panel background
    g.rect(tx(panelX), ty(panelY), ts(panelW), ts(panelH)).fill({ color: 0x110011, alpha: 0.5 });
    // Panel border
    g.setStrokeStyle({ width: ts(1.2), color: 0x552233, alpha: 0.4 });
    g.rect(tx(panelX), ty(panelY), ts(panelW), ts(panelH)).stroke();
    g.setStrokeStyle({ width: ts(0.5), color: 0x442233, alpha: 0.2 });
    g.rect(tx(panelX + 2), ty(panelY + 2), ts(panelW - 4), ts(panelH - 4)).stroke();

    const roundsCleared = Math.max(0, state.round - 1);
    this._statsText.visible = true;
    this._statsText.anchor.set(0.5);
    this._statsText.x = tx(cx); this._statsText.y = ty(cy - 10);
    this._statsText.text =
      `Score: ${state.score}  |  Round Reached: ${state.round}\n` +
      `Shards Earned: ${roundsCleared * B.SHARDS_PER_ROUND}  |  Total Shards: ${meta.shards}\n\n` +
      `Press SPACE to retry  |  ESC to exit`;

    this._renderUpgrades(meta, tx, ty, cy + 50);
  }

  // -----------------------------------------------------------------------
  // Meta upgrade display (shared by victory/defeat)
  // -----------------------------------------------------------------------

  private _renderUpgrades(meta: DuelMeta, tx: (n: number) => number, ty: (n: number) => number, startY: number): void {
    const keys = ["maxHp", "manaRegen", "spellPower", "shieldEfficiency", "startingGold"] as const;
    const names = ["+Max HP", "+Mana Regen", "+Spell Power", "-Shield Drain", "+Starting Gold"];
    const costTable = B.UPGRADE_COSTS as Record<string, number[]>;

    let text = "UPGRADES (spend shards):\n";
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const level = meta.upgrades[key];
      const costs = costTable[key];
      if (level >= costs.length) {
        text += `  [${i + 1}] ${names[i]} \u2014 MAX\n`;
      } else {
        text += `  [${i + 1}] ${names[i]} \u2014 Lv ${level}/${costs.length} \u2014 ${costs[level]} shards\n`;
      }
    }

    this._shopItems.visible = true;
    this._shopItems.anchor.set(0.5, 0);
    this._shopItems.x = tx(B.CANVAS_W / 2); this._shopItems.y = ty(startY);
    this._shopItems.text = text;
  }

  // -----------------------------------------------------------------------
  // Phase: PAUSED — semi-transparent overlay
  // -----------------------------------------------------------------------

  private _renderPause(g: Graphics, tx: (n: number) => number, ty: (n: number) => number): void {
    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.45 });
    this._pauseText.visible = true;
    this._pauseText.anchor.set(0.5);
    this._pauseText.x = tx(B.CANVAS_W / 2); this._pauseText.y = ty(B.CANVAS_H / 2);
  }

  // -----------------------------------------------------------------------
  // Float text pool (damage numbers)
  // -----------------------------------------------------------------------

  private _renderFloatTexts(state: DuelState, tx: (n: number) => number, ty: (n: number) => number): void {
    const g = this._gfx;
    const texts = state.particles.filter(p => p.text);
    for (let i = 0; i < this._floatTexts.length; i++) {
      const ft = this._floatTexts[i];
      if (i < texts.length) {
        const p = texts[i];
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        ft.visible = true;
        ft.text = p.text!;
        ft.x = tx(p.x); ft.y = ty(p.y);
        ft.alpha = lifeRatio;
        ft.style.fill = p.color;

        // Element-colored glow halo behind damage numbers
        const glowR = 12 + (1 - lifeRatio) * 5;
        g.circle(ft.x, ft.y + 6, glowR).fill({ color: p.color, alpha: lifeRatio * 0.08 });
        g.circle(ft.x, ft.y + 6, glowR * 0.5).fill({ color: p.color, alpha: lifeRatio * 0.04 });

        // Scale up big hits
        const textVal = parseInt(p.text!);
        if (!isNaN(textVal) && textVal >= 30) {
          ft.scale.set(1.3 + (1 - lifeRatio) * 0.3);
          // Extra glow for big hits
          g.circle(ft.x, ft.y + 6, glowR * 1.5).fill({ color: p.color, alpha: lifeRatio * 0.05 });
        } else {
          ft.scale.set(1.0 + (1 - lifeRatio) * 0.15);
        }
      } else {
        ft.visible = false;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Hide all text objects
  // -----------------------------------------------------------------------

  private _hideAll(): void {
    this._titleText.visible = false;
    this._subtitleText.visible = false;
    this._controlsText.visible = false;
    this._promptText.visible = false;
    this._deathTitle.visible = false;
    this._victoryTitle.visible = false;
    this._roundEndText.visible = false;
    this._statsText.visible = false;
    this._pauseText.visible = false;
    this._countdownText.visible = false;
    this._hudText.visible = false;
    this._hudSmall.visible = false;
    this._msgText.visible = false;
    this._shopTitle.visible = false;
    this._shopItems.visible = false;
    this._elementText.visible = false;
  }
}
