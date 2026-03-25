// ---------------------------------------------------------------------------
// Chronomancer — PixiJS Renderer
// Time-manipulation arena combat with temporal magic
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { CMPhase } from "../types";
import type { CMState, CMMeta } from "../types";
import { CM, getCMGrade } from "../config/ChronomancerBalance";

// ---------------------------------------------------------------------------
// Text styles — cool blue/purple time-magic palette
// ---------------------------------------------------------------------------
const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 52, fill: 0x6644cc, fontWeight: "bold",
  letterSpacing: 8, dropShadow: { color: 0x000000, distance: 4, blur: 10, alpha: 0.9 },
});
const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 15, fill: 0x4477aa, fontStyle: "italic", letterSpacing: 3,
});
const STYLE_HUD = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0x8899cc, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 },
});
const STYLE_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 18, fill: 0x6688ff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 },
});
const STYLE_GRADE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 46, fill: 0x6644cc, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 },
});
const STYLE_STAT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaaaacc, lineHeight: 22,
});
const STYLE_CONTROLS = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x556688, lineHeight: 16,
});
const STYLE_PAUSE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 32, fill: 0x8866ff, fontWeight: "bold",
  letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 },
});
const STYLE_FLOAT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 },
});
const STYLE_COMBO = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 28, fill: 0x22ffaa, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.8 },
});

const FLOAT_POOL = 16;

