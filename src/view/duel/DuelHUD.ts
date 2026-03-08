// ---------------------------------------------------------------------------
// Duel mode – HUD (fantasiaCup-style health bars, timer, combos, announcements)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import type { DuelState } from "../../duel/state/DuelState";

const HP_BAR_HEIGHT = 36;
const HP_BAR_Y = 40;
const HP_BAR_MARGIN = 50;
const TIMER_BOX_W = 76;
const TIMER_BOX_H = 56;

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
  private _p2ComboTimer = 0;
  private _p2ComboCount = 0;
  private _p2ComboDamage = 0;

  // Announcement animation
  private _announcementScale = 1;

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
      this._timerGfx,
      this._roundDotGfx,
      this._comboGfx,
      this._announcementGfx,
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
    );
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

    // ===== Combo display =====
    this._updateCombo(f1, f2, sw, sh);

    // ===== Announcement =====
    this._updateAnnouncement(state, sw, sh);
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
      this._p1ComboCount = f1.comboCount;
      this._p1ComboDamage = f1.comboDamage;
      this._p1ComboTimer = 2;
    }
    if (f2.comboCount > 1) {
      this._p2ComboCount = f2.comboCount;
      this._p2ComboDamage = f2.comboDamage;
      this._p2ComboTimer = 2;
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

      this._p1ComboHit.text = `${this._p1ComboCount} HIT`;
      this._p1ComboHit.style.fill = COMBO_COLORS[colorIdx];
      this._p1ComboHit.alpha = alpha;
      this._p1ComboHit.position.set(comboX, comboY);

      this._p1ComboLabel.alpha = alpha;
      this._p1ComboLabel.position.set(comboX, comboY + 32);

      const dmgPct = Math.round((this._p1ComboDamage / f2.maxHp) * 100);
      if (dmgPct > 0) {
        this._p1ComboDmg.visible = true;
        this._p1ComboDmg.text = `${dmgPct}%`;
        this._p1ComboDmg.style.fill = dmgPct >= 50 ? 0xff4444 : dmgPct >= 30 ? 0xffaa00 : 0x44ddff;
        this._p1ComboDmg.alpha = alpha;
        this._p1ComboDmg.position.set(comboX, comboY - 36);
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

      this._p2ComboHit.text = `${this._p2ComboCount} HIT`;
      this._p2ComboHit.style.fill = COMBO_COLORS[colorIdx];
      this._p2ComboHit.alpha = alpha;
      this._p2ComboHit.position.set(comboX, comboY);

      this._p2ComboLabel.alpha = alpha;
      this._p2ComboLabel.position.set(comboX, comboY + 32);

      const dmgPct = Math.round((this._p2ComboDamage / f1.maxHp) * 100);
      if (dmgPct > 0) {
        this._p2ComboDmg.visible = true;
        this._p2ComboDmg.text = `${dmgPct}%`;
        this._p2ComboDmg.style.fill = dmgPct >= 50 ? 0xff4444 : dmgPct >= 30 ? 0xffaa00 : 0x44ddff;
        this._p2ComboDmg.alpha = alpha;
        this._p2ComboDmg.position.set(comboX, comboY - 36);
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

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
