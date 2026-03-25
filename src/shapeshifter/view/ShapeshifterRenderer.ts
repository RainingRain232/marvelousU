// ---------------------------------------------------------------------------
// Shapeshifter — PixiJS Renderer
// Nature/druidic arena combat — Wolf, Eagle, and Bear forms
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { SSPhase } from "../types";
import type { SSState, SSMeta, SSForm } from "../types";
import { SS, getSSGrade } from "../config/ShapeshifterBalance";

// ---------------------------------------------------------------------------
// Text styles — nature/druidic palette
// ---------------------------------------------------------------------------
const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0x44aa44, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x000000, distance: 4, blur: 10, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0x668844, fontStyle: "italic", letterSpacing: 3 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x99aa88, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0x66cc44, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_GRADE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 46, fill: 0x44aa44, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaaaacc, lineHeight: 22 });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x556644, lineHeight: 16 });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0x88cc66, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });
const STYLE_COMBO = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 28, fill: 0x44aa44, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.8 } });

const FLOAT_POOL = 16;

const FORM_COLORS: Record<SSForm, number> = { wolf: 0x88aacc, eagle: 0xddaa44, bear: 0x885533 };
const FORM_NAMES: Record<SSForm, string> = { wolf: "WOLF", eagle: "EAGLE", bear: "BEAR" };