export class ChronomancerRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "CHRONOMANCER", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Master of Time", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _comboText = new Text({ text: "", style: STYLE_COMBO });
  private _floatTexts: Text[] = [];
  private _cdTexts: Text[] = [];
  private _floatContainer = new Container();
  private _sw = 0;
  private _sh = 0;
  private _pendingBossNameText: Text | null = null;
  private _pendingBossSubText: Text | null = null;
  private _shopTexts: Text[] = [];
  private _shardText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
      dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
    }),
  });
  private _shopTitle = new Text({
    text: "UPGRADES", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 16, fill: 0x8866ff, fontWeight: "bold",
      letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 13, fill: 0x6688ff, fontWeight: "bold",
      letterSpacing: 2, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 },
    }),
  });
  private _waveAnnounceText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "Georgia, serif", fontSize: 26, fill: 0x8866ff, fontWeight: "bold",
      letterSpacing: 4, dropShadow: { color: 0x000000, distance: 2, blur: 5, alpha: 0.9 },
    }),
  });
  private _highScoreText = new Text({
    text: "", style: new TextStyle({
      fontFamily: "monospace", fontSize: 12, fill: 0x8899cc,
      dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
    }),
  });

  build(sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;
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
          fontFamily: "monospace", fontSize: 11, fill: 0x8899cc,
          dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 },
        }),
      });
      this._shopTexts.push(t);
      this.container.addChild(t);
    }
    this.container.addChild(this._shardText);
    this.container.addChild(this._shopTitle);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5);
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
    for (let i = 0; i < 4; i++) {
      const t = new Text({ text: "", style: new TextStyle({
        fontFamily: "monospace", fontSize: 10, fill: 0xaabbcc,
        dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.9 },
      }) });
      t.anchor.set(0.5);
      t.visible = false;
      this._cdTexts.push(t);
      this.container.addChild(t);
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
    this._uiGfx.destroy();
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  render(state: CMState, sw: number, sh: number, meta: CMMeta): void {
    this._sw = sw;
    this._sh = sh;
    const g = this._gfx;
    g.clear();
    this._uiGfx.clear();

    // Clean up transient boss announcement texts from previous frame
    if (this._pendingBossNameText) {
      this.container.removeChild(this._pendingBossNameText);
      this._pendingBossNameText.destroy();
      this._pendingBossNameText = null;
    }
    if (this._pendingBossSubText) {
      this.container.removeChild(this._pendingBossSubText);
      this._pendingBossSubText.destroy();
      this._pendingBossSubText = null;
    }

    // Screen shake
    let shX = 0, shY = 0;
    if (state.screenShake > 0) {
      const i = CM.SHAKE_INTENSITY * (state.screenShake / CM.SHAKE_DURATION);
      shX = (Math.random() - 0.5) * i * 2;
      shY = (Math.random() - 0.5) * i * 2;
    }
    g.position.set(shX, shY);

    const t = state.time;

    // 1. Rich dark background with subtle nebula and stars
    g.rect(-10, -10, sw + 20, sh + 20).fill(0x040610);
    // Nebula clouds — large soft color washes
    g.circle(sw * 0.25, sh * 0.3, 200).fill({ color: 0x0a0620, alpha: 0.25 });
    g.circle(sw * 0.75, sh * 0.65, 180).fill({ color: 0x060a20, alpha: 0.2 });
    g.circle(sw * 0.5, sh * 0.5, 250).fill({ color: 0x080416, alpha: 0.18 });
    // Scattered star dots (deterministic from position)
    const parallaxX = (state.playerX - sw / 2) * 0.02;
    const parallaxY = (state.playerY - sh / 2) * 0.02;
    for (let si = 0; si < 40; si++) {
      const sx = ((si * 197 + 53) % sw) - parallaxX * (1 + si * 0.02);
      const sy = ((si * 311 + 97) % sh) - parallaxY * (1 + si * 0.02);
      const sBright = ((si * 73) % 5) / 5;
      const sFlicker = 0.15 + sBright * 0.3 + Math.sin(t * (0.5 + si * 0.1) + si) * 0.08;
      g.circle(sx, sy, 0.5 + sBright * 0.8).fill({ color: 0x8899cc, alpha: sFlicker });
    }
    // Brighter accent stars
    for (let si = 0; si < 8; si++) {
      const sx = ((si * 419 + 137) % sw) - parallaxX * (1 + si * 0.02);
      const sy = ((si * 557 + 211) % sh) - parallaxY * (1 + si * 0.02);
      const sFlicker = 0.3 + Math.sin(t * 1.5 + si * 2.3) * 0.15;
      g.circle(sx, sy, 1.2).fill({ color: 0xaabbff, alpha: sFlicker });
      g.circle(sx, sy, 3).fill({ color: 0x6677cc, alpha: sFlicker * 0.15 });
    }

    // 2. Time distortion overlay
    if (state.timeDistortion > 0) {
      const td = state.timeDistortion;
      g.circle(sw / 2, sh / 2, sw * 0.6).fill({ color: 0x6644cc, alpha: td * 0.04 + Math.sin(t * 3) * 0.01 });
      g.circle(sw * 0.3, sh * 0.3, 140).fill({ color: 0x4488ff, alpha: td * 0.03 + Math.sin(t * 2.3) * 0.01 });
      g.circle(sw * 0.7, sh * 0.7, 120).fill({ color: 0x220066, alpha: td * 0.03 + Math.sin(t * 1.7 + 1) * 0.01 });
    }

    if (state.phase === CMPhase.PLAYING || state.phase === CMPhase.PAUSED) {
      // Time zone proximity visual — subtle blue vignette when player is inside a time zone
      let playerInZone = false;
      for (const tz of state.timeZones) {
        const dzp = Math.sqrt((tz.x - state.playerX) ** 2 + (tz.y - state.playerY) ** 2);
        if (dzp < tz.radius) { playerInZone = true; break; }
      }
      if (playerInZone) {
        // Subtle blue edge vignette
        const vigAlpha = 0.06 + Math.sin(t * 2) * 0.02;
        g.rect(0, 0, sw, 20).fill({ color: 0x4488ff, alpha: vigAlpha });
        g.rect(0, sh - 20, sw, 20).fill({ color: 0x4488ff, alpha: vigAlpha });
        g.rect(0, 0, 20, sh).fill({ color: 0x4488ff, alpha: vigAlpha });
        g.rect(sw - 20, 0, 20, sh).fill({ color: 0x4488ff, alpha: vigAlpha });
      }

      // 3. Arena
      this._drawArena(g, state);
      // 4. Blood stains
      this._drawBloodStains(g, state);
      // 4a. Ambient floating dust — subtle atmospheric particles
      for (let di = 0; di < 15; di++) {
        const dx = ((di * 277 + 43) % sw);
        const dy = ((di * 431 + 91 + t * (3 + di * 0.5)) % sh);
        const dAlpha = 0.04 + Math.sin(t * 0.8 + di * 1.3) * 0.02;
        const dSize = 0.8 + (di % 3) * 0.3;
        g.circle(dx, dy, dSize).fill({ color: 0x8899cc, alpha: dAlpha });
      }
      // 4b. Arena hazards
      this._drawHazards(g, state);
      // 5. Time zones
      this._drawTimeZones(g, state);
      // 6. Temporal echoes
      this._drawTemporalEchoes(g, state);
      // 7. Pickups
      this._drawPickups(g, state);
      // 8. Enemies
      this._drawEnemies(g, state);
      // 9. Boss
      this._drawBoss(g, state, sw, sh);
      // 10. Player
      this._drawPlayer(g, state);
      // 11. Projectiles
      this._drawProjectiles(g, state);
      // 12. Particles
      this._drawParticles(g, state);
      // 13. Shockwaves
      this._drawShockwaves(g, state);
      // 14. Time freeze visual
      this._drawTimeFreezeOverlay(g, state, sw, sh);
    }

    // Combat intensity border glow — brightens with more enemies alive
    if (state.phase === CMPhase.PLAYING) {
      const aliveCount = state.enemies.filter(e => e.alive).length;
      if (aliveCount > 3) {
        const intensity = Math.min(1, (aliveCount - 3) / 12);
        const combatGlow = intensity * (0.03 + Math.sin(t * 1.5) * 0.01);
        g.rect(0, 0, sw, 3).fill({ color: 0x6644cc, alpha: combatGlow });
        g.rect(0, sh - 3, sw, 3).fill({ color: 0x6644cc, alpha: combatGlow });
        g.rect(0, 0, 3, sh).fill({ color: 0x6644cc, alpha: combatGlow });
        g.rect(sw - 3, 0, 3, sh).fill({ color: 0x6644cc, alpha: combatGlow });
      }
    }

    // Low HP danger vignette — red pulsing edges when HP is low
    if (state.phase === CMPhase.PLAYING && state.playerHP <= Math.ceil(state.maxHP * 0.3) && state.playerHP > 0) {
      const dangerPulse = 0.08 + Math.sin(t * 4) * 0.04;
      const edgeW = 40 + Math.sin(t * 3) * 10;
      g.rect(0, 0, sw, edgeW).fill({ color: 0xff0000, alpha: dangerPulse });
      g.rect(0, sh - edgeW, sw, edgeW).fill({ color: 0xff0000, alpha: dangerPulse });
      g.rect(0, 0, edgeW, sh).fill({ color: 0xff0000, alpha: dangerPulse });
      g.rect(sw - edgeW, 0, edgeW, sh).fill({ color: 0xff0000, alpha: dangerPulse });
      // Heartbeat-like inner pulse
      if (state.playerHP <= 1) {
        const heartbeat = Math.pow(Math.sin(t * 5), 8) * 0.06;
        g.rect(0, 0, sw, sh).fill({ color: 0xff0000, alpha: heartbeat });
      }
    }

    // 15. Screen flash — expanding ring with bloom
    if (state.screenFlashTimer > 0) {
      const flashRatio = Math.min(1, state.screenFlashTimer / CM.FLASH_DURATION);
      // Full screen bloom
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.18 * flashRatio });
      // Expanding ring from center
      const ringR = Math.max(sw, sh) * (1 - flashRatio) * 0.6;
      g.circle(sw / 2, sh / 2, ringR).stroke({ color: state.screenFlashColor, width: 4, alpha: flashRatio * 0.2 });
      g.circle(sw / 2, sh / 2, ringR * 0.7).stroke({ color: 0xffffff, width: 2, alpha: flashRatio * 0.1 });
      // Edge glow bloom
      const bloomAlpha = flashRatio * 0.08;
      g.rect(0, 0, sw, 30).fill({ color: state.screenFlashColor, alpha: bloomAlpha });
      g.rect(0, sh - 30, sw, 30).fill({ color: state.screenFlashColor, alpha: bloomAlpha });
      g.rect(0, 0, 30, sh).fill({ color: state.screenFlashColor, alpha: bloomAlpha });
      g.rect(sw - 30, 0, 30, sh).fill({ color: state.screenFlashColor, alpha: bloomAlpha });
    }

    // 16. Float texts
    this._drawFloatTexts(state);
    // 17. HUD
    this._drawHUD(state);
    // 18. Start / Pause / Death screens
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);
    // 19. Boss announcement (on top of everything)
    this._drawBossAnnounce(g, state);
    // 20. Wave announcement
    this._drawWaveAnnounce(g, state);
  }

  // ---------------------------------------------------------------------------
  // Arena — dark hexagonal floor tiles, clock-face border, temporal crystals
  // ---------------------------------------------------------------------------
  private _drawArena(g: Graphics, state: CMState): void {
    const w = state.arenaW, h = state.arenaH, t = state.time;
    const cx = w / 2, cy = h / 2;
    const left = cx - w / 2, top = cy - h / 2;

    // Dark floor tiles — subtle blue-black hex-ish pattern via offset rows
    const tileW = 28, tileH = 24;
    for (let ty = top; ty < top + h; ty += tileH) {
      for (let tx = left; tx < left + w; tx += tileW) {
        const txi = Math.floor((tx - left) / tileW);
        const tyi = Math.floor((ty - top) / tileH);
        const offsetX = (tyi % 2 === 0) ? 0 : tileW * 0.5;
        const shade = (txi + tyi) % 3 === 0 ? 0x0a0e18 : (txi + tyi) % 3 === 1 ? 0x080c14 : 0x060910;
        g.rect(tx + offsetX, ty, tileW - 1, tileH - 1).fill({ color: shade, alpha: 1 });
        // Tile edge
        g.moveTo(tx + offsetX, ty).lineTo(tx + offsetX + tileW - 1, ty)
          .stroke({ color: 0x111828, width: 0.5, alpha: 0.4 });
      }
    }

    // Subtle time symbol grid on floor (faint clock-hand marks at intersections)
    const symbolSpacing = 84;
    const symbolAlpha = 0.04 + Math.sin(t * 0.5) * 0.01;
    for (let gx = left + symbolSpacing; gx < left + w; gx += symbolSpacing) {
      for (let gy = top + symbolSpacing; gy < top + h; gy += symbolSpacing) {
        // Tiny clock tick cross
        g.moveTo(gx - 3, gy).lineTo(gx + 3, gy).stroke({ color: 0x4466aa, width: 0.6, alpha: symbolAlpha });
        g.moveTo(gx, gy - 3).lineTo(gx, gy + 3).stroke({ color: 0x4466aa, width: 0.6, alpha: symbolAlpha });
        g.circle(gx, gy, 1).fill({ color: 0x4466aa, alpha: symbolAlpha * 1.5 });
      }
    }

    // Temporal corruption — floor cracks appear as waves progress
    const waveNum = state.wave;
    if (waveNum >= 3) {
      const crackCount = Math.min(12, Math.floor(waveNum * 0.8));
      const crackSeed = 42; // deterministic seed
      for (let ci = 0; ci < crackCount; ci++) {
        const cx0 = ((ci * 137 + crackSeed) % w) + left;
        const cy0 = ((ci * 251 + crackSeed * 3) % h) + top;
        const crackLen = 20 + (ci * 31) % 40;
        const crackAngle = (ci * 73) % 628 / 100;
        const cx1 = cx0 + Math.cos(crackAngle) * crackLen;
        const cy1 = cy0 + Math.sin(crackAngle) * crackLen;
        const crackAlpha = 0.08 + Math.sin(t * 0.5 + ci * 2) * 0.03;
        // Main crack line
        g.moveTo(cx0, cy0).lineTo(cx1, cy1)
          .stroke({ color: 0x6644cc, width: 1.5, alpha: crackAlpha });
        // Branch crack
        const midX = (cx0 + cx1) / 2, midY = (cy0 + cy1) / 2;
        const branchAngle = crackAngle + ((ci % 2 === 0) ? 0.8 : -0.8);
        g.moveTo(midX, midY)
          .lineTo(midX + Math.cos(branchAngle) * crackLen * 0.4, midY + Math.sin(branchAngle) * crackLen * 0.4)
          .stroke({ color: 0x4422aa, width: 1, alpha: crackAlpha * 0.7 });
        // Glow at crack junction
        g.circle(cx0, cy0, 3).fill({ color: 0x8866ff, alpha: crackAlpha * 0.4 });
      }
    }

    // Arena floor glow — central blue-purple ambient
    g.circle(cx, cy, Math.min(w, h) * 0.45).fill({ color: 0x0d0a22, alpha: 0.15 + Math.sin(t * 0.7) * 0.03 });

    // Central ornamental rune circle — slowly rotating arcane mandala
    const manR = Math.min(w, h) * 0.32;
    const manRot = t * 0.15;
    // Outer ring
    g.circle(cx, cy, manR).stroke({ color: 0x3322aa, width: 1.5, alpha: 0.08 + Math.sin(t * 0.6) * 0.02 });
    g.circle(cx, cy, manR * 0.85).stroke({ color: 0x4433bb, width: 1, alpha: 0.06 });
    // Inner ring
    g.circle(cx, cy, manR * 0.5).stroke({ color: 0x5544cc, width: 1, alpha: 0.07 + Math.sin(t * 0.8) * 0.02 });
    // Radiating lines from center to outer ring
    for (let ri = 0; ri < 8; ri++) {
      const ra = manRot + ri * Math.PI / 4;
      g.moveTo(cx + Math.cos(ra) * manR * 0.2, cy + Math.sin(ra) * manR * 0.2)
        .lineTo(cx + Math.cos(ra) * manR * 0.95, cy + Math.sin(ra) * manR * 0.95)
        .stroke({ color: 0x3322aa, width: 0.8, alpha: 0.06 + Math.sin(t * 0.5 + ri) * 0.02 });
    }
    // Ornamental arcs between radiating lines
    for (let ai = 0; ai < 8; ai++) {
      const a1 = manRot + ai * Math.PI / 4;
      const a2 = manRot + (ai + 1) * Math.PI / 4;
      const midA = (a1 + a2) / 2;
      const arcR = manR * 0.7;
      // Draw arc as line segments
      const arcSegs = 6;
      for (let seg = 0; seg < arcSegs; seg++) {
        const sa1 = a1 + (a2 - a1) * (seg / arcSegs);
        const sa2 = a1 + (a2 - a1) * ((seg + 1) / arcSegs);
        g.moveTo(cx + Math.cos(sa1) * arcR, cy + Math.sin(sa1) * arcR)
          .lineTo(cx + Math.cos(sa2) * arcR, cy + Math.sin(sa2) * arcR)
          .stroke({ color: 0x4433bb, width: 0.7, alpha: 0.06 });
      }
      // Small diamond at arc midpoint
      const dmx = cx + Math.cos(midA) * arcR;
      const dmy = cy + Math.sin(midA) * arcR;
      this._drawTemporalRune(g, dmx, dmy, 3, 0x5544cc, 0.08, t * 0.3 + ai);
    }
    // Center focal point
    g.circle(cx, cy, 6).fill({ color: 0x3322aa, alpha: 0.06 + Math.sin(t * 1.2) * 0.02 });
    g.circle(cx, cy, 3).fill({ color: 0x6644cc, alpha: 0.08 + Math.sin(t * 1.5) * 0.03 });

    // Dynamic combat lighting — arena glows based on game intensity
    const aliveEnemies = state.enemies.filter(e => e.alive).length;
    const combatIntensity = Math.min(1, aliveEnemies / 15);
    if (combatIntensity > 0.1) {
      // Pulsing purple arena glow that intensifies with combat
      const combatPulse = combatIntensity * (0.03 + Math.sin(t * 1.8) * 0.01);
      g.circle(cx, cy, Math.min(w, h) * 0.4).fill({ color: 0x2200aa, alpha: combatPulse });
      // Edge danger glow when many enemies
      if (combatIntensity > 0.5) {
        const edgeGlow = (combatIntensity - 0.5) * 0.04;
        g.rect(left, top, w, 8).fill({ color: 0x6622cc, alpha: edgeGlow });
        g.rect(left, top + h - 8, w, 8).fill({ color: 0x6622cc, alpha: edgeGlow });
        g.rect(left, top, 8, h).fill({ color: 0x6622cc, alpha: edgeGlow });
        g.rect(left + w - 8, top, 8, h).fill({ color: 0x6622cc, alpha: edgeGlow });
      }
    }
    // Boss arena effect — dramatic darkening + colored glow when boss is present
    const bossPresent = (state as unknown as Record<string, unknown>).bossWave as boolean | undefined;
    if (bossPresent) {
      g.rect(left, top, w, h).fill({ color: 0x0a0010, alpha: 0.08 + Math.sin(t * 0.8) * 0.03 });
      // Ominous purple corner glows
      const arenaCorners = [[left, top], [left + w, top], [left, top + h], [left + w, top + h]];
      for (const [cornerX, cornerY] of arenaCorners) {
        g.circle(cornerX, cornerY, 60).fill({ color: 0x440066, alpha: 0.06 + Math.sin(t * 1.5) * 0.02 });
      }
    }

    // Border — dark with outer glow
    const borderGlow = 0.35 + Math.sin(t * 1.2) * 0.1;
    g.rect(left, top, w, h).stroke({ color: 0x3322aa, width: 3, alpha: borderGlow });
    g.rect(left - 4, top - 4, w + 8, h + 8).stroke({ color: 0x6644cc, width: 1.5, alpha: borderGlow * 0.25 });
    g.rect(left - 8, top - 8, w + 16, h + 16).stroke({ color: 0x4488ff, width: 1, alpha: borderGlow * 0.08 });

    // Clock-like border markings — 12 hour positions (ticks at top, bottom, left, right, and intermediary)
    const clockR = Math.min(w, h) * 0.5 + 12;
    for (let hi = 0; hi < 12; hi++) {
      const a = -Math.PI / 2 + (hi / 12) * Math.PI * 2;
      const isMain = hi % 3 === 0;
      const tickLen = isMain ? 10 : 5;
      // Map from polar coords to arena border — approximated by clamping
      const tx0 = cx + Math.cos(a) * clockR;
      const ty0 = cy + Math.sin(a) * clockR;
      const tx1 = cx + Math.cos(a) * (clockR - tickLen);
      const ty1 = cy + Math.sin(a) * (clockR - tickLen);
      g.moveTo(tx0, ty0).lineTo(tx1, ty1)
        .stroke({ color: 0x6644cc, width: isMain ? 2 : 1, alpha: 0.25 + Math.sin(t * 1.5 + hi) * 0.05 });
    }

    // Rotating rune symbols along border edges
    const runeSpacing = 48;
    const runeAlpha = 0.15 + Math.sin(t * 0.9) * 0.05;
    for (let rx = left + runeSpacing; rx < left + w - runeSpacing * 0.5; rx += runeSpacing) {
      const ra = runeAlpha + Math.sin(t * 2 + rx * 0.07) * 0.04;
      this._drawTemporalRune(g, rx, top - 3, 4, 0x6644cc, ra, t + rx * 0.04);
      this._drawTemporalRune(g, rx, top + h + 3, 4, 0x4488ff, ra, t + rx * 0.04 + 1);
    }
    for (let ry = top + runeSpacing; ry < top + h - runeSpacing * 0.5; ry += runeSpacing) {
      const ra = runeAlpha + Math.sin(t * 2 + ry * 0.07) * 0.04;
      this._drawTemporalRune(g, left - 3, ry, 4, 0x6644cc, ra, t + ry * 0.04);
      this._drawTemporalRune(g, left + w + 3, ry, 4, 0x4488ff, ra, t + ry * 0.04 + 1);
    }

    // Corner temporal crystals — floating blue diamonds
    const corners = [
      [left, top], [left + w, top],
      [left, top + h], [left + w, top + h],
    ];
    for (let ci = 0; ci < corners.length; ci++) {
      const [bx, by] = corners[ci];
      const floatOffset = Math.sin(t * 1.5 + ci * 1.8) * 3;
      const rot = t * 0.4 + ci * Math.PI / 2;
      const crystalY = by + floatOffset;

      // Outer glow
      g.circle(bx, crystalY, 22).fill({ color: 0x4488ff, alpha: 0.04 + Math.sin(t * 2 + ci) * 0.02 });
      g.circle(bx, crystalY, 14).fill({ color: 0x6644cc, alpha: 0.08 + Math.sin(t * 3 + ci) * 0.03 });

      // Crystal diamond shape (rotated square)
      const cs = 8;
      for (let v = 0; v < 4; v++) {
        const a1 = rot + v * Math.PI / 2;
        const a2 = rot + (v + 1) * Math.PI / 2;
        g.moveTo(bx + Math.cos(a1) * cs, crystalY + Math.sin(a1) * cs)
          .lineTo(bx + Math.cos(a2) * cs, crystalY + Math.sin(a2) * cs)
          .stroke({ color: 0x88aaff, width: 1.5, alpha: 0.7 });
        // Inner facet
        g.moveTo(bx, crystalY)
          .lineTo(bx + Math.cos(a1) * cs, crystalY + Math.sin(a1) * cs)
          .stroke({ color: 0x6644cc, width: 0.8, alpha: 0.4 });
      }
      // Crystal core
      g.circle(bx, crystalY, 3).fill({ color: 0x88ccff, alpha: 0.8 });
      g.circle(bx, crystalY, 5).fill({ color: 0x4488ff, alpha: 0.25 });
      // Light rays emanating from crystal
      for (let ray = 0; ray < 6; ray++) {
        const rayA = t * 0.6 + ci * 1.2 + ray * Math.PI / 3;
        const rayLen = 12 + Math.sin(t * 2 + ray + ci) * 4;
        g.moveTo(bx, crystalY)
          .lineTo(bx + Math.cos(rayA) * rayLen, crystalY + Math.sin(rayA) * rayLen)
          .stroke({ color: 0x88ccff, width: 0.8, alpha: 0.15 + Math.sin(t * 3 + ray) * 0.05 });
      }
      // Orbiting sparkle motes
      for (let mi = 0; mi < 3; mi++) {
        const mAngle = t * 2 + ci * 2 + mi * Math.PI * 2 / 3;
        const mDist = 16 + Math.sin(t * 1.5 + mi) * 3;
        const mx = bx + Math.cos(mAngle) * mDist;
        const my = crystalY + Math.sin(mAngle) * mDist;
        g.circle(mx, my, 1).fill({ color: 0xaaddff, alpha: 0.4 + Math.sin(t * 4 + mi * 2) * 0.2 });
      }
    }
  }

  // Rotating temporal rune helper (hourglass/clock shape)
  private _drawTemporalRune(g: Graphics, x: number, y: number, size: number, color: number, alpha: number, rot: number): void {
    // Rotating diamond
    for (let v = 0; v < 4; v++) {
      const a1 = rot * 0.4 + v * Math.PI / 2;
      const a2 = rot * 0.4 + (v + 1) * Math.PI / 2;
      g.moveTo(x + Math.cos(a1) * size, y + Math.sin(a1) * size)
        .lineTo(x + Math.cos(a2) * size, y + Math.sin(a2) * size)
        .stroke({ color, width: 0.8, alpha });
    }
    // Center dot
    g.circle(x, y, size * 0.35).fill({ color, alpha: alpha * 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Blood stains
  // ---------------------------------------------------------------------------
  private _drawBloodStains(g: Graphics, state: CMState): void {
    for (const bs of state.bloodStains) {
      // Temporal residue — purple-blue stains with crystalline fragments
      g.circle(bs.x, bs.y, bs.size).fill({ color: 0x1a0033, alpha: bs.alpha * 0.45 });
      g.circle(bs.x, bs.y, bs.size * 0.65).fill({ color: 0x110022, alpha: bs.alpha * 0.3 });
      // Splatter fragments
      for (let si = 0; si < 4; si++) {
        const sa = si * Math.PI / 2 + bs.x * 0.1;
        const sd = bs.size * 0.5 + si * 1.5;
        g.circle(bs.x + Math.cos(sa) * sd, bs.y + Math.sin(sa) * sd, 1.5)
          .fill({ color: 0x220044, alpha: bs.alpha * 0.2 });
      }
      // Faint energy residue
      g.circle(bs.x, bs.y, bs.size * 0.3).fill({ color: 0x4422aa, alpha: bs.alpha * 0.1 });
    }
  }

  // ---------------------------------------------------------------------------
  // Arena hazards — temporal rifts, accelerators, void wells
  // ---------------------------------------------------------------------------
  private _drawHazards(g: Graphics, state: CMState): void {
    const hazards = (state as unknown as Record<string, unknown>).arenaHazards as Array<{
      x: number; y: number; kind: string; radius: number; active: boolean; life: number; maxLife: number;
    }> | undefined;
    if (!hazards || hazards.length === 0) return;
    const t = state.time;

    for (const h of hazards) {
      const lifeRatio = h.life / h.maxLife;

      if (h.kind === "temporal_rift") {
        // Purple swirling rift — dangerous
        g.circle(h.x, h.y, h.radius).fill({ color: 0x220044, alpha: (h.active ? 0.15 : 0.05) * lifeRatio });
        if (h.active) {
          // Pulsing danger zone
          const pulse = 0.4 + Math.sin(t * 6) * 0.15;
          g.circle(h.x, h.y, h.radius).stroke({ color: 0xff22aa, width: 2, alpha: pulse * lifeRatio });
          g.circle(h.x, h.y, h.radius * 0.6).stroke({ color: 0xcc00ff, width: 1.5, alpha: pulse * 0.6 * lifeRatio });
          // Swirling particles
          for (let pi = 0; pi < 6; pi++) {
            const pa = t * 3 + pi * Math.PI / 3;
            const pr = h.radius * (0.3 + (t * 0.5 + pi * 0.2) % 0.7);
            g.circle(h.x + Math.cos(pa) * pr, h.y + Math.sin(pa) * pr, 1.5)
              .fill({ color: 0xff44cc, alpha: 0.5 * lifeRatio });
          }
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x6622aa, width: 1, alpha: 0.2 * lifeRatio });
        }
        // Warning symbol at center
        g.moveTo(h.x, h.y - 6).lineTo(h.x - 5, h.y + 4).lineTo(h.x + 5, h.y + 4).closePath()
          .stroke({ color: 0xff22aa, width: 1.5, alpha: (h.active ? 0.6 : 0.2) * lifeRatio });

      } else if (h.kind === "time_accelerator") {
        // Green speed zone
        g.circle(h.x, h.y, h.radius).fill({ color: 0x004422, alpha: (h.active ? 0.1 : 0.04) * lifeRatio });
        if (h.active) {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x44ff88, width: 2, alpha: 0.4 * lifeRatio });
          // Speed arrows (chevrons pointing outward)
          for (let ai = 0; ai < 4; ai++) {
            const aa = t * 1.5 + ai * Math.PI / 2;
            const ax = h.x + Math.cos(aa) * h.radius * 0.5;
            const ay = h.y + Math.sin(aa) * h.radius * 0.5;
            // Chevron >>
            g.moveTo(ax + Math.cos(aa) * 3, ay + Math.sin(aa) * 3)
              .lineTo(ax + Math.cos(aa + 2.5) * 5, ay + Math.sin(aa + 2.5) * 5)
              .stroke({ color: 0x44ff88, width: 1.5, alpha: 0.5 * lifeRatio });
            g.moveTo(ax + Math.cos(aa) * 3, ay + Math.sin(aa) * 3)
              .lineTo(ax + Math.cos(aa - 2.5) * 5, ay + Math.sin(aa - 2.5) * 5)
              .stroke({ color: 0x44ff88, width: 1.5, alpha: 0.5 * lifeRatio });
          }
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x226644, width: 1, alpha: 0.15 * lifeRatio });
        }

      } else if (h.kind === "void_well") {
        // Dark gravitational well — pulls things in
        g.circle(h.x, h.y, h.radius).fill({ color: 0x000022, alpha: (h.active ? 0.2 : 0.06) * lifeRatio });
        if (h.active) {
          // Inward spiraling rings
          for (let ri = 0; ri < 3; ri++) {
            const rr = h.radius * (0.3 + ri * 0.25) + Math.sin(t * 2 + ri) * 3;
            g.circle(h.x, h.y, rr).stroke({ color: 0x4422cc, width: 1.5, alpha: 0.3 * lifeRatio * (1 - ri * 0.25) });
          }
          // Inward flowing particles
          for (let pi = 0; pi < 8; pi++) {
            const pa = t * -2 + pi * Math.PI / 4; // negative = inward spiral
            const pd = h.radius * ((t * 0.8 + pi * 0.15) % 1);
            const pAlpha = (1 - pd / h.radius) * 0.4;
            g.circle(h.x + Math.cos(pa) * pd, h.y + Math.sin(pa) * pd, 1.2)
              .fill({ color: 0x6644ff, alpha: pAlpha * lifeRatio });
          }
          // Dark core
          g.circle(h.x, h.y, 5).fill({ color: 0x000000, alpha: 0.7 * lifeRatio });
          g.circle(h.x, h.y, 3).fill({ color: 0x2211aa, alpha: 0.5 * lifeRatio });
        } else {
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x221166, width: 1, alpha: 0.1 * lifeRatio });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Time zones — clock-face circles that slow/affect enemies
  // ---------------------------------------------------------------------------
  private _drawTimeZones(g: Graphics, state: CMState): void {
    const t = state.time;
    const zoneColors: Record<string, number> = {
      pulse: 0x4488ff,
      echo_blast: 0x44aaff,
      chrono_field: 0x6644cc,
    };
    for (const tz of state.timeZones) {
      const lifeRatio = tz.life / tz.maxLife;
      const color = zoneColors[tz.kind] ?? 0x4488ff;
      const pulseFactor = 0.5 + Math.sin(t * 4 + tz.x * 0.1) * 0.12;

      // Outer fill
      g.circle(tz.x, tz.y, tz.radius).fill({ color, alpha: 0.04 * lifeRatio });
      // Pulsing edge
      g.circle(tz.x, tz.y, tz.radius * pulseFactor + tz.radius * (1 - pulseFactor)).stroke({
        color, width: 2.5, alpha: 0.35 * lifeRatio,
      });
      // Secondary ring
      g.circle(tz.x, tz.y, tz.radius * 0.7).stroke({ color: 0xaaccff, width: 1, alpha: 0.15 * lifeRatio });

      // Clock face inner markings
      for (let hi = 0; hi < 12; hi++) {
        const a = -Math.PI / 2 + (hi / 12) * Math.PI * 2;
        const isMain = hi % 3 === 0;
        const innerR = tz.radius * 0.82;
        const outerR = tz.radius * (isMain ? 0.96 : 0.91);
        g.moveTo(tz.x + Math.cos(a) * innerR, tz.y + Math.sin(a) * innerR)
          .lineTo(tz.x + Math.cos(a) * outerR, tz.y + Math.sin(a) * outerR)
          .stroke({ color: 0xffffff, width: isMain ? 1.5 : 0.8, alpha: 0.2 * lifeRatio });
      }

      // Rotating clock hands
      const secondAngle = -Math.PI / 2 + t * Math.PI * 2 * 2; // fast second hand
      const minuteAngle = -Math.PI / 2 + t * Math.PI * 2 * 0.1;
      // Minute hand
      g.moveTo(tz.x, tz.y)
        .lineTo(tz.x + Math.cos(minuteAngle) * tz.radius * 0.55, tz.y + Math.sin(minuteAngle) * tz.radius * 0.55)
        .stroke({ color: 0xaaaaff, width: 1.5, alpha: 0.4 * lifeRatio });
      // Second hand (faster, thinner)
      g.moveTo(tz.x, tz.y)
        .lineTo(tz.x + Math.cos(secondAngle) * tz.radius * 0.72, tz.y + Math.sin(secondAngle) * tz.radius * 0.72)
        .stroke({ color, width: 1, alpha: 0.5 * lifeRatio });
      // Center dot
      g.circle(tz.x, tz.y, 2.5).fill({ color, alpha: 0.7 * lifeRatio });

      // Inward-flowing particles (simulated using rotating arcs)
      for (let pi = 0; pi < 6; pi++) {
        const pAngle = (t * 1.5 + pi * Math.PI / 3) % (Math.PI * 2);
        const pDist = tz.radius * (0.6 - (t * 0.4 + pi * 0.2) % 0.6);
        g.circle(tz.x + Math.cos(pAngle) * pDist, tz.y + Math.sin(pAngle) * pDist, 1.2)
          .fill({ color, alpha: 0.3 * lifeRatio });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Temporal echoes — fading player silhouettes that explode
  // ---------------------------------------------------------------------------
  private _drawTemporalEchoes(g: Graphics, state: CMState): void {
    const t = state.time;
    for (const echo of state.temporalEchoes) {
      const lifeRatio = echo.life / echo.maxLife;
      const alpha = (1 - lifeRatio) * 0.85; // brightest just before exploding
      const aboutToExplode = lifeRatio < 0.2;
      const flashAlpha = aboutToExplode ? (0.5 + Math.sin(t * 25) * 0.4) : alpha;

      // Expanding concentric rings
      for (let ri = 0; ri < 3; ri++) {
        const ringR = echo.explodeRadius * (0.3 + ri * 0.25) * (1 - lifeRatio);
        g.circle(echo.x, echo.y, ringR).stroke({
          color: 0x44aaff, width: 1.5, alpha: flashAlpha * (1 - ri * 0.3) * 0.4,
        });
      }

      // Player silhouette (mage-like circle with hood)
      const pr = state.playerRadius;
      g.circle(echo.x, echo.y, pr + 2).fill({ color: 0x4488ff, alpha: flashAlpha * 0.6 });
      g.circle(echo.x, echo.y, pr).fill({ color: 0x6644cc, alpha: flashAlpha * 0.5 });
      // Hood triangle
      g.moveTo(echo.x - pr * 0.6, echo.y - pr * 0.5)
        .lineTo(echo.x, echo.y - pr * 1.5)
        .lineTo(echo.x + pr * 0.6, echo.y - pr * 0.5)
        .closePath()
        .fill({ color: 0x3322aa, alpha: flashAlpha * 0.5 });

      // Ripple effect
      const rippleR = echo.explodeRadius * (1 - lifeRatio * 0.5);
      g.circle(echo.x, echo.y, rippleR).stroke({ color: 0x44aaff, width: 2, alpha: flashAlpha * 0.25 });

      // Pre-explosion warning particles radiating outward
      if (aboutToExplode) {
        for (let wi = 0; wi < 8; wi++) {
          const wa = (wi / 8) * Math.PI * 2 + t * 6;
          const wd = echo.explodeRadius * 0.4 * (1 - lifeRatio);
          g.circle(echo.x + Math.cos(wa) * wd, echo.y + Math.sin(wa) * wd, 1.5)
            .fill({ color: 0x88ddff, alpha: 0.5 * (1 - lifeRatio) });
        }
        // Inner energy build-up
        g.circle(echo.x, echo.y, echo.explodeRadius * 0.3 * (1 - lifeRatio))
          .fill({ color: 0x44aaff, alpha: 0.12 * (1 - lifeRatio) });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------
  private _drawPickups(g: Graphics, state: CMState): void {
    const t = state.time;
    for (const pk of state.pickups) {
      const bob = Math.sin(t * 2.5 + pk.x * 0.1) * 3;
      const glow = 0.3 + Math.sin(t * 3 + pk.x * 0.05) * 0.1;
      const py = pk.y + bob;
      const lifeRatio = Math.min(1, pk.life / 2); // fade in last 2s

      if (pk.kind === "health") {
        // Red-pink health orb with cross
        g.circle(pk.x, py, pk.radius + 6).fill({ color: 0xff2244, alpha: 0.06 * lifeRatio });
        g.circle(pk.x, py, pk.radius + 3).fill({ color: 0xff3355, alpha: 0.12 * lifeRatio });
        g.circle(pk.x, py, pk.radius).fill({ color: 0xff4466, alpha: 0.85 * lifeRatio });
        g.circle(pk.x, py, pk.radius * 0.6).fill({ color: 0xff8899, alpha: 0.4 * lifeRatio });
        // Cross symbol
        const cs = pk.radius * 0.5;
        g.moveTo(pk.x - cs, py).lineTo(pk.x + cs, py)
          .stroke({ color: 0xffffff, width: 2.5, alpha: 0.9 * lifeRatio });
        g.moveTo(pk.x, py - cs).lineTo(pk.x, py + cs)
          .stroke({ color: 0xffffff, width: 2.5, alpha: 0.9 * lifeRatio });
        // Sparkle ring
        g.circle(pk.x, py, pk.radius + 1).stroke({ color: 0xffaabb, width: 1, alpha: (0.4 + Math.sin(t * 6) * 0.2) * lifeRatio });
        // Orbiting sparkle
        const sparkA = t * 3;
        g.circle(pk.x + Math.cos(sparkA) * (pk.radius + 3), py + Math.sin(sparkA) * (pk.radius + 3), 1)
          .fill({ color: 0xffffff, alpha: 0.6 * lifeRatio });
      } else if (pk.kind === "chrono_charge") {
        // Cyan temporal charge — animated clock
        g.circle(pk.x, py, pk.radius + 7).fill({ color: 0x22ffaa, alpha: 0.05 * lifeRatio + glow * 0.03 });
        g.circle(pk.x, py, pk.radius + 3).fill({ color: 0x00cc88, alpha: 0.1 * lifeRatio });
        g.circle(pk.x, py, pk.radius).fill({ color: 0x00ddaa, alpha: 0.85 * lifeRatio });
        g.circle(pk.x, py, pk.radius * 0.7).fill({ color: 0x44ffcc, alpha: 0.35 * lifeRatio });
        g.circle(pk.x, py, pk.radius).stroke({ color: 0x22ffaa, width: 1.5, alpha: 0.7 * lifeRatio });
        // Clock face tick marks
        for (let ci = 0; ci < 8; ci++) {
          const ca = ci * Math.PI / 4;
          const innerR = pk.radius * 0.6;
          const outerR = pk.radius * 0.85;
          g.moveTo(pk.x + Math.cos(ca) * innerR, py + Math.sin(ca) * innerR)
            .lineTo(pk.x + Math.cos(ca) * outerR, py + Math.sin(ca) * outerR)
            .stroke({ color: 0xffffff, width: 0.8, alpha: 0.5 * lifeRatio });
        }
        // Animated clock hands
        const hourA = t * 0.8;
        const minA = t * 3;
        g.moveTo(pk.x, py)
          .lineTo(pk.x + Math.cos(hourA) * pk.radius * 0.45, py + Math.sin(hourA) * pk.radius * 0.45)
          .stroke({ color: 0xffffff, width: 1.2, alpha: 0.8 * lifeRatio });
        g.moveTo(pk.x, py)
          .lineTo(pk.x + Math.cos(minA) * pk.radius * 0.65, py + Math.sin(minA) * pk.radius * 0.65)
          .stroke({ color: 0x88ffdd, width: 0.8, alpha: 0.7 * lifeRatio });
        g.circle(pk.x, py, 1.5).fill({ color: 0xffffff, alpha: 0.9 * lifeRatio });
      } else {
        // Score orb — golden with rotating facets
        g.circle(pk.x, py, pk.radius + 6).fill({ color: 0xffd700, alpha: 0.06 * lifeRatio + glow * 0.03 });
        g.circle(pk.x, py, pk.radius + 2).fill({ color: 0xffaa00, alpha: 0.1 * lifeRatio });
        g.circle(pk.x, py, pk.radius).fill({ color: 0xffaa00, alpha: 0.9 * lifeRatio });
        g.circle(pk.x, py, pk.radius * 0.65).fill({ color: 0xffcc44, alpha: 0.55 * lifeRatio });
        g.circle(pk.x, py, pk.radius * 0.3).fill({ color: 0xffffff, alpha: 0.45 * lifeRatio });
        // Rotating facet highlights
        for (let fi = 0; fi < 3; fi++) {
          const fa = t * 2 + fi * Math.PI * 2 / 3;
          const fx = pk.x + Math.cos(fa) * pk.radius * 0.45;
          const fy = py + Math.sin(fa) * pk.radius * 0.45;
          g.circle(fx, fy, 1).fill({ color: 0xffffff, alpha: 0.5 * lifeRatio });
        }
        // Sparkle ring
        g.circle(pk.x, py, pk.radius).stroke({ color: 0xffdd88, width: 1, alpha: (0.3 + Math.sin(t * 5) * 0.15) * lifeRatio });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies — type-specific visuals with status effects
  // ---------------------------------------------------------------------------
  private _drawEnemies(g: Graphics, state: CMState): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive) continue;

      // Spawn portal effect
      if (e.spawnTimer > 0) {
        const spawnRatio = Math.min(1, e.spawnTimer / 0.6);
        const portalR = e.radius * 2.5;
        // Outer glow
        g.circle(e.x, e.y, portalR + 5).fill({ color: 0x4422aa, alpha: spawnRatio * 0.08 });
        g.circle(e.x, e.y, portalR).fill({ color: 0x6644cc, alpha: spawnRatio * 0.2 });
        // Swirling outer ring segments
        const segments = 16;
        for (let si = 0; si < segments; si++) {
          const a1 = t * 5 + si * Math.PI * 2 / segments;
          const a2 = t * 5 + (si + 1) * Math.PI * 2 / segments;
          const segAlpha = spawnRatio * (0.3 + Math.sin(t * 8 + si * 2) * 0.2);
          g.moveTo(e.x + Math.cos(a1) * portalR, e.y + Math.sin(a1) * portalR)
            .lineTo(e.x + Math.cos(a2) * portalR, e.y + Math.sin(a2) * portalR)
            .stroke({ color: 0x8866ff, width: 2.5, alpha: segAlpha });
        }
        // Counter-rotating inner ring
        for (let si = 0; si < 10; si++) {
          const a1 = -t * 7 + si * Math.PI * 2 / 10;
          const a2 = -t * 7 + (si + 1) * Math.PI * 2 / 10;
          const innerR = portalR * 0.55;
          g.moveTo(e.x + Math.cos(a1) * innerR, e.y + Math.sin(a1) * innerR)
            .lineTo(e.x + Math.cos(a2) * innerR, e.y + Math.sin(a2) * innerR)
            .stroke({ color: 0x4488ff, width: 1.5, alpha: spawnRatio * 0.4 });
        }
        // Inward flowing energy particles
        for (let pi = 0; pi < 8; pi++) {
          const pa = t * 4 + pi * Math.PI / 4;
          const pd = portalR * ((t * 2 + pi * 0.3) % 1);
          const pAlpha = (1 - pd / portalR) * spawnRatio * 0.5;
          g.circle(e.x + Math.cos(pa) * pd, e.y + Math.sin(pa) * pd, 1.5)
            .fill({ color: 0xaa88ff, alpha: pAlpha });
        }
        // Center flash
        const centerPulse = 0.3 + Math.sin(t * 10) * 0.15;
        g.circle(e.x, e.y, portalR * 0.25).fill({ color: 0xffffff, alpha: spawnRatio * centerPulse });
        g.circle(e.x, e.y, portalR * 0.15).fill({ color: 0xddaaff, alpha: spawnRatio * 0.5 });
      }

      const flash = e.flashTimer > 0 && Math.sin(t * 30) > 0;
      const bodyAlpha = flash ? 1 : 0.88;

      // Slow effect — temporal distortion afterimages and blue tint
      if (e.slowTimer > 0 && e.slowFactor < 0.8) {
        const slowIntensity = 1 - e.slowFactor; // higher = more slowed
        // Multiple trailing afterimages in arc behind movement
        for (let tr = 1; tr <= 4; tr++) {
          const trAngle = Math.atan2(state.playerY - e.y, state.playerX - e.x) + Math.PI;
          const trOff = tr * 4 * slowIntensity;
          const trX = e.x + Math.cos(trAngle) * trOff + Math.sin(t * 3 + tr) * 1.5;
          const trY = e.y + Math.sin(trAngle) * trOff + Math.cos(t * 3 + tr) * 1.5;
          g.circle(trX, trY, e.radius * (1 - tr * 0.15))
            .fill({ color: 0x4488ff, alpha: 0.1 * (1 - tr * 0.2) * slowIntensity });
        }
        // Temporal distortion ring
        g.circle(e.x, e.y, e.radius + 3).stroke({
          color: 0x4488ff, width: 1, alpha: 0.15 * slowIntensity + Math.sin(t * 5) * 0.05,
        });
      }

      // Frozen effect — crystalline time-stop shell
      if (e.frozenTimer > 0) {
        // Outer frost aura
        g.circle(e.x, e.y, e.radius + 8).fill({ color: 0x88ccff, alpha: 0.1 });
        // Ice shell
        g.circle(e.x, e.y, e.radius + 5).fill({ color: 0x99ddff, alpha: 0.2 });
        g.circle(e.x, e.y, e.radius + 5).stroke({ color: 0xbbeeFF, width: 2.5, alpha: 0.55 });
        // Inner frost pattern
        g.circle(e.x, e.y, e.radius + 2).stroke({ color: 0xddeeff, width: 1, alpha: 0.3 });
        // Crystal shards radiating outward
        for (let ic = 0; ic < 8; ic++) {
          const ia = ic * Math.PI / 4 + t * 0.15;
          const shardLen = 5 + Math.sin(t * 0.5 + ic * 2) * 2;
          g.moveTo(e.x + Math.cos(ia) * (e.radius + 2), e.y + Math.sin(ia) * (e.radius + 2))
            .lineTo(e.x + Math.cos(ia) * (e.radius + 2 + shardLen), e.y + Math.sin(ia) * (e.radius + 2 + shardLen))
            .stroke({ color: 0xcceeFF, width: 1.5, alpha: 0.5 + Math.sin(t + ic) * 0.15 });
          // Shard tip sparkle
          g.circle(e.x + Math.cos(ia) * (e.radius + 2 + shardLen), e.y + Math.sin(ia) * (e.radius + 2 + shardLen), 1)
            .fill({ color: 0xffffff, alpha: 0.4 + Math.sin(t * 3 + ic) * 0.2 });
        }
        // "STOPPED" clock icon
        const clockX = e.x, clockY = e.y - e.radius - 16;
        g.circle(clockX, clockY, 4).stroke({ color: 0x88ddff, width: 1, alpha: 0.5 });
        // Frozen clock hands (not moving)
        g.moveTo(clockX, clockY).lineTo(clockX + 2, clockY - 2)
          .stroke({ color: 0xaaeeff, width: 1, alpha: 0.6 });
        g.moveTo(clockX, clockY).lineTo(clockX + 1, clockY + 1.5)
          .stroke({ color: 0xaaeeff, width: 0.8, alpha: 0.4 });
      }

      // Shadow
      g.ellipse(e.x + 2, e.y + 3, e.radius * 1.1, e.radius * 0.4).fill({ color: 0x000000, alpha: 0.18 });

      const toPlayer = Math.atan2(state.playerY - e.y, state.playerX - e.x);

      // Type-specific visuals
      if (e.kind === "footman") {
        this._drawFootman(g, e, flash, bodyAlpha, toPlayer, t);
      } else if (e.kind === "archer") {
        this._drawArcher(g, e, flash, bodyAlpha, toPlayer, t);
      } else if (e.kind === "shieldbearer") {
        this._drawShieldbearer(g, e, flash, bodyAlpha, toPlayer, t);
      } else if (e.kind === "chrono_knight") {
        this._drawChronoKnight(g, e, flash, bodyAlpha, toPlayer, t);
      } else if (e.kind === "time_wraith") {
        this._drawTimeWraith(g, e, flash, bodyAlpha, toPlayer, t);
      }

      // Elite gold border
      if (e.elite) {
        g.circle(e.x, e.y, e.radius + 4).stroke({
          color: 0xffd700, width: 2, alpha: 0.55 + Math.sin(t * 3) * 0.2,
        });
        g.circle(e.x, e.y, e.radius + 8).stroke({ color: 0xffaa00, width: 1, alpha: 0.15 });
      }

      // Slow blue tint overlay
      if (e.slowTimer > 0 && e.frozenTimer <= 0) {
        const slowAlpha = (1 - e.slowFactor) * 0.25 * Math.min(1, e.slowTimer);
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x4488ff, alpha: slowAlpha });
      }

      // Attack telegraph — warning indicators when enemy is about to attack
      if (e.state === "attack" && e.stateTimer > 0) {
        // Red flash ring
        const atkProg = 1 - e.stateTimer / 0.4; // 0 to 1 during attack windup
        const atkAlpha = 0.4 + atkProg * 0.3;
        g.circle(e.x, e.y, e.radius + 6 + atkProg * 4).stroke({
          color: 0xff2244, width: 2, alpha: atkAlpha,
        });
        // Aim line toward player
        const aimLen = 15 + atkProg * 10;
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toPlayer) * aimLen, e.y + Math.sin(toPlayer) * aimLen)
          .stroke({ color: 0xff4444, width: 1.5, alpha: atkAlpha * 0.6 });
      }

      // Archer fire telegraph — shows when archer is about to shoot
      if (e.kind === "archer" && e.fireTimer < 0.5 && e.fireTimer > 0) {
        const fireProg = 1 - e.fireTimer / 0.5;
        // Glowing arrow nock
        g.circle(e.x + Math.cos(toPlayer) * (e.radius + 4), e.y + Math.sin(toPlayer) * (e.radius + 4), 2 + fireProg * 2)
          .fill({ color: 0xff8822, alpha: 0.4 + fireProg * 0.4 });
        // Aim line
        g.moveTo(e.x, e.y)
          .lineTo(e.x + Math.cos(toPlayer) * (20 + fireProg * 15), e.y + Math.sin(toPlayer) * (20 + fireProg * 15))
          .stroke({ color: 0xff8822, width: 1, alpha: 0.3 + fireProg * 0.3 });
      }

      // HP bar above — with border and gradient feel
      const barW = e.radius * 2.8, barH = 3.5;
      const barX = e.x - barW / 2, barY = e.y - e.radius - 12;
      // Dark background
      g.rect(barX - 1, barY - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.7 });
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      const hpColor = hpRatio > 0.6 ? 0x44cc44 : hpRatio > 0.3 ? 0xccaa22 : 0xcc2222;
      // HP fill
      g.rect(barX, barY, barW * hpRatio, barH).fill({ color: hpColor, alpha: 0.85 });
      // Bright highlight on top half of HP bar
      g.rect(barX, barY, barW * hpRatio, barH * 0.4).fill({ color: 0xffffff, alpha: 0.12 });
      // Border
      g.rect(barX - 1, barY - 1, barW + 2, barH + 2).stroke({ color: 0x334455, width: 0.5, alpha: 0.5 });
      // Elite crown pip above HP bar
      if (e.elite) {
        g.moveTo(e.x - 4, barY - 4).lineTo(e.x, barY - 8).lineTo(e.x + 4, barY - 4)
          .closePath().fill({ color: 0xffd700, alpha: 0.65 });
      }
    }
  }

  // Enemy sub-drawers
  private _drawFootman(g: Graphics, e: { x: number; y: number; radius: number }, flash: boolean, alpha: number, toPlayer: number, t: number): void {
    const color = flash ? 0xffffff : 0x886644;
    const r = e.radius;
    // Ground contact shadow ring
    g.circle(e.x, e.y, r + 1).fill({ color: 0x443322, alpha: alpha * 0.15 });
    // Body — layered armor
    g.circle(e.x, e.y, r).fill({ color, alpha });
    g.circle(e.x, e.y, r * 0.75).fill({ color: flash ? 0xffffff : 0x9a7755, alpha: alpha * 0.7 });
    g.circle(e.x, e.y, r * 0.45).fill({ color: flash ? 0xffffff : 0xb08866, alpha: alpha * 0.5 });
    // Armor rim highlight
    g.circle(e.x - r * 0.15, e.y - r * 0.2, r * 0.3).fill({ color: 0xccaa88, alpha: alpha * 0.15 });
    // Helmet visor — small dark slit facing player
    const visorX = e.x + Math.cos(toPlayer) * r * 0.35;
    const visorY = e.y + Math.sin(toPlayer) * r * 0.35;
    g.circle(visorX, visorY, 1.5).fill({ color: 0x221100, alpha: alpha * 0.8 });
    // Shield — thick arc on front
    for (let si = 0; si < 7; si++) {
      const sa1 = toPlayer - 0.7 + (si / 7) * 1.4;
      const sa2 = toPlayer - 0.7 + ((si + 1) / 7) * 1.4;
      const shR = r + 4;
      g.moveTo(e.x + Math.cos(sa1) * shR, e.y + Math.sin(sa1) * shR)
        .lineTo(e.x + Math.cos(sa2) * shR, e.y + Math.sin(sa2) * shR)
        .stroke({ color: flash ? 0xffffff : 0xaa8855, width: 2.5, alpha: alpha * 0.75 });
    }
    // Shield boss (center dot)
    const shCX = e.x + Math.cos(toPlayer) * (r + 3);
    const shCY = e.y + Math.sin(toPlayer) * (r + 3);
    g.circle(shCX, shCY, 2).fill({ color: 0xccaa77, alpha: alpha * 0.6 });
    // Sword — gleaming blade on the opposite side
    const swordAngle = toPlayer + Math.PI + Math.sin(t * 3) * 0.2;
    const sBase = r * 0.5;
    const sLen = r + 10;
    g.moveTo(e.x + Math.cos(swordAngle) * sBase, e.y + Math.sin(swordAngle) * sBase)
      .lineTo(e.x + Math.cos(swordAngle) * sLen, e.y + Math.sin(swordAngle) * sLen)
      .stroke({ color: 0xcccccc, width: 2, alpha: alpha * 0.8 });
    // Blade edge highlight
    g.moveTo(e.x + Math.cos(swordAngle) * (sLen - 3), e.y + Math.sin(swordAngle) * (sLen - 3))
      .lineTo(e.x + Math.cos(swordAngle) * sLen, e.y + Math.sin(swordAngle) * sLen)
      .stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.5 });
    // Crossguard
    const cgX = e.x + Math.cos(swordAngle) * (sBase + 2);
    const cgY = e.y + Math.sin(swordAngle) * (sBase + 2);
    const perpA = swordAngle + Math.PI / 2;
    g.moveTo(cgX + Math.cos(perpA) * 4, cgY + Math.sin(perpA) * 4)
      .lineTo(cgX - Math.cos(perpA) * 4, cgY - Math.sin(perpA) * 4)
      .stroke({ color: 0xaa8844, width: 1.5, alpha: alpha * 0.6 });
  }

  private _drawArcher(g: Graphics, e: { x: number; y: number; radius: number }, flash: boolean, alpha: number, toPlayer: number, t: number): void {
    const color = flash ? 0xffffff : 0x4a3a22;
    const r = e.radius;
    // Body — leather-clad
    g.circle(e.x, e.y, r + 1).fill({ color: 0x2a1a0a, alpha: alpha * 0.3 });
    g.circle(e.x, e.y, r).fill({ color, alpha });
    g.circle(e.x, e.y, r * 0.65).fill({ color: flash ? 0xffffff : 0x5c4830, alpha: alpha * 0.6 });
    // Hood/cap
    g.moveTo(e.x - r * 0.5, e.y - r * 0.3)
      .lineTo(e.x, e.y - r * 1.1)
      .lineTo(e.x + r * 0.5, e.y - r * 0.3)
      .closePath()
      .fill({ color: flash ? 0xdddddd : 0x3a2a18, alpha: alpha * 0.7 });
    // Quiver on back (opposite to aim)
    const backA = toPlayer + Math.PI;
    const qx = e.x + Math.cos(backA) * r * 0.8;
    const qy = e.y + Math.sin(backA) * r * 0.8;
    g.rect(qx - 2, qy - 4, 4, 8).fill({ color: 0x554422, alpha: alpha * 0.5 });
    // Arrow tips poking out of quiver
    for (let ai = 0; ai < 3; ai++) {
      g.moveTo(qx - 1 + ai, qy - 4)
        .lineTo(qx - 1 + ai, qy - 7)
        .stroke({ color: 0x888888, width: 0.8, alpha: alpha * 0.5 });
    }
    // Bow — curved arc with string
    const bowR = r + 8;
    const bowSpread = 0.8;
    const blx = e.x + Math.cos(toPlayer - bowSpread) * bowR;
    const bly = e.y + Math.sin(toPlayer - bowSpread) * bowR;
    const brx = e.x + Math.cos(toPlayer + bowSpread) * bowR;
    const bry = e.y + Math.sin(toPlayer + bowSpread) * bowR;
    const bmx = e.x + Math.cos(toPlayer) * (bowR + 3);
    const bmy = e.y + Math.sin(toPlayer) * (bowR + 3);
    // Bow limbs (curved via midpoint)
    g.moveTo(blx, bly).lineTo(bmx, bmy).stroke({ color: 0x886633, width: 2, alpha: alpha * 0.8 });
    g.moveTo(brx, bry).lineTo(bmx, bmy).stroke({ color: 0x886633, width: 2, alpha: alpha * 0.8 });
    // Bowstring
    g.moveTo(blx, bly).lineTo(brx, bry).stroke({ color: 0xddcc99, width: 0.8, alpha: alpha * 0.65 });
    // Nocked arrow when about to fire
    const nockGlow = Math.max(0, 0.5 - (e as unknown as Record<string, number>).fireTimer / 1.0);
    if (nockGlow > 0) {
      g.moveTo(e.x, e.y)
        .lineTo(e.x + Math.cos(toPlayer) * (bowR + 6), e.y + Math.sin(toPlayer) * (bowR + 6))
        .stroke({ color: 0xffaa44, width: 1.5, alpha: nockGlow * alpha });
      g.circle(bmx, bmy, 2).fill({ color: 0xffcc44, alpha: nockGlow * alpha * 0.7 });
    }
    void t;
  }

  private _drawShieldbearer(g: Graphics, e: { x: number; y: number; radius: number; shieldAngle: number }, flash: boolean, alpha: number, toPlayer: number, t: number): void {
    const r = e.radius;
    const color = flash ? 0xffffff : 0x556677;
    // Heavy armor body
    g.circle(e.x, e.y, r + 1).fill({ color: 0x334455, alpha: alpha * 0.3 });
    g.circle(e.x, e.y, r).fill({ color, alpha });
    g.circle(e.x, e.y, r * 0.7).fill({ color: flash ? 0xffffff : 0x778899, alpha: alpha * 0.6 });
    g.circle(e.x, e.y, r * 0.4).fill({ color: flash ? 0xffffff : 0x99aabb, alpha: alpha * 0.4 });
    // Armor plate highlights
    g.circle(e.x - r * 0.2, e.y - r * 0.15, r * 0.25).fill({ color: 0xbbccdd, alpha: alpha * 0.12 });
    // Prominent tower shield — wide arc facing player
    const shieldDir = e.shieldAngle !== 0 ? e.shieldAngle : toPlayer;
    const shieldPulse = 0.7 + Math.sin(t * 2.5) * 0.12;
    const shieldR = r + 7;
    // Shield backing (darker)
    for (let si = 0; si < 10; si++) {
      const sa1 = shieldDir - 0.85 + (si / 10) * 1.7;
      const sa2 = shieldDir - 0.85 + ((si + 1) / 10) * 1.7;
      g.moveTo(e.x + Math.cos(sa1) * (shieldR - 1), e.y + Math.sin(sa1) * (shieldR - 1))
        .lineTo(e.x + Math.cos(sa2) * (shieldR - 1), e.y + Math.sin(sa2) * (shieldR - 1))
        .stroke({ color: 0x445566, width: 5, alpha: alpha * 0.5 });
    }
    // Shield face (bright metallic)
    for (let si = 0; si < 10; si++) {
      const sa1 = shieldDir - 0.85 + (si / 10) * 1.7;
      const sa2 = shieldDir - 0.85 + ((si + 1) / 10) * 1.7;
      g.moveTo(e.x + Math.cos(sa1) * shieldR, e.y + Math.sin(sa1) * shieldR)
        .lineTo(e.x + Math.cos(sa2) * shieldR, e.y + Math.sin(sa2) * shieldR)
        .stroke({ color: flash ? 0xffffff : 0xaabbcc, width: 3.5, alpha: alpha * shieldPulse });
    }
    // Shield emblem — small diamond at center of shield arc
    const embX = e.x + Math.cos(shieldDir) * (shieldR + 1);
    const embY = e.y + Math.sin(shieldDir) * (shieldR + 1);
    g.circle(embX, embY, 2.5).fill({ color: 0x8899bb, alpha: alpha * 0.7 });
    g.circle(embX, embY, 4).stroke({ color: 0xaabbdd, width: 0.8, alpha: alpha * 0.4 });
    // Shield glow when blocking (facing player within 90°)
    const angleDiff = Math.abs(shieldDir - toPlayer);
    const normalizedDiff = angleDiff > Math.PI ? Math.PI * 2 - angleDiff : angleDiff;
    if (normalizedDiff < Math.PI / 2) {
      g.circle(e.x + Math.cos(shieldDir) * r, e.y + Math.sin(shieldDir) * r, r + 4)
        .fill({ color: 0x88ccff, alpha: 0.06 + Math.sin(t * 4) * 0.02 });
    }
    // Short mace on opposite side
    const maceAngle = shieldDir + Math.PI;
    g.moveTo(e.x + Math.cos(maceAngle) * r * 0.5, e.y + Math.sin(maceAngle) * r * 0.5)
      .lineTo(e.x + Math.cos(maceAngle) * (r + 8), e.y + Math.sin(maceAngle) * (r + 8))
      .stroke({ color: 0x888888, width: 2, alpha: alpha * 0.65 });
    // Mace head
    g.circle(e.x + Math.cos(maceAngle) * (r + 8), e.y + Math.sin(maceAngle) * (r + 8), 2.5)
      .fill({ color: 0x777788, alpha: alpha * 0.7 });
  }

  private _drawChronoKnight(g: Graphics, e: { x: number; y: number; radius: number }, flash: boolean, alpha: number, toPlayer: number, t: number): void {
    const r = e.radius;
    // Menacing dark aura
    g.circle(e.x, e.y, r + 8).fill({ color: 0x110022, alpha: alpha * 0.12 + Math.sin(t * 2) * 0.03 });
    g.circle(e.x, e.y, r + 4).fill({ color: 0x000010, alpha: alpha * 0.2 });
    // Heavy dark armor body
    g.circle(e.x, e.y, r + 2).fill({ color: 0x0a0a1a, alpha: alpha * 0.6 });
    g.circle(e.x, e.y, r).fill({ color: flash ? 0xffffff : 0x14142a, alpha });
    g.circle(e.x, e.y, r * 0.8).fill({ color: flash ? 0xffffff : 0x1a1a3a, alpha: alpha * 0.7 });
    // Golden accents — ornamental cross pattern
    g.circle(e.x, e.y, r * 0.88).stroke({ color: flash ? 0xffffff : 0xddaa44, width: 1.5, alpha: alpha * 0.55 });
    // Cross emblem on chest
    g.moveTo(e.x - r * 0.25, e.y).lineTo(e.x + r * 0.25, e.y)
      .stroke({ color: 0xddaa44, width: 1.5, alpha: alpha * 0.4 });
    g.moveTo(e.x, e.y - r * 0.25).lineTo(e.x, e.y + r * 0.25)
      .stroke({ color: 0xddaa44, width: 1.5, alpha: alpha * 0.4 });
    // Glowing golden visor
    const eyeX = e.x + Math.cos(toPlayer) * r * 0.4;
    const eyeY = e.y + Math.sin(toPlayer) * r * 0.4;
    g.circle(eyeX, eyeY, 3).fill({ color: 0xffd700, alpha: alpha * 0.9 });
    g.circle(eyeX, eyeY, 5).fill({ color: 0xffaa00, alpha: alpha * 0.2 });
    g.circle(eyeX, eyeY, 8).fill({ color: 0xffd700, alpha: alpha * 0.06 });
    // "No time effects" clock icon — floating above
    const iconX = e.x, iconY = e.y - r - 10;
    // Clock face
    g.circle(iconX, iconY, 5.5).fill({ color: 0x000000, alpha: 0.5 });
    g.circle(iconX, iconY, 5.5).stroke({ color: 0xffd700, width: 1.2, alpha: 0.6 });
    // Clock hands
    const ckA = t * 0.5;
    g.moveTo(iconX, iconY)
      .lineTo(iconX + Math.cos(ckA) * 3.5, iconY + Math.sin(ckA) * 3.5)
      .stroke({ color: 0xffd700, width: 0.8, alpha: 0.5 });
    // X through clock (time immunity)
    g.moveTo(iconX - 3.5, iconY - 3.5).lineTo(iconX + 3.5, iconY + 3.5)
      .stroke({ color: 0xff3344, width: 1.5, alpha: 0.75 });
    g.moveTo(iconX + 3.5, iconY - 3.5).lineTo(iconX - 3.5, iconY + 3.5)
      .stroke({ color: 0xff3344, width: 1.5, alpha: 0.75 });
    // Heavy weapon — greatsword
    const gsAngle = toPlayer + Math.sin(t * 2.5) * 0.15;
    const gsLen = r + 14;
    g.moveTo(e.x + Math.cos(gsAngle) * r * 0.4, e.y + Math.sin(gsAngle) * r * 0.4)
      .lineTo(e.x + Math.cos(gsAngle) * gsLen, e.y + Math.sin(gsAngle) * gsLen)
      .stroke({ color: 0xaaaacc, width: 3, alpha: alpha * 0.75 });
    g.moveTo(e.x + Math.cos(gsAngle) * gsLen, e.y + Math.sin(gsAngle) * gsLen)
      .lineTo(e.x + Math.cos(gsAngle) * (gsLen + 2), e.y + Math.sin(gsAngle) * (gsLen + 2))
      .stroke({ color: 0xffd700, width: 2, alpha: alpha * 0.6 });
  }

  private _drawTimeWraith(g: Graphics, e: { x: number; y: number; radius: number; teleportTimer: number }, flash: boolean, alpha: number, _toPlayer: number, t: number): void {
    const r = e.radius;
    const flicker = 0.4 + Math.sin(t * 8 + e.x * 0.1) * 0.35;
    const aboutToTeleport = e.teleportTimer < 0.5 && e.teleportTimer > 0;
    const baseAlpha = aboutToTeleport ? (0.85 + Math.sin(t * 20) * 0.15) : alpha * flicker;

    // Ghostly trailing afterimages
    for (let tr = 1; tr <= 4; tr++) {
      const trAngle = t * 1.5 + tr * 0.8;
      const trOff = tr * 6;
      const trX = e.x - Math.cos(trAngle) * trOff;
      const trY = e.y - Math.sin(trAngle) * trOff;
      g.circle(trX, trY, r * (1 - tr * 0.18))
        .fill({ color: 0x5522aa, alpha: 0.1 * (1 - tr * 0.22) * flicker });
    }

    // Spectral aura
    g.circle(e.x, e.y, r + 6).fill({ color: 0x4422aa, alpha: baseAlpha * 0.12 });
    g.circle(e.x, e.y, r + 3).fill({ color: 0x6633cc, alpha: baseAlpha * 0.18 });
    // Body — translucent spectral form
    g.circle(e.x, e.y, r).fill({ color: flash ? 0xffffff : 0x7744cc, alpha: baseAlpha * 0.65 });
    g.circle(e.x, e.y, r * 0.7).fill({ color: flash ? 0xffffff : 0x9966ee, alpha: baseAlpha * 0.45 });
    g.circle(e.x, e.y, r * 0.35).fill({ color: 0xcc99ff, alpha: baseAlpha * 0.3 });
    // Phase shimmer ring
    g.circle(e.x, e.y, r + 2).stroke({ color: 0x9955ff, width: 1.5, alpha: baseAlpha * 0.45 + Math.sin(t * 5) * 0.1 });
    // Spectral face — two ghostly eyes
    const eyeDist = r * 0.3;
    g.circle(e.x - eyeDist * 0.5, e.y - eyeDist * 0.3, 1.5).fill({ color: 0xddbbff, alpha: baseAlpha * 0.8 });
    g.circle(e.x + eyeDist * 0.5, e.y - eyeDist * 0.3, 1.5).fill({ color: 0xddbbff, alpha: baseAlpha * 0.8 });
    // Wispy tendrils trailing downward
    for (let wi = 0; wi < 3; wi++) {
      const wAngle = Math.PI * 0.5 + (wi - 1) * 0.4 + Math.sin(t * 3 + wi) * 0.2;
      const wLen = r * 1.5 + Math.sin(t * 4 + wi * 2) * r * 0.3;
      let prevWX = e.x, prevWY = e.y + r * 0.3;
      for (let seg = 1; seg <= 4; seg++) {
        const segFrac = seg / 4;
        const wx = prevWX + Math.cos(wAngle) * wLen * 0.25 + Math.sin(t * 5 + wi + seg) * 2;
        const wy = prevWY + Math.sin(wAngle) * wLen * 0.25;
        g.moveTo(prevWX, prevWY).lineTo(wx, wy)
          .stroke({ color: 0x8855cc, width: 1.5 * (1 - segFrac * 0.5), alpha: baseAlpha * (1 - segFrac) * 0.3 });
        prevWX = wx; prevWY = wy;
      }
    }

    // Teleport charge glow
    if (aboutToTeleport) {
      const chargeUp = 1 - e.teleportTimer / 0.5;
      g.circle(e.x, e.y, r + 10 + chargeUp * 8).fill({ color: 0x9933ff, alpha: 0.12 + chargeUp * 0.1 });
      g.circle(e.x, e.y, r + 8 + chargeUp * 6).stroke({ color: 0xcc66ff, width: 2, alpha: 0.35 + chargeUp * 0.3 });
      // Sparks spiraling inward
      for (let si = 0; si < 6; si++) {
        const sa = t * 10 + si * Math.PI / 3;
        const sd = (r + 12) * (1 - chargeUp * 0.5);
        g.circle(e.x + Math.cos(sa) * sd, e.y + Math.sin(sa) * sd, 1)
          .fill({ color: 0xee88ff, alpha: 0.5 * chargeUp });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Player — hooded mage with temporal staff and orbiting time symbols
  // ---------------------------------------------------------------------------
  private _drawPlayer(g: Graphics, state: CMState): void {
    const px = state.playerX, py = state.playerY, pr = state.playerRadius, t = state.time;
    const aimAngle = state.aimAngle;

    // Position history trail — faint dots marking where the player has been
    if (state.positionHistory && state.positionHistory.length > 0) {
      const histLen = Math.min(10, state.positionHistory.length);
      for (let hi = 0; hi < histLen; hi++) {
        const hist = state.positionHistory[state.positionHistory.length - 1 - hi];
        if (!hist) continue;
        const trAlpha = (1 - hi / histLen) * 0.18;
        const trR = pr * 0.35 * (1 - hi / histLen);
        g.circle(hist.x, hist.y, Math.max(1, trR)).fill({ color: 0x5577cc, alpha: trAlpha });
      }
    }

    // Chrono Shift rewind visual — green trail
    if (state.chronoShiftActive) {
      for (let tr = 0; tr < 8; tr++) {
        const trDist = tr * 7;
        const tx = px - Math.cos(aimAngle) * trDist + Math.sin(t * 5 + tr) * 2;
        const ty = py - Math.sin(aimAngle) * trDist + Math.cos(t * 5 + tr) * 2;
        g.circle(tx, ty, pr * (1 - tr * 0.1)).fill({
          color: 0x22ffaa, alpha: (1 - tr / 8) * 0.25,
        });
      }
    }

    // Dash — dramatic temporal afterimage trail
    if (state.dashing) {
      for (let tr = 1; tr <= 7; tr++) {
        const trDist = tr * 7;
        const tx = px - Math.cos(state.dashAngle) * trDist;
        const ty = py - Math.sin(state.dashAngle) * trDist;
        const trAlpha = (1 - tr / 7) * 0.28;
        const trR = pr * (1 - tr * 0.1);
        // Afterimage body
        g.circle(tx, ty, trR).fill({ color: 0x4488ff, alpha: trAlpha * 0.8 });
        g.circle(tx, ty, trR * 0.65).fill({ color: 0x88aaff, alpha: trAlpha * 0.5 });
        // Afterimage hood
        g.moveTo(tx - trR * 0.65, ty - trR * 0.4)
          .lineTo(tx, ty - trR * 1.55)
          .lineTo(tx + trR * 0.65, ty - trR * 0.4)
          .closePath()
          .fill({ color: 0x2244aa, alpha: trAlpha * 0.7 });
      }
    }

    // Invulnerability flash
    const invFlash = state.invulnTimer > 0 && Math.sin(t * 20) > 0;
    const bodyAlpha = invFlash ? 0.4 : 0.9;

    // Player shadow
    g.ellipse(px + 2, py + 4, pr * 1.1, pr * 0.5).fill({ color: 0x000000, alpha: 0.22 });

    // Time aura — faint blue circle with clock tick marks and slow rotation
    const auraR = state.timeAuraRadius;
    const auraRot = t * 0.25; // slow rotation
    const auraPulse = 0.05 + Math.sin(t * 1.8) * 0.02; // pulsing opacity
    g.circle(px, py, auraR).fill({ color: 0x4466cc, alpha: auraPulse * 0.55 });
    g.circle(px, py, auraR).stroke({ color: 0x6688ff, width: 1.2, alpha: auraPulse * 1.4 });
    // Clock tick marks around aura
    for (let tick = 0; tick < 12; tick++) {
      const ta = auraRot + (tick / 12) * Math.PI * 2;
      const isMajor = tick % 3 === 0;
      const innerR = auraR * (isMajor ? 0.90 : 0.94);
      const outerR = auraR * (isMajor ? 0.99 : 0.98);
      g.moveTo(px + Math.cos(ta) * innerR, py + Math.sin(ta) * innerR)
        .lineTo(px + Math.cos(ta) * outerR, py + Math.sin(ta) * outerR)
        .stroke({ color: 0x8899dd, width: isMajor ? 1.2 : 0.7, alpha: auraPulse * 1.8 });
    }

    // Purple pulsing aura around body
    g.circle(px, py, pr + 10).fill({ color: 0x6644cc, alpha: 0.04 + Math.sin(t * 3) * 0.02 });
    g.circle(px, py, pr + 5).fill({ color: 0x8866ff, alpha: 0.06 + Math.sin(t * 4) * 0.025 });

    // Mage body — detailed layered robes
    g.circle(px, py, pr + 1).fill({ color: 0x110022, alpha: bodyAlpha * 0.5 }); // outer dark rim
    g.circle(px, py, pr).fill({ color: 0x1a0c44, alpha: bodyAlpha });           // outer robe
    g.circle(px, py, pr * 0.78).fill({ color: 0x22115a, alpha: bodyAlpha * 0.75 }); // mid robe layer
    g.circle(px, py, pr * 0.55).fill({ color: 0x2a1466, alpha: bodyAlpha * 0.6 }); // inner robe
    // Robe hem lines (arc strokes suggesting layered fabric)
    for (let rl = 0; rl < 3; rl++) {
      const rimR = pr * (0.62 + rl * 0.12);
      const rimStart = Math.PI * 0.5 + rl * 0.15;
      const rimEnd = Math.PI * 1.5 - rl * 0.15;
      g.arc(px, py, rimR, rimStart, rimEnd)
        .stroke({ color: 0x5533aa, width: 0.8, alpha: bodyAlpha * 0.25 });
    }

    // Energy tendrils flowing from the mage — wispy time magic trails
    for (let ti = 0; ti < 3; ti++) {
      const tendrilAngle = aimAngle + Math.PI + (ti - 1) * 0.6 + Math.sin(t * 2 + ti * 1.5) * 0.3;
      const tendrilLen = pr * 2 + Math.sin(t * 3 + ti) * pr * 0.5;
      let prevTX = px, prevTY = py;
      for (let seg = 1; seg <= 5; seg++) {
        const segFrac = seg / 5;
        const segLen = tendrilLen * segFrac;
        const wobble = Math.sin(t * 4 + ti * 2 + seg * 1.5) * 5 * segFrac;
        const perpA = tendrilAngle + Math.PI / 2;
        const nx = px + Math.cos(tendrilAngle) * segLen + Math.cos(perpA) * wobble;
        const ny = py + Math.sin(tendrilAngle) * segLen + Math.sin(perpA) * wobble;
        const segAlpha = (1 - segFrac) * 0.15 * bodyAlpha;
        g.moveTo(prevTX, prevTY).lineTo(nx, ny)
          .stroke({ color: 0x8866ff, width: 1.5 * (1 - segFrac * 0.6), alpha: segAlpha });
        prevTX = nx; prevTY = ny;
      }
    }

    // Hood — pointed triangle with inner shadow, wider cowl
    if (!invFlash) {
      // Outer hood
      g.moveTo(px - pr * 0.72, py - pr * 0.38)
        .lineTo(px, py - pr * 1.6)
        .lineTo(px + pr * 0.72, py - pr * 0.38)
        .closePath()
        .fill({ color: 0x150a38, alpha: bodyAlpha * 0.95 });
      // Hood mid tone
      g.moveTo(px - pr * 0.5, py - pr * 0.38)
        .lineTo(px, py - pr * 1.35)
        .lineTo(px + pr * 0.5, py - pr * 0.38)
        .closePath()
        .fill({ color: 0x1e1054, alpha: bodyAlpha * 0.55 });
      // Hood highlight
      g.moveTo(px - pr * 0.22, py - pr * 0.38)
        .lineTo(px, py - pr * 1.1)
        .lineTo(px + pr * 0.22, py - pr * 0.38)
        .closePath()
        .fill({ color: 0x3322aa, alpha: bodyAlpha * 0.22 });
      // Shadow under hood (face region)
      g.circle(px, py - pr * 0.2, pr * 0.42).fill({ color: 0x000000, alpha: bodyAlpha * 0.35 });
    }

    // Eye glow facing aim direction
    const eyeX = px + Math.cos(aimAngle) * pr * 0.45;
    const eyeY = py + Math.sin(aimAngle) * pr * 0.45;
    g.circle(eyeX, eyeY, 2.2).fill({ color: 0x8866ff, alpha: bodyAlpha * 0.9 });
    g.circle(eyeX, eyeY, 4).fill({ color: 0x6644cc, alpha: bodyAlpha * 0.22 });

    // Temporal staff extending in aim direction
    const staffLen = pr * 3.0;
    const staffBaseX = px + Math.cos(aimAngle) * pr * 0.7;
    const staffBaseY = py + Math.sin(aimAngle) * pr * 0.7;
    const staffTipX = px + Math.cos(aimAngle) * (pr + staffLen);
    const staffTipY = py + Math.sin(aimAngle) * (pr + staffLen);

    // Determine staff crystal color based on ability readiness
    const shiftReady = state.chronoShiftCooldown <= 0 && !state.chronoShiftActive;
    const crystalColor = shiftReady ? 0x22ffaa : 0x9966ff;
    const crystalGlowColor = shiftReady ? 0x00cc88 : 0x6644cc;

    // Staff glow layers
    g.moveTo(staffBaseX, staffBaseY).lineTo(staffTipX, staffTipY)
      .stroke({ color: crystalGlowColor, width: 9, alpha: 0.05 + Math.sin(t * 4) * 0.02 });
    g.moveTo(staffBaseX, staffBaseY).lineTo(staffTipX, staffTipY)
      .stroke({ color: crystalColor, width: 5, alpha: 0.12 + Math.sin(t * 4) * 0.04 });
    // Staff shaft — wood-brown core with magical sheen
    g.moveTo(staffBaseX, staffBaseY).lineTo(staffTipX, staffTipY)
      .stroke({ color: 0xccbbee, width: 2, alpha: 0.7 });
    g.moveTo(staffBaseX, staffBaseY).lineTo(staffTipX, staffTipY)
      .stroke({ color: crystalColor, width: 1.5, alpha: 0.85 });

    // Staff tip crystal — color changes with ability readiness
    const crystalPulse = 0.25 + Math.sin(t * 5) * 0.1;
    if (shiftReady) {
      // Green glow when chrono shift is ready
      g.circle(staffTipX, staffTipY, 9).fill({ color: 0x22ffaa, alpha: 0.18 + Math.sin(t * 6) * 0.08 });
      g.circle(staffTipX, staffTipY, 6).fill({ color: 0x00ddaa, alpha: crystalPulse + 0.1 });
    } else {
      g.circle(staffTipX, staffTipY, 5).fill({ color: crystalGlowColor, alpha: crystalPulse });
    }
    g.circle(staffTipX, staffTipY, 3.5).fill({ color: crystalColor, alpha: 0.75 });
    g.circle(staffTipX, staffTipY, 1.5).fill({ color: 0xffffff, alpha: 0.55 });

    // Staff prongs (fork at tip)
    const forkLen = 5;
    const forkBaseX = staffTipX - Math.cos(aimAngle) * 4;
    const forkBaseY = staffTipY - Math.sin(aimAngle) * 4;
    g.moveTo(forkBaseX, forkBaseY)
      .lineTo(staffTipX + Math.cos(aimAngle + 0.4) * forkLen, staffTipY + Math.sin(aimAngle + 0.4) * forkLen)
      .stroke({ color: 0xaa88ff, width: 1.2, alpha: 0.7 });
    g.moveTo(forkBaseX, forkBaseY)
      .lineTo(staffTipX + Math.cos(aimAngle - 0.4) * forkLen, staffTipY + Math.sin(aimAngle - 0.4) * forkLen)
      .stroke({ color: 0xaa88ff, width: 1.2, alpha: 0.7 });

    // Charged bolt indicator
    const charging = (state as unknown as Record<string, unknown>).chargingBolt as boolean | undefined;
    const chargeTime = (state as unknown as Record<string, unknown>).chargeTime as number | undefined;
    const maxCharge = (state as unknown as Record<string, unknown>).maxChargeTime as number | undefined;
    if (charging && chargeTime !== undefined && maxCharge !== undefined && chargeTime > 0.05) {
      const chargeRatio = Math.min(1, chargeTime / maxCharge);
      // Growing energy sphere at staff tip
      const chargeR = 6 + chargeRatio * 14;
      g.circle(staffTipX, staffTipY, chargeR + 4).fill({ color: 0xcc88ff, alpha: 0.06 * chargeRatio });
      g.circle(staffTipX, staffTipY, chargeR).fill({ color: 0xaa66ff, alpha: 0.15 * chargeRatio });
      g.circle(staffTipX, staffTipY, chargeR * 0.6).fill({ color: 0xddaaff, alpha: 0.3 * chargeRatio });
      g.circle(staffTipX, staffTipY, chargeR).stroke({
        color: 0xffffff, width: 1.5, alpha: 0.4 * chargeRatio + Math.sin(t * 10) * 0.15,
      });
      // Electric arcs around charge sphere
      for (let ea = 0; ea < 4; ea++) {
        const eAngle = t * 8 + ea * Math.PI / 2;
        const eLen = chargeR * (0.6 + Math.random() * 0.4);
        g.moveTo(staffTipX, staffTipY)
          .lineTo(staffTipX + Math.cos(eAngle) * eLen, staffTipY + Math.sin(eAngle) * eLen)
          .stroke({ color: 0xddccff, width: 1, alpha: 0.5 * chargeRatio });
      }
      // Charge progress arc around staff tip
      const arcSegs = 16;
      const filledSegs = Math.floor(arcSegs * chargeRatio);
      for (let ai = 0; ai < filledSegs; ai++) {
        const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
        const arcR = chargeR + 6;
        g.moveTo(staffTipX + Math.cos(a1) * arcR, staffTipY + Math.sin(a1) * arcR)
          .lineTo(staffTipX + Math.cos(a2) * arcR, staffTipY + Math.sin(a2) * arcR)
          .stroke({ color: chargeRatio >= 1 ? 0xffdd44 : 0xaa88ff, width: 2, alpha: 0.6 });
      }
      // Full charge flash
      if (chargeRatio >= 1) {
        g.circle(staffTipX, staffTipY, chargeR + 8).fill({ color: 0xffdd44, alpha: 0.08 + Math.sin(t * 12) * 0.04 });
      }
    }

    // Time symbols orbiting the player
    for (let oi = 0; oi < 4; oi++) {
      const orbitAngle = t * 1.2 + oi * Math.PI / 2;
      const orbitDist = pr + 16 + Math.sin(t * 2 + oi) * 2;
      const ox = px + Math.cos(orbitAngle) * orbitDist;
      const oy = py + Math.sin(orbitAngle) * orbitDist;
      const orbitColor = oi % 2 === 0 ? 0x6644cc : 0x4488ff;
      // Small rotating diamond symbol
      this._drawTemporalRune(g, ox, oy, 3, orbitColor, 0.45 + Math.sin(t * 3 + oi) * 0.2, t * 2 + oi);
    }

    // HP bar below player — polished with segments
    const barW = pr * 3.0, barH = 4;
    const barX = px - barW / 2, barY = py + pr + 10;
    // Dark background with border
    g.rect(barX - 1, barY - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.65 });
    const hpRatio = Math.max(0, state.playerHP / state.maxHP);
    const hpColor = hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222;
    // HP fill
    g.rect(barX, barY, barW * hpRatio, barH).fill({ color: hpColor, alpha: 0.85 });
    // Highlight strip
    g.rect(barX, barY, barW * hpRatio, barH * 0.35).fill({ color: 0xffffff, alpha: 0.15 });
    // Segment dividers for each HP point
    for (let hi = 1; hi < state.maxHP; hi++) {
      const segX = barX + (barW * hi / state.maxHP);
      g.moveTo(segX, barY).lineTo(segX, barY + barH)
        .stroke({ color: 0x000000, width: 1, alpha: 0.5 });
    }
    // Border
    g.rect(barX - 1, barY - 1, barW + 2, barH + 2).stroke({ color: 0x335566, width: 0.8, alpha: 0.6 });
    // Low HP warning pulse
    if (hpRatio <= 0.25 && hpRatio > 0) {
      const warnPulse = 0.1 + Math.sin(t * 6) * 0.06;
      g.rect(barX, barY, barW * hpRatio, barH).fill({ color: 0xff0000, alpha: warnPulse });
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles — time bolts and enemy arrows
  // ---------------------------------------------------------------------------
  private _drawProjectiles(g: Graphics, state: CMState): void {
    const t = state.time;
    for (const p of state.projectiles) {
      if (p.fromEnemy) {
        // Enemy arrows — detailed medieval arrows with fletching
        const vLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const nx = vLen > 0 ? p.vx / vLen : 1, ny = vLen > 0 ? p.vy / vLen : 0;
        const perpX = -ny, perpY = nx;
        // Motion blur trail
        for (let tr = 1; tr <= 5; tr++) {
          const trAlpha = 0.15 * (1 - tr * 0.18);
          const trX = p.x - nx * tr * 4;
          const trY = p.y - ny * tr * 4;
          g.circle(trX, trY, 1.2 * (1 - tr * 0.15)).fill({ color: p.color, alpha: trAlpha });
        }
        // Arrow shaft
        const shaftLen = 14;
        g.moveTo(p.x - nx * shaftLen, p.y - ny * shaftLen)
          .lineTo(p.x + nx * 2, p.y + ny * 2)
          .stroke({ color: 0x664422, width: 1.5, alpha: 0.85 });
        // Arrowhead — sharp triangle
        const tipX = p.x + nx * (p.radius + 4), tipY = p.y + ny * (p.radius + 4);
        const headBack = 5;
        g.moveTo(tipX, tipY)
          .lineTo(p.x + nx * (p.radius - headBack) + perpX * 3, p.y + ny * (p.radius - headBack) + perpY * 3)
          .lineTo(p.x + nx * (p.radius - headBack) - perpX * 3, p.y + ny * (p.radius - headBack) - perpY * 3)
          .closePath()
          .fill({ color: 0xaaaaaa, alpha: 0.9 });
        // Arrowhead glint
        g.circle(tipX, tipY, 1.2).fill({ color: 0xffffff, alpha: 0.5 });
        // Fletching at back
        const fletchX = p.x - nx * shaftLen;
        const fletchY = p.y - ny * shaftLen;
        for (let fi = -1; fi <= 1; fi += 2) {
          g.moveTo(fletchX, fletchY)
            .lineTo(fletchX - nx * 4 + perpX * fi * 3, fletchY - ny * 4 + perpY * fi * 3)
            .stroke({ color: 0xcc8844, width: 1, alpha: 0.65 });
        }
      } else {
        // Player time bolt — purple glowing orb with temporal wake trail
        // Temporal wake trail — dual helix pattern
        const vLen = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const nx2 = vLen > 0 ? p.vx / vLen : 1, ny2 = vLen > 0 ? p.vy / vLen : 0;
        for (let sp = 0; sp < 10; sp++) {
          const spDist = sp * 3.5;
          const helixA = t * 8 + sp * 0.8;
          const helixR = 2 + sp * 0.3;
          const perpX2 = -ny2, perpY2 = nx2;
          // Helix strand 1
          const h1x = p.x - nx2 * spDist + perpX2 * Math.cos(helixA) * helixR;
          const h1y = p.y - ny2 * spDist + perpY2 * Math.cos(helixA) * helixR;
          // Helix strand 2
          const h2x = p.x - nx2 * spDist - perpX2 * Math.cos(helixA) * helixR;
          const h2y = p.y - ny2 * spDist - perpY2 * Math.cos(helixA) * helixR;
          const spAlpha = (1 - sp / 10) * 0.28;
          g.circle(h1x, h1y, 1.2).fill({ color: 0x8866ff, alpha: spAlpha });
          g.circle(h2x, h2y, 1.0).fill({ color: 0x4488ff, alpha: spAlpha * 0.7 });
        }
        // Trailing glow line
        g.moveTo(p.x, p.y)
          .lineTo(p.x - nx2 * 25, p.y - ny2 * 25)
          .stroke({ color: 0x6644cc, width: 3, alpha: 0.08 });
        // Glow layers
        g.circle(p.x, p.y, p.radius + 6).fill({ color: 0x6644cc, alpha: 0.06 + Math.sin(t * 8) * 0.02 });
        g.circle(p.x, p.y, p.radius + 3).fill({ color: 0x8866ff, alpha: 0.15 });
        // Bolt core
        g.circle(p.x, p.y, p.radius).fill({ color: 0x9966ff, alpha: 0.9 });
        g.circle(p.x, p.y, p.radius * 0.55).fill({ color: 0xffffff, alpha: 0.5 });
        // Energy ring around bolt
        g.circle(p.x, p.y, p.radius + 4).stroke({ color: 0xaa88ff, width: 1, alpha: 0.3 + Math.sin(t * 12) * 0.15 });
        // Piercing bolt extra visual
        if (p.piercing) {
          g.circle(p.x, p.y, p.radius + 8).fill({ color: 0xaa66ff, alpha: 0.06 });
          g.circle(p.x, p.y, p.radius + 2).fill({ color: 0xffffff, alpha: 0.15 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------
  private _drawParticles(g: Graphics, state: CMState): void {
    for (const p of state.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.85;
      const size = p.size * (0.5 + lifeRatio * 0.5);
      // Glow
      g.circle(p.x, p.y, size * 2.5).fill({ color: p.color, alpha: alpha * 0.08 });
      g.circle(p.x, p.y, size * 1.6).fill({ color: p.color, alpha: alpha * 0.18 });
      // Core
      g.circle(p.x, p.y, size).fill({ color: p.color, alpha });
      // Motion trail
      if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
        const trailLen = Math.min(10, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.25);
        const trAngle = Math.atan2(p.vy, p.vx);
        g.moveTo(p.x, p.y)
          .lineTo(p.x - Math.cos(trAngle) * trailLen, p.y - Math.sin(trAngle) * trailLen)
          .stroke({ color: p.color, width: size * 0.7, alpha: alpha * 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Shockwaves
  // ---------------------------------------------------------------------------
  private _drawShockwaves(g: Graphics, state: CMState): void {
    for (const sw of state.shockwaves) {
      const lifeRatio = sw.life / sw.maxLife;
      const alpha = lifeRatio * 0.65;
      // Outer ring
      g.circle(sw.x, sw.y, sw.radius).stroke({ color: sw.color, width: 3.5, alpha: alpha * 0.6 });
      // Inner bright ring
      g.circle(sw.x, sw.y, sw.radius * 0.75).stroke({ color: 0xffffff, width: 1.5, alpha: alpha * 0.3 });
      // Third ring
      g.circle(sw.x, sw.y, sw.radius * 0.5).stroke({ color: sw.color, width: 1, alpha: alpha * 0.15 });
      // Expanding fill
      g.circle(sw.x, sw.y, sw.radius).fill({ color: sw.color, alpha: alpha * 0.04 });
      // Sparkle dots on the ring edge
      for (let si = 0; si < 6; si++) {
        const sa = (si / 6) * Math.PI * 2 + state.time * 2;
        const sx = sw.x + Math.cos(sa) * sw.radius;
        const sy = sw.y + Math.sin(sa) * sw.radius;
        g.circle(sx, sy, 1.5).fill({ color: 0xffffff, alpha: alpha * 0.5 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boss rendering
  // ---------------------------------------------------------------------------
  private _drawBoss(g: Graphics, state: CMState, sw: number, sh: number): void {
    const boss = (state as unknown as Record<string, unknown>).boss as
      | { alive: boolean; x: number; y: number; radius: number; hp: number; maxHp: number; shieldHp?: number; maxShieldHp?: number; kind: string; phase?: number; attackTimer?: number; chargeTimer?: number }
      | undefined;
    if (!boss || !boss.alive) return;

    const bx = boss.x, by = boss.y, br = boss.radius, t = state.time;

    // Outer ominous glow
    g.circle(bx, by, br * 2.8).fill({ color: 0x220033, alpha: 0.08 + Math.sin(t * 0.8) * 0.03 });
    g.circle(bx, by, br * 2.0).fill({ color: 0x330044, alpha: 0.12 + Math.sin(t * 1.2) * 0.04 });

    // Boss shadow
    g.ellipse(bx + 4, by + 8, br * 1.3, br * 0.5).fill({ color: 0x000000, alpha: 0.3 });

    if (boss.kind === "temporal_titan") {
      this._drawBossTemporal(g, bx, by, br, t);
    } else if (boss.kind === "clockwork_hydra") {
      this._drawBossHydra(g, bx, by, br, t);
    } else if (boss.kind === "void_sovereign") {
      this._drawBossVoid(g, bx, by, br, t, state);
    } else {
      // Fallback generic boss
      g.circle(bx, by, br).fill({ color: 0x440066, alpha: 0.9 });
      g.circle(bx, by, br * 0.65).fill({ color: 0x660088, alpha: 0.7 });
    }

    // Phase indicator — 3 orbiting dots
    const phase = (boss.phase ?? 1) as number;
    for (let pi = 0; pi < 3; pi++) {
      const pAngle = t * 1.5 + pi * (Math.PI * 2 / 3);
      const pDist = br + 22;
      const px2 = bx + Math.cos(pAngle) * pDist;
      const py2 = by + Math.sin(pAngle) * pDist;
      const active = pi < phase;
      const dotColor = active ? 0xffd700 : 0x333355;
      g.circle(px2, py2, 5).fill({ color: dotColor, alpha: active ? (0.8 + Math.sin(t * 3 + pi) * 0.15) : 0.3 });
      if (active) {
        g.circle(px2, py2, 8).fill({ color: dotColor, alpha: 0.12 });
      }
    }

    // Attack telegraph — charging glow
    if (boss.chargeTimer !== undefined && boss.chargeTimer > 0) {
      const chargeGlow = Math.min(1, boss.chargeTimer / 2);
      g.circle(bx, by, br * 1.4).fill({ color: 0xff4400, alpha: chargeGlow * 0.18 });
      g.circle(bx, by, br * 1.4).stroke({ color: 0xff6600, width: 3, alpha: chargeGlow * 0.6 });
      // Slam warning circle on ground
      g.circle(bx, by, br * 3.5).stroke({ color: 0xff2200, width: 2, alpha: chargeGlow * 0.4 });
    }

    // Attack telegraph — fan aim lines
    if (boss.attackTimer !== undefined && boss.attackTimer > 0 && boss.attackTimer < 1.5) {
      const fanAlpha = (1.5 - boss.attackTimer) / 1.5 * 0.55;
      const toPlayer = Math.atan2(state.playerY - by, state.playerX - bx);
      for (let fi = -2; fi <= 2; fi++) {
        const fa = toPlayer + fi * 0.22;
        g.moveTo(bx, by)
          .lineTo(bx + Math.cos(fa) * br * 4.5, by + Math.sin(fa) * br * 4.5)
          .stroke({ color: 0xff4400, width: 1.5, alpha: fanAlpha * (1 - Math.abs(fi) * 0.18) });
      }
    }

    // HP bar at top of screen
    this._drawBossHPBar(g, boss, sw, sh);
  }

  private _drawBossTemporal(g: Graphics, bx: number, by: number, br: number, t: number): void {
    // Dark purple body layers
    g.circle(bx, by, br + 4).fill({ color: 0x110022, alpha: 0.45 });
    g.circle(bx, by, br).fill({ color: 0x2a0055, alpha: 0.95 });
    g.circle(bx, by, br * 0.78).fill({ color: 0x3d0077, alpha: 0.8 });
    g.circle(bx, by, br * 0.52).fill({ color: 0x550099, alpha: 0.7 });

    // Golden glowing core
    const coreGlow = 0.6 + Math.sin(t * 3) * 0.2;
    g.circle(bx, by, br * 0.28).fill({ color: 0xffcc00, alpha: coreGlow * 0.9 });
    g.circle(bx, by, br * 0.18).fill({ color: 0xffffff, alpha: coreGlow * 0.8 });
    g.circle(bx, by, br * 0.38).fill({ color: 0xffaa00, alpha: coreGlow * 0.3 });

    // Rotating clock gear teeth pattern
    const gearTeeth = 16;
    const gearRot = t * 0.4;
    const toothOuter = br + 12;
    const toothInner = br + 4;
    for (let gi = 0; gi < gearTeeth; gi++) {
      const ga1 = gearRot + (gi / gearTeeth) * Math.PI * 2;
      const ga2 = gearRot + ((gi + 0.4) / gearTeeth) * Math.PI * 2;
      const ga3 = gearRot + ((gi + 0.6) / gearTeeth) * Math.PI * 2;
      const ga4 = gearRot + ((gi + 1) / gearTeeth) * Math.PI * 2;
      g.moveTo(bx + Math.cos(ga1) * toothInner, by + Math.sin(ga1) * toothInner)
        .lineTo(bx + Math.cos(ga2) * toothOuter, by + Math.sin(ga2) * toothOuter)
        .lineTo(bx + Math.cos(ga3) * toothOuter, by + Math.sin(ga3) * toothOuter)
        .lineTo(bx + Math.cos(ga4) * toothInner, by + Math.sin(ga4) * toothInner)
        .fill({ color: 0xffd700, alpha: 0.65 });
    }

    // Inner counter-rotating gear ring
    const innerGearRot = -t * 0.7;
    for (let gi = 0; gi < 8; gi++) {
      const ga = innerGearRot + (gi / 8) * Math.PI * 2;
      g.moveTo(bx + Math.cos(ga) * br * 0.62, by + Math.sin(ga) * br * 0.62)
        .lineTo(bx + Math.cos(ga) * br * 0.75, by + Math.sin(ga) * br * 0.75)
        .stroke({ color: 0xffd700, width: 2, alpha: 0.5 });
    }
    // Gear ring
    g.circle(bx, by, br * 0.68).stroke({ color: 0xffaa00, width: 1.5, alpha: 0.35 });

    // Clock face overlay
    g.circle(bx, by, br * 0.88).stroke({ color: 0x6644aa, width: 1, alpha: 0.25 });
    for (let hi = 0; hi < 12; hi++) {
      const ha = -Math.PI / 2 + (hi / 12) * Math.PI * 2;
      const innerR = br * (hi % 3 === 0 ? 0.72 : 0.78);
      g.moveTo(bx + Math.cos(ha) * innerR, by + Math.sin(ha) * innerR)
        .lineTo(bx + Math.cos(ha) * br * 0.87, by + Math.sin(ha) * br * 0.87)
        .stroke({ color: 0xccaa44, width: hi % 3 === 0 ? 1.5 : 0.8, alpha: 0.4 });
    }
    // Clock hands
    const hourA = -Math.PI / 2 + t * 0.3;
    const minA = -Math.PI / 2 + t * 1.8;
    g.moveTo(bx, by).lineTo(bx + Math.cos(hourA) * br * 0.45, by + Math.sin(hourA) * br * 0.45)
      .stroke({ color: 0xffd700, width: 2.5, alpha: 0.7 });
    g.moveTo(bx, by).lineTo(bx + Math.cos(minA) * br * 0.65, by + Math.sin(minA) * br * 0.65)
      .stroke({ color: 0xffaa00, width: 1.5, alpha: 0.6 });
  }

  private _drawBossHydra(g: Graphics, bx: number, by: number, br: number, t: number): void {
    // Green-tinted mechanical body
    g.circle(bx, by, br + 3).fill({ color: 0x001108, alpha: 0.4 });
    g.circle(bx, by, br).fill({ color: 0x0a2212, alpha: 0.95 });
    g.circle(bx, by, br * 0.75).fill({ color: 0x113322, alpha: 0.8 });
    g.circle(bx, by, br * 0.5).fill({ color: 0x1a4422, alpha: 0.7 });

    // Cog pattern overlay
    const cogRot = t * 0.3;
    for (let ci = 0; ci < 12; ci++) {
      const ca = cogRot + (ci / 12) * Math.PI * 2;
      const isMain = ci % 4 === 0;
      g.moveTo(bx + Math.cos(ca) * br * 0.56, by + Math.sin(ca) * br * 0.56)
        .lineTo(bx + Math.cos(ca) * br * 0.74, by + Math.sin(ca) * br * 0.74)
        .stroke({ color: isMain ? 0x44dd88 : 0x228844, width: isMain ? 2 : 1, alpha: 0.5 });
    }
    g.circle(bx, by, br * 0.65).stroke({ color: 0x33aa55, width: 1.5, alpha: 0.3 });

    // Three heads on stalks
    const headPositions = [
      { angleOffset: -Math.PI / 2, wobble: Math.sin(t * 1.5) * 0.2 },
      { angleOffset: -Math.PI / 2 + (2 * Math.PI / 3), wobble: Math.sin(t * 1.3 + 1) * 0.2 },
      { angleOffset: -Math.PI / 2 + (4 * Math.PI / 3), wobble: Math.sin(t * 1.7 + 2) * 0.2 },
    ];
    for (const hp of headPositions) {
      const ha = hp.angleOffset + hp.wobble;
      const stalkLen = br * 1.0;
      const headX = bx + Math.cos(ha) * (br + stalkLen);
      const headY = by + Math.sin(ha) * (br + stalkLen);
      const midX = bx + Math.cos(ha) * (br * 0.6);
      const midY = by + Math.sin(ha) * (br * 0.6);
      // Stalk
      g.moveTo(midX, midY).lineTo(headX, headY)
        .stroke({ color: 0x226633, width: 5, alpha: 0.85 });
      g.moveTo(midX, midY).lineTo(headX, headY)
        .stroke({ color: 0x44aa66, width: 2.5, alpha: 0.5 });
      // Head
      const headR = br * 0.34;
      g.circle(headX, headY, headR + 2).fill({ color: 0x001a08, alpha: 0.4 });
      g.circle(headX, headY, headR).fill({ color: 0x0f3318, alpha: 0.95 });
      g.circle(headX, headY, headR * 0.6).fill({ color: 0x1a5522, alpha: 0.7 });
      // Head cog ring
      g.circle(headX, headY, headR + 4).stroke({ color: 0x33cc66, width: 1.5, alpha: 0.4 });
      // Eye
      g.circle(headX + Math.cos(ha) * headR * 0.3, headY + Math.sin(ha) * headR * 0.3, 3)
        .fill({ color: 0x00ff88, alpha: 0.9 });
      g.circle(headX + Math.cos(ha) * headR * 0.3, headY + Math.sin(ha) * headR * 0.3, 5)
        .fill({ color: 0x00cc66, alpha: 0.2 });
    }

    // Central core — mechanical eye
    g.circle(bx, by, br * 0.22).fill({ color: 0x00ff66, alpha: 0.85 + Math.sin(t * 4) * 0.1 });
    g.circle(bx, by, br * 0.12).fill({ color: 0xffffff, alpha: 0.6 });
    g.circle(bx, by, br * 0.28).stroke({ color: 0x44ff88, width: 1.5, alpha: 0.4 });
  }

  private _drawBossVoid(g: Graphics, bx: number, by: number, br: number, t: number, state: CMState): void {
    // Deep black void body
    g.circle(bx, by, br + 5).fill({ color: 0x000000, alpha: 0.6 });
    g.circle(bx, by, br).fill({ color: 0x050008, alpha: 0.97 });
    g.circle(bx, by, br * 0.75).fill({ color: 0x0a0010, alpha: 0.9 });
    g.circle(bx, by, br * 0.5).fill({ color: 0x100018, alpha: 0.8 });

    // Purple void energy tendrils
    for (let vi = 0; vi < 8; vi++) {
      const va = t * 0.5 + vi * Math.PI / 4;
      const vLen = br * (0.8 + Math.sin(t * 2.3 + vi) * 0.25);
      const ctrl1X = bx + Math.cos(va + 0.4) * vLen * 0.6;
      const ctrl1Y = by + Math.sin(va + 0.4) * vLen * 0.6;
      const endX = bx + Math.cos(va) * vLen;
      const endY = by + Math.sin(va) * vLen;
      g.moveTo(bx, by)
        .quadraticCurveTo(ctrl1X, ctrl1Y, endX, endY)
        .stroke({ color: 0x8800cc, width: 1.5, alpha: 0.35 + Math.sin(t * 3 + vi) * 0.15 });
    }

    // Void energy ring
    g.circle(bx, by, br * 0.9).stroke({ color: 0x6600aa, width: 2, alpha: 0.4 + Math.sin(t * 2) * 0.15 });
    g.circle(bx, by, br * 0.65).stroke({ color: 0x9922cc, width: 1.5, alpha: 0.3 });

    // Floating void shards orbiting the boss
    const shardCount = 6;
    for (let si = 0; si < shardCount; si++) {
      const sAngle = t * 1.0 + si * (Math.PI * 2 / shardCount);
      const sOrbit = br * 1.55 + Math.sin(t * 2 + si) * 8;
      const sx = bx + Math.cos(sAngle) * sOrbit;
      const sy = by + Math.sin(sAngle) * sOrbit;
      const sRot = t * 2 + si;
      const sSize = 6 + Math.sin(t * 3 + si) * 2;
      // Shard diamond
      g.moveTo(sx + Math.cos(sRot) * sSize, sy + Math.sin(sRot) * sSize)
        .lineTo(sx + Math.cos(sRot + Math.PI / 2) * sSize * 0.4, sy + Math.sin(sRot + Math.PI / 2) * sSize * 0.4)
        .lineTo(sx + Math.cos(sRot + Math.PI) * sSize, sy + Math.sin(sRot + Math.PI) * sSize)
        .lineTo(sx + Math.cos(sRot - Math.PI / 2) * sSize * 0.4, sy + Math.sin(sRot - Math.PI / 2) * sSize * 0.4)
        .closePath()
        .fill({ color: 0x9900ff, alpha: 0.7 + Math.sin(t * 4 + si) * 0.15 });
      g.circle(sx, sy, sSize * 0.4).fill({ color: 0xcc44ff, alpha: 0.4 });
    }

    // Eyes that track the player
    const toPlayerAngle = Math.atan2(state.playerY - by, state.playerX - bx);
    const eyeSpread = 0.35;
    for (let ei = 0; ei < 2; ei++) {
      const eAngle = toPlayerAngle + (ei === 0 ? -eyeSpread : eyeSpread);
      const eyeDist = br * 0.38;
      const ex = bx + Math.cos(eAngle) * eyeDist;
      const ey = by + Math.sin(eAngle) * eyeDist;
      // Outer eye socket
      g.circle(ex, ey, 7).fill({ color: 0x1a0028, alpha: 0.8 });
      // Iris
      g.circle(ex, ey, 4.5).fill({ color: 0xaa00ff, alpha: 0.9 });
      // Pupil tracking player
      const pupilX = ex + Math.cos(toPlayerAngle) * 1.8;
      const pupilY = ey + Math.sin(toPlayerAngle) * 1.8;
      g.circle(pupilX, pupilY, 2).fill({ color: 0x000000, alpha: 1 });
      // Eye glow
      g.circle(ex, ey, 9).fill({ color: 0x8800cc, alpha: 0.15 + Math.sin(t * 3 + ei) * 0.08 });
    }

    // Central void core
    g.circle(bx, by, br * 0.2).fill({ color: 0x000000, alpha: 1 });
    g.circle(bx, by, br * 0.13).fill({ color: 0xff00ff, alpha: 0.3 + Math.sin(t * 5) * 0.2 });
    g.circle(bx, by, br * 0.25).stroke({ color: 0xcc00ff, width: 1.5, alpha: 0.5 });
  }

  private _drawBossHPBar(
    g: Graphics,
    boss: { hp: number; maxHp: number; shieldHp?: number; maxShieldHp?: number; kind: string },
    sw: number,
    _sh: number,
  ): void {
    const barW = sw * 0.55;
    const barH = 14;
    const barX = (sw - barW) / 2;
    const barY = 16;

    // Background
    g.rect(barX - 2, barY - 2, barW + 4, barH + 4).fill({ color: 0x000000, alpha: 0.8 });
    g.rect(barX - 2, barY - 2, barW + 4, barH + 4).stroke({ color: 0x440066, width: 1.5, alpha: 0.7 });

    // HP fill
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    const bossHPColor = boss.kind === "temporal_titan" ? 0x9933ff
      : boss.kind === "clockwork_hydra" ? 0x22cc66
      : 0xaa00ff;
    g.rect(barX, barY, barW * hpRatio, barH).fill({ color: bossHPColor, alpha: 0.85 });
    // HP shine
    g.rect(barX, barY, barW * hpRatio, barH * 0.4).fill({ color: 0xffffff, alpha: 0.12 });

    // Shield bar beneath (if applicable)
    if (boss.shieldHp !== undefined && boss.maxShieldHp !== undefined && boss.maxShieldHp > 0) {
      const shBarY = barY + barH + 3;
      const shBarH = 5;
      g.rect(barX, shBarY, barW, shBarH).fill({ color: 0x000000, alpha: 0.5 });
      const shRatio = Math.max(0, boss.shieldHp / boss.maxShieldHp);
      g.rect(barX, shBarY, barW * shRatio, shBarH).fill({ color: 0x44aaff, alpha: 0.75 });
      g.rect(barX, shBarY, barW, shBarH).stroke({ color: 0x2288cc, width: 1, alpha: 0.4 });
    }

    // Boss name label — drawn using Graphics so no separate Text needed
    // (name is encoded via kind)
    const names: Record<string, string> = {
      temporal_titan: "TEMPORAL TITAN",
      clockwork_hydra: "CLOCKWORK HYDRA",
      void_sovereign: "VOID SOVEREIGN",
    };
    void names; // name text rendered in _drawBossAnnounce; here just label the bar via stroke accent
    g.rect(barX, barY, barW, barH).stroke({ color: bossHPColor, width: 1, alpha: 0.3 });
  }

  // ---------------------------------------------------------------------------
  // Boss announcement banner
  // ---------------------------------------------------------------------------
  private _drawBossAnnounce(g: Graphics, state: CMState): void {
    const announceTimer = (state as unknown as Record<string, unknown>).bossAnnounceTimer as number | undefined;
    const boss = (state as unknown as Record<string, unknown>).boss as { kind?: string } | undefined;
    if (!announceTimer || announceTimer <= 0) return;

    const sw = this._sw, sh = this._sh;
    const fadeRatio = Math.min(1, announceTimer / 0.5); // fade out in last 0.5s
    const t = state.time;

    // Dark band across screen center
    const bandH = 100;
    const bandY = sh / 2 - bandH / 2;
    g.rect(0, bandY, sw, bandH).fill({ color: 0x000000, alpha: 0.82 * fadeRatio });

    // Edge glow lines
    g.rect(0, bandY, sw, 2).fill({ color: 0x6600aa, alpha: 0.7 * fadeRatio });
    g.rect(0, bandY + bandH - 2, sw, 2).fill({ color: 0x6600aa, alpha: 0.7 * fadeRatio });
    g.rect(0, bandY + 3, sw, 1).fill({ color: 0xaa44ff, alpha: 0.3 * fadeRatio });
    g.rect(0, bandY + bandH - 4, sw, 1).fill({ color: 0xaa44ff, alpha: 0.3 * fadeRatio });

    // Animated side flares
    const flareAlpha = (0.4 + Math.sin(t * 5) * 0.2) * fadeRatio;
    for (let fi = 0; fi < 3; fi++) {
      const fLen = sw * (0.15 + fi * 0.06);
      g.moveTo(0, bandY + bandH / 2).lineTo(fLen, bandY + bandH / 2)
        .stroke({ color: 0x9922ff, width: 3 - fi, alpha: flareAlpha * (1 - fi * 0.3) });
      g.moveTo(sw, bandY + bandH / 2).lineTo(sw - fLen, bandY + bandH / 2)
        .stroke({ color: 0x9922ff, width: 3 - fi, alpha: flareAlpha * (1 - fi * 0.3) });
    }

    // Boss name in large text via drawRect+stroke simulation (using Graphics text workaround)
    // Determine boss kind color and name
    const kind = boss?.kind ?? "";
    const nameColors: Record<string, number> = {
      temporal_titan: 0xffd700,
      clockwork_hydra: 0x22ff88,
      void_sovereign: 0xdd00ff,
    };
    const nameColor = nameColors[kind] ?? 0xffffff;
    const bossNames: Record<string, string> = {
      temporal_titan: "TEMPORAL TITAN",
      clockwork_hydra: "CLOCKWORK HYDRA",
      void_sovereign: "VOID SOVEREIGN",
    };
    const bossDisplayName = bossNames[kind] ?? "BOSS";

    // Draw name using a temporary Text object rendered directly
    const nameStyle = new TextStyle({
      fontFamily: "Georgia, serif",
      fontSize: 34,
      fill: nameColor,
      fontWeight: "bold",
      letterSpacing: 10,
      dropShadow: { color: 0x000000, distance: 4, blur: 12, alpha: 0.9 },
    });
    const nameText = new Text({ text: bossDisplayName, style: nameStyle });
    nameText.anchor.set(0.5);
    nameText.position.set(sw / 2, sh / 2 - 12);
    nameText.alpha = fadeRatio * (0.85 + Math.sin(t * 3) * 0.1);
    this.container.addChild(nameText);
    // Remove after one frame (will be re-added next frame if timer still active)
    // We use a trick: store reference and destroy on next clear
    this._pendingBossNameText = nameText;

    // Subtitle "approaches..." line
    const subStyle = new TextStyle({
      fontFamily: "Georgia, serif",
      fontSize: 14,
      fill: nameColor,
      fontStyle: "italic",
      letterSpacing: 4,
      dropShadow: { color: 0x000000, distance: 2, blur: 6, alpha: 0.8 },
    });
    const subText = new Text({ text: "approaches...", style: subStyle });
    subText.anchor.set(0.5);
    subText.position.set(sw / 2, sh / 2 + 24);
    subText.alpha = fadeRatio * 0.7;
    this.container.addChild(subText);
    this._pendingBossSubText = subText;
  }

  // ---------------------------------------------------------------------------
  // Wave announcement banner
  // ---------------------------------------------------------------------------
  private _drawWaveAnnounce(g: Graphics, state: CMState): void {
    const announceTimer = (state as unknown as Record<string, unknown>).waveAnnounceTimer as number | undefined;
    if (!announceTimer || announceTimer <= 0) {
      this._waveAnnounceText.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh;
    const t = state.time;
    const alpha = Math.min(1, announceTimer / 0.5) * 0.7; // fade out in last 0.5s

    // Dark band
    const bandH = 50;
    const bandY = sh / 2 - bandH / 2;
    g.rect(0, bandY, sw, bandH).fill({ color: 0x000000, alpha: alpha * 0.5 });
    // Edge glow lines
    g.moveTo(0, bandY).lineTo(sw, bandY).stroke({ color: 0x6644cc, width: 2, alpha: alpha * 0.6 });
    g.moveTo(0, bandY + bandH).lineTo(sw, bandY + bandH).stroke({ color: 0x6644cc, width: 2, alpha: alpha * 0.6 });

    // Side flares
    const flareW = 30 + Math.sin(t * 6) * 10;
    g.rect(0, bandY, flareW, bandH).fill({ color: 0x6644cc, alpha: alpha * 0.12 });
    g.rect(sw - flareW, bandY, flareW, bandH).fill({ color: 0x6644cc, alpha: alpha * 0.12 });

    // Wave number text
    this._waveAnnounceText.text = `WAVE ${state.wave}`;
    this._waveAnnounceText.anchor.set(0.5);
    this._waveAnnounceText.position.set(sw / 2, sh / 2);
    this._waveAnnounceText.alpha = alpha;
    this._waveAnnounceText.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Time freeze visual overlay
  // ---------------------------------------------------------------------------
  private _drawTimeFreezeOverlay(g: Graphics, state: CMState, sw: number, sh: number): void {
    const timeFreezeActive = (state as unknown as Record<string, unknown>).timeFreezeActive as boolean | undefined;
    if (!timeFreezeActive) return;

    const t = state.time;
    const pulse = 0.06 + Math.sin(t * 8) * 0.035;

    // Blue-white overlay pulse
    g.rect(0, 0, sw, sh).fill({ color: 0x88ccff, alpha: pulse });
    g.rect(0, 0, sw, sh).fill({ color: 0xffffff, alpha: pulse * 0.4 });

    // Crystalline fracture lines radiating from player position
    const px = state.playerX, py = state.playerY;
    const fracCount = 12;
    for (let fi = 0; fi < fracCount; fi++) {
      const fAngle = (fi / fracCount) * Math.PI * 2 + t * 0.1;
      const fLen = 60 + Math.sin(t * 5 + fi * 1.3) * 25;
      // Main fracture line
      const midX = px + Math.cos(fAngle) * fLen * 0.5;
      const midY = py + Math.sin(fAngle) * fLen * 0.5;
      const endX = px + Math.cos(fAngle) * fLen;
      const endY = py + Math.sin(fAngle) * fLen;
      g.moveTo(px, py).lineTo(midX, midY).lineTo(endX, endY)
        .stroke({ color: 0xaaddff, width: 1.5, alpha: 0.55 });
      // Branch fracture
      const branchAngle = fAngle + (Math.sin(fi * 2.7) * 0.5);
      const branchLen = fLen * 0.45;
      g.moveTo(midX, midY)
        .lineTo(midX + Math.cos(branchAngle) * branchLen, midY + Math.sin(branchAngle) * branchLen)
        .stroke({ color: 0xcceeff, width: 0.8, alpha: 0.35 });
    }

    // Frozen time particles suspended in air
    const freezeAlpha = pulse / 0.095; // normalise pulse to ~0..1 range
    for (let fp = 0; fp < 20; fp++) {
      const fpx = ((fp * 337 + 71) % sw);
      const fpy = ((fp * 491 + 113) % sh);
      const fpSize = 1 + (fp % 3) * 0.5;
      const fpAlpha = 0.3 + Math.sin(t * 0.5 + fp) * 0.15;
      g.circle(fpx, fpy, fpSize).fill({ color: 0xbbddff, alpha: fpAlpha * freezeAlpha });
      // Tiny sparkle cross
      g.moveTo(fpx - 2, fpy).lineTo(fpx + 2, fpy)
        .stroke({ color: 0xffffff, width: 0.5, alpha: fpAlpha * freezeAlpha * 0.5 });
      g.moveTo(fpx, fpy - 2).lineTo(fpx, fpy + 2)
        .stroke({ color: 0xffffff, width: 0.5, alpha: fpAlpha * freezeAlpha * 0.5 });
    }

    // Central crystal burst
    g.circle(px, py, 14).fill({ color: 0xaaddff, alpha: 0.3 + Math.sin(t * 10) * 0.15 });
    g.circle(px, py, 8).fill({ color: 0xffffff, alpha: 0.45 });
  }

  // ---------------------------------------------------------------------------
  // Float texts — floating score/damage text
  // ---------------------------------------------------------------------------
  private _drawFloatTexts(state: CMState): void {
    for (let i = 0; i < state.floatTexts.length && i < FLOAT_POOL; i++) {
      const ft = state.floatTexts[i];
      const t = this._floatTexts[i];
      if (ft.life <= 0) { t.visible = false; continue; }
      const progress = 1 - ft.life / ft.maxLife;
      t.visible = true;
      t.text = ft.text;
      // Bounce-in then float up
      const bounceY = progress < 0.15 ? (1 - Math.pow(1 - progress / 0.15, 2)) * 8 : 0;
      t.position.set(ft.x + Math.sin(progress * 4 + ft.x * 0.1) * 2, ft.y - progress * 25 - bounceY);
      t.alpha = progress < 0.1 ? progress / 0.1 : ft.life / ft.maxLife; // fade in then fade out
      t.scale.set(ft.scale * (progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1 + progress * 0.25));
      t.style.fill = ft.color;
    }
    for (let i = state.floatTexts.length; i < FLOAT_POOL; i++) {
      this._floatTexts[i].visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // HUD — score, wave, HP, ability cooldowns, combo, kill streak, wave event
  // ---------------------------------------------------------------------------
  private _drawHUD(state: CMState): void {
    if (state.phase !== CMPhase.PLAYING && state.phase !== CMPhase.PAUSED) {
      this._hudText.visible = false;
      this._comboText.visible = false;
      this._waveText.visible = false;
      for (const cdTxt of this._cdTexts) cdTxt.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh;
    const ui = this._uiGfx;
    const t = state.time;

    // Top bar background
    ui.rect(0, 0, sw, 32).fill({ color: 0x000000, alpha: 0.45 });

    // Top HUD text — score, wave, HP, combo multiplier
    const comboMult = 1 + Math.min(state.comboCount, 10) * 0.1;
    const multStr = state.comboCount > 0 ? `  x${comboMult.toFixed(1)}` : "";
    this._hudText.text = `SCORE ${Math.floor(state.score)}   WAVE ${state.wave}   HP ${state.playerHP}/${state.maxHP}${multStr}`;
    this._hudText.visible = true;

    // Ability cooldown icons — bottom center row
    const iconY = sh - 38;
    const iconSpacing = 52;
    const iconCX = sw / 2;
    const icons = [
      { label: "BOLT", cd: state.boltCooldown, maxCd: CM.BOLT_COOLDOWN, color: 0x9966ff },
      { label: "DASH", cd: state.dashCooldown, maxCd: state.dashCooldownMax, color: 0x4488ff },
      { label: "PULSE", cd: state.pulseCooldown, maxCd: state.pulseCooldownMax, color: 0x6688ff },
      { label: "SHIFT", cd: state.chronoShiftCooldown, maxCd: state.chronoShiftCooldownMax, color: 0x22ffaa },
    ];

    for (let ic = 0; ic < icons.length; ic++) {
      const { label, cd, maxCd, color } = icons[ic];
      const iconX = iconCX + (ic - 1.5) * iconSpacing;
      const ready = cd <= 0;
      const cdRatio = ready ? 1 : 1 - cd / maxCd;
      const isShift = label === "SHIFT";

      // Background circle
      ui.circle(iconX, iconY, 18).fill({ color: 0x000000, alpha: 0.5 });
      ui.circle(iconX, iconY, 16).stroke({ color, width: 2, alpha: ready ? (0.8 + Math.sin(t * (isShift ? 4 : 2)) * 0.15) : 0.3 });

      // Inner glow
      const innerAlpha = ready ? (0.18 + Math.sin(t * (isShift ? 4 : 2)) * 0.06) : 0.06;
      ui.circle(iconX, iconY, 13).fill({ color, alpha: innerAlpha });

      // Cooldown arc fill
      if (!ready) {
        const arcSegs = 20;
        const filledSegs = Math.floor(arcSegs * cdRatio);
        for (let ai = 0; ai < filledSegs; ai++) {
          const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
          const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
          ui.moveTo(iconX + Math.cos(a1) * 14, iconY + Math.sin(a1) * 14)
            .lineTo(iconX + Math.cos(a2) * 14, iconY + Math.sin(a2) * 14)
            .stroke({ color, width: 2, alpha: 0.55 });
        }
      } else if (isShift) {
        // Chrono Shift glows green when ready — pulsing ring
        ui.circle(iconX, iconY, 22).stroke({ color: 0x22ffaa, width: 1.5, alpha: 0.3 + Math.sin(t * 5) * 0.2 });
        ui.circle(iconX, iconY, 26).fill({ color: 0x22ffaa, alpha: 0.04 + Math.sin(t * 5) * 0.02 });
      }

      // Label below icon
      // (kept minimal — just draws a small dot cluster or symbol)
      // Bolt icon: triple small dots; Dash: angled line; Pulse: ring; Shift: clock
      if (label === "BOLT") {
        for (let bd = 0; bd < 3; bd++) {
          g_drawDot(ui, iconX - 3 + bd * 3, iconY, 1.5, color, ready ? 0.7 : 0.3);
        }
      } else if (label === "DASH") {
        ui.moveTo(iconX - 5, iconY).lineTo(iconX + 5, iconY)
          .stroke({ color, width: 2, alpha: ready ? 0.7 : 0.3 });
        ui.moveTo(iconX + 2, iconY - 3).lineTo(iconX + 5, iconY).lineTo(iconX + 2, iconY + 3)
          .stroke({ color, width: 1.5, alpha: ready ? 0.7 : 0.3 });
      } else if (label === "PULSE") {
        ui.circle(iconX, iconY, 5).stroke({ color, width: 1.5, alpha: ready ? 0.7 : 0.3 });
        ui.circle(iconX, iconY, 8).stroke({ color, width: 1, alpha: ready ? 0.3 : 0.12 });
      } else {
        // Shift: mini clock face
        ui.circle(iconX, iconY, 5).stroke({ color, width: 1, alpha: ready ? 0.7 : 0.3 });
        const ha = t * 1.5;
        ui.moveTo(iconX, iconY)
          .lineTo(iconX + Math.cos(ha) * 3.5, iconY + Math.sin(ha) * 3.5)
          .stroke({ color, width: 1, alpha: ready ? 0.8 : 0.3 });
      }
    }

    // Cooldown number labels below ability icons
    const cdValues = [
      state.dashCooldown,
      state.pulseCooldown,
      (state as unknown as Record<string, number>).timeFreezeCooldown ?? 0,
      state.chronoShiftCooldown,
    ];
    for (let i = 0; i < 4; i++) {
      const cdTxt = this._cdTexts[i];
      const iconX = iconCX + (i - 1.5) * iconSpacing;
      const cdVal = cdValues[i];
      cdTxt.position.set(iconX, iconY + 26);
      if (cdVal > 0) {
        cdTxt.text = cdVal.toFixed(1) + "s";
        cdTxt.style.fill = 0xaabbcc;
      } else {
        cdTxt.text = "RDY";
        cdTxt.style.fill = 0x44ff88;
      }
      cdTxt.visible = true;
    }

    // Dodge cooldown arc around player (visual on player)
    if (state.dashCooldown > 0) {
      const dodgeRatio = 1 - state.dashCooldown / state.dashCooldownMax;
      const arcSegs = 20;
      const arcR = state.playerRadius + 14;
      for (let ai = 0; ai < Math.floor(arcSegs * dodgeRatio); ai++) {
        const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
        ui.moveTo(state.playerX + Math.cos(a1) * arcR, state.playerY + Math.sin(a1) * arcR)
          .lineTo(state.playerX + Math.cos(a2) * arcR, state.playerY + Math.sin(a2) * arcR)
          .stroke({ color: 0x4488ff, width: 2, alpha: 0.4 });
      }
    } else {
      const arcR = state.playerRadius + 14;
      ui.circle(state.playerX, state.playerY, arcR)
        .stroke({ color: 0x4488ff, width: 1, alpha: 0.12 + Math.sin(t * 2) * 0.04 });
    }

    // Chrono shift ready — green outer ring on player
    if (state.chronoShiftCooldown <= 0 || state.chronoShiftActive) {
      const shiftR = state.playerRadius + 22;
      ui.circle(state.playerX, state.playerY, shiftR)
        .stroke({ color: 0x22ffaa, width: 2, alpha: 0.4 + Math.sin(t * 5) * 0.2 });
      ui.circle(state.playerX, state.playerY, shiftR + 4)
        .fill({ color: 0x22ffaa, alpha: 0.04 + Math.sin(t * 5) * 0.02 });
    }

    // Combo counter — large center-top when >= 3
    if (state.comboCount >= 3) {
      const comboScale = Math.min(2.0, 1.0 + state.comboCount * 0.08);
      const comboAlpha = Math.min(1, state.comboTimer / 1.5) * 0.75;
      const comboColor = state.comboCount >= 10 ? 0xff2244 : state.comboCount >= 5 ? 0xffaa00 : 0x22ffaa;
      const comboY = 56;
      ui.rect(sw / 2 - 44, comboY - 12, 88, 28).fill({ color: 0x000000, alpha: comboAlpha * 0.3 });
      this._comboText.visible = true;
      this._comboText.text = `${state.comboCount}x`;
      this._comboText.style.fill = comboColor;
      this._comboText.anchor.set(0.5);
      this._comboText.position.set(sw / 2, comboY);
      this._comboText.scale.set(comboScale);
      this._comboText.alpha = comboAlpha;
    } else {
      this._comboText.visible = false;
    }

    // Kill streak text
    if (state.killStreakCount >= 3 && state.killStreakTimer > 0) {
      const streakAlpha = Math.min(1, state.killStreakTimer);
      ui.rect(sw / 2 - 55, 88, 110, 16).fill({ color: 0x000000, alpha: streakAlpha * 0.3 });
      this._waveText.text = `${state.killStreakCount} KILL STREAK!`;
      this._waveText.anchor.set(0.5);
      this._waveText.position.set(sw / 2, 96);
      this._waveText.alpha = streakAlpha;
      this._waveText.visible = true;
    } else if (state.waveEventActive !== "") {
      // Wave event banner — type-specific color
      const eventName = state.waveEventActive.toLowerCase();
      const eventColor = eventName.includes("frenzy") || eventName.includes("rush") ? 0xff4422
        : eventName.includes("freeze") || eventName.includes("cryo") ? 0x44ccff
        : eventName.includes("elite") || eventName.includes("champion") ? 0xffd700
        : eventName.includes("void") ? 0xcc00ff
        : 0x6644cc;
      const bannerW = 200, bannerH = 22;
      const bannerX = sw / 2 - bannerW / 2, bannerY = 34;
      ui.rect(bannerX - 2, bannerY - 2, bannerW + 4, bannerH + 4).fill({ color: 0x000000, alpha: 0.55 });
      ui.rect(bannerX, bannerY, bannerW, bannerH).fill({ color: eventColor, alpha: 0.08 });
      ui.rect(bannerX, bannerY, bannerW, bannerH).stroke({ color: eventColor, width: 1.5, alpha: 0.5 });
      // Accent lines at sides
      ui.rect(bannerX, bannerY, 3, bannerH).fill({ color: eventColor, alpha: 0.7 });
      ui.rect(bannerX + bannerW - 3, bannerY, 3, bannerH).fill({ color: eventColor, alpha: 0.7 });
      this._waveText.text = state.waveEventActive.toUpperCase();
      this._waveText.style.fill = eventColor;
      this._waveText.anchor.set(0.5);
      this._waveText.position.set(sw / 2, bannerY + bannerH / 2);
      this._waveText.alpha = 0.92;
      this._waveText.visible = true;
    } else {
      this._waveText.visible = false;
    }

    // Synergy bonus display
    const synergyBonus = (state as unknown as Record<string, unknown>).synergyBonus as string | undefined;
    const synergyTimer = (state as unknown as Record<string, unknown>).synergyTimer as number | undefined;
    if (synergyBonus && synergyTimer && synergyTimer > 0) {
      const synAlpha = Math.min(1, synergyTimer / 1.5) * 0.85;
      const synY = 110;
      const synW = 150;
      ui.rect(sw / 2 - synW / 2, synY - 8, synW, 20).fill({ color: 0x000000, alpha: synAlpha * 0.4 });
      ui.rect(sw / 2 - synW / 2, synY - 8, synW, 20).stroke({ color: CM.COLOR_GOLD, width: 1, alpha: synAlpha * 0.6 });
      // Accent dots at corners
      ui.circle(sw / 2 - synW / 2, synY + 2, 2).fill({ color: CM.COLOR_GOLD, alpha: synAlpha * 0.7 });
      ui.circle(sw / 2 + synW / 2, synY + 2, 2).fill({ color: CM.COLOR_GOLD, alpha: synAlpha * 0.7 });
    }

    // Off-screen enemy indicators — arrows at screen edges
    const margin = 30;
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer > 0) continue;
      const ex = e.x, ey = e.y;
      // Only show if significantly off-screen
      if (ex < -5 || ex > sw + 5 || ey < -5 || ey > sh + 5) {
        const toEnemy = Math.atan2(ey - sh / 2, ex - sw / 2);
        // Clamp indicator to screen edge
        let ix = sw / 2 + Math.cos(toEnemy) * (sw / 2 - margin);
        let iy = sh / 2 + Math.sin(toEnemy) * (sh / 2 - margin);
        ix = Math.max(margin, Math.min(sw - margin, ix));
        iy = Math.max(margin, Math.min(sh - margin, iy));
        // Arrow triangle
        const arrowSize = 5;
        ui.moveTo(ix + Math.cos(toEnemy) * arrowSize, iy + Math.sin(toEnemy) * arrowSize)
          .lineTo(ix + Math.cos(toEnemy + 2.5) * arrowSize, iy + Math.sin(toEnemy + 2.5) * arrowSize)
          .lineTo(ix + Math.cos(toEnemy - 2.5) * arrowSize, iy + Math.sin(toEnemy - 2.5) * arrowSize)
          .closePath()
          .fill({ color: e.elite ? 0xffd700 : 0xff4444, alpha: 0.5 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------
  private _drawStartScreen(state: CMState, meta: CMMeta): void {
    if (state.phase !== CMPhase.START) {
      this._titleText.visible = false;
      this._subtitleText.visible = false;
      this._controlsText.visible = false;
      this._promptText.visible = false;
      this._highScoreText.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh, g = this._gfx, t = state.time;

    // Dark overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });

    // Ambient temporal energy flows across the screen
    for (let fi = 0; fi < 5; fi++) {
      const flowY = sh * (0.2 + fi * 0.15) + Math.sin(t * 0.7 + fi * 1.5) * 20;
      const flowAlpha = 0.03 + Math.sin(t * 0.5 + fi) * 0.01;
      g.moveTo(0, flowY).lineTo(sw, flowY + Math.sin(t * 0.3 + fi) * 30)
        .stroke({ color: 0x6644cc, width: 20, alpha: flowAlpha });
    }
    // Floating rune particles in background
    for (let rp = 0; rp < 12; rp++) {
      const rpx = ((rp * 179 + 37 + t * (5 + rp * 0.8)) % (sw + 40)) - 20;
      const rpy = ((rp * 347 + 89) % sh);
      const rpAlpha = 0.08 + Math.sin(t * 1.5 + rp) * 0.04;
      this._drawTemporalRune(g, rpx, rpy, 3 + (rp % 3), 0x4488ff, rpAlpha, t * 0.5 + rp);
    }

    // Animated hourglass icon above title
    const hgCX = sw / 2, hgCY = sh * 0.17;
    const hgW = 18, hgH = 28;
    // Sand fill top (emptying)
    const sandFill = 0.5 + Math.sin(t * 0.8) * 0.35; // 0.15–0.85 range
    const topH = hgH * 0.45 * sandFill;
    // Hourglass outline
    g.moveTo(hgCX - hgW, hgCY - hgH / 2)
      .lineTo(hgCX + hgW, hgCY - hgH / 2)
      .lineTo(hgCX, hgCY)
      .lineTo(hgCX + hgW, hgCY + hgH / 2)
      .lineTo(hgCX - hgW, hgCY + hgH / 2)
      .lineTo(hgCX, hgCY)
      .closePath()
      .stroke({ color: 0x6644cc, width: 2, alpha: 0.7 });
    // Sand in top half
    g.moveTo(hgCX - hgW * sandFill, hgCY - hgH / 2)
      .lineTo(hgCX + hgW * sandFill, hgCY - hgH / 2)
      .lineTo(hgCX, hgCY - hgH * 0.5 + topH)
      .closePath()
      .fill({ color: 0x8866ff, alpha: 0.4 });
    // Sand in bottom half
    const botFill = 1 - sandFill;
    const botH = hgH * 0.45 * botFill;
    g.moveTo(hgCX - hgW * botFill, hgCY + hgH / 2)
      .lineTo(hgCX + hgW * botFill, hgCY + hgH / 2)
      .lineTo(hgCX, hgCY + hgH / 2 - botH)
      .closePath()
      .fill({ color: 0x4466ff, alpha: 0.35 });
    // Falling sand particle
    const sandParticleY = hgCY + (t * 30 % (hgH * 0.5));
    g.circle(hgCX, hgCY + sandParticleY * 0.08, 1.2).fill({ color: 0xaaaaff, alpha: 0.5 });
    // Hourglass glow
    g.circle(hgCX, hgCY, hgH * 0.7).fill({ color: 0x6644cc, alpha: 0.05 + Math.sin(t * 2) * 0.02 });

    // Title
    this._titleText.anchor.set(0.5);
    this._titleText.position.set(sw / 2, sh * 0.28);
    this._titleText.visible = true;

    // Subtitle
    this._subtitleText.anchor.set(0.5);
    this._subtitleText.position.set(sw / 2, sh * 0.35);
    this._subtitleText.visible = true;

    // Orbiting time runes around the title area
    const demoY = sh * 0.44;
    for (let ri = 0; ri < 6; ri++) {
      const rAngle = t * 0.7 + ri * Math.PI / 3;
      const rDist = 38 + Math.sin(t * 1.5 + ri * 0.8) * 5;
      const rx = sw / 2 + Math.cos(rAngle) * rDist;
      const ry = demoY + Math.sin(rAngle) * 12;
      const rc = ri % 2 === 0 ? 0x6644cc : 0x4488ff;
      this._drawTemporalRune(g, rx, ry, 4, rc, 0.5 + Math.sin(t * 2 + ri) * 0.2, t + ri);
      g.circle(rx, ry, 8).fill({ color: rc, alpha: 0.06 });
    }

    // Controls list
    this._controlsText.text =
      "WASD — Move\n" +
      "Mouse — Aim\n" +
      "Left Click — Time Bolt\n" +
      "Shift — Time Dash\n" +
      "Space — Time Pulse\n" +
      "E — Time Freeze\n" +
      "Q — Chrono Shift\n" +
      "ESC — Pause";
    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(sw / 2, sh * 0.57);
    this._controlsText.visible = true;

    // High score display
    if (meta.highScore > 0) {
      g.rect(sw / 2 - 75, sh * 0.73, 150, 20).fill({ color: 0x000000, alpha: 0.35 });
      g.rect(sw / 2 - 75, sh * 0.73, 150, 20).stroke({ color: 0x3322aa, width: 1, alpha: 0.4 });
      this._highScoreText.text = `High Score: ${meta.highScore}  |  Best Wave: ${meta.bestWave}`;
      this._highScoreText.anchor.set(0.5);
      this._highScoreText.position.set(sw / 2, sh * 0.73 + 10);
      this._highScoreText.visible = true;
    } else {
      this._highScoreText.visible = false;
    }

    // "Press SPACE to begin" pulsing prompt
    this._promptText.text = "Press SPACE to begin";
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(sw / 2, sh * 0.82);
    this._promptText.alpha = 0.5 + Math.sin(t * 2.5) * 0.3;
    this._promptText.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------
  private _drawPauseScreen(state: CMState): void {
    if (state.phase !== CMPhase.PAUSED) {
      this._pauseText.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh, g = this._gfx;
    const t = state.time;
    // Dark overlay with vignette
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    // Vignette edges
    g.rect(0, 0, sw, 40).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(0, sh - 40, sw, 40).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(0, 0, 40, sh).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(sw - 40, 0, 40, sh).fill({ color: 0x000000, alpha: 0.2 });
    // Decorative border lines
    g.rect(sw / 2 - 120, sh / 2 - 40, 240, 80).stroke({ color: 0x6644cc, width: 2, alpha: 0.4 });
    g.rect(sw / 2 - 124, sh / 2 - 44, 248, 88).stroke({ color: 0x4488ff, width: 1, alpha: 0.2 });
    // Corner accents
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [cx, cy] of corners) {
      const cxx = sw / 2 + cx * 120, cyy = sh / 2 + cy * 40;
      g.circle(cxx, cyy, 3).fill({ color: 0x6644cc, alpha: 0.5 + Math.sin(t * 2) * 0.2 });
    }
    // Hourglass icon above text
    const hx = sw / 2, hy = sh / 2 - 18;
    g.moveTo(hx - 6, hy - 8).lineTo(hx + 6, hy - 8).lineTo(hx, hy).closePath()
      .stroke({ color: 0x6644cc, width: 1.5, alpha: 0.5 });
    g.moveTo(hx - 6, hy + 8).lineTo(hx + 6, hy + 8).lineTo(hx, hy).closePath()
      .stroke({ color: 0x6644cc, width: 1.5, alpha: 0.5 });
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(sw / 2, sh / 2 + 14);
    this._pauseText.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Death screen — grade display, stats, upgrade shop
  // ---------------------------------------------------------------------------
  private _drawDeathScreen(state: CMState, meta: CMMeta): void {
    if (state.phase !== CMPhase.DEAD) {
      this._gradeText.visible = false;
      this._statText.visible = false;
      this._deathPrompt.visible = false;
      this._shopTitle.visible = false;
      this._shardText.visible = false;
      for (const t of this._shopTexts) t.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh, g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.68 });

    // Fading temporal residue in background
    for (let ri = 0; ri < 4; ri++) {
      const rx = sw * (0.15 + ri * 0.25);
      const ry = sh * 0.5;
      const rr = 80 + Math.sin(state.time * 0.4 + ri * 2) * 20;
      g.circle(rx, ry, rr).fill({ color: 0x220044, alpha: 0.06 + Math.sin(state.time * 0.6 + ri) * 0.02 });
    }
    // Slowly falling particle motes
    for (let mi = 0; mi < 8; mi++) {
      const mx = ((mi * 211 + 43) % sw);
      const my = ((mi * 97 + state.time * 12) % sh);
      g.circle(mx, my, 1).fill({ color: 0x6644cc, alpha: 0.12 + Math.sin(state.time + mi) * 0.05 });
    }

    // Grade display
    const grade = getCMGrade(state.score);
    this._gradeText.text = grade.grade;
    this._gradeText.style.fill = grade.color;
    this._gradeText.anchor.set(0.5);
    this._gradeText.position.set(sw / 2, sh * 0.28);
    this._gradeText.visible = true;

    // Grade glow ring
    g.circle(sw / 2, sh * 0.28, 42).stroke({
      color: grade.color, width: 2, alpha: 0.35 + Math.sin(state.time * 2) * 0.1,
    });
    g.circle(sw / 2, sh * 0.28, 52).fill({ color: grade.color, alpha: 0.05 });

    // Stats
    const bestCombo = (state as unknown as Record<string, unknown>).bestCombo as number | undefined;
    this._statText.text =
      `Score: ${Math.floor(state.score)}\n` +
      `Wave: ${Math.floor(state.wave)}\n` +
      `Enemies Slain: ${Math.floor(state.enemiesKilled)}\n` +
      `Best Combo: ${Math.floor(bestCombo ?? state.comboCount)}x`;
    this._statText.anchor.set(0.5);
    this._statText.position.set(sw / 2, sh * 0.48);
    this._statText.visible = true;

    // Death prompt
    this._deathPrompt.text = "Press SPACE to try again";
    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(sw / 2, sh * 0.72);
    this._deathPrompt.alpha = 0.5 + Math.sin(state.time * 2.5) * 0.3;
    this._deathPrompt.visible = true;

    // Upgrade shop panel (right side)
    this._drawUpgradeShop(g, state, meta, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Upgrade shop panel — shown on death screen
  // ---------------------------------------------------------------------------
  private _drawUpgradeShop(g: Graphics, _state: CMState, meta: CMMeta, sw: number, sh: number): void {
    const shards = meta.shards || 0;
    const upg = meta.upgrades || { maxHP: 0, boltPower: 0, dashCooldown: 0, pulsePower: 0, chronoShift: 0 };
    const costs = CM.UPGRADE_COSTS as Record<string, number[]>;

    const panelW = 290, panelH = 196;
    const panelX = sw - panelW - 16, panelY = sh * 0.12;

    // Panel background
    g.rect(panelX, panelY, panelW, panelH).fill({ color: 0x000000, alpha: 0.78 });
    g.rect(panelX, panelY, panelW, panelH).stroke({ color: 0x3322aa, width: 1.5, alpha: 0.6 });
    g.rect(panelX + 3, panelY + 3, panelW - 6, panelH - 6).stroke({ color: 0x221144, width: 0.5, alpha: 0.4 });

    const upgrades: { key: string; name: string; maxLvl: number }[] = [
      { key: "maxHP",       name: "MAX HP",       maxLvl: 3 },
      { key: "boltPower",   name: "BOLT POWER",   maxLvl: 3 },
      { key: "dashCooldown",name: "DASH SPEED",   maxLvl: 3 },
      { key: "pulsePower",  name: "PULSE RANGE",  maxLvl: 3 },
      { key: "chronoShift", name: "CHRONO SHIFT", maxLvl: 2 },
    ];

    // Shop title
    this._shopTitle.visible = true;
    this._shopTitle.anchor.set(0.5, 0);
    this._shopTitle.position.set(panelX + panelW / 2, panelY + 6);

    // Shards count
    this._shardText.visible = true;
    this._shardText.anchor.set(0, 0);
    this._shardText.text = `Shards: ${shards}`;
    this._shardText.position.set(panelX + 10, panelY + 28);

    const lineH = 27;
    const startY = panelY + 48;

    for (let i = 0; i < upgrades.length; i++) {
      const u = upgrades[i];
      const level = (upg as Record<string, number>)[u.key] || 0;
      const maxed = level >= u.maxLvl;
      const cost = maxed ? 0 : (costs[u.key]?.[level] ?? 999);
      const affordable = !maxed && shards >= cost;
      const ly = startY + i * lineH;
      const txt = this._shopTexts[i];

      // Row background tint
      const rowColor = maxed ? 0x112233 : affordable ? 0x111122 : 0x0a0a14;
      g.rect(panelX + 6, ly - 2, panelW - 12, lineH - 2).fill({ color: rowColor, alpha: 0.45 });
      // Affordable: subtle left accent line
      if (affordable) {
        g.rect(panelX + 6, ly - 2, 2, lineH - 2).fill({ color: 0x6644cc, alpha: 0.7 });
      } else if (maxed) {
        g.rect(panelX + 6, ly - 2, 2, lineH - 2).fill({ color: 0x22ffaa, alpha: 0.5 });
      }

      // Text: [N] NAME    Lv X/Y    Cost: Z (or MAX)
      const costStr = maxed ? "MAX" : `Cost: ${cost}`;
      const lvStr = `Lv ${level}/${u.maxLvl}`;
      txt.text = `[${i + 1}] ${u.name.padEnd(12)} ${lvStr.padEnd(7)} ${costStr}`;

      // Color coding
      const textColor = maxed ? 0x22ffaa : affordable ? 0xffd700 : 0x556688;
      txt.style.fill = textColor;
      txt.anchor.set(0, 0.5);
      txt.position.set(panelX + 12, ly + (lineH - 2) / 2 - 1);
      txt.visible = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function g_drawDot(g: Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
  g.circle(x, y, r).fill({ color, alpha });
}
