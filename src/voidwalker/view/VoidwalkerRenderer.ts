// ---------------------------------------------------------------------------
// Voidwalker — PixiJS Renderer
// Portal-based shadow combat: void portals, teleport, shadow magic
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { VWPhase } from "../types";
import type { VWState, VWMeta } from "../types";
import { VW, getVWGrade } from "../config/VoidwalkerBalance";

// ---------------------------------------------------------------------------
// Text styles — deep void purple/black palette
// ---------------------------------------------------------------------------
const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0x9944ff, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x000000, distance: 4, blur: 10, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0x6622cc, fontStyle: "italic", letterSpacing: 3 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xaa88dd, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0x8844ff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_GRADE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 46, fill: 0x9944ff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaaaacc, lineHeight: 22 });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x664488, lineHeight: 16 });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0x9944ff, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });
const STYLE_COMBO = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 28, fill: 0x8844ff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.8 } });

const FLOAT_POOL = 16;

// ---------------------------------------------------------------------------
export class VoidwalkerRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "VOIDWALKER", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Between Worlds", style: STYLE_SUBTITLE });
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
      fontFamily: "Georgia, serif", fontSize: 16, fill: 0x9944ff, fontWeight: "bold",
      letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 13, fill: 0x8844ff, fontWeight: "bold",
      letterSpacing: 2, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveAnnounceText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 26, fill: 0x9944ff, fontWeight: "bold",
      letterSpacing: 4, dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.9 },
    }),
  });
  private _highScoreText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "monospace", fontSize: 12, fill: 0xaa88dd,
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
          fontFamily: "monospace", fontSize: 11, fill: 0xaa88dd,
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

  render(state: VWState, sw: number, sh: number, meta: VWMeta): void {
    const g = this._gfx;
    const ui = this._uiGfx;
    g.clear();
    ui.clear();

    // 1. Background
    this._drawBackground(g, state, sw, sh);

    // 2. Screen shake offset
    let ox = 0, oy = 0;
    if (state.screenShake > 0) {
      ox = (Math.random() - 0.5) * state.screenShake * 2;
      oy = (Math.random() - 0.5) * state.screenShake * 2;
    }
    const arenaOffX = (sw - state.arenaW) / 2 + ox;
    const arenaOffY = (sh - state.arenaH) / 2 + oy;

    // 3. Playing layer
    if (state.phase === VWPhase.PLAYING || state.phase === VWPhase.PAUSED || state.phase === VWPhase.DEAD) {
      g.setTransform(arenaOffX, arenaOffY);
      this._drawArena(g, state);
      // Ambient void dust — enhanced
      for (let di = 0; di < 15; di++) {
        const dx = ((di * 277 + 43) % state.arenaW);
        const dy = ((di * 431 + 91 + state.time * (1.5 + di * 0.3)) % state.arenaH);
        const dSize = 0.7 + (di % 3) * 0.3;
        const dAlpha = 0.035 + Math.sin(state.time * 0.6 + di) * 0.015;
        g.circle(dx, dy, dSize * 2).fill({ color: 0x6622cc, alpha: dAlpha * 0.3 });
        g.circle(dx, dy, dSize).fill({ color: 0x8844ff, alpha: dAlpha });
      }
      this._drawBloodStains(g, state);
      this._drawHazards(g, state);
      this._drawPortals(g, state);
      this._drawEnemies(g, state);
      this._drawBoss(g, state);
      this._drawPlayer(g, state);
      this._drawProjectiles(g, state);
      this._drawPickups(g, state);
      this._drawParticles(g, state);
      this._drawShockwaves(g, state);
      g.setTransform(0, 0);
    }

    // 4. Screen flash
    if (state.screenFlashTimer > 0) {
      const flashRatio = Math.min(1, state.screenFlashTimer / VW.FLASH_DURATION);
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
    if (state.phase === VWPhase.PLAYING && state.playerHP <= Math.ceil(state.maxHP * 0.3) && state.playerHP > 0) {
      const t2 = state.time;
      const dangerPulse = 0.06 + Math.sin(t2 * 4) * 0.03;
      const edgeW = 35 + Math.sin(t2 * 3) * 8;
      ui.rect(0, 0, sw, edgeW).fill({ color: 0x6600cc, alpha: dangerPulse });
      ui.rect(0, sh - edgeW, sw, edgeW).fill({ color: 0x6600cc, alpha: dangerPulse });
      ui.rect(0, 0, edgeW, sh).fill({ color: 0x6600cc, alpha: dangerPulse });
      ui.rect(sw - edgeW, 0, edgeW, sh).fill({ color: 0x6600cc, alpha: dangerPulse });
      if (state.playerHP <= 1) {
        const heartbeat = Math.pow(Math.sin(t2 * 5), 8) * 0.05;
        ui.rect(0, 0, sw, sh).fill({ color: 0x330066, alpha: heartbeat });
      }
    }

    // Combat intensity border glow
    if (state.phase === VWPhase.PLAYING) {
      const aliveCount = state.enemies.filter(e => e.alive).length;
      if (aliveCount > 4) {
        const intensity = Math.min(1, (aliveCount - 4) / 12);
        const combatGlow = intensity * (0.025 + Math.sin(state.time * 1.5) * 0.008);
        ui.rect(0, 0, sw, 3).fill({ color: VW.COLOR_VOID_BRIGHT, alpha: combatGlow });
        ui.rect(0, sh - 3, sw, 3).fill({ color: VW.COLOR_VOID_BRIGHT, alpha: combatGlow });
        ui.rect(0, 0, 3, sh).fill({ color: VW.COLOR_VOID_BRIGHT, alpha: combatGlow });
        ui.rect(sw - 3, 0, 3, sh).fill({ color: VW.COLOR_VOID_BRIGHT, alpha: combatGlow });
      }
    }

    // Shadow storm screen overlay
    if (state.stormActive) {
      const stormAlpha = 0.03 + Math.sin(state.time * 6) * 0.015;
      ui.rect(0, 0, sw, sh).fill({ color: 0x220044, alpha: stormAlpha });
      // Crackling void lines at screen edges
      for (let si2 = 0; si2 < 4; si2++) {
        const sx2 = Math.random() * sw;
        const sy2 = si2 < 2 ? Math.random() * 15 : sh - Math.random() * 15;
        g.moveTo(sx2, sy2).lineTo(sx2 + (Math.random() - 0.5) * 30, sy2 + (Math.random() - 0.5) * 8)
          .stroke({ color: 0x9944ff, width: 1, alpha: 0.15 + Math.random() * 0.1 });
      }
    }

    // 5. Float texts
    this._renderFloatTexts(state, arenaOffX, arenaOffY);

    // 6. HUD
    this._drawHUD(state, meta, sw, sh);

    // 7. Screens
    if (state.phase === VWPhase.START) this._drawStartScreen(state, meta, sw, sh);
    else if (state.phase === VWPhase.DEAD) this._drawDeathScreen(state, meta, sw, sh);
    else if (state.phase === VWPhase.PAUSED) this._drawPauseScreen(sw, sh);

    // 8. Wave announce
    this._drawWaveAnnounce(state, sw, sh);

    // Visibility control
    const isPlaying = state.phase === VWPhase.PLAYING;
    this._titleText.visible = state.phase === VWPhase.START;
    this._subtitleText.visible = state.phase === VWPhase.START;
    this._controlsText.visible = state.phase === VWPhase.START;
    this._promptText.visible = state.phase === VWPhase.START;
    this._pauseText.visible = state.phase === VWPhase.PAUSED;
    this._gradeText.visible = state.phase === VWPhase.DEAD;
    this._statText.visible = state.phase === VWPhase.DEAD;
    this._deathPrompt.visible = state.phase === VWPhase.DEAD;
    for (const t of this._shopTexts) t.visible = state.phase === VWPhase.DEAD;
    this._shardText.visible = state.phase === VWPhase.DEAD;
    this._shopTitle.visible = state.phase === VWPhase.DEAD;
    this._waveText.visible = isPlaying;
    this._hudText.visible = isPlaying || state.phase === VWPhase.PAUSED;
    this._highScoreText.visible = state.phase === VWPhase.START;
  }

  // ---------------------------------------------------------------------------
  // Background — deep void space
  // ---------------------------------------------------------------------------
  private _drawBackground(g: Graphics, state: VWState, sw: number, sh: number): void {
    const t = state.time;
    // Deep void purple
    g.rect(0, 0, sw, sh).fill({ color: 0x120020 });
    // Void nebula washes
    g.rect(0, 0, sw, sh * 0.4).fill({ color: 0x1a0030, alpha: 0.4 });
    g.circle(sw * 0.15, sh * 0.12, 160).fill({ color: 0x220044, alpha: 0.25 });
    g.circle(sw * 0.75, sh * 0.18, 200).fill({ color: 0x1a0033, alpha: 0.2 });
    // Void rift in sky — glowing tear
    const riftX = sw * 0.5, riftY = sh * 0.08;
    const riftPulse = 0.15 + Math.sin(t * 1.2) * 0.06;
    g.circle(riftX, riftY, 55).fill({ color: 0x330066, alpha: riftPulse * 0.5 });
    g.circle(riftX, riftY, 35).fill({ color: 0x5500aa, alpha: riftPulse * 0.7 });
    g.circle(riftX, riftY, 18).fill({ color: 0x8833ee, alpha: riftPulse });
    g.circle(riftX, riftY, 8).fill({ color: 0xbb66ff, alpha: 0.9 });
    // Stars — cold white-blue in void sky
    const parallaxX = (state.playerX - sw / 2) * 0.015;
    const parallaxY = (state.playerY - sh / 2) * 0.015;
    for (let si = 0; si < 40; si++) {
      const sx = ((si * 197 + 53) % sw) - parallaxX * (1 + si * 0.015);
      const sy = ((si * 311 + 97) % (sh * 0.45)) - parallaxY * (1 + si * 0.015);
      const sBright = ((si * 73) % 5) / 5;
      const sFlicker = 0.15 + sBright * 0.3 + Math.sin(t * (0.4 + si * 0.07) + si) * 0.08;
      const starColor = si % 3 === 0 ? 0x9988ff : si % 3 === 1 ? 0xaaaaff : 0xccccff;
      g.circle(sx, sy, 0.5 + sBright * 0.5).fill({ color: starColor, alpha: sFlicker });
    }
    // Floating void motes
    for (let mi = 0; mi < 8; mi++) {
      const mx = ((mi * 277 + 43 + t * (5 + mi * 1.5)) % sw);
      const my = sh * 0.25 + ((mi * 431 + 91) % (sh * 0.65)) + Math.sin(t * 1.2 + mi * 2) * 12;
      const mAlpha = 0.08 + Math.sin(t * 2.5 + mi * 1.7) * 0.05;
      g.circle(mx, my, 1.8).fill({ color: 0x8844ff, alpha: mAlpha });
      g.circle(mx, my, 4.5).fill({ color: 0x6622cc, alpha: mAlpha * 0.2 });
    }
    // Subtle vignette edges
    for (let r = 3; r > 0; r--) {
      const vr = Math.max(sw, sh) * (0.4 + r * 0.13);
      g.circle(sw / 2, sh / 2, vr).fill({ color: 0x000000, alpha: 0.03 });
    }
  }

  // ---------------------------------------------------------------------------
  // Arena — void dimension floor
  // ---------------------------------------------------------------------------
  private _drawArena(g: Graphics, state: VWState): void {
    const { arenaW: aw, arenaH: ah } = state;
    const t = state.time;
    const cx = aw / 2, cy = ah / 2;
    // Void floor
    g.rect(0, 0, aw, ah).fill({ color: 0x140028 });
    // Hex/void tile grid
    const tileSize = 32;
    for (let tx = 0; tx < aw; tx += tileSize) {
      for (let ty = 0; ty < ah; ty += tileSize) {
        const txi = Math.floor(tx / tileSize), tyi = Math.floor(ty / tileSize);
        const shade = (txi + tyi) % 2 === 0 ? 0x1a0030 : 0x160035;
        const variation = ((txi * 73 + tyi * 137) % 5) * 0.003;
        g.rect(tx, ty, tileSize, tileSize).fill({ color: shade, alpha: 0.7 + variation });
        g.moveTo(tx, ty).lineTo(tx + tileSize, ty).stroke({ color: 0x2a0044, width: 0.5, alpha: 0.4 });
      }
    }
    // Void energy ambient glow from center
    g.circle(cx, cy, Math.min(aw, ah) * 0.38).fill({ color: 0x2a0055, alpha: 0.12 + Math.sin(t * 0.7) * 0.03 });
    // Combat intensity
    const aliveCount = state.enemies.filter(e => e.alive).length;
    if (aliveCount > 4) {
      const intensity = Math.min(1, (aliveCount - 4) / 12);
      g.circle(cx, cy, Math.min(aw, ah) * 0.32).fill({ color: 0x110022, alpha: intensity * 0.06 });
    }
    // Boss arena darkening
    if (state.bossWave) {
      g.rect(0, 0, aw, ah).fill({ color: 0x050008, alpha: 0.08 + Math.sin(t * 0.8) * 0.02 });
    }
    // Central void sigil — portal mandala
    const manR = Math.min(aw, ah) * 0.26;
    g.circle(cx, cy, manR).stroke({ color: 0x6622cc, width: 1.5, alpha: 0.1 + Math.sin(t * 0.5) * 0.03 });
    g.circle(cx, cy, manR * 0.72).stroke({ color: 0x7733dd, width: 1, alpha: 0.08 });
    g.circle(cx, cy, manR * 0.42).stroke({ color: 0x8844ff, width: 1, alpha: 0.09 + Math.sin(t * 0.8) * 0.02 });
    // Radiating void lines
    for (let ri = 0; ri < 8; ri++) {
      const ra = t * 0.08 + ri * Math.PI / 4;
      g.moveTo(cx + Math.cos(ra) * manR * 0.12, cy + Math.sin(ra) * manR * 0.12)
        .lineTo(cx + Math.cos(ra) * manR * 0.93, cy + Math.sin(ra) * manR * 0.93)
        .stroke({ color: 0x6622cc, width: 0.7, alpha: 0.07 + Math.sin(t * 0.4 + ri) * 0.02 });
    }
    // Center focal
    g.circle(cx, cy, 6).fill({ color: 0x6622cc, alpha: 0.1 + Math.sin(t * 1.1) * 0.04 });
    g.circle(cx, cy, 2.5).fill({ color: 0x9944ff, alpha: 0.2 });
    // Void stone border
    const bw = 6;
    g.rect(0, 0, aw, bw).fill({ color: 0x1a0033 });
    g.rect(0, ah - bw, aw, bw).fill({ color: 0x1a0033 });
    g.rect(0, 0, bw, ah).fill({ color: 0x1a0033 });
    g.rect(aw - bw, 0, bw, ah).fill({ color: 0x1a0033 });
    // Border glow
    g.rect(0, 0, aw, 2).fill({ color: 0x8844ff, alpha: 0.3 + Math.sin(t * 1.1) * 0.08 });
    g.rect(0, ah - 2, aw, 2).fill({ color: 0x8844ff, alpha: 0.3 + Math.sin(t * 1.1) * 0.08 });
    g.rect(0, 0, 2, ah).fill({ color: 0x8844ff, alpha: 0.3 + Math.sin(t * 1.1) * 0.08 });
    g.rect(aw - 2, 0, 2, ah).fill({ color: 0x8844ff, alpha: 0.3 + Math.sin(t * 1.1) * 0.08 });
    // Border rune symbols — rotating void marks along edges
    const runeSpacing = 40;
    const runeAlpha = 0.12 + Math.sin(t * 0.8) * 0.04;
    for (let rx = runeSpacing; rx < aw - runeSpacing / 2; rx += runeSpacing) {
      const ra = runeAlpha + Math.sin(t * 2 + rx * 0.06) * 0.03;
      // Top edge
      const rotT = t * 0.3 + rx * 0.04;
      for (let rv = 0; rv < 4; rv++) {
        const a1 = rotT + rv * Math.PI / 2;
        const a2 = rotT + (rv + 1) * Math.PI / 2;
        g.moveTo(rx + Math.cos(a1) * 3, -1 + Math.sin(a1) * 3)
          .lineTo(rx + Math.cos(a2) * 3, -1 + Math.sin(a2) * 3)
          .stroke({ color: 0x8844ff, width: 0.7, alpha: ra });
      }
      // Bottom edge
      for (let rv = 0; rv < 4; rv++) {
        const a1 = rotT + rv * Math.PI / 2;
        const a2 = rotT + (rv + 1) * Math.PI / 2;
        g.moveTo(rx + Math.cos(a1) * 3, ah + 1 + Math.sin(a1) * 3)
          .lineTo(rx + Math.cos(a2) * 3, ah + 1 + Math.sin(a2) * 3)
          .stroke({ color: 0x6622cc, width: 0.7, alpha: ra });
      }
    }
    for (let ry = runeSpacing; ry < ah - runeSpacing / 2; ry += runeSpacing) {
      const ra = runeAlpha + Math.sin(t * 2 + ry * 0.06) * 0.03;
      const rotL = t * 0.3 + ry * 0.04;
      // Left edge
      for (let rv = 0; rv < 4; rv++) {
        const a1 = rotL + rv * Math.PI / 2;
        const a2 = rotL + (rv + 1) * Math.PI / 2;
        g.moveTo(-1 + Math.cos(a1) * 3, ry + Math.sin(a1) * 3)
          .lineTo(-1 + Math.cos(a2) * 3, ry + Math.sin(a2) * 3)
          .stroke({ color: 0x8844ff, width: 0.7, alpha: ra });
      }
      // Right edge
      for (let rv = 0; rv < 4; rv++) {
        const a1 = rotL + rv * Math.PI / 2;
        const a2 = rotL + (rv + 1) * Math.PI / 2;
        g.moveTo(aw + 1 + Math.cos(a1) * 3, ry + Math.sin(a1) * 3)
          .lineTo(aw + 1 + Math.cos(a2) * 3, ry + Math.sin(a2) * 3)
          .stroke({ color: 0x6622cc, width: 0.7, alpha: ra });
      }
    }
    // Portal ambient lighting on arena floor
    for (const portal of state.portals) {
      const pLifeRatio = portal.life / portal.maxLife;
      g.circle(portal.x, portal.y, portal.radius * 2.5).fill({ color: 0x220044, alpha: 0.04 * pLifeRatio });
      g.circle(portal.x, portal.y, portal.radius * 1.5).fill({ color: 0x330066, alpha: 0.06 * pLifeRatio });
    }
    // Corner void crystals
    const corners: [number, number][] = [[12, 12], [aw - 12, 12], [12, ah - 12], [aw - 12, ah - 12]];
    for (let ci = 0; ci < corners.length; ci++) {
      const [cpx, cpy] = corners[ci];
      const floatY = Math.sin(t * 1.4 + ci * 1.9) * 2;
      g.circle(cpx, cpy + floatY, 12).fill({ color: 0x330066, alpha: 0.07 + Math.sin(t * 1.8 + ci) * 0.02 });
      // Void shard crystal
      g.moveTo(cpx, cpy + floatY - 11).lineTo(cpx - 4, cpy + floatY + 2).lineTo(cpx + 4, cpy + floatY + 2)
        .closePath().fill({ color: 0x7733cc, alpha: 0.5 });
      g.moveTo(cpx, cpy + floatY - 11).lineTo(cpx - 2, cpy + floatY).lineTo(cpx + 2, cpy + floatY)
        .closePath().fill({ color: 0xaa55ff, alpha: 0.3 });
      g.circle(cpx, cpy + floatY - 4, 2.5).fill({ color: 0xcc88ff, alpha: 0.4 });
      // Light rays from crystal
      for (let ray = 0; ray < 5; ray++) {
        const rayA = t * 0.5 + ci * 1.2 + ray * Math.PI * 2 / 5;
        const rayLen = 10 + Math.sin(t * 2 + ray + ci) * 3;
        g.moveTo(cpx, cpy + floatY)
          .lineTo(cpx + Math.cos(rayA) * rayLen, cpy + floatY + Math.sin(rayA) * rayLen)
          .stroke({ color: 0xaa77ff, width: 0.7, alpha: 0.12 + Math.sin(t * 3 + ray) * 0.04 });
      }
      // Orbiting sparkles
      for (let mi2 = 0; mi2 < 2; mi2++) {
        const mAngle = t * 2 + ci * 2 + mi2 * Math.PI;
        const mDist2 = 14 + Math.sin(t * 1.5 + mi2) * 2;
        g.circle(cpx + Math.cos(mAngle) * mDist2, cpy + floatY + Math.sin(mAngle) * mDist2, 1)
          .fill({ color: 0xcc99ff, alpha: 0.3 + Math.sin(t * 4 + mi2) * 0.15 });
      }
      // Ground illumination from crystal
      g.circle(cpx, cpy, 25).fill({ color: 0x330066, alpha: 0.03 + Math.sin(t * 1.5 + ci) * 0.01 });
    }
  }

  // ---------------------------------------------------------------------------
  // Blood stains (void residue)
  // ---------------------------------------------------------------------------
  private _drawBloodStains(g: Graphics, state: VWState): void {
    for (const bs of state.bloodStains) {
      g.circle(bs.x, bs.y, bs.size).fill({ color: 0x220044, alpha: bs.alpha * 0.5 });
      g.circle(bs.x, bs.y, bs.size * 0.65).fill({ color: 0x330055, alpha: bs.alpha * 0.35 });
      for (let si = 0; si < 3; si++) {
        const sa = si * Math.PI * 2 / 3 + bs.x * 0.1;
        const sd = bs.size * 0.5 + si * 1.5;
        g.circle(bs.x + Math.cos(sa) * sd, bs.y + Math.sin(sa) * sd, 1.2)
          .fill({ color: 0x440066, alpha: bs.alpha * 0.2 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Arena Hazards
  // ---------------------------------------------------------------------------
  private _drawHazards(g: Graphics, state: VWState): void {
    const t = state.time;
    for (const h of state.arenaHazards) {
      const lifeRatio = h.life / h.maxLife;
      if (h.kind === "void_rift") {
        g.circle(h.x, h.y, h.radius).fill({ color: 0x220044, alpha: (h.active ? 0.15 : 0.04) * lifeRatio });
        if (h.active) {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0xff22aa, width: 2, alpha: (0.4 + Math.sin(t * 6) * 0.15) * lifeRatio });
          for (let pi = 0; pi < 6; pi++) {
            const pa = t * 3 + pi * Math.PI / 3;
            const pr = h.radius * (0.3 + (t * 0.5 + pi * 0.2) % 0.7);
            g.circle(h.x + Math.cos(pa) * pr, h.y + Math.sin(pa) * pr, 1.5)
              .fill({ color: 0xff44cc, alpha: 0.4 * lifeRatio });
          }
          g.moveTo(h.x, h.y - 5).lineTo(h.x - 4, h.y + 3).lineTo(h.x + 4, h.y + 3).closePath()
            .stroke({ color: 0xff22aa, width: 1.5, alpha: 0.5 * lifeRatio });
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x440022, width: 1, alpha: 0.12 * lifeRatio });
        }
      } else if (h.kind === "shadow_pool") {
        g.circle(h.x, h.y, h.radius).fill({ color: 0x0a0022, alpha: (h.active ? 0.18 : 0.05) * lifeRatio });
        if (h.active) {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x4422aa, width: 2, alpha: 0.35 * lifeRatio });
          for (let bi = 0; bi < 4; bi++) {
            const ba = t * 0.8 + bi * Math.PI / 2;
            const bd = h.radius * (0.2 + (t * 0.3 + bi * 0.15) % 0.6);
            g.circle(h.x + Math.cos(ba) * bd, h.y + Math.sin(ba) * bd, 1.5)
              .fill({ color: 0x6644cc, alpha: 0.3 * lifeRatio });
          }
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x220044, width: 1, alpha: 0.1 * lifeRatio });
        }
      } else if (h.kind === "energy_well") {
        g.circle(h.x, h.y, h.radius).fill({ color: 0x110033, alpha: (h.active ? 0.12 : 0.03) * lifeRatio });
        if (h.active) {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x8844ff, width: 2, alpha: (0.35 + Math.sin(t * 2.5) * 0.1) * lifeRatio });
          for (let pi2 = 0; pi2 < 5; pi2++) {
            const pa2 = t * 1.2 + pi2 * Math.PI * 2 / 5;
            const py3 = h.y - ((t * 12 + pi2 * 9) % 12);
            g.circle(h.x + Math.cos(pa2) * h.radius * 0.4, py3, 1)
              .fill({ color: 0xaa66ff, alpha: 0.35 * lifeRatio });
          }
          g.circle(h.x, h.y, 4).fill({ color: 0x8844ff, alpha: 0.2 * lifeRatio });
          g.moveTo(h.x - 3, h.y).lineTo(h.x + 3, h.y).stroke({ color: 0xcc88ff, width: 1.5, alpha: 0.35 * lifeRatio });
          g.moveTo(h.x, h.y - 3).lineTo(h.x, h.y + 3).stroke({ color: 0xcc88ff, width: 1.5, alpha: 0.35 * lifeRatio });
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x220044, width: 1, alpha: 0.08 * lifeRatio });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Portals — tears in space, the most important visual
  // ---------------------------------------------------------------------------
  private _drawPortals(g: Graphics, state: VWState): void {
    const t = state.time;
    for (const portal of state.portals) {
      const lifeRatio = portal.life / portal.maxLife;
      const pr = portal.radius;
      const pulse = 0.8 + Math.sin(t * 3.5 + portal.id) * 0.2;

      // Outer void halo
      g.circle(portal.x, portal.y, pr * 1.8).fill({ color: 0x1a0033, alpha: lifeRatio * 0.25 });
      g.circle(portal.x, portal.y, pr * 1.4).fill({ color: 0x330066, alpha: lifeRatio * 0.18 });

      // Outer swirling rings — clockwise rotation
      for (let ri = 0; ri < 16; ri++) {
        const a1 = t * 2.5 + ri * Math.PI / 8;
        const a2 = t * 2.5 + (ri + 0.7) * Math.PI / 8;
        const outerR = pr * pulse;
        g.moveTo(portal.x + Math.cos(a1) * outerR, portal.y + Math.sin(a1) * outerR)
          .lineTo(portal.x + Math.cos(a2) * outerR, portal.y + Math.sin(a2) * outerR)
          .stroke({ color: 0x9944ff, width: 2.5, alpha: lifeRatio * 0.75 });
      }
      // Middle ring — counter-clockwise
      for (let ri = 0; ri < 12; ri++) {
        const a1 = -t * 3.8 + ri * Math.PI / 6;
        const a2 = -t * 3.8 + (ri + 0.65) * Math.PI / 6;
        const midR = pr * pulse * 0.72;
        g.moveTo(portal.x + Math.cos(a1) * midR, portal.y + Math.sin(a1) * midR)
          .lineTo(portal.x + Math.cos(a2) * midR, portal.y + Math.sin(a2) * midR)
          .stroke({ color: 0xcc66ff, width: 2, alpha: lifeRatio * 0.65 });
      }
      // Inner ring
      for (let ri = 0; ri < 8; ri++) {
        const a1 = t * 5.5 + ri * Math.PI / 4;
        const a2 = t * 5.5 + (ri + 0.6) * Math.PI / 4;
        const innerR = pr * pulse * 0.46;
        g.moveTo(portal.x + Math.cos(a1) * innerR, portal.y + Math.sin(a1) * innerR)
          .lineTo(portal.x + Math.cos(a2) * innerR, portal.y + Math.sin(a2) * innerR)
          .stroke({ color: 0xee88ff, width: 1.5, alpha: lifeRatio * 0.55 });
      }

      // Void center — dark hole
      g.circle(portal.x, portal.y, pr * 0.52).fill({ color: 0x050008, alpha: lifeRatio * 0.95 });
      g.circle(portal.x, portal.y, pr * 0.35).fill({ color: 0x020005, alpha: 1 });

      // Portal ring solid fill (the glowing band)
      g.circle(portal.x, portal.y, pr * pulse).stroke({ color: 0x8822ee, width: 4, alpha: lifeRatio * (0.6 + Math.sin(t * 4 + portal.id) * 0.2) });
      g.circle(portal.x, portal.y, pr * pulse * 1.06).stroke({ color: 0x6611cc, width: 2, alpha: lifeRatio * 0.35 });

      // Spiral particles sucking inward
      for (let pi = 0; pi < 8; pi++) {
        const pAngle = t * 4 + pi * Math.PI / 4 + portal.id * 0.7;
        const pDist = pr * 1.25 - ((t * 25 + pi * 14) % (pr * 1.0));
        const spiralOffset = (t * 4 + pi * 0.5) * 0.6;
        const pSpiralAngle = pAngle + spiralOffset;
        const px2 = portal.x + Math.cos(pSpiralAngle) * pDist;
        const py2 = portal.y + Math.sin(pSpiralAngle) * pDist;
        const pAlpha = (1 - pDist / (pr * 1.25)) * lifeRatio * 0.8;
        g.circle(px2, py2, 1.5).fill({ color: 0xaa66ff, alpha: pAlpha });
        g.circle(px2, py2, 3).fill({ color: 0x8844ff, alpha: pAlpha * 0.3 });
      }

      // Energy wisps rising from portal
      for (let wi = 0; wi < 5; wi++) {
        const wAngle = t * 2 + wi * Math.PI * 2 / 5;
        const wDist = pr * 0.4 + (t * 10 + wi * 13) % (pr * 0.5);
        const wY = portal.y - ((t * 15 + wi * 11) % 15);
        const wAlpha = Math.max(0, lifeRatio * 0.3 - ((t * 15 + wi * 11) % 15) * 0.02);
        g.circle(portal.x + Math.cos(wAngle) * wDist, wY, 1.2)
          .fill({ color: 0xcc88ff, alpha: wAlpha });
      }

      // Void rune symbols orbiting
      for (let ri2 = 0; ri2 < 6; ri2++) {
        const runeA = t * 0.8 + ri2 * Math.PI / 3;
        const runeR = pr * 1.15;
        const rx2 = portal.x + Math.cos(runeA) * runeR;
        const ry2 = portal.y + Math.sin(runeA) * runeR;
        // Small diamond rune
        const rs = 3;
        const runeRot = t * 0.5 + ri2;
        for (let rv = 0; rv < 4; rv++) {
          const a1 = runeRot + rv * Math.PI / 2;
          const a2 = runeRot + (rv + 1) * Math.PI / 2;
          g.moveTo(rx2 + Math.cos(a1) * rs, ry2 + Math.sin(a1) * rs)
            .lineTo(rx2 + Math.cos(a2) * rs, ry2 + Math.sin(a2) * rs)
            .stroke({ color: 0x9944ff, width: 0.8, alpha: lifeRatio * 0.35 });
        }
      }

      // Portal number label
      const numAlpha = lifeRatio * 0.9;
      g.circle(portal.x, portal.y - pr - 10, 7).fill({ color: 0x330066, alpha: numAlpha * 0.8 });
      g.circle(portal.x, portal.y - pr - 10, 7).stroke({ color: 0x9944ff, width: 1, alpha: numAlpha * 0.7 });

      // Fade out warning (last 3 seconds)
      if (portal.life < 3) {
        const warnPulse = Math.sin(t * 8) * 0.5 + 0.5;
        g.circle(portal.x, portal.y, pr * 1.1).stroke({ color: 0xff4444, width: 2, alpha: warnPulse * lifeRatio * 0.4 });
      }
    }

    // Connection line between paired portals
    if (state.portals.length === 2) {
      const p1 = state.portals[0], p2 = state.portals[1];
      const t2 = state.time;
      const connAlpha = Math.min(p1.life / p1.maxLife, p2.life / p2.maxLife) * 0.18;
      // Wide glow line
      g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y)
        .stroke({ color: 0x330066, width: 6, alpha: connAlpha * 0.3 });
      // Core lines
      g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y)
        .stroke({ color: 0x6622cc, width: 2.5, alpha: connAlpha + Math.sin(t2 * 3) * 0.04 });
      g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y)
        .stroke({ color: 0x9944ff, width: 1, alpha: connAlpha * 0.7 });
      // Traveling particles along connection (more + varied)
      for (let ci = 0; ci < 6; ci++) {
        const progress = (t2 * 0.8 + ci * (1 / 6)) % 1;
        const cx2 = p1.x + (p2.x - p1.x) * progress;
        const cy2 = p1.y + (p2.y - p1.y) * progress;
        const pSize = 1 + Math.sin(t2 * 4 + ci * 2) * 0.5;
        g.circle(cx2, cy2, pSize).fill({ color: 0xaa66ff, alpha: connAlpha * 2.5 });
        g.circle(cx2, cy2, pSize * 2.5).fill({ color: 0x6622cc, alpha: connAlpha * 0.5 });
      }
      // Midpoint energy node
      const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
      g.circle(midX, midY, 3 + Math.sin(t2 * 3) * 1).fill({ color: 0x9944ff, alpha: connAlpha * 2 });
      g.circle(midX, midY, 6).fill({ color: 0x6622cc, alpha: connAlpha * 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // Player — dark hooded void walker
  // ---------------------------------------------------------------------------
  private _drawPlayer(g: Graphics, state: VWState): void {
    const { playerX: px, playerY: py, playerRadius: r, aimAngle, invulnTimer, dashing } = state;
    if (invulnTimer > 0 && Math.floor(invulnTimer * 12) % 2 === 0) return;

    const t = state.time;
    const voidColor = VW.COLOR_VOID;

    // Position trail — faint dots showing recent movement
    const history = 8;
    const trailSpacing = 0.08;
    for (let hi = 1; hi <= history; hi++) {
      const trAlpha = (1 - hi / history) * 0.1;
      const trDist = hi * 4;
      const trX = px - Math.cos(state.moveAngle) * trDist;
      const trY = py - Math.sin(state.moveAngle) * trDist;
      g.circle(trX, trY, Math.max(1, r * 0.25 * (1 - hi / history)))
        .fill({ color: 0x4422aa, alpha: trAlpha });
    }
    void trailSpacing;

    // Dash afterimages
    if (dashing) {
      for (let i = 1; i <= 6; i++) {
        const tx = px - Math.cos(state.dashAngle) * i * 7;
        const ty = py - Math.sin(state.dashAngle) * i * 7;
        const trAlpha = (1 - i / 6) * 0.22;
        const trR = r * (1 - i * 0.12);
        // Full afterimage body
        g.circle(tx, ty, trR).fill({ color: 0x3300aa, alpha: trAlpha * 0.8 });
        g.circle(tx, ty, trR * 0.65).fill({ color: 0x4400cc, alpha: trAlpha * 0.5 });
        // Afterimage hood
        const hoodA = state.dashAngle - Math.PI / 2;
        g.moveTo(tx + Math.cos(hoodA - 0.35) * trR, ty + Math.sin(hoodA - 0.35) * trR)
          .lineTo(tx + Math.cos(hoodA) * (trR + trR * 0.5), ty + Math.sin(hoodA) * (trR + trR * 0.5))
          .lineTo(tx + Math.cos(hoodA + 0.35) * trR, ty + Math.sin(hoodA + 0.35) * trR)
          .closePath().fill({ color: 0x1a0044, alpha: trAlpha * 0.7 });
      }
      // Void slash marks along dash path
      for (let si = 0; si < 3; si++) {
        const sOff = si * 12 + 6;
        const sx = px - Math.cos(state.dashAngle) * sOff;
        const sy = py - Math.sin(state.dashAngle) * sOff;
        const perpA = state.dashAngle + Math.PI / 2;
        g.moveTo(sx + Math.cos(perpA) * 6, sy + Math.sin(perpA) * 6)
          .lineTo(sx - Math.cos(perpA) * 6, sy - Math.sin(perpA) * 6)
          .stroke({ color: 0x9944ff, width: 1.5, alpha: 0.3 - si * 0.08 });
      }
    }

    // Shadow storm aura
    if (state.stormActive) {
      const stormPulse = 0.3 + Math.sin(t * 8) * 0.15;
      g.circle(px, py, r + 20 + Math.sin(t * 6) * 4).fill({ color: 0x330066, alpha: stormPulse * 0.4 });
      for (let si = 0; si < 6; si++) {
        const sa = t * 5 + si * Math.PI / 3;
        const sd = r + 14 + Math.sin(t * 4 + si) * 3;
        g.circle(px + Math.cos(sa) * sd, py + Math.sin(sa) * sd, 2.5).fill({ color: 0x9944ff, alpha: stormPulse });
      }
      // Storm energy crackling
      for (let ci = 0; ci < 4; ci++) {
        const ca = t * 12 + ci * Math.PI / 2;
        const cLen = r + 12 + Math.random() * 6;
        g.moveTo(px, py)
          .lineTo(px + Math.cos(ca) * cLen, py + Math.sin(ca) * cLen)
          .stroke({ color: 0xcc88ff, width: 1, alpha: 0.25 + Math.random() * 0.15 });
      }
    }

    // Player shadow
    g.ellipse(px + 2, py + 4, r * 1.1, r * 0.45).fill({ color: 0x000000, alpha: 0.25 });

    // Void energy aura layers
    g.circle(px, py, r + 12).fill({ color: voidColor, alpha: 0.03 + Math.sin(t * 2.2) * 0.01 });
    g.circle(px, py, r + 7).fill({ color: voidColor, alpha: 0.08 + Math.sin(t * 3.2) * 0.02 });
    g.circle(px, py, r + 3).fill({ color: voidColor, alpha: 0.14 });

    // Shadow cloak flowing behind — multi-layered with wisps
    const cloakAngle = aimAngle + Math.PI;
    const cloakSwing = Math.sin(t * 3.5) * 0.3;
    // Outer cloak layer — wide flowing
    g.moveTo(px + Math.cos(cloakAngle - 0.8 + cloakSwing) * (r + 16), py + Math.sin(cloakAngle - 0.8 + cloakSwing) * (r + 16))
      .lineTo(px + Math.cos(cloakAngle + cloakSwing) * (r + 22), py + Math.sin(cloakAngle + cloakSwing) * (r + 22))
      .lineTo(px + Math.cos(cloakAngle + 0.8 + cloakSwing) * (r + 16), py + Math.sin(cloakAngle + 0.8 + cloakSwing) * (r + 16))
      .closePath().fill({ color: 0x0d001a, alpha: 0.65 });
    // Mid cloak layer
    g.moveTo(px + Math.cos(cloakAngle - 0.55 + cloakSwing * 0.7) * (r + 10), py + Math.sin(cloakAngle - 0.55 + cloakSwing * 0.7) * (r + 10))
      .lineTo(px + Math.cos(cloakAngle + cloakSwing * 0.7) * (r + 18), py + Math.sin(cloakAngle + cloakSwing * 0.7) * (r + 18))
      .lineTo(px + Math.cos(cloakAngle + 0.55 + cloakSwing * 0.7) * (r + 10), py + Math.sin(cloakAngle + 0.55 + cloakSwing * 0.7) * (r + 10))
      .closePath().fill({ color: 0x1a003a, alpha: 0.55 });
    // Inner cloak layer
    g.moveTo(px + Math.cos(cloakAngle - 0.3 + cloakSwing * 0.4) * (r + 6), py + Math.sin(cloakAngle - 0.3 + cloakSwing * 0.4) * (r + 6))
      .lineTo(px + Math.cos(cloakAngle + cloakSwing * 0.4) * (r + 13), py + Math.sin(cloakAngle + cloakSwing * 0.4) * (r + 13))
      .lineTo(px + Math.cos(cloakAngle + 0.3 + cloakSwing * 0.4) * (r + 6), py + Math.sin(cloakAngle + 0.3 + cloakSwing * 0.4) * (r + 6))
      .closePath().fill({ color: 0x220044, alpha: 0.4 });
    // Cloak wisps — small trailing particles from cloak edges
    for (let cw = 0; cw < 3; cw++) {
      const cwAngle = cloakAngle + (cw - 1) * 0.5 + cloakSwing + Math.sin(t * 4 + cw * 2) * 0.15;
      const cwDist = r + 16 + cw * 3 + Math.sin(t * 3 + cw) * 2;
      g.circle(px + Math.cos(cwAngle) * cwDist, py + Math.sin(cwAngle) * cwDist, 1.5)
        .fill({ color: 0x6622cc, alpha: 0.2 - cw * 0.05 });
    }

    // Hooded body — layered void robes
    g.circle(px, py, r + 1).fill({ color: 0x0a0015, alpha: 0.5 });
    g.circle(px, py, r).fill({ color: 0x160028 });
    g.circle(px, py, r * 0.78).fill({ color: 0x1e0038, alpha: 0.7 });
    g.circle(px, py, r * 0.5).fill({ color: 0x280048, alpha: 0.5 });
    // Robe hem arcs
    for (let rl = 0; rl < 3; rl++) {
      const rimR = r * (0.6 + rl * 0.12);
      g.arc(px, py, rimR, Math.PI * 0.5 + rl * 0.15, Math.PI * 1.5 - rl * 0.15)
        .stroke({ color: 0x4422aa, width: 0.8, alpha: 0.2 });
    }
    // Hood toward aim direction — multi-layer
    const hoodAngle = aimAngle - Math.PI / 2;
    g.moveTo(px + Math.cos(hoodAngle - 0.5) * r, py + Math.sin(hoodAngle - 0.5) * r)
      .lineTo(px + Math.cos(hoodAngle) * (r + r * 0.8), py + Math.sin(hoodAngle) * (r + r * 0.8))
      .lineTo(px + Math.cos(hoodAngle + 0.5) * r, py + Math.sin(hoodAngle + 0.5) * r)
      .closePath().fill({ color: 0x0a0018, alpha: 0.95 });
    // Hood mid layer
    g.moveTo(px + Math.cos(hoodAngle - 0.32) * r * 0.9, py + Math.sin(hoodAngle - 0.32) * r * 0.9)
      .lineTo(px + Math.cos(hoodAngle) * (r + r * 0.55), py + Math.sin(hoodAngle) * (r + r * 0.55))
      .lineTo(px + Math.cos(hoodAngle + 0.32) * r * 0.9, py + Math.sin(hoodAngle + 0.32) * r * 0.9)
      .closePath().fill({ color: 0x120025, alpha: 0.5 });
    // Face shadow
    g.circle(px + Math.cos(aimAngle) * r * 0.1, py + Math.sin(aimAngle) * r * 0.1, r * 0.4)
      .fill({ color: 0x000000, alpha: 0.35 });

    // Glowing purple eyes (in direction of aim)
    const eyeOffX = Math.cos(aimAngle) * r * 0.25;
    const eyeOffY = Math.sin(aimAngle) * r * 0.25;
    const perpX = -Math.sin(aimAngle) * r * 0.25;
    const perpY = Math.cos(aimAngle) * r * 0.25;
    const eyePulse = 0.85 + Math.sin(t * 4) * 0.15;
    g.circle(px + eyeOffX + perpX, py + eyeOffY + perpY, 2.5).fill({ color: 0xcc44ff, alpha: eyePulse });
    g.circle(px + eyeOffX - perpX, py + eyeOffY - perpY, 2.5).fill({ color: 0xcc44ff, alpha: eyePulse });
    g.circle(px + eyeOffX + perpX, py + eyeOffY + perpY, 4.5).fill({ color: 0x9933ee, alpha: eyePulse * 0.2 });
    g.circle(px + eyeOffX - perpX, py + eyeOffY - perpY, 4.5).fill({ color: 0x9933ee, alpha: eyePulse * 0.2 });

    // Void bolt aim indicator
    const aimLen = r + 14;
    g.moveTo(px + Math.cos(aimAngle) * (r + 2), py + Math.sin(aimAngle) * (r + 2))
      .lineTo(px + Math.cos(aimAngle) * aimLen, py + Math.sin(aimAngle) * aimLen)
      .stroke({ color: 0x9944ff, width: 1.5, alpha: 0.35 });
    g.circle(px + Math.cos(aimAngle) * aimLen, py + Math.sin(aimAngle) * aimLen, 2)
      .fill({ color: 0xcc66ff, alpha: 0.5 });

    // Void energy tendrils flowing from player
    for (let ti = 0; ti < 3; ti++) {
      const tendrilAngle = aimAngle + Math.PI + (ti - 1) * 0.6 + Math.sin(t * 2 + ti * 1.5) * 0.3;
      const tendrilLen = r * 2.5 + Math.sin(t * 3 + ti) * r * 0.5;
      let prevTX = px, prevTY = py;
      for (let seg = 1; seg <= 5; seg++) {
        const segFrac = seg / 5;
        const segLen = tendrilLen * segFrac;
        const wobble = Math.sin(t * 4 + ti * 2 + seg * 1.5) * 5 * segFrac;
        const perpA = tendrilAngle + Math.PI / 2;
        const nx = px + Math.cos(tendrilAngle) * segLen + Math.cos(perpA) * wobble;
        const ny = py + Math.sin(tendrilAngle) * segLen + Math.sin(perpA) * wobble;
        const segAlpha = (1 - segFrac) * 0.18;
        g.moveTo(prevTX, prevTY).lineTo(nx, ny)
          .stroke({ color: 0x6622cc, width: 1.5 * (1 - segFrac * 0.6), alpha: segAlpha });
        prevTX = nx; prevTY = ny;
      }
    }

    // Orbiting void symbols
    for (let oi = 0; oi < 4; oi++) {
      const orbitAngle = t * 1.2 + oi * Math.PI / 2;
      const orbitDist = r + 15 + Math.sin(t * 2 + oi) * 2;
      const ox = px + Math.cos(orbitAngle) * orbitDist;
      const oy = py + Math.sin(orbitAngle) * orbitDist;
      g.circle(ox, oy, 2).fill({ color: 0x9944ff, alpha: 0.4 + Math.sin(t * 3 + oi) * 0.15 });
      g.circle(ox, oy, 4).fill({ color: 0x6622cc, alpha: 0.08 });
    }

    // HP bar below player
    const hpW = r * 3.0, hpH = 4;
    const hpBarX = px - hpW / 2, hpBarY = py + r + 10;
    g.rect(hpBarX - 1, hpBarY - 1, hpW + 2, hpH + 2).fill({ color: 0x000000, alpha: 0.65 });
    const hpPct = state.playerHP / state.maxHP;
    const hpColor = hpPct > 0.5 ? 0x8844ff : hpPct > 0.25 ? 0xcc6622 : 0xff2244;
    g.rect(hpBarX, hpBarY, hpW * hpPct, hpH).fill({ color: hpColor, alpha: 0.85 });
    g.rect(hpBarX, hpBarY, hpW * hpPct, hpH * 0.35).fill({ color: 0xffffff, alpha: 0.12 });
    for (let hi = 1; hi < state.maxHP; hi++) {
      const segX = hpBarX + (hpW * hi / state.maxHP);
      g.moveTo(segX, hpBarY).lineTo(segX, hpBarY + hpH).stroke({ color: 0x000000, width: 1, alpha: 0.5 });
    }
    g.rect(hpBarX - 1, hpBarY - 1, hpW + 2, hpH + 2).stroke({ color: 0x440088, width: 0.8, alpha: 0.6 });
    if (hpPct <= 0.25 && hpPct > 0) {
      g.rect(hpBarX, hpBarY, hpW * hpPct, hpH).fill({ color: 0xff0000, alpha: 0.08 + Math.sin(t * 6) * 0.05 });
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies — cultist, dark archer, void golem, phase stalker, warlock
  // ---------------------------------------------------------------------------
  private _drawEnemies(g: Graphics, state: VWState): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (e.spawnTimer > 0) {
        const prog = e.spawnTimer / 0.3;
        const portalR = e.radius * 2;
        g.circle(e.x, e.y, portalR + 3).fill({ color: 0x220044, alpha: prog * 0.08 });
        g.circle(e.x, e.y, portalR).fill({ color: 0x6622cc, alpha: prog * 0.2 });
        for (let si = 0; si < 10; si++) {
          const a1 = state.time * 5 + si * Math.PI / 5;
          const a2 = state.time * 5 + (si + 0.7) * Math.PI / 5;
          g.moveTo(e.x + Math.cos(a1) * portalR, e.y + Math.sin(a1) * portalR)
            .lineTo(e.x + Math.cos(a2) * portalR, e.y + Math.sin(a2) * portalR)
            .stroke({ color: 0x8844ff, width: 2, alpha: prog * 0.6 });
        }
        g.circle(e.x, e.y, portalR * 0.3).fill({ color: 0xaa66ff, alpha: prog * 0.3 });
        continue;
      }

      // Shadow
      g.ellipse(e.x + 1, e.y + 2, e.radius * 0.9, e.radius * 0.35).fill({ color: 0x000000, alpha: 0.15 });

      // Stun ring
      if (e.stunTimer > 0) {
        // Stun stars orbiting
        g.circle(e.x, e.y, e.radius + 5).stroke({ color: 0xffee44, alpha: 0.6, width: 2 });
        for (let si = 0; si < 3; si++) {
          const sa = t * 5 + si * Math.PI * 2 / 3;
          const sd = e.radius + 6;
          g.circle(e.x + Math.cos(sa) * sd, e.y + Math.sin(sa) * sd, 1.5)
            .fill({ color: 0xffee44, alpha: 0.7 });
        }
        // Void fracture lines
        for (let fi2 = 0; fi2 < 4; fi2++) {
          const fa2 = t * 2 + fi2 * Math.PI / 2;
          g.moveTo(e.x + Math.cos(fa2) * e.radius * 0.3, e.y + Math.sin(fa2) * e.radius * 0.3)
            .lineTo(e.x + Math.cos(fa2) * (e.radius + 4), e.y + Math.sin(fa2) * (e.radius + 4))
            .stroke({ color: 0xddcc44, width: 1, alpha: 0.35 });
        }
      }
      // Elite gold border
      if (e.elite) {
        g.circle(e.x, e.y, e.radius + 6).fill({ color: 0xffd700, alpha: 0.04 + Math.sin(t * 3) * 0.02 });
        g.circle(e.x, e.y, e.radius + 4).stroke({ color: 0xffd700, width: 2, alpha: 0.7 + Math.sin(t * 3) * 0.15 });
        // Crown marker above
        g.moveTo(e.x - 4, e.y - e.radius - 8).lineTo(e.x, e.y - e.radius - 13).lineTo(e.x + 4, e.y - e.radius - 8)
          .closePath().fill({ color: 0xffd700, alpha: 0.55 });
      }
      const flashAlpha = e.flashTimer > 0 ? 0.8 : 1;

      if (e.kind === "cultist") {
        // Shadow
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.9, e.radius * 0.35).fill({ color: 0x000000, alpha: 0.15 });
        // Red robe body
        g.circle(e.x, e.y, e.radius + 1).fill({ color: 0x3a0808, alpha: flashAlpha * 0.4 });
        g.ellipse(e.x, e.y + e.radius * 0.25, e.radius * 0.85, e.radius * 1.1).fill({ color: 0x660a0a, alpha: flashAlpha });
        g.ellipse(e.x, e.y + e.radius * 0.25, e.radius * 0.55, e.radius * 0.75).fill({ color: 0x881212, alpha: flashAlpha * 0.5 });
        // Hood
        g.moveTo(e.x - e.radius * 0.5, e.y - e.radius * 0.3)
          .lineTo(e.x, e.y - e.radius * 1.25)
          .lineTo(e.x + e.radius * 0.5, e.y - e.radius * 0.3)
          .closePath().fill({ color: 0x440606, alpha: flashAlpha * 0.9 });
        // Glowing void eyes
        g.circle(e.x - e.radius * 0.18, e.y - e.radius * 0.35, 1.5).fill({ color: 0xcc2222, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.18, e.y - e.radius * 0.35, 1.5).fill({ color: 0xcc2222, alpha: flashAlpha * 0.9 });
        // Ritual knife
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x + Math.cos(toP) * e.radius * 0.5, e.y + Math.sin(toP) * e.radius * 0.5)
          .lineTo(e.x + Math.cos(toP) * (e.radius + 8), e.y + Math.sin(toP) * (e.radius + 8))
          .stroke({ color: 0x888888, width: 1.5, alpha: flashAlpha * 0.7 });
        // Blood rune marks on robe
        g.circle(e.x, e.y + e.radius * 0.2, e.radius * 0.3).stroke({ color: 0xaa2222, width: 0.8, alpha: flashAlpha * 0.35 });
        // Faint cult aura
        g.circle(e.x, e.y, e.radius + 4).fill({ color: 0x660000, alpha: flashAlpha * 0.04 + Math.sin(t * 2 + e.x * 0.1) * 0.02 });

      } else if (e.kind === "dark_archer") {
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.9, e.radius * 0.35).fill({ color: 0x000000, alpha: 0.15 });
        // Dark robe with bow
        g.circle(e.x, e.y, e.radius + 1).fill({ color: 0x1a1a2a, alpha: flashAlpha * 0.4 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x2a2a3a, alpha: flashAlpha });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0x3a3a4a, alpha: flashAlpha * 0.5 });
        // Dark hood triangle
        g.moveTo(e.x - e.radius * 0.4, e.y - e.radius * 0.6)
          .lineTo(e.x, e.y - e.radius * 1.3)
          .lineTo(e.x + e.radius * 0.4, e.y - e.radius * 0.6)
          .closePath().fill({ color: 0x1a1a2a, alpha: flashAlpha * 0.85 });
        // Cold blue eyes
        g.circle(e.x - e.radius * 0.2, e.y - e.radius * 0.2, 1.5).fill({ color: 0x4488cc, alpha: flashAlpha });
        g.circle(e.x + e.radius * 0.2, e.y - e.radius * 0.2, 1.5).fill({ color: 0x4488cc, alpha: flashAlpha });
        // Dark bow
        const toP2 = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        const bowR2 = e.radius + 8;
        const bL = toP2 - 0.65, bR = toP2 + 0.65;
        const blx2 = e.x + Math.cos(bL) * bowR2, bly2 = e.y + Math.sin(bL) * bowR2;
        const brx2 = e.x + Math.cos(bR) * bowR2, bry2 = e.y + Math.sin(bR) * bowR2;
        const bmx2 = e.x + Math.cos(toP2) * (bowR2 + 3), bmy2 = e.y + Math.sin(toP2) * (bowR2 + 3);
        g.moveTo(blx2, bly2).lineTo(bmx2, bmy2).stroke({ color: 0x331155, width: 2, alpha: flashAlpha * 0.8 });
        g.moveTo(brx2, bry2).lineTo(bmx2, bmy2).stroke({ color: 0x331155, width: 2, alpha: flashAlpha * 0.8 });
        g.moveTo(blx2, bly2).lineTo(brx2, bry2).stroke({ color: 0x888899, width: 0.8, alpha: flashAlpha * 0.6 });
        // Nocked arrow when about to fire
        if (e.fireTimer < 0.6 && e.fireTimer > 0) {
          const nockProg = 1 - e.fireTimer / 0.6;
          const nockX = e.x + Math.cos(toP2) * (bowR2 + 3);
          const nockY = e.y + Math.sin(toP2) * (bowR2 + 3);
          g.circle(nockX, nockY, 2 + nockProg * 2).fill({ color: 0x6644cc, alpha: 0.4 + nockProg * 0.4 });
          g.moveTo(e.x, e.y)
            .lineTo(e.x + Math.cos(toP2) * (bowR2 + 8 + nockProg * 5), e.y + Math.sin(toP2) * (bowR2 + 8 + nockProg * 5))
            .stroke({ color: 0x6644cc, width: 1, alpha: nockProg * 0.4 });
        }

      } else if (e.kind === "void_golem") {
        g.ellipse(e.x + 2, e.y + 4, e.radius * 1.1, e.radius * 0.4).fill({ color: 0x000000, alpha: 0.2 });
        // Large stone/purple body
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x2a1a3a, alpha: flashAlpha * 0.4 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x3a2a4a, alpha: flashAlpha });
        g.circle(e.x, e.y, e.radius * 0.7).fill({ color: 0x4a3a5a, alpha: flashAlpha * 0.6 });
        // Stone texture lines
        g.moveTo(e.x - e.radius * 0.6, e.y - e.radius * 0.3)
          .lineTo(e.x + e.radius * 0.4, e.y - e.radius * 0.15)
          .stroke({ color: 0x2a1a40, width: 2, alpha: flashAlpha * 0.6 });
        g.moveTo(e.x - e.radius * 0.4, e.y + e.radius * 0.2)
          .lineTo(e.x + e.radius * 0.5, e.y + e.radius * 0.1)
          .stroke({ color: 0x2a1a40, width: 1.5, alpha: flashAlpha * 0.5 });
        // Purple void crack veins
        g.moveTo(e.x, e.y - e.radius * 0.8).lineTo(e.x + e.radius * 0.4, e.y + e.radius * 0.5)
          .stroke({ color: 0x9944ff, width: 1.5, alpha: flashAlpha * (0.4 + Math.sin(t * 3) * 0.2) });
        g.moveTo(e.x - e.radius * 0.5, e.y - e.radius * 0.2).lineTo(e.x + e.radius * 0.2, e.y + e.radius * 0.7)
          .stroke({ color: 0x7722cc, width: 1, alpha: flashAlpha * 0.35 });
        // Glowing void eye (single center)
        g.circle(e.x, e.y, 4).fill({ color: 0x000000, alpha: flashAlpha });
        g.circle(e.x, e.y, 2.5).fill({ color: 0x9944ff, alpha: flashAlpha * (0.7 + Math.sin(t * 4) * 0.2) });
        g.circle(e.x, e.y, 5).fill({ color: 0x6622cc, alpha: flashAlpha * 0.15 });
        // Ground tremor when attacking
        if (e.state === "attack") {
          g.circle(e.x, e.y, e.radius + 8 + Math.sin(state.time * 15) * 3)
            .stroke({ color: 0x6622cc, width: 2, alpha: 0.3 });
        }
        // Void energy pulsing through cracks
        const crackPulse = 0.3 + Math.sin(t * 4 + e.x * 0.1) * 0.15;
        g.circle(e.x, e.y, e.radius * 0.85).stroke({ color: 0x6622cc, width: 1, alpha: flashAlpha * crackPulse * 0.2 });

      } else if (e.kind === "phase_stalker") {
        const flicker = 0.4 + Math.sin(t * 9 + e.x * 0.15) * 0.35;
        // Afterimage trails
        for (let tr = 1; tr <= 3; tr++) {
          const trA = t * 2.5 + tr * 0.9;
          const trOff = tr * 6;
          g.circle(e.x - Math.cos(trA) * trOff, e.y - Math.sin(trA) * trOff, e.radius * (1 - tr * 0.22))
            .fill({ color: 0x330066, alpha: 0.07 * (1 - tr * 0.25) });
        }
        g.ellipse(e.x + 1, e.y + 2, e.radius * 0.8, e.radius * 0.3).fill({ color: 0x000000, alpha: 0.1 });
        // Flickering shadow body
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x110033, alpha: flashAlpha * flicker * 0.35 });
        g.circle(e.x, e.y, e.radius).fill({ color: 0x220055, alpha: flashAlpha * flicker });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0x330066, alpha: flashAlpha * flicker * 0.55 });
        // Void shimmer outline
        g.circle(e.x, e.y, e.radius + 3).stroke({ color: 0x7744cc, width: 1, alpha: flicker * 0.4 + Math.sin(t * 6) * 0.1 });
        // Phase eyes
        g.circle(e.x - e.radius * 0.22, e.y - e.radius * 0.15, 2).fill({ color: 0xdd44ff, alpha: flashAlpha * flicker });
        g.circle(e.x + e.radius * 0.22, e.y - e.radius * 0.15, 2).fill({ color: 0xdd44ff, alpha: flashAlpha * flicker });
        // Void wisps trailing behind
        for (let wi = 0; wi < 3; wi++) {
          const wAngle = Math.PI * 0.5 + (wi - 1) * 0.4 + Math.sin(t * 3 + wi) * 0.2;
          let prevWX = e.x, prevWY = e.y + e.radius * 0.3;
          for (let seg = 1; seg <= 3; seg++) {
            const segFrac = seg / 3;
            const wx = prevWX + Math.cos(wAngle) * 5 + Math.sin(t * 5 + wi + seg) * 2;
            const wy = prevWY + Math.sin(wAngle) * 5;
            g.moveTo(prevWX, prevWY).lineTo(wx, wy)
              .stroke({ color: 0x5522aa, width: 1.2 * (1 - segFrac * 0.5), alpha: flicker * (1 - segFrac) * 0.3 });
            prevWX = wx; prevWY = wy;
          }
        }

      } else if (e.kind === "warlock") {
        g.ellipse(e.x + 1, e.y + 3, e.radius * 0.8, e.radius * 0.3).fill({ color: 0x000000, alpha: 0.15 });
        // Dark robe body
        g.circle(e.x, e.y, e.radius + 6).fill({ color: 0x0d0022, alpha: flashAlpha * 0.15 + Math.sin(t * 2) * 0.04 });
        g.ellipse(e.x, e.y + e.radius * 0.3, e.radius * 0.85, e.radius * 1.2).fill({ color: 0x150028, alpha: flashAlpha });
        g.ellipse(e.x, e.y + e.radius * 0.3, e.radius * 0.55, e.radius * 0.85).fill({ color: 0x220044, alpha: flashAlpha * 0.6 });
        // Dark hood
        g.moveTo(e.x - e.radius * 0.5, e.y - e.radius * 0.3)
          .lineTo(e.x, e.y - e.radius * 1.35)
          .lineTo(e.x + e.radius * 0.5, e.y - e.radius * 0.3)
          .closePath().fill({ color: 0x0d0018, alpha: flashAlpha * 0.9 });
        // Face shadow
        g.circle(e.x, e.y - e.radius * 0.4, e.radius * 0.35).fill({ color: 0x000000, alpha: flashAlpha * 0.35 });
        // Void eyes
        g.circle(e.x - e.radius * 0.15, e.y - e.radius * 0.4, 1.5).fill({ color: 0xaa22ff, alpha: flashAlpha * 0.9 });
        g.circle(e.x + e.radius * 0.15, e.y - e.radius * 0.4, 1.5).fill({ color: 0xaa22ff, alpha: flashAlpha * 0.9 });
        g.circle(e.x - e.radius * 0.15, e.y - e.radius * 0.4, 3).fill({ color: 0x8800ff, alpha: flashAlpha * 0.12 });
        g.circle(e.x + e.radius * 0.15, e.y - e.radius * 0.4, 3).fill({ color: 0x8800ff, alpha: flashAlpha * 0.12 });
        // Void staff
        g.moveTo(e.x - e.radius * 1.2, e.y + e.radius)
          .lineTo(e.x - e.radius * 1.1, e.y - e.radius * 0.3)
          .lineTo(e.x - e.radius * 1.35, e.y - e.radius * 1.5)
          .stroke({ color: 0x2a0055, width: 2.5, alpha: flashAlpha * 0.85 });
        // Staff orb — void crystal
        const orbPulse = 0.6 + Math.sin(t * 3.5 + e.x * 0.05) * 0.25;
        g.circle(e.x - e.radius * 1.35, e.y - e.radius * 1.5, e.radius * 0.4).fill({ color: 0x6622cc, alpha: flashAlpha * orbPulse });
        g.circle(e.x - e.radius * 1.35, e.y - e.radius * 1.5, e.radius * 0.55).fill({ color: 0x440099, alpha: flashAlpha * 0.15 });
        g.circle(e.x - e.radius * 1.35, e.y - e.radius * 1.5, e.radius * 0.2).fill({ color: 0xcc88ff, alpha: flashAlpha * orbPulse * 0.6 });
        // Energy tendrils from staff orb
        for (let eti = 0; eti < 3; eti++) {
          const ea = t * 2 + eti * Math.PI * 2 / 3;
          const eLen = e.radius * 0.5 + Math.sin(t * 3 + eti) * e.radius * 0.2;
          g.moveTo(e.x - e.radius * 1.35, e.y - e.radius * 1.5)
            .lineTo(e.x - e.radius * 1.35 + Math.cos(ea) * eLen, e.y - e.radius * 1.5 + Math.sin(ea) * eLen)
            .stroke({ color: 0x8844ff, width: 1, alpha: flashAlpha * orbPulse * 0.3 });
        }
      }

      // Attack telegraph
      if (e.state === "attack" && e.stateTimer > 0) {
        const atkProg = 1 - e.stateTimer / 0.5;
        const atkAlpha = 0.3 + atkProg * 0.3;
        g.circle(e.x, e.y, e.radius + 5 + atkProg * 4).stroke({ color: 0xff2244, width: 2, alpha: atkAlpha });
        const toP = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toP) * (12 + atkProg * 8), e.y + Math.sin(toP) * (12 + atkProg * 8))
          .stroke({ color: 0xff4444, width: 1.5, alpha: atkAlpha * 0.5 });
      }

      // Dark archer fire telegraph
      if (e.kind === "dark_archer" && e.fireTimer < 0.5 && e.fireTimer > 0) {
        const fireProg = 1 - e.fireTimer / 0.5;
        const toP2 = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toP2) * (15 + fireProg * 12), e.y + Math.sin(toP2) * (15 + fireProg * 12))
          .stroke({ color: 0x4488cc, width: 1, alpha: 0.2 + fireProg * 0.3 });
        g.circle(e.x + Math.cos(toP2) * (e.radius + 3), e.y + Math.sin(toP2) * (e.radius + 3), 2 + fireProg * 2)
          .fill({ color: 0x4488cc, alpha: 0.3 + fireProg * 0.4 });
      }

      // Warlock summon telegraph
      if (e.kind === "warlock" && e.summonTimer < 1.0 && e.summonTimer > 0) {
        const sumProg = 1 - e.summonTimer / 1.0;
        g.circle(e.x, e.y, e.radius + 8 + sumProg * 5).stroke({ color: 0x8822ff, width: 1.5, alpha: sumProg * 0.4 });
        for (let ri2 = 0; ri2 < 4; ri2++) {
          const ra2 = state.time * 2 + ri2 * Math.PI / 2;
          g.circle(e.x + Math.cos(ra2) * (e.radius + 6 + sumProg * 3), e.y + Math.sin(ra2) * (e.radius + 6 + sumProg * 3), 1.5)
            .fill({ color: 0xaa44ff, alpha: sumProg * 0.5 });
        }
      }

      // Phase stalker teleport warning
      if (e.kind === "phase_stalker" && e.teleportTimer < 0.5 && e.teleportTimer > 0) {
        const teleProg = 1 - e.teleportTimer / 0.5;
        g.circle(e.x, e.y, e.radius + 8 + teleProg * 6).fill({ color: 0x6622cc, alpha: 0.1 + teleProg * 0.08 });
        g.circle(e.x, e.y, e.radius + 6 + teleProg * 5).stroke({ color: 0xaa44ff, width: 2, alpha: 0.3 + teleProg * 0.3 });
      }

      // HP bar
      const hpRatio = e.hp / e.maxHp;
      if (hpRatio < 1) {
        const bw = e.radius * 2.8, bh2 = 3.5;
        const bx2 = e.x - bw / 2, by2 = e.y - e.radius - 10;
        g.rect(bx2 - 1, by2 - 1, bw + 2, bh2 + 2).fill({ color: 0x000000, alpha: 0.7 });
        const ehpColor = hpRatio > 0.6 ? 0x8844ff : hpRatio > 0.3 ? 0xcc8822 : 0xcc2222;
        g.rect(bx2, by2, bw * hpRatio, bh2).fill({ color: ehpColor, alpha: 0.85 });
        g.rect(bx2, by2, bw * hpRatio, bh2 * 0.35).fill({ color: 0xffffff, alpha: 0.1 });
        g.rect(bx2 - 1, by2 - 1, bw + 2, bh2 + 2).stroke({ color: 0x220044, width: 0.5, alpha: 0.5 });
        if (e.elite) {
          g.moveTo(e.x - 4, by2 - 4).lineTo(e.x, by2 - 8).lineTo(e.x + 4, by2 - 4)
            .closePath().fill({ color: 0xffd700, alpha: 0.6 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boss
  // ---------------------------------------------------------------------------
  private _drawBoss(g: Graphics, state: VWState): void {
    const boss = state.boss;
    if (!boss || !boss.alive) return;
    const t = state.time;
    const flashAlpha = boss.flashTimer > 0 ? 0.75 : 1;
    const pulse = 0.8 + Math.sin(t * 2.5) * 0.2;

    // Boss outer aura
    g.circle(boss.x, boss.y, boss.radius * 1.6).fill({ color: 0x110022, alpha: 0.2 * pulse });
    g.circle(boss.x, boss.y, boss.radius * 1.3).fill({ color: 0x220044, alpha: 0.18 * pulse });

    if (boss.kind === "void_lord") {
      // Massive hooded void lord
      g.circle(boss.x, boss.y, boss.radius * 1.1).fill({ color: 0x0a0018, alpha: flashAlpha });
      g.circle(boss.x, boss.y, boss.radius * 0.75).fill({ color: 0x160030, alpha: flashAlpha * 0.7 });
      // Hood
      g.moveTo(boss.x - boss.radius * 0.6, boss.y - boss.radius * 0.5)
        .lineTo(boss.x, boss.y - boss.radius * 1.5)
        .lineTo(boss.x + boss.radius * 0.6, boss.y - boss.radius * 0.5)
        .closePath().fill({ color: 0x080012, alpha: flashAlpha * 0.95 });
      // Void crown
      for (let ci = 0; ci < 5; ci++) {
        const ca = -Math.PI / 2 + (ci - 2) * 0.4;
        g.moveTo(boss.x + Math.cos(ca) * boss.radius * 0.5, boss.y - boss.radius * 0.8)
          .lineTo(boss.x + Math.cos(ca) * boss.radius * 0.5, boss.y - boss.radius * (1.3 + Math.sin(t * 2 + ci) * 0.1))
          .stroke({ color: 0x9944ff, width: 2.5, alpha: flashAlpha * 0.8 });
        g.circle(boss.x + Math.cos(ca) * boss.radius * 0.5, boss.y - boss.radius * (1.3 + Math.sin(t * 2 + ci) * 0.1), 3)
          .fill({ color: 0xcc66ff, alpha: flashAlpha * 0.9 });
      }
      // Giant void eyes
      g.circle(boss.x - boss.radius * 0.25, boss.y - boss.radius * 0.3, 5).fill({ color: 0xcc44ff, alpha: flashAlpha * (0.8 + Math.sin(t * 4) * 0.2) });
      g.circle(boss.x + boss.radius * 0.25, boss.y - boss.radius * 0.3, 5).fill({ color: 0xcc44ff, alpha: flashAlpha * (0.8 + Math.sin(t * 4) * 0.2) });
      g.circle(boss.x - boss.radius * 0.25, boss.y - boss.radius * 0.3, 9).fill({ color: 0x9933ee, alpha: flashAlpha * 0.15 });
      g.circle(boss.x + boss.radius * 0.25, boss.y - boss.radius * 0.3, 9).fill({ color: 0x9933ee, alpha: flashAlpha * 0.15 });
      // Swirling void rings around boss
      for (let ri = 0; ri < 3; ri++) {
        const angle = t * (1.5 + ri * 0.8) + ri * Math.PI * 0.66;
        g.circle(boss.x + Math.cos(angle) * boss.radius * 1.1, boss.y + Math.sin(angle) * boss.radius * 1.1, 4)
          .fill({ color: 0x8844ff, alpha: 0.5 });
      }

    } else if (boss.kind === "portal_beast") {
      // Portal-infused creature — multi-layered with portal rings
      g.circle(boss.x, boss.y, boss.radius + 3).fill({ color: 0x0a001a, alpha: flashAlpha * 0.4 });
      g.circle(boss.x, boss.y, boss.radius).fill({ color: 0x180030, alpha: flashAlpha });
      g.circle(boss.x, boss.y, boss.radius * 0.75).fill({ color: 0x220044, alpha: flashAlpha * 0.6 });
      // Rotating portal rings on body
      g.circle(boss.x, boss.y, boss.radius * 0.85).stroke({ color: 0x8844ff, width: 3, alpha: flashAlpha * pulse * 0.7 });
      g.circle(boss.x, boss.y, boss.radius * 0.6).stroke({ color: 0xcc66ff, width: 2, alpha: flashAlpha * pulse * 0.5 });
      g.circle(boss.x, boss.y, boss.radius * 0.4).stroke({ color: 0xee88ff, width: 1.5, alpha: flashAlpha * pulse * 0.35 });
      // Portal apertures — mini void holes on body
      for (let ai = 0; ai < 4; ai++) {
        const aa = t * 1.5 + ai * Math.PI / 2;
        const ad = boss.radius * 0.6;
        const ax = boss.x + Math.cos(aa) * ad, ay = boss.y + Math.sin(aa) * ad;
        g.circle(ax, ay, 5).fill({ color: 0x050008, alpha: flashAlpha * 0.9 });
        g.circle(ax, ay, 5).stroke({ color: 0x9944ff, width: 1.5, alpha: flashAlpha * pulse * 0.6 });
        g.circle(ax, ay, 3).fill({ color: 0x220044, alpha: flashAlpha * 0.7 });
      }
      // Eyes — multiple
      g.circle(boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.2, 5).fill({ color: 0xff4488, alpha: flashAlpha });
      g.circle(boss.x + boss.radius * 0.3, boss.y - boss.radius * 0.2, 5).fill({ color: 0xff4488, alpha: flashAlpha });
      g.circle(boss.x, boss.y - boss.radius * 0.35, 4).fill({ color: 0xff4488, alpha: flashAlpha * 0.7 });
      // Eye glow
      g.circle(boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.2, 8).fill({ color: 0xff2266, alpha: flashAlpha * 0.12 });
      g.circle(boss.x + boss.radius * 0.3, boss.y - boss.radius * 0.2, 8).fill({ color: 0xff2266, alpha: flashAlpha * 0.12 });

    } else {
      // Shadow king — regal void entity
      g.circle(boss.x, boss.y, boss.radius + 4).fill({ color: 0x040008, alpha: flashAlpha * 0.5 });
      g.circle(boss.x, boss.y, boss.radius).fill({ color: 0x080015, alpha: flashAlpha });
      g.circle(boss.x, boss.y, boss.radius * 0.75).fill({ color: 0x100025, alpha: flashAlpha * 0.7 });
      // Shadow tendrils radiating outward
      for (let ri = 0; ri < 8; ri++) {
        const a = t * 3 + ri * Math.PI / 4;
        const tLen = boss.radius * (0.5 + Math.sin(t * 2 + ri) * 0.15);
        g.moveTo(boss.x + Math.cos(a) * boss.radius * 0.3, boss.y + Math.sin(a) * boss.radius * 0.3)
          .lineTo(boss.x + Math.cos(a) * (boss.radius + tLen), boss.y + Math.sin(a) * (boss.radius + tLen))
          .stroke({ color: 0x7733cc, width: 2, alpha: flashAlpha * (0.4 + Math.sin(t * 3 + ri) * 0.15) });
      }
      // Shadow crown
      for (let ci = 0; ci < 5; ci++) {
        const ca = -Math.PI / 2 + (ci - 2) * 0.35;
        const crownLen = boss.radius * (0.35 + Math.sin(t * 2.5 + ci) * 0.08);
        g.moveTo(boss.x + Math.cos(ca) * boss.radius * 0.6, boss.y - boss.radius * 0.7)
          .lineTo(boss.x + Math.cos(ca) * boss.radius * 0.6, boss.y - boss.radius * 0.7 - crownLen)
          .stroke({ color: 0xaa44ff, width: 2, alpha: flashAlpha * 0.7 });
        g.circle(boss.x + Math.cos(ca) * boss.radius * 0.6, boss.y - boss.radius * 0.7 - crownLen, 2.5)
          .fill({ color: 0xcc66ff, alpha: flashAlpha * 0.8 });
      }
      // Regal void eyes
      const toPlayer = Math.atan2(state.playerY - boss.y, state.playerX - boss.x);
      const eyeOff = Math.cos(toPlayer) * 2;
      g.circle(boss.x - boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 6).fill({ color: 0x000000, alpha: flashAlpha });
      g.circle(boss.x + boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 6).fill({ color: 0x000000, alpha: flashAlpha });
      g.circle(boss.x - boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 4).fill({ color: 0x9944ff, alpha: flashAlpha * (0.8 + Math.sin(t * 4) * 0.2) });
      g.circle(boss.x + boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 4).fill({ color: 0x9944ff, alpha: flashAlpha * (0.8 + Math.sin(t * 4) * 0.2) });
      g.circle(boss.x - boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 9).fill({ color: 0x6622cc, alpha: flashAlpha * 0.12 });
      g.circle(boss.x + boss.radius * 0.25 + eyeOff, boss.y - boss.radius * 0.2, 9).fill({ color: 0x6622cc, alpha: flashAlpha * 0.12 });
    }

    // Boss HP bar — wide, dramatic
    const bossHpRatio = boss.hp / boss.maxHp;
    const barW = Math.min(250, state.arenaW * 0.5);
    const barH = 10;
    const barX = state.arenaW / 2 - barW / 2;
    const barY = 28;
    // Background
    g.rect(barX - 2, barY - 2, barW + 4, barH + 4).fill({ color: 0x000000, alpha: 0.75 });
    g.rect(barX - 2, barY - 2, barW + 4, barH + 4).stroke({ color: 0x440077, width: 1.5, alpha: 0.7 });
    // HP fill
    const bossHpColor = bossHpRatio > 0.5 ? 0x9944ff : bossHpRatio > 0.25 ? 0xcc6622 : 0xff2244;
    g.rect(barX, barY, barW * bossHpRatio, barH).fill({ color: bossHpColor, alpha: 0.85 });
    // Highlight
    g.rect(barX, barY, barW * bossHpRatio, barH * 0.35).fill({ color: 0xffffff, alpha: 0.12 });
    // Border
    g.rect(barX, barY, barW, barH).stroke({ color: bossHpColor, width: 1, alpha: 0.4 });
    // Boss name indicator
    g.circle(barX + 6, barY + barH / 2, 3).fill({ color: bossHpColor, alpha: 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Projectiles — shadow bolts and enemy shots
  // ---------------------------------------------------------------------------
  private _drawProjectiles(g: Graphics, state: VWState): void {
    const t = state.time;
    for (const p of state.projectiles) {
      if (p.fromEnemy) {
        // Enemy projectile — void-tinted arrow with trail
        const eAngle = Math.atan2(p.vy, p.vx);
        // Motion trail
        for (let tr = 1; tr <= 4; tr++) {
          g.circle(p.x - Math.cos(eAngle) * tr * 4, p.y - Math.sin(eAngle) * tr * 4, p.radius * (1 - tr * 0.2))
            .fill({ color: 0x660022, alpha: 0.15 * (1 - tr * 0.22) });
        }
        // Outer glow
        g.circle(p.x, p.y, p.radius + 3).fill({ color: 0x880022, alpha: 0.15 });
        // Core
        g.circle(p.x, p.y, p.radius).fill({ color: 0xcc2233, alpha: 0.9 });
        g.circle(p.x, p.y, p.radius * 0.5).fill({ color: 0xff6666, alpha: 0.6 });
        // Shimmer ring
        g.circle(p.x, p.y, p.radius + 1.5).stroke({ color: 0xff4444, width: 1, alpha: 0.3 + Math.sin(t * 10 + p.x * 0.2) * 0.15 });
      } else {
        // Player shadow bolt — dark purple orb with void trail
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const boltAngle = Math.atan2(p.vy, p.vx);
        // Void trail
        for (let ti = 1; ti <= 4; ti++) {
          const tx = p.x - Math.cos(boltAngle) * ti * 5;
          const ty = p.y - Math.sin(boltAngle) * ti * 5;
          g.circle(tx, ty, p.radius * (1 - ti * 0.18)).fill({ color: 0x4400aa, alpha: 0.25 - ti * 0.05 });
        }
        // Void helix pattern
        const perpBX = -Math.sin(boltAngle), perpBY = Math.cos(boltAngle);
        for (let hi = 0; hi < 6; hi++) {
          const hDist = hi * 3.5;
          const hAngle = t * 10 + hi * 0.8;
          const hx = p.x - Math.cos(boltAngle) * hDist + perpBX * Math.cos(hAngle) * 2;
          const hy = p.y - Math.sin(boltAngle) * hDist + perpBY * Math.cos(hAngle) * 2;
          g.circle(hx, hy, 0.8).fill({ color: 0x6622cc, alpha: (1 - hi / 6) * 0.2 });
        }
        // Dark orb layers
        g.circle(p.x, p.y, p.radius + 4).fill({ color: 0x1a0033, alpha: 0.3 });
        g.circle(p.x, p.y, p.radius + 2).fill({ color: 0x330066, alpha: 0.5 });
        g.circle(p.x, p.y, p.radius).fill({ color: VW.COLOR_BOLT, alpha: 0.95 });
        g.circle(p.x, p.y, p.radius * 0.55).fill({ color: 0xcc88ff, alpha: 0.7 });
        // Void shimmer pulse
        const shimmer = 0.15 + Math.sin(t * 12 + p.x * 0.1) * 0.1;
        g.circle(p.x, p.y, p.radius + 3).stroke({ color: 0x9944ff, width: 1.5, alpha: shimmer });
        // Homing bolt special visual
        if (p.homing) {
          g.circle(p.x, p.y, p.radius + 6).stroke({ color: 0xcc66ff, width: 1.5, alpha: 0.25 + Math.sin(t * 8) * 0.12 });
          g.circle(p.x, p.y, p.radius + 9).fill({ color: 0x6622cc, alpha: 0.04 });
          // Seek indicator dots
          for (let si2 = 0; si2 < 3; si2++) {
            const sa2 = t * 6 + si2 * Math.PI * 2 / 3;
            g.circle(p.x + Math.cos(sa2) * (p.radius + 5), p.y + Math.sin(sa2) * (p.radius + 5), 1)
              .fill({ color: 0xee88ff, alpha: 0.4 });
          }
        }
        void speed; // used for reference
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------
  private _drawPickups(g: Graphics, state: VWState): void {
    const t = state.time;
    for (const pk of state.pickups) {
      const bob = Math.sin(t * 2.5 + pk.x * 0.1) * 3;
      const lifeRatio = Math.min(1, pk.life / 2);
      const py2 = pk.y + bob;
      if (pk.kind === "health") {
        g.circle(pk.x, py2, pk.radius + 5).fill({ color: 0x22aa44, alpha: 0.06 * lifeRatio });
        g.circle(pk.x, py2, pk.radius + 2).fill({ color: 0x33bb55, alpha: 0.1 * lifeRatio });
        g.circle(pk.x, py2, pk.radius).fill({ color: 0x44cc66, alpha: 0.85 * lifeRatio });
        const cs = pk.radius * 0.5;
        g.moveTo(pk.x - cs, py2).lineTo(pk.x + cs, py2).stroke({ color: 0xffffff, width: 2, alpha: 0.9 * lifeRatio });
        g.moveTo(pk.x, py2 - cs).lineTo(pk.x, py2 + cs).stroke({ color: 0xffffff, width: 2, alpha: 0.9 * lifeRatio });
        g.circle(pk.x, py2, pk.radius).stroke({ color: 0x88ff88, width: 1, alpha: (0.4 + Math.sin(t * 5) * 0.2) * lifeRatio });
      } else if (pk.kind === "void_charge") {
        g.circle(pk.x, py2, pk.radius + 6).fill({ color: 0x330066, alpha: 0.06 * lifeRatio });
        g.circle(pk.x, py2, pk.radius + 3).fill({ color: 0x440088, alpha: 0.1 * lifeRatio });
        g.circle(pk.x, py2, pk.radius).fill({ color: 0x8844ff, alpha: 0.85 * lifeRatio });
        g.circle(pk.x, py2, pk.radius * 0.55).fill({ color: 0xcc88ff, alpha: 0.55 * lifeRatio });
        g.circle(pk.x, py2, pk.radius).stroke({ color: 0x9955ff, width: 1.5, alpha: (0.4 + Math.sin(t * 4) * 0.2) * lifeRatio });
        // Void symbol
        const va = t * 1.5;
        g.moveTo(pk.x + Math.cos(va) * pk.radius * 0.5, py2 + Math.sin(va) * pk.radius * 0.5)
          .lineTo(pk.x, py2).stroke({ color: 0xffffff, width: 1, alpha: 0.5 * lifeRatio });
      } else {
        g.circle(pk.x, py2, pk.radius + 5).fill({ color: 0xffd700, alpha: 0.06 * lifeRatio });
        g.circle(pk.x, py2, pk.radius).fill({ color: 0xffaa00, alpha: 0.9 * lifeRatio });
        g.circle(pk.x, py2, pk.radius * 0.55).fill({ color: 0xffcc44, alpha: 0.5 * lifeRatio });
        g.circle(pk.x, py2, pk.radius * 0.25).fill({ color: 0xffffff, alpha: 0.35 * lifeRatio });
        for (let fi = 0; fi < 3; fi++) {
          const fa = t * 2 + fi * Math.PI * 2 / 3;
          g.circle(pk.x + Math.cos(fa) * pk.radius * 0.4, py2 + Math.sin(fa) * pk.radius * 0.4, 0.8)
            .fill({ color: 0xffffff, alpha: 0.4 * lifeRatio });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------
  private _drawParticles(g: Graphics, state: VWState): void {
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
  private _drawShockwaves(g: Graphics, state: VWState): void {
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
  private _renderFloatTexts(state: VWState, offX: number, offY: number): void {
    let fi = 0;
    for (const ft of state.floatTexts) {
      if (fi >= FLOAT_POOL) break;
      const t = this._floatTexts[fi];
      t.text = ft.text;
      t.style.fill = ft.color;
      const progress = 1 - ft.life / ft.maxLife;
      const bounceY = progress < 0.15 ? (1 - Math.pow(1 - progress / 0.15, 2)) * 6 : 0;
      t.alpha = progress < 0.1 ? progress / 0.1 : ft.life / ft.maxLife;
      t.scale.set(ft.scale * (progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1 + progress * 0.2));
      t.position.set(offX + ft.x - t.width / 2 + Math.sin(progress * 4 + ft.x * 0.1) * 2,
                     offY + ft.y - t.height / 2 - progress * 25 - bounceY);
      t.visible = true;
      fi++;
    }
    for (let i = fi; i < FLOAT_POOL; i++) this._floatTexts[i].visible = false;
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  private _drawHUD(state: VWState, meta: VWMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    const { score, wave, playerHP, maxHP, comboCount, portals, dashCooldown, dashCooldownMax,
      pulseCooldown, pulseCooldownMax, stormCooldown, stormCooldownMax } = state;

    // Top bar
    g.rect(0, 0, sw, 36).fill({ color: 0x000000, alpha: 0.5 });
    g.rect(0, 35, sw, 1).fill({ color: 0x6622cc, alpha: 0.3 });

    // Main HUD text
    const comboMult = 1 + Math.min(comboCount, 10) * 0.1;
    const multStr = comboCount > 0 ? `  x${comboMult.toFixed(1)}` : "";
    const portalStr = `PORTALS ${portals.length}/${VW.PORTAL_MAX}`;
    this._hudText.text = `SCORE ${Math.floor(score)}   WAVE ${wave}   HP ${playerHP}/${maxHP}   ${portalStr}${multStr}`;
    this._hudText.visible = true;

    // Wave counter (right)
    this._waveText.text = `WAVE ${wave}`;
    this._waveText.position.set(sw - 90, 10);

    // Bottom ability bar
    const abBarY = sh - 38;
    g.rect(0, abBarY - 4, sw, 42).fill({ color: 0x000000, alpha: 0.4 });
    const abilities = [
      { label: "DASH [SHIFT]", cd: dashCooldown, max: dashCooldownMax, color: 0x8844ff },
      { label: "PULSE [SPACE]", cd: pulseCooldown, max: pulseCooldownMax, color: 0xcc66ff },
      { label: "STORM [Q]", cd: stormCooldown, max: stormCooldownMax, color: 0xaa33ee },
    ];
    const abW = 90, abH = 14, abSpacing = 110;
    const abStartX = sw / 2 - abSpacing;
    for (let i = 0; i < abilities.length; i++) {
      const ab = abilities[i];
      const ax = abStartX + i * abSpacing;
      const ready = ab.cd <= 0;
      const fillRatio = ready ? 1 : Math.max(0, 1 - ab.cd / ab.max);
      // Background
      g.roundRect(ax - abW / 2, abBarY, abW, abH, 3).fill({ color: 0x0a0018, alpha: 0.7 });
      // Fill bar
      g.roundRect(ax - abW / 2, abBarY, abW * fillRatio, abH, 3).fill({ color: ab.color, alpha: ready ? 0.8 : 0.45 });
      // Border
      g.roundRect(ax - abW / 2, abBarY, abW, abH, 3).stroke({ color: ready ? ab.color : 0x330055, width: 1, alpha: ready ? 0.9 : 0.4 });
      // Ready glow
      if (ready) {
        g.circle(ax, abBarY + abH / 2, abW * 0.35).fill({ color: ab.color, alpha: 0.07 + Math.sin(state.time * 3 + i) * 0.03 });
      }
    }

    // Portal count indicators (small circles bottom-left)
    for (let pi = 0; pi < VW.PORTAL_MAX; pi++) {
      const px = 20 + pi * 20;
      const py = sh - 20;
      const hasPortal = pi < portals.length;
      g.circle(px, py, 7).fill({ color: hasPortal ? 0x330066 : 0x0a0018, alpha: 0.8 });
      g.circle(px, py, 7).stroke({ color: hasPortal ? 0x9944ff : 0x330044, width: 1.5, alpha: hasPortal ? 0.9 : 0.3 });
      if (hasPortal) {
        g.circle(px, py, 4).fill({ color: 0x9944ff, alpha: 0.5 + Math.sin(state.time * 4 + pi) * 0.2 });
      }
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
          .closePath().fill({ color: e.elite ? 0xffd700 : 0x9944ff, alpha: 0.45 });
      }
    }

    // Combo display
    if (comboCount >= 3) {
      this._comboText.text = `x${comboCount} COMBO`;
      this._comboText.visible = true;
      this._comboText.alpha = Math.min(1, state.comboTimer * 3);
      this._comboText.position.set(sw / 2 - this._comboText.width / 2, sh * 0.18);
    } else {
      this._comboText.visible = false;
    }

    // Synergy bonus display
    const synergyBonus = (state as unknown as Record<string, unknown>).synergyBonus as string | undefined;
    const synergyTimer = (state as unknown as Record<string, unknown>).synergyTimer as number | undefined;
    if (synergyBonus && synergyTimer && synergyTimer > 0) {
      const synAlpha = Math.min(1, synergyTimer / 1.5) * 0.85;
      const synY = comboCount >= 3 ? sh * 0.24 : sh * 0.18;
      const synW = 140;
      g.rect(sw / 2 - synW / 2, synY - 8, synW, 18).fill({ color: 0x000000, alpha: synAlpha * 0.4 });
      g.rect(sw / 2 - synW / 2, synY - 8, synW, 18).stroke({ color: VW.COLOR_GOLD, width: 1, alpha: synAlpha * 0.6 });
      g.circle(sw / 2 - synW / 2, synY + 1, 2).fill({ color: VW.COLOR_GOLD, alpha: synAlpha * 0.7 });
      g.circle(sw / 2 + synW / 2, synY + 1, 2).fill({ color: VW.COLOR_GOLD, alpha: synAlpha * 0.7 });
    }

    this._highScoreText.text = `BEST: ${meta.highScore}`;
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------
  private _drawStartScreen(state: VWState, meta: VWMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });
    g.roundRect(sw / 2 - 230, sh / 2 - 200, 460, 410, 12).fill({ color: 0x07000f, alpha: 0.9 });
    g.roundRect(sw / 2 - 230, sh / 2 - 200, 460, 410, 12).stroke({ color: 0x6622cc, alpha: 0.45, width: 1.5 });

    // Ambient void motes on screen
    const t2 = state.time;
    for (let mi = 0; mi < 8; mi++) {
      const mx = sw * 0.15 + ((mi * 179 + t2 * (5 + mi)) % (sw * 0.7));
      const my = sh * 0.25 + ((mi * 347) % (sh * 0.45)) + Math.sin(t2 * 1.4 + mi * 2) * 9;
      g.circle(mx, my, 1.5).fill({ color: 0x8844ff, alpha: 0.1 + Math.sin(t2 * 2 + mi) * 0.05 });
      g.circle(mx, my, 4).fill({ color: 0x6622cc, alpha: 0.025 });
    }

    // Flowing void energy lines
    for (let fl = 0; fl < 4; fl++) {
      const flowY = sh * (0.25 + fl * 0.15) + Math.sin(t2 * 0.6 + fl * 1.5) * 15;
      g.moveTo(0, flowY).lineTo(sw, flowY + Math.sin(t2 * 0.3 + fl) * 20)
        .stroke({ color: 0x6622cc, width: 18, alpha: 0.02 + Math.sin(t2 * 0.4 + fl) * 0.008 });
    }

    // Void energy streams across panel
    for (let fl = 0; fl < 3; fl++) {
      const flowY = sh * (0.3 + fl * 0.12) + Math.sin(t2 * 0.5 + fl * 1.5) * 12;
      g.moveTo(sw * 0.2, flowY).lineTo(sw * 0.8, flowY + Math.sin(t2 * 0.3 + fl) * 15)
        .stroke({ color: 0x4422aa, width: 14, alpha: 0.015 + Math.sin(t2 * 0.4 + fl) * 0.005 });
    }

    // Animated void portal icon — larger, more dramatic
    const iconX = sw / 2, iconY = sh / 2 - 155;
    const iconR = 16;
    // Outer glow
    g.circle(iconX, iconY, iconR + 8).fill({ color: 0x330066, alpha: 0.08 + Math.sin(t2 * 2) * 0.03 });
    g.circle(iconX, iconY, iconR + 4).fill({ color: 0x440088, alpha: 0.12 + Math.sin(t2 * 3) * 0.04 });
    // Outer ring
    for (let ri2 = 0; ri2 < 12; ri2++) {
      const a2 = t2 * 2.5 + ri2 * Math.PI / 6;
      const a3 = t2 * 2.5 + (ri2 + 0.65) * Math.PI / 6;
      g.moveTo(iconX + Math.cos(a2) * iconR, iconY + Math.sin(a2) * iconR)
        .lineTo(iconX + Math.cos(a3) * iconR, iconY + Math.sin(a3) * iconR)
        .stroke({ color: 0x9944ff, width: 2.5, alpha: 0.7 + Math.sin(t2 * 4 + ri2) * 0.15 });
    }
    // Inner counter-rotating ring
    for (let ri3 = 0; ri3 < 8; ri3++) {
      const a4 = -t2 * 3.5 + ri3 * Math.PI / 4;
      const a5 = -t2 * 3.5 + (ri3 + 0.6) * Math.PI / 4;
      const innerR2 = iconR * 0.6;
      g.moveTo(iconX + Math.cos(a4) * innerR2, iconY + Math.sin(a4) * innerR2)
        .lineTo(iconX + Math.cos(a5) * innerR2, iconY + Math.sin(a5) * innerR2)
        .stroke({ color: 0xcc66ff, width: 1.5, alpha: 0.55 });
    }
    // Void center
    g.circle(iconX, iconY, iconR * 0.4).fill({ color: 0x050008, alpha: 0.95 });
    g.circle(iconX, iconY, iconR * 0.25).fill({ color: 0x020005, alpha: 1 });
    g.circle(iconX, iconY, iconR * 0.15).fill({ color: 0x9944ff, alpha: 0.3 + Math.sin(t2 * 5) * 0.15 });
    // Spiral particles
    for (let sp = 0; sp < 4; sp++) {
      const spA = t2 * 4 + sp * Math.PI / 2;
      const spD = iconR * (0.5 + (t2 * 0.5 + sp * 0.3) % 0.5);
      g.circle(iconX + Math.cos(spA) * spD, iconY + Math.sin(spA) * spD, 1)
        .fill({ color: 0xaa66ff, alpha: 0.5 * (1 - spD / iconR) });
    }

    this._titleText.position.set(sw / 2 - this._titleText.width / 2, sh / 2 - 185);
    this._subtitleText.position.set(sw / 2 - this._subtitleText.width / 2, sh / 2 - 125);

    this._controlsText.text =
      "LMB (hold): Shadow Bolt auto-fire\n" +
      "RMB: Place Void Portal (max 2)  ·  Walk near portal: Teleport\n" +
      "SHIFT: Void Dash  ·  SPACE: Void Pulse  ·  Q: Shadow Storm\n" +
      "ESC: Pause";
    this._controlsText.position.set(sw / 2 - this._controlsText.width / 2, sh / 2 - 60);

    this._promptText.position.set(sw / 2 - this._promptText.width / 2, sh / 2 + 145);
    this._highScoreText.text = `Best: ${meta.highScore}  ·  Games: ${meta.gamesPlayed}`;
    this._highScoreText.position.set(sw / 2 - this._highScoreText.width / 2, sh / 2 + 180);
  }

  // ---------------------------------------------------------------------------
  // Death screen
  // ---------------------------------------------------------------------------
  private _drawDeathScreen(state: VWState, meta: VWMeta, sw: number, sh: number): void {
    const g = this._uiGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
    g.roundRect(sw / 2 - 240, sh / 2 - 230, 480, 465, 14).fill({ color: 0x07000f, alpha: 0.92 });
    g.roundRect(sw / 2 - 240, sh / 2 - 230, 480, 465, 14).stroke({ color: 0x6622cc, alpha: 0.45, width: 1.5 });

    // Fading void residue
    for (let ri = 0; ri < 4; ri++) {
      const rx = sw * (0.15 + ri * 0.25);
      const ry = sh * 0.5;
      const rr = 70 + Math.sin(state.time * 0.4 + ri * 2) * 15;
      g.circle(rx, ry, rr).fill({ color: 0x110022, alpha: 0.05 + Math.sin(state.time * 0.6 + ri) * 0.02 });
    }
    // Falling void motes
    for (let mi = 0; mi < 6; mi++) {
      const mx = ((mi * 211 + 43) % sw);
      const my = ((mi * 97 + state.time * 10) % sh);
      g.circle(mx, my, 1).fill({ color: 0x8844ff, alpha: 0.1 + Math.sin(state.time + mi) * 0.04 });
    }

    const { grade, color } = getVWGrade(state.score);
    this._gradeText.text = grade;
    this._gradeText.style.fill = color;
    this._gradeText.position.set(sw / 2 - this._gradeText.width / 2, sh / 2 - 215);

    // Grade glow ring
    const gradeGlow = 0.3 + Math.sin(state.time * 2) * 0.1;
    g.circle(sw / 2, sh / 2 - 200, 42).stroke({ color: color, width: 2, alpha: gradeGlow });
    g.circle(sw / 2, sh / 2 - 200, 52).fill({ color: color, alpha: 0.04 });
    // Orbiting grade particles
    for (let gi = 0; gi < 4; gi++) {
      const ga = state.time * 1.5 + gi * Math.PI / 2;
      g.circle(sw / 2 + Math.cos(ga) * 46, sh / 2 - 200 + Math.sin(ga) * 46, 1.5)
        .fill({ color: color, alpha: gradeGlow * 0.6 });
    }

    this._statText.text =
      `Score: ${Math.floor(state.score)}   Wave: ${state.wave}   Kills: ${state.totalKills}\n` +
      `Best Combo: x${state.bestCombo}   High Score: ${meta.highScore}`;
    this._statText.position.set(sw / 2 - this._statText.width / 2, sh / 2 - 155);

    this._drawUpgradeShop(g, meta, sw, sh);

    this._deathPrompt.text = "Press SPACE to play again";
    this._deathPrompt.position.set(sw / 2 - this._deathPrompt.width / 2, sh / 2 + 210);
  }

  // ---------------------------------------------------------------------------
  // Upgrade shop
  // ---------------------------------------------------------------------------
  private _drawUpgradeShop(g: Graphics, meta: VWMeta, sw: number, sh: number): void {
    const panelX = sw / 2 - 190;
    const panelY = sh / 2 - 65;
    const panelW = 380;
    g.roundRect(panelX, panelY, panelW, 225, 8).fill({ color: 0x0a0018, alpha: 0.85 });
    g.roundRect(panelX, panelY, panelW, 225, 8).stroke({ color: 0x440077, alpha: 0.5, width: 1 });

    this._shopTitle.text = "UPGRADES";
    this._shopTitle.position.set(sw / 2 - this._shopTitle.width / 2, panelY + 8);

    const shards = meta.shards;
    this._shardText.text = `Shards: ${shards}`;
    this._shardText.position.set(panelX + panelW - this._shardText.width - 10, panelY + 10);

    const upgKeys: Array<keyof typeof meta.upgrades> = ["maxHP", "boltPower", "dashPower", "portalPower", "stormPower"];
    const upgLabels = ["[1] Max HP", "[2] Bolt Power", "[3] Dash Power", "[4] Portal Power", "[5] Storm Power"];
    const costs = VW.UPGRADE_COSTS;

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
      t.style.fill = isMax ? 0x9966cc : canAfford ? 0xcc99ff : 0x553377;
      t.position.set(panelX + 16, panelY + 38 + i * 34);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------
  private _drawPauseScreen(sw: number, sh: number): void {
    const g = this._uiGfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    // Decorative panel
    g.roundRect(sw / 2 - 120, sh / 2 - 40, 240, 80, 10).fill({ color: 0x07000f, alpha: 0.85 });
    g.roundRect(sw / 2 - 120, sh / 2 - 40, 240, 80, 10).stroke({ color: 0x6622cc, width: 2, alpha: 0.5 });
    // Double border
    g.roundRect(sw / 2 - 124, sh / 2 - 44, 248, 88, 12).stroke({ color: 0x4411aa, width: 1, alpha: 0.25 });
    // Corner void dots
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [cx, cy] of corners) {
      g.circle(sw / 2 + cx * 120, sh / 2 + cy * 40, 3).fill({ color: 0x9944ff, alpha: 0.55 });
      g.circle(sw / 2 + cx * 120, sh / 2 + cy * 40, 6).fill({ color: 0x6622cc, alpha: 0.08 });
    }
    // Mini portal icon
    const hx = sw / 2, hy = sh / 2 - 20;
    for (let ri = 0; ri < 6; ri++) {
      const a1 = ri * Math.PI / 3;
      const a2 = (ri + 0.6) * Math.PI / 3;
      g.moveTo(hx + Math.cos(a1) * 8, hy + Math.sin(a1) * 8)
        .lineTo(hx + Math.cos(a2) * 8, hy + Math.sin(a2) * 8)
        .stroke({ color: 0x9944ff, width: 1.5, alpha: 0.45 });
    }
    g.circle(hx, hy, 3).fill({ color: 0x050008, alpha: 0.9 });
    this._pauseText.position.set(sw / 2 - this._pauseText.width / 2, sh / 2 + 6);
  }

  // ---------------------------------------------------------------------------
  // Wave announce
  // ---------------------------------------------------------------------------
  private _drawWaveAnnounce(state: VWState, sw: number, sh: number): void {
    if (state.waveAnnounceTimer > 0) {
      const alpha = Math.min(1, state.waveAnnounceTimer / 0.5) * 0.7;
      const g = this._uiGfx;
      const bandH = 45;
      const bandY = sh * 0.28 - bandH / 2;
      g.rect(0, bandY, sw, bandH).fill({ color: 0x000000, alpha: alpha * 0.55 });
      g.moveTo(0, bandY).lineTo(sw, bandY).stroke({ color: 0x8844ff, width: 2, alpha: alpha * 0.55 });
      g.moveTo(0, bandY + bandH).lineTo(sw, bandY + bandH).stroke({ color: 0x8844ff, width: 2, alpha: alpha * 0.55 });
      const flareW = 28 + Math.sin(state.time * 5) * 8;
      g.rect(0, bandY, flareW, bandH).fill({ color: 0x6622cc, alpha: alpha * 0.1 });
      g.rect(sw - flareW, bandY, flareW, bandH).fill({ color: 0x6622cc, alpha: alpha * 0.1 });
      // Void rune decorations
      for (let ri3 = 0; ri3 < 4; ri3++) {
        const rx = sw * (0.2 + ri3 * 0.2);
        const ry3 = bandY + bandH / 2;
        const rs2 = 4 + Math.sin(state.time * 3 + ri3) * 1;
        g.circle(rx, ry3, rs2).fill({ color: 0x9944ff, alpha: alpha * 0.3 });
        g.circle(rx, ry3, rs2 + 2).stroke({ color: 0x6622cc, width: 0.8, alpha: alpha * 0.2 });
      }
      this._waveAnnounceText.text = state.waveEventActive || `WAVE ${state.wave}`;
      this._waveAnnounceText.alpha = alpha;
      this._waveAnnounceText.visible = true;
      this._waveAnnounceText.position.set(sw / 2 - this._waveAnnounceText.width / 2, sh * 0.28 - 10);
    } else {
      this._waveAnnounceText.visible = false;
    }
  }
}