// ---------------------------------------------------------------------------
export class ShapeshifterRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "SHAPESHIFTER", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Fang, Talon & Claw", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _comboText = new Text({ text: "", style: STYLE_COMBO });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _shopTexts: Text[] = [];
  private _shardText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
      dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
    }),
  });
  private _shopTitle = new Text({
    text: "UPGRADES", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 16, fill: 0x44aa44, fontWeight: "bold",
      letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 13, fill: 0x66cc44, fontWeight: "bold",
      letterSpacing: 2, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveAnnounceText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 26, fill: 0x88cc66, fontWeight: "bold",
      letterSpacing: 4, dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.9 },
    }),
  });
  private _highScoreText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "monospace", fontSize: 12, fill: 0x99aa88,
      dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
    }),
  });
  build(_sw: number, _sh: number): void {
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    for (const t of [
      this._hudText, this._titleText, this._subtitleText, this._controlsText,
      this._promptText, this._gradeText, this._statText, this._deathPrompt,
      this._pauseText, this._comboText, this._waveText,
      this._waveAnnounceText, this._highScoreText,
    ]) {
      this.container.addChild(t);
    }
    this._hudText.position.set(10, 8);
    // Shop texts: 5 upgrade rows
    for (let i = 0; i < 5; i++) {
      const t = new Text({
        text: "", style: new TextStyle({
          fontFamily: "monospace", fontSize: 11, fill: 0x99aa88,
          dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
        }),
      });
      this._shopTexts.push(t);
      this.container.addChild(t);
    }
    this.container.addChild(this._shardText);
    this.container.addChild(this._shopTitle);
    // Float text pool
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  render(state: SSState, sw: number, sh: number, meta: SSMeta): void {
    const g = this._gfx;
    const ui = this._uiGfx;
    g.clear();
    ui.clear();

    // 1. Background
    this._drawBackground(g, state, sw, sh);

    // 2. Screen shake
    let ox = 0, oy = 0;
    if (state.screenShake > 0) {
      ox = (Math.random() - 0.5) * state.screenShake * 2;
      oy = (Math.random() - 0.5) * state.screenShake * 2;
    }
    const arenaOffX = (sw - state.arenaW) / 2 + ox;
    const arenaOffY = (sh - state.arenaH) / 2 + oy;

    // 3. Playing layer
    if (state.phase === SSPhase.PLAYING || state.phase === SSPhase.PAUSED || state.phase === SSPhase.DEAD) {
      g.setTransform(arenaOffX, arenaOffY);
      this._drawArena(g, state);
      // Ambient floating dust
      for (let di = 0; di < 12; di++) {
        const dx = ((di * 277 + 43) % state.arenaW);
        const dy = ((di * 431 + 91 + state.time * (2 + di * 0.4)) % state.arenaH);
        g.circle(dx, dy, 0.8 + (di % 3) * 0.2).fill({ color: 0x88aa66, alpha: 0.04 + Math.sin(state.time * 0.7 + di) * 0.015 });
      }
      this._drawBloodStains(g, state);
      this._drawHazards(g, state);
      this._drawAllies(g, state);
      this._drawEnemies(g, state);
      this._drawBoss(g, state);
      this._drawPlayer(g, state);
      this._drawSlashes(g, state);
      this._drawProjectiles(g, state);
      this._drawPickups(g, state);
      this._drawParticles(g, state);
      this._drawShockwaves(g, state);
      g.setTransform(0, 0);
    }

    // 4. Screen flash
    if (state.screenFlashTimer > 0) {
      const flashRatio = Math.min(1, state.screenFlashTimer / SS.FLASH_DURATION);
      ui.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.18 * flashRatio });
      const ringR = Math.max(sw, sh) * (1 - flashRatio) * 0.5;
      ui.circle(sw / 2, sh / 2, ringR).stroke({ color: state.screenFlashColor, width: 3, alpha: flashRatio * 0.18 });
      ui.circle(sw / 2, sh / 2, ringR * 0.7).stroke({ color: 0xffffff, width: 1.5, alpha: flashRatio * 0.08 });
      const bloomW = 25 * flashRatio;
      ui.rect(0, 0, sw, bloomW).fill({ color: state.screenFlashColor, alpha: flashRatio * 0.06 });
      ui.rect(0, sh - bloomW, sw, bloomW).fill({ color: state.screenFlashColor, alpha: flashRatio * 0.06 });
      ui.rect(0, 0, bloomW, sh).fill({ color: state.screenFlashColor, alpha: flashRatio * 0.06 });
      ui.rect(sw - bloomW, 0, bloomW, sh).fill({ color: state.screenFlashColor, alpha: flashRatio * 0.06 });
    }

    // Low HP danger vignette
    if (state.phase === SSPhase.PLAYING && state.playerHP <= Math.ceil(state.maxHP * 0.3) && state.playerHP > 0) {
      const t2 = state.time;
      const dangerPulse = 0.06 + Math.sin(t2 * 4) * 0.03;
      const edgeW = 35 + Math.sin(t2 * 3) * 8;
      ui.rect(0, 0, sw, edgeW).fill({ color: 0xff0000, alpha: dangerPulse });
      ui.rect(0, sh - edgeW, sw, edgeW).fill({ color: 0xff0000, alpha: dangerPulse });
      ui.rect(0, 0, edgeW, sh).fill({ color: 0xff0000, alpha: dangerPulse });
      ui.rect(sw - edgeW, 0, edgeW, sh).fill({ color: 0xff0000, alpha: dangerPulse });
      if (state.playerHP <= 1) {
        const heartbeat = Math.pow(Math.sin(t2 * 5), 8) * 0.05;
        ui.rect(0, 0, sw, sh).fill({ color: 0xff0000, alpha: heartbeat });
      }
    }

    // Combat intensity border glow
    if (state.phase === SSPhase.PLAYING) {
      const aliveCount = state.enemies.filter(e => e.alive).length;
      if (aliveCount > 4) {
        const intensity = Math.min(1, (aliveCount - 4) / 12);
        const combatGlow = intensity * (0.025 + Math.sin(state.time * 1.5) * 0.008);
        const formColor = FORM_COLORS[state.currentForm];
        ui.rect(0, 0, sw, 3).fill({ color: formColor, alpha: combatGlow });
        ui.rect(0, sh - 3, sw, 3).fill({ color: formColor, alpha: combatGlow });
        ui.rect(0, 0, 3, sh).fill({ color: formColor, alpha: combatGlow });
        ui.rect(sw - 3, 0, 3, sh).fill({ color: formColor, alpha: combatGlow });
      }
    }

    // 5. Float texts
    this._renderFloatTexts(state, arenaOffX, arenaOffY);

    // 6. HUD
    this._drawHUD(state, meta, sw, sh);

    // 7. Screens
    if (state.phase === SSPhase.START) this._drawStartScreen(state, meta, sw, sh);
    else if (state.phase === SSPhase.DEAD) this._drawDeathScreen(state, meta, sw, sh);
    else if (state.phase === SSPhase.PAUSED) this._drawPauseScreen(sw, sh);

    // 8. Wave announce
    this._drawWaveAnnounce(state, sw, sh);

    // Hide screens when playing
    const isPlaying = state.phase === SSPhase.PLAYING;
    this._titleText.visible = state.phase === SSPhase.START;
    this._subtitleText.visible = state.phase === SSPhase.START;
    this._controlsText.visible = state.phase === SSPhase.START;
    this._promptText.visible = state.phase === SSPhase.START;
    this._pauseText.visible = state.phase === SSPhase.PAUSED;
    this._gradeText.visible = state.phase === SSPhase.DEAD;
    this._statText.visible = state.phase === SSPhase.DEAD;
    this._deathPrompt.visible = state.phase === SSPhase.DEAD;
    for (const t of this._shopTexts) t.visible = state.phase === SSPhase.DEAD;
    this._shardText.visible = state.phase === SSPhase.DEAD;
    this._shopTitle.visible = state.phase === SSPhase.DEAD;
    this._waveText.visible = isPlaying;
    this._hudText.visible = isPlaying || state.phase === SSPhase.PAUSED;
    this._highScoreText.visible = state.phase === SSPhase.START;
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------
  private _drawBackground(g: Graphics, _state: SSState, sw: number, sh: number): void {
    g.rect(0, 0, sw, sh).fill({ color: 0x040808 });
    const t = _state.time;
    // Forest canopy — dark green washes at top
    g.rect(0, 0, sw, sh * 0.3).fill({ color: 0x061208, alpha: 0.3 });
    g.circle(sw * 0.2, sh * 0.1, 150).fill({ color: 0x0a1a0a, alpha: 0.2 });
    g.circle(sw * 0.7, sh * 0.15, 180).fill({ color: 0x081608, alpha: 0.18 });
    // Moon with halo
    const mx = sw * 0.85, my = sh * 0.1;
    g.circle(mx, my, 45).fill({ color: 0x223322, alpha: 0.08 });
    g.circle(mx, my, 30).fill({ color: 0xccddaa, alpha: 0.12 });
    g.circle(mx, my, 20).fill({ color: 0xddeebb, alpha: 0.2 });
    g.circle(mx, my, 14).fill({ color: 0xeeffcc, alpha: 0.25 });
    // Moon craters
    g.circle(mx - 4, my - 2, 3).fill({ color: 0xbbcc99, alpha: 0.08 });
    g.circle(mx + 3, my + 4, 2).fill({ color: 0xbbcc99, alpha: 0.06 });
    // Stars
    for (let si = 0; si < 30; si++) {
      const sx = ((si * 197 + 53) % sw);
      const sy = ((si * 311 + 97) % (sh * 0.4));
      const sBright = ((si * 73) % 5) / 5;
      const sFlicker = 0.1 + sBright * 0.2 + Math.sin(t * (0.5 + si * 0.08) + si) * 0.06;
      g.circle(sx, sy, 0.5 + sBright * 0.6).fill({ color: 0x88aa88, alpha: sFlicker });
    }
    // Scattered leaf shapes
    for (let i = 0; i < 20; i++) {
      const lx = ((i * 137 + 217) % sw);
      const ly = ((i * 89 + 119) % sh);
      const la = (i * 0.61 + t * 0.03) % (Math.PI * 2);
      const ls = 4 + (i % 5);
      const lCos = Math.cos(la), lSin = Math.sin(la);
      g.moveTo(lx + lCos * (-ls), ly + lSin * (-ls))
        .lineTo(lx + (-lSin) * (-ls * 0.4), ly + lCos * (-ls * 0.4))
        .lineTo(lx + lCos * ls, ly + lSin * ls)
        .lineTo(lx + (-lSin) * (ls * 0.4), ly + lCos * (ls * 0.4))
        .closePath()
        .fill({ color: 0x1a3320, alpha: 0.15 + Math.sin(t * 0.3 + i) * 0.04 });
    }
    // Fireflies
    for (let fi = 0; fi < 8; fi++) {
      const fx = ((fi * 277 + 43 + t * (8 + fi * 2)) % sw);
      const fy = sh * 0.3 + ((fi * 431 + 91) % (sh * 0.6)) + Math.sin(t * 1.5 + fi * 2) * 10;
      const fAlpha = 0.15 + Math.sin(t * 3 + fi * 1.7) * 0.12;
      g.circle(fx, fy, 1.5).fill({ color: 0xaaff44, alpha: fAlpha });
      g.circle(fx, fy, 4).fill({ color: 0x88cc22, alpha: fAlpha * 0.15 });
    }
    // Vignette
    for (let r = 3; r > 0; r--) {
      const vr = Math.max(sw, sh) * (0.4 + r * 0.12);
      g.circle(sw / 2, sh / 2, vr).fill({ color: 0x000000, alpha: 0.05 });
    }
  }

  // ---------------------------------------------------------------------------
  // Arena
  // ---------------------------------------------------------------------------
  private _drawArena(g: Graphics, state: SSState): void {
    const { arenaW: aw, arenaH: ah } = state;
    const t = state.time;
    const cx = aw / 2, cy = ah / 2;
    // Dark earth floor with texture
    g.rect(0, 0, aw, ah).fill({ color: 0x0d1a10 });
    // Earth tile grid
    const tileSize = 30;
    for (let tx = 0; tx < aw; tx += tileSize) {
      for (let ty = 0; ty < ah; ty += tileSize) {
        const txi = Math.floor(tx / tileSize), tyi = Math.floor(ty / tileSize);
        const shade = (txi + tyi) % 2 === 0 ? 0x0f1d12 : 0x0c1a0e;
        const variation = ((txi * 73 + tyi * 137) % 5) * 0.003;
        g.rect(tx, ty, tileSize, tileSize).fill({ color: shade, alpha: 0.6 + variation });
        g.moveTo(tx, ty).lineTo(tx + tileSize, ty).stroke({ color: 0x0a1108, width: 0.5, alpha: 0.25 });
      }
    }
    // Ambient floor glow
    g.circle(cx, cy, Math.min(aw, ah) * 0.4).fill({ color: 0x0a1a0c, alpha: 0.12 + Math.sin(t * 0.7) * 0.03 });
    // Dynamic combat lighting
    const aliveCount = state.enemies.filter(e => e.alive).length;
    if (aliveCount > 4) {
      const intensity = Math.min(1, (aliveCount - 4) / 12);
      const combatGlow = intensity * (0.025 + Math.sin(t * 1.5) * 0.008);
      g.circle(cx, cy, Math.min(aw, ah) * 0.35).fill({ color: 0x220a00, alpha: combatGlow });
    }
    // Boss arena darkening
    if (state.bossWave) {
      g.rect(0, 0, aw, ah).fill({ color: 0x0a0005, alpha: 0.06 + Math.sin(t * 0.8) * 0.02 });
    }
    // Central druidic circle — ornamental mandala
    const manR = Math.min(aw, ah) * 0.28;
    g.circle(cx, cy, manR).stroke({ color: 0x33aa33, width: 1.5, alpha: 0.1 + Math.sin(t * 0.6) * 0.03 });
    g.circle(cx, cy, manR * 0.75).stroke({ color: 0x44bb44, width: 1, alpha: 0.08 });
    g.circle(cx, cy, manR * 0.45).stroke({ color: 0x55cc55, width: 1, alpha: 0.09 + Math.sin(t * 0.8) * 0.02 });
    // Radiating vine lines
    for (let ri = 0; ri < 8; ri++) {
      const ra = t * 0.1 + ri * Math.PI / 4;
      g.moveTo(cx + Math.cos(ra) * manR * 0.15, cy + Math.sin(ra) * manR * 0.15)
        .lineTo(cx + Math.cos(ra) * manR * 0.95, cy + Math.sin(ra) * manR * 0.95)
        .stroke({ color: 0x33aa33, width: 0.7, alpha: 0.07 + Math.sin(t * 0.5 + ri) * 0.02 });
    }
    // Leaf marks on outer circle
    for (let i = 0; i < 8; i++) {
      const a = t * 0.1 + (i / 8) * Math.PI * 2;
      const lx2 = cx + Math.cos(a) * manR, ly2 = cy + Math.sin(a) * manR;
      const la = a + Math.PI / 2;
      const lC = Math.cos(la), lS = Math.sin(la);
      g.moveTo(lx2 + lC * (-6), ly2 + lS * (-6))
        .lineTo(lx2 + (-lS) * (-2.5), ly2 + lC * (-2.5))
        .lineTo(lx2 + lC * 6, ly2 + lS * 6)
        .lineTo(lx2 + (-lS) * 2.5, ly2 + lC * 2.5)
        .closePath()
        .fill({ color: 0x44aa44, alpha: 0.15 });
    }
    // Center focal
    g.circle(cx, cy, 5).fill({ color: 0x33aa33, alpha: 0.08 + Math.sin(t * 1.2) * 0.03 });
    // Stone border with moss
    const bw = 6;
    g.rect(0, 0, aw, bw).fill({ color: 0x2a3a2a });
    g.rect(0, ah - bw, aw, bw).fill({ color: 0x2a3a2a });
    g.rect(0, 0, bw, ah).fill({ color: 0x2a3a2a });
    g.rect(aw - bw, 0, bw, ah).fill({ color: 0x2a3a2a });
    // Outer glow
    g.rect(0, 0, aw, 2).fill({ color: 0x44aa44, alpha: 0.25 + Math.sin(t * 1.2) * 0.08 });
    g.rect(0, ah - 2, aw, 2).fill({ color: 0x44aa44, alpha: 0.25 + Math.sin(t * 1.2) * 0.08 });
    g.rect(0, 0, 2, ah).fill({ color: 0x44aa44, alpha: 0.25 + Math.sin(t * 1.2) * 0.08 });
    g.rect(aw - 2, 0, 2, ah).fill({ color: 0x44aa44, alpha: 0.25 + Math.sin(t * 1.2) * 0.08 });
    // Grass tufts along border (more detailed)
    for (let gx = 14; gx < aw - 14; gx += 18) {
      const topGy = 10, botGy = ah - 14;
      for (let gi = 0; gi < 3; gi++) {
        const gOff = (gi - 1) * 3;
        const gLen = 4 + Math.sin(t * 2 + gx * 0.1 + gi) * 1.5;
        g.moveTo(gx + gOff, topGy + 5).lineTo(gx + gOff + Math.sin(t + gi + gx) * 1.5, topGy + 5 - gLen)
          .stroke({ color: 0x33aa22, alpha: 0.45, width: 1 });
        g.moveTo(gx + gOff, botGy + 5).lineTo(gx + gOff + Math.sin(t + gi + gx) * 1.5, botGy + 5 - gLen)
          .stroke({ color: 0x33aa22, alpha: 0.45, width: 1 });
      }
    }
    // Corner nature crystals
    const corners = [[12, 12], [aw - 12, 12], [12, ah - 12], [aw - 12, ah - 12]];
    for (let ci = 0; ci < corners.length; ci++) {
      const [cpx, cpy] = corners[ci];
      const floatY = Math.sin(t * 1.5 + ci * 1.8) * 2;
      // Crystal
      g.circle(cpx, cpy + floatY, 12).fill({ color: 0x228822, alpha: 0.06 + Math.sin(t * 2 + ci) * 0.02 });
      g.moveTo(cpx, cpy + floatY - 10).lineTo(cpx - 5, cpy + floatY + 2).lineTo(cpx + 5, cpy + floatY + 2)
        .closePath().fill({ color: 0x44cc44, alpha: 0.4 });
      g.circle(cpx, cpy + floatY - 3, 2.5).fill({ color: 0x88ff88, alpha: 0.35 });
      // Mushroom
      g.ellipse(cpx + 8, cpy + floatY, 5, 3).fill({ color: 0xcc4422, alpha: 0.4 });
      g.rect(cpx + 7, cpy + floatY, 2, 5).fill({ color: 0xddccaa, alpha: 0.35 });
    }
  }

  // ---------------------------------------------------------------------------
  // Blood stains
  // ---------------------------------------------------------------------------
  private _drawBloodStains(g: Graphics, state: SSState): void {
    for (const bs of state.bloodStains) {
      g.circle(bs.x, bs.y, bs.size).fill({ color: 0x331108, alpha: bs.alpha * 0.5 });
      g.circle(bs.x, bs.y, bs.size * 0.65).fill({ color: 0x441511, alpha: bs.alpha * 0.35 });
      for (let si = 0; si < 3; si++) {
        const sa = si * Math.PI * 2 / 3 + bs.x * 0.1;
        const sd = bs.size * 0.5 + si * 1.5;
        g.circle(bs.x + Math.cos(sa) * sd, bs.y + Math.sin(sa) * sd, 1.2)
          .fill({ color: 0x2a0a04, alpha: bs.alpha * 0.2 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Arena Hazards
  // ---------------------------------------------------------------------------
  private _drawHazards(g: Graphics, state: SSState): void {
    const t = state.time;
    for (const h of state.arenaHazards) {
      const lifeRatio = h.life / h.maxLife;

      if (h.kind === "bramble") {
        // Thorny bramble patch — red-brown dangerous zone
        g.circle(h.x, h.y, h.radius).fill({ color: 0x221108, alpha: (h.active ? 0.15 : 0.05) * lifeRatio });
        if (h.active) {
          const pulse = 0.35 + Math.sin(t * 5) * 0.12;
          g.circle(h.x, h.y, h.radius).stroke({ color: 0xaa4422, width: 2, alpha: pulse * lifeRatio });
          g.circle(h.x, h.y, h.radius * 0.65).stroke({ color: 0x883322, width: 1, alpha: pulse * 0.5 * lifeRatio });
          // Thorn spikes
          for (let si = 0; si < 8; si++) {
            const sa = t * 0.15 + si * Math.PI / 4;
            const innerR = h.radius * 0.4;
            const outerR = h.radius * 0.85;
            g.moveTo(h.x + Math.cos(sa) * innerR, h.y + Math.sin(sa) * innerR)
              .lineTo(h.x + Math.cos(sa) * outerR, h.y + Math.sin(sa) * outerR)
              .stroke({ color: 0x664422, width: 1.5, alpha: 0.4 * lifeRatio });
            // Branch
            const ba = sa + 0.3;
            g.moveTo(h.x + Math.cos(sa) * (innerR + outerR) * 0.5, h.y + Math.sin(sa) * (innerR + outerR) * 0.5)
              .lineTo(h.x + Math.cos(ba) * outerR * 0.7, h.y + Math.sin(ba) * outerR * 0.7)
              .stroke({ color: 0x553311, width: 1, alpha: 0.3 * lifeRatio });
          }
          // Warning center
          g.moveTo(h.x, h.y - 5).lineTo(h.x - 4, h.y + 3).lineTo(h.x + 4, h.y + 3).closePath()
            .stroke({ color: 0xff4422, width: 1.5, alpha: 0.5 * lifeRatio });
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x442211, width: 1, alpha: 0.15 * lifeRatio });
        }

      } else if (h.kind === "swamp") {
        // Murky green slow zone
        g.circle(h.x, h.y, h.radius).fill({ color: 0x112208, alpha: (h.active ? 0.18 : 0.06) * lifeRatio });
        if (h.active) {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x446622, width: 2, alpha: 0.35 * lifeRatio });
          // Bubbles
          for (let bi = 0; bi < 5; bi++) {
            const ba = t * 0.8 + bi * Math.PI * 2 / 5;
            const bd = h.radius * (0.2 + (t * 0.3 + bi * 0.15) % 0.7);
            const bubbleSize = 1.5 + Math.sin(t * 2 + bi) * 0.5;
            g.circle(h.x + Math.cos(ba) * bd, h.y + Math.sin(ba) * bd, bubbleSize)
              .fill({ color: 0x88aa44, alpha: 0.3 * lifeRatio });
          }
          // Ripple rings
          for (let ri = 0; ri < 2; ri++) {
            const rr = h.radius * (0.3 + ri * 0.3) + Math.sin(t * 1.5 + ri) * 3;
            g.circle(h.x, h.y, rr).stroke({ color: 0x557733, width: 1, alpha: 0.2 * lifeRatio });
          }
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x223311, width: 1, alpha: 0.1 * lifeRatio });
        }

      } else if (h.kind === "spirit_well") {
        // Glowing healing zone — golden-green
        g.circle(h.x, h.y, h.radius).fill({ color: 0x112211, alpha: (h.active ? 0.12 : 0.04) * lifeRatio });
        if (h.active) {
          const pulse = 0.3 + Math.sin(t * 2.5) * 0.1;
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x44cc44, width: 2, alpha: pulse * lifeRatio });
          g.circle(h.x, h.y, h.radius * 0.6).stroke({ color: 0x88ff88, width: 1, alpha: pulse * 0.5 * lifeRatio });
          // Upward flowing particles (simulated)
          for (let pi = 0; pi < 6; pi++) {
            const pa = t * 1.2 + pi * Math.PI / 3;
            const pd = h.radius * ((t * 0.4 + pi * 0.2) % 0.8);
            const py2 = h.y - ((t * 15 + pi * 11) % 15);
            const pAlpha = (1 - pd / h.radius) * 0.4;
            g.circle(h.x + Math.cos(pa) * pd, py2, 1.2)
              .fill({ color: 0x88ff88, alpha: pAlpha * lifeRatio });
          }
          // Center glow
          g.circle(h.x, h.y, 6).fill({ color: 0x44ff44, alpha: 0.15 * lifeRatio + Math.sin(t * 3) * 0.05 });
          g.circle(h.x, h.y, 3).fill({ color: 0xaaffaa, alpha: 0.25 * lifeRatio });
          // Cross symbol (healing)
          g.moveTo(h.x - 4, h.y).lineTo(h.x + 4, h.y).stroke({ color: 0x88ff88, width: 1.5, alpha: 0.4 * lifeRatio });
          g.moveTo(h.x, h.y - 4).lineTo(h.x, h.y + 4).stroke({ color: 0x88ff88, width: 1.5, alpha: 0.4 * lifeRatio });
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x225522, width: 1, alpha: 0.1 * lifeRatio });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Player — form-specific drawing
  // ---------------------------------------------------------------------------
  private _drawPlayer(g: Graphics, state: SSState): void {
    const { playerX: px, playerY: py, playerRadius: r, currentForm, aimAngle, invulnTimer } = state;
    if (invulnTimer > 0 && Math.floor(invulnTimer * 12) % 2 === 0) return;

    const formColor = FORM_COLORS[currentForm];
    const t = state.time;

    // Player shadow
    g.ellipse(px + 2, py + 4, r * 1.1, r * 0.45).fill({ color: 0x000000, alpha: 0.2 });
    // Form-colored multi-layer aura
    g.circle(px, py, r + 12).fill({ color: formColor, alpha: 0.03 + Math.sin(t * 2) * 0.01 });
    g.circle(px, py, r + 7).fill({ color: formColor, alpha: 0.08 + Math.sin(t * 3) * 0.02 });
    g.circle(px, py, r + 3).fill({ color: formColor, alpha: 0.12 });

    if (currentForm === "wolf") {
      // Sprint afterimages
      if (state.wolfSprinting) {
        for (let i = 1; i <= 3; i++) {
          const tx = px - Math.cos(state.moveAngle) * i * 6;
          const ty = py - Math.sin(state.moveAngle) * i * 6;
          g.ellipse(tx, ty, r * 0.9, r * 0.7).fill({ color: 0x88aacc, alpha: 0.12 / i });
        }
      }
      // Lunge trail
      if (state.wolfLunging) {
        for (let i = 1; i <= 4; i++) {
          const tx = px - Math.cos(state.wolfLungeAngle) * i * 9;
          const ty = py - Math.sin(state.wolfLungeAngle) * i * 9;
          g.ellipse(tx, ty, r, r * 0.75).fill({ color: 0x88aacc, alpha: 0.18 / i });
        }
      }
      // Helper: rotate local (lx,ly) by aimAngle around (px,py)
      const wC = Math.cos(aimAngle), wS = Math.sin(aimAngle);
      const wR = (lx: number, ly: number): [number, number] =>
        [px + wC * lx - wS * ly, py + wS * lx + wC * ly];
      // Wolf body — layered fur
      g.circle(px, py, r + 1).fill({ color: 0x667799, alpha: 0.5 });
      g.circle(px, py, r).fill({ color: 0x88aacc });
      g.circle(px, py, r * 0.75).fill({ color: 0x99bbdd, alpha: 0.6 });
      // Belly lighter patch
      { const [bx2,by2] = wR(0, r * 0.2); g.circle(bx2, by2, r * 0.4).fill({ color: 0xaaccee, alpha: 0.25 }); }
      // Snout
      { const [sx2,sy2] = wR(0, -r * 0.75); g.ellipse(sx2, sy2, r * 0.3, r * 0.2).fill({ color: 0x99bbdd, alpha: 0.7 }); }
      { const [nx2,ny2] = wR(0, -r * 0.85); g.circle(nx2, ny2, 2).fill({ color: 0x334455, alpha: 0.8 }); }
      // Pointed ears (taller)
      { const [x0,y0] = wR(-r*0.5,-r*0.85), [x1,y1] = wR(-r*0.25,-r*1.6), [x2,y2] = wR(r*0.05,-r*0.85);
        g.moveTo(x0,y0).lineTo(x1,y1).lineTo(x2,y2).closePath().fill({ color: 0x99bbdd });
        // Inner ear
        const [ix,iy] = wR(-r*0.3,-r*1.2);
        g.circle(ix,iy,1.5).fill({ color: 0xbbccee, alpha: 0.4 }); }
      { const [x0,y0] = wR(r*0.05,-r*0.85), [x1,y1] = wR(r*0.3,-r*1.6), [x2,y2] = wR(r*0.55,-r*0.85);
        g.moveTo(x0,y0).lineTo(x1,y1).lineTo(x2,y2).closePath().fill({ color: 0x99bbdd });
        const [ix,iy] = wR(r*0.35,-r*1.2);
        g.circle(ix,iy,1.5).fill({ color: 0xbbccee, alpha: 0.4 }); }
      // Eyes — glowing blue with pupil
      { const [ex,ey] = wR(-r*0.25,-r*0.45);
        g.circle(ex,ey,3).fill({ color: 0x44aaff, alpha: 0.9 });
        g.circle(ex,ey,4.5).fill({ color: 0x44aaff, alpha: 0.15 });
        g.circle(ex,ey,1.2).fill({ color: 0x112233 }); }
      { const [ex,ey] = wR(r*0.25,-r*0.45);
        g.circle(ex,ey,3).fill({ color: 0x44aaff, alpha: 0.9 });
        g.circle(ex,ey,4.5).fill({ color: 0x44aaff, alpha: 0.15 });
        g.circle(ex,ey,1.2).fill({ color: 0x112233 }); }
      // Tail — thicker, curved
      { const [tx0,ty0] = wR(0,r*0.7), [tcx,tcy] = wR(-r*0.7,r*1.3), [tx1,ty1] = wR(-r*0.4,r*1.9);
        g.moveTo(tx0,ty0).quadraticCurveTo(tcx,tcy,tx1,ty1)
          .stroke({ color: 0x7799bb, width: 3, alpha: 0.75 });
        g.moveTo(tx0,ty0).quadraticCurveTo(tcx,tcy,tx1,ty1)
          .stroke({ color: 0x99bbdd, width: 1.5, alpha: 0.4 }); }

    } else if (currentForm === "eagle") {
      const wingAnim = Math.sin(t * 8) * 0.18;
      // Dive trail
      if (state.eagleDiving) {
        for (let i = 1; i <= 5; i++) {
          const tx = px - Math.cos(aimAngle) * i * 10;
          const ty = py - Math.sin(aimAngle) * i * 10;
          g.circle(tx, ty, r * 0.8).fill({ color: 0xddaa44, alpha: 0.15 / i });
        }
      }
      // Helper: rotate local (lx,ly) by aimAngle around (px,py)
      const eC = Math.cos(aimAngle), eS = Math.sin(aimAngle);
      const eR = (lx: number, ly: number): [number, number] =>
        [px + eC * lx - eS * ly, py + eS * lx + eC * ly];
      // Golden body — layered plumage
      g.circle(px, py, r + 1).fill({ color: 0xaa8833, alpha: 0.5 });
      g.circle(px, py, r).fill({ color: 0xddaa44 });
      g.circle(px, py, r * 0.7).fill({ color: 0xeebb55, alpha: 0.55 });
      g.circle(px, py, r * 0.35).fill({ color: 0xffcc66, alpha: 0.35 });
      // Wings — filled with feather-like segments
      const wSpan = r * 2.2 + Math.abs(wingAnim) * r * 4;
      // Left wing
      { const [x0,y0] = eR(-r*0.6,0), [cx2,cy2] = eR(-wSpan,-r*(0.8+wingAnim*2)), [x1,y1] = eR(-wSpan*0.7,r*0.4);
        g.moveTo(x0,y0).quadraticCurveTo(cx2,cy2,x1,y1).stroke({ color: 0xcc9933, width: 3, alpha: 0.7 });
        g.moveTo(x0,y0).quadraticCurveTo(cx2,cy2,x1,y1).stroke({ color: 0xeebb44, width: 1.5, alpha: 0.5 });
        // Feather tips
        for (let fi = 0; fi < 4; fi++) {
          const fFrac = (fi + 1) / 5;
          const [fx,fy] = eR(-r*0.6 - (wSpan-r*0.6)*fFrac, -r*(0.4+wingAnim)*fFrac + r*0.2*fFrac);
          g.circle(fx, fy, 1).fill({ color: 0xffcc55, alpha: 0.4 });
        }
      }
      // Right wing
      { const [x0,y0] = eR(r*0.6,0), [cx2,cy2] = eR(wSpan,-r*(0.8+wingAnim*2)), [x1,y1] = eR(wSpan*0.7,r*0.4);
        g.moveTo(x0,y0).quadraticCurveTo(cx2,cy2,x1,y1).stroke({ color: 0xcc9933, width: 3, alpha: 0.7 });
        g.moveTo(x0,y0).quadraticCurveTo(cx2,cy2,x1,y1).stroke({ color: 0xeebb44, width: 1.5, alpha: 0.5 });
        for (let fi = 0; fi < 4; fi++) {
          const fFrac = (fi + 1) / 5;
          const [fx,fy] = eR(r*0.6 + (wSpan-r*0.6)*fFrac, -r*(0.4+wingAnim)*fFrac + r*0.2*fFrac);
          g.circle(fx, fy, 1).fill({ color: 0xffcc55, alpha: 0.4 });
        }
      }
      // Beak — sharper, with highlight
      { const [x0,y0] = eR(0,-r*1.2), [x1,y1] = eR(-r*0.2,-r*0.65), [x2,y2] = eR(r*0.2,-r*0.65);
        g.moveTo(x0,y0).lineTo(x1,y1).lineTo(x2,y2).closePath().fill({ color: 0xffcc44, alpha: 0.9 });
        const [hx,hy] = eR(0,-r*0.9);
        g.circle(hx,hy,1).fill({ color: 0xffffff, alpha: 0.35 }); }
      // Eagle eye
      { const [ex2,ey2] = eR(-r*0.15,-r*0.35);
        g.circle(ex2,ey2,2).fill({ color: 0xff8822, alpha: 0.9 });
        g.circle(ex2,ey2,1).fill({ color: 0x221100 }); }
      { const [ex2,ey2] = eR(r*0.15,-r*0.35);
        g.circle(ex2,ey2,2).fill({ color: 0xff8822, alpha: 0.9 });
        g.circle(ex2,ey2,1).fill({ color: 0x221100 }); }
      // Tail feathers — fanned
      for (let fi = -2; fi <= 2; fi++) {
        const [x0,y0] = eR(fi * r * 0.15, r * 0.7);
        const [x1,y1] = eR(fi * r * 0.1, r * 1.5);
        g.moveTo(x0,y0).lineTo(x1,y1).stroke({ color: 0xbbaa33, width: 1.8, alpha: 0.65 });
      }

    } else {
      // Bear — larger body
      const br = r * 1.3;
      // Helper: rotate local (lx,ly) by aimAngle around (px,py)
      const bC = Math.cos(aimAngle), bS = Math.sin(aimAngle);
      const bR = (lx: number, ly: number): [number, number] =>
        [px + bC * lx - bS * ly, py + bS * lx + bC * ly];
      // Bear body — layered thick fur
      g.circle(px, py, br + 2).fill({ color: 0x553322, alpha: 0.4 });
      g.circle(px, py, br).fill({ color: 0x885533 });
      g.circle(px, py, br * 0.8).fill({ color: 0x996644, alpha: 0.55 });
      g.circle(px, py, br * 0.5).fill({ color: 0xaa7755, alpha: 0.35 });
      // Round ears with inner
      { const [ex,ey] = bR(-br*0.6,-br*0.75);
        g.circle(ex,ey,br*0.3).fill({ color: 0x885533 });
        g.circle(ex,ey,br*0.18).fill({ color: 0xaa8866, alpha: 0.5 }); }
      { const [ex,ey] = bR(br*0.6,-br*0.75);
        g.circle(ex,ey,br*0.3).fill({ color: 0x885533 });
        g.circle(ex,ey,br*0.18).fill({ color: 0xaa8866, alpha: 0.5 }); }
      // Muzzle
      { const [mx2,my2] = bR(0,-br*0.5); g.ellipse(mx2,my2,br*0.45,br*0.32).fill({ color: 0xbb9966 }); }
      // Nose
      { const [nx2,ny2] = bR(0,-br*0.62); g.ellipse(nx2,ny2,br*0.14,br*0.09).fill({ color: 0x221100 }); }
      // Eyes
      { const [ex2,ey2] = bR(-br*0.28,-br*0.42);
        g.circle(ex2,ey2,2.5).fill({ color: 0x442200, alpha: 0.9 });
        g.circle(ex2,ey2,1.2).fill({ color: 0x000000 }); }
      { const [ex2,ey2] = bR(br*0.28,-br*0.42);
        g.circle(ex2,ey2,2.5).fill({ color: 0x442200, alpha: 0.9 });
        g.circle(ex2,ey2,1.2).fill({ color: 0x000000 }); }
      // Claws when swiping
      if (state.bearSwipeCooldown > 0 && state.bearSwipeCooldown < 0.3) {
        for (let ci = -2; ci <= 2; ci++) {
          const ca = aimAngle + ci * 0.2;
          const clawLen = br + 8;
          g.moveTo(px + Math.cos(ca) * br * 0.9, py + Math.sin(ca) * br * 0.9)
            .lineTo(px + Math.cos(ca) * clawLen, py + Math.sin(ca) * clawLen)
            .stroke({ color: 0xddccbb, width: 1.5, alpha: 0.7 });
        }
      }
      // Ground slam shockwave visual
      if (state.bearSlamCooldown < 0.5 && state.bearSlamCooldown > 0) {
        const prog = 1 - state.bearSlamCooldown / 0.5;
        g.circle(px, py, SS.BEAR_SLAM_RADIUS * prog)
          .stroke({ color: 0x885533, alpha: (1 - prog) * 0.5, width: 3 });
      }
    }

    // HP bar below player — segmented with border
    const hpW = r * 3.0;
    const hpX = px - hpW / 2;
    const hpY = py + r * 1.8 + (currentForm === "bear" ? 6 : 0);
    g.rect(hpX - 1, hpY - 1, hpW + 2, 6).fill({ color: 0x000000, alpha: 0.65 });
    const hpPct = state.playerHP / state.maxHP;
    const hpColor = hpPct > 0.5 ? 0x44cc44 : hpPct > 0.25 ? 0xffaa22 : 0xff2244;
    g.rect(hpX, hpY, hpW * hpPct, 4).fill({ color: hpColor, alpha: 0.85 });
    g.rect(hpX, hpY, hpW * hpPct, 1.5).fill({ color: 0xffffff, alpha: 0.12 });
    for (let hi = 1; hi < state.maxHP; hi++) {
      const segX = hpX + (hpW * hi / state.maxHP);
      g.moveTo(segX, hpY).lineTo(segX, hpY + 4).stroke({ color: 0x000000, width: 1, alpha: 0.5 });
    }
    g.rect(hpX - 1, hpY - 1, hpW + 2, 6).stroke({ color: 0x335522, width: 0.8, alpha: 0.6 });
    if (hpPct <= 0.25 && hpPct > 0) {
      g.rect(hpX, hpY, hpW * hpPct, 4).fill({ color: 0xff0000, alpha: 0.08 + Math.sin(t * 6) * 0.05 });
    }

    // Whirlwind visual (eagle ultimate)
    if (state.whirlwindTimer > 0) {
      const whR = SS.EAGLE_WHIRLWIND_RADIUS;
      const whAlpha = Math.min(1, state.whirlwindTimer / 1.0) * 0.35;
      // Spinning wind lines
      for (let wi = 0; wi < 8; wi++) {
        const wa1 = t * 6 + wi * Math.PI / 4;
        const wa2 = wa1 + Math.PI / 6;
        g.moveTo(px + Math.cos(wa1) * whR * 0.3, py + Math.sin(wa1) * whR * 0.3)
          .lineTo(px + Math.cos(wa2) * whR, py + Math.sin(wa2) * whR)
          .stroke({ color: SS.COLOR_EAGLE_BRIGHT, width: 2, alpha: whAlpha });
      }
      // Outer ring
      g.circle(px, py, whR).stroke({ color: SS.COLOR_EAGLE_BRIGHT, width: 2, alpha: whAlpha * 0.5 });
      g.circle(px, py, whR * 0.6).stroke({ color: SS.COLOR_EAGLE, width: 1, alpha: whAlpha * 0.3 });
      // Feather particles
      for (let fi = 0; fi < 6; fi++) {
        const fa = t * 4 + fi * Math.PI / 3;
        const fd = whR * (0.4 + (t * 0.5 + fi * 0.2) % 0.6);
        g.circle(px + Math.cos(fa) * fd, py + Math.sin(fa) * fd, 1.5)
          .fill({ color: SS.COLOR_EAGLE_BRIGHT, alpha: whAlpha * 0.7 });
      }
    }

    // Bear roar visual
    if (state.bearRoarCooldown > SS.BEAR_ROAR_COOLDOWN - 0.5 && state.currentForm === "bear") {
      const roarProg = 1 - (state.bearRoarCooldown - (SS.BEAR_ROAR_COOLDOWN - 0.5)) / 0.5;
      const roarR = SS.BEAR_ROAR_RADIUS * roarProg;
      g.circle(px, py, roarR).stroke({ color: SS.COLOR_BEAR_BRIGHT, width: 3, alpha: (1 - roarProg) * 0.5 });
      g.circle(px, py, roarR * 0.6).stroke({ color: 0xffffff, width: 1.5, alpha: (1 - roarProg) * 0.2 });
    }

    // Wolf sprint visual — speed lines
    if (state.wolfSprinting && state.currentForm === "wolf") {
      for (let si = 0; si < 4; si++) {
        const sAngle = state.moveAngle + Math.PI + (si - 1.5) * 0.3;
        const sLen = 15 + Math.random() * 10;
        const sStart = r + 3 + si * 2;
        g.moveTo(px + Math.cos(sAngle) * sStart, py + Math.sin(sAngle) * sStart)
          .lineTo(px + Math.cos(sAngle) * (sStart + sLen), py + Math.sin(sAngle) * (sStart + sLen))
          .stroke({ color: SS.COLOR_WOLF_BRIGHT, width: 1.5, alpha: 0.25 });
      }
    }

    // Ability cooldown arcs around player
    // Shift ability cooldown (inner ring)
    const shiftCd = currentForm === "wolf" ? state.wolfSprintCooldownTimer / SS.WOLF_SPRINT_COOLDOWN :
                    currentForm === "eagle" ? state.eagleDiveCooldown / SS.EAGLE_DIVE_COOLDOWN :
                    state.bearRoarCooldown / SS.BEAR_ROAR_COOLDOWN;
    const shiftReady = shiftCd <= 0;
    const shiftR = r + (currentForm === "bear" ? 22 : 18);
    if (!shiftReady) {
      const ratio = 1 - Math.max(0, Math.min(1, shiftCd));
      const arcSegs = 16;
      for (let ai = 0; ai < Math.floor(arcSegs * ratio); ai++) {
        const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
        g.moveTo(px + Math.cos(a1) * shiftR, py + Math.sin(a1) * shiftR)
          .lineTo(px + Math.cos(a2) * shiftR, py + Math.sin(a2) * shiftR)
          .stroke({ color: formColor, width: 2, alpha: 0.4 });
      }
    } else {
      g.circle(px, py, shiftR).stroke({ color: formColor, width: 1, alpha: 0.12 + Math.sin(t * 2) * 0.04 });
    }

    // Q ultimate cooldown (outer ring)
    const ultCd = currentForm === "wolf" ? state.wolfUltCooldownTimer / SS.ALLY_SUMMON_COOLDOWN :
                  currentForm === "eagle" ? state.eagleUltCooldownTimer / (SS.ALLY_SUMMON_COOLDOWN + 3) :
                  state.bearSlamCooldown / SS.BEAR_SLAM_COOLDOWN;
    const ultReady = ultCd <= 0;
    const ultR = shiftR + 6;
    if (!ultReady) {
      const ratio = 1 - Math.max(0, Math.min(1, ultCd));
      const arcSegs = 20;
      for (let ai = 0; ai < Math.floor(arcSegs * ratio); ai++) {
        const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
        g.moveTo(px + Math.cos(a1) * ultR, py + Math.sin(a1) * ultR)
          .lineTo(px + Math.cos(a2) * ultR, py + Math.sin(a2) * ultR)
          .stroke({ color: SS.COLOR_GOLD, width: 2, alpha: 0.3 });
      }
    } else {
      // Pulsing ready indicator
      g.circle(px, py, ultR).stroke({ color: SS.COLOR_GOLD, width: 1.5, alpha: 0.25 + Math.sin(t * 4) * 0.15 });
      g.circle(px, py, ultR + 3).fill({ color: SS.COLOR_GOLD, alpha: 0.03 + Math.sin(t * 4) * 0.02 });
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies
  // ---------------------------------------------------------------------------
  private _drawEnemies(g: Graphics, state: SSState): void {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (e.spawnTimer > 0) {
        const prog = e.spawnTimer / 0.6;
        const portalR = e.radius * 2.5;
        g.circle(e.x, e.y, portalR + 4).fill({ color: 0x114411, alpha: prog * 0.08 });
        g.circle(e.x, e.y, portalR).fill({ color: 0x22aa22, alpha: prog * 0.2 });
        // Swirling segments
        const segs = 12;
        for (let si = 0; si < segs; si++) {
          const a1 = state.time * 5 + si * Math.PI * 2 / segs;
          const a2 = state.time * 5 + (si + 1) * Math.PI * 2 / segs;
          g.moveTo(e.x + Math.cos(a1) * portalR, e.y + Math.sin(a1) * portalR)
            .lineTo(e.x + Math.cos(a2) * portalR, e.y + Math.sin(a2) * portalR)
            .stroke({ color: 0x44cc44, width: 2, alpha: prog * (0.3 + Math.sin(state.time * 8 + si) * 0.15) });
        }
        // Inner ring
        for (let si = 0; si < 8; si++) {
          const a1 = -state.time * 7 + si * Math.PI / 4;
          const a2 = -state.time * 7 + (si + 1) * Math.PI / 4;
          const innerR = portalR * 0.5;
          g.moveTo(e.x + Math.cos(a1) * innerR, e.y + Math.sin(a1) * innerR)
            .lineTo(e.x + Math.cos(a2) * innerR, e.y + Math.sin(a2) * innerR)
            .stroke({ color: 0x88ff88, width: 1.5, alpha: prog * 0.35 });
        }
        g.circle(e.x, e.y, portalR * 0.2).fill({ color: 0xaaffaa, alpha: prog * 0.3 });
        continue;
      }
      // Stun ring
      if (e.stunTimer > 0) {
        g.circle(e.x, e.y, e.radius + 5).stroke({ color: 0xffee44, alpha: 0.7, width: 2 });
      }
      // Elite gold border
      if (e.elite) {
        g.circle(e.x, e.y, e.radius + 4).stroke({ color: 0xffd700, alpha: 0.85, width: 2 });
      }
      // Hit flash
      const flashAlpha = e.flashTimer > 0 ? 0.85 : 1;

      if (e.kind === "goblin") {
        // Shadow
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.9, e.radius * 0.35).fill({ color: 0x000000, alpha: 0.15 });
        // Goblin body — small green
        g.circle(e.x, e.y, e.radius + 1).fill({ color: 0x2a5522, alpha: flashAlpha * 0.4 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x448833, alpha: flashAlpha });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0x55aa44, alpha: flashAlpha * 0.5 });
        // Pointed ears
        g.moveTo(e.x - e.radius * 0.8, e.y - e.radius * 0.5)
          .lineTo(e.x - e.radius * 1.4, e.y - e.radius * 1.3)
          .lineTo(e.x - e.radius * 0.3, e.y - e.radius * 0.7)
          .closePath().fill({ color: 0x55aa44, alpha: flashAlpha });
        g.moveTo(e.x + e.radius * 0.3, e.y - e.radius * 0.7)
          .lineTo(e.x + e.radius * 1.4, e.y - e.radius * 1.3)
          .lineTo(e.x + e.radius * 0.8, e.y - e.radius * 0.5)
          .closePath().fill({ color: 0x55aa44, alpha: flashAlpha });
        // Glowing red eyes
        g.circle(e.x - e.radius * 0.3, e.y - e.radius * 0.1, 2).fill({ color: 0xff4422, alpha: flashAlpha });
        g.circle(e.x + e.radius * 0.3, e.y - e.radius * 0.1, 2).fill({ color: 0xff4422, alpha: flashAlpha });
        g.circle(e.x - e.radius * 0.3, e.y - e.radius * 0.1, 3.5).fill({ color: 0xff2200, alpha: flashAlpha * 0.12 });
        g.circle(e.x + e.radius * 0.3, e.y - e.radius * 0.1, 3.5).fill({ color: 0xff2200, alpha: flashAlpha * 0.12 });
        // Crude dagger
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x + Math.cos(toP) * e.radius * 0.6, e.y + Math.sin(toP) * e.radius * 0.6)
          .lineTo(e.x + Math.cos(toP) * (e.radius + 7), e.y + Math.sin(toP) * (e.radius + 7))
          .stroke({ color: 0x888888, width: 1.5, alpha: flashAlpha * 0.7 });

      } else if (e.kind === "orc_archer") {
        // Shadow
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.9, e.radius * 0.35).fill({ color: 0x000000, alpha: 0.15 });
        // Orc body — green-gray
        g.circle(e.x, e.y, e.radius + 1).fill({ color: 0x3a4a2a, alpha: flashAlpha * 0.4 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x556633, alpha: flashAlpha });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0x667744, alpha: flashAlpha * 0.5 });
        // Small tusks
        g.moveTo(e.x - e.radius * 0.2, e.y + e.radius * 0.25)
          .lineTo(e.x - e.radius * 0.25, e.y - e.radius * 0.1)
          .stroke({ color: 0xccccaa, width: 1.5, alpha: flashAlpha * 0.6 });
        g.moveTo(e.x + e.radius * 0.2, e.y + e.radius * 0.25)
          .lineTo(e.x + e.radius * 0.25, e.y - e.radius * 0.1)
          .stroke({ color: 0xccccaa, width: 1.5, alpha: flashAlpha * 0.6 });
        // Eyes
        g.circle(e.x - e.radius * 0.25, e.y - e.radius * 0.15, 1.5).fill({ color: 0xffaa00, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.25, e.y - e.radius * 0.15, 1.5).fill({ color: 0xffaa00, alpha: flashAlpha * 0.9 });
        // Bow — curved with string
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        const bowR = e.radius + 8;
        const bowLeft = toP - 0.7, bowRight = toP + 0.7;
        const blx = e.x + Math.cos(bowLeft) * bowR, bly = e.y + Math.sin(bowLeft) * bowR;
        const brx = e.x + Math.cos(bowRight) * bowR, bry = e.y + Math.sin(bowRight) * bowR;
        const bmx = e.x + Math.cos(toP) * (bowR + 3), bmy = e.y + Math.sin(toP) * (bowR + 3);
        g.moveTo(blx, bly).lineTo(bmx, bmy).stroke({ color: 0x885522, width: 2, alpha: flashAlpha * 0.8 });
        g.moveTo(brx, bry).lineTo(bmx, bmy).stroke({ color: 0x885522, width: 2, alpha: flashAlpha * 0.8 });
        g.moveTo(blx, bly).lineTo(brx, bry).stroke({ color: 0xddcc99, width: 0.8, alpha: flashAlpha * 0.6 });
        // Quiver on back
        const backA = toP + Math.PI;
        const qx = e.x + Math.cos(backA) * e.radius * 0.7, qy = e.y + Math.sin(backA) * e.radius * 0.7;
        g.rect(qx - 1.5, qy - 3, 3, 6).fill({ color: 0x554422, alpha: flashAlpha * 0.5 });

      } else if (e.kind === "troll") {
        // Shadow
        g.ellipse(e.x + 2, e.y + 4, e.radius * 1.1, e.radius * 0.4).fill({ color: 0x000000, alpha: 0.2 });
        // Large troll body — layered
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x3a4433, alpha: flashAlpha * 0.4 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x556644, alpha: flashAlpha });
        g.circle(e.x, e.y, e.radius * 0.75).fill({ color: 0x667755, alpha: flashAlpha * 0.6 });
        // Heavy brow ridge
        g.moveTo(e.x - e.radius * 0.7, e.y - e.radius * 0.45)
          .lineTo(e.x, e.y - e.radius * 0.6)
          .lineTo(e.x + e.radius * 0.7, e.y - e.radius * 0.45)
          .stroke({ color: 0x445533, width: 3, alpha: flashAlpha * 0.7 });
        // Small angry eyes under brow
        g.circle(e.x - e.radius * 0.25, e.y - e.radius * 0.3, 2).fill({ color: 0xffaa00, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.25, e.y - e.radius * 0.3, 2).fill({ color: 0xffaa00, alpha: flashAlpha * 0.9 });
        // Tusks
        g.moveTo(e.x - e.radius * 0.3, e.y + e.radius * 0.15)
          .lineTo(e.x - e.radius * 0.35, e.y - e.radius * 0.25)
          .stroke({ color: 0xddddaa, width: 2, alpha: flashAlpha * 0.7 });
        g.moveTo(e.x + e.radius * 0.3, e.y + e.radius * 0.15)
          .lineTo(e.x + e.radius * 0.35, e.y - e.radius * 0.25)
          .stroke({ color: 0xddddaa, width: 2, alpha: flashAlpha * 0.7 });
        // Massive club
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        const clubAngle = toP + Math.sin(state.time * 2) * 0.15;
        g.moveTo(e.x + Math.cos(clubAngle) * e.radius * 0.5, e.y + Math.sin(clubAngle) * e.radius * 0.5)
          .lineTo(e.x + Math.cos(clubAngle) * (e.radius * 2), e.y + Math.sin(clubAngle) * (e.radius * 2))
          .stroke({ color: 0x664422, width: 4, alpha: flashAlpha * 0.7 });
        // Club head
        g.circle(e.x + Math.cos(clubAngle) * (e.radius * 2), e.y + Math.sin(clubAngle) * (e.radius * 2), e.radius * 0.4)
          .fill({ color: 0x554433, alpha: flashAlpha * 0.75 });

      } else if (e.kind === "shadow_wolf") {
        // Spectral afterimages
        for (let tr = 1; tr <= 3; tr++) {
          const trA = state.time * 1.5 + tr * 0.7;
          const trOff = tr * 5;
          g.circle(e.x - Math.cos(trA) * trOff, e.y - Math.sin(trA) * trOff, e.radius * (1 - tr * 0.2))
            .fill({ color: 0x3311aa, alpha: 0.08 * (1 - tr * 0.25) });
        }
        // Shadow
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.8, e.radius * 0.3).fill({ color: 0x000000, alpha: 0.12 });
        // Dark spectral body — flickers
        const flicker = 0.5 + Math.sin(state.time * 7 + e.x * 0.1) * 0.3;
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x2a1155, alpha: flashAlpha * flicker * 0.3 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x442266, alpha: flashAlpha * flicker });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0x553388, alpha: flashAlpha * flicker * 0.6 });
        // Pointed wolf ears
        g.moveTo(e.x - e.radius * 0.4, e.y - e.radius)
          .lineTo(e.x - e.radius * 0.15, e.y - e.radius * 1.5)
          .lineTo(e.x + e.radius * 0.1, e.y - e.radius)
          .closePath().fill({ color: 0x553388, alpha: flashAlpha * flicker * 0.8 });
        g.moveTo(e.x + e.radius * 0.1, e.y - e.radius)
          .lineTo(e.x + e.radius * 0.35, e.y - e.radius * 1.5)
          .lineTo(e.x + e.radius * 0.6, e.y - e.radius)
          .closePath().fill({ color: 0x553388, alpha: flashAlpha * flicker * 0.8 });
        // Glowing purple eyes
        g.circle(e.x - e.radius * 0.2, e.y - e.radius * 0.15, 2).fill({ color: 0xcc44ff, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.2, e.y - e.radius * 0.15, 2).fill({ color: 0xcc44ff, alpha: flashAlpha * 0.9 });
        g.circle(e.x - e.radius * 0.2, e.y - e.radius * 0.15, 4).fill({ color: 0xaa22ff, alpha: flashAlpha * 0.1 });
        g.circle(e.x + e.radius * 0.2, e.y - e.radius * 0.15, 4).fill({ color: 0xaa22ff, alpha: flashAlpha * 0.1 });
        // Phase shimmer ring
        g.circle(e.x, e.y, e.radius + 3).stroke({ color: 0x7744cc, width: 1, alpha: flicker * 0.3 + Math.sin(state.time * 5) * 0.1 });

      } else if (e.kind === "dark_druid") {
        // Shadow
        g.ellipse(e.x + 1, e.y + 3, e.radius * 0.8, e.radius * 0.3).fill({ color: 0x000000, alpha: 0.15 });
        // Nature energy aura
        g.circle(e.x, e.y, e.radius + 8).fill({ color: 0x22aa22, alpha: 0.04 + Math.sin(state.time * 2) * 0.02 });
        // Green robe body
        g.ellipse(e.x, e.y + e.radius * 0.3, e.radius * 0.85, e.radius * 1.2)
          .fill({ color: 0x1a3a1a, alpha: flashAlpha });
        g.ellipse(e.x, e.y + e.radius * 0.3, e.radius * 0.6, e.radius * 0.9)
          .fill({ color: 0x224422, alpha: flashAlpha * 0.6 });
        // Hood
        g.moveTo(e.x - e.radius * 0.5, e.y - e.radius * 0.3)
          .lineTo(e.x, e.y - e.radius * 1.3)
          .lineTo(e.x + e.radius * 0.5, e.y - e.radius * 0.3)
          .closePath().fill({ color: 0x1a331a, alpha: flashAlpha * 0.9 });
        // Face shadow
        g.circle(e.x, e.y - e.radius * 0.4, e.radius * 0.35).fill({ color: 0x000000, alpha: flashAlpha * 0.35 });
        // Glowing green eyes
        g.circle(e.x - e.radius * 0.15, e.y - e.radius * 0.4, 1.5).fill({ color: 0x44ff44, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.15, e.y - e.radius * 0.4, 1.5).fill({ color: 0x44ff44, alpha: flashAlpha * 0.9 });
        g.circle(e.x - e.radius * 0.15, e.y - e.radius * 0.4, 3).fill({ color: 0x22ff22, alpha: flashAlpha * 0.12 });
        g.circle(e.x + e.radius * 0.15, e.y - e.radius * 0.4, 3).fill({ color: 0x22ff22, alpha: flashAlpha * 0.12 });
        // Gnarled staff
        g.moveTo(e.x - e.radius * 1.2, e.y + e.radius)
          .lineTo(e.x - e.radius * 1.1, e.y - e.radius * 0.3)
          .lineTo(e.x - e.radius * 1.3, e.y - e.radius * 1.4)
          .stroke({ color: 0x554422, width: 2.5, alpha: flashAlpha * 0.8 });
        // Staff crystal orb
        g.circle(e.x - e.radius * 1.3, e.y - e.radius * 1.4, e.radius * 0.35)
          .fill({ color: 0x44cc44, alpha: flashAlpha * 0.75 });
        g.circle(e.x - e.radius * 1.3, e.y - e.radius * 1.4, e.radius * 0.5)
          .fill({ color: 0x22aa22, alpha: flashAlpha * 0.12 });
        g.circle(e.x - e.radius * 1.3, e.y - e.radius * 1.4, e.radius * 0.2)
          .fill({ color: 0xaaffaa, alpha: flashAlpha * 0.45 });
      }

      // Attack telegraph
      if (e.state === "attack" && e.stateTimer > 0) {
        const atkProg = 1 - e.stateTimer / 0.5;
        const atkAlpha = 0.35 + atkProg * 0.3;
        g.circle(e.x, e.y, e.radius + 5 + atkProg * 4).stroke({
          color: 0xff2244, width: 2, alpha: atkAlpha,
        });
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toP) * (12 + atkProg * 8), e.y + Math.sin(toP) * (12 + atkProg * 8))
          .stroke({ color: 0xff4444, width: 1.5, alpha: atkAlpha * 0.5 });
      }

      // Orc archer fire telegraph
      if (e.kind === "orc_archer" && e.fireTimer < 0.5 && e.fireTimer > 0) {
        const fireProg = 1 - e.fireTimer / 0.5;
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toP) * (15 + fireProg * 12), e.y + Math.sin(toP) * (15 + fireProg * 12))
          .stroke({ color: 0xff8822, width: 1, alpha: 0.2 + fireProg * 0.3 });
        g.circle(e.x + Math.cos(toP) * (e.radius + 3), e.y + Math.sin(toP) * (e.radius + 3), 2 + fireProg * 2)
          .fill({ color: 0xff8822, alpha: 0.3 + fireProg * 0.4 });
      }

      // Dark druid summon telegraph
      if (e.kind === "dark_druid" && e.summonTimer < 1.0 && e.summonTimer > 0) {
        const sumProg = 1 - e.summonTimer / 1.0;
        g.circle(e.x, e.y, e.radius + 10 + sumProg * 5).stroke({
          color: 0x44cc44, width: 1.5, alpha: sumProg * 0.4,
        });
        // Rune symbols appearing
        for (let ri = 0; ri < 4; ri++) {
          const ra = state.time * 2 + ri * Math.PI / 2;
          const rd = e.radius + 8 + sumProg * 4;
          g.circle(e.x + Math.cos(ra) * rd, e.y + Math.sin(ra) * rd, 1.5)
            .fill({ color: 0x88ff88, alpha: sumProg * 0.5 });
        }
      }

      // HP bar — polished
      const hbW = e.radius * 2.8, hbH = 3.5;
      const hbX = e.x - hbW / 2, hbY = e.y - e.radius - 10;
      g.rect(hbX - 1, hbY - 1, hbW + 2, hbH + 2).fill({ color: 0x000000, alpha: 0.7 });
      const ehpRatio = Math.max(0, e.hp / e.maxHp);
      const ehpColor = ehpRatio > 0.6 ? 0x44cc44 : ehpRatio > 0.3 ? 0xccaa22 : 0xcc2222;
      g.rect(hbX, hbY, hbW * ehpRatio, hbH).fill({ color: ehpColor, alpha: 0.85 });
      g.rect(hbX, hbY, hbW * ehpRatio, hbH * 0.4).fill({ color: 0xffffff, alpha: 0.1 });
      g.rect(hbX - 1, hbY - 1, hbW + 2, hbH + 2).stroke({ color: 0x223322, width: 0.5, alpha: 0.5 });
      if (e.elite) {
        g.moveTo(e.x - 4, hbY - 4).lineTo(e.x, hbY - 8).lineTo(e.x + 4, hbY - 4)
          .closePath().fill({ color: 0xffd700, alpha: 0.6 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Allies
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Boss
  // ---------------------------------------------------------------------------
  private _drawBoss(g: Graphics, state: SSState): void {
    if (!state.boss || !state.boss.alive) return;
    const boss = state.boss;
    const t = state.time;
    const bx = boss.x, by = boss.y, br = boss.radius;
    const flash = boss.flashTimer > 0 && Math.sin(t * 30) > 0;

    // Shadow
    g.ellipse(bx + 3, by + 6, br * 1.3, br * 0.5).fill({ color: 0x000000, alpha: 0.3 });
    // Outer aura
    g.circle(bx, by, br * 2.5).fill({ color: 0x440000, alpha: 0.06 + Math.sin(t * 0.8) * 0.02 });
    g.circle(bx, by, br * 1.8).fill({ color: 0x660000, alpha: 0.1 + Math.sin(t * 1.2) * 0.03 });

    const bossColors: Record<string, number> = { alpha_beast: 0x664422, ancient_treant: 0x336622, chimera: 0x553344 };
    const bossGlows: Record<string, number> = { alpha_beast: 0xff6622, ancient_treant: 0x44cc44, chimera: 0xcc44ff };
    const baseColor = flash ? 0xffffff : (bossColors[boss.kind] ?? 0x444444);
    const glowColor = bossGlows[boss.kind] ?? 0xff4444;

    // Body layers
    g.circle(bx, by, br + 3).fill({ color: 0x111111, alpha: 0.6 });
    g.circle(bx, by, br).fill({ color: baseColor, alpha: 0.9 });
    g.circle(bx, by, br * 0.75).fill({ color: flash ? 0xffffff : 0x555555, alpha: 0.5 });
    // Glowing core
    g.circle(bx, by, br * 0.35).fill({ color: glowColor, alpha: 0.5 + Math.sin(t * 4) * 0.2 });
    g.circle(bx, by, br * 0.2).fill({ color: 0xffffff, alpha: 0.3 });

    // Kind-specific details
    if (boss.kind === "alpha_beast") {
      // Horns
      const faceA = Math.atan2(state.playerY - by, state.playerX - bx);
      for (let horn = -1; horn <= 1; horn += 2) {
        const ha = faceA + horn * 0.5 - Math.PI;
        g.moveTo(bx + Math.cos(ha) * br * 0.6, by + Math.sin(ha) * br * 0.6)
          .lineTo(bx + Math.cos(ha) * (br + 14), by + Math.sin(ha) * (br + 14))
          .stroke({ color: 0xccaa66, width: 3, alpha: 0.8 });
      }
      // Red eyes
      g.circle(bx + Math.cos(faceA) * br * 0.3 - 3, by + Math.sin(faceA) * br * 0.3, 2.5)
        .fill({ color: 0xff2200, alpha: 0.9 });
      g.circle(bx + Math.cos(faceA) * br * 0.3 + 3, by + Math.sin(faceA) * br * 0.3, 2.5)
        .fill({ color: 0xff2200, alpha: 0.9 });
    } else if (boss.kind === "ancient_treant") {
      // Branch limbs
      for (let bi = 0; bi < 6; bi++) {
        const ba = t * 0.2 + bi * Math.PI / 3;
        const bLen = br + 8 + Math.sin(t * 1.5 + bi) * 3;
        g.moveTo(bx + Math.cos(ba) * br * 0.5, by + Math.sin(ba) * br * 0.5)
          .lineTo(bx + Math.cos(ba) * bLen, by + Math.sin(ba) * bLen)
          .stroke({ color: 0x554422, width: 2.5, alpha: 0.7 });
        // Leaf tip
        g.circle(bx + Math.cos(ba) * bLen, by + Math.sin(ba) * bLen, 3)
          .fill({ color: 0x44cc44, alpha: 0.5 });
      }
      // Face
      g.circle(bx - 4, by - 3, 2).fill({ color: 0x88ff44, alpha: 0.8 });
      g.circle(bx + 4, by - 3, 2).fill({ color: 0x88ff44, alpha: 0.8 });
    } else if (boss.kind === "chimera") {
      // Three-headed silhouette: small circles around main body
      for (let hi = 0; hi < 3; hi++) {
        const ha = t * 0.5 + hi * Math.PI * 2 / 3;
        const hx2 = bx + Math.cos(ha) * (br + 8);
        const hy2 = by + Math.sin(ha) * (br + 8);
        const headColors = [0xff4422, 0xffaa22, 0x8844cc];
        g.circle(hx2, hy2, 5).fill({ color: headColors[hi], alpha: 0.7 });
        g.circle(hx2, hy2, 3).fill({ color: 0xffffff, alpha: 0.25 });
        // Stalk connecting to body
        g.moveTo(bx, by).lineTo(hx2, hy2).stroke({ color: 0x553344, width: 2, alpha: 0.5 });
      }
    }

    // Phase indicator dots
    for (let pi = 0; pi < 3; pi++) {
      const pa = t * 1.5 + pi * Math.PI * 2 / 3;
      const pd = br + 20;
      const dotX = bx + Math.cos(pa) * pd, dotY = by + Math.sin(pa) * pd;
      const active = pi === boss.phase;
      g.circle(dotX, dotY, active ? 4 : 2.5).fill({ color: active ? glowColor : 0x333333, alpha: active ? 0.8 : 0.3 });
      if (active) g.circle(dotX, dotY, 7).fill({ color: glowColor, alpha: 0.1 });
    }

    // HP bar at top of arena
    const hpBarW = Math.min(250, state.arenaW * 0.5);
    const hpBarH = 10;
    const hpBarX = state.arenaW / 2 - hpBarW / 2;
    const hpBarY = 30;
    g.rect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2).fill({ color: 0x000000, alpha: 0.7 });
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    g.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH).fill({ color: glowColor, alpha: 0.85 });
    g.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH * 0.35).fill({ color: 0xffffff, alpha: 0.12 });
    g.rect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2).stroke({ color: glowColor, width: 1, alpha: 0.4 });

    // Boss announce
    if (state.bossAnnounceTimer > 0) {
      const aa = Math.min(1, state.bossAnnounceTimer / 0.5) * 0.7;
      const bandH = 40;
      const bandY2 = state.arenaH / 2 - bandH / 2;
      g.rect(0, bandY2, state.arenaW, bandH).fill({ color: 0x000000, alpha: aa * 0.6 });
      g.rect(0, bandY2, state.arenaW, 2).fill({ color: glowColor, alpha: aa * 0.5 });
      g.rect(0, bandY2 + bandH - 2, state.arenaW, 2).fill({ color: glowColor, alpha: aa * 0.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Allies
  // ---------------------------------------------------------------------------
  private _drawAllies(g: Graphics, state: SSState): void {
    const t = state.time;
    for (const a of state.allies) {
      const fc = FORM_COLORS[a.kind];
      const lifeAlpha = Math.min(1, a.life / 2);
      // Summoned glow
      g.circle(a.x, a.y, a.radius + 5).fill({ color: fc, alpha: lifeAlpha * 0.06 + Math.sin(t * 3) * 0.02 });
      g.circle(a.x, a.y, a.radius + 2).fill({ color: fc, alpha: lifeAlpha * 0.1 });
      // Shadow
      g.ellipse(a.x + 1, a.y + 2, a.radius * 0.9, a.radius * 0.35).fill({ color: 0x000000, alpha: lifeAlpha * 0.15 });
      // Body
      g.circle(a.x, a.y, a.radius).fill({ color: fc, alpha: lifeAlpha * 0.85 });
      g.circle(a.x, a.y, a.radius * 0.65).fill({ color: 0xffffff, alpha: lifeAlpha * 0.08 });
      // Form-specific detail
      if (a.kind === "wolf") {
        // Mini ears + eyes
        g.moveTo(a.x - 2, a.y - a.radius * 0.8).lineTo(a.x - 1, a.y - a.radius * 1.4).lineTo(a.x + 1, a.y - a.radius * 0.8)
          .fill({ color: 0x99bbdd, alpha: lifeAlpha * 0.7 });
        g.moveTo(a.x + 1, a.y - a.radius * 0.8).lineTo(a.x + 2, a.y - a.radius * 1.4).lineTo(a.x + 3, a.y - a.radius * 0.8)
          .fill({ color: 0x99bbdd, alpha: lifeAlpha * 0.7 });
        g.circle(a.x - 1.5, a.y - 1, 1).fill({ color: 0x44aaff, alpha: lifeAlpha });
        g.circle(a.x + 1.5, a.y - 1, 1).fill({ color: 0x44aaff, alpha: lifeAlpha });
      } else if (a.kind === "eagle") {
        // Mini wings
        g.moveTo(a.x - a.radius * 1.5, a.y).lineTo(a.x, a.y - a.radius * 0.6).lineTo(a.x + a.radius * 1.5, a.y)
          .stroke({ color: 0xeebb44, width: 1.5, alpha: lifeAlpha * 0.7 });
        g.circle(a.x, a.y - 1, 1).fill({ color: 0xff8822, alpha: lifeAlpha });
      } else {
        // Mini bear ears
        g.circle(a.x - a.radius * 0.5, a.y - a.radius * 0.7, a.radius * 0.3).fill({ color: 0xaa7744, alpha: lifeAlpha * 0.7 });
        g.circle(a.x + a.radius * 0.5, a.y - a.radius * 0.7, a.radius * 0.3).fill({ color: 0xaa7744, alpha: lifeAlpha * 0.7 });
        g.circle(a.x, a.y - 1, 1.5).fill({ color: 0x442200, alpha: lifeAlpha });
      }
      // HP bar
      const hbW = a.radius * 2.8;
      g.rect(a.x - hbW / 2 - 0.5, a.y + a.radius + 2, hbW + 1, 3).fill({ color: 0x000000, alpha: lifeAlpha * 0.6 });
      g.rect(a.x - hbW / 2, a.y + a.radius + 2.5, hbW * Math.max(0, a.hp / a.maxHp), 2).fill({ color: fc, alpha: lifeAlpha * 0.8 });
    }
  }

  // ---------------------------------------------------------------------------
  // Slashes
  // ---------------------------------------------------------------------------
  private _drawSlashes(g: Graphics, state: SSState): void {
    for (const s of state.slashes) {
      const alpha = s.life / s.maxLife;
      const fc = FORM_COLORS[s.form];
      const spread = s.form === "bear" ? Math.PI * 0.5 : Math.PI * 0.35;
      // Outer glow arc
      g.arc(s.x, s.y, s.radius + 4, s.angle - spread, s.angle + spread)
        .stroke({ color: fc, alpha: alpha * 0.15, width: 8 });
      // Main arc
      g.arc(s.x, s.y, s.radius, s.angle - spread, s.angle + spread)
        .stroke({ color: fc, alpha: alpha * 0.8, width: 3.5 });
      // Inner bright arc
      g.arc(s.x, s.y, s.radius * 0.7, s.angle - spread * 0.85, s.angle + spread * 0.85)
        .stroke({ color: 0xffffff, alpha: alpha * 0.4, width: 1.5 });
      // Tip sparkle
      const tipA = s.angle + spread * (Math.sin(state.time * 15) > 0 ? 1 : -1);
      g.circle(s.x + Math.cos(tipA) * s.radius, s.y + Math.sin(tipA) * s.radius, 2)
        .fill({ color: 0xffffff, alpha: alpha * 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------
  private _drawProjectiles(g: Graphics, state: SSState): void {
    const t = state.time;
    for (const p of state.projectiles) {
      const alpha = Math.min(1, p.life * 2);
      const angle = Math.atan2(p.vy, p.vx);
      if (p.kind === "feather") {
        // Golden feather bolt with spiral trail
        for (let tr = 0; tr < 6; tr++) {
          const trDist = tr * 3;
          const trA = t * 8 + tr * 0.7;
          const perpX = -Math.sin(angle), perpY = Math.cos(angle);
          const tx = p.x - Math.cos(angle) * trDist + perpX * Math.cos(trA) * 1.5;
          const ty = p.y - Math.sin(angle) * trDist + perpY * Math.cos(trA) * 1.5;
          g.circle(tx, ty, 1).fill({ color: 0xddaa44, alpha: (1 - tr / 6) * 0.25 });
        }
        g.circle(p.x, p.y, p.radius + 3).fill({ color: 0xddaa44, alpha: alpha * 0.08 });
        g.circle(p.x, p.y, p.radius).fill({ color: 0xeebb44, alpha });
        g.circle(p.x, p.y, p.radius * 0.5).fill({ color: 0xffffff, alpha: alpha * 0.4 });
        // Feather shape
        g.moveTo(p.x, p.y)
          .lineTo(p.x - Math.cos(angle) * 8, p.y - Math.sin(angle) * 8)
          .stroke({ color: 0xffcc55, alpha: alpha * 0.7, width: 2 });
      } else if (p.kind === "thorn") {
        // Green thorn with trail
        for (let tr = 1; tr <= 3; tr++) {
          g.circle(p.x - Math.cos(angle) * tr * 4, p.y - Math.sin(angle) * tr * 4, p.radius * (1 - tr * 0.25))
            .fill({ color: 0x44aa22, alpha: alpha * 0.15 * (1 - tr * 0.3) });
        }
        g.circle(p.x, p.y, p.radius + 2).fill({ color: 0x44aa22, alpha: alpha * 0.1 });
        g.circle(p.x, p.y, p.radius).fill({ color: p.color, alpha });
        g.circle(p.x, p.y, p.radius * 0.5).fill({ color: 0xaaffaa, alpha: alpha * 0.5 });
      } else {
        // Arrow with fletching
        for (let tr = 1; tr <= 4; tr++) {
          g.circle(p.x - Math.cos(angle) * tr * 3, p.y - Math.sin(angle) * tr * 3, 0.8)
            .fill({ color: 0xccaa55, alpha: alpha * 0.12 * (1 - tr * 0.2) });
        }
        // Shaft
        g.moveTo(p.x, p.y)
          .lineTo(p.x - Math.cos(angle) * 12, p.y - Math.sin(angle) * 12)
          .stroke({ color: 0x664422, alpha, width: 1.5 });
        // Head
        const perpX = -Math.sin(angle) * 2.5, perpY = Math.cos(angle) * 2.5;
        g.moveTo(p.x + Math.cos(angle) * 4, p.y + Math.sin(angle) * 4)
          .lineTo(p.x + perpX, p.y + perpY)
          .lineTo(p.x - perpX, p.y - perpY)
          .closePath().fill({ color: 0xaaaaaa, alpha: alpha * 0.9 });
        g.circle(p.x + Math.cos(angle) * 4, p.y + Math.sin(angle) * 4, 1)
          .fill({ color: 0xffffff, alpha: alpha * 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------
  private _drawPickups(g: Graphics, state: SSState): void {
    const t = state.time;
    for (const p of state.pickups) {
      const bob = Math.sin(t * 2.5 + p.x * 0.1) * 3;
      const pulse = 0.7 + Math.sin(t * 3 + p.x * 0.05) * 0.15;
      const py = p.y + bob;
      const lifeRatio = Math.min(1, p.life / 2);
      if (p.kind === "health") {
        g.circle(p.x, py, p.radius + 5).fill({ color: 0xff2244, alpha: 0.06 * lifeRatio });
        g.circle(p.x, py, p.radius + 2).fill({ color: 0xff3355, alpha: 0.1 * lifeRatio });
        g.circle(p.x, py, p.radius * pulse).fill({ color: 0xff4466, alpha: 0.85 * lifeRatio });
        const cs = p.radius * 0.5;
        g.moveTo(p.x - cs, py).lineTo(p.x + cs, py).stroke({ color: 0xffffff, width: 2.5, alpha: 0.9 * lifeRatio });
        g.moveTo(p.x, py - cs).lineTo(p.x, py + cs).stroke({ color: 0xffffff, width: 2.5, alpha: 0.9 * lifeRatio });
      } else if (p.kind === "form_charge") {
        g.circle(p.x, py, p.radius + 5).fill({ color: 0x44aa44, alpha: 0.06 * lifeRatio });
        g.circle(p.x, py, p.radius * pulse).fill({ color: 0x44aa44, alpha: 0.85 * lifeRatio });
        g.circle(p.x, py, p.radius * 0.55).fill({ color: 0xaaffaa, alpha: 0.5 * lifeRatio });
        // Leaf symbol
        const la = t * 1.5;
        g.moveTo(p.x + Math.cos(la) * p.radius * 0.6, py + Math.sin(la) * p.radius * 0.6)
          .lineTo(p.x, py)
          .stroke({ color: 0xffffff, width: 1, alpha: 0.6 * lifeRatio });
      } else {
        g.circle(p.x, py, p.radius + 5).fill({ color: 0xffd700, alpha: 0.06 * lifeRatio });
        g.circle(p.x, py, p.radius * pulse).fill({ color: 0xffaa00, alpha: 0.9 * lifeRatio });
        g.circle(p.x, py, p.radius * 0.6).fill({ color: 0xffcc44, alpha: 0.5 * lifeRatio });
        g.circle(p.x, py, p.radius * 0.25).fill({ color: 0xffffff, alpha: 0.4 * lifeRatio });
        for (let fi = 0; fi < 3; fi++) {
          const fa = t * 2 + fi * Math.PI * 2 / 3;
          g.circle(p.x + Math.cos(fa) * p.radius * 0.4, py + Math.sin(fa) * p.radius * 0.4, 0.8)
            .fill({ color: 0xffffff, alpha: 0.4 * lifeRatio });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------
  private _drawParticles(g: Graphics, state: SSState): void {
    for (const p of state.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.85;
      const size = p.size * (0.5 + lifeRatio * 0.5);
      g.circle(p.x, p.y, size * 2.2).fill({ color: p.color, alpha: alpha * 0.08 });
      g.circle(p.x, p.y, size * 1.4).fill({ color: p.color, alpha: alpha * 0.18 });
      g.circle(p.x, p.y, size).fill({ color: p.color, alpha });
      if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
        const trailLen = Math.min(8, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.2);
        const trAngle = Math.atan2(p.vy, p.vx);
        g.moveTo(p.x, p.y)
          .lineTo(p.x - Math.cos(trAngle) * trailLen, p.y - Math.sin(trAngle) * trailLen)
          .stroke({ color: p.color, width: size * 0.6, alpha: alpha * 0.35 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Shockwaves
  // ---------------------------------------------------------------------------
  private _drawShockwaves(g: Graphics, state: SSState): void {
    for (const sw of state.shockwaves) {
      const lifeRatio = sw.life / sw.maxLife;
      const alpha = lifeRatio * 0.6;
      g.circle(sw.x, sw.y, sw.radius).stroke({ color: sw.color, width: 3.5, alpha: alpha * 0.6 });
      g.circle(sw.x, sw.y, sw.radius * 0.75).stroke({ color: 0xffffff, width: 1.5, alpha: alpha * 0.25 });
      g.circle(sw.x, sw.y, sw.radius * 0.5).stroke({ color: sw.color, width: 1, alpha: alpha * 0.12 });
      g.circle(sw.x, sw.y, sw.radius).fill({ color: sw.color, alpha: alpha * 0.03 });
      for (let si = 0; si < 6; si++) {
        const sa = (si / 6) * Math.PI * 2 + state.time * 2;
        g.circle(sw.x + Math.cos(sa) * sw.radius, sw.y + Math.sin(sa) * sw.radius, 1.5)
          .fill({ color: 0xffffff, alpha: alpha * 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Float texts
  // ---------------------------------------------------------------------------
  private _renderFloatTexts(state: SSState, offX: number, offY: number): void {
    let pool = 0;
    for (const ft of state.floatTexts) {
      if (pool >= FLOAT_POOL) break;
      const t = this._floatTexts[pool++];
      t.visible = true;
      t.text = ft.text;
      t.style.fill = ft.color;
      const progress = 1 - ft.life / ft.maxLife;
      // Bounce-in then float
      const bounceY = progress < 0.15 ? (1 - Math.pow(1 - progress / 0.15, 2)) * 6 : 0;
      t.alpha = progress < 0.1 ? progress / 0.1 : ft.life / ft.maxLife;
      t.scale.set(ft.scale * (progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1 + progress * 0.2));
      t.position.set(offX + ft.x - t.width / 2 + Math.sin(progress * 4 + ft.x * 0.1) * 2,
                     offY + ft.y - t.height / 2 - progress * 25 - bounceY);
    }
    for (let i = pool; i < FLOAT_POOL; i++) this._floatTexts[i].visible = false;
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  private _drawHUD(state: SSState, meta: SSMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    const { score, wave, playerHP, maxHP, currentForm, comboCount } = state;

    // Top bar background
    g.rect(0, 0, sw, 36).fill({ color: 0x000000, alpha: 0.45 });

    // Score
    const comboMult = 1 + Math.min(comboCount, 10) * 0.1;
    const multStr = comboCount > 0 ? `  x${comboMult.toFixed(1)}` : "";
    this._hudText.text = `SCORE ${Math.floor(score)}   WAVE ${wave}   HP ${playerHP}/${maxHP}   ${FORM_NAMES[currentForm]}${multStr}`;
    this._hudText.visible = true;

    // Wave counter (right side)
    this._waveText.text = `WAVE ${wave}`;
    this._waveText.position.set(sw - 90, 10);

    // Form selector icons (bottom center) — detailed with form silhouettes
    const forms: SSForm[] = ["wolf", "eagle", "bear"];
    const iconSize = 28;
    const iconSpacing = 40;
    const iconsStartX = sw / 2 - iconSpacing;
    const iconY = sh - 44;
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      const ix = iconsStartX + i * iconSpacing;
      const isActive = f === currentForm;
      const fc = FORM_COLORS[f];
      // Glow behind active icon
      if (isActive) {
        g.circle(ix, iconY, iconSize * 0.8).fill({ color: fc, alpha: 0.08 + Math.sin(state.time * 3) * 0.03 });
      }
      // Background
      g.roundRect(ix - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, 5)
        .fill({ color: isActive ? fc : 0x0a120a, alpha: isActive ? 0.3 : 0.55 });
      g.roundRect(ix - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize, 5)
        .stroke({ color: fc, alpha: isActive ? 0.9 : 0.25, width: isActive ? 2.5 : 1 });
      // Form silhouette
      if (f === "wolf") {
        // Mini wolf head — ears
        g.moveTo(ix - 4, iconY - 2).lineTo(ix - 2, iconY - 8).lineTo(ix, iconY - 2)
          .fill({ color: fc, alpha: isActive ? 0.8 : 0.4 });
        g.moveTo(ix, iconY - 2).lineTo(ix + 2, iconY - 8).lineTo(ix + 4, iconY - 2)
          .fill({ color: fc, alpha: isActive ? 0.8 : 0.4 });
        g.circle(ix, iconY + 1, 4).fill({ color: fc, alpha: isActive ? 0.6 : 0.3 });
      } else if (f === "eagle") {
        // Mini wings
        g.moveTo(ix - 10, iconY + 2).lineTo(ix, iconY - 5).lineTo(ix + 10, iconY + 2)
          .stroke({ color: fc, width: 2, alpha: isActive ? 0.8 : 0.4 });
        g.circle(ix, iconY + 1, 3).fill({ color: fc, alpha: isActive ? 0.6 : 0.3 });
      } else {
        // Mini bear face
        g.circle(ix - 4, iconY - 4, 3).fill({ color: fc, alpha: isActive ? 0.7 : 0.3 });
        g.circle(ix + 4, iconY - 4, 3).fill({ color: fc, alpha: isActive ? 0.7 : 0.3 });
        g.circle(ix, iconY + 1, 5).fill({ color: fc, alpha: isActive ? 0.6 : 0.3 });
      }
      // Key number below icon
      const keyColor = isActive ? 0xffffff : 0x556655;
      g.circle(ix, iconY + iconSize / 2 + 6, 6).fill({ color: 0x000000, alpha: 0.5 });
      g.circle(ix, iconY + iconSize / 2 + 6, 6).stroke({ color: keyColor, width: 0.8, alpha: 0.6 });
    }

    // Combo
    if (comboCount >= 3) {
      this._comboText.text = `x${comboCount} COMBO`;
      this._comboText.visible = true;
      this._comboText.alpha = Math.min(1, state.comboTimer * 3);
      this._comboText.position.set(sw / 2 - this._comboText.width / 2, sh * 0.18);
    } else {
      this._comboText.visible = false;
    }

    // Off-screen enemy indicators
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      if (e.x < -5 || e.x > state.arenaW + 5 || e.y < -5 || e.y > state.arenaH + 5) {
        const toEnemy = Math.atan2(e.y - state.arenaH / 2, e.x - state.arenaW / 2);
        let ix = sw / 2 + Math.cos(toEnemy) * (sw / 2 - 25);
        let iy = sh / 2 + Math.sin(toEnemy) * (sh / 2 - 25);
        ix = Math.max(25, Math.min(sw - 25, ix));
        iy = Math.max(25, Math.min(sh - 25, iy));
        const arrowSize = 4;
        g.moveTo(ix + Math.cos(toEnemy) * arrowSize, iy + Math.sin(toEnemy) * arrowSize)
          .lineTo(ix + Math.cos(toEnemy + 2.5) * arrowSize, iy + Math.sin(toEnemy + 2.5) * arrowSize)
          .lineTo(ix + Math.cos(toEnemy - 2.5) * arrowSize, iy + Math.sin(toEnemy - 2.5) * arrowSize)
          .closePath().fill({ color: e.elite ? 0xffd700 : 0xff4444, alpha: 0.45 });
      }
    }

    // High score on HUD
    this._highScoreText.text = `BEST: ${meta.highScore}`;
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------
  private _drawStartScreen(_state: SSState, meta: SSMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    // Panel
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    g.roundRect(sw / 2 - 230, sh / 2 - 200, 460, 400, 12)
      .fill({ color: 0x060f08, alpha: 0.85 });
    g.roundRect(sw / 2 - 230, sh / 2 - 200, 460, 400, 12)
      .stroke({ color: 0x44aa44, alpha: 0.4, width: 1.5 });

    // Ambient nature particles
    const t2 = _state.time;
    for (let fi = 0; fi < 6; fi++) {
      const fx = sw * 0.2 + ((fi * 179 + t2 * (6 + fi)) % (sw * 0.6));
      const fy = sh * 0.3 + ((fi * 347) % (sh * 0.4)) + Math.sin(t2 * 1.5 + fi * 2) * 8;
      g.circle(fx, fy, 1.2).fill({ color: 0x88ff44, alpha: 0.12 + Math.sin(t2 * 2 + fi) * 0.06 });
      g.circle(fx, fy, 3.5).fill({ color: 0x44aa22, alpha: 0.03 });
    }
    // Form cycle icons
    const cycleIdx = Math.floor(t2 * 0.6) % 3;
    const cycleForm: SSForm[] = ["wolf", "eagle", "bear"];
    const cycleColor = FORM_COLORS[cycleForm[cycleIdx]];
    g.circle(sw / 2, sh / 2 - 155, 8).fill({ color: cycleColor, alpha: 0.5 + Math.sin(t2 * 3) * 0.2 });
    g.circle(sw / 2, sh / 2 - 155, 12).stroke({ color: cycleColor, width: 1.5, alpha: 0.35 });

    this._titleText.position.set(sw / 2 - this._titleText.width / 2, sh / 2 - 185);
    this._subtitleText.position.set(sw / 2 - this._subtitleText.width / 2, sh / 2 - 125);

    this._controlsText.text =
      "WOLF  [1] — Fast melee · Click: Lunge · Shift: Sprint · Q: Summon Pack\n" +
      "EAGLE [2] — Ranged bolts · Click: Shoot · Shift: Dive Bomb · Q: Whirlwind\n" +
      "BEAR  [3] — Tank swipes · Click: Swipe · Shift: Roar Stun · Q: Earthquake\n" +
      "[1/2/3] Switch Forms   ESC: Pause";
    this._controlsText.position.set(sw / 2 - this._controlsText.width / 2, sh / 2 - 60);

    this._promptText.position.set(sw / 2 - this._promptText.width / 2, sh / 2 + 130);
    this._highScoreText.text = `Best: ${meta.highScore}  ·  Games: ${meta.gamesPlayed}`;
    this._highScoreText.position.set(sw / 2 - this._highScoreText.width / 2, sh / 2 + 165);
  }

  // ---------------------------------------------------------------------------
  // Death screen
  // ---------------------------------------------------------------------------
  private _drawDeathScreen(state: SSState, meta: SSMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.72 });
    g.roundRect(sw / 2 - 240, sh / 2 - 230, 480, 460, 14)
      .fill({ color: 0x060f08, alpha: 0.9 });
    g.roundRect(sw / 2 - 240, sh / 2 - 230, 480, 460, 14)
      .stroke({ color: 0x44aa44, alpha: 0.45, width: 1.5 });

    const { grade, color } = getSSGrade(state.score);
    this._gradeText.text = grade;
    this._gradeText.style.fill = color;
    this._gradeText.position.set(sw / 2 - this._gradeText.width / 2, sh / 2 - 215);

    this._statText.text =
      `Score: ${Math.floor(state.score)}   Wave: ${state.wave}   Kills: ${state.totalKills}\n` +
      `Best Combo: x${state.bestCombo}   High Score: ${meta.highScore}\n` +
      `Wolf kills: ${state.formKills.wolf}   Eagle: ${state.formKills.eagle}   Bear: ${state.formKills.bear}`;
    this._statText.position.set(sw / 2 - this._statText.width / 2, sh / 2 - 155);

    this._drawUpgradeShop(g, state, meta, sw, sh);

    this._deathPrompt.text = "Press SPACE to play again";
    this._deathPrompt.position.set(sw / 2 - this._deathPrompt.width / 2, sh / 2 + 205);
  }

  // ---------------------------------------------------------------------------
  // Upgrade shop
  // ---------------------------------------------------------------------------
  private _drawUpgradeShop(g: Graphics, _state: SSState, meta: SSMeta, sw: number, sh: number): void {
    const panelX = sw / 2 - 190;
    const panelY = sh / 2 - 60;
    const panelW = 380;
    g.roundRect(panelX, panelY, panelW, 220, 8).fill({ color: 0x0a150c, alpha: 0.8 });
    g.roundRect(panelX, panelY, panelW, 220, 8).stroke({ color: 0x336633, alpha: 0.5, width: 1 });

    this._shopTitle.text = "UPGRADES";
    this._shopTitle.position.set(sw / 2 - this._shopTitle.width / 2, panelY + 8);

    const shards = meta.shards;
    this._shardText.text = `Shards: ${shards}`;
    this._shardText.position.set(panelX + panelW - this._shardText.width - 10, panelY + 10);

    const upgKeys: Array<keyof typeof meta.upgrades> = ["maxHP", "wolfPower", "eaglePower", "bearPower", "allyDuration"];
    const upgLabels = ["[1] Max HP", "[2] Wolf Power", "[3] Eagle Power", "[4] Bear Power", "[5] Ally Duration"];
    const costs = SS.UPGRADE_COSTS;

    for (let i = 0; i < 5; i++) {
      const key = upgKeys[i];
      const level = meta.upgrades[key];
      const maxLevel = costs[key].length;
      const cost = level < maxLevel ? costs[key][level] : null;
      const canAfford = cost !== null && shards >= cost;
      const isMax = level >= maxLevel;

      let line = `${upgLabels[i]}  Lv${level}/${maxLevel}`;
      if (isMax) line += "  [MAX]";
      else if (cost !== null) line += `  Cost: ${cost}`;

      const t = this._shopTexts[i];
      t.text = line;
      t.style.fill = isMax ? 0x88aa66 : canAfford ? 0xccddaa : 0x556644;
      t.position.set(panelX + 16, panelY + 38 + i * 34);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------
  private _drawPauseScreen(sw: number, sh: number): void {
    const g = this._uiGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
    // Decorative border
    g.roundRect(sw / 2 - 110, sh / 2 - 35, 220, 70, 8)
      .fill({ color: 0x060f08, alpha: 0.8 });
    g.roundRect(sw / 2 - 110, sh / 2 - 35, 220, 70, 8)
      .stroke({ color: 0x44aa44, width: 1.5, alpha: 0.4 });
    // Corner dots
    g.circle(sw / 2 - 110, sh / 2 - 35, 2).fill({ color: 0x44aa44, alpha: 0.5 });
    g.circle(sw / 2 + 110, sh / 2 - 35, 2).fill({ color: 0x44aa44, alpha: 0.5 });
    g.circle(sw / 2 - 110, sh / 2 + 35, 2).fill({ color: 0x44aa44, alpha: 0.5 });
    g.circle(sw / 2 + 110, sh / 2 + 35, 2).fill({ color: 0x44aa44, alpha: 0.5 });
    this._pauseText.position.set(sw / 2 - this._pauseText.width / 2, sh / 2 - 14);
  }

  // ---------------------------------------------------------------------------
  // Wave announce
  // ---------------------------------------------------------------------------
  private _drawWaveAnnounce(state: SSState, sw: number, sh: number): void {
    if (state.waveAnnounceTimer > 0) {
      const alpha = Math.min(1, state.waveAnnounceTimer / 0.5) * 0.7;
      const g = this._uiGfx;
      // Dark band
      const bandH = 45;
      const bandY = sh * 0.28 - bandH / 2;
      g.rect(0, bandY, sw, bandH).fill({ color: 0x000000, alpha: alpha * 0.5 });
      g.moveTo(0, bandY).lineTo(sw, bandY).stroke({ color: 0x44aa44, width: 2, alpha: alpha * 0.5 });
      g.moveTo(0, bandY + bandH).lineTo(sw, bandY + bandH).stroke({ color: 0x44aa44, width: 2, alpha: alpha * 0.5 });
      // Side flares
      const flareW = 25 + Math.sin(state.time * 5) * 8;
      g.rect(0, bandY, flareW, bandH).fill({ color: 0x44aa44, alpha: alpha * 0.08 });
      g.rect(sw - flareW, bandY, flareW, bandH).fill({ color: 0x44aa44, alpha: alpha * 0.08 });

      this._waveAnnounceText.text = state.waveEventActive || `WAVE ${state.wave}`;
      this._waveAnnounceText.alpha = alpha;
      this._waveAnnounceText.visible = true;
      this._waveAnnounceText.position.set(sw / 2 - this._waveAnnounceText.width / 2, sh * 0.28 - 10);
    } else {
      this._waveAnnounceText.visible = false;
    }
  }
}
