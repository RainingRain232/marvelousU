// Persistent HUD overlay showing party status during overworld/dungeon exploration
import { Container, Graphics, Text } from "pixi.js";
import { EventBus } from "@sim/core/EventBus";
import { ACHIEVEMENT_DEFS } from "@rpg/config/AchievementDefs";
import type { ViewManager } from "@view/ViewManager";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const HUD_BG = 0x0e0e1a;
const HUD_BORDER = 0x333355;
const HP_GREEN = 0x44aa44;
const HP_YELLOW = 0xaaaa44;
const HP_RED = 0xaa4444;
const MP_BLUE = 0x4466cc;
const GOLD_COLOR = 0xffd700;
const BAR_W = 60;
const BAR_H = 6;
const MP_BAR_H = 4;
const MEMBER_HEIGHT = 40;
const HUD_PAD = 8;
const HUD_W = 180;

const ACHIEVEMENT_BG = 0xdaa520;
const ACHIEVEMENT_TEXT_COLOR = 0x1a1a00;

// ---------------------------------------------------------------------------
// RPGHud
// ---------------------------------------------------------------------------

export class RPGHud {
  private vm!: ViewManager;
  private rpg!: RPGState;
  private container = new Container();
  private _unsubs: Array<() => void> = [];
  private _updateInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-save indicator state
  private _savingText: Text | null = null;
  private _savingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Achievement toast state
  private _achievementContainer: Container | null = null;
  private _achievementTimeout: ReturnType<typeof setTimeout> | null = null;
  private _achievementFadeInterval: ReturnType<typeof setInterval> | null = null;

