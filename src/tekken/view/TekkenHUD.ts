// ---------------------------------------------------------------------------
// Tekken mode – Pixi.js HUD overlay
// Health bars, timer, round indicators, combo counter, announcements
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { viewManager } from "../../view/ViewManager";
import type { TekkenState } from "../state/TekkenState";
import { TB } from "../config/TekkenBalanceConfig";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";

export class TekkenHUD {
  private _container: Container | null = null;
  private _healthBars: Graphics[] = [];
  private _healthDrain: Graphics[] = [];
  private _rageGlows: Graphics[] = [];
  private _nameTexts: Text[] = [];
  private _timerText: Text | null = null;
  private _comboText: Text | null = null;
  private _comboContainer: Container | null = null;
  private _announcementText: Text | null = null;
  private _roundIndicators: Graphics[][] = [[], []];

  // Training mode overlay elements
  private _trainingContainer: Container | null = null;
  private _trainingFrameData: Text | null = null;
  private _trainingComboCounter: Text | null = null;
  private _trainingAdvantage: Text | null = null;
  private _trainingControls: Text | null = null;
  private _trainingAIStatus: Text | null = null;
  private _trainingHitboxLabel: Text | null = null;

  // Cached values for animation
  private _displayHp: [number, number] = [170, 170];
  private _drainHp: [number, number] = [170, 170];
  private _comboOpacity = 0;
  private _announcementScale = 1;
  private _comboShake = 0;
  private _lastComboCount = 0;
  private _roundWinFlash: number[][] = [[], []]; // flash timers per gem

  init(): void {
    const sw = viewManager.screenWidth;

    this._container = new Container();
    viewManager.addToLayer("ui", this._container);

    const barW = sw * 0.35;
    const barH = 22;
    const barY = 30;
    const barGap = 8;
    const centerX = sw / 2;

    // Health bar backgrounds
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? centerX - barGap / 2 - barW : centerX + barGap / 2;

      // Background with beveled border
      const bg = new Graphics();
      // Outer glow border
      bg.roundRect(x - 4, barY - 4, barW + 8, barH + 8, 6).fill({ color: 0x222222, alpha: 0.8 });
      // Inner border (metallic look)
      bg.roundRect(x - 2, barY - 2, barW + 4, barH + 4, 4).fill({ color: 0x444444 });
      bg.roundRect(x - 1, barY - 1, barW + 2, barH + 2, 3).fill({ color: 0x222222 });
      bg.roundRect(x, barY, barW, barH, 3).fill({ color: 0x1a0000 });
      this._container.addChild(bg);

      // Drain bar (red, follows behind actual HP)
      const drain = new Graphics();
      this._container.addChild(drain);
      this._healthDrain.push(drain);

      // HP fill
      const fill = new Graphics();
      this._container.addChild(fill);
      this._healthBars.push(fill);

      // Rage glow
      const rageGlow = new Graphics();
      this._container.addChild(rageGlow);
      this._rageGlows.push(rageGlow);

      // Name
      const nameText = new Text({
        text: "",
        style: { fontFamily: "Georgia, serif", fontSize: 16, fill: 0xdddddd, fontWeight: "bold" },
      });
      nameText.y = barY + barH + 6;
      nameText.x = i === 0 ? x + 4 : x + barW - 4;
      nameText.anchor.set(i === 0 ? 0 : 1, 0);
      this._container.addChild(nameText);
      this._nameTexts.push(nameText);

      // Round indicators (gems)
      this._roundIndicators[i] = [];
      this._roundWinFlash[i] = [];
      for (let r = 0; r < TB.ROUNDS_TO_WIN; r++) {
        const gemX = i === 0
          ? centerX - barGap / 2 - 20 - r * 22
          : centerX + barGap / 2 + 20 + r * 22;
        const gem = new Graphics();
        gem.circle(gemX, barY - 12, 7).fill({ color: 0x333333 }).stroke({ color: 0x888888, width: 1.5 });
        this._container.addChild(gem);
        this._roundIndicators[i].push(gem);
        this._roundWinFlash[i].push(0);
      }
    }

    // Timer
    this._timerText = new Text({
      text: "60",
      style: { fontFamily: "Georgia, serif", fontSize: 32, fill: 0xffffff, fontWeight: "bold" },
    });
    this._timerText.anchor.set(0.5);
    this._timerText.x = centerX;
    this._timerText.y = barY + barH / 2;
    this._container.addChild(this._timerText);

    // Combo counter with enhanced styling
    this._comboContainer = new Container();
    this._comboText = new Text({
      text: "",
      style: {
        fontFamily: "Georgia, serif",
        fontSize: 30,
        fill: 0xffdd22,
        fontWeight: "bold",
        stroke: { color: 0x331100, width: 4 },
        dropShadow: { color: 0xff6600, alpha: 0.5, blur: 8, distance: 0 },
      },
    });
    this._comboText.anchor.set(0.5);
    this._comboContainer.addChild(this._comboText);
    this._comboContainer.alpha = 0;
    this._container.addChild(this._comboContainer);

