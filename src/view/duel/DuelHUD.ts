// ---------------------------------------------------------------------------
// Duel mode – HUD (fantasiaCup-style health bars, timer, combos, announcements)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { DuelBalance } from "../../duel/config/DuelBalanceConfig";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import type { DuelState } from "../../duel/state/DuelState";
import { DuelComboChallengeSystem } from "../../duel/systems/DuelComboChallengeSystem";
import { resolveRank, formatRank } from "../../duel/config/DuelRankedConfig";
import type { DuelDramaticRenderInfo } from "../../duel/systems/DuelDramaticFinisher";
import { getDramaticFinisherRenderInfo } from "../../duel/systems/DuelDramaticFinisher";
import { ASSIST_COOLDOWN_FRAMES } from "../../duel/systems/DuelAssistSystem";

const HP_BAR_HEIGHT = 36;
const HP_BAR_Y = 40;
const HP_BAR_MARGIN = 50;
const TIMER_BOX_W = 76;
const TIMER_BOX_H = 56;
const ZEAL_BAR_HEIGHT = 10;
const ZEAL_BAR_Y = HP_BAR_Y + HP_BAR_HEIGHT + 6;

// Colors
const COL_BG_DARK = 0x111111;
const COL_BORDER = 0x555555;
const COL_TIMER_BG = 0x1a1a2e;
const COL_TIMER_BORDER = 0xe94560;
const COL_TEXT = 0xffffff;
const COL_ROUND_WON = 0xe94560;

const COL_HP_GREEN = 0x22cc44;
const COL_HP_YELLOW = 0xccaa22;
const COL_HP_RED = 0xcc2222;
const COL_DRAIN = 0xcc8800;

// Combo colors by hit count
const COMBO_COLORS = [0xffff00, 0xff8800, 0xff4400, 0xff0000, 0xff00ff];

export class DuelHUD {
  readonly container = new Container();

  private _healthBarGfx = new Graphics();
  private _zealBarGfx = new Graphics();
  private _timerGfx = new Graphics();
  private _comboGfx = new Graphics();
  private _announcementGfx = new Graphics();
  private _roundDotGfx = new Graphics();

  private _timerText: Text;
  private _p1Name: Text;
  private _p2Name: Text;

  // Combo text elements
  private _p1ComboHit: Text;
  private _p1ComboLabel: Text;
  private _p1ComboDmg: Text;
  private _p2ComboHit: Text;
  private _p2ComboLabel: Text;
  private _p2ComboDmg: Text;

  private _announcementText: Text;

  private _screenW = 0;
  private _screenH = 0;
  private _hpBarWidth = 300;

  // Smooth health display (drains down over time)
  private _p1HealthDisplay = 1;
  private _p2HealthDisplay = 1;
  private _p1HealthDrain = 1;
  private _p2HealthDrain = 1;

  // Combo display timers
  private _p1ComboTimer = 0;
  private _p1ComboCount = 0;
  private _p1ComboDamage = 0;
  private _p1LastCount = 0;
  private _p2ComboTimer = 0;
  private _p2ComboCount = 0;
  private _p2ComboDamage = 0;
  private _p2LastCount = 0;

  // Zeal meter tracking
  private _p1ZealDisplay = 0;
  private _p2ZealDisplay = 0;
  private _p1ZealFlash = 0;
  private _p2ZealFlash = 0;

  // Training mode display
  private _trainingInfo: Text;

  // Wave mode display
  private _waveInfo: Text;

  // Announcement animation
  private _announcementScale = 1;

  // Frame data overlay (training mode)
  private _frameDataGfx = new Graphics();
  private _frameDataP1: Text;
  private _frameDataP2: Text;

  // Hitbox overlay graphics
  private _hitboxGfx = new Graphics();

  // Combo challenge display
  private _challengeGfx = new Graphics();
  private _challengeTitle: Text;
  private _challengeNotation: Text;
  private _challengeProgress: Text;
  private _challengeStatus: Text;

  // Ranked display
  private _rankedInfo: Text;

  // Assist cooldown display
  private _assistGfx = new Graphics();
  private _assistP1Label: Text;
  private _assistP2Label: Text;

  // Dramatic finisher overlay
  private _finisherGfx = new Graphics();
  private _finisherText: Text;
  private _finisherName: Text;