  init(vm: ViewManager, rpg: RPGState): void {
    this.vm = vm;
    this.rpg = rpg;

    vm.addToLayer("ui", this.container);

    this._draw();

    // Redraw on relevant events
    this._unsubs.push(EventBus.on("rpgPartyMoved", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgBattleEnded", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgLevelUp", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgItemBought", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgInnRested", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgQuestAccepted", () => this._draw()));
    this._unsubs.push(EventBus.on("rpgQuestCompleted", () => this._draw()));

    // Auto-save indicator on save-related events
    this._unsubs.push(EventBus.on("rpgTownEntered", () => this._showSaving()));
    this._unsubs.push(EventBus.on("rpgQuestCompleted", () => this._showSaving()));
    this._unsubs.push(EventBus.on("rpgDungeonExited", () => this._showSaving()));
    this._unsubs.push(EventBus.on("rpgBattleEnded", (e) => { if (e.victory) this._showSaving(); }));

    // Achievement toast
    this._unsubs.push(EventBus.on("rpgAchievementUnlocked", (e) => this._showAchievementToast(e.achievementId)));

    // Periodic refresh for post-battle HP sync
    this._updateInterval = setInterval(() => this._draw(), 2000);
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
    if (this._savingTimeout) {
      clearTimeout(this._savingTimeout);
      this._savingTimeout = null;
    }
    if (this._achievementTimeout) {
      clearTimeout(this._achievementTimeout);
      this._achievementTimeout = null;
    }
    if (this._achievementFadeInterval) {
      clearInterval(this._achievementFadeInterval);
      this._achievementFadeInterval = null;
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Auto-save indicator
  // ---------------------------------------------------------------------------

  private _showSaving(): void {
    // Remove existing saving text if present
    if (this._savingText) {
      if (this._savingText.parent) this._savingText.parent.removeChild(this._savingText);
      this._savingText.destroy();
      this._savingText = null;
    }
    if (this._savingTimeout) {
      clearTimeout(this._savingTimeout);
      this._savingTimeout = null;
    }

    const text = new Text({
      text: "Saving...",
      style: { fontFamily: "monospace", fontSize: 11, fill: 0xcccccc, fontWeight: "bold" },
    });
    text.position.set(10, this.vm.screenHeight - 24);
    this.container.addChild(text);
    this._savingText = text;

    this._savingTimeout = setTimeout(() => {
      if (this._savingText && this._savingText.parent) {
        this._savingText.parent.removeChild(this._savingText);
        this._savingText.destroy();
        this._savingText = null;
      }
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Achievement toast
  // ---------------------------------------------------------------------------

  private _showAchievementToast(achievementId: string): void {
    // Clean up existing toast
    if (this._achievementContainer) {
      if (this._achievementContainer.parent) this._achievementContainer.parent.removeChild(this._achievementContainer);
      this._achievementContainer.destroy({ children: true });
      this._achievementContainer = null;
    }
    if (this._achievementTimeout) {
      clearTimeout(this._achievementTimeout);
      this._achievementTimeout = null;
    }
    if (this._achievementFadeInterval) {
      clearInterval(this._achievementFadeInterval);
      this._achievementFadeInterval = null;
    }

    const def = ACHIEVEMENT_DEFS.find(a => a.id === achievementId);
    const name = def ? def.name : achievementId;

    const toastContainer = new Container();

    const toastW = 220;
    const toastH = 36;
    const toastX = (this.vm.screenWidth - toastW) / 2;
    const toastY = 10;

    const bg = new Graphics();
    bg.roundRect(toastX, toastY, toastW, toastH, 6);
    bg.fill({ color: ACHIEVEMENT_BG, alpha: 0.95 });
    toastContainer.addChild(bg);

    const label = new Text({
      text: `Achievement: ${name}`,
      style: { fontFamily: "monospace", fontSize: 11, fill: ACHIEVEMENT_TEXT_COLOR, fontWeight: "bold" },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(toastX + toastW / 2, toastY + toastH / 2);
    toastContainer.addChild(label);

    this.container.addChild(toastContainer);
    this._achievementContainer = toastContainer;

    // Start fade after 3 seconds
    this._achievementTimeout = setTimeout(() => {
      let alpha = 1.0;
      this._achievementFadeInterval = setInterval(() => {
        alpha -= 0.05;
        if (alpha <= 0) {
          if (this._achievementFadeInterval) {
            clearInterval(this._achievementFadeInterval);
            this._achievementFadeInterval = null;
          }
          if (this._achievementContainer) {
            if (this._achievementContainer.parent) this._achievementContainer.parent.removeChild(this._achievementContainer);
            this._achievementContainer.destroy({ children: true });
            this._achievementContainer = null;
          }
        } else if (this._achievementContainer) {
          this._achievementContainer.alpha = alpha;
        }
      }, 50);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Main draw
  // ---------------------------------------------------------------------------

  private _draw(): void {
    // Preserve auto-save text and achievement toast across redraws
    const savedSavingText = this._savingText;
    const savedAchievementContainer = this._achievementContainer;
    if (savedSavingText && savedSavingText.parent) savedSavingText.parent.removeChild(savedSavingText);
    if (savedAchievementContainer && savedAchievementContainer.parent) savedAchievementContainer.parent.removeChild(savedAchievementContainer);

    this.container.removeChildren();

    const party = this.rpg.party;
    const activeQuests = this.rpg.quests.filter(q => !q.isComplete);
    const questH = activeQuests.length > 0 ? activeQuests.length * 18 + 14 : 0;
    // Extra space: weather/time row at top + fast travel text at bottom
    const weatherTimeH = 20;
    const fastTravelH = 18;
    const hudH = HUD_PAD * 2 + weatherTimeH + party.length * MEMBER_HEIGHT + 24 + questH + fastTravelH;
    const x = this.vm.screenWidth - HUD_W - 10;
    const y = 10;

    // Background
    const bg = new Graphics();
    bg.roundRect(x, y, HUD_W, hudH, 6);
    bg.fill({ color: HUD_BG, alpha: 0.85 });
    bg.stroke({ color: HUD_BORDER, width: 1 });
    this.container.addChild(bg);

    // ----- Weather / Time of Day -----
    const timeOfDay = this.rpg.timeOfDay;
    let timeLabel: string;
    if (timeOfDay < 60) timeLabel = "Morning";
    else if (timeOfDay < 120) timeLabel = "Day";
    else if (timeOfDay < 180) timeLabel = "Evening";
    else timeLabel = "Night";

    const weatherMap: Record<string, string> = { clear: "Clear", rain: "Rain", snow: "Snow", fog: "Fog" };
    const weatherLabel = weatherMap[this.rpg.weather] ?? "Clear";

    const weatherTimeText = new Text({
      text: `${weatherLabel}  |  ${timeLabel}`,
      style: { fontFamily: "monospace", fontSize: 9, fill: 0xaaaacc },
    });
    weatherTimeText.position.set(x + HUD_PAD, y + HUD_PAD);
    this.container.addChild(weatherTimeText);

    // Offset everything below by weatherTimeH
    const baseY = y + HUD_PAD + weatherTimeH;

    // Gold display
    const goldText = new Text({
      text: `Gold: ${this.rpg.gold}`,
      style: { fontFamily: "monospace", fontSize: 11, fill: GOLD_COLOR, fontWeight: "bold" },
    });
    goldText.position.set(x + HUD_PAD, baseY);
    this.container.addChild(goldText);

    // Battle mode indicator
    const modeText = new Text({
      text: `[${this.rpg.battleMode === "turn" ? "Turn" : "Auto"}]`,
      style: { fontFamily: "monospace", fontSize: 9, fill: 0x888888 },
    });
    modeText.anchor.set(1, 0);
    modeText.position.set(x + HUD_W - HUD_PAD, baseY + 1);
    this.container.addChild(modeText);

    // Party members
    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      const my = baseY + 18 + i * MEMBER_HEIGHT;

      // Name + Level
      const nameText = new Text({
        text: `${member.name} Lv${member.level}`,
        style: { fontFamily: "monospace", fontSize: 10, fill: 0xdddddd },
      });
      nameText.position.set(x + HUD_PAD, my);
      this.container.addChild(nameText);

      // HP bar
      const hpRatio = Math.max(0, member.hp / member.maxHp);
      const hpColor = hpRatio > 0.5 ? HP_GREEN : hpRatio > 0.25 ? HP_YELLOW : HP_RED;
      const barX = x + HUD_PAD;
      const barY = my + 14;

      const bars = new Graphics();
      // HP background
      bars.rect(barX, barY, BAR_W, BAR_H);
      bars.fill({ color: 0x222222 });
      // HP fill
      bars.rect(barX, barY, BAR_W * hpRatio, BAR_H);
      bars.fill({ color: hpColor });

      // MP bar
      if (member.maxMp > 0) {
        const mpRatio = Math.max(0, member.mp / member.maxMp);
        bars.rect(barX, barY + BAR_H + 2, BAR_W, MP_BAR_H);
        bars.fill({ color: 0x1a1a33 });
        bars.rect(barX, barY + BAR_H + 2, BAR_W * mpRatio, MP_BAR_H);
        bars.fill({ color: MP_BLUE });
      }

      this.container.addChild(bars);

      // HP text
      const hpText = new Text({
        text: `${Math.ceil(member.hp)}/${member.maxHp}`,
        style: { fontFamily: "monospace", fontSize: 8, fill: 0xaaaaaa },
      });
      hpText.position.set(barX + BAR_W + 4, barY - 1);
      this.container.addChild(hpText);

      // XP progress (small text)
      const xpText = new Text({
        text: `XP ${member.xp}/${member.xpToNext}`,
        style: { fontFamily: "monospace", fontSize: 7, fill: 0x666688 },
      });
      xpText.position.set(barX + BAR_W + 4, barY + BAR_H + 1);
      this.container.addChild(xpText);
    }

    // Quest tracker
    if (activeQuests.length > 0) {
      const qy = baseY + 18 + party.length * MEMBER_HEIGHT + 4;

      // Divider
      const div = new Graphics();
      div.rect(x + HUD_PAD, qy, HUD_W - HUD_PAD * 2, 1);
      div.fill({ color: HUD_BORDER, alpha: 0.5 });
      this.container.addChild(div);

      for (let qi = 0; qi < activeQuests.length; qi++) {
        const quest = activeQuests[qi];
        const obj = quest.objectives[0]; // Show first objective
        const progress = obj ? `${obj.current}/${obj.required}` : "";
        const questText = new Text({
          text: `${quest.name}: ${progress}`,
          style: { fontFamily: "monospace", fontSize: 8, fill: 0x88ff88 },
        });
        questText.position.set(x + HUD_PAD, qy + 6 + qi * 18);
        this.container.addChild(questText);
      }
    }

    // ----- Fast Travel button (informational) -----
    const ftY = y + hudH - fastTravelH - HUD_PAD / 2;
    const ftDiv = new Graphics();
    ftDiv.rect(x + HUD_PAD, ftY - 2, HUD_W - HUD_PAD * 2, 1);
    ftDiv.fill({ color: HUD_BORDER, alpha: 0.3 });
    this.container.addChild(ftDiv);

    const ftText = new Text({
      text: "Fast Travel (T)",
      style: { fontFamily: "monospace", fontSize: 9, fill: 0x8888cc },
    });
    ftText.position.set(x + HUD_PAD, ftY + 2);
    this.container.addChild(ftText);

    // Re-add persistent overlay elements
    if (savedSavingText) {
      this.container.addChild(savedSavingText);
    }
    if (savedAchievementContainer) {
      this.container.addChild(savedAchievementContainer);
    }
  }
}