    // Announcement text
    this._announcementText = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 64, fill: 0xffffff, fontWeight: "bold", stroke: { color: 0x000000, width: 5 }, letterSpacing: 6 },
    });
    this._announcementText.anchor.set(0.5);
    this._announcementText.x = centerX;
    this._announcementText.y = viewManager.screenHeight * 0.4;
    this._announcementText.alpha = 0;
    this._container.addChild(this._announcementText);

    // Training mode overlay (hidden by default, shown when gameMode === "training")
    this._trainingContainer = new Container();
    this._trainingContainer.visible = false;
    this._container.addChild(this._trainingContainer);

    const trainingStyle = { fontFamily: "Courier New, monospace", fontSize: 16, fill: 0x00ff88 };
    const trainingStyleBold = { fontFamily: "Courier New, monospace", fontSize: 20, fill: 0x00ffaa, fontWeight: "bold" as const };

    // "TRAINING" label
    const trainingLabel = new Text({
      text: "TRAINING MODE",
      style: { fontFamily: "Georgia, serif", fontSize: 22, fill: 0x00ffcc, fontWeight: "bold", letterSpacing: 4 },
    });
    trainingLabel.anchor.set(0.5, 0);
    trainingLabel.x = centerX;
    trainingLabel.y = 70;
    this._trainingContainer.addChild(trainingLabel);

    // Frame data panel (left side)
    this._trainingFrameData = new Text({
      text: "Move: ---\nStartup: -- Active: -- Recovery: --",
      style: trainingStyle,
    });
    this._trainingFrameData.x = 20;
    this._trainingFrameData.y = viewManager.screenHeight - 160;
    this._trainingContainer.addChild(this._trainingFrameData);

    // Combo counter (prominent, center-left)
    this._trainingComboCounter = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 36, fill: 0xffcc00, fontWeight: "bold", stroke: { color: 0x000000, width: 3 } },
    });
    this._trainingComboCounter.anchor.set(0.5);
    this._trainingComboCounter.x = sw * 0.15;
    this._trainingComboCounter.y = viewManager.screenHeight * 0.3;
    this._trainingContainer.addChild(this._trainingComboCounter);

    // Frame advantage display
    this._trainingAdvantage = new Text({
      text: "Advantage: +0",
      style: trainingStyleBold,
    });
    this._trainingAdvantage.x = 20;
    this._trainingAdvantage.y = viewManager.screenHeight - 100;
    this._trainingContainer.addChild(this._trainingAdvantage);

    // AI status
    this._trainingAIStatus = new Text({
      text: "AI: ON",
      style: { ...trainingStyle, fill: 0x88ff88 },
    });
    this._trainingAIStatus.anchor.set(1, 0);
    this._trainingAIStatus.x = sw - 20;
    this._trainingAIStatus.y = viewManager.screenHeight - 160;
    this._trainingContainer.addChild(this._trainingAIStatus);

    // Hitbox status
    this._trainingHitboxLabel = new Text({
      text: "Hitboxes: OFF",
      style: { ...trainingStyle, fill: 0x8888ff },
    });
    this._trainingHitboxLabel.anchor.set(1, 0);
    this._trainingHitboxLabel.x = sw - 20;
    this._trainingHitboxLabel.y = viewManager.screenHeight - 135;
    this._trainingContainer.addChild(this._trainingHitboxLabel);

    // Controls hint
    this._trainingControls = new Text({
      text: "F1: Toggle AI   F2: Reset Pos   F3: Hitboxes",
      style: { fontFamily: "Courier New, monospace", fontSize: 13, fill: 0x666666 },
    });
    this._trainingControls.anchor.set(0.5, 1);
    this._trainingControls.x = centerX;
    this._trainingControls.y = viewManager.screenHeight - 10;
    this._trainingContainer.addChild(this._trainingControls);
  }

  update(state: TekkenState): void {
    if (!this._container) return;

    const sw = viewManager.screenWidth;
    const barW = sw * 0.35;
    const barH = 22;
    const barY = 30;
    const barGap = 8;
    const centerX = sw / 2;

    for (let i = 0; i < 2; i++) {
      const fighter = state.fighters[i];
      const x = i === 0 ? centerX - barGap / 2 - barW : centerX + barGap / 2;

      // Smooth HP display
      const targetHp = fighter.hp;
      this._displayHp[i] += (targetHp - this._displayHp[i]) * 0.3;
      this._drainHp[i] += (targetHp - this._drainHp[i]) * 0.05;

      const hpFrac = Math.max(0, this._displayHp[i] / fighter.maxHp);
      const drainFrac = Math.max(0, this._drainHp[i] / fighter.maxHp);

      // Drain bar (red background)
      const drain = this._healthDrain[i];
      drain.clear();
      const drainW = barW * drainFrac;
      if (i === 0) {
        drain.roundRect(x + barW - drainW, barY, drainW, barH, 3).fill({ color: 0xaa1111 });
      } else {
        drain.roundRect(x, barY, drainW, barH, 3).fill({ color: 0xaa1111 });
      }

      // HP fill with gradient-like effect (two-tone layered bars)
      const fill = this._healthBars[i];
      fill.clear();
      const fillW = barW * hpFrac;
      const hpColor = hpFrac > 0.5 ? 0x22aa44 : hpFrac > 0.25 ? 0xddaa00 : 0xdd2222;
      const hpColorBright = hpFrac > 0.5 ? 0x44dd66 : hpFrac > 0.25 ? 0xffcc22 : 0xff4444;
      const hpColorDark = hpFrac > 0.5 ? 0x116622 : hpFrac > 0.25 ? 0x886600 : 0x881111;
      if (i === 0) {
        // Base dark layer
        fill.roundRect(x + barW - fillW, barY, fillW, barH, 3).fill({ color: hpColorDark });
        // Main color layer
        fill.roundRect(x + barW - fillW, barY, fillW, barH * 0.7, 3).fill({ color: hpColor });
        // Bright highlight on top
        fill.roundRect(x + barW - fillW + 2, barY + 2, Math.max(0, fillW - 4), barH * 0.3, 2).fill({ color: hpColorBright, alpha: 0.5 });
      } else {
        fill.roundRect(x, barY, fillW, barH, 3).fill({ color: hpColorDark });
        fill.roundRect(x, barY, fillW, barH * 0.7, 3).fill({ color: hpColor });
        fill.roundRect(x + 2, barY + 2, Math.max(0, fillW - 4), barH * 0.3, 2).fill({ color: hpColorBright, alpha: 0.5 });
      }

      // Rage glow
      const rageGlow = this._rageGlows[i];
      rageGlow.clear();
      if (fighter.rageActive) {
        const glowAlpha = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
        rageGlow.roundRect(x - 3, barY - 3, barW + 6, barH + 6, 5).fill({ color: 0xff0000, alpha: glowAlpha });
      }

      // Name
      const charDef = TEKKEN_CHARACTERS.find(c => c.id === fighter.characterId);
      if (charDef) this._nameTexts[i].text = charDef.name;

      // Round indicators with shine effects
      const wins = state.roundResults.filter(r => r === i).length;
      for (let r = 0; r < this._roundIndicators[i].length; r++) {
        const gem = this._roundIndicators[i][r];
        gem.clear();
        const gemX = i === 0
          ? centerX - barGap / 2 - 20 - r * 22
          : centerX + barGap / 2 + 20 + r * 22;
        const won = r < wins;

        // Detect new win (trigger flash)
        if (won && this._roundWinFlash[i][r] === 0) {
          this._roundWinFlash[i][r] = 30;
        }

        if (won) {
          // Outer glow
          const glowPulse = Math.sin(Date.now() * 0.004 + r * 1.2) * 0.15 + 0.2;
          gem.circle(gemX, barY - 12, 10).fill({ color: 0xffaa00, alpha: glowPulse });
          // Main gem
          gem.circle(gemX, barY - 12, 7).fill({ color: 0xffcc00 }).stroke({ color: 0xffee66, width: 1.5 });
          // Shine highlight
          gem.circle(gemX - 2, barY - 14, 2.5).fill({ color: 0xffffff, alpha: 0.6 });

          // Flash effect for newly won rounds
          if (this._roundWinFlash[i][r] > 0) {
            this._roundWinFlash[i][r]--;
            const flashAlpha = this._roundWinFlash[i][r] / 30;
            gem.circle(gemX, barY - 12, 7 + (1 - flashAlpha) * 8).fill({ color: 0xffffff, alpha: flashAlpha * 0.5 });
          }
        } else {
          gem.circle(gemX, barY - 12, 7).fill({ color: 0x333333 }).stroke({ color: 0x666666, width: 1.5 });
          // Subtle inner shadow
          gem.circle(gemX, barY - 11, 4).fill({ color: 0x444444, alpha: 0.3 });
        }
      }
    }

    // Timer
    const seconds = Math.ceil(state.round.timeRemaining / TB.TPS);
    this._timerText!.text = `${seconds}`;
    this._timerText!.style.fill = seconds <= 10 ? 0xff4444 : 0xffffff;

    // Combo counter
    let maxCombo = 0;
    let comboPlayer = -1;
    for (let i = 0; i < 2; i++) {
      if (state.fighters[i].comboCount > maxCombo) {
        maxCombo = state.fighters[i].comboCount;
        comboPlayer = i;
      }
    }

    if (maxCombo >= 2 && comboPlayer >= 0) {
      this._comboOpacity = Math.min(1, this._comboOpacity + 0.25);
      const f = state.fighters[comboPlayer];

      // Detect new hit in combo (trigger shake)
      if (f.comboCount > this._lastComboCount) {
        this._comboShake = 8;
      }
      this._lastComboCount = f.comboCount;

      this._comboText!.text = `${f.comboCount} HITS!\n${f.comboDamage} DMG`;
      const baseSize = Math.min(44, 26 + f.comboCount * 2);
      this._comboText!.style.fontSize = baseSize;

      // Animated scale pulse on new hits
      const scalePulse = this._comboShake > 0 ? 1.0 + this._comboShake * 0.03 : 1.0;
      this._comboContainer!.scale.set(scalePulse, scalePulse);

      // Shake offset
      const shakeX = this._comboShake > 0 ? (Math.random() - 0.5) * this._comboShake * 0.8 : 0;
      const shakeY = this._comboShake > 0 ? (Math.random() - 0.5) * this._comboShake * 0.5 : 0;

      this._comboContainer!.x = (comboPlayer === 0 ? sw * 0.15 : sw * 0.85) + shakeX;
      this._comboContainer!.y = viewManager.screenHeight * 0.35 + shakeY;

      // Color intensifies with combo length
      if (f.comboCount >= 8) {
        this._comboText!.style.fill = 0xff4422; // red for high combos
      } else if (f.comboCount >= 5) {
        this._comboText!.style.fill = 0xff8833; // orange for medium combos
      } else {
        this._comboText!.style.fill = 0xffdd22; // yellow default
      }

      if (this._comboShake > 0) this._comboShake--;
    } else {
      this._comboOpacity = Math.max(0, this._comboOpacity - 0.06);
      this._lastComboCount = 0;
      this._comboContainer!.scale.set(1, 1);
    }
    this._comboContainer!.alpha = this._comboOpacity;

    // Announcement
    if (state.announcement) {
      this._announcementText!.text = state.announcement;
      this._announcementText!.alpha = Math.min(1, (this._announcementText!.alpha || 0) + 0.15);
      this._announcementScale = 1 + Math.sin(Date.now() * 0.005) * 0.03;
      this._announcementText!.scale.set(this._announcementScale);
    } else {
      this._announcementText!.alpha = Math.max(0, (this._announcementText!.alpha || 0) - 0.08);
    }

    // Training mode overlay
    if (this._trainingContainer) {
      const isTraining = state.gameMode === "training";
      this._trainingContainer.visible = isTraining;

      if (isTraining) {
        const tm = state.trainingMode;

        // Frame data
        if (tm.lastMoveName) {
          this._trainingFrameData!.text =
            `Move: ${tm.lastMoveName}\nStartup: ${tm.lastMoveStartup}f  Active: ${tm.lastMoveActive}f  Recovery: ${tm.lastMoveRecovery}f`;
        } else {
          this._trainingFrameData!.text = "Move: ---\nStartup: --  Active: --  Recovery: --";
        }

        // Combo counter (prominent)
        const p1Combo = state.fighters[0].comboCount;
        if (p1Combo >= 1) {
          this._trainingComboCounter!.text = `${p1Combo} HITS\n${state.fighters[0].comboDamage} DMG`;
        } else {
          this._trainingComboCounter!.text = "";
        }

        // Frame advantage
        const adv = tm.frameAdvantage;
        const advSign = adv >= 0 ? "+" : "";
        const advColor = adv > 0 ? 0x00ff00 : adv < 0 ? 0xff4444 : 0xffffff;
        this._trainingAdvantage!.text = `Advantage: ${advSign}${adv}`;
        this._trainingAdvantage!.style.fill = advColor;

        // AI status
        this._trainingAIStatus!.text = `AI: ${tm.aiEnabled ? "ON" : "OFF"}`;
        this._trainingAIStatus!.style.fill = tm.aiEnabled ? 0x88ff88 : 0xff8888;

        // Hitbox status
        this._trainingHitboxLabel!.text = `Hitboxes: ${tm.showHitboxes ? "ON" : "OFF"}`;
        this._trainingHitboxLabel!.style.fill = tm.showHitboxes ? 0x8888ff : 0x666666;

        // Hide round timer in training mode
        this._timerText!.text = "\u221E";
        this._timerText!.style.fill = 0x888888;
      }
    }
  }

  destroy(): void {
    if (this._container) {
      viewManager.removeFromLayer("ui", this._container);
      this._container.destroy({ children: true });
      this._container = null;
    }
  }
}