  constructor() {
    this._timerText = new Text({
      text: "99",
      style: { fontFamily: '"Segoe UI", monospace', fontSize: 38, fill: COL_TEXT, fontWeight: "bold" },
    });
    this._p1Name = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 20, fill: COL_TEXT, fontWeight: "bold" },
    });
    this._p2Name = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 20, fill: COL_TEXT, fontWeight: "bold" },
    });

    // P1 combo
    this._p1ComboHit = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 48, fill: 0xffff00, fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 } },
    });
    this._p1ComboLabel = new Text({
      text: "COMBO",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 20, fill: COL_TEXT, fontWeight: "bold" },
    });
    this._p1ComboDmg = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 28, fill: 0x44ddff, fontWeight: "bold",
        stroke: { color: 0x000000, width: 2 } },
    });

    // P2 combo
    this._p2ComboHit = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 48, fill: 0xffff00, fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 } },
    });
    this._p2ComboLabel = new Text({
      text: "COMBO",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 20, fill: COL_TEXT, fontWeight: "bold" },
    });
    this._p2ComboDmg = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 28, fill: 0x44ddff, fontWeight: "bold",
        stroke: { color: 0x000000, width: 2 } },
    });

    // Announcement
    this._announcementText = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 72, fill: COL_TEXT, fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 } },
    });

    // Training info
    this._trainingInfo = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", monospace', fontSize: 14, fill: 0xaaaaaa },
    });
    this._trainingInfo.visible = false;

    // Wave info
    this._waveInfo = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 22, fill: 0xe94560, fontWeight: "bold",
        stroke: { color: 0x000000, width: 2 } },
    });
    this._waveInfo.anchor.set(0.5, 0);
    this._waveInfo.visible = false;

    // Frame data overlay
    this._frameDataP1 = new Text({
      text: "",
      style: { fontFamily: '"Courier New", monospace', fontSize: 11, fill: 0x00ff88 },
    });
    this._frameDataP2 = new Text({
      text: "",
      style: { fontFamily: '"Courier New", monospace', fontSize: 11, fill: 0x00ff88 },
    });
    this._frameDataP1.visible = false;
    this._frameDataP2.visible = false;

    // Combo challenge
    this._challengeTitle = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 18, fill: 0xffcc00, fontWeight: "bold" },
    });
    this._challengeNotation = new Text({
      text: "",
      style: { fontFamily: '"Courier New", monospace', fontSize: 16, fill: 0xffffff },
    });
    this._challengeProgress = new Text({
      text: "",
      style: { fontFamily: '"Courier New", monospace', fontSize: 14, fill: 0x44ddff },
    });
    this._challengeStatus = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Segoe UI", sans-serif', fontSize: 28, fill: 0x00ff00, fontWeight: "bold",
        stroke: { color: 0x000000, width: 2 } },
    });
    this._challengeTitle.visible = false;
    this._challengeNotation.visible = false;
    this._challengeProgress.visible = false;
    this._challengeStatus.visible = false;

    // Ranked display
    this._rankedInfo = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", sans-serif', fontSize: 16, fill: 0xaaaaaa, fontWeight: "bold" },
    });
    this._rankedInfo.visible = false;

    // Assist cooldown
    this._assistP1Label = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", monospace', fontSize: 12, fill: 0x44ddff },
    });
    this._assistP2Label = new Text({
      text: "",
      style: { fontFamily: '"Segoe UI", monospace', fontSize: 12, fill: 0x44ddff },
    });
    this._assistP1Label.visible = false;
    this._assistP2Label.visible = false;

    // Dramatic finisher
    this._finisherText = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 64, fill: 0xffdd00, fontWeight: "bold",
        stroke: { color: 0x000000, width: 5 } },
    });
    this._finisherName = new Text({
      text: "",
      style: { fontFamily: 'Impact, "Arial Black", sans-serif', fontSize: 36, fill: 0xffffff, fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 } },
    });
    this._finisherText.anchor.set(0.5);
    this._finisherName.anchor.set(0.5);
    this._finisherText.visible = false;
    this._finisherName.visible = false;

    this._p1ComboHit.anchor.set(0.5);
    this._p1ComboLabel.anchor.set(0.5);
    this._p1ComboDmg.anchor.set(0.5);
    this._p2ComboHit.anchor.set(0.5);
    this._p2ComboLabel.anchor.set(0.5);
    this._p2ComboDmg.anchor.set(0.5);
    this._announcementText.anchor.set(0.5);
    this._timerText.anchor.set(0.5);

    // Hide combo elements initially
    this._p1ComboHit.visible = false;
    this._p1ComboLabel.visible = false;
    this._p1ComboDmg.visible = false;
    this._p2ComboHit.visible = false;
    this._p2ComboLabel.visible = false;
    this._p2ComboDmg.visible = false;
    this._announcementText.visible = false;

    this.container.addChild(
      this._healthBarGfx,
      this._zealBarGfx,
      this._timerGfx,
      this._roundDotGfx,
      this._comboGfx,
      this._announcementGfx,
      this._frameDataGfx,
      this._hitboxGfx,
      this._assistGfx,
      this._challengeGfx,
      this._finisherGfx,
      this._timerText,
      this._p1Name,
      this._p2Name,
      this._p1ComboHit,
      this._p1ComboLabel,
      this._p1ComboDmg,
      this._p2ComboHit,
      this._p2ComboLabel,
      this._p2ComboDmg,
      this._announcementText,
      this._trainingInfo,
      this._waveInfo,
      this._frameDataP1,
      this._frameDataP2,
      this._challengeTitle,
      this._challengeNotation,
      this._challengeProgress,
      this._challengeStatus,
      this._rankedInfo,
      this._assistP1Label,
      this._assistP2Label,
      this._finisherText,
      this._finisherName,
    );
  }

  setP2Name(name: string): void {
    this._p2Name.text = name;
  }

  build(sw: number, sh: number, p1Name: string, p2Name: string): void {
    this._screenW = sw;
    this._screenH = sh;
    this._hpBarWidth = Math.round((sw / 2) - TIMER_BOX_W / 2 - HP_BAR_MARGIN - 10);
    this._p1Name.text = p1Name;
    this._p2Name.text = p2Name;

    // Position names above health bars
    const centerX = sw / 2;
    this._p1Name.position.set(centerX - this._hpBarWidth - TIMER_BOX_W / 2 - 10, HP_BAR_Y - 28);
    this._p2Name.anchor.set(1, 0);
    this._p2Name.position.set(centerX + this._hpBarWidth + TIMER_BOX_W / 2 + 10, HP_BAR_Y - 28);

    // Timer
    this._timerText.position.set(centerX, HP_BAR_Y + HP_BAR_HEIGHT / 2);

    // Announcement centered
    this._announcementText.position.set(sw / 2, sh / 2 - 50);

    // Reset health display
    this._p1HealthDisplay = 1;
    this._p2HealthDisplay = 1;
    this._p1HealthDrain = 1;
    this._p2HealthDrain = 1;
    this._p1ComboTimer = 0;
    this._p2ComboTimer = 0;
  }

  update(state: DuelState): void {
    const sw = this._screenW;
    const sh = this._screenH;
    const centerX = sw / 2;
    const [f1, f2] = state.fighters;
    const dt = 1 / 60; // fixed timestep

    // ===== Smooth health bars =====
    const p1Ratio = Math.max(0, f1.hp / f1.maxHp);
    const p2Ratio = Math.max(0, f2.hp / f2.maxHp);

    // Fast drain to current health
    const healthSpeed = 0.8 * dt * 60; // ~800 units per second normalized
    if (this._p1HealthDisplay > p1Ratio)
      this._p1HealthDisplay = Math.max(p1Ratio, this._p1HealthDisplay - healthSpeed * dt * 60);
    if (this._p2HealthDisplay > p2Ratio)
      this._p2HealthDisplay = Math.max(p2Ratio, this._p2HealthDisplay - healthSpeed * dt * 60);

    // Slow drain (yellow bar)
    const drainSpeed = 0.3 * dt * 60;
    if (this._p1HealthDrain > this._p1HealthDisplay)
      this._p1HealthDrain = Math.max(this._p1HealthDisplay, this._p1HealthDrain - drainSpeed * dt * 60);
    if (this._p2HealthDrain > this._p2HealthDisplay)
      this._p2HealthDrain = Math.max(this._p2HealthDisplay, this._p2HealthDrain - drainSpeed * dt * 60);

    // ===== Draw health bars =====
    this._healthBarGfx.clear();
    const barW = this._hpBarWidth;
    const p1X = centerX - TIMER_BOX_W / 2 - 10 - barW;
    const p2X = centerX + TIMER_BOX_W / 2 + 10;

    this._drawHealthBar(this._healthBarGfx, p1X, HP_BAR_Y, barW, HP_BAR_HEIGHT,
      this._p1HealthDisplay, this._p1HealthDrain, true);
    this._drawHealthBar(this._healthBarGfx, p2X, HP_BAR_Y, barW, HP_BAR_HEIGHT,
      this._p2HealthDisplay, this._p2HealthDrain, false);

    // ===== Timer =====
    this._timerGfx.clear();
    const timerX = centerX - TIMER_BOX_W / 2;
    const timerY = HP_BAR_Y - 10;
    this._timerGfx.roundRect(timerX, timerY, TIMER_BOX_W, TIMER_BOX_H, 8);
    this._timerGfx.fill({ color: COL_TIMER_BG });
    this._timerGfx.stroke({ color: COL_TIMER_BORDER, width: 3 });

    const seconds = Math.ceil(state.round.timeRemaining / 60);
    const timerVal = Math.max(0, seconds);
    this._timerText.text = String(timerVal).padStart(2, "0");
    this._timerText.style.fill = timerVal <= 10 ? 0xff4444 : COL_TEXT;

    // ===== Round indicators =====
    this._roundDotGfx.clear();
    const dotsY = HP_BAR_Y + HP_BAR_HEIGHT + 18;
    const roundsNeeded = Math.ceil(state.bestOf / 2);
    const p1Wins = state.roundResults.filter((w) => w === 0).length;
    const p2Wins = state.roundResults.filter((w) => w === 1).length;

    for (let i = 0; i < roundsNeeded; i++) {
      // P1 dots
      const d1x = p1X + i * 22 + 8;
      this._roundDotGfx.circle(d1x, dotsY, 8);
      if (i < p1Wins) {
        this._roundDotGfx.fill({ color: COL_ROUND_WON });
      } else {
        this._roundDotGfx.fill({ color: 0x111111, alpha: 0.01 });
        this._roundDotGfx.circle(d1x, dotsY, 8);
        this._roundDotGfx.stroke({ color: COL_ROUND_WON, width: 2 });
      }

      // P2 dots
      const d2x = p2X + barW - i * 22 - 8;
      this._roundDotGfx.circle(d2x, dotsY, 8);
      if (i < p2Wins) {
        this._roundDotGfx.fill({ color: COL_ROUND_WON });
      } else {
        this._roundDotGfx.fill({ color: 0x111111, alpha: 0.01 });
        this._roundDotGfx.circle(d2x, dotsY, 8);
        this._roundDotGfx.stroke({ color: COL_ROUND_WON, width: 2 });
      }
    }

    // ===== Zeal meters =====
    this._updateZealBars(f1.zealGauge, f2.zealGauge, centerX, barW, p1X, p2X);

    // ===== Combo display =====
    this._updateCombo(f1, f2, sw, sh);

    // ===== Announcement =====
    this._updateAnnouncement(state, sw, sh);

    // ===== Training mode info =====
    if (state.gameMode === "training") {
      this._trainingInfo.visible = true;
      const dummyLabels: Record<string, string> = {
        stand: "STAND", crouch: "CROUCH", jump: "JUMP", cpu: "CPU",
      };
      const dummyLabel = dummyLabels[state.trainingDummyMode] ?? "STAND";
      this._trainingInfo.text =
        `TRAINING MODE  |  Dummy: ${dummyLabel}  |  F1:Stand F2:Crouch F3:Jump F4:CPU F5:Reset`;
      this._trainingInfo.position.set(10, sh - 24);

      // Hide timer in training
      this._timerText.text = "\u221E";
      this._timerText.style.fill = 0x888888;
    } else {
      this._trainingInfo.visible = false;
    }

    // ===== Wave mode info =====
    if (state.gameMode === "wave") {
      this._waveInfo.visible = true;
      const enemyNum = state.waveEnemyIndex + 1;
      const totalEnemies = state.waveEnemies.length;
      const isBoss = state.waveEnemyIndex === totalEnemies - 1;
      const bossLabel = isBoss ? "  [BOSS]" : "";
      this._waveInfo.text = `WAVE ${state.waveNumber}  |  ${enemyNum}/${totalEnemies}${bossLabel}  |  KILLS: ${state.waveDefeated}`;
      this._waveInfo.position.set(sw / 2, sh - 30);
    } else {
      this._waveInfo.visible = false;
    }

    // ===== Training frame data overlay =====
    this._updateFrameData(state, sw, sh);

    // ===== Hitbox overlay =====
    this._updateHitboxOverlay(state);

    // ===== Combo challenge display =====
    this._updateComboChallengeDisplay(state, sw, sh);

    // ===== Ranked info =====
    this._updateRankedDisplay(state, sw, sh);

    // ===== Assist cooldown =====
    this._updateAssistDisplay(state, sw, sh);

    // ===== Dramatic finisher =====
    this._updateDramaticFinisher(state, sw, sh);
  }

  private _drawHealthBar(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    ratio: number,
    drainRatio: number,
    isP1: boolean,
  ): void {
    // Background
    g.roundRect(x - 2, y - 2, width + 4, height + 4, 4);
    g.fill({ color: COL_BG_DARK });
    g.stroke({ color: COL_BORDER, width: 2 });

    // Drain bar (yellow/orange)
    const drainWidth = drainRatio * width;
    if (isP1) {
      g.rect(x + width - drainWidth, y, drainWidth, height);
    } else {
      g.rect(x, y, drainWidth, height);
    }
    g.fill({ color: COL_DRAIN });

    // Health bar (green -> yellow -> red based on ratio)
    const healthWidth = ratio * width;
    const healthColor = ratio > 0.5 ? COL_HP_GREEN : ratio > 0.25 ? COL_HP_YELLOW : COL_HP_RED;

    if (isP1) {
      g.rect(x + width - healthWidth, y, healthWidth, height);
    } else {
      g.rect(x, y, healthWidth, height);
    }
    g.fill({ color: healthColor });

    // Shine effect (top third brighter)
    if (isP1) {
      g.rect(x + width - healthWidth, y, healthWidth, height / 3);
    } else {
      g.rect(x, y, healthWidth, height / 3);
    }
    g.fill({ color: 0xffffff, alpha: 0.15 });

    // Critical health flash
    if (ratio <= 0.25 && ratio > 0) {
      const flash = 0.2 + Math.sin(performance.now() / 150) * 0.15;
      if (isP1) {
        g.rect(x + width - healthWidth, y, healthWidth, height);
      } else {
        g.rect(x, y, healthWidth, height);
      }
      g.fill({ color: 0xff0000, alpha: flash });
    }
  }

  private _updateZealBars(
    p1Zeal: number, p2Zeal: number,
    _centerX: number, barW: number,
    p1X: number, p2X: number,
  ): void {
    this._zealBarGfx.clear();
    const max = DuelBalance.ZEAL_MAX;

    // Smooth display
    this._p1ZealDisplay += (p1Zeal - this._p1ZealDisplay) * 0.15;
    this._p2ZealDisplay += (p2Zeal - this._p2ZealDisplay) * 0.15;

    // Flash when reaching thresholds
    if (p1Zeal >= max && this._p1ZealFlash < 1) this._p1ZealFlash = 1;
    if (p2Zeal >= max && this._p2ZealFlash < 1) this._p2ZealFlash = 1;
    if (this._p1ZealFlash > 0) this._p1ZealFlash -= 1 / 60;
    if (this._p2ZealFlash > 0) this._p2ZealFlash -= 1 / 60;

    this._drawZealBar(this._zealBarGfx, p1X, ZEAL_BAR_Y, barW, ZEAL_BAR_HEIGHT,
      this._p1ZealDisplay / max, this._p1ZealFlash, true);
    this._drawZealBar(this._zealBarGfx, p2X, ZEAL_BAR_Y, barW, ZEAL_BAR_HEIGHT,
      this._p2ZealDisplay / max, this._p2ZealFlash, false);
  }

  private _drawZealBar(
    g: Graphics, x: number, y: number, width: number, height: number,
    ratio: number, flash: number, isP1: boolean,
  ): void {
    // Background
    g.roundRect(x - 1, y - 1, width + 2, height + 2, 3);
    g.fill({ color: 0x0a0a1a });
    g.stroke({ color: 0x333355, width: 1 });

    const fillW = Math.min(1, ratio) * width;
    if (fillW <= 0) return;

    // Color: blue → gold → white as it fills
    const col = ratio >= 1.0 ? 0xffdd66 : ratio >= 0.5 ? 0x4488ff : 0x2244aa;

    if (isP1) {
      g.rect(x + width - fillW, y, fillW, height);
    } else {
      g.rect(x, y, fillW, height);
    }
    g.fill({ color: col });

    // Half-meter notch
    const notchX = isP1 ? x + width * 0.5 : x + width * 0.5;
    g.rect(notchX - 0.5, y, 1, height);
    g.fill({ color: 0xffffff, alpha: 0.3 });

    // Shine
    if (isP1) {
      g.rect(x + width - fillW, y, fillW, height / 3);
    } else {
      g.rect(x, y, fillW, height / 3);
    }
    g.fill({ color: 0xffffff, alpha: 0.2 });

    // Full meter glow/pulse
    if (ratio >= 1.0) {
      const pulse = 0.15 + Math.sin(performance.now() / 200) * 0.1;
      g.roundRect(x - 2, y - 2, width + 4, height + 4, 4);
      g.fill({ color: 0xffdd66, alpha: pulse });
    }

    // Flash effect when reaching full
    if (flash > 0) {
      g.roundRect(x - 3, y - 3, width + 6, height + 6, 5);
      g.fill({ color: 0xffffff, alpha: flash * 0.5 });
    }
  }

  private _updateCombo(
    f1: { comboCount: number; comboDamage: number; maxHp: number; position: { x: number; y: number } },
    f2: { comboCount: number; comboDamage: number; maxHp: number; position: { x: number; y: number } },
    sw: number,
    sh: number,
  ): void {
    // P1's combo (shown when P1 is hitting P2 -> uses P2's combo stats actually)
    // In fantasiaCup: p1ComboDisplay shows when fighter2.comboCount > 1
    // Here: comboCount on the DEFENDER tracks how many times they've been hit
    // But our state has comboCount on the ATTACKER
    // f1.comboCount = number of hits P1 has landed in current combo

    if (f1.comboCount > 1) {
      if (f1.comboCount !== this._p1LastCount) {
        this._p1ComboTimer = 2; // reset timer on each new hit
      }
      this._p1ComboCount = f1.comboCount;
      this._p1ComboDamage = f1.comboDamage;
      this._p1LastCount = f1.comboCount;
    } else {
      this._p1LastCount = 0;
    }
    if (f2.comboCount > 1) {
      if (f2.comboCount !== this._p2LastCount) {
        this._p2ComboTimer = 2;
      }
      this._p2ComboCount = f2.comboCount;
      this._p2ComboDamage = f2.comboDamage;
      this._p2LastCount = f2.comboCount;
    } else {
      this._p2LastCount = 0;
    }
    if (this._p1ComboTimer > 0) this._p1ComboTimer -= 1 / 60;
    if (this._p2ComboTimer > 0) this._p2ComboTimer -= 1 / 60;

    // P1 combo display (left side)
    const showP1 = this._p1ComboTimer > 0 && this._p1ComboCount > 1;
    this._p1ComboHit.visible = showP1;
    this._p1ComboLabel.visible = showP1;
    this._p1ComboDmg.visible = showP1;

    if (showP1) {
      const comboX = 200;
      const comboY = sh / 2;
      const alpha = Math.min(1, this._p1ComboTimer);
      const colorIdx = Math.min(this._p1ComboCount - 2, COMBO_COLORS.length - 1);

      // Scale pop effect: big on new hit, settles to 1
      // When timer=2 (just hit): scale = 1 + 0.3*3 = 1.9
      // Quickly drops to 1.0
      const popScale = 1 + Math.max(0, 0.3 - (2 - this._p1ComboTimer)) * 3;

      this._p1ComboHit.text = `${this._p1ComboCount} HIT`;
      this._p1ComboHit.style.fill = COMBO_COLORS[colorIdx];
      this._p1ComboHit.alpha = alpha;
      this._p1ComboHit.position.set(comboX, comboY);
      this._p1ComboHit.scale.set(popScale);

      this._p1ComboLabel.alpha = alpha;
      this._p1ComboLabel.position.set(comboX, comboY + 36 * popScale);
      this._p1ComboLabel.scale.set(popScale * 0.8);

      const dmgPct = Math.round((this._p1ComboDamage / f2.maxHp) * 100);
      if (dmgPct > 0) {
        this._p1ComboDmg.visible = true;
        this._p1ComboDmg.text = `${dmgPct}%`;
        this._p1ComboDmg.style.fill = dmgPct >= 50 ? 0xff4444 : dmgPct >= 30 ? 0xffaa00 : 0x44ddff;
        this._p1ComboDmg.alpha = alpha;
        this._p1ComboDmg.position.set(comboX, comboY - 40 * popScale);
        this._p1ComboDmg.scale.set(popScale);
      }
    }

    // P2 combo display (right side)
    const showP2 = this._p2ComboTimer > 0 && this._p2ComboCount > 1;
    this._p2ComboHit.visible = showP2;
    this._p2ComboLabel.visible = showP2;
    this._p2ComboDmg.visible = showP2;

    if (showP2) {
      const comboX = sw - 200;
      const comboY = sh / 2;
      const alpha = Math.min(1, this._p2ComboTimer);
      const colorIdx = Math.min(this._p2ComboCount - 2, COMBO_COLORS.length - 1);

      const popScale = 1 + Math.max(0, 0.3 - (2 - this._p2ComboTimer)) * 3;

      this._p2ComboHit.text = `${this._p2ComboCount} HIT`;
      this._p2ComboHit.style.fill = COMBO_COLORS[colorIdx];
      this._p2ComboHit.alpha = alpha;
      this._p2ComboHit.position.set(comboX, comboY);
      this._p2ComboHit.scale.set(popScale);

      this._p2ComboLabel.alpha = alpha;
      this._p2ComboLabel.position.set(comboX, comboY + 36 * popScale);
      this._p2ComboLabel.scale.set(popScale * 0.8);

      const dmgPct = Math.round((this._p2ComboDamage / f1.maxHp) * 100);
      if (dmgPct > 0) {
        this._p2ComboDmg.visible = true;
        this._p2ComboDmg.text = `${dmgPct}%`;
        this._p2ComboDmg.style.fill = dmgPct >= 50 ? 0xff4444 : dmgPct >= 30 ? 0xffaa00 : 0x44ddff;
        this._p2ComboDmg.alpha = alpha;
        this._p2ComboDmg.position.set(comboX, comboY - 40 * popScale);
        this._p2ComboDmg.scale.set(popScale);
      }
    }
  }

  private _updateAnnouncement(state: DuelState, _sw: number, _sh: number): void {
    if (state.announcement) {
      this._announcementText.visible = true;
      this._announcementText.text = state.announcement;

      // Color based on announcement type
      const text = state.announcement;
      const color =
        text === "K.O.!" ? 0xff2222 :
        text === "FIGHT!" ? 0xffcc00 :
        text === "PERFECT!" ? 0xff44ff :
        text.includes("WINS") ? 0x44ddff :
        0xffffff;

      this._announcementText.style.fill = color;

      // Scale animation (starts big, settles to 1)
      if (state.announcementTimer > 0) {
        const timerRatio = state.announcementTimer / 60;
        this._announcementScale = 1 + Math.max(0, (timerRatio - 0.5)) * 2;
        this._announcementText.scale.set(this._announcementScale);
        this._announcementText.alpha = Math.min(1, state.announcementTimer / 15);
      }
    } else {
      this._announcementText.visible = false;
    }
  }

  // ---- Training mode: frame data overlay ------------------------------------

  private _updateFrameData(state: DuelState, sw: number, sh: number): void {
    const isTraining = state.gameMode === "training" || state.gameMode === "combo_challenge";
    if (!isTraining || !state.trainingShowFrameData) {
      this._frameDataP1.visible = false;
      this._frameDataP2.visible = false;
      this._frameDataGfx.clear();
      return;
    }

    this._frameDataP1.visible = true;
    this._frameDataP2.visible = true;
    this._frameDataGfx.clear();

    for (let i = 0; i < 2; i++) {
      const f = state.fighters[i];
      const charDef = DUEL_CHARACTERS[f.characterId];
      if (!charDef) continue;

      const textEl = i === 0 ? this._frameDataP1 : this._frameDataP2;
      const xPos = i === 0 ? 10 : sw - 240;
      const yBase = 110;

      // Build frame data string
      const lines: string[] = [];
      lines.push(`State: ${f.state}`);
      lines.push(`Combo: ${f.comboCount} | Chain: ${f.comboChain}`);
      lines.push(`Scaling: ${(f.comboDamageScaling * 100).toFixed(0)}%`);
      lines.push(`Zeal: ${Math.round(f.zealGauge)}/${DuelBalance.ZEAL_MAX}`);

      if (f.currentMove) {
        const move =
          charDef.normals[f.currentMove] ??
          charDef.specials[f.currentMove] ??
          charDef.zeals[f.currentMove] ??
          (f.currentMove === "grab" ? charDef.grab : null);

        if (move) {
          lines.push(`--- ${move.name} ---`);
          lines.push(`Startup: ${move.startup}f | Active: ${move.active}f | Recovery: ${move.recovery}f`);
          lines.push(`Total: ${move.startup + move.active + move.recovery}f`);
          lines.push(`Damage: ${move.damage} | Hitstun: ${move.hitstun}f`);
          lines.push(`Frame: ${f.moveFrame}/${move.startup + move.active + move.recovery}`);

          // Phase indicator
          if (f.moveFrame < move.startup) {
            lines.push(`Phase: STARTUP (${move.startup - f.moveFrame}f left)`);
          } else if (f.moveFrame < move.startup + move.active) {
            lines.push(`Phase: ACTIVE (${move.startup + move.active - f.moveFrame}f left)`);
          } else {
            lines.push(`Phase: RECOVERY (${move.startup + move.active + move.recovery - f.moveFrame}f left)`);
          }

          // Advantage on block/hit
          const advantageOnHit = move.hitstun - move.recovery;
          const advantageOnBlock = move.blockstun - move.recovery;
          const hitAdv = advantageOnHit >= 0 ? `+${advantageOnHit}` : `${advantageOnHit}`;
          const blockAdv = advantageOnBlock >= 0 ? `+${advantageOnBlock}` : `${advantageOnBlock}`;
          lines.push(`On Hit: ${hitAdv} | On Block: ${blockAdv}`);
        }
      } else {
        lines.push("No active move");
      }

      if (f.hitstunFrames > 0) lines.push(`Hitstun: ${f.hitstunFrames}f`);
      if (f.blockstunFrames > 0) lines.push(`Blockstun: ${f.blockstunFrames}f`);
      if (f.invincibleFrames > 0) lines.push(`Invincible: ${f.invincibleFrames}f`);

      textEl.text = lines.join("\n");
      textEl.position.set(xPos, yBase);

      // Draw background panel
      const panelW = 230;
      const panelH = lines.length * 14 + 8;
      this._frameDataGfx.roundRect(xPos - 4, yBase - 4, panelW, panelH, 4);
      this._frameDataGfx.fill({ color: 0x000000, alpha: 0.7 });
      this._frameDataGfx.stroke({ color: 0x00ff88, width: 1, alpha: 0.3 });
    }
  }

  // ---- Hitbox overlay -------------------------------------------------------

  private _updateHitboxOverlay(state: DuelState): void {
    this._hitboxGfx.clear();
    const isTraining = state.gameMode === "training" || state.gameMode === "combo_challenge";
    if (!isTraining || !state.trainingShowHitboxes) return;

    for (let i = 0; i < 2; i++) {
      const f = state.fighters[i];
      const charDef = DUEL_CHARACTERS[f.characterId];
      if (!charDef) continue;

      // Draw hurtbox (green)
      const isCrouching = f.stance === "crouching";
      const hurtH = isCrouching ? DuelBalance.CROUCH_HURTBOX_H : DuelBalance.STAND_HURTBOX_H;
      const hurtW = DuelBalance.STAND_HURTBOX_W;
      this._hitboxGfx.rect(
        f.position.x - hurtW / 2,
        f.position.y - hurtH,
        hurtW,
        hurtH,
      );
      this._hitboxGfx.stroke({ color: 0x00ff00, width: 1, alpha: 0.5 });

      // Draw active hitbox (red)
      if (f.currentMove && f.state === "attack") {
        const move =
          charDef.normals[f.currentMove] ??
          charDef.specials[f.currentMove] ??
          charDef.zeals[f.currentMove];

        if (move && f.moveFrame >= move.startup && f.moveFrame < move.startup + move.active) {
          const dir = f.facingRight ? 1 : -1;
          const hbX = f.position.x + dir * move.hitbox.x;
          const hbY = f.position.y + move.hitbox.y;
          const hbLeft = dir > 0 ? hbX : hbX - move.hitbox.width;

          this._hitboxGfx.rect(hbLeft, hbY, move.hitbox.width, move.hitbox.height);
          this._hitboxGfx.fill({ color: 0xff0000, alpha: 0.25 });
          this._hitboxGfx.stroke({ color: 0xff0000, width: 2, alpha: 0.8 });
        }
      }
    }
  }

  // ---- Combo challenge display ----------------------------------------------

  private _updateComboChallengeDisplay(state: DuelState, sw: number, sh: number): void {
    const cs = state.comboChallengeState;
    if (!cs || !cs.active) {
      this._challengeTitle.visible = false;
      this._challengeNotation.visible = false;
      this._challengeProgress.visible = false;
      this._challengeStatus.visible = false;
      this._challengeGfx.clear();
      return;
    }

    const challenge = DuelComboChallengeSystem.getCurrentChallenge(cs);
    if (!challenge) {
      this._challengeTitle.visible = false;
      this._challengeNotation.visible = false;
      this._challengeProgress.visible = false;
      this._challengeStatus.visible = false;
      this._challengeGfx.clear();
      return;
    }

    this._challengeGfx.clear();

    // Position: right side of screen, middle
    const panelX = sw - 320;
    const panelY = sh / 2 - 60;
    const panelW = 300;
    const panelH = 140;

    // Background
    this._challengeGfx.roundRect(panelX, panelY, panelW, panelH, 8);
    this._challengeGfx.fill({ color: 0x000000, alpha: 0.8 });
    this._challengeGfx.stroke({ color: 0xffcc00, width: 2, alpha: 0.6 });

    // Title
    const progress = DuelComboChallengeSystem.getProgress(cs);
    this._challengeTitle.visible = true;
    this._challengeTitle.text = `COMBO ${cs.challengeIndex + 1}/${progress.total}: ${challenge.name}`;
    this._challengeTitle.position.set(panelX + 10, panelY + 8);

    // Difficulty indicator
    const diffColors: Record<string, number> = {
      beginner: 0x44ff44, intermediate: 0xffcc00, advanced: 0xff6600, expert: 0xff2222,
    };
    this._challengeTitle.style.fill = diffColors[challenge.difficulty] ?? 0xffffff;

    // Notation
    this._challengeNotation.visible = true;
    this._challengeNotation.text = challenge.notation;
    this._challengeNotation.position.set(panelX + 10, panelY + 34);

    // Progress bar: highlight completed inputs
    const seqParts: string[] = [];
    for (let i = 0; i < challenge.sequence.length; i++) {
      if (i < cs.sequenceIndex) {
        seqParts.push(`[${challenge.sequence[i]}]`);
      } else if (i === cs.sequenceIndex) {
        seqParts.push(`> ${challenge.sequence[i]} <`);
      } else {
        seqParts.push(challenge.sequence[i]);
      }
    }
    this._challengeProgress.visible = true;
    this._challengeProgress.text = `${cs.sequenceIndex}/${challenge.sequence.length}  ${seqParts.join(" ")}`;
    this._challengeProgress.position.set(panelX + 10, panelY + 58);

    // Status text
    if (cs.completed) {
      this._challengeStatus.visible = true;
      this._challengeStatus.text = "COMPLETE!";
      this._challengeStatus.style.fill = 0x00ff00;
      this._challengeStatus.position.set(panelX + panelW / 2, panelY + 100);
      this._challengeStatus.anchor.set(0.5, 0);
    } else {
      this._challengeStatus.visible = false;
    }

    // Draw progress dots
    const dotY = panelY + 84;
    for (let i = 0; i < challenge.sequence.length; i++) {
      const dotX = panelX + 10 + i * 20;
      this._challengeGfx.circle(dotX + 5, dotY, 6);
      if (i < cs.sequenceIndex) {
        this._challengeGfx.fill({ color: 0x00ff00 });
      } else if (i === cs.sequenceIndex) {
        this._challengeGfx.fill({ color: 0xffcc00 });
      } else {
        this._challengeGfx.fill({ color: 0x333333 });
        this._challengeGfx.circle(dotX + 5, dotY, 6);
        this._challengeGfx.stroke({ color: 0x888888, width: 1 });
      }
    }
  }

  // ---- Ranked display -------------------------------------------------------

  private _updateRankedDisplay(state: DuelState, sw: number, _sh: number): void {
    if (state.gameMode !== "vs_cpu" && state.gameMode !== "arcade") {
      this._rankedInfo.visible = false;
      return;
    }

    const ranked = state.rankedState;
    const rankInfo = resolveRank(ranked.rp);
    const rankStr = formatRank(rankInfo);

    this._rankedInfo.visible = true;
    this._rankedInfo.text = `${rankStr}  |  ${ranked.rp} RP  |  W:${ranked.wins} L:${ranked.losses}`;
    this._rankedInfo.style.fill = rankInfo.tier.color;
    this._rankedInfo.position.set(sw / 2 - 120, 8);
  }

  // ---- Assist display -------------------------------------------------------

  private _updateAssistDisplay(state: DuelState, sw: number, sh: number): void {
    const assist = state.assistState;
    if (!assist) {
      this._assistP1Label.visible = false;
      this._assistP2Label.visible = false;
      this._assistGfx.clear();
      return;
    }

    this._assistGfx.clear();

    for (let i = 0; i < 2; i++) {
      const assistChar = assist.characters[i];
      const label = i === 0 ? this._assistP1Label : this._assistP2Label;

      if (!assistChar) {
        label.visible = false;
        continue;
      }

      label.visible = true;
      const charDef = DUEL_CHARACTERS[assistChar.characterId];
      const name = charDef?.name ?? assistChar.characterId;
      const cooldown = assist.cooldowns[i];
      const isActive = assist.activeAssists[i as 0 | 1] !== null;

      const xPos = i === 0 ? 10 : sw - 160;
      const yPos = sh - 50;

      if (isActive) {
        label.text = `ASSIST: ${name} [ACTIVE]`;
        label.style.fill = 0x00ff00;
      } else if (cooldown > 0) {
        const cdSec = (cooldown / 60).toFixed(1);
        label.text = `ASSIST: ${name} [${cdSec}s]`;
        label.style.fill = 0xff4444;

        // Cooldown bar
        const barW = 140;
        const barH = 4;
        const barX = xPos;
        const barY = yPos + 18;
        this._assistGfx.rect(barX, barY, barW, barH);
        this._assistGfx.fill({ color: 0x333333 });
        const fillRatio = 1 - cooldown / ASSIST_COOLDOWN_FRAMES;
        this._assistGfx.rect(barX, barY, barW * fillRatio, barH);
        this._assistGfx.fill({ color: 0x44ddff });
      } else {
        label.text = `ASSIST: ${name} [READY]`;
        label.style.fill = 0x44ddff;
      }

      label.position.set(xPos, yPos);
    }
  }

  // ---- Dramatic finisher overlay -------------------------------------------

  private _updateDramaticFinisher(state: DuelState, sw: number, sh: number): void {
    const finisher = state.dramaticFinisher;
    if (!finisher || !finisher.active) {
      this._finisherText.visible = false;
      this._finisherName.visible = false;
      this._finisherGfx.clear();
      return;
    }

    const info = getDramaticFinisherRenderInfo(finisher);
    this._finisherGfx.clear();

    // Screen flash
    if (info.screenFlashAlpha > 0) {
      this._finisherGfx.rect(0, 0, sw, sh);
      this._finisherGfx.fill({ color: info.screenFlashColor, alpha: info.screenFlashAlpha });
    }

    // Finisher text
    if (info.showFinisherText) {
      this._finisherText.visible = true;
      this._finisherText.text = info.finisherText;
      this._finisherText.position.set(sw / 2, sh / 2 - 40);
      this._finisherText.alpha = info.textAlpha;

      this._finisherName.visible = true;
      this._finisherName.text = info.finisherName;
      this._finisherName.position.set(sw / 2, sh / 2 + 20);
      this._finisherName.alpha = info.textAlpha;
    } else {
      this._finisherText.visible = false;
      this._finisherName.visible = false;
    }

    // Vignette effect during zoom
    if (info.zoomFactor > 1.1) {
      const vigAlpha = Math.min(0.5, (info.zoomFactor - 1) * 0.6);
      // Top and bottom bars for cinematic aspect ratio
      const barH = sh * 0.08 * (info.zoomFactor - 1);
      this._finisherGfx.rect(0, 0, sw, barH);
      this._finisherGfx.fill({ color: 0x000000, alpha: vigAlpha + 0.3 });
      this._finisherGfx.rect(0, sh - barH, sw, barH);
      this._finisherGfx.fill({ color: 0x000000, alpha: vigAlpha + 0.3 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
