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

  // Cached values for animation
  private _displayHp: [number, number] = [170, 170];
  private _drainHp: [number, number] = [170, 170];
  private _comboOpacity = 0;
  private _announcementScale = 1;

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

      // Background
      const bg = new Graphics();
      bg.roundRect(x - 2, barY - 2, barW + 4, barH + 4, 4).fill({ color: 0x111111 });
      bg.roundRect(x, barY, barW, barH, 3).fill({ color: 0x220000 });
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
      for (let r = 0; r < TB.ROUNDS_TO_WIN; r++) {
        const gemX = i === 0
          ? centerX - barGap / 2 - 20 - r * 22
          : centerX + barGap / 2 + 20 + r * 22;
        const gem = new Graphics();
        gem.circle(gemX, barY - 12, 6).fill({ color: 0x333333 }).stroke({ color: 0x888888, width: 1 });
        this._container.addChild(gem);
        this._roundIndicators[i].push(gem);
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

    // Combo counter
    this._comboContainer = new Container();
    this._comboText = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 28, fill: 0xffcc00, fontWeight: "bold", stroke: { color: 0x000000, width: 3 } },
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

      // HP fill
      const fill = this._healthBars[i];
      fill.clear();
      const fillW = barW * hpFrac;
      const hpColor = hpFrac > 0.5 ? 0x22aa44 : hpFrac > 0.25 ? 0xddaa00 : 0xdd2222;
      if (i === 0) {
        fill.roundRect(x + barW - fillW, barY, fillW, barH, 3).fill({ color: hpColor });
      } else {
        fill.roundRect(x, barY, fillW, barH, 3).fill({ color: hpColor });
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

      // Round indicators
      const wins = state.roundResults.filter(r => r === i).length;
      for (let r = 0; r < this._roundIndicators[i].length; r++) {
        const gem = this._roundIndicators[i][r];
        gem.clear();
        const gemX = i === 0
          ? centerX - barGap / 2 - 20 - r * 22
          : centerX + barGap / 2 + 20 + r * 22;
        const won = r < wins;
        gem.circle(gemX, barY - 12, 6).fill({ color: won ? 0xffcc00 : 0x333333 }).stroke({ color: won ? 0xffaa00 : 0x888888, width: 1.5 });
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
      this._comboOpacity = Math.min(1, this._comboOpacity + 0.2);
      const f = state.fighters[comboPlayer];
      this._comboText!.text = `${f.comboCount} HITS!\n${f.comboDamage} DMG`;
      this._comboText!.style.fontSize = Math.min(42, 24 + f.comboCount * 2);
      this._comboContainer!.x = comboPlayer === 0 ? sw * 0.15 : sw * 0.85;
      this._comboContainer!.y = viewManager.screenHeight * 0.35;
    } else {
      this._comboOpacity = Math.max(0, this._comboOpacity - 0.08);
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
  }

  destroy(): void {
    if (this._container) {
      viewManager.removeFromLayer("ui", this._container);
      this._container.destroy({ children: true });
      this._container = null;
    }
  }
}
